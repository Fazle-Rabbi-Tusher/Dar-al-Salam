import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MASSAWA_OBJECTS, MOSQUE_TILE } from './massawa';
import { MASSAWA, massawaIsland, tileToPlanet, wildAt } from './planet';
import type { Point } from './iso';

const biome = (t: Point) => wildAt(tileToPlanet(...t), t);
const water = (t: Point) => ['sea', 'shallows'].includes(biome(t));
/** Pieces that float, and pieces that may stand half in the water. */
const AFLOAT = new Set(['msw-dhow', 'msw-fish-jump']);
const SHORELINE = new Set(['msw-jetty']);

describe('Massawa', () => {
  it('stands the Mosque of the Companions on the island', () => {
    expect(biome(MOSQUE_TILE)).toBe('desert');
    expect(massawaIsland(MOSQUE_TILE)).toBeLessThan(MASSAWA.island.radius - 3);
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
  it('keeps the mosque front open and pieces from stacking', () => {
    const seen = new Set<string>();
    for (const [type, x, y] of MASSAWA_OBJECTS) {
      // On screen the façade faces +x here; nothing stands before it.
      const front =
        x > MOSQUE_TILE[0] &&
        x < MOSQUE_TILE[0] + 6 &&
        Math.abs(y - MOSQUE_TILE[1]) < 4;
      expect(front, `${type} at ${x},${y} blocks the mosque`).toBe(false);
      const key = `${Math.floor(x)},${Math.floor(y)}`;
      expect(seen.has(key), `two pieces on tile ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
