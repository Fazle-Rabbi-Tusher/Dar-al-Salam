import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import {
  caravanActors,
  caravanModel,
  mansaActor,
  node,
} from '../packages/shared/royal-caravan.ts';

const out = 'web/public/models/mali-caravan';
await fs.mkdir(out + '/vendor', { recursive: true });
// Unmodified MIT-licensed Three.js modules already supplied in this workspace.
for (const name of [
  'three.core.min.js',
  'three.module.min.js',
  'GLTFLoader.js',
  'GLTFExporter.js',
  'OrbitControls.js',
  'BufferGeometryUtils.js',
  'THREE-LICENSE.txt',
])
  try {
    await fs.access(out + '/vendor/' + name);
  } catch {
    await fs.copyFile(
      'scene-packs/mosque-model/vendor/' + name,
      out + '/vendor/' + name,
    );
  }
const T = await import(
    pathToFileURL(path.resolve(out + '/vendor/three.module.min.js')).href
  ),
  { GLTFExporter } = await import(
    pathToFileURL(path.resolve(out + '/vendor/GLTFExporter.js')).href
  ),
  { mergeVertices } = await import(
    pathToFileURL(path.resolve(out + '/vendor/BufferGeometryUtils.js')).href
  );
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((data) => {
      this.result = data;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((data) => {
      this.result =
        'data:' + blob.type + ';base64,' + Buffer.from(data).toString('base64');
      this.onloadend?.();
    });
  }
};
const material = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.09,
  side: T.DoubleSide,
});
material.name = 'caravan-original';
const finishes = [
  'default',
  'face',
  'skin',
  'linen',
  'brocade',
  'velvet',
  'gold',
  'hair',
];
const materials = [
  material,
  ...finishes.slice(1).map((finish) => {
    const m = new T.MeshStandardMaterial({
      name: 'mansa:' + finish,
      vertexColors: true,
      side: T.DoubleSide,
      roughness:
        finish === 'gold'
          ? 0.24
          : finish === 'skin' || finish === 'face'
            ? 0.56
            : finish === 'brocade'
              ? 0.5
              : 0.9,
      metalness: finish === 'gold' ? 0.92 : finish === 'brocade' ? 0.12 : 0,
    });
    return m;
  }),
];
const cache = new Map(),
  colors = new Map();
function geometry(faces) {
  if (cache.has(faces)) return cache.get(faces);
  const positions = [],
    rgb = [],
    indices = [],
    uv = [],
    suppliedNormals = [],
    groups = [];
  const sorted = [...faces].sort(
    (a, b) =>
      finishes.indexOf(a.finish || 'default') -
      finishes.indexOf(b.finish || 'default'),
  );
  let lastMaterial = -1;
  for (const face of sorted) {
    const materialIndex = finishes.indexOf(face.finish || 'default');
    if (materialIndex !== lastMaterial) {
      groups.push({ start: indices.length, count: 0, materialIndex });
      lastMaterial = materialIndex;
    }
    const color = face.uv ? '#ffffff' : face.color;
    let c = colors.get(color);
    if (!c) {
      c = new T.Color(color).toArray();
      colors.set(color, c);
    }
    const base = positions.length / 3;
    for (const [i, p] of face.points.entries()) {
      positions.push(...p);
      rgb.push(...c);
      uv.push(...(face.uv?.[i] || [0, 0]));
      suppliedNormals.push(face.normals?.[i]);
    }
    for (let i = 1; i < face.points.length - 1; i++)
      indices.push(base, base + i, base + i + 1);
    groups[groups.length - 1].count += (face.points.length - 2) * 3;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  for (const group of groups)
    g.addGroup(group.start, group.count, group.materialIndex);
  g.computeVertexNormals();
  const normals = g.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) {
    const v = suppliedNormals[i]
      ? new T.Vector3(...suppliedNormals[i])
      : new T.Vector3().fromBufferAttribute(normals, i);
    if (v.lengthSq() < 1e-9) v.set(0, 1, 0);
    else v.normalize();
    normals.setXYZ(i, v.x, v.y, v.z);
  }
  const compact = mergeVertices(g, 1e-6);
  g.dispose();
  cache.set(faces, compact);
  return compact;
}
function indexRig(root) {
  const map = new Map();
  const visit = (n, p) => {
    const key = p + '/' + n.name;
    map.set(key, n);
    for (const child of n.children) visit(child, key);
  };
  visit(root, '');
  return map;
}
async function exportModel(name, rigAt) {
  const graph = rigAt(0),
    byPath = new Map();
  const build = (n, parent) => {
    const key = parent + '/' + n.name,
      obj = n.faces?.length
        ? new T.Mesh(geometry(n.faces), materials)
        : new T.Group();
    obj.name = n.name;
    obj.position.fromArray(n.position);
    obj.quaternion.fromArray(n.rotation);
    obj.scale.fromArray(n.scale);
    byPath.set(key, obj);
    for (const child of n.children) obj.add(build(child, key));
    return obj;
  };
  const scene = new T.Scene();
  scene.name = name;
  const meters = new T.Group();
  meters.name = 'World units to meters';
  meters.scale.setScalar(1 / 42);
  meters.add(build(graph, ''));
  scene.add(meters);
  const samples = Array.from({ length: 241 }, (_, i) => indexRig(rigAt(i))),
    times = samples.map((_, i) => i / 12),
    tracks = [];
  for (const [key, obj] of byPath) {
    for (const [field, property, Track] of [
      ['position', 'position', T.VectorKeyframeTrack],
      ['rotation', 'quaternion', T.QuaternionKeyframeTrack],
      ['scale', 'scale', T.VectorKeyframeTrack],
    ]) {
      const values = samples.map((s) => [...s.get(key)[field]]);
      if (field === 'rotation')
        for (let i = 1; i < values.length; i++)
          if (values[i].reduce((n, v, j) => n + v * values[i - 1][j], 0) < 0)
            values[i] = values[i].map((v) => -v);
      if (
        values.every((v) =>
          v.every((n, j) => Math.abs(n - values[0][j]) < 1e-7),
        )
      )
        continue;
      tracks.push(new Track(obj.uuid + '.' + property, times, values.flat()));
    }
  }
  const clip = new T.AnimationClip('Procession and gold handovers', 20, tracks);
  const data = await new GLTFExporter().parseAsync(scene, {
    binary: true,
    animations: [clip],
    onlyVisible: false,
  });
  // Embed source pixel-art PNG bytes directly. This keeps the GLBs self-contained and
  // avoids a browser-only canvas re-encode in the Node build pipeline.
  const original = Buffer.from(data),
    jsonLength = original.readUInt32LE(12);
  const gltf = JSON.parse(original.subarray(20, 20 + jsonLength).toString());
  const binStart = 20 + jsonLength + 8;
  const chunks = [original.subarray(binStart)],
    textureIndices = new Map();
  let byteLength = chunks[0].length;
  for (const m of gltf.materials || []) {
    const finish = m.name?.replace('mansa:', '');
    if (!['face', 'linen', 'brocade', 'velvet', 'gold'].includes(finish))
      continue;
    if (!textureIndices.has(finish)) {
      const jpg = await fs.readFile(`${out}/textures/${finish}.png`);
      const view =
        (gltf.bufferViews ||= []).push({
          buffer: 0,
          byteOffset: byteLength,
          byteLength: jpg.length,
        }) - 1;
      const image =
        (gltf.images ||= []).push({
          name: `Mansa reference ${finish}`,
          bufferView: view,
          mimeType: 'image/png',
        }) - 1;
      gltf.samplers ||= [
        { magFilter: 9728, minFilter: 9984, wrapS: 10497, wrapT: 10497 },
      ];
      const texture =
        (gltf.textures ||= []).push({ sampler: 0, source: image }) - 1;
      textureIndices.set(finish, texture);
      const padding = Buffer.alloc((4 - (jpg.length % 4)) % 4);
      chunks.push(jpg, padding);
      byteLength += jpg.length + padding.length;
    }
    m.pbrMetallicRoughness.baseColorTexture = {
      index: textureIndices.get(finish),
    };
  }
  gltf.buffers[0].byteLength = byteLength;
  const jsonBytes = Buffer.from(JSON.stringify(gltf)),
    jsonPadding = Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20);
  const jsonChunk = Buffer.concat([jsonBytes, jsonPadding]),
    header = Buffer.alloc(20),
    binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonChunk.length + byteLength, 8);
  header.writeUInt32LE(jsonChunk.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(byteLength, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const buffer = Buffer.concat([header, jsonChunk, binHeader, ...chunks]);
  await fs.writeFile(`${out}/${name}.glb`, buffer);
  console.log(
    name,
    buffer.length,
    'bytes;',
    byPath.size,
    'articulated nodes;',
    tracks.length,
    'animation tracks',
  );
  return {
    file: name + '.glb',
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    nodes: byPath.size,
    animationTracks: tracks.length,
    duration: 20,
  };
}
const records = [];
records.push(
  await exportModel('mansa-musa-standing', (frame) => mansaActor(frame, false)),
);
records.push(
  await exportModel('mansa-musa-mounted', (frame) => {
    const all = caravanActors(frame),
      children = all.children.slice(0, 2);
    for (const n of children) {
      n.position = [0, 0, 0];
      n.rotation = [0, 0, 0, 1];
    }
    return node(
      'mounted-mansa-musa',
      undefined,
      undefined,
      undefined,
      children,
    );
  }),
);
records.push(
  await exportModel('mali-guard', (frame) => {
    const guard = caravanActors(frame).children.find(
      (n) => n.name === 'guard-1',
    );
    guard.position = [0, 0, 0];
    guard.rotation = [0, 0, 0, 1];
    return guard;
  }),
);
records.push(
  await exportModel('mali-gold-caravan', (frame) =>
    node('mansa-musa-gold-caravan', undefined, undefined, undefined, [
      node('sand-and-market', caravanModel('mali-gold-caravan').faces),
      caravanActors(frame),
    ]),
  ),
);
await fs.writeFile(
  out + '/manifest.json',
  JSON.stringify(
    {
      format: 'glTF 2.0 binary',
      source:
        'Articulated geometry from royal-caravan.ts and mansa-reference.ts. The ruler uses smooth anatomical surfaces, embedded reference face and textile maps, and separate metallic gold. Supporting cast retains the existing pixel-art geometry.',
      rulerDesignRevision: 'reference-pixel-v3',
      ticksPerSecond: 12,
      masterTicks: 240,
      guards: 12,
      packCamels: 4,
      donationStops: 3,
      review:
        'Illustrative reconstruction. Draft character; biography and advisory approval remain pending.',
      files: records,
    },
    null,
    2,
  ) + '\n',
);
