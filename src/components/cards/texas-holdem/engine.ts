/**
 * ROYAL FLUSH NIGHT — pure No-Limit Texas Hold'em engine.
 * No React / DOM. All state transitions are immutable (inputs are never mutated).
 */
import type {
  AiDecision,
  AiProfile,
  Blinds,
  Card,
  EvaluatedHand,
  HandResult,
  LegalActions,
  PlayerAction,
  PotResult,
  SeatState,
  Street,
  Suit,
  TableState,
} from './types';

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK_CHARS = '__23456789TJQKA';

function rankLabel(rank: number): string {
  if (rank === 10) return '10';
  return RANK_CHARS[rank] ?? '?';
}

export function cardLabel(c: Card): string {
  return `${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}`;
}

function makeCard(rank: number, suit: Suit): Card {
  return { rank, suit, id: `${RANK_CHARS[rank]}${suit}` };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push(makeCard(rank, suit));
  }
  return deck;
}

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** mulberry32 — small, fast, deterministic PRNG returning [0, 1). */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Hand evaluation (integer card codes: (rank-2)*4 + suitIndex)
// ---------------------------------------------------------------------------

function suitIndex(s: Suit): number {
  return s === 's' ? 0 : s === 'h' ? 1 : s === 'd' ? 2 : 3;
}

function cardCode(c: Card): number {
  return (c.rank - 2) * 4 + suitIndex(c.suit);
}

const RC = new Int32Array(15);
const SC = new Int32Array(4);
const SM = new Int32Array(4);

function straightHigh(mask: number): number {
  const m = mask & (1 << 14) ? mask | 2 : mask;
  for (let h = 14; h >= 5; h--) {
    if (((m >> (h - 4)) & 31) === 31) return h;
  }
  return 0;
}

function enc(cat: number, a: number, b: number, c: number, d: number, e: number): number {
  return cat * 1048576 + a * 65536 + b * 4096 + c * 256 + d * 16 + e;
}

/** highest rank present (RC > 0) not equal to x1/x2, below `below` */
function nextRank(below: number, x1: number, x2: number): number {
  for (let r = below - 1; r >= 2; r--) {
    if (RC[r] > 0 && r !== x1 && r !== x2) return r;
  }
  return 0;
}

function topBits(mask: number, count: number, out: number[]): void {
  let n = 0;
  for (let r = 14; r >= 2 && n < count; r--) {
    if (mask & (1 << r)) out[n++] = r;
  }
  while (n < count) out[n++] = 0;
}

const TMP5 = [0, 0, 0, 0, 0];

/** Score 5..7 integer-coded cards. Score encodes category and the 5 best ranks (in best5 order). */
function scoreCodes(cards: ArrayLike<number>, n: number): number {
  RC.fill(0);
  SC[0] = 0; SC[1] = 0; SC[2] = 0; SC[3] = 0;
  SM[0] = 0; SM[1] = 0; SM[2] = 0; SM[3] = 0;
  let rm = 0;
  for (let i = 0; i < n; i++) {
    const c = cards[i];
    const r = (c >> 2) + 2;
    const s = c & 3;
    RC[r]++;
    SC[s]++;
    SM[s] |= 1 << r;
    rm |= 1 << r;
  }
  let fs = -1;
  for (let s = 0; s < 4; s++) if (SC[s] >= 5) fs = s;
  if (fs >= 0) {
    const sh = straightHigh(SM[fs]);
    if (sh) return enc(8, sh, sh - 1, sh - 2, sh - 3, sh === 5 ? 1 : sh - 4);
  }
  let quad = 0, t1 = 0, t2 = 0, p1 = 0, p2 = 0;
  for (let r = 14; r >= 2; r--) {
    const cnt = RC[r];
    if (cnt === 4) { if (!quad) quad = r; }
    else if (cnt === 3) { if (!t1) t1 = r; else if (!t2) t2 = r; }
    else if (cnt === 2) { if (!p1) p1 = r; else if (!p2) p2 = r; }
  }
  if (quad) {
    const k = nextRank(15, quad, 0);
    return enc(7, quad, quad, quad, quad, k);
  }
  if (t1 && (t2 || p1)) {
    const p = Math.max(t2, p1);
    return enc(6, t1, t1, t1, p, p);
  }
  if (fs >= 0) {
    topBits(SM[fs], 5, TMP5);
    return enc(5, TMP5[0], TMP5[1], TMP5[2], TMP5[3], TMP5[4]);
  }
  const st = straightHigh(rm);
  if (st) return enc(4, st, st - 1, st - 2, st - 3, st === 5 ? 1 : st - 4);
  if (t1) {
    const k1 = nextRank(15, t1, 0);
    const k2 = nextRank(k1, t1, 0);
    return enc(3, t1, t1, t1, k1, k2);
  }
  if (p1 && p2) {
    const k = nextRank(15, p1, p2);
    return enc(2, p1, p1, p2, p2, k);
  }
  if (p1) {
    const k1 = nextRank(15, p1, 0);
    const k2 = nextRank(k1, p1, 0);
    const k3 = nextRank(k2, p1, 0);
    return enc(1, p1, p1, k1, k2, k3);
  }
  topBits(rm, 5, TMP5);
  return enc(0, TMP5[0], TMP5[1], TMP5[2], TMP5[3], TMP5[4]);
}

const HAND_NAMES: { ja: string; en: string }[] = [
  { ja: 'ハイカード', en: 'High Card' },
  { ja: 'ワンペア', en: 'One Pair' },
  { ja: 'ツーペア', en: 'Two Pair' },
  { ja: 'スリーカード', en: 'Three of a Kind' },
  { ja: 'ストレート', en: 'Straight' },
  { ja: 'フラッシュ', en: 'Flush' },
  { ja: 'フルハウス', en: 'Full House' },
  { ja: 'フォーカード', en: 'Four of a Kind' },
  { ja: 'ストレートフラッシュ', en: 'Straight Flush' },
];

export function handNameJa(category: number): string {
  return HAND_NAMES[category]?.ja ?? '';
}

/** Evaluate the best 5-card hand out of 5..7 cards. */
export function evaluate7(cards: Card[]): EvaluatedHand {
  const codes = cards.map(cardCode);
  const score = scoreCodes(codes, codes.length);
  const category = Math.floor(score / 1048576);
  const ranks = [
    (score >> 16) & 15,
    (score >> 12) & 15,
    (score >> 8) & 15,
    (score >> 4) & 15,
    score & 15,
  ].map((r) => (r === 1 ? 14 : r));
  let flushSuit: Suit | null = null;
  if (category === 5 || category === 8) {
    const counts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
    for (const c of cards) counts[c.suit]++;
    flushSuit = SUITS.find((s) => counts[s] >= 5) ?? null;
  }
  const used = new Set<string>();
  const best5: Card[] = [];
  for (const r of ranks) {
    const pick = cards.find(
      (c) => c.rank === r && !used.has(c.id) && (flushSuit === null || c.suit === flushSuit),
    );
    if (pick) {
      used.add(pick.id);
      best5.push(pick);
    }
  }
  const royal = category === 8 && ranks[0] === 14;
  return {
    category,
    score,
    nameJa: royal ? 'ロイヤルフラッシュ' : HAND_NAMES[category].ja,
    nameEn: royal ? 'Royal Flush' : HAND_NAMES[category].en,
    best5,
  };
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.score === b.score ? 0 : a.score > b.score ? 1 : -1;
}

// ---------------------------------------------------------------------------
// Equity / hand reading helpers
// ---------------------------------------------------------------------------

/** Monte-Carlo equity (0..100) of `hole` vs `opponents` random hands. Ties share equity. */
export function estimateEquity(
  hole: Card[],
  board: Card[],
  opponents: number,
  iterations = 150,
  rng: () => number = Math.random,
): number {
  if (hole.length < 2) return 0;
  const opp = Math.max(0, Math.min(8, Math.floor(opponents)));
  if (opp === 0) return 100;
  const known = new Set<number>();
  const heroCodes = hole.slice(0, 2).map(cardCode);
  const boardCodes = board.slice(0, 5).map(cardCode);
  for (const c of heroCodes) known.add(c);
  for (const c of boardCodes) known.add(c);
  const deck: number[] = [];
  for (let c = 0; c < 52; c++) if (!known.has(c)) deck.push(c);
  const need = 5 - boardCodes.length;
  const draws = need + opp * 2;
  if (draws > deck.length) return 0;
  const hero = new Int32Array(7);
  const vill = new Int32Array(7);
  hero[0] = heroCodes[0];
  hero[1] = heroCodes[1];
  for (let i = 0; i < boardCodes.length; i++) {
    hero[2 + i] = boardCodes[i];
    vill[2 + i] = boardCodes[i];
  }
  const iters = Math.max(1, Math.floor(iterations));
  let total = 0;
  const dl = deck.length;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < draws; i++) {
      const j = i + Math.floor(rng() * (dl - i));
      const t = deck[i];
      deck[i] = deck[j];
      deck[j] = t;
    }
    for (let i = 0; i < need; i++) {
      hero[2 + boardCodes.length + i] = deck[i];
      vill[2 + boardCodes.length + i] = deck[i];
    }
    const hs = scoreCodes(hero, 7);
    let best = 0;
    let ties = 0;
    let lost = false;
    for (let o = 0; o < opp; o++) {
      vill[0] = deck[need + o * 2];
      vill[1] = deck[need + o * 2 + 1];
      const vs = scoreCodes(vill, 7);
      if (vs > hs) { lost = true; break; }
      if (vs === hs) ties++;
      if (vs > best) best = vs;
    }
    if (!lost) total += 1 / (ties + 1);
  }
  return (total / iters) * 100;
}

function chenScore(hole: Card[]): number {
  if (hole.length < 2) return 0;
  const hi = Math.max(hole[0].rank, hole[1].rank);
  const lo = Math.min(hole[0].rank, hole[1].rank);
  const pts = (r: number): number => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
  let s = pts(hi);
  if (hi === lo) return Math.max(5, s * 2);
  if (hole[0].suit === hole[1].suit) s += 2;
  const gap = hi - lo - 1;
  s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  if (gap <= 1 && hi < 12) s += 1;
  return Math.ceil(s);
}

function holeNotation(hole: Card[]): string {
  if (hole.length < 2) return '';
  const hi = Math.max(hole[0].rank, hole[1].rank);
  const lo = Math.min(hole[0].rank, hole[1].rank);
  const a = RANK_CHARS[hi];
  const b = RANK_CHARS[lo];
  if (hi === lo) return `${a}${b}`;
  return `${a}${b}${hole[0].suit === hole[1].suit ? 's' : 'o'}`;
}

export function preflopTier(hole: Card[]): {
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  notation: string;
  labelJa: string;
} {
  const notation = holeNotation(hole);
  const c = chenScore(hole);
  if (c >= 12) return { tier: 'S', notation, labelJa: 'プレミアム' };
  if (c >= 9) return { tier: 'A', notation, labelJa: '強いハンド' };
  if (c >= 7) return { tier: 'B', notation, labelJa: 'まずまず' };
  if (c >= 5) return { tier: 'C', notation, labelJa: '状況次第' };
  return { tier: 'D', notation, labelJa: '弱いハンド' };
}

/** Count cards that improve hero to a better category using at least one hole card (flop / turn only). */
export function analyzeOuts(hole: Card[], board: Card[]): { outs: number; labels: string[] } {
  if (hole.length < 2 || board.length < 3 || board.length >= 5) return { outs: 0, labels: [] };
  const known = new Set<number>([...hole, ...board].map(cardCode));
  const heroCodes = [...hole, ...board].map(cardCode);
  const boardCodes = board.map(cardCode);
  const n = heroCodes.length;
  const cur = Math.floor(scoreCodes(heroCodes, n) / 1048576);
  const byCat = new Map<number, number>();
  let outs = 0;
  heroCodes.push(0);
  boardCodes.push(0);
  for (let c = 0; c < 52; c++) {
    if (known.has(c)) continue;
    heroCodes[n] = c;
    boardCodes[boardCodes.length - 1] = c;
    const cat = Math.floor(scoreCodes(heroCodes, n + 1) / 1048576);
    if (cat <= cur || cat < 2) continue;
    const boardCat = boardCodes.length >= 5 ? Math.floor(scoreCodes(boardCodes, boardCodes.length) / 1048576) : -1;
    const boardPairCat = boardCodes.length < 5 ? boardOnlyCategory(boardCodes) : boardCat;
    if (cat <= boardPairCat) continue;
    outs++;
    byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
  }
  const labels: string[] = [];
  const cats = [...byCat.keys()].sort((a, b) => b - a);
  for (const cat of cats) {
    const k = byCat.get(cat) ?? 0;
    let label = HAND_NAMES[cat].ja;
    if (cat === 4 && cur < 4) label = k >= 8 ? 'オープンエンド・ストレートドロー' : 'ガットショット';
    else if (cat === 5 && cur < 5) label = 'フラッシュドロー';
    labels.push(`${label}（${k}枚）`);
  }
  return { outs, labels };
}

/** category of a 4..5 card board (pairs / trips / quads only; no straights/flushes below 5 cards) */
function boardOnlyCategory(codes: number[]): number {
  const cnt = new Map<number, number>();
  for (const c of codes) cnt.set(c >> 2, (cnt.get(c >> 2) ?? 0) + 1);
  const v = [...cnt.values()].sort((a, b) => b - a);
  if (v[0] >= 4) return 7;
  if (v[0] === 3 && (v[1] ?? 0) >= 2) return 6;
  if (v[0] === 3) return 3;
  if (v[0] === 2 && (v[1] ?? 0) === 2) return 2;
  if (v[0] === 2) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Table state machine
// ---------------------------------------------------------------------------

const STREET_JA: Record<string, string> = { flop: 'フロップ', turn: 'ターン', river: 'リバー' };

function cloneState(s: TableState): TableState {
  return {
    ...s,
    blinds: { ...s.blinds },
    seats: s.seats.map((x) => ({
      ...x,
      holeCards: x.holeCards.slice(),
      lastAction: x.lastAction ? { ...x.lastAction } : null,
    })),
    board: s.board.slice(),
    deck: s.deck.slice(),
    log: s.log.slice(),
  };
}

const isLive = (s: SeatState): boolean => !s.sittingOut && !s.folded;
const canActSeat = (s: SeatState): boolean => isLive(s) && !s.allIn;

function nextSeat(st: TableState, from: number, pred: (s: SeatState) => boolean): number {
  const n = st.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (((from + i) % n) + n) % n;
    if (pred(st.seats[idx])) return idx;
  }
  return -1;
}

function recalcPot(st: TableState): void {
  st.potTotal = st.seats.reduce((a, s) => a + s.committed, 0);
}

function putChips(s: SeatState, amount: number, toStreetBet: boolean): number {
  const amt = Math.max(0, Math.min(Math.floor(amount), s.stack));
  s.stack -= amt;
  s.committed += amt;
  if (toStreetBet) s.bet += amt;
  if (s.stack === 0) s.allIn = true;
  return amt;
}

export function createTable(opts: {
  players: { charId: string; name: string; isHuman: boolean; stack: number }[];
  blinds: Blinds;
  button?: number;
}): TableState {
  const n = opts.players.length;
  const seats: SeatState[] = opts.players.map((p, i) => ({
    seat: i,
    charId: p.charId,
    name: p.name,
    isHuman: p.isHuman,
    stack: Math.max(0, Math.floor(p.stack)),
    bet: 0,
    committed: 0,
    holeCards: [],
    folded: false,
    allIn: false,
    hasActed: false,
    sittingOut: p.stack <= 0,
    lastAction: null,
  }));
  const button = n > 0 ? ((((opts.button ?? 0) % n) + n) % n) : 0;
  return {
    seats,
    button,
    sbSeat: button,
    bbSeat: button,
    blinds: { ...opts.blinds },
    board: [],
    deck: [],
    street: 'preflop',
    toAct: null,
    currentBet: 0,
    minRaise: opts.blinds.bb,
    lastAggressor: null,
    handNumber: 0,
    potTotal: 0,
    result: null,
    log: [],
    streetRaises: 0,
    prevAggressor: null,
    lastFullBet: 0,
  };
}

export function startHand(
  state: TableState,
  opts?: { blinds?: Blinds; rng?: () => number; rebuyTo?: number },
): TableState {
  const st = cloneState(state);
  const rng = opts?.rng ?? Math.random;
  st.blinds = { ...(opts?.blinds ?? st.blinds) };
  const { sb, bb, ante } = st.blinds;
  for (const s of st.seats) {
    s.bet = 0;
    s.committed = 0;
    s.holeCards = [];
    s.folded = false;
    s.allIn = false;
    s.hasActed = false;
    s.lastAction = null;
    if (s.stack <= 0) {
      if (opts?.rebuyTo && opts.rebuyTo > 0) {
        s.stack = Math.floor(opts.rebuyTo);
        s.sittingOut = false;
      } else {
        s.stack = 0;
        s.sittingOut = true;
      }
    } else {
      s.sittingOut = false;
    }
  }
  st.board = [];
  st.result = null;
  st.street = 'preflop';
  st.currentBet = 0;
  st.minRaise = bb;
  st.lastAggressor = null;
  st.streetRaises = 0;
  st.prevAggressor = null;
  st.lastFullBet = bb;
  const players = st.seats.filter((s) => !s.sittingOut);
  if (players.length < 2) {
    st.toAct = null;
    st.street = 'showdown';
    st.deck = [];
    st.log = ['プレイヤーが足りません'];
    recalcPot(st);
    return st;
  }
  st.handNumber = state.handNumber + 1;
  const inHand = (s: SeatState): boolean => !s.sittingOut;
  if (state.handNumber === 0 && inHand(st.seats[st.button])) {
    // first hand keeps the given button
  } else {
    st.button = nextSeat(st, st.button, inHand);
  }
  if (players.length === 2) {
    st.sbSeat = st.button;
    st.bbSeat = nextSeat(st, st.button, inHand);
  } else {
    st.sbSeat = nextSeat(st, st.button, inHand);
    st.bbSeat = nextSeat(st, st.sbSeat, inHand);
  }
  st.deck = shuffle(createDeck(), rng);
  st.log = [`--- ハンド #${st.handNumber}（SB ${sb} / BB ${bb}${ante > 0 ? ` / アンテ ${ante}` : ''}）---`];
  // deal two rounds starting left of the button
  for (let round = 0; round < 2; round++) {
    let idx = st.button;
    for (let k = 0; k < players.length; k++) {
      idx = nextSeat(st, idx, inHand);
      const card = st.deck.shift();
      if (card) st.seats[idx].holeCards.push(card);
    }
  }
  if (ante > 0) {
    for (const s of players) {
      const amt = putChips(s, ante, false);
      s.lastAction = { type: 'ante', amount: amt };
    }
    st.log.push(`全員 アンテ ${ante}`);
  }
  const sbS = st.seats[st.sbSeat];
  const sbAmt = putChips(sbS, sb, true);
  sbS.lastAction = { type: 'sb', amount: sbAmt };
  st.log.push(`${sbS.name}: SB ${sbAmt}${sbS.allIn ? '（オールイン）' : ''}`);
  const bbS = st.seats[st.bbSeat];
  const bbAmt = putChips(bbS, bb, true);
  bbS.lastAction = { type: 'bb', amount: bbAmt };
  st.log.push(`${bbS.name}: BB ${bbAmt}${bbS.allIn ? '（オールイン）' : ''}`);
  st.currentBet = bb;
  advance(st, st.bbSeat);
  return st;
}

function needsAction(st: TableState, s: SeatState): boolean {
  return canActSeat(s) && (!s.hasActed || s.bet < st.currentBet);
}

function roundComplete(st: TableState): boolean {
  const actable = st.seats.filter(canActSeat);
  if (actable.length === 0) return true;
  if (actable.length === 1) {
    // nobody left to respond to: done once the lone player has matched every other live bet
    const lone = actable[0];
    const maxOther = st.seats.reduce((m, s) => (s.seat !== lone.seat && isLive(s) ? Math.max(m, s.bet) : m), 0);
    if (lone.bet >= maxOther) return true;
  }
  return !st.seats.some((s) => needsAction(st, s));
}

function returnUncalled(st: TableState): void {
  let top = -1;
  for (const s of st.seats) {
    if (top < 0 || s.committed > st.seats[top].committed) top = s.seat;
  }
  if (top < 0) return;
  let second = 0;
  for (const s of st.seats) if (s.seat !== top) second = Math.max(second, s.committed);
  const t = st.seats[top];
  const excess = t.committed - second;
  if (excess > 0) {
    t.committed -= excess;
    t.bet = Math.max(0, t.bet - excess);
    t.stack += excess;
    if (t.stack > 0) t.allIn = false;
    st.log.push(`${t.name}: コールされなかった ${excess} が戻る`);
  }
  recalcPot(st);
}

function dealStreet(st: TableState): void {
  const next = st.street === 'preflop' ? 'flop' : st.street === 'flop' ? 'turn' : 'river';
  st.deck.shift(); // burn
  const count = next === 'flop' ? 3 : 1;
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    const c = st.deck.shift();
    if (c) cards.push(c);
  }
  st.board.push(...cards);
  st.street = next;
  st.log.push(`--- ${STREET_JA[next]}: ${cards.map(cardLabel).join(' ')} ---`);
}

function beginStreet(st: TableState): void {
  st.prevAggressor = st.lastAggressor;
  st.lastAggressor = null;
  st.currentBet = 0;
  st.minRaise = st.blinds.bb;
  st.streetRaises = 0;
  st.lastFullBet = 0;
  for (const s of st.seats) {
    s.bet = 0;
    s.hasActed = false;
    if (!s.allIn) s.lastAction = null;
  }
  dealStreet(st);
}

function advance(st: TableState, from: number): void {
  recalcPot(st);
  const contenders = st.seats.filter(isLive);
  if (contenders.length <= 1) {
    finishUncontested(st, contenders[0]?.seat ?? from);
    return;
  }
  if (!roundComplete(st)) {
    const nx = nextSeat(st, from, (s) => needsAction(st, s));
    st.toAct = nx >= 0 ? nx : null;
    if (st.toAct !== null) return;
  }
  returnUncalled(st);
  st.toAct = null;
  if (st.street === 'river') {
    doShowdown(st);
    return;
  }
  const actable = st.seats.filter(canActSeat).length;
  if (actable <= 1) {
    // all-in run-out
    while (st.board.length < 5 && st.deck.length > 0) beginStreet(st);
    doShowdown(st);
    return;
  }
  beginStreet(st);
  const first = nextSeat(st, st.button, canActSeat);
  st.toAct = first >= 0 ? first : null;
}

function clockwiseOrder(st: TableState, seats: number[]): number[] {
  const n = st.seats.length;
  return seats.slice().sort((a, b) => ((a - st.button - 1 + n * 2) % n) - ((b - st.button - 1 + n * 2) % n));
}

function finishHand(st: TableState, result: HandResult): void {
  for (const s of st.seats) s.bet = 0;
  st.street = 'showdown';
  st.toAct = null;
  st.result = result;
  recalcPot(st);
}

function finishUncontested(st: TableState, winner: number): void {
  returnUncalled(st);
  const total = st.seats.reduce((a, s) => a + s.committed, 0);
  const w = st.seats[winner];
  w.stack += total;
  st.log.push(`${w.name} が ${total} を獲得`);
  const pot: PotResult = { amount: total, eligible: [winner], winners: [winner], label: 'メインポット', handName: '' };
  finishHand(st, {
    showdown: false,
    pots: [pot],
    payouts: { [winner]: total },
    reveals: [],
    winners: [winner],
    headline: '',
  });
}

function doShowdown(st: TableState): void {
  const contenders = clockwiseOrder(
    st,
    st.seats.filter(isLive).map((s) => s.seat),
  );
  const hands = new Map<number, EvaluatedHand>();
  const reveals: { seat: number; hand: EvaluatedHand }[] = [];
  st.log.push('--- ショーダウン ---');
  for (const seat of contenders) {
    const s = st.seats[seat];
    const hand = evaluate7([...s.holeCards, ...st.board]);
    hands.set(seat, hand);
    reveals.push({ seat, hand });
    st.log.push(`${s.name}: ${s.holeCards.map(cardLabel).join(' ')}（${hand.nameJa}）`);
  }
  const levels = [...new Set(contenders.map((c) => st.seats[c].committed))].sort((a, b) => a - b);
  const pots: PotResult[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const s of st.seats) amount += Math.max(0, Math.min(s.committed, level) - prev);
    const eligible = contenders.filter((c) => st.seats[c].committed >= level);
    prev = level;
    if (amount <= 0) continue;
    pots.push({ amount, eligible, winners: [], label: '', handName: '' });
  }
  const totalCommitted = st.seats.reduce((a, s) => a + s.committed, 0);
  const distributed = pots.reduce((a, p) => a + p.amount, 0);
  if (pots.length > 0 && totalCommitted > distributed) pots[pots.length - 1].amount += totalCommitted - distributed;
  const payouts: Record<number, number> = {};
  pots.forEach((pot, i) => {
    pot.label = i === 0 ? 'メインポット' : `サイドポット${i}`;
    let best = -1;
    for (const e of pot.eligible) best = Math.max(best, hands.get(e)?.score ?? -1);
    pot.winners = pot.eligible.filter((e) => (hands.get(e)?.score ?? -1) === best);
    pot.handName = hands.get(pot.winners[0])?.nameJa ?? '';
    const base = Math.floor(pot.amount / pot.winners.length);
    let rem = pot.amount - base * pot.winners.length;
    for (const w of pot.winners) {
      const won = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
      payouts[w] = (payouts[w] ?? 0) + won;
      st.seats[w].stack += won;
    }
    const names = pot.winners.map((w) => st.seats[w].name).join('・');
    const split = pot.winners.length > 1 ? '（分配）' : '';
    st.log.push(`${names} が ${pot.label} ${pot.amount} を獲得${split}（${pot.handName}）`);
  });
  const winners = clockwiseOrder(st, Object.keys(payouts).map(Number));
  const contestedPay: Record<number, number> = {};
  for (const pot of pots) {
    if (pot.eligible.length < 2) continue;
    const share = Math.floor(pot.amount / Math.max(1, pot.winners.length));
    for (const w of pot.winners) contestedPay[w] = (contestedPay[w] ?? 0) + share;
  }
  const contestedWinners = winners.filter((w) => (contestedPay[w] ?? 0) > 0);
  const pool = contestedWinners.length > 0 ? contestedWinners : winners;
  const rankMap = contestedWinners.length > 0 ? contestedPay : payouts;
  let headSeat = pool[0];
  for (const w of pool) if ((rankMap[w] ?? 0) > (rankMap[headSeat] ?? 0)) headSeat = w;
  finishHand(st, {
    showdown: true,
    pots,
    payouts,
    reveals,
    winners,
    headline: headSeat !== undefined ? hands.get(headSeat)?.nameJa ?? '' : '',
  });
}

export function legalActions(state: TableState): LegalActions {
  const none: LegalActions = {
    canFold: false,
    canCheck: false,
    canCall: false,
    callAmount: 0,
    canBet: false,
    canRaise: false,
    minRaiseTo: 0,
    maxRaiseTo: 0,
  };
  if (state.toAct === null || state.result) return none;
  const s = state.seats[state.toAct];
  if (!s || !canActSeat(s)) return none;
  const toCall = Math.max(0, state.currentBet - s.bet);
  const callAmount = Math.min(toCall, s.stack);
  const othersCanAct = state.seats.some((o) => o.seat !== s.seat && canActSeat(o));
  const raiseAllowed = othersCanAct && s.stack > toCall && !s.hasActed;
  const maxRaiseTo = s.bet + s.stack;
  const minRaiseTo = Math.min(state.currentBet + Math.max(state.minRaise, state.blinds.bb, 1), maxRaiseTo);
  return {
    canFold: toCall > 0,
    canCheck: toCall === 0,
    canCall: toCall > 0 && s.stack > 0,
    callAmount,
    canBet: raiseAllowed && state.currentBet === 0,
    canRaise: raiseAllowed && state.currentBet > 0,
    minRaiseTo,
    maxRaiseTo,
  };
}

export function applyAction(state: TableState, action: PlayerAction): TableState {
  if (state.result || state.toAct === null) return state;
  const la = legalActions(state);
  const st = cloneState(state);
  const idx = st.toAct as number;
  const s = st.seats[idx];
  const canAggress = la.canBet || la.canRaise;
  let type = action.type;
  let target = 0;
  if (type === 'fold' && la.canCheck) type = 'check';
  if (type === 'check' && !la.canCheck) type = 'call';
  if (type === 'call' && la.canCheck) type = 'check';
  if (type === 'bet' || type === 'raise') {
    if (!canAggress) {
      type = la.canCheck ? 'check' : 'call';
    } else {
      const raw = action.amount;
      let amt = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : la.minRaiseTo;
      amt = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, amt));
      if (amt >= la.maxRaiseTo) type = 'allin';
      else target = amt;
    }
  }
  if (type === 'allin') {
    if (canAggress) target = la.maxRaiseTo;
    else type = la.canCheck ? 'check' : 'call';
  }

  if (type === 'fold') {
    s.folded = true;
    s.lastAction = { type: 'fold', amount: 0 };
    st.log.push(`${s.name}: フォールド`);
  } else if (type === 'check') {
    s.lastAction = { type: 'check', amount: 0 };
    st.log.push(`${s.name}: チェック`);
  } else if (type === 'call') {
    const amt = putChips(s, st.currentBet - s.bet, true);
    s.lastAction = { type: s.allIn ? 'allin' : 'call', amount: amt };
    st.log.push(`${s.name}: コール ${amt}${s.allIn ? '（オールイン）' : ''}`);
  } else {
    const wasBet = st.currentBet === 0;
    const add = putChips(s, target - s.bet, true);
    const raiseBy = s.bet - st.currentBet;
    const cumulativeRaise = s.bet - (st.lastFullBet ?? st.currentBet);
    if (raiseBy >= st.minRaise || cumulativeRaise >= st.minRaise) {
      st.minRaise = Math.max(st.minRaise, raiseBy);
      st.lastFullBet = s.bet;
      st.lastAggressor = idx;
      for (const o of st.seats) if (o.seat !== idx) o.hasActed = false;
    }
    if (s.bet > st.currentBet) {
      st.currentBet = s.bet;
      st.streetRaises = (st.streetRaises ?? 0) + 1;
    }
    const finalType = s.allIn ? 'allin' : wasBet ? 'bet' : 'raise';
    s.lastAction = { type: finalType, amount: add };
    const verb = s.allIn ? 'オールイン' : wasBet ? 'ベット' : 'レイズ';
    st.log.push(`${s.name}: ${verb} ${s.bet}`);
  }
  s.hasActed = true;
  if (s.stack === 0 && !s.folded) s.allIn = true;
  advance(st, idx);
  return st;
}

export function isHandOver(state: TableState): boolean {
  return state.result !== null || state.toAct === null;
}

export function activeSeats(state: TableState): number[] {
  return state.seats.filter(isLive).map((s) => s.seat);
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

type Mood = AiDecision['mood'];

interface AiCtx {
  st: TableState;
  me: SeatState;
  la: LegalActions;
  p: AiProfile;
  rng: () => number;
  bb: number;
  sb: number;
  pot: number;
  toCall: number;
  /** effective stack in big blinds (vs the biggest live opponent) */
  effBB: number;
  opponents: number;
  /** 0 = first to act postflop, 1 = last (button) */
  pos: number;
  raises: number;
}

function roundTo(x: number, unit: number): number {
  const u = Math.max(1, unit);
  return Math.round(x / u) * u;
}

/** Convert any intended action into a strictly legal one. */
function legalize(c: AiCtx, action: PlayerAction, mood: Mood): AiDecision {
  const { la } = c;
  const canAggress = la.canBet || la.canRaise;
  const passive = (): AiDecision => ({
    action: la.canCheck ? { type: 'check' } : { type: 'call' },
    mood,
  });
  switch (action.type) {
    case 'fold':
      return la.canCheck ? { action: { type: 'check' }, mood } : { action: { type: 'fold' }, mood };
    case 'check':
      return la.canCheck ? { action: { type: 'check' }, mood } : { action: { type: 'fold' }, mood };
    case 'call':
      return passive();
    case 'allin':
      if (canAggress) return { action: { type: 'allin' }, mood };
      return passive();
    case 'bet':
    case 'raise': {
      if (!canAggress) return passive();
      let amt = roundTo(action.amount ?? la.minRaiseTo, c.sb);
      amt = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, amt));
      // commit fully when the bet would leave a tiny stack behind
      if (amt >= la.maxRaiseTo || la.maxRaiseTo - amt < c.bb * 1.5 || amt >= la.maxRaiseTo * 0.85) {
        return { action: { type: 'allin' }, mood };
      }
      return { action: { type: la.canBet ? 'bet' : 'raise', amount: amt }, mood };
    }
    default:
      return passive();
  }
}

function buildCtx(st: TableState, p: AiProfile, rng: () => number): AiCtx | null {
  if (st.toAct === null) return null;
  const me = st.seats[st.toAct];
  const la = legalActions(st);
  const bb = Math.max(1, st.blinds.bb);
  const sb = Math.max(1, st.blinds.sb);
  const opps = st.seats.filter((s) => isLive(s) && s.seat !== me.seat);
  const biggest = opps.reduce((m, s) => Math.max(m, s.stack + s.bet), 0);
  const eff = Math.min(me.stack + me.bet, biggest);
  const order = clockwiseOrder(st, st.seats.filter(isLive).map((s) => s.seat));
  const myIdx = order.indexOf(me.seat);
  const pos = order.length > 1 ? myIdx / (order.length - 1) : 1;
  return {
    st,
    me,
    la,
    p,
    rng,
    bb,
    sb,
    pot: st.potTotal,
    toCall: la.callAmount,
    effBB: eff / bb,
    opponents: opps.length,
    pos,
    raises: st.streetRaises ?? 0,
  };
}

function raiseTo(c: AiCtx, potFraction: number): number {
  // size relative to the pot after calling
  return c.st.currentBet + (c.pot + c.toCall) * potFraction;
}

function tacticalBetFraction(p: AiProfile, rng: () => number, street: Street, isStrongValue: boolean): number {
  const bias = p.sizingBias ?? 'geometric';
  if (bias === 'small') {
    return isStrongValue ? 0.45 + rng() * 0.18 : 0.33 + rng() * 0.12;
  }
  if (bias === 'polarized') {
    if (isStrongValue || street === 'river') {
      return 0.95 + rng() * 0.3;
    }
    return 0.45 + rng() * 0.15;
  }
  if (bias === 'pot') {
    return isStrongValue ? 0.78 + rng() * 0.25 : 0.65 + rng() * 0.2;
  }
  // geometric (60-68% pot)
  return 0.58 + rng() * 0.14;
}

function preflopDecision(c: AiCtx): AiDecision {
  const { p, rng, st, me, bb } = c;
  const chen = chenScore(me.holeCards);
  const dealt = st.seats.filter((s) => !s.sittingOut).length;
  const isPocketPair = me.holeCards.length === 2 && me.holeCards[0].rank === me.holeCards[1].rank;
  const isSuitedConnector =
    me.holeCards.length === 2 &&
    me.holeCards[0].suit === me.holeCards[1].suit &&
    Math.abs(me.holeCards[0].rank - me.holeCards[1].rank) <= 2 &&
    Math.min(me.holeCards[0].rank, me.holeCards[1].rank) >= 5;
  const stealBonus = c.pos >= 0.65 ? (p.stealFreq ?? 0.6) * 0.9 : 0;
  const specBonus =
    c.effBB >= 25 &&
    ((p.archetype === 'set_mine_implied' && (isPocketPair || isSuitedConnector)) ||
      (p.archetype === 'suited_draw_semi_bluff' && isSuitedConnector))
      ? 1.1
      : 0;
  const adj = chen + (c.pos - 0.5) * 2 + (6 - dealt) * 0.35 + (p.looseness - 0.5) * 2 + stealBonus * 0.5 + specBonus;
  const raiseLevel = st.currentBet / bb;
  const capped = c.raises >= 4;

  // short-stack push / fold
  if (c.effBB <= 12) {
    if (raiseLevel <= 1) {
      const thr = 8 - p.shove * 3 - (12 - c.effBB) * 0.15;
      if (adj >= thr) return legalize(c, { type: 'allin' }, 'confident');
      return legalize(c, { type: 'check' }, 'normal');
    }
    const callThr = 10 - p.shove * 2 - p.stickiness + (raiseLevel > 4 ? 0.5 : 0) - (c.toCall <= bb ? 2 : 0);
    if (adj >= callThr) return legalize(c, { type: 'allin' }, adj >= callThr + 3 ? 'confident' : 'nervous');
    return legalize(c, { type: 'fold' }, 'normal');
  }

  if (raiseLevel <= 1) {
    // unopened (or limped) pot
    const openThr = 8.5 - p.looseness * 3.5 - stealBonus * 0.35;
    const limpers = Math.max(0, st.seats.filter((s) => isLive(s) && s.bet >= bb && s.seat !== st.bbSeat).length);
    const openMult = p.sizingBias === 'small' ? 2.1 : p.sizingBias === 'pot' ? 2.8 : 2.4 + p.aggression * 0.5;
    const size = bb * (openMult + limpers);
    if (adj >= openThr + 3.5 || (adj >= openThr && rng() < 0.52 + p.aggression * 0.45)) {
      return legalize(c, { type: 'raise', amount: size }, adj >= openThr + 5 ? 'confident' : 'normal');
    }
    if (c.la.canCheck) {
      if (rng() < p.bluff * 0.12) return legalize(c, { type: 'raise', amount: size }, 'bluffing');
      return legalize(c, { type: 'check' }, 'normal');
    }
    if (adj >= openThr - 1.2 && (specBonus > 0 || rng() < p.looseness * (1.05 - p.aggression * 0.8))) {
      return legalize(c, { type: 'call' }, 'thinking');
    }
    if (me.seat === st.sbSeat && adj >= openThr - 2.5 && rng() < p.looseness * 0.5) {
      return legalize(c, { type: 'call' }, 'normal');
    }
    return legalize(c, { type: 'fold' }, 'normal');
  }

  // facing a raise
  const potOdds = c.toCall / (c.pot + c.toCall);
  const callersCount = st.seats.filter((s) => isLive(s) && s.bet === st.currentBet).length;
  const squeezeBonus =
    callersCount >= 2 && (p.archetype === 'late_steal_squeeze' || p.archetype === 'pressure_3bet') ? 1.0 : 0;
  const threeBetThr =
    12.5 - p.aggression * 2.5 - squeezeBonus + (raiseLevel > 7 ? 2 : 0) + (raiseLevel > 20 ? 1.5 : 0);
  let callThr = 7.5 + Math.min(raiseLevel, 12) * 0.3 - p.looseness * 2.5 - p.stickiness * 1.2;
  if (potOdds < 0.25) callThr -= 1;
  // Set-mining implied odds with pocket pairs or suited connectors when deep
  if ((isPocketPair || isSuitedConnector) && c.toCall <= me.stack * 0.1 && c.effBB >= 25) {
    callThr -= p.archetype === 'set_mine_implied' ? 2.2 : 1.0;
  }
  const commit = c.toCall >= me.stack * 0.5;
  if (capped) {
    if (adj >= 15) return legalize(c, { type: 'allin' }, 'confident');
    if (adj >= callThr + 2) return legalize(c, { type: 'call' }, 'thinking');
    return legalize(c, { type: 'fold' }, 'nervous');
  }
  if (adj >= threeBetThr) {
    if (chen >= 16 && (raiseLevel > 7 || rng() < p.shove * 0.3)) return legalize(c, { type: 'allin' }, 'confident');
    const mult = c.pos > 0.6 ? 3 : 3.5;
    return legalize(c, { type: 'raise', amount: st.currentBet * mult }, 'confident');
  }
  if (chen >= 5 && raiseLevel < 8 && rng() < p.bluff * 0.08) {
    return legalize(c, { type: 'raise', amount: st.currentBet * 3 }, 'bluffing');
  }
  if (adj >= callThr || (commit && adj >= callThr + 1)) {
    return legalize(c, { type: 'call' }, raiseLevel > 6 ? 'nervous' : 'thinking');
  }
  return legalize(c, { type: 'fold' }, 'normal');
}

function postflopDecision(c: AiCtx): AiDecision {
  const { p, rng, st, me } = c;
  const iters = c.opponents >= 4 ? 110 : 150;
  const eq = estimateEquity(me.holeCards, st.board, c.opponents, iters, rng);
  const outs = st.board.length < 5 ? analyzeOuts(me.holeCards, st.board).outs : 0;
  const strongDraw = outs >= 8;
  const river = st.street === 'river';
  const spr = me.stack / Math.max(1, c.pot);
  const capped = c.raises >= 4;
  const checkRaiseTendency = p.checkRaiseFreq ?? (1 - p.aggression) * 0.25;
  const cbetTendency = p.cbetFreq ?? 0.45 + p.aggression * 0.35;
  const probeTendency = p.probeBetFreq ?? 0.35 + p.aggression * 0.25;
  // multiway pots need more equity
  const need = (base: number): number => base + (c.opponents - 1) * 6;

  if (c.la.canCheck) {
    const iAmAggressor = st.prevAggressor === me.seat;
    if (eq >= need(68)) {
      // Tactical trap (slowplay to check-raise) when out of position or check-raise specialist
      const trapChance =
        c.pos < 0.5 ? checkRaiseTendency * 0.65 : p.archetype === 'slowplay_check_raise' ? 0.32 : 0.08;
      if (!river && rng() < trapChance) return legalize(c, { type: 'check' }, 'thinking');
      const frac = tacticalBetFraction(p, rng, st.street, eq >= 84);
      if (spr < 1.3 && rng() < 0.45 + p.shove * 0.5) return legalize(c, { type: 'allin' }, 'confident');
      return legalize(c, { type: 'bet', amount: c.pot * frac }, 'confident');
    }
    if (eq >= need(50) && rng() < 0.28 + p.aggression * 0.48) {
      const frac = tacticalBetFraction(p, rng, st.street, false);
      return legalize(c, { type: 'bet', amount: c.pot * frac }, 'normal');
    }
    if (iAmAggressor && st.street === 'flop' && c.opponents <= 2 && rng() < cbetTendency) {
      const frac = tacticalBetFraction(p, rng, st.street, false);
      return legalize(c, { type: 'bet', amount: c.pot * frac }, eq < 40 ? 'bluffing' : 'normal');
    }
    // Delayed turn C-bet or turn/river probe bet when checked to
    if (st.street !== 'flop' && c.opponents <= 2 && (eq >= 42 || strongDraw) && rng() < probeTendency * 0.65) {
      const frac = tacticalBetFraction(p, rng, st.street, false);
      return legalize(c, { type: 'bet', amount: c.pot * frac }, eq < 48 ? 'bluffing' : 'normal');
    }
    if (strongDraw && rng() < p.drawLove * 0.5 + p.aggression * 0.2) {
      const frac = tacticalBetFraction(p, rng, st.street, false);
      return legalize(c, { type: 'bet', amount: c.pot * frac }, 'bluffing');
    }
    const bluffChance = p.bluff * (river ? 0.28 : 0.16) * (c.opponents <= 1 ? 1 : 0.4);
    if (rng() < bluffChance) {
      const frac = tacticalBetFraction(p, rng, st.street, river && p.sizingBias === 'polarized');
      return legalize(c, { type: 'bet', amount: c.pot * frac }, 'bluffing');
    }
    return legalize(c, { type: 'check' }, eq < 30 ? 'nervous' : 'normal');
  }

  // facing a bet
  const potOdds = c.toCall / (c.pot + c.toCall);
  const checkedThisStreet = me.lastAction?.type === 'check';
  const floatBonus =
    st.street === 'flop' && c.pos > 0.55 && p.archetype === 'float_probe_tricky' && c.toCall <= c.pot * 0.55
      ? 0.045
      : 0;
  const perceived = eq / 100 + p.stickiness * 0.08 + floatBonus;
  const bigBet = c.toCall > c.pot * 0.75;
  if (!capped) {
    if (eq >= need(76) && rng() < 0.3 + p.aggression * 0.6) {
      if (spr < 1.5 || (eq >= 90 && rng() < p.shove * 0.65)) return legalize(c, { type: 'allin' }, 'confident');
      return legalize(c, { type: 'raise', amount: raiseTo(c, 0.75 + rng() * 0.3) }, 'confident');
    }
    if (checkedThisStreet && eq >= need(58) && rng() < 0.28 + checkRaiseTendency * 0.75) {
      return legalize(c, { type: 'raise', amount: raiseTo(c, 0.82) }, 'confident');
    }
    if (strongDraw && !river && c.raises <= 1 && rng() < (p.drawLove * 0.45 + checkRaiseTendency * 0.25)) {
      return legalize(c, { type: 'raise', amount: raiseTo(c, 0.72) }, 'bluffing');
    }
    if (c.raises <= 1 && c.opponents <= 1 && rng() < p.bluff * 0.05) {
      return legalize(c, { type: 'raise', amount: raiseTo(c, 0.8) }, 'bluffing');
    }
  }
  const margin = 0.03 + (c.opponents - 1) * 0.04 + (bigBet ? 0.04 : 0);
  if (perceived >= potOdds + margin) {
    return legalize(c, { type: 'call' }, eq >= 60 ? 'confident' : bigBet ? 'nervous' : 'thinking');
  }
  // implied odds for draws
  if (!river && outs >= 4) {
    const drawEq = Math.min(0.5, (outs * (st.board.length === 3 ? 4 : 2)) / 100);
    if (drawEq + p.drawLove * 0.12 >= potOdds) return legalize(c, { type: 'call' }, 'thinking');
  }
  if (capped && eq >= need(70)) return legalize(c, { type: 'call' }, 'thinking');
  return legalize(c, { type: 'fold' }, 'nervous');
}

export function decideAi(state: TableState, profile: AiProfile, rng: () => number = Math.random): AiDecision {
  const c = buildCtx(state, profile, rng);
  if (!c) return { action: { type: 'check' }, mood: 'normal' };
  return state.street === 'preflop' ? preflopDecision(c) : postflopDecision(c);
}
