import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const output = path.resolve(
  process.argv[2] || '/tmp/mansa-musa-3d-caravan.zip',
);
const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'mali-caravan-pack-'));
try {
  await fs.cp('web/public/models/mali-caravan', staging, { recursive: true });
  await fs.cp(
    'art/sprites/source/mali-caravan/source',
    path.join(staging, 'source/artwork'),
    { recursive: true },
  );
  for (const file of [
    'packages/shared/royal-caravan.ts',
    'packages/shared/royal-caravan.test.ts',
    'packages/shared/generated/mali-faces.json',
    'packages/shared/generated/mali-cloth.json',
    'web/src/engine/RiggedCaravan.ts',
    'tools/prepare-mali-character-art.mjs',
    'tools/export-mali-caravan.mjs',
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
