import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Technical import only: all faces, garments and poses are image-generated.
// The original 40 poses, their timing, artwork and controls remain in original/.
const source = 'art/sprites/source/haytham-redesign',
  W = 344,
  H = 395,
  original = JSON.parse(
    await fs.readFile(
      `${source}/original/anim/ibn-al-haytham__write_SE.json`,
      'utf8',
    ),
  );
const opaque = (data, i) => data[i + 3] > 170;

async function clean(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // One sheet has an opaque pale matte. Remove only border-connected neutral
  // background pixels; cream cuffs, eyes and instrument screens stay intact.
  const pale = (i) =>
    Math.min(data[i], data[i + 1], data[i + 2]) > 231 &&
    Math.max(data[i], data[i + 1], data[i + 2]) -
      Math.min(data[i], data[i + 1], data[i + 2]) <
      23;
  const seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  let head = 0,
    tail = 0;
  const add = (p) => {
    if (!seen[p] && (pale(p * 4) || data[p * 4 + 3] < 171)) {
      seen[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    add(x);
    add((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    add(y * w);
    add(y * w + w - 1);
  }
  while (head < tail) {
    const p = queue[head++],
      x = p % w;
    if (x) add(p - 1);
    if (x < w - 1) add(p + 1);
    if (p >= w) add(p - w);
    if (p < w * (h - 1)) add(p + w);
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (seen[p] || data[i + 3] < 171) data.fill(0, i, i + 4);
    else data[i + 3] = 255;
  }
  // Clear matte trapped inside the bench legs as well. Small pale islands
  // (eye highlights) survive; none of the warm cream cloth/screens is neutral.
  seen.fill(0);
  const neutral = (i) =>
    Math.min(data[i], data[i + 1], data[i + 2]) > 208 &&
    Math.max(data[i], data[i + 1], data[i + 2]) -
      Math.min(data[i], data[i + 1], data[i + 2]) <
      22;
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !data[start * 4 + 3] || !neutral(start * 4)) continue;
    head = 0;
    tail = 1;
    queue[0] = start;
    seen[start] = 1;
    let exterior = false;
    while (head < tail) {
      const p = queue[head++],
        x = p % w;
      for (const q of [x ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < w * h && !data[q * 4 + 3]) exterior = true;
        if (
          q >= 0 &&
          q < w * h &&
          !seen[q] &&
          data[q * 4 + 3] &&
          neutral(q * 4)
        ) {
          seen[q] = 1;
          queue[tail++] = q;
        }
      }
    }
    if (tail > 8 || exterior)
      for (let n = 0; n < tail; n++)
        data.fill(0, queue[n] * 4, queue[n] * 4 + 4);
  }
  return { data, width: w, height: h };
}

function benchAnchor({ data, width: w, height: h }) {
  let bottom = -1,
    right = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (opaque(data, (y * w + x) * 4)) {
        bottom = Math.max(bottom, y);
        right = Math.max(right, x);
      }
  if (bottom < 0) throw Error('Empty Haytham frame');
  let sum = 0,
    count = 0;
  for (let y = bottom - 3; y <= bottom; y++)
    for (let x = 0; x < w; x++)
      if (opaque(data, (y * w + x) * 4)) {
        sum += x;
        count++;
      }
  return { x: sum / count, y: bottom, right };
}
const target = benchAnchor(
  await clean(
    await sharp(`${source}/original/anim/ibn-al-haytham__write_SE.png`)
      .extract({ left: 0, top: 0, width: W, height: H })
      .png()
      .toBuffer(),
  ),
);
const frames = [],
  registrations = [];
for (let b = 0; b < 4; b++) {
  const file = `${source}/actions-${b}.png`,
    meta = await sharp(file).metadata();
  for (let n = 0; n < 10; n++) {
    const left = Math.round(((n % 5) * meta.width) / 5),
      right = Math.round((((n % 5) + 1) * meta.width) / 5),
      top = Math.round((Math.floor(n / 5) * meta.height) / 2),
      bottom = Math.round(((Math.floor(n / 5) + 1) * meta.height) / 2);
    const cell = await clean(
        await sharp(file)
          .extract({ left, top, width: right - left, height: bottom - top })
          .png()
          .toBuffer(),
      ),
      anchor = benchAnchor(cell),
      scale = (target.right - target.x) / (anchor.right - anchor.x),
      dx = target.x - anchor.x * scale,
      dy = target.y - anchor.y * scale;
    // Register against the fixed nearest bench post and far bench edge,
    // rather than recentering moving hands, head tilts or robe silhouettes.
    const data = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const sx = Math.round((x - dx) / scale),
          sy = Math.round((y - dy) / scale);
        if (sx < 0 || sy < 0 || sx >= cell.width || sy >= cell.height) continue;
        cell.data.copy(
          data,
          (y * W + x) * 4,
          (sy * cell.width + sx) * 4,
          (sy * cell.width + sx) * 4 + 4,
        );
      }
    const png = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .png()
      .toBuffer();
    frames.push(png);
    registrations.push({ frame: frames.length - 1, scale, dx, dy });
  }
}
const strip = await sharp({
  create: { width: W * 40, height: H, channels: 4, background: '#0000' },
})
  .composite(frames.map((input, i) => ({ input, left: i * W, top: 0 })))
  .png()
  .toBuffer();
for (const view of ['SE', 'NE']) {
  // Preserve the original rear-facing fallback, its 40-cell sequence and
  // registration. This pack does not claim independently drawn rear actions.
  const base = `art/sprites/anim/ibn-al-haytham__write_${view}`;
  await fs.writeFile(base + '.png', strip);
  await fs.writeFile(base + '.json', JSON.stringify(original, null, 2) + '\n');
}
const canonical = await clean(`${source}/canonical.png`),
  half = Math.floor(canonical.width / 2),
  canonicalPNG = await sharp(canonical.data, {
    raw: { width: canonical.width, height: canonical.height, channels: 4 },
  })
    .png()
    .toBuffer();
for (const [view, left, width] of [
  ['front', 0, half],
  ['back', half, canonical.width - half],
]) {
  const isolated = await sharp(canonicalPNG)
    .extract({ left, top: 0, width, height: canonical.height })
    .png()
    .toBuffer();
  let body = sharp(isolated).trim({ threshold: 0 });
  if (view === 'front') body = body.flop(); // runtime convention: nose points right
  const buffer = await body.png().toBuffer();
  await sharp(buffer)
    .resize({ height: 300, kernel: 'nearest' })
    .png()
    .toFile(`art/sprites/ibn-al-haytham${view === 'back' ? '__back' : ''}.png`);
  if (view === 'front')
    await sharp(buffer)
      .resize({ height: 480, kernel: 'nearest' })
      .extend({ top: 14, bottom: 10, left: 18, right: 18, background: '#0000' })
      .png()
      .toFile('art/illustrations/ibn-al-haytham.png');
}
for (const [i, pose] of [3, 10, 17, 22, 30].entries())
  await sharp(frames[pose])
    .flatten({ background: '#2a2620' })
    .resize({ width: 300, kernel: 'nearest' })
    .png()
    .toFile(`art/gallery/ibn-al-haytham/${i}.png`);
await fs.writeFile(
  `${source}/registration.json`,
  JSON.stringify(
    {
      frame: [W, H],
      foot: original.foot,
      density: original.density,
      registrations,
    },
    null,
    2,
  ) + '\n',
);
async function inventory(dir, out = []) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) await inventory(p, out);
    else if (item.name !== 'inventory.json') {
      const data = await fs.readFile(p);
      out.push({
        path: p.slice(source.length + 1),
        bytes: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
      });
    }
  }
  return out;
}
await fs.writeFile(
  `${source}/inventory.json`,
  JSON.stringify(
    {
      sourceRevision: 'b82825cf6e33f08b6a98e1368b5f05eb41202b28',
      loop: 120,
      ticksPerCell: 3,
      originalCellsPerView: 40,
      references: [
        'Original owner Isometric Character Sprites: ibn-al-haytham.png',
        'https://github.com/amzubair/freecodecamp-tribute-page/blob/master/images/ibn-al-haytham%402x.png',
      ],
      files: await inventory(source),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Imported 40 redesigned optics poses per facing, original anchors and timing, front/rear stills and five gallery images.',
);
