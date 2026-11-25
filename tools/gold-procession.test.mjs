import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import {
  stateAt,
  LOOP,
  POSE_COUNT,
} from '../web/public/scenes/mansa-gold-procession/scene.js';
const root = 'web/public/scenes/mansa-gold-procession/';
const manifest = JSON.parse(readFileSync(root + 'manifest.json', 'utf8'));
const finite = (value) =>
  typeof value === 'number'
    ? Number.isFinite(value)
    : Object.values(value).every(finite);
describe('the crowned gold-procession animation', () => {
  it('retains twelve authored poses on a deterministic continuous master loop', () => {
    expect(LOOP).toBe(240);
    expect(POSE_COUNT).toBe(12);
    expect(stateAt(0)).toEqual(stateAt(240));
    expect(stateAt(-1)).toEqual(stateAt(239));
    expect(
      new Set(Array.from({ length: 240 }, (_, i) => stateAt(i).pose)).size,
    ).toBe(12);
    for (let i = 0; i < 240; i += 0.5) {
      const s = stateAt(i);
      expect(finite(s)).toBe(true);
      expect(s.camera.zoom).toBeGreaterThan(1);
      expect(s.dust).toHaveLength(96);
    }
    expect(stateAt(12.5)).not.toEqual(stateAt(12));
  });
  it('registers every hoof baseline and preserves opaque faces and clear background', async () => {
    const { data, info } = await sharp(root + 'rider.webp')
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([1024, 1536]);
    expect(manifest.frames).toHaveLength(12);
    const signatures = new Set();
    for (const f of manifest.frames) {
      expect(f.baseline).toBeGreaterThan(470);
      expect(f.baseline).toBeLessThan(512);
      expect(f.anchorX).toBeGreaterThan(120);
      expect(f.anchorX).toBeLessThan(150);
      expect(f.opaquePixels).toBeGreaterThan(40000);
      expect(data[((f.y + 2) * 1024 + f.x + 2) * 4 + 3]).toBe(0);
      const sample = await sharp(root + 'rider.webp')
        .extract({ left: f.x, top: f.y, width: 256, height: 512 })
        .raw()
        .toBuffer();
      signatures.add(sample.toString('base64'));
    }
    expect(signatures.size).toBe(12);
  });
});
