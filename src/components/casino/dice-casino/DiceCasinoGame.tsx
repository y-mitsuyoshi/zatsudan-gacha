'use client';

import React, { useEffect, useReducer, useState } from 'react';
import Link from 'next/link';

const STARTING_BANKROLL = 1000;
const CHIP_VALUES = [5, 10, 25, 50, 100] as const;
const HISTORY_LIMIT = 12;

type Dice = [number, number, number];
type FixedBetKey = 'small' | 'big' | 'odd' | 'even' | 'double' | 'triple';
type BetKey = FixedBetKey | `total-${number}`;
type Phase = 'betting' | 'rolling' | 'settled';
type BetMap = Partial<Record<BetKey, number>>;
type BetTone = 'emerald' | 'oxblood' | 'brass';

type BetDefinition = {
  key: BetKey;
  label: string;
  caption: string;
  odds: number;
  tone: BetTone;
};

type ResultBet = {
  key: BetKey;
  label: string;
  stake: number;
  odds: number;
  won: boolean;
  payout: number;
};

type RollResult = {
  id: number;
  dice: Dice;
  total: number;
  isDouble: boolean;
  isTriple: boolean;
  bets: ResultBet[];
  totalStake: number;
  totalPayout: number;
  net: number;
};

type GameState = {
  bankroll: number;
  bets: BetMap;
  activeBets: BetMap;
  activeStake: number;
  chip: number;
  phase: Phase;
  dice: Dice;
  rollId: number;
  lastResult: RollResult | null;
  history: RollResult[];
  notice: string;
};

type GameAction =
  | { type: 'select-chip'; chip: number }
  | { type: 'place-bet'; key: BetKey; label: string }
  | { type: 'clear-bets' }
  | { type: 'start-roll'; dice: Dice }
  | { type: 'settle'; rollId: number }
  | { type: 'reset' }
  | { type: 'notice'; message: string };

const OUTSIDE_BETS: BetDefinition[] = [
  { key: 'small', label: '小 / SMALL', caption: '合計 4〜10', odds: 1, tone: 'emerald' },
  { key: 'big', label: '大 / BIG', caption: '合計 11〜17', odds: 1, tone: 'oxblood' },
  { key: 'odd', label: '奇数 / ODD', caption: 'ゾロ目以外', odds: 1, tone: 'oxblood' },
  { key: 'even', label: '偶数 / EVEN', caption: 'ゾロ目以外', odds: 1, tone: 'emerald' },
];

const TOTAL_ODDS: Record<number, number> = {
  4: 60,
  5: 30,
  6: 18,
  7: 12,
  8: 8,
  9: 6,
  10: 6,
  11: 6,
  12: 6,
  13: 8,
  14: 12,
  15: 18,
  16: 30,
  17: 60,
};

const TOTAL_BETS: BetDefinition[] = Object.keys(TOTAL_ODDS)
  .map(Number)
  .sort((a, b) => a - b)
  .map((total) => ({
    key: `total-${total}`,
    label: `合計 ${total}`,
    caption: `${TOTAL_ODDS[total]}:1`,
    odds: TOTAL_ODDS[total],
    tone: 'brass',
  }));

const SPECIAL_BETS: BetDefinition[] = [
  { key: 'double', label: 'ダブル / DOUBLE', caption: 'いずれかのペア 8:1', odds: 8, tone: 'oxblood' },
  { key: 'triple', label: 'トリプル / TRIPLE', caption: '3つ同じ目 30:1', odds: 30, tone: 'brass' },
];

const ALL_BETS = [...OUTSIDE_BETS, ...TOTAL_BETS, ...SPECIAL_BETS];
const BET_BY_KEY = new Map<BetKey, BetDefinition>(ALL_BETS.map((bet) => [bet.key, bet]));

const PAYOUT_ROWS: Array<[string, string]> = [
  ['合計 4 / 17', '60:1'],
  ['合計 5 / 16', '30:1'],
  ['合計 6 / 15', '18:1'],
  ['合計 7 / 14', '12:1'],
  ['合計 8 / 13', '8:1'],
  ['合計 9 / 12', '6:1'],
  ['合計 10 / 11', '6:1'],
  ['ダブル', '8:1'],
  ['トリプル', '30:1'],
  ['大・小・奇数・偶数', '1:1'],
];

const PIP_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function formatNumber(value: number) {
  return value.toLocaleString('ja-JP');
}

function formatSigned(value: number) {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function betTotal(bets: BetMap) {
  let total = 0;
  for (const amount of Object.values(bets)) {
    total += amount ?? 0;
  }
  return total;
}

function evaluateBet(key: BetKey, dice: Dice) {
  const total = dice[0] + dice[1] + dice[2];
  const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
  const isDouble =
    !isTriple && (dice[0] === dice[1] || dice[1] === dice[2] || dice[0] === dice[2]);

  switch (key) {
    case 'small':
      return total >= 4 && total <= 10 && !isTriple;
    case 'big':
      return total >= 11 && total <= 17 && !isTriple;
    case 'odd':
      return total % 2 === 1 && !isTriple;
    case 'even':
      return total % 2 === 0 && !isTriple;
    case 'double':
      return isDouble;
    case 'triple':
      return isTriple;
    default: {
      if (!key.startsWith('total-')) return false;
      return total === Number(key.slice(6));
    }
  }
}

function createInitialState(): GameState {
  return {
    bankroll: STARTING_BANKROLL,
    bets: {},
    activeBets: {},
    activeStake: 0,
    chip: 25,
    phase: 'betting',
    dice: [2, 3, 4],
    rollId: 0,
    lastResult: null,
    history: [],
    notice: 'チップを選び、ベット・スポットをタップしてください。',
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'select-chip': {
      if (state.phase === 'rolling') {
        return { ...state, notice: 'ロール中はチップを変更できません。' };
      }
      return {
        ...state,
        chip: action.chip,
        notice: `${action.chip}チップを選択しました。`,
      };
    }
    case 'place-bet': {
      if (state.phase === 'rolling') {
        return { ...state, notice: 'ロール中はベットを変更できません。' };
      }
      if (state.bankroll <= 0) {
        return { ...state, notice: 'チップがありません。リセットで1,000チップに戻せます。' };
      }
      const currentStake = betTotal(state.bets);
      const remaining = state.bankroll - currentStake;
      if (state.chip > remaining) {
        return {
          ...state,
          notice: `残り${formatNumber(remaining)}チップでは${formatNumber(state.chip)}チップをベットできません。`,
        };
      }
      const current = state.bets[action.key] ?? 0;
      return {
        ...state,
        bets: { ...state.bets, [action.key]: current + state.chip },
        notice: `${action.label}に${formatNumber(state.chip)}チップをベットしました。`,
      };
    }
    case 'clear-bets': {
      if (state.phase === 'rolling') {
        return { ...state, notice: 'ロール中はベットをクリアできません。' };
      }
      if (Object.keys(state.bets).length === 0) {
        return { ...state, notice: 'クリアするベットがありません。' };
      }
      return { ...state, bets: {}, notice: 'すべてのベットをクリアしました。' };
    }
    case 'start-roll': {
      if (state.phase === 'rolling') return state;
      const stake = betTotal(state.bets);
      if (stake <= 0) {
        return { ...state, notice: 'ベットを1つ以上置いてからロールしてください。' };
      }
      if (stake > state.bankroll) {
        return { ...state, notice: 'ベット合計が手持ちチップを超えています。' };
      }
      return {
        ...state,
        bankroll: state.bankroll - stake,
        bets: {},
        activeBets: state.bets,
        activeStake: stake,
        phase: 'rolling',
        dice: action.dice,
        rollId: state.rollId + 1,
        lastResult: null,
        notice: 'ダイスが転がっています。結果を待っています。',
      };
    }
    case 'settle': {
      if (state.phase !== 'rolling' || state.rollId !== action.rollId) return state;

      const [d1, d2, d3] = state.dice;
      const total = d1 + d2 + d3;
      const isTriple = d1 === d2 && d2 === d3;
      const isDouble = !isTriple && (d1 === d2 || d2 === d3 || d1 === d3);
      const resultBets: ResultBet[] = [];
      let totalPayout = 0;

      for (const [key, stakeValue] of Object.entries(state.activeBets) as Array<
        [BetKey, number]
      >) {
        const stake = stakeValue ?? 0;
        if (stake <= 0) continue;
        const definition = BET_BY_KEY.get(key);
        if (!definition) continue;
        const won = evaluateBet(key, state.dice);
        const payout = won ? stake + stake * definition.odds : 0;
        totalPayout += payout;
        resultBets.push({
          key,
          label: definition.label,
          stake,
          odds: definition.odds,
          won,
          payout,
        });
      }

      const result: RollResult = {
        id: state.rollId,
        dice: state.dice,
        total,
        isDouble,
        isTriple,
        bets: resultBets,
        totalStake: state.activeStake,
        totalPayout,
        net: totalPayout - state.activeStake,
      };

      return {
        ...state,
        bankroll: state.bankroll + totalPayout,
        activeBets: {},
        activeStake: 0,
        phase: 'settled',
        lastResult: result,
        history: [result, ...state.history].slice(0, HISTORY_LIMIT),
        notice:
          totalPayout > 0
            ? `配当${formatNumber(totalPayout)}チップ。収支は${formatSigned(result.net)}です。`
            : '的中したベットはありません。ベットを変えて再挑戦できます。',
      };
    }
    case 'reset':
      return createInitialState();
    case 'notice':
      return { ...state, notice: action.message };
    default:
      return state;
  }
}

function DieView({
  value,
  rolling,
  index,
}: {
  value: number;
  rolling: boolean;
  index: number;
}) {
  const pips = PIP_POSITIONS[value] ?? [];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[14px] border border-[#bda06a] bg-[#f1e4c9] p-2 shadow-[0_7px_0_#8b6b3f,0_14px_18px_rgba(0,0,0,0.3)] sm:h-20 sm:w-20 sm:p-2.5"
        style={{ transform: `rotate(${index === 0 ? -3 : index === 2 ? 3 : 0}deg)` }}
      >
        <div
          className={`grid h-full w-full grid-cols-3 grid-rows-3 gap-1 ${rolling ? 'dice-tumbling' : ''}`}
          style={{ animationDelay: `${index * 70}ms` }}
        >
          {Array.from({ length: 9 }).map((_, cell) => (
            <span key={cell} className="flex items-center justify-center">
              {pips.includes(cell) ? (
                <span className="block h-full w-full rounded-full bg-[#7c2a24]" />
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <span className="font-label text-[9px] text-[#c5ad85]">DIE {index + 1}</span>
    </div>
  );
}

function MiniDie({ value }: { value: number }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] border border-[#8a6a3e] bg-[#f0e2c6] text-[10px] font-black text-[#5d241f]">
      {value}
    </span>
  );
}

function toneClasses(tone: BetTone) {
  if (tone === 'emerald') {
    return 'border-[#4e725c] bg-[#12392b] hover:border-[#c6a463] hover:bg-[#164333]';
  }
  if (tone === 'oxblood') {
    return 'border-[#7a4b44] bg-[#401817] hover:border-[#c6a463] hover:bg-[#4a1c1a]';
  }
  return 'border-[#7d6338] bg-[#2a2013] hover:border-[#c6a463] hover:bg-[#332617]';
}

function BetSpot({
  bet,
  amount,
  disabled,
  onSelect,
}: {
  bet: BetDefinition;
  amount: number;
  disabled: boolean;
  onSelect: (key: BetKey, label: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(bet.key, bet.label)}
      disabled={disabled}
      aria-pressed={amount > 0}
      aria-label={`${bet.label} ${bet.caption}${amount > 0 ? ` ベット${amount}チップ` : ''}`}
      data-testid={`bet-${bet.key}`}
      style={amount > 0 ? { borderColor: '#e7cd93' } : undefined}
      className={`relative flex min-h-12 flex-col items-center justify-center rounded-md border px-2 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${toneClasses(bet.tone)}`}
    >
      <span className="text-[12px] font-black leading-tight text-[#f4e8d1] sm:text-[13px]">
        {bet.label}
      </span>
      <span className="mt-0.5 text-[10px] leading-tight text-[#cdbb9c]">{bet.caption}</span>
      {amount > 0 ? (
        <span className="absolute right-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-[#f0dca8] bg-[#75251f] px-1 text-[10px] font-black text-[#fff1d2]">
          {amount}
        </span>
      ) : null}
    </button>
  );
}

function ChipButton({
  value,
  active,
  disabled,
  onSelect,
}: {
  value: number;
  active: boolean;
  disabled: boolean;
  onSelect: (value: number) => void;
}) {
  const palette: Record<number, string> = {
    5: 'border-[#8d6b3f] bg-[#2b2116] text-[#e8d5b2]',
    10: 'border-[#5c7d65] bg-[#214535] text-[#e6efdf]',
    25: 'border-[#a05a52] bg-[#5a1f1d] text-[#f5dfd7]',
    50: 'border-[#d0ad64] bg-[#b98a44] text-[#21170c]',
    100: 'border-[#efe1c4] bg-[#efe1c4] text-[#2a1b10]',
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      disabled={disabled}
      aria-pressed={active}
      aria-label={`${value}チップを選択`}
      data-testid={`chip-${value}`}
      style={
        active
          ? { borderColor: '#f2dfae', boxShadow: 'inset 0 0 0 2px rgba(18,13,9,0.4)' }
          : undefined
      }
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${palette[value]} ${active ? 'scale-105' : 'opacity-90 hover:opacity-100'}`}
    >
      <span className="pointer-events-none absolute inset-1 rounded-full border border-dashed border-current opacity-40" />
      <span className="relative">{value}</span>
    </button>
  );
}

const INITIAL_GAME_STATE = createInitialState();

export default function DiceCasinoGame() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [showRules, setShowRules] = useState(false);
  const [rollingFaces, setRollingFaces] = useState<Dice>([1, 1, 1]);

  const staked = betTotal(state.bets);
  const remaining = state.bankroll - staked;
  const isRolling = state.phase === 'rolling';
  const canRoll = !isRolling && staked > 0 && staked <= state.bankroll;
  const displayDice = isRolling ? rollingFaces : state.dice;
  const lastResult = state.lastResult;
  const winningBets = lastResult?.bets.filter((bet) => bet.won) ?? [];
  const rounds = state.history.length;
  const winningRounds = state.history.filter((entry) => entry.totalPayout > 0).length;
  const bestPayout = state.history.reduce(
    (best, entry) => Math.max(best, entry.totalPayout),
    0,
  );

  useEffect(() => {
    if (state.phase !== 'rolling') return;
    const updateFaces = () => {
      setRollingFaces([randomDie(), randomDie(), randomDie()]);
    };
    updateFaces();
    const interval = window.setInterval(updateFaces, 95);
    return () => window.clearInterval(interval);
  }, [state.phase, state.rollId]);

  useEffect(() => {
    if (state.phase !== 'rolling') return;
    const rollId = state.rollId;
    const timer = window.setTimeout(() => {
      dispatch({ type: 'settle', rollId });
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.rollId]);

  useEffect(() => {
    if (!showRules) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowRules(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRules]);

  const handleSelectChip = (chip: number) => {
    dispatch({ type: 'select-chip', chip });
  };

  const handlePlaceBet = (key: BetKey, label: string) => {
    dispatch({ type: 'place-bet', key, label });
  };

  const handleRoll = () => {
    if (isRolling) return;
    if (betTotal(state.bets) <= 0) {
      dispatch({ type: 'notice', message: 'ベットを1つ以上置いてからロールしてください。' });
      return;
    }
    dispatch({ type: 'start-roll', dice: [randomDie(), randomDie(), randomDie()] });
  };

  return (
    <section
      aria-label="ダイス・カジノ ゲームエリア"
      className="min-h-screen bg-[#0f0c08] text-[#f3e7cf]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 14% 4%, rgba(185,138,68,0.08), transparent 28rem), radial-gradient(circle at 86% 10%, rgba(122,37,37,0.09), transparent 26rem), repeating-linear-gradient(90deg, rgba(255,255,255,0.014) 0 1px, transparent 1px 9px)',
      }}
    >
      <style>{`
        @keyframes dice-tumble {
          0% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-12deg) translateY(-5px); }
          50% { transform: rotate(10deg) translateY(2px); }
          75% { transform: rotate(-6deg) translateY(-2px); }
          100% { transform: rotate(0deg) translateY(0); }
        }
        .dice-tumbling {
          animation: dice-tumble 360ms ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .dice-tumbling {
            animation: none;
          }
        }
      `}</style>

      <header className="sticky top-0 z-30 border-b border-[#4d3a24] bg-[#120e09]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="inline-flex min-h-11 shrink-0 items-center rounded border border-[#71512c] bg-[#23180e] px-2.5 text-[11px] font-bold text-[#e4d0a9] transition-colors hover:border-[#b98a44] hover:bg-[#2c1f12] sm:text-xs"
            >
              ゲーム一覧へ
            </Link>
            <svg viewBox="0 0 40 40" aria-hidden="true" className="h-9 w-9 shrink-0">
              <path
                d="M20 3 34 11v18L20 37 6 29V11Z"
                fill="#1f160e"
                stroke="#c49a55"
                strokeWidth="1.5"
              />
              <path d="M14 20h12M20 14v12" stroke="#8a2626" strokeWidth="2" />
              <circle cx="20" cy="13" r="1.7" fill="#e7d3a8" />
              <circle cx="20" cy="27" r="1.7" fill="#e7d3a8" />
              <circle cx="13" cy="20" r="1.7" fill="#e7d3a8" />
              <circle cx="27" cy="20" r="1.7" fill="#e7d3a8" />
            </svg>
            <div className="min-w-0">
              <p className="font-label text-[9px] text-[#b99055]">THREE DICE SALON</p>
              <h2 className="font-editorial truncate text-lg leading-tight text-[#f4e7ca] sm:text-xl">
                ダイス・カジノ
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div
              data-testid="bankroll"
              className="rounded border border-[#7b5c33] bg-[#1e160e] px-3 py-1.5 text-right"
            >
              <span className="font-label block text-[8px] text-[#b99a67]">BANKROLL</span>
              <span className="font-editorial block text-lg leading-none text-[#f6e8c9]">
                {formatNumber(state.bankroll)}
                <span className="ml-1 text-[10px] font-normal text-[#c9b590]">chips</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowRules(true)}
              data-testid="rules"
              className="inline-flex min-h-11 items-center rounded border border-[#7b5c33] bg-[#241a10] px-2.5 text-xs font-bold text-[#e4d0a9] transition-colors hover:border-[#b98a44] hover:bg-[#2e2114]"
            >
              ルール
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'reset' })}
              data-testid="reset"
              className="inline-flex min-h-11 items-center rounded border border-[#7d3a33] bg-[#3a1714] px-2.5 text-xs font-bold text-[#f0d6c9] transition-colors hover:border-[#a45b51] hover:bg-[#471c18]"
            >
              リセット
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 pb-10 pt-4 sm:px-6 sm:pt-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px] xl:gap-5">
          <div className="min-w-0 space-y-4">
            <div className="rounded-[26px] border-[3px] border-[#6f4d27] bg-[#24170e] p-1.5 shadow-[0_18px_36px_rgba(0,0,0,0.35)] sm:p-2">
              <div
                className="relative overflow-hidden rounded-[20px] border border-[#c69a52]/50 p-3 sm:p-5"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 24%, #17533f 0%, #0e3a2c 55%, #09281e 100%)',
                }}
              >
                <div className="pointer-events-none absolute inset-2 rounded-[15px] border border-[#d0ad66]/25" />
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d4b273]/25 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-label text-[9px] text-[#d6b77c]">3 DICE TABLE</span>
                      <span className="h-px w-8 bg-[#c9a35e]/40" />
                      <span className="text-[11px] font-bold text-[#d9c49d]">THREE DICE SALON</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-[#c7b18a]">
                        ベット合計
                        <strong
                          data-testid="stake"
                          className="ml-1 font-mono text-sm text-[#f0d79c]"
                        >
                          {formatNumber(staked)}
                        </strong>
                      </span>
                      <span className="text-[#c7b18a]">
                        残り
                        <strong className="ml-1 font-mono text-sm text-[#f0dfbf]">
                          {formatNumber(remaining)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="relative flex min-h-[150px] flex-col items-center justify-center py-5 sm:min-h-[180px]">
                    <div className="pointer-events-none absolute inset-x-14 bottom-8 h-5 rounded-[50%] bg-[#061a12]/75" />
                    <div className="relative flex items-end justify-center gap-4 sm:gap-6">
                      {displayDice.map((value, index) => (
                        <DieView
                          key={index}
                          value={value}
                          index={index}
                          rolling={isRolling}
                        />
                      ))}
                    </div>
                  </div>

                  <div
                    data-testid="last-result"
                    aria-live="polite"
                    className="rounded border border-[#b99055]/45 bg-[#2a1211]/80 px-3 py-2.5 text-center"
                  >
                    {isRolling ? (
                      <p className="font-editorial text-sm text-[#f0dfbf]">
                        ダイスが転がっています…
                      </p>
                    ) : lastResult ? (
                      <div>
                        <p className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12px] font-bold text-[#f1e1c2] sm:text-sm">
                          <span>出目 {lastResult.dice.join(' / ')}</span>
                          <span>合計 {lastResult.total}</span>
                          <span>
                            {lastResult.isTriple
                              ? 'トリプル成立'
                              : lastResult.isDouble
                                ? 'ダブル成立'
                                : '通常の出目'}
                          </span>
                        </p>
                        <p className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                          <span className="text-[#d8c39f]">
                            ベット {formatNumber(lastResult.totalStake)}
                          </span>
                          <span className="text-[#e4c985]">
                            払戻 {formatNumber(lastResult.totalPayout)}
                          </span>
                          <span
                            className={
                              lastResult.net > 0
                                ? 'text-[#a9c9ad]'
                                : lastResult.net < 0
                                  ? 'text-[#d9a49c]'
                                  : 'text-[#cdbb9c]'
                            }
                          >
                            収支 {formatSigned(lastResult.net)}
                          </span>
                        </p>
                        <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                          {winningBets.length > 0 ? (
                            winningBets.map((bet) => (
                              <span
                                key={bet.key}
                                className="rounded-sm border border-[#9f7a45] bg-[#3a2412] px-1.5 py-0.5 text-[10px] font-bold text-[#e8d3a8]"
                              >
                                {bet.label} 的中 +{formatNumber(bet.payout)}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-bold text-[#c9b89a]">
                              的中したベットはありません
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="font-editorial text-sm text-[#e7d5b2]">
                        ベットを置いて、ダイスを振ってください。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#5c4328] bg-[#19130d] p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[#b99055]">BET BOARD</p>
                  <h3 className="font-editorial text-lg text-[#f2e4c8]">ベット・ボード</h3>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'clear-bets' })}
                  disabled={isRolling || Object.keys(state.bets).length === 0}
                  className="inline-flex min-h-11 items-center rounded border border-[#71512c] bg-[#24190f] px-3 text-xs font-bold text-[#e4d0a9] transition-colors hover:border-[#b98a44] hover:bg-[#2e2114] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  ベットをクリア
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {OUTSIDE_BETS.map((bet) => (
                  <BetSpot
                    key={bet.key}
                    bet={bet}
                    amount={state.bets[bet.key] ?? 0}
                    disabled={isRolling}
                    onSelect={handlePlaceBet}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="font-label text-[9px] text-[#b99055]">TOTAL BETS</span>
                <span className="h-px flex-1 bg-[#4d3a24]" />
                <span className="text-[10px] text-[#a9926f]">4〜17</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {TOTAL_BETS.map((bet) => (
                  <BetSpot
                    key={bet.key}
                    bet={bet}
                    amount={state.bets[bet.key] ?? 0}
                    disabled={isRolling}
                    onSelect={handlePlaceBet}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="font-label text-[9px] text-[#b99055]">SPECIAL BETS</span>
                <span className="h-px flex-1 bg-[#4d3a24]" />
                <span className="text-[10px] text-[#a9926f]">PAIR / TRIPLE</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SPECIAL_BETS.map((bet) => (
                  <BetSpot
                    key={bet.key}
                    bet={bet}
                    amount={state.bets[bet.key] ?? 0}
                    disabled={isRolling}
                    onSelect={handlePlaceBet}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#5c4328] bg-[#19130d] p-3 sm:p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-label text-[9px] text-[#b99055]">CHIP SELECTOR</p>
                  <h3 className="font-editorial text-lg text-[#f2e4c8]">チップを選択</h3>
                </div>
                <p className="text-xs text-[#cdbb9c]">
                  選択中{' '}
                  <strong className="font-editorial text-base text-[#f0d79c]">{state.chip}</strong>{' '}
                  チップ / 残り{' '}
                  <strong className="font-mono text-[#f0dfbf]">{formatNumber(remaining)}</strong>
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {CHIP_VALUES.map((value) => (
                  <ChipButton
                    key={value}
                    value={value}
                    active={state.chip === value}
                    disabled={isRolling}
                    onSelect={handleSelectChip}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleRoll}
                disabled={!canRoll}
                data-testid="roll"
                className="mt-3 min-h-14 w-full rounded-md border-2 border-[#e0bd78] bg-[#b98a44] px-6 text-base font-black text-[#1d140c] transition-colors hover:bg-[#d0a85a] disabled:cursor-not-allowed disabled:border-[#5f4a2d] disabled:bg-[#332718] disabled:text-[#9e8a6b]"
              >
                {isRolling
                  ? 'ロール中…'
                  : staked > 0
                    ? `ロールする（${formatNumber(staked)}チップ）`
                    : 'ベットを置いてロール'}
              </button>
              <p
                role="status"
                aria-live="polite"
                data-testid="notice"
                className="mt-2 min-h-5 text-center text-xs text-[#c9b89a]"
              >
                {state.notice}
              </p>
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-lg border border-[#4d3a24] bg-[#19130d]">
              <div className="border-b border-[#4d3a24] px-3 py-2.5">
                <p className="font-label text-[9px] text-[#b99055]">SESSION</p>
                <h3 className="font-editorial text-base text-[#f2e4c8]">セッション統計</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 text-center">
                <div className="rounded border border-[#4d3a24] bg-[#14100a] py-2">
                  <span className="block text-[10px] text-[#b7a180]">ラウンド</span>
                  <strong className="font-editorial block text-lg text-[#f0dfbf]">{rounds}</strong>
                </div>
                <div className="rounded border border-[#4d3a24] bg-[#14100a] py-2">
                  <span className="block text-[10px] text-[#b7a180]">配当あり</span>
                  <strong className="font-editorial block text-lg text-[#f0dfbf]">
                    {winningRounds}
                  </strong>
                </div>
                <div className="rounded border border-[#4d3a24] bg-[#14100a] py-2">
                  <span className="block text-[10px] text-[#b7a180]">最高払戻</span>
                  <strong className="font-editorial block text-lg text-[#f0dfbf]">
                    {formatNumber(bestPayout)}
                  </strong>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#4d3a24] bg-[#19130d]">
              <div className="border-b border-[#4d3a24] px-3 py-2.5">
                <p className="font-label text-[9px] text-[#b99055]">LAST RESULT</p>
                <h3 className="font-editorial text-base text-[#f2e4c8]">前回の結果</h3>
              </div>
              <div className="p-3">
                {lastResult ? (
                  <div>
                    <div className="space-y-1.5">
                      {lastResult.bets.map((bet) => (
                        <div
                          key={bet.key}
                          className="flex items-center justify-between gap-2 border-b border-[#352719] pb-1.5 text-xs last:border-b-0 last:pb-0"
                        >
                          <span className="min-w-0 truncate text-[#d8c6a7]">
                            {bet.label}
                            <span className="ml-1 text-[10px] text-[#a9926f]">
                              {bet.stake} × {bet.odds}:1
                            </span>
                          </span>
                          <span
                            className={
                              bet.won
                                ? 'shrink-0 font-mono font-bold text-[#a9c9ad]'
                                : 'shrink-0 font-mono text-[#8f7d63]'
                            }
                          >
                            {bet.won ? `+${formatNumber(bet.payout)}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-[#4d3a24] pt-2 text-xs">
                      <span className="text-[#b7a180]">払戻合計</span>
                      <strong className="font-mono text-[#e4c985]">
                        {formatNumber(lastResult.totalPayout)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="py-3 text-center text-xs text-[#9f8a6b]">
                    まだ結果はありません
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#4d3a24] bg-[#19130d]">
              <div className="border-b border-[#4d3a24] px-3 py-2.5">
                <p className="font-label text-[9px] text-[#b99055]">HISTORY</p>
                <h3 className="font-editorial text-base text-[#f2e4c8]">ラウンド履歴</h3>
              </div>
              <div data-testid="history">
                {state.history.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-[#9f8a6b]">
                    履歴はまだありません
                  </p>
                ) : (
                  state.history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 border-b border-[#352719] px-3 py-2 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="w-7 shrink-0 text-[10px] text-[#9f8a6b]">
                          #{String(entry.id).padStart(2, '0')}
                        </span>
                        <span className="flex shrink-0 gap-0.5">
                          {entry.dice.map((value, index) => (
                            <MiniDie key={index} value={value} />
                          ))}
                        </span>
                        <span className="shrink-0 text-[11px] text-[#c8b594]">
                          計{entry.total}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-[11px] font-bold ${
                          entry.net > 0
                            ? 'text-[#a9c9ad]'
                            : entry.net < 0
                              ? 'text-[#d9a49c]'
                              : 'text-[#bfae92]'
                        }`}
                      >
                        {formatSigned(entry.net)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#4d3a24] bg-[#19130d]">
              <div className="border-b border-[#4d3a24] px-3 py-2.5">
                <p className="font-label text-[9px] text-[#b99055]">PAYOUT GUIDE</p>
                <h3 className="font-editorial text-base text-[#f2e4c8]">配当のきほん</h3>
              </div>
              <div className="space-y-1.5 p-3 text-xs text-[#cdbb9c]">
                <p className="flex items-center justify-between gap-2">
                  <span>大・小・奇数・偶数</span>
                  <strong className="font-mono text-[#e4c985]">1:1</strong>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>合計 4〜17</span>
                  <strong className="font-mono text-[#e4c985]">6:1〜60:1</strong>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>ダブル</span>
                  <strong className="font-mono text-[#e4c985]">8:1</strong>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>トリプル</span>
                  <strong className="font-mono text-[#e4c985]">30:1</strong>
                </p>
                <p className="border-t border-[#3d2d1c] pt-2 text-[11px] leading-5 text-[#a9926f]">
                  大・小・奇数・偶数はトリプルで不成立です。
                </p>
                <button
                  type="button"
                  onClick={() => setShowRules(true)}
                  className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded border border-[#71512c] bg-[#24190f] px-3 text-xs font-bold text-[#e4d0a9] transition-colors hover:border-[#b98a44] hover:bg-[#2e2114]"
                >
                  ルールを開く
                </button>
              </div>
            </section>

            <section
              aria-label="ご利用にあたって"
              className="rounded-lg border border-[#4d3a24] bg-[#15100a] p-3"
            >
              <p className="font-label text-[9px] text-[#b99055]">RESPONSIBLE PLAY</p>
              <p className="mt-1 text-[11px] leading-5 text-[#b7a180]">
                このゲームは娯楽目的のシミュレーションです。実際のお金や換金価値のあるものは一切使用しません。チップは無料で、外部と取引できません。時間とチップを意識し、適度な休憩を取りながらお楽しみください。
              </p>
            </section>
          </aside>
        </div>

        <p className="mt-6 border-t border-[#3d2d1c] pt-4 text-center text-[11px] leading-5 text-[#8f7d63]">
          ダイス・カジノは仮想チップ専用の無料ブラウザゲームです。実際の賭け事・換金・賞金の支払いはありません。
        </p>
      </div>

      {showRules ? (
        <div
          onClick={() => setShowRules(false)}
          role="presentation"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#070503]/85 p-3 sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dice-rules-title"
            onClick={(event) => event.stopPropagation()}
            className="mx-auto my-4 w-full max-w-2xl rounded-lg border-2 border-[#8b6738] bg-[#17110b] shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#4d3a24] px-4 py-3">
              <div>
                <p className="font-label text-[9px] text-[#b99055]">HOUSE RULES</p>
                <h3
                  id="dice-rules-title"
                  className="font-editorial text-xl text-[#f2e4c8]"
                >
                  ダイス・カジノのルール
                </h3>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setShowRules(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-[#71512c] bg-[#24190f] px-3 text-xs font-bold text-[#e4d0a9] transition-colors hover:border-[#b98a44] hover:bg-[#2e2114]"
              >
                閉じる
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-4 text-sm leading-6 text-[#d3c2a4] sm:px-6">
              <h4 className="font-editorial text-base text-[#f0dfbf]">ゲームの目的</h4>
              <p className="mt-1">
                3つのダイスの出目を予想し、仮想チップを増やすゲームです。ベット・スポットをタップしてチップを置き、ロール後に成立したベットへ配当が支払われます。
              </p>

              <h4 className="mt-4 font-editorial text-base text-[#f0dfbf]">ベットの判定</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>大は合計11〜17、小は合計4〜10です。</li>
                <li>奇数・偶数は合計の偶奇で判定します。</li>
                <li>大・小・奇数・偶数は、3つすべて同じ目のトリプルで不成立になります。</li>
                <li>合計ベットは出目の合計が一致すれば成立します。トリプルでも合計が一致すれば配当対象です。</li>
                <li>ダブルは3つのうち2つが同じ目、トリプルは3つすべてが同じ目です。ダブルにトリプルは含まれません。</li>
              </ul>

              <h4 className="mt-4 font-editorial text-base text-[#f0dfbf]">配当表</h4>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {PAYOUT_ROWS.map(([label, odds]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-2 rounded border border-[#4d3a24] bg-[#1e160e] px-2 py-1 text-[11px]"
                  >
                    <span className="text-[#cdbb9c]">{label}</span>
                    <strong className="shrink-0 font-mono text-[#e4c985]">{odds}</strong>
                  </div>
                ))}
              </div>

              <h4 className="mt-4 font-editorial text-base text-[#f0dfbf]">払戻の計算</h4>
              <p className="mt-1">
                的中したベットは「賭け金＋賭け金×オッズ」が戻ります。たとえば合計9に25チップを賭けて的中すると、25＋25×6＝175チップの払戻です。はずれのベットの賭け金は没収されます。
              </p>

              <h4 className="mt-4 font-editorial text-base text-[#f0dfbf]">チップとリセット</h4>
              <p className="mt-1">
                開始時の手持ちは1,000チップです。ベット合計は手持ちチップを超えられません。リセットを押すと、ベット・履歴・収支を含めて初期状態に戻ります。
              </p>

              <h4 className="mt-4 font-editorial text-base text-[#f0dfbf]">ご利用にあたって</h4>
              <p className="mt-1">
                実際のお金や換金要素はありません。チップの購入・換金・外部との取引はできません。娯楽として適度な休憩を取りながら遊んでください。
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
