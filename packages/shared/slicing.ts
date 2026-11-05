import { depth, type Point } from './iso';
/** Front boundary point of a rectangular tile footprint along a vertical screen column. */
export function stripGround(
  tile: Point,
  footprint: Point,
  screenDeltaX: number,
): Point {
  const delta = Math.max(
    -footprint[1],
    Math.min(footprint[0], screenDeltaX / 16),
  );
  const ty = Math.min(footprint[1], footprint[0] - delta),
    tx = ty + delta;
  return [tile[0] + tx, tile[1] + ty];
}
/** Depth of that front boundary point. */
export function stripDepth(
  tile: Point,
  footprint: Point,
  screenDeltaX: number,
) {
  return depth(...stripGround(tile, footprint, screenDeltaX));
}
