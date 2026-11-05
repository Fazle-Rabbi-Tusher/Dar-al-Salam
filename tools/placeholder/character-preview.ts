// Dev helper: regenerate part sheets and render zoomed contact sheets of sample
// looks × actions. Usage: node --import tsx tools/placeholder/character-preview.ts <prefix>
// Writes <prefix>-looks.png, <prefix>-actions.png and <prefix>-animals.png.
import { generateParts } from './parts';
import { loadParts, png, readJson } from '../build/io';
import { compose } from '../../packages/shared/compositor';
import { Pixels, blit } from '../../packages/shared/pixels';
import type { Action, Facing, Look } from '../../packages/shared/schema';
const prefix = (process.argv[2] ?? 'character-preview').replace(/\.png$/, '');
const zoom = Number(process.argv[3] ?? 3);
await generateParts(true);
const parts = await loadParts();
const keys = await readJson('content/palettes/key-colours.json');
const ramps = await readJson('content/palettes/ramps.json');
const palette = { keys, ramps, outline: '#493C35', shadow: '#493C35' };
const L = (
  base: string,
  garment: string,
  headwear: string,
  prop: string,
  c: string[],
): Look => ({
  base,
  garment,
  headwear,
  prop,
  colours: {
    skin: c[0],
    hair: c[1],
    garmentPrimary: c[2],
    garmentSecondary: c[3],
    headwear: c[4],
    prop: c[5],
  },
});
type Cell = [Look, Action, Facing, number];
async function sheet(name: string, rows: Cell[][]) {
  const cols = Math.max(...rows.map((r) => r.length));
  const cw = 48,
    ch = 72,
    S = zoom;
  const out = new Pixels(cols * cw * S, rows.length * ch * S);
  out.rect(0, 0, out.width, out.height, '#D7DCD2');
  for (const [ri, row] of rows.entries())
    for (const [ci, [look, action, facing, i]] of row.entries()) {
      if ((ri + ci) % 2)
        out.rect(ci * cw * S, ri * ch * S, cw * S, ch * S, '#E6E8E1');
      let img;
      try {
        img = compose(look, action, facing, i, parts, palette);
      } catch (e) {
        console.log(String(e));
        continue;
      }
      const big = new Pixels(img.width * S, img.height * S);
      for (let y = 0; y < big.height; y++)
        for (let x = 0; x < big.width; x++) {
          const k = (Math.floor(y / S) * img.width + Math.floor(x / S)) * 4;
          big.data.set(img.data.slice(k, k + 4), (y * big.width + x) * 4);
        }
      const ox = Math.round((cw - img.width) / 2) * S,
        oy = (ch - img.height) * S;
      blit(out, big, ci * cw * S + ox, ri * ch * S + oy);
    }
  await png(`${prefix}-${name}.png`, out);
  console.log('wrote', `${prefix}-${name}.png`);
}
const looks: Look[] = [
  L('adult-man', 'lab-coat', 'none', 'flask', [
    'skin-4',
    'hair-black',
    'lab-white',
    'navy',
    'white-linen',
    'emerald',
  ]),
  L('adult-woman', 'scrubs', 'hijab', 'stethoscope', [
    'skin-2',
    'hair-black',
    'scrub-teal',
    'white-linen',
    'navy',
    'graphite',
  ]),
  L('adult-woman', 'abaya', 'khimar', 'book', [
    'skin-3',
    'hair-black',
    'black-cloth',
    'saffron',
    'black-cloth',
    'madder-red',
  ]),
  L('adult-woman', 'long-dress', 'headwrap', 'tablet', [
    'skin-7',
    'hair-black',
    'plum',
    'mustard',
    'coral',
    'graphite',
  ]),
  L('adult-woman', 'long-dress', 'none', 'tablet', [
    'skin-3',
    'hair-black',
    'black-cloth',
    'mustard',
    'black-cloth',
    'graphite',
  ]),
  L('adult-man', 'suit', 'none', 'blueprint', [
    'skin-5',
    'hair-black',
    'graphite',
    'madder-red',
    'white-linen',
    'sky',
  ]),
  L('adult-man', 'hi-vis', 'hard-hat', 'broom', [
    'skin-6',
    'hair-black',
    'safety-orange',
    'navy',
    'hi-vis',
    'olive',
  ]),
  L('adult-man', 'thobe', 'kufi', 'none', [
    'skin-3',
    'hair-black',
    'white-linen',
    'white-linen',
    'white-linen',
    'brass',
  ]),
  L('elder', 'jubba', 'imamah', 'cane', [
    'skin-4',
    'hair-white',
    'charcoal',
    'wool-cream',
    'white-linen',
    'cocoa',
  ]),
  L('child', 'hoodie-jeans', 'cap', 'laptop', [
    'skin-5',
    'hair-brown',
    'coral',
    'denim',
    'sky',
    'graphite',
  ]),
  L('child', 'thobe', 'taqiyah', 'book', [
    'skin-6',
    'hair-black',
    'white-linen',
    'white-linen',
    'white-linen',
    'madder-red',
  ]),
  L('adult-man-beard', 'football-kit-captain', 'none', 'wrist-tape', [
    'skin-3',
    'hair-black',
    'lab-white',
    'plum',
    'white-linen',
    'graphite',
  ]),
  L('adult-man-clean', 'football-kit-long', 'none', 'none', [
    'skin-2',
    'hair-brown',
    'kit-red',
    'lab-white',
    'white-linen',
    'graphite',
  ]),
  L('adult-man-curly', 'football-kit-sleeved', 'none', 'none', [
    'skin-5',
    'hair-black',
    'kit-red',
    'lab-white',
    'white-linen',
    'graphite',
  ]),
  L('adult-man-goatee', 'football-kit', 'none', 'none', [
    'skin-7',
    'hair-black',
    'kit-red',
    'lab-white',
    'white-linen',
    'graphite',
  ]),
  L('adult-man-shaved', 'football-kit', 'none', 'football', [
    'skin-7',
    'hair-black',
    'royal-blue',
    'lab-white',
    'white-linen',
    'graphite',
  ]),
  L('adult-man-beard', 'fight-kit', 'papakha', 'title-belt', [
    'skin-2',
    'hair-black',
    'black-cloth',
    'black-cloth',
    'wool-cream',
    'graphite',
  ]),
  L('adult-man-clean', 'boxing-kit', 'none', 'boxing-gloves', [
    'skin-6',
    'hair-black',
    'lab-white',
    'lab-white',
    'white-linen',
    'kit-red',
  ]),
  L('adult-man', 'panjabi-lungi', 'taqiyah', 'meal-box', [
    'skin-6',
    'hair-black',
    'white-linen',
    'emerald',
    'white-linen',
    'saffron',
  ]),
  L('adult-woman', 'baju-kurung', 'hijab', 'shopping-bag', [
    'skin-3',
    'hair-black',
    'rose',
    'turquoise',
    'sky',
    'mustard',
  ]),
  L('adult-man', 'boubou', 'songkok', 'phone', [
    'skin-8',
    'hair-black',
    'indigo',
    'saffron',
    'black-cloth',
    'graphite',
  ]),
  L('adult-man', 'scholar-robe', 'imamah', 'book', [
    'skin-4',
    'hair-black',
    'indigo',
    'white-linen',
    'white-linen',
    'madder-red',
  ]),
];
const core: [Action, Facing, number][] = [
  ['idle', 'SE', 0],
  ['idle', 'SE', 3],
  ['walk', 'SE', 1],
  ['walk', 'SW', 4],
  ['walk', 'NE', 2],
  ['talk', 'SE', 1],
  ['wave', 'SE', 1],
  ['cheer', 'SE', 0],
  ['carry', 'SE', 2],
  ['pour', 'SE', 3],
  ['sit', 'SE', 0],
  ['write', 'SE', 1],
  ['read', 'SE', 3],
];
await sheet(
  'looks',
  looks.map((l) => core.map(([a, f, i]) => [l, a, f, i] as Cell)),
);
const special: [Action, Facing, number][] = [
  ['pray', 'NE', 0],
  ['pray', 'NE', 2],
  ['pray', 'NE', 4],
  ['pray', 'NE', 6],
  ['pray', 'SE', 0],
  ['pray', 'SE', 2],
  ['pray', 'SE', 4],
  ['pray', 'SE', 6],
  ['teach', 'NE', 1],
  ['read', 'SE', 0],
  ['sweep', 'SE', 0],
  ['celebrate', 'SE', 1],
  ['arms-out', 'SE', 2],
  ['hand-on-heart', 'SE', 0],
  ['cross-arms', 'SE', 0],
  ['guard', 'SE', 0],
  ['punch', 'SE', 2],
  ['kick', 'SE', 2],
  ['belt-pose', 'SE', 2],
  ['taunt', 'SW', 0],
  ['lie', 'SE', 0],
  ['dive', 'NE', 1],
  ['slide', 'SE', 0],
];
await sheet(
  'actions',
  [0, 1, 7, 10, 11, 16, 17].map((i) =>
    special.map(([a, f, k]) => [looks[i], a, f, k] as Cell),
  ),
);
const cat = (c: string) =>
  L('cat', 'none', 'none', 'none', [
    'skin-1',
    'hair-black',
    c,
    'white-linen',
    'white-linen',
    'brass',
  ]);
const bird = (c: string) =>
  L('bird', 'none', 'none', 'none', [
    'skin-1',
    'hair-black',
    c,
    'white-linen',
    'white-linen',
    'saffron',
  ]);
await sheet('animals', [
  [
    [cat('saffron'), 'cat_idle', 'SE', 0],
    [cat('saffron'), 'cat_walk', 'SE', 1],
    [cat('charcoal'), 'cat_walk', 'NE', 3],
    [cat('wool-cream'), 'cat_sleep', 'SE', 2],
    [bird('graphite'), 'bird_fly', 'SE', 1],
    [bird('cocoa'), 'bird_fly', 'SW', 3],
    [bird('wool-cream'), 'bird_peck', 'SE', 0],
    [bird('graphite'), 'bird_peck', 'SE', 3],
  ],
]);
// Scooter rider and speech-giver.
const rider = L('adult-man-beard', 'suit', 'none', 'scooter', [
  'skin-3',
  'hair-black',
  'navy',
  'sky',
  'white-linen',
  'graphite',
]);
const speaker = L('adult-man', 'blazer-open', 'none', 'none', [
  'skin-3',
  'hair-black',
  'black-cloth',
  'graphite',
  'white-linen',
  'graphite',
]);
const parked = (look: Look): Look => ({ ...look, prop: 'scooter' });
await sheet('ride-speech', [
  [0, 1, 2, 3].flatMap((i) =>
    (['SE', 'SW', 'NE', 'NW'] as Facing[]).map((f): Cell => [
      rider,
      'ride',
      f,
      i,
    ]),
  ),
  [
    ...[0, 1, 2, 3].map((i): Cell => [speaker, 'speech', 'SE', i]),
    ...[0, 1, 2, 3].map((i): Cell => [speaker, 'speech', 'SW', i]),
    [speaker, 'speech', 'NE', 1],
    [speaker, 'idle', 'SE', 0],
    [speaker, 'walk', 'SE', 1],
    [speaker, 'talk', 'SW', 1],
  ],
  [
    [rider, 'idle', 'SE', 0],
    [rider, 'walk', 'SE', 1],
    [rider, 'wave', 'SE', 1],
    [parked(speaker), 'idle', 'SW', 0],
    [
      parked(
        L('adult-woman', 'long-dress', 'hijab', 'none', [
          'skin-5',
          'hair-black',
          'plum',
          'mustard',
          'emerald',
          'graphite',
        ]),
      ),
      'talk',
      'SE',
      1,
    ],
    [
      parked(
        L('child', 'hoodie-jeans', 'cap', 'none', [
          'skin-6',
          'hair-black',
          'coral',
          'denim',
          'sky',
          'mustard',
        ]),
      ),
      'ride',
      'SE',
      1,
    ],
    [
      parked(
        L('adult-woman', 'scrubs', 'hijab', 'none', [
          'skin-2',
          'hair-black',
          'scrub-teal',
          'white-linen',
          'navy',
          'sky',
        ]),
      ),
      'ride',
      'NE',
      2,
    ],
    [rider, 'sit', 'SE', 0],
  ],
]);
