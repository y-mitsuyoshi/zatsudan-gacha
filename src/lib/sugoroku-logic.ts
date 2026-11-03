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
  LifeAsset,
  LifeAssetId,
  LogEntry,
  LogKind,
  Outcome,
  SetupFormState,
  Stance,
  Tone,
} from '@/types/sugoroku';
import { audioManager } from '@/utils/audio';

// --- Master Data ---

export const BOARD_SIZE = 35;

export const PAYDAY_POSITIONS = [5, 13, 21, 29] as const;

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
  vehicleName: string;
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
    startMoney: 40,
    startItem: 'energy-drink',
    vehicleName: 'セールス・スポーツクーペ',
  },
  'エンジニア': {
    code: 'ENG',
    en: 'SYSTEM ENGINEERING',
    tagline: '技術と論理で炎上案件を鎮火する',
    strength: '障害対応・システム刷新・セキュリティ系マスを好機に変える',
    accentColor: '#2563eb',
    badgeBg: 'bg-[#2563eb]',
    startCareer: 1,
    startMoney: 45,
    startItem: 'energy-drink',
    vehicleName: 'サイバー・コミューター',
  },
  'デザイナー': {
    code: 'DSG',
    en: 'CREATIVE STUDIO',
    tagline: '感性と造形力でブランド価値を高める',
    strength: 'クリエイティブ・アワードマスで高速前進＆高評価を獲得',
    accentColor: '#b83253',
    badgeBg: 'bg-[#b83253]',
    startCareer: 1,
    startMoney: 35,
    startItem: 'paid-leave',
    vehicleName: 'アトリエ・オープンカー',
  },
  '企画・マーケティング': {
    code: 'MKT',
    en: 'MARKETING & PLAN',
    tagline: '市場を読み解き話題を仕掛ける参謀',
    strength: 'SNSプロモ・新規事業マスで大きく前進＆評価ボーナス',
    accentColor: '#6d39b5',
    badgeBg: 'bg-[#6d39b5]',
    startCareer: 2,
    startMoney: 40,
    startItem: 'nemawashi',
    vehicleName: 'トレンド・クロスオーバー',
  },
  '人事・総務': {
    code: 'HRG',
    en: 'HR & GENERAL AFFAIRS',
    tagline: '組織の秩序と採用を握る社内ハブ',
    strength: '研修・採用・組織改革マスでノーダメージ前進＆人脈構築',
    accentColor: '#1f7a5c',
    badgeBg: 'bg-[#1f7a5c]',
    startCareer: 2,
    startMoney: 35,
    startItem: 'paid-leave',
    vehicleName: 'エグゼクティブ・サルーン',
  },
  '経理・財務': {
    code: 'FIN',
    en: 'FINANCE & ACCOUNTING',
    tagline: '1円の誤差も許さない金庫番',
    strength: '決算・予算・資産運用マスで優位に立ち、初期貯金が高い',
    accentColor: '#b57c1e',
    badgeBg: 'bg-[#b57c1e]',
    startCareer: 1,
    startMoney: 65,
    startItem: 'energy-drink',
    vehicleName: 'ゴールド・アーマードバン',
  },
  '法務・コンプラ': {
    code: 'LGL',
    en: 'LEGAL & COMPLIANCE',
    tagline: '契約と規程で企業の盾となる守護者',
    strength: '監査・リーガルチェック・知財マスで評価と前進を同時獲得',
    accentColor: '#374151',
    badgeBg: 'bg-[#374151]',
    startCareer: 2,
    startMoney: 45,
    startItem: 'nemawashi',
    vehicleName: 'ガーディアン・セダン',
  },
  '広報・PR': {
    code: 'PRC',
    en: 'PUBLIC RELATIONS',
    tagline: '世論とメディアを味方につけるスポークスマン',
    strength: 'メディア発表会・グローバル総会マスで一気に出世コースへ躍進',
    accentColor: '#c2511f',
    badgeBg: 'bg-[#c2511f]',
    startCareer: 1,
    startMoney: 40,
    startItem: 'nemawashi',
    vehicleName: 'メディア・プレスワゴン',
  },
  '品質保証': {
    code: 'QAC',
    en: 'QUALITY ASSURANCE',
    tagline: '不具合を未然に封じる最後の砦',
    strength: '品質検査・監査マスで周囲が止まる中を着実に前進',
    accentColor: '#0e7490',
    badgeBg: 'bg-[#0e7490]',
    startCareer: 1,
    startMoney: 40,
    startItem: 'paid-leave',
    vehicleName: 'セーフティ・クルーザー',
  },
  '総合職': {
    code: 'GEN',
    en: 'GENERAL TRACK',
    tagline: 'あらゆる現場を渡り歩くオールラウンダー',
    strength: '初期から社内評価が高く、部門横断タスクフォースで圧倒的成果',
    accentColor: '#7c3aed',
    badgeBg: 'bg-[#7c3aed]',
    startCareer: 3,
    startMoney: 45,
    startItem: 'nemawashi',
    vehicleName: 'グランド・ツアラー',
  },
};

export interface RankInfo {
  index: number;
  name: string;
  en: string;
  /** 給料日ゲート通過時の支給額 (万円) */
  salaryBonus: number;
  /** 昇進に必要な社内評価 */
  requiredCareer: number;
  /** 昇進査定ゲート位置 */
  gatePosition: number;
  /** 最終決算での役職退職金 (万円) */
  retirementBonus: number;
}

export const RANKS: RankInfo[] = [
  { index: 0, name: '新入社員', en: 'TRAINEE', salaryBonus: 25, requiredCareer: 0, gatePosition: 0, retirementBonus: 30 },
  { index: 1, name: '主任', en: 'SENIOR STAFF', salaryBonus: 40, requiredCareer: 2, gatePosition: 5, retirementBonus: 70 },
  { index: 2, name: '係長', en: 'SECTION CHIEF', salaryBonus: 55, requiredCareer: 5, gatePosition: 13, retirementBonus: 120 },
  { index: 3, name: '課長', en: 'MANAGER', salaryBonus: 75, requiredCareer: 8, gatePosition: 18, retirementBonus: 190 },
  { index: 4, name: '部長', en: 'GENERAL MANAGER', salaryBonus: 100, requiredCareer: 11, gatePosition: 21, retirementBonus: 280 },
  { index: 5, name: '執行役員', en: 'EXECUTIVE OFFICER', salaryBonus: 140, requiredCareer: 15, gatePosition: 29, retirementBonus: 420 },
  { index: 6, name: '社長', en: 'PRESIDENT / CEO', salaryBonus: 200, requiredCareer: 20, gatePosition: 32, retirementBonus: 650 },
];

export interface FloorSection {
  id: number;
  floorCode: string;
  title: string;
  subtitle: string;
  range: [number, number];
  themeColor: string;
  skyColor: string;
  terrainLabel: string;
  gatePos?: number;
  gateRank?: string;
}

export const FLOORS: FloorSection[] = [
  {
    id: 1,
    floorCode: 'AREA 1',
    title: 'フレッシュマン・ハーバー（新卒・研修タウン）',
    subtitle: '潮風と桜並木の臨海駅から始まる社会人ライフの第一歩',
    range: [0, 7],
    themeColor: '#1f6f5c',
    skyColor: '#d9f2ec',
    terrainLabel: 'COASTAL HARBOR & TRAINING AVENUE',
    gatePos: 5,
    gateRank: '主任',
  },
  {
    id: 2,
    floorCode: 'AREA 2',
    title: 'メトロ・ビジネス街＆キャリア分岐ジャンクション',
    subtitle: '摩天楼の営業街。「エリート出世ハイウェイ」か「ベンチャー挑戦バイパス」か',
    range: [8, 14],
    themeColor: '#1d5e96',
    skyColor: '#dcebfa',
    terrainLabel: 'DOWNTOWN SKYLINE & CAREER JUNCTION',
    gatePos: 13,
    gateRank: '係長',
  },
  {
    id: 3,
    floorCode: 'AREA 3',
    title: 'マネジメント・キャニオン＆黄金給料日ブリッジ',
    subtitle: '中間管理職の険しい渓谷ハイウェイとエメラルド川に架かる黄金の給料日橋',
    range: [15, 21],
    themeColor: '#b57c1e',
    skyColor: '#faeed7',
    terrainLabel: 'MANAGEMENT CANYON & GOLDEN PAYDAY BRIDGE',
    gatePos: 21,
    gateRank: '部長',
  },
  {
    id: 4,
    floorCode: 'AREA 4',
    title: 'エグゼクティブ・ベイ＆投資ヒルズ',
    subtitle: '証券取引所スパイアと高級レジデンスがそびえる資産形成・役員エリア',
    range: [22, 28],
    themeColor: '#5b3884',
    skyColor: '#ece3f7',
    terrainLabel: 'EXECUTIVE BAYFRONT & INVESTMENT HILLS',
    gatePos: 25,
    gateRank: '課長・部長査定',
  },
  {
    id: 5,
    floorCode: 'AREA 5',
    title: 'ドリーム・リゾートアイランド（最終決算＆FIRE島）',
    subtitle: '海上連絡橋を渡った先の楽園リゾート。自由への大決済モニュメントへ！',
    range: [29, 35],
    themeColor: '#b23a2a',
    skyColor: '#fde8df',
    terrainLabel: 'DREAM RESORT ISLAND & GRAND SETTLEMENT',
    gatePos: 29,
    gateRank: '執行役員',
  },
];

export const DISTRICTS = FLOORS;

export const ITEMS: Record<ItemId, Item> = {
  'energy-drink': {
    id: 'energy-drink',
    name: '高麗人参エナドリ',
    description: '次のルーレット出目+2ブースト ＆ やる気+10回復',
  },
  'paid-leave': {
    id: 'paid-leave',
    name: '承認済・有給休暇届',
    description: '休み状態・二日酔いを即座に全解除（通常時はやる気+25回復）',
  },
  'nemawashi': {
    id: 'nemawashi',
    name: '極秘の根回し資料',
    description: 'キーマンへの事前工作で社内評価+3 ＆ やる気+10回復',
  },
};

export const LIFE_ASSETS: Record<LifeAssetId, LifeAsset> = {
  'income-fund': {
    id: 'income-fund',
    name: 'インカム投資信託',
    category: '金融資産',
    value: 80,
    dividend: 15,
    description: '安定配当を生むインデックス＆高配当ファンド（評価額80万円 / 給料日配当+15万）',
  },
  'city-condo': {
    id: 'city-condo',
    name: '都心デザイナーズマンション',
    category: '不動産',
    value: 180,
    dividend: 25,
    description: '資産価値の高い都心駅近レジデンス（評価額180万円 / 給料日配当+25万）',
  },
  'side-saas': {
    id: 'side-saas',
    name: '副業SaaSオーナー権',
    category: '事業資産',
    value: 140,
    dividend: 20,
    description: '毎月自動収益を生むマイクロSaaS事業（評価額140万円 / 給料日配当+20万）',
  },
  'patent-license': {
    id: 'patent-license',
    name: 'ビジネス特許ライセンス',
    category: '知的財産',
    value: 120,
    dividend: 20,
    description: '業務発明から生まれたロイヤリティ契約（評価額120万円 / 給料日配当+20万）',
  },
  'exec-network': {
    id: 'exec-network',
    name: 'エグゼクティブ人脈カード',
    category: '無形資産',
    value: 100,
    dividend: 15,
    description: '業界のキーマンと繋がる一生モノの人脈（評価額100万円 / 給料日配当+15万）',
  },
  'resort-villa': {
    id: 'resort-villa',
    name: 'リゾート別荘',
    category: '不動産',
    value: 250,
    dividend: 35,
    description: 'オーシャンビューの高級プライベートヴィラ（評価額250万円 / 給料日配当+35万）',
  },
};

export const GAME_BOARD: BoardSquare[] = [
  // === District 1: フレッシュマン・ハーバー (0..7) ===
  {
    position: 0,
    type: 'start',
    title: '入社式・ハーバー出発ゲート',
    short: '入社出発',
    description: '潮風薫るフレッシュマン・ハーバー駅からキャリア・クルーザーで出発！35マス先の自由への大決済を目指せ。',
    tone: 'neutral',
    districtId: 1,
    x: 7.5,
    y: 11.5,
    branch: 'main',
  },
  {
    position: 1,
    type: 'event',
    title: '月曜朝の通勤ラッシュ洗礼',
    short: '月曜朝',
    description: '臨海線の満員電車に揺られ、出社しただけで気力が削られる。やる気-15。',
    tone: 'bad',
    districtId: 1,
    x: 19.5,
    y: 9.5,
    branch: 'main',
    outcome: { text: '月曜朝の重圧でやる気が15下がった…。', effect: { yaruki: -15 } },
  },
  {
    position: 2,
    type: 'normal',
    title: 'ハーバーテラスの朝珈琲',
    short: '朝カフェ',
    description: '海辺のオープンカフェで淹れたてエスプレッソを一杯。心身が整い、やる気+12。',
    tone: 'good',
    districtId: 1,
    x: 31.5,
    y: 12.0,
    branch: 'main',
    outcome: { text: '潮風と香り高い珈琲でリフレッシュ！やる気+12、社内評価+1！', effect: { yaruki: 12, career: 1 } },
  },
  {
    position: 3,
    type: 'item',
    title: '研修センター備品庫の隠し棚',
    short: '備品発見',
    description: '先輩が残した「高麗人参エナドリ」を発見！さらに積立NISA口座も開設。',
    tone: 'good',
    districtId: 1,
    x: 43.5,
    y: 9.5,
    branch: 'main',
    outcome: {
      text: '「高麗人参エナドリ」を入手！やる気+8・貯金+10万円！',
      effect: { item: 'energy-drink', yaruki: 8, money: 10 },
    },
  },
  {
    position: 4,
    type: 'chance',
    title: '新人配属ルーレット抽選',
    short: '配属抽選',
    description: '最初のプロジェクト配属抽選！花形案件なら前進＆ライフ資産「インカム投資信託」獲得！',
    tone: 'mixed',
    districtId: 1,
    x: 55.5,
    y: 12.0,
    branch: 'main',
    random: {
      chance: 0.65,
      hit: {
        text: '花形プロジェクトに抜擢！2マス進み、社内評価+2＆資産「インカム投資信託」を獲得！',
        effect: { move: 2, career: 2, yaruki: 10, asset: 'income-fund' },
      },
      miss: {
        text: '議事録30本ノック担当に任命された…やる気-8だが基礎が身につき評価+1。',
        effect: { yaruki: -8, career: 1 },
      },
    },
  },
  {
    position: 5,
    type: 'salary',
    title: '第1給料日ゲート（初任給＆主任査定）',
    short: '第1給料日',
    description: '通過するだけで役職に応じた給与が支給される黄金ゲート！ジャスト着地なら臨時賞与も追加！',
    tone: 'good',
    districtId: 1,
    x: 67.5,
    y: 9.5,
    branch: 'main',
    outcome: {
      text: '給料日ゲートにジャスト着地！臨時寸志+15万円＆やる気+15！',
      effect: { yaruki: 15, money: 15, career: 1 },
    },
  },
  {
    position: 6,
    type: 'job-specific',
    title: '初めてのクライアント折衝＆現場デビュー',
    short: '現場初陣',
    description: '各職種の専門スキルが試される初陣。デザイナー・人事・品質保証は特効ボーナス！',
    tone: 'mixed',
    districtId: 1,
    x: 79.5,
    y: 12.0,
    branch: 'main',
    outcome: {
      text: '緊張しながらも初陣を突破！社内評価+2、貯金+15万円！',
      effect: { career: 2, money: 15, yaruki: 5 },
    },
    jobOutcomes: {
      'デザイナー': {
        text: '初提案のUIプロトタイプが絶賛され一発採用！2マス進み、評価+3・報奨金+25万円！',
        effect: { move: 2, career: 3, money: 25, yaruki: 12 },
      },
      '人事・総務': {
        text: '新卒オリエンテーションを完璧に統括！評価+3、資産「エグゼクティブ人脈カード」を獲得！',
        effect: { career: 3, yaruki: 12, asset: 'exec-network' },
      },
      '品質保証': {
        text: '初期リリースの重大バグを事前に完封！2マス進み、評価+3！',
        effect: { move: 2, career: 3, yaruki: 10 },
      },
    },
  },
  {
    position: 7,
    type: 'event',
    title: '退勤5分前の「ちょっといい？」',
    short: '呼び止め',
    description: '上司の一言で定時退社が消滅。緊急資料作成でやる気-12だが残業手当+15万円。',
    tone: 'bad',
    districtId: 1,
    x: 91.5,
    y: 14.5,
    branch: 'main',
    outcome: {
      text: '「すぐ終わるから」が2時間コース…やる気-12、残業代+15万円。',
      effect: { yaruki: -12, money: 15, career: 1 },
    },
  },

  // === District 2: メトロ・ビジネス街＆キャリア分岐ジャンクション (8..14) ===
  {
    position: 8,
    type: 'decision',
    title: 'キャリア分岐ジャンクション（出世ハイウェイ vs ベンチャーバイパス）',
    short: '分岐決断',
    description: 'メトロ・ビジネス街の巨大ジャンクション！本社エリート出世路線か、新規事業ベンチャー路線かを選択せよ。',
    tone: 'neutral',
    districtId: 2,
    x: 91.5,
    y: 28.5,
    branch: 'main',
  },
  {
    position: 9,
    type: 'job-specific',
    title: '【出世ハイウェイ】大型競合コンペ決戦',
    short: '大型コンペ',
    description: 'エリート出世ハイウェイの花形案件！営業・広報・総合職は特効で大きく躍進！',
    tone: 'good',
    districtId: 2,
    x: 77.5,
    y: 24.5,
    branch: 'elite',
    outcome: {
      text: '大型コンペを勝ち抜き社内評価+2、報奨金+20万円！',
      effect: { career: 2, money: 20, yaruki: 8 },
    },
    jobOutcomes: {
      '営業': {
        text: '渾身のトッププレゼンで大型契約を単独奪取！3マス進み、評価+4・報奨金+45万円！',
        effect: { move: 3, career: 4, money: 45, yaruki: 15 },
      },
      '広報・PR': {
        text: 'プレス発表会が主要メディアを席巻！3マス進み、評価+3・報奨金+30万円！',
        effect: { move: 3, career: 3, money: 30, yaruki: 12 },
      },
      '総合職': {
        text: '全社横断コンペチームを統括し圧勝！2マス進み、評価+4！',
        effect: { move: 2, career: 4, yaruki: 10 },
      },
    },
  },
  {
    position: 10,
    type: 'item',
    title: '【出世ハイウェイ】証券タワーの資産形成セミナー',
    short: '投信獲得',
    description: '金融街のVIPセミナーに参加。「インカム投資信託」と「極秘の根回し資料」を獲得！',
    tone: 'good',
    districtId: 2,
    x: 63.5,
    y: 24.5,
    branch: 'elite',
    outcome: {
      text: 'ライフ資産「インカム投資信託」＆支給品「極秘の根回し資料」を獲得！',
      effect: { asset: 'income-fund', item: 'nemawashi', career: 1 },
    },
  },
  {
    position: 11,
    type: 'chance',
    title: '【ベンチャーバイパス】SNSバズ＆新規事業ガチャ',
    short: 'バズ抽選',
    description: 'ベンチャー挑戦バイパスの勝負どころ！当たれば「副業SaaSオーナー権」と大量評価を獲得！',
    tone: 'mixed',
    districtId: 2,
    x: 49.5,
    y: 33.5,
    branch: 'venture',
    random: {
      chance: 0.65,
      hit: {
        text: '仕掛けたプロダクトがトレンド1位獲得！ライフ資産「副業SaaSオーナー権」＆評価+3！',
        effect: { asset: 'side-saas', career: 3, money: 25, yaruki: 12 },
      },
      miss: {
        text: 'キャンペーンサイトにアクセス集中で一時不安定に…やる気-10だが話題性で評価+1。',
        effect: { yaruki: -10, career: 1 },
      },
    },
  },
  {
    position: 12,
    type: 'job-specific',
    title: '【ベンチャーバイパス】基幹クラウド緊急障害アラート',
    short: '障害鎮火',
    description: 'エンジニア・企画マーケ・法務は危機をチャンスに変えて特許資産や高評価を獲得！',
    tone: 'mixed',
    districtId: 2,
    x: 35.5,
    y: 33.5,
    branch: 'venture',
    outcome: {
      text: '社内チャットが騒然とする中、復旧作業を支援。やる気-8、評価+1。',
      effect: { yaruki: -8, career: 1 },
    },
    jobOutcomes: {
      'エンジニア': {
        text: '神速のゼロダウンタイム改修で鎮火！2マス進み、評価+4＆「ビジネス特許ライセンス」獲得！',
        effect: { move: 2, career: 4, yaruki: 15, asset: 'patent-license' },
      },
      '企画・マーケティング': {
        text: 'ピンチを逆手に取った神対応広報でファン急増！2マス進み、評価+3・貯金+25万円！',
        effect: { move: 2, career: 3, money: 25, yaruki: 10 },
      },
      '法務・コンプラ': {
        text: 'SLA規約と補償交渉を完璧にまとめ上げ損失ゼロ！評価+3・貯金+20万円！',
        effect: { career: 3, money: 20, yaruki: 8 },
      },
    },
  },
  {
    position: 13,
    type: 'salary',
    title: '第2給料日ゲート（メトロ金融街＆係長査定）',
    short: '第2給料日',
    description: '上下ルートが合流する黄金のメトロ給料日ゲート！通過で給与＋保有資産の配当が振り込まれる！',
    tone: 'good',
    districtId: 2,
    x: 21.5,
    y: 29.0,
    branch: 'main',
    outcome: {
      text: '第2給料日ゲートにジャスト着地！特別業績手当+20万円＆やる気+15！',
      effect: { yaruki: 15, money: 20, career: 1 },
    },
  },
  {
    position: 14,
    type: 'normal',
    title: '奇跡の定時退社・ルーフトップビアガーデン',
    short: '定時退社',
    description: '外の空気がまだ明るい！摩天楼を見上げるテラスで心身ともにリフレッシュ。',
    tone: 'good',
    districtId: 2,
    x: 8.5,
    y: 31.5,
    branch: 'main',
    outcome: {
      text: '定時退社ダッシュ成功！やる気が18回復し、社内評価+1！',
      effect: { yaruki: 18, career: 1 },
    },
  },

  // === District 3: マネジメント・キャニオン＆黄金給料日ブリッジ (15..21) ===
  {
    position: 15,
    type: 'event',
    title: '月末締めの激流・連続残業キャニオン',
    short: '月末激流',
    description: '渓谷の急勾配ハイウェイ！連日の締め作業でやる気-18、1回休み（残業手当+25万円）。',
    tone: 'bad',
    districtId: 3,
    x: 8.5,
    y: 48.0,
    branch: 'main',
    outcome: {
      text: '月末の怒涛の締め処理でダウン…やる気-18、1回休み（残業手当+25万円）。',
      effect: { yaruki: -18, rest: 1, money: 25 },
    },
  },
  {
    position: 16,
    type: 'item',
    title: '渓谷サービスエリア・先輩からの有給差し入れ',
    short: '有給入手',
    description: '「これ使いなよ」と承認済みの有給休暇届と人脈カードを託された！',
    tone: 'good',
    districtId: 3,
    x: 22.0,
    y: 51.5,
    branch: 'main',
    outcome: {
      text: '支給品「承認済・有給休暇届」＆ライフ資産「エグゼクティブ人脈カード」を獲得！',
      effect: { item: 'paid-leave', asset: 'exec-network', yaruki: 10 },
    },
  },
  {
    position: 17,
    type: 'job-specific',
    title: '部門横断タスクフォース・トンネル突破作戦',
    short: '横断TF',
    description: '難所トンネルを突破せよ！経理・総合職・エンジニアは主導権を握り大幅評価UP！',
    tone: 'good',
    districtId: 3,
    x: 35.5,
    y: 47.5,
    branch: 'main',
    outcome: {
      text: '他部署との連携がスムーズに進み、1マス前進＆社内評価+2！',
      effect: { move: 1, career: 2, yaruki: 8 },
    },
    jobOutcomes: {
      '経理・財務': {
        text: '全社コスト最適化モデルを提示し役員陣が絶賛！2マス進み、評価+4・報奨金+35万円！',
        effect: { move: 2, career: 4, money: 35, yaruki: 12 },
      },
      '総合職': {
        text: '部門間の利害対立を鮮やかに調整！3マス進み、評価+4・やる気+12！',
        effect: { move: 3, career: 4, yaruki: 12 },
      },
      'エンジニア': {
        text: '社内基盤の自動化パイプラインを構築！2マス進み、評価+3・報奨金+25万円！',
        effect: { move: 2, career: 3, money: 25, yaruki: 10 },
      },
    },
  },
  {
    position: 18,
    type: 'decision',
    title: '中間査定・炎上プロジェクトの指揮官決断',
    short: '中間査定',
    description: 'マネジメント・キャニオン最大の分岐点（課長査定ゲート併設）。リスクを取って指揮を執るか？',
    tone: 'neutral',
    districtId: 3,
    x: 49.0,
    y: 51.0,
    branch: 'main',
  },
  {
    position: 19,
    type: 'event',
    title: '役員からの鶴の一声（ちゃぶ台返し落石注意）',
    short: '無茶振り',
    description: '「明日までに3パターン出して」突然の仕様変更でやる気が20下がる。',
    tone: 'bad',
    districtId: 3,
    x: 62.5,
    y: 47.5,
    branch: 'main',
    outcome: {
      text: '理不尽なちゃぶ台返しで徹夜対応…やる気が20下がった（評価+1）。',
      effect: { yaruki: -20, career: 1 },
    },
  },
  {
    position: 20,
    type: 'item',
    title: 'キャニオン展望台・ビジネス発明＆副業解禁',
    short: '特許・副業',
    description: '業務改善ツールが社外でも話題に！「ビジネス特許ライセンス」とエナドリを獲得！',
    tone: 'good',
    districtId: 3,
    x: 76.5,
    y: 51.5,
    branch: 'main',
    outcome: {
      text: 'ライフ資産「ビジネス特許ライセンス」＆支給品「高麗人参エナドリ」を獲得！',
      effect: { asset: 'patent-license', item: 'energy-drink', career: 2, yaruki: 8 },
    },
  },
  {
    position: 21,
    type: 'salary',
    title: '第3給料日ゲート（黄金吊り橋＆部長査定）',
    short: '第3給料日',
    description: 'エメラルド川に架かるゴールデン・ペイデイブリッジ！通過で高額給与＆資産配当を獲得！',
    tone: 'good',
    districtId: 3,
    x: 90.5,
    y: 49.0,
    branch: 'main',
    outcome: {
      text: '黄金給料日ブリッジにジャスト着地！管理職特別賞与+30万円＆やる気+18！',
      effect: { yaruki: 18, money: 30, career: 1 },
    },
  },

  // === District 4: エグゼクティブ・ベイ＆投資ヒルズ (22..28) ===
  {
    position: 22,
    type: 'job-specific',
    title: 'ベイフロント高級料亭・VIPトップ会食',
    short: 'VIP会食',
    description: '夜景を望む料亭での重要会食。営業・人事・広報は人脈と大型契約を一挙獲得！',
    tone: 'mixed',
    districtId: 4,
    x: 90.5,
    y: 67.5,
    branch: 'main',
    outcome: {
      text: '上座・下座と手土産のマナーに神経を使い、やる気-8だが社内評価+2！',
      effect: { yaruki: -8, career: 2, money: 15 },
    },
    jobOutcomes: {
      '営業': {
        text: '会食で先方社長の懐に飛び込み年間契約成立！評価+4・報奨金+50万円＆やる気+15！',
        effect: { career: 4, money: 50, yaruki: 15 },
      },
      '人事・総務': {
        text: '業界トップ人材のヘッドハンティングに成功！評価+4・貯金+30万円！',
        effect: { career: 4, money: 30, yaruki: 12 },
      },
      '広報・PR': {
        text: '経済誌の独占特集枠を獲得！2マス進み、評価+3・貯金+25万円！',
        effect: { move: 2, career: 3, money: 25, yaruki: 12 },
      },
    },
  },
  {
    position: 23,
    type: 'chance',
    title: '証券取引所スパイア・資産運用ルーレット',
    short: '投資抽選',
    description: 'エグゼクティブ・ベイの株式市場ルーレット！大当たりなら一気に+80万円＆資産拡大！',
    tone: 'mixed',
    districtId: 4,
    x: 77.0,
    y: 71.0,
    branch: 'main',
    random: {
      chance: 0.65,
      hit: {
        text: '保有ポートフォリオがストップ高！運用益+80万円＆やる気+15！',
        effect: { money: 80, yaruki: 15, career: 1 },
      },
      miss: {
        text: '相場急변でヒヤリハット…損切りで貯金-15万円・やる気-8。',
        effect: { money: -15, yaruki: -8 },
      },
    },
  },
  {
    position: 24,
    type: 'item',
    title: '投資ヒルズ・都心デザイナーズマンション取得',
    short: '不動産取得',
    description: 'ヒルズ族の仲間入り！ライフ資産「都心デザイナーズマンション」の権利書を取得！',
    tone: 'good',
    districtId: 4,
    x: 63.5,
    y: 67.0,
    branch: 'main',
    outcome: {
      text: 'ライフ資産「都心デザイナーズマンション（評価額180万円）」を獲得！やる気+12！',
      effect: { asset: 'city-condo', yaruki: 12, career: 1 },
    },
  },
  {
    position: 25,
    type: 'decision',
    title: '投資ヒルズ・大型M&Aと不祥事リーク危機の決断',
    short: 'ヒルズ決断',
    description: '役員フロア目前の重要決裁。大型買収案件の推進と緊急リスク管理の方針を選べ。',
    tone: 'neutral',
    districtId: 4,
    x: 50.0,
    y: 71.0,
    branch: 'main',
  },
  {
    position: 26,
    type: 'job-specific',
    title: '年度末・本決算＆コンプライアンス総合監査',
    short: '総合監査',
    description: '経理・法務・品質保証・デザイナーは専門スキルが輝き、圧倒的な評価と賞与を獲得！',
    tone: 'mixed',
    districtId: 4,
    x: 36.5,
    y: 67.0,
    branch: 'main',
    outcome: {
      text: '監査法人向けの証憑提出を乗り切り、社内評価+2・貯金+20万円（やる気-6）。',
      effect: { career: 2, money: 20, yaruki: -6 },
    },
    jobOutcomes: {
      '経理・財務': {
        text: '無限定適正意見を完璧に勝ち取った！評価+5・特別賞与+60万円＆2マス前進！',
        effect: { move: 2, career: 5, money: 60, yaruki: 12 },
      },
      '法務・コンプラ': {
        text: '国際契約の重大リスクを未然に防ぎ社長表彰！評価+5・特別賞与+45万円＆2マス前進！',
        effect: { move: 2, career: 5, money: 45, yaruki: 12 },
      },
      '品質保証': {
        text: '国際品質認証の更新審査を満点で通過！評価+4・特別賞与+40万円＆2マス前進！',
        effect: { move: 2, career: 4, money: 40, yaruki: 12 },
      },
      'デザイナー': {
        text: '統合報告書・IRサイトが国際デザイン賞を受賞！評価+4・特別賞与+40万円！',
        effect: { career: 4, money: 40, yaruki: 15 },
      },
    },
  },
  {
    position: 27,
    type: 'event',
    title: '深夜の緊急役員招集＆資料差し替え',
    short: '深夜招集',
    description: '総会前夜の緊急差し替えが発生。やる気-15だが危機突破で評価+2・手当+20万円。',
    tone: 'bad',
    districtId: 4,
    x: 23.0,
    y: 71.0,
    branch: 'main',
    outcome: {
      text: '深夜の資料全面差し替えを完遂…やる気-15、評価+2、深夜手当+20万円。',
      effect: { yaruki: -15, career: 2, money: 20 },
    },
  },
  {
    position: 28,
    type: 'item',
    title: 'エグゼクティブラウンジの極秘ブリーフィング',
    short: '役員ラウンジ',
    description: '最終章に向けた万全の備え。「承認済・有給休暇届」と「副業SaaSオーナー権」を確保！',
    tone: 'good',
    districtId: 4,
    x: 9.5,
    y: 68.5,
    branch: 'main',
    outcome: {
      text: '支給品「承認済・有給休暇届」＆ライフ資産「副業SaaSオーナー権」を獲得！',
      effect: { item: 'paid-leave', asset: 'side-saas', yaruki: 12 },
    },
  },

  // === District 5: ドリーム・リゾートアイランド (29..35) ===
  {
    position: 29,
    type: 'salary',
    title: '第4給料日ゲート（リゾート連絡橋＆執行役員査定）',
    short: '第4給料日',
    description: 'ドリーム・リゾートアイランドへ渡る最後の黄金給料日ゲート！最高ランクの給与と配当を受け取れ！',
    tone: 'good',
    districtId: 5,
    x: 9.5,
    y: 86.5,
    branch: 'main',
    outcome: {
      text: '最終給料日ゲートにジャスト着地！エグゼクティブ特別賞与+40万円＆やる気+20！',
      effect: { yaruki: 20, money: 40, career: 2 },
    },
  },
  {
    position: 30,
    type: 'job-specific',
    title: 'グローバル・リゾートサミット＆全社戦略発表',
    short: '世界総会',
    description: '世界中のパートナーが集うリゾート総会！全職種の集大成プレゼンで評価と報酬が跳ね上がる！',
    tone: 'good',
    districtId: 5,
    x: 24.0,
    y: 89.5,
    branch: 'main',
    outcome: {
      text: '国際サミットで堂々たる成果発表！社内評価+3、報奨金+35万円、やる気+10！',
      effect: { career: 3, money: 35, yaruki: 10 },
    },
    jobOutcomes: {
      '企画・マーケティング': {
        text: 'グローバル新市場戦略が満場一致で採択！2マス進み、評価+5・報奨金+55万円！',
        effect: { move: 2, career: 5, money: 55, yaruki: 15 },
      },
      '広報・PR': {
        text: '世界同時ストリーム中継が大成功！2マス進み、評価+5・報奨金+50万円！',
        effect: { move: 2, career: 5, money: 50, yaruki: 15 },
      },
    },
  },
  {
    position: 31,
    type: 'chance',
    title: 'ドリーム・リゾート別荘オーナー抽選会',
    short: '別荘抽選',
    description: 'ヨットハーバー併設の最高級資産「リゾート別荘（評価額250万円）」が当たる運命のルーレット！',
    tone: 'mixed',
    districtId: 5,
    x: 38.5,
    y: 86.5,
    branch: 'main',
    random: {
      chance: 0.7,
      hit: {
        text: '特賞当選！最高級ライフ資産「リゾート別荘（評価額250万円）」を獲得！やる気+20！',
        effect: { asset: 'resort-villa', yaruki: 20, career: 2 },
      },
      miss: {
        text: '別荘抽選は惜しくも次点だったが、宿泊優待券と特別配当+35万円を獲得！',
        effect: { money: 35, yaruki: 10 },
      },
    },
  },
  {
    position: 32,
    type: 'decision',
    title: '最終キャリア決断（社長就任か、FIRE・独立起業か）',
    short: '最終決断',
    description: 'ゴール直前のラストジャンクション（社長査定ゲート併設）。あなたの社畜ライフの最終章を選べ！',
    tone: 'neutral',
    districtId: 5,
    x: 53.0,
    y: 89.5,
    branch: 'main',
  },
  {
    position: 33,
    type: 'event',
    title: '全社MVP・年間グランドアワード表彰式',
    short: 'MVP表彰',
    description: 'これまでの奮闘が称えられ壇上で表彰！金一封+50万円＆社内評価+3！',
    tone: 'good',
    districtId: 5,
    x: 67.5,
    y: 86.5,
    branch: 'main',
    outcome: {
      text: '全社MVPを受賞！金一封+50万円、社内評価+3、やる気+15！',
      effect: { career: 3, money: 50, yaruki: 15 },
    },
  },
  {
    position: 34,
    type: 'normal',
    title: 'オーシャンビュー・スパ＆プレミアムバケーション',
    short: '極上スパ',
    description: 'ゴール目前の極上リゾートスパ。すべての疲労が癒え、やる気が25回復！',
    tone: 'good',
    districtId: 5,
    x: 81.0,
    y: 89.5,
    branch: 'main',
    outcome: {
      text: '波音を聴きながら極上スパで完全回復！やる気+25、貯金+20万円！',
      effect: { yaruki: 25, money: 20 },
    },
  },
  {
    position: 35,
    type: 'goal',
    title: 'GOAL：自由への大決済モニュメント！',
    short: '大決済GOAL',
    description: '全35マスの社畜ライフロードを完走！所持金・ライフ資産・役職退職金を合算した生涯総資産が確定する！',
    tone: 'good',
    districtId: 5,
    x: 93.0,
    y: 87.0,
    branch: 'main',
    outcome: {
      text: '祝・社畜ライフロード完走！完走決済ボーナス+80万円が加算され、最終生涯総資産が確定しました！',
      effect: { money: 80, yaruki: 10 },
    },
  },
];

export const DECISIONS: Record<string, GameDecision> = {
  'career-talk': {
    id: 'career-talk',
    title: 'キャリア分岐ジャンクション（出世ハイウェイ vs ベンチャーバイパス）',
    description: 'メトロ・ビジネス街の分岐点に到達！ここからのキャリア戦略と走行ルートを決断せよ。',
    options: [
      {
        id: 'aim-promotion',
        label: '【エリート出世ハイウェイ】王道の本社昇進コースを走る',
        flavor: '社内評価+3・手堅く出世査定を突破（エリート路線）',
        effect: { career: 3, yaruki: -8, money: 20 },
        routeSelect: 'elite',
        resultMessage: 'エリート出世ハイウェイへ進入！本社の中枢案件を任され、社内評価+3・手当+20万円（やる気-8）。',
      },
      {
        id: 'keep-pace',
        label: '【定時クルーズ路線】心身の余裕と資産形成を両立する',
        flavor: 'やる気+12・評価+1＆資産「インカム投資信託」獲得',
        effect: { career: 1, yaruki: 12, asset: 'income-fund' },
        routeSelect: 'elite',
        resultMessage: 'スマートな定時クルーズを選択！やる気+12、評価+1、さらにライフ資産「インカム投資信託」を獲得！',
      },
      {
        id: 'pitch-new-biz',
        label: '【ベンチャー挑戦バイパス】新規事業ピッチで一発躍進を狙う',
        flavor: '成功率65%の勝負手！通れば3マス前進＆評価+5・予算+30万',
        effect: { career: 5, move: 3, yaruki: 6, money: 30 },
        routeSelect: 'venture',
        resultMessage: 'ベンチャー挑戦バイパスで大躍進！新規事業ピッチが通り評価+5、予算+30万円、さらに3マス前進！',
        risk: {
          chance: 0.65,
          fail: { career: 1, yaruki: -14 },
          failMessage: '「まず本業の数字を作ってから」と差し戻された…やる気-14（挑戦評価+1）。',
        },
      },
    ],
  },
  'midpoint-choice': {
    id: 'midpoint-choice',
    title: '中間管理職キャニオン・炎上案件の指揮官決断',
    description: '渓谷ハイウェイの折り返し地点で大型プロジェクトが難航中。どう立ち回る？',
    options: [
      {
        id: 'lead-project',
        label: 'プロジェクトリーダーとして火消しに全面参戦する',
        flavor: '激務と引き換えに評価+4・特別手当+35万円を獲得',
        effect: { career: 4, yaruki: -14, money: 35 },
        resultMessage: '炎上案件のPMを引き受け見事に立て直した！社内評価+4、特別手当+35万円（やる気-14）。',
      },
      {
        id: 'support-team',
        label: 'チームの品質維持とメンバーケアに徹する',
        flavor: '評価+2・やる気+10＆資産「エグゼクティブ人脈カード」獲得',
        effect: { career: 2, yaruki: 10, asset: 'exec-network' },
        resultMessage: '頼れるマネジメントで現場を守り抜いた！評価+2、やる気+10、さらに「エグゼクティブ人脈カード」を獲得！',
      },
      {
        id: 'automate-workflow',
        label: 'AI・業務自動化システムを突貫導入して一挙解決を狙う',
        flavor: '成功率60%！成功すれば2マス前進＆評価+4・特許資産獲得',
        effect: { career: 4, move: 2, yaruki: 6, asset: 'patent-license' },
        resultMessage: '自動化システムが見事に稼働し工数80%削減！評価+4、2マス前進＆「ビジネス特許ライセンス」獲得！',
        risk: {
          chance: 0.6,
          fail: { yaruki: -12, rest: 1 },
          failMessage: '新システムの初期バグ対応に追われ徹夜…やる気-12、1回休み。',
        },
      },
    ],
  },
  'evening-choice': {
    id: 'evening-choice',
    title: '投資ヒルズ・大型M&Aと資産形成の決断',
    description: 'エグゼクティブ・ベイの重要局面。会社の大型買収案件と個人の資産形成、どちらに注力する？',
    options: [
      {
        id: 'finish-early',
        label: '定時で切り上げ、不動産＆副業ポートフォリオを強化する',
        flavor: 'やる気+15＆ライフ資産「都心デザイナーズマンション」獲得',
        effect: { yaruki: 15, asset: 'city-condo' },
        resultMessage: '個人の資産形成に注力し「都心デザイナーズマンション」を取得！やる気も15回復！',
      },
      {
        id: 'one-more-task',
        label: '買収デューデリジェンスを完遂して役員陣の信頼を掴む',
        flavor: 'やる気-10で確実な社内評価+4・特別賞与+40万円',
        effect: { career: 4, yaruki: -10, money: 40 },
        resultMessage: '買収交渉を完璧にまとめ上げ、社内評価+4・特別賞与+40万円を獲得（やる気-10）！',
      },
      {
        id: 'delegate-nemawashi',
        label: '外部コンサルの人脈を総動員して電撃合意を狙う',
        flavor: '成功率70%！成功で2マス前進＆評価+4・貯金+30万',
        effect: { career: 4, move: 2, money: 30, yaruki: 5 },
        resultMessage: '鮮やかな交渉術で電撃合意！2マス進み、社内評価+4・成功報酬+30万円！',
        risk: {
          chance: 0.7,
          fail: { career: 1, yaruki: -14 },
          failMessage: '条件交渉が難航し気疲れだけが残った…やる気-14（評価+1）。',
        },
      },
    ],
  },
  'global-mission': {
    id: 'global-mission',
    title: '最終キャリア決断（社長就任か、FIRE・リゾート資産家か）',
    description: '自由への大決済モニュメント目前！あなたの社畜ライフロードを締めくくる最終選択は？',
    options: [
      {
        id: 'fly-overseas',
        label: '経営トップへの最終プレゼンに挑み、最高役職を狙う',
        flavor: '評価+5・報奨金+50万円・2マス前進（やる気-10）',
        effect: { career: 5, move: 2, yaruki: -10, money: 50 },
        resultMessage: '経営陣を圧倒する最終プレゼンで最高評価を獲得！評価+5・報奨金+50万円・2マス前進！',
      },
      {
        id: 'remote-coord',
        label: 'リゾート別荘を取得し、悠々自適なFIRE・独立ライフへ舵を切る',
        flavor: 'やる気+15・1マス前進＆最高級資産「リゾート別荘」獲得',
        effect: { career: 2, move: 1, yaruki: 15, asset: 'resort-villa' },
        resultMessage: '最高級ライフ資産「リゾート別荘（評価額250万円）」を取得！心身ともに満たされゴールへ！',
      },
    ],
  },
};

const SQUARE_DECISION_MAP: Record<number, string> = {
  8: 'career-talk',
  18: 'midpoint-choice',
  25: 'evening-choice',
  32: 'global-mission',
};

// --- Achievements & Endings ---

export const ACHIEVEMENTS: Record<string, { name: string; description: string }> = {
  'super-fast': { name: '超高速キャリア完走', description: '10ターン以内にゴールする。' },
  'no-rest': { name: '皆勤賞の鉄人', description: '一度も休まずにゴールする。' },
  'monday-hater': { name: '月曜ラッシュ生還者', description: '「月曜朝の通勤ラッシュ洗礼」マスに止まって完走する。' },
  'yaruki-master': { name: 'メンタル鋼鉄王', description: 'やる気90以上でゴールする。' },
  'yaruki-zero': { name: '不死鳥の復職', description: 'やる気ゼロの危機から立ち直って完走する。' },
  'career-master': { name: '出世街道の覇者', description: '社内評価12以上でゴールする。' },
  'decision-3': { name: '決断の連続', description: '決断ジャンクションを3回以上乗り越える。' },
  'millionaire': { name: '社畜ライフ億り人', description: '最終生涯総資産600万円以上でゴールする。' },
  'teiji-pro': { name: '定時退社の美学', description: '残業スタンスを一度も使わずにゴールする。' },
  'zangyo-warrior': { name: '深夜の戦士', description: '残業スタンスを4回以上選んでゴールする。' },
};

export const ACHIEVEMENT_LIST = ACHIEVEMENTS;

export const ENDINGS = {
  legendary: {
    title: '伝説の社畜ライフ覇者',
    description: '圧倒的なスピード・高評価・満ち溢れる気力と巨額の資産で完走。語り継がれる生ける伝説となった。',
  },
  executive: {
    title: '最年少エグゼクティブ＆資産家',
    description: '数々の決断と修羅場を勝ち抜き、経営の中枢と盤石なライフ資産ポートフォリオを同時に手にした。',
  },
  promotion: {
    title: '異例の抜擢トップ昇進',
    description: '周囲を唸らせる成果とスピード感で、次期経営トップとして抜擢昇進を果たした。',
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
    description: '大きな破綻なく、心身の健康と確かな資産形成を両立させる理想的なキャリアを築いた。',
  },
  balanced: {
    title: 'ワークライフバランスの達人',
    description: '定時退社と資産運用のメリハリを極め、仕事も趣味も全力で楽しむ社会人ライフを実現した。',
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
    description: '浮き沈みの激しい職場で着実に実績とライフ資産を積み上げ、盤石の生活基盤を築いた。',
  },
  consistent: {
    title: 'ブレない仕事人',
    description: '周囲の喧騒に惑わされず一定のペースで成果を出し続け、着実に決済ボーナスを手にした。',
  },
  reliable: {
    title: '困った時の頼れる相棒',
    description: 'トラブルが起きても動じない落ち着きで、現場を支える頼もしい中堅社員となった。',
  },
  average: {
    title: '平均的サラリーマン',
    description: '山あり谷ありの社畜ライフロードを乗り切り、無事にリゾート決済ゲートへとたどり着いた。',
  },
  survivor: {
    title: '修羅場サバイバー',
    description: '幾度もの炎上と疲労の波をくぐり抜け、しぶとく生き残って決済ボーナスを掴み取った。',
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
    description: 'ボーナス決済日の翌日、清々しい表情で白い封筒をデスクに置く決意を固めた。',
  },
  collapse: {
    title: 'スケジュール崩壊の果て',
    description: '度重なるトラブルで計画が大幅に遅延。ボロボロになりながらもなんとか期末を終えた。',
  },
  defeat: {
    title: 'ほろ苦い査定通知',
    description: '思うように評価や気力が伸びず、来期への課題が残るほろ苦い決済日となった。',
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
    title: '海外リゾートノマド移住',
    description: '満員電車と残業文化に別れを告げ、海辺の街からリモートで働く人生を選んだ。',
  },
  investor: {
    title: 'FIRE・資産ポートフォリオ億り人',
    description: '給料とボーナスを優良資産へ投資し、会社の給与に依存しない経済的自由を築き上げた。',
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
  money: 40,
  rank: 0,
  items: [],
  assets: [],
  selectedRoute: null,
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
  paydaysPassed: [],
  lastPayday: null,

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

export interface NetWorthBreakdown {
  cash: number;
  assetValue: number;
  retirementBonus: number;
  mentalBonus: number;
  totalNetWorth: number;
}

/** 最終生涯総資産の内訳を算出 */
export function calculateNetWorthBreakdown(state: GameState): NetWorthBreakdown {
  const cash = Math.max(0, state.money ?? 0);
  const assetValue = (state.assets ?? []).reduce((sum, a) => sum + a.value, 0);
  const rankInfo = RANKS[state.rank ?? 0] ?? RANKS[0];
  const retirementBonus =
    state.status === 'gameover'
      ? Math.round(rankInfo.retirementBonus * 0.4)
      : rankInfo.retirementBonus + (state.career ?? 0) * 12;
  const mentalBonus = state.status === 'gameover' ? 0 : Math.round((state.yaruki ?? 0) * 1.5);
  const totalNetWorth = cash + assetValue + retirementBonus + mentalBonus;
  return {
    cash,
    assetValue,
    retirementBonus,
    mentalBonus,
    totalNetWorth,
  };
}

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
    assets: [],
    selectedRoute: null,
    gameMessage: `${name}（${formState.job}）がキャリア・クルーザーで出発！給料日ゲートを通過しながら資産を築き、35マス先の自由への大決済を目指そう！`,
    unlockedAchievements: savedAchievements,
    newlyUnlockedAchievements: [],
    gatesPassed: [],
    lastGate: null,
    paydaysPassed: [],
    lastPayday: null,
    path: [0],
    landedOnCounts: { 0: 1 },
    cards: [],
    log: [],
    seq: 1,
  };

  return pushLog(
    base,
    'start',
    '入社・キャリアロード出発',
    `${name}（${formState.job}）のライフロードが始まった。初期評価${profile.startCareer}pt・初期資金${profile.startMoney}万円・支給品「${initialItem.name}」。`,
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
      'やる気が3度目のゼロに到達しました。心身の安全のため、これ以上の出勤はストップとなります。',
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
    'やる気がゼロになり、1回休みが発生しました（やる気25まで応急回復）。3回倒れると強制休職になるため注意してください！',
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
    next.gameMessage = `「${item.name}」を投入！やる気+10回復＆次のルーレット出目+${boost}！`;
    next = pushLog(
      next,
      'item',
      `${item.name}を使用`,
      `やる気+10回復、次のキャリア・ルーレット出目+${boost}ブースト！`,
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
        '休み状態をすべて解除し、やる気が15回復した！',
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
        '計画有給で心身を休め、やる気が25回復した！',
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
      'キーマンへの根回し完了！社内評価+3、やる気+10回復！',
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
  if (effect.asset && LIFE_ASSETS[effect.asset]) {
    const assetObj = LIFE_ASSETS[effect.asset];
    const currentAssets = next.assets || [];
    if (!currentAssets.some((a) => a.id === assetObj.id)) {
      next.assets = [...currentAssets, { ...assetObj }];
    } else {
      // 既に同資産を保有している場合は配当ボーナスとして評価額の半分を現金加算
      next.money = (next.money || 0) + Math.round(assetObj.value * 0.5);
    }
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
    selectedRoute: option.routeSelect ?? currentState.selectedRoute ?? null,
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
    `${decision.title}【決裁結果】`,
    message,
    tone,
    chosenEffect,
  );

  // 決断による評価上昇で現在位置の昇進ゲート条件を満たした場合も即時昇進チェック
  next = checkPromotionGate(next, next.position);
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
    const baseEffect = square.outcome?.effect ?? { yaruki: 15, money: 20 };
    const bonusMoney = baseEffect.money ?? 20;
    const yarukiGain = baseEffect.yaruki ?? 15;
    return {
      text: `${square.outcome?.text ?? square.description}\n（給料日ゲート通過支給とは別に、ジャスト着地特別賞与 +${bonusMoney}万円 / やる気+${yarukiGain} を追加獲得！現在役職：${rankInfo.name}）`,
      effect: { ...baseEffect, money: bonusMoney, yaruki: yarukiGain },
      tone: 'good',
    };
  }

  if (square.jobOutcomes && square.jobOutcomes[state.job]) {
    const jo = square.jobOutcomes[state.job]!;
    const isPositive =
      (jo.effect.move ?? 0) > 0 ||
      (jo.effect.yaruki ?? 0) > 0 ||
      (jo.effect.career ?? 0) >= 2 ||
      Boolean(jo.effect.asset);
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
    next.gameMessage = `【STOP! キャリア重要決断】${decision.title} — ${decision.description}`;
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

/** 昇進査定ゲート通過チェック */
function checkPromotionGate(state: GameState, position: number): GameState {
  const gateRank = RANKS.find((r) => r.gatePosition > 0 && r.gatePosition === position);
  if (!gateRank) return state;
  if ((state.gatesPassed || []).includes(position) && state.rank >= gateRank.index) return state;

  let next: GameState = {
    ...state,
    gatesPassed: Array.from(new Set([...(state.gatesPassed || []), position])),
  };

  const currentCareer = next.career || 0;
  // 現在到達しているゲート以下の範囲で、評価ポイントが満たしている最高ランクへ昇進可能
  const eligibleRanks = RANKS.filter(
    (r) => r.gatePosition <= position && currentCareer >= r.requiredCareer && r.index > next.rank,
  );
  const targetRank = eligibleRanks.length > 0 ? eligibleRanks[eligibleRanks.length - 1] : null;
  const gateId = (next.seq || 1) + 1;

  if (targetRank) {
    next.rank = targetRank.index;
    next.money = (next.money || 0) + targetRank.salaryBonus;
    next.yaruki = Math.min(100, next.yaruki + 10);
    next.seq = gateId;
    next.lastGate = {
      id: gateId,
      position,
      promoted: true,
      rankName: targetRank.name,
    };
    const msg = `昇進査定ゲート通過！社内評価（${currentCareer}pt）が基準を満たし「${targetRank.name}」へ昇進！昇進祝金+${targetRank.salaryBonus}万円＆やる気+10！`;
    next = pushLog(next, 'promotion', `祝・${targetRank.name}へ昇進！`, msg, 'good', {
      money: targetRank.salaryBonus,
      yaruki: 10,
    });
    next = pushCard(
      next,
      'promotion',
      position,
      'salary',
      `昇進辞令：${targetRank.name}`,
      msg,
      'good',
      { money: targetRank.salaryBonus, yaruki: 10 },
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

/** 給料日ゲート（PAYDAY）通過＆着地時の自動給与支給処理 */
function checkPaydayGate(state: GameState, position: number): GameState {
  const square = GAME_BOARD.find((s) => s.position === position);
  if (!square || square.type !== 'salary') return state;
  if ((state.paydaysPassed || []).includes(position)) return state;

  const rankInfo = RANKS[state.rank ?? 0] ?? RANKS[0];
  const baseSalary = rankInfo.salaryBonus;
  const dividendBonus = (state.assets || []).reduce((sum, a) => sum + a.dividend, 0);
  const totalPayout = baseSalary + dividendBonus;
  const paydayId = (state.seq || 1) + 1;

  let next: GameState = {
    ...state,
    seq: paydayId,
    money: (state.money || 0) + totalPayout,
    yaruki: Math.min(100, (state.yaruki || 0) + 12),
    paydaysPassed: [...(state.paydaysPassed || []), position],
    lastPayday: {
      id: paydayId,
      position,
      baseSalary,
      dividendBonus,
      totalPayout,
      rankName: rankInfo.name,
    },
  };

  const dividendText = dividendBonus > 0 ? `＋資産配当${dividendBonus}万円` : '';
  const msg = `PAYDAY! 第${PAYDAY_POSITIONS.indexOf(position as (typeof PAYDAY_POSITIONS)[number]) + 1}給料日ゲート通過！役職「${rankInfo.name}」基本給${baseSalary}万円${dividendText}＝合計 +${totalPayout}万円支給＆やる気+12！`;

  next = pushLog(next, 'payday', `PAYDAY! 給料日支給 +${totalPayout}万円`, msg, 'good', {
    money: totalPayout,
    yaruki: 12,
  });
  audioManager.playSe('coin');

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
    'investor',
  ];
  const aRank = ['stable', 'balanced', 'diligent', 'team-player', 'steady', 'entrepreneur', 'freelance'];
  const bRank = [
    'consistent',
    'reliable',
    'average',
    'survivor',
    'mediocre',
    'global',
    'influencer',
    'farmer',
    'writer',
  ];
  const cRank = ['routine', 'ordinary'];

  const netWorth = calculateNetWorthBreakdown(state).totalNetWorth;

  let grade: Grade = 'C';
  if (state.status === 'gameover') {
    grade = 'D';
  } else if (sRankEndings.includes(endingKey) || netWorth >= 750) {
    grade = 'S';
  } else if (aRank.includes(endingKey) || netWorth >= 500) {
    grade = 'A';
  } else if (bRank.includes(endingKey)) {
    grade = 'B';
  } else if (cRank.includes(endingKey)) {
    grade = 'C';
  } else {
    grade = 'D';
  }

  const turnBonus = Math.max(0, (22 - state.turn) * 45);
  const yarukiScore = state.yaruki * 12;
  const careerScore = (state.career || 0) * 110;
  const netWorthScore = netWorth * 3;
  const rankScore = (state.rank || 0) * 260;
  const penalty = (state.strikes || 0) * 200;
  const raw = Math.max(100, turnBonus + yarukiScore + careerScore + netWorthScore + rankScore - penalty);

  return { score: raw, grade };
}

export function checkEndGame(state: GameState): GameState {
  const newState: GameState = { ...state };

  const yaruki = newState.yaruki;
  const turn = newState.turn;
  const restCount = getRestCount(newState);
  const yarukiZeroCount = getYarukiZeroCount(newState);
  const career = newState.career ?? 0;
  const netWorth = calculateNetWorthBreakdown(newState).totalNetWorth;

  if (newState.status === 'gameover' || newState.strikes >= 3) {
    newState.status = 'gameover';
    newState.ending = restCount >= 4 ? 'overwork' : 'burnout';
  } else {
    newState.status = 'cleared';
    if (yaruki >= 90 && turn <= 12 && restCount === 0) {
      newState.ending = 'legendary';
    } else if ((newState.assets?.length ?? 0) >= 3 && netWorth >= 800) {
      newState.ending = 'investor';
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
    if ((newState.landedOnCounts[1] || 0) >= 1) newlyUnlocked.push('monday-hater');
    if (newState.yaruki >= 90) newlyUnlocked.push('yaruki-master');
    if (yarukiZeroCount >= 1) newlyUnlocked.push('yaruki-zero');
    if (career >= 12) newlyUnlocked.push('career-master');
    if ((newState.decisionHistory?.length ?? 0) >= 3) newlyUnlocked.push('decision-3');
    if ((newState.money ?? 0) >= 200 || netWorth >= 600) newlyUnlocked.push('millionaire');
    if ((newState.zangyoCount ?? 0) === 0) newlyUnlocked.push('teiji-pro');
    if ((newState.zangyoCount ?? 0) >= 4) newlyUnlocked.push('zangyo-warrior');
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
      : `【祝・完走】${endingTitle}（総合評価 ${grade} / 生涯総資産 ${netWorth}万円）`;
  return newState;
}

/**
 * 1ターン実行 (キャリア・ルーレット回転)。
 * 第2引数には Stance ('teiji' | 'zangyo') または直接ルーレット値 (number) を渡せる。
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

  // スタンスに応じたルーレットロールとステータス変動
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
    newState.yaruki = Math.max(1, newState.yaruki - 8);
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
    notes.push(`全力残業スピン（Wルーレット: ${rolls.join('+')} / 評価+1・残業代+10万・やる気-8）`);
  } else {
    notes.push(`定時スピン（ルーレット出目${rolls[0]} / やる気+2）`);
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
    stance === 'zangyo' ? `全力残業ルーレット（計${totalSteps}マス）` : `定時進行ルーレット（${totalSteps}マス）`,
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

    // 1. 昇進査定ゲート通過判定（前進時）
    newState = checkPromotionGate(newState, newState.position);

    // 2. 給料日ゲート（PAYDAY）通過＆着地自動支給判定
    newState = checkPaydayGate(newState, newState.position);

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
  return {
    ...currentState,
    cards: restCards,
  };
}
