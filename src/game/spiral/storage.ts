/**
 * 社畜スパイラルディフェンス — persistence + stats + achievements.
 */

import type { Difficulty } from './config';
import type { RunResult } from './engine';

const K = {
  settings: 'shachiku-spiral-settings/v1',
  records: 'shachiku-spiral-records/v1',
  progress: 'shachiku-spiral-progress/v1',
  stats: 'shachiku-spiral-stats/v1',
  ach: 'shachiku-spiral-ach/v1',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function write(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

/* ---------------- settings ---------------- */

export interface SpiralSettings {
  muted: boolean;
}

export function loadSettings(): SpiralSettings {
  return read<SpiralSettings>(K.settings, { muted: false });
}

export function saveSettings(s: SpiralSettings): void {
  write(K.settings, s);
}

/* ---------------- records ---------------- */

export interface SpiralRecord {
  score: number;
  wave: number;
  victory: boolean;
  difficulty: Difficulty;
  date: number;
}

export function loadRecords(): SpiralRecord[] {
  try {
    const raw = localStorage.getItem(K.records);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SpiralRecord[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => typeof r?.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function saveRecord(r: SpiralRecord): SpiralRecord[] {
  const list = [...loadRecords(), r].sort((a, b) => b.score - a.score).slice(0, 10);
  write(K.records, list);
  return list;
}

/* ---------------- meta progress ---------------- */

export type MetaLevels = Record<'atk' | 'hp' | 'rate', number>;

export interface SpiralProgress {
  coins: number;
  meta: MetaLevels;
  runs: number;
  wins: number;
}

export function loadProgress(): SpiralProgress {
  return read<SpiralProgress>(K.progress, {
    coins: 0, meta: { atk: 0, hp: 0, rate: 0 }, runs: 0, wins: 0,
  });
}

export function saveProgress(p: SpiralProgress): void {
  write(K.progress, p);
}

/* ---------------- stats ---------------- */

export interface SpiralStats {
  runs: number;
  wins: number;
  bestWave: number;
  totalSegs: number;
  maxScore: number;
}

export function loadStats(): SpiralStats {
  return read<SpiralStats>(K.stats, { runs: 0, wins: 0, bestWave: 0, totalSegs: 0, maxScore: 0 });
}

export function applyRunToStats(r: RunResult): SpiralStats {
  const s = loadStats();
  s.runs += 1;
  if (r.victory) s.wins += 1;
  s.bestWave = Math.max(s.bestWave, r.wave);
  s.totalSegs += r.segs;
  s.maxScore = Math.max(s.maxScore, r.score);
  write(K.stats, s);
  return s;
}

/* ---------------- achievements ---------------- */

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  reward: number;
  check: (s: SpiralStats, r: RunResult) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'debut', name: '初出勤', icon: '🎒', desc: '1回出勤する', reward: 100, check: (s) => s.runs >= 1 },
  { id: 'wave5', name: '五連勤', icon: '🌀', desc: 'WAVE5に到達', reward: 150, check: (s) => s.bestWave >= 5 },
  { id: 'wave10', name: '残業突入', icon: '🌙', desc: 'WAVE10に到達', reward: 250, check: (s) => s.bestWave >= 10 },
  { id: 'clear', name: '渦の制圧', icon: '🎉', desc: '全15ウェーブを踏破', reward: 500, check: (_s, r) => r.victory },
  { id: 'hard', name: 'ブラック制圧', icon: '💀', desc: 'ブラックで全踏破', reward: 800, check: (_s, r) => r.victory && r.difficulty === 'hard' },
  { id: 'hunter', name: '節断ち職人', icon: '✂️', desc: '累計2000節を切断', reward: 250, check: (s) => s.totalSegs >= 2000 },
  { id: 'rich', name: '残業代長者', icon: '💰', desc: '1出勤で🪙300稼ぐ', reward: 200, check: (_s, r) => r.coins >= 300 },
  { id: 'veteran', name: '皆勤賞', icon: '🏅', desc: '累計10出勤', reward: 300, check: (s) => s.runs >= 10 },
];

export interface AchState {
  unlocked: Record<string, boolean>;
  claimed: Record<string, boolean>;
}

export function loadAch(): AchState {
  return read<AchState>(K.ach, { unlocked: {}, claimed: {} });
}

export function checkAchievements(s: SpiralStats, r: RunResult): AchievementDef[] {
  const st = loadAch();
  const fresh: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (st.unlocked[a.id]) continue;
    try {
      if (a.check(s, r)) {
        st.unlocked[a.id] = true;
        fresh.push(a);
      }
    } catch {
      /* bad check */
    }
  }
  write(K.ach, st);
  return fresh;
}

export function claimAchievement(id: string): number {
  const st = loadAch();
  if (!st.unlocked[id] || st.claimed[id]) return 0;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return 0;
  st.claimed[id] = true;
  write(K.ach, st);
  return def.reward;
}
