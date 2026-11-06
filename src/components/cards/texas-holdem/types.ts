/**
 * Shared type contracts for "ROYAL FLUSH NIGHT" (ロイヤル・ナイト・ポーカー).
 * The engine (engine.ts), audio (audio.ts) and UI layers all code against these types.
 */

export type Suit = 's' | 'h' | 'd' | 'c';

export interface Card {
  /** 2..14 (11=J, 12=Q, 13=K, 14=A) */
  rank: number;
  suit: Suit;
  /** unique id, e.g. "As", "Td" */
  id: string;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface PlayerAction {
  type: ActionType;
  /** For bet / raise: the TOTAL amount this seat will have put in on this street ("raise to"). Ignored otherwise. */
  amount?: number;
}

export interface SeatLastAction {
  type: ActionType | 'sb' | 'bb' | 'ante';
  /** chips added by this action (for display) */
  amount: number;
}

export interface SeatState {
  seat: number;
  /** character id (see characters.ts) */
  charId: string;
  name: string;
  isHuman: boolean;
  stack: number;
  /** chips put in on the current street */
  bet: number;
  /** chips put in during the whole hand */
  committed: number;
  holeCards: Card[];
  folded: boolean;
  allIn: boolean;
  /** has voluntarily acted since the last full raise on this street */
  hasActed: boolean;
  /** busted / not dealt in this hand */
  sittingOut: boolean;
  lastAction: SeatLastAction | null;
}

export interface EvaluatedHand {
  /** 0=high card .. 8=straight flush (royal flush is category 8 with high card A) */
  category: number;
  /** comparable score, higher is better (ties compare equal) */
  score: number;
  nameJa: string;
  nameEn: string;
  /** the best 5 cards */
  best5: Card[];
}

export interface PotResult {
  amount: number;
  /** seats eligible for this pot */
  eligible: number[];
  /** seats that won (split if >1) */
  winners: number[];
  /** "メインポット" / "サイドポット1" ... */
  label: string;
  /** winning hand name (Japanese) or '' when uncontested */
  handName: string;
}

export interface HandResult {
  /** true if cards were shown down (2+ players reached the end) */
  showdown: boolean;
  pots: PotResult[];
  /** net chips received per seat from pots (does not subtract committed) */
  payouts: Record<number, number>;
  /** evaluated hands of every player who reached showdown */
  reveals: { seat: number; hand: EvaluatedHand }[];
  /** seats that won anything */
  winners: number[];
  /** largest single winner's hand name for headline display */
  headline: string;
}

export interface Blinds {
  sb: number;
  bb: number;
  ante: number;
}

export interface TableState {
  seats: SeatState[];
  button: number;
  sbSeat: number;
  bbSeat: number;
  blinds: Blinds;
  board: Card[];
  deck: Card[];
  street: Street;
  /** seat index to act, null when no action is pending (hand over or run-out) */
  toAct: number | null;
  /** highest street bet that must be matched */
  currentBet: number;
  /** minimum raise increment (size of last full bet/raise, at least bb) */
  minRaise: number;
  /** last seat that made a full bet/raise this street */
  lastAggressor: number | null;
  handNumber: number;
  /** total chips in the middle (sum of committed) */
  potTotal: number;
  /** set when the hand has finished */
  result: HandResult | null;
  /** Japanese action log for the current hand, newest last */
  log: string[];
  /** (engine-managed, optional) number of bets/raises made on the current street */
  streetRaises?: number;
  /** (engine-managed, optional) last full bet/raise maker of the previous street (for c-bet logic) */
  prevAggressor?: number | null;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  /** chips needed to call (capped by stack) */
  callAmount: number;
  canBet: boolean;
  canRaise: boolean;
  /** min legal "raise to" / "bet to" total for this street */
  minRaiseTo: number;
  /** max legal "raise to" total (= bet + stack, i.e. all-in) */
  maxRaiseTo: number;
}

export interface AiProfile {
  /** 0..1 how many hands it plays preflop */
  looseness: number;
  /** 0..1 how often it bets/raises vs calls */
  aggression: number;
  /** 0..1 bluff frequency */
  bluff: number;
  /** 0..1 tendency to call down light */
  stickiness: number;
  /** 0..1 tendency to go all-in with strong / desperate hands */
  shove: number;
  /** 0..1 how much it values drawing hands */
  drawLove: number;
}

export interface AiDecision {
  action: PlayerAction;
  /** UI hint for expression/voice line */
  mood: 'confident' | 'thinking' | 'bluffing' | 'nervous' | 'normal';
}
