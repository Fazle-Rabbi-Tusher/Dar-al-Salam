import { test, expect, type Page } from '@playwright/test';
import type { Application, Container, Sprite, WebGLRenderer } from 'pixi.js';
import type { Manifest } from '../packages/shared/schema';
import type { DarkRoomOptions } from '../packages/shared/dark-room';
import type { InfrastructureRenderer } from '../web/src/engine/Infrastructure';
import type { DepthSprite } from '../web/src/engine/DepthSprite';

type DebugEngine = {
  ready: boolean;
  frame: number;
  elapsed: number;
  lastFrame: number;
  dirty: boolean;
  motion: boolean;
  app: Application;
  manifest: Manifest;
  infrastructure: InfrastructureRenderer;
  spriteDepth: Map<Sprite, DepthSprite>;
  live: Map<string, { sprite: Sprite; frame: string }>;
  update(): void;
  setMotion(on: boolean): void;
  flyTo(c: { x: number; y: number; zoom: number }, ms: number): void;
  getCamera(): { x: number; y: number; zoom: number };
  getDarkRoomState(): { options: DarkRoomOptions; clockRunning: boolean };
  darkRoom: {
    partCount: number;
    batches: { group: string; mesh: DepthSprite['mesh']; demo?: boolean }[];
    model: {
      parts: {
        vertices: number[];
        color: number[];
        uv: number[][];
        group: string;
      }[];
    };
    measurements: Record<string, number | string>;
  };
};
// Page.evaluate serializes the function body, so each callback reads its own
// dev engine instead of depending on a Node closure.
async function ready(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.locator('.loading-screen')).toHaveCount(0, {
    timeout: 30000,
  });
  await expect(page.locator('.world-error')).toHaveCount(0);
}

test('approved optical workshop is real geometry in the same main-world canvas', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  const canvas = await page.locator('.world-host canvas').elementHandle();
  await page
    .getByRole('button', { name: 'The dark room', exact: true })
    .click();
  await expect(page.locator('.dark-room-controls')).toBeVisible();
  await expect(page.locator('iframe,dialog.dark-room-exhibit')).toHaveCount(0);
  expect(
    await page.evaluate(
      (c) => c === document.querySelector('.world-host canvas'),
      canvas,
    ),
  ).toBe(true);
  expect(await page.locator('.app').getAttribute('inert')).toBeNull();
  expect(new URL(page.url()).searchParams.has('exhibit')).toBe(false);
  const fidelity = await page.evaluate(async () => {
    const e = (window as unknown as { __darEngine: DebugEngine }).__darEngine;
    const path = new URL(
      '/exhibits/al-bayt-al-muzlim/scene.js',
      location.origin,
    ).href;
    const source = await import(path),
      original = source.buildSanctuary({ cutaway: true });
    const parts = e.darkRoom.model.parts;
    return {
      count: e.darkRoom.partCount,
      original: original.parts.length,
      same: parts.every((p, i) => {
        const q = original.parts[i];
        return (
          p.group === q.group &&
          JSON.stringify(p.vertices) === JSON.stringify(q.vertices) &&
          JSON.stringify(p.color) === JSON.stringify(q.color) &&
          JSON.stringify(p.uv) === JSON.stringify(q.uv)
        );
      }),
      vertices: e.darkRoom.batches.reduce(
        (n, b) =>
          n + b.mesh.geometry.getAttribute('aPosition').buffer.data.length / 3,
        0,
      ),
      depth: e.darkRoom.batches.every((b) => b.mesh.state.depthTest),
      frames: e.manifest.characters.find((c) => c.id === 'ibn-al-haytham')!
        .frames,
    };
  });
  expect(fidelity.count).toBe(79806);
  expect(fidelity.count).toBe(fidelity.original);
  expect(fidelity.same).toBe(true);
  expect(fidelity.vertices).toBeGreaterThan(300000);
  expect(fidelity.depth).toBe(true);
  expect(
    Object.values(fidelity.frames).every((frames) => frames.length === 40),
  ).toBe(true);
  await page.locator('.dark-room-station select').selectOption('mirrors');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __darEngine: DebugEngine }).__darEngine
            .darkRoom.measurements?.kind,
      ),
    )
    .toBe('mirror');
  const mirror = await page.evaluate(
    () =>
      (window as unknown as { __darEngine: DebugEngine }).__darEngine.darkRoom
        .measurements,
  );
  expect(mirror.hitCount).toBeGreaterThan(0);
  expect(mirror.lawError).toBeLessThan(0.000001);
  await page.getByLabel('Incoming beam angle').focus();
  await page.keyboard.press('End');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __darEngine: DebugEngine }).__darEngine
            .darkRoom.measurements.angle,
      ),
    )
    .toBe(25);
  await page.getByRole('button', { name: 'Courtyard', exact: true }).click();
  expect(
    await page.evaluate(
      (c) => c === document.querySelector('.world-host canvas'),
      canvas,
    ),
  ).toBe(true);
  await page.getByLabel('Close dark room controls').click();
  await expect(page.locator('.dark-room-controls')).toHaveCount(0);
  await page.getByRole('button', { name: 'Labs', exact: true }).click();
  expect(errors).toEqual([]);
});

test('native water clock remains attached through updates and obeys the main Pause', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page
    .getByRole('button', { name: 'The dark room', exact: true })
    .click();
  await page.locator('.dark-room-station select').selectOption('waterclock');
  const snapshot = () =>
    page.evaluate(() => {
      const e = (window as unknown as { __darEngine: DebugEngine }).__darEngine,
        clocks = e.darkRoom.batches.filter((b) =>
          b.group.startsWith('instrument-waterclock'),
        );
      let hash = 2166136261;
      for (const b of clocks)
        for (const n of b.mesh.geometry.getAttribute('aPosition').buffer.data)
          hash = Math.imul(hash ^ Math.round(n * 1e7), 16777619);
      return {
        ...e.getDarkRoomState(),
        hash,
        attached: clocks.every((b) => Boolean(b.mesh.parent)),
        count: clocks.length,
        frame: e.frame,
      };
    });
  await page
    .getByRole('button', { name: 'Animate water clock', exact: true })
    .click();
  await expect(
    page.getByLabel('Pause animation', { exact: true }),
  ).toBeVisible();
  const before = await snapshot();
  await expect
    .poll(async () => (await snapshot()).hash, { timeout: 20000 })
    .not.toBe(before.hash);
  expect((await snapshot()).attached).toBe(true);
  expect((await snapshot()).count).toBeGreaterThan(0);
  await page.getByLabel('Pause animation', { exact: true }).click();
  await page.waitForTimeout(500);
  const paused = await snapshot();
  await page.waitForTimeout(700);
  const still = await snapshot();
  expect(still.hash).toBe(paused.hash);
  expect(still.frame).toBe(paused.frame);
  expect(still.attached).toBe(true);
  await page
    .getByRole('button', { name: 'Pause water clock', exact: true })
    .click();
  await page.getByLabel('Close dark room controls').click();
  await page
    .getByRole('button', { name: 'The dark room', exact: true })
    .click();
  await page.locator('.dark-room-controls summary').click();
  await page.getByLabel('Aperture', { exact: true }).focus();
  await page.keyboard.press('End');
  await expect.poll(async () => (await snapshot()).options.aperture).toBe(1);
  await page.getByLabel('Close dark room controls').click();
  await page
    .getByRole('button', { name: 'The dark room', exact: true })
    .click();
  await page.locator('.dark-room-controls summary').click();
  await expect(page.getByLabel('Aperture', { exact: true })).toHaveValue('100');
  expect(errors).toEqual([]);
});

test('legacy dark-room links focus an inline component on mobile', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, '/exhibits/al-bayt-al-muzlim/');
  await expect(page.locator('.dark-room-controls')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(await page.locator('.world-host canvas').count()).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(new URL(page.url()).searchParams.has('exhibit')).toBe(false);
  const response = await page.request.get(
    '/exhibits/al-bayt-al-muzlim/assets/al-bayt-al-muzlim-collection.zip',
  );
  expect(response.ok()).toBe(true);
  const zip = await response.body();
  expect(zip.byteLength).toBeGreaterThan(1000000);
  expect(zip.byteLength).toBeLessThan(30000000);
  expect(zip.subarray(0, 2).toString()).toBe('PK');
});

test('a character in front of the far end of a long wall remains visible in the actual WebGL depth buffer', async ({
  page,
}) => {
  test.setTimeout(60000);
  await ready(page);
  await page.evaluate(() => {
    const e = (window as unknown as { __darEngine: DebugEngine }).__darEngine;
    e.setMotion(false);
    e.flyTo({ x: 2048 + (44 - 11) * 16, y: 1460 + (44 + 11) * 8, zoom: 3 }, 1);
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { __darEngine: DebugEngine }
          ).__darEngine.getCamera().zoom,
      ),
    )
    .toBe(3);
  const coverage = await page.evaluate(() => {
    const e = (window as unknown as { __darEngine: DebugEngine }).__darEngine,
      c = e.manifest.characters.find((c) => c.id === 'ahmed-zewail')!,
      script = c.script;
    c.script = [
      { ...script[0], from: 0, to: c.loop, at: [41, 11.3], path: undefined },
    ];
    e.elapsed = 0;
    e.frame = 0;
    e.update();
    const actor = e.live.get(c.id)!,
      depth = e.spriteDepth.get(actor.sprite)!,
      parent = depth.mesh.parent,
      source = e.manifest.sortables.find(
        (s) => s.objectType === 'm-whitewall',
      )!,
      wall = e.infrastructure.create({
        ...source,
        objectId: -1000,
        tile: [40, 9],
        footprint: [12, 0.35],
        scene: undefined,
        landmark: undefined,
      })!,
      stage = new (e.app.stage.constructor as new () => Container)(),
      renderer = e.app.renderer as WebGLRenderer,
      gl = renderer.gl;
    stage.sortableChildren = true;
    stage.addChild(depth.mesh, wall.mesh);
    wall.mesh.zIndex = 1.5;
    depth.mesh.zIndex = 0;
    const w = gl.drawingBufferWidth,
      h = gl.drawingBufferHeight;
    const draw = () => {
      renderer.render({ container: stage, clear: true });
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels;
    };
    wall.mesh.visible = false;
    const alone = draw();
    wall.mesh.visible = true;
    const together = draw();
    depth.mesh.visible = false;
    const onlyWall = draw();
    let total = 0,
      visible = 0;
    for (let i = 0; i < alone.length; i += 4)
      if (alone[i + 3] > 200) {
        total++;
        if (
          Math.abs(together[i] - onlyWall[i]) +
            Math.abs(together[i + 1] - onlyWall[i + 1]) +
            Math.abs(together[i + 2] - onlyWall[i + 2]) >
          12
        )
          visible++;
      }
    parent.addChild(depth.mesh);
    depth.mesh.visible = true;
    const geometry = wall.mesh.geometry,
      shader = wall.mesh.shader;
    wall.mesh.destroy();
    geometry.destroy();
    shader?.destroy();
    stage.destroy();
    c.script = script;
    e.update();
    renderer.render({ container: e.app.stage, clear: true });
    return { total, visible, ratio: visible / total };
  });
  expect(coverage.total).toBeGreaterThan(3000);
  expect(coverage.ratio).toBeGreaterThan(0.9);
});
