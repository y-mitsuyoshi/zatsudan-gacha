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

export type BaseWeaponId =
  | 'shuriken'
  | 'coffee'
  | 'barrier'
  | 'boomerang'
  | 'bomb'
  | 'hanko'
  | 'phone'
  | 'bell';

export type EvolvedWeaponId =
  | 'contract_storm'
  | 'caffeine_geyser'
  | 'kanban_barrier'
  | 'gold_exchange'
  | 'taurine_supernova'
  | 'emergency_hotline'
  | 'imperial_seal'
  | 'grand_chime';

export type WeaponId = BaseWeaponId | EvolvedWeaponId;

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  desc: string;
  flavor: string;
  maxLv: number;
  evolved?: boolean;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  // Base Weapons (Lv1 -> Lv8)
  shuriken: { id: 'shuriken', name: '書類シュリケン', icon: 'shuriken', desc: '一番近い敵に書類を投擲。素直で強い。', flavor: '「この資料、投げていいですか」', maxLv: 8 },
  coffee: { id: 'coffee', name: 'コーヒーシャワー', icon: 'coffee', desc: 'ホットを扇状にぶちまける。', flavor: '熱いうちに飲めよ、の逆', maxLv: 8 },
  barrier: { id: 'barrier', name: '付箋バリア', icon: 'barrier', desc: '周囲を回る付箋が接触ダメージ。', flavor: 'ToDoが身を守る', maxLv: 8 },
  boomerang: { id: 'boomerang', name: '名刺ブーメラン', icon: 'boomerang', desc: '投げた名刺が戻ってきて二度斬る。', flavor: '御社に戻って参りました', maxLv: 8 },
  bomb: { id: 'bomb', name: 'エナドリ爆弾', icon: 'bomb', desc: '敵の足元にエナドリ爆撃。範囲攻撃。', flavor: 'カフェインは爆発だ', maxLv: 8 },
  hanko: { id: 'hanko', name: '決裁ハンコ', icon: 'hanko', desc: '周囲に承認スタンプ。ノックバック。', flavor: '承認！承認！承認！', maxLv: 8 },
  phone: { id: 'phone', name: '取引先コール', icon: 'phone', desc: '追尾するクレーム電話。必中。', flavor: '「ちょっとお時間いいですか」', maxLv: 8 },
  bell: { id: 'bell', name: '定時の鐘', icon: 'bell', desc: '周期で広がる衝撃波。全方位殲滅。', flavor: 'カーン…(幻聴)', maxLv: 8 },

  // Evolved Weapons (Legendary Lv1)
  contract_storm: { id: 'contract_storm', name: '契約書ストーム', icon: 'contract_storm', desc: '無限に螺旋を描くカッター契約書。全敵貫通。', flavor: '「全条項、承認済みです」', maxLv: 1, evolved: true },
  caffeine_geyser: { id: 'caffeine_geyser', name: 'メガカフェイン・ゲイザー', icon: 'caffeine_geyser', desc: '前後に薙ぎ払う超熱湯エスプレッソ火炎放射。', flavor: 'トリプルエスプレッソ直噴', maxLv: 1, evolved: true },
  kanban_barrier: { id: 'kanban_barrier', name: 'タスク管理結界', icon: 'kanban_barrier', desc: '巨大な電磁ToDoボード結界。敵弾を反射・消滅。', flavor: '進捗管理は絶対防御', maxLv: 1, evolved: true },
  gold_exchange: { id: 'gold_exchange', name: '役員ゴールド名刺', icon: 'gold_exchange', desc: '純金名刺が広域楕円軌道を描き衝撃波を放つ。', flavor: '純金24Kの圧倒的挨拶', maxLv: 1, evolved: true },
  taurine_supernova: { id: 'taurine_supernova', name: 'モンスタータウリン', icon: 'taurine_supernova', desc: '地面に高濃度タウリン溶解プールを形成。減速＆融解。', flavor: 'タウリン30000mgの超新星', maxLv: 1, evolved: true },
  emergency_hotline: { id: 'emergency_hotline', name: '緊急ホットライン', icon: 'emergency_hotline', desc: '全社衛星ホットライン雷撃。密集地帯へ連続落雷。', flavor: '役員直通24時間スクランブル', maxLv: 1, evolved: true },
  imperial_seal: { id: 'imperial_seal', name: '代表取締役印', icon: 'imperial_seal', desc: '画面全体を揺るがす巨大決裁印。大ダメージ＆1秒スタン。', flavor: 'これにて全件決裁完了', maxLv: 1, evolved: true },
  grand_chime: { id: 'grand_chime', name: '完全定時チャイム', icon: 'grand_chime', desc: '終業チャイムが響き渡り、全雑魚敵を1.5秒間完全凍結。', flavor: '「お疲れ様でした、帰ります」', maxLv: 1, evolved: true },
};

export const WEAPON_ORDER: BaseWeaponId[] = [
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
  power: { id: 'power', name: '残業代', icon: 'power', desc: '全ダメージ +8%/Lv', maxLv: 5 },
  shoes: { id: 'shoes', name: '走れる革靴', icon: 'shoes', desc: '移動速度 +6%/Lv', maxLv: 5 },
  magnet: { id: 'magnet', name: '定期券', icon: 'magnet', desc: '吸引範囲 +25%/Lv', maxLv: 5 },
  care: { id: 'care', name: '健康診断A判定', icon: 'care', desc: '毎秒 +0.8 HP回復/Lv', maxLv: 5 },
  lunch: { id: 'lunch', name: '社食大盛り', icon: 'lunch', desc: '最大HP +15/Lv', maxLv: 5 },
  watch: { id: 'watch', name: 'スマウォ', icon: 'watch', desc: 'クールタイム -6%/Lv', maxLv: 5 },
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
  mail: { kind: 'mail', name: '未読メール', icon: 'mail', hp: 14, speed: 95, damage: 8, xp: 2, coins: 1, radius: 13, color: '#60a5fa', fromMin: 0, weight: 10, ranged: false, splitter: false, score: 10 },
  doc: { kind: 'doc', name: '資料の山', icon: 'doc', hp: 52, speed: 46, damage: 14, xp: 4, coins: 2, radius: 17, color: '#f59e0b', fromMin: 0, weight: 6, ranged: false, splitter: false, score: 20 },
  claim: { kind: 'claim', name: 'クレーム', icon: 'claim', hp: 22, speed: 132, damage: 10, xp: 3, coins: 1, radius: 12, color: '#f472b6', fromMin: 1, weight: 6, ranged: false, splitter: false, score: 15 },
  overtime: { kind: 'overtime', name: '残業', icon: 'overtime', hp: 38, speed: 112, damage: 12, xp: 4, coins: 2, radius: 13, color: '#818cf8', fromMin: 3, weight: 6, ranged: false, splitter: false, score: 20 },
  nomikai: { kind: 'nomikai', name: '強制飲み会', icon: 'nomikai', hp: 66, speed: 70, damage: 12, xp: 6, coins: 3, radius: 16, color: '#fbbf24', fromMin: 2, weight: 4, ranged: false, splitter: true, score: 30 },
  bossMid: { kind: 'bossMid', name: '上司', icon: 'bossMid', hp: 190, speed: 62, damage: 20, xp: 12, coins: 8, radius: 20, color: '#ef4444', fromMin: 2, weight: 2.5, ranged: false, splitter: false, score: 80 },
  hr: { kind: 'hr', name: '人事', icon: 'hr', hp: 80, speed: 56, damage: 10, xp: 8, coins: 5, radius: 15, color: '#2dd4bf', fromMin: 4, weight: 3, ranged: true, splitter: false, score: 60 },
  audit: { kind: 'audit', name: '監査', icon: 'audit', hp: 340, speed: 76, damage: 25, xp: 16, coins: 12, radius: 22, color: '#c084fc', fromMin: 6, weight: 2, ranged: false, splitter: false, score: 150 },
  exec: { kind: 'exec', name: '役員', icon: 'exec', hp: 900, speed: 66, damage: 28, xp: 40, coins: 40, radius: 26, color: '#dc2626', fromMin: 99, weight: 0, ranged: true, splitter: false, score: 800 },
  senmu: { kind: 'senmu', name: '専務', icon: 'senmu', hp: 1600, speed: 70, damage: 32, xp: 60, coins: 70, radius: 28, color: '#991b1b', fromMin: 99, weight: 0, ranged: true, splitter: false, score: 1500 },
  president: { kind: 'president', name: '社長', icon: 'president', hp: 3200, speed: 58, damage: 38, xp: 150, coins: 200, radius: 34, color: '#fbbf24', fromMin: 99, weight: 0, ranged: true, splitter: false, score: 5000 },
};

export interface BossPlan {
  atSec: number;
  kind: EnemyKind;
  title: string;
  sub: string;
}

export const BOSS_SCHEDULE: BossPlan[] = [
  { atSec: 150, kind: 'bossMid', title: '【警報】課長 出現！', sub: '「進捗どうなってる？」巨大な上司が迫る！' },
  { atSec: 300, kind: 'exec', title: '【警報】役員 出現！', sub: '「数字が全てだ」弾をばら撒く役員！' },
  { atSec: 450, kind: 'senmu', title: '【警報】専務 出現！', sub: '「残業は美徳」高速突進に注意！' },
  { atSec: 560, kind: 'president', title: '【緊急警告】社長 出現！！', sub: '「会社のために死ね」定時まで耐え抜け！' },
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
  easy: { id: 'easy', name: 'ホワイト', icon: 'icon_plant', desc: '敵が弱い。定時退社しやすい。', hpMul: 0.7, dmgMul: 0.65, countMul: 0.8, xpMul: 1.25, scoreMul: 0.8 },
  normal: { id: 'normal', name: 'グレー', icon: 'icon_building', desc: '標準的なブラック度。', hpMul: 1, dmgMul: 1, countMul: 1, xpMul: 1, scoreMul: 1 },
  hard: { id: 'hard', name: 'ブラック', icon: 'icon_skull', desc: '容赦ない物量。上級者向け。', hpMul: 1.55, dmgMul: 1.35, countMul: 1.3, xpMul: 0.9, scoreMul: 1.6 },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

/* ---------------- stages (勤務フロア) ---------------- */

export type StageId = 'honsha' | 'factory' | 'datacenter' | 'boardroom';

export interface StageDef {
  id: StageId;
  name: string;
  desc: string;
  /** enemy hp multiplier */
  hpMul: number;
  /** enemy speed multiplier */
  speedMul: number;
  /** spawn rate multiplier */
  spawnMul: number;
  /** xp gain multiplier */
  xpMul: number;
  /** coin gain multiplier */
  coinMul: number;
  /** score multiplier */
  scoreMul: number;
  /** floor tint */
  floor: string;
  /** grid tint */
  grid: string;
  unlockAtWins: number;
}

export const STAGES: Record<StageId, StageDef> = {
  honsha: {
    id: 'honsha', name: '本社ビル', desc: '標準フロア。まずはここから。',
    hpMul: 1, speedMul: 1, spawnMul: 1, xpMul: 1, coinMul: 1, scoreMul: 1,
    floor: '#141a2e', grid: 'rgba(255,255,255,0.05)', unlockAtWins: 0,
  },
  factory: {
    id: 'factory', name: '工場', desc: '物量が多いが経験値美味。',
    hpMul: 0.9, speedMul: 1.08, spawnMul: 1.35, xpMul: 1.3, coinMul: 1.05, scoreMul: 1.15,
    floor: '#1c1710', grid: 'rgba(255,190,80,0.06)', unlockAtWins: 1,
  },
  datacenter: {
    id: 'datacenter', name: 'データセンター', desc: '硬い敵＋寒冷。リターン大。',
    hpMul: 1.3, speedMul: 0.95, spawnMul: 1.05, xpMul: 1.15, coinMul: 1.35, scoreMul: 1.3,
    floor: '#0c1a24', grid: 'rgba(80,220,255,0.07)', unlockAtWins: 2,
  },
  boardroom: {
    id: 'boardroom', name: '役員会議室', desc: 'ボス頻出の最危険フロア。最高報酬。',
    hpMul: 1.4, speedMul: 1.12, spawnMul: 1.15, xpMul: 1.5, coinMul: 1.6, scoreMul: 1.75,
    floor: '#1e0f14', grid: 'rgba(255,80,110,0.07)', unlockAtWins: 3,
  },
};

export const STAGE_ORDER: StageId[] = ['honsha', 'factory', 'datacenter', 'boardroom'];

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
  { id: 'atk', name: '交渉術', icon: 'power', desc: '初期ダメージ +3%/Lv', maxLv: 10, cost: (lv) => 100 + lv * 80 },
  { id: 'hp', name: '体力作り', icon: 'icon_heart', desc: '初期最大HP +8/Lv', maxLv: 10, cost: (lv) => 100 + lv * 80 },
  { id: 'speed', name: 'ダッシュ通勤', icon: 'shoes', desc: '初期移動速度 +2%/Lv', maxLv: 5, cost: (lv) => 150 + lv * 120 },
  { id: 'magnet', name: '人望', icon: 'magnet', desc: '初期吸引範囲 +10%/Lv', maxLv: 5, cost: (lv) => 150 + lv * 120 },
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
