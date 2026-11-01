import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv.includes('--source');
const root = path.join(project, source ? '.' : 'dist');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const server = http.createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try {
    const decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(part=>part.startsWith('.'))) {res.writeHead(403);res.end();return;}
    let rel=decoded.replace(/^\/+/, '') || 'index.html';
    // An optional base path is useful for verifying GitHub Pages subpath deploys.
    const prefix=process.env.TEST_BASE_PATH?.replace(/^\/|\/$/g,'');
    if(prefix && rel.startsWith(prefix+'/')) rel=rel.slice(prefix.length+1);
    let filename=path.resolve(root,rel);
    if (filename!==root && !filename.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    if(source && !rel.startsWith('src/') && rel!=='index.html') filename=path.resolve(project,'public',rel);
    let info=await stat(filename);
    if(info.isDirectory()) {filename=path.join(filename,'index.html');info=await stat(filename);}
    if(!info.isFile()){res.writeHead(404);res.end();return;}
    const content=await readFile(filename);
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':content.length});
    res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('파일을 찾지 못했어요. 먼저 npm run build를 실행해 주세요.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Lotto Life Local: http://127.0.0.1:${port}/ ${source?'(source)':'(dist)'}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
