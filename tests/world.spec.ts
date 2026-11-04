import { test, expect, type Page } from '@playwright/test';
import type { Manifest, FrameMeta } from '../packages/shared/schema';
import { worldFromTile } from '../packages/shared/iso';
async function ready(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await expect(page.locator('.world-host canvas')).toBeVisible();
  await expect(page.locator('.world-error')).toHaveCount(0);
}
test('world loads, search opens draft cards, deep links survive reload and motion toggles', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByLabel('Find a person or a story…').fill('sina');
  await page.getByRole('button', { name: /Ibn Sina/ }).click();
  await expect(page.locator('.story-card')).toContainText('DRAFT');
  await expect(page).toHaveURL(/\/c\/ibn-sina/);
  await page.reload();
  await expect(page.locator('.story-card')).toContainText('Ibn Sina');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await page.getByLabel('Resume animation').click();
  await expect(page.getByLabel('Pause animation')).toBeVisible();
  await page.getByLabel('Pause animation').click();
  await page.screenshot({ path: '.playwright/story.png' });
  expect(errors).toEqual([]);
});
test('pixel mask ignores transparent space and clicking an opaque pixel opens only the named card', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page, '/c/al-khwarizmi');
  await expect(page.locator('.story-card')).toBeVisible();
  await page.locator('.card-close').click();
  await page.waitForTimeout(1100);
  const manifest: Manifest = await page.request
    .get('/world/world.json')
    .then((r) => r.json());
  const c = manifest.characters.find((c) => c.id === 'al-khwarizmi')!;
  const step = c.script[0],
    name = c.frames[`${step.action}_${step.facing}`][0];
  const atlas = (await page.request
    .get('/world/atlas-0.json')
    .then((r) => r.json())) as { frames: Record<string, FrameMeta> };
  const m = atlas.frames[name],
    mask = Buffer.from(m.hitMask, 'base64');
  const canvas = await page.locator('.world-host canvas').boundingBox();
  const cam = new URL(page.url()).searchParams;
  const x = Number(cam.get('x')),
    y = Number(cam.get('y')),
    z = Number(cam.get('z'));
  const pos = worldFromTile(...step.at!);
  const left = canvas!.x + canvas!.width / 2 + (pos[0] - x - m.anchor[0]) * z,
    top = canvas!.y + canvas!.height / 2 + (pos[1] - y - m.anchor[1]) * z;
  let opaque = 0,
    transparent = 0;
  for (let i = 0; i < m.frame.w * m.frame.h; i++) {
    if (mask[i >> 3] & (1 << (i % 8))) opaque = i;
    else if (i % m.frame.w === 0) transparent = i;
  }
  await page.mouse.click(
    left + ((transparent % m.frame.w) + 0.5) * z,
    top + (Math.floor(transparent / m.frame.w) + 0.5) * z,
  );
  await expect(page.locator('.story-card')).toHaveCount(0);
  await page.mouse.move(
    left + ((opaque % m.frame.w) + 0.5) * z,
    top + (Math.floor(opaque / m.frame.w) + 0.5) * z,
  );
  await page.mouse.click(
    left + ((opaque % m.frame.w) + 0.5) * z,
    top + (Math.floor(opaque / m.frame.w) + 0.5) * z,
  );
  await expect(page.locator('.story-card')).toContainText('Al-Khwarizmi');
  expect(errors).toEqual([]);
});
test('pan, zoom, overview LOD, inspector and minimap operate without runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  if (await page.getByLabel('Hide introduction').isVisible())
    await page.getByLabel('Hide introduction').click();
  const before = page.url();
  await page.mouse.move(650, 600);
  await page.mouse.down();
  await page.mouse.move(800, 650, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => page.url(), { timeout: 15000 }).not.toBe(before);
  await page.keyboard.press('i');
  await expect(page.locator('.inspector-panel')).toBeVisible();
  for (let i = 0; i < 5; i++)
    await page.getByLabel('Zoom out', { exact: true }).click();
  await expect(page.locator('.zoom-controls')).toContainText('13');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.playwright/overview.png' });
  await page.getByLabel('Return to the garden').click();
  await page.waitForTimeout(1000);
  await page.locator('.minimap').click({ position: { x: 90, y: 65 } });
  await page.waitForTimeout(700);
  await page.keyboard.press('i');
  expect(errors).toEqual([]);
});
test('Arabic mirrors layout, Bangla works, list and about are accessible HTML', async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel('Language').selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const map = await page.locator('.minimap-card').boundingBox();
  expect(map!.x).toBeLessThan(300);
  await page.screenshot({ path: '.playwright/arabic.png' });
  await page.getByLabel('اللغة').selectOption('bn');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await page.goto('/list');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'বাগানের মানুষ',
  );
  await expect(page.locator('.people-list>a')).toHaveCount(3);
  await page.goto('/about');
  await expect(page.locator('.rules-list>li')).toHaveCount(7);
});
test('Character Lab renders all actions/facings and provides JSON', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/lab');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(1500);
  await page
    .getByRole('combobox', { name: 'Action', exact: true })
    .selectOption('pray');
  await page
    .getByRole('combobox', { name: 'Facing', exact: true })
    .selectOption('NW');
  await page.getByLabel('Hit mask', { exact: true }).check();
  await page.getByRole('button', { name: 'Next frame', exact: true }).click();
  await expect(page.locator('pre')).toContainText('scholar-robe');
  await page.screenshot({ path: '.playwright/lab.png' });
  await page
    .getByRole('combobox', { name: 'Base', exact: true })
    .selectOption('cat');
  await expect(
    page.getByRole('combobox', { name: 'Action', exact: true }),
  ).toHaveValue('cat_idle');
  expect(errors).toEqual([]);
});
test('mobile touch layout opens the story bottom sheet and supports zoom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByLabel('Find a person or a story…').click();
  await page.getByLabel('Find a person or a story…').fill('Fatima');
  await page.getByRole('button', { name: /Fatima al-Fihri/ }).click();
  await expect(page.locator('.story-card')).toContainText('Fatima al-Fihri');
  const box = await page.locator('.story-card').boundingBox();
  expect(box!.width).toBeGreaterThan(370);
  await page.screenshot({ path: '.playwright/mobile.png' });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
});

test('touch pinch changes zoom toward the pinch centre', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await ready(page);
  if (await page.getByLabel('Hide introduction').isVisible())
    await page.getByLabel('Hide introduction').click();
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 160, y: 530 },
      { x: 220, y: 530 },
    ],
  });
  for (let i = 1; i <= 5; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: 160 - i * 10, y: 530 },
        { x: 220 + i * 10, y: 530 },
      ],
    });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect
    .poll(async () =>
      Number(
        (await page.locator('.zoom-controls>span').first().innerText()).replace(
          '%',
          '',
        ),
      ),
    )
    .toBeGreaterThan(100);
  await context.close();
});

test('initial asset loading preserves a character deep link before an immediate reload', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = 0;
  await page.route('**/world/chunk-*.webp', async (route) => {
    requested++;
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/c/ibn-sina');
    await expect.poll(() => requested, { timeout: 20000 }).toBeGreaterThan(0);
    await page.waitForTimeout(450);
    expect(new URL(page.url()).pathname).toBe('/c/ibn-sina');
  } finally {
    release();
  }
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await expect(page.locator('.story-card')).toContainText('Ibn Sina');
  expect(new URL(page.url()).pathname).toBe('/c/ibn-sina');
  await page.reload();
  await expect(page.locator('.story-card')).toContainText('Ibn Sina');
});
