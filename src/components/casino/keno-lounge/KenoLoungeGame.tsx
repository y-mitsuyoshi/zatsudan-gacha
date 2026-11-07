'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

const INITIAL_BANKROLL = 2000;
const DEFAULT_BET = 25;
const MAX_PICKS = 10;
const DRAW_COUNT = 20;
const BET_OPTIONS = [10, 25, 50, 100];
const NUMBER_POOL = Array.from({ length: 80 }, (_, index) => index + 1);
const creditFormatter = new Intl.NumberFormat('ja-JP');

const PAYTABLE: Record<number, Record<number, number>> = {
  1: { 1: 3 },
  2: { 1: 1, 2: 8 },
  3: { 1: 1, 2: 2, 3: 15 },
  4: { 2: 2, 3: 5, 4: 80 },
  5: { 2: 1, 3: 3, 4: 20, 5: 200 },
  6: { 2: 1, 3: 2, 4: 6, 5: 30, 6: 500 },
  7: { 2: 1, 3: 1, 4: 3, 5: 20, 6: 150, 7: 1000 },
  8: { 3: 1, 4: 3, 5: 10, 6: 60, 7: 500, 8: 5000 },
  9: { 3: 1, 4: 2, 5: 5, 6: 30, 7: 200, 8: 1000, 9: 10000 },
  10: { 3: 1, 4: 1, 5: 4, 6: 15, 7: 75, 8: 400, 9: 2000, 10: 10000 },
};

type Phase = 'picking' | 'drawing' | 'settled';

type HistoryEntry = {
  id: number;
  picks: number;
  hits: number;
  bet: number;
  payout: number;
  net: number;
};

type RoundResult = {
  id: number;
  picks: number[];
  hits: number[];
  bet: number;
  payout: number;
  net: number;
  multiplier: number;
};

type ActiveRound = {
  id: number;
  picks: number[];
  bet: number;
  draw: number[];
};

function formatCredits(value: number) {
  return creditFormatter.format(value);
}

function drawTwentyNumbers() {
  const pool = [...NUMBER_POOL];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = pool[index];
    pool[index] = pool[swapIndex];
    pool[swapIndex] = current;
  }

  return pool.slice(0, DRAW_COUNT);
}

function multiplierFor(pickCount: number, hitCount: number) {
  return PAYTABLE[pickCount]?.[hitCount] ?? 0;
}

function DrumMark({ spinning }: { spinning: boolean }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b68d4f] bg-[#24160e]">
      <svg
        viewBox="0 0 44 44"
        aria-hidden="true"
        className={`h-8 w-8 ${spinning ? 'keno-drum-spin' : ''}`}
      >
        <circle cx="22" cy="22" r="17.5" fill="none" stroke="#c9a45b" strokeWidth="1" opacity="0.75" />
        <circle cx="22" cy="22" r="12.5" fill="none" stroke="#8e6a3e" strokeWidth="0.8" />
        <path
          d="M22 4.5v9M22 30.5v9M4.5 22h9M30.5 22h9M9.7 9.7l6.4 6.4M27.9 27.9l6.4 6.4M34.3 9.7l-6.4 6.4M16.1 27.9l-6.4 6.4"
          stroke="#c9a45b"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.7"
        />
        <circle cx="22" cy="22" r="3.5" fill="#c9a45b" />
        <circle cx="22" cy="22" r="1.4" fill="#24160e" />
      </svg>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function Monogram() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" className="h-10 w-10 shrink-0">
      <path d="M22 2.5 41.5 22 22 41.5 2.5 22Z" fill="none" stroke="#c9a45b" strokeWidth="1.2" />
      <path d="M22 7 37 22 22 37 7 22Z" fill="none" stroke="#806138" strokeWidth="0.8" />
      <text x="22" y="27.5" textAnchor="middle" fill="#e4c88f" fontSize="14" fontFamily="serif" fontWeight="700">
        K
      </text>
    </svg>
  );
}

export default function KenoLoungeGame() {
  const [selected, setSelected] = useState<number[]>([]);
  const [bet, setBet] = useState(DEFAULT_BET);
  const [bankroll, setBankroll] = useState(INITIAL_BANKROLL);
  const [phase, setPhase] = useState<Phase>('picking');
  const [draw, setDraw] = useState<number[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [limitNotice, setLimitNotice] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const selectedRef = useRef<number[]>([]);
  const betRef = useRef(DEFAULT_BET);
  const bankrollRef = useRef(INITIAL_BANKROLL);
  const busyRef = useRef(false);
  const roundIdRef = useRef(0);
  const activeRoundRef = useRef<ActiveRound | null>(null);
  const settledRoundRef = useRef(0);
  const helpCloseRef = useRef<HTMLButtonElement>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const revealed = useMemo(() => draw.slice(0, revealedCount), [draw, revealedCount]);
  const revealedSet = useMemo(() => new Set(revealed), [revealed]);
  const liveHits = useMemo(
    () => selected.reduce((total, number) => total + (revealedSet.has(number) ? 1 : 0), 0),
    [selected, revealedSet],
  );
  const paytableCount = selected.length > 0 ? selected.length : 5;
  const insufficientCredits = bankroll < bet;
  const canDraw = phase !== 'drawing' && selected.length >= 1 && selected.length <= MAX_PICKS && !insufficientCredits;
  const displayRound = result?.id ?? (roundNumber > 0 ? roundNumber : 1);

  const settleRound = useCallback(() => {
    const round = activeRoundRef.current;

    if (!round || settledRoundRef.current === round.id) {
      return;
    }

    settledRoundRef.current = round.id;
    const drawnSet = new Set(round.draw);
    const hits = round.picks.filter((number) => drawnSet.has(number));
    const multiplier = multiplierFor(round.picks.length, hits.length);
    const payout = round.bet * multiplier;

    bankrollRef.current += payout;
    setBankroll(bankrollRef.current);
    setResult({
      id: round.id,
      picks: round.picks,
      hits,
      bet: round.bet,
      payout,
      net: payout - round.bet,
      multiplier,
    });
    setHistory((previous) => [
      {
        id: round.id,
        picks: round.picks.length,
        hits: hits.length,
        bet: round.bet,
        payout,
        net: payout - round.bet,
      },
      ...previous,
    ].slice(0, 12));
    setPhase('settled');
    busyRef.current = false;
  }, []);

  useEffect(() => {
    if (phase !== 'drawing') {
      return;
    }

    let revealIndex = 0;
    let settleTimer: number | undefined;
    const revealTimer = window.setInterval(() => {
      revealIndex += 1;
      setRevealedCount(revealIndex);

      if (revealIndex >= DRAW_COUNT) {
        window.clearInterval(revealTimer);
        settleTimer = window.setTimeout(() => {
          settleRound();
        }, 320);
      }
    }, 90);

    return () => {
      window.clearInterval(revealTimer);
      if (settleTimer !== undefined) {
        window.clearTimeout(settleTimer);
      }
    };
  }, [phase, settleRound]);

  useEffect(() => {
    if (!helpOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => helpCloseRef.current?.focus(), 0);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [helpOpen]);

  const toggleNumber = (number: number) => {
    if (busyRef.current) {
      return;
    }

    setLimitNotice(false);

    if (phase === 'settled') {
      setDraw([]);
      setRevealedCount(0);
      setResult(null);
      setPhase('picking');
    }

    const current = selectedRef.current;

    if (current.includes(number)) {
      const next = current.filter((value) => value !== number);
      selectedRef.current = next;
      setSelected(next);
      return;
    }

    if (current.length >= MAX_PICKS) {
      setLimitNotice(true);
      return;
    }

    const next = [...current, number].sort((left, right) => left - right);
    selectedRef.current = next;
    setSelected(next);
  };

  const chooseBet = (value: number) => {
    if (busyRef.current) {
      return;
    }

    betRef.current = value;
    setBet(value);
  };

  const startDraw = () => {
    if (busyRef.current) {
      return;
    }

    const picks = selectedRef.current;
    const wager = betRef.current;

    if (picks.length < 1 || picks.length > MAX_PICKS || bankrollRef.current < wager) {
      return;
    }

    const nextRoundNumber = roundIdRef.current + 1;
    const nextDraw = drawTwentyNumbers();

    roundIdRef.current = nextRoundNumber;
    activeRoundRef.current = {
      id: nextRoundNumber,
      picks: [...picks],
      bet: wager,
      draw: nextDraw,
    };
    busyRef.current = true;
    bankrollRef.current -= wager;

    setBankroll(bankrollRef.current);
    setRoundNumber(nextRoundNumber);
    setDraw(nextDraw);
    setRevealedCount(0);
    setResult(null);
    setPhase('drawing');
    setLimitNotice(false);
  };

  const resetLounge = () => {
    if (busyRef.current) {
      return;
    }

    selectedRef.current = [];
    betRef.current = DEFAULT_BET;
    bankrollRef.current = INITIAL_BANKROLL;
    roundIdRef.current = 0;
    activeRoundRef.current = null;
    settledRoundRef.current = 0;

    setSelected([]);
    setBet(DEFAULT_BET);
    setBankroll(INITIAL_BANKROLL);
    setDraw([]);
    setRevealedCount(0);
    setResult(null);
    setHistory([]);
    setRoundNumber(0);
    setLimitNotice(false);
    setPhase('picking');
    setHelpOpen(false);
  };

  let statusMessage = '番号を1〜10個選び、ベット額を確認してください';

  if (limitNotice) {
    statusMessage = '選択できる番号は最大10個までです';
  } else if (phase === 'drawing') {
    statusMessage = `抽選中です。${revealedCount}球目まで公開しました`;
  } else if (result) {
    statusMessage = `${result.hits.length}個的中しました。配当を確認してください`;
  } else if (selected.length > 0 && insufficientCredits) {
    statusMessage = 'クレジットが不足しています。ベット額を下げるかリセットしてください';
  } else if (selected.length > 0) {
    statusMessage = `${selected.length}個選択中。抽選を開始できます`;
  }

  return (
    <div className="keno-lounge min-h-screen overflow-x-hidden">
      <style>{`
        .keno-lounge {
          --keno-ink: #f3e7cf;
          --keno-muted: #baa88c;
          --keno-faint: #8e7c63;
          --keno-brass: #c9a45b;
          --keno-brass-light: #e2c184;
          --keno-brass-dark: #8b6637;
          --keno-wood: #24160e;
          --keno-wood-deep: #180f0a;
          --keno-line: #5a432c;
          --keno-felt: #17342a;
          position: relative;
          isolation: isolate;
          color: var(--keno-ink);
          background-color: #120c08;
          background-image:
            radial-gradient(ellipse at 50% -18%, rgba(201, 164, 91, 0.13), transparent 44rem),
            repeating-linear-gradient(92deg, rgba(255, 244, 220, 0.018) 0 1px, transparent 1px 9px),
            linear-gradient(180deg, #1b110b 0%, #130d09 54%, #0f0a07 100%);
        }
        .keno-lounge::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background-image:
            linear-gradient(90deg, transparent 0 49.85%, rgba(201, 164, 91, 0.045) 50%, transparent 50.15%),
            linear-gradient(0deg, transparent 0 49.85%, rgba(201, 164, 91, 0.028) 50%, transparent 50.15%);
          background-size: 132px 132px;
        }
        .keno-wood-panel {
          border: 1px solid var(--keno-line);
          background-color: var(--keno-wood);
          background-image:
            repeating-linear-gradient(93deg, rgba(255, 243, 215, 0.024) 0 1px, transparent 1px 8px),
            linear-gradient(180deg, rgba(255, 255, 255, 0.028), transparent 42%),
            linear-gradient(180deg, #2a1a10 0%, #1d120c 100%);
          box-shadow:
            inset 0 1px 0 rgba(249, 236, 209, 0.07),
            0 12px 28px rgba(0, 0, 0, 0.3);
        }
        .keno-felt-panel {
          border: 1px solid #7d6038;
          background-color: var(--keno-felt);
          background-image:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05), transparent 62%),
            repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.045) 0 1px, transparent 1px 4px),
            linear-gradient(180deg, #1a3b30 0%, #142e25 100%);
          box-shadow:
            inset 0 0 0 1px rgba(201, 164, 91, 0.13),
            inset 0 10px 24px rgba(0, 0, 0, 0.2);
        }
        .keno-slot {
          border: 1px solid #355146;
          background: #10261f;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
        }
        .keno-ball {
          border: 1px solid #f0d8a5;
          background: radial-gradient(circle at 34% 28%, #f8eccd 0%, #e0bf7d 34%, #bd914c 68%, #875f2e 100%);
          color: #24160e;
          box-shadow:
            inset -2px -3px 5px rgba(72, 43, 15, 0.35),
            inset 2px 2px 3px rgba(255, 249, 229, 0.55),
            0 1px 2px rgba(0, 0, 0, 0.45);
        }
        .keno-tile {
          transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
        }
        .keno-tile:not(:disabled):active {
          transform: translateY(1px);
        }
        .keno-brass-button {
          border: 1px solid #e2c184;
          background: linear-gradient(180deg, #e7ca8d 0%, #c9a45b 56%, #b88a45 100%);
          color: #24160e;
          box-shadow:
            inset 0 1px 0 rgba(255, 250, 235, 0.55),
            0 2px 0 #6a4c28;
          transition: background-color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
        }
        .keno-brass-button:hover:not(:disabled) {
          background: linear-gradient(180deg, #f0d69e 0%, #d7b36a 56%, #c29450 100%);
        }
        .keno-brass-button:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            inset 0 1px 0 rgba(255, 250, 235, 0.4),
            0 1px 0 #6a4c28;
        }
        .keno-brass-button:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }
        .keno-wood-button {
          border: 1px solid #705337;
          background: linear-gradient(180deg, #2d1d13 0%, #21140d 100%);
          color: #e5d3b1;
          transition: border-color 140ms ease, background-color 140ms ease;
        }
        .keno-wood-button:hover:not(:disabled) {
          border-color: var(--keno-brass);
          background: #332116;
        }
        .keno-wood-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .keno-focus:focus-visible {
          outline: 2px solid #e2c184;
          outline-offset: 2px;
        }
        .keno-drum-spin {
          animation: kenoDrumSpin 1.15s linear infinite;
        }
        .keno-ball-in {
          animation: kenoBallIn 360ms cubic-bezier(0.22, 0.8, 0.28, 1) both;
        }
        .keno-result-in {
          animation: kenoResultIn 320ms ease-out both;
        }
        @keyframes kenoDrumSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes kenoBallIn {
          0% { opacity: 0; transform: translateY(9px) scale(0.72); }
          58% { opacity: 1; transform: translateY(-2px) scale(1.06); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes kenoResultIn {
          0% { opacity: 0; transform: translateY(7px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .keno-drum-spin,
          .keno-ball-in,
          .keno-result-in {
            animation: none;
          }
        }
      `}</style>

      <header className="border-b border-[#4d3824] bg-[#1a100b]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/games"
              aria-label="無料ブラウザゲーム一覧へ戻る"
              className="keno-wood-button keno-focus flex h-11 w-11 shrink-0 items-center justify-center rounded"
            >
              <ArrowLeftIcon />
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden sm:block">
                <Monogram />
              </span>
              <div className="min-w-0">
                <p className="font-label text-[9px] text-[#c9a45b] sm:text-[10px]">PRIVATE KENO SALON</p>
                <p className="font-editorial truncate text-base text-[#f3e7cf] sm:text-xl">ケノ・ラウンジ</p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden border border-[#5a432c] bg-[#20140e] px-3 py-2 font-label text-[9px] text-[#c9a45b] lg:inline-block">
              VIRTUAL CREDITS ONLY
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="遊び方とルールを表示"
              className="keno-wood-button keno-focus font-editorial flex h-11 w-11 items-center justify-center rounded text-lg"
            >
              ?
            </button>
            <button
              type="button"
              onClick={resetLounge}
              disabled={phase === 'drawing'}
              data-testid="keno-reset"
              aria-label="クレジットと履歴をリセット"
              className="keno-wood-button keno-focus flex h-11 w-11 items-center justify-center gap-1.5 rounded px-0 text-[11px] font-bold sm:w-auto sm:px-3"
            >
              <ResetIcon />
              <span className="hidden sm:inline">リセット</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-1.5 pb-8 pt-4 sm:px-6 sm:pt-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 px-1.5 sm:px-0">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-px w-8 bg-[#a77d42]" />
              <p className="font-label text-[9px] text-[#c9a45b] sm:text-[10px]">KENO LOUNGE / 20 OF 80</p>
            </div>
            <h2 className="font-editorial mt-2 text-[26px] leading-tight text-[#f4e8d0] sm:text-4xl">
              真鍮と夜の、二十球。
            </h2>
            <p className="mt-2 max-w-2xl text-[11px] leading-6 text-[#baa88c] sm:text-sm">
              1〜80から好きな番号を1〜10個選び、ベットして20球の抽選へ。的中数に応じた配当を、フェルトと真鍮のプライベートサロンでお楽しみください。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 px-1.5 sm:gap-2 sm:px-0 lg:w-[430px]">
            <div className="keno-wood-panel rounded px-2.5 py-2.5 sm:px-3">
              <p className="font-label text-[8px] text-[#b99255] sm:text-[9px]">BANKROLL</p>
              <p data-testid="keno-bankroll" className="keno-tabular font-editorial mt-1 text-base leading-none text-[#f3e7cf] sm:text-xl">
                {formatCredits(bankroll)}
                <span className="ml-1 text-[9px] font-normal text-[#baa88c] sm:text-[10px]">cr</span>
              </p>
            </div>
            <div className="keno-wood-panel rounded px-2.5 py-2.5 sm:px-3">
              <p className="font-label text-[8px] text-[#b99255] sm:text-[9px]">YOUR BET</p>
              <p className="keno-tabular font-editorial mt-1 text-base leading-none text-[#f3e7cf] sm:text-xl">
                {formatCredits(bet)}
                <span className="ml-1 text-[9px] font-normal text-[#baa88c] sm:text-[10px]">cr</span>
              </p>
            </div>
            <div className="keno-wood-panel rounded px-2.5 py-2.5 sm:px-3">
              <p className="font-label text-[8px] text-[#b99255] sm:text-[9px]">SELECTED</p>
              <p className="keno-tabular font-editorial mt-1 text-base leading-none text-[#f3e7cf] sm:text-xl">
                {selected.length}
                <span className="ml-1 text-[9px] font-normal text-[#baa88c] sm:text-[10px]">/ {MAX_PICKS}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="keno-wood-panel overflow-hidden rounded-md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#5a432c] px-3 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                  <DrumMark spinning={phase === 'drawing'} />
                  <div>
                    <p className="font-label text-[9px] text-[#c9a45b]">KENO BOARD / TABLE 07</p>
                    <p className="font-editorial text-lg text-[#f3e7cf] sm:text-xl">1 — 80</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="keno-tabular rounded border border-[#5a432c] bg-[#1b110b] px-2.5 py-1.5 text-[10px] font-bold text-[#d9c19a]">
                    選択 {selected.length}/{MAX_PICKS}
                  </span>
                  <span className="keno-tabular rounded border border-[#8b6637] bg-[#332116] px-2.5 py-1.5 text-[10px] font-bold text-[#e2c184]">
                    的中 {liveHits}
                  </span>
                </div>
              </div>

              <div className="keno-felt-panel m-1 rounded p-1 sm:m-2 sm:p-3 md:m-3 md:p-4">
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <p className="font-label text-[8px] text-[#d9bb7a] sm:text-[9px]">DRAWN BALLS</p>
                  <p className="keno-tabular text-[9px] text-[#baa88c] sm:text-[10px]">{revealedCount} / 20</p>
                </div>

                <div className="grid grid-cols-10 gap-1 sm:gap-1.5 md:grid-cols-[repeat(20,minmax(0,1fr))]">
                  {Array.from({ length: DRAW_COUNT }, (_, index) => {
                    const ball = revealed[index];

                    if (ball === undefined) {
                      return <div key={`empty-${index}`} aria-hidden="true" className="keno-slot aspect-square rounded-full" />;
                    }

                    return (
                      <div
                        key={`ball-${index}`}
                        className="keno-ball keno-ball-in keno-tabular flex aspect-square items-center justify-center rounded-full text-[9px] font-bold sm:text-[11px]"
                      >
                        {ball}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-8 gap-px md:grid-cols-10 md:gap-2">
                  {NUMBER_POOL.map((number) => {
                    const isSelected = selectedSet.has(number);
                    const isDrawn = revealedSet.has(number);
                    const isHit = isSelected && isDrawn;
                    let stateClass = 'border-[#3e5b4e] bg-[#173027] text-[#d9c8a9] hover:border-[#b28d4f] hover:bg-[#1d3a2f]';

                    if (isHit) {
                      stateClass = 'border-[#f4e2ba] bg-[#d7b36a] text-[#24170e]';
                    } else if (isDrawn) {
                      stateClass = 'border-[#7d5638] bg-[#462a20] text-[#e8d8ba]';
                    } else if (isSelected) {
                      stateClass = 'border-[#d7b36a] bg-[#1d4034] text-[#f5e7c8]';
                    }

                    return (
                      <button
                        key={number}
                        type="button"
                        onClick={() => toggleNumber(number)}
                        disabled={phase === 'drawing'}
                        data-testid={`keno-number-${number}`}
                        aria-pressed={isSelected}
                        aria-label={`${number}${isSelected ? ' 選択中' : ''}${isDrawn ? ' 抽選済み' : ''}`}
                        className={`keno-tile keno-focus relative flex aspect-square min-h-11 min-w-0 items-center justify-center rounded-[3px] border text-xs font-bold disabled:cursor-default sm:text-sm md:min-h-12 md:text-base ${stateClass}`}
                      >
                        <span className="keno-tabular">{number}</span>
                        {(isHit || isDrawn) && (
                          <span
                            aria-hidden="true"
                            className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${isHit ? 'bg-[#6e2f28]' : 'bg-[#d7b36a]'}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex flex-col gap-1 px-1 pb-0.5 sm:mt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[10px] leading-5 text-[#d5c4a6]" role="status" aria-live="polite">
                    {statusMessage}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-[#a9977b]">
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] border border-[#d7b36a] bg-[#1d4034]" />
                      選択
                    </span>
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] border border-[#f4e2ba] bg-[#d7b36a]" />
                      的中
                    </span>
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] border border-[#7d5638] bg-[#462a20]" />
                      抽選済み
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-label text-[9px] text-[#c9a45b]">BET PER ROUND</p>
                      <p className="text-[9px] text-[#9f8c70]">抽選開始時にベットを消費します</p>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1.5 sm:max-w-md">
                      {BET_OPTIONS.map((value) => {
                        const active = bet === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => chooseBet(value)}
                            disabled={phase === 'drawing'}
                            aria-pressed={active}
                            className={`keno-focus keno-tabular flex min-h-11 items-center justify-center gap-1 rounded border px-1 text-xs font-bold transition-colors disabled:cursor-default ${
                              active
                                ? 'border-[#e2c184] bg-[#c9a45b] text-[#24160e]'
                                : 'border-[#5a432c] bg-[#20140e] text-[#d6c3a2] hover:border-[#b28d4f]'
                            }`}
                          >
                            {formatCredits(value)}
                            <span className={`text-[8px] font-normal ${active ? 'text-[#4c3419]' : 'text-[#9f8c70]'}`}>cr</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className={`mt-2 text-[10px] leading-5 ${insufficientCredits ? 'text-[#d99b84]' : 'text-[#9f8c70]'}`}>
                      {insufficientCredits
                        ? 'ベット額がクレジットを上回っています。ベットを下げるかリセットしてください。'
                        : '配当は的中数と選択数に応じて、抽選終了後に一度だけ精算されます。'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={startDraw}
                    disabled={!canDraw}
                    data-testid="keno-draw"
                    className="keno-brass-button keno-focus flex min-h-12 w-full items-center justify-center rounded px-4 text-sm font-black"
                  >
                    {phase === 'drawing'
                      ? `抽選中… ${revealedCount}/20`
                      : result
                        ? 'もう一度抽選する'
                        : '20球を抽選する'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="min-w-0 space-y-3 sm:space-y-4">
            <div className={`keno-wood-panel rounded-md p-3.5 sm:p-4 ${result ? 'keno-result-in' : ''}`}>
              <div className="flex items-center justify-between gap-2 border-b border-[#5a432c] pb-2">
                <p className="font-label text-[9px] text-[#c9a45b]">ROUND TICKET</p>
                <p className="keno-tabular text-[9px] text-[#9f8c70]">第 {String(displayRound).padStart(2, '0')} ラウンド</p>
              </div>

              {result ? (
                <div className="pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-editorial text-3xl leading-none text-[#f4e8d0]">
                        {result.hits.length}
                        <span className="ml-1 text-sm text-[#c9a45b]">HIT</span>
                      </p>
                      <p className="mt-1 text-[10px] text-[#baa88c]">
                        選択 {result.picks.length} / 抽選 20
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="font-label text-[8px] text-[#b99255]">PAYOUT</p>
                      <p data-testid="keno-payout" className="keno-tabular font-editorial mt-0.5 text-2xl leading-none text-[#e2c184]">
                        {formatCredits(result.payout)}
                        <span className="ml-1 text-[10px] font-normal text-[#baa88c]">cr</span>
                      </p>
                      <p className="keno-tabular mt-1 text-[9px] text-[#9f8c70]">
                        ×{formatCredits(result.multiplier)} / ベット {formatCredits(result.bet)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[#5a432c] pt-3 text-[10px] leading-5">
                    {result.hits.length > 0 ? (
                      <p className="text-[#d5c4a6]">当たり番号: {result.hits.join(' / ')}</p>
                    ) : (
                      <p className="text-[#baa88c]">当たり番号はありませんでした。次の抽選に備えましょう。</p>
                    )}
                    <p className={`keno-tabular mt-1 font-bold ${result.net >= 0 ? 'text-[#e2c184]' : 'text-[#c9a08a]'}`}>
                      収支 {result.net >= 0 ? '+' : ''}{formatCredits(result.net)} cr
                    </p>
                  </div>
                </div>
              ) : phase === 'drawing' ? (
                <div className="pt-3">
                  <p className="font-editorial text-2xl leading-none text-[#f4e8d0]">
                    抽選中
                    <span className="keno-tabular ml-2 text-sm text-[#c9a45b]">{revealedCount} / 20</span>
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#120c08]">
                    <div
                      className="h-full rounded-full bg-[#c9a45b] transition-[width] duration-150 ease-out"
                      style={{ width: `${(revealedCount / DRAW_COUNT) * 100}%` }}
                    />
                  </div>
                  <p className="mt-3 text-[10px] leading-5 text-[#baa88c]">
                    ベルトから20球を順に公開しています。的中した番号はボード上で真鍮色に変わります。
                  </p>
                </div>
              ) : (
                <div className="pt-3">
                  <p className="font-editorial text-xl leading-snug text-[#f4e8d0]">
                    {selected.length > 0 ? `${selected.length}個の番号を選択中` : '番号をお選びください'}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-[#baa88c]">
                    ベット額 {formatCredits(bet)} cr で20球を抽選します。選択数に応じて右の配当表が切り替わります。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {selected.length > 0 ? (
                      selected.map((number) => (
                        <span key={number} className="keno-tabular rounded border border-[#8b6637] bg-[#332116] px-2 py-1 text-[10px] font-bold text-[#e2c184]">
                          {number}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[#7f705b]">まだ番号は選択されていません</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="keno-wood-panel rounded-md p-3.5 sm:p-4">
              <div className="flex items-end justify-between gap-2 border-b border-[#5a432c] pb-2">
                <div>
                  <p className="font-label text-[9px] text-[#c9a45b]">PAYOUT SCHEDULE</p>
                  <h3 className="font-editorial mt-0.5 text-lg text-[#f3e7cf]">配当表</h3>
                </div>
                <p className="text-right text-[9px] leading-4 text-[#9f8c70]">
                  {selected.length > 0 ? `${selected.length}個選択時` : '5個選択時の例'}
                  <br />
                  ベット × 倍率
                </p>
              </div>

              <div className="mt-1">
                {Array.from({ length: paytableCount + 1 }, (_, hitCount) => {
                  const multiplier = multiplierFor(paytableCount, hitCount);
                  const payout = bet * multiplier;

                  return (
                    <div
                      key={hitCount}
                      className="flex items-center justify-between gap-2 border-b border-[#4d3a27]/60 py-[5px] text-[10px] last:border-0 sm:text-[11px]"
                    >
                      <span className="text-[#baa88c]">{hitCount}個的中</span>
                      {multiplier > 0 ? (
                        <span className="min-w-0 text-right text-[#f0dfbf]">
                          <span className="keno-tabular font-bold">×{formatCredits(multiplier)}</span>
                          <span className="keno-tabular ml-1.5 text-[9px] text-[#9f8c70]">{formatCredits(payout)} cr</span>
                        </span>
                      ) : (
                        <span className="text-[#6f604c]">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="keno-wood-panel rounded-md p-3.5 sm:p-4">
              <div className="flex items-end justify-between gap-2 border-b border-[#5a432c] pb-2">
                <div>
                  <p className="font-label text-[9px] text-[#c9a45b]">LEDGER</p>
                  <h3 className="font-editorial mt-0.5 text-lg text-[#f3e7cf]">ラウンド履歴</h3>
                </div>
                <p className="text-[9px] text-[#9f8c70]">直近12回</p>
              </div>

              {history.length > 0 ? (
                <ol data-testid="keno-history" className="mt-2 max-h-[250px] space-y-1 overflow-y-auto pr-1">
                  {history.map((entry) => (
                    <li key={entry.id} className="rounded border border-[#4d3a27] bg-[#1b110b] px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="font-label text-[8px] text-[#b99255]">R{String(entry.id).padStart(2, '0')}</span>
                        <span className={`keno-tabular font-bold ${entry.net >= 0 ? 'text-[#e2c184]' : 'text-[#c9a08a]'}`}>
                          {entry.net >= 0 ? '+' : ''}{formatCredits(entry.net)} cr
                        </span>
                      </div>
                      <p className="keno-tabular mt-0.5 text-[9px] text-[#9f8c70]">
                        選択 {entry.picks} / 的中 {entry.hits} ・ ベット {formatCredits(entry.bet)} ・ 配当 {formatCredits(entry.payout)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-4 text-center text-[10px] leading-5 text-[#8e7c63]">
                  まだ抽選履歴はありません。
                  <br />
                  最初の20球を抽選してみてください。
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="keno-wood-button keno-focus flex min-h-11 w-full items-center justify-center gap-2 rounded px-3 text-xs font-bold"
            >
              <span aria-hidden="true" className="font-editorial text-base text-[#c9a45b]">?</span>
              遊び方とルールを見る
            </button>

            <div className="rounded-md border border-[#4d3a27] bg-[#1b120c] p-3.5 text-[9px] leading-5 text-[#9f8c70] sm:text-[10px]">
              <p className="font-label text-[8px] text-[#b99255]">RESPONSIBLE PLAY</p>
              <p className="mt-1.5">
                ケノ・ラウンジは娯楽用のシミュレーションです。ゲーム内のクレジットに換金価値はなく、実際のお金を賭けることはできません。
              </p>
              <p className="mt-1">
                時間とクレジットの上限を決め、休憩を取りながら遊んでください。のめり込みを感じたときは、一度ゲームを離れましょう。
              </p>
            </div>
          </aside>
        </div>
      </div>

      {helpOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b0704]/85 p-3 sm:p-6"
          onClick={() => setHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="keno-help-title"
            className="keno-wood-panel relative max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-md p-5 sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#5a432c] pb-3">
              <div>
                <p className="font-label text-[9px] text-[#c9a45b]">HOW TO PLAY</p>
                <h2 id="keno-help-title" className="font-editorial mt-1 text-2xl text-[#f3e7cf]">
                  遊び方とルール
                </h2>
              </div>
              <button
                ref={helpCloseRef}
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="ルール説明を閉じる"
                className="keno-wood-button keno-focus flex h-11 w-11 shrink-0 items-center justify-center rounded text-lg"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[11px] leading-6 text-[#cbbba0] sm:text-xs">
              <section>
                <h3 className="font-editorial text-base text-[#e2c184]">1. 番号を選ぶ</h3>
                <p className="mt-1">
                  1〜80のボードから、好きな番号を1〜10個まで選べます。選択中の番号をもう一度押すと解除できます。10個を超えて選ぶことはできません。
                </p>
              </section>
              <section>
                <h3 className="font-editorial text-base text-[#e2c184]">2. ベットして抽選する</h3>
                <p className="mt-1">
                  ベット額を10・25・50・100クレジットから選び、「20球を抽選する」を押します。抽選開始時にベット額がクレジットから引かれ、20球が順番に公開されます。
                </p>
              </section>
              <section>
                <h3 className="font-editorial text-base text-[#e2c184]">3. 的中数で配当が決まる</h3>
                <p className="mt-1">
                  選んだ番号のうち、20球に含まれた個数が「的中」です。右側の配当表にある倍率とベット額を掛けたクレジットが、抽選終了後に一度だけ加算されます。
                </p>
              </section>
              <section>
                <h3 className="font-editorial text-base text-[#e2c184]">4. 次のラウンドへ</h3>
                <p className="mt-1">
                  結果を確認したら、同じ番号のまま再挑戦するか、番号を選び直せます。履歴には直近12ラウンドの選択数・的中数・ベット・配当・収支が残ります。
                </p>
              </section>
              <section className="rounded border border-[#5a432c] bg-[#1b110b] p-3">
                <h3 className="font-editorial text-base text-[#e2c184]">仮想クレジットについて</h3>
                <p className="mt-1">
                  このゲームはバーチャルクレジット専用です。クレジットの購入、換金、実際のお金を賭ける要素はありません。ページを再読み込みすると初期状態に戻ります。
                </p>
              </section>
              <section>
                <h3 className="font-editorial text-base text-[#e2c184]">責任あるプレイ</h3>
                <p className="mt-1">
                  時間とクレジットの上限を決め、休憩を挟みながら楽しんでください。ゲームを続けることが負担に感じられたら、いったん離れてください。
                </p>
              </section>
            </div>

            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="keno-brass-button keno-focus mt-5 flex min-h-11 w-full items-center justify-center rounded px-4 text-xs font-black"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
