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
  /* ── The market round the forecourt and along the lane west ── */
  ['msw-stall', -15.5, 125.5],
  ['msw-stall-side', -2.25, 112.25],
  ['msw-stall-b', -9.5, 127.5],
  ['msw-well', -3.0, 124.0],
  ['msw-goods', -4.75, 128.25],
  ['msw-stall-b-side', -19.5, 129.5],
  ['msw-stall', -14.0, 133.0],
  ['msw-goods', -17.0, 133.0],
  /* ── Houses round the mosque, rooftops behind it ── */
  ['msw-house-b', -22.5, 104.5],
  ['msw-house-a', -16.0, 100.0],
  ['msw-house-pink', -27.0, 111.0],
  ['msw-house-c-side', -9.5, 96.5],
  ['msw-house-a-side', -8.0, 104.0],
  ['msw-house-d-side', -3.0, 99.0],
  ['msw-house-pink-side', -3.0, 107.0],
  ['msw-house-b', -24.0, 119.0],
  ['msw-house-d', -18.0, 94.0],
  ['msw-house-a-side', -25.0, 98.0],
  ['msw-house-pink', -29.5, 103.5],
  ['msw-house-c', -3.0, 93.0],
  ['msw-house-a', -27.5, 90.5],
  ['msw-house-b-side', -18.0, 88.0],
  ['msw-house-d-side', -32.0, 96.0],
  /* ── Houses toward the front, south of the market ── */
  ['msw-house-a', -7.0, 134.0],
  ['msw-house-b-side', 1.0, 132.0],
  ['msw-house-pink-side', 4.0, 126.0],
  /* ── Palms, gardens and a second well ── */
  ['msw-palm', -15.75, 119.75],
  ['msw-palm', -7.0, 111.5],
  ['msw-palms', -20.5, 110.5],
  ['msw-palms', -12.5, 91.5],
  ['msw-palms', -37.5, 99.5],
  ['msw-garden', -11.5, 132.5],
  ['msw-garden', -19.5, 120.5],
  ['msw-well', -20.5, 124.5],
  /* ── The Bedouin camp on the west scrub toward the road ── */
  ['msw-tent', -31.0, 116.0],
  ['msw-tent-side', -26.5, 122.0],
  ['msw-tent', -31.5, 107.5],
  ['msw-tent-side', -37.5, 103.5],
  ['msw-cart', -34.5, 111.5],
  ['msw-acacia', -13.0, 83.0],
];
