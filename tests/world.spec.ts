import { test, expect, type Page } from '@playwright/test';
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
  // On the planet the sprite is rotated and scaled, so ask the dev engine
  // for screen points over an opaque pixel and over transparent space.
  const points = await page.evaluate(() =>
    (
      window as unknown as {
        __darEngine: {
          debugPoints(id: string): {
            opaque: { x: number; y: number };
            transparent: { x: number; y: number };
          } | null;
        };
      }
    ).__darEngine.debugPoints('al-khwarizmi'),
  );
  expect(points?.opaque && points.transparent).toBeTruthy();
  const canvas = await page.locator('.world-host canvas').boundingBox();
  await page.mouse.click(
    canvas!.x + points!.transparent.x,
    canvas!.y + points!.transparent.y,
  );
  await expect(page.locator('.story-card')).toHaveCount(0);
  await page.mouse.move(
    canvas!.x + points!.opaque.x,
    canvas!.y + points!.opaque.y,
  );
  await expect(page.locator('.hover-label')).toContainText('Al-Khwarizmi');
  await page.mouse.click(
    canvas!.x + points!.opaque.x,
    canvas!.y + points!.opaque.y,
  );
  await expect(page.locator('.story-card')).toContainText('Al-Khwarizmi');
  expect(errors).toEqual([]);
});
test("clicking a listener lights up Mufti Menk's whole talk and opens his card; hovering stays normal", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Straight to the hall, over the talk (Floor796-style scene highlight).
  await ready(page, '/?x=2048&y=1640&z=2');
  const points = await page.evaluate(() =>
    (
      window as unknown as {
        __darEngine: {
          debugPoints(id: string): {
            opaque: { x: number; y: number };
          } | null;
        };
      }
    ).__darEngine.debugPoints('menk-speech-listener-2'),
  );
  expect(points?.opaque).toBeTruthy();
  const canvas = await page.locator('.world-host canvas').boundingBox();
  await page.mouse.move(
    canvas!.x + points!.opaque.x,
    canvas!.y + points!.opaque.y,
  );
  // Hovering is as for anyone: their own label, no scene light.
  await expect(page.locator('.hover-label')).toContainText('listener');
  await expect(page.locator('.scene-caption')).toHaveCount(0);
  // A listener has no card of their own: the click opens the speaker's.
  await page.mouse.click(
    canvas!.x + points!.opaque.x,
    canvas!.y + points!.opaque.y,
  );
  await expect(page.locator('.story-card h2')).toHaveText('Mufti Ismail Menk');
  // The click lights up the whole talk under its caption, while the card is open.
  await expect(page.locator('.scene-caption')).toContainText(
    'Mufti Ismail Menk',
  );
  await page.locator('.card-close').click();
  await expect(page.locator('.scene-caption')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('clicking Ibn al-Haytham opens his card and frames the dark room', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Al-Bayt al-Muzlim, in the science lab's south-east corner.
  await ready(page, '/?x=2607&y=1974&z=2');
  const points = await page.evaluate(() =>
    (
      window as unknown as {
        __darEngine: {
          debugPoints(id: string): { opaque: { x: number; y: number } } | null;
        };
      }
    ).__darEngine.debugPoints('ibn-al-haytham'),
  );
  expect(points?.opaque).toBeTruthy();
  const canvas = await page.locator('.world-host canvas').boundingBox();
  await page.mouse.move(
    canvas!.x + points!.opaque.x,
    canvas!.y + points!.opaque.y,
  );
  // Hovering stays normal: no scene light.
  await expect(page.locator('.scene-caption')).toHaveCount(0);
  await page.mouse.click(
    canvas!.x + points!.opaque.x,
    canvas!.y + points!.opaque.y,
  );
  await expect(page.locator('.story-card h2')).toHaveText('Ibn al-Haytham');
  await expect(page.locator('.scene-caption')).toContainText('The dark room');
  expect(errors).toEqual([]);
});
test('the Massawa button flies to the town and the mosque opens its landmark card', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole('button', { name: 'Massawa' }).click();
  // Wait for the flight to land: the mosque stops moving on screen (a fixed
  // wait is flaky where frames are slow, as in software rendering).
  const where = () =>
    page.evaluate(() =>
      (
        window as unknown as {
          __darEngine: {
            debugPoints(id: string): {
              opaque: { x: number; y: number };
              transparent: { x: number; y: number };
            } | null;
          };
        }
      ).__darEngine.debugPoints('mosque-of-the-companions'),
    );
  let points = await where();
  await expect
    .poll(
      async () => {
        const last = JSON.stringify(points);
        await page.waitForTimeout(400);
        points = await where();
        return Boolean(points?.opaque) && JSON.stringify(points) === last;
      },
      { timeout: 20000 },
    )
    .toBe(true);
  expect(points?.opaque).toBeTruthy();
  const canvas = await page.locator('.world-host canvas').boundingBox();
  await page.mouse.move(
    canvas!.x + points!.opaque.x,
    canvas!.y + points!.opaque.y,
  );
  await expect(page.locator('.hover-label')).toContainText(
    'Mosque of the Companions',
  );
  await page.mouse.click(
    canvas!.x + points!.opaque.x,
    canvas!.y + points!.opaque.y,
  );
  const card = page.locator('.story-card');
  await expect(card).toContainText('LANDMARK');
  await expect(card).toContainText('Mosque of the Companions');
  await expect(card).toContainText('DRAFT');
  await expect(page).toHaveURL(/\/c\/mosque-of-the-companions/);
  await page.reload();
  await expect(page.locator('.story-card')).toContainText(
    'Mosque of the Companions',
  );
  expect(errors).toEqual([]);
});
test('spin, zoom, whole-planet overview, inspector and minimap operate without runtime errors', async ({
  page,
}) => {
  // It renders the whole planet several times; software rendering (as in
  // the sandbox) needs more than the default 45 s.
  test.slow();
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
  await expect
    .poll(async () =>
      Number(
        (await page.locator('.zoom-controls>span').first().innerText()).replace(
          '%',
          '',
        ),
      ),
    )
    .toBeLessThanOrEqual(50);
  await page.getByLabel('See the whole planet', { exact: true }).click();
  await page.waitForTimeout(800);
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.playwright/overview.png' });
  await page.getByLabel('Return to the quarter').click();
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
    'মহল্লার মানুষ',
  );
  const manifest = await (await page.request.get('/world/world.json')).json();
  await expect(page.locator('.people-list>a')).toHaveCount(
    manifest.characters.filter((c: { name?: unknown }) => c.name).length,
  );
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
  await expect(page.locator('pre')).toContainText('lab-coat');
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
  // Phones open at 100% (people readable) and can zoom right out to 5%.
  await expect(page.locator('.zoom-controls>span').first()).toContainText(
    '100',
  );
  for (let i = 0; i < 20; i++)
    await page.getByLabel('Zoom out', { exact: true }).click();
  await expect(page.locator('.zoom-controls>span').first()).toContainText('5');
  await page.screenshot({ path: '.playwright/mobile-planet.png' });
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
    .toBeGreaterThan(40);
  // The ground under the pinch centre stays under the fingers. Touches are in
  // page coordinates; the engine works in canvas coordinates.
  const box = (await page.locator('.world-host canvas').boundingBox())!;
  const ground = () =>
    page.evaluate(
      ([x, y]) =>
        (
          window as unknown as {
            __darEngine: { groundAt(x: number, y: number): number[] | null };
          }
        ).__darEngine.groundAt(x, y),
      [190 - box.x, 530 - box.y],
    );
  await page.waitForTimeout(500);
  const before = await ground();
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
        { x: 160 - i * 8, y: 530 },
        { x: 220 + i * 8, y: 530 },
      ],
    });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await page.waitForTimeout(500);
  const after = await ground();
  expect(before && after).toBeTruthy();
  expect(
    Math.hypot(after![0] - before![0], after![1] - before![1]),
  ).toBeLessThan(1.5);
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
  await page.route('**/world/ground.webp', async (route) => {
    requested++;
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/c/ibn-sina', { waitUntil: 'commit' });
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
