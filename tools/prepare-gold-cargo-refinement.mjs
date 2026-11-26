import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const root = 'art/sprites/source/gold-cargo';
const out = 'web/public/models/gold-cargo/textures';
await fs.mkdir(out, { recursive: true });
if (process.argv[2])
  await fs.copyFile(process.argv[2], root + '/refined-materials.png');
const source = root + '/refined-materials.png';
const names = [
  'elephant',
  'camel',
  'brocade',
  'linen',
  'wicker',
  'gold',
  'leather',
  'sand',
];
const maps = {};
for (const [i, name] of names.entries()) {
  const png = await sharp(source)
    .extract({
      left: (i % 4) * 384,
      top: Math.floor(i / 4) * 512,
      width: 384,
      height: 512,
    })
    .resize(256, 256, { kernel: 'nearest' })
    .removeAlpha()
    .png()
    .toBuffer();
  await fs.writeFile(`${out}/${name}.png`, png);
  const sample = await sharp(png)
    .resize(96, 96, { kernel: 'nearest' })
    .raw()
    .toBuffer();
  maps[name] = {
    width: 96,
    height: 96,
    pixels: Array.from(
      { length: 96 * 96 },
      (_, p) => '#' + sample.subarray(p * 3, p * 3 + 3).toString('hex'),
    ),
  };
  // Derive a tangent-space normal map as technical material preparation.
  // The unmodified generated artwork remains the source of all surface detail.
  const raw = await sharp(png).raw().toBuffer(),
    normal = Buffer.alloc(256 * 256 * 3);
  const gray = (x, y) => {
    const p = (((y + 256) % 256) * 256 + ((x + 256) % 256)) * 3;
    return (raw[p] + raw[p + 1] + raw[p + 2]) / 765;
  };
  const strength =
    name === 'gold'
      ? 1.3
      : name === 'brocade'
        ? 0.8
        : name === 'elephant'
          ? 0.6
          : 0.35;
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const nx = (gray(x - 1, y) - gray(x + 1, y)) * strength,
        ny = (gray(x, y + 1) - gray(x, y - 1)) * strength,
        d = Math.hypot(nx, ny, 1),
        p = (y * 256 + x) * 3;
      normal[p] = Math.round(127.5 * (1 + nx / d));
      normal[p + 1] = Math.round(127.5 * (1 + ny / d));
      normal[p + 2] = Math.round(127.5 * (1 + 1 / d));
    }
  await sharp(normal, { raw: { width: 256, height: 256, channels: 3 } })
    .png()
    .toFile(`${out}/${name}-normal.png`);
}
for (const [i, name] of ['wood', 'rope'].entries())
  await sharp(root + '/materials.png')
    .extract({ left: i ? 1024 : 0, top: 512, width: 512, height: 512 })
    .resize(256, 256, { kernel: 'nearest' })
    .png()
    .toFile(`${out}/${name}.png`);
await fs.writeFile(
  'packages/shared/generated/gold-cargo-refined.json',
  JSON.stringify(maps) + '\n',
);
const inventory = [];
for (const file of ['materials.png', 'refined-materials.png']) {
  const bytes = await fs.readFile(root + '/' + file);
  inventory.push({
    file,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
await fs.writeFile(
  root + '/refinement-inventory.json',
  JSON.stringify(
    {
      revision: 'natural-anatomy-and-woven-materials-v2',
      files: inventory,
      tiles: names,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Prepared eight fine albedo maps and derived surface normals; originals preserved.',
);
