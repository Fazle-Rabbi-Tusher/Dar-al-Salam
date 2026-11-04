import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
  TextureStyle,
  type WebGLRenderer,
} from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { globalFrame, frameMap } from '../../../packages/shared/clock';
import { characterState } from '../../../packages/shared/script';
import { depth, worldFromTile, type Rect } from '../../../packages/shared/iso';
import {
  SpatialGrid,
  LRU,
  visibleChunks,
} from '../../../packages/shared/spatial';
import { maskHit } from '../../../packages/shared/compositor';
import {
  manifestSchema,
  type BakedCharacter,
  type FrameMeta,
  type Manifest,
} from '../../../packages/shared/schema';
import { type Camera } from '../../../packages/shared/url';
TextureStyle.defaultOptions.scaleMode = 'nearest';
type EventMap = {
  characterClick: string;
  characterHover: string | null;
  cameraChange: Camera;
  progress: number;
  stats: { fps: number; draws: number; frame: number; visible: number };
  inspect: Record<string, string | number> | null;
  error: string;
};
type Live = {
  sprite: Sprite;
  shadow?: Sprite;
  character: BakedCharacter;
  frame: string;
  depth: number;
  mask: Uint8Array;
};
export class Engine {
  private app = new Application();
  private world = new Container();
  private lod = new Container();
  private chunks = new Container();
  private sortables = new Container();
  private highlight = new Container();
  private debug = new Container();
  private grid = new SpatialGrid<BakedCharacter>();
  private textures = new Map<string, Texture>();
  private metadata = new Map<string, FrameMeta>();
  private masks = new Map<string, Uint8Array>();
  private live = new Map<string, Live>();
  private pool: Sprite[] = [];
  private staticSprites: { sprite: Sprite; animation?: string[] }[] = [];
  private chunkCache = new LRU<string, Sprite>(24, (s) => {
    s.texture.destroy(true);
    s.destroy();
  });
  private loadingChunks = new Set<string>();
  private listeners = new Map<string, Set<(data: never) => void>>();
  private resizeObserver: ResizeObserver;
  private abort = new AbortController();
  private destroyed = false;
  private ready = false;
  private elapsed = 0;
  private lastFrame = -1;
  private frame = 0;
  private motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  private cam: Camera = { x: 2048, y: 1930, zoom: 2 };
  private velocity = { x: 0, y: 0 };
  private pointers = new Map<number, { x: number; y: number }>();
  private dragStart = { x: 0, y: 0 };
  private moved = 0;
  private zoomIdle = 0;
  private fade = 1;
  private hover: string | null = null;
  private selected: string | null = null;
  private inspector = false;
  private flight: {
    from: Camera;
    to: Camera;
    elapsed: number;
    duration: number;
  } | null = null;
  private base = '/world/';
  private lodLevels: Container[] = [];
  private emitElapsed = 0;
  private drawCalls = 0;
  private lastDrawCalls = 0;
  private renderDirty = true;
  manifest: Manifest | null = null;
  constructor(private host: HTMLElement) {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.ready) {
        this.app.renderer.resize(host.clientWidth, host.clientHeight);
        this.applyCamera();
      }
    });
    this.resizeObserver.observe(host);
  }
  on<K extends keyof EventMap>(name: K, cb: (data: EventMap[K]) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(cb as (data: never) => void);
    return () => {
      this.listeners.get(name)?.delete(cb as (data: never) => void);
    };
  }
  private emit<K extends keyof EventMap>(name: K, data: EventMap[K]) {
    for (const cb of this.listeners.get(name) ?? []) cb(data as never);
  }
  async load(url: string) {
    this.base = url.slice(0, url.lastIndexOf('/') + 1);
    this.emit('progress', 0.05);
    const response = await fetch(url, { signal: this.abort.signal });
    if (!response.ok) throw Error(`Manifest: HTTP ${response.status}`);
    const manifest = manifestSchema.parse(await response.json());
    this.manifest = manifest;
    await this.app.init({
      width: this.host.clientWidth,
      height: this.host.clientHeight,
      resolution: 1,
      autoDensity: false,
      background: '#d7dcd2',
      antialias: false,
      preference: 'webgl',
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    if (import.meta.env.DEV) {
      const gl = (this.app.renderer as WebGLRenderer).gl;
      const elements = gl.drawElements.bind(gl),
        arrays = gl.drawArrays.bind(gl);
      gl.drawElements = (mode, count, type, offset) => {
        this.drawCalls++;
        elements(mode, count, type, offset);
      };
      gl.drawArrays = (mode, first, count) => {
        this.drawCalls++;
        arrays(mode, first, count);
      };
      if (gl instanceof WebGL2RenderingContext) {
        const instanced = gl.drawElementsInstanced.bind(gl);
        gl.drawElementsInstanced = (mode, count, type, offset, instances) => {
          this.drawCalls++;
          instanced(mode, count, type, offset, instances);
        };
      }
    }
    this.host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute(
      'aria-label',
      'Interactive Mosque and Garden. Drag to explore, scroll to zoom, or use arrow keys.',
    );
    this.app.canvas.tabIndex = 0;
    this.world.addChild(
      this.lod,
      this.chunks,
      this.sortables,
      this.highlight,
      this.debug,
    );
    this.app.stage.addChild(this.world);
    this.sortables.sortableChildren = true;
    let completed = 0;
    for (const url of manifest.atlases) {
      const json = (await fetch(this.base + url, {
        signal: this.abort.signal,
      }).then((r) => r.json())) as {
        frames: Record<string, FrameMeta>;
        meta: { image: string };
      };
      const sheet = await Assets.load<Texture>(this.base + json.meta.image);
      for (const [name, m] of Object.entries(json.frames)) {
        this.textures.set(
          name,
          new Texture({
            source: sheet.source,
            frame: new Rectangle(m.frame.x, m.frame.y, m.frame.w, m.frame.h),
          }),
        );
        this.metadata.set(name, m);
        this.masks.set(
          name,
          Uint8Array.from(atob(m.hitMask), (c) => c.charCodeAt(0)),
        );
      }
      this.emit(
        'progress',
        0.1 + 0.3 * (++completed / manifest.atlases.length),
      );
    }
    for (const level of manifest.lod) {
      const container = new Container();
      for (const tile of level.tiles) {
        const texture = await Assets.load<Texture>(this.base + tile.url);
        const sprite = new Sprite(texture);
        sprite.position.set(tile.x, tile.y);
        sprite.scale.set(1 / level.scale);
        container.addChild(sprite);
      }
      this.lod.addChild(container);
      this.lodLevels.push(container);
    }
    this.emit('progress', 0.7);
    for (const s of manifest.sortables) {
      const sprite = new Sprite(this.textures.get(s.frame));
      const m = this.metadata.get(s.frame)!;
      sprite.pivot.set(...m.anchor);
      sprite.position.set(s.x, s.y);
      sprite.zIndex = s.depth;
      this.sortables.addChild(sprite);
      this.staticSprites.push({ sprite, animation: s.animation });
    }
    for (const c of manifest.characters) this.grid.insert(c, c.loopBounds);
    this.ready = true;
    this.applyCamera();
    await this.updateChunks();
    this.updateCharacters();
    this.bindInput();
    this.app.ticker.add((t) => this.tick(t.deltaMS));
    this.emit('progress', 1);
  }
  getCamera() {
    return { ...this.cam };
  }
  setMotion(on: boolean) {
    this.motion = on;
  }
  setZoom(zoom: number) {
    this.zoomAt(zoom, this.host.clientWidth / 2, this.host.clientHeight / 2);
  }
  flyTo(to: Camera, ms = 600) {
    this.velocity = { x: 0, y: 0 };
    this.zoomIdle = ms + 240;
    this.flight = {
      from: { ...this.cam },
      to: { ...to, zoom: Math.max(0.125, Math.min(4, to.zoom)) },
      elapsed: 0,
      duration: ms,
    };
  }
  focusCharacter(id: string) {
    const c = this.manifest?.characters.find(
      (c) => c.id === id && c.interactive,
    );
    if (!c) return;
    const s = characterState(c, this.frame);
    this.selected = id;
    this.flyTo({ x: s.position[0], y: s.position[1] - 24, zoom: 2 }, 600);
  }
  clearSelection() {
    this.selected = null;
    this.renderDirty = true;
  }
  private rect(margin = 0): Rect {
    return {
      x: this.cam.x - this.host.clientWidth / 2 / this.cam.zoom - margin,
      y: this.cam.y - this.host.clientHeight / 2 / this.cam.zoom - margin,
      width: this.host.clientWidth / this.cam.zoom + margin * 2,
      height: this.host.clientHeight / this.cam.zoom + margin * 2,
    };
  }
  private applyCamera() {
    if (!this.ready) return;
    const w = this.host.clientWidth / this.cam.zoom,
      h = this.host.clientHeight / this.cam.zoom;
    this.cam.x = Math.max(
      Math.min(w / 2, 2048),
      Math.min(4096 - Math.min(w / 2, 2048), this.cam.x),
    );
    this.cam.y = Math.max(
      Math.min(h / 2, 2048),
      Math.min(4096 - Math.min(h / 2, 2048), this.cam.y),
    );
    this.world.scale.set(this.cam.zoom);
    this.world.position.set(
      Math.round(this.host.clientWidth / 2 - this.cam.x * this.cam.zoom),
      Math.round(this.host.clientHeight / 2 - this.cam.y * this.cam.zoom),
    );
    this.renderDirty = true;
    this.emit('cameraChange', this.getCamera());
  }
  private async updateChunks() {
    if (!this.manifest) return;
    const needed = new Set(visibleChunks(this.rect()));
    for (const s of this.chunks.children) s.visible = needed.has(s.label);
    await Promise.all(
      [...needed].map(async (key) => {
        const existing = this.chunkCache.get(key);
        if (existing) {
          existing.visible = true;
          return;
        }
        if (this.loadingChunks.has(key)) return;
        this.loadingChunks.add(key);
        try {
          const [x, y] = key.split(',').map(Number);
          const c = this.manifest!.chunks.find(
            (c) => c.x === x * 1024 && c.y === y * 1024,
          )!;
          const texture = await Assets.load<Texture>(this.base + c.url);
          if (this.destroyed) return;
          const sprite = new Sprite(texture);
          sprite.label = key;
          sprite.position.set(c.x, c.y);
          this.chunks.addChild(sprite);
          this.chunkCache.set(key, sprite);
        } catch (e) {
          this.emit(
            'error',
            `Chunk unavailable; overview remains visible. ${String(e)}`,
          );
        } finally {
          this.loadingChunks.delete(key);
        }
      }),
    );
  }
  private texture(sprite: Sprite, name: string) {
    if (sprite.texture === this.textures.get(name)) return;
    const m = this.metadata.get(name)!;
    sprite.texture = this.textures.get(name)!;
    sprite.pivot.set(...m.anchor);
  }
  private updateCharacters() {
    const visible = this.grid.query(this.rect(64)).filter((c) => {
      const a = c.loopBounds,
        b = this.rect(64);
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    });
    const ids = new Set(visible.map((c) => c.id));
    for (const [id, item] of this.live)
      if (!ids.has(id)) {
        this.sortables.removeChild(item.sprite);
        if (item.shadow) {
          this.sortables.removeChild(item.shadow);
          this.pool.push(item.shadow);
        }
        item.sprite.filters = [];
        this.pool.push(item.sprite);
        this.live.delete(id);
      }
    for (const c of visible) {
      const state = characterState(c, this.frame),
        name = c.frames[`${state.action}_${state.facing}`][state.index];
      let item = this.live.get(c.id);
      if (!item) {
        const sprite = this.pool.pop() ?? new Sprite();
        this.sortables.addChild(sprite);
        item = {
          sprite,
          character: c,
          frame: name,
          depth: 0,
          mask: this.masks.get(name)!,
        };
        if (c.shadowFrame) {
          const shadow = this.pool.pop() ?? new Sprite();
          shadow.filters = [];
          this.texture(shadow, c.shadowFrame);
          this.sortables.addChild(shadow);
          item.shadow = shadow;
        }
        this.live.set(c.id, item);
      }
      this.texture(item.sprite, name);
      item.frame = name;
      item.mask = this.masks.get(name)!;
      item.sprite.position.set(
        Math.round(state.position[0]),
        Math.round(state.position[1]),
      );
      item.depth = depth(...state.tile);
      item.sprite.zIndex = item.depth;
      if (item.shadow) {
        const p = worldFromTile(...state.tile);
        item.shadow.position.set(Math.round(p[0]), Math.round(p[1]));
        item.shadow.zIndex = item.depth - 1;
      }
      const outlined = this.hover === c.id || this.selected === c.id;
      if (outlined) {
        let filter = item.sprite.filters?.[0] as OutlineFilter | undefined;
        if (!filter) {
          filter = new OutlineFilter({
            thickness: 1,
            color: 0xd8ad57,
            quality: 0.1,
          });
          item.sprite.filters = [filter];
        }
        filter.alpha =
          this.selected === c.id ? 0.65 + 0.35 * Math.sin(this.frame / 12) : 1;
      } else item.sprite.filters = [];
    }
    for (const item of this.staticSprites)
      if (item.animation)
        this.texture(
          item.sprite,
          item.animation[frameMap(this.frame, 60, item.animation.length)],
        );
    this.sortables.sortChildren();
    if (this.inspector) this.drawInspector();
  }
  private tick(dt: number) {
    if (!this.ready || this.destroyed) return;
    this.lastDrawCalls = this.drawCalls;
    this.drawCalls = 0;
    dt = Math.min(dt, 64);
    if (this.motion) this.elapsed += dt / 1000;
    this.frame = globalFrame(this.elapsed);
    let cameraChanged = false;
    if (this.flight) {
      const f = this.flight;
      f.elapsed += dt;
      const t = Math.min(1, f.elapsed / f.duration),
        ease = 1 - (1 - t) ** 3;
      this.cam = {
        x: f.from.x + (f.to.x - f.from.x) * ease,
        y: f.from.y + (f.to.y - f.from.y) * ease,
        zoom: f.from.zoom + (f.to.zoom - f.from.zoom) * ease,
      };
      cameraChanged = true;
      if (t === 1) this.flight = null;
    } else if (
      !this.pointers.size &&
      Math.hypot(this.velocity.x, this.velocity.y) > 0.015
    ) {
      this.cam.x -= (this.velocity.x * dt) / 16 / this.cam.zoom;
      this.cam.y -= (this.velocity.y * dt) / 16 / this.cam.zoom;
      const decay = Math.exp(-dt / 140);
      this.velocity.x *= decay;
      this.velocity.y *= decay;
      cameraChanged = true;
    }
    if (this.zoomIdle > 0) {
      this.zoomIdle -= dt;
      if (this.zoomIdle <= 0 && this.cam.zoom >= 1 && !this.pointers.size) {
        this.cam.zoom = Math.round(this.cam.zoom);
        cameraChanged = true;
      }
    }
    if (cameraChanged) this.applyCamera();
    const target = this.cam.zoom >= 0.5 ? 1 : 0;
    this.fade +=
      Math.sign(target - this.fade) *
      Math.min(Math.abs(target - this.fade), dt / 150);
    this.chunks.alpha = this.fade;
    this.sortables.alpha = this.fade;
    this.chunks.visible = this.fade > 0;
    this.sortables.visible = this.fade > 0;
    const level = this.cam.zoom < 0.25 ? 2 : this.cam.zoom < 0.5 ? 1 : 0;
    this.lodLevels.forEach((c, i) => (c.visible = i === level));
    if (this.lastFrame !== this.frame || this.renderDirty) {
      if (this.cam.zoom >= 0.5) this.updateCharacters();
      this.lastFrame = this.frame;
      this.renderDirty = false;
    }
    this.emitElapsed += dt;
    if (this.emitElapsed >= 120) {
      this.emitElapsed = 0;
      void this.updateChunks();
      if (import.meta.env.DEV)
        this.emit('stats', {
          fps: Math.round(this.app.ticker.FPS),
          draws: this.lastDrawCalls,
          frame: this.frame,
          visible: this.live.size,
        });
    }
  }
  private point(e: PointerEvent | WheelEvent) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  private pointerWorld(p: { x: number; y: number }) {
    return {
      x: (p.x - this.world.x) / this.cam.zoom,
      y: (p.y - this.world.y) / this.cam.zoom,
    };
  }
  private zoomAt(z: number, x: number, y: number) {
    this.flight = null;
    this.velocity = { x: 0, y: 0 };
    const before = this.pointerWorld({ x, y });
    this.cam.zoom = Math.max(0.125, Math.min(4, z));
    this.cam.x = before.x - (x - this.host.clientWidth / 2) / this.cam.zoom;
    this.cam.y = before.y - (y - this.host.clientHeight / 2) / this.cam.zoom;
    this.zoomIdle = 240;
    this.applyCamera();
  }
  private hit(p: { x: number; y: number }) {
    if (this.cam.zoom < 0.5) return null;
    const w = this.pointerWorld(p);
    for (const item of [...this.live.values()]
      .filter((i) => i.character.interactive)
      .sort((a, b) => b.depth - a.depth)) {
      const m = this.metadata.get(item.frame)!;
      if (
        maskHit(
          item.mask,
          m.frame.w,
          m.frame.h,
          w.x - item.sprite.x + m.anchor[0],
          w.y - item.sprite.y + m.anchor[1],
        )
      )
        return item.character.id;
    }
    return null;
  }
  private bindInput() {
    const canvas = this.app.canvas,
      options = { signal: this.abort.signal };
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        canvas.focus();
        canvas.setPointerCapture(e.pointerId);
        const p = this.point(e);
        this.pointers.set(e.pointerId, p);
        this.dragStart = p;
        this.moved = 0;
        this.velocity = { x: 0, y: 0 };
        this.flight = null;
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        const p = this.point(e),
          old = this.pointers.get(e.pointerId);
        if (old) {
          if (this.pointers.size === 2) {
            const other = [...this.pointers.entries()].find(
              ([id]) => id !== e.pointerId,
            )![1];
            const a = Math.hypot(old.x - other.x, old.y - other.y),
              b = Math.hypot(p.x - other.x, p.y - other.y);
            this.zoomAt(
              (this.cam.zoom * b) / Math.max(1, a),
              (p.x + other.x) / 2,
              (p.y + other.y) / 2,
            );
          } else {
            const dx = p.x - old.x,
              dy = p.y - old.y;
            this.cam.x -= dx / this.cam.zoom;
            this.cam.y -= dy / this.cam.zoom;
            this.velocity = { x: dx, y: dy };
            this.applyCamera();
          }
          this.pointers.set(e.pointerId, p);
          this.moved = Math.max(
            this.moved,
            Math.hypot(p.x - this.dragStart.x, p.y - this.dragStart.y),
          );
        } else {
          const hit = this.hit(p);
          if (hit !== this.hover) {
            this.hover = hit;
            this.renderDirty = true;
            canvas.style.cursor = hit ? 'pointer' : 'grab';
            this.emit('characterHover', hit);
          }
          if (this.inspector) this.drawInspector();
        }
      },
      options,
    );
    const up = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      if (this.pointers.size === 1 && this.moved < 5) {
        const hit = this.hit(this.point(e));
        if (hit) {
          this.selected = hit;
          this.emit('characterClick', hit);
          this.renderDirty = true;
        }
      }
      this.pointers.delete(e.pointerId);
    };
    canvas.addEventListener('pointerup', up, options);
    canvas.addEventListener(
      'pointercancel',
      (e) => {
        this.pointers.delete(e.pointerId);
        this.velocity = { x: 0, y: 0 };
      },
      options,
    );
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const p = this.point(e);
        this.zoomAt(this.cam.zoom * Math.exp(-e.deltaY * 0.0015), p.x, p.y);
      },
      { ...options, passive: false },
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if ((e.target as HTMLElement)?.closest('input,textarea,select,button'))
          return;
        if (e.key.toLowerCase() === 'i' && import.meta.env.DEV) {
          this.inspector = !this.inspector;
          this.debug.visible = this.inspector;
          this.renderDirty = true;
          if (!this.inspector) this.emit('inspect', null);
        }
        const delta = 80 / this.cam.zoom;
        if (e.key === 'ArrowLeft') this.cam.x -= delta;
        else if (e.key === 'ArrowRight') this.cam.x += delta;
        else if (e.key === 'ArrowUp') this.cam.y -= delta;
        else if (e.key === 'ArrowDown') this.cam.y += delta;
        else if (['+', '='].includes(e.key)) this.setZoom(this.cam.zoom + 0.5);
        else if (e.key === '-') this.setZoom(this.cam.zoom - 0.5);
        else return;
        e.preventDefault();
        this.applyCamera();
      },
      options,
    );
  }
  private drawInspector() {
    for (const c of this.debug.removeChildren()) c.destroy();
    const g = new Graphics();
    this.debug.addChild(g);
    const { width: rw, height: rh } = this.manifest!.room;
    for (let i = 0; i <= rw; i++)
      g.moveTo(...worldFromTile(i, 0)).lineTo(...worldFromTile(i, rh));
    for (let i = 0; i <= rh; i++)
      g.moveTo(...worldFromTile(0, i)).lineTo(...worldFromTile(rw, i));
    g.stroke({ color: 0x377d79, width: 0.5, alpha: 0.4 });
    for (let i = 0; i <= 4; i++)
      g.moveTo(i * 1024, 0)
        .lineTo(i * 1024, 4096)
        .moveTo(0, i * 1024)
        .lineTo(4096, i * 1024);
    g.stroke({ color: 0xc87865, width: 2, alpha: 0.6 });
    const collision = this.manifest!.room.layers.find(
      (l) => l.name === 'collision',
    );
    if (collision?.type === 'tilelayer')
      for (let i = 0; i < collision.data.length; i++)
        if (collision.data[i]) {
          const x = i % rw,
            y = Math.floor(i / rw);
          g.poly(
            [
              worldFromTile(x, y),
              worldFromTile(x + 1, y),
              worldFromTile(x + 1, y + 1),
              worldFromTile(x, y + 1),
            ].flat(),
          ).fill({ color: 0xd45454, alpha: 0.14 });
        }
    for (const s of this.manifest!.sortables) {
      g.rect(
        s.x - this.metadata.get(s.frame)!.anchor[0],
        s.y - this.metadata.get(s.frame)!.anchor[1],
        this.metadata.get(s.frame)!.frame.w,
        this.metadata.get(s.frame)!.frame.h,
      ).stroke({ color: 0xb99736, width: 0.5, alpha: 0.4 });
    }
    for (const item of this.live.values()) {
      const c = item.character;
      for (const s of c.script)
        if (s.path) {
          const ps = s.path.map((p) => worldFromTile(...p));
          g.moveTo(...ps[0]);
          ps.slice(1).forEach((p) => g.lineTo(...p));
          g.stroke({ color: 0x448bbb, width: 1 });
          for (let i = 1; i < ps.length; i++) {
            const [x, y] = ps[i],
              a = Math.atan2(y - ps[i - 1][1], x - ps[i - 1][0]);
            g.moveTo(x - 5 * Math.cos(a - 0.5), y - 5 * Math.sin(a - 0.5))
              .lineTo(x, y)
              .lineTo(x - 5 * Math.cos(a + 0.5), y - 5 * Math.sin(a + 0.5))
              .stroke({ color: 0x448bbb, width: 1 });
          }
        }
      const s = characterState(c, this.frame);
      g.circle(...s.position, 2).fill(0xc87865);
      const label = new Text({
        text: `${c.id} ${item.depth.toFixed(0)}`,
        style: { fontSize: 6, fill: 0x493c35 },
      });
      label.position.set(s.position[0] + 4, s.position[1]);
      this.debug.addChild(label);
      if (c.pairWith) {
        const pair = this.manifest!.characters.find((p) => p.id === c.pairWith);
        if (pair)
          g.moveTo(...s.position)
            .lineTo(...characterState(pair, this.frame).position)
            .stroke({ color: 0xbd65ae, width: 1 });
      }
    }
    if (this.hover) {
      const item = this.live.get(this.hover)!;
      const state = characterState(item.character, this.frame),
        m = this.metadata.get(item.frame)!;
      for (let y = 0; y < m.frame.h; y++)
        for (let x = 0; x < m.frame.w; x++)
          if (maskHit(item.mask, m.frame.w, m.frame.h, x, y))
            g.rect(
              item.sprite.x - m.anchor[0] + x,
              item.sprite.y - m.anchor[1] + y,
              1,
              1,
            ).fill({ color: 0xe4b34e, alpha: 0.6 });
      this.emit('inspect', {
        id: this.hover,
        step: state.stepIndex,
        frame: state.index,
        facing: state.facing,
        depth: Math.round(item.depth),
      });
    } else this.emit('inspect', { frame: this.frame, visible: this.live.size });
  }
  destroy() {
    this.destroyed = true;
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.listeners.clear();
    this.chunkCache.clear();
    if (this.ready) this.app.destroy(true, { children: true, texture: false });
  }
}
