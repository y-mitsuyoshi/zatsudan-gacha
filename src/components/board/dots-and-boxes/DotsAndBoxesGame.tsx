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
        turn === 1 ? '深緑(先手)' : gameMode === 'cpu' ? '朱(CPU)' : '朱(後手)';
      const claimMsg =
        claimedBoxes.length > 0
          ? `  ボックス ${claimedBoxes.length} 個獲得！ボーナスターン発動！`
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
    <div className="tabletop-page">
      <header className="tabletop-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6">
          <Link
            href="/games"
            className="tabletop-button inline-flex min-h-11 items-center gap-2 px-3 text-xs"
          >
            <span aria-hidden="true">←</span>
            <span>ゲーム一覧</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="tabletop-kicker hidden sm:inline">Dots &amp; Boxes · Paper</span>
            <div className="[&>button]:h-11 [&>button]:w-11 [&>div]:h-11 [&>div]:w-11">
              <ThemeToggleButton />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        {/* Title & Match Controls */}
        <section className="tabletop-panel mb-4 p-3 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="tabletop-kicker">Paper &amp; Pencil · Territory</p>
              <h2 className="tabletop-title mt-1 text-xl sm:text-2xl">
                ドット＆ボックス
              </h2>
              <p className="tabletop-muted mt-1 max-w-2xl text-xs leading-relaxed sm:text-sm">
                隣り合うドットを線で結び、四角い陣地を奪い合うペンと紙の定番ゲーム。4辺目を完成させるとボックスを獲得し、続けて線を引けます。
              </p>
            </div>

            <div
              role="group"
              aria-label="盤面サイズ"
              className="flex flex-wrap gap-1.5"
            >
              {(
                [
                  [3, '3×3'],
                  [4, '4×4'],
                  [5, '5×5'],
                ] as const
              ).map(([sz, label]) => (
                <button
                  key={sz}
                  type="button"
                  data-size={sz}
                  onClick={() => resetGame(sz)}
                  className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                    boxSize === sz ? 'tabletop-chip-active' : ''
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="tabletop-divider mt-3 flex flex-col gap-2 border-t pt-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="対戦モード" className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  data-mode="cpu"
                  onClick={() => {
                    setGameMode('cpu');
                    resetGame(boxSize);
                  }}
                  className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                    gameMode === 'cpu' ? 'tabletop-chip-active' : ''
                  }`}
                >
                  CPU対戦
                </button>
                <button
                  type="button"
                  data-mode="2p"
                  onClick={() => {
                    setGameMode('2p');
                    resetGame(boxSize);
                  }}
                  className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                    gameMode === '2p' ? 'tabletop-chip-active' : ''
                  }`}
                >
                  1台で2人対戦
                </button>
              </div>

              {gameMode === 'cpu' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="tabletop-muted text-[11px]">CPU強さ</span>
                  {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      data-difficulty={d}
                      onClick={() => setDifficulty(d)}
                      className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                        difficulty === d ? 'tabletop-chip-active' : ''
                      }`}
                    >
                      {d === 'easy' ? '初級' : d === 'normal' ? '中級' : '上級'}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                data-toggle="side-numbers"
                aria-pressed={showSideNumbers}
                onClick={() => setShowSideNumbers((v) => !v)}
                className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                  showSideNumbers ? 'tabletop-chip-active' : ''
                }`}
              >
                辺数ガイド
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                data-action="hint"
                onClick={handleHint}
                disabled={isGameOver || (gameMode === 'cpu' && turn === 2)}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                ヒント
              </button>
              <button
                type="button"
                data-action="undo"
                onClick={handleUndo}
                disabled={snapshots.length === 0}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                待った
              </button>
              <button
                type="button"
                data-action="reset"
                onClick={() => resetGame(boxSize)}
                className="tabletop-button-primary inline-flex min-h-11 items-center justify-center px-3 text-xs"
              >
                新規対局
              </button>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Board Column */}
          <div className="min-w-0 lg:col-span-8">
            <div className="tabletop-panel p-2.5 sm:p-4">
              {/* Turn & Bonus Banner */}
              <div className="tabletop-panel-soft mb-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      turn === 1 ? 'bg-[#315d4e]' : 'bg-[#9f4540]'
                    }`}
                  />
                  <span className="truncate text-xs font-semibold text-[#f4ead8] sm:text-sm">
                    {winner
                      ? winner === 'draw'
                        ? '引き分け'
                        : winner === 1
                          ? `深緑（先手）の勝利 ${scores.p1}–${scores.p2}`
                          : gameMode === 'cpu'
                            ? `朱（CPU）の勝利 ${scores.p2}–${scores.p1}`
                            : `朱（後手）の勝利 ${scores.p2}–${scores.p1}`
                      : turn === 1
                        ? '深緑（先手）の手番'
                        : gameMode === 'cpu'
                          ? '朱（CPU）が思考中'
                          : '朱（後手）の手番'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {bonusTurnBanner && !isGameOver && (
                    <span className="tabletop-chip tabletop-chip-active px-2.5 py-1 text-[10px] font-semibold sm:text-[11px]">
                      ボックス獲得 — もう1手
                    </span>
                  )}
                  <span className="tabletop-chip px-2.5 py-1 text-[10px] font-semibold sm:text-[11px]">
                    残り {scores.remaining} / {scores.total}
                  </span>
                </div>
              </div>

              {/* Paper Board */}
              <div className="tabletop-board-frame mx-auto max-w-[520px] p-1.5 sm:p-2">
                <svg
                  viewBox={`0 0 ${svgDim} ${svgDim}`}
                  role="img"
                  aria-label="ドット＆ボックスの盤面"
                  className="block h-auto w-full select-none"
                  style={{ touchAction: 'manipulation' }}
                >
                  <defs>
                    <linearGradient id="dotsPaper" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f8f2e7" />
                      <stop offset="55%" stopColor="#f2eadd" />
                      <stop offset="100%" stopColor="#eadfcd" />
                    </linearGradient>
                    <pattern id="dotsGrain" width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="1.4" cy="1.4" r="0.6" fill="#b7a58c" opacity="0.3" />
                    </pattern>
                  </defs>

                  <rect x="0" y="0" width={svgDim} height={svgDim} rx="6" fill="url(#dotsPaper)" />
                  <rect x="0" y="0" width={svgDim} height={svgDim} rx="6" fill="url(#dotsGrain)" />
                  <rect
                    x={pad - 18}
                    y={pad - 18}
                    width={boxSize * cellSpan + 36}
                    height={boxSize * cellSpan + 36}
                    rx="4"
                    fill="none"
                    stroke="#d6c8b4"
                    strokeWidth="1.5"
                  />

                  {/* Boxes */}
                  {state.boxes.map((row, r) =>
                    row.map((owner, c) => {
                      const x = pad + c * cellSpan;
                      const y = pad + r * cellSpan;
                      const sides = countBoxSides(state, r, c);

                      let boxFill = 'transparent';
                      if (owner === 1) boxFill = 'rgba(49, 93, 78, 0.18)';
                      else if (owner === 2) boxFill = 'rgba(159, 69, 64, 0.16)';
                      else if (sides === 3) boxFill = 'rgba(185, 133, 63, 0.16)';

                      return (
                        <g key={`box-${r}-${c}`}>
                          <rect
                            x={x + 7}
                            y={y + 7}
                            width={cellSpan - 14}
                            height={cellSpan - 14}
                            rx={7}
                            fill={boxFill}
                          />
                          {owner ? (
                            <text
                              x={x + cellSpan / 2}
                              y={y + cellSpan / 2 + 6}
                              textAnchor="middle"
                              fill={owner === 1 ? '#315d4e' : '#8b3a34'}
                              fontSize={boxSize === 5 ? 14 : 17}
                              fontWeight="700"
                              fontFamily="'Hiragino Mincho ProN', 'Yu Mincho', serif"
                            >
                              {owner === 1 ? 'P1' : gameMode === 'cpu' ? 'CPU' : 'P2'}
                            </text>
                          ) : (
                            showSideNumbers && (
                              <text
                                x={x + cellSpan / 2}
                                y={y + cellSpan / 2 + 4}
                                textAnchor="middle"
                                fill={sides === 3 ? '#a06a20' : sides === 2 ? '#9f4540' : '#a4937b'}
                                fontSize={boxSize === 5 ? 10 : 12}
                                fontWeight="700"
                                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                              >
                                {sides === 3 ? '3辺' : `${sides}/4`}
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
                          data-edge={`h-${r}-${c}`}
                          onClick={() => {
                            if (gameMode === 'cpu' && turn === 2) return;
                            executeEdge({ orient: 'h', r, c }, false);
                          }}
                          className={owner === null ? 'cursor-pointer' : ''}
                        >
                          <rect
                            x={x1 + 4}
                            y={y1 - 34}
                            width={cellSpan - 8}
                            height={68}
                            fill="transparent"
                            pointerEvents="all"
                          />
                          <line
                            x1={x1 + 10}
                            y1={y1}
                            x2={x2 - 10}
                            y2={y1}
                            stroke={
                              owner === 1
                                ? '#315d4e'
                                : owner === 2
                                  ? '#9f4540'
                                  : isHint
                                    ? '#b9853f'
                                    : '#c3b49c'
                            }
                            strokeWidth={owner !== null ? 7.5 : isHint ? 5.5 : 4}
                            strokeLinecap="round"
                            strokeDasharray={owner === null && !isHint ? '5 7' : undefined}
                          />
                          {isLast && (
                            <circle cx={(x1 + x2) / 2} cy={y1} r={4.5} fill="#c9922e" stroke="#5b4527" strokeWidth={1} />
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
                          data-edge={`v-${r}-${c}`}
                          onClick={() => {
                            if (gameMode === 'cpu' && turn === 2) return;
                            executeEdge({ orient: 'v', r, c }, false);
                          }}
                          className={owner === null ? 'cursor-pointer' : ''}
                        >
                          <rect
                            x={x1 - 34}
                            y={y1 + 4}
                            width={68}
                            height={cellSpan - 8}
                            fill="transparent"
                            pointerEvents="all"
                          />
                          <line
                            x1={x1}
                            y1={y1 + 10}
                            x2={x1}
                            y2={y2 - 10}
                            stroke={
                              owner === 1
                                ? '#315d4e'
                                : owner === 2
                                  ? '#9f4540'
                                  : isHint
                                    ? '#b9853f'
                                    : '#c3b49c'
                            }
                            strokeWidth={owner !== null ? 7.5 : isHint ? 5.5 : 4}
                            strokeLinecap="round"
                            strokeDasharray={owner === null && !isHint ? '5 7' : undefined}
                          />
                          {isLast && (
                            <circle cx={x1} cy={(y1 + y2) / 2} r={4.5} fill="#c9922e" stroke="#5b4527" strokeWidth={1} />
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
                          r={7}
                          fill="#2b2118"
                          stroke="#f7f0e2"
                          strokeWidth={2.5}
                          pointerEvents="none"
                        />
                      );
                    }),
                  )}
                </svg>
              </div>

              {hint && (
                <div className="mt-3 border-l-2 border-[#c99555] bg-[#2a211a] px-3 py-2 text-xs leading-relaxed text-[#e8d7bd]">
                  <span className="font-semibold text-[#dfb06d]">
                    AIヒント（{formatEdgeLabel(hint.edge)}）: </span>
                  {hint.reason}
                </div>
              )}
            </div>
          </div>

          {/* Side Panels */}
          <aside className="min-w-0 space-y-3 lg:col-span-4">
            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="tabletop-stat p-2.5 sm:p-3"
                style={
                  turn === 1 && !isGameOver
                    ? { borderColor: '#315d4e', background: 'rgba(49, 93, 78, 0.14)' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#e8d7bd]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#315d4e] ring-1 ring-[#7fa08e]" />
                    <span className="truncate">深緑（先手）</span>
                  </span>
                  <span className="tabletop-chip shrink-0 px-1.5 py-0.5 text-[9px] font-semibold">
                    P1
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <strong className="text-2xl font-bold leading-none text-[#f4ead8]">
                    {scores.p1}
                  </strong>
                  <span className="tabletop-muted text-[10px]">ボックス</span>
                </div>
              </div>

              <div
                className="tabletop-stat p-2.5 sm:p-3"
                style={
                  turn === 2 && !isGameOver
                    ? { borderColor: '#9f4540', background: 'rgba(159, 69, 64, 0.12)' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#e8d7bd]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#9f4540] ring-1 ring-[#c98d84]" />
                    <span className="truncate">
                      {gameMode === 'cpu' ? '朱（CPU）' : '朱（後手）'}
                    </span>
                  </span>
                  <span className="tabletop-chip shrink-0 px-1.5 py-0.5 text-[9px] font-semibold">
                    {gameMode === 'cpu' ? difficulty.toUpperCase() : 'P2'}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <strong className="text-2xl font-bold leading-none text-[#f4ead8]">
                    {scores.p2}
                  </strong>
                  <span className="tabletop-muted text-[10px]">ボックス</span>
                </div>
              </div>
            </div>

            {/* Board Analytics */}
            <div className="tabletop-panel p-3.5">
              <h3 className="tabletop-title text-sm">盤面・チェーン解析</h3>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="tabletop-stat p-2">
                  <div className="tabletop-muted text-[10px]">3辺ボックス</div>
                  <div className="mt-0.5 text-base font-bold text-[#dfb06d]">
                    {metrics.threeSidedBoxes}
                  </div>
                </div>
                <div className="tabletop-stat p-2">
                  <div className="tabletop-muted text-[10px]">安全な辺</div>
                  <div className="mt-0.5 text-base font-bold text-[#8fb7a3]">
                    {metrics.safeEdges}
                  </div>
                </div>
                <div className="tabletop-stat p-2">
                  <div className="tabletop-muted text-[10px]">2辺ボックス</div>
                  <div className="mt-0.5 text-base font-bold text-[#c98d84]">
                    {metrics.twoSidedBoxes}
                  </div>
                </div>
                <div className="tabletop-stat p-2">
                  <div className="tabletop-muted text-[10px]">最小献上</div>
                  <div className="mt-0.5 text-base font-bold text-[#9db8c9]">
                    {metrics.minSacrificeChain}
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Guide */}
            <div className="tabletop-panel p-3.5">
              <h3 className="tabletop-title text-sm">陣取りのセオリー</h3>
              <ul className="tabletop-muted mt-2 space-y-1.5 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-[#dfb06d]">ボーナスターン</strong> — 4辺目を引いてボックスを完成させると、続けてもう1本引けます。
                </li>
                <li>
                  <strong className="text-[#dfb06d]">3辺目を避ける</strong> — 2辺済みのボックスに3辺目を引くと、相手に4辺目と連鎖を渡します。
                </li>
                <li>
                  <strong className="text-[#dfb06d]">ダブルクロス</strong> — 最後の2ボックスをあえて譲り、次の長いチェーンを奪う高等戦術です。
                </li>
              </ul>
            </div>

            {/* Move Log */}
            <div className="tabletop-panel p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="tabletop-title text-sm">対局ログ</h3>
                <span className="tabletop-muted text-[10px]">{logs.length} 手</span>
              </div>
              <div className="mt-2 max-h-44 space-y-0 overflow-y-auto pr-1 text-[11px]">
                {logs.length === 0 ? (
                  <p className="tabletop-muted py-4 text-center leading-relaxed">
                    ドット間の破線を選んで最初の線を引いてください。
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={`${i}-${log}`}
                      data-log-entry
                      className="tabletop-divider border-b py-1.5 leading-snug text-[#d8c9b2] last:border-b-0"
                    >
                      <span className="mr-1.5 font-mono text-[10px] text-[#8f7d66]">
                        {String(logs.length - i).padStart(2, '0')}
                      </span>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
