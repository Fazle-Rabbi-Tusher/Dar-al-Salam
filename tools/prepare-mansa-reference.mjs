import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
const visiblePixels = (data) => {
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] === 0) data.fill(0, i, i + 3);
  return data;
};

// Technical crops of generated, owner-directed reference art, not painted faces.
const root = 'art/sprites/source/mali-caravan/reference-pixel-v3';
const out = 'web/public/models/mali-caravan/textures';
await fs.mkdir(out, { recursive: true });
for (const [i, name] of [
  'character-reference.png',
  'material-atlas.png',
].entries())
  if (process.argv[i + 2])
    await fs.copyFile(process.argv[i + 2], `${root}/${name}`);
const reference = `${root}/pixel-face.png`;
await sharp(reference)
  .extract({ left: 370, top: 265, width: 565, height: 790 })
  .resize(192, 288, { kernel: 'nearest' })
  .png()
  .toFile(`${out}/face.png`);
const atlas = `${root}/material-atlas.png`;
const meta = await sharp(atlas).metadata();
for (const [i, name] of ['linen', 'brocade', 'velvet', 'gold'].entries())
  await sharp(atlas)
    .extract({
      left: Math.floor(((i % 2) * meta.width) / 2) + 2,
      top: Math.floor((Math.floor(i / 2) * meta.height) / 2) + 2,
      width: Math.floor(meta.width / 2) - 4,
      height: Math.floor(meta.height / 2) - 4,
    })
    .resize(128, 128, { kernel: 'nearest' })
    .png()
    .toFile(`${out}/${name}.png`);
const samples = {};
for (const name of ['face', 'linen', 'brocade', 'velvet', 'gold']) {
  const width = name === 'face' ? 128 : 64;
  const height = name === 'face' ? 192 : 64;
  const data = await sharp(`${out}/${name}.png`)
    .resize(width, height, { kernel: 'nearest' })
    .removeAlpha()
    .raw()
    .toBuffer();
  samples[name] = {
    width,
    height,
    pixels: Array.from(
      { length: width * height },
      (_, i) => '#' + data.subarray(i * 3, i * 3 + 3).toString('hex'),
    ),
  };
}
await fs.writeFile(
  'packages/shared/generated/mansa-reference.json',
  JSON.stringify(samples) + '\n',
);
await fs.copyFile(
  `${root}/pixel-turnaround.png`,
  'web/public/models/mali-caravan/character-study.png',
);
await fs.mkdir('web/public/models/mali-caravan/angles', { recursive: true });
const angleRecords = [];
for (const [i, angle] of [
  'front',
  'front-left',
  'left',
  'rear-left',
  'rear',
  'rear-right',
  'right',
  'front-right',
].entries()) {
  const rect = {
    left: (i % 4) * 384,
    top: Math.floor(i / 4) * 512,
    width: 384,
    height: 512,
  };
  const crop = sharp(`${root}/pixel-turnaround.png`).extract(rect);
  const file = `mansa-musa-${angle}.webp`,
    target = `web/public/models/mali-caravan/angles/${file}`;
  await crop.clone().webp({ lossless: true }).toFile(target);
  const sourcePixels = await crop.clone().ensureAlpha().raw().toBuffer();
  const decoded = await sharp(target).ensureAlpha().raw().toBuffer();
  if (!visiblePixels(sourcePixels).equals(visiblePixels(decoded)))
    throw Error('Angle pixels changed: ' + angle);
  angleRecords.push({
    angle,
    file,
    width: 384,
    height: 512,
    decodedPixelsSha256: createHash('sha256').update(decoded).digest('hex'),
  });
}
await fs.writeFile(
  'web/public/models/mali-caravan/angles/manifest.json',
  JSON.stringify(
    {
      source: 'character-study.png',
      format: 'lossless WebP',
      pixelHashMode: 'RGBA with invisible RGB zeroed at alpha=0',
      views: angleRecords,
    },
    null,
    2,
  ) + '\n',
);
const files = [];
for (const name of [
  'character-reference.png',
  'material-atlas.png',
  'pixel-face.png',
  'pixel-turnaround.png',
  'character-study.png',
]) {
  const bytes = await fs.readFile(`${root}/${name}`);
  files.push({
    file: name,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
await fs.writeFile(
  `${root}/inventory.json`,
  JSON.stringify(
    {
      direction:
        'Latest owner correction, 25 November 2026: retain the selected white/red/gold Mansa Musa design, with very realistic detailed PIXEL 3D ART, natural anatomy and consistent front, rear, side and three-quarter views. No pointed crown. The image is an artistic likeness, not a historical photograph.',
      faceCrop: { left: 370, top: 265, width: 565, height: 790 },
      files,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Prepared pixel-art facial and textile PNG maps with nearest-neighbor samples.',
);
