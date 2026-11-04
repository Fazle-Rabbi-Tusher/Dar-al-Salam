export type Camera = { x: number; y: number; zoom: number };
export function parseUrl(url: string) {
  const u = new URL(url, 'http://local');
  const num = (k: string, fallback: number) => {
    const n = Number(u.searchParams.get(k));
    return u.searchParams.has(k) && Number.isFinite(n) ? n : fallback;
  };
  return {
    x: num('x', 2048),
    y: num('y', 1940),
    zoom: Math.min(4, Math.max(0.125, num('z', 1))),
    id: u.pathname.startsWith('/c/')
      ? decodeURIComponent(u.pathname.slice(3))
      : undefined,
  };
}
export function serialiseUrl(c: Camera, id?: string) {
  return `${id ? '/c/' + encodeURIComponent(id) : '/'}?x=${Math.round(c.x)}&y=${Math.round(c.y)}&z=${c.zoom.toFixed(3)}`;
}
