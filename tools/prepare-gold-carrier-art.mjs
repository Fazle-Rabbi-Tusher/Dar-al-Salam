import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const source = 'art/sprites/source/gold-carriers';
await fs.mkdir(source, { recursive: true });
if (process.argv[2])
  await fs.copyFile(process.argv[2], source + '/six-faces.png');
const file = source + '/six-faces.png';
const { width, height } = await sharp(file).metadata();
if (width !== 1536 || height !== 1024)
  throw Error('Expected the approved 3 by 2 face atlas');
// Authored crops of the six generated faces. Sampling only; no face painting.
const crops = [
  [145, 119, 234, 291],
  [666, 139, 218, 273],
  [1160, 144, 225, 269],
  [140, 647, 235, 266],
  [675, 636, 223, 285],
  [1160, 600, 236, 310],
];
const ids = [
  'overhead-gold-bearer',
  'bowl-gold-bearer',
  'chest-porter-rust',
  'chest-porter-indigo',
  'banner-attendant',
  'elder-recipient',
];
const faces = [];
const textileCrops = [
  [30, 438, 98, 65],
  [525, 442, 100, 65],
  [1035, 445, 110, 65],
  [15, 954, 100, 65],
  [527, 953, 100, 65],
  [1038, 953, 95, 65],
];
for (const [index, [left, top, width, height]] of crops.entries()) {
  const bytes = await sharp(file)
    .extract({ left, top, width, height })
    .resize(96, 120, { kernel: 'nearest' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const pixels = Array.from(
    { length: 96 * 120 },
    (_, n) => '#' + bytes.subarray(n * 3, n * 3 + 3).toString('hex'),
  );
  await fs.mkdir('web/public/models/gold-cargo/textures', { recursive: true });
  await sharp(file)
    .extract({ left, top, width, height })
    .resize(144, 180, { kernel: 'nearest' })
    .png()
    .toFile(
      'web/public/models/gold-cargo/textures/carrier-face-' + index + '.png',
    );
  const [cx, cy, cw, ch] = textileCrops[index];
  const fabric = await sharp(file)
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .resize(24, 24, { kernel: 'nearest' })
    .removeAlpha()
    .raw()
    .toBuffer();
  faces.push({
    id: ids[index],
    width: 96,
    height: 120,
    skin: pixels[48 * 96 + 24],
    pixels,
    cloth: {
      width: 24,
      height: 24,
      pixels: Array.from(
        { length: 576 },
        (_, n) => '#' + fabric.subarray(n * 3, n * 3 + 3).toString('hex'),
      ),
    },
  });
}
await fs.writeFile(
  'packages/shared/generated/gold-carrier-faces.json',
  JSON.stringify(faces) + '\n',
);
const bytes = await fs.readFile(file);
await fs.writeFile(
  source + '/inventory.json',
  JSON.stringify(
    {
      description:
        'Six anonymous West African supporting characters matching the owner-selected mounted gold procession. Generated reference art sampled onto volumetric 3D heads.',
      file: 'six-faces.png',
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      crops: crops.map((rect, index) => ({ id: ids[index], rect })),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Prepared six distinct generated facial maps for the gold carriers.',
);
