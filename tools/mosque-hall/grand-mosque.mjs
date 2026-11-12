import * as T from '../pack/vendor/three.module.min.js';

/*
 * The grand prayer hall: the owner's mosque model (mosque-six-angle-final,
 * pack mosque.mjs) rebuilt at the scale of the owner's later brief, with
 * its own parts and materials: limestone block walls with extra-tall
 * arched stained-glass windows, a glowing recessed mihrab, twin rows of
 * colossal pillars with pointed arches, tiered hexagonal brass
 * chandeliers, wall sconces, a walnut mashrabiya screen, palms in brass
 * pots, and the teal carpet of gold-and-cream star rosettes with the
 * imam's fringed mat.
 *
 * Model metres, Y up. X across the qibla wall (−16 to 16, the central
 * aisle at X 0); Z from the qibla wall (−2.5) back to the entrance (37.5).
 * The imam stands at X 0, Z 0, facing the qibla (−Z).
 */
export const LAYOUT = (() => {
  // Double the original hall's width (16 → 32 m), a long nave (40 m) and
  // half again its height (8.2 → 12 m): a vast, mostly empty hall round
  // the original small congregation (owner's brief).
  const x0 = -16,
    x1 = 16,
    z0 = -2.5,
    z1 = 37.5,
    wallH = 12,
    columnH = 9.5;
  const columnZ = [4, 12, 20, 28, 36];
  const columns = [];
  for (const x of [-10, 10]) for (const z of columnZ) columns.push([x, z]);
  const arches = [];
  for (const x of [-10, 10])
    for (let i = 1; i < columnZ.length; i++)
      arches.push([x, (columnZ[i - 1] + columnZ[i]) / 2]);
  // Grand chandeliers far overhead: one great one over the congregation,
  // then pairs down the nave.
  const lanterns = [
    [0, 5, 1.6],
    [-5, 14, 1.2],
    [5, 14, 1.2],
    [0, 22, 1.3],
    [-5, 30, 1.2],
    [5, 30, 1.2],
  ];
  const plants = [
    [-10, 0.4],
    [10, 0.4],
    [-14.9, -1.4],
    [14.9, -1.4],
    [-14.9, 36.4],
    [14.9, 36.4],
    [-10, 24],
    [10, 24],
  ];
  return {
    x0,
    x1,
    z0,
    z1,
    wallH,
    columnH,
    columnZ,
    columns,
    arches,
    archW: columnZ[1] - columnZ[0] - 0.8,
    ribs: columnZ,
    lanterns,
    lanternY: 8.4,
    plants,
    // The walnut screen across the hall, behind the men's two rows (as in
    // the original model), the women's rows beyond it.
    partition: { z: 5.9, x0: -7.6, x1: 7.6 },
    westWindows: [3, 11, 19, 27, 35],
    qiblaWindows: [-12.5, -7, 7, 12.5],
    windowH: 9.4,
    mihrabX: 0,
  };
})();

const V = (a) => new T.Vector3(...a),
  up = new T.Vector3(0, 1, 0),
  I = new T.Quaternion();
function archPoints(w, h) {
  const p = [
    [-w / 2, 0],
    [w / 2, 0],
    [w / 2, h * 0.6],
  ];
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    p.push([(w / 2) * (1 - t * t), h * 0.6 + h * 0.4 * t]);
  }
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    p.push([(-w / 2) * (2 * t - t * t), h * (1 - 0.4 * t)]);
  }
  p.push([-w / 2, 0]);
  return p.map(([x, y]) => new T.Vector2(x, y));
}
function archGeometry(w, h, thickness, depth) {
  const points =
    thickness > 0
      ? archPoints(w, h)
          .slice(1)
          .concat(
            archPoints(w - 2 * thickness, h - thickness * 1.5)
              .slice(1)
              .reverse(),
          )
      : archPoints(w, h);
  return new T.ExtrudeGeometry(new T.Shape(points), {
    depth,
    bevelEnabled: false,
    curveSegments: 16,
  });
}
function starGeometry(radius, inner) {
  const p = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      r = i % 2 ? inner : radius;
    p.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new T.ShapeGeometry(new T.Shape(p));
}
/** Is (u, y) inside a pointed-arch opening centred on c, w wide, h high? */
function inArch(u, y, c, w, bottom, h) {
  const du = Math.abs(u - c),
    wy = y - bottom,
    spring = h * 0.62;
  if (wy < 0 || wy >= h || du >= w / 2) return false;
  return wy < spring || du < (w / 2) * Math.sqrt((h - wy) / (h - spring));
}

export async function createGrandMosque() {
  const L = LAYOUT;
  const root = new T.Group();
  root.name = 'Grand mosque';
  const groups = {},
    queues = new Map(),
    mats = {},
    geoms = {
      box: new T.BoxGeometry(1, 1, 1),
      c6: new T.CylinderGeometry(1, 1, 1, 6),
      c8: new T.CylinderGeometry(1, 1, 1, 8),
      sphere: new T.IcosahedronGeometry(1, 1),
      star: starGeometry(0.28, 0.13),
    };
  const group = (name) => {
    if (!groups[name]) {
      groups[name] = new T.Group();
      groups[name].name = name;
      root.add(groups[name]);
    }
    return groups[name];
  };
  const material = (name, color, extra = {}) =>
    mats[name] ??
    (mats[name] = new T.MeshStandardMaterial({
      name,
      color,
      roughness: 0.85,
      ...extra,
    }));
  material('limestone', '#e7d5b7');
  material('sandstone', '#bda480');
  material('brass', '#bf9045', { metalness: 0.35, roughness: 0.32 });
  material('gold', '#dfbc72', { metalness: 0.5, roughness: 0.4 });
  material('walnut', '#543424');
  material('teal', '#164e56');
  material('tealBorder', '#143e46');
  material('cream', '#d3c69c');
  material('leaf', '#256942');
  material('bark', '#51412b');
  material('amber', '#dca34d', {
    emissive: '#ffad3e',
    emissiveIntensity: 0.75,
    roughness: 0.3,
  });
  material('glass', '#78b5ac', {
    transparent: true,
    opacity: 0.18,
    roughness: 0.25,
    metalness: 0.05,
    side: T.DoubleSide,
  });
  // The pack's authored material tiles.
  const loader = new T.TextureLoader();
  const W = L.x1 - L.x0,
    D = L.z1 - L.z0;
  for (const [name, target, rx, ry] of [
    ['carpet', 'teal', W / 2, D / 2],
    ['stone', 'limestone', 1, 1],
    ['wood', 'walnut', 1, 4],
    ['metal', 'brass', 1, 1],
  ]) {
    const t = await loader.loadAsync(
      new URL(`../pack/assets/${name}.png`, import.meta.url).href,
    );
    t.colorSpace = T.SRGBColorSpace;
    t.magFilter = T.NearestFilter;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(rx, ry);
    mats[target].map = t;
    mats[target].color.set(target === 'teal' ? '#225c68' : '#ffffff');
  }
  const add = (g, geo, pos, scale, mat, q = I, tint = null) => {
    const key = `${g}|${geo}|${mat}`;
    if (!queues.has(key)) queues.set(key, { g, geo, mat, items: [] });
    queues.get(key).items.push({ pos, scale, q: q.clone(), tint });
  };
  const box = (g, pos, scale, mat = 'limestone', q = I, tint = null) =>
    add(g, 'box', pos, scale, mat, q, tint);
  const beam = (g, a, b, width, depth, mat = 'limestone') => {
    const A = V(a),
      B = V(b),
      d = B.clone().sub(A);
    box(
      g,
      A.add(B).multiplyScalar(0.5).toArray(),
      [width, d.length(), depth],
      mat,
      new T.Quaternion().setFromUnitVectors(up, d.normalize()),
    );
  };
  let customs = 0;
  const mesh = (g, geometry, pos, mat, q = I) => {
    const key = 'custom' + customs++;
    geoms[key] = geometry;
    add(g, key, pos, [1, 1, 1], mat, q);
  };
  const cylinder = (g, p, r, h, mat = 'brass', segments = 8) =>
    add(g, segments === 6 ? 'c6' : 'c8', p, [r, h, r], mat);
  const star = (g, p, r, mat = 'gold') =>
    add(
      g,
      'star',
      p,
      [r / 0.28, r / 0.28, 1],
      mat,
      new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2),
    );
  const hash = (i) => {
    const n = Math.sin(i * 91.7 + 1.83) * 19273.17;
    return n - Math.floor(n);
  };
  const across = new T.Quaternion().setFromAxisAngle(up, Math.PI / 2);

  /* ── Floor: wall-to-wall carpet with star rosettes, the imam's mat ── */
  const cx = (L.x0 + L.x1) / 2,
    cz = (L.z0 + L.z1) / 2;
  box('Floor', [cx, -0.16, cz], [W + 0.8, 0.3, D + 0.8], 'sandstone');
  box('Floor', [cx, 0.005, cz], [W, 0.018, D], 'teal');
  for (const x of [L.x0 + 0.25, L.x1 - 0.25])
    box('Floor', [x, 0.02, cz], [0.12, 0.012, D - 0.4], 'gold');
  for (const z of [L.z0 + 0.25, L.z1 - 0.25])
    box('Floor', [cx, 0.02, z], [W - 0.4, 0.012, 0.12], 'gold');
  for (let x = L.x0 + 0.8; x <= L.x1 - 0.7; x += 1.2)
    for (let z = L.z0 + 0.8; z <= L.z1 - 0.7; z += 1.2) {
      star('Floor', [x, 0.026, z], 0.22, 'gold');
      star('Floor', [x, 0.027, z], 0.16, 'tealBorder');
      star('Floor', [x, 0.028, z], 0.075, 'cream');
      for (const s of [-1, 1])
        beam(
          'Floor',
          [x - 0.48, 0.025, z + s * 0.4],
          [x + 0.48, 0.025, z - s * 0.4],
          0.013,
          0.012,
          'cream',
        );
    }
  {
    const x = 0,
      z = -0.4;
    box('Imam-rug', [x, 0.035, z], [1.35, 0.03, 2.55], 'gold');
    box('Imam-rug', [x, 0.054, z], [1.24, 0.012, 2.42], 'tealBorder');
    box('Imam-rug', [x, 0.063, z], [1.08, 0.008, 2.23], 'teal');
    for (const dz of [-0.65, 0, 0.65])
      star('Imam-rug', [x, 0.072, z + dz], 0.25);
    for (let i = -0.6; i <= 0.61; i += 0.045)
      for (const s of [-1, 1])
        box(
          'Imam-rug',
          [x + i, 0.048, z + s * 1.34],
          [0.018, 0.018, 0.15],
          'cream',
        );
  }

  /* ── The two far walls: block masonry, arched windows, foliage outside ── */
  const rows = Math.round(L.wallH / 0.36);
  function window(g, along, at, wall, out) {
    // `along`: 'z' for the west wall (X = wall), 'x' for the qibla wall.
    const P = (u, y, d) =>
      along === 'z' ? [wall + d, y, u] : [u, y, wall + d];
    const q = along === 'z' ? across : I;
    mesh(
      g,
      archGeometry(2.6, L.windowH + 0.3, 0.18, 0.24),
      P(at, 1.18, out * -0.16),
      'sandstone',
      q,
    );
    mesh(g, archGeometry(2.3, L.windowH, 0, 0.015), P(at, 1.3, 0), 'glass', q);
    for (let d = -0.95; d <= 0.96; d += 0.38)
      beam(
        g,
        P(at + d, 1.4, out * -0.23),
        P(at + d, L.windowH, out * -0.23),
        0.035,
        0.035,
        'brass',
      );
    for (let yy = 1.8; yy < 7.2; yy += 0.45)
      beam(
        g,
        P(at - 1.1, yy, out * -0.24),
        P(at + 1.1, yy, out * -0.24),
        0.025,
        0.025,
        'brass',
      );
    for (let j = 0; j < 18; j++)
      add(
        g,
        'sphere',
        P(at + (hash(j * 3 + at) - 0.5) * 2.4, 2 + hash(j + at) * 6, out * 1.5),
        [0.55, 0.75, 0.55],
        'leaf',
        I,
        new T.Color(j % 2 ? '#426d36' : '#769349'),
      );
  }
  // West wall (X = x0): the afternoon sun streams in through its windows.
  for (let row = 0; row < rows; row++)
    for (let j = 0; j < D / 0.5; j++) {
      const z = L.z0 + 0.25 + j * 0.5 + (row % 2) * 0.25,
        y = 0.18 + row * 0.36;
      if (L.westWindows.some((c) => inArch(z, y, c, 2.3, 1.3, L.windowH)))
        continue;
      box(
        'West-wall',
        [L.x0, y, z],
        [0.32, 0.345, 0.485],
        'limestone',
        I,
        new T.Color().setHSL(0.1, 0.25, 0.78 + hash(row * 100 + j) * 0.08),
      );
    }
  for (const z of L.westWindows) window('West-wall', 'z', z, L.x0, -1);
  // Qibla wall (Z = z0): windows either side of the mihrab.
  for (let row = 0; row < rows; row++)
    for (let j = 0; j < W / 0.5; j++) {
      const x = L.x0 + 0.25 + j * 0.5 + (row % 2) * 0.25,
        y = 0.18 + row * 0.36;
      if (inArch(x, y, L.mihrabX, 3.6, 0, 8.2)) continue;
      if (L.qiblaWindows.some((c) => inArch(x, y, c, 2.3, 1.3, L.windowH)))
        continue;
      box(
        'Qibla-wall',
        [x, y, L.z0],
        [0.485, 0.345, 0.34],
        'limestone',
        I,
        new T.Color().setHSL(0.1, 0.25, 0.8 + hash(row * 200 + j) * 0.07),
      );
    }
  for (const x of L.qiblaWindows) window('Qibla-wall', 'x', x, L.z0, -1);
  // The mihrab: a tall recessed, warmly lit arch, framed in gold.
  mesh(
    'Qibla-wall',
    archGeometry(4.9, 8.9, 0.3, 0.3),
    [L.mihrabX, 0.02, L.z0 + 0.18],
    'sandstone',
  );
  mesh(
    'Qibla-wall',
    archGeometry(4.3, 8.5, 0, 0.02),
    [L.mihrabX, 0.02, L.z0 - 0.12],
    'gold',
  );
  mesh(
    'Qibla-wall',
    archGeometry(4.1, 8.25, 0, 0.025),
    [L.mihrabX, 0.02, L.z0 + 0.02],
    'sandstone',
  );
  mesh(
    'Mihrab',
    archGeometry(4.3, 8.5, 0.08, 0.08),
    [L.mihrabX, 0.02, L.z0 + 0.24],
    'amber',
  );
  box('Mihrab', [L.mihrabX, 0.06, L.z0 + 0.3], [4.4, 0.12, 0.7], 'sandstone');
  {
    const l = new T.PointLight('#ffcc83', 60, 10, 2);
    l.position.set(L.mihrabX, 3.5, L.z0 + 1);
    group('Lighting').add(l);
  }
  // Wall sconces between the windows.
  for (let i = 1; i < L.westWindows.length; i++) {
    const z = (L.westWindows[i - 1] + L.westWindows[i]) / 2;
    box('West-wall', [L.x0 + 0.38, 3.6, z], [0.25, 0.75, 0.3], 'brass');
    box('West-wall', [L.x0 + 0.57, 3.6, z], [0.22, 0.53, 0.22], 'amber');
  }
  for (let i = 1; i < L.qiblaWindows.length; i++) {
    const x = (L.qiblaWindows[i - 1] + L.qiblaWindows[i]) / 2;
    if (Math.abs(x - L.mihrabX) < 3) continue;
    box('Qibla-wall', [x, 3.6, L.z0 + 0.38], [0.3, 0.75, 0.25], 'brass');
    box('Qibla-wall', [x, 3.6, L.z0 + 0.57], [0.22, 0.53, 0.22], 'amber');
  }

  /* ── Twin rows of massive pillars, side arcades and vault ribs ── */
  const H = L.columnH;
  for (const [x, z] of L.columns) {
    box('Colonnades', [x, 0.2, z], [1.5, 0.4, 1.5], 'sandstone');
    box('Colonnades', [x, 0.5, z], [1.2, 0.2, 1.2]);
    cylinder('Colonnades', [x, H / 2 + 0.3, z], 0.52, H - 0.6, 'limestone');
    for (let y = 0.9; y < H - 0.2; y += 0.42)
      cylinder('Colonnades', [x, y, z], 0.53, 0.03, 'sandstone');
    for (let k = 0; k < 4; k++)
      box(
        'Colonnades',
        [x, H + k * 0.16, z],
        [0.9 + k * 0.18, 0.16, 0.9 + k * 0.18],
      );
  }
  for (const [x, z] of L.arches)
    mesh(
      'Colonnades',
      archGeometry(L.archW, 3.4, 0.3, 0.32),
      [x, H + 0.6, z],
      'limestone',
      across,
    );
  for (const z of L.ribs)
    mesh(
      'Vaults',
      archGeometry(20.6, 3.8, 0.32, 0.34),
      [0, H + 0.6, z],
      'limestone',
    );

  /* ── Tiered hexagonal brass chandeliers (the pack's design) ── */
  function lantern(x, z, scale, y) {
    const g = 'Lanterns';
    beam(g, [x, y + 1.5 * scale, z], [x, L.wallH, z], 0.04, 0.04, 'brass');
    for (const [radius, h, dy] of [
      [0.68, 1.0, 0],
      [0.48, 0.32, 0.7],
      [0.27, 0.24, 1.1],
    ]) {
      cylinder(
        g,
        [x, y + dy * scale, z],
        radius * scale,
        h * scale,
        'amber',
        6,
      );
      for (const sy of [-1, 1])
        cylinder(
          g,
          [x, y + (dy + (sy * h) / 2) * scale, z],
          (radius + 0.06) * scale,
          0.09 * scale,
          'brass',
          6,
        );
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        beam(
          g,
          [
            x + Math.cos(a) * radius * scale,
            y + (dy - h / 2) * scale,
            z + Math.sin(a) * radius * scale,
          ],
          [
            x + Math.cos(a) * radius * scale,
            y + (dy + h / 2) * scale,
            z + Math.sin(a) * radius * scale,
          ],
          0.05 * scale,
          0.05 * scale,
          'brass',
        );
      }
    }
    cylinder(
      g,
      [x, y - 0.68 * scale, z],
      0.28 * scale,
      0.22 * scale,
      'brass',
      6,
    );
    const l = new T.PointLight('#ffc27d', 22 * scale, 13, 2);
    l.position.set(x, y - 0.4, z);
    group('Lighting').add(l);
  }
  for (const [x, z, s] of L.lanterns) lantern(x, z, s, L.lanternY);

  /* ── The walnut mashrabiya between the men's and women's rows ── */
  {
    const { z: Z, x0: a, x1: b } = L.partition;
    for (let x = a; x <= b + 0.01; x += (b - a) / 6) {
      box('Partition', [x, 0.93, Z], [0.15, 1.86, 0.18], 'walnut');
      cylinder('Partition', [x, 1.91, Z], 0.15, 0.14, 'brass');
    }
    for (const y of [0.13, 0.38, 1.65])
      box('Partition', [(a + b) / 2, y, Z], [b - a, 0.12, 0.15], 'walnut');
    for (let x = a + 0.15; x < b; x += 0.35)
      for (let y = 0.6; y < 1.6; y += 0.35) {
        for (const s of [-1, 1])
          beam(
            'Partition',
            [x - 0.16, y - 0.16, Z - 0.01],
            [x + 0.16, y + s * 0.16, Z - 0.01],
            0.028,
            0.055,
            'walnut',
          );
        beam(
          'Partition',
          [x - 0.16, y + 0.16, Z - 0.01],
          [x + 0.16, y - 0.16, Z - 0.01],
          0.028,
          0.055,
          'gold',
        );
      }
  }

  /* ── Palms and ferns in golden brass planters (the pack's design) ── */
  function plant(x, z) {
    const g = 'Plants';
    cylinder(g, [x, 0.34, z], 0.45, 0.65, 'brass');
    cylinder(g, [x, 0.67, z], 0.48, 0.08, 'gold');
    cylinder(g, [x, 0.7, z], 0.38, 0.025, 'bark');
    beam(g, [x, 0.7, z], [x, 1.9, z], 0.06, 0.06, 'bark');
    for (let j = 0; j < 12; j++) {
      const a = (j * Math.PI) / 6,
        height = 1.2 + (j % 3) * 0.28;
      let prev = [x, 1.5, z];
      for (let k = 1; k <= 6; k++) {
        const f = k / 6,
          p = [
            x + Math.cos(a) * f * 0.9,
            1.5 + Math.sin(f * Math.PI) * height * 0.4 + f * 0.05,
            z + Math.sin(a) * f * 0.9,
          ];
        beam(g, prev, p, 0.025, 0.025, 'leaf');
        for (const s of [-1, 1])
          beam(
            g,
            p,
            [
              p[0] + Math.cos(a + s * 0.9) * 0.2 * (1 - f * 0.65),
              p[1] + 0.015,
              p[2] + Math.sin(a + s * 0.9) * 0.2 * (1 - f * 0.65),
            ],
            0.075,
            0.035,
            'leaf',
          );
        prev = p;
      }
    }
  }
  for (const [x, z] of L.plants) plant(x, z);

  /* ── Instanced meshes, as in the pack ── */
  const dummy = new T.Object3D();
  for (const [key, { g, geo, mat, items }] of queues) {
    const m = new T.InstancedMesh(geoms[geo], mats[mat], items.length);
    m.name = key;
    m.castShadow = true;
    m.receiveShadow = true;
    items.forEach((p, i) => {
      dummy.position.copy(V(p.pos));
      dummy.quaternion.copy(p.q);
      dummy.scale.set(...p.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (p.tint) m.setColorAt(i, p.tint);
    });
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    group(g).add(m);
  }
  return { root, groups, materials: mats, layout: L };
}
