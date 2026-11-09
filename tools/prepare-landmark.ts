import sharp from 'sharp';

/*
 * Cuts one view out of an owner-supplied building sheet onto a transparent
 * background (flood fill from the crop's border through the flat dark
 * backdrop), then applies listed pixel edits. Run once per supplied sheet:
 *
 *   node --import tsx tools/prepare-landmark.ts <sheet.png> <out.png> \
 *     <left> <top> <width> <height> [erase=x0,y0,x1,y1 ...] [knob=x,y,r]
 *
 * erase clears a box (crop coordinates), for example a finial; knob paints a
 * small plain cap in the colours just below it. `largest` keeps only the
 * biggest piece (when a neighbour pokes into the box), `flip` mirrors the
 * result, `modulate=brightness,saturation,hue` recolours it (a coat
 * variant), and `floor=y` clears everything below row y (crop coordinates),
 * such as a painted ground strip.
 */
const [src, out, ...rest] = process.argv.slice(2);
const [left, top, width, height] = rest.slice(0, 4).map(Number);
const edits = rest.slice(4);
const { data, info } = await sharp(src)
  .extract({ left, top, width, height })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width,
  H = info.height,
  at = (x: number, y: number) => (y * W + x) * 4;
// The backdrop: the average of the dark pixels round the crop's border
// (a corner may sit on a neighbouring piece).
const border: number[] = [];
for (let x = 0; x < W; x++) border.push(at(x, 0), at(x, H - 1));
for (let y = 0; y < H; y++) border.push(at(0, y), at(W - 1, y));
const dark = border.filter((i) => data[i] + data[i + 1] + data[i + 2] < 120);
const bg = [0, 1, 2].map((c) =>
  dark.length
    ? Math.round(dark.reduce((n, i) => n + data[i + c], 0) / dark.length)
    : data[c],
);
const nearBg = (i: number, tol: number) =>
  Math.max(
    Math.abs(data[i] - bg[0]),
    Math.abs(data[i + 1] - bg[1]),
    Math.abs(data[i + 2] - bg[2]),
  ) <= tol;
const clear = new Uint8Array(W * H),
  stack: number[] = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const k = stack.pop()!;
  if (clear[k] || !nearBg(k * 4, 20)) continue;
  clear[k] = 1;
  const x = k % W,
    y = (k - x) / W;
  if (x > 0) stack.push(k - 1);
  if (x < W - 1) stack.push(k + 1);
  if (y > 0) stack.push(k - W);
  if (y < H - 1) stack.push(k + W);
}
// Backdrop enclosed by the art (between legs, under a belly) goes too, when
// it is a sizeable patch rather than a dark detail of the drawing.
{
  const seen = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) {
    if (clear[k] || seen[k] || !nearBg(k * 4, 20)) continue;
    const region = [k],
      st = [k];
    seen[k] = 1;
    while (st.length) {
      const q = st.pop()!,
        x = q % W,
        y = (q - x) / W;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nk = ny * W + nx;
        if (!seen[nk] && !clear[nk] && nearBg(nk * 4, 20)) {
          seen[nk] = 1;
          region.push(nk);
          st.push(nk);
        }
      }
    }
    if (region.length >= 40) for (const q of region) clear[q] = 1;
  }
}
// Dark fringe pixels touching the cleared backdrop go too.
for (let pass = 0; pass < 2; pass++) {
  const next = clear.slice();
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const k = y * W + x;
      if (clear[k]) continue;
      const touching =
        clear[k - 1] || clear[k + 1] || clear[k - W] || clear[k + W];
      const i = k * 4,
        lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
      if (touching && (lum < 62 || nearBg(i, 34))) next[k] = 1;
    }
  clear.set(next);
}
for (let k = 0; k < W * H; k++) if (clear[k]) data[k * 4 + 3] = 0;
let flip = false,
  modulate: number[] | null = null;
for (const e of edits) {
  const [name, args = ''] = e.split('='),
    n = args.split(',').map(Number);
  if (name === 'flip') {
    flip = true;
    continue;
  }
  if (name === 'modulate') {
    modulate = n;
    continue;
  }
  if (name === 'floor') {
    for (let y = n[0]; y < H; y++)
      for (let x = 0; x < W; x++) data[at(x, y) + 3] = 0;
    continue;
  }
  if (name === 'largest') {
    // Keep the biggest 8-connected piece of opaque pixels.
    const label = new Int32Array(W * H).fill(-1),
      sizes: number[] = [];
    for (let k = 0; k < W * H; k++) {
      if (data[k * 4 + 3] === 0 || label[k] >= 0) continue;
      const id = sizes.length,
        st = [k];
      let n = 0;
      label[k] = id;
      while (st.length) {
        const q = st.pop()!,
          x = q % W,
          y = (q - x) / W;
        n++;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx,
              ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const nk = ny * W + nx;
            if (data[nk * 4 + 3] && label[nk] < 0) {
              label[nk] = id;
              st.push(nk);
            }
          }
      }
      sizes.push(n);
    }
    const keep = sizes.indexOf(Math.max(...sizes));
    for (let k = 0; k < W * H; k++) if (label[k] !== keep) data[k * 4 + 3] = 0;
    continue;
  }
  if (name === 'erase') {
    const [x0, y0, x1, y1] = n;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) data[at(x, y) + 3] = 0;
  } else if (name === 'knob') {
    // A plain rounded cap, shaded from the pixels just below it.
    const [cx, cy, r] = n;
    const light = data.slice(
        at(cx - 1, cy + r + 2),
        at(cx - 1, cy + r + 2) + 4,
      ),
      dark = data.slice(at(cx + r, cy + r + 2), at(cx + r, cy + r + 2) + 4);
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx,
          dy = y - cy;
        if (dx * dx + dy * dy > r * r + r) continue;
        const c = dx - dy > 0 ? dark : light;
        data.set([c[0], c[1], c[2], 255], at(x, y));
      }
  } else throw Error(`Unknown edit ${e}`);
}
let img = sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim({
  threshold: 0,
});
if (flip) img = sharp(await img.png().toBuffer()).flop();
if (modulate)
  img = sharp(await img.png().toBuffer()).modulate({
    brightness: modulate[0],
    saturation: modulate[1] ?? 1,
    hue: modulate[2] ?? 0,
  });
await img.png().toFile(out);
console.log(`Wrote ${out}`);
