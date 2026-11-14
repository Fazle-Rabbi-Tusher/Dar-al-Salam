import {
  Geometry,
  GlProgram,
  Mesh,
  Shader,
  State,
  UniformGroup,
} from 'pixi.js';
import {
  infrastructureModel,
  type InfrastructureModel,
} from '../../../packages/shared/infrastructure';
import {
  PLANET,
  RADIUS_PX,
  TILE_SIDE,
  tileToPlanet,
  type Frame,
  type Vec3,
} from '../../../packages/shared/planet';
import type { Sortable } from '../../../packages/shared/schema';
import { laboratoryActivityModel } from '../../../packages/shared/laboratory';
import { sportsActivityModel } from '../../../packages/shared/sports';
import {
  projectSurface,
  surfaceOccludes,
  type ProjectedSurface,
  type VisibilityProbe,
} from '../../../packages/shared/occlusion';

const vertex = `
in vec3 aPosition;
in vec3 aNormal;
in vec4 aColor;
in float aHeight;
out vec4 vColor;
out vec3 vWorld;
out float vHeight;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform mat3 uPlanetRotation;
uniform vec2 uCentre;
uniform float uRadius;
void main(){
 vec3 p=uPlanetRotation*aPosition;
 vec3 normal=normalize(uPlanetRotation*aNormal);
 float lambert=max(0.,dot(normal,normalize(vec3(-.35,.65,.72))));
 float light=.53+.47*floor(lambert*7.)/7.;
 vColor=vec4(aColor.rgb*light,aColor.a);vWorld=aPosition*1450.;vHeight=aHeight;
 vec2 screen=uCentre+vec2(p.x,-p.y)*uRadius;
 mat3 mvp=uProjectionMatrix*uWorldTransformMatrix*uTransformMatrix;
 gl_Position=vec4((mvp*vec3(screen,1.)).xy,-p.z*.45,1.);
}`;
const fragment = `in vec4 vColor;in vec3 vWorld;in float vHeight;uniform float uCutHeight;out vec4 finalColor;void main(){if(vColor.a<.01||vHeight>uCutHeight)discard;float grain=fract(sin(dot(floor(vWorld*.65),vec3(12.9898,78.233,37.719)))*43758.5453);finalColor=vec4(vColor.rgb*(.95+.09*grain)*vColor.a,vColor.a);}`;
const program = () =>
  GlProgram.from({
    vertex,
    fragment,
    name: 'dar-modern-infrastructure',
    preferredFragmentPrecision: 'highp',
  });
export type LiveInfrastructure = {
  mesh: Mesh<Geometry, Shader>;
  glass?: Mesh<Geometry, Shader>;
  point: Vec3;
  reach: number;
  objectId: number;
  kind: string;
  tile: [number, number];
  footprint: [number, number];
  cutHeight: number;
  projected?: ProjectedSurface;
  projectedFrame?: Frame;
  activity?: {
    mesh: Mesh<Geometry, Shader>;
    type: string;
    lift: number;
    time: number;
  };
};
function color(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}
/** Builds genuine three-dimensional vertices once; the GPU reprojects them on rotation. */
export function modelGeometry(
  model: InfrastructureModel,
  tile: [number, number],
  footprint: [number, number],
  lift = 0,
) {
  const positions: number[] = [],
    normals: number[] = [],
    colors: number[] = [],
    heights: number[] = [],
    indices: number[] = [];
  const centre: [number, number] = [
    tile[0] + footprint[0] / 2,
    tile[1] + footprint[1] / 2,
  ];
  for (const face of model.faces) {
    const points = face.points.map(([x, y, z]) => {
      const p = tileToPlanet(
          centre[0] + x / TILE_SIDE,
          centre[1] + z / TILE_SIDE,
        ),
        r = 1 + (y + lift) / RADIUS_PX;
      return p.map((n) => n * r) as Vec3;
    });
    const a = points[1].map((n, i) => n - points[0][i]),
      b = points[2].map((n, i) => n - points[0][i]);
    const normal = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ],
      len = Math.hypot(...normal) || 1,
      c = color(face.color),
      base = positions.length / 3;
    for (const [i, p] of points.entries()) {
      positions.push(...p);
      normals.push(...normal.map((n) => n / len));
      colors.push(...c, face.opacity ?? 1);
      heights.push(face.points[i][1] + lift);
    }
    for (let i = 1; i < points.length - 1; i++)
      indices.push(base, base + i, base + i + 1);
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    heights: new Float32Array(heights),
    indices: new Uint32Array(indices),
  };
}
export class InfrastructureRenderer {
  readonly uniforms = new UniformGroup({
    uPlanetRotation: { value: new Float32Array(9), type: 'mat3x3<f32>' },
    uCentre: { value: new Float32Array(2), type: 'vec2<f32>' },
    uRadius: { value: 1, type: 'f32' },
  });
  create(s: Sortable): LiveInfrastructure | null {
    // Authored clickable scene props and landmarks retain their native picking.
    if (!s.objectType || s.scene || s.landmark) return null;
    const model = infrastructureModel(s.objectType, s.footprint, s.objectId);
    if (!model) return null;
    const moving =
      laboratoryActivityModel(s.objectType, s.footprint, 0) ??
      sportsActivityModel(s.objectType, s.footprint, 0);
    const transparent = model.faces.filter((f) => (f.opacity ?? 1) < 1);
    const mesh = this.mesh(
      { ...model, faces: model.faces.filter((f) => (f.opacity ?? 1) >= 1) },
      s.tile,
      s.footprint,
      s.lift,
    );
    const glass = transparent.length
      ? this.mesh({ ...model, faces: transparent }, s.tile, s.footprint, s.lift)
      : undefined;
    if (glass) {
      glass.state.depthMask = false;
      glass.label = `Glass ${s.objectType} #${s.objectId}`;
    }
    mesh.label = `3D ${s.objectType} #${s.objectId}`;
    const activity = moving
      ? {
          mesh: this.mesh(moving, s.tile, s.footprint, s.lift),
          type: s.objectType,
          lift: s.lift,
          time: 0,
        }
      : undefined;
    if (activity)
      activity.mesh.label = `Working parts ${s.objectType} #${s.objectId}`;
    return {
      mesh,
      glass,
      activity,
      objectId: s.objectId,
      kind: model.kind,
      point: tileToPlanet(
        s.tile[0] + s.footprint[0] / 2,
        s.tile[1] + s.footprint[1] / 2,
      ),
      tile: s.tile,
      footprint: s.footprint,
      cutHeight: 10000,
      reach:
        Math.max(...s.footprint) * TILE_SIDE +
        Math.max(model.height, moving?.height ?? 0) +
        s.lift,
    };
  }
  surface(b: LiveInfrastructure, f: Frame) {
    if (b.projectedFrame !== f) {
      const g = b.mesh.geometry;
      b.projected = projectSurface(f, {
        vertices: g.getAttribute('aPosition').buffer.data as Float32Array,
        indices: g.indexBuffer!.data as Uint32Array,
        heights: g.getAttribute('aHeight').buffer.data as Float32Array,
      });
      b.projectedFrame = f;
    }
    return b.projected!;
  }
  reveal(b: LiveInfrastructure, f: Frame, probes: VisibilityProbe[]) {
    if (b.kind !== 'facade' || !b.mesh.visible) return;
    const s = this.surface(b, f),
      cut = probes.some((p) => {
        if (!p.tile) return false;
        const dx = Math.max(
            b.tile[0] - p.tile[0],
            0,
            p.tile[0] - b.tile[0] - b.footprint[0],
          ),
          dy = Math.max(
            b.tile[1] - p.tile[1],
            0,
            p.tile[1] - b.tile[1] - b.footprint[1],
          );
        return Math.hypot(dx, dy) < 5 && surfaceOccludes(s, p);
      })
        ? 10
        : 10000;
    b.cutHeight = cut;
    (b.mesh.shader!.resources.cutaway as UniformGroup).uniforms.uCutHeight =
      cut;
  }
  /** Reuse each activity buffer; off-screen laboratories perform no rebuilds. */
  animate(b: LiveInfrastructure, time: number) {
    const a = b.activity;
    if (!a || !b.mesh.visible || a.time === time) return;
    const model = (laboratoryActivityModel(a.type, b.footprint, time) ??
      sportsActivityModel(a.type, b.footprint, time))!;
    const data = modelGeometry(model, b.tile, b.footprint, a.lift);
    for (const [attribute, values] of [
      ['aPosition', data.positions],
      ['aNormal', data.normals],
      ['aColor', data.colors],
    ] as const) {
      const buffer = a.mesh.geometry.getAttribute(attribute).buffer;
      const target = buffer.data as Float32Array;
      target.set(values);
      buffer.update();
    }
    a.time = time;
  }
  private mesh(
    model: InfrastructureModel,
    tile: [number, number],
    footprint: [number, number],
    lift: number,
  ) {
    const data = modelGeometry(model, tile, footprint, lift);
    const geometry = new Geometry({
      attributes: {
        aPosition: { buffer: data.positions, format: 'float32x3' },
        aNormal: { buffer: data.normals, format: 'float32x3' },
        aColor: { buffer: data.colors, format: 'float32x4' },
        aHeight: { buffer: data.heights, format: 'float32' },
      },
      indexBuffer: data.indices,
    });
    const state = new State();
    state.depthTest = true;
    state.depthMask = true;
    state.cullMode = 'none';
    state.blendMode = 'normal';
    const mesh = new Mesh({
      geometry,
      shader: new Shader({
        glProgram: program(),
        resources: {
          infrastructure: this.uniforms,
          cutaway: new UniformGroup({
            uCutHeight: { value: 10000, type: 'f32' },
          }),
        },
      }),
      state,
    });
    mesh.eventMode = 'none';
    return mesh;
  }
  update(f: Frame) {
    const u = this.uniforms.uniforms as {
        uPlanetRotation: Float32Array;
        uCentre: Float32Array;
        uRadius: number;
      },
      m = f.matrix;
    u.uPlanetRotation.set([
      m[0],
      m[3],
      m[6],
      m[1],
      m[4],
      m[7],
      m[2],
      m[5],
      m[8],
    ]);
    u.uCentre.set([f.cx, f.cy]);
    u.uRadius = f.radius;
  }
}
// Exported for geometric regression tests and reproducible scene inspection.
export const INFRASTRUCTURE_PROJECTION = {
  radius: RADIUS_PX,
  pitch: PLANET.pitch,
};
