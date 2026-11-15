import {
  GlProgram,
  Mesh,
  MeshGeometry,
  Shader,
  Sprite,
  State,
  Texture,
  UniformGroup,
} from 'pixi.js';
import { RADIUS_PX, type Projected } from '../../../packages/shared/planet';

const vertex = `
in vec2 aPosition;in vec2 aUV;out vec2 vUV;
uniform mat3 uProjectionMatrix;uniform mat3 uWorldTransformMatrix;uniform mat3 uTransformMatrix;
uniform float uDepth;uniform float uSlope;
void main(){
 mat3 mvp=uProjectionMatrix*uWorldTransformMatrix*uTransformMatrix;
 gl_Position=vec4((mvp*vec3(aPosition,1.)).xy,-(uDepth+aPosition.y*uSlope)*.45,1.);
 vUV=aUV;
}`;
const fragment = `
in vec2 vUV;out vec4 finalColor;uniform sampler2D uTexture;
uniform vec4 uBounds;uniform vec2 uTexel;uniform float uHighlight;uniform float uPass;
float opacity(vec2 uv){
 if(any(lessThan(uv,uBounds.xy))||any(greaterThan(uv,uBounds.zw)))return 0.;
 return texture(uTexture,uv).a;
}
void main(){
 vec4 c=texture(uTexture,vUV);
 if(uHighlight>0.){
  float a=max(max(opacity(vUV+vec2(uTexel.x,0.)),opacity(vUV-vec2(uTexel.x,0.))),
              max(opacity(vUV+vec2(0.,uTexel.y)),opacity(vUV-vec2(0.,uTexel.y))));
  float edge=max(0.,a-c.a)*uHighlight;
  c+=vec4(vec3(.847,.678,.341)*edge,edge)*(1.-c.a);
 }
 if(c.a<.08)discard;
 // Opaque pixels may establish depth before the architecture. Soft edges
 // blend only after all opaque geometry, without blocking its background.
 if(uPass==0.&&c.a<.999)discard;
 if(uPass==1.&&c.a>=.999)discard;
 finalColor=c;
}`;

/** A sprite keeps its original art, foot anchor, transforms and picking mask,
 * while its pixels share the architecture's depth buffer. Transparent atlas
 * margins never write depth. No filter render target can erase that depth.
 */
export class DepthSprite {
  readonly mesh: Mesh<MeshGeometry, Shader>;
  readonly edgeMesh?: Mesh<MeshGeometry, Shader>;
  private texture: Texture | null = null;
  private uniforms = new UniformGroup({
    uDepth: { value: 0, type: 'f32' },
    uSlope: { value: 0, type: 'f32' },
    uBounds: { value: new Float32Array(4), type: 'vec4<f32>' },
    uTexel: { value: new Float32Array(2), type: 'vec2<f32>' },
    uHighlight: { value: 0, type: 'f32' },
  });
  constructor(
    readonly sprite: Sprite,
    shadow = false,
  ) {
    const state = new State();
    state.depthTest = true;
    state.depthMask = !shadow;
    state.cullMode = 'none';
    this.mesh = new Mesh({
      geometry: new MeshGeometry({
        positions: new Float32Array(8),
        uvs: new Float32Array(8),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
      }),
      shader: new Shader({
        glProgram: GlProgram.from({
          vertex,
          fragment,
          name: 'dar-depth-sprite',
          preferredFragmentPrecision: 'highp',
        }),
        resources: {
          spriteDepth: this.uniforms,
          uTexture: Texture.WHITE.source,
          alphaPass: new UniformGroup({
            uPass: { value: shadow ? -1 : 0, type: 'f32' },
          }),
        },
      }),
      state,
    });
    this.mesh.eventMode = 'none';
    if (!shadow) {
      const edgeState = new State();
      edgeState.depthTest = true;
      edgeState.depthMask = false;
      edgeState.cullMode = 'none';
      this.edgeMesh = new Mesh({
        geometry: this.mesh.geometry,
        shader: new Shader({
          glProgram: this.mesh.shader!.glProgram!,
          resources: {
            spriteDepth: this.uniforms,
            uTexture: Texture.WHITE.source,
            alphaPass: new UniformGroup({ uPass: { value: 1, type: 'f32' } }),
          },
        }),
        state: edgeState,
      });
      this.edgeMesh.eventMode = 'none';
    }
    sprite.renderable = false;
  }
  sync(p: Projected | null, lift = 0, density = 1, upright = false, bias = 0) {
    const s = this.sprite,
      m = this.mesh;
    m.visible = s.visible && Boolean(p);
    if (this.edgeMesh) this.edgeMesh.visible = m.visible;
    if (!m.visible || !p) return;
    for (const pass of [m, this.edgeMesh]) {
      if (!pass) continue;
      if (s.parent && pass.parent !== s.parent) s.parent.addChild(pass);
      pass.position.copyFrom(s.position);
      pass.pivot.copyFrom(s.pivot);
      pass.scale.copyFrom(s.scale);
      pass.rotation = s.rotation;
      pass.alpha = s.alpha;
      // Glass follows at 3 (native chamber glass follows just above 2).
      pass.zIndex = pass === m ? s.zIndex : 2 + s.zIndex * 1e-5;
    }
    const u = this.uniforms.uniforms;
    // Billboards keep their authored screen height. Infer the corresponding
    // radial height from the projected planet normal, including horizon lean.
    const rise = upright
      ? p.normal[2] /
        (RADIUS_PX *
          density *
          Math.max(0.45, Math.hypot(p.normal[0], p.normal[1])))
      : 0;
    u.uSlope = -rise;
    u.uDepth = p.normal[2] * (1 + lift / RADIUS_PX) + s.pivot.y * rise + bias;
    if (this.texture !== s.texture) {
      const t = s.texture,
        uv = t.uvs;
      m.geometry.positions = new Float32Array([
        0,
        0,
        t.orig.width,
        0,
        t.orig.width,
        t.orig.height,
        0,
        t.orig.height,
      ]);
      m.geometry.uvs = new Float32Array([
        uv.x0,
        uv.y0,
        uv.x1,
        uv.y1,
        uv.x2,
        uv.y2,
        uv.x3,
        uv.y3,
      ]);
      m.shader!.resources.uTexture = t.source;
      if (this.edgeMesh) this.edgeMesh.shader!.resources.uTexture = t.source;
      u.uBounds.set([uv.x0, uv.y0, uv.x2, uv.y2]);
      u.uTexel.set([density / t.source.width, density / t.source.height]);
      this.texture = t;
    }
  }
  highlight(alpha: number) {
    this.uniforms.uniforms.uHighlight = alpha;
  }
  depthAt(localY: number) {
    const u = this.uniforms.uniforms;
    return u.uDepth + localY * u.uSlope;
  }
  destroy() {
    const { geometry, shader } = this.mesh;
    const edgeShader = this.edgeMesh?.shader;
    this.edgeMesh?.destroy();
    this.mesh.destroy();
    geometry.destroy();
    shader?.destroy();
    edgeShader?.destroy();
  }
}
