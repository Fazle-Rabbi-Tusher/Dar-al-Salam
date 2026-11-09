import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MASSAWA_OBJECTS, MOSQUE_TILE } from './massawa';
import { MASSAWA, inTown, tileToPlanet, wildAt } from './planet';
import type { Point } from './iso';

const biome = (t: Point) => wildAt(tileToPlanet(...t), t);
const water = (t: Point) => ['sea', 'shallows'].includes(biome(t));
/** Pieces that float, and pieces that may stand half in the water. */
const AFLOAT = new Set(['msw-dhow', 'msw-fish-jump']);
const SHORELINE = new Set(['msw-jetty']);

describe('Massawa', () => {
  it('stands the Mosque of the Companions in the heart of the town', () => {
    // Mid-town, just behind its flagstone forecourt.
    expect(['plaza', 'desert']).toContain(biome(MOSQUE_TILE));
    expect(inTown(tileToPlanet(...MOSQUE_TILE), MOSQUE_TILE)).toBe(true);
    const card = JSON.parse(
      fs.readFileSync(
        'content/landmarks/mosque-of-the-companions.json',
        'utf8',
      ),
    );
    expect(card.tile).toEqual(MOSQUE_TILE);
  });
  it('places only known art, afloat or ashore as fits', () => {
    const index = JSON.parse(fs.readFileSync('art/objects/index.json', 'utf8'));
    for (const [type, x, y] of MASSAWA_OBJECTS) {
      expect(index[type], type).toBeTruthy();
      if (SHORELINE.has(type)) continue;
      expect(water([x, y]), `${type} at ${x},${y}`).toBe(AFLOAT.has(type));
    }
  });
  it('keeps the forecourt open, the mosque unhidden and pieces apart', () => {
    const seen = new Set<string>();
    const [mx, my] = MOSQUE_TILE,
      [px, py] = MASSAWA.plaza.centre;
    for (const [type, x, y] of MASSAWA_OBJECTS) {
      const where = `${type} at ${x},${y}`;
      // Nothing on the forecourt before the façade (+x is screen-down here).
      expect(
        Math.hypot(x - px, y - py),
        `${where} is on the forecourt`,
      ).toBeGreaterThan(MASSAWA.plaza.radius);
      // Nothing inside the building's own footprint behind its base: the
      // façade faces +x+y (screen-down) here and spans ±3 tiles across.
      const back = mx + my - (x + y),
        across = Math.abs(x - y - (mx - my)) / 2;
      const under = back >= 0 && back < 6 && across < 3.5;
      expect(under, `${where} stands inside the mosque`).toBe(false);
      const key = `${Math.floor(x)},${Math.floor(y)}`;
      expect(seen.has(key), `two pieces on tile ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
