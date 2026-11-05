import { Pixels, type PixelImage } from '../../packages/shared/pixels';
import { png, readJson, writeJson } from '../build/io';
import type { ObjectArt } from './objects';
import { detailPass, groundShadow } from './iso-draw';
type P = [number, number];
const C = {
  ivory: '#F5EEDB',
  paper: '#EDE6CE',
  stone: '#D7DCD2',
  shadow: '#B5C3BA',
  line: '#8B9D96',
  ink: '#65564B',
  wood: '#B69872',
  woodLight: '#D7BB8D',
  woodDark: '#8E7255',
  blue: '#377082',
  teal: '#79B6B2',
  tealDark: '#377D79',
  leaf: '#75966B',
  leafDark: '#487359',
  leafLight: '#A3B086',
  clay: '#C87865',
  clayDark: '#A65D4F',
  gold: '#D8AD57',
  water: '#A3CFBE',
};
const books = [
  C.blue,
  C.clay,
  C.tealDark,
  C.woodLight,
  C.gold,
  C.ivory,
  C.leafDark,
];
export const DETAIL_TYPES = [
  'bookwall',
  'windowwall',
  'archwall',
  'bookcase',
  'counter',
  'market-blue',
  'market-red',
  'apothecary',
  'workbench',
  'rug',
  'lowwall',
  'railing',
  'planter',
  'olive',
  'jars',
  'crates',
  'lantern',
  'scrolls',
  'loom',
  'stairs',
  'water-basin',
] as const;
export type DetailType = (typeof DETAIL_TYPES)[number];
export const detailFootprints: Record<DetailType, P> = {
  bookwall: [8, 1],
  windowwall: [8, 1],
  archwall: [8, 1],
  bookcase: [3, 1],
  counter: [3, 1],
  'market-blue': [3, 2],
  'market-red': [3, 2],
  apothecary: [3, 1],
  workbench: [3, 2],
  rug: [4, 3],
  lowwall: [4, 0.5],
  railing: [4, 0.5],
  planter: [2, 2],
  olive: [1, 1],
  jars: [1, 1],
  crates: [1, 1],
  lantern: [0.5, 0.5],
  scrolls: [2, 1],
  loom: [2, 2],
  stairs: [4, 2],
  'water-basin': [3, 3],
};
function line(p: Pixels, a: P, b: P, c: string) {
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
function draw(type: DetailType): PixelImage {
  const p = new Pixels(384, 288),
    ax = 144,
    ay = 124;
  const at = (x: number, y: number, z = 0): P => [
    ax + (x - y) * 16,
    ay + (x + y) * 8 - z,
  ];
  const poly = (v: [number, number, number][], c: string) =>
    p.poly(
      v.map((q) => at(...q)),
      c,
    );
  const edge = (
    a: [number, number, number],
    b: [number, number, number],
    c = C.line,
  ) => line(p, at(...a), at(...b), c);
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
  const box = (
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    light = C.paper,
    front = C.stone,
    side = C.shadow,
    z = 0,
  ) => {
    top(x, y, w, d, z + h, light);
    faceX(x, y + d, w, z, h, front);
    poly(
      [
        [x + w, y, z],
        [x + w, y + d, z],
        [x + w, y + d, z + h],
        [x + w, y, z + h],
      ],
      side,
    );
    edge([x, y, z + h], [x + w, y, z + h], C.ivory);
    edge([x + w, y, z + h], [x + w, y + d, z + h], C.line);
    edge([x, y + d, z], [x + w, y + d, z]);
    edge([x + w, y + d, z], [x + w, y + d, z + h]);
  };
  const pot = (x: number, y: number, small = false) => {
    const [px, py] = at(x, y),
      rx = small ? 3 : 5,
      h = small ? 8 : 14;
    p.ellipse(px, py - 3, rx, 3, C.clayDark);
    p.rect(px - rx, py - h + 4, rx * 2, h - 7, C.clay);
    p.ellipse(px, py - h + 4, rx, 3, C.clay);
    p.rect(px - 2, py - h, 4, 3, C.woodLight);
    p.ellipse(px, py - h, 3, 1, C.ink);
    p.rect(px - rx + 1, py - h + 5, 1, h - 9, C.woodLight);
  };
  const greenery = (x: number, y: number, z: number, r = 13) => {
    const [px, py] = at(x, y, z);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4,
        c = [C.leaf, C.leafDark, C.leafLight][i % 3];
      p.ellipse(
        px + Math.cos(a) * r * 0.7,
        py + Math.sin(a) * r * 0.35,
        r * 0.43,
        r * 0.28,
        c,
      );
    }
    // Leaf clusters: lit on the upper left, in shade on the lower right.
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39996,
        k = Math.sqrt((i + 0.5) / 26),
        lx = px + Math.cos(a) * r * 0.95 * k,
        ly = py + Math.sin(a) * r * 0.5 * k,
        lit = Math.cos(a) + Math.sin(a) < 0;
      p.rect(lx, ly, 2, 1, lit ? C.leafLight : C.leafDark);
      p.pixel(lx + (lit ? -1 : 2), ly + 1, lit ? C.leaf : C.leafDark);
    }
    for (let i = 0; i < 8; i++)
      p.pixel(px + ((i * 13) % 21) - 10, py + ((i * 7) % 13) - 6, C.paper);
  };
  const shelf = (x: number, y: number, w = 3, rows = 4) => {
    box(x, y, w, 0.65, rows * 13 + 5, C.woodLight, C.woodDark, C.woodDark);
    for (let row = 0; row < rows; row++) {
      const z = 5 + row * 13;
      faceX(x + 0.1, y + 0.66, w - 0.2, z, 10, C.ink);
      for (let i = 0; i < Math.floor(w * 7); i++) {
        const u = x + 0.16 + i * 0.14,
          h = 6 + ((i * 5 + row * 3) % 5);
        faceX(u, y + 0.68, 0.11, z, h, books[(i + row * 2) % books.length]);
        edge([u, y + 0.69, z + 2], [u + 0.1, y + 0.69, z + 2], C.paper);
      }
      faceX(x, y + 0.71, w, z - 2, 2, C.woodLight);
      edge([x, y + 0.72, z], [x + w, y + 0.72, z], C.woodDark);
    }
    for (const u of [x, x + w - 0.1])
      faceX(u, y + 0.73, 0.1, 0, rows * 13 + 5, C.wood);
  };
  if (['bookwall', 'windowwall', 'archwall'].includes(type)) {
    box(0, 0, 8, 0.35, 86, C.ivory, C.stone, C.shadow);
    for (let z = 9; z < 82; z += 10) {
      edge([0, 0.36, z], [8, 0.36, z], C.shadow);
      for (let u = z % 20 ? 0 : 1; u < 8; u += 2)
        edge([u, 0.37, z], [u, 0.37, z + 9], C.shadow);
    }
    for (let u = 0; u < 8; u += 2) {
      box(u - 0.08, -0.12, 0.25, 0.65, 90, C.ivory, C.paper, C.shadow);
      box(u - 0.16, -0.2, 0.4, 0.8, 6, C.ivory, C.paper, C.shadow, 84);
    }
    faceX(0, 0.4, 8, 70, 4, C.teal);
    edge([0, 0.41, 69], [8, 0.41, 69], C.ivory);
    if (type === 'bookwall') {
      for (let u = 0.4; u < 7.7; u += 2.5) shelf(u, 0.45, 2, 4);
    } else {
      for (let u = 0.5; u < 8; u += 2) {
        faceX(u, 0.38, 1.15, 20, 37, C.line);
        faceX(u + 0.12, 0.39, 0.91, 21, 35, C.tealDark);
        const [x, y] = at(u + 0.58, 0.4, 57);
        p.ellipse(x, y + 3, 8, 9, C.line);
        p.ellipse(x, y + 3, 6, 7, C.tealDark);
        for (let v = 0; v < 3; v++)
          edge(
            [u + 0.2 + v * 0.3, 0.41, 23],
            [u + 0.2 + v * 0.3, 0.41, 54],
            C.teal,
          );
        for (let z = 24; z < 55; z += 8)
          edge([u + 0.12, 0.42, z], [u + 1.03, 0.42, z], C.teal);
        box(u - 0.1, 0.15, 1.4, 0.8, 4, C.ivory, C.paper, C.shadow, 18);
      }
    }
    box(-0.1, -0.15, 8.3, 0.7, 4, C.ivory, C.paper, C.shadow, 86);
    for (let u = 0; u < 8; u += 0.5)
      box(u, 0, 0.28, 0.35, 5, C.ivory, C.paper, C.shadow, 90);
  }
  if (type === 'bookcase') shelf(0, 0, 3, 4);
  if (type === 'apothecary') {
    box(0, 0, 3, 0.7, 52, C.woodLight, C.woodDark, C.woodDark);
    for (let row = 0; row < 4; row++) {
      faceX(0.1, 0.71, 2.8, 5 + row * 12, 9, C.ink);
      for (let i = 0; i < 8; i++) {
        const [x, y] = at(0.25 + i * 0.35, 0.74, 6 + row * 12);
        p.rect(
          x - 2,
          y - 7,
          4,
          7,
          [C.teal, C.clay, C.gold, C.ivory][(row + i) % 4],
        );
        p.rect(x - 1, y - 9, 2, 2, C.woodDark);
        p.rect(x - 1, y - 5, 2, 2, C.paper);
      }
      faceX(0, 0.75, 3, 3 + row * 12, 2, C.woodLight);
    }
  }
  if (type === 'workbench' || type === 'counter') {
    for (const [x, y] of [
      [0.2, 0.2],
      [2.7, 0.2],
      [0.2, 1.2],
      [2.7, 1.2],
    ])
      box(x, y, 0.15, 0.15, 18, C.woodLight, C.wood, C.woodDark);
    box(0, 0, 3, 1.5, 4, C.woodLight, C.wood, C.woodDark, 18);
    for (let i = 0; i < 3; i++) {
      top(0.2 + i * 0.85, 0.3, 0.6, 0.7, 23, [C.paper, C.teal, C.clay][i]);
      edge([0.3 + i * 0.85, 0.4, 24], [0.7 + i * 0.85, 0.4, 24], C.wood);
      top(0.3 + i * 0.85, 0.8, 0.45, 0.08, 24, C.woodDark);
    }
    pot(2.6, 0.9, true);
  }
  if (type === 'market-blue' || type === 'market-red') {
    box(0, 0.3, 3, 1.3, 17, C.woodLight, C.wood, C.woodDark);
    for (let i = 0; i < 15; i++) {
      const [x, y] = at(
        0.2 + (i % 7) * 0.4,
        0.5 + Math.floor(i / 7) * 0.35,
        20,
      );
      p.ellipse(x, y, 2, 2, [C.gold, C.clay, C.leafDark][i % 3]);
      p.pixel(x - 1, y - 1, C.paper);
    }
    for (const u of [0, 3]) {
      const [x, y] = at(u, 0.3);
      p.rect(x, y - 58, 2, 58, C.woodDark);
    }
    const accent = type === 'market-blue' ? C.tealDark : C.clay;
    for (let i = 0; i < 10; i++) {
      top(i * 0.3, -0.1, 0.3, 2, 58, i % 2 ? C.ivory : accent);
      faceX(i * 0.3, 1.9, 0.3, 50, 8, i % 2 ? C.paper : accent);
      const [x, y] = at(i * 0.3 + 0.15, 1.9, 50);
      p.ellipse(x, y, 2, 3, i % 2 ? C.paper : accent);
    }
    edge([0, -0.1, 58], [3, -0.1, 58], C.woodDark);
  }
  if (type === 'rug') {
    top(0, 0, 4, 3, 0, C.clayDark);
    top(0.12, 0.12, 3.76, 2.76, 0, C.paper);
    top(0.25, 0.25, 3.5, 2.5, 0, C.tealDark);
    for (let x = 0.5; x < 3.8; x += 0.5)
      for (let y = 0.5; y < 2.8; y += 0.5) {
        poly(
          [
            [x, y, 0],
            [x + 0.2, y + 0.2, 0],
            [x, y + 0.4, 0],
            [x - 0.2, y + 0.2, 0],
          ],
          Math.round(x * 2 + y * 2) % 2 ? C.gold : C.water,
        );
      }
    for (let i = 0; i < 15; i++) {
      edge([i * 0.25, 0, 0], [i * 0.25, -0.2, 0], C.paper);
      edge([i * 0.25, 3, 0], [i * 0.25, 3.2, 0], C.paper);
    }
  }
  if (type === 'lowwall' || type === 'railing') {
    if (type === 'lowwall') {
      box(0, 0, 4, 0.4, 16, C.ivory, C.stone, C.shadow);
      for (let u = 0; u < 4; u += 0.5) {
        edge([u, 0.41, 1], [u, 0.41, 14], C.shadow);
        edge([u, 0.41, 8], [u + 0.5, 0.41, 8], C.shadow);
      }
    } else {
      for (let u = 0; u <= 4; u += 0.4) {
        const [x, y] = at(u, 0.2);
        p.rect(x, y - 19, 1, 19, C.line);
      }
      box(0, 0, 4, 0.4, 3, C.ivory, C.stone, C.shadow, 19);
      box(0, 0, 0.4, 0.5, 25, C.ivory, C.stone, C.shadow);
      box(3.6, 0, 0.4, 0.5, 25, C.ivory, C.stone, C.shadow);
    }
  }
  if (type === 'planter') {
    box(0, 0, 2, 2, 7, C.ivory, C.stone, C.shadow);
    top(0.15, 0.15, 1.7, 1.7, 8, C.leafDark);
    for (let i = 0; i < 12; i++) {
      const x = 0.3 + (i % 4) * 0.45,
        y = 0.3 + Math.floor(i / 4) * 0.55;
      greenery(x, y, 12, 5);
      const [px, py] = at(x, y, 18);
      p.rect(px - 1, py - 1, 3, 3, i % 3 ? C.paper : C.clay);
    }
  }
  if (type === 'olive') {
    const [x, y] = at(0, 0);
    p.poly(
      [
        [x - 3, y],
        [x + 4, y],
        [x + 1, y - 48],
        [x - 4, y - 50],
      ],
      C.woodDark,
    );
    line(p, [x, y - 35], [x - 13, y - 54], C.woodDark);
    line(p, [x, y - 28], [x + 17, y - 48], C.woodDark);
    greenery(-0.5, 0.2, 57, 22);
    greenery(0.8, 0.2, 48, 18);
    greenery(0, 0, 67, 16);
  }
  if (type === 'jars') {
    pot(0.2, 0.2);
    pot(0.8, 0.6, true);
    pot(0.1, 0.9, true);
  }
  if (type === 'crates') {
    box(0, 0, 1, 1, 13, C.woodLight, C.wood, C.woodDark);
    box(0.1, 0.1, 0.8, 0.8, 10, C.woodLight, C.wood, C.woodDark, 13);
    for (let u = 0.15; u < 1; u += 0.23)
      edge([u, 1, 1], [u, 1, 12], C.woodDark);
    edge([0, 1, 2], [1, 1, 12], C.woodDark);
  }
  if (type === 'lantern') {
    const [x, y] = at(0, 0);
    p.rect(x, y - 48, 2, 48, C.line);
    p.rect(x - 4, y - 49, 10, 2, C.ink);
    p.rect(x - 3, y - 47, 8, 10, C.woodDark);
    p.rect(x - 2, y - 46, 6, 7, C.gold);
    p.rect(x, y - 46, 1, 7, C.ivory);
    p.rect(x - 4, y - 37, 10, 2, C.ink);
  }
  if (type === 'scrolls') {
    box(0, 0, 2, 0.8, 11, C.woodLight, C.wood, C.woodDark);
    for (let i = 0; i < 6; i++) {
      const [x, y] = at(0.2 + i * 0.28, 0.2, 13);
      p.rect(x, y - 4, 3, 9, C.paper);
      p.ellipse(x + 1, y - 4, 2, 1, C.woodDark);
      p.rect(x, y, 3, 1, C.clay);
    }
  }
  if (type === 'loom') {
    for (const u of [0, 2])
      box(u, 0, 0.15, 0.3, 46, C.woodLight, C.wood, C.woodDark);
    faceX(0, 0.2, 2, 6, 3, C.woodDark);
    faceX(0, 0.2, 2, 42, 3, C.woodDark);
    for (let i = 0; i < 22; i++)
      edge([i / 11, 0.2, 9], [i / 11, 0.2, 42], i % 3 ? C.paper : C.clay);
    faceX(0, 0.21, 2, 9, 12, C.tealDark);
    for (let z = 10; z < 20; z += 3) edge([0, 0.22, z], [2, 0.22, z], C.gold);
  }
  if (type === 'stairs') {
    for (let i = 0; i < 8; i++)
      box(i * 0.5, 0, 0.5, 2, 2 * (8 - i), C.ivory, C.stone, C.shadow);
  }
  if (type === 'water-basin') {
    box(0, 0, 3, 3, 7, C.ivory, C.stone, C.shadow);
    top(0.2, 0.2, 2.6, 2.6, 8, C.tealDark);
    top(0.4, 0.4, 2.2, 2.2, 8, C.teal);
    for (let u = 0.6; u < 2.7; u += 0.4)
      edge([u, 0.6, 9], [u, 2.4, 9], C.water);
    box(1.25, 1.25, 0.5, 0.5, 26, C.ivory, C.paper, C.shadow, 8);
    top(1, 1, 1, 1, 35, C.tealDark);
    const [x, y] = at(1.5, 1.5, 49);
    p.rect(x, y, 1, 12, C.teal);
  }
  return p;
}
export async function generateDetails() {
  const metadata: Record<string, ObjectArt> = await readJson(
    'art/objects/index.json',
  );
  for (const type of DETAIL_TYPES) {
    const image = draw(type) as Pixels;
    // Floor796-style finishing; the rug lies flat, so it only gets grain.
    if (type === 'rug')
      detailPass(image, {
        outline: false,
        rim: false,
        contact: false,
        grain: 0.02,
      });
    else {
      detailPass(image);
      groundShadow(
        {
          p: image,
          at: (x: number, y: number, z = 0): P => [
            144 + (x - y) * 16,
            124 + (x + y) * 8 - z,
          ],
        },
        ...detailFootprints[type],
      );
    }
    for (const side of [false, true]) {
      if (
        side &&
        ![
          'bookwall',
          'windowwall',
          'archwall',
          'bookcase',
          'railing',
          'lowwall',
          'apothecary',
        ].includes(type)
      )
        continue;
      const id = `detail-${type}${side ? '-side' : ''}`;
      const out = new Pixels(image.width, image.height);
      for (let y = 0; y < image.height; y++)
        for (let x = 0; x < image.width; x++) {
          const source =
            (y * image.width + (side ? image.width - 1 - x : x)) * 4;
          out.data.set(
            image.data.slice(source, source + 4),
            (y * image.width + x) * 4,
          );
        }
      await png(`art/objects/${id}.png`, out);
      metadata[id] = {
        file: `objects/${id}.png`,
        anchor: [side ? image.width - 1 - 144 : 144, 124],
        width: image.width,
        height: image.height,
      };
    }
  }
  await writeJson('art/objects/index.json', metadata);
}
