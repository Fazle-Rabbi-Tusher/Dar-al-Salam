import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'web',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  build: { outDir: '../dist', emptyOutDir: true },
  test: { root: '.', include: ['packages/**/*.test.ts', 'tools/**/*.test.ts'] },
});
