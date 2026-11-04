import fs from 'node:fs/promises';
import { Pixels } from '../../packages/shared/pixels';
import { worldFromTile } from '../../packages/shared/iso';
import type {
  Character,
  Look,
  RoomObject,
  Step,
} from '../../packages/shared/schema';
import { generateParts, garments, headwear } from './parts';
import { generateObjects } from './objects';
import { png, writeJson } from '../build/io';
const keys = {
  skin: ['#FF00FF', '#CC00CC', '#990099'],
  hair: ['#00FFFF', '#00CCCC', '#009999'],
  garmentPrimary: ['#FFFF00', '#CCCC00', '#999900'],
  garmentSecondary: ['#00FF00', '#00CC00', '#009900'],
  headwear: ['#FF8000', '#CC6600', '#994C00'],
  prop: ['#0080FF', '#0066CC', '#004C99'],
};
const ramps: Record<string, string[]> = {
  'skin-1': ['#F0D4B0', '#D6B28C', '#B28C6B'],
  'skin-2': ['#E5BF92', '#CAA077', '#A78059'],
  'skin-3': ['#D7AC7D', '#BA8D63', '#976A49'],
  'skin-4': ['#C5966C', '#A67954', '#845C43'],
  'skin-5': ['#B78B65', '#976E4C', '#785237'],
  'skin-6': ['#A97D5B', '#875E42', '#674631'],
  'skin-7': ['#8E684D', '#704C36', '#563B2C'],
  'skin-8': ['#775540', '#593E30', '#49352A'],
  'hair-black': ['#65564B', '#493C35', '#3B322E'],
  'wool-cream': ['#EDE6CE', '#D7BB8D', '#B69872'],
  indigo: ['#548A9B', '#377082', '#225C69'],
  saffron: ['#EAC577', '#D8AD57', '#AF853E'],
  'madder-red': ['#DAA084', '#C87865', '#A65D4F'],
  olive: ['#A3B086', '#75966B', '#487359'],
  'white-linen': ['#F5EEDB', '#EDE6CE', '#CCC4AA'],
  charcoal: ['#80766B', '#65564B', '#493C35'],
  brass: ['#EAC577', '#D8AD57', '#AF853E'],
  silver: ['#D7DCD2', '#B5C3BA', '#8B9D96'],
  turquoise: ['#A3CFBE', '#79B6B2', '#377D79'],
};
const fixed = [
  '#493C35',
  '#D7BB8D',
  '#EDE6CE',
  '#B69872',
  '#8E7255',
  '#377D79',
  '#225C69',
  '#79B6B2',
  '#487359',
  '#75966B',
  '#A3B086',
  '#A96E51',
  '#D8AD57',
  '#C87865',
  '#C8B99C',
  '#DCCBAA',
  '#E4D5B9',
  '#C9BB9D',
  '#C1C7A2',
  '#D9D1BA',
];
async function seed(path: string, data: unknown) {
  try {
    await fs.access(path);
  } catch {
    await writeJson(path, data);
  }
}
function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(796);
const colours = () => ({
  skin: `skin-${1 + Math.floor(random() * 8)}`,
  hair: 'hair-black',
  garmentPrimary: [
    'wool-cream',
    'indigo',
    'saffron',
    'madder-red',
    'olive',
    'white-linen',
  ][Math.floor(random() * 6)],
  garmentSecondary: 'white-linen',
  headwear: 'white-linen',
  prop: 'brass',
});
function look(
  base = 'adult-man',
  garment = 'thobe',
  hat = 'kufi',
  prop = 'none',
): Look {
  return { base, garment, headwear: hat, prop, colours: colours() };
}
const stationary = (
  action: Step['action'],
  at: [number, number],
  facing: Step['facing'] = 'SE',
  loop = 120,
): Step[] => [{ from: 0, to: loop, action, at, facing }];
const ambient: Character[] = [];
function person(
  id: string,
  at: [number, number],
  action: Step['action'] = 'idle',
  outfit = look(),
  facing: Step['facing'] = 'SE',
  loop: 60 | 120 | 240 = 120,
) {
  const c: Character = {
    id: `amb-${id}`,
    kind: 'person',
    aliases: [],
    district: 'mosque-garden',
    depiction: 'full',
    look: outfit,
    loop,
    script: stationary(action, at, facing, loop),
  };
  ambient.push(c);
  return c;
}
function walker(
  id: string,
  path: [number, number][],
  outfit = look(),
  loop: 60 | 120 | 240 = 120,
  action: Step['action'] = 'walk',
) {
  const c = person(id, path[0], action, outfit, 'SE', loop);
  c.script = [{ from: 0, to: loop, action, path: [...path, path[0]] }];
  return c;
}
await seed('content/palettes/key-colours.json', keys);
await seed('content/palettes/ramps.json', ramps);
await seed('content/palettes/world-palette.json', [
  ...new Set([...fixed, ...Object.values(ramps).flat()]),
]);
await seed('content/rules/never-depict.json', {
  comment:
    'This list will be extended by the advisory panel. Exact full-name exceptions require human review; no blanket approval of common given names.',
  denylist: [
    'Muhammad',
    'Ahmad',
    'Ibrahim',
    'Musa',
    'Isa',
    'Yusuf',
    'Nuh',
    'Adam',
    'Dawud',
    'Sulayman',
    'Yunus',
    'Ayyub',
    'Zakariya',
    'Yahya',
    'Ismail',
    'Ishaq',
    'Yaqub',
    'Harun',
    'Idris',
    'Hud',
    'Salih',
    'Shu’ayb',
    'Lut',
    'Ilyas',
    'Al-Yasa',
    'Dhul-Kifl',
    'Maryam',
    'Khadijah',
    'Aisha',
    'Fatimah',
    'Ali ibn Abi Talib',
    'Hasan',
    'Husayn',
    'Abu Bakr',
    'Umar ibn al-Khattab',
    'Uthman ibn Affan',
  ],
  allowlist: ['Muhammad ibn Musa al-Khwarizmi'],
});
await seed(
  'content/wardrobe.json',
  Object.fromEntries(
    ['mosque-garden', 'house-of-wisdom', 'maghreb'].map((id) => [
      id,
      {
        region: id,
        era: 'prototype — advisory review pending',
        garments: [...garments, 'none'],
        headwear: [...headwear, 'none'],
      },
    ]),
  ),
);
for (let row = 0; row < 2; row++)
  for (let i = 0; i < 6; i++)
    person(
      `worshipper-${row}-${i}`,
      [12 + i * 2.5, 12 + row * 3],
      'pray',
      look(),
      'NE',
    );
const carrier = person(
  'water-carrier',
  [28, 31],
  'carry',
  look('adult-man', 'qaba', 'kufi', 'water-skin'),
);
carrier.script = [
  {
    from: 0,
    to: 36,
    action: 'carry',
    path: [
      [28, 31],
      [33, 31],
    ],
  },
  { from: 36, to: 84, action: 'pour', at: [33, 31], facing: 'SW' },
  {
    from: 84,
    to: 120,
    action: 'carry',
    path: [
      [33, 31],
      [28, 31],
    ],
  },
];
person(
  'sweeper',
  [29, 24],
  'sweep',
  look('adult-man', 'apron', 'taqiyah', 'broom'),
);
person(
  'baker',
  [40, 24],
  'pour',
  look('adult-man', 'apron', 'kufi', 'bread'),
).pairWith = 'amb-passerby';
person('passerby', [41, 25], 'talk', look(), 'NW').pairWith = 'amb-baker';
person(
  'elder-1',
  [42, 45],
  'talk',
  look('elder', 'jubba', 'imamah'),
  'SE',
).pairWith = 'amb-elder-2';
person(
  'elder-2',
  [44, 45],
  'talk',
  look('elder', 'jubba', 'kufi'),
  'NW',
).pairWith = 'amb-elder-1';
walker(
  'helpful-child',
  [
    [27, 42],
    [30, 42],
  ],
  look('child', 'thobe', 'taqiyah'),
  120,
).pairWith = 'amb-walking-elder';
walker(
  'walking-elder',
  [
    [27, 43],
    [30, 43],
  ],
  look('elder', 'jubba', 'imamah'),
  120,
).pairWith = 'amb-helpful-child';
walker(
  'traveller-1',
  [
    [24, 27],
    [28, 27],
  ],
  look('adult-man', 'boubou', 'kufi'),
  60,
);
walker(
  'traveller-2',
  [
    [37, 39],
    [43, 39],
  ],
  look('adult-woman', 'baju-kurung', 'hijab'),
  120,
);
walker(
  'traveller-3',
  [
    [49, 23],
    [49, 32],
    [51, 32],
    [51, 23],
  ],
  look('adult-man', 'hui-robe', 'hui-cap'),
  240,
);
walker(
  'traveller-4',
  [
    [22, 38],
    [25, 38],
  ],
  look('adult-man', 'panjabi-lungi', 'taqiyah'),
  120,
);
const teacher = person(
  'teacher',
  [43, 15],
  'teach',
  look('elder', 'scholar-robe', 'imamah', 'book'),
  'NE',
);
teacher.depiction = 'back';
for (let i = 0; i < 5; i++)
  person(
    `student-${i}`,
    [40 + i * 1.5, 12 + (i % 2) * 1.5],
    'read',
    look('child', 'thobe', 'kufi', 'book'),
    i % 2 ? 'SW' : 'SE',
  );
person(
  'patient',
  [25, 47],
  'sit',
  look('elder', 'jubba', 'kufi'),
  'NW',
).pairWith = 'ibn-sina';
for (let i = 0; i < 3; i++) {
  const l = look('cat', 'none', 'none');
  const c = person(
    `cat-${i}`,
    [36 + i * 4, 36],
    i === 0 ? 'cat_sleep' : i === 1 ? 'cat_walk' : 'cat_idle',
    l,
  );
  c.kind = 'cat';
  if (i === 1)
    c.script = [
      {
        from: 0,
        to: 120,
        action: 'cat_walk',
        path: [
          [38, 40],
          [41, 40],
          [38, 40],
        ],
      },
    ];
}
for (let i = 0; i < 6; i++) {
  const l = look('bird', 'none', 'none'),
    at: [number, number] = [35 + i * 0.6, 29];
  const c = person(`bird-${i}`, at, 'bird_peck', l, 'SE', 240);
  c.kind = 'bird';
  c.script = [
    {
      from: 0,
      to: 180,
      action: 'bird_fly',
      path: [at, [30, 33], [34, 37], [39, 33], at],
      z: [8, 28 + i * 2, 35, 24, 8],
    },
    { from: 180, to: 240, action: 'bird_peck', at, facing: 'SW', z: 8 },
  ];
}
await seed('content/ambient/mosque-garden.json', ambient);
const examples = [
  {
    id: 'al-khwarizmi',
    name: { en: 'Al-Khwarizmi', ar: 'الخوارزمي', bn: 'আল-খোয়ারিজমি' },
    aliases: ['Muhammad ibn Musa al-Khwarizmi'],
    years: 'c. 780–850',
    place: 'Baghdad',
    district: 'house-of-wisdom',
    look: look('adult-man', 'scholar-robe', 'imamah', 'book'),
    at: [15, 29],
    actions: ['write', 'teach'],
  },
  {
    id: 'ibn-sina',
    name: { en: 'Ibn Sina', ar: 'ابن سينا', bn: 'ইবনে সিনা' },
    aliases: ['Avicenna'],
    years: '980–1037',
    place: 'Bukhara',
    look: look('adult-man', 'jubba', 'imamah'),
    at: [24, 46],
    actions: ['talk', 'idle'],
  },
  {
    id: 'fatima-al-fihri',
    name: { en: 'Fatima al-Fihri', ar: 'فاطمة الفهرية', bn: 'ফাতিমা আল-ফিহরি' },
    aliases: [],
    years: 'c. 800–880',
    place: 'Fez',
    district: 'maghreb',
    look: look('adult-woman', 'abaya', 'khimar'),
    at: [32, 13],
    actions: ['wave', 'talk'],
  },
];
for (const c of examples) {
  await seed(`content/characters/${c.id}.json`, {
    ...c,
    at: undefined,
    actions: undefined,
    kind: 'person',
    depiction: 'full',
    loop: 120,
    script: [
      { from: 0, to: 60, action: c.actions[0], at: c.at, facing: 'SE' },
      { from: 60, to: 120, action: c.actions[1], at: c.at, facing: 'SW' },
    ],
    bio: {
      en: 'PLACEHOLDER — to be researched',
      ar: 'PLACEHOLDER — to be researched',
      bn: 'PLACEHOLDER — to be researched',
    },
    story: {
      en: 'PLACEHOLDER — to be researched',
      ar: 'PLACEHOLDER — to be researched',
      bn: 'PLACEHOLDER — to be researched',
    },
    sources: [
      'PLACEHOLDER source 1 — research pending',
      'PLACEHOLDER source 2 — research pending',
    ],
    panelApproved: false,
    ...(c.id === 'ibn-sina' ? { pairWith: 'amb-patient' } : {}),
  });
}
const objects: RoomObject[] = [];
const add = (
  type: string,
  x: number,
  y: number,
  footprint: [number, number] = [1, 1],
  walkable = false,
) =>
  objects.push({
    id: objects.length + 1,
    type,
    x,
    y,
    footprint,
    walkable,
    z: 0,
  });
for (let i = 0; i < 12; i++) {
  add('arcade', 7 + i * 4, 6, [4, 1]);
  add('arcade-side', 6, 7 + i * 4, [1, 4]);
}
add('dome', 11, 7, [5, 5]);
add('minaret', 7, 8);
add('minaret', 54, 7);
add('gate', 30, 7, [4, 1]);
add('fountain', 34, 33, [2, 2]);
for (let row = 0; row < 2; row++)
  for (let i = 0; i < 6; i++)
    add('carpet', 11.7 + i * 2.5, 11.6 + row * 3, [1.5, 1], true);
for (const [x, y] of [
  [11, 22],
  [11, 38],
  [18, 49],
  [36, 49],
  [49, 44],
  [53, 35],
  [53, 19],
  [35, 9],
  [20, 8],
  [8, 50],
])
  add('palm', x, y);
for (const [x, y] of [
  [36, 17],
  [47, 17],
  [37, 47],
  [50, 47],
  [17, 35],
  [18, 38],
])
  add('cypress', x, y);
for (const [x, y] of [
  [40, 18],
  [46, 19],
  [42, 35],
  [47, 36],
  [36, 42],
  [46, 48],
  [18, 22],
  [12, 43],
  [48, 12],
  [21, 48],
])
  add('flowers', x, y, [3, 2]);
add('bench', 42, 46, [2, 1]);
add('desk', 15, 30, [2, 1]);
add('bench', 25, 48, [2, 1]);
add('feeder', 38, 30);
add('bowl', 44, 37);
add('desk', 39, 23, [2, 1]);
const floor: number[] = [],
  collision: number[] = Array(64 * 64).fill(0);
for (let y = 0; y < 64; y++)
  for (let x = 0; x < 64; x++) {
    const garden = x >= 35 && x <= 53 && y >= 17 && y <= 49;
    floor.push(
      garden && x % 8 > 1 && y % 9 > 1 ? 4 : 1 + Math.floor(random() * 3),
    );
  }
for (const o of objects)
  if (!o.walkable)
    for (let y = Math.floor(o.y); y < o.y + o.footprint[1]; y++)
      for (let x = Math.floor(o.x); x < o.x + o.footprint[0]; x++)
        collision[y * 64 + x] = 1;
await seed('rooms/mosque-garden.tmj', {
  type: 'map',
  version: '1.10',
  orientation: 'isometric',
  renderorder: 'right-down',
  tilewidth: 32,
  tileheight: 16,
  width: 64,
  height: 64,
  infinite: false,
  layers: [
    {
      id: 1,
      name: 'floor',
      type: 'tilelayer',
      width: 64,
      height: 64,
      data: floor,
    },
    {
      id: 2,
      name: 'collision',
      type: 'tilelayer',
      width: 64,
      height: 64,
      data: collision,
      visible: false,
    },
    { id: 3, name: 'objects', type: 'objectgroup', objects },
  ],
});
for (let i = 0; i < 6; i++) {
  const p = new Pixels(32, 16),
    colour =
      i === 3
        ? '#75966B'
        : i === 4
          ? '#79B6B2'
          : ['#DCCBAA', '#E4D5B9', '#D7BB8D'][i % 3];
  p.poly(
    [
      [16, 0],
      [32, 8],
      [16, 16],
      [0, 8],
    ],
    colour,
  );
  for (let k = 0; k < 8; k++)
    p.pixel(
      5 + ((k * 13) % 22),
      5 + ((k * 7) % 7),
      i === 3 ? '#A3B086' : '#C9BB9D',
    );
  if (i < 3) {
    p.poly(
      [
        [16, 0],
        [32, 8],
        [30, 8],
        [16, 1],
        [2, 8],
        [0, 8],
      ],
      '#EDE6CE',
    );
    p.poly(
      [
        [0, 8],
        [16, 16],
        [32, 8],
        [30, 8],
        [16, 15],
        [2, 8],
      ],
      '#B69872',
    );
  }
  await png(`art/tiles/tile-${i + 1}.png`, p);
}
await generateParts();
await generateObjects();
console.log(
  `Generated Aseprite-compatible parts, tiles, objects, ${ambient.length} ambient definitions; seeded content is preserved. Room centre: ${worldFromTile(32, 32)}.`,
);
