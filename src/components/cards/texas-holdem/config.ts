import type { CharId, FeltId } from './characters';
import type { Blinds } from './types';

export type GameModeId = 'lounge' | 'tournament' | 'duel';

export interface TableConfig {
  mode: GameModeId;
  hero: CharId;
  /** opponents seated clockwise after hero (seat 0 = hero) */
  opponents: CharId[];
  felt: FeltId;
  startingStack: number;
  /** initial blinds */
  blinds: Blinds;
  /** tournament: blinds go up every N hands (0 = never) */
  levelUpEveryHands: number;
  /** lounge: busted players auto re-buy */
  autoRebuy: boolean;
}

export interface ModePreset {
  id: GameModeId;
  name: string;
  nameEn: string;
  description: string;
  seats: number[]; // allowed table sizes
  startingStack: number;
  blinds: Blinds;
  levelUpEveryHands: number;
  autoRebuy: boolean;
  /** rank point multiplier */
  rankMultiplier: number;
}

export const MODE_PRESETS: Record<GameModeId, ModePreset> = {
  lounge: {
    id: 'lounge',
    name: 'ラウンジ・テーブル',
    nameEn: 'LOUNGE CASH GAME',
    description: 'チップが尽きても自動リバイ。好きなだけ遊べるリングゲーム（4人 / 6人）。',
    seats: [4, 6],
    startingStack: 2000,
    blinds: { sb: 10, bb: 20, ante: 0 },
    levelUpEveryHands: 0,
    autoRebuy: true,
    rankMultiplier: 1,
  },
  tournament: {
    id: 'tournament',
    name: 'ナイト・トーナメント',
    nameEn: 'MIDNIGHT TOURNAMENT',
    description: '6人のシット＆ゴー。5ハンドごとにブラインド上昇、最後の1人になるまで戦う本格トーナメント。',
    seats: [6],
    startingStack: 1500,
    blinds: { sb: 10, bb: 20, ante: 0 },
    levelUpEveryHands: 5,
    autoRebuy: false,
    rankMultiplier: 1.6,
  },
  duel: {
    id: 'duel',
    name: '1on1 デュエル',
    nameEn: 'HEADS-UP DUEL',
    description: '好きなキャラクターと一騎打ち。どちらかのチップが尽きるまでの真剣勝負。',
    seats: [2],
    startingStack: 1000,
    blinds: { sb: 10, bb: 20, ante: 0 },
    levelUpEveryHands: 8,
    autoRebuy: false,
    rankMultiplier: 1.2,
  },
};

/** Tournament blind schedule (level index → blinds). */
export const BLIND_LEVELS: Blinds[] = [
  { sb: 10, bb: 20, ante: 0 },
  { sb: 15, bb: 30, ante: 0 },
  { sb: 25, bb: 50, ante: 5 },
  { sb: 50, bb: 100, ante: 10 },
  { sb: 75, bb: 150, ante: 15 },
  { sb: 100, bb: 200, ante: 25 },
  { sb: 150, bb: 300, ante: 30 },
  { sb: 200, bb: 400, ante: 50 },
  { sb: 300, bb: 600, ante: 75 },
  { sb: 500, bb: 1000, ante: 100 },
];

export function blindsForHand(cfg: TableConfig, handNumber: number): { blinds: Blinds; level: number } {
  if (!cfg.levelUpEveryHands) return { blinds: cfg.blinds, level: 1 };
  const idx = Math.min(BLIND_LEVELS.length - 1, Math.floor(Math.max(0, handNumber - 1) / cfg.levelUpEveryHands));
  return { blinds: BLIND_LEVELS[idx], level: idx + 1 };
}

/** Per-hand report from the table to the app shell (used for rank / stats). */
export interface HandReport {
  handNumber: number;
  heroWon: boolean;
  /** chips hero received minus chips hero committed this hand */
  heroNet: number;
  potTotal: number;
  bigBlind: number;
  wentToShowdown: boolean;
  heroAllIn: boolean;
  /** hero's best hand at showdown (category -1 if not shown) */
  heroHandCategory: number;
  heroHandName: string;
  /** characters that hero beat at showdown this hand (for affection) */
  opponentsInHand: CharId[];
}

export interface SessionSummary {
  mode: GameModeId;
  handsPlayed: number;
  /** hero final chips minus starting chips (lounge: includes re-buys as negative) */
  netChips: number;
  /** tournament / duel placement (1 = winner), 0 for lounge */
  placement: number;
  players: number;
  /** true if the session reached a natural end (tournament finished) */
  completed: boolean;
}

/** Rank points awarded for a finished session (applied in the app shell). */
export function sessionRankPoints(s: SessionSummary): number {
  const mult = MODE_PRESETS[s.mode].rankMultiplier;
  if (s.mode === 'lounge') {
    return Math.round(Math.max(-20, Math.min(60, s.netChips / 100)) * mult);
  }
  if (!s.completed) return Math.round(-15 * mult);
  const table: Record<number, number> = { 1: 90, 2: 45, 3: 15, 4: -5, 5: -15, 6: -25 };
  const base = s.players === 2 ? (s.placement === 1 ? 60 : -20) : table[s.placement] ?? 0;
  return Math.round(base * mult);
}

/** Small per-hand rank points (so lounge play also progresses). */
export function handRankPoints(r: HandReport): number {
  let pts = 0;
  if (r.heroWon) pts += 2 + Math.min(8, Math.floor(r.potTotal / Math.max(1, r.bigBlind) / 10));
  if (r.heroWon && r.wentToShowdown) pts += 2;
  if (r.heroHandCategory >= 6) pts += 5; // full house+
  return pts;
}
