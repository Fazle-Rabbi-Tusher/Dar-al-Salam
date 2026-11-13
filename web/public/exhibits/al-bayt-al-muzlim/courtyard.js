/** An inhabited courtyard compound aligned with the dark chamber's aperture.
 * Roofed masonry, recessed openings and continuous ground form the object field
 * used by both the exterior view and the image on the receiving screen.
 * Dimensions and architecture are an artistic reconstruction, in design units.
 */
const TAU=Math.PI*2;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const colour=(hex,a=1)=>Array.isArray(hex)?hex:[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255,a];
const shade=(hex,f)=>colour(hex).map((v,i)=>i===3?v:Math.min(1,v*f));
export const COURTYARD_OPTICAL_CAMERA={eye:[-4.84,2.72,-1.4],target:[-26.25,2.72,-1.4],fovDegrees:48,aspect:1};

export function buildCourtyard(){
 const parts=[];let group='site-ground',seed=7291;
 const roofShadows=[];
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function q(p,c,m='courtyardStone',uv){
  let tex=uv||[[0,0],[1,0],[1,1],[0,1]];
  for(let k=0;k<4;k++){
   if(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))>1e-10){parts.push({vertices:p.flat(),color:colour(c),material:m,group,uv:tex});return;}
   p=[...p.slice(1),p[0]];tex=[...tex.slice(1),tex[0]];
  }
 }
 function box(x,y,z,w,h,d,c,m='courtyardStone'){
  const X=x+w,Y=y+h,Z=z+d;
  q([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],c,m);q([[X,y,z],[x,y,z],[x,Y,z],[X,Y,z]],c,m);
  q([[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]],c,m);q([[X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z]],c,m);
  q([[x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z]],c,m);q([[x,y,Z],[x,y,z],[X,y,z],[X,y,Z]],c,m);
 }
 function slab(x,y,z,w,h,d,c,m='courtyardStone',b=.02){
  const X=x+w,Y=y+h,Z=z+d,B=Math.min(b,w/5,h/3,d/5);
  q([[x+B,Y,z+B],[x+B,Y,Z-B],[X-B,Y,Z-B],[X-B,Y,z+B]],shade(c,1.03),m);
  const a=[[x,z],[X,z],[X,Z],[x,Z]],inner=[[x+B,z+B],[X-B,z+B],[X-B,Z-B],[x+B,Z-B]];
  for(let k=0;k<4;k++){const j=(k+1)%4;
   if(group!=='courtyard-paving'&&group!=='site-street')q([[a[j][0],y,a[j][1]],[a[k][0],y,a[k][1]],[a[k][0],Y-B,a[k][1]],[a[j][0],Y-B,a[j][1]]],c,m);
   q([[a[j][0],Y-B,a[j][1]],[a[k][0],Y-B,a[k][1]],[inner[k][0],Y,inner[k][1]],[inner[j][0],Y,inner[j][1]]],shade(c,.96),m);
  }
 }
 function tube(a,b,r0,r1,c,m='courtyardWood',segments=10,caps=false){
  const axis=norm(sub(b,a)),u=norm(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u);
  const at=(p,r,t)=>add(p,add(mul(u,Math.cos(t)*r),mul(v,Math.sin(t)*r)));
  for(let k=0;k<segments;k++){const t=k/segments*TAU,T=(k+1)/segments*TAU;
   q([at(a,r0,t),at(a,r0,T),at(b,r1,T),at(b,r1,t)],c,m);
   if(caps){q([a,at(a,r0,T),at(a,r0,t),a],c,m);q([b,at(b,r1,t),at(b,r1,T),b],c,m);}
  }
 }
 // Closed pointed silhouette in local u/y, then map onto an arbitrary wall plane.
 function archFace(map,u,y,w,h,c,m='courtyardDark',reverse=false){
  const spring=y+h*.64,centre=u+w/2;
  const face=p=>q(reverse?p.reverse():p,c,m);
  face([map(u,y),map(u+w,y),map(u+w,spring),map(u,spring)]);
  for(let k=0;k<24;k++){
   const a=u+w*k/24,b=u+w*(k+1)/24;
   const top=t=>spring+(h*.36)*Math.sqrt(Math.max(0,1-(Math.abs(t-centre)/(w/2))**1.35));
   face([map(a,spring),map(b,spring),map(b,top(b)),map(a,top(a))]);
  }
 }
 function archTrim(map,u,y,w,h,c,m='courtyardStone',th=.10,reverse=false){
  const spring=y+h*.64,centre=u+w/2,top=t=>spring+(h*.36)*Math.sqrt(Math.max(0,1-(Math.abs(t-centre)/(w/2))**1.35));
  const face=(p,col)=>q(reverse?p.reverse():p,col,m);
  for(const sign of [-1,1]){const U=sign<0?u-th:u+w;for(let j=0;j<6;j++){const Y=y+j*(spring-y)/6;face([map(U,Y),map(U+th,Y),map(U+th,Y+(spring-y)/6-.012),map(U,Y+(spring-y)/6-.012)],shade(c,.94+(j%3)*.04));}}
  for(let j=0;j<24;j++){const a=u+w*j/24,b=u+w*(j+1)/24,ya=top(a),yb=top(b);face([map(a,ya),map(b,yb),map(b,yb+th),map(a,ya+th)],shade(c,.93+(j%4)*.025));}
 }
 function woodDoor(map,u,y,w,h){
  archFace(map,u,y,w,h,'#574b36','courtyardWood');
  const centre=u+w/2,spring=y+h*.64,top=t=>spring+h*.36*Math.sqrt(Math.max(0,1-(Math.abs(t-centre)/(w/2))**1.35));
  for(let k=0;k<12;k++){const a=u+k*w/12+.011,b=u+(k+1)*w/12-.011;const H=Math.min(top(a),top(b));q([map(a,y+.015),map(b,y+.015),map(b,H-.015),map(a,H-.015)],shade('#6f5b3a',.89+(k%3)*.08),'courtyardWood');}
  for(const yy of [y+h*.24,y+h*.60])q([map(u+.04,yy),map(u+w-.04,yy),map(u+w-.04,yy+.045),map(u+.04,yy+.045)],'#443f30','courtyardDark');
  for(const sign of [-1,1])q([map(centre+sign*.10-.018,y+h*.43),map(centre+sign*.10+.018,y+h*.43),map(centre+sign*.10+.018,y+h*.43+.095),map(centre+sign*.10-.018,y+h*.43+.095)],'#ccb071','courtyardWood');
 }

 // A closed solid between two wall planes. Local +depth points out of the wall.
 function prism(map,a,b,loA,loB,hiA,hiB,th,c,m='courtyardStone'){
  if(b-a<.00001||Math.max(hiA-loA,hiB-loB)<.00001)return;
  const front=[map(a,loA,0),map(b,loB,0),map(b,hiB,0),map(a,hiA,0)];
  const rear=[map(a,loA,-th),map(b,loB,-th),map(b,hiB,-th),map(a,hiA,-th)];
  q(front,c,m);q([...rear].reverse(),shade(c,.83),m);
  for(let j=0;j<4;j++){const k=(j+1)%4;q([rear[j],rear[k],front[k],front[j]],shade(c,.87),m);}
 }
 const pointedTop=(o,u)=>o.y+o.h*.64+o.h*.36*Math.sqrt(Math.max(0,(1.96-(Math.abs((u-o.u-o.w/2)/(o.w/2))+.4)**2)/1.8));
 function wallPanel(map,a,b,base,top,th,c){
  const rows=Math.max(1,Math.ceil((top-base)/.58)),cols=Math.max(1,Math.ceil((b-a)/1.08));
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const u=a+(b-a)*col/cols,U=a+(b-a)*(col+1)/cols,y=base+(top-base)*row/rows,Y=base+(top-base)*(row+1)/rows;
   const tint=shade(c,.965+rand()*.065);
   q([map(u,y,0),map(U,y,0),map(U,Y,0),map(u,Y,0)],tint);
   q([map(u,Y,-th),map(U,Y,-th),map(U,y,-th),map(u,y,-th)],shade(tint,.83));
  }
  // Adjacent masonry cells share a continuous solid; do not emit hidden internal faces.
  const edge=[[a,base],[b,base],[b,top],[a,top]];
  for(let j=0;j<4;j++){const k=(j+1)%4;q([map(...edge[j],-th),map(...edge[k],-th),map(...edge[k],0),map(...edge[j],0)],shade(c,.87));}
 }
 // Openings are removed from the masonry; the arch soffits have full wall depth.
 function masonryWall(map,start,width,base,height,th,openings,c='#d2be95'){
  // Two storeys can put openings above one another. Subtract every vertical
  // interval in each horizontal slice so an upper window cannot refill a lower one.
  const stacked=openings.some((o,i)=>openings.slice(i+1).some(p=>Math.max(o.u,p.u)<Math.min(o.u+o.w,p.u+p.w)-1e-8));
  if(stacked){
   const top=base+height,cuts=[start,start+width];
   for(const o of openings){const n=o.rect?1:(o.segments||24);for(let k=0;k<=n;k++)cuts.push(o.u+o.w*k/n);}
   const us=[...new Set(cuts.map(v=>Math.max(start,Math.min(start+width,v)).toFixed(9)))].map(Number).sort((a,b)=>a-b);
   const solid=(a,b,loA,loB,hiA,hiB)=>{if(Math.max(hiA-loA,hiB-loB)<1e-7)return;if(Math.abs(loA-loB)<1e-8&&Math.abs(hiA-hiB)<1e-8)wallPanel(map,a,b,loA,hiA,th,c);else prism(map,a,b,loA,loB,hiA,hiB,th,shade(c,.96+rand()*.07));};
   for(let k=0;k<us.length-1;k++){
    const a=us[k],b=us[k+1];if(b-a<1e-7)continue;
    const holes=openings.filter(o=>a>=o.u-1e-7&&b<=o.u+o.w+1e-7).sort((o,p)=>o.y-p.y);let loA=base,loB=base;
    for(const o of holes){solid(a,b,loA,loB,Math.min(top,o.y),Math.min(top,o.y));loA=Math.max(loA,Math.min(top,o.rect?o.y+o.h:pointedTop(o,a)));loB=Math.max(loB,Math.min(top,o.rect?o.y+o.h:pointedTop(o,b)));}
    solid(a,b,loA,loB,top,top);
   }
   return;
  }
  let cursor=start;const top=base+height;
  for(const o of [...openings].sort((a,b)=>a.u-b.u)){
   if(o.u>cursor)wallPanel(map,cursor,o.u,base,top,th,c);
   if(o.y>base)wallPanel(map,o.u,o.u+o.w,base,o.y,th,c);
   const N=o.rect?1:(o.segments||24);
   for(let k=0;k<N;k++){
    const a=o.u+o.w*k/N,b=o.u+o.w*(k+1)/N;
    const A=o.rect?o.y+o.h:pointedTop(o,a),B=o.rect?o.y+o.h:pointedTop(o,b);
    const tint=shade(c,.96+rand()*.07);
    q([map(a,A,0),map(b,B,0),map(b,top,0),map(a,top,0)],tint);
    q([map(a,top,-th),map(b,top,-th),map(b,B,-th),map(a,A,-th)],shade(tint,.83));
    q([map(a,A,-th),map(b,B,-th),map(b,B,0),map(a,A,0)],shade(tint,.87));
    if(k===0)q([map(a,A,0),map(a,top,0),map(a,top,-th),map(a,A,-th)],shade(tint,.87));
    if(k===N-1)q([map(b,top,0),map(b,B,0),map(b,B,-th),map(b,top,-th)],shade(tint,.87));
   }
   q([map(o.u,top,0),map(o.u+o.w,top,0),map(o.u+o.w,top,-th),map(o.u,top,-th)],shade(c,.87));
   cursor=o.u+o.w;
  }
  if(cursor<start+width)wallPanel(map,cursor,start+width,base,top,th,c);
 }
 function archStones(map,o,border=.17,c='#c2aa7e'){
  const spring=o.y+o.h*.64,front=(u,y,d)=>map(u,y,d+.08),rows=border<=.115?5:7,segments=border<=.115?16:24;
  for(const u of [o.u-border,o.u+o.w])for(let k=0;k<rows;k++){
   const y=o.y+(spring-o.y)*k/rows,Y=o.y+(spring-o.y)*(k+1)/rows-.008;
   prism(front,u,u+border,y,y,Y,Y,.22,shade(c,.94+rand()*.13));
  }
  for(let k=0;k<segments;k++){
   const a=o.u+o.w*k/segments,b=o.u+o.w*(k+1)/segments,A=pointedTop(o,a),B=pointedTop(o,b);
   prism(front,a,b,A,B,A+border,B+border,.22,shade(c,.94+rand()*.13));
  }
 }
 function recessedDoor(map,o,depth=.44,detailed=true){
  // A shut timber leaf sits well behind the outer jamb, leaving its reveal visible.
  const dark=(u,y)=>map(u,y,-depth-.02),front=(u,y)=>map(u,y,-depth);
  archFace(dark,o.u,o.y,o.w,o.h,'#39372b','courtyardDark');
  const N=14;
  for(let k=0;k<N;k++){
   const a=o.u+o.w*k/N+.007,b=o.u+o.w*(k+1)/N-.007,H=Math.min(pointedTop(o,a),pointedTop(o,b))-.008;
   q([front(a,o.y),front(b,o.y),front(b,H),front(a,H)],shade('#70583c',.78+(k%5)*.055),'courtyardWood');
  }
  for(const y of [o.y+.65,o.y+1.55]){
   const m=(u,Y)=>map(u,Y,-depth+.012);
   q([m(o.u+.05,y),m(o.u+o.w-.05,y),m(o.u+o.w-.05,y+.055),m(o.u+.05,y+.055)],'#49473a','courtyardMetal');
   for(let k=0;k<8;k++){const u=o.u+.12+k*(o.w-.24)/7;q([m(u-.012,y+.014),m(u+.012,y+.014),m(u+.012,y+.038),m(u-.012,y+.038)],'#a99461','courtyardMetal');}
  }
  if(detailed)for(const side of [-1,1]){
   const u=o.u+o.w/2+side*.13,y=o.y+1.10;
   for(let k=0;k<16;k++){const a=k/16*TAU,b=(k+1)/16*TAU;
    tube(map(u+.055*Math.cos(a),y+.073*Math.sin(a),-depth+.045),map(u+.055*Math.cos(b),y+.073*Math.sin(b),-depth+.045),.009,.009,'#998455','courtyardMetal',5);
   }
  }
 }
 function wallWear(map,start,width,base,height,openings,count=45){
  for(let k=0;k<count;k++){
   const u=start+.04+rand()*(width-.3),y=base+.05+Math.pow(rand(),2)*(height-.2),w=.05+rand()*.30,h=.025+rand()*.13;
   if(openings.some(o=>u+w>o.u-.03&&u<o.u+o.w+.03&&y+h>o.y-.04&&y<o.y+o.h+.1))continue;
   const p=[map(u,y,.006),map(u+w*.77,y-h*.1,.006),map(u+w,y+h*.63,.006),map(u+w*.22,y+h,.006)];
   q(p,k%3?'#b7a27f':'#c6ae85','courtyardStone');
  }
 }
 function roof(x,z,w,d,y,h,c='#c4b18b',parapet=.32,gaps={}){
  box(x,y,z,w,h,d,c);
  const edge=(a,b,gap,make)=>{if(!gap)return make(a,b);if(gap[0]>a)make(a,Math.min(b,gap[0]));if(gap[1]<b)make(Math.max(a,gap[1]),b);};
  edge(x,x+w,gaps.south,(a,b)=>box(a,y+h,z,b-a,parapet,.28,shade(c,.95)));edge(x,x+w,gaps.north,(a,b)=>box(a,y+h,z+d-.28,b-a,parapet,.28,shade(c,.95)));
  edge(z,z+d,gaps.west,(a,b)=>box(x,y+h,a,.28,parapet,b-a,shade(c,.97)));edge(z,z+d,gaps.east,(a,b)=>box(x+w-.28,y+h,a,.28,parapet,b-a,shade(c,.97)));
  for(let i=0;i<Math.ceil(w/.95);i++)for(let j=0;j<Math.ceil(d/.95);j++){
   const a=x+.3+(w-.6)*i/Math.ceil(w/.95),b=x+.3+(w-.6)*(i+1)/Math.ceil(w/.95),e=z+.3+(d-.6)*j/Math.ceil(d/.95),f=z+.3+(d-.6)*(j+1)/Math.ceil(d/.95);
   q([[a,y+h+.003,e],[a,y+h+.003,f],[b,y+h+.003,f],[b,y+h+.003,e]],shade(c,.90+rand()*.10),'courtyardEarth');
  }
  roofShadows.push([[x,y+h+parapet,z],[x+w,y+h+parapet,z],[x+w,y+h+parapet,z+d],[x,y+h+parapet,z+d]]);
 }

 function palm(x,z,height=4.2,scale=1,detail=1){
  const base=.25,lean=.18*scale,N=Math.round(20*detail),segments=Math.max(6,Math.round(10*detail)),fronds=Math.round(11*detail),leafSegments=Math.round(9*detail);
  const p=t=>[x+lean*t*t,base+height*t,z-.13*scale*t];
  for(let k=0;k<N;k++){
   const t=k/N,T=(k+1)/N,r=(.14-.055*t)*scale;
   tube(p(t),p(T),r,r*.98,shade('#90754d',.85+(k%3)*.08),'courtyardWood',segments);
   tube(p(Math.min(T-.018,T)),p(T),r*1.035,r*1.02,'#b29763','courtyardWood',segments);
  }
  const crown=p(1);
  for(let k=0;k<fronds;k++){
   const a=k/fronds*TAU+.19,L=(1.52+(k%3)*.18)*scale,dx=Math.cos(a),dz=Math.sin(a);
   const path=t=>[crown[0]+dx*L*t,crown[1]+(.55*Math.sin(t*Math.PI)-.36*t)*scale,crown[2]+dz*L*t];
   for(let j=0;j<leafSegments;j++){
    const t=j/leafSegments,T=(j+1)/leafSegments,pa=path(t),pb=path(T),w=(Math.sin((t+.08)*Math.PI)*.13+.012)*scale;
    const side=[-dz*w,0,dx*w];
    q([add(pa,side),sub(pa,side),sub(pb,mul(side,.87)),add(pb,mul(side,.87))],shade(k%2?'#6d834c':'#4f7149',.90+(j%3)*.04),'courtyardLeaf');
    tube(pa,pb,.009*scale,.006*scale,'#929954','courtyardLeaf',4);
    if(j>1&&j<leafSegments-1)for(const sign of [-1,1]){
     const mid=path((t+T)/2),tip=[mid[0]-dz*sign*(.23+.08*Math.sin(t*Math.PI))*scale+dx*.11*scale,mid[1]-.09*scale,mid[2]+dx*sign*(.23+.08*Math.sin(t*Math.PI))*scale+dz*.11*scale];
     q([mid,[tip[0]-dx*.035*scale,tip[1],tip[2]-dz*.035*scale],tip,[mid[0]+dx*.07*scale,mid[1],mid[2]+dz*.07*scale]],k%2?'#657e47':'#78904f','courtyardLeaf');
    }
   }
  }
  for(let k=0;k<4;k++){const a=k/4*TAU;tube([crown[0],crown[1]-.05,crown[2]],[crown[0]+Math.cos(a)*.12*scale,crown[1]-.38*scale,crown[2]+Math.sin(a)*.12*scale],.055*scale,.04*scale,'#a07b40','courtyardWood',8,true);}
 }
 function planter(x,z,s=1){
  const y=.25;let old=group;group='courtyard-planters';
  tube([x,y,z],[x,y+.43*s,z],.24*s,.34*s,'#a56f45','courtyardStone',16,true);
  tube([x,y+.41*s,z],[x,y+.47*s,z],.36*s,.36*s,'#bb8759','courtyardStone',16,true);
  tube([x,y+.475*s,z],[x,y+.48*s,z],.30*s,.30*s,'#66533b','courtyardDark',16,true);
  for(let k=0;k<13;k++){
   const a=k*2.4,r=(.20+(k%3)*.06)*s,root=[x,y+.47*s,z],tip=[x+Math.cos(a)*r,y+(.72+(k%4)*.07)*s,z+Math.sin(a)*r];
   tube(root,tip,.010*s,.006*s,'#6b7b46','courtyardLeaf',4);
   const crosswise=[-Math.sin(a)*.07*s,0,Math.cos(a)*.07*s];
   q([root,add(tip,crosswise),[tip[0]+Math.cos(a)*.10*s,tip[1]+.07*s,tip[2]+Math.sin(a)*.10*s],sub(tip,crosswise)],k%2?'#6f8349':'#526f42','courtyardLeaf');
  }
  group=old;
 }
 function jar(x,y,z,scale=1,c='#ae784e'){
  const profile=[[0,.14],[.07,.20],[.24,.28],[.43,.30],[.59,.21],[.71,.115],[.78,.13]];
  for(let j=0;j<profile.length-1;j++)for(let k=0;k<20;k++){
   const a=k/20*TAU,b=(k+1)/20*TAU,p=profile[j],P=profile[j+1];
   q([[x+p[1]*scale*Math.cos(a),y+p[0]*scale,z+p[1]*scale*Math.sin(a)],[x+p[1]*scale*Math.cos(b),y+p[0]*scale,z+p[1]*scale*Math.sin(b)],[x+P[1]*scale*Math.cos(b),y+P[0]*scale,z+P[1]*scale*Math.sin(b)],[x+P[1]*scale*Math.cos(a),y+P[0]*scale,z+P[1]*scale*Math.sin(a)]].reverse(),shade(c,.91+(k%5)*.025),'courtyardStone');
  }
  tube([x,y+.775*scale,z],[x,y+.805*scale,z],.14*scale,.14*scale,c,'courtyardStone',20);
  for(let k=0;k<20;k++){const a=k/20*TAU,b=(k+1)/20*TAU;q([[x,y+.78*scale,z],[x+.115*scale*Math.cos(b),y+.78*scale,z+.115*scale*Math.sin(b)],[x+.115*scale*Math.cos(a),y+.78*scale,z+.115*scale*Math.sin(a)],[x,y+.78*scale,z]],'#4a4635','courtyardDark');}
 }
 // The widened court keeps its optical centre and near edge fixed at the aperture.
 const C={far:-26.25,near:-5.35,south:-8.20,north:5.40,axisZ:-1.40,floorY:.245};
 const contextBuildings=[],roofAccesses=[];
 const clearCourtyardBounds={min:[C.far,C.floorY,C.south],max:[C.near,C.floorY,C.north]};
 const clearCourtyardArea=(C.near-C.far)*(C.north-C.south);
 const boundsOf=(start,end=parts.length)=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of parts.slice(start,end))p.vertices.forEach((v,k)=>{min[k%3]=Math.min(min[k%3],v);max[k%3]=Math.max(max[k%3],v);});return{min,max};};
 function windowOpening(map,o,depth=.40,timber='#85876a'){
  if(o.rect){
   for(const u of [o.u-.105,o.u+o.w])prism(map,u,u+.105,o.y-.07,o.y-.07,o.y+o.h+.09,o.y+o.h+.09,.16,'#c6b28d');
   prism(map,o.u-.105,o.u+o.w+.105,o.y+o.h,o.y+o.h,o.y+o.h+.11,o.y+o.h+.11,.16,'#cbb892');
   q([map(o.u,o.y,-depth),map(o.u+o.w,o.y,-depth),map(o.u+o.w,o.y+o.h,-depth),map(o.u,o.y+o.h,-depth)],'#414b3e','courtyardDark');
  }else{archStones(map,o,.11,'#c4ae86');archFace((u,y)=>map(u,y,-depth),o.u,o.y,o.w,o.h,'#414b3e','courtyardDark');}
  const top=u=>o.rect?o.y+o.h:pointedTop(o,u);
  for(let k=0;k<5;k++){const u=o.u+.07+(o.w-.14)*k/4;tube(map(u,o.y+.04,-depth+.075),map(u,top(u)-.035,-depth+.075),.012,.012,timber,'courtyardWood',5);}
  for(const f of [.28,.62])tube(map(o.u+.04,o.y+o.h*f,-depth+.085),map(o.u+o.w-.04,o.y+o.h*f,-depth+.085),.012,.012,timber,'courtyardWood',5);
  prism((u,y,D)=>map(u,y,D+.12),o.u-.14,o.u+o.w+.14,o.y-.09,o.y-.09,o.y+.015,o.y+.015,.62,'#d2bf99');
 }
 function threshold(map,o){
  prism((u,y,D)=>map(u,y,D+.24),o.u-.16,o.u+o.w+.16,.13,.13,o.y+.012,o.y+.012,.72,'#bfa984');
 }

 // Unbounded-looking ground and connected lanes remain separate from framing bounds.
 group='site-ground';
 for(let ix=0;ix<9;ix++)for(let iz=0;iz<8;iz++){
  const x=-72+ix*14,X=x+14,z=-54+iz*109/8,Z=z+109/8;
  q([[x,.129,z],[x,.129,Z],[X,.129,Z],[X,.129,z]],shade('#aa9576',.975+((ix*7+iz*3)%7)*.006),'courtyardEarth');
 }
 for(let ix=0;ix<31;ix++)for(let iz=0;iz<29;iz++){
  const x=-46+ix*2,X=x+2,z=-30+iz*1.9,Z=z+1.9;
  q([[x,.13,z],[x,.13,Z],[X,.13,Z],[X,.13,z]],shade('#aa9576',.94+rand()*.11),'courtyardEarth');
 }
 group='site-street';
 for(let row=0;row<6;row++)for(let col=0;col<40;col++){
  const x=-36.2+col*1.16,z=-17.15+row*.61,shift=row%2?.56:0;
  slab(x+shift,.13,z,1.12,.035,.585,shade('#b5a17d',.91+rand()*.12),'courtyardStone',.009);
 }
 for(let row=0;row<6;row++)for(let col=0;col<28;col++){
  const x=-34.6+col*1.12,z=16.25+row*.64;
  slab(x+(row%2?.55:0),.13,z,1.085,.035,.615,shade('#b4a17e',.92+rand()*.10),'courtyardStone',.009);
 }
 for(let row=0;row<5;row++)for(let col=0;col<17;col++){
  const x=-6.1+col*1.03,z=5.97+row*.54;
  slab(x,.13,z,.998,.035,.515,shade('#b1a17e',.92+rand()*.10),'courtyardStone',.009);
 }
 // A narrow western lane and thresholds join the surrounding house fronts.
 for(let row=0;row<30;row++)for(let col=0;col<3;col++)slab(-34.67+col*.62,.13,-9.3+row*.88,.596,.035,.85,shade('#b2a17f',.93+rand()*.08),'courtyardStone',.008);
 group='courtyard-paving';
 box(C.far,.13,C.south,C.near-C.far,.08,C.north-C.south,'#938568');
 for(let row=0;row<31;row++){
  const z=C.south+row*(C.north-C.south)/31,depth=(C.north-C.south)/31-.010;let x=C.far;
  while(x<C.near-.015){const w=Math.min(.69+rand()*.32,C.near-x);if(w<.015)break;slab(x,.21,z,w-.009,.035,depth,shade('#c0ad89',.91+rand()*.14),'courtyardStone',.008);x+=w;}
 }
 for(let i=0;i<40;i++)slab(C.far+.02+i*.52,.215,C.north-.16,.50,.030,.13,shade('#988b70',.92+rand()*.12),'courtyardStone',.008);

 // A taller and deeper hall now balances the enlarged study, without enlarging its fittings.
 const fx=C.far,z0=C.south,fw=C.north-C.south,fy=.245,fh=4.45,backX=-32.70,dc=1.4;
 const hallMap=(u,y,d)=>[fx+d,y,-u];
 const door={u:dc-.92,y:.405,w:1.84,h:2.80};
 const hallWindows=[{u:dc-4.30-.45,y:1.78,w:.90,h:1.48},{u:dc+4.30-.45,y:1.78,w:.90,h:1.48}];
 group='courtyard-hall-walls';
 masonryWall(hallMap,-C.north,fw,fy,fh,.62,[door,...hallWindows],'#d4c29c');
 const hallSideN=(u,y,d)=>[u,y,C.north+d],hallSideS=(u,y,d)=>[-u,y,C.south-d];
 const sideNorth=[{u:-31.25,y:1.78,w:.85,h:1.35,rect:true},{u:-28.85,y:1.78,w:.85,h:1.35,rect:true}],sideSouth=[{u:27.85,y:1.72,w:.82,h:1.38,rect:true},{u:30.2,y:1.72,w:.82,h:1.38,rect:true}];
 masonryWall(hallSideN,backX,fx-backX,fy,fh,.58,sideNorth,'#c9b78e');
 masonryWall(hallSideS,-fx,fx-backX,fy,fh,.58,sideSouth,'#c8b58f');
 const hallRear=(u,y,d)=>[backX-d,y,u],rearDoor={u:-2.0,y:.265,w:1.15,h:2.38};
 masonryWall(hallRear,z0,fw,fy,fh,.58,[rearDoor],'#c2ae88');
 box(backX+.58,.245,z0+.58,fx-backX-.58,.10,fw-1.16,'#9b8d71');
 wallWear(hallMap,-C.north,fw,fy,fh,[door,...hallWindows],80);
 for(const z of [z0,C.north-.40])for(let row=0;row<9;row++)slab(fx-.30,fy+row*.485,z,.36,.465,.40,shade('#c7b38b',.92+rand()*.09),'courtyardStone',.014);
 group='courtyard-hall-openings';
 archStones(hallMap,door,.18,'#c1aa80');recessedDoor(hallMap,door,.48);
 slab(fx-.56,.245,-2.55,1.36,.16,2.30,'#c5b390','courtyardStone',.018);slab(fx+.77,.245,-2.49,.36,.075,2.18,'#bcaa87','courtyardStone',.012);
 for(const o of hallWindows)windowOpening(hallMap,o,.50,'#929671');
 for(const o of sideNorth)windowOpening(hallSideN,o,.46);for(const o of sideSouth)windowOpening(hallSideS,o,.46);
 archStones(hallRear,rearDoor,.12,'#b8a27b');recessedDoor(hallRear,rearDoor,.45,false);threshold(hallRear,rearDoor);
 // Small clerestory slots, not oversized windows, break the long upper elevation.
 for(const u of [-3.6,-.8,3.7,6.5]){q([hallMap(u,3.78,.008),hallMap(u+.24,3.78,.008),hallMap(u+.24,3.96,.008),hallMap(u,3.96,.008)],'#6b6851','courtyardDark');prism((U,y,d)=>hallMap(U,y,d+.035),u-.04,u+.28,3.96,3.96,4.01,4.01,.12,'#c6b28d');}
 group='courtyard-hall-roof';
 roof(backX-.08,z0-.08,fx-backX+.24,fw+.16,fy+fh,.27,'#c9b78f',.38);
 slab(fx-.24,fy+fh-.09,z0-.14,.43,.14,fw+.28,'#d8c7a3','courtyardStone',.014);
 for(let k=0;k<18;k++)slab(fx-.15,fy+fh+.65,z0+.20+k*.74,.28,.16,.30,shade('#d5c19a',.94+rand()*.08),'courtyardStone',.012);
 for(let z=z0+.58;z<C.north-.3;z+=1.12)box(fx-.015,fy+fh-.21,z,.18,.13,.15,'#726044','courtyardWood');

 // Four deep, walkable arch bays give the side gallery a recognizable public frontage.
 const az=C.north,ax=-26.35,alen=15.45,gback=9.75,gh=4.05;
 const galleryMap=(u,y,d)=>[-u,y,az-d];
 const galleryArches=[12.72,16.50,20.28,24.06].map(u=>({u:u-1.43,y:.38,w:2.86,h:3.18}));
 group='courtyard-gallery-walls';
 const galleryRear=(u,y,d)=>[u,y,gback-.50-d],galleryDoors=[{u:-23.90,y:.395,w:1.18,h:2.48},{u:-16.55,y:.395,w:1.18,h:2.48}];
 masonryWall(galleryRear,ax,alen,.245,gh,.50,galleryDoors,'#ab9775');
 box(ax,.245,az,.50,gh,gback-az,'#bbaa87');box(ax+alen-.50,.245,az,.50,gh,gback-az,'#bbaa87');box(ax,.245,az,alen,.13,gback-az,'#9a8a6b');
 for(let i=0;i<26;i++)for(let j=0;j<6;j++)slab(ax+.53+i*.55,.375,az+.05+j*.62,.535,.025,.606,shade('#a99a79',.85+rand()*.10),'courtyardStone',.007);
 group='courtyard-gallery-arches';masonryWall(galleryMap,-ax-alen,alen,.245,gh,.52,galleryArches,'#cab791');for(const o of galleryArches)archStones(galleryMap,o,.17,'#c8b28a');
 for(const x of [-26.13,-22.35,-18.57,-14.79,-11.14])slab(x,.245,az-.16,.58,.15,.82,'#baa57f','courtyardStone',.018);
 for(const o of galleryDoors){archStones(galleryRear,o,.12,'#b4a07a');recessedDoor(galleryRear,o,.39,false);}
 group='courtyard-gallery-roof';roof(ax-.10,az-.10,alen+.20,gback-az+.20,.245+gh,.27,'#bba984',.30);
 for(let x=ax+.60;x<ax+alen-.55;x+=1.02)box(x,.245+gh-.24,az-.025,.16,.24,gback-az+.05,'#6c593e','courtyardWood');
 for(let z=az+.26;z<gback-.5;z+=.19)box(ax+.5,.245+gh-.035,z,alen-1,.035,.055,'#81704d','courtyardWood');

 // The other wing has substantial street and courtyard fronts, both with recessed openings.
 const rz=C.south,wingX=-26.35,wingW=12.10,wingDepth=5.20,wingH=4.25;
 const wingMap=(u,y,d)=>[u,y,rz+d],shutter={u:-22.40,y:1.30,w:2.10,h:1.93,rect:true},wingDoor={u:-25.27,y:.265,w:1.13,h:2.48},wingWindow={u:-17.55,y:1.70,w:.96,h:1.45};
 const wingBack=(u,y,d)=>[-u,y,rz-wingDepth-d],wingBackDoor={u:19.08,y:.265,w:1.14,h:2.42},wingBackWindows=[{u:15.25,y:1.7,w:.90,h:1.27,rect:true},{u:23.70,y:1.7,w:.90,h:1.27,rect:true}];
 group='courtyard-wing-walls';masonryWall(wingMap,wingX,wingW,.245,wingH,.56,[wingDoor,shutter,wingWindow],'#dccba5');
 masonryWall(wingBack,-wingX-wingW,wingW,.245,wingH,.55,[wingBackDoor,...wingBackWindows],'#c6b18b');
 box(wingX,.245,rz-wingDepth,.52,wingH,wingDepth,'#c4af87');box(wingX+wingW-.52,.245,rz-wingDepth,.52,wingH,wingDepth,'#ccb78f');box(wingX+.52,.245,rz-wingDepth+.52,wingW-1.04,.10,wingDepth-1.04,'#a48e6c');
 wallWear(wingMap,wingX,wingW,.245,wingH,[wingDoor,shutter,wingWindow],70);
 group='courtyard-wing-openings';archStones(wingMap,wingDoor,.13,'#c5ad83');recessedDoor(wingMap,wingDoor,.44);threshold(wingMap,wingDoor);windowOpening(wingMap,wingWindow,.45);
 archStones(wingBack,wingBackDoor,.13,'#bea77f');recessedDoor(wingBack,wingBackDoor,.43);threshold(wingBack,wingBackDoor);for(const o of wingBackWindows)windowOpening(wingBack,o,.45);
 const wx=shutter.u,wy=shutter.y,ww=shutter.w,wh=shutter.h;
 box(wx,wy,rz-.46,ww,wh,.045,'#4e624c','courtyardWood');for(let k=0;k<11;k++)box(wx+.025+k*.187,wy+.035,rz-.39,.025,wh-.07,.028,k%3?'#92966b':'#788461','courtyardWood');
 for(const y of [wy+.20,wy+wh-.23])box(wx+.025,y,rz-.35,ww-.05,.05,.035,'#8e9064','courtyardWood');for(const x of [wx-.12,wx+ww])box(x,wy-.08,rz-.05,.12,wh+.16,.16,'#c8b38c');box(wx-.12,wy+wh,rz-.05,ww+.24,.13,.16,'#cfbc95');slab(wx-.17,wy-.12,rz-.54,ww+.34,.12,.82,'#d1be98','courtyardStone',.015);
 group='courtyard-wing-roof';roof(wingX-.08,rz-wingDepth-.08,wingW+.16,wingDepth+.16,.245+wingH,.26,'#c7b48e',.35);slab(wingX-.10,.245+wingH-.10,rz-.18,wingW+.20,.13,.37,'#decca6','courtyardStone',.015);
 for(let x=wingX+.65;x<wingX+wingW-.3;x+=1.10)box(x,.245+wingH-.21,rz+.025,.15,.13,.17,'#786448','courtyardWood');

 group='courtyard-connection-walls';
 slab(wingX+wingW,.245,rz-.37,C.near-wingX-wingW,.70,.43,'#c7b38d','courtyardStone',.026);slab(ax+alen,.245,C.north,C.near-ax-alen,.66,.45,'#bfa982','courtyardStone',.025);
 box(-5.85,.245,C.south-.37,.50,1.02,2.50,'#c1ab82');box(-5.85,.245,C.north,.50,1.02,.70,'#bca780');

 // The enlarged basin stays on the pinhole's centreline and leaves broad side aisles.
 group='courtyard-basin';const bx=-17.15,bz=-3.30,bw=3.20,bd=3.80;
 slab(bx-.12,.247,bz-.12,bw+.24,.12,bd+.24,'#8e987a','courtyardStone',.025);box(bx,.367,bz,bw,.075,bd,'#637f6c');
 for(const z of [bz-.025,bz+bd-.16])slab(bx-.025,.36,z,bw+.05,.21,.185,'#dfcda6','courtyardStone',.018);for(const x of [bx-.025,bx+bw-.16])slab(x,.36,bz+.16,.185,.21,bd-.32,'#dfcda6','courtyardStone',.018);
 q([[bx+.17,.493,bz+.18],[bx+.17,.493,bz+bd-.18],[bx+bw-.17,.493,bz+bd-.18],[bx+bw-.17,.493,bz+.18]],'#65a6a3','courtyardWater');
 for(let k=0;k<36;k++){const x=bx+.25+rand()*(bw-.5),z=bz+.25+rand()*(bd-.5),len=.08+rand()*.24;q([[x,.496,z],[x,.496,z+.016],[Math.min(x+len,bx+bw-.20),.496,z+.016],[Math.min(x+len,bx+bw-.20),.496,z]],k%3?'#9acac0':'#b9d7c3','courtyardWater');}
 box(bx+.16,.49,bz+.17,bw-.32,.018,.020,'#abcaba','courtyardWater');box(bx+.16,.49,bz+bd-.19,bw-.32,.018,.020,'#76b1aa','courtyardWater');
 group='courtyard-palms';palm(-21.55,-6.82,5.12,1.04);
 planter(-20.30,4.42,1.15);planter(-24.16,-6.26,.95);
 group='courtyard-planting';q([[-23.55,.250,-8.08],[-23.55,.250,-6.25],[-19.75,.250,-6.35],[-19.52,.250,-8.08]],'#7f7857','courtyardEarth');
 for(let i=0;i<18;i++)slab(-23.5+i*.225,.248,-6.31,.21,.09,.16,shade('#a99b78',.89+rand()*.18),'courtyardStone',.025);
 for(let k=0;k<40;k++){const x=-23.30+rand()*3.5,z=-7.94+rand()*1.3,y=.257;for(let j=0;j<5;j++){const angle=rand()*TAU,h=.12+rand()*.22,reach=.08+rand()*.12,dx=Math.cos(angle),dz=Math.sin(angle);q([[x-dz*.016,y,z+dx*.016],[x+dx*reach,y+h,z+dz*reach],[x+dx*reach*.80,y+h*.84,z+dz*reach*.80],[x+dz*.016,y,z-dx*.016]],shade('#6d7c48',.86+rand()*.19),'courtyardLeaf');}}
 group='courtyard-furnishings';
 for(const x of [-24.50,-22.06])for(const z of [4.22,4.74])box(x,.245,z,.16,.50,.16,'#705a3d','courtyardWood');for(let j=0;j<4;j++)slab(-24.70,.72,4.14+j*.18,3.00,.10,.166,shade('#8b7050',.90+j*.035),'courtyardWood',.012);
 for(let j=0;j<11;j++){const x=-23.58+j*.070,y=.832+Math.sin(j/10*Math.PI)*.018;q([[x,y,4.17],[x,y,4.82],[x+.068,y+.004,4.82],[x+.068,y+.004,4.17]],j%4===0?'#697c70':'#b9ad83','courtyardCloth');}
 jar(-24.65,.40,8.68,1.22,'#a97650');jar(-23.96,.40,8.94,.87,'#b88b5c');jar(-17.75,.40,8.98,1.03,'#aa7951');jar(-21.40,.245,4.66,.73,'#b88557');
 tube([-24.14,.40,8.16],[-24.14,.47,8.16],.22,.27,'#bd9467','courtyardStone',20,true);tube([-24.15,.50,8.13],[-23.76,.51,8.01],.018,.018,'#917145','courtyardWood',8);
 for(let i=0;i<14;i++){const x=-18.83+i*.085,z=9.20+Math.sin(i*.8)*.034;q([[x,1.28,z],[x+.084,1.30,z+.012],[x+.084,2.68,z+.012],[x,2.70,z]],i%4===0?'#817b5c':'#a39873','courtyardCloth');}tube([-18.96,2.75,9.22],[-17.55,2.75,9.22],.025,.025,'#6e5b3d','courtyardWood',8);

 // Every neighbouring house has thick, opened walls, human-scale fittings and a distinct frontage.
 function contextHouse(id,x,z,w,d,h,c,{entry='east',balcony=false,roofGap=null}={}){
  const start=parts.length,base=.13,openings=[];
  const faces=[{id:'east',map:(u,y,D)=>[x+w+D,y,-u],u:-z-d,len:d,normal:[1,0,0]},{id:'west',map:(u,y,D)=>[x-D,y,u],u:z,len:d,normal:[-1,0,0]},{id:'north',map:(u,y,D)=>[u,y,z+d+D],u:x,len:w,normal:[0,0,1]},{id:'south',map:(u,y,D)=>[-u,y,z-D],u:-x-w,len:w,normal:[0,0,-1]}];
  for(const face of faces){
   const os=[],isEntry=face.id===entry;
   if(isEntry)os.push({type:'door',u:face.u+face.len*.5-.55,y:.17,w:1.10,h:2.38,segments:20});
   const centres=face.len>7?[.20,.78]:isEntry?[.18,.82]:[.30,.72];
   for(const f of centres){const u=face.u+face.len*f-.43;if(isEntry&&Math.abs(u+.43-(face.u+face.len*.5))<1.05)continue;os.push({type:'window',u,y:1.62,w:.86,h:1.22,rect:true});}
   if(h>5.50){for(const f of [.27,.73])os.push({type:'upper-window',u:face.u+face.len*f-.38,y:4.10,w:.76,h:1.05,rect:true});}
   if(balcony&&face.id==='north')os.push({type:'balcony-door',u:face.u+face.len*.5-.48,y:3.33,w:.96,h:2.10,segments:20});
   group='site-context-houses';masonryWall(face.map,face.u,face.len,base,h,.48,os,c);wallWear(face.map,face.u,face.len,base,h,os,Math.round(face.len*2));
   group='site-context-openings';
   for(const o of os){if(o.type.includes('door')){archStones(face.map,o,.115,shade(c,.88));recessedDoor(face.map,o,.37,false);if(o.y<.3)threshold(face.map,o);}else windowOpening(face.map,o,.39,'#7c8265');openings.push({type:o.type,side:face.id,width:o.w,height:o.h,bottom:o.y,depth:.37,wallThickness:.48,centre:face.map(o.u+o.w/2,o.y+o.h/2,0),normal:face.normal});}
   for(let k=0;k<Math.floor(face.len/2.0);k++){const u=face.u+.7+k*2.0,y=base+h-.48;q([face.map(u,y,.008),face.map(u+.23,y,.008),face.map(u+.23,y+.15,.008),face.map(u,y+.15,.008)],'#6a654f','courtyardDark');}
   // Projecting joist ends make roof structure legible from the street.
   for(let k=0;k<Math.floor(face.len/1.05);k++){const u=face.u+.48+k*1.05;prism((U,y,D)=>face.map(U,y,D+.15),u,u+.13,base+h-.18,base+h-.18,base+h-.055,base+h-.055,.25,'#78664a','courtyardWood');}
  }
  group='site-context-houses';box(x+.48,.13,z+.48,w-.96,.10,d-.96,shade(c,.77));
  for(const xx of [x-.025,x+w-.28])for(const zz of [z-.025,z+d-.28])for(let row=0;row<Math.ceil(h/.60);row++)box(xx,.13+row*.60,zz,.305,Math.min(.56,h-row*.60),.305,shade(c,.94+(row%3)*.02));
  group='site-context-roofs';roof(x-.06,z-.06,w+.12,d+.12,h+.13,.22,shade(c,.91),.30,roofGap||{});
  if(balcony){
   group='site-context-balconies';const xx=x+w/2-1.55,zz=z+d-.02;
   for(let k=0;k<12;k++)box(xx+k*.26,3.25,zz,.245,.11,.95,'#7d6847','courtyardWood');
   for(const X of [xx+.08,xx+1.02,xx+2.04,xx+3.02]){box(X,3.36,zz+.83,.065,.85,.065,'#725d3f','courtyardWood');tube([X,2.62,zz+.04],[X,3.28,zz+.80],.047,.047,'#6b573d','courtyardWood',6);}
   box(xx+.04,4.16,zz+.83,3.06,.07,.07,'#8c7651','courtyardWood');box(xx+.04,3.66,zz+.83,3.06,.055,.055,'#8c7651','courtyardWood');
   for(let k=0;k<19;k++)box(xx+.10+k*.157,3.65,zz+.85,.032,.52,.035,'#927b54','courtyardWood');
  }
  const record={id,footprint:{min:[x,.13,z],max:[x+w,.13+h,z+d]},height:h,wallThickness:.48,openings,partRange:[start,parts.length],bounds:boundsOf(start),groups:['site-context-houses','site-context-openings','site-context-roofs',...(balcony?['site-context-balconies']:[])]};contextBuildings.push(record);return record;
 }
 const houses={};
 houses.west=contextHouse('west-residence',-41.40,-9.40,6.60,16.60,6.00,'#c1ad88',{entry:'east'});
 houses.north=contextHouse('north-terrace',-28.80,10.05,13.00,6.00,5.00,'#c4b18c',{entry:'north',roofGap:{north:[-26.67,-25.57]}});
 houses.annex=contextHouse('gallery-end-house',-10.80,5.70,5.40,5.35,4.05,'#c4b291',{entry:'south'});
 houses.streetWest=contextHouse('street-west-house',-34.90,-23.00,9.00,7.20,5.25,'#c5b28b',{entry:'north'});
 houses.streetMid=contextHouse('street-balcony-house',-22.60,-25.40,9.50,8.20,6.05,'#b9a380',{entry:'north',balcony:true});
 houses.streetEast=contextHouse('street-east-house',-10.20,-22.40,7.70,6.40,4.70,'#cbb994',{entry:'north'});
 houses.studySouth=contextHouse('study-south-house',5.90,-15.80,7.10,7.40,4.80,'#bfae8c',{entry:'north'});
 houses.studyNorth=contextHouse('study-north-house',6.60,8.60,6.80,7.60,5.10,'#c6b592',{entry:'south'});

 // An actual two-flight stair reaches the terrace through a gap in its parapet.
 function terraceStair(id,x,z,topY){
  const start=parts.length,n=Math.ceil((topY-.13)/.34),rise=(topY-.13)/(2*n),run=.285,width=.94,gap=.18,landing=.82;
  group='site-context-roof-access';
  for(let k=0;k<n;k++){
   box(x,.13,z+k*run,width,rise*(k+1),run+.015,'#b4a17e');
   box(x+width+gap,.13,z+k*run,width,topY-.13-rise*k,run+.015,'#bca987');
   q([[x,.13+rise*(k+1)+.002,z+k*run],[x,.13+rise*(k+1)+.002,z+(k+1)*run],[x+width,.13+rise*(k+1)+.002,z+(k+1)*run],[x+width,.13+rise*(k+1)+.002,z+k*run]],'#c8b691');
  }
  box(x,.13,z+n*run,width*2+gap,rise*n,landing,'#b9a580');
  box(x+width+gap,topY-.12,z-.26,width,.12,.28,'#c5b18c');
  for(let k=0;k<=n;k+=3){const zz=z+k*run,yy=.13+rise*Math.min(k+1,n);box(x-.06,yy,zz,.07,.78,.07,'#79674a','courtyardWood');const Y=topY-rise*k;box(x+width*2+gap-.01,Y,zz,.07,.78,.07,'#79674a','courtyardWood');}
  tube([x-.025,.13+rise+.80,z],[x-.025,.13+rise*n+.80,z+n*run],.038,.038,'#846e4c','courtyardWood',6);
  tube([x+width*2+gap+.025,topY+.80,z],[x+width*2+gap+.025,.13+rise*n+.80,z+n*run],.038,.038,'#846e4c','courtyardWood',6);
  const record={id,type:'dogleg-stair',group:'site-context-roof-access',partRange:[start,parts.length],bounds:boundsOf(start),stepRise:rise,stepRun:run,steps:n*2,topY};roofAccesses.push(record);return record;
 }
 terraceStair('north-terrace-stair',-27.77,16.11,5.35);
 function roofRoom(id,x,z,w,d,y,h){
  const start=parts.length,map=(u,Y,D)=>[x+w+D,Y,-u],door={u:-z-d/2-.46,y:y+.015,w:.92,h:1.95};
  group='site-context-roof-access';masonryWall(map,-z-d,d,y,h,.30,[door],'#c1ae87');box(x,y,z,.30,h,d,'#bba580');box(x,y,z,w,h,.30,'#b9a47e');box(x,y,z+d-.30,w,h,.30,'#c6b38d');archStones(map,door,.09,'#af9870');recessedDoor(map,door,.22,false);
  roof(x-.05,z-.05,w+.10,d+.10,y+h,.18,'#b6a27d',.12);
  roofAccesses.push({id,type:'roof-access-room',group:'site-context-roof-access',partRange:[start,parts.length],bounds:boundsOf(start),door:{width:.92,height:1.95,depth:.22}});
 }
 roofRoom('west-roof-room',-40.20,-6.70,2.70,3.20,6.35,2.15);
 roofRoom('street-roof-room',-21.15,-23.45,2.70,2.90,6.40,2.10);
 group='site-context-openings';jar(-25.60,5.36,13.70,.85,'#ab7c55');jar(-8.60,4.41,9.70,.72,'#b98c61');
 group='site-context-vegetation';palm(-35.95,8.15,6.10,.91,.72);palm(-11.80,-18.05,5.85,.87,.72);

 // Small edge wear supports scale without filling the spacious open court with props.
 group='courtyard-ground-detail';
 for(let k=0;k<110;k++){const x=C.far+.25+rand()*(C.near-C.far-.5),z=k%2?C.south+.08+rand()*.22:C.north-.08-rand()*.20;box(x,.247,z,.012+rand()*.027,.005,.010+rand()*.022,k%3?'#aa946e':'#d0b991');}
 group='site-street';for(let k=0;k<160;k++){const x=-36+rand()*48,z=k%2?-17.0+rand()*2.9:16.2+rand()*3.3;q([[x,.169,z],[x,.169,z+.025],[x+.025+rand()*.07,.169,z+.025],[x+.025+rand()*.07,.169,z]],'#9e8a69','courtyardEarth');}

 // Shared cast shadows come from the same enlarged roofs and palm geometry.
 const clipPolygon=(polygon,rect)=>{let result=polygon;for(const[axis,edge,greater]of[[0,rect[0],true],[0,rect[1],false],[2,rect[2],true],[2,rect[3],false]]){const input=result;result=[];if(!input.length)break;for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],A=greater?a[axis]>=edge:a[axis]<=edge,B=greater?b[axis]>=edge:b[axis]<=edge;if(A)result.push(a);if(A!==B){const t=(edge-a[axis])/(b[axis]-a[axis]);result.push(a.map((v,k)=>v+(b[k]-v)*t));}}}return result;};
 function shadow(polygon,y,alpha,rect){let ps=polygon.map(p=>[p[0]-.65*(p[1]-y),y,p[2]-.52*(p[1]-y)]);if(rect)ps=clipPolygon(ps,rect);if(ps.length<3)return;for(let i=1;i<ps.length-1;i++)q([ps[0],ps[i+1],ps[i],ps[0]],[.17,.20,.16,alpha],'courtyardShadow');}
 const courtRect=[C.far,C.near,C.south,C.north];group='courtyard-shadows';for(const polygon of roofShadows)shadow(polygon,.2472,.24,courtRect);
 for(const p of parts.filter(p=>p.group==='courtyard-palms'&&p.material==='courtyardLeaf'))shadow(Array.from({length:4},(_,i)=>p.vertices.slice(i*3,i*3+3)),.248,.17,courtRect);
 function contact(x,z,rx,rz,alpha,y=.2485){for(let k=0;k<24;k++){const a=k/24*TAU,b=(k+1)/24*TAU;q([[x,y,z],[x+rx*Math.cos(b),y,z+rz*Math.sin(b)],[x+rx*Math.cos(a),y,z+rz*Math.sin(a)],[x,y,z]],[.20,.20,.15,alpha],'courtyardShadow');}}
 contact(-21.55,-6.82,.41,.35,.25);contact(-21.55,-6.82,.63,.52,.09);q([[bx-.10,.2485,bz-.10],[bx-.10,.2485,bz+bd+.10],[bx+bw+.10,.2485,bz+bd+.10],[bx+bw+.10,.2485,bz-.10]],[.20,.21,.15,.18],'courtyardShadow');q([[C.far,.2485,C.south],[C.far,.2485,C.north],[C.far+.20,.2485,C.north],[C.far+.20,.2485,C.south]],[.21,.20,.15,.17],'courtyardShadow');
 group='site-context-shadows';for(const polygon of roofShadows)shadow(polygon,.1315,.19,[-46,16,-30,25]);
 const selectBounds=predicate=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of parts)if(predicate(p))p.vertices.forEach((v,k)=>{min[k%3]=Math.min(min[k%3],v);max[k%3]=Math.max(max[k%3],v);});return{min,max};};
 const bounds=boundsOf(0),focusBounds=selectBounds(p=>p.group.startsWith('courtyard-')&&p.material!=='courtyardShadow'),architectureBounds={min:[...focusBounds.min],max:[9.90,Math.max(6.22,focusBounds.max[1]),focusBounds.max[2]]};
 const siteBounds=selectBounds(p=>(p.group.startsWith('courtyard-')||p.group.startsWith('site-context-'))&&p.material!=='courtyardShadow'),presentationBounds={min:[...siteBounds.min],max:[...siteBounds.max]};
 const walkBounds={min:[C.far+.62,.245,C.south+.26],max:[C.near-.35,4.0,gback-.63]},walk={eye:[-7.50,2.095,.80],target:[-24.3,2.00,-1.40],fovDegrees:55};
 const collisionBoxes=[
  {name:'basin',min:[bx-.15,.24,bz-.15],max:[bx+bw+.15,.60,bz+bd+.15]},
  {name:'palm bed',min:[-23.60,.24,-8.15],max:[-19.50,.48,-6.18]},
  {name:'annex return pier',min:[-5.85,.24,C.south-.37],max:[-5.35,1.27,C.south+2.13]},
  {name:'bench',min:[-24.75,.24,4.09],max:[-21.65,1.1,4.99]},
  {name:'left planter',min:[-20.80,.24,3.92],max:[-19.80,1.7,4.92]},
  {name:'right planter',min:[-24.66,.24,-6.76],max:[-23.66,1.5,-5.76]}
 ];
 // Walkers may pass through the four open bays and into the shaded gallery.
 collisionBoxes.push({name:'gallery rear wall',min:[ax,.24,gback-.50],max:[ax+alen,4.30,gback]},{name:'gallery west return',min:[ax,.24,az],max:[ax+.50,4.30,gback]},{name:'gallery east return',min:[ax+alen-.50,.24,az],max:[ax+alen,4.30,gback]},{name:'low gallery connection',min:[ax+alen,.24,C.north],max:[C.near,.95,C.north+.45]});
 let pierStart=ax;for(const o of [...galleryArches].sort((a,b)=>b.u-a.u)){const lo=-o.u-o.w,hi=-o.u;if(lo>pierStart)collisionBoxes.push({name:'gallery masonry pier',min:[pierStart,.24,az-.17],max:[lo,4.3,az+.54]});pierStart=hi;}if(pierStart<ax+alen)collisionBoxes.push({name:'gallery masonry pier',min:[pierStart,.24,az-.17],max:[ax+alen,4.3,az+.54]});
 collisionBoxes.push({name:'gallery-end house',min:[-10.95,.13,5.46],max:[-5.25,4.70,11.20]});
 for(const [x,z,r]of[[-24.65,8.68,.39],[-23.96,8.94,.29],[-17.75,8.98,.34]])collisionBoxes.push({name:'gallery storage jar',min:[x-r,.38,z-r],max:[x+r,1.45,z+r]});
 const contextView={target:[-14.0,2.20,-1.90],yaw:-.67,pitch:.70,span:0,radius:67};
 const layout={clearCourtyardBounds,clearCourtyardArea,dimensions:{length:C.near-C.far,width:C.north-C.south},aperture:[...COURTYARD_OPTICAL_CAMERA.eye],opticalAxisZ:C.axisZ,contextBuildings,roofAccesses,mainBuildings:{hall:{frontX:fx,backX,width:fw,height:fh,groups:['courtyard-hall-walls','courtyard-hall-openings','courtyard-hall-roof']},gallery:{length:alen,depth:gback-az,bays:4,groups:['courtyard-gallery-walls','courtyard-gallery-arches','courtyard-gallery-roof']},wing:{length:wingW,depth:wingDepth,groups:['courtyard-wing-walls','courtyard-wing-openings','courtyard-wing-roof']}},note:'Spatial proportions and architectural fittings are artistic reconstruction dimensions.'};
 return{parts,bounds,focusBounds,architectureBounds,siteBounds,presentationBounds,contextView,layout,walkBounds,collisionBoxes,cameras:{walk,courtyard:walk,context:contextView},landmarks:{courtyard:[-16.4,1.8,-1.4],facade:[fx,2.45,-1.4],basin:[bx+bw/2,.50,bz+bd/2],palm:[-21.55,3.5,-6.82],context:contextView.target,pinhole:[...COURTYARD_OPTICAL_CAMERA.eye]},opticalCamera:{...COURTYARD_OPTICAL_CAMERA,eye:[...COURTYARD_OPTICAL_CAMERA.eye],target:[fx,2.72,-1.4]},metadata:{title:'The courtyard before the aperture',description:'A broad walkable court with a deep hall, four shaded gallery bays, a larger basin, connected lanes and fully articulated neighbouring houses. The same meshes supply the inverted projection.',dimensions:'Artistic design units; the projection framing is illustrative.'}};
}
