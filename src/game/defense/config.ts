/**
 * 社畜通勤サバイバー 〜社畜スクワッド・ハイウェイ防衛戦〜 — game tuning data.
 * 3D lane-runner: hero auto-runs toward the office, shoots number barrels & multiplier gates, and commands up to 30 allies.
 */

export const VIEW_W = 480;
export const VIEW_H = 800;

/** Logical helper only (3D engine uses world units). */
export const TURRET_Y = 700;
export const BARRICADE_Y = 620;
export const BASE_Y = 730;

export type WeaponId = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'launcher' | 'freeze';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  desc: string;
  damage: number;
  interval: number; // seconds between shots
  count: number; // projectiles per shot
  spread: number; // radians of spread
  speed: number; // bullet speed (3D units/s)
  pierce: number; // how many enemies a bullet passes through
  splash: number; // explosion radius (0 = none)
  slow: number; // slow factor applied (0 = none, 0.5 = half speed)
  duration: number; // pickup duration in seconds (Infinity = default weapon)
  color: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    id: 'pistol', name: 'タクティカル傘ライフル', icon: 'umbrella', desc: '標準装備。高速連射でゲートもバレルも撃ち抜く。',
    damage: 14, interval: 0.16, count: 1, spread: 0.025, speed: 38,
    pierce: 0, splash: 0, slow: 0, duration: Infinity, color: '#fde047',
  },
  smg: {
    id: 'smg', name: '連射サブマシン名刺ガン', icon: 'card', desc: '圧倒的弾幕で赤ゲートを瞬時に青へ反転させる。',
    damage: 10, interval: 0.075, count: 1, spread: 0.08, speed: 40,
    pierce: 0, splash: 0, slow: 0, duration: 16, color: '#fb923c',
  },
  shotgun: {
    id: 'shotgun', name: 'ワイド拡散ブリーフケース', icon: 'briefcase', desc: '5WAY散弾で複数レーンの群衆とバレルを同時粉砕。',
    damage: 11, interval: 0.44, count: 5, spread: 0.32, speed: 35,
    pierce: 0, splash: 0, slow: 0, duration: 16, color: '#f87171',
  },
  rifle: {
    id: 'rifle', name: '高出力レーザー定期券', icon: 'pass', desc: '貫通レーザーで縦列の敵とゲートを一気に射抜く。',
    damage: 30, interval: 0.34, count: 1, spread: 0.01, speed: 50,
    pierce: 4, splash: 0, slow: 0, duration: 16, color: '#67e8f9',
  },
  launcher: {
    id: 'launcher', name: '特急ロケットランチャー', icon: 'express', desc: '大口径着弾爆発で密集ラッシュを一掃する重火器。',
    damage: 38, interval: 0.68, count: 1, spread: 0.02, speed: 28,
    pierce: 0, splash: 3.5, slow: 0, duration: 16, color: '#c084fc',
  },
  freeze: {
    id: 'freeze', name: '極冷クライオ空調砲', icon: 'freeze', desc: '貫通冷気ストリームで群衆の足を止める。',
    damage: 9, interval: 0.13, count: 1, spread: 0.06, speed: 34,
    pierce: 1, splash: 0, slow: 0.5, duration: 16, color: '#a5f3fc',
  },
};

export const WEAPON_ORDER: WeaponId[] = ['pistol', 'smg', 'shotgun', 'rifle', 'launcher', 'freeze'];

export type EnemyKind = 'runner' | 'walker' | 'brute' | 'shield' | 'kamikaze' | 'boss';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number; // approach speed (world units/s, added to scroll)
  damage: number; // contact damage
  score: number;
  coins: number;
  radius: number;
  color: string;
  emoji: string;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  runner: { kind: 'runner', name: 'ダッシュ通勤者', hp: 16, speed: 3.9, damage: 6, score: 50, coins: 4, radius: 0.55, color: '#4ade80', emoji: 'runner' },
  walker: { kind: 'walker', name: '満員群衆', hp: 38, speed: 2.1, damage: 10, score: 100, coins: 6, radius: 0.65, color: '#facc15', emoji: 'walker' },
  brute: { kind: 'brute', name: '巨漢リーマン', hp: 105, speed: 1.4, damage: 20, score: 250, coins: 14, radius: 0.9, color: '#f97316', emoji: 'brute' },
  shield: { kind: 'shield', name: '傘ガード', hp: 68, speed: 1.8, damage: 12, score: 200, coins: 10, radius: 0.7, color: '#38bdf8', emoji: 'shield' },
  kamikaze: { kind: 'kamikaze', name: '激突チャリ', hp: 22, speed: 5.6, damage: 28, score: 150, coins: 8, radius: 0.55, color: '#f472b6', emoji: 'kamikaze' },
  boss: { kind: 'boss', name: '満員電車', hp: 880, speed: 1.05, damage: 40, score: 3000, coins: 160, radius: 1.8, color: '#ef4444', emoji: 'boss' },
};

export type CourseId = 'city' | 'desert' | 'snow' | 'rain' | 'tunnel';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface CourseDef {
  id: CourseId;
  name: string;
  icon: string;
  desc: string;
  waves: number; // length tier (x100m)
  sky: [string, string];
  ground: string;
}

export const COURSES: Record<CourseId, CourseDef> = {
  city: {
    id: 'city', name: '山手線', icon: 'city', desc: '全500m。増員ゲートを撃ち抜いて本社を目指せ。',
    waves: 5, sky: ['#0b1026', '#1e2a5a'], ground: '#1f2937',
  },
  desert: {
    id: 'desert', name: '中央線', icon: 'express', desc: '全600m。高速ラッシュとナンバーバレル地帯。',
    waves: 6, sky: ['#1a0f2e', '#5a2a1e'], ground: '#3f2d1c',
  },
  snow: {
    id: 'snow', name: '終電地下鉄', icon: 'subway', desc: '全700m。重装リーマン＋強化満員電車を突破せよ。',
    waves: 7, sky: ['#0a1628', '#1e3a5a'], ground: '#243447',
  },
  rain: {
    id: 'rain', name: '大雨ラッシュ', icon: 'rain', desc: '全800m。暴風雨ハイウェイ＋激突チャリ大群。',
    waves: 8, sky: ['#10131c', '#26344a'], ground: '#1c2430',
  },
  tunnel: {
    id: 'tunnel', name: '満員トンネル', icon: 'tunnel', desc: '全900m。最終防衛ライン。最大30人編成で挑め。',
    waves: 9, sky: ['#05070f', '#111827'], ground: '#0f1521',
  },
};

export const COURSE_ORDER: CourseId[] = ['city', 'desert', 'snow', 'rain', 'tunnel'];

/** Course length in meters (1 unit = 10m for display). */
export function courseLength(course: CourseDef): number {
  return course.waves * 100;
}

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  icon: string;
  hpMul: number; // enemy hp multiplier
  speedMul: number;
  dmgMul: number;
  countMul: number; // spawn count multiplier
  scoreMul: number;
  desc: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { id: 'easy', name: '定時', icon: 'easy', hpMul: 0.65, speedMul: 0.82, dmgMul: 0.65, countMul: 0.78, scoreMul: 0.8, desc: '爽快無双バランス。初めてに。' },
  normal: { id: 'normal', name: '残業', icon: 'normal', hpMul: 0.92, speedMul: 0.96, dmgMul: 0.9, countMul: 0.95, scoreMul: 1, desc: 'ゲート撃ち抜きと編成が熱い標準難度。' },
  hard: { id: 'hard', name: '過労死ライン', icon: 'hard', hpMul: 1.35, speedMul: 1.08, dmgMul: 1.25, countMul: 1.18, scoreMul: 1.5, desc: '判断力と最大火力が試される熟練社畜向け。' },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

export type BarrelKind = 'weapon' | 'bomb' | 'coin' | 'repair';

export interface WavePlan {
  wave: number;
  totalWaves: number;
  isBoss: boolean;
  budget: number; // spawn budget
  interval: [number, number]; // spawn interval range
  runners: number; // composition weights
  walkers: number;
  brutes: number;
  shields: number;
  kamikazes: number;
}

/** Composition helper reused by the 3D director. */
export function planWave(course: CourseDef, wave: number, diff: DifficultyDef, endless: number): WavePlan {
  const scale = (1 + (wave - 1) * 0.35 + endless * 0.5) * diff.countMul;
  const budget = Math.round((10 + wave * 6) * scale);
  const desertFast = course.id !== 'city' ? 1.4 : 1;
  const snowTank = course.id === 'snow' ? 1.5 : 1;
  return {
    wave,
    totalWaves: course.waves,
    isBoss: false,
    budget,
    interval: [Math.max(0.35, 1.15 - wave * 0.09 - endless * 0.08), Math.max(0.7, 1.9 - wave * 0.12 - endless * 0.1)],
    runners: 3 * desertFast,
    walkers: 3,
    brutes: (1 + wave * 0.45) * snowTank,
    shields: wave >= 2 ? 1 + wave * 0.3 : 0,
    kamikazes: wave >= 3 ? 0.8 + wave * 0.25 : 0,
  };
}

export function pickKind(plan: WavePlan, r: number): EnemyKind {
  const total = plan.runners + plan.walkers + plan.brutes + plan.shields + plan.kamikazes;
  let x = r * total;
  if ((x -= plan.runners) < 0) return 'runner';
  if ((x -= plan.walkers) < 0) return 'walker';
  if ((x -= plan.brutes) < 0) return 'brute';
  if ((x -= plan.shields) < 0) return 'shield';
  return 'kamikaze';
}

export interface ShopItem {
  id: 'repair' | 'wall' | 'power' | 'ally' | 'heal';
  name: string;
  icon: string;
  desc: string;
  cost: (level: number) => number;
}

export const SHOP: ShopItem[] = [
  { id: 'repair', name: 'ガード修理', icon: 'repair', desc: '通勤ガードを全回復', cost: () => 40 },
  { id: 'wall', name: 'ガード強化', icon: 'wall', desc: 'ガード最大値 +40', cost: (lv) => 60 + lv * 40 },
  { id: 'power', name: '反骨心アップ', icon: 'power', desc: '全武器ダメージ +15%', cost: (lv) => 80 + lv * 60 },
  { id: 'ally', name: '同期を呼ぶ', icon: 'ally', desc: '自動援護の同期+1 (最大30人)', cost: () => 120 },
  { id: 'heal', name: 'おにぎり補給', icon: 'heal', desc: '体力を全回復', cost: () => 50 },
];

export const MAX_ALLIES = 30;
export const ALLY_HP = 3;

/* ---------------- やりこみ: 実績・恒久強化 ---------------- */

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_run', name: '初出社', icon: 'first_run', desc: '初めて出社した' },
  { id: 'first_win', name: '定時出社', icon: 'first_win', desc: '会社に到着した' },
  { id: 'boss', name: '満員電車撃破', icon: 'boss', desc: '満員電車を突破した' },
  { id: 'nakama', name: '同期3人', icon: 'nakama', desc: '同期を3人集めた' },
  { id: 'combo50', name: '50連撃', icon: 'combo50', desc: '50連撃を達成した' },
  { id: 'combo100', name: '100連撃', icon: 'combo100', desc: '100連撃を達成した' },
  { id: 'scorer', name: '1万pt', icon: 'scorer', desc: '1万スコアを稼いだ' },
  { id: 'all_course', name: '全線制覇', icon: 'all_course', desc: '全3路線を踏破した' },
  { id: 'endless', name: '終わらぬ残業', icon: 'endless', desc: 'エンドレスに突入した' },
  { id: 'veteran', name: 'ベテラン社畜', icon: 'veteran', desc: '10回出社した' },
  { id: 'slayer', name: 'ラッシュキラー', icon: 'slayer', desc: '累計1000撃破した' },
  { id: 'rich', name: 'へそくり長者', icon: 'rich', desc: 'へそくり1000貯めた' },
];

export interface PerkDef {
  id: 'power' | 'wall' | 'base';
  name: string;
  icon: string;
  desc: string;
  max: number;
  cost: (level: number) => number;
}

export const PERKS: PerkDef[] = [
  { id: 'power', name: '反骨心', icon: 'power', desc: '攻撃+4%/Lv', max: 10, cost: (lv) => 100 * (lv + 1) },
  { id: 'wall', name: 'ガード補強', icon: 'wall', desc: '通勤ガード+10/Lv', max: 10, cost: (lv) => 80 * (lv + 1) },
  { id: 'base', name: '体力づくり', icon: 'base', desc: '体力+5/Lv', max: 10, cost: (lv) => 80 * (lv + 1) },
];
