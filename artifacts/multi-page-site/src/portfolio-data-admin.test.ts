import assert from "node:assert/strict";
import test from "node:test";
import {
  filterPortfolioWork,
  getPortfolioWorkFromSearch,
  mergePortfolioWork,
  PORTFOLIO_WORK,
  type PortfolioWorkOverride,
} from "./portfolio-data.ts";

test("portfolio work IDs are unique and edits do not add or remove works", () => {
  const ids = PORTFOLIO_WORK.map((work) => work.id);
  assert.equal(new Set(ids).size, ids.length);

  const first = PORTFOLIO_WORK[0]!;
  const override: PortfolioWorkOverride = {
    id: first.id,
    image: "/api/storage/portfolio-images/00000000-0000-4000-8000-000000000001",
    title: "Зассан гарчиг",
    description: "Зассан тайлбар",
    category: "uv",
  };
  const edited = mergePortfolioWork(PORTFOLIO_WORK, [override]);

  assert.equal(edited.length, PORTFOLIO_WORK.length);
  assert.equal(edited[0]?.title, "Зассан гарчиг");
  assert.equal(edited[0]?.image, override.image);
  assert.equal(edited[0]?.sourceImage, first.image);
  assert.equal(edited[0]?.category, "uv");
});

test("old portfolio image links still open after an image is replaced", () => {
  const first = PORTFOLIO_WORK[0]!;
  const edited = mergePortfolioWork(PORTFOLIO_WORK, [{
    id: first.id,
    image: "/api/storage/portfolio-images/00000000-0000-4000-8000-000000000001",
    title: first.title,
    description: first.description,
    category: first.category,
  }]);

  const linkedWork = getPortfolioWorkFromSearch(`?work=${encodeURIComponent(first.image)}`, edited);
  assert.equal(linkedWork?.id, first.id);
  assert.equal(filterPortfolioWork("laser", "", "all", edited)[0]?.id, first.id);
});
