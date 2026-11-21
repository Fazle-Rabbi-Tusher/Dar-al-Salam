import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
const darkRoomEntries = new Set([
  '/exhibits/al-bayt-al-muzlim',
  '/exhibits/al-bayt-al-muzlim/',
  '/exhibits/al-bayt-al-muzlim/index.html',
]);
/** Match production's legacy-entry redirects without changing archived files. */
function darkRoomRedirect(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const url = new URL(req.url ?? '/', 'http://world.local');
  if (darkRoomEntries.has(url.pathname)) {
    url.searchParams.set('exhibit', 'dark-room');
    res.writeHead(307, { Location: '/?' + url.searchParams.toString() });
    res.end();
    return;
  }
  next();
}
export default defineConfig({
  root: 'web',
  plugins: [
    {
      name: 'native-dark-room-entry',
      configureServer(server) {
        server.middlewares.use(darkRoomRedirect);
      },
      configurePreviewServer(server) {
        server.middlewares.use(darkRoomRedirect);
      },
    },
    react(),
  ],
  server: { fs: { allow: ['..'] } },
  build: { outDir: '../dist', emptyOutDir: true },
  test: { root: '.', include: ['packages/**/*.test.ts', 'tools/**/*.test.ts'] },
});
