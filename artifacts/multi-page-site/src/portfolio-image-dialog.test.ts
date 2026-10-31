import assert from 'node:assert/strict';
import { accessSync, constants } from 'node:fs';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright-core';
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

  throw new Error('Chromium is required for the portfolio dialog browser tests.');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function assertPortfolioCategory(page: Page, category: 'all' | 'laser' | 'uv' | 'dtf' | 'business') {
  const labels = {
    all: 'Бүгд',
    laser: 'Лазер',
    uv: 'UV',
    dtf: 'DTF',
    business: 'Бизнес хэвлэл',
  } as const;
  const expectedCategory = category === 'all' ? null : category;

  await page.waitForFunction(
    ({ expectedCategory, label }) => {
      const activeFilter = Array.from(document.querySelectorAll('.portfolio-filters button'))
        .some((button) => button.textContent?.trim() === label && button.getAttribute('aria-pressed') === 'true');

      return new URL(window.location.href).searchParams.get('category') === expectedCategory && activeFilter;
    },
    { expectedCategory, label: labels[category] },
  );

  assert.equal(
    await page.getByRole('button', { name: labels[category], exact: true }).getAttribute('aria-pressed'),
    'true',
    `${labels[category]} should be the active category.`,
  );

  const visibleTitles = await page.locator('.work-card p').allInnerTexts();
  const expectedTitles = await page.evaluate(async (selectedCategory) => {
    const { filterPortfolioWork } = await import('/src/portfolio-data.ts');
    return filterPortfolioWork(selectedCategory).map((item) => item.title);
  }, category);
  assert.deepEqual(visibleTitles, expectedTitles, `${labels[category]} should show its matching work list.`);
}

async function assertPortfolioSearchState(
  page: Page,
  category: 'all' | 'laser' | 'uv' | 'dtf' | 'business',
  searchTerm: string,
  expectedTitles: string[],
) {
  const categoryLabels = {
    all: 'Бүгд',
    laser: 'Лазер',
    uv: 'UV',
    dtf: 'DTF',
    business: 'Бизнес хэвлэл',
  } as const;
  const expectedCategoryParam = category === 'all' ? null : category;

  await page.waitForFunction(
    ({ expectedCategory, expectedSearch, label }) => {
      const activeFilter = Array.from(document.querySelectorAll('.portfolio-filters button'))
        .some((button) => button.textContent?.trim() === label && button.getAttribute('aria-pressed') === 'true');
      const url = new URL(window.location.href);

      return url.searchParams.get('category') === expectedCategory
        && url.searchParams.get('search') === expectedSearch
        && activeFilter
        && (document.querySelector('[data-testid="input-search-portfolio"]') as HTMLInputElement | null)?.value === expectedSearch;
    },
    { expectedCategory: expectedCategoryParam, expectedSearch: searchTerm, label: categoryLabels[category] },
  );

  assert.equal(
    await page.getByRole('button', { name: categoryLabels[category], exact: true }).getAttribute('aria-pressed'),
    'true',
    `${categoryLabels[category]} should be selected for the restored search.`,
  );
  assert.equal(await page.getByTestId('input-search-portfolio').inputValue(), searchTerm);
  assert.equal(new URL(page.url()).searchParams.get('category'), expectedCategoryParam);
  assert.equal(new URL(page.url()).searchParams.get('search'), searchTerm);
  assert.deepEqual(
    await page.locator('.work-card p').allInnerTexts(),
    expectedTitles,
    `${categoryLabels[category]} should restore its matching search results.`,
  );
}

async function openFirstPortfolioImage(page: Page) {
  page.setDefaultTimeout(8_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'domcontentloaded' });

  const trigger = page.locator('.work-card-image').first();
  const triggerCount = await page.locator('.work-card-image').count();
  assert.ok(
    triggerCount > 0,
    `Portfolio cards did not render at ${page.url()}. Page text: ${await page.locator('body').innerText()}`,
  );
  const title = await trigger.locator('img').getAttribute('alt');
  assert.ok(title, 'The portfolio image button should have an accessible image title.');

  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: new RegExp(escapeRegExp(title)) });
  await dialog.waitFor({ state: 'visible' });

  return { trigger, dialog, title };
}

before(async () => {
  process.env.PORT = '4187';
  process.env.BASE_PATH = '/';

  server = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: Number(process.env.PORT), strictPort: true },
  });
  await server.listen();
  baseUrl = (server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:4187').replace(/\/+$/, '');

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

test('portfolio search is shareable and clearing it keeps the selected category', async () => {
  const page = await browser!.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/portfolio?category=laser&search=%D3%A9%D0%B4%D3%A9%D1%80%20%D1%82%D1%83%D1%82%D0%B0%D0%BC`, { waitUntil: 'networkidle' });

    const search = page.getByTestId('input-search-portfolio');
    assert.equal(await search.inputValue(), 'өдөр тутам');
    assert.equal(await page.locator('.work-card').count(), 1);
    assert.equal(new URL(page.url()).searchParams.get('category'), 'laser');
    assert.equal(new URL(page.url()).searchParams.get('search'), 'өдөр тутам');

    await search.fill('термос');
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get('search') === 'термос');
    assert.equal(new URL(page.url()).searchParams.get('search'), 'термос');

    await search.fill('');
    await page.waitForFunction(() => !new URL(window.location.href).searchParams.has('search'));
    assert.equal(new URL(page.url()).searchParams.has('search'), false);
    assert.equal(new URL(page.url()).searchParams.get('category'), 'laser');
  } finally {
    await page.close();
  }
});

test('changing the portfolio category preserves the current search', async () => {
  const page = await browser!.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/portfolio?category=laser&search=термос`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'UV', exact: true }).click();

    const url = new URL(page.url());
    assert.equal(url.searchParams.get('category'), 'uv');
    assert.equal(url.searchParams.get('search'), 'термос');
    assert.equal(await page.getByTestId('input-search-portfolio').inputValue(), 'термос');
  } finally {
    await page.close();
  }
});

test('browser Back and Forward restore the category search and matching results', async () => {
  const page = await browser!.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/portfolio?category=laser&search=%D1%82%D0%B5%D1%80%D0%BC%D0%BE%D1%81`, { waitUntil: 'networkidle' });

    const laserResults = ['Термос саван дээрх лазер сийлбэр'];
    const uvResults = ['Термос саван дээрх өнгөт UV хэвлэл'];
    await assertPortfolioSearchState(page, 'laser', 'термос', laserResults);

    await page.getByRole('button', { name: 'UV', exact: true }).click();
    await assertPortfolioSearchState(page, 'uv', 'термос', uvResults);

    await page.goBack();
    await assertPortfolioSearchState(page, 'laser', 'термос', laserResults);

    await page.goForward();
    await assertPortfolioSearchState(page, 'uv', 'термос', uvResults);
  } finally {
    await page.close();
  }
});

test('keyboard users can focus and select a print category from search', async () => {
  const page = await browser!.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });

    const search = page.getByTestId('input-search-portfolio');
    let reachedSearch = false;
    for (let tabCount = 0; tabCount < 80; tabCount += 1) {
      if (await search.evaluate((element) => document.activeElement === element)) {
        reachedSearch = true;
        break;
      }
      await page.keyboard.press('Tab');
    }
    assert.equal(reachedSearch, true, 'Tab should reach the portfolio search field.');
    assert.equal(
      await search.evaluate((element) => element.matches(':focus-visible')),
      true,
      'The search field should retain a visible keyboard focus state.',
    );
    assert.notEqual(
      await search.evaluate((element) => getComputedStyle(element.parentElement!).boxShadow),
      'none',
      'The search field container should visibly indicate focus.',
    );

    await page.keyboard.press('Shift+Tab');
    const materialFilter = page.getByTestId('select-portfolio-material');
    assert.equal(await materialFilter.evaluate((element) => document.activeElement === element), true);
    assert.equal(
      await materialFilter.evaluate((element) => element.matches(':focus-visible')),
      true,
      'The material filter should have a visible keyboard focus state.',
    );

    await page.keyboard.press('Shift+Tab');
    const businessFilter = page.getByRole('button', { name: 'Бизнес хэвлэл', exact: true });
    assert.equal(await businessFilter.evaluate((element) => document.activeElement === element), true);
    assert.equal(
      await businessFilter.evaluate((element) => element.matches(':focus-visible') && getComputedStyle(element).outlineWidth === '3px'),
      true,
      'The category filter should have a visible keyboard focus outline.',
    );

    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    const uvFilter = page.getByRole('button', { name: 'UV', exact: true });
    assert.equal(await uvFilter.evaluate((element) => document.activeElement === element), true);
    assert.equal(
      await uvFilter.evaluate((element) => element.matches(':focus-visible') && getComputedStyle(element).outlineWidth === '3px'),
      true,
      'Focus should remain visible while moving between category filters.',
    );

    await page.keyboard.press('Enter');
    await assertPortfolioCategory(page, 'uv');
    assert.ok((await uvFilter.getAttribute('class'))?.split(' ').includes('active'), 'The selected category should look active.');

    await page.keyboard.press('Tab');
    assert.equal(
      await page.getByRole('button', { name: 'DTF', exact: true }).evaluate((element) => (
        document.activeElement === element &&
        element.matches(':focus-visible') &&
        getComputedStyle(element).outlineWidth === '3px'
      )),
      true,
      'Focus should remain visible when continuing through the category filters.',
    );
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await materialFilter.evaluate((element) => document.activeElement === element), true);
    await page.keyboard.press('Tab');
    assert.equal(await search.evaluate((element) => document.activeElement === element), true);
    assert.equal(
      await search.evaluate((element) => element.matches(':focus-visible') && getComputedStyle(element.parentElement!).boxShadow !== 'none'),
      true,
      'Keyboard focus should remain visible when returning to search.',
    );
  } finally {
    await page.close();
  }
});

test('keyboard activates the image button and opens a named dialog', async () => {
  const page = await browser!.newPage();
  try {
    const { dialog, title } = await openFirstPortfolioImage(page);
    assert.equal(await dialog.getAttribute('aria-modal'), 'true');
    assert.equal(await dialog.getAttribute('aria-labelledby'), 'portfolio-dialog-title');
    assert.ok((await page.locator('#portfolio-dialog-title').innerText()).includes(title));
  } finally {
    await page.close();
  }
});

test('portfolio image toggles between fitted and zoomed views when clicked', async () => {
  const page = await browser!.newPage();
  try {
    const { dialog } = await openFirstPortfolioImage(page);
    const imageToggle = dialog.locator('.portfolio-dialog-image-toggle');

    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'false');
    await imageToggle.click();
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true');
    assert.equal(await imageToggle.getAttribute('aria-label'), 'Зургийг анхны хэмжээнд буцаах');

    await imageToggle.click();
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'false');
    assert.equal(await imageToggle.getAttribute('aria-label'), 'Зургийг томруулж харах');
  } finally {
    await page.close();
  }
});

test('keyboard users can pan a zoomed image without changing works', async () => {
  const page = await browser!.newPage();
  try {
    await openFirstPortfolioImage(page);
    const dialog = page.getByRole('dialog');
    const imageToggle = dialog.locator('.portfolio-dialog-image-toggle');
    const helpId = await imageToggle.getAttribute('aria-describedby');
    assert.ok(helpId, 'The image control should reference keyboard instructions.');
    assert.match(
      (await dialog.locator(`#${helpId}`).innerText()).trim(),
      /Shift.*суман товчоор.*Shift-гүй/,
      'Keyboard instructions should distinguish panning from image navigation.',
    );

    await imageToggle.focus();
    await page.keyboard.press('Enter');
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true');
    assert.match(await imageToggle.getAttribute('aria-keyshortcuts') ?? '', /Shift\+ArrowLeft.*Shift\+ArrowRight/);

    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    const pannedPosition = await imageToggle.evaluate((element) => ({
      left: element.scrollLeft,
      top: element.scrollTop,
    }));
    assert.ok(pannedPosition.left > 0 && pannedPosition.top > 0, 'Shift plus the arrow keys should pan right and down.');

    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowUp');
    const returnedPosition = await imageToggle.evaluate((element) => ({
      left: element.scrollLeft,
      top: element.scrollTop,
    }));
    assert.ok(
      returnedPosition.left < pannedPosition.left && returnedPosition.top < pannedPosition.top,
      'Shift plus the opposite arrow keys should pan left and up.',
    );
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true', 'Panning should not toggle the zoom.');

    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.portfolio-dialog-image')?.getAttribute('alt') === 'Дурсгалын медаль · Тусгай хайрцаг');
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'false', 'Unmodified arrows should keep navigating works.');

    await dialog.getByRole('button', { name: 'Зургийг хаах' }).click();
    await dialog.waitFor({ state: 'hidden' });
  } finally {
    await page.close();
  }
});

test('a zoomed image pans in every direction without blocking dialog controls', async () => {
  const page = await browser!.newPage();
  try {
    await openFirstPortfolioImage(page);
    const dialog = page.getByRole('dialog');
    const imageToggle = dialog.locator('.portfolio-dialog-image-toggle');
    await imageToggle.click();
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true');

    const bounds = await imageToggle.boundingBox();
    assert.ok(bounds, 'The image viewport should be visible.');
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 100, startY - 80, { steps: 5 });
    await page.mouse.up();

    assert.ok(
      await imageToggle.evaluate((element) => element.scrollLeft > 0 && element.scrollTop > 0),
      'Dragging left and up should reveal content in both scroll directions.',
    );
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true', 'Dragging should not toggle the zoom.');

    await dialog.getByRole('button', { name: 'Дараагийн бүтээл' }).click();
    await page.waitForFunction(() => document.querySelector('.portfolio-dialog-image-toggle')?.getAttribute('aria-pressed') === 'false');
    assert.equal(await dialog.locator('.portfolio-dialog-image').getAttribute('alt'), 'Дурсгалын медаль · Тусгай хайрцаг');

    await imageToggle.click();
    await dialog.getByRole('button', { name: 'Зургийг хаах' }).click();
    await dialog.waitFor({ state: 'hidden' });
  } finally {
    await page.close();
  }
});

test('a drag can leave the image viewport and still release cleanly', async () => {
  const page = await browser!.newPage();
  try {
    await openFirstPortfolioImage(page);
    const dialog = page.getByRole('dialog');
    const imageToggle = dialog.locator('.portfolio-dialog-image-toggle');
    await imageToggle.click();
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true');

    await imageToggle.evaluate((element) => {
      element.addEventListener('pointerdown', (event) => {
        (element as HTMLElement).dataset.lastPointerId = String(event.pointerId);
      }, { once: true });
    });
    const bounds = await imageToggle.boundingBox();
    assert.ok(bounds, 'The image viewport should be visible.');
    const startX = bounds.x + 5;
    const startY = bounds.y + 90;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const hasPointerCapture = await imageToggle.evaluate((element) => {
      const pointerId = Number((element as HTMLElement).dataset.lastPointerId);
      return element.hasPointerCapture(pointerId);
    });
    assert.equal(hasPointerCapture, true, 'The image viewport should capture the active drag pointer.');

    await page.mouse.move(bounds.x - 70, startY, { steps: 5 });
    assert.ok(
      await imageToggle.evaluate((element) => element.scrollLeft > 0),
      'Dragging beyond the image viewport edge should continue panning the captured image.',
    );
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true', 'Dragging should not toggle zoom.');
    await page.mouse.up();
    assert.equal(await imageToggle.evaluate((element) => element.classList.contains('is-dragging')), false);
    assert.equal(
      await imageToggle.evaluate((element) => {
        const pointerId = Number((element as HTMLElement).dataset.lastPointerId);
        return element.hasPointerCapture(pointerId);
      }),
      false,
      'The image viewport should release pointer capture when the drag ends.',
    );

    await imageToggle.click();
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'false', 'A later click should return the image to its fitted view.');
    await imageToggle.click();
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true', 'A later click should still zoom the image.');

    await dialog.getByRole('button', { name: 'Дараагийн бүтээл' }).click();
    await page.waitForFunction(() => document.querySelector('.portfolio-dialog-image-toggle')?.getAttribute('aria-pressed') === 'false');
    assert.equal(await dialog.locator('.portfolio-dialog-image').getAttribute('alt'), 'Дурсгалын медаль · Тусгай хайрцаг');
    await dialog.getByRole('button', { name: 'Зургийг хаах' }).click();
    await dialog.waitFor({ state: 'hidden' });
  } finally {
    await page.close();
  }
});

test('zoom stays scrollable on a phone and resets when changing images', async () => {
  const page = await browser!.newPage();
  try {
    await openFirstPortfolioImage(page);
    const dialog = page.getByRole('dialog');
    await page.setViewportSize({ width: 390, height: 844 });

    const imageToggle = dialog.locator('.portfolio-dialog-image-toggle');
    await imageToggle.click();
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true');

    const scrollableImageFitsDialog = await imageToggle.evaluate((element) => {
      const dialog = element.closest('.portfolio-dialog');
      const dialogBounds = dialog?.getBoundingClientRect();
      const imageBounds = element.getBoundingClientRect();

      return Boolean(
        dialogBounds
        && imageBounds.left >= dialogBounds.left
        && imageBounds.right <= dialogBounds.right
        && imageBounds.top >= dialogBounds.top
        && imageBounds.bottom <= dialogBounds.bottom
        && element.scrollWidth > element.clientWidth
        && element.scrollHeight > element.clientHeight,
      );
    });
    assert.equal(scrollableImageFitsDialog, true, 'Zoomed image should scroll inside the dialog without pushing it off-screen.');

    await dialog.getByRole('button', { name: 'Дараагийн бүтээл' }).click();
    await page.waitForFunction(() => document.querySelector('.portfolio-dialog-image-toggle')?.getAttribute('aria-pressed') === 'false');
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'false');
    assert.equal(await dialog.locator('.portfolio-dialog-image').getAttribute('alt'), 'Дурсгалын медаль · Тусгай хайрцаг');

    await imageToggle.click();
    await dialog.getByRole('button', { name: 'Зургийг хаах' }).click();
    await dialog.waitFor({ state: 'hidden' });
  } finally {
    await page.close();
  }
});

test('pinch zooms in and out on a phone while dialog controls stay usable', async () => {
  const page = await browser!.newPage();
  try {
    await openFirstPortfolioImage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = page.getByRole('dialog');
    const imageToggle = dialog.locator('.portfolio-dialog-image-toggle');

    const dispatchTouchPointer = async (type: string, pointerId: number, x: number, y: number) => {
      await imageToggle.evaluate((element, pointer) => {
        element.dispatchEvent(new PointerEvent(pointer.type, {
          bubbles: true,
          cancelable: true,
          pointerId: pointer.pointerId,
          pointerType: 'touch',
          clientX: pointer.x,
          clientY: pointer.y,
        }));
      }, { type, pointerId, x, y });
    };
    const pinch = async (endX: number) => {
      await dispatchTouchPointer('pointerdown', 1, 120, 220);
      await dispatchTouchPointer('pointerdown', 2, 220, 220);
      await dispatchTouchPointer('pointermove', 2, endX, 220);
      await dispatchTouchPointer('pointerup', 1, 120, 220);
      await dispatchTouchPointer('pointerup', 2, endX, 220);
    };

    await pinch(300);
    await page.waitForFunction(() => {
      const image = document.querySelector<HTMLImageElement>('.portfolio-dialog-image');
      return Number.parseFloat(image?.style.width ?? '0') > 100;
    });
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'true', 'Pinching apart should zoom in.');
    await dispatchTouchPointer('pointerdown', 3, 180, 260);
    await dispatchTouchPointer('pointermove', 3, 150, 260);
    await dispatchTouchPointer('pointerup', 3, 150, 260);
    assert.ok(
      await imageToggle.evaluate((element) => element.scrollLeft > 0 || element.scrollTop > 0),
      'A one-finger drag should move around the enlarged image.',
    );

    await pinch(130);
    await page.waitForFunction(() => document.querySelector('.portfolio-dialog-image-toggle')?.getAttribute('aria-pressed') === 'false');
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'false', 'Pinching together should return to the fitted image.');

    await pinch(300);
    await page.waitForFunction(() => Number.parseFloat(document.querySelector<HTMLImageElement>('.portfolio-dialog-image')?.style.width ?? '0') > 100);
    await dialog.getByRole('button', { name: 'Дараагийн бүтээл' }).click();
    await page.waitForFunction(() => document.querySelector('.portfolio-dialog-image-toggle')?.getAttribute('aria-pressed') === 'false');
    assert.equal(await imageToggle.getAttribute('aria-pressed'), 'false', 'Changing images should reset the zoom.');
    assert.equal(await dialog.locator('.portfolio-dialog-image').getAttribute('alt'), 'Дурсгалын медаль · Тусгай хайрцаг');

    await pinch(300);
    await page.waitForFunction(() => Number.parseFloat(document.querySelector<HTMLImageElement>('.portfolio-dialog-image')?.style.width ?? '0') > 100);
    await dialog.getByRole('button', { name: 'Зургийг хаах' }).click();
    await dialog.waitFor({ state: 'hidden' });
  } finally {
    await page.close();
  }
});

test('Escape closes the dialog and restores focus to its image button', async () => {
  const page = await browser!.newPage();
  try {
    const { trigger, dialog } = await openFirstPortfolioImage(page);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });

    assert.equal(
      await trigger.evaluate((element) => document.activeElement === element),
      true,
      'Focus should return to the image button that opened the dialog.',
    );
  } finally {
    await page.close();
  }
});

test('close button closes the dialog and restores focus to its image button', async () => {
  const page = await browser!.newPage();
  try {
    const { trigger, dialog } = await openFirstPortfolioImage(page);
    await dialog.getByRole('button', { name: 'Зургийг хаах' }).click();
    await dialog.waitFor({ state: 'hidden' });

    assert.equal(
      await trigger.evaluate((element) => document.activeElement === element),
      true,
      'Focus should return to the image button that opened the dialog.',
    );
  } finally {
    await page.close();
  }
});

test('clicking outside the dialog closes it', async () => {
  const page = await browser!.newPage();
  try {
    const { trigger, dialog } = await openFirstPortfolioImage(page);
    await page.locator('.portfolio-dialog-backdrop').click({ position: { x: 5, y: 5 } });
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await trigger.isVisible(), true, 'The portfolio image button should remain available after closing.');
  } finally {
    await page.close();
  }
});

test('a shared portfolio work link opens and copies the matching example', async () => {
  const page = await browser!.newPage();
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${baseUrl}/portfolio?work=portfolio-pendant-01.webp`, { waitUntil: 'networkidle' });

    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    assert.match(await page.locator('#portfolio-dialog-title').innerText(), /Гэр бүлийн зурагтай ган зүүлт/);
    assert.equal(new URL(page.url()).searchParams.get('work'), 'portfolio-pendant-01.webp');

    await page.getByTestId('button-copy-portfolio-work-link').click();
    await page.locator('.portfolio-dialog-share-status').getByText('Энэ бүтээлийн холбоосыг хууллаа.').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());

    await page.getByRole('button', { name: 'Зургийг хаах' }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(new URL(page.url()).searchParams.has('work'), false);
  } finally {
    await page.close();
  }
});

test('native share sends the selected work URL and reopens that example', async () => {
  const page = await browser!.newPage();
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: ShareData) => {
          localStorage.setItem('sharedPortfolioWorkPayload', JSON.stringify(data));
          return Promise.resolve();
        },
      });
    });
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });
    const { title } = await openFirstPortfolioImage(page);

    await page.getByTestId('button-share-portfolio-work-link').click();
    await page.getByRole('status').getByText('Энэ бүтээлийн холбоосыг хуваалцах цонхонд нээлээ.').waitFor();

    const payload = await page.evaluate(() => JSON.parse(localStorage.getItem('sharedPortfolioWorkPayload') ?? 'null'));
    const sharedUrl = new URL(payload.url);
    assert.equal(payload.title, title);
    assert.equal(payload.text, title);
    assert.equal(sharedUrl.searchParams.get('work'), new URL(page.url()).searchParams.get('work'));

    await page.goto(payload.url, { waitUntil: 'networkidle' });
    const sharedDialog = page.getByRole('dialog');
    await sharedDialog.waitFor({ state: 'visible' });
    assert.equal(await page.locator('#portfolio-dialog-title').innerText(), title);
  } finally {
    await page.close();
  }
});

test('native share failures leave the individual work copy action usable', async () => {
  const page = await browser!.newPage();
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(new Error('Share sheet failed')),
      });
    });
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });
    const { dialog } = await openFirstPortfolioImage(page);

    await page.getByTestId('button-share-portfolio-work-link').click();
    await dialog.getByRole('status').getByText('Хуваалцаж чадсангүй. Холбоос хуулах товчийг ашиглана уу.').waitFor();
    await page.getByTestId('button-copy-portfolio-work-link').click();
    await dialog.getByRole('status').getByText('Энэ бүтээлийн холбоосыг хууллаа.').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());
  } finally {
    await page.close();
  }
});

test('unsupported native sharing leaves the individual work copy action usable', async () => {
  const page = await browser!.newPage();
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    });
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });
    const { dialog } = await openFirstPortfolioImage(page);

    await page.getByTestId('button-share-portfolio-work-link').click();
    await dialog.getByRole('status').getByText('Таны хөтөч холбоос хуваалцах боломжгүй. Холбоос хуулах товчийг ашиглана уу.').waitFor();
    await page.getByTestId('button-copy-portfolio-work-link').click();
    await dialog.getByRole('status').getByText('Энэ бүтээлийн холбоосыг хууллаа.').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());
  } finally {
    await page.close();
  }
});

test('an invalid work link does not open a broken dialog', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio?work=not-a-real-image.jpg`, { waitUntil: 'networkidle' });

    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.waitForFunction(() => !new URL(window.location.href).searchParams.has('work'));
    assert.ok(await page.locator('.work-card').count() > 0);
  } finally {
    await page.close();
  }
});

test('copy action shares the selected print category URL', async () => {
  const page = await browser!.newPage();
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${baseUrl}/portfolio?category=uv`, { waitUntil: 'networkidle' });

    const uvFilter = page.getByRole('button', { name: 'UV', exact: true });
    assert.equal(await uvFilter.getAttribute('aria-pressed'), 'true');

    await page.getByRole('button', { name: 'DTF', exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get('category'), 'dtf');
    await page.getByTestId('button-copy-portfolio-category-link').click();
    await page.getByRole('status').getByText('Сонгосон ангиллын холбоосыг хууллаа.').waitFor();

    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());
  } finally {
    await page.close();
  }
});

test('native share sends the selected category URL and restores that category when opened', async () => {
  const page = await browser!.newPage();
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: ShareData) => {
          localStorage.setItem('sharedPortfolioPayload', JSON.stringify(data));
          return Promise.resolve();
        },
      });
    });
    await page.goto(`${baseUrl}/portfolio?category=uv`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'DTF', exact: true }).click();
    await page.getByTestId('button-share-portfolio-category-link').click();
    await page.getByRole('status').getByText('Ангиллын холбоосыг хуваалцах цонхонд нээлээ.').waitFor();

    const payload = await page.evaluate(() => JSON.parse(localStorage.getItem('sharedPortfolioPayload') ?? 'null'));
    assert.equal(payload.url, page.url());
    assert.match(payload.text, /DTF/);

    await page.goto(payload.url, { waitUntil: 'networkidle' });
    await assertPortfolioCategory(page, 'dtf');
  } finally {
    await page.close();
  }
});

test('native share describes the current search and preserves its category URL', async () => {
  const page = await browser!.newPage();
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: ShareData) => {
          localStorage.setItem('sharedPortfolioPayload', JSON.stringify(data));
          return Promise.resolve();
        },
      });
    });
    await page.goto(`${baseUrl}/portfolio?category=uv&search=%D1%82%D0%B5%D1%80%D0%BC%D0%BE%D1%81`, { waitUntil: 'networkidle' });
    assert.equal(await page.getByTestId('input-search-portfolio').inputValue(), 'термос');
    assert.equal(new URL(page.url()).searchParams.get('category'), 'uv');
    assert.equal(new URL(page.url()).searchParams.get('search'), 'термос');

    await page.getByTestId('button-share-portfolio-category-link').click();
    await page.getByRole('status').getByText('Ангиллын холбоосыг хуваалцах цонхонд нээлээ.').waitFor();

    const payload = await page.evaluate(() => JSON.parse(localStorage.getItem('sharedPortfolioPayload') ?? 'null'));
    const sharedUrl = new URL(payload.url);
    assert.equal(sharedUrl.searchParams.get('category'), 'uv');
    assert.equal(sharedUrl.searchParams.get('search'), 'термос');
    assert.match(payload.text, /термос/);
  } finally {
    await page.close();
  }
});

test('cancelled native sharing leaves the copy action usable without an error', async () => {
  const page = await browser!.newPage();
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(new DOMException('Share cancelled', 'AbortError')),
      });
    });
    await page.goto(`${baseUrl}/portfolio?category=laser`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-share-portfolio-category-link').click();
    await page.waitForFunction(() => document.querySelector('.portfolio-copy-status')?.textContent === '');

    await page.getByTestId('button-copy-portfolio-category-link').click();
    await page.getByRole('status').getByText('Сонгосон ангиллын холбоосыг хууллаа.').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());
  } finally {
    await page.close();
  }
});

test('failed native sharing explains the failure and leaves the copy action usable', async () => {
  const page = await browser!.newPage();
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(new Error('Share sheet failed')),
      });
    });
    await page.goto(`${baseUrl}/portfolio?category=laser`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-share-portfolio-category-link').click();
    await page.getByRole('status').getByText('Хуваалцаж чадсангүй. Холбоос хуулах товчийг ашиглана уу.').waitFor();

    await page.getByTestId('button-copy-portfolio-category-link').click();
    await page.getByRole('status').getByText('Сонгосон ангиллын холбоосыг хууллаа.').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());
  } finally {
    await page.close();
  }
});

test('unsupported native sharing explains that copying is available', async () => {
  const page = await browser!.newPage();
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    });
    await page.goto(`${baseUrl}/portfolio?category=uv`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-share-portfolio-category-link').click();
    await page.getByRole('status').getByText('Таны хөтөч холбоос хуваалцах боломжгүй. Холбоос хуулах товчийг ашиглана уу.').waitFor();

    await page.getByTestId('button-copy-portfolio-category-link').click();
    await page.getByRole('status').getByText('Сонгосон ангиллын холбоосыг хууллаа.').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());
  } finally {
    await page.close();
  }
});

test('category filters follow browser Back and Forward navigation', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });
    await assertPortfolioCategory(page, 'all');

    await page.getByRole('button', { name: 'Лазер', exact: true }).click();
    await assertPortfolioCategory(page, 'laser');
    await page.getByRole('button', { name: 'UV', exact: true }).click();
    await assertPortfolioCategory(page, 'uv');
    await page.getByRole('button', { name: 'DTF', exact: true }).click();
    await assertPortfolioCategory(page, 'dtf');

    await page.goBack();
    await assertPortfolioCategory(page, 'uv');
    await page.goBack();
    await assertPortfolioCategory(page, 'laser');
    await page.goBack();
    await assertPortfolioCategory(page, 'all');

    await page.goForward();
    await assertPortfolioCategory(page, 'laser');
    await page.goForward();
    await assertPortfolioCategory(page, 'uv');
    await page.goForward();
    await assertPortfolioCategory(page, 'dtf');
  } finally {
    await page.close();
  }
});

test('a selected category and its examples survive a page refresh', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio?category=uv`, { waitUntil: 'networkidle' });
    await assertPortfolioCategory(page, 'uv');

    await page.reload({ waitUntil: 'networkidle' });
    await assertPortfolioCategory(page, 'uv');
  } finally {
    await page.close();
  }
});

test('a selected category and its examples return after visiting another page', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'DTF', exact: true }).click();
    await assertPortfolioCategory(page, 'dtf');

    await page.getByRole('navigation', { name: 'Үндсэн цэс' }).getByRole('link', { name: 'Үйлчилгээ', exact: true }).click();
    await page.waitForURL('**/services');
    assert.equal(new URL(page.url()).pathname, '/services');

    await page.goBack();
    await assertPortfolioCategory(page, 'dtf');
  } finally {
    await page.close();
  }
});

test('an unknown category URL shows all work and stays normalized after refresh', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio?category=not-a-category`, { waitUntil: 'networkidle' });
    await assertPortfolioCategory(page, 'all');

    await page.reload({ waitUntil: 'networkidle' });
    await assertPortfolioCategory(page, 'all');
  } finally {
    await page.close();
  }
});

test('clipboard failure reveals a selectable category URL until the portfolio URL changes', async () => {
  const page = await browser!.newPage({ viewport: { width: 320, height: 740 } });
  try {
    await page.addInitScript(() => {
      (window as Window & { clipboardBlocked?: boolean }).clipboardBlocked = true;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: () => (window as Window & { clipboardBlocked?: boolean }).clipboardBlocked
            ? Promise.reject(new Error('Clipboard unavailable'))
            : Promise.resolve(),
        },
      });
    });
    await page.goto(`${baseUrl}/portfolio?category=laser`, { waitUntil: 'networkidle' });
    await page.getByTestId('button-copy-portfolio-category-link').click();
    await page.getByRole('status').getByText('Холбоос хуулж чадсангүй. Доорх холбоосыг сонгон хуулна уу.').waitFor();

    const manualLink = page.getByTestId('input-manual-portfolio-category-link');
    await manualLink.waitFor({ state: 'visible' });
    assert.equal(await manualLink.getAttribute('readonly'), '');
    assert.equal(await manualLink.inputValue(), page.url());
    const manualLinkBounds = await manualLink.boundingBox();
    assert.ok(manualLinkBounds, 'The manual URL should be visible on a narrow screen.');
    assert.ok(manualLinkBounds.x >= 0 && manualLinkBounds.x + manualLinkBounds.width <= 320);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'The manual URL should not create horizontal page overflow.',
    );
    await manualLink.focus();
    assert.deepEqual(
      await manualLink.evaluate((element) => {
        const input = element as HTMLInputElement;
        return { start: input.selectionStart, end: input.selectionEnd, valueLength: input.value.length };
      }),
      { start: 0, end: page.url().length, valueLength: page.url().length },
      'Focusing the URL should select all of it for manual copying.',
    );

    await page.evaluate(() => {
      (window as Window & { clipboardBlocked?: boolean }).clipboardBlocked = false;
    });
    await page.getByTestId('button-copy-portfolio-category-link').click();
    await page.getByText('Сонгосон ангиллын холбоосыг хууллаа.').waitFor({ state: 'visible' });
    await manualLink.waitFor({ state: 'hidden' });

    await page.evaluate(() => {
      (window as Window & { clipboardBlocked?: boolean }).clipboardBlocked = true;
    });
    await page.getByTestId('button-copy-portfolio-category-link').click();
    await manualLink.waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'UV', exact: true }).click();
    await assertPortfolioCategory(page, 'uv');
    await manualLink.waitFor({ state: 'hidden' });

    await page.getByTestId('button-copy-portfolio-category-link').click();
    await manualLink.waitFor({ state: 'visible' });
    await page.getByTestId('input-search-portfolio').fill('термос');
    await manualLink.waitFor({ state: 'hidden' });
    assert.equal(new URL(page.url()).searchParams.get('search'), 'термос');

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    });
    await page.getByTestId('button-copy-portfolio-category-link').click();
    await manualLink.waitFor({ state: 'visible' });
    assert.equal(await manualLink.inputValue(), page.url());
    await page.getByRole('button', { name: 'Бүгд', exact: true }).click();
    await manualLink.waitFor({ state: 'hidden' });
  } finally {
    await page.close();
  }
});

test('keyword search combines with the selected category and announces when there are no matches', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio?category=laser`, { waitUntil: 'networkidle' });
    const search = page.getByTestId('input-search-portfolio');

    await search.fill('зоос');
    assert.equal(await page.locator('.work-card').count(), 2);
    assert.equal(await page.locator('.portfolio-result-count').innerText(), '2 бүтээл');

    await page.getByRole('button', { name: 'UV', exact: true }).click();
    assert.equal(await page.locator('.work-card').count(), 0);
    await page.getByTestId('status-portfolio-no-results').waitFor({ state: 'visible' });
    assert.match(
      await page.getByTestId('status-portfolio-no-results').innerText(),
      /тохирох бүтээл олдсонгүй/,
    );
  } finally {
    await page.close();
  }
});

test('the live result count updates for search and clearing within a print category', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio?category=laser`, { waitUntil: 'networkidle' });
    const laserFilter = page.getByRole('button', { name: 'Лазер', exact: true });
    const search = page.getByTestId('input-search-portfolio');
    const resultCount = page.locator('.portfolio-result-count');

    assert.equal(await resultCount.getAttribute('role'), 'status');
    assert.equal(await resultCount.getAttribute('aria-live'), 'polite');
    assert.equal(await resultCount.getAttribute('aria-atomic'), 'true');
    assert.equal(await laserFilter.getAttribute('aria-pressed'), 'true');
    await search.fill('зоос');

    assert.equal(await new URL(page.url()).searchParams.get('category'), 'laser');
    assert.equal(await laserFilter.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.work-card').count(), 2);
    await page.waitForFunction(() => document.querySelector('.portfolio-result-count')?.textContent === '2 бүтээл');
    assert.equal(await resultCount.innerText(), '2 бүтээл');

    await search.fill('');

    await assertPortfolioCategory(page, 'laser');
    const laserWorkCount = await page.evaluate(async () => {
      const { filterPortfolioWork } = await import('/src/portfolio-data.ts');
      return filterPortfolioWork('laser').length;
    });
    await page.waitForFunction((count) => document.querySelector('.portfolio-result-count')?.textContent === `${count} бүтээл`, laserWorkCount);
    assert.equal(await page.locator('.work-card').count(), laserWorkCount);
    assert.equal(await resultCount.innerText(), `${laserWorkCount} бүтээл`);
    assert.equal(await laserFilter.getAttribute('aria-pressed'), 'true');
  } finally {
    await page.close();
  }
});

test('material filtering combines with print methods, restores from links, and clears cleanly', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });
    const materialFilter = page.getByTestId('select-portfolio-material');

    await materialFilter.selectOption('steel');
    assert.equal(new URL(page.url()).searchParams.get('material'), 'steel');
    assert.ok(await page.locator('.work-card').count() > 0);
    const steelWorkCount = await page.evaluate(async () => {
      const { filterPortfolioWork } = await import('/src/portfolio-data.ts');
      return filterPortfolioWork('all', '', 'steel').length;
    });
    assert.equal(await page.locator('.work-card').count(), steelWorkCount);
    assert.ok(await page.locator('.work-card').first().locator('.portfolio-material-tags').innerText().then((text) => text.includes('Ган')));

    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await materialFilter.inputValue(), 'steel');
    assert.equal(await page.locator('.work-card').count(), steelWorkCount);

    await page.getByRole('button', { name: 'Лазер', exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get('category'), 'laser');
    assert.equal(new URL(page.url()).searchParams.get('material'), 'steel');
    const laserSteelCount = await page.evaluate(async () => {
      const { filterPortfolioWork } = await import('/src/portfolio-data.ts');
      return filterPortfolioWork('laser', '', 'steel').length;
    });
    assert.equal(await page.locator('.work-card').count(), laserSteelCount);

    await materialFilter.selectOption('all');
    assert.equal(new URL(page.url()).searchParams.get('category'), 'laser');
    assert.equal(new URL(page.url()).searchParams.has('material'), false);
    const laserCount = await page.evaluate(async () => {
      const { filterPortfolioWork } = await import('/src/portfolio-data.ts');
      return filterPortfolioWork('laser').length;
    });
    assert.equal(await page.locator('.work-card').count(), laserCount);
  } finally {
    await page.close();
  }
});

test('choosing a material suggestion fills search and preserves the selected category', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio?category=laser`, { waitUntil: 'networkidle' });
    const suggestion = page.getByTestId('button-portfolio-search-suggestion-ган');

    await suggestion.click();

    assert.equal(await page.getByTestId('input-search-portfolio').inputValue(), 'ган');
    assert.equal(new URL(page.url()).searchParams.get('search'), 'ган');
    assert.equal(new URL(page.url()).searchParams.get('category'), 'laser');
    assert.ok(await page.locator('.work-card').count() > 0);
    assert.equal(await page.locator('.portfolio-filters button[aria-pressed="true"]').innerText(), 'Лазер');
  } finally {
    await page.close();
  }
});

test('portfolio controls stay usable without horizontal overflow on a narrow screen', async () => {
  const page = await browser!.newPage({ viewport: { width: 320, height: 740 } });
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });
    });
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });

    const toolbar = page.locator('.portfolio-toolbar');
    assert.ok(
      await toolbar.evaluate((element) => element.scrollWidth <= element.clientWidth),
      'The portfolio toolbar should not overflow horizontally.',
    );
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'The page should not require horizontal scrolling at 320px.',
    );
    for (const control of await toolbar.locator('button, input').all()) {
      const bounds = await control.boundingBox();
      assert.ok(bounds, 'Every toolbar control should be rendered.');
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320, 'Every toolbar control should fit in the viewport.');
    }

    await page.getByRole('button', { name: 'UV', exact: true }).click();
    await assertPortfolioCategory(page, 'uv');
    await page.getByTestId('input-search-portfolio').fill('термос');
    assert.equal(await page.locator('.portfolio-result-count').innerText(), '1 бүтээл');
    await page.getByTestId('button-copy-portfolio-category-link').click();
    await page.getByText('Сонгосон ангиллын холбоосыг хууллаа.').waitFor({ state: 'visible' });
  } finally {
    await page.close();
  }
});

test('portfolio controls stay usable at a 200% zoom-equivalent width', async () => {
  const page = await browser!.newPage({ viewport: { width: 640, height: 900 } });
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            localStorage.setItem('copiedPortfolioUrl', text);
            return Promise.resolve();
          },
        },
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: ShareData) => {
          localStorage.setItem('sharedPortfolioPayload', JSON.stringify(data));
          return Promise.resolve();
        },
      });
    });
    await page.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' });

    const assertNoHorizontalOverflow = async () => {
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        'The page should not require horizontal scrolling at a 200% zoom-equivalent width.',
      );
    };
    const assertVisibleWithinViewport = async (control: ReturnType<Page['locator']>, label: string) => {
      await control.scrollIntoViewIfNeeded();
      const bounds = await control.boundingBox();
      assert.ok(bounds, `${label} should be rendered.`);
      assert.ok(
        bounds.x >= 0 && bounds.x + bounds.width <= 640
          && bounds.y >= 0 && bounds.y + bounds.height <= 900,
        `${label} should fit within the viewport.`,
      );
    };

    await assertNoHorizontalOverflow();
    const toolbar = page.locator('.portfolio-toolbar');
    for (const [index, control] of (await toolbar.locator('button, input').all()).entries()) {
      await assertVisibleWithinViewport(control, `Portfolio toolbar control ${index + 1}`);
    }
    assert.ok(
      await toolbar.evaluate((element) => element.scrollWidth <= element.clientWidth),
      'The portfolio toolbar should not overflow horizontally.',
    );

    await page.getByRole('button', { name: 'UV', exact: true }).click();
    await assertPortfolioCategory(page, 'uv');
    const search = page.getByTestId('input-search-portfolio');
    await search.fill('термос');
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get('search') === 'термос');
    assert.equal(await search.inputValue(), 'термос');
    await page.getByTestId('button-copy-portfolio-category-link').click();
    await page.getByRole('status').getByText('Сонгосон ангиллын холбоосыг хууллаа.').waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('copiedPortfolioUrl')),
      page.url(),
      'The copy control should copy the current category and search URL.',
    );

    await page.getByTestId('button-share-portfolio-category-link').click();
    await page.getByRole('status').getByText('Ангиллын холбоосыг хуваалцах цонхонд нээлээ.').waitFor();
    const sharePayload = await page.evaluate(() => JSON.parse(localStorage.getItem('sharedPortfolioPayload') ?? 'null'));
    assert.equal(sharePayload.url, page.url(), 'The share control should share the current results URL.');
    await assertNoHorizontalOverflow();

    await search.fill('');
    await page.waitForFunction(() => !new URL(window.location.href).searchParams.has('search'));
    const firstWorkImage = page.locator('.work-card-image').first();
    await firstWorkImage.scrollIntoViewIfNeeded();
    await firstWorkImage.click();

    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    const copyWorkLink = page.getByTestId('button-copy-portfolio-work-link');
    await assertVisibleWithinViewport(copyWorkLink, 'The dialog copy control');
    assert.ok(
      await dialog.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= window.innerWidth;
      }),
      'The image dialog should fit within the viewport.',
    );
    await copyWorkLink.click();
    await dialog.getByRole('status').getByText('Энэ бүтээлийн холбоосыг хууллаа.').waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('copiedPortfolioUrl')),
      page.url(),
      'The dialog copy control should copy the open work URL.',
    );
    await assertNoHorizontalOverflow();
  } finally {
    await page.close();
  }
});

test('empty category return button stays visible and works on a narrow screen', async () => {
  const page = await browser!.newPage({ viewport: { width: 320, height: 740 } });
  try {
    await page.goto(`${baseUrl}/portfolio?category=dtf`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const { PORTFOLIO_WORK } = await import('/src/portfolio-data.ts');
      PORTFOLIO_WORK.splice(
        0,
        PORTFOLIO_WORK.length,
        ...PORTFOLIO_WORK.filter((item) => item.category !== 'dtf'),
      );
    });
    await page.getByRole('button', { name: 'Лазер', exact: true }).click();
    await page.getByRole('button', { name: 'DTF', exact: true }).click();

    const returnButton = page.getByTestId('button-reset-portfolio-category');
    await returnButton.waitFor({ state: 'visible' });
    const bounds = await returnButton.boundingBox();
    assert.ok(bounds, 'The return button should be rendered.');
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320, 'The return button should fit in the viewport.');
    await returnButton.click();
    assert.equal(new URL(page.url()).searchParams.has('category'), false);
    assert.equal(await page.getByRole('button', { name: 'Бүгд', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('.work-card').count() > 0);
  } finally {
    await page.close();
  }
});

test('empty category explanation and return button fit a short landscape viewport', async () => {
  const page = await browser!.newPage({ viewport: { width: 640, height: 320 } });
  try {
    await page.goto(`${baseUrl}/portfolio?category=dtf`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const { PORTFOLIO_WORK } = await import('/src/portfolio-data.ts');
      PORTFOLIO_WORK.splice(
        0,
        PORTFOLIO_WORK.length,
        ...PORTFOLIO_WORK.filter((item) => item.category !== 'dtf'),
      );
    });
    await page.getByRole('button', { name: 'Лазер', exact: true }).click();
    await page.getByRole('button', { name: 'DTF', exact: true }).click();

    const emptyState = page.getByTestId('status-portfolio-empty-category');
    const explanation = emptyState.getByRole('status');
    const returnButton = page.getByTestId('button-reset-portfolio-category');
    await emptyState.scrollIntoViewIfNeeded();
    await explanation.waitFor({ state: 'visible' });
    await returnButton.waitFor({ state: 'visible' });

    for (const [element, label] of [
      [explanation, 'The empty-category explanation'],
      [returnButton, 'The return button'],
    ] as const) {
      const bounds = await element.boundingBox();
      assert.ok(bounds, `${label} should be rendered.`);
      assert.ok(
        bounds.x >= 0 &&
          bounds.x + bounds.width <= 640 &&
          bounds.y >= 0 &&
          bounds.y + bounds.height <= 320,
        `${label} should fit within the short landscape viewport.`,
      );
    }

    assert.match(await explanation.innerText(), /энэ ангилалд одоогоор жишээ бүтээл алга байна/i);
    await returnButton.click();
    assert.equal(new URL(page.url()).searchParams.has('category'), false);
    assert.equal(await page.getByRole('button', { name: 'Бүгд', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('.work-card').count() > 0);
  } finally {
    await page.close();
  }
});

test('an empty print category explains the result and returns visitors to all work', async () => {
  const page = await browser!.newPage();
  try {
    await page.goto(`${baseUrl}/portfolio?category=dtf`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const { PORTFOLIO_WORK } = await import('/src/portfolio-data.ts');
      PORTFOLIO_WORK.splice(
        0,
        PORTFOLIO_WORK.length,
        ...PORTFOLIO_WORK.filter((item) => item.category !== 'dtf'),
      );
    });
    await page.getByRole('button', { name: 'Лазер', exact: true }).click();
    await page.getByRole('button', { name: 'DTF', exact: true }).click();

    const emptyState = page.getByTestId('status-portfolio-empty-category');
    await emptyState.waitFor({ state: 'visible' });
    assert.match(await emptyState.innerText(), /энэ ангилалд одоогоор жишээ бүтээл алга байна/i);

    await page.getByTestId('button-reset-portfolio-category').click();
    assert.equal(new URL(page.url()).searchParams.has('category'), false);
    assert.equal(await page.getByRole('button', { name: 'Бүгд', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('.work-card').count() > 0);
  } finally {
    await page.close();
  }
});
