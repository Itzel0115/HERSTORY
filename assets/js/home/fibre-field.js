/* HERSTORY original Canvas implementation. Reference concepts and scope: ../round3/REFERENCE_RESEARCH.md.
   No Codrops, Three.js, GSAP or shader source is copied into this file. */
'use strict';
class FibreField {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.w=1;this.h=1;this.mobile=false;
    this.nodes=Array.from({length:3},()=>Array.from({length:65},()=>({x:0,y:0,vx:0,vy:0})));
    // Art-directed guide knots. Each bundle has its own silhouette and tension points.
    this.guides=[[[1.16,-.08],[.94,.25],[.78,.34],[.61,.51],[.64,.69],[.81,.77],[1.14,.78]],[[.68,-.18],[.7,.29],[.89,.38],[.94,.56],[.76,.7],[.55,.81],[-.12,.94]],[[-.1,.79],[.4,.8],[.53,.71],[.7,.66],[.88,.5],[1.12,.21]]];
    this.reveal=0;this.join=0;this.frames=0;this.lastDrawMs=0;
  }
  size(w,h){this.w=w;this.h=h;this.mobile=w<700;const d=Math.min(window.devicePixelRatio||1,this.mobile?1.5:2);this.geometry=null;this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(h*d);this.ctx.setTransform(d,0,0,d,0,0)}
  guide(t,b){
    const g=this.guides[b],s=t*(g.length-1),i=Math.min(g.length-2,Math.floor(s)),f=s-i;
    const p0=g[Math.max(0,i-1)],p1=g[i],p2=g[i+1],p3=g[Math.min(g.length-1,i+2)];
    return [0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*f+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*f*f+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*f*f*f));
  }
  basePoint(t,v,b){
    const a=this.guide(t,b),before=this.guide(Math.max(0,t-.003),b),after=this.guide(Math.min(1,t+.003),b);
    const dx=after[0]-before[0],dy=after[1]-before[1],len=Math.hypot(dx,dy)||1;
    const pinch=1-.73*Math.exp(-Math.pow((t-.4)/.1,2));
    const width=(b===2?.025:.14)*pinch*(.65+.35*Math.sin(t*4+b));
    // Shared low-frequency folds, concentrated at the loosened ends rather than white noise.
    const fold=Math.sin(t*9+b*1.7+v*2.2)*.026*Math.pow(Math.sin(Math.PI*t),2);
    const loose=Math.sin(t*16+v*4.4)*.015*Math.pow(t,3);
    const spread=v*width*Math.cos(t*5+v*.8+b);
    let x=a[0]-dy/len*(spread+fold)+loose;
    let y=a[1]+dx/len*(spread+fold)+loose*.6;
    if(this.mobile){x=(x-.68)*1.7+.5;if(b===1)x+=.85*Math.pow(1-t,4);y=.40+y*.42}
    x*=this.w;y*=this.h;
    return [x,y];
  }
  transform(x,y,n,gather){
    x+=n.x;y+=n.y;
    const cx=this.mobile?this.w*.76:this.w*.81+Math.min(170,this.w*.16)/2,cy=this.mobile?700:this.h*.60+85;
    const rx=x-cx,ry=y-cy,distance=Math.hypot(rx,ry)||1;
    const open=this.reveal*Math.exp(-Math.pow(distance/185,2))*85;
    x+=rx/distance*open;y+=ry/distance*open;
    // Prior-round accumulated story connections remain visible as a small shared gathering.
    x+=(cx-x)*this.join*.025*gather;
    return [x,y];
  }
  point(t,v,b){const p=this.basePoint(t,v,b);return this.transform(p[0],p[1],this.nodes[b][Math.min(64,Math.round(t*64))],Math.sin(Math.PI*t))}
  disturb(x,y,dx,dy){
    for(let b=0;b<3;b++)for(let j=1;j<64;j++){
      const p=this.point(j/64,0,b),r=Math.hypot(p[0]-x,p[1]-y),falloff=Math.exp(-Math.pow(r/140,2));
      const n=this.nodes[b][j];n.vx+=Math.max(-24,Math.min(24,dx))*falloff*7;n.vy+=Math.max(-24,Math.min(24,dy))*falloff*7;
    }
  }
  step(dt){let energy=0;for(const bundle of this.nodes)for(const n of bundle){n.vx=(n.vx-n.x*65*dt)*Math.exp(-11*dt);n.vy=(n.vy-n.y*65*dt)*Math.exp(-11*dt);n.x+=n.vx*dt;n.y+=n.vy*dt;energy+=Math.abs(n.x)+Math.abs(n.y)+Math.abs(n.vx)+Math.abs(n.vy)}return energy}
  clearMotion(){for(const bundle of this.nodes)for(const n of bundle){n.x=n.y=n.vx=n.vy=0}}
  draw(){
    const started=performance.now(),c=this.ctx;c.clearRect(0,0,this.w,this.h);
    // Cache the unchanged guide geometry; only local displacement/reveal is redrawn.
    if(!this.geometry)this.geometry=new Map();
    // The material is built from unequal bundles. No rectilinear crosshatch surface.
    for(let b=2;b>=0;b--){
      const count=b===2?30:this.mobile?92:142;
      for(let i=0;i<count;i++){
        const fraction=(i*.61803398875)%1;
        const cluster=i%3;
        const v=[-.73,-.06,.66][cluster]+(fraction-.5)*[.65,.81,.38][cluster];
        const alpha=((b===2?.13:.24)+(i%9===0?.28:0)+(fraction*.17))*(b===2?.38:b===0?.22:.18);
        c.strokeStyle=b===0?`rgba(222,164,104,${alpha})`:`rgba(239,219,181,${alpha*.8})`;
        c.lineWidth=i%17===0?1.35:i%5===0?.7:.38;
        c.beginPath();const start=i%13===0?.05:0,end=i%11===0?.94:1;
        const key=b*1000+i;
        let points=this.geometry.get(key);
        if(!points){points=[];for(let k=0;k<=96;k++){const t=start+(end-start)*k/96,p=this.basePoint(t,v,b);points.push([p[0],p[1],this.nodes[b][Math.min(64,Math.round(t*64))],Math.sin(Math.PI*t)])}this.geometry.set(key,points)}
        for(let k=0;k<points.length;k++){const p=this.transform(...points[k]);k?c.lineTo(...p):c.moveTo(...p)}c.stroke();
      }
      // Sparse binding marks around one tension point; not a uniform grid.
      if(b<2){c.strokeStyle='rgba(232,188,135,.22)';c.lineWidth=.65;for(let j=0;j<15;j++){let t=.34+j*.005;const a=this.point(t,-.8,b),z=this.point(t,.75,b);c.beginPath();c.moveTo(...a);c.lineTo(...z);c.stroke()}}
    }
    if(this.writer)this.writer.draw();
    this.frames++;this.lastDrawMs=performance.now()-started;
  }
}
window.FibreField=FibreField;
