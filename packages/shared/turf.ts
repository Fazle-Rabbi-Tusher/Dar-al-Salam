import { MeshBuilder } from './laboratory';
import type { Vertex3 } from './infrastructure';

const hash = (x: number, z: number) => {
  const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
/** Short living turf: an authored albedo, restrained mowing grain, exact edge
 * clipping and actual low blades. No alternating flat green rectangle slabs. */
export function stadiumTurf(
  m: MeshBuilder,
  w: number,
  d: number,
  oval: boolean,
  y: number,
) {
  const rx = oval ? w * 0.405 : w / 2,
    rz = oval ? d * 0.405 : d / 2;
  const edge = (z: number) =>
    oval ? rx * Math.sqrt(Math.max(0, 1 - (z / rz) ** 2)) : rx;
  const step = 5;
  for (let z = -rz; z < rz - 0.001; z += step) {
    const z1 = Math.min(rz, z + step),
      x0 = edge(z),
      x1 = edge(z1);
    const band = Math.floor((z + rz) / (rz * 0.22));
    m.faces.push({
      points: [
        [-x0, y, z],
        [-x1, y, z1],
        [x1, y, z1],
        [x0, y, z],
      ],
      color: band % 2 ? '#f4f1dc' : '#e5ead4',
      material: 'turf',
    });
  }
  // About one tuft per 30 square world pixels, kept short around the wicket.
  const stride = 5.5;
  const greens = ['#4c6c2e', '#6b833b', '#5d7b36', '#7a8d48'];
  for (let z = -rz + 2; z < rz - 2; z += stride)
    for (let x = -rx + 2; x < rx - 2; x += stride) {
      const h = hash(x, z),
        xx = x + (h - 0.5) * 3,
        zz = z + (hash(z, x) - 0.5) * 3;
      if (oval && (xx * xx) / (rx * rx) + (zz * zz) / (rz * rz) > 0.97)
        continue;
      if (oval && Math.abs(xx) < w * 0.18 && Math.abs(zz) < d * 0.035) continue;
      const height = 0.32 + h * 0.56;
      const points: Vertex3[] = [
        [xx - 0.32, y + 0.01, zz],
        [xx + 0.28, y + 0.01, zz],
        [xx + (h - 0.5) * 0.45, y + height, zz + 0.22],
      ];
      m.face(points, greens[Math.floor(h * greens.length)]);
      if (h > 0.65)
        m.face(
          [
            [xx, y, zz - 0.25],
            [xx, y, zz + 0.24],
            [xx - 0.22, y + height * 0.8, zz],
          ],
          greens[(Math.floor(h * 3) + 1) % 4],
        );
    }
}
