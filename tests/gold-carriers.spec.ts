import { test, expect } from '@playwright/test';

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
  time: number;
  camera: { position: { toArray(): number[] } };
  component: { setFrame(t: number): void };
  loadModel(name: string): Promise<void>;
  setTime(time: number): void;
  angle(name: string): void;
};

test('all six characters, the paired load and ensemble load as animated rotatable 3D meshes', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8140/index.html');
  await page.waitForFunction(
    () =>
      !!(window as unknown as { __goldCarriers: Viewer }).__goldCarriers?.model,
    null,
    { timeout: 60000 },
  );
  const names = [
    'overhead-gold-bearer',
    'bowl-gold-bearer',
    'chest-porter-rust',
    'chest-porter-indigo',
    'banner-attendant',
    'elder-recipient',
    'paired-chest-carriers',
    'gold-handover-pair',
    'gold-carriers-ensemble',
  ];
  for (const name of names) {
    await page.evaluate(async (name) => {
      const v = (window as unknown as { __goldCarriers: Viewer })
        .__goldCarriers;
      await v.loadModel(name);
    }, name);
    const proof = await page.evaluate(() => {
      const v = (window as unknown as { __goldCarriers: Viewer })
        .__goldCarriers;
      let vertices = 0,
        meshes = 0;
      v.model.traverse((o) => {
        if (o.isMesh) {
          meshes++;
          vertices += o.geometry!.attributes.position.count;
        }
      });
      const sample = (time: number) => {
        v.setTime(time);
        v.model.updateMatrixWorld(true);
        const transforms: number[][] = [];
        v.model.traverse((o) => {
          if (o.isMesh) transforms.push(o.matrixWorld.elements.slice());
        });
        return transforms;
      };
      const a = sample(0),
        b = sample(3),
        c = sample(20);
      v.angle('rear');
      const rear = v.camera.position.toArray();
      v.angle('front');
      const front = v.camera.position.toArray();
      return {
        vertices,
        meshes,
        moved: JSON.stringify(a) !== JSON.stringify(b),
        loop: JSON.stringify(a) === JSON.stringify(c),
        rear,
        front,
      };
    });
    expect(proof.vertices).toBeGreaterThan(20000);
    expect(proof.meshes).toBeGreaterThan(12);
    if (name !== 'elder-recipient') expect(proof.moved).toBe(true);
    expect(proof.loop).toBe(true);
    expect(proof.rear).not.toEqual(proof.front);
  }
  expect(errors).toEqual([]);
});

test('actual playback, pause and timeline scrubbing work with reduced-motion startup', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:8140/index.html');
  await expect(page.locator('#status')).toBeHidden({ timeout: 60000 });
  await expect(
    page.getByRole('button', { name: 'Play animation', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Play animation', exact: true })
    .click();
  const first = await page.evaluate(
    () => (window as unknown as { __goldCarriers: Viewer }).__goldCarriers.time,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __goldCarriers: Viewer }).__goldCarriers.time,
      ),
    )
    .toBeGreaterThan(first);
  await page
    .getByRole('button', { name: 'Pause animation', exact: true })
    .click();
  const stopped = await page.evaluate(
    () => (window as unknown as { __goldCarriers: Viewer }).__goldCarriers.time,
  );
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __goldCarriers: Viewer }).__goldCarriers.time,
    ),
  ).toBe(stopped);
  await page.getByLabel('Animation time', { exact: true }).fill('8');
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __goldCarriers: Viewer }).__goldCarriers.time,
    ),
  ).toBe(8);
});
