export const ORIGIN_X = 2048,
  ORIGIN_Y = 1460;
export type Point = [number, number];
export type Rect = { x: number; y: number; width: number; height: number };
export function worldFromTile(tx: number, ty: number, z = 0): Point {
  return [(tx - ty) * 16 + ORIGIN_X, (tx + ty) * 8 + ORIGIN_Y - z];
}
export function tileFromWorld(wx: number, wy: number): Point {
  const x = (wx - ORIGIN_X) / 16,
    y = (wy - ORIGIN_Y) / 8;
  return [(x + y) / 2, (y - x) / 2];
}
export function depth(tx: number, ty: number, layerBias = 0) {
  return (tx + ty) * 1024 + tx * 0.5 + layerBias;
}
export function screenToWorld(
  x: number,
  y: number,
  c: { x: number; y: number; zoom: number },
): Point {
  return [(x + c.x) / c.zoom, (y + c.y) / c.zoom];
}
export function intersects(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
