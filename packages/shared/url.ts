export type Camera = { x: number; y: number; zoom: number };
/** Smallest zoom a link can ask for (phones can zoom out this far). */
export const MIN_URL_ZOOM = 0.05;
/** Viewports whose shorter side is under this are phones (either orientation). */
export const PHONE_WIDTH = 600;
/** Opening zoom on phones: people are readable without zooming in. */
export const PHONE_ZOOM = 1;
export function parseUrl(url: string) {
  const u = new URL(url, 'http://local');
  const num = (k: string, fallback: number) => {
    const n = Number(u.searchParams.get(k));
    return u.searchParams.has(k) && Number.isFinite(n) ? n : fallback;
  };
  return {
    x: num('x', 2048),
    y: num('y', 1930),
    zoom: Math.min(12, Math.max(MIN_URL_ZOOM, num('z', 2))),
    /** True when the link chose a zoom; otherwise the app picks one for the screen. */
    hasZoom: u.searchParams.has('z'),
    id: u.pathname.startsWith('/c/')
      ? decodeURIComponent(u.pathname.slice(3))
      : undefined,
  };
}
export function serialiseUrl(c: Camera, id?: string) {
  return `${id ? '/c/' + encodeURIComponent(id) : '/'}?x=${Math.round(c.x)}&y=${Math.round(c.y)}&z=${c.zoom.toFixed(3)}`;
}
