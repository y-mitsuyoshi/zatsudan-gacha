/**
 * 社畜ゲーム共通 — オーディオ設定ストア (BGM / 効果音 ON/OFF・音量)。
 * localStorage に永続化し、全ゲームで共有する。React からは useAudioSettings() を使う。
 */

export interface AudioSettings {
  bgm: boolean;
  se: boolean;
  /** 0..1 */
  bgmVolume: number;
  /** 0..1 */
  seVolume: number;
}

const KEY = 'shachiku-audio-settings-v1';

const DEFAULTS: AudioSettings = { bgm: true, se: true, bgmVolume: 0.6, seVolume: 0.8 };

type Listener = (s: AudioSettings) => void;

let current: AudioSettings = DEFAULTS;
let loaded = false;
const listeners = new Set<Listener>();

function clamp01(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

function load(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<AudioSettings>;
    current = {
      bgm: typeof p.bgm === 'boolean' ? p.bgm : DEFAULTS.bgm,
      se: typeof p.se === 'boolean' ? p.se : DEFAULTS.se,
      bgmVolume: clamp01(p.bgmVolume, DEFAULTS.bgmVolume),
      seVolume: clamp01(p.seVolume, DEFAULTS.seVolume),
    };
  } catch {
    /* ignore corrupted storage */
  }
}

export function getAudioSettings(): AudioSettings {
  load();
  return current;
}

export function setAudioSettings(patch: Partial<AudioSettings>): AudioSettings {
  load();
  current = { ...current, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l(current));
  return current;
}

export function subscribeAudioSettings(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Server snapshot for useSyncExternalStore. */
export function getServerAudioSettings(): AudioSettings {
  return DEFAULTS;
}
