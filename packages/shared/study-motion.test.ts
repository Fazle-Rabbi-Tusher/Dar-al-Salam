import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import { sampleStep, characterState, scriptErrors } from './script';
import { characterSchema, type Step } from './schema';

/*
 * Al-Khwārizmī's study routine (owner's study-animation pack, adapted to the
 * maths lab): eased walks between reading, his writing desk and the
 * calculating machines. Adapted from the pack's own test.
 */
const walk: Step = {
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
  it('keeps the end points and slows gently at each end', () => {
    expect(sampleStep(walk, 0).tile).toEqual([0, 0]);
    expect(sampleStep(walk, 1).tile).toEqual([3, 0]);
    expect(sampleStep(walk, 0.5).tile).toEqual([1.5, 0]);
    expect(sampleStep(walk, 0.01).tile[0]).toBeLessThan(0.002);
    expect(3 - sampleStep(walk, 0.99).tile[0]).toBeLessThan(0.002);
    // Without easing a path is walked at an even pace.
    expect(sampleStep({ ...walk, easing: undefined }, 0.25).tile[0]).toBe(0.75);
  });
  it('only ever moves forwards', () => {
    let last = 0;
    for (let f = 1; f <= 24; f++) {
      const x = sampleStep(walk, f / 24).tile[0];
      expect(x).toBeGreaterThanOrEqual(last);
      last = x;
    }
  });
  it('joins his whole routine up, at a walking pace, and keeps the card unapproved', async () => {
    const c = characterSchema.parse(
      JSON.parse(
        await fs.readFile('content/characters/al-khwarizmi.json', 'utf8'),
      ),
    );
    expect(c.panelApproved).toBe(false);
    expect(scriptErrors(c)).toEqual([]);
    expect(new Set(c.script.map((s) => s.action))).toEqual(
      new Set(['read', 'write', 'teach', 'idle', 'walk']),
    );
    for (let f = 0; f < 240; f++) {
      expect(characterState(c, f)).toEqual(characterState(c, f + 240));
      const a = characterState(c, f).tile,
        b = characterState(c, f + 1).tile;
      // No jumps: under a quarter tile a tick (3 tiles a second at most).
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(0.25);
    }
  });
});
