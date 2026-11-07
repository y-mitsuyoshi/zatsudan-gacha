'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Link from 'next/link';

const STARTING_BANKROLL = 10000;
const HISTORY_LIMIT = 10;
const SPIN_DURATION = 4800;
const CHIP_VALUES = [10, 50, 100, 500] as const;
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const SECTOR_ANGLE = 360 / WHEEL_ORDER.length;
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const NUMBER_ROWS = Array.from({ length: 12 }, (_, row) => [
  row * 3 + 3,
  row * 3 + 2,
  row * 3 + 1,
]);

const NUMBER_TABLE_ROWS = Array.from({ length: 3 }, (_, row) =>
  Array.from({ length: 12 }, (_, column) => column * 3 + 3 - row),
);

const NUMBER_SIX_ROWS = [
  [3, 6, 9, 12, 15, 18],
  [21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17],
  [20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16],
  [19, 22, 25, 28, 31, 34],
];

const CHIP_STYLES: { value: ChipValue; face: string; edge: string; text: string }[] = [
  { value: 10, face: '#e4d0a4', edge: '#9a7844', text: '#2c1d0e' },
  { value: 50, face: '#a84b43', edge: '#6c2a26', text: '#fff4df' },
  { value: 100, face: '#356a58', edge: '#1f463a', text: '#f8ecd6' },
  { value: 500, face: '#3b352c', edge: '#171411', text: '#f4dfb5' },
];

const DOZEN_BETS = [
  { id: 'd1', label: '1st 12', range: '1-12' },
  { id: 'd2', label: '2nd 12', range: '13-24' },
  { id: 'd3', label: '3rd 12', range: '25-36' },
];

const OUTSIDE_BETS = [
  {
    id: 'red',
    label: 'RED',
    sub: '赤',
    className: 'border-[#a9665b] bg-[#712c28] hover:bg-[#80342f]',
  },
  {
    id: 'black',
    label: 'BLACK',
    sub: '黒',
    className: 'border-[#6f675b] bg-[#1b1a18] hover:bg-[#262421]',
  },
  {
    id: 'odd',
    label: 'ODD',
    sub: '奇数',
    className: 'border-[#665039] bg-[#2a211a] hover:bg-[#33281f]',
  },
  {
    id: 'even',
    label: 'EVEN',
    sub: '偶数',
    className: 'border-[#665039] bg-[#2a211a] hover:bg-[#33281f]',
  },
  {
    id: 'low',
    label: '1-18',
    sub: 'ロー',
    className: 'border-[#665039] bg-[#2a211a] hover:bg-[#33281f]',
  },
  {
    id: 'high',
    label: '19-36',
    sub: 'ハイ',
    className: 'border-[#665039] bg-[#2a211a] hover:bg-[#33281f]',
  },
];

type ChipValue = (typeof CHIP_VALUES)[number];
type Phase = 'betting' | 'spinning';
type ResultColor = 'green' | 'red' | 'black';
type NoticeTone = 'neutral' | 'win' | 'lose' | 'warn';

type HistoryEntry = {
  id: number;
  number: number;
  color: ResultColor;
  stake: number;
  payout: number;
  net: number;
};

type PendingSpin = {
  result: number;
  totalStake: number;
  totalReturn: number;
};

type GameState = {
  bankroll: number;
  bets: Record<string, number>;
  phase: Phase;
  lastResult: number | null;
  pendingSpin: PendingSpin | null;
  history: HistoryEntry[];
  rounds: number;
  sessionNet: number;
  serial: number;
  notice: string;
  noticeTone: NoticeTone;
};

type GameAction =
  | { type: 'PLACE_BET'; spotId: string; amount: number }
  | { type: 'CLEAR_BETS' }
  | { type: 'START_SPIN'; result: number; totalReturn: number }
  | { type: 'SETTLE_SPIN' }
  | { type: 'RESET' };

const INITIAL_STATE: GameState = {
  bankroll: STARTING_BANKROLL,
  bets: {},
  phase: 'betting',
  lastResult: null,
  pendingSpin: null,
  history: [],
  rounds: 0,
  sessionNet: 0,
  serial: 0,
  notice: 'チップを選び、ベッティングボードに置いてください。',
  noticeTone: 'neutral',
};

const STRAIGHT_IDS = new Set(Array.from({ length: 37 }, (_, number) => `n-${number}`));
const OUTSIDE_IDS = new Set(['red', 'black', 'odd', 'even', 'low', 'high', 'd1', 'd2', 'd3']);

const NOTICE_TONE_CLASS: Record<NoticeTone, string> = {
  neutral: 'text-[#d8c8ab]',
  win: 'text-[#b9d6bd]',
  lose: 'text-[#d8a69a]',
  warn: 'text-[#e0b56f]',
};

const SPOT_LABELS: Record<string, string> = {
  red: '赤（RED）',
  black: '黒（BLACK）',
  odd: '奇数（ODD）',
  even: '偶数（EVEN）',
  low: 'ロー 1-18',
  high: 'ハイ 19-36',
  d1: '第1ダズン 1-12',
  d2: '第2ダズン 13-24',
  d3: '第3ダズン 25-36',
};

function formatChips(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getResultColor(number: number): ResultColor {
  if (number === 0) return 'green';
  return RED_NUMBERS.has(number) ? 'red' : 'black';
}

function getColorLabel(color: ResultColor): string {
  if (color === 'green') return '緑（0）';
  if (color === 'red') return '赤';
  return '黒';
}

function getResultColorClass(color: ResultColor): string {
  if (color === 'red') return 'border-[#c98b7f] bg-[#7d302d] text-[#fff1db]';
  if (color === 'black') return 'border-[#8b8478] bg-[#1c1b19] text-[#f2e6cf]';
  return 'border-[#8fb9a1] bg-[#215844] text-[#f2e6cf]';
}

function isValidSpot(spotId: string): boolean {
  return STRAIGHT_IDS.has(spotId) || OUTSIDE_IDS.has(spotId);
}

function getSpotMultiplier(spotId: string): number {
  if (spotId.startsWith('n-')) return 36;
  if (spotId === 'd1' || spotId === 'd2' || spotId === 'd3') return 3;
  return 2;
}

function isSpotWinner(spotId: string, result: number): boolean {
  if (spotId.startsWith('n-')) {
    return Number(spotId.slice(2)) === result;
  }
  if (result === 0) return false;
  if (spotId === 'red') return RED_NUMBERS.has(result);
  if (spotId === 'black') return !RED_NUMBERS.has(result);
  if (spotId === 'odd') return result % 2 === 1;
  if (spotId === 'even') return result % 2 === 0;
  if (spotId === 'low') return result <= 18;
  if (spotId === 'high') return result >= 19;
  if (spotId === 'd1') return result <= 12;
  if (spotId === 'd2') return result >= 13 && result <= 24;
  if (spotId === 'd3') return result >= 25;
  return false;
}

function calculateTotalReturn(bets: Record<string, number>, result: number): number {
  return Object.entries(bets).reduce((total, [spotId, amount]) => {
    if (!isSpotWinner(spotId, result)) return total;
    return total + amount * getSpotMultiplier(spotId);
  }, 0);
}

function calculateMaxReturn(bets: Record<string, number>): number {
  let maximum = 0;
  for (let number = 0; number <= 36; number += 1) {
    maximum = Math.max(maximum, calculateTotalReturn(bets, number));
  }
  return maximum;
}

function getSpotLabel(spotId: string): string {
  if (spotId.startsWith('n-')) return `ストレート ${spotId.slice(2)}`;
  return SPOT_LABELS[spotId] ?? spotId;
}

function getSpotSortKey(spotId: string): number {
  if (spotId === 'd1') return 0;
  if (spotId === 'd2') return 1;
  if (spotId === 'd3') return 2;
  const outsideIndex = ['red', 'black', 'odd', 'even', 'low', 'high'].indexOf(spotId);
  if (outsideIndex >= 0) return 200 + outsideIndex;
  return 10 + Number(spotId.slice(2));
}

function randomIndex(maxExclusive: number): number {
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.getRandomValues === 'function'
  ) {
    const range = 0x100000000;
    const limit = range - (range % maxExclusive);
    const buffer = new Uint32Array(1);
    let value = 0;
    do {
      window.crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function polarPoint(radius: number, angle: number): { x: number; y: number } {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: Math.round((200 + radius * Math.cos(radians)) * 1000) / 1000,
    y: Math.round((200 + radius * Math.sin(radians)) * 1000) / 1000,
  };
}

const WHEEL_SECTORS = WHEEL_ORDER.map((number, index) => {
  const centerAngle = index * SECTOR_ANGLE;
  const startAngle = centerAngle - SECTOR_ANGLE / 2;
  const endAngle = centerAngle + SECTOR_ANGLE / 2;
  const outerStart = polarPoint(178, startAngle);
  const outerEnd = polarPoint(178, endAngle);
  const innerEnd = polarPoint(100, endAngle);
  const innerStart = polarPoint(100, startAngle);
  const color = getResultColor(number);
  const fill = color === 'green' ? '#215844' : color === 'red' ? '#7d302d' : '#1c1b19';
  return {
    number,
    centerAngle,
    fill,
    path: `M ${outerStart.x} ${outerStart.y} A 178 178 0 0 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A 100 100 0 0 0 ${innerStart.x} ${innerStart.y} Z`,
  };
});

function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'PLACE_BET') {
    if (state.phase !== 'betting' || !isValidSpot(action.spotId)) return state;
    if (!Number.isInteger(action.amount) || action.amount <= 0) return state;
    if (action.amount > state.bankroll) {
      return {
        ...state,
        notice: '残高が足りません。ベットをクリアするかリセットしてください。',
        noticeTone: 'warn',
      };
    }
    return {
      ...state,
      bankroll: state.bankroll - action.amount,
      bets: {
        ...state.bets,
        [action.spotId]: (state.bets[action.spotId] ?? 0) + action.amount,
      },
      notice: `${getSpotLabel(action.spotId)} に ${formatChips(action.amount)} チップを置きました。`,
      noticeTone: 'neutral',
    };
  }

  if (action.type === 'CLEAR_BETS') {
    if (state.phase !== 'betting') return state;
    const totalStake = Object.values(state.bets).reduce((total, amount) => total + amount, 0);
    if (totalStake <= 0) return state;
    return {
      ...state,
      bankroll: state.bankroll + totalStake,
      bets: {},
      notice: `${formatChips(totalStake)} チップを手元に戻しました。`,
      noticeTone: 'neutral',
    };
  }

  if (action.type === 'START_SPIN') {
    if (state.phase !== 'betting') return state;
    const totalStake = Object.values(state.bets).reduce((total, amount) => total + amount, 0);
    if (totalStake <= 0) {
      return {
        ...state,
        notice: 'スピンする前にチップをベットしてください。',
        noticeTone: 'warn',
      };
    }
    return {
      ...state,
      phase: 'spinning',
      lastResult: null,
      pendingSpin: {
        result: action.result,
        totalStake,
        totalReturn: action.totalReturn,
      },
      notice: 'ホイールが回転しています。結果をお待ちください。',
      noticeTone: 'neutral',
    };
  }

  if (action.type === 'SETTLE_SPIN') {
    if (state.phase !== 'spinning' || !state.pendingSpin) return state;
    const { result, totalStake, totalReturn } = state.pendingSpin;
    const net = totalReturn - totalStake;
    const color = getResultColor(result);
    const entry: HistoryEntry = {
      id: state.serial + 1,
      number: result,
      color,
      stake: totalStake,
      payout: totalReturn,
      net,
    };
    const netLabel = net >= 0 ? `+${formatChips(net)}` : formatChips(net);
    return {
      ...state,
      bankroll: state.bankroll + totalReturn,
      bets: {},
      phase: 'betting',
      lastResult: result,
      pendingSpin: null,
      history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
      rounds: state.rounds + 1,
      sessionNet: state.sessionNet + net,
      serial: entry.id,
      notice:
        totalReturn > 0
          ? `結果は ${result}（${getColorLabel(color)}）。払戻 ${formatChips(totalReturn)} チップ、収支 ${netLabel} チップ。`
          : `結果は ${result}（${getColorLabel(color)}）。残念ながら払戻はありません。`,
      noticeTone: totalReturn > 0 && net > 0 ? 'win' : totalReturn > 0 ? 'neutral' : 'lose',
    };
  }

  if (state.phase === 'spinning') return state;
  return {
    ...INITIAL_STATE,
    bets: {},
    history: [],
    notice: '新しいセッションを開始しました。チップを選んでベットしてください。',
  };
}

function BetMarker({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  const label = amount >= 1000 ? `${Math.round(amount / 100) / 10}k` : String(amount);
  return (
    <span className="pointer-events-none absolute bottom-0.5 right-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full border border-[#e7cc96] bg-[#f1e1bf] px-0.5 text-[8px] font-black leading-none text-[#382313]">
      {label}
    </span>
  );
}

type NumberCellProps = {
  number: number;
  amount: number;
  disabled: boolean;
  highlighted: boolean;
  onPlace: (spotId: string) => void;
};

function NumberCell({ number, amount, disabled, highlighted, onPlace }: NumberCellProps) {
  const color = getResultColor(number);
  const colorClass =
    color === 'green'
      ? 'border-[#8fb9a1] bg-[#215844] hover:bg-[#276650]'
      : color === 'red'
        ? 'border-[#a9665b] bg-[#712c28] hover:bg-[#80342f]'
        : 'border-[#6f675b] bg-[#1b1a18] hover:bg-[#262421]';
  return (
    <button
      type="button"
      onClick={() => onPlace(`n-${number}`)}
      disabled={disabled}
      aria-label={`${number} に ${amount > 0 ? `現在 ${formatChips(amount)} チップ、` : ''}チップを置く`}
      className={`relative flex min-h-11 min-w-0 items-center justify-center rounded-sm border text-sm font-bold text-[#f2e6cf] transition-colors sm:text-[13px] ${colorClass} ${
        highlighted ? 'ring-2 ring-[#e7cc96] ring-offset-1 ring-offset-[#123a2f]' : ''
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {number}
      <BetMarker amount={amount} />
    </button>
  );
}

export default function GrandRouletteGame() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [selectedChip, setSelectedChip] = useState<ChipValue>(10);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(SPIN_DURATION);
  const rotationRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const spinTokenRef = useRef(0);
  const spinGuardRef = useRef(false);

  const isSpinning = state.phase === 'spinning';
  const totalStake = useMemo(
    () => Object.values(state.bets).reduce((total, amount) => total + amount, 0),
    [state.bets],
  );
  const maxReturn = useMemo(() => calculateMaxReturn(state.bets), [state.bets]);
  const betEntries = useMemo(
    () =>
      Object.entries(state.bets).sort(
        ([spotA], [spotB]) => getSpotSortKey(spotA) - getSpotSortKey(spotB),
      ),
    [state.bets],
  );
  const canSpin = !isSpinning && totalStake > 0;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      spinTokenRef.current += 1;
    };
  }, []);

  function placeBet(spotId: string) {
    if (isSpinning) return;
    dispatch({ type: 'PLACE_BET', spotId, amount: selectedChip });
  }

  function clearBets() {
    if (isSpinning) return;
    dispatch({ type: 'CLEAR_BETS' });
  }

  function resetGame() {
    if (isSpinning) return;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    spinTokenRef.current += 1;
    spinGuardRef.current = false;
    setSelectedChip(10);
    dispatch({ type: 'RESET' });
  }

  function spinWheel() {
    if (spinGuardRef.current || state.phase !== 'betting' || totalStake <= 0) return;
    spinGuardRef.current = true;

    const resultIndex = randomIndex(WHEEL_ORDER.length);
    const result = WHEEL_ORDER[resultIndex];
    const totalReturn = calculateTotalReturn(state.bets, result);
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 500 : SPIN_DURATION;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const targetMod = ((360 - ((resultIndex * SECTOR_ANGLE) % 360)) % 360 + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta < 0) delta += 360;
    const nextRotation = rotationRef.current + delta + 360 * (reducedMotion ? 0 : 6);

    dispatch({ type: 'START_SPIN', result, totalReturn });
    setSpinDuration(duration);
    setRotation(nextRotation);
    rotationRef.current = nextRotation;

    const token = spinTokenRef.current + 1;
    spinTokenRef.current = token;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      if (spinTokenRef.current !== token) return;
      dispatch({ type: 'SETTLE_SPIN' });
      spinGuardRef.current = false;
      timeoutRef.current = null;
    }, duration + 120);
  }

  return (
    <div
      className="tabletop-page overflow-x-hidden text-[#f2e6cf]"
      style={{
        backgroundColor: '#0d1512',
        backgroundImage:
          'radial-gradient(circle at 18% 0%, rgba(126, 91, 47, 0.2), transparent 34rem), radial-gradient(circle at 84% 14%, rgba(94, 35, 32, 0.22), transparent 32rem), linear-gradient(135deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 9px)',
        backgroundSize: 'auto, auto, 9px 9px',
      }}
    >
      <header className="sticky top-0 z-20 border-b border-[#4d3d2d] bg-[#14100d]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/games"
              className="tabletop-button inline-flex min-h-11 shrink-0 items-center px-2 text-xs sm:px-3"
            >
              ← <span className="hidden sm:inline">ゲーム</span>一覧
            </Link>
            <div className="min-w-0">
              <p className="tabletop-kicker hidden truncate sm:block">
                European Single Zero · Grand Roulette
              </p>
              <p className="tabletop-title truncate text-base sm:text-xl">グランド・ルーレット</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="tabletop-stat px-2.5 py-1 text-right sm:px-3.5">
              <p className="text-[9px] font-semibold tracking-[0.14em] text-[#b9a88f]">残高</p>
              <p className="font-mono text-sm font-bold text-[#f4ead8] sm:text-base">
                {formatChips(state.bankroll)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <div className="min-w-0">
          <section className="rounded-lg border border-[#6d5333] bg-[#171c18] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_rgba(0,0,0,0.25)] sm:p-5 lg:sticky lg:top-24">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="tabletop-kicker">GRAND ROULETTE</p>
                <h2 className="tabletop-title text-lg sm:text-2xl">欧州式ホイール</h2>
              </div>
              <span className="rounded-sm border border-[#5e4930] px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-[#c8b28d]">
                0-36
              </span>
            </div>

            <div className="relative mx-auto mt-3 aspect-square w-full max-w-[430px] sm:mt-4">
              <div
                className="absolute inset-0"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: `transform ${spinDuration}ms cubic-bezier(0.12, 0.64, 0.14, 1)`,
                  willChange: 'transform',
                }}
              >
                <svg
                  viewBox="0 0 400 400"
                  className="block h-full w-full"
                  role="img"
                  aria-label="0から36までのポケットを持つヨーロピアン・シングルゼロ・ルーレットのホイール"
                >
                  <defs>
                    <radialGradient id="roulette-wood" cx="50%" cy="44%" r="62%">
                      <stop offset="0%" stopColor="#6b4426" />
                      <stop offset="58%" stopColor="#4a2b16" />
                      <stop offset="100%" stopColor="#28160b" />
                    </radialGradient>
                    <linearGradient id="roulette-brass" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e2c58c" />
                      <stop offset="46%" stopColor="#a27b45" />
                      <stop offset="100%" stopColor="#d4ae6c" />
                    </linearGradient>
                    <radialGradient id="roulette-hub" cx="44%" cy="38%" r="62%">
                      <stop offset="0%" stopColor="#7b5a32" />
                      <stop offset="55%" stopColor="#3d2a18" />
                      <stop offset="100%" stopColor="#1d140c" />
                    </radialGradient>
                  </defs>
                  <circle cx="200" cy="200" r="196" fill="url(#roulette-wood)" stroke="#1c1008" strokeWidth="2" />
                  <circle cx="200" cy="200" r="184" fill="#17120e" stroke="url(#roulette-brass)" strokeWidth="5" />
                  <circle cx="200" cy="200" r="178" fill="#12100d" stroke="#6b543d" strokeWidth="1" />
                  {WHEEL_SECTORS.map((sector) => (
                    <path
                      key={sector.number}
                      d={sector.path}
                      fill={sector.fill}
                      stroke="#c4a066"
                      strokeWidth="0.9"
                    />
                  ))}
                  {WHEEL_SECTORS.map((sector) => (
                    <text
                      key={`label-${sector.number}`}
                      x="200"
                      y="64"
                      transform={`rotate(${sector.centerAngle} 200 200)`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#f3e7cf"
                      fontFamily="'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif"
                      fontSize="12.5"
                      fontWeight="700"
                    >
                      {sector.number}
                    </text>
                  ))}
                  <circle cx="200" cy="200" r="99" fill="#17130f" stroke="url(#roulette-brass)" strokeWidth="3" />
                  <circle cx="200" cy="200" r="88" fill="#203027" stroke="#7e5f35" strokeWidth="1" />
                  <g opacity="0.55">
                    {Array.from({ length: 8 }, (_, index) => (
                      <line
                        key={`spoke-${index}`}
                        x1="200"
                        y1="145"
                        x2="200"
                        y2="112"
                        transform={`rotate(${index * 45} 200 200)`}
                        stroke="#b28c55"
                        strokeWidth="1.4"
                      />
                    ))}
                  </g>
                  <circle cx="200" cy="200" r="58" fill="url(#roulette-hub)" stroke="#c7a263" strokeWidth="1.6" />
                  <circle cx="200" cy="200" r="18" fill="#e8d3a6" stroke="#7d5a2e" strokeWidth="1" />
                  <circle cx="200" cy="200" r="7" fill="#b78e50" stroke="#5c3f22" strokeWidth="1" />
                </svg>
              </div>
              <svg
                viewBox="0 0 400 400"
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <polygon points="192,2 208,2 200,19" fill="#c8a469" stroke="#3a2612" strokeWidth="1" />
                <ellipse cx="200" cy="44" rx="5.5" ry="2.2" fill="#000000" opacity="0.28" />
                <circle cx="200" cy="40" r="5.5" fill="#f2e4c6" stroke="#8c744f" strokeWidth="1.2" />
                <circle cx="198.4" cy="38.4" r="1.5" fill="#fffaf0" opacity="0.85" />
              </svg>
            </div>

            <div className="mt-3 rounded-md border border-[#5d482f] bg-[#111713] px-3 py-3" aria-live="polite">
              <div className="flex items-start gap-3">
                {state.lastResult !== null && (
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg font-bold ${getResultColorClass(
                      getResultColor(state.lastResult),
                    )}`}
                  >
                    {state.lastResult}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="tabletop-kicker">{isSpinning ? 'SPINNING' : 'TABLE STATUS'}</p>
                  <p className={`mt-0.5 text-sm font-semibold leading-5 ${NOTICE_TONE_CLASS[state.noticeTone]}`}>
                    {state.notice}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="tabletop-stat px-3 py-2">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-[#b9a88f]">ラウンド</p>
                <p className="font-mono text-lg font-bold text-[#f4ead8]">{state.rounds}</p>
              </div>
              <div className="tabletop-stat px-3 py-2">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-[#b9a88f]">通算収支</p>
                <p
                  className={`font-mono text-lg font-bold ${
                    state.sessionNet > 0
                      ? 'text-[#b9d6bd]'
                      : state.sessionNet < 0
                        ? 'text-[#d8a69a]'
                        : 'text-[#f4ead8]'
                  }`}
                >
                  {state.sessionNet > 0 ? '+' : ''}
                  {formatChips(state.sessionNet)}
                </p>
              </div>
            </div>

            <div className="mt-3 border-t border-[#4d3d2d] pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="tabletop-kicker">RECENT RESULTS</p>
                <span className="text-[10px] text-[#9e8d75]">直近10回</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {state.history.length > 0 ? (
                  state.history.map((entry) => (
                    <span
                      key={entry.id}
                      aria-label={`${entry.number} ${getColorLabel(entry.color)}`}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${getResultColorClass(
                        entry.color,
                      )}`}
                    >
                      {entry.number}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[#9e8d75]">まだ結果はありません。</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
          <section className="rounded-lg border border-[#5d482f] bg-[#1b1915] p-3 sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="tabletop-kicker">CHIP TRAY</p>
                <h2 className="tabletop-title text-lg">チップを選ぶ</h2>
              </div>
              <p className="text-xs text-[#b9a88f]">
                選択中{' '}
                <span className="font-mono text-base font-bold text-[#e6c895]">
                  {formatChips(selectedChip)}
                </span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              {CHIP_STYLES.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setSelectedChip(chip.value)}
                  aria-pressed={selectedChip === chip.value}
                  aria-label={`${chip.value} チップを選択`}
                  disabled={isSpinning}
                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/40 transition sm:h-14 sm:w-14 ${
                    selectedChip === chip.value
                      ? 'outline outline-2 outline-offset-2 outline-[#e8cf9e]'
                      : 'hover:brightness-110'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  style={{
                    background: `repeating-conic-gradient(${chip.edge} 0deg 9deg, ${chip.face} 9deg 36deg)`,
                  }}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-black sm:h-9 sm:w-9 sm:text-xs"
                    style={{
                      backgroundColor: chip.face,
                      borderColor: chip.edge,
                      color: chip.text,
                    }}
                  >
                    {chip.value}
                  </span>
                </button>
              ))}
              <p className="basis-full text-[11px] leading-5 text-[#9e8d75] sm:ml-1 sm:basis-auto">
                仮想チップのみを使用します。実際のお金は使いません。
              </p>
            </div>
          </section>

          <section className="tabletop-panel p-3 sm:p-4" aria-labelledby="roulette-board-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="tabletop-kicker">BETTING BOARD</p>
                <h2 id="roulette-board-heading" className="tabletop-title text-lg">
                  ベッティングボード
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-[#b9a88f]">合計ベット</p>
                <p className="font-mono text-lg font-bold text-[#f4ead8]">{formatChips(totalStake)}</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-[#7b5a34] bg-[#4a2d17] p-1.5">
              <div
                className="rounded-md border border-[#8c6a3f]/60 p-1.5 sm:p-2"
                style={{
                  backgroundColor: '#123a2f',
                  backgroundImage:
                    'radial-gradient(circle at 26% 12%, rgba(244,226,190,0.055), transparent 48%), repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 4px)',
                }}
              >
                <div className="grid grid-cols-3 gap-1">
                  {DOZEN_BETS.map((dozen) => (
                    <button
                      key={dozen.id}
                      type="button"
                      onClick={() => placeBet(dozen.id)}
                      disabled={isSpinning}
                      aria-label={`${dozen.label} ${dozen.range} に ${selectedChip} チップを置く`}
                      className="relative flex min-h-12 flex-col items-center justify-center rounded-sm border border-[#bd9659] bg-[#5d2622] px-1 text-[#f4e6c8] transition-colors hover:bg-[#6d2d28] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="text-xs font-black tracking-[0.12em]">{dozen.label}</span>
                      <span className="text-[10px] text-[#ddc3a1]">{dozen.range}</span>
                      <BetMarker amount={state.bets[dozen.id] ?? 0} />
                    </button>
                  ))}
                </div>

                <div className="mt-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => placeBet('n-0')}
                    disabled={isSpinning}
                    aria-label={`0 に ${state.bets['n-0'] ?? 0} チップ、${selectedChip} チップを追加`}
                    className={`relative flex w-11 shrink-0 items-center justify-center rounded-sm border border-[#8fb9a1] bg-[#215844] text-base font-bold text-[#f2e6cf] transition-colors hover:bg-[#276650] disabled:cursor-not-allowed disabled:opacity-60 ${
                      state.lastResult === 0 ? 'ring-2 ring-[#e7cc96] ring-offset-1 ring-offset-[#123a2f]' : ''
                    }`}
                  >
                    0
                    <BetMarker amount={state.bets['n-0'] ?? 0} />
                  </button>

                  <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 sm:hidden">
                    {NUMBER_ROWS.flat().map((number) => (
                      <NumberCell
                        key={`mobile-${number}`}
                        number={number}
                        amount={state.bets[`n-${number}`] ?? 0}
                        disabled={isSpinning}
                        highlighted={state.lastResult === number}
                        onPlace={placeBet}
                      />
                    ))}
                  </div>

                  <div className="hidden min-w-0 flex-1 grid-cols-6 gap-1 sm:grid xl:hidden">
                    {NUMBER_SIX_ROWS.flat().map((number) => (
                      <NumberCell
                        key={`tablet-${number}`}
                        number={number}
                        amount={state.bets[`n-${number}`] ?? 0}
                        disabled={isSpinning}
                        highlighted={state.lastResult === number}
                        onPlace={placeBet}
                      />
                    ))}
                  </div>

                  <div className="hidden min-w-0 flex-1 grid-cols-12 grid-rows-3 gap-1 xl:grid">
                    {NUMBER_TABLE_ROWS.flat().map((number) => (
                      <NumberCell
                        key={`desktop-${number}`}
                        number={number}
                        amount={state.bets[`n-${number}`] ?? 0}
                        disabled={isSpinning}
                        highlighted={state.lastResult === number}
                        onPlace={placeBet}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-1 grid grid-cols-3 gap-1">
                  {OUTSIDE_BETS.map((bet) => (
                    <button
                      key={bet.id}
                      type="button"
                      onClick={() => placeBet(bet.id)}
                      disabled={isSpinning}
                      aria-label={`${bet.label} ${bet.sub} に ${selectedChip} チップを置く`}
                      className={`relative flex min-h-11 flex-col items-center justify-center rounded-sm border px-1 text-[#f2e6cf] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${bet.className}`}
                    >
                      <span className="text-[11px] font-black tracking-[0.1em] sm:text-xs">{bet.label}</span>
                      <span className="text-[10px] text-[#d8c8ab]">{bet.sub}</span>
                      <BetMarker amount={state.bets[bet.id] ?? 0} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-[#9e8d75]">
              0は緑のポケットです。赤・黒・奇数・偶数・1-18・19-36・ダズンは0で外れます。
            </p>
          </section>

          <section className="rounded-lg border border-[#6d5333] bg-[#171c18] p-3 sm:p-4">
            <button
              type="button"
              onClick={spinWheel}
              disabled={!canSpin}
              className={`flex min-h-12 w-full items-center justify-center rounded-md border px-4 text-base font-black tracking-[0.08em] transition-colors ${
                canSpin
                  ? 'border-[#e0bd7f] bg-[#b98a4c] text-[#1d140b] hover:bg-[#c99a58] active:translate-y-px'
                  : 'cursor-not-allowed border-[#4d3d2d] bg-[#2a241c] text-[#8d7d66]'
              }`}
            >
              {isSpinning ? '回転しています…' : 'スピンする'}
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={clearBets}
                disabled={isSpinning || totalStake === 0}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-3 text-xs disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
              >
                ベットをクリア
              </button>
              <button
                type="button"
                onClick={resetGame}
                disabled={isSpinning}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-3 text-xs disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
              >
                リセット
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] leading-5 text-[#9e8d75]">
              {totalStake > 0
                ? `合計ベット ${formatChips(totalStake)} チップ / 最高払戻 ${formatChips(maxReturn)} チップ`
                : 'チップを選び、盤面をタップしてベットします。'}
            </p>
          </section>

          <section className="tabletop-panel p-3 sm:p-4" aria-labelledby="placed-bets-heading">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="tabletop-kicker">OPEN BETS</p>
                <h2 id="placed-bets-heading" className="tabletop-title text-lg">
                  配置中のベット
                </h2>
              </div>
              <span className="text-[10px] text-[#9e8d75]">{betEntries.length} 箇所</span>
            </div>
            {betEntries.length > 0 ? (
              <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
                {betEntries.map(([spotId, amount]) => (
                  <li
                    key={spotId}
                    className="flex items-center justify-between gap-2 rounded-sm border border-[#413526] bg-black/15 px-2.5 py-1.5 text-xs"
                  >
                    <span className="min-w-0 truncate text-[#d8c8ab]">{getSpotLabel(spotId)}</span>
                    <span className="shrink-0 text-right font-mono text-[11px] text-[#f4ead8]">
                      {formatChips(amount)}
                      <span className="mx-1 text-[#806d54]">/</span>
                      <span className="text-[#c9b083]">
                        当選 {formatChips(amount * getSpotMultiplier(spotId))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-sm border border-dashed border-[#4d3d2d] px-3 py-3 text-xs text-[#9e8d75]">
                まだベットはありません。チップを選んで盤面に置いてください。
              </p>
            )}
          </section>

          <section className="tabletop-panel p-3 sm:p-4" aria-labelledby="round-history-heading">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="tabletop-kicker">SESSION LOG</p>
                <h2 id="round-history-heading" className="tabletop-title text-lg">
                  ラウンド履歴
                </h2>
              </div>
              <span className="text-[10px] text-[#9e8d75]">直近5件</span>
            </div>
            {state.history.length > 0 ? (
              <div className="mt-2 space-y-1">
                {state.history.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2 rounded-sm border border-[#413526] bg-black/15 px-2.5 py-1.5"
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${getResultColorClass(
                        entry.color,
                      )}`}
                    >
                      {entry.number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-[#d8c8ab]">
                          {getColorLabel(entry.color)} / ベット {formatChips(entry.stake)}
                        </span>
                        <span
                          className={`shrink-0 font-mono text-xs font-bold ${
                            entry.net > 0
                              ? 'text-[#b9d6bd]'
                              : entry.net < 0
                                ? 'text-[#d8a69a]'
                                : 'text-[#d8c8ab]'
                          }`}
                        >
                          {entry.net > 0 ? '+' : ''}
                          {formatChips(entry.net)}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8f7f68]">
                        払戻 {formatChips(entry.payout)} チップ
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-sm border border-dashed border-[#4d3d2d] px-3 py-3 text-xs text-[#9e8d75]">
                スピンすると結果と配当がここに記録されます。
              </p>
            )}
          </section>

          <details className="group rounded-lg border border-[#5d482f] bg-[#1b1915]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 sm:px-4">
              <div>
                <p className="tabletop-kicker">RULES &amp; PAYOUTS</p>
                <p className="tabletop-title text-base">遊び方と配当</p>
              </div>
              <span className="text-lg text-[#dfb15b] transition-transform group-open:rotate-45" aria-hidden="true">
                ＋
              </span>
            </summary>
            <div className="border-t border-[#4d3d2d] px-3 py-3 sm:px-4">
              <ul className="list-disc space-y-1.5 pl-4 text-xs leading-6 text-[#cbbba2] marker:text-[#b98a4c]">
                <li>チップを選び、ストレート（番号）またはアウトサイド（赤・黒・奇数・偶数・ハイ・ロー・ダズン）に置きます。</li>
                <li>ベット額は残高を超えません。配置した分は残高から差し引かれ、クリアすると手元に戻ります。</li>
                <li>スピンすると0から36のいずれかが等確率で抽選され、当たったベットだけが配当されます。</li>
                <li>結果の確定後に払戻が一度だけ残高へ加算され、ベットは自動でクリアされます。</li>
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-sm border border-[#4d3d2d] bg-black/15 px-1 py-2">
                  <p className="text-[10px] text-[#b9a88f]">ストレート</p>
                  <p className="font-mono text-sm font-bold text-[#f4ead8]">35:1</p>
                </div>
                <div className="rounded-sm border border-[#4d3d2d] bg-black/15 px-1 py-2">
                  <p className="text-[10px] text-[#b9a88f]">ダズン</p>
                  <p className="font-mono text-sm font-bold text-[#f4ead8]">2:1</p>
                </div>
                <div className="rounded-sm border border-[#4d3d2d] bg-black/15 px-1 py-2">
                  <p className="text-[10px] text-[#b9a88f]">イーブン</p>
                  <p className="font-mono text-sm font-bold text-[#f4ead8]">1:1</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[#9e8d75]">
                配当は賭け金を含む払戻倍率です。ストレートは36倍、ダズンは3倍、イーブンマネーは2倍が返ります。
              </p>
            </div>
          </details>

          <div className="rounded-lg border border-[#5e4930] bg-[#151310] px-3 py-3">
            <p className="font-label text-[10px] text-[#dfb15b]">RESPONSIBLE PLAY</p>
            <p className="mt-1 text-[11px] leading-5 text-[#b9a88f]">
              本作は娯楽目的の仮想ルーレットです。実際のお金や景品は使用・授受されません。18歳未満の方はご利用をお控えください。遊びすぎに注意し、余暇として楽しんでください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
