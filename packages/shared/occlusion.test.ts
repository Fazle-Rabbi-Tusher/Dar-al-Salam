import { describe, expect, it } from 'vitest';
import {
  projectSurface,
  surfaceDepth,
  surfaceOccludes,
  type ProjectedSurface,
} from './occlusion';

const wall: ProjectedSurface = {
  // A long oblique wall: its left end is close, its right end is far away.
  vertices: new Float32Array([
    0, 100, 0.9, 100, 100, 0.3, 100, 0, 0.3, 0, 0, 0.9,
  ]),
  indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  heights: new Float32Array([0, 0, 40, 40]),
  bounds: [0, 0, 100, 100],
};
describe('character visibility against actual 3D surfaces', () => {
  it('keeps a person in front of the far end visible even when the other wall end is closer', () => {
    expect(surfaceDepth(wall, 90, 45)).toBeCloseTo(0.36);
    expect(surfaceOccludes(wall, { x: 90, y: 45, depth: 0.6 })).toBe(false);
    expect(surfaceOccludes(wall, { x: 10, y: 45, depth: 0.6 })).toBe(true);
  });
  it('keeps a cutaway plinth solid while uncovering the head and torso', () => {
    expect(surfaceOccludes(wall, { x: 10, y: 45, depth: 0.6 }, 10)).toBe(false);
    expect(surfaceOccludes(wall, { x: 10, y: 90, depth: 0.6 }, 10)).toBe(true);
    expect(surfaceDepth(wall, -1, 45)).toBe(-Infinity);
    expect(surfaceDepth(wall, 20, 101)).toBe(-Infinity);
  });
  it('uses the same camera projection and depth as native meshes after rotation', () => {
    const s = projectSurface(
      { matrix: [0, 0, 1, 0, 1, 0, -1, 0, 0], cx: 200, cy: 100, radius: 100 },
      {
        vertices: new Float32Array([
          0.2, 0.3, 0.4, 0.2, 0.1, 0.6, 0.2, 0.3, 0.6,
        ]),
        indices: new Uint32Array([0, 1, 2]),
      },
    );
    expect([...s.vertices]).toEqual([
      240,
      70,
      expect.closeTo(-0.2),
      260,
      90,
      expect.closeTo(-0.2),
      260,
      70,
      expect.closeTo(-0.2),
    ]);
    expect(surfaceDepth(s, 255, 75)).toBeCloseTo(-0.2);
    expect(surfaceOccludes(s, { x: 255, y: 75, depth: -0.3 })).toBe(true);
    expect(surfaceOccludes(s, { x: 255, y: 75, depth: -0.1 })).toBe(false);
  });
  it('ignores degenerate triangles and selects the nearest overlapping surface', () => {
    const s = {
      ...wall,
      vertices: new Float32Array([
        ...wall.vertices,
        0,
        100,
        0.97,
        100,
        100,
        0.97,
        100,
        0,
        0.97,
      ]),
      indices: new Uint32Array([...wall.indices, 4, 4, 4, 4, 5, 6]),
    };
    expect(surfaceDepth(s, 90, 45)).toBeCloseTo(0.97);
  });
});
