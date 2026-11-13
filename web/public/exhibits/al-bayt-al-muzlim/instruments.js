/** Original 3D reconstructions of optical and observational instruments.
 * The mechanism and surfaces are explanatory models, not surviving personal objects.
 */
import {buildObservationInstruments} from './observation-instruments.js';

const TAU=Math.PI*2,add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const color=(c,a=1)=>Array.isArray(c)?c:[parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255,a];
const shade=(c,s)=>color(c).map((v,i)=>i===3?v:v*s);
function boundsOf(parts){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of parts)for(let i=0;i<12;i++){min[i%3]=Math.min(min[i%3],p.vertices[i]);max[i%3]=Math.max(max[i%3],p.vertices[i]);}return{min,max};}
function scaledPoint(point,layout){return point.map((v,k)=>layout.anchor[k]+(v-layout.sourceAnchor[k])*layout.apparatusScale);}
function applyLayout(parts,layout){for(const transform of layout.transforms)for(const part of parts)if(transform.groups.includes(part.group))part.vertices=part.vertices.map((v,i)=>transform.anchor[i%3]+(v-transform.sourceAnchor[i%3])*transform.scale[i%3]);}
function kit(){
 const parts=[];let group='instrument-collection';
 const q=(p,c,m='brass',uv)=>{let t=uv||[[0,0],[1,0],[1,1],[0,1]];for(let i=0;i<4;i++){if(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))>1e-11){parts.push({vertices:p.flat(),color:color(c),material:m,group,uv:t});return;}p=[...p.slice(1),p[0]];t=[...t.slice(1),t[0]];}};
 function box(x,y,z,w,h,d,c,m='wood'){
  const X=x+w,Y=y+h,Z=z+d;
  q([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],c,m);q([[X,y,z],[x,y,z],[x,Y,z],[X,Y,z]],c,m);
  q([[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]],c,m);q([[X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z]],c,m);
  q([[x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z]],c,m);q([[x,y,Z],[x,y,z],[X,y,z],[X,y,Z]],c,m);
 }
 function tube(a,b,r,R,c,m='brass',N=24,inner=0,caps=true){
  const axis=norm(sub(b,a)),u=norm(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u),p=(o,r,t)=>add(o,add(mul(u,r*Math.cos(t)),mul(v,r*Math.sin(t))));
  for(let i=0;i<N;i++){const t=i/N*TAU,T=(i+1)/N*TAU;
   q([p(a,r,t),p(a,r,T),p(b,R,T),p(b,R,t)],c,m);
   if(inner){q([p(a,inner,T),p(a,inner,t),p(b,inner,t),p(b,inner,T)],shade(c,.65),m);if(caps){q([p(a,inner,t),p(a,inner,T),p(a,r,T),p(a,r,t)],c,m);q([p(b,inner,T),p(b,inner,t),p(b,R,t),p(b,R,T)],c,m);}}
   else if(caps){q([a,p(a,r,T),p(a,r,t),a],c,m);q([b,p(b,R,t),p(b,R,T),b],c,m);}
  }
 }
 function ring(c,r,th,c0,m='brass',N=48,axis='z'){
  const p=t=>axis==='y'?[c[0]+r*Math.cos(t),c[1],c[2]+r*Math.sin(t)]:[c[0]+r*Math.cos(t),c[1]+r*Math.sin(t),c[2]];
  for(let i=0;i<N;i++)tube(p(i/N*TAU),p((i+1)/N*TAU),th,th,c0,m,5,0,false);
 }
 return{parts,q,box,tube,ring,setGroup:g=>{group=g;}};
}

function buildMirrors(){
 const g=kit(),{q,box,tube,ring,setGroup}=g,mirrors=[],landmarks={},instrumentViews={};
 setGroup('instrument-mirror-display');
 for(const x of [-.57,1.21,3.00,4.78])for(const z of [5.035,5.325])box(x,.23,z,.10,.80,.10,'#4b3827');
 for(let i=0;i<3;i++)box(-.65,1.03,4.97+i*.17,5.60,.105,.163,i%2?'#896748':'#795b3e');
 box(-.57,.57,5.09,5.44,.08,.10,'#57412d');
 const forms=[['plane','Plane mirror','plane',0],['spherical-convex','Convex spherical mirror','sphere',-1],['spherical-concave','Concave spherical mirror','sphere',1],['cylindrical-convex','Convex cylindrical mirror','cylinder',-1],['cylindrical-concave','Concave cylindrical mirror','cylinder',1],['conical-convex','Convex conical mirror','cone',-1],['conical-concave','Concave conical mirror','cone',1]];
 for(let index=0;index<forms.length;index++){
  const[key,label,kind,sign]=forms[index],id='mirror-'+key,cx=-.25+index*.80,cy=1.92,cz=5.24,r=.29,sag=kind==='sphere'?.16:.20,R=(r*r+sag*sag)/(2*sag),surfaceGroup='instrument-'+id+'-surface',mountGroup='instrument-'+id+'-mount';
  const profile=kind==='sphere'?(rr=>sign*(Math.sqrt(Math.max(0,R*R-rr*rr))-Math.sqrt(R*R-r*r))):kind==='cone'?(rr=>sign*sag*(1-rr/r)):(()=>0);
  const point=(rr,a,back=0)=>[cx+rr*Math.cos(a),cy+rr*Math.sin(a),cz+profile(rr)+back];
  setGroup(surfaceGroup);
  if(kind==='cylinder'){
   const rad=.30,A=1.25,H=.62,p=(a,y,back=0)=>[cx+rad*Math.sin(a),cy+y,cz+sign*rad*(Math.cos(a)-Math.cos(A))+back];
   for(let j=0;j<4;j++)for(let k=0;k<32;k++){
    const a=-A+2*A*k/32,b=-A+2*A*(k+1)/32,y=-H/2+H*j/4,Y=-H/2+H*(j+1)/4;
    q([p(a,y),p(a,Y),p(b,Y),p(b,y)],[.73,.76,.73,1],'mirror');
   }
   setGroup(mountGroup);
   for(let j=0;j<4;j++)for(let k=0;k<32;k++){
    const a=-A+2*A*k/32,b=-A+2*A*(k+1)/32,y=-H/2+H*j/4,Y=-H/2+H*(j+1)/4;
    q([p(a,y,.018),p(b,y,.018),p(b,Y,.018),p(a,Y,.018)],'#5d625b','brass');
   }
   for(const y of [-H/2,H/2])for(let k=0;k<32;k++)tube(p(-A+2*A*k/32,y),p(-A+2*A*(k+1)/32,y),.010,.010,'#b8a374','brass',5,0,false);
   for(const a of [-A,A])tube(p(a,-H/2),p(a,H/2),.010,.010,'#b8a374','brass',6,0,false);
  }else{
   const rings=kind==='sphere'?8:kind==='cone'?4:1,N=48;
   for(let j=0;j<rings;j++)for(let k=0;k<N;k++){
    const a=k/N*TAU,b=(k+1)/N*TAU,lo=r*j/rings,hi=r*(j+1)/rings;
    q([point(lo,a),point(lo,b),point(hi,b),point(hi,a)],[.73,.76,.73,1],'mirror');
   }
   setGroup(mountGroup);
   for(let j=0;j<rings;j++)for(let k=0;k<N;k++){
    const a=k/N*TAU,b=(k+1)/N*TAU,lo=r*j/rings,hi=r*(j+1)/rings;
    q([point(lo,a,.018),point(hi,a,.018),point(hi,b,.018),point(lo,b,.018)],'#5d625b','brass');
   }
   for(let k=0;k<N;k++){const a=k/N*TAU,b=(k+1)/N*TAU;q([point(r,a),point(r,b),point(r,b,.018),point(r,a,.018)],'#afa179','brass');}
   ring([cx,cy,cz-.003],r+.005,.010,'#b8a374','brass',48);
  }
  box(cx-.225,1.14,5.04,.45,.065,.38,'#3f3428');box(cx-.19,1.205,5.08,.38,.035,.30,'#74583d');
  tube([cx,1.24,5.385],[cx,1.55,5.385],.025,.025,'#af9867','brass',12);
  for(const s of [-1,1]){
   tube([cx,1.51,5.385],[cx+s*.315,1.73,5.35],.018,.018,'#927d52','brass',8);
   tube([cx+s*.315,1.73,5.35],[cx+s*.315,1.92,5.26],.018,.018,'#b8a374','brass',8);
   tube([cx+s*.315,1.92,5.26],[cx+s*.28,1.92,5.26],.035,.035,'#b9a16b','brass',12);
  }
  // Small tally marks are engraved into each independent mounting foot.
  for(let k=0;k<=index;k++)q([[cx-.10+k*.032,1.155,5.039],[cx-.10+k*.032,1.192,5.039],[cx-.093+k*.032,1.192,5.039],[cx-.093+k*.032,1.155,5.039]],'#cab783','brass');
  const frame={origin:[cx,cy,cz],u:[1,0,0],v:[0,1,0],w:[0,0,1]},surface={kind,frame,concavity:sign>0?'concave':sign<0?'convex':'plane',normal:[0,0,-1],normalSense:sign>0?'inward':'outward',apertureRadius:r};
  if(kind==='sphere')Object.assign(surface,{radius:R,center:[cx,cy,cz-sign*Math.sqrt(R*R-r*r)],sag});
  if(kind==='cylinder')Object.assign(surface,{radius:.30,center:[cx,cy,cz-sign*.30*Math.cos(1.25)],axis:[0,1,0],halfAngle:1.25,height:.62});
  if(kind==='cone')Object.assign(surface,{apex:[cx,cy,cz+sign*sag],axis:[0,0,-sign],slope:r/sag,height:sag});
  if(kind==='plane')surface.origin=[cx,cy,cz];
  const entry={id,label,type:key,surfaceGroup,mountGroup,surface,bounds:boundsOf(g.parts.filter(p=>p.group===surfaceGroup||p.group===mountGroup))};mirrors.push(entry);
  landmarks[id]=[cx,1.72,cz];instrumentViews[id]={target:landmarks[id],yaw:Math.PI-.22,pitch:.16,span:1.28,radius:1.18};
 }
 const groups=[...new Set(g.parts.map(p=>p.group))],scale=1.35,sourceAnchor=[2.15,1.14,5.24],anchor=[2.15,1.14,5.16],layout={apparatusScale:scale,sourceAnchor,anchor,worktopY:1.14,transforms:[{groups:groups.filter(g=>g!=='instrument-mirror-display'),scale:[scale,scale,scale],sourceAnchor,anchor},{groups:['instrument-mirror-display'],scale:[scale,1,scale],sourceAnchor,anchor}]};
 applyLayout(g.parts,layout);
 for(const mirror of mirrors){
  const surface=mirror.surface;surface.frame.origin=scaledPoint(surface.frame.origin,layout);
  for(const key of ['origin','center','apex'])if(surface[key])surface[key]=scaledPoint(surface[key],layout);
  for(const key of ['apertureRadius','radius','sag','height'])if(Number.isFinite(surface[key]))surface[key]*=scale;
  mirror.scale=scale;mirror.layout=layout;mirror.bounds=boundsOf(g.parts.filter(p=>p.group===mirror.surfaceGroup||p.group===mirror.mountGroup));
  landmarks[mirror.id]=[...surface.frame.origin];instrumentViews[mirror.id]={target:[surface.frame.origin[0],surface.frame.origin[1]-.12*scale,surface.frame.origin[2]-.32*scale],yaw:Math.PI-.80,pitch:.28,span:2.30,radius:3.1};
 }
 const bounds=boundsOf(g.parts);landmarks.mirrors=[2.15,2.19,5.16];instrumentViews.mirrors={target:[2.15,1.55,5.16],yaw:Math.PI,pitch:.19,span:7.85,radius:3.0};
 return{parts:g.parts,mirrors,landmarks,instrumentViews,layout,assemblies:[{id:'mirrors',groups,bounds,layout,collisionName:'seven precision mirrors'}]};
}

const DIGITS={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','010','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111']};
export function buildWaterClock(hour=6,{cutaway=false}={}){
 const g=kit(),{q,box,tube,ring,setGroup}=g,H=Math.max(0,Math.min(24,Number(hour)||0)),cx=-3.95,cz=-4.68,travel=.60,cylinderY=1.16-travel*H/24,cylinderTopY=cylinderY+.72,discAngle=-TAU*H/24,waterY=1.48;
 const dialCenter=[cx,2.80,cz+.40],rDial=.48,clockState={hour:H,cylinderY,cylinderTopY,discAngle,travel,waterY,drumRadius:travel/TAU,cycleHours:24,inspectionSection:!!cutaway};
 const groups={plinth:'instrument-waterclock-plinth',tank:'instrument-waterclock-tank',water:'instrument-waterclock-water',guideFrame:'instrument-waterclock-guide-frame',cylinder:'instrument-waterclock-sinking-cylinder',cord:'instrument-waterclock-cord',pulleys:'instrument-waterclock-pulleys',dial:'instrument-waterclock-dial',pointer:'instrument-waterclock-fixed-pointer'};
 setGroup(groups.plinth);box(cx-.62,.23,cz-.62,1.24,.12,1.24,'#4b3928');box(cx-.51,.35,cz-.51,1.02,.11,1.02,'#7c6040');
 for(const x of [cx-.46,cx+.39])box(x,.46,cz-.40,.07,2.86,.08,'#5d4831');
 box(cx-.46,3.25,cz-.40,.92,.09,.08,'#80613d');
 const N=48,visible=t=>!cutaway||Math.sin(t)<=.5,at=(r,y,t)=>[cx+r*Math.cos(t),y,cz+r*Math.sin(t)];
 setGroup(groups.tank);
 for(let k=0;k<N;k++){
  const a=k/N*TAU,b=(k+1)/N*TAU;if(!visible((a+b)/2))continue;
  q([at(.415,.55,a),at(.415,.55,b),at(.46,1.70,b),at(.46,1.70,a)].reverse(),'#9e744a','brass');
  q([at(.395,.59,a),at(.435,1.68,a),at(.435,1.68,b),at(.395,.59,b)].reverse(),'#8b704b','brass');
  q([at(.46,1.70,a),at(.46,1.70,b),at(.435,1.70,b),at(.435,1.70,a)].reverse(),'#c2a171','brass');
  q([[cx,.55,cz],at(.415,.55,a),at(.415,.55,b),[cx,.55,cz]],'#987146','brass');
 }
 if(cutaway)for(const a of [Math.PI/6,5*Math.PI/6])q([at(.415,.55,a),at(.46,1.70,a),at(.435,1.70,a),at(.395,.59,a)],'#c5a776','brass');
 setGroup(groups.water);
 for(let k=0;k<N;k++){const a=k/N*TAU,b=(k+1)/N*TAU;if(!visible((a+b)/2))continue;q([[cx,waterY,cz],at(.426,waterY,b),at(.426,waterY,a),[cx,waterY,cz]],[.43,.65,.60,.34],'water');}
 setGroup(groups.guideFrame);
 for(const a of [0,Math.PI/2,Math.PI,3*Math.PI/2])tube(at(.315,.50,a),at(.315,2.01,a),.012,.012,'#b9a16b','brass',8);
 ring([cx,.59,cz],.315,.013,'#bba574','brass',40,'y');ring([cx,1.99,cz],.315,.013,'#bba574','brass',40,'y');
 setGroup(groups.cylinder);
 tube([cx,cylinderY,cz],[cx,cylinderTopY,cz],.23,.23,'#b4a078','brass',40,.214,true);
 // The lower plate has a true central perforation through which water can enter.
 tube([cx,cylinderY,cz],[cx,cylinderY+.022,cz],.214,.214,'#ad986f','brass',40,.018,true);
 for(const s of [-1,1])tube([cx+s*.18,cylinderTopY+.005,cz],[cx,cylinderTopY+.12,cz],.011,.011,'#c0aa79','brass',8);
 setGroup(groups.cord);
 const tie=[cx,cylinderTopY+.12,cz],p1=[cx,2.40,cz],p2=[cx-.285,2.55,cz],p3=[cx-travel/TAU,2.80,cz+.12];
 for(const[a,b]of[[tie,p1],[p1,p2],[p2,p3]])tube(a,b,.008,.008,'#c7b894','cloth',6,0,false);
 setGroup(groups.pulleys);
 box(cx-.42,2.35,cz-.39,.84,.08,.08,'#6d5336','wood');
 tube([cx,2.40,cz-.35],[cx,2.40,cz+.03],.013,.013,'#b7a16c','brass',12);
 tube([cx,2.40,cz-.025],[cx,2.40,cz+.025],.046,.046,'#a68b5c','brass',28);
 tube([cx-.285,2.55,cz-.025],[cx-.285,2.55,cz+.025],.065,.065,'#9d8458','brass',32);
 tube([cx,2.80,cz+.07],[cx,2.80,cz+.20],travel/TAU,travel/TAU,'#977d50','brass',40);
 tube([cx,2.80,cz-.30],[cx,2.80,cz+.44],.027,.027,'#bba371','brass',20);
 setGroup(groups.dial);
 tube([cx,2.80,dialCenter[2]-.045],dialCenter,rDial,rDial,'#bea874','brass',64);
 ring([cx,2.80,dialCenter[2]+.008],rDial*.95,.008,'#ddc58c','brass',64);
 const markers=[];
 for(let k=0;k<24;k++){
  const a=k/24*TAU+discAngle,point=(rr,side=0)=>[cx+Math.sin(a)*rr+Math.cos(a)*side,2.80+Math.cos(a)*rr-Math.sin(a)*side,dialCenter[2]+.012];
  const ri=k%6===0?.360:.395,ro=.447,w=k%6===0?.011:.006;
  q([point(ri,-w),point(ro,-w),point(ro,w),point(ri,w)],'#333a31','dark');markers.push({index:k,hour:k===0?24:k,angle:a,position:point(.42)});
  const text=String(k===0?24:k),scale=.0065,total=(text.length*4-1)*scale;
  for(let n=0;n<text.length;n++){const glyph=DIGITS[text[n]];for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyph[row][col]==='1'){
   const u=-total/2+(n*4+col)*scale,v=(2.5-row)*scale,P=(U,V)=>[cx+Math.sin(a)*.327+Math.cos(a)*U+Math.sin(a)*V,2.80+Math.cos(a)*.327-Math.sin(a)*U+Math.cos(a)*V,dialCenter[2]+.013];
   q([P(u,v),P(u,v-scale),P(u+scale*.83,v-scale),P(u+scale*.83,v)],'#343b32','dark');
  }}
 }
 setGroup(groups.pointer);
 box(cx-.027,3.255,cz+.35,.054,.16,.10,'#634d32','wood');
 q([[cx-.045,3.32,dialCenter[2]+.030],[cx+.045,3.32,dialCenter[2]+.030],[cx,3.235,dialCenter[2]+.030],[cx-.045,3.32,dialCenter[2]+.030]].reverse(),'#dfcc91','brass');
 const scale=1.18,sourceAnchor=[cx,.23,cz],anchor=[...sourceAnchor],layout={apparatusScale:scale,sourceAnchor,anchor,transforms:[{groups:Object.values(groups),scale:[scale,scale,scale],sourceAnchor,anchor}]};applyLayout(g.parts,layout);
 for(const key of ['cylinderY','cylinderTopY','waterY'])clockState[key]=.23+(clockState[key]-.23)*scale;for(const key of ['travel','drumRadius'])clockState[key]*=scale;clockState.scale=scale;
 for(const marker of markers)marker.position=scaledPoint(marker.position,layout);
 const bounds=boundsOf(g.parts),landmarks={waterclock:scaledPoint([cx,1.94,cz],layout)},instrumentViews={waterclock:{target:scaledPoint([cx,1.82,cz],layout),yaw:.03,pitch:.22,span:4.05,radius:3.9}};
 return{parts:g.parts,bounds,clockState,landmarks,instrumentViews,layout,assembly:{id:'waterclock',groups:Object.values(groups),bounds,layout,collisionName:'mechanical water clock'},clock:{id:'waterclock',label:'24-hour sinking-cylinder water clock',groups,clockState,scale,layout,dialCenter:scaledPoint(dialCenter,layout),dialBasis:{u:[1,0,0],v:[0,1,0],normal:[0,0,1]},dialRadius:rDial*scale,dialTickRadii:{majorInner:.360*scale,minorInner:.395*scale,outer:.447*scale,marker:.42*scale},markers,divisionCount:24,guideRingCount:2,guideBarCount:4,perforationRadius:.018*scale,inletPlateThickness:.022*scale,cylinderHeight:.72*scale,construction:'Copper vessel, perforated sinking cylinder, guide rings and bars, cord and pulleys; the divided disc rotates under a fixed pointer.',inspectionSection:!!cutaway}};
}

let cachedStatic;
export function buildInstruments({clockHour=6,cutaway=false}={}){
 if(!cachedStatic){const mirrors=buildMirrors(),observations=buildObservationInstruments();cachedStatic={parts:[...mirrors.parts,...observations.parts],mirrors:mirrors.mirrors,tubes:observations.tubes||[],astronomy:observations.astronomy||[],stationLayouts:{mirrors:mirrors.layout,...observations.layout},landmarks:{...mirrors.landmarks,...observations.landmarks},instrumentViews:{...mirrors.instrumentViews,...observations.instrumentViews},assemblies:[...mirrors.assemblies,...observations.assemblies]};}
 const clock=buildWaterClock(clockHour,{cutaway}),parts=[...cachedStatic.parts,...clock.parts],assemblies=[...cachedStatic.assemblies,clock.assembly];
 const instruments={mirrors:cachedStatic.mirrors,tubes:cachedStatic.tubes,astronomy:cachedStatic.astronomy,clock:clock.clock,clockState:clock.clockState,stationLayouts:{...cachedStatic.stationLayouts,waterclock:clock.layout},assemblies,description:'Interpretive apparatus models. Reflecting faces follow seven geometric forms; sighting tubes have open bores and no lenses. Astronomical apparatus includes contextual reconstructions.'};
 return{parts,bounds:boundsOf(parts),landmarks:{...cachedStatic.landmarks,...clock.landmarks},instrumentViews:{...cachedStatic.instrumentViews,...clock.instrumentViews},instruments,clockState:clock.clockState,assemblies,collisionBoxes:assemblies.map(a=>({name:a.collisionName||a.id,min:[...a.bounds.min],max:[...a.bounds.max]}))};
}
