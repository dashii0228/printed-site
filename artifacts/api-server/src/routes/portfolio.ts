import { getAuth } from "@clerk/express";
import {
  CompletePortfolioImageUploadBody,
  CompletePortfolioImageUploadResponse,
  CreatePortfolioImageUploadBody,
  CreatePortfolioImageUploadResponse,
  GetAdminPortfolioResponse,
  GetPortfolioChangesResponse,
  GetPortfolioImageParams,
  UpdatePortfolioWorkBody,
  UpdatePortfolioWorkParams,
  UpdatePortfolioWorkResponse,
} from "@workspace/api-zod";
import { db, sitePortfolioTable } from "@workspace/db";
import { isPortfolioWorkId } from "@workspace/site-content";
import { Readable } from "node:stream";
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import {
  createPortfolioImageUpload,
  publishPortfolioImage,
  streamPortfolioImage,
} from "../lib/productImageStorage";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

async function getPortfolioOverrides() {
  const rows = await db
    .select({
      id: sitePortfolioTable.id,
      image: sitePortfolioTable.image,
      title: sitePortfolioTable.title,
      description: sitePortfolioTable.description,
      category: sitePortfolioTable.category,
    })
    .from(sitePortfolioTable);
  return rows;
}

router.get("/portfolio/changes", async (_req, res): Promise<void> => {
  try {
    res.json(GetPortfolioChangesResponse.parse(await getPortfolioOverrides()));
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch portfolio edits");
    res.status(503).json({ error: "Бүтээлийн сангийн мэдээллийг ачаалж чадсангүй." });
  }
});

router.get("/admin/portfolio", requireAdmin, async (_req, res): Promise<void> => {
  try {
    res.json(GetAdminPortfolioResponse.parse(await getPortfolioOverrides()));
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch admin portfolio edits");
    res.status(503).json({ error: "Бүтээлийн сангийн мэдээллийг ачаалж чадсангүй." });
  }
});

router.put("/admin/portfolio/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsedParams = UpdatePortfolioWorkParams.safeParse({ id: rawId });
  if (!parsedParams.success || !isPortfolioWorkId(parsedParams.data.id)) {
    res.status(404).json({ error: "Бүтээл олдсонгүй." });
    return;
  }
  const parsedBody = UpdatePortfolioWorkBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Бүтээлийн мэдээллийг шалгаад дахин оролдоно уу." });
    return;
  }

  try {
    const [saved] = await db
      .insert(sitePortfolioTable)
      .values({ id: parsedParams.data.id, ...parsedBody.data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sitePortfolioTable.id,
        set: { ...parsedBody.data, updatedAt: new Date() },
      })
      .returning({
        id: sitePortfolioTable.id,
        image: sitePortfolioTable.image,
        title: sitePortfolioTable.title,
        description: sitePortfolioTable.description,
        category: sitePortfolioTable.category,
      });
    res.json(UpdatePortfolioWorkResponse.parse(saved));
  } catch (error) {
    logger.error({ err: error, workId: parsedParams.data.id }, "Failed to save portfolio edit");
    res.status(503).json({ error: "Бүтээлийн мэдээллийг хадгалж чадсангүй." });
  }
});

router.post("/admin/portfolio-images/upload-url", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePortfolioImageUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "PNG, JPG, WEBP эсвэл GIF зураг 8 MB-аас бага байх ёстой." });
    return;
  }

  try {
    res.json(
      CreatePortfolioImageUploadResponse.parse(
        await createPortfolioImageUpload(parsed.data.contentType),
      ),
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to create portfolio image upload");
    res.status(503).json({ error: "Зураг байршуулах холбоос үүсгэж чадсангүй." });
  }
});

router.post("/admin/portfolio-images/complete", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CompletePortfolioImageUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Зургийн дугаар буруу байна." });
    return;
  }

  const ownerId = getAuth(req).userId;
  if (!ownerId) {
    res.status(401).json({ error: "Эхлээд нэвтэрнэ үү." });
    return;
  }

  try {
    const imageUrl = await publishPortfolioImage(parsed.data.id, ownerId);
    res.json(CompletePortfolioImageUploadResponse.parse({ imageUrl }));
  } catch (error) {
    logger.error({ err: error }, "Failed to finalize portfolio image upload");
    res.status(400).json({ error: "Зураг байршуулж чадсангүй. Дахин сонгоно уу." });
  }
});

router.get("/storage/portfolio-images/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetPortfolioImageParams.safeParse({ id: rawId });
  if (!parsed.success) {
    res.status(404).end();
    return;
  }

  try {
    const image = await streamPortfolioImage(parsed.data.id);
    if (!image || !image.contentType.startsWith("image/")) {
      res.status(404).end();
      return;
    }
    if (image.redirectUrl) {
      res.setHeader("Cache-Control", "no-store");
      res.redirect(302, image.redirectUrl);
      return;
    }
    if (!image.stream) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (image.size > 0) res.setHeader("Content-Length", String(image.size));
    Readable.fromWeb(image.stream).pipe(res);
  } catch (error) {
    if ((error as { code?: number }).code === 404) {
      res.status(404).end();
      return;
    }
    logger.error({ err: error }, "Failed to serve portfolio image");
    res.status(503).end();
  }
});

export default router;
