import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const base=process.env.TEST_URL||'http://127.0.0.1:4173/';
const results=[];
async function check(name,fn){const p=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});try{await p.goto(base);await fn(p);results.push({name,passed:true})}catch(e){results.push({name,passed:false,error:e.message})}finally{await p.close()}}
async function start(p){await p.locator('[data-testid="mode-winner"]').click();await p.locator('[data-testid="start-run"]').click()}
async function reach(p,id){for(let i=0;i<35;i++){const b=p.locator('[data-choice-id]').first();if(await b.getAttribute('data-choice-id')===id)return;await b.click();await p.waitForTimeout(230)}throw Error('scene not reached '+id)}
await check('dialog has an accessible name',async p=>{await p.locator('[data-action="info"]').click();assert.equal(await p.getByRole('dialog',{name:'이 작은 하루를 즐기는 방법'}).count(),1)});
await check('header toggle restores keyboard focus',async p=>{await p.locator('[data-action="sound"]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement?.dataset.action),'sound')});
await check('family detail shows chosen conversation',async p=>{await start(p);await reach(p,'reaction:family');await p.locator('[data-choice-id="reaction:family"]').click();await p.locator('[aria-label="축하 메시지 자세히 보기"]').click();assert.match(await p.locator('dialog').innerText(),/가족.*축하|축하.*가족/)});
await check('250ms double click advances only once',async p=>{await start(p);await reach(p,'scan:next');await p.locator('[data-choice-id="scan:next"]').dblclick({delay:250});assert.equal(await p.locator('[data-choice-id]').first().getAttribute('data-choice-id'),'compare:verify')});
await browser.close();await fs.mkdir('.qa',{recursive:true});await fs.writeFile('.qa/interaction-report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(r=>!r.passed))process.exitCode=1;
