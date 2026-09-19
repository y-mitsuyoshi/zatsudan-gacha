/**
 * 社畜スパイラルディフェンス — tuning data.
 * Central core + business chains spiral inward. 15 waves + endless.
 */

export const VIEW = 640;
export const CENTER = VIEW / 2;
export const ARENA_R = 300;
/** Player may move within this radius of center. */
export const MOVE_R = 110;

/** Waves to clear for victory. */
export const FINAL_WAVE = 15;

/** Performance caps. */
export const MAX_CHAINS = 14;
export const MAX_PROJECTILES = 300;
export const MAX_PARTICLES = 200;
export const MAX_DMG_NUMBERS = 40;
export const MAX_COINS = 200;

/* ---------------- stages (配属先) ---------------- */

export type StageId = 'hq' | 'branch' | 'warehouse' | 'night';

export interface StageDef {
  id: StageId;
  name: string;
  desc: string;
  /** HP multiplier for all chains */
  hpMul: number;
  /** shrink (approach speed) multiplier */
  speedMul: number;
  /** spawn count multiplier */
  countMul: number;
  /** score multiplier */
  scoreMul: number;
  /** coin multiplier */
  coinMul: number;
  /** background tint (top / bottom) */
  bg: [string, string];
  unlockAtWins: number;
}

export const STAGES: Record<StageId, StageDef> = {
  hq: {
    id: 'hq', name: '本社', desc: '標準の渦。まずはここから。',
    hpMul: 1, speedMul: 1, countMul: 1, scoreMul: 1, coinMul: 1,
    bg: ['#070b18', '#0d1428'], unlockAtWins: 0,
  },
  branch: {
    id: 'branch', name: '地方支社', desc: '渦が速いが報酬も多い。',
    hpMul: 0.95, speedMul: 1.15, countMul: 1.2, scoreMul: 1.25, coinMul: 1.2,
    bg: ['#0d0b18', '#1a1228'], unlockAtWins: 1,
  },
  warehouse: {
    id: 'warehouse', name: '物流倉庫', desc: '硬い業務列が大量に押し寄せる。',
    hpMul: 1.35, speedMul: 0.95, countMul: 1.35, scoreMul: 1.4, coinMul: 1.35,
    bg: ['#140d08', '#241408'], unlockAtWins: 2,
  },
  night: {
    id: 'night', name: '深夜シフト', desc: '最速・最硬の最難関。最高報酬。',
    hpMul: 1.5, speedMul: 1.28, countMul: 1.45, scoreMul: 1.75, coinMul: 1.6,
    bg: ['#050510', '#0a0a1e'], unlockAtWins: 3,
  },
};

export const STAGE_ORDER: StageId[] = ['hq', 'branch', 'warehouse', 'night'];

/* ---------------- snake chains ---------------- */

export type ChainKind = 'mail' | 'doc' | 'claim' | 'bossMid' | 'exec' | 'president';

export interface ChainDef {
  kind: ChainKind;
  name: string;
  icon: string;
  color: string;
  /** segments (head + body) */
  segs: number;
  segHp: number;
  segRadius: number;
  /** radial approach speed px/s */
  shrink: number;
  /** angular speed rad/s */
  angular: number;
  contact: number;
  score: number;
  coins: number;
  boss: boolean;
}

export const CHAINS: Record<ChainKind, ChainDef> = {
  mail: { kind: 'mail', name: '未読メール列', icon: 'mail', color: '#60a5fa', segs: 5, segHp: 7, segRadius: 11, shrink: 19, angular: 0.8, contact: 7, score: 10, coins: 1, boss: false },
  doc: { kind: 'doc', name: '資料の山列', icon: 'doc', color: '#f59e0b', segs: 8, segHp: 17, segRadius: 13, shrink: 14, angular: 0.62, contact: 11, score: 20, coins: 2, boss: false },
  claim: { kind: 'claim', name: 'クレーム列', icon: 'claim', color: '#f472b6', segs: 6, segHp: 11, segRadius: 11, shrink: 22, angular: 1.0, contact: 9, score: 15, coins: 1, boss: false },
  bossMid: { kind: 'bossMid', name: '上司の行列', icon: 'bossMid', color: '#ef4444', segs: 12, segHp: 42, segRadius: 15, shrink: 12, angular: 0.52, contact: 17, score: 150, coins: 12, boss: true },
  exec: { kind: 'exec', name: '役員会議', icon: 'exec', color: '#dc2626', segs: 16, segHp: 80, segRadius: 16, shrink: 11, angular: 0.55, contact: 24, score: 400, coins: 30, boss: true },
  president: { kind: 'president', name: '社長命令', icon: 'president', color: '#fbbf24', segs: 22, segHp: 150, segRadius: 17, shrink: 10, angular: 0.5, contact: 32, score: 1200, coins: 100, boss: true },
};

export interface SpawnItem {
  kind: ChainKind;
  count: number;
  gap: number;
  delay: number;
}

/** Wave composition. Endless (wave > FINAL_WAVE) escalates procedurally. */
export function wavePlan(wave: number): SpawnItem[] {
  if (wave > FINAL_WAVE) {
    const k = wave - FINAL_WAVE;
    return [
      { kind: 'mail', count: 3 + k, gap: Math.max(0.5, 1.4 - k * 0.1), delay: 0 },
      { kind: 'claim', count: 2 + k, gap: Math.max(0.5, 1.6 - k * 0.1), delay: 2 },
      { kind: 'doc', count: 2 + Math.floor(k / 2), gap: 2, delay: 4 },
      { kind: k % 3 === 0 ? 'president' : k % 2 === 0 ? 'exec' : 'bossMid', count: 1, gap: 1, delay: 6 },
    ];
  }
  const plan: SpawnItem[] = [];
  // boss waves focus on the boss: fewer escorts
  const isBossWave = wave === 5 || wave === 10 || wave === 15;
  const mails = isBossWave ? 2 + Math.floor(wave * 0.4) : 2 + Math.floor(wave * 0.8);
  plan.push({ kind: 'mail', count: mails, gap: Math.max(0.6, 1.8 - wave * 0.08), delay: 0 });
  if (wave >= 2) {
    const docs = isBossWave ? Math.floor(wave / 3) : 1 + Math.floor(wave / 2);
    plan.push({ kind: 'doc', count: docs, gap: 2.2, delay: 3 });
  }
  if (wave >= 3) {
    const claims = isBossWave ? Math.floor(wave / 3) : 1 + Math.floor(wave / 2);
    plan.push({ kind: 'claim', count: claims, gap: 1.8, delay: 6 });
  }
  if (wave === 5) plan.push({ kind: 'bossMid', count: 1, gap: 1, delay: 8 });
  if (wave === 10) plan.push({ kind: 'exec', count: 1, gap: 1, delay: 8 });
  if (wave === 15) plan.push({ kind: 'president', count: 1, gap: 1, delay: 8 });
  return plan;
}

/** HP/damage scale for a wave. */
export function waveHpScale(wave: number, endless: boolean): number {
  const base = 1 + (wave - 1) * 0.19;
  return endless ? base * (1 + (wave - FINAL_WAVE) * 0.12) : base;
}

export function waveDmgScale(wave: number): number {
  return 1 + (wave - 1) * 0.06;
}

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
  scoreMul: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { id: 'easy', name: 'ホワイト', icon: 'easy', desc: '渦がゆるい。初めてに。', hpMul: 0.7, dmgMul: 0.65, countMul: 0.8, scoreMul: 0.8 },
  normal: { id: 'normal', name: 'グレー', icon: 'normal', desc: '標準的な渦。', hpMul: 1, dmgMul: 1, countMul: 1, scoreMul: 1 },
  hard: { id: 'hard', name: 'ブラック', icon: 'hard', desc: '容赦ない渦。上級者向け。', hpMul: 1.5, dmgMul: 1.3, countMul: 1.25, scoreMul: 1.6 },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

/* ---------------- upgrades ---------------- */

export type UpgradeId =
  | 'dmg' | 'rate' | 'multi' | 'pierce' | 'crit'
  | 'orb' | 'blast' | 'beam' | 'hp' | 'regen';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  desc: string;
  maxLv: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  dmg: { id: 'dmg', name: '書類の束', icon: 'dmg', desc: '弾ダメージ +25%/Lv', maxLv: 8 },
  rate: { id: 'rate', name: '高速コピー機', icon: 'rate', desc: '連射速度 +12%/Lv', maxLv: 8 },
  multi: { id: 'multi', name: 'CC追加', icon: 'multi', desc: '同時発射 +1/Lv', maxLv: 4 },
  pierce: { id: 'pierce', name: 'ホチキス針', icon: 'pierce', desc: '貫通 +1/Lv', maxLv: 5 },
  crit: { id: 'crit', name: '決裁印', icon: 'crit', desc: 'クリ率 +7%/Lv（2倍）', maxLv: 5 },
  orb: { id: 'orb', name: '付箋オービタル', icon: 'orb', desc: '周回付箋 +1/Lv（初回2個）', maxLv: 5 },
  blast: { id: 'blast', name: 'エナドリ爆発', icon: 'blast', desc: '周期範囲爆発を強化', maxLv: 5 },
  beam: { id: 'beam', name: '定時ビーム', icon: 'beam', desc: '最硬の敵を貫く光', maxLv: 5 },
  hp: { id: 'hp', name: '社食大盛り', icon: 'hp', desc: '最大HP +25＆回復25', maxLv: 8 },
  regen: { id: 'regen', name: '仮眠', icon: 'regen', desc: '毎秒 +0.7 HP回復/Lv', maxLv: 5 },
};

export const UPGRADE_ORDER: UpgradeId[] = [
  'dmg', 'rate', 'multi', 'pierce', 'crit', 'orb', 'blast', 'beam', 'hp', 'regen',
];

/* ---------------- meta ---------------- */

export type MetaId = 'atk' | 'hp' | 'rate';

export interface MetaDef {
  id: MetaId;
  name: string;
  icon: string;
  desc: string;
  maxLv: number;
  cost: (lv: number) => number;
}

export const META_UPGRADES: MetaDef[] = [
  { id: 'atk', name: '交渉術', icon: 'atk', desc: '初期ダメージ +4%/Lv', maxLv: 10, cost: (lv) => 100 + lv * 80 },
  { id: 'hp', name: '体力作り', icon: 'hp', desc: '初期最大HP +10/Lv', maxLv: 10, cost: (lv) => 100 + lv * 80 },
  { id: 'rate', name: '段取り力', icon: 'rate', desc: '初期連射 +2%/Lv', maxLv: 5, cost: (lv) => 150 + lv * 120 },
];

/* ---------------- misc ---------------- */

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
