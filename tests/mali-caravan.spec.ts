import { test, expect } from '@playwright/test';
import type { Manifest } from '../packages/shared/schema';
import type { LiveInfrastructure } from '../web/src/engine/Infrastructure';
type Native = {
  manifest: Manifest;
  buildings: LiveInfrastructure[];
  flight: unknown;
  live: Map<string, { frame: string; sprite: { visible: boolean } }>;
  debugPoints(id: string): { opaque: { x: number; y: number } } | null;
};
type Object3 = {
  name: string;
  isMesh?: boolean;
  geometry?: { attributes: { position: { count: number } } };
  matrixWorld: { elements: number[] };
  traverse(fn: (o: Object3) => void): void;
  getObjectByName(name: string): Object3 | undefined;
  updateMatrixWorld(force: boolean): void;
};
type Viewer = {
  model: Object3;
  camera: { position: { toArray(): number[] } };
  setTime(t: number): void;
  pause(): void;
  angle(name: string): void;
};

test('the caravan walks the desert as pixel-art sprites, pauses and opens the ruler card', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.loading-screen')).toHaveCount(0, {
    timeout: 60000,
  });
  if (await page.locator('.intro-dismiss').count())
    await page.locator('.intro-dismiss').click();
  await page.getByRole('button', { name: 'Mansa Musa', exact: true }).click();
  await page.waitForFunction(
    () => !(window as unknown as { __darEngine: Native }).__darEngine.flight,
  );
  const sample = () =>
    page.evaluate(() => {
      const e = (window as unknown as { __darEngine: Native }).__darEngine;
      const figures = ['mansa-musa', 'caravan-guard-1', 'caravan-pack-camel-1'];
      return {
        native: e.buildings.some((b) => b.kind === 'gold-caravan'),
        mode: e.manifest.characters.find((c) => c.id === 'mansa-musa')
          ?.nativeModel,
        cast: e.manifest.characters.filter(
          (c) => c.id === 'mansa-musa' || c.id.startsWith('caravan-'),
        ).length,
        visible: figures.map((id) => !!e.live.get(id)?.sprite.visible),
        poses: figures.map((id) => e.live.get(id)?.frame),
      };
    });
  const first = await sample();
  // No native rig: every figure is a baked sprite like the rest of the world.
  expect(first.native).toBe(false);
  expect(first.mode).toBeUndefined();
  expect(first.cast).toBeGreaterThan(25);
  expect(first.visible).toEqual([true, true, true]);
  await page.getByLabel('Resume animation', { exact: true }).click();
  await expect
    .poll(async () => JSON.stringify((await sample()).poses), {
      timeout: 20000,
    })
    .not.toBe(JSON.stringify(first.poses));
  await page.getByLabel('Pause animation', { exact: true }).click();
  await page.waitForTimeout(200);
  const paused = await sample();
  await page.waitForTimeout(400);
  expect((await sample()).poses).toEqual(paused.poses);
  const point = await page.evaluate(() =>
    (window as unknown as { __darEngine: Native }).__darEngine.debugPoints(
      'mansa-musa',
    ),
  );
  expect(point?.opaque).toBeTruthy();
  const canvas = await page.locator('.world-host canvas').boundingBox();
  await page.mouse.click(
    canvas!.x + point!.opaque.x,
    canvas!.y + point!.opaque.y,
  );
  await expect(page.locator('.story-card')).toContainText('Mansa Musa');
  await expect(page.locator('.story-card')).toContainText(
    /DRAFT|Awaiting|review/i,
  );
  await page
    .getByRole('button', { name: 'View character study', exact: true })
    .click();
  const study = page.getByRole('dialog', { name: 'One ruler. Every angle.' });
  await expect(study).toBeVisible();
  await expect
    .poll(() =>
      study
        .locator('img')
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(1000);
  await page.keyboard.press('Escape');
  await expect(study).toHaveCount(0);
  await expect(page.locator('.story-card')).toContainText('Mansa Musa');
  expect(errors).toEqual([]);
});
test('all four GLBs load as animated 3D objects and can be inspected from behind', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/models/mali-caravan/index.html');
  await page.waitForFunction(
    () => !!(window as unknown as { __maliViewer: Viewer }).__maliViewer,
    null,
    { timeout: 60000 },
  );
  for (const name of [
    'mansa-musa-standing',
    'mansa-musa-mounted',
    'mali-guard',
    'mali-gold-caravan',
  ]) {
    await page.selectOption('#model', name);
    await page.waitForFunction(
      (name) =>
        (window as unknown as { __maliViewer: Viewer }).__maliViewer.model
          .name === name,
      name,
    );
    const proof = await page.evaluate(() => {
      const v = (window as unknown as { __maliViewer: Viewer }).__maliViewer;
      v.pause();
      v.setTime(0);
      v.model.updateMatrixWorld(true);
      const wrist = v.model.getObjectByName('right-arm-hand')!,
        before = [...wrist.matrixWorld.elements];
      v.setTime(v.model.name === 'mali-guard' ? 4 : 1);
      v.model.updateMatrixWorld(true);
      const after = [...wrist.matrixWorld.elements];
      let meshes = 0,
        vertices = 0;
      v.model.traverse((o) => {
        if (o.isMesh) {
          meshes++;
          vertices += o.geometry!.attributes.position.count;
        }
      });
      v.angle('front');
      const front = v.camera.position.toArray();
      v.angle('rear');
      const rear = v.camera.position.toArray();
      return { meshes, vertices, before, after, front, rear };
    });
    expect(proof.meshes).toBeGreaterThan(15);
    expect(proof.vertices).toBeGreaterThan(1000);
    expect(proof.before).not.toEqual(proof.after);
    expect(proof.front).not.toEqual(proof.rear);
  }
  expect(errors).toEqual([]);
  await expect(page.locator('#error')).toBeHidden();
});
