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

const out = 'web/public/models/gold-cargo';
await fs.mkdir(out + '/vendor', { recursive: true });
for (const name of [
  'three.core.min.js',
  'three.module.min.js',
  'GLTFLoader.js',
  'OrbitControls.js',
  'BufferGeometryUtils.js',
  'THREE-LICENSE.txt',
])
  await fs.copyFile(
    'web/public/models/mali-caravan/vendor/' + name,
    out + '/vendor/' + name,
  );
const vendor = (name) =>
  pathToFileURL(path.resolve('web/public/models/mali-caravan/vendor/' + name))
    .href;
const T = await import(vendor('three.module.min.js'));
const { GLTFExporter } = await import(vendor('GLTFExporter.js'));
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((data) => {
      this.result = data;
      this.onloadend?.();
    });
  }
};
const finishes = [
  'elephant',
  'wicker',
  'brocade',
  'wood',
  'gold',
  'rope',
  'ivory',
  'leather',
  'camel',
  'eye',
];
const materials = finishes.map(
  (name) =>
    new T.MeshStandardMaterial({
      name: 'cargo:' + name,
      vertexColors: true,
      side: T.DoubleSide,
      roughness:
        name === 'gold'
          ? 0.28
          : name === 'ivory'
            ? 0.4
            : name === 'eye'
              ? 0.15
              : name === 'leather'
                ? 0.7
                : 0.92,
      metalness: name === 'gold' ? 0.92 : 0,
    }),
);
const cache = new Map();
function geometry(faces) {
  if (cache.has(faces)) return cache.get(faces);
  const positions = [],
    colors = [],
    indices = [],
    groups = [],
    supplied = [];
  let last = -1;
  const material = (f) =>
    Math.max(0, finishes.indexOf(f.cargoMaterial || 'wood'));
  for (const f of [...faces].sort((a, b) => material(a) - material(b))) {
    const index = material(f);
    if (index !== last) {
      groups.push({ start: indices.length, count: 0, materialIndex: index });
      last = index;
    }
    const rgb = new T.Color(f.color).toArray(),
      base = positions.length / 3;
    f.points.forEach((p, i) => {
      positions.push(...p);
      colors.push(...rgb);
      supplied.push(f.normals?.[i]);
    });
    for (let i = 1; i < f.points.length - 1; i++)
      indices.push(base, base + i, base + i + 1);
    groups.at(-1).count += (f.points.length - 2) * 3;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  groups.forEach((group) =>
    g.addGroup(group.start, group.count, group.materialIndex),
  );
  g.computeVertexNormals();
  const normal = g.getAttribute('normal');
  for (let i = 0; i < normal.count; i++) {
    const n = supplied[i]
      ? new T.Vector3(...supplied[i])
      : new T.Vector3().fromBufferAttribute(normal, i);
    if (n.lengthSq() < 1e-9) n.set(0, 1, 0);
    else n.normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  cache.set(faces, g);
  return g;
}
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
  return cargoPropRig(id);
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
const records = [];
for (const id of [
  'elephant-loaded',
  'camel-loaded',
  ...CARGO_PROPS,
  'treasury-collection',
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
    for (const c of n.children) obj.add(build(c, key));
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
  for (const mode of id.endsWith('-loaded') ? ['Walk', 'Rest'] : []) {
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
            if (values[i].reduce((n, v, j) => n + v * values[i - 1][j], 0) < 0)
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
  const bytes = Buffer.from(
    await new GLTFExporter().parseAsync(scene, {
      binary: true,
      animations: clips,
      onlyVisible: false,
    }),
  );
  await fs.writeFile(out + '/' + id + '.glb', bytes);
  records.push({
    id,
    file: id + '.glb',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    nodes: objects.size,
    animations: clips.map((c) => c.name),
    animationTracks: totalTracks,
    duration: clips.length ? 20 : 0,
  });
  console.log(
    id,
    bytes.length,
    'bytes;',
    objects.size,
    'nodes;',
    totalTracks,
    'animation tracks',
  );
}
await fs.mkdir(out + '/people', { recursive: true });
const people = [
  'overhead-gold-bearer',
  'bowl-gold-bearer',
  'chest-porter-rust',
  'chest-porter-indigo',
  'elder-recipient',
  'paired-chest-carriers',
  'gold-handover-pair',
  'banner-attendant',
];
for (const id of people)
  await fs.copyFile(
    `web/public/models/gold-carriers/${id}.glb`,
    `${out}/people/${id}.glb`,
  );
await fs.copyFile(
  'web/public/models/mali-caravan/mansa-musa-mounted.glb',
  out + '/people/mansa-musa-mounted.glb',
);
await fs.copyFile(
  'web/public/models/mali-caravan/mali-guard.glb',
  out + '/people/mali-guard.glb',
);
await fs.writeFile(
  out + '/manifest.json',
  JSON.stringify(
    {
      format: 'glTF 2.0 binary',
      units: 'meters',
      ticksPerSecond: 12,
      loopTicks: 240,
      materials: 'Generated pixel-art samples on actual curved meshes.',
      models: records,
      people: [...people, 'mansa-musa-mounted', 'mali-guard'],
      review:
        'Illustrative reconstruction; named-character approvals and biographies are unchanged.',
    },
    null,
    2,
  ) + '\n',
);
