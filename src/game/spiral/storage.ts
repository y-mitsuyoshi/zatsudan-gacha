/**
 * 社畜スパイラルディフェンス — persistence + stats + achievements.
 */

import { CHAINS, UPGRADES, DIFFICULTY_ORDER, type Difficulty } from './config';
import type { RunResult } from './engine';

const K = {
  settings: 'shachiku-spiral-settings/v1',
  records: 'shachiku-spiral-records/v1',
  progress: 'shachiku-spiral-progress/v1',
  stats: 'shachiku-spiral-stats/v1',
  ach: 'shachiku-spiral-ach/v1',
  ency: 'shachiku-spiral-ency/v1',
  daily: 'shachiku-spiral-daily/v1',
};

function write(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeCount(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function safeNumberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
      .map(([k, v]) => [k, Math.max(0, Math.floor(v as number))])
  );
}

function safeBooleanMap(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => typeof v === 'boolean')
  ) as Record<string, boolean>;
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFFICULTY_ORDER.includes(value as Difficulty);
}

/* ---------------- settings ---------------- */

export interface SpiralSettings {
  muted: boolean;
}

export function loadSettings(): SpiralSettings {
  try {
    const raw = localStorage.getItem(K.settings);
    if (!raw) return { muted: false };
    const parsed: unknown = JSON.parse(raw);
    return { muted: isRecord(parsed) && parsed.muted === true };
  } catch {
    return { muted: false };
  }
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
      .filter((item): item is SpiralRecord =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as SpiralRecord).score === 'number' &&
        Number.isFinite((item as SpiralRecord).score) &&
        typeof (item as SpiralRecord).wave === 'number' &&
        typeof (item as SpiralRecord).victory === 'boolean' &&
        isDifficulty((item as SpiralRecord).difficulty) &&
        typeof (item as SpiralRecord).date === 'number'
      )
      .map((record) => ({
        score: safeCount(record.score),
        wave: safeCount(record.wave),
        victory: record.victory,
        difficulty: record.difficulty,
        date: safeCount(record.date),
      }))
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
  const fallback: SpiralProgress = {
    coins: 0, meta: { atk: 0, hp: 0, rate: 0 }, runs: 0, wins: 0,
  };
  try {
    const raw = localStorage.getItem(K.progress);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return fallback;
    return {
      coins: safeCount(parsed.coins),
      meta: {
        atk: safeCount(isRecord(parsed.meta) ? parsed.meta.atk : 0),
        hp: safeCount(isRecord(parsed.meta) ? parsed.meta.hp : 0),
        rate: safeCount(isRecord(parsed.meta) ? parsed.meta.rate : 0),
      },
      runs: safeCount(parsed.runs),
      wins: safeCount(parsed.wins),
    };
  } catch {
    return fallback;
  }
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
  const fallback: SpiralStats = { runs: 0, wins: 0, bestWave: 0, totalSegs: 0, maxScore: 0 };
  try {
    const raw = localStorage.getItem(K.stats);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return fallback;
    return {
      runs: safeCount(parsed.runs),
      wins: safeCount(parsed.wins),
      bestWave: safeCount(parsed.bestWave),
      totalSegs: safeCount(parsed.totalSegs),
      maxScore: safeCount(parsed.maxScore),
    };
  } catch {
    return fallback;
  }
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

/** Apply only the endless-mode delta for a run that was already settled at victory. */
export function applyRunDeltaToStats(previous: RunResult, next: RunResult): SpiralStats {
  const s = loadStats();
  s.bestWave = Math.max(s.bestWave, next.wave);
  s.totalSegs += Math.max(0, next.segs - previous.segs);
  s.maxScore = Math.max(s.maxScore, next.score);
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
  { id: 'debut', name: '初出勤', icon: 'debut', desc: '1回出勤する', reward: 100, check: (s) => s.runs >= 1 },
  { id: 'wave5', name: '五連勤', icon: 'wave5', desc: 'WAVE5に到達', reward: 150, check: (s) => s.bestWave >= 5 },
  { id: 'wave10', name: '残業突入', icon: 'wave10', desc: 'WAVE10に到達', reward: 250, check: (s) => s.bestWave >= 10 },
  { id: 'clear', name: '渦の制圧', icon: 'clear', desc: '全15ウェーブを踏破', reward: 500, check: (_s, r) => r.victory },
  { id: 'hard', name: 'ブラック制圧', icon: 'hard', desc: 'ブラックで全踏破', reward: 800, check: (_s, r) => r.victory && r.difficulty === 'hard' },
  { id: 'hunter', name: '節断ち職人', icon: 'hunter', desc: '累計2000節を切断', reward: 250, check: (s) => s.totalSegs >= 2000 },
  { id: 'rich', name: '残業代長者', icon: 'rich', desc: '1出勤で300コイン稼ぐ', reward: 200, check: (_s, r) => r.coins >= 300 },
  { id: 'veteran', name: '皆勤賞', icon: 'veteran', desc: '累計10出勤', reward: 300, check: (s) => s.runs >= 10 },
];

export interface AchState {
  unlocked: Record<string, boolean>;
  claimed: Record<string, boolean>;
}

export function loadAch(): AchState {
  try {
    const raw = localStorage.getItem(K.ach);
    if (!raw) return { unlocked: {}, claimed: {} };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { unlocked: {}, claimed: {} };
    return {
      unlocked: safeBooleanMap(parsed.unlocked),
      claimed: safeBooleanMap(parsed.claimed),
    };
  } catch {
    return { unlocked: {}, claimed: {} };
  }
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

/* ---------------- encyclopedia ---------------- */

export interface EncyData {
  chains: Record<string, number>;
  upgrades: Record<string, number>;
}

export function loadEncy(): EncyData {
  try {
    const raw = localStorage.getItem(K.ency);
    if (!raw) return { chains: {}, upgrades: {} };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { chains: {}, upgrades: {} };
    return {
      chains: safeNumberMap(parsed.chains),
      upgrades: safeNumberMap(parsed.upgrades),
    };
  } catch {
    return { chains: {}, upgrades: {} };
  }
}

export function applyRunToEncy(r: RunResult): EncyData {
  const e = loadEncy();
  for (const [k, v] of Object.entries(r.chainKills)) {
    e.chains[k] = (e.chains[k] ?? 0) + v;
  }
  for (const [k, v] of Object.entries(r.upgradeLevels)) {
    e.upgrades[k] = Math.max(e.upgrades[k] ?? 0, v);
  }
  write(K.ency, e);
  return e;
}

/** Apply only the endless-mode delta to the encyclopedia. */
export function applyRunDeltaToEncy(previous: RunResult, next: RunResult): EncyData {
  const e = loadEncy();
  for (const [k, v] of Object.entries(next.chainKills)) {
    const delta = Math.max(0, v - (previous.chainKills[k] ?? 0));
    e.chains[k] = (e.chains[k] ?? 0) + delta;
  }
  for (const [k, v] of Object.entries(next.upgradeLevels)) {
    e.upgrades[k] = Math.max(e.upgrades[k] ?? 0, v);
  }
  write(K.ency, e);
  return e;
}

export interface EncyChainEntry {
  kind: string; name: string; icon: string; kills: number; found: boolean; boss: boolean;
}

export function encyChains(): EncyChainEntry[] {
  const e = loadEncy();
  return Object.values(CHAINS).map((d) => ({
    kind: d.kind, name: d.name, icon: d.icon,
    kills: e.chains[d.kind] ?? 0, found: (e.chains[d.kind] ?? 0) > 0, boss: d.boss,
  }));
}

export interface EncyUpgradeEntry {
  id: string; name: string; icon: string; desc: string; maxLv: number; found: boolean;
}

export function encyUpgrades(): EncyUpgradeEntry[] {
  const e = loadEncy();
  return Object.values(UPGRADES).map((d) => ({
    id: d.id, name: d.name, icon: d.icon, desc: d.desc,
    maxLv: e.upgrades[d.id] ?? 0, found: (e.upgrades[d.id] ?? 0) > 0,
  }));
}

export function encyCompletion(): { chains: number; chainsTotal: number; upgrades: number; upgradesTotal: number } {
  const c = encyChains();
  const u = encyUpgrades();
  return {
    chains: c.filter((x) => x.found).length,
    chainsTotal: c.length,
    upgrades: u.filter((x) => x.found).length,
    upgradesTotal: u.length,
  };
}

/* ---------------- titles ---------------- */

export interface TitleDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  check: (s: SpiralStats) => boolean;
}

export const TITLES: TitleDef[] = [
  { id: '新人', name: '新人', icon: 'rookie', desc: '出勤おめでとう', check: () => true },
  { id: '中堅', name: '中堅社員', icon: 'mid', desc: 'WAVE5に到達', check: (s) => s.bestWave >= 5 },
  { id: '皆勤', name: '皆勤賞', icon: 'veteran', desc: '累計10出勤', check: (s) => s.runs >= 10 },
  { id: '制圧者', name: '渦の制圧者', icon: 'clear', desc: '全15ウェーブ踏破', check: (s) => s.wins >= 1 },
  { id: '残業王', name: '残業王', icon: 'overtime', desc: '累計3000節を切断', check: (s) => s.totalSegs >= 3000 },
  { id: 'スパイラル神', name: 'スパイラル神', icon: 'god', desc: '図鑑コンプ＋全踏破', check: (s) => {
    const c = encyCompletion();
    return s.wins >= 1 && c.chains >= c.chainsTotal && c.upgrades >= c.upgradesTotal;
  } },
];

export function earnedTitles(): TitleDef[] {
  const s = loadStats();
  return TITLES.filter((t) => {
    try {
      return t.check(s);
    } catch {
      return false;
    }
  });
}

export function bestTitle(): TitleDef {
  const earned = earnedTitles();
  return earned[earned.length - 1] ?? TITLES[0];
}

/* ---------------- daily missions ---------------- */

export interface MissionDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  target: number;
  reward: number;
  metric: (r: RunResult) => number;
  accumulate: boolean;
}

const MISSION_POOL: MissionDef[] = [
  { id: 'wave6', name: '午前を耐えろ', icon: 'morning', desc: 'WAVE6に到達', target: 6, reward: 150, metric: (r) => r.wave, accumulate: false },
  { id: 'seg300', name: '切断300節', icon: 'segs', desc: '体節を300切断(累計)', target: 300, reward: 150, metric: (r) => r.segs, accumulate: true },
  { id: 'coins150', name: '残業代稼ぎ', icon: 'coins', desc: '残業代150コイン稼ぐ(累計)', target: 150, reward: 120, metric: (r) => r.coins, accumulate: true },
  { id: 'chains8', name: '列崩し8本', icon: 'chains', desc: '列を8つ崩壊(累計)', target: 8, reward: 150, metric: (r) => r.chains, accumulate: true },
  { id: 'wave11', name: '午後も耐えろ', icon: 'afternoon', desc: 'WAVE11に到達', target: 11, reward: 200, metric: (r) => r.wave, accumulate: false },
];

export interface DailyState {
  date: string;
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function seededPick(seed: number, n: number): MissionDef[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const pool = [...MISSION_POOL];
  const out: MissionDef[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  }
  return out;
}

export function todayMissions(): MissionDef[] {
  const key = todayKey();
  let seed = 0;
  for (const c of key) seed = (seed * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return seededPick(seed, 3);
}

export function loadDaily(): DailyState {
  const fresh: DailyState = { date: todayKey(), progress: {}, claimed: {} };
  try {
    const raw = localStorage.getItem(K.daily);
    if (!raw) return fresh;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.date !== todayKey()) return fresh;
    return {
      date: todayKey(),
      progress: safeNumberMap(parsed.progress),
      claimed: safeBooleanMap(parsed.claimed),
    };
  } catch {
    return fresh;
  }
}

export function applyRunToDaily(r: RunResult): DailyState {
  const st = loadDaily();
  for (const m of todayMissions()) {
    const v = m.metric(r);
    if (m.accumulate) {
      st.progress[m.id] = Math.min(m.target, (st.progress[m.id] ?? 0) + v);
    } else {
      st.progress[m.id] = Math.min(m.target, Math.max(st.progress[m.id] ?? 0, v));
    }
  }
  write(K.daily, st);
  return st;
}

/** Apply only the endless-mode delta to today's missions. */
export function applyRunDeltaToDaily(previous: RunResult, next: RunResult): DailyState {
  const st = loadDaily();
  for (const m of todayMissions()) {
    const nextValue = m.metric(next);
    const previousValue = m.metric(previous);
    if (m.accumulate) {
      st.progress[m.id] = Math.min(m.target, (st.progress[m.id] ?? 0) + Math.max(0, nextValue - previousValue));
    } else {
      st.progress[m.id] = Math.min(m.target, Math.max(st.progress[m.id] ?? 0, nextValue));
    }
  }
  write(K.daily, st);
  return st;
}

export function claimMission(id: string): number {
  const st = loadDaily();
  const m = todayMissions().find((x) => x.id === id);
  if (!m || st.claimed[id] || (st.progress[id] ?? 0) < m.target) return 0;
  st.claimed[id] = true;
  write(K.daily, st);
  return m.reward;
}
