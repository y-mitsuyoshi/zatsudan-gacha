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
    scene.background = new THREE.Color(0x17120f);

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

    const rimLight = new THREE.PointLight(0xd8b078, 0.45, 25);
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

        let tileColor = isDark ? 0x4a3423 : 0xe0cda9;
        if (isDest) tileColor = 0x4f7d5e;
        else if (isHintTo) tileColor = 0xc99555;
        else if (isLast && isDark) tileColor = 0x5a4029;

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
            color: 0xe3c17c,
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
                ? 0xc99555
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
              <p className="tabletop-kicker truncate">Classic Draughts · 8×8 Checkers</p>
              <h2 className="tabletop-title truncate text-base sm:text-xl">
                チェッカー
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 rounded-md border border-[#4d3d2d] bg-black/20 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                aria-pressed={viewMode === '3d'}
                className={`inline-flex min-h-11 items-center rounded px-3 text-xs font-semibold transition ${
                  viewMode === '3d'
                    ? 'bg-[#c99555] text-[#1b120b]'
                    : 'text-[#b9a88f] hover:text-[#f4ead8]'
                }`}
              >
                3D盤面
              </button>
              <button
                type="button"
                onClick={() => setViewMode('2d')}
                aria-pressed={viewMode === '2d'}
                className={`inline-flex min-h-11 items-center rounded px-3 text-xs font-semibold transition ${
                  viewMode === '2d'
                    ? 'bg-[#c99555] text-[#1b120b]'
                    : 'text-[#b9a88f] hover:text-[#f4ead8]'
                }`}
              >
                2D盤面
              </button>
            </div>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-2 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Board Column */}
        <div className="flex min-w-0 flex-col gap-3">
          <section className="tabletop-panel p-2 sm:p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border ${
                    turn === 1
                      ? 'border-[#e0a49a] bg-[#b4544a]'
                      : 'border-[#efe4cf] bg-[#fffaf0]'
                  }`}
                />
                <span className="tabletop-title truncate text-sm sm:text-base">
                  {winner
                    ? winner === 1
                      ? '赤（先手）の勝利'
                      : gameMode === 'cpu'
                        ? '白（CPU）の勝利'
                        : '白（後手）の勝利'
                    : turn === 1
                      ? '赤（先手）の手番'
                      : gameMode === 'cpu'
                        ? '白（CPU）が思考中...'
                        : '白（後手）の手番'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {mustContinueFrom && (
                  <span className="tabletop-chip border-[#8a6a3f] bg-[#2a211a] px-2.5 py-1 text-[11px] font-semibold text-[#dfb06d]">
                    連続ジャンプ中 ({formatCoord(mustContinueFrom)})
                  </span>
                )}
                {!mustContinueFrom && mandatoryJump && hasMandatoryJumps && !winner && (
                  <span className="tabletop-chip border-[#4f6b57] bg-[#223129] px-2.5 py-1 text-[11px] font-semibold text-[#a9c9b1]">
                    ジャンプ捕獲が可能（強制ジャンプ）
                  </span>
                )}
                {mustContinueFrom && !mandatoryJump && (
                  <button
                    type="button"
                    onClick={handleEndMultiJump}
                    className="tabletop-button inline-flex min-h-11 items-center px-3 text-[11px] font-semibold"
                  >
                    連続ジャンプを終了
                  </button>
                )}
              </div>
            </div>

            {viewMode === '3d' ? (
              <div>
                <div className="tabletop-board-frame relative overflow-hidden">
                  <div
                    ref={threeMountRef}
                    className="h-[320px] w-full cursor-pointer touch-none overflow-hidden sm:h-[460px] lg:h-[520px]"
                    style={{ touchAction: 'none' }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#b9a88f]">
                  <span>3D盤面の駒を選択し、明るい移動先マスをタップしてください。</span>
                  <button
                    type="button"
                    onClick={() => setViewMode('2d')}
                    className="font-semibold text-[#dfb06d] underline decoration-[#8a6a3f] underline-offset-2 hover:text-[#f0c98f]"
                  >
                    2D盤面に切替
                  </button>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[540px]">
                <div className="mb-1 grid grid-cols-8 text-center text-[11px] font-semibold text-[#b9a88f]">
                  {COL_LABELS.map((lbl) => (
                    <span key={lbl}>{lbl}</span>
                  ))}
                </div>

                <div
                  className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-md border-2 border-[#5a3d24]"
                  style={{ touchAction: 'manipulation' }}
                >
                  {board.map((row, r) =>
                    row.map((piece, c) => {
                      const isDark = (r + c) % 2 === 1;
                      const activeFrom = mustContinueFrom ?? selected;
                      const isSelected = activeFrom?.r === r && activeFrom?.c === c;
                      const destStep = selectedDestinations.find(
                        (s) => s.to.r === r && s.to.c === c
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
                                ? destStep.captured
                                  ? 'bg-[#7a4137] hover:bg-[#8a4b40]'
                                  : 'bg-[#315d4e] hover:bg-[#3a6c5a]'
                                : isLastFrom || isLastTo
                                  ? 'bg-[#5d4933]'
                                  : 'bg-[#4a3423] hover:bg-[#57402c]'
                              : 'bg-[#e7d4ae]'
                          }`}
                          aria-label={`マス ${COL_LABELS[c]}${BOARD_SIZE - r}`}
                        >
                          {c === 0 && (
                            <span
                              className={`absolute left-1 top-0.5 text-[10px] font-bold ${
                                isDark ? 'text-[#c9b291]' : 'text-[#6b543d]'
                              }`}
                            >
                              {BOARD_SIZE - r}
                            </span>
                          )}

                          {destStep && (
                            <span
                              className={`h-3.5 w-3.5 rounded-full sm:h-4 sm:w-4 ${
                                destStep.captured
                                  ? 'bg-[#dfb06d] ring-2 ring-[#dfb06d]/40'
                                  : 'bg-[#8fb79a] ring-2 ring-[#8fb79a]/35'
                              }`}
                            />
                          )}

                          {isHintTo && !destStep && (
                            <span className="h-3.5 w-3.5 rounded-full bg-[#dfb06d] ring-2 ring-[#dfb06d]/40 sm:h-4 sm:w-4" />
                          )}

                          {piece && (
                            <div
                              className={`relative flex h-[76%] w-[76%] items-center justify-center rounded-full border-2 shadow-sm transition-transform ${
                                piece.player === 1
                                  ? 'border-[#e0a49a] bg-gradient-to-br from-[#b4544a] to-[#7e2f28] text-[#fff4e6]'
                                  : 'border-[#efe4cf] bg-gradient-to-br from-[#fffaf0] via-[#f0e6d5] to-[#d3c3a8] text-[#3a2b1c]'
                              } ${
                                isSelected
                                  ? 'scale-105 ring-2 ring-[#dfb06d]'
                                  : isSelectable
                                    ? 'ring-1 ring-[#c99555]/70'
                                    : ''
                              } ${isHintFrom ? 'ring-2 ring-[#dfb06d]' : ''}`}
                            >
                              <div
                                className={`flex h-[72%] w-[72%] items-center justify-center rounded-full border ${
                                  piece.player === 1
                                    ? 'border-[#e0a49a]/60'
                                    : 'border-[#b7a58c]/70'
                                }`}
                              >
                                {piece.isKing && (
                                  <span
                                    className="text-sm font-black leading-none sm:text-base"
                                    title="キング"
                                  >
                                    ♛
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {hintMove && (
              <div className="tabletop-panel-soft mt-2.5 px-3 py-2 text-xs text-[#d8cbb8]">
                <span className="font-semibold text-[#dfb06d]">AI戦術ヒント: </span>
                {hintMove.reason}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="flex min-w-0 flex-col gap-3">
          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Match Actions</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleHint}
                disabled={Boolean(winner) || (gameMode === 'cpu' && turn === 2)}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-2 text-xs text-[#dfb06d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                ヒント
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-2 text-xs disabled:cursor-not-allowed disabled:opacity-45"
              >
                待った
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="tabletop-button-primary inline-flex min-h-11 items-center justify-center px-2 text-xs"
              >
                新規対局
              </button>
            </div>
          </div>

          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Match Setup / 対戦設定</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGameMode('cpu');
                  handleReset();
                }}
                aria-pressed={gameMode === 'cpu'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  gameMode === 'cpu' ? 'tabletop-chip-active' : ''
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
                aria-pressed={gameMode === '2p'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  gameMode === '2p' ? 'tabletop-chip-active' : ''
                }`}
              >
                1台で2人対戦
              </button>
            </div>

            {gameMode === 'cpu' && (
              <>
                <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">CPUの強さ</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      aria-pressed={difficulty === d}
                      className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-1.5 text-xs font-semibold ${
                        difficulty === d ? 'tabletop-chip-active' : ''
                      }`}
                    >
                      {d === 'easy' ? '初級' : d === 'normal' ? '中級' : '上級'}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">公式ルール</p>
            <button
              type="button"
              onClick={() => setMandatoryJump((v) => !v)}
              aria-pressed={mandatoryJump}
              className={`tabletop-chip mt-1.5 inline-flex min-h-11 w-full items-center justify-center px-2 text-xs font-semibold ${
                mandatoryJump ? 'tabletop-chip-active' : ''
              }`}
            >
              強制ジャンプ: {mandatoryJump ? 'ON（公式）' : 'OFF（自由）'}
            </button>

            {viewMode === '3d' && (
              <>
                <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">カメラ</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['angle', '斜め'],
                      ['top', '真上'],
                      ['side', '正面'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCameraPreset(key)}
                      aria-pressed={cameraPreset === key}
                      className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-1.5 text-xs font-semibold ${
                        cameraPreset === key ? 'tabletop-chip-active' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Player Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`tabletop-panel p-3 ${
                turn === 1 && !winner ? 'ring-1 ring-[#c99555]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-[#d8a69a]">赤（先手）</span>
                <span className="rounded bg-[#3a211b] px-1.5 py-0.5 text-[10px] font-semibold text-[#d8a69a]">
                  YOU
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-1">
                <span className="font-mono text-xl font-bold text-[#f4ead8]">{stats.p1Total}</span>
                <span className="text-[10px] text-[#b9a88f]">
                  キング <strong className="text-[#dfb06d]">{stats.p1Kings}</strong>
                </span>
              </div>
              <div className="mt-1 text-[10px] text-[#8f806d]">捕獲 {stats.p1Captured} / 12</div>
            </div>

            <div
              className={`tabletop-panel p-3 ${
                turn === 2 && !winner ? 'ring-1 ring-[#c99555]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] font-semibold text-[#d8cbb8]">
                  {gameMode === 'cpu' ? '白（CPU）' : '白（後手）'}
                </span>
                <span className="rounded bg-[#2a211a] px-1.5 py-0.5 text-[10px] font-semibold text-[#b9a88f]">
                  {gameMode === 'cpu' ? 'AI' : '2P'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-1">
                <span className="font-mono text-xl font-bold text-[#f4ead8]">{stats.p2Total}</span>
                <span className="text-[10px] text-[#b9a88f]">
                  キング <strong className="text-[#dfb06d]">{stats.p2Kings}</strong>
                </span>
              </div>
              <div className="mt-1 text-[10px] text-[#8f806d]">捕獲 {stats.p2Captured} / 12</div>
            </div>
          </div>

          <div className="tabletop-panel-soft p-3.5 text-xs leading-relaxed">
            <p className="tabletop-kicker">Checkers Rules</p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-[#b9a88f]">
              <li>
                <strong className="font-semibold text-[#dfb06d]">斜め前進：</strong>
                通常駒は黒マスに沿って斜め前方の空きマスへ1マス進みます。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">ジャンプ捕獲：</strong>
                斜め隣の相手駒を飛び越え、その奥が空いていれば捕獲します。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">連続ジャンプ：</strong>
                着地後にさらに飛べる場合は続けて捕獲できます。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">キング昇格（♛）：</strong>
                最奥列に到達すると前後4方向へ移動・ジャンプできるキングになります。
              </li>
            </ul>
          </div>

          <div className="tabletop-panel p-3.5">
            <div className="flex items-center justify-between">
              <p className="tabletop-kicker">Move Log / 棋譜</p>
              <span className="text-[11px] text-[#b9a88f]">{moveLogs.length} 手</span>
            </div>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
              {moveLogs.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-[#8f806d]">
                  まだ指し手がありません。赤の駒を選択して開始してください。
                </p>
              ) : (
                moveLogs.map((log, i) => (
                  <div
                    key={`${i}-${log}`}
                    className="rounded border border-[#4d3d2d] bg-black/15 px-2.5 py-1.5 text-[11px] text-[#d8cbb8]"
                  >
                    <span className="mr-1.5 font-mono text-[10px] text-[#8f806d]">
                      #{moveLogs.length - i}
                    </span>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
