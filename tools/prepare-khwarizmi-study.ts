import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/*
 * Al-Khwārizmī's study routine, from the owner's study-animation pack
 * (2026-11). The pack's figure has many drawn poses: eight each for reading,
 * writing and teaching, six for walking and four for idle, seen from the
 * front (SE) and behind (NE). It becomes his sprite, strips and full-figure
 * card picture.
 *
 * The pack was made for the old library workstation. In the maths lab he
 * moves between the pieces already there, plus one: the pack's antique
 * writing desk, beside his reading spot. The pack's armillary, geometry stand
 * and bookcase are left out (owner's rule: only mathematical equipment, none
 * twice; the astrolabe and globe were removed at the owner's request).
 *
 *   node --import tsx tools/prepare-khwarizmi-study.ts <extracted pack folder>
 */
const [pack] = process.argv.slice(2);
if (!pack) throw Error('Usage: prepare-khwarizmi-study.ts <pack folder>');
const src = (p: string) => path.join(pack, p);

// Strips: every drawn pose, both views (SW and NW mirror them).
const ACTIONS = ['idle', 'read', 'write', 'teach', 'walk'];
for (const a of ACTIONS)
  for (const v of ['SE', 'NE'])
    fs.copyFileSync(
      src(`repo-overlay/art/sprites/anim/al-khwarizmi__${a}_${v}.png`),
      `art/sprites/anim/al-khwarizmi__${a}_${v}.png`,
    );
// The old pointing strips are no longer scripted.
for (const v of ['SE', 'NE'])
  fs.rmSync(`art/sprites/anim/al-khwarizmi__talk_${v}.png`, { force: true });
for (const f of ['al-khwarizmi.png', 'al-khwarizmi-back.png'])
  fs.copyFileSync(src(`repo-overlay/art/sprites/${f}`), `art/sprites/${f}`);

// Card picture: the pack's full-figure portrait of the same figure, its
// empty margins trimmed so he fills the card's frame.
const portrait = await sharp(
  src('repo-overlay/art/illustrations/al-khwarizmi.png'),
)
  .trim({ threshold: 0 })
  .png()
  .toBuffer();
await sharp(portrait)
  .resize({ height: 480, kernel: 'lanczos3' })
  .extend({
    top: 14,
    bottom: 10,
    left: 18,
    right: 18,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile('art/illustrations/al-khwarizmi.png');

// The writing desk: the pack's detailed 4× art, seen from its closed front,
// so he stands behind it facing us while he writes.
fs.copyFileSync(
  src('preview/art/desk-back.png'),
  'art/supplied/khwarizmi-desk.png',
);
const { data, info } = await sharp('art/supplied/khwarizmi-desk.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let bottom = 0;
for (let y = 0; y < info.height; y++)
  for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 0) bottom = y;
let sx = 0,
  n = 0;
for (let y = bottom - 30; y <= bottom; y++)
  for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 0) {
      sx += x;
      n++;
    }
const index = JSON.parse(fs.readFileSync('art/supplied/index.json', 'utf8'));
index['sup-khwarizmi-desk'] = {
  file: 'supplied/khwarizmi-desk.png',
  anchor: [Math.round(sx / n), bottom],
  density: 4,
  source:
    'Owner-supplied Al-Khwārizmī study-animation pack (2026-11), copied by tools/prepare-khwarizmi-study.ts',
};
fs.writeFileSync(
  'art/supplied/index.json',
  JSON.stringify(index, null, 2) + '\n',
);

/*
 * His routine in the lab (240 ticks, 20 seconds):
 *   read by the board → walk to the desk → write → walk along the corridor
 *   → work the stepped reckoner → think → walk back.
 * Walks ease in and out (smoothstep) and keep to free floor.
 */
type P = [number, number];
const BOARD: P = [8.3, 44.0], // reading, by the board partition
  DESK: P = [8.4, 45.3], // behind the writing desk (8.3, 46.6)
  CORNER: P = [8.6, 44.4],
  RECKONER: P = [12.2, 44.4]; // before the stepped reckoner (11.8, 45.6)
const cardFile = 'content/characters/al-khwarizmi.json',
  card = JSON.parse(fs.readFileSync(cardFile, 'utf8'));
card.loop = 240;
card.script = [
  { from: 0, to: 48, action: 'read', at: BOARD, facing: 'SE' },
  {
    from: 48,
    to: 64,
    action: 'walk',
    path: [BOARD, DESK],
    easing: 'smoothstep',
  },
  { from: 64, to: 112, action: 'write', at: DESK, facing: 'SW' },
  {
    from: 112,
    to: 144,
    action: 'walk',
    path: [DESK, CORNER, RECKONER],
    easing: 'smoothstep',
  },
  { from: 144, to: 192, action: 'teach', at: RECKONER, facing: 'SW' },
  { from: 192, to: 208, action: 'idle', at: RECKONER, facing: 'SE' },
  {
    from: 208,
    to: 240,
    action: 'walk',
    path: [RECKONER, BOARD],
    easing: 'smoothstep',
  },
];
// Colours of the pack's figure (they drive his sharp head and fallbacks).
card.look.colours.garmentPrimary = 'cocoa';
card.look.colours.garmentSecondary = 'brass';
card.look.colours.hair = 'hair-grey';
fs.writeFileSync(cardFile, JSON.stringify(card, null, 2) + '\n');
console.log('Al-Khwārizmī study routine installed.');
