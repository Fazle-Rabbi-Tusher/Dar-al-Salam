import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const source = 'art/sprites/source/gold-procession-animation';
const output = 'web/public/scenes/mansa-gold-procession';
await fs.mkdir(source, { recursive: true });
await fs.mkdir(output, { recursive: true });
for (const [i, name] of [
  'horse-and-rider-12.png',
  'background.png',
].entries()) {
  if (process.argv[i + 2])
    await fs.copyFile(process.argv[i + 2], path.join(source, name));
  await fs.access(path.join(source, name));
}
const sheet = await sharp(source + '/horse-and-rider-12.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (sheet.info.width !== 1024 || sheet.info.height !== 1536)
  throw Error('Expected a 4 by 3 sheet of 256 by 512 cells');
// The generated background has a translucent pale matte. Use its supplied
// alpha to remove that matte; retain every RGB sample of the drawn subject,
// including its ivory scarf, gold embroidery, face and dark horse.
for (let i = 0; i < sheet.data.length; i += 4) {
  const cellY = Math.floor(i / 4 / sheet.info.width) % 512;
  const [r, g, b] = sheet.data.subarray(i, i + 3);
  const legMatte =
    cellY > 325 &&
    r > 225 &&
    g > 220 &&
    b > 210 &&
    Math.max(r, g, b) - Math.min(r, g, b) < 30;
  sheet.data[i + 3] = sheet.data[i + 3] < 224 || legMatte ? 0 : 255;
}
const frames = [];
for (let index = 0; index < 12; index++) {
  const x = (index % 4) * 256,
    y = Math.floor(index / 4) * 512;
  let left = 256,
    right = 0,
    top = 512,
    bottom = 0,
    sumX = 0,
    countX = 0,
    opaque = 0;
  for (let yy = 0; yy < 512; yy++)
    for (let xx = 0; xx < 256; xx++) {
      const p = ((y + yy) * 1024 + x + xx) * 4;
      if (sheet.data[p + 3] < 240) continue;
      opaque++;
      left = Math.min(left, xx);
      right = Math.max(right, xx);
      top = Math.min(top, yy);
      bottom = Math.max(bottom, yy);
      // Register the head horizontally and the planted hoof vertically. A
      // swinging leg or moving cloak cannot shift the whole actor's anchor.
      if (xx >= 90 && xx <= 185 && yy >= 10 && yy < 72) {
        sumX += xx;
        countX++;
      }
    }
  if (opaque < 10000 || countX < 100)
    throw Error('Empty or incorrectly registered animation cel ' + index);
  frames.push({
    index,
    x,
    y,
    width: 256,
    height: 512,
    anchorX: sumX / countX,
    baseline: bottom,
    bounds: { left, right, top, bottom },
    opaquePixels: opaque,
  });
}
await sharp(sheet.data, { raw: sheet.info })
  .webp({ lossless: true })
  .toFile(output + '/rider.webp');
await sharp(source + '/background.png')
  .webp({ lossless: true })
  .toFile(output + '/background.webp');
const files = [];
for (const file of ['horse-and-rider-12.png', 'background.png']) {
  const bytes = await fs.readFile(source + '/' + file);
  files.push({
    file,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
await fs.writeFile(
  source + '/inventory.json',
  JSON.stringify(
    {
      description:
        'Generated background and twelve authored walking poses based on the owner-selected crowned Mansa Musa gold-procession illustration. Prepared as a layered pixel-art animation, not a new GLB model.',
      alphaImport:
        'Remove the translucent background matte below alpha 224 and bright neutral matte pixels in the lower leg gaps; subject RGB and source PNG are retained.',
      files,
    },
    null,
    2,
  ) + '\n',
);
await fs.writeFile(
  output + '/manifest.json',
  JSON.stringify(
    {
      title: 'Mansa Musa — the gold procession',
      format: 'Layered pixel-art animation',
      ticksPerSecond: 12,
      loopTicks: 240,
      duration: 20,
      poseCount: 12,
      columns: 4,
      rows: 3,
      sheet: { width: 1024, height: 1536 },
      frames,
      assets: { background: 'background.webp', rider: 'rider.webp' },
      review:
        'Illustrative reconstruction; existing character approval remains a draft.',
    },
    null,
    2,
  ) + '\n',
);
console.log('Prepared and registered all twelve authored rider/horse poses.');
