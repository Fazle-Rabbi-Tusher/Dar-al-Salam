import fs from 'node:fs/promises';
import sharp from 'sharp';

// Technical import only: alpha cleanup, uniform scale, foot registration and
// horizontal packing. The generated sources retain every drawn face and limb.
const sources = [
  ['hashim-amla-bat', 'exec-7e6af23d-96bb-4cea-9a0e-321b0fa19346.png', 2],
  ['tamim-iqbal-bat', 'exec-6d416603-992d-481e-95b4-0618b9eefc06.png', 2],
  ['mashrafe-mortaza-bowl', 'exec-1e22fe30-65e2-42e5-ba7b-210d5ae87403.png', 2],
  ['usman-khawaja-catch', 'exec-2ec07a9c-2aba-4297-9a02-777ecfc166f5.png', 2],
  [
    'hakeem-olajuwon-actions',
    'exec-483bda6d-a045-4b40-945c-626beb277c72.png',
    4,
  ],
  ['cricket-running', 'exec-182b78b6-859f-4484-9a82-aac19daed486.png', 4],
  [
    'hakeem-olajuwon-dribble',
    'exec-1fef9a08-d51e-4c80-a7fa-f106d0c37c1b.png',
    2,
  ],
];
const sourceDir = 'art/sprites/source/sports';
await fs.mkdir(sourceDir, { recursive: true });
await fs.mkdir('art/sprites/anim', { recursive: true });
const inventory = [];
for (const [name, file, rows] of sources) {
  const local = `${sourceDir}/${name}.png`;
  try {
    await fs.access(local);
  } catch {
    await fs.copyFile(`/workspace/generated_images/${file}`, local);
  }
  const { data, info } = await sharp(local)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cells = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < 6; col++) {
      const left = Math.round((col * info.width) / 6),
        right = Math.round(((col + 1) * info.width) / 6),
        top = Math.round((row * info.height) / rows),
        bottom = Math.round(((row + 1) * info.height) / rows);
      const w = right - left,
        h = bottom - top,
        raw = Buffer.alloc(w * h * 4);
      let x0 = w,
        y0 = h,
        x1 = 0,
        y1 = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const a = ((top + y) * info.width + left + x) * 4,
            b = (y * w + x) * 4;
          if (data[a + 3] < 170) continue;
          raw.set(data.subarray(a, a + 3), b);
          raw[b + 3] = 255;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x + 1);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y + 1);
        }
      if (x1 <= x0 || y1 <= y0)
        throw Error(`Empty sports cell ${name} ${row}/${col}`);
      cells.push({ raw, w, h, x0, y0, x1, y1, row, col });
    }
  for (let row = 0; row < rows; row++) {
    let id, action, side;
    if (name === 'hakeem-olajuwon-actions') {
      id = 'hakeem-olajuwon';
      action = row < 2 ? 'shoot' : 'dunk';
      side = row % 2 === 0 ? 'SE' : 'NE';
    } else if (name === 'cricket-running') {
      id = row < 2 ? 'hashim-amla' : 'tamim-iqbal';
      action = 'walk';
      side = row % 2 === 0 ? 'SE' : 'NE';
    } else {
      const match = name.match(/^(.*)-(bat|bowl|catch|dribble)$/);
      id = match[1];
      action = match[2];
      side = row === 0 ? 'SE' : 'NE';
    }
    const selected = cells.filter((c) => c.row === row);
    const first = selected[0];
    // One scale per complete action. The first pose supplies the standing
    // reference; all later raised arms and lunges retain that same anatomy.
    let scale =
      (name === 'cricket-running'
        ? 237
        : name === 'hakeem-olajuwon-actions'
          ? 260
          : 264) /
      (first.y1 - first.y0);
    scale = Math.min(
      scale,
      ...selected.map((c) =>
        Math.min(300 / (c.y1 - c.y0), 216 / (c.x1 - c.x0)),
      ),
    );
    const images = [];
    for (const cell of selected) {
      const input = await sharp(cell.raw, {
        raw: { width: cell.w, height: cell.h, channels: 4 },
      })
        .extract({
          left: cell.x0,
          top: cell.y0,
          width: cell.x1 - cell.x0,
          height: cell.y1 - cell.y0,
        })
        .resize({
          width: Math.max(1, Math.round((cell.x1 - cell.x0) * scale)),
          kernel: 'nearest',
        })
        .png()
        .toBuffer();
      const meta = await sharp(input).metadata();
      // Use lower legs/shoes, never the bat or an extended arm, to register X.
      let sum = 0,
        count = 0;
      for (let y = Math.max(cell.y0, cell.y1 - 38); y < cell.y1; y++)
        for (let x = cell.x0; x < cell.x1; x++)
          if (cell.raw[(y * cell.w + x) * 4 + 3]) {
            sum += x;
            count++;
          }
      const foot = (count ? sum / count : (cell.x0 + cell.x1) / 2) - cell.x0;
      let img = sharp(input),
        ax = foot * scale;
      // Hakeem's generated front source looks screen-left; normalize SE.
      if (name === 'hakeem-olajuwon-actions' && side === 'SE') {
        img = img.flop();
        ax = meta.width - ax;
      }
      const x = Math.max(0, Math.min(224 - meta.width, Math.round(112 - ax)));
      const frame = await sharp({
        create: {
          width: 224,
          height: 336,
          channels: 4,
          background: '#00000000',
        },
      })
        .composite([
          { input: await img.toBuffer(), left: x, top: 320 - meta.height },
        ])
        .png()
        .toBuffer();
      images.push({ input: frame, left: cell.col * 224, top: 0 });
    }
    const base = `art/sprites/anim/${id}__${action}_${side}`;
    await sharp({
      create: {
        width: 224 * 6,
        height: 336,
        channels: 4,
        background: '#00000000',
      },
    })
      .composite(images)
      .png()
      .toFile(base + '.png');
    await fs.writeFile(
      base + '.json',
      JSON.stringify(
        {
          frame: [224, 336],
          foot: [112, 320],
          density: id === 'hakeem-olajuwon' ? 5.5 : 5,
          sequence: [0, 1, 2, 3, 4, 5],
          source: `../source/sports/${name}.png`,
        },
        null,
        2,
      ) + '\n',
    );
    inventory.push({ id, action, side, frames: 6, scale });
  }
}
await fs.writeFile(
  sourceDir + '/inventory.json',
  JSON.stringify(
    {
      style: 'Dar al-Salam approved isometric pixel art',
      originalAnimations:
        'Existing idle, cheer and celebration PNGs are preserved unchanged.',
      sources: sources.map(([name, , rows]) => ({
        file: name + '.png',
        rows,
        columns: 6,
      })),
      strips: inventory,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Prepared ${inventory.length} front/rear strips, ${inventory.length * 6} drawn frames. Originals preserved.`,
);
