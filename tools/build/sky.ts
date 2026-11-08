import sharp from 'sharp';

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
export async function generateSky(file: string) {
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
