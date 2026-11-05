export type KinkuCard = {
  id: string;
  word: string;
  forbidden: readonly [string, string, string];
};

export const DEFAULT_TEAM_NAMES: readonly [string, string] = ['赤チーム', '青チーム'];

export const TURNS_PER_TEAM_OPTIONS = [2, 3, 4] as const;
export type TurnsPerTeam = (typeof TURNS_PER_TEAM_OPTIONS)[number];

export const TURN_SECONDS = 60;

export const KINKU_CARDS: readonly KinkuCard[] = [
  { id: 'coffee', word: 'コーヒー', forbidden: ['カフェイン', '茶色', '眠気'] },
  { id: 'meeting', word: '会議', forbidden: ['資料', 'ホワイトボード', '上司'] },
  { id: 'remote-work', word: 'テレワーク', forbidden: ['在宅', '画面', 'パジャマ'] },
  { id: 'business-card', word: '名刺', forbidden: ['交換', '肩書き', '紙'] },
  { id: 'printer', word: 'プリンター', forbidden: ['印刷', '紙詰まり', 'オフィス'] },
  { id: 'lunch-break', word: '昼休み', forbidden: ['弁当', '12時', 'リフレッシュ'] },
  { id: 'convenience-store', word: 'コンビニ', forbidden: ['レジ', 'おにぎり', '24時間'] },
  { id: 'overtime', word: '残業', forbidden: ['夜', '疲労', '定時'] },
  { id: 'paid-leave', word: '有給休暇', forbidden: ['休み', '申請', 'リフレッシュ'] },
  { id: 'boss', word: '上司', forbidden: ['指示', '偉い', '飲み会'] },
  { id: 'newcomer', word: '新入社員', forbidden: ['研修', '若い', '四月'] },
  { id: 'presentation', word: 'プレゼン', forbidden: ['スライド', '発表', '緊張'] },
  { id: 'email', word: 'メール', forbidden: ['件名', '送信', '未読'] },
  { id: 'chat', word: 'チャット', forbidden: ['通知', '短文', 'スタンプ'] },
  { id: 'team', word: 'チーム', forbidden: ['仲間', '協力', '目標'] },
  { id: 'deadline', word: '締め切り', forbidden: ['期限', '焦り', '提出'] },
  { id: 'budget', word: '予算', forbidden: ['お金', '計画', '承認'] },
  { id: 'sales', word: '営業', forbidden: ['顧客', '訪問', '売上'] },
  { id: 'client', word: '取引先', forbidden: ['会社', '名刺', '商談'] },
  { id: 'documents', word: '書類', forbidden: ['印鑑', '提出', '紙'] },
  { id: 'whiteboard', word: 'ホワイトボード', forbidden: ['ペン', '消す', '会議'] },
  { id: 'sticky-note', word: '付箋', forbidden: ['貼る', '色', 'メモ'] },
  { id: 'rush-hour', word: '満員電車', forbidden: ['通勤', '朝', '混雑'] },
  { id: 'business-trip', word: '出張', forbidden: ['新幹線', 'ホテル', '土産'] },
  { id: 'year-end-party', word: '忘年会', forbidden: ['飲み会', '年末', '乾杯'] },
  { id: 'welcome-party', word: '歓迎会', forbidden: ['新人', '居酒屋', '乾杯'] },
  { id: 'karaoke', word: 'カラオケ', forbidden: ['歌', 'マイク', '採点'] },
  { id: 'ramen', word: 'ラーメン', forbidden: ['麺', 'スープ', '行列'] },
  { id: 'sushi', word: '寿司', forbidden: ['酢飯', 'ネタ', '回転'] },
  { id: 'beer', word: 'ビール', forbidden: ['泡', '黄金', '乾杯'] },
  { id: 'snacks', word: 'お菓子', forbidden: ['甘い', '休憩', '配る'] },
  { id: 'hot-spring', word: '温泉', forbidden: ['湯', '旅館', 'タオル'] },
  { id: 'camping', word: 'キャンプ', forbidden: ['テント', '焚き火', '自然'] },
  { id: 'fireworks', word: '花火', forbidden: ['夏', '夜空', '音'] },
  { id: 'movie', word: '映画', forbidden: ['映画館', 'ポップコーン', '字幕'] },
  { id: 'cat', word: '猫', forbidden: ['鳴き声', 'ひげ', '爪'] },
  { id: 'dog', word: '犬', forbidden: ['散歩', 'しっぽ', '吠える'] },
  { id: 'gym', word: 'ジム', forbidden: ['筋肉', '汗', '運動'] },
  { id: 'diet', word: 'ダイエット', forbidden: ['体重', '食事制限', '運動'] },
  { id: 'travel', word: '旅行', forbidden: ['荷物', '観光', '写真'] },
  { id: 'passport', word: 'パスポート', forbidden: ['海外', '顔写真', '期限'] },
  { id: 'smartphone', word: 'スマートフォン', forbidden: ['画面', '充電', 'アプリ'] },
  { id: 'password', word: 'パスワード', forbidden: ['文字', '忘れる', 'ログイン'] },
  { id: 'wifi', word: '無線LAN', forbidden: ['電波', '接続', 'ルーター'] },
  { id: 'air-conditioner', word: 'エアコン', forbidden: ['冷房', 'リモート', '室外機'] },
  { id: 'umbrella', word: '傘', forbidden: ['雨', '折りたたみ', '忘れる'] },
  { id: 'cherry-blossom', word: '桜', forbidden: ['春', '花見', 'ピンク'] },
  { id: 'present', word: 'プレゼント', forbidden: ['包む', '誕生日', 'サプライズ'] },
];
