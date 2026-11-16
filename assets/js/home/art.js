/* Refines Round 2's selected-thread state, native controls and static reading fallback. */
'use strict';
(()=>{
  const scene=document.querySelector('.scene'),canvas=document.querySelector('#weave');
  if(!scene||!canvas)return;
  const en=document.documentElement.lang==='en';
  const t=(zh,english)=>en?english:zh;
  const field=new window.FibreField(canvas);if(!field.ctx)return;
  const writer=new window.WritingScene(field);field.writer=writer;
  const pauseButton=document.querySelector("#pause-writing");
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),selected=new Set();
  const reveal=document.querySelector('#reveal'),image=document.querySelector('#reveal-image'),status=document.querySelector('#weave-status');
  let frame=0,last=0,revealed=false,desired=0,joined=0,visible=true,hoverTimer=0,lastPointer=null;
  document.body.classList.add('enhanced');scene.dataset.revealed='false';image.setAttribute('aria-hidden','true');
  function paint(now){
    frame=0;if(!visible||document.hidden)return;
    const elapsed=Math.min((now-last)/1000||.016,.1),dt=Math.min(elapsed,.032);last=now;
    if(motion.matches){field.clearMotion();writer.finish();pauseButton.disabled=true;field.reveal=desired;field.join=joined;field.draw();return}
    field.reveal+=(desired-field.reveal)*(1-Math.exp(-dt*6));field.join+=(joined-field.join)*(1-Math.exp(-dt*7));
    const energy=field.step(dt),writingActive=writer.step(elapsed);field.draw();pauseButton.disabled=writer.complete;
    if(writingActive||energy>.8||Math.abs(desired-field.reveal)>.001||Math.abs(joined-field.join)>.001)frame=requestAnimationFrame(paint);
    else{field.clearMotion();field.reveal=desired;field.join=joined;field.draw()}
  }
  function wake(){if(!frame&&visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(paint)}}
  function open(value){scene.classList.add('has-interacted');revealed=value;desired=value?1:0;scene.dataset.revealed=String(value);reveal.setAttribute('aria-expanded',String(value));image.setAttribute('aria-hidden',String(!value));document.querySelector('#reveal-label').textContent=value?t('收起說明','Close note'):t('展開作品說明','Reveal Artwork note');document.querySelector('.reveal-mark').textContent=value?'−':'＋';status.textContent=value?t('作品說明已展開。','Artwork note revealed.'):t('說明已收起。','Note closed.');wake()}
  reveal.addEventListener('click',()=>open(!revealed));
  function cancelHover(){clearTimeout(hoverTimer);hoverTimer=0}
  scene.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||motion.matches)return;
    const r=canvas.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;
    if(lastPointer){field.disturb(x,y,x-lastPointer.x,y-lastPointer.y);wake()}lastPointer={x,y};
    const b=reveal.getBoundingClientRect(),near=Math.hypot(event.clientX-b.x-b.width/2,event.clientY-b.y-b.height/2)<90;
    if(near&&!revealed&&!hoverTimer)hoverTimer=setTimeout(()=>{hoverTimer=0;open(true)},500);
    if(!near)cancelHover();
  });
  scene.addEventListener('pointerleave',()=>{lastPointer=null;cancelHover();wake()});
  reveal.addEventListener('pointerdown',cancelHover);
  document.querySelector('#touch-fibres').addEventListener('click',()=>{if(motion.matches){status.textContent=t('已啟用減少動態；可直接翻開說明閱讀。','Reduced motion is enabled. Reveal the note to read it.');return}const p=field.point(.43,0,0);field.disturb(p[0],p[1],18,-16);status.textContent=t('纖維會逐漸復原；可翻開說明，繼續閱讀。','The fibres will settle. Reveal the note to continue reading.');wake()});
  const copy=[t('已選取書寫線索，作品說明已展開。','Writing selected; Artwork note revealed.'),t('已選取空間線索。','Space selected.'),t('已選取日常線索。','Everyday life selected.')];
  document.querySelectorAll('[data-thread]').forEach(button=>button.addEventListener('click',()=>{const n=Number(button.dataset.thread);selected.has(n)?selected.delete(n):selected.add(n);button.setAttribute('aria-pressed',String(selected.has(n)));joined=selected.size/3;if(n===0&&selected.has(n))open(true);status.textContent=selected.has(n)?copy[n]:t('已移除這條線索，其餘選取仍保留。','Thread removed; other selections remain.');wake()}));
  pauseButton.addEventListener('click',()=>{writer.paused=!writer.paused;pauseButton.setAttribute('aria-pressed',String(writer.paused));pauseButton.textContent=writer.paused?t('繼續落字','Resume writing'):t('暫停落字','Pause writing');wake()});
  document.querySelector('#reset').addEventListener('click',()=>{writer.paused=false;writer.reset(motion.matches);pauseButton.disabled=motion.matches;pauseButton.setAttribute('aria-pressed','false');pauseButton.textContent=t('暫停落字','Pause writing');selected.clear();joined=0;document.querySelectorAll('[data-thread]').forEach(b=>b.setAttribute('aria-pressed','false'));open(false);field.clearMotion();lastPointer=null;cancelHover();wake()});
  scene.addEventListener('keydown',e=>{if(e.key==='Escape'&&revealed){open(false);reveal.focus()}});
  document.querySelector('.entry').addEventListener('click',()=>document.querySelector('#exhibitions').focus({preventScroll:true}));
  new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();field.size(r.width,r.height);field.draw();wake()}).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.01;if(!visible){cancelAnimationFrame(frame);frame=0;field.clearMotion();cancelHover()}else wake()},{threshold:.01}).observe(scene);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;cancelHover();field.clearMotion()}else wake()});
  motion.addEventListener('change',()=>{if(motion.matches)writer.finish();cancelAnimationFrame(frame);frame=0;cancelHover();field.clearMotion();lastPointer=null;wake()});
  // Read-only diagnostic surface for the local QA recorder; does not accept commands.
  window.herstoryDiagnostics=()=>({writing:{elapsed:writer.elapsed,complete:writer.complete,paused:writer.paused,count:field.mobile?3:5,catchEvents:writer.catchEvents,glyphs:writer.positions.map(p=>({ch:p.ch,stage:p.stage,alpha:p.alpha,x:p.x,y:p.y}))},frames:field.frames,drawMs:field.lastDrawMs,revealed,reduced:motion.matches,selected:[...selected],animationPending:!!frame});
Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1500))]).then(()=>{if(!writer.started)writer.reset(motion.matches);wake()});
})();
