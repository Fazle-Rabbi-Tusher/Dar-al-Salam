// Dev helper: regenerate part sheets and render a 4× preview of sample looks.
import { generateParts } from './parts';
import { loadParts, png, readJson } from '../build/io';
import { compose } from '../../packages/shared/compositor';
import { Pixels, blit } from '../../packages/shared/pixels';
import type { Action, Facing, Look } from '../../packages/shared/schema';
const out = process.argv[2] ?? 'character-preview.png';
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
  L('adult-man', 'suit', 'none', 'blueprint', [
    'skin-5',
    'hair-black',
    'graphite',
    'madder-red',
    'white-linen',
    'sky',
  ]),
  L('adult-woman', 'long-dress', 'headwrap', 'tablet', [
    'skin-7',
    'hair-black',
    'plum',
    'mustard',
    'coral',
    'graphite',
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
  L('adult-woman', 'abaya', 'khimar', 'book', [
    'skin-3',
    'hair-black',
    'black-cloth',
    'saffron',
    'black-cloth',
    'madder-red',
  ]),
  L('child', 'hoodie-jeans', 'cap', 'laptop', [
    'skin-5',
    'hair-brown',
    'coral',
    'denim',
    'sky',
    'graphite',
  ]),
  L('adult-man', 'shirt-trousers', 'none', 'coffee', [
    'skin-8',
    'hair-black',
    'sky',
    'khaki',
    'white-linen',
    'madder-red',
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
  L('adult-man', 'boubou', 'kufi', 'phone', [
    'skin-8',
    'hair-black',
    'indigo',
    'saffron',
    'saffron',
    'graphite',
  ]),
  L('cat', 'none', 'none', 'none', [
    'skin-1',
    'hair-black',
    'saffron',
    'white-linen',
    'white-linen',
    'brass',
  ]),
  L('bird', 'none', 'none', 'none', [
    'skin-1',
    'hair-black',
    'graphite',
    'white-linen',
    'white-linen',
    'saffron',
  ]),
];
const rows: [Action, Facing, number][] = [
  ['idle', 'SE', 0],
  ['walk', 'SE', 1],
  ['walk', 'NE', 3],
  ['talk', 'SW', 1],
  ['wave', 'SE', 1],
  ['pour', 'SE', 3],
  ['sweep', 'SE', 0],
  ['carry', 'SE', 2],
  ['sit', 'SE', 0],
  ['write', 'SE', 1],
  ['read', 'SE', 3],
  ['teach', 'NE', 1],
  ['pray', 'NE', 0],
  ['pray', 'NE', 2],
  ['pray', 'NE', 4],
  ['pray', 'NE', 6],
  ['pray', 'SE', 2],
  ['pray', 'SE', 4],
];
const S = 3,
  cw = 48,
  ch = 72;
const sheet = new Pixels(rows.length * cw * S, looks.length * ch * S);
sheet.rect(0, 0, sheet.width, sheet.height, '#D7DCD2');
for (const [li, look] of looks.entries())
  for (const [ri, [a0, facing, i]] of rows.entries()) {
    let action = a0;
    if (look.base === 'cat')
      action = (['cat_idle', 'cat_walk', 'cat_sleep'] as Action[])[ri % 3];
    if (look.base === 'bird')
      action = (['bird_fly', 'bird_peck'] as Action[])[ri % 2];
    let img;
    try {
      img = compose(
        look,
        action,
        facing,
        i % (action.startsWith('cat') || action.startsWith('bird') ? 4 : 99),
        parts,
        palette,
      );
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
    if ((li + ri) % 2)
      sheet.rect(ri * cw * S, li * ch * S, cw * S, ch * S, '#E6E8E1');
    blit(sheet, big, ri * cw * S, li * ch * S);
  }
await png(out, sheet);
console.log('wrote', out);
