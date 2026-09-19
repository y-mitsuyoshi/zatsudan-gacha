/**
 * 社畜サバイバー — やりこみ要素: 通算成績・図鑑・実績・称号・デイリーミッション.
 * All persisted in localStorage, per-day missions rotate by date seed.
 */

import { ENEMIES, WEAPONS } from './config';
import type { RunResult } from './engine';

/* ---------------- stats ---------------- */

export interface SurvivorStats {
  runs: number;
  wins: number;
  totalKills: number;
  totalTime: number;
  totalGems: number;
  totalChests: number;
  totalCoins: number;
  maxLevel: number;
  maxScore: number;
  bestTime: number;
}

const K = {
  stats: 'shachiku-survivor-stats/v1',
  ency: 'shachiku-survivor-ency/v1',
  ach: 'shachiku-survivor-ach/v1',
  daily: 'shachiku-survivor-daily/v1',
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

export function loadStats(): SurvivorStats {
  return read<SurvivorStats>(K.stats, {
    runs: 0, wins: 0, totalKills: 0, totalTime: 0, totalGems: 0,
    totalChests: 0, totalCoins: 0, maxLevel: 1, maxScore: 0, bestTime: 0,
  });
}

/** Apply a finished run to cumulative stats. Returns the updated stats. */
export function applyRunToStats(r: RunResult): SurvivorStats {
  const s = loadStats();
  s.runs += 1;
  if (r.victory) s.wins += 1;
  s.totalKills += r.kills;
  s.totalTime += Math.floor(r.time);
  s.totalGems += r.gems;
  s.totalChests += r.chests;
  s.totalCoins += r.coins;
  s.maxLevel = Math.max(s.maxLevel, r.level);
  s.maxScore = Math.max(s.maxScore, r.score);
  s.bestTime = Math.max(s.bestTime, Math.floor(r.time));
  write(K.stats, s);
  return s;
}

/* ---------------- encyclopedia ---------------- */

export interface EncyData {
  enemies: Record<string, number>;
  weapons: Record<string, number>;
}

export function loadEncy(): EncyData {
  return read<EncyData>(K.ency, { enemies: {}, weapons: {} });
}

export function applyRunToEncy(r: RunResult): EncyData {
  const e = loadEncy();
  for (const [k, v] of Object.entries(r.killsByKind)) {
    e.enemies[k] = (e.enemies[k] ?? 0) + v;
  }
  for (const [k, v] of Object.entries(r.weaponLevels)) {
    e.weapons[k] = Math.max(e.weapons[k] ?? 0, v);
  }
  write(K.ency, e);
  return e;
}

export interface EncyEnemyEntry {
  kind: string; name: string; icon: string; kills: number; found: boolean;
}

export function encyEnemies(): EncyEnemyEntry[] {
  const e = loadEncy();
  return Object.values(ENEMIES)
    .filter((d) => d.fromMin < 90)
    .map((d) => ({
      kind: d.kind, name: d.name, icon: d.icon,
      kills: e.enemies[d.kind] ?? 0, found: (e.enemies[d.kind] ?? 0) > 0,
    }));
}

export interface EncyWeaponEntry {
  id: string; name: string; icon: string; desc: string; maxLv: number; found: boolean;
}

export function encyWeapons(): EncyWeaponEntry[] {
  const e = loadEncy();
  return Object.values(WEAPONS).map((d) => ({
    id: d.id, name: d.name, icon: d.icon, desc: d.desc,
    maxLv: e.weapons[d.id] ?? 0, found: (e.weapons[d.id] ?? 0) > 0,
  }));
}

export function encyCompletion(): { enemies: number; enemiesTotal: number; weapons: number; weaponsTotal: number } {
  const list = encyEnemies();
  const w = encyWeapons();
  return {
    enemies: list.filter((x) => x.found).length,
    enemiesTotal: list.length,
    weapons: w.filter((x) => x.found).length,
    weaponsTotal: w.length,
  };
}

/* ---------------- achievements ---------------- */

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  reward: number;
  check: (s: SurvivorStats, r: RunResult) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'debut', name: '初出社', icon: 'icon_building', desc: '1回出社する', reward: 100, check: (s) => s.runs >= 1 },
  { id: 'kill100', name: 'メール捌き', icon: 'mail', desc: '1出社で100体撃破', reward: 100, check: (_s, r) => r.kills >= 100 },
  { id: 'kill500', name: '業務効率化', icon: 'icon_sword', desc: '1出社で500体撃破', reward: 250, check: (_s, r) => r.kills >= 500 },
  { id: 'kill1500', name: '人海戦術', icon: 'icon_sword', desc: '1出社で1500体撃破', reward: 500, check: (_s, r) => r.kills >= 1500 },
  { id: 'surv3', name: '午前耐久', icon: 'icon_clock', desc: '3分生存する', reward: 100, check: (_s, r) => r.time >= 180 },
  { id: 'surv8', name: '残り2時間', icon: 'icon_clock', desc: '8分生存する', reward: 300, check: (_s, r) => r.time >= 480 },
  { id: 'teiji', name: '定時退社', icon: 'icon_trophy', desc: '18時まで生き残る', reward: 500, check: (_s, r) => r.victory },
  { id: 'black', name: 'ブラック生還', icon: 'icon_skull', desc: 'ブラックで定時退社', reward: 800, check: (_s, r) => r.victory && r.difficulty === 'hard' },
  { id: 'lv15', name: '中堅社員', icon: 'icon_power', desc: 'Lv15に到達', reward: 200, check: (_s, r) => r.level >= 15 },
  { id: 'lv25', name: 'ベテラン', icon: 'icon_trophy', desc: 'Lv25に到達', reward: 400, check: (_s, r) => r.level >= 25 },
  { id: 'chest3', name: '棚ぼた', icon: 'chest', desc: '1出社で宝箱3個', reward: 200, check: (_s, r) => r.chests >= 3 },
  { id: 'rich', name: '残業代長者', icon: 'coin', desc: '1出社で300コイン稼ぐ', reward: 200, check: (_s, r) => r.coins >= 300 },
  { id: 'veteran', name: '皆勤賞', icon: 'icon_trophy', desc: '累計10出社', reward: 300, check: (s) => s.runs >= 10 },
  { id: 'slayer', name: 'リストラ王', icon: 'icon_sword', desc: '累計10000体撃破', reward: 500, check: (s) => s.totalKills >= 10000 },
];

export interface AchState {
  unlocked: Record<string, boolean>;
  claimed: Record<string, boolean>;
}

export function loadAch(): AchState {
  return read<AchState>(K.ach, { unlocked: {}, claimed: {} });
}

/** Check run against all achievements. Returns newly unlocked defs. */
export function checkAchievements(s: SurvivorStats, r: RunResult): AchievementDef[] {
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

/* ---------------- titles ---------------- */

export interface TitleDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  check: (s: SurvivorStats) => boolean;
}

export const TITLES: TitleDef[] = [
  { id: '新人', name: '新人', icon: 'icon_building', desc: '出社おめでとう', check: () => true },
  { id: '中堅', name: '中堅社員', icon: 'doc', desc: 'Lv15に到達', check: (s) => s.maxLevel >= 15 },
  { id: '皆勤', name: '皆勤賞', icon: 'icon_trophy', desc: '累計10出社', check: (s) => s.runs >= 10 },
  { id: '定時', name: '定時退社マスター', icon: 'bell', desc: '定時退社を達成', check: (s) => s.wins >= 1 },
  { id: '残業王', name: '残業王', icon: 'overtime', desc: '累計3時間勤務', check: (s) => s.totalTime >= 10800 },
  { id: 'ブラック生還者', name: 'ブラック生還者', icon: 'icon_skull', desc: 'ブラックで定時退社', check: (s) => loadAch().unlocked['black'] === true },
  { id: '社畜神', name: '社畜神', icon: 'president', desc: '図鑑コンプ＋定時退社', check: (s) => {
    const c = encyCompletion();
    return s.wins >= 1 && c.enemies >= c.enemiesTotal && c.weapons >= c.weaponsTotal;
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
  metric: (r: RunResult, s: SurvivorStats) => number;
}

const MISSION_POOL: MissionDef[] = [
  { id: 'kill300', name: '業務300件処理', icon: 'icon_sword', desc: '敵を300体撃破(累計)', target: 300, reward: 150, metric: (r) => r.kills },
  { id: 'surv6', name: '午後も耐えろ', icon: 'icon_clock', desc: '6分生存する', target: 360, reward: 150, metric: (r) => Math.floor(r.time) },
  { id: 'lv12', name: 'スキルアップ', icon: 'icon_level_up', desc: 'Lv12に到達', target: 12, reward: 150, metric: (r) => r.level },
  { id: 'gems120', name: 'やる気回収', icon: 'gem_green', desc: 'やる気を120個集める', target: 120, reward: 120, metric: (r) => r.gems },
  { id: 'chest2', name: '棚ぼた狙い', icon: 'chest', desc: '宝箱を2個開ける', target: 2, reward: 150, metric: (r) => r.chests },
  { id: 'coins120', name: '残業代稼ぎ', icon: 'coin', desc: '残業代120コイン稼ぐ', target: 120, reward: 120, metric: (r) => r.coins },
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
  const st = read<DailyState>(K.daily, fresh);
  if (st.date !== todayKey()) return fresh;
  return st;
}

/** Add a finished run's contribution to today's missions. */
export function applyRunToDaily(r: RunResult): DailyState {
  const st = loadDaily();
  const s = loadStats();
  for (const m of todayMissions()) {
    const v = m.metric(r, s);
    if (m.id === 'kill300' || m.id === 'gems120' || m.id === 'chest2' || m.id === 'coins120') {
      st.progress[m.id] = Math.min(m.target, (st.progress[m.id] ?? 0) + v);
    } else {
      st.progress[m.id] = Math.min(m.target, Math.max(st.progress[m.id] ?? 0, v));
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
