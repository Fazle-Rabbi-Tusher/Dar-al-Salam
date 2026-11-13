// Depth-buffered Canvas backend for the detailed dark-room geometry.
// Uses directional illumination and restrained view-dependent environment sheen.
export class SoftwareSurface {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});if(!this.ctx)throw new Error('Your browser could not open the interactive canvas.');this.triangles=[];}
  begin(matrix,eye,white){this.matrix=matrix;this.eye=eye;this.white=white;this.triangles=[];this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.ctx.imageSmoothingEnabled=false;}
  project(p){const m=this.matrix,w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15],iw=1/w;return [((m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])*iw+1)*this.canvas.width/2,(1-(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])*iw)*this.canvas.height/2,(m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14])*iw,iw,w];}
  draw(vertices,texture,tint,back,lighting,material={strength:0,power:28}){
    const exterior=material.exterior===true,exposure=exterior?1:(material.exposure??.70), sunlight=exterior||material.sunlight!==false;
    const kxx=exterior?.65:-.72,kl=Math.hypot(kxx,1,.52),fl=Math.hypot(.65,.35,.55),kx=kxx/kl,ky=1/kl,kz=.52/kl,fx=.65/fl,fy=.35/fl,fz=-.55/fl;
    const eye=this.eye,m=this.matrix,cw=this.canvas.width/2,ch=this.canvas.height/2;
    const perspective=Math.abs(m[3])+Math.abs(m[7])+Math.abs(m[11])>1e-8;
    const project=o=>{const x=vertices[o],y=vertices[o+1],z=vertices[o+2],w=m[3]*x+m[7]*y+m[11]*z+m[15],iw=1/w;return [((m[0]*x+m[4]*y+m[8]*z+m[12])*iw+1)*cw,(1-(m[1]*x+m[5]*y+m[9]*z+m[13])*iw)*ch,(m[2]*x+m[6]*y+m[10]*z+m[14])*iw,iw,w];};
    for(let o=0;o<vertices.length;o+=24){let nx=vertices[o+3],ny=vertices[o+4],nz=vertices[o+5];const front=nx*(eye[0]-vertices[o])+ny*(eye[1]-vertices[o+1])+nz*(eye[2]-vertices[o+2])>0;if(!front&&!back)continue;
      const tex=!front&&back?back:texture;if(!front){nx=-nx;ny=-ny;nz=-nz;}
      const points=[project(o),project(o+8),project(o+16)];
      if(perspective&&points.every(p=>p[4]<=0))continue;
      // Eye-height views can straddle a roof, paving slab or wall. Clip crossing
      // triangles to the near plane instead of dropping their visible portion.
      if(perspective&&!material.nearClipped&&points.some(p=>p[4]<=0||p[2]<-1)){
        let polygon=[0,8,16].map(i=>Array.from(vertices.slice(o+i,o+i+8))),clipped=[];
        const distance=p=>(m[2]+m[3])*p[0]+(m[6]+m[7])*p[1]+(m[10]+m[11])*p[2]+m[14]+m[15]-.00001;
        for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);if(da>=0)clipped.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);clipped.push(a.map((v,k)=>v+(b[k]-v)*t));}}
        if(clipped.length>=3){const triangles=[];for(let i=1;i<clipped.length-1;i++)triangles.push(...clipped[0],...clipped[i],...clipped[i+1]);this.draw(triangles,texture,tint,back,lighting,{...material,nearClipped:true});}continue;
      }
      if(points.some(p=>!Number.isFinite(p[0])||p[4]<=0))continue;
      if(points.every(p=>p[0]<0)||points.every(p=>p[0]>cw*2)||points.every(p=>p[1]<0)||points.every(p=>p[1]>ch*2)||points.every(p=>p[2]<-1)||points.every(p=>p[2]>1))continue;
      const area=(points[1][0]-points[0][0])*(points[2][1]-points[0][1])-(points[1][1]-points[0][1])*(points[2][0]-points[0][0]);if(Math.abs(area)<.03)continue;
      const sun=Math.max(0,nx*kx+ny*ky+nz*kz),sky=Math.max(0,nx*fx+ny*fy+nz*fz),up=Math.max(0,ny),down=Math.max(0,-ny);
      const wx=(vertices[o]+vertices[o+8]+vertices[o+16])/3,wy=(vertices[o+1]+vertices[o+9]+vertices[o+17])/3,wz=(vertices[o+2]+vertices[o+10]+vertices[o+18])/3;
      const roomMin=material.roomBounds?.min||[-5,0,-4.15],roomMax=material.roomBounds?.max||[5,5,4.15],wallDistance=Math.min(wx-roomMin[0],roomMax[0]-wx,wz-roomMin[2],roomMax[2]-wz),d=Math.max(0,Math.min(1,(wallDistance-.05)/.9)),ao=exterior?1:1-.18*Math.exp(-Math.max(0,wy)*2)*(1-d*d*(3-2*d));
      const ambient=exterior?.34:.09+.31*exposure,keyPower=exterior?.72:(.10+.42*exposure)*(sunlight?1:.65),fillPower=exterior?.16:.025+.145*exposure;
      const light=lighting?[(ambient+keyPower*sun*1.12+fillPower*sky*.73+.0564*exposure*up)*ao,(ambient+keyPower*sun+fillPower*sky*.87+.0594*exposure*up)*ao,(ambient+keyPower*sun*.79+fillPower*sky+.06*exposure*up)*ao]:[1,1,1];let spec=0;
      if(lighting&&material.strength){let vx=eye[0]-(vertices[o]+vertices[o+8]+vertices[o+16])/3,vy=eye[1]-(vertices[o+1]+vertices[o+9]+vertices[o+17])/3,vz=eye[2]-(vertices[o+2]+vertices[o+10]+vertices[o+18])/3;const vl=Math.hypot(vx,vy,vz)||1;vx=vx/vl+kx;vy=vy/vl+ky;vz=vz/vl+kz;const hl=Math.hypot(vx,vy,vz)||1;spec=Math.pow(Math.max(0,(nx*vx+ny*vy+nz*vz)/hl),material.power||28)*material.strength*sun*(.40+.60*exposure);}
      let reflection=0,environment=[0,0,0],coverage=0,surfaceGlint=0;const glintColour=[.98,.96,.83].map(v=>v*(.70+.30*exposure));
      if(lighting&&material.reflection){
        let vx=eye[0]-(vertices[o]+vertices[o+8]+vertices[o+16])/3,vy=eye[1]-(vertices[o+1]+vertices[o+9]+vertices[o+17])/3,vz=eye[2]-(vertices[o+2]+vertices[o+10]+vertices[o+18])/3;
        const vl=Math.hypot(vx,vy,vz)||1;vx/=vl;vy/=vl;vz/=vl;
        const facing=nx*vx+ny*vy+nz*vz,reflectedX=2*facing*nx-vx,reflectedY=2*facing*ny-vy,reflectedZ=2*facing*nz-vz;
        const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
        const sky=smooth(-.28,.33,reflectedY),horizon=1-smooth(.02,.18,Math.abs(reflectedY));
        const earth=exterior?[.34,.29,.20]:[.18,.17,.12],heavens=exterior?[.49,.66,.73]:[.42,.46,.43];
        environment=earth.map((v,i)=>((v+(heavens[i]-v)*sky)*(.45+.55*exposure)+[.08,.09,.06][i]*horizon)*(.70+.30*tint[i]));
        const edge=Math.pow(1-Math.abs(facing),3);
        reflection=material.reflection*(.40+.60*edge);
        const frontLight=smooth(.05,.45,reflectedZ);
        const leftPanel=(1-smooth(.018,.095,Math.abs(reflectedX+.42)))*smooth(-.25,.15,reflectedY)*(1-smooth(.78,.96,reflectedY))*frontLight;
        const rightPanel=(1-smooth(.012,.055,Math.abs(reflectedX-.50)))*smooth(-.45,-.15,reflectedY)*(1-smooth(.65,.90,reflectedY))*frontLight;
        const panel=exterior?0:Math.min(1,leftPanel+.60*rightPanel)*(.30+.70*exposure);
        if(material.glassy)coverage=Math.min(.76,material.glassy*(.22*edge+.66*panel+.42*spec));
        else surfaceGlint=panel*material.reflection*.74;
      }
      
      const uv=[o,o+8,o+16].map(i=>[(!front&&back?1-vertices[i+6]:vertices[i+6])*tex.width,vertices[i+7]*tex.height]);
      const atmosphere=material.atmosphere?1-Math.exp(-Math.hypot(eye[0]-wx,eye[1]-wy,eye[2]-wz)*.0045):0;
      this.triangles.push({points,uv,tex,tint,light,spec,reflection,environment,coverage,surfaceGlint,glintColour,perspective,atmosphere,depth:(points[0][2]+points[1][2]+points[2][2])/3});
    }
  }
  finish(){
    const w=this.canvas.width,h=this.canvas.height,ctx=this.ctx;
    if(!this.frame||this.frame.width!==w||this.frame.height!==h){this.frame=ctx.createImageData(w,h);this.zBuffer=new Float32Array(w*h);}
    const out=this.frame.data,depth=this.zBuffer;out.fill(0);depth.fill(Infinity);this.cache ||= new WeakMap();
    // Draw opaque geometry first; transparent layers blend back-to-front against it.
    // Perspective views use reciprocal-W interpolation; orthographic views retain the fast path.
    this.triangles.sort((a,b)=>Number(a.tint[3]<.995)-Number(b.tint[3]<.995)||b.depth-a.depth);
    for(const t of this.triangles){
      const p=t.points,s=t.uv,tex=t.tex,white=tex===this.white,light=t.light,tint=t.tint,tw=tex.width,th=tex.height;
      let source=null;if(!white){source=this.cache.get(tex);if(!source){source=tex.getContext('2d').getImageData(0,0,tex.width,tex.height).data;this.cache.set(tex,source);}}
      const den=(p[1][1]-p[2][1])*(p[0][0]-p[2][0])+(p[2][0]-p[1][0])*(p[0][1]-p[2][1]);
      if(Math.abs(den)<1e-9)continue;
      const minX=Math.max(0,Math.floor(Math.min(p[0][0],p[1][0],p[2][0]))),maxX=Math.min(w-1,Math.ceil(Math.max(p[0][0],p[1][0],p[2][0])));
      const minY=Math.max(0,Math.floor(Math.min(p[0][1],p[1][1],p[2][1]))),maxY=Math.min(h-1,Math.ceil(Math.max(p[0][1],p[1][1],p[2][1])));
      const ax=(p[1][1]-p[2][1])/den,ay=(p[2][0]-p[1][0])/den,bx=(p[2][1]-p[0][1])/den,by=(p[0][0]-p[2][0])/den;
      // Shared triangle edges belong to exactly one face, preventing dark glass seams.
      const topLeft=(a,b)=>b[1]<a[1]||(b[1]===a[1]&&b[0]>a[0]);
      const included=(a,b)=>den>0?topLeft(a,b):topLeft(b,a);
      const includeA=included(p[1],p[2]),includeB=included(p[2],p[0]),includeC=included(p[0],p[1]);
      const baseGlint=1-t.surfaceGlint,factor=(1-t.reflection)*baseGlint,rFactor=tint[0]*light[0]*factor,gFactor=tint[1]*light[1]*factor,bFactor=tint[2]*light[2]*factor,specR=((t.spec+t.environment[0]*t.reflection)*baseGlint+t.glintColour[0]*t.surfaceGlint)*255,specG=((t.spec*.94+t.environment[1]*t.reflection)*baseGlint+t.glintColour[1]*t.surfaceGlint)*255,specB=((t.spec*.79+t.environment[2]*t.reflection)*baseGlint+t.glintColour[2]*t.surfaceGlint)*255;
      for(let y=minY;y<=maxY;y++){
        let a=ax*(minX+.5-p[2][0])+ay*(y+.5-p[2][1]),b=bx*(minX+.5-p[2][0])+by*(y+.5-p[2][1]);
        for(let x=minX;x<=maxX;x++,a+=ax,b+=bx){
          const c=1-a-b,epsilon=1e-9;if(a<-epsilon||b<-epsilon||c<-epsilon||(a<=epsilon&&!includeA)||(b<=epsilon&&!includeB)||(c<=epsilon&&!includeC))continue;
          const pixel=y*w+x,z=a*p[0][2]+b*p[1][2]+c*p[2][2];if(z < -1 || z > 1 || z>depth[pixel]+.000001)continue;
          let red,green,blue,alpha=tint[3];
          if(white){red=255*rFactor+specR;green=255*gFactor+specG;blue=255*bFactor+specB;}
          else{
            const iw=t.perspective?a*p[0][3]+b*p[1][3]+c*p[2][3]:1;
            const u=t.perspective?(a*s[0][0]*p[0][3]+b*s[1][0]*p[1][3]+c*s[2][0]*p[2][3])/iw:a*s[0][0]+b*s[1][0]+c*s[2][0];
            const v=t.perspective?(a*s[0][1]*p[0][3]+b*s[1][1]*p[1][3]+c*s[2][1]*p[2][3])/iw:a*s[0][1]+b*s[1][1]+c*s[2][1];
            const tx=Math.min(tw-1,Math.max(0,u|0)),ty=Math.min(th-1,Math.max(0,v|0)),ti=(ty*tw+tx)*4;
            alpha*=source[ti+3]/255;if(alpha<.002)continue;red=source[ti]*rFactor+specR;green=source[ti+1]*gFactor+specG;blue=source[ti+2]*bFactor+specB;
          }
          if(t.coverage){const visibleAlpha=alpha+(1-alpha)*t.coverage,body=alpha*(1-t.coverage);red=(red*body+255*t.glintColour[0]*t.coverage)/visibleAlpha;green=(green*body+255*t.glintColour[1]*t.coverage)/visibleAlpha;blue=(blue*body+255*t.glintColour[2]*t.coverage)/visibleAlpha;alpha=visibleAlpha;}
          if(t.atmosphere){red+=(193.8-red)*t.atmosphere;green+=(196.35-green)*t.atmosphere;blue+=(175.95-blue)*t.atmosphere;}
          const oi=pixel*4;
          if(alpha>.995){out[oi]=red;out[oi+1]=green;out[oi+2]=blue;out[oi+3]=255;depth[pixel]=z;}
          else{const oldAlpha=out[oi+3]/255,newAlpha=alpha+oldAlpha*(1-alpha);if(newAlpha>0){out[oi]=(red*alpha+out[oi]*oldAlpha*(1-alpha))/newAlpha;out[oi+1]=(green*alpha+out[oi+1]*oldAlpha*(1-alpha))/newAlpha;out[oi+2]=(blue*alpha+out[oi+2]*oldAlpha*(1-alpha))/newAlpha;out[oi+3]=newAlpha*255;}}
        }
      }
    }
    ctx.putImageData(this.frame,0,0);
  }
}
