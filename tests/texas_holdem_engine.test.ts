import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  CHAR_IDS,
  CHARACTERS,
  charImage,
  charVoiceUrl,
  resolveVoiceClipUrl,
  type VoiceEvent,
} from '../src/components/cards/texas-holdem/characters';
import {
  resolveSeatPosition,
} from '../src/components/cards/texas-holdem/config';
import {
  activeSeats,
  analyzeOuts,
  applyAction,
  cardLabel,
  compareHands,
  createDeck,
  createSeededRng,
  createTable,
  decideAi,
  estimateEquity,
  evaluate7,
  isHandOver,
  legalActions,
  preflopTier,
  shuffle,
  startHand,
} from '../src/components/cards/texas-holdem/engine';
import {
  buildOnlineRoomLineup,
  createAuthoritativeRoomTableState,
  rotateTableForHero,
  type OnlineRoomState,
} from '../src/components/cards/texas-holdem/onlineClient';
import {
  computePokerMetrics,
  computeRank,
  defaultProfile,
  defaultStats,
  generateAccountId,
  generateTransferCode,
  normalizeProfile,
  PROFILE_TITLES,
  RANK_TIERS,
  scrubPiiText,
} from '../src/components/cards/texas-holdem/profile';
import type {
  AiProfile,
  Blinds,
  Card,
  LegalActions,
  PlayerAction,
  Suit,
  TableState,
} from '../src/components/cards/texas-holdem/types';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const RANKS: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14,
};

function c(id: string): Card {
  const rank = RANKS[id[0]];
  const suit = id[1] as Suit;
  assert.ok(rank && 'shdc'.includes(suit), `bad card ${id}`);
  return { rank, suit, id };
}

function cs(ids: string): Card[] {
  return ids.split(/\s+/).filter(Boolean).map(c);
}

function ev(ids: string) {
  return evaluate7(cs(ids));
}

const BLINDS: Blinds = { sb: 10, bb: 20, ante: 0 };

function table(stacks: number[], blinds: Blinds = BLINDS, button = 0): TableState {
  return createTable({
    players: stacks.map((stack, i) => ({ charId: `c${i}`, name: `P${i}`, isHuman: i === 0, stack })),
    blinds,
    button,
  });
}

function totalChips(st: TableState): number {
  return st.seats.reduce((a, s) => a + s.stack, 0) + (st.result ? 0 : st.potTotal);
}

/**
 * Start a hand and rig hole cards + board.
 * The deck is rebuilt as [burn, flop x3, burn, turn, burn, river, ...rest].
 */
function rigged(st: TableState, holes: Record<number, string>, board: string): TableState {
  const s = startHand(st, { rng: createSeededRng(1) });
  const used = new Set<string>();
  const seats = s.seats.map((seat) => {
    const h = holes[seat.seat];
    if (!h || seat.sittingOut) return seat;
    const hc = cs(h);
    hc.forEach((x) => used.add(x.id));
    return { ...seat, holeCards: hc };
  });
  const b = cs(board);
  b.forEach((x) => used.add(x.id));
  const rest = createDeck().filter((x) => !used.has(x.id));
  const burn = () => rest.shift() as Card;
  const deck = [burn(), b[0], b[1], b[2], burn(), b[3], burn(), b[4], ...rest];
  return { ...s, seats, deck };
}

function act(st: TableState, type: PlayerAction['type'], amount?: number): TableState {
  return applyAction(st, amount === undefined ? { type } : { type, amount });
}

function isLegal(la: LegalActions, a: PlayerAction): boolean {
  switch (a.type) {
    case 'fold':
      return la.canFold;
    case 'check':
      return la.canCheck;
    case 'call':
      return la.canCall;
    case 'bet':
    case 'raise': {
      const ok = a.type === 'bet' ? la.canBet : la.canRaise;
      const amt = a.amount ?? NaN;
      return ok && Number.isInteger(amt) && amt >= la.minRaiseTo && amt <= la.maxRaiseTo;
    }
    case 'allin':
      return la.canBet || la.canRaise;
    default:
      return false;
  }
}

const PROFILES: AiProfile[] = [
  { looseness: 0.62, aggression: 0.78, bluff: 0.32, stickiness: 0.35, shove: 0.5, drawLove: 0.45 },
  { looseness: 0.3, aggression: 0.66, bluff: 0.16, stickiness: 0.25, shove: 0.35, drawLove: 0.4 },
  { looseness: 0.72, aggression: 0.35, bluff: 0.15, stickiness: 0.65, shove: 0.3, drawLove: 0.75 },
  { looseness: 0.55, aggression: 0.72, bluff: 0.45, stickiness: 0.3, shove: 0.4, drawLove: 0.5 },
  { looseness: 0.28, aggression: 0.58, bluff: 0.2, stickiness: 0.3, shove: 0.8, drawLove: 0.3 },
  { looseness: 0.5, aggression: 0.45, bluff: 0.22, stickiness: 0.5, shove: 0.35, drawLove: 0.9 },
];

// ---------------------------------------------------------------------------
// evaluator
// ---------------------------------------------------------------------------

describe('hand evaluator', () => {
  it('ranks every category in the correct order', () => {
    const hands = [
      ev('2c 5d 9h Js Kc 3d 7s'), // high card
      ev('2c 2d 9h Js Kc 3d 7s'), // pair
      ev('2c 2d 9h 9s Kc 3d 7s'), // two pair
      ev('2c 2d 2h 9s Kc 3d 7s'), // trips
      ev('4c 5d 6h 7s 8c Kd 2s'), // straight
      ev('2h 5h 9h Jh Kh 3d 7s'), // flush
      ev('2c 2d 2h 9s 9c 3d 7s'), // full house
      ev('2c 2d 2h 2s Kc 3d 7s'), // quads
      ev('5h 6h 7h 8h 9h 2c 2d'), // straight flush
    ];
    hands.forEach((h, i) => assert.equal(h.category, i, `category ${i} -> ${h.nameJa}`));
    for (let i = 1; i < hands.length; i++) assert.equal(compareHands(hands[i], hands[i - 1]), 1);
    assert.deepEqual(
      hands.map((h) => h.nameJa),
      ['ハイカード', 'ワンペア', 'ツーペア', 'スリーカード', 'ストレート', 'フラッシュ', 'フルハウス', 'フォーカード', 'ストレートフラッシュ'],
    );
  });

  it('high card compares all five kickers', () => {
    assert.equal(compareHands(ev('Ac Kd 9h 7s 4c 3d 2s'), ev('Ah Kc 9d 7c 3h 2c 5s')), -1);
    assert.equal(compareHands(ev('Ac Kd 9h 7s 4c'), ev('Ah Kc 9d 7c 4h')), 0);
  });

  it('one pair uses kickers, and ignores the 6th/7th card', () => {
    assert.equal(compareHands(ev('Ac Ad Kh Qs Jc 3d 2s'), ev('Ah As Kd Qc Tc 3c 2d')), 1);
    assert.equal(compareHands(ev('Ac Ad Kh Qs Jc 3d 2s'), ev('Ah As Kd Qc Jd 4c 2d')), 0);
  });

  it('two pair: higher pair, then second pair, then kicker; third pair can be the kicker', () => {
    assert.equal(compareHands(ev('Kc Kd 2h 2s Ac'), ev('Qc Qd Jh Js Ac')), 1);
    assert.equal(compareHands(ev('Kc Kd 3h 3s 2c'), ev('Kh Ks 2d 2s Ac')), 1);
    assert.equal(compareHands(ev('Kc Kd 3h 3s Qc'), ev('Kh Ks 3d 3c Jc')), 1);
    const h = ev('Kc Kd 3h 3s Qc Qd 2s');
    assert.equal(h.category, 2);
    assert.deepEqual(h.best5.map((x) => x.rank), [13, 13, 12, 12, 3]);
  });

  it('trips kickers', () => {
    assert.equal(compareHands(ev('7c 7d 7h As 2c'), ev('7s 7d 7h Ks Qc')), 1);
  });

  it('wheel A-5 is the lowest straight', () => {
    const wheel = ev('Ac 2d 3h 4s 5c Kd Ks');
    assert.equal(wheel.category, 4);
    assert.equal(wheel.nameJa, 'ストレート');
    assert.deepEqual(wheel.best5.map((x) => x.rank), [5, 4, 3, 2, 14]);
    const six = ev('2d 3h 4s 5c 6c Kd Ks');
    assert.equal(compareHands(six, wheel), 1);
    // A-high straight beats K-high
    assert.equal(compareHands(ev('Tc Jd Qh Ks Ac'), ev('9c Tc Jd Qh Ks')), 1);
  });

  it('steel wheel (A-5 straight flush) beats quads and loses to 6-high straight flush', () => {
    const steel = ev('Ah 2h 3h 4h 5h 9c 9d');
    assert.equal(steel.category, 8);
    assert.equal(steel.nameJa, 'ストレートフラッシュ');
    assert.equal(compareHands(steel, ev('9c 9d 9h 9s Ac')), 1);
    assert.equal(compareHands(ev('2h 3h 4h 5h 6h'), steel), 1);
  });

  it('royal flush naming', () => {
    const r = ev('Ts Js Qs Ks As 2c 2d');
    assert.equal(r.category, 8);
    assert.equal(r.nameJa, 'ロイヤルフラッシュ');
    assert.equal(r.nameEn, 'Royal Flush');
    assert.deepEqual(r.best5.map((x) => x.id).sort(), ['As', 'Js', 'Ks', 'Qs', 'Ts']);
  });

  it('flush beats straight when both are present; picks top 5 suited cards', () => {
    const h = ev('9h Th Jd Qh Kh 2h 3h');
    assert.equal(h.category, 5);
    assert.deepEqual(h.best5.map((x) => x.rank), [13, 12, 10, 9, 3]);
    assert.ok(h.best5.every((x) => x.suit === 'h'));
  });

  it('two trips make the best full house; full house compares trips first', () => {
    const h = ev('9c 9d 9h 4s 4c 4d Ks');
    assert.equal(h.category, 6);
    assert.deepEqual(h.best5.map((x) => x.rank), [9, 9, 9, 4, 4]);
    assert.equal(compareHands(ev('3c 3d 3h 2s 2c'), ev('2h 2d 2s Ac Ad')), 1);
  });

  it('quads use the best kicker', () => {
    assert.equal(compareHands(ev('8c 8d 8h 8s Ac 2d'), ev('8c 8d 8h 8s Kc Qd')), 1);
  });

  it('best5 always has 5 distinct cards drawn from input', () => {
    const rng = createSeededRng(9);
    for (let i = 0; i < 500; i++) {
      const seven = shuffle(createDeck(), rng).slice(0, 7);
      const h = evaluate7(seven);
      assert.equal(h.best5.length, 5);
      assert.equal(new Set(h.best5.map((x) => x.id)).size, 5);
      assert.ok(h.best5.every((x) => seven.some((y) => y.id === x.id)));
      // best5 alone must evaluate to the same score
      assert.equal(evaluate7(h.best5).score, h.score);
    }
  });

  it('is fast enough for Monte Carlo', () => {
    const rng = createSeededRng(3);
    const hands = Array.from({ length: 2000 }, () => shuffle(createDeck(), rng).slice(0, 7));
    const t = Date.now();
    for (let k = 0; k < 25; k++) for (const h of hands) evaluate7(h);
    assert.ok(Date.now() - t < 3000, 'evaluate7 too slow');
    const t2 = Date.now();
    for (let k = 0; k < 20; k++) estimateEquity(cs('Ah Kh'), cs('2h 7d 9h'), 3, 150, rng);
    assert.ok(Date.now() - t2 < 1500, 'estimateEquity too slow');
  });
});

describe('helpers', () => {
  it('createDeck / shuffle / seeded rng', () => {
    const d = createDeck();
    assert.equal(d.length, 52);
    assert.equal(new Set(d.map((x) => x.id)).size, 52);
    assert.ok(d.every((x) => x.rank >= 2 && x.rank <= 14));
    const a = shuffle(d, createSeededRng(42)).map((x) => x.id);
    const b = shuffle(d, createSeededRng(42)).map((x) => x.id);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, d.map((x) => x.id));
    assert.equal(d[0].id, '2s', 'input not mutated');
    assert.equal(cardLabel(c('As')), 'A♠');
    assert.equal(cardLabel(c('Td')), '10♦');
  });

  it('preflopTier', () => {
    assert.deepEqual(
      { ...preflopTier(cs('As Ad')), labelJa: '' },
      { tier: 'S', notation: 'AA', labelJa: '' },
    );
    assert.equal(preflopTier(cs('Kh As')).notation, 'AKo');
    assert.equal(preflopTier(cs('Ks As')).notation, 'AKs');
    assert.equal(preflopTier(cs('7c 2d')).tier, 'D');
    assert.ok(['A', 'S'].includes(preflopTier(cs('Kh Qh')).tier));
  });

  it('estimateEquity is sane', () => {
    const rng = createSeededRng(5);
    const aa = estimateEquity(cs('As Ad'), [], 1, 2000, rng);
    assert.ok(aa > 78 && aa < 91, `AA equity ${aa}`);
    const nuts = estimateEquity(cs('As Ks'), cs('Qs Js Ts 2d 3c'), 3, 200, rng);
    assert.equal(nuts, 100);
    const e72 = estimateEquity(cs('7c 2d'), [], 5, 500, rng);
    assert.ok(e72 < 15, `72o 6-way ${e72}`);
  });

  it('analyzeOuts: flush draw and open-ended straight draw', () => {
    const fd = analyzeOuts(cs('Ah 5h'), cs('Kh 9h 2c'));
    assert.equal(fd.outs, 9);
    assert.ok(fd.labels.some((l) => l.includes('フラッシュドロー')));
    const oesd = analyzeOuts(cs('8c 9d'), cs('Ts Jh 2c'));
    assert.equal(oesd.outs, 8);
    assert.ok(oesd.labels[0].includes('オープンエンド'));
    assert.deepEqual(analyzeOuts(cs('8c 9d'), []), { outs: 0, labels: [] });
  });
});

// ---------------------------------------------------------------------------
// table engine
// ---------------------------------------------------------------------------

describe('table engine', () => {
  it('posts blinds 3-handed and UTG (button) acts first', () => {
    const s = startHand(table([1000, 1000, 1000]), { rng: createSeededRng(1) });
    assert.equal(s.handNumber, 1);
    assert.equal(s.button, 0);
    assert.equal(s.sbSeat, 1);
    assert.equal(s.bbSeat, 2);
    assert.equal(s.seats[1].bet, 10);
    assert.equal(s.seats[2].bet, 20);
    assert.equal(s.toAct, 0);
    assert.equal(s.currentBet, 20);
    assert.equal(s.potTotal, 30);
    assert.ok(s.seats.every((x) => x.holeCards.length === 2));
    assert.equal(s.deck.length, 52 - 6);
    assert.ok(s.log.some((l) => l.includes('P1: SB 10')));
  });

  it('heads-up: button posts SB and acts first preflop, BB acts first postflop', () => {
    let s = startHand(table([1000, 1000], BLINDS, 1), { rng: createSeededRng(2) });
    assert.equal(s.button, 1);
    assert.equal(s.sbSeat, 1);
    assert.equal(s.bbSeat, 0);
    assert.equal(s.toAct, 1);
    s = act(s, 'call');
    assert.equal(s.toAct, 0, 'BB has the option');
    assert.ok(legalActions(s).canRaise);
    s = act(s, 'check');
    assert.equal(s.street, 'flop');
    assert.equal(s.board.length, 3);
    assert.equal(s.toAct, 0, 'BB first postflop');
    assert.ok(s.log.some((l) => l.startsWith('--- フロップ:')));
  });

  it('antes are posted by everyone and are dead money', () => {
    const s = startHand(table([1000, 1000, 1000], { sb: 10, bb: 20, ante: 5 }), { rng: createSeededRng(3) });
    assert.equal(s.potTotal, 45);
    assert.equal(s.seats[0].stack, 995);
    assert.equal(s.seats[0].bet, 0);
    assert.equal(s.currentBet, 20);
  });

  it('enforces min-raise: raise increment is at least the last full raise', () => {
    let s = startHand(table([1000, 1000, 1000]), { rng: createSeededRng(4) });
    assert.equal(legalActions(s).minRaiseTo, 40);
    s = act(s, 'raise', 25); // below minimum -> clamped to 40
    assert.equal(s.seats[0].bet, 40);
    assert.ok(s.log.includes('P0: レイズ 40'));
    s = act(s, 'raise', 100); // raise by 60
    assert.equal(s.minRaise, 60);
    assert.equal(legalActions(s).minRaiseTo, 160);
    assert.equal(legalActions(s).maxRaiseTo, 1000);
  });

  it('short all-in raise does not reopen action for players who already acted', () => {
    // P0 (UTG/button) 1000, P1 (SB) 1000, P2 (BB) 130
    let s = startHand(table([1000, 1000, 130]), { rng: createSeededRng(5) });
    s = act(s, 'raise', 100); // P0 raises to 100 (increment 80)
    s = act(s, 'call'); // P1 calls 100
    assert.equal(s.toAct, 2);
    s = act(s, 'allin'); // P2 all-in 130: increment 30 < 80 -> incomplete
    assert.equal(s.currentBet, 130);
    assert.equal(s.minRaise, 80);
    assert.equal(s.toAct, 0);
    const la = legalActions(s);
    assert.equal(la.canCall, true);
    assert.equal(la.callAmount, 30);
    assert.equal(la.canRaise, false, 'action not reopened');
    s = act(s, 'raise', 500); // illegal raise -> converted to call
    assert.equal(s.seats[0].bet, 130);
    assert.equal(s.toAct, 1);
    assert.equal(legalActions(s).canRaise, false);
  });

  it('players who have not acted may re-raise after a short all-in', () => {
    // 4 players: P0 button, P1 SB, P2 BB, P3 UTG
    let s = startHand(table([1000, 1000, 1000, 1000]), { rng: createSeededRng(6) });
    assert.equal(s.toAct, 3);
    s = { ...s, seats: s.seats.map((x) => (x.seat === 0 ? { ...x, stack: 70 } : x)) };
    s = act(s, 'raise', 60); // P3 to 60
    s = act(s, 'allin'); // P0 all-in 70 (short)
    assert.equal(s.toAct, 1);
    const la = legalActions(s);
    assert.ok(la.canRaise);
    assert.equal(la.minRaiseTo, 70 + 40);
  });

  it('BB gets the option after limps', () => {
    let s = startHand(table([1000, 1000, 1000]), { rng: createSeededRng(7) });
    s = act(s, 'call');
    s = act(s, 'call');
    assert.equal(s.street, 'preflop');
    assert.equal(s.toAct, 2);
    s = act(s, 'raise', 60);
    assert.equal(s.street, 'preflop');
    assert.equal(s.toAct, 0);
  });

  it('fold to the big blind: uncontested, uncalled part returned', () => {
    let s = startHand(table([1000, 1000, 1000]), { rng: createSeededRng(8) });
    s = act(s, 'fold');
    s = act(s, 'fold');
    assert.ok(isHandOver(s));
    assert.ok(s.result);
    assert.equal(s.result.showdown, false);
    assert.deepEqual(s.result.winners, [2]);
    assert.equal(s.result.payouts[2], 20);
    assert.equal(s.seats[2].stack, 1010);
    assert.equal(s.seats[1].stack, 990);
    assert.equal(totalChips(s), 3000);
    assert.equal(s.toAct, null);
    assert.deepEqual(activeSeats(s), [2]);
    assert.equal(legalActions(s).canCheck, false);
    assert.equal(applyAction(s, { type: 'check' }), s, 'actions after hand end are ignored');
  });

  it('uncalled bet is returned when a bigger all-in is called by a shorter stack', () => {
    let s = rigged(table([1000, 300], BLINDS, 0), { 0: 'As Ad', 1: 'Kc Kd' }, '2c 7d 9h Js 3s');
    s = act(s, 'allin'); // P0 (button/SB) shoves 1000
    s = act(s, 'call'); // P1 calls 300 all-in
    assert.ok(s.result);
    assert.equal(s.board.length, 5, 'run-out to river');
    assert.equal(s.street, 'showdown');
    assert.equal(s.seats[0].stack, 1300);
    assert.equal(s.seats[1].stack, 0);
    assert.equal(s.result.pots.length, 1);
    assert.equal(s.result.pots[0].amount, 600);
    assert.ok(s.log.some((l) => l.includes('戻る')));
  });

  it('three all-ins of different sizes create correct side pots (chip conservation)', () => {
    // P0 button 100, P1 SB 300, P2 BB 600, P3 UTG 1000
    const t = table([100, 300, 600, 1000]);
    let s = rigged(
      t,
      { 0: 'As Ad', 1: 'Ks Kd', 2: 'Qs Qd', 3: '7c 2d' },
      '3c 8d 9h Jc 4s',
    );
    assert.equal(s.toAct, 3);
    s = act(s, 'call'); // P3 calls 20
    s = act(s, 'allin'); // P0 100
    s = act(s, 'allin'); // P1 300
    s = act(s, 'allin'); // P2 600
    s = act(s, 'call'); // P3 calls 600
    assert.ok(s.result);
    const r = s.result;
    assert.deepEqual(r.pots.map((p) => p.amount), [400, 600, 600]);
    assert.deepEqual(r.pots.map((p) => p.winners), [[0], [1], [2]]);
    assert.deepEqual(r.pots.map((p) => p.label), ['メインポット', 'サイドポット1', 'サイドポット2']);
    assert.deepEqual(r.pots[2].eligible.sort(), [2, 3]);
    assert.deepEqual(s.seats.map((x) => x.stack), [400, 600, 600, 400]);
    assert.equal(totalChips(s), 2000);
    assert.equal(r.reveals.length, 4);
    assert.equal(r.headline, 'ワンペア');
  });

  it('side pot with uneven winners: short stack wins main, big stack wins side', () => {
    const t = table([200, 1000, 1000]);
    let s = rigged(t, { 0: 'As Ad', 1: 'Ks Kd', 2: 'Qs Qd' }, '3c 8d 9h Jc 4s');
    s = act(s, 'allin'); // P0 200
    s = act(s, 'raise', 600); // P1
    s = act(s, 'call'); // P2
    assert.equal(s.street, 'flop');
    s = act(s, 'check');
    s = act(s, 'check');
    s = act(s, 'check');
    s = act(s, 'check');
    s = act(s, 'bet', 200);
    s = act(s, 'fold');
    assert.ok(s.result);
    // P2 folded on river -> P1 and P0 contest. Main 600 (200*3) to P0, side 800 to P1.
    assert.equal(s.result.pots[0].amount, 600);
    assert.deepEqual(s.result.pots[0].winners, [0]);
    assert.equal(s.result.pots[1].amount, 800);
    assert.deepEqual(s.result.pots[1].winners, [1]);
    assert.equal(totalChips(s), 2200);
  });

  it('board plays: split pot with odd chip to first winner left of the button', () => {
    const t = table([1000, 1000, 1000], { sb: 5, bb: 10, ante: 0 });
    let s = rigged(t, { 0: '2c 3d', 1: '4c 5d', 2: '2d 3c' }, 'Ts Js Qs Ks As');
    s = act(s, 'call'); // P0 10
    s = act(s, 'fold'); // P1 5 dead
    s = act(s, 'check'); // P2
    for (let i = 0; i < 6; i++) s = act(s, 'check');
    assert.ok(s.result);
    const pot = s.result.pots[0];
    assert.equal(pot.amount, 25);
    assert.deepEqual(pot.winners.slice().sort(), [0, 2]);
    assert.equal(pot.handName, 'ロイヤルフラッシュ');
    // order from left of button(0): 1, 2, 0 -> seat 2 gets the odd chip
    assert.equal(s.result.payouts[2], 13);
    assert.equal(s.result.payouts[0], 12);
    assert.equal(totalChips(s), 3000);
  });

  it('button moves and skips busted seats; busted seats sit out', () => {
    let s = table([1000, 0, 1000, 1000]);
    s = startHand(s, { rng: createSeededRng(10) });
    assert.equal(s.button, 0);
    assert.equal(s.seats[1].sittingOut, true);
    assert.equal(s.seats[1].holeCards.length, 0);
    assert.equal(s.sbSeat, 2);
    assert.equal(s.bbSeat, 3);
    while (!isHandOver(s)) s = act(s, 'fold');
    s = startHand(s, { rng: createSeededRng(11) });
    assert.equal(s.button, 2);
    assert.equal(s.sbSeat, 3);
    assert.equal(s.bbSeat, 0);
    assert.ok(!activeSeats(s).includes(1));
  });

  it('rebuyTo revives busted seats; fewer than 2 players cannot start', () => {
    const s = startHand(table([1000, 0]), { rebuyTo: 500, rng: createSeededRng(12) });
    assert.equal(s.seats[1].sittingOut, false);
    assert.equal(s.seats[1].stack + s.seats[1].committed, 500);
    const none = startHand(table([1000, 0]));
    assert.equal(none.toAct, null);
    assert.ok(isHandOver(none));
  });

  it('heads-up blinds when the BB is shorter than the blind: excess returned and run out', () => {
    let s = startHand(table([1000, 5], BLINDS, 0), { rng: createSeededRng(13) });
    // P0 button/SB posts 10, P1 BB all-in for 5
    assert.ok(s.result, 'hand runs out immediately');
    assert.equal(s.board.length, 5);
    assert.equal(totalChips(s), 1005);
    s = startHand(table([1000, 1000], BLINDS, 0), { rng: createSeededRng(14) });
    assert.equal(s.result, null);
  });

  it('illegal actions are converted to the nearest legal action', () => {
    let s = startHand(table([1000, 1000, 1000]), { rng: createSeededRng(15) });
    s = act(s, 'check'); // facing BB -> call
    assert.equal(s.seats[0].bet, 20);
    s = act(s, 'fold');
    s = act(s, 'fold'); // BB may check -> fold becomes check
    assert.equal(s.street, 'flop');
    assert.equal(s.seats[2].folded, false);
    s = act(s, 'call'); // nothing to call -> check
    assert.equal(s.seats[2].lastAction?.type, 'check');
    s = act(s, 'bet', 999999); // clamps to all-in
    assert.equal(s.seats[0].allIn, true);
    assert.ok(s.log.some((l) => l.includes('オールイン')));
  });

  it('does not mutate the input state', () => {
    const s = startHand(table([1000, 1000, 1000]), { rng: createSeededRng(16) });
    const snapshot = JSON.stringify(s);
    applyAction(s, { type: 'raise', amount: 60 });
    assert.equal(JSON.stringify(s), snapshot);
  });

  it('logs are Japanese and use seat names', () => {
    let s = startHand(table([1000, 1000, 1000]), { rng: createSeededRng(17) });
    s = act(s, 'raise', 60);
    s = act(s, 'call');
    s = act(s, 'call');
    s = act(s, 'bet', 120);
    assert.ok(s.log.includes('P0: レイズ 60'));
    assert.ok(s.log.includes('P1: コール 50'));
    assert.ok(s.log.some((l) => /^--- フロップ: \S+ \S+ \S+ ---$/.test(l)));
    assert.ok(s.log.includes('P1: ベット 120'));
  });

  it('cumulative short all-ins that reach minRaise reopen raising for a player who already acted', () => {
    // 4-handed, button=0 -> SB=1 (10), BB=2 (20), UTG=3.
    // Stacks: P0=35, P1=50, P2=1000, P3=1000.
    let s = startHand(table([35, 50, 1000, 1000], BLINDS, 0), { rng: createSeededRng(21) });
    assert.equal(s.toAct, 3);
    s = act(s, 'call'); // P3 calls 20 (hasActed = true, lastFullBet = 20, minRaise = 20)
    assert.equal(s.toAct, 0);
    s = act(s, 'allin'); // P0 all-in for 35 (short raise +15 < 20, does not reopen alone)
    assert.equal(s.toAct, 1);
    s = act(s, 'allin'); // P1 all-in for 50 (cumulative +30 over lastFullBet 20 >= minRaise 20 -> reopens!)
    assert.equal(s.toAct, 2);
    s = act(s, 'call'); // P2 calls 50
    assert.equal(s.toAct, 3);
    const la = legalActions(s);
    assert.equal(la.canRaise, true, 'cumulative short all-ins should reopen raising for P3');
  });

  it('showdown headline prioritizes contested pot winner over uncontested side pot return', () => {
    // P0 has 50 chips (AA), P1 has 500 chips (72o), P2 has 500 chips (folds on flop after putting 200 in)
    let s = rigged(
      table([50, 500, 500], BLINDS, 0),
      { 0: 'As Ad', 1: '7c 2d', 2: 'Kh Qd' },
      'Ah Ks Qs 4c 9h',
    );
    // button=0, SB=1, BB=2, toAct=0
    s = act(s, 'allin'); // P0 all-in 50
    s = act(s, 'raise', 200); // P1 raises to 200
    s = act(s, 'call'); // P2 calls 200 -> flop
    assert.equal(s.street, 'flop');
    s = act(s, 'bet', 100); // P1 bets 100 on flop
    s = act(s, 'fold'); // P2 folds -> P1 gets uncalled 100 back, leaving P1 & P2 having put 200 preflop, P0 50
    assert.ok(s.result);
    assert.equal(s.result.showdown, true);
    // Main pot (150) is won by P0 with スリーカード (AAA), while P1 takes uncontested side pot (300)
    assert.equal(s.result.headline, 'スリーカード');
  });
});

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

describe('AI', () => {
  it('always returns a legal action in a single decision', () => {
    const s = startHand(table([1000, 1000, 1000]), { rng: createSeededRng(18) });
    for (const p of PROFILES) {
      const d = decideAi(s, p, createSeededRng(1));
      assert.ok(isLegal(legalActions(s), d.action), JSON.stringify(d));
    }
  });

  it('premium hands raise and trash folds under the gun', () => {
    let raises = 0;
    let folds = 0;
    for (let i = 0; i < 30; i++) {
      const aa = rigged(table([2000, 2000, 2000, 2000, 2000, 2000]), { 3: 'As Ad' }, '2c 3d 4h 5s 7c');
      const d1 = decideAi(aa, PROFILES[1], createSeededRng(i));
      if (d1.action.type === 'raise' || d1.action.type === 'allin') raises++;
      const trash = rigged(table([2000, 2000, 2000, 2000, 2000, 2000]), { 3: '7s 2d' }, '2c 3d 4h 5s 7c');
      if (decideAi(trash, PROFILES[1], createSeededRng(i)).action.type === 'fold') folds++;
    }
    assert.ok(raises >= 27, `AA raised ${raises}/30`);
    assert.ok(folds >= 27, `72o folded ${folds}/30`);
  });

  it('short stack pushes or folds', () => {
    const s = rigged(table([150, 2000, 2000]), { 0: 'Ah Kd' }, '2c 3d 4h 5s 7c');
    const d = decideAi(s, PROFILES[4], createSeededRng(3));
    assert.equal(d.action.type, 'allin');
  });

  it('fuzz: 3000 AI hands keep every invariant', () => {
    const rng = createSeededRng(20261107);
    const counts = [2, 4, 6];
    let hands = 0;
    let showdowns = 0;
    let sidePots = 0;
    for (const n of counts) {
      let t: TableState | null = null;
      for (let h = 0; h < 1000; h++) {
        if (!t || t.seats.filter((x) => x.stack > 0).length < 2) {
          t = table(
            Array.from({ length: n }, () => 100 + Math.floor(rng() * 40) * 50),
            BLINDS,
            Math.floor(rng() * n),
          );
        }
        const blinds: Blinds = h % 5 === 0 ? { sb: 25, bb: 50, ante: 5 } : BLINDS;
        const before: number = t.seats.reduce((a, x) => a + x.stack, 0);
        let s = startHand(t, { blinds, rng });
        assert.equal(totalChips(s), before, 'conservation after blinds');
        let actions = 0;
        while (!isHandOver(s)) {
          const ta = s.toAct;
          assert.ok(ta !== null && ta >= 0 && ta < n, 'toAct in range');
          const seat = s.seats[ta];
          assert.ok(!seat.folded && !seat.allIn && !seat.sittingOut, 'toAct seat can act');
          const la = legalActions(s);
          const d = decideAi(s, PROFILES[(ta + h) % PROFILES.length], rng);
          assert.ok(isLegal(la, d.action), `illegal AI action ${JSON.stringify(d.action)} la=${JSON.stringify(la)}`);
          s = applyAction(s, d.action);
          actions++;
          assert.ok(actions < 200, 'hand did not terminate');
          assert.equal(totalChips(s), before, 'conservation mid-hand');
          for (const x of s.seats) {
            assert.ok(Number.isFinite(x.stack) && x.stack >= 0, 'stack valid');
            assert.ok(Number.isFinite(x.bet) && x.bet >= 0, 'bet valid');
          }
        }
        assert.ok(s.result, 'result set');
        assert.equal(s.toAct, null);
        assert.equal(s.street, 'showdown');
        const after = s.seats.reduce((a, x) => a + x.stack, 0);
        assert.equal(after, before, 'conservation at hand end');
        const paid = Object.values(s.result.payouts).reduce((a, v) => a + v, 0);
        assert.equal(paid, s.result.pots.reduce((a, p) => a + p.amount, 0));
        assert.equal(paid, s.potTotal);
        if (s.result.showdown) {
          showdowns++;
          assert.equal(s.board.length, 5);
        }
        if (s.result.pots.length > 1) sidePots++;
        hands++;
        t = s;
      }
    }
    assert.equal(hands, 3000);
    assert.ok(showdowns > 100, `showdowns ${showdowns}`);
    assert.ok(sidePots > 5, `side pots ${sidePots}`);
  });
});

// ---------------------------------------------------------------------------
// 12-Character Cast & Studio Seiyuu Voice Assets
// ---------------------------------------------------------------------------

describe('12-Character Cast & Studio Seiyuu Voice Assets', () => {
  const publicDir = path.resolve(__dirname, '../public');
  const events: VoiceEvent[] = [
    'greet',
    'check',
    'call',
    'raise',
    'allin',
    'fold',
    'win',
    'bigWin',
    'lose',
    'think',
    'select',
  ];

  it('defines 12 selectable characters with normal/win WebP portraits and VOICEVOX CV credits', () => {
    assert.equal(CHAR_IDS.length, 12);
    for (const id of CHAR_IDS) {
      const ch = CHARACTERS[id];
      assert.ok(ch, `missing character ${id}`);
      assert.ok(ch.cvCredit.startsWith('VOICEVOX:'), `${id} missing VOICEVOX CV credit`);
      const normalFile = path.join(publicDir, charImage(id, 'normal'));
      const winFile = path.join(publicDir, charImage(id, 'win'));
      assert.ok(fs.existsSync(normalFile), `missing portrait ${normalFile}`);
      assert.ok(fs.existsSync(winFile), `missing win portrait ${winFile}`);
    }
  });

  it('includes all 264 pre-rendered studio anime seiyuu MP3 voice clips on disk', () => {
    let count = 0;
    for (const id of CHAR_IDS) {
      for (const ev of events) {
        const lines = CHARACTERS[id].lines[ev];
        assert.equal(lines.length, 2, `${id}.${ev} should have 2 lines`);
        for (let idx = 0; idx < 2; idx++) {
          const relUrl = charVoiceUrl(id, ev, idx);
          const absPath = path.join(publicDir, relUrl);
          assert.ok(fs.existsSync(absPath), `missing voice clip ${absPath}`);
          const stat = fs.statSync(absPath);
          assert.ok(stat.size > 1000, `voice clip too small: ${absPath}`);
          assert.equal(resolveVoiceClipUrl(lines[idx], { charId: id }), relUrl);
          count++;
        }
      }
    }
    assert.equal(count, 264);
  });
});

// ---------------------------------------------------------------------------
// Account Management, Rank Promotion, Pro Poker Analytics & Online Rotation
// ---------------------------------------------------------------------------

describe('Account Management, Rank System, Poker Analytics & Online Multiplayer', () => {
  it('generates zero-PII anonymous Account IDs and Transfer Codes and normalizes legacy profiles', () => {
    const id = generateAccountId();
    const code = generateTransferCode();
    assert.match(id, /^RFN-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const norm = normalizeProfile({ playerName: 'TestHero', rankPoints: 640 });
    assert.equal(norm.playerName, 'TestHero');
    assert.equal(norm.rankPoints, 640);
    assert.equal(norm.highestRankPoints, 640);
    assert.match(norm.accountId, /^RFN-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.match(norm.transferCode, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.ok(norm.accountSecret.length >= 16);
    assert.equal(norm.stats.positionStats.BTN.played, 0);
  });

  it('computes 7-tier competitive ranks (Bronze to Legend) with ★1-★3 sub-divisions and promotion thresholds', () => {
    assert.equal(RANK_TIERS.length, 7);
    const bronze1 = computeRank(0);
    assert.equal(bronze1.tier.id, 'bronze');
    assert.equal(bronze1.stars, 1);
    assert.equal(bronze1.label, 'ブロンズ ★1');

    const platinum2 = computeRank(1150);
    assert.equal(platinum2.tier.id, 'platinum');
    assert.equal(platinum2.stars, 2);
    assert.equal(platinum2.label, 'プラチナ ★2');

    const legend = computeRank(3750);
    assert.equal(legend.tier.id, 'legend');
    assert.equal(legend.stars, 1);
    assert.equal(legend.nextTierName, null);

    // Titles unlock properly
    const p = defaultProfile();
    p.rankPoints = 1150;
    p.highestRankPoints = 1150;
    const platTitle = PROFILE_TITLES.find((t) => t.id === 'platinum');
    assert.ok(platTitle && platTitle.unlocked(p));
  });

  it('computes VPIP, PFR, 3-Bet%, AF, WTSD%, W$SD%, BB/100 and 6-axis radar chart metrics', () => {
    const s = defaultStats();
    s.handsPlayed = 100;
    s.handsWon = 28;
    s.vpipHands = 24;
    s.pfrHands = 19;
    s.threeBetOpportunities = 40;
    s.threeBetHands = 4;
    s.flopSeenHands = 55;
    s.totalBetsAndRaises = 33;
    s.totalCalls = 11;
    s.wentToShowdownHands = 18;
    s.showdownsWon = 11;
    s.allInCount = 6;
    s.allInWins = 4;
    s.totalNetBb = 145.5;

    const m = computePokerMetrics(s);
    assert.equal(m.winRate, 28);
    assert.equal(m.vpip, 24);
    assert.equal(m.pfr, 19);
    assert.equal(m.threeBet, 10);
    assert.equal(m.af, 3);
    assert.equal(m.wtsd, 32.7);
    assert.equal(m.wsd, 61.1);
    assert.equal(m.bbPer100, 145.5);
    assert.equal(m.styleCode, 'TAG');
    assert.equal(m.radar.length, 6);
    assert.ok(m.radar.every((axis) => axis.value >= 12 && axis.value <= 100));
  });

  it('resolves table positions (BTN/SB/BB/UTG/MP/CO) and rotates online table views for any seat index', () => {
    assert.equal(resolveSeatPosition(0, 6, 0), 'BTN');
    assert.equal(resolveSeatPosition(0, 6, 1), 'SB');
    assert.equal(resolveSeatPosition(0, 6, 2), 'BB');
    assert.equal(resolveSeatPosition(0, 6, 3), 'UTG');
    assert.equal(resolveSeatPosition(0, 6, 4), 'MP');
    assert.equal(resolveSeatPosition(0, 6, 5), 'CO');

    const rawTable = startHand(table([2000, 2000, 2000, 2000]), { rng: createSeededRng(77) });
    rawTable.seats[0].name = 'HostPlayer';
    rawTable.seats[2].name = 'GuestPlayer';
    const rotatedForSeat2 = rotateTableForHero(rawTable, 2);

    // Seat 2 in raw table becomes Seat 0 (bottom Hero) in rotated view
    assert.equal(rotatedForSeat2.seats[0].name, 'GuestPlayer');
    assert.equal(rotatedForSeat2.seats[0].isHuman, true);
    assert.equal(rotatedForSeat2.seats[2].name, 'HostPlayer');
    assert.equal(rotatedForSeat2.seats[2].isHuman, false);
    assert.equal(rotatedForSeat2.button, (rawTable.button - 2 + 4) % 4);
  });

  it('scrubs accidental PII (emails, phone numbers, URLs, HTML tags) from player names', () => {
    assert.equal(scrubPiiText('user@example.com', 'あなた'), 'あなた');
    assert.equal(scrubPiiText('090-1234-5678', 'あなた'), 'あなた');
    assert.equal(scrubPiiText('https://example.com/secret', 'あなた'), 'あなた');
    assert.equal(scrubPiiText('<script>alert(1)</script>Rei', 'あなた'), 'scriptalert(1)/scriptRei'.slice(0, 12));
    assert.equal(scrubPiiText('ロイヤル騎士', 'あなた'), 'ロイヤル騎士');
  });

  it('gives all 12 CPU characters equal pro-level competence with 12 distinct tactical archetypes', () => {
    const archetypes = new Set<string>();
    for (const id of CHAR_IDS) {
      const ch = CHARACTERS[id];
      assert.ok(ch.tacticalSummary && ch.tacticalSummary.length > 20, `${id} missing tacticalSummary`);
      assert.ok(Array.isArray(ch.tacticalBadges) && ch.tacticalBadges.length === 3, `${id} missing tacticalBadges`);
      assert.ok(ch.ai.archetype, `${id} missing ai.archetype`);
      archetypes.add(ch.ai.archetype!);
      // Ensure no weak/passive calling-station outlier: all characters have pro-level aggression >= 0.65
      assert.ok(ch.ai.aggression >= 0.65 && ch.ai.aggression <= 0.85, `${id} aggression out of pro range`);
      assert.ok(ch.ai.looseness >= 0.32 && ch.ai.looseness <= 0.55, `${id} looseness out of pro range`);
    }
    assert.equal(archetypes.size, 12, 'all 12 characters must have unique tactical archetypes');
  });

  it('builds synchronized online rooms for both stranger quick-match and friend private rooms', () => {
    const now = Date.now();
    const friendRoom: OnlineRoomState = {
      roomCode: '7K9P2M',
      visibility: 'private',
      status: 'waiting',
      hostAccountId: 'RFN-AAAA-1111',
      settings: {
        mode: 'lounge',
        maxSeats: 6,
        startingStack: 2000,
        blinds: { sb: 10, bb: 20, ante: 0 },
        fillWithBots: true,
        felt: 'emerald',
      },
      members: [
        {
          accountId: 'RFN-AAAA-1111',
          playerName: 'ホスト太郎',
          charId: 'karen',
          rankPoints: 1200,
          equippedTitle: 'プラチナ・ハイローラー',
          isBot: false,
          ready: true,
          joinedAt: now,
          lastSeenAt: now,
        },
        {
          accountId: 'RFN-BBBB-2222',
          playerName: 'フレンド花子',
          charId: 'rei',
          rankPoints: 1350,
          equippedTitle: 'プラチナ・ハイローラー',
          isBot: false,
          ready: true,
          joinedAt: now,
          lastSeenAt: now,
        },
      ],
      tableState: null,
      actionSeq: 1,
      lastAction: null,
      stamps: [],
      createdAt: now,
      updatedAt: now,
    };

    const lineup = buildOnlineRoomLineup(friendRoom);
    assert.equal(lineup.length, 6);
    assert.equal(lineup[0].playerName, 'ホスト太郎');
    assert.equal(lineup[1].playerName, 'フレンド花子');
    assert.equal(lineup.filter((m) => !m.isBot).length, 2);
    assert.equal(lineup.filter((m) => m.isBot).length, 4);

    const authoritative = createAuthoritativeRoomTableState(friendRoom, lineup);
    const hostView = rotateTableForHero(authoritative, 0);
    const friendView = rotateTableForHero(authoritative, 1);

    // Host sees themselves at seat 0 and friend at seat 1
    assert.equal(hostView.seats[0].name, 'ホスト太郎');
    assert.equal(hostView.seats[1].name, 'フレンド花子');
    // Friend sees themselves at seat 0 and host at seat 5 (clockwise wrap)
    assert.equal(friendView.seats[0].name, 'フレンド花子');
    assert.equal(friendView.seats[5].name, 'ホスト太郎');
    // Both see the exact same hole cards for each player
    assert.deepEqual(friendView.seats[0].holeCards, hostView.seats[1].holeCards);
    assert.deepEqual(friendView.seats[5].holeCards, hostView.seats[0].holeCards);
  });
});
