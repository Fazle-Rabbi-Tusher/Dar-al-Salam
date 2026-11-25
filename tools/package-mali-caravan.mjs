import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const visiblePixels = (data) => {
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] === 0) data.fill(0, i, i + 3);
  return data;
};

const output = path.resolve(
  process.argv[2] || '/tmp/mansa-musa-reference-pixel-v3.zip',
);
const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'mali-caravan-pack-'));
try {
  await fs.cp('web/public/models/mali-caravan', staging, { recursive: true });
  const sourceArt = 'art/sprites/source/mali-caravan/reference-pixel-v3',
    artOut = path.join(staging, 'source/artwork');
  await fs.mkdir(artOut, { recursive: true });
  const artIndex = [];
  for (const name of await fs.readdir(sourceArt)) {
    const original = path.join(sourceArt, name);
    if (name.endsWith('.png')) {
      const file = name.replace(/\.png$/, '.webp'),
        target = path.join(artOut, file);
      await sharp(original).webp({ lossless: true }).toFile(target);
      const before = await sharp(original).ensureAlpha().raw().toBuffer(),
        after = await sharp(target).ensureAlpha().raw().toBuffer();
      if (!visiblePixels(before).equals(visiblePixels(after)))
        throw Error('Lossless source pixels changed: ' + name);
      artIndex.push({
        originalPng: name,
        pixelHashMode: 'RGBA with invisible RGB zeroed at alpha=0',
        file,
        originalSha256: createHash('sha256')
          .update(await fs.readFile(original))
          .digest('hex'),
        decodedPixelsSha256: createHash('sha256').update(after).digest('hex'),
      });
    } else await fs.copyFile(original, path.join(artOut, name));
  }
  await fs.writeFile(
    path.join(artOut, 'lossless-source-index.json'),
    JSON.stringify(artIndex, null, 2) + '\n',
  );
  for (const file of [
    'packages/shared/royal-caravan.ts',
    'packages/shared/mansa-reference.ts',
    'packages/shared/royal-caravan.test.ts',
    'packages/shared/generated/mali-faces.json',
    'packages/shared/generated/mali-cloth.json',
    'packages/shared/generated/mansa-reference.json',
    'web/src/engine/RiggedCaravan.ts',
    'tools/prepare-mali-character-art.mjs',
    'tools/prepare-mansa-reference.mjs',
    'tools/export-mali-caravan.mjs',
    'tools/render-mansa-portrait.mjs',
    'tools/capture-mali-preview.mjs',
    'web/src/ui/CharacterStudy.tsx',
    'content/characters/mansa-musa.json',
    'content/scenes/gold-caravan.json',
    'docs/mansa-musa-3d-caravan.md',
  ]) {
    const dest = path.join(staging, 'source', file);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(file, dest);
  }
  await fs.mkdir(path.join(staging, 'previews'), { recursive: true });
  for (const file of await fs.readdir('docs/previews'))
    if (file.startsWith('mansa-musa-'))
      await fs.copyFile(
        path.join('docs/previews', file),
        path.join(staging, 'previews', file),
      );
  await fs.mkdir(path.dirname(output), { recursive: true });
  execFileSync(
    'python3',
    [
      '-c',
      `
import hashlib, pathlib, sys, zipfile
root, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file(): z.write(p, p.relative_to(root).as_posix())
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None, 'Corrupt archive'
    for info in z.infolist():
        assert not info.filename.startswith('/') and '..' not in pathlib.PurePosixPath(info.filename).parts
        assert hashlib.sha256(z.read(info)).digest() == hashlib.sha256((root / info.filename).read_bytes()).digest()
size = target.stat().st_size
assert size < 30_000_000, f'ZIP exceeds owner limit: {size}'
print(f'Archive verified: {len(z.infolist())} files, {size:,} bytes')
`,
      staging,
      output,
    ],
    { stdio: 'inherit' },
  );
  const bytes = await fs.readFile(output);
  const receipt = {
    file: output,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  await fs.writeFile(`${output}.json`, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
