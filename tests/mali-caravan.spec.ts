import { test, expect } from '@playwright/test';
import type { Manifest } from '../packages/shared/schema';
import type { LiveInfrastructure } from '../web/src/engine/Infrastructure';
import { project, tileToPlanet, type Frame } from '../packages/shared/planet';
import { rulerTile } from '../packages/shared/royal-caravan';
type Native = {
  manifest: Manifest;
  buildings: LiveInfrastructure[];
  frame: number;
  elapsed: number;
  lastFrame: number;
  dirty: boolean;
  motion: boolean;
  flight: unknown;
  proj: Frame;
  app: { render(): void };
  infrastructure: { animate(b: LiveInfrastructure, t: number): void };
  update(): void;
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

test('the native caravan animates joint matrices, keeps its meshes, pauses and opens the ruler card', async ({
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
  const proof = await page.evaluate(() => {
    const e = (window as unknown as { __darEngine: Native }).__darEngine,
      b = e.buildings.find((b) => b.kind === 'gold-caravan')!,
      rig = b.rig!,
      geometry = rig.meshes[0].geometry;
    const sample = (t: number) => {
      e.motion = false;
      e.elapsed = t / 12;
      e.frame = Math.floor(t);
      e.lastFrame = e.frame;
      e.dirty = false;
      e.update();
      e.infrastructure.animate(b, t);
      e.app.render();
      return [...rig.batches[0].matrices];
    };
    const a = sample(12),
      fractional = sample(12.5),
      moved = sample(76);
    return {
      count: rig.jointCount,
      meshes: rig.meshes.length,
      vertices: rig.meshes.reduce(
        (n, m) => n + m.geometry.getAttribute('aLocal').buffer.data.length / 3,
        0,
      ),
      depth: rig.meshes.every((m) => m.state.depthTest && m.state.depthMask),
      sameGeometry: geometry === rig.meshes[0].geometry,
      fractional: JSON.stringify(a) !== JSON.stringify(fractional),
      moved: JSON.stringify(a) !== JSON.stringify(moved),
      mode: e.manifest.characters.find((c) => c.id === 'mansa-musa')
        ?.nativeModel,
    };
  });
  expect(proof.count).toBeGreaterThan(400);
  expect(proof.meshes).toBeGreaterThan(5);
  expect(proof.vertices).toBeGreaterThan(100000);
  expect(
    proof.depth && proof.sameGeometry && proof.fractional && proof.moved,
  ).toBe(true);
  expect(proof.mode).toBe('mali-ruler');
  await page.getByLabel('Resume animation', { exact: true }).click();
  const sample = () =>
    page.evaluate(() => {
      const e = (window as unknown as { __darEngine: Native }).__darEngine;
      const r = e.buildings.find((b) => b.kind === 'gold-caravan')!.rig!;
      return { time: r.time, pose: [...r.batches[0].matrices] };
    });
  const first = await sample();
  await expect.poll(async () => (await sample()).time).not.toBe(first.time);
  await page.getByLabel('Pause animation', { exact: true }).click();
  const paused = await sample();
  await page.waitForTimeout(350);
  expect(await sample()).toEqual(paused);
  const camera = await page.evaluate(() => {
    const e = (window as unknown as { __darEngine: Native }).__darEngine;
    return { frame: e.frame, projection: e.proj };
  });
  const point = project(
    camera.projection,
    tileToPlanet(...rulerTile(camera.frame)),
    84,
  );
  const canvas = await page.locator('.world-host canvas').boundingBox();
  await page.mouse.click(canvas!.x + point.x, canvas!.y + point.y);
  await expect(page.locator('.story-card')).toContainText('Mansa Musa');
  await expect(page.locator('.story-card')).toContainText(
    /DRAFT|Awaiting|review/i,
  );
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
