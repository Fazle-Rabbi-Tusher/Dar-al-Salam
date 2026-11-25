import { readJson, writeJson } from './build/io';
import { CARAVAN, rulerTile } from '../packages/shared/royal-caravan';
import { characterSchema, type Step } from '../packages/shared/schema';

const script: Step[] = [
  { from: 0, to: 24, action: 'idle', at: rulerTile(0), facing: 'SE' },
  {
    from: 24,
    to: 64,
    action: 'ride',
    path: [rulerTile(24), rulerTile(64)],
    easing: 'smoothstep',
  },
  { from: 64, to: 88, action: 'idle', at: rulerTile(64), facing: 'SE' },
  {
    from: 88,
    to: 128,
    action: 'ride',
    path: [rulerTile(88), rulerTile(128)],
    easing: 'smoothstep',
  },
  { from: 128, to: 152, action: 'idle', at: rulerTile(128), facing: 'SE' },
  {
    from: 152,
    to: 240,
    action: 'ride',
    path: [
      ...Array.from({ length: 12 }, (_, i) => rulerTile(152 + i * 8)),
      rulerTile(0),
    ],
  },
];
const file = 'content/characters/mansa-musa.json';
let previous;
try {
  previous = await readJson(file);
} catch {
  /* New draft character. */
}
const card = characterSchema.parse(
  previous
    ? previous
    : {
        id: 'mansa-musa',
        kind: 'person',
        name: { en: 'Mansa Musa', ar: 'مانسا موسى', bn: 'মানসা মুসা' },
        aliases: [],
        years: 'r. c. 1312–1337',
        place: 'Mali Empire',
        district: 'maghreb',
        depiction: 'full',
        look: {
          base: 'adult-man-beard',
          garment: 'boubou',
          headwear: 'imamah',
          prop: 'none',
          colours: {
            skin: 'skin-8',
            hair: 'hair-black',
            garmentPrimary: 'white-linen',
            garmentSecondary: 'madder-red',
            headwear: 'white-linen',
          },
        },
        loop: 240,
        script,
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
        summary: {
          en: 'Ruler of the Mali Empire, remembered for his 1324 pilgrimage and the gold he spent and gave away on the journey. This caravan and its three donation stops are an illustrative reconstruction, not a record of exact people, uniforms or events.',
        },
        links: [
          {
            label: 'Britannica',
            url: 'https://www.britannica.com/biography/Musa-I-of-Mali',
          },
          {
            label: 'World History Encyclopedia',
            url: 'https://www.worldhistory.org/Mansa_Musa/',
          },
        ],
        panelApproved: false,
      },
);
card.look.colours.prop ??= 'brass';
if (
  !card.links?.some((l) => l.url === 'https://en.wikipedia.org/wiki/Mansa_Musa')
)
  card.links = [
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Mansa_Musa' },
    ...(card.links ?? []),
  ];
await writeJson(file, card);
// The caravan is no longer a native world object: its figures are pixel-art
// sprites walking the open desert (tools/prepare-caravan-sprites.ts writes
// Mansa Musa's script and the caravan's ambient figures).
await writeJson('content/scenes/gold-caravan.json', {
  id: 'gold-caravan',
  title: {
    en: 'Mansa Musa — the gold caravan',
    ar: 'مانسا موسى — قافلة الذهب',
    bn: 'মানসা মুসা — সোনার কাফেলা',
  },
  lead: 'mansa-musa',
  members: ['mansa-musa'],
  props: [],
  area: [
    CARAVAN.tile,
    [
      CARAVAN.tile[0] + CARAVAN.footprint[0],
      CARAVAN.tile[1] + CARAVAN.footprint[1],
    ],
  ],
  camera: 'frame',
});
for (const [lang, title] of [
  ['en', 'Mansa Musa'],
  ['ar', 'مانسا موسى'],
  ['bn', 'মানসা মুসা'],
]) {
  const f = `content/i18n/${lang}.json`,
    value = await readJson(f);
  value.goldCaravan = title;
  await writeJson(f, value);
}
console.log(
  'Mansa Musa: draft ruler card, caravan scene and direct navigation (run tools/prepare-caravan-sprites.ts for his sprites and script).',
);
