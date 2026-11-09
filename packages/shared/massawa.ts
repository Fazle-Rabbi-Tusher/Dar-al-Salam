import type { Point } from './iso';

/*
 * Massawa on the Red Sea coast in about 615 CE, about 30 tiles south of the
 * quarter (MASSAWA in planet.ts), following the owner's reference sheets: a
 * dense island town of flat-roofed coral-stone and mud-brick houses round
 * the Mosque of the Companions, with a market, palms, a well and dhows,
 * joined by a causeway to the mainland, where tents and camels stand at the
 * desert edge. No people are shown: the first Hijra is the story of the
 * Sahaba, who are never depicted (AGENTS.md).
 */

/** Ground point of the mosque (front centre of its base), mid-town. */
export const MOSQUE_TILE: Point = [72, 156];

/**
 * Town pieces outside the mapped quarter: [art id, tile x, tile y], each
 * standing on its art's anchor (the back corner of its footprint). With the
 * camera on Massawa the grid turns on screen: −y runs right, +x runs down
 * toward the viewer. The mosque rises toward −x from MOSQUE_TILE; its
 * forecourt (centre 74,156) stays open, ringed by the market.
 */
export const MASSAWA_OBJECTS: [string, number, number][] = [
  /* ── The market round the forecourt, the well below it ── */
  ['msw-stall', 73.6, 150.6],
  ['msw-stall-b-side', 73.4, 160.4],
  ['msw-stall-side', 77.0, 151.2],
  ['msw-stall-b', 77.2, 159.6],
  ['msw-well', 78.2, 155.6],
  ['msw-goods', 76.4, 153.4],
  ['msw-goods', 76.6, 158.6],
  /* ── Houses beside and behind the mosque ── */
  ['msw-house-b', 63.4, 147.6],
  ['msw-house-pink-side', 66.6, 146.6],
  ['msw-house-a', 66.8, 149.8],
  ['msw-house-d-side', 62.6, 162.4],
  ['msw-house-a-side', 66.4, 162.6],
  ['msw-house-pink', 69.6, 163.4],
  ['msw-palm', 64.4, 151.0],
  ['msw-palms', 64.6, 160.8],
  /* ── Lanes toward the shore: more houses, gardens and palms ── */
  ['msw-house-c', 72.2, 146.4],
  ['msw-house-d', 80.0, 148.4],
  ['msw-house-b-side', 73.6, 164.0],
  ['msw-house-a', 79.6, 162.0],
  ['msw-garden', 80.6, 152.2],
  ['msw-garden', 80.8, 157.6],
  ['msw-palm', 76.2, 147.6],
  ['msw-palms', 77.8, 164.2],
  ['msw-cart-side', 70.6, 149.6],
  ['m-bush', 75.2, 162.4],
  ['m-bush', 69.4, 151.2],
  /* ── Beaches: a dhow under repair, nets, a jetty and boats ── */
  ['msw-dhow-repair', 82.2, 154.0],
  ['msw-nets-side', 61.6, 154.6],
  ['msw-jetty', 82.6, 160.6],
  ['msw-dhow', 85.4, 149.0],
  ['msw-dhow', 63.2, 142.6],
  ['msw-dhow', 59.0, 160.4],
  ['msw-rowboat', 73.6, 143.0],
  ['msw-rowboat', 85.0, 162.6],
  ['msw-fish-jump', 66.0, 167.6],
  /* ── The mainland across the causeway: a Bedouin camp at the desert edge ── */
  ['msw-tent', 63.0, 133.2],
  ['msw-tent-side', 72.6, 133.0],
  ['msw-tent', 66.4, 129.6],
  ['msw-acacia', 60.0, 136.4],
  ['msw-acacia', 76.6, 136.6],
  ['msw-palm', 67.6, 137.2],
];
