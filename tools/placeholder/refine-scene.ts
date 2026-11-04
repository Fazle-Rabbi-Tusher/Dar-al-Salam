import { readJson, writeJson, png } from '../build/io';
import { generateObjects } from './objects';
import { generateDetails, detailFootprints, type DetailType } from './details';
import { generateParts } from './parts';
import { Pixels } from '../../packages/shared/pixels';
import {
  characterSchema,
  roomSchema,
  type RoomObject,
  type Character,
} from '../../packages/shared/schema';
import { sampleStep, pathLength } from '../../packages/shared/script';
// Explicit visual migration, separate from normal first-run generation: preserve authored cards and scripts.
await generateObjects();
await generateDetails();
await generateParts(true);
const room = roomSchema.parse(await readJson('rooms/mosque-garden.tmj'));
const objects = room.layers.find((l) => l.type === 'objectgroup')!;
if (objects.type !== 'objectgroup') throw Error('Missing objects');
objects.objects = objects.objects.filter((o) => !o.type.startsWith('detail-'));
let ambient: Character[] = (
  await readJson('content/ambient/mosque-garden.json')
).map((c: unknown) => characterSchema.parse(c));
ambient = ambient.filter((c) => !c.id.startsWith('amb-neighbour-'));
const cards: Character[] = await Promise.all(
  ['al-khwarizmi', 'ibn-sina', 'fatima-al-fihri'].map(async (id) =>
    characterSchema.parse(await readJson(`content/characters/${id}.json`)),
  ),
);
const occupied = new Set<string>(),
  routes = new Set<string>(),
  people = new Set<string>();
const cells = (o: RoomObject) => {
  const out: string[] = [];
  for (let y = Math.floor(o.y); y < o.y + o.footprint[1]; y++)
    for (let x = Math.floor(o.x); x < o.x + o.footprint[0]; x++)
      out.push(`${x},${y}`);
  return out;
};
for (const o of objects.objects)
  if (!o.walkable) for (const cell of cells(o)) occupied.add(cell);
for (const c of [...ambient, ...cards])
  for (const s of c.script) {
    if (s.at) people.add(`${Math.floor(s.at[0])},${Math.floor(s.at[1])}`);
    if (s.path && c.kind !== 'bird')
      for (let i = 0; i <= pathLength(s.path) * 16; i++) {
        const p = sampleStep(s, i / (pathLength(s.path) * 16)).tile;
        routes.add(`${Math.floor(p[0])},${Math.floor(p[1])}`);
      }
  }
function add(
  type: DetailType,
  x: number,
  y: number,
  side = false,
  walkable = false,
) {
  const f = detailFootprints[type],
    footprint: [number, number] = side ? [f[1], f[0]] : [...f];
  const o: RoomObject = {
    id: Math.max(0, ...objects.objects.map((o) => o.id)) + 1,
    type: `detail-${type}${side ? '-side' : ''}`,
    x,
    y,
    footprint,
    walkable,
    z: 0,
  };
  if (
    !walkable &&
    cells(o).some((c) => routes.has(c) || people.has(c) || occupied.has(c))
  )
    return false;
  objects.objects.push(o);
  if (!walkable) cells(o).forEach((c) => occupied.add(c));
  return true;
}
// Back and side walls form connected open-roof rooms, with passages left open along existing routes.
for (const [type, x, y, side] of [
  ['bookwall', 9, 21, false],
  ['bookwall', 17, 21, false],
  ['windowwall', 8, 22, true],
  ['windowwall', 9, 40, false],
  ['windowwall', 17, 40, false],
  ['bookwall', 37, 8, false],
  ['bookwall', 45, 8, false],
  ['windowwall', 37, 9, true],
  ['archwall', 36, 19, false],
  ['windowwall', 37, 43, false],
  ['windowwall', 45, 52, false],
] as [DetailType, number, number, boolean][])
  add(type, x, y, side);
for (const [x, y, side] of [
  [9, 37, false],
  [13, 37, false],
  [17, 37, false],
  [9, 54, false],
  [13, 54, false],
  [17, 54, false],
  [21, 54, false],
  [53, 10, true],
  [53, 14, true],
  [37, 35, false],
  [41, 35, false],
  [45, 51, false],
  [49, 51, false],
] as [number, number, boolean][])
  add('railing', x, y, side);
// Artisans, clinic, library, covered souk, and reading garden.
for (const [type, x, y] of [
  ['bookcase', 10, 25],
  ['bookcase', 10, 33],
  ['bookcase', 19, 24],
  ['workbench', 13, 26],
  ['workbench', 19, 29],
  ['workbench', 12, 33],
  ['scrolls', 20, 34],
  ['apothecary', 10, 42],
  ['apothecary', 15, 42],
  ['workbench', 12, 47],
  ['workbench', 18, 46],
  ['counter', 20, 51],
  ['bookcase', 38, 10],
  ['bookcase', 48, 10],
  ['workbench', 39, 16],
  ['market-blue', 38, 21],
  ['market-red', 43, 21],
  ['market-red', 38, 27],
  ['market-blue', 43, 27],
  ['counter', 45, 30],
  ['loom', 29, 17],
  ['loom', 31, 20],
  ['scrolls', 26, 19],
  ['workbench', 28, 23],
  ['water-basin', 30, 35],
  ['workbench', 39, 44],
  ['workbench', 46, 44],
  ['stairs', 27, 49],
] as [DetailType, number, number][])
  add(type, x, y);
for (const [x, y] of [
  [12, 30],
  [20, 32],
  [18, 49],
  [40, 12],
  [46, 13],
])
  add('rug', x, y, false, true);
for (const [x, y] of [
  [39, 36],
  [46, 37],
  [47, 42],
  [39, 48],
  [50, 40],
  [35, 22],
  [24, 17],
  [24, 34],
  [30, 46],
  [18, 18],
  [48, 16],
]) {
  add('planter', x, y);
}
for (const [x, y] of [
  [45, 38],
  [51, 43],
  [46, 49],
  [36, 44],
  [28, 10],
  [53, 29],
  [32, 45],
])
  add('olive', x, y);
// Fill room edges with varied, small human-scale objects; paths and existing activity positions are protected.
for (let y = 10; y < 54; y += 3)
  for (let x = 10; x < 54; x += 3) {
    const n = (x * 17 + y * 31) % 17;
    const type: DetailType =
      n < 4
        ? 'jars'
        : n < 7
          ? 'crates'
          : n < 9
            ? 'scrolls'
            : n < 12
              ? 'planter'
              : 'lantern';
    if (n < 14) add(type, x + 0.2, y + 0.2);
  }
// Forty-eight modestly dressed neighbours make the cutaway rooms feel inhabited.
const fabrics = [
  'wool-cream',
  'indigo',
  'madder-red',
  'olive',
  'white-linen',
  'saffron',
  'turquoise',
];
const areas = [
  [10, 24, 23, 36],
  [10, 42, 24, 53],
  [38, 10, 52, 18],
  [37, 21, 48, 32],
  [38, 36, 52, 50],
  [23, 18, 35, 26],
];
let n = 0;
for (let pass = 0; pass < 3 && n < 48; pass++)
  for (let y = 10; y < 54 && n < 48; y++)
    for (let x = 10; x < 54 && n < 48; x++) {
      if (
        !areas.some(
          ([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2,
        ) ||
        (x * 13 + y * 7) % 19 !== pass * 3
      )
        continue;
      const key = `${x},${y}`;
      if (occupied.has(key) || routes.has(key) || people.has(key)) continue;
      if (
        [...people].some((c) => {
          const [a, b] = c.split(',').map(Number);
          return Math.abs(a - x) + Math.abs(b - y) < 2;
        })
      )
        continue;
      const woman = n % 4 === 0,
        elder = n % 7 === 0;
      const action = n % 3 === 0 ? 'read' : n % 3 === 1 ? 'talk' : 'idle';
      const c = characterSchema.parse({
        id: `amb-neighbour-${n + 1}`,
        kind: 'person',
        district: 'mosque-garden',
        look: {
          base: woman ? 'adult-woman' : elder ? 'elder' : 'adult-man',
          garment: woman
            ? 'abaya'
            : ['qaba', 'kaftan', 'jubba', 'thobe'][n % 4],
          headwear: woman ? 'hijab' : ['kufi', 'imamah', 'taqiyah'][n % 3],
          prop: action === 'read' ? 'book' : n % 5 === 0 ? 'basket' : 'none',
          colours: {
            skin: `skin-${1 + (n % 8)}`,
            hair: 'hair-black',
            garmentPrimary: fabrics[n % fabrics.length],
            garmentSecondary: fabrics[(n + 3) % fabrics.length],
            headwear: n % 3 ? 'white-linen' : 'wool-cream',
            prop: 'madder-red',
          },
        },
        loop: [60, 120, 240][n % 3],
        script: [
          {
            from: 0,
            to: [60, 120, 240][n % 3],
            action,
            at: [x + 0.5, y + 0.5],
            facing: n % 2 ? 'SE' : 'SW',
          },
        ],
      });
      ambient.push(c);
      people.add(key);
      n++;
    }
if (n !== 48) throw Error(`Expected 48 neighbours, found ${n}`);
const collision = room.layers.find((l) => l.name === 'collision');
if (collision?.type !== 'tilelayer') throw Error('Missing collision');
collision.data = Array(64 * 64).fill(0);
for (const o of objects.objects)
  if (!o.walkable)
    for (const key of cells(o)) {
      const [x, y] = key.split(',').map(Number);
      collision.data[y * 64 + x] = 1;
    }
const floor = room.layers.find((l) => l.name === 'floor');
if (floor?.type !== 'tilelayer') throw Error('Missing floor');
for (let y = 0; y < 64; y++)
  for (let x = 0; x < 64; x++) {
    const garden = x >= 37 && x <= 54 && y >= 34 && y <= 52;
    floor.data[y * 64 + x] =
      garden && y !== 39 && x !== 44 ? 4 : 1 + ((x * 3 + y * 7) % 3);
  }
for (let i = 0; i < 6; i++) {
  const p = new Pixels(32, 16);
  const colour =
    i === 3
      ? '#A3B086'
      : i === 4
        ? '#79B6B2'
        : ['#F5EEDB', '#EDE6CE', '#D7DCD2'][i % 3];
  p.poly(
    [
      [16, 0],
      [32, 8],
      [16, 16],
      [0, 8],
    ],
    colour,
  );
  if (i === 3) {
    for (let k = 0; k < 14; k++)
      p.pixel(
        5 + ((k * 13) % 22),
        4 + ((k * 7) % 9),
        k % 3 ? '#75966B' : '#C1C7A2',
      );
  } else {
    for (let k = 0; k < 7; k++)
      p.pixel(5 + ((k * 13) % 22), 5 + ((k * 7) % 7), '#D7DCD2');
    p.poly(
      [
        [0, 8],
        [16, 16],
        [32, 8],
        [30, 8],
        [16, 15],
        [2, 8],
      ],
      '#D7DCD2',
    );
  }
  await png(`art/tiles/tile-${i + 1}.png`, p);
}
await writeJson('rooms/mosque-garden.tmj', room);
await writeJson('content/ambient/mosque-garden.json', ambient);
console.log(
  `Refined scene: ${objects.objects.length} objects; ${ambient.length + cards.length} characters; paths and content cards preserved.`,
);
