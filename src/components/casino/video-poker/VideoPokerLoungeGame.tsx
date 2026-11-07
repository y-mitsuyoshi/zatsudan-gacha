'use client';

import Link from 'next/link';
import { useState, type MouseEvent } from 'react';

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type HandKey =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-kind'
  | 'two-pair'
  | 'jacks-or-better'
  | 'nothing';
type Phase = 'idle' | 'dealt' | 'settled';
type FeedbackKind = 'info' | 'win' | 'loss' | 'even' | 'error';

type Card = {
  id: string;
  suit: Suit;
  rank: number;
};

type Feedback = {
  kind: FeedbackKind;
  title: string;
  detail: string;
};

type HistoryEntry = {
  id: number;
  handNo: number;
  label: string;
  cards: Card[];
  bet: number;
  payout: number;
  net: number;
};

type GameState = {
  credits: number;
  bet: number;
  deck: Card[];
  hand: Card[];
  held: boolean[];
  phase: Phase;
  result: HandKey | null;
  payout: number;
  net: number;
  handNo: number;
  seed: number;
  history: HistoryEntry[];
  feedback: Feedback;
};

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const SUIT_LABEL_JA: Record<Suit, string> = {
  spades: 'スペード',
  hearts: 'ハート',
  diamonds: 'ダイヤ',
  clubs: 'クラブ',
};
const INITIAL_CREDITS = 1000;
const INITIAL_SEED = 52;
const MAX_HISTORY = 8;

const PAYTABLE: { key: HandKey; label: string; pays: number[] }[] = [
  { key: 'royal-flush', label: 'ロイヤルフラッシュ', pays: [250, 500, 750, 1000, 4000] },
  { key: 'straight-flush', label: 'ストレートフラッシュ', pays: [50, 100, 150, 200, 250] },
  { key: 'four-kind', label: 'フォーカード', pays: [25, 50, 75, 100, 125] },
  { key: 'full-house', label: 'フルハウス', pays: [9, 18, 27, 36, 45] },
  { key: 'flush', label: 'フラッシュ', pays: [6, 12, 18, 24, 30] },
  { key: 'straight', label: 'ストレート', pays: [4, 8, 12, 16, 20] },
  { key: 'three-kind', label: 'スリーカード', pays: [3, 6, 9, 12, 15] },
  { key: 'two-pair', label: 'ツーペア', pays: [2, 4, 6, 8, 10] },
  { key: 'jacks-or-better', label: 'J以上のペア', pays: [1, 2, 3, 4, 5] },
];

function rankLabel(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

function handLabel(key: HandKey): string {
  if (key === 'nothing') return '役なし';
  return PAYTABLE.find((row) => row.key === key)?.label ?? '役なし';
}

function formatNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  const absolute = String(Math.abs(Math.trunc(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${absolute}`;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function createOrderedDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

function shuffleDeck(seed: number): { deck: Card[]; seed: number } {
  let state = seed >>> 0;
  const deck = createOrderedDeck();
  for (let index = deck.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    const current = deck[index];
    deck[index] = deck[swapIndex];
    deck[swapIndex] = current;
  }
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return { deck, seed: state };
}

function evaluateHand(cards: Card[]): HandKey {
  const ranks = cards.map((card) => card.rank).sort((a, b) => a - b);
  const counts = new Map<number, number>();
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }
  const groups = Array.from(counts.values()).sort((a, b) => b - a);
  const uniqueRanks = Array.from(new Set(ranks));
  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const isWheel =
    uniqueRanks.length === 5 &&
    uniqueRanks[0] === 2 &&
    uniqueRanks[1] === 3 &&
    uniqueRanks[2] === 4 &&
    uniqueRanks[3] === 5 &&
    uniqueRanks[4] === 14;
  const isStraight =
    uniqueRanks.length === 5 && (uniqueRanks[4] - uniqueRanks[0] === 4 || isWheel);
  const isRoyal =
    isFlush &&
    uniqueRanks.length === 5 &&
    uniqueRanks[0] === 10 &&
    uniqueRanks[4] === 14;

  if (isRoyal) return 'royal-flush';
  if (isFlush && isStraight) return 'straight-flush';
  if (groups[0] === 4) return 'four-kind';
  if (groups[0] === 3 && groups[1] === 2) return 'full-house';
  if (isFlush) return 'flush';
  if (isStraight) return 'straight';
  if (groups[0] === 3) return 'three-kind';
  if (groups.filter((count) => count === 2).length === 2) return 'two-pair';
  if (groups[0] === 2) {
    const pairRank =
      Array.from(counts.entries()).find(([, count]) => count === 2)?.[0] ?? 0;
    if (pairRank >= 11) return 'jacks-or-better';
  }
  return 'nothing';
}

function payoutFor(key: HandKey, bet: number): number {
  const row = PAYTABLE.find((item) => item.key === key);
  return row ? row.pays[bet - 1] ?? 0 : 0;
}

function createInitialState(): GameState {
  return {
    credits: INITIAL_CREDITS,
    bet: 1,
    deck: createOrderedDeck(),
    hand: [],
    held: [false, false, false, false, false],
    phase: 'idle',
    result: null,
    payout: 0,
    net: 0,
    handNo: 0,
    seed: INITIAL_SEED,
    history: [],
    feedback: {
      kind: 'info',
      title: 'ビデオポーカー・ラウンジへようこそ',
      detail:
        'ベットを選んでDEAL。5枚のカードから残したいものをHOLDし、DRAWで交換します。',
    },
  };
}

function resetState(): GameState {
  return {
    ...createInitialState(),
    feedback: {
      kind: 'info',
      title: 'セッションをリセットしました',
      detail:
        '仮想クレジットは1,000に戻りました。ベットを選んで新しいハンドを開始してください。',
    },
  };
}

function setBet(state: GameState, bet: number): GameState {
  if (state.phase === 'dealt') return state;
  if (!Number.isInteger(bet) || bet < 1 || bet > 5) return state;
  if (bet > state.credits) return state;
  return { ...state, bet };
}

function deal(state: GameState): GameState {
  if (state.phase === 'dealt') return state;
  if (state.credits < state.bet || state.bet < 1) {
    return {
      ...state,
      feedback: {
        kind: 'error',
        title: 'クレジットが不足しています',
        detail:
          'RESETで仮想クレジットを1,000に戻し、ベット額を選び直してください。',
      },
    };
  }

  const { deck, seed } = shuffleDeck(state.seed);
  const hand = deck.slice(0, 5);
  const nextHandNo = state.handNo + 1;

  return {
    ...state,
    credits: state.credits - state.bet,
    deck: deck.slice(5),
    hand,
    held: [false, false, false, false, false],
    phase: 'dealt',
    result: null,
    payout: 0,
    net: 0,
    handNo: nextHandNo,
    seed,
    feedback: {
      kind: 'info',
      title: `第${nextHandNo}ハンド / ${state.bet}クレジットをベット`,
      detail:
        '残したいカードをタップしてHOLD。HOLDしていないカードがDRAWで交換されます。',
    },
  };
}

function toggleHold(state: GameState, index: number): GameState {
  if (state.phase !== 'dealt') return state;
  if (!Number.isInteger(index) || index < 0 || index >= state.hand.length) return state;
  return {
    ...state,
    held: state.held.map((value, heldIndex) => (heldIndex === index ? !value : value)),
  };
}

function draw(state: GameState): GameState {
  if (state.phase !== 'dealt' || state.hand.length !== 5) return state;

  const replaceCount = state.held.filter((value) => !value).length;
  if (state.deck.length < replaceCount) return state;

  const replacements = state.deck.slice(0, replaceCount);
  let replacementIndex = 0;
  const finalHand = state.hand.map((card, index) => {
    if (state.held[index]) return card;
    const replacement = replacements[replacementIndex];
    replacementIndex += 1;
    return replacement;
  });

  const result = evaluateHand(finalHand);
  const payout = payoutFor(result, state.bet);
  const credits = state.credits + payout;
  const net = payout - state.bet;
  const label = handLabel(result);
  let feedback: Feedback;

  if (payout === 0) {
    feedback = {
      kind: 'loss',
      title: `配当なし / ${state.bet}クレジットを失いました`,
      detail:
        'ジャック以上のワンペアから配当が発生します。HOLDの選び方を見直して次のハンドへ。',
    };
  } else if (payout > state.bet) {
    feedback = {
      kind: 'win',
      title: `${label} / WIN +${formatNumber(payout - state.bet)}`,
      detail: `配当 ${formatNumber(payout)}クレジット（ベット ${state.bet}）をクレジットに加算しました。`,
    };
  } else {
    feedback = {
      kind: 'even',
      title: `${label} / EVEN`,
      detail: `配当 ${formatNumber(payout)}クレジットでベット分を回収しました。`,
    };
  }

  const entry: HistoryEntry = {
    id: state.handNo,
    handNo: state.handNo,
    label,
    cards: finalHand,
    bet: state.bet,
    payout,
    net,
  };

  return {
    ...state,
    credits,
    deck: state.deck.slice(replaceCount),
    hand: finalHand,
    held: [false, false, false, false, false],
    phase: 'settled',
    result,
    payout,
    net,
    history: [entry, ...state.history].slice(0, MAX_HISTORY),
    feedback,
  };
}

function SuitIcon({ suit, className }: { suit: Suit; className: string }) {
  if (suit === 'spades') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
        <path d="M12 2C7 8 3 11.5 3 15a5.5 5.5 0 0 0 8 4.89L9.5 22h5l-1.5-2.11A5.5 5.5 0 0 0 21 15c0-3.5-4-7-9-13Z" />
      </svg>
    );
  }
  if (suit === 'hearts') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" />
      </svg>
    );
  }
  if (suit === 'diamonds') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
        <path d="M12 2 20 12 12 22 4 12 12 2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d="M12 3a4.2 4.2 0 0 0-3.7 6.18A4.3 4.3 0 1 0 9.6 17.5L8.5 21h7l-1.1-3.5a4.3 4.3 0 1 0 1.3-8.32A4.2 4.2 0 0 0 12 3Z" />
    </svg>
  );
}

function PlayingCard({
  card,
  index,
  held,
  interactive,
  onToggle,
}: {
  card: Card;
  index: number;
  held: boolean;
  interactive: boolean;
  onToggle: () => void;
}) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const actionLabel = held ? 'HOLDを解除' : 'HOLDする';
  return (
    <button
      type="button"
      className={`vp-card${isRed ? ' is-red' : ''}${held ? ' is-held' : ''}${interactive ? ' is-interactive' : ''}`}
      onClick={interactive ? onToggle : undefined}
      disabled={!interactive}
      aria-pressed={interactive ? held : undefined}
      aria-label={`${index + 1}枚目 ${SUIT_LABEL_JA[card.suit]}の${rankLabel(card.rank)}${interactive ? ` ${actionLabel}` : ''}`}
      data-testid={`vp-card-${index}`}
    >
      <span className="vp-card-rank">
        {rankLabel(card.rank)}
        <SuitIcon suit={card.suit} className="vp-suit-small" />
      </span>
      <span className="vp-card-center">
        <SuitIcon suit={card.suit} className="vp-suit-large" />
      </span>
      <span className="vp-card-hold">HOLD</span>
    </button>
  );
}

function CardBack({ index }: { index: number }) {
  return (
    <div className="vp-card-back" aria-hidden="true" data-testid={`vp-card-back-${index}`}>
      <span className="vp-card-back-mark">VP</span>
    </div>
  );
}

export default function VideoPokerLoungeGame() {
  const [state, setState] = useState<GameState>(createInitialState);
  const isDealt = state.phase === 'dealt';
  const heldCount = state.held.filter(Boolean).length;
  const sessionNet = state.credits - INITIAL_CREDITS;
  const primaryDisabled = !isDealt && state.credits < state.bet;

  const handlePrimary = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1) return;
    setState((current) => (current.phase === 'dealt' ? draw(current) : deal(current)));
  };

  return (
    <div className="vp-lounge">
      <style>{`
        .vp-lounge {
          --vp-bg: #171009;
          --vp-wood-dark: #22140c;
          --vp-wood: #3a2415;
          --vp-wood-light: #56361f;
          --vp-brass: #b98a48;
          --vp-brass-light: #ddba7c;
          --vp-brass-dark: #7e5a2b;
          --vp-cream: #f0e4cf;
          --vp-cream-soft: #cdbb9e;
          --vp-cream-muted: #a99476;
          --vp-ink: #2b2117;
          --vp-red: #8f3b36;
          min-height: 100vh;
          overflow-x: hidden;
          background-color: var(--vp-bg);
          background-image:
            radial-gradient(ellipse at 50% 0%, rgba(96, 62, 34, 0.34), transparent 62%),
            repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 7px);
          color: var(--vp-cream);
          font-family: 'Hiragino Sans', 'Yu Gothic UI', 'Yu Gothic', Meiryo, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .vp-shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 18px 14px 44px;
        }
        .vp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px 18px;
          flex-wrap: wrap;
          border-bottom: 1px solid rgba(185, 138, 72, 0.45);
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .vp-brand {
          flex: 1 1 300px;
          min-width: 0;
        }
        .vp-eyebrow {
          margin: 0;
          color: #c39a5d;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }
        .vp-title {
          margin: 4px 0 0;
          color: var(--vp-cream);
          font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', Georgia, serif;
          font-size: clamp(24px, 4.2vw, 38px);
          font-weight: 700;
          letter-spacing: 0.03em;
          line-height: 1.15;
        }
        .vp-topbar-side {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .vp-topnote {
          color: #9d8a70;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 9px;
          letter-spacing: 0.13em;
          line-height: 1.6;
          text-align: right;
        }
        .vp-topnote span {
          display: block;
          font-family: 'Hiragino Sans', 'Yu Gothic UI', Meiryo, sans-serif;
          letter-spacing: 0.02em;
        }
        .vp-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 15px;
          border: 1px solid #6b4d2b;
          border-radius: 3px;
          background: #24170f;
          color: #dcc59d;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-decoration: none;
          transition: border-color 140ms ease, color 140ms ease, background-color 140ms ease;
        }
        .vp-back:hover {
          border-color: var(--vp-brass);
          background: #2e1d12;
          color: var(--vp-cream);
        }
        .vp-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }
        .vp-cabinet {
          position: relative;
          min-width: 0;
          border: 1px solid #77522c;
          border-radius: 16px;
          padding: 9px;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0 1px, transparent 1px 9px),
            linear-gradient(145deg, #3b2516 0%, #23150d 48%, #3a2415 100%);
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
        }
        .vp-cabinet::before {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(221, 186, 124, 0.3);
          border-radius: 12px;
          pointer-events: none;
        }
        .vp-cabinet-inner {
          position: relative;
          min-width: 0;
          border: 1px solid #0a1d17;
          border-radius: 10px;
          padding: 13px 11px 12px;
          background:
            radial-gradient(ellipse at 50% -8%, rgba(80, 126, 103, 0.34), transparent 58%),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.014) 0 2px, transparent 2px 5px),
            linear-gradient(158deg, #174534 0%, #0e3025 52%, #0a211a 100%);
          box-shadow:
            inset 0 0 0 1px rgba(221, 186, 124, 0.15),
            inset 0 0 38px rgba(0, 0, 0, 0.36);
        }
        .vp-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-bottom: 11px;
        }
        .vp-stat {
          min-width: 0;
          border: 1px solid rgba(185, 138, 72, 0.3);
          border-radius: 3px;
          background: rgba(9, 27, 21, 0.78);
          padding: 7px 9px;
        }
        .vp-stat-label {
          display: block;
          color: var(--vp-cream-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .vp-stat-value {
          display: block;
          margin-top: 1px;
          color: var(--vp-cream);
          font-family: 'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif;
          font-size: clamp(16px, 2.6vw, 23px);
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-variant-numeric: tabular-nums;
        }
        .vp-stat-value.is-brass {
          color: var(--vp-brass-light);
        }
        .vp-stat-value.is-positive {
          color: var(--vp-brass-light);
        }
        .vp-stat-value.is-negative {
          color: #c98f7a;
        }
        .vp-paytable-wrap {
          margin-bottom: 11px;
          padding: 8px 8px 6px;
          border: 1px solid var(--vp-brass);
          border-radius: 3px;
          background: #efe4cf;
          color: var(--vp-ink);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.26);
        }
        .vp-paytable-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          padding: 0 2px 5px;
          margin-bottom: 3px;
          border-bottom: 1px solid #bda77f;
        }
        .vp-paytable-title {
          margin: 0;
          font-family: 'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .vp-paytable-note {
          color: #6b5a42;
          font-size: 8px;
          line-height: 1.4;
          text-align: right;
        }
        .vp-paytable {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .vp-paytable caption {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .vp-paytable th,
        .vp-paytable td {
          border-bottom: 1px solid rgba(120, 96, 64, 0.2);
          padding: 3px 2px;
          font-variant-numeric: tabular-nums;
          line-height: 1.3;
        }
        .vp-paytable thead th {
          color: #6b5a42;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 8px;
          font-weight: 700;
          text-align: right;
        }
        .vp-paytable thead th:first-child {
          width: 40%;
          text-align: left;
        }
        .vp-paytable tbody th {
          width: 40%;
          color: #3b2d1f;
          font-size: 10.5px;
          font-weight: 700;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .vp-paytable tbody td {
          color: #4a3a28;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10.5px;
          font-weight: 600;
          text-align: right;
        }
        .vp-paytable td.is-active-bet {
          background: #e2cd9d;
          color: #21180f;
          font-weight: 800;
        }
        .vp-paytable tr.is-result th,
        .vp-paytable tr.is-result td {
          background: #d8bd84;
          color: #1f170e;
        }
        .vp-paytable tr.is-result th {
          box-shadow: inset 3px 0 0 #7e5a2b;
        }
        .vp-hand-area {
          min-width: 0;
          padding: 1px 0 9px;
        }
        .vp-hand-caption {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 2px;
          color: #b8a78c;
          font-size: 9.5px;
          line-height: 1.5;
        }
        .vp-hand-caption strong {
          flex-shrink: 0;
          color: var(--vp-brass-light);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 9px;
          letter-spacing: 0.06em;
        }
        .vp-hand {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 6px;
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          padding-top: 9px;
        }
        .vp-card {
          position: relative;
          display: block;
          width: 100%;
          min-height: 78px;
          aspect-ratio: 2 / 3;
          padding: 5px 5px 17px;
          border: 1px solid #c9b28d;
          border-radius: 5px;
          background: linear-gradient(155deg, #fffaf0 0%, #f4e8d1 55%, #e8d9bc 100%);
          color: var(--vp-ink);
          text-align: left;
          box-shadow: 0 5px 12px rgba(0, 0, 0, 0.34);
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
          cursor: default;
          -webkit-tap-highlight-color: transparent;
        }
        .vp-card.is-red {
          color: var(--vp-red);
        }
        .vp-card.is-interactive {
          cursor: pointer;
        }
        .vp-card.is-interactive:hover {
          border-color: var(--vp-brass);
        }
        .vp-card.is-held {
          transform: translateY(-7px);
          border-color: var(--vp-brass);
          box-shadow:
            0 8px 15px rgba(0, 0, 0, 0.38),
            inset 0 0 0 2px #d9b573;
        }
        .vp-card:disabled {
          opacity: 1;
        }
        .vp-card:focus-visible,
        .vp-bet-button:focus-visible,
        .vp-action-primary:focus-visible,
        .vp-action-secondary:focus-visible,
        .vp-back:focus-visible,
        .vp-details summary:focus-visible {
          outline: 2px solid var(--vp-brass-light);
          outline-offset: 2px;
        }
        .vp-card-rank {
          display: flex;
          align-items: center;
          gap: 2px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(13px, 2.4vw, 20px);
          font-weight: 700;
          line-height: 1;
        }
        .vp-suit-small {
          width: clamp(10px, 1.7vw, 14px);
          height: clamp(10px, 1.7vw, 14px);
          display: block;
          flex-shrink: 0;
        }
        .vp-suit-large {
          width: clamp(22px, 4.4vw, 38px);
          height: clamp(22px, 4.4vw, 38px);
          display: block;
          opacity: 0.92;
        }
        .vp-card-center {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-bottom: 13px;
          pointer-events: none;
        }
        .vp-card-hold {
          position: absolute;
          left: 50%;
          bottom: 4px;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          height: 13px;
          padding: 0 4px;
          border: 1px solid rgba(126, 90, 43, 0.45);
          border-radius: 2px;
          background: rgba(255, 250, 240, 0.45);
          color: #7e5a2b;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.14em;
          opacity: 0.5;
        }
        .vp-card.is-held .vp-card-hold {
          background: var(--vp-brass);
          border-color: var(--vp-brass-dark);
          color: #20170f;
          opacity: 1;
        }
        .vp-card.is-interactive .vp-card-hold {
          opacity: 0.72;
        }
        .vp-card:not(.is-interactive) .vp-card-hold {
          display: none;
        }
        .vp-card-back {
          position: relative;
          width: 100%;
          min-height: 78px;
          aspect-ratio: 2 / 3;
          border: 1px solid #8c6435;
          border-radius: 5px;
          background:
            linear-gradient(135deg, transparent 46%, rgba(221, 186, 124, 0.13) 46% 54%, transparent 54%),
            repeating-linear-gradient(45deg, #5a2723 0 5px, #4a1f1d 5px 10px);
          box-shadow:
            inset 0 0 0 2px rgba(221, 186, 124, 0.23),
            0 5px 12px rgba(0, 0, 0, 0.34);
        }
        .vp-card-back::before {
          content: '';
          position: absolute;
          inset: 6px;
          border: 1px solid rgba(221, 186, 124, 0.34);
          border-radius: 2px;
        }
        .vp-card-back-mark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d9b573;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(14px, 2.6vw, 22px);
          letter-spacing: 0.12em;
        }
        .vp-feedback {
          margin: 6px 0 10px;
          min-height: 60px;
          padding: 8px 11px;
          border: 1px solid rgba(185, 138, 72, 0.34);
          border-left: 3px solid var(--vp-brass);
          border-radius: 2px;
          background: rgba(9, 27, 21, 0.8);
        }
        .vp-feedback.is-win {
          border-left-color: var(--vp-brass-light);
        }
        .vp-feedback.is-even {
          border-left-color: #b9a27e;
        }
        .vp-feedback.is-loss {
          border-left-color: #a45f52;
        }
        .vp-feedback.is-error {
          border-left-color: #b25b4e;
        }
        .vp-feedback-title {
          margin: 0;
          color: var(--vp-cream);
          font-family: 'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.4;
        }
        .vp-feedback-detail {
          margin: 2px 0 0;
          color: #c9b89d;
          font-size: 10.5px;
          line-height: 1.7;
        }
        .vp-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid rgba(185, 138, 72, 0.3);
          padding-top: 10px;
        }
        .vp-bet-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .vp-bet-label {
          flex-shrink: 0;
          color: #b9a685;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .vp-bet-options {
          display: grid;
          grid-template-columns: repeat(5, minmax(44px, 1fr));
          gap: 5px;
          flex: 1;
          max-width: 300px;
        }
        .vp-bet-button {
          min-width: 44px;
          min-height: 44px;
          border: 1px solid #6e4c29;
          border-radius: 3px;
          background: #1b150f;
          color: #d8c6a8;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 130ms ease, border-color 130ms ease, color 130ms ease;
        }
        .vp-bet-button:hover:not(:disabled) {
          border-color: var(--vp-brass);
          color: var(--vp-cream);
        }
        .vp-bet-button[aria-pressed='true'] {
          border-color: var(--vp-brass-light);
          background: var(--vp-brass);
          color: #1b130b;
          box-shadow: inset 0 0 0 1px rgba(255, 250, 240, 0.35);
        }
        .vp-bet-button:disabled {
          opacity: 0.38;
          cursor: not-allowed;
        }
        .vp-action-row {
          display: flex;
          gap: 8px;
        }
        .vp-action-primary {
          display: flex;
          flex: 1;
          min-height: 52px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          border: 1px solid var(--vp-brass-light);
          border-radius: 3px;
          background: linear-gradient(180deg, #cfaa6d 0%, #b18345 55%, #a97a3b 100%);
          color: #1d140b;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 250, 240, 0.35),
            0 4px 10px rgba(0, 0, 0, 0.3);
          transition: filter 130ms ease;
        }
        .vp-action-primary:hover:not(:disabled) {
          filter: brightness(1.06);
        }
        .vp-action-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .vp-action-en {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.18em;
          line-height: 1.2;
        }
        .vp-action-ja {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          line-height: 1.2;
        }
        .vp-action-secondary {
          min-width: 96px;
          min-height: 52px;
          padding: 0 14px;
          border: 1px solid #6e4c29;
          border-radius: 3px;
          background: #1b150f;
          color: #d8c6a8;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: border-color 130ms ease, color 130ms ease, background-color 130ms ease;
        }
        .vp-action-secondary:hover {
          border-color: var(--vp-brass);
          background: #241a12;
          color: var(--vp-cream);
        }
        .vp-action-hint {
          margin: 0;
          color: #a99476;
          font-size: 9.5px;
          line-height: 1.5;
          text-align: center;
        }
        .vp-table-disclaimer {
          margin: 9px 0 0;
          padding-top: 8px;
          border-top: 1px solid rgba(185, 138, 72, 0.18);
          color: #99866b;
          font-size: 8.5px;
          line-height: 1.7;
          text-align: center;
        }
        .vp-side {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 12px;
        }
        .vp-panel,
        .vp-details {
          min-width: 0;
          border: 1px solid #5f4326;
          border-radius: 7px;
          background: linear-gradient(180deg, #24170f 0%, #1b120c 100%);
        }
        .vp-panel {
          padding: 13px;
        }
        .vp-panel-title {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          margin: 0 0 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(185, 138, 72, 0.32);
          color: #e3c489;
          font-family: 'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif;
          font-size: 15px;
          font-weight: 700;
        }
        .vp-panel-title span {
          flex-shrink: 0;
          color: #99866b;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 8px;
          letter-spacing: 0.16em;
        }
        .vp-details summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 48px;
          padding: 0 13px;
          color: #e3c489;
          font-family: 'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          list-style: none;
        }
        .vp-details summary::-webkit-details-marker {
          display: none;
        }
        .vp-details summary::after {
          content: '+';
          color: var(--vp-brass);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 18px;
          line-height: 1;
        }
        .vp-details[open] summary::after {
          content: '−';
        }
        .vp-details-body {
          padding: 0 13px 13px;
          border-top: 1px solid rgba(185, 138, 72, 0.22);
          color: #c9b89d;
          font-size: 10.5px;
          line-height: 1.8;
        }
        .vp-details-body p {
          margin: 8px 0 0;
        }
        .vp-rules {
          margin: 10px 0 0;
          padding-left: 17px;
        }
        .vp-rules li {
          margin-bottom: 3px;
        }
        .vp-history-list {
          display: flex;
          max-height: 318px;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          padding-right: 2px;
          scrollbar-width: thin;
          scrollbar-color: #6e4c29 #1b120c;
        }
        .vp-history-item {
          border: 1px solid rgba(185, 138, 72, 0.18);
          border-radius: 3px;
          background: rgba(9, 25, 20, 0.5);
          padding: 7px 8px;
        }
        .vp-history-top {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .vp-history-no {
          flex-shrink: 0;
          color: #99866b;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 9px;
        }
        .vp-history-name {
          flex: 1;
          min-width: 0;
          color: #eadcc3;
          font-size: 10.5px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .vp-history-net {
          flex-shrink: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10.5px;
          font-weight: 700;
        }
        .vp-history-net.is-win {
          color: var(--vp-brass-light);
        }
        .vp-history-net.is-loss {
          color: #c98f7a;
        }
        .vp-history-net.is-even {
          color: #d8ccb6;
        }
        .vp-history-cards {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .vp-mini-card {
          display: inline-flex;
          align-items: center;
          gap: 1px;
          padding: 1px 3px;
          border: 1px solid #8d6a3f;
          border-radius: 2px;
          background: #efe4cf;
          color: var(--vp-ink);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 8px;
          font-weight: 700;
          line-height: 1.3;
        }
        .vp-mini-card.is-red {
          color: var(--vp-red);
        }
        .vp-suit-mini {
          width: 7px;
          height: 7px;
          display: block;
        }
        .vp-history-meta {
          margin-left: auto;
          color: #99866b;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 8px;
          white-space: nowrap;
        }
        .vp-empty {
          margin: 0;
          padding: 14px 4px;
          color: #99866b;
          font-size: 10.5px;
          line-height: 1.7;
          text-align: center;
        }
        .vp-responsible {
          border-color: #6d3f37;
          background: linear-gradient(180deg, #261712 0%, #1b100c 100%);
        }
        .vp-responsible p {
          margin: 0 0 7px;
          color: #c7b39b;
          font-size: 9.5px;
          line-height: 1.8;
        }
        .vp-responsible p:last-child {
          margin-bottom: 0;
        }
        @media (max-width: 520px) {
          .vp-bet-row {
            flex-direction: column;
            align-items: stretch;
          }
          .vp-bet-options {
            max-width: none;
          }
          .vp-topnote {
            text-align: left;
          }
        }
        @media (min-width: 640px) {
          .vp-shell {
            padding-left: 20px;
            padding-right: 20px;
          }
          .vp-cabinet-inner {
            padding: 16px 16px 14px;
          }
          .vp-hand {
            gap: 12px;
            padding-top: 12px;
          }
          .vp-paytable tbody th,
          .vp-paytable tbody td {
            font-size: 11px;
            padding: 3px 3px;
          }
          .vp-paytable thead th {
            font-size: 9px;
          }
        }
        @media (min-width: 1024px) {
          .vp-layout {
            grid-template-columns: minmax(0, 1fr) 360px;
            gap: 18px;
          }
          .vp-stats {
            gap: 8px;
          }
          .vp-stat {
            padding: 8px 11px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .vp-card,
          .vp-back,
          .vp-action-primary,
          .vp-action-secondary,
          .vp-bet-button {
            transition: none;
          }
        }
      `}</style>

      <div className="vp-shell">
        <header className="vp-topbar">
          <div className="vp-brand">
            <p className="vp-eyebrow">FIVE CARD DRAW / JACKS OR BETTER</p>
            <h2 className="vp-title">ビデオポーカー・ラウンジ</h2>
          </div>
          <div className="vp-topbar-side">
            <p className="vp-topnote">
              VIRTUAL CREDITS ONLY
              <span>現金・景品との交換はありません</span>
            </p>
            <Link href="/games" className="vp-back">
              ゲーム一覧へ
            </Link>
          </div>
        </header>

        <div className="vp-layout">
          <section
            className="vp-cabinet"
            aria-label="ビデオポーカーのテーブル"
            data-testid="vp-root"
            data-phase={state.phase}
            data-credits={state.credits}
            data-bet={state.bet}
            data-hand={state.handNo}
            data-result={state.result ?? ''}
            data-payout={state.payout}
            data-net={state.net}
          >
            <div className="vp-cabinet-inner">
              <div className="vp-stats">
                <div className="vp-stat">
                  <span className="vp-stat-label">CREDITS</span>
                  <span className="vp-stat-value is-brass" data-testid="vp-credits">
                    {formatNumber(state.credits)}
                  </span>
                </div>
                <div className="vp-stat">
                  <span className="vp-stat-label">BET</span>
                  <span className="vp-stat-value" data-testid="vp-bet">
                    {state.bet}
                  </span>
                </div>
                <div className="vp-stat">
                  <span className="vp-stat-label">HAND</span>
                  <span className="vp-stat-value">
                    {state.handNo === 0 ? '—' : `#${state.handNo}`}
                  </span>
                </div>
                <div className="vp-stat">
                  <span className="vp-stat-label">NET</span>
                  <span
                    className={`vp-stat-value${sessionNet > 0 ? ' is-positive' : sessionNet < 0 ? ' is-negative' : ''}`}
                  >
                    {formatSigned(sessionNet)}
                  </span>
                </div>
              </div>

              <div className="vp-paytable-wrap" data-testid="vp-paytable">
                <div className="vp-paytable-head">
                  <h3 className="vp-paytable-title">配当表</h3>
                  <span className="vp-paytable-note">
                    クレジット / 5枚ベット時ロイヤル4,000
                  </span>
                </div>
                <table className="vp-paytable">
                  <caption>ビデオポーカーの配当表</caption>
                  <thead>
                    <tr>
                      <th scope="col">役</th>
                      {[1, 2, 3, 4, 5].map((betValue) => (
                        <th scope="col" key={betValue}>
                          {betValue}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PAYTABLE.map((row) => {
                      const isResult = state.phase === 'settled' && state.result === row.key;
                      return (
                        <tr key={row.key} className={isResult ? 'is-result' : undefined}>
                          <th scope="row">{row.label}</th>
                          {row.pays.map((pay, index) => (
                            <td
                              key={`${row.key}-${index}`}
                              className={state.bet === index + 1 ? 'is-active-bet' : undefined}
                            >
                              {formatNumber(pay)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="vp-hand-area">
                <div className="vp-hand-caption">
                  <span>
                    {isDealt
                      ? 'カードをタップしてHOLD / もう一度タップで解除'
                      : state.phase === 'settled'
                        ? 'ハンド確定 / ベットを選んで次のハンドへ'
                        : '5カードドロー / ジャックス・オア・ベター'}
                  </span>
                  <strong>
                    {isDealt
                      ? `HOLD ${heldCount} / 交換 ${5 - heldCount}`
                      : state.phase === 'settled' && state.result
                        ? handLabel(state.result)
                        : 'READY'}
                  </strong>
                </div>
                <div className="vp-hand" role="group" aria-label="あなたの手札">
                  {state.hand.length === 0
                    ? [0, 1, 2, 3, 4].map((index) => <CardBack key={index} index={index} />)
                    : state.hand.map((card, index) => (
                        <PlayingCard
                          key={card.id}
                          card={card}
                          index={index}
                          held={state.held[index]}
                          interactive={isDealt}
                          onToggle={() =>
                            setState((current) => toggleHold(current, index))
                          }
                        />
                      ))}
                </div>
              </div>

              <div
                className={`vp-feedback is-${state.feedback.kind}`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-testid="vp-feedback"
              >
                <p className="vp-feedback-title">{state.feedback.title}</p>
                <p className="vp-feedback-detail">{state.feedback.detail}</p>
              </div>

              <div className="vp-controls">
                <div className="vp-bet-row">
                  <span className="vp-bet-label">BET / ベット</span>
                  <div className="vp-bet-options" role="group" aria-label="ベット額">
                    {[1, 2, 3, 4, 5].map((betValue) => (
                      <button
                        key={betValue}
                        type="button"
                        className="vp-bet-button"
                        aria-pressed={state.bet === betValue}
                        aria-label={`${betValue}クレジットをベット`}
                        disabled={isDealt || betValue > state.credits}
                        onClick={() =>
                          setState((current) => setBet(current, betValue))
                        }
                        data-testid={`vp-bet-${betValue}`}
                      >
                        {betValue}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="vp-action-row">
                  <button
                    type="button"
                    className="vp-action-primary"
                    onClick={handlePrimary}
                    disabled={primaryDisabled}
                    data-testid="vp-deal"
                  >
                    <span className="vp-action-en">{isDealt ? 'DRAW' : 'DEAL'}</span>
                    <span className="vp-action-ja">
                      {isDealt ? 'カードを交換する' : 'カードを配る'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="vp-action-secondary"
                    onClick={() => setState(() => resetState())}
                    data-testid="vp-reset"
                  >
                    リセット
                  </button>
                </div>
                <p className="vp-action-hint">
                  {primaryDisabled
                    ? 'クレジットが不足しています。リセットで1,000に戻せます。'
                    : isDealt
                      ? `未HOLDの${5 - heldCount}枚が交換されます。`
                      : `仮想クレジット ${formatNumber(state.credits)} / ベット ${state.bet}`}
                </p>
              </div>

              <p className="vp-table-disclaimer">
                娯楽用の仮想カジノゲームです。実際のお金は使用しません。現金・景品・チケット等との交換はできません。
              </p>
            </div>
          </section>

          <aside className="vp-side" aria-label="ゲーム情報">
            <details className="vp-details">
              <summary>遊び方とルール</summary>
              <div className="vp-details-body">
                <ol className="vp-rules">
                  <li>1〜5クレジットからベット額を選びます。</li>
                  <li>DEALを押すと5枚のカードが配られます。</li>
                  <li>残したいカードをタップしてHOLD。再度タップすると解除できます。</li>
                  <li>DRAWを押すとHOLDしていないカードだけが交換され、役と配当が確定します。</li>
                </ol>
                <p>ジャック以上のワンペアから配当が発生します。</p>
                <p>5クレジットベット時のみ、ロイヤルフラッシュは4,000クレジットになります。</p>
                <p>クレジットが不足した場合は、リセットで1,000クレジットに戻せます。</p>
              </div>
            </details>

            <section className="vp-panel" aria-labelledby="vp-history-title">
              <h3 className="vp-panel-title" id="vp-history-title">
                ハンド履歴
                <span>{state.history.length} / {MAX_HISTORY}</span>
              </h3>
              <div className="vp-history-list" data-testid="vp-history">
                {state.history.length === 0 ? (
                  <p className="vp-empty">
                    まだハンド履歴はありません。DEALで最初のハンドを始めましょう。
                  </p>
                ) : (
                  state.history.map((entry) => {
                    const netClass =
                      entry.net > 0 ? 'is-win' : entry.net < 0 ? 'is-loss' : 'is-even';
                    return (
                      <div key={entry.id} className="vp-history-item">
                        <div className="vp-history-top">
                          <span className="vp-history-no">#{entry.handNo}</span>
                          <span className="vp-history-name">{entry.label}</span>
                          <span className={`vp-history-net ${netClass}`}>
                            {formatSigned(entry.net)}
                          </span>
                        </div>
                        <div className="vp-history-cards">
                          {entry.cards.map((card) => {
                            const isRed =
                              card.suit === 'hearts' || card.suit === 'diamonds';
                            return (
                              <span
                                key={card.id}
                                className={`vp-mini-card${isRed ? ' is-red' : ''}`}
                              >
                                {rankLabel(card.rank)}
                                <SuitIcon suit={card.suit} className="vp-suit-mini" />
                              </span>
                            );
                          })}
                          <span className="vp-history-meta">
                            BET {entry.bet} / PAY {entry.payout}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="vp-panel vp-responsible" aria-labelledby="vp-responsible-title">
              <h3 className="vp-panel-title" id="vp-responsible-title">
                責任あるプレイについて
                <span>PLAY SAFE</span>
              </h3>
              <p>
                本作は娯楽目的のブラウザゲームです。使用するのはゲーム内の仮想クレジットのみで、現金・景品・チケットなどとの交換はできません。実際のお金を賭ける機能はありません。
              </p>
              <p>
                長時間の連続プレイを避け、適度な休憩を取り、生活に支障が出ない範囲でお楽しみください。
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
