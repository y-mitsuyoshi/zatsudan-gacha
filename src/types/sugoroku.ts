// 社畜ライフロード (SHACHIKU LIFE ROAD) — 型定義
// ロジック (src/lib/sugoroku-logic.ts) は純粋関数のみで構成し、UI はこの型を介して状態を描画する。

/** 選択可能な職業 */
export type Job =
  | '営業'
  | 'エンジニア'
  | 'デザイナー'
  | '企画・マーケティング'
  | '人事・総務'
  | '経理・財務'
  | '法務・コンプラ'
  | '広報・PR'
  | '品質保証'
  | '総合職';

export type ItemId = 'energy-drink' | 'paid-leave' | 'nemawashi';

/** 所持アイテム（消耗支給品） */
export interface Item {
  id: ItemId;
  name: string;
  description: string;
}

/** 人生資産カード (ライフ資産ポートフォリオ) */
export type LifeAssetId =
  | 'income-fund'
  | 'city-condo'
  | 'side-saas'
  | 'patent-license'
  | 'exec-network'
  | 'resort-villa';

export interface LifeAsset {
  id: LifeAssetId;
  name: string;
  category: '金融資産' | '不動産' | '事業資産' | '知的財産' | '無形資産';
  /** 最終決算での資産評価額 (万円) */
  value: number;
  /** 給料日ゲート通過時の配当加算 (万円) */
  dividend: number;
  description: string;
}

/** マスの種類 */
export type SquareType =
  | 'start'
  | 'goal'
  | 'normal'
  | 'event'
  | 'chance'
  | 'item'
  | 'salary'
  | 'job-specific'
  | 'decision';

/** マスやカードの印象 (配色・効果音に使う) */
export type Tone = 'good' | 'bad' | 'mixed' | 'neutral';

/** ステータスへの効果。すべて差分値。 */
export interface Effect {
  yaruki?: number;
  career?: number;
  /** 貯金 (万円) */
  money?: number;
  /** 正なら進む / 負なら戻る */
  move?: number;
  /** 休みターン数 */
  rest?: number;
  item?: ItemId;
  /** 獲得するライフ資産カード */
  asset?: LifeAssetId;
  /** 次のターン 1マス固定 (二日酔い) */
  slow?: boolean;
}

export interface Outcome {
  text: string;
  effect: Effect;
}

/** キャリア分岐ジャンクションのルート系統 */
export type RouteBranch = 'main' | 'elite' | 'venture';

/** 盤面の 1 マス (2.5D ジオラマ座標付き) */
export interface BoardSquare {
  position: number;
  type: SquareType;
  title: string;
  /** 盤面に表示する短いラベル (6 文字程度) */
  short: string;
  description: string;
  tone: Tone;
  /** 所属ディストリクトID (1〜5) */
  districtId: number;
  /** ジオラマ盤面上の X 座標 (0〜100%) */
  x: number;
  /** ジオラマ盤面上の Y 座標 (0〜100%) */
  y: number;
  /** 分岐ルート属性 */
  branch?: RouteBranch;
  /** 固定の結果 */
  outcome?: Outcome;
  /** 職業別の結果 (なければ outcome) */
  jobOutcomes?: Partial<Record<Job, Outcome>>;
  /** 確率で分岐する結果 */
  random?: { chance: number; hit: Outcome; miss: Outcome };
}

export interface GameDecisionOption {
  id: string;
  label: string;
  /** 選択肢の補足 (結果のヒント) */
  flavor: string;
  effect: Effect;
  resultMessage: string;
  /** ルート選択を伴う場合 */
  routeSelect?: 'elite' | 'venture';
  /** リスク付き選択肢: chance の確率で effect、外れると fail */
  risk?: { chance: number; fail: Effect; failMessage: string };
}

export interface GameDecision {
  id: string;
  title: string;
  description: string;
  options: GameDecisionOption[];
}

/** 働き方 (毎ターンの選択) */
export type Stance = 'teiji' | 'zangyo';

export type GameStatus = 'playing' | 'cleared' | 'gameover';

export type CardKind = 'event' | 'promotion' | 'payday' | 'burnout' | 'goal' | 'gameover' | 'item';

/** 確認待ちのカード (順番に表示) */
export interface EventCardData {
  id: number;
  kind: CardKind;
  squarePosition: number;
  squareType: SquareType;
  title: string;
  text: string;
  tone: Tone;
  effect: Effect;
}

export type LogKind =
  | 'start'
  | 'roll'
  | 'rest'
  | 'event'
  | 'decision'
  | 'promotion'
  | 'payday'
  | 'item'
  | 'burnout'
  | 'finish';

export interface LogEntry {
  id: number;
  turn: number;
  kind: LogKind;
  title: string;
  text: string;
  tone: Tone;
  effect?: Effect;
}

/** 昇進ゲート通過の記録 (UI の演出用) */
export interface GateEvent {
  id: number;
  position: number;
  promoted: boolean;
  rankName: string;
}

/** 給料日ゲート通過の記録 (UI の PAYDAY バナー演出用) */
export interface PaydayEvent {
  id: number;
  position: number;
  baseSalary: number;
  dividendBonus: number;
  totalPayout: number;
  rankName: string;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

/** ゲーム全体の状態 */
export interface GameState {
  playerName: string;
  job: Job;
  position: number;
  yaruki: number;
  /** 社内評価 */
  career: number;
  /** 所持金・貯金 (万円) */
  money: number;
  /** 役職インデックス (RANKS) */
  rank: number;
  /** 消耗アイテム */
  items: Item[];
  /** 保有ライフ資産ポートフォリオ */
  assets: LifeAsset[];
  /** District 2 で選択したキャリア分岐ルート */
  selectedRoute: 'elite' | 'venture' | null;
  turn: number;
  status: GameStatus;
  isFinished: boolean;
  gameMessage: string;

  /** 残り休みターン */
  isResting: number;
  /** やる気ゼロで倒れた回数 (3 回で休職 = ゲームオーバー) */
  strikes: number;
  pendingMoves: number;
  ignoreNextEvent: boolean;
  diceBoost: number;
  slowNextTurn: boolean;
  lastRoll: number[];
  lastStance: Stance | null;

  cards: EventCardData[];
  pendingDecision: GameDecision | null;
  usedDecisions: string[];
  gatesPassed: number[];
  lastGate: GateEvent | null;
  paydaysPassed: number[];
  lastPayday: PaydayEvent | null;

  path: number[];
  landedOnCounts: Record<number, number>;
  restCount: number;
  zangyoCount: number;
  teijiCount: number;
  decisionHistory: { title: string; choice: string; success: boolean }[];
  log: LogEntry[];
  seq: number;

  ending: string | null;
  score: number;
  grade: Grade | null;
  unlockedAchievements: string[];
  newlyUnlockedAchievements: string[];
}

/** セットアップフォーム */
export interface SetupFormState {
  name: string;
  job: Job;
}
