/*
 * Ibn al-Haytham's figure (tools/prepare-haytham.ts), modelled in three.js
 * after the owner's character turnaround (Ibn-al-Haytham-Character-Collection,
 * assets/scholar-turnaround.png), which is also its texture source:
 *
 *   - his face, beard and turban are the turnaround's own painting, projected
 *     onto the 3D head from its front, profile and back views (camera
 *     projection), so the face stays the real painted face;
 *   - his clothes are tiled from patches of the painting: the heavy woven
 *     brown cloak, its embroidered gold edge, the rust robe, the cream cuffs
 *     and collar, the leather shoes, the skin of his hands;
 *   - every material is physically based, with the painting's own light and
 *     dark as a relief (bump) map, cloth sheen, and soft skin highlights, so
 *     the figure takes the scene's light and reflections like a real object.
 *
 * Proportions follow the turnaround: about 195 of its pixels to a model unit,
 * the soles at image y = 1000 in all three views. Model units: he stands 5.04
 * tall on y = 0 facing +Z. The head, arms and book turn about pivots
 * (PIVOTS); render.html poses them through the optics workflow (poses.js).
 * At rest his hands meet at his chest (REST.hand). An artistic
 * interpretation, not an authenticated likeness.
 *
 * Deterministic: no random numbers; the painting is the only input.
 */
export const PIVOTS = {
  body: [0, 0, 0],
  head: [0, 4.0, -0.02],
  leftArm: [-0.6, 3.74, -0.02],
  rightArm: [0.6, 3.74, -0.02],
  book: [0, 3.1, 0.8],
};
/** Rest positions the poses are solved from. */
export const REST = {
  hand: { leftArm: [-0.42, 3.02, 0.8], rightArm: [0.42, 3.02, 0.8] },
  chin: [0, 4.02, 0.45], // a hand raised to the beard
  eye: [0, 0.43, 0.3], // from the head pivot
};

/* ── The turnaround's geometry (pixels of the 1536×1024 painting) ── */
const IMG = { w: 1536, h: 1024, px: 195, floor: 1000 };
const FRONT = { cx: 297, yaw: (24 * Math.PI) / 180 }; // he looks to his right
const SIDE = { cz: 772 }; // the profile, seen from his left
const BACK = { cx: 1288 };
/** Patches of cloth and skin to tile: [x, y, w, h] in painting pixels. */
const PATCH = {
  cloak: [1200, 730, 40, 40],
  robe: [295, 655, 50, 150],
  trim: [240, 580, 22, 180],
  cream: [169, 530, 46, 30],
  leather: [208, 962, 46, 23],
  hand: [185, 561, 38, 60],
};

export function buildFigure(T, image) {
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const g = (a, b) => Math.exp(-(a * a + b * b));
  const WHITE = new T.Color(1, 1, 1);
  const grey = (k) => new T.Color(k, k, k);
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

  /* ── Textures from the painting ── */
  function canvasOf(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'));
    return c;
  }
  function texture(canvas, repeat) {
    const t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  /** The painting's light and dark, for relief. */
  function bumpOf(canvas, repeat) {
    const c = canvasOf(canvas.width, canvas.height, (x) => {
      x.filter = 'grayscale(1) contrast(1.4)';
      x.drawImage(canvas, 0, 0);
    });
    const t = new T.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  /** A patch mirrored into a seamless 2×2 tile (optionally turned a quarter). */
  function tile([x, y, w, h], turn = false) {
    const W = turn ? h : w,
      H = turn ? w : h;
    return canvasOf(W * 2, H * 2, (ctx) => {
      for (const [fx, fy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        ctx.save();
        ctx.translate(fx ? W * 2 : 0, fy ? H * 2 : 0);
        ctx.scale(fx ? -1 : 1, fy ? -1 : 1);
        if (turn) {
          ctx.translate(W, 0);
          ctx.rotate(Math.PI / 2);
        }
        ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
        ctx.restore();
      }
    });
  }
  const painting = canvasOf(IMG.w, IMG.h, (ctx) => ctx.drawImage(image, 0, 0));
  /**
   * Evens out a tile's light: divides by its blurred self, so the painting's
   * shading of a fold does not repeat as a pattern; the weave stays.
   */
  function flatten(c) {
    const w = c.width,
      h = c.height;
    const low = canvasOf(w, h, (x) => {
      const small = canvasOf(Math.max(1, w >> 3), Math.max(1, h >> 3), (y) => {
        y.imageSmoothingQuality = 'high';
        y.drawImage(c, 0, 0, w >> 3 || 1, h >> 3 || 1);
      });
      x.imageSmoothingQuality = 'high';
      x.drawImage(small, 0, 0, w, h);
    });
    const ctx = c.getContext('2d'),
      px = ctx.getImageData(0, 0, w, h),
      lo = low.getContext('2d').getImageData(0, 0, w, h).data;
    const mean = [0, 0, 0];
    for (let i = 0; i < lo.length; i += 4)
      for (let k = 0; k < 3; k++) mean[k] += lo[i + k] / (lo.length / 4);
    for (let i = 0; i < px.data.length; i += 4)
      for (let k = 0; k < 3; k++)
        px.data[i + k] = clamp(
          (px.data[i + k] * mean[k]) / Math.max(8, lo[i + k]),
          0,
          255,
        );
    ctx.putImageData(px, 0, 0);
    return c;
  }

  /* ── Materials ── */
  function fabric(rect, opts = {}) {
    const c =
      opts.flat === false
        ? tile(rect, opts.turn)
        : flatten(tile(rect, opts.turn));
    const [, , w, h] = rect;
    const m = new T.MeshPhysicalMaterial({
      map: texture(c, true),
      bumpMap: bumpOf(c, true),
      bumpScale: opts.bump ?? 3,
      roughness: opts.roughness ?? 0.92,
      metalness: 0,
      sheen: opts.sheen ?? 0.6,
      sheenRoughness: 0.75,
      sheenColor: new T.Color(opts.sheenColor ?? '#e8c9a0'),
      vertexColors: true,
      side: T.DoubleSide,
    });
    // One tile (two mirrored patches) in model units.
    const [tw, th] = opts.turn ? [h, w] : [w, h];
    m.userData.tile = [(2 * tw) / IMG.px, (2 * th) / IMG.px];
    return m;
  }
  const projected = new T.CanvasTexture(painting);
  projected.colorSpace = T.SRGBColorSpace;
  projected.anisotropy = 8;
  const projectedBump = bumpOf(painting, false);
  function paint(opts = {}) {
    const m = new T.MeshPhysicalMaterial({
      map: projected,
      bumpMap: projectedBump,
      bumpScale: opts.bump ?? 1.5,
      roughness: opts.roughness ?? 0.85,
      metalness: 0,
      sheen: opts.sheen ?? 0.3,
      sheenRoughness: 0.6,
      sheenColor: new T.Color(opts.sheenColor ?? '#ffd9c0'),
      vertexColors: true,
      side: T.DoubleSide,
    });
    m.userData.projected = true;
    return m;
  }
  const gold = { sheen: 0.9, sheenColor: '#ffe2a0', roughness: 0.7 };
  const M = {
    cloak: fabric(PATCH.cloak, { bump: 4, sheen: 0.35 }),
    trim: fabric(PATCH.trim, { bump: 3, flat: false, ...gold }),
    trimH: fabric(PATCH.trim, { turn: true, bump: 3, flat: false, ...gold }),
    robe: fabric(PATCH.robe, { bump: 3 }),
    cream: fabric(PATCH.cream, { bump: 2, sheen: 0.4 }),
    leather: fabric(PATCH.leather, { bump: 2, roughness: 0.55, sheen: 0.1 }),
    hand: fabric(PATCH.hand, {
      bump: 1,
      roughness: 0.55,
      sheen: 0.35,
      sheenColor: '#ffc8a8',
    }),
    face: paint({ bump: 1.2, roughness: 0.58, sheen: 0.35 }),
    hair: paint({
      bump: 2.5,
      roughness: 0.9,
      sheen: 0.4,
      sheenColor: '#d0c0b0',
    }),
    turban: paint({
      bump: 3,
      roughness: 0.9,
      sheen: 0.7,
      sheenColor: '#ff9a9a',
    }),
  };

  /* ── Where a point falls in each view of the painting (uv) ── */
  const toV = (y) => 1 - (IMG.floor - y * IMG.px) / IMG.h;
  const VIEW = {
    front: (p) => {
      const x = p[0] * Math.cos(FRONT.yaw) - p[2] * Math.sin(FRONT.yaw);
      return [(FRONT.cx + x * IMG.px) / IMG.w, toV(p[1])];
    },
    side: (p) => [(SIDE.cz - p[2] * IMG.px) / IMG.w, toV(p[1])],
    back: (p) => [(BACK.cx - p[0] * IMG.px) / IMG.w, toV(p[1])],
    // The turban's crown, as if seen from the front and above: its front
    // edge takes the painted wraps at the brow, its back the painted top.
    crown: (p) => [
      (FRONT.cx + p[0] * IMG.px) / IMG.w,
      toV(4.62 + 0.4 * clamp((0.3 - p[2]) / 0.86)),
    ],
  };

  /* ── Mesh building: a (u, v) grid; each vertex names its material ── */
  /**
   * fn(u, v) → { p, m, uv?, view?, c? }: position, material key, and either
   * cloth coordinates in model units (divided by the material's tile) or the
   * view of the painting it is projected from; c tints it.
   */
  function surface(nu, nv, fn) {
    const pos = [],
      uvs = [],
      col = [],
      mats = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const r = fn(i / nu, j / nv),
          mat = M[r.m];
        pos.push(...r.p);
        const uv = mat.userData.projected
          ? VIEW[r.view](r.p)
          : [r.uv[0] / mat.userData.tile[0], r.uv[1] / mat.userData.tile[1]];
        uvs.push(...uv);
        const c = r.c ?? WHITE;
        col.push(c.r, c.g, c.b);
        mats.push(r.m);
      }
    // Quads grouped by the material of their first corner.
    const byMat = new Map();
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i,
          b = a + 1,
          c = a + nu + 1,
          d = c + 1;
        if (!byMat.has(mats[a])) byMat.set(mats[a], []);
        byMat.get(mats[a]).push(a, b, c, b, d, c);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    const index = [],
      list = [];
    for (const [k, ids] of byMat) {
      geo.addGroup(index.length, ids.length, list.length);
      for (const id of ids) index.push(id);
      list.push(M[k]);
    }
    geo.setIndex(index);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, list);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
  /** An ellipsoid of one material: cloth coordinates round and up it, or a view. */
  function ellipsoid(c, r, m, view, n = 40) {
    return surface(n, Math.round(n * 0.7), (u, v) => {
      const th = u * 2 * Math.PI,
        ph = (v - 0.5) * Math.PI;
      const p = [
        c[0] + r[0] * Math.cos(ph) * Math.sin(th),
        c[1] + r[1] * Math.sin(ph),
        c[2] + r[2] * Math.cos(ph) * Math.cos(th),
      ];
      return { p, m, view, uv: [th * r[0], ph * r[1]] };
    });
  }
  /** A tube from a to b: radius r(t), the lower half drooping (a hanging sleeve). */
  function tube(a, b, r, droop, part, nu = 40, nv = 24) {
    const A = new T.Vector3(...a),
      B = new T.Vector3(...b);
    const len = A.distanceTo(B),
      axis = B.clone().sub(A).normalize();
    const down = new T.Vector3(0, -1, 0);
    down.sub(axis.clone().multiplyScalar(down.dot(axis)));
    if (down.lengthSq() < 1e-6) down.set(0, 0, 1);
    down.normalize();
    const side = new T.Vector3().crossVectors(axis, down).normalize();
    return surface(nu, nv, (u, v) => {
      const ph = u * 2 * Math.PI,
        s = Math.sin(ph),
        rad = r(v);
      const p = A.clone()
        .lerp(B, v)
        .addScaledVector(side, rad * Math.cos(ph))
        .addScaledVector(down, rad * s + Math.max(0, s) ** 2 * droop(v))
        .toArray();
      return { p, uv: [ph * rad, v * len], ...part(u, v, p) };
    });
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
    [2.4, 0.46],
    [3.0, 0.5],
    [3.45, 0.56],
    [3.66, 0.58],
  ]);
  const robeRz = table([
    [0.08, 0.5],
    [0.6, 0.44],
    [1.5, 0.37],
    [2.4, 0.32],
    [3.0, 0.34],
    [3.45, 0.31],
    [3.66, 0.29],
  ]);
  /** Shoulders rounding in to the neck above y0. */
  function shoulder(y, y0, y1, r, neck) {
    if (y <= y0) return r;
    const t = clamp((y - y0) / (y1 - y0));
    return neck + (r - neck) * Math.sqrt(1 - t * t);
  }
  {
    const Y0 = 0.08,
      Y1 = 4.0;
    add(
      'body',
      surface(180, 220, (u, v) => {
        const y = Y0 + (Y1 - Y0) * v,
          th = (u - 0.5) * 2 * Math.PI; // 0 = front
        const rx = shoulder(y, 3.66, Y1, robeRx(Math.min(y, 3.66)), 0.15),
          rz = shoulder(y, 3.66, Y1, robeRz(Math.min(y, 3.66)), 0.14);
        const fold = 0.014 * Math.sin(th * 9 + y) * smooth(2.6, 0.3, y);
        const p = [
          (rx + fold) * Math.sin(th),
          y,
          0.03 + (rz + fold) * Math.cos(th),
        ];
        const arc = th * (rx + rz) * 0.5;
        let m = 'robe',
          uv = [arc, y],
          c = WHITE;
        if (Math.abs(p[0]) < 0.03 && Math.cos(th) > 0 && y < 3.66) {
          m = 'trim'; // the gold placket
          uv = [p[0] + 0.03, y];
        }
        if (y < 0.24) m = 'trimH'; // the hem band
        if (y > 2.52 && y < 2.62) c = grey(0.62); // the sash
        if (y > 3.84 && Math.cos(th) > 0.5) m = 'cream'; // the shirt's collar
        return { p, m, uv, c };
      }),
    );
  }
  // The cloak: open at the front, wider and folded towards the hem.
  {
    const Y0 = 0.2,
      Y1 = 4.04;
    const gap = table([
      [0.2, 0.5],
      [1.5, 0.42],
      [2.9, 0.3],
      [3.6, 0.2],
      [3.9, 0.12],
      [4.04, 0.12],
    ]);
    const B = 0.1; // the embroidered border's width
    const drape = table([
      [0.2, 0.36],
      [1.2, 0.4],
      [2.2, 0.38],
      [3.0, 0.25],
      [3.5, 0.1],
      [3.56, 0.08],
    ]);
    add(
      'body',
      surface(260, 250, (u, v) => {
        const y = Y0 + (Y1 - Y0) * v,
          yr = Math.min(y, 3.56);
        // A great drape: over the arms at the chest, widest at the hips.
        const extra = drape(y);
        const rx = shoulder(y, 3.56, Y1, robeRx(yr) + extra, 0.2),
          rz = shoulder(y, 3.56, Y1, robeRz(yr) + 0.75 * extra, 0.19);
        const th0 = Math.asin(clamp(gap(y) / rx, 0, 0.99));
        const th = th0 + u * (2 * Math.PI - 2 * th0);
        // Deep folds, deepest at the back and towards the hem.
        const amp =
          (0.04 + 0.07 * Math.max(0, -Math.cos(th))) * smooth(3.5, 0.6, y);
        const wave =
          Math.sin(th * 7 + 0.7 * Math.sin(y * 1.4)) * 0.6 +
          Math.sin(th * 12 + 2.1 + 0.4 * y) * 0.4;
        const fold = amp * wave;
        const p = [
          (rx + fold) * Math.sin(th),
          y,
          0.03 + (rz + fold) * Math.cos(th),
        ];
        const arc = (th - th0) * (rx + rz) * 0.5,
          span = (2 * Math.PI - 2 * th0) * (rx + rz) * 0.5;
        const edge = Math.min(arc, span - arc);
        // Hollows of the folds a little darker.
        const c = grey(0.84 + 0.16 * (0.5 + 0.5 * wave));
        if (edge < B && y < 3.9) return { p, m: 'trim', uv: [edge, y], c };
        if (y - Y0 < B) return { p, m: 'trimH', uv: [arc, y - Y0], c };
        return { p, m: 'cloak', uv: [arc, y], c };
      }),
    );
  }
  // The neck, and the shirt's standing collar.
  add(
    'body',
    tube(
      [0, 3.84, 0.0],
      [0, 4.2, -0.01],
      () => 0.12,
      () => 0,
      () => ({ m: 'hand' }),
    ),
  );
  add(
    'body',
    tube(
      [0, 3.86, 0.01],
      [0, 4.02, 0.0],
      (v) => 0.165 - v * 0.02,
      () => 0,
      () => ({ m: 'cream' }),
    ),
  );
  // Leather shoes, toes showing beneath the hem.
  for (const s of [-1, 1])
    add(
      'body',
      ellipsoid([s * 0.19, 0.07, 0.3], [0.11, 0.08, 0.21], 'leather'),
    );

  /* ── The arms: cloak sleeves, wide at the cuff ── */
  for (const [name, s] of [
    ['leftArm', -1],
    ['rightArm', 1],
  ]) {
    const H = REST.hand[name];
    const S = [0.5 * s, 3.66, -0.02],
      E = [0.64 * s, 2.92, 0.0],
      W = [0.47 * s, 2.98, 0.6];
    add(
      name,
      tube(
        S,
        E,
        (v) => 0.16 + 0.05 * v,
        () => 0,
        () => ({ m: 'cloak' }),
      ),
    );
    add(name, ellipsoid(E, [0.21, 0.21, 0.21], 'cloak'));
    add(
      name,
      tube(
        E,
        W,
        (v) => 0.19 + 0.025 * v * v,
        (v) => 0.1 * v * v,
        (u, v) => ({ m: v > 0.84 ? 'trimH' : 'cloak' }),
        48,
        30,
      ),
    );
    // Cream cuff and the hand, a thumb over the book's edge.
    add(
      name,
      tube(
        [W[0] * 0.98, W[1], W[2] - 0.06],
        [H[0] * 1.02, H[1] - 0.01, H[2] - 0.08],
        () => 0.08,
        () => 0,
        () => ({ m: 'cream' }),
      ),
    );
    add(name, ellipsoid(H, [0.065, 0.11, 0.09], 'hand'));
    add(
      name,
      ellipsoid(
        [H[0] - 0.05 * s, H[1] + 0.045, H[2] + 0.065],
        [0.027, 0.055, 0.032],
        'hand',
        undefined,
        20,
      ),
    );
  }

  /* ── The book (his card picture only) ── */
  {
    const book = new T.Group();
    const box = (w, h, d, x, y, z, colour, rough = 0.6) => {
      const m = new T.Mesh(
        new T.BoxGeometry(w, h, d),
        new T.MeshPhysicalMaterial({
          color: colour,
          roughness: rough,
          sheen: 0.3,
        }),
      );
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      book.add(m);
    };
    box(0.76, 0.56, 0.035, 0, 0, 0.07, '#2c4d30', 0.5);
    box(0.76, 0.56, 0.035, 0, 0, -0.07, '#1d3420', 0.5);
    box(0.72, 0.52, 0.11, 0.01, 0, 0, '#e0d3b2', 0.9);
    box(0.035, 0.56, 0.175, -0.38, 0, 0, '#1d3420', 0.5);
    joints.book.add(book);
  }

  /* ── The head: the painted face, projected ── */
  const HC = [0, 4.42, -0.01],
    HR = [0.27, 0.36, 0.31];
  /** Relief of the face (outwards), from the head-relative position. */
  function relief(x, y, z) {
    const ax = Math.abs(x),
      front = smooth(0.05, 0.22, z);
    let d = 0;
    // Nose: bridge, tip, wings.
    d +=
      front *
      (0.09 * g(x / 0.036, (y + 0.12) / 0.055) +
        0.05 * g(x / 0.028, (y + 0.03) / 0.07) +
        0.024 * g((ax - 0.042) / 0.022, (y + 0.15) / 0.022));
    // Brow ridge, eye sockets, cheekbones, lips.
    d += front * 0.024 * g(x / 0.17, (y - 0.07) / 0.03);
    d -= front * 0.024 * g((ax - 0.105) / 0.045, (y - 0.01) / 0.032);
    d += front * 0.016 * g((ax - 0.15) / 0.06, (y + 0.08) / 0.05);
    d += front * 0.012 * g(x / 0.06, (y + 0.25) / 0.03);
    // The beard and moustache stand proud of the cheeks and chin.
    const beardLine = -0.1 - 0.5 * Math.max(0, 0.12 - ax);
    if (y < beardLine && z > -0.02)
      d += 0.03 * smooth(beardLine, beardLine - 0.05, y);
    return d;
  }
  /** The head between two angles (radians from the front), from one view. */
  function headPart(th0, th1, view, nu) {
    return surface(nu, 170, (u, v) => {
      const th = th0 + (th1 - th0) * u,
        ph = (v - 0.5) * Math.PI;
      let x = HR[0] * Math.cos(ph) * Math.sin(th),
        y = HR[1] * Math.sin(ph),
        z = HR[2] * Math.cos(ph) * Math.cos(th);
      if (y < 0) {
        const t = (-y / HR[1]) ** 1.6;
        x *= 1 - 0.3 * t;
        if (z > 0) z *= 1 - 0.1 * t;
      }
      if (z < 0) z *= 1.08;
      const d = relief(x, y, z);
      const n = new T.Vector3(
        x / HR[0] ** 2,
        y / HR[1] ** 2,
        z / HR[2] ** 2,
      ).normalize();
      const p = [HC[0] + x + n.x * d, HC[1] + y + n.y * d, HC[2] + z + n.z * d];
      return { p, m: 'face', view };
    });
  }
  const deg = Math.PI / 180;
  // The front view covers the face (turned to his right); the profile the
  // sides and ears; the back view the back of the head.
  add('head', headPart(-80 * deg, 85 * deg, 'front', 190));
  add('head', headPart(85 * deg, 140 * deg, 'side', 50));
  add('head', headPart(-140 * deg, -80 * deg, 'side', 60));
  add('head', headPart(140 * deg, 220 * deg, 'back', 70));
  for (const s of [-1, 1])
    add(
      'head',
      ellipsoid(
        [s * 0.27, 4.37, -0.04],
        [0.04, 0.075, 0.055],
        'face',
        'side',
        18,
      ),
    );

  // The long beard over the chest: front painting at the front, profile at the sides.
  {
    // It grows out of the jaw (its top hidden inside the face).
    const rx = table([
        [0, 0.18],
        [0.3, 0.27],
        [0.65, 0.2],
        [1, 0.06],
      ]),
      rz = table([
        [0, 0.1],
        [0.3, 0.16],
        [0.8, 0.1],
        [1, 0.04],
      ]),
      zc = table([
        [0, 0.1],
        [0.3, 0.2],
        [1, 0.26],
      ]);
    const beard = (th0, th1, view, nu) =>
      surface(nu, 80, (u, v) => {
        const th = th0 + (th1 - th0) * u,
          y = 4.16 - 0.48 * v;
        const wave = 0.014 * Math.sin(th * 15 + y * 24) * smooth(0.1, 0.4, v);
        const p = [
          (rx(v) + wave) * Math.sin(th),
          y,
          zc(v) + (rz(v) + wave) * Math.cos(th),
        ];
        return { p, m: 'hair', view };
      });
    add('head', beard(-70 * deg, 40 * deg, 'front', 70));
    add('head', beard(40 * deg, 180 * deg, 'side', 50));
    add('head', beard(-180 * deg, -70 * deg, 'side', 50));
  }

  /* ── The turban: the painted wraps, projected onto a great rounded mass ── */
  {
    const TZ = -0.13,
      RZ = 0.89; // depth to width
    const r = table([
      [4.2, 0.34],
      [4.36, 0.45],
      [4.58, 0.49],
      [4.8, 0.46],
      [4.94, 0.36],
      [5.01, 0.2],
      [5.04, 0.0],
    ]);
    /** The lower edge: over the ears, low at the back, an arch over the brow. */
    const bottom = (th) =>
      4.37 +
      0.35 * Math.exp(-((th / 0.5) ** 2)) -
      0.17 * Math.max(0, -Math.cos(th));
    /** The cap hugging the head at height y. */
    const capAt = (y, th) => {
      const k = Math.sqrt(clamp(1 - ((y - HC[1]) / HR[1]) ** 2)) * 1.06 + 0.012;
      const back = Math.cos(th) < 0 ? 1.08 : 1;
      return [
        HR[0] * k * Math.sin(th),
        HC[2] + HR[2] * k * Math.cos(th) * back,
      ];
    };
    const turban = (th0, th1, view, nu) =>
      surface(nu, 150, (u, v) => {
        const th = th0 + (th1 - th0) * u,
          yb = bottom(th),
          y = yb + (5.04 - yb) * v;
        // Near its lower edge the cloth tucks in to the cap.
        const tuck = smooth(0, 0.22, v),
          R =
            r(y) *
            (1 + 0.025 * Math.sin(th * 5 + y * 9) * (1 - smooth(4.9, 5.04, y)));
        const [cx, cz] = capAt(Math.min(y, HC[1] + HR[1] * 0.98), th);
        const p = [
          cx + (R * Math.sin(th) - cx) * tuck,
          y,
          cz + (TZ + R * RZ * Math.cos(th) - cz) * tuck,
        ];
        // The crown, seen from above, takes the painting's wraps rather than its stretched top row.
        if (y > 4.9) return { p, m: 'turban', view: 'crown' };
        return { p, m: 'turban', view };
      });
    add('head', turban(-75 * deg, 45 * deg, 'front', 120));
    add('head', turban(45 * deg, 135 * deg, 'side', 90));
    add('head', turban(135 * deg, 225 * deg, 'back', 90));
    add('head', turban(225 * deg, 285 * deg, 'side', 60));
    // The dark cap beneath, showing under the arch at the brow.
    add(
      'head',
      surface(120, 10, (u, v) => {
        const th = (u - 0.5) * 2 * Math.PI,
          y = 4.5 + 0.32 * v;
        const [x, z] = capAt(y, th);
        const view = Math.abs(th) < 60 * deg ? 'front' : 'side';
        return { p: [x, y, z], m: 'face', view };
      }),
    );
  }

  return { root, joints };
}
