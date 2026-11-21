import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { supportingCharacters } from '../packages/shared/supporting-cast.ts';

// Technical import: keep generated originals; discover actual transparent row
// gaps, clean alpha, scale uniformly, register soles and retain all six poses.
const cast = supportingCharacters(),
  models = [...new Set(cast.map((c) => c.strip))],
  inventory = [];
for (const model of models) {
  const name = model.replace(/^support-/, ''),
    source = `art/sprites/source/supporting-cast/${name}.png`,
    sourceBytes = await fs.readFile(source),
    { data, info } = await sharp(sourceBytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    rows = [[], []];
  for (let col = 0; col < 6; col++) {
    const left = Math.round((col * info.width) / 6),
      right = Math.round(((col + 1) * info.width) / 6),
      runs = [];
    let start = -1;
    for (let y = 0; y <= info.height; y++) {
      let n = 0;
      if (y < info.height)
        for (let x = left; x < right; x++)
          if (data[(y * info.width + x) * 4 + 3] >= 170) n++;
      if (n >= 3 && start < 0) start = y;
      if (n < 3 && start >= 0) {
        runs.push([start, y]);
        start = -1;
      }
    }
    const merged = [];
    for (const run of runs) {
      const prior = merged.at(-1);
      if (prior && run[0] - prior[1] <= 3) prior[1] = run[1];
      else merged.push(run);
    }
    const bodies = merged.filter(([a, b]) => b - a > 150);
    if (bodies.length !== 2)
      throw Error(
        `${name} column ${col}: expected two complete body rows, found ${bodies.length}`,
      );
    for (let row = 0; row < 2; row++) {
      const [top, bottom] = bodies[row],
        w = right - left,
        h = bottom - top,
        raw = Buffer.alloc(w * h * 4);
      let x0 = w,
        x1 = 0,
        y0 = h,
        y1 = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const p = ((top + y) * info.width + left + x) * 4,
            q = (y * w + x) * 4;
          if (data[p + 3] < 170) continue;
          raw.set(data.subarray(p, p + 3), q);
          raw[q + 3] = 255;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x + 1);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y + 1);
        }
      if (x1 <= x0) throw Error(`Empty ${name}/${row}/${col}`);
      rows[row].push({
        raw,
        w,
        h,
        x0,
        x1,
        y0,
        y1,
        sourceBounds: [left + x0, top + y0, left + x1, top + y1],
      });
    }
  }
  const height = name.startsWith('school-') ? 184 : 264,
    scale = Math.min(
      height / (rows[0][0].y1 - rows[0][0].y0),
      ...rows
        .flat()
        .map((c) => Math.min(294 / (c.y1 - c.y0), 208 / (c.x1 - c.x0))),
    );
  const actions = new Set(
    cast
      .filter((c) => c.strip === model)
      .flatMap((c) => c.script.map((s) => s.action)),
  );
  for (let row = 0; row < 2; row++) {
    const cells = [];
    for (const c of rows[row]) {
      const png = await sharp(c.raw, {
          raw: { width: c.w, height: c.h, channels: 4 },
        })
          .extract({
            left: c.x0,
            top: c.y0,
            width: c.x1 - c.x0,
            height: c.y1 - c.y0,
          })
          .resize({
            width: Math.round((c.x1 - c.x0) * scale),
            kernel: 'nearest',
          })
          .png()
          .toBuffer(),
        meta = await sharp(png).metadata();
      let sum = 0,
        n = 0;
      for (let y = Math.max(c.y0, c.y1 - 12); y < c.y1; y++)
        for (let x = c.x0; x < c.x1; x++)
          if (c.raw[(y * c.w + x) * 4 + 3]) {
            sum += x;
            n++;
          }
      const anchor = (sum / n - c.x0) * scale,
        left = Math.max(
          0,
          Math.min(224 - meta.width, Math.round(112 - anchor)),
        );
      const cell = await sharp({
        create: {
          width: 224,
          height: 336,
          channels: 4,
          background: '#00000000',
        },
      })
        .composite([{ input: png, left, top: 320 - meta.height }])
        .png()
        .toBuffer();
      cells.push(cell);
    }
    // The still fallback convention is SW/NW; native strips remain SE/NE.
    await sharp(cells[0])
      .flop()
      .png()
      .toFile(`art/sprites/${model}${row ? '-back' : ''}.png`);
    for (const action of actions) {
      const neutralOnly =
          action === 'idle' && ['gardener', 'pedestrian'].includes(name),
        frames = neutralOnly ? [cells[0]] : cells,
        base = `art/sprites/anim/${model}__${action}_${row ? 'NE' : 'SE'}`;
      await sharp({
        create: {
          width: 224 * frames.length,
          height: 336,
          channels: 4,
          background: '#00000000',
        },
      })
        .composite(frames.map((input, i) => ({ input, left: i * 224, top: 0 })))
        .png()
        .toFile(base + '.png');
      await fs.writeFile(
        base + '.json',
        JSON.stringify(
          {
            frame: [224, 336],
            foot: [112, 320],
            density: 4,
            sequence: frames.map((_, i) => i),
            source: `../source/supporting-cast/${name}.png`,
            sourceBounds: rows[row].map((c) => c.sourceBounds),
          },
          null,
          2,
        ) + '\n',
      );
    }
  }
  inventory.push({
    model,
    source,
    bytes: sourceBytes.length,
    sha256: createHash('sha256').update(sourceBytes).digest('hex'),
    poses: 12,
    actions: [...actions],
    height,
  });
}
await fs.writeFile(
  'art/sprites/source/supporting-cast/inventory.json',
  JSON.stringify(
    {
      style:
        'Dar al-Salam original reference style, natural adults and age-appropriate children',
      kind: 'Anonymous fictional supporting roles, not depictions of named historical people',
      models: inventory,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Prepared ${models.length} original identities, all ${models.length * 12} front/rear poses and 17 sparse supporting roles.`,
);
