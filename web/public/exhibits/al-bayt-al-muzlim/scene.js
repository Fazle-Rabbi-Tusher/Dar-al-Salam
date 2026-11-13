/** Fine-faceted optical chamber with a spacious, human-scale interior.
 * Dimensions are artistic design units, not historical measurements.
 */
import {buildCourtyard} from './courtyard.js';
import {buildInstruments} from './instruments.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const C={stone:'#686b61',stoneLight:'#7d7d70',mortar:'#373d36',floor:'#717469',wood:'#704d30',woodLight:'#947048',woodDark:'#3f2e20',grain:'#b28a55',brass:'#b59a61',gold:'#d3bc80',iron:'#373d35',paper:'#dfd4b6',ink:'#252d29',cloth:'#b5b49c',green:'#315744'};
function rgba(value,alpha=1){if(Array.isArray(value))return value.length===4?value:[...value,alpha];const s=C[value]||value;return[parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255,alpha];}
function shade(c,f){const a=rgba(c);return[a[0]*f,a[1]*f,a[2]*f,a[3]];}

export function buildSanctuary(options={}){
  const cutaway=options.cutaway!==false,sunlight=options.sunlight!==false,rays=options.rays!==false;
  const aperture=clamp(Number(options.aperture??.35),0,1),screenDistance=clamp(Number(options.screenDistance??.5),0,1);
  const clockHour=clamp(Number(options.clockHour??6),0,24);
  const pin=[-4.84,2.72,-1.4],sx=6.94+screenDistance,screen=[sx,2.72,-1.4];
  const translations={
    'optical-workbench':[2.60,0,2.75],'glass-bowl':[2.60,0,2.75],'lens-stand':[2.60,0,2.75],
    'geometry-lectern':[-.10,0,1.10],'stool':[-.10,0,1.25],
    'instrument-shelves':[2.40,0,-1.86],'hanging-instruments':[2.40,0,-1.86],'arched-door':[2.40,0,-1.86],
    'storage':[4.25,0,1.70],'shutter-slides':[2.70,0,-8.10]
  };
  const placed=(group,p)=>add(p,translations[group]||[0,0,0]);
  const roomFloorBounds={min:[-4.80,.23,-5.58],max:[9.60,.23,5.58]},ceilingY=5.59;
  const parts=[];let group='architecture',transform=p=>p,seed=6021;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function q(points,color='stone',material='stone',extra={}){let uv=extra.uv||[[0,0],[1,0],[1,1],[0,1]];for(let i=0;i<4;i++){if(Math.hypot(...cross(sub(points[1],points[0]),sub(points[2],points[0])))>1e-11){parts.push({vertices:points.map(p=>placed(group,transform(p))).flat(),color:rgba(color),material,group,...extra,uv});return;}points=[...points.slice(1),points[0]];uv=[...uv.slice(1),uv[0]];}}
  function box(x,y,z,w,h,d,color='wood',material='wood'){
    const X=x+w,Y=y+h,Z=z+d,p=(a,b,c)=>[a,b,c];
    q([p(x,y,Z),p(X,y,Z),p(X,Y,Z),p(x,Y,Z)],color,material);q([p(X,y,z),p(x,y,z),p(x,Y,z),p(X,Y,z)],color,material);
    q([p(x,y,z),p(x,y,Z),p(x,Y,Z),p(x,Y,z)],color,material);q([p(X,y,Z),p(X,y,z),p(X,Y,z),p(X,Y,Z)],color,material);
    q([p(x,Y,z),p(x,Y,Z),p(X,Y,Z),p(X,Y,z)],color,material);q([p(x,y,Z),p(x,y,z),p(X,y,z),p(X,y,Z)],color,material);
  }
  function bevelBox(x,y,z,w,h,d,c='stone',m='stone',b=.025){
    const X=x+w,Y=y+h,Z=z+d,bv=Math.min(b,w/5,h/4,d/5),lo=y+bv,hi=Y-bv;
    q([[x+bv,Y,z+bv],[x+bv,Y,Z-bv],[X-bv,Y,Z-bv],[X-bv,Y,z+bv]],shade(c,1.04),m);
    if(group!=='floor')q([[x+bv,y,Z-bv],[x+bv,y,z+bv],[X-bv,y,z+bv],[X-bv,y,Z-bv]],shade(c,.86),m);
    const a=[[x,z],[X,z],[X,Z],[x,Z]],inner=[[x+bv,z+bv],[X-bv,z+bv],[X-bv,Z-bv],[x+bv,Z-bv]];
    for(let k=0;k<4;k++){const j=(k+1)%4;
      q([[a[k][0],lo,a[k][1]],[a[j][0],lo,a[j][1]],[a[j][0],hi,a[j][1]],[a[k][0],hi,a[k][1]]].reverse(),c,m);
      q([[a[k][0],hi,a[k][1]],[a[j][0],hi,a[j][1]],[inner[j][0],Y,inner[j][1]],[inner[k][0],Y,inner[k][1]]].reverse(),shade(c,.95),m);
      if(group!=='floor')q([[inner[k][0],y,inner[k][1]],[inner[j][0],y,inner[j][1]],[a[j][0],lo,a[j][1]],[a[k][0],lo,a[k][1]]].reverse(),shade(c,.87),m);
    }
  }
  function cylinder(a,b,r1,r2=r1,c='brass',m='brass',N=32,inner=0,caps=true){
    const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u);
    const p=(centre,r,t)=>add(centre,add(mul(u,Math.cos(t)*r),mul(v,Math.sin(t)*r)));
    for(let i=0;i<N;i++){const t=i/N*TAU,T=(i+1)/N*TAU;
      q([p(a,r1,t),p(a,r1,T),p(b,r2,T),p(b,r2,t)],c,m);
      if(inner>0){q([p(a,inner,T),p(a,inner,t),p(b,inner,t),p(b,inner,T)],c,m);if(caps){q([p(a,inner,t),p(a,inner,T),p(a,r1,T),p(a,r1,t)],c,m);q([p(b,inner,T),p(b,inner,t),p(b,r2,t),p(b,r2,T)],c,m);}}
      else if(caps){q([a,p(a,r1,T),p(a,r1,t),a],c,m);q([b,p(b,r2,t),p(b,r2,T),b],c,m);}
    }
  }
  function rod(a,b,r=.012,c='brass',m='brass',N=6){if(Math.hypot(...sub(a,b))>.00001)cylinder(a,b,r,r,c,m,N,0,false);}
  function circle(c,r,th=.012,col='brass',mat='brass',axis='z',N=48){const p=t=>axis==='y'?[c[0]+r*Math.cos(t),c[1],c[2]+r*Math.sin(t)]:axis==='x'?[c[0],c[1]+r*Math.sin(t),c[2]+r*Math.cos(t)]:[c[0]+r*Math.cos(t),c[1]+r*Math.sin(t),c[2]];for(let i=0;i<N;i++)rod(p(i/N*TAU),p((i+1)/N*TAU),th,col,mat,4);}
  function flatRing(c,r,th=.006,col='brass',mat='brass',axis='z',N=48){const p=(t,R)=>axis==='y'?[c[0]+R*Math.cos(t),c[1],c[2]+R*Math.sin(t)]:[c[0]+R*Math.cos(t),c[1]+R*Math.sin(t),c[2]];for(let i=0;i<N;i++){const a=i/N*TAU,b=(i+1)/N*TAU,pts=[p(a,r+th),p(b,r+th),p(b,r-th),p(a,r-th)];q(axis==='y'?pts.reverse():pts,col,mat);}}
  function ellipsoid(c,r,col=[.72,.85,.84,.22],mat='glass',N=32,M=16,from=-Math.PI/2,to=Math.PI/2){const p=(a,b)=>[c[0]+r[0]*Math.cos(a)*Math.cos(b),c[1]+r[1]*Math.sin(a),c[2]+r[2]*Math.cos(a)*Math.sin(b)];for(let j=0;j<M;j++){const a=from+(to-from)*j/M,A=from+(to-from)*(j+1)/M;for(let i=0;i<N;i++){const b=i/N*TAU,B=(i+1)/N*TAU;q([p(a,b),p(A,b),p(A,B),p(a,B)],col,mat);}}}
  function inTransform(fn,t){const old=transform;transform=p=>old(t(p));fn();transform=old;}
  function plank(x,y,z,w,h,d){bevelBox(x,y,z,w,h,d,'wood','wood',.015);for(let i=0;i<3;i++){const zz=z+d*(.15+i*.32);rod([x+.04,y+h+.002,zz],[x+w-.04,y+h+.002,zz+.008*Math.sin(i)],.002,shade('grain',.75),'wood',4);}}
  function pot(x,y,z,r=.18,h=.47,col=[.65,.79,.76,.23]){
    ellipsoid([x,y+h*.42,z],[r,h*.42,r],col,'glass',20,10,-Math.PI/2,Math.PI/3);
    cylinder([x,y+h*.65,z],[x,y+h,z],r*.35,r*.32,col,'glass',20,r*.24,false);
    cylinder([x,y+h*.96,z],[x,y+h*1.02,z],r*.39,r*.39,[.79,.86,.82,.4],'glass',20,r*.24);
    if(h>.55){const rr=r*.86,yy=y+h*.46;for(let k=0;k<24;k++){const a=k/24*TAU,b=(k+1)/24*TAU;q([[x,yy,z],[x+rr*Math.cos(b),yy,z+rr*Math.sin(b)],[x+rr*Math.cos(a),yy,z+rr*Math.sin(a)],[x,yy,z]],[.36,.61,.58,.16],'water');}}
  }
  function beaker(x,y,z,r=.16,h=.33){cylinder([x,y,z],[x,y+h,z],r,r,[.68,.82,.80,.20],'glass',20,r-.025,false);cylinder([x,y+h-.018,z],[x,y+h+.008,z],r+.012,r+.012,[.79,.89,.85,.36],'glass',20,r-.027);cylinder([x,y+.018,z],[x,y+.027,z],r-.025,r-.025,[.55,.72,.69,.16],'glass',20);}
  function scroll(x,y,z,length=.55,r=.065,axis='x'){const a=axis==='x'?[x-length/2,y,z]:[x,y,z-length/2],b=axis==='x'?[x+length/2,y,z]:[x,y,z+length/2];cylinder(a,b,r,r,'paper','paper',16,.018);}
  function ruler(x,y,z,length=1.8,width=.14){plank(x,y,z,length,.045,width);for(let i=0;i<=length/.05;i++){const xx=x+i*.05,sz=i%10===0?.105:i%5===0?.08:.042;q([[xx,y+.046,z+.012],[xx,y+.046,z+.012+sz],[xx+.005,y+.046,z+.012+sz],[xx+.005,y+.046,z+.012]],'ink','dark');}}
  function compass(x,y,z,size=.65){const joint=[x,y+.075,z-size*.46],a=[x-size*.30,y+.075,z+size*.30],b=[x+size*.30,y+.075,z+size*.30];rod(joint,a,.021,'brass');rod(joint,b,.021,'brass');rod(a,[a[0]-.025,y+.065,a[2]+.09],.008,'iron','dark');rod(b,[b[0]+.025,y+.065,b[2]+.09],.008,'iron','dark');cylinder([joint[0],joint[1]-.025,joint[2]],[joint[0],joint[1]+.025,joint[2]],.065,.065,'gold','brass',20);}

  // More individually sized floor flags preserve the original world-space detail density.
  group='floor';bevelBox(-5.36,-.30,-6.16,15.52,.40,12.32,'#363d35','stone',.045);
  box(-5.23,.10,-6.03,15.26,.055,12.06,'mortar','stone');
  for(let row=0;row<15;row++){
    const z=-5.99+row*.825,d=Math.min(.803,5.99-z);if(d<.02)continue;
    for(let col=0;col<17;col++){
      const x=-5.19+col*.94,w=Math.min(.918,9.99-x),variation=.88+random()*.22;if(w<.02)continue;
      bevelBox(x,.145+random()*.009,z,w,.085,d,shade('floor',variation),'stone',.017);
    }
  }
  for(let k=0;k<64;k++){const x=-4.7+random()*14.2,z=-5.4+random()*10.8;box(x,.235,z,.02+random()*.045,.002,.008,'#888b77','stone');}

  // The aperture wall stays fixed. The opposite wall moves +4.8 X; both side walls move 1.86 Z.
  group='walls';
  const course=.49,wallH=5.39,x0=-5.25,x1=10.05,z0=-6.04,z1=6.04;
  box(x0,.10,z0,x1-x0,.20,.46,'mortar','stone');box(x0,.10,z1-.46,x1-x0,.20,.46,'mortar','stone');
  box(x0,.10,z0,.45,.20,z1-z0,'mortar','stone');box(x1-.45,.10,z0,.45,.20,z1-z0,'mortar','stone');
  function stoneCourse(side,row){
    const yy=.24+row*course,h=course-.025,alongX=side==='back'||side==='front',axisMin=alongX?x0:z0,len=alongX?x1-x0:z1-z0;
    const bw=.94,offset=row%2?-.47:0;
    for(let col=0;col<Math.ceil(len/bw)+1;col++){
      const start=Math.max(axisMin,axisMin+offset+col*bw),end=Math.min(axisMin+len,axisMin+offset+(col+1)*bw);if(end-start<.05)continue;
      const middle=(start+end)/2;
      if(side==='left'&&cutaway&&row>0&&(middle<-2.6||middle>-.27))continue;
      if(side==='front'&&cutaway&&row>0)continue;
      const colr=shade('stone',.87+random()*.22),w=end-start-.025;
      if(side==='back')bevelBox(start,yy,z0,w,h,.46,colr,'stone',.024);
      if(side==='front')bevelBox(start,yy,z1-.46,w,h,.46,colr,'stone',.024);
      if(side==='left'){
        const endZ=start+w,top=yy+h,emit=(za,zb,ya,yb)=>{if(zb-za>.012&&yb-ya>.012)bevelBox(x0,ya,za,.45,yb-ya,zb-za,colr,'stone',.024);};
        // Retain the exact original opening around the fixed shutter and brass pinhole.
        if(yy<3.70&&top>1.83&&endZ>-2.22&&start<-.58){
          emit(start,endZ,yy,Math.min(top,1.83));emit(start,endZ,Math.max(yy,3.70),top);
          const lo=Math.max(yy,1.83),hi=Math.min(top,3.70);emit(start,Math.min(endZ,-2.22),lo,hi);emit(Math.max(start,-.58),endZ,lo,hi);
        }else emit(start,endZ,yy,top);
      }
      if(side==='right')bevelBox(x1-.45,yy,start,.45,h,w,colr,'stone',.024);
    }
  }
  // Continuous mortar cores seal every joint, including the enlarged full-height enclosure.
  box(-5.20,.24,-5.87,15.20,5.36,.055,'mortar','stone');
  box(9.82,.24,-5.96,.055,5.36,11.92,'mortar','stone');
  box(-5.20,.24,5.83,15.20,cutaway?.49:5.36,.055,'mortar','stone');
  const lz0=cutaway?-2.65:-5.96,lz1=cutaway?-.20:5.96;
  box(-5.07,.24,lz0,.055,1.59,lz1-lz0,'mortar','stone');box(-5.07,3.70,lz0,.055,1.90,lz1-lz0,'mortar','stone');
  if(-2.22>lz0)box(-5.07,1.83,lz0,.055,1.87,-2.22-lz0,'mortar','stone');if(lz1>-.58)box(-5.07,1.83,-.58,.055,1.87,lz1+.58,'mortar','stone');
  for(let row=0;row<11;row++)for(const side of ['back','left','right','front'])stoneCourse(side,row);
  if(!cutaway){
    group='roof';bevelBox(-5.30,ceilingY,-6.09,15.40,.32,12.18,'#5a6157','stone',.035);
    for(let z=-5.66;z<5.9;z+=1.9)box(-4.84,ceilingY-.15,z,14.48,.20,.18,'woodDark');
  }
  // Low capped edges reveal the wider floor in the optional dissection view.
  if(cutaway){
    bevelBox(-5.28,.72,.16,.49,.07,5.44,'#8a8976','stone',.018);
    bevelBox(-5.28,.72,-6.04,.49,.07,3.41,'#8a8976','stone',.018);
    bevelBox(-5.25,.72,5.58,15.30,.07,.47,'#8a8976','stone',.018);
  }

  // Heavy sealed pointed-arch doorway, with separate ashlar voussoirs.
  group='arched-door';const dc=.12,half=.85,spring=2.80,depth=-3.692;
  box(dc-half-.02,.23,depth-.07,half*2+.04,spring-.20,.09,'#20271f','dark');
  const archTop=x=>spring+Math.sqrt(Math.max(0,(half*2)**2-(Math.abs(x-dc)+half)**2));
  for(let k=0;k<13;k++){const x=dc-half+k*1.7/13+.008,X=x+1.7/13-.016,top=Math.min(archTop(x),archTop(X));q([[x,.25,depth+.015],[X,.25,depth+.015],[X,top,depth+.015],[x,top,depth+.015]],shade('woodDark',.92+(k%3)*.05),'wood');}
  for(const sign of [-1,1]){
    for(let row=0;row<6;row++)bevelBox(dc+sign*1.0-.145,.24+row*.425,depth-.13,.29,.41,.35,shade('stoneLight',.91+random()*.13),'stone',.023);
    const cx=dc-sign*half,r=1.70,R=1.98,a0=sign<0?Math.PI:0,a1=sign<0?2*Math.PI/3:Math.PI/3;
    for(let i=0;i<10;i++){const a=a0+(a1-a0)*(i+.04)/10,b=a0+(a1-a0)*(i+.96)/10,front=depth+.22,back=depth-.08,pts=[[cx+r*Math.cos(a),spring+r*Math.sin(a)],[cx+r*Math.cos(b),spring+r*Math.sin(b)],[cx+R*Math.cos(b),spring+R*Math.sin(b)],[cx+R*Math.cos(a),spring+R*Math.sin(a)]];
      q((sign<0?pts:[...pts].reverse()).map(p=>[p[0],p[1],front]),shade('stoneLight',.90+random()*.14),'stone');q((sign<0?[...pts].reverse():pts).map(p=>[p[0],p[1],back]),'stone','stone');for(let j=0;j<4;j++){const n=(j+1)%4;q([[pts[j][0],pts[j][1],back],[pts[n][0],pts[n][1],back],[pts[n][0],pts[n][1],front],[pts[j][0],pts[j][1],front]],'stone','stone');}
    }
  }
  for(const yy of [1.05,2.26]){bevelBox(dc-.78,yy,depth+.034,1.56,.085,.055,'iron','brass',.01);for(let i=0;i<7;i++)cylinder([dc-.68+i*.225,yy+.042,depth+.085],[dc-.68+i*.225,yy+.042,depth+.105],.022,.018,'brass','brass',10);}
  circle([dc+.45,1.65,depth+.12],.095,.018,'brass','brass','z',32);cylinder([dc+.45,1.75,depth+.03],[dc+.45,1.75,depth+.13],.032,.032,'brass','brass',16);
  bevelBox(dc-half-.24,.23,-3.79,2.18,.12,.65,'#999480','stone',.02);

  // The sealed shutter: all wood is opaque except the centre covered by the pinhole plate.
  group='aperture-window';const wy=2.72,wz=-1.4,wx=-4.87,hole=.018+aperture*.035;
  box(-5.28,1.72,-2.42,.52,.15,2.04,'stoneLight','stone');box(-5.28,3.68,-2.42,.52,.18,2.04,'stoneLight','stone');
  for(const zz of [-2.40,-.58])bevelBox(-5.20,1.85,zz,.48,1.85,.16,'stoneLight','stone',.025);
  // A continuous opaque panel behind the joints seals the entire reveal except the plated centre.
  box(-5.14,1.83,-2.22,.045,wy-.13-1.83,1.64,'woodDark');box(-5.14,wy+.13,-2.22,.045,3.70-wy-.13,1.64,'woodDark');box(-5.14,wy-.13,-2.22,.045,.26,.69,'woodDark');box(-5.14,wy-.13,wz+.13,.045,.26,.69,'woodDark');
  // Deep black lining ensures no light leaks around the boards.
  for(const zz of [-2.23,-.64])box(-5.18,1.87,zz,.39,1.78,.075,'woodDark');
  for(const yy of [1.87,3.58])box(-5.18,yy,-2.24,.39,.08,1.67,'woodDark');
  box(-5.09,1.98,-2.16,.045,wy-.13-1.98,1.52,'woodDark');box(-5.09,wy+.13,-2.16,.045,3.50-wy-.13,1.52,'woodDark');box(-5.09,wy-.13,-2.16,.045,.26,.63,'woodDark');box(-5.09,wy-.13,wz+.13,.045,.26,.63,'woodDark');
  const zy=-2.16,zw=1.52;
  for(let k=0;k<7;k++){const z=zy+k*zw/7+.006,Z=z+zw/7-.012;
    if(Z<wz-.12||z>wz+.12)plank(-5.105,1.98,z,.20,1.52,Z-z);
    else{plank(-5.105,1.98,z,.20,wy-.13-1.98,Z-z);plank(-5.105,wy+.13,z,.20,3.50-wy-.13,Z-z);}
  }
  for(const yy of [2.11,3.31]){box(-4.89,yy,-2.16,.07,.075,1.52,'iron','brass');for(let j=0;j<7;j++)cylinder([-4.82,yy+.04,-2.06+j*.22],[-4.80,yy+.04,-2.06+j*.22],.025,.022,'brass','brass',10);}
  // Square plate with a true circular opening, front/back faces and drilled inner edge.
  for(let i=0;i<48;i++){const a=i/48*TAU,b=(i+1)/48*TAU,outer=t=>.31/Math.max(Math.abs(Math.sin(t)),Math.abs(Math.cos(t))),p=(x,r,t)=>[x,wy+Math.sin(t)*r,wz+Math.cos(t)*r];
    q([p(wx,hole,a),p(wx,hole,b),p(wx,outer(b),b),p(wx,outer(a),a)],'brass','brass');
    q([p(wx-.035,hole,b),p(wx-.035,hole,a),p(wx-.035,outer(a),a),p(wx-.035,outer(b),b)],'brass','brass');
    q([p(wx-.035,hole,a),p(wx-.035,hole,b),p(wx,hole,b),p(wx,hole,a)],'gold','brass');
  }
  for(const yy of [-.25,.25])for(const zz of [-.25,.25]){cylinder([wx,wy+yy,wz+zz],[wx+.022,wy+yy,wz+zz],.023,.021,'gold','brass',12);rod([wx+.025,wy+yy-.009,wz+zz],[wx+.025,wy+yy+.009,wz+zz],.003,'woodDark','dark',4);}
  if(sunlight)cylinder([-4.925,wy,wz],[-4.92,wy,wz],hole*.95,hole*.95,[1,.86,.48,1],'flame',24);

  // Taut linen receiver, laced to its independent timber frame.
  group='projection-screen';const sy0=1.32,sy1=4.12,sz0=-2.85,sz1=.05;
  q([[sx,sy1,sz0],[sx,sy0,sz0],[sx,sy0,sz1],[sx,sy1,sz1]],[1,1,1,1],'projection',{uv:[[0,0],[0,1],[1,1],[1,0]]});
  q([[sx+.012,sy1,sz1],[sx+.012,sy0,sz1],[sx+.012,sy0,sz0],[sx+.012,sy1,sz0]],'cloth','cloth');
  for(const zz of [sz0-.15,sz1+.025])bevelBox(sx-.08,.24,zz,.16,4.02,.13,'wood','wood',.018);
  for(const yy of [sy0-.12,sy1+.025])bevelBox(sx-.08,yy,sz0-.15,.16,.13,3.18,'wood','wood',.018);
  for(let i=0;i<12;i++){const z=sz0+.10+i*(sz1-sz0-.20)/11;rod([sx-.006,sy1,z],[sx-.03,sy1+.04,z],.006,'paper','cloth',4);rod([sx-.006,sy0,z],[sx-.03,sy0-.04,z],.006,'paper','cloth',4);}
  for(let i=0;i<10;i++){const y=sy0+.12+i*(sy1-sy0-.24)/9;rod([sx-.006,y,sz0],[sx-.03,y,sz0-.055],.006,'paper','cloth',4);rod([sx-.006,y,sz1],[sx-.03,y,sz1+.055],.006,'paper','cloth',4);}
  for(const zz of [sz0-.07,sz1+.09]){bevelBox(sx-.46,.23,zz-.20,.92,.13,.40,'woodDark','wood',.018);rod([sx,.4,zz],[sx-.30,1.12,zz],.038,'wood');}

  // Long, grooved optical bench: frame, pegged mortises and individually grained boards.
  group='optical-workbench';const bx=-2.34,bz=-.70,bw=4.38,bd=1.66,by=1.51;
  for(const x of [bx+.18,bx+bw-.33])for(const z of [bz+.13,bz+bd-.28]){bevelBox(x,.23,z,.18,1.23,.18,'woodDark','wood',.012);cylinder([x+.09,1.37,z-.01],[x+.09,1.37,z+.19],.027,.027,'woodLight','wood',12);}
  for(const z of [bz+.15,bz+bd-.20])box(bx+.18,.67,z,bw-.35,.12,.12,'woodDark');for(const x of [bx+.2,bx+bw-.37])box(x,.67,bz+.16,.12,.12,bd-.32,'woodDark');
  for(const z of [bz+.06,bz+bd-.13])box(bx+.04,1.22,z,bw-.08,.23,.09,'wood');for(const x of [bx+.04,bx+bw-.16])box(x,1.22,bz,.10,.23,bd,'wood');
  for(let j=0;j<5;j++)plank(bx,1.43,bz+j*bd/5,bw,.13,bd/5-.008);
  for(const z of [-.38,.28]){box(bx+.13,by+.051,z,bw-.26,.012,.042,'#302a1e','dark');for(const zz of [z-.013,z+.042])box(bx+.13,by+.061,zz,bw-.26,.008,.014,'woodLight');}
  for(let i=0;i<32;i++)box(bx+.17+i*.128,by+.062,bz+bd-.16,.006,.004,i%4===0?.09:.045,'ink','dark');
  ruler(bx+.30,by+.07,bz+bd-.37,3.50,.18);

  // Broad thin-walled glass bowl, a water meniscus and its turned timber cradle.
  group='glass-bowl';const bc=[-.97,2.02,-.15],br=.48;
  bevelBox(-1.47,1.575,-.65,1.0,.08,1.0,'woodDark','wood',.02);
  for(const angle of [0,TAU/3,TAU*2/3])rod([bc[0]+Math.cos(angle)*.31,1.66,bc[2]+Math.sin(angle)*.31],[bc[0]+Math.cos(angle)*.36,1.88,bc[2]+Math.sin(angle)*.36],.018,'brass');
  circle([bc[0],1.87,bc[2]],.36,.019,'brass','brass','y',40);
  ellipsoid(bc,[br,br,br],[.65,.81,.77,.20],'glass',40,12,-Math.PI/2,.02);ellipsoid([bc[0],bc[1]+.008,bc[2]],[br-.025,br-.027,br-.025],[.74,.86,.81,.12],'glass',40,12,-Math.PI/2,.015);
  circle([bc[0],bc[1]+.009,bc[2]],br-.012,.012,[.82,.91,.85,.42],'glass','y',56);
  const waterY=bc[1]-.14,waterR=Math.sqrt(br*br-.14*.14)-.028;
  cylinder([bc[0],waterY,bc[2]],[bc[0],waterY+.006,bc[2]],waterR,waterR,[.43,.68,.65,.18],'water',48);flatRing([bc[0],waterY+.005,bc[2]],waterR,.005,[.62,.80,.74,.30],'water','y',48);

  // Curved lens on a brass stand, with a graduated angular arc.
  group='lens-stand';const lc=[.72,2.27,-.05];
  bevelBox(.24,1.575,-.52,.96,.09,.94,'woodDark','wood',.02);rod([.72,1.66,-.05],[.72,1.88,-.05],.034,'brass');
  circle(lc,.43,.022,'brass','brass','z',56);
  ellipsoid(lc,[.393,.393,.075],[.63,.79,.76,.22],'glass',40,20);
  for(const sign of [-1,1])rod([lc[0]+sign*.39,2.10,-.05],[lc[0]+sign*.32,1.67,-.05],.014,'brass');
  for(let i=0;i<36;i++){const a=(i/35*Math.PI*.94)+Math.PI*.03,r=.455;rod([lc[0]+r*Math.cos(a),lc[1]+r*Math.sin(a),-.051],[lc[0]+(r+(i%5===0?.07:.037))*Math.cos(a),lc[1]+(r+(i%5===0?.07:.037))*Math.sin(a),-.051],.004,'gold','brass',4);}
  // A loose glass segment and calibrated scale beside the mounted lens.
  ellipsoid([1.52,1.65,.43],[.27,.075,.20],[.66,.83,.77,.27],'glass',28,12);
  ruler(-1.75,1.575,.38,1.48,.12);compass(.03,1.58,.48,.47);
  cylinder([1.49,1.58,-.38],[1.49,1.63,-.38],.27,.27,'brass','brass',48);
  for(let i=0;i<48;i++){const a=i/48*TAU,rr=i%6===0?.20:.23;rod([1.49+rr*Math.cos(a),1.633,-.38+rr*Math.sin(a)],[1.49+.256*Math.cos(a),1.633,-.38+.256*Math.sin(a)],.003,'ink','dark',4);}

  // Angled mathematical lectern and its fine inked constructions.
  group='geometry-lectern';const centre=[-3.10,1.94,1.65],angle=.39,ct=Math.cos(angle),st=Math.sin(angle),tilt=p=>[centre[0]+p[0],centre[1]+p[1]*ct-p[2]*st,centre[2]+p[1]*st+p[2]*ct];
  bevelBox(-3.24,.25,1.52,.24,1.48,.24,'woodDark','wood',.018);bevelBox(-3.75,.23,1.10,1.30,.13,1.08,'woodDark','wood',.025);
  rod([-3.14,1.05,1.64],[-3.14,1.92,1.21],.056,'wood');
  inTransform(()=>{plank(-.88,0,-.66,1.76,.09,1.32);box(-.89,.08,.62,1.78,.13,.075,'woodDark');
    bevelBox(-.72,.10,-.53,1.44,.035,1.02,'paper','paper',.005);
    for(const v of [[[-.56,.139,-.39],[.56,.139,.35]],[[-.56,.139,.35],[.56,.139,-.39]],[[-.56,.139,-.02],[.56,.139,-.02]],[[0,.139,-.42],[0,.139,.38]]])rod(v[0],v[1],.0035,'ink','dark',4);
    flatRing([0,.140,-.02],.34,.0035,'ink','dark','y',64);flatRing([0,.141,-.02],.18,.003,'ink','dark','y',48);
    for(const [x,z] of [[-.5,-.37],[.5,.33],[-.5,.33],[.5,-.37],[0,-.02]])cylinder([x,.143,z],[x,.18,z],.014,.011,'#aa6046','solid',10);
    ruler(-.66,.145,.42,1.22,.10);compass(.33,.15,-.04,.45);
  },tilt);
  // Side ledge keeps the ink vessels level.
  plank(-4.10,1.44,1.22,.68,.08,.66);for(const x of [-3.98,-3.69]){cylinder([x,1.52,1.53],[x,1.70,1.53],.09,.074,'#333f36','stone',24,.042);cylinder([x,1.67,1.53],[x,1.68,1.53],.039,.039,'#121a17','dark',20);}
  rod([-3.98,1.68,1.53],[-3.85,2.10,1.65],.011,'woodLight','wood');scroll(-3.71,1.79,1.36,.43,.05);
  // Low stool with a polished concave-looking seat.
  group='stool';for(const a of [0,TAU/3,TAU*2/3])rod([-2.63+Math.cos(a)*.25,.24,2.75+Math.sin(a)*.25],[-2.63+Math.cos(a)*.20,.74,2.75+Math.sin(a)*.20],.048,'woodDark','wood',8);cylinder([-2.63,.73,2.75],[-2.63,.83,2.75],.38,.37,'wood','wood',40);

  // Built-in shelving is filled with vessels and rolled working papers.
  group='instrument-shelves';
  function shelving(x,width){for(const xx of [x,x+width-.10])bevelBox(xx,.30,-3.70,.10,3.24,.13,'woodDark','wood',.012);for(const yy of [.92,1.84,2.76]){plank(x-.04,yy,-3.72,width+.08,.10,.66);for(const xx of [x+.15,x+width-.20])rod([xx,yy-.32,-3.67],[xx,yy,-3.16],.025,'woodDark','wood');}}
  shelving(-4.33,2.90);shelving(1.64,2.85);
  for(const [x,y,z,r,h] of [[-4.01,1.03,-3.38,.15,.52],[-3.50,1.03,-3.38,.21,.65],[-2.90,1.03,-3.38,.14,.48],[-2.38,1.03,-3.38,.18,.61],[-3.94,1.95,-3.38,.16,.54],[-2.26,1.95,-3.38,.23,.65],[1.99,1.03,-3.38,.20,.64],[2.61,1.03,-3.38,.16,.51],[3.21,1.03,-3.38,.22,.65],[3.91,1.03,-3.38,.16,.46]])pot(x,y,z,r,h);
  for(const [x,y] of [[-3.30,1.95],[-2.89,1.95],[1.98,1.95],[2.40,1.95],[2.83,1.95],[3.24,1.95]])beaker(x,y,-3.37,.14,.37+(Math.round(x*100)%3)*.04);
  for(const [x,y,z] of [[-4.01,2.93,-3.37],[-3.38,2.93,-3.37],[-2.74,2.93,-3.37],[-2.10,2.93,-3.37],[2.02,2.93,-3.37],[2.68,2.93,-3.37],[3.32,2.93,-3.37],[3.98,2.93,-3.37],[3.82,2.02,-3.39]])scroll(x,y,z,.50,.065);
  for(const [x,y,z] of [[-3.70,3.05,-3.37],[-2.42,3.05,-3.37],[2.35,3.05,-3.37],[3.67,3.05,-3.37]])scroll(x,y,z,.50,.065);
  // A few flat parchment packets tied with narrow cords.
  for(let i=0;i<3;i++){box(3.57,1.95+i*.028,-3.64,.60,.025,.41,'paper','paper');}rod([3.83,2.04,-3.66],[3.83,2.04,-3.18],.007,'woodDark','cloth');

  // Hanging astrolabe-like furnishings are decorative reconstructions, not claimed possessions.
  group='hanging-instruments';
  function astrolabe(cx,cy,cz,r){cylinder([cx,cy,cz-.025],[cx,cy,cz],r,r,'#786441','brass',64);flatRing([cx,cy,cz+.013],r*.94,.011,'gold','brass','z',64);flatRing([cx,cy,cz+.017],r*.71,.007,'brass','brass','z',48);flatRing([cx,cy,cz+.018],r*.39,.006,'gold','brass','z',40);
    for(let i=0;i<60;i++){const a=i/60*TAU,R=r*(i%5===0?.80:.87);const dx=Math.sin(a)*.0035,dy=-Math.cos(a)*.0035,p=[cx+R*Math.cos(a),cy+R*Math.sin(a),cz+.023],P=[cx+r*.925*Math.cos(a),cy+r*.925*Math.sin(a),cz+.023];q([[p[0]+dx,p[1]+dy,p[2]],[P[0]+dx,P[1]+dy,P[2]],[P[0]-dx,P[1]-dy,P[2]],[p[0]-dx,p[1]-dy,p[2]]],'gold','brass');}
    for(let i=0;i<7;i++){const a=i/7*TAU,b=(i+3)/7*TAU;rod([cx+r*.61*Math.cos(a),cy+r*.61*Math.sin(a),cz+.032],[cx+r*.61*Math.cos(b),cy+r*.61*Math.sin(b),cz+.032],.006,'brass','brass',4);}
    rod([cx-r*.78,cy-r*.31,cz+.06],[cx+r*.78,cy+r*.31,cz+.06],.013,'gold','brass',6);cylinder([cx,cy,cz+.02],[cx,cy,cz+.08],.031,.031,'gold','brass',16);circle([cx,cy+r+.105,cz],.082,.012,'brass','brass','z',28);rod([cx,cy+r+.19,cz],[cx,cy+r+.35,cz-.025],.010,'woodDark','cloth');}
  astrolabe(-3.22,3.88,-3.64,.35);astrolabe(3.01,3.89,-3.64,.40);

  // Quiet storage: water flask and closed working codex in the front-right corner.
  group='storage';bevelBox(2.45,.23,2.05,1.40,.60,.93,'woodDark','wood',.025);plank(2.40,.83,2.00,1.50,.11,1.03);for(const x of [2.64,3.53])box(x,.25,2.985,.06,.65,.03,'iron','brass');
  pot(3.43,.96,2.38,.22,.69,[.61,.74,.62,.27]);
  bevelBox(2.57,.95,2.18,.48,.075,.62,'green','cloth',.012);box(2.59,1.025,2.20,.44,.12,.58,'paper','paper');bevelBox(2.57,1.145,2.18,.48,.035,.62,'green','cloth',.008);
  // Stacked thin wood tray and unused opaque shutter slides.
  group='shutter-slides';for(let i=0;i<3;i++)plank(-4.52,.24+i*.09,2.65,.92,.075,.52);

  // Rays terminate at the actual displayed image rectangle on the translated screen.
  const imageExtent=.74+.24*screenDistance;
  const imageY0=2.72-(sy1-sy0)*imageExtent/2,imageY1=2.72+(sy1-sy0)*imageExtent/2;
  const imageZ0=-1.4-(sz1-sz0)*imageExtent/2,imageZ1=-1.4+(sz1-sz0)*imageExtent/2;
  if(sunlight&&rays){
    group='light-paths';
    const points=[[sx-.018,imageY1,imageZ0],[sx-.018,imageY0,imageZ1],[sx-.018,imageY1,imageZ1],[sx-.018,imageY0,imageZ0]];
    for(const point of points)rod(pin,point,.004,[.94,.79,.42,.32],'ray',4);
    const ca=[sx-.023,imageY1,imageZ0],cb=[sx-.023,imageY0,imageZ0],cc=[sx-.023,imageY0,imageZ1],cd=[sx-.023,imageY1,imageZ1];
    q([pin,ca,cb,pin],[.94,.82,.53,.014],'ray');q([pin,cb,cc,pin],[.94,.82,.53,.012],'ray');q([pin,cc,cd,pin],[.94,.82,.53,.014],'ray');q([pin,cd,ca,pin],[.94,.82,.53,.012],'ray');
    for(let i=0;i<46;i++){
      const t=.13+random()*.82,x=pin[0]+(sx-pin[0])*t,y=pin[1]+(random()-.5)*(imageY1-imageY0)*t,z=pin[2]+(random()-.5)*(imageZ1-imageZ0)*t,s=.005+random()*.006;
      q([[x,y-s,z-s],[x,y+s,z-s],[x,y+s,z+s],[x,y-s,z+s]],[.93,.84,.64,.16+random()*.14],'ray');
    }
  }
  const collection=options.instruments===false?null:buildInstruments({clockHour,cutaway});
  if(collection)parts.push(...collection.parts);
  // Navigation obstacles use the actual translated station meshes, not scaled stand-ins.
  function boundsFor(groups,select=()=>true){
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const p of parts)if(groups.includes(p.group)&&select(p))for(let i=0;i<p.vertices.length;i++){const k=i%3;min[k]=Math.min(min[k],p.vertices[i]);max[k]=Math.max(max[k],p.vertices[i]);}
    return{min,max};
  }
  const roomCollisionBoxes=[
    {name:'optical workbench',...boundsFor(['optical-workbench','glass-bowl','lens-stand'])},
    {name:'drafting lectern',...boundsFor(['geometry-lectern'])},
    {name:'stool',...boundsFor(['stool'])},
    {name:'left instrument shelves',...boundsFor(['instrument-shelves','hanging-instruments'],p=>p.vertices.filter((v,i)=>i%3===0).reduce((a,b)=>a+b,0)/4<2.4)},
    {name:'right instrument shelves',...boundsFor(['instrument-shelves','hanging-instruments'],p=>p.vertices.filter((v,i)=>i%3===0).reduce((a,b)=>a+b,0)/4>2.4)},
    {name:'book and water storage',...boundsFor(['storage'])},
    {name:'shutter slides under shelving',...boundsFor(['shutter-slides'])},
    {name:'closed doorway',...boundsFor(['arched-door'])},
    {name:'screen adjustment envelope',min:[6.48,.23,-3.12],max:[8.40,4.26,.34]},
    ...(collection?.collisionBoxes||[])
  ];
  const roomWalkBounds={min:[...roomFloorBounds.min],max:[9.60,ceilingY,5.58]};
  const interiorCamera={eye:[-2.3,2.08,1.25],target:[3.8,1.95,-.6],fovDegrees:62};
  const roomLayout={
    originalClearFloor:{min:[-4.8,.23,-3.72],max:[4.8,.23,3.72]},clearFloor:roomFloorBounds,ceilingY,
    originalFloorArea:9.60*7.44,floorArea:14.40*11.16,floorExpansion:[1.5,1.5],
    translations:{...translations,'projection-screen':[3.69,0,0],'aperture-window':[0,0,0]},
    projectionAxis:{aperture:[...pin],screen:[...screen],screenTravelX:[6.94,7.94],distance:sx-pin[0],imageExtent,imageBounds:{min:[sx,imageY0,imageZ0],max:[sx,imageY1,imageZ1]}},
    circulation:'The optical cone and broad central aisle are unobstructed; the bench has access along both long sides. Scene units are an artistic convention.'
  };
  const roomMin=[Infinity,Infinity,Infinity],roomMax=[-Infinity,-Infinity,-Infinity];for(const p of parts)for(let i=0;i<p.vertices.length;i++){const k=i%3;roomMin[k]=Math.min(roomMin[k],p.vertices[i]);roomMax[k]=Math.max(roomMax[k],p.vertices[i]);}
  const courtyard=options.courtyard===false?null:buildCourtyard();
  if(courtyard)parts.push(...courtyard.parts);
  const min=[...roomMin],max=[...roomMax];if(courtyard)for(let k=0;k<3;k++){min[k]=Math.min(min[k],courtyard.bounds.min[k]);max[k]=Math.max(max[k],courtyard.bounds.max[k]);}
  const architectureBounds=courtyard?.architectureBounds?{min:roomMin.map((v,i)=>Math.min(v,courtyard.architectureBounds.min[i])),max:roomMax.map((v,i)=>Math.max(v,courtyard.architectureBounds.max[i]))}:{min:roomMin,max:roomMax};
  return{
    parts,bounds:{min,max},roomBounds:{min:roomMin,max:roomMax},roomFloorBounds,roomWalkBounds,roomCollisionBoxes,roomLayout,
    instruments:collection?.instruments||null,instrumentViews:collection?.instrumentViews||{},clockState:collection?.clockState||null,
    courtyardBounds:courtyard?.bounds||null,courtyardFocusBounds:courtyard?.focusBounds||null,focusBounds:courtyard?.focusBounds||null,architectureBounds,siteBounds:courtyard?.siteBounds||null,courtyardLayout:courtyard?.layout||null,presentationBounds:courtyard?.presentationBounds||null,contextView:courtyard?.contextView||null,
    walkBounds:courtyard?.walkBounds||null,collisionBoxes:courtyard?.collisionBoxes||[],cameras:{...(courtyard?.cameras||{}),interior:interiorCamera},opticalCamera:courtyard?.opticalCamera||null,
    landmarks:{
      aperture:pin,window:pin,screen,bench:placed('optical-workbench',[-.15,1.90,.12]),lectern:placed('geometry-lectern',centre),
      shelves:placed('instrument-shelves',[-2.95,2.18,-3.38]),shelvesRight:placed('instrument-shelves',[3.05,2.18,-3.38]),
      door:placed('arched-door',[dc,2.25,depth]),bowl:placed('glass-bowl',bc),lens:placed('lens-stand',lc),
      storage:placed('storage',[3.15,1.1,2.5]),stool:placed('stool',[-2.63,.80,2.75]),
      screenSize:[2.9,2.8],screenBounds:{min:[sx,sy0,sz0],max:[sx,sy1,sz1]},projectedImageBounds:roomLayout.projectionAxis.imageBounds,
      ...(courtyard?.landmarks||{}),...(collection?.landmarks||{})
    },
    metadata:{title:'Al-Bayt al-Muẓlim · an interpretive optical chamber',cutaway,aperture,screenDistance,sunlight,rays,courtyard:!!courtyard,clockHour,instruments:!!collection,dimensions:'Design units, not historical measurements',projection:'Screen plane faces -X. UV top-left is high Y, low Z. The aperture and courtyard remain fixed; ray endpoints track the displayed image rectangle.'}
  };
}
