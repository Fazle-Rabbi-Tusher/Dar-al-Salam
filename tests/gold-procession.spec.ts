import { test, expect } from '@playwright/test';

type Player = {
  frame: number;
  state: { pose: number };
  manifest: { poseCount: number; loopTicks: number };
  canvas: HTMLCanvasElement;
  setFrame(frame: number): { pose: number };
};
declare global {
  interface Window {
    __procession: Player;
  }
}

test('the portable procession retains every pose, loops exactly and pauses playback', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const responses: number[] = [];
  page.on('response', (r) => responses.push(r.status()));
  await page.goto('http://127.0.0.1:8130/index.html');
  await page.waitForFunction(() => !!window.__procession);
  await expect(
    page.getByRole('button', { name: 'Play animation' }),
  ).toBeVisible();
  const proof = await page.evaluate(() => {
    const p = window.__procession;
    const images = new Set<string>(),
      poses = new Set<number>();
    for (let i = 0; i < 12; i++) {
      poses.add(p.setFrame(i).pose);
      images.add(p.canvas.toDataURL());
    }
    p.setFrame(0);
    const start = p.canvas.toDataURL();
    p.setFrame(240);
    return {
      poses: poses.size,
      images: images.size,
      loop: start === p.canvas.toDataURL(),
      width: p.canvas.width,
      height: p.canvas.height,
      manifest: p.manifest,
    };
  });
  expect(proof.poses).toBe(12);
  expect(proof.images).toBe(12);
  expect(proof.loop).toBe(true);
  expect([proof.width, proof.height]).toEqual([1080, 1080]);
  expect(proof.manifest.poseCount).toBe(12);
  expect(proof.manifest.loopTicks).toBe(240);
  const frame = () => page.evaluate(() => window.__procession.frame);
  expect(await frame()).toBe(0);
  await page.getByRole('button', { name: 'Play animation' }).click();
  await expect.poll(frame).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  const paused = await frame();
  await page.waitForTimeout(300);
  expect(await frame()).toBe(paused);
  await page.getByLabel('Animation timeline').fill('120');
  expect(await frame()).toBe(120);
  expect(errors).toEqual([]);
  expect(responses.every((status) => status === 200)).toBe(true);
});

test('the mobile preview fits the screen and starts playing when motion is allowed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:8130/index.html');
  await page.waitForFunction(() => !!window.__procession);
  await expect(
    page.getByRole('button', { name: 'Pause animation' }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__procession.frame))
    .toBeGreaterThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await expect(
    page.getByRole('link', { name: 'Download MP4' }),
  ).toHaveAttribute('href', 'mansa-gold-procession-animation.mp4');
});
