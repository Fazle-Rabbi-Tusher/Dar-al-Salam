import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = 'web/public/models/gold-cargo';
const manifest = JSON.parse(await fs.readFile(root + '/manifest.json', 'utf8'));
const temporary = await fs.mkdtemp(
  path.join(os.tmpdir(), 'gold-cargo-quantize-'),
);
const hash = (data) => createHash('sha256').update(data).digest('hex');
const textures = new Map(),
  files = [];
for (const file of await fs.readdir(root + '/textures')) {
  const data = await fs.readFile(root + '/textures/' + file),
    sha256 = hash(data);
  textures.set(sha256, file);
  files.push({ file: 'textures/' + file, bytes: data.length, sha256 });
}
try {
  for (const record of [...manifest.models, ...manifest.peopleRecords]) {
    const output = path.join(temporary, 'quantized.glb');
    // No mesh simplification or animation resampling. Named attachment nodes,
    // all authored keyframes and resting-pose channels are retained.
    execFileSync(
      'npx',
      [
        '--yes',
        '--cache=/tmp/gold-cargo-npm-cache',
        'gltfpack@1.3.0',
        '-i',
        root + '/' + record.file,
        '-o',
        output,
        '-kn',
        '-km',
        '-ke',
        '-kv',
        '-vp',
        '16',
        '-vt',
        '14',
        '-vn',
        '12',
        '-af',
        '0',
        '-ac',
        '-ar',
        '16',
        '-at',
        '24',
        '-as',
        '24',
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
    const data = await fs.readFile(output),
      length = data.readUInt32LE(12),
      json = JSON.parse(data.subarray(20, 20 + length).toString()),
      bin = data.subarray(28 + length),
      imageViews = new Set();
    for (const image of json.images || []) {
      const view = json.bufferViews[image.bufferView],
        png = bin.subarray(
          view.byteOffset || 0,
          (view.byteOffset || 0) + view.byteLength,
        ),
        file = textures.get(hash(png));
      if (!file)
        throw Error(
          'Texture bytes changed during geometry optimization: ' + record.file,
        );
      imageViews.add(image.bufferView);
      image.uri =
        (record.file.startsWith('people/') ? '../' : '') + 'textures/' + file;
      delete image.bufferView;
    }
    // Keep buffer-view indices stable, replacing unused embedded image views
    // with four padding bytes. All assets share their unchanged PNGs in the ZIP.
    const chunks = [];
    let bytes = 0;
    for (const [index, view] of json.bufferViews.entries()) {
      const original = view.byteOffset || 0;
      const contents = imageViews.has(index)
          ? Buffer.alloc(4)
          : bin.subarray(original, original + view.byteLength),
        padding = Buffer.alloc((4 - (contents.length % 4)) % 4);
      view.byteOffset = bytes;
      view.byteLength = contents.length;
      chunks.push(contents, padding);
      bytes += contents.length + padding.length;
    }
    json.buffers[0].byteLength = bytes;
    const raw = Buffer.from(JSON.stringify(json)),
      padded = Buffer.concat([
        raw,
        Buffer.alloc((4 - (raw.length % 4)) % 4, 32),
      ]),
      header = Buffer.alloc(20),
      bh = Buffer.alloc(8);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(28 + padded.length + bytes, 8);
    header.writeUInt32LE(padded.length, 12);
    header.writeUInt32LE(0x4e4f534a, 16);
    bh.writeUInt32LE(bytes, 0);
    bh.writeUInt32LE(0x004e4942, 4);
    const packed = Buffer.concat([header, padded, bh, ...chunks]);
    await fs.writeFile(root + '/' + record.file, packed);
    record.bytes = packed.length;
    record.sha256 = hash(packed);
    record.nodes = json.nodes.length;
    record.animationTracks = (json.animations || []).reduce(
      (n, a) => n + a.channels.length,
      0,
    );
    record.geometryEncoding = 'KHR_mesh_quantization; no external decoder';
    console.log(
      record.file,
      record.bytes,
      'bytes; shared unchanged PNG textures',
    );
  }
  manifest.storage =
    'Binary geometry and shared PNG material files, all included in the portable bundle.';
  manifest.optimization = {
    tool: 'gltfpack 1.3.0',
    positionBits: 16,
    uvBits: 14,
    normalBits: 12,
    animationResampling: false,
    meshSimplification: false,
  };
  manifest.textures = files;
  await fs.writeFile(
    root + '/manifest.json',
    JSON.stringify(manifest, null, 2) + '\n',
  );
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
