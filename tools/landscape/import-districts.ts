/** Import the referenced city, tram, blossom, coastal and village props only. */
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { readJson, writeJson } from '../build/io';
import type { ObjectArt } from '../placeholder/objects';
const source = process.argv[2];
if (!source)
  throw Error(
    'Usage: node --import tsx tools/landscape/import-districts.ts <1536x1024-sheet.png>',
  );
const specs = [
  ['city-skyline', 0, 0, 320],
  ['tram', 1, 0, 210],
  ['blossom-block', 2, 0, 164],
  ['sailship', 0, 1, 214],
  ['coastal-cliff', 1, 1, 166],
  ['cottage', 2, 1, 124],
] as const;
const index: Record<string, ObjectArt> = await readJson(
  'art/landscape/index.json',
);
for (const [id, col, row, worldHeight] of specs) {
  // The animation importer owns detached vehicle bodies and directional poses.
  if (index[`land-${id}`]?.life) continue;
  const { data, info } = await sharp(source)
    .extract({ left: col * 512, top: row * 512, width: 512, height: 512 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 160 ? 255 : 0;
  const { data: png, info: size } = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: '#00000000', threshold: 10 })
    .resize({ height: worldHeight, kernel: 'nearest' })
    .png()
    .toBuffer({ resolveWithObject: true });
  const file = `landscape/${id}.png`;
  await fs.writeFile(`art/${file}`, png);
  index[`land-${id}`] = {
    file,
    width: size.width,
    height: size.height,
    anchor: [
      Math.floor(size.width / 2),
      size.height - Math.max(3, Math.round(size.height * 0.045)),
    ],
  };
}
await writeJson('art/landscape/index.json', index);
console.log(
  'Imported six district scenery props; original character assets preserved.',
);
