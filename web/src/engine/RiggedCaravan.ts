import {
  Geometry,
  GlProgram,
  Mesh,
  Shader,
  State,
  UniformGroup,
} from 'pixi.js';
import {
  CARAVAN,
  caravanActors,
  rigMatrices,
} from '../../../packages/shared/royal-caravan';
import {
  tileToPlanet,
  TILE_SIDE,
  RADIUS_PX,
} from '../../../packages/shared/planet';

// Each rigid mesh part is weighted to one articulated joint. The GPU applies
// the joint transforms; animation never rebuilds 40,000 faces each frame.
const COUNT = 48;
const vertex = `
in vec3 aLocal;in vec3 aNormal;in vec4 aColor;in float aJoint;in vec3 aFinish;
uniform mat4 uJoints[${COUNT}];uniform mat3 uLocalBasis;
uniform mat3 uProjectionMatrix;uniform mat3 uWorldTransformMatrix;uniform mat3 uTransformMatrix;
uniform mat3 uPlanetRotation;uniform vec2 uCentre;uniform float uRadius;
out vec4 vColor;out vec3 vLocal;out vec3 vNormal;out vec3 vFinish;
vec3 sphere(vec2 t){vec2 d=t-vec2(48.,62.);vec2 en=vec2(d.x-d.y,-d.x-d.y)*.70710678118;float r=length(en);float a=r/64.;return vec3(en*(sin(a)/max(r,.000001)),cos(a));}
void main(){
 mat4 joint=uJoints[int(aJoint)];vec3 local=(joint*vec4(aLocal,1.)).xyz;vLocal=local;
 vec3 world=sphere(vec2(${CARAVAN.center[0]}.,${CARAVAN.center[1]}.)+local.xz/${TILE_SIDE.toFixed(12)})*(1.+local.y/${RADIUS_PX.toFixed(12)});
 vec3 p=uPlanetRotation*world;vec3 normal=normalize(uPlanetRotation*uLocalBasis*mat3(joint)*aNormal);
 float lambert=max(0.,dot(normal,normalize(vec3(-.35,.65,.72))));float light=.55+.45*floor(lambert*9.)/9.;
 vColor=vec4(aColor.rgb*mix(light,1.,aFinish.z),aColor.a);vNormal=normal;vFinish=aFinish;vec2 screen=uCentre+vec2(p.x,-p.y)*uRadius;
 mat3 mvp=uProjectionMatrix*uWorldTransformMatrix*uTransformMatrix;gl_Position=vec4((mvp*vec3(screen,1.)).xy,-p.z*.45,1.);
}`;
const fragment = `in vec4 vColor;in vec3 vLocal;in vec3 vNormal;in vec3 vFinish;out vec4 finalColor;void main(){
 float grain=fract(sin(dot(floor(vLocal*1.3),vec3(12.9898,78.233,37.719)))*43758.5453);
 vec3 color=vColor.rgb*(.97+.055*grain);
 if(vFinish.z>.5){vec3 n=normalize(vNormal),l=normalize(vec3(-.35,.65,.72)),h=normalize(l+vec3(0.,0.,1.));
 float diffuse=.54+.46*floor(max(0.,dot(n,l))*24.)/24.;float spec=pow(max(0.,dot(n,h)),mix(12.,90.,1.-vFinish.x));
 color=vColor.rgb*diffuse+mix(vec3(.1),vec3(.92,.74,.38),vFinish.y)*spec*(.1+.65*vFinish.y);}
 finalColor=vec4(color,vColor.a);}`;
const normalize = (a: number[]) => {
  const l = Math.hypot(...a);
  return a.map((v) => v / l);
};
export class RiggedCaravan {
  readonly meshes: Mesh<Geometry, Shader>[] = [];
  readonly batches: {
    paths: string[];
    group: UniformGroup;
    matrices: Float32Array;
  }[] = [];
  time = 0;
  readonly jointCount: number;
  constructor(planetUniforms: UniformGroup) {
    const entries = [...rigMatrices(caravanActors(0))].filter(
      ([, v]) => v.node.faces?.length,
    );
    this.jointCount = entries.length;
    const p = tileToPlanet(...CARAVAN.center),
      dx = normalize(
        tileToPlanet(CARAVAN.center[0] + 0.001, CARAVAN.center[1]).map(
          (v, i) => v - p[i],
        ),
      ),
      dz = normalize(
        tileToPlanet(CARAVAN.center[0], CARAVAN.center[1] + 0.001).map(
          (v, i) => v - p[i],
        ),
      );
    for (let offset = 0; offset < entries.length; offset += COUNT) {
      const slice = entries.slice(offset, offset + COUNT),
        local: number[] = [],
        normals: number[] = [],
        colors: number[] = [],
        finish: number[] = [],
        joints: number[] = [],
        indices: number[] = [],
        matrices = new Float32Array(COUNT * 16);
      slice.forEach(([path, value], joint) => {
        matrices.set(value.matrix, joint * 16);
        for (const f of value.node.faces!) {
          const [a, b, c] = f.points,
            u = b.map((v, i) => v - a[i]),
            v = c.map((q, i) => q - a[i]),
            n = normalize(
              [
                u[1] * v[2] - u[2] * v[1],
                u[2] * v[0] - u[0] * v[2],
                u[0] * v[1] - u[1] * v[0],
              ].map((q) => q || 1e-10),
            ),
            color = [1, 3, 5].map(
              (i) => parseInt(f.color.slice(i, i + 2), 16) / 255,
            ),
            base = local.length / 3;
          for (const [vertexIndex, point] of f.points.entries()) {
            local.push(...point);
            normals.push(...(f.normals?.[vertexIndex] ?? n));
            colors.push(...color, 1);
            finish.push(
              f.finish === 'gold'
                ? 0.24
                : f.finish === 'face' || f.finish === 'skin'
                  ? 0.56
                  : 0.88,
              f.finish === 'gold' ? 0.92 : f.finish === 'brocade' ? 0.16 : 0,
              f.finish ? 1 : 0,
            );
            joints.push(joint);
          }
          for (let i = 1; i < f.points.length - 1; i++)
            indices.push(base, base + i, base + i + 1);
        }
        void path;
      });
      const group = new UniformGroup({
        uJoints: { value: matrices, type: 'mat4x4<f32>', size: COUNT },
        uLocalBasis: {
          value: new Float32Array([...dx, ...p, ...dz]),
          type: 'mat3x3<f32>',
        },
      });
      const geometry = new Geometry({
        attributes: {
          aLocal: { buffer: new Float32Array(local), format: 'float32x3' },
          aNormal: { buffer: new Float32Array(normals), format: 'float32x3' },
          aColor: { buffer: new Float32Array(colors), format: 'float32x4' },
          aJoint: { buffer: new Float32Array(joints), format: 'float32' },
          aFinish: { buffer: new Float32Array(finish), format: 'float32x3' },
        },
        indexBuffer: new Uint32Array(indices),
      });
      const shader = new Shader({
        glProgram: GlProgram.from({
          vertex,
          fragment,
          name: 'dar-rigged-mali-caravan',
          preferredFragmentPrecision: 'highp',
        }),
        resources: { planet: planetUniforms, rig: group },
      });
      const mesh = new Mesh({ geometry, shader, state: new State() });
      mesh.state.depthTest = true;
      mesh.state.depthMask = true;
      mesh.state.cullMode = 'none';
      mesh.label = `Articulated Mali caravan ${offset / COUNT + 1}`;
      this.meshes.push(mesh);
      this.batches.push({
        paths: slice.map(([path]) => path),
        group,
        matrices,
      });
    }
  }
  animate(time: number) {
    if (time === this.time || !this.meshes[0]?.visible) return;
    const pose = rigMatrices(caravanActors(time));
    for (const batch of this.batches) {
      batch.paths.forEach((path, i) =>
        batch.matrices.set(pose.get(path)!.matrix, i * 16),
      );
      batch.group.update();
    }
    this.time = time;
  }
  destroy() {
    for (const mesh of this.meshes) {
      const g = mesh.geometry,
        s = mesh.shader;
      mesh.destroy();
      g.destroy();
      s?.destroy();
    }
  }
}
