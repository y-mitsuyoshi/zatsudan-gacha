'use client';

import { useEffect, useRef, useState } from 'react';

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Side = 'player' | 'banker';
type BetSpot = Side | 'tie';
type Phase = 'betting' | 'dealing' | 'result';

interface Card {
  id: string;
  suit: Suit;
  rank: number;
}

interface DealtCard {
  side: Side;
  card: Card;
}

interface Bets {
  player: number;
  banker: number;
  tie: number;
}

interface WagerPlacement {
  spot: BetSpot;
  amount: number;
}

interface ResolvedRound {
  sequence: DealtCard[];
  playerScore: number;
  bankerScore: number;
  outcome: BetSpot;
}

interface ReturnBreakdown {
  player: number;
  banker: number;
  tie: number;
  commission: number;
  returned: number;
}

interface RoundResult extends ReturnBreakdown {
  outcome: BetSpot;
  playerScore: number;
  bankerScore: number;
  wagers: Bets;
  totalBet: number;
  net: number;
}

interface HistoryEntry {
  id: number;
  outcome: BetSpot;
  playerScore: number;
  bankerScore: number;
  totalBet: number;
  returned: number;
  net: number;
}

const INITIAL_BANKROLL = 1000;
const MIN_BET = 10;
const TABLE_LIMIT = 2000;
const SHOE_DECKS = 8;
const CHIP_VALUES = [10, 25, 50, 100, 500] as const;
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const SPOTS: BetSpot[] = ['player', 'banker', 'tie'];
const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '',
  hearts: '',
  diamonds: '',
  clubs: '',
};
const SUIT_LABEL: Record<Suit, string> = {
  spades: 'スペード',
  hearts: 'ハート',
  diamonds: 'ダイヤ',
  clubs: 'クラブ',
};
const SPOT_EN: Record<BetSpot, string> = {
  player: 'PLAYER',
  banker: 'BANKER',
  tie: 'TIE',
};
const SPOT_JA: Record<BetSpot, string> = {
  player: 'プレイヤー',
  banker: 'バンカー',
  tie: 'タイ',
};
const SPOT_ODDS: Record<BetSpot, string> = {
  player: '1:1',
  banker: '0.95:1',
  tie: '8:1',
};
const OUTCOME_EN: Record<BetSpot, string> = {
  player: 'PLAYER WIN',
  banker: 'BANKER WIN',
  tie: 'TIE',
};
const OUTCOME_JA: Record<BetSpot, string> = {
  player: 'プレイヤーの勝ち',
  banker: 'バンカーの勝ち',
  tie: '引き分け',
};

function emptyBets(): Bets {
  return { player: 0, banker: 0, tie: 0 };
}

function formatChips(value: number): string {
  return Math.max(0, Math.floor(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatSigned(value: number): string {
  if (value > 0) return `+${formatChips(value)}`;
  if (value < 0) return `-${formatChips(Math.abs(value))}`;
  return '0';
}

function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

function cardValue(card: Card): number {
  if (card.rank === 1) return 1;
  if (card.rank >= 10) return 0;
  return card.rank;
}

function handTotal(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + cardValue(card), 0) % 10;
}

function buildShuffledShoe(): Card[] {
  const cards: Card[] = [];
  for (let deck = 0; deck < SHOE_DECKS; deck += 1) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank += 1) {
        cards.push({ id: `${deck}-${suit}-${rank}`, suit, rank });
      }
    }
  }
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

function resolveRound(shoe: Card[]): ResolvedRound {
  const player: Card[] = [];
  const banker: Card[] = [];
  const sequence: DealtCard[] = [];

  const dealTo = (side: Side) => {
    const card = shoe.shift();
    if (!card) throw new Error('shoe empty');
    if (side === 'player') {
      player.push(card);
    } else {
      banker.push(card);
    }
    sequence.push({ side, card });
  };

  dealTo('player');
  dealTo('banker');
  dealTo('player');
  dealTo('banker');

  const playerInitial = handTotal(player);
  const bankerInitial = handTotal(banker);
  let playerThirdValue: number | null = null;

  if (playerInitial < 8 && bankerInitial < 8) {
    if (playerInitial <= 5) {
      dealTo('player');
      playerThirdValue = cardValue(player[player.length - 1]);
    }

    const bankerBeforeThird = handTotal(banker);
    let bankerDraws = false;

    if (playerThirdValue === null) {
      bankerDraws = bankerBeforeThird <= 5;
    } else if (bankerBeforeThird <= 2) {
      bankerDraws = true;
    } else if (bankerBeforeThird === 3) {
      bankerDraws = playerThirdValue !== 8;
    } else if (bankerBeforeThird === 4) {
      bankerDraws = playerThirdValue >= 2 && playerThirdValue <= 7;
    } else if (bankerBeforeThird === 5) {
      bankerDraws = playerThirdValue >= 4 && playerThirdValue <= 7;
    } else if (bankerBeforeThird === 6) {
      bankerDraws = playerThirdValue === 6 || playerThirdValue === 7;
    }

    if (bankerDraws) {
      dealTo('banker');
    }
  }

  const playerScore = handTotal(player);
  const bankerScore = handTotal(banker);
  const outcome: BetSpot =
    playerScore > bankerScore ? 'player' : bankerScore > playerScore ? 'banker' : 'tie';

  return { sequence, playerScore, bankerScore, outcome };
}

function calculateReturns(outcome: BetSpot, wagers: Bets): ReturnBreakdown {
  let player = 0;
  let banker = 0;
  let tie = 0;
  let commission = 0;

  if (outcome === 'tie') {
    player = wagers.player;
    banker = wagers.banker;
    tie = wagers.tie * 9;
  } else if (outcome === 'player') {
    player = wagers.player * 2;
  } else {
    const bankerProfit = Math.floor(wagers.banker * 0.95);
    banker = wagers.banker + bankerProfit;
    commission = wagers.banker - bankerProfit;
  }

  return {
    player,
    banker,
    tie,
    commission,
    returned: player + banker + tie,
  };
}

function PlayingCard({ card }: { card: Card }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const colorClass = isRed ? 'text-[#982f35]' : 'text-[#241f19]';

  return (
    <div
      role="img"
      aria-label={`${SUIT_LABEL[card.suit]}の${rankLabel(card.rank)}`}
      className="baccarat-card relative h-[58px] w-[41px] shrink-0 overflow-hidden rounded-[4px] border border-[#d3c2a1] bg-[#f6eedc] text-[#241f19] shadow-[0_3px_6px_rgba(0,0,0,0.34)] sm:h-[88px] sm:w-[62px] sm:rounded-[6px]"
    >
      <span className="absolute left-1 top-0.5 font-editorial text-sm leading-none sm:left-1.5 sm:top-1 sm:text-xl">
        {rankLabel(card.rank)}
      </span>
      <span className={`absolute left-1 top-[19px] text-[10px] leading-none sm:left-1.5 sm:top-[31px] sm:text-sm ${colorClass}`}>
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span className={`absolute inset-0 flex items-center justify-center text-2xl leading-none sm:text-4xl ${colorClass}`} aria-hidden="true">
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span className="absolute bottom-0.5 right-1 rotate-180 font-editorial text-sm leading-none sm:bottom-1 sm:right-1.5 sm:text-xl">
        {rankLabel(card.rank)}
      </span>
      <span className={`absolute bottom-[19px] right-1 rotate-180 text-[10px] leading-none sm:bottom-[31px] sm:right-1.5 sm:text-sm ${colorClass}`}>
        {SUIT_SYMBOL[card.suit]}
      </span>
    </div>
  );
}

function HandPanel({
  side,
  cards,
  score,
}: {
  side: Side;
  cards: Card[];
  score: number;
}) {
  const natural = cards.length === 2 && score >= 8;
  const isPlayer = side === 'player';

  return (
    <section
      aria-label={`${SPOT_JA[side]}の手札`}
      className={`min-w-0 rounded-lg border p-2.5 sm:p-4 ${
        isPlayer
          ? 'border-[#b9975b]/45 bg-[#0b2d22]/80'
          : 'border-[#b9975b]/45 bg-[#43171d]/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-label text-[9px] text-[#c9a15d] sm:text-[10px]">{SPOT_EN[side]}</p>
          <p className="mt-0.5 text-[11px] font-bold tracking-wide text-[#e6dac4] sm:text-sm">
            {SPOT_JA[side]}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <div className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[#c9a15d]/75 bg-[#09130f] px-2 font-editorial text-xl text-[#f5ecd9] sm:h-12 sm:min-w-12 sm:text-2xl">
            {score}
          </div>
          {natural && (
            <span className="mt-1 border border-[#c9a15d]/60 px-1 py-0.5 font-label text-[7px] text-[#e2c47e] sm:text-[8px]">
              NATURAL
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex min-h-[62px] items-center gap-1 sm:min-h-[92px] sm:gap-2">
        {cards.length === 0 ? (
          <span className="font-label text-[8px] text-[#b7a78d] sm:text-[9px]">カード待ち</span>
        ) : (
          cards.map((card) => <PlayingCard key={card.id} card={card} />)
        )}
      </div>
    </section>
  );
}

function ResultPanel({ result }: { result: RoundResult }) {
  const accentClass =
    result.outcome === 'player'
      ? 'border-[#5f8f77]'
      : result.outcome === 'banker'
        ? 'border-[#9d5a58]'
        : 'border-[#c9a15d]';

  const playerBetText =
    result.outcome === 'player'
      ? `払戻 ${formatChips(result.player)}`
      : result.outcome === 'tie'
        ? `プッシュ ${formatChips(result.player)}`
        : '没収';
  const bankerBetText =
    result.outcome === 'banker'
      ? `払戻 ${formatChips(result.banker)}`
      : result.outcome === 'tie'
        ? `プッシュ ${formatChips(result.banker)}`
        : '没収';
  const tieBetText =
    result.outcome === 'tie' ? `払戻 ${formatChips(result.tie)}` : '没収';

  return (
    <div className={`baccarat-result rounded-lg border-2 ${accentClass} bg-[#f0e5cf] p-3 text-[#241f19] sm:p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <p className="font-label text-[9px] text-[#7d5c30] sm:text-[10px]">{OUTCOME_EN[result.outcome]}</p>
          <p className="font-editorial text-xl leading-tight sm:text-2xl">{OUTCOME_JA[result.outcome]}</p>
        </div>
        <div className="text-right">
          <p className="font-label text-[9px] text-[#7d5c30] sm:text-[10px]">PAYOUT</p>
          <p className="font-editorial text-xl leading-tight sm:text-2xl">{formatChips(result.returned)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#cbb894] pt-2 text-[10px] leading-5 sm:text-[11px]">
        {result.wagers.player > 0 && (
          <span>
            {SPOT_JA.player}: {playerBetText}
          </span>
        )}
        {result.wagers.banker > 0 && (
          <span>
            {SPOT_JA.banker}: {bankerBetText}
          </span>
        )}
        {result.wagers.tie > 0 && (
          <span>
            {SPOT_JA.tie}: {tieBetText}
          </span>
        )}
        {result.commission > 0 && <span>手数料: {formatChips(result.commission)}</span>}
        <span className="font-bold">
          収支: {formatSigned(result.net)}
        </span>
      </div>
    </div>
  );
}

function RoyalCrest() {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className="h-11 w-11 shrink-0 sm:h-14 sm:w-14"
    >
      <circle cx="32" cy="32" r="30" fill="#13241c" stroke="#c9a15d" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="#7e6034" strokeWidth="1" />
      <path
        d="M32 10.5 38.5 25.5 53.5 32 38.5 38.5 32 53.5 25.5 38.5 10.5 32 25.5 25.5Z"
        fill="none"
        stroke="#c9a15d"
        strokeWidth="1.1"
      />
      <path d="M32 18v28M18 32h28" stroke="#6f522c" strokeWidth="0.8" />
      <text
        x="32"
        y="37.5"
        textAnchor="middle"
        fontFamily="serif"
        fontSize="13"
        fontWeight="700"
        fill="#f2e8d5"
        letterSpacing="0.5"
      >
        BR
      </text>
    </svg>
  );
}

export default function BaccaratRoyalGame() {
  const [phase, setPhase] = useState<Phase>('betting');
  const [bankroll, setBankroll] = useState(INITIAL_BANKROLL);
  const [selectedChip, setSelectedChip] = useState<number>(25);
  const [bets, setBets] = useState<Bets>(emptyBets);
  const [betStack, setBetStack] = useState<WagerPlacement[]>([]);
  const [sequence, setSequence] = useState<DealtCard[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [shoeRemaining, setShoeRemaining] = useState(SHOE_DECKS * 52);
  const [notice, setNotice] = useState(
    'チップを選び、プレイヤー、バンカー、タイのいずれかにベットしてください。'
  );

  const phaseRef = useRef<Phase>('betting');
  const bankrollRef = useRef<number>(INITIAL_BANKROLL);
  const betsRef = useRef<Bets>(emptyBets());
  const betStackRef = useRef<WagerPlacement[]>([]);
  const chipRef = useRef<number>(25);
  const shoeRef = useRef<Card[]>([]);
  const timersRef = useRef<number[]>([]);
  const runRef = useRef(0);
  const settledRef = useRef(false);
  const roundNoRef = useRef(1);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }
      timersRef.current = [];
    };
  }, []);

  const commitBankroll = (next: number) => {
    const safeValue = Math.max(0, Math.floor(next));
    bankrollRef.current = safeValue;
    setBankroll(safeValue);
  };

  const commitBets = (next: Bets) => {
    betsRef.current = next;
    setBets(next);
  };

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((entry) => entry !== timer);
      callback();
    }, delay);
    timersRef.current.push(timer);
  };

  const betTotal = bets.player + bets.banker + bets.tie;
  const availableForBet =
    phase === 'betting'
      ? Math.max(0, Math.min(bankroll - betTotal, TABLE_LIMIT - betTotal))
      : 0;
  const canWager = phase === 'betting';

  const visibleDeal = sequence.slice(0, visibleCount);
  const playerCards = visibleDeal.filter((entry) => entry.side === 'player').map((entry) => entry.card);
  const bankerCards = visibleDeal.filter((entry) => entry.side === 'banker').map((entry) => entry.card);
  const playerScore = handTotal(playerCards);
  const bankerScore = handTotal(bankerCards);
  const phaseLabel = phase === 'betting' ? 'BETS OPEN' : phase === 'dealing' ? 'DEALING' : 'SETTLED';

  const handleSelectChip = (amount: number) => {
    if (phaseRef.current !== 'betting') return;
    chipRef.current = amount;
    setSelectedChip(amount);
    setNotice(`${formatChips(amount)}チップを選択中です。ベットエリアをタップしてください。`);
  };

  const handlePlaceBet = (spot: BetSpot) => {
    if (phaseRef.current !== 'betting') {
      setNotice('ディール中はベットを変更できません。');
      return;
    }

    const amount = chipRef.current;
    const current = betsRef.current;
    const currentTotal = current.player + current.banker + current.tie;
    const available = Math.min(bankrollRef.current - currentTotal, TABLE_LIMIT - currentTotal);

    if (amount <= 0 || available < amount) {
      setNotice(
        available >= MIN_BET
          ? `追加できるのは${formatChips(available)}チップまでです。`
          : 'ベットできる仮想チップがありません。リセットで新しいセッションを始められます。'
      );
      return;
    }

    const next = { ...current };
    next[spot] += amount;
    commitBets(next);
    const nextStack = [...betStackRef.current, { spot, amount }];
    betStackRef.current = nextStack;
    setBetStack(nextStack);
    setNotice(`${SPOT_JA[spot]}に${formatChips(amount)}チップを置きました。`);
  };

  const handleUndoBet = () => {
    if (phaseRef.current !== 'betting') {
      setNotice('ディール中はベットを取り消せません。');
      return;
    }

    const stack = betStackRef.current;
    const last = stack[stack.length - 1];
    if (!last) {
      setNotice('取り消せるベットがありません。');
      return;
    }

    const nextStack = stack.slice(0, -1);
    betStackRef.current = nextStack;
    setBetStack(nextStack);
    const next = { ...betsRef.current };
    next[last.spot] = Math.max(0, next[last.spot] - last.amount);
    commitBets(next);
    setNotice('最後に置いたチップを取り消しました。');
  };

  const handleClearBets = () => {
    if (phaseRef.current !== 'betting') {
      setNotice('ディール中はベットをクリアできません。');
      return;
    }

    const current = betsRef.current;
    const currentTotal = current.player + current.banker + current.tie;
    if (currentTotal === 0) {
      setNotice('クリアするベットがありません。');
      return;
    }

    commitBets(emptyBets());
    betStackRef.current = [];
    setBetStack([]);
    setNotice('ベットをクリアしました。');
  };

  const handleDeal = () => {
    if (phaseRef.current !== 'betting') return;

    const wagers = { ...betsRef.current };
    const totalBet = wagers.player + wagers.banker + wagers.tie;

    if (totalBet < MIN_BET) {
      setNotice('ベットエリアにチップを置いてからカードを配ってください。');
      return;
    }

    if (totalBet > bankrollRef.current) {
      setNotice('仮想チップの残高を超えるベットはできません。');
      return;
    }

    if (shoeRef.current.length < 20) {
      shoeRef.current = buildShuffledShoe();
    }

    let round: ResolvedRound;
    try {
      round = resolveRound(shoeRef.current);
    } catch {
      shoeRef.current = buildShuffledShoe();
      round = resolveRound(shoeRef.current);
    }

    const runId = runRef.current + 1;
    runRef.current = runId;
    settledRef.current = false;
    phaseRef.current = 'dealing';

    setPhase('dealing');
    setSequence(round.sequence);
    setVisibleCount(0);
    setResult(null);
    setShoeRemaining(shoeRef.current.length);
    commitBankroll(bankrollRef.current - totalBet);
    setNotice('カードを配っています。');

    const startDelay = 420;
    const stepDelay = 360;
    const entryRound = roundNoRef.current;

    round.sequence.forEach((_, index) => {
      schedule(() => {
        if (runRef.current !== runId) return;
        setVisibleCount(index + 1);
      }, startDelay + index * stepDelay);
    });

    schedule(() => {
      if (runRef.current !== runId || settledRef.current) return;
      settledRef.current = true;
      const returns = calculateReturns(round.outcome, wagers);
      commitBankroll(bankrollRef.current + returns.returned);
      const net = returns.returned - totalBet;
      const entry: HistoryEntry = {
        id: entryRound,
        outcome: round.outcome,
        playerScore: round.playerScore,
        bankerScore: round.bankerScore,
        totalBet,
        returned: returns.returned,
        net,
      };
      setHistory((previous) => [entry, ...previous].slice(0, 8));
      setResult({
        outcome: round.outcome,
        playerScore: round.playerScore,
        bankerScore: round.bankerScore,
        wagers,
        totalBet,
        net,
        ...returns,
      });
      phaseRef.current = 'result';
      setPhase('result');
      setNotice(
        `${OUTCOME_JA[round.outcome]}。払戻 ${formatChips(returns.returned)}チップ、収支 ${formatSigned(net)}。`
      );
    }, startDelay + round.sequence.length * stepDelay + 420);
  };

  const handleNextRound = () => {
    if (phaseRef.current !== 'result') return;
    phaseRef.current = 'betting';
    setPhase('betting');
    commitBets(emptyBets());
    betStackRef.current = [];
    setBetStack([]);
    setSequence([]);
    setVisibleCount(0);
    setResult(null);
    roundNoRef.current += 1;
    setRoundNumber(roundNoRef.current);
    setNotice('チップを選んでベットしてください。');
  };

  const handleReset = () => {
    runRef.current += 1;
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [];
    settledRef.current = false;
    phaseRef.current = 'betting';
    shoeRef.current = [];
    roundNoRef.current = 1;
    chipRef.current = 25;
    bankrollRef.current = INITIAL_BANKROLL;
    betsRef.current = emptyBets();
    betStackRef.current = [];
    setPhase('betting');
    setBankroll(INITIAL_BANKROLL);
    setSelectedChip(25);
    setBets(emptyBets());
    setBetStack([]);
    setSequence([]);
    setVisibleCount(0);
    setResult(null);
    setHistory([]);
    setRoundNumber(1);
    setShoeRemaining(SHOE_DECKS * 52);
    setNotice('セッションをリセットしました。1,000チップから新しく始められます。');
  };

  return (
    <section className="baccarat-royal min-h-screen bg-[#0a110d] px-3 py-5 text-[#f2e8d5] sm:px-6 sm:py-8">
      <style>{`
        @keyframes baccaratCardIn {
          from { opacity: 0; transform: translate3d(0, -14px, 0) rotate(-3deg); }
          to { opacity: 1; transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        @keyframes baccaratResultIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .baccarat-card { animation: baccaratCardIn 300ms cubic-bezier(0.2, 0.85, 0.3, 1) both; }
        .baccarat-result { animation: baccaratResultIn 360ms ease-out both; }
        .baccarat-felt {
          background-color: #0d372a;
          background-image: radial-gradient(circle at 52% 16%, rgba(244, 232, 207, 0.06), transparent 52%), repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.08) 0, rgba(0, 0, 0, 0.08) 1px, transparent 1px, transparent 5px);
        }
        .baccarat-wood {
          background-color: #2b1b10;
          background-image: repeating-linear-gradient(90deg, rgba(255, 235, 200, 0.035) 0, rgba(255, 235, 200, 0.035) 1px, transparent 1px, transparent 7px), linear-gradient(180deg, #3a2517, #24160d);
        }
        @media (prefers-reduced-motion: reduce) {
          .baccarat-card, .baccarat-result { animation: none; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1180px]">
        <header className="flex items-center justify-between gap-3 border-b border-[#33463a] pb-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
            <RoyalCrest />
            <div className="min-w-0">
              <p className="font-label text-[8px] text-[#c9a15d] sm:text-[10px]">PUNTO BANCO SALON</p>
              <h2 className="font-editorial truncate text-xl leading-tight sm:text-3xl">バカラ・ロイヤル</h2>
              <p className="mt-0.5 font-label text-[7px] text-[#9e927f] sm:text-[9px]">VIRTUAL CHIPS ONLY</p>
            </div>
          </div>
          <div className="shrink-0 rounded-md border border-[#6b4a2a] bg-[#17130e] px-2.5 py-1.5 text-right sm:px-4 sm:py-2">
            <p className="font-label text-[8px] text-[#c9a15d] sm:text-[9px]">BANKROLL</p>
            <p className="font-editorial text-lg leading-tight text-[#f2e8d5] sm:text-2xl">
              {formatChips(bankroll)}
            </p>
            <p className="font-label text-[7px] text-[#9e927f] sm:text-[8px]">仮想チップ</p>
          </div>
        </header>

        <div
          className="mt-3 rounded-md border border-[#33463a] bg-[#111b16] px-3 py-2 text-[11px] leading-5 text-[#d8cdb8] sm:text-xs"
          aria-live="polite"
        >
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#c9a15d] align-middle" aria-hidden="true" />
          {notice}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-5">
          <div className="min-w-0">
            <div className="baccarat-wood rounded-[20px] border border-[#6b4a2a] p-2 shadow-[0_18px_42px_rgba(0,0,0,0.46)] sm:p-3">
              <div className="baccarat-felt rounded-[13px] border border-[#b9975b]/50 p-2.5 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[#dfcba7]/20 pb-2 font-label text-[8px] text-[#cfc0a6] sm:text-[9px]">
                  <span>ROUND {String(roundNumber).padStart(2, '0')}</span>
                  <span className={phase === 'result' ? 'text-[#e2c47e]' : 'text-[#b9cbbf]'}>{phaseLabel}</span>
                  <span>8-DECK SHOE / {formatChips(shoeRemaining)} CARDS</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-4">
                  <HandPanel side="player" cards={playerCards} score={playerScore} />
                  <HandPanel side="banker" cards={bankerCards} score={bankerScore} />
                </div>

                <div className="mt-3 sm:mt-4">
                  {result ? (
                    <ResultPanel result={result} />
                  ) : (
                    <div className="flex min-h-[52px] items-center justify-between gap-3 rounded border border-dashed border-[#c9a15d]/30 bg-[#091a13]/55 px-3 py-2">
                      <span className="font-label shrink-0 text-[8px] text-[#c9a15d] sm:text-[9px]">
                        {phase === 'dealing' ? 'DEALING' : 'AWAITING WAGER'}
                      </span>
                      <span className="text-right text-[10px] leading-4 text-[#cfc0a6] sm:text-xs">
                        {phase === 'dealing' ? 'カードを配っています。' : 'ベットを置いて「カードを配る」を押してください。'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 border-t border-[#dfcba7]/20 pt-3 sm:mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-label text-[8px] text-[#c9a15d] sm:text-[9px]">WAGER</span>
                    <span className="text-[10px] text-[#cfc0a6] sm:text-xs">
                      合計 {formatChips(betTotal)} / 上限 {formatChips(TABLE_LIMIT)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {SPOTS.map((spot) => {
                      const isWinner = result?.outcome === spot;
                      const isPlayer = spot === 'player';
                      const isBanker = spot === 'banker';
                      return (
                        <button
                          key={spot}
                          type="button"
                          onClick={() => handlePlaceBet(spot)}
                          disabled={!canWager || availableForBet < MIN_BET}
                          aria-label={`${SPOT_JA[spot]}にベット。配当${SPOT_ODDS[spot]}`}
                          className={`relative flex min-h-[92px] flex-col items-center justify-center rounded-md border px-1.5 py-2 text-center transition-colors disabled:cursor-not-allowed ${
                            isWinner
                              ? 'border-[#e2c47e]'
                              : 'border-[#b9975b]/40'
                          } ${
                            isPlayer
                              ? 'bg-[#0c3025]/90 hover:border-[#d8bd83] hover:bg-[#104032]'
                              : isBanker
                                ? 'bg-[#48181f]/90 hover:border-[#d8bd83] hover:bg-[#561d25]'
                                : 'bg-[#2a2417]/90 hover:border-[#d8bd83] hover:bg-[#352d1c]'
                          }`}
                        >
                          <span className="font-label text-[9px] text-[#e2c47e] sm:text-[10px]">{SPOT_EN[spot]}</span>
                          <span className="mt-0.5 text-[11px] font-bold text-[#f2e8d5] sm:text-sm">{SPOT_JA[spot]}</span>
                          <span className="mt-0.5 font-label text-[8px] text-[#cfc0a6] sm:text-[9px]">{SPOT_ODDS[spot]}</span>
                          <span className={`mt-1 text-[9px] sm:text-[10px] ${bets[spot] > 0 ? 'font-bold text-[#f5e8ca]' : 'text-[#a99a82]'}`}>
                            {bets[spot] > 0 ? `ベット ${formatChips(bets[spot])}` : 'ベットなし'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[#4a3724] bg-[#17130e] p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-label text-[9px] text-[#c9a15d]">CHIPS</span>
                  {CHIP_VALUES.map((amount) => {
                    const isSelected = selectedChip === amount;
                    const isDisabled = !canWager || amount > availableForBet;
                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleSelectChip(amount)}
                        disabled={isDisabled}
                        aria-pressed={isSelected}
                        aria-label={`${formatChips(amount)}チップを選択`}
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform disabled:cursor-not-allowed disabled:opacity-45 ${
                          isSelected
                            ? 'scale-105 border-[#f2e8d5] shadow-[0_3px_0_#0a0806]'
                            : 'border-[#8d6a3a] hover:scale-105'
                        }`}
                        style={{
                          background:
                            'repeating-conic-gradient(#f2e8d5 0deg 22.5deg, #c9a15d 22.5deg 45deg)',
                        }}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9a15d]/70 bg-[#24170f] font-label text-[9px] text-[#f2e8d5]">
                          {formatChips(amount)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-[#b7a78d]">
                  選択中 {formatChips(selectedChip)} / 追加可能 {phase === 'betting' ? formatChips(availableForBet) : '—'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-[1fr_1fr_1fr_2fr]">
                <button
                  type="button"
                  onClick={handleUndoBet}
                  disabled={!canWager || betStack.length === 0}
                  className="min-h-11 rounded border border-[#5a452c] bg-[#241c13] px-2 text-[11px] font-bold text-[#e6dac4] transition-colors hover:bg-[#2f2418] disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs"
                >
                  1枚戻す
                </button>
                <button
                  type="button"
                  onClick={handleClearBets}
                  disabled={!canWager || betTotal === 0}
                  className="min-h-11 rounded border border-[#5a452c] bg-[#241c13] px-2 text-[11px] font-bold text-[#e6dac4] transition-colors hover:bg-[#2f2418] disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs"
                >
                  クリア
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-11 rounded border border-[#5a3a3a] bg-[#251516] px-2 text-[11px] font-bold text-[#e0c8bd] transition-colors hover:bg-[#321b1d] sm:text-xs"
                >
                  リセット
                </button>
                {phase === 'result' ? (
                  <button
                    type="button"
                    onClick={handleNextRound}
                    className="col-span-2 min-h-12 rounded border border-[#d8bd83] bg-[#c9a15d] px-3 text-sm font-black text-[#22180e] transition-colors hover:bg-[#d8b671] sm:col-span-1"
                  >
                    次のラウンドへ
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeal}
                    disabled={!canWager || betTotal < MIN_BET}
                    className="col-span-2 min-h-12 rounded border border-[#d8bd83] bg-[#6d2027] px-3 text-sm font-black text-[#f8eedb] transition-colors hover:bg-[#7d252d] disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-1"
                  >
                    {phase === 'dealing' ? '配布中...' : `カードを配る（${formatChips(betTotal)}）`}
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-lg border border-[#3e3223] bg-[#15120e] p-3 sm:p-4">
              <div className="flex items-center justify-between border-b border-[#3e3223] pb-2">
                <h3 className="font-editorial text-base">ラウンド履歴</h3>
                <span className="font-label text-[8px] text-[#c9a15d]">LAST {history.length}</span>
              </div>
              {history.length === 0 ? (
                <p className="py-4 text-[11px] leading-5 text-[#a99a82]">
                  まだ勝負はありません。最初のベットからどうぞ。
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#2b2319] py-1.5 text-[10px] last:border-0 sm:text-[11px]"
                    >
                      <span className="font-label text-[8px] text-[#8d7d65]">R{entry.id}</span>
                      <span className="min-w-0 truncate">
                        <span
                          className={
                            entry.outcome === 'player'
                              ? 'font-bold text-[#a9cdb8]'
                              : entry.outcome === 'banker'
                                ? 'font-bold text-[#d9a39b]'
                                : 'font-bold text-[#e2c47e]'
                          }
                        >
                          {SPOT_EN[entry.outcome]}
                        </span>
                        <span className="ml-1.5 text-[#9e927f]">
                          {entry.playerScore} - {entry.bankerScore}
                        </span>
                      </span>
                      <span className={`text-right font-bold ${entry.net >= 0 ? 'text-[#d8bd83]' : 'text-[#c98a7a]'}`}>
                        {formatSigned(entry.net)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-[#3e3223] bg-[#15120e] p-3 sm:p-4">
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
                  <span className="font-editorial text-base">ルールと配当</span>
                  <span className="text-lg leading-none text-[#c9a15d] transition-transform group-open:rotate-45" aria-hidden="true">
                    ＋
                  </span>
                </summary>
                <div className="mt-2 border-t border-[#3e3223] pt-3 text-[11px] leading-5 text-[#c3b6a1]">
                  <p>
                    プレイヤーとバンカーに2枚ずつカードを配り、合計の下一桁が9に近い方が勝ちです。Aは1、2〜9は数字、10・J・Q・Kは0として数えます。
                  </p>
                  <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                    <dt className="font-bold text-[#e6dac4]">プレイヤー</dt>
                    <dd>1:1</dd>
                    <dt className="font-bold text-[#e6dac4]">バンカー</dt>
                    <dd>0.95:1（5%手数料・端数切り捨て）</dd>
                    <dt className="font-bold text-[#e6dac4]">タイ</dt>
                    <dd>8:1</dd>
                  </dl>
                  <p className="mt-3 font-bold text-[#e6dac4]">3枚目のルール</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    <li>最初の2枚で8または9のナチュラルなら、3枚目は配りません。</li>
                    <li>プレイヤーは0〜5で3枚目を引き、6〜7はスタンドします。</li>
                    <li>バンカーはプレイヤーがスタンドした場合、0〜5で3枚目を引きます。</li>
                    <li>プレイヤーが3枚目を引いた場合、バンカーは標準のバンカー表に従ってドローします。</li>
                    <li>タイ成立時、プレイヤーとバンカーへのベットはプッシュ返却されます。</li>
                  </ul>
                </div>
              </details>
            </section>

            <section className="rounded-lg border border-[#4b2a2a] bg-[#1d1211] p-3 sm:p-4">
              <p className="font-label text-[8px] text-[#c98a7a]">RESPONSIBLE PLAY</p>
              <p className="mt-1.5 text-[10px] leading-5 text-[#cdb9a6] sm:text-[11px]">
                本ゲームは娯楽目的で、仮想チップのみを使用します。実際の金銭、景品、暗号資産などのやり取りは一切ありません。18歳以上の方が余暇として楽しむものとし、長時間のプレイを避けて適度に休憩してください。
              </p>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
