import type { Point } from './iso';

/*
 * Massawa on the Red Sea coast, about 30 tiles south of the quarter
 * (MASSAWA in planet.ts). The Mosque of the Companions stands alone on the
 * small island; the town, market, salt pans and animals are on the mainland
 * flats across the causeway. No people are shown here: the first Hijra is
 * the story of the Sahaba, who are never depicted (AGENTS.md).
 */

/** Ground point of the mosque (front centre of its base), on the island. */
export const MOSQUE_TILE: Point = [74, 157];

/** Town pieces outside the mapped quarter: [art id, tile x, tile y]. */
export const MASSAWA_OBJECTS: [string, number, number][] = [];
