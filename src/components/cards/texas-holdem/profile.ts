'use client';

import type { CharId } from './characters';

/** Persistent player profile & settings (localStorage). */

export interface HoldemSettings {
  masterVolume: number; // 0..1
  bgmVolume: number; // 0..1
  seVolume: number; // 0..1
  voiceVolume: number; // 0..1
  voiceOn: boolean;
  /** AI thinking speed */
  speed: 'slow' | 'normal' | 'fast';
  /** show equity / outs HUD */
  showHud: boolean;
  /** squeeze (peel) hole cards at deal */
  squeeze: boolean;
  /** reduce motion / effects */
  reducedFx: boolean;
}

export interface HoldemProfile {
  version: 1;
  playerName: string;
  partner: CharId;
  /** total rank points (see computeRank) */
  rankPoints: number;
  /** lounge coins (meta currency, earned by playing) */
  coins: number;
  /** affection points per character */
  affection: Record<CharId, number>;
  stats: {
    handsPlayed: number;
    handsWon: number;
    showdownsWon: number;
    biggestPot: number;
    bestHandCategory: number; // -1 if none
    bestHandName: string;
    sessions: number;
    tournamentsWon: number;
    allInWins: number;
  };
  settings: HoldemSettings;
}

const KEY = 'royal-flush-night-profile-v1';

export const DEFAULT_SETTINGS: HoldemSettings = {
  masterVolume: 0.8,
  bgmVolume: 0.55,
  seVolume: 0.8,
  voiceVolume: 0.9,
  voiceOn: true,
  speed: 'normal',
  showHud: true,
  squeeze: false,
  reducedFx: false,
};

export function defaultProfile(): HoldemProfile {
  return {
    version: 1,
    playerName: 'あなた',
    partner: 'karen',
    rankPoints: 0,
    coins: 3000,
    affection: { karen: 0, rei: 0, koharu: 0, valentina: 0, jin: 0, luna: 0 },
    stats: {
      handsPlayed: 0,
      handsWon: 0,
      showdownsWon: 0,
      biggestPot: 0,
      bestHandCategory: -1,
      bestHandName: '',
      sessions: 0,
      tournamentsWon: 0,
      allInWins: 0,
    },
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadProfile(): HoldemProfile {
  if (typeof window === 'undefined') return defaultProfile();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<HoldemProfile>;
    const base = defaultProfile();
    return {
      ...base,
      ...parsed,
      affection: { ...base.affection, ...(parsed.affection ?? {}) },
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      version: 1,
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: HoldemProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage full / disabled: ignore
  }
}

// ---------------------------------------------------------------------------
// Rank system (original): Bronze → Silver → Gold → Platinum → Diamond → Royal → Legend
// ---------------------------------------------------------------------------

export interface RankTier {
  id: string;
  name: string;
  nameEn: string;
  /** points needed to enter this tier */
  min: number;
  /** points span per star (3 stars per tier) */
  span: number;
  color: string;
  gradient: string;
  icon: string;
}

export const RANK_TIERS: RankTier[] = [
  { id: 'bronze', name: 'ブロンズ', nameEn: 'BRONZE', min: 0, span: 60, color: '#d97706', gradient: 'from-amber-700 via-orange-600 to-amber-900', icon: '♣' },
  { id: 'silver', name: 'シルバー', nameEn: 'SILVER', min: 180, span: 100, color: '#cbd5e1', gradient: 'from-slate-300 via-slate-400 to-slate-600', icon: '♦' },
  { id: 'gold', name: 'ゴールド', nameEn: 'GOLD', min: 480, span: 150, color: '#fbbf24', gradient: 'from-yellow-300 via-amber-400 to-yellow-600', icon: '♥' },
  { id: 'platinum', name: 'プラチナ', nameEn: 'PLATINUM', min: 930, span: 220, color: '#5eead4', gradient: 'from-teal-200 via-cyan-300 to-teal-500', icon: '♠' },
  { id: 'diamond', name: 'ダイヤモンド', nameEn: 'DIAMOND', min: 1590, span: 300, color: '#93c5fd', gradient: 'from-sky-300 via-blue-400 to-indigo-500', icon: '◆' },
  { id: 'royal', name: 'ロイヤル', nameEn: 'ROYAL', min: 2490, span: 420, color: '#e879f9', gradient: 'from-fuchsia-400 via-purple-500 to-amber-400', icon: '♛' },
  { id: 'legend', name: 'レジェンド', nameEn: 'LEGEND', min: 3750, span: 99999, color: '#fde047', gradient: 'from-yellow-200 via-rose-300 to-violet-400', icon: '★' },
];

export interface RankInfo {
  tier: RankTier;
  /** 1..3 (legend is always 1) */
  stars: number;
  label: string;
  /** progress within current star 0..1 */
  progress: number;
  pointsToNext: number;
}

export function computeRank(points: number): RankInfo {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) if (points >= t.min) tier = t;
  if (tier.id === 'legend') {
    return { tier, stars: 1, label: `${tier.name}`, progress: 1, pointsToNext: 0 };
  }
  const within = points - tier.min;
  const stars = Math.min(3, Math.floor(within / tier.span) + 1);
  const starBase = (stars - 1) * tier.span;
  const progress = Math.min(1, (within - starBase) / tier.span);
  const pointsToNext = Math.max(0, tier.span - (within - starBase));
  return { tier, stars, label: `${tier.name} ★${stars}`, progress, pointsToNext };
}

// Affection (親密度) levels
export const AFFECTION_LEVEL_STEP = 120;
export function affectionLevel(points: number): { level: number; progress: number } {
  const level = Math.min(10, Math.floor(points / AFFECTION_LEVEL_STEP) + 1);
  const progress = level >= 10 ? 1 : (points % AFFECTION_LEVEL_STEP) / AFFECTION_LEVEL_STEP;
  return { level, progress };
}
