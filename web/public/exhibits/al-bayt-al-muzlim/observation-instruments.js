/** Lensless alignment and astronomical instruments, stored in the room.
 * Treatise-inspired forms; mounts, dimensions and placement are artistic.
 */
const TAU=Math.PI*2;
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
const colors={wood:[.35,.245,.15,1],edge:[.49,.36,.21,1],copper:[.66,.41,.25,1],brass:[.70,.58,.34,1],light:[.83,.72,.46,1],dark:[.15,.18,.15,1],paper:[.75,.71,.56,1],cord:[.54,.48,.32,1]};

export function buildObservationInstruments(){
 const parts=[];let group='instrument-tube-stand';
 function q(points,c='brass',material='brass'){
  let p=points;for(let i=0;i<4;i++){if(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))>1e-11){parts.push({vertices:p.flat(),color:colors[c]||c,material,group,uv:[[0,0],[1,0],[1,1],[0,1]]});return;}p=[...p.slice(1),p[0]];}
 }
 function box(x,y,z,w,h,d,c='wood',m='wood'){
  const X=x+w,Y=y+h,Z=z+d;
  q([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],c,m);q([[X,y,z],[x,y,z],[x,Y,z],[X,Y,z]],c,m);
  q([[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]],c,m);q([[X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z]],c,m);
  q([[x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z]],c,m);q([[x,y,Z],[x,y,z],[X,y,z],[X,y,Z]],c,m);
 }
 function cylinder(a,b,r,R=r,c='brass',m='brass',N=24,inner=0,innerEnd=inner,caps=true){
  const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u);
  const p=(o,r,t)=>add(o,add(mul(u,r*Math.cos(t)),mul(v,r*Math.sin(t))));
  for(let i=0;i<N;i++){const t=i*TAU/N,T=(i+1)*TAU/N;
   q([p(a,r,t),p(a,r,T),p(b,R,T),p(b,R,t)],c,m);
   if(inner>0){q([p(a,inner,T),p(a,inner,t),p(b,innerEnd,t),p(b,innerEnd,T)],c,m);q([p(a,inner,t),p(a,inner,T),p(a,r,T),p(a,r,t)],c,m);q([p(b,innerEnd,T),p(b,innerEnd,t),p(b,R,t),p(b,R,T)],c,m);}
   else if(caps){q([a,p(a,r,T),p(a,r,t),a],c,m);q([b,p(b,R,t),p(b,R,T),b],c,m);}
  }
 }
 function rod(a,b,r=.008,c='brass',m='brass',N=6){cylinder(a,b,r,r,c,m,N,0,0,false);}
 function ring(center,r,th=.01,axis='x',c='brass',m='brass',N=48){const p=t=>axis==='y'?[center[0]+r*Math.cos(t),center[1],center[2]+r*Math.sin(t)]:[center[0],center[1]+r*Math.sin(t),center[2]+r*Math.cos(t)];for(let i=0;i<N;i++)rod(p(i*TAU/N),p((i+1)*TAU/N),th,c,m,4);}
 function bounds(groups){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of parts)if(groups.includes(p.group))p.vertices.forEach((v,i)=>{min[i%3]=Math.min(min[i%3],v);max[i%3]=Math.max(max[i%3],v);});return{min,max};}

 // Pegged timber station: full legs and rails, with space for the loose tube.
 box(8.13,1.08,-5.40,1.20,.10,.95);box(8.15,1.18,-5.38,1.16,.025,.91,'edge');
 for(const x of [8.18,9.17])for(const z of [-5.33,-4.61]){box(x,.23,z,.11,.85,.11);cylinder([x+.055,1.04,z-.008],[x+.055,1.04,z+.12],.016,.016,'brass','brass',10);}
 for(const z of [-5.27,-4.56])box(8.23,.57,z,.99,.075,.055);box(8.24,.59,-5.27,.055,.06,.75);box(9.16,.59,-5.27,.055,.06,.75);
 for(let i=0;i<4;i++)rod([8.17,1.207,-5.30+i*.20],[9.29,1.207,-5.30+i*.20],.002,'wood','wood',4);
 group='instrument-tube-support';
 cylinder([8.74,1.205,-5.03],[8.74,1.245,-5.03],.23,.23,'brass','brass',36);
 cylinder([8.74,1.24,-5.03],[8.74,1.72,-5.03],.043,.043,'brass','brass',20);
 // Pivot and angular scale under the mounted, lensless sighting rule.
 cylinder([8.74,1.72,-5.08],[8.74,1.72,-4.98],.075,.075,'light','brass',24);
 const angle=22*Math.PI/180,axis=[Math.cos(angle),Math.sin(angle),0],mainCenter=[8.74,1.91,-5.03],a=add(mainCenter,mul(axis,-.55)),b=add(mainCenter,mul(axis,.55));
 group='instrument-tube-alidade';
 const ruleA=add(a,[0,-.105,0]),ruleB=add(b,[0,-.105,0]);rod(ruleA,ruleB,.023,'brass');
 rod([8.74,1.72,-5.03],add(mainCenter,[0,-.105,0]),.028,'brass');
 // The supports meet the outside of the tube, leaving its bore unobstructed.
 const under=[Math.sin(angle),-Math.cos(angle),0];
 for(const sign of [-1,1]){const p=add(mainCenter,mul(axis,sign*.33)),foot=add(p,mul(under,.105));rod(add(p,[0,-.105,0]),foot,.019,'brass');rod(foot,add(p,mul(under,.049)),.019,'brass');}
 group='instrument-tube-support';
 for(let k=0;k<=18;k++){const t=k*Math.PI/36,r=k%3===0?.16:.17;rod([8.74+r*Math.cos(t),1.72+r*Math.sin(t),-4.965],[8.74+.19*Math.cos(t),1.72+.19*Math.sin(t),-4.965],.003,'light','brass',4);}
 group='instrument-tube-main';cylinder(a,b,.049,.049,'copper','brass',32,.037);
 const funnelEnd=add(a,mul(axis,-.11));cylinder(funnelEnd,a,.107,.049,'copper','brass',32,.092,.037);
 for(const t of [-.34,.34,.53]){const p=add(mainCenter,mul(axis,t));cylinder(add(p,mul(axis,-.018)),add(p,mul(axis,.018)),.060,.060,'light','brass',24,.038);}
 // Two small annular sight apertures keep the open line of sight legible.
 cylinder(add(b,mul(axis,-.008)),b,.049,.049,'dark','dark',28,.019);
 group='instrument-tube-loose';const looseA=[8.28,1.275,-4.68],looseB=[9.10,1.275,-4.68];cylinder(looseA,looseB,.047,.047,'copper','brass',28,.034);
 cylinder([8.22,1.275,-4.68],looseA,.080,.047,'copper','brass',28,.066,.034);
 for(const x of [8.44,8.94]){cylinder([x-.017,1.275,-4.68],[x+.017,1.275,-4.68],.057,.057,'light','brass',20,.035);group='instrument-tube-support';box(x-.065,1.205,-4.75,.13,.035,.14);group='instrument-tube-loose';}

 // East-wall storage console. The instruments are displayed here between observations.
 group='instrument-astronomy-console';box(8.93,1.35,1.25,.54,.10,1.25);box(8.92,1.45,1.24,.56,.025,1.27,'edge');
 for(const x of [8.97,9.35])for(const z of [1.31,2.34])box(x,.23,z,.075,1.12,.075);
 box(8.98,.62,1.32,.43,.07,.07);box(8.98,.62,2.35,.43,.07,.07);box(9.38,.62,1.38,.06,.07,.98);
 group='instrument-astronomy-panel';box(9.35,1.47,1.27,.075,1.51,1.20);box(9.31,2.97,1.25,.13,.075,1.25,'edge');
 // A ninety-degree quadrant, with a pivoted alidade and true dangling plumb cord.
 group='instrument-meridian-quadrant';const pivot=[9.22,2.85,1.32],r=.77,front=9.20,back=9.27;
 const arc=(t,x=front,R=r)=>[x,pivot[1]-R*Math.sin(t),pivot[2]+R*Math.cos(t)];
 for(let i=0;i<36;i++){const t=i*Math.PI/72,T=(i+1)*Math.PI/72;q([[front,pivot[1],pivot[2]],arc(T),arc(t),[front,pivot[1],pivot[2]]],'copper','brass');q([[back,pivot[1],pivot[2]],arc(t,back),arc(T,back),[back,pivot[1],pivot[2]]],'brass','brass');q([arc(t),arc(T),arc(T,back),arc(t,back)],'light','brass');}
 for(let i=0;i<=90;i++){const t=i*Math.PI/180,inner=i%10===0?r-.080:i%5===0?r-.057:r-.030;rod(arc(t,front-.006,inner),arc(t,front-.006,r-.010),.0025,'dark','dark',4);}
 for(let i=0;i<36;i++)rod(arc(i*Math.PI/72,front-.01,r+.012),arc((i+1)*Math.PI/72,front-.01,r+.012),.010,'light');
 group='instrument-meridian-alidade';rod([front-.035,pivot[1],pivot[2]],arc(Math.PI*.19,front-.035,r+.02),.016,'brass');
 group='instrument-meridian-quadrant';
 cylinder([front-.07,pivot[1],pivot[2]],[front+.02,pivot[1],pivot[2]],.045,.045,'light','brass',24);
 const sightAxis=unit([0,-Math.sin(Math.PI*.19),Math.cos(Math.PI*.19)]);
 group='instrument-meridian-alidade';
 for(const distance of [.15,.66]){const p=add([front-.055,pivot[1],pivot[2]],mul(sightAxis,distance));cylinder(add(p,mul(sightAxis,-.018)),add(p,mul(sightAxis,.018)),.035,.035,'copper','brass',20,.020);}
 group='instrument-meridian-quadrant';
 rod([front-.085,pivot[1],pivot[2]],[front-.085,1.91,pivot[2]],.0035,'cord','cloth',4);
 cylinder([front-.085,1.84,pivot[2]],[front-.085,1.92,pivot[2]],.008,.030,'brass','brass',16);
 // A planar geometric board with a vertical gnomon, packed ready for outdoor use.
 group='instrument-gnomon-board';box(8.97,1.478,1.40,.44,.028,.91,'paper','paper');
 const gc=[9.18,1.509,1.84];ring(gc,.18,.0023,'y','dark','dark',48);
 rod([8.99,1.51,1.84],[9.37,1.51,1.84],.0023,'dark','dark',4);rod([9.18,1.51,1.44],[9.18,1.51,2.25],.0023,'dark','dark',4);
 for(let i=-2;i<=2;i++)rod([9.16,1.51,1.84+i*.08],[9.20,1.51,1.84+i*.08],.002,'dark','dark',4);
 cylinder(gc,[9.18,1.82,1.84],.009,.007,'brass','brass',16);cylinder([9.18,1.51,1.84],[9.18,1.524,1.84],.035,.035,'brass','brass',20);
 // Contextual astrolabe with engraved circles, open rete spokes and suspended ring.
 group='instrument-context-astrolabe';const ac=[9.18,2.55,2.27],ar=.195;
 cylinder([9.19,ac[1],ac[2]],[9.21,ac[1],ac[2]],ar,ar,'brass','brass',48);
 ring(ac,ar,.008,'x','light');ring([9.174,ac[1],ac[2]],ar*.73,.0027,'x','dark','dark');ring([9.171,ac[1]+.027,ac[2]],ar*.48,.003,'x','light');
 for(let i=0;i<24;i++){const t=i*TAU/24,ri=i%6===0?ar*.80:ar*.88;rod([9.169,ac[1]+ri*Math.sin(t),ac[2]+ri*Math.cos(t)],[9.169,ac[1]+ar*.96*Math.sin(t),ac[2]+ar*.96*Math.cos(t)],.0018,'dark','dark',4);}
 for(let i=0;i<7;i++){const t=i*TAU/7;rod([9.159,ac[1],ac[2]],[9.159,ac[1]+ar*.74*Math.sin(t),ac[2]+ar*.74*Math.cos(t)],.004,'light','brass',4);}
 rod([9.15,ac[1]-.14,ac[2]-.045],[9.15,ac[1]+.14,ac[2]+.045],.005,'light');
 ring([9.18,ac[1]+ar+.052,ac[2]],.035,.007,'x','brass','brass',24);rod([9.18,ac[1]+ar+.086,ac[2]],[9.36,ac[1]+ar+.086,ac[2]],.012,'brass');

 const tubeGroups=['instrument-tube-stand','instrument-tube-support','instrument-tube-main','instrument-tube-alidade','instrument-tube-loose'],astroGroups=['instrument-astronomy-console','instrument-astronomy-panel','instrument-meridian-quadrant','instrument-meridian-alidade','instrument-gnomon-board','instrument-context-astrolabe'];
 const stationLayout=(scale,sourceAnchor,anchor,groups,furniture)=>({apparatusScale:scale,sourceAnchor,anchor,transforms:[{groups:groups.filter(g=>!furniture.includes(g)),scale:[scale,scale,scale],sourceAnchor,anchor},{groups:furniture,scale:[scale,1,scale],sourceAnchor,anchor}],worktopY:anchor[1]});
 const layout={tubes:stationLayout(1.45,[8.74,1.205,-5.03],[8.43,1.205,-4.75],tubeGroups,['instrument-tube-stand']),astronomy:stationLayout(1.35,[9.18,1.475,1.88],[9.00,1.475,1.88],astroGroups,['instrument-astronomy-console'])};
 const map=(p,l)=>p.map((v,k)=>l.anchor[k]+(v-l.sourceAnchor[k])*l.apparatusScale),tp=p=>map(p,layout.tubes),ap=p=>map(p,layout.astronomy),ts=layout.tubes.apparatusScale,as=layout.astronomy.apparatusScale;
 for(const l of Object.values(layout))for(const t of l.transforms)for(const part of parts)if(t.groups.includes(part.group))part.vertices=part.vertices.map((v,i)=>t.anchor[i%3]+(v-t.sourceAnchor[i%3])*t.scale[i%3]);
 const targetBase=add(mainCenter,mul(axis,(9.51-mainCenter[0])/axis[0]));
 const tubes=[{id:'mounted-sighting-tube',group:'instrument-tube-main',alidadeGroup:'instrument-tube-alidade',pivot:tp([8.74,1.72,-5.03]),center:tp(mainCenter),baseAngle:22,start:tp(a),end:tp(b),axis,length:1.10*ts,outerRadius:.049*ts,innerRadius:.037*ts,lenses:false,funnel:true,scale:ts,target:tp(targetBase),eyeOffset:.125*ts,layout:layout.tubes},{id:'loose-sighting-tube',group:'instrument-tube-loose',start:tp(looseA),end:tp(looseB),axis:[1,0,0],length:.82*ts,outerRadius:.047*ts,innerRadius:.034*ts,lenses:false,funnel:true,scale:ts}];
 return {parts,tubes,layout,astronomy:{groups:astroGroups,scale:as,layout:layout.astronomy,quadrantDegrees:90,quadrantRadius:.77*as,hasPlumbLine:true,alidade:{group:'instrument-meridian-alidade',pivot:ap([front-.035,pivot[1],pivot[2]]),baseAngle:34.2,sightOrigin:ap([front-.055,pivot[1],pivot[2]]),readingRadius:.69*as,sightLengths:[.61*as,.48*as],scale:as},gnomon:{group:'instrument-gnomon-board',axis:[0,1,0],base:ap(gc),top:ap([9.18,1.82,1.84]),height:(1.82-gc[1])*as,radius:.009*as,topRadius:.007*as,shadowPad:.003*as,scale:as},astrolabe:{group:'instrument-context-astrolabe',contextOnly:true}},
  landmarks:{tubes:tp([8.70,1.85,-4.99]),astronomy:ap([9.18,2.20,1.88])},
  instrumentViews:{tubes:{target:tp([8.70,1.85,-4.98]),yaw:-.40,pitch:.30,span:2.20,radius:1.55},astronomy:{target:ap([9.18,2.22,1.88]),yaw:-1.55,pitch:.34,span:3.00,radius:1.8}},
  assemblies:[{id:'sighting-tubes',groups:tubeGroups,bounds:bounds(tubeGroups),collisionName:'sighting tube station'},{id:'astronomy',groups:astroGroups,bounds:bounds(astroGroups),collisionName:'astronomical instrument console'}]};
}
