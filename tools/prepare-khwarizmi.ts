import sharp from 'sharp';

/*
 * Al-Khwārizmī's "At work" gallery scenes from the owner's large character
 * sheet (2026-11, the third sheet): gallery 14 onward. Gallery 0–13 came
 * from the earlier sheets (git history). The telescope (invented c. 1608)
 * is left out.
 *
 * His figure in the world, his strips and his card picture now come from
 * the owner's study-animation pack (tools/prepare-khwarizmi-study.ts); this
 * sheet's cuts of them are in git history.
 *
 *   node --import tsx tools/prepare-khwarizmi.ts <character sheet.png>
 */
const [sheet] = process.argv.slice(2);
/*
 * Gallery: scenes not yet in it — seated reading, compasses at the table,
 * walking with scrolls, the cane, holding the astrolabe, seated in thought
 * and carrying books — each squared on the sheet's dark ground.
 */
/** [left, top, width, height, ...patches]: patches (x, y, w, h within the
 * box) cover bits of the neighbouring figures with the dark ground. */
const scenes = [
  [195, 365, 200, 325, 180, 140, 20, 60],
  [878, 365, 232, 325, 0, 0, 40, 170],
  [10, 695, 182, 312],
  [192, 695, 165, 312],
  [562, 695, 168, 312, 150, 150, 18, 162],
  [728, 695, 182, 312, 0, 0, 22, 120, 160, 200, 22, 112],
  [1100, 695, 140, 312, 100, 0, 40, 60, 128, 120, 12, 192, 0, 250, 14, 62],
];
let n = 14;
for (const [l, t, w, h, ...patches] of scenes) {
  const side = Math.max(w, h),
    covers = [];
  for (let k = 0; k < patches.length; k += 4)
    covers.push({
      input: {
        create: {
          width: patches[k + 2],
          height: patches[k + 3],
          channels: 3 as const,
          background: { r: 15, g: 17, b: 21 },
        },
      },
      left: patches[k],
      top: patches[k + 1],
    });
  const piece = await sharp(
    await sharp(sheet)
      .extract({ left: l, top: t, width: w, height: h })
      .png()
      .toBuffer(),
  )
    .composite(covers)
    .png()
    .toBuffer();
  const square = await sharp({
    create: {
      width: side,
      height: side,
      channels: 3,
      background: { r: 15, g: 17, b: 21 },
    },
  })
    .composite([
      { input: piece, left: Math.round((side - w) / 2), top: side - h },
    ])
    .png()
    .toBuffer();
  await sharp(square)
    .resize({ width: 300 })
    .png({ palette: true, quality: 92 })
    .toFile(`art/gallery/al-khwarizmi/${n++}.png`);
}
console.log('done');
