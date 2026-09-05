import type { WeaponId } from './config';

const PREFIX = 'shachiku-shooting-v2:';

export interface Settings {
  muted: boolean;
  shake: boolean;
}

export interface ScoreEntry {
  score: number;
  stage: number;
  rank: string;
  date: number;
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
    /* storage unavailable (private mode etc.) — ignore */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

const DEFAULT_SETTINGS: Settings = { muted: false, shake: true };

export function loadSettings(): Settings {
  const raw = typeof window === 'undefined' ? null : safeGet('settings');
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      muted: parsed.muted === true,
      shake: parsed.shake !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  safeSet('settings', JSON.stringify(s));
}

export function loadScores(): ScoreEntry[] {
  const raw = typeof window === 'undefined' ? null : safeGet('scores');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is ScoreEntry =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as ScoreEntry).score === 'number' &&
          typeof (e as ScoreEntry).stage === 'number',
      )
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function saveScore(entry: ScoreEntry): ScoreEntry[] {
  const list = [...loadScores(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  safeSet('scores', JSON.stringify(list));
  return list;
}

export interface ContinueSave {
  stage: number;
  score: number;
  weapon: WeaponId;
  weaponLevel: number;
}

export function loadContinue(): ContinueSave | null {
  const raw = typeof window === 'undefined' ? null : safeGet('continue');
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<ContinueSave>;
    if (typeof p.stage !== 'number' || typeof p.score !== 'number') return null;
    if (p.stage < 1 || p.stage > 99) return null;
    const weapon: WeaponId =
      p.weapon === 'kakusan' || p.weapon === 'tsuibi' ? p.weapon : 'rensa';
    const wl =
      typeof p.weaponLevel === 'number'
        ? Math.min(5, Math.max(1, Math.floor(p.weaponLevel)))
        : 1;
    return { stage: Math.floor(p.stage), score: Math.max(0, Math.floor(p.score)), weapon, weaponLevel: wl };
  } catch {
    return null;
  }
}

export function saveContinue(c: ContinueSave): void {
  safeSet('continue', JSON.stringify(c));
}

export function clearContinue(): void {
  safeRemove('continue');
}
