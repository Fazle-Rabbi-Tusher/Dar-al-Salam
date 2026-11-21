import { test, expect } from '@playwright/test';
// Runtime-only inspection: private fields are intentionally exposed on the dev engine.
test('lab apparatus and working poses animate together, freeze on pause and survive rotation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await page.getByRole('button', { name: 'Labs', exact: true }).click();
  const snapshot = () =>
    page.evaluate(() => {
      const engine = (window as unknown as { __darEngine: unknown })
        .__darEngine as unknown as {
        buildings: {
          kind: string;
          mesh: {
            visible: boolean;
            geometry: {
              getAttribute(name: string): { buffer: { data: Float32Array } };
            };
          };
          activity?: {
            time: number;
            mesh: {
              visible: boolean;
              geometry: {
                getAttribute(name: string): { buffer: { data: Float32Array } };
              };
            };
          };
        }[];
        live: Map<string, { frame: string; sprite: { visible: boolean } }>;
      };
      const hash = (data: Float32Array) => {
        let value = 2166136261;
        for (const n of data)
          value = Math.imul(value ^ Math.round(n * 1e7), 16777619);
        return value;
      };
      const labs = engine.buildings.filter(
        (b) =>
          b.activity &&
          ['chemistry-lab', 'biology-lab', 'drafting'].includes(b.kind),
      );
      return {
        fixed: labs.map((b) =>
          hash(b.mesh.geometry.getAttribute('aPosition').buffer.data),
        ),
        moving: labs.map((b) => [
          hash(b.activity!.mesh.geometry.getAttribute('aPosition').buffer.data),
          hash(b.activity!.mesh.geometry.getAttribute('aColor').buffer.data),
        ]),
        time: labs.map((b) => b.activity!.time),
        visible: labs.filter((b) => b.activity!.mesh.visible).length,
        staff: [...engine.live]
          .filter(([id]) => id.startsWith('lab-'))
          .map(([id, c]) => ({
            id,
            frame: c.frame,
            visible: c.sprite.visible,
          })),
      };
    });
  // Wait for the whole pair of rooms to enter the viewport.
  await expect.poll(async () => (await snapshot()).visible).toBe(6);
  await expect
    .poll(async () => (await snapshot()).staff.filter((c) => c.visible).length)
    .toBe(7);
  await page.getByLabel('Resume animation', { exact: true }).click();
  const running = await snapshot();
  await expect
    .poll(async () => JSON.stringify((await snapshot()).moving))
    .not.toBe(JSON.stringify(running.moving));
  await expect
    .poll(async () =>
      JSON.stringify((await snapshot()).staff.map((c) => c.frame)),
    )
    .not.toBe(JSON.stringify(running.staff.map((c) => c.frame)));
  await page.getByLabel('Pause animation', { exact: true }).click();
  await expect(
    page.getByLabel('Resume animation', { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(150);
  const paused = await snapshot();
  await page.waitForTimeout(450);
  expect((await snapshot()).moving).toEqual(paused.moving);
  expect((await snapshot()).time).toEqual(paused.time);
  expect(paused.fixed).toEqual(running.fixed);
  await page.mouse.move(720, 500);
  await page.mouse.down();
  await page.mouse.move(880, 570, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect((await snapshot()).fixed).toEqual(paused.fixed);
  expect((await snapshot()).moving).toEqual(paused.moving);
  expect(errors).toEqual([]);
});
