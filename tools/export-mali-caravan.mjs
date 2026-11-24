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
const cache = new Map(),
  colors = new Map();
function geometry(faces) {
  if (cache.has(faces)) return cache.get(faces);
  const positions = [],
    rgb = [],
    indices = [];
  for (const face of faces) {
    let c = colors.get(face.color);
    if (!c) {
      c = new T.Color(face.color).toArray();
      colors.set(face.color, c);
    }
    const base = positions.length / 3;
    for (const p of face.points) {
      positions.push(...p);
      rgb.push(...c);
    }
    for (let i = 1; i < face.points.length - 1; i++)
      indices.push(base, base + i, base + i + 1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const normals = g.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) {
    const v = new T.Vector3().fromBufferAttribute(normals, i);
    if (v.lengthSq() < 1e-9) v.set(0, 1, 0);
    else v.normalize();
    normals.setXYZ(i, v.x, v.y, v.z);
  }
  cache.set(faces, g);
  return g;
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
        ? new T.Mesh(geometry(n.faces), material)
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
  const buffer = Buffer.from(data);
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
        'Articulated geometry from packages/shared/royal-caravan.ts; six image-generated facial color maps; no billboard character meshes.',
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
