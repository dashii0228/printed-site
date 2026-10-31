import { Readable } from "node:stream";
import { asc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { siteProductsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  createProductImageUpload,
  publishProductImage,
  streamProductImage,
} from "../lib/productImageStorage";
import { requireAdmin } from "./admin";

const router: IRouter = Router();
const productCategories = new Set([
  "Термо сав ба аяга",
  "Дэвтэр ба үзэг",
  "Сет",
  "Тэмдэг, медаль",
  "Түлхүүрийн оосор",
  "Зүүлт",
  "Карт холдер",
  "Үнэмлэх",
  "Даавуун тор",
  "Цаасан уут",
  "Бусад",
]);
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stringField(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function validateProduct(body: unknown, id: string) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  if (
    !stringField(value.name, 160) ||
    !stringField(value.category, 80) ||
    !productCategories.has(value.category as string) ||
    !stringField(value.image, 2048) ||
    !stringField(value.desc, 1000) ||
    !stringField(value.details, 5000) ||
    !Array.isArray(value.specs) ||
    value.specs.length > 30 ||
    !value.specs.every(
      (spec) =>
        spec &&
        typeof spec === "object" &&
        stringField((spec as Record<string, unknown>).label, 100) &&
        stringField((spec as Record<string, unknown>).value, 500),
    ) ||
    !Array.isArray(value.features) ||
    value.features.length > 30 ||
    !value.features.every((feature) => stringField(feature, 500)) ||
    !Number.isInteger(value.sortOrder) ||
    (value.sortOrder as number) < 0
  ) {
    return null;
  }

  const image = (value.image as string).trim();
  const validImage =
    !image.startsWith("//") &&
    !image.startsWith("data:") &&
    !image.startsWith("javascript:") &&
    (image.startsWith("/api/storage/product-images/") ||
      image.startsWith("/images/") ||
      (!image.includes("/") && !image.includes("\\") && !image.includes("..")) ||
      (image.startsWith("https://") && URL.canParse(image)));
  if (!validImage) return null;

  const additionalImages = value.additionalImages ?? [];
  if (
    !Array.isArray(additionalImages) ||
    additionalImages.length > 20 ||
    !additionalImages.every(
      (item) =>
        item &&
        typeof item === "object" &&
        stringField((item as Record<string, unknown>).image, 2048) &&
        stringField((item as Record<string, unknown>).label, 160),
    )
  ) {
    return null;
  }

  return {
    id,
    name: (value.name as string).trim(),
    category: value.category as string,
    image,
    additionalImages,
    desc: (value.desc as string).trim(),
    details: (value.details as string).trim(),
    specs: value.specs,
    features: value.features.map((feature) => (feature as string).trim()),
    sortOrder: value.sortOrder as number,
  };
}

router.get("/products/changes", async (_req, res) => {
  try {
    const products = await db
      .select()
      .from(siteProductsTable)
      .orderBy(asc(siteProductsTable.sortOrder), asc(siteProductsTable.name));
    res.json(products);
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch product catalog changes");
    res.status(503).json({ error: "Бүтээгдэхүүний мэдээллийг ачаалж чадсангүй." });
  }
});

router.get("/admin/products", requireAdmin, async (_req, res) => {
  try {
    const products = await db
      .select()
      .from(siteProductsTable)
      .orderBy(asc(siteProductsTable.sortOrder), asc(siteProductsTable.name));
    res.json(products);
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch admin product catalog");
    res.status(503).json({ error: "Бүтээгдэхүүний мэдээллийг ачаалж чадсангүй." });
  }
});

router.put("/admin/products/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  if (!id || id.length > 180 || /[\\/]/.test(id)) {
    res.status(400).json({ error: "Бүтээгдэхүүний дугаар буруу байна." });
    return;
  }

  const product = validateProduct(req.body, id);
  if (!product) {
    res.status(400).json({ error: "Бүтээгдэхүүний мэдээллийг шалгаад дахин оролдоно уу." });
    return;
  }

  try {
    const [saved] = await db
      .insert(siteProductsTable)
      .values({ ...product, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteProductsTable.id,
        set: {
          name: product.name,
          category: product.category,
          image: product.image,
          additionalImages: product.additionalImages,
          desc: product.desc,
          details: product.details,
          specs: product.specs,
          features: product.features,
          sortOrder: product.sortOrder,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(saved);
  } catch (error) {
    logger.error({ err: error, productId: id }, "Failed to save product");
    res.status(503).json({ error: "Бүтээгдэхүүнийг хадгалж чадсангүй." });
  }
});

router.post("/admin/product-images/upload-url", requireAdmin, async (req, res) => {
  const contentType = req.body?.contentType;
  const fileSize = req.body?.size;
  if (
    typeof contentType !== "string" ||
    !allowedImageTypes.has(contentType) ||
    !Number.isInteger(fileSize) ||
    fileSize < 1 ||
    fileSize > 8 * 1024 * 1024
  ) {
    res.status(400).json({ error: "PNG, JPG, WEBP эсвэл GIF зураг 8 MB-аас бага байх ёстой." });
    return;
  }

  try {
    const upload = await createProductImageUpload(contentType);
    res.json(upload);
  } catch (error) {
    logger.error({ err: error }, "Failed to create product image upload");
    res.status(503).json({ error: "Зураг байршуулах холбоос үүсгэж чадсангүй." });
  }
});

router.post("/admin/product-images/complete", requireAdmin, async (req, res) => {
  const id = req.body?.id;
  if (typeof id !== "string" || !uuidPattern.test(id)) {
    res.status(400).json({ error: "Зургийн дугаар буруу байна." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId;
    if (!ownerId) {
      res.status(401).json({ error: "Эхлээд нэвтэрнэ үү." });
      return;
    }
    const imageUrl = await publishProductImage(id, ownerId);
    res.json({ imageUrl });
  } catch (error) {
    logger.error({ err: error }, "Failed to finalize product image upload");
    res.status(400).json({ error: "Зураг байршуулж чадсангүй. Дахин сонгоно уу." });
  }
});

router.get("/storage/product-images/:id", async (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  if (!uuidPattern.test(id)) {
    res.status(404).end();
    return;
  }

  try {
    const image = await streamProductImage(id);
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
    logger.error({ err: error }, "Failed to serve product image");
    res.status(503).end();
  }
});

export default router;
