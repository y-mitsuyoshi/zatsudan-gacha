import { COURSE_ORDER, DIFFICULTY_ORDER, type CourseId, type Difficulty, type EnemyKind } from './config';

const PREFIX = 'barricade-defense-v1:';

export interface Settings {
  muted: boolean;
  shake: boolean;
}

export interface RecordEntry {
  score: number;
  course: CourseId;
  difficulty: Difficulty;
  wave: number;
  victory: boolean;
  date: number;
}

export type Codex = Partial<Record<EnemyKind, number>>;

export interface Progress {
  coins: number;
  unlocked: CourseId[];
  clearedCourses?: CourseId[];
  powerBonus: number; // 恒久攻撃 +4%/Lv (最大10)
  wallBonus: number; // 恒久壁 +10/Lv (最大10)
  baseBonus: number; // 恒久自宅 +5/Lv (最大10)
  achievements: string[];
  codex: Codex;
  totalKills: number;
  totalRuns: number;
  endlessBest: number;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    /* ignore */
  }
}

const DEFAULT_SETTINGS: Settings = { muted: false, shake: true };

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  const raw = safeGet('settings');
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const p = JSON.parse(raw) as Partial<Settings>;
    return { muted: p.muted === true, shake: p.shake !== false };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  safeSet('settings', JSON.stringify(s));
}

export function loadRecords(): RecordEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = safeGet('records');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is RecordEntry =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as RecordEntry).score === 'number' &&
          Number.isFinite((e as RecordEntry).score) &&
          COURSE_ORDER.includes((e as RecordEntry).course) &&
          DIFFICULTY_ORDER.includes((e as RecordEntry).difficulty) &&
          typeof (e as RecordEntry).wave === 'number' &&
          typeof (e as RecordEntry).victory === 'boolean' &&
          typeof (e as RecordEntry).date === 'number',
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function saveRecord(entry: RecordEntry): RecordEntry[] {
  const list = [...loadRecords(), entry].sort((a, b) => b.score - a.score).slice(0, 10);
  safeSet('records', JSON.stringify(list));
  return list;
}

function num(v: unknown, def: number, min: number, max: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return def;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

const DEFAULT_PROGRESS: Progress = {
  coins: 0,
  unlocked: ['city'],
  clearedCourses: [],
  powerBonus: 0,
  wallBonus: 0,
  baseBonus: 0,
  achievements: [],
  codex: {},
  totalKills: 0,
  totalRuns: 0,
  endlessBest: 0,
};

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS, unlocked: ['city'], clearedCourses: [], achievements: [], codex: {} };
  const raw = safeGet('progress');
  if (!raw) return { ...DEFAULT_PROGRESS, unlocked: ['city'], clearedCourses: [], achievements: [], codex: {} };
  try {
    const p = JSON.parse(raw) as Partial<Progress>;
    const unlocked = Array.isArray(p.unlocked)
      ? (p.unlocked as unknown[]).filter(
          (c): c is CourseId =>
            c === 'city' || c === 'desert' || c === 'snow' || c === 'rain' || c === 'tunnel',
        )
      : (['city'] as CourseId[]);
    if (!unlocked.includes('city')) unlocked.unshift('city');
    const clearedCourses = Array.isArray(p.clearedCourses)
      ? (p.clearedCourses as unknown[]).filter(
          (c): c is CourseId => COURSE_ORDER.includes(c as CourseId),
        )
      : [];
    const achievements = Array.isArray(p.achievements)
      ? (p.achievements as unknown[]).filter((a): a is string => typeof a === 'string')
      : [];
    const codex: Codex = {};
    if (p.codex && typeof p.codex === 'object') {
      for (const k of ['runner', 'walker', 'brute', 'shield', 'kamikaze', 'boss'] as const) {
        const v = (p.codex as Record<string, unknown>)[k];
        if (typeof v === 'number' && v > 0) codex[k] = Math.floor(v);
      }
    }
    return {
      coins: num(p.coins, 0, 0, 999999),
      unlocked,
      clearedCourses,
      powerBonus: num(p.powerBonus, 0, 0, 10),
      wallBonus: num(p.wallBonus, 0, 0, 10),
      baseBonus: num(p.baseBonus, 0, 0, 10),
      achievements,
      codex,
      totalKills: num(p.totalKills, 0, 0, 9999999),
      totalRuns: num(p.totalRuns, 0, 0, 999999),
      endlessBest: num(p.endlessBest, 0, 0, 999),
    };
  } catch {
    return { ...DEFAULT_PROGRESS, unlocked: ['city'], clearedCourses: [], achievements: [], codex: {} };
  }
}

export function saveProgress(p: Progress): void {
  safeSet('progress', JSON.stringify(p));
}
