export type WordPair = {
  id: string;
  words: readonly [string, string];
};

export const PLAYER_COUNTS = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

export const TIMER_OPTIONS = [2, 3, 5] as const;
export type TimerMinutes = (typeof TIMER_OPTIONS)[number];

export function getMinorityCount(playerCount: number): number {
  return playerCount >= 7 ? 2 : 1;
}

export const WORD_PAIRS: readonly WordPair[] = [
  { id: 'meeting', words: ['会議', '打ち合わせ'] },
  { id: 'document', words: ['資料', 'スライド'] },
  { id: 'report', words: ['報告', '相談'] },
  { id: 'boss', words: ['上司', '先輩'] },
  { id: 'overtime', words: ['残業', '休日出勤'] },
  { id: 'paid-leave', words: ['有給休暇', '特別休暇'] },
  { id: 'business-trip', words: ['出張', '外回り'] },
  { id: 'business-card', words: ['名刺', '社員証'] },
  { id: 'email', words: ['メール', 'チャット'] },
  { id: 'phone', words: ['電話', 'オンライン会議'] },
  { id: 'coffee', words: ['コーヒー', '緑茶'] },
  { id: 'lunch', words: ['弁当', '社食'] },
  { id: 'convenience-store', words: ['コンビニ', '自販機'] },
  { id: 'commute', words: ['満員電車', '通勤バス'] },
  { id: 'commuter-pass', words: ['定期券', '交通系ICカード'] },
  { id: 'desk', words: ['デスク', '会議室'] },
  { id: 'sticky-note', words: ['付箋', 'ホワイトボード'] },
  { id: 'pen', words: ['ボールペン', 'シャープペンシル'] },
  { id: 'printing', words: ['印刷', 'コピー'] },
  { id: 'minutes', words: ['議事録', 'メモ'] },
  { id: 'target', words: ['目標', 'ノルマ'] },
  { id: 'review', words: ['評価面談', '1on1'] },
  { id: 'department', words: ['部署', 'チーム'] },
  { id: 'project', words: ['プロジェクト', 'タスク'] },
  { id: 'deadline', words: ['納期', '締め切り'] },
  { id: 'break', words: ['休憩', '昼休み'] },
  { id: 'welcome-party', words: ['歓迎会', '送別会'] },
  { id: 'year-end-party', words: ['忘年会', '新年会'] },
  { id: 'after-party', words: ['二次会', '三次会'] },
  { id: 'drinking-party', words: ['飲み会', '社内ランチ'] },
  { id: 'remote-work', words: ['テレワーク', '出社'] },
  { id: 'cloud', words: ['クラウド', 'サーバー'] },
  { id: 'password', words: ['パスワード', '暗証番号'] },
  { id: 'introduction', words: ['名刺交換', '自己紹介'] },
  { id: 'approval', words: ['稟議', '決裁'] },
  { id: 'expense', words: ['経費精算', '交通費申請'] },
  { id: 'hr', words: ['人事', '総務'] },
  { id: 'sales', words: ['営業', '企画'] },
  { id: 'newcomer', words: ['新入社員', 'インターン'] },
  { id: 'training', words: ['研修', '説明会'] },
  { id: 'payday', words: ['給料日', 'ボーナス日'] },
  { id: 'promotion', words: ['昇進', '転勤'] },
  { id: 'personnel-change', words: ['退職', '異動'] },
  { id: 'resume', words: ['履歴書', '職務経歴書'] },
  { id: 'interview', words: ['面接', '面談'] },
  { id: 'revenue', words: ['売上', '利益'] },
  { id: 'budget', words: ['予算', '見積書'] },
  { id: 'invoice', words: ['請求書', '領収書'] },
  { id: 'client', words: ['客先', '取引先'] },
  { id: 'complaint', words: ['クレーム', '問い合わせ'] },
];
