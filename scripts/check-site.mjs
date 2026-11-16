import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,build,CATEGORIES,exactFile} from './build-index.mjs';
import {createPreview} from './preview.mjs';
await build({check:true});
const registry=JSON.parse(await fs.readFile(path.join(ROOT,'data/exhibitions.json'),'utf8'));
const pages=['index.html','en/index.html','about/index.html','en/about/index.html',...registry.exhibitions.flatMap(e=>Object.values(e.locales).map(l=>l.path))];
const report={pages:pages.length,checks:0,errors:[],prefixes:[]};
const check=(pass,label)=>{report.checks++;if(!pass)report.errors.push(label);};
for(const rel of pages){
 const html=await fs.readFile(await exactFile(ROOT,rel),'utf8'),en=rel.startsWith('en/');
 const paired=en?rel.slice(3):'en/'+rel,other=await fs.readFile(path.join(ROOT,paired),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 check(new Set(ids).size===ids.length,rel+': duplicate IDs');
 check(JSON.stringify([...ids].sort())===JSON.stringify([...other.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).sort()),rel+': bilingual IDs');
 check((html.match(/<h1\b/g)||[]).length===1,rel+': h1');
 check(html.includes('<html lang="'+(en?'en':'zh-Hant')+'"'),rel+': language');
 const language=html.match(/data-language-switch href="([^"]+)"/)?.[1];
 check(!!language&&path.posix.normalize(path.posix.join(path.posix.dirname(rel),language))===paired,rel+': language target');
 check(CATEGORIES.every(id=>html.slice(html.indexOf('<footer>')).includes('index.html#'+id)),rel+': footer areas');
}
for(const prefix of ['/','/HERSTORY/','/review-repository/']){
 const server=createPreview({prefix});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,queue=pages.map(p=>origin+prefix+p),seen=new Set();
 try{while(queue.length){
 const href=queue.shift();if(seen.has(href))continue;seen.add(href);const u=new URL(href);
 check(u.pathname.startsWith(prefix),href+': prefix');
 const response=await fetch(href),body=await response.text();check(response.status===200,href+': HTTP '+response.status);
 if(u.hash)check(body.includes('id="'+decodeURIComponent(u.hash.slice(1))+'"'),href+': anchor');
 if(/\.(html|css)$/.test(u.pathname))for(const m of [...body.matchAll(/(?:href|src)="([^"]+)"/g),...body.matchAll(/url\(['"]?([^'"\s)]+)['"]?\)/g)]){
 if(/^(https?:|data:|mailto:)/.test(m[1]))continue;queue.push(new URL(m[1],href).href);
 }
 }report.prefixes.push({prefix,targets:seen.size});}finally{await new Promise(r=>server.close(r));}
}
report.status=report.errors.length?'Fail':'Pass';
await fs.mkdir(path.join(ROOT,'docs/qa'),{recursive:true});await fs.writeFile(path.join(ROOT,'docs/qa/site-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));if(report.errors.length)process.exitCode=1;
