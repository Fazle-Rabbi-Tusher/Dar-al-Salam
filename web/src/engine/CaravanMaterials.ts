import { Texture } from 'pixi.js';
import type { RigFace } from '../../../packages/shared/royal-caravan';

const names = [
  'elephant',
  'camel',
  'brocade',
  'linen',
  'wicker',
  'gold',
  'leather',
  'wood',
  'rope',
  ...Array.from({ length: 6 }, (_, i) => 'carrier-face-' + i),
  ...['face', 'linen', 'brocade', 'velvet', 'gold'].map(
    (name) => 'mansa-' + name,
  ),
];
const palette = [
  '#465773',
  '#e5dcc7',
  '#9f6042',
  '#47566e',
  '#aa8b56',
  '#9f987f',
];
export function caravanSurface(face: RigFace & { cargoMaterial?: string }) {
  let name: string | undefined,
    tint = '#ffffff';
  if (face.uv) {
    if (face.texture?.startsWith('carrier-face-')) name = face.texture;
    else if (face.texture?.startsWith('carrier-linen-')) {
      name = 'linen';
      tint = palette[Number(face.texture.split('-').at(-1))];
    } else if (face.cargoMaterial === 'horse') {
      name = 'camel';
      tint = '#34424c';
    } else if (face.cargoMaterial === 'elephant') {
      name = 'elephant';
      tint = '#a0b9d2';
    } else if (face.cargoMaterial === 'gold-cloth') name = 'gold';
    else if (face.cargoMaterial && names.includes(face.cargoMaterial))
      name = face.cargoMaterial;
    else if (
      !face.cargoMaterial &&
      face.finish &&
      ['face', 'linen', 'brocade', 'velvet', 'gold'].includes(face.finish)
    )
      name = 'mansa-' + face.finish;
  }
  return {
    tile: name ? names.indexOf(name) : -1,
    clamp: name?.includes('face') ? 1 : 0,
    tint: [1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16) / 255),
  };
}

/** Technical atlas packing of the same unchanged material PNGs as the GLBs. */
export async function loadCaravanSurface(base: string): Promise<Texture> {
  const root = new URL(
    '../models/gold-cargo/textures/',
    new URL(base, window.location.href),
  );
  const images = await Promise.all(
    names.map(
      (name) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = () =>
            reject(new Error('Missing caravan material: ' + name));
          image.src = new URL(name + '.png', root).href;
        }),
    ),
  );
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = false;
  images.forEach((image, index) => {
    const x = (index % 8) * 256,
      y = Math.floor(index / 8) * 256,
      pad = 16,
      size = 224;
    context.drawImage(image, x + pad, y + pad, size, size);
    context.drawImage(image, 0, 0, 1, image.height, x, y + pad, pad, size);
    context.drawImage(
      image,
      image.width - 1,
      0,
      1,
      image.height,
      x + pad + size,
      y + pad,
      pad,
      size,
    );
    context.drawImage(image, 0, 0, image.width, 1, x + pad, y, size, pad);
    context.drawImage(
      image,
      0,
      image.height - 1,
      image.width,
      1,
      x + pad,
      y + pad + size,
      size,
      pad,
    );
    for (const sx of [0, 1])
      for (const sy of [0, 1])
        context.drawImage(
          image,
          sx * (image.width - 1),
          sy * (image.height - 1),
          1,
          1,
          x + sx * (256 - pad),
          y + sy * (256 - pad),
          pad,
          pad,
        );
  });
  const texture = Texture.from(canvas);
  texture.source.scaleMode = 'linear';
  texture.source.autoGenerateMipmaps = true;
  texture.source.updateMipmaps();
  return texture;
}
