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
          `${pLabel}: ${POINTS[id].label} に配置 → ミル成立！除去する相手石を選んでください`,
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
          `${pLabel}: ${POINTS[selectedPoint].label} → ${POINTS[id].label} → ミル成立！除去する相手石を選んでください`,
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
            <span className="tabletop-kicker hidden sm:inline">Nine Men&apos;s Morris</span>
            <div className="[&>button]:h-11 [&>button]:w-11 [&>div]:h-11 [&>div]:w-11">
              <ThemeToggleButton />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        {/* Title & Match Controls */}
        <section className="tabletop-panel mb-4 p-3 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="tabletop-kicker">Ancient Strategy · 24 Points</p>
              <h2 className="tabletop-title mt-1 text-xl sm:text-2xl">
                ナイン・メンズ・モリス
              </h2>
              <p className="tabletop-muted mt-1 max-w-2xl text-xs leading-relaxed sm:text-sm">
                三つの石で「ミル」を組み、相手の石を盤から取り除く古典戦略盤。配置・移動・飛翔の三段階を制し、相手を追い詰めてください。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="対戦モード" className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  data-mode="cpu"
                  onClick={() => {
                    setGameMode('cpu');
                    handleReset();
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
                    handleReset();
                  }}
                  className={`tabletop-chip min-h-11 px-3 text-xs font-semibold transition ${
                    gameMode === '2p' ? 'tabletop-chip-active' : ''
                  }`}
                >
                  1台で2人対戦
                </button>
              </div>
            </div>
          </div>

          <div className="tabletop-divider mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {gameMode === 'cpu' && (
                <>
                  <span className="tabletop-muted text-[11px]">CPU強さ</span>
                  <div role="group" aria-label="CPU難易度" className="flex flex-wrap gap-1.5">
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
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
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
                disabled={history.length === 0}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                待った
              </button>
              <button
                type="button"
                data-action="reset"
                onClick={handleReset}
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
              {/* Turn & Phase Banner */}
              <div className="tabletop-panel-soft mb-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      turn === 1 ? 'bg-[#e3d2b3]' : 'bg-[#7fa08e]'
                    }`}
                  />
                  <span className="truncate text-xs font-semibold text-[#f4ead8] sm:text-sm">
                    {winner
                      ? winner === 1
                        ? '琥珀（先手）の勝利'
                        : gameMode === 'cpu'
                          ? '青（CPU）の勝利'
                          : '青（後手）の勝利'
                      : turn === 1
                        ? '琥珀（先手）の手番'
                        : gameMode === 'cpu'
                          ? '青（CPU）が思考中'
                          : '青（後手）の手番'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {mustRemove ? (
                    <span className="tabletop-chip tabletop-chip-active px-2.5 py-1 text-[10px] font-semibold sm:text-[11px]">
                      ミル成立 — 相手の石を選択
                    </span>
                  ) : (
                    <span className="tabletop-chip px-2.5 py-1 text-[10px] font-semibold sm:text-[11px]">
                      {currentPhase === 'place'
                        ? '配置フェーズ'
                        : currentPhase === 'move'
                          ? '移動フェーズ'
                          : '飛翔フェーズ'}
                    </span>
                  )}
                </div>
              </div>

              {/* Wooden Morris Board */}
              <div className="tabletop-board-frame mx-auto max-w-[520px] p-1.5 sm:p-2">
                <svg
                  viewBox="0 0 600 600"
                  role="img"
                  aria-label="ナイン・メンズ・モリスの盤面"
                  className="block h-auto w-full select-none"
                  style={{ touchAction: 'manipulation' }}
                >
                  <defs>
                    <linearGradient id="morrisWood" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3a2a1c" />
                      <stop offset="48%" stopColor="#2e2117" />
                      <stop offset="100%" stopColor="#231810" />
                    </linearGradient>
                    <radialGradient id="morrisIvoryStone" cx="35%" cy="28%" r="75%">
                      <stop offset="0%" stopColor="#fff8e8" />
                      <stop offset="58%" stopColor="#e3d2b3" />
                      <stop offset="100%" stopColor="#b39a76" />
                    </radialGradient>
                    <radialGradient id="morrisForestStone" cx="35%" cy="28%" r="75%">
                      <stop offset="0%" stopColor="#8fb7a3" />
                      <stop offset="55%" stopColor="#4f7f69" />
                      <stop offset="100%" stopColor="#27483a" />
                    </radialGradient>
                    <filter id="morrisStoneShadow" x="-40%" y="-40%" width="180%" height="180%">
                      <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="2.2"
                        floodColor="#0a0705"
                        floodOpacity="0.55"
                      />
                    </filter>
                  </defs>

                  {/* Wood surface */}
                  <rect x="0" y="0" width="600" height="600" rx="10" fill="url(#morrisWood)" />
                  <g opacity="0.14" stroke="#8a6744" strokeWidth="1">
                    {[48, 118, 196, 274, 352, 430, 508, 566].map((y) => (
                      <path
                        key={y}
                        d={`M14 ${y} C 150 ${y - 7}, 380 ${y + 9}, 586 ${y - 3}`}
                        fill="none"
                      />
                    ))}
                  </g>
                  <rect x="9" y="9" width="582" height="582" rx="8" fill="none" stroke="#6b543d" strokeWidth="2" />
                  <rect x="19" y="19" width="562" height="562" rx="5" fill="none" stroke="#3b2c1f" strokeWidth="1" />

                  {/* Three concentric squares */}
                  {[0, 1, 2].map((ring) => {
                    const start = toSvg(ring);
                    const size = (6 - ring * 2) * 80;
                    return (
                      <g key={ring}>
                        <rect
                          x={start}
                          y={start}
                          width={size}
                          height={size}
                          rx={3}
                          fill="none"
                          stroke="#1a110b"
                          strokeWidth={9}
                        />
                        <rect
                          x={start}
                          y={start}
                          width={size}
                          height={size}
                          rx={3}
                          fill="none"
                          stroke="#8a6744"
                          strokeWidth={3.5}
                        />
                      </g>
                    );
                  })}

                  {/* Four midlines */}
                  {[
                    [toSvg(3), toSvg(0), toSvg(3), toSvg(2)],
                    [toSvg(3), toSvg(4), toSvg(3), toSvg(6)],
                    [toSvg(0), toSvg(3), toSvg(2), toSvg(3)],
                    [toSvg(4), toSvg(3), toSvg(6), toSvg(3)],
                  ].map(([x1, y1, x2, y2], idx) => (
                    <g key={`midline-${idx}`}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a110b" strokeWidth={9} />
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8a6744" strokeWidth={3.5} />
                    </g>
                  ))}

                  {/* Active mill lines */}
                  {activeMills.map(({ line, player }, idx) => {
                    const pStart = POINTS[line[0]];
                    const pEnd = POINTS[line[2]];
                    const millColor = player === 1 ? '#e0bd86' : '#7fa08e';
                    return (
                      <g key={`mill-${idx}`}>
                        <line
                          x1={toSvg(pStart.gx)}
                          y1={toSvg(pStart.gy)}
                          x2={toSvg(pEnd.gx)}
                          y2={toSvg(pEnd.gy)}
                          stroke="#1a110b"
                          strokeWidth={12}
                          strokeLinecap="round"
                        />
                        <line
                          x1={toSvg(pStart.gx)}
                          y1={toSvg(pStart.gy)}
                          x2={toSvg(pEnd.gx)}
                          y2={toSvg(pEnd.gy)}
                          stroke={millColor}
                          strokeWidth={5}
                          strokeLinecap="round"
                          opacity={0.85}
                        />
                      </g>
                    );
                  })}

                  {/* Intersections & stones */}
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
                        data-point={pt.id}
                        onClick={() => handlePointClick(pt.id)}
                        className="cursor-pointer"
                      >
                        {/* Full-size touch target */}
                        <circle cx={cx} cy={cy} r={40} fill="transparent" />

                        {/* Base inlay */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isDest ? 15 : 10}
                          fill={isDest ? '#c99555' : '#241a12'}
                          stroke={isDest ? '#f0d7a8' : '#8a6a45'}
                          strokeWidth={isDest ? 2.5 : 2}
                        />
                        {isDest && <circle cx={cx} cy={cy} r={4.5} fill="#fff6e3" />}

                        {/* Stone */}
                        {occupant && (
                          <g filter="url(#morrisStoneShadow)">
                            <circle
                              cx={cx}
                              cy={cy}
                              r={20}
                              fill={occupant === 1 ? 'url(#morrisIvoryStone)' : 'url(#morrisForestStone)'}
                              stroke={
                                isSelected
                                  ? '#fff6e3'
                                  : isRemovable
                                    ? '#c96a5a'
                                    : occupant === 1
                                      ? '#f0dfc0'
                                      : '#9fc3b0'
                              }
                              strokeWidth={isSelected || isRemovable ? 3.5 : 2}
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={12.5}
                              fill="none"
                              stroke={occupant === 1 ? '#9c7f57' : '#2b4a3b'}
                              strokeWidth={1.4}
                              opacity={0.65}
                            />
                            <ellipse
                              cx={cx - 6}
                              cy={cy - 7}
                              rx={6}
                              ry={4}
                              fill="#ffffff"
                              opacity={0.28}
                            />
                          </g>
                        )}

                        {/* Selection, hint and capture rings */}
                        {isSelected && (
                          <circle cx={cx} cy={cy} r={24} fill="none" stroke="#fff6e3" strokeWidth={2} />
                        )}
                        {isHint && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={27}
                            fill="none"
                            stroke="#dfb06d"
                            strokeWidth={2.5}
                            strokeDasharray="5 4"
                          />
                        )}
                        {isRemovable && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={27}
                            fill="rgba(159, 69, 64, 0.18)"
                            stroke="#c96a5a"
                            strokeWidth={2.5}
                          />
                        )}
                        {isLast && !isSelected && !isRemovable && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={23}
                            fill="none"
                            stroke="#dfb06d"
                            strokeWidth={1.5}
                            opacity={0.8}
                          />
                        )}

                        {/* Coordinate label */}
                        <text
                          x={cx}
                          y={cy + 34}
                          textAnchor="middle"
                          fill="#b9a88f"
                          fontSize="12"
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          opacity={0.8}
                        >
                          {pt.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {hintText && (
                <div className="mt-3 border-l-2 border-[#c99555] bg-[#2a211a] px-3 py-2 text-xs leading-relaxed text-[#e8d7bd]">
                  <span className="font-semibold text-[#dfb06d]">AIヒント: </span>
                  {hintText}
                </div>
              )}
            </div>
          </div>

          {/* Side Panels */}
          <aside className="min-w-0 space-y-3 lg:col-span-4">
            {/* Player Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="tabletop-stat p-2.5 sm:p-3"
                style={
                  turn === 1 && !winner
                    ? { borderColor: '#c99555', background: 'rgba(201, 149, 85, 0.08)' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#e8d7bd]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#e3d2b3] ring-1 ring-[#8a6a45]" />
                    <span className="truncate">琥珀（先手）</span>
                  </span>
                  <span className="tabletop-chip shrink-0 px-1.5 py-0.5 text-[9px] font-semibold">
                    {getPlayerPhase(board, unplaced1, 1) === 'place'
                      ? '配置'
                      : getPlayerPhase(board, unplaced1, 1) === 'move'
                        ? '移動'
                        : '飛翔'}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div>
                    <span className="tabletop-muted text-[10px]">盤上</span>
                    <strong className="ml-1 text-lg leading-none">{onBoard1}</strong>
                  </div>
                  <span className="tabletop-muted text-[10px]">
                    手元 <strong className="text-xs text-[#e8d7bd]">{unplaced1}</strong>
                  </span>
                </div>
              </div>

              <div
                className="tabletop-stat p-2.5 sm:p-3"
                style={
                  turn === 2 && !winner
                    ? { borderColor: '#7fa08e', background: 'rgba(127, 160, 142, 0.08)' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#e8d7bd]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#4f7f69] ring-1 ring-[#9fc3b0]" />
                    <span className="truncate">{gameMode === 'cpu' ? '青（CPU）' : '青（後手）'}</span>
                  </span>
                  <span className="tabletop-chip shrink-0 px-1.5 py-0.5 text-[9px] font-semibold">
                    {getPlayerPhase(board, unplaced2, 2) === 'place'
                      ? '配置'
                      : getPlayerPhase(board, unplaced2, 2) === 'move'
                        ? '移動'
                        : '飛翔'}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div>
                    <span className="tabletop-muted text-[10px]">盤上</span>
                    <strong className="ml-1 text-lg leading-none">{onBoard2}</strong>
                  </div>
                  <span className="tabletop-muted text-[10px]">
                    手元 <strong className="text-xs text-[#e8d7bd]">{unplaced2}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Rules Guide */}
            <div className="tabletop-panel p-3.5">
              <h3 className="tabletop-title text-sm">ルールと三つのフェーズ</h3>
              <ul className="tabletop-muted mt-2 space-y-1.5 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-[#dfb06d]">配置</strong> — 手元の9石を交互に空き交点へ置きます。
                </li>
                <li>
                  <strong className="text-[#dfb06d]">移動</strong> — 全石を置いた後、線に沿って隣の空き交点へ1マス動かします。
                </li>
                <li>
                  <strong className="text-[#dfb06d]">飛翔</strong> — 石が3個になると、任意の空き交点へジャンプできます。
                </li>
                <li>
                  <strong className="text-[#c96a5a]">ミル</strong> — 直線3連を完成させ、相手の石を1個除去。相手を2石以下か移動不能にすれば勝利です。
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
                    盤上の交点を選び、最初の石を置いてください。
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
