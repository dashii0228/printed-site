import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type ProductImage = { image: string; label: string };
export type ProductSpec = { label: string; value: string };

export const siteProductsTable = pgTable("site_products", {
  id: text("id").primaryKey(),
  image: text("image").notNull(),
  additionalImages: jsonb("additional_images")
    .$type<ProductImage[]>()
    .notNull()
    .default([]),
  name: text("name").notNull(),
  category: text("category").notNull(),
  desc: text("description").notNull(),
  details: text("details").notNull(),
  specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sitePortfolioTable = pgTable("site_portfolio", {
  id: text("id").primaryKey(),
  image: text("image").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SiteProduct = typeof siteProductsTable.$inferSelect;
export type NewSiteProduct = typeof siteProductsTable.$inferInsert;
export type SitePortfolioWork = typeof sitePortfolioTable.$inferSelect;
export type NewSitePortfolioWork = typeof sitePortfolioTable.$inferInsert;