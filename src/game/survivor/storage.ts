/**
 * 社畜サバイバー — localStorage persistence (settings / records / meta progress).
 */

import type { Difficulty } from './config';

const K = {
  settings: 'shachiku-survivor-settings/v1',
  records: 'shachiku-survivor-records/v1',
  progress: 'shachiku-survivor-progress/v1',
};

export interface SurvivorSettings {
  muted: boolean;
}

export function loadSettings(): SurvivorSettings {
  try {
    const raw = localStorage.getItem(K.settings);
    if (!raw) return { muted: false };
    const p = JSON.parse(raw) as Partial<SurvivorSettings>;
    return { muted: p.muted === true };
  } catch {
    return { muted: false };
  }
}

export function saveSettings(s: SurvivorSettings): void {
  try {
    localStorage.setItem(K.settings, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export interface SurvivorRecord {
  score: number;
  difficulty: Difficulty;
  time: number;
  level: number;
  kills: number;
  victory: boolean;
  date: number;
}

export function loadRecords(): SurvivorRecord[] {
  try {
    const raw = localStorage.getItem(K.records);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SurvivorRecord[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => typeof r?.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function saveRecord(r: SurvivorRecord): SurvivorRecord[] {
  const list = [...loadRecords(), r].sort((a, b) => b.score - a.score).slice(0, 10);
  try {
    localStorage.setItem(K.records, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
  return list;
}

export type RecordEntry = SurvivorRecord;

export type MetaLevels = Record<'atk' | 'hp' | 'speed' | 'magnet', number>;

export interface SurvivorProgress {
  coins: number;
  meta: MetaLevels;
  wins: number;
  runs: number;
}

export function loadProgress(): SurvivorProgress {
  const fallback: SurvivorProgress = { coins: 0, meta: { atk: 0, hp: 0, speed: 0, magnet: 0 }, wins: 0, runs: 0 };
  try {
    const raw = localStorage.getItem(K.progress);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<SurvivorProgress>;
    return {
      coins: typeof p.coins === 'number' ? Math.max(0, Math.floor(p.coins)) : 0,
      meta: {
        atk: p.meta?.atk ?? 0,
        hp: p.meta?.hp ?? 0,
        speed: p.meta?.speed ?? 0,
        magnet: p.meta?.magnet ?? 0,
      },
      wins: p.wins ?? 0,
      runs: p.runs ?? 0,
    };
  } catch {
    return fallback;
  }
}

export function saveProgress(p: SurvivorProgress): void {
  try {
    localStorage.setItem(K.progress, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}
