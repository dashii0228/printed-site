import { pool } from "@workspace/db";

export type CatalogEntryKind = "product" | "portfolio";
let ready: Promise<unknown> | undefined;

// Additive, idempotent initialization supports existing external Netlify databases.
// The source catalog and stored edits are preserved; a marker prevents a deleted
// source entry from reappearing on the next build or catalog merge.
async function ensureTable() {
  ready ??= pool.query(`
    CREATE TABLE IF NOT EXISTS site_catalog_deletions (
      kind text NOT NULL CHECK (kind IN ('product', 'portfolio')),
      id text NOT NULL,
      deleted_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (kind, id)
    )
  `).catch((error: unknown) => {
    ready = undefined;
    throw error;
  });
  await ready;
}

export async function getCatalogDeletions() {
  await ensureTable();
  const result = await pool.query<{ kind: CatalogEntryKind; id: string }>(
    "SELECT kind, id FROM site_catalog_deletions ORDER BY kind, id",
  );
  return result.rows;
}

export async function deleteCatalogEntry(kind: CatalogEntryKind, id: string) {
  await ensureTable();
  await pool.query(
    "INSERT INTO site_catalog_deletions (kind, id) VALUES ($1, $2) ON CONFLICT (kind, id) DO NOTHING",
    [kind, id],
  );
}

export async function isCatalogEntryDeleted(kind: CatalogEntryKind, id: string) {
  await ensureTable();
  const result = await pool.query(
    "SELECT 1 FROM site_catalog_deletions WHERE kind = $1 AND id = $2",
    [kind, id],
  );
  return result.rowCount !== 0;
}
