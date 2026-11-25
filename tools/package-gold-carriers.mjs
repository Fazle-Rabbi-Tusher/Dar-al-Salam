import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const output = path.resolve(process.argv[2] || '/tmp/gold-carriers-3d.zip');
const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'gold-carriers-pack-'));
try {
  await fs.cp('web/public/models/gold-carriers', staging, { recursive: true });
  const files = [
    'packages/shared/gold-carriers.ts',
    'packages/shared/carrier-human.ts',
    'packages/shared/gold-carriers.test.ts',
    'packages/shared/royal-caravan.ts',
    'packages/shared/mansa-reference.ts',
    'packages/shared/laboratory.ts',
    'packages/shared/infrastructure.ts',
    'packages/shared/iso.ts',
    'packages/shared/planet.ts',
    'packages/shared/generated/gold-carrier-faces.json',
    'packages/shared/generated/mali-faces.json',
    'packages/shared/generated/mali-cloth.json',
    'packages/shared/generated/mansa-reference.json',
    'tools/prepare-gold-carrier-art.mjs',
    'tools/export-gold-carriers.mjs',
    'tools/capture-gold-carriers.mjs',
    'tools/package-gold-carriers.mjs',
    'tests/gold-carriers.spec.ts',
    'docs/gold-carriers-3d.md',
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
        if p.is_file(): z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    for name in z.namelist():
        assert not pathlib.PurePosixPath(name).is_absolute() and '..' not in pathlib.PurePosixPath(name).parts
        assert hashlib.sha256(z.read(name)).digest()==hashlib.sha256((root/name).read_bytes()).digest(),name
assert target.stat().st_size<30_000_000, target.stat().st_size
print('Verified all ZIP entries and the 30 MB limit.')
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
    models: 9,
    people: 6,
    duration: 20,
  };
  await fs.writeFile(output + '.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
