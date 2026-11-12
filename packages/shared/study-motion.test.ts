import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import { sampleStep, characterState, scriptErrors } from './script';
import { characterSchema, type Step } from './schema';
const path: Step = {
  from: 0,
  to: 24,
  action: 'walk',
  path: [
    [0, 0],
    [3, 0],
  ],
  easing: 'smoothstep',
};
describe('eased scholar walking', () => {
  it('preserves endpoints and slows naturally at each end', () => {
    expect(sampleStep(path, 0).tile).toEqual([0, 0]);
    expect(sampleStep(path, 1).tile).toEqual([3, 0]);
    expect(sampleStep(path, 0.5).tile).toEqual([1.5, 0]);
    expect(sampleStep(path, 0.01).tile[0]).toBeLessThan(0.002);
    expect(3 - sampleStep(path, 0.99).tile[0]).toBeLessThan(0.002);
    expect(sampleStep({ ...path, easing: undefined }, 0.25).tile[0]).toBe(0.75);
  });
  it('stays monotonic and below the movement speed limit at fractional render times', () => {
    let last = sampleStep(path, 0).tile[0];
    for (let f = 0.25; f <= 24; f += 0.25) {
      const x = sampleStep(path, f / 24).tile[0];
      expect(x).toBeGreaterThanOrEqual(last);
      expect((x - last) * 4).toBeLessThan(0.25);
      last = x;
    }
  });
  it('joins the complete study routine continuously and keeps its card unapproved', async () => {
    const c = characterSchema.parse(
      JSON.parse(
        await fs.readFile('content/characters/al-khwarizmi.json', 'utf8'),
      ),
    );
    expect(c.panelApproved).toBe(false);
    expect(c.smoothMotion).toBe(true);
    expect(scriptErrors(c)).toEqual([]);
    for (let f = 0; f < 240; f++) {
      expect(characterState(c, f)).toEqual(characterState(c, f + 240));
      const a = characterState(c, f).tile,
        b = characterState(c, f + 1).tile;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(0.25);
    }
    expect(characterState(c, 239.999).tile[0]).toBeCloseTo(
      characterState(c, 0).tile[0],
      6,
    );
  });
});
