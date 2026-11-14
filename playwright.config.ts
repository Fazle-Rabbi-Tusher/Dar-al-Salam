import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  timeout: 45000,
  // Cold WebGL compilation and the detailed world atlases can exceed five
  // seconds on software-rendered CI, before any interactive scene is ready.
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
    },
  },
  workers: 1,
  reporter: 'list',
});
