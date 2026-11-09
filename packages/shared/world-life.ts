import type { Point } from './iso';
import { RAIL } from './planet';

/*
 * The world's moving life outside the quarter: a train on the railway north
 * of the quarter, taxis on the ring road and sailing ships offshore. Their
 * routes are computed from the planet by tools/world-life-scripts.ts and
 * written to content/ambient/world-life.json as ordinary deterministic
 * scripts on the 240-frame loop; this module holds the fixed pieces.
 */

/** The railway's two stations: where the train stops with its doors open. */
export const STATIONS: Point[] = [
  [RAIL.from[0] + 6, RAIL.from[1]],
  [RAIL.to[0] - 6, RAIL.to[1]],
];

/** Scenery outside the quarter: [art id, tile x, tile y]. */
export const WORLD_OBJECTS: [string, number, number][] = STATIONS.map(
  ([x, y]) =>
    // Each platform stands beside the track, behind the stopped train.
    ['land-tram-platform', x, y - 2.4] as [string, number, number],
);
