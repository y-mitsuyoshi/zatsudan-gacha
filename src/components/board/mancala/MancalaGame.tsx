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
  'from-cyan-300 via-sky-400 to-blue-600 border-cyan-200/70',
  'from-amber-200 via-amber-400 to-orange-600 border-amber-100/70',
  'from-emerald-300 via-teal-400 to-emerald-700 border-emerald-200/70',
  'from-rose-300 via-pink-400 to-rose-700 border-rose-200/70',
  'from-violet-300 via-purple-400 to-indigo-700 border-violet-200/70',
  'from-lime-300 via-green-400 to-emerald-600 border-lime-200/70',
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
              `🎉 先手（下段・あなた）の勝利！（ストア ${outcome.finalPits[6]} 対 ${outcome.finalPits[13]}）`
            );
          } else if (outcome.winner === 2) {
            setBanner(
              `🏆 後手（${mode === 'cpu' ? 'CPU' : 'P2'}）の勝利！（ストア ${outcome.finalPits[13]} 対 ${outcome.finalPits[6]}）`
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
            `✨ ぴったりゴールストアに入ったため連続手番！（${
              turn === 1 ? '先手・下段' : mode === 'cpu' ? 'CPU・上段' : '後手・上段'
            }がもう1手！）`
          );
        } else {
          setTurn(outcome.nextTurn);
          if (outcome.capturedCount > 0) {
            setBanner(
              `🎯 横取りキャプチャー（+${outcome.capturedCount}個）成功！次は${
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
      <div className="flex flex-wrap items-center justify-center gap-1 p-1">
        {Array.from({ length: visible }, (_, i) => {
          const colorCls = GEM_PALETTE[(seedKey * 3 + i) % GEM_PALETTE.length];
          return (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border bg-gradient-to-br shadow-sm transition-transform duration-200 sm:h-4 sm:w-4 ${colorCls}`}
            />
          );
        })}
        {count > 18 && (
          <span className="rounded bg-black/60 px-1 text-[10px] font-black text-amber-200">
            +{count - 18}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0c0906] text-amber-50 select-none">
      {/* Header */}
      <header className="border-b border-amber-500/20 bg-[#16100b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/games"
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-amber-100 transition hover:border-amber-400/50 hover:text-amber-200"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-amber-400">
                ANCIENT SOWING STRATEGY / KALAH & BASIC MANCALA
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                マンカラ（カラハ・種まき頭脳ボードゲーム）
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-amber-500/30 bg-black/40 p-0.5">
              <button
                type="button"
                onClick={() => resetGame('kalah', mode, difficulty, initialSeeds)}
                className={`rounded-md px-2.5 py-1 text-xs font-black transition ${
                  rule === 'kalah'
                    ? 'bg-amber-400 text-stone-950'
                    : 'text-amber-200/80 hover:text-white'
                }`}
              >
                カラハ（高戦略）
              </button>
              <button
                type="button"
                onClick={() => resetGame('basic', mode, difficulty, initialSeeds)}
                className={`rounded-md px-2.5 py-1 text-xs font-black transition ${
                  rule === 'basic'
                    ? 'bg-amber-400 text-stone-950'
                    : 'text-amber-200/80 hover:text-white'
                }`}
              >
                ベーシック（先空け）
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-amber-100 transition hover:border-amber-400/50"
            >
              {soundOn ? '🔊 効果音 ON' : '🔇 効果音 OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Wooden Mancala Board + Live Status */}
        <div className="flex flex-col gap-3">
          {/* Status Banner */}
          <div className="rounded-2xl border border-amber-500/25 bg-[#1b130d]/95 p-3.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-200">
                  先手（下段 A1〜A6）
                </span>
                <span className="font-mono text-xs text-amber-200/90">
                  自陣残り {p1SideTotal} 個 ／ ストア {pits[6]} 個
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-sky-200/90">
                  自陣残り {p2SideTotal} 個 ／ ストア {pits[13]} 個
                </span>
                <span className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-2.5 py-1 text-xs font-black text-sky-200">
                  後手（{mode === 'cpu' ? 'CPU' : '上段 B1〜B6'}）
                </span>
              </div>
            </div>

            <div className="mt-2.5 rounded-xl border border-amber-400/30 bg-black/45 px-3.5 py-2 text-center text-xs font-black text-amber-200 sm:text-sm">
              {banner}
            </div>

            {/* Hover Preview Bar */}
            {hoverPreview && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/35 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-200">
                <span>
                  👀 種まき予測：最後の石は「{pitLabel(hoverPreview.landingPit)}」に着地します
                </span>
                <div className="flex gap-2">
                  {hoverPreview.extraTurn && (
                    <span className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-black text-stone-950">
                      ✨ ぴったりゴールでもう1手！
                    </span>
                  )}
                  {hoverPreview.capturedCount > 0 && (
                    <span className="rounded bg-rose-500 px-2 py-0.5 text-[11px] font-black text-white">
                      🎯 横取り +{hoverPreview.capturedCount}個！
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Carved Wooden Mancala Board */}
          <div className="relative overflow-hidden rounded-3xl border-4 border-[#5b381a] bg-gradient-to-b from-[#432611] via-[#341c0b] to-[#261407] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.75)] sm:p-5">
            {/* Direction guide header */}
            <div className="mb-3 flex items-center justify-between text-[11px] font-bold text-amber-200/75">
              <span>⬅️ 上段（後手・{mode === 'cpu' ? 'CPU' : 'P2'}陣地）は右から左へ反時計回り</span>
              <span>反時計回り（CCW）🔄</span>
            </div>

            <div className="grid grid-cols-[78px_1fr_78px] gap-2 sm:grid-cols-[104px_1fr_104px] sm:gap-3.5">
              {/* Left Store: Player 2 Store (Index 13) */}
              <div
                className={`flex flex-col items-center justify-between rounded-2xl border-2 bg-gradient-to-b from-[#1e1006] to-[#120903] p-2 shadow-inner transition ${
                  activePit === 13
                    ? 'border-sky-400 ring-2 ring-sky-400/60'
                    : hoverPreview?.landingPit === 13
                      ? 'border-amber-300 ring-2 ring-amber-300/60'
                      : 'border-[#6b4423]'
                }`}
              >
                <div className="text-center">
                  <span className="block text-[10px] font-black tracking-wider text-sky-300">
                    {mode === 'cpu' ? 'CPU STORE' : 'P2 STORE'}
                  </span>
                  <span className="font-mono text-2xl font-black text-white sm:text-3xl">
                    {pits[13]}
                  </span>
                </div>
                {renderGems(pits[13], 13)}
                <span className="text-[10px] font-bold text-amber-200/60">後手ゴール</span>
              </div>

              {/* Center 2x6 Pits */}
              <div className="flex flex-col justify-between gap-3 sm:gap-4">
                {/* Top Row: P2 Pits (Indices 12 down to 7, displayed left-to-right) */}
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
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
                        className={`relative flex min-h-[104px] flex-col items-center justify-between rounded-2xl border-2 bg-gradient-to-b from-[#1c0f06] to-[#130a04] p-1.5 shadow-inner transition sm:min-h-[122px] sm:p-2 ${
                          isHint
                            ? 'border-amber-300 ring-2 ring-amber-300'
                            : isLanding
                              ? 'border-emerald-400 ring-2 ring-emerald-400/70'
                              : isCapturedTarget
                                ? 'border-rose-400 ring-2 ring-rose-400/70'
                                : isActive
                                  ? 'border-sky-400'
                                  : canClick
                                    ? 'border-sky-500/50 hover:border-sky-300 hover:bg-[#261509]'
                                    : 'border-[#5a381c]'
                        }`}
                      >
                        <span className="font-mono text-[10px] font-bold text-sky-300/80">
                          B{13 - pitIdx}
                        </span>
                        {renderGems(count, pitIdx)}
                        <span className="rounded-full bg-black/55 px-2 py-0.5 font-mono text-xs font-black text-white sm:text-sm">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Row: P1 Pits (Indices 0 to 5, displayed left-to-right) */}
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
                  {[0, 1, 2, 3, 4, 5].map((pitIdx) => {
                    const count = pits[pitIdx];
                    const canClick =
                      !isAnimating && !gameOver && turn === 1 && count > 0;
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
                        className={`relative flex min-h-[104px] flex-col items-center justify-between rounded-2xl border-2 bg-gradient-to-b from-[#1c0f06] to-[#130a04] p-1.5 shadow-inner transition sm:min-h-[122px] sm:p-2 ${
                          isHint
                            ? 'border-amber-300 ring-2 ring-amber-300'
                            : isLanding
                              ? 'border-emerald-400 ring-2 ring-emerald-400/70'
                              : isCapturedTarget
                                ? 'border-rose-400 ring-2 ring-rose-400/70'
                                : isActive
                                  ? 'border-emerald-400'
                                  : canClick
                                    ? 'border-emerald-500/60 hover:border-emerald-300 hover:bg-[#261509]'
                                    : 'border-[#5a381c]'
                        }`}
                      >
                        <span className="rounded-full bg-black/55 px-2 py-0.5 font-mono text-xs font-black text-white sm:text-sm">
                          {count}
                        </span>
                        {renderGems(count, pitIdx)}
                        <span className="font-mono text-[10px] font-bold text-emerald-300">
                          A{pitIdx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Store: Player 1 Store (Index 6) */}
              <div
                className={`flex flex-col items-center justify-between rounded-2xl border-2 bg-gradient-to-b from-[#1e1006] to-[#120903] p-2 shadow-inner transition ${
                  activePit === 6
                    ? 'border-emerald-400 ring-2 ring-emerald-400/60'
                    : hoverPreview?.landingPit === 6
                      ? 'border-amber-300 ring-2 ring-amber-300/70'
                      : 'border-[#6b4423]'
                }`}
              >
                <div className="text-center">
                  <span className="block text-[10px] font-black tracking-wider text-emerald-300">
                    YOU / P1
                  </span>
                  <span className="font-mono text-2xl font-black text-white sm:text-3xl">
                    {pits[6]}
                  </span>
                </div>
                {renderGems(pits[6], 6)}
                <span className="text-[10px] font-bold text-amber-200/60">先手ゴール</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-amber-200/75">
              <span>
                勝利条件：
                {rule === 'kalah'
                  ? 'カラハ（終了時にゴールストアの石が多い方が勝利）'
                  : 'ベーシック（先に自分の6ポケットをすべて空にした方が即勝利！）'}
              </span>
              <span>下段（先手・あなた）は左から右へ種まき ➡️</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Controls & Rules */}
        <aside className="flex flex-col gap-3">
          {/* Match Actions */}
          <div className="rounded-2xl border border-amber-500/25 bg-[#1b130d]/95 p-3.5">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-400">
              MATCH ACTIONS
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0 || isAnimating || isCpuTurn}
                className="rounded-xl border border-white/15 bg-white/[0.05] px-2 py-2.5 text-xs font-bold text-amber-50 transition hover:border-amber-400/50 disabled:opacity-40"
              >
                ↩ 待った
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={gameOver || isAnimating || isCpuTurn}
                className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-2 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-40"
              >
                💡 AIヒント
              </button>
              <button
                type="button"
                onClick={() => resetGame()}
                className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-2 py-2.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25"
              >
                🔄 新規対局
              </button>
            </div>
            {hintPit !== null && (
              <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-200">
                AI推奨ポケット: <span className="font-mono">{pitLabel(hintPit)}</span>（石 {pits[hintPit]}個）
              </p>
            )}
          </div>

          {/* Rule & Mode Selector */}
          <div className="rounded-2xl border border-white/10 bg-[#1b130d]/95 p-3.5">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-400">
              RULE & MODE / ルールと対戦設定
            </p>

            <p className="mt-2 text-[10px] font-bold text-amber-200/70">ルール選択</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => resetGame('kalah', mode, difficulty, initialSeeds)}
                className={`rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                  rule === 'kalah'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                    : 'border-white/10 bg-white/[0.04] text-amber-200/70'
                }`}
              >
                🏆 カラハ（横取り有）
              </button>
              <button
                type="button"
                onClick={() => resetGame('basic', mode, difficulty, initialSeeds)}
                className={`rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                  rule === 'basic'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                    : 'border-white/10 bg-white/[0.04] text-amber-200/70'
                }`}
              >
                ⚡ ベーシック（先空け）
              </button>
            </div>

            <p className="mt-3 text-[10px] font-bold text-amber-200/70">対戦モード</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => resetGame(rule, 'cpu', difficulty, initialSeeds)}
                className={`rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                  mode === 'cpu'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                    : 'border-white/10 bg-white/[0.04] text-amber-200/70'
                }`}
              >
                🤖 CPU対戦
              </button>
              <button
                type="button"
                onClick={() => resetGame(rule, 'pvp', difficulty, initialSeeds)}
                className={`rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                  mode === 'pvp'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                    : 'border-white/10 bg-white/[0.04] text-amber-200/70'
                }`}
              >
                👥 1台で2人対戦
              </button>
            </div>

            {mode === 'cpu' && (
              <>
                <p className="mt-3 text-[10px] font-bold text-amber-200/70">CPU強さ</p>
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
                      className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                        difficulty === lv
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-white/10 bg-white/[0.04] text-amber-200/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="mt-3 text-[10px] font-bold text-amber-200/70">
              初期の石の数（1ポケットあたり）
            </p>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {([3, 4, 6] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => resetGame(rule, mode, difficulty, cnt)}
                  className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                    initialSeeds === cnt
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-white/10 bg-white/[0.04] text-amber-200/70'
                  }`}
                >
                  {cnt}個（計{cnt * 12}個）
                </button>
              ))}
            </div>
          </div>

          {/* Rule Guide Card */}
          <div className="rounded-2xl border border-white/10 bg-[#1b130d]/95 p-3.5 text-xs leading-relaxed text-amber-100/90">
            <p className="text-[10px] font-black tracking-[0.18em] text-amber-400">
              MANCALA RULES / 2つの定番ルール
            </p>
            <ul className="mt-2 space-y-2 text-[11px] text-amber-200/80">
              <li>
                <strong className="text-amber-300">・ぴったりゴール（共通）：</strong>
                種まきの最後の1個が自分のゴールストアに入ると、続けてもう1回手番を行えます！
              </li>
              <li>
                <strong className="text-amber-300">・カラハ（Kalah・高戦略ルール）：</strong>
                最後の1個が自陣の「空のポケット」に入り、向かい側の相手ポケットに石がある場合、両方とも自分のストアへ横取りできます。最終的にストアの石が多い方が勝利です。
              </li>
              <li>
                <strong className="text-amber-300">・ベーシック（先に自陣を空にするルール）：</strong>
                学童や家庭でもおなじみのスピードルール。ストアの石数は競わず、先に自分の6ポケットをすべて空（0個）にしたプレイヤーがその場で勝利します。
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
