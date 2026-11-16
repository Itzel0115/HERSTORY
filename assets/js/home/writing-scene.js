/* Original contemporary fibre drawing. No historical person, handwriting or glyph is reconstructed. */
'use strict';
class WritingScene {
  constructor(field){this.field=field;this.elapsed=0;this.duration=12;this.complete=false;this.paused=false;this.started=false;this.catchEvents=0;this.caught=new Set();this.positions=[];
    // A bowed head, shoulder, two forearms and paper are drawn as related fibre paths.
    this.contours=[
      {kind:'hair',n:34,a:.22,knots:[[155,174],[117,104],[129,35],[184,7],[248,23],[278,69],[277,113]]},
      {kind:'face',n:5,a:.35,knots:[[250,38],[279,72],[282,98],[300,117],[280,123],[279,141],[255,158],[226,151],[216,178],[231,201]]},
      {kind:'back',n:26,a:.2,knots:[[172,158],[147,189],[103,213],[80,271],[62,353],[34,443],[-30,487]]},
      {kind:'shoulder',n:20,a:.24,knots:[[170,188],[204,194],[245,223],[247,267],[216,325],[182,378]]},
      {kind:'arm',n:15,a:.26,knots:[[149,239],[156,283],[145,341],[155,380],[223,383],[291,360],[360,329],[386,323]]},
      {kind:'arm',n:10,a:.26,knots:[[220,277],[226,315],[267,332],[320,330],[365,311],[392,310],[410,322]]},
      {kind:'hand',n:3,a:.5,knots:[[365,329],[385,322],[404,321],[415,329],[409,335],[390,334]]},
      {kind:'hand',n:3,a:.42,knots:[[381,311],[397,306],[414,315],[419,325]]},
      {kind:'hairflow',n:28,a:.13,knots:[[166,29],[130,107],[151,166],[133,214],[102,304],[55,431],[-95,493]]}
    ];
  }
  layout(){const f=this.field;const scale=f.mobile?f.w*.94/600:Math.min(f.w*.46/600,f.h*.61/500);return {x:f.mobile?f.w*.015:f.w*.53,y:f.mobile?420:f.h*.27,s:scale}}
  local(x,y){const l=this.layout();return[l.x+x*l.s,l.y+y*l.s]}
  spline(t,knots){const s=Math.max(0,Math.min(1,t))*(knots.length-1),i=Math.min(knots.length-2,Math.floor(s)),u=s-i,p0=knots[Math.max(0,i-1)],p1=knots[i],p2=knots[i+1],p3=knots[Math.min(knots.length-1,i+2)];return[0,1].map(k=>.5*(2*p1[k]+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u))}
  support(t){const p=this.spline(t,[[10,446],[155,410],[282,371],[420,346],[560,362]]),w=this.local(...p);const n=this.field.nodes[0][Math.round(t*64)];return[w[0]+n.x*.3,w[1]+n.y*.3]}
  step(dt){if(this.complete||this.paused||!this.started)return false;this.elapsed=Math.min(this.duration,this.elapsed+dt);if(this.elapsed>=this.duration)this.complete=true;return !this.complete}
  reset(reduced=false){this.elapsed=reduced?this.duration:0;this.complete=reduced;this.started=true;this.caught.clear();this.catchEvents=0;this.positions=[]}
  finish(){this.elapsed=this.duration;this.complete=true;this.started=true;this.caught.clear();this.positions=[]}
  drawFigure(){const c=this.field.ctx,l=this.layout(),f=this.field;
    const sizeKey=f.w+":"+f.h;if(this.sizeKey!==sizeKey){this.sizeKey=sizeKey;this.contourCache=new Map()}
    // Broad translucent contour layers make the pose legible without a filled silhouette.
    for(const part of this.contours){const count=f.mobile?Math.ceil(part.n*.72):part.n;
      for(let i=0;i<count;i++){const spread=(i/(count-1||1)-.5),shift=spread*(part.kind==='hair'?28:part.kind==='hairflow'?35:part.kind==='hand'?3:14);
        c.beginPath();c.strokeStyle='rgba(231,204,164,'+(part.a*(i%5===0?1.7:.8))+')';c.lineWidth=i%9===0?.95:.42;
        const key=this.contours.indexOf(part)*100+i;let points=this.contourCache.get(key);
        if(!points){points=[];for(let k=0;k<=64;k++){const t=k/64,p=this.spline(t,part.knots),q=this.spline(Math.min(1,t+.004),part.knots),dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1;points.push([l.x+(p[0]-dy/len*shift)*l.s,l.y+(p[1]+dx/len*shift)*l.s,f.nodes[1][Math.round(t*64)]])}this.contourCache.set(key,points)}
        for(let k=0;k<points.length;k++){const p=points[k],x=p[0]+p[2].x*.1,y=p[1]+p[2].y*.1;k?c.lineTo(x,y):c.moveTo(x,y)}c.stroke();
      }
    }
    // Pen and paper plane: no writing is drawn onto the archival image.
    c.strokeStyle='rgba(240,216,174,.64)';c.lineWidth=1.1;c.beginPath();c.moveTo(...this.local(397,285));c.lineTo(...this.local(421,347));c.stroke();
    for(let i=0;i<5;i++){c.strokeStyle='rgba(211,165,108,'+(.2-i*.025)+')';c.lineWidth=.7;c.beginPath();c.moveTo(...this.local(404,355+i*3));c.lineTo(...this.local(570,373+i*3));c.lineTo(...this.local(603,455+i*3));c.stroke()}
    // The catching strand runs continuously into the writing point.
    for(let i=0;i<9;i++){c.strokeStyle='rgba(226,185,127,'+(i===4?.65:.15)+')';c.lineWidth=i===4?1:.45;c.beginPath();for(let k=0;k<=80;k++){const p=this.support(k/80);k?c.lineTo(p[0],p[1]+(i-4)*1.1):c.moveTo(p[0],p[1]+(i-4)*1.1)}c.stroke()}
  }
  glyphState(i){const f=this.field,chars=f.mobile?['她','寫','留']:['她','寫','書','記','留'],ch=chars[i];if(!ch)return null;
    const age=this.elapsed-(1.35+i*.68),catchT=f.mobile?[.24,.49,.68][i]:[.12,.3,.48,.66,.85][i],fall=2.25,bounce=.85,slide=2.65;
    const catchP=this.support(catchT),markT=i===1?.7:.75;let x=catchP[0],y=catchP[1]-8,alpha=0,stage='waiting';
    if(age>=0&&age<fall){const q=age/fall;const height=f.mobile?128:175;x-=Math.sin(q*Math.PI)*7;y-=height*(1-q*q);alpha=Math.min(1,q*4)*.86;stage='falling'}
    else if(age>=fall&&age<fall+bounce){const q=(age-fall)/bounce;y+=Math.sin(q*Math.PI*2.2)*Math.exp(-q*3)*10;alpha=.88;stage='caught';if(!this.caught.has(i)){this.caught.add(i);this.catchEvents++;f.disturb(x,y,0,2.5)}}
    else if(age>=fall+bounce){const q=Math.min(1,(age-fall-bounce)/slide),s=q*q*(3-2*q),target=(i===1||i===chars.length-1)?markT:Math.min(.94,catchT+.16),p=this.support(catchT+(target-catchT)*s);x=p[0];y=p[1]-8;stage=q<1?'sliding':'trace';const permanent=i===1||i===chars.length-1;alpha=q<1?.85:permanent?.42:Math.max(0,.85-(age-fall-bounce-slide)*.7);if(i===1&&q===1)y-=13;}
    return{ch,x,y,alpha,stage};
  }
  draw(){this.drawFigure();const c=this.field.ctx;this.positions=[];const count=this.field.mobile?3:5;
    c.font=(this.field.mobile?'19':'24')+'px "Herstory Reading", "Source Han Serif TC", "PMingLiU", serif';c.textAlign='center';c.textBaseline='bottom';
    for(let i=0;i<count;i++){const p=this.glyphState(i);this.positions.push(p);if(p.alpha>0){c.fillStyle='rgba(243,222,186,'+p.alpha+')';c.fillText(p.ch,p.x,p.y)}}
  }
}
window.WritingScene=WritingScene;
