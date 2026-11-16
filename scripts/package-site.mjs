// Curated W9 demonstration output, separate from the ten-page development site.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,build,exactFile} from './build-index.mjs';
export const PUBLIC_PAGES=['index.html','en/index.html','about/index.html','en/about/index.html'];
export const PUBLIC_ASSETS=[
 'assets/css/fonts.css','assets/css/round5.css','assets/css/site.css',
 'assets/js/site.js','assets/js/home/art.js','assets/js/home/fibre-field.js','assets/js/home/writing-scene.js',
 'assets/images/home/fibres-still.svg','assets/images/home/fibres-still-mobile.svg',
 'assets/fonts/herstory-reading.woff2','assets/fonts/cormorant-regular.woff2','assets/fonts/cormorant-italic.woff2',
 'assets/fonts/OFL-SourceHanSerif.txt','assets/fonts/OFL-CormorantGaramond.txt'
];
export async function packageSite(){
 await build({check:true});
 const registry=JSON.parse(await fs.readFile(path.join(ROOT,'data/exhibitions.json'),'utf8'));
 if(registry.exhibitions.some(e=>e.status!=='draft'))throw Error('W9 package only supports the reviewed all-draft baseline; review publication scope first.');
 const output=path.resolve(ROOT,'_site');
 // Never delete a supplied or computed arbitrary directory. Only this generated child.
 try {const s=await fs.lstat(output);if(s.isSymbolicLink()||!s.isDirectory())throw Error('Unsafe _site');}catch(e){if(e.code!=='ENOENT')throw e;}
 if(path.dirname(output)!==ROOT||path.basename(output)!=='_site')throw Error('Unsafe output');
 await fs.rm(output,{recursive:true,force:true});await fs.mkdir(output);
 for(const rel of [...PUBLIC_PAGES,...PUBLIC_ASSETS]){
  const bytes=await fs.readFile(await exactFile(ROOT,rel));
  const target=path.join(output,rel);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);
 }
 await fs.writeFile(path.join(output,'.nojekyll'),'');
 console.log(`Pass: ${PUBLIC_PAGES.length} public demonstration pages, ${PUBLIC_ASSETS.length} cleared assets; drafts and research excluded.`);
 return output;
}
if(import.meta.main)try{await packageSite();}catch(e){console.error(e.message);process.exitCode=1;}
