'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

type Cell = 0 | 1 | 2; // 0: Empty, 1: Amber Gold (先手), 2: Cyan Sapphire (後手)
type GameMode = 'cpu' | 'pvp';
type Difficulty = 'easy' | 'normal' | 'hard';
type CameraPreset = 'front' | 'angled' | 'top' | 'auto';

interface Coord3D {
  x: number; // col 0..3
  y: number; // level 0..3 (0 = bottom 1段目, 3 = top 4段目)
  z: number; // row 0..3
}

interface DropAnimation {
  x: number;
  y: number;
  z: number;
  startTime: number;
}

interface Snapshot {
  grid: Cell[][][];
  turn: 1 | 2;
  lastPlaced: Coord3D | null;
}

// Generate all 76 winning lines in a 4x4x4 cube
function buildWinningLines(): Coord3D[][] {
  const lines: Coord3D[][] = [];

  // 1. X-axis lines (16)
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      lines.push([
        { x: 0, y, z },
        { x: 1, y, z },
        { x: 2, y, z },
        { x: 3, y, z },
      ]);
    }
  }

  // 2. Z-axis lines (16)
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      lines.push([
        { x, y, z: 0 },
        { x, y, z: 1 },
        { x, y, z: 2 },
        { x, y, z: 3 },
      ]);
    }
  }

  // 3. Y-axis vertical lines (16)
  for (let z = 0; z < 4; z++) {
    for (let x = 0; x < 4; x++) {
      lines.push([
        { x, y: 0, z },
        { x, y: 1, z },
        { x, y: 2, z },
        { x, y: 3, z },
      ]);
    }
  }

  // 4. Horizontal plane diagonals XZ (8)
  for (let y = 0; y < 4; y++) {
    lines.push([
      { x: 0, y, z: 0 },
      { x: 1, y, z: 1 },
      { x: 2, y, z: 2 },
      { x: 3, y, z: 3 },
    ]);
    lines.push([
      { x: 3, y, z: 0 },
      { x: 2, y, z: 1 },
      { x: 1, y, z: 2 },
      { x: 0, y, z: 3 },
    ]);
  }

  // 5. Vertical plane diagonals XY (8)
  for (let z = 0; z < 4; z++) {
    lines.push([
      { x: 0, y: 0, z },
      { x: 1, y: 1, z },
      { x: 2, y: 2, z },
      { x: 3, y: 3, z },
    ]);
    lines.push([
      { x: 3, y: 0, z },
      { x: 2, y: 1, z },
      { x: 1, y: 2, z },
      { x: 0, y: 3, z },
    ]);
  }

  // 6. Vertical plane diagonals ZY (8)
  for (let x = 0; x < 4; x++) {
    lines.push([
      { x, y: 0, z: 0 },
      { x, y: 1, z: 1 },
      { x, y: 2, z: 2 },
      { x, y: 3, z: 3 },
    ]);
    lines.push([
      { x, y: 0, z: 3 },
      { x, y: 1, z: 2 },
      { x, y: 2, z: 1 },
      { x, y: 3, z: 0 },
    ]);
  }

  // 7. 3D Space Diagonals (4)
  lines.push([
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 1, z: 1 },
    { x: 2, y: 2, z: 2 },
    { x: 3, y: 3, z: 3 },
  ]);
  lines.push([
    { x: 3, y: 0, z: 0 },
    { x: 2, y: 1, z: 1 },
    { x: 1, y: 2, z: 2 },
    { x: 0, y: 3, z: 3 },
  ]);
  lines.push([
    { x: 0, y: 0, z: 3 },
    { x: 1, y: 1, z: 2 },
    { x: 2, y: 2, z: 1 },
    { x: 3, y: 3, z: 0 },
  ]);
  lines.push([
    { x: 3, y: 0, z: 3 },
    { x: 2, y: 1, z: 2 },
    { x: 1, y: 2, z: 1 },
    { x: 0, y: 3, z: 0 },
  ]);

  return lines;
}

const WINNING_LINES = buildWinningLines(); // 76 lines total
const COL_LABELS = ['A', 'B', 'C', 'D'];

function createEmptyGrid(): Cell[][][] {
  // grid[y][z][x]
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => Array<Cell>(4).fill(0))
  );
}

function cloneGrid(grid: Cell[][][]): Cell[][][] {
  return grid.map((layer) => layer.map((row) => [...row]));
}

function getDropLevel(grid: Cell[][][], x: number, z: number): number {
  for (let y = 0; y < 4; y++) {
    if (grid[y][z][x] === 0) return y;
  }
  return -1;
}

function getValidPegMoves(grid: Cell[][][]): Coord3D[] {
  const moves: Coord3D[] = [];
  for (let z = 0; z < 4; z++) {
    for (let x = 0; x < 4; x++) {
      const y = getDropLevel(grid, x, z);
      if (y !== -1) {
        moves.push({ x, y, z });
      }
    }
  }
  return moves;
}

function checkWinner(grid: Cell[][][]): { winner: 1 | 2; line: Coord3D[] } | null {
  for (const line of WINNING_LINES) {
    const first = grid[line[0].y][line[0].z][line[0].x];
    if (
      first !== 0 &&
      grid[line[1].y][line[1].z][line[1].x] === first &&
      grid[line[2].y][line[2].z][line[2].x] === first &&
      grid[line[3].y][line[3].z][line[3].x] === first
    ) {
      return { winner: first, line };
    }
  }
  return null;
}

interface ThreatInfo {
  player: 1 | 2;
  openSpot: Coord3D;
  playableNow: boolean;
}

function detectThreats(grid: Cell[][][]): ThreatInfo[] {
  const threats: ThreatInfo[] = [];
  for (const line of WINNING_LINES) {
    let p1 = 0;
    let p2 = 0;
    let open: Coord3D | null = null;
    for (const c of line) {
      const v = grid[c.y][c.z][c.x];
      if (v === 1) p1++;
      else if (v === 2) p2++;
      else open = c;
    }
    if (p1 === 3 && p2 === 0 && open) {
      const dropY = getDropLevel(grid, open.x, open.z);
      threats.push({ player: 1, openSpot: open, playableNow: dropY === open.y });
    } else if (p2 === 3 && p1 === 0 && open) {
      const dropY = getDropLevel(grid, open.x, open.z);
      threats.push({ player: 2, openSpot: open, playableNow: dropY === open.y });
    }
  }
  return threats;
}

function evaluateQubic(grid: Cell[][][], aiPlayer: 1 | 2): number {
  const opp: 1 | 2 = aiPlayer === 1 ? 2 : 1;
  let score = 0;

  for (const line of WINNING_LINES) {
    let myCount = 0;
    let oppCount = 0;
    for (const c of line) {
      const v = grid[c.y][c.z][c.x];
      if (v === aiPlayer) myCount++;
      else if (v === opp) oppCount++;
    }
    if (myCount > 0 && oppCount > 0) continue; // blocked line

    if (myCount === 4) return 100000;
    if (oppCount === 4) return -100000;

    if (myCount === 3) score += 260;
    else if (myCount === 2) score += 28;
    else if (myCount === 1) score += 4;

    if (oppCount === 3) score -= 300;
    else if (oppCount === 2) score -= 32;
    else if (oppCount === 1) score -= 4;
  }

  // Center 8 inner cube coordinates bonus
  for (let y = 1; y <= 2; y++) {
    for (let z = 1; z <= 2; z++) {
      for (let x = 1; x <= 2; x++) {
        if (grid[y][z][x] === aiPlayer) score += 10;
        else if (grid[y][z][x] === opp) score -= 10;
      }
    }
  }

  return score;
}

function minimaxQubic(
  grid: Cell[][][],
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: 1 | 2,
  aiPlayer: 1 | 2
): number {
  const win = checkWinner(grid);
  if (win) {
    return win.winner === aiPlayer ? 100000 + depth * 100 : -100000 - depth * 100;
  }
  const moves = getValidPegMoves(grid);
  if (moves.length === 0 || depth === 0) {
    return evaluateQubic(grid, aiPlayer);
  }

  const opp: 1 | 2 = currentPlayer === 1 ? 2 : 1;

  if (currentPlayer === aiPlayer) {
    let best = -Infinity;
    for (const m of moves) {
      grid[m.y][m.z][m.x] = currentPlayer;
      const val = minimaxQubic(grid, depth - 1, alpha, beta, opp, aiPlayer);
      grid[m.y][m.z][m.x] = 0;
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      grid[m.y][m.z][m.x] = currentPlayer;
      const val = minimaxQubic(grid, depth - 1, alpha, beta, opp, aiPlayer);
      grid[m.y][m.z][m.x] = 0;
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function chooseQubicMove(
  grid: Cell[][][],
  player: 1 | 2,
  difficulty: Difficulty
): Coord3D | null {
  const moves = getValidPegMoves(grid);
  if (moves.length === 0) return null;
  const opp: 1 | 2 = player === 1 ? 2 : 1;

  // Immediate win check
  for (const m of moves) {
    const next = cloneGrid(grid);
    next[m.y][m.z][m.x] = player;
    if (checkWinner(next)) return m;
  }

  // Immediate block check (Normal and Hard always block)
  if (difficulty !== 'easy') {
    for (const m of moves) {
      const next = cloneGrid(grid);
      next[m.y][m.z][m.x] = opp;
      if (checkWinner(next)) return m;
    }
  }

  if (difficulty === 'easy') {
    // Easy: 50% block or heuristic, 50% random
    if (Math.random() < 0.45) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }

  if (difficulty === 'easy' || difficulty === 'normal') {
    let bestMove = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const next = cloneGrid(grid);
      next[m.y][m.z][m.x] = player;
      // Check if dropping here gives opponent an immediate winning spot right above (y+1)
      let givesOppWinAbove = false;
      if (m.y + 1 < 4) {
        next[m.y + 1][m.z][m.x] = opp;
        if (checkWinner(next)) givesOppWinAbove = true;
        next[m.y + 1][m.z][m.x] = 0;
      }
      const val =
        evaluateQubic(next, player) -
        (givesOppWinAbove ? 2000 : 0) +
        (Math.random() - 0.5) * 12;
      if (val > bestScore) {
        bestScore = val;
        bestMove = m;
      }
    }
    return bestMove;
  }

  // Hard: 3-ply Alpha-Beta search
  let bestMove = moves[0];
  let bestVal = -Infinity;
  const work = cloneGrid(grid);

  // Order center pegs first
  const ordered = [...moves].sort((a, b) => {
    const da = Math.abs(a.x - 1.5) + Math.abs(a.z - 1.5);
    const db = Math.abs(b.x - 1.5) + Math.abs(b.z - 1.5);
    return da - db;
  });

  for (const m of ordered) {
    work[m.y][m.z][m.x] = player;
    const val = minimaxQubic(work, 3, -Infinity, Infinity, opp, player);
    work[m.y][m.z][m.x] = 0;
    if (val > bestVal) {
      bestVal = val;
      bestMove = m;
    }
  }
  return bestMove;
}

export default function QubicFourGame() {
  const [grid, setGrid] = useState<Cell[][][]>(() => createEmptyGrid());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [mode, setMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [humanSide, setHumanSide] = useState<1 | 2>(1);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('angled');
  const [soundOn, setSoundOn] = useState(true);
  const [lastPlaced, setLastPlaced] = useState<Coord3D | null>(null);
  const [hoveredPeg, setHoveredPeg] = useState<[number, number] | null>(null);
  const [hintCoord, setHintCoord] = useState<Coord3D | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dropAnimRef = useRef<DropAnimation | null>(null);
  const camSphericalRef = useRef({ theta: 0.62, phi: 0.96, radius: 11.6 });
  const camTargetSphericalRef = useRef({ theta: 0.62, phi: 0.96, radius: 11.6 });
  const autoRotateRef = useRef(false);

  const playSound = useCallback(
    (freq: number, dur = 0.09, type: OscillatorType = 'triangle', gainVal = 0.09) => {
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
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(gainVal, ctx.currentTime);
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

  const winResult = useMemo(() => checkWinner(grid), [grid]);
  const validMoves = useMemo(() => getValidPegMoves(grid), [grid]);
  const isDraw = !winResult && validMoves.length === 0;
  const gameOver = Boolean(winResult) || isDraw;
  const isCpuTurn = mode === 'cpu' && turn !== humanSide && !gameOver;

  const threats = useMemo(() => detectThreats(grid), [grid]);
  const totalSpheres = useMemo(() => {
    let p1 = 0;
    let p2 = 0;
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        for (let x = 0; x < 4; x++) {
          if (grid[y][z][x] === 1) p1++;
          else if (grid[y][z][x] === 2) p2++;
        }
      }
    }
    return { p1, p2 };
  }, [grid]);

  const selectCameraPreset = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset);
    autoRotateRef.current = preset === 'auto';
    if (preset === 'front') {
      camTargetSphericalRef.current = { theta: 0, phi: 1.18, radius: 11.6 };
    } else if (preset === 'angled') {
      camTargetSphericalRef.current = { theta: 0.62, phi: 0.96, radius: 11.6 };
    } else if (preset === 'top') {
      camTargetSphericalRef.current = { theta: 0, phi: 0.14, radius: 12.2 };
    } else {
      camTargetSphericalRef.current = { theta: camSphericalRef.current.theta, phi: 0.98, radius: 11.8 };
    }
  }, []);

  const dropSphereOnPeg = useCallback(
    (x: number, z: number) => {
      if (gameOver) return;
      const y = getDropLevel(grid, x, z);
      if (y === -1) return;

      setHistory((prev) => [
        ...prev,
        {
          grid: cloneGrid(grid),
          turn,
          lastPlaced,
        },
      ]);
      setHintCoord(null);

      const nextGrid = cloneGrid(grid);
      nextGrid[y][z][x] = turn;
      dropAnimRef.current = { x, y, z, startTime: performance.now() };

      setGrid(nextGrid);
      setLastPlaced({ x, y, z });
      playSound(turn === 1 ? 390 + y * 55 : 480 + y * 55, 0.1, 'triangle', 0.1);

      const w = checkWinner(nextGrid);
      if (w) {
        window.setTimeout(() => playSound(740, 0.28, 'sine', 0.14), 120);
      } else {
        setTurn(turn === 1 ? 2 : 1);
      }
    },
    [gameOver, grid, lastPlaced, playSound, turn]
  );

  // CPU Turn
  useEffect(() => {
    if (!isCpuTurn) return;
    const timer = window.setTimeout(() => {
      const aiMove = chooseQubicMove(grid, turn, difficulty);
      if (aiMove) {
        dropSphereOnPeg(aiMove.x, aiMove.z);
      }
    }, 540);
    return () => window.clearTimeout(timer);
  }, [difficulty, dropSphereOnPeg, grid, isCpuTurn, turn]);

  const handlePegClick = useCallback(
    (x: number, z: number) => {
      if (gameOver || isCpuTurn) return;
      dropSphereOnPeg(x, z);
    },
    [dropSphereOnPeg, gameOver, isCpuTurn]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    if (mode === 'cpu') {
      let idx = history.length - 1;
      while (idx > 0 && history[idx].turn !== humanSide) {
        idx--;
      }
      const snap = history[idx];
      setGrid(snap.grid);
      setTurn(snap.turn);
      setLastPlaced(snap.lastPlaced);
      setHintCoord(null);
      setHistory(history.slice(0, idx));
    } else {
      const snap = history[history.length - 1];
      setGrid(snap.grid);
      setTurn(snap.turn);
      setLastPlaced(snap.lastPlaced);
      setHintCoord(null);
      setHistory(history.slice(0, -1));
    }
  }, [history, humanSide, mode]);

  const handleHint = useCallback(() => {
    if (gameOver || isCpuTurn) return;
    const best = chooseQubicMove(grid, turn, 'hard');
    setHintCoord(best);
    playSound(620, 0.08, 'sine', 0.08);
  }, [gameOver, grid, isCpuTurn, playSound, turn]);

  const resetGame = useCallback(
    (newMode = mode, newDifficulty = difficulty, newHumanSide = humanSide) => {
      setMode(newMode);
      setDifficulty(newDifficulty);
      setHumanSide(newHumanSide);
      setGrid(createEmptyGrid());
      setTurn(1);
      setLastPlaced(null);
      setHintCoord(null);
      setHistory([]);
      dropAnimRef.current = null;
    },
    [difficulty, humanSide, mode]
  );

  const stateRef = useRef({
    grid,
    turn,
    winResult,
    lastPlaced,
    hoveredPeg,
    hintCoord,
    gameOver,
    isCpuTurn,
    handlePegClick,
  });
  stateRef.current = {
    grid,
    turn,
    winResult,
    lastPlaced,
    hoveredPeg,
    hintCoord,
    gameOver,
    isCpuTurn,
    handlePegClick,
  };

  // Three.js 4x4x4 Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#17120f');

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dirLight1 = new THREE.DirectionalLight(0xfffbeb, 1.45);
    dirLight1.position.set(7, 13, 8);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd8b078, 0.5);
    dirLight2.position.set(-8, 9, -7);
    scene.add(dirLight2);

    const worldGroup = new THREE.Group();
    worldGroup.position.y = -1.35;
    scene.add(worldGroup);

    // Wooden Base Platform
    const baseGeo = new THREE.BoxGeometry(7.2, 0.45, 7.2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x2c1b10,
      roughness: 0.48,
      metalness: 0.15,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.25;
    baseMesh.receiveShadow = true;
    worldGroup.add(baseMesh);

    const innerPlateGeo = new THREE.BoxGeometry(6.5, 0.08, 6.5);
    const innerPlateMat = new THREE.MeshStandardMaterial({
      color: 0x1f1712,
      roughness: 0.55,
      metalness: 0.25,
    });
    const innerPlate = new THREE.Mesh(innerPlateGeo, innerPlateMat);
    innerPlate.position.y = 0.01;
    innerPlate.receiveShadow = true;
    worldGroup.add(innerPlate);

    // 16 Vertical Pegs + Hit Cylinders + Ghost Preview Spheres + 64 Sphere Slots
    const pegSpacing = 1.55;
    const levelSpacing = 0.88;
    const baseLevelY = 0.48;

    const hitTargets: THREE.Mesh[] = [];
    const pegMeshes: THREE.Mesh[][] = Array.from({ length: 4 }, () => []);
    const previewSpheres: THREE.Mesh[][] = Array.from({ length: 4 }, () => []);
    const sphereMeshes: THREE.Mesh[][][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => [])
    );

    const pegGeo = new THREE.CylinderGeometry(0.085, 0.085, 3.65, 20);
    const hitGeo = new THREE.CylinderGeometry(0.54, 0.54, 4.0, 16);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const sphereGeo = new THREE.SphereGeometry(0.41, 28, 28);

    const p1Mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.28,
      emissive: 0x78350f,
      emissiveIntensity: 0.2,
    });
    const p2Mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.25,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.22,
    });
    const winP1Mat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      roughness: 0.15,
      metalness: 0.35,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.75,
    });
    const winP2Mat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.15,
      metalness: 0.35,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
    });

    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        const wx = (x - 1.5) * pegSpacing;
        const wz = (z - 1.5) * pegSpacing;

        const pegMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.32,
          metalness: 0.65,
        });
        const peg = new THREE.Mesh(pegGeo, pegMat);
        peg.position.set(wx, 1.82, wz);
        peg.castShadow = true;
        peg.receiveShadow = true;
        worldGroup.add(peg);
        pegMeshes[z][x] = peg;

        const hitCyl = new THREE.Mesh(hitGeo, hitMat);
        hitCyl.position.set(wx, 1.9, wz);
        hitCyl.userData = { x, z };
        worldGroup.add(hitCyl);
        hitTargets.push(hitCyl);

        const ghostMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.42,
        });
        const ghost = new THREE.Mesh(sphereGeo, ghostMat);
        ghost.visible = false;
        worldGroup.add(ghost);
        previewSpheres[z][x] = ghost;

        for (let y = 0; y < 4; y++) {
          const sp = new THREE.Mesh(sphereGeo, p1Mat);
          sp.position.set(wx, baseLevelY + y * levelSpacing, wz);
          sp.castShadow = true;
          sp.receiveShadow = true;
          sp.visible = false;
          worldGroup.add(sp);
          sphereMeshes[y][z][x] = sp;
        }
      }
    }

    // Winning 4-in-a-row 3D glowing laser tube
    const winLineMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.9,
    });
    const winLineMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 16), winLineMat);
    winLineMesh.visible = false;
    worldGroup.add(winLineMesh);

    // Raycast & Pointer Orbit
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let dragDist = 0;

    const pickPeg = (clientX: number, clientY: number): [number, number] | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitTargets);
      if (hits.length > 0) {
        const { x, z } = hits[0].object.userData as { x: number; z: number };
        setHoveredPeg((prev) => (prev && prev[0] === x && prev[1] === z ? prev : [x, z]));
        return [x, z];
      }
      setHoveredPeg(null);
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      dragDist = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        dragDist += Math.hypot(dx, dy);
        startX = e.clientX;
        startY = e.clientY;
        if (dragDist > 6) {
          autoRotateRef.current = false;
          camTargetSphericalRef.current.theta -= dx * 0.008;
          camTargetSphericalRef.current.phi = Math.max(
            0.12,
            Math.min(1.38, camTargetSphericalRef.current.phi - dy * 0.007)
          );
        }
      } else {
        pickPeg(e.clientX, e.clientY);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging && dragDist < 10) {
        const hit = pickPeg(e.clientX, e.clientY);
        if (hit) {
          stateRef.current.handlePegClick(hit[0], hit[1]);
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
      if (autoRotateRef.current) {
        camTargetSphericalRef.current.theta += 0.0045;
      }
      const tgt = camTargetSphericalRef.current;
      const cur = camSphericalRef.current;
      cur.theta += (tgt.theta - cur.theta) * 0.14;
      cur.phi += (tgt.phi - cur.phi) * 0.14;
      cur.radius += (tgt.radius - cur.radius) * 0.14;

      camera.position.set(
        cur.radius * Math.sin(cur.phi) * Math.sin(cur.theta),
        cur.radius * Math.cos(cur.phi),
        cur.radius * Math.sin(cur.phi) * Math.cos(cur.theta)
      );
      camera.lookAt(0, 0.35, 0);

      const st = stateRef.current;
      const winSet = new Set<string>();
      if (st.winResult) {
        for (const c of st.winResult.line) {
          winSet.add(`${c.x}-${c.y}-${c.z}`);
        }
      }

      const dropAnim = dropAnimRef.current;

      for (let z = 0; z < 4; z++) {
        for (let x = 0; x < 4; x++) {
          const wx = (x - 1.5) * pegSpacing;
          const wz = (z - 1.5) * pegSpacing;
          const isHovered = st.hoveredPeg?.[0] === x && st.hoveredPeg?.[1] === z;
          const isHintPeg = st.hintCoord?.x === x && st.hintCoord?.z === z;
          const pegMat = pegMeshes[z][x].material as THREE.MeshStandardMaterial;

          if (isHintPeg) {
            pegMat.color.setHex(0xfbbf24);
            pegMat.emissive.setHex(0x92400e);
          } else if (isHovered && !st.gameOver && !st.isCpuTurn) {
            pegMat.color.setHex(0xc99555);
            pegMat.emissive.setHex(0x7a4f26);
          } else {
            pegMat.color.setHex(0x94a3b8);
            pegMat.emissive.setHex(0x000000);
          }

          // Ghost drop preview sphere
          const dropY = getDropLevel(st.grid, x, z);
          const ghost = previewSpheres[z][x];
          if ((isHovered || isHintPeg) && dropY !== -1 && !st.gameOver && !st.isCpuTurn) {
            ghost.visible = true;
            ghost.position.set(wx, baseLevelY + dropY * levelSpacing, wz);
            const gMat = ghost.material as THREE.MeshStandardMaterial;
            gMat.color.setHex(st.turn === 1 ? 0xf59e0b : 0x38bdf8);
            gMat.opacity = isHintPeg ? 0.65 + Math.sin(now * 0.01) * 0.2 : 0.42;
          } else {
            ghost.visible = false;
          }

          for (let y = 0; y < 4; y++) {
            const val = st.grid[y][z][x];
            const mesh = sphereMeshes[y][z][x];
            if (val === 0) {
              mesh.visible = false;
            } else {
              mesh.visible = true;
              const isWinSphere = winSet.has(`${x}-${y}-${z}`);
              mesh.material =
                val === 1
                  ? isWinSphere
                    ? winP1Mat
                    : p1Mat
                  : isWinSphere
                    ? winP2Mat
                    : p2Mat;

              const targetY = baseLevelY + y * levelSpacing;
              if (
                dropAnim &&
                dropAnim.x === x &&
                dropAnim.y === y &&
                dropAnim.z === z
              ) {
                const elapsed = now - dropAnim.startTime;
                const dur = 260;
                if (elapsed < dur) {
                  const t = elapsed / dur;
                  const easeOut = 1 - Math.pow(1 - t, 3);
                  const startY = 3.9;
                  mesh.position.set(wx, startY - (startY - targetY) * easeOut, wz);
                } else {
                  mesh.position.set(wx, targetY, wz);
                }
              } else {
                mesh.position.set(wx, targetY, wz);
              }
            }
          }
        }
      }

      // Update 3D winning line beam
      if (st.winResult) {
        const c0 = st.winResult.line[0];
        const c3 = st.winResult.line[3];
        const p0 = new THREE.Vector3(
          (c0.x - 1.5) * pegSpacing,
          baseLevelY + c0.y * levelSpacing,
          (c0.z - 1.5) * pegSpacing
        );
        const p3 = new THREE.Vector3(
          (c3.x - 1.5) * pegSpacing,
          baseLevelY + c3.y * levelSpacing,
          (c3.z - 1.5) * pegSpacing
        );
        const dir = new THREE.Vector3().subVectors(p3, p0);
        const len = dir.length() + 0.6;
        const mid = new THREE.Vector3().addVectors(p0, p3).multiplyScalar(0.5);

        winLineMesh.visible = true;
        winLineMesh.position.copy(mid);
        winLineMesh.scale.set(1, len, 1);
        winLineMesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize()
        );
      } else {
        winLineMesh.visible = false;
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
  }, []);

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
              <p className="tabletop-kicker truncate">3D Strategy · 4×4×4 Qubic</p>
              <h2 className="tabletop-title truncate text-base sm:text-xl">
                立体四目並べ
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-2 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left: Board + Status */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* Status & Threat Bar */}
          <section className="tabletop-panel p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="tabletop-stat flex min-w-0 items-center gap-2.5 px-2.5 py-2">
                <span className="h-5 w-5 shrink-0 rounded-full border border-[#e0bb82] bg-[#c99555]" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#d8cbb8]">
                    先手（アンバー）{mode === 'cpu' ? (humanSide === 1 ? '・あなた' : '・CPU') : '・P1'}
                  </p>
                  <p className="font-mono text-base font-bold leading-tight text-[#f4ead8]">
                    {totalSpheres.p1}
                    <span className="ml-1 text-[11px] font-normal text-[#b9a88f]">球</span>
                  </p>
                </div>
              </div>

              <div className="order-last w-full sm:order-none sm:w-auto">
                <div
                  className={`mx-auto w-fit rounded-md border px-3 py-1.5 text-center text-xs font-semibold ${
                    winResult
                      ? 'border-[#8a5b36] bg-[#2c2118] text-[#e6c48f]'
                      : 'border-[#4d3d2d] bg-[#211a15] text-[#d8cbb8]'
                  }`}
                >
                  {winResult ? (
                    <>
                      {winResult.winner === 1 ? '先手（アンバー）' : '後手（サファイア）'}の4連達成・勝利
                    </>
                  ) : isDraw ? (
                    <>64球すべて配置・引き分け</>
                  ) : isCpuTurn ? (
                    <span className="text-[#dfb06d]">CPU が76ラインを読み中...</span>
                  ) : (
                    <>
                      手番: {turn === 1 ? 'アンバー（先手）' : 'サファイア（後手）'}
                    </>
                  )}
                </div>
              </div>

              <div className="tabletop-stat flex min-w-0 items-center gap-2.5 px-2.5 py-2">
                <div className="min-w-0 text-right">
                  <p className="truncate text-[11px] font-semibold text-[#d8cbb8]">
                    後手（サファイア）{mode === 'cpu' ? (humanSide === 2 ? '・あなた' : '・CPU') : '・P2'}
                  </p>
                  <p className="font-mono text-base font-bold leading-tight text-[#f4ead8]">
                    {totalSpheres.p2}
                    <span className="ml-1 text-[11px] font-normal text-[#b9a88f]">球</span>
                  </p>
                </div>
                <span className="h-5 w-5 shrink-0 rounded-full border border-[#9db8cd] bg-[#5f8fb3]" />
              </div>
            </div>

            {!gameOver && threats.length > 0 && (
              <div className="mt-2.5 rounded-md border border-[#8a5b36] bg-[#2c2118] px-3 py-2 text-xs font-medium text-[#e6c48f]">
                <span className="font-semibold">リーチ警告：</span>
                {threats.map((t, i) => (
                  <span
                    key={i}
                    className="ml-1.5 inline-block rounded bg-black/25 px-1.5 py-0.5 font-mono"
                  >
                    {t.player === 1 ? '先手' : '後手'} → {COL_LABELS[t.openSpot.x]}
                    {t.openSpot.z + 1}（{t.openSpot.y + 1}段目
                    {t.playableNow ? '・即着手可' : '・空中待ち'}）
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Three.js Canvas */}
          <div className="tabletop-board-frame relative overflow-hidden">
            <div
              ref={mountRef}
              className="aspect-[5/4] w-full min-h-[320px] max-h-[560px] cursor-grab touch-none active:cursor-grabbing"
              aria-label="立体四目並べ 3Dキャンバス"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-2 sm:p-3">
              <span className="tabletop-panel-soft hidden px-2.5 py-1.5 text-[11px] font-medium text-[#b9a88f] sm:inline-flex">
                ドラッグで360°回転 / ポールをタップして球を落下
              </span>
              <div className="pointer-events-auto flex flex-wrap gap-1">
                {(
                  [
                    ['front', '正面'],
                    ['angled', '斜め上'],
                    ['top', '真上'],
                    ['auto', '自動回転'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectCameraPreset(key)}
                    aria-pressed={cameraPreset === key}
                    className={`inline-flex min-h-11 items-center rounded-md border px-2.5 text-[11px] font-semibold transition ${
                      cameraPreset === key
                        ? 'border-[#c99555] bg-[#3a2a1c] text-[#dfb06d]'
                        : 'border-[#4d3d2d] bg-[#17120f]/95 text-[#b9a88f] hover:border-[#6b543d] hover:text-[#f4ead8]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {hoveredPeg && !gameOver && (
              <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-[#4d3d2d] bg-[#17120f]/95 px-3 py-1.5 text-[11px] font-medium text-[#d8cbb8] sm:bottom-3 sm:left-3">
                選択ポール:{' '}
                <span className="font-mono text-[#e6c48f]">
                  {COL_LABELS[hoveredPeg[0]]}
                  {hoveredPeg[1] + 1}
                </span>
                （落下段:{' '}
                {getDropLevel(grid, hoveredPeg[0], hoveredPeg[1]) !== -1
                  ? `${getDropLevel(grid, hoveredPeg[0], hoveredPeg[1]) + 1}段目`
                  : '満杯'}
                ）
              </div>
            )}
          </div>
        </div>

        {/* Right: Slice Map + Controls */}
        <aside className="flex min-w-0 flex-col gap-3">
          {/* 2D Layer Slice Map */}
          <div className="tabletop-panel p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <p className="tabletop-kicker">Layer Slice Map</p>
              <span className="text-[11px] font-medium text-[#b9a88f]">タップでも投下可能</span>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((levelY) => (
                <div
                  key={levelY}
                  className="tabletop-panel-soft min-w-0 p-2"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-[#d8cbb8]">
                    <span>{levelY + 1}段目 (Y={levelY + 1})</span>
                    <span className="text-[10px] font-medium text-[#8f806d]">
                      {levelY === 0 ? '最下段' : levelY === 3 ? '最上段' : '中段'}
                    </span>
                  </div>
                  <div className="grid min-w-0 grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((z) =>
                      [0, 1, 2, 3].map((x) => {
                        const val = grid[levelY][z][x];
                        const dropY = getDropLevel(grid, x, z);
                        const isNextLanding = dropY === levelY && !gameOver;
                        const isLast =
                          lastPlaced?.x === x && lastPlaced?.y === levelY && lastPlaced?.z === z;
                        const isHint =
                          hintCoord?.x === x && hintCoord?.y === levelY && hintCoord?.z === z;

                        return (
                          <button
                            key={`${levelY}-${z}-${x}`}
                            type="button"
                            onClick={() => handlePegClick(x, z)}
                            onMouseEnter={() => setHoveredPeg([x, z])}
                            onMouseLeave={() => setHoveredPeg(null)}
                            disabled={dropY === -1 || gameOver || isCpuTurn}
                            title={`ポール ${COL_LABELS[x]}${z + 1} (${levelY + 1}段目)`}
                            className={`relative flex min-w-0 aspect-square items-center justify-center rounded-md border text-[10px] font-bold transition ${
                              val === 1
                                ? 'border-[#e0bb82] bg-[#c99555] text-[#1b120b]'
                                : val === 2
                                  ? 'border-[#9db8cd] bg-[#5f8fb3] text-[#0f1a22]'
                                  : isHint
                                    ? 'border-[#dfb06d] bg-[#3a2a1c] text-[#dfb06d] ring-1 ring-[#dfb06d]'
                                    : isNextLanding
                                      ? 'border-[#4d3d2d] bg-[#2a211a] text-[#b9a88f] hover:border-[#c99555] hover:bg-[#3a2a1c]'
                                      : 'border-[#3a3027] bg-[#1b1612] text-[#6f6252]'
                            }`}
                          >
                            {val !== 0 ? (
                              isLast ? (
                                '★'
                              ) : (
                                '●'
                              )
                            ) : isNextLanding ? (
                              <span className="opacity-70">
                                {COL_LABELS[x]}
                                {z + 1}
                              </span>
                            ) : (
                              '·'
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="tabletop-panel p-3.5">
            <p className="tabletop-kicker">Match Actions</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
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
                disabled={gameOver || isCpuTurn}
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
            {hintCoord && (
              <p className="tabletop-panel-soft mt-2 px-2.5 py-1.5 text-xs font-medium text-[#e6c48f]">
                AI推奨ポール:{' '}
                <span className="font-mono">
                  {COL_LABELS[hintCoord.x]}
                  {hintCoord.z + 1}
                </span>
                （{hintCoord.y + 1}段目に着地）
              </p>
            )}
          </div>

          {/* Mode & AI Level */}
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
                <p className="mt-3 text-[11px] font-semibold text-[#b9a88f]">
                  CPUの強さ（76ライン空間探索）
                </p>
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
                    アンバー（先手）
                  </button>
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 2)}
                    aria-pressed={humanSide === 2}
                    className={`tabletop-chip inline-flex min-h-11 items-center justify-center px-2 text-xs font-semibold ${
                      humanSide === 2 ? 'tabletop-chip-active' : ''
                    }`}
                  >
                    サファイア（後手）
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
