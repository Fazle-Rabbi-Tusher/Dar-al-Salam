// Procedural placeholder art for the modern district: architecture, interiors and street furniture.
// Content rule: no text, numerals, logos, calligraphy or religious symbols anywhere in this art.
import { Pixels, type PixelImage } from '../../packages/shared/pixels';
import { png, readJson, writeJson } from '../build/io';
import type { ObjectArt } from './objects';
import { isoCanvas, mirror, type IsoCanvas, type Material } from './iso-draw';

/** Every colour this module paints. Keys are descriptive; values are the palette. */
const C = {
  edge: '#493C35',
  ink: '#2A2E33',
  charcoal: '#3A3F44',
  slate: '#5E6668',
  grey: '#8E9796',
  silver: '#B9C0BE',
  pale: '#DADFDC',
  offwhite: '#EEF0EC',
  white: '#FBFBF7',
  ivory: '#F5EEDB',
  paper: '#EDE6CE',
  stone: '#D7DCD2',
  stoneShade: '#B5C3BA',
  stoneLine: '#8B9D96',
  steelLight: '#E2E6E8',
  steel: '#B8C0C6',
  steelDark: '#88939B',
  glassLight: '#CDE9F2',
  glass: '#9FD0E3',
  glassDark: '#6BAAC6',
  glassDeep: '#4A87A8',
  teal: '#4FB3A9',
  tealDark: '#2E8C86',
  turquoise: '#79B6B2',
  deepTeal: '#377D79',
  mint: '#B7E4D3',
  mintDark: '#7FC7AE',
  red: '#E05A4F',
  redDark: '#B23A35',
  orange: '#F08A3C',
  orangeDark: '#C2632A',
  yellow: '#F5C842',
  yellowDark: '#C99A22',
  gold: '#D8AD57',
  green: '#5DBB63',
  greenDark: '#3A8C48',
  lime: '#A6D65A',
  blue: '#3E7DD8',
  blueDark: '#2A57A0',
  navy: '#243A66',
  purple: '#8A63C9',
  purpleDark: '#5E3F96',
  pink: '#EE8FB0',
  pinkDark: '#C2607F',
  woodLight: '#E0B98A',
  wood: '#C08A5A',
  woodDark: '#8A5A36',
  oak: '#D9A86C',
  carpet: '#9E2F3A',
  carpetDark: '#7A1F2B',
  carpetGreen: '#2F6E4F',
  carpetGreenDark: '#1F4F38',
  carpetGold: '#E8C77A',
  terracotta: '#C9704E',
  terracottaDark: '#9C4E33',
  terracottaLight: '#E0916A',
  asphalt: '#5B5F63',
  asphaltDark: '#474A4E',
  asphaltLight: '#6C7176',
  screen: '#1E2A3A',
  glow: '#7FE3D2',
  beat: '#6CF08A',
  leafLight: '#8CC46A',
  leaf: '#5E9E4A',
  leafDark: '#3F7A3A',
  trunk: '#7A5638',
  soil: '#6B4A33',
  concrete: '#E6E4DE',
  concreteShade: '#CFCCC3',
  concreteLine: '#BDB9AE',
  warmGrey: '#C9C3B8',
  warmGreyLight: '#DAD5CB',
  warmGreyDark: '#A9A296',
  labTile: '#F4F6F5',
  labLine: '#D3DBD8',
  vinyl: '#CDEBDF',
  vinylLight: '#DDF2EA',
  vinylDark: '#A9D6C4',
  water: '#A3CFBE',
  waterLight: '#D4EEF0',
  rice: '#F3E3A6',
  cream: '#F7EBD0',
  // Football stadium.
  pitchLight: '#74B95B',
  pitch: '#5FA64C',
  pitchDark: '#4A8B3E',
  line: '#F4F7EE',
  net: '#D9DEDA',
  netShade: '#AEB6B2',
  fanSkin1: '#E5BF92',
  fanSkin2: '#BA8D63',
  fanSkin3: '#875E42',
  fanSkin4: '#593E30',
  fanHair: '#3B322E',
  lamp: '#FFF6C8',
  lampGlow: '#FFE88A',
  seatGrey: '#9AA3A6',
} as const;
export const MODERN_COLOURS: string[] = [...new Set(Object.values(C))];

type Ramp = [string, string, string];
const M = {
  white: { top: C.white, front: C.offwhite, side: C.pale, edge: C.silver },
  stone: {
    top: C.ivory,
    front: C.stone,
    side: C.stoneShade,
    edge: C.stoneLine,
  },
  steel: {
    top: C.steelLight,
    front: C.steel,
    side: C.steelDark,
    edge: C.slate,
  },
  dark: { top: C.slate, front: C.charcoal, side: C.ink, edge: C.ink },
  wood: { top: C.woodLight, front: C.wood, side: C.woodDark, edge: C.woodDark },
  oak: { top: C.oak, front: C.wood, side: C.woodDark, edge: C.woodDark },
  concrete: {
    top: C.concrete,
    front: C.concreteShade,
    side: C.concreteLine,
    edge: C.grey,
  },
  teal: { top: C.teal, front: C.tealDark, side: C.deepTeal, edge: C.deepTeal },
  orange: {
    top: C.orange,
    front: C.orangeDark,
    side: C.terracottaDark,
    edge: C.edge,
  },
} satisfies Record<string, Material>;
const R = {
  leaf: [C.leafLight, C.leaf, C.leafDark] as Ramp,
  steel: [C.steelLight, C.steel, C.steelDark] as Ramp,
  white: [C.white, C.offwhite, C.pale] as Ramp,
  stone: [C.ivory, C.stone, C.stoneShade] as Ramp,
  teal: [C.teal, C.tealDark, C.deepTeal] as Ramp,
  terracotta: [C.terracottaLight, C.terracotta, C.terracottaDark] as Ramp,
  dark: [C.slate, C.charcoal, C.ink] as Ramp,
  glass: [C.glassLight, C.glass, C.glassDark] as Ramp,
  blue: [C.glass, C.blue, C.blueDark] as Ramp,
};
const accents = [
  C.red,
  C.blue,
  C.yellow,
  C.green,
  C.purple,
  C.orange,
  C.teal,
  C.pink,
  C.navy,
];

type Spec = {
  footprint: [number, number];
  /** Tallest point above the floor, in pixels. */
  h: number;
  pad?: number;
  frames?: number;
  floor?: boolean;
  side?: boolean;
  draw: (c: IsoCanvas, f: number) => void;
};

/** Small helper: a stick of a given colour between two tile-space points. */
function post(
  c: IsoCanvas,
  x: number,
  y: number,
  z: number,
  h: number,
  col: string,
  w = 1,
) {
  const [px, py] = c.at(x, y, z);
  c.p.rect(px, py - h, w, h, col);
}
function screen(
  c: IsoCanvas,
  x: number,
  y: number,
  w: number,
  z: number,
  h: number,
  f = 0,
) {
  c.faceX(x, y, w, z, h, C.ink);
  c.faceX(x + 0.04, y + 0.01, w - 0.08, z + 2, h - 4, C.screen);
  const n = Math.max(2, Math.floor(w * 7));
  for (let i = 0; i < n; i++) {
    const bh = 2 + ((i * 5 + f * 3) % Math.max(3, h - 9));
    c.faceX(
      x + 0.1 + (i * (w - 0.2)) / n,
      y + 0.02,
      Math.max(0.05, (w - 0.2) / n - 0.04),
      z + 4,
      Math.min(bh, h - 8),
      accents[(i + f) % accents.length],
    );
  }
}
function shoe(c: IsoCanvas, x: number, y: number, z: number, col: string) {
  const [px, py] = c.at(x, y, z);
  c.p.rect(px, py - 2, 4, 2, col);
  c.p.rect(px + 5, py - 1, 4, 2, col);
  c.p.pixel(px, py - 2, C.white);
  c.p.pixel(px + 5, py - 1, C.white);
}
function book(
  c: IsoCanvas,
  x: number,
  y: number,
  z: number,
  h: number,
  col: string,
) {
  const [px, py] = c.at(x, y, z);
  c.p.rect(px, py - h, 2, h, col);
  c.p.pixel(px, py - h + 1, C.white);
}
function wallBase(c: IsoCanvas, h: number, m: Material, depth = 0.35) {
  c.box(0, 0, 8, depth, h, m);
}

const objects: Record<string, Spec> = {
  'm-glasswall': {
    footprint: [8, 0.35],
    h: 100,
    side: true,
    draw(c) {
      wallBase(c, 98, M.white);
      c.faceX(0.05, 0.351, 7.9, 8, 84, C.glass);
      for (let u = 0; u < 8; u++) {
        c.faceX(u + 0.06, 0.352, 0.88, 50, 40, C.glassLight);
        c.faceX(u + 0.06, 0.352, 0.88, 8, 40, C.glass);
        for (let k = 0; k < 2; k++) {
          c.edge(
            [u + 0.15 + k * 0.3, 0.353, 14],
            [u + 0.45 + k * 0.3, 0.353, 44],
            C.white,
          );
          c.edge(
            [u + 0.2 + k * 0.3, 0.353, 56],
            [u + 0.45 + k * 0.3, 0.353, 84],
            C.white,
          );
        }
        c.faceX(u - 0.04, 0.354, 0.1, 6, 88, C.white);
        c.edge([u + 0.06, 0.355, 6], [u + 0.06, 0.355, 94], C.silver);
      }
      c.faceX(0, 0.354, 8, 48, 3, C.white);
      c.faceX(0, 0.355, 8, 0, 8, C.steel);
      c.edge([0, 0.356, 8], [8, 0.356, 8], C.slate);
      c.box(-0.05, -0.05, 8.1, 0.45, 4, M.white, 94);
    },
  },
  'm-whitewall': {
    footprint: [8, 0.35],
    h: 100,
    side: true,
    draw(c) {
      wallBase(c, 96, M.white);
      c.faceX(0, 0.351, 8, 0, 6, C.pale);
      c.edge([0, 0.352, 6], [8, 0.352, 6], C.silver);
      c.faceX(0, 0.351, 8, 74, 10, C.mint);
      for (let u = 0.1; u < 8; u += 0.25)
        c.poly(
          [
            [u, 0.352, 79],
            [u + 0.12, 0.352, 83],
            [u + 0.24, 0.352, 79],
            [u + 0.12, 0.352, 75],
          ],
          C.tealDark,
        );
      // Two abstract artworks.
      c.faceX(1, 0.352, 1.6, 30, 30, C.woodDark);
      c.faceX(1.08, 0.353, 1.44, 32, 26, C.cream);
      c.faceX(1.2, 0.354, 0.5, 36, 16, C.orange);
      c.faceX(1.6, 0.354, 0.8, 44, 10, C.blue);
      c.faceX(1.9, 0.354, 0.4, 34, 8, C.yellow);
      c.faceX(5.2, 0.352, 1.8, 28, 34, C.charcoal);
      c.faceX(5.28, 0.353, 1.64, 30, 30, C.waterLight);
      for (let i = 0; i < 5; i++)
        c.faceX(
          5.4 + i * 0.3,
          0.354,
          0.22,
          32,
          6 + ((i * 7) % 20),
          accents[i + 2],
        );
      // Clock without numerals.
      const [x, y] = c.at(3.8, 0.36, 60);
      c.p.ellipse(x, y, 7, 7, C.charcoal);
      c.p.ellipse(x, y, 6, 6, C.white);
      c.line([x, y], [x, y - 5], C.ink);
      c.line([x, y], [x + 3, y + 1], C.red);
      c.p.pixel(x, y, C.ink);
      c.box(-0.05, -0.05, 8.1, 0.45, 4, M.white, 92);
    },
  },
  'm-archwall': {
    footprint: [8, 0.35],
    h: 114,
    side: true,
    draw(c) {
      wallBase(c, 110, M.stone);
      c.faceX(0, 0.351, 8, 0, 8, C.stoneShade);
      for (let i = 0; i < 4; i++) {
        const u = 0.55 + i * 2;
        c.poly(
          [
            [u - 0.12, 0.352, 16],
            [u + 1.02, 0.352, 16],
            [u + 1.02, 0.352, 78],
            [u + 0.45, 0.352, 96],
            [u - 0.12, 0.352, 78],
          ],
          C.tealDark,
        );
        c.poly(
          [
            [u, 0.353, 20],
            [u + 0.9, 0.353, 20],
            [u + 0.9, 0.353, 76],
            [u + 0.45, 0.353, 90],
            [u, 0.353, 76],
          ],
          C.glass,
        );
        c.faceX(u, 0.354, 0.9, 20, 28, C.glassDark);
        c.edge([u + 0.45, 0.355, 20], [u + 0.45, 0.355, 88], C.white);
        c.edge([u, 0.355, 50], [u + 0.9, 0.355, 50], C.white);
        c.edge([u + 0.1, 0.355, 56], [u + 0.3, 0.355, 74], C.glassLight);
        c.box(u - 0.15, 0.3, 1.2, 0.25, 3, M.stone, 14);
        // Simple square lattice band between windows.
        c.faceX(u + 1.15, 0.352, 0.7, 30, 44, C.ivory);
        for (let z = 34; z < 72; z += 6)
          for (let k = 0; k < 3; k++)
            c.top(u + 1.22 + k * 0.2, 0.352, 0.1, 0.01, z, C.turquoise);
      }
      c.faceX(0, 0.352, 8, 100, 4, C.teal);
      c.box(-0.05, -0.05, 8.1, 0.45, 5, M.stone, 106);
    },
  },
  'm-dome': {
    footprint: [4, 4],
    h: 140,
    draw(c) {
      c.box(0, 0, 4, 4, 40, M.stone);
      c.faceX(0, 4.001, 4, 32, 4, C.teal);
      c.faceY(4.001, 0, 4, 32, 4, C.deepTeal);
      const [cx, cy] = c.at(2, 2, 40);
      c.cylinder(2, 2, 40, 40, 26, R.stone, C.ivory);
      for (let k = 0; k < 9; k++) {
        const u = -0.85 + k * 0.21,
          x = cx + u * 40,
          y = cy + 20 * Math.sqrt(1 - u * u);
        c.p.rect(x - 2, y - 20, 4, 12, C.glassDark);
        c.p.rect(x - 1, y - 19, 1, 6, C.glassLight);
      }
      c.p.ellipse(cx, cy - 26, 41, 20, C.teal);
      // Shallow dome.
      const top = cy - 26;
      for (let j = top - 64; j <= top; j++)
        for (let i = cx - 38; i <= cx + 38; i++) {
          const u = (i - cx) / 38,
            v = (top - j) / 64;
          if (u * u + v * v > 1) continue;
          const shade = u - v * 0.4;
          c.p.pixel(
            i,
            j,
            shade < -0.45
              ? C.white
              : shade < 0.15
                ? C.offwhite
                : shade < 0.55
                  ? C.pale
                  : C.silver,
          );
        }
      for (let k = 1; k < 6; k++) {
        const u = -0.85 + k * 0.28;
        for (let j = top - 62; j <= top; j++) {
          const v = (top - j) / 64,
            w = Math.sqrt(Math.max(0, 1 - v * v));
          c.p.pixel(cx + u * 38 * w, j, C.stoneShade);
        }
      }
      c.p.ellipse(cx, top, 38, 4, C.tealDark);
      c.p.rect(cx - 2, top - 70, 4, 7, C.gold);
      c.p.ellipse(cx, top - 71, 3, 3, C.gold);
      c.p.pixel(cx - 1, top - 72, C.yellow);
    },
  },
  'm-minaret': {
    footprint: [1, 1],
    h: 240,
    draw(c) {
      c.box(0, 0, 1, 1, 10, M.stone);
      c.box(0.15, 0.15, 0.7, 0.7, 168, M.white, 10);
      for (const z of [60, 120]) {
        c.faceX(0.15, 0.851, 0.7, z, 4, C.teal);
        c.faceY(0.851, 0.15, 0.7, z, 4, C.tealDark);
      }
      for (const z of [24, 84, 140]) {
        c.faceX(0.42, 0.852, 0.16, z, 24, C.glassDark);
        c.faceY(0.852, 0.42, 0.16, z, 24, C.glassDeep);
      }
      c.box(-0.05, -0.05, 1.1, 1.1, 5, M.stone, 176);
      for (let u = 0; u <= 1.1; u += 0.18) {
        post(c, u - 0.05, 1.05, 181, 9, C.stoneLine);
        post(c, 1.05, u - 0.05, 181, 9, C.stoneLine);
      }
      c.box(-0.05, -0.05, 1.1, 1.1, 2, M.stone, 190);
      c.box(0.22, 0.22, 0.56, 0.56, 22, M.white, 181);
      c.poly(
        [
          [0.2, 1.0, 203],
          [0.5, 0.5, 236],
          [1.0, 1.0, 203],
        ],
        C.teal,
      );
      c.poly(
        [
          [1.0, 1.0, 203],
          [0.5, 0.5, 236],
          [1.0, 0.2, 203],
        ],
        C.deepTeal,
      );
      c.box(0.2, 0.2, 0.8, 0.8, 3, M.stone, 200);
      const [x, y] = c.at(0.5, 0.5, 236);
      c.p.ellipse(x, y - 2, 2, 2, C.gold);
    },
  },
  'm-wudu': {
    footprint: [3, 1],
    h: 46,
    draw(c) {
      c.box(0, 0, 3, 0.25, 44, M.white);
      for (let u = 0; u < 3; u += 0.25)
        for (let z = 10; z < 44; z += 8)
          c.edge([u, 0.251, z], [u + 0.25, 0.251, z], C.labLine);
      c.faceX(0, 0.251, 3, 34, 6, C.turquoise);
      c.box(0, 0.25, 3, 0.4, 12, M.stone);
      c.top(0.08, 0.3, 2.84, 0.3, 12, C.water);
      c.edge([0.1, 0.45, 12], [2.9, 0.45, 12], C.waterLight);
      for (let i = 0; i < 4; i++) {
        const u = 0.35 + i * 0.75,
          [x, y] = c.at(u, 0.26, 26);
        c.p.rect(x, y, 3, 2, C.steel);
        c.p.rect(x + 2, y + 2, 1, 2, C.steelDark);
        c.p.pixel(x, y, C.white);
        c.p.rect(x + 2, y + 5, 1, 3 + i, C.glass);
        const [sx, sy] = c.at(u + 0.1, 0.82, 0);
        c.cylinder(u + 0.1, 0.82, 0, 4, 8, R.steel);
        c.p.pixel(sx - 2, sy - 9, C.white);
      }
    },
  },
  'm-shoe-rack': {
    footprint: [2, 0.6],
    h: 24,
    draw(c) {
      c.box(0, 0, 2, 0.6, 22, M.oak);
      for (let r = 0; r < 3; r++) {
        const z = 2 + r * 7;
        c.faceX(0.06, 0.601, 1.88, z, 5, C.woodDark);
        for (let i = 0; i < 4; i++)
          shoe(
            c,
            0.12 + i * 0.46,
            0.602,
            z,
            accents[(i + r * 3) % accents.length],
          );
      }
    },
  },
  'm-hall-carpet': {
    footprint: [10, 6],
    h: 2,
    floor: true,
    draw(c) {
      c.top(0, 0, 10, 6, 0, C.carpetDark);
      c.top(0.12, 0.12, 9.76, 5.76, 0, C.carpetGold);
      c.top(0.2, 0.2, 9.6, 5.6, 0, C.carpet);
      for (let x = 0.2; x < 9.8; x += 1.2)
        c.top(x, 0.2, 0.03, 5.6, 0, C.carpetDark);
      for (let y = 1.5; y < 6; y += 1.5) {
        c.top(0.2, y - 0.08, 9.6, 0.16, 0, C.carpetGreen);
        c.top(0.2, y - 0.03, 9.6, 0.06, 0, C.carpetGold);
      }
      for (let x = 0.4; x < 9.7; x += 0.4) {
        c.top(x, 0.04, 0.2, 0.05, 0, C.carpetGreen);
        c.top(x, 5.91, 0.2, 0.05, 0, C.carpetGreen);
      }
    },
  },
  'm-lab-bench': {
    footprint: [3, 1.5],
    h: 52,
    draw(c) {
      c.box(0, 0, 3, 1.5, 20, M.white);
      for (let u = 0.05; u < 3; u += 0.75) {
        c.edge([u, 1.501, 2], [u, 1.501, 19], C.silver);
        c.faceX(u + 0.3, 1.502, 0.15, 15, 1, C.steelDark);
      }
      c.faceY(3.001, 0, 1.5, 2, 16, C.pale);
      c.box(-0.03, -0.03, 3.06, 1.56, 2, M.dark, 20);
      // Microscope.
      c.box(0.3, 0.5, 0.4, 0.35, 3, M.white, 22);
      const [mx, my] = c.at(0.5, 0.6, 25);
      c.thick([mx + 2, my], [mx + 3, my - 14], 1, C.charcoal);
      c.thick([mx + 3, my - 14], [mx - 1, my - 19], 1, C.charcoal);
      c.p.rect(mx - 2, my - 19, 3, 6, C.steelDark);
      c.p.rect(mx - 2, my - 22, 3, 3, C.ink);
      c.p.rect(mx - 2, my - 6, 6, 1, C.steelDark);
      // Flasks with coloured liquid.
      for (const [x, y, col] of [
        [1.2, 0.5, C.purple],
        [1.5, 0.9, C.lime],
        [1.0, 1.0, C.orange],
      ] as [number, number, string][]) {
        const [fx, fy] = c.at(x, y, 22);
        c.p.poly(
          [
            [fx - 4, fy],
            [fx + 4, fy],
            [fx + 1, fy - 7],
            [fx - 1, fy - 7],
          ],
          C.glassLight,
        );
        c.p.poly(
          [
            [fx - 4, fy],
            [fx + 4, fy],
            [fx + 2, fy - 4],
            [fx - 2, fy - 4],
          ],
          col,
        );
        c.p.rect(fx - 1, fy - 11, 2, 4, C.glassLight);
        c.p.pixel(fx - 2, fy - 2, C.white);
      }
      // Test-tube rack.
      c.box(1.9, 0.4, 0.5, 0.2, 4, M.wood, 22);
      for (let i = 0; i < 4; i++) {
        const [tx, ty] = c.at(1.96 + i * 0.12, 0.5, 26);
        c.p.rect(tx, ty - 8, 2, 8, C.glassLight);
        c.p.rect(tx, ty - 3, 2, 3, [C.red, C.blue, C.yellow, C.green][i]);
      }
      // Monitor.
      c.box(2.5, 0.2, 0.2, 0.15, 6, M.dark, 22);
      screen(c, 2.25, 0.3, 0.7, 28, 22);
    },
  },
  'm-fume-hood': {
    footprint: [2, 1],
    h: 92,
    draw(c) {
      c.box(0, 0, 2, 1, 30, M.white);
      c.edge([1, 1.001, 2], [1, 1.001, 28], C.silver);
      c.box(0, 0, 2, 1, 56, M.steel, 30);
      c.faceX(0.12, 1.001, 1.76, 34, 36, C.mint);
      c.faceX(0.12, 1.001, 1.76, 58, 12, C.glow);
      for (let i = 0; i < 5; i++) {
        const [bx, by] = c.at(0.3 + i * 0.32, 1.002, 34);
        c.p.rect(bx, by - 10 - (i % 2) * 3, 3, 10 + (i % 2) * 3, accents[i]);
        c.p.rect(bx + 1, by - 13 - (i % 2) * 3, 1, 3, C.glassLight);
      }
      c.edge([0.2, 1.003, 40], [0.6, 1.003, 66], C.white);
      c.faceX(0.12, 1.003, 1.76, 70, 2, C.steelDark);
      c.box(0.6, 0.3, 0.8, 0.4, 6, M.steel, 86);
    },
  },
  'm-robot-arm': {
    footprint: [1, 1],
    h: 70,
    frames: 4,
    draw(c, f) {
      c.box(0.15, 0.15, 0.7, 0.7, 6, M.dark);
      c.cylinder(0.5, 0.5, 6, 9, 10, [
        C.orange,
        C.orangeDark,
        C.terracottaDark,
      ]);
      const swing = [0, 2, 4, 2][f];
      const [bx, by] = c.at(0.5, 0.5, 16);
      const elbow: [number, number] = [bx - 6 + swing, by - 26];
      const wrist: [number, number] = [bx + 12 + swing * 1.5, by - 34 + swing];
      c.thick([bx, by], elbow, 3, C.orangeDark);
      c.thick([bx - 1, by - 1], [elbow[0] - 1, elbow[1]], 2, C.orange);
      c.thick(elbow, wrist, 2.5, C.orangeDark);
      c.thick(
        [elbow[0], elbow[1] - 1],
        [wrist[0], wrist[1] - 1],
        1.5,
        C.orange,
      );
      c.p.ellipse(elbow[0], elbow[1], 4, 4, C.charcoal);
      c.p.ellipse(elbow[0], elbow[1], 2, 2, C.silver);
      c.p.ellipse(wrist[0], wrist[1], 3, 3, C.charcoal);
      c.p.rect(wrist[0] + 2, wrist[1] - 1, 2, 7, C.steel);
      c.p.rect(wrist[0] - 2, wrist[1] + 2, 2, 6, C.steel);
      c.p.pixel(bx - 2, by - 5, C.yellow);
    },
  },
  'm-server-rack': {
    footprint: [1, 1],
    h: 92,
    frames: 4,
    draw(c, f) {
      c.box(0.1, 0.1, 0.8, 0.8, 90, M.dark);
      for (let k = 0; k < 10; k++) {
        const z = 6 + k * 8;
        c.faceX(0.14, 0.901, 0.72, z, 6, C.ink);
        for (let i = 0; i < 5; i++) {
          const on = (k * 3 + i * 5 + f) % 4 !== 0;
          const [lx, ly] = c.at(0.2 + i * 0.12, 0.902, z + 3);
          c.p.pixel(
            lx,
            ly,
            on ? [C.beat, C.glow, C.yellow, C.blue][(k + i) % 4] : C.slate,
          );
        }
        c.edge([0.84, 0.902, z + 1], [0.84, 0.902, z + 5], C.slate);
      }
      c.faceY(0.901, 0.1, 0.8, 2, 86, C.charcoal);
      for (let z = 8; z < 88; z += 6)
        c.edge([0.902, 0.2, z], [0.902, 0.8, z], C.ink);
    },
  },
  'm-computer-desk': {
    footprint: [2, 1],
    h: 52,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [1.85, 0.05],
        [0.05, 0.85],
        [1.85, 0.85],
      ])
        c.box(x, y, 0.1, 0.1, 20, M.steel);
      c.box(0, 0, 2, 1, 2, M.oak, 20);
      // Potted plant.
      c.pot(0.25, 0.25, 22, 3, 5, R.white, C.soil);
      c.greenery(0.25, 0.25, 34, 6, R.leaf);
      // Monitor and keyboard.
      c.box(0.95, 0.2, 0.15, 0.1, 6, M.dark, 22);
      screen(c, 0.55, 0.32, 0.95, 26, 24);
      c.top(0.6, 0.55, 0.7, 0.18, 22, C.charcoal);
      for (let u = 0.65; u < 1.25; u += 0.1)
        c.top(u, 0.58, 0.06, 0.12, 22.5, C.slate);
      c.top(1.4, 0.6, 0.12, 0.18, 22, C.white);
      // Mug.
      c.cylinder(1.75, 0.55, 22, 2, 5, [C.red, C.red, C.redDark]);
    },
  },
  'm-whiteboard': {
    footprint: [2, 0.3],
    h: 76,
    draw(c) {
      for (const u of [0.15, 1.85]) {
        c.box(u - 0.05, 0.05, 0.1, 0.2, 72, M.steel);
        c.box(u - 0.15, -0.05, 0.3, 0.4, 2, M.steel);
      }
      c.faceX(-0.05, 0.25, 2.1, 30, 42, C.slate);
      c.faceX(0, 0.251, 2, 32, 38, C.white);
      const pt = (u: number, z: number) => c.at(u, 0.252, z);
      // Molecule: circles linked by bonds.
      const atoms: [number, number, string][] = [
        [0.3, 56, C.red],
        [0.6, 62, C.charcoal],
        [0.9, 55, C.blue],
        [0.6, 46, C.charcoal],
        [0.35, 40, C.green],
      ];
      for (const [i, j] of [
        [0, 1],
        [1, 2],
        [1, 3],
        [3, 4],
      ])
        c.line(
          pt(atoms[i][0], atoms[i][1]),
          pt(atoms[j][0], atoms[j][1]),
          C.slate,
        );
      for (const [u, z, col] of atoms) {
        const [x, y] = pt(u, z);
        c.p.ellipse(x, y, 2, 2, col);
      }
      // Graph: axes and a rising line.
      c.line(pt(1.15, 36), pt(1.15, 64), C.charcoal);
      c.line(pt(1.15, 36), pt(1.9, 36), C.charcoal);
      let prev = pt(1.15, 38);
      for (let k = 1; k <= 6; k++) {
        const next = pt(1.15 + k * 0.12, 38 + k * 3 + (k % 2) * 3);
        c.line(prev, next, C.blue);
        prev = next;
      }
      c.faceX(0.2, 0.253, 0.5, 31, 1, C.red);
    },
  },
  'm-screen-wall': {
    footprint: [3, 0.3],
    h: 80,
    draw(c) {
      for (const u of [0.4, 2.6]) c.box(u - 0.06, 0.05, 0.12, 0.2, 40, M.dark);
      c.faceX(-0.05, 0.25, 3.1, 36, 42, C.ink);
      c.faceX(0.02, 0.251, 2.96, 38, 38, C.navy);
      for (let i = 0; i < 8; i++)
        c.faceX(
          0.15 + i * 0.16,
          0.252,
          0.1,
          42,
          6 + ((i * 7) % 22),
          accents[i],
        );
      let prev = c.at(1.6, 0.252, 44);
      for (let k = 1; k <= 10; k++) {
        const next = c.at(1.6 + k * 0.13, 0.252, 44 + ((k * 13) % 9) + k * 2);
        c.line(prev, next, C.glow);
        prev = next;
      }
      for (let k = 0; k < 9; k++) {
        const [x, y] = c.at(
          1.7 + (k % 5) * 0.25,
          0.252,
          66 + Math.floor(k / 5) * 5,
        );
        c.p.rect(x, y, 2, 2, [C.yellow, C.pink, C.lime][k % 3]);
      }
      c.faceX(0.02, 0.252, 2.96, 38, 2, C.blueDark);
    },
  },
  'm-hospital-bed': {
    footprint: [2, 1],
    h: 34,
    draw(c) {
      for (const [x, y] of [
        [0.1, 0.1],
        [1.8, 0.1],
        [0.1, 0.8],
        [1.8, 0.8],
      ]) {
        c.box(x, y, 0.1, 0.1, 10, M.steel);
        const [wx, wy] = c.at(x + 0.05, y + 0.05, 0);
        c.p.rect(wx - 1, wy - 2, 3, 2, C.charcoal);
      }
      c.box(0, 0, 2, 1, 3, M.steel, 10);
      c.box(0.03, 0.03, 1.94, 0.94, 5, M.white, 13);
      c.box(
        0.6,
        0.02,
        1.38,
        0.96,
        1,
        { top: C.glassLight, front: C.glass, side: C.glassDark },
        17,
      );
      c.edge([0.6, 0.98, 18], [1.98, 0.98, 18], C.white);
      for (let u = 0.8; u < 1.9; u += 0.3)
        c.edge([u, 0.1, 18], [u + 0.05, 0.95, 18], C.glass);
      c.box(0.08, 0.15, 0.45, 0.7, 4, M.white, 18);
      c.box(-0.08, 0, 0.1, 1, 26, M.steel, 0);
      c.faceY(0.021, 0.05, 0.9, 12, 16, C.teal);
      // Side rail.
      c.edge([0.7, 1.02, 22], [1.7, 1.02, 22], C.steelDark);
      for (const u of [0.75, 1.65])
        c.edge([u, 1.02, 16], [u, 1.02, 22], C.steelDark);
    },
  },
  'm-iv-stand': {
    footprint: [0.5, 0.5],
    h: 76,
    draw(c) {
      const [x, y] = c.at(0.25, 0.25, 0);
      for (const d of [-5, -2, 2, 5])
        c.p.rect(x + d, y - 1 + Math.abs(d) / 3, 1, 2, C.charcoal);
      c.p.rect(x - 5, y - 2, 11, 1, C.steelDark);
      c.p.rect(x, y - 70, 1, 68, C.steel);
      c.p.rect(x - 4, y - 71, 9, 1, C.steelDark);
      c.p.rect(x + 2, y - 68, 5, 9, C.waterLight);
      c.p.rect(x + 3, y - 64, 3, 4, C.glass);
      c.p.pixel(x + 2, y - 68, C.white);
      c.line([x + 4, y - 59], [x + 6, y - 30], C.glassLight);
    },
  },
  'm-monitor-cart': {
    footprint: [1, 1],
    h: 64,
    frames: 4,
    draw(c, f) {
      c.box(0.2, 0.2, 0.6, 0.6, 3, M.dark, 3);
      for (const [x, y] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ]) {
        const [wx, wy] = c.at(x, y, 0);
        c.p.rect(wx - 1, wy - 3, 3, 3, C.ink);
      }
      c.box(0.45, 0.45, 0.1, 0.1, 30, M.steel, 6);
      c.box(0.15, 0.35, 0.7, 0.35, 4, M.white, 36);
      c.box(0.2, 0.4, 0.6, 0.15, 20, M.white, 40);
      c.faceX(0.24, 0.551, 0.52, 43, 15, C.screen);
      const pts: [number, number][] = [];
      for (let k = 0; k <= 12; k++) {
        const phase = (k + f * 3) % 12,
          z = phase === 4 ? 56 : phase === 5 ? 45 : phase === 6 ? 52 : 50;
        pts.push(c.at(0.26 + k * 0.04, 0.552, z));
      }
      for (let k = 1; k < pts.length; k++) c.line(pts[k - 1], pts[k], C.beat);
      const [lx, ly] = c.at(0.7, 0.552, 45);
      c.p.pixel(lx, ly, f % 2 ? C.red : C.yellow);
    },
  },
  'm-curtain': {
    footprint: [3, 0.3],
    h: 80,
    draw(c) {
      for (const u of [0, 3]) c.box(u - 0.05, 0.1, 0.1, 0.1, 78, M.steel);
      c.faceX(0, 0.15, 3, 76, 2, C.steelDark);
      for (let k = 0; k < 15; k++) {
        const u = 0.04 + k * 0.196;
        c.faceX(u, 0.16, 0.196, 8, 64, k % 2 ? C.mintDark : C.mint);
        c.faceX(u, 0.161, 0.04, 8, 64, k % 2 ? C.deepTeal : C.vinylLight);
        const [hx, hy] = c.at(u + 0.1, 0.16, 74);
        c.p.pixel(hx, hy, C.steelDark);
      }
      c.faceX(0.04, 0.162, 2.94, 8, 2, C.tealDark);
    },
  },
  'm-waiting-chairs': {
    footprint: [3, 1],
    h: 34,
    draw(c) {
      c.box(0.1, 0.4, 2.8, 0.15, 3, M.steel, 8);
      for (const u of [0.25, 2.65]) c.box(u, 0.4, 0.1, 0.15, 8, M.steel);
      for (let i = 0; i < 3; i++) {
        const u = 0.12 + i * 0.95;
        c.box(u, 0.2, 0.8, 0.65, 3, M.teal, 11);
        c.box(u + 0.02, 0.15, 0.76, 0.1, 18, M.teal, 14);
        c.edge([u + 0.08, 0.25, 30], [u + 0.72, 0.25, 30], C.mint);
      }
    },
  },
  'm-reception': {
    footprint: [3, 1],
    h: 56,
    draw(c) {
      c.box(0, 0, 3, 1, 26, M.white);
      c.faceX(0, 1.001, 3, 6, 4, C.teal);
      c.faceY(3.001, 0, 1, 6, 4, C.tealDark);
      c.faceX(0.2, 1.002, 2.6, 12, 10, C.offwhite);
      for (let u = 0.3; u < 2.8; u += 0.3)
        c.edge([u, 1.003, 12], [u, 1.003, 21], C.pale);
      c.box(-0.05, -0.05, 3.1, 1.1, 2, M.oak, 26);
      c.box(1.2, 0.2, 0.12, 0.1, 6, M.dark, 28);
      screen(c, 0.9, 0.32, 0.8, 32, 20, 1);
      c.pot(2.5, 0.5, 28, 4, 8, R.terracotta, C.soil);
      c.greenery(2.5, 0.5, 44, 9, R.leaf, C.yellow);
    },
  },
  'm-drafting-table': {
    footprint: [2, 1.5],
    h: 64,
    draw(c) {
      for (const [x, y] of [
        [0.1, 0.2],
        [1.8, 0.2],
        [0.1, 1.2],
        [1.8, 1.2],
      ])
        c.box(x, y, 0.08, 0.08, 22, M.steel);
      c.edge([0.15, 0.3, 8], [1.85, 0.3, 8], C.steelDark);
      c.poly(
        [
          [0, 0.1, 42],
          [2, 0.1, 42],
          [2, 1.4, 24],
          [0, 1.4, 24],
        ],
        C.white,
      );
      c.poly(
        [
          [0, 1.4, 24],
          [2, 1.4, 24],
          [2, 1.4, 21],
          [0, 1.4, 21],
        ],
        C.pale,
      );
      c.poly(
        [
          [0.15, 0.25, 40],
          [1.85, 0.25, 40],
          [1.85, 1.25, 26],
          [0.15, 1.25, 26],
        ],
        C.blue,
      );
      const pt = (x: number, t: number) => c.at(x, 0.25 + t, 40 - t * 14);
      for (let k = 0; k < 4; k++)
        c.line(
          pt(0.3, 0.15 + k * 0.22),
          pt(1.7, 0.15 + k * 0.22),
          C.glassLight,
        );
      for (let k = 0; k < 6; k++)
        c.line(pt(0.3 + k * 0.28, 0.1), pt(0.3 + k * 0.28, 0.85), C.glass);
      c.line(pt(0.5, 0.2), pt(1.2, 0.8), C.white);
      c.line(pt(1.2, 0.2), pt(0.5, 0.8), C.white);
      c.edge([0, 1.42, 24], [2, 1.42, 24], C.slate);
      // Ruler and lamp.
      c.edge([0.1, 1.2, 27], [1.9, 1.2, 27], C.yellow);
      const [lx, ly] = c.at(1.9, 0.15, 42);
      c.thick([lx, ly], [lx - 4, ly - 16], 0.5, C.charcoal);
      c.thick([lx - 4, ly - 16], [lx - 12, ly - 10], 0.5, C.charcoal);
      c.p.poly(
        [
          [lx - 16, ly - 8],
          [lx - 10, ly - 13],
          [lx - 8, ly - 8],
        ],
        C.red,
      );
      c.p.pixel(lx - 12, ly - 7, C.yellow);
    },
  },
  'm-tower-model': {
    footprint: [1, 1],
    h: 104,
    draw(c) {
      c.box(0.05, 0.05, 0.9, 0.9, 16, M.oak);
      c.faceX(0.05, 0.951, 0.9, 10, 2, C.woodDark);
      const base = 0.28,
        topS = 0.17,
        z0 = 16,
        z1 = 96;
      const s = (z: number) => base + ((topS - base) * (z - z0)) / (z1 - z0);
      const corners = (z: number) => {
        const k = s(z);
        return { a: 0.5 - k, b: 0.5 + k };
      };
      const b0 = corners(z0),
        b1 = corners(z1);
      c.poly(
        [
          [b0.a, b0.b, z0],
          [b0.b, b0.b, z0],
          [b1.b, b1.b, z1],
          [b1.a, b1.b, z1],
        ],
        C.charcoal,
      );
      c.poly(
        [
          [b0.b, b0.b, z0],
          [b0.b, b0.a, z0],
          [b1.b, b1.a, z1],
          [b1.b, b1.b, z1],
        ],
        C.ink,
      );
      c.top(b1.a, b1.a, b1.b - b1.a, b1.b - b1.a, z1, C.slate);
      for (let z = z0; z < z1; z += 4) {
        const k = corners(z);
        c.edge([k.a, k.b + 0.001, z], [k.b, k.b + 0.001, z], C.slate);
      }
      for (let z = z0; z < z1 - 1; z += 20) {
        const lo = corners(z),
          hi = corners(z + 20);
        c.edge([lo.a, lo.b + 0.002, z], [hi.b, hi.b + 0.002, z + 20], C.silver);
        c.edge([lo.b, lo.b + 0.002, z], [hi.a, hi.b + 0.002, z + 20], C.silver);
        c.edge(
          [lo.b + 0.002, lo.b, z],
          [hi.b + 0.002, hi.a, z + 20],
          C.steelDark,
        );
        c.edge(
          [lo.b + 0.002, lo.a, z],
          [hi.b + 0.002, hi.b, z + 20],
          C.steelDark,
        );
        c.edge([lo.a, lo.b + 0.002, z], [lo.b, lo.b + 0.002, z], C.white);
      }
      for (const d of [-0.05, 0.05]) {
        const [x, y] = c.at(0.5 + d, 0.5 + d, z1);
        c.p.rect(x, y - 8, 1, 8, C.silver);
      }
    },
  },
  'm-wave-model': {
    footprint: [2, 1],
    h: 42,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [1.85, 0.05],
        [0.05, 0.85],
        [1.85, 0.85],
      ])
        c.box(x, y, 0.1, 0.1, 20, M.wood);
      c.box(0, 0, 2, 1, 2, M.white, 20);
      c.top(0.1, 0.1, 1.8, 0.8, 22, C.mint);
      for (let ribbon = 0; ribbon < 2; ribbon++) {
        const height = (t: number) =>
          3 +
          Math.sin(t * Math.PI) * (11 - ribbon * 4) +
          Math.sin(t * 7 + ribbon) * 2;
        for (let t = 0; t <= 1; t += 0.008) {
          const x = 0.2 + t * 1.6,
            y = 0.32 + ribbon * 0.32 + Math.sin(t * 4 + ribbon) * 0.1,
            h = height(t),
            slope = height(t + 0.01) - h;
          const [px, py] = c.at(x, y, 22);
          c.p.rect(
            px,
            py - h,
            1,
            h,
            slope > 0.05 ? C.white : slope < -0.05 ? C.pale : C.offwhite,
          );
          c.p.pixel(px, py - h, C.white);
          c.p.pixel(px, py - h - 1, C.silver);
          c.p.pixel(px, py, C.silver);
        }
      }
    },
  },
  'm-kitchen-counter': {
    footprint: [3, 1],
    h: 70,
    frames: 4,
    draw(c, f) {
      c.box(0, 0, 3, 1, 22, M.steel);
      for (let u = 0.1; u < 3; u += 1) {
        c.faceX(u, 1.001, 0.8, 3, 16, C.steelLight);
        c.faceX(u + 0.3, 1.002, 0.2, 15, 1, C.slate);
      }
      c.box(-0.03, -0.03, 3.06, 1.06, 2, M.steel, 22);
      const pots: [number, number, number, string][] = [
        [0.5, 0.5, 9, C.orange],
        [1.5, 0.5, 8, C.yellowDark],
        [2.45, 0.5, 7, C.red],
      ];
      for (const [x, y, r, food] of pots) {
        c.cylinder(x, y, 24, r, r + 3, R.steel);
        const [cx, cy] = c.at(x, y, 27 + r);
        c.p.ellipse(cx, cy, r - 1, (r - 1) / 2, food);
        c.p.rect(cx - r - 2, cy + 3, 3, 2, C.charcoal);
        c.p.rect(cx + r, cy + 3, 3, 2, C.charcoal);
        for (let k = 0; k < 4; k++) {
          const drift = (f + k) % 4;
          c.p.pixel(
            cx - 3 + k * 2 + (drift % 2),
            cy - 4 - drift * 4 - k,
            C.white,
          );
          c.p.pixel(cx - 2 + k * 2, cy - 6 - drift * 4 - k, C.pale);
        }
      }
      const [lx, ly] = c.at(1.5, 0.5, 35);
      c.line([lx + 2, ly], [lx + 8, ly - 14], C.steelDark);
    },
  },
  'm-dining-table': {
    footprint: [4, 1],
    h: 32,
    draw(c) {
      for (const [x, y] of [
        [0.1, 0.1],
        [3.8, 0.1],
        [0.1, 0.8],
        [3.8, 0.8],
      ])
        c.box(x, y, 0.1, 0.1, 18, M.wood);
      c.box(0, 0, 4, 1, 3, M.oak, 18);
      c.top(0.1, 0.35, 3.8, 0.3, 21, C.red);
      c.edge([0.1, 0.5, 21], [3.9, 0.5, 21], C.yellow);
      const foods = [C.rice, C.green, C.orange, C.yellow, C.red, C.lime];
      for (let i = 0; i < 6; i++) {
        for (const y of [0.22, 0.78]) {
          const [x, py] = c.at(0.35 + i * 0.6, y, 21);
          c.p.ellipse(x, py, 5, 2, C.white);
          c.p.ellipse(
            x,
            py - 1,
            3,
            1,
            foods[(i + (y > 0.5 ? 2 : 0)) % foods.length],
          );
          c.p.pixel(x - 1, py - 2, C.cream);
        }
        if (i % 2 === 0) {
          const [bx, by] = c.at(0.65 + i * 0.6, 0.5, 21);
          c.p.ellipse(bx, by - 2, 4, 3, C.teal);
          c.p.ellipse(bx, by - 4, 3, 1, [C.orange, C.green, C.rice][i / 2]);
        } else {
          c.cylinder(0.65 + i * 0.6, 0.5, 21, 2, 8, R.glass);
        }
      }
      for (let i = 0; i < 8; i++)
        c.cylinder(0.25 + i * 0.5, 0.06 + (i % 2) * 0.88, 21, 1.5, 3, R.white);
    },
  },
  'm-food-shelf': {
    footprint: [3, 0.7],
    h: 64,
    side: true,
    draw(c) {
      for (const u of [0, 2.94]) c.box(u, 0, 0.06, 0.7, 62, M.steel);
      for (let r = 0; r < 4; r++) {
        const z = 2 + r * 15;
        c.box(0, 0, 3, 0.7, 1, M.steel, z);
        let u = 0.1;
        let k = r * 5;
        while (u < 2.85) {
          const kind = k % 4;
          if (kind === 0) {
            c.box(
              u,
              0.15,
              0.32,
              0.45,
              10,
              {
                top: C.cream,
                front: accents[k % accents.length],
                side: C.woodDark,
              },
              z + 1,
            );
            u += 0.36;
          } else if (kind === 1) {
            for (let j = 0; j < 3; j++)
              c.cylinder(u + 0.08 + j * 0.13, 0.5, z + 1, 2, 6, [
                C.steelLight,
                accents[(k + j) % accents.length],
                C.steelDark,
              ]);
            u += 0.42;
          } else if (kind === 2) {
            const [sx, sy] = c.at(u + 0.2, 0.5, z + 1);
            c.p.ellipse(sx, sy - 5, 6, 6, C.rice);
            c.p.rect(sx - 6, sy - 5, 12, 5, C.rice);
            c.p.rect(sx - 6, sy - 6, 3, 6, C.cream);
            c.p.rect(sx + 3, sy - 6, 3, 6, C.woodLight);
            c.p.rect(sx - 3, sy - 5, 6, 2, accents[k % accents.length]);
            u += 0.45;
          } else {
            for (let j = 0; j < 2; j++) {
              const [bx, by] = c.at(u + 0.1 + j * 0.15, 0.5, z + 1);
              c.p.rect(bx, by - 9, 3, 9, j ? C.glass : C.green);
              c.p.rect(bx + 1, by - 12, 1, 3, C.charcoal);
              c.p.pixel(bx, by - 8, C.white);
            }
            u += 0.36;
          }
          k++;
        }
      }
    },
  },
  'm-fridge': {
    footprint: [1, 1],
    h: 76,
    draw(c) {
      c.box(0.1, 0.1, 0.8, 0.8, 74, M.steel);
      c.edge([0.1, 0.901, 46], [0.9, 0.901, 46], C.slate);
      c.faceX(0.75, 0.902, 0.05, 50, 18, C.charcoal);
      c.faceX(0.75, 0.902, 0.05, 28, 14, C.charcoal);
      c.edge([0.15, 0.902, 72], [0.4, 0.902, 72], C.white);
      c.faceX(0.25, 0.902, 0.15, 60, 6, C.yellow);
      c.faceX(0.45, 0.902, 0.12, 56, 7, C.pink);
    },
  },
  'm-bookshelf': {
    footprint: [3, 0.6],
    h: 68,
    side: true,
    draw(c) {
      c.box(0, 0, 3, 0.6, 66, M.white);
      for (let r = 0; r < 4; r++) {
        const z = 4 + r * 15.5;
        c.faceX(0.06, 0.601, 2.88, z, 13, C.pale);
        let u = 0.1;
        let k = r * 7;
        while (u < 2.8) {
          if (k % 11 === 5) {
            c.pot(u + 0.1, 0.5, z, 3, 5, R.terracotta, C.soil);
            c.greenery(u + 0.1, 0.5, z + 10, 5, R.leaf);
            u += 0.3;
          } else if (k % 17 === 9) {
            const [gx, gy] = c.at(u + 0.12, 0.6, z);
            c.p.rect(gx, gy - 2, 1, 2, C.woodDark);
            c.p.ellipse(gx, gy - 7, 4, 4, C.blue);
            c.p.rect(gx - 2, gy - 9, 3, 2, C.green);
            c.p.rect(gx, gy - 5, 2, 2, C.green);
            u += 0.3;
          } else {
            book(
              c,
              u,
              0.602,
              z,
              7 + ((k * 5) % 6),
              accents[k % accents.length],
            );
            u += 0.13;
          }
          k++;
        }
        c.faceX(0, 0.603, 3, z - 2, 2, C.offwhite);
      }
    },
  },
  'm-kids-table': {
    footprint: [2, 2],
    h: 30,
    draw(c) {
      const [cx, cy] = c.at(1, 1, 12);
      for (const [dx, dy] of [
        [-12, 0],
        [12, 0],
        [0, 6],
        [0, -6],
      ])
        c.p.rect(cx + dx, cy + dy, 2, 12, C.steelDark);
      c.p.ellipse(cx, cy + 2, 24, 12, C.yellowDark);
      c.p.ellipse(cx, cy, 24, 12, C.yellow);
      c.p.ellipse(cx - 4, cy - 2, 16, 7, C.cream);
      // Small laptops.
      for (const [x, y, col] of [
        [0.6, 0.7, C.blue],
        [1.4, 1.2, C.pink],
      ] as [number, number, string][]) {
        c.top(x - 0.2, y - 0.1, 0.4, 0.25, 12, C.silver);
        c.faceX(x - 0.2, y - 0.1, 0.4, 12, 9, col);
        c.faceX(x - 0.17, y - 0.099, 0.34, 13, 7, C.screen);
        c.faceX(x - 0.1, y - 0.098, 0.15, 15, 3, C.glow);
      }
      // Robotics kit.
      c.box(1.1, 0.45, 0.35, 0.3, 5, M.orange, 12);
      for (const [x, y] of [
        [1.12, 0.78],
        [1.4, 0.78],
      ]) {
        const [wx, wy] = c.at(x, y, 13);
        c.p.ellipse(wx, wy, 2, 2, C.ink);
      }
      const [ax, ay] = c.at(1.27, 0.6, 17);
      c.p.rect(ax, ay - 5, 1, 5, C.charcoal);
      c.p.pixel(ax, ay - 6, C.red);
      c.p.ellipse(
        c.at(0.6, 1.35, 13)[0],
        c.at(0.6, 1.35, 13)[1],
        3,
        2,
        C.green,
      );
    },
  },
  'm-solar-panel': {
    footprint: [2, 2],
    h: 40,
    draw(c) {
      for (const [x, y, h] of [
        [0.2, 0.3, 34],
        [1.8, 0.3, 34],
        [0.2, 1.7, 12],
        [1.8, 1.7, 12],
      ])
        c.box(x - 0.04, y - 0.04, 0.08, 0.08, h, M.steel);
      c.poly(
        [
          [0, 0.15, 36],
          [2, 0.15, 36],
          [2, 1.85, 12],
          [0, 1.85, 12],
        ],
        C.steel,
      );
      c.poly(
        [
          [0.06, 0.2, 35],
          [1.94, 0.2, 35],
          [1.94, 1.8, 13],
          [0.06, 1.8, 13],
        ],
        C.navy,
      );
      const pt = (x: number, t: number) => c.at(x, 0.2 + t * 1.6, 35 - t * 22);
      for (let k = 1; k < 6; k++)
        c.line(pt(0.06, k / 6), pt(1.94, k / 6), C.blueDark);
      for (let k = 1; k < 8; k++)
        c.line(pt(0.06 + k * 0.235, 0), pt(0.06 + k * 0.235, 1), C.blue);
      c.line(pt(0.3, 0.05), pt(0.9, 0.5), C.glassDark);
      c.line(pt(0.35, 0.05), pt(0.95, 0.5), C.glassDark);
      c.edge([0, 1.86, 12], [2, 1.86, 12], C.silver);
    },
  },
  'm-bike-rack': {
    footprint: [3, 1],
    h: 30,
    draw(c) {
      c.box(0.05, 0.45, 2.9, 0.1, 2, M.steel);
      for (let i = 0; i < 3; i++) {
        const u = 0.4 + i * 1,
          col = [C.red, C.teal, C.yellow][i];
        const [fx, fy] = c.at(u, 0.55, 0);
        const back: [number, number] = [fx - 10, fy - 4],
          front: [number, number] = [fx + 6, fy + 4];
        for (const w of [back, front]) {
          c.p.ellipse(w[0], w[1] - 7, 6, 7, C.ink);
          c.p.ellipse(w[0], w[1] - 7, 4, 5, C.pale);
          c.p.ellipse(w[0], w[1] - 7, 3, 4, C.ink);
          c.p.ellipse(w[0], w[1] - 7, 2, 3, C.pale);
          c.p.pixel(w[0], w[1] - 7, C.slate);
        }
        const seat: [number, number] = [back[0] + 5, back[1] - 17],
          bar: [number, number] = [front[0] - 1, front[1] - 20];
        c.thick([back[0], back[1] - 7], [seat[0], seat[1]], 0.6, col);
        c.thick([seat[0], seat[1] + 2], [bar[0], bar[1] + 4], 0.6, col);
        c.thick([front[0], front[1] - 7], [bar[0], bar[1]], 0.6, col);
        c.thick([back[0], back[1] - 7], [front[0] - 6, front[1] - 9], 0.6, col);
        c.thick([front[0] - 6, front[1] - 9], [seat[0], seat[1] + 2], 0.6, col);
        c.p.rect(seat[0] - 2, seat[1] - 1, 5, 2, C.charcoal);
        c.p.rect(bar[0] - 2, bar[1] - 1, 5, 1, C.charcoal);
      }
      for (const u of [0.1, 2.9])
        c.box(u - 0.03, 0.47, 0.06, 0.06, 14, M.steel);
    },
  },
  'm-street-lamp': {
    footprint: [0.5, 0.5],
    h: 100,
    draw(c) {
      c.box(0.1, 0.1, 0.3, 0.3, 6, M.dark);
      const [x, y] = c.at(0.25, 0.25, 6);
      c.p.rect(x - 1, y - 82, 3, 82, C.slate);
      c.p.rect(x - 1, y - 82, 1, 82, C.grey);
      c.p.rect(x, y - 82, 12, 2, C.slate);
      c.p.rect(x + 6, y - 81, 8, 3, C.charcoal);
      c.p.rect(x + 7, y - 78, 6, 2, C.yellow);
      c.p.pixel(x + 9, y - 77, C.white);
      c.p.poly(
        [
          [x - 9, y - 88],
          [x + 3, y - 94],
          [x + 7, y - 88],
          [x - 5, y - 82],
        ],
        C.navy,
      );
      c.line([x - 7, y - 87], [x + 4, y - 92], C.blue);
      c.line([x - 3, y - 85], [x + 6, y - 89], C.blue);
      c.p.rect(x - 1, y - 30, 3, 6, C.teal);
    },
  },
  'm-bench': {
    footprint: [2, 1],
    h: 32,
    draw(c) {
      for (const u of [0.2, 1.8]) {
        c.box(u - 0.04, 0.3, 0.08, 0.5, 13, M.dark);
        c.box(u - 0.04, 0.2, 0.08, 0.1, 30, M.dark);
      }
      for (let k = 0; k < 3; k++)
        c.box(0, 0.32 + k * 0.17, 2, 0.13, 2, M.oak, 13);
      for (let k = 0; k < 2; k++) c.box(0, 0.2, 2, 0.06, 4, M.oak, 18 + k * 7);
    },
  },
  'm-cafe-table': {
    footprint: [1, 1],
    h: 32,
    draw(c) {
      const chair = (x: number, y: number, col: string, back: boolean) => {
        c.box(
          x - 0.15,
          y - 0.15,
          0.3,
          0.3,
          2,
          { top: col, front: C.charcoal, side: C.ink },
          12,
        );
        for (const [dx, dy] of [
          [-0.12, -0.12],
          [0.12, 0.12],
          [-0.12, 0.12],
          [0.12, -0.12],
        ]) {
          const [lx, ly] = c.at(x + dx, y + dy, 0);
          c.p.rect(lx, ly - 12, 1, 12, C.charcoal);
        }
        if (back) c.faceX(x - 0.15, y - 0.15, 0.3, 14, 12, col);
      };
      chair(0.18, 0.5, C.red, false);
      const [cx, cy] = c.at(0.5, 0.5, 0);
      c.p.rect(cx - 1, cy - 20, 2, 20, C.charcoal);
      c.p.ellipse(cx, cy - 1, 5, 2, C.charcoal);
      c.p.ellipse(cx, cy - 20, 11, 6, C.slate);
      c.p.ellipse(cx, cy - 21, 11, 5, C.white);
      for (const [dx, col] of [
        [-4, C.woodDark],
        [4, C.teal],
      ] as [number, string][]) {
        c.p.rect(cx + dx - 1, cy - 25, 3, 3, C.white);
        c.p.rect(cx + dx - 1, cy - 25, 3, 1, col);
        c.p.pixel(cx + dx + 2, cy - 24, C.pale);
      }
      chair(0.82, 0.5, C.yellow, true);
    },
  },
  'm-coffee-cart': {
    footprint: [2, 1],
    h: 70,
    draw(c) {
      for (const [x, y] of [
        [0.3, 0.9],
        [1.7, 0.9],
      ]) {
        const [wx, wy] = c.at(x, y, 4);
        c.p.ellipse(wx, wy, 4, 4, C.ink);
        c.p.ellipse(wx, wy, 2, 2, C.silver);
      }
      c.box(
        0,
        0,
        2,
        1,
        24,
        { top: C.woodLight, front: C.teal, side: C.tealDark, edge: C.deepTeal },
        4,
      );
      c.faceX(0.1, 1.001, 1.8, 12, 4, C.cream);
      c.box(0.3, 0.2, 0.7, 0.5, 14, M.steel, 28);
      c.faceX(0.4, 0.701, 0.5, 34, 5, C.charcoal);
      c.faceX(0.5, 0.702, 0.1, 30, 4, C.slate);
      c.cylinder(1.4, 0.5, 28, 3, 6, R.white);
      c.cylinder(1.65, 0.5, 28, 3, 5, [C.woodLight, C.wood, C.woodDark]);
      for (const u of [0.05, 1.95])
        c.box(u - 0.03, 0.85, 0.06, 0.06, 36, M.steel, 28);
      for (let i = 0; i < 8; i++) {
        c.top(i * 0.25 - 0.05, -0.1, 0.25, 1.2, 64, i % 2 ? C.white : C.red);
        c.faceX(
          i * 0.25 - 0.05,
          1.1,
          0.25,
          58,
          6,
          i % 2 ? C.offwhite : C.redDark,
        );
      }
    },
  },
  'm-tree': {
    footprint: [1, 1],
    h: 106,
    pad: 28,
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      c.p.ellipse(x, y, 7, 3, C.soil);
      c.p.poly(
        [
          [x - 3, y],
          [x + 3, y],
          [x + 2, y - 50],
          [x - 2, y - 50],
        ],
        C.trunk,
      );
      c.p.rect(x - 2, y - 48, 1, 46, C.woodDark);
      c.line([x, y - 38], [x - 10, y - 56], C.trunk);
      c.line([x + 1, y - 34], [x + 12, y - 52], C.trunk);
      c.greenery(0.5, 0.5, 70, 28, R.leaf, C.lime);
      c.greenery(0.3, 0.7, 56, 20, R.leaf);
      c.greenery(0.7, 0.3, 84, 18, R.leaf, C.leafLight);
    },
  },
  'm-planter-box': {
    footprint: [2, 1],
    h: 36,
    draw(c) {
      c.box(0, 0, 2, 1, 12, M.concrete);
      c.top(0.08, 0.08, 1.84, 0.84, 12, C.soil);
      for (let i = 0; i < 26; i++) {
        const x = 0.15 + ((i * 7) % 18) * 0.095,
          y = 0.15 + ((i * 5) % 7) * 0.1,
          [px, py] = c.at(x, y, 12),
          h = 6 + ((i * 3) % 9);
        c.line(
          [px, py],
          [px + ((i % 3) - 1) * 2, py - h],
          i % 2 ? C.leaf : C.leafDark,
        );
        if (i % 3 === 0) {
          const col = [C.pink, C.yellow, C.purple, C.red, C.white][i % 5];
          c.p.rect(px + ((i % 3) - 1) * 2 - 1, py - h - 1, 3, 2, col);
        }
      }
    },
  },
  'm-fountain': {
    footprint: [3, 3],
    h: 52,
    frames: 4,
    draw(c, f) {
      c.box(0, 0, 3, 3, 9, M.stone);
      c.top(0.2, 0.2, 2.6, 2.6, 9, C.tealDark);
      c.top(0.3, 0.3, 2.4, 2.4, 9, C.turquoise);
      for (let k = 0; k < 5; k++) {
        const r = 0.2 + ((k + f) % 5) * 0.22;
        c.edge([1.5 - r, 1.5, 9], [1.5, 1.5 - r, 9], C.waterLight);
        c.edge([1.5 + r, 1.5, 9], [1.5, 1.5 + r, 9], C.water);
      }
      c.box(1.2, 1.2, 0.6, 0.6, 16, M.white, 9);
      c.top(1.25, 1.25, 0.5, 0.5, 25, C.turquoise);
      const [cx, cy] = c.at(1.5, 1.5, 25);
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * Math.PI * 2 + 0.6,
          tx = Math.cos(a) * 22,
          ty = Math.sin(a) * 11;
        for (let k = 0; k < 10; k++) {
          const t = k / 10,
            h = Math.sin(t * Math.PI) * (16 + (f % 2) * 2);
          c.p.pixel(
            cx + tx * t,
            cy + ty * t - h,
            (k + f) % 3 ? C.waterLight : C.white,
          );
        }
      }
      for (let k = 0; k < 6; k++)
        c.p.pixel(
          cx + ((k * 3) % 5) - 2,
          cy - 16 - ((k * 5 + f * 3) % 10),
          C.white,
        );
      c.p.rect(cx, cy - 22, 1, 22, C.waterLight);
    },
  },
  'm-bus-shelter': {
    footprint: [3, 1],
    h: 76,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.1],
        [2.95, 0.1],
        [2.95, 0.9],
      ])
        c.box(x - 0.04, y - 0.04, 0.08, 0.08, 70, M.dark);
      c.faceX(0.05, 0.1, 2.9, 6, 60, C.glassLight);
      for (let u = 0.3; u < 2.9; u += 0.7)
        c.edge([u, 0.101, 12], [u + 0.3, 0.101, 50], C.white);
      c.box(0.3, 0.25, 2.2, 0.3, 2, M.oak, 13);
      for (const u of [0.4, 2.4]) c.box(u, 0.3, 0.06, 0.2, 13, M.dark);
      // Abstract route map on the side panel.
      c.faceY(2.96, 0.15, 0.7, 10, 54, C.white);
      c.edge([2.961, 0.25, 20], [2.961, 0.7, 56], C.red);
      c.edge([2.961, 0.2, 40], [2.961, 0.8, 30], C.blue);
      c.edge([2.961, 0.3, 54], [2.961, 0.75, 18], C.green);
      for (const [y, z] of [
        [0.45, 36],
        [0.6, 46],
        [0.35, 28],
      ]) {
        const [px, py] = c.at(2.961, y, z);
        c.p.rect(px - 1, py - 1, 3, 3, C.charcoal);
      }
      c.box(
        -0.1,
        -0.05,
        3.2,
        1.1,
        4,
        { top: C.white, front: C.teal, side: C.tealDark, edge: C.deepTeal },
        70,
      );
    },
  },
  'm-water-cooler': {
    footprint: [0.5, 0.5],
    h: 52,
    draw(c) {
      c.box(0.05, 0.05, 0.4, 0.4, 32, M.white);
      c.faceX(0.12, 0.451, 0.26, 18, 6, C.charcoal);
      const [tx, ty] = c.at(0.18, 0.452, 22);
      c.p.pixel(tx, ty, C.blue);
      c.p.pixel(tx + 3, ty, C.red);
      c.cylinder(0.25, 0.25, 32, 5, 14, R.glass, C.glassLight);
      c.cylinder(0.25, 0.25, 46, 2, 3, R.blue);
      const [bx, by] = c.at(0.25, 0.25, 36);
      c.p.rect(bx - 4, by - 8, 1, 6, C.white);
    },
  },
  'm-desk-plant': {
    footprint: [0.5, 0.5],
    h: 50,
    pad: 14,
    draw(c) {
      c.pot(0.25, 0.25, 0, 6, 12, R.white, C.soil);
      const [x, y] = c.at(0.25, 0.25, 12);
      for (const [dx, dy, r] of [
        [-8, -18, 7],
        [7, -22, 7],
        [-3, -30, 6],
        [5, -10, 6],
        [-9, -8, 5],
        [1, -38, 5],
      ]) {
        c.line([x, y], [x + dx * 0.6, y + dy * 0.6], C.leafDark);
        c.p.ellipse(x + dx, y + dy, r, r * 0.6, C.leaf);
        c.p.ellipse(x + dx - 1, y + dy - 1, r * 0.6, r * 0.3, C.leafLight);
        c.line([x + dx - r + 2, y + dy], [x + dx + r - 2, y + dy], C.leafDark);
      }
    },
  },
};

/* ───────────── Football stadium ───────────── */
const fanSkins = [C.fanSkin1, C.fanSkin2, C.fanSkin3, C.fanSkin4];
const kit = [
  C.white,
  C.red,
  C.blue,
  C.yellow,
  C.green,
  C.navy,
  C.orange,
  C.purple,
  C.teal,
  C.pink,
  C.charcoal,
];
/** A point on a tile-space circle, plotted as an iso pixel. */
function arc(
  c: IsoCanvas,
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
  col: string,
) {
  const n = Math.ceil(r * 64);
  for (let k = 0; k <= n; k++) {
    const a = from + ((to - from) * k) / n,
      [x, y] = c.at(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    c.p.pixel(x, y, col);
    c.p.pixel(x + 1, y, col);
  }
}
function goal(c: IsoCanvas, postX: number, backX: number) {
  const H = 22,
    backH = 15;
  const grid = (a: [number, number, number], b: [number, number, number]) =>
    c.edge(a, b, C.net);
  // Net: back, sides and roof as a see-through grid.
  for (let y = 0; y <= 4.001; y += 0.5) grid([backX, y, 0], [backX, y, backH]);
  for (let z = 0; z <= backH; z += 5) grid([backX, 0, z], [backX, 4, z]);
  for (const y of [0, 4]) {
    for (let t = 0; t <= 1.001; t += 0.5) {
      const x = postX + (backX - postX) * t;
      grid([x, y, 0], [x, y, H + (backH - H) * t]);
    }
    for (let z = 0; z <= H; z += 5)
      grid([postX, y, Math.min(z, H)], [backX, y, Math.min(z, backH)]);
  }
  for (let y = 0; y <= 4.001; y += 0.5) grid([postX, y, H], [backX, y, backH]);
  c.edge([backX, 0, backH], [backX, 4, backH], C.netShade);
  c.edge([backX, 0, 0], [backX, 4, 0], C.netShade);
  // Posts and crossbar.
  for (const y of [0, 4]) {
    const [x0, y0] = c.at(postX, y, 0);
    c.p.rect(x0 - 1, y0 - H, 3, H + 1, C.white);
    c.p.rect(x0 + 1, y0 - H, 1, H + 1, C.pale);
  }
  const a = c.at(postX, 0, H),
    b = c.at(postX, 4, H);
  c.thick(a, b, 1, C.white);
  c.line([a[0], a[1] + 1], [b[0], b[1] + 1], C.pale);
}
const stadium: Record<string, Spec> = {
  'm-pitch': {
    footprint: [24, 16],
    h: 2,
    floor: true,
    draw(c) {
      c.top(0, 0, 24, 16, 0, C.pitchDark);
      for (let i = 0; i < 16; i++)
        c.top(i * 1.5, 0.05, 1.5, 15.9, 0, i % 2 ? C.pitch : C.pitchLight);
      const L = C.line,
        ln = (x1: number, y1: number, x2: number, y2: number) => {
          c.edge([x1, y1, 0], [x2, y2, 0], L);
          const a = c.at(x1, y1),
            b = c.at(x2, y2);
          c.line([a[0] + 1, a[1]], [b[0] + 1, b[1]], L);
        },
        rectL = (x: number, y: number, w: number, d: number) => {
          ln(x, y, x + w, y);
          ln(x + w, y, x + w, y + d);
          ln(x + w, y + d, x, y + d);
          ln(x, y + d, x, y);
        };
      rectL(0.5, 0.5, 23, 15);
      ln(12, 0.5, 12, 15.5);
      arc(c, 12, 8, 2.2, 0, Math.PI * 2, L);
      for (const x of [0.5, 20.3]) rectL(x, 4, 3.2, 8);
      for (const x of [0.5, 22.4]) rectL(x, 6, 1.1, 4);
      arc(c, 2.6, 8, 2.2, -0.93, 0.93, L);
      arc(c, 21.4, 8, 2.2, Math.PI - 0.93, Math.PI + 0.93, L);
      for (const [x, y] of [
        [12, 8],
        [2.6, 8],
        [21.4, 8],
      ]) {
        const [px, py] = c.at(x, y);
        c.p.rect(px - 1, py - 1, 3, 2, L);
      }
      for (const [x, y, a] of [
        [0.5, 0.5, 0],
        [23.5, 0.5, Math.PI / 2],
        [23.5, 15.5, Math.PI],
        [0.5, 15.5, -Math.PI / 2],
      ])
        arc(c, x, y, 0.45, a, a + Math.PI / 2, L);
    },
  },
  'm-goal-west': {
    footprint: [1, 4],
    h: 26,
    draw(c) {
      goal(c, 1, 0.15);
    },
  },
  'm-goal-east': {
    footprint: [1, 4],
    h: 26,
    draw(c) {
      goal(c, 0, 0.85);
    },
  },
  'm-stand': {
    footprint: [8, 3],
    h: 100,
    side: true,
    frames: 4,
    draw(c, f) {
      const tiers = 6,
        step = 12,
        depth = 3 / tiers;
      // Back wall and roof canopy.
      c.faceX(0, 0, 8, 0, tiers * step + 14, C.concreteShade);
      c.faceY(8, 0, 0.15, 0, tiers * step + 14, C.concreteLine);
      // Roof supports behind the tiers.
      for (const x of [0, 4, 7.88])
        c.box(x, -0.12, 0.12, 0.12, tiers * step + 14, M.steel);
      for (let i = tiers - 1; i >= 0; i--) {
        const y = 3 - (i + 1) * depth,
          z = (i + 1) * step;
        c.box(0, y, 8, depth, z, M.concrete);
        // Seats along the tread, with a fan in most of them.
        for (let k = 0; k < 24; k++) {
          const x = 0.17 + k * 0.33,
            n = k * 7 + i * 13,
            [px, py] = c.at(x, y + depth * 0.55, z),
            seat = [C.red, C.blue, C.teal, C.yellow][
              (i + Math.floor(k / 6)) % 4
            ];
          c.p.rect(px - 2, py - 4, 4, 4, seat);
          c.p.rect(px - 2, py - 1, 4, 1, C.charcoal);
          if (n % 9 === 4) continue;
          const shirt = kit[n % kit.length],
            skin = fanSkins[(n * 3) % 4],
            cheer = (n + f * 3 + Math.floor(k / 4)) % 6 < 2,
            bob = cheer ? 1 : 0;
          c.p.rect(px - 1, py - 8 - bob, 3, 5, shirt);
          c.p.pixel(px + 1, py - 4 - bob, C.edge);
          c.p.rect(px - 1, py - 11 - bob, 3, 3, skin);
          c.p.rect(
            px - 1,
            py - 12 - bob,
            3,
            1,
            n % 4 ? C.fanHair : kit[(n + 3) % kit.length],
          );
          if (cheer) {
            c.p.rect(px - 2, py - 13 - bob, 1, 4, skin);
            c.p.rect(px + 2, py - 13 - bob, 1, 4, skin);
            if (n % 5 === 0)
              c.p.rect(px - 2, py - 14 - bob, 5, 1, kit[(n + 5) % kit.length]);
          }
          if (n % 23 === 0) {
            // A plain flag on a short pole.
            c.p.rect(px + 2, py - 20, 1, 12, C.woodDark);
            c.p.rect(
              px + 3,
              py - 20 + (f % 2),
              5,
              4,
              kit[(n + 1) % kit.length],
            );
            c.p.rect(
              px + 3,
              py - 18 + (f % 2),
              5,
              1,
              kit[(n + 2) % kit.length],
            );
          }
        }
        c.edge([0, y + depth, z], [8, y + depth, z], C.stoneLine);
      }
      // Stairway aisles.
      for (const x of [2.6, 5.3])
        for (let i = 0; i < tiers; i++)
          c.top(
            x,
            3 - (i + 1) * depth,
            0.18,
            depth,
            (i + 1) * step + 0.5,
            C.warmGreyLight,
          );
      c.box(-0.05, -0.25, 8.1, 0.6, 4, M.teal, tiers * step + 14);
      c.box(-0.05, 0.3, 8.1, 0.12, 2, M.white, tiers * step + 12);
    },
  },
  'm-ad-boards': {
    footprint: [8, 0.3],
    h: 14,
    side: true,
    draw(c) {
      c.box(0, 0, 8, 0.3, 10, M.dark);
      const panels = [
        C.red,
        C.blue,
        C.yellow,
        C.green,
        C.orange,
        C.purple,
        C.teal,
        C.navy,
      ];
      for (let i = 0; i < 8; i++) {
        const col = panels[i % panels.length];
        c.faceX(i + 0.04, 0.301, 0.92, 1.5, 7.5, col);
        c.faceX(i + 0.15, 0.302, 0.4, 3.5, 3, C.white);
        c.faceX(i + 0.6, 0.302, 0.28, 3, 4, panels[(i + 3) % panels.length]);
      }
    },
  },
  'm-floodlight': {
    footprint: [1, 1],
    h: 232,
    draw(c) {
      const H = 200,
        legs: [number, number][] = [
          [0.1, 0.1],
          [0.9, 0.1],
          [0.9, 0.9],
          [0.1, 0.9],
        ];
      const pt = (i: number, z: number): [number, number, number] => {
        const t = z / H,
          [x, y] = legs[i];
        return [x + (0.5 - x) * t * 0.7, y + (0.5 - y) * t * 0.7, z];
      };
      c.box(0, 0, 1, 1, 6, M.concrete);
      for (const i of [0, 1, 3, 2])
        c.edge(pt(i, 6), pt(i, H), i === 2 ? C.steelDark : C.steel);
      for (let z = 6; z < H; z += 18)
        for (const [a, b] of [
          [3, 2],
          [1, 2],
          [0, 3],
          [0, 1],
        ]) {
          c.edge(pt(a, z), pt(b, z + 18), C.steelDark);
          c.edge(pt(b, z), pt(a, z + 18), C.steel);
          c.edge(pt(a, z), pt(b, z), C.steelDark);
        }
      c.box(0.2, 0.2, 0.6, 0.6, 4, M.steel, H);
      // Lamp bank facing the pitch.
      c.faceX(-0.3, 0.6, 1.6, H + 4, 26, C.charcoal);
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 5; k++) {
          const [px, py] = c.at(-0.2 + k * 0.3 + 0.1, 0.601, H + 8 + r * 8);
          c.p.rect(px - 2, py - 5, 5, 5, C.lampGlow);
          c.p.rect(px - 1, py - 4, 3, 3, C.lamp);
        }
      c.edge([-0.3, 0.6, H + 30], [1.3, 0.6, H + 30], C.slate);
    },
  },
  'm-scoreboard': {
    footprint: [3, 0.4],
    h: 92,
    draw(c) {
      for (const x of [0.3, 2.5]) c.box(x, 0.1, 0.2, 0.2, 50, M.steel);
      c.box(0, 0, 3, 0.4, 40, M.dark, 46);
      c.faceX(0.1, 0.401, 2.8, 50, 32, C.screen);
      // Abstract blocks only: two colour panels, bars and a progress strip.
      c.faceX(0.25, 0.402, 0.9, 64, 14, C.red);
      c.faceX(1.85, 0.402, 0.9, 64, 14, C.blue);
      c.faceX(1.3, 0.402, 0.4, 66, 10, C.white);
      for (let k = 0; k < 6; k++)
        c.faceX(
          0.3 + k * 0.42,
          0.402,
          0.28,
          54,
          3 + ((k * 5) % 7),
          [C.glow, C.yellow, C.beat][k % 3],
        );
      c.faceX(0.25, 0.402, 2.5, 52, 1, C.slate);
      c.faceX(0.25, 0.402, 1.6, 52, 1, C.yellow);
    },
  },
  'm-dugout': {
    footprint: [3, 1],
    h: 40,
    draw(c) {
      c.box(0, 0, 3, 0.25, 30, M.white);
      c.box(0.1, 0.3, 2.8, 0.35, 7, M.dark);
      for (let k = 0; k < 7; k++)
        c.box(0.15 + k * 0.4, 0.3, 0.32, 0.3, 3, M.teal, 7);
      for (const x of [0.02, 2.93])
        c.faceY(x + 0.05, 0.25, 0.75, 0, 28, C.glassLight);
      // Curved clear roof from the back wall to the front edge.
      for (let k = 0; k <= 10; k++) {
        const t = k / 10,
          z = 30 - t * t * 12;
        c.top(0, t * 0.95, 3, 0.11, z, k % 3 ? C.glass : C.glassLight);
      }
      c.edge([0, 0.95, 18], [3, 0.95, 18], C.tealDark);
      c.edge([3, 0, 30], [3, 0.95, 18], C.tealDark);
    },
  },
  'm-corner-flag': {
    footprint: [0.3, 0.3],
    h: 30,
    draw(c, f) {
      const [x, y] = c.at(0.15, 0.15);
      c.p.rect(x, y - 24, 1, 24, C.white);
      c.p.pixel(x, y, C.slate);
      c.p.poly(
        [
          [x + 1, y - 24],
          [x + 8, y - 22 + f],
          [x + 1, y - 18],
        ],
        C.yellow,
      );
      c.p.rect(x + 1, y - 23, 3, 1, C.red);
    },
  },
  'm-ball-rack': {
    footprint: [1, 0.6],
    h: 22,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [0.95, 0.05],
        [0.95, 0.55],
        [0.05, 0.55],
      ])
        c.box(x - 0.03, y - 0.03, 0.06, 0.06, 12, M.steel);
      c.top(0, 0, 1, 0.6, 2, C.slate);
      for (let k = 0; k < 6; k++) {
        const [px, py] = c.at(
          0.2 + (k % 3) * 0.3,
          0.15 + Math.floor(k / 3) * 0.3,
          6 + (k % 2) * 4,
        );
        c.p.ellipse(px, py, 3, 3, C.white);
        c.p.rect(px - 1, py - 1, 2, 2, C.charcoal);
        c.p.pixel(px + 2, py + 1, C.silver);
        c.p.pixel(px - 2, py + 2, C.charcoal);
      }
      c.edge([0, 0.6, 12], [1, 0.6, 12], C.steelDark);
      c.edge([1, 0, 12], [1, 0.6, 12], C.steelDark);
    },
  },
};
Object.assign(objects, stadium);

export const MODERN_OBJECTS: Record<
  string,
  { footprint: [number, number]; floor?: boolean; side?: boolean }
> = Object.fromEntries(
  Object.entries(objects).map(([id, s]) => [
    id,
    {
      footprint: s.footprint,
      ...(s.floor ? { floor: true } : {}),
      ...(s.side ? { side: true } : {}),
    },
  ]),
);

/** Trim transparent margins; the left edge and width stay on 16 px tile columns. */
function trim(frames: PixelImage[], ax: number, ay: number) {
  const { width, height } = frames[0];
  let x0 = width,
    y0 = height,
    x1 = 0,
    y1 = 0;
  for (const f of frames)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (f.data[(y * width + x) * 4 + 3]) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x + 1);
          y1 = Math.max(y1, y + 1);
        }
  const left = Math.floor(x0 / 16) * 16;
  const w = Math.ceil((x1 - left) / 16) * 16;
  const top = Math.max(0, Math.min(y0, ay - 1)),
    h = Math.max(y1, ay + 1) - top;
  const out = frames.map((f) => {
    const p = new Pixels(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const sx = x + left,
          sy = y + top;
        if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
        const i = (sy * width + sx) * 4;
        p.data.set(f.data.slice(i, i + 4), (y * w + x) * 4);
      }
    return p;
  });
  return { frames: out, anchor: [ax - left, ay - top] as [number, number] };
}

export function renderModernObject(id: string) {
  const s = objects[id];
  if (!s) throw Error(`Unknown modern object ${id}`);
  const [w, d] = s.footprint,
    pad = (s.pad ?? 6) + 16;
  const ax = Math.ceil((d * 16 + pad) / 16) * 16,
    ay = s.h + pad,
    width = Math.ceil(((w + d) * 16 + pad * 2) / 16) * 16 + 16,
    height = ay + (w + d) * 8 + pad;
  const frames: PixelImage[] = [];
  for (let f = 0; f < (s.frames ?? 1); f++) {
    const c = isoCanvas(width, height, ax, ay);
    s.draw(c, f);
    for (let i = 3; i < c.p.data.length; i += 4)
      if (c.p.data[i]) c.p.data[i] = 255;
    frames.push(c.p);
  }
  return trim(frames, ax, ay);
}

export async function generateModernObjects() {
  const meta: Record<string, ObjectArt> = await readJson(
    'art/objects/index.json',
  ).catch(() => ({}));
  for (const id of Object.keys(objects)) {
    const s = objects[id],
      { frames, anchor } = renderModernObject(id);
    for (const side of s.side ? [false, true] : [false]) {
      const name = side ? `${id}-side` : id;
      const images = side ? frames.map(mirror) : frames;
      const a: [number, number] = side
        ? [images[0].width - anchor[0], anchor[1]]
        : anchor;
      await png(`art/objects/${name}.png`, images[0]);
      const entry: ObjectArt = {
        file: `objects/${name}.png`,
        anchor: a,
        width: images[0].width,
        height: images[0].height,
        ...(s.floor ? { floor: true } : {}),
      };
      if (images.length > 1) {
        entry.frames = [];
        for (const [i, im] of images.entries()) {
          await png(`art/objects/${name}-${i}.png`, im);
          entry.frames.push(`objects/${name}-${i}.png`);
        }
      }
      meta[name] = entry;
    }
  }
  await writeJson('art/objects/index.json', meta);
}

const diamond: [number, number][] = [
  [16, 0],
  [32, 8],
  [16, 16],
  [0, 8],
];
const lowerEdge: [number, number][] = [
  [0, 8],
  [16, 16],
  [32, 8],
  [30, 8],
  [16, 15],
  [2, 8],
];
const upperEdge: [number, number][] = [
  [16, 0],
  [32, 8],
  [30, 8],
  [16, 1],
  [2, 8],
  [0, 8],
];
/** Pixel inside the tile diamond (with a 1 px inset)? */
const inside = (x: number, y: number) =>
  Math.abs(x - 15.5) / 16 + Math.abs(y - 7.5) / 8 < 0.9;
export function renderModernTile(n: number) {
  const p = new Pixels(32, 16);
  const dot = (x: number, y: number, c: string) => {
    if (inside(x, y)) p.pixel(x, y, c);
  };
  if (n === 7) {
    p.poly(diamond, C.concrete);
    for (let k = 0; k < 7; k++)
      dot(5 + ((k * 13) % 22), 4 + ((k * 7) % 8), C.concreteShade);
    p.poly(upperEdge, C.white);
    p.poly(lowerEdge, C.concreteLine);
  } else if (n === 8) {
    p.poly(diamond, C.warmGrey);
    for (let x = 0; x < 32; x++) {
      dot(x, Math.round(8 - x / 2 + 8) - 8, C.warmGreyDark);
    }
    for (let k = 0; k < 6; k++)
      dot(6 + ((k * 11) % 20), 5 + ((k * 5) % 6), C.warmGreyLight);
    p.poly(upperEdge, C.warmGreyLight);
    p.poly(lowerEdge, C.warmGreyDark);
  } else if (n === 9) {
    p.poly(diamond, C.oak);
    // Planks run along the tile x axis: lines parallel to the upper-left edge.
    for (let k = 1; k < 4; k++)
      for (let x = 0; x < 32; x++) {
        const y = Math.round(x / 2 - 8 + k * 4);
        dot(x, y, C.wood);
      }
    for (let k = 0; k < 5; k++)
      dot(4 + ((k * 13) % 24), 4 + ((k * 7) % 8), C.woodLight);
    p.poly(upperEdge, C.woodLight);
    p.poly(lowerEdge, C.woodDark);
  } else if (n === 10) {
    p.poly(diamond, C.labTile);
    for (let x = 0; x < 32; x++) {
      dot(x, Math.round(x / 2), C.labLine);
      dot(x, Math.round(16 - x / 2), C.labLine);
    }
    p.poly(upperEdge, C.white);
    p.poly(lowerEdge, C.labLine);
  } else if (n === 11) {
    p.poly(diamond, C.vinyl);
    for (let k = 0; k < 8; k++)
      dot(
        4 + ((k * 13) % 24),
        4 + ((k * 7) % 8),
        k % 2 ? C.vinylLight : C.vinylDark,
      );
    p.poly(upperEdge, C.vinylLight);
    p.poly(lowerEdge, C.vinylDark);
  } else if (n === 12) {
    p.poly(diamond, C.asphalt);
    for (let k = 0; k < 12; k++)
      dot(
        3 + ((k * 13) % 26),
        3 + ((k * 7) % 10),
        k % 3 ? C.asphaltLight : C.asphaltDark,
      );
    for (let x = 13; x < 18; x++) dot(x, 8, C.asphaltLight);
    p.poly(upperEdge, C.asphaltLight);
    p.poly(lowerEdge, C.asphaltDark);
  } else if (n === 13) {
    p.poly(diamond, C.terracotta);
    for (let k = 0; k < 4; k++)
      for (let x = 0; x < 32; x++)
        dot(x, Math.round(x / 2 - 8 + k * 4 + 2), C.terracottaDark);
    for (let k = 0; k < 4; k++)
      for (let x = 0; x < 32; x++)
        if ((x + k * 4) % 8 === 0)
          for (let dy = 0; dy < 3; dy++)
            dot(x, Math.round(x / 2 - 8 + k * 4 + 3 + dy), C.terracottaDark);
    for (let k = 0; k < 5; k++)
      dot(5 + ((k * 11) % 22), 4 + ((k * 5) % 8), C.terracottaLight);
    p.poly(upperEdge, C.terracottaLight);
    p.poly(lowerEdge, C.terracottaDark);
  } else throw Error(`No modern tile ${n}`);
  return p;
}
export async function generateModernTiles() {
  for (let n = 7; n <= 13; n++)
    await png(`art/tiles/tile-${n}.png`, renderModernTile(n));
}
