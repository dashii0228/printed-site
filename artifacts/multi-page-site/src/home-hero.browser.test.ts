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

  throw new Error('Chromium is required for the homepage carousel browser test.');
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

test('homepage carousel advances automatically and has working previous/next controls', async () => {
  const page = await browser!.newPage({ reducedMotion: 'no-preference' });
  page.setDefaultTimeout(12_000);
  try {
    for (const endpoint of ['/api/products/changes', '/api/portfolio/changes', '/api/catalog/deletions']) {
      await page.route(`**${endpoint}`, (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }));
    }
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });

    const cards = page.locator('.hero-carousel-card');
    const image = cards.first().locator('.hero-carousel-image');
    const counter = page.locator('.hero-carousel-controls span');
    await counter.waitFor();
    assert.equal(await cards.count(), 3, 'Three images should be visible side by side.');
    assert.equal(await image.evaluate((element) => getComputedStyle(element).objectFit), 'contain', 'The full source photo should remain visible.');
    assert.equal(
      await page.locator('.hero-carousel').evaluate((element) => getComputedStyle(element).borderTopWidth),
      '1px',
      'The image should have a thin frame.',
    );
    const initialCount = await counter.innerText();
    const initialAlt = await image.getAttribute('alt');

    await page.getByRole('button', { name: 'Дараагийн зураг' }).click();
    const movingTrack = page.locator('.hero-carousel-track.is-moving-left');
    await movingTrack.waitFor();
    assert.equal(await cards.count(), 4, 'The incoming image should join the three visible images during movement.');
    assert.equal(await movingTrack.evaluate((element) => getComputedStyle(element).animationName), 'hero-carousel-slide-left', 'The strip should move left.');
    assert.equal(await movingTrack.evaluate((element) => getComputedStyle(element).animationDuration), '0.75s', 'The slide should keep its current speed.');
    await page.waitForFunction((previousCount) =>
      document.querySelector('.hero-carousel-controls span')?.textContent !== previousCount, initialCount);
    await page.waitForFunction(() => document.querySelectorAll('.hero-carousel-card').length === 3);
    assert.equal(
      await cards.count(),
      3,
      'The strip should settle back to three visible images.',
    );
    const manuallySelectedAlt = await image.getAttribute('alt');
    const manuallySelectedCount = await counter.innerText();
    assert.notEqual(manuallySelectedAlt, initialAlt, 'The next control should display a different image.');

    const autoAdvanceWaitStartedAt = Date.now();
    await page.locator('.hero-copy').hover();
    await page.getByRole('button', { name: 'Дараагийн зураг' }).evaluate((button) => (button as HTMLButtonElement).blur());
    await page.waitForFunction(
      (previousAlt) => document.querySelector('.hero-carousel-card .hero-carousel-image')?.getAttribute('alt') !== previousAlt,
      manuallySelectedAlt,
      { timeout: 13_000 },
    );
    assert.ok(Date.now() - autoAdvanceWaitStartedAt >= 7_500, 'The carousel should leave each image visible for eight seconds.');
    const automaticallySelectedAlt = await image.getAttribute('alt');
    assert.notEqual(automaticallySelectedAlt, manuallySelectedAlt, 'The image should advance automatically after the user leaves the carousel.');

    await page.getByRole('button', { name: 'Өмнөх зураг' }).click();
    await page.locator('.hero-carousel-track.is-moving-right').waitFor();
    await page.waitForFunction((expectedCount) =>
      document.querySelector('.hero-carousel-controls span')?.textContent === expectedCount, manuallySelectedCount, { timeout: 12_000 });
    await page.waitForFunction(() => !document.querySelector('.hero-carousel-track.is-moving-right'));
    assert.equal(await image.getAttribute('alt'), manuallySelectedAlt, 'The previous control should return to the prior image.');
  } finally {
    await page.close();
  }
});
