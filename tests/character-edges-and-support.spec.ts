import { test, expect, type Page } from '@playwright/test';
import type { Application, Sprite, WebGLRenderer, UniformGroup } from 'pixi.js';
import type { Manifest } from '../packages/shared/schema';
import type { DepthSprite } from '../web/src/engine/DepthSprite';

type Debug = {
  app: Application;
  manifest: Manifest;
  frame: number;
  elapsed: number;
  motion: boolean;
  dirty: boolean;
  flight: unknown;
  spriteDepth: Map<Sprite, DepthSprite>;
  live: Map<string, { sprite: Sprite; shadow?: Sprite; frame: string }>;
  update(): void;
  flyTo(c: { x: number; y: number; zoom: number }, ms: number): void;
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
test('soft character edges blend with the actual 3D turf while opaque faces and clothes stay intact', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole('button', { name: 'Football', exact: true }).click();
  await page.waitForFunction(
    () => !(window as unknown as { __darEngine: Debug }).__darEngine.flight,
  );
  const result = await page.evaluate(() => {
    const e = (window as unknown as { __darEngine: Debug }).__darEngine;
    e.app.ticker.stop();
    e.motion = false;
    e.frame = 0;
    e.elapsed = 0;
    e.dirty = true;
    e.update();
    const live = e.live.get('mohamed-salah')!,
      s = live.sprite,
      depth = e.spriteDepth.get(s)!;
    for (const [id, p] of e.live)
      if (id !== 'mohamed-salah') {
        p.sprite.visible = false;
        const d = e.spriteDepth.get(p.sprite);
        if (d) {
          d.mesh.visible = false;
          if (d.edgeMesh) d.edgeMesh.visible = false;
        }
        if (p.shadow) {
          p.shadow.visible = false;
          const sd = e.spriteDepth.get(p.shadow);
          if (sd) sd.mesh.visible = false;
        }
      }
    const b = s.getBounds(),
      x = Math.floor(b.minX) - 2,
      y = Math.floor(b.minY) - 2,
      w = Math.ceil(b.maxX - b.minX) + 4,
      h = Math.ceil(b.maxY - b.minY) + 4,
      gl = (e.app.renderer as WebGLRenderer).gl,
      snap = () => {
        e.app.render();
        const out = new Uint8Array(w * h * 4);
        gl.readPixels(
          x,
          e.app.canvas.height - y - h,
          w,
          h,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          out,
        );
        return out;
      };
    const pass = (depth.mesh.shader!.resources.alphaPass as UniformGroup)
      .uniforms;
    // Reproduce the former depth-writing soft edge, then compare the actual
    // fix against the native floor below it in the same renderer and frame.
    pass.uPass = -1;
    depth.edgeMesh!.visible = false;
    const before = snap();
    pass.uPass = 0;
    depth.edgeMesh!.visible = true;
    const after = snap();
    depth.mesh.visible = false;
    depth.edgeMesh!.visible = false;
    const ground = snap();
    depth.mesh.visible = true;
    depth.edgeMesh!.visible = true;
    snap();
    let corrected = 0,
      preserved = 0;
    for (let p = 0; p < after.length; p += 4) {
      const delta =
          Math.abs(before[p] - after[p]) +
          Math.abs(before[p + 1] - after[p + 1]) +
          Math.abs(before[p + 2] - after[p + 2]),
        oldBrightness = before[p] + before[p + 1] + before[p + 2],
        newBrightness = after[p] + after[p + 1] + after[p + 2],
        priorDistance =
          Math.abs(before[p] - ground[p]) +
          Math.abs(before[p + 1] - ground[p + 1]) +
          Math.abs(before[p + 2] - ground[p + 2]),
        newDistance =
          Math.abs(after[p] - ground[p]) +
          Math.abs(after[p + 1] - ground[p + 1]) +
          Math.abs(after[p + 2] - ground[p + 2]);
      if (
        delta > 30 &&
        oldBrightness - newBrightness > 30 &&
        newDistance < priorDistance
      )
        corrected++;
      if (
        delta === 0 &&
        after[p] > after[p + 1] * 1.3 &&
        after[p] > 70 &&
        newDistance > 60
      )
        preserved++;
    }
    return {
      corrected,
      preserved,
      depth: depth.mesh.state.depthTest,
      edgeDepth: depth.edgeMesh!.state.depthTest,
      edgeWritesDepth: depth.edgeMesh!.state.depthMask,
      edgeAfter: depth.edgeMesh!.zIndex > depth.mesh.zIndex,
    };
  });
  expect(result.corrected).toBeGreaterThan(10);
  expect(result.preserved).toBeGreaterThan(100);
  expect(result.depth && result.edgeDepth && result.edgeAfter).toBe(true);
  expect(result.edgeWritesDepth).toBe(false);
  await page.screenshot({
    path: '.playwright/support/clean-football-edges.png',
  });
  expect(errors).toEqual([]);
});

test('the world has no anonymous people: every person is a named character', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  const people = await page.evaluate(() => {
    const e = (window as unknown as { __darEngine: Debug }).__darEngine;
    return (
      e.manifest.characters
        // The owner's one exception: Mansa Musa's caravan keeps its people.
        .filter((c) => c.kind === 'person' && !c.id.startsWith('caravan-'))
        .map((c) => ({ id: c.id, named: !!c.name }))
    );
  });
  expect(people.length).toBeGreaterThan(10);
  expect(people.filter((p) => !p.named)).toEqual([]);
  expect(errors).toEqual([]);
});
