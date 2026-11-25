import { test, expect } from '@playwright/test';
type Node3 = {
  name: string;
  isMesh?: boolean;
  matrixWorld: { elements: number[] };
  visible: boolean;
  traverse(fn: (n: Node3) => void): void;
  getObjectByName(name: string): Node3 | undefined;
};
type Viewer = {
  model: Node3;
  time: number;
  loadModel(name: string): Promise<void>;
  setTime(t: number): void;
  component: { setMode(mode: string): void; setFrame(frame: number): void };
  camera: { position: { toArray(): number[] } };
  angle(name: string): void;
};

test('animal actions use real articulated 3D parts, planted rest poses, a closed loop and working pause', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8150/index.html?model=elephant-loaded');
  await page.waitForFunction(
    () => !!(window as unknown as { __goldCargo: Viewer }).__goldCargo?.model,
    null,
    { timeout: 120000 },
  );
  for (const name of ['elephant-loaded', 'camel-loaded']) {
    await page.evaluate(async (name) => {
      const v = (window as unknown as { __goldCargo: Viewer }).__goldCargo;
      await v.loadModel(name);
      v.component.setMode('Walk');
      v.setTime(7);
    }, name);
    const proof = await page.evaluate((name) => {
      const v = (window as unknown as { __goldCargo: Viewer }).__goldCargo;
      const feet = () => {
        const result: number[] = [];
        const pattern =
          name === 'elephant-loaded'
            ? /^elephant-foot-(-?1)-(-?1)$/
            : /^camel-hoof-(-?1)-(-?1)$/;
        v.model.traverse((n) => {
          if (pattern.test(n.name)) result.push(n.matrixWorld.elements[13]);
        });
        return result;
      };
      const sample = () => {
        const matrices: number[][] = [];
        v.model.traverse((n) => {
          if (n.isMesh) matrices.push(n.matrixWorld.elements.slice());
        });
        return JSON.stringify(matrices);
      };
      const moving = feet();
      v.component.setMode('Rest');
      v.setTime(7);
      const resting = feet();
      v.setTime(0);
      const start = sample();
      v.setTime(20);
      const loop = start === sample();
      v.angle('front');
      const front = v.camera.position.toArray();
      v.angle('rear');
      return {
        moving,
        resting,
        loop,
        front,
        rear: v.camera.position.toArray(),
      };
    }, name);
    expect(proof.moving).toHaveLength(4);
    expect(proof.resting).toHaveLength(4);
    expect(proof.moving.some((y) => y > 0.01)).toBe(true);
    expect(proof.resting.every((y) => Math.abs(y) < 1e-5)).toBe(true);
    expect(proof.loop).toBe(true);
    expect(proof.front).not.toEqual(proof.rear);
  }
  await page
    .getByRole('button', { name: 'Play animation', exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __goldCargo: Viewer }).__goldCargo.time,
      ),
    )
    .toBeGreaterThan(0.05);
  await page
    .getByRole('button', { name: 'Pause animation', exact: true })
    .click();
  const paused = await page.evaluate(
    () => (window as unknown as { __goldCargo: Viewer }).__goldCargo.time,
  );
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(
      () => (window as unknown as { __goldCargo: Viewer }).__goldCargo.time,
    ),
  ).toBe(paused);
  expect(errors).toEqual([]);
});

test('the assembled caravan includes detailed loads, people and individually inspectable props', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8150/index.html?model=treasury-collection');
  await page.waitForFunction(
    () => !!(window as unknown as { __goldCargo: Viewer }).__goldCargo?.model,
    null,
    { timeout: 120000 },
  );
  for (const name of [
    'gold-basket',
    'treasure-chest',
    'jewelry-tray',
    'howdah',
    'procession-scene',
  ]) {
    await page.evaluate(async (name) => {
      const v = (window as unknown as { __goldCargo: Viewer }).__goldCargo;
      await v.loadModel(name);
      v.setTime(1);
    }, name);
    expect(
      await page.evaluate(() => {
        let count = 0;
        (
          window as unknown as { __goldCargo: Viewer }
        ).__goldCargo.model.traverse((n) => {
          if (n.isMesh) count++;
        });
        return count;
      }),
    ).toBeGreaterThan(0);
  }
  const scene = await page.evaluate(() => {
    const root = (window as unknown as { __goldCargo: Viewer }).__goldCargo
      .model;
    return {
      elephant: !!root.getObjectByName('loaded-elephant'),
      camel: !!root.getObjectByName('loaded-camel'),
      howdah: !!root.getObjectByName('golden-howdah'),
      bowl: !!root.getObjectByName('detailed-overhead-gold-bowl'),
      chest: !!root.getObjectByName('detailed-shared-treasure-chest'),
      oldBowl: root.getObjectByName('overhead-gold-bowl')?.visible,
    };
  });
  expect(scene).toEqual({
    elephant: true,
    camel: true,
    howdah: true,
    bowl: true,
    chest: true,
    oldBowl: false,
  });
  expect(errors).toEqual([]);
});
