import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,exactFile} from './build-index.mjs';
export function createPreview({root=ROOT,prefix='/HERSTORY/'}={}) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(prefix)) throw Error('Prefix must be / or /repository-name/');
  return http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      if(!url.pathname.startsWith(prefix)) {res.writeHead(404);res.end('Outside repository prefix');return;}
      let relative=decodeURIComponent(url.pathname.slice(prefix.length));
      if(!relative || relative.endsWith('/'))relative+='index.html';
      // Serve only site artifacts; research, scripts, prototypes and private config are never preview roots.
      if(!/^(?:index\.html|en\/index\.html|(?:en\/)?(?:about\/index\.html|exhibitions\/[a-z0-9-]+\/index\.html)|assets\/(?:css|js|images|fonts)\/.+)$/.test(relative))throw Error('Not a site artifact');
      const file=await exactFile(root,relative);
      const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'}[path.extname(file)];
      res.writeHead(200,{'Content-Type':type||'application/octet-stream','Cache-Control':'no-store'});res.end(await fs.readFile(file));
    }catch{res.writeHead(404);res.end('Not found');}
  });
}
if(import.meta.main) {
  try {
    const args=process.argv.slice(2);let prefix='/HERSTORY/',port=8030,root=ROOT;
    while(args.length){const a=args.shift();if(a==='--prefix')prefix=args.shift();else if(a==='--port')port=Number(args.shift());else if(a==='--submission')root=path.join(ROOT,'_site');else throw Error(`Unknown option: ${a}`);}
    if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
    const server=createPreview({root,prefix});server.on('error',e=>{console.error(e.message);process.exitCode=1;});
    server.listen(port,'127.0.0.1',()=>console.log(`HERSTORY local preview: http://127.0.0.1:${port}${prefix}index.html`));
  }catch(e){console.error(e.message);process.exitCode=1;}
}

