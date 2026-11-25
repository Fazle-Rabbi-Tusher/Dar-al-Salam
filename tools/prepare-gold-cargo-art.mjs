import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const source = 'art/sprites/source/gold-cargo';
await fs.mkdir(source, { recursive: true });
if (process.argv[2])
  await fs.copyFile(process.argv[2], source + '/materials.png');
const file = source + '/materials.png',
  meta = await sharp(file).metadata();
if (meta.width !== 1536 || meta.height !== 1024)
  throw Error('Expected the six square material swatches');
const names = ['elephant', 'wicker', 'brocade', 'wood', 'gold', 'rope'],
  maps = {};
for (const [i, name] of names.entries()) {
  const size = name === 'elephant' ? 48 : 32;
  const raw = await sharp(file)
    .extract({
      left: (i % 3) * 512,
      top: Math.floor(i / 3) * 512,
      width: 512,
      height: 512,
    })
    .resize(size, size, { kernel: 'nearest' })
    .removeAlpha()
    .raw()
    .toBuffer();
  maps[name] = {
    width: size,
    height: size,
    pixels: Array.from(
      { length: size * size },
      (_, p) => '#' + raw.subarray(p * 3, p * 3 + 3).toString('hex'),
    ),
  };
}
await fs.writeFile(
  'packages/shared/generated/gold-cargo-materials.json',
  JSON.stringify(maps) + '\n',
);
const bytes = await fs.readFile(file);
await fs.writeFile(
  source + '/inventory.json',
  JSON.stringify(
    {
      description:
        'Generated pixel-art material swatches based on the owner-selected elephant and gold-procession reference. Original preserved unchanged; samples texture actual 3D surfaces.',
      file: 'materials.png',
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      tiles: names,
    },
    null,
    2,
  ) + '\n',
);
console.log('Prepared six sampled cargo and elephant materials.');
