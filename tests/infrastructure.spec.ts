import { test, expect } from '@playwright/test';
test('City shortcut frames the expanded skyline and detailed street vehicles', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await page.getByRole('button', { name: 'City', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const engine = (
          window as unknown as {
            __darEngine: {
              getCamera(): { x: number; y: number; zoom: number };
              buildings: { kind: string; mesh: { visible: boolean } }[];
            };
          }
        ).__darEngine;
        const camera = engine.getCamera();
        return Math.hypot(
          camera.x - (2048 + (31 - 72) * 16),
          camera.y - (1460 + (31 + 72) * 8),
        );
      }),
    )
    .toBeLessThan(1);
  const city = await page.evaluate(() => {
    const engine = (
      window as unknown as {
        __darEngine: {
          buildings: { kind: string; mesh: { visible: boolean } }[];
          manifest: { characters: unknown[] };
        };
      }
    ).__darEngine;
    return {
      cars: engine.buildings.filter(
        (b) => b.kind === 'electric-car' && b.mesh.visible,
      ).length,
      signals: engine.buildings.filter((b) => b.kind === 'traffic-signal')
        .length,
      markings: engine.buildings.filter((b) => b.kind === 'road-marking')
        .length,
      characters: engine.manifest.characters.length,
    };
  });
  expect(city.cars).toBeGreaterThan(20);
  expect(city.signals).toBe(12);
  expect(city.markings).toBe(43);
  expect(city.characters).toBeGreaterThanOrEqual(66);
  expect(errors).toEqual([]);
});
test('infrastructure uses stable 3D geometry while rotating, with sprites and scene controls intact', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  const snapshot = () =>
    page.evaluate(() => {
      const engine = (
        window as unknown as {
          __darEngine: {
            buildings: {
              objectId: number;
              kind: string;
              mesh: {
                geometry: {
                  getAttribute: (s: string) => {
                    buffer: { data: Float32Array };
                  };
                };
                state: { depthTest: boolean };
              };
            }[];
            infrastructure: {
              uniforms: { uniforms: { uPlanetRotation: Float32Array } };
            };
          };
        }
      ).__darEngine;
      return {
        count: engine.buildings.length,
        ids: engine.buildings.map((b) => b.objectId),
        families: [...new Set(engine.buildings.map((b) => b.kind))],
        vertices: engine.buildings.reduce(
          (n, b) =>
            n + b.mesh.geometry.getAttribute('aPosition').buffer.data.length,
          0,
        ),
        matrix: [...engine.infrastructure.uniforms.uniforms.uPlanetRotation],
        depth: engine.buildings.every((b) => b.mesh.state.depthTest),
      };
    });
  const before = await snapshot();
  expect(before.count).toBeGreaterThan(280);
  expect(new Set(before.ids).size).toBe(before.count);
  expect(before.families.length).toBeGreaterThan(20);
  expect(before.vertices).toBeGreaterThan(100000);
  expect(before.depth).toBe(true);
  await page.mouse.move(600, 500);
  await page.mouse.down();
  await page.mouse.move(850, 580, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => JSON.stringify((await snapshot()).matrix))
    .not.toBe(JSON.stringify(before.matrix));
  const after = await snapshot();
  expect(after.vertices).toBe(before.vertices);
  expect(after.ids).toEqual(before.ids);
  await page.getByLabel('See the whole planet', { exact: true }).click();
  await page.waitForTimeout(700);
  expect(errors).toEqual([]);
});
