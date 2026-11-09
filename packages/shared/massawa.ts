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
  ['sup-datepalm', -17.75, 123.75],
  ['sup-datepalms', -6.25, 112.25],
  /* ── The market on the square's outer edge, the well before it ── */
  ['sup-stall2-0', -15.0, 128.0],
  ['sup-stall2-1', -2.25, 115.25],
  ['sup-stall2-2', -8.5, 128.5],
  ['sup-stall2-3', -1.5, 121.5],
  ['sup-well2-1', -4.25, 125.75],
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
  /* ── The Bedouin camp on the west sand: tents, a cart, crates and jars ── */
  ['sup-tent2-0', -31, 112],
  ['sup-tent2-3', -32.5, 107],
  ['msw-cart', -30.5, 103.5],
  ['sup-crates', -29, 110.5],
  ['sup-jars', -30, 114.5],

  /*
   * ── Desert landscape (the owner's multi-angle desert set) ──
   * Three-quarter pieces with real volume: dune and rock-mesa tiles with
   * their sides cut away, the oasis, a fortress on the outskirts. Each
   * multi-view piece shows a different side where it appears twice.
   */
  // North: dunes and mesas beyond the caravan's track, a dead tree.
  ['sup-dunes-0', -15, 91.5],
  ['sup-dunes-2', -4, 91],
  ['sup-mesa-1', -25, 93.5],
  ['sup-rocks2', -9.5, 94.5],
  ['sup-deadtree2', -29, 98.5],
  // The oasis: a pool ringed by date palms (MASSAWA.oasis).
  ['sup-oasis-1', -24, 103],
  // A fortress on the far north-west sand.
  ['sup-fort-0', -36, 97],
  // South: rocks and shrubs between the houses and the road.
  ['sup-rocks2', -16.5, 134.5],
  ['sup-shrub-c', -7, 140.5],
  ['sup-tuft-b', -13.5, 137.5],
  ['sup-mesa-3', -2, 141],
];
