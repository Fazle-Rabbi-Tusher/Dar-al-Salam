/** Bounded indoor teaching demonstrations using the apparatus' actual geometry.
 * Rays are explanatory overlays. The astronomical exercise does not observe sky
 * through the chamber roof. Clean static exports do not include these overlays.
 */
import {buildInstruments} from './instruments.js';

const PI=Math.PI,TAU=PI*2,DEG=PI/180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);},number=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
const GOLD=[1,.77,.25,.96],TEAL=[.22,.93,.84,.98],WHITE=[.86,.91,.83,.82],RED=[1,.33,.23,.96];

export const INSTRUMENT_EXPERIMENT_LIMITS={angle:[-25,25],tubeAngle:[8,36],altitude:[0,90],sunAltitude:[40,80]};
export const INSTRUMENT_EXPERIMENT_DEFAULTS={kind:'mirror',mirrorId:'mirror-plane',angle:15,tubeAngle:22,altitude:34.2,sunAltitude:60};
let fallbackModel;
function original(model){if(model?.parts&&model?.instruments)return model;if(!fallbackModel)fallbackModel=buildInstruments({clockHour:6,cutaway:true});return fallbackModel;}

function drawing(scale=1){
 const parts=[];let group='experiment-overlay';
 function q(p,color,material='ray'){
  for(let k=0;k<4;k++){if(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))>1e-11){parts.push({vertices:p.flat(),color,material,group,uv:[[0,0],[1,0],[1,1],[0,1]]});return;}p=[...p.slice(1),p[0]];}
 }
 function line(a,b,color=GOLD,r=.0042){
  if(Math.hypot(...sub(b,a))<1e-8)return;
  r*=scale;
  const axis=unit(sub(b,a)),u=mul(unit(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),r),v=mul(unit(cross(axis,u)),r);
  q([add(a,u),sub(a,u),sub(b,u),add(b,u)],color);q([add(a,v),sub(a,v),sub(b,v),add(b,v)],color);
 }
 function dashed(a,b,color=WHITE,step=.035,r=.0023){const delta=sub(b,a),L=Math.hypot(...delta),n=Math.max(1,Math.ceil(L/(step*scale)));for(let k=0;k<n;k+=2)line(add(a,mul(delta,k/n)),add(a,mul(delta,Math.min(k+1,n)/n)),color,r);}
 function arrow(a,b,color=TEAL,at=.65){
  line(a,b,color);const delta=sub(b,a),L=Math.hypot(...delta);if(L<.05*scale)return;const d=unit(delta),tip=add(a,mul(delta,at)),side=mul(unit(cross(d,Math.abs(d[1])>.9?[1,0,0]:[0,1,0])),.022*scale),back=sub(tip,mul(d,.055*scale));
  line(tip,add(back,side),color,.0038);line(tip,sub(back,side),color,.0038);
 }
 function mark(p,color=WHITE,r=.013){r*=scale;line(add(p,[-r,0,0]),add(p,[r,0,0]),color,.0028);line(add(p,[0,-r,0]),add(p,[0,r,0]),color,.0028);line(add(p,[0,0,-r]),add(p,[0,0,r]),color,.0028);}
 return{parts,q,line,dashed,arrow,mark,setGroup:g=>{group=g;}};
}

function triangles(parts){
 const out=[];
 for(const p of parts){const v=Array.from({length:4},(_,i)=>p.vertices.slice(i*3,i*3+3));for(const ids of [[0,1,2],[0,2,3]]){
  const a=v[ids[0]],b=v[ids[1]],c=v[ids[2]],e1=sub(b,a),e2=sub(c,a),n=cross(e1,e2);if(Math.hypot(...n)<1e-10)continue;
  out.push({a,b,c,e1,e2,normal:unit(n),group:p.group});
 }}return out;
}

/** Möller–Trumbore intersection against real mesh triangles, not a drawn proxy. */
export function intersectInstrumentRay(origin,direction,meshTriangles,{maxDistance=Infinity,frontOnly=false,minDistance=.000002}={}){
 const d=unit(direction);let best=null;
 for(let index=0;index<meshTriangles.length;index++){
  const t=meshTriangles[index];if(frontOnly&&dot(d,t.normal)>=-1e-9)continue;
  const p=cross(d,t.e2),det=dot(t.e1,p);if(Math.abs(det)<1e-10)continue;
  const inv=1/det,s=sub(origin,t.a),u=dot(s,p)*inv;if(u<-.00000001||u>1.00000001)continue;
  const z=cross(s,t.e1),v=dot(d,z)*inv;if(v<-.00000001||u+v>1.00000001)continue;
  const distance=dot(t.e2,z)*inv;if(distance<minDistance||distance>maxDistance||(best&&distance>=best.distance))continue;
  best={point:add(origin,mul(d,distance)),normal:[...t.normal],distance,triangleIndex:index,group:t.group};
 }return best;
}

function rotation(axis,pivot,angle){const c=Math.cos(angle),s=Math.sin(angle);return p=>{const q=sub(p,pivot),r=axis==='z'?[q[0]*c-q[1]*s,q[0]*s+q[1]*c,q[2]]:[q[0],q[1]*c-q[2]*s,q[1]*s+q[2]*c];return add(pivot,r);};}
function transformed(parts,groups,pose){return parts.filter(p=>groups.includes(p.group)).map(p=>({...p,vertices:Array.from({length:4},(_,i)=>pose(p.vertices.slice(i*3,i*3+3))).flat()}));}

function mirrorExperiment(options,model){
 const id=options.mirrorId||'mirror-plane',mirror=model.instruments.mirrors.find(m=>m.id===id)||model.instruments.mirrors[0],angle=clamp(number(options.angle,15),-25,25),frame=mirror.surface.frame;
 const u=frame.u,v=frame.v,w=frame.w,centre=frame.origin,d=unit(add(mul(u,Math.sin(angle*DEG)),mul(w,Math.cos(angle*DEG)))),mesh=triangles(model.parts.filter(p=>p.group===mirror.surfaceGroup));
 const scale=mirror.scale||mirror.surface.apertureRadius/.29,pen=drawing(scale),rays=[];
 for(const relativeOffset of [-.145,.035,.145]){
  const offset=relativeOffset*scale,aim=add(centre,mul(u,offset)),origin=sub(aim,mul(d,.64*scale));
  const first=intersectInstrumentRay(origin,d,mesh,{frontOnly:true,maxDistance:1.25*scale});
  if(!first){pen.setGroup('experiment-mirror-miss');pen.dashed(origin,add(origin,mul(d,.75*scale)),[1,.65,.25,.5]);rays.push({origin,hit:null,incoming:d,outgoing:null,offset,relativeOffset,bounces:[]});continue;}
  pen.setGroup('experiment-mirror-incident');pen.arrow(origin,first.point,GOLD,.52);
  const bounces=[];let hit=first,incoming=d,remaining=.84*scale;
  for(let bounce=0;bounce<4;bounce++){
   let n=hit.normal;if(dot(incoming,n)>0)n=mul(n,-1);
   const outgoing=unit(sub(incoming,mul(n,2*dot(incoming,n))));
   const incidenceAngle=Math.acos(clamp(-dot(incoming,n),-1,1))/DEG,reflectionAngle=Math.acos(clamp(dot(outgoing,n),-1,1))/DEG;
   bounces.push({hit:[...hit.point],normal:n,incoming:[...incoming],outgoing,incidenceAngle,reflectionAngle,lawError:Math.abs(incidenceAngle-reflectionAngle),triangleIndex:hit.triangleIndex});
   const next=intersectInstrumentRay(add(hit.point,mul(outgoing,.00002)),outgoing,mesh,{frontOnly:true,maxDistance:remaining,minDistance:.00002});
   const end=next?next.point:add(hit.point,mul(outgoing,remaining));
   pen.setGroup('experiment-mirror-reflected');pen.arrow(hit.point,end,TEAL,.64);pen.mark(hit.point,WHITE,.009);
   if(bounce===0&&relativeOffset===.035){pen.setGroup('experiment-mirror-normal');pen.dashed(sub(hit.point,mul(n,.045*scale)),add(hit.point,mul(n,.26*scale)),WHITE,.030,.0024);}
   if(!next)break;remaining-=Math.hypot(...sub(end,hit.point));if(remaining<.035*scale)break;hit=next;incoming=outgoing;
  }
  const firstBounce=bounces[0];rays.push({origin,hit:first.point,hitPoint:first.point,offset,relativeOffset,...firstBounce,bounces});
 }
 const main=rays.find(r=>r.relativeOffset===.035&&r.hit)||rays.find(r=>r.hit),hitCount=rays.filter(r=>r.hit).length;
 return{parts:pen.parts,replaceGroups:[],measurements:{kind:'mirror',mirrorId:mirror.id,angle,incidentDirection:angle,hitCount,rayCount:rays.length,incidenceAngle:main?.incidenceAngle??null,reflectionAngle:main?.reflectionAngle??null,lawError:main?.lawError??null,rays,method:'Intersections and reflection normals from the actual faceted mirror surface.'},landmarks:{experiment:centre},view:{target:[centre[0],centre[1]-.12*scale,centre[2]-.32*scale],yaw:Math.PI-.80,pitch:.28,span:1.75*scale,radius:2.25*scale}};
}

function tubeExperiment(options,model){
 const source=model.instruments.tubes.find(t=>t.id==='mounted-sighting-tube'),baseAngle=source.baseAngle??22,angle=clamp(number(options.tubeAngle,22),8,36),pivot=source.pivot||[8.74,1.72,-5.03],centre=source.center||[8.74,1.91,-5.03];
 const scale=source.scale||1,replaceGroups=[source.group,source.alidadeGroup||'instrument-tube-alidade'],pose=rotation('z',pivot,(angle-baseAngle)*DEG),parts=transformed(model.parts,replaceGroups,pose),d=unit(sub(pose(source.end),pose(source.start))),eye=pose(sub(source.start,mul(source.axis,source.eyeOffset||.125*scale)));
 const target=source.target||add(centre,mul(source.axis,(9.51-centre[0])/source.axis[0])),targetX=target[0],toTarget=unit(sub(target,eye)),distance=Math.hypot(...sub(target,eye));
 const blocker=intersectInstrumentRay(eye,toTarget,triangles(parts),{maxDistance:distance-.001}),aimDistance=(targetX-eye[0])/d[0],aimPoint=add(eye,mul(d,aimDistance)),missDistance=Math.hypot(...sub(aimPoint,target));
 const signedAngularError=(Math.atan2(toTarget[1],toTarget[0])-Math.atan2(d[1],d[0]))/DEG,angularError=Math.abs(signedAngularError),blocked=!!blocker,aligned=!blocked;
 const pen=drawing(scale),stateColor=aligned?TEAL:RED;
 pen.setGroup('experiment-tube-target');
 const x=targetX+.006*scale,y=target[1],z=target[2],h=.13*scale;
 pen.q([[x,y-h,z-h],[x,y-h,z+h],[x,y+h,z+h],[x,y+h,z-h]],[.82,.80,.66,1],'paper');
 for(let k=0;k<32;k++){const a=k/32*TAU,b=(k+1)/32*TAU;pen.line([targetX,y+.062*scale*Math.cos(a),z+.062*scale*Math.sin(a)],[targetX,y+.062*scale*Math.cos(b),z+.062*scale*Math.sin(b)],TEAL,.0023);}
 pen.line([targetX,y-.090*scale,z],[targetX,y+.090*scale,z],TEAL,.0024);pen.line([targetX,y,z-.090*scale],[targetX,y,z+.090*scale],TEAL,.0024);
 pen.setGroup('experiment-tube-axis');pen.arrow(eye,aimPoint,aligned?TEAL:GOLD,.80);pen.mark(aimPoint,stateColor,.018);
 pen.setGroup('experiment-tube-target-line');
 if(blocker){pen.arrow(eye,blocker.point,RED,.55);pen.mark(blocker.point,RED,.016);pen.dashed(blocker.point,target,[.83,.85,.75,.40],.05,.0018);}else pen.arrow(eye,target,TEAL,.77);
 return{parts:[...parts,...pen.parts],replaceGroups,measurements:{kind:'tube',tubeAngle:angle,targetAngle:baseAngle,angularError,signedAngularError,missDistance,aligned,blocked,target,aimPoint,eye,axis:d,blockPoint:blocker?.point||null,start:pose(source.start),end:pose(source.end),lenses:false,method:'The target ray is tested against the moved tube, sight aperture and alidade meshes.'},landmarks:{experiment:pose(centre),target}};
}

function astronomyExperiment(options,model,gnomonOnly=false){
 const sky=model.instruments.astronomy,scale=sky.scale||1,alidade=sky.alidade||{group:'instrument-meridian-alidade',pivot:[9.165,2.85,1.32],baseAngle:34.2,sightOrigin:[9.145,2.85,1.32]},altitude=clamp(number(options.altitude,34.2),0,90),sunAltitude=clamp(number(options.sunAltitude,60),40,80),replaceGroups=gnomonOnly?[]:[alidade.group],pose=rotation('x',alidade.pivot,(altitude-alidade.baseAngle)*DEG),parts=transformed(model.parts,replaceGroups,pose),pen=drawing(scale);
 const sightDirection=[0,Math.sin(altitude*DEG),-Math.cos(altitude*DEG)],sightOrigin=alidade.sightOrigin;
 if(!gnomonOnly){
  const lengths=alidade.sightLengths||[.61*scale,.48*scale];pen.setGroup('experiment-astronomy-sight');pen.arrow(add(sightOrigin,mul(sightDirection,-lengths[0])),add(sightOrigin,mul(sightDirection,lengths[1])),TEAL,.86);
  pen.mark(add(sightOrigin,mul(sightDirection,lengths[1])),TEAL,.017);
  const readingRadius=alidade.readingRadius||.69*scale,P=t=>[alidade.pivot[0]-.055*scale,alidade.pivot[1]-readingRadius*Math.sin(t),alidade.pivot[2]+readingRadius*Math.cos(t)],N=Math.max(1,Math.ceil(altitude/4));
  pen.setGroup('experiment-astronomy-altitude');for(let k=0;k<N;k++)pen.line(P(altitude*DEG*k/N),P(altitude*DEG*(k+1)/N),GOLD,.0033);
 }
 const base=sky.gnomon?.base||[9.18,1.509,1.84],top=sky.gnomon?.top||[9.18,1.82,1.84],gnomonHeight=top[1]-base[1],shadowPad=sky.gnomon?.shadowPad||.003*scale,shadowLength=gnomonHeight/Math.tan(sunAltitude*DEG),shadowHeightRatio=shadowLength/gnomonHeight,shadowTip=[base[0],base[1]+shadowPad,base[2]+shadowLength],lightDirection=[0,-Math.sin(sunAltitude*DEG),Math.cos(sunAltitude*DEG)];
 pen.setGroup('experiment-gnomon-shadow');
 const y=base[1]+shadowPad,r=(sky.gnomon?.radius||.009*scale)*.945,c=[.10,.13,.10,.76];
 pen.q([[base[0]-r,y,base[2]],[base[0]-r,y,shadowTip[2]],[base[0]+r,y,shadowTip[2]],[base[0]+r,y,base[2]]],c);
 for(const z of [base[2],shadowTip[2]])for(let k=0;k<16;k++){const a=k/16*TAU,b=(k+1)/16*TAU;pen.q([[base[0],y,z],[base[0]+r*Math.cos(b),y,z+r*Math.sin(b)],[base[0]+r*Math.cos(a),y,z+r*Math.sin(a)],[base[0],y,z]],c);}
 pen.setGroup('experiment-gnomon-light');pen.arrow(sub(top,mul(lightDirection,.32*scale)),top,GOLD,.52);pen.line(top,shadowTip,[1,.78,.30,.63],.0028);pen.mark(shadowTip,TEAL,.010);
 return{parts:[...parts,...pen.parts],replaceGroups,measurements:{kind:gnomonOnly?'gnomon':'astronomy',altitude,sunAltitude,shadowLength,gnomonHeight,shadowHeightRatio,shadowTip,sightDirection,sightOrigin,indoorTeachingExercise:true,method:'The alidade rotates against the fixed plumb line. The simulated gnomon shadow follows h / tan(sun altitude).'},landmarks:{experiment:model.landmarks?.astronomy||base,shadowTip}};
}

/** Call with a pristine full scene model to avoid accumulating apparatus rotations. */
export function buildInstrumentExperiment(options={},model){
 const source=original(model),kind=options.kind||'mirror';
 if(kind==='mirror')return mirrorExperiment(options,source);
 if(kind==='tube')return tubeExperiment(options,source);
 if(kind==='astronomy'||kind==='gnomon')return astronomyExperiment(options,source,kind==='gnomon');
 return{parts:[],replaceGroups:[],measurements:{kind:'none'},landmarks:{}};
}
