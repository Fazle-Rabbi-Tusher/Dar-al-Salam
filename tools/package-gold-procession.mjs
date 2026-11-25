import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const output = process.argv[2] || '/tmp/mansa-gold-procession-animation.zip';
const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'gold-procession-pack-'));
const checksums = [];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function copy(from, to) {
  const target = path.join(stage, to);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const bytes = await fs.readFile(from);
  await fs.writeFile(target, bytes);
  checksums.push(`${hash(bytes)}  ${to}`);
}
try {
  const scene = 'web/public/scenes/mansa-gold-procession';
  for (const name of await fs.readdir(scene))
    await copy(path.join(scene, name), name);
  const source = 'art/sprites/source/gold-procession-animation';
  for (const name of await fs.readdir(source))
    await copy(path.join(source, name), path.join(source, name));
  for (const name of [
    'prepare-gold-procession.mjs',
    'capture-gold-procession.mjs',
    'package-gold-procession.mjs',
    'gold-procession.test.mjs',
  ])
    await copy('tools/' + name, 'tools/' + name);
  await copy('docs/mansa-gold-procession-animation.md', 'SOURCE-NOTES.md');
  await fs.writeFile(
    path.join(stage, 'SHA256SUMS'),
    checksums.sort().join('\n') + '\n',
  );
  // Read every entry back and compare hashes, rather than relying only on ZIP CRCs.
  execFileSync(
    'python3',
    [
      '-c',
      `
import pathlib, sys, zipfile, hashlib
root = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(root.rglob('*')):
        if file.is_file(): archive.write(file, file.relative_to(root).as_posix())
with zipfile.ZipFile(sys.argv[2]) as archive:
    assert archive.testzip() is None
    for name in archive.namelist():
        assert not pathlib.PurePosixPath(name).is_absolute() and '..' not in pathlib.PurePosixPath(name).parts
        assert hashlib.sha256(archive.read(name)).digest() == hashlib.sha256((root / name).read_bytes()).digest(), name
`,
      stage,
      output,
    ],
    { stdio: 'inherit' },
  );
  const bytes = await fs.readFile(output);
  if (bytes.length >= 30_000_000)
    throw Error(`ZIP exceeds the owner's limit: ${bytes.length} bytes`);
  const receipt = {
    file: output,
    bytes: bytes.length,
    sha256: hash(bytes),
    verifiedEntries: checksums.length + 1,
    limit: 30_000_000,
    duration: 20,
    video: { width: 1080, height: 1080, fps: 24, frames: 480 },
    sourcePoses: 12,
  };
  await fs.writeFile(output + '.json', JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await fs.rm(stage, { recursive: true, force: true });
}
