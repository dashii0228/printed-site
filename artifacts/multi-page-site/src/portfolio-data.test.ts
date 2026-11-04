import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterPortfolioWork,
  PORTFOLIO_CATEGORIES,
  PORTFOLIO_MATERIAL_OPTIONS,
  PORTFOLIO_MATERIALS,
  PORTFOLIO_WORK,
  PRINT_CATEGORIES,
  getPortfolioCategoryFromSearch,
  getPortfolioMaterialFromSearch,
  getPortfolioSearchTermFromSearch,
  getPortfolioRouteCategoryFromSearch,
  getPortfolioWorkFromSearch,
  PORTFOLIO_SEARCH_SUGGESTIONS,
} from './portfolio-data.ts';

test('Бүгд includes every portfolio example exactly once', () => {
  const allWork = filterPortfolioWork('all');

  assert.deepEqual(allWork, PORTFOLIO_WORK);
  assert.equal(allWork.length, 55, 'update this expected count when intentionally changing the gallery');
  assert.equal(allWork.length, PORTFOLIO_WORK.length);
  assert.equal(new Set(allWork.map((item) => item.image)).size, allWork.length);
});

test('each print category has a matching portfolio filter', () => {
  assert.deepEqual(
    PORTFOLIO_CATEGORIES.map(({ id }) => id),
    ['all', ...PRINT_CATEGORIES],
  );
});

for (const category of PORTFOLIO_CATEGORIES.filter(({ id }) => id !== 'all')) {
  test(`${category.label} includes only its own examples`, () => {
    const filteredWork = filterPortfolioWork(category.id);
    const expectedWork = PORTFOLIO_WORK.filter((item) => item.category === category.id);

    assert.ok(filteredWork.length > 0, `${category.label} should have at least one example`);
    assert.deepEqual(filteredWork, expectedWork);
    assert.ok(filteredWork.every((item) => item.category === category.id));
  });
}

test('every example has exactly one valid print category', () => {
  for (const item of PORTFOLIO_WORK) {
    const categoryFields = Object.keys(item).filter((key) => key === 'category' || key === 'categories');

    assert.deepEqual(categoryFields, ['category'], `${item.image} must have one category field`);
    assert.ok(PRINT_CATEGORIES.includes(item.category), `${item.image} has an invalid category`);
  }
});

test('every portfolio example exposes one or more valid material tags', () => {
  assert.deepEqual(
    PORTFOLIO_MATERIAL_OPTIONS.map(({ id }) => id),
    ['all', ...PORTFOLIO_MATERIALS],
  );
  for (const item of PORTFOLIO_WORK) {
    assert.ok(item.materials.length > 0, `${item.image} must have a material tag`);
    assert.equal(new Set(item.materials).size, item.materials.length, `${item.image} has duplicate material tags`);
    assert.ok(item.materials.every((material) => PORTFOLIO_MATERIALS.includes(material)), `${item.image} has an invalid material`);
  }
});

test('material filters match material tags and include steel in the broader metal filter', () => {
  assert.deepEqual(
    filterPortfolioWork('all', '', 'fabric').map((item) => item.image),
    [
      'portfolio-tote.webp',
      'portfolio-dtf-samples.webp',
      'portfolio-dtf-overview.webp',
      'portfolio-evipo-tote.webp',
      'portfolio-bukh-tulga-tote.webp',
      'portfolio-custom-tote-series.webp',
    ],
  );
  const steelWork = filterPortfolioWork('all', '', 'steel');
  const metalWork = filterPortfolioWork('all', '', 'metal');

  assert.ok(steelWork.length > 0);
  assert.ok(steelWork.every((item) => item.materials.includes('steel')));
  assert.ok(metalWork.length > steelWork.length);
  assert.ok(steelWork.every((item) => metalWork.includes(item)));
});

test('material filters combine with print categories and can be cleared', () => {
  const laserSteel = filterPortfolioWork('laser', '', 'steel');

  assert.deepEqual(
    laserSteel.map((item) => item.image),
    [
      'portfolio-laser-03.webp',
      'portfolio-laser-05.webp',
      'portfolio-khaan-buuz-cups-01.webp',
      'portfolio-khaan-buuz-cups-02.webp',
      'portfolio-logo-thermos-series.webp',
      'portfolio-ubcab-name-thermos.webp',
      'portfolio-koica-thermos-series.webp',
    ],
  );
  assert.deepEqual(filterPortfolioWork('laser', '', 'fabric'), []);
  assert.deepEqual(filterPortfolioWork('laser', '', 'all'), filterPortfolioWork('laser'));
});

test('new supplied portfolio examples are listed with their intended categories', () => {
  const expectedCategories = new Map([
    ['portfolio-sejong-notebook-set.webp', 'business'],
    ['portfolio-custom-notebook-pen-set.webp', 'business'],
    ['portfolio-enkh-amgalan-notebooks.webp', 'business'],
    ['portfolio-itgeh-med-gift-set.webp', 'business'],
    ['portfolio-mongol-express-notebook.webp', 'business'],
    ['portfolio-heritage-mongolia-badges.webp', 'uv'],
    ['portfolio-custom-message-thermos-cups.webp', 'uv'],
    ['portfolio-ecm-branded-card.webp', 'business'],
    ['portfolio-duvision-languagecert-notebooks.webp', 'business'],
    ['portfolio-blue-notebook-gift-set.webp', 'business'],
    ['portfolio-evipo-tote.webp', 'dtf'],
    ['portfolio-bukh-tulga-tote.webp', 'dtf'],
    ['portfolio-custom-tote-series.webp', 'dtf'],
    ['portfolio-laom-keychain-2026.webp', 'laser'],
    ['portfolio-ubcab-name-thermos.webp', 'laser'],
    ['portfolio-koica-thermos-series.webp', 'laser'],
  ]);

  for (const [image, category] of expectedCategories) {
    assert.equal(PORTFOLIO_WORK.find((item) => item.image === image)?.category, category);
  }
});

test('new award and thermos examples are included in the laser gallery', () => {
  const newImages = [
    'portfolio-award-medals-collection.webp',
    'portfolio-logo-thermos-series.webp',
    'portfolio-award-medals-closeup.webp',
    'portfolio-award-medal-detail.webp',
    'portfolio-otgontenger-medal-set.webp',
    'portfolio-otgontenger-medal-inscription.webp',
    'portfolio-otgontenger-medal-artwork.webp',
  ];

  for (const image of newImages) {
    assert.equal(PORTFOLIO_WORK.find((item) => item.image === image)?.category, 'laser');
  }
});

test('portfolio search matches words in any order across title and description', () => {
  const results = filterPortfolioWork('all', '  термос өдөр  ');

  assert.equal(results.length, 1);
  assert.equal(results[0].image, 'portfolio-laser-03.webp');
});

test('portfolio search remains case-insensitive and trims surrounding spaces', () => {
  assert.deepEqual(
    filterPortfolioWork('all', '  UV ХЭВЛЭЛ  '),
    filterPortfolioWork('all', 'uv хэвлэл'),
  );
});

test('portfolio search matches descriptive text not present in the title', () => {
  const results = filterPortfolioWork('all', 'өдөр тутам');

  assert.equal(results.length, 1);
  assert.equal(results[0].image, 'portfolio-laser-03.webp');
  assert.ok(!results[0].title.includes('өдөр тутам'));
  assert.ok(results[0].description.toLocaleLowerCase().includes('өдөр тутам'));
});

test('portfolio search combines with the selected print category', () => {
  const results = filterPortfolioWork('laser', 'өдөр тутам');

  assert.equal(results.length, 1);
  assert.ok(results.every((item) =>
    item.category === 'laser' && item.description.toLocaleLowerCase().includes('өдөр тутам'),
  ));
  assert.deepEqual(filterPortfolioWork('uv', 'өдөр тутам'), []);
});

test('portfolio search recognizes alternate names for printing methods', () => {
  const laserResults = filterPortfolioWork('all', 'laser engraving');
  const dtfResults = filterPortfolioWork('all', 'direct-to-film');

  assert.ok(laserResults.length > 0);
  assert.ok(laserResults.every((item) => item.category === 'laser'));
  assert.ok(dtfResults.length > 0);
  assert.ok(dtfResults.every((item) => item.category === 'dtf'));
});

test('portfolio search recognizes alternate names for materials', () => {
  const steelResults = filterPortfolioWork('all', 'stainless steel');
  const fabricResults = filterPortfolioWork('all', 'cotton');

  assert.deepEqual(
    steelResults.map((item) => item.image),
    ['gallery_39.jpg', 'portfolio-pendant-01.webp', 'portfolio-laser-05.webp'],
  );
  assert.deepEqual(fabricResults.map((item) => item.image), ['portfolio-tote.webp']);
});

test('every suggested material and method term returns matching portfolio work', () => {
  for (const suggestion of PORTFOLIO_SEARCH_SUGGESTIONS) {
    const results = filterPortfolioWork('all', suggestion.searchTerm);

    assert.ok(results.length > 0, `${suggestion.label} should match existing portfolio work`);
  }
});

test('alternate-name search remains category-scoped and ignores unrelated terms', () => {
  assert.deepEqual(filterPortfolioWork('laser', 'direct to film'), []);
  assert.deepEqual(filterPortfolioWork('uv', 'cotton'), []);
  assert.deepEqual(filterPortfolioWork('all', 'silk'), []);
});

test('shared portfolio URLs restore the search term', () => {
  assert.equal(getPortfolioSearchTermFromSearch('?category=laser&search=%D3%A9%D0%B4%D3%A9%D1%80%20%D1%82%D1%83%D1%82%D0%B0%D0%BC'), 'өдөр тутам');
  assert.equal(getPortfolioSearchTermFromSearch('?category=uv'), '');
});

test('shared portfolio URLs restore only known material filters', () => {
  assert.equal(getPortfolioMaterialFromSearch('?material=steel'), 'steel');
  assert.equal(getPortfolioMaterialFromSearch('?category=laser&material=fabric'), 'fabric');
  assert.equal(getPortfolioMaterialFromSearch('?material=unknown'), 'all');
  assert.equal(getPortfolioMaterialFromSearch(''), 'all');
});

test('an unknown shared category falls back to all work', () => {
  assert.equal(getPortfolioCategoryFromSearch('?category=not-a-category'), 'all');
  assert.equal(getPortfolioRouteCategoryFromSearch('?category=not-a-category'), 'all');
});

test('portfolio search returns no items when titles and descriptions do not match', () => {
  assert.deepEqual(filterPortfolioWork('all', 'definitely no matching title'), []);
});

test('portfolio work links resolve only known example images', () => {
  const work = PORTFOLIO_WORK[4];

  assert.deepEqual(getPortfolioWorkFromSearch(`?work=${encodeURIComponent(work.image)}`), work);
  assert.equal(getPortfolioWorkFromSearch('?work=missing-image.jpg'), null);
  assert.equal(getPortfolioWorkFromSearch(''), null);
});

test('a shared work link uses its own category when the URL category conflicts', () => {
  assert.equal(getPortfolioRouteCategoryFromSearch('?category=laser&work=portfolio-pendant-01.webp'), 'uv');
  assert.equal(getPortfolioRouteCategoryFromSearch('?category=laser&work=missing-image.jpg'), 'laser');
});
