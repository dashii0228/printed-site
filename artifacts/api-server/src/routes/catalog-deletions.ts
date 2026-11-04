import { Router, type IRouter } from "express";
import { isPortfolioWorkId } from "@workspace/site-content";
import { GetCatalogDeletionsResponse } from "@workspace/api-zod";
import { deleteCatalogEntry, getCatalogDeletions } from "../lib/catalogDeletions";
import { requireAdmin } from "./admin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/catalog/deletions", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    res.json(GetCatalogDeletionsResponse.parse(await getCatalogDeletions()));
  } catch (error) {
    logger.error({ err: error }, "Failed to load catalog deletions");
    res.status(503).json({ error: "Устгасан бичлэгийн мэдээллийг ачаалж чадсангүй." });
  }
});

for (const kind of ["product", "portfolio"] as const) {
  const path = kind === "product" ? "/admin/products/:id" : "/admin/portfolio/:id";
  router.delete(path, requireAdmin, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!id || id.length > 180 || /[\\/\u0000-\u001f]/.test(id)) {
      res.status(400).json({ error: "Бичлэгийн дугаар буруу байна." });
      return;
    }
    if (kind === "portfolio" && !isPortfolioWorkId(id)) {
      res.status(404).json({ error: "Бүтээл олдсонгүй." });
      return;
    }
    try {
      await deleteCatalogEntry(kind, id);
      res.status(204).end();
    } catch (error) {
      logger.error({ err: error, kind, entryId: id }, "Failed to delete catalog entry");
      res.status(503).json({ error: "Устгаж чадсангүй. Дахин оролдоно уу." });
    }
  });
}

export default router;
