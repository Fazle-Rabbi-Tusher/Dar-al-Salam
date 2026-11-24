export const LOOP = 240,
  TICKS_PER_SECOND = 12,
  POSE_COUNT = 12;
const TAU = Math.PI * 2;
const unit = (n) => n - Math.floor(n);
const seed = (n) => unit(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const dust = Array.from({ length: 96 }, (_, i) => ({
  x: seed(i + 1),
  y: seed(i + 301),
  size: 1 + seed(i + 917) * 2,
  phase: seed(i + 163),
  speed: 1 + (i % 3),
}));
const highlights = [
  [0.07, 0.69],
  [0.16, 0.75],
  [0.28, 0.78],
  [0.83, 0.78],
  [0.9, 0.72],
  [0.8, 0.59],
  [0.66, 0.29],
  [0.51, 0.54],
  [0.47, 0.62],
  [0.56, 0.71],
  [0.12, 0.9],
  [0.27, 0.88],
];

/** All scene state is a pure function of the 12 Hz master clock. */
export function stateAt(frame) {
  const tick = ((frame % LOOP) + LOOP) % LOOP,
    phase = tick / LOOP;
  return {
    tick,
    pose: Math.floor(tick) % POSE_COUNT,
    camera: {
      zoom: 1.018,
      x: Math.sin(phase * TAU) * 4,
      y: Math.sin(phase * TAU) * 2,
    },
    actor: { x: 638 + Math.sin(phase * TAU) * 3, ground: 1240, scale: 2.39 },
    dust: dust.map((p, i) => {
      const k = unit(phase * p.speed + p.phase),
        fade = Math.sin(k * Math.PI) ** 2;
      return {
        x: 350 + p.x * 590 + Math.sin(k * TAU + i) * 14,
        y: 1180 - k * 390 + p.y * 80,
        size: p.size,
        alpha: fade * (0.08 + p.y * 0.14),
      };
    }),
    highlights: highlights.map(([x, y], i) => ({
      x: x * 1254,
      y: y * 1254,
      alpha: Math.max(0, Math.sin(phase * TAU * (2 + (i % 3)) + i * 1.7)) ** 12,
    })),
  };
}

export function createProcession(canvas, { background, rider, manifest }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw Error('A canvas renderer is required');
  const scale = (Math.min(canvas.width, canvas.height) / 1254) * 1.018;
  const layer = (width, height) => {
    const c = canvas.ownerDocument.createElement('canvas');
    c.width = width;
    c.height = height;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { canvas: c, ctx: g };
  };
  // Rasterize each authored cel once. Camera movement then uses whole pixels,
  // keeping the fine pixel clusters stable rather than resampling them in time.
  const back = layer(Math.round(1254 * scale), Math.round(1254 * scale));
  back.ctx.drawImage(background, 0, 0, back.canvas.width, back.canvas.height);
  const actors = manifest.frames.map((f) => {
    const a = layer(
      Math.round(f.width * 2.39 * scale),
      Math.round(f.height * 2.39 * scale),
    );
    a.ctx.drawImage(
      rider,
      f.x,
      f.y,
      f.width,
      f.height,
      0,
      0,
      a.canvas.width,
      a.canvas.height,
    );
    return {
      ...a,
      anchor: Math.round((f.anchorX * a.canvas.width) / f.width),
      baseline: Math.round((f.baseline * a.canvas.height) / f.height),
    };
  });
  const near = [
    [
      [0, 785],
      [230, 770],
      [403, 832],
      [403, 1254],
      [0, 1254],
    ],
    [
      [248, 1254],
      [248, 1150],
      [278, 1080],
      [299, 1046],
      [309, 1004],
      [349, 996],
      [424, 998],
      [454, 1015],
      [470, 1054],
      [460, 1092],
      [481, 1151],
      [510, 1254],
    ],
    [
      [280, 957],
      [291, 934],
      [334, 913],
      [402, 915],
      [436, 929],
      [471, 944],
      [490, 970],
      [488, 998],
      [448, 1015],
      [360, 1011],
      [303, 997],
    ],
    [
      [423, 950],
      [433, 930],
      [454, 927],
      [470, 945],
      [478, 967],
      [523, 1006],
      [570, 1053],
      [592, 1084],
      [587, 1105],
      [572, 1116],
      [552, 1105],
      [505, 1066],
      [459, 1027],
      [440, 994],
    ],
    [
      [592, 1084],
      [587, 1105],
      [572, 1116],
      [521, 1148],
      [479, 1175],
      [447, 1163],
      [450, 1112],
      [474, 1091],
      [521, 1099],
      [555, 1080],
    ],
  ];
  let frame = 0;
  function render(nextFrame = frame) {
    frame = ((nextFrame % LOOP) + LOOP) % LOOP;
    const s = stateAt(frame),
      w = canvas.width,
      h = canvas.height,
      bx = Math.round((w - back.canvas.width) / 2 + s.camera.x * scale),
      by = Math.round((h - back.canvas.height) / 2 + s.camera.y * scale);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#21170e';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(back.canvas, bx, by);
    // A tracking shot keeps the horse centered as the authored gait advances.
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, bx, by);
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = '#4e331c';
    ctx.beginPath();
    ctx.ellipse(s.actor.x, s.actor.ground - 7, 91, 17, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    const actor = actors[s.pose];
    ctx.drawImage(
      actor.canvas,
      Math.round(bx + s.actor.x * scale - actor.anchor),
      Math.round(by + s.actor.ground * scale - actor.baseline),
    );
    // Keep the existing near chests in front where the moving mantle meets
    // their top edge. The crop preserves the original artwork and its faces.
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, bx, by);
    ctx.beginPath();
    for (const polygon of near) {
      polygon.forEach(([x, y], i) =>
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y),
      );
      ctx.closePath();
    }
    ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(back.canvas, bx, by);
    ctx.restore();
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, bx, by);
    ctx.globalCompositeOperation = 'screen';
    for (const p of s.dust) {
      ctx.fillStyle = `rgba(244,191,92,${p.alpha})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    for (const p of s.highlights) {
      if (p.alpha < 0.12) continue;
      const r = 2 + p.alpha * 3;
      ctx.globalAlpha = p.alpha * 0.7;
      ctx.fillStyle = '#fff1ba';
      ctx.fillRect(Math.round(p.x - r), Math.round(p.y), r * 2, 1);
      ctx.fillRect(Math.round(p.x), Math.round(p.y - r), 1, r * 2);
    }
    ctx.restore();
    return s;
  }
  render(0);
  return {
    render,
    setFrame: render,
    get frame() {
      return frame;
    },
    get state() {
      return stateAt(frame);
    },
  };
}
