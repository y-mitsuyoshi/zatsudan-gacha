import assert from 'node:assert/strict';
import {
  getRoleComposition,
  getRoleName,
  getRoleTeam,
  AI_PERSONAS,
} from '../src/types/shachiku-jinro';
import {
  checkWinCondition,
  createInitialGameState,
  computeSuspicion,
  planDayLines,
  applyPendingLine,
  chooseAiVote,
  chooseAiNightAction,
} from '../src/components/shachiku-jinro/useJinroGame';
import { say, ALL_LINE_KEYS } from '../src/components/shachiku-jinro/dialogue';

function makeSeededRng(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// 1. Role composition & initial state invariants
for (let count = 4; count <= 8; count++) {
  const comp = getRoleComposition(count);
  assert.equal(comp.length, count, `Composition length for ${count} must be ${count}`);
  const state = createInitialGameState('テスト社員', count, makeSeededRng(count * 100));
  assert.equal(Object.keys(state.players).length, count);
  assert.equal(state.order.length, count);
  assert.equal(state.order[0], 'human-player');
  // HR must receive Day 0 white divination result
  assert.equal(state.divinationResults.length, 1);
  assert.equal(state.divinationResults[0].dayNumber, 0);
  assert.equal(state.divinationResults[0].isSpy, false);
  const divTarget = state.players[state.divinationResults[0].targetId];
  assert.ok(divTarget && divTarget.role !== 'SPY', 'Day 0 divination must be non-spy');
}

// 2. Dialogue generator coverage across all tones & keys
for (const key of ALL_LINE_KEYS) {
  for (const persona of AI_PERSONAS) {
    const text = say(persona.tone, key, makeSeededRng(7), {
      t: 'ターゲット',
      p: '相方',
      x: '補足',
    });
    assert.ok(text.length > 0, `Dialogue must not be empty for ${key} / ${persona.tone}`);
    assert.ok(!text.includes('{t}') && !text.includes('{p}'), `Placeholders must be replaced in ${text}`);
  }
}

// 3. Deduction & CO planning: Real HR claims HR and reports Day 0 result; fake claimer gets high suspicion from real HR
{
  const rng = makeSeededRng(1234);
  let state = createInitialGameState('プレイヤー', 7, rng);
  state = { ...state, phase: 'DAY_CONVERSATION', dayCount: 1 };
  const lines = planDayLines(state, rng);
  assert.ok(lines.length > 0, 'Day 1 should produce AI discussion lines');

  for (const line of lines) {
    state = applyPendingLine(state, line);
  }

  const realHr = Object.values(state.players).find((p) => p.role === 'HR')!;
  if (realHr.isAI) {
    const hrClaim = state.claims.find((c) => c.playerId === realHr.id);
    assert.ok(hrClaim && hrClaim.role === 'HR', 'AI real HR should claim HR on Day 1');
    const hrRep = state.claimedResults.find((r) => r.claimerId === realHr.id);
    assert.ok(hrRep, 'AI real HR should report Day 0 divination result');
  }

  // Suppose an AI spy fake-claims HR: real HR must strongly suspect the fake HR
  const spy = Object.values(state.players).find((p) => p.role === 'SPY' && p.id !== realHr.id)!;
  const stateWithFakeHr = applyPendingLine(state, {
    playerId: spy.id,
    message: '私が人事部です',
    tag: 'CLAIM',
    claim: 'HR',
  });
  const suspicionFromRealHr = computeSuspicion(stateWithFakeHr, realHr, spy);
  assert.ok(
    suspicionFromRealHr >= 3.0,
    `Real HR should strongly suspect fake HR claimer (got ${suspicionFromRealHr})`,
  );
}

// 4. Smart voting & night actions
{
  const rng = makeSeededRng(999);
  let state = createInitialGameState('プレイヤー', 6, rng);
  const all = Object.values(state.players);
  const hr = all.find((p) => p.role === 'HR')!;
  const spy = all.find((p) => p.role === 'SPY')!;
  const drone = all.find((p) => p.role === 'DRONE')!;

  // Give HR a black result on spy and publish it
  state = {
    ...state,
    divinationResults: [
      { targetId: spy.id, targetName: spy.name, isSpy: true, dayNumber: 1 },
    ],
    claims: [{ playerId: hr.id, role: 'HR', day: 1 }],
    claimedResults: [
      { claimerId: hr.id, targetId: spy.id, isSpy: true, day: 1, kind: 'DIVINE' },
    ],
  };

  const candidates = all.filter((p) => p.isAlive);
  const hrVote = chooseAiVote(state, hr, candidates, rng);
  assert.equal(hrVote, spy.id, 'HR who found a spy must vote for that spy');

  const droneVote = chooseAiVote(state, drone, candidates, rng);
  assert.equal(
    droneVote,
    spy.id,
    'Company employee should vote for uncontested black-reported player',
  );

  // Night actions: SPY should not attack fellow SPY; GA should guard uncontested HR
  const ga = all.find((p) => p.role === 'GA')!;
  const gaTarget = chooseAiNightAction(state, ga, rng);
  assert.equal(gaTarget, hr.id, 'GA should prioritize guarding uncontested HR');

  const spyTarget = chooseAiNightAction(state, spy, rng);
  assert.ok(spyTarget && spyTarget !== spy.id, 'Spy must target a non-spy player');
}

// 5. Win condition checks (Company, Spies, Consultant steal)
{
  const state = createInitialGameState('プレイヤー', 8, makeSeededRng(77));
  const players = structuredClone(state.players);

  // Kill all spies while consultant is alive -> CONSULTANT wins
  for (const p of Object.values(players)) {
    if (p.role === 'SPY') p.isAlive = false;
  }
  assert.equal(checkWinCondition(players), 'CONSULTANT');

  // Kill consultant too -> COMPANY wins
  for (const p of Object.values(players)) {
    if (p.role === 'CONSULTANT') p.isAlive = false;
  }
  assert.equal(checkWinCondition(players), 'COMPANY');

  // Revive 2 spies and leave only 2 non-spies (no consultant) -> SPIES win
  let nonSpyAlive = 0;
  for (const p of Object.values(players)) {
    if (p.role === 'SPY') {
      p.isAlive = true;
    } else if (p.role === 'CONSULTANT') {
      p.isAlive = false;
    } else {
      nonSpyAlive += 1;
      p.isAlive = nonSpyAlive <= 2;
    }
  }
  assert.equal(checkWinCondition(players), 'SPIES');
}

// Ensure role helpers are valid
assert.equal(getRoleName('SPY'), '産業スパイ');
assert.equal(getRoleTeam('CONSULTANT'), 'third');

console.log('ALL JINRO DEDUCTION TESTS PASSED!');
