import {
  Geometry,
  GlProgram,
  Mesh,
  Shader,
  State,
  Texture,
  UniformGroup,
  type Container,
} from 'pixi.js';
import {
  DARK_ROOM,
  DARK_ROOM_DEFAULTS,
  darkRoomTile,
  type DarkRoomOptions,
  type DarkRoomView,
  type DarkRoomExperiment,
} from '../../../packages/shared/dark-room';
import {
  applyInverse,
  project,
  RADIUS_PX,
  TILE_SIDE,
  tileToPlanet,
  type Frame,
  type Vec3,
} from '../../../packages/shared/planet';
import type { Point } from '../../../packages/shared/iso';
import {
  projectSurface,
  surfaceOccludes,
  type ProjectedSurface,
  type VisibilityProbe,
} from '../../../packages/shared/occlusion';

type Part = {
  vertices: number[];
  color: number[];
  material: string;
  group: string;
  uv?: number[][];
};
type Material = {
  texture: string;
  strength: number;
  power: number;
  reflection: number;
  glassy?: number;
  unlit?: boolean;
  exterior?: boolean;
  twoSided?: boolean;
};
type Bounds = { min: Vec3; max: Vec3 };
type Model = {
  parts: Part[];
  bounds: Bounds;
  roomBounds: Bounds;
  roomFloorBounds: Bounds;
  roomCollisionBoxes: (Bounds & { name: string })[];
  landmarks: Record<string, Vec3>;
  instruments: unknown;
  clockState: { hour: number; cylinderY: number; discAngle: number };
};
type Source = {
  buildSanctuary(options: object): Model;
  buildWaterClock(
    hour: number,
    options: object,
  ): { parts: Part[]; clockState: Model['clockState'] };
  createSceneTextures(options: object): Record<string, HTMLCanvasElement>;
  createProjectionTexture(
    options: object,
    courtyard: HTMLCanvasElement,
  ): HTMLCanvasElement;
  SCENE_MATERIALS: Record<string, Material>;
  buildInstrumentExperiment(
    options: DarkRoomExperiment,
    model: Model,
  ): {
    parts: Part[];
    replaceGroups: string[];
    measurements: Record<string, unknown>;
  };
};
type Batch = {
  mesh: Mesh<Geometry, Shader>;
  group: string;
  scope: 'room' | 'court';
  material: Material;
  transparent: boolean;
  bounds: Bounds;
  demo?: boolean;
  projected?: ProjectedSurface;
  projectedFrame?: Frame;
  orderedFrame?: Frame;
};

const vertex = `
in vec3 aPosition;in vec3 aLocal;in vec3 aNormal;in vec2 aUV;in vec4 aColor;
out vec3 vNormal;out vec2 vUV;out vec3 vWorld;out vec4 vTint;
uniform mat3 uProjectionMatrix;uniform mat3 uWorldTransformMatrix;uniform mat3 uTransformMatrix;
uniform mat3 uPlanetRotation;uniform vec2 uCentre;uniform float uRadius;
void main(){
 vec3 p=uPlanetRotation*aPosition;
 vec2 screen=uCentre+vec2(p.x,-p.y)*uRadius;
 mat3 mvp=uProjectionMatrix*uWorldTransformMatrix*uTransformMatrix;
 gl_Position=vec4((mvp*vec3(screen,1.)).xy,-p.z*.45,1.);
 vWorld=aLocal;vNormal=aNormal;vUV=aUV;vTint=aColor;
}`;
const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const cross = (a: number[], b: number[]) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: number[], b: number[]) =>
  a.reduce((s, v, i) => s + v * b[i], 0);
const normalise = (p: number[]) => {
  const n = Math.hypot(...p) || 1;
  return p.map((v) => v / n);
};

/** Uses the approved source meshes AND its original material/lighting shader.
 * Only the camera projection changes: these vertices now belong to the same
 * planet, canvas, depth buffer and simulation as every other world component.
 * No iframe, second WebGL context or separate application is created.
 */
export class DarkRoom {
  readonly batches: Batch[] = [];
  readonly options = { ...DARK_ROOM_DEFAULTS };
  model!: Model;
  partCount = 0;
  private source!: Source;
  private textures = new Map<string, Texture>();
  private courtyard!: HTMLCanvasElement;
  private fragment = '';
  private programs = new Map<string, GlProgram>();
  private destroyed = false;
  private frame: Frame | null = null;
  private clockTick = -1;
  private clockStart: { frame: number; hour: number } | null = null;
  private experiment: DarkRoomExperiment = { kind: 'none' };
  private replaced = new Set<string>();
  measurements: Record<string, unknown> | null = null;
  get clockRunning() {
    return this.clockStart !== null;
  }
  private readonly optical = new UniformGroup({
    uEye: { value: new Float32Array(3), type: 'vec3<f32>' },
    uRoomMin: { value: new Float32Array([-4.8, -5.58]), type: 'vec2<f32>' },
    uRoomMax: { value: new Float32Array([9.6, 5.58]), type: 'vec2<f32>' },
    uExposure: { value: 0.78, type: 'f32' },
    uSunlight: { value: 1, type: 'f32' },
  });
  constructor(private projection: UniformGroup) {}
  async load(signal: AbortSignal) {
    // An absolute same-origin URL lets Vite serve these verified public ES
    // modules unchanged, just as the deployed site does.
    const base = new URL('/exhibits/al-bayt-al-muzlim/', location.origin).href,
      scenePath = base + 'scene.js',
      rendererPath = base + 'renderer.js',
      instrumentsPath = base + 'instruments.js',
      experimentPath = base + 'instrument-experiments.js';
    const [scene, renderer, instruments, experiments, response] =
      await Promise.all([
        import(/* @vite-ignore */ scenePath),
        import(/* @vite-ignore */ rendererPath),
        import(/* @vite-ignore */ instrumentsPath),
        import(/* @vite-ignore */ experimentPath),
        fetch(rendererPath, { signal }),
      ]);
    if (!response.ok)
      throw Error(`Dark room materials: HTTP ${response.status}`);
    const original = (await response.text()).match(
      /const FS=`([\s\S]*?)`;/,
    )?.[1];
    if (!original)
      throw Error('The approved dark-room lighting shader is missing.');
    if (signal.aborted || this.destroyed) return;
    this.source = {
      ...scene,
      ...renderer,
      ...instruments,
      ...experiments,
    } as Source;
    // GLSL 1 → GLSL 3 syntax only; the lighting equations and texture recipes
    // stay exactly those of the verified, byte-for-byte approved source.
    const [declarations, body] = original.split('void main(){');
    const lighting =
      declarations +
      'void main(){\nfloat exposure=mix(uExposure,1.,uExterior);float sunlight=max(uSunlight,uExterior);\n' +
      body
        .replace(/\buExposure\b/g, 'exposure')
        .replace(/\buSunlight\b/g, 'sunlight');
    const fragment = lighting
      .replace(/precision mediump float;/, '')
      .replace(/varying /g, 'in ')
      .replace(/texture2D\(/g, 'texture(')
      .replace(/\buTint\b/g, 'vTint')
      .replace('uniform vec4 vTint;', 'in vec4 vTint;')
      .replace(/gl_FragColor/g, 'finalColor')
      .replace(
        'void main(){',
        'out vec4 finalColor;uniform float uWallCutHeight;\nvoid main(){\nif(vWorld.y>uWallCutHeight)discard;',
      )
      .replace(
        'finalColor=vec4(colour,alpha);',
        'if(alpha<.0001)discard;finalColor=vec4(colour*alpha,alpha);',
      );
    this.fragment = fragment;
    const sources = this.source.createSceneTextures(this.options);
    this.courtyard = sources.courtyard;
    for (const [name, canvas] of Object.entries(sources)) {
      const texture = Texture.from(canvas);
      texture.source.scaleMode = 'nearest';
      this.textures.set(name, texture);
    }
    this.model = this.source.buildSanctuary(this.options);
    this.partCount = this.model.parts.length;
    this.add(this.model.parts);
  }
  private point(p: number[]): Vec3 {
    const tile = darkRoomTile(p[0], p[2]),
      normal = tileToPlanet(...tile),
      r = 1 + (p[1] * DARK_ROOM.scale * TILE_SIDE) / RADIUS_PX;
    return normal.map((v) => v * r) as Vec3;
  }
  private programFor(material: Material) {
    // Material properties never change within a batch. Specializing the
    // original shader lets the GPU eliminate mirror/glass calculations for
    // stone and wood, while preserving exactly the same lighting equations.
    const constants: Record<string, number> = {
        uLighting: material.unlit ? 0 : 1,
        uSpecular: material.strength,
        uShine: material.power,
        uReflect: material.reflection,
        uGlass: material.glassy ?? 0,
        uExterior: material.exterior ? 1 : 0,
        uAtmosphere: 0,
      },
      key = JSON.stringify(constants);
    let program = this.programs.get(key);
    if (!program) {
      let fragment = this.fragment;
      for (const [name, value] of Object.entries(constants))
        fragment = fragment
          .replace(new RegExp(`uniform float ${name};`, 'g'), '')
          .replace(new RegExp(`\\b${name}\\b`, 'g'), `(${value.toFixed(8)})`);
      program = GlProgram.from({
        vertex,
        fragment,
        name: 'dar-approved-dark-room',
        preferredFragmentPrecision: 'highp',
      });
      this.programs.set(key, program);
    }
    return program;
  }
  private add(parts: Part[], demo = false) {
    const groups = new Map<string, Part[]>();
    for (const p of parts) {
      const key = `${this.renderGroup(p.group)}:${p.material}:${p.color[3] < 0.995}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    for (const items of groups.values()) {
      const part = items[0],
        baseMaterial =
          this.source.SCENE_MATERIALS[part.material] ??
          this.source.SCENE_MATERIALS.solid,
        material =
          part.material === 'projection' && !this.options.sunlight
            ? { ...baseMaterial, unlit: false }
            : baseMaterial;
      const positions: number[] = [],
        locals: number[] = [],
        normals: number[] = [],
        colors: number[] = [],
        uvs: number[] = [],
        indices: number[] = [],
        bounds: Bounds = {
          min: [Infinity, Infinity, Infinity],
          max: [-Infinity, -Infinity, -Infinity],
        };
      for (const p of items) {
        const points = Array.from({ length: 4 }, (_, i) =>
          p.vertices.slice(i * 3, i * 3 + 3),
        );
        let n = cross(sub(points[1], points[0]), sub(points[2], points[0]));
        if (Math.hypot(...n) < 1e-10)
          n = cross(sub(points[2], points[0]), sub(points[3], points[0]));
        if (Math.hypot(...n) < 1e-10) continue;
        n = normalise(n);
        const base = positions.length / 3,
          uv = p.uv ?? [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ];
        for (let i = 0; i < 4; i++) {
          positions.push(...this.point(points[i]));
          locals.push(...points[i]);
          for (let k = 0; k < 3; k++) {
            bounds.min[k] = Math.min(bounds.min[k], points[i][k]);
            bounds.max[k] = Math.max(bounds.max[k], points[i][k]);
          }
          normals.push(...n);
          colors.push(...p.color);
          uvs.push(...uv[i]);
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      const transparent = part.color[3] < 0.995;
      const state = new State();
      state.depthTest = true;
      state.depthMask = !transparent;
      state.cullMode = material.twoSided ? 'none' : 'back';
      const geometry = new Geometry({
        attributes: {
          aPosition: {
            buffer: new Float32Array(positions),
            format: 'float32x3',
          },
          aLocal: { buffer: new Float32Array(locals), format: 'float32x3' },
          aNormal: { buffer: new Float32Array(normals), format: 'float32x3' },
          aUV: { buffer: new Float32Array(uvs), format: 'float32x2' },
          aColor: { buffer: new Float32Array(colors), format: 'float32x4' },
        },
        indexBuffer: new Uint32Array(indices),
      });
      const mesh = new Mesh({
        geometry,
        state,
        shader: new Shader({
          glProgram: this.programFor(material),
          resources: {
            projection: this.projection,
            optical: this.optical,
            material: new UniformGroup({
              uLighting: { value: material.unlit ? 0 : 1, type: 'f32' },
              uSpecular: { value: material.strength, type: 'f32' },
              uShine: { value: material.power, type: 'f32' },
              uReflect: { value: material.reflection, type: 'f32' },
              uGlass: { value: material.glassy ?? 0, type: 'f32' },
              // The approved isometric views have no perspective aerial haze.
              uExterior: { value: material.exterior ? 1 : 0, type: 'f32' },
              uAtmosphere: { value: 0, type: 'f32' },
              uWallCutHeight: { value: 10000, type: 'f32' },
            }),
            uTexture: this.textures.get(material.texture)!.source,
          },
        }),
      });
      mesh.label = `Approved 3D ${part.group} · ${part.material}`;
      mesh.eventMode = 'none';
      this.batches.push({
        mesh,
        group: this.renderGroup(part.group),
        material,
        transparent,
        bounds,
        demo,
        scope: /^(site-|courtyard-)/.test(part.group) ? 'court' : 'room',
      });
    }
  }
  private renderGroup(group: string) {
    // Merge only immutable components with identical material state. Every
    // approved vertex, colour and UV remains; movable experiment assemblies
    // and walls keep their own batches for independent updates/cutaways.
    if (/^(site-|courtyard-)/.test(group)) return 'courtyard';
    if (group.startsWith('instrument-waterclock'))
      return 'instrument-waterclock';
    if (
      group === 'walls' ||
      group.startsWith('instrument-tube') ||
      group === 'instrument-meridian-alidade' ||
      group.startsWith('experiment-')
    )
      return group;
    return 'room-furnishings';
  }
  update(
    f: Frame,
    front: Container,
    behind: Container,
    width: number,
    height: number,
  ) {
    this.frame = f;
    const centre = tileToPlanet(...DARK_ROOM.origin),
      p = project(f, centre),
      view = applyInverse(f.matrix, [0, 0, 1]),
      axisX = normalise(
        sub(
          tileToPlanet(DARK_ROOM.origin[0], DARK_ROOM.origin[1] - 0.01),
          centre,
        ),
      ),
      axisZ = normalise(
        sub(
          tileToPlanet(DARK_ROOM.origin[0] + 0.01, DARK_ROOM.origin[1]),
          centre,
        ),
      );
    this.optical.uniforms.uEye.set([
      2.4 + dot(view, axisX) * 120,
      dot(view, centre) * 120,
      dot(view, axisZ) * 120,
    ]);
    const layer = p.depth < 0 ? behind : front,
      bounds = this.model.bounds,
      corners = Array.from({ length: 8 }, (_, i) =>
        project(
          f,
          this.point(
            bounds.min.map((v, k) => ((i >> k) & 1 ? bounds.max[k] : v)),
          ),
        ),
      ),
      onScreen =
        Math.max(...corners.map((q) => q.x)) >= 0 &&
        Math.min(...corners.map((q) => q.x)) <= width &&
        Math.max(...corners.map((q) => q.y)) >= 0 &&
        Math.min(...corners.map((q) => q.y)) <= height;
    for (const b of this.batches) {
      // Keep the compound intact at the horizon; ordinary GPU depth handles
      // every wall, instrument and character inside it.
      const corners = Array.from({ length: 8 }, (_, i) =>
          project(
            f,
            this.point(
              b.bounds.min.map((v, k) => ((i >> k) & 1 ? b.bounds.max[k] : v)),
            ),
          ),
        ),
        visible =
          Math.max(...corners.map((q) => q.x)) >= 0 &&
          Math.min(...corners.map((q) => q.x)) <= width &&
          Math.max(...corners.map((q) => q.y)) >= 0 &&
          Math.min(...corners.map((q) => q.y)) <= height;
      b.mesh.visible =
        onScreen &&
        visible &&
        p.depth > -0.22 &&
        (b.demo || !this.replaced.has(b.group));
      if (b.mesh.parent !== layer) layer.addChild(b.mesh);
      if (b.transparent && b.orderedFrame !== f) {
        const g = b.mesh.geometry,
          vertices = g.getAttribute('aPosition').buffer.data as Float32Array,
          m = f.matrix,
          quads = Array.from({ length: vertices.length / 12 }, (_, i) => {
            let depth = 0;
            for (let k = 0; k < 4; k++) {
              const a = i * 12 + k * 3;
              depth +=
                m[6] * vertices[a] +
                m[7] * vertices[a + 1] +
                m[8] * vertices[a + 2];
            }
            return { i, depth: depth / 4 };
          }).sort((a, b) => a.depth - b.depth),
          indices = g.indexBuffer!.data as Uint32Array;
        for (let i = 0; i < quads.length; i++) {
          const a = quads[i].i * 4;
          indices.set([a, a + 1, a + 2, a, a + 2, a + 3], i * 6);
        }
        g.indexBuffer!.update();
        b.orderedFrame = f;
      }
      // Transparent glass/rays must follow all opaque people and buildings;
      // their depth test still rejects fragments behind those surfaces.
      b.mesh.zIndex = b.transparent
        ? 2 +
          project(
            f,
            this.point(b.bounds.min.map((v, i) => (v + b.bounds.max[i]) / 2)),
          ).depth
        : p.depth;
    }
  }
  reveal(probes: VisibilityProbe[]) {
    if (!this.frame) return;
    const roomProbes = probes.filter((p) => {
      if (!p.tile) return false;
      const x = (DARK_ROOM.origin[1] - p.tile[1]) / DARK_ROOM.scale,
        z = (p.tile[0] - DARK_ROOM.origin[0]) / DARK_ROOM.scale,
        b = this.model.roomFloorBounds;
      return x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2];
    });
    for (const b of this.batches)
      if (b.group === 'walls') {
        if (b.projectedFrame !== this.frame) {
          const g = b.mesh.geometry,
            local = g.getAttribute('aLocal').buffer.data as Float32Array;
          b.projected = projectSurface(this.frame, {
            vertices: g.getAttribute('aPosition').buffer.data as Float32Array,
            indices: g.indexBuffer!.data as Uint32Array,
            heights: Float32Array.from(
              { length: local.length / 3 },
              (_, i) => local[i * 3 + 1],
            ),
          });
          b.projectedFrame = this.frame;
        }
        const cut =
          this.options.cutaway &&
          roomProbes.some((p) => surfaceOccludes(b.projected!, p))
            ? 1.15
            : 10000;
        (
          b.mesh.shader!.resources.material as UniformGroup
        ).uniforms.uWallCutHeight = cut;
      }
  }
  setOptions(changes: Partial<DarkRoomOptions>) {
    if (!this.source || this.destroyed) return;
    const geometry = [
      'cutaway',
      'sunlight',
      'rays',
      'aperture',
      'screenDistance',
    ].some((k) => k in changes);
    Object.assign(this.options, changes);
    this.optical.uniforms.uExposure = this.options.exposure;
    this.optical.uniforms.uSunlight = this.options.sunlight ? 1 : 0;
    if (geometry) {
      this.remove((b) => b.scope === 'room');
      const room = this.source.buildSanctuary({
        ...this.options,
        courtyard: false,
      });
      this.model = {
        ...this.model,
        ...room,
        bounds: this.model.bounds,
        landmarks: { ...this.model.landmarks, ...room.landmarks },
        parts: this.model.parts
          .filter((p) => /^(site-|courtyard-)/.test(p.group))
          .concat(room.parts),
      };
      this.add(room.parts);
      const texture = this.textures.get('projection')!;
      const canvas = this.source.createProjectionTexture(
        this.options,
        this.courtyard,
      );
      const replacement = Texture.from(canvas);
      replacement.source.scaleMode = 'nearest';
      this.textures.set('projection', replacement);
      for (const b of this.batches)
        if (b.material.texture === 'projection')
          b.mesh.shader!.resources.uTexture = replacement.source;
      texture.destroy(true);
      this.partCount = this.model.parts.length;
    } else if ('clockHour' in changes) this.clock(this.options.clockHour);
    if (geometry && this.experiment.kind !== 'none')
      this.setExperiment(this.experiment);
  }
  setExperiment(options: DarkRoomExperiment) {
    if (!this.source || this.destroyed) return;
    this.experiment = options;
    this.remove((b) => Boolean(b.demo));
    this.replaced.clear();
    this.measurements = null;
    if (options.kind === 'none') return;
    const demo = this.source.buildInstrumentExperiment(options, this.model);
    this.replaced = new Set(demo.replaceGroups);
    this.measurements = demo.measurements;
    this.add(demo.parts, true);
  }
  private clock(hour: number) {
    const clock = this.source.buildWaterClock(hour, {
      cutaway: this.options.cutaway,
    });
    this.remove((b) => b.group.startsWith('instrument-waterclock'));
    this.add(clock.parts);
    this.model.clockState = clock.clockState;
  }
  setClockRunning(running: boolean, frame: number) {
    this.clockStart = running ? { frame, hour: this.options.clockHour } : null;
    this.clockTick = -1;
  }
  animate(frame: number) {
    if (
      !this.clockStart ||
      frame === this.clockTick ||
      !this.batches.some((b) => b.scope === 'room' && b.mesh.visible)
    )
      return false;
    // The approved sinking-cylinder mechanism follows the 12 Hz world clock.
    // The user's global Pause freezes it along with people and laboratories.
    const elapsed = (frame - this.clockStart.frame + 240) % 240;
    this.options.clockHour = (this.clockStart.hour + elapsed / 10) % 24;
    this.clock(this.options.clockHour);
    this.clockTick = frame;
    return true;
  }
  target(view: DarkRoomView): { point: Vec3; zoom: number } {
    if (view === 'site') return { point: [-14, 0, -1.9], zoom: 1.8 };
    if (view === 'courtyard') return { point: [-16.4, 0, -1.4], zoom: 3.8 };
    if (view === 'room') return { point: [2.4, 0, 0], zoom: 6.5 };
    return { point: this.model.landmarks[view] ?? [2.4, 0, 0], zoom: 10 };
  }
  /** Front-of-house picking uses the projected chamber volume, including its
   * upper walls. Selecting the exhibit keeps the main world canvas alive. */
  hit(point: { x: number; y: number }) {
    if (!this.frame || !this.model) return false;
    const b = this.model.roomBounds,
      ps = Array.from({ length: 8 }, (_, i) =>
        project(
          this.frame!,
          this.point(b.min.map((v, k) => ((i >> k) & 1 ? b.max[k] : v))),
        ),
      );
    if (ps.every((p) => p.depth < 0)) return false;
    // A convex hull avoids the empty corners of a screen-space bounding box.
    const sorted = ps
      .map((p) => [p.x, p.y] as Point)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const turn = (a: Point, b: Point, c: Point) =>
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const half = (points: Point[]) => {
      const h: Point[] = [];
      for (const p of points) {
        while (h.length > 1 && turn(h[h.length - 2], h[h.length - 1], p) <= 0)
          h.pop();
        h.push(p);
      }
      return h;
    };
    const hull = [
        ...half(sorted).slice(0, -1),
        ...half([...sorted].reverse()).slice(0, -1),
      ],
      q: Point = [point.x, point.y];
    return hull.every((a, i) => turn(a, hull[(i + 1) % hull.length], q) >= 0);
  }
  screenBounds() {
    if (!this.frame || !this.model) return null;
    const b = this.model.roomBounds,
      points = Array.from({ length: 8 }, (_, i) =>
        project(
          this.frame!,
          this.point(b.min.map((v, k) => ((i >> k) & 1 ? b.max[k] : v))),
        ),
      );
    if (points.every((p) => p.depth < 0)) return null;
    const x = Math.min(...points.map((p) => p.x)),
      y = Math.min(...points.map((p) => p.y));
    return {
      x,
      y,
      w: Math.max(...points.map((p) => p.x)) - x,
      h: Math.max(...points.map((p) => p.y)) - y,
    };
  }
  private remove(predicate: (b: Batch) => boolean) {
    for (let i = this.batches.length - 1; i >= 0; i--)
      if (predicate(this.batches[i])) {
        const { mesh } = this.batches.splice(i, 1)[0],
          { geometry, shader } = mesh;
        mesh.destroy();
        geometry.destroy();
        shader?.destroy();
      }
  }
  destroy() {
    this.destroyed = true;
    this.remove(() => true);
    for (const texture of this.textures.values()) texture.destroy(true);
    this.textures.clear();
    this.programs.clear();
    this.model = null!;
    this.frame = null;
  }
}
