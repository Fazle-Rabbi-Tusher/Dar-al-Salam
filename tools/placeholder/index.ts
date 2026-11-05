import fs from 'node:fs/promises';
import { Pixels } from '../../packages/shared/pixels';
import { worldFromTile } from '../../packages/shared/iso';
import { generateParts, garments, headwear } from './parts';
import { generateObjects } from './objects';
import { generateDetails } from './details';
import {
  MODERN_COLOURS,
  generateModernObjects,
  generateModernTiles,
} from './modern';
import { modernQuarter } from './modern-quarter';
import { png, writeJson, readJson, files } from '../build/io';
import { generatePortraits } from './portraits/core';
import { PORTRAITS, PORTRAIT_COLOURS } from './portraits';
/*
 * `pnpm gen:placeholder` seeds missing art and content and preserves anything
 * authored. `pnpm gen:placeholder --refresh` regenerates placeholder parts,
 * room, ambient people and draft cards (it never approves a card).
 */
const refresh = process.argv.includes('--refresh');
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
  'hair-brown': ['#8E684D', '#704C36', '#563B2C'],
  'hair-grey': ['#D7DCD2', '#B5C3BA', '#8B9D96'],
  'hair-white': ['#F5EEDB', '#EDE6CE', '#CCC4AA'],
  denim: ['#7FA3C8', '#53789F', '#36557A'],
  navy: ['#5E6E96', '#3F4E74', '#2A3552'],
  'lab-white': ['#FBFAF4', '#E6E8E1', '#C4CBC5'],
  'scrub-teal': ['#86D1C8', '#4FAAA3', '#2F7F80'],
  'scrub-blue': ['#9CC2E8', '#6A97CC', '#46709F'],
  'hi-vis': ['#F4E35A', '#DDC52C', '#A9901B'],
  'safety-orange': ['#F7A653', '#E07A2C', '#AF5A1C'],
  rose: ['#EBAAB6', '#D07A8D', '#A4536A'],
  plum: ['#A884B0', '#83608D', '#5E416A'],
  emerald: ['#79C99A', '#45A272', '#2B7653'],
  sky: ['#B0DAF2', '#7FB8DF', '#548FBD'],
  graphite: ['#848990', '#62676E', '#44484F'],
  khaki: ['#DCCB9F', '#BEA878', '#968255'],
  mustard: ['#EDC862', '#CDA23A', '#9C7925'],
  coral: ['#F4A88C', '#DC7F62', '#B15D46'],
  'black-cloth': ['#615C68', '#45414C', '#2E2B34'],
  steel: ['#D7DCD2', '#B5C3BA', '#8B9D96'],
  cocoa: ['#B08A6E', '#8C6A52', '#664A39'],
  'kit-red': ['#E8605A', '#C93A3A', '#962A2E'],
  'royal-blue': ['#6F8FE8', '#3F62CC', '#28449A'],
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
    if (!refresh) return;
  } catch {
    /* Absent: seed it. */
  }
  await writeJson(path, data);
}
await seed('content/palettes/key-colours.json', keys);
await seed('content/palettes/ramps.json', ramps);
await seed('content/palettes/world-palette.json', [
  ...new Set([
    ...fixed,
    ...Object.values(ramps).flat(),
    ...MODERN_COLOURS,
    ...PORTRAIT_COLOURS,
  ]),
]);
await seed('content/rules/never-depict.json', {
  comment:
    'This list will be extended by the advisory panel. Exact full-name exceptions require human review; no blanket approval of common given names.',
  denylist: [
    'Muhammad',
    // Common transliterations block by default, like the canonical spelling.
    'Mohamed',
    'Mohammed',
    'Mohammad',
    'Muhammed',
    'Mohamad',
    'Ahmad',
    'Ahmed',
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
  allowlist: [
    'Muhammad ibn Musa al-Khwarizmi',
    // Approved by the project owner (2026-11): the footballer, born 1992.
    'Mohamed Salah',
    // Approved by the project owner (2026-11): the boxer, 1942–2016.
    'Muhammad Ali',
    // Approved by the project owner (2026-11): today's scholars and a
    // Nobel laureate, each as an exact full name.
    'Mufti Ismail Menk',
    'Hamza Yusuf',
    'Ahmed Zewail',
    // Approved by the project owner (2026-11): the economist, b. 1940.
    'Muhammad Yunus',
  ],
});
const traditional = [
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
const traditionalHeadwear = [
  'imamah',
  'kufi',
  'taqiyah',
  'hijab',
  'khimar',
  'songkok',
  'hui-cap',
];
await seed('content/wardrobe.json', {
  'mosque-garden': {
    region: 'mosque-garden',
    era: 'contemporary, with traditional dress still worn today — advisory review pending',
    garments: [...garments, 'none'],
    headwear: [...headwear, 'none'],
  },
  'modern-quarter': {
    region: 'modern-quarter',
    era: '20th–21st century — advisory review pending',
    garments: [...garments, 'none'],
    headwear: [...headwear, 'none'],
  },
  ...Object.fromEntries(
    ['house-of-wisdom', 'maghreb'].map((id) => [
      id,
      {
        region: id,
        era: 'classical — advisory review pending',
        garments: [...traditional, 'none'],
        headwear: [...traditionalHeadwear, 'none'],
      },
    ]),
  ),
});
const { room, ambient, cards } = modernQuarter();
await seed('rooms/mosque-garden.tmj', room);
await seed('content/ambient/mosque-garden.json', ambient);
for (const c of cards) await seed(`content/characters/${c.id}.json`, c);
// Legacy floor tiles 1–6 (stone ×3, grass, water, pale stone); 7–13 are modern.
for (let i = 0; i < 6; i++) {
  try {
    await fs.access(`art/tiles/tile-${i + 1}.png`);
    if (!refresh) continue;
  } catch {
    /* Preserve authored tile replacements. */
  }
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
await generateParts(refresh);
// Sharp heads follow the cards as they are on disk (authored looks included).
const onDisk = [];
for (const f of await files('content/characters', '.json'))
  onDisk.push(await readJson(f));
const heads = await generatePortraits(onDisk, PORTRAITS, ramps, keys, refresh);
await generateObjects();
await generateDetails();
await generateModernObjects();
await generateModernTiles();
console.log(
  `Placeholder art and the Peace Quarter: ${ambient.length} ambient people, ${cards.length} draft cards, ${heads} sharp heads${refresh ? ' (refreshed)' : '; authored content preserved'}. Room centre: ${worldFromTile(32, 32)}.`,
);
