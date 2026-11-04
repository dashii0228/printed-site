import assert from "node:assert/strict";
import test from "node:test";
import { filterDeletedEntries, loadCatalogDeletions } from "./catalog-deletions.ts";

test("source and added entries remain removed after a new catalog merge", () => {
  const initial = [{ id: "source", name: "Original" }, { id: "kept", name: "Keep" }];
  const added = { id: "new-product", name: "New" };
  const deletions = [
    { kind: "product" as const, id: "source" },
    { kind: "product" as const, id: "new-product" },
  ];
  for (let reload = 0; reload < 2; reload++) {
    assert.deepEqual(filterDeletedEntries([...initial, added], deletions, "product", (item) => item.id),
      [{ id: "kept", name: "Keep" }]);
  }
  assert.equal(initial.length, 2, "source data is not mutated");
});

test("product and portfolio deletions never remove the other kind", () => {
  const initial = [{ id: "same" }];
  const deletions = [{ kind: "portfolio" as const, id: "same" }];
  assert.deepEqual(filterDeletedEntries(initial, deletions, "product", (item) => item.id), initial);
  assert.deepEqual(filterDeletedEntries(initial, deletions, "portfolio", (item) => item.id), []);
});

test("catalog deletion loading is uncached and rejects errors and malformed data", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_input, init) => {
      assert.equal(init?.cache, "no-store");
      return Response.json([{ kind: "product", id: "source" }]);
    };
    assert.deepEqual(await loadCatalogDeletions(), [{ kind: "product", id: "source" }]);
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(loadCatalogDeletions());
    for (const body of [{}, [{ kind: "other", id: "source" }], [{ kind: "product" }]]) {
      globalThis.fetch = async () => Response.json(body);
      await assert.rejects(loadCatalogDeletions());
    }
  } finally {
    globalThis.fetch = original;
  }
});
