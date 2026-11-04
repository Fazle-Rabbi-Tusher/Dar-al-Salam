export type PixelImage = { width: number; height: number; data: Uint8Array };
export const rgb = (hex: string): [number, number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  255,
];
export class Pixels implements PixelImage {
  data: Uint8Array;
  constructor(
    public width: number,
    public height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
  }
  pixel(x: number, y: number, c: string | number[]) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const v = typeof c === 'string' ? rgb(c) : c;
    this.data.set(v, (y * this.width + x) * 4);
  }
  rect(x: number, y: number, w: number, h: number, c: string | number[]) {
    for (let j = Math.floor(y); j < y + h; j++)
      for (let i = Math.floor(x); i < x + w; i++) this.pixel(i, j, c);
  }
  ellipse(x: number, y: number, rx: number, ry: number, c: string | number[]) {
    for (let j = Math.floor(y - ry); j <= y + ry; j++)
      for (let i = Math.floor(x - rx); i <= x + rx; i++)
        if (((i - x) / rx) ** 2 + ((j - y) / ry) ** 2 <= 1) this.pixel(i, j, c);
  }
  poly(points: [number, number][], c: string | number[]) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++)
      for (
        let x = Math.floor(Math.min(...points.map((p) => p[0])));
        x <= Math.max(...points.map((p) => p[0]));
        x++
      ) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i],
            b = points[j];
          if (
            a[1] > y !== b[1] > y &&
            x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
          )
            inside = !inside;
        }
        if (inside) this.pixel(x, y, c);
      }
  }
}
export function blit(
  dst: PixelImage,
  src: PixelImage,
  dx = 0,
  dy = 0,
  mirror = false,
) {
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const sx = mirror ? src.width - 1 - x : x,
        si = (y * src.width + sx) * 4,
        xx = x + dx,
        yy = y + dy;
      if (
        !src.data[si + 3] ||
        xx < 0 ||
        yy < 0 ||
        xx >= dst.width ||
        yy >= dst.height
      )
        continue;
      const di = (yy * dst.width + xx) * 4,
        a = src.data[si + 3] / 255,
        da = dst.data[di + 3] / 255,
        oa = a + da * (1 - a);
      for (let k = 0; k < 3; k++)
        dst.data[di + k] = Math.round(
          (src.data[si + k] * a + dst.data[di + k] * da * (1 - a)) / oa,
        );
      dst.data[di + 3] = Math.round(oa * 255);
    }
}
export function crop(
  src: PixelImage,
  x: number,
  y: number,
  w: number,
  h: number,
): PixelImage {
  const dst = new Pixels(w, h);
  for (let j = 0; j < h; j++)
    dst.data.set(
      src.data.slice(
        ((j + y) * src.width + x) * 4,
        ((j + y) * src.width + x + w) * 4,
      ),
      j * w * 4,
    );
  return dst;
}
export function hexAt(img: PixelImage, i: number) {
  return (
    '#' +
    Array.from(img.data.slice(i, i + 3))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}
export function paletteErrors(img: PixelImage, allowed: Set<string>) {
  const out: string[] = [];
  for (let i = 0; i < img.data.length; i += 4)
    if (img.data[i + 3] && !allowed.has(hexAt(img, i)))
      out.push(
        `${(i / 4) % img.width},${Math.floor(i / 4 / img.width)} ${hexAt(img, i)}`,
      );
  return out;
}
