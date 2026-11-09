import {
  characterSchema,
  roomSchema,
  type Character,
  type Look,
  type Room,
  type RoomObject,
  type Step,
} from '../../packages/shared/schema';
import { scriptErrors } from '../../packages/shared/script';
import { MODERN_OBJECTS } from './modern';
import {
  STADIUM_LINKS,
  STADIUM_OBJECTS,
  STADIUM_CARDS,
  STADIUM_UPGRADES,
  stadiumAmbient,
  stadiumAmbient1b,
} from './scenes/stadium';
import {
  CRICKET_CARDS,
  CRICKET_OBJECTS,
  cricketAmbient,
} from './scenes/cricket';
import { NATURE_OBJECTS } from './scenes/nature';
import { CITY_OBJECTS } from './scenes/city';
import { detailFootprints, type DetailType } from './details';

/*
 * The Peace Quarter: one 96×64-tile room showing contemporary Muslim life and
 * contribution side by side — a modern mosque and study circle, a university
 * science lab, an architecture studio, a hospital, a community kitchen, a
 * mathematics research lab, a street with a café, and a solar garden.
 * Generated deterministically (seeded PRNG, build-time only).
 */
type Pt = [number, number];
type Loop = 60 | 120 | 240;
type Facing = NonNullable<Step['facing']>;

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const legacyFootprints: Record<string, Pt> = {
  palm: [1, 1],
  cypress: [1, 1],
  feeder: [1, 1],
  bowl: [1, 1],
  bench: [2, 1],
  flowers: [3, 2],
};
function footprintOf(type: string): Pt {
  const side = type.endsWith('-side'),
    id = side ? type.slice(0, -5) : type;
  const f: Pt | undefined =
    MODERN_OBJECTS[id]?.footprint ??
    (id.startsWith('detail-')
      ? detailFootprints[id.slice(7) as DetailType]
      : undefined) ??
    legacyFootprints[id];
  if (!f) throw Error(`Unknown object type ${type}`);
  return side ? [f[1], f[0]] : [f[0], f[1]];
}

export function modernQuarter() {
  const random = mulberry32(796);
  const pick = <T>(a: T[]) => a[Math.floor(random() * a.length)];
  const objects: RoomObject[] = [];
  const obj = (type: string, x: number, y: number, walkable = false, z = 0) => {
    const fp = footprintOf(type);
    objects.push({
      id: objects.length + 1,
      type,
      x,
      y,
      footprint: fp,
      walkable: walkable || Boolean(MODERN_OBJECTS[type]?.floor),
      z,
    });
  };

  /* ── looks ── */
  const fabrics = [
    'sky',
    'emerald',
    'coral',
    'mustard',
    'plum',
    'rose',
    'denim',
    'indigo',
    'saffron',
    'madder-red',
    'olive',
    'turquoise',
    'navy',
    'khaki',
  ];
  const scarves = [
    'emerald',
    'navy',
    'rose',
    'plum',
    'sky',
    'mustard',
    'coral',
    'black-cloth',
    'turquoise',
    'wool-cream',
  ];
  const L = (
    base: string,
    garment: string,
    headwear: string,
    prop = 'none',
    c: Partial<Look['colours']> = {},
  ): Look => ({
    base,
    garment,
    headwear,
    prop,
    colours: {
      skin: `skin-${1 + Math.floor(random() * 8)}`,
      hair:
        base === 'elder'
          ? pick(['hair-grey', 'hair-white'])
          : pick(['hair-black', 'hair-black', 'hair-brown']),
      garmentPrimary: pick(fabrics),
      garmentSecondary: pick([
        'navy',
        'denim',
        'graphite',
        'khaki',
        'charcoal',
      ]),
      headwear: base.includes('woman') ? pick(scarves) : 'white-linen',
      prop: pick(['madder-red', 'sky', 'emerald', 'graphite', 'mustard']),
      ...c,
    },
  });
  const man = () =>
    pick([
      L('adult-man', 'shirt-trousers', 'none'),
      L('adult-man', 'thobe', 'kufi', 'none', {
        garmentPrimary: 'white-linen',
      }),
      L('adult-man', 'hoodie-jeans', 'none'),
      L('adult-man', 'panjabi-lungi', 'taqiyah', 'none', {
        garmentPrimary: 'white-linen',
      }),
      L('adult-man', 'boubou', 'kufi'),
      L('adult-man', 'suit', 'none', 'none', { garmentPrimary: 'graphite' }),
      L('adult-man', 'shirt-trousers', 'songkok', 'none', {
        headwear: 'black-cloth',
      }),
    ]);
  const woman = () =>
    pick([
      L('adult-woman', 'long-dress', 'hijab'),
      L('adult-woman', 'abaya', 'hijab', 'none', {
        garmentPrimary: 'black-cloth',
        garmentSecondary: 'saffron',
      }),
      L('adult-woman', 'baju-kurung', 'hijab'),
      L('adult-woman', 'long-dress', 'headwrap'),
      L('adult-woman', 'abaya', 'khimar', 'none', {
        garmentPrimary: 'navy',
        garmentSecondary: 'sky',
      }),
    ]);
  const child = () =>
    pick([
      L('child', 'hoodie-jeans', 'none'),
      L('child', 'hoodie-jeans', 'cap', 'none', { headwear: pick(fabrics) }),
      L('child', 'thobe', 'kufi', 'none', { garmentPrimary: 'white-linen' }),
      L('child', 'long-dress', 'hijab'),
      L('child', 'baju-kurung', 'hijab'),
    ]);
  const elder = () =>
    pick([
      L('elder', 'jubba', 'imamah', 'none', { garmentPrimary: 'charcoal' }),
      L('elder', 'thobe', 'kufi', 'none', { garmentPrimary: 'wool-cream' }),
      L('elder', 'kaftan', 'taqiyah'),
      L('elder', 'suit', 'cap', 'none', {
        garmentPrimary: 'khaki',
        headwear: 'graphite',
      }),
    ]);
  const withProp = (look: Look, prop: string): Look => ({ ...look, prop });

  /* ── characters ── */
  const ambient: Character[] = [];
  const person = (
    id: string,
    at: Pt,
    action: Step['action'],
    look: Look,
    facing: Facing = 'SE',
    loop: Loop = 120,
    extra: Partial<Character> = {},
  ) => {
    const c: Character = {
      id: `amb-${id}`,
      kind: 'person',
      aliases: [],
      district: 'mosque-garden',
      depiction: 'full',
      look,
      loop,
      script: [{ from: 0, to: loop, action, at, facing }],
      ...extra,
    };
    ambient.push(c);
    return c;
  };
  /** Walk a closed route at constant speed over the loop. */
  const walker = (
    id: string,
    route: Pt[],
    look: Look,
    loop: Loop,
    action: Step['action'] = 'walk',
  ) => {
    const c = person(id, route[0], action, look, 'SE', loop);
    c.script = [{ from: 0, to: loop, action, path: [...route, route[0]] }];
    return c;
  };
  /** Two-step routine: go out (and back) around a stationary action. */
  const errand = (
    id: string,
    from: Pt,
    to: Pt,
    look: Look,
    action: Step['action'],
    facing: Facing,
    move: Step['action'] = 'walk',
  ) => {
    const c = person(id, from, move, look);
    c.script = [
      { from: 0, to: 36, action: move, path: [from, to] },
      { from: 36, to: 84, action, at: to, facing },
      { from: 84, to: 120, action: move, path: [to, from] },
    ];
    return c;
  };

  /* ════════ Mosque (x 7–21, y 7–20) ════════ */
  obj('m-dome', 10, 2.2);
  obj('m-minaret', 4.6, 4.6);
  obj('m-minaret', 21.6, 4.2);
  obj('m-archwall', 7, 6.65);
  obj('m-archwall', 15, 6.65);
  obj('m-archwall-side', 6.65, 7);
  obj('m-archwall-side', 6.65, 15);
  obj('m-hall-carpet', 8.4, 8.5, true);
  obj('m-wudu', 8, 18.3);
  obj('m-shoe-rack', 12, 19.6);
  obj('m-desk-plant', 7.3, 7.3);
  obj('m-bookshelf', 16.2, 7.05);
  // A small gathering listening to Mufti Ismail Menk's talk (facing him).
  for (let i = 0; i < 3; i++)
    person(
      `listener-${i}`,
      [11.05 + i * 1.65, 13.4],
      'read',
      withProp(i === 1 ? woman() : man(), 'none'),
      'NE',
    );
  // Study circle: Habib Umar bin Hafiz teaches; the students face him.
  (
    [
      [17.4, 17.6, 'NE'],
      [19.4, 18.4, 'NE'],
      [21.2, 17.2, 'NW'],
    ] as [number, number, Facing][]
  ).forEach(([x, y, f], i) =>
    person(`student-${i}`, [x, y], 'read', withProp(child(), 'book'), f),
  );
  person('wudu-1', [9, 17.7], 'pour', withProp(man(), 'water-jug'), 'SW');

  /* ════════ Architecture studio (x 24–35, y 7–20) ════════ */
  obj('m-whitewall', 23, 6.65);
  obj('m-whitewall', 31, 6.65);
  obj('m-bookshelf', 24.3, 7.05);
  obj('m-screen-wall', 28.2, 7.1);
  obj('m-drafting-table', 25, 10);
  obj('m-drafting-table', 25, 14.5);
  obj('m-tower-model', 31.5, 9.5);
  obj('m-tower-model', 33.4, 9.2);
  obj('m-wave-model', 28.5, 15.5);
  obj('m-computer-desk', 33, 13);
  obj('m-computer-desk', 33, 17);
  obj('m-desk-plant', 35.3, 7.4);
  person('drafter-1', [26, 11.9], 'write', withProp(woman(), 'pen'), 'NE');
  person('drafter-2', [26, 16.4], 'write', withProp(man(), 'pen'), 'NE');
  person('designer-1', [34, 14.6], 'write', withProp(woman(), 'laptop'), 'NE');
  person('designer-2', [34, 18.6], 'write', withProp(man(), 'laptop'), 'NE');
  person(
    'engineer-1',
    [32.6, 11.6],
    'talk',
    withProp(L('adult-woman', 'shirt-trousers', 'hijab'), 'blueprint'),
    'NW',
  ).pairWith = 'fazlur-rahman-khan';

  /* ════════ University science lab (x 39–55, y 7–20) ════════ */
  obj('m-glasswall', 39, 6.65);
  obj('m-glasswall', 47, 6.65);
  obj('m-screen-wall', 40, 7.1);
  obj('m-whiteboard', 44.5, 7.1);
  obj('m-fume-hood', 49.5, 7.4);
  obj('m-server-rack', 53, 7.3);
  obj('m-server-rack', 54.1, 7.3);
  obj('m-lab-bench', 41, 10.5);
  obj('m-lab-bench', 46, 10.5);
  obj('m-lab-bench', 41, 15.5);
  obj('m-lab-bench', 46, 15.5);
  obj('m-robot-arm', 52.5, 12.5);
  obj('m-water-cooler', 54.6, 17.5);
  const coat = (base: 'adult-man' | 'adult-woman', prop: string) =>
    L(base, 'lab-coat', base === 'adult-woman' ? 'hijab' : 'none', prop, {
      garmentPrimary: 'lab-white',
    });
  person('chemist-1', [47.5, 9.9], 'pour', coat('adult-woman', 'flask'), 'SE');
  person('chemist-2', [42.4, 9.9], 'idle', coat('adult-man', 'tablet'), 'SW');
  person(
    'chemist-3',
    [47.6, 14.9],
    'talk',
    coat('adult-woman', 'clipboard'),
    'SE',
  );
  person('chemist-4', [50.4, 9.4], 'pour', coat('adult-man', 'flask'), 'NE');
  person(
    'roboticist',
    [52.3, 14.6],
    'talk',
    withProp(L('adult-woman', 'hoodie-jeans', 'hijab'), 'laptop'),
    'NE',
  );
  person(
    'student-lab-1',
    [44.6, 18.4],
    'read',
    withProp(child(), 'laptop'),
    'NE',
    60,
  );

  /* ════════ Hospital (x 7–21, y 24–37) ════════ */
  obj('m-whitewall-side', 6.65, 23);
  obj('m-whitewall-side', 6.65, 31);
  for (const y of [24.5, 28.5, 32.5]) {
    obj('m-hospital-bed', 7.4, y);
    obj('m-iv-stand', 9.7, y - 0.4);
    obj('m-monitor-cart', 7.3, y + 1.6);
  }
  obj('m-curtain', 7.3, 27.6);
  obj('m-curtain', 7.3, 31.6);
  obj('m-waiting-chairs', 16, 25.5);
  obj('m-waiting-chairs', 16, 29);
  obj('m-reception', 15.5, 34.2);
  obj('m-desk-plant', 19.6, 34.5);
  obj('m-water-cooler', 20.3, 25);
  person(
    'patient',
    [8.4, 24.7],
    'sit',
    L('elder', 'thobe', 'kufi', 'none', { garmentPrimary: 'sky' }),
    'SE',
  ).pairWith = 'ibn-sina';
  person(
    'doctor-1',
    [10.6, 29.6],
    'talk',
    L('adult-woman', 'lab-coat', 'hijab', 'stethoscope', {
      garmentPrimary: 'lab-white',
      garmentSecondary: 'plum',
    }),
    'SW',
  ).pairWith = 'amb-patient-2';
  person('patient-2', [8.5, 28.7], 'sit', man(), 'SE').pairWith =
    'amb-doctor-1';
  person(
    'nurse-1',
    [10.6, 33.4],
    'idle',
    L('adult-woman', 'scrubs', 'hijab', 'clipboard', {
      garmentPrimary: 'scrub-teal',
      garmentSecondary: 'white-linen',
      headwear: 'navy',
    }),
    'SW',
  );
  person(
    'nurse-2',
    [13.5, 27],
    'walk',
    L('adult-man', 'scrubs', 'scrub-cap', 'tablet', {
      garmentPrimary: 'scrub-blue',
      garmentSecondary: 'white-linen',
      headwear: 'scrub-blue',
    }),
  ).script = [
    {
      from: 0,
      to: 120,
      action: 'walk',
      path: [
        [13.5, 24.5],
        [13.5, 36.5],
        [13.5, 24.5],
      ],
    },
  ];
  person('waiting-1', [16.6, 25.1], 'sit', withProp(woman(), 'phone'), 'SE');
  person(
    'waiting-2',
    [18.4, 25.1],
    'sit',
    withProp(child(), 'tablet'),
    'SE',
    60,
  );
  person('waiting-3', [17.6, 28.6], 'sit', elder(), 'SE', 240);
  person(
    'receptionist',
    [17, 33.6],
    'talk',
    L('adult-woman', 'shirt-trousers', 'hijab', 'none', {
      garmentPrimary: 'scrub-teal',
    }),
    'SE',
  );

  /* ════════ Central park (x 24–35, y 24–37) ════════ */
  obj('m-fountain', 28.5, 29);
  obj('m-tree', 24.6, 24.6);
  obj('m-tree', 34.6, 24.6);
  obj('m-tree', 24.6, 35.8);
  obj('m-tree', 35, 35.6);
  obj('m-bench', 25.5, 33);
  obj('m-bench', 32, 26);
  obj('m-street-lamp', 27.8, 27.8);
  obj('m-street-lamp', 32.6, 32.6);
  obj('m-planter-box', 31, 35.6);
  obj('feeder', 33.5, 28.5);
  obj('bowl', 26.4, 27.2);
  person('elder-1', [26, 32.6], 'sit', elder(), 'SE').pairWith = 'amb-elder-2';
  person('elder-2', [27.1, 32.6], 'sit', elder(), 'SW').pairWith =
    'amb-elder-1';
  person(
    'reader-park',
    [32.6, 25.6],
    'sit',
    withProp(woman(), 'book'),
    'SE',
    240,
  );
  person(
    'sweeper',
    [30, 27.4],
    'sweep',
    L('adult-man', 'hi-vis', 'hard-hat', 'broom', {
      garmentPrimary: 'safety-orange',
      headwear: 'hi-vis',
    }),
    'SE',
  );
  person('picnic-1', [33.6, 34.4], 'read', withProp(child(), 'book'), 'SW', 60);
  person('picnic-2', [34.5, 33.6], 'talk', woman(), 'SW');

  /* ════════ Community kitchen (x 39–55, y 24–37) ════════ */
  obj('m-kitchen-counter', 40, 24.3);
  obj('m-kitchen-counter', 43.5, 24.3);
  obj('m-fridge', 47.3, 24.2);
  obj('m-food-shelf', 49, 24.1);
  obj('m-food-shelf', 52.3, 24.1);
  obj('m-water-cooler', 55, 28);
  for (const [x, y] of [
    [41, 29],
    [47.5, 29],
    [41, 33],
    [47.5, 33],
  ]) {
    obj('m-dining-table', x, y);
    for (let i = 0; i < 3; i++) {
      const n = ambient.length;
      person(
        `diner-${n}`,
        [x + 0.6 + i * 1.3, y - 0.5],
        'sit',
        n % 3 ? man() : woman(),
        'SE',
        ([60, 120, 240] as Loop[])[n % 3],
      );
      if (i < 2)
        person(
          `diner-${n}-b`,
          [x + 1.2 + i * 1.5, y + 1.55],
          'talk',
          n % 2 ? child() : elder(),
          i ? 'NW' : 'NE',
          ([120, 240] as Loop[])[i],
        );
    }
  }
  person(
    'cook-1',
    [41.6, 25.9],
    'pour',
    L('adult-man', 'apron', 'taqiyah', 'tray', {
      garmentSecondary: 'white-linen',
    }),
    'NE',
  );
  person(
    'cook-2',
    [45, 25.9],
    'idle',
    L('adult-woman', 'apron', 'hijab', 'none', {
      garmentSecondary: 'white-linen',
    }),
    'NE',
    60,
  );
  person(
    'baker',
    [51.5, 26.6],
    'pour',
    L('adult-man', 'apron', 'kufi', 'bread', {
      garmentSecondary: 'white-linen',
    }),
    'SW',
  ).pairWith = 'amb-passerby';
  person(
    'passerby',
    [50.6, 27.6],
    'talk',
    withProp(woman(), 'shopping-bag'),
    'NE',
  ).pairWith = 'amb-baker';
  errand(
    'water-carrier',
    [54, 36.6],
    [46.5, 36.6],
    L('adult-man', 'shirt-trousers', 'kufi', 'water-jug', { prop: 'sky' }),
    'pour',
    'SW',
    'carry',
  );
  errand(
    'volunteer-1',
    [53.6, 31.5],
    [53.6, 27.3],
    withProp(
      L('adult-woman', 'hi-vis', 'hijab', 'none', {
        garmentPrimary: 'emerald',
      }),
      'meal-box',
    ),
    'pour',
    'NW',
    'carry',
  );

  /*
   * ════════ Mathematics research laboratory (x 7–21, y 41–55) ════════
   * The old library, replaced at the owner's request with a doctoral-level
   * maths lab: a chalkboard and a projector screen on the back wall, and
   * the history of calculation on plinths and stands, in order: tally
   * sticks, a counting board, an abacus, the Antikythera mechanism,
   * Napier's bones, a slide rule, Pascal's calculator, Leibniz's stepped
   * reckoner, and Babbage's difference and analytical engines (owner's
   * list); with a case of models, a whiteboard, a seminar table and a book
   * cart. Owner's rule: only mathematical equipment, and no piece twice.
   * Al-Khwarizmi, Ibn Rushd and Ibn Khaldun stand in the lab
   * (their cards place them).
   */
  obj('m-whitewall-side', 6.65, 39);
  obj('m-whitewall-side', 6.65, 47);
  obj('m-chalkboard-side', 7.0, 41.5);
  obj('m-projector-screen-side', 7.0, 45.0);
  obj('m-model-case-side', 7.05, 48.4);
  obj('m-whiteboard', 15.0, 45.6);
  obj('m-seminar-table', 9.5, 50.6);
  obj('m-book-cart', 14.0, 51.4);
  obj('m-tally-sticks', 9.4, 41.6);
  obj('m-counting-board', 11.0, 41.6);
  obj('m-abacus', 13.3, 42.0);
  obj('m-antikythera', 15.8, 41.6);
  obj('m-napiers-bones', 17.4, 41.6);
  obj('m-slide-rule', 19.0, 41.6);
  obj('m-pascaline', 10.0, 45.6);
  obj('m-stepped-reckoner', 11.8, 45.6);
  obj('m-difference-engine', 17.6, 44.8);
  obj('m-analytical-engine', 17.4, 48.2);
  for (const [i, [x, y, f]] of (
    [
      [11.2, 42.4, 'SE'],
      [13.9, 43.2, 'SW'],
      [11.1, 46.9, 'SE'],
      [13.9, 47.5, 'SW'],
      [12.6, 49.9, 'NE'],
    ] as [number, number, Facing][]
  ).entries())
    person(
      `coder-${i}`,
      [x, y],
      'read',
      withProp(child(), 'laptop'),
      f,
      ([60, 120, 240] as Loop[])[i % 3],
    );
  person('mentor', [15.4, 45.6], 'talk', withProp(woman(), 'tablet'), 'SW');
  person('librarian', [9.2, 51.6], 'idle', withProp(man(), 'book'), 'SE', 240);
  person(
    'student-desk',
    [18, 51.1],
    'write',
    withProp(woman(), 'laptop'),
    'NE',
  );

  /* ════════ Street and café (x 24–35, y 41–55) ════════ */
  obj('m-coffee-cart', 31.5, 41.6);
  obj('m-cafe-table', 25, 42);
  obj('m-cafe-table', 27.6, 42);
  obj('m-cafe-table', 25, 47.4);
  obj('m-bus-shelter', 30.5, 51.5);
  obj('m-bike-rack', 25, 52);
  obj('m-street-lamp', 29.2, 47.2);
  obj('m-street-lamp', 35, 51);
  obj('m-planter-box', 33.8, 46.2);
  person(
    'barista',
    [32.4, 43.1],
    'pour',
    withProp(
      L('adult-man', 'apron', 'cap', 'none', { headwear: 'emerald' }),
      'coffee',
    ),
    'SW',
  );
  person('cafe-1', [25.4, 41.6], 'sit', withProp(man(), 'coffee'), 'SE');
  person('cafe-2', [26.6, 42.5], 'sit', withProp(woman(), 'phone'), 'SW', 240);
  person('cafe-3', [28, 41.6], 'sit', withProp(elder(), 'coffee'), 'SE', 60);
  person('cafe-4', [25.4, 47], 'sit', withProp(woman(), 'laptop'), 'SE');
  person(
    'commuter-1',
    [31.2, 51.1],
    'idle',
    withProp(man(), 'phone'),
    'SE',
    240,
  );
  person(
    'commuter-2',
    [32.6, 51.1],
    'sit',
    withProp(woman(), 'shopping-bag'),
    'SE',
  );

  /* ════════ Solar garden (x 39–55, y 41–55) ════════ */
  obj('m-solar-panel', 48.5, 42);
  obj('m-solar-panel', 51.5, 42);
  obj('m-solar-panel', 48.5, 50.5);
  obj('m-solar-panel', 51.5, 50.5);
  obj('m-tree', 40, 42);
  obj('m-tree', 44.5, 53.5);
  obj('m-tree', 54.6, 46.6);
  obj('m-planter-box', 40.5, 49);
  obj('m-planter-box', 43.5, 49);
  obj('m-planter-box', 40.5, 52.5);
  obj('m-bench', 43, 43);
  obj('palm', 39.6, 54.4);
  person(
    'gardener',
    [42, 48.4],
    'sweep',
    L('adult-woman', 'apron', 'hijab', 'broom', {
      garmentSecondary: 'emerald',
    }),
    'SE',
  );
  person(
    'technician',
    [50.4, 45.2],
    'idle',
    L('adult-man', 'hi-vis', 'hard-hat', 'tablet', {
      garmentPrimary: 'hi-vis',
      headwear: 'mustard',
    }),
    'NE',
  );
  person(
    'bench-pair-1',
    [43.6, 42.6],
    'sit',
    withProp(elder(), 'cane'),
    'SE',
  ).pairWith = 'amb-bench-pair-2';
  person('bench-pair-2', [44.7, 42.6], 'sit', woman(), 'SW').pairWith =
    'amb-bench-pair-1';

  /* ════════ Density pass: more everyday life in the lower rooms ════════ */
  person(
    'reader-lib-1',
    [10.6, 54.2],
    'read',
    withProp(woman(), 'book'),
    'NE',
    240,
  );
  person(
    'reader-lib-2',
    [12.2, 54.6],
    'read',
    withProp(elder(), 'book'),
    'NE',
    120,
  );
  person(
    'student-desk-2',
    [18, 43.1],
    'write',
    withProp(man(), 'pen'),
    'NE',
    60,
  );
  person(
    'coder-6',
    [10.4, 44.8],
    'read',
    withProp(child(), 'tablet'),
    'SE',
    120,
  );
  person(
    'coder-7',
    [14.6, 49.6],
    'read',
    withProp(child(), 'laptop'),
    'SW',
    240,
  );
  person(
    'mentor-2',
    [9.8, 49.4],
    'talk',
    withProp(L('adult-man', 'shirt-trousers', 'none'), 'laptop'),
    'SE',
  );
  // Street market and café.
  obj('detail-market-red', 25.5, 54.2);
  obj('m-cafe-table', 27.6, 47.4);
  obj('m-planter-box', 22.1, 52.6);
  obj('m-street-lamp', 24.3, 50.8);
  person('cafe-5', [27.9, 47], 'sit', withProp(man(), 'tablet'), 'SE', 240);
  person('cafe-6', [26.4, 48], 'talk', withProp(woman(), 'coffee'), 'NE');
  person('queue-1', [31.2, 44.4], 'idle', withProp(child(), 'phone'), 'NE', 60);
  person(
    'queue-2',
    [30.2, 44.3],
    'talk',
    withProp(woman(), 'shopping-bag'),
    'NE',
  );
  person(
    'vendor',
    [26.9, 53.8],
    'talk',
    withProp(
      L('adult-man', 'apron', 'kufi', 'none', { garmentSecondary: 'saffron' }),
      'basket',
    ),
    'SE',
  );
  person(
    'shopper-1',
    [28.2, 52.8],
    'idle',
    withProp(woman(), 'basket'),
    'NW',
    240,
  );
  person(
    'cyclist',
    [27.6, 51.4],
    'talk',
    withProp(
      L('adult-man', 'hoodie-jeans', 'cap', 'none', { headwear: 'emerald' }),
      'phone',
    ),
    'SW',
  );
  // Garden: allotments, picnic and play.
  obj('m-planter-box', 43.5, 52.5);
  obj('m-planter-box', 46.5, 47.8);
  obj('m-bench', 52, 54.2);
  obj('m-street-lamp', 47.8, 45.6);
  obj('flowers', 53, 41.8);
  person(
    'waterer',
    [45.4, 50.8],
    'pour',
    withProp(
      L('elder', 'kaftan', 'taqiyah', 'none', { garmentPrimary: 'olive' }),
      'water-jug',
    ),
    'SE',
  );
  person('kid-wave', [44.2, 45.4], 'wave', child(), 'SE', 60);
  person('kid-wave-2', [45.4, 45.9], 'wave', child(), 'SW', 60).pairWith =
    'amb-kid-wave';
  person(
    'picnic-3',
    [50.8, 49.2],
    'read',
    withProp(woman(), 'book'),
    'SW',
    240,
  );
  person('picnic-4', [49.6, 49.6], 'read', withProp(child(), 'bread'), 'SE');
  person(
    'bench-pair-3',
    [52.6, 53.8],
    'sit',
    withProp(man(), 'coffee'),
    'SE',
    240,
  );
  person(
    'engineer-solar',
    [53.6, 45.4],
    'talk',
    withProp(
      L('adult-woman', 'hi-vis', 'hard-hat', 'none', {
        garmentPrimary: 'safety-orange',
        headwear: 'hi-vis',
      }),
      'clipboard',
    ),
    'NW',
  );
  // Outer pavements: trees, lamps and bikes along the ring road.
  for (let i = 0; i < 6; i++) {
    obj('m-tree', 60, 10 + i * 8);
    obj('m-tree', 10 + i * 8, 60);
    obj('m-street-lamp', 60.2, 14 + i * 8);
    obj('m-street-lamp', 14 + i * 8, 60.2);
  }
  obj('m-bus-shelter', 40, 60.6);
  obj('m-bike-rack', 60.6, 30);
  person(
    'commuter-3',
    [41.5, 60.2],
    'idle',
    withProp(elder(), 'cane'),
    'SE',
    240,
  );
  person('commuter-4', [42.6, 60.2], 'talk', withProp(woman(), 'phone'), 'SW');
  walker(
    'jogger',
    [
      [59.4, 12],
      [59.4, 34],
    ],
    L('adult-man', 'hoodie-jeans', 'none', 'none', {
      garmentPrimary: 'emerald',
    }),
    240,
  );
  walker(
    'stroller',
    [
      [14, 62.4],
      [34, 62.4],
    ],
    withProp(woman(), 'shopping-bag'),
    240,
  );

  /* ════════ Walkers on 60/120/240-frame loops ════════ */
  walker(
    'traveller-1',
    [
      [10, 22.4],
      [17, 22.4],
    ],
    withProp(man(), 'coffee'),
    60,
  );
  walker(
    'traveller-2',
    [
      [37.4, 25],
      [37.4, 36],
    ],
    withProp(woman(), 'shopping-bag'),
    120,
  );
  walker(
    'traveller-3',
    [
      [23, 22.6],
      [36.6, 22.6],
      [36.6, 30],
      [36.6, 22.6],
    ],
    withProp(
      L('adult-man', 'suit', 'none', 'none', { garmentPrimary: 'navy' }),
      'phone',
    ),
    240,
  );
  walker(
    'traveller-4',
    [
      [26, 39.6],
      [35, 39.6],
    ],
    withProp(woman(), 'tablet'),
    120,
  );
  walker(
    'traveller-5',
    [
      [40, 39.4],
      [54, 39.4],
    ],
    withProp(L('adult-man', 'hoodie-jeans', 'cap'), 'laptop'),
    240,
  );
  walker(
    'traveller-6',
    [
      [26, 49.6],
      [35, 49.6],
    ],
    withProp(man(), 'blueprint'),
    120,
  );
  walker(
    'students-walk',
    [
      [39.2, 22],
      [46, 22],
    ],
    withProp(L('adult-woman', 'long-dress', 'hijab'), 'book'),
    120,
  ).pairWith = 'fatima-al-fihri';
  walker(
    'helpful-child',
    [
      [25, 44.6],
      [33, 44.6],
    ],
    child(),
    120,
  ).pairWith = 'amb-walking-elder';
  walker(
    'walking-elder',
    [
      [25, 45.6],
      [33, 45.6],
    ],
    withProp(elder(), 'cane'),
    120,
  ).pairWith = 'amb-helpful-child';

  /* ════════ Cats and birds ════════ */
  const fur = ['saffron', 'charcoal', 'wool-cream'];
  for (let i = 0; i < 3; i++) {
    const c = person(
      `cat-${i}`,
      [
        [34.4, 37],
        [41, 46.5],
        [26.9, 27.7],
      ][i] as Pt,
      i === 0 ? 'cat_sleep' : 'cat_idle',
      L('cat', 'none', 'none', 'none', { garmentPrimary: fur[i] }),
      i === 2 ? 'NW' : 'SE',
    );
    c.kind = 'cat';
    if (i === 1)
      c.script = [
        {
          from: 0,
          to: 120,
          action: 'cat_walk',
          path: [
            [41, 46.5],
            [46, 46.5],
            [41, 46.5],
          ],
        },
      ];
  }
  for (let i = 0; i < 6; i++) {
    const at: Pt = [33.7 + (i % 3) * 0.35, 28.2 + Math.floor(i / 3) * 0.5];
    const c = person(
      `bird-${i}`,
      at,
      'bird_peck',
      L('bird', 'none', 'none', 'none', {
        garmentPrimary: ['graphite', 'wool-cream', 'cocoa'][i % 3],
        prop: 'saffron',
      }),
      'SW',
      240,
    );
    c.kind = 'bird';
    c.script = [
      {
        from: 0,
        to: 180,
        action: 'bird_fly',
        path: [at, [31.5, 28], [28, 30.5], [30, 33.5], [33.5, 31], at],
        z: [10, 38 + i * 3, 46, 40, 30, 10],
      },
      { from: 180, to: 240, action: 'bird_peck', at, facing: 'SW', z: 10 },
    ];
  }

  /* ════════ Football stadium (x 61–95, y 3–44), east of the ring road ════════ */
  obj('m-pitch', 67, 15, true);
  for (const x of [67, 75, 83]) obj('m-stand', x, 11.5);
  for (const y of [15, 23]) obj('m-stand-side', 62.5, y);
  for (const x of [67, 75, 83]) obj('m-ad-boards', x, 32.2);
  for (const y of [15, 23]) obj('m-ad-boards-side', 92.4, y);
  obj('m-goal-west', 66.5, 21);
  obj('m-goal-east', 90.5, 21);
  for (const [x, y] of [
    [67, 15],
    [90.7, 15],
    [67, 30.7],
    [90.7, 30.7],
  ])
    obj('m-corner-flag', x, y);
  for (const [x, y] of [
    [63.5, 11.5],
    [92, 11],
    [63.5, 33.5],
  ])
    obj('m-floodlight', x, y);
  obj('m-scoreboard', 92.5, 8.6);
  obj('m-dugout', 72, 33.4);
  obj('m-dugout', 82, 33.4);
  obj('m-ball-rack', 77.6, 33.6);
  for (let i = 0; i < 4; i++) {
    // Trees at x 74 and 82 would hide the strip's scenes (scene bible).
    if (i === 0 || i === 3) obj('m-tree', 66 + i * 8, 41.5);
    obj('m-street-lamp', 70 + i * 8, 41.6);
  }
  obj('m-bike-rack', 88, 41.2);
  obj('m-coffee-cart', 63, 37.5);
  const kit = (
    colour: string,
    trim: string,
    base = 'adult-man',
    prop = 'none',
  ) =>
    L(base, 'football-kit', 'none', prop, {
      garmentPrimary: colour,
      garmentSecondary: trim,
    });
  const home = () => kit('lab-white', 'plum'),
    away = () => kit('emerald', 'white-linen');
  // West half: teammates run in to celebrate with the captain.
  walker(
    'teammate-1',
    [
      [79, 18],
      [74.6, 19.4],
    ],
    home(),
    120,
  );
  walker(
    'teammate-2',
    [
      [79, 26],
      [74.8, 22.2],
    ],
    home(),
    120,
  ).pairWith = 'karim-benzema';
  walker(
    'teammate-3',
    [
      [75.4, 25.2],
      [75.4, 28.8],
    ],
    kit('lab-white', 'plum', 'adult-man-beard'),
    60,
  );
  person('teammate-4', [72.2, 19.2], 'cheer', home(), 'SE', 60);
  person('keeper-west', [68.4, 23], 'idle', kit('sky', 'navy'), 'SE', 240);
  walker(
    'referee',
    [
      [76, 16.9],
      [82, 16.9],
    ],
    kit('black-cloth', 'mustard'),
    240,
  );
  // Centre circle: Liverpool's front pair, each in their club's red kit.
  const lfc = (base = 'adult-man') =>
    L(base, 'football-kit', 'none', 'none', {
      garmentPrimary: 'kit-red',
      garmentSecondary: 'lab-white',
    });
  walker(
    'lfc-1',
    [
      [81.6, 28.2],
      [80.2, 25.6],
    ],
    lfc(),
    60,
  ).pairWith = 'sadio-mane';
  person('lfc-2', [77.2, 20.6], 'cheer', lfc('adult-man-beard'), 'SW', 120);
  /*
   * East half: a 15-second chip-and-stop goal, then a 5-second reset, on the
   * 240-frame master loop. 0–2 s the keeper rushes out; 2–4 s the chip over
   * him; 4–7 s control on the bounce; 7–12 s stop dead as two defenders
   * slide past; 12–15 s roll into the empty net.
   */
  const striker = 'mesut-ozil';
  const gk = person(
    'ozil-keeper',
    [89.6, 23],
    'walk',
    kit('mustard', 'graphite'),
  );
  gk.loop = 240;
  gk.pairWith = striker;
  gk.script = [
    {
      from: 0,
      to: 24,
      action: 'walk',
      path: [
        [89.6, 23],
        [87.2, 23],
      ],
    },
    { from: 24, to: 60, action: 'dive', at: [87.2, 23], facing: 'NW' },
    // Beaten, the keeper sits on the grass until the ball is in the net.
    { from: 60, to: 180, action: 'read', at: [87.2, 23], facing: 'SE' },
    {
      from: 180,
      to: 200,
      action: 'walk',
      path: [
        [87.2, 23],
        [89.8, 23.3],
      ],
    },
    { from: 200, to: 212, action: 'kick', at: [89.8, 23.3], facing: 'NW' },
    {
      from: 212,
      to: 240,
      action: 'walk',
      path: [
        [89.8, 23.3],
        [89.6, 23],
      ],
    },
  ];
  const slider = (
    id: string,
    start: Pt,
    from: Pt,
    to: Pt,
    at: number,
    face: Facing,
  ) => {
    const d = person(id, start, 'walk', away());
    d.loop = 240;
    d.pairWith = striker;
    d.script = [
      { from: 0, to: at, action: 'walk', path: [start, from] },
      { from: at, to: at + 24, action: 'slide', path: [from, to] },
      { from: at + 24, to: at + 54, action: 'idle', at: to, facing: face },
      { from: at + 54, to: 240, action: 'walk', path: [to, start] },
    ];
  };
  slider('ozil-defender-1', [83.5, 19.6], [86.6, 21.2], [89.2, 25.4], 96, 'NE');
  slider('ozil-defender-2', [89, 19.4], [89.6, 21.4], [87, 25.8], 108, 'NW');
  const ball = person(
    'ozil-ball',
    [82.6, 23.1],
    'ball_roll',
    L('ball', 'none', 'none', 'none', { prop: 'graphite' }),
  );
  ball.kind = 'ball';
  ball.loop = 240;
  ball.pairWith = striker;
  ball.script = [
    {
      from: 0,
      to: 24,
      action: 'ball_roll',
      path: [
        [82.6, 23.1],
        [85.5, 23.1],
      ],
    },
    {
      from: 24,
      to: 48,
      action: 'ball_roll',
      path: [
        [85.5, 23.1],
        [87.3, 23.2],
        [89, 23.5],
      ],
      z: [0, 34, 0],
    },
    {
      from: 48,
      to: 60,
      action: 'ball_roll',
      path: [
        [89, 23.5],
        [88.8, 23.65],
        [88.7, 23.8],
      ],
      z: [0, 9, 0],
    },
    { from: 60, to: 150, action: 'ball_still', at: [88.7, 23.8], facing: 'SE' },
    {
      from: 150,
      to: 176,
      action: 'ball_roll',
      path: [
        [88.7, 23.8],
        [91, 23.4],
      ],
    },
    { from: 176, to: 202, action: 'ball_still', at: [91, 23.4], facing: 'SE' },
    {
      from: 202,
      to: 240,
      action: 'ball_roll',
      path: [
        [91, 23.4],
        [86.8, 23.2],
        [82.6, 23.1],
      ],
      z: [0, 46, 0],
    },
  ];

  // Supporters along the touchline and on the concourse.
  (
    [
      [68.5, 34.4, 'cheer', 'NE'],
      [70, 34.2, 'celebrate', 'NE'],
      [76, 34.6, 'wave', 'NE'],
      [86.4, 34.4, 'cheer', 'NW'],
      [88, 34.2, 'celebrate', 'NE'],
      [89.6, 34.6, 'idle', 'NW'],
      [93.6, 18, 'cheer', 'NW'],
      [93.8, 26, 'wave', 'NW'],
    ] as [number, number, Step['action'], Facing][]
  ).forEach(([x, y, a, f], i) =>
    person(
      `fan-${i}`,
      [x, y],
      a,
      i < 3
        ? L(
            i === 0 ? 'adult-woman' : 'adult-man',
            'shirt-trousers',
            i === 0 ? 'hijab' : 'none',
            'none',
            {
              garmentPrimary: ['kit-red', 'lab-white', 'kit-red'][i],
            },
          )
        : i % 3 === 0
          ? woman()
          : i % 3 === 1
            ? man()
            : child(),
      f,
      ([60, 120, 240] as Loop[])[i % 3],
    ),
  );
  person(
    'coach',
    [74, 33.1],
    'talk',
    withProp(
      L('adult-man', 'suit', 'none', 'none', { garmentPrimary: 'navy' }),
      'clipboard',
    ),
    'NE',
  );
  person(
    'kit-manager',
    [79.2, 34.8],
    'idle',
    withProp(
      L('adult-woman', 'hi-vis', 'hijab', 'none', { garmentPrimary: 'sky' }),
      'tablet',
    ),
    'SE',
    240,
  );
  walker(
    'fan-walk-1',
    [
      [63, 39.4],
      [90, 39.4],
    ],
    withProp(
      L('child', 'football-kit', 'cap', 'football', {
        garmentPrimary: 'lab-white',
        garmentSecondary: 'plum',
        headwear: 'plum',
      }),
      'football',
    ),
    240,
  );
  walker(
    'fan-walk-2',
    [
      [90, 38.4],
      [66, 38.4],
    ],
    withProp(woman(), 'phone'),
    240,
  );
  person(
    'barista-stadium',
    [64.6, 36.9],
    'pour',
    withProp(
      L('adult-man', 'apron', 'cap', 'none', { headwear: 'plum' }),
      'coffee',
    ),
    'SE',
  );

  // Scene-bible stadium scenes (docs/scene-bible.md).
  for (const [type, x, y] of STADIUM_OBJECTS) obj(type, x, y);
  ambient.push(...stadiumAmbient(), ...stadiumAmbient1b());
  for (const [type, x, y, z] of CRICKET_OBJECTS) obj(type, x, y, false, z);
  // Nature and city passes (scenes/nature.ts, scenes/city.ts).
  for (const [type, x, y, z] of [...NATURE_OBJECTS, ...CITY_OBJECTS])
    obj(type, x, y, false, z ?? 0);
  ambient.push(...cricketAmbient());

  /* ════════ Fight-night arena (x 61–95, y 45–56) ════════ */
  // Octagon at (64, 47): flat mat baked into the floor, cage pieces on each
  // edge so fighters inside sort between the back and front walls.
  const OX = 64,
    OY = 47,
    MAT = 4;
  obj('m-octagon-mat', OX, OY, true);
  obj('m-cage-straight', OX + 1.5, OY - 0.15, false, MAT);
  obj('m-cage-straight', OX + 1.5, OY + 5.85, false, MAT);
  obj('m-cage-straight-side', OX - 0.15, OY + 1.5, false, MAT);
  obj('m-cage-straight-side', OX + 5.85, OY + 1.5, false, MAT);
  obj('m-cage-diag-a', OX, OY, false, MAT);
  obj('m-cage-diag-a', OX + 4.5, OY + 4.5, false, MAT);
  obj('m-cage-diag-b', OX + 4.5, OY, false, MAT);
  obj('m-cage-diag-b', OX, OY + 4.5, false, MAT);
  // Boxing ring at (78, 47): raised platform baked in, ropes on each edge.
  const RX = 78,
    RY = 47,
    RING = 8;
  obj('m-ring-base', RX, RY, true);
  obj('m-ring-ropes', RX, RY - 0.15, false, RING);
  obj('m-ring-ropes', RX, RY + 5.85, false, RING);
  obj('m-ring-ropes-side', RX - 0.15, RY, false, RING);
  obj('m-ring-ropes-side', RX + 5.85, RY, false, RING);
  obj('m-ring-steps', RX + 2.5, RY + 6.05);
  obj('m-corner-stool', RX - 0.9, RY + 5.4);
  obj('m-corner-stool', RX + 6.3, RY + 0.4);
  for (const x of [63.5, 67.5, 77.5, 81.5]) {
    obj('m-ringside-seats', x, 54.8);
    // Spectators on most of the chairs, facing the action.
    for (let i = 0; i < 4; i++)
      if ((x + i) % 3 !== 1)
        person(
          `ringside-${x}-${i}`,
          [x + 0.5 + i, 55.2],
          'sit',
          i % 2 ? man() : woman(),
          i % 2 ? 'NE' : 'NW',
          ([60, 120, 240] as Loop[])[i % 3],
        );
  }
  obj('m-ringside-seats-side', 86.6, 47.5);
  obj('m-ringside-seats-side', 86.6, 51.5);
  for (let i = 0; i < 8; i += 2)
    person(
      `ringside-east-${i}`,
      [87, 48 + i],
      'sit',
      i % 4 ? man() : woman(),
      'NW',
      ([120, 240] as Loop[])[(i / 2) % 2],
    );
  obj('m-commentary-desk', 72, 51);
  obj('m-arena-banner', 72.4, 45.4);
  obj('m-arena-banner', 89, 45.4);
  const fighter = (
    base: string,
    skin: string,
    top: string,
    shorts: string,
    gloves = 'mma-gloves',
    garment = 'fight-kit',
  ) =>
    L(base, garment, 'none', gloves, {
      skin,
      hair: 'hair-black',
      garmentPrimary: top,
      garmentSecondary: shorts,
      prop: gloves === 'boxing-gloves' ? 'kit-red' : 'black-cloth',
    });
  // Ringside: seconds, officials and supporters.
  person(
    'referee-octagon',
    [69.4, 49.2],
    'idle',
    L('adult-man', 'shirt-trousers', 'none', 'none', {
      garmentPrimary: 'black-cloth',
      garmentSecondary: 'black-cloth',
    }),
    'SW',
    240,
    {
      script: [
        {
          from: 0,
          to: 240,
          action: 'idle',
          at: [69.4, 49.2],
          facing: 'SW',
          z: MAT,
        },
      ],
    },
  );
  person(
    'commentator-1',
    [72.8, 50.6],
    'talk',
    withProp(man(), 'none'),
    'SE',
    120,
  );
  person(
    'commentator-2',
    [74.4, 50.6],
    'talk',
    withProp(woman(), 'tablet'),
    'SE',
    240,
  );
  person(
    'cornerman',
    [77, 52.6],
    'cheer',
    L('adult-man', 'hoodie-jeans', 'cap', 'none', {
      garmentPrimary: 'kit-red',
    }),
    'NE',
    60,
  );
  const opp = person(
    'ali-opponent',
    [80.4, 51.4],
    'lie',
    fighter(
      'adult-man-shaved',
      'skin-8',
      'black-cloth',
      'black-cloth',
      'boxing-gloves',
      'boxing-kit',
    ),
    'SE',
    240,
  );
  opp.script = [
    {
      from: 0,
      to: 240,
      action: 'lie',
      at: [80.4, 51.4],
      facing: 'SE',
      z: RING,
    },
  ];
  opp.pairWith = 'muhammad-ali';
  (
    [
      [64, 56.4, 'cheer', 'NE'],
      [66.6, 56.5, 'wave', 'NE'],
      [70, 56.4, 'celebrate', 'NE'],
      [79, 56.5, 'cheer', 'NE'],
      [83.6, 56.4, 'cheer', 'NW'],
      [88.6, 56.4, 'idle', 'NW'],
    ] as [number, number, Step['action'], Facing][]
  ).forEach(([x, y, a, f], i) =>
    person(
      `fight-fan-${i}`,
      [x, y],
      a,
      i % 2 ? man() : woman(),
      f,
      ([60, 120, 240] as Loop[])[i % 3],
    ),
  );

  /* ════════ New York City (x 4–56, y 63–90) ════════ */
  // Street grid: avenues on rows 63–64, 76–77 and 89–90 and columns 4–5,
  // 22–23, 40–41 and 55–56; sidewalks around each block.
  // Block A: an art-deco skyscraper, brownstones and a rooftop water tower.
  obj('m-skyscraper-deco', 13, 66.2);
  obj('m-brownstone', 6.4, 71.6);
  obj('m-brownstone', 16.6, 71.6);
  obj('m-water-tower', 19.6, 66.6);
  obj('m-hydrant', 7, 66.4);
  obj('m-city-lamp', 10.6, 66.4);
  // Block B: City Hall and its plaza, framed by cherry trees.
  obj('m-city-hall', 27, 66.2);
  obj('m-street-cherry', 25, 72.4);
  obj('m-street-cherry', 37.6, 72.4);
  obj('m-bench', 29, 73.6);
  obj('m-bench', 34, 73.6);
  obj('m-city-lamp', 25.2, 67);
  obj('m-city-lamp', 38, 67);
  // Block C: downtown. A glass tower, a taller one and the broadcast tower
  // (scenes/city.ts), with a newsstand.
  obj('m-skyscraper-glass', 43, 66.2);
  obj('m-newsstand', 45, 73.2);
  obj('m-bike-rack', 50.4, 73.4);
  // Block D: a corner bodega and more brownstones.
  obj('m-bodega', 6.4, 78.6);
  obj('m-brownstone', 11, 78.4);
  obj('m-brownstone', 16.4, 78.4);
  obj('m-tree', 8, 86.6);
  obj('m-city-lamp', 14, 86.8);
  obj('m-hydrant', 19.8, 87);
  // Block E: a small park of cherry trees with a halal cart on the corner.
  for (const [x, y] of [
    [25, 79],
    [31, 80],
    [37.2, 81.8],
    [26.2, 86.4],
    [34.8, 86.8],
  ])
    obj('m-street-cherry', x, y);
  obj('m-bench', 28, 82.6);
  obj('m-bench', 33, 84.6);
  obj('m-planter-box', 29.6, 87.4);
  obj('m-halal-cart', 36.6, 78.6);
  // Block F: subway entrance, a slim tower (scenes/city.ts) and a bus stop.
  obj('m-subway-entrance', 43.4, 79);
  obj('m-bus-shelter', 43, 86.6);
  obj('m-city-lamp', 47, 87.2);
  // Parked yellow taxis on the inner lanes (the scooter loop uses the outer ones).
  for (const [x, y] of [
    [8, 64],
    [45, 64],
    [10, 90],
    [30, 90],
    [47, 77],
  ])
    obj('m-taxi', x, y);
  for (const [x, y] of [
    [4, 80],
    [56, 68],
    [23, 82],
  ])
    obj('m-taxi-side', x, y);
  for (const [x, y] of [
    [6, 63],
    [24.5, 76],
    [42, 89],
  ])
    obj('m-crosswalk', x, y, true);
  // New Yorkers.
  const nyc = () => (ambient.length % 3 ? man() : woman());
  person(
    'halal-vendor',
    [37.6, 78.3],
    'pour',
    withProp(
      L('adult-man', 'apron', 'kufi', 'none', {
        garmentSecondary: 'white-linen',
      }),
      'meal-box',
    ),
    'SE',
  );
  person(
    'halal-queue-1',
    [37, 80.4],
    'idle',
    withProp(nyc(), 'phone'),
    'NE',
    240,
  );
  person(
    'halal-queue-2',
    [38.2, 80.8],
    'talk',
    withProp(woman(), 'shopping-bag'),
    'NW',
  );
  person(
    'bodega-owner',
    [8.2, 80.2],
    'idle',
    withProp(
      L('elder', 'apron', 'taqiyah', 'none', { garmentSecondary: 'mustard' }),
      'basket',
    ),
    'SE',
    240,
  );
  person(
    'bodega-cat',
    [9.4, 80.6],
    'cat_sleep',
    L('cat', 'none', 'none', 'none', { garmentPrimary: 'charcoal' }),
    'SE',
  ).kind = 'cat';
  person('subway-1', [44.8, 80.6], 'idle', withProp(nyc(), 'phone'), 'NW', 240);
  person('subway-2', [46.2, 81.2], 'talk', withProp(woman(), 'coffee'), 'SW');
  person('bus-1', [44, 86.2], 'idle', withProp(elder(), 'cane'), 'SE', 120);
  person('bus-2', [45.2, 86.2], 'sit', withProp(child(), 'tablet'), 'SE', 60);
  person(
    'park-bench-1',
    [28.6, 82.2],
    'sit',
    withProp(elder(), 'book'),
    'SE',
    240,
  );
  person('park-bench-2', [29.7, 82.2], 'sit', woman(), 'SW').pairWith =
    'amb-park-bench-1';
  person('park-bench-3', [33.6, 84.2], 'sit', withProp(man(), 'coffee'), 'SE');
  person('park-kids-1', [30.4, 85.2], 'wave', child(), 'SE', 60);
  person('park-kids-2', [31.4, 85.6], 'cheer', child(), 'SW', 60).pairWith =
    'amb-park-kids-1';
  person(
    'cityhall-press-1',
    [30, 70.2],
    'talk',
    withProp(
      L('adult-woman', 'blazer-open', 'hijab', 'none', {
        garmentPrimary: 'plum',
      }),
      'tablet',
    ),
    'SE',
  );
  person(
    'cityhall-press-2',
    [31.2, 70.4],
    'idle',
    withProp(man(), 'clipboard'),
    'SW',
    240,
  );
  person(
    'cityhall-fan',
    [36, 70.6],
    'wave',
    withProp(nyc(), 'phone'),
    'NW',
    120,
  );
  person('newsstand', [46, 74.6], 'read', withProp(elder(), 'book'), 'SE', 240);
  walker(
    'nyc-walk-1',
    [
      [6.5, 65.4],
      [20.5, 65.4],
    ],
    withProp(
      L('adult-man', 'suit', 'none', 'none', { garmentPrimary: 'navy' }),
      'coffee',
    ),
    120,
  );
  walker(
    'nyc-walk-2',
    [
      [42.5, 75.3],
      [53.5, 75.3],
    ],
    withProp(woman(), 'shopping-bag'),
    120,
  );
  walker(
    'nyc-walk-3',
    [
      [6.5, 88.4],
      [20.5, 88.4],
    ],
    withProp(
      L('adult-man', 'hoodie-jeans', 'cap', 'none', { headwear: 'kit-red' }),
      'phone',
    ),
    120,
  );
  walker(
    'nyc-walk-4',
    [
      [42.5, 78.2],
      [42.5, 88.2],
    ],
    withProp(nyc(), 'blueprint'),
    120,
  );
  walker(
    'nyc-walk-5',
    [
      [24.6, 75.2],
      [38.6, 75.2],
    ],
    withProp(
      L('adult-woman', 'long-dress', 'hijab', 'none', {
        garmentPrimary: 'coral',
      }),
      'coffee',
    ),
    120,
  );
  walker(
    'nyc-walk-6',
    [
      [21, 66],
      [21, 74.6],
    ],
    withProp(child(), 'football'),
    120,
  );

  /* ════════ Michigan victory rally (x 60–94, y 62–92) ════════ */
  const SX = 72,
    SY = 64.6,
    STAGE = 8;
  obj('m-stage-backdrop', SX, SY - 0.4);
  obj('m-stage-base', SX, SY, true);
  obj('m-podium', SX + 3.2, SY + 1.7, false, STAGE);
  for (const [i, x] of [SX + 0.4, SX + 1.4, SX + 5.2, SX + 6.2].entries())
    obj(
      i === 1 || i === 2 ? 'm-state-flag' : 'm-us-flag',
      x,
      SY + 0.3,
      false,
      STAGE,
    );
  obj('m-speaker-stack', SX - 1.4, SY + 1.6);
  obj('m-speaker-stack', SX + 7.4, SY + 1.6);
  obj('m-camera-riser', SX + 2.6, 78);
  obj('m-brick-building', 61, 63.4);
  obj('m-brick-building', 86, 63.4);
  obj('m-brick-building-side', 61.2, 72);
  obj('m-brick-building-side', 92, 72);
  for (const x of [64, 70, 82, 88]) obj('m-street-lamp', x, 85.4);
  for (const x of [62, 74, 91]) obj('m-tree', x, 88.6);
  // Supporters fill the square facing the stage; many film on their phones.
  let n = 0;
  for (let row = 0; row < 4; row++)
    for (let i = 0; i < 9; i++) {
      if ((row * 9 + i) % 5 === 3) continue;
      const x = SX - 3 + i * 1.5 + (row % 2) * 0.7,
        y = SY + 5.2 + row * 1.6;
      const action = (
        ['cheer', 'celebrate', 'wave', 'idle', 'celebrate'] as const
      )[(row + i) % 5];
      person(
        `rally-${n++}`,
        [x, y],
        action,
        withProp(
          (row + i) % 3 === 0 ? woman() : (row + i) % 3 === 1 ? man() : child(),
          action === 'celebrate' ? 'phone' : 'none',
        ),
        x < SX + 3.5 ? 'NE' : 'NW',
        ([60, 120, 240] as Loop[])[(row * 2 + i) % 3],
      );
    }
  person(
    'tv-crew-1',
    [SX + 3, 78.6],
    'idle',
    withProp(
      L('adult-man', 'hoodie-jeans', 'cap', 'none', {
        garmentPrimary: 'graphite',
      }),
      'clipboard',
    ),
    'NE',
    240,
  );
  person(
    'tv-crew-2',
    [SX + 4.2, 78.8],
    'talk',
    withProp(
      L('adult-woman', 'blazer-open', 'hijab', 'none', {
        garmentPrimary: 'navy',
      }),
      'tablet',
    ),
    'NW',
  );

  /* ════════ Bangladesh (x 2–94, y 95–122), south of New York ════════ */
  // Baitul Mukarram, the national mosque: the cube, its gate and arcades on a
  // white marble plaza (no calligraphy is drawn).
  obj('m-baitul-mukarram', 8, 96);
  obj('m-bm-gate', 9.5, 104);
  obj('m-bm-arcade', 18, 103.5);
  obj('m-bm-arcade', 25, 103.5);
  obj('m-bm-pavilion', 4.5, 108);
  obj('m-tea-stall', 36.5, 112);
  obj('m-street-lamp', 34, 106.5);
  obj('m-street-lamp', 34, 119);
  for (const [x, y] of [
    [4, 120],
    [38, 96],
    [38, 120],
  ])
    obj('m-tree', x, y);
  // A school with its yard, flag and a shapla (water-lily) pond.
  obj('m-bd-school', 46, 96.6);
  obj('m-bd-flag', 59, 101.5);
  obj('m-shapla-pond', 66, 98);
  for (const x of [44, 61]) obj('m-tree', x, 108.8);
  // Cycle rickshaws parked along the street.
  for (const x of [46, 53, 60]) obj('m-rickshaw', x, 113.1);
  // Cricket ground and a basketball court.
  obj('m-cricket-pitch', 77, 113.8);
  obj('m-stumps', 77.5, 114);
  obj('m-stumps', 77.5, 120.8);
  obj('m-basketball-court', 84, 96);
  obj('m-hoop', 84, 98);
  obj('m-hoop', 91, 98);
  for (const x of [66, 92]) obj('m-tree', x, 121);
  const lungi = (headwear: string, c: Partial<Look['colours']> = {}) =>
    L('adult-man', 'panjabi-lungi', headwear, 'none', {
      garmentPrimary: 'white-linen',
      ...c,
    });
  walker(
    'bd-worshipper-0',
    [
      [14, 109.5],
      [26, 109.5],
      [26, 115.5],
      [14, 115.5],
    ],
    lungi('taqiyah'),
    240,
  );
  walker(
    'bd-worshipper-1',
    [
      [28, 117.5],
      [20, 117.5],
      [20, 112.5],
      [28, 112.5],
    ],
    lungi('kufi', { garmentSecondary: 'emerald' }),
    240,
  );
  person(
    'bd-tea-seller',
    [37.6, 113.6],
    'pour',
    withProp(
      lungi('none', { garmentPrimary: 'khaki', garmentSecondary: 'emerald' }),
      'water-jug',
    ),
    'SW',
  );
  person(
    'bd-tea-drinker',
    [35.8, 114.4],
    'sit',
    L('elder', 'panjabi-lungi', 'taqiyah', 'coffee', {
      garmentPrimary: 'wool-cream',
    }),
    'SE',
  );
  // Pupils in uniform listening to their teacher in the yard.
  (
    [
      [48.5, 105.8, 'NE', 'boy'],
      [50.2, 106.6, 'NE', 'girl'],
      [52, 105.9, 'NW', 'boy'],
      [49.2, 108, 'NE', 'girl'],
      [51.2, 108.2, 'NW', 'boy'],
      [53.2, 107.6, 'NW', 'girl'],
    ] as [number, number, Facing, string][]
  ).forEach(([x, y, f, kind], i) =>
    person(
      `bd-pupil-${i}`,
      [x, y],
      'read',
      kind === 'boy'
        ? L('child', 'shirt-trousers', 'none', 'book', {
            garmentPrimary: 'white-linen',
            garmentSecondary: 'navy',
          })
        : L('child', 'long-dress', 'hijab', 'book', {
            garmentPrimary: 'sky',
            headwear: 'white-linen',
          }),
      f,
    ),
  );
  person(
    'bd-umpire',
    [76.4, 119.6],
    'idle',
    L('adult-man', 'shirt-trousers', 'cap', 'none', {
      garmentPrimary: 'white-linen',
      garmentSecondary: 'charcoal',
      headwear: 'white-linen',
    }),
    'NE',
  );
  person(
    'bd-fielder',
    [72.6, 118.6],
    'idle',
    L('adult-man-short', 'shirt-trousers', 'none', 'none', {
      garmentPrimary: 'emerald',
      garmentSecondary: 'emerald',
    }),
    'SE',
  );

  /* ════════ Floor ════════ */
  const floor: number[] = [];
  const stone = (x: number, y: number) => 1 + ((x * 3 + y * 7) % 3);
  const W = 96,
    H = 124;
  const streetRow = [63, 64, 76, 77, 89, 90],
    streetCol = [4, 5, 22, 23, 40, 41, 55, 56];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const inX = (a: number, b: number) => x >= a && x <= b,
        inY = (a: number, b: number) => y >= a && y <= b;
      let t: number;
      if (y >= 93) {
        // Bangladesh block: a road along the top, a street through the middle.
        t =
          y <= 94 || inX(40, 41) || (inY(111, 112) && x >= 42)
            ? 12
            : x <= 1 || x >= 95 || y >= 122
              ? 7
              : x <= 39
                ? inX(3, 38) && inY(96, 121)
                  ? 14
                  : 7
                : y <= 110
                  ? x <= 63
                    ? inX(44, 62) && inY(100, 110)
                      ? 15
                      : 8
                    : 4
                  : x >= 62
                    ? 4
                    : 8;
      } else if (y >= 61 && x >= 2 && x <= 57) {
        // New York: asphalt avenues, concrete sidewalks, paved blocks, a park.
        const street = streetRow.includes(y) || streetCol.includes(x),
          kerb =
            streetRow.some((r) => Math.abs(r - y) === 1) ||
            streetCol.some((c) => Math.abs(c - x) === 1);
        const park = inX(24, 39) && inY(78, 88);
        t = street
          ? 12
          : kerb || y < 63 || x < 4 || x > 56
            ? 7
            : park
              ? inX(30, 31) || inY(83, 84)
                ? 8
                : 4
              : y < 76 && inX(24, 39)
                ? 13
                : 8;
      } else if (y >= 61 && x >= 59) t = inX(66, 85) && inY(69, 77) ? 13 : 8;
      else if (x >= 61 && y >= 3 && y <= 44) t = 8;
      else if (x >= 61 && y >= 45 && y <= 56)
        t = x === 61 || y === 45 || y === 56 ? 8 : 12;
      else if (x < 7 || y < 7 || x > 55 || y > 55)
        t = inX(57, 58) || inY(57, 58) ? 12 : 7;
      else if (inY(21, 23) || inY(38, 40) || inX(22, 23) || inX(36, 38)) t = 8;
      else if (y <= 20) t = x <= 21 ? stone(x, y) : x <= 35 ? 9 : 10;
      else if (y <= 37)
        t = x <= 21 ? 11 : x <= 35 ? (inX(29, 31) || inY(30, 32) ? 8 : 4) : 13;
      else
        t =
          x <= 21
            ? y >= 41
              ? 10 // the maths lab's white floor
              : 9
            : x <= 35
              ? inY(48, 50)
                ? 12
                : 7
              : inY(46, 47)
                ? 8
                : 4;
      floor.push(t);
    }
  const collision: number[] = Array(W * H).fill(0);
  for (const o of objects)
    if (!o.walkable)
      for (let y = Math.floor(o.y); y < o.y + o.footprint[1]; y++)
        for (let x = Math.floor(o.x); x < o.x + o.footprint[0]; x++)
          collision[y * W + x] = 1;
  const room: Room = roomSchema.parse({
    type: 'map',
    version: '1.10',
    orientation: 'isometric',
    renderorder: 'right-down',
    tilewidth: 32,
    tileheight: 16,
    width: W,
    height: H,
    infinite: false,
    layers: [
      {
        id: 1,
        name: 'floor',
        type: 'tilelayer',
        width: W,
        height: H,
        data: floor,
      },
      {
        id: 2,
        name: 'collision',
        type: 'tilelayer',
        width: W,
        height: H,
        data: collision,
        visible: false,
      },
      { id: 3, name: 'objects', type: 'objectgroup', objects },
    ],
  });
  // Only the people famous scenes need stay (plus animals); the quarter is
  // moving toward named characters only.
  // Only the main (named) characters remain as people (owner's request,
  // 2026-11); balls, the ambulance and animals stay as part of the scenes.
  // SCENE_ROLES is kept so a scene's partners can be restored easily.
  void SCENE_ROLES;
  const scene = ambient.filter((c) => c.kind !== 'person');
  const kept = new Set(scene.map((c) => c.id));
  for (const c of scene) {
    if (c.id === 'amb-patient-2') c.pairWith = 'al-zahrawi';
    if (c.pairWith?.startsWith('amb-') && !kept.has(c.pairWith))
      delete c.pairWith;
  }
  ambient.length = 0;
  ambient.push(...scene);
  for (const c of ambient) c.role ??= roleFor(c.id.replace(/^amb-/, ''));
  const cards = namedCards();
  // Partners that no longer exist are dropped from the cards too.
  for (const c of cards)
    if (c.pairWith?.startsWith('amb-') && !kept.has(c.pairWith))
      delete c.pairWith;
  for (const c of [...ambient, ...cards]) {
    const errors = scriptErrors(characterSchema.parse(c), room);
    if (errors.length) throw Error(`${c.id}: ${errors.join('; ')}`);
  }
  return { room, ambient, cards };
}

const PLACEHOLDER = {
  en: 'PLACEHOLDER — to be researched',
  ar: 'PLACEHOLDER — to be researched',
  bn: 'PLACEHOLDER — to be researched',
};
/*
 * Quick facts: short, well-established statements only (no current-club or
 * other fast-changing claims), shown as an unreviewed summary next to a link
 * to the person's Wikipedia article. Biographies and stories remain
 * placeholders until researched and reviewed by the panel.
 */
const wiki = (title: string) => [
  { label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${title}` },
];
const facts: Record<string, { en: string; links: Character['links'] }> = {
  'fazlur-rahman-khan': {
    en: 'Bangladeshi-American structural engineer and architect. At Skidmore, Owings & Merrill in Chicago he pioneered "tube" structural systems for tall buildings, used for the John Hancock Center and the Sears (now Willis) Tower.',
    links: wiki('Fazlur_Rahman_Khan'),
  },
  'zohran-mamdani': {
    en: 'Mayor of New York City since 1 January 2026: the city’s first Muslim mayor, its first of South Asian descent and the first born in Africa. Born in Kampala, Uganda, he grew up in New York and served in the New York State Assembly before winning the 2025 election.',
    links: wiki('Zohran_Mamdani'),
  },
  'abdul-el-sayed': {
    en: 'Physician and public-health leader who ran Detroit’s health department. On 3 November 2026 he won Michigan’s U.S. Senate seat, becoming the first Muslim American elected to the Senate.',
    links: wiki('Abdul_El-Sayed'),
  },
  'zaha-hadid': {
    en: 'Iraqi-British architect known for sweeping, curved buildings. In 2004 she became the first woman to win the Pritzker Architecture Prize; her works include the London Aquatics Centre and the Heydar Aliyev Center in Baku.',
    links: wiki('Zaha_Hadid'),
  },
  'aziz-sancar': {
    en: 'Turkish-American biochemist at the University of North Carolina at Chapel Hill. He shared the 2015 Nobel Prize in Chemistry for mechanistic studies of how cells repair damaged DNA.',
    links: wiki('Aziz_Sancar'),
  },
  'karim-benzema': {
    en: 'French footballer and striker. He played for Real Madrid from 2009 to 2023, captaining the club, and won the Ballon d’Or in 2022.',
    links: wiki('Karim_Benzema'),
  },
  'mesut-ozil': {
    en: 'German footballer and attacking midfielder known for his vision and passing. He played for Real Madrid and Arsenal and won the 2014 FIFA World Cup with Germany.',
    links: wiki('Mesut_%C3%96zil'),
  },
  'mohamed-salah': {
    en: 'Egyptian footballer and forward. He joined Liverpool in 2017, where he has won the Premier League and the UEFA Champions League, and he captains Egypt’s national team.',
    links: wiki('Mohamed_Salah'),
  },
  'khabib-nurmagomedov': {
    en: 'Mixed martial artist from Dagestan, Russia. A former UFC lightweight champion, he retired undefeated in 2020 with a professional record of 29 wins and no losses.',
    links: wiki('Khabib_Nurmagomedov'),
  },
  'islam-makhachev': {
    en: 'Mixed martial artist from Makhachkala, Dagestan, and a longtime training partner of Khabib Nurmagomedov. He became UFC lightweight champion in 2022.',
    links: wiki('Islam_Makhachev'),
  },
  'kamaru-usman': {
    en: 'Nigerian-American mixed martial artist. He became UFC welterweight champion in 2019, the first African-born UFC champion.',
    links: wiki('Kamaru_Usman'),
  },
  'zabit-magomedsharipov': {
    en: 'Mixed martial artist from Dagestan who fought in the UFC featherweight division, known for his acrobatic, creative striking.',
    links: wiki('Zabit_Magomedsharipov'),
  },
  'khamzat-chimaev': {
    en: 'Chechen-born mixed martial artist who moved to Sweden as a young man and rose quickly in the UFC with relentless wrestling. His nickname is “Borz”, meaning wolf.',
    links: wiki('Khamzat_Chimaev'),
  },
  'muhammad-ali': {
    en: 'American boxer, the 1960 Olympic light-heavyweight gold medallist and three-time world heavyweight champion. Famous for his speed and wit, and for his stand on conscience outside the ring. He stood over Sonny Liston in their 1965 rematch in one of sport’s best-known photographs.',
    links: wiki('Muhammad_Ali'),
  },
  'ngolo-kante': {
    en: 'French footballer and defensive midfielder famed for his tireless running and ball-winning. He won the Premier League with Leicester City and with Chelsea, the 2021 UEFA Champions League with Chelsea, and the 2018 FIFA World Cup with France.',
    links: wiki('N%27Golo_Kant%C3%A9'),
  },
  'sadio-mane': {
    en: 'Senegalese footballer and forward. He played for Liverpool from 2016 to 2022 and won the 2021 Africa Cup of Nations with Senegal; he is known for funding a hospital and a school in his home village of Bambali.',
    links: wiki('Sadio_Man%C3%A9'),
  },
  'al-khwarizmi': {
    en: 'Scholar of the House of Wisdom in Baghdad. His book on calculation by completion and balancing gave us the word “algebra”, and the Latin form of his name gave us “algorithm”.',
    links: wiki('Al-Khwarizmi'),
  },
  'ibn-sina': {
    en: 'Physician and philosopher, known in Europe as Avicenna. His Canon of Medicine was a standard medical textbook for centuries.',
    links: wiki('Avicenna'),
  },
  'fatima-al-fihri': {
    en: 'Founder of the al-Qarawiyyin mosque in Fez in 859, which grew into a renowned centre of learning, today’s University of al-Qarawiyyin.',
    links: wiki('Fatima_al-Fihri'),
  },
  'ibn-al-haytham': {
    en: 'Mathematician and physicist of Basra and Cairo, known in Europe as Alhazen. His Book of Optics explained that we see because light enters the eye, and he tested his ideas by careful experiment.',
    links: wiki('Ibn_al-Haytham'),
  },
  'al-zahrawi': {
    en: 'Surgeon of Córdoba, known in Europe as Abulcasis. His medical encyclopaedia, al-Tasrif, described and illustrated hundreds of surgical instruments.',
    links: wiki('Al-Zahrawi'),
  },
  'al-jazari': {
    en: 'Engineer at the Artuqid court in Diyarbakır. His Book of Knowledge of Ingenious Mechanical Devices (1206) describes water clocks, including the famous elephant clock, pumps and automata.',
    links: wiki('Ismail_al-Jazari'),
  },
  'al-biruni': {
    en: 'Scholar from Khwarazm who wrote on astronomy, mathematics, geography and India. He estimated the radius of the Earth by measuring the dip of the horizon from a mountain.',
    links: wiki('Al-Biruni'),
  },
  'ibn-khaldun': {
    en: 'Historian and thinker born in Tunis. His Muqaddimah (1377) set out how societies rise and decline and is seen as a founding work of sociology and the study of history.',
    links: wiki('Ibn_Khaldun'),
  },
  'ibn-rushd': {
    en: 'Philosopher, judge and physician of Córdoba, known in Europe as Averroes. His commentaries on Aristotle were studied in European universities for centuries.',
    links: wiki('Averroes'),
  },
  'mufti-ismail-menk': {
    en: 'Zimbabwean Islamic scholar who studied in India and at the Islamic University of Madinah. He is known around the world for short, gentle talks on good character, patience and kindness.',
    links: wiki('Ismail_Menk'),
  },
  'hamza-yusuf': {
    en: 'American Islamic scholar who co-founded Zaytuna College in Berkeley, California, the first accredited Muslim liberal-arts college in the United States.',
    links: wiki('Hamza_Yusuf'),
  },
  'omar-suleiman': {
    en: 'American Islamic scholar from New Orleans and founder of the Yaqeen Institute for Islamic Research in Dallas, Texas, known for his lectures and civil-rights work.',
    links: wiki('Omar_Suleiman_(imam)'),
  },
  'habib-umar-bin-hafiz': {
    en: 'Yemeni Islamic scholar from Tarim, Hadramawt, where he founded Dar al-Mustafa, a seminary that welcomes students from around the world.',
    links: wiki('Umar_bin_Hafiz'),
  },
  'kazi-nazrul-islam': {
    en: 'Bengali poet, writer and composer known as the “Rebel Poet” for verse against injustice. He wrote thousands of songs and is the national poet of Bangladesh.',
    links: wiki('Kazi_Nazrul_Islam'),
  },
  'begum-rokeya': {
    en: 'Bengali writer and educator, a pioneer of education for women. She founded the Sakhawat Memorial Girls’ School in Kolkata in 1911 and wrote the feminist story “Sultana’s Dream” (1905).',
    links: wiki('Begum_Rokeya'),
  },
  'mashrafe-mortaza': {
    en: 'Bangladeshi fast bowler from Narail and a long-serving captain of the national one-day team, known for leading through repeated knee injuries.',
    links: wiki('Mashrafe_Mortaza'),
  },
  'tamim-iqbal': {
    en: 'Left-handed opening batsman from Chattogram and former one-day captain, one of Bangladesh’s most prolific run-scorers.',
    links: wiki('Tamim_Iqbal'),
  },
  'malala-yousafzai': {
    en: 'Pakistani campaigner for girls’ education from the Swat Valley. In 2014 she became the youngest person to receive the Nobel Peace Prize.',
    links: wiki('Malala_Yousafzai'),
  },
  'ibn-battuta': {
    en: 'Traveller from Tangier whose Rihla describes nearly thirty years of journeys across Africa, Asia and Europe, including a visit to Bengal in 1346.',
    links: wiki('Ibn_Battuta'),
  },
  'muhammad-yunus': {
    en: 'Bangladeshi economist who founded Grameen Bank, pioneering small loans for people too poor for ordinary banks. He and the bank shared the 2006 Nobel Peace Prize.',
    links: wiki('Muhammad_Yunus'),
  },
  'hakeem-olajuwon': {
    en: 'Nigerian-American basketball centre who won two NBA championships with the Houston Rockets (1994 and 1995) and is in the Basketball Hall of Fame.',
    links: wiki('Hakeem_Olajuwon'),
  },
  'ahmed-zewail': {
    en: 'Egyptian-American chemist at Caltech. He won the 1999 Nobel Prize in Chemistry for watching chemical reactions with ultrashort laser flashes, the field known as femtochemistry.',
    links: wiki('Ahmed_Zewail'),
  },
};

/** Ambient people kept because a named character's scene needs them. */
const SCENE_ROLES = [
  // Özil's goal, Benzema's and Liverpool's celebrations.
  /^amb-ozil-/,
  /^amb-referee$/,
  /^amb-teammate-/,
  /^amb-lfc-/,
  // The octagon and the ring.
  /^amb-referee-octagon$/,
  /^amb-cornerman$/,
  /^amb-ali-opponent$/,
  /^amb-fight-fan-/,
  // Abdul El-Sayed's front rows.
  /^amb-rally-[0-9]$/,
  // Scene-bible stadium scenes: passers, trophy teammates, the ambulance.
  /^amb-stadium-/,
  // Scene-bible cricket scenes: the podium team, the line of shirts.
  /^amb-cricket-/,
  // People of Bangladesh: worshippers, a tea stall, pupils and the cricket.
  /^amb-bd-/,
  // Audiences and partners of scholars and scientists.
  /^amb-listener-/,
  /^amb-student-[0-2]$/,
  /^amb-coder-[0-2]$/,
  /^amb-patient(-2)?$/,
  /^amb-students-walk$/,
  /^amb-engineer-1$/,
];
/** Hover labels: what each ambient person is doing (English for now). */
const ROLES: [RegExp, string][] = [
  [/^bd-worshipper/, 'Crossing the plaza of Baitul Mukarram'],
  [/^bd-tea-seller/, 'Pouring cha at the tea stall'],
  [/^bd-tea-drinker/, 'Enjoying a cup of cha'],
  [/^bd-pupil/, 'Pupil at a Bangladeshi school'],
  [/^bd-umpire/, 'Umpire at the cricket match'],
  [/^bd-fielder/, 'Fielding at the cricket match'],
  [/^listener/, 'Listening to the talk'],
  [/^halal-vendor/, 'Halal cart vendor serving lunch'],
  [/^halal-queue/, 'Queueing for halal food'],
  [/^bodega-owner/, 'Bodega owner minding the shop'],
  [/^bodega-cat/, 'The bodega cat, asleep on duty'],
  [/^subway/, 'Heading down to the subway'],
  [/^bus-/, 'Waiting for the bus'],
  [/^park-bench/, 'Resting in the park'],
  [/^park-kids/, 'Children playing in the park'],
  [/^cityhall-press/, 'Reporter outside City Hall'],
  [/^cityhall-fan/, 'Waving to the mayor'],
  [/^newsstand/, 'Reading at the newsstand'],
  [/^nyc-walk/, 'New Yorker on the move'],
  [/^rally-/, 'Supporter celebrating at the victory rally'],
  [/^tv-crew/, 'TV crew covering the rally'],
  [/^worshipper/, 'Praying together in the prayer hall'],
  [/^teacher$/, 'Teaching the Qur’an study circle'],
  [/^student-\d/, 'Learning in the Qur’an study circle'],
  [/^wudu/, 'Making wudu before prayer'],
  [/^drafter/, 'Drafting building plans'],
  [/^designer/, 'Designing on the computer'],
  [/^engineer-1/, 'Structural engineer discussing a tower'],
  [/^chemist/, 'Scientist running a lab experiment'],
  [/^roboticist/, 'Programming the robot arm'],
  [/^student-lab/, 'Student studying science'],
  [/^patient/, 'Patient resting in hospital'],
  [/^doctor/, 'Doctor checking on a patient'],
  [/^nurse/, 'Nurse caring for patients'],
  [/^waiting/, 'Waiting to see the doctor'],
  [/^receptionist/, 'Welcoming visitors at reception'],
  [/^elder-/, 'Neighbours chatting on a bench'],
  [/^reader-/, 'Reading a book'],
  [/^sweeper/, 'Keeping the park clean'],
  [/^picnic/, 'Enjoying a picnic'],
  [/^diner/, 'Sharing a community meal'],
  [/^cook/, 'Volunteer cooking free meals'],
  [/^baker/, 'Baker handing out fresh bread'],
  [/^passerby/, 'Neighbour picking up bread'],
  [/^water-carrier/, 'Bringing water to the tables'],
  [/^volunteer/, 'Volunteer delivering meal boxes'],
  [/^coder/, 'Child learning to code'],
  [/^mentor/, 'Mentor teaching the coding class'],
  [/^librarian/, 'Librarian looking after the books'],
  [/^student-desk/, 'Student working on a laptop'],
  [/^barista/, 'Barista making coffee'],
  [/^cafe/, 'Relaxing at the café'],
  [/^commuter/, 'Waiting for the bus'],
  [/^gardener/, 'Gardener tending the solar garden'],
  [/^waterer/, 'Watering the planters'],
  [/^technician/, 'Technician checking the solar panels'],
  [/^engineer-solar/, 'Engineer inspecting the solar array'],
  [/^bench-pair/, 'Resting on a garden bench'],
  [/^kid-wave/, 'Children playing in the garden'],
  [
    /^(traveller|stroller|students-walk|fan-walk)/,
    'Walking through the quarter',
  ],
  [/^jogger/, 'Out for a morning jog'],
  [/^helpful-child/, 'Helping an elder walk'],
  [/^walking-elder/, 'Out for a walk with a grandchild'],
  [/^queue|^shopper|^vendor|^cyclist/, 'Shopping at the street market'],
  [/^(teammate|lfc)/, 'Footballer celebrating a goal'],
  [/^keeper/, 'Goalkeeper guarding the net'],
  [/^ozil-keeper/, 'Goalkeeper rushing out'],
  [/^ozil-defender/, 'Defender sliding in to tackle'],
  [/^referee-octagon/, 'Referee in the octagon'],
  [/^referee/, 'Referee keeping the match fair'],
  [/^coach/, 'Coach directing from the touchline'],
  [/^kit-manager/, 'Kit manager with the team tablet'],
  [/^commentator/, 'Commentating on the fight'],
  [/^cornerman/, 'Cornerman cheering on his fighter'],
  [/^ali-opponent/, 'Knocked-down boxer'],
  [/^(fan|fight-fan|ringside)/, 'Fan cheering from the crowd'],
  [/^cat-/, 'A neighbourhood cat'],
  [/^bird-/, 'A bird visiting the feeder'],
  [/^ozil-ball/, 'The match ball'],
];
function roleFor(id: string) {
  return ROLES.find(([re]) => re.test(id))?.[1];
}

/** Draft named cards. Never approved here; research and panel review pending. */
export function namedCards(): Character[] {
  // Heights of the octagon mat and boxing ring platform, in px.
  const MAT = 4,
    RING = 8;
  const card = (
    c: Partial<Character> & Pick<Character, 'id' | 'look' | 'script'>,
  ) =>
    characterSchema.parse({
      summary: facts[c.id] ? { en: facts[c.id].en } : undefined,
      links: facts[c.id]?.links,
      kind: 'person',
      depiction: 'full',
      loop: 120,
      aliases: [],
      bio: PLACEHOLDER,
      story: PLACEHOLDER,
      sources: [
        'PLACEHOLDER source 1 — research pending',
        'PLACEHOLDER source 2 — research pending',
      ],
      panelApproved: false,
      ...c,
    });
  const two = (
    a: Step['action'],
    b: Step['action'],
    at: Pt,
    fa: Facing,
    fb: Facing,
  ): Step[] => [
    { from: 0, to: 60, action: a, at, facing: fa },
    { from: 60, to: 120, action: b, at, facing: fb },
  ];
  return [
    card({
      id: 'fazlur-rahman-khan',
      name: {
        en: 'Fazlur Rahman Khan',
        ar: 'فضل الرحمن خان',
        bn: 'ফজলুর রহমান খান',
      },
      aliases: ['Fazlur Khan', 'F. R. Khan'],
      years: '1929–1982',
      place: 'Dhaka · Chicago',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-clean',
        garment: 'suit',
        headwear: 'none',
        prop: 'blueprint',
        colours: {
          skin: 'skin-5',
          hair: 'hair-black',
          garmentPrimary: 'graphite',
          garmentSecondary: 'madder-red',
          headwear: 'white-linen',
          prop: 'sky',
        },
      },
      script: two('talk', 'idle', [31.4, 12], 'SE', 'SW'),
      pairWith: 'amb-engineer-1',
    }),
    card({
      id: 'zohran-mamdani',
      name: { en: 'Zohran Mamdani', ar: 'زهران ممداني', bn: 'জোহরান মামদানি' },
      aliases: ['Mayor Mamdani'],
      years: 'b. 1991',
      place: 'Kampala · New York City',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-swept-beard',
        garment: 'suit',
        headwear: 'none',
        prop: 'scooter',
        colours: {
          skin: 'skin-3',
          hair: 'hair-black',
          garmentPrimary: 'navy',
          garmentSecondary: 'sky',
          headwear: 'white-linen',
          prop: 'steel',
        },
      },
      loop: 240,
      // Scooting round the City Hall block, then a wave to New Yorkers.
      script: [
        {
          from: 0,
          to: 200,
          action: 'ride',
          path: [
            [22.5, 63.5],
            [40.5, 63.5],
            [40.5, 76.5],
            [22.5, 76.5],
            [22.5, 63.5],
          ],
        },
        { from: 200, to: 240, action: 'wave', at: [22.5, 63.5], facing: 'SE' },
      ],
    }),
    card({
      id: 'abdul-el-sayed',
      name: { en: 'Abdul El-Sayed', ar: 'عبد السيد', bn: 'আবদুল এল-সায়েদ' },
      years: 'b. 1984',
      place: 'Michigan',
      district: 'modern-quarter',
      look: {
        base: 'adult-man',
        garment: 'blazer-open',
        headwear: 'none',
        prop: 'none',
        colours: {
          skin: 'skin-3',
          hair: 'hair-black',
          garmentPrimary: 'navy',
          garmentSecondary: 'navy',
          headwear: 'white-linen',
          prop: 'graphite',
        },
      },
      loop: 240,
      // Victory speech at the podium, then a wave to the crowd.
      script: [
        {
          from: 0,
          to: 180,
          action: 'speech',
          at: [75.7, 65.9],
          facing: 'SE',
          z: 8,
        },
        {
          from: 180,
          to: 240,
          action: 'wave',
          at: [75.7, 65.9],
          facing: 'SW',
          z: 8,
        },
      ],
    }),
    card({
      id: 'zaha-hadid',
      name: { en: 'Zaha Hadid', ar: 'زها حديد', bn: 'জাহা হাদিদ' },
      years: '1950–2016',
      place: 'Baghdad · London',
      district: 'modern-quarter',
      look: {
        base: 'adult-woman-loose',
        garment: 'long-dress',
        headwear: 'none',
        prop: 'tablet',
        colours: {
          skin: 'skin-3',
          hair: 'hair-black',
          garmentPrimary: 'black-cloth',
          garmentSecondary: 'mustard',
          headwear: 'black-cloth',
          prop: 'graphite',
        },
      },
      script: two('talk', 'idle', [29.6, 14.9], 'SE', 'SW'),
    }),
    card({
      id: 'aziz-sancar',
      name: { en: 'Aziz Sancar', ar: 'عزيز سنجر', bn: 'আজিজ সানজার' },
      years: 'b. 1946',
      place: 'Savur · Chapel Hill',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-clean',
        garment: 'lab-coat',
        headwear: 'none',
        prop: 'flask',
        colours: {
          skin: 'skin-3',
          hair: 'hair-grey',
          garmentPrimary: 'lab-white',
          garmentSecondary: 'navy',
          headwear: 'white-linen',
          prop: 'emerald',
        },
      },
      script: two('pour', 'talk', [42.5, 14.9], 'SE', 'SW'),
    }),
    card({
      id: 'karim-benzema',
      name: { en: 'Karim Benzema', ar: 'كريم بنزيما', bn: 'করিম বেনজেমা' },
      aliases: ['Benzema'],
      years: 'b. 1987',
      place: 'Lyon · Madrid',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-beard',
        garment: 'football-kit-captain',
        headwear: 'none',
        prop: 'wrist-tape',
        colours: {
          skin: 'skin-3',
          hair: 'hair-black',
          garmentPrimary: 'lab-white',
          garmentSecondary: 'plum',
          headwear: 'white-linen',
          prop: 'graphite',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 80,
          action: 'celebrate',
          at: [73.6, 20.8],
          facing: 'SE',
        },
        { from: 80, to: 160, action: 'cheer', at: [73.6, 20.8], facing: 'SE' },
        {
          from: 160,
          to: 240,
          action: 'cross-arms',
          at: [73.6, 20.8],
          facing: 'SW',
        },
      ],
    }),
    card({
      id: 'mesut-ozil',
      name: { en: 'Mesut Özil', ar: 'مسعود أوزيل', bn: 'মেসুত ওজিল' },
      aliases: ['Mesut Ozil'],
      years: 'b. 1988',
      place: 'Gelsenkirchen · London',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-clean',
        garment: 'football-kit-long',
        headwear: 'none',
        prop: 'none',
        colours: {
          skin: 'skin-2',
          hair: 'hair-black',
          garmentPrimary: 'kit-red',
          garmentSecondary: 'lab-white',
          headwear: 'white-linen',
          prop: 'graphite',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 24,
          action: 'walk',
          path: [
            [82, 23],
            [85, 23],
          ],
        },
        { from: 24, to: 36, action: 'kick', at: [85, 23], facing: 'SE' },
        {
          from: 36,
          to: 60,
          action: 'walk',
          path: [
            [85, 23],
            [86.8, 24.8],
            [88.3, 23.9],
          ],
        },
        { from: 60, to: 144, action: 'idle', at: [88.3, 23.9], facing: 'SE' },
        { from: 144, to: 156, action: 'kick', at: [88.3, 23.9], facing: 'SE' },
        { from: 156, to: 200, action: 'cheer', at: [88.3, 23.9], facing: 'SE' },
        {
          from: 200,
          to: 240,
          action: 'walk',
          path: [
            [88.3, 23.9],
            [82, 23],
          ],
        },
      ],
    }),
    card({
      id: 'mohamed-salah',
      name: { en: 'Mohamed Salah', ar: 'محمد صلاح', bn: 'মোহাম্মদ সালাহ' },
      aliases: ['Mo Salah'],
      years: 'b. 1992',
      place: 'Nagrig · Liverpool',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-curly',
        garment: 'football-kit-sleeved',
        headwear: 'none',
        prop: 'none',
        colours: {
          skin: 'skin-5',
          hair: 'hair-black',
          garmentPrimary: 'kit-red',
          garmentSecondary: 'lab-white',
          headwear: 'white-linen',
          prop: 'graphite',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 120,
          action: 'arms-out',
          at: [78.4, 22.6],
          facing: 'SE',
        },
        { from: 120, to: 180, action: 'cheer', at: [78.4, 22.6], facing: 'SE' },
        { from: 180, to: 240, action: 'idle', at: [78.4, 22.6], facing: 'SW' },
      ],
      pairWith: 'sadio-mane',
    }),
    card({
      id: 'khabib-nurmagomedov',
      name: {
        en: 'Khabib Nurmagomedov',
        ar: 'حبيب نورمحمدوف',
        bn: 'খাবিব নুরমাগোমেদভ',
      },
      aliases: ['Khabib'],
      years: 'b. 1988',
      place: 'Sildi · Makhachkala',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-beard',
        garment: 'fight-kit',
        headwear: 'papakha',
        prop: 'title-belt',
        colours: {
          skin: 'skin-2',
          hair: 'hair-black',
          garmentPrimary: 'black-cloth',
          garmentSecondary: 'black-cloth',
          headwear: 'wool-cream',
          prop: 'black-cloth',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 120,
          action: 'belt-pose',
          at: [66.6, 48.8],
          facing: 'SE',
          z: MAT,
        },
        {
          from: 120,
          to: 180,
          action: 'wave',
          at: [66.6, 48.8],
          facing: 'SE',
          z: MAT,
        },
        {
          from: 180,
          to: 240,
          action: 'belt-pose',
          at: [66.6, 48.8],
          facing: 'SW',
          z: MAT,
        },
      ],
    }),
    card({
      id: 'islam-makhachev',
      name: { en: 'Islam Makhachev', ar: 'إسلام مخاتشيف', bn: 'ইসলাম মাখাচেভ' },
      aliases: [],
      years: 'b. 1991',
      place: 'Makhachkala',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-shaved-beard',
        garment: 'fight-kit',
        headwear: 'none',
        prop: 'mma-gloves',
        colours: {
          skin: 'skin-2',
          hair: 'hair-black',
          garmentPrimary: 'black-cloth',
          garmentSecondary: 'kit-red',
          headwear: 'wool-cream',
          prop: 'black-cloth',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 60,
          action: 'guard',
          at: [65.6, 51],
          facing: 'SE',
          z: MAT,
        },
        {
          from: 60,
          to: 120,
          action: 'punch',
          at: [65.6, 51],
          facing: 'SE',
          z: MAT,
        },
        {
          from: 120,
          to: 180,
          action: 'guard',
          at: [65.6, 51],
          facing: 'SE',
          z: MAT,
        },
        {
          from: 180,
          to: 240,
          action: 'punch',
          at: [65.6, 51],
          facing: 'SE',
          z: MAT,
        },
      ],
      pairWith: 'kamaru-usman',
    }),
    card({
      id: 'kamaru-usman',
      name: { en: 'Kamaru Usman', ar: 'كمارو عثمان', bn: 'কামারু উসমান' },
      aliases: [],
      years: 'b. 1987',
      place: 'Auchi · Denver',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-shaved-beard',
        garment: 'fight-kit',
        headwear: 'none',
        prop: 'mma-gloves',
        colours: {
          skin: 'skin-8',
          hair: 'hair-black',
          garmentPrimary: 'emerald',
          garmentSecondary: 'lab-white',
          headwear: 'wool-cream',
          prop: 'black-cloth',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 60,
          action: 'guard',
          at: [68.4, 51],
          facing: 'NW',
          z: MAT,
        },
        {
          from: 60,
          to: 120,
          action: 'guard',
          at: [68.4, 51],
          facing: 'NW',
          z: MAT,
        },
        {
          from: 120,
          to: 180,
          action: 'punch',
          at: [68.4, 51],
          facing: 'NW',
          z: MAT,
        },
        {
          from: 180,
          to: 240,
          action: 'guard',
          at: [68.4, 51],
          facing: 'NW',
          z: MAT,
        },
      ],
      pairWith: 'islam-makhachev',
    }),
    card({
      id: 'zabit-magomedsharipov',
      name: {
        en: 'Zabit Magomedsharipov',
        ar: 'زابيت ماغوميدشاريبوف',
        bn: 'জাবিত মাগোমেদশারিপভ',
      },
      aliases: [],
      years: 'b. 1991',
      place: 'Dagestan',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-beard',
        garment: 'fight-kit',
        headwear: 'none',
        prop: 'mma-gloves',
        colours: {
          skin: 'skin-2',
          hair: 'hair-black',
          garmentPrimary: 'black-cloth',
          garmentSecondary: 'emerald',
          headwear: 'wool-cream',
          prop: 'black-cloth',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 60,
          action: 'kick',
          at: [74.4, 53.4],
          facing: 'SE',
          z: 0,
        },
        {
          from: 60,
          to: 120,
          action: 'guard',
          at: [74.4, 53.4],
          facing: 'SE',
          z: 0,
        },
        {
          from: 120,
          to: 180,
          action: 'kick',
          at: [74.4, 53.4],
          facing: 'SE',
          z: 0,
        },
        {
          from: 180,
          to: 240,
          action: 'guard',
          at: [74.4, 53.4],
          facing: 'SW',
          z: 0,
        },
      ],
    }),
    card({
      id: 'khamzat-chimaev',
      name: {
        en: 'Khamzat Chimaev',
        ar: 'خمزات تشيماييف',
        bn: 'খামজাত চিমায়েভ',
      },
      aliases: ['Borz'],
      years: 'b. 1994',
      place: 'Chechnya · Sweden',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-shaved-beard',
        garment: 'fight-kit',
        headwear: 'none',
        prop: 'mma-gloves',
        colours: {
          skin: 'skin-1',
          hair: 'hair-black',
          garmentPrimary: 'black-cloth',
          garmentSecondary: 'navy',
          headwear: 'wool-cream',
          prop: 'black-cloth',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 60,
          action: 'guard',
          at: [75.6, 48.4],
          facing: 'SE',
          z: 0,
        },
        {
          from: 60,
          to: 120,
          action: 'punch',
          at: [75.6, 48.4],
          facing: 'SE',
          z: 0,
        },
        {
          from: 120,
          to: 180,
          action: 'guard',
          at: [75.6, 48.4],
          facing: 'SW',
          z: 0,
        },
        {
          from: 180,
          to: 240,
          action: 'punch',
          at: [75.6, 48.4],
          facing: 'SW',
          z: 0,
        },
      ],
    }),
    card({
      id: 'muhammad-ali',
      name: { en: 'Muhammad Ali', ar: 'محمد علي', bn: 'মুহাম্মদ আলী' },
      aliases: ['Cassius Clay'],
      years: '1942–2016',
      place: 'Louisville',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-short',
        garment: 'boxing-kit',
        headwear: 'none',
        prop: 'boxing-gloves',
        colours: {
          skin: 'skin-6',
          hair: 'hair-black',
          garmentPrimary: 'lab-white',
          garmentSecondary: 'lab-white',
          headwear: 'wool-cream',
          prop: 'kit-red',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 160,
          action: 'taunt',
          at: [81.4, 49.8],
          facing: 'SW',
          z: RING,
        },
        {
          from: 160,
          to: 240,
          action: 'guard',
          at: [81.4, 49.8],
          facing: 'SW',
          z: RING,
        },
      ],
      pairWith: 'amb-ali-opponent',
    }),
    card({
      id: 'ngolo-kante',
      name: { en: 'N’Golo Kanté', ar: 'نغولو كانتي', bn: 'এনগোলো কান্তে' },
      aliases: ['NGolo Kante', 'N’Golo Kante'],
      years: 'b. 1991',
      place: 'Paris · London',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-shaved',
        garment: 'football-kit',
        headwear: 'none',
        prop: 'football',
        colours: {
          skin: 'skin-7',
          hair: 'hair-black',
          garmentPrimary: 'royal-blue',
          garmentSecondary: 'lab-white',
          headwear: 'white-linen',
          prop: 'graphite',
        },
      },
      // Dribbling non-stop around midfield, ball at his feet.
      loop: 120,
      script: [
        {
          from: 0,
          to: 120,
          action: 'walk',
          path: [
            [77, 29.6],
            [82, 29.6],
            [83.2, 27.6],
            [78.4, 27.2],
            [77, 29.6],
          ],
        },
      ],
    }),
    card({
      id: 'sadio-mane',
      name: { en: 'Sadio Mané', ar: 'ساديو ماني', bn: 'সাদিও মানে' },
      aliases: ['Sadio Mane'],
      years: 'b. 1992',
      place: 'Bambali · Liverpool',
      district: 'modern-quarter',
      look: {
        base: 'adult-man-goatee',
        garment: 'football-kit',
        headwear: 'none',
        prop: 'none',
        colours: {
          skin: 'skin-7',
          hair: 'hair-black',
          garmentPrimary: 'kit-red',
          garmentSecondary: 'lab-white',
          headwear: 'white-linen',
          prop: 'graphite',
        },
      },
      loop: 240,
      script: [
        {
          from: 0,
          to: 120,
          action: 'hand-on-heart',
          at: [80.4, 24.4],
          facing: 'SW',
        },
        {
          from: 120,
          to: 180,
          action: 'celebrate',
          at: [80.4, 24.4],
          facing: 'SW',
        },
        {
          from: 180,
          to: 240,
          action: 'hand-on-heart',
          at: [80.4, 24.4],
          facing: 'SE',
        },
      ],
      pairWith: 'mohamed-salah',
    }),
    card({
      id: 'al-khwarizmi',
      name: { en: 'Al-Khwarizmi', ar: 'الخوارزمي', bn: 'আল-খোয়ারিজমি' },
      aliases: ['Muhammad ibn Musa al-Khwarizmi'],
      years: 'c. 780–850',
      place: 'Baghdad',
      district: 'house-of-wisdom',
      look: {
        base: 'adult-man',
        garment: 'scholar-robe',
        headwear: 'imamah',
        prop: 'book',
        colours: {
          skin: 'skin-4',
          hair: 'hair-black',
          garmentPrimary: 'indigo',
          garmentSecondary: 'white-linen',
          headwear: 'white-linen',
          prop: 'madder-red',
        },
      },
      script: two('write', 'teach', [8.3, 44.0], 'SE', 'SW'),
    }),
    card({
      id: 'ibn-sina',
      name: { en: 'Ibn Sina', ar: 'ابن سينا', bn: 'ইবনে সিনা' },
      aliases: ['Avicenna'],
      years: '980–1037',
      place: 'Bukhara',
      district: 'house-of-wisdom',
      look: {
        base: 'adult-man',
        garment: 'jubba',
        headwear: 'imamah',
        prop: 'none',
        colours: {
          skin: 'skin-1',
          hair: 'hair-black',
          garmentPrimary: 'olive',
          garmentSecondary: 'white-linen',
          headwear: 'white-linen',
          prop: 'brass',
        },
      },
      script: two('talk', 'idle', [10.6, 25.6], 'SW', 'SW'),
      pairWith: 'amb-patient',
    }),
    card({
      id: 'fatima-al-fihri',
      name: {
        en: 'Fatima al-Fihri',
        ar: 'فاطمة الفهرية',
        bn: 'ফাতিমা আল-ফিহরি',
      },
      years: 'c. 800–880',
      place: 'Fez',
      district: 'maghreb',
      look: {
        base: 'adult-woman',
        garment: 'abaya',
        headwear: 'khimar',
        prop: 'none',
        colours: {
          skin: 'skin-3',
          hair: 'hair-black',
          garmentPrimary: 'madder-red',
          garmentSecondary: 'saffron',
          headwear: 'navy',
          prop: 'brass',
        },
      },
      script: two('wave', 'talk', [38.2, 21.2], 'SE', 'SW'),
      pairWith: 'amb-students-walk',
    }),
    ...scholars().map(card),
    ...bangladeshAndMore().map(card),
    ...STADIUM_CARDS.map(card),
    ...CRICKET_CARDS.map(card),
  ].map((c) => {
    // Calm standing beats, so each person's supplied full-body sprite
    // (art/sprites/<id>.png) shows for part of their loop.
    for (const [i, action] of STANDING[c.id] ?? []) c.script[i].action = action;
    // Scene-bible loops (docs/scene-bible.md) replace the earlier ones.
    const up = STADIUM_UPGRADES[c.id];
    if (up) {
      c.loop = up.loop;
      c.script = up.script;
      if (up.look) c.look = { ...c.look, ...up.look };
    }
    if (STADIUM_LINKS[c.id])
      c.links = [...(c.links ?? []), ...STADIUM_LINKS[c.id]!];
    return c;
  });
}
const STANDING: Record<string, [number, Step['action']][]> = {
  'islam-makhachev': [[3, 'idle']],
  'kamaru-usman': [[3, 'idle']],
  'khamzat-chimaev': [[2, 'idle']],
  'zabit-magomedsharipov': [[3, 'idle']],
  'muhammad-ali': [[1, 'idle']],
  'mashrafe-mortaza': [[1, 'idle']],
  'begum-rokeya': [
    [0, 'talk'],
    [1, 'talk'],
  ],
  'ibn-khaldun': [
    [0, 'idle'],
    [1, 'talk'],
  ],
  'ibn-rushd': [
    [0, 'talk'],
    [1, 'idle'],
  ],
  'al-khwarizmi': [
    [0, 'idle'],
    [1, 'talk'],
  ],
};
/*
 * Scholars at work: golden-age scholars (no photographs exist, so their looks
 * follow traditional portraits and statues), today's Islamic scholars and a
 * modern scientist. Each stands where people like them work in the quarter.
 */
function scholars(): (Partial<Character> &
  Pick<Character, 'id' | 'look' | 'script'>)[] {
  const look = (
    base: string,
    garment: string,
    headwear: string,
    prop: string,
    colours: Partial<Look['colours']>,
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
      headwear: 'white-linen',
      prop: 'cocoa',
      ...colours,
    },
  });
  const two = (
    a: Step['action'],
    b: Step['action'],
    at: Pt,
    fa: Facing,
    fb: Facing,
  ): Step[] => [
    { from: 0, to: 60, action: a, at, facing: fa },
    { from: 60, to: 120, action: b, at, facing: fb },
  ];
  return [
    {
      id: 'ibn-al-haytham',
      name: { en: 'Ibn al-Haytham', ar: 'ابن الهيثم', bn: 'ইবনে আল-হাইসাম' },
      aliases: ['Alhazen'],
      years: '965–c. 1040',
      place: 'Basra · Cairo',
      district: 'house-of-wisdom',
      look: look('adult-man-beard', 'qaba', 'imamah', 'book', {
        skin: 'skin-3',
        garmentPrimary: 'indigo',
        garmentSecondary: 'saffron',
      }),
      // Explaining his optics experiments in the university lab.
      script: two('talk', 'idle', [44.6, 18.4], 'SE', 'SW'),
    },
    {
      id: 'al-zahrawi',
      name: { en: 'al-Zahrawi', ar: 'الزهراوي', bn: 'আল-জাহরাবি' },
      aliases: ['Abulcasis'],
      years: '936–1013',
      place: 'Córdoba',
      district: 'maghreb',
      look: look('adult-man-beard', 'jubba', 'imamah', 'scroll', {
        skin: 'skin-2',
        garmentPrimary: 'sky',
        headwear: 'wool-cream',
        prop: 'wool-cream',
      }),
      // At the hospital, explaining a treatment to a patient.
      script: two('talk', 'idle', [10.6, 29.6], 'SW', 'SE'),
      pairWith: 'amb-patient-2',
    },
    {
      id: 'al-jazari',
      name: { en: 'al-Jazari', ar: 'الجزري', bn: 'আল-জাজারি' },
      years: 'c. 1136–1206',
      place: 'Diyarbakır',
      district: 'house-of-wisdom',
      look: look('adult-man-beard', 'qaba', 'imamah', 'blueprint', {
        skin: 'skin-4',
        garmentPrimary: 'madder-red',
        garmentSecondary: 'saffron',
        headwear: 'wool-cream',
        prop: 'sky',
      }),
      // Beside the robot arm with the plans of his machines.
      script: two('talk', 'idle', [52.3, 14.6], 'SW', 'SE'),
    },
    {
      id: 'al-biruni',
      name: { en: 'al-Biruni', ar: 'البيروني', bn: 'আল-বিরুনী' },
      years: '973–c. 1050',
      place: 'Khwarazm · Ghazni',
      district: 'house-of-wisdom',
      look: look('elder', 'qaba', 'imamah', 'astrolabe', {
        skin: 'skin-3',
        hair: 'hair-grey',
        garmentPrimary: 'navy',
        garmentSecondary: 'brass',
        prop: 'brass',
      }),
      // Taking a sighting with his astrolabe in the park.
      script: two('idle', 'talk', [30, 27.4], 'SE', 'SW'),
    },
    {
      id: 'ibn-khaldun',
      name: { en: 'Ibn Khaldun', ar: 'ابن خلدون', bn: 'ইবনে খালদুন' },
      years: '1332–1406',
      place: 'Tunis · Cairo',
      district: 'maghreb',
      look: look('adult-man-beard', 'scholar-robe', 'imamah', 'book', {
        skin: 'skin-3',
        garmentPrimary: 'wool-cream',
        garmentSecondary: 'cocoa',
      }),
      // Reading and explaining in the library's reading corner.
      script: two('read', 'teach', [16.4, 49.7], 'SE', 'SW'),
    },
    {
      id: 'ibn-rushd',
      name: { en: 'Ibn Rushd', ar: 'ابن رشد', bn: 'ইবনে রুশদ' },
      aliases: ['Averroes'],
      years: '1126–1198',
      place: 'Córdoba · Marrakesh',
      district: 'maghreb',
      look: look('elder', 'jubba', 'imamah', 'book', {
        skin: 'skin-2',
        hair: 'hair-grey',
        garmentPrimary: 'black-cloth',
        garmentSecondary: 'wool-cream',
        headwear: 'wool-cream',
      }),
      script: two('teach', 'read', [12.6, 49.6], 'SE', 'SW'),
    },
    {
      id: 'mufti-ismail-menk',
      name: {
        en: 'Mufti Ismail Menk',
        ar: 'المفتي إسماعيل منك',
        bn: 'মুফতি ইসমাইল মেংক',
      },
      aliases: ['Mufti Menk'],
      years: 'b. 1975',
      place: 'Harare',
      district: 'modern-quarter',
      // As in his photographs: a white ghutra, a thick black beard and a
      // cream robe over a white thobe.
      look: look('adult-man-beard', 'jubba', 'ghutra', 'none', {
        skin: 'skin-2',
        garmentPrimary: 'white-linen',
        garmentSecondary: 'brass',
      }),
      // A talk in the prayer hall for a small gathering.
      script: two('talk', 'idle', [12.7, 10.4], 'SW', 'SE'),
    },
    {
      id: 'hamza-yusuf',
      name: { en: 'Hamza Yusuf', ar: 'حمزة يوسف', bn: 'হামজা ইউসুফ' },
      years: 'b. 1958',
      place: 'Berkeley, California',
      district: 'modern-quarter',
      look: look('adult-man-beard', 'jubba', 'imamah', 'book', {
        skin: 'skin-1',
        hair: 'hair-grey',
        garmentPrimary: 'khaki',
        garmentSecondary: 'white-linen',
      }),
      // Teaching from a book in the park.
      script: two('talk', 'idle', [31.5, 33.2], 'SW', 'SE'),
    },
    {
      id: 'omar-suleiman',
      name: { en: 'Omar Suleiman', ar: 'عمر سليمان', bn: 'ওমর সুলাইমান' },
      years: 'b. 1986',
      place: 'New Orleans · Dallas',
      district: 'modern-quarter',
      look: look('adult-man-beard', 'jubba', 'none', 'none', {
        skin: 'skin-3',
        garmentPrimary: 'navy',
        garmentSecondary: 'white-linen',
      }),
      // Greeting people at the mosque entrance.
      script: two('talk', 'wave', [9, 17.7], 'SE', 'SW'),
    },
    {
      id: 'habib-umar-bin-hafiz',
      name: {
        en: 'Habib Umar bin Hafiz',
        ar: 'الحبيب عمر بن حفيظ',
        bn: 'হাবিব উমর বিন হাফিজ',
      },
      years: 'b. 1963',
      place: 'Tarim, Yemen',
      district: 'modern-quarter',
      look: look('elder', 'jubba', 'imamah', 'none', {
        skin: 'skin-4',
        hair: 'hair-white',
        garmentSecondary: 'emerald',
      }),
      // Teaching the study circle.
      script: two('teach', 'teach', [19.1, 15.8], 'SW', 'SE'),
    },
    {
      id: 'ahmed-zewail',
      name: { en: 'Ahmed Zewail', ar: 'أحمد زويل', bn: 'আহমেদ জেওয়াইল' },
      years: '1946–2016',
      place: 'Damanhur · Pasadena',
      district: 'modern-quarter',
      look: look('adult-man-clean', 'lab-coat', 'none', 'tablet', {
        skin: 'skin-4',
        hair: 'hair-grey',
        garmentPrimary: 'lab-white',
        garmentSecondary: 'navy',
        prop: 'graphite',
      }),
      // Talking through a laser experiment in the lab.
      script: two('talk', 'idle', [42.4, 9.9], 'SW', 'SE'),
    },
  ];
}

/* Famous Muslims of Bangladesh, and others whose work the new block hosts. */
function bangladeshAndMore(): (Partial<Character> &
  Pick<Character, 'id' | 'look' | 'script'>)[] {
  const look = (
    base: string,
    garment: string,
    headwear: string,
    prop: string,
    colours: Partial<Look['colours']>,
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
      prop: 'cocoa',
      ...colours,
    },
  });
  const two = (
    a: Step['action'],
    b: Step['action'],
    at: Pt,
    fa: Facing,
    fb: Facing,
  ): Step[] => [
    { from: 0, to: 60, action: a, at, facing: fa },
    { from: 60, to: 120, action: b, at, facing: fb },
  ];
  const cricket = { garmentPrimary: 'emerald', garmentSecondary: 'emerald' };
  return [
    {
      id: 'kazi-nazrul-islam',
      name: {
        en: 'Kazi Nazrul Islam',
        ar: 'قاضي نذر الإسلام',
        bn: 'কাজী নজরুল ইসলাম',
      },
      aliases: ['Nazrul'],
      years: '1899–1976',
      place: 'Churulia · Dhaka',
      district: 'modern-quarter',
      look: look('adult-man-clean', 'panjabi-lungi', 'none', 'book', {
        skin: 'skin-3',
        garmentPrimary: 'wool-cream',
        garmentSecondary: 'madder-red',
      }),
      // Reciting his poems beside the shapla pond.
      script: two('talk', 'idle', [65, 102.6], 'SE', 'SW'),
    },
    {
      id: 'begum-rokeya',
      name: { en: 'Begum Rokeya', ar: 'بيغم رقية', bn: 'বেগম রোকেয়া' },
      aliases: ['Rokeya Sakhawat Hossain'],
      years: '1880–1932',
      place: 'Rangpur · Kolkata',
      district: 'modern-quarter',
      look: look('adult-woman', 'long-dress', 'hijab', 'book', {
        garmentSecondary: 'navy',
      }),
      // Teaching her pupils in the school yard.
      script: two('teach', 'teach', [50.6, 103.8], 'SW', 'SE'),
    },
    {
      id: 'malala-yousafzai',
      name: {
        en: 'Malala Yousafzai',
        ar: 'ملالا يوسفزاي',
        bn: 'মালালা ইউসুফজাই',
      },
      years: 'b. 1997',
      place: 'Mingora · Birmingham',
      district: 'modern-quarter',
      look: look('adult-woman', 'long-dress', 'hijab', 'book', {
        skin: 'skin-3',
        garmentPrimary: 'coral',
        garmentSecondary: 'rose',
        headwear: 'rose',
      }),
      // Visiting the school to talk about girls' education.
      script: two('talk', 'wave', [56, 102.6], 'SW', 'SE'),
    },
    {
      id: 'mashrafe-mortaza',
      name: {
        en: 'Mashrafe Mortaza',
        ar: 'مشرفي مرتضى',
        bn: 'মাশরাফি মর্তুজা',
      },
      years: 'b. 1983',
      place: 'Narail',
      district: 'modern-quarter',
      look: look('adult-man-beard', 'shirt-trousers', 'none', 'none', {
        skin: 'skin-5',
        ...cricket,
      }),
      // Celebrating a wicket at the bowler's end.
      script: two('celebrate', 'cheer', [80, 119.6], 'SE', 'SW'),
    },
    {
      id: 'tamim-iqbal',
      name: { en: 'Tamim Iqbal', ar: 'تميم إقبال', bn: 'তামিম ইকবাল' },
      years: 'b. 1989',
      place: 'Chattogram',
      district: 'modern-quarter',
      look: look('adult-man-beard', 'shirt-trousers', 'none', 'cricket-bat', {
        ...cricket,
        prop: 'wool-cream',
      }),
      // At the crease, then raising his bat.
      script: two('idle', 'cheer', [78.8, 115.4], 'SW', 'SE'),
    },
    {
      id: 'ibn-battuta',
      name: { en: 'Ibn Battuta', ar: 'ابن بطوطة', bn: 'ইবনে বতুতা' },
      years: '1304–c. 1369',
      place: 'Tangier',
      district: 'maghreb',
      look: look('adult-man-beard', 'kaftan', 'imamah', 'scroll', {
        skin: 'skin-3',
        garmentPrimary: 'khaki',
        garmentSecondary: 'cocoa',
        prop: 'wool-cream',
      }),
      // A traveller arriving at the mosque plaza.
      script: two('talk', 'wave', [16, 110.5], 'SE', 'SW'),
    },
    {
      id: 'muhammad-yunus',
      name: { en: 'Muhammad Yunus', ar: 'محمد يونس', bn: 'মুহাম্মদ ইউনূস' },
      years: 'b. 1940',
      place: 'Chattogram · Dhaka',
      district: 'modern-quarter',
      look: look('adult-man-clean', 'shirt-trousers', 'none', 'tablet', {
        hair: 'hair-grey',
        garmentPrimary: 'khaki',
        garmentSecondary: 'charcoal',
        prop: 'graphite',
      }),
      // Talking with traders by the rickshaw street.
      script: two('talk', 'idle', [49, 117], 'SE', 'SW'),
    },
    {
      id: 'hakeem-olajuwon',
      name: {
        en: 'Hakeem Olajuwon',
        ar: 'حكيم أولاجوون',
        bn: 'হাকিম ওলাজুওন',
      },
      aliases: ['Hakeem the Dream'],
      years: 'b. 1963',
      place: 'Lagos · Houston',
      district: 'modern-quarter',
      look: look('adult-man-short', 'football-kit', 'none', 'none', {
        skin: 'skin-8',
        garmentPrimary: 'kit-red',
        garmentSecondary: 'white-linen',
      }),
      script: two('celebrate', 'idle', [88, 99.6], 'SE', 'SW'),
    },
  ];
}
