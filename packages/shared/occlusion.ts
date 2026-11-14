import { apply, type Frame, type Vec3 } from './planet';
import type { Point } from './iso';

export type Surface = {
  vertices: Float32Array;
  indices: Uint32Array;
  heights?: Float32Array;
};
export type ProjectedSurface = {
  vertices: Float32Array;
  indices: Uint32Array;
  heights?: Float32Array;
  bounds: [number, number, number, number];
};
export type VisibilityProbe = {
  x: number;
  y: number;
  depth: number;
  tile?: Point;
};

/** Project the actual triangles, never an object's nearest footprint corner.
 * The same interpolated depth is used by the GPU, wall cutaways and picking. */
export function projectSurface(f: Frame, s: Surface): ProjectedSurface {
  const vertices = new Float32Array(s.vertices.length),
    bounds: [number, number, number, number] = [
      Infinity,
      Infinity,
      -Infinity,
      -Infinity,
    ];
  for (let i = 0; i < s.vertices.length; i += 3) {
    const p = apply(f.matrix, [
        s.vertices[i],
        s.vertices[i + 1],
        s.vertices[i + 2],
      ] as Vec3),
      x = f.cx + p[0] * f.radius,
      y = f.cy - p[1] * f.radius;
    vertices.set([x, y, p[2]], i);
    bounds[0] = Math.min(bounds[0], x);
    bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.max(bounds[2], x);
    bounds[3] = Math.max(bounds[3], y);
  }
  return { ...s, vertices, bounds };
}
export function surfaceDepth(
  s: ProjectedSurface,
  x: number,
  y: number,
  cutHeight = Infinity,
) {
  const b = s.bounds;
  if (x < b[0] || y < b[1] || x > b[2] || y > b[3]) return -Infinity;
  let depth = -Infinity;
  const v = s.vertices,
    ids = s.indices;
  for (let i = 0; i < ids.length; i += 3) {
    const a = ids[i] * 3,
      c = ids[i + 1] * 3,
      d = ids[i + 2] * 3,
      determinant =
        (v[c + 1] - v[d + 1]) * (v[a] - v[d]) +
        (v[d] - v[c]) * (v[a + 1] - v[d + 1]);
    if (Math.abs(determinant) < 1e-8) continue;
    const u =
        ((v[c + 1] - v[d + 1]) * (x - v[d]) + (v[d] - v[c]) * (y - v[d + 1])) /
        determinant,
      w =
        ((v[d + 1] - v[a + 1]) * (x - v[d]) + (v[a] - v[d]) * (y - v[d + 1])) /
        determinant,
      z = 1 - u - w;
    if (u < -0.00001 || w < -0.00001 || z < -0.00001) continue;
    const height = s.heights
      ? u * s.heights[ids[i]] +
        w * s.heights[ids[i + 1]] +
        z * s.heights[ids[i + 2]]
      : 0;
    if (height > cutHeight) continue;
    depth = Math.max(depth, u * v[a + 2] + w * v[c + 2] + z * v[d + 2]);
  }
  return depth;
}
export function surfaceOccludes(
  s: ProjectedSurface,
  p: VisibilityProbe,
  cutHeight = Infinity,
) {
  return surfaceDepth(s, p.x, p.y, cutHeight) > p.depth + 1e-5;
}
