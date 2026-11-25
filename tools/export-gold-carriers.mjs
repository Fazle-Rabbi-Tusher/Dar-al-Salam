import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { human, node, rotate, yaw } from '../packages/shared/royal-caravan.ts';
import {
  CARRIER_IDS,
  carrierHandover,
  carrierRouteAt,
  goldCarrierActors,
} from '../packages/shared/gold-carriers.ts';

const out = 'web/public/models/gold-carriers';
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
const normal = new T.MeshStandardMaterial({
  name: 'woven-pixel-cloth-and-skin',
  vertexColors: true,
  roughness: 0.87,
  metalness: 0,
  side: T.DoubleSide,
});
const metal = new T.MeshStandardMaterial({
  name: 'physical-gold',
  vertexColors: true,
  roughness: 0.32,
  metalness: 0.83,
  side: T.DoubleSide,
});
const goldColors = new Set([
  '#cc962f',
  '#edbd53',
  '#f2c96a',
  '#e5b443',
  '#ffce68',
  '#efc565',
  '#d9a12e',
  '#f3c45c',
]);
const cache = new Map();
function geometry(faces) {
  if (cache.has(faces)) return cache.get(faces);
  const positions = [],
    colors = [],
    indices = [],
    groups = [],
    suppliedNormals = [];
  let last = -1;
  const materialFor = (f) =>
    f.finish === 'gold' || goldColors.has(f.color) ? 1 : 0;
  for (const f of [...faces].sort((a, b) => materialFor(a) - materialFor(b))) {
    const mi = materialFor(f);
    if (mi !== last) {
      groups.push({ start: indices.length, count: 0, materialIndex: mi });
      last = mi;
    }
    const rgb = new T.Color(f.color).toArray(),
      base = positions.length / 3;
    for (const [vertexIndex, p] of f.points.entries()) {
      positions.push(...p);
      colors.push(...rgb);
      suppliedNormals.push(f.normals?.[vertexIndex]);
    }
    for (let i = 1; i < f.points.length - 1; i++)
      indices.push(base, base + i, base + i + 1);
    groups.at(-1).count += (f.points.length - 2) * 3;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  for (const group of groups)
    g.addGroup(group.start, group.count, group.materialIndex);
  g.computeVertexNormals();
  const normals = g.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) {
    const n = suppliedNormals[i]
      ? new T.Vector3(...suppliedNormals[i])
      : new T.Vector3().fromBufferAttribute(normals, i);
    if (n.lengthSq() < 1e-9) n.set(0, 1, 0);
    else n.normalize();
    normals.setXYZ(i, n.x, n.y, n.z);
  }
  cache.set(faces, g);
  return g;
}
function rigIndex(root) {
  const map = new Map();
  const visit = (n, parent) => {
    const key = parent + '/' + n.name;
    map.set(key, n);
    for (const c of n.children) visit(c, key);
  };
  visit(root, '');
  return map;
}
function normalized(name, nodes, origin, angle) {
  const inverse = yaw(-angle),
    position = rotate(
      origin.map((n) => -n),
      inverse,
    );
  return node(name, undefined, position, inverse, nodes);
}
export function carrierVariant(name, frame) {
  const route =
    name === 'gold-handover-pair'
      ? (f, role) => ({ ...carrierRouteAt(0, role), t: f, walk: 0, travel: 0 })
      : carrierRouteAt;
  const root = goldCarrierActors(frame, human, route);
  if (name === 'gold-carriers-ensemble') return root;
  if (name === 'gold-handover-pair') {
    const first = carrierRouteAt(0, 'bearer');
    return normalized(
      name,
      root.children.filter((n) =>
        [
          'bowl-gold-bearer',
          'elder-recipient',
          'carrier-transferred-gold-coin',
        ].includes(n.name),
      ),
      first.point,
      first.heading,
    );
  }
  if (name === 'paired-chest-carriers') {
    const load = root.children.find((n) => n.name === 'shared-chest-rig');
    const pose = carrierRouteAt(frame, 'pair');
    return normalized(
      name,
      root.children.filter((n) =>
        [
          'chest-porter-rust',
          'chest-porter-indigo',
          'shared-chest-rig',
        ].includes(n.name),
      ),
      load.position,
      pose.heading,
    );
  }
  const person = root.children.find((n) => n.name === name);
  if (!person) throw Error('Unknown carrier model: ' + name);
  const angle = 2 * Math.atan2(person.rotation[1], person.rotation[3]);
  const children = [person];
  if (name === 'bowl-gold-bearer' || name === 'elder-recipient') {
    const gift = root.children.find(
      (n) => n.name === 'carrier-transferred-gold-coin',
    );
    const owner = carrierHandover(frame).owner;
    if (owner !== (name === 'bowl-gold-bearer' ? 'giver' : 'recipient'))
      gift.scale = [0.001, 0.001, 0.001];
    children.push(gift);
  }
  return normalized(name + '-walk-and-carry', children, person.position, angle);
}
const records = [];
for (const name of [
  ...CARRIER_IDS,
  'paired-chest-carriers',
  'gold-handover-pair',
  'gold-carriers-ensemble',
]) {
  const graph = carrierVariant(name, 0),
    objects = new Map();
  const build = (n, parent) => {
    const key = parent + '/' + n.name;
    const obj = n.faces?.length
      ? new T.Mesh(geometry(n.faces), [normal, metal])
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
  meters.add(build(graph, ''));
  scene.add(meters);
  const samples = Array.from({ length: 241 }, (_, i) =>
    rigIndex(carrierVariant(name, i)),
  );
  const times = samples.map((_, i) => i / 12),
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
      if (
        values.every((v) =>
          v.every((n, j) => Math.abs(n - values[0][j]) < 1e-7),
        )
      )
        continue;
      tracks.push(new Track(obj.uuid + '.' + property, times, values.flat()));
    }
  const clip = new T.AnimationClip('Walk, carry and share gold', 20, tracks);
  const buffer = Buffer.from(
    await new GLTFExporter().parseAsync(scene, {
      binary: true,
      animations: [clip],
      onlyVisible: false,
    }),
  );
  await fs.writeFile(out + '/' + name + '.glb', buffer);
  records.push({
    id: name,
    file: name + '.glb',
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    nodes: objects.size,
    animationTracks: tracks.length,
    duration: 20,
  });
  console.log(name, buffer.length, 'bytes;', tracks.length, 'animation tracks');
}
await fs.writeFile(
  out + '/manifest.json',
  JSON.stringify(
    {
      format: 'glTF 2.0 binary',
      units: 'meters',
      ticksPerSecond: 12,
      loopTicks: 240,
      people: 6,
      models: records,
      review:
        'Anonymous illustrative supporting characters. Existing named-character approval remains a draft.',
    },
    null,
    2,
  ) + '\n',
);
