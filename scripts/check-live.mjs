// Read-only HTTP verification of the URL returned by the GitHub Pages API.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,CATEGORIES} from './build-index.mjs';
import {PUBLIC_PAGES,PUBLIC_ASSETS} from './package-site.mjs';
const base=new URL(process.argv[2]);
if(base.protocol!=='https:'||!base.pathname.endsWith('/'))throw Error('Provide the HTTPS Pages URL with trailing slash');
const report={date:new Date().toISOString(),base:base.href,pages:[],assets:[],excluded:[],errors:[]};
const assert=(value,message)=>{if(!value)report.errors.push(message);};
const read=async rel=>{const url=new URL(rel,base);const r=await fetch(url,{signal:AbortSignal.timeout(30000)});return{url:url.href,status:r.status,type:r.headers.get('content-type'),bytes:Buffer.from(await r.arrayBuffer())};};
try{
 const pages=new Map();
 for(const rel of PUBLIC_PAGES){
  const r=await read(rel),html=r.bytes.toString('utf8');pages.set(rel,html);
  report.pages.push({path:rel,url:r.url,status:r.status});assert(r.status===200,`${rel}: HTTP ${r.status}`);
  assert(html.includes(`<html lang="${rel.startsWith('en/')?'en':'zh-Hant'}"`),`${rel}: language`);
  assert(html.includes('W9'),`${rel}: demonstration notice`);
  assert(!html.includes('nushu-tao-kai-2014.jpg'),`${rel}: pending image`);
  if(rel==='index.html'||rel==='en/index.html'){
   for(const id of CATEGORIES)assert(html.includes(`id="${id}"`)&&html.includes(`href="#${id}"`),`${rel}: anchor ${id}`);
   assert(!html.includes('data-exhibition-id='),`${rel}: draft in index`);
  }
 }
 for(const rel of PUBLIC_ASSETS){const r=await read(rel);report.assets.push({path:rel,status:r.status,bytes:r.bytes.length,type:r.type});assert(r.status===200&&r.bytes.length>0&&!r.type?.includes('text/html'),`${rel}: missing asset or HTML response`);}
 // Check every local HTML navigation/asset reference against the published whitelist.
 const allowed=new Set([...PUBLIC_PAGES,...PUBLIC_ASSETS]);
 for(const [rel,html]of pages)for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(/^(?:https?:|data:|mailto:)/.test(m[1]))continue;
  const u=new URL(m[1],new URL(rel,base)),target=decodeURIComponent(u.pathname.slice(base.pathname.length));
  assert(u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&allowed.has(target),`${rel}: unexpected local reference ${m[1]}`);
  if(u.hash)assert(pages.get(target)?.includes(`id="${decodeURIComponent(u.hash.slice(1))}"`),`${rel}: missing anchor ${m[1]}`);
 }
 const registry=JSON.parse(await fs.readFile(path.join(ROOT,'data/exhibitions.json'),'utf8'));
 const denied=[...registry.exhibitions.flatMap(e=>Object.values(e.locales).map(l=>l.path)),'docs/phase3.1/research/cheese-desktop.png','docs/SUBMISSION.md','data/exhibitions.json','assets/images/nushu/nushu-tao-kai-2014.jpg','AGENTS.md','.git/config'];
 for(const rel of denied){const r=await read(rel);report.excluded.push({path:rel,status:r.status});assert(r.status===404,`${rel}: expected 404, got ${r.status}`);}
}catch(e){report.errors.push(e.message);}
report.status=report.errors.length?'Fail':'Pass';
await fs.mkdir(path.join(ROOT,'docs/qa'),{recursive:true});
await fs.writeFile(path.join(ROOT,'docs/qa/submission-live.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));if(report.errors.length)process.exitCode=1;
