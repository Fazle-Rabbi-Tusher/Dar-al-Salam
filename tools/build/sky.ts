import sharp from 'sharp';
/** Placeholder until the sky is painted (replaced below). */
export async function generateSky(file: string) {
  await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#cfe3ee' },
  })
    .webp()
    .toFile(file);
}
