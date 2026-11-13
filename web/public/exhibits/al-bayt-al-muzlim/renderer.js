// Actual 3D room geometry; dependency-free WebGL with a matching Canvas fallback.
import {SoftwareSurface} from './software.js';
import {buildSanctuary} from './scene.js';
import {buildCourtyard} from './courtyard.js';
import {buildWaterClock} from './instruments.js';
import {buildInstrumentExperiment} from './instrument-experiments.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
function multiply(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;}
function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
function perspective(fov,aspect,near=.05,far=120){const f=1/Math.tan(fov/2);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);}
function lookAt(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function meshBounds(parts){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of parts)for(let i=0;i<p.vertices.length;i++){const k=i%3;min[k]=Math.min(min[k],p.vertices[i]);max[k]=Math.max(max[k],p.vertices[i]);}return{min,max};}
function boundsCorners(bounds){return Array.from({length:8},(_,i)=>bounds.min.map((v,k)=>(i>>k)&1?bounds.max[k]:v));}
function framedHeight(bounds,eye,target,aspect,padding=1.08,points=null){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);let width=0,height=0;for(const point of points||boundsCorners(bounds)){const p=sub(point,target);width=Math.max(width,Math.abs(dot(p,x))*2);height=Math.max(height,Math.abs(dot(p,y))*2);}return Math.max(.1,height*padding,width*padding/aspect);}
function canvas(width,height=width){const cv=document.createElement('canvas');cv.width=width;cv.height=height;return cv;}
const randomGenerator=(initial=1907)=>{let seed=initial;return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};};

// A sky at infinity follows the camera. Its sun direction also lights the geometry.
function createSkyTexture(camera,width=512,height=512){
 const cv=canvas(width,height),c=cv.getContext('2d'),forward=norm(sub(camera.target,camera.eye)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),tangent=Math.tan((camera.fovDegrees||55)*Math.PI/360),aspect=camera.aspect||width/height;
 for(let y=0;y<height;y++){
  const vertical=(1-2*(y+.5)/height)*tangent,elevation=(forward[1]+up[1]*vertical)/Math.sqrt(1+vertical*vertical),t=clamp(elevation/.78,0,1),s=t*t*(3-2*t);
  const rgb=[mix(225,112,s),mix(221,164,s),mix(196,190,s)].map(Math.round);c.fillStyle=`rgb(${rgb.join(',')})`;c.fillRect(0,y,width,1);
 }
 const sun=norm([.65,1,.52]),depth=dot(sun,forward);
 if(depth>.015){const x=(.5+dot(sun,right)/(2*depth*tangent*aspect))*width,y=(.5-dot(sun,up)/(2*depth*tangent))*height,r=height*.0047/(2*tangent);
  if(x>-80&&x<width+80&&y>-80&&y<height+80){const glow=c.createRadialGradient(x,y,r,x,y,Math.max(24,r*20));glow.addColorStop(0,'rgba(255,246,210,.56)');glow.addColorStop(.24,'rgba(255,240,197,.12)');glow.addColorStop(1,'rgba(255,239,202,0)');c.fillStyle=glow;c.fillRect(0,0,width,height);c.fillStyle='#fff9df';c.beginPath();c.arc(x,y,Math.max(1.4,r),0,Math.PI*2);c.fill();}
 }
 return cv;
}

/** The optical object field is rendered from the same courtyard meshes shown outside. */
let cachedCourtyardTexture;
export function createCourtyardTexture(){
 if(cachedCourtyardTexture)return cachedCourtyardTexture;
 const model=buildCourtyard(),camera=model.opticalCamera||{eye:[-4.84,2.72,-1.4],target:[-22,2.72,-1.4],fovDegrees:48};
 const cv=canvas(512),c=cv.getContext('2d'),view=canvas(512),surface=new SoftwareSurface(view),white=createMaterialTexture('white'),textures={white};
 for(const key of ['stone','wood','glass','cloth','dark','metal'])textures[key]=createMaterialTexture(key);
 const matrix=multiply(perspective((camera.fovDegrees||48)*Math.PI/180,1,.05,100),lookAt(camera.eye,camera.target));
 surface.begin(matrix,camera.eye,white);
 for(const part of model.parts){
  const material=SCENE_MATERIALS[part.material]||SCENE_MATERIALS.courtyardStone,color=part.color||[.8,.7,.5,1],points=Array.from({length:4},(_,i)=>part.vertices.slice(i*3,i*3+3));
  let normal=cross(sub(points[1],points[0]),sub(points[2],points[0]));if(Math.hypot(...normal)<1e-10)normal=cross(sub(points[2],points[0]),sub(points[3],points[0]));if(Math.hypot(...normal)<1e-10)continue;
  const n=norm(normal),uv=part.uv||[[0,0],[1,0],[1,1],[0,1]],array=[];for(const i of [0,1,2,0,2,3])array.push(...points[i],...n,...uv[i]);
  const texture=textures[material.texture]||white;surface.draw(array,texture,color,material.twoSided?texture:null,material.unlit?0:1,{...material,exposure:1,sunlight:true,atmosphere:!material.unlit});
 }
 surface.finish();
 c.drawImage(createSkyTexture(camera),0,0);
 c.drawImage(view,0,0);cachedCourtyardTexture=cv;return cv;
}

export function createMaterialTexture(name){
 const cv=canvas(name==='white'?2:256),c=cv.getContext('2d'),w=cv.width,img=c.createImageData(w,w),random=randomGenerator(1907);
 for(let y=0;y<w;y++)for(let x=0;x<w;x++){
  let v=255,noise=random()-.5;
  if(name==='wood')v=239+Math.sin(x*.37+Math.sin(y*.025)*2+Math.sin(y*.091)*.4)*6+Math.sin(x*1.49+y*.015)*2+noise*12;
  else if(name==='metal')v=245+Math.sin(y*1.71)*2+noise*7;
  else if(name==='mirror')v=249+noise*3;
  else if(name==='glass')v=253+noise*1.3;
  else if(name==='paper')v=247+noise*10+(Math.sin(x*2.1)+Math.sin(y*1.73))*1.8;
  else if(name==='stone')v=233+noise*24+Math.sin(x*.2+y*.3)*6+Math.sin(x*.063-y*.054)*5;
  else if(name==='cloth')v=239+Math.sin(x*2.1)*4+Math.sin(y*2.18)*4+noise*9;
  else if(name==='wax')v=248+noise*4;
  else if(name==='dark')v=244+noise*6;
  const i=(y*w+x)*4;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;
 }
 c.putImageData(img,0,0);return cv;
}

/** Aperture size changes brightness and geometric softness, without claiming a calibrated simulation. */
export function createProjectionTexture({aperture=.35,sunlight=true,screenDistance=.5}={},courtyard=createCourtyardTexture()){
 const cv=canvas(512),c=cv.getContext('2d'),a=clamp(aperture,0,1),distance=clamp(screenDistance,0,1);
 c.fillStyle=sunlight?'#b7ac86':'#3b3e32';c.fillRect(0,0,512,512);
 if(sunlight){
  const inverted=canvas(512),g=inverted.getContext('2d');g.translate(512,512);g.rotate(Math.PI);g.drawImage(courtyard,0,0);
  const soft=canvas(512),s=soft.getContext('2d');s.imageSmoothingEnabled=true;
  // Downsampling creates a stable blur across Canvas implementations, including export tools.
  const sample=Math.round(512/(1+a*a*6.3));const small=canvas(sample);small.getContext('2d').drawImage(inverted,0,0,sample,sample);s.drawImage(small,0,0,512,512);
  const extent=.74+.24*distance,pad=(1-extent)*256,brightness=.28+.72*Math.sqrt(a);
  c.globalAlpha=brightness;c.drawImage(soft,pad,pad,512*extent,512*extent);c.globalAlpha=1;
  const vignette=c.createRadialGradient(256,256,90,256,256,355);vignette.addColorStop(0,'rgba(28,30,22,0)');vignette.addColorStop(1,'rgba(28,30,22,.31)');c.fillStyle=vignette;c.fillRect(0,0,512,512);
  c.fillStyle=`rgba(17,21,15,${.31*(1-brightness)})`;c.fillRect(0,0,512,512);
 }
 const random=randomGenerator(33);for(let i=0;i<4500;i++){c.fillStyle=random()>.5?'rgba(245,238,206,.035)':'rgba(35,40,28,.035)';c.fillRect(Math.floor(random()*512),Math.floor(random()*512),1,1);}
 return cv;
}

export function createSceneTextures(options={}){
 const result={};for(const name of ['white','wood','metal','mirror','glass','paper','stone','cloth','wax','dark'])result[name]=createMaterialTexture(name);
 result.courtyard=createCourtyardTexture();result.projection=createProjectionTexture(options,result.courtyard);return result;
}

export const SCENE_MATERIALS={
 courtyardEarth:{texture:'stone',strength:0,power:20,reflection:0,exterior:true,metallic:0,roughness:1},
 courtyardCloth:{texture:'cloth',strength:.015,power:20,reflection:0,twoSided:true,exterior:true,metallic:0,roughness:1},
 courtyardShadow:{texture:'white',strength:0,power:20,reflection:0,unlit:true,twoSided:true,exterior:true,metallic:0,roughness:1},
 courtyardStone:{texture:'stone',strength:.02,power:24,reflection:0,exterior:true,metallic:0,roughness:.93},
 courtyardWood:{texture:'wood',strength:.045,power:36,reflection:0,exterior:true,metallic:0,roughness:.78},
 courtyardWater:{texture:'glass',strength:.30,power:70,reflection:.30,glassy:.55,twoSided:true,exterior:true,metallic:0,roughness:.08},
 courtyardLeaf:{texture:'cloth',strength:.025,power:22,reflection:0,twoSided:true,exterior:true,metallic:0,roughness:.96},
 courtyardDark:{texture:'dark',strength:0,power:20,reflection:0,exterior:true,metallic:0,roughness:.92},
 courtyardMetal:{texture:'metal',strength:.32,power:62,reflection:.23,exterior:true,metallic:.82,roughness:.30},
 wood:{texture:'wood',strength:.045,power:36,reflection:0},
 brass:{texture:'metal',strength:.32,power:62,reflection:.23},
 mirror:{texture:'mirror',strength:.36,power:72,reflection:.72,twoSided:true},
 glass:{texture:'glass',strength:.34,power:76,reflection:.31,glassy:1,twoSided:true},
 water:{texture:'glass',strength:.27,power:64,reflection:.28,glassy:.68,twoSided:true},
 paper:{texture:'paper',strength:0,power:20,reflection:0,twoSided:true},
 stone:{texture:'stone',strength:.018,power:20,reflection:0},
 cloth:{texture:'cloth',strength:.015,power:20,reflection:0,twoSided:true},
 wax:{texture:'wax',strength:.025,power:32,reflection:0},
 flame:{texture:'white',strength:0,power:20,reflection:0,unlit:true,twoSided:true},
 ray:{texture:'white',strength:0,power:20,reflection:0,unlit:true,twoSided:true},
 projection:{texture:'projection',strength:0,power:20,reflection:0,unlit:true,twoSided:false},
 dark:{texture:'dark',strength:0,power:20,reflection:0,twoSided:true},
 solid:{texture:'white',strength:.015,power:30,reflection:0}
};

const VS=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uMatrix;varying vec3 vNormal;varying vec2 vUV;varying vec3 vWorld;void main(){gl_Position=uMatrix*vec4(aPosition,1.);vNormal=aNormal;vUV=aUV;vWorld=aPosition;}`;
const FS=`precision mediump float;
varying vec3 vNormal;varying vec2 vUV;varying vec3 vWorld;
uniform sampler2D uTexture;uniform vec4 uTint;uniform vec3 uEye;
uniform vec2 uRoomMin;uniform vec2 uRoomMax;
uniform float uLighting;uniform float uSpecular;uniform float uShine;uniform float uReflect;uniform float uGlass;uniform float uExposure;uniform float uSunlight;uniform float uExterior;uniform float uAtmosphere;
void main(){
 vec4 t=texture2D(uTexture,vUV);vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 vec3 sun=normalize(mix(vec3(-.72,1.,.52),vec3(.65,1.,.52),uExterior));vec3 view=normalize(uEye-vWorld);
 float key=max(0.,dot(n,sun));float fill=max(0.,dot(n,normalize(vec3(.65,.35,-.55))));
 float ambient=mix(mix(.09,.40,uExposure),.34,uExterior);float keyPower=mix(mix(.10,.52,uExposure)*mix(.65,1.,uSunlight),.72,uExterior);float fillPower=mix(mix(.025,.17,uExposure),.16,uExterior);
 float wallDistance=min(min(vWorld.x-uRoomMin.x,uRoomMax.x-vWorld.x),min(vWorld.z-uRoomMin.y,uRoomMax.y-vWorld.z));float ao=1.-.18*exp(-max(0.,vWorld.y)*2.)*(1.-smoothstep(.05,.95,wallDistance))*(1.-uExterior);
 vec3 light=(vec3(ambient)+keyPower*key*vec3(1.12,1.,.79)+fillPower*fill*vec3(.73,.87,1.)+.06*uExposure*max(n.y,0.)*vec3(.94,.99,1.))*ao;
 float spec=pow(max(0.,dot(n,normalize(sun+view))),uShine)*uSpecular*key*(.40+.60*uExposure);
 vec3 reflected=reflect(-view,n);float sky=smoothstep(-.28,.33,reflected.y);
 vec3 env=mix(mix(vec3(.18,.17,.12),vec3(.42,.46,.43),sky),mix(vec3(.34,.29,.20),vec3(.49,.66,.73),sky),uExterior)*(.45+.55*uExposure);
 float horizon=1.-smoothstep(.02,.18,abs(reflected.y));env+=vec3(.08,.09,.06)*horizon;
 float edge=pow(1.-abs(dot(n,view)),3.);float fresnel=.40+.60*edge;
 float frontLight=smoothstep(.05,.45,reflected.z);
 float leftPanel=(1.-smoothstep(.018,.095,abs(reflected.x+.42)))*smoothstep(-.25,.15,reflected.y)*(1.-smoothstep(.78,.96,reflected.y))*frontLight;
 float rightPanel=(1.-smoothstep(.012,.055,abs(reflected.x-.50)))*smoothstep(-.45,-.15,reflected.y)*(1.-smoothstep(.65,.90,reflected.y))*frontLight;
 float panel=clamp(leftPanel+.6*rightPanel,0.,1.)*(.30+.70*uExposure)*(1.-uExterior);
 vec3 glintColour=vec3(.98,.96,.83)*(.70+.30*uExposure);
 vec3 colour=t.rgb*uTint.rgb*mix(vec3(1.),light,uLighting);
 colour=mix(colour,env*mix(vec3(1.),uTint.rgb,.30),uReflect*fresnel);
 colour+=vec3(1.,.94,.79)*spec*uLighting;
 float alpha=t.a*uTint.a;
 if(uGlass>.0){float coverage=clamp(uGlass*(.22*edge+.66*panel+.42*spec),0.,.76);float visibleAlpha=alpha+(1.-alpha)*coverage;colour=(colour*alpha*(1.-coverage)+glintColour*coverage)/max(visibleAlpha,.001);alpha=visibleAlpha;}
 else colour=mix(colour,glintColour,panel*uReflect*.74);
 float air=uAtmosphere*(1.-exp(-length(uEye-vWorld)*.0045));colour=mix(colour,vec3(.76,.77,.69),air);
 gl_FragColor=vec4(colour,alpha);
}`;

export class SanctuaryRenderer{
 constructor(canvasElement,onChange){
  this.canvas=canvasElement;this.change=onChange;this.cutaway=true;this.aperture=.35;this.sunlight=true;this.rays=true;this.screenDistance=.5;this.clockHour=6;this.exposure=.78;this.detail='micro';this.instrumentDemo=null;this.demoMeasurements=null;this.frameCallback=null;this.thumbnailCache=new Map();this.instrumentFocusCache=new Map();this.focusInstrument=null;this.focusBounds=null;this.presentationFraming=false;
  this.yaw=-.82;this.pitch=.94;this.goalYaw=this.yaw;this.goalPitch=this.pitch;this.zoom=1;this.goalZoom=1;this.radius=30;this.goalRadius=30;this.target=[2.4,2.675,0];this.goalTarget=[...this.target];this.walkEye=[-2.3,2.08,1.25];this.goalWalkEye=[...this.walkEye];this.frameSpan=25;this.focusSpan=0;this.auto=false;this.view='workshop';this.viewScope='room';
  this.interacting=false;this.motionResolution=false;this.lastTime=0;this.dirty=3;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:false});
  if(!this.gl)this.software=new SoftwareSurface(this.canvas);
  this.program=this.gl?this.makeProgram():null;this.buffer=this.gl?this.gl.createBuffer():null;this.locations={};
  if(this.gl){for(const n of ['aPosition','aNormal','aUV'])this.locations[n]=this.gl.getAttribLocation(this.program,n);for(const n of ['uMatrix','uTexture','uTint','uEye','uLighting','uSpecular','uShine','uReflect','uGlass','uExposure','uSunlight','uExterior','uAtmosphere','uRoomMin','uRoomMax'])this.locations[n]=this.gl.getUniformLocation(this.program,n);}
  this.sourceTextures=createSceneTextures(this);this.textures={};for(const [name,cv] of Object.entries(this.sourceTextures))this.textures[name]=this.texture(cv);this.white=this.textures.white;
  this.rebuild();this.target=[...this.goalTarget];this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas);this.resize();this.frameSpan=this.fittedHeight(this.eye());this.setupInput();
  this.loop=this.loop.bind(this);this.frame=requestAnimationFrame(this.loop);this.emit();
 }
 makeProgram(){const gl=this.gl,p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,FS]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
 texture(cv){if(!this.gl)return cv;const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 emit(){this.change?.({cutaway:this.cutaway,sunlight:this.sunlight,rays:this.rays,aperture:this.aperture,screenDistance:this.screenDistance,clockHour:this.clockHour,instrumentDemo:this.instrumentDemo,measurements:this.demoMeasurements,exposure:this.exposure,detail:this.detail,view:this.view,viewScope:this.viewScope,zoom:this.goalZoom,auto:this.auto,immersive:this.isWalking()||this.view==='pinhole',canWalk:this.isWalking(),navigationArea:this.view==='interior'?'room':this.view==='walk'?'courtyard':null});}
 updateProjection(){const old=this.textures.projection;this.sourceTextures.projection=createProjectionTexture(this,this.sourceTextures.courtyard);this.textures.projection=this.texture(this.sourceTextures.projection);if(this.gl)this.gl.deleteTexture(old);}
 getCourtyardCanvas(){return this.sourceTextures.courtyard;}
 getProjectionCanvas(){return this.sourceTextures.projection;}
 instrumentParts(id,{thumbnail=false}={}){
  const data=this.model.instruments;if(!data)return[];
  const mirror=data.mirrors.find(m=>m.id===id);
  if(mirror)return this.model.parts.filter(p=>p.group===mirror.surfaceGroup||p.group===mirror.mountGroup);
  if(id==='mirrors'&&thumbnail){
   const selected=['mirror-plane','mirror-spherical-concave','mirror-cylindrical-convex'];
   return selected.flatMap((key,i)=>{const m=data.mirrors.find(v=>v.id===key),dx=(i-1)*1.08-m.surface.frame.origin[0];return this.instrumentParts(key).map(p=>({...p,vertices:p.vertices.map((v,k)=>k%3===0?v+dx:v)}));});
  }
  if(id==='waterclock'&&thumbnail)return buildWaterClock(6,{cutaway:true}).parts;
  const assembly=data.assemblies.find(a=>a.id===(id==='tubes'?'sighting-tubes':id));if(!assembly)return[];
  const omitted=id==='tubes'?['instrument-tube-stand']:id==='astronomy'?['instrument-astronomy-console']:[];
  return this.model.parts.filter(p=>assembly.groups.includes(p.group)&&!omitted.includes(p.group));
 }
 instrumentFocusBounds(id){
  if(this.instrumentFocusCache.has(id))return this.instrumentFocusCache.get(id);
  const parts=[...this.instrumentParts(id)],options=id.startsWith('mirror-')?[-25,0,25].map(angle=>({kind:'mirror',mirrorId:id,angle})):id==='tubes'?[8,22,36].map(tubeAngle=>({kind:'tube',tubeAngle})):id==='astronomy'?[{kind:'astronomy',altitude:0,sunAltitude:40},{kind:'astronomy',altitude:90,sunAltitude:80}]:[];
  for(const option of options)parts.push(...buildInstrumentExperiment(option,this.model).parts);
  const bounds=meshBounds(parts);this.instrumentFocusCache.set(id,bounds);return bounds;
 }
 /** Cached catalogue images use the same physical apparatus, never the room camera. */
 getInstrumentThumbnail(id,{width=320,height=180}={}){
  width=Math.round(clamp(Number(width)||320,48,1280));height=Math.round(clamp(Number(height)||180,48,1280));const key=id+':'+width+'x'+height;if(this.thumbnailCache.has(key))return this.thumbnailCache.get(key);
  const parts=this.instrumentParts(id,{thumbnail:true});if(!parts.length)return null;
  const bounds=meshBounds(parts),target=bounds.min.map((v,i)=>(v+bounds.max[i])/2),mirror=id==='mirrors'||id.startsWith('mirror-'),yaw=mirror?Math.PI-.30:id==='tubes'?-.40:id==='astronomy'?-1.55:.06,pitch=mirror?.13:id==='tubes'?.28:id==='astronomy'?.34:.18,radius=Math.max(3,Math.hypot(...bounds.max.map((v,i)=>v-bounds.min[i]))*2),eye=[target[0]+radius*Math.sin(yaw)*Math.cos(pitch),target[1]+radius*Math.sin(pitch),target[2]+radius*Math.cos(yaw)*Math.cos(pitch)],span=framedHeight(bounds,eye,target,width/height,1.055);
  const cv=canvas(width,height),surface=new SoftwareSurface(cv),matrix=multiply(ortho(-span*width/height/2,span*width/height/2,-span/2,span/2,.05,180),lookAt(eye,target)),batches=this.compileParts(parts),direction=norm(sub(eye,target));
  surface.begin(matrix,eye,this.sourceTextures.white);batches.transparent.sort((a,b)=>dot(a.center,direction)-dot(b.center,direction));
  for(const b of [...batches.opaque,...batches.transparent]){const texture=this.sourceTextures[b.textureKey]||this.sourceTextures.white;surface.draw(b.array,texture,b.color,b.material.twoSided?texture:null,b.material.unlit?0:1,{...b.material,exposure:.98,sunlight:true,roomBounds:this.roomFloorBounds});}
  surface.finish();const context=cv.getContext('2d');context.globalCompositeOperation='destination-over';context.fillStyle='#1b211b';context.fillRect(0,0,width,height);context.globalCompositeOperation='source-over';this.thumbnailCache.set(key,cv);return cv;
 }
 /** Project a world point into CSS pixels relative to the canvas. */
 projectLandmark(position){
  if(!this.matrix||!Array.isArray(position)||position.length<3)return{x:0,y:0,depth:0,visible:false};
  const [x,y,z]=position,m=this.matrix,w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return{x:0,y:0,depth:0,visible:false};
  const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w,depth=(m[2]*x+m[6]*y+m[10]*z+m[14])/w;
  return{x:(nx+1)*.5*(this.cssWidth||this.canvas.width),y:(1-ny)*.5*(this.cssHeight||this.canvas.height),depth,visible:Math.abs(nx)<=1&&Math.abs(ny)<=1&&depth>=-1&&depth<=1};
 }
 getStationMarkers(){return['mirrors','tubes','astronomy','waterclock'].map(id=>{const position=this.landmark(id);return{id,position,...this.projectLandmark(position)};});}
 setFrameCallback(callback){this.frameCallback=typeof callback==='function'?callback:null;if(this.frameCallback&&this.matrix)this.frameCallback(this.getStationMarkers());}
 rebuild(){
  this.model=buildSanctuary({cutaway:this.cutaway,aperture:this.aperture,sunlight:this.sunlight,rays:this.rays,screenDistance:this.screenDistance,clockHour:this.clockHour});
  this.bounds=this.model.bounds;this.roomBounds=this.model.roomBounds||this.bounds;this.courtyardBounds=this.model.courtyardFocusBounds||this.model.focusBounds||this.model.courtyardBounds||this.bounds;this.studyBounds={min:this.roomBounds.min.map((v,i)=>Math.min(v,this.courtyardBounds.min[i])),max:this.roomBounds.max.map((v,i)=>Math.max(v,this.courtyardBounds.max[i]))};this.presentationBounds=this.model.presentationBounds||this.studyBounds;this.contextView=this.model.contextView||null;this.opticalCamera=this.model.opticalCamera||{eye:[-4.84,2.72,-1.4],target:[-22,2.72,-1.4],fovDegrees:48};
  const site=this.model.courtyardLayout;this.presentationPoints=site?[this.roomBounds,this.courtyardBounds,...site.contextBuildings.map(b=>b.bounds),...site.roofAccesses.map(b=>b.bounds)].flatMap(boundsCorners):boundsCorners(this.presentationBounds);
  this.walkCamera=this.model.cameras?.walk||this.model.cameras?.courtyard||{eye:[-7.4,2.095,-.10],target:[-20.2,1.75,-1.6],fovDegrees:55};this.walkBounds=this.model.walkBounds||{min:[-21.55,.245,-5.95],max:[-5.7,3.8,3]};this.collisionBoxes=this.model.collisionBoxes||[{min:[-14.70,.24,-2.72],max:[-12.15,.60,-.08]},{min:[-16.85,.24,-5.32],max:[-16.25,5.2,-4.72]}];this.landmarks=this.model.landmarks||{};
  this.interiorCamera=this.model.cameras?.interior||{eye:[-2.3,2.08,1.25],target:[3.8,1.95,-.6],fovDegrees:62};this.roomFloorBounds=this.model.roomFloorBounds||{min:[-4.8,.23,-5.58],max:[9.6,.23,5.58]};this.roomWalkBounds=this.model.roomWalkBounds||this.roomFloorBounds;this.roomCollisionBoxes=this.model.roomCollisionBoxes||[];
  this.instrumentViews=Object.fromEntries(Object.entries(this.model.instrumentViews||{}).map(([key,value])=>{const bounds=this.instrumentFocusBounds(key),target=bounds.min.map((v,i)=>(v+bounds.max[i])/2);return[key,{scope:'room',...value,target,bounds,span:0}];}));
  this.focusBounds=this.focusInstrument?this.instrumentViews[this.focusInstrument]?.bounds||null:null;
  if(['workshop','overview','roomplan','top','layout','context','courtyard'].includes(this.view)){const bounds=this.framingBounds();this.goalTarget=bounds.min.map((v,i)=>(v+bounds.max[i])/2);}
  if(this.presentationFraming)this.goalTarget=this.presentationCenter(this.goalTarget,this.goalYaw,this.goalPitch,this.goalRadius);
  this.baseParts=this.model.parts;const batches=this.compileParts(this.baseParts);this.baseOpaque=batches.opaque;this.baseTransparent=batches.transparent;this.applyInstrumentDemo();this.dirty=3;
 }
 compileParts(parts){
  const batches=new Map(),transparent=[];
  for(const part of parts){
   const baseMaterial=SCENE_MATERIALS[part.material]||SCENE_MATERIALS.solid,material=part.material==='projection'&&!this.sunlight?{...baseMaterial,unlit:false}:baseMaterial,color=part.color||[.7,.6,.4,1],points=Array.from({length:4},(_,i)=>part.vertices.slice(i*3,i*3+3));
   let normal=cross(sub(points[1],points[0]),sub(points[2],points[0]));if(Math.hypot(...normal)<1e-10)normal=cross(sub(points[2],points[0]),sub(points[3],points[0]));if(Math.hypot(...normal)<1e-10)continue;const n=norm(normal),uv=part.uv||[[0,0],[1,0],[1,1],[0,1]],array=[];
   for(const i of [0,1,2,0,2,3])array.push(...points[i],...n,...uv[i]);
   const clock=!!part.group?.startsWith('instrument-waterclock'),group=/^(instrument-|experiment-)/.test(part.group||'')||part.group==='light-paths'?part.group:null,batch={array,color,material,clock,group,textureKey:material.texture,center:points[0].map((_,i)=>points.reduce((s,p)=>s+p[i],0)/4)};
   if(color[3]<.995){transparent.push(batch);continue;}const key=(group||'scene')+':'+(part.material||'solid')+':'+color.join(',');if(!batches.has(key))batches.set(key,{...batch,array:[]});batches.get(key).array.push(...array);
  }
  const opaque=[...batches.values()];for(const b of [...opaque,...transparent]){b.array=new Float32Array(b.array);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let j=0;j<b.array.length;j+=8)for(let k=0;k<3;k++){min[k]=Math.min(min[k],b.array[j+k]);max[k]=Math.max(max[k],b.array[j+k]);}b.boundCenter=min.map((v,k)=>(v+max[k])/2);b.boundRadius=Math.hypot(...max.map((v,k)=>(v-min[k])/2));}return{opaque,transparent};
 }
 applyInstrumentDemo(){
  this.demoParts=[];this.demoMeasurements=null;this.demoLandmarks={};this.opaque=this.baseOpaque;this.transparent=this.baseTransparent;
  if(!this.instrumentDemo)return;
  const demonstration=buildInstrumentExperiment(this.instrumentDemo,{...this.model,parts:this.baseParts}),replaced=new Set(demonstration.replaceGroups||[]),compiled=this.compileParts(demonstration.parts||[]);
  this.demoParts=demonstration.parts||[];this.demoMeasurements=demonstration.measurements||null;this.demoLandmarks=demonstration.landmarks||{};
  this.opaque=[...this.baseOpaque.filter(b=>!replaced.has(b.group)),...compiled.opaque];this.transparent=[...this.baseTransparent.filter(b=>!replaced.has(b.group)),...compiled.transparent];
 }
 /** Demonstrations transform pristine instrument parts; no rotation accumulates. */
 setInstrumentDemo(options={}){
  if(!options||options.kind==='none')return this.clearInstrumentDemo();
  const kind=options.kind||this.instrumentDemo?.kind;if(!['mirror','tube','astronomy','gnomon'].includes(kind))return false;
  const source={...(this.instrumentDemo?.kind===kind?this.instrumentDemo:{}),...options},number=(key,fallback,low,high)=>{const n=Number(source[key]);return clamp(Number.isFinite(n)?n:fallback,low,high);},next={kind};
  if(kind==='mirror'){const ids=this.model.instruments?.mirrors?.map(m=>m.id)||[];next.mirrorId=ids.includes(source.mirrorId)?source.mirrorId:(ids[0]||'mirror-plane');next.angle=number('angle',15,-25,25);}
  if(kind==='tube')next.tubeAngle=number('tubeAngle',22,8,36);
  if(kind==='astronomy')next.altitude=number('altitude',34.2,0,90);
  if(kind==='astronomy'||kind==='gnomon')next.sunAltitude=number('sunAltitude',60,40,80);
  if(JSON.stringify(next)===JSON.stringify(this.instrumentDemo))return false;
  this.instrumentDemo=next;this.applyInstrumentDemo();this.dirty=3;this.emit();return true;
 }
 clearInstrumentDemo(){if(!this.instrumentDemo)return false;this.instrumentDemo=null;this.applyInstrumentDemo();this.dirty=3;this.emit();return true;}
 setCutaway(value){this.cutaway=!!value;this.rebuild();this.emit();}
 setSunlight(value){this.sunlight=!!value;this.updateProjection();this.rebuild();this.emit();}
 setRays(value){this.rays=!!value;this.rebuild();this.emit();}
 setAperture(value){this.aperture=clamp(Number(value)||0,0,1);this.updateProjection();this.rebuild();this.emit();}
 setScreenDistance(value){this.screenDistance=clamp(Number(value)||0,0,1);this.updateProjection();this.rebuild();if(this.view==='screen')this.goalTarget=[...this.landmark('screen')];this.emit();}
 setClockHour(value){
  const number=Number(value);if(!Number.isFinite(number))return false;const hour=clamp(number,0,24);if(Math.abs(hour-this.clockHour)<.000001)return false;this.clockHour=hour;
  if(this.model.instruments?.clockState){
   // The clock is independent of the room, courtyard and other apparatus. Keep
   // their buffers and geometry intact while rebuilding the manual clock state.
   const clock=buildWaterClock(hour,{cutaway:this.cutaway}),compiled=this.compileParts(clock.parts);
   this.model.parts=[...this.baseParts.filter(p=>!p.group?.startsWith('instrument-waterclock')),...clock.parts];this.baseParts=this.model.parts;
   this.baseOpaque=[...this.baseOpaque.filter(b=>!b.clock),...compiled.opaque];this.baseTransparent=[...this.baseTransparent.filter(b=>!b.clock),...compiled.transparent];
   this.model.clockState=clock.clockState;this.model.instruments.clockState=clock.clockState;this.model.instruments.clock=clock.clock;
   this.model.instruments.assemblies=this.model.instruments.assemblies.map(a=>a.id==='waterclock'?clock.assembly:a);this.model.metadata.clockHour=hour;this.applyInstrumentDemo();this.dirty=3;
  }else{const target=[...this.goalTarget];this.rebuild();this.goalTarget=target;}
  this.emit();return true;
 }
 setExposure(value){this.exposure=clamp(Number(value)||0,0,1);this.dirty=3;this.emit();}
 setDetail(value){this.detail=value==='fine'?'fine':'micro';this.updateResolution(true);this.emit();}
 landmark(name){const defaults={window:[-4.84,2.72,-1.4],screen:[6.94+this.screenDistance,2.72,-1.4],bench:[2.45,1.90,2.87],lectern:[-3.2,1.94,2.75],shelves:[-.55,2.18,-5.24]};const p=this.landmarks[name]||this.landmarks[name==='window'?'aperture':name]||defaults[name];return Array.isArray(p)?p:(p?.position||p?.center||defaults[name]);}
 preset(name){
  const context={yaw:-.67,pitch:.70,span:0,radius:67,scope:'all',...this.contextView};const presets={context,workshop:{yaw:-.82,pitch:.94,span:0,radius:30,scope:'room'},interior:{yaw:-1.25,pitch:.025,span:0,radius:40,scope:'all'},walk:{yaw:1.45,pitch:.025,span:0,radius:40,scope:'all'},roomplan:{yaw:0,pitch:1.54,span:0,radius:35,scope:'room'},layout:context,courtyard:{yaw:1.00,pitch:.73,span:0,radius:35,scope:'courtyard'},pinhole:{yaw:Math.PI/2,pitch:0,span:0,radius:17.16,scope:'courtyard'},overview:{yaw:-.65,pitch:.65,span:0,radius:30,scope:'room'},top:{yaw:0,pitch:1.54,span:0,radius:48,scope:'all'},window:{yaw:1.1,pitch:.1,span:3.8,radius:6},screen:{yaw:-1.55,pitch:.02,span:3.9,radius:.80},bench:{yaw:-.65,pitch:.72,span:5.0,radius:9},lectern:{yaw:-.35,pitch:.65,span:3.5,radius:7},shelves:{yaw:.15,pitch:.12,span:4.6,radius:1.4},...this.instrumentViews};
  const key=name in presets?name:'interior',p=presets[key],kind=this.instrumentDemo?.kind;
  if(kind&&!((kind==='mirror'&&(key==='mirrors'||key.startsWith('mirror-')))||(kind==='tube'&&key==='tubes')||((kind==='astronomy'||kind==='gnomon')&&key==='astronomy'))){this.instrumentDemo=null;this.applyInstrumentDemo();}
  this.auto=false;this.view=key;this.presentationFraming=['layout','context','top'].includes(key);this.focusInstrument=this.instrumentViews[key]?key:null;this.focusBounds=p.bounds||null;this.viewScope=p.scope||'room';this.goalYaw=p.yaw;this.goalPitch=p.pitch;this.goalZoom=1;this.focusSpan=p.span;this.goalRadius=p.radius;
  if(['layout','context','courtyard','top'].includes(key)&&this.cutaway){this.cutaway=false;this.rebuild();}
  if(this.isWalking()){
   if(this.cutaway){this.cutaway=false;this.rebuild();}this.useWalkCamera();
  }else if(key==='pinhole'){
   const camera=this.opticalCamera;this.goalTarget=[...camera.target];this.goalRadius=Math.hypot(...sub(camera.eye,camera.target));this.target=[...this.goalTarget];this.yaw=this.goalYaw;this.pitch=this.goalPitch;this.radius=this.goalRadius;this.zoom=1;
  }else if(this.viewScope==='room'){
   if(!this.cutaway){this.cutaway=true;this.rebuild();}this.goalTarget=['workshop','overview','roomplan'].includes(key)?this.roomBounds.min.map((v,i)=>(v+this.roomBounds.max[i])/2):[...(p.target||this.landmark(key))];if(key==='shelves')this.goalTarget[1]+=.32;
  }else{const bounds=this.framingBounds();this.goalTarget=p.target?[...p.target]:bounds.min.map((v,i)=>(v+bounds.max[i])/2);}
  if(['workshop','overview','roomplan'].includes(key))this.goalTarget=this.roomBounds.min.map((v,i)=>(v+this.roomBounds.max[i])/2);
  if(this.presentationFraming)this.goalTarget=this.presentationCenter(this.goalTarget,this.goalYaw,this.goalPitch,this.goalRadius);
  this.dirty=3;this.emit();
 }
 isWalking(){return this.view==='walk'||this.view==='interior';}
 navigation(){return this.view==='interior'?{camera:this.interiorCamera,bounds:this.roomWalkBounds,obstacles:this.roomCollisionBoxes}:{camera:this.walkCamera,bounds:this.walkBounds,obstacles:this.collisionBoxes};}
 useWalkCamera(){const c=this.navigation().camera,d=norm(sub(c.target,c.eye));this.walkEye=[...c.eye];this.goalWalkEye=[...c.eye];this.yaw=this.goalYaw=Math.atan2(-d[0],-d[2]);this.pitch=this.goalPitch=Math.asin(-d[1]);this.target=[...c.target];this.goalTarget=[...c.target];this.zoom=this.goalZoom=1;}
 /** Move in design units at fixed eye height; forward follows the horizontal view. */
 move(forward=0,right=0){
  if(!this.isWalking())return false;forward=clamp(Number(forward)||0,-3,3);right=clamp(Number(right)||0,-3,3);const x=-Math.sin(this.goalYaw)*forward+Math.cos(this.goalYaw)*right,z=-Math.cos(this.goalYaw)*forward-Math.sin(this.goalYaw)*right,p=this.walkPosition(this.goalWalkEye,x,z);
  const moved=Math.hypot(p[0]-this.goalWalkEye[0],p[2]-this.goalWalkEye[2])>.00001;this.goalWalkEye=p;if(this.reduced)this.walkEye=[...p];this.auto=false;this.dirty=3;return moved;
 }
 walkPosition(start,x,z){
  const n=Math.max(1,Math.ceil(Math.hypot(x,z)/.12)),p=[...start],radius=.23,{camera,bounds,obstacles}=this.navigation();
  const valid=(xx,zz)=>!obstacles.some(b=>xx>b.min[0]-radius&&xx<b.max[0]+radius&&zz>b.min[2]-radius&&zz<b.max[2]+radius);
  for(let i=0;i<n;i++){const xx=clamp(p[0]+x/n,bounds.min[0]+radius,bounds.max[0]-radius);if(valid(xx,p[2]))p[0]=xx;const zz=clamp(p[2]+z/n,bounds.min[2]+radius,bounds.max[2]-radius);if(valid(p[0],zz))p[2]=zz;}
  p[1]=camera.eye[1];return p;
 }
 setZoom(value){this.goalZoom=clamp(Number(value)||1,.65,3.2);this.dirty=3;this.emit();}
 rotate(yaw,pitch){if(this.isWalking()){this.goalYaw+=yaw;this.goalPitch=clamp(this.goalPitch+pitch,-.95,.75);this.auto=false;this.dirty=3;this.emit();return;}if(this.view==='pinhole'){this.focusSpan=0;this.goalTarget=this.courtyardBounds.min.map((v,i)=>(v+this.courtyardBounds.max[i])/2);this.goalRadius=35;this.goalPitch=.48;this.frameSpan=this.fittedHeight(this.eye());}this.goalYaw+=yaw;this.goalPitch=clamp(this.goalPitch+pitch,-.12,1.54);this.auto=false;this.view='free';this.dirty=3;this.emit();}
 toggleAuto(){if(this.view==='pinhole')this.preset('courtyard');this.auto=!this.auto;this.dirty=3;this.emit();}
 reset(){this.cutaway=true;this.aperture=.35;this.sunlight=true;this.rays=true;this.screenDistance=.5;this.clockHour=6;this.instrumentDemo=null;this.demoMeasurements=null;this.exposure=.78;this.updateProjection();this.rebuild();this.preset('workshop');}
 resize(){const b=this.canvas.getBoundingClientRect();this.cssWidth=b.width;this.cssHeight=b.height;this.updateResolution(true);}
 updateResolution(force=false){const ratio=this.detail==='fine'?.82:(this.software?(this.motionResolution?.66:1.15):Math.min(devicePixelRatio||1,1.75));const area=this.cssWidth*this.cssHeight,scale=Math.min(ratio,Math.sqrt(1250000/Math.max(1,area))),w=Math.max(1,Math.floor(this.cssWidth*scale)),h=Math.max(1,Math.floor(this.cssHeight*scale));if(force||this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.dirty=3;}}
 setupInput(){const pointers=new Map();let last=null,distance=0;const hide=()=>document.getElementById('rotate-hint')?.classList.add('dismissed');
  this.canvas.addEventListener('pointerdown',e=>{this.canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);this.interacting=true;this.auto=false;hide();if(pointers.size===1)last=[e.clientX,e.clientY];else{const p=[...pointers.values()];distance=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);last=null;}this.emit();});
  this.canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size>1){const p=[...pointers.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(distance>0&&d>0)this.setZoom(this.goalZoom*d/distance);distance=d;return;}if(last)this.rotate(-(e.clientX-last[0])*.007,(e.clientY-last[1])*.006);last=[e.clientX,e.clientY];});
  const end=e=>{pointers.delete(e.pointerId);this.interacting=pointers.size>0;const p=[...pointers.values()];last=p.length===1?[...p[0]]:null;distance=p.length>1?Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]):0;};
  this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',end);this.canvas.addEventListener('lostpointercapture',end);
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.setZoom(this.goalZoom*Math.exp(-e.deltaY*.001));hide();},{passive:false});
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();const el=document.getElementById('loading');if(el){el.textContent='The 3D view paused. Refresh to restore the room.';el.classList.remove('ready');}});
 }
 eye(){if(this.isWalking())return[...this.walkEye];return[this.target[0]+this.radius*Math.sin(this.yaw)*Math.cos(this.pitch),this.target[1]+this.radius*Math.sin(this.pitch),this.target[2]+this.radius*Math.cos(this.yaw)*Math.cos(this.pitch)];}
 walkTarget(){return[this.walkEye[0]-Math.sin(this.yaw)*Math.cos(this.pitch),this.walkEye[1]-Math.sin(this.pitch),this.walkEye[2]-Math.cos(this.yaw)*Math.cos(this.pitch)];}
 framingBounds(){return this.focusBounds||(this.presentationFraming?this.presentationBounds:this.viewScope==='room'?this.roomBounds:this.viewScope==='courtyard'?this.courtyardBounds:this.studyBounds);}
 presentationCenter(target,yaw,pitch,radius){const eye=[target[0]+radius*Math.sin(yaw)*Math.cos(pitch),target[1]+radius*Math.sin(pitch),target[2]+radius*Math.cos(yaw)*Math.cos(pitch)],z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const point of this.presentationPoints){const p=sub(point,target),xx=dot(p,x),yy=dot(p,y);minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}return target.map((v,k)=>v+x[k]*(minX+maxX)/2+y[k]*(minY+maxY)/2);}
 focusTopInset(){return this.focusBounds&&this.cssWidth<700?Math.min(108,this.cssHeight*.24):0;}
 fittedHeight(eye){const inset=this.focusTopInset(),height=this.cssHeight||this.canvas.height,available=Math.max(1,height-inset),aspect=(this.cssWidth||this.canvas.width)/available;return Math.max(this.focusBounds ? .1 : 2,framedHeight(this.framingBounds(),eye,this.target,aspect,this.focusBounds?1.10:this.presentationFraming?1.035:1.08,this.presentationFraming?this.presentationPoints:null)*height/available);}
 loop(time){const dt=Math.min(.12,(time-this.lastTime)/1000||.016);this.lastTime=time;if(this.auto)this.goalYaw+=dt*.16;const k=this.reduced?1:Math.min(1,dt*8),walking=this.isWalking(),immersive=walking||this.view==='pinhole';let moving=this.auto||Math.abs(this.yaw-this.goalYaw)>.0003||Math.abs(this.pitch-this.goalPitch)>.0003||Math.abs(this.zoom-this.goalZoom)>.0003||Math.abs(this.radius-this.goalRadius)>.001||this.target.some((v,i)=>Math.abs(v-this.goalTarget[i])>.001)||(walking&&this.walkEye.some((v,i)=>Math.abs(v-this.goalWalkEye[i])>.0005));
  this.yaw=mix(this.yaw,this.goalYaw,k);this.pitch=mix(this.pitch,this.goalPitch,k);this.zoom=mix(this.zoom,this.goalZoom,k);this.radius=mix(this.radius,this.goalRadius,k);this.target=this.target.map((v,i)=>mix(v,this.goalTarget[i],k));if(walking)this.walkEye=this.walkPosition(this.walkEye,(this.goalWalkEye[0]-this.walkEye[0])*k,(this.goalWalkEye[2]-this.walkEye[2])*k);if(!immersive){const wantedSpan=this.focusSpan?Math.max(this.focusSpan,this.focusSpan/(this.canvas.width/this.canvas.height)):this.fittedHeight(this.eye());if(Math.abs(this.frameSpan-wantedSpan)>.001)moving=true;this.frameSpan=mix(this.frameSpan,wantedSpan,k);}
  const motion=moving||this.interacting;if(motion!==this.motionResolution){this.motionResolution=motion;this.updateResolution();}if(moving||this.dirty>0){this.render();this.dirty=Math.max(0,this.dirty-1);}this.frame=requestAnimationFrame(this.loop);
 }
 draw(batch){const {array,color,material}=batch,texture=this.textures[batch.textureKey],lighting=material.unlit?0:1,atmosphere=!!(this.atmosphere&&material.exterior&&!material.unlit);if(this.software){this.software.draw(array,texture,color,material.twoSided?texture:null,lighting,{...material,exposure:this.exposure,sunlight:this.sunlight,atmosphere,roomBounds:this.roomFloorBounds});return;}
  const gl=this.gl,L=this.locations;if(material.twoSided)gl.disable(gl.CULL_FACE);else gl.enable(gl.CULL_FACE);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,array,gl.DYNAMIC_DRAW);gl.vertexAttribPointer(L.aPosition,3,gl.FLOAT,false,32,0);gl.vertexAttribPointer(L.aNormal,3,gl.FLOAT,false,32,12);gl.vertexAttribPointer(L.aUV,2,gl.FLOAT,false,32,24);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform4fv(L.uTint,color);gl.uniform1f(L.uLighting,lighting);gl.uniform1f(L.uSpecular,material.strength);gl.uniform1f(L.uShine,material.power);gl.uniform1f(L.uReflect,material.reflection);gl.uniform1f(L.uGlass,material.glassy||0);gl.uniform1f(L.uExterior,material.exterior?1:0);gl.uniform1f(L.uExposure,material.exterior?1:this.exposure);gl.uniform1f(L.uSunlight,material.exterior||this.sunlight?1:0);gl.uniform1f(L.uAtmosphere,atmosphere?1:0);gl.drawArrays(gl.TRIANGLES,0,array.length/8);
 }
 skyCanvas(eye,target,fovDegrees,aspect){const direction=norm(sub(target,eye)),key=[...direction,fovDegrees,aspect].map(v=>v.toFixed(3)).join(',');if(this.skyCache?.key!==key){const cv=createSkyTexture({eye,target,fovDegrees,aspect},512,Math.max(128,Math.min(768,Math.round(512/aspect))));this.skyCache={key,canvas:cv};if(this.gl){if(this.textures.sky){this.gl.bindTexture(this.gl.TEXTURE_2D,this.textures.sky);this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,cv);}else this.textures.sky=this.texture(cv);}else this.textures.sky=cv;}return this.skyCache.canvas;}
 render(){const gl=this.gl,L=this.locations,w=this.canvas.width,h=this.canvas.height,aspect=w/h,pinhole=this.view==='pinhole',walk=this.isWalking(),immersive=pinhole||walk,eye=pinhole?this.opticalCamera.eye:this.eye(),target=pinhole?this.opticalCamera.target:walk?this.walkTarget():this.target,vh=this.frameSpan/this.zoom,camera=pinhole?this.opticalCamera:this.navigation().camera,fov=2*Math.atan(Math.tan(camera.fovDegrees*Math.PI/360)/this.zoom),sky=immersive?this.skyCanvas(eye,target,fov*180/Math.PI,aspect):null;this.atmosphere=immersive;
  const inset=vh*this.focusTopInset()/(2*Math.max(1,this.cssHeight)),projection=immersive?perspective(fov,aspect,.05,150):ortho(-vh*aspect/2,vh*aspect/2,-vh/2+inset,vh/2+inset,.05,180);this.matrix=multiply(projection,lookAt(eye,target));
  if(gl){gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(this.program);for(const n of ['aPosition','aNormal','aUV'])gl.enableVertexAttribArray(L[n]);gl.uniform1i(L.uTexture,0);gl.uniform3fv(L.uEye,eye);gl.uniform2fv(L.uRoomMin,[this.roomFloorBounds.min[0],this.roomFloorBounds.min[2]]);gl.uniform2fv(L.uRoomMax,[this.roomFloorBounds.max[0],this.roomFloorBounds.max[2]]);
   if(immersive){gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.uniformMatrix4fv(L.uMatrix,false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]));const points=[[-1,1,.99,0,0,1,0,0],[1,1,.99,0,0,1,1,0],[1,-1,.99,0,0,1,1,1],[-1,-1,.99,0,0,1,0,1]];this.skyArray||=new Float32Array([0,1,2,0,2,3].flatMap(i=>points[i]));this.draw({array:this.skyArray,color:[1,1,1,1],textureKey:'sky',material:{texture:'sky',strength:0,power:20,reflection:0,unlit:true,twoSided:true,exterior:true}});}
   gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.uniformMatrix4fv(L.uMatrix,false,this.matrix);
  }else this.software.begin(this.matrix,eye,this.white);
  // Conservative whole-batch culling keeps first-person movement responsive,
  // particularly when the full chamber lies behind the camera in Canvas mode.
  const forward=norm(sub(target,eye)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),tanV=Math.tan(fov/2),tanH=tanV*aspect,sideV=Math.sqrt(1+tanV*tanV),sideH=Math.sqrt(1+tanH*tanH);
  const visible=b=>{if(this.focusInstrument&&b.group==='light-paths')return false;if(this.viewScope!=='all'&&(this.viewScope==='courtyard')!==!!b.material.exterior)return false;if(!immersive)return true;const p=sub(b.boundCenter,eye),depth=dot(p,forward),radius=b.boundRadius;if(depth+radius<.05||depth-radius>150)return false;return Math.abs(dot(p,right))-depth*tanH<=radius*sideH&&Math.abs(dot(p,up))-depth*tanV<=radius*sideV;};
  for(const b of this.opaque)if(visible(b))this.draw(b);const direction=norm(sub(eye,target));this.transparent.sort((a,b)=>dot(a.center,direction)-dot(b.center,direction));if(gl)gl.depthMask(false);for(const b of this.transparent)if(visible(b))this.draw(b);if(gl)gl.depthMask(true);else{this.software.finish();if(immersive){const c=this.software.ctx;c.globalCompositeOperation='destination-over';c.drawImage(sky,0,0,w,h);c.globalCompositeOperation='source-over';}}
  this.frameCallback?.(this.getStationMarkers());
 }
 saveView(){const old=this.motionResolution;this.motionResolution=false;this.updateResolution(true);this.render();const cv=canvas(this.canvas.width,this.canvas.height),c=cv.getContext('2d');c.fillStyle='#141610';c.fillRect(0,0,cv.width,cv.height);c.imageSmoothingEnabled=false;c.drawImage(this.canvas,0,0);const a=document.createElement('a');a.download='al-bayt-al-muzlim-'+this.view+'.png';a.href=cv.toDataURL('image/png');a.click();this.motionResolution=old;this.updateResolution(true);}
 dispose(){this.frameCallback=null;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();if(this.gl){for(const t of Object.values(this.textures))this.gl.deleteTexture(t);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);}}
}
