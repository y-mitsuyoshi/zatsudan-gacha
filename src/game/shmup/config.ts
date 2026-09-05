export const VIEW_W = 480;
export const VIEW_H = 800;

export type WeaponId = 'rensa' | 'kakusan' | 'tsuibi';
export type EnemyId = 'commuter' | 'mail' | 'phone' | 'manager' | 'bug' | 'black';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  desc: string;
  icon: string;
}

export const WEAPONS: WeaponDef[] = [
  { id: 'rensa', name: '連射', desc: '前方向に高速連射。ボスに強い', icon: '🔫' },
  { id: 'kakusan', name: '拡散', desc: '5方向に扇状発射。雑魚一掃', icon: '🎇' },
  { id: 'tsuibi', name: '追尾', desc: '敵を追う誘導弾。回避に集中できる', icon: '🚀' },
];

export interface StageDef {
  name: string;
  sub: string;
  emoji: string;
  boss: string;
  bossEmoji: string;
  top: string;
  bottom: string;
  accent: string;
  duration: number;
  enemies: EnemyId[];
}

export const STAGES: StageDef[] = [
  {
    name: '朝の通勤ラッシュ', sub: '電車に駆け込め！', emoji: '🚃', boss: '駅長', bossEmoji: '🧢',
    top: '#0b1e3a', bottom: '#274b73', accent: '#5eb1ff', duration: 32, enemies: ['commuter'],
  },
  {
    name: '朝礼', sub: '社長の話を聞け！', emoji: '✉️', boss: '紙の山', bossEmoji: '🗻',
    top: '#1c2430', bottom: '#4a5568', accent: '#ffd257', duration: 34, enemies: ['commuter', 'mail'],
  },
  {
    name: 'メールの嵐', sub: '全員に返信！', emoji: '📞', boss: '激怒クレーマー', bossEmoji: '🤬',
    top: '#0f2f52', bottom: '#3f7fc1', accent: '#7fe7ff', duration: 36, enemies: ['mail', 'phone', 'commuter'],
  },
  {
    name: '中間管理職', sub: '承認地獄！', emoji: '👔', boss: '課長', bossEmoji: '🕶️',
    top: '#3a1c00', bottom: '#7a3c10', accent: '#ffab4a', duration: 38, enemies: ['phone', 'manager', 'mail'],
  },
  {
    name: 'システム障害', sub: '致命的なエラー！', emoji: '🐛', boss: 'サーバ室', bossEmoji: '🖥️',
    top: '#02120a', bottom: '#0b3d24', accent: '#4dffa6', duration: 40, enemies: ['bug', 'manager', 'phone'],
  },
  {
    name: 'ブラック企業', sub: '最終決戦！', emoji: '🏢', boss: 'CEO', bossEmoji: '👹',
    top: '#26060a', bottom: '#5c1010', accent: '#ff5d5d', duration: 42, enemies: ['black', 'bug', 'manager'],
  },
];

export const TITLES = ['インターン', '正社員', '係長', '課長', '部長', '役員', '社長'];

export function titleForStage(stage: number): string {
  return TITLES[Math.min(Math.max(stage - 1, 0), TITLES.length - 1)];
}

export interface ContinueData {
  stage: number;
  score: number;
  weapon: WeaponId;
  weaponLevel: number;
}

export function rankFor(score: number, cleared: boolean): string {
  if (cleared && score >= 120000) return '伝説の社畜';
  if (cleared) return '社畜マスター';
  if (score >= 80000) return '中間管理職';
  if (score >= 40000) return '万年係長';
  if (score >= 15000) return '若手ホープ';
  if (score >= 5000) return '新入社員';
  return '内定者';
}
