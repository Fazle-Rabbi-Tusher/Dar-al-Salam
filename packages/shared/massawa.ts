import type { Point } from './iso';

/*
 * Massawa in about 615 CE, following the owner's reference sheets: a dense
 * town of flat-roofed coral-stone and mud-brick houses round the Mosque of
 * the Companions, with a market, palms, a well and tents with camels at its
 * edge. It stands where the owner marked it: in the woods just south-west of
 * the quarter, between the quarter and the ring road (MASSAWA in
 * planet.ts). No people are shown: the first Hijra is the story of the
 * Sahaba, who are never depicted (AGENTS.md).
 */

/** Ground point of the mosque (front centre of its base), mid-town. */
export const MOSQUE_TILE: Point = [-12.5, 117.5];

/**
 * Town pieces outside the mapped quarter: [art id, tile x, tile y], each
 * standing on its art's anchor (the back corner of its footprint). Here
 * the grid sits as in the quarter: +x runs right-down, +y left-down. The
 * mosque's façade faces +x+y (screen-down) from MOSQUE_TILE; its forecourt
 * stays open, ringed by the market, with rooftops and palms behind it and
 * a Bedouin camp on the scrub toward the ring road.
 */
export const MASSAWA_OBJECTS: [string, number, number][] = [
  /* ── The mosque: date palms at its flanks, a low compound wall either side ── */
  ['msw-palm', -17.75, 123.75],
  ['msw-palm', -6.25, 112.25],
  /* ── The market on the square's outer edge, the well before it ── */
  ['msw-stall', -15.0, 128.0],
  ['msw-stall-side', -2.25, 115.25],
  ['msw-stall-b', -8.5, 128.5],
  ['msw-stall-b-side', -1.5, 121.5],
  ['sup-well', -4.25, 125.75],
  ['msw-goods', -11.5, 130.5],
  ['msw-goods', -0.25, 126.25],
  /* ── Houses set back round the square, every design different ── */
  ['msw-house-ochre', -6.5, 106.5],
  ['msw-store', -2.0, 110.0],
  ['msw-house-white', -3.0, 104.0],
  ['msw-house-b', -23.0, 125.0],
  ['msw-tower-house', -27.0, 119.0],
  ['msw-house-pink', -18.0, 131.0],
  ['msw-house-c', -9.5, 133.5],
  ['msw-house-a', -2.0, 132.0],
  ['msw-house-d-side', 3.5, 127.5],
  ['msw-house-white-side', -10.5, 137.5],
  ['msw-house-long', -4.5, 137.5],
  ['msw-house-pink-side', 5.0, 131.0],
  ['msw-store-side', -13.5, 134.5],
  ['msw-house-terrace', 1.0, 136.0],
  /* ── A garden plot at the front of the town ── */
  ['msw-garden', 1.0, 140.0],
  /* ── Two tents and a cart on the west scrub (dunes and an oasis go behind the mosque) ── */
  ['sup-tent', -31, 112],
  ['sup-tent', -32.5, 107],
  ['msw-cart', -30.5, 103.5],

  /* ── Desert landscape (cut from the owner's desert and camel sheets) ── */
  // North: dunes, rocks and a dead tree beyond the caravan's track.
  ['sup-dune-c', -15, 92.5],
  ['sup-dune-a', -3.5, 92],
  ['sup-rocks-a', -24.5, 94.5],
  ['sup-rocks-f', -9, 93.5],
  ['sup-deadtree', -28.5, 98.5],
  ['sup-tuft-b', -19.5, 94.5],
  // The oasis pool (MASSAWA.oasis): palms behind, low shrubs in front.
  ['sup-palm-c', -26.5, 100.5],
  ['sup-palm-a', -21.5, 100.3],
  ['sup-palm-b', -24, 99.6],
  ['sup-palm-d', -26.8, 105.5],
  ['sup-shrub-b', -21, 105.8],
  ['sup-tuft-a', -20.5, 99],
  ['sup-shrub-a', -27.6, 103],
  ['sup-camel-front-pale', -19.5, 104],
  // The camp: crates, jars and resting camels by the tents.
  ['sup-crates', -29, 110.5],
  ['sup-jars', -30, 114.5],
  ['sup-camel-side', -28.5, 115.5],
  ['sup-camel-back', -29.5, 104.5],
  ['sup-camel-side-dark', -26, 111.5],
  // South: rocks and shrubs between the houses and the road.
  ['sup-rocks-d', -16.5, 134.5],
  ['sup-shrub-c', -7, 140.5],
  ['sup-tuft-b', -13.5, 137.5],
  ['sup-rocks-c', -1.5, 139.5],
  // A camel by the town well.
  ['sup-camel-front', -4.2, 129.2],
];
