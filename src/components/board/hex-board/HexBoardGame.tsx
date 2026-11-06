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
    <div className="min-h-screen bg-[#060a14] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#0a1020]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-rose-400/60 hover:text-white"
          >
            ← 無料ゲーム一覧へ
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
              HEX CONNECTION BOARD
            </span>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6">
        {/* Top Controls */}
        <div className="mb-4 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-[#0e172a] to-slate-900/95 p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                ヘックス（六角形接続トポロジー戦略盤）
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                赤は【上辺 ↔ 下辺】、青は【左辺 ↔ 右辺】を六角形の鎖でつなげば勝利！数学のヘックス定理により引き分けは絶対に起こりません。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Board Size Selector */}
              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
                {(
                  [
                    [7, '7×7 高速戦'],
                    [9, '9×9 標準戦'],
                    [11, '11×11 公式戦'],
                  ] as const
                ).map(([sz, label]) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => resetWithSize(sz)}
                    className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                      boardSize === sz
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* CPU vs 2P */}
              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setGameMode('cpu');
                    resetWithSize(boardSize);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    gameMode === 'cpu'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  CPU対戦
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGameMode('2p');
                    resetWithSize(boardSize);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    gameMode === '2p'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  1台で2人対戦
                </button>
              </div>
            </div>
          </div>

          {/* Sub Controls */}
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
                      {d === 'easy' ? '初級' : d === 'normal' ? '中級' : '上級(2ブリッジAI)'}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowBridges((b) => !b)}
                className={`rounded-lg border px-2.5 py-1 font-medium transition ${
                  showBridges
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                🔗 2ブリッジ仮想接続表示: {showBridges ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => setSwapRuleEnabled((s) => !s)}
                className={`rounded-lg border px-2.5 py-1 font-medium transition ${
                  swapRuleEnabled
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                スワップルール: {swapRuleEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {canInvokeSwap && (gameMode === '2p' || turn === 2) && (
                <button
                  type="button"
                  onClick={handleSwapMove}
                  className="rounded-lg border border-purple-400/60 bg-purple-500/20 px-3 py-1 font-bold text-purple-200 transition hover:bg-purple-500/30"
                >
                  🔄 スワップ宣言（1手目を青に入れ替え）
                </button>
              )}
              <button
                type="button"
                onClick={handleHint}
                disabled={Boolean(winner) || (gameMode === 'cpu' && turn === 2)}
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
                onClick={() => resetWithSize(boardSize)}
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-semibold text-rose-300 transition hover:bg-rose-500/25"
              >
                🔄 新規対局
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Hex SVG Board */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-800 bg-[#0a1120] p-3 shadow-2xl sm:p-5">
              {/* Turn Banner */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-3.5 w-3.5 rounded-full ${
                      turn === 1
                        ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                        : 'bg-sky-400 shadow-[0_0_10px_#38bdf8]'
                    }`}
                  />
                  <span className="text-sm font-bold text-white">
                    {winner
                      ? winner === 1
                        ? '🏆 赤（上辺↔下辺 接続完了！）の勝利！'
                        : gameMode === 'cpu'
                          ? '🏆 青（CPU・左辺↔右辺 接続完了！）の勝利！'
                          : '🏆 青（後手・左辺↔右辺 接続完了！）の勝利！'
                      : turn === 1
                        ? '赤（先手：上辺 ↕ 下辺 をつなぐ）の手番'
                        : gameMode === 'cpu'
                          ? '青（CPU：左辺 ↔ 右辺）が思考中...'
                          : '青（後手：左辺 ↔ 右辺 をつなぐ）の手番'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-rose-300">
                    赤 残り最短距離: <strong>{connectionMetrics.p1Dist}</strong>
                  </span>
                  <span className="text-sky-300">
                    青 残り最短距離: <strong>{connectionMetrics.p2Dist}</strong>
                  </span>
                </div>
              </div>

              {/* Rhombus Hex SVG */}
              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="mx-auto h-auto max-h-[520px] w-full select-none rounded-xl bg-[#070c18]"
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Colored Border Goal Bands */}
                  {/* Top Red Border */}
                  <line
                    x1={topLeft.x - 16}
                    y1={topLeft.y - 26}
                    x2={topRight.x + 16}
                    y2={topRight.y - 26}
                    stroke="#f43f5e"
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                  {/* Bottom Red Border */}
                  <line
                    x1={bottomLeft.x - 16}
                    y1={bottomLeft.y + 26}
                    x2={bottomRight.x + 16}
                    y2={bottomRight.y + 26}
                    stroke="#f43f5e"
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                  {/* Left Blue Border */}
                  <line
                    x1={topLeft.x - 28}
                    y1={topLeft.y - 10}
                    x2={bottomLeft.x - 28}
                    y2={bottomLeft.y + 10}
                    stroke="#38bdf8"
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                  {/* Right Blue Border */}
                  <line
                    x1={topRight.x + 28}
                    y1={topRight.y - 10}
                    x2={bottomRight.x + 28}
                    y2={bottomRight.y + 10}
                    stroke="#38bdf8"
                    strokeWidth={8}
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

                      let fill = '#1e293b';
                      if (cell === 1) fill = isWinHex ? '#fb7185' : '#e11d48';
                      else if (cell === 2) fill = isWinHex ? '#7dd3fc' : '#0284c7';
                      else if (isHintHex) fill = '#78350f';

                      return (
                        <g
                          key={`${r}-${c}`}
                          onClick={() => {
                            if (gameMode === 'cpu' && turn === 2) return;
                            handlePlaceStone(r, c, false);
                          }}
                          className="cursor-pointer transition-opacity hover:opacity-90"
                        >
                          <polygon
                            points={getHexPolygonPoints(x, y, hexRadius - 1.2)}
                            fill={fill}
                            stroke={
                              isWinHex
                                ? '#fef08a'
                                : isHintHex
                                  ? '#fbbf24'
                                  : isLastHex
                                    ? '#f8fafc'
                                    : '#475569'
                            }
                            strokeWidth={isWinHex || isHintHex || isLastHex ? 2.6 : 1.3}
                          />

                          {/* Coordinate labels on outer borders */}
                          {r === 0 && (
                            <text
                              x={x}
                              y={y - hexRadius - 6}
                              textAnchor="middle"
                              className="fill-rose-300/80 text-[10px] font-bold"
                            >
                              {COL_LETTERS[c]}
                            </text>
                          )}
                          {c === 0 && (
                            <text
                              x={x - hexRadius - 10}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-sky-300/80 text-[10px] font-bold"
                            >
                              {r + 1}
                            </text>
                          )}

                          {/* Stone Inner Gloss */}
                          {cell && (
                            <circle
                              cx={x}
                              cy={y}
                              r={hexRadius * 0.56}
                              fill={cell === 1 ? '#fda4af' : '#bae6fd'}
                              opacity={0.28}
                            />
                          )}

                          {/* Last move dot */}
                          {isLastHex && (
                            <circle cx={x} cy={y} r={4} fill="#ffffff" />
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
                          b.threatenedBy
                            ? '#fbbf24'
                            : b.player === 1
                              ? '#fda4af'
                              : '#7dd3fc'
                        }
                        strokeWidth={2.5}
                        strokeDasharray="4 3"
                        pointerEvents="none"
                      />
                    );
                  })}

                  {/* Winning Path Polyline */}
                  {winningPath.length > 1 && (
                    <polyline
                      points={winningPath
                        .map((pt) => {
                          const c = getHexCenter(pt.r, pt.c);
                          return `${c.x.toFixed(1)},${c.y.toFixed(1)}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#fef08a"
                      strokeWidth={4.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  )}
                </svg>
              </div>

              {hint && (
                <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <span className="font-bold">💡 AI戦術ヒント: </span>
                  {hint.reason}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 lg:col-span-4">
            {/* Connection Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-2xl border p-3.5 ${
                  turn === 1 && !winner
                    ? 'border-rose-500/70 bg-rose-950/30'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400">赤（上下接続）</span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                    TOP ↕ BOTTOM
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-slate-400">最短必要石数: </span>
                  <strong className="text-2xl font-extrabold text-white">
                    {connectionMetrics.p1Dist}
                  </strong>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-3.5 ${
                  turn === 2 && !winner
                    ? 'border-sky-400/70 bg-sky-950/30'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400">
                    {gameMode === 'cpu' ? '青（CPU・左右）' : '青（後手・左右）'}
                  </span>
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                    LEFT ↔ RIGHT
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-slate-400">最短必要石数: </span>
                  <strong className="text-2xl font-extrabold text-white">
                    {connectionMetrics.p2Dist}
                  </strong>
                </div>
              </div>
            </div>

            {/* Hex Mathematical Strategy Guide */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-sm font-bold text-white">📐 ヘックスの数学と「2ブリッジ」定石</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-300">
                <li>
                  <strong className="text-rose-300">・ヘックス定理（引き分けなし）</strong>: 数学者ジョン・ナッシュらが証明した通り、盤面がすべて埋まったとき赤か青のどちらか一方が必ず辺と辺を連結しており、引き分けは数学的に存在しません。
                </li>
                <li>
                  <strong className="text-indigo-300">・🔗 2ブリッジ（仮想接続）</strong>: 1マス飛ばしの斜め向かい（間に2つの共通空きマスがある配置）に自分の石を置くと、相手が片方を邪魔してももう片方でつなげるため<strong>実質的に連結が確定</strong>します（盤上の破線表示）。
                </li>
                <li>
                  <strong className="text-emerald-300">・🔄 スワップルール（パイ・ルール）</strong>: 先手1手目が中央の絶対有利マスに置かれた場合、後手は1手目直後に「スワップ」を宣言して先手の石を自分の色に置き換えられます。
                </li>
              </ul>
            </div>

            {/* Move History */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">📜 棋譜ログ</h3>
                <span className="text-[11px] text-slate-400">{moveHistory.length} 手</span>
              </div>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
                {moveHistory.length === 0 ? (
                  <p className="py-4 text-center text-slate-500">
                    任意の六角形マスをタップして対局を開始してください。
                  </p>
                ) : (
                  [...moveHistory].reverse().map((m, i) => (
                    <div
                      key={`${i}-${m.r}-${m.c}`}
                      className="rounded-lg border border-slate-800/90 bg-slate-950/60 px-2.5 py-1.5 text-slate-300"
                    >
                      <span className="mr-1.5 font-mono text-[10px] text-slate-500">
                        #{moveHistory.length - i}
                      </span>
                      <span className={m.player === 1 ? 'text-rose-300' : 'text-sky-300'}>
                        {m.player === 1 ? '赤(先手)' : gameMode === 'cpu' ? '青(CPU)' : '青(後手)'}
                      </span>
                      : {COL_LETTERS[m.c]}
                      {m.r + 1}
                      {m.swapped ? ' (🔄スワップ宣言)' : ''}
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
