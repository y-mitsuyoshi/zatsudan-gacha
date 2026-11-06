'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export type Player = 1 | 2; // 1 = Red (Bottom, moves up), 2 = White/Navy (Top, moves down)
export type GameMode = 'cpu' | '2p';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type ViewMode = '3d' | '2d';

export interface Piece {
  player: Player;
  isKing: boolean;
}

export type BoardState = (Piece | null)[][];

export interface Coord {
  r: number;
  c: number;
}

export interface StepMove {
  from: Coord;
  to: Coord;
  captured?: Coord;
  promoted?: boolean;
}

export interface TurnSequence {
  steps: StepMove[];
  start: Coord;
  end: Coord;
  captures: Coord[];
  promoted: boolean;
}

interface HistorySnapshot {
  board: BoardState;
  turn: Player;
  mustContinueFrom: Coord | null;
  moveCount: number;
  lastMove: { from: Coord; to: Coord; captures: Coord[] } | null;
  logText: string;
}

const BOARD_SIZE = 8;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function createInitialBoard(): BoardState {
  const board: BoardState = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) {
          board[r][c] = { player: 2, isKing: false };
        } else if (r > 4) {
          board[r][c] = { player: 1, isKing: false };
        }
      }
    }
  }
  return board;
}

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function formatCoord(coord: Coord): string {
  return `${COL_LABELS[coord.c]}${BOARD_SIZE - coord.r}`;
}

function getMoveDirections(piece: Piece): [number, number][] {
  if (piece.isKing) {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
  }
  return piece.player === 1
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function getSingleJumpsFrom(board: BoardState, from: Coord): StepMove[] {
  const piece = board[from.r][from.c];
  if (!piece) return [];
  const dirs = getMoveDirections(piece);
  const jumps: StepMove[] = [];

  for (const [dr, dc] of dirs) {
    const midR = from.r + dr;
    const midC = from.c + dc;
    const toR = from.r + dr * 2;
    const toC = from.c + dc * 2;
    if (!inBounds(toR, toC)) continue;
    const midPiece = board[midR][midC];
    if (midPiece && midPiece.player !== piece.player && !board[toR][toC]) {
      const reachesKingRow =
        !piece.isKing && ((piece.player === 1 && toR === 0) || (piece.player === 2 && toR === BOARD_SIZE - 1));
      jumps.push({
        from,
        to: { r: toR, c: toC },
        captured: { r: midR, c: midC },
        promoted: reachesKingRow,
      });
    }
  }
  return jumps;
}

export function getSingleStepsFrom(board: BoardState, from: Coord): StepMove[] {
  const piece = board[from.r][from.c];
  if (!piece) return [];
  const dirs = getMoveDirections(piece);
  const steps: StepMove[] = [];

  for (const [dr, dc] of dirs) {
    const toR = from.r + dr;
    const toC = from.c + dc;
    if (!inBounds(toR, toC)) continue;
    if (!board[toR][toC]) {
      const reachesKingRow =
        !piece.isKing && ((piece.player === 1 && toR === 0) || (piece.player === 2 && toR === BOARD_SIZE - 1));
      steps.push({
        from,
        to: { r: toR, c: toC },
        promoted: reachesKingRow,
      });
    }
  }
  return steps;
}

export function applyStepMove(board: BoardState, step: StepMove): BoardState {
  const next = cloneBoard(board);
  const piece = next[step.from.r][step.from.c];
  if (!piece) return next;
  next[step.from.r][step.from.c] = null;
  if (step.captured) {
    next[step.captured.r][step.captured.c] = null;
  }
  next[step.to.r][step.to.c] = {
    player: piece.player,
    isKing: piece.isKing || Boolean(step.promoted),
  };
  return next;
}

export function getLegalStepMovesForPlayer(
  board: BoardState,
  player: Player,
  mandatoryJump: boolean,
  mustContinueFrom: Coord | null,
): StepMove[] {
  if (mustContinueFrom) {
    return getSingleJumpsFrom(board, mustContinueFrom);
  }

  const allJumps: StepMove[] = [];
  const allSteps: StepMove[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (!piece || piece.player !== player) continue;
      const jumps = getSingleJumpsFrom(board, { r, c });
      allJumps.push(...jumps);
      const steps = getSingleStepsFrom(board, { r, c });
      allSteps.push(...steps);
    }
  }

  if (mandatoryJump && allJumps.length > 0) {
    return allJumps;
  }
  return [...allJumps, ...allSteps];
}

// Generate complete turn sequences (for AI minimax and Hint)
export function generateTurnSequences(
  board: BoardState,
  player: Player,
  mandatoryJump: boolean,
  mustContinueFrom: Coord | null = null,
): TurnSequence[] {
  const expandJumpChain = (
    currentBoard: BoardState,
    pos: Coord,
    stepsSoFar: StepMove[],
    capturesSoFar: Coord[],
    startCoord: Coord,
  ): TurnSequence[] => {
    const nextJumps = getSingleJumpsFrom(currentBoard, pos);
    if (nextJumps.length === 0) {
      return [
        {
          steps: stepsSoFar,
          start: startCoord,
          end: pos,
          captures: capturesSoFar,
          promoted: Boolean(stepsSoFar[stepsSoFar.length - 1]?.promoted),
        },
      ];
    }

    const sequences: TurnSequence[] = [];
    for (const jump of nextJumps) {
      const nextBoard = applyStepMove(currentBoard, jump);
      const newSteps = [...stepsSoFar, jump];
      const newCaptures = jump.captured ? [...capturesSoFar, jump.captured] : capturesSoFar;
      // In English Draughts, crowning immediately ends the jumping turn
      if (jump.promoted) {
        sequences.push({
          steps: newSteps,
          start: startCoord,
          end: jump.to,
          captures: newCaptures,
          promoted: true,
        });
      } else {
        sequences.push(...expandJumpChain(nextBoard, jump.to, newSteps, newCaptures, startCoord));
      }
    }
    return sequences;
  };

  if (mustContinueFrom) {
    const firstJumps = getSingleJumpsFrom(board, mustContinueFrom);
    const results: TurnSequence[] = [];
    for (const jump of firstJumps) {
      const nextBoard = applyStepMove(board, jump);
      if (jump.promoted) {
        results.push({
          steps: [jump],
          start: mustContinueFrom,
          end: jump.to,
          captures: jump.captured ? [jump.captured] : [],
          promoted: true,
        });
      } else {
        results.push(
          ...expandJumpChain(
            nextBoard,
            jump.to,
            [jump],
            jump.captured ? [jump.captured] : [],
            mustContinueFrom,
          ),
        );
      }
    }
    return results;
  }

  const jumpSequences: TurnSequence[] = [];
  const stepSequences: TurnSequence[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (!piece || piece.player !== player) continue;
      const from = { r, c };
      const jumps = getSingleJumpsFrom(board, from);
      for (const jump of jumps) {
        const nextBoard = applyStepMove(board, jump);
        if (jump.promoted) {
          jumpSequences.push({
            steps: [jump],
            start: from,
            end: jump.to,
            captures: jump.captured ? [jump.captured] : [],
            promoted: true,
          });
        } else {
          jumpSequences.push(
            ...expandJumpChain(
              nextBoard,
              jump.to,
              [jump],
              jump.captured ? [jump.captured] : [],
              from,
            ),
          );
        }
      }

      const steps = getSingleStepsFrom(board, from);
      for (const step of steps) {
        stepSequences.push({
          steps: [step],
          start: from,
          end: step.to,
          captures: [],
          promoted: Boolean(step.promoted),
        });
      }
    }
  }

  if (mandatoryJump && jumpSequences.length > 0) {
    return jumpSequences;
  }
  return [...jumpSequences, ...stepSequences];
}

function applyTurnSequence(board: BoardState, seq: TurnSequence): BoardState {
  let current = board;
  for (const step of seq.steps) {
    current = applyStepMove(current, step);
  }
  return current;
}

function evaluateBoard(board: BoardState, aiPlayer: Player): number {
  let score = 0;
  let p1Count = 0;
  let p2Count = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let val = piece.isKing ? 185 : 100;

      // Advancement bonus for normal pieces
      if (!piece.isKing) {
        const advancement = piece.player === 1 ? 7 - r : r;
        val += advancement * 5;
      }

      // Back row defense bonus (protects against opponent king promotion)
      if (piece.player === 1 && r === 7) val += 14;
      if (piece.player === 2 && r === 0) val += 14;

      // Center control bonus
      if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
        val += 8;
      }

      // Edge safety bonus
      if (c === 0 || c === 7) {
        val += 5;
      }

      if (piece.player === 1) {
        p1Count++;
        score += aiPlayer === 1 ? val : -val;
      } else {
        p2Count++;
        score += aiPlayer === 2 ? val : -val;
      }
    }
  }

  if (p1Count === 0) return aiPlayer === 2 ? 10000 : -10000;
  if (p2Count === 0) return aiPlayer === 1 ? 10000 : -10000;

  return score;
}

function chooseBestTurnSequence(
  board: BoardState,
  player: Player,
  difficulty: Difficulty,
  mandatoryJump: boolean,
  mustContinueFrom: Coord | null,
): TurnSequence | null {
  const sequences = generateTurnSequences(board, player, mandatoryJump, mustContinueFrom);
  if (sequences.length === 0) return null;
  if (sequences.length === 1) return sequences[0];

  const depth = difficulty === 'easy' ? 2 : difficulty === 'normal' ? 4 : 5;

  const minimax = (
    state: BoardState,
    d: number,
    alpha: number,
    beta: number,
    currentPlayer: Player,
  ): number => {
    const legalSeqs = generateTurnSequences(state, currentPlayer, mandatoryJump, null);
    if (legalSeqs.length === 0) {
      return currentPlayer === player ? -9000 - d * 10 : 9000 + d * 10;
    }
    if (d === 0) {
      return evaluateBoard(state, player);
    }

    const nextPlayer: Player = currentPlayer === 1 ? 2 : 1;

    if (currentPlayer === player) {
      let maxEval = -Infinity;
      for (const seq of legalSeqs) {
        const nextBoard = applyTurnSequence(state, seq);
        const ev = minimax(nextBoard, d - 1, alpha, beta, nextPlayer);
        if (ev > maxEval) maxEval = ev;
        if (ev > alpha) alpha = ev;
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const seq of legalSeqs) {
        const nextBoard = applyTurnSequence(state, seq);
        const ev = minimax(nextBoard, d - 1, alpha, beta, nextPlayer);
        if (ev < minEval) minEval = ev;
        if (ev < beta) beta = ev;
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };

  // Sort captures first for better alpha-beta pruning
  const sorted = [...sequences].sort((a, b) => b.captures.length - a.captures.length);

  const scored = sorted.map((seq) => {
    const nextBoard = applyTurnSequence(board, seq);
    const nextPlayer: Player = player === 1 ? 2 : 1;
    const baseScore = minimax(nextBoard, depth - 1, -Infinity, Infinity, nextPlayer);
    const jitter = difficulty === 'easy' ? (Math.random() - 0.5) * 45 : 0;
    return { seq, score: baseScore + jitter };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].seq;
}

export default function CheckersGame() {
  const [board, setBoard] = useState<BoardState>(() => createInitialBoard());
  const [turn, setTurn] = useState<Player>(1);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [mandatoryJump, setMandatoryJump] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [cameraPreset, setCameraPreset] = useState<'angle' | 'top' | 'side'>('angle');

  const [selected, setSelected] = useState<Coord | null>(null);
  const [mustContinueFrom, setMustContinueFrom] = useState<Coord | null>(null);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [moveLogs, setMoveLogs] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Coord; to: Coord; captures: Coord[] } | null>(
    null,
  );
  const [hintMove, setHintMove] = useState<{
    step: StepMove;
    reason: string;
  } | null>(null);

  const threeMountRef = useRef<HTMLDivElement | null>(null);

  // Piece statistics
  const stats = useMemo(() => {
    let p1Men = 0;
    let p1Kings = 0;
    let p2Men = 0;
    let p2Kings = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = board[r][c];
        if (!p) continue;
        if (p.player === 1) {
          if (p.isKing) p1Kings++;
          else p1Men++;
        } else {
          if (p.isKing) p2Kings++;
          else p2Men++;
        }
      }
    }
    return {
      p1Total: p1Men + p1Kings,
      p1Kings,
      p2Total: p2Men + p2Kings,
      p2Kings,
      p1Captured: 12 - (p2Men + p2Kings),
      p2Captured: 12 - (p1Men + p1Kings),
    };
  }, [board]);

  const legalSteps = useMemo(
    () => getLegalStepMovesForPlayer(board, turn, mandatoryJump, mustContinueFrom),
    [board, turn, mandatoryJump, mustContinueFrom],
  );

  const hasMandatoryJumps = useMemo(
    () => legalSteps.some((s) => Boolean(s.captured)),
    [legalSteps],
  );

  const winner = useMemo<Player | null>(() => {
    if (stats.p1Total === 0) return 2;
    if (stats.p2Total === 0) return 1;
    if (legalSteps.length === 0) {
      return turn === 1 ? 2 : 1;
    }
    return null;
  }, [stats.p1Total, stats.p2Total, legalSteps.length, turn]);

  const selectableCoords = useMemo(() => {
    const map = new Set<string>();
    for (const s of legalSteps) {
      map.add(`${s.from.r},${s.from.c}`);
    }
    return map;
  }, [legalSteps]);

  const selectedDestinations = useMemo(() => {
    const activeFrom = mustContinueFrom ?? selected;
    if (!activeFrom) return [];
    return legalSteps.filter(
      (s) => s.from.r === activeFrom.r && s.from.c === activeFrom.c,
    );
  }, [legalSteps, selected, mustContinueFrom]);

  const executeStepMove = useCallback(
    (step: StepMove, isAiMove = false) => {
      const snapshot: HistorySnapshot = {
        board: cloneBoard(board),
        turn,
        mustContinueFrom,
        moveCount: moveLogs.length,
        lastMove,
        logText: moveLogs[0] ?? '',
      };

      const nextBoard = applyStepMove(board, step);
      const playerLabel = turn === 1 ? '赤(先手)' : gameMode === 'cpu' ? '白(CPU)' : '白(後手)';
      const actionLabel = step.captured ? 'ジャンプ捕獲' : '移動';
      const promoLabel = step.promoted ? ' 👑キング昇格！' : '';
      const logEntry = `${playerLabel}: ${formatCoord(step.from)} → ${formatCoord(step.to)} (${actionLabel}${promoLabel})`;

      // Check if multi-jump chain continues
      let nextContinue: Coord | null = null;
      if (step.captured && !step.promoted) {
        const followUpJumps = getSingleJumpsFrom(nextBoard, step.to);
        if (followUpJumps.length > 0) {
          nextContinue = step.to;
        }
      }

      if (!isAiMove || !mustContinueFrom) {
        setHistory((prev) => [...prev.slice(-30), snapshot]);
      }

      setBoard(nextBoard);
      setHintMove(null);
      setMoveLogs((prev) => [logEntry, ...prev.slice(0, 29)]);
      setLastMove((prev) => ({
        from: mustContinueFrom && prev ? prev.from : step.from,
        to: step.to,
        captures: step.captured
          ? [...(mustContinueFrom && prev ? prev.captures : []), step.captured]
          : [],
      }));

      if (nextContinue) {
        setMustContinueFrom(nextContinue);
        setSelected(nextContinue);
      } else {
        setMustContinueFrom(null);
        setSelected(null);
        setTurn((prev) => (prev === 1 ? 2 : 1));
      }
    },
    [board, turn, mustContinueFrom, moveLogs, lastMove, gameMode],
  );

  // CPU Turn Handler
  useEffect(() => {
    if (winner) return;
    if (gameMode !== 'cpu' || turn !== 2) return;

    const timer = window.setTimeout(() => {
      const bestSeq = chooseBestTurnSequence(
        board,
        2,
        difficulty,
        mandatoryJump,
        mustContinueFrom,
      );
      if (bestSeq && bestSeq.steps.length > 0) {
        executeStepMove(bestSeq.steps[0], true);
      }
    }, mustContinueFrom ? 380 : 520);

    return () => window.clearTimeout(timer);
  }, [board, turn, gameMode, difficulty, mandatoryJump, mustContinueFrom, winner, executeStepMove]);

  const handleSquareSelect = useCallback(
    (r: number, c: number) => {
      if (winner) return;
      if (gameMode === 'cpu' && turn === 2) return;

      // Check if tapped square is a valid destination for currently selected piece
      const activeFrom = mustContinueFrom ?? selected;
      if (activeFrom) {
        const matchingStep = legalSteps.find(
          (s) =>
            s.from.r === activeFrom.r &&
            s.from.c === activeFrom.c &&
            s.to.r === r &&
            s.to.c === c,
        );
        if (matchingStep) {
          executeStepMove(matchingStep, false);
          return;
        }
      }

      // If locked into multi-jump, cannot switch pieces
      if (mustContinueFrom) return;

      // Otherwise select own piece if it has legal moves
      const piece = board[r][c];
      if (piece && piece.player === turn && selectableCoords.has(`${r},${c}`)) {
        setSelected({ r, c });
        setHintMove(null);
      } else {
        setSelected(null);
      }
    },
    [
      winner,
      gameMode,
      turn,
      mustContinueFrom,
      selected,
      legalSteps,
      board,
      selectableCoords,
      executeStepMove,
    ],
  );

  const handleSquareSelectRef = useRef(handleSquareSelect);
  useEffect(() => {
    handleSquareSelectRef.current = handleSquareSelect;
  }, [handleSquareSelect]);

  const handleReset = useCallback(() => {
    setBoard(createInitialBoard());
    setTurn(1);
    setSelected(null);
    setMustContinueFrom(null);
    setHistory([]);
    setMoveLogs([]);
    setLastMove(null);
    setHintMove(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setTurn(prev.turn);
    setMustContinueFrom(prev.mustContinueFrom);
    setSelected(prev.mustContinueFrom);
    setLastMove(prev.lastMove);
    setMoveLogs((logs) => logs.slice(1));
    setHistory((h) => h.slice(0, -1));
    setHintMove(null);
  }, [history]);

  const handleHint = useCallback(() => {
    if (winner) return;
    if (gameMode === 'cpu' && turn === 2) return;
    const bestSeq = chooseBestTurnSequence(board, turn, 'hard', mandatoryJump, mustContinueFrom);
    if (!bestSeq || bestSeq.steps.length === 0) return;
    const firstStep = bestSeq.steps[0];
    setSelected(firstStep.from);
    let reason = `${formatCoord(firstStep.from)} → ${formatCoord(firstStep.to)} へ進めると中央と陣形バランスが向上します。`;
    if (bestSeq.captures.length >= 2) {
      reason = `${formatCoord(firstStep.from)} から連続ジャンプで ${bestSeq.captures.length} 枚の駒を一気に捕獲できます！`;
    } else if (bestSeq.captures.length === 1) {
      reason = `${formatCoord(firstStep.from)} → ${formatCoord(firstStep.to)} で相手駒をジャンプ捕獲できます。`;
    } else if (bestSeq.promoted) {
      reason = `${formatCoord(firstStep.from)} → ${formatCoord(firstStep.to)} で最奥列に到達し、キングへ昇格できます！`;
    }
    setHintMove({ step: firstStep, reason });
  }, [winner, gameMode, turn, board, mandatoryJump, mustContinueFrom]);

  const handleEndMultiJump = useCallback(() => {
    if (!mustContinueFrom || mandatoryJump) return;
    setMustContinueFrom(null);
    setSelected(null);
    setTurn((prev) => (prev === 1 ? 2 : 1));
  }, [mustContinueFrom, mandatoryJump]);

  // Three.js 3D Board Rendering
  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = threeMountRef.current;
    if (!container) return;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 440;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b101e);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    if (cameraPreset === 'top') {
      camera.position.set(0, 12.2, 0.01);
    } else if (cameraPreset === 'side') {
      camera.position.set(0, 6.2, 10.2);
    } else {
      camera.position.set(0, 8.6, 7.6);
    }
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    dirLight.position.set(5, 12, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 0.65, 25);
    rimLight.position.set(-6, 5, -6);
    scene.add(rimLight);

    // Outer wooden frame
    const frameGeo = new THREE.BoxGeometry(8.9, 0.36, 8.9);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3e2415,
      roughness: 0.55,
      metalness: 0.1,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -0.22;
    scene.add(frameMesh);

    const interactables: THREE.Object3D[] = [];
    const activeFrom = mustContinueFrom ?? selected;

    // 64 Board Squares
    const tileGeo = new THREE.BoxGeometry(0.98, 0.16, 0.98);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const isDark = (r + c) % 2 === 1;
        const isDest = selectedDestinations.some((s) => s.to.r === r && s.to.c === c);
        const isHintTo = hintMove?.step.to.r === r && hintMove?.step.to.c === c;
        const isLast =
          (lastMove?.from.r === r && lastMove?.from.c === c) ||
          (lastMove?.to.r === r && lastMove?.to.c === c);

        let tileColor = isDark ? 0x1e293b : 0xe2e8f0;
        if (isDest) tileColor = 0x10b981;
        else if (isHintTo) tileColor = 0xf59e0b;
        else if (isLast && isDark) tileColor = 0x334155;

        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColor,
          roughness: isDark ? 0.5 : 0.35,
          metalness: 0.08,
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        const x = c - 3.5;
        const z = r - 3.5;
        tile.position.set(x, 0, z);
        tile.receiveShadow = true;
        tile.userData = { r, c };
        scene.add(tile);
        interactables.push(tile);

        // Destination Ring Marker
        if (isDest) {
          const ringGeo = new THREE.RingGeometry(0.22, 0.36, 28);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0x6ee7b7,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(x, 0.095, z);
          ring.userData = { r, c };
          scene.add(ring);
          interactables.push(ring);
        }

        // Piece rendering
        const piece = board[r][c];
        if (piece) {
          const isSelectedPiece = activeFrom?.r === r && activeFrom?.c === c;
          const isSelectable = selectableCoords.has(`${r},${c}`) && piece.player === turn;
          const group = new THREE.Group();
          group.position.set(x, isSelectedPiece ? 0.28 : 0.16, z);
          group.userData = { r, c };

          const discGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.18, 32);
          const discMat = new THREE.MeshStandardMaterial({
            color: piece.player === 1 ? 0xe11d48 : 0xf8fafc,
            roughness: 0.28,
            metalness: 0.18,
            emissive: isSelectedPiece
              ? 0xfbbf24
              : isSelectable
                ? 0x0ea5e9
                : 0x000000,
            emissiveIntensity: isSelectedPiece ? 0.35 : isSelectable ? 0.14 : 0,
          });
          const disc = new THREE.Mesh(discGeo, discMat);
          disc.castShadow = true;
          disc.userData = { r, c };
          group.add(disc);

          // Inner ridge ring
          const ridgeGeo = new THREE.TorusGeometry(0.27, 0.025, 12, 28);
          const ridgeMat = new THREE.MeshStandardMaterial({
            color: piece.player === 1 ? 0xfda4af : 0x94a3b8,
            roughness: 0.3,
            metalness: 0.3,
          });
          const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
          ridge.rotation.x = Math.PI / 2;
          ridge.position.y = 0.09;
          ridge.userData = { r, c };
          group.add(ridge);

          // King double-stack & golden crown
          if (piece.isKing) {
            const topDisc = new THREE.Mesh(discGeo, discMat);
            topDisc.position.y = 0.16;
            topDisc.castShadow = true;
            topDisc.userData = { r, c };
            group.add(topDisc);

            const crownGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.14, 8);
            const crownMat = new THREE.MeshStandardMaterial({
              color: 0xfbbf24,
              roughness: 0.2,
              metalness: 0.85,
              emissive: 0xd97706,
              emissiveIntensity: 0.25,
            });
            const crown = new THREE.Mesh(crownGeo, crownMat);
            crown.position.y = 0.31;
            crown.userData = { r, c };
            group.add(crown);
          }

          scene.add(group);
          interactables.push(disc);
        }
      }
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactables, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && obj.userData?.r === undefined) {
          obj = obj.parent;
        }
        if (obj && typeof obj.userData?.r === 'number' && typeof obj.userData?.c === 'number') {
          handleSquareSelectRef.current(obj.userData.r, obj.userData.c);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', handleResize);
    renderer.render(scene, camera);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [
    viewMode,
    cameraPreset,
    board,
    selected,
    mustContinueFrom,
    selectedDestinations,
    selectableCoords,
    turn,
    hintMove,
    lastMove,
  ]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0b1120]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-rose-400/60 hover:text-white"
          >
            ← 無料ゲーム一覧へ
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
              CHECKERS 3D / 2D
            </span>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6">
        {/* Title & Status Banner */}
        <div className="mb-4 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/95 via-[#0f172a] to-slate-900/95 p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                チェッカー（ドラフツ・8×8 斜めジャンプ捕獲盤ゲーム）
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                斜め移動とジャンプ捕獲で相手の駒をすべて取るか移動不能にすれば勝利。最奥列到達で前後自在のキングへ昇格！
              </p>
            </div>

            {/* Mode & View Switchers */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    viewMode === '3d'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  3D 立体盤面
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    viewMode === '2d'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  2D 平面盤面
                </button>
              </div>

              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setGameMode('cpu');
                    handleReset();
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
                    handleReset();
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

          {/* Difficulty & Rule Bar */}
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
                      {d === 'easy' ? '初級' : d === 'normal' ? '中級' : '上級'}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setMandatoryJump((v) => !v)}
                className={`rounded-lg border px-2.5 py-1 font-medium transition ${
                  mandatoryJump
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-800/70 text-slate-400'
                }`}
              >
                強制ジャンプ: {mandatoryJump ? 'ON (公式)' : 'OFF (自由)'}
              </button>

              {viewMode === '3d' && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">カメラ:</span>
                  {(
                    [
                      ['angle', '斜め俯瞰'],
                      ['top', '真上視点'],
                      ['side', '正面視点'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCameraPreset(key)}
                      className={`rounded-md px-2 py-1 transition ${
                        cameraPreset === key
                          ? 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-400/50'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {label}
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

        {/* Main Game Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Board Column */}
          <div className="lg:col-span-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1222] p-3 shadow-2xl sm:p-4">
              {/* Turn & Mandatory Jump Alert */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full ${
                      turn === 1
                        ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                        : 'bg-slate-100 shadow-[0_0_10px_#f8fafc]'
                    }`}
                  />
                  <span className="text-sm font-bold text-white">
                    {winner
                      ? winner === 1
                        ? '🏆 赤(先手)の勝利！'
                        : gameMode === 'cpu'
                          ? '🏆 白(CPU)の勝利！'
                          : '🏆 白(後手)の勝利！'
                      : turn === 1
                        ? '赤（先手）の手番'
                        : gameMode === 'cpu'
                          ? '白（CPU）が思考中...'
                          : '白（後手）の手番'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {mustContinueFrom && (
                    <span className="animate-pulse rounded-full border border-amber-400/50 bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      ⚡ 連続ジャンプ中！ ({formatCoord(mustContinueFrom)})
                    </span>
                  )}
                  {!mustContinueFrom && mandatoryJump && hasMandatoryJumps && !winner && (
                    <span className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      ジャンプ捕獲が可能です（強制ジャンプ適用中）
                    </span>
                  )}
                  {mustContinueFrom && !mandatoryJump && (
                    <button
                      type="button"
                      onClick={handleEndMultiJump}
                      className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                    >
                      連続ジャンプを終了
                    </button>
                  )}
                </div>
              </div>

              {/* 3D or 2D Viewport */}
              {viewMode === '3d' ? (
                <div className="relative">
                  <div
                    ref={threeMountRef}
                    className="h-[370px] w-full cursor-pointer overflow-hidden rounded-xl border border-slate-800 bg-[#080d1a] sm:h-[460px]"
                    style={{ touchAction: 'none' }}
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      ※ 3D盤面上の駒をタップ/クリックして選択し、緑色に光る移動先マスをタップしてください。
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewMode('2d')}
                      className="text-sky-400 underline hover:text-sky-300"
                    >
                      2D盤面に切替
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[460px]">
                  {/* Column headers */}
                  <div className="mb-1 grid grid-cols-8 text-center text-[11px] font-semibold text-slate-400">
                    {COL_LABELS.map((lbl) => (
                      <span key={lbl}>{lbl}</span>
                    ))}
                  </div>

                  <div
                    className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-xl border-4 border-amber-900/70 shadow-2xl"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {board.map((row, r) =>
                      row.map((piece, c) => {
                        const isDark = (r + c) % 2 === 1;
                        const activeFrom = mustContinueFrom ?? selected;
                        const isSelected = activeFrom?.r === r && activeFrom?.c === c;
                        const destStep = selectedDestinations.find(
                          (s) => s.to.r === r && s.to.c === c,
                        );
                        const isSelectable =
                          selectableCoords.has(`${r},${c}`) && piece?.player === turn;
                        const isHintFrom =
                          hintMove?.step.from.r === r && hintMove?.step.from.c === c;
                        const isHintTo = hintMove?.step.to.r === r && hintMove?.step.to.c === c;
                        const isLastFrom = lastMove?.from.r === r && lastMove?.from.c === c;
                        const isLastTo = lastMove?.to.r === r && lastMove?.to.c === c;

                        return (
                          <button
                            key={`${r}-${c}`}
                            type="button"
                            onClick={() => handleSquareSelect(r, c)}
                            className={`relative flex items-center justify-center transition ${
                              isDark
                                ? destStep
                                  ? 'bg-emerald-900/80 hover:bg-emerald-800/90'
                                  : isLastFrom || isLastTo
                                    ? 'bg-slate-700'
                                    : 'bg-slate-800/95 hover:bg-slate-800'
                                : 'bg-amber-100/90'
                            }`}
                            aria-label={`マス ${COL_LABELS[c]}${BOARD_SIZE - r}`}
                          >
                            {/* Coordinate label on left/bottom edge */}
                            {c === 0 && (
                              <span
                                className={`absolute left-1 top-0.5 text-[9px] font-bold ${
                                  isDark ? 'text-slate-400' : 'text-amber-900/70'
                                }`}
                              >
                                {BOARD_SIZE - r}
                              </span>
                            )}

                            {/* Legal Destination Indicator */}
                            {destStep && (
                              <span
                                className={`h-4 w-4 rounded-full ${
                                  destStep.captured
                                    ? 'animate-ping bg-amber-400/80 ring-4 ring-amber-400/50'
                                    : 'bg-emerald-400/90 ring-4 ring-emerald-400/30'
                                }`}
                              />
                            )}

                            {/* Hint Target Indicator */}
                            {isHintTo && !destStep && (
                              <span className="h-4 w-4 animate-bounce rounded-full bg-amber-400 ring-4 ring-amber-300/50" />
                            )}

                            {/* Piece Disc */}
                            {piece && (
                              <div
                                className={`relative flex h-[76%] w-[76%] items-center justify-center rounded-full border-2 shadow-lg transition-transform ${
                                  piece.player === 1
                                    ? 'border-rose-300 bg-gradient-to-br from-rose-500 to-rose-700 text-white'
                                    : 'border-slate-300 bg-gradient-to-br from-white via-slate-100 to-slate-300 text-slate-900'
                                } ${
                                  isSelected
                                    ? 'scale-110 ring-4 ring-amber-400'
                                    : isSelectable
                                      ? 'ring-2 ring-sky-400/70 hover:scale-105'
                                      : ''
                                } ${isHintFrom ? 'ring-4 ring-amber-300' : ''}`}
                              >
                                <div
                                  className={`flex h-[74%] w-[74%] items-center justify-center rounded-full border ${
                                    piece.player === 1
                                      ? 'border-rose-300/50'
                                      : 'border-slate-400/60'
                                  }`}
                                >
                                  {piece.isKing && (
                                    <span
                                      className="text-sm font-black drop-shadow sm:text-base"
                                      title="キング"
                                    >
                                      👑
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      }),
                    )}
                  </div>
                </div>
              )}

              {/* Hint Banner */}
              {hintMove && (
                <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <span className="font-bold">💡 AI戦術ヒント: </span>
                  {hintMove.reason}
                </div>
              )}
            </div>
          </div>

          {/* Right Info & Scoreboard Column */}
          <div className="space-y-4 lg:col-span-4">
            {/* Player Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-2xl border p-3.5 transition ${
                  turn === 1 && !winner
                    ? 'border-rose-500/70 bg-rose-950/30 shadow-lg shadow-rose-950/30'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400">赤（先手・下側）</span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                    YOU
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-white">{stats.p1Total}</span>
                  <span className="text-xs text-slate-400">
                    👑 キング: <strong className="text-amber-300">{stats.p1Kings}</strong>
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  捕獲した白駒: {stats.p1Captured} / 12
                </div>
              </div>

              <div
                className={`rounded-2xl border p-3.5 transition ${
                  turn === 2 && !winner
                    ? 'border-sky-400/70 bg-sky-950/30 shadow-lg shadow-sky-950/30'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {gameMode === 'cpu' ? '白（CPU・上側）' : '白（後手・上側）'}
                  </span>
                  <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                    {gameMode === 'cpu' ? difficulty.toUpperCase() : '2P'}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-white">{stats.p2Total}</span>
                  <span className="text-xs text-slate-400">
                    👑 キング: <strong className="text-amber-300">{stats.p2Kings}</strong>
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  捕獲した赤駒: {stats.p2Captured} / 12
                </div>
              </div>
            </div>

            {/* Rules Quick Reference */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-sm font-bold text-white">📖 チェッカー（ドラフツ）公式ルール</h3>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
                <li>
                  ・<strong>斜め前進</strong>: 通常駒は黒マスに沿って斜め前方の空きマスへ1マス進みます。
                </li>
                <li>
                  ・<strong>ジャンプ捕獲</strong>: 斜め隣に相手の駒があり、その1つ奥が空いている場合、飛び越えて相手駒を捕獲します。
                </li>
                <li>
                  ・<strong>連続ジャンプ</strong>: ジャンプ着地後、同じ駒でさらに相手駒を飛び越えられる場合は連続してジャンプできます。
                </li>
                <li>
                  ・<strong>キング昇格 (👑)</strong>: 相手側の最奥列に到達した駒はキングに昇格し、斜め前後4方向へ移動・ジャンプできるようになります。
                </li>
              </ul>
            </div>

            {/* Move Log */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">📜 棋譜・対局ログ</h3>
                <span className="text-[11px] text-slate-400">{moveLogs.length} 手</span>
              </div>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
                {moveLogs.length === 0 ? (
                  <p className="py-4 text-center text-slate-500">
                    まだ指し手がありません。赤の駒を選択して対局を開始してください。
                  </p>
                ) : (
                  moveLogs.map((log, i) => (
                    <div
                      key={`${i}-${log}`}
                      className="rounded-lg border border-slate-800/90 bg-slate-950/60 px-2.5 py-1.5 text-slate-300"
                    >
                      <span className="mr-1.5 font-mono text-[10px] text-slate-500">
                        #{moveLogs.length - i}
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
