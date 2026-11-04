import fs from 'node:fs/promises';
import { Pixels } from '../../packages/shared/pixels';
import { ACTIONS, type Action } from '../../packages/shared/schema';
import { png, writeJson } from '../build/io';
import type { Aseprite } from '../../packages/shared/compositor';
export const bases = [
  'adult-man',
  'adult-woman',
  'child',
  'elder',
  'cat',
  'bird',
];
export const garments = [
  'thobe',
  'jubba',
  'qaba',
  'kaftan',
  'abaya',
  'panjabi-lungi',
  'boubou',
  'baju-kurung',
  'hui-robe',
  'scholar-robe',
  'apron',
];
export const headwear = [
  'imamah',
  'kufi',
  'taqiyah',
  'hijab',
  'khimar',
  'songkok',
  'hui-cap',
];
export const props = [
  'book',
  'scroll',
  'astrolabe',
  'water-skin',
  'basket',
  'bread',
  'scale',
  'broom',
  'pen',
  'tray',
];
const K = {
  skin: ['#FF00FF', '#CC00CC', '#990099'],
  hair: ['#00FFFF', '#00CCCC', '#009999'],
  cloth: ['#FFFF00', '#CCCC00', '#999900'],
  sash: ['#00FF00', '#00CC00', '#009900'],
  hat: ['#FF8000', '#CC6600', '#994C00'],
  prop: ['#0080FF', '#0066CC', '#004C99'],
};
function drawPart(
  id: string,
  category: string,
  action: Action,
  face: string,
  f: number,
) {
  const animal = id === 'cat' || id === 'bird';
  const p = new Pixels(
    id === 'cat' ? 24 : id === 'bird' ? 16 : 32,
    id === 'cat' ? 20 : id === 'bird' ? 16 : 48,
  );
  const away = face === 'NE',
    moving = ['walk', 'carry', 'cat_walk'].includes(action),
    seated = ['sit', 'read', 'teach', 'write'].includes(action);
  const bob = moving ? f % 2 : Math.floor(f / 2) % 2;
  let headY = 13 + bob,
    bodyY = 20 + bob,
    feet = 43;
  if (action === 'pray') {
    const posture = Math.floor(f / 2);
    if (posture === 1) {
      headY = 26;
      bodyY = 29;
    }
    if (posture === 2) {
      headY = 39;
      bodyY = 33;
    }
    if (posture === 3) {
      headY = 25;
      bodyY = 32;
    }
    feet = 43;
  }
  if (seated) {
    headY += 8;
    bodyY += 8;
  }
  const child = id === 'child';
  if (child) {
    headY += 10;
    bodyY += 10;
  }
  if (animal) {
    if (id === 'cat') {
      p.ellipse(12, 14, 7, 3, K.cloth[1]);
      p.rect(5, 14, 2, 4, K.cloth[2]);
      p.rect(16, 14, 2, 4, K.cloth[2]);
      p.rect(15, 9, 6, 6, K.cloth[0]);
      p.poly(
        [
          [15, 10],
          [16, 6],
          [18, 10],
        ],
        K.cloth[1],
      );
      p.poly(
        [
          [19, 10],
          [21, 7],
          [21, 12],
        ],
        K.cloth[1],
      );
      p.rect(3, 10 + (f % 2), 3, 5, K.cloth[2]);
      if (action === 'cat_sleep') {
        p.ellipse(12, 15, 8, 3, K.cloth[1]);
        p.rect(16, 13, 4, 3, K.cloth[0]);
      }
      if (action === 'cat_walk') p.rect(7 + (f % 3), 16, 2, 2, K.cloth[0]);
    } else {
      p.ellipse(8, 10, 3, 2, K.cloth[0]);
      p.pixel(11, 9, K.prop[0]);
      if (action === 'bird_fly') {
        p.poly(
          [
            [8, 9],
            [1, 3 + (f % 3) * 2],
            [5, 10],
          ],
          K.cloth[2],
        );
        p.poly(
          [
            [8, 9],
            [14, 2 + (f % 3) * 2],
            [11, 11],
          ],
          K.cloth[1],
        );
      } else {
        p.rect(6, 12, 1, 2, K.prop[1]);
        p.rect(10, 12, 1, 2, K.prop[1]);
        if (f === 3) p.rect(10, 11, 3, 2, K.cloth[0]);
      }
    }
    return p;
  }
  if (category === 'bases') {
    p.rect(13, headY, 6, 6, K.skin[1]);
    p.rect(13, headY, 5, 2, K.skin[0]);
    if (!away) p.pixel(face === 'SW' ? 13 : 18, headY + 3, K.skin[2]);
    p.rect(12, bodyY, 9, feet - bodyY - 2, K.skin[2]);
    const leg = moving ? ((f % 3) - 1) * 2 : 0;
    p.rect(12 + leg, feet - 3, 3, 3, '#493C35');
    p.rect(18 - leg, feet - 3, 3, 3, '#493C35');
    const gesture = [
      'talk',
      'wave',
      'pour',
      'teach',
      'sweep',
      'write',
    ].includes(action)
      ? (f % 3) * 2
      : 0;
    p.rect(9, bodyY + 3, 3, 8, K.skin[1]);
    p.rect(21, bodyY + 2 - gesture, 3, 8, K.skin[0]);
    if (id === 'elder') p.rect(13, headY + 5, 4, 2, '#EDE6CE');
  }
  if (category === 'garments') {
    const y = bodyY;
    if (action === 'pray' && f >= 2 && f < 4) {
      p.poly(
        [
          [11, 26],
          [21, 28],
          [24, 36],
          [20, 42],
          [11, 42],
        ],
        K.cloth[1],
      );
    } else if (action === 'pray' && f >= 4 && f < 6) {
      p.ellipse(16, 37, 9, 5, K.cloth[1]);
    } else {
      p.poly(
        [
          [12, y],
          [20, y],
          [23, feet - 2],
          [10, feet - 2],
        ],
        K.cloth[1],
      );
      p.rect(12, y + 2, 3, Math.max(2, feet - y - 4), K.cloth[0]);
      p.rect(20, y + 3, 2, Math.max(2, feet - y - 5), K.cloth[2]);
    }
    p.rect(10, y + 2, 3, 9, K.cloth[1]);
    p.rect(21, y + 1, 3, 8, K.cloth[0]);
    if (['qaba', 'kaftan', 'scholar-robe', 'panjabi-lungi'].includes(id)) {
      p.rect(11, Math.min(feet - 3, y + 8), 11, 2, K.sash[1]);
      p.rect(18, y + 9, 2, 6, K.sash[2]);
    }
    if (id === 'apron') p.rect(13, y + 6, 7, 12, K.sash[0]);
    if (id === 'abaya') p.rect(12, y, 2, feet - y - 2, K.cloth[2]);
  }
  if (category === 'headwear') {
    const y = headY - 1;
    if (['hijab', 'khimar'].includes(id)) {
      p.rect(12, y, 8, 4, K.hat[1]);
      p.rect(11, y + 3, 3, 9, K.hat[0]);
      p.rect(19, y + 3, 3, 9, K.hat[2]);
      p.poly(
        [
          [12, y + 5],
          [20, y + 5],
          [24, y + 14],
          [9, y + 14],
        ],
        K.hat[1],
      );
      if (!away) p.rect(14, y + 4, 5, 4, K.skin[1]);
    } else if (id === 'imamah') {
      p.rect(11, y, 10, 4, K.hat[1]);
      p.rect(12, y - 1, 8, 2, K.hat[0]);
      p.rect(11, y + 2, 10, 1, K.hat[2]);
      p.rect(19, y + 4, 2, 6, K.hat[1]);
    } else {
      p.rect(12, y, 8, id === 'songkok' ? 5 : 3, K.hat[1]);
      p.rect(13, y, 6, 1, K.hat[0]);
    }
  }
  if (category === 'props') {
    const x = face === 'SW' ? 8 : 21,
      y = seated ? bodyY + 6 : bodyY + 10 + (f % 2);
    if (['book', 'scroll'].includes(id)) {
      p.rect(x - 4, y, 8, 5, K.prop[2]);
      p.rect(x - 3, y + 1, 6, 3, '#EDE6CE');
      p.rect(x, y, 1, 5, K.prop[1]);
    } else if (id === 'broom') {
      p.rect(x, y - 7, 1, 18, K.prop[2]);
      p.poly(
        [
          [x - 2, y + 10],
          [x + 2, y + 10],
          [x + 4, y + 15],
          [x - 3, y + 15],
        ],
        K.prop[1],
      );
    } else if (id === 'pen') {
      p.rect(x, y - 2 - (f % 2), 1, 5, K.prop[1]);
    } else if (id === 'water-skin') {
      p.ellipse(x, y, 3, 5, K.prop[1]);
      p.rect(x - 1, y - 6, 2, 2, K.prop[2]);
      if (action === 'pour' && f > 1)
        p.rect(x + 3, y, 1, 4 + (f % 3), '#79B6B2');
    } else if (id === 'basket' || id === 'bread' || id === 'tray') {
      p.ellipse(x, y, 5, 2, K.prop[1]);
      p.rect(x - 3, y - 2, 6, 3, K.prop[0]);
    } else if (id === 'astrolabe') p.ellipse(x, y, 3, 3, K.prop[0]);
    else {
      p.rect(x, y - 4, 1, 7, K.prop[2]);
      p.rect(x - 3, y - 4, 7, 1, K.prop[1]);
      p.rect(x - 3, y - 3, 2, 2, K.prop[0]);
      p.rect(x + 2, y - 3, 2, 2, K.prop[0]);
    }
  }
  return p;
}
export async function generateParts() {
  for (const [category, ids] of Object.entries({
    bases,
    garments,
    headwear,
    props,
  })) {
    for (const id of ids) {
      try {
        await fs.access(`art/parts/${category}/${id}.json`);
        continue;
      } catch {
        /* Only seed absent parts; preserve artist replacements. */
      }
      const actions = (
        id === 'cat'
          ? ['cat_idle', 'cat_walk', 'cat_sleep']
          : id === 'bird'
            ? ['bird_fly', 'bird_peck']
            : Object.keys(ACTIONS).filter(
                (a) => !a.startsWith('cat_') && !a.startsWith('bird_'),
              )
      ) as Action[];
      const frames: Aseprite['frames'] = [],
        tags: Aseprite['meta']['frameTags'] = [];
      const images = [];
      for (const action of actions)
        for (const facing of [
          'SE',
          'NE',
          ...(['pour', 'write'].includes(action) ? ['SW'] : []),
        ]) {
          const start = frames.length;
          for (let i = 0; i < ACTIONS[action]; i++) {
            const image = drawPart(id, category, action, facing, i);
            images.push(image);
            const w = image.width,
              h = image.height;
            frames.push({
              filename: `${action}_${facing}_${i}`,
              frame: {
                x: (frames.length % 16) * w,
                y: Math.floor(frames.length / 16) * h,
                w,
                h,
              },
              spriteSourceSize: { x: 0, y: 0, w, h },
              sourceSize: { w, h },
              duration: 83,
            });
          }
          tags.push({
            name: `${action}_${facing.toLowerCase()}`,
            from: start,
            to: frames.length - 1,
          });
        }
      const [w, h] = [images[0].width, images[0].height],
        sheet = new Pixels(w * 16, Math.ceil(images.length / 16) * h);
      const { blit } = await import('../../packages/shared/pixels');
      images.forEach((im, i) =>
        blit(sheet, im, (i % 16) * w, Math.floor(i / 16) * h),
      );
      const anchor =
        id === 'cat' ? [12, 18] : id === 'bird' ? [8, 15] : [16, 44];
      await png(`art/parts/${category}/${id}.png`, sheet);
      await writeJson(`art/parts/${category}/${id}.json`, {
        frames,
        meta: {
          image: `${id}.png`,
          size: { w: sheet.width, h: sheet.height },
          frameTags: tags,
          slices: [
            {
              name: 'foot',
              keys: [
                {
                  frame: 0,
                  bounds: { x: anchor[0], y: anchor[1], w: 1, h: 1 },
                },
              ],
            },
          ],
        },
      });
    }
  }
}
