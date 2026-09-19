/**
 * 社畜サバイバー — tuning data.
 * Survivors-like: survive 10:00 (9:00 -> 18:00), auto-attacks, move to dodge.
 * World is infinite; camera follows the player. Logical viewport: VIEW_W x VIEW_H.
 */

export const VIEW_W = 960;
export const VIEW_H = 600;

/** Run length in seconds (9:00 -> 18:00). Survive to win. */
export const RUN_SECONDS = 600;
/** World clock starts at 9:00. */
export const CLOCK_START_HOUR = 9;

/** Caps for performance. */
export const MAX_ENEMIES = 160;
export const MAX_PROJECTILES = 320;
export const MAX_PARTICLES = 250;
export const MAX_DMG_NUMBERS = 40;
export const MAX_GEMS = 400;

/* ---------------- weapons ---------------- */

export type WeaponId =
  | 'shuriken'
  | 'coffee'
  | 'barrier'
  | 'boomerang'
  | 'bomb'
  | 'hanko'
  | 'phone'
  | 'bell';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  desc: string;
  flavor: string;
  maxLv: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  shuriken: { id: 'shuriken', name: '書類シュリケン', icon: '📄', desc: '一番近い敵に書類を投擲。素直で強い。', flavor: '「この資料、投げていいですか」', maxLv: 8 },
  coffee: { id: 'coffee', name: 'コーヒーシャワー', icon: '☕', desc: 'ホットを扇状にぶちまける。', flavor: '熱いうちに飲めよ、の逆', maxLv: 8 },
  barrier: { id: 'barrier', name: '付箋バリア', icon: '🗒️', desc: '周囲を回る付箋が接触ダメージ。', flavor: 'ToDoが身を守る', maxLv: 8 },
  boomerang: { id: 'boomerang', name: '名刺ブーメラン', icon: '💳', desc: '投げた名刺が戻ってきて二度斬る。', flavor: '御社に戻って参りました', maxLv: 8 },
  bomb: { id: 'bomb', name: 'エナドリ爆弾', icon: '🥤', desc: '敵の足元にエナドリ爆撃。範囲攻撃。', flavor: 'カフェインは爆発だ', maxLv: 8 },
  hanko: { id: 'hanko', name: '決裁ハンコ', icon: '💮', desc: '周囲に承認スタンプ。ノックバック。', flavor: '承認！承認！承認！', maxLv: 8 },
  phone: { id: 'phone', name: '取引先コール', icon: '📞', desc: '追尾するクレーム電話。必中。', flavor: '「ちょっとお時間いいですか」', maxLv: 8 },
  bell: { id: 'bell', name: '定時の鐘', icon: '🔔', desc: '周期で広がる衝撃波。全方位殲滅。', flavor: 'カーン…(幻聴)', maxLv: 8 },
};

export const WEAPON_ORDER: WeaponId[] = [
  'shuriken', 'coffee', 'barrier', 'boomerang', 'bomb', 'hanko', 'phone', 'bell',
];

export const MAX_WEAPON_SLOTS = 6;

/* ---------------- passives ---------------- */

export type PassiveId = 'power' | 'shoes' | 'magnet' | 'care' | 'lunch' | 'watch';

export interface PassiveDef {
  id: PassiveId;
  name: string;
  icon: string;
  desc: string;
  maxLv: number;
}

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  power: { id: 'power', name: '残業代', icon: '💴', desc: '全ダメージ +8%/Lv', maxLv: 5 },
  shoes: { id: 'shoes', name: '走れる革靴', icon: '👟', desc: '移動速度 +6%/Lv', maxLv: 5 },
  magnet: { id: 'magnet', name: '定期券', icon: '🧲', desc: '吸引範囲 +25%/Lv', maxLv: 5 },
  care: { id: 'care', name: '健康診断A判定', icon: '❤️‍🩹', desc: '毎秒 +0.8 HP回復/Lv', maxLv: 5 },
  lunch: { id: 'lunch', name: '社食大盛り', icon: '🍱', desc: '最大HP +15/Lv', maxLv: 5 },
  watch: { id: 'watch', name: 'スマウォ', icon: '⌚', desc: 'クールタイム -6%/Lv', maxLv: 5 },
};

export const PASSIVE_ORDER: PassiveId[] = ['power', 'shoes', 'magnet', 'care', 'lunch', 'watch'];

export const MAX_PASSIVE_SLOTS = 6;

/* ---------------- enemies ---------------- */

export type EnemyKind =
  | 'mail'
  | 'doc'
  | 'claim'
  | 'overtime'
  | 'nomikai'
  | 'bossMid'
  | 'hr'
  | 'audit'
  | 'exec'
  | 'senmu'
  | 'president';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  icon: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  coins: number;
  radius: number;
  color: string;
  /** minute (0-10) from which this enemy can spawn */
  fromMin: number;
  weight: number;
  ranged: boolean;
  splitter: boolean;
  score: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mail: { kind: 'mail', name: '未読メール', icon: '📧', hp: 14, speed: 95, damage: 8, xp: 2, coins: 1, radius: 13, color: '#60a5fa', fromMin: 0, weight: 10, ranged: false, splitter: false, score: 10 },
  doc: { kind: 'doc', name: '資料の山', icon: '📁', hp: 52, speed: 46, damage: 14, xp: 4, coins: 2, radius: 17, color: '#f59e0b', fromMin: 0, weight: 6, ranged: false, splitter: false, score: 20 },
  claim: { kind: 'claim', name: 'クレーム', icon: '📢', hp: 22, speed: 132, damage: 10, xp: 3, coins: 1, radius: 12, color: '#f472b6', fromMin: 1, weight: 6, ranged: false, splitter: false, score: 15 },
  overtime: { kind: 'overtime', name: '残業', icon: '🌙', hp: 38, speed: 112, damage: 12, xp: 4, coins: 2, radius: 13, color: '#818cf8', fromMin: 3, weight: 6, ranged: false, splitter: false, score: 20 },
  nomikai: { kind: 'nomikai', name: '強制飲み会', icon: '🍺', hp: 66, speed: 70, damage: 12, xp: 6, coins: 3, radius: 16, color: '#fbbf24', fromMin: 2, weight: 4, ranged: false, splitter: true, score: 30 },
  bossMid: { kind: 'bossMid', name: '上司', icon: '👔', hp: 190, speed: 62, damage: 20, xp: 12, coins: 8, radius: 20, color: '#ef4444', fromMin: 2, weight: 2.5, ranged: false, splitter: false, score: 80 },
  hr: { kind: 'hr', name: '人事', icon: '👩‍💼', hp: 80, speed: 56, damage: 10, xp: 8, coins: 5, radius: 15, color: '#2dd4bf', fromMin: 4, weight: 3, ranged: true, splitter: false, score: 60 },
  audit: { kind: 'audit', name: '監査', icon: '👁️', hp: 340, speed: 76, damage: 25, xp: 16, coins: 12, radius: 22, color: '#c084fc', fromMin: 6, weight: 2, ranged: false, splitter: false, score: 150 },
  exec: { kind: 'exec', name: '役員', icon: '😈', hp: 900, speed: 66, damage: 28, xp: 40, coins: 40, radius: 26, color: '#dc2626', fromMin: 99, weight: 0, ranged: true, splitter: false, score: 800 },
  senmu: { kind: 'senmu', name: '専務', icon: '👹', hp: 1600, speed: 70, damage: 32, xp: 60, coins: 70, radius: 28, color: '#991b1b', fromMin: 99, weight: 0, ranged: true, splitter: false, score: 1500 },
  president: { kind: 'president', name: '社長', icon: '👑', hp: 3200, speed: 58, damage: 38, xp: 150, coins: 200, radius: 34, color: '#fbbf24', fromMin: 99, weight: 0, ranged: true, splitter: false, score: 5000 },
};

export interface BossPlan {
  atSec: number;
  kind: EnemyKind;
  title: string;
  sub: string;
}

export const BOSS_SCHEDULE: BossPlan[] = [
  { atSec: 150, kind: 'bossMid', title: '⚠️ 課長 出現！', sub: '「進捗どうなってる？」巨大な上司が迫る！' },
  { atSec: 300, kind: 'exec', title: '⚠️ 役員 出現！', sub: '「数字が全てだ」弾をばら撒く役員！' },
  { atSec: 450, kind: 'senmu', title: '⚠️ 専務 出現！', sub: '「残業は美徳」高速突進に注意！' },
  { atSec: 560, kind: 'president', title: '⚠️ 社長 出現！！', sub: '「会社のために死ね」定時まで耐え抜け！' },
];

/* ---------------- difficulty ---------------- */

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  icon: string;
  desc: string;
  hpMul: number;
  dmgMul: number;
  countMul: number;
  xpMul: number;
  scoreMul: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { id: 'easy', name: 'ホワイト', icon: '🌱', desc: '敵が弱い。定時退社しやすい。', hpMul: 0.7, dmgMul: 0.65, countMul: 0.8, xpMul: 1.25, scoreMul: 0.8 },
  normal: { id: 'normal', name: 'グレー', icon: '🏢', desc: '標準的なブラック度。', hpMul: 1, dmgMul: 1, countMul: 1, xpMul: 1, scoreMul: 1 },
  hard: { id: 'hard', name: 'ブラック', icon: '💀', desc: '容赦ない物量。上級者向け。', hpMul: 1.55, dmgMul: 1.35, countMul: 1.3, xpMul: 0.9, scoreMul: 1.6 },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

/* ---------------- level curve ---------------- */

/** XP required to go from `level` to `level+1`. */
export function xpForLevel(level: number): number {
  return Math.floor(8 + (level - 1) * 6 + Math.pow(level - 1, 1.7) * 3);
}

/* ---------------- meta upgrades ---------------- */

export type MetaId = 'atk' | 'hp' | 'speed' | 'magnet';

export interface MetaDef {
  id: MetaId;
  name: string;
  icon: string;
  desc: string;
  maxLv: number;
  cost: (lv: number) => number;
}

export const META_UPGRADES: MetaDef[] = [
  { id: 'atk', name: '交渉術', icon: '💴', desc: '初期ダメージ +3%/Lv', maxLv: 10, cost: (lv) => 100 + lv * 80 },
  { id: 'hp', name: '体力作り', icon: '❤️', desc: '初期最大HP +8/Lv', maxLv: 10, cost: (lv) => 100 + lv * 80 },
  { id: 'speed', name: 'ダッシュ通勤', icon: '👟', desc: '初期移動速度 +2%/Lv', maxLv: 5, cost: (lv) => 150 + lv * 120 },
  { id: 'magnet', name: '人望', icon: '🧲', desc: '初期吸引範囲 +10%/Lv', maxLv: 5, cost: (lv) => 150 + lv * 120 },
];

/* ---------------- misc ---------------- */

export function formatClock(sec: number): string {
  // 600s run compresses the 9:00 -> 18:00 workday (540 game-minutes).
  const totalMin = CLOCK_START_HOUR * 60 + Math.floor((Math.min(sec, RUN_SECONDS) / RUN_SECONDS) * 540);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
