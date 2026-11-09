import fs from 'node:fs';
import sharp from 'sharp';

/*
 * Al-Khwārizmī's in-world look from the owner's "at work" sheet (2026-11):
 * the standing figure of its last panel, seen from behind holding a scroll,
 * becomes his sprite and his animation strips (224×336 frames, feet at
 * 112,320, a slow breath), and the first panel's head and shoulders become
 * his story-card picture.
 *
 *   node --import tsx tools/prepare-khwarizmi.ts <cut figure.png> <sheet.png>
 */
const [figure, sheet] = process.argv.slice(2);
const FW = 224,
  FH = 336,
  FOOT = 320,
  HEIGHT = 292;
const body = await sharp(figure)
  .trim({ threshold: 0 })
  .resize({ height: HEIGHT, kernel: 'lanczos3' })
  .png()
  .toBuffer();
const meta = await sharp(body).metadata();
fs.copyFileSync(figure, 'art/sprites/al-khwarizmi.png');
// Four frames of a slow breath: the figure stretches by up to 1.2%.
const frames: Buffer[] = [];
for (const k of [0, 0.006, 0.012, 0.006]) {
  const h = Math.round(HEIGHT * (1 + k));
  const f = await sharp(body)
    .resize({ width: meta.width, height: h, fit: 'fill' })
    .png()
    .toBuffer();
  frames.push(
    await sharp({
      create: {
        width: FW,
        height: FH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: f, left: Math.round(FW / 2 - meta.width! / 2), top: FOOT - h },
      ])
      .png()
      .toBuffer(),
  );
}
const strip = await sharp({
  create: {
    width: FW * 4,
    height: FH,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(frames.map((input, i) => ({ input, left: i * FW, top: 0 })))
  .png()
  .toBuffer();
for (const action of ['idle', 'talk'])
  for (const view of ['NE', 'SE'])
    fs.writeFileSync(
      `art/sprites/anim/al-khwarizmi__${action}_${view}.png`,
      strip,
    );
// The card picture: head and shoulders from the first panel (writing).
await sharp(sheet)
  .extract({ left: 120, top: 40, width: 230, height: 230 })
  .resize({ width: 280 })
  .png()
  .toFile('art/illustrations/al-khwarizmi.png');
console.log('done', meta.width, meta.height);
