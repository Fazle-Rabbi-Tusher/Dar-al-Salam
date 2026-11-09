/** Import the six isolated landscape props from the generated reference sheet.
 * Source art is retained outside the checkout; builds use the committed PNGs.
 * This command only touches art/landscape, never characters or source content.
 */
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { readJson, writeJson } from '../build/io';
import type { ObjectArt } from '../placeholder/objects';

const source = process.argv[2];
if (!source)
  throw Error(
    'Usage: node --import tsx tools/landscape/import.ts <1536x1024-sheet.png>',
  );
const forest = process.argv.includes('--forest');
const specs = forest
  ? ([
      ['oak', 0, 0, 512, 512, 188],
      ['pine', 512, 0, 512, 512, 204],
      ['snag', 1024, 0, 512, 512, 182],
      ['waterfall', 0, 512, 512, 512, 248],
      ['garden', 512, 512, 512, 512, 42],
      ['forest-stand', 1024, 512, 512, 512, 204],
    ] as const)
  : ([
      ['oak', 0, 0, 544, 500, 148],
      ['pine', 550, 0, 450, 500, 172],
      ['cherry', 1010, 0, 526, 500, 136],
      ['waterfall', 0, 520, 512, 504, 216],
      ['cottage', 520, 520, 494, 504, 136],
      ['garden', 1020, 560, 516, 464, 42],
    ] as const);
await fs.mkdir('art/landscape', { recursive: true });
const index: Record<string, ObjectArt> = await readJson(
  'art/landscape/index.json',
).catch(() => ({}));
for (const [id, left, top, width, height, worldHeight] of specs) {
  const { data, info } = await sharp(source)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Strip residual near-transparent matte; the game uses crisp pixel silhouettes.
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
      size.height - Math.max(3, Math.round(size.height * 0.055)),
    ],
  };
  if (id === 'waterfall') {
    const base = await sharp(png).ensureAlpha().raw().toBuffer();
    const frames: string[] = [];
    for (let phase = 0; phase < 4; phase++) {
      const pixels = Buffer.from(base);
      for (let y = 0; y < size.height; y++)
        for (let x = 0; x < size.width; x++) {
          const k = (y * size.width + x) * 4;
          const [r, g, b, a] = pixels.subarray(k, k + 4);
          // Only water highlights move; the cliff and vegetation stay still.
          if (a && b > r * 1.2 && g > r * 1.2 && b > 110) {
            const light =
              (y + phase * 3 + Math.floor(x / 5)) % 13 < 3 ? 18 : -5;
            for (let c = 0; c < 3; c++)
              pixels[k + c] = Math.max(0, Math.min(255, pixels[k + c] + light));
          }
        }
      const frame = `landscape/waterfall-${phase}.png`;
      await sharp(pixels, {
        raw: { width: size.width, height: size.height, channels: 4 },
      })
        .png()
        .toFile(`art/${frame}`);
      frames.push(frame);
    }
    index['land-waterfall'].frames = frames;
    index['land-waterfall'].period = 12;
  }
}
// Park trees stay close to the original silhouette size, so a new canopy
// cannot cover the people or their activities. Ancient wild trees stay tall.
for (const [id, height] of [
  ['oak', 104],
  ['pine', 124],
  ['cherry', 100],
] as const) {
  const file = `landscape/${id}-young.png`;
  const info = await sharp(`art/landscape/${id}.png`)
    .resize({ height, kernel: 'nearest' })
    .png()
    .toFile(`art/${file}`);
  index[`land-${id}-young`] = {
    file,
    width: info.width,
    height,
    anchor: [Math.floor(info.width / 2), height - Math.round(height * 0.055)],
  };
}
await writeJson('art/landscape/index.json', index);
console.log('Imported six landscape props; all character art preserved.');
