import { Pixels } from '../../packages/shared/pixels';
import { png, writeJson, readJson } from '../build/io';
const C = {
  edge: '#493C35',
  sand: '#D7DCD2',
  light: '#F5EEDB',
  shade: '#B5C3BA',
  dark: '#8B9D96',
  teal: '#377D79',
  blue: '#225C69',
  water: '#79B6B2',
  leaf: '#487359',
  leaf2: '#75966B',
  leaf3: '#A3B086',
  soil: '#A96E51',
  gold: '#D8AD57',
};
export type ObjectArt = {
  file: string;
  anchor: [number, number];
  width: number;
  height: number;
  frames?: string[];
  /** Flat walkable art baked into the floor chunks instead of sorted. */
  floor?: boolean;
};
function block(
  p: Pixels,
  cx: number,
  cy: number,
  w: number,
  d: number,
  h: number,
) {
  p.poly(
    [
      [cx, cy - h],
      [cx + w * 16, cy + w * 8 - h],
      [cx + (w - d) * 16, cy + (w + d) * 8 - h],
      [cx - d * 16, cy + d * 8 - h],
    ],
    C.light,
  );
  p.poly(
    [
      [cx - d * 16, cy + d * 8 - h],
      [cx + (w - d) * 16, cy + (w + d) * 8 - h],
      [cx + (w - d) * 16, cy + (w + d) * 8],
      [cx - d * 16, cy + d * 8],
    ],
    C.sand,
  );
  p.poly(
    [
      [cx + (w - d) * 16, cy + (w + d) * 8 - h],
      [cx + w * 16, cy + w * 8 - h],
      [cx + w * 16, cy + w * 8],
      [cx + (w - d) * 16, cy + (w + d) * 8],
    ],
    C.shade,
  );
}
export async function generateObjects() {
  const meta: Record<string, ObjectArt> = await readJson(
    'art/objects/index.json',
  ).catch(() => ({}));
  for (const name of [
    'arcade',
    'arcade-side',
    'fountain',
    'minaret',
    'palm',
    'cypress',
    'bench',
    'carpet',
    'feeder',
    'flowers',
    'desk',
    'dome',
    'gate',
    'bowl',
  ]) {
    const p = new Pixels(192, 240),
      cx = 80,
      cy = 174;
    let anchor: [number, number] = [cx, cy];
    if (name === 'arcade' || name === 'gate' || name === 'arcade-side') {
      block(p, cx, cy, 4, 1, 80);
      for (let i = 0; i < 4; i++) {
        const x = cx - 12 + i * 16,
          y = cy + 8 + i * 8;
        p.rect(x, y - 58, 12, 50, C.dark);
        p.ellipse(x + 6, y - 58, 6, 10, C.dark);
        p.rect(x + 2, y - 58, 8, 48, C.teal);
        p.ellipse(x + 6, y - 58, 4, 8, C.teal);
        p.rect(x - 2, y - 4, 4, 7, C.light);
        p.rect(x - 3, y - 10, 6, 3, C.light);
      }
      for (let i = 0; i < 4; i++)
        block(p, cx + i * 16, cy + i * 8 - 78, 0.35, 1, 8);
      p.poly(
        [
          [cx - 16, cy - 69],
          [cx + 64, cy - 29],
          [cx + 64, cy - 25],
          [cx - 16, cy - 65],
        ],
        C.teal,
      );
      if (name === 'arcade-side') {
        const { data } = p;
        const copy = data.slice();
        for (let y = 0; y < p.height; y++)
          for (let x = 0; x < p.width; x++)
            data.set(
              copy.slice(
                (y * p.width + (p.width - 1 - x)) * 4,
                (y * p.width + (p.width - 1 - x)) * 4 + 4,
              ),
              (y * p.width + x) * 4,
            );
        anchor = [p.width - 1 - cx, cy];
      }
    }
    if (name === 'fountain') {
      block(p, cx, cy, 2, 2, 9);
      p.poly(
        [
          [cx, cy - 6],
          [cx + 26, cy + 7],
          [cx, cy + 20],
          [cx - 26, cy + 7],
        ],
        C.teal,
      );
      p.poly(
        [
          [cx, cy - 3],
          [cx + 21, cy + 7],
          [cx, cy + 17],
          [cx - 21, cy + 7],
        ],
        C.water,
      );
      p.ellipse(cx, cy + 5, 12, 5, C.light);
      p.ellipse(cx, cy + 4, 9, 3, C.water);
      p.rect(cx - 2, cy - 24, 4, 28, C.light);
      p.ellipse(cx, cy - 22, 10, 4, C.teal);
      p.ellipse(cx, cy - 23, 8, 3, C.water);
      p.rect(cx - 1, cy - 35, 2, 12, C.water);
      p.pixel(cx - 2, cy - 36, C.light);
      for (let i = 0; i < 5; i++)
        p.pixel(cx - 19 + i * 8, cy + 8 + (i % 2) * 3, C.light);
    }
    if (name === 'minaret') {
      block(p, cx, cy, 1.5, 1.5, 135);
      for (let i = 0; i < 6; i++) {
        const y = cy - i * 20;
        p.poly(
          [
            [cx - 24, y],
            [cx, y + 12],
            [cx + 24, y],
            [cx, y - 12],
          ],
          i % 2 ? C.teal : C.light,
        );
      }
      p.rect(cx - 5, cy - 117, 10, 15, C.dark);
      p.ellipse(cx, cy - 117, 5, 9, C.dark);
      p.ellipse(cx, cy - 148, 19, 8, C.teal);
      p.poly(
        [
          [cx - 19, cy - 148],
          [cx, cy - 172],
          [cx + 19, cy - 148],
        ],
        C.teal,
      );
      p.poly(
        [
          [cx - 18, cy - 149],
          [cx, cy - 171],
          [cx, cy - 148],
        ],
        C.water,
      );
      p.rect(cx - 1, cy - 179, 2, 8, C.gold);
    }
    if (name === 'palm') {
      p.ellipse(cx + 12, cy + 7, 30, 9, [73, 60, 53, 50]);
      p.poly(
        [
          [cx - 4, cy],
          [cx + 3, cy],
          [cx + 7, cy - 73],
          [cx + 1, cy - 75],
        ],
        C.dark,
      );
      for (let i = 0; i < 10; i++)
        p.rect(cx - 2 + (i % 3), cy - i * 7, 5, 2, C.sand);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          x = cx + Math.cos(a) * 34,
          y = cy - 73 + Math.sin(a) * 17;
        p.poly(
          [
            [cx + 3, cy - 77],
            [x, y - 4],
            [x + Math.cos(a) * 10, y + 10],
            [cx, cy - 70],
          ],
          i % 2 ? C.leaf : C.leaf2,
        );
      }
      p.rect(cx, cy - 73, 4, 5, C.gold);
    }
    if (name === 'cypress') {
      p.ellipse(cx + 9, cy + 4, 19, 7, [73, 60, 53, 50]);
      p.rect(cx - 2, cy - 20, 4, 22, C.dark);
      p.poly(
        [
          [cx, cy - 92],
          [cx + 13, cy - 36],
          [cx + 10, cy - 12],
          [cx - 11, cy - 12],
          [cx - 14, cy - 36],
        ],
        C.leaf,
      );
      p.poly(
        [
          [cx, cy - 92],
          [cx, cy - 13],
          [cx - 11, cy - 15],
          [cx - 13, cy - 35],
        ],
        C.leaf2,
      );
      for (let i = 0; i < 12; i++)
        p.rect(cx - 6 + ((i * 7) % 12), cy - 22 - i * 4, 2, 3, C.leaf3);
    }
    if (name === 'bench' || name === 'desk') {
      block(p, cx, cy, 2, 1, 12);
      if (name === 'bench') {
        p.poly(
          [
            [cx - 16, cy + 8],
            [cx + 16, cy + 24],
            [cx + 16, cy + 11],
            [cx - 16, cy - 5],
          ],
          C.dark,
        );
        p.poly(
          [
            [cx - 16, cy - 5],
            [cx + 16, cy + 11],
            [cx + 16, cy + 7],
            [cx - 16, cy - 9],
          ],
          C.sand,
        );
      } else {
        p.poly(
          [
            [cx, cy - 9],
            [cx + 17, cy],
            [cx + 6, cy + 5],
            [cx - 10, cy - 3],
          ],
          C.teal,
        );
        p.poly(
          [
            [cx, cy - 12],
            [cx + 8, cy - 8],
            [cx, cy - 4],
            [cx - 8, cy - 8],
          ],
          C.light,
        );
      }
    }
    if (name === 'carpet') {
      p.poly(
        [
          [cx, cy],
          [cx + 24, cy + 12],
          [cx + 8, cy + 20],
          [cx - 16, cy + 8],
        ],
        C.teal,
      );
      p.poly(
        [
          [cx, cy + 3],
          [cx + 18, cy + 12],
          [cx + 8, cy + 17],
          [cx - 10, cy + 8],
        ],
        C.water,
      );
      p.poly(
        [
          [cx + 1, cy + 6],
          [cx + 11, cy + 11],
          [cx + 6, cy + 14],
          [cx - 4, cy + 9],
        ],
        C.teal,
      );
    }
    if (name === 'feeder') {
      block(p, cx, cy, 1, 1, 3);
      p.rect(cx - 2, cy - 23, 4, 28, C.dark);
      p.ellipse(cx, cy - 22, 12, 4, C.sand);
      p.ellipse(cx, cy - 24, 10, 3, C.gold);
    }
    if (name === 'flowers') {
      block(p, cx, cy, 3, 2, 5);
      p.poly(
        [
          [cx, cy - 2],
          [cx + 42, cy + 19],
          [cx + 16, cy + 32],
          [cx - 26, cy + 11],
        ],
        C.leaf,
      );
      for (let i = 0; i < 24; i++) {
        const x = cx - 15 + ((i * 17) % 53),
          y = cy + 5 + ((i * 11) % 20);
        p.rect(x, y - 5, 1, 5, C.leaf2);
        p.rect(
          x - 1,
          y - 7,
          3,
          3,
          i % 3 === 0 ? '#C87865' : i % 3 === 1 ? C.gold : C.light,
        );
      }
    }
    if (name === 'dome') {
      block(p, cx, cy, 5, 5, 45);
      p.ellipse(cx, cy - 20, 55, 30, C.teal);
      p.ellipse(cx - 7, cy - 28, 44, 29, C.water);
      p.poly(
        [
          [cx - 54, cy - 20],
          [cx - 34, cy - 62],
          [cx, cy - 78],
          [cx + 35, cy - 61],
          [cx + 55, cy - 20],
        ],
        C.teal,
      );
      p.poly(
        [
          [cx - 54, cy - 20],
          [cx - 34, cy - 62],
          [cx, cy - 78],
          [cx - 9, cy - 22],
        ],
        C.water,
      );
      for (let i = 0; i < 6; i++)
        p.rect(cx - 45 + i * 17, cy - 21, 6, 5, C.gold);
      p.rect(cx - 1, cy - 85, 2, 8, C.gold);
    }
    if (name === 'bowl') {
      p.ellipse(cx, cy, 6, 3, C.soil);
      p.ellipse(cx, cy - 1, 4, 2, C.water);
    }
    const file = `objects/${name}.png`;
    await png(`art/${file}`, p);
    meta[name] = { file, anchor, width: p.width, height: p.height };
    if (name === 'fountain') {
      meta[name].frames = [];
      for (let f = 0; f < 4; f++) {
        const q = new Pixels(p.width, p.height);
        q.data.set(p.data);
        q.ellipse(cx, cy + 7, 9 + f * 3, 2 + f, C.water);
        q.ellipse(cx, cy + 7, 7 + f * 3, 1 + f, C.teal);
        q.rect(cx - 1, cy - 34 + f, 2, 10, C.water);
        const frame = `objects/fountain-${f}.png`;
        await png(`art/${frame}`, q);
        meta[name].frames!.push(frame);
      }
    }
  }
  await writeJson('art/objects/index.json', meta);
}
