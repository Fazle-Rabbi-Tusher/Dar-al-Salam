import { readFileSync } from 'node:fs';
import { Pixels, rgb, type PixelImage } from '../../packages/shared/pixels';
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

/* ───────────── Detail pass: Floor796-style finishing for any object canvas ───────────── */
type Swatch = { r: number; g: number; b: number; l: number; hex: string };
let swatches: Swatch[] | null = null;
const lum = (r: number, g: number, b: number) =>
  0.299 * r + 0.587 * g + 0.114 * b;
/** Shades are picked only from the locked world palette, so no new colours appear. */
function palette(): Swatch[] {
  if (!swatches) {
    const list: string[] = JSON.parse(
      readFileSync('content/palettes/world-palette.json', 'utf8'),
    );
    swatches = list.map((hex) => {
      const [r, g, b] = rgb(hex);
      return { r, g, b, l: lum(r, g, b), hex: hex.toUpperCase() };
    });
  }
  return swatches;
}
const toHex = (r: number, g: number, b: number) =>
  '#' +
  [r, g, b]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
const shadeCache = new Map<string, string>();
function nearest(
  r: number,
  g: number,
  b: number,
  pick: (s: Swatch) => boolean,
) {
  let best: Swatch | null = null,
    score = Infinity;
  for (const s of palette()) {
    if (!pick(s)) continue;
    const d = (s.r - r) ** 2 + (s.g - g) ** 2 + (s.b - b) ** 2;
    if (d < score) {
      score = d;
      best = s;
    }
  }
  return best;
}
/** A darker palette colour of similar hue (about 26% darker). */
export function darker(hex: string): string {
  const key = 'd' + hex;
  let v = shadeCache.get(key);
  if (!v) {
    const [r, g, b] = rgb(hex),
      l = lum(r, g, b);
    v = nearest(r * 0.72, g * 0.72, b * 0.74, (s) => s.l < l - 8)?.hex ?? hex;
    shadeCache.set(key, v);
  }
  return v;
}
/** A lighter palette colour of similar hue. */
export function lighter(hex: string): string {
  const key = 'l' + hex;
  let v = shadeCache.get(key);
  if (!v) {
    const [r, g, b] = rgb(hex),
      l = lum(r, g, b);
    v =
      nearest(
        r + (255 - r) * 0.38,
        g + (255 - g) * 0.38,
        b + (255 - b) * 0.38,
        (s) => s.l > l + 8,
      )?.hex ?? hex;
    shadeCache.set(key, v);
  }
  return v;
}
const hash = (x: number, y: number) => {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((Math.imul(h, 1274126177) >>> 0) % 10000) / 10000;
};
export type DetailOptions = {
  /** Coloured outline around solid parts of the silhouette. */
  outline?: boolean;
  /** Lighter rim on top/left silhouette edges (light from the top-left). */
  rim?: boolean;
  /** Fraction of flat pixels that get grain marks. */
  grain?: number;
  /** Darken the lowest pixels of each column (contact / ambient occlusion). */
  contact?: boolean;
};
/** Pixels covered by a fully opaque k×k block (k = 2: shapes, k = 3: solid bodies). */
function coverMask(op: Uint8Array, w: number, h: number, k: number) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y + k <= h; y++)
    for (let x = 0; x + k <= w; x++) {
      let ok = true;
      for (let j = 0; j < k && ok; j++)
        for (let i = 0; i < k; i++)
          if (!op[(y + j) * w + x + i]) {
            ok = false;
            break;
          }
      if (ok)
        for (let j = 0; j < k; j++)
          for (let i = 0; i < k; i++) out[(y + j) * w + x + i] = 1;
    }
  return out;
}
/**
 * Finish a drawn object like hand-made isometric pixel art: darker coloured
 * outlines (not black) around solid shapes, a lit rim on top-left edges,
 * sparse grain on mid-tone surfaces, and contact shading where shapes meet
 * the ground. Thin lines, meshes, nets and lattices stay see-through: only
 * shapes at least 3 px thick are outlined.
 */
export function detailPass(p: Pixels, o: DetailOptions = {}) {
  // Canvas heights can be fractional; work on the whole rows that exist.
  const w = p.width,
    h = Math.floor(p.data.length / (4 * w)),
    src = p.data.slice(),
    at = (x: number, y: number) => (y * w + x) * 4;
  // Only fully opaque pixels count; soft shadows drawn into the art are kept.
  const op = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) op[i] = src[i * 4 + 3] === 255 ? 1 : 0;
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && op[y * w + x] === 1;
  const hexOf = (x: number, y: number) => {
    const i = at(x, y);
    return toHex(src[i], src[i + 1], src[i + 2]);
  };
  const set = (x: number, y: number, hex: string, a = 255) => {
    const [r, g, b] = rgb(hex),
      i = at(x, y);
    p.data[i] = r;
    p.data[i + 1] = g;
    p.data[i + 2] = b;
    p.data[i + 3] = a;
  };
  const shape = coverMask(op, w, h, 2),
    thick = coverMask(op, w, h, 3);
  const body = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && shape[y * w + x] === 1;
  const isThick = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && thick[y * w + x] === 1;
  /*
   * Small see-through gaps enclosed by solid shapes (between leaf clusters,
   * inside a handle) read as deep shadow, not as floor: fill them with a dark
   * shade of their surroundings. Meshes are enclosed by thin lines, not solid
   * shapes, so they stay open.
   */
  const filled = new Uint8Array(w * h);
  const fillHoles = () => {
    const seen = new Uint8Array(w * h),
      queue: number[] = [];
    const flood = (start: number) => {
      const cells: number[] = [];
      let border = false,
        thickN = 0,
        edgeN = 0;
      const tally = new Map<string, number>();
      queue.length = 0;
      queue.push(start);
      seen[start] = 1;
      while (queue.length) {
        const i = queue.pop()!,
          x = i % w,
          y = (i - x) / w;
        cells.push(i);
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (op[j]) {
            edgeN++;
            if (thick[j]) {
              thickN++;
              const c = hexOf(nx, ny);
              tally.set(c, (tally.get(c) ?? 0) + 1);
            }
          } else if (!seen[j]) {
            seen[j] = 1;
            queue.push(j);
          }
        }
      }
      if (border || cells.length > 40 || thickN < edgeN * 0.7) return;
      let best = '',
        n = 0;
      for (const [c, k] of tally)
        if (k > n) {
          n = k;
          best = c;
        }
      const fill = darker(best);
      for (const i of cells) {
        filled[i] = 1;
        set(i % w, Math.floor(i / w), fill);
      }
    };
    for (let i = 0; i < w * h; i++) if (!op[i] && !seen[i]) flood(i);
  };
  const grain = o.grain ?? 0.012;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      const c = hexOf(x, y);
      const isBody = body(x, y);
      if (o.contact !== false && isBody && !solid(x, y + 1)) {
        set(x, y, darker(c));
        continue;
      }
      if (o.rim !== false && isBody && (!solid(x, y - 1) || !solid(x - 1, y))) {
        set(x, y, lighter(c));
        continue;
      }
      if (grain <= 0 || !isThick(x, y)) continue;
      const [r, g, b] = rgb(c),
        l = lum(r, g, b);
      // Grain only on mid tones: whites and near-blacks stay clean.
      if (l > 205 || l < 45) continue;
      const flat =
        hexOf(x - 1, y) === c &&
        hexOf(x + 1, y) === c &&
        hexOf(x, y - 1) === c &&
        hexOf(x, y + 1) === c &&
        hexOf(x + 2, y) === c;
      if (flat && hash(x, y) < grain) {
        // Short darker dash: wood grain, mortar chips, fabric weave.
        set(x, y, darker(c));
        set(x + 1, y, darker(c));
      }
    }
  if (o.outline !== false) fillHoles();
  if (o.outline !== false)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (solid(x, y) || filled[y * w + x]) continue;
        // Outline colour: two shades darker than the adjacent body pixel.
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ])
          if (isThick(x + dx, y + dy)) {
            set(x, y, darker(darker(hexOf(x + dx, y + dy))));
            break;
          }
      }
  return p;
}
/**
 * Soft iso-ellipse shadow under art with no known footprint: sized from the
 * width of its lowest rows and pushed a little to the lower right.
 */
export function footShadow(p: Pixels, colour = '#493C35') {
  const { width: w, data } = p,
    h = Math.floor(data.length / (4 * w));
  // Art that already carries its own soft shadow keeps it.
  for (let i = 3; i < data.length; i += 4)
    if (data[i] && data[i] < 255) return p;
  let bottom = -1;
  for (let y = h - 1; y >= 0 && bottom < 0; y--)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3]) {
        bottom = y;
        break;
      }
  if (bottom < 0) return p;
  let lo = w,
    hi = -1;
  for (let y = Math.max(0, bottom - 6); y <= bottom; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3]) {
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
  const rx = (hi - lo) / 2 + 4,
    ry = rx / 2,
    cx = (lo + hi) / 2 + 3,
    cy = bottom - ry * 0.5 + 1;
  const [r, g, b] = rgb(colour);
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const u = (x - cx) / rx,
        v = (y - cy) / ry;
      if (u * u + v * v > 1) continue;
      const i = (y * w + x) * 4;
      if (data[i + 3]) continue;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 89;
    }
  return p;
}
/** Soft ground shadow (35% of the palette shadow colour) under a footprint. */
export function groundShadow(
  c: Pick<IsoCanvas, 'p' | 'at'>,
  w: number,
  d: number,
  colour = '#493C35',
) {
  const { p } = c,
    shade = mkPoly(c, w, d);
  const [r, g, b] = rgb(colour);
  for (const [x, y] of shade)
    if (x >= 0 && y >= 0 && x < p.width && y < p.height) {
      const i = (y * p.width + x) * 4;
      if (!p.data[i + 3]) {
        p.data[i] = r;
        p.data[i + 1] = g;
        p.data[i + 2] = b;
        p.data[i + 3] = 89;
      }
    }
}
function mkPoly(c: Pick<IsoCanvas, 'at'>, w: number, d: number) {
  // Footprint grown a little and pushed toward the lower right (light from top-left).
  const corners = [
    c.at(-0.1, -0.1),
    c.at(w + 0.35, -0.1),
    c.at(w + 0.35, d + 0.35),
    c.at(-0.1, d + 0.35),
  ];
  const xs = corners.map((q) => q[0]),
    ys = corners.map((q) => q[1]);
  const out: [number, number][] = [];
  for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
      let inside = false;
      for (let i = 0, j = 3; i < 4; j = i++) {
        const a = corners[i],
          b = corners[j];
        if (
          a[1] > y !== b[1] > y &&
          x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
        )
          inside = !inside;
      }
      if (inside) out.push([x, y]);
    }
  return out;
}
