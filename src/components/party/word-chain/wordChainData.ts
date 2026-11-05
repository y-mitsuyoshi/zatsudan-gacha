export const WORD_CHAIN_START_WORDS = [
  '会議',
  '休日',
  'ランチ',
  '出張',
  'チームワーク',
  '上司',
  '給料日',
  '残業',
  '朝礼',
  'オフィス',
  'リモートワーク',
  '名刺',
  'プレゼン',
  '新入社員',
  '飲み会',
  '週末',
  '通勤',
  '取引先',
  '研修',
  '部署',
  '目標',
  '報連相',
  '資料作成',
  '有給休暇',
  '社内報',
  'コーヒー',
  '会議室',
  'プロジェクト',
  '納期',
  '歓迎会',
  'オフサイト',
  'ワークショップ',
  'アイスブレイク',
  '合宿',
  'テレワーク',
] as const;

export const WORD_CHAIN_PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8] as const;
export const WORD_CHAIN_MIN_PLAYERS = WORD_CHAIN_PLAYER_COUNTS[0];
export const WORD_CHAIN_MAX_PLAYERS = WORD_CHAIN_PLAYER_COUNTS[WORD_CHAIN_PLAYER_COUNTS.length - 1];
export const WORD_CHAIN_TOTAL_ROUNDS = 5;
export const WORD_CHAIN_MAX_ANSWER_LENGTH = 20;
export const WORD_CHAIN_MAX_NAME_LENGTH = 12;
