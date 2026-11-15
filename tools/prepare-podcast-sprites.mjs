import fs from 'node:fs/promises';
import sharp from 'sharp';

const ids = process.argv.slice(2);
for (const id of ids.length ? ids : ['omar-suleiman']) {
  const file = `art/sprites/source/podcast/${id}-actions.png`;
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rows = [];
  // Generated contact sheets need not use exactly equal-height rows. Find
  // each column's actual transparent gaps so shoes cannot leak into the next
  // view or be cut off at an arbitrary quarter-sheet boundary.
  const bands = [];
  for (let col = 0; col < 6; col++) {
    const left = Math.round((col * info.width) / 6),
      right = Math.round(((col + 1) * info.width) / 6),
      runs = [];
    let start = -1;
    for (let y = 0; y <= info.height; y++) {
      let count = 0;
      if (y < info.height)
        for (let x = left; x < right; x++)
          if (data[(y * info.width + x) * 4 + 3] >= 170) count++;
      if (count >= 3 && start < 0) start = y;
      if (count < 3 && start >= 0) {
        runs.push([start, y]);
        start = -1;
      }
    }
    const merged = [];
    for (const run of runs) {
      const prev = merged.at(-1);
      if (prev && run[0] - prev[1] <= 2) prev[1] = run[1];
      else merged.push(run);
    }
    const bodies = merged.filter(([top, bottom]) => bottom - top > 100);
    if (bodies.length !== 4)
      throw Error(
        `${id} column ${col}: expected four complete body rows, found ${bodies.length}`,
      );
    bands.push(bodies);
  }
  for (let row = 0; row < 4; row++) {
    const cells = [];
    for (let col = 0; col < 6; col++) {
      const l = Math.round((col * info.width) / 6),
        r = Math.round(((col + 1) * info.width) / 6),
        t = bands[col][row][0],
        b = bands[col][row][1],
        w = r - l,
        h = b - t,
        raw = Buffer.alloc(w * h * 4);
      let x0 = w,
        y0 = h,
        x1 = 0,
        y1 = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const p = ((y + t) * info.width + x + l) * 4,
            q = (y * w + x) * 4;
          if (data[p + 3] < 170) continue;
          raw.set(data.subarray(p, p + 3), q);
          raw[q + 3] = 255;
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x + 1);
          y1 = Math.max(y1, y + 1);
        }
      if (x1 <= x0) throw Error(`Empty ${id} row ${row}, frame ${col}`);
      cells.push({ w, h, raw, x0, y0, x1, y1, sx: l, sy: t });
    }
    rows.push(cells);
  }
  // Talking/listening share the same scale. Register soles, not changing hands.
  const scale = Math.min(
    208 / (rows[0][0].y1 - rows[0][0].y0),
    ...rows
      .flat()
      .map((c) => Math.min(290 / (c.y1 - c.y0), 205 / (c.x1 - c.x0))),
  );
  for (let row = 0; row < 4; row++) {
    const frames = [];
    for (const [col, c] of rows[row].entries()) {
      const img = await sharp(c.raw, {
        raw: { width: c.w, height: c.h, channels: 4 },
      })
        .extract({
          left: c.x0,
          top: c.y0,
          width: c.x1 - c.x0,
          height: c.y1 - c.y0,
        })
        .resize({ width: Math.round((c.x1 - c.x0) * scale), kernel: 'nearest' })
        .png()
        .toBuffer();
      const meta = await sharp(img).metadata();
      let sx = 0,
        n = 0;
      for (let y = c.y1 - 12; y < c.y1; y++)
        for (let x = c.x0; x < c.x1; x++)
          if (c.raw[(y * c.w + x) * 4 + 3]) {
            sx += x;
            n++;
          }
      const ax = (sx / n - c.x0) * scale,
        x = Math.max(0, Math.min(224 - meta.width, Math.round(112 - ax)));
      const cell = await sharp({
        create: {
          width: 224,
          height: 336,
          channels: 4,
          background: '#00000000',
        },
      })
        .composite([{ input: img, left: x, top: 320 - meta.height }])
        .png()
        .toBuffer();
      frames.push({ input: cell, left: col * 224, top: 0 });
    }
    const base = `art/sprites/anim/${id}__podcast-${row < 2 ? 'talk' : 'listen'}_${row % 2 === 0 ? 'SE' : 'NE'}`;
    await sharp({
      create: {
        width: 1344,
        height: 336,
        channels: 4,
        background: '#00000000',
      },
    })
      .composite(frames)
      .png()
      .toFile(base + '.png');
    await fs.writeFile(
      base + '.json',
      JSON.stringify(
        {
          frame: [224, 336],
          foot: [112, 320],
          density: 4,
          sequence: [0, 1, 2, 3, 4, 5],
          source: `../source/podcast/${id}-actions.png`,
          sourceBounds: rows[row].map((c) => [
            c.sx + c.x0,
            c.sy + c.y0,
            c.sx + c.x1,
            c.sy + c.y1,
          ]),
        },
        null,
        2,
      ) + '\n',
    );
  }
  console.log(
    `Prepared ${id}: 24 seated talking/listening frames. Existing art preserved.`,
  );
}
