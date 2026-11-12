import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

/*
 * Ibn al-Haytham at his optics bench, from the owner's Ibn al-Haytham
 * collection (2026-11) and the owner's optics-workflow brief.
 *
 * His voxel figure (Interactive-Viewers/Scholar/model.js) is posed frame by
 * frame through the workflow (tools/haytham/poses.js): the aperture, the
 * water bowl, the dial, the compass and the inverted image. The shoulders
 * turn to bring each hand to its instrument. The instruments come from the
 * owner's equipment builder (Interactive-Viewers/Equipment/models.js): the
 * pinhole panel and screen, the glass bowl on its notched track, the
 * measuring scale with its sliding pointer. The page renders it all in the
 * world's isometric view (tools/haytham/render.html).
 *
 * He and his bench are one animated figure, so his hands sit correctly in
 * front of and behind the instruments: a 40-frame 'write' strip (a frame
 * every 3 ticks of the 120-tick loop). Also written: his card picture
 * (standing with the Book of Optics), his sprite, and a gallery of the four
 * gestures.
 *
 *   node --import tsx tools/prepare-haytham.ts <Ibn-al-Haytham-Complete-Collection> <three.js vendor folder> [figure folder]
 *
 * The figure: by default the complete collection's Scholar viewer. The
 * owner's later character collection (Ibn-al-Haytham-Character-Collection:
 * burgundy turban, dark beard, brown and rust robes, finer voxels) has the
 * same model.js with the same joints; pass its folder as the third argument.
 *
 * three.js: the vendor folder of the owner's mosque model pack (0.180).
 */
const [collection, three, figure] = process.argv.slice(2);
if (!collection || !three)
  throw Error(
    'Usage: prepare-haytham.ts <collection folder> <three vendor folder>',
  );
const ID = 'ibn-al-haytham',
  D = 3, // sprite pixels per world pixel
  // He stands 72 world px tall like everyone: 5.04 units seen at 30°.
  K = (72 * D) / (5.04 * Math.cos(Math.PI / 6));

const roots: Record<string, string> = {
  scholar: path.resolve(
    figure ?? path.join(collection, 'Interactive-Viewers/Scholar'),
  ),
  equipment: path.resolve(collection, 'Interactive-Viewers/Equipment'),
  three: path.resolve(three),
  render: path.resolve('tools/haytham'),
};
const server = http.createServer((req, res) => {
  const [, root, ...rest] = decodeURI(req.url!.split('?')[0]).split('/');
  const base = roots[root],
    file = base && path.resolve(base, ...rest);
  if (!file || !file.startsWith(base) || !fs.existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'content-type': file.endsWith('.html') ? 'text/html' : 'text/javascript',
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const port = (server.address() as { port: number }).port;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});
async function open(k: number) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page:', e.message));
  await page.goto(`http://127.0.0.1:${port}/render/render.html?k=${k}`);
  await page.waitForFunction('window.READY === true', null, {
    timeout: 300000,
  });
  return page;
}
const png = (url: string) => Buffer.from(url.split(',')[1], 'base64');

/* ── The workstation strip ── */
const page = await open(K);
const { W, H, foot } = (await page.evaluate(
  '({ W: RESULT.W, H: RESULT.H, foot: RESULT.foot })',
)) as { W: number; H: number; foot: [number, number] };
const frames: Buffer[] = [];
for (let t = 0; t < 120; t += 3) {
  // Solid pixels only (soft edges would halo against the world).
  const { data } = await sharp(
    png((await page.evaluate(`RESULT.render(${t})`)) as string),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 96 ? 255 : 0;
  frames.push(data);
}
// Unique frames once, with the order they play in (the strip `sequence`).
const unique: Buffer[] = [],
  sequence = frames.map((f) => {
    let i = unique.findIndex((u) => u.equals(f));
    if (i < 0) i = unique.push(f) - 1;
    return i;
  });
const strip = await sharp({
  create: {
    width: W * unique.length,
    height: H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(
    unique.map((input, i) => ({
      input,
      raw: { width: W, height: H, channels: 4 as const },
      left: i * W,
      top: 0,
    })),
  )
  .png({ palette: true, colours: 256, dither: 0.3, effort: 8 })
  .toBuffer();
for (const old of fs.readdirSync('art/sprites/anim'))
  if (old.startsWith(`${ID}__`)) fs.rmSync(`art/sprites/anim/${old}`);
const meta =
  JSON.stringify({ frame: [W, H], foot, density: D, sequence }) + '\n';
// Back view (NE): the same frames. He works facing SE; the strip is only
// needed for the rare planet turn that shows him from behind.
for (const view of ['SE', 'NE']) {
  fs.writeFileSync(`art/sprites/anim/${ID}__write_${view}.png`, strip);
  fs.writeFileSync(`art/sprites/anim/${ID}__write_${view}.json`, meta);
}
await page.close();

/* ── Card picture, sprite and gallery, drawn larger ── */
const big = await open(110);
const portrait = await sharp(
  png((await big.evaluate('RESULT.portrait(110)')) as string),
)
  .trim({ threshold: 0 })
  .png()
  .toBuffer();
await sharp(portrait)
  .resize({ height: 480, kernel: 'lanczos3' })
  .extend({
    top: 14,
    bottom: 10,
    left: 18,
    right: 18,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(`art/illustrations/${ID}.png`);
// The sprite faces down-left (SW) by convention: the portrait, mirrored.
await sharp(portrait)
  .flop()
  .resize({ height: 300 })
  .png()
  .toFile(`art/sprites/${ID}.png`);
fs.rmSync(`art/gallery/${ID}`, { recursive: true, force: true });
fs.mkdirSync(`art/gallery/${ID}`, { recursive: true });
// One still per gesture: the aperture, the bowl, the dial, the compass,
// and watching the image on the wall screen.
for (const [n, t] of [9, 30, 50, 64, 90].entries())
  await sharp(png((await big.evaluate(`RESULT.render(${t})`)) as string))
    .flatten({ background: '#2a2620' })
    .resize({ width: 300 })
    .png({ palette: true, quality: 92 })
    .toFile(`art/gallery/${ID}/${n}.png`);
await browser.close();
server.close();

/* ── His card: the workflow at the bench in the science lab ── */
const cardFile = `content/characters/${ID}.json`,
  card = JSON.parse(fs.readFileSync(cardFile, 'utf8'));
card.loop = 120;
card.script = [
  { from: 0, to: 120, action: 'write', at: [49.6, 18.6], facing: 'SE' },
];
// The character collection's colours: brown robe, burgundy turban, dark beard.
card.look.colours.garmentPrimary = 'cocoa';
card.look.colours.garmentSecondary = 'madder-red';
card.look.colours.headwear = 'madder-red';
card.look.colours.hair = 'hair-black';
fs.writeFileSync(cardFile, JSON.stringify(card, null, 2) + '\n');
console.log(
  `Ibn al-Haytham: ${unique.length} frames ${W}×${H}, card art and gallery written.`,
);
