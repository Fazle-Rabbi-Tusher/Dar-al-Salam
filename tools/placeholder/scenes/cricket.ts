import type {
  Character,
  Facing,
  Look,
  Step,
} from '../../../packages/shared/schema';

/*
 * Cricket-ground scenes from docs/scene-bible.md (Bangladesh block, next to
 * Tamim and Mashrafe). Mohammad Rizwan's scene waits for the owner's
 * allowlist approval of his name, so it is not here. Nothing is approved:
 * cards stay drafts and stories stay placeholders (AGENTS.md).
 */
type Pt = [number, number];
const look = (
  base: string,
  garment: string,
  colours: Partial<Look['colours']>,
  headwear = 'none',
  prop = 'none',
): Look => ({
  base,
  garment,
  headwear,
  prop,
  colours: {
    skin: 'skin-3',
    hair: 'hair-black',
    garmentPrimary: 'white-linen',
    garmentSecondary: 'white-linen',
    headwear: 'emerald',
    prop: 'wool-cream',
    ...colours,
  },
});
const at = (
  from: number,
  to: number,
  action: Step['action'],
  p: Pt,
  facing: Facing,
  extra: Partial<Step> = {},
): Step => ({ from, to, action, at: p, facing, ...extra });
const go = (
  from: number,
  to: number,
  action: Step['action'],
  path: Pt[],
  extra: Partial<Step> = {},
): Step => ({ from, to, action, path, ...extra });
const scene = (
  id: string,
  role: string,
  l: Look,
  script: Step[],
  kind: Character['kind'] = 'person',
): Character => ({
  id: `amb-cricket-${id}`,
  kind,
  aliases: [],
  district: 'mosque-garden',
  depiction: 'full',
  look: l,
  loop: 240,
  script,
  role,
});

/** Height of the presentation stage in px (people on it stand at this z). */
const STAGE = 10;
const ROW = 114.6;
const KHAWAJA: Pt = [66.2, ROW];
const BELOW: Pt = [66.2, 116.4];

/** [type, x, y, z]: z lifts the backdrop onto the stage top. */
export const CRICKET_OBJECTS: [string, number, number, number][] = [
  // Khawaja's podium at the west end of the cricket ground.
  ['m-presentation-stage', 63.6, 113.6, 0],
  ['m-presentation-backdrop', 63.6, 113.6, STAGE],
];

/** Australia in whites and green caps; South Africa in green and gold. */
const aussie = (base = 'adult-man-short') =>
  look(base, 'shirt-trousers', {}, 'cap');
const proteas = (sponsor: boolean) =>
  look(
    'adult-man-short',
    sponsor ? 'shirt-trousers-sponsor' : 'shirt-trousers',
    {
      garmentPrimary: 'emerald',
      // The sponsor kit's chest block; the plain kit's trousers match the shirt.
      garmentSecondary: sponsor ? 'mustard' : 'emerald',
      skin: 'skin-3',
    },
  );

export function cricketAmbient(): Character[] {
  const teammates: [number, boolean][] = [
    [64.2, false],
    [65.2, false],
    [67.2, true],
    [68.0, false],
  ];
  return [
    // The podium: bottles shake; the captain stops it and calls him back.
    ...teammates.map(([x, captain], i) =>
      scene(
        captain ? 'captain' : `aussie-${i}`,
        captain
          ? 'Team captain, calling his teammate back'
          : 'Teammate on the podium',
        aussie(i % 2 ? 'adult-man-beard' : 'adult-man-short'),
        [
          at(0, 96, 'cheer', [x, ROW], 'SE', { z: STAGE, prop: 'bottle' }),
          captain
            ? at(96, 144, 'wave', [x, ROW], 'SW', { z: STAGE })
            : at(96, 144, 'idle', [x, ROW], 'SE', { z: STAGE }),
          at(144, 216, 'cheer', [x, ROW], 'SE', {
            z: STAGE,
            ...(captain ? { prop: 'trophy' } : {}),
          }),
          at(216, 240, 'idle', [x, ROW], 'SE', { z: STAGE }),
        ],
      ),
    ),
    // Amla's cover drive races to the boundary.
    scene(
      'amla-ball',
      'The ball racing to the boundary',
      look('ball', 'none', {}),
      [
        at(0, 12, 'ball_still', [86.9, 117.6], 'SE'),
        go(12, 40, 'ball_roll', [
          [86.9, 117.6],
          [92.6, 119.2],
        ]),
        at(40, 220, 'ball_still', [92.6, 119.2], 'SE'),
        go(220, 240, 'ball_roll', [
          [92.6, 119.2],
          [86.9, 117.6],
        ]),
      ],
      'ball',
    ),
    // The line of South Africa shirts: all carry the sponsor block but his.
    ...[85.6, 86.9, 89.5, 90.8].map((x, i) =>
      scene(
        `proteas-${i}`,
        'Teammate in the line, shirt with the sponsor',
        proteas(true),
        [at(0, 240, 'idle', [x, 115.2], 'SE')],
      ),
    ),
  ];
}

const wiki = (title: string) => ({
  label: 'Wikipedia',
  url: `https://en.wikipedia.org/wiki/${title}`,
});
/** New draft cards (names pass the denylist). Never approved here. */
export const CRICKET_CARDS: (Partial<Character> &
  Pick<Character, 'id' | 'look' | 'script'>)[] = [
  {
    id: 'usman-khawaja',
    name: { en: 'Usman Khawaja', ar: 'عثمان خواجة', bn: 'উসমান খাজা' },
    years: 'b. 1986',
    place: 'Islamabad · Sydney',
    district: 'modern-quarter',
    summary: {
      en: 'Australian opening batsman born in Islamabad, the first Muslim to play Test cricket for Australia. When his team celebrated the 2022 Ashes with champagne, he stepped aside, and captain Pat Cummins stopped the spraying so he could rejoin the photo.',
    },
    links: [
      wiki('Usman_Khawaja'),
      {
        label: 'Yahoo Sport Australia',
        url: 'https://au.sports.yahoo.com/ashes-2022-pat-cummins-classy-gesture-during-celebrations-215013421.html',
      },
      { label: 'The Roar', url: 'https://www.theroar.com.au/?p=1172613' },
    ],
    look: look('adult-man-beard', 'shirt-trousers', {}, 'cap'),
    loop: 240,
    // Steps off the stage as the bottles shake; called back; trophy together.
    script: [
      at(0, 60, 'idle', KHAWAJA, 'SE', { z: STAGE }),
      go(60, 84, 'walk', [KHAWAJA, BELOW], { z: [STAGE, 0] }),
      at(84, 120, 'idle', BELOW, 'NW'),
      go(120, 144, 'walk', [BELOW, KHAWAJA], { z: [0, STAGE] }),
      at(144, 216, 'cheer', KHAWAJA, 'SE', { z: STAGE }),
      at(216, 240, 'idle', KHAWAJA, 'SE', { z: STAGE }),
    ],
  },
  {
    id: 'hashim-amla',
    name: { en: 'Hashim Amla', ar: 'هاشم أملا', bn: 'হাশিম আমলা' },
    years: 'b. 1983',
    place: 'Durban',
    district: 'modern-quarter',
    summary: {
      en: 'South African batsman known for his calm style and long beard. He declined to wear the team’s beer-sponsor logo on his shirt, so his was the only shirt without it, and reportedly gave up his fee from beer-sponsored matches.',
    },
    links: [
      wiki('Hashim_Amla'),
      {
        label: 'Cricket.com.au',
        url: 'https://www.cricket.com.au/news/3239535',
      },
      {
        label: 'Cape Argus',
        url: 'https://capeargus.co.za/sport/2009-12-28-no-beer-money-in-amlas-coffers',
      },
    ],
    look: {
      ...proteas(false),
      base: 'adult-man-beard',
      prop: 'cricket-bat',
      colours: {
        ...proteas(false).colours,
        skin: 'skin-4',
        prop: 'wool-cream',
      },
    },
    loop: 240,
    // A cover drive; then he stands in the line, the one plain shirt.
    script: [
      at(0, 36, 'bat', [86.4, 117.2], 'SE'),
      go(36, 60, 'walk', [
        [86.4, 117.2],
        [88.2, 115.2],
      ]),
      at(60, 200, 'idle', [88.2, 115.2], 'SE'),
      go(200, 240, 'walk', [
        [88.2, 115.2],
        [86.4, 117.2],
      ]),
    ],
  },
];
