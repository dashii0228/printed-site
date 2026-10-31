import assert from 'node:assert/strict';
import { accessSync, constants } from 'node:fs';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';
import { preview, type PreviewServer } from 'vite';
import { PORTFOLIO_WORK } from './portfolio-data.ts';
import { getImageUrl } from './image-url.ts';

let browser: Browser | undefined;
let server: PreviewServer | undefined;
let baseUrl = '';
const nestedBasePath = '/portfolio-test/';

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

  throw new Error('Chromium is required for the built portfolio image test.');
}

before(async () => {
  process.env.PORT = '4188';
  process.env.BASE_PATH = nestedBasePath;

  server = await preview({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    preview: { host: '127.0.0.1', port: Number(process.env.PORT), strictPort: true },
  });
  baseUrl = new URL(server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:4188').origin;

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

test('every portfolio card image loads from the built site', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}${nestedBasePath}portfolio`, { waitUntil: 'networkidle' });
    const images = await page.locator('.work-card-image img').evaluateAll((elements) =>
      elements.map((element) => {
        const image = element as HTMLImageElement;
        return image.src;
      }),
    );
    const expectedUrls = PORTFOLIO_WORK.map(
      ({ image }) => new URL(getImageUrl(image, nestedBasePath), baseUrl).href,
    );

    assert.equal(
      images.length,
      PORTFOLIO_WORK.length,
      'The built portfolio should render every portfolio card.',
    );
    assert.deepEqual(
      images,
      expectedUrls,
      'Rendered image URLs should use the production base path and encoded filenames.',
    );

    const responses = await Promise.all(
      expectedUrls.map((imageUrl) => page.request.get(imageUrl)),
    );
    for (const [index, response] of responses.entries()) {
      const imageUrl = expectedUrls[index];
      assert.equal(response.status(), 200, `${imageUrl} should respond successfully.`);
      assert.match(
        response.headers()['content-type'] ?? '',
        /^image\//,
        `${imageUrl} should be served with an image content type.`,
      );
      assert.ok((await response.body()).byteLength > 0, `${imageUrl} should not be empty.`);
    }
  } finally {
    await page.close();
  }
});

test('a portfolio image filename with spaces is encoded and loads from the built site', async () => {
  const page = await browser!.newPage();
  const filename = 'portfolio space fixture.svg';
  const imageUrl = new URL(getImageUrl(filename, nestedBasePath), baseUrl).href;
  try {
    await page.goto(`${baseUrl}${nestedBasePath}portfolio`, { waitUntil: 'networkidle' });
    const renderedImage = await page.evaluate(async (src) => {
      const image = document.createElement('img');
      image.dataset.testid = 'space-filename-fixture';
      image.src = src;
      document.body.append(image);
      await image.decode();
      return { src: image.src, naturalWidth: image.naturalWidth };
    }, imageUrl);

    assert.equal(
      renderedImage.src,
      imageUrl,
      'The rendered fixture URL should percent-encode its filename space.',
    );
    assert.ok(renderedImage.src.includes('portfolio%20space%20fixture.svg'));
    assert.ok(renderedImage.naturalWidth > 0, 'The browser should decode the built image.');

    const response = await page.request.get(imageUrl);
    assert.equal(response.status(), 200, `${imageUrl} should respond successfully.`);
    assert.match(
      response.headers()['content-type'] ?? '',
      /^image\//,
      `${imageUrl} should be served with an image content type.`,
    );
    assert.ok((await response.body()).byteLength > 0, `${imageUrl} should not be empty.`);
  } finally {
    await page.close();
  }
});
