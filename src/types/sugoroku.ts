// 社畜すごろく — 型定義
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

/** 所持アイテム */
export interface Item {
  id: ItemId;
  name: string;
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
  /** 次のターン 1マス固定 (二日酔い) */
  slow?: boolean;
}

export interface Outcome {
  text: string;
  effect: Effect;
}

/** 盤面の 1 マス */
export interface BoardSquare {
  position: number;
  type: SquareType;
  title: string;
  /** 盤面に表示する短いラベル (6 文字程度) */
  short: string;
  description: string;
  tone: Tone;
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

export type CardKind = 'event' | 'promotion' | 'burnout' | 'goal' | 'gameover' | 'item';

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

export type LogKind = 'start' | 'roll' | 'rest' | 'event' | 'decision' | 'promotion' | 'item' | 'burnout' | 'finish';

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

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

/** ゲーム全体の状態 */
export interface GameState {
  playerName: string;
  job: Job;
  position: number;
  yaruki: number;
  /** 社内評価 */
  career: number;
  /** 貯金 (万円) */
  money: number;
  /** 役職インデックス (RANKS) */
  rank: number;
  items: Item[];
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
