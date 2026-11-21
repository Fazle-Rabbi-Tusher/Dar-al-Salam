import { test, expect, type Page } from '@playwright/test';
import type { Sprite } from 'pixi.js';
import type { Manifest } from '../packages/shared/schema';
import type {
  LiveInfrastructure,
  InfrastructureRenderer,
} from '../web/src/engine/Infrastructure';

type Debug = {
  manifest: Manifest;
  frame: number;
  elapsed: number;
  dirty: boolean;
  motion: boolean;
  buildings: LiveInfrastructure[];
  infrastructure: InfrastructureRenderer;
  live: Map<string, { sprite: Sprite; frame: string }>;
  update(): void;
  getCamera(): { zoom: number };
};
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0, {
    timeout: 60000,
  });
  if (await page.locator('.intro-dismiss').count())
    await page.locator('.intro-dismiss').click();
  await expect(page.locator('.world-error')).toHaveCount(0);
}
test('cricket has four named players, drawn contact poses and an animated 3D ball that freezes on pause', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole('button', { name: 'Cricket', exact: true }).click();
  const snapshot = () =>
    page.evaluate(() => {
      const e = (window as unknown as { __darEngine: Debug }).__darEngine;
      const arena = e.buildings.find((b) => b.kind === 'cricket-stadium')!;
      const ids = [
        'hashim-amla',
        'tamim-iqbal',
        'usman-khawaja',
        'mashrafe-mortaza',
      ];
      return {
        frame: e.frame,
        time: arena.activity!.time,
        ball: [
          ...(arena.activity!.mesh.geometry.getAttribute('aPosition').buffer
            .data as Float32Array),
        ].slice(0, 60),
        players: ids.map((id) => ({
          id,
          visible: e.live.get(id)?.sprite.visible,
          frame: e.live.get(id)?.frame,
        })),
        sourceCounts: ids.map((id) =>
          Object.values(
            e.manifest.characters.find((c) => c.id === id)!.frames,
          ).map((a) => a.length),
        ),
        ambulance: e.manifest.characters.some(
          (c) => c.id === 'amb-stadium-ambulance',
        ),
      };
    });
  await expect
    .poll(
      async () => (await snapshot()).players.filter((p) => p.visible).length,
    )
    .toBe(4);
  const initial = await snapshot();
  expect(initial.ambulance).toBe(false);
  expect(initial.sourceCounts.flat().every((n) => n === 6)).toBe(true);
  await page.getByLabel('Resume animation', { exact: true }).click();
  await expect
    .poll(async () => JSON.stringify((await snapshot()).ball))
    .not.toBe(JSON.stringify(initial.ball));
  await expect
    .poll(async () => JSON.stringify((await snapshot()).players), {
      timeout: 15000,
    })
    .not.toBe(JSON.stringify(initial.players));
  await page.getByLabel('Pause animation', { exact: true }).click();
  await page.waitForTimeout(150);
  const paused = await snapshot();
  await page.waitForTimeout(350);
  expect(await snapshot()).toEqual(paused);
  await page.screenshot({ path: '.playwright/sports/cricket-stadium.png' });
  expect(errors).toEqual([]);
});
test('basketball shot, dunk and run use complete drawn strips with dimensional hoops; rings and relocated chamber remain native', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole('button', { name: 'Basketball', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __darEngine: Debug }).__darEngine.live.get(
            'hakeem-olajuwon',
          )?.sprite.visible,
      ),
    )
    .toBe(true);
  const samples = [];
  for (const t of [0, 17, 30, 67, 100, 105, 180, 210]) {
    samples.push(
      await page.evaluate((t) => {
        const e = (window as unknown as { __darEngine: Debug }).__darEngine;
        e.elapsed = t / 12;
        e.frame = t;
        e.dirty = true;
        e.update();
        const a = e.buildings.find((b) => b.kind === 'basketball-court')!;
        e.infrastructure.animate(a, t);
        const p = e.live.get('hakeem-olajuwon')!;
        return {
          frame: p.frame,
          x: p.sprite.x,
          y: p.sprite.y,
          scale: p.sprite.scale.y / e.getCamera().zoom,
          ball: [
            ...(a.activity!.mesh.geometry.getAttribute('aPosition').buffer
              .data as Float32Array),
          ].slice(0, 36),
          depth: a.mesh.state.depthTest,
          glassDepth: a.glass?.state.depthMask,
        };
      }, t),
    );
    if (t === 17)
      await page.screenshot({ path: '.playwright/sports/basketball-shot.png' });
    if (t === 100)
      await page.screenshot({ path: '.playwright/sports/basketball-dunk.png' });
  }
  expect(new Set(samples.map((s) => s.frame)).size).toBeGreaterThanOrEqual(6);
  expect(samples.every((s) => s.depth)).toBe(true);
  expect(samples.every((s) => s.glassDepth === false)).toBe(true);
  expect(samples[0].scale).toBeCloseTo(samples[4].scale, 10);
  expect(samples[3].x).not.toBe(samples[4].x);
  await page.getByRole('button', { name: 'Boxing & MMA', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { __darEngine: Debug }
          ).__darEngine.buildings.filter(
            (b) =>
              ['boxing-ring', 'mma-octagon'].includes(b.kind) && b.mesh.visible,
          ).length,
      ),
    )
    .toBe(2);
  await page.waitForTimeout(700);
  await page.screenshot({ path: '.playwright/sports/boxing-mma.png' });
  await page
    .getByRole('button', { name: 'The dark room', exact: true })
    .click();
  await expect(page.locator('.dark-room-controls')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: '.playwright/sports/dark-room-community.png' });
  expect(await page.locator('.world-host canvas').count()).toBe(1);
  expect(await page.locator('iframe').count()).toBe(0);
  expect(errors).toEqual([]);
});
