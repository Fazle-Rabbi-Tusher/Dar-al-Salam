import type { Point } from './iso';

/*
 * Massawa on the Red Sea coast, about 30 tiles south of the quarter
 * (MASSAWA in planet.ts). The Mosque of the Companions stands alone on the
 * small island; the town, market and animals are on the mainland across
 * the causeway. No people are shown here: the first Hijra is
 * the story of the Sahaba, who are never depicted (AGENTS.md).
 */

/** Ground point of the mosque (front centre of its base), on the island. */
export const MOSQUE_TILE: Point = [74, 157];

/**
 * Town pieces outside the mapped quarter: [art id, tile x, tile y], each
 * standing on its art's anchor (the back corner of its footprint). With the
 * camera on Massawa the grid turns on screen: −y runs right, +x runs down
 * toward the viewer. The town sits on the sand by the causeway's landing;
 * wild acacias and doum palms on the scrub around it come from the build.
 */
export const MASSAWA_OBJECTS: [string, number, number][] = [
  /* ── The town on the sand by the landing (x 63–72, y 129–138) ── */
  ['msw-house-b', 63.6, 131.0],
  ['msw-house-a', 63.6, 135.6],
  ['msw-house-c-side', 67.4, 129.4],
  ['msw-well', 67.6, 134.0],
  ['msw-stall', 67.2, 136.4],
  ['msw-house-a-side', 71.0, 131.0],
  ['msw-jars', 70.6, 134.4],
  ['msw-hut', 71.2, 136.2],
  ['msw-palm', 62.8, 137.6],
  ['msw-palm', 75.4, 137.6],
  /* ── The beach where the causeway lands ── */
  ['msw-nets', 65.6, 138.4],
  ['msw-dhow-beached-side', 72.0, 138.6],
  /* ── Open sand and scrub inland (x 47–62, y 129–137): one acacia ── */
  ['msw-acacia', 54.0, 132.4],
  /* ── The island: palms and a boat at its rim; the forecourt stays open ── */
  ['msw-palm', 68.6, 163.2],
  ['msw-palm', 66.8, 151.4],
  ['msw-palm', 78.0, 162.2],
  ['msw-dhow-beached-side', 78.4, 151.2],
  ['msw-jetty', 80.2, 152.6],
  /* ── Afloat: dhows under sail and leaping fish ── */
  ['msw-dhow', 58.4, 150.4],
  ['msw-dhow', 83.2, 146.2],
  ['msw-dhow', 57.2, 160.6],
  ['msw-fish-jump', 64.5, 146.5],
  ['msw-fish-jump', 61.5, 157.5],
];
