export const FPS = 12,
  BASE_LOOP = 60,
  MASTER_LOOP = 240;
export const LOOPS = [60, 120, 240] as const;
export const globalFrame = (seconds: number) =>
  Math.floor(seconds * FPS) % MASTER_LOOP;
export const frameMap = (frame: number, loop: number, count: number) =>
  Math.floor(((frame % loop) * count) / loop) % count;
