'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export type Player = 1 | 2; // 1 = Gold/Amber (First), 2 = Cyan/Sapphire (Second / CPU)
export type GameMode = 'cpu' | '2p';
export type Difficulty = 'easy' | 'normal' | 'hard';

export type BoardPoints = (Player | null)[];

export interface PointMeta {
  id: number;
  label: string;
  gx: number; // 0..6 grid X
  gy: number; // 0..6 grid Y
}

export const POINTS: PointMeta[] = [
  // Outer square (0..7)
  { id: 0, label: 'A7', gx: 0, gy: 0 },
  { id: 1, label: 'D7', gx: 3, gy: 0 },
  { id: 2, label: 'G7', gx: 6, gy: 0 },
  { id: 3, label: 'G4', gx: 6, gy: 3 },
  { id: 4, label: 'G1', gx: 6, gy: 6 },
  { id: 5, label: 'D1', gx: 3, gy: 6 },
  { id: 6, label: 'A1', gx: 0, gy: 6 },
  { id: 7, label: 'A4', gx: 0, gy: 3 },
  // Middle square (8..15)
  { id: 8, label: 'B6', gx: 1, gy: 1 },
  { id: 9, label: 'D6', gx: 3, gy: 1 },
  { id: 10, label: 'F6', gx: 5, gy: 1 },
  { id: 11, label: 'F4', gx: 5, gy: 3 },
  { id: 12, label: 'F2', gx: 5, gy: 5 },
  { id: 13, label: 'D2', gx: 3, gy: 5 },
  { id: 14, label: 'B2', gx: 1, gy: 5 },
  { id: 15, label: 'B4', gx: 1, gy: 3 },
  // Inner square (16..23)
  { id: 16, label: 'C5', gx: 2, gy: 2 },
  { id: 17, label: 'D5', gx: 3, gy: 2 },
  { id: 18, label: 'E5', gx: 4, gy: 2 },
  { id: 19, label: 'E4', gx: 4, gy: 3 },
  { id: 20, label: 'E3', gx: 4, gy: 4 },
  { id: 21, label: 'D3', gx: 3, gy: 4 },
  { id: 22, label: 'C3', gx: 2, gy: 4 },
  { id: 23, label: 'C4', gx: 2, gy: 3 },
];

export const MILL_LINES: [number, number, number][] = [
  // Outer ring
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 0],
  // Middle ring
  [8, 9, 10],
  [10, 11, 12],
  [12, 13, 14],
  [14, 15, 8],
  // Inner ring
  [16, 17, 18],
  [18, 19, 20],
  [20, 21, 22],
  [22, 23, 16],
  // Cross midlines
  [1, 9, 17],
  [3, 11, 19],
  [5, 13, 21],
  [7, 15, 23],
];

export const ADJACENCY: Record<number, number[]> = (() => {
  const map: Record<number, Set<number>> = {};
  for (let i = 0; i < 24; i++) map[i] = new Set();
  for (const [a, b, c] of MILL_LINES) {
    map[a].add(b);
    map[b].add(a);
    map[b].add(c);
    map[c].add(b);
  }
  const out: Record<number, number[]> = {};
  for (let i = 0; i < 24; i++) out[i] = Array.from(map[i]);
  return out;
})();

interface Snapshot {
  board: BoardPoints;
  turn: Player;
  unplaced1: number;
  unplaced2: number;
  mustRemove: boolean;
  lastActionText: string;
}

export function isPointInMill(board: BoardPoints, pointId: number, player: Player): boolean {
  return MILL_LINES.some(
    (line) =>
      line.includes(pointId) &&
      board[line[0]] === player &&
      board[line[1]] === player &&
      board[line[2]] === player,
  );
}

export function getActiveMills(board: BoardPoints): { line: [number, number, number]; player: Player }[] {
  const active: { line: [number, number, number]; player: Player }[] = [];
  for (const line of MILL_LINES) {
    const p = board[line[0]];
    if (p && board[line[1]] === p && board[line[2]] === p) {
      active.push({ line, player: p });
    }
  }
  return active;
}

export function getRemovablePoints(board: BoardPoints, opponent: Player): number[] {
  const oppPoints: number[] = [];
  const nonMillPoints: number[] = [];
  for (let i = 0; i < 24; i++) {
    if (board[i] === opponent) {
      oppPoints.push(i);
      if (!isPointInMill(board, i, opponent)) {
        nonMillPoints.push(i);
      }
    }
  }
  return nonMillPoints.length > 0 ? nonMillPoints : oppPoints;
}

export function countStonesOnBoard(board: BoardPoints, player: Player): number {
  let count = 0;
  for (let i = 0; i < 24; i++) {
    if (board[i] === player) count++;
  }
  return count;
}

export type PlayerPhase = 'place' | 'move' | 'fly';

export function getPlayerPhase(board: BoardPoints, unplaced: number, player: Player): PlayerPhase {
  if (unplaced > 0) return 'place';
  const onBoard = countStonesOnBoard(board, player);
  return onBoard <= 3 ? 'fly' : 'move';
}

export interface MorrisAction {
  from: number | null; // null during placement phase
  to: number;
  remove: number | null; // opponent stone removed if mill formed
}

export function generateLegalActions(
  board: BoardPoints,
  player: Player,
  unplaced1: number,
  unplaced2: number,
): MorrisAction[] {
  const unplaced = player === 1 ? unplaced1 : unplaced2;
  const opponent: Player = player === 1 ? 2 : 1;
  const phase = getPlayerPhase(board, unplaced, player);
  const actions: MorrisAction[] = [];

  const addWithMillCheck = (from: number | null, to: number, nextBoard: BoardPoints) => {
    if (isPointInMill(nextBoard, to, player)) {
      const removable = getRemovablePoints(nextBoard, opponent);
      if (removable.length === 0) {
        actions.push({ from, to, remove: null });
      } else {
        for (const rem of removable) {
          actions.push({ from, to, remove: rem });
        }
      }
    } else {
      actions.push({ from, to, remove: null });
    }
  };

  if (phase === 'place') {
    for (let to = 0; to < 24; to++) {
      if (board[to] !== null) continue;
      const next = [...board];
      next[to] = player;
      addWithMillCheck(null, to, next);
    }
  } else if (phase === 'move') {
    for (let from = 0; from < 24; from++) {
      if (board[from] !== player) continue;
      for (const to of ADJACENCY[from]) {
        if (board[to] !== null) continue;
        const next = [...board];
        next[from] = null;
        next[to] = player;
        addWithMillCheck(from, to, next);
      }
    }
  } else {
    // Flying phase
    const emptyPoints: number[] = [];
    for (let i = 0; i < 24; i++) {
      if (board[i] === null) emptyPoints.push(i);
    }
    for (let from = 0; from < 24; from++) {
      if (board[from] !== player) continue;
      for (const to of emptyPoints) {
        const next = [...board];
        next[from] = null;
        next[to] = player;
        addWithMillCheck(from, to, next);
      }
    }
  }

  return actions;
}

function applyAction(
  board: BoardPoints,
  player: Player,
  action: MorrisAction,
): BoardPoints {
  const next = [...board];
  if (action.from !== null) {
    next[action.from] = null;
  }
  next[action.to] = player;
  if (action.remove !== null) {
    next[action.remove] = null;
  }
  return next;
}

function evaluateMorrisState(
  board: BoardPoints,
  unplaced1: number,
  unplaced2: number,
  aiPlayer: Player,
): number {
  const human: Player = aiPlayer === 1 ? 2 : 1;
  const aiTotal = countStonesOnBoard(board, aiPlayer) + (aiPlayer === 1 ? unplaced1 : unplaced2);
  const huTotal = countStonesOnBoard(board, human) + (human === 1 ? unplaced1 : unplaced2);

  if ((human === 1 ? unplaced1 : unplaced2) === 0 && countStonesOnBoard(board, human) < 3) {
    return 10000;
  }
  if ((aiPlayer === 1 ? unplaced1 : unplaced2) === 0 && countStonesOnBoard(board, aiPlayer) < 3) {
    return -10000;
  }

  let score = (aiTotal - huTotal) * 140;

  // Count completed mills & 2-in-a-row potential mills
  for (const [a, b, c] of MILL_LINES) {
    const vals = [board[a], board[b], board[c]];
    const aiCnt = vals.filter((v) => v === aiPlayer).length;
    const huCnt = vals.filter((v) => v === human).length;
    const emptyCnt = vals.filter((v) => v === null).length;

    if (aiCnt === 3) score += 75;
    else if (huCnt === 3) score -= 75;
    else if (aiCnt === 2 && emptyCnt === 1) score += 28;
    else if (huCnt === 2 && emptyCnt === 1) score -= 32;
  }

  // Mobility & cross-intersection control (points with 4 neighbors: 1, 3, 5, 7, 9, 11, 13, 15)
  const highMobilityIds = [1, 3, 5, 7, 9, 11, 13, 15];
  for (const id of highMobilityIds) {
    if (board[id] === aiPlayer) score += 12;
    else if (board[id] === human) score -= 12;
  }

  for (let i = 0; i < 24; i++) {
    if (board[i] === aiPlayer) {
      const freeNeighbors = ADJACENCY[i].filter((n) => board[n] === null).length;
      score += freeNeighbors * 5;
    } else if (board[i] === human) {
      const freeNeighbors = ADJACENCY[i].filter((n) => board[n] === null).length;
      score -= freeNeighbors * 5;
    }
  }

  return score;
}

function chooseBestMorrisAction(
  board: BoardPoints,
  player: Player,
  unplaced1: number,
  unplaced2: number,
  difficulty: Difficulty,
): MorrisAction | null {
  const actions = generateLegalActions(board, player, unplaced1, unplaced2);
  if (actions.length === 0) return null;

  const opponent: Player = player === 1 ? 2 : 1;
  const nextU1 = player === 1 && unplaced1 > 0 ? unplaced1 - 1 : unplaced1;
  const nextU2 = player === 2 && unplaced2 > 0 ? unplaced2 - 1 : unplaced2;

  if (difficulty === 'easy') {
    const scored = actions.map((act) => {
      const nb = applyAction(board, player, act);
      return {
        act,
        score: evaluateMorrisState(nb, nextU1, nextU2, player) + (Math.random() - 0.5) * 90,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].act;
  }

  // Depth 2 / Depth 3 lookahead with pruning
  const maxBranches = difficulty === 'hard' ? 18 : 12;

  const preScored = actions
    .map((act) => {
      const nb = applyAction(board, player, act);
      return { act, nb, immediate: evaluateMorrisState(nb, nextU1, nextU2, player) };
    })
    .sort((a, b) => b.immediate - a.immediate)
    .slice(0, maxBranches);

  let bestAct = preScored[0].act;
  let bestVal = -Infinity;

  for (const item of preScored) {
    const oppActions = generateLegalActions(item.nb, opponent, nextU1, nextU2);
    if (oppActions.length === 0) {
      return item.act; // Immediate win by blocking
    }
    const oppU1 = opponent === 1 && nextU1 > 0 ? nextU1 - 1 : nextU1;
    const oppU2 = opponent === 2 && nextU2 > 0 ? nextU2 - 1 : nextU2;

    let worstReply = Infinity;
    for (const oppAct of oppActions) {
      const nb2 = applyAction(item.nb, opponent, oppAct);
      let val = evaluateMorrisState(nb2, oppU1, oppU2, player);

      if (difficulty === 'hard' && oppAct.remove !== null) {
        val -= 35;
      }
      if (val < worstReply) worstReply = val;
      if (worstReply <= bestVal) break;
    }

    if (worstReply > bestVal) {
      bestVal = worstReply;
      bestAct = item.act;
    }
  }

  return bestAct;
}

export default function NineMensMorrisGame() {
  const [board, setBoard] = useState<BoardPoints>(() => Array(24).fill(null));
  const [turn, setTurn] = useState<Player>(1);
  const [unplaced1, setUnplaced1] = useState<number>(9);
  const [unplaced2, setUnplaced2] = useState<number>(9);
  const [mustRemove, setMustRemove] = useState<boolean>(false);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastMovedPoints, setLastMovedPoints] = useState<number[]>([]);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintTargets, setHintTargets] = useState<number[]>([]);

  const onBoard1 = useMemo(() => countStonesOnBoard(board, 1), [board]);
  const onBoard2 = useMemo(() => countStonesOnBoard(board, 2), [board]);

  const currentPhase = useMemo(
    () => getPlayerPhase(board, turn === 1 ? unplaced1 : unplaced2, turn),
    [board, turn, unplaced1, unplaced2],
  );

  const activeMills = useMemo(() => getActiveMills(board), [board]);

  const legalActionsForTurn = useMemo(
    () => generateLegalActions(board, turn, unplaced1, unplaced2),
    [board, turn, unplaced1, unplaced2],
  );

  const winner = useMemo<Player | null>(() => {
    if (unplaced1 === 0 && onBoard1 < 3) return 2;
    if (unplaced2 === 0 && onBoard2 < 3) return 1;
    if (!mustRemove && legalActionsForTurn.length === 0) {
      return turn === 1 ? 2 : 1;
    }
    return null;
  }, [unplaced1, unplaced2, onBoard1, onBoard2, mustRemove, legalActionsForTurn.length, turn]);

  const removableTargets = useMemo(() => {
    if (!mustRemove) return new Set<number>();
    const opponent: Player = turn === 1 ? 2 : 1;
    return new Set(getRemovablePoints(board, opponent));
  }, [mustRemove, turn, board]);

  const validDestinations = useMemo(() => {
    if (mustRemove || winner) return new Set<number>();
    if (currentPhase === 'place') {
      const s = new Set<number>();
      for (let i = 0; i < 24; i++) if (board[i] === null) s.add(i);
      return s;
    }
    if (selectedPoint === null) return new Set<number>();
    if (currentPhase === 'fly') {
      const s = new Set<number>();
      for (let i = 0; i < 24; i++) if (board[i] === null) s.add(i);
      return s;
    }
    return new Set(ADJACENCY[selectedPoint].filter((n) => board[n] === null));
  }, [mustRemove, winner, currentPhase, board, selectedPoint]);

  const saveSnapshot = useCallback(
    (actionText: string) => {
      setHistory((prev) => [
        ...prev.slice(-30),
        {
          board: [...board],
          turn,
          unplaced1,
          unplaced2,
          mustRemove,
          lastActionText: actionText,
        },
      ]);
    },
    [board, turn, unplaced1, unplaced2, mustRemove],
  );

  // CPU Turn Execution
  useEffect(() => {
    if (winner) return;
    if (gameMode !== 'cpu' || turn !== 2) return;

    const timer = window.setTimeout(() => {
      if (mustRemove) {
        const rems = getRemovablePoints(board, 1);
        if (rems.length > 0) {
          const target = rems[0];
          const next = [...board];
          next[target] = null;
          setBoard(next);
          setMustRemove(false);
          setLastMovedPoints((prev) => [...prev, target]);
          setLogs((prev) => [
            `青(CPU): ミル成立により ${POINTS[target].label} の琥珀石を除去！`,
            ...prev.slice(0, 29),
          ]);
          setTurn(1);
        }
        return;
      }

      const best = chooseBestMorrisAction(board, 2, unplaced1, unplaced2, difficulty);
      if (!best) return;

      const next = [...board];
      if (best.from !== null) next[best.from] = null;
      next[best.to] = 2;
      if (best.remove !== null) next[best.remove] = null;

      if (unplaced2 > 0) setUnplaced2((u) => u - 1);
      setBoard(next);
      setSelectedPoint(null);
      setHintText(null);
      setHintTargets([]);
      setLastMovedPoints(
        [best.from, best.to, best.remove].filter((x): x is number => x !== null),
      );

      const moveDesc =
        best.from === null
          ? `青(CPU): ${POINTS[best.to].label} に石を配置`
          : `青(CPU): ${POINTS[best.from].label} → ${POINTS[best.to].label} へ移動`;
      const remDesc =
        best.remove !== null ? ` ＆ ミル成立で ${POINTS[best.remove].label} を除去！` : '';

      setLogs((prev) => [`${moveDesc}${remDesc}`, ...prev.slice(0, 29)]);
      setTurn(1);
    }, 520);

    return () => window.clearTimeout(timer);
  }, [winner, gameMode, turn, mustRemove, board, unplaced1, unplaced2, difficulty]);

  const handlePointClick = (id: number) => {
    if (winner) return;
    if (gameMode === 'cpu' && turn === 2) return;

    const pLabel = turn === 1 ? '琥珀(先手)' : '青(後手)';

    // Step A: Removing an opponent stone after forming a mill
    if (mustRemove) {
      if (!removableTargets.has(id)) return;
      const next = [...board];
      next[id] = null;
      setBoard(next);
      setMustRemove(false);
      setSelectedPoint(null);
      setHintText(null);
      setHintTargets([]);
      setLastMovedPoints((prev) => [...prev, id]);
      setLogs((prev) => [
        `${pLabel}: ミル成立ボーナスで ${POINTS[id].label} の相手石を除去！`,
        ...prev.slice(0, 29),
      ]);
      setTurn((t) => (t === 1 ? 2 : 1));
      return;
    }

    // Step B: Placement Phase
    if (currentPhase === 'place') {
      if (board[id] !== null) return;
      saveSnapshot(`${pLabel}: ${POINTS[id].label} に配置`);
      const next = [...board];
      next[id] = turn;
      if (turn === 1) setUnplaced1((u) => u - 1);
      else setUnplaced2((u) => u - 1);

      setBoard(next);
      setHintText(null);
      setHintTargets([]);
      setLastMovedPoints([id]);

      const formedMill = isPointInMill(next, id, turn);
      if (formedMill) {
        setMustRemove(true);
        setLogs((prev) => [
          `${pLabel}: ${POINTS[id].label} に配置 → ⚡ミル成立！除去する相手石を選んでください`,
          ...prev.slice(0, 29),
        ]);
      } else {
        setLogs((prev) => [`${pLabel}: ${POINTS[id].label} に配置`, ...prev.slice(0, 29)]);
        setTurn((t) => (t === 1 ? 2 : 1));
      }
      return;
    }

    // Step C: Movement / Flying Phase
    if (board[id] === turn) {
      setSelectedPoint(id);
      setHintText(null);
      setHintTargets([]);
      return;
    }

    if (selectedPoint !== null && board[id] === null && validDestinations.has(id)) {
      saveSnapshot(`${pLabel}: ${POINTS[selectedPoint].label} → ${POINTS[id].label}`);
      const next = [...board];
      next[selectedPoint] = null;
      next[id] = turn;
      setBoard(next);
      setSelectedPoint(null);
      setHintText(null);
      setHintTargets([]);
      setLastMovedPoints([selectedPoint, id]);

      const formedMill = isPointInMill(next, id, turn);
      if (formedMill) {
        setMustRemove(true);
        setLogs((prev) => [
          `${pLabel}: ${POINTS[selectedPoint].label} → ${POINTS[id].label} → ⚡ミル成立！除去する相手石を選んでください`,
          ...prev.slice(0, 29),
        ]);
      } else {
        setLogs((prev) => [
          `${pLabel}: ${POINTS[selectedPoint].label} → ${POINTS[id].label} へ${
            currentPhase === 'fly' ? 'フライング移動' : '移動'
          }`,
          ...prev.slice(0, 29),
        ]);
        setTurn((t) => (t === 1 ? 2 : 1));
      }
    }
  };

  const handleReset = useCallback(() => {
    setBoard(Array(24).fill(null));
    setTurn(1);
    setUnplaced1(9);
    setUnplaced2(9);
    setMustRemove(false);
    setSelectedPoint(null);
    setHistory([]);
    setLogs([]);
    setLastMovedPoints([]);
    setHintText(null);
    setHintTargets([]);
  }, []);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setTurn(prev.turn);
    setUnplaced1(prev.unplaced1);
    setUnplaced2(prev.unplaced2);
    setMustRemove(prev.mustRemove);
    setSelectedPoint(null);
    setHintText(null);
    setHintTargets([]);
    setHistory((h) => h.slice(0, -1));
    setLogs((l) => l.slice(1));
  };

  const handleHint = () => {
    if (winner) return;
    if (gameMode === 'cpu' && turn === 2) return;

    if (mustRemove) {
      const opponent: Player = turn === 1 ? 2 : 1;
      const rems = getRemovablePoints(board, opponent);
      if (rems.length > 0) {
        setHintTargets([rems[0]]);
        setHintText(
          `${POINTS[rems[0]].label} の相手石を除去すると相手のミル形成を効果的に妨害できます。`,
        );
      }
      return;
    }

    const best = chooseBestMorrisAction(board, turn, unplaced1, unplaced2, 'hard');
    if (!best) return;

    if (best.from === null) {
      setHintTargets([best.to]);
      setHintText(
        best.remove !== null
          ? `${POINTS[best.to].label} に置くと直ちにミルが成立し、${POINTS[best.remove].label} を除去できます！`
          : `${POINTS[best.to].label} に配置すると交点の支配力と将来のミル候補が広がります。`,
      );
    } else {
      setSelectedPoint(best.from);
      setHintTargets([best.from, best.to]);
      setHintText(
        best.remove !== null
          ? `${POINTS[best.from].label} → ${POINTS[best.to].label} へ動かすとミルが成立します！`
          : `${POINTS[best.from].label} → ${POINTS[best.to].label} へ進めると好形を作れます。`,
      );
    }
  };

  // Convert 0..6 grid coordinates to SVG 0..600 coordinates (with 60px padding -> 60..540)
  const toSvg = (g: number) => 60 + g * 80;

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#0b1020]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-400/60 hover:text-white"
          >
            ← 無料ゲーム一覧へ
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              NINE MEN&apos;S MORRIS
            </span>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6">
        {/* Top Control Card */}
        <div className="mb-4 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-[#10172a] to-slate-900/95 p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                ナイン・メンズ・モリス（古代ローマ三目戦略盤・ミル）
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                縦または横に3つの石を並べて「ミル」を作り、相手の石を1つずつ除去せよ！残り3石でどこへでも飛べる「フライング」が発動。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setGameMode('cpu');
                    handleReset();
                  }}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    gameMode === 'cpu'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  CPU対戦
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGameMode('2p');
                    handleReset();
                  }}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    gameMode === '2p'
                      ? 'bg-amber-600 text-white'
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
                  <span className="text-slate-400">CPU難易度:</span>
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
                      {d === 'easy' ? '初級' : d === 'normal' ? '中級' : '上級'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
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
                disabled={history.length === 0}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
              >
                ↩ 待った
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-semibold text-rose-300 transition hover:bg-rose-500/25"
              >
                🔄 新規対局
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* SVG Board Column */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-800 bg-[#0b1222] p-3 shadow-2xl sm:p-5">
              {/* Phase & Action Banner */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-3.5 w-3.5 rounded-full ${
                      turn === 1
                        ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                        : 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                    }`}
                  />
                  <span className="text-sm font-bold text-white">
                    {winner
                      ? winner === 1
                        ? '🏆 琥珀（先手）の勝利！'
                        : gameMode === 'cpu'
                          ? '🏆 青（CPU）の勝利！'
                          : '🏆 青（後手）の勝利！'
                      : turn === 1
                        ? '琥珀（先手）の手番'
                        : gameMode === 'cpu'
                          ? '青（CPU）が思考中...'
                          : '青（後手）の手番'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {mustRemove ? (
                    <span className="animate-pulse rounded-full border border-rose-400/60 bg-rose-500/20 px-3 py-0.5 text-xs font-bold text-rose-200">
                      ⚡ ミル成立！赤枠で光る相手の石を1つタップして除去してください
                    </span>
                  ) : (
                    <span className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-0.5 text-xs font-semibold text-indigo-200">
                      {currentPhase === 'place'
                        ? 'フェーズ1: 配置（空いている交点に石を置く）'
                        : currentPhase === 'move'
                          ? 'フェーズ2: 移動（線に沿って隣の交点へ動かす）'
                          : 'フェーズ3: 🪽フライング（残り3石！任意の空き交点へジャンプ可能）'}
                    </span>
                  )}
                </div>
              </div>

              {/* Interactive SVG Board */}
              <div className="mx-auto max-w-[490px]">
                <svg
                  viewBox="0 0 600 600"
                  className="h-auto w-full select-none rounded-2xl border border-amber-900/40 bg-gradient-to-br from-[#17120e] via-[#111827] to-[#0f172a] shadow-inner"
                  style={{ touchAction: 'manipulation' }}
                >
                  <defs>
                    <radialGradient id="amberStone" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="55%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#b45309" />
                    </radialGradient>
                    <radialGradient id="cyanStone" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#e0f2fe" />
                      <stop offset="55%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#0e7490" />
                    </radialGradient>
                  </defs>

                  {/* 3 Concentric Squares */}
                  {[0, 1, 2].map((ring) => {
                    const start = toSvg(ring);
                    const size = (6 - ring * 2) * 80;
                    return (
                      <rect
                        key={ring}
                        x={start}
                        y={start}
                        width={size}
                        height={size}
                        fill="none"
                        stroke="#475569"
                        strokeWidth={4}
                        rx={4}
                      />
                    );
                  })}

                  {/* 4 Midlines connecting the 3 squares */}
                  <line x1={toSvg(3)} y1={toSvg(0)} x2={toSvg(3)} y2={toSvg(2)} stroke="#475569" strokeWidth={4} />
                  <line x1={toSvg(3)} y1={toSvg(4)} x2={toSvg(3)} y2={toSvg(6)} stroke="#475569" strokeWidth={4} />
                  <line x1={toSvg(0)} y1={toSvg(3)} x2={toSvg(2)} y2={toSvg(3)} stroke="#475569" strokeWidth={4} />
                  <line x1={toSvg(4)} y1={toSvg(3)} x2={toSvg(6)} y2={toSvg(3)} stroke="#475569" strokeWidth={4} />

                  {/* Glowing Active Mill Lines */}
                  {activeMills.map(({ line, player }, idx) => {
                    const pStart = POINTS[line[0]];
                    const pEnd = POINTS[line[2]];
                    return (
                      <line
                        key={`mill-${idx}`}
                        x1={toSvg(pStart.gx)}
                        y1={toSvg(pStart.gy)}
                        x2={toSvg(pEnd.gx)}
                        y2={toSvg(pEnd.gy)}
                        stroke={player === 1 ? '#fbbf24' : '#22d3ee'}
                        strokeWidth={9}
                        strokeLinecap="round"
                        opacity={0.75}
                      />
                    );
                  })}

                  {/* 24 Intersections & Stones */}
                  {POINTS.map((pt) => {
                    const cx = toSvg(pt.gx);
                    const cy = toSvg(pt.gy);
                    const occupant = board[pt.id];
                    const isSelected = selectedPoint === pt.id;
                    const isDest = validDestinations.has(pt.id);
                    const isRemovable = removableTargets.has(pt.id);
                    const isHint = hintTargets.includes(pt.id);
                    const isLast = lastMovedPoints.includes(pt.id);

                    return (
                      <g
                        key={pt.id}
                        onClick={() => handlePointClick(pt.id)}
                        className="cursor-pointer"
                      >
                        {/* Invisible larger hit target for mobile fingers */}
                        <circle cx={cx} cy={cy} r={30} fill="transparent" />

                        {/* Base node circle */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isDest ? 13 : 9}
                          fill={isDest ? '#10b981' : '#334155'}
                          stroke={isDest ? '#6ee7b7' : '#94a3b8'}
                          strokeWidth={isDest ? 3 : 2}
                        />

                        {/* Hint Ring */}
                        {isHint && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={26}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth={3}
                            strokeDasharray="5 3"
                          />
                        )}

                        {/* Removable Opponent Stone Highlight */}
                        {isRemovable && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={26}
                            fill="rgba(244, 63, 94, 0.25)"
                            stroke="#f43f5e"
                            strokeWidth={3.5}
                          />
                        )}

                        {/* Stone rendering */}
                        {occupant && (
                          <g>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={20}
                              fill={occupant === 1 ? 'url(#amberStone)' : 'url(#cyanStone)'}
                              stroke={
                                isSelected
                                  ? '#ffffff'
                                  : isRemovable
                                    ? '#f43f5e'
                                    : isLast
                                      ? '#a855f7'
                                      : occupant === 1
                                        ? '#fde68a'
                                        : '#a5f3fc'
                              }
                              strokeWidth={isSelected || isRemovable ? 4 : 2.5}
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={12}
                              fill="none"
                              stroke={occupant === 1 ? 'rgba(254,240,138,0.45)' : 'rgba(224,242,254,0.45)'}
                              strokeWidth={1.5}
                            />
                          </g>
                        )}

                        {/* Coordinate label */}
                        <text
                          x={cx}
                          y={cy + 32}
                          textAnchor="middle"
                          className="fill-slate-400 text-[10px] font-semibold"
                        >
                          {pt.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {hintText && (
                <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <span className="font-bold">💡 AI戦術ヒント: </span>
                  {hintText}
                </div>
              )}
            </div>
          </div>

          {/* Right Status & Guide Column */}
          <div className="space-y-4 lg:col-span-4">
            {/* Player Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-2xl border p-3.5 transition ${
                  turn === 1 && !winner
                    ? 'border-amber-500/70 bg-amber-950/30 shadow-lg'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">琥珀（先手）</span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                    {getPlayerPhase(board, unplaced1, 1).toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400">盤上: </span>
                    <strong className="text-xl font-extrabold text-white">{onBoard1}</strong>
                  </div>
                  <div className="text-xs text-slate-300">
                    手持ち未配置: <strong className="text-amber-300">{unplaced1}</strong>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-3.5 transition ${
                  turn === 2 && !winner
                    ? 'border-cyan-400/70 bg-cyan-950/30 shadow-lg'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">
                    {gameMode === 'cpu' ? '青（CPU）' : '青（後手）'}
                  </span>
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200">
                    {getPlayerPhase(board, unplaced2, 2).toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400">盤上: </span>
                    <strong className="text-xl font-extrabold text-white">{onBoard2}</strong>
                  </div>
                  <div className="text-xs text-slate-300">
                    手持ち未配置: <strong className="text-cyan-300">{unplaced2}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Phases Explanation */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-sm font-bold text-white">🏛️ 3つのフェーズとミル成立ルール</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-300">
                <li>
                  <strong className="text-amber-300">① 配置フェーズ</strong>: 手持ちの9個の石を交互に空いている交点へ1つずつ配置します。
                </li>
                <li>
                  <strong className="text-sky-300">② 移動フェーズ</strong>: 9個すべて置き終えたら、自分の石を線に沿って隣の空き交点へ1マス動かします。
                </li>
                <li>
                  <strong className="text-purple-300">③ フライングフェーズ</strong>: 自分の石が残り<strong>ちょうど3個</strong>になると、線に関係なく任意の空き交点へジャンプできます！
                </li>
                <li>
                  <strong className="text-rose-300">⚡ ミル（三目）成立</strong>: 直線上の3つの交点に自分の石を揃えると「ミル」成立！相手の石（原則ミル以外の石）を1つ盤面から除去できます。相手を残り2石にするか移動不能にすれば勝利です。
                </li>
              </ul>
            </div>

            {/* Move Logs */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">📜 対局ログ</h3>
                <span className="text-[11px] text-slate-400">{logs.length} 手</span>
              </div>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
                {logs.length === 0 ? (
                  <p className="py-4 text-center text-slate-500">
                    交点をタップして最初の石を配置してください。
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
