'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

type Disc = 0 | 1 | 2; // 0: empty, 1: Black (先手), 2: White (後手)
type GameMode = 'cpu' | 'pvp';
type Difficulty = 'easy' | 'normal' | 'hard';
type ViewMode = '3d' | '2d';
type CameraPreset = 'angled' | 'top' | 'low';

interface MoveInfo {
  r: number;
  c: number;
  flips: [number, number][];
}

interface HistorySnapshot {
  board: Disc[][];
  turn: 1 | 2;
  lastMove: [number, number] | null;
  lastFlipped: [number, number][];
  passNotice: string | null;
}

interface FlipAnim {
  r: number;
  c: number;
  from: 1 | 2;
  to: 1 | 2;
  startTime: number;
  delay: number;
}

const DIRECTIONS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

// Positional weights for 8x8 Reversi strategy
const POSITION_WEIGHTS: number[][] = [
  [120, -25, 20, 8, 8, 20, -25, 120],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [20, -5, 15, 4, 4, 15, -5, 20],
  [8, -5, 4, 2, 2, 4, -5, 8],
  [8, -5, 4, 2, 2, 4, -5, 8],
  [20, -5, 15, 4, 4, 15, -5, 20],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [120, -25, 20, 8, 8, 20, -25, 120],
];

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function createInitialBoard(): Disc[][] {
  const b: Disc[][] = Array.from({ length: 8 }, () => Array<Disc>(8).fill(0));
  b[3][3] = 2;
  b[3][4] = 1;
  b[4][3] = 1;
  b[4][4] = 2;
  return b;
}

function cloneBoard(board: Disc[][]): Disc[][] {
  return board.map((row) => [...row]);
}

function getFlipsForCell(board: Disc[][], r: number, c: number, player: 1 | 2): [number, number][] {
  if (board[r][c] !== 0) return [];
  const opp: 1 | 2 = player === 1 ? 2 : 1;
  const flips: [number, number][] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const line: [number, number][] = [];
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === opp) {
      line.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    if (line.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

function getLegalMoves(board: Disc[][], player: 1 | 2): MoveInfo[] {
  const moves: MoveInfo[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const flips = getFlipsForCell(board, r, c, player);
      if (flips.length > 0) {
        moves.push({ r, c, flips });
      }
    }
  }
  return moves;
}

function applyMove(board: Disc[][], move: MoveInfo, player: 1 | 2): Disc[][] {
  const next = cloneBoard(board);
  next[move.r][move.c] = player;
  for (const [fr, fc] of move.flips) {
    next[fr][fc] = player;
  }
  return next;
}

function countDiscs(board: Disc[][]): { black: number; white: number; empty: number } {
  let black = 0;
  let white = 0;
  let empty = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === 1) black++;
      else if (board[r][c] === 2) white++;
      else empty++;
    }
  }
  return { black, white, empty };
}

function evaluateBoard(board: Disc[][], aiPlayer: 1 | 2): number {
  const opp: 1 | 2 = aiPlayer === 1 ? 2 : 1;
  const counts = countDiscs(board);
  const myCount = aiPlayer === 1 ? counts.black : counts.white;
  const oppCount = aiPlayer === 1 ? counts.white : counts.black;

  if (counts.empty === 0) {
    return (myCount - oppCount) * 1000;
  }

  let positional = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === aiPlayer) positional += POSITION_WEIGHTS[r][c];
      else if (board[r][c] === opp) positional -= POSITION_WEIGHTS[r][c];
    }
  }

  // Dynamic X-square & C-square correction when corner is already captured
  const corners: [number, number, [number, number][]][] = [
    [0, 0, [[0, 1], [1, 0], [1, 1]]],
    [0, 7, [[0, 6], [1, 7], [1, 6]]],
    [7, 0, [[6, 0], [7, 1], [6, 1]]],
    [7, 7, [[6, 7], [7, 6], [6, 6]]],
  ];
  for (const [cr, cc, adj] of corners) {
    const cornerOwner = board[cr][cc];
    if (cornerOwner !== 0) {
      for (const [ar, ac] of adj) {
        if (board[ar][ac] === cornerOwner) {
          positional += cornerOwner === aiPlayer ? 35 : -35;
        }
      }
    }
  }

  const myMoves = getLegalMoves(board, aiPlayer).length;
  const oppMoves = getLegalMoves(board, opp).length;
  if (myMoves === 0 && oppMoves === 0) {
    return (myCount - oppCount) * 1000;
  }

  const mobility = (myMoves - oppMoves) * 12;
  const endgameParity = counts.empty <= 12 ? (myCount - oppCount) * 8 : (myCount - oppCount) * 1.5;

  return positional + mobility + endgameParity;
}

function minimax(
  board: Disc[][],
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: 1 | 2,
  aiPlayer: 1 | 2
): number {
  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }
  const opp: 1 | 2 = currentPlayer === 1 ? 2 : 1;
  const moves = getLegalMoves(board, currentPlayer);

  if (moves.length === 0) {
    const oppMoves = getLegalMoves(board, opp);
    if (oppMoves.length === 0) {
      return evaluateBoard(board, aiPlayer);
    }
    return minimax(board, depth - 1, alpha, beta, opp, aiPlayer);
  }

  if (currentPlayer === aiPlayer) {
    let best = -Infinity;
    for (const m of moves) {
      const next = applyMove(board, m, currentPlayer);
      const val = minimax(next, depth - 1, alpha, beta, opp, aiPlayer);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const next = applyMove(board, m, currentPlayer);
      const val = minimax(next, depth - 1, alpha, beta, opp, aiPlayer);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function pickBestMove(board: Disc[][], player: 1 | 2, difficulty: Difficulty): MoveInfo | null {
  const moves = getLegalMoves(board, player);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    // Easy: Mix of max flips and random
    const sorted = [...moves].sort((a, b) => b.flips.length - a.flips.length);
    const pool = sorted.slice(0, Math.min(3, sorted.length));
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (difficulty === 'normal') {
    let bestMove = moves[0];
    let bestScore = -Infinity;
    const opp: 1 | 2 = player === 1 ? 2 : 1;
    for (const m of moves) {
      const next = applyMove(board, m, player);
      const oppMobility = getLegalMoves(next, opp).length;
      const score =
        POSITION_WEIGHTS[m.r][m.c] * 1.4 +
        m.flips.length * 2 -
        oppMobility * 6 +
        (Math.random() - 0.5) * 3;
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }
    return bestMove;
  }

  // Hard: Alpha-beta minimax (depth 4, deeper in endgame)
  const { empty } = countDiscs(board);
  const depth = empty <= 10 ? 6 : 4;
  const opp: 1 | 2 = player === 1 ? 2 : 1;
  let bestMove = moves[0];
  let bestVal = -Infinity;

  // Order moves by static positional weight for better pruning
  const ordered = [...moves].sort(
    (a, b) => POSITION_WEIGHTS[b.r][b.c] - POSITION_WEIGHTS[a.r][a.c]
  );

  for (const m of ordered) {
    const next = applyMove(board, m, player);
    const val = minimax(next, depth - 1, -Infinity, Infinity, opp, player);
    if (val > bestVal) {
      bestVal = val;
      bestMove = m;
    }
  }
  return bestMove;
}

export default function ReversiGame() {
  const [board, setBoard] = useState<Disc[][]>(() => createInitialBoard());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [mode, setMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [humanSide, setHumanSide] = useState<1 | 2>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('angled');
  const [showMoveCount, setShowMoveCount] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [lastFlipped, setLastFlipped] = useState<[number, number][]>([]);
  const [hintMove, setHintMove] = useState<MoveInfo | null>(null);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [passNotice, setPassNotice] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const flipAnimsRef = useRef<FlipAnim[]>([]);
  const cameraTargetRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0,
    phi: 0.72,
    radius: 11.2,
  });
  const cameraCurrentRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0,
    phi: 0.72,
    radius: 11.2,
  });

  const playTone = useCallback(
    (freq: number, duration = 0.08, type: OscillatorType = 'sine', gainVal = 0.08) => {
      if (!soundOn || typeof window === 'undefined') return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Ignore audio errors
      }
    },
    [soundOn]
  );

  const legalMoves = useMemo(() => getLegalMoves(board, turn), [board, turn]);
  const legalMap = useMemo(() => {
    const map = new Map<string, MoveInfo>();
    for (const m of legalMoves) {
      map.set(`${m.r}-${m.c}`, m);
    }
    return map;
  }, [legalMoves]);

  const counts = useMemo(() => countDiscs(board), [board]);
  const totalDiscs = counts.black + counts.white;
  const blackRatio = totalDiscs > 0 ? Math.round((counts.black / totalDiscs) * 100) : 50;

  const isCpuTurn = mode === 'cpu' && turn !== humanSide && !gameOver;

  const applyCameraPreset = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset);
    if (preset === 'angled') {
      cameraTargetRef.current = { theta: 0, phi: 0.72, radius: 11.2 };
    } else if (preset === 'top') {
      cameraTargetRef.current = { theta: 0, phi: 0.08, radius: 11.4 };
    } else {
      cameraTargetRef.current = { theta: 0.38, phi: 1.02, radius: 11.0 };
    }
  }, []);

  const executeMove = useCallback(
    (move: MoveInfo) => {
      if (gameOver) return;
      const snapshot: HistorySnapshot = {
        board: cloneBoard(board),
        turn,
        lastMove,
        lastFlipped,
        passNotice,
      };
      setHistory((prev) => [...prev, snapshot]);
      setHintMove(null);

      const nextBoard = applyMove(board, move, turn);
      const now = performance.now();
      const opp: 1 | 2 = turn === 1 ? 2 : 1;

      flipAnimsRef.current = move.flips.map(([fr, fc], idx) => ({
        r: fr,
        c: fc,
        from: opp,
        to: turn,
        startTime: now,
        delay: idx * 45,
      }));

      playTone(turn === 1 ? 320 : 420, 0.09, 'triangle', 0.1);
      move.flips.forEach((_, idx) => {
        window.setTimeout(() => {
          playTone(500 + idx * 35, 0.06, 'sine', 0.06);
        }, (idx + 1) * 45);
      });

      setBoard(nextBoard);
      setLastMove([move.r, move.c]);
      setLastFlipped(move.flips);

      const nextMovesForOpp = getLegalMoves(nextBoard, opp);
      if (nextMovesForOpp.length > 0) {
        setTurn(opp);
        setPassNotice(null);
      } else {
        const nextMovesForCurrent = getLegalMoves(nextBoard, turn);
        if (nextMovesForCurrent.length > 0) {
          setTurn(turn);
          setPassNotice(
            `${opp === 1 ? '黒（先手）' : '白（後手）'}に置ける場所がないためパスになりました！`
          );
        } else {
          setGameOver(true);
          setPassNotice(null);
          playTone(660, 0.22, 'triangle', 0.12);
        }
      }
    },
    [board, gameOver, lastFlipped, lastMove, passNotice, playTone, turn]
  );

  // CPU Turn effect
  useEffect(() => {
    if (!isCpuTurn) return;
    const timer = window.setTimeout(() => {
      const aiMove = pickBestMove(board, turn, difficulty);
      if (aiMove) {
        executeMove(aiMove);
      }
    }, 520);
    return () => window.clearTimeout(timer);
  }, [board, difficulty, executeMove, isCpuTurn, turn]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (gameOver || isCpuTurn) return;
      const move = legalMap.get(`${r}-${c}`);
      if (move) {
        executeMove(move);
      }
    },
    [executeMove, gameOver, isCpuTurn, legalMap]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    if (mode === 'cpu') {
      // Pop back to player's previous turn
      let targetIdx = history.length - 1;
      while (targetIdx > 0 && history[targetIdx].turn !== humanSide) {
        targetIdx--;
      }
      const snap = history[targetIdx];
      setBoard(snap.board);
      setTurn(snap.turn);
      setLastMove(snap.lastMove);
      setLastFlipped(snap.lastFlipped);
      setPassNotice(snap.passNotice);
      setGameOver(false);
      setHintMove(null);
      setHistory(history.slice(0, targetIdx));
    } else {
      const snap = history[history.length - 1];
      setBoard(snap.board);
      setTurn(snap.turn);
      setLastMove(snap.lastMove);
      setLastFlipped(snap.lastFlipped);
      setPassNotice(snap.passNotice);
      setGameOver(false);
      setHintMove(null);
      setHistory(history.slice(0, -1));
    }
  }, [history, humanSide, mode]);

  const handleHint = useCallback(() => {
    if (gameOver || isCpuTurn) return;
    const best = pickBestMove(board, turn, 'hard');
    setHintMove(best);
    playTone(580, 0.08, 'sine', 0.07);
  }, [board, gameOver, isCpuTurn, playTone, turn]);

  const resetGame = useCallback(
    (newMode = mode, newDifficulty = difficulty, newHumanSide = humanSide) => {
      setMode(newMode);
      setDifficulty(newDifficulty);
      setHumanSide(newHumanSide);
      setBoard(createInitialBoard());
      setTurn(1);
      setLastMove(null);
      setLastFlipped([]);
      setHintMove(null);
      setHistory([]);
      setPassNotice(null);
      setGameOver(false);
      flipAnimsRef.current = [];
    },
    [difficulty, humanSide, mode]
  );

  // Refs synced for Three.js loop & raycasting
  const stateRef = useRef({
    board,
    turn,
    legalMap,
    lastMove,
    lastFlipped,
    hintMove,
    hoveredCell,
    isCpuTurn,
    gameOver,
    handleCellClick,
  });
  stateRef.current = {
    board,
    turn,
    legalMap,
    lastMove,
    lastFlipped,
    hintMove,
    hoveredCell,
    isCpuTurn,
    gameOver,
    handleCellClick,
  };

  // Three.js 3D scene setup
  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#17120f');

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff7e6, 1.35);
    mainLight.position.set(5.5, 11, 6.5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xd8b078, 0.4);
    rimLight.position.set(-7, 6, -6);
    scene.add(rimLight);

    // Wooden Frame & Felt Board
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const woodGeo = new THREE.BoxGeometry(9.0, 0.52, 9.0);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3b2314,
      roughness: 0.42,
      metalness: 0.12,
    });
    const woodMesh = new THREE.Mesh(woodGeo, woodMat);
    woodMesh.position.y = -0.28;
    woodMesh.receiveShadow = true;
    boardGroup.add(woodMesh);

    const feltGeo = new THREE.BoxGeometry(8.08, 0.12, 8.08);
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x0c6b3d,
      roughness: 0.78,
      metalness: 0.04,
    });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.position.y = -0.04;
    feltMesh.receiveShadow = true;
    boardGroup.add(feltMesh);

    // Grid lines & 4 star dots
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x052e16 });
    for (let i = 0; i <= 8; i++) {
      const pos = -4 + i;
      const hLine = new THREE.Mesh(new THREE.BoxGeometry(8.02, 0.02, 0.035), lineMat);
      hLine.position.set(0, 0.025, pos);
      boardGroup.add(hLine);

      const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 8.02), lineMat);
      vLine.position.set(pos, 0.025, 0);
      boardGroup.add(vLine);
    }

    const starCoords: [number, number][] = [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [2, 2],
    ];
    for (const [sx, sz] of starCoords) {
      const starDot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.025, 16),
        lineMat
      );
      starDot.position.set(sx, 0.028, sz);
      boardGroup.add(starDot);
    }

    // Raycast cell tiles, legal indicators, and 3D two-tone discs
    const cellTiles: THREE.Mesh[] = [];
    const legalRings: THREE.Mesh[][] = Array.from({ length: 8 }, () => []);
    const discGroups: THREE.Group[][] = Array.from({ length: 8 }, () => []);
    const lastMarkerMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.19, 24),
      new THREE.MeshBasicMaterial({ color: 0xdfb06d, side: THREE.DoubleSide })
    );
    lastMarkerMesh.rotation.x = -Math.PI / 2;
    lastMarkerMesh.visible = false;
    boardGroup.add(lastMarkerMesh);

    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x14171f,
      roughness: 0.25,
      metalness: 0.22,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.08,
    });

    const halfDiscGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.075, 32);
    const tileGeo = new THREE.PlaneGeometry(0.96, 0.96);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = c - 3.5;
        const z = r - 3.5;

        const tileMat = new THREE.MeshBasicMaterial({
          color: 0xe6c48f,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, 0.03, z);
        tile.userData = { r, c };
        boardGroup.add(tile);
        cellTiles.push(tile);

        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xe6c48f,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.27, 24), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.035, z);
        ring.visible = false;
        boardGroup.add(ring);
        legalRings[r][c] = ring;

        // Two-tone 3D Disc (Top = Black when rotation.x = 0, Bottom = White when rotation.x = PI)
        const dGroup = new THREE.Group();
        dGroup.position.set(x, 0.11, z);
        const topHalf = new THREE.Mesh(halfDiscGeo, blackMat);
        topHalf.position.y = 0.0375;
        topHalf.castShadow = true;
        topHalf.receiveShadow = true;
        const bottomHalf = new THREE.Mesh(halfDiscGeo, whiteMat);
        bottomHalf.position.y = -0.0375;
        bottomHalf.castShadow = true;
        bottomHalf.receiveShadow = true;
        dGroup.add(topHalf);
        dGroup.add(bottomHalf);
        dGroup.visible = false;
        boardGroup.add(dGroup);
        discGroups[r][c] = dGroup;
      }
    }

    // Pointer interaction (orbit + click raycast)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let downX = 0;
    let downY = 0;
    let movedDist = 0;

    const updateHovered = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(cellTiles);
      if (hits.length > 0) {
        const { r, c } = hits[0].object.userData as { r: number; c: number };
        setHoveredCell((prev) => (prev && prev[0] === r && prev[1] === c ? prev : [r, c]));
        return [r, c] as [number, number];
      } else {
        setHoveredCell(null);
        return null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      downX = e.clientX;
      downY = e.clientY;
      movedDist = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        movedDist += Math.hypot(dx, dy);
        downX = e.clientX;
        downY = e.clientY;
        if (movedDist > 6) {
          cameraTargetRef.current.theta -= dx * 0.0075;
          cameraTargetRef.current.phi = Math.max(
            0.08,
            Math.min(1.22, cameraTargetRef.current.phi - dy * 0.0065)
          );
        }
      } else {
        updateHovered(e.clientX, e.clientY);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging && movedDist < 10) {
        const hit = updateHovered(e.clientX, e.clientY);
        if (hit) {
          stateRef.current.handleCellClick(hit[0], hit[1]);
        }
      }
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    let rafId = 0;
    const animate = (now: number) => {
      // Smooth camera interpolation
      const tgt = cameraTargetRef.current;
      const cur = cameraCurrentRef.current;
      cur.theta += (tgt.theta - cur.theta) * 0.14;
      cur.phi += (tgt.phi - cur.phi) * 0.14;
      cur.radius += (tgt.radius - cur.radius) * 0.14;

      camera.position.set(
        cur.radius * Math.sin(cur.phi) * Math.sin(cur.theta),
        cur.radius * Math.cos(cur.phi),
        cur.radius * Math.sin(cur.phi) * Math.cos(cur.theta)
      );
      camera.lookAt(0, 0, 0);

      const st = stateRef.current;
      const anims = flipAnimsRef.current;

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cellVal = st.board[r][c];
          const disc = discGroups[r][c];
          const ring = legalRings[r][c];
          const tile = cellTiles[r * 8 + c];
          const tileMat = tile.material as THREE.MeshBasicMaterial;
          const ringMat = ring.material as THREE.MeshBasicMaterial;

          const key = `${r}-${c}`;
          const legal = !st.gameOver && !st.isCpuTurn ? st.legalMap.get(key) : undefined;
          const isHint = st.hintMove?.r === r && st.hintMove?.c === c;
          const isHovered = st.hoveredCell?.[0] === r && st.hoveredCell?.[1] === c;

          if (legal) {
            ring.visible = true;
            const pulse = 0.88 + Math.sin(now * 0.006) * 0.14;
            ring.scale.set(pulse, pulse, 1);
            ringMat.color.setHex(isHint ? 0xf3d9a3 : 0xe6c48f);
            tileMat.color.setHex(isHint ? 0xf3d9a3 : 0xe6c48f);
            tileMat.opacity = isHovered ? 0.3 : isHint ? 0.24 : 0.08;
          } else {
            ring.visible = false;
            tileMat.opacity = 0;
          }

          if (cellVal === 0) {
            disc.visible = false;
          } else {
            disc.visible = true;
            const anim = anims.find((a) => a.r === r && a.c === c);
            const targetRot = cellVal === 1 ? 0 : Math.PI;
            if (anim) {
              const elapsed = now - anim.startTime - anim.delay;
              const dur = 380;
              if (elapsed <= 0) {
                disc.rotation.z = anim.from === 1 ? 0 : Math.PI;
                disc.position.y = 0.11;
              } else if (elapsed < dur) {
                const t = elapsed / dur;
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                const startRot = anim.from === 1 ? 0 : Math.PI;
                const endRot = anim.to === 1 ? Math.PI * 2 : Math.PI;
                disc.rotation.z = startRot + (endRot - startRot) * ease;
                disc.position.y = 0.11 + Math.sin(t * Math.PI) * 0.45;
              } else {
                disc.rotation.z = targetRot;
                disc.position.y = 0.11;
              }
            } else {
              disc.rotation.z = targetRot;
              disc.position.y = 0.11;
            }
          }
        }
      }

      if (st.lastMove) {
        const [lr, lc] = st.lastMove;
        lastMarkerMesh.visible = true;
        lastMarkerMesh.position.set(lc - 3.5, 0.21, lr - 3.5);
      } else {
        lastMarkerMesh.visible = false;
      }

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, [viewMode]);

  const hoveredMove = useMemo(() => {
    if (!hoveredCell) return null;
    return legalMap.get(`${hoveredCell[0]}-${hoveredCell[1]}`) ?? null;
  }, [hoveredCell, legalMap]);

  const hoveredFlipSet = useMemo(() => {
    const s = new Set<string>();
    if (hoveredMove) {
      for (const [fr, fc] of hoveredMove.flips) {
        s.add(`${fr}-${fc}`);
      }
    }
    return s;
  }, [hoveredMove]);

  const winnerText = useMemo(() => {
    if (!gameOver) return null;
    if (counts.black > counts.white) {
      return `黒（先手）の勝利！ (${counts.black} 対 ${counts.white})`;
    }
    if (counts.white > counts.black) {
      return `白（後手）の勝利！ (${counts.white} 対 ${counts.black})`;
    }
    return `引き分け！ (${counts.black} 対 ${counts.white})`;
  }, [counts.black, counts.white, gameOver]);

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
              <p className="tabletop-kicker truncate">Classic Board · 8×8 Reversi</p>
              <h2 className="tabletop-title truncate text-base sm:text-xl">
                リバーシ
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
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              aria-pressed={soundOn}
              className={`tabletop-chip inline-flex min-h-11 items-center px-3 text-xs font-semibold ${
                soundOn ? 'tabletop-chip-active' : ''
              }`}
            >
              {soundOn ? '効果音 ON' : '効果音 OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-2 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Score + Board */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* Score & Territory */}
          <section className="tabletop-panel p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="tabletop-stat flex min-w-0 items-center gap-2.5 px-2.5 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#7d7468] bg-gradient-to-br from-[#45413a] to-[#0d0c0a] text-[10px] font-black text-[#f4ead8]">
                  ●
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#d8cbb8]">
                    黒（先手）{mode === 'cpu' ? (humanSide === 1 ? '・あなた' : '・CPU') : '・P1'}
                  </p>
                  <p className="font-mono text-lg font-bold leading-tight text-[#f4ead8]">
                    {counts.black}
                    <span className="ml-1 text-[11px] font-normal text-[#b9a88f]">枚</span>
                  </p>
                </div>
              </div>

              <div className="order-last w-full sm:order-none sm:w-auto">
                <div
                  className={`mx-auto w-fit rounded-md border px-3 py-1.5 text-center text-xs font-semibold ${
                    gameOver
                      ? 'border-[#8a5b36] bg-[#2c2118] text-[#e6c48f]'
                      : isCpuTurn
                        ? 'border-[#8a6a3f] bg-[#2a211a] text-[#dfb06d]'
                        : 'border-[#4f6b57] bg-[#223129] text-[#d6e5d8]'
                  }`}
                >
                  {gameOver ? (
                    winnerText
                  ) : isCpuTurn ? (
                    <>CPU 思考中（{turn === 1 ? '黒' : '白'}番）</>
                  ) : (
                    <>
                      手番: {turn === 1 ? '● 黒（先手）' : '○ 白（後手）'}
                      <span className="ml-1.5 font-normal text-[#b9c9bd]">
                        合法手 {legalMoves.length}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="tabletop-stat flex min-w-0 items-center gap-2.5 px-2.5 py-2">
                <div className="min-w-0 text-right">
                  <p className="truncate text-[11px] font-semibold text-[#d8cbb8]">
                    白（後手）{mode === 'cpu' ? (humanSide === 2 ? '・あなた' : '・CPU') : '・P2'}
                  </p>
                  <p className="font-mono text-lg font-bold leading-tight text-[#f4ead8]">
                    {counts.white}
                    <span className="ml-1 text-[11px] font-normal text-[#b9a88f]">枚</span>
                  </p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e5dccb] bg-gradient-to-br from-[#fffaf0] to-[#d8c8ad] text-[10px] font-black text-[#2a241d]">
                  ○
                </span>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#b9a88f]">
                <span>黒 {blackRatio}%</span>
                <span>空きマス {counts.empty}</span>
                <span>白 {100 - blackRatio}%</span>
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full border border-[#5a4a37] bg-[#e9ddc8]">
                <div
                  className="bg-[#1b1712] transition-all duration-300"
                  style={{ width: `${blackRatio}%` }}
                />
              </div>
            </div>

            {passNotice && (
              <div className="mt-2 rounded-md border border-[#8a6a3f] bg-[#2a211a] px-3 py-2 text-center text-xs font-medium text-[#e6c48f]">
                {passNotice}
              </div>
            )}
          </section>

          {/* 3D or 2D Board */}
          {viewMode === '3d' ? (
            <div className="tabletop-board-frame relative overflow-hidden">
              <div
                ref={mountRef}
                className="aspect-square w-full max-h-[600px] cursor-grab touch-none active:cursor-grabbing"
                aria-label="リバーシ 3Dボード"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-2 sm:p-3">
                <span className="tabletop-panel-soft hidden px-2.5 py-1.5 text-[11px] font-medium text-[#b9a88f] sm:inline-flex">
                  ドラッグで視点回転 / マスをタップ
                </span>
                <div className="pointer-events-auto flex flex-wrap gap-1">
                  {(
                    [
                      ['angled', '斜め俯瞰'],
                      ['top', '真上'],
                      ['low', 'ローアングル'],
                    ] as const
                  ).map(([presetKey, label]) => (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => applyCameraPreset(presetKey)}
                      aria-pressed={cameraPreset === presetKey}
                      className={`inline-flex min-h-11 items-center rounded-md border px-2.5 text-[11px] font-semibold transition ${
                        cameraPreset === presetKey
                          ? 'border-[#c99555] bg-[#3a2a1c] text-[#dfb06d]'
                          : 'border-[#4d3d2d] bg-[#17120f]/95 text-[#b9a88f] hover:border-[#6b543d] hover:text-[#f4ead8]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {hoveredMove && (
                <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-[#4d3d2d] bg-[#17120f]/95 px-3 py-1.5 text-[11px] font-medium text-[#d8cbb8] sm:bottom-3 sm:left-3">
                  座標 {COL_LABELS[hoveredMove.c]}
                  {ROW_LABELS[hoveredMove.r]}：{' '}
                  <span className="font-mono text-[#e6c48f]">{hoveredMove.flips.length}枚</span>{' '}
                  反転
                </div>
              )}
            </div>
          ) : (
            <div className="tabletop-board-frame mx-auto w-full max-w-[560px] p-1 sm:p-3">
              <div className="mb-1 grid grid-cols-8 text-center font-mono text-[11px] font-bold text-[#d8c6a5] sm:pl-5">
                {COL_LABELS.map((lbl) => (
                  <span key={lbl}>{lbl}</span>
                ))}
              </div>
              <div className="flex">
                <div className="mr-1.5 hidden flex-col justify-around font-mono text-[11px] font-bold text-[#d8c6a5] sm:flex">
                  {ROW_LABELS.map((lbl) => (
                    <span key={lbl}>{lbl}</span>
                  ))}
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-8 gap-px rounded-sm border border-[#1b0f07] bg-[#06381e] p-0.5 sm:gap-1 sm:p-1.5">
                  {board.map((row, r) =>
                    row.map((cell, c) => {
                      const key = `${r}-${c}`;
                      const legal = !gameOver && !isCpuTurn ? legalMap.get(key) : undefined;
                      const isLast = lastMove?.[0] === r && lastMove?.[1] === c;
                      const isHint = hintMove?.r === r && hintMove?.c === c;
                      const willFlip = hoveredFlipSet.has(key);

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleCellClick(r, c)}
                          onMouseEnter={() => setHoveredCell([r, c])}
                          onMouseLeave={() => setHoveredCell(null)}
                          disabled={!legal}
                          aria-label={`マス ${COL_LABELS[c]}${ROW_LABELS[r]}`}
                          className={`relative flex min-w-0 aspect-square items-center justify-center rounded-[3px] transition sm:rounded-md ${
                            legal
                              ? isHint
                                ? 'bg-[#c99555]/35 ring-1 ring-[#e0bb82]'
                                : 'bg-[#0d6e3d] hover:bg-[#12814a]'
                              : 'bg-[#0b5c33]'
                          }`}
                        >
                          {cell !== 0 && (
                            <span
                              className={`flex h-[82%] w-[82%] items-center justify-center rounded-full shadow-sm transition-transform duration-300 ${
                                cell === 1
                                  ? 'border border-[#5a554d] bg-gradient-to-br from-[#45413a] via-[#201d19] to-[#080706]'
                                  : 'border border-[#e5dccb] bg-gradient-to-br from-[#fffaf0] via-[#f0e6d5] to-[#cfc0a6]'
                              } ${willFlip ? 'scale-95 ring-2 ring-[#e6c48f]' : ''}`}
                            >
                              {isLast && (
                                <span className="h-2 w-2 rounded-full bg-[#dfb06d] sm:h-2.5 sm:w-2.5" />
                              )}
                            </span>
                          )}
                          {cell === 0 && legal && (
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold sm:h-6 sm:w-6 sm:text-[11px] ${
                                isHint
                                  ? 'bg-[#dfb06d] text-[#1b120b]'
                                  : 'border border-[#dfb06d]/70 bg-[#2f5d4e] text-[#f4ead8]'
                              }`}
                            >
                              {showMoveCount ? `+${legal.flips.length}` : '•'}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <aside className="flex min-w-0 flex-col gap-3">
          {/* Actions */}
          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Match Actions</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0 || isCpuTurn}
                className="tabletop-button inline-flex min-h-11 items-center justify-center px-2 text-xs disabled:cursor-not-allowed disabled:opacity-45"
              >
                待った
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={gameOver || isCpuTurn || legalMoves.length === 0}
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
            {hintMove && (
              <p className="tabletop-panel-soft mt-2 px-2.5 py-1.5 text-xs font-medium text-[#e6c48f]">
                AI推奨手: 座標{' '}
                <span className="font-mono">
                  {COL_LABELS[hintMove.c]}
                  {ROW_LABELS[hintMove.r]}
                </span>
                （{hintMove.flips.length}枚反転）
              </p>
            )}
          </div>

          {/* Mode & Difficulty */}
          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Game Mode / 対戦設定</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => resetGame('cpu', difficulty, humanSide)}
                aria-pressed={mode === 'cpu'}
                className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                  mode === 'cpu' ? 'tabletop-chip-active' : ''
                }`}
              >
                CPU対戦
              </button>
              <button
                type="button"
                onClick={() => resetGame('pvp', difficulty, humanSide)}
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
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
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
                      onClick={() => resetGame('cpu', lv, humanSide)}
                      aria-pressed={difficulty === lv}
                      className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-1.5 text-xs font-semibold ${
                        difficulty === lv ? 'tabletop-chip-active' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">あなたの手番</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 1)}
                    aria-pressed={humanSide === 1}
                    className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                      humanSide === 1 ? 'tabletop-chip-active' : ''
                    }`}
                  >
                    ● 黒（先手）
                  </button>
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 2)}
                    aria-pressed={humanSide === 2}
                    className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                      humanSide === 2 ? 'tabletop-chip-active' : ''
                    }`}
                  >
                    ○ 白（後手）
                  </button>
                </div>
              </>
            )}

            <div className="mt-3 flex min-h-11 items-center justify-between border-t border-[#4d3d2d] pt-2.5">
              <span className="text-xs font-medium text-[#d8cbb8]">反転枚数のガイド</span>
              <button
                type="button"
                onClick={() => setShowMoveCount((v) => !v)}
                aria-pressed={showMoveCount}
                className={`tabletop-chip inline-flex min-h-11 items-center px-3 text-xs font-semibold ${
                  showMoveCount ? 'tabletop-chip-active' : ''
                }`}
              >
                {showMoveCount ? '表示 ON' : '表示 OFF'}
              </button>
            </div>
          </div>

          {/* Strategy */}
          <div className="tabletop-panel-soft p-3.5 text-xs leading-relaxed">
            <p className="tabletop-kicker">Reversi Strategy</p>
            <ul className="mt-2 space-y-2 text-[11px] text-[#b9a88f]">
              <li>
                <strong className="font-semibold text-[#dfb06d]">1. 四隅（角）の確保：</strong>
                角（A1, H1, A8, H8）の石は絶対に反転されない確定石になります。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">2. 序盤は取りすぎない：</strong>
                序盤に多く裏返すと相手の着手可能数が増え、不利になりやすくなります。
              </li>
              <li>
                <strong className="font-semibold text-[#dfb06d]">3. 角の隣に注意：</strong>
                空いている角の斜め内側（B2, G2, B7, G7）に打つと相手に角を取られやすくなります。
              </li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
