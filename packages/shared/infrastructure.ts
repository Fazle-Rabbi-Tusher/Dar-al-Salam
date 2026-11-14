import type { Point } from './iso';
import { laboratoryKind, laboratoryModel } from './laboratory';
import { sportsKind, sportsModel } from './sports';

/** Model-space X/Z follow the existing tile footprint; Y is height in world px. */
export type Vertex3 = [number, number, number];
export type Face3 = { points: Vertex3[]; color: string; opacity?: number };
export type InfrastructureModel = {
  kind: string;
  faces: Face3[];
  height: number;
};
const nature =
  /(?:^|[-])(tree|pine|oak|birch|cherry|palm|cypress|olive|bush|flowers|rock|rocks|waterfall|ship|beach)(?:-|$)/;
const supplied = /^(khwarizmi-|menk-|sup-|msw-|land-)/;
// Main's authored mathematical instruments keep their individual source art.
const mathematicalArt =
  /^m-(model-case|chalkboard|seminar-table|book-cart|tally-sticks|counting-board|abacus|antikythera|napiers-bones|slide-rule|pascaline|stepped-reckoner|difference-engine|analytical-engine|curta|planimeter|nomogram|graphing-calculator|drafting-set|integraph|harmonic-analyzer|differential-analyzer|mainframe)(?:-|$)/;
export function infrastructureKind(type: string): string | null {
  const sports = sportsKind(type);
  if (sports) return sports;
  const laboratory = laboratoryKind(type);
  if (laboratory) return laboratory;
  if (
    nature.test(type) ||
    supplied.test(type) ||
    mathematicalArt.test(type) ||
    type === 'bowl' ||
    type === 'feeder' ||
    /carpet|pitch|court|crosswalk|octagon-mat|hall-carpet|shapla-pond/.test(
      type,
    )
  )
    return null;
  if (/tower-tall|skyscraper-deco|broadcast-tower/.test(type))
    return 'clock-tower';
  if (/tower-slim|skyscraper-glass/.test(type)) return 'glass-tower';
  if (/baitul-mukarram/.test(type)) return 'grand-mosque';
  if (/dome/.test(type)) return 'dome';
  if (/minaret/.test(type)) return 'minaret';
  if (/city-hall|school|hospital-stand|ambulance-centre/.test(type))
    return 'civic';
  if (/brownstone|brick-building/.test(type)) return 'residence';
  if (/awning-shop|bodega|newsstand|market|tea-stall|apothecary/.test(type))
    return 'market';
  if (/bus-shelter|subway|tunnel/.test(type)) return 'transit';
  if (/traffic-signal/.test(type)) return 'traffic-signal';
  if (/road-dashes/.test(type)) return 'road-marking';
  if (/street-lamp|city-lamp|utility-pole|lantern|floodlight/.test(type))
    return 'smart-light';
  if (
    /screen-wall|backdrop|whiteboard|scoreboard|ad-boards|arena-banner/.test(
      type,
    )
  )
    return 'display';
  if (
    /glasswall|whitewall|archwall|arcade|bm-arcade|windowwall|bookwall|screen-wall|backdrop/.test(
      type,
    )
  )
    return 'facade';
  if (/gate|mosque-door|pavilion/.test(type)) return 'portal';
  if (/taxi|rickshaw/.test(type)) return 'electric-car';
  if (/solar/.test(type)) return 'solar';
  if (/fountain|wudu|water-basin/.test(type)) return 'water';
  if (
    /bookshelf|bookcase|food-shelf|server-rack|fridge|vending|rack|shoe-rack/.test(
      type,
    )
  )
    return 'cabinet';
  if (/bench|seats|chairs|stool|dugout/.test(type)) return 'seating';
  if (/desk|table|counter|lab-bench|workbench|cart|reception|podium/.test(type))
    return 'workstation';
  if (/bed|curtain|iv-stand|monitor/.test(type)) return 'care';
  if (/planter|desk-plant/.test(type)) return 'planter';
  if (
    /goal|hoop|flag|cage|ropes|railing|lowwall|ad-board|scoreboard|banner|whiteboard/.test(
      type,
    )
  )
    return 'frame';
  if (/stage|ring-base|stand|stairs|steps|riser/.test(type)) return 'platform';
  return 'fixture';
}
const BASE_PALETTE = {
  stone: '#e6dfcb',
  edge: '#c6b99e',
  white: '#f5f0df',
  glass: '#3f879b',
  sky: '#83c8d1',
  dark: '#173e53',
  teal: '#25766d',
  bronze: '#b18a48',
  wood: '#795a3d',
  solar: '#294f77',
  leaf: '#4f8261',
  light: '#ffe3a1',
};
export function infrastructureModel(
  type: string,
  footprint: Point,
  variant = 0,
): InfrastructureModel | null {
  const kind = infrastructureKind(type);
  if (!kind) return null;
  const sports = sportsModel(type, footprint);
  if (sports) return sports;
  const laboratory = laboratoryModel(type, footprint);
  if (laboratory) return laboratory;
  // Authored instance variation stays stable when the planet turns or reloads.
  const seed = Math.abs(Math.trunc(variant));
  const C = { ...BASE_PALETTE };
  if (kind === 'residence') {
    C.stone = /brick/.test(type)
      ? ['#b55145', '#c66b55', '#913f3c'][seed % 3]
      : ['#d8c3a3', '#c37359', '#a34d44', '#d7dce0'][seed % 4];
    C.edge = '#a67a64';
    C.glass = '#26475f';
  } else if (kind === 'clock-tower') {
    C.stone = '#b75d50';
    C.edge = '#84443f';
    C.glass = '#243f57';
    C.teal = '#9a4e43';
  } else if (kind === 'glass-tower') {
    C.stone = '#3e627c';
    C.edge = '#213f58';
    C.glass = ['#4288b2', '#326b94', '#548fb1'][seed % 3];
    C.sky = '#acd7e7';
  }
  const faces: Face3[] = [];
  let height = 0;
  const rotate =
    type.endsWith('-side') &&
    [
      'cabinet',
      'electric-car',
      'frame',
      'seating',
      'display',
      'residence',
      'traffic-signal',
      'road-marking',
    ].includes(kind);
  const w = Math.max(7, footprint[rotate ? 1 : 0] * 22.627),
    d = Math.max(7, footprint[rotate ? 0 : 1] * 22.627);
  function face(points: Vertex3[], color: string) {
    faces.push({ points: points.map((p) => [...p] as Vertex3), color });
    height = Math.max(height, ...points.map((p) => p[1]));
  }
  function box(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
  ) {
    const a = x - sx / 2,
      b = x + sx / 2,
      c = y - sy / 2,
      e = y + sy / 2,
      f = z - sz / 2,
      g = z + sz / 2;
    face(
      [
        [a, c, f],
        [a, e, f],
        [b, e, f],
        [b, c, f],
      ],
      color,
    );
    face(
      [
        [b, c, g],
        [b, e, g],
        [a, e, g],
        [a, c, g],
      ],
      color,
    );
    face(
      [
        [a, c, g],
        [a, e, g],
        [a, e, f],
        [a, c, f],
      ],
      color,
    );
    face(
      [
        [b, c, f],
        [b, e, f],
        [b, e, g],
        [b, c, g],
      ],
      color,
    );
    face(
      [
        [a, e, f],
        [a, e, g],
        [b, e, g],
        [b, e, f],
      ],
      color,
    );
    face(
      [
        [a, c, g],
        [a, c, f],
        [b, c, f],
        [b, c, g],
      ],
      color,
    );
  }
  function ring(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: string,
    top = r,
    n = 8,
  ) {
    const low: Vertex3[] = [],
      high: Vertex3[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n;
      low.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]);
      high.push([x + Math.cos(a) * top, y + h, z + Math.sin(a) * top]);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      face(
        top < 0.001
          ? [low[i], high[i], low[j]]
          : [low[i], high[i], high[j], low[j]],
        color,
      );
    }
    if (top > 0.001) face(high.slice().reverse(), color);
    face(low, color);
  }
  function beam(a: Vertex3, b: Vertex3, width: number, color: string) {
    const v = b.map((q, i) => q - a[i]),
      len = Math.hypot(...v);
    if (len < 0.01) return;
    const u: Vertex3 =
      Math.abs(v[1] / len) > 0.9
        ? [1, 0, 0]
        : [-v[2] / Math.hypot(v[0], v[2]), 0, v[0] / Math.hypot(v[0], v[2])];
    const n: Vertex3 = [
      (v[1] * u[2] - v[2] * u[1]) / len,
      (v[2] * u[0] - v[0] * u[2]) / len,
      (v[0] * u[1] - v[1] * u[0]) / len,
    ];
    const pts = (p: Vertex3) =>
      [-1, 1].flatMap((s) =>
        [-1, 1].map(
          (t) =>
            p.map((q, i) => q + ((u[i] * s + n[i] * t) * width) / 2) as Vertex3,
        ),
      );
    const A = pts(a),
      B = pts(b);
    for (const [i, j] of [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
    ])
      face([A[i], B[i], B[j], A[j]], color);
    face([B[0], B[1], B[3], B[2]], color);
  }
  function arch(
    x: number,
    z: number,
    y: number,
    span: number,
    h: number,
    thick = 2,
  ) {
    beam([x - span / 2, y, z], [x - span / 2, y + h * 0.65, z], thick, C.stone);
    beam([x + span / 2, y, z], [x + span / 2, y + h * 0.65, z], thick, C.stone);
    for (const s of [-1, 1]) {
      let a: Vertex3 = [x + (s * span) / 2, y + h * 0.65, z];
      for (let k = 1; k <= 5; k++) {
        const t = k / 5,
          b: Vertex3 = [
            x + ((s * span) / 2) * (1 - t * t),
            y + h * (0.65 + 0.35 * t),
            z,
          ];
        beam(a, b, thick, C.stone);
        a = b;
      }
    }
  }
  function screen(x: number, z: number, y: number, span: number, h: number) {
    for (let k = 0; k < 5; k++) {
      const xx = x - span / 2 + (k * span) / 4;
      beam([xx, y, z], [xx, y + h, z], 0.8, C.bronze);
    }
    for (let k = 0; k < 4; k++) {
      const xx = x - span / 2 + (k * span) / 4;
      beam([xx, y, z], [xx + span / 4, y + h, z], 0.7, C.bronze);
      beam([xx, y + h, z], [xx + span / 4, y, z], 0.7, C.bronze);
    }
  }
  function windows(y: number, h: number, cols = 4, front = d / 2 + 0.5) {
    const cell = (w * 0.85) / cols;
    for (let j = 0; j < cols; j++) {
      const x = -w * 0.425 + (j + 0.5) * cell;
      box(x, y, front, cell * 0.72, h, 1, C.glass);
      box(x - cell * 0.25, y, front + 0.6, cell * 0.1, h * 0.92, 0.6, C.sky);
    }
  }
  function solar(x: number, y: number, z: number, sx: number, sz: number) {
    box(x, y, z, sx, 1.5, sz, C.dark);
    box(x, y + 1, z, sx * 0.94, 0.5, sz * 0.94, C.solar);
    for (let k = 1; k < 5; k++)
      box(x - sx / 2 + (k * sx) / 5, y + 1.4, z, 0.45, 0.3, sz * 0.9, C.sky);
  }
  function palmPot(x: number, y: number, z: number) {
    ring(x, y, z, 3, 5, C.white, 4);
    beam([x, y + 5, z], [x, y + 14, z], 1.3, C.wood);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      beam(
        [x, y + 14, z],
        [x + Math.cos(a) * 7, y + 16, z + Math.sin(a) * 7],
        2.8,
        C.leaf,
      );
    }
  }
  function shell(h: number, tiers = 1) {
    box(0, 2, 0, w + 3, 4, d + 3, C.edge);
    box(0, h / 2 + 3, 0, w, h, d, C.stone);
    box(0, h + 4, 0, w + 4, 3, d + 4, C.white);
    for (let level = 0; level < tiers; level++) {
      const wy = 24 + (level * (h - 42)) / Math.max(1, tiers - 1);
      windows(
        wy,
        Math.min(24, (h / tiers) * 0.6),
        Math.max(2, Math.min(6, Math.floor(w / 15))),
      );
      // Rear elevations matter on a freely rotatable world.
      for (let j = 0; j < 4; j++) {
        const x = -w * 0.34 + j * w * 0.225;
        box(
          x,
          wy,
          -d / 2 - 0.6,
          w * 0.14,
          Math.min(24, (h / tiers) * 0.6),
          1,
          C.glass,
        );
        box(x, wy - 8, -d / 2 - 1.2, w * 0.17, 1.5, 2, C.edge);
      }
      for (const s of [-1, 1]) {
        box(
          s * (w / 2 + 0.4),
          24 + (level * (h - 42)) / Math.max(1, tiers - 1),
          0,
          1,
          Math.min(24, (h / tiers) * 0.6),
          d * 0.72,
          C.glass,
        );
        box(
          s * (w / 2 + 1),
          16 + (level * (h - 18)) / Math.max(1, tiers - 1),
          -d * 0.15,
          0.7,
          7,
          d * 0.05,
          C.sky,
        );
      }
    }
    for (const x of [-w * 0.43, w * 0.43])
      box(x, h / 2 + 4, d / 2 + 1, 2, h, 3, C.edge);
  }
  function canopy(y: number) {
    box(0, y, 0, w + 6, 3, d + 6, C.white);
    box(0, y - 2, 0, w + 3, 1, d + 3, C.teal);
  }
  switch (kind) {
    case 'clock-tower':
    case 'glass-tower': {
      const h =
        kind === 'clock-tower'
          ? type === 'm-tower-tall'
            ? 370
            : type.includes('broadcast')
              ? 286
              : 255
          : 175 + (seed % 5) * 23 + (type.includes('skyscraper') ? 38 : 0);
      shell(h, Math.round(h / 28));
      if (kind === 'glass-tower') {
        box(0, h * 0.51, d / 2 + 0.8, w * 0.85, h * 0.91, 1.4, C.glass);
        box(0, h * 0.51, -d / 2 - 0.8, w * 0.85, h * 0.91, 1.4, C.glass);
        for (const side of [-1, 1])
          box(
            side * (w / 2 + 0.7),
            h * 0.51,
            0,
            1.4,
            h * 0.91,
            d * 0.85,
            C.glass,
          );
        for (let y = 14; y < h; y += 23) {
          box(0, y, d / 2 + 2, w * 0.94, 1.5, 3, C.edge);
          box(0, y, -d / 2 - 2, w * 0.94, 1.5, 3, C.edge);
          for (const side of [-1, 1])
            box(side * (w / 2 + 1.8), y, 0, 3, 1.5, d * 0.94, C.edge);
        }
        // Broken, pale reflections rather than a single flat glass rectangle.
        for (let j = 0; j < 4; j++) {
          const x = -w * 0.33 + j * w * 0.22;
          for (const side of [-1, 1]) {
            box(
              x,
              h * (0.35 + j * 0.08),
              side * (d / 2 + 1.6),
              w * 0.045,
              h * 0.35,
              0.5,
              C.sky,
            );
            box(
              side * (w / 2 + 1.5),
              h * (0.48 + j * 0.07),
              -d * 0.33 + j * d * 0.22,
              0.5,
              h * 0.22,
              d * 0.08,
              C.sky,
            );
            box(x, h * 0.51, side * (d / 2 + 2.1), 1, h * 0.91, 1, C.edge);
          }
        }
      }

      for (let i = 0; i < 5; i++)
        box(
          -w / 2 + 4 + (i * (w - 8)) / 4,
          h * 0.52,
          d / 2 + 1.5,
          1.8,
          h * 0.85,
          1.3,
          i % 2 ? C.bronze : C.white,
        );
      for (let i = 0; i < 4; i++)
        box(0, h * 0.25 + i * h * 0.2, 0, w + 4, 2, d + 4, C.edge);
      if (kind === 'clock-tower') {
        box(0, h + 18, 0, w * 0.84, 30, d * 0.84, C.dark);
        ring(0, h + 35, 0, w * 0.54, 12, C.bronze, w * 0.3);
        ring(0, h + 47, 0, w * 0.3, 35, C.teal, 1);
        const rad = Math.min(w, d) * 0.3;
        for (let side = 0; side < 4; side++) {
          const a = (side * Math.PI) / 2;
          const clockPoint = (x: number, y: number, depth: number): Vertex3 => [
            Math.cos(a) * x - Math.sin(a) * depth,
            h + 18 + y,
            Math.sin(a) * x + Math.cos(a) * depth,
          ];
          const depth = (side % 2 ? w : d) * 0.43;
          face(
            Array.from({ length: 16 }, (_, k) =>
              clockPoint(
                Math.cos((k * Math.PI) / 8) * rad,
                Math.sin((k * Math.PI) / 8) * rad,
                depth,
              ),
            ),
            C.white,
          );
          for (let k = 0; k < 12; k++) {
            const t = (k * Math.PI) / 6;
            beam(
              clockPoint(
                Math.cos(t) * rad * 0.79,
                Math.sin(t) * rad * 0.79,
                depth + 0.6,
              ),
              clockPoint(
                Math.cos(t) * rad * 0.92,
                Math.sin(t) * rad * 0.92,
                depth + 0.6,
              ),
              0.8,
              C.dark,
            );
          }
          beam(
            clockPoint(0, 0, depth + 1),
            clockPoint(rad * 0.55, -rad * 0.15, depth + 1),
            1.6,
            C.dark,
          );
          beam(
            clockPoint(0, 0, depth + 1),
            clockPoint(0, rad * 0.72, depth + 1),
            1.4,
            C.dark,
          );
        }
        for (let tier = 0; tier < 3; tier++)
          box(
            0,
            h + 44 + tier * 13,
            0,
            w * (0.55 - tier * 0.14),
            9,
            d * (0.55 - tier * 0.14),
            C.stone,
          );
        beam([0, h + 77, 0], [0, h + 115, 0], 2, C.bronze);
      } else {
        box(0, h + 15, 0, w * 0.65, 22, d * 0.65, C.glass);
        solar(0, h + 28, 0, w * 0.8, d * 0.8);
        palmPot(w * 0.28, h + 6, d * 0.22);
      }
      break;
    }
    case 'grand-mosque': {
      shell(78, 2);
      canopy(83);
      box(0, 87, 0, w * 0.65, 6, d * 0.65, C.teal);
      for (let j = 0; j < 5; j++) {
        arch(-w * 0.4 + j * w * 0.2, d / 2 + 3, 4, w * 0.16, 42, 3);
        screen(-w * 0.4 + j * w * 0.2, d / 2 + 4, 49, w * 0.14, 17);
      }
      solar(-w * 0.3, 87, -d * 0.25, w * 0.28, d * 0.35);
      ring(0, 89, 0, Math.min(w, d) * 0.25, 10, C.white, Math.min(w, d) * 0.22);
      break;
    }
    case 'civic':
    case 'residence': {
      const h = kind === 'civic' ? 104 : 126 + (seed % 4) * 19;
      shell(h, kind === 'civic' ? 2 : 4);
      canopy(h + 5);
      // Projecting balconies and a shaded entrance make the facade volumetric.
      box(0, 24, d / 2 + 1, w * 0.6, 42, 1, C.dark);
      box(0, 48, d / 2 + 8, w * 0.78, 3, 18, C.white);
      for (const side of [-1, 1])
        box(side * w * 0.32, 23, d / 2 + 14, 2.5, 46, 3, C.bronze);
      if (kind === 'residence')
        for (const y of [55, h - 38]) {
          box(0, y, d / 2 + 7, w * 0.84, 3, 17, C.white);
          box(0, y + 9, d / 2 + 14, w * 0.82, 1.3, 1.3, C.bronze);
          for (let j = 0; j < 6; j++)
            box(
              -w * 0.38 + j * w * 0.152,
              y + 5,
              d / 2 + 14,
              0.8,
              8,
              0.8,
              C.bronze,
            );
          box(0, y + 15, d / 2 + 0.8, w * 0.7, 23, 1.2, C.glass);
          for (const x of [-w * 0.25, 0, w * 0.25])
            box(x, y + 15, d / 2 + 1.8, 1.3, 24, 2, C.white);
        }
      if (kind === 'residence') {
        // Masonry courses, window ledges, roof services and a street shop canopy.
        for (let y = 13; y < h - 4; y += 10)
          for (const side of [-1, 1])
            box(0, y, side * (d / 2 + 0.55), w, 0.7, 0.6, C.edge);
        box(
          0,
          33,
          d / 2 + 10,
          w * 0.91,
          3,
          21,
          ['#ad493d', '#356c67', '#c17b49'][seed % 3],
        );
        box(-w * 0.28, h + 14, -d * 0.2, w * 0.21, 12, d * 0.3, C.dark);
        for (let j = 0; j < 3; j++)
          box(-w * 0.28, h + 10 + j * 3, -d * 0.36, w * 0.18, 0.8, 1, C.edge);
      }
      if (kind === 'civic') {
        box(0, h * 0.58, d / 2 + 0.8, w * 0.8, 25, 1.1, C.glass);
        for (let j = 0; j < 6; j++)
          box(
            -w * 0.4 + j * w * 0.16,
            h * 0.58,
            d / 2 + 2,
            1.4,
            29,
            3,
            C.bronze,
          );
      }

      for (let j = 0; j < Math.max(2, Math.floor(w / 25)); j++)
        arch(
          -w * 0.32 + (j * w * 0.64) / Math.max(1, Math.floor(w / 25) - 1),
          d / 2 + 3,
          4,
          Math.min(22, w * 0.26),
          29,
          2,
        );
      screen(0, d / 2 + 2, h * 0.62, w * 0.74, 12);
      solar(-w * 0.15, h + 9, 0, w * 0.48, d * 0.7);
      palmPot(w * 0.32, h + 8, d * 0.18);
      box(w * 0.28, 3, d / 2 + 12, w * 0.34, 3, 20, C.edge);
      break;
    }
    case 'market': {
      shell(76, 2);
      box(0, 24, d / 2 + 1, w * 0.85, 26, 1.2, C.dark);
      for (let i = 0; i < 4; i++)
        box(
          -w * 0.36 + i * w * 0.24,
          25,
          d / 2 + 2,
          w * 0.18,
          19,
          0.8,
          i % 2 ? C.sky : C.glass,
        );
      const awning = ['#b94f42', '#30746e', '#c88752'][seed % 3];
      box(0, 40, d / 2 + 9, w + 6, 4, 23, awning);
      for (let j = 0; j < 6; j++)
        box(
          -w * 0.45 + j * w * 0.18,
          42.2,
          d / 2 + 9,
          w * 0.08,
          0.5,
          23,
          C.white,
        );
      box(0, 39, d / 2 + 21, w + 6, 4, 2, C.bronze);
      // Abstract product displays and a lit fascia, without generated lettering.
      box(0, 48, d / 2 + 2, w * 0.74, 7, 2, C.dark);
      for (let j = 0; j < 5; j++) {
        box(
          -w * 0.31 + j * w * 0.155,
          48,
          d / 2 + 3.2,
          w * 0.07,
          2,
          0.5,
          C.light,
        );
        box(
          -w * 0.31 + j * w * 0.155,
          18,
          d / 2 + 3,
          w * 0.09,
          6,
          2,
          [C.bronze, C.leaf, awning][j % 3],
        );
      }
      screen(0, d / 2 + 2, 61, w * 0.8, 13);
      solar(0, 82, 0, w * 0.65, d * 0.7);
      break;
    }
    case 'dome': {
      box(0, 17, 0, w, 34, d, C.white);
      for (let k = 0; k < 7; k++) {
        const t = k / 7;
        ring(
          0,
          34 + k * 5,
          0,
          Math.min(w, d) * 0.53 * Math.sqrt(1 - t * t),
          5,
          C.teal,
          Math.min(w, d) * 0.53 * Math.sqrt(1 - ((k + 1) / 7) ** 2),
          12,
        );
      }
      break;
    }
    case 'minaret': {
      ring(0, 0, 0, Math.max(w, d) * 0.34, 100, C.stone, Math.max(w, d) * 0.28);
      ring(0, 100, 0, w * 0.6, 5, C.bronze);
      ring(0, 105, 0, w * 0.4, 25, C.white, w * 0.3);
      ring(0, 130, 0, w * 0.4, 22, C.teal, 0.5);
      for (const s of [-1, 1])
        box(s * w * 0.29, 57, 0, 1.1, 68, w * 0.18, C.glass);
      break;
    }
    case 'facade': {
      const side = d > w;
      const span = side ? d : w,
        ww = side ? d : w,
        dd = side ? w : d;
      // Author along X, then rotate the completed wall for side walls.
      box(0, 3, 0, ww, 6, dd + 2, C.edge);
      box(0, 39, 0, ww, 7, dd + 2, C.white);
      const n = Math.max(1, Math.round(span / 35));
      for (let j = 0; j < n; j++) {
        const x = -ww / 2 + ((j + 0.5) * ww) / n;
        box(x, 21, 0, ww / n - 3, 30, dd, C.glass);
        box(x - (ww / n) * 0.38, 21, dd / 2 + 1, 2, 30, 2, C.stone);
        arch(x, dd / 2 + 2, 5, ww / n - 5, 30, 2);
        if (!type.includes('glass'))
          screen(x, dd / 2 + 3, 12, (ww / n) * 0.65, 15);
      }
      if (side)
        for (const f of faces)
          for (const p of f.points) {
            const x = p[0];
            p[0] = -p[2];
            p[2] = x;
          }
      break;
    }
    case 'portal': {
      box(0, 3, 0, w, 6, d, C.edge);
      for (const s of [-1, 1])
        box(s * w * 0.43, 26, 0, w * 0.13, 46, d, C.stone);
      arch(0, d / 2 + 1, 5, w * 0.7, 45, 4);
      canopy(52);
      screen(0, d / 2 + 2, 36, w * 0.45, 9);
      break;
    }
    case 'transit': {
      for (const s of [-1, 1]) {
        box(s * w * 0.43, 22, -d * 0.3, 2, 44, 2, C.bronze);
        box(s * w * 0.43, 22, d * 0.3, 2, 44, 2, C.bronze);
      }
      box(0, 23, -d * 0.42, w, 36, 1, C.glass);
      canopy(46);
      solar(0, 49, 0, w * 0.85, d * 0.85);
      box(0, 12, 0, w * 0.7, 3, 9, C.wood);
      box(w * 0.35, 27, d * 0.4, 8, 14, 2, C.dark);
      box(w * 0.35, 27, d * 0.4 + 1.1, 6, 10, 0.5, C.sky);
      break;
    }
    case 'smart-light': {
      ring(0, 0, 0, 3, 56, C.dark, 1.6);
      box(0, 58, 0, 18, 2, 9, C.white);
      box(0, 56, 0, 15, 1, 7, C.light);
      solar(0, 60, 0, 15, 7);
      box(0, 34, 0, 5, 6, 5, C.teal);
      break;
    }
    case 'traffic-signal': {
      box(0, 2, 0, 5, 4, 5, C.edge);
      beam([0, 3, 0], [0, 57, 0], 2, C.dark);
      beam([0, 56, 0], [18, 56, 0], 2, C.dark);
      box(17, 49, 0, 7, 19, 5, C.dark);
      for (let j = 0; j < 3; j++) {
        box(17, 55 - j * 6, 2.7, 4, 4, 1, ['#ef6b51', '#8b7139', '#345c4e'][j]);
        box(17, 58 - j * 6, 4, 6, 1, 4, C.dark);
      }
      box(0, 29, 0, 7, 9, 4, C.dark);
      box(0, 29, 2.2, 3, 5, 1, C.light);
      break;
    }
    case 'road-marking': {
      for (const x of [-w * 0.31, w * 0.31])
        box(x, 0.5, 0, w * 0.25, 0.4, 1.1, '#f1e2bf');
      break;
    }
    case 'solar': {
      for (const s of [-1, 1]) box(s * w * 0.35, 8, 0, 2, 16, d * 0.7, C.edge);
      solar(0, 18, 0, w, d);
      break;
    }
    case 'electric-car': {
      if (/rickshaw/.test(type)) {
        box(0, 12, 0, w * 0.85, 13, d * 0.7, C.teal);
        box(0, 25, -d * 0.2, w * 0.75, 9, d * 0.4, C.wood);
        box(0, 45, -d * 0.1, w * 0.9, 3, d * 0.75, C.teal);
        for (const side of [-1, 1]) {
          box(side * w * 0.4, 30, 0, 1.5, 28, 2, C.bronze);
          box(side * w * 0.43, 6, -d * 0.2, 4, 11, 9, C.dark);
        }
        box(0, 5, d * 0.43, 5, 10, 7, C.dark);
        beam([0, 12, d * 0.3], [0, 26, d * 0.46], 2, C.dark);
        box(0, 26, d * 0.46, 11, 1.5, 2, C.bronze);
        break;
      }

      // The long axis follows the two-tile road lane; side cars rotate as a unit.
      const paint = [
        '#b84039',
        '#d1d9d6',
        '#326b99',
        '#283944',
        '#d49d3f',
        '#893a35',
      ][seed % 6];
      const length = w * 0.9,
        width = d * 0.73;
      box(0, 7, 0, length, 9, width, paint);
      box(0, 20.3, 0, w * 0.43, 1.5, width * 0.78, paint);
      box(0, 3, 0, length * 0.95, 2, width, '#253542');
      // Slanted windshield and rear glass give the cabin a real profile.
      for (const side of [-1, 1]) {
        face(
          [
            [side * w * 0.29, 11, -width * 0.44],
            [side * w * 0.21, 20, -width * 0.38],
            [side * w * 0.21, 20, width * 0.38],
            [side * w * 0.29, 11, width * 0.44],
          ],
          '#23475e',
        );
        face(
          [
            [-w * 0.29, 11, side * width * 0.44],
            [-w * 0.21, 20, side * width * 0.38],
            [w * 0.21, 20, side * width * 0.38],
            [w * 0.29, 11, side * width * 0.44],
          ],
          '#305a73',
        );
        beam(
          [0, 11, side * width * 0.45],
          [0, 20, side * width * 0.39],
          1.1,
          paint,
        );
        for (const end of [-1, 1])
          beam(
            [end * w * 0.29, 11, side * width * 0.44],
            [end * w * 0.21, 20, side * width * 0.38],
            1.3,
            paint,
          );
        box(-w * 0.14, 11, side * (width * 0.5 + 0.3), 3, 0.7, 0.7, '#bec9cc');
        box(w * 0.18, 12, side * width * 0.56, 3, 2, 3, paint);
        for (const end of [-1, 1]) {
          box(end * w * 0.31, 5, side * width * 0.51, 8, 9, 3.5, '#172532');
          box(end * w * 0.31, 5, side * width * 0.62, 4, 4, 0.7, '#aab8bd');
        }
        box(
          length / 2 + 0.4,
          9,
          side * width * 0.33,
          1,
          3,
          width * 0.2,
          '#fff1bd',
        );
        box(
          -length / 2 - 0.4,
          9,
          side * width * 0.33,
          1,
          3,
          width * 0.2,
          '#d95243',
        );
      }
      box(length / 2 + 0.6, 6, 0, 1, 3, width * 0.36, '#243743');
      box(length / 2 + 1, 4, 0, 1, 1.3, width * 0.8, '#b8c1c0');
      box(-length / 2 - 0.6, 5, 0, 1, 2, width * 0.7, '#b8c1c0');
      box(length / 2 + 1.2, 5, 0, 0.5, 1.8, 4, '#eee5d2');
      if (seed % 4 === 0) {
        box(-w * 0.03, 23, 0, 7, 3, 4, '#f4d78d');
        for (let j = 0; j < 8; j++)
          box(
            -w * 0.32 + j * w * 0.09,
            9,
            width * 0.51,
            w * 0.045,
            1.5,
            0.6,
            j % 2 ? C.white : C.dark,
          );
      }
      break;
    }
    case 'water': {
      if (/wudu/.test(type)) {
        box(0, 6, 0, w, 12, d, C.white);
        box(0, 13, 0, w * 0.9, 1, d * 0.75, C.sky);
        box(0, 20, -d * 0.35, w, 30, 3, C.stone);
        for (let j = 0; j < 4; j++) {
          const x = -w * 0.35 + j * w * 0.23;
          beam([x, 14, -d * 0.34], [x, 26, -d * 0.34], 1.2, C.bronze);
          beam([x, 26, -d * 0.34], [x, 26, 0], 1.2, C.bronze);
          box(x, 7, d * 0.8, 10, 14, 8, C.teal);
        }
        break;
      }

      ring(0, 0, 0, Math.min(w, d) * 0.48, 8, C.edge);
      ring(0, 8, 0, Math.min(w, d) * 0.42, 1, C.sky);
      ring(0, 8, 0, 4, 16, C.bronze);
      ring(0, 24, 0, 11, 3, C.white, 13);
      break;
    }
    case 'cabinet': {
      if (/server/.test(type)) {
        box(0, 25, 0, w, 50, d, C.dark);
        for (let j = 0; j < 7; j++) {
          box(0, 5 + j * 6, d / 2 + 1, w * 0.84, 4, 1, C.glass);
          for (let k = 0; k < 5; k++)
            box(
              -w * 0.32 + k * w * 0.16,
              5 + j * 6,
              d / 2 + 2,
              w * 0.08,
              0.7,
              0.5,
              C.dark,
            );
          box(w * 0.34, 5 + j * 6, d / 2 + 2, 1.4, 1.4, 0.7, C.sky);
        }
        box(0, 52, 0, w + 3, 3, d + 3, C.white);
        break;
      }
      if (/fridge/.test(type)) {
        box(0, 23, 0, w, 46, d, C.white);
        box(0, 31, d / 2 + 1, w * 0.92, 1, 0.7, C.edge);
        box(w * 0.3, 23, d / 2 + 1.5, 1.5, 12, 1, C.dark);
        box(w * 0.3, 39, d / 2 + 1.5, 1.5, 6, 1, C.dark);
        break;
      }
      box(0, 21, 0, w, 42, d, C.white);
      box(0, 22, d / 2 + 0.5, w * 0.85, 33, 1, C.dark);
      for (let j = 0; j < 4; j++) {
        box(0, 7 + j * 9, d / 2 + 2, w * 0.9, 1.5, d * 0.3, C.edge);
        for (let i = 0; i < 5; i++)
          box(
            -w * 0.34 + i * w * 0.17,
            11 + j * 9,
            d / 2 + 2,
            Math.max(2, w * 0.1),
            6,
            3,
            [C.teal, C.wood, C.sky, C.bronze, C.stone][(i + j) % 5],
          );
      }
      box(0, 43, 0, w + 2, 2, d + 2, C.bronze);
      break;
    }
    case 'workstation': {
      for (const x of [-w * 0.4, w * 0.4])
        for (const z of [-d * 0.35, d * 0.35]) box(x, 11, z, 2, 22, 2, C.dark);
      box(0, 23, 0, w + 2, 3, d + 2, C.wood);
      box(0, 25, 0, w * 0.94, 1, d * 0.94, C.white);
      if (/computer|lab|commentary|reception/.test(type)) {
        box(0, 31, -d * 0.2, 2, 10, 3, C.dark);
        box(0, 39, -d * 0.2, w * 0.45, 17, 3, C.dark);
        box(0, 39, -d * 0.2 + 1.6, w * 0.4, 13, 0.4, C.sky);
      }
      // Authored tabletop details keep functional spaces readable from close up.
      if (/dining|kitchen|cafe/.test(type)) {
        for (const x of [-w * 0.27, w * 0.27]) {
          ring(x, 26, 0, Math.min(w * 0.16, 7), 1.2, C.white);
          ring(x, 27.2, 0, Math.min(w * 0.11, 5), 1, C.teal);
          for (let j = 0; j < 3; j++)
            box(x - 3 + j * 3, 28, 0, 2, 1.4, 2, C.bronze);
        }
        ring(0, 26, -d * 0.25, 3, 5, C.white);
        box(0, 31, -d * 0.25, 4, 1, 4, C.wood);
      } else if (/lab|workbench/.test(type)) {
        box(-w * 0.25, 28, 0, w * 0.28, 3, 9, C.edge);
        for (let j = 0; j < 4; j++) {
          const x = -w * 0.36 + j * w * 0.065;
          ring(x, 29, 0, 1.6, 9, C.sky, 1.6, 6);
          ring(x, 29, 0, 1.65, 3, C.teal, 1.65, 6);
        }
        ring(w * 0.3, 26, 0, 4, 7, C.sky, 3);
        box(w * 0.3, 26, 0, 4, 2, 4, C.teal);
      } else if (/coffee|cart/.test(type)) {
        box(-w * 0.2, 32, -d * 0.1, w * 0.33, 12, d * 0.5, C.dark);
        box(-w * 0.2, 38, -d * 0.1, w * 0.35, 1.5, d * 0.55, C.bronze);
        for (const x of [w * 0.1, w * 0.3])
          ring(x, 26, d * 0.1, 2.5, 5, C.white);
      } else {
        box(-w * 0.27, 27, d * 0.08, w * 0.25, 3, d * 0.38, C.teal);
        box(-w * 0.27, 29, d * 0.08, w * 0.22, 0.8, d * 0.35, C.white);
        box(w * 0.28, 26, -d * 0.22, 6, 2, 8, C.bronze);
        ring(w * 0.28, 29, -d * 0.22, 1.5, 5, C.dark);
        if (/drafting|kids/.test(type)) {
          box(0, 26.5, 0, w * 0.5, 0.4, d * 0.7, C.white);
          for (let j = -2; j <= 2; j++)
            box(j * 3, 27, 0, 0.5, 0.4, d * 0.5, C.sky);
        }
      }
      if (/computer|commentary|reception/.test(type)) {
        box(0, 26, d * 0.23, w * 0.42, 1, d * 0.18, C.dark);
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 7; col++)
            box(
              -w * 0.16 + col * w * 0.05,
              26.8,
              d * 0.18 + row * 1.1,
              1.1,
              0.3,
              0.7,
              C.edge,
            );
        for (let j = 0; j < 3; j++)
          box(
            -w * 0.13 + j * w * 0.13,
            37,
            -d * 0.2 + 1.9,
            w * 0.08,
            4 + j * 2,
            0.3,
            [C.teal, C.white, C.bronze][j],
          );
      }
      break;
    }
    case 'seating': {
      if (type === 'm-lab-stool') {
        ring(0, 0, 0, 6, 2, C.dark);
        ring(0, 2, 0, 1.5, 12, C.edge);
        ring(0, 14, 0, 7, 3, C.teal);
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2;
          beam([0, 3, 0], [Math.cos(a) * 7, 1.5, Math.sin(a) * 7], 1.3, C.dark);
        }
        break;
      }
      for (const x of [-w * 0.4, w * 0.4]) box(x, 7, 0, 3, 14, d * 0.7, C.dark);
      box(0, 14, 0, w, 3, d, C.wood);
      box(0, 22, -d * 0.38, w, 14, 3, C.teal);
      for (let i = 0; i < Math.max(1, Math.round(w / 15)); i++) {
        const x = -w / 2 + ((i + 0.5) * w) / Math.max(1, Math.round(w / 15));
        box(x, 16, 0, Math.min(13, w * 0.85), 1.5, d * 0.85, C.teal);
      }
      for (const x of [-w * 0.47, w * 0.47]) {
        box(x, 20, 0, 2, 2, d * 0.85, C.bronze);
        box(x, 17, d * 0.3, 2, 7, 2, C.bronze);
      }
      break;
    }
    case 'display': {
      const h = /backdrop|screen-wall/.test(type) ? 65 : 42;
      for (const x of [-w * 0.35, w * 0.35]) box(x, 12, 0, 2, 24, 4, C.bronze);
      box(0, h * 0.7, 0, w, h * 0.75, Math.max(3, d), C.white);
      box(0, h * 0.7, d / 2 + 0.6, w * 0.91, h * 0.64, 1, C.dark);
      for (let j = 0; j < 5; j++) {
        const xx = -w * 0.35 + j * w * 0.17;
        box(
          xx,
          h * 0.62,
          d / 2 + 1.3,
          w * 0.1,
          8 + j * 3,
          0.5,
          [C.sky, C.teal, C.bronze][j % 3],
        );
      }
      for (const y of [h * 0.88, h * 0.94])
        box(-w * 0.12, y, d / 2 + 1.4, w * 0.64, 0.9, 0.5, C.edge);
      break;
    }
    case 'care': {
      if (/iv-stand/.test(type)) {
        ring(0, 0, 0, 7, 3, C.dark);
        beam([0, 3, 0], [0, 57, 0], 1.6, C.edge);
        box(0, 55, 0, 12, 1.3, 1.3, C.edge);
        box(4, 46, 0, 5, 10, 3, C.sky);
        beam([4, 41, 0], [4, 17, 0], 0.5, C.white);
        break;
      }
      if (/curtain/.test(type)) {
        for (const x of [-w * 0.46, w * 0.46])
          box(x, 22, 0, 1.8, 44, 2, C.edge);
        box(0, 44, 0, w, 1.5, 2, C.dark);
        for (let j = 0; j < 8; j++)
          box(
            -w * 0.42 + j * w * 0.12,
            26,
            0,
            w * 0.11,
            33,
            1.5,
            j % 2 ? C.white : C.sky,
          );
        break;
      }
      if (/monitor/.test(type)) {
        box(0, 15, 0, w, 3, d, C.white);
        box(0, 8, 0, w * 0.8, 2, d * 0.8, C.edge);
        box(0, 30, 0, w * 0.8, 18, 3, C.dark);
        box(0, 30, 1.8, w * 0.7, 14, 0.4, C.sky);
        for (const x of [-w * 0.3, w * 0.3]) box(x, 9, 0, 2, 18, 2, C.dark);
        break;
      }

      box(0, 12, 0, w * 0.9, 4, d * 0.9, C.dark);
      box(0, 17, 0, w * 0.88, 7, d * 0.88, C.white);
      box(0, 22, -d * 0.28, w * 0.75, 4, d * 0.25, C.sky);
      for (const s of [-1, 1]) box(s * w * 0.4, 7, 0, 2, 14, d * 0.65, C.edge);
      break;
    }
    case 'planter': {
      box(0, 5, 0, w, 10, d, C.white);
      for (const x of [-w * 0.25, w * 0.25]) palmPot(x, 10, 0);
      break;
    }
    case 'frame': {
      if (/hoop/.test(type)) {
        box(0, 3, 0, 14, 6, 16, C.dark);
        beam([0, 6, 0], [0, 51, 0], 2.5, C.edge);
        box(0, 51, 0, 22, 15, 2, C.white);
        box(0, 50, 1.2, 10, 7, 0.6, C.sky);
        ring(0, 46, 6, 5, 1.4, C.bronze, 5, 12);
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          beam(
            [Math.cos(a) * 4, 46, 6 + Math.sin(a) * 4],
            [Math.cos(a) * 2, 38, 6 + Math.sin(a) * 2],
            0.4,
            C.white,
          );
        }
        break;
      }
      if (/flag/.test(type)) {
        beam([0, 0, 0], [0, 64, 0], 1.2, C.edge);
        const z = d * 0.1;
        box(
          w * 0.22,
          53,
          z,
          w * 0.45,
          17,
          0.7,
          /us-flag/.test(type) ? C.white : C.teal,
        );
        if (/us-flag/.test(type)) {
          for (let k = 0; k < 6; k++)
            box(w * 0.22, 46 + k * 2.6, z + 0.5, w * 0.45, 1.2, 0.4, '#a25847');
          box(w * 0.09, 57, z + 0.7, w * 0.2, 8, 0.4, C.solar);
        }
        if (/bd-flag/.test(type)) {
          const points: Vertex3[] = [];
          for (let j = 0; j < 12; j++) {
            const a = (j * Math.PI) / 6;
            points.push([
              w * 0.22 + Math.cos(a) * 4,
              53 + Math.sin(a) * 4,
              z + 0.6,
            ]);
          }
          face(points, '#b64c3c');
        }
        break;
      }
      if (/goal/.test(type)) {
        const h = 48;
        for (const x of [-w * 0.46, w * 0.46])
          beam([x, 0, 0], [x, h, 0], 2, C.white);
        beam([-w * 0.46, h, 0], [w * 0.46, h, 0], 2, C.white);
        for (let x = -w * 0.42; x <= w * 0.43; x += 5)
          beam([x, 1, -d * 0.4], [x, h, -d * 0.4], 0.55, C.edge);
        for (let y = 3; y < h; y += 5)
          beam([-w * 0.46, y, -d * 0.4], [w * 0.46, y, -d * 0.4], 0.55, C.edge);
        break;
      }
      if (/cage|ropes|railing/.test(type)) {
        for (const x of [-w * 0.46, w * 0.46])
          box(x, 24, 0, 1.4, 48, 1.4, C.dark);
        for (const y of [12, 24, 36, 48]) box(0, y, 0, w, 1, 1, C.edge);
        for (let x = -w * 0.4; x < w * 0.4; x += 4)
          beam([x, 0, 0], [x, 48, 0], 0.45, C.edge);
        break;
      }

      for (const x of [-w * 0.43, w * 0.43])
        box(x, 18, 0, 1.5, 36, 2, C.bronze);
      box(0, 35, 0, w, 2, 2, C.white);
      box(0, 7, 0, w, 2, 2, C.white);
      screen(0, 0, 8, w * 0.9, 26);
      break;
    }
    case 'platform': {
      box(0, 4, 0, w, 8, d, C.edge);
      box(0, 9, 0, w, 2, d, C.teal);
      for (let j = 0; j < 3; j++)
        box(0, 2 + j * 2, d / 2 + 6 - j * 2, w * 0.6, 2, 4, C.white);
      break;
    }
    default: {
      if (/robot-arm/.test(type)) {
        ring(0, 0, 0, Math.min(w, d) * 0.4, 6, C.dark);
        ring(0, 6, 0, 4, 13, C.white);
        beam([0, 17, 0], [10, 33, 0], 5, C.white);
        beam([10, 33, 0], [-2, 41, 0], 4, C.teal);
        for (const side of [-1, 1])
          beam([-2, 41, 0], [-2 + side * 4, 44, 0], 1.5, C.dark);
        break;
      }
      if (/fume-hood/.test(type)) {
        box(0, 16, 0, w, 32, d, C.white);
        box(0, 49, -d * 0.4, w, 34, 2, C.stone);
        for (const x of [-w * 0.46, w * 0.46]) box(x, 47, 0, 2, 30, d, C.sky);
        box(0, 64, 0, w + 3, 5, d + 3, C.dark);
        box(0, 70, -d * 0.2, w * 0.3, 8, d * 0.4, C.edge);
        break;
      }
      if (/tower-model|wave-model/.test(type)) {
        box(0, 10, 0, w, 20, d, C.white);
        for (let j = 0; j < 3; j++)
          box(
            -w * 0.27 + j * w * 0.27,
            24 + j * 6,
            0,
            w * 0.2,
            14 + j * 12,
            d * 0.6,
            C.glass,
          );
        break;
      }
      box(0, 12, 0, Math.min(w, 20), 24, Math.min(d, 20), C.stone);
      box(0, 25, 0, Math.min(w, 20) + 2, 2, Math.min(d, 20) + 2, C.teal);
      box(0, 16, Math.min(d, 20) / 2 + 0.5, 8, 8, 1, C.glass);
    }
  }
  if (rotate)
    for (const f of faces)
      for (const p of f.points) {
        const x = p[0];
        p[0] = -p[2];
        p[2] = x;
      }
  if (
    [
      'residence',
      'civic',
      'market',
      'clock-tower',
      'glass-tower',
      'grand-mosque',
      'minaret',
    ].includes(kind)
  ) {
    const dx = height * 0.28,
      dz = height * 0.19;
    const shadow: Face3 = {
      points: [
        [-w * 0.52, 0.15, -d * 0.52],
        [w * 0.52, 0.15, -d * 0.52],
        [w * 0.52 + dx, 0.15, d * 0.52 + dz],
        [-w * 0.52 + dx, 0.15, d * 0.52 + dz],
      ],
      color: '#153e48',
      opacity: 0.2,
    };
    faces.unshift(shadow);
  }
  return { kind, faces, height };
}
