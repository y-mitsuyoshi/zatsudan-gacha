'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

type RuleMode = 'kalah' | 'basic';
type GameMode = 'cpu' | 'pvp';
type Difficulty = 'easy' | 'normal' | 'hard';
type InitialSeeds = 3 | 4 | 6;

interface SowStep {
  pits: number[];
  activePit: number;
  note?: string;
}

interface SowOutcome {
  finalPits: number[];
  nextTurn: 1 | 2;
  extraTurn: boolean;
  capturedCount: number;
  capturedFromPit: number | null;
  landingPit: number;
  gameOver: boolean;
  winner: 0 | 1 | 2 | 3; // 0: ongoing, 1: P1, 2: P2, 3: Draw
  steps: SowStep[];
}

interface HistorySnapshot {
  pits: number[];
  turn: 1 | 2;
  banner: string;
}

const GEM_PALETTE = [
  'from-amber-200 via-amber-400 to-amber-700 border-amber-100/70',
  'from-rose-300 via-rose-500 to-red-800 border-rose-200/60',
  'from-emerald-300 via-emerald-500 to-emerald-800 border-emerald-200/60',
  'from-sky-300 via-sky-500 to-blue-900 border-sky-200/60',
  'from-violet-300 via-violet-500 to-indigo-900 border-violet-200/60',
  'from-lime-300 via-lime-500 to-green-800 border-lime-200/60',
];

function createInitialPits(seedsPerPit: InitialSeeds): number[] {
  const p = Array<number>(14).fill(seedsPerPit);
  p[6] = 0; // P1 Store (Right)
  p[13] = 0; // P2 Store (Left)
  return p;
}

function getValidPitIndices(pits: number[], player: 1 | 2): number[] {
  const start = player === 1 ? 0 : 7;
  const end = player === 1 ? 5 : 12;
  const valid: number[] = [];
  for (let i = start; i <= end; i++) {
    if (pits[i] > 0) valid.push(i);
  }
  return valid;
}

function simulateSow(pits: number[], pitIdx: number, player: 1 | 2, rule: RuleMode): SowOutcome {
  const next = [...pits];
  let seeds = next[pitIdx];
  next[pitIdx] = 0;

  const steps: SowStep[] = [{ pits: [...next], activePit: pitIdx }];
  let curr = pitIdx;

  while (seeds > 0) {
    curr = (curr + 1) % 14;
    // In Kalah rule, skip opponent's store (Basic rule commonly drops in both or own store; skipping opponent's store is standard across modern Kalah & Basic school rules)
    if (rule === 'kalah') {
      if (player === 1 && curr === 13) continue;
      if (player === 2 && curr === 6) continue;
    }
    next[curr] += 1;
    seeds -= 1;
    steps.push({ pits: [...next], activePit: curr });
  }

  const ownStore = player === 1 ? 6 : 13;
  const extraTurn = curr === ownStore;
  let capturedCount = 0;
  let capturedFromPit: number | null = null;

  // Kalah Capture Rule: Last stone lands in an empty pit on your own side, and opposite pit has stones
  if (rule === 'kalah' && !extraTurn) {
    const isOwnSide = player === 1 ? curr >= 0 && curr <= 5 : curr >= 7 && curr <= 12;
    if (isOwnSide && next[curr] === 1) {
      const oppPit = 12 - curr;
      if (next[oppPit] > 0) {
        capturedCount = next[oppPit] + 1;
        capturedFromPit = oppPit;
        next[ownStore] += capturedCount;
        next[curr] = 0;
        next[oppPit] = 0;
        steps.push({
          pits: [...next],
          activePit: ownStore,
          note: `横取りキャプチャー！向かい側のポケットから ${capturedCount} 個を獲得！`,
        });
      }
    }
  }

  // Check if either side's 6 pits are completely empty
  const p1SideSum = next.slice(0, 6).reduce((a, b) => a + b, 0);
  const p2SideSum = next.slice(7, 13).reduce((a, b) => a + b, 0);

  let gameOver = false;
  let winner: 0 | 1 | 2 | 3 = 0;

  if (p1SideSum === 0 || p2SideSum === 0) {
    gameOver = true;
    if (rule === 'basic') {
      // Basic rule: First player whose 6 pits become empty wins immediately!
      if (p1SideSum === 0 && p2SideSum === 0) winner = 3;
      else if (p1SideSum === 0) winner = 1;
      else winner = 2;
    } else {
      // Kalah rule: Remaining stones on the non-empty side go to that side's store; most stones in store wins
      next[6] += p1SideSum;
      next[13] += p2SideSum;
      for (let i = 0; i < 6; i++) next[i] = 0;
      for (let i = 7; i < 13; i++) next[i] = 0;
      steps.push({
        pits: [...next],
        activePit: ownStore,
        note: '片側の陣地が空になったため、残りの石をそれぞれのストアへ回収して集計します',
      });
      if (next[6] > next[13]) winner = 1;
      else if (next[13] > next[6]) winner = 2;
      else winner = 3;
    }
  }

  const nextTurn: 1 | 2 = extraTurn ? player : player === 1 ? 2 : 1;

  return {
    finalPits: next,
    nextTurn,
    extraTurn,
    capturedCount,
    capturedFromPit,
    landingPit: curr,
    gameOver,
    winner,
    steps,
  };
}

function evaluateMancalaState(pits: number[], aiPlayer: 1 | 2, rule: RuleMode): number {
  const p1Side = pits.slice(0, 6).reduce((a, b) => a + b, 0);
  const p2Side = pits.slice(7, 13).reduce((a, b) => a + b, 0);

  if (rule === 'basic') {
    // In Basic rule, fewer stones on own side is better!
    if (p1Side === 0) return aiPlayer === 1 ? 10000 : -10000;
    if (p2Side === 0) return aiPlayer === 2 ? 10000 : -10000;
    return aiPlayer === 1 ? (p2Side - p1Side) * 18 : (p1Side - p2Side) * 18;
  }

  // Kalah evaluation: store difference + side control
  const myStore = aiPlayer === 1 ? pits[6] : pits[13];
  const oppStore = aiPlayer === 1 ? pits[13] : pits[6];
  const mySide = aiPlayer === 1 ? p1Side : p2Side;
  const oppSide = aiPlayer === 1 ? p2Side : p1Side;

  return (myStore - oppStore) * 24 + (mySide - oppSide) * 4;
}

function minimaxMancala(
  pits: number[],
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: 1 | 2,
  aiPlayer: 1 | 2,
  rule: RuleMode
): number {
  const valid = getValidPitIndices(pits, currentPlayer);
  if (depth === 0 || valid.length === 0) {
    return evaluateMancalaState(pits, aiPlayer, rule);
  }

  if (currentPlayer === aiPlayer) {
    let best = -Infinity;
    for (const move of valid) {
      const sim = simulateSow(pits, move, currentPlayer, rule);
      if (sim.gameOver) {
        const terminalVal =
          sim.winner === aiPlayer ? 10000 + depth * 50 : sim.winner === 3 ? 0 : -10000 - depth * 50;
        if (terminalVal > best) best = terminalVal;
      } else {
        const nextDepth = sim.extraTurn ? depth : depth - 1;
        const val = minimaxMancala(
          sim.finalPits,
          nextDepth,
          alpha,
          beta,
          sim.nextTurn,
          aiPlayer,
          rule
        );
        if (val > best) best = val;
      }
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of valid) {
      const sim = simulateSow(pits, move, currentPlayer, rule);
      if (sim.gameOver) {
        const terminalVal =
          sim.winner === aiPlayer ? 10000 + depth * 50 : sim.winner === 3 ? 0 : -10000 - depth * 50;
        if (terminalVal < best) best = terminalVal;
      } else {
        const nextDepth = sim.extraTurn ? depth : depth - 1;
        const val = minimaxMancala(
          sim.finalPits,
          nextDepth,
          alpha,
          beta,
          sim.nextTurn,
          aiPlayer,
          rule
        );
        if (val < best) best = val;
      }
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function chooseMancalaMove(
  pits: number[],
  player: 1 | 2,
  rule: RuleMode,
  difficulty: Difficulty
): number | null {
  const valid = getValidPitIndices(pits, player);
  if (valid.length === 0) return null;

  if (difficulty === 'easy') {
    // Easy: Prefer extra turn 50% of the time, otherwise random
    for (const idx of valid) {
      const sim = simulateSow(pits, idx, player, rule);
      if (sim.extraTurn && Math.random() < 0.5) return idx;
    }
    return valid[Math.floor(Math.random() * valid.length)];
  }

  if (difficulty === 'normal') {
    let bestMove = valid[0];
    let bestScore = -Infinity;
    for (const idx of valid) {
      const sim = simulateSow(pits, idx, player, rule);
      let score = evaluateMancalaState(sim.finalPits, player, rule);
      if (sim.extraTurn) score += 35;
      if (sim.capturedCount > 0) score += sim.capturedCount * 15;
      score += (Math.random() - 0.5) * 6;
      if (score > bestScore) {
        bestScore = score;
        bestMove = idx;
      }
    }
    return bestMove;
  }

  // Hard: Minimax with extra-turn chaining
  let bestMove = valid[0];
  let bestVal = -Infinity;
  for (const idx of valid) {
    const sim = simulateSow(pits, idx, player, rule);
    if (sim.gameOver && sim.winner === player) return idx;
    const val = minimaxMancala(
      sim.finalPits,
      sim.extraTurn ? 4 : 3,
      -Infinity,
      Infinity,
      sim.nextTurn,
      player,
      rule
    );
    if (val > bestVal) {
      bestVal = val;
      bestMove = idx;
    }
  }
  return bestMove;
}

function pitLabel(idx: number): string {
  if (idx === 6) return 'P1 ゴールストア';
  if (idx === 13) return 'P2 ゴールストア';
  if (idx >= 0 && idx <= 5) return `下段 A${idx + 1}`;
  return `上段 B${13 - idx}`;
}

export default function MancalaGame() {
  const [rule, setRule] = useState<RuleMode>('kalah');
  const [mode, setMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [initialSeeds, setInitialSeeds] = useState<InitialSeeds>(4);
  const [pits, setPits] = useState<number[]>(() => createInitialPits(4));
  const [turn, setTurn] = useState<1 | 2>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activePit, setActivePit] = useState<number | null>(null);
  const [hoveredPit, setHoveredPit] = useState<number | null>(null);
  const [hintPit, setHintPit] = useState<number | null>(null);
  const [banner, setBanner] = useState<string>('あなたの手番（下段 A1〜A6 のポケットを選んで種まき）');
  const [winner, setWinner] = useState<0 | 1 | 2 | 3>(0);
  const [soundOn, setSoundOn] = useState(true);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animTimersRef = useRef<number[]>([]);

  const clearAnimTimers = useCallback(() => {
    for (const id of animTimersRef.current) {
      window.clearTimeout(id);
    }
    animTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAnimTimers();
  }, [clearAnimTimers]);

  const playGemSound = useCallback(
    (freq: number, dur = 0.065) => {
      if (!soundOn || typeof window === 'undefined') return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(0.09, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {
        // Ignore audio errors
      }
    },
    [soundOn]
  );

  const gameOver = winner !== 0;
  const isCpuTurn = mode === 'cpu' && turn === 2 && !gameOver && !isAnimating;

  const hoverPreview = useMemo(() => {
    if (hoveredPit === null || isAnimating || gameOver) return null;
    const isOwnPit =
      turn === 1 ? hoveredPit >= 0 && hoveredPit <= 5 : hoveredPit >= 7 && hoveredPit <= 12;
    if (!isOwnPit || pits[hoveredPit] === 0) return null;
    return simulateSow(pits, hoveredPit, turn, rule);
  }, [gameOver, hoveredPit, isAnimating, pits, rule, turn]);

  const runSowWithAnimation = useCallback(
    (pitIdx: number) => {
      if (isAnimating || gameOver || pits[pitIdx] === 0) return;

      setHistory((prev) => [...prev, { pits: [...pits], turn, banner }]);
      setHintPit(null);
      setHoveredPit(null);
      setIsAnimating(true);

      const outcome = simulateSow(pits, pitIdx, turn, rule);
      const stepDelay = 155;

      outcome.steps.forEach((st, idx) => {
        const tid = window.setTimeout(() => {
          setPits(st.pits);
          setActivePit(st.activePit);
          playGemSound(380 + (idx % 8) * 45, 0.06);
          if (st.note) {
            setBanner(st.note);
          }
        }, idx * stepDelay);
        animTimersRef.current.push(tid);
      });

      const finishTimer = window.setTimeout(() => {
        setPits(outcome.finalPits);
        setActivePit(outcome.landingPit);
        setIsAnimating(false);

        if (outcome.gameOver) {
          setWinner(outcome.winner);
          playGemSound(720, 0.25);
          if (outcome.winner === 1) {
            setBanner(
              ` 先手（下段・あなた）の勝利！（ストア ${outcome.finalPits[6]} 対 ${outcome.finalPits[13]}）`
            );
          } else if (outcome.winner === 2) {
            setBanner(
              ` 後手（${mode === 'cpu' ? 'CPU' : 'P2'}）の勝利！（ストア ${outcome.finalPits[13]} 対 ${outcome.finalPits[6]}）`
            );
          } else {
            setBanner(`引き分け！（${outcome.finalPits[6]} 対 ${outcome.finalPits[13]}）`);
          }
          return;
        }

        if (outcome.extraTurn) {
          playGemSound(620, 0.14);
          setTurn(turn);
          setBanner(
            ` ぴったりゴールストアに入ったため連続手番！（${
              turn === 1 ? '先手・下段' : mode === 'cpu' ? 'CPU・上段' : '後手・上段'
            }がもう1手！）`
          );
        } else {
          setTurn(outcome.nextTurn);
          if (outcome.capturedCount > 0) {
            setBanner(
              ` 横取りキャプチャー（+${outcome.capturedCount}個）成功！次は${
                outcome.nextTurn === 1 ? '先手（下段）' : mode === 'cpu' ? 'CPU（上段）' : '後手（上段）'
              }の手番です`
            );
          } else {
            setBanner(
              `${
                outcome.nextTurn === 1
                  ? '先手（下段 A1〜A6）の手番です'
                  : mode === 'cpu'
                    ? 'CPU（上段 B1〜B6）が思考中...'
                    : '後手（上段 B1〜B6）の手番です'
              }`
            );
          }
        }
      }, outcome.steps.length * stepDelay + 60);

      animTimersRef.current.push(finishTimer);
    },
    [banner, gameOver, isAnimating, mode, pits, playGemSound, rule, turn]
  );

  // CPU Turn trigger
  useEffect(() => {
    if (!isCpuTurn) return;
    const timer = window.setTimeout(() => {
      const move = chooseMancalaMove(pits, 2, rule, difficulty);
      if (move !== null) {
        runSowWithAnimation(move);
      }
    }, 520);
    return () => window.clearTimeout(timer);
  }, [difficulty, isCpuTurn, pits, rule, runSowWithAnimation]);

  const handlePitClick = useCallback(
    (pitIdx: number) => {
      if (isAnimating || gameOver || isCpuTurn) return;
      const isOwn = turn === 1 ? pitIdx >= 0 && pitIdx <= 5 : pitIdx >= 7 && pitIdx <= 12;
      if (!isOwn || pits[pitIdx] === 0) return;
      runSowWithAnimation(pitIdx);
    },
    [gameOver, isAnimating, isCpuTurn, pits, runSowWithAnimation, turn]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0 || isAnimating) return;
    clearAnimTimers();
    if (mode === 'cpu') {
      let idx = history.length - 1;
      while (idx > 0 && history[idx].turn !== 1) {
        idx--;
      }
      const snap = history[idx];
      setPits(snap.pits);
      setTurn(snap.turn);
      setBanner(snap.banner);
      setWinner(0);
      setHintPit(null);
      setActivePit(null);
      setHistory(history.slice(0, idx));
    } else {
      const snap = history[history.length - 1];
      setPits(snap.pits);
      setTurn(snap.turn);
      setBanner(snap.banner);
      setWinner(0);
      setHintPit(null);
      setActivePit(null);
      setHistory(history.slice(0, -1));
    }
  }, [clearAnimTimers, history, isAnimating, mode]);

  const handleHint = useCallback(() => {
    if (isAnimating || gameOver || isCpuTurn) return;
    const best = chooseMancalaMove(pits, turn, rule, 'hard');
    setHintPit(best);
    playGemSound(580, 0.08);
  }, [gameOver, isAnimating, isCpuTurn, pits, playGemSound, rule, turn]);

  const resetGame = useCallback(
    (
      newRule = rule,
      newMode = mode,
      newDiff = difficulty,
      newSeeds = initialSeeds
    ) => {
      clearAnimTimers();
      setRule(newRule);
      setMode(newMode);
      setDifficulty(newDiff);
      setInitialSeeds(newSeeds);
      setPits(createInitialPits(newSeeds));
      setTurn(1);
      setWinner(0);
      setIsAnimating(false);
      setActivePit(null);
      setHoveredPit(null);
      setHintPit(null);
      setHistory([]);
      setBanner('先手（下段 A1〜A6）の手番です。ポケットをタップして反時計回りに種まき！');
    },
    [clearAnimTimers, difficulty, initialSeeds, mode, rule]
  );

  const p1SideTotal = pits.slice(0, 6).reduce((a, b) => a + b, 0);
  const p2SideTotal = pits.slice(7, 13).reduce((a, b) => a + b, 0);

  const renderGems = (count: number, seedKey: number) => {
    const visible = Math.min(count, 18);
    return (
      <div className="flex flex-wrap items-center justify-center gap-0.5 p-0.5 sm:gap-1 sm:p-1">
        {Array.from({ length: visible }, (_, i) => {
          const colorCls = GEM_PALETTE[(seedKey * 3 + i) % GEM_PALETTE.length];
          return (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full border bg-gradient-to-br shadow-sm transition-transform duration-200 sm:h-4 sm:w-4 ${colorCls}`}
            />
          );
        })}
        {count > 18 && (
          <span className="rounded bg-black/60 px-1 text-[10px] font-black text-[#e6c48f]">
            +{count - 18}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="tabletop-page min-h-screen select-none overflow-x-hidden">
      {/* Header */}
      <header className="tabletop-header">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-2 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="tabletop-button inline-flex min-h-11 shrink-0 items-center px-3 text-xs sm:text-sm"
            >
              ← ゲーム一覧
            </Link>
            <div className="min-w-0">
              <p className="tabletop-kicker truncate">Ancient Sowing · Kalah & Basic Mancala</p>
              <h2 className="tabletop-title truncate text-base sm:text-xl">
                マンカラ
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 rounded-md border border-[#4d3d2d] bg-black/20 p-0.5">
              <button
                type="button"
                onClick={() => resetGame('kalah', mode, difficulty, initialSeeds)}
                aria-pressed={rule === 'kalah'}
                className={`inline-flex min-h-11 items-center rounded px-2.5 text-xs font-semibold transition ${
                  rule === 'kalah'
                    ? 'bg-[#c99555] text-[#1b120b]'
                    : 'text-[#b9a88f] hover:text-[#f4ead8]'
                }`}
              >
                カラハ
              </button>
              <button
                type="button"
                onClick={() => resetGame('basic', mode, difficulty, initialSeeds)}
                aria-pressed={rule === 'basic'}
                className={`inline-flex min-h-11 items-center rounded px-2.5 text-xs font-semibold transition ${
                  rule === 'basic'
                    ? 'bg-[#c99555] text-[#1b120b]'
                    : 'text-[#b9a88f] hover:text-[#f4ead8]'
                }`}
              >
                ベーシック
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              aria-pressed={soundOn}
              className={`tabletop-chip inline-flex min-h-11 items-center px-3 text-xs font-semibold ${
                soundOn ? 'tabletop-chip-active' : ''
              }`}
            >
              効果音 {soundOn ? 'ON' : 'OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-2 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Board + Status */}
        <div className="flex min-w-0 flex-col gap-3">
          <section className="tabletop-panel p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="tabletop-stat min-w-0 px-2.5 py-2">
                <p className="truncate text-[11px] font-semibold text-[#a9c9b1]">
                  先手（下段 A1〜A6）
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[#d8cbb8]">
                  自陣 {p1SideTotal} / ストア{' '}
                  <span className="text-lg font-bold text-[#f4ead8]">{pits[6]}</span>
                </p>
              </div>
              <div className="tabletop-stat min-w-0 px-2.5 py-2 text-right">
                <p className="truncate text-[11px] font-semibold text-[#d8a69a]">
                  後手（{mode === 'cpu' ? 'CPU' : '上段 B1〜B6'}）
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[#d8cbb8]">
                  自陣 {p2SideTotal} / ストア{' '}
                  <span className="text-lg font-bold text-[#f4ead8]">{pits[13]}</span>
                </p>
              </div>
            </div>

            <div className="mt-2.5 rounded-md border border-[#6b543d] bg-[#17120f] px-3 py-2 text-center text-xs font-semibold text-[#e6c48f] sm:text-sm">
              {banner}
            </div>

            {hoverPreview && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#4f6b57] bg-[#223129] px-3 py-2 text-xs font-medium text-[#d6e5d8]">
                <span>
                  種まき予測: 最後の石は「{pitLabel(hoverPreview.landingPit)}」に着地
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {hoverPreview.extraTurn && (
                    <span className="rounded bg-[#c99555] px-2 py-0.5 text-[11px] font-bold text-[#1b120b]">
                      もう1手
                    </span>
                  )}
                  {hoverPreview.capturedCount > 0 && (
                    <span className="rounded bg-[#9f4540] px-2 py-0.5 text-[11px] font-bold text-[#fff4e6]">
                      横取り +{hoverPreview.capturedCount}
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Carved Wooden Board */}
          <div className="tabletop-board-frame p-1.5 sm:p-3">
            <div className="rounded-lg border border-[#6b4423] bg-gradient-to-b from-[#432611] via-[#341c0b] to-[#261407] p-2.5 shadow-inner sm:p-4">
              <div className="mb-2 flex flex-col items-center justify-between gap-1 text-[11px] font-medium text-[#d8b98a] sm:mb-3 sm:flex-row">
                <span> 上段（後手・{mode === 'cpu' ? 'CPU' : 'P2'}）は右から左へ</span>
                <span>反時計回り（CCW）</span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[84px_minmax(0,1fr)_84px] sm:gap-3 lg:grid-cols-[104px_minmax(0,1fr)_104px]">
                {/* P2 Store */}
                <div
                  className={`order-1 flex flex-row items-center justify-between gap-3 rounded-lg border bg-gradient-to-b from-[#1e1006] to-[#120903] px-3 py-2 transition sm:order-none sm:flex-col sm:justify-between sm:gap-2 sm:px-2 sm:py-3 ${
                    activePit === 13
                      ? 'border-[#c99555] ring-1 ring-[#c99555]'
                      : hoverPreview?.landingPit === 13
                        ? 'border-[#dfb06d] ring-1 ring-[#dfb06d]'
                        : 'border-[#6b4423]'
                  }`}
                >
                  <div className="text-left sm:text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9db8cd] sm:text-[11px]">
                      {mode === 'cpu' ? 'CPU STORE' : 'P2 STORE'}
                    </span>
                    <span className="font-mono text-xl font-bold text-[#f4ead8] sm:text-2xl">
                      {pits[13]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 sm:flex-none">{renderGems(pits[13], 13)}</div>
                  <span className="hidden text-[10px] font-medium text-[#b9a88f] sm:block">
                    後手ゴール
                  </span>
                </div>

                {/* Center Pits */}
                <div className="order-2 flex min-w-0 flex-col justify-between gap-2.5 sm:order-none sm:gap-4">
                  {/* Top Row: P2 */}
                  <div className="grid min-w-0 grid-cols-6 gap-1 sm:gap-2">
                    {[12, 11, 10, 9, 8, 7].map((pitIdx) => {
                      const count = pits[pitIdx];
                      const canClick =
                        !isAnimating && !gameOver && mode === 'pvp' && turn === 2 && count > 0;
                      const isLanding = hoverPreview?.landingPit === pitIdx;
                      const isCapturedTarget = hoverPreview?.capturedFromPit === pitIdx;
                      const isHint = hintPit === pitIdx;
                      const isActive = activePit === pitIdx;

                      return (
                        <button
                          key={pitIdx}
                          type="button"
                          disabled={!canClick}
                          onClick={() => handlePitClick(pitIdx)}
                          onMouseEnter={() => setHoveredPit(pitIdx)}
                          onMouseLeave={() => setHoveredPit(null)}
                          className={`relative flex min-h-[88px] min-w-0 flex-col items-center justify-between rounded-lg border-2 bg-gradient-to-b from-[#1c0f06] to-[#130a04] p-1 transition sm:min-h-[118px] sm:p-2 ${
                            isHint
                              ? 'border-[#dfb06d] ring-1 ring-[#dfb06d]'
                              : isLanding
                                ? 'border-[#6f9a75] ring-1 ring-[#6f9a75]'
                                : isCapturedTarget
                                  ? 'border-[#b4544a] ring-1 ring-[#b4544a]'
                                  : isActive
                                    ? 'border-[#c99555]'
                                    : canClick
                                      ? 'border-[#6b543d] hover:border-[#c99555] hover:bg-[#261509]'
                                      : 'border-[#4d3d2d]'
                          }`}
                        >
                          <span className="font-mono text-[10px] font-bold text-[#9db8cd]">
                            B{13 - pitIdx}
                          </span>
                          {renderGems(count, pitIdx)}
                          <span className="rounded-full bg-black/45 px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#f4ead8] sm:px-2 sm:text-sm">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom Row: P1 */}
                  <div className="grid min-w-0 grid-cols-6 gap-1 sm:gap-2">
                    {[0, 1, 2, 3, 4, 5].map((pitIdx) => {
                      const count = pits[pitIdx];
                      const canClick = !isAnimating && !gameOver && turn === 1 && count > 0;
                      const isLanding = hoverPreview?.landingPit === pitIdx;
                      const isCapturedTarget = hoverPreview?.capturedFromPit === pitIdx;
                      const isHint = hintPit === pitIdx;
                      const isActive = activePit === pitIdx;

                      return (
                        <button
                          key={pitIdx}
                          type="button"
                          disabled={!canClick}
                          onClick={() => handlePitClick(pitIdx)}
                          onMouseEnter={() => setHoveredPit(pitIdx)}
                          onMouseLeave={() => setHoveredPit(null)}
                          className={`relative flex min-h-[88px] min-w-0 flex-col items-center justify-between rounded-lg border-2 bg-gradient-to-b from-[#1c0f06] to-[#130a04] p-1 transition sm:min-h-[118px] sm:p-2 ${
                            isHint
                              ? 'border-[#dfb06d] ring-1 ring-[#dfb06d]'
                              : isLanding
                                ? 'border-[#6f9a75] ring-1 ring-[#6f9a75]'
                                : isCapturedTarget
                                  ? 'border-[#b4544a] ring-1 ring-[#b4544a]'
                                  : isActive
                                    ? 'border-[#c99555]'
                                    : canClick
                                      ? 'border-[#6b543d] hover:border-[#c99555] hover:bg-[#261509]'
                                      : 'border-[#4d3d2d]'
                          }`}
                        >
                          <span className="rounded-full bg-black/45 px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#f4ead8] sm:px-2 sm:text-sm">
                            {count}
                          </span>
                          {renderGems(count, pitIdx)}
                          <span className="font-mono text-[10px] font-bold text-[#a9c9b1]">
                            A{pitIdx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* P1 Store */}
                <div
                  className={`order-3 flex flex-row items-center justify-between gap-3 rounded-lg border bg-gradient-to-b from-[#1e1006] to-[#120903] px-3 py-2 transition sm:order-none sm:flex-col sm:justify-between sm:gap-2 sm:px-2 sm:py-3 ${
                    activePit === 6
                      ? 'border-[#c99555] ring-1 ring-[#c99555]'
                      : hoverPreview?.landingPit === 6
                        ? 'border-[#dfb06d] ring-1 ring-[#dfb06d]'
                        : 'border-[#6b4423]'
                  }`}
                >
                  <div className="text-left sm:text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#a9c9b1] sm:text-[11px]">
                      YOU / P1
                    </span>
                    <span className="font-mono text-xl font-bold text-[#f4ead8] sm:text-2xl">
                      {pits[6]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 sm:flex-none">{renderGems(pits[6], 6)}</div>
                  <span className="hidden text-[10px] font-medium text-[#b9a88f] sm:block">
                    先手ゴール
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-col items-center justify-between gap-1 text-[11px] font-medium text-[#d8b98a] sm:flex-row">
                <span>
                  勝利条件:{' '}
                  {rule === 'kalah'
                    ? 'カラハ（ストアの石が多い方が勝利）'
                    : 'ベーシック（先に自陣を空にした方が勝利）'}
                </span>
                <span>下段（先手・あなた）は左から右へ </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <aside className="flex min-w-0 flex-col gap-3">
          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Match Actions</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0 || isAnimating || isCpuTurn}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-2 text-xs disabled:cursor-not-allowed disabled:opacity-45"
              >
                待った
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={gameOver || isAnimating || isCpuTurn}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-2 text-xs text-[#dfb06d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                AIヒント
              </button>
              <button
                type="button"
                onClick={() => resetGame()}
                className="tabletop-button-primary inline-flex min-h-11 items-center justify-center px-2 text-xs"
              >
                新規対局
              </button>
            </div>
            {hintPit !== null && (
              <p className="tabletop-panel-soft mt-2 px-2.5 py-1.5 text-xs font-medium text-[#e6c48f]">
                AI推奨ポケット: <span className="font-mono">{pitLabel(hintPit)}</span>（石{' '}
                {pits[hintPit]}個）
              </p>
            )}
          </div>

          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Rule & Mode / 対戦設定</p>

            <p className="mt-2 text-[11px] font-semibold text-[#b9a88f]">ルール</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => resetGame('kalah', mode, difficulty, initialSeeds)}
                aria-pressed={rule === 'kalah'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  rule === 'kalah' ? 'tabletop-chip-active' : ''
                }`}
              >
                カラハ（横取り有）
              </button>
              <button
                type="button"
                onClick={() => resetGame('basic', mode, difficulty, initialSeeds)}
                aria-pressed={rule === 'basic'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  rule === 'basic' ? 'tabletop-chip-active' : ''
                }`}
              >
                ベーシック
              </button>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">対戦モード</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => resetGame(rule, 'cpu', difficulty, initialSeeds)}
                aria-pressed={mode === 'cpu'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  mode === 'cpu' ? 'tabletop-chip-active' : ''
                }`}
              >
                CPU対戦
              </button>
              <button
                type="button"
                onClick={() => resetGame(rule, 'pvp', difficulty, initialSeeds)}
                aria-pressed={mode === 'pvp'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  mode === 'pvp' ? 'tabletop-chip-active' : ''
                }`}
              >
                1台で2人対戦
              </button>
            </div>

            {mode === 'cpu' && (
              <>
                <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">CPUの強さ</p>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['easy', '初級'],
                      ['normal', '中級'],
                      ['hard', '上級'],
                    ] as const
                  ).map(([lv, label]) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => resetGame(rule, 'cpu', lv, initialSeeds)}
                      aria-pressed={difficulty === lv}
                      className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-1.5 text-xs font-semibold ${
                        difficulty === lv ? 'tabletop-chip-active' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">
              初期の石の数（1ポケット）
            </p>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {([3, 4, 6] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => resetGame(rule, mode, difficulty, cnt)}
                  aria-pressed={initialSeeds === cnt}
                  className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-1 text-xs font-semibold ${
                    initialSeeds === cnt ? 'tabletop-chip-active' : ''
                  }`}
                >
                  {cnt}個（計{cnt * 12}）
                </button>
              ))}
            </div>
          </div>

          <div className="tabletop-panel-soft p-3.5 text-xs leading-relaxed">
            <p className="tabletop-kicker">Mancala Rules</p>
            <ul className="mt-2 space-y-2 text-[11px] text-[#b9a88f]">
              <li>
                <strong className="font-semibold text-[#dfb06d]">ぴったりゴール（共通）：</strong>
                最後の1個が自分のゴールストアに入ると、続けてもう1回手番を行えます。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">カラハ：</strong>
                最後の石が自陣の空ポケットに入り、向かい側に石があると両方ストアへ横取り。ストアの石が多い方が勝利です。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">ベーシック：</strong>
                ストアの石数は競わず、先に自分の6ポケットをすべて空にしたプレイヤーが勝利します。
              </li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
