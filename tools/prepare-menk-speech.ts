import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/*
 * Mufti Ismail Menk's talk, from the owner's speech-scene pack (2026-11):
 * his lectern with two microphones and two recording cameras on tripods.
 * The pack's eight seated listeners were removed with every anonymous
 * person (owner's request, 2026-11); only Menk speaks in the hall.
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

/** Where Menk stands, clear of the other figures in the same hall. */
export const SPEAKER: [number, number] = [12.7, 10.4];
// Menk: the pack's speaking rhythm, facing the hall (SW).
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
console.log('Menk speech scene: lectern, camera; script updated.');
