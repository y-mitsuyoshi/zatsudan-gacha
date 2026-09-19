/**
 * Barricade Defense — game tuning data.
 * Playfield is a fixed logical space (W x H); the engine scales it to canvas.
 */

export const VIEW_W = 480;
export const VIEW_H = 800;

/** Y of the barricade wall. Enemies stop here and chew through it. */
export const BARRICADE_Y = 620;
/** Y of the base line. If the wall is down, enemies march on and damage the base. */
export const BASE_Y = 730;
/** Y of the player turret. */
export const TURRET_Y = 700;

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
  speed: number; // bullet speed px/s
  pierce: number; // how many enemies a bullet passes through
  splash: number; // explosion radius (0 = none)
  slow: number; // slow factor applied (0 = none, 0.5 = half speed)
  duration: number; // pickup duration in seconds (Infinity = default weapon)
  color: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    id: 'pistol', name: 'ピストル', icon: '🔫', desc: '初期装備。堅実な連射。',
    damage: 12, interval: 0.22, count: 1, spread: 0.03, speed: 620,
    pierce: 0, splash: 0, slow: 0, duration: Infinity, color: '#fde047',
  },
  smg: {
    id: 'smg', name: 'SMG', icon: '🔥', desc: '超連射！弾幕で薙ぎ払え。',
    damage: 8, interval: 0.09, count: 1, spread: 0.09, speed: 640,
    pierce: 0, splash: 0, slow: 0, duration: 14, color: '#fb923c',
  },
  shotgun: {
    id: 'shotgun', name: 'ショットガン', icon: '💥', desc: '近距離で絶大な5連散弾。',
    damage: 9, interval: 0.55, count: 5, spread: 0.34, speed: 560,
    pierce: 0, splash: 0, slow: 0, duration: 14, color: '#f87171',
  },
  rifle: {
    id: 'rifle', name: 'ライフル', icon: '🎯', desc: '貫通弾で一列粉砕。',
    damage: 26, interval: 0.42, count: 1, spread: 0.01, speed: 900,
    pierce: 3, splash: 0, slow: 0, duration: 14, color: '#67e8f9',
  },
  launcher: {
    id: 'launcher', name: 'ランチャー', icon: '🚀', desc: '着弾爆発で範囲殲滅。',
    damage: 30, interval: 0.8, count: 1, spread: 0.02, speed: 430,
    pierce: 0, splash: 90, slow: 0, duration: 14, color: '#c084fc',
  },
  freeze: {
    id: 'freeze', name: 'フリーズガン', icon: '❄️', desc: '敵を鈍足化させる冷気弾。',
    damage: 7, interval: 0.16, count: 1, spread: 0.08, speed: 540,
    pierce: 1, splash: 0, slow: 0.5, duration: 14, color: '#a5f3fc',
  },
};

export const WEAPON_ORDER: WeaponId[] = ['pistol', 'smg', 'shotgun', 'rifle', 'launcher', 'freeze'];

export type EnemyKind = 'runner' | 'walker' | 'brute' | 'shield' | 'kamikaze' | 'boss';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number; // px/s downward
  damage: number; // dps to barricade / damage to base on contact
  score: number;
  coins: number;
  radius: number;
  color: string;
  emoji: string;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  runner: { kind: 'runner', name: 'ダッシャー', hp: 22, speed: 95, damage: 10, score: 50, coins: 3, radius: 13, color: '#4ade80', emoji: '👾' },
  walker: { kind: 'walker', name: 'ウォーカー', hp: 55, speed: 52, damage: 16, score: 100, coins: 5, radius: 16, color: '#facc15', emoji: '👹' },
  brute: { kind: 'brute', name: 'ブルート', hp: 170, speed: 34, damage: 34, score: 250, coins: 12, radius: 22, color: '#f97316', emoji: '🦍' },
  shield: { kind: 'shield', name: 'シールド', hp: 110, speed: 44, damage: 20, score: 200, coins: 9, radius: 17, color: '#38bdf8', emoji: '🛡️' },
  kamikaze: { kind: 'kamikaze', name: 'カミカゼ', hp: 30, speed: 130, damage: 55, score: 150, coins: 7, radius: 12, color: '#f472b6', emoji: '💣' },
  boss: { kind: 'boss', name: 'ウォーロード', hp: 2600, speed: 26, damage: 60, score: 3000, coins: 150, radius: 40, color: '#ef4444', emoji: '👿' },
};

export type CourseId = 'city' | 'desert' | 'snow';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface CourseDef {
  id: CourseId;
  name: string;
  icon: string;
  desc: string;
  waves: number;
  sky: [string, string];
  ground: string;
}

export const COURSES: Record<CourseId, CourseDef> = {
  city: {
    id: 'city', name: '市街地', icon: '🏙️', desc: '全5WAVE。基本の戦場。',
    waves: 5, sky: ['#0b1026', '#1e2a5a'], ground: '#1f2937',
  },
  desert: {
    id: 'desert', name: '砂漠', icon: '🏜️', desc: '全6WAVE。高速敵が増加。',
    waves: 6, sky: ['#1a0f2e', '#5a2a1e'], ground: '#3f2d1c',
  },
  snow: {
    id: 'snow', name: '雪原', icon: '❄️', desc: '全7WAVE。硬い敵＋ボス強化。',
    waves: 7, sky: ['#0a1628', '#1e3a5a'], ground: '#243447',
  },
};

export const COURSE_ORDER: CourseId[] = ['city', 'desert', 'snow'];

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
  easy: { id: 'easy', name: 'やさしい', icon: '🌱', hpMul: 0.7, speedMul: 0.85, dmgMul: 0.7, countMul: 0.8, scoreMul: 0.8, desc: '敵が弱い。初めてに。' },
  normal: { id: 'normal', name: 'ふつう', icon: '🔥', hpMul: 1, speedMul: 1, dmgMul: 1, countMul: 1, scoreMul: 1, desc: '標準バランス。' },
  hard: { id: 'hard', name: 'つらい', icon: '💀', hpMul: 1.5, speedMul: 1.12, dmgMul: 1.4, countMul: 1.25, scoreMul: 1.5, desc: '高スコア狙い上級者向け。' },
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

/** Build a wave plan. Deterministic-ish via seeded rand in engine. */
export function planWave(course: CourseDef, wave: number, diff: DifficultyDef, endless: number): WavePlan {
  const isBoss = !endless || endless === 0 ? wave === course.waves : false;
  const bossWave = wave === course.waves && endless === 0;
  const scale = (1 + (wave - 1) * 0.35 + endless * 0.5) * diff.countMul;
  const budget = Math.round((10 + wave * 6) * scale + (bossWave ? 14 : 0));
  const desertFast = course.id !== 'city' ? 1.4 : 1;
  const snowTank = course.id === 'snow' ? 1.5 : 1;
  return {
    wave,
    totalWaves: course.waves,
    isBoss: bossWave,
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
  { id: 'repair', name: 'バリケード修理', icon: '🧱', desc: '壁HPを全回復', cost: () => 40 },
  { id: 'wall', name: 'バリケード強化', icon: '🛡️', desc: '壁最大HP +40', cost: (lv) => 60 + lv * 40 },
  { id: 'power', name: '火力アップ', icon: '⚡', desc: '全武器ダメージ +15%', cost: (lv) => 80 + lv * 60 },
  { id: 'ally', name: '仲間を雇う', icon: '🤝', desc: '自動射撃の仲間+1 (最大3)', cost: () => 120 },
  { id: 'heal', name: '拠点修理', icon: '❤️', desc: '拠点HPを全回復', cost: () => 50 },
];

export const MAX_ALLIES = 3;
export const ALLY_HP = 3;
