import {
  BoardSquare,
  CardKind,
  Effect,
  EventCardData,
  GameDecision,
  GameState,
  Grade,
  Item,
  ItemId,
  Job,
  LogEntry,
  LogKind,
  Outcome,
  SetupFormState,
  Stance,
  Tone,
} from '@/types/sugoroku';
import { audioManager } from '@/utils/audio';

// --- Master Data ---

export const BOARD_SIZE = 60;

export const JOBS: Job[] = [
  '営業',
  'エンジニア',
  'デザイナー',
  '企画・マーケティング',
  '人事・総務',
  '経理・財務',
  '法務・コンプラ',
  '広報・PR',
  '品質保証',
  '総合職',
];

export interface JobProfile {
  code: string;
  en: string;
  tagline: string;
  strength: string;
  accentColor: string;
  badgeBg: string;
  startCareer: number;
  startMoney: number;
  startItem: ItemId;
}

export const JOB_PROFILES: Record<Job, JobProfile> = {
  '営業': {
    code: 'SLS',
    en: 'SALES DIVISION',
    tagline: '人脈と胆力で数字を作る最前線',
    strength: '商談・接待・大型受注マスで大きく前進＆臨時インセンティブ獲得',
    accentColor: '#1d6fa5',
    badgeBg: 'bg-[#1d6fa5]',
    startCareer: 1,
    startMoney: 35,
    startItem: 'energy-drink',
  },
  'エンジニア': {
    code: 'ENG',
    en: 'SYSTEM ENGINEERING',
    tagline: '技術と論理で炎上案件を鎮火する',
    strength: '障害対応・サーバー・セキュリティ系マスを好機に変える',
    accentColor: '#2563eb',
    badgeBg: 'bg-[#2563eb]',
    startCareer: 1,
    startMoney: 40,
    startItem: 'energy-drink',
  },
  'デザイナー': {
    code: 'DSG',
    en: 'CREATIVE STUDIO',
    tagline: '感性と造形力でブランド価値を高める',
    strength: 'クリエイティブ・コンペマスで高速前進＆高評価を獲得',
    accentColor: '#b83253',
    badgeBg: 'bg-[#b83253]',
    startCareer: 1,
    startMoney: 30,
    startItem: 'paid-leave',
  },
  '企画・マーケティング': {
    code: 'MKT',
    en: 'MARKETING & PLAN',
    tagline: '市場を読み解き話題を仕掛ける参謀',
    strength: 'SNSバズ・新規企画マスで大きく前進＆評価ボーナス',
    accentColor: '#6d39b5',
    badgeBg: 'bg-[#6d39b5]',
    startCareer: 2,
    startMoney: 35,
    startItem: 'nemawashi',
  },
  '人事・総務': {
    code: 'HRG',
    en: 'HR & GENERAL AFFAIRS',
    tagline: '組織の秩序と採用を握る社内ハブ',
    strength: '研修・面接・評価面談・幹事マスでノーダメージ前進',
    accentColor: '#1f7a5c',
    badgeBg: 'bg-[#1f7a5c]',
    startCareer: 2,
    startMoney: 30,
    startItem: 'paid-leave',
  },
  '経理・財務': {
    code: 'FIN',
    en: 'FINANCE & ACCOUNTING',
    tagline: '1円の誤差も許さない金庫番',
    strength: '予算会議で優位に立ち、初期貯金と資産管理に強い',
    accentColor: '#b57c1e',
    badgeBg: 'bg-[#b57c1e]',
    startCareer: 1,
    startMoney: 55,
    startItem: 'energy-drink',
  },
  '法務・コンプラ': {
    code: 'LGL',
    en: 'LEGAL & COMPLIANCE',
    tagline: '契約と規程で企業の盾となる守護者',
    strength: '監査・リーガルチェックマスで評価と前進を同時獲得',
    accentColor: '#374151',
    badgeBg: 'bg-[#374151]',
    startCareer: 2,
    startMoney: 40,
    startItem: 'nemawashi',
  },
  '広報・PR': {
    code: 'PRC',
    en: 'PUBLIC RELATIONS',
    tagline: '世論とメディアを味方につけるスポークスマン',
    strength: 'メディア対応・記者発表マスで一気に出世コースへ躍進',
    accentColor: '#c2511f',
    badgeBg: 'bg-[#c2511f]',
    startCareer: 1,
    startMoney: 35,
    startItem: 'nemawashi',
  },
  '品質保証': {
    code: 'QAC',
    en: 'QUALITY ASSURANCE',
    tagline: '不具合を未然に封じる最後の砦',
    strength: '品質検査・監査マスで周囲が止まる中を着実に前進',
    accentColor: '#0e7490',
    badgeBg: 'bg-[#0e7490]',
    startCareer: 1,
    startMoney: 35,
    startItem: 'paid-leave',
  },
  '総合職': {
    code: 'GEN',
    en: 'GENERAL TRACK',
    tagline: 'あらゆる現場を渡り歩くオールラウンダー',
    strength: '初期から社内評価が高く、どの部署のイベントでも安定稼働',
    accentColor: '#7c3aed',
    badgeBg: 'bg-[#7c3aed]',
    startCareer: 3,
    startMoney: 40,
    startItem: 'nemawashi',
  },
};

export interface RankInfo {
  index: number;
  name: string;
  en: string;
  salaryBonus: number;
  requiredCareer: number;
  gatePosition: number;
}

export const RANKS: RankInfo[] = [
  { index: 0, name: '新入社員', en: 'TRAINEE', salaryBonus: 20, requiredCareer: 0, gatePosition: 0 },
  { index: 1, name: '一般社員', en: 'STAFF', salaryBonus: 28, requiredCareer: 2, gatePosition: 12 },
  { index: 2, name: '主任', en: 'SENIOR STAFF', salaryBonus: 36, requiredCareer: 5, gatePosition: 24 },
  { index: 3, name: '係長', en: 'SECTION CHIEF', salaryBonus: 46, requiredCareer: 8, gatePosition: 36 },
  { index: 4, name: '課長', en: 'MANAGER', salaryBonus: 60, requiredCareer: 12, gatePosition: 48 },
  { index: 5, name: '部長・役員待遇', en: 'DIRECTOR', salaryBonus: 80, requiredCareer: 16, gatePosition: 56 },
];

export interface FloorSection {
  id: number;
  floorCode: string;
  title: string;
  subtitle: string;
  range: [number, number];
  themeColor: string;
  gatePos?: number;
  gateRank?: string;
}

export const FLOORS: FloorSection[] = [
  {
    id: 1,
    floorCode: '1F',
    title: 'エントランス・新人研修棟',
    subtitle: '打刻と挨拶から始まる社畜の洗礼',
    range: [0, 9],
    themeColor: '#1f6f5c',
  },
  {
    id: 2,
    floorCode: '2F',
    title: '実務オペレーションフロア',
    subtitle: '鳴り止まない内線と定例会議の迷宮',
    range: [10, 19],
    themeColor: '#245d8c',
    gatePos: 12,
    gateRank: '一般社員',
  },
  {
    id: 3,
    floorCode: '3F',
    title: 'プロジェクト推進本部',
    subtitle: '仕様変更とキャリア面談の分岐点',
    range: [20, 29],
    themeColor: '#9c5a1a',
    gatePos: 24,
    gateRank: '主任',
  },
  {
    id: 4,
    floorCode: '4F',
    title: '中堅マネジメント統括室',
    subtitle: '月末締めとトラブル対応の激流',
    range: [30, 39],
    themeColor: '#8f2d22',
    gatePos: 36,
    gateRank: '係長',
  },
  {
    id: 5,
    floorCode: '5F',
    title: '経営企画・監査フロア',
    subtitle: '大型予算とコンプライアンス査定',
    range: [40, 49],
    themeColor: '#4c3875',
    gatePos: 48,
    gateRank: '課長',
  },
  {
    id: 6,
    floorCode: '6F',
    title: 'エグゼクティブ・役員フロア',
    subtitle: '最終プレゼンと運命のボーナス支給日',
    range: [50, 60],
    themeColor: '#8c6918',
    gatePos: 56,
    gateRank: '部長・役員待遇',
  },
];

export const ITEMS: Record<ItemId, Item> = {
  'energy-drink': {
    id: 'energy-drink',
    name: '高麗人参エナドリ',
    description: '次のサイコロ出目+2 ＆ やる気+10回復',
  },
  'paid-leave': {
    id: 'paid-leave',
    name: '承認済・有給休暇届',
    description: '休み状態を即座に全解除（通常時はやる気+25回復）',
  },
  'nemawashi': {
    id: 'nemawashi',
    name: '極秘の根回し資料',
    description: 'キーマンへの事前工作で社内評価+3 ＆ やる気+10回復',
  },
};

export const GAME_BOARD: BoardSquare[] = [
  {
    position: 0,
    type: 'start',
    title: '入社式・打刻ゲート',
    short: '入社式',
    description: '辞令を受け取りタイムカードを打刻。60マス先のボーナス支給日を目指せ。',
    tone: 'neutral',
  },
  {
    position: 1,
    type: 'event',
    title: '月曜朝の憂鬱',
    short: '月曜朝',
    description: '満員電車に揺られ、出社しただけでHPが削られる。やる気-15。',
    tone: 'bad',
    outcome: { text: '月曜日の重圧でやる気が15下がった…。', effect: { yaruki: -15 } },
  },
  {
    position: 2,
    type: 'event',
    title: '通勤電車の遅延証明',
    short: '電車遅延',
    description: 'ダッシュで始業1分前に滑り込みセーフ。しかしやる気-10。',
    tone: 'bad',
    outcome: { text: '朝から全力疾走してやる気が10下がった。', effect: { yaruki: -10 } },
  },
  {
    position: 3,
    type: 'item',
    title: '備品庫の隠し棚',
    short: '備品発見',
    description: '先代が残した高麗人参エナドリを発見した。',
    tone: 'good',
    outcome: {
      text: '「高麗人参エナドリ」を手に入れた！ここぞの場面で使おう。',
      effect: { item: 'energy-drink', yaruki: 5 },
    },
  },
  {
    position: 4,
    type: 'event',
    title: '退勤5分前の「ちょっといい？」',
    short: '呼び止め',
    description: '上司の一言で定時退社が消滅。2マス押し戻される。',
    tone: 'bad',
    outcome: {
      text: '「すぐ終わるから」が2時間コース。2マス戻る。',
      effect: { move: -2, yaruki: -5 },
    },
  },
  {
    position: 5,
    type: 'chance',
    title: '新人配属ガチャ',
    short: '配属抽選',
    description: '最初のタスク割り当て。当たり案件なら評価と前進を獲得！',
    tone: 'mixed',
    random: {
      chance: 0.65,
      hit: {
        text: '相性の良い案件を引き当てた！2マス進み、社内評価+2！',
        effect: { move: 2, career: 2, yaruki: 8 },
      },
      miss: {
        text: '誰もやりたがらない議事録係に任命された…やる気-8、評価+1。',
        effect: { yaruki: -8, career: 1 },
      },
    },
  },
  {
    position: 6,
    type: 'salary',
    title: '初任給支給日',
    short: '初任給',
    description: '待ちに待った給与振込！やる気が20回復し、貯金が増える。',
    tone: 'good',
    outcome: {
      text: '給与明細を確認！やる気+20、貯金+25万円！',
      effect: { yaruki: 20, money: 25 },
    },
  },
  {
    position: 7,
    type: 'chance',
    title: '社食・ランチガチャ',
    short: '昼食抽選',
    description: '本日の日替わり定食は当たりかハズレか？',
    tone: 'mixed',
    random: {
      chance: 0.7,
      hit: {
        text: '限定メニューの特上カツカレーに間に合った！やる気+15！',
        effect: { yaruki: 15 },
      },
      miss: {
        text: 'エレベーター渋滞で昼休みが15分しか残らなかった…やる気-6。',
        effect: { yaruki: -6 },
      },
    },
  },
  {
    position: 8,
    type: 'event',
    title: '作業PCが突然のブルースクリーン',
    short: 'PC凍結',
    description: '自動保存が効いていたが再起動で足止め。やる気-10、1マス戻る。',
    tone: 'bad',
    outcome: {
      text: '強制再起動で作業やり直し…やる気-10、1マス戻る。',
      effect: { move: -1, yaruki: -10 },
    },
  },
  {
    position: 9,
    type: 'job-specific',
    title: 'クライアントからの「なんか違う」',
    short: '仕様変更',
    description: '抽象的すぎる修正要望。デザイナーは2回休み、他は1回休み。',
    tone: 'bad',
    outcome: {
      text: '理不尽な手戻りが発生し、1回休み。',
      effect: { rest: 1, yaruki: -5 },
    },
    jobOutcomes: {
      'デザイナー': {
        text: '「もっとシュッとした感じで！」に絶望し、徹夜修正で2回休み（評価+2）。',
        effect: { rest: 2, career: 2, yaruki: -8 },
      },
    },
  },
  {
    position: 10,
    type: 'event',
    title: '月末の連日残業',
    short: '連続残業',
    description: '終電帰りが続き、疲労困憊。やる気-20、1回休み。',
    tone: 'bad',
    outcome: {
      text: '連日の深夜残業でダウン…やる気-20、1回休み（残業代+15万円）。',
      effect: { yaruki: -20, rest: 1, money: 15 },
    },
  },
  {
    position: 11,
    type: 'item',
    title: '優しい先輩からの差し入れ',
    short: '先輩支援',
    description: '「これ使いなよ」と承認済みの有給休暇届を託された。',
    tone: 'good',
    outcome: {
      text: '「承認済・有給休暇届」を手に入れた！',
      effect: { item: 'paid-leave', yaruki: 8 },
    },
  },
  {
    position: 12,
    type: 'job-specific',
    title: '基幹システム障害アラート',
    short: '障害発生',
    description: '社内チャットが騒然！エンジニアは腕の見せ所、他部署は混乱。',
    tone: 'mixed',
    outcome: {
      text: '業務ツールが使えず右往左往…やる気が10下がった。',
      effect: { yaruki: -10 },
    },
    jobOutcomes: {
      'エンジニア': {
        text: '迅速なロールバックで障害を鎮火！社内評価+3、やる気+15、2マス進む！',
        effect: { yaruki: 15, career: 3, move: 2 },
      },
    },
  },
  {
    position: 13,
    type: 'job-specific',
    title: '結論の出ない定例会議',
    short: '定例会議',
    description: 'アジェンダなき2時間会議。企画・マーケは資料作り直しで1回休み。',
    tone: 'bad',
    outcome: {
      text: '「で、ネクストアクションは？」のまま時間切れ。やる気-6。',
      effect: { yaruki: -6 },
    },
    jobOutcomes: {
      '企画・マーケティング': {
        text: '役員の鶴の一声で企画書を白紙から作り直し…1回休み（評価+1）。',
        effect: { rest: 1, career: 1 },
      },
    },
  },
  {
    position: 14,
    type: 'normal',
    title: '奇跡の定時退社',
    short: '定時退社',
    description: '外の空気がまだ明るい！心身ともにリフレッシュ。',
    tone: 'good',
    outcome: {
      text: '定時ダッシュ成功！やる気が12回復した！',
      effect: { yaruki: 12 },
    },
  },
  {
    position: 15,
    type: 'salary',
    title: '給与振込＆役職手当',
    short: '給料日',
    description: '今月も生き延びた証。やる気+20、給与支給！',
    tone: 'good',
    outcome: {
      text: '給料日！やる気+20、貯金+30万円！',
      effect: { yaruki: 20, money: 30 },
    },
  },
  {
    position: 16,
    type: 'job-specific',
    title: '競合コンペで大逆転勝利',
    short: 'コンペ勝',
    description: '大型コンペを勝ち抜いた！営業は5マス躍進、他も1マス前進。',
    tone: 'good',
    outcome: {
      text: '全社一丸でコンペ勝利！1マス進み、社内評価+1！',
      effect: { move: 1, career: 1, yaruki: 6 },
    },
    jobOutcomes: {
      '営業': {
        text: '渾身のプレゼンで競合を撃破！5マス進み、評価+3・報奨金+20万円！',
        effect: { move: 5, career: 3, money: 20, yaruki: 10 },
      },
    },
  },
  {
    position: 17,
    type: 'job-specific',
    title: '公式SNSキャンペーンがバズる',
    short: 'SNS拡散',
    description: 'トレンド1位を獲得！企画・マーケは5マス進む、他はやる気+10。',
    tone: 'good',
    outcome: {
      text: '自社の企画が話題になり誇らしい！やる気+10、評価+1！',
      effect: { yaruki: 10, career: 1 },
    },
    jobOutcomes: {
      '企画・マーケティング': {
        text: '仕掛けた施策が10万リポスト突破！5マス進み、社内評価+3！',
        effect: { move: 5, career: 3, yaruki: 12 },
      },
      '広報・PR': {
        text: 'メディアからの取材殺到を完璧に捌いた！3マス進み、評価+2！',
        effect: { move: 3, career: 2, yaruki: 10 },
      },
    },
  },
  {
    position: 18,
    type: 'job-specific',
    title: 'クリエイティブの天啓',
    short: '神デザイン',
    description: '革新的なUI/UX案が降りてきた！デザイナーは3マス進む。',
    tone: 'good',
    outcome: {
      text: '新プロダクトのモックアップが好評！やる気+8、評価+1。',
      effect: { yaruki: 8, career: 1 },
    },
    jobOutcomes: {
      'デザイナー': {
        text: '一発OKの神デザインが完成！3マス進み、社内評価+3！',
        effect: { move: 3, career: 3, yaruki: 10 },
      },
    },
  },
  {
    position: 19,
    type: 'job-specific',
    title: '本番環境だけで再現する謎バグ',
    short: '謎バグ',
    description: '「ローカルでは動くんですが…」エンジニアは原因調査で1回休み。',
    tone: 'bad',
    outcome: {
      text: '隣のエンジニアがログの海に沈んでいく…やる気-4。',
      effect: { yaruki: -4 },
    },
    jobOutcomes: {
      'エンジニア': {
        text: 'タイムゾーン起因のバグ特定に徹夜…1回休み（解決評価+2）。',
        effect: { rest: 1, career: 2 },
      },
    },
  },
  {
    position: 20,
    type: 'decision',
    title: '上期キャリア面談',
    short: 'キャリア面談',
    description: '部門長との1on1面談。今後のキャリア方針を決断せよ。',
    tone: 'neutral',
  },
  {
    position: 21,
    type: 'event',
    title: '部署決起集会・二次会',
    short: '決起飲み',
    description: '盛り上がったが深酒しすぎた。やる気+8・評価+1だが次ターンは1マス固定。',
    tone: 'mixed',
    outcome: {
      text: '本音トークで盛り上がりやる気+8・評価+1！ただし二日酔いで次ターンは1マス固定…。',
      effect: { yaruki: 8, career: 1, slow: true },
    },
  },
  {
    position: 22,
    type: 'event',
    title: '役員からの鶴の一声（ちゃぶ台返し）',
    short: '無茶振り',
    description: '「明日までに3パターン出して」やる気が22下がる。',
    tone: 'bad',
    outcome: {
      text: '理不尽なちゃぶ台返しでやる気が22下がった…。',
      effect: { yaruki: -22, career: 1 },
    },
  },
  {
    position: 23,
    type: 'item',
    title: '喫煙所・給湯室の極秘情報',
    short: '根回し入手',
    description: '社内のキーマンから「極秘の根回しメモ」をこっそり入手！',
    tone: 'good',
    outcome: {
      text: '「極秘の根回しメモ」を入手！使うと評価+2＆悪イベント1回バリア！',
      effect: { item: 'nemawashi', yaruki: 6 },
    },
  },
  {
    position: 24,
    type: 'item',
    title: '総務部の整理整頓ボーナス',
    short: '有給発見',
    description: '未消化だった「承認済・有給休暇届」を発掘した！',
    tone: 'good',
    outcome: {
      text: '「承認済・有給休暇届」を手に入れた！',
      effect: { item: 'paid-leave' },
    },
  },
  {
    position: 25,
    type: 'event',
    title: '大型プロジェクト無事リリース！',
    short: 'PJ完遂',
    description: '数ヶ月の苦労が報われた瞬間！3マス進み、評価+2！',
    tone: 'good',
    outcome: {
      text: 'プロジェクト完遂！大きな達成感で3マス進み、社内評価+2・やる気+10！',
      effect: { move: 3, career: 2, yaruki: 10 },
    },
  },
  {
    position: 26,
    type: 'job-specific',
    title: '部門横断タスクフォース招集',
    short: '横断TF',
    description: '部署間の橋渡し役。総合職は大きく輝き、他部署も1マス前進。',
    tone: 'good',
    outcome: {
      text: '他部署との連携がスムーズに進み、1マス前進＆評価+1！',
      effect: { move: 1, career: 1 },
    },
    jobOutcomes: {
      '総合職': {
        text: '総合職の調整力が炸裂！3マス進み、社内評価+3・やる気+10！',
        effect: { move: 3, career: 3, yaruki: 10 },
      },
    },
  },
  {
    position: 27,
    type: 'job-specific',
    title: '社内ネットワーク全面停止',
    short: '通信遮断',
    description: 'Wi-Fiも社内LANも沈黙。エンジニア以外は業務停止で2マス戻る。',
    tone: 'bad',
    outcome: {
      text: 'クラウドに繋げず仕事が完全ストップ！2マス戻る。',
      effect: { move: -2, yaruki: -6 },
    },
    jobOutcomes: {
      'エンジニア': {
        text: 'ルーター設定のバグを即座に特定し英雄扱いに！社内評価+3、やる気+8！',
        effect: { career: 3, yaruki: 8 },
      },
    },
  },
  {
    position: 28,
    type: 'job-specific',
    title: '重要取引先との高級料亭接待',
    short: '重要接待',
    description: '手土産と席次のマナー勝負。営業は好調、他は気疲れ。',
    tone: 'mixed',
    outcome: {
      text: '上座・下座とグラスの空き具合に神経をすり減らし、やる気-10（評価+1）。',
      effect: { yaruki: -10, career: 1 },
    },
    jobOutcomes: {
      '営業': {
        text: '会食で先方の懐に飛び込み大成功！やる気+15、社内評価+3、2マス進む！',
        effect: { yaruki: 15, career: 3, move: 2 },
      },
    },
  },
  {
    position: 29,
    type: 'job-specific',
    title: '全社スキルアップ研修',
    short: '社内研修',
    description: '人事・総務は講師として3マス進む。他職種もスキル向上。',
    tone: 'good',
    outcome: {
      text: '研修で実務ノウハウを習得！やる気+8、社内評価+1。',
      effect: { yaruki: 8, career: 1 },
    },
    jobOutcomes: {
      '人事・総務': {
        text: '研修設計と講師を完璧にこなし役員から高評価！3マス進み、評価+3！',
        effect: { move: 3, career: 3, yaruki: 10 },
      },
    },
  },
  {
    position: 30,
    type: 'decision',
    title: '中間査定・後半戦の立ち回り',
    short: '中間査定',
    description: '折り返し地点。大型案件のリーダーを引き受けるか、堅実に支えるか？',
    tone: 'neutral',
  },
  {
    position: 31,
    type: 'job-specific',
    title: '月末の請求・売上締め処理',
    short: '月末締め',
    description: '経理・財務は激務で2回休み（高評価）。営業は目標達成でやる気UP。',
    tone: 'mixed',
    outcome: {
      text: '月末の伝票処理に追われ、少し疲れた。やる気-5。',
      effect: { yaruki: -5 },
    },
    jobOutcomes: {
      '経理・財務': {
        text: '1円のズレも許さず全伝票を締め切った！2回休みだが社内評価+4・手当+20万円！',
        effect: { rest: 2, career: 4, money: 20 },
      },
      '営業': {
        text: '月末駆け込み受注でノルマ達成！やる気+15、評価+2、報奨金+15万円！',
        effect: { yaruki: 15, career: 2, money: 15 },
      },
    },
  },
  {
    position: 32,
    type: 'event',
    title: '健康診断の「要再検査」通知',
    short: '健康診断',
    description: '運動不足とカフェイン過剰を指摘されショック。やる気-12。',
    tone: 'bad',
    outcome: {
      text: '産業医から生活習慣を注意され、やる気-12…。',
      effect: { yaruki: -12 },
    },
  },
  {
    position: 33,
    type: 'job-specific',
    title: '中途採用の面接官を担当',
    short: '採用面接',
    description: '人事・総務は優秀人材を確保し大幅評価UP。他も1マス進む。',
    tone: 'good',
    outcome: {
      text: '候補者の熱意に触れて初心を思い出した！1マス進み、やる気+6。',
      effect: { move: 1, yaruki: 6 },
    },
    jobOutcomes: {
      '人事・総務': {
        text: '即戦力のエース人材を口説き落とした！やる気+18、社内評価+3、2マス進む！',
        effect: { yaruki: 18, career: 3, move: 2 },
      },
    },
  },
  {
    position: 34,
    type: 'job-specific',
    title: '領収書と経費精算の山',
    short: '経費精算',
    description: 'インボイス番号の確認地獄。経理・財務は1回休み、他はやる気-6。',
    tone: 'bad',
    outcome: {
      text: '差し戻された経費精算の修正でやる気-6。',
      effect: { yaruki: -6 },
    },
    jobOutcomes: {
      '経理・財務': {
        text: '全社員の仮払金を精査し1回休み（不正防止で社内評価+2）。',
        effect: { rest: 1, career: 2 },
      },
    },
  },
  {
    position: 35,
    type: 'salary',
    title: '中間賞与＆給与支給日',
    short: '給料日',
    description: '口座残高が増えて気力が蘇る！やる気+22、貯金+35万円！',
    tone: 'good',
    outcome: {
      text: '給与＆寸志が振り込まれた！やる気+22、貯金+35万円！',
      effect: { yaruki: 22, money: 35 },
    },
  },
  {
    position: 36,
    type: 'job-specific',
    title: '業界デザインアワード入賞',
    short: 'アワード賞',
    description: 'デザイナーは4マス快進撃！他職種もブランド価値向上で恩恵。',
    tone: 'good',
    outcome: {
      text: '自社製品がアワードを受賞し、やる気+8・評価+1！',
      effect: { yaruki: 8, career: 1 },
    },
    jobOutcomes: {
      'デザイナー': {
        text: '手掛けたブランディングが金賞受賞！4マス進み、評価+4・報奨金+25万円！',
        effect: { move: 4, career: 4, money: 25, yaruki: 12 },
      },
    },
  },
  {
    position: 37,
    type: 'job-specific',
    title: 'データセンター大規模障害',
    short: '大規模障害',
    description: 'エンジニアは不眠不休の復旧で2回休み（高評価）。他は2マス戻る。',
    tone: 'bad',
    outcome: {
      text: '社内システムが丸一日停止し、スケジュール遅延で2マス戻る。',
      effect: { move: -2, yaruki: -8 },
    },
    jobOutcomes: {
      'エンジニア': {
        text: '48時間の復旧作戦を完遂！2回休みとなるが社長から直々に評価+4・特別手当+25万円！',
        effect: { rest: 2, career: 4, money: 25 },
      },
    },
  },
  {
    position: 38,
    type: 'job-specific',
    title: '全社納会・忘年会の幹事任命',
    short: '幹事任命',
    description: '店選びから挨拶順まで地雷だらけ。人事・総務以外は2マス戻る。',
    tone: 'bad',
    outcome: {
      text: 'アレルギー対応と席次表の作り直しに奔走し、2マス戻る。',
      effect: { move: -2, yaruki: -6 },
    },
    jobOutcomes: {
      '人事・総務': {
        text: '熟練の幹事スキルで完璧に仕切った！2マス進み、社内評価+2！',
        effect: { move: 2, career: 2, yaruki: 8 },
      },
    },
  },
  {
    position: 39,
    type: 'item',
    title: 'バリスタ淹れたて珈琲ブレイク',
    short: '珈琲休憩',
    description: '束の間の静寂とカフェイン補給。エナドリも1本確保！',
    tone: 'good',
    outcome: {
      text: '香り高い珈琲でやる気+10！「高麗人参エナドリ」も手に入れた！',
      effect: { yaruki: 10, item: 'energy-drink' },
    },
  },
  {
    position: 40,
    type: 'job-specific',
    title: '来期予算策定会議',
    short: '予算会議',
    description: '経理・財務は主導権を握り3マス前進。企画・マーケは予算防衛に苦戦。',
    tone: 'mixed',
    outcome: {
      text: '各部署の予算折衝を見守り、社内評価+1。',
      effect: { career: 1 },
    },
    jobOutcomes: {
      '経理・財務': {
        text: '精緻な財務モデルで役員陣を唸らせた！3マス進み、社内評価+3！',
        effect: { move: 3, career: 3, yaruki: 10 },
      },
      '企画・マーケティング': {
        text: '広告予算の根拠資料の再提出を求められ、1回休み（評価+1）。',
        effect: { rest: 1, career: 1 },
      },
    },
  },
  {
    position: 41,
    type: 'job-specific',
    title: '年間最大級の超大型案件受注！',
    short: '大型受注',
    description: '営業は6マス大躍進！他職種も全社ボーナスムードで2マス進む。',
    tone: 'good',
    outcome: {
      text: '大型契約成立で社内が沸き立つ！2マス進み、評価+1・やる気+8！',
      effect: { move: 2, career: 1, yaruki: 8 },
    },
    jobOutcomes: {
      '営業': {
        text: '社運を賭けた大型契約を単独奪取！6マス進み、評価+4・特別インセンティブ+40万円！',
        effect: { move: 6, career: 4, money: 40, yaruki: 15 },
      },
    },
  },
  {
    position: 42,
    type: 'job-specific',
    title: '不審な添付ファイル・標的型メール訓練',
    short: '標的型訓練',
    description: 'うっかり開封で再受講！エンジニアと法務は無傷で高評価。',
    tone: 'bad',
    outcome: {
      text: '訓練メールのリンクを踏んでしまいセキュリティ講習で1回休み…。',
      effect: { rest: 1, yaruki: -6 },
    },
    jobOutcomes: {
      'エンジニア': {
        text: 'ヘッダー解析で訓練メールを即座に見抜きCSIRTへ報告！2マス進み、評価+2！',
        effect: { move: 2, career: 2, yaruki: 8 },
      },
      '法務・コンプラ': {
        text: '情報セキュリティ規程に基づき模範対応！2マス進み、評価+2！',
        effect: { move: 2, career: 2, yaruki: 8 },
      },
    },
  },
  {
    position: 43,
    type: 'decision',
    title: '金曜19時の緊急トラブルと退勤判断',
    short: '金曜の決断',
    description: '週末目前にトラブルの火種が発覚。今夜中に叩くか、週明けに回すか？',
    tone: 'neutral',
  },
  {
    position: 44,
    type: 'job-specific',
    title: '期末人事評価のすり合わせ会議',
    short: '評価会議',
    description: '人事・総務は2マス前進。他職種は査定への緊張でやる気-5。',
    tone: 'mixed',
    outcome: {
      text: '自己評価シートの提出で緊張…やる気-5、評価+1。',
      effect: { yaruki: -5, career: 1 },
    },
    jobOutcomes: {
      '人事・総務': {
        text: '全社の評価テーブルを公正に取りまとめた！2マス進み、社内評価+3！',
        effect: { move: 2, career: 3, yaruki: 8 },
      },
    },
  },
  {
    position: 45,
    type: 'salary',
    title: '昇給反映・特別給与支給日',
    short: '特別給与',
    description: 'これまでの実績が給与に反映！やる気+30、貯金大幅プラス！',
    tone: 'good',
    outcome: {
      text: '昇給分が乗った給与が振り込まれた！やる気+30、貯金+45万円！',
      effect: { yaruki: 30, money: 45 },
    },
  },
  {
    position: 46,
    type: 'job-specific',
    title: '年度末・本決算の監査対応',
    short: '本決算',
    description: '経理・財務は2回休み（評価大幅UP）。他は証憑提出で1マス戻る。',
    tone: 'bad',
    outcome: {
      text: '監査法人向けのエビデンス探しに追われ、1マス戻る。',
      effect: { move: -1, yaruki: -5 },
    },
    jobOutcomes: {
      '経理・財務': {
        text: '不眠不休で無限定適正意見を勝ち取った！2回休みだが社内評価+5・特別賞与+30万円！',
        effect: { rest: 2, career: 5, money: 30 },
      },
    },
  },
  {
    position: 47,
    type: 'job-specific',
    title: 'コンプライアンス・法務監査',
    short: '法務監査',
    description: '契約書リーガルチェック。法務・コンプラは4マス躍進！',
    tone: 'mixed',
    outcome: {
      text: '契約書雛形の改定対応でやる気-5、社内評価+1。',
      effect: { yaruki: -5, career: 1 },
    },
    jobOutcomes: {
      '法務・コンプラ': {
        text: '重大な契約リスクを未然に阻止し役員から絶賛！4マス進み、社内評価+4！',
        effect: { move: 4, career: 4, yaruki: 12 },
      },
    },
  },
  {
    position: 48,
    type: 'job-specific',
    title: '緊急記者会見・メディア取材対応',
    short: 'メディア対応',
    description: '広報・PRは4マス進む！他職種は想定問答の準備でやる気-5。',
    tone: 'mixed',
    outcome: {
      text: '取材用のファクト確認に追われ、やる気-5・評価+1。',
      effect: { yaruki: -5, career: 1 },
    },
    jobOutcomes: {
      '広報・PR': {
        text: '完璧なメディアトレーニングと会見進行で好感度急上昇！4マス進み、評価+4！',
        effect: { move: 4, career: 4, yaruki: 15 },
      },
    },
  },
  {
    position: 49,
    type: 'job-specific',
    title: '出荷直前の最終品質ゲート検査',
    short: '品質検査',
    description: '品質保証は3マス前進！他職種はチェックリスト消化で1回休み。',
    tone: 'mixed',
    outcome: {
      text: '出荷前の全件チェックリスト確認で1回休み（評価+1）。',
      effect: { rest: 1, career: 1 },
    },
    jobOutcomes: {
      '品質保証': {
        text: '致命的なエッジケース不具合を出荷寸前で阻止！3マス進み、社内評価+4！',
        effect: { move: 3, career: 4, yaruki: 12 },
      },
    },
  },
  {
    position: 50,
    type: 'event',
    title: '宛先CCミスでヒヤリハット',
    short: '誤送信寸前',
    description: '送信取り消し機能に救われたが冷や汗が止まらない。やる気-8。',
    tone: 'bad',
    outcome: {
      text: '送信後30秒ルールで間一髪キャンセル成功…寿命が縮みやる気-8。',
      effect: { yaruki: -8 },
    },
  },
  {
    position: 51,
    type: 'normal',
    title: '役員秘書の特選スイーツ差し入れ',
    short: '特選甘味',
    description: '老舗和菓子店の差し入れで脳に糖分が染み渡る。',
    tone: 'good',
    outcome: {
      text: '高級どら焼きでリフレッシュ！やる気+14！',
      effect: { yaruki: 14 },
    },
  },
  {
    position: 52,
    type: 'decision',
    title: '海外支社・グローバル案件の打診',
    short: '海外案件',
    description: '最終章のビッグチャンス。リスクを取って一気に駆け上がるか？',
    tone: 'neutral',
  },
  {
    position: 53,
    type: 'event',
    title: 'リフレッシュルームで戦略的仮眠',
    short: '戦略仮眠',
    description: '15分のパワーナップで頭脳がクリアに冴え渡る。やる気+15！',
    tone: 'good',
    outcome: {
      text: '仮眠で集中力が完全復活！やる気が15回復した！',
      effect: { yaruki: 15 },
    },
  },
  {
    position: 54,
    type: 'event',
    title: '役員会議直前の複合機紙詰まり',
    short: '紙詰まり',
    description: 'なぜ急いでいる時だけトナー切れと紙詰まりが同時に起きるのか。1マス戻る。',
    tone: 'bad',
    outcome: {
      text: 'ローラーの奥に詰まったA3用紙と格闘し、1マス戻る。',
      effect: { move: -1, yaruki: -6 },
    },
  },
  {
    position: 55,
    type: 'salary',
    title: '期末特別ボーナス仮査定',
    short: '査定確定',
    description: 'ゴール目前の査定通知！やる気+20、貯金+40万円！',
    tone: 'good',
    outcome: {
      text: '高査定が内定！やる気+20、貯金+40万円！',
      effect: { yaruki: 20, money: 40, career: 1 },
    },
  },
  {
    position: 56,
    type: 'chance',
    title: '次期人事の極秘リーク情報',
    short: '人事の噂',
    description: '給湯室で囁かれる次期体制の噂。自分の名前は吉と出るか凶と出るか？',
    tone: 'mixed',
    random: {
      chance: 0.6,
      hit: {
        text: '「次期エース候補」として名前が挙がっているらしい！やる気+15、評価+2！',
        effect: { yaruki: 15, career: 2 },
      },
      miss: {
        text: '来期さらにハードな部署へ異動という噂を聞き、やる気-10…。',
        effect: { yaruki: -10 },
      },
    },
  },
  {
    position: 57,
    type: 'event',
    title: '全社MVP・社長賞ノミネート！',
    short: '社長賞受賞',
    description: 'これまでの奮闘が称えられ壇上で表彰！3マス進み、評価+3！',
    tone: 'good',
    outcome: {
      text: '社長賞を受賞！金一封+30万円＆評価+3、さらにゴールへ3マス進む！',
      effect: { move: 3, career: 3, money: 30, yaruki: 15 },
    },
  },
  {
    position: 58,
    type: 'event',
    title: 'オフィス移転・期末大掃除',
    short: '期末大掃除',
    description: 'キャビネットの裏から10年前の書類束が…ぎっくり腰で1回休み。',
    tone: 'bad',
    outcome: {
      text: '段ボール運びで腰を痛め、ゴール目前で1回休み…。',
      effect: { rest: 1, yaruki: -6 },
    },
  },
  {
    position: 59,
    type: 'event',
    title: '経営陣への最終成果プレゼン',
    short: '最終発表',
    description: 'ラストスパート！渾身のプレゼンでやる気+12、社内評価+2！',
    tone: 'good',
    outcome: {
      text: '最終プレゼンを堂々と完遂！やる気+12、社内評価+2！',
      effect: { yaruki: 12, career: 2 },
    },
  },
  {
    position: 60,
    type: 'goal',
    title: '決算ボーナス支給日・ゴール！',
    short: 'GOAL',
    description: '激動のキャリアコースを完走！最終査定とエンディングが確定する。',
    tone: 'good',
    outcome: {
      text: '祝・完走！決算ボーナスが支給され、あなたの社畜キャリアが確定しました！',
      effect: { money: 50 },
    },
  },
];

export const DECISIONS: Record<string, GameDecision> = {
  'career-talk': {
    id: 'career-talk',
    title: '上期キャリア面談（1on1）',
    description: '部門長から「今期、どのくらい上を目指すつもり？」と問われた。あなたの回答は？',
    options: [
      {
        id: 'aim-promotion',
        label: '最速での昇進・抜擢を狙う',
        flavor: '高評価を得るがプレッシャーで消耗',
        effect: { career: 3, yaruki: -12, money: 10 },
        resultMessage: '昇進への強い覚悟を示し、重要ミッションを任された！社内評価+3、手当+10万円（やる気-12）。',
      },
      {
        id: 'keep-pace',
        label: 'ワークライフバランス重視で堅実に',
        flavor: '心身の余裕を保ちつつ着実に評価確保',
        effect: { career: 1, yaruki: 10 },
        resultMessage: '無理のないペース配分を合意。やる気が10回復し、評価も+1上がった。',
      },
      {
        id: 'pitch-new-biz',
        label: '温めていた新規事業案を直談判する',
        flavor: '成功率65%の勝負手！通れば大躍進',
        effect: { career: 5, move: 3, yaruki: 5, money: 20 },
        resultMessage: '新規事業ピッチに部門長が感銘！評価+5、予算+20万円、さらに3マス前進！',
        risk: {
          chance: 0.65,
          fail: { career: 1, yaruki: -15 },
          failMessage: '「まず本業の数字を作ってから」と却下された…やる気-15（挑戦評価+1）。',
        },
      },
    ],
  },
  'midpoint-choice': {
    id: 'midpoint-choice',
    title: '中間査定・炎上案件のリーダー指名',
    description: '折り返し地点で他部署の大型案件が難航中。火中の栗を拾うか、自部署を守るか？',
    options: [
      {
        id: 'lead-project',
        label: 'プロジェクトリーダーとして火消しに参戦',
        flavor: '激務と引き換えに圧倒的な社内評価を獲得',
        effect: { career: 4, yaruki: -15, money: 25 },
        resultMessage: '炎上案件のPMを引き受け見事に立て直した！社内評価+4、特別手当+25万円（やる気-15）。',
      },
      {
        id: 'support-team',
        label: '自部署の後方支援・品質維持に徹する',
        flavor: '安定した貢献でチームからの信頼とやる気を確保',
        effect: { career: 2, yaruki: 8 },
        resultMessage: '縁の下の力持ちとして現場を支えた。社内評価+2、やる気+8回復！',
      },
      {
        id: 'automate-workflow',
        label: '業務自動化ツールを突貫構築して一挙解決を狙う',
        flavor: '成功率60%！成功すれば3マス前進＆高評価',
        effect: { career: 4, move: 3, yaruki: 5 },
        resultMessage: '自動化スクリプトが見事にハマり工数80%削減！評価+4、3マス前進！',
        risk: {
          chance: 0.6,
          fail: { yaruki: -12, rest: 1 },
          failMessage: '自動化ツールのバグ対応で逆に徹夜する羽目に…やる気-12、1回休み。',
        },
      },
    ],
  },
  'evening-choice': {
    id: 'evening-choice',
    title: '金曜19時の緊急トラブルと退勤判断',
    description: '退勤直前に週明け納品データの不整合が発覚。今夜どう動く？',
    options: [
      {
        id: 'finish-early',
        label: '月曜朝の自分に託して定時で帰る',
        flavor: '評価は少し下がるが心身は大きくリフレッシュ',
        effect: { career: -1, yaruki: 16 },
        resultMessage: '思い切ってPCを閉じ週末を満喫！評価は-1だが、やる気が16回復した！',
      },
      {
        id: 'one-more-task',
        label: '居残りで今夜中に原因を潰し切る',
        flavor: 'やる気を削って確実な信頼と残業代を得る',
        effect: { career: 3, yaruki: -10, money: 15 },
        resultMessage: '金曜夜に問題を完全解決！週明けの惨事を防ぎ、社内評価+3・残業代+15万円（やる気-10）。',
      },
      {
        id: 'delegate-nemawashi',
        label: '関係部署を巻き込み分担して1時間で片付ける',
        flavor: '成功率70%の調整プレイ！成功で前進＆高評価',
        effect: { career: 3, move: 2, yaruki: 4 },
        resultMessage: '見事なタスク分担で1時間で鎮火！社内評価+3、2マス進み気持ちよく週末へ！',
        risk: {
          chance: 0.7,
          fail: { career: 0, yaruki: -14 },
          failMessage: '他部署との押し付け合いになり気疲れだけが残った…やる気-14。',
        },
      },
    ],
  },
  'global-mission': {
    id: 'global-mission',
    title: '海外支社・グローバル提携プロジェクト',
    description: '最終章の特命ミッション。時差のある海外拠点との交渉役をどう乗り切る？',
    options: [
      {
        id: 'fly-overseas',
        label: '現地へ弾丸出張して直接交渉をまとめる',
        flavor: '体力は使うが大きく前進＆高評価',
        effect: { career: 4, move: 3, yaruki: -12, money: 30 },
        resultMessage: '弾丸出張で現地トップと直接合意！3マス進み、評価+4・出張手当+30万円（やる気-12）！',
      },
      {
        id: 'remote-coord',
        label: 'オンライン会議と非同期ドキュメントで堅実に進める',
        flavor: '消耗を抑えて着実に前進',
        effect: { career: 2, move: 1, yaruki: 6 },
        resultMessage: 'スマートな非同期進行で時差ストレスを回避！1マス進み、評価+2・やる気+6！',
      },
    ],
  },
};

const SQUARE_DECISION_MAP: Record<number, string> = {
  20: 'career-talk',
  30: 'midpoint-choice',
  43: 'evening-choice',
  52: 'global-mission',
};

// --- Achievements & Endings ---

export const ACHIEVEMENTS: Record<string, { name: string; description: string }> = {
  'super-fast': { name: '超高速PDCA', description: '12ターン以内にゴールする。' },
  'no-rest': { name: '皆勤賞の鉄人', description: '一度も休まずにゴールする。' },
  'monday-hater': { name: '月曜撲滅委員会', description: '「月曜朝の憂鬱」マスに2回以上止まる。' },
  'yaruki-master': { name: 'メンタル鋼鉄王', description: 'やる気90以上でゴールする。' },
  'yaruki-zero': { name: '不死鳥の復職', description: 'やる気ゼロの危機から立ち直って完走する。' },
  'career-master': { name: '出世街道の覇者', description: '社内評価12以上でゴールする。' },
  'decision-3': { name: '決断の連続', description: '決断イベントを3回以上乗り越える。' },
  'millionaire': { name: '社内資産家', description: '貯金200万円以上でゴールする。' },
  'teiji-pro': { name: '定時退社の美学', description: '残業スタンスを一度も使わずにゴールする。' },
  'zangyo-warrior': { name: '深夜の戦士', description: '残業スタンスを5回以上選んでゴールする。' },
};

export const ACHIEVEMENT_LIST = ACHIEVEMENTS;

export const ENDINGS = {
  legendary: {
    title: '伝説の社員',
    description: '圧倒的なスピード・高評価・満ち溢れる気力で完走。会社の歴史に名を刻む生ける伝説となった。',
  },
  executive: {
    title: '最年少執行役員',
    description: '数々の決断と修羅場を勝ち抜き、高い社内評価を獲得して経営の中枢へと登り詰めた。',
  },
  promotion: {
    title: '異例の抜擢昇進',
    description: '周囲を唸らせる成果とスピード感で、次期部門長として抜擢昇進を果たした。',
  },
  mentor: {
    title: '信頼のメンター社員',
    description: '後輩からの人望も厚く、実力と余裕を兼ね備えた社内の精神的支柱として活躍した。',
  },
  specialist: {
    title: '孤高のスペシャリスト',
    description: '専門領域のスキルを極限まで磨き上げ、替えの利かないプロフェッショナルとして君臨した。',
  },
  innovator: {
    title: '社内イノベーター',
    description: '既存の枠組みにとらわれない発想と突破力で、会社の古い体質に風穴を開けた。',
  },
  ace: {
    title: '絶対的営業エース',
    description: '驚異的な受注記録を打ち立て、全社総会でスタンディングオベーションを浴びた。',
  },
  creator: {
    title: 'チーフ・クリエイティブ・オフィサー',
    description: '妥協なきクリエイティブで業界の賞を総なめにし、ブランドの顔を創り上げた。',
  },
  leader: {
    title: '名プロジェクトリーダー',
    description: '数々の難関プロジェクトを完遂に導き、誰もが一緒に働きたいと願うリーダーとなった。',
  },
  stable: {
    title: '安定感抜群の優良社員',
    description: '大きな破綻なく、心身の健康と確かな成果を両立させる理想的なキャリアを築いた。',
  },
  balanced: {
    title: 'ワークライフバランスの達人',
    description: '定時退社と成果のメリハリを極め、仕事も趣味も全力で楽しむ社会人ライフを実現した。',
  },
  diligent: {
    title: '誠実なる実務家',
    description: '目の前の業務に真摯に向き合い続け、あらゆる部署から厚い信頼を寄せられる存在となった。',
  },
  'team-player': {
    title: '最高のチームプレイヤー',
    description: '部署間の調整や仲間のフォローで力を発揮し、組織の潤滑油として欠かせない存在になった。',
  },
  steady: {
    title: '堅実なキャリアビルダー',
    description: '浮き沈みの激しい職場で着実に実績と貯金を積み上げ、盤石の生活基盤を築いた。',
  },
  consistent: {
    title: 'ブレない仕事人',
    description: '周囲の喧騒に惑わされず一定のペースで成果を出し続け、着実にボーナスを手にした。',
  },
  reliable: {
    title: '困った時の頼れる相棒',
    description: 'トラブルが起きても動じない落ち着きで、現場を支える頼もしい中堅社員となった。',
  },
  average: {
    title: '平均的サラリーマン',
    description: '山あり谷ありの社畜ライフを乗り切り、無事にボーナス支給日へとたどり着いた。',
  },
  survivor: {
    title: '修羅場サバイバー',
    description: '幾度もの炎上と疲労の波をくぐり抜け、しぶとく生き残ってボーナスを掴み取った。',
  },
  mediocre: {
    title: '省エネ処世術師',
    description: '目立ちすぎず怒られすぎず、最小限のエネルギー消費で会社を泳ぎ切った。',
  },
  routine: {
    title: 'ルーティンマイスター',
    description: '決められた定型業務を淡々と正確に処理し、静かなる日常を守り抜いた。',
  },
  ordinary: {
    title: '等身大の会社員',
    description: '特別大きな野心はなくとも、今日という一日を無事に終えて家路についた。',
  },
  burnout: {
    title: '燃え尽き症候群（休職療養）',
    description: '過度なプレッシャーと疲労が限界を突破。まずはスマホの通知を切ってゆっくり休もう。',
  },
  dropout: {
    title: 'キャリア迷子',
    description: '終わらない手戻りと会議の迷宮で方向感覚を失い、長期戦の末にヘトヘトで到着した。',
  },
  overwork: {
    title: '過労ドクターストップ',
    description: '休むことなく走り続けた結果、産業医から強制休養を命じられた。命あっての仕事だ。',
  },
  'mental-break': {
    title: 'コンプラ疲れの限界',
    description: '社内外の板挟みと規程チェックに神経をすり減らし、静かな環境を求めるようになった。',
  },
  'stress-victim': {
    title: '品質ゲートの番人疲れ',
    description: '終わりなきバグ票と仕様変更の波に揉まれ、心身ともにギリギリの状態となった。',
  },
  exhausted: {
    title: '完全消耗・有給消化へ',
    description: 'ゴールテープを切った瞬間にその場へ大の字。貯まった有給をすべて使って旅に出よう。',
  },
  breakdown: {
    title: 'メンタル臨界点突破',
    description: '何度も気力が底を突きながらも執念で進んだが、長期のリフレッシュが必要な状態だ。',
  },
  resignation: {
    title: '退職届を胸ポケットに',
    description: 'ボーナス支給日の翌日、清々しい表情で白い封筒をデスクに置く決意を固めた。',
  },
  collapse: {
    title: 'スケジュール崩壊の果て',
    description: '度重なるトラブルで計画が大幅に遅延。ボロボロになりながらもなんとか期末を終えた。',
  },
  defeat: {
    title: 'ほろ苦い査定通知',
    description: '思うように評価や気力が伸びず、来期への課題が残るほろ苦いボーナス支給日となった。',
  },
  freelance: {
    title: '独立・フリーランス転身',
    description: '会社組織の理不尽に見切りをつけ、培った技術一本で自由に働く道へと踏み出した。',
  },
  entrepreneur: {
    title: 'スタートアップ起業家',
    description: '社内で通らなかった企画を自らの手で実現するため、仲間と共に新会社を立ち上げた。',
  },
  global: {
    title: '海外ノマド移住',
    description: '日本の満員電車と残業文化に別れを告げ、海辺の街からリモートで働く人生を選んだ。',
  },
  investor: {
    title: 'FIRE・個人投資家への道',
    description: '給料とボーナスを堅実に運用し、会社の給与に依存しない資産基盤を築き上げた。',
  },
  influencer: {
    title: 'ビジネス系インフルエンサー',
    description: '社畜生活のリアルを発信したアカウントが大バズりし、本業を超える収益源となった。',
  },
  farmer: {
    title: '晴耕雨読のスローライフ',
    description: '都会のビル群と通知音から離れ、土と向き合いながら自分のペースで生きる道を選んだ。',
  },
  writer: {
    title: 'ベストセラー『社畜黙示録』著者',
    description: '社内の人間模様と哀愁を綴ったエッセイが出版され、印税で悠々自適な生活へ転身した。',
  },
};

const ACHIEVEMENT_STORAGE_KEY = 'shachiku-sugoroku-achievements';

const loadAchievementsFromStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};

const saveAchievementsToStorage = (achievements: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(achievements));
  } catch {
    /* ignore storage error */
  }
};

// --- Initial State ---

export const INITIAL_GAME_STATE: GameState = {
  playerName: '',
  job: '営業',
  position: 0,
  yaruki: 100,
  career: 1,
  money: 35,
  rank: 0,
  items: [],
  turn: 0,
  status: 'playing',
  isFinished: false,
  gameMessage: 'ゲームを開始してください。',

  isResting: 0,
  strikes: 0,
  pendingMoves: 0,
  ignoreNextEvent: false,
  diceBoost: 0,
  slowNextTurn: false,
  lastRoll: [],
  lastStance: null,

  cards: [],
  pendingDecision: null,
  usedDecisions: [],
  gatesPassed: [],
  lastGate: null,

  path: [0],
  landedOnCounts: { 0: 1 },
  restCount: 0,
  zangyoCount: 0,
  teijiCount: 0,
  decisionHistory: [],
  log: [],
  seq: 1,

  ending: null,
  score: 0,
  grade: null,
  unlockedAchievements: [],
  newlyUnlockedAchievements: [],
};

// --- Helper Functions ---

function pushLog(
  state: GameState,
  kind: LogKind,
  title: string,
  text: string,
  tone: Tone,
  effect?: Effect,
): GameState {
  const id = (state.seq || 1) + 1;
  const entry: LogEntry = {
    id,
    turn: state.turn,
    kind,
    title,
    text,
    tone,
    effect,
  };
  return {
    ...state,
    seq: id,
    log: [entry, ...(state.log || [])].slice(0, 40),
  };
}

function pushCard(
  state: GameState,
  kind: CardKind,
  squarePosition: number,
  squareType: BoardSquare['type'],
  title: string,
  text: string,
  tone: Tone,
  effect: Effect,
): GameState {
  const id = (state.seq || 1) + 1;
  const card: EventCardData = {
    id,
    kind,
    squarePosition,
    squareType,
    title,
    text,
    tone,
    effect,
  };
  return {
    ...state,
    seq: id,
    cards: [...(state.cards || []), card],
  };
}

export function getRestCount(state: GameState): number {
  return state.restCount ?? state.landedOnCounts?.[-1] ?? 0;
}

export function getYarukiZeroCount(state: GameState): number {
  return state.strikes ?? state.landedOnCounts?.[-2] ?? 0;
}

export function createNewGame(formState: SetupFormState): GameState {
  const savedAchievements = loadAchievementsFromStorage();
  const name = formState.name.trim().slice(0, 20) || '名無しの社畜';
  const profile = JOB_PROFILES[formState.job] ?? JOB_PROFILES['営業'];
  const initialItem = ITEMS[profile.startItem];

  const base: GameState = {
    ...INITIAL_GAME_STATE,
    playerName: name,
    job: formState.job,
    career: profile.startCareer,
    money: profile.startMoney,
    rank: 0,
    items: initialItem ? [{ ...initialItem }] : [],
    gameMessage: `${name}（${formState.job}）が出社打刻完了。60マス先の決算ボーナス支給日を目指そう！`,
    unlockedAchievements: savedAchievements,
    newlyUnlockedAchievements: [],
    path: [0],
    landedOnCounts: { 0: 1 },
    cards: [],
    log: [],
    seq: 1,
  };

  return pushLog(
    base,
    'start',
    '入社・出社打刻完了',
    `${name}（${formState.job}）のキャリアが始まった。初期評価${profile.startCareer}・初期貯金${profile.startMoney}万円・支給品「${initialItem.name}」。`,
    'good',
  );
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function recordLanding(state: GameState, position: number): GameState {
  const counts = { ...(state.landedOnCounts || {}) };
  counts[position] = (counts[position] || 0) + 1;
  return {
    ...state,
    path: [...(state.path || []), position],
    landedOnCounts: counts,
  };
}

function handleBurnoutCheck(state: GameState): GameState {
  if (state.yaruki > 0) return state;

  const nextStrikes = (state.strikes || 0) + 1;
  const counts = { ...(state.landedOnCounts || {}) };
  counts[-2] = (counts[-2] || 0) + 1;

  let next: GameState = {
    ...state,
    strikes: nextStrikes,
    landedOnCounts: counts,
  };

  if (nextStrikes >= 3) {
    next.yaruki = 0;
    next.pendingMoves = 0;
    next.status = 'gameover';
    next.gameMessage = `${state.gameMessage}\n【産業医ストップ】3度目のメンタル限界に達し、強制休職となりました…。`;
    next = pushLog(
      next,
      'burnout',
      '3度目の限界突破・強制休職',
      'やる気が3回ゼロになり、産業医から強制休養を命じられた。',
      'bad',
    );
    next = pushCard(
      next,
      'gameover',
      next.position,
      'event',
      '産業医ストップ（強制休職）',
      'やる気が3度目のゼロに到達しました。心身の安全のため、これ以上の出근はストップとなります。',
      'bad',
      { yaruki: 0 },
    );
    next = checkEndGame(next);
    return next;
  }

  next.yaruki = 25;
  next.isResting = (next.isResting || 0) + 1;
  next.gameMessage = `${state.gameMessage}\n【メンタル枯渇 (${nextStrikes}/3)】やる気が底を突き1回休み（気力25で復帰）。`;
  next = pushLog(
    next,
    'burnout',
    `メンタル枯渇 (${nextStrikes}/3)`,
    'やる気がゼロになり1回休み。気力25まで応急回復した。あと' + (3 - nextStrikes) + '回倒れると強制休職！',
    'bad',
    { rest: 1, yaruki: 25 },
  );
  next = pushCard(
    next,
    'burnout',
    next.position,
    'event',
    `メンタル枯渇 (${nextStrikes} / 3回目)`,
    `やる気がゼロになり、1回休みが発生しました（やる気25まで応急回復）。3回倒れると強制休職になるため注意してください！`,
    'bad',
    { rest: 1 },
  );
  return next;
}

/** アイテム使用 */
export function consumeItem(currentState: GameState, itemId: ItemId | string): GameState {
  const idx = currentState.items.findIndex((i) => i.id === itemId);
  if (idx < 0) return currentState;

  const item = currentState.items[idx];
  const nextItems = [...currentState.items];
  nextItems.splice(idx, 1);

  let next: GameState = {
    ...currentState,
    items: nextItems,
  };

  if (itemId === 'energy-drink') {
    const boost = 2;
    next.diceBoost = (next.diceBoost || 0) + boost;
    next.yaruki = Math.min(100, next.yaruki + 10);
    next.gameMessage = `「${item.name}」を投入！やる気+10回復＆次のダイス出目+${boost}！`;
    next = pushLog(
      next,
      'item',
      `${item.name}を使用`,
      `やる気+10回復、次のサイコロ出目+${boost}ブースト！`,
      'good',
      { yaruki: 10, move: boost },
    );
  } else if (itemId === 'paid-leave') {
    if (next.isResting > 0 || next.slowNextTurn) {
      const clearedRest = next.isResting;
      next.isResting = 0;
      next.slowNextTurn = false;
      next.yaruki = Math.min(100, next.yaruki + 15);
      next.gameMessage = `「${item.name}」を提出！休み状態（${clearedRest}ターン）と二日酔いを全解除＆やる気+15！`;
      next = pushLog(
        next,
        'item',
        `${item.name}で即時復帰`,
        `休み状態をすべて解除し、やる気が15回復した！`,
        'good',
        { yaruki: 15 },
      );
    } else {
      next.yaruki = Math.min(100, next.yaruki + 25);
      next.gameMessage = `「${item.name}」で計画年休を取得！やる気が25回復！`;
      next = pushLog(
        next,
        'item',
        `${item.name}でリフレッシュ`,
        `計画有給で心身を休め、やる気が25回復した！`,
        'good',
        { yaruki: 25 },
      );
    }
  } else if (itemId === 'nemawashi') {
    next.career = (next.career || 0) + 3;
    next.yaruki = Math.min(100, next.yaruki + 10);
    next.gameMessage = `「${item.name}」を発動！役員室への事前工作で社内評価+3 ＆ やる気+10回復！`;
    next = pushLog(
      next,
      'item',
      `${item.name}で事前工作`,
      `キーマンへの根回し完了！社内評価+3、やる気+10回復！`,
      'good',
      { career: 3, yaruki: 10 },
    );
  } else {
    next.gameMessage = `${item.name}を使った。`;
  }

  return next;
}

function applyEffectValues(state: GameState, effect: Effect): GameState {
  const next = { ...state };
  if (typeof effect.yaruki === 'number') {
    next.yaruki = Math.max(0, Math.min(100, next.yaruki + effect.yaruki));
  }
  if (typeof effect.career === 'number') {
    next.career = Math.max(0, (next.career || 0) + effect.career);
  }
  if (typeof effect.money === 'number') {
    next.money = Math.max(0, (next.money || 0) + effect.money);
  }
  if (typeof effect.rest === 'number' && effect.rest > 0) {
    next.isResting = (next.isResting || 0) + effect.rest;
  }
  if (typeof effect.move === 'number' && effect.move !== 0) {
    next.pendingMoves = (next.pendingMoves || 0) + effect.move;
  }
  if (effect.item && ITEMS[effect.item]) {
    next.items = [...next.items, { ...ITEMS[effect.item] }];
  }
  if (effect.slow) {
    next.slowNextTurn = true;
  }
  return next;
}

export function resolveDecision(
  currentState: GameState,
  optionId: string,
  rng: () => number = Math.random,
): GameState {
  const decision = currentState.pendingDecision;
  if (!decision) return currentState;
  const option = decision.options.find((item) => item.id === optionId);
  if (!option) return currentState;

  let success = true;
  let chosenEffect: Effect = option.effect;
  let message = option.resultMessage;

  if (option.risk) {
    if (rng() > option.risk.chance) {
      success = false;
      chosenEffect = option.risk.fail;
      message = option.risk.failMessage;
    }
  }

  let next: GameState = {
    ...currentState,
    pendingDecision: null,
    usedDecisions: Array.from(new Set([...(currentState.usedDecisions || []), decision.id])),
    decisionHistory: [
      ...(currentState.decisionHistory || []),
      { title: decision.title, choice: option.label, success },
    ],
  };

  next = applyEffectValues(next, chosenEffect);
  if (next.pendingMoves !== 0) {
    next.ignoreNextEvent = true;
  }
  next.gameMessage = message;

  const tone: Tone = success ? 'good' : 'bad';
  next = pushLog(next, 'decision', `${decision.title}：${option.label}`, message, tone, chosenEffect);
  next = pushCard(
    next,
    'event',
    next.position,
    'decision',
    `${decision.title}【決断結果】`,
    message,
    tone,
    chosenEffect,
  );

  next = handleBurnoutCheck(next);
  return next;
}

function resolveSquareOutcome(
  state: GameState,
  square: BoardSquare,
  rng: () => number = Math.random,
): { text: string; effect: Effect; tone: Tone } {
  if (square.type === 'salary') {
    const rankInfo = RANKS[state.rank] ?? RANKS[0];
    const baseEffect = square.outcome?.effect ?? { yaruki: 20, money: 25 };
    const totalMoney = (baseEffect.money ?? 25) + rankInfo.salaryBonus;
    const yarukiGain = baseEffect.yaruki ?? 20;
    return {
      text: `${square.outcome?.text ?? square.description}\n（役職「${rankInfo.name}」支給合計：+${totalMoney}万円 / やる気+${yarukiGain}）`,
      effect: { ...baseEffect, money: totalMoney, yaruki: yarukiGain },
      tone: 'good',
    };
  }

  if (square.jobOutcomes && square.jobOutcomes[state.job]) {
    const jo = square.jobOutcomes[state.job]!;
    const isPositive =
      (jo.effect.move ?? 0) > 0 ||
      (jo.effect.yaruki ?? 0) > 0 ||
      (jo.effect.career ?? 0) >= 2;
    const isNegative = (jo.effect.rest ?? 0) > 0 || (jo.effect.move ?? 0) < 0 || (jo.effect.yaruki ?? 0) < 0;
    const tone: Tone = isPositive && !isNegative ? 'good' : isNegative && !isPositive ? 'bad' : 'mixed';
    return { text: `【${state.job}特効】${jo.text}`, effect: jo.effect, tone };
  }

  if (square.random) {
    const hit = rng() < square.random.chance;
    const branch: Outcome = hit ? square.random.hit : square.random.miss;
    return {
      text: branch.text,
      effect: branch.effect,
      tone: hit ? 'good' : 'bad',
    };
  }

  if (square.outcome) {
    return {
      text: square.outcome.text,
      effect: square.outcome.effect,
      tone: square.tone,
    };
  }

  return {
    text: square.description,
    effect: {},
    tone: square.tone,
  };
}

function applySquareEffect(state: GameState, square: BoardSquare): GameState {
  let next = { ...state };

  if (square.type === 'decision') {
    const decId = SQUARE_DECISION_MAP[square.position] || 'career-talk';
    const decision =
      DECISIONS[decId] ||
      Object.values(DECISIONS).find((d) => !(next.usedDecisions || []).includes(d.id)) ||
      DECISIONS['career-talk'];
    next.pendingDecision = decision;
    next.gameMessage = `【決断イベント】${decision.title} — ${decision.description}`;
    return next;
  }

  const resolved = resolveSquareOutcome(next, square);
  const eff = resolved.effect;

  next = applyEffectValues(next, eff);
  if (next.pendingMoves !== 0) {
    next.ignoreNextEvent = true;
  }
  next.gameMessage = resolved.text;

  const logKind: LogKind = square.type === 'item' ? 'item' : square.type === 'goal' ? 'finish' : 'event';
  next = pushLog(next, logKind, square.title, resolved.text, resolved.tone, eff);

  // 通常マス以外、または効果がある場合はイベントカードを表示キューに積む
  const hasMeaningfulEffect =
    Object.keys(eff).length > 0 || square.type === 'goal' || square.type === 'chance';
  if (hasMeaningfulEffect) {
    const cardKind: CardKind =
      square.type === 'goal' ? 'goal' : square.type === 'item' ? 'item' : 'event';
    next = pushCard(
      next,
      cardKind,
      square.position,
      square.type,
      square.title,
      resolved.text,
      resolved.tone,
      eff,
    );
  }

  next = handleBurnoutCheck(next);
  next.position = Math.max(0, Math.min(next.position, BOARD_SIZE));
  return next;
}

function checkPromotionGate(state: GameState, position: number): GameState {
  const gateRank = RANKS.find((r) => r.gatePosition > 0 && r.gatePosition === position);
  if (!gateRank) return state;
  if ((state.gatesPassed || []).includes(position)) return state;

  let next: GameState = {
    ...state,
    gatesPassed: [...(state.gatesPassed || []), position],
  };

  const currentCareer = next.career || 0;
  const promoted = currentCareer >= gateRank.requiredCareer && next.rank < gateRank.index;
  const gateId = (next.seq || 1) + 1;

  if (promoted) {
    next.rank = gateRank.index;
    next.money = (next.money || 0) + gateRank.salaryBonus;
    next.yaruki = Math.min(100, next.yaruki + 10);
    next.seq = gateId;
    next.lastGate = {
      id: gateId,
      position,
      promoted: true,
      rankName: gateRank.name,
    };
    const msg = `昇進査定ゲート通過！社内評価（${currentCareer}pt）が基準を満たし「${gateRank.name}」へ昇進！昇進祝金+${gateRank.salaryBonus}万円＆やる気+10！`;
    next = pushLog(next, 'promotion', `祝・${gateRank.name}へ昇進！`, msg, 'good', {
      money: gateRank.salaryBonus,
      yaruki: 10,
    });
    next = pushCard(
      next,
      'promotion',
      position,
      'salary',
      `昇進辞令：${gateRank.name}`,
      msg,
      'good',
      { money: gateRank.salaryBonus, yaruki: 10 },
    );
    audioManager.playSe('fanfare');
  } else if (next.rank < gateRank.index) {
    next.seq = gateId;
    next.lastGate = {
      id: gateId,
      position,
      promoted: false,
      rankName: gateRank.name,
    };
    next = pushLog(
      next,
      'promotion',
      `${gateRank.name}査定ゲート通過`,
      `必要評価${gateRank.requiredCareer}ptに対し現在${currentCareer}ptのため現状維持。次の査定を目指そう！`,
      'neutral',
    );
  }

  return next;
}

export function calculateScoreAndGrade(state: GameState): { score: number; grade: Grade } {
  const endingKey = state.ending ?? 'average';
  const sRankEndings = [
    'legendary',
    'executive',
    'promotion',
    'mentor',
    'specialist',
    'innovator',
    'ace',
    'creator',
    'leader',
  ];
  const aRank = ['stable', 'balanced', 'diligent', 'team-player', 'steady'];
  const bRank = [
    'consistent',
    'reliable',
    'average',
    'survivor',
    'mediocre',
    'freelance',
    'entrepreneur',
    'global',
    'investor',
    'influencer',
    'farmer',
    'writer',
  ];
  const cRank = ['routine', 'ordinary'];

  let grade: Grade = 'C';
  if (state.status === 'gameover') {
    grade = 'D';
  } else if (sRankEndings.includes(endingKey)) {
    grade = 'S';
  } else if (aRank.includes(endingKey)) {
    grade = 'A';
  } else if (bRank.includes(endingKey)) {
    grade = 'B';
  } else if (cRank.includes(endingKey)) {
    grade = 'C';
  } else {
    grade = 'D';
  }

  const turnBonus = Math.max(0, (30 - state.turn) * 35);
  const yarukiScore = state.yaruki * 12;
  const careerScore = (state.career || 0) * 110;
  const moneyScore = (state.money || 0) * 4;
  const rankScore = (state.rank || 0) * 250;
  const penalty = (state.strikes || 0) * 200;
  const raw = Math.max(100, turnBonus + yarukiScore + careerScore + moneyScore + rankScore - penalty);

  return { score: raw, grade };
}

export function checkEndGame(state: GameState): GameState {
  const newState: GameState = { ...state };

  const yaruki = newState.yaruki;
  const turn = newState.turn;
  const restCount = getRestCount(newState);
  const yarukiZeroCount = getYarukiZeroCount(newState);
  const career = newState.career ?? 0;

  if (newState.status === 'gameover' || newState.strikes >= 3) {
    newState.status = 'gameover';
    newState.ending = restCount >= 4 ? 'overwork' : 'burnout';
  } else {
    newState.status = 'cleared';
    if (yaruki >= 90 && turn <= 12 && restCount === 0) {
      newState.ending = 'legendary';
    } else if (career >= 12 && yaruki >= 70 && turn <= 20) {
      newState.ending = 'executive';
    } else if (yaruki >= 85 && turn <= 14 && restCount <= 1) {
      newState.ending = 'promotion';
    } else if (yaruki >= 80 && turn <= 12) {
      newState.ending = 'specialist';
    } else if (yaruki >= 80 && turn <= 16) {
      newState.ending = 'mentor';
    } else if (yaruki >= 78 && turn <= 14) {
      newState.ending = 'innovator';
    } else if (yaruki >= 75 && turn <= 18) {
      newState.ending =
        newState.job === '営業' ? 'ace' : newState.job === 'デザイナー' ? 'creator' : 'leader';
    } else if (yaruki >= 75 && newState.job === '営業') {
      newState.ending = 'ace';
    } else if (yaruki >= 75 && newState.job === 'デザイナー') {
      newState.ending = 'creator';
    } else if (yaruki >= 70 && restCount <= 2) {
      newState.ending = 'stable';
    } else if (yaruki >= 65 && restCount <= 2) {
      newState.ending = 'balanced';
    } else if (yaruki >= 60 && turn <= 22) {
      newState.ending = 'diligent';
    } else if (yaruki >= 55 && restCount <= 4) {
      newState.ending = 'team-player';
    } else if (yaruki >= 50 && turn <= 28) {
      newState.ending = 'steady';
    } else if (yaruki >= 45) {
      newState.ending = 'consistent';
    } else if (yaruki >= 40) {
      newState.ending = 'reliable';
    } else if (yaruki >= 35 && restCount <= 6) {
      newState.ending = 'average';
    } else if (yaruki >= 30 && restCount <= 8) {
      newState.ending = 'survivor';
    } else if (yaruki >= 25) {
      newState.ending = 'mediocre';
    } else if (yaruki >= 20) {
      newState.ending = 'routine';
    } else if (yaruki >= 15) {
      newState.ending = 'ordinary';
    } else if (newState.job === 'エンジニア') {
      newState.ending = 'freelance';
    } else if (newState.job === '企画・マーケティング') {
      newState.ending = 'entrepreneur';
    } else if (newState.job === '営業' || (newState.money ?? 0) >= 220) {
      newState.ending = 'investor';
    } else if (newState.job === '広報・PR') {
      newState.ending = 'influencer';
    } else if (newState.job === '人事・総務') {
      newState.ending = 'writer';
    } else if (turn >= 40) {
      newState.ending = 'farmer';
    } else if (yarukiZeroCount >= 5) {
      newState.ending = 'breakdown';
    } else if (yarukiZeroCount >= 3) {
      newState.ending = 'burnout';
    } else if (restCount >= 8) {
      newState.ending = 'overwork';
    } else if (turn >= 35) {
      newState.ending = 'dropout';
    } else if (newState.job === '法務・コンプラ') {
      newState.ending = 'mental-break';
    } else if (newState.job === '品質保証') {
      newState.ending = 'stress-victim';
    } else if (restCount >= 6) {
      newState.ending = 'exhausted';
    } else if (yaruki <= 10) {
      newState.ending = 'resignation';
    } else if (turn >= 30) {
      newState.ending = 'collapse';
    } else if (restCount >= 5) {
      newState.ending = 'global';
    } else {
      newState.ending = 'defeat';
    }
  }

  const newlyUnlocked: string[] = [];
  if (newState.status === 'cleared') {
    if (newState.turn <= 12) newlyUnlocked.push('super-fast');
    if (restCount === 0) newlyUnlocked.push('no-rest');
    if ((newState.landedOnCounts[1] || 0) >= 2) newlyUnlocked.push('monday-hater');
    if (newState.yaruki >= 90) newlyUnlocked.push('yaruki-master');
    if (yarukiZeroCount >= 1) newlyUnlocked.push('yaruki-zero');
    if (career >= 12) newlyUnlocked.push('career-master');
    if ((newState.decisionHistory?.length ?? 0) >= 3) newlyUnlocked.push('decision-3');
    if ((newState.money ?? 0) >= 200) newlyUnlocked.push('millionaire');
    if ((newState.zangyoCount ?? 0) === 0) newlyUnlocked.push('teiji-pro');
    if ((newState.zangyoCount ?? 0) >= 5) newlyUnlocked.push('zangyo-warrior');
  }

  newState.newlyUnlockedAchievements = newlyUnlocked;

  const allAchievements = Array.from(new Set([...(newState.unlockedAchievements || []), ...newlyUnlocked]));
  if (allAchievements.length > (newState.unlockedAchievements || []).length) {
    newState.unlockedAchievements = allAchievements;
    saveAchievementsToStorage(allAchievements);
  }

  const { score, grade } = calculateScoreAndGrade(newState);
  newState.score = score;
  newState.grade = grade;
  newState.isFinished = true;
  const endingTitle = ENDINGS[newState.ending as keyof typeof ENDINGS]?.title ?? 'キャリア完了';
  newState.gameMessage =
    newState.status === 'gameover'
      ? `【休職・終了】${endingTitle}`
      : `【祝・完走】${endingTitle}（総合評価 ${grade} / ${score}pt）`;
  return newState;
}

/**
 * 1ターン実行 (サイコロ振り)。
 * 第2引数には Stance ('teiji' | 'zangyo') または直接ダイス値 (number) を渡せる。
 */
export function takeTurn(
  currentState: GameState,
  stanceOrDice?: Stance | number,
  forcedRolls?: number[],
): GameState {
  if (currentState.pendingDecision) {
    return { ...currentState, gameMessage: '決断イベントの選択肢を選んでください。' };
  }
  if (currentState.isFinished) {
    return currentState;
  }

  const stance: Stance =
    stanceOrDice === 'zangyo' || stanceOrDice === 'teiji' ? stanceOrDice : 'teiji';
  const legacySingleDice = typeof stanceOrDice === 'number' ? stanceOrDice : undefined;

  let newState: GameState = {
    ...currentState,
    turn: currentState.turn + 1,
    lastStance: stance,
  };

  if (newState.isResting > 0) {
    newState.isResting -= 1;
    newState.restCount = getRestCount(newState) + 1;
    newState.landedOnCounts = {
      ...(newState.landedOnCounts || {}),
      [-1]: ((newState.landedOnCounts || {})[-1] || 0) + 1,
    };
    newState.pendingMoves = 0;
    newState.lastRoll = [];
    newState.yaruki = Math.min(100, newState.yaruki + 8);
    const restMsg =
      newState.isResting > 0
        ? `休養ターン消化中（やる気+8回復）… あと${newState.isResting}ターン休み。`
        : '休養ターンを消化し、やる気が8回復！次のターンから出社再開！';
    newState.gameMessage = restMsg;
    newState = pushLog(newState, 'rest', '休養・リフレッシュ', restMsg, 'neutral', { yaruki: 8 });
    return newState;
  }

  // スタンスに応じたダイスロールとステータス変動
  let rolls: number[];
  if (forcedRolls && forcedRolls.length > 0) {
    rolls = forcedRolls;
  } else if (typeof legacySingleDice === 'number') {
    rolls = [legacySingleDice];
  } else if (stance === 'zangyo') {
    rolls = [rollDice(), rollDice()];
  } else {
    rolls = [rollDice()];
  }

  if (stance === 'zangyo') {
    newState.zangyoCount = (newState.zangyoCount || 0) + 1;
    newState.yaruki = Math.max(1, newState.yaruki - 8); // ロール時点では最低1残す
    newState.career = (newState.career || 0) + 1;
    newState.money = (newState.money || 0) + 10;
  } else {
    newState.teijiCount = (newState.teijiCount || 0) + 1;
    newState.yaruki = Math.min(100, newState.yaruki + 2);
  }

  newState.lastRoll = rolls;
  let totalSteps = rolls.reduce((acc, v) => acc + v, 0);

  const notes: string[] = [];
  if (stance === 'zangyo') {
    notes.push(`全力残業（2ダイス: ${rolls.join('+')} / 評価+1・残業代+10万・やる気-8）`);
  } else {
    notes.push(`通常勤務（出目${rolls[0]} / やる気+2）`);
  }

  if (newState.diceBoost && newState.diceBoost > 0) {
    totalSteps += newState.diceBoost;
    notes.push(`エナドリ+${newState.diceBoost}`);
    newState.diceBoost = 0;
  }

  if (newState.slowNextTurn) {
    totalSteps = 1;
    newState.slowNextTurn = false;
    notes.push('二日酔いのため1マス固定');
  }

  newState.pendingMoves = totalSteps;
  newState.gameMessage = `${notes.join(' / ')} → ${totalSteps}マス進みます！`;
  newState = pushLog(
    newState,
    'roll',
    stance === 'zangyo' ? `全力残業ロール（計${totalSteps}マス）` : `定時進行ロール（${totalSteps}マス）`,
    newState.gameMessage,
    stance === 'zangyo' ? 'mixed' : 'neutral',
  );

  return newState;
}

/** 1マスずつ移動を進める */
export function moveOneStep(currentState: GameState): GameState {
  let newState: GameState = { ...currentState };

  if (newState.cards.length > 0 || newState.pendingDecision || newState.isFinished) {
    return newState;
  }

  if (!newState.pendingMoves || newState.pendingMoves === 0) {
    return newState;
  }

  if (newState.pendingMoves > 0) {
    newState.position += 1;
    newState.pendingMoves -= 1;

    // 昇進ゲート通過判定（前進時）
    newState = checkPromotionGate(newState, newState.position);

    if (newState.position >= BOARD_SIZE) {
      newState.position = BOARD_SIZE;
      newState.pendingMoves = 0;
      audioManager.playSe('fanfare');
    } else {
      audioManager.playSe('move');
    }
  } else {
    newState.position = Math.max(0, newState.position - 1);
    newState.pendingMoves += 1;
    if (newState.position === 0 && newState.pendingMoves < 0) {
      newState.pendingMoves = 0;
    }
    audioManager.playSe('move');
  }

  // 着地判定
  if (newState.pendingMoves === 0) {
    newState = recordLanding(newState, newState.position);

    // 二次移動による着地では再イベントを発火させない（ゴールを除く）
    if (newState.ignoreNextEvent && newState.position < BOARD_SIZE) {
      const landedSquare = GAME_BOARD.find((s) => s.position === newState.position);
      newState.ignoreNextEvent = false;
      newState.gameMessage = `${newState.position}マス目「${landedSquare?.title || 'マス'}」に移動完了。`;
      return newState;
    }
    newState.ignoreNextEvent = false;

    const currentSquare = GAME_BOARD.find((s) => s.position === newState.position);
    if (currentSquare) {
      newState = applySquareEffect(newState, currentSquare);

      if (currentSquare.type === 'goal') {
        newState = checkEndGame(newState);
      } else if (currentSquare.type === 'salary') {
        audioManager.playSe('coin');
      } else if (currentSquare.tone === 'bad') {
        audioManager.playSe('bad');
      } else if (currentSquare.tone === 'good') {
        audioManager.playSe('good');
      } else {
        audioManager.playSe('card');
      }
    }
  } else {
    const currentSquare = GAME_BOARD.find((s) => s.position === newState.position);
    if (currentSquare) {
      newState.gameMessage = `${currentSquare.position}マス目「${currentSquare.title}」を通過中…（残り${Math.abs(newState.pendingMoves)}マス）`;
    }
  }

  return newState;
}

/** 表示中のイベントカードを1枚閉じる */
export function dismissCard(currentState: GameState): GameState {
  if (!currentState.cards || currentState.cards.length === 0) {
    return currentState;
  }
  const [, ...restCards] = currentState.cards;
  let next: GameState = {
    ...currentState,
    cards: restCards,
  };

  if (restCards.length === 0 && next.position >= BOARD_SIZE && !next.isFinished) {
    next = checkEndGame(next);
  }
  return next;
}
