import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
// This fixed project-owned directory is the only recursive removal target.
if(path.dirname(dist)!==root||path.basename(dist)!=='dist')throw Error('Invalid output directory');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
await cp(path.join(root,'public'),dist,{recursive:true});
await cp(path.join(root,'src'),path.join(dist,'src'),{recursive:true});
await cp(path.join(root,'index.html'),path.join(dist,'index.html'));
await writeFile(path.join(dist,'.nojekyll'),'');
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
await writeFile(path.join(dist,'build-info.json'),JSON.stringify({name:pkg.name,version:pkg.version,architecture:'static-browser-local',storage:'none'},null,2));
console.log('Built dist: static browser-only game. No dependencies or backend required.');
