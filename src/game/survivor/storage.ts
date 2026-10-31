/**
 * 社畜サバイバー — localStorage persistence (settings / records / meta progress).
 */

import { DIFFICULTY_ORDER, type Difficulty } from './config';

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

function safeInt(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.floor(value)))
    : fallback;
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFFICULTY_ORDER.includes(value as Difficulty);
}

export function loadRecords(): SurvivorRecord[] {
  try {
    const raw = localStorage.getItem(K.records);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SurvivorRecord =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as SurvivorRecord).score === 'number' &&
        Number.isFinite((item as SurvivorRecord).score) &&
        isDifficulty((item as SurvivorRecord).difficulty) &&
        typeof (item as SurvivorRecord).time === 'number' &&
        Number.isFinite((item as SurvivorRecord).time) &&
        typeof (item as SurvivorRecord).level === 'number' &&
        typeof (item as SurvivorRecord).kills === 'number' &&
        typeof (item as SurvivorRecord).victory === 'boolean' &&
        typeof (item as SurvivorRecord).date === 'number'
      )
      .map((record) => ({
        score: safeInt(record.score),
        difficulty: record.difficulty,
        time: safeInt(record.time),
        level: safeInt(record.level, 1, 1),
        kills: safeInt(record.kills),
        victory: record.victory,
        date: safeInt(record.date),
      }))
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
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    const p = parsed as Partial<SurvivorProgress>;
    return {
      coins: safeInt(p.coins),
      meta: {
        atk: safeInt(p.meta?.atk, 0, 0, 50),
        hp: safeInt(p.meta?.hp, 0, 0, 50),
        speed: safeInt(p.meta?.speed, 0, 0, 50),
        magnet: safeInt(p.meta?.magnet, 0, 0, 50),
      },
      wins: safeInt(p.wins),
      runs: safeInt(p.runs),
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
