import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const base=process.env.TEST_URL||'http://127.0.0.1:4173/';
const cases=[
 {id:'normal',index:0,screen:'endings',money:'20억 원'},
 {id:'crowded',index:1,screen:'endings',money:'5억 원'},
 {id:'second',index:2,screen:'result',title:'보너스가 데려온 2등'},
 {id:'third',index:3,screen:'result',title:'다섯 숫자의 3등'},
 {id:'lost-recover',index:4,screen:'endings'},
 {id:'lost-fail',index:4,fail:true,screen:'result',title:'행운표의 빈자리'},
 {id:'wrong-draw',index:5,screen:'result',title:'회차까지 봐야 한 장의 표'},
 {id:'laundry-recover',index:6,screen:'endings'},
 {id:'laundry-fail',index:6,fail:true,screen:'result',title:'주머니 확인은 다음부터'},
];
const results=[];let next=0;
async function worker(){while(next<cases.length){const c=cases[next++],p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));try{
 await p.addInitScript(value=>Math.random=()=>value,(c.index+.2)/7);
 await p.goto(base);await p.locator('[data-testid="mode-random"]').click();await p.locator('[data-testid="start-run"]').click();
 for(let i=0;i<35;i++){
  const screen=await p.locator('#main').getAttribute('data-screen');if(screen!=='story')break;
  let button=p.locator('[data-choice-id]').first();const id=await button.getAttribute('data-choice-id');
  if(c.fail&&id.startsWith('event-'))button=p.locator('[data-choice-id]').last();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,c.id+' overflow');
  if(id==='receipt:next'&&c.money)assert.match(await p.locator('h1').innerText(),new RegExp(c.money));
  await button.click();await p.waitForTimeout(200);
 }
 assert.equal(await p.locator('#main').getAttribute('data-screen'),c.screen,c.id+' terminal');
 if(c.screen==='endings')assert.equal(await p.locator('[data-testid^="ending-option-"]').count(),20);
 if(c.title)assert.equal(await p.locator('.ending-title').innerText(),c.title);
 assert.deepEqual(errors,[]);
 if(c.id==='crowded')await p.screenshot({path:'.qa/crowded-mobile.png'});
 results.push({id:c.id,passed:true,screen:c.screen});
 }catch(e){results.push({id:c.id,passed:false,error:e.message})}finally{await p.close()}
}}
await fs.mkdir('.qa',{recursive:true});await Promise.all([worker(),worker(),worker()]);await browser.close();await fs.writeFile('.qa/branches-report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(x=>!x.passed))process.exitCode=1;
