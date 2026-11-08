import type {
  Character,
  Facing,
  Look,
  Step,
} from '../../../packages/shared/schema';

/*
 * Stadium scenes from docs/scene-bible.md. Each is a short moment on the
 * 240-frame master loop: the famous moment, then the deed ("the turn"), then
 * a settle back to the first frame. Nothing here is approved: cards stay
 * drafts and stories stay placeholders (AGENTS.md).
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
    skin: 'skin-4',
    hair: 'hair-black',
    garmentPrimary: 'white-linen',
    garmentSecondary: 'white-linen',
    headwear: 'white-linen',
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

/** Objects for the stadium scenes: [type, x, y]. */
export const STADIUM_OBJECTS: [string, number, number][] = [
  // Özil: children from a hospital ward in a small stand behind the east goal.
  ['m-hospital-stand', 93.6, 17],
  // The strip south of the pitch: Salah's ambulance centre, Mané's school.
  ['m-ambulance-centre', 69.6, 36.2],
  ['m-village-school', 82.4, 36.2],
];

const kits = {
  liverpool: { garmentPrimary: 'kit-red', garmentSecondary: 'lab-white' },
  arsenal: { garmentPrimary: 'kit-red', garmentSecondary: 'lab-white' },
  blue: { garmentPrimary: 'royal-blue', garmentSecondary: 'lab-white' },
};

/** Scene roles (ambient people and things) for the stadium scenes. */
export function stadiumAmbient(): Character[] {
  const person = (
    id: string,
    role: string,
    l: Look,
    script: Step[],
    kind: Character['kind'] = 'person',
  ): Character => ({
    id: `amb-stadium-${id}`,
    kind,
    aliases: [],
    district: 'mosque-garden',
    depiction: 'full',
    look: l,
    loop: 240,
    script,
    role,
  });
  const player = (kit: Partial<Look['colours']>, base = 'adult-man-short') =>
    look(base, 'football-kit', { skin: 'skin-3', ...kit });
  return [
    // Özil: the through ball comes from an unnamed teammate.
    person(
      'ozil-passer',
      'Teammate playing the through ball',
      player(kits.arsenal),
      [
        at(0, 228, 'idle', [80.6, 23.4], 'SE'),
        at(228, 240, 'kick', [80.6, 23.4], 'SE'),
      ],
    ),
    // Salah: an ambulance rolls out of the new ambulance centre.
    person(
      'ambulance',
      'Ambulance from the village ambulance centre',
      { ...look('ambulance', 'none', {}), garment: 'none' },
      [
        at(0, 96, 'vehicle_drive', [71.6, 38.9], 'SE'),
        go(96, 150, 'vehicle_drive', [
          [71.6, 38.9],
          [76.4, 38.9],
        ]),
        at(150, 200, 'vehicle_drive', [76.4, 38.9], 'SE'),
        go(200, 240, 'vehicle_drive', [
          [76.4, 38.9],
          [71.6, 38.9],
        ]),
      ],
      'vehicle',
    ),
    // Mané: children run to the door of the village school.
    ...(
      [
        [88.6, 40.2, 'child-a', 0],
        [89.4, 39.4, 'child-b', 1],
        [87.8, 39.0, 'child-c', 2],
      ] as [number, number, string, number][]
    ).map(([x, y, id, i]) =>
      person(
        `school-${id}`,
        'Pupil running to the village school',
        look(
          'child',
          i === 1 ? 'long-dress' : 'shirt-trousers',
          i === 1
            ? { skin: 'skin-7', garmentPrimary: 'sky', headwear: 'white-linen' }
            : {
                skin: 'skin-7',
                garmentPrimary: 'white-linen',
                garmentSecondary: 'navy',
              },
          i === 1 ? 'hijab' : 'none',
          'book',
        ),
        [
          at(0, 120, 'idle', [x, y], 'NW'),
          go(120, 160, 'walk', [
            [x, y],
            [84.4 + i * 0.8, 38.6],
          ]),
          at(160, 210, 'wave', [84.4 + i * 0.8, 38.6], 'SE'),
          go(210, 240, 'walk', [
            [84.4 + i * 0.8, 38.6],
            [x, y],
          ]),
        ],
      ),
    ),
    // Kanté: the trophy passes from hand to hand while he waits at the edge.
    person('france-1', 'Teammate lifting the trophy', player(kits.blue), [
      at(0, 48, 'cheer', [78.2, 28.4], 'SE', { prop: 'trophy' }),
      at(48, 120, 'cheer', [78.2, 28.4], 'SE'),
      go(120, 150, 'walk', [
        [78.2, 28.4],
        [80.9, 30.1],
      ]),
      at(150, 210, 'cheer', [80.9, 30.1], 'SE'),
      go(210, 240, 'walk', [
        [80.9, 30.1],
        [78.2, 28.4],
      ]),
    ]),
    person(
      'france-2',
      'Teammate carrying the trophy to Kanté',
      player(kits.blue),
      [
        at(0, 48, 'cheer', [79.4, 28.8], 'SE'),
        go(
          48,
          96,
          'carry',
          [
            [79.4, 28.8],
            [81.0, 29.2],
          ],
          { prop: 'trophy' },
        ),
        at(96, 210, 'cheer', [81.0, 29.2], 'SE'),
        go(210, 240, 'walk', [
          [81.0, 29.2],
          [79.4, 28.8],
        ]),
      ],
    ),
  ];
}
/** Upgraded loops for people who already have a card. */
export const STADIUM_UPGRADES: Record<
  string,
  Pick<Character, 'loop' | 'script'> & { look?: Partial<Look> }
> = {
  // Run in, finish, sujood; the ambulance leaves the centre just off the pitch.
  'mohamed-salah': {
    loop: 240,
    script: [
      go(0, 24, 'walk', [
        [78.4, 22.6],
        [75.0, 26.4],
      ]),
      at(24, 36, 'kick', [75.0, 26.4], 'SW'),
      at(36, 120, 'sujood', [75.0, 26.4], 'SW'),
      at(120, 180, 'cheer', [75.0, 26.4], 'SE'),
      go(180, 240, 'walk', [
        [75.0, 26.4],
        [78.4, 22.6],
      ]),
    ],
  },
  // Goal and sujood, then the school he funded in Bambali (confirmed backup).
  'sadio-mane': {
    loop: 240,
    script: [
      go(0, 24, 'walk', [
        [80.4, 24.4],
        [84.6, 27.6],
      ]),
      at(24, 36, 'kick', [84.6, 27.6], 'SE'),
      at(36, 120, 'sujood', [84.6, 27.6], 'SE'),
      at(120, 180, 'hand-on-heart', [84.6, 27.6], 'SE'),
      go(180, 240, 'walk', [
        [84.6, 27.6],
        [80.4, 24.4],
      ]),
    ],
  },
  // Waits at the edge; a teammate brings him the trophy; he is lifted up.
  'ngolo-kante': {
    loop: 240,
    look: { prop: 'none' },
    script: [
      at(0, 96, 'idle', [81.8, 29.8], 'NW'),
      at(96, 150, 'carry', [81.8, 29.8], 'SE', { prop: 'trophy' }),
      at(150, 210, 'cheer', [81.8, 29.8], 'SE', {
        prop: 'trophy',
        z: [0, 14, 14, 14, 0],
      }),
      at(210, 240, 'idle', [81.8, 29.8], 'SW'),
    ],
  },
};

/** Real sources from the scene bible, added to existing cards' links. */
export const STADIUM_LINKS: Record<string, Character['links']> = {
  'mesut-ozil': [
    {
      label: 'UEFA match report',
      url: 'https://www.uefa.com/uefachampionsleague/news/0233-0e9591456f5d-b1a200c579f0-1000--ozil-completes-arsenal-comeback-at-ludogorets',
    },
    {
      label: 'Yahoo Sports',
      url: 'https://ca.sports.yahoo.com/blogs/soccer-dirty-tackle/mesut-ozil-paying-for-surgeries-of-23-brazilian-children-to-show-thanks-for-world-cup-hospitality-004617079.html',
    },
  ],
  'mohamed-salah': [
    {
      label: 'Al Jazeera',
      url: 'https://www.aljazeera.com/news/2021/1/12/liverpools-salah-donates-oxygen-to-support-his-egyptian-village',
    },
  ],
  'ngolo-kante': [
    {
      label: 'ESPN',
      url: 'https://www.espn.co.uk/football/story/_/id/49028067/utils',
    },
  ],
};
