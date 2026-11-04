// Development preview: renders every modern object and tile onto one contact sheet.
// Writes only to the path given as the first argument; repository art is untouched.
import sharp from 'sharp';
import { Pixels, blit, hexAt } from '../../packages/shared/pixels';
import {
  MODERN_COLOURS,
  MODERN_OBJECTS,
  renderModernObject,
  renderModernTile,
} from './modern';
const out = process.argv[2] ?? 'modern-preview.png';
const allowed = new Set(MODERN_COLOURS);
const rendered = Object.keys(MODERN_OBJECTS).map((id) => ({
  id,
  ...renderModernObject(id),
}));
const errors: string[] = [];
for (const r of rendered)
  for (const f of r.frames)
    for (let i = 0; i < f.data.length; i += 4)
      if (f.data[i + 3] && !allowed.has(hexAt(f, i)))
        errors.push(`${r.id} ${hexAt(f, i)}`);
const tiles = Array.from({ length: 7 }, (_, i) => renderModernTile(i + 7));
for (const t of tiles)
  for (let i = 0; i < t.data.length; i += 4)
    if (t.data[i + 3] && !allowed.has(hexAt(t, i)))
      errors.push(`tile ${hexAt(t, i)}`);
const width = 1400;
let x = 8,
  y = 8,
  row = 0;
const placed: {
  img: Pixels;
  x: number;
  y: number;
  anchor: [number, number];
}[] = [];
for (const r of rendered) {
  const frames = r.frames;
  const w = frames.reduce((n, f) => n + f.width + 4, 0);
  if (x + w > width) {
    x = 8;
    y += row + 12;
    row = 0;
  }
  for (const f of frames) {
    placed.push({ img: f as Pixels, x, y, anchor: r.anchor });
    x += f.width + 4;
  }
  x += 12;
  row = Math.max(row, frames[0].height);
}
y += row + 12;
const sheet = new Pixels(width, y + 80);
sheet.rect(0, 0, width, sheet.height, '#C9C3B8');
for (const p of placed) {
  blit(sheet, p.img, p.x, p.y);
  sheet.pixel(p.x + p.anchor[0], p.y + p.anchor[1], '#FF0000');
}
// Tile patch: a 6×6 floor of each tile.
tiles.forEach((t, n) => {
  for (let ty = 0; ty < 5; ty++)
    for (let tx = 0; tx < 5; tx++)
      blit(sheet, t, 20 + n * 180 + (tx - ty) * 16 + 64, y + (tx + ty) * 8);
});
await sharp(Buffer.from(sheet.data), {
  raw: { width: sheet.width, height: sheet.height, channels: 4 },
})
  .resize(sheet.width * 2, sheet.height * 2, { kernel: 'nearest' })
  .png()
  .toFile(out);
console.log(
  `${rendered.length} objects, ${MODERN_COLOURS.length} colours, ${errors.length} palette errors ${[...new Set(errors)].slice(0, 10).join(', ')}`,
);
for (const r of rendered)
  console.log(
    `${r.id} ${MODERN_OBJECTS[r.id].footprint.join('x')} canvas ${r.frames[0].width}x${r.frames[0].height} anchor ${r.anchor}`,
  );
