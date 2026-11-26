import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import {
  CARGO_PROPS,
  cargoElephant,
  cargoCamel,
  cargoPropRig,
  treasuryCollection,
} from '../packages/shared/gold-cargo.ts';
import {
  caravanActors,
  caravanState,
  node,
  rotate,
  yaw,
} from '../packages/shared/royal-caravan.ts';
import { carrierVariant } from '../packages/shared/carrier-variants.ts';

const out = 'web/public/models/gold-cargo';
const vendor = (name) =>
  pathToFileURL(path.resolve('web/public/models/mali-caravan/vendor/' + name))
    .href;
const T = await import(vendor('three.module.min.js'));
const { GLTFExporter } = await import(vendor('GLTFExporter.js'));
const { mergeVertices } = await import(vendor('BufferGeometryUtils.js'));
await fs.mkdir(out + '/people', { recursive: true });
await fs.mkdir(out + '/textures', { recursive: true });
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((data) => {
      this.result = data;
      this.onloadend?.();
    });
  }
};
for (const name of ['face', 'linen', 'brocade', 'velvet', 'gold'])
  await fs.copyFile(
    `web/public/models/mali-caravan/textures/${name}.png`,
    `${out}/textures/mansa-${name}.png`,
  );

const clothColors = [
  '#465773',
  '#e5dcc7',
  '#9f6042',
  '#47566e',
  '#aa8b56',
  '#9f987f',
];
const fine = new Set([
  'elephant',
  'camel',
  'brocade',
  'linen',
  'wicker',
  'gold',
  'leather',
  'sand',
  'wood',
  'rope',
]);
const materials = [],
  specifications = new Map(),
  materialIds = new Map();
function materialFor(f) {
  let texture = null,
    base = '#ffffff',
    finish = f.cargoMaterial || f.finish || 'default';
  if (f.uv) {
    if (f.texture?.startsWith('carrier-face-')) texture = f.texture;
    else if (f.texture?.startsWith('carrier-linen-')) {
      texture = 'linen';
      base = clothColors[+f.texture.split('-').at(-1)];
    } else if (f.cargoMaterial === 'horse') {
      texture = 'camel';
      base = '#34424c';
    } else if (f.cargoMaterial === 'elephant') {
      texture = 'elephant';
      base = '#a0b9d2';
    } else if (f.cargoMaterial === 'gold-cloth') {
      texture = 'gold';
    } else if (fine.has(f.cargoMaterial)) texture = f.cargoMaterial;
    else if (
      !f.cargoMaterial &&
      ['face', 'linen', 'brocade', 'velvet', 'gold'].includes(f.finish)
    )
      texture = 'mansa-' + f.finish;
  }
  const key = [finish, texture || 'vertex', base].join(':');
  if (!materialIds.has(key)) {
    const gold = finish === 'gold';
    const material = new T.MeshStandardMaterial({
      name: key,
      vertexColors: true,
      color: base,
      side: T.DoubleSide,
      roughness: gold
        ? 0.42
        : finish === 'eye'
          ? 0.2
          : finish === 'ivory'
            ? 0.5
            : finish === 'skin' || finish === 'face'
              ? 0.72
              : 0.94,
      metalness: gold ? 0.9 : finish === 'gold-cloth' ? 0.18 : 0,
    });
    materialIds.set(key, materials.length);
    materials.push(material);
    specifications.set(key, {
      texture,
      normal:
        texture && fine.has(texture) && !['wood', 'rope'].includes(texture)
          ? texture + '-normal'
          : null,
    });
  }
  return materialIds.get(key);
}
const geometryCache = new Map();
function geometry(faces) {
  if (geometryCache.has(faces)) return geometryCache.get(faces);
  const sorted = faces
    .map((f) => ({ f, mi: materialFor(f) }))
    .sort((a, b) => a.mi - b.mi);
  const positions = [],
    colors = [],
    uv = [],
    supplied = [],
    indices = [],
    groups = [];
  let last = -1;
  for (const { f, mi } of sorted) {
    if (mi !== last) {
      groups.push({ start: indices.length, count: 0, materialIndex: mi });
      last = mi;
    }
    const spec = specifications.get(materials[mi].name),
      rgb = new T.Color(spec.texture ? '#ffffff' : f.color).toArray(),
      base = positions.length / 3;
    f.points.forEach((p, i) => {
      positions.push(...p);
      colors.push(...rgb);
      uv.push(...(f.uv?.[i] || [0, 0]));
      supplied.push(f.normals?.[i]);
    });
    for (let i = 1; i < f.points.length - 1; i++)
      indices.push(base, base + i, base + i + 1);
    groups.at(-1).count += (f.points.length - 2) * 3;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  groups.forEach((group) =>
    g.addGroup(group.start, group.count, group.materialIndex),
  );
  g.computeVertexNormals();
  const normals = g.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) {
    const n = supplied[i]
      ? new T.Vector3(...supplied[i])
      : new T.Vector3().fromBufferAttribute(normals, i);
    if (!Number.isFinite(n.lengthSq()) || n.lengthSq() < 1e-9) n.set(0, 1, 0);
    else n.normalize();
    normals.setXYZ(i, n.x, n.y, n.z);
  }
  const compact = mergeVertices(g, 1e-5);
  g.dispose();
  geometryCache.set(faces, compact);
  return compact;
}
const people = [
  'overhead-gold-bearer',
  'bowl-gold-bearer',
  'chest-porter-rust',
  'chest-porter-indigo',
  'elder-recipient',
  'paired-chest-carriers',
  'gold-handover-pair',
  'banner-attendant',
  'mansa-musa-mounted',
  'mali-guard',
];
function rigAt(id, frame, mode = 'Walk') {
  if (id === 'elephant-loaded')
    return cargoElephant(
      frame,
      mode === 'Rest' ? { rest: true, at: [0, 0, 0], heading: 0 } : {},
    );
  if (id === 'camel-loaded')
    return cargoCamel(
      frame,
      mode === 'Rest'
        ? { at: [0, 0, 0], heading: 0, distance: 0, walk: 0 }
        : undefined,
    );
  if (id === 'treasury-collection') return treasuryCollection();
  if (id.startsWith('people/')) {
    const name = id.slice(7);
    if (name === 'mansa-musa-mounted') {
      const s = caravanState(frame),
        children = caravanActors(frame).children.filter((n) =>
          ['royal-horse', 'mansa-musa'].includes(n.name),
        );
      for (const n of children) {
        n.position = rotate(
          n.position.map((v, i) => v - s.point[i]),
          yaw(-s.heading),
        );
        n.rotation = [0, 0, 0, 1];
      }
      return node(name, undefined, undefined, undefined, children);
    }
    if (name === 'mali-guard') {
      const guard = caravanActors(frame).children.find(
        (n) => n.name === 'guard-1',
      );
      guard.position = [0, 0, 0];
      guard.rotation = [0, 0, 0, 1];
      return guard;
    }
    return carrierVariant(name, frame);
  }
  return cargoPropRig(id);
}
function indexRig(root) {
  const map = new Map();
  const visit = (n, p) => {
    const key = p + '/' + n.name;
    map.set(key, n);
    n.children.forEach((c) => visit(c, key));
  };
  visit(root, '');
  return map;
}
async function embedTextures(data) {
  const original = Buffer.from(data),
    length = original.readUInt32LE(12),
    json = JSON.parse(original.subarray(20, 20 + length).toString()),
    chunks = [original.subarray(28 + length)],
    embedded = new Map();
  let size = chunks[0].length;
  json.samplers = [
    { magFilter: 9728, minFilter: 9986, wrapS: 10497, wrapT: 10497 },
    { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 },
  ];
  async function add(file, normal = false) {
    const key = file + ':' + normal;
    if (embedded.has(key)) return embedded.get(key);
    const png = await fs.readFile(`${out}/textures/${file}.png`),
      padding = Buffer.alloc((4 - (png.length % 4)) % 4);
    const view =
      (json.bufferViews ||= []).push({
        buffer: 0,
        byteOffset: size,
        byteLength: png.length,
      }) - 1;
    const source =
      (json.images ||= []).push({
        name: file,
        bufferView: view,
        mimeType: 'image/png',
      }) - 1;
    const index =
      (json.textures ||= []).push({ sampler: normal ? 1 : 0, source }) - 1;
    chunks.push(png, padding);
    size += png.length + padding.length;
    embedded.set(key, index);
    return index;
  }
  for (const m of json.materials || []) {
    const spec = specifications.get(m.name);
    if (spec?.texture)
      m.pbrMetallicRoughness.baseColorTexture = {
        index: await add(spec.texture),
      };
    if (spec?.normal)
      m.normalTexture = {
        index: await add(spec.normal, true),
        scale: m.name.startsWith('elephant:') ? 0.3 : 0.5,
      };
  }
  json.buffers[0].byteLength = size;
  const raw = Buffer.from(JSON.stringify(json)),
    padded = Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4, 32)]),
    header = Buffer.alloc(20),
    binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + size, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(size, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, padded, binHeader, ...chunks]);
}
const records = [];
for (const id of [
  'elephant-loaded',
  'camel-loaded',
  ...CARGO_PROPS,
  'treasury-collection',
  ...people.map((p) => 'people/' + p),
]) {
  const initial = rigAt(id, 0),
    objects = new Map();
  const build = (n, parent) => {
    const key = parent + '/' + n.name,
      obj = n.faces?.length
        ? new T.Mesh(geometry(n.faces), materials)
        : new T.Group();
    obj.name = n.name;
    obj.position.fromArray(n.position);
    obj.quaternion.fromArray(n.rotation);
    obj.scale.fromArray(n.scale);
    objects.set(key, obj);
    n.children.forEach((c) => obj.add(build(c, key)));
    return obj;
  };
  const scene = new T.Scene(),
    meters = new T.Group();
  meters.name = 'Meters';
  meters.scale.setScalar(1 / 42);
  meters.add(build(initial, ''));
  scene.add(meters);
  const clips = [];
  let totalTracks = 0;
  const modes = id.endsWith('-loaded')
    ? ['Walk', 'Rest']
    : id.startsWith('people/')
      ? ['Carrying and gold distribution']
      : [];
  for (const mode of modes) {
    const samples = Array.from({ length: 241 }, (_, i) =>
        indexRig(rigAt(id, i, mode)),
      ),
      times = samples.map((_, i) => i / 12),
      tracks = [];
    for (const [key, obj] of objects)
      for (const [field, property, Track] of [
        ['position', 'position', T.VectorKeyframeTrack],
        ['rotation', 'quaternion', T.QuaternionKeyframeTrack],
        ['scale', 'scale', T.VectorKeyframeTrack],
      ]) {
        const values = samples.map((s) => [...s.get(key)[field]]);
        if (field === 'rotation')
          for (let i = 1; i < values.length; i++)
            if (values[i].reduce((s, v, j) => s + v * values[i - 1][j], 0) < 0)
              values[i] = values[i].map((v) => -v);
        const original = obj[property].toArray();
        if (
          values.every((v) =>
            v.every((n, j) => Math.abs(n - original[j]) < 1e-7),
          )
        )
          continue;
        tracks.push(new Track(obj.uuid + '.' + property, times, values.flat()));
      }
    totalTracks += tracks.length;
    clips.push(new T.AnimationClip(mode, 20, tracks));
  }
  const bytes = await embedTextures(
    await new GLTFExporter().parseAsync(scene, {
      binary: true,
      animations: clips,
      onlyVisible: false,
    }),
  );
  await fs.writeFile(`${out}/${id}.glb`, bytes);
  const record = {
    id,
    file: id + '.glb',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    nodes: objects.size,
    animations: clips.map((c) => c.name),
    animationTracks: totalTracks,
    duration: clips.length ? 20 : 0,
  };
  records.push(record);
  console.log(
    id,
    bytes.length,
    'bytes;',
    record.nodes,
    'nodes;',
    totalTracks,
    'tracks',
  );
}
await fs.writeFile(
  out + '/manifest.json',
  JSON.stringify(
    {
      format: 'glTF 2.0 binary',
      revision: 'natural-anatomy-v2',
      units: 'meters',
      ticksPerSecond: 12,
      loopTicks: 240,
      materials:
        'Fine generated pixel-art albedo and tangent-space surface detail on smooth anatomical meshes.',
      models: records.filter((r) => !r.id.startsWith('people/')),
      people,
      peopleRecords: records.filter((r) => r.id.startsWith('people/')),
      review:
        'Illustrative reconstruction; named identities, cards and advisory approvals are unchanged. Older published model packs are preserved.',
    },
    null,
    2,
  ) + '\n',
);
