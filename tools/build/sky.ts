import sharp from 'sharp';
import type { DistrictMood } from '../../packages/shared/districts';

/*
 * The painted sky behind the little planet: banded pixel-art blues fading
 * to a warm horizon, with layered cumulus clouds lit from the top left
 * (white tops, blue-grey undersides), in the spirit of the owner's pixel-art
 * references. Generated deterministically at build time (seeded), so every
 * build is identical. Shown scaled up with pixelated rendering.
 */
const W = 480,
  H = 320;
type RGB = [number, number, number];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
// Top to horizon, in bands like the references.
const SKY = [
  '#3F6FA8',
  '#4A7DB6',
  '#5A8DC2',
  '#6C9DCB',
  '#80ADD3',
  '#96BEDB',
  '#ADCDE2',
  '#C4DCE8',
  '#D9E7EC',
  '#EAEFE9',
  '#F6F0DF',
].map(hex);
const CLOUD = {
  light: hex('#FBFAF4'),
  mid: hex('#E2E8F2'),
  shade: hex('#BCC8E2'),
  deep: hex('#97A6CC'),
};
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Ordered dither so band edges read as pixel art, not smooth gradients.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
export async function generateSky(
  file: string,
  mood: DistrictMood | 'forest' = 'day',
) {
  if (mood === 'forest') return generateForestSky(file);
  if (mood !== 'day') return generateDistrictSky(file, mood);
  const px = new Uint8Array(W * H * 3);
  const put = (x: number, y: number, c: RGB) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    px.set(c, (Math.floor(y) * W + Math.floor(x)) * 3);
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = (y / (H - 1)) * (SKY.length - 1),
        i = Math.floor(t),
        frac = t - i,
        threshold = (BAYER[y % 4][x % 4] + 0.5) / 16;
      put(x, y, SKY[Math.min(SKY.length - 1, frac > threshold ? i + 1 : i)]);
    }
  // Clouds: each is a soft union of puffs (summed fields, so no seams
  // between puffs), with noisy edges, a flat-ish base and light from the
  // top left quantised to four tones.
  const rand = rng(796);
  const noise = (x: number, y: number) => {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = (x: number, y: number, k: number) => {
    const xi = Math.floor(x / k),
      yi = Math.floor(y / k),
      fx = x / k - xi,
      fy = y / k - yi,
      u = fx * fx * (3 - 2 * fx),
      v = fy * fy * (3 - 2 * fy);
    const n = (a: number, b: number) => noise(a, b);
    return (
      n(xi, yi) * (1 - u) * (1 - v) +
      n(xi + 1, yi) * u * (1 - v) +
      n(xi, yi + 1) * (1 - u) * v +
      n(xi + 1, yi + 1) * u * v
    );
  };
  const cloud = (cx: number, cy: number, size: number, flat: number) => {
    const puffs: [number, number, number][] = [];
    const n = 6 + Math.floor(rand() * 6);
    for (let k = 0; k < n; k++)
      puffs.push([
        cx + (rand() - 0.5) * size * 3,
        cy + (rand() - 0.65) * size * 0.8 * flat,
        size * (0.4 + rand() * 0.6),
      ]);
    const field = (x: number, y: number) => {
      let f = 0;
      for (const [px0, py0, r] of puffs) {
        const d2 = ((x - px0) ** 2 + ((y - py0) / flat) ** 2) / (r * r);
        f += Math.exp(-d2 * 1.6);
      }
      return f + (smooth(x, y, 4) - 0.5) * 0.35;
    };
    const base = cy + size * 0.42 * flat;
    for (let y = Math.floor(cy - size * 1.6); y <= Math.ceil(base); y++)
      for (
        let x = Math.floor(cx - size * 2.6);
        x <= Math.ceil(cx + size * 2.6);
        x++
      ) {
        const f = field(x, y);
        if (f < 0.42) continue;
        // Normal from the field gradient: lit from the top left.
        const gx = field(x + 1, y) - field(x - 1, y),
          gy = field(x, y + 1) - field(x, y - 1),
          len = Math.hypot(gx, gy) || 1,
          lit = (gx * 0.55 + gy * 0.85) / len,
          under = Math.max(
            0,
            (y - (base - size * 0.55 * flat)) / (size * 0.55 * flat),
          );
        const dither = (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.3,
          edge = f < 0.55 ? -0.15 : 0,
          v = lit * 0.9 + dither - under * 0.9 + edge;
        put(
          x,
          y,
          v > 0.35
            ? CLOUD.light
            : v > -0.05
              ? CLOUD.mid
              : v > -0.45
                ? CLOUD.shade
                : CLOUD.deep,
        );
      }
  };
  // Distant flat clouds low, big cumulus in the middle, small ones high.
  for (let k = 0; k < 9; k++)
    cloud(rand() * W, H * (0.74 + rand() * 0.14), 14 + rand() * 12, 0.45);
  for (let k = 0; k < 6; k++)
    cloud(rand() * W, H * (0.45 + rand() * 0.2), 16 + rand() * 12, 0.85);
  for (let k = 0; k < 8; k++)
    cloud(rand() * W, H * (0.14 + rand() * 0.22), 7 + rand() * 7, 0.7);
  await sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 3 } })
    .webp({ lossless: true })
    .toFile(file);
}

/**
 * Overcast woodland light: quiet grey-teal air and receding conifer layers.
 * It is intentionally painted separately from the bright coastal sky so
 * woodland views can carry the reference's soft mist and long silhouettes.
 */
async function generateForestSky(file: string) {
  const px = new Uint8Array(W * H * 3);
  const rand = rng(2847);
  const air = [
    '#B9CACC',
    '#C1D0D0',
    '#C9D7D5',
    '#D0DDDA',
    '#D6E2DC',
    '#DDE6DE',
    '#E1E8DF',
    '#E5EBE1',
  ].map(hex);
  const hash = (x: number, y: number) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const put = (x: number, y: number, c: RGB) => {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    px.set(c, (y * W + x) * 3);
  };
  // Broad shallow cloud sheets dissolve into a pale opening. Their edges
  // are hand-like steps, not a regular dither mesh over the entire image.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const cloud =
          Math.sin(x * 0.016 + y * 0.025) * 0.055 +
          Math.sin(x * 0.037 - y * 0.018) * 0.025,
        opening = Math.exp(-(((x / W - 0.65) / 0.37) ** 2)) * 0.08,
        height = y / H + cloud + opening,
        band = Math.max(0, Math.min(air.length - 1, Math.floor(height * 7)));
      put(x, y, air[band]);
    }

  const conifer = (
    cx: number,
    base: number,
    height: number,
    colour: RGB,
    seed: number,
  ) => {
    const top = Math.floor(base - height),
      spread = height * (0.13 + hash(seed, 4) * 0.035),
      tiers = Math.max(7, Math.floor(height / 6));
    // A tapered stem remains visible through the ragged needle tiers.
    for (let y = top; y <= base; y++) {
      const lean = Math.round(
        ((base - y) / height) * (hash(seed, 5) - 0.5) * 3,
      );
      put(cx + lean, y, colour);
      if (y > top + height * 0.25) put(cx + lean + 1, y, colour);
    }
    for (let tier = 0; tier < tiers; tier++) {
      const t = (tier + 1) / (tiers + 1),
        cy = top + height * t * 0.88,
        width = spread * t * (0.76 + hash(seed, tier + 8) * 0.28),
        depth = (height / tiers) * 1.9;
      for (let y = Math.floor(cy - depth); y <= cy + 2; y++) {
        const level = Math.max(0, (y - cy + depth) / depth),
          half = width * level;
        for (let x = Math.floor(cx - half - 2); x <= cx + half + 2; x++) {
          const edge =
            half +
            (hash(Math.floor(x / 2) + seed, Math.floor(y / 2)) - 0.5) * 3;
          if (Math.abs(x - cx) < edge && (y <= cy || hash(x + seed, y) > 0.45))
            put(x, y, colour);
        }
      }
    }
  };
  const layers = [
    { base: 258, min: 35, max: 89, spacing: 9, colour: hex('#BCCFCA') },
    { base: 289, min: 43, max: 112, spacing: 13, colour: hex('#A3BFBA') },
    { base: 332, min: 61, max: 137, spacing: 18, colour: hex('#86AAA4') },
  ];
  for (const [layer, spec] of layers.entries()) {
    let i = 0;
    for (let x = -15; x < W + 20; x += spec.spacing, i++) {
      const height = spec.min + rand() * (spec.max - spec.min),
        base = spec.base + Math.sin(x * 0.012 + layer) * 9 + rand() * 8;
      conifer(
        x + rand() * spec.spacing * 0.65,
        base,
        height,
        spec.colour,
        100 * layer + i,
      );
    }
  }
  // Thin banks of low fog cut across the trees, binding all three depths
  // into one atmosphere without obscuring their pixel silhouettes.
  for (let y = 182; y < H; y++)
    for (let x = 0; x < W; x++) {
      const wave = Math.sin(x * 0.012 + 0.9) * 7,
        ribbon =
          Math.exp(-(((y - 248 - wave) / 11) ** 2)) * 0.17 +
          Math.exp(-(((y - 290 + wave) / 15) ** 2)) * 0.18;
      if (ribbon < 0.025) continue;
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c++)
        px[i + c] = Math.round(px[i + c] * (1 - ribbon) + air[6][c] * ribbon);
    }
  await sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 3 } })
    .webp({ lossless: true })
    .toFile(file);
}

/** Separate painted skies bind the coastal, city and street districts to their
 * references. Everything is seeded at build time; runtime weather uses the
 * world's deterministic frame clock in Engine.ts. */
async function generateDistrictSky(
  file: string,
  mood: Exclude<DistrictMood, 'day'>,
) {
  const px = new Uint8Array(W * H * 3);
  const palette = {
    'night-city': [
      '#06152C',
      '#0A2340',
      '#0C2B4A',
      '#113A56',
      '#1A4D65',
      '#286879',
    ],
    'rain-street': [
      '#274A48',
      '#365F59',
      '#47786C',
      '#619684',
      '#7AB29A',
      '#9ACDB0',
    ],
    blossom: ['#7C596E', '#8F657C', '#A7768B', '#BD8E9D', '#D6A7B0', '#E9BCC1'],
    coast: ['#1055A2', '#167ECD', '#36A9E8', '#63C8F1', '#9CE7F5', '#DDF9F0'],
  }[mood].map(hex);
  const cloudTones = {
    'night-city': ['#12324E', '#1B4261', '#24546E', '#37677C'],
    'rain-street': ['#4C7D72', '#679A88', '#81B29A', '#A0CBB0'],
    blossom: ['#A97D90', '#C99BA9', '#DEAFB9', '#F0C5C9'],
    coast: ['#3DA8DC', '#70D1ED', '#B5EEEF', '#FFFEEC'],
  }[mood].map(hex);
  const rand = rng(
    mood === 'night-city'
      ? 7194
      : mood === 'rain-street'
        ? 3182
        : mood === 'blossom'
          ? 5128
          : 793,
  );
  const put = (x: number, y: number, colour: RGB) => {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < W && y < H) px.set(colour, (y * W + x) * 3);
  };
  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    colour: RGB,
  ) => {
    for (let j = Math.floor(y); j < y + height; j++)
      for (let i = Math.floor(x); i < x + width; i++) put(i, j, colour);
  };
  const stroke = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    colour: RGB,
  ) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let i = 0; i <= n; i++)
      put(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, colour);
  };
  const banks = Array.from(
    { length: mood === 'rain-street' ? 9 : 7 },
    (_, i) => {
      const cx = rand() * W,
        cy = 36 + rand() * 174;
      const size = mood === 'coast' ? 24 + rand() * 24 : 16 + rand() * 22;
      return {
        base: cy + size * 0.45,
        cy,
        size,
        puffs: Array.from({ length: 7 }, (_, j) => ({
          x: cx + (j - 3) * size * 0.58,
          y: cy - rand() * size * 0.42,
          radius: size * (0.48 + rand() * 0.46),
        })),
        shade: i % 2,
      };
    },
  );
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const height = (y / H) * (palette.length - 1);
      const band = Math.floor(height),
        fraction = height - band;
      const next =
        fraction > (BAYER[y % 4][x % 4] + 0.5) / 16 ? band + 1 : band;
      put(x, y, palette[Math.min(palette.length - 1, next)]);
      const cx = Math.floor(x / 2) * 2,
        cy = Math.floor(y / 2) * 2;
      for (const bank of banks) {
        if (cy > bank.base || cy < bank.cy - bank.size * 1.5) continue;
        let cloud = 0;
        for (const puff of bank.puffs) {
          const dx = (cx - puff.x) / puff.radius,
            dy = (cy - puff.y) / (puff.radius * 0.72);
          cloud += Math.exp(-(dx * dx + dy * dy) * 1.5);
        }
        if (cloud < 0.52) continue;
        const upper = (bank.base - cy) / bank.size;
        const tone = Math.max(
          0,
          Math.min(3, Math.floor(upper * 3 + 0.4 + bank.shade * 0.2)),
        );
        put(x, y, cloudTones[tone]);
      }
    }
  if (mood === 'night-city') {
    for (let i = 0; i < 38; i++) {
      const x = Math.floor(rand() * W),
        y = Math.floor(rand() * 210);
      put(x, y, i % 4 ? hex('#A7DAD5') : hex('#FFE7BF'));
      if (i % 9 === 0) put(x + 1, y, hex('#EAF9E8'));
    }
  }
  if (mood === 'night-city' || mood === 'rain-street') {
    const layers =
      mood === 'night-city'
        ? [
            { colour: '#254F68', min: 35, max: 120 },
            { colour: '#183B55', min: 50, max: 145 },
            { colour: '#102941', min: 55, max: 171 },
          ]
        : [
            { colour: '#639783', min: 18, max: 70 },
            { colour: '#497C6D', min: 25, max: 87 },
            { colour: '#325C57', min: 35, max: 94 },
          ];
    for (const [layer, spec] of layers.entries()) {
      let x = -7;
      while (x < W) {
        const width = Math.floor(9 + rand() * 22),
          height = spec.min + rand() * (spec.max - spec.min);
        const base = H + (2 - layer) * 6;
        const roof = Math.floor(base - height);
        rect(x, roof, width, height, hex(spec.colour));
        if (rand() > 0.62)
          rect(
            x + width * 0.28,
            roof - 4 - rand() * 9,
            width * 0.38,
            8,
            hex(spec.colour),
          );
        if (mood === 'night-city') {
          for (let y = roof + 7; y < H; y += 5)
            for (let wx = x + 3; wx < x + width - 2; wx += 4)
              if (rand() > 0.46)
                rect(
                  wx,
                  y,
                  1 + (layer > 0 ? 1 : 0),
                  2,
                  rand() > 0.6
                    ? hex('#C8DBAB')
                    : hex(layer > 0 ? '#519DA7' : '#4D8392'),
                );
          if (rand() > 0.67) {
            stroke(
              x + width / 2,
              roof,
              x + width / 2,
              roof - 10,
              hex(spec.colour),
            );
            put(x + width / 2, roof - 10, hex('#F06459'));
          }
        }
        x += width + Math.floor(rand() * 7);
      }
    }
  }
  if (mood === 'night-city') {
    // Slim observation spire, with luminous decks above the layered skyline.
    const x = 180,
      top = 40,
      foot = 310;
    rect(x - 2, top + 48, 5, foot - top - 48, hex('#142A43'));
    rect(x, top, 1, 50, hex('#10243D'));
    put(x, top, hex('#FF5D68'));
    for (let y = 88; y < 235; y += 4) rect(x - 1, y, 2, 2, hex('#D4E4CF'));
    for (const y of [146, 236]) {
      for (let row = -7; row <= 8; row++) {
        const width = 14 - Math.abs(row) * 0.8;
        rect(
          x - width,
          y + row,
          width * 2,
          1,
          row > 3 ? hex('#C6B48A') : row < -3 ? hex('#1A3957') : hex('#10243A'),
        );
      }
      for (let wx = -8; wx <= 8; wx += 4)
        rect(x + wx, y - 1, 2, 3, hex('#B0CEBB'));
    }
  }
  if (mood === 'rain-street' || mood === 'blossom') {
    const pole = hex(mood === 'blossom' ? '#514055' : '#244844');
    const points = [
      { x: 21, y: 161 },
      { x: 142, y: 182 },
      { x: 291, y: 151 },
      { x: 421, y: 183 },
    ];
    for (const p of points) {
      rect(p.x, p.y, 2, H - p.y, pole);
      rect(p.x - 7, p.y + 13, 19, 2, pole);
      rect(p.x + 9, p.y + 10, 3, 7, pole);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1];
      let previous = [a.x, a.y + 15];
      for (let step = 1; step <= 36; step++) {
        const t = step / 36;
        const next = [
          a.x + (b.x - a.x) * t,
          a.y + 15 + (b.y - a.y) * t + Math.sin(t * Math.PI) * 16,
        ];
        stroke(previous[0], previous[1], next[0], next[1], pole);
        previous = next;
      }
    }
  }
  // Small sea birds make the blue coast feel open without adding characters.
  if (mood === 'coast' || mood === 'night-city') {
    const bird = hex(mood === 'coast' ? '#164F68' : '#C2E7E4');
    for (let i = 0; i < 5; i++) {
      const x = 35 + rand() * (W - 70),
        y = 65 + rand() * 110;
      stroke(x - 3, y - 1, x, y + 1, bird);
      stroke(x, y + 1, x + 4, y - 2, bird);
    }
  }
  await sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 3 } })
    .webp({ lossless: true })
    .toFile(file);
}
