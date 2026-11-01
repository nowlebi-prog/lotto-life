import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const library=process.env.PLAYWRIGHT_MODULE;
const {chromium}=library?await import(pathToFileURL(library).href):await import('playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const base=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out=path.resolve('.qa');await fs.mkdir(out,{recursive:true});
const report={checks:[],pageErrors:[],externalRequests:[]};
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
page.on('pageerror',e=>report.pageErrors.push(e.message));
page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))report.externalRequests.push(r.url())});
await page.addInitScript(()=>{
  window.__storageWrites=[];
  Storage.prototype.setItem=function(){window.__storageWrites.push('storage');throw Error('Unexpected persistence');};
  const originalOpen=indexedDB.open.bind(indexedDB);indexedDB.open=function(){window.__storageWrites.push('indexedDB');return originalOpen(...arguments)};
});
try{
 await page.goto(base);
 assert.equal(await page.locator('[data-testid="mode-winner"]').count(),1,'Winner mode must be available');
 assert.equal(await page.locator('[data-testid="mode-random"]').count(),1,'Random mode must be available');
 report.checks.push('two start modes');
 if(process.env.RED_ONLY){console.log(JSON.stringify(report));process.exit(0)}
 await page.screenshot({path:path.join(out,'01-home-desktop.png')});
 await page.locator('[data-testid="mode-winner"]').click();
 await page.locator('[data-testid="gender-female"]').click();
 await page.locator('[data-testid="nickname"]').fill('밤감자');
 const preset=await page.locator('[data-preset]').first().getAttribute('data-preset');assert.match(preset,/^F\d{2}$/);
 await page.locator('[data-testid="start-run"]').click();
 for(let i=0;i<60;i++){
  const screen=await page.locator('#main').getAttribute('data-screen');
  if(screen==='endings')break;
  assert.equal(screen,'story','Winner path must keep progressing');
  const b=page.locator('[data-choice-id]').first();assert.equal(await b.count(),1);
  await b.click();await page.waitForTimeout(240);
 }
 assert.equal(await page.locator('[data-testid^="ending-option-"]').count(),20);
 assert.equal(await page.locator('[data-preset]').first().getAttribute('data-preset'),preset);
 report.checks.push('winner guarantees claim and 20 endings; female preset fixed');
 await page.screenshot({path:path.join(out,'02-ending-choices.png')});
 await page.locator('[data-testid="ending-option-E06"]').click();
 if(await page.locator('[data-testid="finish-vignette"]').count())await page.locator('[data-testid="finish-vignette"]').click();
 await page.locator('[data-testid="ending-card"]').waitFor();
 assert.match(await page.locator('.ending-title').innerText(),/시동/);
 assert.equal(await page.locator('[data-preset]').first().getAttribute('data-preset'),preset);
 await page.screenshot({path:path.join(out,'03-ending-car.png')});
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-testid="download-card"]').click();const download=await downloadPromise;await download.saveAs(path.join(out,'ending-card.png'));assert.ok((await fs.stat(path.join(out,'ending-card.png'))).size>10000);
 report.checks.push('chosen ending and actual PNG export');
 assert.deepEqual(await page.evaluate(()=>window.__storageWrites),[]);
 await page.reload();await page.locator('[data-testid="mode-winner"]').waitFor();
 report.checks.push('reload resets run without persistence');
 for(const width of[320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`home overflow ${width}`);
  await page.locator('[data-testid="mode-random"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`setup overflow ${width}`);
  await page.locator('[data-testid="nickname"]').fill('<img src=x');
  await page.locator('[data-testid="start-run"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`story overflow ${width}`);
  assert.equal(await page.locator('img[src="x"]').count(),0);
  if(width===390)await page.screenshot({path:path.join(out,'04-mobile-story.png')});
 }
 report.checks.push('responsive layouts at four widths; nickname is literal text');
 await page.setViewportSize({width:1280,height:900});
 await page.goto(base);await page.locator('[data-testid="mode-random"]').click();await page.locator('[data-testid="start-run"]').click();
 for(let i=0;i<60;i++){
  const screen=await page.locator('#main').getAttribute('data-screen');if(screen==='result'||screen==='endings')break;
  await page.locator('[data-choice-id]').first().click();await page.waitForTimeout(240);
 }
 const last=await page.locator('#main').getAttribute('data-screen');assert.ok(['result','endings'].includes(last));
 report.checks.push('random mode reaches coherent terminal state');
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(await page.evaluate(()=>window.__storageWrites),[]);
 console.log(JSON.stringify(report));
}finally{await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));await browser.close()}
