'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export type Player = 1 | 2; // 1 = Emerald (First), 2 = Amber/Violet (Second / CPU)
export type GameMode = 'cpu' | '2p';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type BoxGridSize = 3 | 4 | 5;

export interface EdgeMove {
  orient: 'h' | 'v';
  r: number;
  c: number;
}

export interface DotsState {
  hEdges: (Player | null)[][]; // (N+1) rows x N cols
  vEdges: (Player | null)[][]; // N rows x (N+1) cols
  boxes: (Player | null)[][]; // N rows x N cols
}

interface Snapshot {
  state: DotsState;
  turn: Player;
  lastEdge: EdgeMove | null;
  bonusActive: boolean;
}

function createInitialState(size: BoxGridSize): DotsState {
  return {
    hEdges: Array.from({ length: size + 1 }, () => Array(size).fill(null)),
    vEdges: Array.from({ length: size }, () => Array(size + 1).fill(null)),
    boxes: Array.from({ length: size }, () => Array(size).fill(null)),
  };
}

function cloneState(st: DotsState): DotsState {
  return {
    hEdges: st.hEdges.map((row) => [...row]),
    vEdges: st.vEdges.map((row) => [...row]),
    boxes: st.boxes.map((row) => [...row]),
  };
}

export function countBoxSides(st: DotsState, r: number, c: number): number {
  let cnt = 0;
  if (st.hEdges[r][c] !== null) cnt++;
  if (st.hEdges[r + 1][c] !== null) cnt++;
  if (st.vEdges[r][c] !== null) cnt++;
  if (st.vEdges[r][c + 1] !== null) cnt++;
  return cnt;
}

export function getAdjacentBoxes(
  edge: EdgeMove,
  size: number,
): { r: number; c: number }[] {
  const res: { r: number; c: number }[] = [];
  if (edge.orient === 'h') {
    if (edge.r > 0) res.push({ r: edge.r - 1, c: edge.c });
    if (edge.r < size) res.push({ r: edge.r, c: edge.c });
  } else {
    if (edge.c > 0) res.push({ r: edge.r, c: edge.c - 1 });
    if (edge.c < size) res.push({ r: edge.r, c: edge.c });
  }
  return res;
}

export function getAllAvailableEdges(st: DotsState, size: number): EdgeMove[] {
  const edges: EdgeMove[] = [];
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c < size; c++) {
      if (st.hEdges[r][c] === null) edges.push({ orient: 'h', r, c });
    }
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size; c++) {
      if (st.vEdges[r][c] === null) edges.push({ orient: 'v', r, c });
    }
  }
  return edges;
}

export function applyEdgeMove(
  st: DotsState,
  edge: EdgeMove,
  player: Player,
  size: number,
): { nextState: DotsState; claimedBoxes: { r: number; c: number }[] } {
  const next = cloneState(st);
  if (edge.orient === 'h') {
    next.hEdges[edge.r][edge.c] = player;
  } else {
    next.vEdges[edge.r][edge.c] = player;
  }

  const claimedBoxes: { r: number; c: number }[] = [];
  for (const box of getAdjacentBoxes(edge, size)) {
    if (next.boxes[box.r][box.c] === null && countBoxSides(next, box.r, box.c) === 4) {
      next.boxes[box.r][box.c] = player;
      claimedBoxes.push(box);
    }
  }

  return { nextState: next, claimedBoxes };
}

// Simulate how many boxes opponent can immediately chain-capture if we play `edge`
function simulateGiveawayChainLength(st: DotsState, edge: EdgeMove, size: number): number {
  const { nextState, claimedBoxes } = applyEdgeMove(st, edge, 1, size);
  if (claimedBoxes.length > 0) return 0;

  const sim = cloneState(nextState);
  let chainCount = 0;
  let foundThree = true;

  while (foundThree) {
    foundThree = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (sim.boxes[r][c] === null && countBoxSides(sim, r, c) === 3) {
          // Find the missing 4th edge of this box
          let missingEdge: EdgeMove | null = null;
          if (sim.hEdges[r][c] === null) missingEdge = { orient: 'h', r, c };
          else if (sim.hEdges[r + 1][c] === null) missingEdge = { orient: 'h', r: r + 1, c };
          else if (sim.vEdges[r][c] === null) missingEdge = { orient: 'v', r, c };
          else if (sim.vEdges[r][c + 1] === null) missingEdge = { orient: 'v', r, c: c + 1 };

          if (missingEdge) {
            const res = applyEdgeMove(sim, missingEdge, 2, size);
            sim.hEdges = res.nextState.hEdges;
            sim.vEdges = res.nextState.vEdges;
            sim.boxes = res.nextState.boxes;
            chainCount += res.claimedBoxes.length;
            foundThree = true;
          }
        }
      }
    }
  }

  return chainCount;
}

export function analyzeBoardMetrics(st: DotsState, size: number) {
  const edges = getAllAvailableEdges(st, size);
  let scoringEdges = 0;
  let safeEdges = 0;
  let riskyEdges = 0;
  let minSacrificeChain = Infinity;

  for (const e of edges) {
    const adj = getAdjacentBoxes(e, size);
    const completesBox = adj.some((b) => countBoxSides(st, b.r, b.c) === 3);
    const createsThree = adj.some((b) => countBoxSides(st, b.r, b.c) === 2);

    if (completesBox) {
      scoringEdges++;
    } else if (!createsThree) {
      safeEdges++;
    } else {
      riskyEdges++;
      const giveaway = simulateGiveawayChainLength(st, e, size);
      if (giveaway < minSacrificeChain) minSacrificeChain = giveaway;
    }
  }

  let threeSidedBoxes = 0;
  let twoSidedBoxes = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (st.boxes[r][c] !== null) continue;
      const sides = countBoxSides(st, r, c);
      if (sides === 3) threeSidedBoxes++;
      else if (sides === 2) twoSidedBoxes++;
    }
  }

  return {
    scoringEdges,
    safeEdges,
    riskyEdges,
    threeSidedBoxes,
    twoSidedBoxes,
    minSacrificeChain: minSacrificeChain === Infinity ? 0 : minSacrificeChain,
  };
}

function chooseBestDotsEdge(
  st: DotsState,
  player: Player,
  size: number,
  difficulty: Difficulty,
): { edge: EdgeMove; reason: string } | null {
  const allEdges = getAllAvailableEdges(st, size);
  if (allEdges.length === 0) return null;

  const scoringMoves: { edge: EdgeMove; claimed: number }[] = [];
  const safeMoves: { edge: EdgeMove; twoCount: number }[] = [];
  const sacrificeMoves: { edge: EdgeMove; giveaway: number }[] = [];

  for (const edge of allEdges) {
    const adj = getAdjacentBoxes(edge, size);
    const claimed = adj.filter((b) => countBoxSides(st, b.r, b.c) === 3).length;
    const createsThree = adj.some((b) => countBoxSides(st, b.r, b.c) === 2);

    if (claimed > 0) {
      scoringMoves.push({ edge, claimed });
    } else if (!createsThree) {
      const addsToOneSide = adj.filter((b) => countBoxSides(st, b.r, b.c) === 1).length;
      safeMoves.push({ edge, twoCount: addsToOneSide });
    } else {
      const giveaway = simulateGiveawayChainLength(st, edge, size);
      sacrificeMoves.push({ edge, giveaway });
    }
  }

  // Easy AI: Claims boxes 75% of the time, otherwise picks random safe or random move
  if (difficulty === 'easy') {
    if (scoringMoves.length > 0 && Math.random() < 0.78) {
      return {
        edge: scoringMoves[0].edge,
        reason: '3辺が埋まったボックスの4辺目を引いて陣地を獲得します！',
      };
    }
    if (safeMoves.length > 0 && Math.random() < 0.7) {
      const pick = safeMoves[Math.floor(Math.random() * safeMoves.length)];
      return {
        edge: pick.edge,
        reason: '相手に3辺目のリーチを与えない安全な辺を引きます。',
      };
    }
    const pick = allEdges[Math.floor(Math.random() * allEdges.length)];
    return { edge: pick, reason: '隣接するドットを結んで陣取りを進めます。' };
  }

  // Hard AI Double-Cross (ダブルクロス / 2マス献上) check:
  // If we have a 2-box chain at the end of a capture sequence, no safe moves remain,
  // and another larger chain (>= 3 boxes) still exists on the board, sacrifice the last 2 boxes!
  if (
    difficulty === 'hard' &&
    scoringMoves.length === 1 &&
    safeMoves.length === 0 &&
    sacrificeMoves.length >= 2
  ) {
    // Check if taking this scoring move creates a 2nd box, or if a non-scoring edge splits the 2-box domino
    const totalClaimedOnBoard = st.boxes.flat().filter((b) => b !== null).length;
    const remainingUnclaimed = size * size - totalClaimedOnBoard;
    if (remainingUnclaimed >= 5) {
      // Check if there is a move that gives away exactly 2 boxes without claiming first (Double-Cross!)
      const doubleCross = sacrificeMoves.find((m) => m.giveaway === 2);
      const takeAndCheck = applyEdgeMove(st, scoringMoves[0].edge, player, size);
      const nextThreeSided = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (__, c) =>
          takeAndCheck.nextState.boxes[r][c] === null &&
          countBoxSides(takeAndCheck.nextState, r, c) === 3,
        ),
      )
        .flat()
        .filter(Boolean).length;

      // If taking this box completes a 2-box domino (leaving 0 three-sided boxes) and forces us to open a longer chain:
      if (nextThreeSided === 1 && doubleCross) {
        // Find the smallest chain we'd have to open after taking both boxes
        sacrificeMoves.sort((a, b) => a.giveaway - b.giveaway);
        const nextChainIfWeTake = sacrificeMoves[0]?.giveaway ?? 0;
        if (nextChainIfWeTake >= 4) {
          return {
            edge: doubleCross.edge,
            reason:
              '【高等戦術：ダブルクロス】最後の2ボックスをあえて相手に取らせることで、次の巨大チェーンの獲得権を奪います！',
          };
        }
      }
    }
  }

  // Priority 1: Claim 3-sided boxes (prefer double-box captures first!)
  if (scoringMoves.length > 0) {
    scoringMoves.sort((a, b) => b.claimed - a.claimed);
    const best = scoringMoves[0];
    return {
      edge: best.edge,
      reason:
        best.claimed === 2
          ? '1本の線で2つのボックスを同時に獲得し、さらにボーナスターンを得ます！'
          : '3辺が揃ったボックスの4辺目を完成させて陣地獲得＆もう1手を得ます！',
    };
  }

  // Priority 2: Safe moves (do not create a 3rd side on any box)
  if (safeMoves.length > 0) {
    // In Hard mode, prefer edges that prepare 2-sided chains carefully
    safeMoves.sort((a, b) => a.twoCount - b.twoCount);
    const pick = safeMoves[0];
    return {
      edge: pick.edge,
      reason: 'どのボックスも3辺（リーチ状態）にしない安全な辺です。',
    };
  }

  // Priority 3: Forced sacrifice — choose the edge that gives away the SHORTEST chain!
  sacrificeMoves.sort((a, b) => a.giveaway - b.giveaway);
  const minSac = sacrificeMoves[0];
  return {
    edge: minSac.edge,
    reason: `安全な辺が尽きたため、相手に渡す連鎖数が最小（${minSac.giveaway}ボックス）になる辺を選択します。`,
  };
}

function formatEdgeLabel(edge: EdgeMove): string {
  const dir = edge.orient === 'h' ? '横線' : '縦線';
  return `${dir}(${edge.r + 1}, ${edge.c + 1})`;
}

export default function DotsAndBoxesGame() {
  const [boxSize, setBoxSize] = useState<BoxGridSize>(4);
  const [state, setState] = useState<DotsState>(() => createInitialState(4));
  const [turn, setTurn] = useState<Player>(1);
  const [bonusTurnBanner, setBonusTurnBanner] = useState<boolean>(false);

  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [showSideNumbers, setShowSideNumbers] = useState<boolean>(true);

  const [lastEdge, setLastEdge] = useState<EdgeMove | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [hint, setHint] = useState<{ edge: EdgeMove; reason: string } | null>(null);

  const scores = useMemo(() => {
    let p1 = 0;
    let p2 = 0;
    for (let r = 0; r < boxSize; r++) {
      for (let c = 0; c < boxSize; c++) {
        if (state.boxes[r][c] === 1) p1++;
        else if (state.boxes[r][c] === 2) p2++;
      }
    }
    return { p1, p2, total: boxSize * boxSize, remaining: boxSize * boxSize - p1 - p2 };
  }, [state.boxes, boxSize]);

  const metrics = useMemo(() => analyzeBoardMetrics(state, boxSize), [state, boxSize]);

  const isGameOver = scores.remaining === 0;
  const winner: Player | 'draw' | null = useMemo(() => {
    if (!isGameOver) return null;
    if (scores.p1 > scores.p2) return 1;
    if (scores.p2 > scores.p1) return 2;
    return 'draw';
  }, [isGameOver, scores.p1, scores.p2]);

  const resetGame = useCallback((newSize: BoxGridSize) => {
    setBoxSize(newSize);
    setState(createInitialState(newSize));
    setTurn(1);
    setBonusTurnBanner(false);
    setLastEdge(null);
    setSnapshots([]);
    setLogs([]);
    setHint(null);
  }, []);

  const executeEdge = useCallback(
    (edge: EdgeMove, isAi = false) => {
      if (isGameOver) return;
      const alreadyDrawn =
        edge.orient === 'h'
          ? state.hEdges[edge.r][edge.c] !== null
          : state.vEdges[edge.r][edge.c] !== null;
      if (alreadyDrawn) return;

      if (!isAi) {
        setSnapshots((prev) => [
          ...prev.slice(-35),
          {
            state: cloneState(state),
            turn,
            lastEdge,
            bonusActive: bonusTurnBanner,
          },
        ]);
      }

      const { nextState, claimedBoxes } = applyEdgeMove(state, edge, turn, boxSize);
      const pName =
        turn === 1 ? 'エメラルド(先手)' : gameMode === 'cpu' ? 'バイオレット(CPU)' : 'バイオレット(後手)';
      const claimMsg =
        claimedBoxes.length > 0
          ? ` 🎉 ボックス ${claimedBoxes.length} 個獲得！ボーナスターン発動！`
          : '';

      setState(nextState);
      setLastEdge(edge);
      setHint(null);
      setLogs((prev) => [`${pName}: ${formatEdgeLabel(edge)}${claimMsg}`, ...prev.slice(0, 34)]);

      if (claimedBoxes.length > 0) {
        setBonusTurnBanner(true);
        // Same player keeps turn!
      } else {
        setBonusTurnBanner(false);
        setTurn((t) => (t === 1 ? 2 : 1));
      }
    },
    [isGameOver, state, turn, lastEdge, bonusTurnBanner, boxSize, gameMode],
  );

  // CPU Turn Handler (including chained bonus turns!)
  useEffect(() => {
    if (isGameOver) return;
    if (gameMode !== 'cpu' || turn !== 2) return;

    const timer = window.setTimeout(() => {
      const best = chooseBestDotsEdge(state, 2, boxSize, difficulty);
      if (best) {
        executeEdge(best.edge, true);
      }
    }, bonusTurnBanner ? 340 : 480);

    return () => window.clearTimeout(timer);
  }, [isGameOver, gameMode, turn, state, boxSize, difficulty, bonusTurnBanner, executeEdge]);

  const handleUndo = () => {
    if (snapshots.length === 0) return;
    const prev = snapshots[snapshots.length - 1];
    setState(prev.state);
    setTurn(prev.turn);
    setLastEdge(prev.lastEdge);
    setBonusTurnBanner(prev.bonusActive);
    setSnapshots((s) => s.slice(0, -1));
    setLogs((l) => l.slice(1));
    setHint(null);
  };

  const handleHint = () => {
    if (isGameOver) return;
    if (gameMode === 'cpu' && turn === 2) return;
    const res = chooseBestDotsEdge(state, turn, boxSize, 'hard');
    if (res) setHint(res);
  };

  // SVG Layout geometry
  const pad = 54;
  const cellSpan = boxSize === 3 ? 124 : boxSize === 4 ? 98 : 80;
  const svgDim = pad * 2 + boxSize * cellSpan;

  return (
    <div className="min-h-screen bg-[#060b14] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#0a1020]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-400/60 hover:text-white"
          >
            ← 無料ゲーム一覧へ
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              DOTS AND BOXES
            </span>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6">
        {/* Control Header */}
        <div className="mb-4 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-[#0f172a] to-slate-900/95 p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                ドット＆ボックス（陣取り線引きボードゲーム）
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                隣り合うドットを線で結び、正方形の4辺目を完成させたプレイヤーがボックスを獲得＆連続手番！3辺目を渡さない読み合いと「ダブルクロス」が鍵。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
                {(
                  [
                    [3, '3×3 (9マス)'],
                    [4, '4×4 (16マス)'],
                    [5, '5×5 (25マス)'],
                  ] as const
                ).map(([sz, label]) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => resetGame(sz)}
                    className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                      boxSize === sz
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setGameMode('cpu');
                    resetGame(boxSize);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    gameMode === 'cpu'
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  CPU対戦
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGameMode('2p');
                    resetGame(boxSize);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    gameMode === '2p'
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  1台で2人対戦
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {gameMode === 'cpu' && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">CPU強さ:</span>
                  {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`rounded-md px-2.5 py-1 font-medium transition ${
                        difficulty === d
                          ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {d === 'easy' ? '初級' : d === 'normal' ? '中級' : '上級(ダブルクロスAI)'}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowSideNumbers((v) => !v)}
                className={`rounded-lg border px-2.5 py-1 font-medium transition ${
                  showSideNumbers
                    ? 'border-sky-500/50 bg-sky-500/15 text-sky-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                ボックス辺数ガイド: {showSideNumbers ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleHint}
                disabled={isGameOver || (gameMode === 'cpu' && turn === 2)}
                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 font-semibold text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-40"
              >
                💡 ヒント
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={snapshots.length === 0}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
              >
                ↩ 待った
              </button>
              <button
                type="button"
                onClick={() => resetGame(boxSize)}
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-semibold text-rose-300 transition hover:bg-rose-500/25"
              >
                🔄 新規対局
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Dots & Boxes SVG Board */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-800 bg-[#0b1222] p-3 shadow-2xl sm:p-5">
              {/* Turn & Bonus Banner */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-3.5 w-3.5 rounded-full ${
                      turn === 1
                        ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                        : 'bg-violet-400 shadow-[0_0_10px_#a78bfa]'
                    }`}
                  />
                  <span className="text-sm font-bold text-white">
                    {winner
                      ? winner === 'draw'
                        ? '🤝 引き分け！'
                        : winner === 1
                          ? `🏆 エメラルド（先手）の勝利！（${scores.p1} 対 ${scores.p2}）`
                          : gameMode === 'cpu'
                            ? `🏆 バイオレット（CPU）の勝利！（${scores.p2} 対 ${scores.p1}）`
                            : `🏆 バイオレット（後手）の勝利！（${scores.p2} 対 ${scores.p1}）`
                      : turn === 1
                        ? 'エメラルド（先手）の手番'
                        : gameMode === 'cpu'
                          ? 'バイオレット（CPU）が思考中...'
                          : 'バイオレット（後手）の手番'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {bonusTurnBanner && !isGameOver && (
                    <span className="animate-bounce rounded-full border border-amber-400/60 bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-200">
                      🎁 ボックス獲得でもう1手！続けて線を引けます
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    残りボックス: <strong className="text-white">{scores.remaining}</strong> /{' '}
                    {scores.total}
                  </span>
                </div>
              </div>

              {/* Interactive SVG Grid */}
              <div className="mx-auto max-w-[490px]">
                <svg
                  viewBox={`0 0 ${svgDim} ${svgDim}`}
                  className="h-auto w-full select-none rounded-2xl border border-slate-800 bg-[#070c18] shadow-inner"
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Boxes */}
                  {state.boxes.map((row, r) =>
                    row.map((owner, c) => {
                      const x = pad + c * cellSpan;
                      const y = pad + r * cellSpan;
                      const sides = countBoxSides(state, r, c);

                      let boxFill = 'transparent';
                      if (owner === 1) boxFill = 'rgba(16, 185, 129, 0.28)';
                      else if (owner === 2) boxFill = 'rgba(139, 92, 246, 0.30)';
                      else if (sides === 3) boxFill = 'rgba(245, 158, 11, 0.14)';

                      return (
                        <g key={`box-${r}-${c}`}>
                          <rect
                            x={x + 6}
                            y={y + 6}
                            width={cellSpan - 12}
                            height={cellSpan - 12}
                            rx={10}
                            fill={boxFill}
                          />
                          {owner ? (
                            <text
                              x={x + cellSpan / 2}
                              y={y + cellSpan / 2 + 7}
                              textAnchor="middle"
                              className={`text-lg font-black ${
                                owner === 1 ? 'fill-emerald-300' : 'fill-violet-300'
                              }`}
                            >
                              {owner === 1 ? 'P1' : gameMode === 'cpu' ? 'CPU' : 'P2'}
                            </text>
                          ) : (
                            showSideNumbers && (
                              <text
                                x={x + cellSpan / 2}
                                y={y + cellSpan / 2 + 5}
                                textAnchor="middle"
                                className={`text-xs font-bold ${
                                  sides === 3
                                    ? 'fill-amber-300'
                                    : sides === 2
                                      ? 'fill-rose-400/75'
                                      : 'fill-slate-600'
                                }`}
                              >
                                {sides === 3 ? '★3辺(獲得可!)' : `${sides}/4`}
                              </text>
                            )
                          )}
                        </g>
                      );
                    }),
                  )}

                  {/* Horizontal Edges */}
                  {state.hEdges.map((row, r) =>
                    row.map((owner, c) => {
                      const x1 = pad + c * cellSpan;
                      const y1 = pad + r * cellSpan;
                      const x2 = x1 + cellSpan;
                      const isLast =
                        lastEdge?.orient === 'h' && lastEdge.r === r && lastEdge.c === c;
                      const isHint =
                        hint?.edge.orient === 'h' && hint.edge.r === r && hint.edge.c === c;

                      return (
                        <g
                          key={`h-${r}-${c}`}
                          onClick={() => {
                            if (gameMode === 'cpu' && turn === 2) return;
                            executeEdge({ orient: 'h', r, c }, false);
                          }}
                          className={owner === null ? 'cursor-pointer group' : ''}
                        >
                          {/* Wide transparent hit area */}
                          <rect
                            x={x1 + 10}
                            y={y1 - 16}
                            width={cellSpan - 20}
                            height={32}
                            fill="transparent"
                          />
                          {/* Base guide track */}
                          <line
                            x1={x1 + 10}
                            y1={y1}
                            x2={x2 - 10}
                            y2={y1}
                            stroke={
                              owner === 1
                                ? '#10b981'
                                : owner === 2
                                  ? '#8b5cf6'
                                  : isHint
                                    ? '#fbbf24'
                                    : '#1e293b'
                            }
                            strokeWidth={owner !== null ? 8 : isHint ? 6 : 5}
                            strokeLinecap="round"
                            strokeDasharray={owner === null && !isHint ? '4 6' : undefined}
                          />
                          {isLast && (
                            <circle cx={(x1 + x2) / 2} cy={y1} r={5} fill="#fef08a" />
                          )}
                        </g>
                      );
                    }),
                  )}

                  {/* Vertical Edges */}
                  {state.vEdges.map((row, r) =>
                    row.map((owner, c) => {
                      const x1 = pad + c * cellSpan;
                      const y1 = pad + r * cellSpan;
                      const y2 = y1 + cellSpan;
                      const isLast =
                        lastEdge?.orient === 'v' && lastEdge.r === r && lastEdge.c === c;
                      const isHint =
                        hint?.edge.orient === 'v' && hint.edge.r === r && hint.edge.c === c;

                      return (
                        <g
                          key={`v-${r}-${c}`}
                          onClick={() => {
                            if (gameMode === 'cpu' && turn === 2) return;
                            executeEdge({ orient: 'v', r, c }, false);
                          }}
                          className={owner === null ? 'cursor-pointer group' : ''}
                        >
                          {/* Wide transparent hit area */}
                          <rect
                            x={x1 - 16}
                            y={y1 + 10}
                            width={32}
                            height={cellSpan - 20}
                            fill="transparent"
                          />
                          {/* Base guide track */}
                          <line
                            x1={x1}
                            y1={y1 + 10}
                            x2={x1}
                            y2={y2 - 10}
                            stroke={
                              owner === 1
                                ? '#10b981'
                                : owner === 2
                                  ? '#8b5cf6'
                                  : isHint
                                    ? '#fbbf24'
                                    : '#1e293b'
                            }
                            strokeWidth={owner !== null ? 8 : isHint ? 6 : 5}
                            strokeLinecap="round"
                            strokeDasharray={owner === null && !isHint ? '4 6' : undefined}
                          />
                          {isLast && (
                            <circle cx={x1} cy={(y1 + y2) / 2} r={5} fill="#fef08a" />
                          )}
                        </g>
                      );
                    }),
                  )}

                  {/* Grid Dots */}
                  {Array.from({ length: boxSize + 1 }).map((_, r) =>
                    Array.from({ length: boxSize + 1 }).map((__, c) => {
                      const cx = pad + c * cellSpan;
                      const cy = pad + r * cellSpan;
                      return (
                        <circle
                          key={`dot-${r}-${c}`}
                          cx={cx}
                          cy={cy}
                          r={7.5}
                          fill="#f8fafc"
                          stroke="#334155"
                          strokeWidth={2.5}
                          pointerEvents="none"
                        />
                      );
                    }),
                  )}
                </svg>
              </div>

              {hint && (
                <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <span className="font-bold">💡 AI戦術ヒント ({formatEdgeLabel(hint.edge)}): </span>
                  {hint.reason}
                </div>
              )}
            </div>
          </div>

          {/* Right Analytics & Scoreboard Column */}
          <div className="space-y-4 lg:col-span-4">
            {/* Player Score Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-2xl border p-3.5 ${
                  turn === 1 && !isGameOver
                    ? 'border-emerald-500/70 bg-emerald-950/30 shadow-lg'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">エメラルド（先手）</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                    P1
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <strong className="text-3xl font-extrabold text-white">{scores.p1}</strong>
                  <span className="text-xs text-slate-400">ボックス獲得</span>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-3.5 ${
                  turn === 2 && !isGameOver
                    ? 'border-violet-400/70 bg-violet-950/30 shadow-lg'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-300">
                    {gameMode === 'cpu' ? 'バイオレット（CPU）' : 'バイオレット（後手）'}
                  </span>
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200">
                    {gameMode === 'cpu' ? difficulty.toUpperCase() : 'P2'}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <strong className="text-3xl font-extrabold text-white">{scores.p2}</strong>
                  <span className="text-xs text-slate-400">ボックス獲得</span>
                </div>
              </div>
            </div>

            {/* Live Chain-Length Analyzer */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-sm font-bold text-white">🔍 リアルタイム盤面・チェーン解析</h3>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                  <div className="text-slate-400">即獲得可能な3辺ボックス</div>
                  <div className="mt-1 text-lg font-extrabold text-amber-300">
                    {metrics.threeSidedBoxes} 個
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                  <div className="text-slate-400">安全な辺（リーチ与えず）</div>
                  <div className="mt-1 text-lg font-extrabold text-emerald-300">
                    {metrics.safeEdges} 本
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                  <div className="text-slate-400">2辺済み警戒ボックス</div>
                  <div className="mt-1 text-lg font-extrabold text-rose-300">
                    {metrics.twoSidedBoxes} 個
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                  <div className="text-slate-400">最小献上チェーン長</div>
                  <div className="mt-1 text-lg font-extrabold text-sky-300">
                    {metrics.minSacrificeChain} マス
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Guide */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-sm font-bold text-white">📐 ドット＆ボックスの必勝セオリー</h3>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
                <li>
                  ・<strong>ボーナスターン</strong>: 4辺目を引いてボックスを完成させたプレイヤーは、そのまま連続でもう1本線を引けます。
                </li>
                <li>
                  ・<strong>3辺目を引かない鉄則</strong>: すでに2辺が引かれたボックスに3辺目を引くと、相手に4辺目を奪われチェーン（連鎖）で大量失点します。
                </li>
                <li>
                  ・<strong>ダブルクロス（2マス献上）</strong>: 長いチェーンを取り切る直前、最後の2ボックスだけあえて相手に渡すことで、次の長いチェーンを自分が獲得する高等テクニックです。
                </li>
              </ul>
            </div>

            {/* Move Log */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">📜 対局ログ</h3>
                <span className="text-[11px] text-slate-400">{logs.length} 手</span>
              </div>
              <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1 text-xs">
                {logs.length === 0 ? (
                  <p className="py-4 text-center text-slate-500">
                    ドットとドットの間の破線をタップして最初の線を引いてください。
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={`${i}-${log}`}
                      className="rounded-lg border border-slate-800/90 bg-slate-950/60 px-2.5 py-1.5 text-slate-300"
                    >
                      <span className="mr-1.5 font-mono text-[10px] text-slate-500">
                        #{logs.length - i}
                      </span>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
