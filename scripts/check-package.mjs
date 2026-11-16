import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ROOT,exactFile} from './build-index.mjs';
import {PUBLIC_PAGES,PUBLIC_ASSETS} from './package-site.mjs';
import {createPreview} from './preview.mjs';
const root=path.join(ROOT,'_site'),report={date:new Date().toISOString(),scope:'W9 deployment artifact only',prefixes:[],errors:[]};
async function walk(dir){return(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.relative(root,path.join(dir,e.name)).replaceAll('\\','/')))).flat();}
try{
 assert.deepEqual((await walk(root)).sort(),[...PUBLIC_PAGES,...PUBLIC_ASSETS,'.nojekyll'].sort(),'Unexpected or missing public files');
 for(const prefix of ['/','/HERSTORY/','/review-repository/']){
  const server=createPreview({root,prefix});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`,queue=[...PUBLIC_PAGES,...PUBLIC_ASSETS].map(p=>origin+prefix+p),seen=new Set();let links=0;
  try{
   while(queue.length){const href=queue.shift();if(seen.has(href))continue;seen.add(href);const u=new URL(href);assert.ok(u.pathname.startsWith(prefix),'Escaped project prefix');
    const response=await fetch(href);assert.equal(response.status,200,href);const text=await response.text();
    if(u.hash){const anchor=decodeURIComponent(u.hash.slice(1));assert.ok(text.includes(`id="${anchor}"`),`Missing anchor ${href}`);}
    const rel=decodeURIComponent(u.pathname.slice(prefix.length));await exactFile(root,rel);
    if(rel.endsWith('.html')||rel.endsWith('.css')){
     const refs=[...text.matchAll(/(?:href|src)="([^"]+)"/g),...text.matchAll(/url\(['"]?([^'"\s)]+)['"]?\)/g)];
     for(const m of refs){if(/^(?:https?:|data:|mailto:)/.test(m[1]))continue;const next=new URL(m[1],href);assert.equal(next.origin,origin);queue.push(next.href);links++;}
    }
   }
   for(const denied of ['docs/phase3.1/research/cheese-desktop.png','data/exhibitions.json','exhibitions/nushu/index.html','assets/images/nushu/nushu-tao-kai-2014.jpg'])assert.equal((await fetch(origin+prefix+denied)).status,404,denied);
   report.prefixes.push({prefix,resources:seen.size,links,status:'Pass'});
  }finally{await new Promise(r=>server.close(r));}
 }
 report.status='Pass';
}catch(e){report.status='Fail';report.errors.push(e.message);process.exitCode=1;}
await fs.mkdir(path.join(ROOT,'docs/qa'),{recursive:true});await fs.writeFile(path.join(ROOT,'docs/qa/submission-package.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
