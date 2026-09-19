import type { CourseId, Difficulty } from './config';

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

export interface Progress {
  coins: number;
  unlocked: CourseId[];
  powerBonus: number; // permanent +damage steps (prestige-lite) — kept simple
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
          typeof e === 'object' && e !== null && typeof (e as RecordEntry).score === 'number',
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

const DEFAULT_PROGRESS: Progress = { coins: 0, unlocked: ['city'], powerBonus: 0 };

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS, unlocked: ['city'] };
  const raw = safeGet('progress');
  if (!raw) return { ...DEFAULT_PROGRESS, unlocked: ['city'] };
  try {
    const p = JSON.parse(raw) as Partial<Progress>;
    const unlocked = Array.isArray(p.unlocked)
      ? (p.unlocked as unknown[]).filter((c): c is CourseId => c === 'city' || c === 'desert' || c === 'snow')
      : (['city'] as CourseId[]);
    if (!unlocked.includes('city')) unlocked.unshift('city');
    return {
      coins: typeof p.coins === 'number' ? Math.max(0, Math.floor(p.coins)) : 0,
      unlocked,
      powerBonus: typeof p.powerBonus === 'number' ? Math.max(0, Math.min(10, Math.floor(p.powerBonus))) : 0,
    };
  } catch {
    return { ...DEFAULT_PROGRESS, unlocked: ['city'] };
  }
}

export function saveProgress(p: Progress): void {
  safeSet('progress', JSON.stringify(p));
}
