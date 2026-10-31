import assert from 'node:assert/strict';
import { accessSync, constants } from 'node:fs';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';
import { createServer, type ViteDevServer } from 'vite';

let browser: Browser | undefined;
let server: ViteDevServer | undefined;
let baseUrl = '';

function getChromiumPath() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/repl/tools/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next conventional Chromium location.
    }
  }

  throw new Error('Chromium is required for the product search browser tests.');
}

before(async () => {
  process.env.PORT = '4186';
  process.env.BASE_PATH = '/';

  server = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: Number(process.env.PORT), strictPort: true },
  });
  await server.listen();
  baseUrl = (server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:4186').replace(/\/+$/, '');

  browser = await chromium.launch({
    executablePath: getChromiumPath(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

test('product search matches product specifications and details', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/products`, { waitUntil: 'networkidle' });
    const search = page.getByRole('searchbox', { name: 'Бүтээгдэхүүний нэр, тайлбар, үзүүлэлтээр хайх' });
    await search.fill('SUS316');

    assert.deepEqual(await page.locator('.product-card h3').allInnerTexts(), ['Термо сав 300мл — 4 өнгө']);
    assert.equal(await page.locator('.product-result-count').innerText(), '1 бүтээгдэхүүн');

    await search.fill('зөвлөмж-байхгүй');
    assert.equal(await page.locator('.product-card').count(), 0);
    assert.match(await page.locator('.product-search-empty').innerText(), /Таны хайлтад тохирох бүтээгдэхүүн олдсонгүй/);
  } finally {
    await page.close();
  }
});

test('product search combines with category filters and can be cleared', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/products`, { waitUntil: 'networkidle' });
    const fabricCategory = page.locator('.product-type-filters').getByRole('button', { name: 'Даавуун тор (1)', exact: true });
    await fabricCategory.click();
    const search = page.getByRole('searchbox', { name: 'Бүтээгдэхүүний нэр, тайлбар, үзүүлэлтээр хайх' });
    await search.fill('канвас');

    assert.deepEqual(await page.locator('.product-card h3').allInnerTexts(), ['Даавуун тор']);
    assert.equal(await fabricCategory.getAttribute('aria-pressed'), 'true');

    await search.fill('SUS316');
    assert.equal(await page.locator('.product-card').count(), 0);
    await page.getByRole('button', { name: 'Хайлтыг цэвэрлэх' }).click();

    assert.equal(await search.inputValue(), '');
    assert.deepEqual(await page.locator('.product-card h3').allInnerTexts(), ['Даавуун тор']);
    assert.equal(await fabricCategory.getAttribute('aria-pressed'), 'true');
  } finally {
    await page.close();
  }
});

test('tote details let visitors switch between the size photo and printed example', async () => {
  const page = await browser!.newPage();
  try {
    const params = new URLSearchParams({ category: 'Даавуун тор' });
    await page.goto(`${baseUrl}/products?${params}`, { waitUntil: 'networkidle' });
    await page.locator('.product-card-open').click();

    const dialog = page.getByRole('dialog', { name: 'Даавуун тор' });
    const gallery = dialog.getByRole('group', { name: 'Даавуун тор зургийн сонголт' });
    const image = dialog.locator('.product-dialog-main-image img');
    const thumbnails = gallery.getByRole('button');

    assert.equal(await thumbnails.count(), 2);
    assert.equal(await image.getAttribute('src'), '/images/Tote-bag.png');

    await gallery.getByRole('button', { name: '2-р зураг: Захиалгат хэвлэлийн жишээ' }).click();
    assert.match(await image.getAttribute('src') ?? '', /tote-bag-printed-design\.webp$/);
    await image.evaluate((element) => (element as HTMLImageElement).decode());
    assert.ok(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth > 0));

    await gallery.getByRole('button', { name: '1-р зураг: Хэмжээний зураг' }).click();
    assert.equal(await image.getAttribute('src'), '/images/Tote-bag.png');
  } finally {
    await page.close();
  }
});

test('engraved pendant details show and load every catalog view', async () => {
  const page = await browser!.newPage();
  try {
    const params = new URLSearchParams({ category: 'Зүүлт' });
    await page.goto(`${baseUrl}/products?${params}`, { waitUntil: 'networkidle' });
    await page.locator('[data-product-id="gallery_39"] .product-card-open').click();

    const dialog = page.getByRole('dialog', { name: 'Зураг сийлбэртэй ган зүүлт' });
    const gallery = dialog.getByRole('group', { name: 'Зураг сийлбэртэй ган зүүлт зургийн сонголт' });
    const image = dialog.locator('.product-dialog-main-image img');
    const expectedImages = [
      { button: '1-р зураг: Хосын хөрөгтэй сийлбэрийн жишээ', file: 'gallery_39.jpg' },
      { button: '2-р зураг: Тэврэлдсэн хосын сийлбэрийн жишээ', file: 'gallery_40.jpg' },
      { button: '3-р зураг: Хосын бүтэн дүрст сийлбэрийн жишээ', file: 'gallery_41.jpg' },
    ];

    assert.equal(await gallery.getByRole('button').count(), expectedImages.length);
    for (const expected of expectedImages) {
      await gallery.getByRole('button', { name: expected.button }).click();
      assert.match(await image.getAttribute('src') ?? '', new RegExp(`${expected.file.replace('.', '\\.')}$`));
      await image.evaluate((element) => (element as HTMLImageElement).decode());
      assert.ok(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth > 0));
    }
    assert.equal(
      await image.getAttribute('alt'),
      'Зураг сийлбэртэй ган зүүлт — Хосын бүтэн дүрст сийлбэрийн жишээ',
    );
  } finally {
    await page.close();
  }
});

test('product category links restore on reload and follow browser history', async () => {
  const page = await browser!.newPage();
  try {
    const params = new URLSearchParams({ source: 'shared', category: 'Сет' });
    await page.goto(`${baseUrl}/products?${params}`, { waitUntil: 'networkidle' });
    const filters = page.locator('.product-type-filters');
    const setsCategory = filters.getByRole('button', { name: /^Сет \(/ });
    const thermosCategory = filters.getByRole('button', { name: /^Термо сав ба аяга \(/ });

    assert.equal(await setsCategory.getAttribute('aria-pressed'), 'true');
    assert.ok((await page.locator('.product-card').allInnerTexts()).length > 0);
    assert.ok((await page.locator('.product-card').allInnerTexts()).every((text) => !text.includes('Термо сав')));

    await thermosCategory.click();
    assert.equal(new URL(page.url()).searchParams.get('category'), 'Термо сав ба аяга');
    assert.equal(new URL(page.url()).searchParams.get('source'), 'shared');
    assert.equal(await thermosCategory.getAttribute('aria-pressed'), 'true');

    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await thermosCategory.getAttribute('aria-pressed'), 'true');

    await page.goBack({ waitUntil: 'networkidle' });
    assert.equal(new URL(page.url()).searchParams.get('category'), 'Сет');
    assert.equal(await setsCategory.getAttribute('aria-pressed'), 'true');

    await filters.getByRole('button', { name: /^Бүгд \(/ }).click();
    assert.equal(new URL(page.url()).searchParams.has('category'), false);
    assert.equal(new URL(page.url()).searchParams.get('source'), 'shared');
  } finally {
    await page.close();
  }
});

test('product detail links open directly and follow browser history', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/products?source=shared`, { waitUntil: 'networkidle' });
    const productIds = await page.locator('.product-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-product-id')));
    assert.ok(productIds.every(Boolean));
    assert.equal(new Set(productIds).size, productIds.length, 'Every product should have a unique shareable identifier.');
    await page.locator('.product-card-open').first().click();

    const productUrl = new URL(page.url());
    const productId = productUrl.searchParams.get('product');
    assert.equal(productId, 'ceramic_mug');
    assert.equal(productUrl.searchParams.get('source'), 'shared');
    await page.getByRole('dialog', { name: 'Захиалгат шаазан аяга' }).waitFor({ state: 'visible' });

    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: 'Захиалгат шаазан аяга' }).waitFor({ state: 'visible' });

    await page.goBack({ waitUntil: 'networkidle' });
    assert.equal(new URL(page.url()).searchParams.has('product'), false);
    assert.equal(await page.getByRole('dialog').count(), 0);

    await page.goForward({ waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: 'Захиалгат шаазан аяга' }).waitFor({ state: 'visible' });
  } finally {
    await page.close();
  }
});

test('a product link opens its matching details even outside the current category', async () => {
  const page = await browser!.newPage();
  try {
    const params = new URLSearchParams({ category: 'Даавуун тор', product: 'gallery_44' });
    await page.goto(`${baseUrl}/products?${params}`, { waitUntil: 'networkidle' });

    await page.getByRole('dialog', { name: 'Захиалгат нэрийн ган зүүлт' }).waitFor({ state: 'visible' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: 'Захиалгат нэрийн ган зүүлт' }).waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'Дэлгэрэнгүй цонх хаах' }).click();
    assert.equal(new URL(page.url()).searchParams.has('product'), false);
    assert.equal(new URL(page.url()).searchParams.get('category'), 'Даавуун тор');
    assert.equal(await page.getByRole('dialog').count(), 0);
  } finally {
    await page.close();
  }
});
