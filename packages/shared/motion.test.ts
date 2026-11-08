import { describe, expect, it } from 'vitest';
import { motionFor } from './motion';

describe('still-sprite motion', () => {
  it('is deterministic and loops on the 240-frame master loop', () => {
    for (const a of [
      'idle',
      'walk',
      'cheer',
      'kick',
      'talk',
      'guard',
    ] as const) {
      expect(motionFor(a, 7)).toEqual(motionFor(a, 7));
      expect(motionFor(a, 0)).toEqual(motionFor(a, 240));
    }
  });
  it('keeps the design: small lifts, gentle scaling and leans', () => {
    for (let f = 0; f < 240; f++)
      for (const a of ['idle', 'walk', 'cheer', 'punch', 'speech'] as const) {
        const m = motionFor(a, f);
        expect(m.lift).toBeGreaterThanOrEqual(0);
        expect(m.lift).toBeLessThanOrEqual(4);
        expect(Math.abs(m.sx - 1)).toBeLessThanOrEqual(0.05);
        expect(Math.abs(m.sy - 1)).toBeLessThanOrEqual(0.05);
        expect(Math.abs(m.lean)).toBeLessThanOrEqual(0.15);
      }
  });
  it('walks with a bob and hops when cheering', () => {
    const lifts = (a: 'walk' | 'cheer') =>
      Array.from({ length: 24 }, (_, f) => motionFor(a, f).lift);
    expect(Math.max(...lifts('walk'))).toBeGreaterThan(0.5);
    expect(Math.max(...lifts('cheer'))).toBeGreaterThan(3);
  });
});
