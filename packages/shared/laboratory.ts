import type { Point } from './iso';
import type { Face3, InfrastructureModel, Vertex3 } from './infrastructure';

const TAU = Math.PI * 2;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export const LAB_LOOP = 240;
/** One repeatable twenty-second working routine, shared by staff and apparatus. */
export function laboratoryState(frame: number) {
  const tick = ((frame % LAB_LOOP) + LAB_LOOP) % LAB_LOOP;
  return {
    tick,
    phase:
      tick < 48
        ? 'prepare'
        : tick < 84
          ? 'dispense'
          : tick < 168
            ? 'react'
            : tick < 216
              ? 'record'
              : 'reset',
    dispense: ease((tick - 48) / 12) * (1 - ease((tick - 72) / 12)),
    dose: ease((tick - 48) / 36) * (1 - ease((tick - 216) / 24)),
    reaction: ease((tick - 84) / 18) * (1 - ease((tick - 168) / 30)),
    indicator: ease((tick - 84) / 60) * (1 - ease((tick - 216) / 24)),
  };
}
export function laboratoryKind(type: string): string | null {
  if (/^m-(chemistry-bench|lab-bench)$/.test(type)) return 'chemistry-lab';
  if (type === 'm-biology-bench') return 'biology-lab';
  if (type === 'm-drafting-table') return 'drafting';
  return null;
}

const C = {
  white: '#eeeede',
  edge: '#bac9c7',
  dark: '#244553',
  glass: '#a5d8df',
  blue: '#285777',
  cyan: '#58c8da',
  gold: '#c9a26a',
  green: '#75bd8a',
  ink: '#174359',
};
export class MeshBuilder {
  faces: Face3[] = [];
  opacity = 1;
  face(points: Vertex3[], color: string) {
    this.faces.push({ points, color, opacity: this.opacity });
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
  ) {
    const a = x - w / 2,
      b = x + w / 2,
      c = y - h / 2,
      e = y + h / 2,
      f = z - d / 2,
      g = z + d / 2;
    this.face(
      [
        [a, c, f],
        [a, e, f],
        [b, e, f],
        [b, c, f],
      ],
      color,
    );
    this.face(
      [
        [b, c, g],
        [b, e, g],
        [a, e, g],
        [a, c, g],
      ],
      color,
    );
    this.face(
      [
        [a, c, g],
        [a, e, g],
        [a, e, f],
        [a, c, f],
      ],
      color,
    );
    this.face(
      [
        [b, c, f],
        [b, e, f],
        [b, e, g],
        [b, c, g],
      ],
      color,
    );
    this.face(
      [
        [a, e, f],
        [a, e, g],
        [b, e, g],
        [b, e, f],
      ],
      color,
    );
    this.face(
      [
        [a, c, g],
        [a, c, f],
        [b, c, f],
        [b, c, g],
      ],
      color,
    );
  }
  beam(a: Vertex3, b: Vertex3, width: number, color: string) {
    const v = b.map((q, i) => q - a[i]);
    if (Math.hypot(...v) < 0.001) v[0] = 0.001;
    const len = Math.hypot(...v),
      horizontal = Math.hypot(v[0], v[2]);
    const u: Vertex3 =
      horizontal < 0.001
        ? [1, 0, 0]
        : [-v[2] / horizontal, 0, v[0] / horizontal];
    const n: Vertex3 = [
      (v[1] * u[2] - v[2] * u[1]) / len,
      (v[2] * u[0] - v[0] * u[2]) / len,
      (v[0] * u[1] - v[1] * u[0]) / len,
    ];
    const end: Vertex3 = [a[0] + v[0], a[1] + v[1], a[2] + v[2]];
    const points = (p: Vertex3) =>
      [-1, 1].flatMap((s) =>
        [-1, 1].map(
          (t) =>
            p.map((q, i) => q + ((u[i] * s + n[i] * t) * width) / 2) as Vertex3,
        ),
      );
    const A = points(a),
      B = points(end);
    for (const [i, j] of [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
    ])
      this.face([A[i], B[i], B[j], A[j]], color);
    this.face([A[0], A[1], A[3], A[2]], color);
    this.face([B[2], B[3], B[1], B[0]], color);
  }
  ring(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: string,
    top = r,
  ) {
    const low: Vertex3[] = [],
      high: Vertex3[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      low.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]);
      high.push([x + Math.cos(a) * top, y + h, z + Math.sin(a) * top]);
    }
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      this.face([low[i], high[i], high[j], low[j]], color);
    }
    this.face(high.slice().reverse(), color);
    this.face(low, color);
  }
  model(kind: string): InfrastructureModel {
    return {
      kind,
      faces: this.faces,
      height: Math.max(
        0,
        ...this.faces.flatMap((f) => f.points.map((p) => p[1])),
      ),
    };
  }
}
const dimensions = (fp: Point) => [fp[0] * 22.627, fp[1] * 22.627] as const;
const mix = (a: string, b: string, t: number) =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(
        parseInt(a.slice(i, i + 2), 16) * (1 - t) +
          parseInt(b.slice(i, i + 2), 16) * t,
      )
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

// Normalized plan segments: exterior, courtyard, rooms, circulation and stairs.
export const BLUEPRINT_STROKES: [Point, Point][] = [
  [
    [-0.36, -0.32],
    [0.32, -0.32],
  ],
  [
    [0.32, -0.32],
    [0.32, 0.32],
  ],
  [
    [0.32, 0.32],
    [-0.36, 0.32],
  ],
  [
    [-0.36, 0.32],
    [-0.36, -0.32],
  ],
  [
    [-0.08, -0.14],
    [0.13, -0.14],
  ],
  [
    [0.13, -0.14],
    [0.13, 0.13],
  ],
  [
    [0.13, 0.13],
    [-0.08, 0.13],
  ],
  [
    [-0.08, 0.13],
    [-0.08, -0.14],
  ],
  [
    [-0.36, -0.06],
    [-0.08, -0.06],
  ],
  [
    [0.13, 0.02],
    [0.32, 0.02],
  ],
  [
    [0.02, 0.13],
    [0.02, 0.32],
  ],
  [
    [-0.36, 0.16],
    [-0.08, 0.16],
  ],
  [
    [-0.18, -0.32],
    [-0.18, -0.14],
  ],
  [
    [0.13, -0.2],
    [0.32, -0.2],
  ],
  [
    [0.17, 0.18],
    [0.29, 0.18],
  ],
  [
    [0.17, 0.23],
    [0.29, 0.23],
  ],
  [
    [0.17, 0.28],
    [0.29, 0.28],
  ],
];
export function draftingPoint(frame: number, fp: Point): Vertex3 {
  const { tick } = laboratoryState(frame),
    [w, d] = dimensions(fp);
  const progress = clamp(tick / 144) * BLUEPRINT_STROKES.length;
  const index = Math.min(BLUEPRINT_STROKES.length - 1, Math.floor(progress));
  const [a, b] = BLUEPRINT_STROKES[index];
  const t = clamp(progress - index);
  const drawing = ease(t / 0.75),
    travel = ease((t - 0.75) / 0.25);
  const next: Point = BLUEPRINT_STROKES[index + 1]?.[0] ?? [0.43, 0.4];
  const x =
      ((a[0] + (b[0] - a[0]) * drawing) * (1 - travel) + next[0] * travel) * w,
    z =
      ((a[1] + (b[1] - a[1]) * drawing) * (1 - travel) + next[1] * travel) * d;
  const reset = ease((tick - 216) / 24),
    first = BLUEPRINT_STROKES[0][0];
  const xx = x * (1 - reset) + first[0] * w * reset,
    zz = z * (1 - reset) + first[1] * d * reset;
  const lift =
    Math.sin(travel * Math.PI) * 3 * (1 - reset) +
    Math.sin(reset * Math.PI) * 3;
  return [xx, 34 - (zz / d) * 16 + 1.1 + lift, zz];
}

export function laboratoryModel(
  type: string,
  fp: Point,
): InfrastructureModel | null {
  const kind = laboratoryKind(type);
  if (!kind) return null;
  const b = new MeshBuilder(),
    [w, d] = dimensions(fp);
  if (kind === 'drafting') {
    for (const x of [-w * 0.42, w * 0.42])
      for (const z of [-d * 0.35, d * 0.35]) b.box(x, 13, z, 2, 26, 2, C.dark);
    b.beam([-w * 0.42, 8, d * 0.35], [w * 0.42, 8, -d * 0.35], 1.5, C.gold);
    const board = (x: number, z: number, offset = 0): Vertex3 => [
      x,
      34 - (z / d) * 16 + offset,
      z,
    ];
    b.face(
      [
        board(-w * 0.5, -d * 0.46),
        board(-w * 0.5, d * 0.46),
        board(w * 0.5, d * 0.46),
        board(w * 0.5, -d * 0.46),
      ],
      C.white,
    );
    b.face(
      [
        board(-w * 0.43, -d * 0.4, 0.5),
        board(-w * 0.43, d * 0.4, 0.5),
        board(w * 0.43, d * 0.4, 0.5),
        board(w * 0.43, -d * 0.4, 0.5),
      ],
      C.blue,
    );
    for (let j = -4; j <= 4; j++)
      b.beam(
        board(j * w * 0.095, -d * 0.38, 0.7),
        board(j * w * 0.095, d * 0.38, 0.7),
        0.2,
        '#4c8398',
      );
    for (let j = -3; j <= 3; j++)
      b.beam(
        board(-w * 0.41, j * d * 0.12, 0.7),
        board(w * 0.41, j * d * 0.12, 0.7),
        0.2,
        '#4c8398',
      );
    b.beam(
      board(-w * 0.48, d * 0.43, 1),
      board(w * 0.48, d * 0.43, 1),
      1.8,
      C.gold,
    );
    for (const x of [-w * 0.4, w * 0.4])
      b.box(x, 43, -d * 0.44, 3, 2, 4, C.dark);
    b.ring(w * 0.41, 30, d * 0.42, 2.2, 8, C.white);
    b.box(-w * 0.38, 30, d * 0.5, 8, 2, 5, C.gold);
    return b.model(kind);
  }
  // Cabinet with knee access and a grounded, clean laboratory work surface.
  b.box(0, 2, 0, w, 4, d, C.dark);
  b.box(0, 13, 0, w * 0.96, 22, d * 0.94, C.white);
  for (let j = 0; j < 3; j++) {
    const x = -w * 0.33 + j * w * 0.33;
    b.box(x, 14, d / 2, 1, 17, 0.8, C.edge);
    b.box(x + 5, 20, d / 2 + 0.7, 5, 1, 1, C.dark);
  }
  b.box(0, 25, 0, w + 2, 3, d + 2, C.dark);
  b.box(0, 26.8, 0, w * 0.97, 0.6, d * 0.94, '#d9e5df');
  if (kind === 'chemistry-lab') {
    // Clamp-mounted reagent pipette above an open, visibly filled reaction vessel.
    const x = w * 0.18,
      z = d * 0.12;
    b.ring(x, 27, z, 6.4, 1.5, C.glass);
    b.ring(x, 43, z, 3.3, 2, C.glass);
    for (let j = 0; j < 4; j++) {
      const a = (j * Math.PI) / 2;
      b.beam(
        [x + Math.cos(a) * 6, 28, z + Math.sin(a) * 6],
        [x + Math.cos(a) * 3, 43, z + Math.sin(a) * 3],
        0.65,
        C.glass,
      );
    }
    b.box(x, 46, z, 6, 2, 6, C.glass);
    b.box(w * 0.39, 28, -d * 0.2, 9, 2, 9, C.edge);
    b.beam([w * 0.39, 29, -d * 0.2], [w * 0.39, 62, -d * 0.2], 1.3, C.dark);
    b.beam([w * 0.39, 59, -d * 0.2], [x, 59, z], 1.3, C.gold);
    b.box(-w * 0.27, 29, 0, w * 0.28, 4, 8, C.gold);
    for (let j = 0; j < 4; j++) {
      const xx = -w * 0.37 + j * w * 0.07;
      b.ring(xx, 29, 0, 1.7, 11, C.glass);
      b.ring(xx, 29, 0, 1.75, 4, [C.green, C.cyan, '#c592b8', C.gold][j]);
    }
    b.box(-w * 0.28, 28, d * 0.3, w * 0.24, 1, 7, C.white);
  } else {
    // Microscope: weighted base, articulated arm, stage, objective and eyepiece.
    const x = -w * 0.25,
      z = d * 0.06;
    b.box(x, 28, z, 13, 3, 13, C.dark);
    b.beam([x - 4, 29, z - 3], [x - 5, 43, z - 6], 3, C.white);
    b.beam([x - 5, 43, z - 6], [x + 1, 48, z + 1], 4, C.white);
    b.beam([x + 1, 48, z + 1], [x + 4, 44, z + 8], 3, C.dark);
    b.box(x + 4, 44, z + 9, 4, 3, 3, C.dark);
    b.box(x, 34, z + 1, 12, 1.5, 10, C.dark);
    b.box(x, 35, z + 1, 7, 0.6, 4, C.glass);
    b.ring(x, 29, z + 1, 2, 1, C.gold);
    for (const sign of [-1, 1])
      b.box(x + sign * 6, 38, z - 2, 2.5, 3, 3, C.gold);
    for (const xx of [w * 0.05, w * 0.29]) {
      b.ring(xx, 27, d * 0.24, 5, 1.2, C.glass);
      b.ring(xx, 28, d * 0.24, 4.5, 0.5, '#c1decb');
    }
    b.box(w * 0.26, 30, -d * 0.24, 2, 8, 3, C.dark);
    b.box(w * 0.26, 40, -d * 0.24, 21, 14, 2, C.dark);
    b.box(w * 0.26, 40, -d * 0.24 + 1.2, 18, 11, 0.6, '#376b74');
    for (let j = 0; j < 5; j++) {
      const a = (j * TAU) / 5;
      b.box(
        w * 0.26 + Math.cos(a) * 5,
        40 + Math.sin(a) * 3,
        -d * 0.24 + 1.7,
        1.8,
        1.8,
        0.5,
        C.green,
      );
    }
    b.box(w * 0.24, 27, d * 0.43, 13, 0.7, 7, C.blue);
    for (let j = 0; j < 3; j++)
      b.box(w * 0.24, 27.5, d * 0.34 + j * 1.1, 9, 0.3, 0.4, C.white);
  }
  return b.model(kind);
}

/** Only small working parts are regenerated; fixed architecture never moves. */
export function laboratoryActivityModel(
  type: string,
  fp: Point,
  frame: number,
): InfrastructureModel | null {
  const kind = laboratoryKind(type);
  if (!kind) return null;
  const b = new MeshBuilder(),
    [w, d] = dimensions(fp),
    s = laboratoryState(frame);
  if (kind === 'drafting') {
    const fade = 1 - ease((s.tick - 216) / 24),
      progress = clamp(s.tick / 144) * BLUEPRINT_STROKES.length;
    BLUEPRINT_STROKES.forEach(([a, c], i) => {
      const p = ease((progress - i) / 0.75),
        point = (v: Point): Vertex3 => [v[0] * w, 35 - v[1] * 16, v[1] * d];
      const end: Point = [a[0] + (c[0] - a[0]) * p, a[1] + (c[1] - a[1]) * p];
      b.opacity = p > 0 ? fade : 0;
      b.beam(point(a), point(end), 0.65, '#e2eee3');
    });
    b.opacity = 1;
    const p = draftingPoint(frame, fp);
    b.beam(p, [p[0] + 2, p[1] + 8, p[2] - 2], 1.4, C.gold);
    b.beam(p, [p[0] + 0.5, p[1] + 1.6, p[2] - 0.5], 0.55, C.dark);
    b.beam(
      [-w * 0.45, p[1] - 0.1, p[2] + 2],
      [w * 0.45, p[1] - 0.1, p[2] + 2],
      0.8,
      C.glass,
    );
    return b.model(kind);
  }
  if (kind === 'chemistry-lab') {
    const x = w * 0.18,
      z = d * 0.12,
      liquid = mix('#48acb7', '#ad72c5', s.indicator);
    b.ring(x, 28, z, 5.2, 8 + s.dose * 1.5, liquid, 4.6);
    const tip = 55 - s.dispense * 7;
    b.ring(x, tip, z, 1.7, 7, C.white);
    b.beam([x, tip, z], [x, tip - 5, z], 0.7, C.glass);
    for (let j = 0; j < 3; j++) {
      const p = ((s.tick - 48) / 12 + j / 3) % 1;
      b.opacity = s.dispense;
      b.ring(x, 42 + (1 - p) * 6, z, 0.65, 1.1, C.cyan);
    }
    for (let j = 0; j < 7; j++) {
      const p = (((s.tick / 25 + j / 7) % 1) + 1) % 1,
        a = j * 2.4;
      b.opacity = s.reaction * Math.sin(p * Math.PI);
      b.ring(
        x + Math.cos(a) * 3,
        35 + p * 20,
        z + Math.sin(a) * 3,
        1.0 + (j % 2) * 0.35,
        1.2,
        '#b9e5e1',
      );
    }
    b.opacity = s.reaction * 0.65;
    for (let j = 0; j < 3; j++) {
      const a = (j * TAU) / 3 + (s.tick * TAU) / 48;
      b.ring(
        x + Math.cos(a) * 2.6,
        36 + s.dose * 1.5,
        z + Math.sin(a) * 2.6,
        1.3,
        0.6,
        '#b9e5e1',
      );
    }
    b.opacity = 1;
    const a = (s.tick * TAU) / 12;
    b.beam(
      [x - Math.cos(a) * 3, 29, z - Math.sin(a) * 3],
      [x + Math.cos(a) * 3, 29, z + Math.sin(a) * 3],
      0.8,
      C.white,
    );
    // A small measurement trace develops while the operator records results.
    b.box(
      -w * 0.28,
      28.7,
      d * 0.3,
      Math.max(0.01, w * 0.2 * ease((s.tick - 168) / 32)),
      0.3,
      0.5,
      C.blue,
    );
  } else {
    const x = -w * 0.25,
      z = d * 0.06,
      focus = Math.sin((s.tick * TAU) / 48) * 0.65;
    b.ring(x, 36 + focus, z + 1, 2, 5, C.edge, 1.2);
    b.box(
      x,
      35.6,
      z + 1,
      3,
      0.3,
      2,
      mix('#a4cd6f', '#59c6b8', 0.5 + 0.5 * Math.sin((s.tick * TAU) / 120)),
    );
    for (let j = 0; j < 6; j++) {
      const a = j * 2.4,
        split = (0.5 - 0.5 * Math.cos((s.tick * TAU) / 240)) * 1.6;
      for (const sign of [-1, 1]) {
        b.box(
          w * 0.05 + Math.cos(a) * 2 + sign * split * 0.5,
          29 + Math.sin((s.tick * TAU) / 60 + j) * 0.15,
          d * 0.24 + Math.sin(a) * 2,
          0.85,
          0.7,
          0.85,
          j % 2 ? C.green : '#99bf61',
        );
      }
    }
    const yy = 40 - s.dispense * 6;
    b.beam(
      [w * 0.29, yy + 6, d * 0.24],
      [w * 0.29, yy, d * 0.24],
      1.3,
      C.white,
    );
    b.beam(
      [w * 0.29, yy, d * 0.24],
      [w * 0.29, yy - 4, d * 0.24],
      0.5,
      C.glass,
    );
    b.opacity = s.dispense;
    b.ring(
      w * 0.29,
      30 + (1 - (s.tick % 12) / 12) * 3,
      d * 0.24,
      0.6,
      0.8,
      C.cyan,
    );
    b.opacity = 1;
    b.box(
      w * 0.26 + Math.sin((s.tick * TAU) / 120) * 7,
      40,
      -d * 0.24 + 2.1,
      0.7,
      10,
      0.3,
      '#b9e5d8',
    );
  }
  return b.model(kind);
}
