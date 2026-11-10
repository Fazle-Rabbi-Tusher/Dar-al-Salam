// Procedural placeholder art for the modern district: architecture, interiors and street furniture.
// Content rule: no text, numerals, logos, calligraphy or religious symbols anywhere in this art.
import { Pixels, type PixelImage } from '../../packages/shared/pixels';
import { png, readJson, writeJson } from '../build/io';
import type { ObjectArt } from './objects';
import {
  darker,
  detailPass,
  groundShadow,
  lighter,
  isoCanvas,
  mirror,
  type DetailOptions,
  type IsoCanvas,
  type Material,
} from './iso-draw';

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
  // New York City and the Michigan rally.
  limestoneLight: '#EFE3C6',
  limestone: '#D6C49C',
  limestoneDark: '#B39E74',
  windowLit: '#FFE29A',
  brownstoneLight: '#A8644C',
  brownstone: '#85493A',
  brownstoneDark: '#62352B',
  brickLight: '#C9674B',
  brick: '#AE4F3A',
  brickDark: '#86392C',
  taxiShade: '#B98A1F',
  stageNavy: '#1D2E55',
  // Garden grass and water (already in the world palette).
  grassLight: '#C1C7A2',
  grass: '#A3B086',
  grassMid: '#75966B',
  grassDark: '#487359',
  // Bangladesh block (all already in the world palette).
  creamShade: '#E4D5B9',
  rose: '#EBAAB6',
  sand: '#DCCBAA',
  sandShade: '#C8B99C',
  sandDark: '#B69872',
  clay: '#B08A6E',
  flagRed: '#C93A3A',
} as const;
/** Colours for the nature pass (trees, water, rocks): add here, not to C. */
const NC = {
  // Broadleaf foliage, light to dark.
  leaf0: '#B5DA6A',
  leaf1: '#86C14F',
  leaf2: '#5FA23F',
  leaf3: '#3F8036',
  leaf4: '#2B5E33',
  leaf5: '#1C3F2C',
  // Oak: warmer, olive greens.
  oak0: '#A9C95B',
  oak1: '#7EAE47',
  oak2: '#5A8E3C',
  oak3: '#3E6E34',
  oak4: '#2A4F2D',
  oak5: '#1A3424',
  // Pine: cool blue-greens.
  pine0: '#8FBF7A',
  pine1: '#5E9A66',
  pine2: '#3F7A57',
  pine3: '#2B5C47',
  pine4: '#1C4236',
  pine5: '#122D27',
  // Cherry blossom.
  blossom0: '#FCE8EE',
  blossom1: '#F6C9D6',
  blossom2: '#EBA3BA',
  blossom3: '#D07F9C',
  blossom4: '#A85F80',
  blossom5: '#764563',
  // Birch: light yellow-greens.
  birch0: '#D8E98A',
  birch1: '#B4D46A',
  birch2: '#8DBA52',
  birch3: '#6A9A44',
  birch4: '#4A7536',
  // Bark.
  bark0: '#A4805A',
  bark1: '#7E5C3E',
  bark2: '#5A402C',
  bark3: '#3A2A1F',
  birchBark0: '#F2EFE6',
  birchBark1: '#D4CFC2',
  birchMark: '#3A3530',
  palm0: '#B89565',
  palm1: '#957347',
  palm2: '#6F5434',
  coconut: '#6E4A2C',
  // Blue-grey rock and moss.
  rock0: '#B9C3CE',
  rock1: '#8F9BAA',
  rock2: '#6B7787',
  rock3: '#4D5868',
  rock4: '#353E4C',
  rock5: '#232A35',
  moss0: '#7FA04A',
  moss1: '#5C8040',
  moss2: '#3F6436',
  // Falling water and foam, bright to deep.
  water0: '#F4FCFF',
  water1: '#CFEFFA',
  water2: '#9DD7EE',
  water3: '#62AFD6',
  water4: '#3D86B5',
  water5: '#2A628C',
  water6: '#1D4566',
  // Sea.
  sea0: '#E9F6FB',
  sea1: '#9CCDE6',
  sea2: '#5E9DC9',
  sea3: '#3B76A8',
  sea4: '#285887',
  sea5: '#1B3F66',
  // Ship: sailcloth and hull.
  sail0: '#F7F4EA',
  sail1: '#E2DCCB',
  sail2: '#C4BCA7',
  sail3: '#9E957F',
  hull0: '#B07A4A',
  hull1: '#6B4426',
  hull2: '#4A2E1A',
} as const;
/** Colours for the city pass (towers, lights, street furniture). */
const CC: Record<string, string> = {
  nightGlass: '#2A3552',
  duskGlass: '#36557A',
  skyGlass: '#46709F',
  skyGlassLight: '#53789F',
  amberLit: '#F7A653',
  blossomLight: '#F8D3DD',
  blossom: '#D07A8D',
  blossomDeep: '#A4536A',
};
/** Colours for the Massawa pass (coral-stone town on the Red Sea, c. 615 CE). */
const MC = {
  // Coral-rag stone, light to dark (matches the supplied mosque art).
  stone0: '#F7E5C1',
  stone1: '#E6C499',
  stone2: '#D5AA79',
  stone3: '#BF9160',
  stone4: '#A4774D',
  stone5: '#6A4A2E',
  // Old whitewash and lime plaster.
  plaster0: '#FAEDD0',
  plaster1: '#EFDCB6',
  plaster2: '#DEC498',
  // Weathered wood (doors, shutters, beams, hulls).
  wood0: '#B4834F',
  wood1: '#8A613C',
  wood2: '#62442B',
  wood3: '#432D1D',
  // Reeds and palm fronds (huts, mats, baskets).
  reed0: '#E8CD92',
  reed1: '#CBA96A',
  reed2: '#A3824B',
  reed3: '#735831',
  // Terracotta jars.
  clay0: '#E3A577',
  clay1: '#C47E52',
  clay2: '#9C5D3A',
  clay3: '#6E3F27',
  // Fired red brick (wall footings), pink lime plaster.
  brick0: '#D27A55',
  brick1: '#B85A3C',
  brick2: '#93432D',
  brick3: '#6E3121',
  pink0: '#EEC7B0',
  pink1: '#DEA88F',
  pink2: '#C88A73',
  pink3: '#A86C58',
  // Ochre lime-wash.
  ochre0: '#E9BE78',
  ochre1: '#D3A05A',
  ochre2: '#B37F40',
  ochre3: '#8C5E2C',
  // Goat-hair tent cloth.
  tent0: '#7A604A',
  tent1: '#5F4836',
  tent2: '#493526',
  tent3: '#33241A',
  // Market produce, dates, sacks and garden soil.
  red0: '#E2563E',
  red1: '#B6382B',
  green0: '#8CBF4E',
  green1: '#5C9A38',
  green2: '#3C6E2A',
  date0: '#E0A040',
  date1: '#B0682A',
  sack0: '#EBDDB8',
  sack1: '#CFBB92',
  sack2: '#A9946C',
  soil0: '#8A6A48',
  soil1: '#664B33',
  // Acacia: dry olive leaves.
  acacia0: '#BDB679',
  acacia1: '#979356',
  acacia2: '#71703C',
  acacia3: '#4E4F2B',
  acacia4: '#33341E',
  // Nets, floats and dates.
  net: '#7C6A4E',
  netLight: '#A89570',
  float: '#D9B26A',
  date: '#7A3B26',
  dateLight: '#A2553A',
  // Fish.
  fish0: '#E4ECEF',
  fish1: '#B5C6CE',
  fish2: '#7F96A3',
  fish3: '#4E6470',
} as const;
export const MODERN_COLOURS: string[] = [
  ...new Set([
    ...Object.values(C),
    ...Object.values(NC),
    ...Object.values(CC),
    ...Object.values(MC),
  ]),
];

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
  /** Frames per animation cycle on the 240-frame master clock (default 60). */
  period?: number;
  floor?: boolean;
  side?: boolean;
  /** Finishing pass options; `false` leaves the art exactly as drawn. */
  detail?: DetailOptions | false;
  /** Soft ground shadow under the footprint (off for raised pieces). */
  shadow?: boolean;
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
/** A white museum plinth `w`×`d` tiles, `h` px tall, with a plain plaque. */
function plinth(c: IsoCanvas, w: number, d: number, h: number) {
  c.box(0.02, 0.02, w - 0.04, d - 0.04, h, M.white);
  c.faceX(w * 0.3, d - 0.019, w * 0.4, h * 0.5, 3, C.gold);
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
/**
 * Block courses (ashlar, brick, panels) on a front (+y) face between x0 and
 * x1: joint lines every `row` px, staggered head joints every `block` tiles,
 * and an optional lit line along the top of each block.
 */
function coursesFront(
  c: IsoCanvas,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
  row: number,
  block: number,
  joint: string,
  light?: string,
) {
  for (let z = z0, r = 0; z < z1; z += row, r++) {
    const top = Math.min(z + row, z1);
    if (light && top - z > 3) c.edge([x0, y, top - 1], [x1, y, top - 1], light);
    if (z > z0) c.edge([x0, y, z], [x1, y, z], joint);
    for (let u = x0 + block * (r % 2 ? 0.5 : 1); u < x1 - 0.04; u += block)
      c.edge([u, y, z], [u, y, top - 1], joint);
  }
}
/** The same courses on a side (+x) face between y0 and y1. */
function coursesSide(
  c: IsoCanvas,
  x: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  row: number,
  block: number,
  joint: string,
  light?: string,
) {
  for (let z = z0, r = 0; z < z1; z += row, r++) {
    const top = Math.min(z + row, z1);
    if (light && top - z > 3) c.edge([x, y0, top - 1], [x, y1, top - 1], light);
    if (z > z0) c.edge([x, y0, z], [x, y1, z], joint);
    for (let v = y0 + block * (r % 2 ? 0.5 : 1); v < y1 - 0.04; v += block)
      c.edge([x, v, z], [x, v, top - 1], joint);
  }
}
type Sash = {
  frame: string;
  glass: string;
  /** Shadow cast into the reveal by the head and the left jamb. */
  shade: string;
  glint?: string;
  sill?: string;
  /** Glazing bars: a cross for sash windows. */
  bars?: boolean;
  /** Something seen inside (curtain, plant, lamp), drawn low in the pane. */
  inside?: string;
};
/** A framed window with reveal shadow, glint, glazing bars and sill on a front face. */
function sashFront(
  c: IsoCanvas,
  x: number,
  y: number,
  w: number,
  z: number,
  h: number,
  o: Sash,
) {
  c.faceX(x - 0.03, y, w + 0.06, z - 1, h + 2, o.frame);
  c.faceX(x, y + 0.001, w, z, h, o.glass);
  c.faceX(x, y + 0.002, w, z + h - 2, 2, o.shade);
  c.faceX(x, y + 0.002, Math.min(0.05, w * 0.2), z, h, o.shade);
  if (o.inside)
    c.faceX(x + w * 0.55, y + 0.002, w * 0.4, z, h * 0.45, o.inside);
  if (o.glint)
    c.edge(
      [x + w * 0.25, y + 0.003, z + 2],
      [x + w * 0.6, y + 0.003, z + h - 3],
      o.glint,
    );
  if (o.bars) {
    c.edge(
      [x + w / 2, y + 0.003, z],
      [x + w / 2, y + 0.003, z + h - 1],
      o.frame,
    );
    c.edge([x, y + 0.003, z + h / 2], [x + w, y + 0.003, z + h / 2], o.frame);
  }
  if (o.sill) c.faceX(x - 0.05, y + 0.004, w + 0.1, z - 2, 2, o.sill);
}
/** The same window on a side (+x) face. */
function sashSide(
  c: IsoCanvas,
  x: number,
  y: number,
  w: number,
  z: number,
  h: number,
  o: Sash,
) {
  c.faceY(x, y - 0.03, w + 0.06, z - 1, h + 2, o.frame);
  c.faceY(x + 0.001, y, w, z, h, o.glass);
  c.faceY(x + 0.002, y, w, z + h - 2, 2, o.shade);
  c.faceY(x + 0.002, y, Math.min(0.05, w * 0.2), z, h, o.shade);
  if (o.inside) c.faceY(x + 0.002, y + w * 0.5, w * 0.4, z, h * 0.45, o.inside);
  if (o.glint)
    c.edge(
      [x + 0.003, y + w * 0.25, z + 2],
      [x + 0.003, y + w * 0.6, z + h - 3],
      o.glint,
    );
  if (o.bars) {
    c.edge(
      [x + 0.003, y + w / 2, z],
      [x + 0.003, y + w / 2, z + h - 1],
      o.frame,
    );
    c.edge([x + 0.003, y, z + h / 2], [x + 0.003, y + w, z + h / 2], o.frame);
  }
  if (o.sill) c.faceY(x + 0.004, y - 0.05, w + 0.1, z - 2, 2, o.sill);
}
/**
 * Pointed arch window on a front (+y) or side (+x) face at `at`: frame,
 * glass, reveal shade down the left jamb, and a glint.
 */
function arch(
  c: IsoCanvas,
  side: boolean,
  u: number,
  at: number,
  w: number,
  z: number,
  h: number,
  frame: string,
  glass: string,
  shade: string,
  glint: string,
) {
  const pt = (a: number, d: number, zz: number): [number, number, number] =>
      side ? [at + d, a, zz] : [a, at + d, zz],
    rise = Math.min(12, h * 0.3);
  c.poly(
    [
      pt(u - 0.08, 0, z - 2),
      pt(u + w + 0.08, 0, z - 2),
      pt(u + w + 0.08, 0, z + h - rise),
      pt(u + w / 2, 0, z + h + 3),
      pt(u - 0.08, 0, z + h - rise),
    ],
    frame,
  );
  c.poly(
    [
      pt(u, 0.001, z),
      pt(u + w, 0.001, z),
      pt(u + w, 0.001, z + h - rise),
      pt(u + w / 2, 0.001, z + h),
      pt(u, 0.001, z + h - rise),
    ],
    glass,
  );
  c.edge(pt(u + 0.01, 0.002, z), pt(u + 0.01, 0.002, z + h - rise), shade);
  c.edge(pt(u + 0.01, 0.002, z + h - rise), pt(u + w / 2, 0.002, z + h), shade);
  c.edge(
    pt(u + w * 0.3, 0.003, z + 3),
    pt(u + w * 0.6, 0.003, z + h * 0.6),
    glint,
  );
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
      // Dressed-stone courses, then a darker plinth with a lit top edge.
      coursesFront(c, 0, 8, 0.351, 8, 96, 8, 0.55, C.stoneShade, C.ivory);
      c.faceX(0, 0.351, 8, 0, 8, C.stoneShade);
      c.edge([0, 0.352, 8], [8, 0.352, 8], C.ivory);
      c.edge([0, 0.352, 1], [8, 0.352, 1], C.stoneLine);
      for (let i = 0; i < 4; i++) {
        const u = 0.55 + i * 2;
        // Recess shadow, frame, then the glazing.
        c.poly(
          [
            [u - 0.06, 0.352, 14],
            [u + 1.1, 0.352, 14],
            [u + 1.1, 0.352, 77],
            [u + 0.5, 0.352, 99],
            [u - 0.06, 0.352, 79],
          ],
          C.stoneShade,
        );
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
        // Reveal shadow down the left jamb and under the arch.
        c.faceX(u, 0.354, 0.08, 20, 56, C.glassDeep);
        c.edge([u + 0.1, 0.354, 76], [u + 0.45, 0.354, 88], C.glassDeep);
        c.edge([u + 0.45, 0.355, 20], [u + 0.45, 0.355, 88], C.white);
        c.edge([u, 0.355, 50], [u + 0.9, 0.355, 50], C.white);
        c.edge([u, 0.355, 34], [u + 0.9, 0.355, 34], C.glass);
        c.edge([u + 0.14, 0.355, 56], [u + 0.32, 0.355, 74], C.glassLight);
        c.edge([u + 0.6, 0.355, 24], [u + 0.74, 0.355, 40], C.glassLight);
        // Keystone at the apex and a projecting sill with its shadow.
        c.box(u + 0.37, 0.33, 0.16, 0.06, 7, M.stone, 92);
        c.box(u - 0.15, 0.3, 1.2, 0.25, 3, M.stone, 14);
        c.faceX(u - 0.12, 0.552, 1.16, 11, 2, C.stoneShade);
        // Lattice panel between windows, framed and shadowed.
        if (i === 3) continue;
        c.faceX(u + 1.12, 0.352, 0.76, 28, 48, C.stoneShade);
        c.faceX(u + 1.15, 0.352, 0.7, 30, 44, C.ivory);
        for (let z = 34; z < 72; z += 6)
          for (let k = 0; k < 3; k++)
            c.top(u + 1.22 + k * 0.2, 0.352, 0.1, 0.01, z, C.turquoise);
        c.edge([u + 1.15, 0.353, 30], [u + 1.15, 0.353, 73], C.stoneLine);
      }
      // Cornice: dentil course under a teal frieze.
      c.faceX(0, 0.352, 8, 95, 5, C.stoneShade);
      for (let u = 0.04; u < 8; u += 0.22)
        c.faceX(u, 0.353, 0.13, 96, 3, C.ivory);
      c.faceX(0, 0.352, 8, 100, 4, C.teal);
      c.edge([0, 0.353, 103], [8, 0.353, 103], C.turquoise);
      c.box(-0.05, -0.05, 8.1, 0.45, 5, M.stone, 106);
    },
  },
  'm-dome': {
    footprint: [4, 4],
    h: 140,
    draw(c) {
      c.box(0, 0, 4, 4, 40, M.stone);
      coursesFront(c, 0, 4, 4.001, 2, 32, 6, 0.6, C.stoneShade, C.ivory);
      coursesSide(c, 4.001, 0, 4, 2, 32, 6, 0.6, C.stoneLine);
      c.faceX(0, 4.001, 4, 0, 2, C.stoneShade);
      c.faceY(4.001, 0, 4, 0, 2, C.stoneLine);
      // Arched windows around the prayer-hall base.
      for (let k = 0; k < 4; k++) {
        arch(
          c,
          false,
          0.3 + k * 0.95,
          4.002,
          0.36,
          8,
          18,
          C.tealDark,
          C.glassDark,
          C.glassDeep,
          C.glassLight,
        );
        arch(
          c,
          true,
          0.3 + k * 0.95,
          4.002,
          0.36,
          8,
          18,
          C.deepTeal,
          C.glassDeep,
          C.ink,
          C.glass,
        );
      }
      c.faceX(0, 4.001, 4, 32, 4, C.teal);
      c.faceY(4.001, 0, 4, 32, 4, C.deepTeal);
      c.edge([0, 4.002, 35], [4, 4.002, 35], C.turquoise);
      c.edge([0, 4.002, 36], [4, 4.002, 36], C.ivory);
      const [cx, cy] = c.at(2, 2, 40);
      // Drum: stone ring with tall arched lights.
      c.cylinder(2, 2, 40, 40, 26, R.stone, C.ivory);
      for (let k = 0; k < 9; k++) {
        const u = -0.85 + k * 0.21,
          x = cx + u * 40,
          y = cy + 20 * Math.sqrt(1 - u * u);
        c.p.rect(x - 3, y - 21, 6, 14, u < 0.3 ? C.stoneShade : C.stoneLine);
        c.p.rect(x - 2, y - 20, 4, 12, C.glassDark);
        c.p.rect(x - 1, y - 22, 2, 2, C.glassDark);
        c.p.rect(x - 1, y - 19, 1, 6, C.glassLight);
        c.p.rect(x + 1, y - 9, 1, 1, C.glassDeep);
      }
      c.p.ellipse(cx, cy - 26, 41, 20, C.teal);
      c.p.ellipse(cx, cy - 27, 39, 19, C.tealDark);
      // Shallow dome, softly dithered from the lit upper left.
      const top = cy - 26;
      for (let j = top - 64; j <= top; j++)
        for (let i = cx - 38; i <= cx + 38; i++) {
          const u = (i - cx) / 38,
            v = (top - j) / 64;
          if (u * u + v * v > 1) continue;
          const shade = u - v * 0.4 + ((i + j) % 2 ? 0.05 : -0.05);
          c.p.pixel(
            i,
            j,
            shade < -0.5
              ? C.white
              : shade < 0.12
                ? C.offwhite
                : shade < 0.5
                  ? C.pale
                  : shade < 0.8
                    ? C.silver
                    : C.stoneLine,
          );
        }
      // Ribs, lighter on the lit side.
      for (let k = 1; k < 8; k++) {
        const u = -0.9 + k * 0.225;
        for (let j = top - 62; j <= top; j++) {
          const v = (top - j) / 64,
            w = Math.sqrt(Math.max(0, 1 - v * v));
          c.p.pixel(cx + u * 38 * w, j, u < -0.2 ? C.pale : C.stoneShade);
        }
      }
      // Specular highlight high on the lit side.
      c.p.ellipse(cx - 16, top - 44, 5, 8, C.white);
      c.p.ellipse(cx, top, 38, 4, C.tealDark);
      c.p.ellipse(cx, top + 1, 36, 3, C.deepTeal);
      // Plain finial: drum, rod and knob.
      c.p.rect(cx - 4, top - 65, 8, 3, C.pale);
      c.p.rect(cx - 2, top - 70, 4, 7, C.gold);
      c.p.rect(cx + 1, top - 70, 1, 7, darker(C.gold));
      c.p.ellipse(cx, top - 71, 3, 3, C.gold);
      c.p.pixel(cx - 1, top - 72, C.yellow);
    },
  },
  'm-minaret': {
    footprint: [1, 1],
    h: 240,
    draw(c) {
      c.box(0, 0, 1, 1, 10, M.stone);
      coursesFront(c, 0, 1, 1.001, 0, 10, 5, 0.34, C.stoneShade, C.ivory);
      coursesSide(c, 1.001, 0, 1, 0, 10, 5, 0.34, C.stoneLine);
      c.box(0.15, 0.15, 0.7, 0.7, 168, M.white, 10);
      coursesFront(c, 0.15, 0.85, 0.851, 10, 176, 8, 0.35, C.pale);
      coursesSide(c, 0.851, 0.15, 0.85, 10, 176, 8, 0.35, C.silver);
      for (const z of [60, 120]) {
        c.box(0.12, 0.12, 0.76, 0.76, 4, M.teal, z);
        c.edge([0.12, 0.882, z + 3], [0.88, 0.882, z + 3], C.turquoise);
      }
      for (const z of [24, 84, 140]) {
        arch(
          c,
          false,
          0.38,
          0.852,
          0.24,
          z,
          22,
          C.tealDark,
          C.glassDark,
          C.glassDeep,
          C.glassLight,
        );
        arch(
          c,
          true,
          0.38,
          0.852,
          0.24,
          z,
          22,
          C.deepTeal,
          C.glassDeep,
          C.ink,
          C.glass,
        );
      }
      // Stepped corbels carry the balcony.
      for (let k = 0; k < 3; k++)
        c.box(
          0.15 - k * 0.07,
          0.15 - k * 0.07,
          0.7 + k * 0.14,
          0.7 + k * 0.14,
          2,
          M.stone,
          170 + k * 2,
        );
      c.box(-0.05, -0.05, 1.1, 1.1, 5, M.stone, 176);
      c.edge([-0.05, 1.05, 180], [1.05, 1.05, 180], C.ivory);
      for (let u = 0; u <= 1.1; u += 0.18) {
        post(c, u - 0.05, 1.05, 181, 9, C.stoneLine);
        post(c, 1.05, u - 0.05, 181, 9, C.stoneShade);
      }
      c.box(-0.05, -0.05, 1.1, 1.1, 2, M.stone, 190);
      c.box(0.22, 0.22, 0.56, 0.56, 22, M.white, 181);
      arch(
        c,
        false,
        0.4,
        0.782,
        0.2,
        185,
        12,
        C.tealDark,
        C.glassDark,
        C.glassDeep,
        C.glassLight,
      );
      arch(
        c,
        true,
        0.4,
        0.782,
        0.2,
        185,
        12,
        C.deepTeal,
        C.glassDeep,
        C.ink,
        C.glass,
      );
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
      // Tile courses on the roof cone and a lit ridge.
      for (let z = 208; z < 234; z += 5) {
        const t = (z - 203) / 33;
        c.edge(
          [0.2 + 0.3 * t, 1.0 - 0.5 * t, z],
          [1.0 - 0.5 * t, 1.0 - 0.5 * t, z],
          C.tealDark,
        );
        c.edge(
          [1.0 - 0.5 * t, 1.0 - 0.5 * t, z],
          [1.0 - 0.5 * t, 0.2 + 0.3 * t, z],
          C.ink,
        );
      }
      c.edge([1.0, 1.0, 203], [0.5, 0.5, 236], C.turquoise);
      c.box(0.2, 0.2, 0.8, 0.8, 3, M.stone, 200);
      const [x, y] = c.at(0.5, 0.5, 236);
      // Plain round knob (solid, so it never reads as a sign).
      c.p.rect(x, y - 4, 1, 3, darker(C.gold));
      c.p.rect(x - 1, y - 8, 3, 4, C.gold);
      c.p.pixel(x - 1, y - 8, C.yellow);
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
  /*
   * The congregational prayer hall on the Baitul Mukarram plaza (owner's
   * prayer-library pack): a carved wooden mashrabiya screen between the men's
   * and women's rows, a marble pillar, the imam's low dais and brass
   * lanterns. Geometric patterns only: no writing, no symbols.
   */
  'm-mashrabiya': {
    footprint: [6.6, 0.3],
    h: 54,
    side: true,
    draw(c) {
      const H = 46;
      // Posts at the ends and every 2.2 tiles, a rail top and bottom.
      for (let u = 0; u <= 6.6; u += 2.2)
        c.box(Math.min(u, 6.4), 0, 0.2, 0.3, H + 4, M.oak);
      c.box(0, 0.05, 6.6, 0.2, 6, M.wood);
      c.box(0, 0.05, 6.6, 0.2, 4, M.oak, H - 4);
      // The lattice: a star-and-cross grid of turned spindles, with gaps
      // that let the light (and a glimpse of the rows) through.
      for (let u = 0.25; u < 6.6; u += 0.33) {
        if (Math.abs((u % 2.2) - 0.1) < 0.15) continue;
        c.edge([u, 0.26, 6], [u, 0.26, H - 4], C.woodDark);
        c.edge([u + 0.02, 0.27, 6], [u + 0.02, 0.27, H - 4], C.wood);
      }
      for (let z = 10; z < H - 4; z += 6) {
        c.edge([0.2, 0.27, z], [6.4, 0.27, z], C.woodDark);
        for (let u = 0.25; u < 6.4; u += 0.66) {
          const [x, y] = c.at(u + 0.165, 0.28, z + 3);
          c.p.pixel(x, y, C.woodLight);
          c.p.pixel(x - 1, y, C.wood);
          c.p.pixel(x + 1, y, C.wood);
          c.p.pixel(x, y - 1, C.wood);
          c.p.pixel(x, y + 1, C.wood);
        }
      }
      // Carved crest along the top rail.
      for (let u = 0.2; u < 6.4; u += 0.4) {
        const [x, y] = c.at(u + 0.2, 0.3, H);
        c.p.rect(x - 1, y - 2, 3, 2, C.oak);
        c.p.pixel(x, y - 3, C.woodLight);
      }
    },
  },
  'm-marble-pillar': {
    footprint: [0.9, 0.9],
    h: 150,
    draw(c) {
      // Square base, a round marble shaft with soft veins, a carved capital.
      c.box(0, 0, 0.9, 0.9, 10, M.stone);
      c.box(0.05, 0.05, 0.8, 0.8, 4, M.white, 10);
      c.cylinder(0.45, 0.45, 14, 9, 112, [C.white, C.offwhite, C.pale]);
      for (const [dz, dx] of [
        [30, -3],
        [52, 2],
        [77, -1],
        [98, 4],
      ]) {
        const [x, y] = c.at(0.45, 0.45, 14 + dz);
        c.p.pixel(x + dx, y, C.silver);
        c.p.pixel(x + dx + 1, y - 1, C.silver);
        c.p.pixel(x + dx + 2, y - 3, C.pale);
      }
      c.box(0.05, 0.05, 0.8, 0.8, 5, M.white, 126);
      c.box(0, 0, 0.9, 0.9, 6, M.stone, 131);
      const [gx, gy] = c.at(0.45, 0.9, 129);
      c.p.rect(gx - 6, gy - 1, 12, 1, C.gold);
    },
  },
  'm-imam-dais': {
    footprint: [1.4, 1.4],
    h: 8,
    // Part of the floor, so it always draws under the imam's feet.
    floor: true,
    draw(c) {
      // A low oak step, then a crimson-and-gold rug with a plain geometric
      // border (a pointed-arch outline, no writing).
      c.box(0, 0, 1.4, 1.4, 3, M.oak);
      c.top(0.1, 0.1, 1.2, 1.2, 3, C.carpetGold);
      c.top(0.16, 0.16, 1.08, 1.08, 3, C.carpetDark);
      c.top(0.22, 0.22, 0.96, 0.96, 3, C.carpet);
      for (let k = 0.3; k < 1.12; k += 0.2) {
        c.top(k, 0.3, 0.06, 0.06, 3, C.carpetGold);
        c.top(k, 1.06, 0.06, 0.06, 3, C.carpetGold);
      }
      c.top(0.62, 0.5, 0.16, 0.4, 3, C.carpetGreen);
      c.top(0.66, 0.46, 0.08, 0.06, 3, C.carpetGreen);
    },
  },
  'm-brass-lantern': {
    footprint: [0.6, 0.6],
    h: 70,
    frames: 2,
    period: 24,
    draw(c, f) {
      // A brass stand holding a pierced lantern; its glow breathes slowly.
      c.box(0.15, 0.15, 0.3, 0.3, 4, M.oak);
      const [x, y] = c.at(0.3, 0.3, 4);
      c.p.rect(x - 1, y - 40, 2, 40, C.woodDark);
      c.p.rect(x - 1, y - 40, 1, 40, C.gold);
      c.p.rect(x - 6, y - 58, 12, 18, C.woodDark);
      c.p.rect(x - 5, y - 57, 10, 16, f ? C.cream : C.yellow);
      for (let i = 0; i < 4; i++)
        c.p.rect(x - 4 + i * 3, y - 56, 1, 14, C.gold);
      c.p.rect(x - 5, y - 51, 10, 1, C.gold);
      c.p.rect(x - 7, y - 60, 14, 2, C.gold);
      c.p.rect(x - 4, y - 63, 8, 3, C.gold);
      c.p.pixel(x, y - 65, C.gold);
      c.p.rect(x - 7, y - 40, 14, 2, C.gold);
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
  /* ── Mathematics research laboratory (the old library, owner's request) ── */
  // A wall chalkboard: slate green in an oak frame with a chalk tray, covered
  // in chalk work drawn as figures, never letters: axes and a curve, a
  // commutative square of arrows, a circle with an inscribed triangle, a
  // torus sketch and lines of short strokes standing for working.
  'm-chalkboard': {
    footprint: [3, 0.2],
    h: 74,
    side: true,
    shadow: false,
    draw(c) {
      const chalk = C.white,
        dim = C.silver;
      c.faceX(-0.04, 0.15, 3.08, 22, 50, C.woodDark);
      c.faceX(0.02, 0.151, 2.96, 24, 46, C.deepTeal);
      c.faceX(0.06, 0.152, 2.88, 26, 42, C.tealDark);
      // Chalk tray and a few sticks.
      c.box(0, 0.15, 3, 0.12, 2, M.wood, 22);
      for (const u of [0.4, 0.46, 1.7, 2.6])
        c.top(u, 0.2, 0.04, 0.05, 24.1, C.white);
      const pt = (u: number, z: number) => c.at(u, 0.153, z);
      // Axes and a damped wave.
      c.line(pt(0.15, 36), pt(0.15, 64), chalk);
      c.line(pt(0.15, 48), pt(0.85, 48), chalk);
      let prev = pt(0.15, 48);
      for (let k = 1; k <= 20; k++) {
        const u = 0.15 + k * 0.034,
          z = 48 + Math.sin(k * 0.8) * 11 * Math.exp(-k * 0.07);
        const next = pt(u, Math.round(z));
        c.line(prev, next, C.yellow);
        prev = next;
      }
      // Commutative square: four nodes, arrows along the sides.
      const sq: [number, number][] = [
        [1.05, 64],
        [1.45, 64],
        [1.05, 50],
        [1.45, 50],
      ];
      for (const [a, b] of [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
        [0, 3],
      ]) {
        const A = pt(...sq[a]),
          B = pt(...sq[b]);
        c.line(A, B, a === 0 && b === 3 ? dim : chalk);
        c.p.pixel(B[0], B[1], C.yellow);
      }
      for (const q of sq) {
        const [x, y] = pt(...q);
        c.p.rect(x - 1, y - 1, 3, 3, chalk);
      }
      // Circle with an inscribed triangle.
      const [cx, cy] = pt(1.95, 58);
      for (let a = 0; a < 36; a++) {
        const t = (a / 36) * Math.PI * 2;
        c.p.pixel(
          Math.round(cx + Math.cos(t) * 6),
          Math.round(cy + Math.sin(t) * 6),
          chalk,
        );
      }
      const tri = [0, 2.1, 4.2].map((t) => [
        Math.round(cx + Math.cos(t - 1.57) * 6),
        Math.round(cy + Math.sin(t - 1.57) * 6),
      ]) as [number, number][];
      for (let i = 0; i < 3; i++) c.line(tri[i], tri[(i + 1) % 3], C.pink);
      // Torus: two ellipses.
      const [tx, ty] = pt(2.55, 58);
      for (let a = 0; a < 40; a++) {
        const t = (a / 40) * Math.PI * 2;
        c.p.pixel(
          Math.round(tx + Math.cos(t) * 6),
          Math.round(ty + Math.sin(t) * 3),
          chalk,
        );
        if (Math.sin(t) > 0)
          c.p.pixel(
            Math.round(tx + Math.cos(t) * 3),
            Math.round(ty - 1 + Math.sin(t) * 1),
            dim,
          );
      }
      // Lines of working: short strokes of varied length, no letters.
      for (let r = 0; r < 4; r++)
        for (let k = 0, u = 1.0; k < 9; k++) {
          const w = 0.05 + ((r * 7 + k * 3) % 5) * 0.025;
          if (u + w > 2.85) break;
          c.edge(
            [u, 0.153, 43 - r * 4],
            [u + w, 0.153, 43 - r * 4],
            r % 2 ? dim : chalk,
          );
          u += w + 0.04;
        }
    },
  },
  // A research workstation: three monitors (a coloured surface plot, code,
  // a graph of nodes and edges), keyboard, notebook of sketches, a mug and
  // a mesh office chair.
  'm-workstation': {
    footprint: [2, 1],
    h: 60,
    side: true,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [1.85, 0.05],
        [0.05, 0.85],
        [1.85, 0.85],
      ])
        c.box(x, y, 0.1, 0.1, 20, M.dark);
      c.box(0, 0, 2, 1, 2, M.white, 20);
      // Three monitors on one arm.
      c.box(0.95, 0.15, 0.1, 0.1, 8, M.dark, 22);
      const mon = (x: number, w: number) => {
        c.faceX(x, 0.3, w, 28, 22, C.ink);
        c.faceX(x + 0.03, 0.301, w - 0.06, 30, 18, C.navy);
      };
      mon(0.1, 0.6);
      mon(0.7, 0.6);
      mon(1.3, 0.6);
      // Left: a heat-coloured surface plot (rows of a mesh).
      const heat = [
        C.blueDark,
        C.blue,
        C.teal,
        C.lime,
        C.yellow,
        C.orange,
        C.red,
      ];
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 9; k++) {
          const v = Math.sin(k * 0.7) * Math.cos(r * 0.9);
          const col = heat[Math.max(0, Math.min(6, Math.round((v + 1) * 3)))];
          const [x, y] = c.at(
            0.16 + k * 0.055,
            0.302,
            33 + r * 3 + Math.round(v * 2),
          );
          c.p.rect(x, y, 2, 2, col);
        }
      // Middle: code (indented strokes in a few colours).
      for (let r = 0; r < 6; r++) {
        const ind = [0, 1, 2, 2, 1, 0][r] * 0.04,
          w = 0.12 + ((r * 5) % 4) * 0.06;
        c.edge(
          [0.78 + ind, 0.302, 45 - r * 2.5],
          [0.78 + ind + w, 0.302, 45 - r * 2.5],
          [C.lime, C.glow, C.pink, C.yellow][r % 4],
        );
      }
      // Right: a graph of nodes and edges.
      const nodes: [number, number][] = [
        [1.42, 44],
        [1.6, 46],
        [1.75, 40],
        [1.5, 36],
        [1.68, 34],
      ];
      for (const [a, b] of [
        [0, 1],
        [1, 2],
        [0, 3],
        [3, 4],
        [2, 4],
        [1, 3],
      ])
        c.line(
          c.at(nodes[a][0], 0.302, nodes[a][1]),
          c.at(nodes[b][0], 0.302, nodes[b][1]),
          C.steel,
        );
      for (const [u, z] of nodes) {
        const [x, y] = c.at(u, 0.302, z);
        c.p.rect(x - 1, y - 1, 2, 2, C.glow);
      }
      // Keyboard, notebook with sketches, mug.
      c.top(0.6, 0.55, 0.7, 0.18, 22, C.charcoal);
      for (let u = 0.65; u < 1.25; u += 0.1)
        c.top(u, 0.58, 0.06, 0.12, 22.5, C.slate);
      c.top(1.4, 0.52, 0.42, 0.3, 22.2, C.paper);
      c.edge([1.45, 0.6, 22.3], [1.75, 0.6, 22.3], C.grey);
      c.edge([1.45, 0.7, 22.3], [1.68, 0.7, 22.3], C.grey);
      c.cylinder(0.3, 0.65, 22, 2, 5, [C.white, C.offwhite, C.pale]);
      // Office chair in front.
      c.box(0.85, 1.25, 0.3, 0.3, 12, M.dark);
      c.box(0.75, 1.15, 0.5, 0.5, 2, M.dark, 12);
      c.faceX(0.78, 1.66, 0.44, 14, 14, C.charcoal);
    },
  },
  // A seminar table for discussion: papers, a laptop, mugs, chairs round it.
  'm-seminar-table': {
    footprint: [3, 1.4],
    h: 40,
    draw(c) {
      for (const [x, y] of [
        [0.1, 0.1],
        [2.8, 0.1],
        [0.1, 1.2],
        [2.8, 1.2],
      ])
        c.box(x, y, 0.1, 0.1, 20, M.steel);
      // Chairs on the far side (drawn first, behind the table).
      for (const u of [0.35, 1.35, 2.35]) {
        c.faceX(u, -0.38, 0.4, 12, 14, C.charcoal);
        c.box(u, -0.35, 0.4, 0.3, 12, M.dark);
      }
      c.box(0, 0, 3, 1.4, 2, M.oak, 20);
      // Papers, a laptop, mugs, a stack of preprints.
      c.top(0.3, 0.25, 0.4, 0.3, 22.1, C.paper);
      c.top(0.45, 0.35, 0.4, 0.3, 22.2, C.white);
      c.edge([0.5, 0.45, 22.3], [0.78, 0.45, 22.3], C.grey);
      c.box(1.2, 0.35, 0.55, 0.38, 1, M.steel, 22);
      c.faceX(1.2, 0.36, 0.55, 23, 9, C.ink);
      c.faceX(1.23, 0.361, 0.49, 24, 7, C.navy);
      for (let k = 0; k < 4; k++)
        c.faceX(1.27 + k * 0.1, 0.362, 0.06, 25, 2 + k, accents[k]);
      c.box(2.2, 0.3, 0.45, 0.32, 5, M.white, 22);
      c.cylinder(2.0, 1.0, 22, 2, 5, [C.red, C.red, C.redDark]);
      c.cylinder(0.9, 1.05, 22, 2, 5, [C.white, C.offwhite, C.pale]);
      // Chairs on the near side, in front of the table.
      for (const u of [0.35, 1.35, 2.35]) c.box(u, 1.5, 0.4, 0.3, 12, M.dark);
    },
  },
  // A glass case of mathematical models: polyhedra, a torus, a saddle
  // surface and a Möbius-like band, lit from above.
  'm-model-case': {
    footprint: [2.4, 0.6],
    h: 78,
    side: true,
    draw(c) {
      c.box(0, 0, 2.4, 0.6, 12, M.wood);
      // A dark lined back, so the models stand out.
      c.faceX(0.05, 0.05, 2.3, 12, 58, C.navy);
      for (const u of [0, 2.32]) c.box(u, 0, 0.08, 0.6, 58, M.wood, 12);
      for (const z of [12, 34, 54]) {
        c.top(0.05, 0.05, 2.3, 0.5, z, C.glassLight);
        c.edge([0.05, 0.55, z], [2.35, 0.55, z], C.white);
      }
      // Shelf 1: an icosahedron-ish solid, a cube lattice, a torus.
      const solid = (u: number, z: number, r: number, cols: string[]) => {
        const [x, y] = c.at(u, 0.3, z);
        for (let k = 0; k < 6; k++)
          c.p.poly(
            [
              [x, y - r],
              [
                x + Math.round(Math.cos((k * Math.PI) / 3) * r),
                y - r + Math.round(Math.sin((k * Math.PI) / 3) * r),
              ],
              [
                x + Math.round(Math.cos(((k + 1) * Math.PI) / 3) * r),
                y - r + Math.round(Math.sin(((k + 1) * Math.PI) / 3) * r),
              ],
            ],
            cols[k % cols.length],
          );
      };
      solid(0.4, 13, 5, [C.gold, C.yellowDark, C.yellow]);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          const [x, y] = c.at(1.0 + i * 0.08, 0.3, 14 + j * 4);
          c.p.rect(x, y, 3, 1, C.steelLight);
          c.p.rect(x, y - 3, 1, 3, C.steel);
        }
      {
        const [x, y] = c.at(1.75, 0.3, 19);
        for (let a = 0; a < 40; a++) {
          const t = (a / 40) * Math.PI * 2;
          c.p.rect(
            Math.round(x + Math.cos(t) * 7),
            Math.round(y + Math.sin(t) * 3),
            2,
            2,
            a % 10 < 5 ? C.blue : C.blueDark,
          );
        }
      }
      // Shelf 2: a saddle surface (rising and falling rows), a band.
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 8; k++) {
          const [x, y] = c.at(
            0.25 + k * 0.07,
            0.3,
            37 + r * 2 + Math.round(((k - 3.5) ** 2 - (r - 2) ** 2) * 0.35),
          );
          c.p.pixel(x, y, r % 2 ? C.teal : C.tealDark);
        }
      {
        const [x, y] = c.at(1.45, 0.3, 42);
        for (let a = 0; a < 48; a++) {
          const t = (a / 48) * Math.PI * 2,
            w = Math.round(Math.cos(t / 2) * 2);
          c.p.rect(
            Math.round(x + Math.cos(t) * 9),
            Math.round(y + Math.sin(t) * 4) - w,
            1,
            2 + Math.abs(w),
            a < 24 ? C.red : C.redDark,
          );
        }
      }
      solid(2.0, 36, 4, [C.purple, C.purpleDark, C.pink]);
      // Shelf 3: a sphere and a tetrahedron.
      {
        const [x, y] = c.at(0.6, 0.3, 61);
        c.p.ellipse(x, y, 5, 5, C.green);
        c.p.ellipse(x - 1, y - 1, 2, 2, C.lime);
      }
      solid(1.5, 56, 5, [C.orange, C.orangeDark]);
      // Top, and the glass front shown only as a frame and a glint.
      c.box(0, 0, 2.4, 0.6, 2, M.wood, 70);
      c.edge([0.08, 0.6, 12], [2.32, 0.6, 12], C.glassLight);
      c.edge([0.3, 0.601, 20], [0.5, 0.601, 66], C.white);
      c.edge([0.36, 0.601, 20], [0.56, 0.601, 66], C.glassLight);
    },
    detail: { grain: 0 },
  },
  // A 3D printer making a trefoil knot model; its head moves.
  'm-3d-printer': {
    footprint: [1, 1],
    h: 54,
    frames: 4,
    draw(c, f) {
      c.box(0.05, 0.05, 0.9, 0.9, 6, M.dark);
      for (const [x, y] of [
        [0.05, 0.05],
        [0.88, 0.05],
        [0.05, 0.88],
        [0.88, 0.88],
      ])
        c.box(x, y, 0.07, 0.07, 46, M.steel, 6);
      c.box(0.05, 0.05, 0.9, 0.9, 3, M.dark, 50);
      c.top(0.15, 0.15, 0.7, 0.7, 8, C.slate);
      // The printed knot: a twisted ring of orange beads.
      const [x, y] = c.at(0.5, 0.5, 14);
      for (let a = 0; a < 60; a++) {
        const t = (a / 60) * Math.PI * 2,
          r = 6 + Math.cos(3 * t) * 3;
        c.p.rect(
          Math.round(x + Math.cos(2 * t) * r),
          Math.round(y + Math.sin(2 * t) * r * 0.5 - Math.sin(3 * t) * 3),
          2,
          2,
          a % 6 < 3 ? C.orange : C.orangeDark,
        );
      }
      // Gantry and the moving head.
      const hx = 0.3 + [0, 0.15, 0.3, 0.15][f];
      c.box(0.1, hx, 0.8, 0.06, 2, M.steel, 34);
      c.box(hx + 0.05, hx - 0.05, 0.14, 0.14, 6, M.dark, 30);
      c.edge([hx + 0.12, hx + 0.02, 30], [hx + 0.12, hx + 0.02, 26], C.orange);
      // Filament spool on top.
      c.cylinder(0.5, 0.5, 53, 4, 3, [
        C.orange,
        C.orangeDark,
        C.terracottaDark,
      ]);
    },
    period: 24,
  },
  /*
   * ── The history of calculation (owner's list): ten instruments, each on
   * its own plinth or stand, from tally sticks to Babbage's engines. No
   * numerals or lettering: digits are shown as dots and tick marks. ──
   */
  // Tally sticks: notched bone and wood sticks in a block, on a plinth.
  'm-tally-sticks': {
    footprint: [1, 1],
    h: 44,
    draw(c) {
      plinth(c, 1, 1, 16);
      c.box(0.25, 0.3, 0.5, 0.35, 4, M.wood, 16);
      for (let k = 0; k < 4; k++) {
        const u = 0.28 + k * 0.14,
          h = 14 + ((k * 5) % 9),
          col = k % 2 ? C.ivory : C.woodLight;
        c.box(
          u,
          0.42,
          0.06,
          0.06,
          h,
          { top: col, front: col, side: C.woodDark, edge: C.woodDark },
          20,
        );
        for (let n = 3; n < h - 1; n += 3) {
          const [x, y] = c.at(u, 0.5, 20 + n);
          c.p.pixel(x + 1, y, C.woodDark);
        }
      }
    },
  },
  // A counting board: a table ruled into columns with pebble counters.
  'm-counting-board': {
    footprint: [2, 1.2],
    h: 30,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [1.85, 0.05],
        [0.05, 1.05],
        [1.85, 1.05],
      ])
        c.box(x, y, 0.1, 0.1, 20, M.wood);
      c.box(0, 0, 2, 1.2, 2, M.wood, 20);
      c.top(0.1, 0.1, 1.8, 1.0, 22.1, C.paper);
      for (let k = 1; k < 6; k++)
        c.edge(
          [0.1 + k * 0.3, 0.1, 22.2],
          [0.1 + k * 0.3, 1.1, 22.2],
          C.woodDark,
        );
      c.edge([0.1, 0.6, 22.2], [1.9, 0.6, 22.2], C.woodDark);
      for (let k = 0; k < 6; k++)
        for (let n = 0; n < (k * 7) % 5; n++) {
          const [x, y] = c.at(
            0.22 + k * 0.3,
            0.25 + n * 0.15 + (n > 1 ? 0.25 : 0),
            22.3,
          );
          c.p.rect(x, y - 1, 2, 2, n % 2 ? C.charcoal : C.slate);
        }
    },
  },
  // A standing abacus: a wooden frame with rows of coloured beads.
  'm-abacus': {
    footprint: [1.6, 0.4],
    h: 54,
    side: true,
    draw(c) {
      for (const u of [0.05, 1.45]) c.box(u, 0.1, 0.1, 0.2, 50, M.wood);
      c.box(0.05, 0.05, 1.5, 0.3, 3, M.wood, 2);
      c.faceX(0.15, 0.2, 1.3, 46, 3, C.woodDark);
      c.faceX(0.15, 0.2, 1.3, 18, 3, C.woodDark);
      for (let r = 0; r < 6; r++) {
        const z = 22 + r * 4;
        c.edge([0.15, 0.2, z], [1.45, 0.2, z], C.steelDark);
        // Some beads pushed to the left (counted), the rest to the right.
        const n = 1 + ((r * 3) % 5);
        for (let k = 0; k < 6; k++) {
          const u = k < n ? 0.22 + k * 0.13 : 0.62 + k * 0.13;
          const [x, y] = c.at(u, 0.2, z);
          c.p.rect(x - 1, y - 1, 2, 3, r % 2 ? C.red : C.woodLight);
          c.p.pixel(x - 1, y - 1, r % 2 ? C.pink : C.ivory);
        }
      }
    },
  },
  // The Antikythera mechanism: corroded bronze gear fragments under glass.
  'm-antikythera': {
    footprint: [1, 1],
    h: 40,
    draw(c) {
      plinth(c, 1, 1, 18);
      c.top(0.15, 0.15, 0.7, 0.7, 18.1, C.navy);
      const gear = (u: number, v: number, r: number, teeth: number) => {
        const [x, y] = c.at(u, v, 19);
        c.p.ellipse(x, y, r, r * 0.55, C.tealDark);
        c.p.ellipse(x, y, r - 1, (r - 1) * 0.55, C.deepTeal);
        for (let k = 0; k < teeth; k++) {
          const t = (k / teeth) * Math.PI * 2;
          c.p.pixel(
            Math.round(x + Math.cos(t) * (r + 1)),
            Math.round(y + Math.sin(t) * (r + 1) * 0.55),
            C.terracottaDark,
          );
        }
        c.p.pixel(x, y, C.yellowDark);
        c.edge([u - 0.05, v, 19], [u + 0.08, v, 19], C.terracotta);
      };
      gear(0.45, 0.45, 9, 22);
      gear(0.7, 0.62, 5, 12);
      gear(0.3, 0.7, 3, 8);
      // The glass case: frame edges and a glint.
      for (const [x, y] of [
        [0.12, 0.12],
        [0.88, 0.12],
        [0.12, 0.88],
        [0.88, 0.88],
      ])
        c.edge([x, y, 18], [x, y, 34], C.glassLight);
      c.top(0.12, 0.12, 0.76, 0.76, 34, C.glassLight);
      c.edge([0.25, 0.88, 22], [0.4, 0.88, 32], C.white);
    },
    detail: { grain: 0 },
  },
  // Napier's bones: a wooden box and the ruled rods laid out on a table.
  'm-napiers-bones': {
    footprint: [1, 0.8],
    h: 34,
    draw(c) {
      plinth(c, 1, 0.8, 18);
      c.box(0.1, 0.1, 0.35, 0.55, 6, M.wood, 18);
      c.top(0.13, 0.13, 0.29, 0.49, 24.1, C.woodDark);
      for (let k = 0; k < 5; k++) {
        const u = 0.52 + k * 0.08;
        c.box(
          u,
          0.1,
          0.06,
          0.6,
          1,
          {
            top: C.ivory,
            front: C.stone,
            side: C.stoneShade,
            edge: C.stoneLine,
          },
          18,
        );
        for (let n = 0; n < 6; n++) {
          const [x, y] = c.at(u + 0.03, 0.15 + n * 0.1, 19.2);
          c.p.pixel(x, y, n % 2 ? C.charcoal : C.red);
        }
      }
    },
  },
  // A giant demonstration slide rule on a stand: body, slide and cursor.
  'm-slide-rule': {
    footprint: [2, 0.3],
    h: 52,
    side: true,
    draw(c) {
      for (const u of [0.3, 1.7]) {
        c.box(u - 0.04, 0.1, 0.08, 0.1, 40, M.steel);
        c.box(u - 0.15, 0.0, 0.3, 0.3, 2, M.steel);
      }
      c.faceX(-0.05, 0.2, 2.1, 38, 12, C.ivory);
      c.faceX(-0.05, 0.201, 2.1, 42, 4, C.woodLight);
      for (let k = 0; k < 40; k++) {
        const u = 2 * Math.log10(1 + (k / 40) * 9) * 0.98;
        const long = k % 10 === 0;
        c.edge([u, 0.202, 50], [u, 0.202, long ? 47 : 48.5], C.charcoal);
        c.edge([u, 0.202, 38], [u, 0.202, long ? 41 : 39.5], C.charcoal);
        c.edge([u, 0.202, 43], [u, 0.202, 44], C.redDark);
      }
      // The cursor: a clear window with a red hairline.
      c.faceX(1.05, 0.21, 0.16, 37, 14, C.glassLight);
      c.edge([1.13, 0.212, 37], [1.13, 0.212, 51], C.red);
    },
  },
  // Pascal's calculator: a brass box with a row of dials, on a plinth.
  'm-pascaline': {
    footprint: [1, 0.8],
    h: 36,
    draw(c) {
      plinth(c, 1, 0.8, 18);
      c.box(
        0.08,
        0.2,
        0.84,
        0.4,
        7,
        {
          top: C.gold,
          front: C.yellowDark,
          side: C.orangeDark,
          edge: C.orangeDark,
        },
        18,
      );
      for (let k = 0; k < 6; k++) {
        const [x, y] = c.at(0.18 + k * 0.13, 0.4, 25.1);
        c.p.ellipse(x, y, 3, 2, C.yellowDark);
        c.p.ellipse(x, y, 2, 1, C.ivory);
        c.p.pixel(x, y, C.charcoal);
      }
      for (let k = 0; k < 6; k++) {
        const [x, y] = c.at(0.18 + k * 0.13, 0.6, 21);
        c.p.rect(x - 1, y - 1, 2, 2, C.ivory);
      }
    },
  },
  // Leibniz's stepped reckoner: a long brass machine with dials and a crank.
  'm-stepped-reckoner': {
    footprint: [1.6, 0.8],
    h: 40,
    draw(c) {
      plinth(c, 1.6, 0.8, 18);
      c.box(0.08, 0.15, 1.44, 0.5, 6, M.wood, 18);
      c.box(
        0.15,
        0.25,
        1.3,
        0.3,
        4,
        {
          top: C.gold,
          front: C.yellowDark,
          side: C.orangeDark,
          edge: C.orangeDark,
        },
        24,
      );
      for (let k = 0; k < 8; k++) {
        const [x, y] = c.at(0.25 + k * 0.15, 0.4, 28.1);
        c.p.ellipse(x, y, 2, 1, C.ivory);
        c.p.pixel(x, y, C.charcoal);
      }
      // Crank at the right end.
      c.edge([1.45, 0.4, 28], [1.62, 0.4, 32], C.steelDark);
      const [hx, hy] = c.at(1.62, 0.4, 32);
      c.p.rect(hx, hy - 3, 2, 4, C.woodDark);
    },
  },
  // Babbage's difference engine: columns of stacked figure wheels in a
  // brass and iron frame, with a crank on top.
  'm-difference-engine': {
    footprint: [2, 1],
    h: 72,
    draw(c) {
      c.box(0, 0, 2, 1, 6, M.dark);
      for (const [x, y] of [
        [0.05, 0.05],
        [1.85, 0.05],
        [0.05, 0.85],
        [1.85, 0.85],
      ])
        c.box(x, y, 0.1, 0.1, 54, M.dark, 6);
      c.box(0, 0, 2, 1, 3, M.dark, 60);
      for (let col = 0; col < 5; col++) {
        const u = 0.25 + col * 0.375;
        c.edge([u, 0.5, 8], [u, 0.5, 58], C.ink);
        for (let r = 0; r < 7; r++) {
          const z = 11 + r * 7;
          c.cylinder(u, 0.5, z, 3, 2, [C.gold, C.yellowDark, C.orangeDark]);
          const [x, y] = c.at(u, 0.5, z + 1);
          c.p.pixel(x, y + 2, C.ivory);
        }
      }
      // Crank and gearing on top.
      c.cylinder(1.0, 0.5, 63, 6, 2, [C.gold, C.yellowDark, C.orangeDark]);
      c.edge([1.0, 0.5, 65], [1.0, 0.5, 70], C.steel);
      c.edge([1.0, 0.5, 70], [1.25, 0.5, 70], C.steel);
    },
  },
  // Babbage's analytical engine: the mill (a ring of wheel columns round a
  // central drum), the store (rows of columns) and a chain of punched cards.
  'm-analytical-engine': {
    footprint: [2.6, 1.2],
    h: 76,
    draw(c) {
      c.box(0, 0, 2.6, 1.2, 6, M.dark);
      // The store: rows of columns along the back.
      for (let col = 0; col < 5; col++) {
        const u = 1.1 + col * 0.3;
        c.edge([u, 0.3, 6], [u, 0.3, 54], C.ink);
        for (let r = 0; r < 7; r++)
          c.cylinder(u, 0.3, 9 + r * 6.5, 2, 2, [
            C.steelLight,
            C.steel,
            C.steelDark,
          ]);
      }
      c.box(1.0, 0.2, 1.5, 0.2, 2, M.dark, 54);
      // The mill: a ring of brass columns round a central drum.
      c.cylinder(0.5, 0.6, 6, 7, 52, [C.gold, C.yellowDark, C.orangeDark]);
      for (let k = 0; k < 6; k++) {
        const t = (k / 6) * Math.PI * 2;
        const u = 0.5 + Math.cos(t) * 0.4,
          v = 0.6 + Math.sin(t) * 0.4;
        for (let r = 0; r < 7; r++)
          c.cylinder(u, v, 9 + r * 6.5, 2, 2, [
            C.gold,
            C.yellowDark,
            C.orangeDark,
          ]);
      }
      // The punched-card chain feeding in at the front.
      for (let k = 0; k < 9; k++) {
        const u = 1.0 + k * 0.17;
        c.faceX(u, 1.15, 0.15, 8 + (k % 2) * 2, 10, C.paper);
        for (let n = 0; n < 4; n++) {
          const [x, y] = c.at(
            u + 0.03 + (n % 2) * 0.06,
            1.151,
            12 + n * 2 + (k % 2) * 2,
          );
          if ((k + n) % 3) c.p.pixel(x, y, C.charcoal);
        }
      }
    },
  },
  /* ── Calculation in the 20th century (owner's second list) ── */
  // A Curta-style hand calculator: a black knurled cylinder with a crank.
  'm-curta': {
    footprint: [1, 1],
    h: 42,
    draw(c) {
      plinth(c, 1, 1, 18);
      c.cylinder(0.5, 0.5, 18, 5, 12, [C.slate, C.charcoal, C.ink]);
      for (let z = 20; z < 29; z += 2) {
        const [x, y] = c.at(0.5, 0.5, z);
        c.p.pixel(x - 3, y + 2, C.silver);
        c.p.pixel(x, y + 3, C.silver);
        c.p.pixel(x + 3, y + 2, C.silver);
      }
      c.cylinder(0.5, 0.5, 30, 3, 2, [C.steelLight, C.steel, C.steelDark]);
      c.edge([0.5, 0.5, 32], [0.5, 0.5, 36], C.steelDark);
      c.edge([0.5, 0.5, 36], [0.72, 0.5, 36], C.steelDark);
      const [hx, hy] = c.at(0.72, 0.5, 36);
      c.p.rect(hx, hy - 3, 2, 3, C.charcoal);
    },
  },
  // A planimeter tracing a shape on a round drawing table.
  'm-planimeter': {
    footprint: [1.2, 1.2],
    h: 34,
    draw(c) {
      c.box(0.5, 0.5, 0.2, 0.2, 14, M.wood);
      c.cylinder(0.6, 0.6, 14, 15, 3, [C.ivory, C.stone, C.stoneShade]);
      // The traced shape.
      const [cx, cy] = c.at(0.6, 0.6, 17);
      for (let a = 0; a < 40; a++) {
        const t = (a / 40) * Math.PI * 2,
          r = 7 + Math.sin(3 * t) * 2;
        c.p.pixel(
          Math.round(cx + Math.cos(t) * r),
          Math.round(cy + Math.sin(t) * r * 0.5),
          C.blue,
        );
      }
      // Pole arm, tracer arm, measuring wheel.
      c.edge([0.2, 0.3, 18], [0.5, 0.75, 22], C.steelDark);
      c.edge([0.5, 0.75, 22], [0.9, 0.55, 19], C.steelDark);
      c.cylinder(0.2, 0.3, 17, 2, 2, [C.steelLight, C.steel, C.steelDark]);
      const [wx, wy] = c.at(0.5, 0.75, 20);
      c.p.ellipse(wx, wy, 2, 3, C.gold);
      c.p.pixel(wx, wy, C.charcoal);
    },
  },
  // A harmonic analyser: a wood and brass case of dials, with a paper
  // trace scrolling out of the top.
  'm-harmonic-analyzer': {
    footprint: [1.4, 1],
    h: 46,
    draw(c) {
      plinth(c, 1.4, 1, 14);
      c.box(0.1, 0.15, 1.2, 0.7, 12, M.wood, 14);
      c.faceX(0.15, 0.851, 1.1, 16, 8, C.yellowDark);
      for (let r = 0; r < 2; r++)
        for (let k = 0; k < 6; k++) {
          const [x, y] = c.at(0.25 + k * 0.17, 0.852, 18 + r * 4);
          c.p.rect(x - 1, y - 1, 3, 2, C.charcoal);
          c.p.pixel(x, y - 1, C.silver);
        }
      // Paper roll and the wave trace.
      c.cylinder(0.7, 0.4, 26, 6, 3, [C.paper, C.ivory, C.stone]);
      c.faceX(0.35, 0.4, 0.7, 29, 12, C.paper);
      let prev = c.at(0.38, 0.401, 35);
      for (let k = 1; k <= 12; k++) {
        const next = c.at(
          0.38 + k * 0.053,
          0.401,
          35 + Math.round(Math.sin(k * 1.1) * 3 + Math.sin(k * 2.7)),
        );
        c.line(prev, next, C.blueDark);
        prev = next;
      }
    },
  },
  // An integraph: a drum of graph paper turning under a pen carriage.
  'm-integraph': {
    footprint: [1.6, 1],
    h: 44,
    draw(c) {
      c.box(0.05, 0.1, 1.5, 0.8, 4, M.dark);
      for (const u of [0.15, 1.35]) c.box(u, 0.35, 0.1, 0.3, 20, M.steel, 4);
      // The drum, papered, with grid lines.
      for (let u = 0.25; u < 1.35; u += 0.1)
        c.cylinder(u, 0.5, 18, 6, 1, [C.paper, C.ivory, C.stone]);
      for (let u = 0.3; u < 1.3; u += 0.2) {
        const [x, y] = c.at(u, 0.5, 18);
        c.p.rect(x, y - 5, 1, 9, C.glassLight);
      }
      // Rail and pen carriage over the drum.
      c.edge([0.15, 0.3, 34], [1.45, 0.3, 34], C.steelDark);
      c.box(0.75, 0.25, 0.14, 0.14, 6, M.dark, 30);
      c.edge([0.82, 0.32, 30], [0.82, 0.32, 24], C.red);
      c.cylinder(1.45, 0.5, 18, 6, 2, [C.gold, C.yellowDark, C.orangeDark]);
    },
  },
  // A nomogram on a drafting table: three parallel scales and a
  // straightedge laid across them.
  'm-nomogram': {
    footprint: [1.2, 1],
    h: 30,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [1.05, 0.05],
        [0.05, 0.85],
        [1.05, 0.85],
      ])
        c.box(x, y, 0.08, 0.08, 20, M.steel);
      c.box(0, 0, 1.2, 1, 2, M.wood, 20);
      c.top(0.08, 0.08, 1.04, 0.84, 22.1, C.paper);
      for (const u of [0.25, 0.6, 0.95]) {
        c.edge([u, 0.15, 22.2], [u, 0.85, 22.2], C.navy);
        for (let v = 0.2; v < 0.85; v += 0.08)
          c.edge([u, v, 22.2], [u + 0.04, v, 22.2], C.navy);
      }
      c.edge([0.2, 0.25, 22.3], [1.0, 0.75, 22.3], C.red);
      c.box(
        0.15,
        0.62,
        0.9,
        0.06,
        1,
        {
          top: C.gold,
          front: C.yellowDark,
          side: C.orangeDark,
          edge: C.orangeDark,
        },
        22.2,
      );
    },
  },
  // A graphing calculator on a display stand: a curve on its screen.
  'm-graphing-calculator': {
    footprint: [1, 1],
    h: 46,
    draw(c) {
      plinth(c, 1, 1, 18);
      c.box(0.35, 0.3, 0.3, 0.3, 2, M.dark, 18);
      c.faceX(0.25, 0.5, 0.5, 20, 24, C.charcoal);
      c.faceX(0.29, 0.501, 0.42, 34, 8, C.lime);
      let prev = c.at(0.31, 0.502, 36);
      for (let k = 1; k <= 8; k++) {
        const next = c.at(
          0.31 + k * 0.047,
          0.502,
          38 + Math.round(Math.sin(k * 0.9) * 2),
        );
        c.line(prev, next, C.greenDark);
        prev = next;
      }
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 4; k++) {
          const [x, y] = c.at(0.3 + k * 0.11, 0.502, 22 + r * 2.4);
          c.p.pixel(x, y, r === 4 ? C.blue : C.silver);
        }
    },
  },
  // A mainframe: cabinets with tape reels and blinking lamps, and a desk
  // with a green-screen terminal and a chair.
  'm-mainframe': {
    footprint: [2.6, 1.4],
    h: 74,
    draw(c) {
      for (const [u, w] of [
        [0, 0.8],
        [0.85, 0.8],
        [1.7, 0.85],
      ] as [number, number][]) {
        c.box(u, 0, w, 0.6, 66, {
          top: C.ivory,
          front: C.stone,
          side: C.stoneShade,
          edge: C.stoneLine,
        });
        c.faceX(u + 0.08, 0.601, w - 0.16, 8, 12, C.slate);
      }
      // Tape reels on the first two cabinets.
      for (const u of [0.4, 1.25])
        for (const du of [-0.17, 0.17]) {
          c.faceX(u + du - 0.12, 0.602, 0.24, 44, 14, C.slate);
          const [x, y] = c.at(u + du, 0.603, 51);
          c.p.ellipse(x, y, 2, 3, C.ink);
          c.p.pixel(x, y, C.silver);
        }
      // Lamps on the third.
      for (let r = 0; r < 6; r++)
        for (let k = 0; k < 4; k++) {
          const [x, y] = c.at(1.82 + k * 0.15, 0.602, 30 + r * 5);
          c.p.pixel(x, y, (r + k) % 3 ? C.orange : C.yellow);
        }
      // Terminal desk in front.
      c.box(0.6, 0.85, 1.2, 0.5, 2, M.stone, 20);
      for (const [x, y] of [
        [0.65, 0.9],
        [1.7, 0.9],
        [0.65, 1.25],
        [1.7, 1.25],
      ])
        c.box(x, y, 0.06, 0.06, 20, M.steel);
      c.box(
        0.95,
        0.9,
        0.45,
        0.35,
        12,
        {
          top: C.stone,
          front: C.stoneShade,
          side: C.stoneLine,
          edge: C.stoneLine,
        },
        22,
      );
      c.faceX(1.0, 1.251, 0.35, 25, 8, C.ink);
      for (let r = 0; r < 3; r++)
        c.edge(
          [1.03, 1.252, 30 - r * 2],
          [1.25 - r * 0.04, 1.252, 30 - r * 2],
          C.lime,
        );
      c.top(0.95, 1.27, 0.45, 0.07, 22.1, C.stoneShade);
    },
  },
  // Vannevar Bush's differential analyser: a long frame of shafts, gears
  // and integrator wheels.
  'm-differential-analyzer': {
    footprint: [3, 1.6],
    h: 46,
    draw(c) {
      c.box(0, 0.1, 3, 1.4, 6, M.dark);
      for (const u of [0.1, 1.0, 2.0, 2.85])
        for (const v of [0.25, 1.25]) c.box(u, v, 0.08, 0.08, 22, M.steel, 6);
      // Long shafts running the length of the frame.
      for (const v of [0.35, 0.75, 1.15])
        c.edge([0.1, v, 26], [2.9, v, 26], C.steelDark);
      c.edge([0.1, 0.55, 32], [2.9, 0.55, 32], C.steel);
      // Gear wheels and integrator discs along the shafts.
      for (let k = 0; k < 7; k++) {
        const u = 0.3 + k * 0.38;
        c.cylinder(u, 0.35 + (k % 3) * 0.4, 24, 3 + (k % 2), 3, [
          C.gold,
          C.yellowDark,
          C.orangeDark,
        ]);
      }
      for (const u of [0.8, 1.7, 2.5]) {
        c.cylinder(u, 0.95, 6, 6, 2, [C.steelLight, C.steel, C.steelDark]);
        c.edge([u, 0.95, 8], [u, 0.95, 26], C.steelDark);
      }
    },
  },
  // A drafting geometry set: a compass, protractor, set square and ruler
  // on a small drawing table.
  'm-drafting-set': {
    footprint: [1.6, 1],
    h: 34,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [1.45, 0.05],
        [0.05, 0.85],
        [1.45, 0.85],
      ])
        c.box(x, y, 0.08, 0.08, 20, M.wood);
      c.box(0, 0, 1.6, 1, 2, M.wood, 20);
      c.top(0.06, 0.06, 1.48, 0.88, 22.1, C.paper);
      // Protractor: a clear half disc with tick marks.
      const [px, py] = c.at(0.45, 0.5, 22.2);
      for (let a = 0; a <= 18; a++) {
        const t = Math.PI + (a / 18) * Math.PI;
        c.p.pixel(
          Math.round(px + Math.cos(t) * 9),
          Math.round(py + Math.sin(t) * 5),
          C.blue,
        );
      }
      c.line([px - 9, py], [px + 9, py], C.blue);
      // Set square.
      c.line(c.at(0.9, 0.2, 22.3), c.at(1.4, 0.2, 22.3), C.teal);
      c.line(c.at(0.9, 0.2, 22.3), c.at(0.9, 0.6, 22.3), C.teal);
      c.line(c.at(0.9, 0.6, 22.3), c.at(1.4, 0.2, 22.3), C.teal);
      // Ruler and an open compass.
      c.box(
        0.2,
        0.78,
        1.2,
        0.08,
        1,
        {
          top: C.gold,
          front: C.yellowDark,
          side: C.orangeDark,
          edge: C.orangeDark,
        },
        22.2,
      );
      c.edge([1.1, 0.55, 30], [1.0, 0.75, 22.3], C.steelDark);
      c.edge([1.1, 0.55, 30], [1.3, 0.7, 22.3], C.steelDark);
      const [cx, cy] = c.at(1.1, 0.55, 31);
      c.p.rect(cx - 1, cy - 2, 2, 3, C.charcoal);
    },
  },
  /* ── Maths lab, after the owner's reference photos (zoned research lab) ── */
  // A stool with a coloured seat (green and teal, as in the references).
  // (Drawn by the furniture below; not an object of its own.)
  // The central geometric repository: two white modular tables pushed
  // together, covered in models: wireframe polyhedra (a green dome, a blue
  // geodesic sphere, a gold octahedron), coloured unit cubes, a tangram, a
  // blue geoboard, an abacus, boxes of pieces and papers; stools round it.
  'm-geo-table': {
    footprint: [4, 2.2],
    h: 52,
    draw(c) {
      const stool = (x: number, y: number, col: string) => {
        c.box(x + 0.12, y + 0.12, 0.08, 0.08, 10, M.steel);
        c.cylinder(x + 0.16, y + 0.16, 10, 4, 2, [col, col, C.greenDark]);
      };
      for (const u of [0.5, 1.5, 2.5, 3.3])
        stool(u, -0.45, u % 1 ? C.green : C.teal);
      // Cabinets under, white tops.
      c.box(0, 0, 4, 2.2, 18, M.white);
      c.box(-0.02, -0.02, 4.04, 2.24, 2, M.white, 18);
      c.edge([2, 2.2, 0], [2, 2.2, 18], C.silver);
      c.edge([4, 1.1, 0], [4, 1.1, 18], C.silver);
      // Geoboard and a protractor board.
      c.top(0.2, 1.4, 0.6, 0.6, 20.1, C.blue);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          c.top(0.26 + i * 0.14, 1.46 + j * 0.14, 0.04, 0.04, 20.4, C.white);
      c.top(0.95, 1.45, 0.55, 0.55, 20.1, C.glassLight);
      c.edge([1.0, 1.72, 20.3], [1.45, 1.72, 20.3], C.blue);
      c.edge([1.22, 1.5, 20.3], [1.22, 1.95, 20.3], C.blue);
      // Coloured unit cubes.
      for (const [x, y, col] of [
        [0.3, 0.3, C.red],
        [0.45, 0.3, C.yellow],
        [0.3, 0.45, C.green],
        [0.75, 0.6, C.blue],
        [0.9, 0.6, C.red],
        [0.75, 0.75, C.yellow],
      ] as [number, number, string][])
        c.box(
          x,
          y,
          0.13,
          0.13,
          4,
          { top: col, front: col, side: C.edge, edge: C.edge },
          20,
        );
      // Tangram, papers.
      c.top(1.2, 0.3, 0.3, 0.3, 20.1, C.orange);
      c.top(1.25, 0.35, 0.12, 0.12, 20.2, C.teal);
      c.top(1.6, 1.3, 0.5, 0.35, 20.1, C.paper);
      c.top(1.75, 1.45, 0.5, 0.35, 20.2, C.white);
      // Wireframe polyhedra: a green dome, a blue geodesic sphere, gold.
      const wire = (
        u: number,
        v: number,
        r: number,
        h: number,
        col: string,
        dome = false,
      ) => {
        const [x, y] = c.at(u, v, 20);
        const ring = (z: number, rr: number) => {
          const pts: [number, number][] = [];
          for (let k = 0; k <= 8; k++) {
            const t = (k / 8) * Math.PI * 2;
            pts.push([
              Math.round(x + Math.cos(t) * rr),
              Math.round(y - z + Math.sin(t) * rr * 0.5),
            ]);
          }
          for (let k = 0; k < 8; k++) c.line(pts[k], pts[k + 1], col);
          return pts;
        };
        const rings = dome
          ? [ring(0, r), ring(h * 0.55, r), ring(h, r * 0.6)]
          : [ring(h * 0.2, r * 0.7), ring(h * 0.5, r), ring(h * 0.8, r * 0.7)];
        for (let i = 0; i + 1 < rings.length; i++)
          for (let k = 0; k < 8; k += 1)
            c.line(rings[i][k], rings[i + 1][(k + (i % 2)) % 8], col);
        if (!dome) {
          c.line(rings[0][0], [x, y - 1], col);
          c.line(rings[2][4], [x, y - h], col);
        }
      };
      wire(2.4, 0.5, 8, 16, C.green, true);
      wire(3.4, 0.9, 7, 15, C.blue);
      wire(2.9, 1.5, 5, 11, C.gold);
      // A wooden abacus and a box of pieces.
      c.box(3.2, 1.7, 0.6, 0.12, 6, M.wood, 20);
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 6; k++) {
          const [x, y] = c.at(3.25 + k * 0.08, 1.76, 21 + r * 2);
          c.p.pixel(x, y, accents[(k + r) % accents.length]);
        }
      c.box(2.0, 0.35, 0.35, 0.3, 3, M.wood, 20);
      c.top(2.04, 0.39, 0.27, 0.22, 23.1, C.yellow);
      // Stools on the near side, in front of the table.
      for (const u of [0.5, 1.5, 2.5, 3.3])
        stool(u, 2.45, u % 1 ? C.teal : C.green);
    },
  },
  // A freestanding double-sided board, as the references' zone dividers: a
  // blackboard of working with a screen mounted on it (a graph diagram) and
  // a low white shelf of books at its foot.
  'm-board-partition': {
    footprint: [3, 0.8],
    h: 86,
    side: true,
    draw(c) {
      c.box(0, 0, 3, 0.4, 84, M.white);
      c.faceX(0.08, 0.401, 2.84, 30, 52, C.ink);
      c.faceX(0.12, 0.402, 2.76, 32, 48, C.charcoal);
      const pt = (u: number, z: number) => c.at(u, 0.403, z);
      // Chalk working: strokes, an integral-like curve, a matrix of dots.
      for (let r = 0; r < 6; r++)
        for (let k = 0, u = 0.2; k < 5; k++) {
          const w = 0.06 + ((r * 5 + k * 3) % 4) * 0.03;
          if (u + w > 1.3) break;
          c.edge(
            [u, 0.403, 74 - r * 6],
            [u + w, 0.403, 74 - r * 6],
            r % 3 ? C.silver : C.white,
          );
          u += w + 0.05;
        }
      let prev = pt(0.25, 38);
      for (let k = 1; k <= 14; k++) {
        const next = pt(
          0.25 + k * 0.07,
          38 + Math.round(10 / (1 + (k - 7) ** 2 / 6)),
        );
        c.line(prev, next, C.yellow);
        prev = next;
      }
      // Mounted screen: two node graphs (as in the reference).
      c.faceX(1.5, 0.404, 1.25, 44, 26, C.ink);
      c.faceX(1.54, 0.405, 1.17, 46, 22, C.glassLight);
      const graph = (cu: number, cz: number, n: number, col: string) => {
        const pts: [number, number][] = [];
        for (let k = 0; k < n; k++) {
          const t = (k / n) * Math.PI * 2;
          pts.push(pt(cu + Math.cos(t) * 0.2, cz + Math.sin(t) * 7));
        }
        for (let a = 0; a < n; a++)
          for (let b = a + 1; b < n; b++)
            if ((a + b) % 2 || n < 6) c.line(pts[a], pts[b], col);
      };
      graph(1.85, 57, 7, C.blue);
      graph(2.4, 57, 5, C.navy);
      // A low white shelf of books at the foot.
      c.box(-0.05, 0.4, 3.1, 0.35, 22, M.white);
      for (let k = 0; k < 18; k++)
        book(
          c,
          0.1 + k * 0.16,
          0.76,
          4 + (k % 2) * 9,
          7,
          accents[k % accents.length],
        );
    },
  },
  // A data-science hub desk: a long white desk, four monitors (dashboards
  // and plots), keyboards, and green and teal task chairs.
  'm-hub-desk': {
    footprint: [3, 1.6],
    h: 56,
    side: true,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [2.85, 0.05],
        [0.05, 0.85],
        [2.85, 0.85],
      ])
        c.box(x, y, 0.1, 0.1, 20, M.steel);
      c.box(0, 0, 3, 1, 2, M.white, 20);
      for (let i = 0; i < 4; i++) {
        const x = 0.12 + i * 0.72;
        c.box(x + 0.27, 0.2, 0.08, 0.08, 6, M.dark, 22);
        c.faceX(x, 0.3, 0.62, 28, 18, C.ink);
        c.faceX(x + 0.03, 0.301, 0.56, 30, 14, C.navy);
        if (i % 2) {
          let prev = c.at(x + 0.06, 0.302, 33);
          for (let k = 1; k <= 8; k++) {
            const next = c.at(
              x + 0.06 + k * 0.06,
              0.302,
              33 + ((k * 5 + i) % 8),
            );
            c.line(prev, next, C.glow);
            prev = next;
          }
        } else
          for (let k = 0; k < 5; k++)
            c.faceX(
              x + 0.08 + k * 0.1,
              0.302,
              0.06,
              32,
              2 + ((k * 3 + i) % 8),
              accents[(k + i) % accents.length],
            );
        c.top(x + 0.1, 0.55, 0.42, 0.14, 22, C.charcoal);
      }
      // Task chairs in front, alternating green and teal.
      for (let i = 0; i < 4; i++) {
        const x = 0.25 + i * 0.72,
          col = i % 2 ? C.teal : C.green,
          dark = i % 2 ? C.tealDark : C.greenDark;
        c.box(x + 0.12, 1.32, 0.08, 0.08, 10, M.dark);
        c.box(
          x,
          1.2,
          0.34,
          0.34,
          3,
          { top: col, front: dark, side: dark, edge: C.edge },
          10,
        );
        c.faceX(x, 1.55, 0.34, 13, 12, col);
      }
    },
  },
  // The quantum topology wing's display wall: four large screens showing a
  // torus mesh, a knot, a spectrum and a lattice.
  'm-screen-array': {
    footprint: [3, 0.3],
    h: 82,
    draw(c) {
      for (const u of [0.3, 2.7]) c.box(u - 0.06, 0.05, 0.12, 0.2, 44, M.dark);
      c.faceX(-0.05, 0.25, 3.1, 40, 40, C.ink);
      const panel = (u: number, z: number) =>
        c.faceX(u, 0.251, 1.45, z, 17, C.navy);
      panel(0.05, 61);
      panel(1.55, 61);
      panel(0.05, 42);
      panel(1.55, 42);
      const pt = (u: number, z: number) => c.at(u, 0.252, z);
      // Torus mesh.
      for (let a = 0; a < 16; a++) {
        const t = (a / 16) * Math.PI * 2;
        const [x, y] = pt(0.75 + Math.cos(t) * 0.45, 69 + Math.sin(t) * 5);
        c.p.pixel(x, y, C.glow);
        const [x2, y2] = pt(0.75 + Math.cos(t) * 0.2, 69 + Math.sin(t) * 2);
        c.p.pixel(x2, y2, C.teal);
      }
      // Knot.
      for (let a = 0; a < 30; a++) {
        const t = (a / 30) * Math.PI * 2,
          r = 0.22 + Math.cos(3 * t) * 0.1;
        const [x, y] = pt(
          2.27 + Math.cos(2 * t) * r,
          69 + Math.sin(2 * t) * r * 25,
        );
        c.p.pixel(x, y, a % 2 ? C.orange : C.yellow);
      }
      // Spectrum (bars in a rainbow).
      for (let k = 0; k < 10; k++)
        c.faceX(
          0.12 + k * 0.13,
          0.253,
          0.08,
          44,
          2 + Math.round(10 * Math.exp(-((k - 4.5) ** 2) / 6)),
          accents[k % accents.length],
        );
      // Lattice of points with links.
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 3; j++) {
          const [x, y] = pt(1.7 + i * 0.27, 46 + j * 5);
          c.p.rect(x, y, 2, 2, C.pink);
          if (i < 4)
            c.line([x + 1, y], pt(1.7 + (i + 1) * 0.27, 46 + j * 5), C.purple);
        }
    },
  },
  // A cryogenic dewar: a tall polished steel flask with valves and a gauge.
  'm-dewar': {
    footprint: [0.6, 0.6],
    h: 46,
    draw(c) {
      c.cylinder(0.3, 0.3, 0, 6, 34, R.steel);
      c.cylinder(0.3, 0.3, 34, 4, 4, R.steel);
      c.edge([0.3, 0.3, 38], [0.3, 0.3, 42], C.steelDark);
      const [x, y] = c.at(0.3, 0.3, 42);
      c.p.rect(x - 3, y - 1, 7, 2, C.steelDark);
      c.p.ellipse(x + 3, y + 8, 2, 2, C.white);
      c.p.pixel(x + 3, y + 8, C.red);
      c.edge([0.1, 0.5, 24], [0.5, 0.5, 24], C.white);
    },
  },
  // A large copper trefoil knot on a white plinth.
  'm-knot-sculpture': {
    footprint: [1.2, 1.2],
    h: 58,
    draw(c) {
      c.box(0.15, 0.15, 0.9, 0.9, 16, M.white);
      const [x, y] = c.at(0.6, 0.6, 32);
      for (let a = 0; a < 140; a++) {
        const t = (a / 140) * Math.PI * 2;
        const px = Math.sin(t) + 2 * Math.sin(2 * t),
          pz = Math.cos(t) - 2 * Math.cos(2 * t),
          depth = -Math.sin(3 * t);
        const col =
          depth > 0.3
            ? C.orange
            : depth > -0.3
              ? C.orangeDark
              : C.terracottaDark;
        c.p.rect(Math.round(x + px * 4), Math.round(y - pz * 4), 3, 3, col);
      }
    },
  },
  // A round study table with teal and green chairs.
  'm-round-table': {
    footprint: [1.6, 1.6],
    h: 36,
    draw(c) {
      const chair = (
        u: number,
        v: number,
        col: string,
        dark: string,
        back: boolean,
      ) => {
        c.box(u + 0.1, v + 0.1, 0.08, 0.08, 10, M.dark);
        c.box(
          u,
          v,
          0.3,
          0.3,
          3,
          { top: col, front: dark, side: dark, edge: C.edge },
          10,
        );
        if (back) c.faceX(u, v, 0.3, 13, 10, col);
      };
      chair(0.65, -0.15, C.teal, C.tealDark, true);
      chair(-0.15, 0.65, C.green, C.greenDark, true);
      c.box(0.75, 0.75, 0.1, 0.1, 20, M.steel);
      c.cylinder(0.8, 0.8, 20, 13, 2, R.white);
      c.top(0.6, 0.55, 0.3, 0.2, 22.1, C.paper);
      c.cylinder(1.05, 0.9, 22, 2, 4, [C.white, C.offwhite, C.pale]);
      chair(1.35, 0.65, C.teal, C.tealDark, false);
      chair(0.65, 1.35, C.green, C.greenDark, false);
    },
  },
  // A mobile book cart.
  'm-book-cart': {
    footprint: [1, 0.5],
    h: 34,
    side: true,
    draw(c) {
      for (const [x, y] of [
        [0.05, 0.05],
        [0.85, 0.05],
        [0.05, 0.35],
        [0.85, 0.35],
      ]) {
        const [px, py] = c.at(x + 0.05, y + 0.05, 0);
        c.p.rect(px - 1, py - 1, 3, 2, C.ink);
      }
      c.box(0, 0, 1, 0.5, 28, M.white, 2);
      for (const z of [6, 18])
        for (let k = 0; k < 6; k++)
          book(
            c,
            0.08 + k * 0.15,
            0.51,
            z,
            8,
            accents[(k + z) % accents.length],
          );
    },
  },
  // A pull-down projector screen on the wall: an abstract slide of shapes.
  'm-projector-screen': {
    footprint: [2.6, 0.15],
    h: 84,
    side: true,
    shadow: false,
    draw(c) {
      c.box(-0.05, 0, 2.7, 0.15, 3, M.white, 80);
      c.faceX(0.05, 0.151, 2.5, 38, 42, C.offwhite);
      c.faceX(0.12, 0.152, 2.36, 42, 34, C.pale);
      c.faceX(0.4, 0.153, 1.0, 64, 3, C.slate);
      for (let r = 0; r < 3; r++)
        c.faceX(0.4, 0.153, 0.6 + (r % 2) * 0.3, 56 - r * 5, 2, C.silver);
      let prev = c.at(1.55, 0.153, 46);
      for (let k = 1; k <= 7; k++) {
        const next = c.at(
          1.55 + k * 0.12,
          0.153,
          46 + Math.round(Math.sin(k * 0.9) * 6 + 6),
        );
        c.line(prev, next, C.blue);
        prev = next;
      }
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
      // Front wall with drainage stains and a lit coping.
      c.faceX(0, 3.001, 8, 0, step - 1, C.concreteShade);
      for (let u = 0.3; u < 8; u += 1.1)
        c.faceX(u, 3.002, 0.05, 1, step - 3, C.concreteLine);
      c.edge([0, 3.002, step - 1], [8, 3.002, step - 1], C.concrete);
      c.box(-0.05, -0.25, 8.1, 0.6, 4, M.teal, tiers * step + 14);
      c.edge(
        [-0.05, 0.35, tiers * step + 17],
        [8.05, 0.35, tiers * step + 17],
        C.turquoise,
      );
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

/* ───────────── Fight arena: octagon and boxing ring ───────────── */
// Structures are split into a flat floor-baked base plus thin wall pieces, so
// fighters standing inside sort between the back and front walls. Wall pieces
// are drawn with their foot on the anchor; the room lifts them with object z.
type T2 = [number, number];
const lerp2 = (a: T2, b: T2, t: number): T2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
/** Plot a tile-space circle at height z (2 px wide, like pitch lines). */
function ring(
  c: IsoCanvas,
  cx: number,
  cy: number,
  r: number,
  z: number,
  col: string,
) {
  const n = Math.ceil(r * 64);
  for (let k = 0; k <= n; k++) {
    const a = (Math.PI * 2 * k) / n,
      [x, y] = c.at(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
    c.p.pixel(x, y, col);
    c.p.pixel(x + 1, y, col);
  }
}
/** Padded cage post at a tile point. */
function cagePost(c: IsoCanvas, at: T2, h: number) {
  const [x, y] = c.at(at[0], at[1], 0);
  c.p.rect(x - 1, y - h - 2, 4, h + 3, C.ink);
  c.p.rect(x - 1, y - h - 2, 1, h + 3, C.slate);
  c.p.rect(x - 1, y - h - 3, 4, 2, C.charcoal);
  c.p.rect(x, y - h + 4, 2, 1, C.red);
}
/** See-through chain-link panel between two tile points (a sparse lattice). */
function cagePanel(c: IsoCanvas, a: T2, b: T2, h = 36) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * 18;
  const sa = c.at(a[0], a[1]),
    sb = c.at(b[0], b[1]);
  const n = Math.max(
    2,
    Math.ceil(Math.hypot(sb[0] - sa[0], sb[1] - sa[1]) * 2),
  );
  for (let k = 0; k <= n; k++) {
    const t = k / n,
      along = t * len,
      [x, y] = c.at(...lerp2(a, b, t));
    for (let up = 3; up < h - 3; up++) {
      const d1 = (((along + up) % 9) + 9) % 9,
        d2 = (((along - up) % 9) + 9) % 9;
      if (d1 < 0.55 || d2 < 0.55)
        c.p.pixel(Math.round(x), Math.round(y - up), C.charcoal);
    }
  }
  // Bottom band and padded top rail with a thin colour stripe.
  const rail = (up: number, r: number, col: string) =>
    c.thick([sa[0], sa[1] - up], [sb[0], sb[1] - up], r, col);
  rail(1, 1, C.ink);
  rail(h - 1, 1.6, C.ink);
  c.line([sa[0], sa[1] - h + 1], [sb[0], sb[1] - h + 1], C.red);
  c.line([sa[0], sa[1] - h - 1], [sb[0], sb[1] - h - 1], C.slate);
  cagePost(c, a, h);
  cagePost(c, b, h);
}
const OCT: T2[] = [
  [1.5, 0],
  [4.5, 0],
  [6, 1.5],
  [6, 4.5],
  [4.5, 6],
  [1.5, 6],
  [0, 4.5],
  [0, 1.5],
];
/** Octagon outline scaled about its centre (3, 3). */
const octScaled = (k: number): T2[] =>
  OCT.map(([x, y]) => [3 + (x - 3) * k, 3 + (y - 3) * k]);
const arena: Record<string, Spec> = {
  'm-octagon-mat': {
    footprint: [6, 6],
    h: 6,
    floor: true,
    draw(c) {
      const Z = 4;
      // Apron side faces, then the canvas on top.
      for (let i = 0; i < OCT.length; i++) {
        const a = OCT[i],
          b = OCT[(i + 1) % OCT.length];
        c.poly(
          [
            [a[0], a[1], 0],
            [b[0], b[1], 0],
            [b[0], b[1], Z],
            [a[0], a[1], Z],
          ],
          b[0] + b[1] > a[0] + a[1] || a[0] > 5 ? C.ink : C.charcoal,
        );
      }
      const top = (pts: T2[], col: string) =>
        c.poly(
          pts.map(([x, y]) => [x, y, Z] as [number, number, number]),
          col,
        );
      top(OCT, C.charcoal);
      top(octScaled(0.94), C.slate);
      top(octScaled(0.88), C.silver);
      top(octScaled(0.82), C.pale);
      // Subtle canvas texture and a faint centre circle.
      for (let k = 0; k < 40; k++) {
        const [x, y] = c.at(
          1 + ((k * 7) % 40) / 10,
          1 + ((k * 13) % 40) / 10,
          Z,
        );
        c.p.pixel(x, y, C.offwhite);
      }
      ring(c, 3, 3, 1.1, Z, C.silver);
      ring(c, 3, 3, 0.25, Z, C.silver);
      // Fighters' corner marks (plain colour).
      for (const [x, y, col] of [
        [1.4, 1.4, C.red],
        [4.6, 4.6, C.blue],
      ] as [number, number, string][]) {
        const [px, py] = c.at(x, y, Z);
        c.p.rect(px - 3, py - 1, 6, 2, col);
      }
    },
  },
  'm-cage-straight': {
    shadow: false,
    footprint: [3, 0.3],
    h: 42,
    side: true,
    draw(c) {
      cagePanel(c, [0, 0.15], [3, 0.15]);
    },
  },
  'm-cage-diag-a': {
    shadow: false,
    footprint: [1.5, 1.5],
    h: 42,
    draw(c) {
      cagePanel(c, [0, 1.5], [1.5, 0]);
    },
  },
  'm-cage-diag-b': {
    shadow: false,
    footprint: [1.5, 1.5],
    h: 42,
    draw(c) {
      cagePanel(c, [0, 0], [1.5, 1.5]);
    },
  },
  'm-ring-base': {
    footprint: [6, 6],
    h: 10,
    floor: true,
    draw(c) {
      const Z = 8;
      // Skirt on the visible faces, with vertical folds and a trim band.
      c.faceX(0, 6, 6, 0, Z, C.navy);
      c.faceY(6, 0, 6, 0, Z, C.blueDark);
      for (let u = 0.25; u < 6; u += 0.5) {
        c.edge([u, 6, 0], [u, 6, Z - 2], C.blueDark);
        c.edge([6, u, 0], [6, u, Z - 2], C.navy);
      }
      c.edge([0, 6, Z - 1], [6, 6, Z - 1], C.blue);
      c.edge([6, 0, Z - 1], [6, 6, Z - 1], C.blue);
      c.edge([0, 6, 0], [6, 6, 0], C.ink);
      c.edge([6, 0, 0], [6, 6, 0], C.ink);
      // Canvas: apron border outside the ropes, then the fighting area.
      c.top(0, 0, 6, 6, Z, C.silver);
      c.top(0.2, 0.2, 5.6, 5.6, Z, C.offwhite);
      c.top(0.6, 0.6, 4.8, 4.8, Z, C.white);
      for (let k = 0; k < 36; k++) {
        const [x, y] = c.at(
          0.8 + ((k * 7) % 44) / 10,
          0.8 + ((k * 11) % 44) / 10,
          Z,
        );
        c.p.pixel(x, y, C.pale);
      }
      c.edge([0, 6, Z], [6, 6, Z], C.pale);
      c.edge([6, 0, Z], [6, 6, Z], C.pale);
      // Corner pads on the canvas: red and blue corners, two neutral.
      for (const [x, y, col] of [
        [0.35, 0.35, C.red],
        [5.65, 5.65, C.blue],
        [5.65, 0.35, C.white],
        [0.35, 5.65, C.white],
      ] as [number, number, string][]) {
        const [px, py] = c.at(x, y, Z);
        c.p.rect(px - 2, py - 1, 5, 2, col);
      }
    },
  },
  'm-ring-ropes': {
    shadow: false,
    footprint: [6, 0.3],
    h: 36,
    side: true,
    draw(c) {
      const v = 0.15,
        ropes: [number, string, string][] = [
          [26, C.red, C.redDark],
          [18, C.white, C.silver],
          [10, C.blue, C.blueDark],
        ];
      for (const [z, col, shade] of ropes) {
        const pts: T2[] = [];
        for (let k = 0; k <= 24; k++) {
          const u = (6 * k) / 24,
            sag = Math.sin((Math.PI * k) / 24) * 1.5;
          pts.push(c.at(u, v, z - sag));
        }
        for (let k = 0; k < pts.length - 1; k++) {
          c.line(pts[k], pts[k + 1], col);
          c.line(
            [pts[k][0], pts[k][1] + 1],
            [pts[k + 1][0], pts[k + 1][1] + 1],
            shade,
          );
        }
      }
      // Padded corner posts at both ends with turnbuckle covers.
      for (const u of [0, 6]) {
        const [x, y] = c.at(u, v, 0);
        c.p.rect(x - 2, y - 30, 5, 31, C.steelDark);
        c.p.rect(x - 2, y - 30, 2, 31, C.steel);
        c.p.rect(x - 3, y - 31, 7, 2, C.slate);
        for (const [z] of ropes) {
          c.p.rect(x - 3, y - z - 2, 7, 4, C.offwhite);
          c.p.rect(x + 2, y - z - 2, 2, 4, C.pale);
        }
      }
    },
  },
  'm-ring-steps': {
    footprint: [1, 1],
    h: 26,
    draw(c) {
      for (let k = 0; k < 3; k++)
        c.box(0.1, k / 3, 0.8, 1 / 3, 9 - k * 3, M.steel);
      for (const x of [0.08, 0.92]) {
        const [px, py] = c.at(x, 0.95);
        c.p.rect(px, py - 18, 1, 18, C.steelDark);
        const [qx, qy] = c.at(x, 0.05, 9);
        c.line([px, py - 18], [qx, qy - 12], C.steelDark);
      }
    },
  },
  'm-corner-stool': {
    footprint: [0.5, 0.5],
    h: 20,
    draw(c) {
      for (const [x, y] of [
        [0.08, 0.08],
        [0.42, 0.08],
        [0.08, 0.42],
        [0.42, 0.42],
      ]) {
        const [px, py] = c.at(x, y);
        c.p.rect(px, py - 11, 1, 11, C.slate);
      }
      c.cylinder(0.25, 0.25, 11, 6, 2, [C.redDark, C.red, C.redDark], C.red);
      // Bucket beside the stool.
      c.cylinder(
        0.45,
        0.5,
        0,
        4,
        6,
        [C.steelLight, C.steel, C.steelDark],
        C.glass,
      );
    },
  },
  'm-ringside-seats': {
    // Person-scale ringside chairs (seat ~14 px); seat real characters on them.
    footprint: [4, 1],
    h: 30,
    side: true,
    draw(c) {
      for (const x of [0.5, 1.5, 2.5, 3.5]) {
        c.box(x - 0.35, 0.12, 0.7, 0.12, 26, M.dark);
        c.top(x - 0.33, 0.13, 0.66, 0.1, 26, C.red);
        c.box(x - 0.35, 0.24, 0.7, 0.55, 3, M.dark, 12);
        c.top(x - 0.3, 0.28, 0.6, 0.46, 15, C.charcoal);
        for (const [dx, dy] of [
          [-0.3, 0.75],
          [0.3, 0.75],
          [-0.3, 0.3],
          [0.3, 0.3],
        ]) {
          const [px, py] = c.at(x + dx, dy);
          c.p.rect(px, py - 12, 1, 12, C.slate);
        }
      }
    },
  },
  'm-commentary-desk': {
    footprint: [3, 1],
    h: 40,
    draw(c) {
      c.box(0, 0.2, 3, 0.8, 20, M.dark);
      c.faceX(0.1, 1.001, 2.8, 4, 12, C.navy);
      for (let k = 0; k < 6; k++)
        c.faceX(0.25 + k * 0.45, 1.002, 0.3, 7, 2 + ((k * 5) % 6), accents[k]);
      for (const x of [0.4, 1.8]) {
        screen(c, x, 0.4, 0.8, 22, 14, x > 1 ? 1 : 0);
        // Headset microphone on the desk.
        const [hx, hy] = c.at(x + 0.6, 0.85, 21);
        c.p.rect(hx - 3, hy - 4, 7, 1, C.ink);
        c.p.rect(hx - 3, hy - 4, 2, 4, C.ink);
        c.p.rect(hx + 2, hy - 4, 2, 4, C.ink);
        c.line([hx - 2, hy], [hx - 5, hy + 2], C.slate);
        c.p.pixel(hx - 5, hy + 2, C.red);
      }
    },
  },
  'm-arena-banner': {
    footprint: [3, 0.3],
    h: 92,
    draw(c) {
      c.box(0, 0, 3, 0.3, 4, M.dark);
      const panels: [string, string][] = [
        [C.red, C.yellow],
        [C.navy, C.teal],
        [C.purple, C.pink],
      ];
      panels.forEach(([bg, fg], i) => {
        const x = 0.1 + i,
          w = 0.8;
        c.faceX(x, 0.15, w, 6, 80, C.ink);
        c.faceX(x + 0.04, 0.16, w - 0.08, 8, 76, bg);
        // Abstract graphics: chevrons, bars and a circle.
        for (let k = 0; k < 4; k++) {
          const [px, py] = c.at(x + w / 2, 0.17, 20 + k * 9);
          c.line([px - 5, py], [px, py - 4], fg);
          c.line([px, py - 4], [px + 5, py], fg);
        }
        const [cx, cy] = c.at(x + w / 2, 0.17, 66);
        c.p.ellipse(cx, cy, 5, 5, fg);
        c.p.ellipse(cx, cy, 3, 3, bg);
        c.faceX(x + 0.1, 0.17, w - 0.2, 12, 3, C.white);
      });
    },
  },
};
Object.assign(objects, arena);

/* ───────────── New York City and the Michigan rally ───────────── */
const NM = {
  limestone: {
    top: C.limestoneLight,
    front: C.limestone,
    side: C.limestoneDark,
    edge: C.warmGreyDark,
  },
  brownstone: {
    top: C.brownstoneLight,
    front: C.brownstone,
    side: C.brownstoneDark,
    edge: C.brownstoneDark,
  },
  brick: {
    top: C.brickLight,
    front: C.brick,
    side: C.brickDark,
    edge: C.brickDark,
  },
  glass: {
    top: C.glassLight,
    front: C.glass,
    side: C.glassDark,
    edge: C.glassDeep,
  },
  green: {
    top: C.greenDark,
    front: C.green,
    side: C.greenDark,
    edge: C.leafDark,
  },
  taxi: {
    top: C.yellow,
    front: C.yellowDark,
    side: C.taxiShade,
    edge: C.edge,
  },
  navy: { top: C.navy, front: C.navy, side: C.stageNavy, edge: C.ink },
} satisfies Record<string, Material>;
/** Deterministic "is this window lit" pattern. */
const lit = (i: number, j: number) => (i * 7 + j * 13 + i * j) % 5 < 2;
/** Grid of windows on a front (+y) face. */
function windowsFront(
  c: IsoCanvas,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
  step: number,
  row: number,
  w = step * 0.5,
  h = row * 0.55,
  dark: string = C.slate,
) {
  let i = 0;
  for (let u = x0; u + w <= x1 + 1e-6; u += step, i++) {
    let j = 0;
    for (let z = z0; z + h <= z1; z += row, j++)
      c.faceX(u, y, w, z, h, lit(i, j) ? C.windowLit : dark);
  }
}
/** Grid of windows on a side (+x) face. */
function windowsSide(
  c: IsoCanvas,
  x: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  step: number,
  row: number,
  w = step * 0.5,
  h = row * 0.55,
  dark: string = C.charcoal,
) {
  let i = 0;
  for (let v = y0; v + w <= y1 + 1e-6; v += step, i++) {
    let j = 0;
    for (let z = z0; z + h <= z1; z += row, j++)
      c.faceY(x, v, w, z, h, lit(i + 3, j) ? C.yellowDark : dark);
  }
}
/** A setback tier of the art-deco tower: limestone box with piers and windows. */
function decoTier(c: IsoCanvas, o: number, size: number, z: number, h: number) {
  c.box(o, o, size, size, h, NM.limestone, z);
  // Evening: whole floors lit warm or cool, the rest dark glass.
  nightWindowsFront(
    c,
    o + 0.08,
    o + size - 0.05,
    o + size + 0.002,
    z + 4,
    z + h - 3,
    0.22,
    6,
    0.1,
    4,
    z,
  );
  nightWindowsSide(
    c,
    o + size + 0.002,
    o + 0.08,
    o + size - 0.05,
    z + 4,
    z + h - 3,
    0.22,
    6,
    0.1,
    4,
    z,
  );
  // Piers between window columns catch the light; spandrels sit in shade.
  for (let u = o + 0.2; u < o + size - 0.1; u += 0.22) {
    c.edge(
      [u, o + size + 0.003, z + 3],
      [u, o + size + 0.003, z + h - 3],
      C.limestoneLight,
    );
    c.edge(
      [o + size + 0.003, u, z + 3],
      [o + size + 0.003, u, z + h - 3],
      C.limestone,
    );
  }
  for (let zz = z + 3; zz < z + h - 3; zz += 6) {
    c.edge(
      [o + 0.05, o + size + 0.003, zz],
      [o + size, o + size + 0.003, zz],
      C.limestoneDark,
    );
    c.edge(
      [o + size + 0.003, o + 0.05, zz],
      [o + size + 0.003, o + size, zz],
      C.warmGreyDark,
    );
  }
  // Lit parapet and a soft shadow where the next tier sits on this roof.
  c.edge([o, o + size, z + h], [o + size, o + size, z + h], C.limestoneLight);
  c.edge(
    [o, o + size, z + h - 1],
    [o + size, o + size, z + h - 1],
    C.limestoneLight,
  );
  c.faceX(o, o + size + 0.004, size, z + h - 3, 1, C.limestoneDark);
}
/** Checkerboard a colour over part of a front (+y) face: soft gradients. */
function ditherFront(
  c: IsoCanvas,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
  col: string,
  density = 0.5,
) {
  const [sx0] = c.at(x0, y, 0),
    [sx1] = c.at(x1, y, 0);
  for (let px = Math.ceil(sx0); px < sx1; px++) {
    const u = x0 + (px - sx0) / 16,
      [, top] = c.at(u, y, z1),
      [, bottom] = c.at(u, y, z0);
    for (let py = Math.ceil(top); py < bottom; py++) {
      const k = (py - top) / Math.max(1, bottom - top);
      const on =
        density >= 0.5
          ? (px + py) % 2 === 0 || ((px + py) % 4 === 1 && k < density - 0.5)
          : px % 2 === 0 && py % 2 === 0 && k < density * 2;
      if (on && c.p.data[(py * c.p.width + px) * 4 + 3]) c.p.pixel(px, py, col);
    }
  }
}
/** A waving flag on a pole. `paint(x, y)` returns the colour of flag pixel (x, y). */
function flag(
  c: IsoCanvas,
  f: number,
  paint: (x: number, y: number, w: number, h: number) => string,
  w = 34,
  h = 21,
) {
  const [px, py] = c.at(0.25, 0.25, 0);
  c.p.rect(px, py - 84, 2, 84, C.silver);
  c.p.rect(px + 1, py - 84, 1, 84, C.steelDark);
  c.p.rect(px - 2, py - 2, 6, 2, C.steelDark);
  c.p.ellipse(px + 1, py - 86, 2.5, 2.5, C.gold);
  const top = py - 82;
  for (let x = 0; x < w; x++) {
    const phase = Math.sin(x * 0.28 + f * Math.PI),
      wave = Math.round(phase * 2 * (x / w));
    for (let y = 0; y < h; y++)
      c.p.pixel(px + 2 + x, top + y + wave, paint(x, y, w, h));
    // A darker hem in the folds.
    if (phase < -0.6) c.p.pixel(px + 2 + x, top + h - 1 + wave, C.edge);
  }
}
const nyc: Record<string, Spec> = {
  'm-skyscraper-deco': {
    footprint: [3, 3],
    h: 292,
    draw(c) {
      c.box(0, 0, 3, 3, 34, NM.limestone);
      // Ground-floor lobby, lit warm behind the glass.
      c.faceX(0.3, 3.002, 2.4, 2, 20, CN.warm);
      c.faceX(0.3, 3.002, 2.4, 16, 4, CN.amber);
      c.faceY(3.002, 0.3, 2.4, 2, 20, CN.warmSide);
      for (let u = 0.45; u < 2.7; u += 0.45) {
        c.faceX(u, 3.003, 0.06, 2, 20, C.limestoneLight);
        c.faceY(3.003, u, 0.06, 2, 20, C.limestone);
      }
      c.faceX(0.3, 3.003, 2.4, 14, 1, C.limestoneLight);
      c.faceY(3.003, 0.3, 2.4, 14, 1, C.limestone);
      c.edge([0.35, 3.004, 4], [0.7, 3.004, 18], C.lamp);
      c.faceX(0, 3.003, 3, 26, 3, C.gold);
      decoTier(c, 0.25, 2.5, 34, 104);
      decoTier(c, 0.55, 1.9, 138, 58);
      decoTier(c, 0.85, 1.3, 196, 36);
      // Crown with glowing bands, then the needle spire.
      c.box(1.1, 1.1, 0.8, 0.8, 22, NM.limestone, 232);
      for (let z = 236; z < 252; z += 5) {
        c.faceX(1.12, 1.902, 0.76, z, 2, C.windowLit);
        c.faceY(1.902, 1.12, 0.76, z, 2, C.yellow);
      }
      c.cylinder(1.5, 1.5, 254, 4, 14, [
        C.limestoneLight,
        C.limestone,
        C.limestoneDark,
      ]);
      const [mx, my] = c.at(1.5, 1.5, 268);
      c.p.rect(mx - 1, my - 22, 2, 22, C.silver);
      c.p.rect(mx, my - 22, 1, 22, C.steelDark);
      aircraftLight(c, 1.5, 1.5, 292);
    },
  },
  'm-skyscraper-glass': {
    footprint: [3, 3],
    h: 246,
    draw(c) {
      // Night glass tower: lit window grid in deep blue glass.
      const top = nightTower(c, 0.2, 2.6, 216, 5);
      // Window-cleaning cradle hanging on two cables.
      const [g0x, g0y] = c.at(1.7, 2.9, 168),
        [t0x, t0y] = c.at(1.7, 2.9, top);
      c.line([g0x, g0y], [t0x, t0y], C.steelDark);
      c.line([g0x + 14, g0y + 7], [t0x + 14, t0y + 7], C.steelDark);
      c.box(1.65, 2.82, 0.95, 0.12, 4, M.steel, 162);
      c.edge([1.65, 2.94, 168], [2.6, 2.94, 168], C.steelLight);
      // Rooftop plant room with a lit doorway, vents and a mast.
      c.box(0.9, 0.9, 1.2, 1.2, 10, M.steel, top);
      for (let u = 1.0; u < 2.05; u += 0.15)
        c.edge([u, 2.102, top + 2], [u, 2.102, top + 8], C.slate);
      c.faceY(2.102, 1.2, 0.25, top, 6, CN.warm);
      c.box(0.35, 0.35, 0.3, 0.3, 4, M.steel, top);
      c.box(2.3, 0.4, 0.3, 0.4, 3, M.steel, top);
      const [ax, ay] = c.at(1.5, 1.5, top + 10);
      c.p.rect(ax, ay - 6, 1, 6, C.charcoal);
      aircraftLight(c, 1.5, 1.5, top + 17);
    },
  },
  'm-brownstone': {
    footprint: [4, 2],
    h: 104,
    side: true,
    draw(c) {
      c.box(0, 0, 4, 1.5, 90, NM.brownstone);
      // Dressed brownstone courses on both faces.
      coursesFront(
        c,
        0,
        4,
        1.501,
        0,
        88,
        6,
        0.5,
        C.brownstoneDark,
        C.brownstoneLight,
      );
      coursesSide(c, 4.001, 0, 1.5, 0, 88, 6, 0.5, C.brownstoneDark);
      // Bracketed cornice.
      c.box(0, 0, 4, 1.62, 6, NM.brownstone, 88);
      c.faceX(0, 1.621, 4, 88, 2, C.limestoneLight);
      for (let u = 0.05; u < 4; u += 0.25)
        c.faceX(u, 1.622, 0.1, 84, 4, C.brownstoneDark);
      c.edge([0, 1.622, 93], [4, 1.622, 93], C.brownstoneLight);
      for (let k = 0; k < 3; k++) {
        const x = 0.15 + k * 1.3;
        // Two sash windows per floor with lintels, sills and curtains.
        for (const z of [34, 56, 74])
          for (const dx of [0.15, 0.75]) {
            // Evening: about half the rooms are lit.
            const warm = cityHash(k * 2 + (dx > 0.5 ? 1 : 0), z, 3) < 0.5;
            sashFront(c, x + dx + 0.03, 1.502, 0.26, z + 1, 9, {
              frame: C.limestoneLight,
              glass: warm ? C.windowLit : C.glassDark,
              shade: warm ? C.yellowDark : C.glassDeep,
              glint: warm ? undefined : C.glassLight,
              sill: C.limestone,
              bars: true,
              inside: (k + z + dx * 4) % 3 === 0 ? C.cream : undefined,
            });
            c.faceX(x + dx - 0.02, 1.503, 0.36, z + 12, 2, C.limestone);
            c.edge(
              [x + dx - 0.02, 1.504, z + 13],
              [x + dx + 0.34, 1.504, z + 13],
              C.limestoneLight,
            );
          }
        // A window air-conditioner on an upper floor.
        const acX = x + (k % 2 ? 0.18 : 0.78),
          acZ = k === 1 ? 74 : 56;
        c.box(acX, 1.5, 0.22, 0.12, 5, M.steel, acZ + 1);
        c.faceX(acX + 0.02, 1.621, 0.18, acZ + 2, 3, C.steelDark);
        for (let g = 0; g < 3; g++)
          c.faceX(acX + 0.04 + g * 0.05, 1.622, 0.02, acZ + 2, 3, C.steel);
        // A window box of flowers on the parlour floor.
        c.box(x + 0.7, 1.5, 0.42, 0.1, 3, NM.brownstone, 31);
        for (let i = 0; i < 6; i++) {
          const [fx, fy] = c.at(x + 0.73 + i * 0.065, 1.56, 35);
          c.p.rect(fx, fy - 2, 2, 2, i % 2 ? C.leaf : C.leafDark);
          if (i % 2 === 0)
            c.p.pixel(fx, fy - 3, [C.pink, C.red, C.yellow][(i + k) % 3]);
        }
        // Stoop up to the front door, with black railings.
        for (let s2 = 0; s2 < 4; s2++) {
          c.box(
            x + 0.12,
            1.5,
            0.42,
            0.12 * (4 - s2),
            4 + s2 * 3.5,
            NM.brownstone,
          );
          c.edge(
            [x + 0.12, 1.5 + 0.12 * (4 - s2), 4 + s2 * 3.5],
            [x + 0.54, 1.5 + 0.12 * (4 - s2), 4 + s2 * 3.5],
            C.brownstoneLight,
          );
        }
        // Panelled door under a fanlight.
        c.faceX(x + 0.16, 1.502, 0.34, 16, 22, C.limestone);
        c.faceX(x + 0.18, 1.503, 0.3, 16, 18, C.woodDark);
        c.faceX(x + 0.21, 1.504, 0.1, 18, 6, C.wood);
        c.faceX(x + 0.21, 1.504, 0.1, 26, 6, C.wood);
        c.faceX(x + 0.18, 1.503, 0.3, 34, 3, C.windowLit);
        const [kx, ky] = c.at(x + 0.42, 1.505, 26);
        c.p.pixel(kx, ky, C.gold);
        for (const rx of [x + 0.12, x + 0.54]) {
          c.edge([rx, 1.98, 12], [rx, 1.5, 26], C.ink);
          c.edge([rx, 1.98, 9], [rx, 1.5, 23], C.charcoal);
          post(c, rx, 1.98, 4, 8, C.ink);
        }
        // Garden-level window with bars, and a bin by the railings.
        c.faceX(x + 0.72, 1.502, 0.36, 4, 9, k === 2 ? CN.amber : C.glassDeep);
        for (let i = 1; i < 4; i++)
          c.edge(
            [x + 0.72 + i * 0.09, 1.503, 4],
            [x + 0.72 + i * 0.09, 1.503, 13],
            C.ink,
          );
        c.cylinder(x + 1.18, 1.82, 0, 3, 7, R.dark);
      }
      windowsSide(c, 4.002, 0.2, 1.4, 34, 84, 0.45, 20, 0.22, 11);
      for (let v = 0.2; v < 1.4; v += 0.45)
        for (let z = 34; z < 84; z += 20)
          c.faceY(4.003, v - 0.02, 0.26, z - 2, 2, C.limestoneDark);
    },
  },
  'm-bodega': {
    footprint: [3, 1],
    h: 72,
    draw(c) {
      // Warm light from the shop spills onto the pavement.
      lightPool(c, 1.2, 1.05, 40, 8, 0.6);
      c.box(0, 0, 3, 0.8, 62, NM.brick);
      // Plain colour sign band above the awning (no text).
      c.faceX(0.1, 0.802, 2.8, 40, 7, C.yellow);
      c.faceX(0.1, 0.803, 2.8, 40, 1, C.yellowDark);
      windowsFront(c, 0.3, 2.8, 0.802, 50, 60, 0.6, 12, 0.3, 8);
      // Shopfront glass, lit warm, with shelves of goods behind.
      c.faceX(0.15, 0.802, 2.0, 4, 26, CN.hot);
      c.faceX(0.15, 0.802, 2.0, 24, 6, CN.amber);
      for (const z of [7, 14, 21])
        c.faceX(0.18, 0.8025, 1.94, z, 1, C.woodDark);
      for (let k = 0; k < 14; k++)
        c.faceX(
          0.2 + k * 0.14,
          0.803,
          0.08,
          8 + (k % 3) * 7,
          4,
          accents[k % accents.length],
        );
      c.faceX(2.3, 0.802, 0.5, 4, 26, C.greenDark);
      c.faceX(2.35, 0.803, 0.4, 6, 18, CN.warm);
      c.faceX(2.45, 0.804, 0.2, 4, 4, C.ink);
      // Striped awning projecting over the pavement.
      for (let i = 0; i < 10; i++) {
        const col = i % 2 ? C.white : C.red;
        c.poly(
          [
            [i * 0.3, 0.8, 38],
            [i * 0.3 + 0.3, 0.8, 38],
            [i * 0.3 + 0.3, 1.0, 33],
            [i * 0.3, 1.0, 33],
          ],
          col,
        );
        c.faceX(i * 0.3, 1.0, 0.3, 30, 3, i % 2 ? C.offwhite : C.redDark);
      }
      c.faceY(3.002, 0, 0.8, 4, 56, C.brickDark);
      // Crates of fruit and flowers on the pavement.
      const crate = (x: number, fruit: string) => {
        c.box(x, 0.84, 0.34, 0.14, 6, M.wood);
        for (let k = 0; k < 4; k++) {
          const [fx, fy] = c.at(x + 0.06 + k * 0.08, 0.9, 7);
          c.p.ellipse(fx, fy, 1.5, 1.5, fruit);
        }
      };
      crate(0.15, C.red);
      crate(0.55, C.orange);
      crate(0.95, C.yellow);
      crate(1.35, C.green);
      for (const [x, col] of [
        [1.8, C.pink],
        [2.05, C.purple],
      ] as [number, string][]) {
        c.cylinder(x, 0.92, 0, 2.5, 6, R.steel);
        c.greenery(x, 0.92, 10, 4, [C.pink, col, C.pinkDark]);
      }
    },
  },
  'm-halal-cart': {
    footprint: [2, 1],
    h: 56,
    frames: 4,
    draw(c, f) {
      for (const [x, y] of [
        [0.45, 0.78],
        [1.55, 0.78],
      ] as [number, number][]) {
        const [wx, wy] = c.at(x, y, 3);
        c.p.ellipse(wx, wy, 3, 3, C.ink);
        c.p.pixel(wx, wy, C.silver);
      }
      c.box(0.3, 0.2, 1.4, 0.55, 15, M.steel, 4);
      c.faceX(0.35, 0.752, 1.3, 8, 6, C.yellow);
      c.faceX(0.35, 0.753, 1.3, 8, 1, C.red);
      c.top(0.35, 0.25, 1.3, 0.45, 19.5, C.charcoal);
      for (let k = 0; k < 5; k++) {
        const [gx, gy] = c.at(0.5 + k * 0.25, 0.45, 20);
        c.p.rect(gx - 2, gy - 1, 4, 2, k % 2 ? C.terracotta : C.rice);
      }
      // Steam rising from the grill (animated).
      for (let k = 0; k < 4; k++) {
        const t = (f + k) % 4,
          [sx, sy] = c.at(0.6 + k * 0.25, 0.4, 24 + t * 5);
        c.p.ellipse(
          sx + (t % 2),
          sy,
          2 + t * 0.5,
          1.5 + t * 0.3,
          t > 2 ? C.pale : C.offwhite,
        );
      }
      post(c, 1.0, 0.45, 20, 20, C.steelDark, 2);
      // Big striped umbrella.
      const [ux, uy] = c.at(1.0, 0.45, 42);
      for (let k = 0; k < 8; k++) {
        const a0 = (k / 8) * Math.PI * 2,
          a1 = ((k + 1) / 8) * Math.PI * 2;
        c.p.poly(
          [
            [ux, uy - 4],
            [ux + Math.cos(a0) * 27, uy + Math.sin(a0) * 10],
            [ux + Math.cos(a1) * 27, uy + Math.sin(a1) * 10],
          ],
          [C.red, C.yellow, C.blue, C.white][k % 4],
        );
      }
      c.p.ellipse(ux, uy - 4, 2, 1, C.white);
      // Little stools for customers.
      for (const x of [0.15, 1.85]) {
        c.cylinder(x, 0.9, 0, 2, 7, R.steel);
        const [tx, ty] = c.at(x, 0.9, 8);
        c.p.ellipse(tx, ty, 3, 1.5, C.red);
      }
    },
  },
  'm-city-hall': {
    footprint: [6, 3],
    h: 150,
    draw(c) {
      const pane: Sash = {
        frame: C.pale,
        glass: C.glassDark,
        shade: C.glassDeep,
        glint: C.glassLight,
        sill: C.silver,
        bars: true,
      };
      // Wings and central block in pale stone, rusticated below the cornice.
      c.box(0, 0.8, 1.3, 1.7, 52, M.white);
      c.box(4.7, 0.8, 1.3, 1.7, 52, M.white);
      c.box(1.3, 0.5, 3.4, 2.0, 64, M.white);
      for (const x of [0, 4.7])
        coursesFront(c, x, x + 1.3, 2.501, 0, 46, 6, 0.42, C.pale, C.white);
      coursesSide(c, 6.001, 0.8, 2.5, 0, 46, 6, 0.42, C.silver);
      coursesFront(c, 1.3, 4.7, 2.501, 0, 58, 6, 0.42, C.pale, C.white);
      for (const x of [0, 4.7]) {
        c.faceX(x, 2.501, 1.3, 0, 3, C.pale);
        c.faceX(x, 2.502, 1.3, 46, 2, C.silver);
        c.faceX(x, 2.502, 1.3, 48, 4, C.white);
      }
      // A few offices still lit in the evening.
      const litPane: Sash = {
        ...pane,
        glass: C.windowLit,
        shade: C.yellowDark,
        glint: undefined,
      };
      for (const x of [0.15, 4.85])
        for (const z of [12, 32])
          for (const dx of [0, 0.5]) {
            const on = x > 1 !== (z === 12) ? dx === 0 : dx > 0;
            sashFront(c, x + dx, 2.503, 0.3, z, 12, on ? litPane : pane);
            const [ax, ay] = c.at(x + dx + 0.15, 2.504, z + 13);
            c.p.ellipse(ax + 2, ay, 3, 2.5, C.pale);
            c.p.ellipse(ax + 2, ay, 2, 1.5, C.glassDark);
            c.p.pixel(ax + 2, ay - 3, C.silver);
          }
      for (const v of [1.0, 1.5, 2.0])
        for (const z of [12, 32])
          sashSide(c, 6.003, v, 0.24, z, 12, {
            ...pane,
            frame: C.silver,
            glass: C.glassDeep,
            glint: C.glass,
          });
      // Balustrade along the roofline, with rooftop vents on the wings.
      c.faceX(1.3, 2.502, 3.4, 58, 6, C.white);
      c.edge([1.3, 2.503, 58], [4.7, 2.503, 58], C.silver);
      for (let u = 1.35; u < 4.7; u += 0.18) {
        post(c, u, 2.5, 64, 4, C.pale);
        post(c, u + 0.04, 2.5, 64, 4, C.silver);
      }
      c.faceX(1.3, 2.5, 3.4, 68, 2, C.offwhite);
      c.box(0.3, 1.0, 0.4, 0.3, 5, M.steel, 52);
      c.box(5.2, 1.1, 0.5, 0.4, 4, M.steel, 52);
      // Portico: a plain pediment and entablature on six fluted columns.
      c.faceX(2.3, 2.502, 1.4, 6, 30, C.glassDeep);
      for (let k = 0; k < 3; k++) {
        c.faceX(2.38 + k * 0.45, 2.503, 0.36, 6, 22, C.woodDark);
        c.faceX(2.42 + k * 0.45, 2.504, 0.12, 8, 18, C.wood);
        c.faceX(2.38 + k * 0.45, 2.504, 0.36, 28, 6, CN.warm);
      }
      c.box(1.6, 2.4, 2.8, 0.3, 7, M.white, 44);
      c.faceX(1.6, 2.701, 2.8, 47, 2, C.pale);
      for (let u = 1.65; u < 4.4; u += 0.16)
        c.faceX(u, 2.702, 0.08, 44, 2, C.silver);
      c.poly(
        [
          [1.55, 2.7, 51],
          [4.45, 2.7, 51],
          [3.0, 2.7, 64],
        ],
        C.white,
      );
      c.poly(
        [
          [1.85, 2.701, 52],
          [4.15, 2.701, 52],
          [3.0, 2.701, 61],
        ],
        C.pale,
      );
      c.edge([1.55, 2.702, 51], [3.0, 2.702, 64], C.white);
      c.edge([3.0, 2.702, 64], [4.45, 2.702, 51], C.silver);
      for (let k = 0; k < 6; k++) {
        const [px, py] = c.at(1.75 + k * 0.5, 2.62, 6);
        c.p.rect(px - 2, py - 38, 5, 38, C.offwhite);
        c.p.rect(px - 2, py - 38, 1, 38, C.white);
        c.p.rect(px, py - 38, 1, 38, C.pale);
        c.p.rect(px + 2, py - 38, 1, 38, C.silver);
        c.p.rect(px - 3, py - 40, 7, 2, C.white);
        c.p.rect(px - 3, py - 38, 7, 1, C.pale);
        c.p.rect(px - 3, py - 2, 7, 2, C.pale);
      }
      for (let k = 0; k < 3; k++)
        c.box(
          1.4 - k * 0.1,
          2.5 + k * 0.17,
          3.2 + k * 0.2,
          0.17,
          6 - k * 2,
          M.stone,
        );
      // Lamp posts and clipped shrubs flanking the steps.
      for (const x of [1.15, 4.85]) {
        c.box(x - 0.12, 2.7, 0.24, 0.24, 6, M.stone);
        c.greenery(x, 2.82, 10, 5, R.leaf);
      }
      for (const x of [1.45, 4.55]) {
        const [lx, ly] = c.at(x, 2.98, 0);
        c.p.rect(lx, ly - 26, 2, 26, C.charcoal);
        c.p.rect(lx - 2, ly - 31, 6, 5, C.charcoal);
        c.p.rect(lx - 1, ly - 30, 4, 3, C.lamp);
        c.p.rect(lx - 1, ly - 2, 4, 2, C.ink);
      }
      // Cupola: drum with arched lights, ribbed cap and a plain knob.
      c.cylinder(3.0, 1.5, 64, 12, 22, R.white);
      for (let k = 0; k < 5; k++) {
        const [wx, wy] = c.at(2.7 + k * 0.14, 1.5 + 0.5, 70);
        c.p.rect(wx - 1, wy - 13, 3, 12, C.pale);
        c.p.rect(wx - 1, wy - 12, 2, 10, C.windowLit);
        c.p.pixel(wx - 1, wy - 11, C.lamp);
      }
      c.cylinder(3.0, 1.5, 86, 9, 10, R.white);
      const [dx, dy] = c.at(3.0, 1.5, 96);
      c.p.ellipse(dx, dy, 9, 7, C.offwhite);
      c.p.ellipse(dx - 3, dy - 2, 4, 3, C.white);
      for (const o of [-5, 0, 5])
        c.line([dx + o, dy + 3], [dx + o / 2, dy - 6], C.pale);
      c.p.rect(dx - 1, dy - 14, 3, 8, C.pale);
      c.p.rect(dx - 2, dy - 19, 5, 5, C.gold);
      c.p.pixel(dx - 1, dy - 18, C.yellow);
    },
  },
  'm-subway-entrance': {
    footprint: [2, 1],
    h: 40,
    draw(c) {
      c.top(0.2, 0.15, 1.6, 0.7, 0, C.ink);
      for (let k = 0; k < 6; k++)
        c.edge(
          [0.25, 0.2 + k * 0.11, 0],
          [1.75, 0.2 + k * 0.11, 0],
          C.charcoal,
        );
      // Green railings round three sides.
      for (const [a, b] of [
        [
          [0.15, 0.1],
          [1.85, 0.1],
        ],
        [
          [0.15, 0.1],
          [0.15, 0.9],
        ],
        [
          [1.85, 0.1],
          [1.85, 0.9],
        ],
      ] as [[number, number], [number, number]][]) {
        c.edge(
          [...a, 12] as [number, number, number],
          [...b, 12] as [number, number, number],
          C.greenDark,
        );
        c.edge(
          [...a, 6] as [number, number, number],
          [...b, 6] as [number, number, number],
          C.greenDark,
        );
        for (let t = 0; t <= 1.001; t += 0.25)
          post(
            c,
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            0,
            12,
            C.greenDark,
          );
      }
      // Two round globe lamps on posts.
      for (const x of [0.15, 1.85]) {
        post(c, x, 0.9, 0, 30, C.greenDark, 2);
        const [gx, gy] = c.at(x, 0.9, 33);
        c.p.ellipse(gx + 1, gy, 3.5, 3.5, C.green);
        c.p.ellipse(gx, gy - 1, 1.5, 1.5, C.lime);
      }
    },
  },
  'm-taxi': {
    footprint: [2, 1],
    h: 26,
    side: true,
    draw(c) {
      for (const [x, y] of [
        [0.45, 0.8],
        [1.5, 0.8],
        [1.55, 0.22],
      ] as [number, number][]) {
        const [wx, wy] = c.at(x, y, 3);
        c.p.ellipse(wx, wy, 3.5, 2.5, C.ink);
        c.p.pixel(wx, wy, C.slate);
      }
      c.box(0.15, 0.2, 1.7, 0.6, 8, NM.taxi, 3);
      c.box(0.5, 0.26, 0.95, 0.48, 7, NM.taxi, 11);
      c.faceX(0.55, 0.742, 0.4, 12, 5, C.glassDark);
      c.faceX(1.0, 0.742, 0.4, 12, 5, C.glassDark);
      c.faceY(1.452, 0.3, 0.4, 12, 5, C.glassDeep);
      // Checker stripe along the doors.
      for (let k = 0; k < 16; k++)
        c.faceX(
          0.2 + k * 0.1,
          0.801,
          0.05,
          6 + (k % 2),
          1,
          k % 2 ? C.ink : C.white,
        );
      c.box(0.85, 0.42, 0.25, 0.16, 3, M.white, 18);
      c.faceY(1.852, 0.3, 0.12, 6, 2, C.lamp);
      c.faceY(1.852, 0.62, 0.12, 6, 2, C.lamp);
      c.faceY(1.852, 0.42, 0.18, 4, 2, C.charcoal);
    },
  },
  'm-water-tower': {
    footprint: [1, 1],
    h: 96,
    draw(c) {
      const legs: [number, number][] = [
        [0.2, 0.2],
        [0.8, 0.2],
        [0.2, 0.8],
        [0.8, 0.8],
      ];
      for (const [x, y] of legs) post(c, x, y, 0, 50, C.steelDark, 2);
      c.edge([0.2, 0.8, 8], [0.8, 0.8, 44], C.steel);
      c.edge([0.8, 0.8, 8], [0.2, 0.8, 44], C.steel);
      c.edge([0.8, 0.2, 8], [0.8, 0.8, 44], C.steelDark);
      c.edge([0.8, 0.8, 8], [0.8, 0.2, 44], C.steelDark);
      c.cylinder(
        0.5,
        0.5,
        50,
        14,
        28,
        [C.woodLight, C.wood, C.woodDark],
        C.wood,
      );
      for (let z = 54; z < 78; z += 7) {
        const [hx, hy] = c.at(0.5, 0.5, z);
        for (let i = -14; i <= 14; i++)
          c.p.pixel(
            hx + i,
            hy + Math.sqrt(Math.max(0, 1 - (i / 14) ** 2)) * 7,
            C.ink,
          );
      }
      const [tx, ty] = c.at(0.5, 0.5, 78);
      c.p.poly(
        [
          [tx - 15, ty],
          [tx + 15, ty],
          [tx, ty - 16],
        ],
        C.woodDark,
      );
      c.p.poly(
        [
          [tx - 15, ty],
          [tx, ty],
          [tx, ty - 16],
        ],
        C.wood,
      );
      c.p.ellipse(tx, ty, 15, 3, C.woodDark);
    },
  },
  'm-hydrant': {
    footprint: [0.5, 0.5],
    h: 20,
    draw(c) {
      c.cylinder(0.25, 0.25, 0, 4, 12, [C.red, C.red, C.redDark]);
      const [hx, hy] = c.at(0.25, 0.25, 12);
      c.p.ellipse(hx, hy - 1, 4, 3, C.redDark);
      c.p.ellipse(hx, hy - 2, 2, 1.5, C.red);
      c.p.rect(hx - 6, hy + 4, 3, 3, C.red);
      c.p.rect(hx + 4, hy + 4, 3, 3, C.redDark);
      c.p.rect(hx - 1, hy + 6, 3, 3, C.silver);
      c.p.pixel(hx - 2, hy + 2, C.pink);
    },
  },
  'm-newsstand': {
    footprint: [2, 1],
    h: 50,
    draw(c) {
      c.box(0.15, 0.15, 1.7, 0.7, 40, NM.green);
      c.box(0.05, 0.08, 1.9, 0.86, 4, M.dark, 40);
      c.faceX(0.4, 0.852, 1.2, 18, 14, C.ink);
      c.faceX(0.45, 0.853, 1.1, 18, 12, C.screen);
      // Rows of colourful magazines (plain colour blocks).
      for (let row = 0; row < 3; row++)
        for (let k = 0; k < 9; k++)
          c.faceX(
            0.25 + k * 0.17,
            0.854,
            0.12,
            4 + row * 5,
            4,
            accents[(k + row * 3) % accents.length],
          );
      for (let k = 0; k < 7; k++)
        c.faceX(
          0.45 + k * 0.15,
          0.854,
          0.1,
          34,
          4,
          accents[(k + 5) % accents.length],
        );
      windowsSide(c, 1.852, 0.25, 0.8, 8, 36, 0.18, 7, 0.1, 5, C.ink);
    },
  },
  'm-crosswalk': {
    footprint: [3, 1],
    h: 2,
    floor: true,
    side: true,
    draw(c) {
      for (let i = 0; i < 6; i++)
        c.top(0.08 + i * 0.5, 0.08, 0.3, 0.84, 0, C.line);
    },
  },
  /* Michigan victory rally. */
  'm-stage-base': {
    footprint: [7, 3],
    h: 10,
    floor: true,
    draw(c) {
      c.top(0, 0, 7, 3, 8, C.oak);
      for (let v = 0.25; v < 3; v += 0.25) c.edge([0, v, 8], [7, v, 8], C.wood);
      for (let u = 0.9; u < 7; u += 1.4)
        c.edge([u, 0, 8], [u, 3, 8], C.woodLight);
      c.faceX(0, 3, 7, 0, 8, C.navy);
      c.faceY(7, 0, 3, 0, 8, C.stageNavy);
      // Pleated skirt and lit board ends.
      for (let u = 0.12; u < 7; u += 0.24)
        c.edge([u, 3.001, 0], [u, 3.001, 7], C.stageNavy);
      for (let v = 0.12; v < 3; v += 0.24)
        c.edge([7.001, v, 0], [7.001, v, 7], C.ink);
      c.edge([0, 3, 8], [7, 3, 8], C.woodLight);
      c.edge([7, 0, 8], [7, 3, 8], C.wood);
      // Gaffer-taped cable runs across the boards.
      c.edge([0.6, 0.5, 8], [2.4, 1.6, 8], C.ink);
      c.edge([4.8, 0.45, 8], [6.4, 1.1, 8], C.ink);
    },
  },
  'm-stage-backdrop': {
    footprint: [7, 0.4],
    h: 122,
    draw(c) {
      c.box(0, 0, 7, 0.4, 108, M.wood);
      for (let u = 0.1; u < 7; u += 0.2)
        c.faceX(
          u,
          0.402,
          0.06,
          8,
          98,
          Math.round(u * 5) % 2 ? C.woodDark : C.woodLight,
        );
      c.faceX(0, 0.403, 7, 0, 8, C.navy);
      for (let u = 0.1; u < 7; u += 0.2)
        c.edge([u, 0.404, 0], [u, 0.404, 7], C.stageNavy);
      // Navy drapes at both ends, folded.
      for (const x0 of [0, 6.4])
        for (let k = 0; k < 6; k++)
          c.faceX(
            x0 + k * 0.1,
            0.404,
            0.1,
            8,
            98,
            k % 2 ? C.stageNavy : C.navy,
          );
      // Lighting truss with stage lamps.
      c.box(-0.05, 0.1, 7.1, 0.2, 2, M.steel, 112);
      c.box(-0.05, 0.1, 7.1, 0.2, 2, M.steel, 118);
      for (let u = 0; u <= 7.01; u += 0.25) {
        c.edge([u, 0.3, 112], [u + 0.25, 0.3, 120], C.steelDark);
        c.edge([u, 0.3, 120], [u + 0.25, 0.3, 112], C.steelDark);
      }
      for (let k = 0; k < 7; k++) {
        const [lx, ly] = c.at(0.5 + k, 0.45, 108);
        c.p.rect(lx - 2, ly - 4, 5, 5, C.charcoal);
        c.p.rect(lx - 1, ly, 3, 1, C.lamp);
        c.p.pixel(lx, ly + 1, C.lampGlow);
      }
    },
  },
  'm-podium': {
    footprint: [1, 0.6],
    h: 44,
    draw(c) {
      c.box(0.2, 0.1, 0.6, 0.4, 24, M.wood);
      c.poly(
        [
          [0.15, 0.05, 24],
          [0.85, 0.05, 24],
          [0.85, 0.55, 28],
          [0.15, 0.55, 28],
        ],
        C.woodLight,
      );
      c.faceX(0.25, 0.502, 0.5, 6, 16, C.blueDark);
      c.faceX(0.28, 0.503, 0.44, 8, 12, C.blue);
      c.faceX(0.28, 0.504, 0.44, 19, 1, C.white);
      // Microphone on a gooseneck stand.
      const [mx, my] = c.at(0.5, 0.2, 28);
      c.p.rect(mx, my - 8, 1, 8, C.ink);
      c.line([mx, my - 8], [mx + 3, my - 12], C.ink);
      c.p.ellipse(mx + 4, my - 13, 2, 1.5, C.charcoal);
      c.p.pixel(mx + 3, my - 14, C.slate);
    },
  },
  'm-us-flag': {
    footprint: [0.5, 0.5],
    h: 92,
    frames: 2,
    draw(c, f) {
      flag(c, f, (x, y, w, h) => {
        // Blue canton with a grid of tiny white dots; red and white stripes.
        if (x < w * 0.42 && y < Math.round((h * 7) / 13))
          return x % 3 === 1 && y % 2 === 1 ? C.white : C.navy;
        return Math.floor((y * 13) / h) % 2 ? C.white : C.red;
      });
    },
  },
  'm-state-flag': {
    footprint: [0.5, 0.5],
    h: 92,
    frames: 2,
    draw(c, f) {
      flag(c, f, (x, y, w, h) =>
        y === 0 || y === h - 1 || x === w - 1 ? C.stageNavy : C.navy,
      );
    },
  },
  'm-speaker-stack': {
    footprint: [1, 1],
    h: 54,
    draw(c) {
      c.edge([0.5, 0.5, 12], [0.2, 0.8, 0], C.ink);
      c.edge([0.5, 0.5, 12], [0.8, 0.8, 0], C.ink);
      c.edge([0.5, 0.5, 12], [0.5, 0.2, 0], C.ink);
      for (const z of [12, 32]) {
        c.box(0.25, 0.3, 0.5, 0.4, 18, M.dark, z);
        for (const dz of [5, 13]) {
          const [sx, sy] = c.at(0.5, 0.701, z + dz);
          c.p.ellipse(sx, sy, dz === 5 ? 4 : 2.5, dz === 5 ? 3 : 2, C.slate);
          c.p.ellipse(sx, sy, 1.2, 1, C.ink);
        }
      }
    },
  },
  'm-camera-riser': {
    footprint: [2, 1],
    h: 48,
    draw(c) {
      c.box(0, 0, 2, 1, 12, M.dark);
      c.faceX(0.05, 1.002, 1.9, 2, 8, C.stageNavy);
      for (const x of [0.5, 1.4]) {
        for (const [dx, dy] of [
          [-0.15, 0.15],
          [0.15, 0.15],
          [0, -0.15],
        ])
          c.edge([x, 0.5, 30], [x + dx, 0.5 + dy, 12], C.charcoal);
        c.box(x - 0.18, 0.38, 0.36, 0.24, 9, M.dark, 30);
        c.faceY(x + 0.182, 0.42, 0.14, 32, 5, C.glassDeep);
        c.faceX(x - 0.12, 0.622, 0.12, 33, 4, C.glow);
        const [rx, ry] = c.at(x - 0.1, 0.4, 40);
        c.p.pixel(rx, ry, C.red);
      }
    },
  },
  'm-brick-building': {
    footprint: [4, 2],
    h: 128,
    side: true,
    draw(c) {
      c.box(0, 0, 4, 1.8, 114, NM.brick);
      // Mortar courses.
      for (let z = 4; z < 112; z += 3) {
        c.edge([0, 1.801, z], [4, 1.801, z], C.brickDark);
        c.edge([4.001, 0, z], [4.001, 1.8, z], C.brickDark);
      }
      // Arched upper windows.
      for (let row = 0; row < 3; row++)
        for (let k = 0; k < 6; k++) {
          const x = 0.2 + k * 0.63,
            z = 44 + row * 22;
          c.faceX(x, 1.802, 0.34, z, 13, C.cream);
          c.faceX(
            x + 0.04,
            1.803,
            0.26,
            z + 1,
            11,
            lit(k, row) ? C.windowLit : C.glassDark,
          );
          const [ax, ay] = c.at(x + 0.17, 1.803, z + 13);
          c.p.ellipse(ax + 2, ay - 1, 3, 2.5, C.cream);
          c.p.ellipse(ax + 2, ay - 1, 2, 1.5, C.glassDark);
        }
      // Stone sills under every upper window.
      for (let row = 0; row < 3; row++)
        for (let k = 0; k < 6; k++)
          c.faceX(0.17 + k * 0.63, 1.804, 0.4, 42 + row * 22, 2, C.limestone);
      windowsSide(c, 4.002, 0.2, 1.6, 44, 108, 0.4, 22, 0.2, 12, C.glassDark);
      // Fire escape down the middle bays: landings, railings and ladders.
      for (let row = 0; row < 3; row++) {
        const z = 41 + row * 22;
        c.box(1.4, 1.8, 1.3, 0.32, 1, M.dark, z);
        for (let u = 1.4; u <= 2.71; u += 0.13)
          c.edge([u, 2.12, z + 1], [u, 2.12, z + 8], C.charcoal);
        c.edge([1.4, 2.12, z + 8], [2.7, 2.12, z + 8], C.ink);
        c.edge([1.4, 2.12, z + 4], [2.7, 2.12, z + 4], C.charcoal);
        if (row > 0) {
          c.edge([2.3, 2.0, z], [2.6, 2.0, z - 21], C.ink);
          c.edge([2.4, 2.0, z], [2.7, 2.0, z - 21], C.ink);
          for (let r = 3; r < 21; r += 3)
            c.edge(
              [2.3 + r * 0.0143, 2.0, z - r],
              [2.4 + r * 0.0143, 2.0, z - r],
              C.charcoal,
            );
        }
      }
      // Shopfronts with green awnings.
      for (let k = 0; k < 3; k++) {
        const x = 0.15 + k * 1.3;
        c.faceX(x, 1.802, 1.1, 4, 24, C.glassDark);
        c.faceX(x + 0.05, 1.803, 1.0, 6, 3, C.glassLight);
        c.poly(
          [
            [x - 0.05, 1.8, 32],
            [x + 1.15, 1.8, 32],
            [x + 1.15, 2.0, 28],
            [x - 0.05, 2.0, 28],
          ],
          C.greenDark,
        );
      }
      // Cornice, parapet, rooftop air-conditioners and a small water tank.
      c.box(0, 0, 4, 1.86, 4, M.stone, 114);
      for (let u = 0.1; u < 4; u += 0.3)
        c.faceX(u, 1.861, 0.15, 112, 2, C.stoneShade);
      for (const [x, y] of [
        [0.5, 0.6],
        [1.3, 1.0],
      ]) {
        c.box(x, y, 0.45, 0.35, 6, M.steel, 118);
        for (let u = x + 0.06; u < x + 0.42; u += 0.07)
          c.edge([u, y + 0.351, 119], [u, y + 0.351, 123], C.steelDark);
      }
      c.cylinder(3.1, 0.6, 118, 6, 10, [C.woodLight, C.wood, C.woodDark]);
      const [tx, ty] = c.at(3.1, 0.6, 128);
      c.p.poly(
        [
          [tx - 6, ty],
          [tx + 6, ty],
          [tx, ty - 6],
        ],
        C.woodDark,
      );
    },
  },
};
Object.assign(objects, nyc);

/* ════════ Bangladesh block: Baitul Mukarram, a school, cricket and more ════════ */
const MB = {
  cream: {
    top: C.paper,
    front: C.cream,
    side: C.creamShade,
    edge: C.limestone,
  },
  yellow: {
    top: C.paper,
    front: C.rice,
    side: C.carpetGold,
    edge: C.limestoneDark,
  },
  green: {
    top: C.greenDark,
    front: C.carpetGreen,
    side: C.carpetGreenDark,
    edge: C.carpetGreenDark,
  },
} satisfies Record<string, Material>;
/** Pointed arch on the front (y) plane or the side (x) plane. */
function pointed(
  c: IsoCanvas,
  side: boolean,
  u: number,
  at: number,
  w: number,
  z: number,
  h: number,
  frame: string,
  fill: string,
  shade: string = C.ink,
  rim = 0.07,
) {
  const pt = (a: number, zz: number, d = 0): [number, number, number] =>
      side ? [at + d, a, zz] : [a, at + d, zz],
    spring = z + h * 0.62;
  c.poly(
    [
      pt(u - rim, z),
      pt(u + w + rim, z),
      pt(u + w + rim, spring),
      pt(u + w / 2, z + h + 3),
      pt(u - rim, spring),
    ],
    frame,
  );
  c.poly(
    [
      pt(u, z, 0.001),
      pt(u + w, z, 0.001),
      pt(u + w, spring, 0.001),
      pt(u + w / 2, z + h, 0.001),
      pt(u, spring, 0.001),
    ],
    fill,
  );
  // Reveal shadow down the left jamb and under the left curve.
  c.edge(pt(u + 0.02, z, 0.002), pt(u + 0.02, spring, 0.002), shade);
  c.edge(pt(u + 0.02, spring, 0.002), pt(u + w / 2, z + h - 1, 0.002), shade);
}
/** Jali: a small pierced-stone lattice panel on the front plane. */
function jali(
  c: IsoCanvas,
  u: number,
  at: number,
  w: number,
  z: number,
  h: number,
  stone: string,
  hole: string,
) {
  c.faceX(u, at, w, z, h, stone);
  const [x0, y0] = c.at(u, at + 0.001, z + h),
    [x1] = c.at(u + w, at, z);
  for (let x = Math.ceil(x0) + 1; x < x1 - 1; x++)
    for (let y = 1; y < h - 1; y++) {
      const dy = Math.round((x - x0) / 2);
      if ((x + y) % 3 === 0 || (x - y) % 3 === 0)
        c.p.pixel(x, y0 + y + dy, hole);
    }
}
const bangladesh: Record<string, Spec> = {
  'm-baitul-mukarram': {
    footprint: [8, 8],
    h: 178,
    draw(c) {
      const H = 166,
        x0 = 0.3,
        w = 7.4,
        front = x0 + w,
        side = x0 + w;
      // Plinth, then the plain cube.
      c.box(x0 - 0.1, x0 - 0.1, w + 0.2, w + 0.2, 6, MB.cream);
      c.box(x0, x0, w, w, H, MB.cream);
      c.faceX(x0, front + 0.001, w, 0, 6, C.creamShade);
      c.faceY(side + 0.001, x0, w, 0, 6, C.limestone);
      // Weathering: faint vertical streaks below the roof line.
      for (let k = 0; k < 9; k++) {
        const u = x0 + 0.4 + k * 0.82;
        c.faceX(u, front + 0.001, 0.05, 60 + (k % 3) * 12, 70, C.paper);
        c.faceY(side + 0.001, u, 0.05, 70 + (k % 2) * 10, 60, C.limestoneLight);
      }
      // The three black bands across the upper part of both faces.
      for (const z of [H - 22, H - 32, H - 42]) {
        c.faceX(x0, front + 0.002, w, z, 2, C.ink);
        c.faceY(side + 0.002, x0, w, z, 2, C.ink);
        c.faceX(x0, front + 0.002, w, z + 2, 1, C.creamShade);
      }
      // Rows of slim slit windows low on each face, and a grille band.
      for (let k = 0; k < 14; k++) {
        const u = x0 + 0.3 + k * 0.5;
        for (const z of [14, 34]) {
          c.faceX(u, front + 0.003, 0.12, z, 12, C.charcoal);
          c.faceX(u, front + 0.004, 0.04, z + 9, 3, C.slate);
          c.faceY(side + 0.003, u, 0.12, z, 12, C.ink);
        }
      }
      jali(
        c,
        x0 + 0.4,
        front + 0.003,
        w - 0.8,
        54,
        8,
        C.creamShade,
        C.limestone,
      );
      // Roof: a low parapet round an open light well.
      c.top(x0 + 0.5, x0 + 0.5, w - 1, w - 1, H, C.creamShade);
      c.top(x0 + 1.4, x0 + 1.4, w - 2.8, w - 2.8, H, C.limestone);
      c.faceX(x0 + 1.4, x0 + 1.4, w - 2.8, H - 10, 10, C.limestoneDark);
      for (let k = 0; k < 7; k++) {
        const u = x0 + 1.6 + k * 0.62;
        c.faceX(u, x0 + 1.401, 0.3, H - 9, 7, C.charcoal);
      }
      for (const [u, v] of [
        [x0, x0],
        [x0, front - 0.25],
        [front - 0.25, x0],
        [front - 0.25, front - 0.25],
      ])
        c.box(u, v, 0.25, 0.25, 6, MB.cream, H);
      c.edge([x0, front, H], [front, front, H], C.white);
      c.edge([front, x0, H], [front, front, H], C.paper);
      c.box(x0 + 5.6, x0 + 0.8, 0.6, 0.5, 6, M.steel, H);
      c.box(x0 + 0.8, x0 + 5.8, 0.4, 0.4, 4, M.steel, H);
    },
  },
  'm-bm-gate': {
    footprint: [5, 2],
    h: 92,
    draw(c) {
      const f = 1.8;
      c.box(0.2, 0.3, 4.6, 1.5, 70, MB.cream);
      c.faceX(0.2, f + 0.001, 4.6, 0, 4, C.creamShade);
      // Plain panel above the main arch (left blank on purpose).
      c.faceX(1.5, f + 0.001, 2.0, 52, 12, C.creamShade);
      c.faceX(1.55, f + 0.002, 1.9, 53, 10, C.cream);
      // The great arch with its deep teal-blue hall and inner arches.
      pointed(c, false, 1.75, f + 0.001, 1.5, 0, 48, C.creamShade, C.deepTeal);
      c.faceX(1.8, f + 0.003, 1.4, 0, 26, C.tealDark);
      for (let k = 0; k < 3; k++)
        pointed(
          c,
          false,
          1.85 + k * 0.45,
          f + 0.004,
          0.32,
          2,
          20,
          C.cream,
          C.charcoal,
          C.ink,
          0.05,
        );
      c.faceX(1.8, f + 0.005, 1.4, 0, 2, C.slate);
      // Two smaller arches either side, and one on the side wall.
      for (const u of [0.55, 3.55])
        pointed(c, false, u, f + 0.001, 0.9, 0, 32, C.creamShade, C.deepTeal);
      for (const u of [0.62, 3.62])
        pointed(
          c,
          false,
          u,
          f + 0.003,
          0.76,
          0,
          14,
          C.cream,
          C.charcoal,
          C.ink,
          0.04,
        );
      pointed(c, true, 0.7, 4.801, 0.7, 0, 30, C.limestone, C.tealDark);
      // Flat roof edge with small lamps.
      c.faceX(0.2, f + 0.002, 4.6, 66, 4, C.paper);
      c.edge([0.2, f + 0.003, 70], [4.8, f + 0.003, 70], C.white);
      for (const u of [0.5, 4.4]) {
        const [lx, ly] = c.at(u, 1.6, 70);
        c.p.rect(lx, ly - 9, 2, 9, C.charcoal);
        c.p.rect(lx - 1, ly - 12, 4, 3, C.lamp);
      }
    },
  },
  'm-bm-arcade': {
    footprint: [7, 1.5],
    h: 62,
    draw(c) {
      const f = 1.4;
      c.box(0.05, 0.2, 6.9, 1.2, 46, M.white);
      c.faceX(0.05, f + 0.001, 6.9, 0, 4, C.pale);
      for (let k = 0; k < 9; k++) {
        const u = 0.2 + k * 0.75;
        if (k % 4 === 0) {
          // Lattice windows between groups of open arches.
          pointed(
            c,
            false,
            u,
            f + 0.001,
            0.5,
            6,
            28,
            C.pale,
            C.stone,
            C.stoneLine,
          );
          jali(c, u + 0.05, f + 0.002, 0.4, 8, 18, C.stone, C.stoneLine);
        } else {
          pointed(c, false, u, f + 0.001, 0.5, 0, 34, C.pale, C.charcoal);
          c.faceX(u + 0.05, f + 0.002, 0.4, 0, 3, C.slate);
        }
      }
      pointed(c, true, 0.45, 6.951, 0.5, 0, 30, C.stoneShade, C.ink);
      // Cornice and a row of small parapet blocks.
      c.faceX(0.05, f + 0.002, 6.9, 40, 3, C.offwhite);
      c.edge([0.05, f + 0.003, 43], [6.95, f + 0.003, 43], C.silver);
      for (let u = 0.1; u < 6.9; u += 0.35)
        c.box(u, 1.2, 0.18, 0.18, 4, M.white, 46);
    },
  },
  'm-bm-pavilion': {
    footprint: [2, 2],
    h: 58,
    draw(c) {
      c.box(0.25, 0.25, 1.5, 1.5, 24, MB.cream);
      pointed(c, false, 0.6, 1.751, 0.8, 0, 18, C.creamShade, C.charcoal);
      pointed(c, true, 0.6, 1.751, 0.8, 0, 18, C.limestone, C.ink);
      c.box(0.15, 0.15, 1.7, 1.7, 3, MB.cream, 24);
      // The rose-pink dome on a short drum.
      c.cylinder(1, 1, 27, 11, 3, [C.cream, C.creamShade, C.limestone]);
      const [dx, dy] = c.at(1, 1, 30);
      for (let r = 11; r > 0; r--) {
        const t = r / 11;
        c.p.ellipse(
          dx,
          dy - (1 - t) * 13,
          r,
          Math.max(1, r * 0.55),
          t > 0.75 ? C.pinkDark : C.pink,
        );
      }
      c.p.ellipse(dx - 4, dy - 9, 3, 3, C.rose);
      c.p.ellipse(dx - 4, dy - 10, 1.5, 1.5, C.white);
      c.p.rect(dx, dy - 18, 1, 5, C.limestone);
      c.p.ellipse(dx, dy - 19, 1.5, 1.5, C.paper);
    },
  },
  'm-bd-school': {
    footprint: [10, 3],
    h: 98,
    draw(c) {
      const f = 2.7,
        e = 9.8;
      // Red-brick plinth, then two storeys of pale yellow plaster.
      c.box(0.2, 0.3, 9.6, 2.4, 8, {
        top: C.brickLight,
        front: C.brick,
        side: C.brickDark,
        edge: C.brickDark,
      });
      for (let z = 2; z < 8; z += 3)
        c.faceX(0.2, f + 0.001, 9.6, z, 1, C.brickDark);
      c.box(0.2, 0.3, 9.6, 2.4, 74, MB.yellow, 8);
      // Ground floor: green doors and shuttered windows.
      for (let k = 0; k < 8; k++) {
        const u = 0.55 + k * 1.15;
        if (k === 3 || k === 4) {
          c.faceX(u, f + 0.001, 0.6, 8, 26, C.carpetGreenDark);
          c.faceX(u + 0.05, f + 0.002, 0.24, 10, 22, C.carpetGreen);
          c.faceX(u + 0.31, f + 0.002, 0.24, 10, 22, C.carpetGreen);
        } else {
          c.faceX(u, f + 0.001, 0.6, 16, 16, C.limestone);
          c.faceX(u + 0.06, f + 0.002, 0.48, 17, 14, C.screen);
          for (let b = 0; b < 4; b++)
            c.faceX(u + 0.1 + b * 0.12, f + 0.003, 0.03, 17, 14, C.steelDark);
          c.faceX(u - 0.14, f + 0.002, 0.14, 16, 16, C.carpetGreen);
          c.faceX(u + 0.6, f + 0.002, 0.14, 16, 16, C.carpetGreen);
        }
      }
      // First-floor veranda: shadowed recess, columns and a green railing.
      c.faceX(0.3, f + 0.001, 9.4, 44, 30, C.carpetGold);
      for (let k = 0; k < 8; k++) {
        const u = 0.6 + k * 1.15;
        c.faceX(u, f + 0.002, 0.5, 48, 20, C.carpetGreenDark);
        c.faceX(u + 0.04, f + 0.003, 0.42, 50, 6, C.screen);
      }
      for (let k = 0; k <= 8; k++) {
        const u = 0.25 + k * 1.17;
        c.box(u, f - 0.15, 0.16, 0.16, 30, MB.yellow, 44);
      }
      c.faceX(0.3, f + 0.004, 9.4, 50, 1, C.greenDark);
      c.faceX(0.3, f + 0.004, 9.4, 44, 1, C.greenDark);
      for (let u = 0.35; u < 9.7; u += 0.14)
        c.faceX(u, f + 0.004, 0.03, 44, 7, C.greenDark);
      c.faceX(0.2, f + 0.002, 9.6, 42, 2, C.paper);
      // Side wall windows.
      for (const v of [0.7, 1.6])
        for (const z of [16, 50]) {
          c.faceY(e + 0.001, v, 0.5, z, 14, C.carpetGreenDark);
          c.faceY(e + 0.002, v + 0.05, 0.4, z + 2, 10, C.screen);
        }
      // Parapet, a plain green board, and a water tank on the roof.
      c.faceX(0.2, f + 0.002, 9.6, 74, 8, C.cream);
      c.edge([0.2, f + 0.003, 82], [9.8, f + 0.003, 82], C.white);
      c.box(0.2, 0.3, 9.6, 0.2, 6, MB.yellow, 82);
      c.faceX(3.9, f + 0.004, 2.2, 74, 8, C.pale);
      c.faceX(3.95, f + 0.005, 2.1, 75, 6, C.carpetGreen);
      c.cylinder(8.6, 1.2, 82, 6, 10, [C.slate, C.charcoal, C.ink]);
      c.faceX(0.2, f + 0.001, 9.6, 8, 1, C.carpetGold);
    },
  },
  'm-bd-flag': {
    footprint: [0.5, 0.5],
    h: 92,
    frames: 2,
    draw(c, f) {
      flag(c, f, (x, y, w, h) =>
        (x - w * 0.45) ** 2 + (y - h / 2) ** 2 <= (h * 0.31) ** 2
          ? C.flagRed
          : C.carpetGreen,
      );
    },
  },
  'm-shapla-pond': {
    footprint: [4, 3],
    h: 12,
    draw(c) {
      c.box(0.1, 0.1, 3.8, 2.8, 4, M.stone);
      c.top(0.35, 0.35, 3.3, 2.3, 4, C.deepTeal);
      c.top(0.45, 0.45, 3.1, 2.1, 4, C.turquoise);
      for (let k = 0; k < 7; k++) {
        const [rx, ry] = c.at(
          0.8 + ((k * 0.47) % 2.8),
          0.6 + ((k * 0.71) % 1.8),
          4,
        );
        c.p.rect(rx - 3, ry, 6, 1, C.waterLight);
      }
      // Lily pads with pink and white shapla flowers.
      const pads: [number, number, string | null][] = [
        [0.9, 0.9, C.pink],
        [1.6, 1.5, null],
        [2.4, 0.8, C.white],
        [3.1, 1.6, C.pink],
        [1.1, 2.1, C.pink],
        [2.2, 2.2, null],
        [2.9, 2.5, C.white],
        [1.9, 0.7, null],
      ];
      for (const [u, v, flower] of pads) {
        const [px, py] = c.at(u, v, 4);
        c.p.ellipse(px, py, 4, 2, C.leafDark);
        c.p.ellipse(px - 1, py - 0.5, 3, 1.5, C.leaf);
        c.p.pixel(px + 2, py, C.turquoise);
        if (flower) {
          const dark = flower === C.pink ? C.pinkDark : C.pale;
          c.p.rect(px - 2, py - 3, 5, 2, flower);
          c.p.rect(px - 1, py - 5, 3, 2, flower);
          c.p.pixel(px - 2, py - 4, dark);
          c.p.pixel(px + 2, py - 4, dark);
          c.p.pixel(px, py - 3, C.yellow);
        }
      }
      c.edge([0.1, 2.9, 4], [3.9, 2.9, 4], C.ivory);
    },
  },
  'm-tea-stall': {
    footprint: [2, 1],
    h: 50,
    draw(c) {
      // Corner posts and a sagging blue tarp roof.
      for (const [u, v] of [
        [0.15, 0.15],
        [1.75, 0.15],
        [0.15, 0.85],
        [1.75, 0.85],
      ])
        post(c, u, v, 0, 36, C.woodDark);
      c.box(0.2, 0.3, 1.2, 0.55, 16, M.wood);
      for (let k = 1; k < 4; k++)
        c.faceX(0.2, 0.851, 1.2, k * 4, 1, C.woodDark);
      // Stove and kettle, glass jars of biscuits.
      c.box(0.3, 0.4, 0.3, 0.3, 5, M.dark, 16);
      const [kx, ky] = c.at(0.45, 0.55, 23);
      c.p.ellipse(kx, ky, 3, 2.5, C.steelDark);
      c.p.ellipse(kx - 1, ky - 1, 1.5, 1, C.steelLight);
      c.p.rect(kx + 3, ky - 2, 2, 1, C.steelDark);
      c.p.rect(kx - 1, ky - 4, 2, 1, C.charcoal);
      for (const [u, col] of [
        [0.8, C.yellow],
        [1.0, C.orange],
        [1.2, C.woodLight],
      ] as [number, string][]) {
        c.cylinder(u, 0.55, 16, 2.5, 6, R.glass);
        const [jx, jy] = c.at(u, 0.55, 18);
        c.p.rect(jx - 1, jy - 1, 3, 3, col);
      }
      // A bench for customers.
      c.box(1.45, 0.35, 0.4, 0.5, 6, M.oak);
      c.poly(
        [
          [0.05, 0.05, 40],
          [1.95, 0.05, 40],
          [1.95, 0.98, 33],
          [0.05, 0.98, 33],
        ],
        C.blue,
      );
      c.faceX(0.05, 0.98, 1.9, 30, 3, C.blueDark);
      for (let k = 1; k < 5; k++)
        c.edge([k * 0.38, 0.1, 40], [k * 0.38 + 0.05, 0.95, 33], C.blueDark);
    },
  },
  'm-rickshaw': {
    footprint: [2, 1],
    h: 46,
    draw(c) {
      const wheel = (u: number, v: number, r: number) => {
        const [wx, wy] = c.at(u, v, r);
        c.p.ellipse(wx, wy, r * 0.75, r, C.ink);
        c.p.ellipse(wx, wy, r * 0.75 - 1, r - 1, C.silver);
        c.p.ellipse(wx, wy, r * 0.75 - 2, r - 2, C.ink);
        c.line([wx, wy - r + 2], [wx, wy + r - 2], C.steel);
        c.line([wx - r * 0.55, wy], [wx + r * 0.55, wy], C.steel);
        c.p.pixel(wx, wy, C.gold);
      };
      wheel(1.45, 0.2, 8);
      // Frame from the front wheel to the passenger seat.
      const [fx, fy] = c.at(0.3, 0.5, 8),
        [sx, sy] = c.at(1.3, 0.5, 16);
      c.thick([fx, fy], [sx, sy], 1, C.blueDark);
      c.line([fx, fy - 10], [fx, fy], C.charcoal);
      c.line([fx - 4, fy - 12], [fx + 4, fy - 12], C.charcoal);
      const [dx, dy] = c.at(0.75, 0.5, 18);
      c.p.rect(dx - 3, dy, 6, 2, C.ink);
      c.line([dx, dy + 2], [dx + 2, dy + 8], C.charcoal);
      wheel(0.3, 0.5, 6);
      // Passenger seat with a bright cushion and a painted back panel.
      c.box(
        1.15,
        0.2,
        0.55,
        0.6,
        5,
        { top: C.red, front: C.redDark, side: C.carpet },
        13,
      );
      c.faceY(1.701, 0.2, 0.6, 18, 12, C.yellow);
      for (let k = 0; k < 4; k++) {
        const [px, py] = c.at(1.702, 0.28 + k * 0.14, 23);
        c.p.pixel(px, py, [C.pink, C.red, C.green, C.blue][k]);
        c.p.pixel(px, py - 2, C.leafDark);
        c.p.pixel(px - 1, py + 1, [C.purple, C.orange, C.pink, C.red][k]);
      }
      c.faceY(1.702, 0.2, 0.6, 18, 1, C.carpet);
      // Folding hood with stripes and a fringe of tassels.
      c.poly(
        [
          [1.15, 0.15, 24],
          [1.7, 0.15, 40],
          [1.7, 0.85, 40],
          [1.15, 0.85, 24],
        ],
        C.carpet,
      );
      c.poly(
        [
          [1.7, 0.15, 40],
          [1.75, 0.15, 18],
          [1.75, 0.85, 18],
          [1.7, 0.85, 40],
        ],
        C.carpetDark,
      );
      for (const t of [0.3, 0.6]) {
        const u = 1.15 + t * 0.55,
          z = 24 + t * 16;
        c.edge([u, 0.15, z], [u, 0.85, z], C.gold);
      }
      for (let k = 0; k < 6; k++) {
        const [tx, ty] = c.at(1.15, 0.18 + k * 0.12, 23);
        c.p.pixel(tx, ty, accents[k % accents.length]);
        c.p.pixel(tx, ty + 1, accents[(k + 3) % accents.length]);
      }
      wheel(1.45, 0.85, 8);
    },
  },
  'm-cricket-pitch': {
    footprint: [2, 8],
    h: 2,
    floor: true,
    draw(c) {
      for (let k = 0; k < 8; k++)
        c.top(
          0.4,
          0.1 + k * 0.975,
          1.2,
          0.975,
          0,
          k % 2 ? C.sand : C.sandShade,
        );
      // Wear at the ends where bowlers land and batters stand.
      for (const v of [0.6, 7.3]) c.top(0.7, v - 0.3, 0.6, 0.6, 0, C.sandDark);
      for (const v of [0.9, 7.1]) {
        c.edge([0.4, v, 0], [1.6, v, 0], C.line);
        c.edge([0.55, v - 0.5, 0], [0.55, v + 0.3, 0], C.line);
        c.edge([1.45, v - 0.5, 0], [1.45, v + 0.3, 0], C.line);
      }
      for (const v of [0.45, 7.55]) c.edge([0.6, v, 0], [1.4, v, 0], C.line);
    },
  },
  'm-stumps': {
    footprint: [1, 1],
    h: 20,
    draw(c) {
      for (const u of [0.3, 0.5, 0.7]) {
        const [px, py] = c.at(u, 0.5, 0);
        c.p.rect(px, py - 13, 1, 13, C.woodLight);
        c.p.pixel(px, py - 13, C.oak);
      }
      const [a, b] = [c.at(0.3, 0.5, 14), c.at(0.7, 0.5, 14)];
      c.line(a, b, C.wood);
    },
  },
  'm-basketball-court': {
    footprint: [8, 5],
    h: 2,
    floor: true,
    draw(c) {
      const ln = (a: [number, number], b: [number, number]) =>
        c.edge([a[0], a[1], 0], [b[0], b[1], 0], C.line);
      c.top(0.05, 0.05, 7.9, 4.9, 0, C.carpetGreen);
      c.top(0.3, 0.3, 7.4, 4.4, 0, C.terracotta);
      // Keys at both ends.
      c.top(0.3, 1.7, 1.8, 1.6, 0, C.blueDark);
      c.top(5.9, 1.7, 1.8, 1.6, 0, C.blueDark);
      ln([0.3, 0.3], [7.7, 0.3]);
      ln([0.3, 4.7], [7.7, 4.7]);
      ln([0.3, 0.3], [0.3, 4.7]);
      ln([7.7, 0.3], [7.7, 4.7]);
      ln([4, 0.3], [4, 4.7]);
      for (const [x0, x1] of [
        [0.3, 2.1],
        [5.9, 7.7],
      ]) {
        ln([x0, 1.7], [x1, 1.7]);
        ln([x0, 3.3], [x1, 3.3]);
        ln([x0 < 1 ? x1 : x0, 1.7], [x0 < 1 ? x1 : x0, 3.3]);
      }
      // Centre circle and three-point arcs.
      const arcPts = (cx: number, r: number, a0: number, a1: number) => {
        for (let t = a0; t <= a1; t += 0.05) {
          const [px, py] = c.at(cx + Math.cos(t) * r, 2.5 + Math.sin(t) * r, 0);
          c.p.pixel(px, py, C.line);
        }
      };
      arcPts(4, 0.7, 0, Math.PI * 2);
      arcPts(0.6, 2.0, -Math.PI / 2, Math.PI / 2);
      arcPts(7.4, 2.0, Math.PI / 2, (Math.PI * 3) / 2);
    },
  },
  'm-hoop': {
    footprint: [1, 1],
    h: 70,
    draw(c) {
      post(c, 0.3, 0.5, 0, 52, C.steelDark);
      post(c, 0.32, 0.5, 0, 52, C.steel);
      c.box(0.2, 0.4, 0.2, 0.2, 3, M.dark);
      c.edge([0.3, 0.5, 50], [0.55, 0.5, 50], C.steelDark);
      // Backboard facing the court, rim and net.
      c.faceY(0.55, 0.15, 0.7, 44, 18, C.white);
      c.faceY(0.551, 0.15, 0.7, 44, 1, C.silver);
      c.faceY(0.552, 0.38, 0.24, 47, 7, C.orangeDark);
      c.faceY(0.553, 0.41, 0.18, 48, 5, C.white);
      const [rx, ry] = c.at(0.75, 0.5, 46);
      for (let k = 0; k < 5; k++)
        c.line([rx - 4 + k * 2, ry], [rx - 2 + k, ry + 7], C.offwhite);
      c.line([rx - 3, ry + 4], [rx + 3, ry + 4], C.net);
      c.p.ellipse(rx, ry, 5, 2, C.orange);
      c.p.ellipse(rx, ry, 3.5, 1, C.orangeDark);
    },
  },
};
Object.assign(objects, bangladesh);

/* ════════ Stadium scenes (scene bible, batch 1) ════════ */
/** An arched opening on the +y face: a rectangle with a rounded top. */
function archX(
  c: IsoCanvas,
  x: number,
  y: number,
  w: number,
  z: number,
  h: number,
  col: string,
) {
  c.faceX(x, y, w, z, h - w * 8, col);
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps,
      half = (w / 2) * Math.sqrt(1 - t * t);
    c.faceX(
      x + w / 2 - half,
      y,
      half * 2,
      z + h - w * 8 + (i * w * 8) / steps,
      (w * 8) / steps + 0.6,
      col,
    );
  }
}
const stadiumScenes: Record<string, Spec> = {
  'm-hospital-stand': {
    // Children from the hospital ward, in light-blue gowns, behind the goal.
    // The tiers face +x so the children and their plain banner face the viewer.
    footprint: [2, 7],
    h: 66,
    frames: 2,
    period: 240,
    draw(c, f) {
      const gowns = [C.glass, C.glassLight, C.mint, C.glassDark];
      const treads: [number, number, number][] = [
        [0, 0.67, 30],
        [0.67, 0.67, 20],
        [1.33, 0.67, 10],
      ];
      for (const [x, d, z] of treads) c.box(x, 0, d, 7, z, M.concrete);
      c.faceY(2.001, 0, 7, 8, 2, C.glassDark);
      const up = f === 1;
      let n = 0;
      for (const [x, d, z] of treads)
        for (let k = 0; k < 8; k++, n++) {
          if (n === 23) continue;
          const y = 0.45 + k * 0.84,
            [px, py] = c.at(x + d * 0.5, y, z),
            skin = fanSkins[(n * 3) % 4];
          // Gown, head and hair; arms raised when the banner goes up.
          c.p.rect(px - 2, py - 10, 5, 8, gowns[n % gowns.length]);
          c.p.rect(px + 2, py - 10, 1, 8, C.glassDark);
          c.p.rect(px - 1, py - 14, 4, 4, skin);
          c.p.rect(px - 1, py - 15, 4, 1, n % 3 ? C.fanHair : C.woodDark);
          c.p.pixel(px + 2, py - 12, C.edge);
          if (up) {
            c.p.rect(px - 3, py - 17, 1, 7, skin);
            c.p.rect(px + 4, py - 17, 1, 7, skin);
          } else {
            c.p.rect(px - 3, py - 9, 1, 4, skin);
            c.p.rect(px + 4, py - 9, 1, 4, skin);
          }
        }
      // A plain white banner, no text: held low across the front, then high.
      const z0 = up ? 50 : 22,
        bh = 10;
      c.faceY(1.95, 0.6, 5.8, z0, bh, C.white);
      c.faceY(1.951, 0.6, 5.8, z0, 1, C.silver);
      c.faceY(1.951, 0.6, 5.8, z0 + bh - 2, 1, C.glass);
      c.faceY(1.951, 0.6, 5.8, z0 + 2, 1, C.glass);
      for (const y of [0.6, 6.4])
        c.edge([1.95, y, z0 - 8], [1.95, y, z0 + bh], C.woodDark);
    },
  },
  'm-village-school': {
    // A village school in Senegal: sand walls, blue shutters, a tin roof.
    footprint: [4, 2],
    h: 58,
    draw(c) {
      const sand = {
        top: C.sand,
        front: C.sand,
        side: C.sandShade,
        edge: C.sandDark,
      };
      c.box(0.2, 0.25, 3.6, 1.5, 30, sand);
      // Lower wall band, worn paint.
      c.faceX(0.2, 1.751, 3.6, 0, 4, C.clay);
      c.faceY(3.801, 0.25, 1.5, 0, 4, C.terracottaDark);
      // Blue door and shuttered windows on the front.
      c.faceX(1.75, 1.752, 0.5, 0, 20, C.blue);
      c.faceX(1.8, 1.753, 0.4, 2, 16, C.blueDark);
      for (const x of [0.5, 2.6]) {
        c.faceX(x, 1.752, 0.75, 10, 11, C.ink);
        c.faceX(x, 1.753, 0.3, 10, 11, C.blue);
        c.faceX(x + 0.45, 1.753, 0.3, 10, 11, C.blue);
      }
      c.faceY(3.802, 0.6, 0.6, 10, 11, C.blue);
      // Corrugated tin roof with a low ridge and an overhang.
      c.poly(
        [
          [0.05, 1.95, 29],
          [3.95, 1.95, 29],
          [3.95, 1.0, 40],
          [0.05, 1.0, 40],
        ],
        C.steel,
      );
      c.poly(
        [
          [0.05, 0.05, 29],
          [3.95, 0.05, 29],
          [3.95, 1.0, 40],
          [0.05, 1.0, 40],
        ],
        C.steelLight,
      );
      for (let x = 0.15; x < 3.95; x += 0.2)
        c.edge([x, 1.95, 29], [x, 1.0, 40], C.steelDark);
      c.poly(
        [
          [3.95, 0.05, 29],
          [3.95, 1.95, 29],
          [3.95, 1.0, 40],
        ],
        C.steelDark,
      );
      c.edge([0.05, 1.95, 29], [3.95, 1.95, 29], C.slate);
      // A shade tree beside the yard.
      c.box(0.1, 1.85, 0.12, 0.12, 30, M.wood);
      c.greenery(0.15, 1.9, 44, 11, R.leaf);
    },
  },
  'm-ambulance-centre': {
    // A small new ambulance station with an open garage bay.
    footprint: [4, 2],
    h: 50,
    draw(c) {
      c.box(0.15, 0.2, 3.7, 1.6, 38, M.white);
      // Wide open bay: dark garage, roller door rolled up at the top.
      c.faceX(0.4, 1.801, 2.2, 0, 28, C.charcoal);
      c.faceX(0.5, 1.802, 2.0, 0, 24, C.ink);
      c.faceX(0.4, 1.802, 2.2, 26, 2, C.silver);
      for (let z = 1; z < 24; z += 4) c.faceX(0.5, 1.803, 2.0, z, 1, C.slate);
      // Office door and window.
      c.faceX(2.95, 1.802, 0.45, 0, 18, C.glassDark);
      c.faceX(3.45, 1.802, 0.3, 9, 9, C.glass);
      // Blue band and roof parapet.
      c.faceX(0.15, 1.803, 3.7, 31, 3, C.blue);
      c.faceY(3.851, 0.2, 1.6, 31, 3, C.blueDark);
      c.box(0.15, 0.2, 3.7, 0.12, 4, M.white, 38);
      c.faceY(3.852, 0.6, 0.7, 12, 10, C.glassDark);
      // A blue lamp on the roof corner.
      const [lx, ly] = c.at(3.6, 1.6, 40);
      c.p.rect(lx - 1, ly - 3, 3, 3, C.blue);
      c.p.pixel(lx, ly - 3, C.glassLight);
    },
  },
  'm-mosque-door': {
    // A white mosque front: frame 0 dark inside, frame 1 lit for Friday prayer.
    footprint: [3, 1],
    h: 72,
    frames: 2,
    period: 240,
    draw(c, f) {
      const lit = f === 1;
      c.box(0, 0.45, 3, 0.55, 58, M.white);
      c.box(0, 0.45, 3, 0.55, 4, M.stone, 58);
      for (let x = 0.1; x < 3; x += 0.4)
        c.box(x, 0.5, 0.2, 0.45, 5, M.white, 62);
      const glow = lit ? C.windowLit : C.glassDeep,
        deep = lit ? C.lampGlow : C.ink;
      for (const x of [0.3, 2.25]) {
        archX(c, x, 1.001, 0.45, 20, 26, C.pale);
        archX(c, x + 0.05, 1.002, 0.35, 22, 22, glow);
      }
      // Tall wooden double door in an arched frame.
      archX(c, 1.05, 1.001, 0.9, 0, 40, C.pale);
      archX(c, 1.12, 1.002, 0.76, 0, 36, lit ? deep : C.woodDark);
      if (!lit) {
        c.faceX(1.14, 1.003, 0.34, 0, 28, C.wood);
        c.faceX(1.52, 1.003, 0.34, 0, 28, C.wood);
        c.faceX(1.49, 1.004, 0.02, 0, 28, C.woodDark);
      } else {
        // Doors open inward; warm light spills out.
        c.faceX(1.12, 1.003, 0.12, 0, 28, C.wood);
        c.faceX(1.76, 1.003, 0.12, 0, 28, C.wood);
        c.top(1.15, 1.0, 0.7, 0.4, 0, C.lamp);
      }
      c.box(0.9, 1.0, 1.2, 0.18, 2, M.stone);
    },
  },
  'm-tunnel': {
    // The players' tunnel: a dark mouth under a short canopy, seats above.
    footprint: [3, 2],
    h: 48,
    draw(c) {
      c.box(0, 0, 3, 1.6, 30, M.concrete);
      for (let i = 0; i < 3; i++)
        c.box(0, i * 0.45, 3, 0.45, 6, M.concrete, 30 + (2 - i) * 4);
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 8; k++) {
          const [sx, sy] = c.at(
            0.2 + k * 0.36,
            i * 0.45 + 0.25,
            36 + (2 - i) * 4,
          );
          c.p.rect(sx - 1, sy - 3, 3, 3, C.seatGrey);
        }
      // Tunnel mouth.
      c.faceX(0.8, 1.601, 1.4, 0, 22, C.charcoal);
      c.faceX(0.95, 1.602, 1.1, 0, 19, C.ink);
      c.faceX(1.2, 1.603, 0.6, 0, 15, C.ink);
      // Canopy on two posts.
      c.box(0.7, 1.6, 1.6, 0.35, 2, M.white, 22);
      for (const x of [0.75, 2.2]) c.box(x, 1.85, 0.06, 0.06, 22, M.steel);
      c.faceX(0.7, 1.951, 1.6, 22, 1, C.teal);
    },
  },
};
Object.assign(objects, stadiumScenes);

/* ════════ Cricket ground scenes (scene bible) ════════ */
const cricketScenes: Record<string, Spec> = {
  // A low presentation platform people stand on (z 10), baked into the floor.
  'm-presentation-stage': {
    footprint: [5, 2],
    h: 12,
    floor: true,
    draw(c) {
      const Z = 9;
      // Skirt on the two visible faces, with a trim band and vertical folds.
      c.faceX(0, 1.7, 5, 0, Z, C.navy);
      c.faceY(5, 0, 1.7, 0, Z, C.blueDark);
      for (let u = 0.25; u < 5; u += 0.5)
        c.edge([u, 1.7, 0], [u, 1.7, Z - 2], C.blueDark);
      for (let u = 0.25; u < 1.7; u += 0.5)
        c.edge([5, u, 0], [5, u, Z - 2], C.navy);
      c.edge([0, 1.7, Z - 1], [5, 1.7, Z - 1], C.gold);
      c.edge([5, 0, Z - 1], [5, 1.7, Z - 1], C.gold);
      c.edge([0, 1.7, 0], [5, 1.7, 0], C.ink);
      c.edge([5, 0, 0], [5, 1.7, 0], C.ink);
      // Carpeted top with a lighter border.
      c.top(0, 0, 5, 1.7, Z, C.slate);
      c.top(0.12, 0.12, 4.76, 1.46, Z, C.grey);
      for (let k = 0; k < 24; k++) {
        const [x, y] = c.at(
          0.3 + ((k * 7) % 44) / 10,
          0.25 + ((k * 11) % 12) / 10,
          Z,
        );
        c.p.pixel(x, y, C.silver);
      }
      c.edge([0, 1.7, Z], [5, 1.7, Z], C.silver);
      c.edge([5, 0, Z], [5, 1.7, Z], C.silver);
      // A front step in the middle of the long side.
      c.box(1.9, 1.7, 1.2, 0.3, 4, M.stone);
    },
  },
  // The plain backdrop along the stage's back edge: colour bands only.
  'm-presentation-backdrop': {
    footprint: [5, 0.4],
    h: 46,
    draw(c) {
      // Two slim posts and a panel standing on the stage top (z 9).
      for (const x of [0.15, 4.75]) c.box(x, 0.12, 0.1, 0.16, 44, M.steel, 0);
      c.box(0.1, 0.1, 4.8, 0.2, 34, M.white, 10);
      c.faceX(0.1, 0.301, 4.8, 36, 5, C.blueDark);
      c.faceX(0.1, 0.302, 4.8, 30, 4, C.green);
      c.faceX(0.1, 0.302, 4.8, 14, 3, C.blue);
      c.faceX(0.1, 0.302, 4.8, 11, 2, C.gold);
      c.edge([0.1, 0.303, 44], [4.9, 0.303, 44], C.silver);
    },
  },
};
Object.assign(objects, cricketScenes);

/* ════════ Nature pass: trees, plants, rocks, waterfall, ship ════════ */
// Objects defined here may replace earlier ones with the same id (m-tree).
/* ───────────── Nature pass helpers ───────────── */
/*
 * Painterly foliage, bark, rock and water in the owner's reference style:
 * canopies built from many leaf clumps, each lit from the top left over a
 * darker underside; blocky lit rocks; bright falling water over dark stone.
 * Everything is deterministic (seeded hashes), so frames and builds repeat.
 */
type Tones = readonly string[];
const FOLIAGE: Tones = [
  NC.leaf0,
  NC.leaf1,
  NC.leaf2,
  NC.leaf3,
  NC.leaf4,
  NC.leaf5,
];
const OAK: Tones = [NC.oak0, NC.oak1, NC.oak2, NC.oak3, NC.oak4, NC.oak5];
const PINE: Tones = [
  NC.pine0,
  NC.pine1,
  NC.pine2,
  NC.pine3,
  NC.pine4,
  NC.pine5,
];
const BLOSSOM: Tones = [
  NC.blossom0,
  NC.blossom1,
  NC.blossom2,
  NC.blossom3,
  NC.blossom4,
  NC.blossom5,
];
const BIRCH_LEAF: Tones = [
  NC.birch0,
  NC.birch1,
  NC.birch2,
  NC.birch3,
  NC.birch4,
  NC.leaf4,
];
const BARK: Tones = [NC.bark0, NC.bark1, NC.bark2, NC.bark3];
const ROCK: Tones = [
  NC.rock0,
  NC.rock1,
  NC.rock2,
  NC.rock3,
  NC.rock4,
  NC.rock5,
];
const MOSS: Tones = [NC.moss0, NC.moss1, NC.moss2];
const FALL: Tones = [
  NC.water0,
  NC.water1,
  NC.water2,
  NC.water3,
  NC.water4,
  NC.water5,
  NC.water6,
];
const SEA: Tones = [NC.sea0, NC.sea1, NC.sea2, NC.sea3, NC.sea4, NC.sea5];
/** 0..1 hash of integer coordinates and a seed. */
function nhash(x: number, y: number, s = 0) {
  let h = Math.imul(
    (Math.floor(x) * 374761393) ^
      (Math.floor(y) * 668265263) ^
      (s * 2246822519),
    1274126177,
  );
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const tone = (t: Tones, v: number, steps: readonly number[]) => {
  for (let i = 0; i < steps.length; i++) if (v > steps[i]) return t[i];
  return t[Math.min(steps.length, t.length - 1)];
};
type Clump = { x: number; y: number; r: number };
/** Leaf clumps filling an ellipse (screen px), sorted back (top) to front. */
function clumpsIn(
  seed: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n: number,
  rMin: number,
  rMax: number,
): Clump[] {
  const out: Clump[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + nhash(i, seed) * 0.6,
      k = Math.sqrt((i + 0.5) / n),
      r = rMin + (rMax - rMin) * nhash(i, seed, 7);
    out.push({
      x: cx + Math.cos(a) * (rx - r * 0.7) * k,
      y: cy + Math.sin(a) * (ry - r * 0.7) * k,
      r,
    });
  }
  return out.sort((p, q) => p.y - q.y);
}
/**
 * Paint leaf clumps: each clump is lit on its top-left and darkens toward a
 * shadowed lower-right rim; the whole canopy is lighter on top and darker
 * underneath. Leaf tips break the outline; a few sparkles catch the light.
 */
function paintClumps(
  c: IsoCanvas,
  clumps: Clump[],
  t: Tones,
  box: { cx: number; cy: number; rx: number; ry: number },
  seed = 0,
  extra = 0,
) {
  for (const [k, q] of clumps.entries()) {
    const lim = q.r + 2;
    for (let py = Math.floor(q.y - lim); py <= q.y + lim; py++)
      for (let px = Math.floor(q.x - lim); px <= q.x + lim; px++) {
        const dx = (px + 0.5 - q.x) / q.r,
          dy = (py + 0.5 - q.y) / q.r,
          d = Math.hypot(dx, dy),
          tip = nhash(px, py, seed + k) < 0.3 && dy < 0.4 ? 0.22 : 0;
        if (d > 1 + tip) continue;
        const local = -(dx * 0.55 + dy * 0.85),
          glob = -(
            ((q.x - box.cx) / box.rx) * 0.4 +
            ((q.y - box.cy) / box.ry) * 0.85
          );
        let v =
          local * 0.78 +
          glob * 0.55 +
          (nhash(px, py, seed) - 0.5) * 0.22 +
          extra;
        // A bright cap on the lit side, a dark rim on the shaded side, so
        // each clump reads on its own.
        if (d < 0.55 && dx + dy < -0.15) v += 0.2;
        if (d > 0.76 && dx + dy > 0.1) v -= 0.5;
        if (d > 1) v -= 0.2;
        c.p.pixel(px, py, tone(t, v, [0.78, 0.42, 0.08, -0.26, -0.6]));
      }
  }
}
/** A canopy: a dark back layer for depth, then lit clumps on top. */
function canopy(
  c: IsoCanvas,
  seed: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  t: Tones,
  n = 26,
  rMin = 6,
  rMax = 9.5,
) {
  const box = { cx, cy, rx, ry };
  paintClumps(
    c,
    clumpsIn(
      seed + 50,
      cx + 2,
      cy + 3,
      rx * 0.92,
      ry * 0.85,
      Math.round(n * 0.5),
      rMin,
      rMax,
    ),
    t,
    box,
    seed + 3,
    -0.45,
  );
  paintClumps(c, clumpsIn(seed, cx, cy, rx, ry, n, rMin, rMax), t, box, seed);
}
/** Tapered trunk with lit left side, bark streaks and root flares. */
function trunk(
  c: IsoCanvas,
  x: number,
  y: number,
  h: number,
  wBase: number,
  wTop: number,
  t: Tones = BARK,
  roots = true,
) {
  for (let j = 0; j <= h; j++) {
    const k = j / h,
      half = (wBase + (wTop - wBase) * k) / 2,
      flare = roots && j < 4 ? (4 - j) * 0.9 : 0;
    for (let i = Math.floor(x - half - flare); i <= x + half + flare; i++) {
      const u = (i + 0.5 - x) / (half + flare + 0.01);
      let v = -u * 0.8 + (nhash(i, Math.floor((y - j) / 3), 11) - 0.5) * 0.5;
      if (nhash(i, y - j, 12) < 0.06) v -= 0.6;
      c.p.pixel(i, y - j, tone(t, v, [0.45, -0.05, -0.55]));
    }
  }
}
/** A branch: a tapering stroke from (x0,y0) to (x1,y1). */
function branch(
  c: IsoCanvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  t: Tones = BARK,
) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= n; i++) {
    const k = i / n,
      r = Math.max(0.5, w * (1 - k * 0.6)),
      px = x0 + (x1 - x0) * k,
      py = y0 + (y1 - y0) * k;
    for (let dx = -r; dx <= r; dx++)
      c.p.pixel(px + dx, py, dx < 0 ? t[1] : t[2]);
  }
}
/** Grass tufts and tiny flowers on the ground around a point. */
function tufts(
  c: IsoCanvas,
  x: number,
  y: number,
  rx: number,
  seed: number,
  flowers: string[] = [],
) {
  for (let i = 0; i < 14; i++) {
    const a = nhash(i, seed) * Math.PI * 2,
      r = Math.sqrt(nhash(i, seed, 1)) * rx,
      px = Math.round(x + Math.cos(a) * r),
      py = Math.round(y + Math.sin(a) * r * 0.5);
    c.p.pixel(px, py, FOLIAGE[3]);
    c.p.pixel(px, py - 1, FOLIAGE[2]);
    if (nhash(i, seed, 2) < 0.5) c.p.pixel(px + 1, py - 2, FOLIAGE[1]);
    if (flowers.length && nhash(i, seed, 3) < 0.4)
      c.p.pixel(px, py - 2, flowers[i % flowers.length]);
  }
}
/**
 * Blocky lit rock on a marker-filled area: Voronoi cells become stones, each
 * lit on its top-left with a dark crack around it. `face` biases the tone
 * (0 top, 1 front, 2 side).
 */
function rockShade(
  px: number,
  py: number,
  face: number,
  seed: number,
  cell = 9,
  t: Tones = ROCK,
) {
  const gx = Math.floor(px / cell),
    gy = Math.floor(py / (cell * 0.75));
  let d1 = 1e9,
    d2 = 1e9,
    bx = 0,
    by = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cxp = (gx + i + 0.15 + nhash(gx + i, gy + j, seed) * 0.7) * cell,
        cyp =
          (gy + j + 0.15 + nhash(gx + i, gy + j, seed + 1) * 0.7) * cell * 0.75;
      const d = Math.hypot(px - cxp, (py - cyp) * 1.25);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        bx = cxp;
        by = cyp;
      } else if (d < d2) d2 = d;
    }
  const base = [0.45, 0.05, -0.4][face],
    local = -((px - bx) * 0.6 + (py - by) * 0.9) / cell;
  let v = base + local * 0.55 + (nhash(px, py, seed + 2) - 0.5) * 0.16;
  if (d2 - d1 < 1.3) v -= 0.75;
  return tone(t, v, [0.62, 0.3, 0.0, -0.3, -0.62]);
}
/**
 * Cliff stone: big angular rock masses laid in rough strata along the face
 * (so they follow the isometric slope). Each mass is lit toward its top
 * left, with a dark crack around it. `face` 1 is a lit front (constant y),
 * 2 a shaded side (constant x). `lift` brightens or darkens.
 */
function cliffShade(
  px: number,
  py: number,
  face: 1 | 2,
  seed: number,
  lift = 0,
  t: Tones = ROCK,
) {
  const r = face === 1 ? py - px * 0.5 : py + px * 0.5,
    CW = 15,
    CH = 9,
    gx = Math.floor(px / CW),
    gy = Math.floor(r / CH);
  let d1 = 1e9,
    d2 = 1e9,
    bx = 0,
    by = 0,
    id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = (gx + i + 0.1 + nhash(gx + i, gy + j, seed) * 0.8) * CW,
        cy = (gy + j + 0.3 + nhash(gx + i, gy + j, seed + 1) * 0.4) * CH,
        d = Math.hypot((px - cx) / CW, ((r - cy) / CH) * 1.1);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        bx = cx;
        by = cy;
        id = (gx + i) * 31 + gy + j;
      } else if (d < d2) d2 = d;
    }
  const local = -(((px - bx) / CW) * 0.5 + ((r - by) / CH) * 0.9);
  let v =
    (face === 1 ? 0.1 : -0.38) +
    lift +
    local * 0.45 +
    (nhash(id, 0, seed + 2) - 0.5) * 0.3 +
    (nhash(px, py, seed + 3) - 0.5) * 0.1;
  if (d2 - d1 < 0.09) v -= 0.75;
  else if (d2 - d1 < 0.16 && local > 0) v += 0.25;
  return tone(t, v, [0.62, 0.3, 0.0, -0.3, -0.62]);
}
/** Fill pixels of marker colour `m` with `shade(x, y)`. */
function recolour(
  c: IsoCanvas,
  m: string,
  shade: (x: number, y: number) => string,
) {
  const { p } = c,
    w = p.width,
    h = Math.floor(p.data.length / (4 * w)),
    [mr, mg, mb] = [
      parseInt(m.slice(1, 3), 16),
      parseInt(m.slice(3, 5), 16),
      parseInt(m.slice(5, 7), 16),
    ];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (
        p.data[i + 3] &&
        p.data[i] === mr &&
        p.data[i + 1] === mg &&
        p.data[i + 2] === mb
      )
        p.pixel(x, y, shade(x, y));
    }
}
/** Irregular rounded boulder (screen-space blob) shaded as rock with moss on top. */
function boulder(
  c: IsoCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  t: Tones = ROCK,
  moss = true,
) {
  for (let py = Math.floor(cy - ry - 2); py <= cy + ry + 1; py++)
    for (let px = Math.floor(cx - rx - 2); px <= cx + rx + 2; px++) {
      const a = Math.atan2(py - cy, px - cx),
        wob = 1 + (nhash(Math.round(a * 4), seed) - 0.5) * 0.25,
        dx = (px + 0.5 - cx) / (rx * wob),
        dy = (py + 0.5 - cy) / (ry * wob);
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      let v = -(dx * 0.6 + dy * 0.8) * 0.7 + (nhash(px, py, seed) - 0.5) * 0.2;
      if (dy > 0.55) v -= 0.35;
      const facet = nhash(Math.floor(px / 5), Math.floor(py / 4), seed + 3);
      if (facet < 0.18) v -= 0.25;
      let col = tone(t, v, [0.6, 0.3, 0.0, -0.32, -0.62]);
      if (moss && dy < -0.25 && nhash(px, py, seed + 5) < 0.75 - dy * 0.2)
        col = tone(MOSS, v + 0.2, [0.55, 0.05]);
      c.p.pixel(px, py, col);
    }
}

const nature: Record<string, Spec> = {
  // NATURE-OBJECTS
  'm-tree': {
    // A lush broadleaf: clustered canopy over a tapered trunk with roots.
    footprint: [1, 1],
    h: 92,
    pad: 30,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      tufts(c, x, y + 1, 15, 3, [C.pink, C.white, C.yellow]);
      trunk(c, x, y, 40, 8, 4);
      branch(c, x - 1, y - 24, x - 13, y - 42, 1.6);
      branch(c, x + 1, y - 22, x + 14, y - 40, 1.6);
      canopy(c, 11, x, y - 56, 28, 25, FOLIAGE, 30, 6.5, 10);
    },
  },
  'm-oak': {
    // A broad old oak: wide three-lobed canopy, thick trunk, spreading roots.
    footprint: [1, 1],
    h: 98,
    pad: 38,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      tufts(c, x, y + 2, 20, 5, [C.white, C.yellow]);
      for (const [dx, dy] of [
        [-11, 2],
        [10, 3],
        [-6, 4],
        [6, 4],
      ])
        branch(c, x + dx * 0.3, y - 1, x + dx, y + dy, 2.2);
      trunk(c, x, y, 40, 13, 8);
      branch(c, x - 3, y - 30, x - 22, y - 50, 2.6);
      branch(c, x + 3, y - 28, x + 22, y - 48, 2.6);
      branch(c, x, y - 36, x - 2, y - 60, 2.2);
      canopy(c, 21, x - 15, y - 56, 20, 17, OAK, 18, 6.5, 10);
      canopy(c, 22, x + 15, y - 55, 20, 17, OAK, 18, 6.5, 10);
      canopy(c, 23, x, y - 68, 24, 20, OAK, 24, 7, 11);
    },
  },
  'm-pine': {
    // A tall conifer in drooping tiers, darker blue-green, lit from the left.
    footprint: [1, 1],
    h: 106,
    pad: 26,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      tufts(c, x, y + 1, 12, 9);
      trunk(c, x, y, 22, 6, 4, BARK, false);
      const box = { cx: x, cy: y - 56, rx: 22, ry: 48 };
      for (let t = 0; t < 7; t++) {
        const cy = y - 18 - t * 11.5,
          half = 21 - t * 2.9,
          tierBox = { ...box };
        // Dark skirt under each tier so needles never show gaps.
        c.p.poly(
          [
            [x - half, cy + 3],
            [x + half, cy + 3],
            [x, cy - 13],
          ],
          PINE[4],
        );
        const m = Math.round(half / 3) + 2,
          clumps: Clump[] = [];
        for (let i = 0; i <= m; i++) {
          const u = -1 + (2 * i) / m;
          clumps.push({
            x: x + u * half * 0.92,
            y: cy + u * u * 4 + nhash(i, t, 4) * 1.5,
            r: 4.6 - t * 0.25,
          });
          if (i % 2 === 0 && Math.abs(u) < 0.7)
            clumps.push({
              x: x + u * half * 0.55,
              y: cy - 6,
              r: 4.2 - t * 0.2,
            });
        }
        paintClumps(
          c,
          clumps.sort((p, q) => p.y - q.y),
          PINE,
          tierBox,
          30 + t,
        );
      }
      paintClumps(c, [{ x, y: y - 100, r: 3.2 }], PINE, box, 40);
    },
  },
  'm-cherry': {
    // Cherry blossom: soft pink clusters with dark branches showing through.
    footprint: [1, 1],
    h: 90,
    pad: 32,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      // Fallen petals on the grass.
      for (let i = 0; i < 26; i++) {
        const a = nhash(i, 81) * Math.PI * 2,
          r = Math.sqrt(nhash(i, 82)) * 18;
        c.p.pixel(
          x + Math.cos(a) * r,
          y + 1 + Math.sin(a) * r * 0.5,
          i % 3 ? BLOSSOM[1] : BLOSSOM[2],
        );
      }
      const bark = [NC.bark1, NC.bark2, NC.bark3, NC.bark3] as const;
      trunk(c, x, y, 38, 7, 4, bark);
      const box = { cx: x, cy: y - 60, rx: 28, ry: 21 };
      paintClumps(
        c,
        clumpsIn(61, x + 2, y - 58, 26, 18, 14, 6, 9),
        BLOSSOM,
        box,
        62,
        -0.5,
      );
      branch(c, x - 1, y - 32, x - 20, y - 54, 1.8, bark);
      branch(c, x + 1, y - 30, x + 21, y - 52, 1.8, bark);
      branch(c, x, y - 36, x + 3, y - 70, 1.6, bark);
      branch(c, x - 10, y - 44, x - 15, y - 66, 1.1, bark);
      paintClumps(
        c,
        clumpsIn(63, x, y - 62, 28, 21, 22, 5.5, 8.5),
        BLOSSOM,
        box,
        64,
      );
    },
  },
  'm-palm': {
    // Coconut palm: a ringed trunk curving toward the light under a crown of
    // arching, drooping fronds fringed with leaflets.
    footprint: [1, 1],
    h: 104,
    pad: 40,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      tufts(c, x, y + 1, 12, 95);
      const top: [number, number] = [x + 9, y - 80],
        ctrl: [number, number] = [x - 7, y - 38],
        palmBark = [NC.palm0, NC.palm1, NC.palm2, NC.bark2] as const;
      for (let j = 0; j <= 82; j++) {
        const s = j / 82,
          bx =
            (1 - s) * (1 - s) * x + 2 * (1 - s) * s * ctrl[0] + s * s * top[0],
          by =
            (1 - s) * (1 - s) * y + 2 * (1 - s) * s * ctrl[1] + s * s * top[1],
          half = 3.9 - s * 1.7 + (j < 4 ? (4 - j) * 0.6 : 0),
          ring = j % 4 === 0 ? 1 : 0;
        for (let i = Math.floor(bx - half); i <= bx + half; i++) {
          const u = (i + 0.5 - bx) / half;
          c.p.pixel(i, by, palmBark[(u < -0.35 ? 0 : u > 0.4 ? 2 : 1) + ring]);
        }
      }
      // Fronds pointing away are drawn first and a shade darker.
      const fronds = [-160, -115, -70, -25, 15, 60, 110, 155].sort(
        (a, b) => Math.sin((a * Math.PI) / 180) - Math.sin((b * Math.PI) / 180),
      );
      const frond = (deg: number, k: number) => {
        const a = (deg * Math.PI) / 180,
          away = Math.sin(a) < 0,
          L = (away ? 27 : 33) + nhash(k, 90) * 6,
          pts: [number, number][] = [];
        for (let i = 0; i <= 40; i++) {
          const s = i / 40;
          pts.push([
            top[0] + Math.cos(a) * L * s,
            top[1] + Math.sin(a) * L * s * 0.5 - 10 * s + 25 * s * s,
          ]);
        }
        // A tapered blade: lit above the midrib, shaded below, with a
        // serrated lower edge of leaflet tips.
        const d = away ? 1 : 0;
        for (let i = 1; i < pts.length; i++) {
          const s = i / 40,
            [fx, fy] = pts[i],
            tx = fx - pts[i - 1][0],
            ty = fy - pts[i - 1][1],
            tl = Math.hypot(tx, ty) || 1;
          let nx = -ty / tl,
            ny = tx / tl;
          if (ny < 0) {
            nx = -nx;
            ny = -ny;
          }
          const w =
              1.2 + 5 * Math.sin(Math.PI * (0.12 + 0.85 * s)) * (1 - 0.4 * s),
            tip = w < 2 ? 0 : i % 3 === 0 ? 1.6 : i % 3 === 1 ? 0.6 : 0,
            edge = w * 0.65 + tip;
          for (let q = -w * 0.35; q <= edge; q += 0.5) {
            // The lowest pixel is a dark edge, so overlapping fronds part.
            const t =
              q < -0.6
                ? 1
                : q < 0.6
                  ? 2
                  : q < w * 0.45
                    ? 3
                    : q > edge - 0.5
                      ? 5
                      : 4;
            c.p.pixel(fx + nx * q, fy + ny * q, FOLIAGE[Math.min(5, t + d)]);
          }
        }
      };
      const coconuts = () => {
        for (const [dx, dy] of [
          [-3, 4],
          [2, 5],
          [5, 2],
          [-1, 1],
        ]) {
          c.p.ellipse(top[0] + dx, top[1] + dy, 2.3, 2.3, NC.coconut);
          c.p.pixel(top[0] + dx - 1, top[1] + dy - 1, NC.palm1);
        }
      };
      let nuts = false;
      for (const [k, deg] of fronds.entries()) {
        if (!nuts && Math.sin((deg * Math.PI) / 180) >= 0) {
          coconuts();
          nuts = true;
        }
        frond(deg, k);
      }
    },
  },
  'm-birch': {
    // Slim birch: white bark with dark marks under a light, airy canopy.
    footprint: [1, 1],
    h: 94,
    pad: 28,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      tufts(c, x, y + 1, 12, 7, [C.yellow, C.white]);
      const birch = [
        NC.birchBark0,
        NC.birchBark1,
        NC.birchBark1,
        NC.birchMark,
      ] as const;
      trunk(c, x, y, 56, 5, 3, birch, false);
      for (let j = 4; j < 54; j += 5)
        if (nhash(j, 33) < 0.7)
          c.p.rect(x - 2 + (j % 3), y - j, 2 + (j % 2), 1, NC.birchMark);
      branch(c, x, y - 42, x - 11, y - 60, 1, birch);
      branch(c, x, y - 46, x + 10, y - 66, 1, birch);
      canopy(c, 41, x + 1, y - 68, 20, 22, BIRCH_LEAF, 24, 4.5, 7.5);
    },
  },
  'm-bush': {
    // Flowering shrub.
    footprint: [1, 1],
    h: 30,
    pad: 20,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      tufts(c, x, y + 2, 14, 51);
      canopy(c, 61, x, y - 9, 15, 10, FOLIAGE, 16, 4.5, 6.5);
      const petals = [C.pink, C.white, BLOSSOM[1], C.white];
      for (let i = 0; i < 14; i++) {
        const a = nhash(i, 52) * Math.PI * 2,
          r = Math.sqrt(nhash(i, 53)) * 11,
          px = Math.round(x + Math.cos(a) * r),
          py = Math.round(y - 10 + Math.sin(a) * r * 0.7);
        if (py > y - 4) continue;
        c.p.pixel(px, py, petals[i % petals.length]);
        c.p.pixel(px + 1, py, petals[i % petals.length]);
        c.p.pixel(px, py - 1, NC.blossom0);
      }
    },
  },
  'm-flowers': {
    // A walkable flower patch, baked into the ground.
    footprint: [1, 1],
    h: 6,
    pad: 6,
    floor: true,
    draw(c) {
      const colours = [C.pink, C.white, C.yellow, C.purple, BLOSSOM[1]];
      for (let i = 0; i < 30; i++) {
        const [px, py] = c.at(
          0.1 + nhash(i, 71) * 0.8,
          0.1 + nhash(i, 72) * 0.8,
          0,
        );
        c.p.pixel(px, py, FOLIAGE[3]);
        c.p.pixel(px, py - 1, FOLIAGE[2]);
        if (i % 3) {
          const col = colours[i % colours.length];
          c.p.pixel(px - 1, py - 2, col);
          c.p.pixel(px + 1, py - 2, col);
          c.p.pixel(px, py - 3, col);
          c.p.pixel(px, py - 2, C.yellow);
        } else c.p.pixel(px + 1, py - 1, FOLIAGE[1]);
      }
    },
  },
  'm-rock': {
    // Mossy boulder with a smaller stone and grass at its foot.
    footprint: [1, 1],
    h: 26,
    pad: 18,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      tufts(c, x, y + 3, 15, 73, [C.yellow]);
      boulder(c, x - 1, y - 8, 12, 9.5, 71);
      boulder(c, x + 11, y - 2, 5, 4, 72, ROCK, false);
    },
  },
  'm-rocks-small': {
    // Pebbles in the grass (walkable).
    footprint: [1, 1],
    h: 6,
    pad: 6,
    floor: true,
    draw(c) {
      for (let i = 0; i < 6; i++) {
        const [px, py] = c.at(
          0.15 + nhash(i, 75) * 0.7,
          0.15 + nhash(i, 76) * 0.7,
          0,
        );
        boulder(
          c,
          px,
          py - 1,
          2 + nhash(i, 77) * 1.8,
          1.4 + nhash(i, 78),
          79 + i,
          ROCK,
          false,
        );
      }
    },
  },
  'm-waterfall': {
    // A mossy outcrop of stepped blue-grey rock. A stream crosses the top,
    // spills from a notch as a bright waterfall and churns a misty pool.
    footprint: [5, 4],
    h: 156,
    pad: 22,
    frames: 4,
    period: 12,
    detail: { grain: 0 },
    draw(c, f) {
      const { p } = c,
        W = p.width,
        H = Math.floor(p.data.length / (4 * W)),
        [ax, ay] = c.at(0, 0, 0);
      /*
       * The rock is a height map of quarter-tile columns drawn into a small
       * scene buffer (what each pixel shows, how near it is, and where on
       * that surface it lies), then painted in one pass.
       */
      const TOP = 0,
        FRONT = 1,
        SIDE = 2,
        STREAM = 3,
        FALLING = 4,
        POOL = 5;
      const kind = new Int8Array(W * H).fill(-1),
        near = new Float32Array(W * H).fill(-1e9),
        ua = new Float32Array(W * H),
        ub = new Float32Array(W * H),
        uc = new Float32Array(W * H);
      const put = (
        px: number,
        py: number,
        k: number,
        d: number,
        a: number,
        b: number,
        e = 0,
      ) => {
        px = Math.floor(px);
        py = Math.floor(py);
        if (px < 0 || py < 0 || px >= W || py >= H) return;
        const i = py * W + px;
        if (d < near[i]) return;
        near[i] = d;
        kind[i] = k;
        ua[i] = a;
        ub[i] = b;
        uc[i] = e;
      };
      const G = 0.25,
        NX = 20,
        NY = 16,
        stream = (i: number) => i >= 8 && i <= 11,
        hill = (x: number) => Math.max(0, 1 - Math.abs(x - 2.5) / 2.6) ** 0.7;
      // Where the cliff face stands (tile y), per column: rounded, with the
      // stream's notch set back between two jutting buttresses.
      const frontY = (i: number) => {
        if (stream(i)) return 2;
        const x = (i + 0.5) * G,
          r = Math.sqrt(Math.max(0, 1 - ((x - 2.5) / 2.65) ** 2)),
          v =
            Math.round(
              (1.2 + 1.05 * r + (nhash(i >> 1, 0, 140) - 0.5) * 0.3) / G,
            ) * G;
        return i >= 6 && i <= 13 ? Math.max(2.25, v) : v;
      };
      const rockH = (i: number, j: number) => {
        const x = (i + 0.5) * G,
          y = (j + 0.5) * G,
          v =
            22 +
            84 * hill(x) +
            (frontY(i) - y) * 9 +
            (nhash(i >> 1, j >> 1, 141) - 0.5) * 16;
        return Math.max(8, Math.round(v / 6) * 6);
      };
      // The stream bed steps down toward the edge in little cascades.
      const bed: number[] = [];
      for (let j = 0; j < 8; j++)
        bed.push(
          Math.min(
            j ? bed[j - 1] : 1e9,
            Math.round((Math.min(rockH(7, j), rockH(12, j)) - 8) / 4) * 4,
          ),
        );
      const cellH = (i: number, j: number) =>
        stream(i) ? bed[j] : rockH(i, j);
      for (let j = 0; j < NY; j++)
        for (let i = 0; i < NX; i++) {
          if ((j + 0.5) * G >= frontY(i)) continue;
          const h = cellH(i, j),
            water = stream(i),
            x0 = i * G,
            x1 = x0 + G,
            y0 = j * G,
            y1 = y0 + G;
          // Front face (constant y, facing the light).
          for (
            let px = Math.ceil(ax + (x0 - y1) * 16 - 0.5);
            px + 0.5 < ax + (x1 - y1) * 16;
            px++
          ) {
            const x = (px + 0.5 - ax) / 16 + y1,
              py0 = ay + (x + y1) * 8;
            for (let z = 0; z < h; z++)
              if (water) put(px, py0 - z, FALLING, x + y1, x - 2, z, h);
              else put(px, py0 - z, FRONT, x + y1, h - z, h);
          }
          // Side face (constant x, in shade).
          for (
            let px = Math.ceil(ax + (x1 - y1) * 16 - 0.5);
            px + 0.5 < ax + (x1 - y0) * 16;
            px++
          ) {
            const y = x1 - (px + 0.5 - ax) / 16,
              py0 = ay + (x1 + y) * 8;
            for (let z = 0; z < h; z++)
              if (water) put(px, py0 - z, FALLING, x1 + y, 1, z, h);
              else put(px, py0 - z, SIDE, x1 + y, h - z, h);
          }
          // Top.
          for (
            let py = Math.floor(ay + (x0 + y0) * 8 - h);
            py <= ay + (x1 + y1) * 8 - h;
            py++
          )
            for (
              let px = Math.floor(ax + (x0 - y1) * 16);
              px <= ax + (x1 - y0) * 16;
              px++
            ) {
              const X = (px + 0.5 - ax) / 16,
                S = (py + 0.5 - ay + h) / 8,
                x = (S + X) / 2,
                y = (S - X) / 2;
              if (x >= x0 && x < x1 && y >= y0 && y < y1)
                put(px, py, water ? STREAM : TOP, x + y, x, y, h);
            }
        }
      // The pool at the foot of the cliff.
      const frontAt = (x: number) =>
        frontY(Math.max(0, Math.min(NX - 1, Math.floor(x / G))));
      for (let py = ay; py <= ay + 72; py++)
        for (let px = ax - 64; px <= ax + 80; px++) {
          const X = (px + 0.5 - ax) / 16,
            S = (py + 0.5 - ay) / 8,
            x = (S + X) / 2,
            y = (S - X) / 2,
            ang = Math.atan2(y - 2.95, x - 2.5),
            e = Math.hypot((x - 2.5) / 2.05, (y - 2.95) / 0.95);
          if (
            e < 1 - nhash(Math.round(ang * 5), 0, 142) * 0.1 &&
            y > frontAt(x)
          )
            put(px, py, POOL, x + y, x, y);
        }
      // Paint.
      const MOSSY = [NC.leaf0, NC.moss0, NC.leaf2, NC.moss1, NC.moss2] as const,
        WATER = [0.72, 0.42, 0.15, -0.1, -0.35, -0.6],
        impact = c.at(2.5, 2.05, 0);
      for (let py = 0; py < H; py++)
        for (let px = 0; px < W; px++) {
          const i = py * W + px,
            k = kind[i];
          if (k < 0) continue;
          let col: string;
          if (k === TOP) {
            // Moss and grass, a bright lip where the top breaks into cliff.
            const below = py + 1 < H ? kind[i + W] : -1,
              lip = below === FRONT || below === SIDE,
              n = nhash(px >> 1, py, 150);
            col =
              nhash(px >> 2, py >> 1, 151) < 0.14 && !lip
                ? rockShade(px, py, 0, 3)
                : tone(
                    MOSSY,
                    0.25 + (n - 0.5) * 0.6 + (lip ? 0.45 : 0),
                    [0.62, 0.3, 0.0, -0.3],
                  );
          } else if (k === FRONT || k === SIDE) {
            // Blocky stone in strata; moss and a few long vines hang over
            // each ledge, with a shadow under the overhang. The rock is
            // lighter near the top and darker toward the ground.
            const depth = ua[i],
              vine = nhash(px, 0, 155) < 0.1,
              drape =
                (k === FRONT ? 2 : 1) +
                nhash(px, 0, 152) * (k === FRONT ? 8 : 4) +
                (vine ? 8 + nhash(px, 0, 156) * 26 : 0);
            if (depth < drape)
              col = tone(
                MOSS,
                (k === FRONT ? 0.35 : -0.1) - depth * (vine ? 0.02 : 0.05),
                [0.5, 0.0],
              );
            else if (depth < drape + 2 && !vine)
              col = k === FRONT ? NC.rock4 : NC.rock5;
            else
              col = cliffShade(
                px,
                py,
                k === FRONT ? 1 : 2,
                3,
                0.12 - Math.min(1, depth / Math.max(24, ub[i])) * 0.3,
              );
          } else if (k === STREAM) {
            // The stream on top, ripples drifting toward the edge.
            const ph = (((py - px / 2 - f * 4) % 16) + 16) % 16;
            col = tone(
              FALL,
              0.05 + (ph < 4 ? 0.4 : 0) + (nhash(px, py, 153 + f) - 0.5) * 0.3,
              WATER,
            );
          } else if (k === FALLING) {
            // Falling water: bright streaks flow down; the lip and the foot
            // are white with foam.
            const u = ua[i],
              z = ub[i],
              lipZ = uc[i],
              off = nhash(Math.floor(u * 10), 0, 31) * 22,
              ph = ((((z + f * 5.5 + off) % 22) + 22) % 22) / 22;
            let v =
              0.3 -
              Math.abs(u - 0.5) * 0.9 +
              (ph < 0.4 ? 0.35 : ph < 0.55 ? 0.1 : -0.15);
            if (lipZ - z < 4) v += 0.5;
            if (z < 14 && nhash(px, py, 40 + f) < 0.7 - z * 0.045) v = 1;
            col = tone(FALL, v, WATER);
          } else {
            // The pool: churning foam where the water lands, rings spreading
            // out, deeper and darker in the middle, shaded by the cliff.
            const x = ua[i],
              y = ub[i],
              rr = Math.hypot(px - impact[0], (py - impact[1]) * 2),
              e = Math.hypot((x - 2.5) / 2.05, (y - 2.95) / 0.95);
            if (rr < 14 && nhash(px, py, 20 + f) < 0.8 - rr * 0.045)
              col = FALL[0];
            else {
              const ring = (((rr - f * 2.5) % 10) + 10) % 10;
              let v =
                0.02 - (1 - e) * 0.3 + (nhash(px >> 1, py, 154) - 0.5) * 0.12;
              if (e > 0.82) v += 0.35;
              if (ring < 1.3 && rr < 64) v += 0.45 * (1 - rr / 72);
              if (y - frontAt(x) < 0.2) v -= 0.3;
              col = tone(FALL, v, [0.75, 0.45, 0.2, -0.05, -0.3, -0.6]);
            }
          }
          p.pixel(px, py, col);
        }
      // Trees and shrubs on the top, ferns over the notch.
      const onTop = (x: number, y: number) =>
        c.at(x, y, cellH(Math.floor(x / G), Math.floor(y / G)));
      {
        const [tx, ty] = onTop(1.15, 0.55);
        trunk(c, tx, ty, 10, 4, 3, BARK, false);
        for (let t = 0; t < 4; t++)
          paintClumps(
            c,
            clumpsIn(160 + t, tx, ty - 12 - t * 7, 11 - t * 2.4, 4, 6, 3, 4.5),
            PINE,
            { cx: tx, cy: ty - 22, rx: 12, ry: 16 },
            161 + t,
          );
      }
      {
        const [tx, ty] = onTop(3.95, 0.5);
        trunk(c, tx, ty, 9, 5, 3);
        canopy(c, 165, tx, ty - 18, 13, 11, FOLIAGE, 14, 4, 6);
      }
      for (const [x, y, r] of [
        [0.45, 0.9, 7],
        [1.8, 1.6, 6],
        [3.35, 1.55, 6],
        [4.55, 1.0, 7],
        [2.6, 0.35, 5],
      ] as const) {
        const [bx, by] = onTop(x, y);
        canopy(
          c,
          170 + Math.round(x * 10),
          bx,
          by - r * 0.4,
          r,
          r * 0.65,
          FOLIAGE,
          8,
          2.5,
          3.8,
        );
      }
      for (const i of [7, 12]) {
        const x = (i + 0.5) * G,
          [fx, fy] = c.at(
            x,
            frontY(i),
            rockH(i, Math.floor(frontY(i) / G) - 1),
          );
        for (let k = 0; k < 5; k++)
          branch(
            c,
            fx - 5 + k * 2.5,
            fy - 1,
            fx - 6 + k * 2.6,
            fy + 5 + (k % 2) * 4,
            0.6,
            [FOLIAGE[2], FOLIAGE[2], FOLIAGE[3], FOLIAGE[3]],
          );
      }
      // Wet stones in the pool and a ring of boulders around it.
      boulder(c, ...c.at(1.65, 2.55, 2), 4.5, 3, 181, ROCK, false);
      boulder(c, ...c.at(3.4, 2.5, 2), 3.5, 2.6, 182, ROCK, false);
      for (let t = -0.35; t < Math.PI + 0.4; t += 0.31) {
        const k = Math.round(t * 10),
          [bx, by] = c.at(
            2.5 + Math.cos(t) * 2.12,
            2.95 + Math.sin(t) * 1.0,
            1,
          );
        boulder(
          c,
          bx,
          by,
          3 + nhash(k, 0, 183) * 2.5,
          2.2 + nhash(k, 0, 184) * 1.3,
          185 + k,
        );
      }
      tufts(c, ...c.at(0.35, 3.6, 0), 12, 97, [C.white, C.yellow]);
      tufts(c, ...c.at(4.75, 3.3, 0), 12, 98, [C.pink]);
      tufts(c, ...c.at(2.5, 3.98, 0), 10, 99, [C.white]);
      // Spray and mist rising from the foot of the fall.
      for (let i = 0; i < 80; i++) {
        const a = nhash(i, 50 + f) * Math.PI,
          r = 3 + nhash(i, 51 + f) * 22;
        c.p.pixel(
          impact[0] + Math.cos(a) * r * 1.2,
          impact[1] - Math.sin(a) * r * 0.5 - 3,
          i % 3 ? FALL[0] : FALL[1],
        );
      }
    },
  },
  'm-ship': {
    // A wooden sailing ship (no flags or emblems). It sits on the planet's
    // open sea, so it carries only its own shadow, bow wave and wake; the
    // hull bobs and the sails fill between the two frames.
    footprint: [3, 2],
    h: 110,
    pad: 26,
    frames: 2,
    period: 48,
    detail: { grain: 0 },
    shadow: false,
    draw(c, f) {
      // Shadow on the water along the hull.
      for (let py = 0; py < c.p.height; py++)
        for (let px = 0; px < c.p.width; px++) {
          const [ax, ay] = c.at(0, 0, 0),
            X = (px + 0.5 - ax) / 16,
            S = (py + 0.5 - ay) / 8,
            x = (S + X) / 2,
            y = (S - X) / 2,
            e = Math.hypot((x - 1.65) / 1.5, (y - 1.05) / 0.42);
          if (e < 1 - nhash(px >> 1, py, 4 + f) * 0.15)
            c.p.pixel(px, py, e < 0.7 ? SEA[4] : SEA[3]);
        }
      const zb = f ? 1 : 0,
        HULL = 22 + zb;
      const MH = '#010301',
        MD = '#010302';
      // Hull (front side faces +y), deck on top.
      c.poly(
        [
          [0.3, 1.34, HULL],
          [2.2, 1.38, HULL],
          [2.98, 1.0, HULL + 3],
          [2.82, 1.0, 5 + zb],
          [2.2, 1.24, 3 + zb],
          [0.4, 1.22, 5 + zb],
        ],
        MH,
      );
      c.poly(
        [
          [0.3, 0.66, HULL],
          [2.2, 0.62, HULL],
          [2.98, 1.0, HULL + 3],
          [2.2, 1.38, HULL],
          [0.3, 1.34, HULL],
        ],
        MD,
      );
      // Planks run along the hull: height above the water from the pixel.
      const [hax, hay] = c.at(0, 0, 0);
      recolour(c, MH, (px, py) => {
        const z = hay + (px - hax) / 2 + 16 * 1.3 - py;
        if (z < 8 + zb) return NC.hull2;
        if (z > HULL - 2) return C.woodLight;
        return Math.floor(z) % 4 === 0 ? NC.hull1 : NC.hull0;
      });
      // Deck planks run fore and aft.
      recolour(c, MD, (px, py) => {
        const y = ((py + 0.5 - hay + HULL) / 8 - (px + 0.5 - hax) / 16) / 2;
        return (((y * 9) % 1) + 1) % 1 < 0.2 ? NC.hull0 : C.woodLight;
      });
      // Dark wale and stern castle.
      c.edge([0.32, 1.33, HULL - 4], [2.25, 1.37, HULL - 4], NC.hull2);
      c.box(
        0.28,
        0.66,
        0.55,
        0.68,
        12,
        { top: C.woodLight, front: NC.hull0, side: NC.hull1, edge: NC.hull2 },
        HULL,
      );
      for (const x of [0.35, 0.55])
        c.faceX(x, 1.341, 0.1, HULL + 4, 4, NC.hull2);
      // Masts, yards and square sails (bellied), a jib at the bow.
      const masts: [number, number][] = [
        [0.95, 92],
        [1.6, 104],
        [2.25, 90],
      ];
      for (const [mx, mh] of masts) {
        const [px, py] = c.at(mx, 1, HULL);
        c.p.rect(px - 1, py - (mh - HULL), 2, mh - HULL, NC.hull2);
        for (const [z0, z1] of [
          [HULL + 12, HULL + (mh - HULL) * 0.52],
          [HULL + (mh - HULL) * 0.56, mh - 6],
        ]) {
          const MS = '#010303';
          const belly = 0.06 + (f ? 0.02 : 0);
          c.poly(
            [
              [mx, 0.48, z0],
              [mx + belly, 1.0, z0 - 1],
              [mx, 1.52, z0],
              [mx, 1.5, z1],
              [mx + belly, 1.0, z1],
              [mx, 0.5, z1],
            ],
            MS,
          );
          const [cx, cy] = c.at(mx, 1, (z0 + z1) / 2);
          recolour(c, MS, (px2, py2) => {
            const dx = (px2 - cx) / 14,
              dy = (py2 - cy) / ((z1 - z0) / 2);
            const v = 0.5 - Math.abs(dx) * 0.5 - dy * 0.25 + (f ? 0.05 : 0);
            return tone(
              [NC.sail0, NC.sail1, NC.sail2, NC.sail3],
              v,
              [0.42, 0.15, -0.1],
            );
          });
          c.edge([mx, 0.46, z1 + 1], [mx, 1.54, z1 + 1], NC.hull2);
        }
      }
      c.poly(
        [
          [2.25, 1, 84],
          [3.05, 1, HULL + 6],
          [2.3, 1, HULL + 8],
        ],
        NC.sail1,
      );
      c.edge([2.25, 1, 84], [3.05, 1, HULL + 6], NC.sail2);
      // Rigging.
      for (const [mx, mh] of masts) {
        c.edge([mx, 1, mh], [0.3, 1, HULL + 12], NC.hull2);
        c.edge([mx, 1, mh], [Math.min(2.98, mx + 0.75), 1, HULL + 2], NC.hull2);
      }
      // Foam along the waterline, a bow wave and a widening wake.
      for (let x = 0.3; x < 2.9; x += 1 / 32) {
        const [px, py] = c.at(x, 1.3 + (x > 2.2 ? (2.2 - x) * 0.4 : 0), 2);
        if (nhash(Math.round(x * 32), 64, f) < 0.7) c.p.pixel(px, py, SEA[0]);
      }
      for (let i = 0; i < 26; i++) {
        const [px, py] = c.at(
          2.9 + nhash(i, 60 + f) * 0.3,
          1.0 + (nhash(i, 61) - 0.5) * 0.7,
          0,
        );
        c.p.pixel(px, py, SEA[0]);
        c.p.pixel(px + 1, py, SEA[1]);
      }
      for (let i = 0; i < 40; i++) {
        const k = nhash(i, 62 + f),
          [px, py] = c.at(
            0.25 - k * 0.9,
            1.0 + (nhash(i, 63) - 0.5) * (0.3 + k * 0.9),
            0,
          );
        c.p.pixel(px, py, i % 3 ? SEA[0] : SEA[1]);
      }
    },
  },
  'm-beach-rocks': {
    // Wet rocks at the water's edge: a little tide pool at their feet with
    // surf lapping in and out between the two frames.
    footprint: [2, 1],
    h: 26,
    pad: 18,
    frames: 2,
    period: 24,
    // No outline: the wet sand and pool fade into the beach.
    detail: { grain: 0, outline: false },
    shadow: false,
    draw(c, f) {
      const [gx, gy] = c.at(1, 0.5, 0);
      // Darker wet sand, then the shallow pool and its foam edge.
      for (let py = gy - 9; py <= gy + 9; py++)
        for (let px = gx - 30; px <= gx + 30; px++) {
          const dx = (px + 0.5 - gx) / 29,
            dy = (py + 0.5 - gy - 1) / 8.5,
            d = Math.hypot(dx, dy) + (nhash(px >> 1, py, 130) - 0.5) * 0.12,
            reach = f ? 0.8 : 0.7;
          if (d > 1 || (d > 0.86 && nhash(px, py, 131) < (d - 0.86) * 7))
            continue;
          let col: string = C.sandDark;
          if (d < reach) {
            const wave = Math.sin(px * 0.5 + py * 1.4 + f * Math.PI);
            col = d < reach - 0.25 ? SEA[2] : SEA[1];
            if (wave > 0.82) col = SEA[0];
          } else if (d < reach + 0.07) col = SEA[0];
          c.p.pixel(px, py, col);
        }
      const wet = [
        NC.rock1,
        NC.rock2,
        NC.rock3,
        NC.rock4,
        NC.rock5,
        NC.rock5,
      ] as const;
      boulder(c, gx - 9, gy - 5, 9, 7, 121, wet, true);
      boulder(c, gx + 9, gy - 2, 7, 5.5, 122, wet, false);
      boulder(c, gx + 1, gy + 3, 4, 3, 123, wet, false);
      // Foam around the rocks' feet and glints of wet stone.
      for (let i = 0; i < 30; i++) {
        const a = nhash(i, 124 + f) * Math.PI,
          r = 7 + nhash(i, 125 + f) * 5;
        c.p.pixel(
          gx - 9 + Math.cos(a) * r * 1.3,
          gy + 1 + Math.sin(a) * r * 0.35,
          SEA[0],
        );
      }
      c.p.pixel(gx - 13, gy - 9, NC.water0);
      c.p.pixel(gx - 12, gy - 9, NC.water0);
      c.p.pixel(gx + 6, gy - 5, NC.water0);
    },
  },
};
Object.assign(objects, nature);

/* ════════ City pass: skyline, lit windows, street furniture ════════ */
// Blue-hour city: deep blue glass, warm and cool lit windows, glowing street
// life. Signs and panels are plain colour only (no text, logos or symbols).
const CN = {
  // Night glass, deep to light.
  glass0: C.screen,
  glass1: C.navy,
  glass2: CC.nightGlass,
  glass3: CC.duskGlass,
  glass4: CC.skyGlass,
  glass5: CC.skyGlassLight,
  glass6: C.glassDark,
  // Window light.
  warm: C.windowLit,
  amber: CC.amberLit,
  hot: C.lampGlow,
  cool: C.glassLight,
  coolDim: C.glass,
  // Dimmer versions for the shaded (+x) face.
  warmSide: C.gold,
  amberSide: C.orangeDark,
  coolSide: C.glassDark,
  // Concrete for poles and the broadcast tower.
  conc0: C.concrete,
  conc1: C.silver,
  conc2: C.grey,
  conc3: C.slate,
  // Cherry blossom.
  petal0: CC.blossomLight,
  petal1: C.rose,
  petal2: CC.blossom,
  petal3: CC.blossomDeep,
  bark: C.brownstoneDark,
  barkLight: C.trunk,
  aircraft: C.red,
};
/** Deterministic 0..1 hash for window patterns. */
const cityHash = (i: number, j: number, s = 0) => {
  let h = Math.imul(i * 374761393 + j * 668265263 + s * 2147483647, 1274126177);
  h ^= h >>> 13;
  return ((Math.imul(h, 1274126177) >>> 0) % 10000) / 10000;
};
/**
 * Window state for floor j, column i: whole floors light up in bands (as in
 * an office tower at dusk), with single windows varying inside them.
 */
function windowState(i: number, j: number, seed: number) {
  const floor = cityHash(0, j, seed),
    w = cityHash(i, j, seed + 1);
  if (floor < 0.42) return w < 0.82 ? 'warm' : w < 0.92 ? 'amber' : 'dark';
  if (floor < 0.62) return w < 0.7 ? 'cool' : 'dark';
  return w < 0.14 ? 'warm' : w < 0.2 ? 'cool' : 'dark';
}
type WindowShades = { warm: string; amber: string; cool: string; dark: string };
const FRONT_LIGHTS: WindowShades = {
  warm: CN.warm,
  amber: CN.amber,
  cool: CN.cool,
  dark: CN.glass2,
};
const SIDE_LIGHTS: WindowShades = {
  warm: CN.warmSide,
  amber: CN.amberSide,
  cool: CN.coolSide,
  dark: CN.glass1,
};
/** Lit-window grid on a front (+y) face. */
function nightWindowsFront(
  c: IsoCanvas,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
  step: number,
  row: number,
  w: number,
  h: number,
  seed: number,
  shades: WindowShades = FRONT_LIGHTS,
) {
  let i = 0;
  for (let u = x0; u + w <= x1 + 1e-6; u += step, i++) {
    let j = 0;
    for (let z = z0; z + h <= z1; z += row, j++) {
      const s = windowState(i, j, seed);
      c.faceX(u, y, w, z, h, shades[s]);
      // A soft top shade inside lit windows (blinds, ceiling).
      if (s !== 'dark' && h >= 3)
        c.faceX(u, y + 0.001, w, z + h - 1, 1, darker(shades[s]));
    }
  }
}
/** Lit-window grid on a side (+x) face. */
function nightWindowsSide(
  c: IsoCanvas,
  x: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  step: number,
  row: number,
  w: number,
  h: number,
  seed: number,
  shades: WindowShades = SIDE_LIGHTS,
) {
  let i = 0;
  for (let v = y0; v + w <= y1 + 1e-6; v += step, i++) {
    let j = 0;
    for (let z = z0; z + h <= z1; z += row, j++)
      c.faceY(x, v, w, z, h, shades[windowState(i + 7, j, seed)]);
  }
}
/** Checkerboard a colour over part of a side (+x) face. */
function ditherSide(
  c: IsoCanvas,
  x: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  col: string,
) {
  const [sx0] = c.at(x, y0, 0),
    [sx1] = c.at(x, y1, 0);
  for (let px = Math.ceil(Math.min(sx0, sx1)); px < Math.max(sx0, sx1); px++) {
    const v = y0 + (sx0 - px) / 16,
      [, top] = c.at(x, v, z1),
      [, bottom] = c.at(x, v, z0);
    for (let py = Math.ceil(top); py < bottom; py++)
      if ((px + py) % 2 === 0 && c.p.data[(py * c.p.width + px) * 4 + 3])
        c.p.pixel(px, py, col);
  }
}
/** A blinking-free aircraft light: a red pixel with a soft halo. */
function aircraftLight(c: IsoCanvas, x: number, y: number, z: number) {
  const [px, py] = c.at(x, y, z);
  c.p.pixel(px - 1, py, C.redDark);
  c.p.pixel(px + 1, py, C.redDark);
  c.p.pixel(px, py - 1, C.redDark);
  c.p.pixel(px, py, CN.aircraft);
}
/** 4×4 ordered-dither thresholds, for soft light falling off on the ground. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/**
 * A soft pool of light on the ground at tile point (x, y): dense near the
 * centre, thinning out to the rim (rx, ry in screen pixels).
 */
function lightPool(
  c: IsoCanvas,
  x: number,
  y: number,
  rx: number,
  ry: number,
  strength = 0.7,
  inner: string = CN.hot,
  outer: string = CN.warm,
) {
  const [gx, gy] = c.at(x, y, 0);
  for (let j = Math.floor(-ry); j <= ry; j++)
    for (let i = Math.floor(-rx); i <= rx; i++) {
      const k = Math.sqrt((i / rx) ** 2 + (j / ry) ** 2);
      if (k > 1) continue;
      const px = Math.round(gx + i),
        py = Math.round(gy + j),
        t = BAYER[(py & 3) * 4 + (px & 3)] / 16;
      if (t < strength * (1 - k) ** 1.4)
        c.p.pixel(px, py, k < 0.4 ? inner : outer);
    }
}
/**
 * A night glass tower: a podium with a glowing lobby, a shaft of deep blue
 * glass with a lit window grid, sky reflection toward the top and floor
 * lines, and a crown.
 */
function nightTower(
  c: IsoCanvas,
  o: number,
  size: number,
  shaftH: number,
  seed: number,
  base = 3,
) {
  // Podium and warm lobby.
  const b = base;
  c.box(0, 0, b, b, 16, {
    top: C.slate,
    front: C.charcoal,
    side: C.ink,
    edge: C.ink,
  });
  c.faceX(0.25, b + 0.002, b - 0.5, 2, 11, CN.hot);
  c.faceX(0.25, b + 0.003, b - 0.5, 10, 3, CN.amber);
  for (let u = 0.25; u < b - 0.2; u += 0.42)
    c.faceX(u, b + 0.004, 0.05, 2, 11, C.charcoal);
  c.faceY(b + 0.002, 0.3, b - 0.6, 2, 11, CN.warmSide);
  c.faceY(b + 0.003, 0.3, b - 0.6, 10, 3, CN.amberSide);
  for (let v = 0.3; v < b - 0.25; v += 0.42)
    c.faceY(b + 0.004, v, 0.05, 2, 11, C.ink);
  c.box(b / 2 - 0.65, b, 1.3, 0.25, 2, M.steel, 13);
  const z0 = 16,
    z1 = z0 + shaftH,
    e = o + size;
  c.box(
    o,
    o,
    size,
    size,
    shaftH,
    {
      top: CN.glass4,
      front: CN.glass3,
      side: CN.glass1,
      edge: CN.glass0,
    },
    z0,
  );
  // Sky reflected on the upper glass; the base sits in the dusk shadow.
  ditherFront(c, o, e, e + 0.001, z1 - shaftH * 0.34, z1, CN.glass4, 0.5);
  ditherFront(c, o, e, e + 0.001, z1 - shaftH * 0.12, z1, CN.glass5, 0.5);
  ditherSide(c, e + 0.001, o, e, z1 - shaftH * 0.3, z1, CN.glass2);
  nightWindowsFront(
    c,
    o + 0.06,
    e - 0.04,
    e + 0.002,
    z0 + 4,
    z1 - 4,
    0.205,
    6,
    0.13,
    3,
    seed,
  );
  nightWindowsSide(
    c,
    e + 0.002,
    o + 0.06,
    e - 0.04,
    z0 + 4,
    z1 - 4,
    0.205,
    6,
    0.13,
    3,
    seed,
  );
  // Vertical fins catch a thin rim of light on the lit corner.
  c.edge([o, e + 0.003, z0], [o, e + 0.003, z1], CN.glass6);
  c.edge([e + 0.003, e + 0.003, z0], [e + 0.003, e + 0.003, z1], CN.glass0);
  for (let u = o + 0.615; u < e - 0.1; u += 0.615)
    c.edge([u, e + 0.003, z0 + 2], [u, e + 0.003, z1 - 2], CN.glass2);
  // Long diagonal reflections, very sparse.
  for (let k = 0; k < 3; k++) {
    const z = z0 + 30 + k * (shaftH / 3.2);
    c.edge([o + 0.1, e + 0.004, z], [o + 0.7, e + 0.004, z + 22], CN.glass5);
  }
  // Parapet light line.
  c.edge([o, e + 0.004, z1 - 1], [e, e + 0.004, z1 - 1], CN.glass6);
  c.edge([e + 0.004, o, z1 - 1], [e + 0.004, e, z1 - 1], CN.glass4);
  return z1;
}
/**
 * A concrete utility pole with two cross-arms. Wires run along x toward the
 * next pole (6 tiles away) in each direction in `dirs`, sagging to meet that
 * pole's wires at the midpoint: z(s) = z0 + 1 - 8 s (6 - s) / 9. A pole that
 * ends a run is held by a guy wire. The -side variant runs along y.
 */
function utilityPole(dirs: number[]): Spec {
  return {
    footprint: [1, 1],
    h: 98,
    pad: 58,
    side: true,
    detail: { outline: true, rim: false, grain: 0, contact: true },
    shadow: false,
    draw(c) {
      const [px, py] = c.at(0.5, 0.5, 0);
      // Concrete pole with a footing, joint rings and climbing steps.
      c.p.rect(px - 2, py - 92, 4, 92, CN.conc1);
      c.p.rect(px - 2, py - 92, 1, 92, CN.conc0);
      c.p.rect(px + 1, py - 92, 1, 92, CN.conc2);
      c.p.rect(px - 3, py - 4, 6, 4, CN.conc2);
      for (let z = 20; z < 88; z += 17)
        c.p.rect(px - 2, py - z, 4, 1, CN.conc2);
      for (let z = 30; z < 70; z += 6)
        c.p.pixel(px + (z % 12 ? 2 : -3), py - z, C.steelDark);
      // Transformer drum, a junction box and a small plain plate.
      c.cylinder(0.62, 0.5, 52, 4, 11, [CN.conc1, CN.conc2, CN.conc3]);
      c.p.rect(px + 1, py - 66, 6, 1, C.steelDark);
      c.p.rect(px + 2, py - 40, 3, 6, C.slate);
      c.p.rect(px + 2, py - 40, 1, 6, C.grey);
      c.p.rect(px - 2, py - 28, 4, 3, C.yellow);
      // Cross-arms run across the street (along y): the top one carries the
      // three power lines along x; the lower one holds the transformer leads.
      const lanes = [0.12, 0.5, 0.88];
      for (const [z, v0, v1] of [
        [86, 0.05, 0.95],
        [76, 0.3, 0.7],
      ]) {
        c.thick(c.at(0.5, v0, z), c.at(0.5, v1, z), 0.6, CN.conc2);
        c.line(c.at(0.5, v0, z + 1), c.at(0.5, v1, z + 1), CN.conc1);
      }
      for (const v of lanes) {
        const [ix, iy] = c.at(0.5, v, 87);
        c.p.rect(ix, iy - 2, 1, 2, C.offwhite);
      }
      for (const v of [0.34, 0.66]) {
        const [ix, iy] = c.at(0.5, v, 77);
        c.p.rect(ix, iy - 2, 1, 2, C.offwhite);
        c.line([ix, iy - 2], c.at(0.62, 0.5, 63), C.charcoal);
      }
      for (const z0 of [86])
        for (const v of lanes)
          for (const dir of dirs) {
            let last = c.at(0.5, v, z0 + 1);
            for (let k = 1; k <= 30; k++) {
              const s = (k / 30) * 3,
                z = z0 + 1 - (8 * s * (6 - s)) / 9,
                next = c.at(0.5 + dir * s, v, z);
              c.line(last, next, C.ink);
              last = next;
            }
          }
      // A thinner telecom cable lower down, and a guy wire at a run's end.
      for (const dir of dirs) {
        let last = c.at(0.5, 0.5, 62);
        for (let k = 1; k <= 30; k++) {
          const s = (k / 30) * 3,
            next = c.at(0.5 + dir * s, 0.5, 62 - (10 * s * (6 - s)) / 9);
          c.line(last, next, C.charcoal);
          last = next;
        }
      }
      if (dirs.length === 1) {
        const back = -dirs[0];
        c.line(c.at(0.5, 0.5, 80), c.at(0.5 + back * 0.45, 0.5, 0), C.charcoal);
        c.p.rect(...c.at(0.5 + back * 0.45, 0.5, 0), 2, 1, C.slate);
      }
    },
  };
}
/** Colourway for a shop house: walls, awning stripes, plain sign panel. */
type ShopLook = {
  wall: Material;
  trim: string;
  awning: [string, string, string];
  sign: [string, string];
  /** Which of the two upper windows are lit. */
  lit: [boolean, boolean];
};
/**
 * A narrow two-storey shop house: a warm lit shop window and door under a
 * striped awning, a plain sign panel (no text), a paper lantern, upper
 * windows with a wall air-conditioner, and rooftop plant.
 */
function awningShop(o: ShopLook): Spec {
  return {
    footprint: [2, 1],
    h: 82,
    pad: 8,
    draw(c) {
      // Light from the shop spills onto the pavement in front.
      lightPool(c, 0.8, 1.2, 24, 6, 0.5);
      c.box(0, 0, 2, 0.8, 66, o.wall);
      c.box(
        0,
        0,
        2,
        0.84,
        3,
        { top: o.wall.side, front: o.trim, side: o.trim },
        66,
      );
      // Rooftop clutter: a condenser unit and a small water tank.
      c.box(0.2, 0.15, 0.36, 0.26, 6, M.steel, 69);
      c.faceX(0.24, 0.411, 0.28, 70, 4, C.steelDark);
      for (let g = 0; g < 4; g++)
        c.faceX(0.26 + g * 0.065, 0.412, 0.03, 70, 4, C.steel);
      c.cylinder(1.55, 0.4, 69, 4, 8, R.steel);
      c.edge([1.2, 0.42, 69], [1.2, 0.42, 74], C.steelDark);
      // Shop window: warm interior with shelf silhouettes.
      c.faceX(0.12, 0.801, 1.3, 3, 22, CN.hot);
      c.faceX(0.12, 0.802, 1.3, 19, 6, CN.amber);
      for (const z of [8, 14, 20]) c.faceX(0.16, 0.803, 1.22, z, 1, C.woodDark);
      for (let k = 0; k < 9; k++)
        c.faceX(
          0.2 + k * 0.13,
          0.803,
          0.06,
          9 + (k % 3) * 6,
          3,
          accents[(k * 4) % accents.length],
        );
      c.faceX(0.12, 0.803, 1.3, 3, 1, C.woodDark);
      // Door with a lit glass pane.
      c.faceX(1.55, 0.801, 0.34, 0, 24, C.woodDark);
      c.faceX(1.6, 0.802, 0.24, 8, 13, CN.warm);
      c.p.pixel(...c.at(1.82, 0.803, 12), C.gold);
      // Awning: a sloped striped canopy with a scalloped valance.
      const [aLight, aDark, aDeep] = o.awning;
      c.poly(
        [
          [0.02, 0.8, 34],
          [1.98, 0.8, 34],
          [1.98, 1.14, 27],
          [0.02, 1.14, 27],
        ],
        aDark,
      );
      for (let u = 0.02; u < 1.98; u += 0.28)
        c.poly(
          [
            [u, 0.8, 34],
            [u + 0.14, 0.8, 34],
            [u + 0.14, 1.14, 27],
            [u, 1.14, 27],
          ],
          aLight,
        );
      for (let u = 0.02; u < 1.96; u += 0.14) {
        c.faceX(
          u,
          1.141,
          0.14,
          24,
          3,
          Math.round(u / 0.14) % 2 ? aLight : aDark,
        );
        c.faceX(u + 0.04, 1.142, 0.06, 23, 1, aDeep);
      }
      // A plain sign panel above the awning (no text) and a paper lantern.
      c.faceX(0.3, 0.801, 1.2, 37, 7, o.sign[0]);
      c.faceX(0.34, 0.802, 1.12, 38, 5, o.sign[1]);
      const [lx, ly] = c.at(1.9, 0.95, 40);
      c.p.ellipse(lx, ly, 3, 4, CN.amber);
      c.p.ellipse(lx - 1, ly - 1, 1.5, 2, CN.hot);
      c.p.pixel(lx, ly - 5, C.ink);
      // Upper floor: two windows, an AC unit on the wall between them.
      for (const [x, on] of [
        [0.2, o.lit[0]],
        [1.2, o.lit[1]],
      ] as [number, boolean][]) {
        c.faceX(x, 0.801, 0.5, 46, 12, o.trim);
        c.faceX(x + 0.04, 0.802, 0.42, 47, 10, on ? CN.warm : CN.glass3);
        c.faceX(x + 0.04, 0.803, 0.42, 55, 2, on ? CN.amber : CN.glass2);
        if (!on) c.edge([x + 0.08, 0.804, 49], [x + 0.2, 0.804, 55], CN.glass5);
      }
      c.box(0.85, 0.8, 0.28, 0.14, 7, M.steel, 44);
      c.faceX(0.88, 0.941, 0.22, 45, 5, C.steelDark);
      for (let k = 0; k < 3; k++)
        c.faceX(0.9 + k * 0.07, 0.942, 0.04, 45, 5, C.steel);
      c.faceY(2.001, 0.1, 0.6, 46, 12, o.lit[1] ? CN.amberSide : CN.glass1);
      // A potted plant by the door.
      c.pot(1.46, 1.0, 0, 3, 5, R.terracotta, C.soil);
      c.greenery(1.46, 1.0, 9, 5, R.leaf);
    },
  };
}
const city: Record<string, Spec> = {
  // CITY-OBJECTS
  'm-tower-tall': {
    footprint: [3, 3],
    h: 336,
    draw(c) {
      const top = nightTower(c, 0.25, 2.5, 272, 11);
      // Stepped crown with glowing bands, then a lit spire.
      c.box(
        0.55,
        0.55,
        1.9,
        1.9,
        16,
        {
          top: CN.glass4,
          front: CN.glass3,
          side: CN.glass1,
          edge: CN.glass0,
        },
        top,
      );
      for (const z of [top + 4, top + 9, top + 14]) {
        c.faceX(0.55, 2.451, 1.9, z, 1, CN.hot);
        c.faceY(2.451, 0.55, 1.9, z, 1, CN.warmSide);
      }
      c.box(
        0.95,
        0.95,
        1.1,
        1.1,
        14,
        {
          top: CN.glass5,
          front: CN.glass4,
          side: CN.glass2,
          edge: CN.glass0,
        },
        top + 16,
      );
      c.faceX(0.95, 2.051, 1.1, top + 22, 3, CN.cool);
      c.faceY(2.051, 0.95, 1.1, top + 22, 3, CN.coolSide);
      const [sx, sy] = c.at(1.5, 1.5, top + 30);
      c.p.rect(sx - 1, sy - 26, 3, 26, C.silver);
      c.p.rect(sx + 1, sy - 26, 1, 26, C.steelDark);
      c.p.rect(sx, sy - 34, 1, 8, C.silver);
      aircraftLight(c, 1.5, 1.5, top + 64);
      aircraftLight(c, 0.6, 0.6, top + 17);
      aircraftLight(c, 2.4, 2.4, top + 17);
    },
  },
  'm-tower-slim': {
    footprint: [2, 2],
    h: 262,
    draw(c) {
      const top = nightTower(c, 0.2, 1.6, 206, 23, 2);
      // A lantern crown: a cool-lit glass box under a thin cap, then a mast.
      c.box(
        0.35,
        0.35,
        1.3,
        1.3,
        18,
        {
          top: CN.glass5,
          front: CN.glass3,
          side: CN.glass1,
          edge: CN.glass0,
        },
        top,
      );
      for (let u = 0.42; u < 1.6; u += 0.18) {
        c.faceX(u, 1.651, 0.1, top + 3, 12, CN.cool);
        c.faceY(1.651, u, 0.1, top + 3, 12, CN.coolSide);
      }
      c.box(
        0.3,
        0.3,
        1.4,
        1.4,
        2,
        {
          top: C.slate,
          front: C.charcoal,
          side: C.ink,
          edge: C.ink,
        },
        top + 18,
      );
      c.edge([0.3, 1.7, top + 20], [1.7, 1.7, top + 20], CN.glass6);
      const [mx, my] = c.at(1, 1, top + 20);
      c.p.rect(mx, my - 18, 1, 18, C.silver);
      aircraftLight(c, 1, 1, top + 39);
    },
  },
  'm-tower-slim-b': {
    footprint: [2, 2],
    h: 228,
    draw(c) {
      const top = nightTower(c, 0.2, 1.6, 180, 41, 2);
      // A stepped crown ringed with warm light, rooftop plant and a mast.
      c.box(
        0.4,
        0.4,
        1.2,
        1.2,
        12,
        {
          top: CN.glass4,
          front: CN.glass3,
          side: CN.glass1,
          edge: CN.glass0,
        },
        top,
      );
      for (const z of [top + 3, top + 8]) {
        c.faceX(0.4, 1.601, 1.2, z, 1, CN.hot);
        c.faceY(1.601, 0.4, 1.2, z, 1, CN.warmSide);
      }
      c.box(0.75, 0.75, 0.5, 0.5, 6, M.steel, top + 12);
      c.faceY(1.251, 0.85, 0.2, top + 12, 4, CN.warm);
      const [mx, my] = c.at(1, 1, top + 18);
      c.p.rect(mx, my - 12, 1, 12, C.silver);
      aircraftLight(c, 1, 1, top + 31);
      aircraftLight(c, 0.4, 1.6, top + 13);
    },
  },
  'm-broadcast-tower': {
    footprint: [2, 2],
    h: 262,
    pad: 12,
    draw(c) {
      // Podium with a glowing entrance hall.
      c.box(0.1, 0.1, 1.8, 1.8, 12, M.concrete);
      c.faceX(0.35, 1.901, 1.3, 2, 8, CN.hot);
      c.faceX(0.35, 1.902, 1.3, 8, 2, CN.amber);
      for (let u = 0.35; u < 1.7; u += 0.32)
        c.faceX(u, 1.903, 0.04, 2, 8, C.charcoal);
      c.faceY(1.901, 0.4, 1.2, 2, 8, CN.amberSide);
      // Tapering shaft in sections, with a strip of warm lights up the lit side.
      const ramp: Ramp = [CN.conc0, CN.conc1, CN.conc2];
      const sections: [number, number, number][] = [
        [12, 7, 40],
        [52, 6, 40],
        [92, 5, 40],
        [132, 4.5, 20],
      ];
      for (const [z, rx, h] of sections) c.cylinder(1, 1, z, rx, h, ramp);
      const [bx, by] = c.at(1, 1, 0);
      for (let z = 16; z < 150; z += 4) c.p.pixel(bx - 3, by - z, CN.hot);
      for (let z = 18; z < 150; z += 8) c.p.pixel(bx + 3, by - z, CN.warmSide);
      // Main observation pod: dark band, a ring of lit windows, a glowing rim.
      c.cylinder(1, 1, 150, 18, 4, [CN.conc1, CN.conc2, CN.conc3]);
      c.cylinder(1, 1, 154, 17, 9, [CN.glass4, CN.glass3, CN.glass1]);
      const [pcx, pcy] = c.at(1, 1, 158);
      for (let a = 0; a < Math.PI; a += 0.09) {
        const wx = pcx + Math.cos(a) * 16,
          wy = pcy + Math.sin(a) * 8;
        const k = Math.floor(a / 0.09);
        c.p.rect(
          wx,
          wy - 2,
          1,
          3,
          k % 5 === 4 ? CN.glass2 : k % 3 ? CN.warm : CN.hot,
        );
      }
      c.cylinder(1, 1, 163, 18, 3, [CN.conc0, CN.conc1, CN.conc2]);
      const [rx0, ry0] = c.at(1, 1, 166);
      for (let a = 0; a < Math.PI; a += 0.12)
        c.p.pixel(rx0 + Math.cos(a) * 17, ry0 + Math.sin(a) * 8.5, CN.hot);
      c.cylinder(1, 1, 166, 11, 10, ramp, CN.conc0);
      // Upper shaft and a smaller pod.
      c.cylinder(1, 1, 176, 3.5, 30, ramp);
      c.cylinder(1, 1, 206, 8, 7, [CN.glass4, CN.glass3, CN.glass1]);
      const [ucx, ucy] = c.at(1, 1, 209);
      for (let a = 0.2; a < Math.PI - 0.2; a += 0.22)
        c.p.pixel(ucx + Math.cos(a) * 7, ucy + Math.sin(a) * 3.5, CN.cool);
      c.cylinder(1, 1, 213, 8.5, 2, [CN.conc0, CN.conc1, CN.conc2]);
      // Antenna mast with white and red bands and aircraft lights.
      const [mx, my] = c.at(1, 1, 215);
      for (let z = 0; z < 44; z++)
        c.p.rect(
          mx - (z < 20 ? 1 : 0),
          my - z,
          z < 20 ? 3 : 2,
          1,
          Math.floor(z / 6) % 2 ? C.redDark : C.offwhite,
        );
      c.p.rect(mx, my - 52, 1, 8, C.silver);
      aircraftLight(c, 1, 1, 236);
      aircraftLight(c, 1, 1, 268);
      aircraftLight(c, 1, 1, 169);
    },
  },
  // Poles stand 6 tiles apart along a kerb; -start and -end close a run.
  'm-utility-pole': utilityPole([1, -1]),
  'm-utility-pole-start': utilityPole([1]),
  'm-utility-pole-end': utilityPole([-1]),
  'm-street-cherry': {
    footprint: [1, 1],
    h: 86,
    pad: 18,
    draw(c) {
      const [bx, by] = c.at(0.5, 0.5, 0);
      // Petals already fallen on the pavement around the tree pit.
      for (let k = 0; k < 46; k++) {
        const a = cityHash(k, 1) * Math.PI * 2,
          r = 4 + cityHash(k, 2) * 22;
        c.p.pixel(
          bx + Math.cos(a) * r,
          by + Math.sin(a) * r * 0.5,
          k % 3 ? CN.petal1 : CN.petal0,
        );
      }
      c.top(0.32, 0.32, 0.36, 0.36, 0, C.soil);
      // Trunk and branches spreading wide into the canopy.
      c.thick([bx, by], [bx + 1, by - 24], 1.6, CN.bark);
      c.thick([bx - 1, by - 2], [bx, by - 22], 0.6, CN.barkLight);
      const branches: [number, number, number, number][] = [
        [1, -24, -16, -40],
        [1, -24, 17, -38],
        [1, -28, 3, -52],
        [-8, -32, -26, -42],
        [10, -31, 27, -40],
        [-14, -38, -12, -54],
        [13, -36, 12, -52],
      ];
      for (const [x0, y0, x1, y1] of branches)
        c.thick([bx + x0, by + y0], [bx + x1, by + y1], 0.8, CN.bark);
      // Blossom: a broad, airy crown of soft clusters, lit from the upper
      // left, deep pink in the shade underneath.
      const clusters: [number, number, number][] = [
        [-24, -42, 8],
        [25, -41, 8],
        [-14, -36, 8],
        [14, -35, 8],
        [-17, -50, 10],
        [17, -49, 10],
        [0, -44, 11],
        [-6, -58, 10],
        [8, -57, 10],
        [0, -64, 7],
      ];
      for (const [dx, dy, r] of clusters) {
        c.p.ellipse(bx + dx + 1, by + dy + 2, r, r * 0.74, CN.petal3);
        c.p.ellipse(bx + dx, by + dy, r * 0.95, r * 0.7, CN.petal2);
      }
      for (const [dx, dy, r] of clusters) {
        c.p.ellipse(
          bx + dx - r * 0.16,
          by + dy - r * 0.18,
          r * 0.72,
          r * 0.5,
          CN.petal1,
        );
        c.p.ellipse(
          bx + dx - r * 0.34,
          by + dy - r * 0.34,
          r * 0.36,
          r * 0.24,
          CN.petal0,
        );
      }
      // Loose petals break up the outline; texture inside the crown.
      for (let k = 0; k < 140; k++) {
        const [dx, dy, r] = clusters[k % clusters.length],
          a = cityHash(k, 7) * Math.PI * 2,
          d = r * (0.9 + cityHash(k, 8) * 0.3),
          x = Math.round(bx + dx + Math.cos(a) * d),
          y = Math.round(by + dy + Math.sin(a) * d * 0.72);
        c.p.pixel(x, y, Math.sin(a) > 0.3 ? CN.petal2 : CN.petal1);
      }
      for (let k = 0; k < 110; k++) {
        const x = bx - 32 + Math.floor(cityHash(k, 5) * 64),
          y = by - 72 + Math.floor(cityHash(k, 6) * 44),
          i = (y * c.p.width + x) * 4;
        if (!c.p.data[i + 3]) continue;
        c.p.pixel(
          x,
          y,
          k % 4 === 0 ? CN.petal3 : k % 3 ? CN.petal0 : CN.petal2,
        );
      }
      // Dark twigs showing through gaps in the blossom.
      for (const [x0, y0, x1, y1] of [
        [-11, -44, -15, -49],
        [12, -43, 16, -47],
        [2, -55, 1, -60],
        [-20, -40, -23, -44],
        [21, -39, 24, -42],
      ])
        c.line([bx + x0, by + y0], [bx + x1, by + y1], CN.bark);
      // Petals drifting down.
      for (const [dx, dy] of [
        [-25, -28],
        [20, -22],
        [-12, -16],
        [27, -34],
        [6, -12],
      ])
        c.p.pixel(bx + dx, by + dy, CN.petal0);
    },
  },
  'm-vending': {
    footprint: [1, 1],
    h: 46,
    pad: 10,
    side: true,
    draw(c) {
      // Light spilling onto the pavement in front.
      lightPool(c, 0.55, 1.15, 20, 7, 0.6);
      const machine = (x: number, body: Material, panel: string) => {
        c.box(x, 0.3, 0.42, 0.5, 40, body);
        // Glowing display window with rows of plain coloured bottles.
        c.faceX(x + 0.04, 0.801, 0.34, 18, 19, panel);
        for (let row = 0; row < 3; row++)
          for (let k = 0; k < 5; k++) {
            const col =
              accents[(k * 3 + row * 2 + (x > 0.5 ? 1 : 0)) % accents.length];
            c.faceX(x + 0.06 + k * 0.064, 0.802, 0.04, 21 + row * 6, 3, col);
          }
        c.faceX(x + 0.04, 0.802, 0.34, 36, 1, C.white);
        // Button strip and the dispenser slot.
        c.faceX(x + 0.06, 0.802, 0.3, 14, 2, C.charcoal);
        for (let k = 0; k < 5; k++)
          c.faceX(x + 0.08 + k * 0.06, 0.803, 0.02, 14, 1, CN.cool);
        c.faceX(x + 0.08, 0.802, 0.26, 4, 6, C.ink);
        c.faceX(x + 0.1, 0.803, 0.22, 5, 1, C.charcoal);
      };
      machine(
        0.04,
        {
          top: C.red,
          front: C.redDark,
          side: C.carpet,
          edge: C.carpetDark,
        },
        CN.hot,
      );
      machine(
        0.52,
        {
          top: C.white,
          front: C.offwhite,
          side: C.pale,
          edge: C.silver,
        },
        C.lamp,
      );
      // A small recycling bin beside them.
      c.cylinder(1.02, 0.6, 0, 2.5, 9, [C.blue, C.blueDark, C.navy]);
    },
  },
  // Two-storey shop houses with awnings, in three colourways.
  'm-awning-shop': awningShop({
    wall: {
      top: C.warmGreyLight,
      front: C.creamShade,
      side: C.warmGrey,
      edge: C.warmGreyDark,
    },
    trim: C.warmGreyDark,
    awning: [C.teal, C.tealDark, C.deepTeal],
    sign: [C.redDark, C.red],
    lit: [true, false],
  }),
  'm-awning-shop-b': awningShop({
    wall: {
      top: C.offwhite,
      front: C.stone,
      side: C.stoneShade,
      edge: C.stoneLine,
    },
    trim: C.stoneLine,
    awning: [C.white, C.red, C.redDark],
    sign: [C.stageNavy, C.blueDark],
    lit: [false, true],
  }),
  'm-awning-shop-c': awningShop({
    wall: {
      top: C.terracottaLight,
      front: C.terracotta,
      side: C.terracottaDark,
      edge: C.brickDark,
    },
    trim: C.terracottaDark,
    awning: [C.orange, C.orangeDark, C.terracottaDark],
    sign: [C.greenDark, C.green],
    lit: [true, true],
  }),
  'm-city-lamp': {
    footprint: [1, 1],
    h: 70,
    pad: 14,
    shadow: false,
    draw(c) {
      // A warm pool of light on the pavement.
      const [gx, gy] = c.at(0.5, 0.5, 0);
      lightPool(c, 0.5, 0.5, 26, 13, 0.9);
      // Dark cast-iron post with a curved arm and a glowing lantern.
      c.p.rect(gx - 1, gy - 60, 3, 60, C.ink);
      c.p.rect(gx - 1, gy - 60, 1, 60, C.charcoal);
      c.p.rect(gx - 3, gy - 6, 7, 6, C.charcoal);
      c.p.rect(gx - 2, gy - 7, 5, 1, C.slate);
      c.line([gx, gy - 60], [gx + 6, gy - 64], C.ink);
      c.line([gx + 6, gy - 64], [gx + 10, gy - 61], C.ink);
      c.p.rect(gx + 7, gy - 61, 7, 2, C.ink);
      c.p.rect(gx + 8, gy - 59, 5, 4, C.lamp);
      c.p.rect(gx + 9, gy - 59, 3, 3, C.white);
      c.p.rect(gx + 7, gy - 55, 7, 1, CN.hot);
    },
  },
};
Object.assign(objects, city);

/* ════════ Massawa pass: an island town on the Red Sea, c. 615 CE ════════ */
/*
 * After the owner's reference sheets: flat-roofed mud-brick houses (some in
 * pink plaster) on red-brick footings with beam ends and low parapets,
 * market stalls with produce, barrels and sacks, a well, garden plots, date
 * palms and acacias, Bedouin tents, a cart, dhows under sail and under
 * repair, rowing boats, nets, a jetty and a jumping fish. No people, text,
 * flags or symbols. Placed outside the mapped quarter by
 * packages/shared/massawa.ts.
 */
const CORAL: Tones = [
  MC.stone0,
  MC.stone1,
  MC.stone2,
  MC.stone3,
  MC.stone4,
  MC.stone5,
];
const PLASTER: Tones = [MC.plaster0, MC.plaster1, MC.plaster2, MC.stone2];
const MWOOD: Tones = [MC.wood0, MC.wood1, MC.wood2, MC.wood3];
const REED: Tones = [MC.reed0, MC.reed1, MC.reed2, MC.reed3];
const CLAY: Tones = [MC.clay0, MC.clay1, MC.clay2, MC.clay3];
const ACACIA: Tones = [
  MC.acacia0,
  MC.acacia1,
  MC.acacia2,
  MC.acacia3,
  MC.acacia4,
];
// Marker colours, replaced by textures (never left in the art).
const MK = {
  front: '#010501',
  side: '#010502',
  top: '#010503',
  roofA: '#010504',
  roofB: '#010505',
  sail: '#010506',
  hull: '#010507',
  deck: '#010508',
} as const;
/** Smooth value noise in [0, 1). */
function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    fx = x - xi,
    fy = y - yi,
    u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  return (
    nhash(xi, yi, s) * (1 - u) * (1 - v) +
    nhash(xi + 1, yi, s) * u * (1 - v) +
    nhash(xi, yi + 1, s) * (1 - u) * v +
    nhash(xi + 1, yi + 1, s) * u * v
  );
}
/** A flat lime-plaster roof: mottled, a little darker toward the back. */
function roofShade(px: number, py: number, seed: number) {
  let v = 0.3 + (vnoise(px / 5, py / 3, seed) - 0.5) * 0.5;
  if (nhash(px, py, seed + 1) < 0.04) v -= 0.4;
  return tone(PLASTER, v, [0.45, 0.05, -0.3]);
}
/** Planked wood: grain along the planks, dark seams every `seam` px. */
function plankShade(
  px: number,
  py: number,
  along: 'x' | 'y' | 'v',
  seed: number,
  lift = 0,
  seam = 3,
) {
  const k = along === 'v' ? px : along === 'x' ? py - px * 0.5 : py + px * 0.5,
    i = Math.floor(k / seam);
  let v = lift + (nhash(i, 0, seed) - 0.5) * 0.4;
  if (((k % seam) + seam) % seam < 1) v -= 0.6;
  if (nhash(px >> 1, py, seed + 2) < 0.08) v -= 0.25;
  return tone(MWOOD, v, [0.3, -0.05, -0.45]);
}
/** Woven palm-frond texture (huts, mats, baskets). */
function reedShade(
  px: number,
  py: number,
  seed: number,
  lift = 0,
  vertical = true,
) {
  const k = vertical ? px : py,
    j = vertical ? py : px;
  let v = lift + (nhash(k, 0, seed) - 0.5) * 0.5;
  if (k % 2 === 0) v -= 0.25;
  if ((j + (k % 3)) % 5 === 0) v -= 0.3;
  if (nhash(px, py, seed + 3) < 0.05) v += 0.3;
  return tone(REED, v, [0.32, -0.05, -0.42]);
}
/** A plank door with a lintel beam on the front face (constant y). */
function frontDoor(
  c: IsoCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  open = false,
) {
  c.faceX(x - 0.06, y + 0.002, w + 0.12, h, 3, MC.wood1);
  c.edge(
    [x - 0.06, y + 0.003, h + 3],
    [x + w + 0.06, y + 0.003, h + 3],
    MC.wood0,
  );
  c.faceX(x, y + 0.002, w, 0, h, MK.hull);
  recolour(c, MK.hull, (px, py) => plankShade(px, py, 'v', seed, 0.05));
  if (open) {
    c.faceX(x + w * 0.45, y + 0.003, w * 0.55, 0, h - 1, MC.wood3);
    c.faceX(x + w * 0.45, y + 0.004, w * 0.08, 0, h - 1, MC.wood2);
  }
  // Iron-free wooden latch and a worn step.
  const [lx, ly] = c.at(x + w * 0.25, y, h * 0.5);
  c.p.pixel(lx, ly, MC.wood3);
  c.top(x - 0.05, y, w + 0.1, 0.12, 1, MC.stone2);
}
/** A small window with one shutter ajar, on either face. */
function shutter(
  c: IsoCanvas,
  face: 'x' | 'y',
  x: number,
  y: number,
  z: number,
  s = 0.22,
  h = 7,
) {
  if (face === 'x') {
    c.faceX(x - 0.03, y + 0.002, s + 0.06, z - 1, h + 2, MC.stone3);
    c.faceX(x, y + 0.003, s, z, h, MC.wood3);
    c.faceX(x, y + 0.004, s * 0.45, z, h, MC.wood1);
    c.edge([x, y + 0.005, z + h], [x + s * 0.45, y + 0.005, z + h], MC.wood0);
    c.faceX(x - 0.05, y + 0.005, s + 0.1, z - 1, 1, MC.wood2);
  } else {
    c.faceY(x + 0.002, y - 0.03, s + 0.06, z - 1, h + 2, MC.stone4);
    c.faceY(x + 0.003, y, s, z, h, MC.wood3);
    c.faceY(x + 0.004, y + s * 0.55, s * 0.45, z, h, MC.wood2);
    c.faceY(x + 0.005, y - 0.05, s + 0.1, z - 1, 1, MC.wood2);
  }
}
/** Palm-trunk roof beams poking out under the parapet on the front face. */
function beamEnds(
  c: IsoCanvas,
  x: number,
  y: number,
  w: number,
  z: number,
  n: number,
) {
  for (let i = 0; i < n; i++) {
    const [bx, by] = c.at(x + ((i + 0.5) * w) / n, y + 0.06, z);
    c.p.rect(bx - 1, by - 1, 2, 2, MC.wood2);
    c.p.pixel(bx - 1, by - 1, MC.wood0);
    c.p.pixel(bx, by, MC.wood3);
  }
}
/** A wooden rain spout sticking out of the parapet. */
function spout(c: IsoCanvas, x: number, y: number, z: number) {
  const [sx, sy] = c.at(x, y, z);
  c.p.rect(sx, sy, 3, 1, MC.wood1);
  c.p.pixel(sx + 3, sy + 1, MC.wood2);
  // A pale stain running down the wall below it.
  for (let k = 2; k < 9; k++)
    if (nhash(sx, sy + k, 5) < 0.7) c.p.pixel(sx + 1, sy + k, MC.plaster2);
}
/** Clay jar: a round belly, a narrow neck and a lip. */
function jar(
  c: IsoCanvas,
  x: number,
  y: number,
  z: number,
  r: number,
  seed: number,
) {
  const [jx, jy] = c.at(x, y, z),
    bh = r * 2.1;
  for (let py = Math.floor(jy - bh - 1); py <= jy; py++)
    for (let px = Math.floor(jx - r - 1); px <= jx + r + 1; px++) {
      const t = (jy - py) / bh,
        half = r * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)) * 1.02;
      const u = (px + 0.5 - jx) / Math.max(0.5, half);
      if (Math.abs(u) > 1 || t > 1) continue;
      let v = -u * 0.7 + (t - 0.5) * 0.5 + (nhash(px, py, seed) - 0.5) * 0.15;
      if (t < 0.12) v -= 0.4;
      c.p.pixel(px, py, tone(CLAY, v, [0.38, -0.05, -0.5]));
    }
  const nw = Math.max(1, Math.round(r * 0.45));
  c.p.rect(jx - nw, jy - bh - 2, nw * 2, 2, MC.clay1);
  c.p.rect(jx - nw - 1, jy - bh - 3, nw * 2 + 2, 1, MC.clay0);
  c.p.pixel(jx + nw, jy - bh - 3, MC.clay2);
}
/** Round woven basket with a heap of goods (`fill` tones) inside. */
function basket(
  c: IsoCanvas,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  fill: Tones,
  seed: number,
) {
  const [bx, by] = c.at(x, y, z);
  for (let py = Math.floor(by - h - r / 2); py <= by + r / 2; py++)
    for (let px = Math.floor(bx - r); px <= bx + r; px++) {
      const u = (px + 0.5 - bx) / r;
      if (Math.abs(u) > 1) continue;
      const lower = by + (r / 2) * Math.sqrt(1 - u * u);
      if (py > lower || py < by - h) continue;
      c.p.pixel(px, py, reedShade(px, py, seed, -u * 0.35, true));
    }
  // Rim and heaped contents.
  c.p.ellipse(bx, by - h, r, r / 2, MC.reed2);
  for (let py = Math.floor(by - h - r / 2 - 2); py <= by - h + r / 2; py++)
    for (let px = Math.floor(bx - r + 1); px <= bx + r - 1; px++) {
      const u = (px + 0.5 - bx) / (r - 1),
        top = by - h - 2 * Math.sqrt(Math.max(0, 1 - u * u)),
        e =
          ((px + 0.5 - bx) / (r - 1)) ** 2 +
          ((py + 0.5 - (by - h)) / (r / 2 - 0.5)) ** 2;
      if (e > 1 && py > by - h) continue;
      if (py < top) continue;
      if (Math.abs(u) > 1) continue;
      const v =
        -u * 0.5 - (py - top) * 0.15 + (nhash(px, py, seed + 7) - 0.5) * 0.6;
      c.p.pixel(px, py, tone(fill, v, [0.35, -0.1, -0.5]));
    }
}
/** A rough wooden pole. */
function pole(c: IsoCanvas, x: number, y: number, z: number, h: number) {
  const [px, py] = c.at(x, y, z);
  c.p.rect(px - 1, py - h, 1, h, MC.wood1);
  c.p.rect(px, py - h, 1, h, MC.wood2);
  c.p.pixel(px - 1, py - h, MC.wood0);
}
/** Dark water hugging a hull or post, with a pale foam rim. */
function waterRing(
  c: IsoCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  f: number,
  seed: number,
) {
  for (let py = Math.floor(cy - ry - 2); py <= cy + ry + 2; py++)
    for (let px = Math.floor(cx - rx - 3); px <= cx + rx + 3; px++) {
      const e = Math.hypot((px + 0.5 - cx) / rx, (py + 0.5 - cy) / ry);
      if (e < 0.95 && e > 0.55 && nhash(px >> 1, py, seed + f) < 0.5)
        c.p.pixel(px, py, SEA[3]);
      else if (e >= 0.95 && e < 1.12 && nhash(px, py, seed + 1 + f) < 0.55)
        c.p.pixel(px, py, (px + py + f) % 3 ? SEA[1] : SEA[0]);
    }
}
/**
 * An open dhow hull lying along x from `x0` to `x1` (bow at x1): the inner
 * planking and ribs show over the near gunwale, the near side is planked
 * with a dark wale. `stripped` opens a run of missing planks amidships.
 */
function dhowHull(
  c: IsoCanvas,
  x0: number,
  x1: number,
  yc: number,
  beam: number,
  keel: number,
  sheer: number,
  seed: number,
  stripped = false,
) {
  const xm = x0 + (x1 - x0) * 0.45,
    near = (x: number) => {
      const t = (x - x0) / (x1 - x0);
      return (
        yc +
        (beam / 2) * Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.92)) ** 0.7
      );
    },
    rise = (x: number) => {
      const t = (x - x0) / (x1 - x0);
      return sheer + 7 * (1 - t) ** 3 + 8 * t ** 4;
    };
  const gunNear: [number, number, number][] = [],
    gunFar: [number, number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const x = x0 + ((x1 - x0) * i) / 24;
    gunNear.push([x, near(x), rise(x)]);
    gunFar.push([x, 2 * yc - near(x), rise(x)]);
  }
  // Inside: the far side's inner planking (lit), then the dark bilge.
  c.poly([...gunFar, ...[...gunNear].reverse()], MK.deck);
  const [ox, oy] = c.at(0, 0, 0);
  recolour(c, MK.deck, (px, py) => {
    const X = (px + 0.5 - ox) / 16,
      S = (py + 0.5 - oy) / 8,
      tx = (S + X) / 2,
      far = c.at(
        tx,
        2 * yc - near(Math.min(x1, Math.max(x0, tx))),
        rise(Math.min(x1, Math.max(x0, tx))),
      )[1],
      dz = py - far;
    if (Math.floor(px) % 5 === 0 && dz > 2) return MC.wood1;
    if (dz < 4) return Math.floor(dz) % 2 ? MC.wood1 : MC.wood0;
    return dz < 7 ? MC.wood2 : MC.wood3;
  });
  // Near side, from the gunwale down to the keel.
  const keelLine: [number, number, number][] = [];
  for (let i = 24; i >= 0; i--) {
    const x = x0 + 0.15 + ((x1 - x0 - 0.35) * i) / 24,
      t = (x - x0) / (x1 - x0);
    keelLine.push([
      x,
      yc + (near(x) - yc) * 0.35,
      keel + 5 * (1 - t) ** 4 + 6 * t ** 6,
    ]);
  }
  c.poly([...gunNear, ...keelLine], MK.hull);
  const [hax, hay] = c.at(0, yc + beam / 2, 0);
  recolour(c, MK.hull, (px, py) => {
    const z = hay + (px - hax) / 2 - py,
      u = (px - hax) / 16;
    if (
      stripped &&
      u > xm - 0.2 &&
      u < xm + 0.45 &&
      z > keel + 4 &&
      z < sheer - 3
    )
      return Math.floor(px) % 3 === 0 ? MC.wood1 : MC.wood3;
    if (z < keel + 3) return MC.wood3;
    if (Math.floor(z) % 3 === 0) return MC.wood2;
    return nhash(px >> 2, Math.floor(z / 3), seed) < 0.3 ? MC.wood1 : MC.wood0;
  });
  for (let i = 0; i < 24; i++) c.edge(gunNear[i], gunNear[i + 1], MC.wood0);
  for (let i = 0; i < 24; i++)
    c.edge(
      [gunNear[i][0], gunNear[i][1], gunNear[i][2] - 3],
      [gunNear[i + 1][0], gunNear[i + 1][1], gunNear[i + 1][2] - 3],
      MC.wood3,
    );
}
/** A flat, ragged umbrella canopy (acacia), lit on top, dark beneath. */
function flatCanopy(
  c: IsoCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  lift = 0,
) {
  for (let py = Math.floor(cy - ry - 3); py <= cy + ry + 3; py++)
    for (let px = Math.floor(cx - rx - 3); px <= cx + rx + 3; px++) {
      const X = (px + 0.5 - cx) / rx,
        Y = (py + 0.5 - cy) / ry,
        a = Math.atan2(Y, X),
        edge = 1 + (vnoise(a * 4 + 20, 0, seed) - 0.5) * 0.4,
        e = Math.hypot(X, Y);
      if (e > edge) continue;
      if (e > edge - 0.14 && nhash(px, py, seed) < 0.45) continue;
      const leaf = vnoise(px / 2.2, py / 1.5, seed + 1);
      let v = lift + 0.3 - Y * 0.75 - X * 0.15 + (leaf - 0.5) * 1.1;
      if (Y > 0.55) v -= 0.35;
      c.p.pixel(px, py, tone(ACACIA, v, [0.62, 0.26, -0.1, -0.45]));
    }
}

const BRICK: Tones = [MC.brick0, MC.brick1, MC.brick2, MC.brick3];
const PINK: Tones = [MC.pink0, MC.pink1, MC.pink2, MC.pink3];
const TENT: Tones = [MC.tent0, MC.tent1, MC.tent2, MC.tent3];
const OCHRE: Tones = [MC.ochre0, MC.ochre1, MC.ochre2, MC.ochre3];
const SACK: Tones = [MC.sack0, MC.sack1, MC.sack2, MC.wood2];
type WallLook = {
  pink?: boolean;
  band?: number;
  /** Share of the wall left as bare brick (0 = all plaster, 1 = none). */
  plaster?: number;
  /** Plaster ramp, light to dark (default lime or pink). */
  tones?: Tones;
};
/**
 * A town wall as in the owner's references: tan mud-brick courses with
 * worn lime plaster (or pink plaster), over a footing of fired red brick.
 * `z` is the pixel's height above the ground.
 */
function wallShade(
  px: number,
  py: number,
  face: 1 | 2,
  z: number,
  seed: number,
  look: WallLook,
) {
  const base = face === 1 ? 0.14 : -0.34,
    r = face === 1 ? py - px * 0.5 : py + px * 0.5,
    band = look.band ?? 7;
  if (z < band) {
    const row = Math.floor(r / 2.5),
      inRow = r / 2.5 - row,
      off = (row % 2) * 2.5,
      col = Math.floor((px + off) / 5),
      inCol = (px + off) / 5 - col;
    let v = base + (nhash(col, row, seed + 40) - 0.5) * 0.45;
    if (inRow < 0.34 || inCol < 0.2) v -= 0.62;
    if (z > band - 1.2) v -= 0.45;
    return tone(BRICK, v, [0.35, -0.05, -0.45]);
  }
  const share = look.plaster ?? (look.pink ? 0.3 : 0.68),
    w = vnoise(px / 7, r / 5, seed + 9);
  if (w > share) {
    let v = base + 0.18 + (nhash(px, py, seed + 4) - 0.5) * 0.14;
    if (w < share + 0.035) v -= 0.42;
    if (nhash(px, py, seed + 6) < 0.015) v -= 0.5;
    return look.tones
      ? tone(look.tones, v, [0.35, 0.0, -0.4])
      : look.pink
        ? tone(PINK, v, [0.35, 0.0, -0.4])
        : tone(PLASTER, v, [0.6, 0.22, -0.16]);
  }
  // Sun-dried bricks laid in courses, lit on their top left.
  const row = Math.floor(r / 3),
    inRow = r / 3 - row,
    len = 6,
    off = (row % 2) * 3 + nhash(row, 2, seed) * 2,
    col = Math.floor((px + off) / len),
    inCol = (px + off) / len - col;
  let v = base + (nhash(col, row, seed) - 0.5) * 0.4;
  if (inRow < 0.3 || inCol < 1 / len) v -= 0.62;
  else if (inRow < 0.6 && inCol < 0.45) v += 0.16;
  if (nhash(px, py, seed + 3) < 0.05) v -= 0.35;
  return tone(CORAL, v, [0.6, 0.3, 0.02, -0.3, -0.62]);
}
/**
 * A flat-roofed block: a low parapet round a sunken roof, walls of
 * `wallShade`, the footing only where the wall meets the ground.
 */
function townBlock(
  c: IsoCanvas,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  seed: number,
  look: WallLook = {},
  z = 0,
) {
  const [ax, ay] = c.at(0, 0, 0),
    t = 0.13,
    rim = look.tones?.[0] ?? (look.pink ? MC.pink0 : MC.plaster0),
    lit = look.tones?.[1] ?? (look.pink ? MC.pink1 : MC.plaster1),
    shadeC = look.tones?.[2] ?? (look.pink ? MC.pink2 : MC.plaster2);
  c.top(x, y, w, d, z + h - 2, MK.top);
  recolour(c, MK.top, (px, py) => roofShade(px, py, seed + 2));
  c.faceX(x + t, y + t, w - t, z + h - 2, 2, lit);
  c.faceY(x + t, y + t, d - t, z + h - 2, 2, shadeC);
  c.top(x, y, w, t, z + h, rim);
  c.top(x, y, t, d, z + h, rim);
  c.faceX(x, y + d, w, z, h, MK.front);
  c.faceY(x + w, y, d, z, h, MK.side);
  recolour(c, MK.front, (px, py) =>
    wallShade(px, py, 1, ay + (px - ax) / 2 + 16 * (y + d) - py, seed, look),
  );
  recolour(c, MK.side, (px, py) =>
    wallShade(
      px,
      py,
      2,
      ay + 16 * (x + w) - (px - ax) / 2 - py,
      seed + 1,
      look,
    ),
  );
  c.top(x, y + d - t, w, t, z + h, rim);
  c.top(x + w - t, y, t, d, z + h, lit);
  c.edge([x, y + d, z + h], [x + w, y + d, z + h], rim);
}
/** Beam ends along the side face (constant x) under the parapet. */
function beamEndsSide(
  c: IsoCanvas,
  x: number,
  y: number,
  d: number,
  z: number,
  n: number,
) {
  for (let i = 0; i < n; i++) {
    const [bx, by] = c.at(x + 0.06, y + ((i + 0.5) * d) / n, z);
    c.p.rect(bx - 1, by - 1, 2, 2, MC.wood2);
    c.p.pixel(bx, by - 1, MC.wood1);
    c.p.pixel(bx - 1, by, MC.wood3);
  }
}
/** A window with a wooden grille on the side face. */
function grille(
  c: IsoCanvas,
  x: number,
  y: number,
  z: number,
  s = 0.26,
  h = 7,
) {
  c.faceY(x + 0.002, y - 0.03, s + 0.06, z - 1, h + 2, MC.wood2);
  c.faceY(x + 0.003, y, s, z, h, MC.wood3);
  for (let k = 1; k < 4; k++) {
    const [gx, gy] = c.at(x + 0.004, y + (s * k) / 4, z + h);
    c.p.rect(gx, gy, 1, h, MC.wood1);
  }
}
/** A wooden crate heaped with produce (`fill` light to dark). */
function crate(
  c: IsoCanvas,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  fill: Tones,
  seed: number,
) {
  c.box(
    x,
    y,
    w,
    d,
    3,
    { top: MC.wood1, front: MC.wood0, side: MC.wood1, edge: MC.wood2 },
    z,
  );
  const y0 = c.at(x, y, z + 3)[1],
    y1 = c.at(x + w, y + d, z + 3)[1];
  for (let py = Math.min(y0, y1) - 3; py <= Math.max(y0, y1) + 1; py++)
    for (
      let px = Math.floor(c.at(x, y + d, 0)[0]);
      px <= c.at(x + w, y, 0)[0];
      px++
    ) {
      // Inside the crate's top diamond, heaped toward the middle.
      const [ox, oy] = c.at(0, 0, z + 3),
        X = (px + 0.5 - ox) / 16,
        S = (py + 2 - oy) / 8,
        tx = (S + X) / 2,
        ty = (S - X) / 2;
      if (
        tx < x + 0.05 ||
        tx > x + w - 0.05 ||
        ty < y + 0.05 ||
        ty > y + d - 0.05
      )
        continue;
      const ball = nhash(px >> 1, py >> 1, seed);
      const v = 0.3 - ((px & 1) + (py & 1)) * 0.25 + (ball - 0.5) * 0.4;
      c.p.pixel(px, py, tone(fill, v, [0.25, -0.15]));
    }
}
/** A banded wooden barrel. */
function barrel(
  c: IsoCanvas,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
) {
  c.cylinder(x, y, z, r, h, [MC.wood0, MC.wood1, MC.wood2], MC.wood2);
  for (const k of [0.2, 0.8]) {
    const [bx, by] = c.at(x, y, z + h * k);
    for (let i = -r; i <= r; i++) {
      const u = i / r;
      c.p.pixel(
        bx + i,
        by + (r / 2) * Math.sqrt(Math.max(0, 1 - u * u)) - 0.5,
        MC.wood3,
      );
    }
  }
  const [tx, ty] = c.at(x, y, z + h);
  c.p.ellipse(tx, ty, r - 1, r / 2 - 0.5, MC.wood1);
}
/** A tied burlap sack. */
function sack(
  c: IsoCanvas,
  x: number,
  y: number,
  r: number,
  h: number,
  seed: number,
) {
  const [sx, sy] = c.at(x, y, 0);
  for (let py = Math.floor(sy - h - 2); py <= sy + 1; py++)
    for (let px = Math.floor(sx - r - 1); px <= sx + r + 1; px++) {
      const t = (sy - py) / h,
        half =
          r * (t < 0.75 ? 1 - (0.75 - t) ** 2 * 0.6 : 1 - (t - 0.75) * 2.6);
      const u = (px + 0.5 - sx) / Math.max(0.6, half);
      if (Math.abs(u) > 1 || t < -0.15 || t > 1) continue;
      let v =
        0.35 -
        u * 0.6 -
        (t < 0.1 ? 0.4 : 0) +
        (nhash(px, py, seed) - 0.5) * 0.15;
      if (t > 0.78 && t < 0.86) v -= 0.6;
      c.p.pixel(px, py, tone(SACK, v, [0.3, -0.1, -0.5]));
    }
}
/** A date palm: a scarred trunk, hanging dates and arching green fronds. */
function datePalm(
  c: IsoCanvas,
  x: number,
  y: number,
  h: number,
  lean: number,
  seed: number,
) {
  const top: [number, number] = [x + lean, y - h];
  for (let j = 0; j <= h; j++) {
    const s = j / h,
      bx = x + lean * s * s,
      by = y - j,
      half = 3.4 - s * 0.9 + (j < 3 ? (3 - j) * 0.7 : 0);
    for (let i = Math.floor(bx - half); i <= bx + half; i++) {
      const u = (i + 0.5 - bx) / half,
        k = i - Math.round(bx) + 8,
        scar = (k + j) % 4 === 0 || (k - j + 400) % 4 === 0;
      const v = -u * 0.7 + (scar ? -0.45 : 0.12);
      c.p.pixel(
        i,
        by,
        tone([NC.palm0, NC.palm1, NC.palm2, NC.bark2], v, [0.35, -0.1, -0.5]),
      );
    }
  }
  // Fronds pointing away first, darker.
  const fronds = [-150, -110, -70, -30, 10, 50, 95, 135, 170].sort(
    (a, b) => Math.sin((a * Math.PI) / 180) - Math.sin((b * Math.PI) / 180),
  );
  let dates = false;
  for (const [k, deg] of fronds.entries()) {
    const a = (deg * Math.PI) / 180,
      away = Math.sin(a) < 0;
    if (!dates && !away) {
      // Clusters of dates under the crown.
      for (const [dx, dy] of [
        [-3, 3],
        [3, 4],
        [0, 5],
      ]) {
        for (let i = 0; i < 7; i++) {
          const px = top[0] + dx + (nhash(i, seed + dx) - 0.5) * 4,
            py = top[1] + dy + nhash(i, seed + dy, 1) * 4;
          c.p.pixel(px, py, i % 3 ? MC.date0 : MC.date1);
        }
        c.line([top[0], top[1] + 1], [top[0] + dx, top[1] + dy], MC.date1);
      }
      dates = true;
    }
    const L = (away ? 24 : 30) + nhash(k, seed + 90) * 6,
      pts: [number, number][] = [];
    for (let i = 0; i <= 36; i++) {
      const s = i / 36;
      pts.push([
        top[0] + Math.cos(a) * L * s,
        top[1] + Math.sin(a) * L * s * 0.5 - 14 * s + 22 * s * s,
      ]);
    }
    const dk = away ? 1 : 0;
    for (let i = 1; i < pts.length; i++) {
      const s = i / 36,
        [fx, fy] = pts[i],
        tx = fx - pts[i - 1][0],
        ty = fy - pts[i - 1][1],
        tl = Math.hypot(tx, ty) || 1;
      let nx = -ty / tl,
        ny = tx / tl;
      if (ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      // Stiff, narrow leaflets: a rib with a comb of tips below it.
      const w =
          0.8 + 3.6 * Math.sin(Math.PI * (0.1 + 0.85 * s)) * (1 - 0.35 * s),
        tip = i % 2 === 0 ? 1.4 : 0;
      for (let q = -w * 0.3; q <= w * 0.7 + tip; q += 0.5) {
        const t = q < -0.4 ? 1 : q < 0.5 ? 2 : q > w * 0.7 ? 4 : 3;
        c.p.pixel(fx + nx * q, fy + ny * q, FOLIAGE[Math.min(5, t + dk)]);
      }
    }
  }
}

/** An arched doorway on the front face (constant y): dark, with a lit rim. */
function archDoor(c: IsoCanvas, x: number, y: number, w: number, h: number) {
  const arch = (inset: number): [number, number, number][] => {
    const pts: [number, number, number][] = [[x + inset, y, 0]];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push([
        x + inset + (w - 2 * inset) * t,
        y,
        h - 4 + 4 * Math.sin(Math.PI * t) - inset * 8,
      ]);
    }
    pts.push([x + w - inset, y, 0]);
    return pts;
  };
  c.poly(
    arch(0).map(([a, b, z]) => [a, b + 0.002, z]),
    MC.plaster0,
  );
  c.poly(
    arch(0.05).map(([a, b, z]) => [a, b + 0.003, z]),
    MC.wood3,
  );
  c.poly(
    arch(0.1).map(([a, b, z]) => [a, b + 0.004, Math.max(0, z - 1)]),
    MC.wood2,
  );
}
/** A wooden lattice balcony jutting from the front face at height z. */
function latticeBalcony(
  c: IsoCanvas,
  x: number,
  y: number,
  w: number,
  z: number,
  h = 10,
) {
  c.box(
    x,
    y,
    w,
    0.3,
    h,
    { top: MC.wood0, front: MC.wood1, side: MC.wood2, edge: MC.wood3 },
    z,
  );
  const [x0, y0] = c.at(x, y + 0.3, z),
    [x1] = c.at(x + w, y + 0.3, z);
  for (let px = Math.ceil(x0) + 1; px < x1 - 1; px++)
    for (let k = 2; k < h - 1; k++) {
      const py = y0 + (px - x0) * 0.5 - k;
      if ((px + k) % 3 === 0 || (px - k + 300) % 3 === 0)
        c.p.pixel(px, py, MC.wood3);
      else if ((px + k) % 3 === 1) c.p.pixel(px, py, MC.wood0);
    }
  // Brackets under it.
  for (const u of [x + 0.08, x + w - 0.08]) {
    const [bx, by] = c.at(u, y + 0.3, z);
    c.line([bx, by], [bx - 1, by + 3], MC.wood2);
  }
}
/** Steps up the side face (constant x), from the ground to height h. */
function sideStair(c: IsoCanvas, x: number, y: number, len: number, h: number) {
  const n = Math.round(h / 3);
  for (let i = 0; i < n; i++)
    c.box(
      x,
      y + (len * i) / n,
      0.35,
      len - (len * i) / n,
      3,
      {
        top: MC.plaster1,
        front: MC.stone2,
        side: MC.stone3,
        edge: MC.stone4,
      },
      i * 3,
    );
}
const massawa: Record<string, Spec> = {
  'msw-house-white': {
    // Whitewashed all over, with a blue-green plank door and shutters.
    footprint: [2, 2],
    h: 40,
    side: true,
    draw(c) {
      townBlock(c, 0.15, 0.15, 1.7, 1.6, 30, 61, { plaster: -1, band: 5 });
      beamEnds(c, 0.15, 1.75, 1.7, 26, 5);
      beamEndsSide(c, 1.85, 0.15, 1.6, 26, 4);
      c.faceX(0.68, 1.752, 0.5, 17, 3, MC.wood1);
      c.faceX(0.72, 1.753, 0.42, 0, 17, C.tealDark);
      for (let k = 1; k < 4; k++)
        c.faceX(0.72 + k * 0.105, 1.754, 0.012, 0, 17, C.deepTeal);
      c.faceX(0.3, 1.752, 0.26, 14, 7, MC.wood3);
      c.faceX(0.3, 1.753, 0.12, 14, 7, C.teal);
      c.faceX(0.44, 1.753, 0.12, 14, 7, C.tealDark);
      c.faceY(1.852, 0.5, 0.32, 14, 7, MC.wood3);
      c.faceY(1.853, 0.5, 0.14, 14, 7, C.tealDark);
      c.faceY(1.853, 0.68, 0.14, 14, 7, C.deepTeal);
      jar(c, 1.45, 1.95, 0, 2.8, 62);
    },
  },
  'msw-house-ochre': {
    // An ochre-washed house of two storeys with a wooden lattice balcony.
    footprint: [2, 2],
    h: 64,
    side: true,
    draw(c) {
      townBlock(c, 0.15, 0.15, 1.7, 1.55, 54, 71, {
        plaster: 0.15,
        tones: OCHRE,
      });
      beamEnds(c, 0.15, 1.7, 1.7, 50, 5);
      beamEndsSide(c, 1.85, 0.15, 1.55, 50, 4);
      beamEnds(c, 0.15, 1.7, 1.7, 27, 5);
      frontDoor(c, 0.3, 1.7, 0.4, 17, 72);
      shutter(c, 'x', 1.25, 1.7, 14, 0.26, 7);
      latticeBalcony(c, 0.75, 1.7, 0.85, 30, 12);
      grille(c, 1.85, 0.55, 36);
      grille(c, 1.85, 0.55, 12);
    },
  },
  'msw-house-long': {
    // A long, low house with an arched doorway behind a courtyard wall.
    footprint: [4, 3],
    h: 36,
    side: true,
    draw(c) {
      townBlock(c, 0.15, 0.15, 3.7, 1.3, 26, 81, { plaster: 0.45 });
      beamEnds(c, 0.15, 1.45, 3.7, 22, 9);
      beamEndsSide(c, 3.85, 0.15, 1.3, 22, 3);
      archDoor(c, 1.6, 1.45, 0.55, 19);
      shutter(c, 'x', 0.55, 1.45, 12, 0.24, 6);
      shutter(c, 'x', 2.75, 1.45, 12, 0.24, 6);
      shutter(c, 'x', 3.3, 1.45, 12, 0.24, 6);
      // Swept courtyard and its low front wall with a gap at the door.
      c.top(0.15, 1.45, 3.7, 1.35, 0, MC.stone1);
      basket(c, 0.6, 2.0, 0, 4, 3, [MC.green0, MC.green1, MC.green2], 82);
      jar(c, 3.3, 1.9, 0, 3, 83);
      townBlock(c, 0.15, 2.6, 1.35, 0.25, 12, 84, { band: 4 });
      townBlock(c, 2.35, 2.6, 1.5, 0.25, 12, 85, { band: 4 });
      townBlock(c, 3.6, 1.45, 0.25, 1.15, 12, 86, { band: 4 });
    },
  },
  'msw-house-terrace': {
    // A house with an outside stair to a roof terrace under a frond shade.
    footprint: [3, 2],
    h: 48,
    side: true,
    draw(c) {
      townBlock(c, 0.15, 0.15, 2.0, 1.6, 26, 91, { plaster: 0.55 });
      beamEnds(c, 0.15, 1.75, 2.0, 22, 5);
      frontDoor(c, 0.9, 1.75, 0.42, 17, 92, true);
      shutter(c, 'x', 0.35, 1.75, 12, 0.24, 6);
      sideStair(c, 2.15, 0.25, 1.4, 24);
      for (const [u, v] of [
        [0.3, 0.3],
        [2.0, 0.3],
        [0.3, 1.6],
        [2.0, 1.6],
      ])
        pole(c, u, v, 26, 13);
      c.poly(
        [
          [0.2, 0.2, 40],
          [2.1, 0.2, 40],
          [2.1, 1.7, 38],
          [0.2, 1.7, 38],
        ],
        MK.roofA,
      );
      recolour(c, MK.roofA, (px, py) => reedShade(px, py, 93, 0.15, false));
      c.edge([0.2, 1.7, 38], [2.1, 1.7, 38], MC.reed3);
      for (let i = 0; i < 22; i++) {
        const [ex, ey] = c.at(0.2 + (1.9 * i) / 22, 1.7, 38);
        if (nhash(i, 94) < 0.5) c.p.pixel(ex, ey + 1, MC.reed2);
      }
    },
  },
  'msw-store': {
    // A small storehouse of bare coral stone, sacks piled at its door.
    footprint: [2, 2],
    h: 32,
    side: true,
    draw(c) {
      townBlock(c, 0.25, 0.2, 1.4, 1.3, 22, 101, { plaster: 2, band: 0 });
      frontDoor(c, 0.65, 1.5, 0.45, 16, 102);
      const [vx, vy] = c.at(1.652, 0.85, 16);
      c.p.rect(vx, vy - 3, 2, 3, MC.wood3);
      sack(c, 0.35, 1.75, 3.2, 7, 103);
      sack(c, 0.6, 1.9, 3, 6, 104);
      sack(c, 1.35, 1.8, 3.2, 7, 105);
      barrel(c, 1.75, 1.6, 0, 3, 7);
    },
  },
  'msw-tower-house': {
    // A slim three-storey tower-house: small windows on each floor, beam
    // ends at every level, a flat parapeted roof (no dome, no spire).
    footprint: [2, 2],
    h: 84,
    side: true,
    draw(c) {
      townBlock(c, 0.3, 0.3, 1.4, 1.35, 74, 111, { plaster: 0.5 });
      for (const z of [24, 48, 70]) {
        beamEnds(c, 0.3, 1.65, 1.4, z, 4);
        beamEndsSide(c, 1.7, 0.3, 1.35, z, 3);
      }
      frontDoor(c, 0.75, 1.65, 0.4, 17, 112);
      shutter(c, 'x', 0.5, 1.65, 32, 0.22, 7);
      shutter(c, 'x', 1.15, 1.65, 32, 0.22, 7);
      shutter(c, 'x', 0.85, 1.65, 56, 0.24, 7);
      grille(c, 1.7, 0.75, 36, 0.24, 7);
      grille(c, 1.7, 0.75, 58, 0.24, 6);
      spout(c, 1.4, 1.68, 73);
    },
  },
  'msw-house-a': {
    // One-room mud-brick house: a red-brick footing, a plank door, beam
    // ends under the parapet, a shuttered window and a grille.
    footprint: [2, 2],
    h: 40,
    side: true,
    draw(c) {
      townBlock(c, 0.15, 0.15, 1.7, 1.6, 30, 3);
      beamEnds(c, 0.15, 1.75, 1.7, 26, 5);
      beamEndsSide(c, 1.85, 0.15, 1.6, 26, 4);
      frontDoor(c, 0.75, 1.75, 0.42, 17, 41);
      shutter(c, 'x', 0.3, 1.75, 15, 0.22, 6);
      grille(c, 1.85, 0.6, 14);
      spout(c, 1.4, 1.78, 29);
    },
  },
  'msw-house-pink': {
    // A wider house rendered in pink lime plaster over a brick footing.
    footprint: [3, 2],
    h: 40,
    side: true,
    draw(c) {
      townBlock(c, 0.15, 0.2, 2.6, 1.55, 30, 7, { pink: true });
      beamEnds(c, 0.15, 1.75, 2.6, 26, 7);
      beamEndsSide(c, 2.75, 0.2, 1.55, 26, 4);
      frontDoor(c, 1.2, 1.75, 0.42, 17, 47);
      shutter(c, 'x', 0.45, 1.75, 14, 0.24, 6);
      shutter(c, 'x', 2.15, 1.75, 14, 0.24, 6);
      grille(c, 2.75, 0.65, 14);
      // Two jars by the door.
      jar(c, 1.85, 1.95, 0, 2.8, 48);
      jar(c, 2.05, 2.0, 0, 2.4, 49);
    },
  },
  'msw-house-b': {
    // Two storeys with a one-storey wing and a frond shade on its roof.
    footprint: [3, 2],
    h: 58,
    side: true,
    draw(c) {
      townBlock(c, 0.1, 0.15, 1.35, 1.65, 50, 11);
      townBlock(c, 1.45, 0.3, 1.45, 1.5, 28, 12);
      beamEnds(c, 0.1, 1.8, 1.35, 46, 4);
      beamEnds(c, 1.45, 1.8, 1.45, 24, 4);
      beamEndsSide(c, 2.9, 0.3, 1.5, 24, 4);
      shutter(c, 'x', 0.35, 1.8, 33, 0.26, 7);
      shutter(c, 'x', 0.85, 1.8, 33, 0.26, 7);
      frontDoor(c, 0.5, 1.8, 0.42, 18, 43);
      frontDoor(c, 2.1, 1.8, 0.38, 16, 44, true);
      grille(c, 2.9, 0.75, 12);
      shutter(c, 'y', 1.45, 0.45, 36, 0.3, 7);
      spout(c, 1.2, 1.83, 49);
      for (const [u, v] of [
        [1.6, 0.45],
        [2.75, 0.45],
        [1.6, 1.6],
        [2.75, 1.6],
      ])
        pole(c, u, v, 28, 12);
      c.poly(
        [
          [1.5, 0.4, 41],
          [2.85, 0.4, 41],
          [2.85, 1.7, 39],
          [1.5, 1.7, 39],
        ],
        MK.roofA,
      );
      recolour(c, MK.roofA, (px, py) => reedShade(px, py, 15, 0.15, false));
      c.edge([1.5, 1.7, 39], [2.85, 1.7, 39], MC.reed3);
    },
  },
  'msw-house-d': {
    // A long shop-house with a plank lean-to on posts over sacks and crates.
    footprint: [3, 2],
    h: 40,
    side: true,
    draw(c) {
      townBlock(c, 0.15, 0.15, 2.7, 1.2, 28, 17);
      beamEnds(c, 0.15, 1.35, 2.7, 24, 7);
      beamEndsSide(c, 2.85, 0.15, 1.2, 24, 3);
      frontDoor(c, 0.5, 1.35, 0.4, 17, 51, true);
      frontDoor(c, 1.9, 1.35, 0.4, 17, 52);
      sack(c, 1.2, 1.6, 3, 6, 53);
      sack(c, 1.45, 1.75, 3, 5, 54);
      crate(c, 2.45, 1.45, 0, 0.32, 0.35, [MC.red0, MC.red1, MC.wood3], 55);
      barrel(c, 0.3, 1.7, 0, 3, 7);
      pole(c, 0.2, 1.95, 0, 20);
      pole(c, 2.8, 1.95, 0, 20);
      c.poly(
        [
          [0.1, 1.35, 23],
          [2.9, 1.35, 23],
          [2.9, 2.0, 19],
          [0.1, 2.0, 19],
        ],
        MK.roofA,
      );
      recolour(c, MK.roofA, (px, py) => plankShade(px, py, 'y', 56, 0.25, 4));
      c.edge([0.1, 2.0, 19], [2.9, 2.0, 19], MC.wood3);
    },
  },
  'msw-house-c': {
    // A small house behind a low courtyard wall with a gateway.
    footprint: [3, 3],
    h: 40,
    side: true,
    draw(c) {
      townBlock(c, 0.15, 0.15, 1.6, 1.4, 30, 21);
      beamEnds(c, 0.15, 1.55, 1.6, 26, 4);
      beamEndsSide(c, 1.75, 0.15, 1.4, 26, 3);
      frontDoor(c, 0.7, 1.55, 0.4, 17, 45, true);
      c.top(0.15, 1.55, 2.7, 1.3, 0, MC.stone1);
      jar(c, 1.4, 1.9, 0, 3.2, 3);
      basket(c, 0.45, 1.95, 0, 4, 3, [MC.dateLight, MC.date, MC.wood3], 4);
      townBlock(c, 1.75, 0.2, 1.1, 0.25, 13, 23, { band: 4 });
      townBlock(c, 2.65, 0.45, 0.25, 2.4, 13, 24, { band: 4 });
      townBlock(c, 0.15, 2.6, 0.95, 0.25, 13, 25, { band: 4 });
      townBlock(c, 1.75, 2.6, 0.9, 0.25, 13, 26, { band: 4 });
      c.box(
        1.05,
        2.62,
        0.75,
        0.2,
        2,
        { top: MC.wood0, front: MC.wood1, side: MC.wood2, edge: MC.wood3 },
        13,
      );
    },
  },
  'msw-wall': {
    // A low mud-brick boundary wall on a brick footing.
    footprint: [2, 1],
    h: 18,
    side: true,
    draw(c) {
      townBlock(c, 0.05, 0.35, 1.9, 0.3, 13, 31, { band: 4 });
    },
  },
  'msw-stall': {
    // Market stall: a plank awning on posts over crates of red and green
    // produce, baskets beneath and a barrel at the side.
    footprint: [2, 1],
    h: 40,
    side: true,
    draw(c) {
      pole(c, 0.1, 0.1, 0, 32);
      pole(c, 1.9, 0.1, 0, 32);
      c.box(0.15, 0.25, 1.7, 0.55, 9, {
        top: MC.wood0,
        front: MC.wood1,
        side: MC.wood2,
        edge: MC.wood3,
      });
      crate(c, 0.25, 0.3, 9, 0.45, 0.45, [MC.red0, MC.red1, MC.brick3], 61);
      crate(c, 0.8, 0.3, 9, 0.45, 0.45, [MC.green0, MC.green1, MC.green2], 62);
      crate(c, 1.35, 0.3, 9, 0.42, 0.45, [MC.date0, MC.date1, MC.wood2], 63);
      basket(c, 0.45, 0.95, 0, 4, 3, [MC.green0, MC.green1, MC.green2], 64);
      basket(c, 1.0, 1.0, 0, 4, 3, [MC.red0, MC.red1, MC.brick3], 65);
      barrel(c, 1.95, 0.75, 0, 3, 7);
      pole(c, 0.1, 0.9, 0, 26);
      pole(c, 1.9, 0.9, 0, 26);
      c.poly(
        [
          [-0.05, 0.0, 34],
          [2.05, 0.0, 34],
          [2.05, 1.05, 27],
          [-0.05, 1.05, 27],
        ],
        MK.roofA,
      );
      recolour(c, MK.roofA, (px, py) => plankShade(px, py, 'x', 66, 0.25, 4));
      c.edge([-0.05, 1.05, 27], [2.05, 1.05, 27], MC.wood3);
    },
  },
  'msw-stall-b': {
    // A palm-frond stall with pots, grain sacks and hanging dates.
    footprint: [2, 1],
    h: 40,
    side: true,
    draw(c) {
      pole(c, 0.1, 0.1, 0, 32);
      pole(c, 1.9, 0.1, 0, 32);
      c.box(0.2, 0.3, 1.2, 0.5, 8, {
        top: MC.wood0,
        front: MC.wood1,
        side: MC.wood2,
        edge: MC.wood3,
      });
      jar(c, 0.4, 0.5, 8, 2.8, 71);
      jar(c, 0.75, 0.55, 8, 3.2, 72);
      basket(c, 1.15, 0.55, 8, 4, 3, [MC.green0, MC.green1, MC.green2], 73);
      sack(c, 1.65, 0.6, 3, 7, 74);
      sack(c, 1.6, 0.95, 3, 5, 75);
      pole(c, 0.1, 0.9, 0, 26);
      pole(c, 1.9, 0.9, 0, 26);
      c.poly(
        [
          [-0.05, 0.0, 34],
          [2.05, 0.0, 34],
          [2.05, 1.05, 27],
          [-0.05, 1.05, 27],
        ],
        MK.roofA,
      );
      recolour(c, MK.roofA, (px, py) => reedShade(px, py, 76, 0.2, false));
      c.edge([-0.05, 1.05, 27], [2.05, 1.05, 27], MC.reed3);
      for (let i = 0; i < 24; i++) {
        const [ex, ey] = c.at(-0.05 + (2.1 * i) / 24, 1.05, 27);
        if (nhash(i, 77) < 0.5) c.p.pixel(ex, ey + 1, MC.reed2);
      }
      // A bunch of dates hanging from the front beam.
      const [hx, hy] = c.at(1.0, 1.0, 27);
      c.line([hx, hy], [hx, hy + 4], MC.wood2);
      for (let i = 0; i < 9; i++)
        c.p.pixel(
          hx - 1 + (i % 3),
          hy + 4 + Math.floor(i / 3),
          i % 2 ? MC.date0 : MC.date1,
        );
    },
  },
  'msw-goods': {
    // Barrels, sacks, a basket and jars stacked against a wall.
    footprint: [1, 1],
    h: 26,
    draw(c) {
      barrel(c, 0.3, 0.3, 0, 3.4, 9);
      sack(c, 0.7, 0.3, 3, 7, 81);
      jar(c, 0.3, 0.75, 0, 3, 82);
      sack(c, 0.75, 0.75, 3.2, 6, 83);
      basket(c, 0.95, 0.95, 0, 3.5, 3, [MC.dateLight, MC.date, MC.wood3], 84);
    },
  },
  'msw-cart': {
    // A two-wheeled wooden cart with sacks, its shafts resting on the sand.
    footprint: [2, 1],
    h: 28,
    side: true,
    draw(c) {
      const [s0x, s0y] = c.at(1.3, 0.25, 9),
        [s1x, s1y] = c.at(2.1, 0.3, 0),
        [s2x, s2y] = c.at(1.3, 0.75, 9),
        [s3x, s3y] = c.at(2.1, 0.8, 0);
      c.line([s0x, s0y], [s1x, s1y], MC.wood2);
      c.box(
        0.1,
        0.15,
        1.25,
        0.75,
        4,
        {
          top: MC.wood0,
          front: MC.wood1,
          side: MC.wood2,
          edge: MC.wood3,
        },
        8,
      );
      c.faceX(0.1, 0.15, 1.25, 12, 3, MC.wood1);
      sack(c, 0.45, 0.45, 3.4, 7, 91);
      sack(c, 0.85, 0.5, 3.2, 6, 92);
      c.faceX(0.1, 0.9, 1.25, 12, 3, MC.wood0);
      c.line([s2x, s2y], [s3x, s3y], MC.wood1);
      // The near wheel: a rim, hub and spokes.
      const [wx, wy] = c.at(0.7, 0.95, 7);
      c.p.ellipse(wx, wy, 5.5, 7, MC.wood3);
      c.p.ellipse(wx, wy, 4.5, 6, MC.wood1);
      c.p.ellipse(wx, wy, 3.5, 5, MC.stone1);
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        c.line(
          [wx, wy],
          [wx + Math.cos(a) * 4, wy + Math.sin(a) * 5.2],
          MC.wood2,
        );
      }
      c.p.rect(wx - 1, wy - 1, 2, 2, MC.wood3);
    },
  },
  'msw-tent': {
    // A Bedouin tent of dark goat-hair cloth: a ridge on two poles sagging
    // between them, the long side sloping almost to the sand, the end open
    // on a shaded interior, ropes out to pegs.
    footprint: [3, 2],
    h: 36,
    side: true,
    draw(c) {
      const zr = (x: number) =>
          26 +
          5 * Math.max(0, 1 - Math.abs(x - 0.8) / 0.6) +
          5 * Math.max(0, 1 - Math.abs(x - 2.2) / 0.6),
        Y0 = 0.1,
        YR = 0.95,
        Y1 = 1.85,
        EAVE = 4;
      const cloth =
        (lift: number, seed: number) => (px: number, py: number) => {
          const k = Math.floor((py - px * 0.5) / 5);
          let v =
            lift +
            (nhash(k, 0, seed) - 0.5) * 0.25 +
            (nhash(px, py, seed + 1) - 0.5) * 0.12;
          if ((((py - px * 0.5) % 5) + 5) % 5 < 0.8) v -= 0.25;
          return tone(TENT, v, [0.3, -0.1, -0.45]);
        };
      // The near end (facing +x): a gable of cloth with an open doorway.
      const ridgeEnd = zr(2.9);
      c.poly(
        [
          [2.9, Y0, EAVE],
          [2.9, YR, ridgeEnd],
          [2.9, Y1, EAVE],
          [2.9, Y1, 0],
          [2.9, Y0, 0],
        ],
        MK.side,
      );
      recolour(c, MK.side, cloth(-0.45, 111));
      c.poly(
        [
          [2.902, YR - 0.35, 0],
          [2.902, YR, ridgeEnd - 6],
          [2.902, YR + 0.35, 0],
        ],
        MC.tent3,
      );
      c.poly(
        [
          [2.903, YR + 0.12, 0],
          [2.903, YR, ridgeEnd - 8],
          [2.903, YR + 0.08, 0],
        ],
        MC.wood3,
      );
      // A rolled rug and a cushion just inside.
      const [ix, iy] = c.at(2.88, YR + 0.1, 1);
      c.p.rect(ix - 2, iy - 2, 4, 2, MC.brick1);
      c.p.rect(ix - 2, iy - 2, 4, 1, MC.brick0);
      // The long front slope from the ridge down to the eave.
      const ridge: [number, number, number][] = [];
      for (let i = 0; i <= 28; i++) {
        const u = 0.1 + (2.8 * i) / 28;
        ridge.push([u, YR, zr(u)]);
      }
      c.poly([...ridge, [2.9, Y1, EAVE], [0.1, Y1, EAVE]], MK.roofA);
      recolour(c, MK.roofA, cloth(0.05, 112));
      for (let i = 0; i < 28; i++) c.edge(ridge[i], ridge[i + 1], MC.tent0);
      c.edge([0.1, Y1, EAVE], [2.9, Y1, EAVE], MC.tent3);
      // A short skirt hangs below the eave.
      c.faceX(0.1, Y1, 2.8, 0, EAVE, MC.tent2);
      // Pole tips above the ridge, guy ropes and pegs.
      for (const u of [0.8, 2.2]) {
        const [px, py] = c.at(u, YR, zr(u));
        c.p.rect(px, py - 3, 1, 3, MC.wood1);
      }
      for (const [a, b] of [
        [
          [0.1, YR, zr(0.1)],
          [-0.45, YR, 0],
        ],
        [
          [2.9, YR, zr(2.9)],
          [3.45, YR, 0],
        ],
        [
          [0.8, Y1, EAVE],
          [0.8, 2.25, 0],
        ],
        [
          [2.2, Y1, EAVE],
          [2.2, 2.25, 0],
        ],
      ] as [[number, number, number], [number, number, number]][]) {
        c.edge(a, b, MC.sack2);
        const [px, py] = c.at(...b);
        c.p.rect(px, py - 2, 1, 2, MC.wood2);
      }
    },
  },
  'msw-garden': {
    // A small vegetable plot: a mud border round rows of greens and peppers.
    footprint: [2, 2],
    h: 10,
    shadow: false,
    draw(c) {
      c.box(0.1, 0.1, 1.8, 1.8, 2, {
        top: MC.soil1,
        front: MC.stone3,
        side: MC.stone4,
        edge: MC.stone5,
      });
      c.top(0.2, 0.2, 1.6, 1.6, 2, MC.soil0);
      for (let row = 0; row < 5; row++) {
        const v = 0.35 + row * 0.3;
        c.edge([0.25, v + 0.06, 2], [1.75, v + 0.06, 2], MC.soil1);
        for (let k = 0; k < 6; k++) {
          const [px, py] = c.at(0.35 + k * 0.27, v, 2);
          const red = row === 2 && k % 2 === 0;
          c.p.rect(px - 2, py - 2, 4, 2, MC.green1);
          c.p.rect(px - 1, py - 3, 2, 1, MC.green0);
          c.p.pixel(px + 1, py - 1, MC.green2);
          if (red) c.p.pixel(px, py - 1, MC.red0);
        }
      }
    },
  },
  'msw-well': {
    // A round stone well with a wooden frame, pulley, rope and bucket.
    footprint: [1, 1],
    h: 40,
    draw(c) {
      const [cx, cy] = c.at(0.5, 0.5, 0),
        rx = 10,
        h = 10;
      for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
        const u = (i + 0.5 - cx) / rx;
        if (Math.abs(u) > 1) continue;
        const half = (rx / 2) * Math.sqrt(1 - u * u);
        for (let j = Math.floor(cy - h - half); j <= cy + half; j++) {
          const ring = Math.floor((cy + half - j) / 3),
            joint = Math.floor((u + 1) * 4 + (ring % 2) * 0.5);
          let v = -u * 0.6 + (nhash(joint, ring, 71) - 0.5) * 0.3;
          if (
            (cy + half - j) % 3 < 1 ||
            ((u + 1) * 4 + (ring % 2) * 0.5) % 1 < 0.12
          )
            v -= 0.6;
          c.p.pixel(i, j, tone(CORAL, v, [0.55, 0.2, -0.1, -0.4, -0.7]));
        }
      }
      c.p.ellipse(cx, cy - h, rx, rx / 2, MC.plaster1);
      c.p.ellipse(cx, cy - h, rx - 2, rx / 2 - 1, MC.stone4);
      c.p.ellipse(cx, cy - h + 0.5, rx - 3, rx / 2 - 1.5, NC.sea5);
      c.p.ellipse(cx - 1, cy - h + 1, 3, 1, NC.sea4);
      pole(c, 0.12, 0.5, 8, 26);
      pole(c, 0.88, 0.5, 8, 26);
      const [ax, ay] = c.at(0.12, 0.5, 34),
        [bx, by] = c.at(0.88, 0.5, 34);
      c.thick([ax, ay], [bx, by], 1, MC.wood2);
      c.line([ax, ay - 1], [bx, by - 1], MC.wood0);
      const [px, py] = c.at(0.5, 0.5, 33);
      c.p.ellipse(px, py, 2.5, 2.5, MC.wood1);
      c.p.pixel(px, py, MC.wood3);
      c.line([px + 2, py], [px + 3, cy - h - 3], MC.reed2);
      c.p.rect(px + 1, cy - h - 4, 5, 4, MC.wood2);
      c.p.rect(px + 1, cy - h - 4, 5, 1, MC.wood0);
      c.box(0.84, 0.45, 0.15, 0.5, 5, {
        top: MC.stone4,
        front: MC.stone2,
        side: MC.stone3,
        edge: MC.stone5,
      });
    },
  },
  'msw-palm': {
    // A date palm as in the references: a scarred trunk, clusters of
    // dates and arching green fronds.
    footprint: [1, 1],
    h: 92,
    pad: 36,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      datePalm(c, x, y, 70, 5, 1);
    },
  },
  'msw-palms': {
    // Two date palms grown together, one leaning out.
    footprint: [1, 1],
    h: 96,
    pad: 40,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      datePalm(c, x + 4, y - 1, 58, 12, 2);
      datePalm(c, x - 3, y + 1, 76, -6, 3);
    },
  },
  'msw-acacia': {
    // Umbrella-thorn acacia: a thin forked trunk under a flat canopy.
    footprint: [1, 1],
    h: 66,
    pad: 40,
    detail: { grain: 0 },
    draw(c) {
      const [x, y] = c.at(0.5, 0.5, 0);
      const bark = [NC.bark1, NC.bark2, NC.bark3, NC.bark3] as const;
      trunk(c, x, y, 22, 4, 3, bark);
      branch(c, x, y - 20, x - 24, y - 46, 1.6, bark);
      branch(c, x, y - 20, x + 22, y - 48, 1.6, bark);
      branch(c, x - 1, y - 22, x - 5, y - 50, 1.3, bark);
      branch(c, x - 13, y - 33, x - 32, y - 45, 1, bark);
      branch(c, x + 11, y - 35, x + 32, y - 46, 1, bark);
      flatCanopy(c, x - 1, y - 50, 40, 7, 141, -0.1);
      flatCanopy(c, x - 6, y - 56, 26, 5, 142, 0.15);
      flatCanopy(c, x + 14, y - 54, 16, 4, 143, 0.1);
    },
  },
  'msw-nets': {
    // Fishing nets hung to dry between poles, with floats along the top.
    footprint: [2, 1],
    h: 34,
    side: true,
    draw(c) {
      pole(c, 0.12, 0.5, 0, 30);
      pole(c, 1.88, 0.5, 0, 30);
      const [ax, ay] = c.at(0.12, 0.5, 28),
        [bx, by] = c.at(1.88, 0.5, 28);
      const sag = (t: number) => Math.sin(Math.PI * t) * 3;
      const n = Math.ceil(bx - ax);
      // The hanging net: a diamond mesh fading toward a ragged bottom.
      for (let i = 0; i <= n; i++) {
        const t = i / n,
          x = ax + (bx - ax) * t,
          yTop = ay + (by - ay) * t + sag(t),
          drop = 16 + Math.sin(t * 7) * 2 + nhash(i, 101) * 2;
        for (let k = 0; k < drop; k++) {
          const m = (i + k) % 4 === 0 || (i - k + 400) % 4 === 0;
          if (m) c.p.pixel(x, yTop + k, k > drop - 3 ? MC.netLight : MC.net);
        }
        if (i % 5 === 2) c.p.rect(x - 1, yTop - 1, 2, 2, MC.float);
      }
      c.line([ax, ay], [bx, by], MC.wood2);
      // A heap of net on the ground with a few floats.
      const [hx, hy] = c.at(1.1, 0.95, 0);
      for (let py = hy - 4; py <= hy + 2; py++)
        for (let px = hx - 9; px <= hx + 9; px++) {
          const e = ((px - hx) / 9) ** 2 + ((py - hy + 1) / 3.5) ** 2;
          if (e > 1) continue;
          if ((px + py) % 2 === 0 || nhash(px, py, 102) < 0.3)
            c.p.pixel(px, py, e < 0.5 ? MC.net : MC.netLight);
        }
      c.p.rect(hx - 4, hy - 2, 2, 2, MC.float);
      c.p.rect(hx + 3, hy - 1, 2, 2, MC.float);
    },
  },
  'msw-dhow': {
    // A lateen-rigged dhow: a raked mast, a long yard and a triangular
    // sail that fills between the frames; the hull bobs on its own shadow.
    footprint: [3, 1],
    h: 66,
    pad: 26,
    frames: 2,
    period: 48,
    detail: { grain: 0 },
    shadow: false,
    draw(c, f) {
      const zb = f ? 1 : 0,
        HULL = 12 + zb;
      // Shadow and dark water along the hull, a wake behind the stern.
      for (let py = 0; py < c.p.height; py++)
        for (let px = 0; px < c.p.width; px++) {
          const [ax, ay] = c.at(0, 0, 0),
            X = (px + 0.5 - ax) / 16,
            S = (py + 0.5 - ay) / 8,
            x = (S + X) / 2,
            y = (S - X) / 2,
            e = Math.hypot((x - 1.55) / 1.45, (y - 0.55) / 0.3);
          if (e < 1 - nhash(px >> 1, py, 150 + f) * 0.15)
            c.p.pixel(px, py, e < 0.7 ? SEA[4] : SEA[3]);
          else if (e < 1.18 && nhash(px, py, 151 + f) < 0.4)
            c.p.pixel(px, py, (px + f) % 3 ? SEA[1] : SEA[0]);
        }
      for (let k = 0; k < 14; k++) {
        const [wx, wy] = c.at(-0.15 - k * 0.09, 0.45 + ((k * 7) % 5) * 0.04, 0);
        if ((k + f) % 2 === 0) c.p.pixel(wx, wy, SEA[0]);
      }
      // Hull: high stern (left), sweeping sheer to a raked bow (right).
      c.poly(
        [
          [0.15, 0.75, HULL + 6],
          [1.2, 0.8, HULL],
          [2.4, 0.78, HULL + 1],
          [3.0, 0.55, HULL + 6],
          [2.75, 0.55, 2 + zb],
          [2.2, 0.72, 1 + zb],
          [0.45, 0.72, 2 + zb],
          [0.2, 0.74, 5 + zb],
        ],
        MK.hull,
      );
      c.poly(
        [
          [0.15, 0.35, HULL + 6],
          [1.2, 0.3, HULL],
          [2.4, 0.32, HULL + 1],
          [3.0, 0.55, HULL + 6],
          [2.4, 0.78, HULL + 1],
          [1.2, 0.8, HULL],
          [0.15, 0.75, HULL + 6],
        ],
        MK.deck,
      );
      const [hax, hay] = c.at(0, 0.75, 0);
      recolour(c, MK.hull, (px, py) => {
        const z = hay + (px - hax) / 2 - py;
        if (z < 4 + zb) return MC.wood3;
        if (Math.floor(z) % 3 === 0) return MC.wood2;
        return nhash(px >> 2, Math.floor(z / 3), 152) < 0.3
          ? MC.wood1
          : MC.wood0;
      });
      recolour(c, MK.deck, (px, py) => plankShade(px, py, 'x', 153, 0.25));
      c.edge([0.15, 0.75, HULL + 6], [1.2, 0.8, HULL], MC.wood3);
      c.edge([1.2, 0.8, HULL], [2.4, 0.78, HULL + 1], MC.wood3);
      c.edge([2.4, 0.78, HULL + 1], [3.0, 0.55, HULL + 6], MC.wood3);
      // Stern platform and a rolled mat.
      c.box(
        0.2,
        0.4,
        0.35,
        0.3,
        3,
        {
          top: MC.wood0,
          front: MC.wood1,
          side: MC.wood2,
          edge: MC.wood3,
        },
        HULL + 4,
      );
      basket(c, 1.0, 0.55, HULL, 3, 2, REED, 154);
      // Mast raked toward the bow, and the long yard.
      const [mx, my] = c.at(1.75, 0.55, HULL),
        [tx, ty] = c.at(1.9, 0.55, 38);
      c.thick([mx, my], [tx, ty], 1, MC.wood2);
      const tack: [number, number, number] = [3.05, 0.55, HULL + 8],
        peak: [number, number, number] = [-0.3, 0.55, 62],
        clew: [number, number, number] = [0.55, 0.62, HULL + 8],
        belly = 0.22 + (f ? 0.06 : 0);
      c.poly(
        [
          tack,
          peak,
          [0.05, 0.6 + belly * 0.7, 36],
          clew,
          [1.8, 0.6 + belly, HULL + 10],
        ],
        MK.sail,
      );
      const [kx, ky] = c.at(...tack),
        [qx, qy] = c.at(...peak);
      recolour(c, MK.sail, (px, py) => {
        // Lighter toward the luff (yard), seams parallel to it.
        const lx = qx - kx,
          ly = qy - ky,
          ll = Math.hypot(lx, ly),
          d = ((px - kx) * ly - (py - ky) * lx) / ll;
        let v = 0.55 - d * 0.03 + (f ? 0.04 : 0);
        if (Math.floor(d) % 6 === 0 && d > 2) v -= 0.25;
        return tone(
          [NC.sail0, NC.sail1, NC.sail2, NC.sail3],
          v,
          [0.42, 0.15, -0.1],
        );
      });
      c.thick([kx, ky], [qx, qy], 1, MC.wood1);
      c.line([kx, ky - 1], [qx, qy - 1], MC.wood0);
      // Sheet from the clew to the stern.
      const [cx2, cy2] = c.at(...clew),
        [sx, sy] = c.at(0.3, 0.6, HULL + 6);
      c.line([cx2, cy2], [sx, sy], MC.wood2);
      const [hx, hy] = c.at(1.9, 0.55, 38);
      c.line([hx, hy], [sx, sy], MC.wood2);
    },
  },
  'msw-dhow-beached': {
    // A dhow drawn up on the sand, its yard lowered along the hull, propped
    // with timbers and tied to a stake.
    footprint: [3, 1],
    h: 44,
    side: true,
    draw(c) {
      for (const u of [0.8, 1.9]) {
        const [ax, ay] = c.at(u, 1.0, 0),
          [bx, by] = c.at(u, 0.8, 6);
        c.line([ax, ay], [bx, by], MC.wood2);
      }
      dhowHull(c, 0.1, 3.0, 0.5, 0.75, 0, 13, 161);
      const [mx, my] = c.at(1.75, 0.5, 6),
        [tx, ty] = c.at(1.85, 0.5, 40);
      c.thick([mx, my], [tx, ty], 1, MC.wood2);
      const [ax, ay] = c.at(0.4, 0.35, 21),
        [bx, by] = c.at(2.8, 0.45, 17);
      c.thick([ax, ay], [bx, by], 1.5, NC.sail2);
      c.line([ax, ay - 2], [bx, by - 2], NC.sail0);
      c.line([ax, ay + 1], [bx, by + 1], MC.wood1);
      const [sx, sy] = c.at(3.3, 0.6, 0);
      c.p.rect(sx, sy - 5, 2, 5, MC.wood2);
      const [rx, ry] = c.at(2.95, 0.5, 18);
      c.line([rx, ry], [sx + 1, sy - 4], MC.reed2);
    },
  },
  'msw-jetty': {
    // A small timber jetty on posts, its far end standing in the water.
    footprint: [3, 1],
    h: 16,
    shadow: false,
    draw(c) {
      for (const u of [0.25, 1.15, 2.05, 2.85])
        for (const v of [0.18, 0.82]) {
          const [px, py] = c.at(u, v, 0);
          if (u > 1)
            waterRing(c, px, py + 1, 4, 2, 0, 171 + Math.round(u * 10));
          c.p.rect(px - 1, py - 8, 2, 10, MC.wood2);
          c.p.pixel(px - 1, py - 8, MC.wood0);
        }
      c.top(0, 0.1, 3, 0.8, 6, MK.deck);
      c.faceX(0, 0.9, 3, 5, 1, MC.wood2);
      c.faceY(3, 0.1, 0.8, 5, 1, MC.wood3);
      recolour(c, MK.deck, (px, py) => plankShade(px, py, 'y', 172, 0.2, 4));
      // A coil of rope and a mooring post at the end.
      const [rx, ry] = c.at(2.5, 0.5, 6);
      c.p.ellipse(rx, ry, 3, 1.5, MC.reed2);
      c.p.ellipse(rx, ry, 1.5, 0.7, MC.reed3);
      pole(c, 2.9, 0.15, 6, 6);
    },
  },
  // A fish leaps now and then (12 frames over 5 s: calm, leap, splash).
  'msw-fish-jump': {
    footprint: [1, 1],
    h: 22,
    frames: 12,
    period: 60,
    detail: false,
    shadow: false,
    draw(c: IsoCanvas, f: number) {
      const k = f,
        [x, y] = c.at(0.5, 0.5, 0);
      const ring = (r: number, col: string, gap = 0.4) => {
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * Math.PI * 2;
          if (nhash(i, Math.round(r * 10), 181) < gap) continue;
          c.p.pixel(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, col);
        }
      };
      if (k <= 8) {
        // Rings spreading after the last leap, then calm water.
        if (k < 4) ring(3 + k * 2, k < 2 ? SEA[0] : SEA[1], 0.35 + k * 0.1);
        c.p.pixel(x - 1, y, SEA[1]);
        c.p.pixel(x + 1, y, SEA[1]);
        return;
      }
      if (k === 9) {
        // Breaking the surface: head up, a crown of droplets.
        ring(3, SEA[0], 0.3);
        c.p.rect(x - 1, y - 6, 3, 5, MC.fish1);
        c.p.rect(x - 1, y - 6, 1, 4, MC.fish0);
        c.p.rect(x + 1, y - 5, 1, 4, MC.fish3);
        for (const [dx, dy] of [
          [-4, -3],
          [4, -2],
          [-3, -6],
          [3, -7],
        ])
          c.p.pixel(x + dx, y + dy, SEA[0]);
        return;
      }
      if (k === 10) {
        // Mid-leap: an arched silver body over the ripples.
        ring(4, SEA[1], 0.45);
        const pts: [number, number][] = [];
        for (let i = 0; i <= 8; i++)
          pts.push([x - 4 + i, y - 10 - Math.sin((i / 8) * Math.PI) * 3]);
        for (const [i, [px, py]] of pts.entries()) {
          const w = i < 2 || i > 6 ? 1 : 2;
          c.p.rect(px, py, 1, w + 1, MC.fish1);
          c.p.pixel(px, py, i > 6 ? MC.fish2 : MC.fish3);
          c.p.pixel(px, py + w, MC.fish0);
        }
        c.p.pixel(x - 5, y - 11, MC.fish2);
        c.p.pixel(x - 5, y - 9, MC.fish2);
        c.p.pixel(x + 4, y - 10, C.ink);
        for (const [dx, dy] of [
          [-6, -6],
          [-3, -4],
          [6, -5],
        ])
          c.p.pixel(x + dx, y + dy, SEA[0]);
        return;
      }
      // Splash: a burst of white water.
      for (let i = 0; i < 18; i++) {
        const a = Math.PI * (0.1 + (i / 17) * 0.8),
          r = 2 + nhash(i, 182) * 5;
        c.p.pixel(
          x + Math.cos(a) * r * 1.4,
          y - Math.sin(a) * r,
          i % 3 ? SEA[0] : C.white,
        );
      }
      ring(4, SEA[0], 0.2);
    },
  },
  'msw-dhow-repair': {
    // A dhow hauled up for repair: propped on timbers, a run of planks off
    // its side, new boards on trestles and offcuts in the sand.
    footprint: [3, 2],
    h: 48,
    side: true,
    draw(c) {
      c.box(0.4, 0.05, 1.6, 0.22, 3, {
        top: MC.wood0,
        front: MC.wood1,
        side: MC.wood2,
        edge: MC.wood3,
      });
      c.box(
        0.5,
        0.05,
        1.4,
        0.22,
        2,
        { top: MC.wood0, front: MC.wood1, side: MC.wood2 },
        3,
      );
      for (const u of [0.6, 1.4, 2.2]) {
        const [ax, ay] = c.at(u, 1.45, 0),
          [bx, by] = c.at(u, 1.15, 7);
        c.line([ax, ay], [bx, by], MC.wood2);
        c.line([ax + 1, ay], [bx + 1, by], MC.wood1);
      }
      dhowHull(c, 0.1, 3.0, 0.85, 0.8, 2, 15, 191, true);
      const [mx, my] = c.at(1.75, 0.85, 8),
        [tx, ty] = c.at(1.85, 0.85, 42);
      c.thick([mx, my], [tx, ty], 1, MC.wood2);
      for (const u of [0.7, 1.5]) {
        const [px, py] = c.at(u, 1.8, 0);
        c.line([px - 2, py], [px, py - 6], MC.wood2);
        c.line([px + 2, py], [px, py - 6], MC.wood2);
      }
      c.box(
        0.55,
        1.72,
        1.1,
        0.14,
        1,
        { top: MC.wood0, front: MC.wood1, side: MC.wood2 },
        6,
      );
      for (const [u, v, k] of [
        [2.3, 1.75, 0],
        [2.65, 1.55, 1],
        [0.25, 1.9, 2],
      ]) {
        const [px, py] = c.at(u, v, 0);
        c.p.rect(px - 3, py - 1, 7, 2, k % 2 ? MC.wood1 : MC.wood0);
        c.p.rect(px - 3, py, 7, 1, MC.wood2);
      }
    },
  },
  'msw-rowboat': {
    // A small rowing boat at anchor, oars shipped, bobbing on its shadow.
    footprint: [2, 1],
    h: 20,
    pad: 18,
    frames: 2,
    period: 48,
    detail: { grain: 0 },
    shadow: false,
    draw(c, f) {
      const zb = f ? 1 : 0,
        H = 6 + zb;
      for (let py = 0; py < c.p.height; py++)
        for (let px = 0; px < c.p.width; px++) {
          const [ax, ay] = c.at(0, 0, 0),
            X = (px + 0.5 - ax) / 16,
            S = (py + 0.5 - ay) / 8,
            x = (S + X) / 2,
            y = (S - X) / 2,
            e = Math.hypot((x - 1.0) / 0.95, (y - 0.5) / 0.32);
          if (e < 1 - nhash(px >> 1, py, 195 + f) * 0.15)
            c.p.pixel(px, py, e < 0.7 ? SEA[4] : SEA[3]);
          else if (e < 1.2 && nhash(px, py, 196 + f) < 0.35)
            c.p.pixel(px, py, (px + f) % 3 ? SEA[1] : SEA[0]);
        }
      c.poly(
        [
          [0.15, 0.68, H + 2],
          [1.0, 0.72, H],
          [1.85, 0.5, H + 3],
          [1.7, 0.5, 1 + zb],
          [1.0, 0.62, zb],
          [0.25, 0.62, 1 + zb],
        ],
        MK.hull,
      );
      c.poly(
        [
          [0.15, 0.32, H + 2],
          [1.0, 0.28, H],
          [1.85, 0.5, H + 3],
          [1.0, 0.72, H],
          [0.15, 0.68, H + 2],
        ],
        MK.deck,
      );
      const [hax, hay] = c.at(0, 0.68, 0);
      recolour(c, MK.hull, (px, py) => {
        const z = hay + (px - hax) / 2 - py;
        if (z < 2 + zb) return MC.wood3;
        return Math.floor(z) % 2 === 0 ? MC.wood2 : MC.wood0;
      });
      recolour(c, MK.deck, (px, py) => plankShade(px, py, 'y', 197, -0.1, 3));
      c.edge([0.15, 0.68, H + 2], [1.0, 0.72, H], MC.wood3);
      c.edge([1.0, 0.72, H], [1.85, 0.5, H + 3], MC.wood3);
      // A thwart and two oars lying fore and aft.
      c.edge([0.95, 0.32, H], [0.95, 0.68, H], MC.wood1);
      c.edge([0.3, 0.45, H + 1], [1.65, 0.45, H + 1], MC.wood0);
      c.edge([0.35, 0.55, H + 1], [1.6, 0.55, H + 1], MC.wood1);
    },
  },
};
Object.assign(objects, massawa);

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
    // Floor796-style finishing: outlines, rim light, grain, contact shading.
    if (s.detail !== false)
      detailPass(
        c.p,
        s.floor
          ? {
              outline: false,
              rim: false,
              contact: false,
              grain: 0.006,
              ...s.detail,
            }
          : { ...s.detail },
      );
    if (!s.floor && s.shadow !== false) groundShadow(c, w, d);
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
        ...(s.period ? { period: s.period } : {}),
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

/*
 * Floor tiles (32×16 diamonds). Each pixel is mapped back to tile-local
 * coordinates (u, v) in [0, 1), so planks, grout, bricks and ripples follow the
 * tile axes. Upper edges catch the light, lower edges and grout sit in shade.
 */
const tileHash = (x: number, y: number, n: number) => {
  let h = Math.imul(x * 73856093 + y * 19349663 + n * 83492791, 2654435761);
  h ^= h >>> 15;
  return ((h >>> 0) % 1000) / 1000;
};
type TileTexture = (u: number, v: number, x: number, y: number) => string;
function texturedTile(n: number, tex: TileTexture) {
  const p = new Pixels(32, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 32; x++) {
      const px = x + 0.5,
        py = y + 0.5;
      const a = (px - 16) / 16,
        b = py / 8,
        u = (a + b) / 2,
        v = (b - a) / 2;
      if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
      p.pixel(x, y, tex(u, v, x, y));
    }
  void n;
  return p;
}
/**
 * Smooth value noise over the tile, periodic in u and v with period `k`
 * cells, so neighbouring tiles join without seams. Gives soft patches
 * (veining, wear, damp) instead of salt-and-pepper speckle.
 */
function tileNoise(u: number, v: number, k: number, seed: number, kv = k) {
  const fu = u * k,
    fv = v * kv,
    iu = Math.floor(fu),
    iv = Math.floor(fv),
    s = (t: number) => t * t * (3 - 2 * t),
    tu = s(fu - iu),
    tv = s(fv - iv),
    g = (a: number, b: number) =>
      tileHash(((a % k) + k) % k, ((b % kv) + kv) % kv, seed);
  const top = g(iu, iv) * (1 - tu) + g(iu + 1, iv) * tu,
    bottom = g(iu, iv + 1) * (1 - tu) + g(iu + 1, iv + 1) * tu;
  return top * (1 - tv) + bottom * tv;
}
/**
 * Stone/ceramic slab: dark grout on the lower edges, a lit bevel on the upper
 * ones, soft tonal patches inside and only a rare chip.
 */
function slab(
  base: string,
  n: number,
  divisions = 1,
  chips = 0.012,
  mottle?: string,
  patch = 0.66,
): TileTexture {
  const grout = darker(base),
    bevel = lighter(base),
    shade = darker(base);
  return (u, v, x, y) => {
    const su = (u * divisions) % 1,
      sv = (v * divisions) % 1,
      cell = Math.floor(u * divisions) * 7 + Math.floor(v * divisions);
    if (su > 0.94 || sv > 0.94) return grout;
    if (su < 0.06 || sv < 0.06) return bevel;
    // Each slab gets its own patch pattern.
    if (mottle && tileNoise(u, v, 4, n * 13 + cell) > patch) return mottle;
    if (tileHash(x, y, n) < chips) return shade;
    return base;
  };
}
export function renderModernTile(n: number) {
  switch (n) {
    // 1–3: courtyard stone in three warm variants, 6: pale stone paving.
    case 1:
      return texturedTile(n, slab(C.ivory, n, 1, 0.01, C.paper));
    case 2:
      return texturedTile(n, slab(C.paper, n, 1, 0.012, C.ivory, 0.7));
    case 3:
      return texturedTile(n, slab(C.stone, n, 2, 0.01, C.offwhite, 0.88));
    case 6:
      return texturedTile(n, slab(C.stone, n, 1, 0.012));
    case 4: {
      // Garden grass: short upright blades (dark base, mid stem, light tip)
      // over a soft two-tone lawn.
      return texturedTile(n, (u, v, x, y) => {
        const blade = (yy: number) => tileHash(x, yy, n) < 0.07;
        if (blade(y)) return C.grassDark;
        if (blade(y + 1)) return C.grassMid;
        if (blade(y + 2) && tileHash(x, y, n + 5) < 0.5) return C.grassLight;
        return tileNoise(u, v, 2, 41) > 0.68 ? C.grassMid : C.grass;
      });
    }
    case 5: {
      // Water: wavy ripple bands bent by noise, sparse bright glints.
      return texturedTile(n, (u, v, x, y) => {
        const bend = tileNoise(u, v, 2, 57) * 0.5,
          w = (u * 2 + v + bend) % 1,
          deep = tileNoise(u, v, 2, 61);
        if (w < 0.04) return C.waterLight;
        if (w < 0.1) return C.water;
        if (tileHash(x, y, n) < 0.01) return C.white;
        return deep > 0.74 && w > 0.5 ? C.deepTeal : C.turquoise;
      });
    }
    case 7:
      return texturedTile(
        n,
        slab(C.concrete, n, 1, 0.02, C.concreteShade, 0.86),
      );
    case 14:
      // Baitul Mukarram's white marble plaza: large slabs, thin dark grout,
      // soft grey veining.
      return texturedTile(n, (u, v, x, y) => {
        if (u > 0.965 || v > 0.965) return C.grey;
        if (u < 0.03 || v < 0.03) return C.white;
        const vein = tileNoise(u, v, 3, 141);
        if (vein > 0.78 && tileHash(x, y, n) < 0.5) return C.pale;
        if (vein < 0.12) return C.offwhite;
        return tileHash(x, y, n + 3) < 0.004 ? C.silver : C.white;
      });
    case 15:
      // Packed-earth school yard: dusty patches, pebbles and scuffs.
      return texturedTile(n, (u, v, x, y) => {
        const patch = tileNoise(u, v, 3, 151);
        if (tileHash(x, y, n) < 0.02) return C.sandDark;
        if (tileHash(x, y, n + 9) < 0.015) return C.clay;
        return patch > 0.66 ? C.sandShade : patch < 0.2 ? C.paper : C.sand;
      });
    case 8:
      // Square pavers, four to a tile.
      return texturedTile(
        n,
        slab(C.warmGrey, n, 2, 0.012, C.warmGreyLight, 0.74),
      );
    case 9: {
      // Oak boards running along u, three per tile: long grain streaks,
      // staggered board ends, a lit upper edge and a dark seam.
      const grain = darker(C.oak),
        seam = darker(C.wood);
      return texturedTile(n, (u, v) => {
        const band = Math.floor(v * 3),
          bv = (v * 3) % 1,
          end = (u + band * 0.37) % 1;
        if (bv > 0.86 || end > 0.96) return seam;
        if (bv < 0.14) return C.woodLight;
        // Stretched noise: streaks run along the board.
        const streak = tileNoise(u, v, 2, 90 + band, 12);
        if (streak > 0.7) return grain;
        if (streak < 0.18) return C.woodLight;
        return C.oak;
      });
    }
    case 10:
      // White lab ceramic, four tiles with crisp grout.
      return texturedTile(n, slab(C.labTile, n, 2, 0));
    case 11: {
      // Clinic vinyl: welded seams and a soft cloudy pattern.
      return texturedTile(n, (u, v, x, y) => {
        if (u > 0.95 || v > 0.95) return C.vinylDark;
        const cloud = tileNoise(u, v, 4, 71);
        if (cloud > 0.7) return C.vinylLight;
        if (tileHash(x, y, n) < 0.015) return C.vinylDark;
        return C.vinyl;
      });
    }
    case 12: {
      // Asphalt: worn patches, sparse grit, a hairline crack.
      return texturedTile(n, (u, v, x, y) => {
        const h = tileHash(x, y, n),
          wear = tileNoise(u, v, 4, 83);
        if (Math.abs(u - 0.55 - v * 0.2) < 0.02 && v > 0.3 && v < 0.7)
          return C.asphaltDark;
        if (h < 0.035) return C.asphaltDark;
        if (h > 0.97 || (wear > 0.76 && h > 0.4)) return C.asphaltLight;
        return C.asphalt;
      });
    }
    case 13: {
      // Terracotta brick paving in running bond, each brick a touch different.
      return texturedTile(n, (u, v) => {
        const row = Math.floor(v * 4),
          rv = (v * 4) % 1,
          bu = u * 2 + (row % 2) * 0.5,
          ru = bu % 1,
          brick = tileHash(Math.floor(bu) % 2, row, n);
        if (rv > 0.8 || ru > 0.9) return C.terracottaDark;
        if (rv < 0.18 || ru < 0.06) return C.terracottaLight;
        return brick > 0.82 ? darker(C.terracotta) : C.terracotta;
      });
    }
    default:
      throw Error(`No tile ${n}`);
  }
}
export async function generateModernTiles() {
  for (let n = 1; n <= 15; n++)
    await png(`art/tiles/tile-${n}.png`, renderModernTile(n));
}
