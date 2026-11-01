import { readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PRESETS, ENDINGS } from '../src/data.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const file of (await readdir(path.join(root,'src'))).filter(n=>n.endsWith('.js'))){
 const filename=path.join(root,'src',file),code=await readFile(filename,'utf8');
 const check=spawnSync(process.execPath,['--check',filename],{encoding:'utf8'});if(check.status!==0)throw Error(check.stderr);
 for(const forbidden of [/\blocalStorage\b/,/\bsessionStorage\b/,/\bindexedDB\b/,/\bsendBeacon\b/,/\beval\s*\(/,/new\s+Function\s*\(/])assert.ok(!forbidden.test(code),`${file} must not use ${forbidden}`);
 for(const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g))assert.ok(match[1].startsWith('./'),`browser dependency must be local: ${match[1]}`);
}
assert.equal(PRESETS.length,20);assert.equal(ENDINGS.length,20);
const manifest=JSON.parse(await readFile(path.join(root,'public/assets-manifest.json'),'utf8'));
let total=0;
for(const value of Object.values(manifest.assets)){const file=path.join(root,'public',value.src.replace(/^\//,''));const info=await stat(file);assert.ok(info.size>1000);total+=info.size;}
const html=await readFile(path.join(root,'index.html'),'utf8');assert.ok(!/<script[^>]+src=['"]https?:/i.test(html));assert.ok(!/<link[^>]+href=['"]https?:/i.test(html));assert.ok(html.includes('Content-Security-Policy'));
console.log(JSON.stringify({syntax:'passed',presets:20,endings:20,persistence:'not present in application source',externalRuntimeDependencies:0,imageBytes:total}));
