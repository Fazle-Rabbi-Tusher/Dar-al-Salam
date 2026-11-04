import { type Rect, intersects } from './iso';
export class SpatialGrid<T> {
  private cells = new Map<string, Set<T>>();
  constructor(private size = 256) {}
  private keys(r: Rect) {
    const out: string[] = [];
    for (
      let x = Math.floor(r.x / this.size);
      x <= Math.floor((r.x + r.width) / this.size);
      x++
    )
      for (
        let y = Math.floor(r.y / this.size);
        y <= Math.floor((r.y + r.height) / this.size);
        y++
      )
        out.push(`${x},${y}`);
    return out;
  }
  insert(v: T, r: Rect) {
    for (const k of this.keys(r)) {
      if (!this.cells.has(k)) this.cells.set(k, new Set());
      this.cells.get(k)!.add(v);
    }
  }
  query(r: Rect) {
    const out = new Set<T>();
    for (const k of this.keys(r))
      for (const v of this.cells.get(k) ?? []) out.add(v);
    return [...out];
  }
}
export function visibleChunks(rect: Rect, margin = 1) {
  const out: string[] = [];
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++)
      if (
        intersects(
          {
            x: x * 1024 - margin * 1024,
            y: y * 1024 - margin * 1024,
            width: 1024 + margin * 2048,
            height: 1024 + margin * 2048,
          },
          rect,
        )
      )
        out.push(`${x},${y}`);
  return out;
}
export class LRU<K, V> {
  private map = new Map<K, V>();
  constructor(
    public capacity: number,
    private dispose: (v: V) => void,
  ) {}
  get(k: K) {
    const v = this.map.get(k);
    if (v !== undefined) {
      this.map.delete(k);
      this.map.set(k, v);
    }
    return v;
  }
  set(k: K, v: V) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    while (this.map.size > this.capacity) {
      const key = this.map.keys().next().value!;
      this.dispose(this.map.get(key)!);
      this.map.delete(key);
    }
  }
  clear() {
    for (const v of this.map.values()) this.dispose(v);
    this.map.clear();
  }
  get size() {
    return this.map.size;
  }
}
