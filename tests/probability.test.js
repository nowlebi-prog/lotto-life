import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, getScene, advance, finishEnding, matchingRank } from '../src/engine.js';

function play(run, choose = () => 0) {
  for(let i=0;i<35;i++) {
    const scene=getScene(run);
    if(scene.stage!=='story')return run;
    const choice=scene.choices[choose(scene)%scene.choices.length];
    assert.ok(choice,`${run.scenarioId}: ${scene.id} needs a choice`);
    const next=advance(run,choice.id);
    assert.notEqual(next,run,'legal choice must move forward');
    assert.equal(advance(next,choice.id),next,'stale action must not claim twice');
    run=next;
  }
  assert.fail('Run did not terminate');
}

test('stratified 10,000 draws yield exactly 1.5 percent first-prize tickets including every first-prize twist',()=>{
  const counts={};let first=0;
  for(let i=0;i<10000;i++) {
    const run=createRun({mode:'random',gender:'male',presetId:'M01',random:()=>(i+.5)/10000});
    counts[run.scenarioId]=(counts[run.scenarioId]||0)+1;
    if(run.ticket.ticketDrawId===run.ticket.drawId && matchingRank(run.ticket.numbers,run.ticket.drawNumbers,run.ticket.bonus)===1)first++;
  }
  assert.equal(first,150,'all first-prize scenarios together must occupy 150 of 10,000 equal intervals');
  assert.deepEqual(counts,{normal:100,crowded:30,second:50,third:100,lost:10,'wrong-draw':450,laundry:10,fourth:800,fifth:2000,blank:6450});
});

test('new small-prize and ordinary miss paths agree with ticket math and never unlock first-prize endings',()=>{
  for(const [scenarioId,rank,prize] of [['fourth',4,'5만 원'],['fifth',5,'5천 원'],['blank',0,'수령 없음']]) {
    const initial=createRun({mode:'random',scenarioId,presetId:'F03',gender:'female',random:()=>.3});
    assert.equal(matchingRank(initial.ticket.numbers,initial.ticket.drawNumbers,initial.ticket.bonus),rank,scenarioId);
    const result=play(initial);
    assert.equal(result.verifiedRank,rank);
    assert.equal(result.claimed,rank>0);
    assert.equal(result.prizeLabel,prize);
    assert.equal(getScene(result).stage,'ending');
    assert.equal(finishEnding(result,'E01'),result);
    assert.ok(!result.history.some(x=>['lobby','desk','confirm'].includes(x.sceneId)),'small payouts must not take the jackpot bank route');
    assert.deepEqual(result.ticket,initial.ticket);
  }
});

test('ordinary misses do not claim a wrong round and have three selected short endings',()=>{
  const titles=new Set();
  for(const index of [0,1,2]) {
    const run=play(createRun({mode:'random',scenarioId:'blank',random:()=>.5}),scene=>scene.id==='verification'?index:0);
    titles.add(getScene(run).title);
    assert.equal(run.claimed,false);
    assert.notEqual(run.ticket.ticketDrawId,1407);
    assert.doesNotMatch(getScene(run).text,/지난 회차|1407/);
  }
  assert.equal(titles.size,3);
});

test('guaranteed winner mode stays 100 percent across probability boundaries and ignores miss overrides',()=>{
  for(const roll of [0,.01,.015,.05,.5,.999999]) {
    const run=play(createRun({mode:'winner',scenarioId:'blank',presetId:'M01',random:()=>roll}));
    assert.equal(run.verifiedRank,1);assert.equal(run.claimed,true);assert.equal(run.prizeLabel,'20억 원');
    assert.equal(getScene(run).stage,'ending-choice');
  }
});
