/*
 * Ibn al-Haytham's figure (tools/prepare-haytham.ts), modelled in three.js
 * after the owner's character turnaround (Ibn-al-Haytham-Character-Collection,
 * assets/scholar-turnaround.png): a big wrapped crimson turban over a dark
 * cap, a long dark beard touched with grey, a heavy woven brown cloak with
 * embroidered gold edges and wide sleeves, a rust robe with a gold placket
 * and hem, a cream collar and cuffs, brown leather shoes and the green
 * Book of Optics. An artistic interpretation, not an authenticated likeness.
 *
 * Model units: he stands 5.04 tall on y = 0 facing +Z. The joints and their
 * pivots match the collection's voxel scholar (model.js), so the optics
 * workflow's poses (poses.js) drive this figure unchanged: `head`,
 * `leftArm` (−X) and `rightArm` (+X) turn about their pivots; `book` is
 * shown only in his card picture. At rest his hands meet at his chest
 * (HAND in render.html).
 *
 * Everything is deterministic: fabric weave, knit and hair strands come
 * from a positional hash, never from Math.random.
 */
export const PIVOTS = {
  body: [0, 0, 0],
  head: [0, 3.79, -0.02],
  leftArm: [-0.64, 3.43, -0.015],
  rightArm: [0.64, 3.43, -0.015],
  book: [0, 2.845, 0.81],
};

export function buildFigure(T) {
  /* ── Colour, noise and interpolation helpers ── */
  const C = (hex) => new T.Color(hex);
  const PAL = {
    turban: C('#7a1c22'),
    turbanLight: C('#a8343a'),
    turbanDeep: C('#3e0c10'),
    cap: C('#2a1f1a'),
    skin: C('#b88262'),
    skinLight: C('#cf9c78'),
    skinWarm: C('#b9735a'),
    skinShade: C('#8c5a40'),
    lip: C('#8a4c3e'),
    mouth: C('#3a2017'),
    sclera: C('#d4c6ae'),
    iris: C('#2a1b12'),
    lid: C('#5a3626'),
    brow: C('#2a1e17'),
    hair: C('#2b211b'),
    grey: C('#7d746a'),
    cloak: C('#5f3a21'),
    cloakLight: C('#7f5130'),
    cloakDeep: C('#3b2314'),
    gold: C('#a47a3b'),
    goldDark: C('#5e4220'),
    robe: C('#8e4428'),
    robeLight: C('#ad5a35'),
    robeDeep: C('#64301c'),
    cream: C('#d6c49f'),
    creamShade: C('#ad9a76'),
    leather: C('#6a4227'),
    leatherDark: C('#41281a'),
    cover: C('#2c4d30'),
    coverDark: C('#1d3420'),
    pages: C('#e0d3b2'),
  };
  const mix = (a, b, t) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));
  const scale = (c, f) => c.clone().multiplyScalar(f);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const g = (a, b) => Math.exp(-(a * a + b * b));
  function hash(a, b, c = 0, d = 0) {
    let h = 2166136261;
    for (const v of [a, b, c, d]) {
      h = Math.imul(h ^ (v | 0), 16777619);
      h ^= h >>> 13;
    }
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  /** Weave: a value per small cell of the cloth, so it reads as woven pixels. */
  const weave = (x, y, z, s, seed) =>
    hash(Math.floor(x / s), Math.floor(y / s), Math.floor(z / s), seed);
  /** Piecewise smooth interpolation over [[y, value], ...] (y ascending). */
  function table(rows) {
    return (y) => {
      if (y <= rows[0][0]) return rows[0][1];
      for (let i = 0; i < rows.length - 1; i++) {
        const [y0, a] = rows[i],
          [y1, b] = rows[i + 1];
        if (y <= y1) {
          const t = (y - y0) / (y1 - y0);
          return a + (b - a) * t * t * (3 - 2 * t);
        }
      }
      return rows[rows.length - 1][1];
    };
  }

  /* ── Mesh building: a (u, v) grid → one vertex-coloured mesh ── */
  const MATS = {};
  function material(kind) {
    const spec = {
      cloth: { roughness: 0.95 },
      skin: { roughness: 0.74 },
      hair: { roughness: 0.9 },
      leather: { roughness: 0.7 },
      book: { roughness: 0.75 },
    }[kind];
    return (MATS[kind] ??= new T.MeshStandardMaterial({
      vertexColors: true,
      side: T.DoubleSide,
      metalness: 0,
      ...spec,
    }));
  }
  function surface(nu, nv, fn, kind = 'cloth') {
    const pos = [],
      col = [],
      idx = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const { p, c } = fn(i / nu, j / nv);
        pos.push(p[0], p[1], p[2]);
        col.push(c.r, c.g, c.b);
      }
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i,
          b = a + 1,
          c = a + nu + 1,
          d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, material(kind));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
  /** An ellipsoid (centre, radii), coloured per point. */
  function ellipsoid(c, r, colour, kind = 'cloth', n = 40) {
    return surface(
      n,
      Math.round(n * 0.7),
      (u, v) => {
        const th = u * 2 * Math.PI,
          ph = (v - 0.5) * Math.PI;
        const p = [
          c[0] + r[0] * Math.cos(ph) * Math.sin(th),
          c[1] + r[1] * Math.sin(ph),
          c[2] + r[2] * Math.cos(ph) * Math.cos(th),
        ];
        return { p, c: colour(p, u, v) };
      },
      kind,
    );
  }
  /**
   * A tube from a to b: radius r(t), and a droop that pulls the lower half of
   * each ring down (a hanging sleeve), coloured per point.
   */
  function tube(a, b, r, droop, colour, kind = 'cloth', nu = 40, nv = 24) {
    const A = new T.Vector3(...a),
      B = new T.Vector3(...b);
    const axis = B.clone().sub(A).normalize();
    const down = new T.Vector3(0, -1, 0);
    down.sub(axis.clone().multiplyScalar(down.dot(axis)));
    if (down.lengthSq() < 1e-6) down.set(0, 0, 1);
    down.normalize();
    const side = new T.Vector3().crossVectors(axis, down).normalize();
    return surface(
      nu,
      nv,
      (u, v) => {
        const ph = u * 2 * Math.PI,
          s = Math.sin(ph),
          rad = r(v);
        const p = A.clone()
          .lerp(B, v)
          .addScaledVector(side, rad * Math.cos(ph))
          .addScaledVector(down, rad * s + Math.max(0, s) ** 2 * droop(v));
        const out = p.toArray();
        return { p: out, c: colour(out, u, v) };
      },
      kind,
    );
  }

  /* ── Cloth colours ── */
  function cloakColour(p, trim = 0) {
    // Heavy wool: chunky woven cells, a few darker threads.
    const w = weave(p[0], p[1], p[2], 0.018, 1),
      w2 = weave(p[0] + 0.009, p[1], p[2], 0.036, 2);
    let c = mix(PAL.cloakDeep, PAL.cloakLight, 0.35 + 0.45 * w + 0.2 * w2);
    if (trim > 0) {
      // Embroidered border: gold band, dark edge lines, a small repeat.
      const motif = weave(p[0], p[1], p[2], 0.022, 7) > 0.55;
      c = mix(PAL.goldDark, PAL.gold, motif ? 0.95 : 0.55);
      if (trim > 0.85 || trim < 0.15) c = scale(PAL.goldDark, 0.9);
    }
    return c;
  }
  function robeColour(p) {
    const w = weave(p[0], p[1], p[2], 0.016, 3);
    return mix(PAL.robeDeep, PAL.robeLight, 0.3 + 0.5 * w);
  }
  const goldColour = (p) =>
    mix(PAL.goldDark, PAL.gold, 0.45 + 0.55 * weave(p[0], p[1], p[2], 0.02, 4));
  const creamColour = (p) =>
    mix(
      PAL.creamShade,
      PAL.cream,
      0.5 + 0.5 * weave(p[0], p[1], p[2], 0.02, 5),
    );
  const skinColour = (p) =>
    mix(
      PAL.skin,
      PAL.skinLight,
      0.25 + 0.3 * weave(p[0], p[1], p[2], 0.012, 6),
    );
  function hairColour(p, greyness = 0.25) {
    // Strands: thin vertical streaks of dark brown and grey.
    const strand = hash(
        Math.floor(p[0] / 0.009),
        Math.floor(p[1] / 0.04),
        Math.floor(p[2] / 0.009),
        9,
      ),
      fine = weave(p[0], p[1], p[2], 0.008, 10);
    let c = mix(PAL.hair, scale(PAL.hair, 1.5), fine);
    if (strand < greyness) c = mix(c, PAL.grey, 0.5);
    return c;
  }

  /* ── Groups on their pivots ── */
  const root = new T.Group(),
    joints = {};
  for (const [name, pv] of Object.entries(PIVOTS)) {
    const j = new T.Group();
    j.position.set(...pv);
    j.rotation.order = 'ZYX';
    root.add(j);
    joints[name] = j;
  }
  /** Adds a mesh built in figure coordinates to a joint. */
  function add(joint, mesh) {
    const pv = PIVOTS[joint];
    mesh.geometry.translate(-pv[0], -pv[1], -pv[2]);
    joints[joint].add(mesh);
  }

  /* ── The body: rust robe under a heavy open cloak ── */
  const robeRx = table([
    [0.08, 0.64],
    [0.6, 0.58],
    [1.5, 0.5],
    [2.3, 0.45],
    [2.9, 0.48],
    [3.3, 0.55],
    [3.42, 0.58],
  ]);
  const robeRz = table([
    [0.08, 0.5],
    [0.6, 0.44],
    [1.5, 0.37],
    [2.3, 0.32],
    [2.9, 0.33],
    [3.3, 0.3],
    [3.42, 0.28],
  ]);
  /** Shoulders rounding in to the neck above y0. */
  function shoulder(y, y0, y1, r, neck) {
    if (y <= y0) return r;
    const t = clamp((y - y0) / (y1 - y0));
    return neck + (r - neck) * Math.sqrt(1 - t * t);
  }
  const ROBE = { y0: 0.08, y1: 3.7 };
  add(
    'body',
    surface(
      180,
      200,
      (u, v) => {
        const y = ROBE.y0 + (ROBE.y1 - ROBE.y0) * v,
          th = (u - 0.5) * 2 * Math.PI; // 0 = front
        const rx = shoulder(y, 3.42, 3.7, robeRx(Math.min(y, 3.42)), 0.15),
          rz = shoulder(y, 3.42, 3.7, robeRz(Math.min(y, 3.42)), 0.14);
        const fold = 0.012 * Math.sin(th * 9 + y) * smooth(2.4, 0.3, y);
        const p = [
          (rx + fold) * Math.sin(th),
          y,
          0.03 + (rz + fold) * Math.cos(th),
        ];
        let c = robeColour(p);
        const front = Math.abs(p[0]) < 0.022 && Math.cos(th) > 0;
        if (front && y < 3.42) c = goldColour(p); // the gold placket
        if (y < 0.2) c = goldColour(p); // the hem band
        if (y > 2.27 && y < 2.36) c = scale(PAL.robeDeep, 0.85); // a sash
        // The cream collar of the shirt beneath, at the neck.
        if (y > 3.5 && Math.cos(th) > 0.55) c = creamColour(p);
        return { p, c };
      },
      'cloth',
    ),
  );
  // The cloak: open at the front, wider and folded towards the hem.
  const CLOAK = { y0: 0.2, y1: 3.76 };
  const gap = table([
    [0.2, 0.36],
    [1.5, 0.3],
    [2.9, 0.2],
    [3.5, 0.09],
    [3.76, 0.1],
  ]);
  add(
    'body',
    surface(
      240,
      230,
      (u, v) => {
        const y = CLOAK.y0 + (CLOAK.y1 - CLOAK.y0) * v;
        const yr = Math.min(y, 3.3);
        const extra = 0.07 + 0.13 * smooth(2.6, 0.2, y);
        const rx = shoulder(y, 3.3, 3.76, robeRx(yr) + extra, 0.2),
          rz = shoulder(y, 3.3, 3.76, robeRz(yr) + extra, 0.19);
        const th0 = Math.asin(clamp(gap(y) / rx, 0, 0.99));
        const th = th0 + u * (2 * Math.PI - 2 * th0); // round from the right edge
        // Folds deepen towards the hem; they wander a little with height.
        const amp =
          (0.035 + 0.045 * Math.max(0, -Math.cos(th))) * smooth(3.3, 0.4, y);
        const fold =
          amp *
          (Math.sin(th * 7 + 0.7 * Math.sin(y * 1.4)) * 0.6 +
            Math.sin(th * 12 + 2.1 + 0.4 * y) * 0.4);
        const p = [
          (rx + fold) * Math.sin(th),
          y,
          0.03 + (rz + fold) * Math.cos(th),
        ];
        // Distance from the opening edge and the hem, for the gold border.
        const edge = Math.min(u, 1 - u) * (2 * Math.PI - 2 * th0) * rx;
        const B = 0.06;
        let trim = 0;
        if (edge < B) trim = edge / B;
        else if (y - CLOAK.y0 < B) trim = (y - CLOAK.y0) / B;
        // The thick collar round the neck.
        if (y > 3.6) trim = 0;
        return { p, c: cloakColour(p, trim) };
      },
      'cloth',
    ),
  );
  // The neck, and the shirt's standing collar.
  add(
    'body',
    tube(
      [0, 3.6, 0.0],
      [0, 3.95, -0.01],
      () => 0.105,
      () => 0,
      skinColour,
      'skin',
    ),
  );
  add(
    'body',
    tube(
      [0, 3.6, 0.01],
      [0, 3.74, 0.0],
      (v) => 0.15 - v * 0.02,
      () => 0,
      creamColour,
    ),
  );
  // Leather shoes, toes showing beneath the hem.
  for (const s of [-1, 1])
    add(
      'body',
      ellipsoid(
        [s * 0.19, 0.07, 0.3],
        [0.11, 0.08, 0.21],
        (p) =>
          mix(
            PAL.leatherDark,
            PAL.leather,
            0.3 + 0.7 * smooth(0.0, 0.12, p[1]),
          ),
        'leather',
      ),
    );

  /* ── The arms: cloak sleeves, wide and hanging at the cuff ── */
  for (const [name, s] of [
    ['leftArm', -1],
    ['rightArm', 1],
  ]) {
    const S = [0.5 * s, 3.26, -0.02],
      E = [0.66 * s, 2.6, 0.02],
      W = [0.53 * s, 2.66, 0.64],
      H = [0.48 * s, 2.69, 0.855];
    add(
      name,
      tube(
        S,
        E,
        (v) => 0.15 + 0.05 * v,
        () => 0,
        (p) => cloakColour(p),
      ),
    );
    add(
      name,
      ellipsoid(E, [0.2, 0.2, 0.2], (p) => cloakColour(p)),
    );
    add(
      name,
      tube(
        E,
        W,
        (v) => 0.19 + 0.05 * v * v,
        (v) => 0.16 * v * v,
        (p, u, v) => cloakColour(p, v > 0.9 ? (v - 0.9) / 0.1 : 0),
        'cloth',
        48,
        30,
      ),
    );
    // Cream cuff and the hand.
    add(
      name,
      tube(
        [W[0] * 0.98, W[1], W[2] - 0.06],
        [H[0] * 1.02, H[1] - 0.01, H[2] - 0.08],
        () => 0.075,
        () => 0,
        creamColour,
      ),
    );
    add(
      name,
      ellipsoid(
        H,
        [0.06, 0.1, 0.085],
        (p) =>
          mix(
            PAL.skinShade,
            skinColour(p),
            0.55 + 0.45 * smooth(H[1] - 0.08, H[1] + 0.06, p[1]),
          ),
        'skin',
      ),
    );
    // A thumb over the book's edge.
    add(
      name,
      ellipsoid(
        [H[0] - 0.045 * s, H[1] + 0.04, H[2] + 0.06],
        [0.025, 0.05, 0.03],
        skinColour,
        'skin',
        20,
      ),
    );
  }

  /* ── The book (his card picture only) ── */
  {
    const [bx, by, bz] = PIVOTS.book;
    const book = new T.Group();
    const box = (w, h, d, x, y, z, colour) => {
      const m = new T.Mesh(
        new T.BoxGeometry(w, h, d),
        new T.MeshStandardMaterial({ color: colour, roughness: 0.75 }),
      );
      m.position.set(x - bx, y - by, z - bz);
      m.castShadow = m.receiveShadow = true;
      book.add(m);
    };
    box(0.86, 0.62, 0.035, bx, by, bz + 0.07, PAL.cover);
    box(0.86, 0.62, 0.035, bx, by, bz - 0.07, PAL.coverDark);
    box(0.82, 0.58, 0.11, bx + 0.01, by, bz, PAL.pages);
    box(0.035, 0.62, 0.175, bx - 0.43, by, bz, PAL.coverDark);
    joints.book.add(book);
  }

  /* ── The head ── */
  const HC = [0, 4.08, 0.0],
    HR = [0.25, 0.32, 0.29];
  /** The face's features: a displacement (outwards) and a colour, from the front-relative position. */
  function face(x, y, z) {
    const ax = Math.abs(x),
      front = smooth(0.04, 0.2, z);
    let d = 0,
      c = skinColour([x, y + HC[1], z]);
    // Warmth on the cheeks and nose, shade under the brow.
    c = mix(
      c,
      PAL.skinWarm,
      0.5 * g((ax - 0.12) / 0.06, (y + 0.01) / 0.05) * front,
    );
    // Nose: bridge, tip, wings.
    d +=
      front *
      (0.08 * g(x / 0.032, (y + 0.02) / 0.05) +
        0.045 * g(x / 0.026, (y - 0.04) / 0.06) +
        0.022 * g((ax - 0.034) / 0.02, (y + 0.045) / 0.02));
    // Brow ridge, eye sockets, cheekbones.
    d += front * 0.02 * g(x / 0.15, (y - 0.1) / 0.025);
    d -= front * 0.02 * g((ax - 0.085) / 0.04, (y - 0.065) / 0.028);
    d += front * 0.014 * g((ax - 0.13) / 0.05, (y + 0.0) / 0.04);
    c = mix(
      c,
      PAL.skinShade,
      0.45 * front * g((ax - 0.085) / 0.05, (y - 0.075) / 0.03),
    );
    c = mix(c, PAL.skinWarm, 0.5 * front * g(x / 0.03, (y + 0.03) / 0.03));
    // Eyes: whites, dark irises, the upper lid line.
    const ex = (ax - 0.085) / 0.032,
      ey = (y - 0.064) / 0.014;
    if (front > 0.5 && ex * ex + ey * ey < 1) {
      c = PAL.sclera.clone();
      const ix = ax - 0.083,
        iy = y - 0.063;
      if (ix * ix + iy * iy < 0.0125 ** 2) c = PAL.iris.clone();
    } else if (
      front > 0.5 &&
      Math.abs(ax - 0.085) < 0.036 &&
      y - 0.064 > 0.011 &&
      y - 0.064 < 0.022
    )
      c = PAL.lid.clone();
    // Brows: dark, slightly lower at the outer ends.
    const browY = 0.108 - 0.12 * Math.max(0, ax - 0.1);
    if (front > 0.3 && ax > 0.025 && ax < 0.155 && Math.abs(y - browY) < 0.011)
      c = mix(PAL.brow, PAL.hair, weave(x, y, z, 0.006, 11));
    // Moustache drooping into the beard; the lower lip beneath.
    const mTop = -0.062 - 0.15 * ax,
      mBot = -0.112 - 0.3 * Math.max(0, ax - 0.03);
    let hair = 0;
    if (front > 0.2 && ax < 0.13 && y < mTop && y > mBot) hair = 0.6;
    const lipBand = front > 0.4 && y < -0.112 && y > -0.13 && ax < 0.042;
    if (lipBand)
      c = y > -0.118 && ax < 0.035 ? PAL.mouth.clone() : PAL.lip.clone();
    // The beard: cheeks below the line from the sideburns to the mouth, the chin.
    const line = Math.min(0.11, -0.07 + 0.85 * Math.max(0, ax - 0.06));
    if (!lipBand && y < line && !(hair && y > mBot)) hair = 1;
    if (ax > 0.17 && y < 0.11 && z > 0.0 && z < 0.09) hair = 1; // sideburns
    if (z < -0.06 && y < 0.2) hair = 1; // hair beneath the turban at the back
    if (hair && !lipBand) {
      const p = [x, y + HC[1], z];
      c = hairColour(p, y < -0.1 ? 0.28 : 0.15);
      // Only the beard and moustache stand proud; the hair behind lies flat.
      if (z > -0.03)
        d +=
          0.02 * hair +
          0.01 *
            hash(
              Math.floor(x / 0.012),
              Math.floor(y / 0.024),
              Math.floor(z / 0.012),
              12,
            );
    }
    return { d, c };
  }
  add(
    'head',
    surface(
      220,
      170,
      (u, v) => {
        const th = (u - 0.5) * 2 * Math.PI,
          ph = (v - 0.5) * Math.PI;
        let x = HR[0] * Math.cos(ph) * Math.sin(th),
          y = HR[1] * Math.sin(ph),
          z = HR[2] * Math.cos(ph) * Math.cos(th);
        // A narrower jaw and a fuller back of the head.
        if (y < 0) {
          const t = (-y / HR[1]) ** 1.6;
          x *= 1 - 0.3 * t;
          if (z > 0) z *= 1 - 0.12 * t;
        }
        if (z < 0) z *= 1.08;
        const { d, c } = face(x, y, z);
        const n = new T.Vector3(
          x / HR[0] ** 2,
          y / HR[1] ** 2,
          z / HR[2] ** 2,
        ).normalize();
        return {
          p: [HC[0] + x + n.x * d, HC[1] + y + n.y * d, HC[2] + z + n.z * d],
          c,
        };
      },
      'skin',
    ),
  );
  // Ears.
  for (const s of [-1, 1])
    add(
      'head',
      ellipsoid(
        [s * 0.248, 4.11, -0.03],
        [0.04, 0.07, 0.05],
        (p) =>
          mix(
            PAL.skinShade,
            PAL.skin,
            0.25 + 0.5 * smooth(-0.07, 0.0, p[2] + 0.0),
          ),
        'skin',
        18,
      ),
    );
  // The long beard hanging over the chest, in wavy strands.
  {
    const rx = table([
        [0, 0.2],
        [0.25, 0.215],
        [0.6, 0.15],
        [1, 0.035],
      ]),
      rz = table([
        [0, 0.12],
        [0.3, 0.12],
        [0.7, 0.08],
        [1, 0.025],
      ]),
      zc = table([
        [0, 0.15],
        [0.4, 0.2],
        [1, 0.24],
      ]);
    add(
      'head',
      surface(
        96,
        70,
        (u, v) => {
          const th = (u - 0.5) * 2 * Math.PI,
            y = 3.93 - 0.6 * v;
          const wave = 0.012 * Math.sin(th * 16 + y * 22) * smooth(0, 0.3, v);
          const p = [
            (rx(v) + wave) * Math.sin(th),
            y,
            zc(v) + (rz(v) + wave) * Math.cos(th),
          ];
          return { p, c: hairColour(p, 0.22 + 0.15 * v) };
        },
        'hair',
      ),
    );
  }
  // The dark cap showing beneath the turban at the forehead.
  add(
    'head',
    surface(
      120,
      8,
      (u, v) => {
        const th = (u - 0.5) * 2 * Math.PI,
          y = 4.22 + 0.1 * v;
        const k = Math.sqrt(1 - ((y - HC[1]) / HR[1]) ** 2) * 1.08 + 0.01;
        const p = [
          HR[0] * k * Math.sin(th),
          y,
          HR[2] * k * Math.cos(th) * (Math.cos(th) < 0 ? 1.08 : 1),
        ];
        return {
          p,
          c: mix(
            PAL.cap,
            scale(PAL.cap, 1.4),
            weave(p[0], p[1], p[2], 0.015, 13),
          ),
        };
      },
      'cloth',
    ),
  );
  // The turban: a great wrapped crimson mass, its bands crossing at the front.
  {
    const TC = [0, 4.53, -0.03];
    const r = table([
      [4.29, 0.28],
      [4.34, 0.355],
      [4.43, 0.39],
      [4.54, 0.39],
      [4.65, 0.35],
      [4.73, 0.28],
      [4.79, 0.17],
      [4.82, 0.06],
      [4.83, 0.0],
    ]);
    add(
      'head',
      surface(
        220,
        150,
        (u, v) => {
          const th = (u - 0.5) * 2 * Math.PI,
            y0 = 4.29 + (4.83 - 4.29) * v;
          // The back sits a little lower than the brow.
          const y = y0 - 0.05 * (1 - Math.cos(th)) * (1 - v);
          const R = r(y0);
          // Bands: a V over the front and back, ridged, with a knit texture.
          const b =
            (y0 - 4.29) / 0.105 +
            (1.3 * Math.abs(Math.sin(th)) + 0.8 * Math.sin(th + 0.6)) *
              (1 - 0.6 * v);
          const f = b - Math.floor(b),
            ridge = Math.sin(Math.PI * f);
          const top = smooth(4.72, 4.83, y0);
          const d = (0.032 * ridge ** 0.7 - 0.012) * (1 - top);
          const nx = Math.sin(th),
            nz = Math.cos(th),
            up = smooth(4.56, 4.83, y0);
          const p = [
            TC[0] + (R + d * (1 - up)) * nx,
            y + d * up,
            TC[2] + (R * 0.97 + d * (1 - up)) * nz,
          ];
          const stitch = hash(
            Math.floor((th * 0.44) / 0.016),
            Math.floor(b * 4),
            14,
          );
          let c = mix(PAL.turbanDeep, PAL.turban, 0.35 + 0.65 * ridge ** 0.6);
          c = mix(c, PAL.turbanLight, 0.45 * ridge * stitch);
          if (stitch < 0.12) c = scale(c, 0.8);
          return { p, c };
        },
        'cloth',
      ),
    );
  }

  return { root, joints };
}
