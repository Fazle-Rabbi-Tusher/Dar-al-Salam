import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/*
 * Mufti Ismail Menk's talk, from the owner's speech-scene pack (2026-11):
 * eight seated listeners (four men, four women, seen from behind), his
 * lectern with two microphones and two recording cameras on tripods.
 *
 * Menk keeps his current animation strips (owner: "match current version");
 * only his script changes, to the pack's rhythm on the 240-frame loop:
 * speaking, a pause, speaking, a pause, speaking. The props use the pack's
 * detailed 4× art (the same density as the characters), so they keep their
 * shading next to him.
 *
 *   node --import tsx tools/prepare-menk-speech.ts <extracted pack folder>
 */
const [pack] = process.argv.slice(2);
if (!pack) throw Error('Usage: prepare-menk-speech.ts <pack folder>');
const src = (p: string) => path.join(pack, p);

/**
 * Where Menk stands and his listeners sit: two rows of four, centred on him.
 * The pack's rows were wider; these keep clear of Omar Suleiman (9, 17.7)
 * and Habib Umar's study circle (19.1, 15.8) in the same hall.
 */
export const SPEAKER: [number, number] = [12.7, 10.4];
const SEATS: [number, number][] = [
  [10.0, 14.2],
  [11.9, 14.2],
  [13.8, 14.2],
  [15.7, 14.2],
  [10.0, 16.0],
  [11.9, 16.0],
  [13.8, 16.0],
  [15.7, 16.0],
];
/** Listener art per seat, mixed so men and women alternate (the pack's order). */
const VARIANTS = [0, 5, 2, 7, 4, 1, 6, 3];

// Listener strips: two seated poses each, seen from behind (NE; NW mirrors).
for (let v = 1; v <= 8; v++)
  fs.copyFileSync(
    src(`repo-overlay/art/sprites/anim/menk-speech-listener-${v}__sit_NE.png`),
    `art/sprites/anim/menk-speech-listener-${v}__sit_NE.png`,
  );

const listeners = VARIANTS.map((variant, i) => {
  const [x, y] = SEATS[i],
    woman = variant >= 4;
  // Face the speaker: NE looks along −y, NW along −x.
  const facing = SPEAKER[0] - x - (SPEAKER[1] - y) >= 0 ? 'NE' : 'NW';
  return {
    id: `menk-speech-listener-${variant + 1}`,
    kind: 'person',
    aliases: [],
    district: 'modern-quarter',
    depiction: 'back',
    role: 'A listener at Mufti Menk’s talk',
    look: {
      base: woman ? 'adult-woman' : 'adult-man-beard',
      garment: woman ? 'abaya' : 'jubba',
      headwear: woman ? 'hijab' : 'none',
      prop: 'none',
      colours: {
        skin: 'skin-3',
        hair: 'hair-black',
        garmentPrimary: woman ? 'indigo' : 'white-linen',
        garmentSecondary: 'white-linen',
        headwear: 'indigo',
        prop: 'cocoa',
      },
    },
    loop: 240,
    script: [{ from: 0, to: 240, action: 'sit', at: [x, y], facing }],
  };
});
fs.writeFileSync(
  'content/ambient/menk-speech.json',
  JSON.stringify(listeners, null, 2) + '\n',
);

// Menk: the pack's speaking rhythm, facing his listeners (SW).
const cardFile = 'content/characters/mufti-ismail-menk.json',
  card = JSON.parse(fs.readFileSync(cardFile, 'utf8'));
card.loop = 240;
card.script = [
  [0, 84, 'talk'],
  [84, 108, 'idle'],
  [108, 192, 'talk'],
  [192, 216, 'idle'],
  [216, 240, 'talk'],
].map(([from, to, action]) => ({
  from,
  to,
  action,
  at: SPEAKER,
  facing: 'SW',
}));
fs.writeFileSync(cardFile, JSON.stringify(card, null, 2) + '\n');

// Props: the lectern and the recording camera (four head poses).
const index = JSON.parse(fs.readFileSync('art/supplied/index.json', 'utf8'));
/** Bottom-centre of the opaque pixels: where the piece meets the floor. */
async function foot(file: string): Promise<[number, number]> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bottom = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 0) bottom = y;
  let sx = 0,
    n = 0;
  for (let y = bottom - 6; y <= bottom; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        sx += x;
        n++;
      }
  return [Math.round(sx / n), bottom];
}
const SOURCE =
  'Owner-supplied Mufti Menk speech-scene pack (2026-11), copied by tools/prepare-menk-speech.ts';
fs.copyFileSync(
  src('preview/art/menk-lectern.png'),
  'art/supplied/menk-lectern.png',
);
index['sup-menk-lectern'] = {
  file: 'supplied/menk-lectern.png',
  anchor: await foot('art/supplied/menk-lectern.png'),
  // A little smaller than the pack drew it, so its top meets his chest and
  // his gestures show above it.
  density: 4.8,
  source: SOURCE,
};
for (let i = 0; i < 4; i++)
  fs.copyFileSync(
    src(`preview/art/menk-camera-${i}.png`),
    `art/supplied/menk-camera-${i}.png`,
  );
index['sup-menk-camera'] = {
  file: 'supplied/menk-camera-0.png',
  frames: [0, 1, 2, 3].map((i) => `supplied/menk-camera-${i}.png`),
  // The camera head pans slowly: a pose every 30 ticks, 120 in all.
  period: 120,
  anchor: await foot('art/supplied/menk-camera-0.png'),
  density: 4,
  source: SOURCE,
};
fs.writeFileSync(
  'art/supplied/index.json',
  JSON.stringify(index, null, 2) + '\n',
);
console.log('Menk speech scene: 8 listeners, lectern, camera; script updated.');
