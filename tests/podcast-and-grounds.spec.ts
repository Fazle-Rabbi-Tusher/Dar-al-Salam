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
  flight: unknown;
  buildings: LiveInfrastructure[];
  infrastructure: InfrastructureRenderer;
  live: Map<string, { sprite: Sprite; frame: string }>;
  update(): void;
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

test('podcast has two grounded seated guests, alternating drawn gestures, moving recording equipment and a working pause', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole('button', { name: 'Podcast', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const e = (window as unknown as { __darEngine: Debug }).__darEngine;
        return ['omar-suleiman', 'mehdi-hasan'].filter(
          (id) => e.live.get(id)?.sprite.visible,
        ).length;
      }),
    )
    .toBe(2);
  const sample = () =>
    page.evaluate(() => {
      const e = (window as unknown as { __darEngine: Debug }).__darEngine;
      const set = e.buildings.find((b) => b.kind === 'podcast-studio')!;
      return {
        frame: e.frame,
        time: set.activity!.time,
        equipment: [
          ...(set.activity!.mesh.geometry.getAttribute('aPosition').buffer
            .data as Float32Array),
        ].slice(0, 72),
        colors: [
          ...(set.activity!.mesh.geometry.getAttribute('aColor').buffer
            .data as Float32Array),
        ],
        people: ['omar-suleiman', 'mehdi-hasan'].map((id) => {
          const p = e.live.get(id)!,
            c = e.manifest.characters.find((c) => c.id === id)!;
          return {
            id,
            frame: p.frame,
            x: p.sprite.x,
            y: p.sprite.y,
            visible: p.sprite.visible,
            sourceCounts: Object.values(c.frames).map((s) => s.length),
            approved: c.panelApproved,
            scene: c.scene,
          };
        }),
        depth: set.mesh.state.depthTest,
        cameras: set.activity!.mesh.state.depthTest,
      };
    });
  await expect
    .poll(async () => (await sample()).people.every((c) => c.visible))
    .toBe(true);
  const poses = [];
  for (const t of [0, 8, 16, 24, 84, 116, 124, 132, 140, 192, 216, 239]) {
    await page.evaluate((t) => {
      const e = (window as unknown as { __darEngine: Debug }).__darEngine;
      e.motion = false;
      e.elapsed = t / 12;
      e.frame = t;
      e.dirty = true;
      e.update();
      const set = e.buildings.find((b) => b.kind === 'podcast-studio')!;
      e.infrastructure.animate(set, t);
    }, t);
    poses.push(await sample());
  }
  for (const id of ['omar-suleiman', 'mehdi-hasan']) {
    const guests = poses.map((p) => p.people.find((c) => c.id === id)!);
    expect(new Set(guests.map((c) => c.frame)).size).toBeGreaterThanOrEqual(5);
    expect(
      guests.every(
        (c) =>
          !c.approved &&
          c.scene === 'podcast' &&
          c.sourceCounts.every((n) => n === 6),
      ),
    ).toBe(true);
    expect(
      Math.max(...guests.map((c) => c.x)) - Math.min(...guests.map((c) => c.x)),
    ).toBeLessThan(0.1);
    expect(
      Math.max(...guests.map((c) => c.y)) - Math.min(...guests.map((c) => c.y)),
    ).toBeLessThan(0.1);
  }
  expect(poses.every((p) => p.depth && p.cameras)).toBe(true);
  expect(poses[0].equipment).not.toEqual(poses[5].equipment);
  expect(poses[0].colors).not.toEqual(poses[5].colors);
  await page.getByLabel('Resume animation', { exact: true }).click();
  await expect.poll(async () => (await sample()).frame).not.toBe(239);
  await page.getByLabel('Pause animation', { exact: true }).click();
  const paused = await sample();
  await page.waitForTimeout(350);
  expect(await sample()).toEqual(paused);
  await page.screenshot({ path: '.playwright/podcast/studio.png' });
  await page.locator('.search-field input').fill('Mehedi Hassan');
  await page
    .locator('.search-results button')
    .filter({ hasText: 'Mehdi Hasan' })
    .click();
  await expect(page.locator('.story-card')).toContainText('Mehdi Hasan');
  await expect(page.locator('.story-card')).toContainText('DRAFT');
  await expect(page.locator('.scene-caption')).toContainText(
    'Omar Suleiman & Mehdi Hasan',
  );
  expect(errors).toEqual([]);
});

test('both stadiums use loaded grass material and football has two full depth goals', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole('button', { name: 'Football', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const e = (window as unknown as { __darEngine: Debug }).__darEngine;
        return e.buildings.filter(
          (b) => b.kind === 'football-goal' && b.mesh.visible,
        ).length;
      }),
    )
    .toBe(2);
  const data = await page.evaluate(() => {
    const e = (window as unknown as { __darEngine: Debug }).__darEngine;
    return ['football-pitch', 'cricket-stadium'].map((kind) => {
      const b = e.buildings.find((b) => b.kind === kind)!,
        g = b.mesh.geometry,
        texture = b.mesh.shader.resources.uTurf;
      return {
        turf: [...(g.getAttribute('aTurf').buffer.data as Float32Array)].filter(
          (n) => n === 1,
        ).length,
        uv: [...(g.getAttribute('aTurfUV').buffer.data as Float32Array)].some(
          (n) => n !== 0,
        ),
        sourceWidth: texture.width,
        sourceHeight: texture.height,
      };
    });
  });
  expect(
    data.every(
      (d) =>
        d.turf > 200 && d.uv && d.sourceWidth === 512 && d.sourceHeight === 512,
    ),
  ).toBe(true);
  await page.waitForFunction(
    () => !(window as unknown as { __darEngine: Debug }).__darEngine.flight,
  );
  await page.screenshot({ path: '.playwright/podcast/football-goals.png' });
  await page.getByRole('button', { name: 'Cricket', exact: true }).click();
  await page.waitForFunction(
    () => !(window as unknown as { __darEngine: Debug }).__darEngine.flight,
  );
  await page.screenshot({ path: '.playwright/podcast/cricket-grass.png' });
  expect(errors).toEqual([]);
});
