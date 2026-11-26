import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const output = path.resolve(
  process.argv[2] || '/tmp/gold-caravan-realistic-3d.zip',
);
const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'gold-cargo-pack-'));
try {
  await fs.cp('web/public/models/gold-cargo', staging, { recursive: true });
  // The MP4 and animated GLBs retain the full tour/actions. The redundant GIF
  // is published separately so the complete models fit in the one 30 MB ZIP.
  await fs.unlink(staging + '/gold-cargo-animation.gif');
  const visible = (data) => {
    for (let i = 0; i < data.length; i += 4)
      if (data[i + 3] === 0) data.fill(0, i, i + 3);
    return data;
  };
  const views = [];
  for (const file of await fs.readdir(staging + '/sprites')) {
    if (!file.endsWith('.png')) continue;
    const source = staging + '/sprites/' + file,
      target = source.replace(/\.png$/, '.webp');
    await sharp(source).webp({ lossless: true, effort: 6 }).toFile(target);
    const original = visible(
        await sharp(source).ensureAlpha().raw().toBuffer(),
      ),
      decoded = visible(await sharp(target).ensureAlpha().raw().toBuffer());
    if (!original.equals(decoded))
      throw Error('Rendered view pixels changed: ' + file);
    views.push({
      file: 'sprites/' + path.basename(target),
      visibleRgbaSha256: createHash('sha256').update(decoded).digest('hex'),
    });
    await fs.unlink(source);
  }
  await fs.writeFile(
    staging + '/VIEW-INTEGRITY.json',
    JSON.stringify({ format: 'lossless WebP', views }, null, 2) + '\n',
  );
  for (const name of ['gold-cargo-scene', 'elephant-reference-match']) {
    await sharp(staging + '/' + name + '.png')
      .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
      .toFile(staging + '/' + name + '.jpg');
    await fs.unlink(staging + '/' + name + '.png');
  }
  const readme = await fs.readFile(staging + '/README.md', 'utf8');
  await fs.writeFile(
    staging + '/README.md',
    readme
      .replaceAll('gold-cargo-scene.png', 'gold-cargo-scene.jpg')
      .replaceAll(
        'elephant-reference-match.png',
        'elephant-reference-match.jpg',
      ) +
      '\nScene images in this ZIP are JPEG previews. Transparent directions use lossless WebP with verified visible pixel hashes in VIEW-INTEGRITY.json. Original PNG renders remain in the repository.\n',
  );
  await fs.mkdir(staging + '/reference', { recursive: true });
  await sharp('art/sprites/source/gold-cargo/elephant-reference-study.png')
    .resize({ width: 1200 })
    .jpeg({ quality: 93, chromaSubsampling: '4:4:4' })
    .toFile(staging + '/reference/elephant-design-study.jpg');
  const files = [
    'packages/shared/gold-cargo.ts',
    'packages/shared/gold-cargo.test.ts',
    'packages/shared/gold-carriers.ts',
    'packages/shared/carrier-human.ts',
    'packages/shared/carrier-variants.ts',
    'packages/shared/royal-caravan.ts',
    'packages/shared/mansa-reference.ts',
    'packages/shared/laboratory.ts',
    'packages/shared/iso.ts',
    'packages/shared/planet.ts',
    'packages/shared/generated/gold-cargo-materials.json',
    'packages/shared/generated/gold-cargo-refined.json',
    'packages/shared/generated/gold-carrier-faces.json',
    'packages/shared/generated/mali-faces.json',
    'packages/shared/generated/mali-cloth.json',
    'packages/shared/generated/mansa-reference.json',
    'tools/prepare-gold-cargo-art.mjs',
    'tools/export-gold-cargo.mjs',
    'tools/export-refined-gold-cargo.mjs',
    'tools/optimize-gold-cargo.mjs',
    'tools/prepare-gold-cargo-refinement.mjs',
    'tools/capture-gold-cargo.mjs',
    'tools/package-gold-cargo.mjs',
    'tools/prepare-gold-carrier-art.mjs',
    'tools/export-gold-carriers.mjs',
    'tests/gold-cargo.spec.ts',
    'tests/mali-caravan.spec.ts',
    'docs/gold-cargo-3d.md',
    'web/src/engine/CaravanMaterials.ts',
    'web/src/engine/RiggedCaravan.ts',
    'web/src/engine/Infrastructure.ts',
    'art/sprites/source/gold-cargo/refined-materials.png',
    'art/sprites/source/gold-cargo/refinement-inventory.json',
    'art/sprites/source/gold-carriers/six-faces.png',
    'art/sprites/source/gold-carriers/inventory.json',
  ];
  for (const file of files) {
    const target = path.join(staging, 'source', file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(file, target);
  }
  execFileSync(
    'python3',
    [
      '-c',
      `
import pathlib,sys,hashlib,zipfile
root=pathlib.Path(sys.argv[1]);target=pathlib.Path(sys.argv[2])
files=sorted(p for p in root.rglob('*') if p.is_file())
(root/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(root).as_posix()+'\\n' for p in files))
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    for name in z.namelist():
        assert not pathlib.PurePosixPath(name).is_absolute() and '..' not in pathlib.PurePosixPath(name).parts
        assert hashlib.sha256(z.read(name)).digest()==hashlib.sha256((root/name).read_bytes()).digest(),name
assert target.stat().st_size<30_000_000,target.stat().st_size
print('Verified every ZIP entry, path, checksum and the strict 30 MB limit.')
`,
      staging,
      output,
    ],
    { stdio: 'inherit' },
  );
  const bytes = await fs.readFile(output);
  const result = {
    file: output,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    newModels: 17,
    includedPeopleRigs: 10,
    previewSeconds: 20,
  };
  await fs.writeFile(output + '.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
