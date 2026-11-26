import { TILE_SIDE } from './planet';

/*
 * Where Mansa Musa's caravan sits in the world, shared by the rig modules
 * (kept apart from royal-caravan.ts, which imports them).
 */
/** The tile the rig's origin stands on. */
export const CARAVAN_CENTRE: [number, number] = [-36, 100];
/**
 * The rig is modelled at its own scale (a guard 79 px tall). In the world it
 * is drawn at this fraction, so its people stand as tall as the named
 * characters and the camels and elephant match the town (owner's request,
 * 2026-11-26: "they are looking too big from their surroundings").
 */
export const MODEL_SCALE = 0.8;
/** Model units (relative to the rig's origin) of a world tile. */
export const tileToModel = (tx: number, ty: number): [number, number] => [
  ((tx - CARAVAN_CENTRE[0]) * TILE_SIDE) / MODEL_SCALE,
  ((ty - CARAVAN_CENTRE[1]) * TILE_SIDE) / MODEL_SCALE,
];
