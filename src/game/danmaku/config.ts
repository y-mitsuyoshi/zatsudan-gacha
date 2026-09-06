/** Shared tuning for the danmaku engine. Logical world is 480x800. */

export const VIEW_W = 480;
export const VIEW_H = 800;

export type WeaponId = 'rensa' | 'kakusan' | 'tsuibi' | 'laser';
export type EnemyId = 'commuter' | 'mail' | 'phone' | 'manager' | 'bug' | 'black' | 'dasher' | 'printer';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  desc: string;
}

export const WEAPONS: WeaponDef[] = [
  { id: 'rensa', name: '連射', desc: '高速の太い弾。ボスに強い' },
  { id: 'kakusan', name: '拡散', desc: '5方向ワイド。雑魚一掃' },
  { id: 'tsuibi', name: '追尾', desc: '誘導弾。回避に集中できる' },
  { id: 'laser', name: 'レーザー', desc: '貫通2連ビーム。一列粉砕' },
];

export interface SpellDef {
  name: string;
  sub: string;
}

export interface StageDef {
  name: string;
  sub: string;
  boss: string;
  accent: string;
  top: string;
  bottom: string;
  duration: number;
  enemies: EnemyId[];
  spells: [SpellDef, SpellDef];
}

export const STAGES: StageDef[] = [
  {
    name: '朝の通勤ラッシュ', sub: '電車に駆け込め！', boss: '駅長', accent: '#5eb1ff',
    top: '#0b1e3a', bottom: '#274b73', duration: 26,
    enemies: ['commuter'],
    spells: [
      { name: '満員結界「通勤地獄」', sub: '5WAYホイッスル' },
      { name: '秘技「終電逃し」', sub: '回転スパイラル' },
    ],
  },
  {
    name: '朝礼', sub: '社長の話を聞け！', boss: '紙の山', accent: '#ffd257',
    top: '#1c2430', bottom: '#4a5568', duration: 27,
    enemies: ['commuter', 'mail', 'dasher'],
    spells: [
      { name: '紙吹雪「稟議乱舞」', sub: 'ランダムシャワー' },
      { name: '奥義「ハンコ三連」', sub: '狙撃3バースト' },
    ],
  },
  {
    name: 'メールの嵐', sub: '全員に返信！', boss: '激怒クレーマー', accent: '#7fe7ff',
    top: '#0f2f52', bottom: '#3f7fc1', duration: 28,
    enemies: ['mail', 'phone', 'commuter', 'dasher'],
    spells: [
      { name: '怒号「無限リング」', sub: '全方位12連' },
      { name: '絶叫「着信地獄」', sub: '二重螺旋' },
    ],
  },
  {
    name: '中間管理職', sub: '承認地獄！', boss: '課長', accent: '#ffab4a',
    top: '#3a1c00', bottom: '#7a3c10', duration: 29,
    enemies: ['phone', 'manager', 'mail', 'printer'],
    spells: [
      { name: '査定「赤点連打」', sub: '高速3点バースト' },
      { name: '圧力「会議延長」', sub: '遅延リング＋狙撃' },
    ],
  },
  {
    name: 'システム障害', sub: '致命的なエラー！', boss: 'サーバ室', accent: '#4dffa6',
    top: '#02120a', bottom: '#0b3d24', duration: 30,
    enemies: ['bug', 'manager', 'phone', 'printer', 'dasher'],
    spells: [
      { name: '障害「データ豪雨」', sub: '垂直の雨' },
      { name: '復旧「ロールバック」', sub: '逆回転スパイラル' },
    ],
  },
  {
    name: 'ブラック企業', sub: '最終決戦！', boss: 'CEO', accent: '#ff5d5d',
    top: '#26060a', bottom: '#5c1010', duration: 32,
    enemies: ['black', 'bug', 'manager', 'printer', 'dasher'],
    spells: [
      { name: '支配「無限残業」', sub: '三重螺旋＋狙撃' },
      { name: '最終決裁「過労死」', sub: '全方位怒涛' },
    ],
  },
];

export const TITLES = ['インターン', '正社員', '係長', '課長', '部長', '役員', '社長'];

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  desc: string;
  /** enemy bullet speed */
  bullet: number;
  /** enemy HP */
  enemyHp: number;
  /** boss HP */
  bossHp: number;
  /** enemy fire interval scale (smaller = more frequent) */
  fireInterval: number;
  /** spawn rate scale (larger = more enemies) */
  spawnRate: number;
  /** score gain */
  score: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  { id: 'easy', name: '定時退社', desc: 'ゆったり弾幕・スコア0.8倍', bullet: 0.82, enemyHp: 0.85, bossHp: 0.85, fireInterval: 1.25, spawnRate: 0.85, score: 0.8 },
  { id: 'normal', name: '通常勤務', desc: '標準・スコア等倍', bullet: 1.0, enemyHp: 1.0, bossHp: 1.0, fireInterval: 1.0, spawnRate: 1.0, score: 1.0 },
  { id: 'hard', name: '過酷残業', desc: '高速高密度・スコア1.3倍', bullet: 1.16, enemyHp: 1.18, bossHp: 1.22, fireInterval: 0.84, spawnRate: 1.16, score: 1.3 },
];

export function difficultyDef(id: Difficulty): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1]!;
}

export function titleForStage(stage: number): string {
  return TITLES[Math.min(Math.max(stage - 1, 0), TITLES.length - 1)];
}

export interface ContinueData {
  stage: number;
  score: number;
  lives: number;
  weapon: WeaponId;
  power: number;
}

/** Score thresholds that grant an extra life. */
export const EXTENDS = [60000, 200000, 500000];

export function rankFor(score: number, cleared: boolean): string {
  if (cleared && score >= 400000) return '伝説の社畜';
  if (cleared) return '社畜マスター';
  if (score >= 200000) return '中間管理職';
  if (score >= 90000) return '万年係長';
  if (score >= 30000) return '若手ホープ';
  if (score >= 8000) return '新入社員';
  return '内定者';
}
