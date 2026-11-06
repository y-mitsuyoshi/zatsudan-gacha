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
    scene.background = new THREE.Color('#060913');

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

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.55);
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
      color: 0x162032,
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
            pegMat.color.setHex(0x38bdf8);
            pegMat.emissive.setHex(0x0369a1);
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
    <div className="min-h-screen bg-[#060913] text-slate-100 select-none">
      {/* Header */}
      <header className="border-b border-cyan-500/20 bg-[#080d1a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/games"
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-400">
                3D SPATIAL STRATEGY / 4×4×4 QUBIC
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                立体四目並べ 3D（Qubic 4×4×4）
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400/50"
            >
              {soundOn ? '🔊 効果音 ON' : '🔇 効果音 OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left: 3D Board + Status Banner */}
        <div className="flex flex-col gap-3">
          {/* Status & Threat Bar */}
          <div className="rounded-2xl border border-cyan-500/20 bg-[#0b1324]/90 p-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
                <div>
                  <p className="text-xs font-bold text-amber-200">
                    先手（アンバー）{mode === 'cpu' ? (humanSide === 1 ? '・あなた' : '・CPU') : '・P1'}
                  </p>
                  <p className="font-mono text-base font-black text-white">{totalSpheres.p1} 個</p>
                </div>
              </div>

              <div className="rounded-full border border-cyan-400/30 bg-cyan-950/50 px-3.5 py-1 text-center">
                {winResult ? (
                  <span className="text-xs font-black text-amber-300">
                    🏆 {winResult.winner === 1 ? '先手（アンバー）' : '後手（サファイア）'}の4連達成・勝利！
                  </span>
                ) : isDraw ? (
                  <span className="text-xs font-black text-slate-200">64球すべて配置・引き分け！</span>
                ) : isCpuTurn ? (
                  <span className="text-xs font-black text-cyan-300">CPUが76ラインの空間を読み中...</span>
                ) : (
                  <span className="text-xs font-black text-cyan-100">
                    現在の手番: {turn === 1 ? '🟡 先手（アンバー）' : '🔵 後手（サファイア）'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-right">
                <div>
                  <p className="text-xs font-bold text-cyan-200">
                    後手（サファイア）{mode === 'cpu' ? (humanSide === 2 ? '・あなた' : '・CPU') : '・P2'}
                  </p>
                  <p className="font-mono text-base font-black text-white">{totalSpheres.p2} 個</p>
                </div>
                <span className="h-5 w-5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.7)]" />
              </div>
            </div>

            {/* Threat Warning Indicator */}
            {!gameOver && threats.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200">
                <span>
                  ⚠️ リーチ警告：
                  {threats.map((t, i) => (
                    <span key={i} className="ml-1.5 inline-block rounded bg-black/40 px-1.5 py-0.5 font-mono">
                      {t.player === 1 ? '先手' : '後手'} → {COL_LABELS[t.openSpot.x]}
                      {t.openSpot.z + 1}（{t.openSpot.y + 1}段目
                      {t.playableNow ? '・即着手可！' : '・空中待ち'}）
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>

          {/* Three.js Canvas */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#060913] shadow-2xl">
            <div
              ref={mountRef}
              className="aspect-[5/4] w-full min-h-[340px] max-h-[540px] cursor-grab active:cursor-grabbing touch-none"
              aria-label="立体四目並べ 3Dキャンバス"
            />

            {/* Top Camera Preset Bar */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="rounded-full border border-cyan-400/30 bg-black/65 px-2.5 py-1 text-[11px] font-bold text-cyan-200 backdrop-blur">
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
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                      cameraPreset === key
                        ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100'
                        : 'border-white/15 bg-black/65 text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {hoveredPeg && !gameOver && (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-cyan-400/35 bg-black/75 px-3 py-1.5 text-xs font-bold text-cyan-100 backdrop-blur">
                選択ポール: <span className="font-mono text-amber-300">{COL_LABELS[hoveredPeg[0]]}{hoveredPeg[1] + 1}</span>
                （次の落下段:{' '}
                {getDropLevel(grid, hoveredPeg[0], hoveredPeg[1]) !== -1
                  ? `${getDropLevel(grid, hoveredPeg[0], hoveredPeg[1]) + 1}段目`
                  : '満杯'}
                ）
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: 2D Layer Slice Map + Controls */}
        <aside className="flex flex-col gap-3">
          {/* Synchronized 2D Layer Slice Map (1段目〜4段目) */}
          <div className="rounded-2xl border border-cyan-500/25 bg-[#0b1324]/90 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black tracking-[0.18em] text-cyan-400">
                2D LAYER SLICE MAP（1段目〜4段目スライス）
              </p>
              <span className="text-[10px] font-bold text-slate-400">タップでも投下可能</span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {[0, 1, 2, 3].map((levelY) => (
                <div
                  key={levelY}
                  className="rounded-xl border border-white/10 bg-[#070c18] p-2"
                >
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-black text-slate-300">
                    <span>{levelY + 1}段目 (Y={levelY + 1})</span>
                    <span className="text-[9px] text-slate-400">
                      {levelY === 0 ? '最下段' : levelY === 3 ? '最上段' : '中段'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
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
                            className={`relative flex aspect-square items-center justify-center rounded-md border text-[10px] font-bold transition ${
                              val === 1
                                ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : val === 2
                                  ? 'border-sky-300 bg-sky-400 text-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                                  : isHint
                                    ? 'border-amber-300 bg-amber-400/35 text-amber-200 ring-2 ring-amber-300'
                                    : isNextLanding
                                      ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-500/30'
                                      : 'border-white/5 bg-white/[0.02] text-slate-600'
                            }`}
                          >
                            {val !== 0 ? (
                              isLast ? (
                                '★'
                              ) : (
                                '●'
                              )
                            ) : isNextLanding ? (
                              <span className="opacity-65">{COL_LABELS[x]}{z + 1}</span>
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

          {/* Match Actions */}
          <div className="rounded-2xl border border-cyan-500/20 bg-[#0b1324]/90 p-3.5">
            <p className="text-[10px] font-black tracking-[0.18em] text-cyan-400">
              MATCH ACTIONS
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0 || isCpuTurn}
                className="rounded-xl border border-white/15 bg-white/[0.05] px-2 py-2 text-xs font-bold text-slate-100 transition hover:border-cyan-400/50 disabled:opacity-40"
              >
                ↩ 待った
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={gameOver || isCpuTurn}
                className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-2 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-40"
              >
                💡 AIヒント
              </button>
              <button
                type="button"
                onClick={() => resetGame()}
                className="rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-2 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/25"
              >
                🔄 新規対局
              </button>
            </div>
            {hintCoord && (
              <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-200">
                AI推奨ポール: <span className="font-mono">{COL_LABELS[hintCoord.x]}{hintCoord.z + 1}</span>（{hintCoord.y + 1}段目に着地）
              </p>
            )}
          </div>

          {/* Mode & AI Level */}
          <div className="rounded-2xl border border-white/10 bg-[#0b1324]/90 p-3.5">
            <p className="text-[10px] font-black tracking-[0.18em] text-cyan-400">
              GAME MODE / 対戦設定
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => resetGame('cpu', difficulty, humanSide)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  mode === 'cpu'
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                    : 'border-white/10 bg-white/[0.04] text-slate-300'
                }`}
              >
                🤖 CPU対戦
              </button>
              <button
                type="button"
                onClick={() => resetGame('pvp', difficulty, humanSide)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  mode === 'pvp'
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                    : 'border-white/10 bg-white/[0.04] text-slate-300'
                }`}
              >
                👥 1台で2人対戦
              </button>
            </div>

            {mode === 'cpu' && (
              <>
                <p className="mt-3 text-[10px] font-black tracking-[0.18em] text-slate-400">
                  CPU強さ（76ライン空間探索AI）
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
                      className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                        difficulty === lv
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-white/10 bg-white/[0.04] text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-[10px] font-black tracking-[0.18em] text-slate-400">
                  あなたの手番
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 1)}
                    className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                      humanSide === 1
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-white/10 bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    🟡 先手（アンバー）
                  </button>
                  <button
                    type="button"
                    onClick={() => resetGame('cpu', difficulty, 2)}
                    className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                      humanSide === 2
                        ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                        : 'border-white/10 bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    🔵 後手（サファイア）
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
