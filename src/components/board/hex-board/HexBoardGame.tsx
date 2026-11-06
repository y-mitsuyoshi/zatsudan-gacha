'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export type Player = 1 | 2; // 1 = Red (Top <-> Bottom), 2 = Blue (Left <-> Right)
export type GameMode = 'cpu' | '2p';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type BoardSize = 7 | 9 | 11;

export type HexGrid = (Player | null)[][];

export interface HexCoord {
  r: number;
  c: number;
}

export interface TwoBridgeLink {
  a: HexCoord;
  b: HexCoord;
  carriers: [HexCoord, HexCoord];
  player: Player;
  threatenedBy?: HexCoord; // If 1 carrier is occupied by opponent and the other is empty!
}

interface HexSnapshot {
  grid: HexGrid;
  turn: Player;
  moveHistory: { player: Player; r: number; c: number; swapped?: boolean }[];
  swappedUsed: boolean;
}

const HEX_DIRS: [number, number][] = [
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
];

// Two-bridge relative offsets and their two shared carrier offsets
const BRIDGE_PATTERNS: {
  dr: number;
  dc: number;
  c1: [number, number];
  c2: [number, number];
}[] = [
  { dr: -1, dc: 2, c1: [-1, 1], c2: [0, 1] },
  { dr: 1, dc: 1, c1: [0, 1], c2: [1, 0] },
  { dr: 2, dc: -1, c1: [1, -1], c2: [1, 0] },
];

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

function createEmptyGrid(size: BoardSize): HexGrid {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function cloneGrid(grid: HexGrid): HexGrid {
  return grid.map((row) => [...row]);
}

function inBounds(r: number, c: number, size: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

function getNeighbors(r: number, c: number, size: number): HexCoord[] {
  const res: HexCoord[] = [];
  for (const [dr, dc] of HEX_DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc, size)) {
      res.push({ r: nr, c: nc });
    }
  }
  return res;
}

// Find winning connected path from Top(r=0)->Bottom(r=size-1) for Player 1,
// or Left(c=0)->Right(c=size-1) for Player 2.
export function findWinningPath(grid: HexGrid, player: Player): HexCoord[] | null {
  const size = grid.length;
  const queue: HexCoord[] = [];
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const parent: (HexCoord | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null),
  );

  if (player === 1) {
    for (let c = 0; c < size; c++) {
      if (grid[0][c] === 1) {
        queue.push({ r: 0, c });
        visited[0][c] = true;
      }
    }
  } else {
    for (let r = 0; r < size; r++) {
      if (grid[r][0] === 2) {
        queue.push({ r, c: 0 });
        visited[r][0] = true;
      }
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (
      (player === 1 && curr.r === size - 1) ||
      (player === 2 && curr.c === size - 1)
    ) {
      const path: HexCoord[] = [];
      let trace: HexCoord | null = curr;
      while (trace) {
        path.push(trace);
        trace = parent[trace.r][trace.c];
      }
      return path.reverse();
    }

    for (const nb of getNeighbors(curr.r, curr.c, size)) {
      if (!visited[nb.r][nb.c] && grid[nb.r][nb.c] === player) {
        visited[nb.r][nb.c] = true;
        parent[nb.r][nb.c] = curr;
        queue.push(nb);
      }
    }
  }

  return null;
}

// Detect active Two-Bridges (both carriers empty, or 1 carrier threatened by opponent and 1 empty)
export function findTwoBridges(grid: HexGrid): TwoBridgeLink[] {
  const size = grid.length;
  const links: TwoBridgeLink[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const p = grid[r][c];
      if (!p) continue;
      const opp: Player = p === 1 ? 2 : 1;

      for (const pat of BRIDGE_PATTERNS) {
        const br = r + pat.dr;
        const bc = c + pat.dc;
        if (!inBounds(br, bc, size) || grid[br][bc] !== p) continue;

        const c1r = r + pat.c1[0];
        const c1c = c + pat.c1[1];
        const c2r = r + pat.c2[0];
        const c2c = c + pat.c2[1];
        if (!inBounds(c1r, c1c, size) || !inBounds(c2r, c2c, size)) continue;

        const v1 = grid[c1r][c1c];
        const v2 = grid[c2r][c2c];

        if (v1 === null && v2 === null) {
          links.push({
            a: { r, c },
            b: { r: br, c: bc },
            carriers: [
              { r: c1r, c: c1c },
              { r: c2r, c: c2c },
            ],
            player: p,
          });
        } else if (v1 === opp && v2 === null) {
          links.push({
            a: { r, c },
            b: { r: br, c: bc },
            carriers: [
              { r: c1r, c: c1c },
              { r: c2r, c: c2c },
            ],
            player: p,
            threatenedBy: { r: c2r, c: c2c },
          });
        } else if (v2 === opp && v1 === null) {
          links.push({
            a: { r, c },
            b: { r: br, c: bc },
            carriers: [
              { r: c1r, c: c1c },
              { r: c2r, c: c2c },
            ],
            player: p,
            threatenedBy: { r: c1r, c: c1c },
          });
        }
      }
    }
  }

  return links;
}

// Dijkstra shortest-path cost (number of empty hexes needed to connect Player's borders,
// incorporating virtual Two-Bridge connections with low cost 0.25)
export function computeConnectionCost(
  grid: HexGrid,
  player: Player,
  useTwoBridges = true,
): { distance: number;distToA: number[][]; distToB: number[][] } {
  const size = grid.length;
  const INF = 9999;

  // Build virtual bridge adjacency if enabled
  const bridgeNeighbors: Map<string, HexCoord[]> = new Map();
  if (useTwoBridges) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        for (const pat of BRIDGE_PATTERNS) {
          const br = r + pat.dr;
          const bc = c + pat.dc;
          if (!inBounds(br, bc, size)) continue;
          const c1r = r + pat.c1[0];
          const c1c = c + pat.c1[1];
          const c2r = r + pat.c2[0];
          const c2c = c + pat.c2[1];
          if (grid[c1r][c1c] === null && grid[c2r][c2c] === null) {
            const k1 = `${r},${c}`;
            const k2 = `${br},${bc}`;
            if (!bridgeNeighbors.has(k1)) bridgeNeighbors.set(k1, []);
            if (!bridgeNeighbors.has(k2)) bridgeNeighbors.set(k2, []);
            bridgeNeighbors.get(k1)!.push({ r: br, c: bc });
            bridgeNeighbors.get(k2)!.push({ r, c });
          }
        }
      }
    }
  }

  const runDijkstraFromBorder = (isStartBorder: (r: number, c: number) => boolean) => {
    const dist = Array.from({ length: size }, () => Array(size).fill(INF));
    const pq: { r: number; c: number; d: number }[] = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isStartBorder(r, c)) continue;
        if (grid[r][c] === player) {
          dist[r][c] = 0;
          pq.push({ r, c, d: 0 });
        } else if (grid[r][c] === null) {
          dist[r][c] = 1;
          pq.push({ r, c, d: 1 });
        }
      }
    }

    while (pq.length > 0) {
      pq.sort((a, b) => a.d - b.d);
      const curr = pq.shift()!;
      if (curr.d > dist[curr.r][curr.c]) continue;

      // Direct neighbors
      for (const nb of getNeighbors(curr.r, curr.c, size)) {
        if (grid[nb.r][nb.c] !== null && grid[nb.r][nb.c] !== player) continue;
        const stepCost = grid[nb.r][nb.c] === player ? 0 : 1;
        const nd = curr.d + stepCost;
        if (nd < dist[nb.r][nb.c]) {
          dist[nb.r][nb.c] = nd;
          pq.push({ r: nb.r, c: nb.c, d: nd });
        }
      }

      // Two-bridge virtual neighbors (if current stone is player's or empty)
      if (useTwoBridges && grid[curr.r][curr.c] === player) {
        const bList = bridgeNeighbors.get(`${curr.r},${curr.c}`) ?? [];
        for (const nb of bList) {
          if (grid[nb.r][nb.c] !== null && grid[nb.r][nb.c] !== player) continue;
          const stepCost = grid[nb.r][nb.c] === player ? 0.15 : 1.15;
          const nd = curr.d + stepCost;
          if (nd < dist[nb.r][nb.c]) {
            dist[nb.r][nb.c] = nd;
            pq.push({ r: nb.r, c: nb.c, d: nd });
          }
        }
      }
    }

    return dist;
  };

  const distToA =
    player === 1
      ? runDijkstraFromBorder((r) => r === 0)
      : runDijkstraFromBorder((_, c) => c === 0);

  const distToB =
    player === 1
      ? runDijkstraFromBorder((r) => r === size - 1)
      : runDijkstraFromBorder((_, c) => c === size - 1);

  let minTotal = INF;
  for (let r = 0; r < size; r++) {
    if (player === 1) {
      for (let c = 0; c < size; c++) {
        if (distToA[size - 1][c] < minTotal) minTotal = distToA[size - 1][c];
      }
    } else {
      if (distToA[r][size - 1] < minTotal) minTotal = distToA[r][size - 1];
    }
  }

  return { distance: Math.round(minTotal * 10) / 10, distToA, distToB };
}

function chooseBestHexMove(
  grid: HexGrid,
  player: Player,
  difficulty: Difficulty,
): { move: HexCoord; reason: string } | null {
  const size = grid.length;
  const opp: Player = player === 1 ? 2 : 1;

  // 1. Urgent Two-Bridge Defense: If one of player's two-bridges has 1 carrier occupied by opponent
  // and 1 carrier empty, immediately save the bridge!
  if (difficulty !== 'easy') {
    const bridges = findTwoBridges(grid);
    const threatened = bridges.find((b) => b.player === player && b.threatenedBy);
    if (threatened && threatened.threatenedBy) {
      const t = threatened.threatenedBy;
      return {
        move: t,
        reason: `相手が2ブリッジ（仮想接続）の片側に侵入したため、${COL_LETTERS[t.c]}${t.r + 1} に打って接続を確実に守ります！`,
      };
    }
  }

  // 2. Evaluate empty cells using Dijkstra Shortest-Path Potential + Two-Bridge synergy
  const useBridges = difficulty === 'hard';
  const myInfo = computeConnectionCost(grid, player, useBridges);
  const oppInfo = computeConnectionCost(grid, opp, useBridges);

  const candidates: { r: number; c: number; priority: number }[] = [];
  const center = (size - 1) / 2;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== null) continue;
      // Sum of distances to both borders for self and opponent (lower = on critical shortest path)
      const myPathSum = myInfo.distToA[r][c] + myInfo.distToB[r][c] - 1;
      const oppPathSum = oppInfo.distToA[r][c] + oppInfo.distToB[r][c] - 1;
      const centerBonus = -Math.hypot(r - center, c - center) * 0.15;
      const priority = -(myPathSum * 1.15 + oppPathSum * 1.1) + centerBonus;
      candidates.push({ r, c, priority });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);

  if (difficulty === 'easy') {
    const topPool = candidates.slice(0, Math.min(6, candidates.length));
    const pick = topPool[Math.floor(Math.random() * topPool.length)];
    return {
      move: { r: pick.r, c: pick.c },
      reason: `${COL_LETTERS[pick.c]}${pick.r + 1} は両辺への接続ルート上に位置する要所です。`,
    };
  }

  // Evaluate top K candidates with full board simulation
  const topK = difficulty === 'hard' ? Math.min(12, candidates.length) : Math.min(7, candidates.length);
  let bestCoord = { r: candidates[0].r, c: candidates[0].c };
  let bestScore = -Infinity;
  let bestMyDrop = 0;
  let bestOppIncrease = 0;

  for (let i = 0; i < topK; i++) {
    const cand = candidates[i];
    const nextGrid = cloneGrid(grid);
    nextGrid[cand.r][cand.c] = player;

    const nextMy = computeConnectionCost(nextGrid, player, true);
    const nextOpp = computeConnectionCost(nextGrid, opp, true);

    if (nextMy.distance === 0) {
      return {
        move: { r: cand.r, c: cand.c },
        reason: `${COL_LETTERS[cand.c]}${cand.r + 1} に打つと辺から辺までの接続が完成し勝利が確定します！`,
      };
    }

    const myGain = myInfo.distance - nextMy.distance;
    const oppBlock = nextOpp.distance - oppInfo.distance;

    // Count new two-bridges formed by this stone
    let bridgeBonus = 0;
    for (const pat of BRIDGE_PATTERNS) {
      for (const sign of [1, -1]) {
        const br = cand.r + pat.dr * sign;
        const bc = cand.c + pat.dc * sign;
        const c1r = cand.r + pat.c1[0] * sign;
        const c1c = cand.c + pat.c1[1] * sign;
        const c2r = cand.r + pat.c2[0] * sign;
        const c2c = cand.c + pat.c2[1] * sign;
        if (
          inBounds(br, bc, size) &&
          nextGrid[br][bc] === player &&
          inBounds(c1r, c1c, size) &&
          inBounds(c2r, c2c, size) &&
          nextGrid[c1r][c1c] === null &&
          nextGrid[c2r][c2c] === null
        ) {
          bridgeBonus += 0.45;
        }
      }
    }

    const centerBias = -Math.hypot(cand.r - center, cand.c - center) * 0.06;
    const totalScore =
      (nextOpp.distance - nextMy.distance) * 3.2 +
      myGain * 1.4 +
      oppBlock * 1.5 +
      bridgeBonus +
      centerBias;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestCoord = { r: cand.r, c: cand.c };
      bestMyDrop = myGain;
      bestOppIncrease = oppBlock;
    }
  }

  const label = `${COL_LETTERS[bestCoord.c]}${bestCoord.r + 1}`;
  let reason = `${label} は自身の最短接続距離を縮めつつ相手の連絡網を分断する急所です。`;
  if (bestOppIncrease >= 0.8 && bestMyDrop >= 0.8) {
    reason = `${label} は自分の最短接続を進めながら相手の最短経路も同時に遮断する「攻防一体の急所」です！`;
  } else if (bestMyDrop >= 0.8) {
    reason = `${label} に展開することで2ブリッジ（仮想接続）を含む最短接続ルートが一気に前進します。`;
  }

  return { move: bestCoord, reason };
}

export default function HexBoardGame() {
  const [boardSize, setBoardSize] = useState<BoardSize>(9);
  const [grid, setGrid] = useState<HexGrid>(() => createEmptyGrid(9));
  const [turn, setTurn] = useState<Player>(1);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [swapRuleEnabled, setSwapRuleEnabled] = useState<boolean>(true);
  const [showBridges, setShowBridges] = useState<boolean>(true);

  const [moveHistory, setMoveHistory] = useState<
    { player: Player; r: number; c: number; swapped?: boolean }[]
  >([]);
  const [swappedUsed, setSwappedUsed] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<HexSnapshot[]>([]);
  const [hint, setHint] = useState<{ move: HexCoord; reason: string } | null>(null);

  // Check winning paths
  const redWinPath = useMemo(() => findWinningPath(grid, 1), [grid]);
  const blueWinPath = useMemo(() => findWinningPath(grid, 2), [grid]);
  const winner: Player | null = redWinPath ? 1 : blueWinPath ? 2 : null;
  const winningPath = useMemo(
    () => redWinPath ?? blueWinPath ?? [],
    [redWinPath, blueWinPath],
  );

  const winningSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of winningPath) s.add(`${c.r},${c.c}`);
    return s;
  }, [winningPath]);

  const twoBridges = useMemo(() => (showBridges ? findTwoBridges(grid) : []), [grid, showBridges]);

  const connectionMetrics = useMemo(() => {
    const p1 = computeConnectionCost(grid, 1, true);
    const p2 = computeConnectionCost(grid, 2, true);
    return { p1Dist: p1.distance, p2Dist: p2.distance };
  }, [grid]);

  const canInvokeSwap =
    swapRuleEnabled && !swappedUsed && moveHistory.length === 1 && !winner;

  const resetWithSize = useCallback((newSize: BoardSize) => {
    setBoardSize(newSize);
    setGrid(createEmptyGrid(newSize));
    setTurn(1);
    setMoveHistory([]);
    setSwappedUsed(false);
    setSnapshots([]);
    setHint(null);
  }, []);

  const handlePlaceStone = useCallback(
    (r: number, c: number, isAi = false) => {
      if (winner) return;
      if (grid[r][c] !== null) return;

      if (!isAi) {
        setSnapshots((prev) => [
          ...prev.slice(-30),
          {
            grid: cloneGrid(grid),
            turn,
            moveHistory: [...moveHistory],
            swappedUsed,
          },
        ]);
      }

      const next = cloneGrid(grid);
      next[r][c] = turn;
      setGrid(next);
      setMoveHistory((prev) => [...prev, { player: turn, r, c }]);
      setHint(null);
      setTurn((t) => (t === 1 ? 2 : 1));
    },
    [winner, grid, turn, moveHistory, swappedUsed],
  );

  const handleSwapMove = useCallback(() => {
    if (!canInvokeSwap) return;
    const firstMove = moveHistory[0];
    setSnapshots((prev) => [
      ...prev.slice(-30),
      {
        grid: cloneGrid(grid),
        turn,
        moveHistory: [...moveHistory],
        swappedUsed,
      },
    ]);

    // Mirror the first stone (r, c) -> (c, r) for Player 2
    const next = createEmptyGrid(boardSize);
    next[firstMove.c][firstMove.r] = 2;
    setGrid(next);
    setSwappedUsed(true);
    setMoveHistory((prev) => [
      ...prev,
      { player: 2, r: firstMove.c, c: firstMove.r, swapped: true },
    ]);
    setHint(null);
    setTurn(1);
  }, [canInvokeSwap, moveHistory, grid, turn, swappedUsed, boardSize]);

  // CPU Turn Effect
  useEffect(() => {
    if (winner) return;
    if (gameMode !== 'cpu' || turn !== 2) return;

    const timer = window.setTimeout(() => {
      // If Swap Rule is available and Player 1 played right in the strong center on Hard mode
      if (canInvokeSwap && difficulty === 'hard') {
        const first = moveHistory[0];
        const center = (boardSize - 1) / 2;
        if (Math.abs(first.r - center) <= 1 && Math.abs(first.c - center) <= 1) {
          handleSwapMove();
          return;
        }
      }

      const best = chooseBestHexMove(grid, 2, difficulty);
      if (best) {
        handlePlaceStone(best.move.r, best.move.c, true);
      }
    }, 440);

    return () => window.clearTimeout(timer);
  }, [
    winner,
    gameMode,
    turn,
    canInvokeSwap,
    difficulty,
    moveHistory,
    boardSize,
    grid,
    handleSwapMove,
    handlePlaceStone,
  ]);

  const handleUndo = () => {
    if (snapshots.length === 0) return;
    const prev = snapshots[snapshots.length - 1];
    setGrid(prev.grid);
    setTurn(prev.turn);
    setMoveHistory(prev.moveHistory);
    setSwappedUsed(prev.swappedUsed);
    setSnapshots((s) => s.slice(0, -1));
    setHint(null);
  };

  const handleHint = () => {
    if (winner) return;
    if (gameMode === 'cpu' && turn === 2) return;
    const res = chooseBestHexMove(grid, turn, 'hard');
    if (res) setHint(res);
  };

  // Pointy-top hexagon geometry for rhombus board
  const hexRadius = boardSize === 7 ? 26 : boardSize === 9 ? 21 : 17.5;
  const sqrt3 = Math.sqrt(3);
  const wStep = sqrt3 * hexRadius;
  const hStep = 1.5 * hexRadius;
  const padX = 56;
  const padY = 50;

  const getHexCenter = (r: number, c: number) => ({
    x: padX + c * wStep + r * (wStep / 2),
    y: padY + r * hStep,
  });

  const getHexPolygonPoints = (cx: number, cy: number, rad: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = ((60 * i - 30) * Math.PI) / 180;
      const px = cx + rad * Math.cos(angle);
      const py = cy + rad * Math.sin(angle);
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const bottomRight = getHexCenter(boardSize - 1, boardSize - 1);
  const svgWidth = Math.ceil(bottomRight.x + padX);
  const svgHeight = Math.ceil(bottomRight.y + padY);

  const topLeft = getHexCenter(0, 0);
  const topRight = getHexCenter(0, boardSize - 1);
  const bottomLeft = getHexCenter(boardSize - 1, 0);

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
            <span className="tabletop-kicker hidden sm:inline">Hex · Connection</span>
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
              <p className="tabletop-kicker">Topology Game · No Draws</p>
              <h2 className="tabletop-title mt-1 text-xl sm:text-2xl">ヘックス</h2>
              <p className="tabletop-muted mt-1 max-w-2xl text-xs leading-relaxed sm:text-sm">
                赤は上辺と下辺、青は左辺と右辺を六角形の石でつなぐ接続戦略。相手の進路を遮りながら、先に二辺を結んでください。
              </p>
            </div>

            <div
              role="group"
              aria-label="盤面サイズ"
              className="flex flex-wrap gap-1.5"
            >
              {(
                [
                  [7, '7×7'],
                  [9, '9×9'],
                  [11, '11×11'],
                ] as const
              ).map(([sz, label]) => (
                <button
                  key={sz}
                  type="button"
                  data-size={sz}
                  onClick={() => resetWithSize(sz)}
                  className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                    boardSize === sz ? 'tabletop-chip-active' : ''
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
                    resetWithSize(boardSize);
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
                    resetWithSize(boardSize);
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
                data-toggle="bridges"
                aria-pressed={showBridges}
                onClick={() => setShowBridges((b) => !b)}
                className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                  showBridges ? 'tabletop-chip-active' : ''
                }`}
              >
                2ブリッジ表示
              </button>

              <button
                type="button"
                data-toggle="swap-rule"
                aria-pressed={swapRuleEnabled}
                onClick={() => setSwapRuleEnabled((s) => !s)}
                className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                  swapRuleEnabled ? 'tabletop-chip-active' : ''
                }`}
              >
                スワップルール
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {canInvokeSwap && (gameMode === '2p' || turn === 2) && (
                <button
                  type="button"
                  data-action="swap"
                  onClick={handleSwapMove}
                  className="tabletop-button-primary inline-flex min-h-11 items-center justify-center px-3 text-xs"
                >
                  スワップ宣言
                </button>
              )}
              <button
                type="button"
                data-action="hint"
                onClick={handleHint}
                disabled={Boolean(winner) || (gameMode === 'cpu' && turn === 2)}
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
                onClick={() => resetWithSize(boardSize)}
                className="tabletop-button-primary inline-flex min-h-11 items-center justify-center px-3 text-xs"
              >
                新規対局
              </button>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Hex Board Column */}
          <div className="min-w-0 lg:col-span-8">
            <div className="tabletop-panel p-2.5 sm:p-4">
              {/* Turn Banner */}
              <div className="tabletop-panel-soft mb-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      turn === 1 ? 'bg-[#b9685f]' : 'bg-[#587a92]'
                    }`}
                  />
                  <span className="truncate text-xs font-semibold text-[#f4ead8] sm:text-sm">
                    {winner
                      ? winner === 1
                        ? '赤の勝利 — 上下を接続'
                        : gameMode === 'cpu'
                          ? '青（CPU）の勝利 — 左右を接続'
                          : '青（後手）の勝利 — 左右を接続'
                      : turn === 1
                        ? '赤（先手）の手番'
                        : gameMode === 'cpu'
                          ? '青（CPU）が思考中'
                          : '青（後手）の手番'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                  <span className="tabletop-chip px-2 py-0.5 font-semibold text-[#d8a49b]">
                    赤 最短 {connectionMetrics.p1Dist}
                  </span>
                  <span className="tabletop-chip px-2 py-0.5 font-semibold text-[#9db8c9]">
                    青 最短 {connectionMetrics.p2Dist}
                  </span>
                </div>
              </div>

              {/* Wooden Hex Board */}
              <div className="tabletop-board-frame mx-auto p-1.5 sm:p-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  role="img"
                  aria-label="ヘックスの盤面"
                  className="block h-auto max-h-[560px] w-full select-none"
                  style={{ touchAction: 'manipulation' }}
                >
                  <defs>
                    <linearGradient id="hexWood" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#241a13" />
                      <stop offset="55%" stopColor="#1c140f" />
                      <stop offset="100%" stopColor="#15100c" />
                    </linearGradient>
                  </defs>

                  <rect x="0" y="0" width={svgWidth} height={svgHeight} rx="8" fill="url(#hexWood)" />
                  <g opacity="0.1" stroke="#8a6744" strokeWidth="0.8">
                    {Array.from({ length: 12 }, (_, i) => {
                      const y = 14 + i * (svgHeight / 12);
                      return (
                        <path
                          key={i}
                          d={`M8 ${y} C ${svgWidth * 0.3} ${y - 5}, ${svgWidth * 0.66} ${y + 6}, ${svgWidth - 8} ${y - 2}`}
                          fill="none"
                        />
                      );
                    })}
                  </g>

                  {/* Goal Bands */}
                  <line
                    x1={topLeft.x - 16}
                    y1={topLeft.y - 26}
                    x2={topRight.x + 16}
                    y2={topRight.y - 26}
                    stroke="#1a110b"
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <line
                    x1={topLeft.x - 16}
                    y1={topLeft.y - 26}
                    x2={topRight.x + 16}
                    y2={topRight.y - 26}
                    stroke="#9f4540"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={bottomLeft.x - 16}
                    y1={bottomLeft.y + 26}
                    x2={bottomRight.x + 16}
                    y2={bottomRight.y + 26}
                    stroke="#1a110b"
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <line
                    x1={bottomLeft.x - 16}
                    y1={bottomLeft.y + 26}
                    x2={bottomRight.x + 16}
                    y2={bottomRight.y + 26}
                    stroke="#9f4540"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={topLeft.x - 28}
                    y1={topLeft.y - 10}
                    x2={bottomLeft.x - 28}
                    y2={bottomLeft.y + 10}
                    stroke="#1a110b"
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <line
                    x1={topLeft.x - 28}
                    y1={topLeft.y - 10}
                    x2={bottomLeft.x - 28}
                    y2={bottomLeft.y + 10}
                    stroke="#3f5f78"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={topRight.x + 28}
                    y1={topRight.y - 10}
                    x2={bottomRight.x + 28}
                    y2={bottomRight.y + 10}
                    stroke="#1a110b"
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <line
                    x1={topRight.x + 28}
                    y1={topRight.y - 10}
                    x2={bottomRight.x + 28}
                    y2={bottomRight.y + 10}
                    stroke="#3f5f78"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />

                  {/* Hex Cells */}
                  {grid.map((row, r) =>
                    row.map((cell, c) => {
                      const { x, y } = getHexCenter(r, c);
                      const isWinHex = winningSet.has(`${r},${c}`);
                      const isHintHex = hint?.move.r === r && hint?.move.c === c;
                      const lastMove = moveHistory[moveHistory.length - 1];
                      const isLastHex = lastMove?.r === r && lastMove?.c === c;

                      let fill = '#2b2118';
                      let stroke = '#4d3d2d';
                      if (cell === 1) {
                        fill = isWinHex ? '#b9685f' : '#9f4540';
                        stroke = isWinHex ? '#e3c08a' : '#7a332e';
                      } else if (cell === 2) {
                        fill = isWinHex ? '#587a92' : '#3f5f78';
                        stroke = isWinHex ? '#e3c08a' : '#2f4a5c';
                      } else if (isHintHex) {
                        fill = '#3a2a1c';
                        stroke = '#dfb06d';
                      }

                      return (
                        <g
                          key={`${r}-${c}`}
                          data-hex={`${r}-${c}`}
                          onClick={() => {
                            if (gameMode === 'cpu' && turn === 2) return;
                            handlePlaceStone(r, c, false);
                          }}
                          className="cursor-pointer transition-opacity hover:opacity-90"
                        >
                          <polygon
                            points={getHexPolygonPoints(x, y, hexRadius - 1.2)}
                            fill={fill}
                            stroke={isLastHex ? '#f4ead8' : stroke}
                            strokeWidth={isWinHex || isHintHex ? 2.6 : isLastHex ? 2 : 1.2}
                          />

                          {cell && (
                            <circle
                              cx={x}
                              cy={y}
                              r={hexRadius * 0.52}
                              fill={cell === 1 ? '#e3b4ad' : '#a9c2d1'}
                              opacity={0.16}
                            />
                          )}

                          {isLastHex && <circle cx={x} cy={y} r={3.5} fill="#f4ead8" />}

                          {/* Coordinate labels */}
                          {r === 0 && (
                            <text
                              x={x}
                              y={y - hexRadius - 14}
                              textAnchor="middle"
                              fill="#b9a88f"
                              fontSize="10"
                              fontWeight="700"
                              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                            >
                              {COL_LETTERS[c]}
                            </text>
                          )}
                          {c === 0 && (
                            <text
                              x={x - hexRadius - 12}
                              y={y + 4}
                              textAnchor="end"
                              fill="#b9a88f"
                              fontSize="10"
                              fontWeight="700"
                              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                            >
                              {r + 1}
                            </text>
                          )}
                        </g>
                      );
                    }),
                  )}

                  {/* Two-Bridge Virtual Connection Dashed Lines */}
                  {twoBridges.map((b, idx) => {
                    const pA = getHexCenter(b.a.r, b.a.c);
                    const pB = getHexCenter(b.b.r, b.b.c);
                    return (
                      <line
                        key={`bridge-${idx}`}
                        x1={pA.x}
                        y1={pA.y}
                        x2={pB.x}
                        y2={pB.y}
                        stroke={
                          b.threatenedBy ? '#dfb06d' : b.player === 1 ? '#c98d84' : '#7fa3b8'
                        }
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        opacity={0.75}
                        pointerEvents="none"
                      />
                    );
                  })}

                  {/* Winning Path */}
                  {winningPath.length > 1 && (
                    <polyline
                      points={winningPath
                        .map((pt) => {
                          const center = getHexCenter(pt.r, pt.c);
                          return `${center.x.toFixed(1)},${center.y.toFixed(1)}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#e3c08a"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  )}
                </svg>
              </div>

              {hint && (
                <div className="mt-3 border-l-2 border-[#c99555] bg-[#2a211a] px-3 py-2 text-xs leading-relaxed text-[#e8d7bd]">
                  <span className="font-semibold text-[#dfb06d]">AIヒント: </span>
                  {hint.reason}
                </div>
              )}
            </div>
          </div>

          {/* Side Panels */}
          <aside className="min-w-0 space-y-3 lg:col-span-4">
            {/* Connection Status Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="tabletop-stat p-2.5 sm:p-3"
                style={
                  turn === 1 && !winner
                    ? { borderColor: '#9f4540', background: 'rgba(159, 69, 64, 0.1)' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#e8d7bd]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#9f4540] ring-1 ring-[#c98d84]" />
                    <span className="truncate">赤（上下）</span>
                  </span>
                  <span className="tabletop-chip shrink-0 px-1.5 py-0.5 text-[9px] font-semibold">
                    上下
                  </span>
                </div>
                <div className="mt-2">
                  <span className="tabletop-muted text-[10px]">最短必要石数</span>
                  <div className="mt-0.5 text-xl font-bold leading-none text-[#f4ead8]">
                    {connectionMetrics.p1Dist}
                  </div>
                </div>
              </div>

              <div
                className="tabletop-stat p-2.5 sm:p-3"
                style={
                  turn === 2 && !winner
                    ? { borderColor: '#3f5f78', background: 'rgba(63, 95, 120, 0.14)' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#e8d7bd]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#3f5f78] ring-1 ring-[#7fa3b8]" />
                    <span className="truncate">{gameMode === 'cpu' ? '青（CPU）' : '青（後手）'}</span>
                  </span>
                  <span className="tabletop-chip shrink-0 px-1.5 py-0.5 text-[9px] font-semibold">
                    左右
                  </span>
                </div>
                <div className="mt-2">
                  <span className="tabletop-muted text-[10px]">最短必要石数</span>
                  <div className="mt-0.5 text-xl font-bold leading-none text-[#f4ead8]">
                    {connectionMetrics.p2Dist}
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Guide */}
            <div className="tabletop-panel p-3.5">
              <h3 className="tabletop-title text-sm">ヘックスの数学と定石</h3>
              <ul className="tabletop-muted mt-2 space-y-1.5 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-[#dfb06d]">引き分けなし</strong> — 盤面が埋まれば、どちらか一方の辺同士の接続が必ず成立します。
                </li>
                <li>
                  <strong className="text-[#dfb06d]">2ブリッジ</strong> — 共通の空きマスを挟んだ斜め向かいの石は、片側を止められてももう片側で接続を守れます。
                </li>
                <li>
                  <strong className="text-[#dfb06d]">スワップ</strong> — 先手の強い初手に対し、後手はその石を自分の色へ入れ替えられます。
                </li>
              </ul>
            </div>

            {/* Move History */}
            <div className="tabletop-panel p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="tabletop-title text-sm">棋譜ログ</h3>
                <span className="tabletop-muted text-[10px]">{moveHistory.length} 手</span>
              </div>
              <div className="mt-2 max-h-44 space-y-0 overflow-y-auto pr-1 text-[11px]">
                {moveHistory.length === 0 ? (
                  <p className="tabletop-muted py-4 text-center leading-relaxed">
                    六角形のマスを選んで対局を開始してください。
                  </p>
                ) : (
                  [...moveHistory].reverse().map((m, i) => (
                    <div
                      key={`${i}-${m.r}-${m.c}`}
                      data-log-entry
                      className="tabletop-divider border-b py-1.5 leading-snug text-[#d8c9b2] last:border-b-0"
                    >
                      <span className="mr-1.5 font-mono text-[10px] text-[#8f7d66]">
                        {String(moveHistory.length - i).padStart(2, '0')}
                      </span>
                      <span className={m.player === 1 ? 'text-[#d8a49b]' : 'text-[#9db8c9]'}>
                        {m.player === 1 ? '赤' : gameMode === 'cpu' ? '青（CPU）' : '青'}
                      </span>
                      <span className="mx-1 text-[#8f7d66]">/</span>
                      {COL_LETTERS[m.c]}
                      {m.r + 1}
                      {m.swapped ? '（スワップ）' : ''}
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
