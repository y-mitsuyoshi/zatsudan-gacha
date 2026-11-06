import type { Card, EvaluatedHand, TableState } from '../types';
import { compareHands, evaluate7 } from '../engine';
import type { HoldemSettings } from '../profile';

/** Percent positions (x, y) of each seat around the table box, seat 0 = hero (bottom center). */
const LANDSCAPE: Record<number, [number, number][]> = {
  2: [[50, 96], [50, 5]],
  3: [[50, 96], [10, 30], [90, 30]],
  4: [[50, 96], [5, 50], [50, 5], [95, 50]],
  5: [[50, 96], [6, 62], [24, 7], [76, 7], [94, 62]],
  6: [[50, 96], [6, 70], [15, 12], [50, 4], [85, 12], [94, 70]],
};

const PORTRAIT: Record<number, [number, number][]> = {
  2: [[50, 97], [50, 4]],
  3: [[50, 97], [8, 32], [92, 32]],
  4: [[50, 97], [6, 50], [50, 4], [94, 50]],
  5: [[50, 97], [6, 66], [16, 12], [84, 12], [94, 66]],
  6: [[50, 97], [6, 68], [6, 30], [50, 4], [94, 30], [94, 68]],
};

export interface Pt {
  x: number;
  y: number;
}

export interface TableGeometry {
  w: number;
  h: number;
  portrait: boolean;
  compact: boolean;
  seats: Pt[];
  bets: Pt[];
  pot: Pt;
  center: Pt;
  dealer: Pt;
}

export function computeGeometry(n: number, w: number, h: number, portrait: boolean): TableGeometry {
  const table = (portrait ? PORTRAIT : LANDSCAPE)[Math.max(2, Math.min(6, n))] ?? LANDSCAPE[6];
  const seats = table.map(([x, y]) => ({ x: (x / 100) * w, y: (y / 100) * h }));
  const center = { x: w / 2, y: h / 2 };
  const bets = seats.map((s, i) => {
    const t = i === 0 ? 0.3 : 0.36;
    return { x: s.x + (center.x - s.x) * t, y: s.y + (center.y - s.y) * t };
  });
  return {
    w,
    h,
    portrait,
    compact: Math.min(w, h) < 420 || w < 560,
    seats,
    bets,
    pot: { x: w / 2, y: h * (portrait ? 0.36 : 0.33) },
    center,
    dealer: { x: w / 2, y: h * (portrait ? 0.3 : 0.26) },
  };
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export const CHIP_DENOMS = [1000, 500, 100, 25, 5, 1] as const;
export type ChipDenom = (typeof CHIP_DENOMS)[number];

/** Break an amount into chip denominations (largest first), capped to `max` chips. */
export function breakChips(amount: number, max = 12): ChipDenom[] {
  const out: ChipDenom[] = [];
  let rest = Math.max(0, Math.round(amount));
  for (const d of CHIP_DENOMS) {
    while (rest >= d && out.length < max) {
      out.push(d);
      rest -= d;
    }
  }
  return out;
}

export function thinkDelay(speed: HoldemSettings['speed']): number {
  const base = speed === 'slow' ? 1400 : speed === 'fast' ? 380 : 850;
  return base + Math.random() * base * 0.6;
}

export const SUIT_SYMBOL: Record<Card['suit'], string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

export function rankLabel(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  if (rank === 10) return '10';
  return String(rank);
}

export function handTitleEn(hand: EvaluatedHand): string {
  if (hand.category === 8 && hand.best5.some((c) => c.rank === 14) && hand.best5.some((c) => c.rank === 13)) {
    return 'ROYAL FLUSH';
  }
  const names = [
    'HIGH CARD',
    'ONE PAIR',
    'TWO PAIR',
    'THREE OF A KIND',
    'STRAIGHT',
    'FLUSH',
    'FULL HOUSE',
    'FOUR OF A KIND',
    'STRAIGHT FLUSH',
  ];
  return names[hand.category] ?? hand.nameEn.toUpperCase();
}

const ALL_CARDS: Card[] = (() => {
  const out: Card[] = [];
  const suits: Card['suit'][] = ['s', 'h', 'd', 'c'];
  const r = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  for (const s of suits) for (let k = 2; k <= 14; k++) out.push({ rank: k, suit: s, id: `${r[k]}${s}` });
  return out;
})();

/**
 * Exact (river / turn) or Monte-Carlo (flop / preflop) multi-way equity with all hole cards known.
 * Returns seat → 0..100 (ties split).
 */
export function runoutEquity(players: { seat: number; hole: Card[] }[], board: Card[], iterations = 700): Record<number, number> {
  const res: Record<number, number> = {};
  players.forEach((p) => (res[p.seat] = 0));
  if (players.length === 0) return res;
  const used = new Set<string>();
  players.forEach((p) => p.hole.forEach((c) => used.add(`${c.rank}${c.suit}`)));
  board.forEach((c) => used.add(`${c.rank}${c.suit}`));
  const deck = ALL_CARDS.filter((c) => !used.has(`${c.rank}${c.suit}`));
  const need = 5 - board.length;
  let total = 0;
  const score = (full: Card[]) => {
    let best: EvaluatedHand | null = null;
    let winners: number[] = [];
    for (const p of players) {
      const h = evaluate7([...p.hole, ...full]);
      if (!best) {
        best = h;
        winners = [p.seat];
        continue;
      }
      const c = compareHands(h, best);
      if (c > 0) {
        best = h;
        winners = [p.seat];
      } else if (c === 0) winners.push(p.seat);
    }
    winners.forEach((s) => (res[s] += 1 / winners.length));
    total += 1;
  };
  if (need <= 0) score(board);
  else if (need === 1) deck.forEach((c) => score([...board, c]));
  else if (need === 2) {
    for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) score([...board, deck[i], deck[j]]);
  } else {
    for (let it = 0; it < iterations; it++) {
      const pick: Card[] = [];
      const taken = new Set<number>();
      while (pick.length < need) {
        const k = Math.floor(Math.random() * deck.length);
        if (taken.has(k)) continue;
        taken.add(k);
        pick.push(deck[k]);
      }
      score([...board, ...pick]);
    }
  }
  players.forEach((p) => (res[p.seat] = total ? (res[p.seat] / total) * 100 : 0));
  return res;
}

export function inHandSeats(s: TableState): number[] {
  return s.seats.filter((x) => !x.sittingOut && !x.folded && x.holeCards.length > 0).map((x) => x.seat);
}

export function middlePot(s: TableState): number {
  return Math.max(0, s.potTotal - s.seats.reduce((a, x) => a + x.bet, 0));
}

export type BadgeType = 'check' | 'call' | 'bet' | 'raise' | 'allin' | 'fold';

export const BADGE_STYLE: Record<BadgeType, { label: string; cls: string }> = {
  check: { label: 'CHECK', cls: 'from-sky-300 via-sky-500 to-blue-700' },
  call: { label: 'CALL', cls: 'from-emerald-300 via-emerald-500 to-teal-700' },
  bet: { label: 'BET', cls: 'from-amber-200 via-amber-400 to-orange-600' },
  raise: { label: 'RAISE', cls: 'from-amber-200 via-orange-400 to-rose-600' },
  allin: { label: 'ALL-IN', cls: 'from-fuchsia-300 via-rose-500 to-red-700' },
  fold: { label: 'FOLD', cls: 'from-slate-300 via-slate-500 to-slate-700' },
};

export const STAMPS: { id: string; text: string; emoji: string }[] = [
  { id: 'hello', text: 'よろしく', emoji: '👋' },
  { id: 'nice', text: 'ナイス！', emoji: '👍' },
  { id: 'wow', text: 'まさか！？', emoji: '😱' },
  { id: 'strong', text: '強い…', emoji: '😣' },
  { id: 'thanks', text: 'ありがとう', emoji: '🙏' },
  { id: 'think', text: '考え中', emoji: '🤔' },
  { id: 'dm', text: 'ドンマイ', emoji: '🍀' },
  { id: 'fight', text: '勝負！', emoji: '🔥' },
];
