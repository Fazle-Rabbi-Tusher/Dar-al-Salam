/** Import moving bodies separately from stations; preserve all character art. */
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { Pixels, blit } from '../../packages/shared/pixels';
import { png, readJson, writeJson } from '../build/io';
import type { ObjectArt } from '../placeholder/objects';
const [tramSheet, stationSheet, shipSheet] = process.argv.slice(2);
if (!tramSheet || !stationSheet || !shipSheet)
  throw Error(
    'Usage: import-life.ts <tram-sheet> <station-taxi-sheet> <ship-sheet>',
  );
const index: Record<string, ObjectArt> = await readJson(
  'art/landscape/index.json',
);
async function cut(
  sheet: string,
  col: number,
  row: number,
  cols: number,
  rows: number,
  name: string,
  height: number,
  canvas?: { width: number; height: number; foot: [number, number] },
) {
  const meta = await sharp(sheet).metadata();
  const width = Math.floor(meta.width! / cols),
    cellHeight = Math.floor(meta.height! / rows);
  const { data, info } = await sharp(sheet)
    .extract({
      left: col * width,
      top: row * cellHeight,
      width,
      height: cellHeight,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let k = 3; k < data.length; k += 4) data[k] = data[k] > 160 ? 255 : 0;
  const resized = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: '#00000000', threshold: 10 })
    .resize({ height, kernel: 'nearest' })
    .png()
    .toBuffer();
  const file = `landscape/${name}.png`;
  if (canvas) {
    const { data: rgba, info: size } = await sharp(resized)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const body = {
      width: size.width,
      height: size.height,
      data: new Uint8Array(rgba),
    };
    const target = new Pixels(canvas.width, canvas.height);
    blit(
      target,
      body,
      Math.floor(canvas.foot[0] - body.width / 2),
      canvas.foot[1] - body.height,
    );
    await png(`art/${file}`, target);
    return {
      file,
      width: canvas.width,
      height: canvas.height,
      anchor: canvas.foot,
    } satisfies ObjectArt;
  }
  await fs.writeFile(`art/${file}`, resized);
  const size = await sharp(resized).metadata();
  return {
    file,
    width: size.width!,
    height: size.height!,
    anchor: [Math.floor(size.width! / 2), size.height! - 4] as [number, number],
  } satisfies ObjectArt;
}
const tramCanvas = {
  width: 192,
  height: 160,
  foot: [96, 148] as [number, number],
};
const tramViews: Record<string, string> = {};
for (const [key, col, row] of [
  ['SW-closed', 0, 0],
  ['SW-open', 1, 0],
  ['NE-closed', 0, 1],
  ['NE-open', 1, 1],
] as const) {
  const art = await cut(
    tramSheet,
    col,
    row,
    2,
    2,
    `tram-${key}`,
    128,
    tramCanvas,
  );
  tramViews[key] = art.file;
}
index['land-tram'] = {
  file: tramViews['SW-closed'],
  width: 192,
  height: 160,
  anchor: [96, 148],
  life: { kind: 'tram', views: tramViews },
};
index['land-tram-platform'] = await cut(
  stationSheet,
  0,
  0,
  3,
  1,
  'tram-platform',
  210,
);
const taxiCanvas = {
  width: 96,
  height: 64,
  foot: [48, 60] as [number, number],
};
const taxiFront = await cut(
  stationSheet,
  1,
  0,
  3,
  1,
  'taxi-SW',
  38,
  taxiCanvas,
);
const taxiBack = await cut(stationSheet, 2, 0, 3, 1, 'taxi-NE', 38, taxiCanvas);
index['land-taxi'] = {
  ...taxiFront,
  life: { kind: 'taxi', views: { SW: taxiFront.file, NE: taxiBack.file } },
};
const shipCanvas = {
  width: 280,
  height: 256,
  foot: [140, 244] as [number, number],
};
const shipViews: Record<string, string> = {};
for (const [key, col, row] of [
  ['SW', 0, 0],
  ['SE', 1, 0],
  ['NW', 0, 1],
  ['NE', 1, 1],
] as const) {
  const art = await cut(
    shipSheet,
    col,
    row,
    2,
    2,
    `sailship-${key}`,
    214,
    shipCanvas,
  );
  shipViews[key] = art.file;
}
index['land-sailship'] = {
  file: shipViews.SW,
  width: 280,
  height: 256,
  anchor: [140, 244],
  life: { kind: 'ship', views: shipViews },
};
await writeJson('art/landscape/index.json', index);
console.log(
  'Imported tram doors/directions, empty fixed platform, taxi and four sailing directions.',
);
