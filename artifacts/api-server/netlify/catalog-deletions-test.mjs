// Development-database integration test. Only uniquely named synthetic markers
// are inserted, and they are removed in finally; source records/images are untouched.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const directory = await mkdtemp(join(tmpdir(), "printed-deletions-"));
try {
  const script = `
    import assert from 'node:assert/strict';
    import { randomUUID } from 'node:crypto';
    import { pool } from './lib/db/src/index.ts';
    import { getCatalogDeletions, deleteCatalogEntry, isCatalogEntryDeleted }
      from './artifacts/api-server/src/lib/catalogDeletions.ts';
    const id = '__deletion_test_' + randomUUID();
    (async () => {
      try {
        await getCatalogDeletions();
        assert.equal(await isCatalogEntryDeleted('product', id), false);
        await deleteCatalogEntry('product', id);
        await deleteCatalogEntry('product', id);
        assert.equal(await isCatalogEntryDeleted('product', id), true);
        assert.equal(await isCatalogEntryDeleted('portfolio', id), false);
        let rows = await getCatalogDeletions();
        assert.equal(rows.filter(r => r.id === id).length, 1);
        await deleteCatalogEntry('portfolio', id);
        rows = await getCatalogDeletions();
        assert.equal(rows.filter(r => r.id === id).length, 2);
        const persisted = await pool.query('SELECT kind FROM site_catalog_deletions WHERE id = $1', [id]);
        assert.equal(persisted.rowCount, 2);
        console.log('PASS: persistent deletion, repeat deletion, kind isolation');
      } finally {
        await pool.query('DELETE FROM site_catalog_deletions WHERE id = $1', [id]);
        await pool.end();
      }
    })().catch(() => { console.error('Catalog deletion integration test failed'); process.exitCode = 1; });
  `;
  await build({
    stdin: { contents: script, resolveDir: process.cwd(), sourcefile: "deletion-test.ts" },
    bundle: true, platform: "node", format: "cjs", target: "node22",
    outfile: join(directory, "test.cjs"),
  });
  const result = spawnSync(process.execPath, [join(directory, "test.cjs")], {
    encoding: "utf8", timeout: 30_000, env: process.env,
  });
  assert.equal(result.status, 0, "Catalog deletion integration test failed");
  process.stdout.write(result.stdout);
} finally {
  await rm(directory, { recursive: true, force: true });
}
