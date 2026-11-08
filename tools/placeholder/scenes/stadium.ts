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
            [84.4 + i * 0.8, 39.4],
          ]),
          at(160, 210, 'wave', [84.4 + i * 0.8, 39.4], 'SE'),
          go(210, 240, 'walk', [
            [84.4 + i * 0.8, 39.4],
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

/* ───────────── Batch 1b: new stadium cards ───────────── */
const kits1b = {
  morocco: { garmentPrimary: 'kit-red', garmentSecondary: 'emerald' },
  keeper: { garmentPrimary: 'emerald', garmentSecondary: 'kit-red' },
  sevilla: { garmentPrimary: 'lab-white', garmentSecondary: 'kit-red' },
  spain: { garmentPrimary: 'mustard', garmentSecondary: 'kit-red' },
};
/** Boufal and his mother turn in a small circle, hand in hand. */
const CIRCLE: Pt[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return [
    Math.round((71.0 + Math.cos(a) * 0.6) * 100) / 100,
    Math.round((26.6 + Math.sin(a) * 0.6) * 100) / 100,
  ] as Pt;
});
/** Kanouté's mosque door and Ziyech's tunnel, in the strip south of the pitch. */
STADIUM_OBJECTS.push(['m-mosque-door', 65.6, 36.4], ['m-tunnel', 77.6, 36.2]);

const scene = (
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
const kit = (
  colours: Partial<Look['colours']>,
  base = 'adult-man-short',
  garment = 'football-kit',
  prop = 'none',
) => look(base, garment, { skin: 'skin-3', ...colours }, 'none', prop);

export function stadiumAmbient1b(): Character[] {
  return [
    // Kanouté: teammates whose shirts carry a plain sponsor block; his is plain.
    ...([64.0, 65.2] as number[]).map((x, i) =>
      scene(
        `sevilla-${i}`,
        'Teammate in the line-up',
        kit(kits1b.sevilla, 'adult-man-beard', 'football-kit-sponsor'),
        [
          at(0, 60, 'idle', [x, 39.2], 'SE'),
          at(60, 96, 'cheer', [x, 39.2], 'SE'),
          at(96, 240, 'idle', [x, 39.2], 'SE'),
        ],
      ),
    ),
    scene(
      'seville-caretaker',
      'Keeper of the mosque door',
      look('elder', 'thobe', { skin: 'skin-3' }, 'kufi'),
      [
        at(0, 120, 'idle', [66.6, 38.3], 'SE'),
        at(120, 180, 'talk', [66.6, 38.3], 'SE', { prop: 'keys' }),
        at(180, 240, 'wave', [66.6, 38.3], 'SE'),
      ],
    ),
    // Ziyech: the club official hands over the pay envelope.
    scene(
      'morocco-official',
      'Team official with the pay envelope',
      look('adult-man', 'suit', { skin: 'skin-3', garmentPrimary: 'navy' }),
      [
        at(0, 30, 'idle', [80.4, 39.2], 'SW'),
        at(30, 60, 'talk', [80.4, 39.2], 'SW', { prop: 'envelope' }),
        at(60, 240, 'idle', [80.4, 39.2], 'SW'),
      ],
    ),
    scene(
      'kit-man',
      'Kit man, surprised by a gift',
      look('adult-man', 'shirt-trousers', {
        skin: 'skin-4',
        garmentPrimary: 'emerald',
        garmentSecondary: 'charcoal',
      }),
      [
        at(0, 150, 'idle', [79.6, 40.6], 'NE'),
        at(150, 200, 'cheer', [79.6, 40.6], 'SE', { prop: 'envelope' }),
        at(200, 240, 'idle', [79.6, 40.6], 'NE'),
      ],
    ),
    scene(
      'cleaner',
      'Stadium cleaner, surprised by a gift',
      look(
        'adult-woman',
        'long-dress',
        { skin: 'skin-5', garmentPrimary: 'sky', headwear: 'navy' },
        'hijab',
        'broom',
      ),
      [
        at(0, 150, 'sweep', [80.9, 40.4], 'SW'),
        at(150, 200, 'cheer', [80.9, 40.4], 'SW'),
        at(200, 240, 'sweep', [80.9, 40.4], 'SW'),
      ],
    ),
    // Morocco 2022: the penalty Bono saves, the team, his toddler in big gloves.
    scene('spain-taker', 'Penalty taker', kit(kits1b.spain), [
      at(0, 12, 'idle', [71.6, 22.4], 'NW'),
      at(12, 24, 'kick', [71.6, 22.4], 'NW'),
      at(24, 240, 'idle', [71.6, 22.4], 'NW'),
    ]),
    scene(
      'penalty-ball',
      'The match ball',
      look('ball', 'none', {}),
      [
        at(0, 18, 'ball_still', [71.0, 22.6], 'SE'),
        go(
          18,
          30,
          'ball_roll',
          [
            [71.0, 22.6],
            [69.2, 23.4],
          ],
          { z: [0, 8, 0] },
        ),
        at(30, 220, 'ball_still', [69.2, 23.4], 'SE'),
        go(220, 240, 'ball_roll', [
          [69.2, 23.4],
          [71.0, 22.6],
        ]),
      ],
      'ball',
    ),
    ...(
      [
        [69.6, 21.2],
        [70.4, 22.6],
        [69.8, 24.0],
      ] as Pt[]
    ).map((p, i) =>
      scene(
        `morocco-${i}`,
        'Teammate celebrating the shootout win',
        kit(kits1b.morocco, 'adult-man-beard'),
        [
          at(0, 36, 'idle', [p[0] + 1.2, p[1]], 'NW'),
          go(36, 72, 'walk', [[p[0] + 1.2, p[1]], p]),
          at(72, 132, 'cheer', p, 'SW'),
          at(132, 210, 'cheer', p, 'SE'),
          go(210, 240, 'walk', [p, [p[0] + 1.2, p[1]]]),
        ],
      ),
    ),
    scene(
      'bono-son',
      "Bono's son trying on his gloves",
      look(
        'child',
        'football-kit',
        { skin: 'skin-3', garmentPrimary: 'emerald' },
        'none',
        'keeper-gloves',
      ),
      [at(0, 240, 'cheer', [68.9, 24.4], 'SE')],
    ),
    scene(
      'boufal-mother',
      'Dancing with her son after the win',
      look(
        'adult-woman',
        'abaya',
        {
          skin: 'skin-3',
          garmentPrimary: 'navy',
          garmentSecondary: 'mustard',
          headwear: 'rose',
        },
        'hijab',
      ),
      [
        at(0, 132, 'cheer', CIRCLE[4], 'NW'),
        go(132, 240, 'walk', [...CIRCLE.slice(4), ...CIRCLE.slice(0, 5)]),
      ],
    ),
  ];
}

const wiki = (title: string) => ({
  label: 'Wikipedia',
  url: `https://en.wikipedia.org/wiki/${title}`,
});
/** New draft cards (names pass the denylist). Never approved here. */
export const STADIUM_CARDS: (Partial<Character> &
  Pick<Character, 'id' | 'look' | 'script'>)[] = [
  {
    id: 'frederic-kanoute',
    name: {
      en: 'Frédéric Kanouté',
      ar: 'فريدريك كانوتيه',
      bn: 'ফ্রেদেরিক কানুতে',
    },
    aliases: ['Frederic Kanoute'],
    years: 'b. 1977',
    place: 'Lyon · Seville',
    district: 'modern-quarter',
    summary: {
      en: 'Malian forward who starred for Sevilla. He declined to wear a gambling sponsor on his shirt, and in 2007 he paid for the premises of Seville’s main mosque when its lease ran out, so the community could keep it.',
    },
    links: [
      wiki('Fr%C3%A9d%C3%A9ric_Kanout%C3%A9'),
      {
        label: 'Expatica / El País',
        url: 'https://expatica.com/es/general/kanout-strikes-chord-with-seville-faithful-2-40407',
      },
    ],
    look: kit({ ...kits1b.sevilla, skin: 'skin-7' }, 'adult-man-shaved-beard'),
    loop: 240,
    // Plain shirt in a line of sponsored ones; a goal; keys handed through
    // the mosque door as the lights come on inside (frame 120).
    script: [
      at(0, 60, 'idle', [66.4, 39.2], 'SE'),
      at(60, 96, 'celebrate', [66.4, 39.2], 'SE'),
      go(96, 120, 'walk', [
        [66.4, 39.2],
        [67.8, 38.9],
      ]),
      at(120, 180, 'talk', [67.8, 38.9], 'NW', { prop: 'keys' }),
      at(180, 216, 'wave', [67.8, 38.9], 'SE'),
      go(216, 240, 'walk', [
        [67.8, 38.9],
        [66.4, 39.2],
      ]),
    ],
  },
  {
    id: 'hakim-ziyech',
    name: { en: 'Hakim Ziyech', ar: 'حكيم زياش', bn: 'হাকিম জিয়েশ' },
    years: 'b. 1993',
    place: 'Dronten · Morocco',
    district: 'modern-quarter',
    summary: {
      en: 'Moroccan winger born in the Netherlands who chose to play for Morocco. Since joining the national team he has been reported to give his international earnings to charity and to team staff.',
    },
    links: [
      wiki('Hakim_Ziyech'),
      {
        label: 'NBC',
        url: 'https://www.nbcsandiego.com/news/sports/hakim-ziyech-donates-2022-world-cup-earnings-to-poor-in-morocco/3123829/',
      },
    ],
    look: kit({ ...kits1b.morocco, skin: 'skin-2' }, 'adult-man-beard'),
    loop: 240,
    // A curler, then the pay envelope passed straight on to the staff.
    script: [
      at(0, 12, 'kick', [79.2, 39.4], 'SE'),
      at(12, 60, 'celebrate', [79.2, 39.4], 'SE'),
      at(60, 110, 'idle', [79.2, 39.4], 'SE', { prop: 'envelope' }),
      at(110, 150, 'talk', [79.2, 39.4], 'SW', { prop: 'envelope' }),
      at(150, 240, 'wave', [79.2, 39.4], 'SE'),
    ],
  },
  {
    id: 'yassine-bounou',
    name: { en: 'Yassine Bounou', ar: 'ياسين بونو', bn: 'ইয়াসিন বুনু' },
    aliases: ['Bono'],
    years: 'b. 1991',
    place: 'Montreal · Casablanca',
    district: 'modern-quarter',
    summary: {
      en: 'Moroccan goalkeeper who saved penalties in the shootout as Morocco beat Spain at the 2022 World Cup, on the way to becoming the first African team to reach a World Cup semi-final.',
    },
    links: [
      wiki('Yassine_Bounou'),
      {
        label: 'CBS Sports',
        url: 'https://www.cbssports.com/soccer/news/world-cup-score-spain-eliminated-as-morocco-advance-in-fifa-world-cup-2022-upset-after-penalty-shootout/live',
      },
    ],
    look: kit(
      kits1b.keeper,
      'adult-man-beard',
      'football-kit',
      'keeper-gloves',
    ),
    loop: 240,
    // The save, then his teammates toss him in the air.
    script: [
      at(0, 12, 'idle', [68.4, 22.8], 'SE'),
      at(12, 36, 'dive', [68.4, 22.8], 'SW'),
      at(36, 72, 'cheer', [68.4, 22.8], 'SE'),
      at(72, 132, 'cheer', [68.4, 22.8], 'SE', { z: [0, 18, 4, 18, 0] }),
      at(132, 240, 'idle', [68.4, 22.8], 'SE'),
    ],
  },
  {
    id: 'sofiane-boufal',
    name: { en: 'Sofiane Boufal', ar: 'سفيان بوفال', bn: 'সোফিয়ান বুফাল' },
    years: 'b. 1993',
    place: 'Paris · Morocco',
    district: 'modern-quarter',
    summary: {
      en: 'Moroccan winger who brought his mother onto the pitch and danced with her after Morocco beat Portugal in the 2022 World Cup quarter-final.',
    },
    links: [
      wiki('Sofiane_Boufal'),
      {
        label: 'The New Arab',
        url: 'https://www.newarab.com/news/world-cup-morocco-team-kin-melt-hearts-celebrations',
      },
    ],
    look: kit({ ...kits1b.morocco, skin: 'skin-3' }, 'adult-man-beard'),
    loop: 240,
    // Turning in circles with his mother while teammates clap.
    script: [
      at(0, 132, 'cheer', CIRCLE[0], 'SE'),
      go(132, 240, 'walk', [...CIRCLE, CIRCLE[0]]),
    ],
  },
];
