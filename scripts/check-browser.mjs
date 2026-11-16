import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {ROOT} from './build-index.mjs';
import {createPreview} from './preview.mjs';
const report={date:'2026-11-16',environment:'Windows Chrome Headless / CDP, simulated viewports; no external npm packages',checks:[],errors:[],fonts:{},status:'Not Run'};
const check=(name,pass)=>{report.checks.push({name,pass:!!pass});};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const submission=process.argv.includes('--submission'),reportDir=path.join(ROOT,'docs/qa',submission?'submission-browser':'');
await fs.mkdir(reportDir,{recursive:true});
const prefix='/HERSTORY/',server=createPreview({root:submission?path.join(ROOT,'_site'):ROOT,prefix});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'herstory-browser-'));
const chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',
 '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
],{windowsHide:true,stdio:'ignore'});
let socket,launchError;chrome.on('error',e=>{launchError=e;});
try {
 let port;
 for(let i=0;i<70;i++){
  if(launchError)throw launchError;
  try{port=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(150);}
 }
 if(!port)throw Error('Chrome CDP unavailable; set CHROME_PATH to an installed Chrome executable');
 const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let id=0;const pending=new Map(),events=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p){clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}else events.push(m);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout: '+method));},15000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.text+': '+expression);
  return result.result.value;
 };
 for(const domain of ['Page','Runtime','Log','Network','DOM','CSS'])await send(domain+'.enable');
 const registry=JSON.parse(await fs.readFile(path.join(ROOT,'data/exhibitions.json'),'utf8'));
 const pages=['index.html','en/index.html','about/index.html','en/about/index.html',...(submission?[]:registry.exhibitions.flatMap(e=>Object.values(e.locales).map(l=>l.path)))];
 async function nav(page){await send('Page.navigate',{url:origin+prefix+page});for(let i=0;i<100;i++){await delay(50);if(await evaluate(`location.href===${JSON.stringify(origin+prefix+page)}&&document.readyState==='complete'`))break;}await evaluate('document.fonts.ready.then(()=>true)');await evaluate('Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))).then(()=>true)');if(!page.includes('#'))await evaluate('scrollTo({top:0,left:0,behavior:"instant"})');await delay(100);}
 async function metrics(width){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});}
 async function shot(name){const s=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(reportDir,name+'.png'),Buffer.from(s.data,'base64'));}
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [320,360,768,1280]){
  await metrics(width);
  for(const page of pages){
   await nav(page);
   check(`${width}:${page}: no horizontal overflow`,await evaluate('document.documentElement.scrollWidth<=innerWidth'));
   check(`${width}:${page}: images loaded`,await evaluate('[...document.images].every(i=>i.complete&&i.naturalWidth>0)'));
   check(`${width}:${page}: no empty main`,await evaluate('document.querySelector("main").innerText.trim().length>30'));
   if(page==='index.html'||page==='en/index.html'){
    check(`${width}:${page}: reduced motion complete`,await evaluate('window.herstoryDiagnostics().writing.complete&&window.herstoryDiagnostics().reduced'));
    if(width===360||width===1280)await shot(`home-${page.startsWith('en/')?'en':'zh'}-${width}`);
   }
   if(page==='exhibitions/nushu/index.html'&&width===1280)await shot('nushu-zh-1280');
  }
 }
 // Real navigation across each pair, preserving a shared source/method fragment.
 await metrics(1280);
 for(const page of pages){
  const hash=page.includes('about/')?'#method':'#sources';await nav(page+hash);
  const expected=origin+prefix+(page.startsWith('en/')?page.slice(3):'en/'+page)+hash;
  await evaluate('document.querySelector("[data-language-switch]").click()');await delay(250);
  check(`${page}: language switch preserves section`,await evaluate(`location.href===${JSON.stringify(expected)}&&!!document.getElementById(location.hash.slice(1))`));
 }
 // Native keyboard activation; no replacement interaction implementation.
 await nav('en/index.html');await evaluate('document.querySelector("#reveal").focus()');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});
 check('English reveal via keyboard',await evaluate(`window.herstoryDiagnostics().revealed&&document.querySelector("#reveal-label").textContent===${JSON.stringify('Close note')}`));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
 check('Escape closes and restores focus',await evaluate('!window.herstoryDiagnostics().revealed&&document.activeElement.id==="reveal"'));
 await evaluate('document.querySelector(".entry").click()');await delay(200);
 check('Homepage CTA targets index, not draft Nushu',await evaluate('location.hash==="#exhibitions"&&document.activeElement.id==="exhibitions"'));
 // Read actual font usage; new Chinese text may use the explicit system-serif fallback.
 for(const page of ['index.html','en/index.html']){
  await nav(page);const root=(await send('DOM.getDocument')).root.nodeId;
  for(const selector of ['#opening','.masthead','.category p']){
   const nodeId=(await send('DOM.querySelector',{nodeId:root,selector})).nodeId;
   report.fonts[page+':'+selector]=(await send('CSS.getPlatformFontsForNode',{nodeId})).fonts;
  }
 }
 // Both languages and every deep page still have readable content without script execution.
 await metrics(360);
 await send('Emulation.setScriptExecutionDisabled',{value:true});
 for(const page of pages){await nav(page);check(`${page}: no JS reading`,await evaluate('document.querySelector("main").innerText.length>30&&!document.body.classList.contains("enhanced")'));
  if(page==='en/index.html'){await shot('home-en-nojs-360');check('No JS artwork image fallback',await evaluate('document.querySelector(".fallback img").naturalWidth>0&&document.querySelector(".fallback img").currentSrc.endsWith("fibres-still-mobile.svg")&&getComputedStyle(document.querySelector("#explore")).display==="none"'));}}
 await send('Emulation.setScriptExecutionDisabled',{value:false});
 // Motion model is unchanged; verify the integrated production page completes once.
 await metrics(1280);await send('Emulation.setEmulatedMedia',{features:[]});await nav('en/index.html');
 check('normal motion starts',await evaluate('!window.herstoryDiagnostics().writing.complete'));
 for(let i=0;i<150;i++){if(await evaluate('window.herstoryDiagnostics().writing.complete'))break;await delay(100);}
 check('normal motion catches five and leaves two traces',await evaluate('(()=>{const d=window.herstoryDiagnostics();return d.writing.complete&&d.writing.catchEvents===5&&d.writing.glyphs.filter(g=>g.alpha>0).length===2})()'));
 await delay(500);const frames=await evaluate('window.herstoryDiagnostics().frames');await delay(300);
 check('completed artwork stops updating',frames===await evaluate('window.herstoryDiagnostics().frames'));
 report.errors=events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Log.entryAdded'&&e.params.entry.level==='error'||e.method==='Network.responseReceived'&&e.params.response.status>=400).map(e=>e.params);
 check('normal browser console and network clean',report.errors.length===0);
 report.status=report.checks.every(c=>c.pass)?'Pass':'Fail';
 await send('Browser.close').catch(()=>{});
}catch(error){report.status='Blocked';report.errors.push({message:error.message});}
finally{
 socket?.close();chrome.kill();await new Promise(r=>server.close(r));
 // Delete only the unique profile created by this invocation, under the OS temp root.
 if(path.dirname(profile)===path.resolve(os.tmpdir())&&path.basename(profile).startsWith('herstory-browser-')){
  await delay(300);await fs.rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
 }
 await fs.writeFile(path.join(reportDir,'browser-results.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`${report.status}: ${report.checks.length} browser checks, ${report.checks.filter(c=>!c.pass).length} failed.`);
if(report.status!=='Pass'){console.error(report.errors,report.checks.filter(c=>!c.pass));process.exitCode=1;}
