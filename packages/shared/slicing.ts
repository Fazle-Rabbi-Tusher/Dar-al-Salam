import { depth, type Point } from './iso';
/** Front boundary of a rectangular tile footprint along a vertical screen column. */
export function stripDepth(
  tile: Point,
  footprint: Point,
  screenDeltaX: number,
) {
  const delta = Math.max(
    -footprint[1],
    Math.min(footprint[0], screenDeltaX / 16),
  );
  const ty = Math.min(footprint[1], footprint[0] - delta),
    tx = ty + delta;
  return depth(tile[0] + tx, tile[1] + ty);
}
