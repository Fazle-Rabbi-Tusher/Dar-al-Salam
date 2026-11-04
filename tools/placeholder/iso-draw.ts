import { Pixels, type PixelImage } from '../../packages/shared/pixels';
export type P = [number, number];
export type P3 = [number, number, number];
/** Bresenham line in screen pixels. */
export function line(p: Pixels, a: P, b: P, c: string) {
  let x = Math.round(a[0]),
    y = Math.round(a[1]);
  const x2 = Math.round(b[0]),
    y2 = Math.round(b[1]);
  const dx = Math.abs(x2 - x),
    sx = x < x2 ? 1 : -1,
    dy = -Math.abs(y2 - y),
    sy = y < y2 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    p.pixel(x, y, c);
    if (x === x2 && y === y2) break;
    const e = 2 * err;
    if (e >= dy) {
      err += dy;
      x += sx;
    }
    if (e <= dx) {
      err += dx;
      y += sy;
    }
  }
}
/** Thick screen-space line made of filled discs. */
export function thick(p: Pixels, a: P, b: P, r: number, c: string) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n,
      y = a[1] + ((b[1] - a[1]) * i) / n;
    if (r <= 0.5) p.pixel(x, y, c);
    else p.ellipse(x, y, r, r, c);
  }
}
export type Material = {
  top: string;
  front: string;
  side: string;
  edge?: string;
  highlight?: string;
};
/**
 * Isometric drawing canvas. The anchor (ax, ay) is the screen position of tile (0, 0)
 * at floor height; `at(x, y, z)` maps tile-space points (z = pixels up) to the canvas.
 */
export function isoCanvas(
  width: number,
  height: number,
  ax: number,
  ay: number,
) {
  const p = new Pixels(width, height);
  const at = (x: number, y: number, z = 0): P => [
    ax + (x - y) * 16,
    ay + (x + y) * 8 - z,
  ];
  const poly = (v: P3[], c: string) =>
    p.poly(
      v.map((q) => at(...q)),
      c,
    );
  const edge = (a: P3, b: P3, c: string) => line(p, at(...a), at(...b), c);
  /** Horizontal face at height z. */
  const top = (
    x: number,
    y: number,
    w: number,
    d: number,
    z: number,
    c: string,
  ) =>
    poly(
      [
        [x, y, z],
        [x + w, y, z],
        [x + w, y + d, z],
        [x, y + d, z],
      ],
      c,
    );
  /** Vertical face on the plane of constant y (faces +y, the lit front). */
  const faceX = (
    x: number,
    y: number,
    w: number,
    z: number,
    h: number,
    c: string,
  ) =>
    poly(
      [
        [x, y, z],
        [x + w, y, z],
        [x + w, y, z + h],
        [x, y, z + h],
      ],
      c,
    );
  /** Vertical face on the plane of constant x (faces +x, the shaded side). */
  const faceY = (
    x: number,
    y: number,
    d: number,
    z: number,
    h: number,
    c: string,
  ) =>
    poly(
      [
        [x, y, z],
        [x, y + d, z],
        [x, y + d, z + h],
        [x, y, z + h],
      ],
      c,
    );
  const box = (
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    m: Material,
    z = 0,
  ) => {
    top(x, y, w, d, z + h, m.top);
    faceX(x, y + d, w, z, h, m.front);
    faceY(x + w, y, d, z, h, m.side);
    if (m.edge) {
      edge([x, y + d, z], [x + w, y + d, z], m.edge);
      edge([x + w, y + d, z], [x + w, y, z], m.edge);
      edge([x + w, y + d, z], [x + w, y + d, z + h], m.edge);
      edge([x, y + d, z], [x, y + d, z + h], m.edge);
      edge([x + w, y, z], [x + w, y, z + h], m.edge);
      edge([x, y, z + h], [x + w, y, z + h], m.edge);
      edge([x, y, z + h], [x, y + d, z + h], m.edge);
      edge([x + w, y, z + h], [x + w, y + d, z + h], m.edge);
    }
    if (m.highlight) {
      edge([x, y + d, z + h], [x + w, y + d, z + h], m.highlight);
    }
  };
  /** Vertical cylinder around tile point (x, y), shaded in vertical bands. */
  const cylinder = (
    x: number,
    y: number,
    z: number,
    rx: number,
    h: number,
    ramp: [string, string, string],
    topC = ramp[0],
  ) => {
    const [cx, cy] = at(x, y, z),
      ry = rx / 2;
    for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
      const u = (i - cx) / rx;
      if (Math.abs(u) > 1) continue;
      const half = ry * Math.sqrt(1 - u * u);
      const c = u < -0.45 ? ramp[0] : u > 0.35 ? ramp[2] : ramp[1];
      for (let j = Math.floor(cy - h); j <= cy + half; j++) p.pixel(i, j, c);
    }
    p.ellipse(cx, cy - h, rx, ry, topC);
  };
  const greenery = (
    x: number,
    y: number,
    z: number,
    r: number,
    ramp: [string, string, string],
    fleck?: string,
  ) => {
    const [px, py] = at(x, y, z);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4,
        k = i / 14;
      p.ellipse(
        px + Math.cos(a) * r * 0.62 * (0.4 + k),
        py + Math.sin(a) * r * 0.42 * (0.4 + k) + (k < 0.5 ? 2 : 0),
        r * 0.45,
        r * 0.32,
        // Lighter clusters on the upper-left, darker lower-right.
        Math.cos(a) + Math.sin(a) < -0.4
          ? ramp[0]
          : Math.cos(a) + Math.sin(a) > 0.6
            ? ramp[2]
            : ramp[1],
      );
    }
    p.ellipse(px - r * 0.25, py - r * 0.2, r * 0.35, r * 0.22, ramp[0]);
    if (fleck)
      for (let i = 0; i < 10; i++)
        p.pixel(
          px + ((i * 13) % Math.max(1, Math.round(r * 1.4))) - r * 0.7,
          py + ((i * 7) % Math.max(1, Math.round(r * 0.9))) - r * 0.45,
          fleck,
        );
  };
  const pot = (
    x: number,
    y: number,
    z: number,
    rx: number,
    h: number,
    ramp: [string, string, string],
    soil: string,
  ) => {
    cylinder(x, y, z, rx, h, ramp);
    const [cx, cy] = at(x, y, z + h);
    p.ellipse(cx, cy, rx - 1, rx / 2 - 1, soil);
  };
  return {
    p,
    at,
    poly,
    edge,
    top,
    faceX,
    faceY,
    box,
    cylinder,
    greenery,
    pot,
    line: (a: P, b: P, c: string) => line(p, a, b, c),
    thick: (a: P, b: P, r: number, c: string) => thick(p, a, b, r, c),
  };
}
export type IsoCanvas = ReturnType<typeof isoCanvas>;
/** Mirror an image horizontally (swaps the x and y tile axes of iso art). */
export function mirror(src: PixelImage): Pixels {
  const out = new Pixels(src.width, src.height);
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const s = (y * src.width + (src.width - 1 - x)) * 4;
      out.data.set(src.data.slice(s, s + 4), (y * src.width + x) * 4);
    }
  return out;
}
