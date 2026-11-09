import {
  Application,
  Assets,
  Container,
  GlProgram,
  Graphics,
  Mesh,
  MeshGeometry,
  Rectangle,
  Shader,
  Sprite,
  Text,
  Texture,
  TextureStyle,
  UniformGroup,
  type WebGLRenderer,
} from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { globalFrame, frameMap } from '../../../packages/shared/clock';
import { characterState, frameKey } from '../../../packages/shared/script';
import { motionFor } from '../../../packages/shared/motion';
import { maskHit } from '../../../packages/shared/compositor';
import {
  FACING_DIRECTION,
  PLANET,
  RADIUS_PX,
  WILD,
  WILD_GLSL,
  MASSAWA,
  fitZoom,
  focusFromWorld,
  frame as planetFrame,
  planetToTile,
  project,
  screenFacing,
  tileToPlanet,
  unproject,
  worldFromFocus,
  type Frame,
  type Vec3,
} from '../../../packages/shared/planet';
import {
  manifestSchema,
  type BakedCharacter,
  type FrameMeta,
  type Manifest,
  type Sortable,
} from '../../../packages/shared/schema';
import { MIN_URL_ZOOM, type Camera } from '../../../packages/shared/url';
import { worldFromTile, type Point } from '../../../packages/shared/iso';
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
};
type Static = {
  sprite: Sprite;
  sortable: Sortable;
  point: Vec3;
  size: number;
  /** Sprite pixels per world pixel (detailed supplied art is drawn finer). */
  density: number;
  depth: number;
};
type ViewState = { lat: number; lon: number; zoom: number };
const MAX_ZOOM = 4,
  MAX_LAT = 1.32;

const vertex = /* glsl */ `
in vec2 aPosition;
out vec2 vPos;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPos = aPosition;
}`;
const f = (n: number) => n.toFixed(6);
// The planet: wraps the quarter's top-down floor onto a sphere, fills the rest
// with grass, lakes and a ring road, then adds soft lighting and a halo.
const fragment = /* glsl */ `
in vec2 vPos;
out vec4 finalColor;
uniform sampler2D uGround;
uniform vec2 uCentre;
uniform float uRadius;
uniform mat3 uRot;
const vec2 MAP_CENTRE = vec2(${f(PLANET.centre[0])}, ${f(PLANET.centre[1])});
const float RADIUS_TILES = ${f(PLANET.radiusTiles)};
uniform vec2 uMapSize;
uniform float uMode;
uniform float uTime;
const vec3 DEEP = vec3(0.122, 0.361, 0.525);
const vec3 SEA = vec3(0.180, 0.490, 0.659);
const vec3 SEA_LIGHT = vec3(0.373, 0.659, 0.784);
const vec3 SHALLOW = vec3(0.247, 0.686, 0.722);
const vec3 SHALLOW_LIGHT = vec3(0.498, 0.847, 0.816);
const vec3 FOAM = vec3(0.949, 0.984, 0.969);
const vec3 WET_SAND = vec3(0.788, 0.675, 0.486);
const vec3 SAND = vec3(0.910, 0.827, 0.635);
const vec3 SAND_LIGHT = vec3(0.953, 0.894, 0.745);
const vec3 MEADOW = vec3(0.525, 0.702, 0.353);
const vec3 MEADOW_LIGHT = vec3(0.639, 0.788, 0.416);
const vec3 MEADOW_DARK = vec3(0.416, 0.604, 0.282);
const vec3 FOREST = vec3(0.310, 0.502, 0.251);
const vec3 FOREST_LIGHT = vec3(0.400, 0.600, 0.290);
const vec3 FOREST_DARK = vec3(0.227, 0.396, 0.208);
const vec3 ROCK = vec3(0.541, 0.592, 0.627);
const vec3 ROCK_LIGHT = vec3(0.702, 0.741, 0.761);
const vec3 ROCK_DARK = vec3(0.373, 0.420, 0.459);
const vec3 MOSS = vec3(0.431, 0.549, 0.306);
const vec3 STONE = vec3(0.843, 0.863, 0.824);
const vec3 STONE_DARK = vec3(0.710, 0.765, 0.729);
// Massawa's golden desert sand (after the owner's desert sheet).
const vec3 DESERT = vec3(0.886, 0.643, 0.333);
const vec3 DESERT_LIGHT = vec3(0.945, 0.737, 0.427);
const vec3 DESERT_DARK = vec3(0.776, 0.522, 0.255);
const vec3 SCRUB = vec3(0.800, 0.635, 0.420);
const vec3 SCRUB_DARK = vec3(0.698, 0.541, 0.345);
const vec3 DRY_GRASS = vec3(0.690, 0.616, 0.333);
const vec3 DRY_GRASS_DARK = vec3(0.553, 0.494, 0.259);
const vec3 OASIS_DEEP = vec3(0.157, 0.420, 0.502);
const vec3 OASIS = vec3(0.251, 0.588, 0.616);
const vec3 OASIS_EDGE = vec3(0.459, 0.749, 0.722);
const vec3 REED = vec3(0.420, 0.557, 0.243);
const vec3 REED_DARK = vec3(0.290, 0.420, 0.180);
const vec3 PLAZA = vec3(0.851, 0.788, 0.667);
const vec3 PLAZA_LIGHT = vec3(0.886, 0.831, 0.718);
const vec3 PLAZA_DARK = vec3(0.796, 0.725, 0.596);
const vec3 PLAZA_JOINT = vec3(0.733, 0.659, 0.533);
const vec3 CORAL = vec3(0.863, 0.800, 0.663);
const vec3 CORAL_LIGHT = vec3(0.925, 0.878, 0.769);
const vec3 CORAL_DARK = vec3(0.663, 0.584, 0.463);
float hash(vec3 q) {
  return fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}
${WILD_GLSL}
vec3 flower(float h) {
  float k = fract(h * 97.0);
  return k < 0.3 ? vec3(0.922, 0.667, 0.714)
    : k < 0.55 ? vec3(0.961, 0.933, 0.859)
    : k < 0.8 ? vec3(0.961, 0.784, 0.259)
    : vec3(0.659, 0.518, 0.690);
}
// Desert sand: long soft dunes, dithered so they never band into stripes.
vec3 desertSand(vec3 p, vec2 tile, float h, float h2) {
  float dune = sin(tile.x * 0.55 + tile.y * 0.35 + coveField(p) * 6.0);
  if (h2 > 0.986) return DESERT_DARK;
  if (h < (dune - 0.3) * 0.55) return DESERT_LIGHT;
  if (h > 1.0 - (-dune - 0.35) * 0.45) return DESERT_DARK;
  return h > 0.975 ? DESERT_LIGHT : DESERT;
}
// Banded, dithered colour steps (pixel-art painting), lit by the planet shade.
vec3 wild(vec3 p, vec2 tile) {
  // Texels at the quarter's own floor density (16 per tile).
  vec3 cell = floor(p * ${f(PLANET.radiusTiles * 16)});
  float h = hash(cell), h2 = hash(cell + 17.0);
  // The world clock (12 fps frames, 0–239): every motion loops every 240.
  float t = uTime * 6.2831853 / 240.0;
  float land = landField(p, tile);
  if (land < 0.0) {
    float depth = -land + (h - 0.5) * 1.2;
    vec3 col = depth > 9.0 ? DEEP : depth > ${f(WILD.shallows)} ? SEA
      : depth > 2.2 ? SHALLOW : SHALLOW_LIGHT;
    // Long light dashes drifting across the open water.
    float stripe = sin(p.y * 620.0 + coveField(p) * 6.0 + t * 3.0);
    float dash = sin(p.x * 260.0 - p.z * 210.0 + h * 1.5);
    if (depth > 2.0 && stripe > 0.94 && dash > 0.1)
      col = depth > ${f(WILD.shallows)} ? SEA_LIGHT : SHALLOW_LIGHT;
    // Surf: the foam line laps in and out, and a wave rolls in every 5 s.
    float swash = 0.35 + 0.55 * (0.5 + 0.5 * sin(t * 4.0 + coveField(p) * 9.0));
    if (-land < swash && h > 0.15) col = FOAM;
    float roll = fract(uTime / 60.0), line = 3.8 * (1.0 - roll);
    if (abs(-land - line) < 0.2 && h > 0.25 + 0.5 * roll) col = mix(col, FOAM, 0.8);
    // Sparkles on the open water.
    if (depth > 3.0 && h2 > 0.996 && sin(t * 8.0 + h * 40.0) > 0.6) col = FOAM;
    return col;
  }
  if (abs(p.z) < ${f(WILD.roadHalfWidth)} && land > 0.5) {
    float along = atan(p.y, p.x) * 140.0;
    float across = p.z / ${f(WILD.roadHalfWidth)};
    float joint = step(0.92, fract(along)) + step(0.86, abs(across));
    return mix(STONE, STONE_DARK, clamp(joint, 0.0, 1.0));
  }
  // Massawa's oasis: a still pool, reeds at its edge, damp sand round it.
  float pool = massawaOasis(tile) + (h - 0.5) * 0.25;
  if (pool < ${f(MASSAWA.oasis.radius)}) {
    if (pool > ${f(MASSAWA.oasis.radius - 0.35)}) return h2 > 0.5 ? REED : OASIS_EDGE;
    if (h2 > 0.993 && sin(t * 6.0 + h * 30.0) > 0.7) return FOAM;
    return pool < ${f(MASSAWA.oasis.radius - 1.3)} ? OASIS_DEEP : OASIS;
  }
  if (pool < ${f(MASSAWA.oasis.radius + 0.9)})
    return h > 0.82 ? (h2 > 0.5 ? REED : REED_DARK) : DESERT_DARK;
  // Massawa: the town's trodden sand and the mosque's forecourt, ringed by
  // dry thorn scrub that blends back into the woods.
  float dry = massawaDryness(p, tile) + (h - 0.5) * 1.6;
  if (dry > ${f(MASSAWA.town.fringe)} && land >= ${f(WILD.beach)}) {
    float r = length(tile - PLAZA_CENTRE);
    if (r < ${f(MASSAWA.plaza.radius)} - 0.3 + (h - 0.5) * 0.9) {
      // Sun-worn limestone flagstones in offset rows, half buried in sand.
      vec2 sq = tile * 1.5;
      float row = floor(sq.y), col = floor(sq.x + row * 0.5);
      vec2 fq = vec2(fract(sq.x + row * 0.5), fract(sq.y));
      float stone = hash(vec3(col, row, 9.0));
      if (stone < 0.12) return desertSand(p, tile, h, h2);
      if ((fq.x < 0.05 || fq.y < 0.07) && h > 0.25) return PLAZA_JOINT;
      if (h > 0.95) return PLAZA_LIGHT;
      if (h < 0.04) return PLAZA_DARK;
      return stone > 0.8 ? PLAZA_LIGHT : stone < 0.3 ? PLAZA_DARK : PLAZA;
    }
    // Trodden lanes: slightly darker, packed sand between the houses.
    float lane = sin(tile.x * 0.9 + coveField(p) * 4.0) * sin(tile.y * 0.7 - coveField(p) * 3.0);
    if (lane > 0.55 && h > 0.35) return h > 0.8 ? DESERT : DESERT_DARK;
    return desertSand(p, tile, h, h2);
  }
  // Open desert round the town: golden sand with fine wind ripples.
  if (dry > ${f(MASSAWA.town.scrub)} && land >= ${f(WILD.beach)}) {
    float ripple = sin((tile.x - tile.y) * 3.1 + coveField(p) * 9.0);
    if (ripple > 0.9 && h > 0.45) return DESERT_LIGHT;
    if (ripple < -0.93 && h > 0.5) return DESERT_DARK;
    return desertSand(p, tile, h, h2);
  }
  float edge = land + (h - 0.5) * 0.8;
  if (edge < ${f(WILD.beach)}) {
    if (land < 0.55) return h > 0.93 ? SAND_LIGHT : WET_SAND;
    return h > 0.9 ? SAND_LIGHT : h < 0.07 ? WET_SAND : SAND;
  }
  if (dry > 0.0) {
    // Thorn scrub: dry earth with tufts of sun-bleached grass.
    float tuft = hash(floor(p * ${f(PLANET.radiusTiles * 5)}));
    if (tuft > 0.82 && h > 0.25) return h > 0.7 ? DRY_GRASS : DRY_GRASS_DARK;
    if (h2 > 0.985) return DESERT_DARK;
    return tuft < 0.25 ? SCRUB_DARK : h > 0.94 ? DESERT_LIGHT : SCRUB;
  }
  float d = mapDistance(tile), dither = (h - 0.5) * 0.06;
  float rock = rockField(p);
  if (land > 10.0 && d > 6.0 && rock + dither > ${f(WILD.rockAbove)}) {
    // Rocky hills: mottled stone in clumps, moss in the cracks.
    float clump = hash(floor(p * ${f(PLANET.radiusTiles * 4)}));
    if (rock < ${f(WILD.rockAbove + 0.03)} || h > 0.88) return MOSS;
    if (h < 0.05) return ROCK_DARK;
    return clump > 0.66 ? ROCK_LIGHT : clump < 0.22 ? ROCK_DARK : ROCK;
  }
  float patchy = forestField(p) * 0.5 + coveField(p) * 0.25 + (h - 0.5) * 0.35;
  if (d > 4.0 && forestField(p) + dither > ${f(WILD.forestAbove)}) {
    if (h2 > 0.97) return MOSS;
    return patchy > 0.3 ? FOREST_DARK : patchy < -0.05 ? FOREST_LIGHT : FOREST;
  }
  if (h2 > 0.982) return flower(h2);
  return patchy > 0.28 ? MEADOW_DARK : patchy < -0.28 ? MEADOW_LIGHT : MEADOW;
}
void main() {
  vec2 d = (vPos - uCentre) / uRadius;
  d.y = -d.y;
  float r2 = dot(d, d);
  if (r2 > 1.0 || uMode < 0.5) {
    // Halo pass (drawn behind everything) or outside the disc.
    float glow = uMode < 0.5 ? smoothstep(1.085, 1.0, sqrt(r2)) * 0.7 : 0.0;
    finalColor = vec4(vec3(1.0, 0.98, 0.92) * glow, glow);
    return;
  }
  vec3 n = vec3(d, sqrt(1.0 - r2));
  vec3 p = uRot * n;
  float theta = acos(clamp(p.z, -1.0, 1.0));
  float s = length(p.xy);
  vec2 tile = MAP_CENTRE;
  if (s > 1e-6) {
    vec2 en = p.xy * (theta * RADIUS_TILES / s);
    tile += vec2(en.x - en.y, -en.x - en.y) * 0.70710678;
  }
  vec3 col;
  if (tile.x >= 0.0 && tile.y >= 0.0 && tile.x < uMapSize.x && tile.y < uMapSize.y)
    col = texture(uGround, tile / uMapSize).rgb;
  else col = wild(p, tile);
  float light = clamp(dot(n, normalize(vec3(-0.35, 0.6, 0.72))), 0.0, 1.0);
  float shade = 0.74 + 0.26 * floor(light * 6.0) / 6.0;
  float rim = smoothstep(0.32, 0.0, n.z);
  col = mix(col * shade, vec3(0.96, 0.95, 1.0), rim * 0.35);
  finalColor = vec4(col, 1.0);
}`;

export class Engine {
  private app = new Application();
  private behind = new Container();
  private front = new Container();
  private highlight = new Container();
  private debug = new Container();
  private planet!: Mesh<MeshGeometry, Shader>;
  private halo!: Mesh<MeshGeometry, Shader>;
  private uniforms!: UniformGroup;
  private textures = new Map<string, Texture>();
  private metadata = new Map<string, FrameMeta>();
  private masks = new Map<string, Uint8Array>();
  private live = new Map<string, Live>();
  private statics: Static[] = [];
  private listeners = new Map<string, Set<(data: never) => void>>();
  private resizeObserver: ResizeObserver;
  private abort = new AbortController();
  private destroyed = false;
  private ready = false;
  private elapsed = 0;
  private lastFrame = -1;
  private frame = 0;
  private motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  private view: ViewState = { ...focusFromWorld(2048, 1930), zoom: 2 };
  private proj!: Frame;
  private velocity = { lat: 0, lon: 0 };
  private pointers = new Map<number, { x: number; y: number }>();
  private dragStart = { x: 0, y: 0 };
  private moved = 0;
  private zoomIdle = 0;
  private hover: string | null = null;
  private selected: string | null = null;
  private inspector = false;
  private flight: {
    from: ViewState;
    to: ViewState;
    elapsed: number;
    duration: number;
  } | null = null;
  private base = '/world/';
  private emitElapsed = 0;
  private drawCalls = 0;
  private lastDrawCalls = 0;
  private dirty = true;
  manifest: Manifest | null = null;
  constructor(private host: HTMLElement) {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.ready) {
        this.app.renderer.resize(host.clientWidth, host.clientHeight);
        this.resizePlanet();
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
      // Render at the screen's real pixel density (like Floor796) so phones
      // and high-DPI displays show crisp art instead of stretched pixels.
      resolution: Math.min(window.devicePixelRatio || 1, 3),
      autoDensity: true,
      backgroundAlpha: 0,
      antialias: false,
      preference: 'webgl',
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    if (import.meta.env.DEV) this.countDrawCalls();
    this.host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute(
      'aria-label',
      'Interactive planet. Drag to spin the globe, scroll to zoom, or use arrow keys.',
    );
    this.app.canvas.tabIndex = 0;
    let completed = 0;
    for (const atlas of manifest.atlases) {
      const json = (await fetch(this.base + atlas, {
        signal: this.abort.signal,
      }).then((r) => r.json())) as {
        frames: Record<string, FrameMeta>;
        meta: { image: string; smooth?: boolean };
      };
      const sheet = await Assets.load<Texture>(this.base + json.meta.image);
      if (json.meta.smooth) {
        // Detailed high-density art: smooth filtering with mipmaps.
        sheet.source.scaleMode = 'linear';
        sheet.source.autoGenerateMipmaps = true;
        sheet.source.updateMipmaps();
      }
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
        0.1 + 0.5 * (++completed / manifest.atlases.length),
      );
    }
    const ground = await Assets.load<Texture>(this.base + manifest.ground.url);
    this.emit('progress', 0.75);
    this.createPlanet(ground, manifest);
    this.app.stage.addChild(
      this.halo,
      this.behind,
      this.planet,
      this.front,
      this.highlight,
      this.debug,
    );
    this.behind.sortableChildren = true;
    this.front.sortableChildren = true;
    for (const s of manifest.sortables) {
      const sprite = new Sprite(this.textures.get(s.frame));
      sprite.pivot.set(...s.pivot);
      const m = this.metadata.get(s.frame)!,
        density = m.density ?? 1;
      this.statics.push({
        sprite,
        sortable: s,
        point: tileToPlanet(...s.ground),
        size: Math.max(m.frame.w, m.frame.h) / density,
        density,
        depth: 0,
      });
    }
    this.ready = true;
    this.applyCamera();
    this.update();
    this.bindInput();
    this.app.ticker.add((t) => this.tick(t.deltaMS));
    if (import.meta.env.DEV)
      (window as unknown as { __darEngine?: Engine }).__darEngine = this;
    this.emit('progress', 1);
  }
  private countDrawCalls() {
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
  }
  private createPlanet(ground: Texture, manifest: Manifest) {
    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: 'dar-planet',
      preferredFragmentPrecision: 'highp',
    });
    this.uniforms = new UniformGroup({
      uCentre: { value: new Float32Array(2), type: 'vec2<f32>' },
      uRadius: { value: 1, type: 'f32' },
      uRot: { value: new Float32Array(9), type: 'mat3x3<f32>' },
      uMapSize: {
        value: new Float32Array([manifest.room.width, manifest.room.height]),
        type: 'vec2<f32>',
      },
      // The world frame (0–239) for the sea's waves; never wall-clock time.
      uTime: { value: 0, type: 'f32' },
    });
    const mesh = (mode: number) =>
      new Mesh({
        geometry: new MeshGeometry({
          positions: new Float32Array(8),
          uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        }),
        shader: new Shader({
          glProgram,
          resources: {
            uGround: ground.source,
            planet: this.uniforms,
            pass: { uMode: { value: mode, type: 'f32' } },
          },
        }),
      });
    this.halo = mesh(0);
    this.planet = mesh(1);
    this.resizePlanet();
  }
  private resizePlanet() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    for (const m of [this.planet, this.halo])
      m.geometry.positions = new Float32Array([0, 0, w, 0, w, h, 0, h]);
  }
  /**
   * Zoom out until the whole planet is a small ball: about a third of the
   * size that fits the screen (5% on phones, in either orientation).
   */
  minZoom() {
    const fit = fitZoom(this.host.clientWidth, this.host.clientHeight);
    return Math.min(0.3, Math.max(MIN_URL_ZOOM, fit * 0.3));
  }
  getCamera(): Camera {
    const [x, y] = worldFromFocus(this.view.lat, this.view.lon);
    return { x, y, zoom: this.view.zoom };
  }
  setMotion(on: boolean) {
    this.motion = on;
  }
  setZoom(zoom: number) {
    // Buttons and keys zoom around the focus; zoomAt re-sets its own point.
    this.zoomPoint = null;
    this.flight = null;
    this.view.zoom = Math.max(this.minZoom(), Math.min(MAX_ZOOM, zoom));
    this.zoomIdle = 240;
    this.applyCamera();
  }
  /** Zoom while keeping the ground under a screen point (cursor, pinch centre) still. */
  zoomAt(zoom: number, x: number, y: number) {
    const anchor = unproject(this.proj, x, y);
    this.setZoom(zoom);
    this.zoomPoint = { x, y };
    if (!anchor) return;
    // Newton steps on (lat, lon) so the anchor lands back under (x, y).
    const at = (lat: number, lon: number) =>
      project(
        planetFrame({
          lat,
          lon,
          zoom: this.view.zoom,
          width: this.host.clientWidth,
          height: this.host.clientHeight,
        }),
        anchor,
      );
    for (let i = 0; i < 6; i++) {
      const { lat, lon } = this.view,
        q = at(lat, lon),
        fx = q.x - x,
        fy = q.y - y;
      if (Math.hypot(fx, fy) < 0.25) break;
      const e = 1e-4,
        a = at(lat + e, lon),
        b = at(lat, lon + e);
      const j11 = (a.x - q.x) / e,
        j21 = (a.y - q.y) / e,
        j12 = (b.x - q.x) / e,
        j22 = (b.y - q.y) / e,
        det = j11 * j22 - j12 * j21;
      if (Math.abs(det) < 1e-9) break;
      this.view.lat -= (j22 * fx - j12 * fy) / det;
      this.view.lon -= (-j21 * fx + j11 * fy) / det;
      this.applyCamera();
    }
  }
  private zoomPoint: { x: number; y: number } | null = null;
  private target(to: Camera) {
    const f = focusFromWorld(to.x, to.y);
    return {
      lat: Math.max(-MAX_LAT, Math.min(MAX_LAT, f.lat)),
      lon: f.lon,
      zoom: Math.max(this.minZoom(), Math.min(MAX_ZOOM, to.zoom)),
    };
  }
  flyTo(to: Camera, ms = 600) {
    this.velocity = { lat: 0, lon: 0 };
    this.zoomIdle = ms + 240;
    const goal = this.target(to);
    // Spin the short way round.
    const turn = goal.lon - this.view.lon;
    goal.lon = this.view.lon + Math.atan2(Math.sin(turn), Math.cos(turn));
    this.flight = {
      from: { ...this.view },
      to: goal,
      elapsed: 0,
      duration: Math.max(1, ms),
    };
  }
  focusCharacter(id: string) {
    const l = this.manifest?.landmarks.find((l) => l.id === id);
    if (l) {
      this.selected = id;
      const [x, y] = worldFromTile(...l.tile);
      // Centre the building, not its doorstep.
      this.flyTo({ x, y: y - 48, zoom: Math.max(2, this.view.zoom) }, 700);
      return;
    }
    const c = this.manifest?.characters.find(
      (c) => c.id === id && c.interactive,
    );
    if (!c) return;
    const s = characterState(c, this.frame);
    this.selected = id;
    const [x, y] = worldFromTile(...s.tile);
    this.flyTo({ x, y, zoom: Math.max(2, this.view.zoom) }, 700);
  }
  clearSelection() {
    this.selected = null;
    this.dirty = true;
  }
  private applyCamera() {
    if (!this.ready) return;
    this.view.lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, this.view.lat));
    this.view.lon = Math.atan2(
      Math.sin(this.view.lon),
      Math.cos(this.view.lon),
    );
    this.proj = planetFrame({
      ...this.view,
      width: this.host.clientWidth,
      height: this.host.clientHeight,
    });
    const u = this.uniforms.uniforms as {
      uCentre: Float32Array;
      uRadius: number;
      uRot: Float32Array;
    };
    u.uCentre[0] = this.proj.cx;
    u.uCentre[1] = this.proj.cy;
    u.uRadius = this.proj.radius;
    // Row-major camera matrix read as column-major = its inverse (transpose).
    u.uRot.set(this.proj.matrix);
    this.dirty = true;
    this.emit('cameraChange', this.getCamera());
  }
  private texture(sprite: Sprite, name: string, pivot?: Point) {
    const t = this.textures.get(name);
    if (!t || sprite.texture === t) return;
    sprite.texture = t;
    sprite.pivot.set(...(pivot ?? this.metadata.get(name)!.anchor));
  }
  /** Stand a sprite on the planet. Returns false when it is hidden. */
  private place(
    sprite: Sprite,
    point: Vec3,
    size: number,
    lift = 0,
    depthBias = 0,
    density = 1,
  ) {
    const p = project(this.proj, point, lift),
      zoom = this.view.zoom,
      reach = size * zoom + 8,
      w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (
      p.depth < -0.32 ||
      p.x < -reach ||
      p.y < -reach ||
      p.x > w + reach ||
      p.y > h + reach * 0.3
    ) {
      sprite.visible = false;
      return null;
    }
    const layer = p.depth < 0 ? this.behind : this.front;
    if (sprite.parent !== layer) layer.addChild(sprite);
    sprite.visible = true;
    sprite.position.set(Math.round(p.x), Math.round(p.y));
    sprite.rotation = p.rotation;
    sprite.scale.set(zoom / density);
    sprite.zIndex = p.depth + depthBias;
    return p;
  }
  private update() {
    if (!this.manifest) return;
    (this.uniforms.uniforms as { uTime: number }).uTime = this.frame;
    for (const s of this.statics) {
      if (s.sortable.animation)
        this.texture(
          s.sprite,
          s.sortable.animation[
            frameMap(
              this.frame,
              s.sortable.period ?? 60,
              s.sortable.animation.length,
            )
          ],
          s.sortable.pivot,
        );
      const p = this.place(
        s.sprite,
        s.point,
        s.size,
        s.sortable.lift,
        0,
        s.density,
      );
      if (!p) continue;
      s.depth = p.depth;
      const id = s.sortable.landmark;
      if (id) this.outline(s.sprite, this.hover === id, this.selected === id);
    }
    let visible = 0;
    for (const c of this.manifest.characters) {
      const state = characterState(c, this.frame),
        step = c.script[state.stepIndex];
      let item = this.live.get(c.id);
      if (!item) {
        item = { sprite: new Sprite(), character: c, frame: '', depth: 0 };
        if (c.shadowFrame) {
          item.shadow = new Sprite();
          this.texture(item.shadow, c.shadowFrame);
        }
        this.live.set(c.id, item);
      }
      const point = tileToPlanet(...state.tile);
      const probe = project(this.proj, point, state.z);
      let direction: Point = FACING_DIRECTION[state.facing];
      if (step.path) {
        const t = (this.frame % c.loop) - step.from,
          next = characterState(c, (this.frame % c.loop) + (t < 0 ? 0 : 1));
        const d: Point = [
          next.tile[0] - state.tile[0],
          next.tile[1] - state.tile[1],
        ];
        if (Math.hypot(...d) > 1e-6) direction = d;
      }
      const facing = screenFacing(
        this.proj,
        state.tile,
        direction,
        probe.rotation,
        c.depiction === 'back',
      );
      let key = frameKey(state.action, step.prop, facing);
      if (!c.frames[key]) key = frameKey(state.action, step.prop, state.facing);
      const frames = c.frames[key],
        flip = Boolean(c.mirror?.includes(key));
      // Supplied animation strips play at their own tempo on the world clock.
      const tempo = this.metadata.get(frames[0])?.tempo,
        name = tempo
          ? frames[Math.floor((this.frame % (frames.length * tempo)) / tempo)]
          : frames[state.index % frames.length];
      this.texture(item.sprite, name);
      item.frame = name;
      const m = this.metadata.get(name)!;
      const density = m.density ?? 1,
        motion = m.still ? motionFor(state.action, this.frame) : null;
      const p = this.place(
        item.sprite,
        point,
        Math.max(m.frame.w, m.frame.h) / density,
        state.z + (motion?.lift ?? 0),
        2e-5,
        density,
      );
      // Left/right views share frames; the engine flips them about the feet.
      if (p && flip) item.sprite.scale.x *= -1;
      if (p && motion) {
        // Animate the supplied still without redrawing it.
        const toward = facing === 'SE' || facing === 'NE' ? 1 : -1;
        item.sprite.scale.x *= motion.sx;
        item.sprite.scale.y *= motion.sy;
        item.sprite.rotation += motion.lean * toward;
      }
      if (item.shadow) {
        const sp = p && this.place(item.shadow, point, 16, 0, 1e-5);
        if (!sp) item.shadow.visible = false;
      }
      if (!p) continue;
      visible++;
      item.depth = p.depth;
      this.outline(
        item.sprite,
        this.hover === c.id && c.interactive,
        this.selected === c.id,
      );
    }
    this.visibleCount = visible;
    if (this.inspector) this.drawInspector();
  }
  /** Gold outline on hover; a slow pulse while selected. */
  private outline(sprite: Sprite, hovered: boolean, selected: boolean) {
    if (hovered || selected) {
      let filter = sprite.filters?.[0] as OutlineFilter | undefined;
      if (!filter) {
        filter = new OutlineFilter({
          thickness: Math.max(1, Math.round(this.view.zoom)),
          color: 0xd8ad57,
          quality: 0.1,
        });
        sprite.filters = [filter];
      }
      filter.alpha = selected ? 0.65 + 0.35 * Math.sin(this.frame / 4) : 1;
    } else if (sprite.filters?.length) sprite.filters = [];
  }
  private visibleCount = 0;
  private tick(dt: number) {
    if (!this.ready || this.destroyed) return;
    this.lastDrawCalls = this.drawCalls;
    this.drawCalls = 0;
    dt = Math.min(dt, 64);
    if (this.motion) this.elapsed += dt / 1000;
    this.frame = globalFrame(this.elapsed);
    let moved = false;
    if (this.flight) {
      const fl = this.flight;
      fl.elapsed += dt;
      const t = Math.min(1, fl.elapsed / fl.duration),
        ease = 1 - (1 - t) ** 3;
      this.view = {
        lat: fl.from.lat + (fl.to.lat - fl.from.lat) * ease,
        lon: fl.from.lon + (fl.to.lon - fl.from.lon) * ease,
        zoom: fl.from.zoom + (fl.to.zoom - fl.from.zoom) * ease,
      };
      moved = true;
      if (t === 1) this.flight = null;
    } else if (
      !this.pointers.size &&
      Math.hypot(this.velocity.lat, this.velocity.lon) > 1e-6
    ) {
      this.view.lat += this.velocity.lat * dt;
      this.view.lon += this.velocity.lon * dt;
      const decay = Math.exp(-dt / 220);
      this.velocity.lat *= decay;
      this.velocity.lon *= decay;
      moved = true;
    }
    if (this.zoomIdle > 0) {
      this.zoomIdle -= dt;
      // Settle on a crisp whole zoom only when already close to one, so a
      // pinch never jumps noticeably after the fingers lift.
      const whole = Math.round(this.view.zoom);
      if (
        this.zoomIdle <= 0 &&
        this.view.zoom >= 1 &&
        !this.pointers.size &&
        Math.abs(this.view.zoom - whole) < 0.15
      ) {
        // Settle around the last pinch/cursor point so the view does not shift.
        const z = this.zoomPoint;
        if (z) this.zoomAt(whole, z.x, z.y);
        else this.view.zoom = whole;
        this.zoomIdle = 0;
        moved = true;
      }
    }
    if (moved) this.applyCamera();
    if (this.lastFrame !== this.frame || this.dirty) {
      this.update();
      this.lastFrame = this.frame;
      this.dirty = false;
    }
    this.emitElapsed += dt;
    if (this.emitElapsed >= 120) {
      this.emitElapsed = 0;
      if (import.meta.env.DEV)
        this.emit('stats', {
          fps: Math.round(this.app.ticker.FPS),
          draws: this.lastDrawCalls,
          frame: this.frame,
          visible: this.visibleCount,
        });
    }
  }
  private point(e: PointerEvent | WheelEvent) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  /** Spin the globe so the ground follows the pointer. */
  private drag(dx: number, dy: number) {
    const r = RADIUS_PX * this.view.zoom,
      cos = Math.max(0.2, Math.cos(this.view.lat));
    const dLon = -dx / r / cos,
      dLat = (dy / r) * 1.6;
    this.view.lon += dLon;
    this.view.lat += dLat;
    return { lat: dLat, lon: dLon };
  }
  /** Topmost character (or landmark) under a screen point. */
  private hit(p: { x: number; y: number }, interactiveOnly = true) {
    const items: {
      id: string;
      sprite: Sprite;
      frame: string;
      depth: number;
    }[] = [];
    for (const i of this.live.values())
      if (
        i.sprite.visible &&
        i.sprite.parent === this.front &&
        (!interactiveOnly || i.character.interactive)
      )
        items.push({
          id: i.character.id,
          sprite: i.sprite,
          frame: i.frame,
          depth: i.depth,
        });
    for (const s of this.statics)
      if (
        s.sortable.landmark &&
        s.sprite.visible &&
        s.sprite.parent === this.front
      )
        items.push({
          id: s.sortable.landmark,
          sprite: s.sprite,
          frame: s.sortable.frame,
          depth: s.depth,
        });
    items.sort((a, b) => b.depth - a.depth);
    for (const item of items) {
      const m = this.metadata.get(item.frame)!;
      const local = item.sprite.toLocal(p);
      if (
        maskHit(
          this.masks.get(item.frame)!,
          m.frame.w,
          m.frame.h,
          local.x,
          local.y,
        )
      )
        return item.id;
    }
    return null;
  }
  private clickable(id: string | null) {
    return Boolean(
      id &&
      (this.live.get(id)?.character.interactive ||
        this.manifest?.landmarks.some((l) => l.id === id)),
    );
  }
  /** Development/test helper: tile coordinates of the ground under a screen point. */
  groundAt(x: number, y: number): Point | null {
    const p = unproject(this.proj, x, y);
    return p ? planetToTile(p) : null;
  }
  /** Development/test helper: screen points over and beside a character or landmark. */
  debugPoints(id: string) {
    const landmark = this.statics.find((s) => s.sortable.landmark === id);
    const item = landmark
      ? { sprite: landmark.sprite, frame: landmark.sortable.frame }
      : this.live.get(id);
    if (!item || !item.sprite.visible) return null;
    const m = this.metadata.get(item.frame)!,
      mask = this.masks.get(item.frame)!;
    let opaque: Point | null = null,
      empty: Point | null = null;
    for (let y = 0; y < m.frame.h; y++)
      for (let x = 0; x < m.frame.w; x++) {
        const on = maskHit(mask, m.frame.w, m.frame.h, x, y);
        if (on && !opaque && y > m.frame.h / 3) opaque = [x + 0.5, y + 0.5];
        if (!on && !empty && x === 0) empty = [x + 0.5, y + 0.5];
      }
    const g = (q: Point | null) => {
      if (!q) return null;
      const s = item.sprite.toGlobal({ x: q[0], y: q[1] });
      return { x: s.x, y: s.y };
    };
    return { opaque: g(opaque), transparent: g(empty) };
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
        this.velocity = { lat: 0, lon: 0 };
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
            this.velocity = { lat: 0, lon: 0 };
            this.zoomAt(
              (this.view.zoom * b) / Math.max(1, a),
              (p.x + other.x) / 2,
              (p.y + other.y) / 2,
            );
          } else {
            const v = this.drag(p.x - old.x, p.y - old.y),
              dt = Math.max(
                8,
                e.timeStamp - (this.lastMove || e.timeStamp - 16),
              );
            this.velocity = { lat: v.lat / dt, lon: v.lon / dt };
            this.lastMove = e.timeStamp;
            this.applyCamera();
          }
          this.pointers.set(e.pointerId, p);
          this.moved = Math.max(
            this.moved,
            Math.hypot(p.x - this.dragStart.x, p.y - this.dragStart.y),
          );
        } else {
          const hit = this.hit(p, false);
          if (hit !== this.hover) {
            this.hover = hit;
            this.dirty = true;
            canvas.style.cursor = this.clickable(hit) ? 'pointer' : 'grab';
            this.emit('characterHover', hit);
          }
        }
      },
      options,
    );
    const up = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      // Lifting one finger of a pinch must not fling the planet.
      if (this.pointers.size === 2) this.velocity = { lat: 0, lon: 0 };
      if (this.pointers.size === 1 && this.moved < 5) {
        const hit = this.hit(this.point(e));
        if (hit) {
          this.selected = hit;
          this.emit('characterClick', hit);
          this.dirty = true;
        }
        this.velocity = { lat: 0, lon: 0 };
      }
      this.pointers.delete(e.pointerId);
    };
    canvas.addEventListener('pointerup', up, options);
    canvas.addEventListener(
      'pointercancel',
      (e) => {
        this.pointers.delete(e.pointerId);
        this.velocity = { lat: 0, lon: 0 };
      },
      options,
    );
    canvas.addEventListener(
      'pointerleave',
      () => {
        if (this.hover) {
          this.hover = null;
          this.dirty = true;
          this.emit('characterHover', null);
        }
      },
      options,
    );
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const p = this.point(e);
        this.zoomAt(this.view.zoom * Math.exp(-e.deltaY * 0.0015), p.x, p.y);
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
          if (!this.inspector) {
            for (const c of this.debug.removeChildren()) c.destroy();
            this.emit('inspect', null);
          }
          this.dirty = true;
        }
        const step = 90;
        if (e.key === 'ArrowLeft') this.drag(step, 0);
        else if (e.key === 'ArrowRight') this.drag(-step, 0);
        else if (e.key === 'ArrowUp') this.drag(0, step / 2);
        else if (e.key === 'ArrowDown') this.drag(0, -step / 2);
        else if (['+', '='].includes(e.key)) this.setZoom(this.view.zoom + 0.5);
        else if (e.key === '-') this.setZoom(this.view.zoom - 0.5);
        else return;
        e.preventDefault();
        this.flight = null;
        this.applyCamera();
      },
      options,
    );
  }
  private lastMove = 0;
  /** Fit the whole planet in view. */
  overview() {
    const cam = this.getCamera();
    this.flyTo(
      {
        ...cam,
        zoom: fitZoom(this.host.clientWidth, this.host.clientHeight),
      },
      600,
    );
  }
  private drawInspector() {
    for (const c of this.debug.removeChildren()) c.destroy();
    const g = new Graphics();
    this.debug.addChild(g);
    const at = (t: Point) => project(this.proj, tileToPlanet(...t));
    for (const item of this.live.values()) {
      if (!item.sprite.visible) continue;
      const c = item.character;
      for (const s of c.script)
        if (s.path) {
          const ps = s.path.map((p) => at(p));
          if (ps.some((p) => p.depth < 0)) continue;
          g.moveTo(ps[0].x, ps[0].y);
          ps.slice(1).forEach((p) => g.lineTo(p.x, p.y));
          g.stroke({ color: 0x448bbb, width: 1 });
        }
      const s = characterState(c, this.frame),
        p = at(s.tile);
      g.circle(p.x, p.y, 2).fill(0xc87865);
      if (c.pairWith) {
        const pair = this.live.get(c.pairWith);
        if (pair?.sprite.visible)
          g.moveTo(p.x, p.y)
            .lineTo(pair.sprite.x, pair.sprite.y)
            .stroke({ color: 0xbd65ae, width: 1 });
      }
      if (this.view.zoom >= 2) {
        const label = new Text({
          text: c.id.replace(/^amb-/, ''),
          style: { fontSize: 9, fill: 0x493c35 },
        });
        label.position.set(p.x + 4, p.y);
        this.debug.addChild(label);
      }
    }
    if (this.hover) {
      const item = this.live.get(this.hover)!;
      const state = characterState(item.character, this.frame);
      const b = item.sprite.getBounds();
      g.rect(b.x, b.y, b.width, b.height).stroke({ color: 0xe4b34e, width: 1 });
      this.emit('inspect', {
        id: this.hover,
        step: state.stepIndex,
        frame: state.index,
        action: state.action,
        depth: item.depth.toFixed(3),
      });
    } else
      this.emit('inspect', {
        frame: this.frame,
        visible: this.visibleCount,
        lat: ((this.view.lat * 180) / Math.PI).toFixed(1),
        lon: ((this.view.lon * 180) / Math.PI).toFixed(1),
      });
  }
  destroy() {
    this.destroyed = true;
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.listeners.clear();
    if (this.ready) this.app.destroy(true, { children: true, texture: false });
  }
}
