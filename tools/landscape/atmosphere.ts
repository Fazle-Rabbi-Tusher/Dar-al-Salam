import type { PixelImage } from '../../packages/shared/pixels';

/** Bake mist into colour while retaining exactly the same silhouette and foot.
 * Runtime texture swaps then preserve atlas batching and avoid per-tree filters.
 */
export function forestHaze(
  source: PixelImage,
  layer: 'middle' | 'far',
): PixelImage {
  const data = new Uint8Array(source.data);
  const haze = layer === 'far' ? [167, 193, 190] : [80, 125, 125];
  const amount = layer === 'far' ? 0.72 : 0.4;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const grey = data[i] * 0.25 + data[i + 1] * 0.6 + data[i + 2] * 0.15;
    for (let c = 0; c < 3; c++) {
      const muted = source.data[i + c] * 0.68 + grey * 0.32;
      data[i + c] = Math.round(muted * (1 - amount) + haze[c] * amount);
    }
  }
  return { width: source.width, height: source.height, data };
}
