import test from 'node:test';
import assert from 'node:assert/strict';

import { createRun, getScene, advance, finishEnding, matchingRank, choosePreset, normalizeNickname } from '../src/engine.js';
import { ENDINGS, PRESETS, SCENARIOS } from '../src/data.js';

function available(fn) { assert.equal(typeof fn, 'function', 'engine API must exist'); }
function walk(run, pick = () => 0) {
  const ticket = JSON.stringify(run.ticket);
  const preset = run.presetId;
  for (let step = 0; step < 35; step++) {
    const scene = getScene(run);
    assert.equal(typeof scene.text, 'string');
    assert.ok(scene.text.length > 20);
    assert.ok(['room', 'street', 'bank', 'park', 'ending'].includes(scene.background));
    assert.ok(scene.progress >= 0 && scene.progress <= 1);
    assert.equal(JSON.stringify(run.ticket), ticket, 'ticket numbers and round cannot change');
    assert.equal(run.presetId, preset);
    if (scene.stage === 'ending' || scene.stage === 'ending-choice') return run;
    assert.ok(scene.choices.length > 0, `scene ${scene.id} needs a usable choice`);
    const chosen = scene.choices[pick(scene) % scene.choices.length];
    const next = advance(run, chosen.id);
    assert.notEqual(next, run, 'a displayed choice must advance');
    assert.equal(advance(next, chosen.id), next, 'a stale double click must be harmless');
    run = next;
  }
  assert.fail('story did not terminate within 35 scenes');
}

test('nickname normalization bounds visible input and supplies a safe default', () => {
  available(normalizeNickname);
  assert.equal(normalizeNickname(' \n 가  나 \t '), '가 나');
  assert.equal(normalizeNickname('\u0000\u200b '), '행운이');
  assert.equal([...normalizeNickname('😀'.repeat(20))].length, 10);
  assert.equal(normalizeNickname(null), '행운이');
});

test('preset selection remains within the chosen gender including random boundaries', () => {
  available(choosePreset);
  assert.equal(choosePreset('male', () => 0).id, 'M01');
  assert.equal(choosePreset('female', () => 0.999999).id, 'F10');
  assert.equal(choosePreset('female', () => 1).id, 'F10');
  assert.equal(PRESETS.length, 20);
});

test('rank calculation distinguishes bonus from main numbers and rejects malformed tickets', () => {
  available(matchingRank);
  const draw = [1, 2, 3, 4, 5, 6];
  for (const [numbers, expected] of [
    [[1, 2, 3, 4, 5, 6], 1], [[1, 2, 3, 4, 5, 7], 2],
    [[1, 2, 3, 4, 5, 8], 3], [[1, 2, 3, 4, 8, 9], 4],
    [[1, 2, 3, 8, 9, 10], 5], [[1, 2, 8, 9, 10, 11], 0],
    [[1, 1, 2, 3, 4, 5], 0], [[1, 2, 3, 4, 5, 46], 0],
  ]) assert.equal(matchingRank(numbers, draw, 7), expected);
  assert.equal(matchingRank(null, draw, 7), 0);
});

test('winner mode guarantees claim across every narrative choice and ignores failure scenario injection', () => {
  available(createRun);
  for (const gender of ['male', 'female']) {
    for (const index of [0, 1]) {
      const initial = createRun({ mode: 'winner', gender, nickname: '당첨자', random: () => 0, scenarioId: 'lost' });
      assert.equal(initial.verifiedRank, null);
      assert.equal(initial.claimed, false);
      assert.equal(finishEnding(initial, 'E01'), initial, 'unclaimed runs cannot unlock endings');
      const run = walk(initial, () => index);
      assert.equal(run.verifiedRank, 1);
      assert.equal(run.claimed, true);
      assert.equal(getScene(run).stage, 'ending-choice');
      assert.ok(run.history.length >= 12, 'winner story needs a complete narrative');
    }
  }
});

test('all seven random scenarios produce the intended rank and claim outcome', () => {
  available(createRun);
  assert.deepEqual(SCENARIOS.map(item => item.id), ['normal', 'crowded', 'second', 'third', 'lost', 'wrong-draw', 'laundry']);
  const fixtures = [
    ['normal', 0, 1, true], ['crowded', 0, 1, true],
    ['second', 0, 2, true], ['third', 0, 3, true],
    ['lost', 0, 1, true], ['lost', 1, 1, false],
    ['wrong-draw', 0, 0, false], ['laundry', 0, 1, true], ['laundry', 1, 1, false],
  ];
  for (const [scenarioId, option, rank, claimed] of fixtures) {
    const initial = createRun({ mode: 'random', gender: 'female', nickname: '여름', scenarioId, random: () => 0.4 });
    const run = walk(initial, scene => scene.id.startsWith('event-') ? option : 0);
    assert.equal(run.verifiedRank, rank, scenarioId);
    assert.equal(run.claimed, claimed, scenarioId);
    assert.equal(getScene(run).stage, rank === 1 && claimed ? 'ending-choice' : 'ending', scenarioId);
    if (rank !== 1 || !claimed) assert.equal(finishEnding(run, 'E01'), run);
  }
});

test('twenty endings stay selected for both genders and cannot be replayed or replaced', () => {
  available(createRun);
  assert.equal(ENDINGS.length, 20);
  for (const gender of ['male', 'female']) {
    const run = walk(createRun({ mode: 'winner', gender, nickname: '나', random: () => 0.8 }));
    assert.equal(finishEnding(run, 'unknown'), run);
    for (const ending of ENDINGS) {
      const complete = finishEnding(run, ending.id);
      assert.equal(complete.endingId, ending.id);
      assert.equal(complete.claimed, true);
      assert.equal(getScene(complete).stage, 'ending');
      assert.equal(getScene(complete).title, ending.title);
      assert.ok(getScene(complete).text.includes(ending.line));
      assert.equal(finishEnding(complete, ending.id === 'E01' ? 'E02' : 'E01'), complete);
      assert.equal(advance(complete, 'receipt:next'), complete);
    }
  }
});

test('invalid actions are no-ops and state objects cannot mutate a previous scene', () => {
  available(createRun);
  const initial = createRun({ mode: 'winner', gender: 'male', nickname: '나', presetId: 'F03', random: () => 0 });
  assert.equal(initial.presetId, 'M01', 'preset injection must respect selected gender');
  assert.equal(advance(initial, 'bogus'), initial);
  const next = advance(initial, getScene(initial).choices[0].id);
  assert.equal(initial.history.length, 0);
  assert.equal(next.history.length, 1);
  assert.equal(initial.claimed, false);
  assert.throws(() => initial.ticket.numbers.push(44), TypeError);
});

test('story exposes fictional prize labels, physical ticket status and terminal result metadata', () => {
  const start = createRun({ mode: 'random', scenarioId: 'lost', random: () => 0 });
  assert.equal(start.ticketStatus, 'held');
  assert.equal(typeof start.grossPrize, 'string');
  assert.ok(start.grossPrize.includes('가상'));
  const lost = walk(start, scene => scene.id === 'event-lost' ? 1 : 0);
  assert.equal(lost.ticketStatus, 'lost');
  assert.equal(lost.result.claimed, false);
  assert.equal(lost.result.rank, 1);
  assert.equal(lost.result.title, getScene(lost).title);
  const recovered = walk(start);
  assert.equal(recovered.ticketStatus, 'recovered');
  const complete = finishEnding(recovered, 'E20');
  assert.equal(complete.result.title, '통장만 다른 평소의 나');
  assert.equal(complete.result.rank, 1);
  const damaged = walk(createRun({ mode: 'random', scenarioId: 'laundry', random: () => 0 }), scene => scene.id === 'event-laundry' ? 1 : 0);
  assert.equal(damaged.ticketStatus, 'damaged');
  const wrong = walk(createRun({ mode: 'random', scenarioId: 'wrong-draw', random: () => 0 }));
  assert.equal(wrong.ticketStatus, 'expired');
});

test('every winner choice combination reaches a claim and all configured scenarios select via RNG', () => {
  const queue = [createRun({ mode: 'winner', random: () => 0 })];
  let endings = 0;
  while (queue.length) {
    const run = queue.pop();
    const scene = getScene(run);
    if (scene.stage === 'ending-choice') {
      assert.equal(run.claimed, true);
      assert.equal(run.verifiedRank, 1);
      endings++;
    } else {
      assert.notEqual(scene.stage, 'ending');
      for (const choice of scene.choices) queue.push(advance(run, choice.id));
    }
  }
  assert.equal(endings, 6);
  for (let index = 0; index < 7; index++) {
    const selected = createRun({ mode: 'random', presetId: 'M01', random: () => (index + 0.5) / 7 });
    assert.equal(selected.scenarioId, ['normal', 'crowded', 'second', 'third', 'lost', 'wrong-draw', 'laundry'][index]);
  }
});

test('wrong-round temptation matches the new draw but is invalid for its printed old round', () => {
  const run = createRun({ mode: 'random', scenarioId: 'wrong-draw', random: () => 0.6 });
  assert.equal(matchingRank(run.ticket.numbers, run.ticket.drawNumbers, run.ticket.bonus), 1);
  assert.equal(run.ticket.ticketDrawId, 1407);
  assert.equal(run.ticket.drawId, 1408);
  assert.equal(matchingRank(run.ticket.numbers, run.ticket.ticketDrawNumbers, run.ticket.ticketBonus), 0);
  assert.equal(walk(run).verifiedRank, 0);
});

test('scripted prize amounts remain hidden until verification and crowded prize is fixed at five hundred million', () => {
  for (const [scenarioId, want] of [
    ['normal', '20억 원'], ['crowded', '5억 원'], ['lost', '20억 원'],
    ['laundry', '20억 원'], ['second', '7,000만 원'], ['third', '150만 원'], ['wrong-draw', '수령 없음'],
  ]) {
    let run = createRun({ mode: 'random', scenarioId, random: () => 0 });
    assert.equal(run.prizeLabel, '미확인');
    assert.equal(run.expectedPrizeLabel, '20억 원');
    while (run.sceneId !== 'compare') {
      run = advance(run, getScene(run).choices[0].id);
      assert.equal(run.prizeLabel, '미확인', scenarioId);
    }
    run = advance(run, getScene(run).choices[0].id);
    assert.equal(run.sceneId, 'verification');
    assert.equal(run.prizeLabel, want, scenarioId);
    const complete = walk(run);
    assert.equal(complete.prizeLabel, want);
  }
  const guaranteed = walk(createRun({ mode: 'winner', scenarioId: 'crowded', random: () => 0 }));
  assert.equal(guaranteed.prizeLabel, '20억 원');
  assert.equal(guaranteed.verifiedRank, 1);
});
