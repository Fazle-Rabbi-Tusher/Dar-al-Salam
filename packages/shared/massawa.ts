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
export const MOSQUE_TILE: Point = [-10, 117];

/**
 * Town pieces outside the mapped quarter: [art id, tile x, tile y], each
 * standing on its art's anchor (the back corner of its footprint). Here
 * the grid sits as in the quarter: +x runs right-down, +y left-down. The
 * mosque's façade faces +x+y (screen-down) from MOSQUE_TILE; its forecourt
 * stays open, ringed by the market, with rooftops and palms behind it and
 * a Bedouin camp on the scrub toward the ring road.
 */
export const MASSAWA_OBJECTS: [string, number, number][] = [
  /* ── The market round the forecourt, the well before it ── */
  ['msw-stall', -13.25, 123.25],
  ['msw-stall-side', -3.75, 113.75],
  ['msw-stall-b', -8.5, 125.5],
  ['msw-stall-b-side', -1.5, 118.5],
  ['msw-well', -4.25, 122.75],
  ['msw-goods', -5.25, 126.25],
  ['msw-goods', -0.75, 122.25],
  /* ── Houses beside the mosque, palms at its flanks ── */
  ['msw-house-b', -20.25, 121.25],
  ['msw-house-pink', -14.5, 127.5],
  ['msw-house-a-side', -6.0, 106.0],
  ['msw-house-pink-side', -2.5, 106.5],
  ['msw-palm', -15.75, 119.75],
  ['msw-palm', -7.0, 111.5],
  /* ── Rooftops behind the mosque ── */
  ['msw-house-a', -18.5, 103.5],
  ['msw-house-b-side', -11.0, 103.0],
  ['msw-house-d-side', -6.5, 99.5],
  ['msw-palms', -23.5, 109.5],
  /* ── The front of the town: a garden, a palm and two houses ── */
  ['msw-garden', -11.5, 132.5],
  ['msw-palm', -14.25, 132.25],
  ['msw-house-a', 0.75, 126.75],
  ['msw-house-b-side', -4.0, 133.0],
  /* ── The Bedouin camp on the scrub toward the road ── */
  ['msw-tent', -26.0, 114.0],
  ['msw-tent-side', -26.5, 120.5],
  ['msw-cart', -27.5, 110.5],
  ['msw-acacia', -20.0, 100.0],
];
