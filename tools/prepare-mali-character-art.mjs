import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = 'art/sprites/source/mali-caravan';
await fs.mkdir(root + '/source', { recursive: true });
for (const [i, name] of [
  'mansa-turnaround.png',
  'six-generated-faces.png',
].entries()) {
  const input = process.argv[i + 2];
  if (input) await fs.copyFile(input, root + '/source/' + name);
  else await fs.access(root + '/source/' + name);
}
const input = root + '/source/six-generated-faces.png',
  meta = await sharp(input).metadata();
const faces = [];
for (let n = 0; n < 6; n++) {
  const cw = meta.width / 3,
    ch = meta.height / 2,
    // Fixed, documented head crops; no face is drawn or replaced in code.
    left = Math.round((n % 3) * cw + cw * 0.18),
    top = Math.round(Math.floor(n / 3) * ch + ch * 0.035),
    width = Math.round(cw * 0.66),
    height = Math.round(ch * 0.91),
    { data } = await sharp(input)
      .extract({ left, top, width, height })
      .resize(32, 40, { kernel: 'nearest' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  const pixels = [];
  for (let p = 0; p < 32 * 40; p++)
    pixels.push('#' + data.subarray(p * 3, p * 3 + 3).toString('hex'));
  faces.push({
    id: [
      'mansa',
      'young-guard',
      'mature-guard',
      'steward',
      'elder-recipient',
      'woman-recipient',
    ][n],
    width: 32,
    height: 40,
    skin: pixels[19 * 32 + 10],
    pixels,
  });
}
await fs.mkdir('packages/shared/generated', { recursive: true });
await fs.writeFile(
  'packages/shared/generated/mali-faces.json',
  JSON.stringify(faces) + '\n',
);
const body = await sharp(root + '/source/mansa-turnaround.png').metadata(),
  fourth = await sharp(root + '/source/mansa-turnaround.png')
    .extract({
      left: Math.round(body.width * 0.75),
      top: 0,
      width: body.width - Math.round(body.width * 0.75),
      height: body.height,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
const cloth = {};
for (const [name, x, y, w, h] of [
  ['gold', 0.46, 0.5, 0.18, 0.38],
  ['crimson', 2.37, 0.38, 0.28, 0.46],
]) {
  const bytes = await sharp(root + '/source/mansa-turnaround.png')
    .extract({
      left: Math.round((body.width / 4) * x),
      top: Math.round(body.height * y),
      width: Math.round((body.width / 4) * w),
      height: Math.round(body.height * h),
    })
    .resize(32, 64, { kernel: 'nearest' })
    .removeAlpha()
    .raw()
    .toBuffer();
  cloth[name] = {
    width: 32,
    height: 64,
    pixels: Array.from(
      { length: 32 * 64 },
      (_, i) => '#' + bytes.subarray(i * 3, i * 3 + 3).toString('hex'),
    ),
  };
}
await fs.writeFile(
  'packages/shared/generated/mali-cloth.json',
  JSON.stringify(cloth) + '\n',
);
for (let i = 0; i < fourth.data.length; i += 4)
  if (
    fourth.data[i] > 242 &&
    fourth.data[i + 1] > 242 &&
    fourth.data[i + 2] > 242
  )
    fourth.data.fill(0, i, i + 4);
const png = await sharp(fourth.data, { raw: fourth.info }).png().toBuffer();
await sharp(png)
  .trim({ threshold: 0 })
  .resize({ height: 480, kernel: 'nearest' })
  .extend({ top: 12, bottom: 12, left: 18, right: 18, background: '#0000' })
  .png()
  .toFile('art/illustrations/mansa-musa.png');
await sharp(png)
  .trim({ threshold: 0 })
  .resize({ height: 300, kernel: 'nearest' })
  .png()
  .toFile('art/sprites/mansa-musa.png');
const records = [];
for (const name of ['mansa-turnaround.png', 'six-generated-faces.png']) {
  const bytes = await fs.readFile(root + '/source/' + name);
  records.push({
    path: name,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
await fs.writeFile(
  root + '/source/inventory.json',
  JSON.stringify(
    {
      description:
        'Image-generated original designs based on the owner-provided Mansa Musa illustrations and saved Dar al-Salam style. Face grids sample this artwork onto curved 3D head surfaces.',
      files: records,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Prepared six generated facial color grids, canonical turnaround and draft portrait.',
);
