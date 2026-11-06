'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WORLD_W = 720;
const WORLD_H = 900;
const WALL = 22;
const LAUNCH_Y = 86;
const LAUNCH_MIN_X = WALL + 34;
const LAUNCH_MAX_X = WORLD_W - WALL - 34;
const FLOOR_Y = WORLD_H - 46;
const PEG_TOP = 180;
const PEG_BOTTOM = 700;
const BALL_RADIUS = 7.5;
const PEG_RADIUS = 8.5;
const MAX_SPLIT_DEPTH = 14;
const MAX_PARTICLES = 240;
const SPEED_OPTIONS = [0.5, 1, 2];
const GALTON_BINS = 11;

const BALL_COLORS = ['#5eead4', '#67e8f9', '#a5b4fc', '#f9a8d4', '#fde68a', '#34d399'];

export type LayoutMode = 'standard' | 'gates' | 'galton' | 'funnel';

interface MultiplierGate {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  factor: 2 | 3;
  color: string;
  flash: number;
}

interface DeflectorWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface SimParams {
  layout: LayoutMode;
  gravity: number;
  pegRows: number;
  splitChance: number;
  restitution: number;
  maxBalls: number;
  autoSpawn: boolean;
  recycleLoop: boolean;
  speed: number;
}

const DEFAULT_PARAMS: SimParams = {
  layout: 'gates',
  gravity: 880,
  pegRows: 8,
  splitChance: 0.55,
  restitution: 0.68,
  maxBalls: 256,
  autoSpawn: false,
  recycleLoop: true,
  speed: 1,
};

const LAYOUT_OPTIONS: {
  id: LayoutMode;
  label: string;
  sub: string;
  defaultParams: Partial<SimParams>;
}[] = [
  {
    id: 'gates',
    label: '×2・×3 分裂ゲート階層',
    sub: '1→2→4→8→16…指数爆発実験',
    defaultParams: { layout: 'gates', splitChance: 0.5, pegRows: 6, maxBalls: 256, recycleLoop: true },
  },
  {
    id: 'standard',
    label: '標準ピン配列（確率分裂）',
    sub: 'ピン衝突ごとの確率増殖',
    defaultParams: { layout: 'standard', splitChance: 0.55, pegRows: 8, maxBalls: 240, recycleLoop: true },
  },
  {
    id: 'galton',
    label: 'ゴルトンボード（正規分布）',
    sub: '底面11ビンで二項分布を計測',
    defaultParams: { layout: 'galton', splitChance: 0.48, pegRows: 9, restitution: 0.45, maxBalls: 260, recycleLoop: false },
  },
  {
    id: 'funnel',
    label: 'ファンネル渦巻き（高密度）',
    sub: '斜壁で中央へ集束し連鎖分裂',
    defaultParams: { layout: 'funnel', splitChance: 0.65, pegRows: 8, maxBalls: 280, recycleLoop: true },
  },
];

interface Peg {
  x: number;
  y: number;
  r: number;
  golden: boolean;
  flash: number;
  phase: number;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  splitBudget: number;
  cooldown: number;
  color: number;
  rest: number;
  passedGates: number[];
  binned: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface HistoryPoint {
  t: number;
  count: number;
  splits: number;
}

interface Milestones {
  t10: number | null;
  t50: number | null;
  t100: number | null;
  tMax: number | null;
}

interface SimState {
  running: boolean;
  params: SimParams;
  pegs: Peg[];
  gates: MultiplierGate[];
  walls: DeflectorWall[];
  bins: number[];
  balls: Ball[];
  nextBallId: number;
  particles: Particle[];
  aimX: number;
  aiming: boolean;
  pointerId: number | null;
  launcherFlash: number;
  time: number;
  history: HistoryPoint[];
  historyTimer: number;
  totalSplits: number;
  peakBalls: number;
  collisionCount: number;
  collisionWindow: number;
  collisionRate: number;
  autoTimer: number;
  milestones: Milestones;
}

interface HudState {
  running: boolean;
  layout: LayoutMode;
  activeBalls: number;
  maxBalls: number;
  totalSplits: number;
  collisionRate: number;
  peakBalls: number;
  settledBalls: number;
  autoSpawn: boolean;
  recycleLoop: boolean;
  elapsed: number;
  growthRate: number;
  doublingTime: number | null;
  milestones: Milestones;
  bins: number[];
  history: HistoryPoint[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeParams(params: SimParams): SimParams {
  return {
    layout: params.layout ?? DEFAULT_PARAMS.layout,
    gravity: clamp(finite(params.gravity, DEFAULT_PARAMS.gravity), 200, 1800),
    pegRows: clamp(Math.round(finite(params.pegRows, DEFAULT_PARAMS.pegRows)), 3, 12),
    splitChance: clamp(finite(params.splitChance, DEFAULT_PARAMS.splitChance), 0, 1),
    restitution: clamp(finite(params.restitution, DEFAULT_PARAMS.restitution), 0.2, 0.95),
    maxBalls: clamp(Math.round(finite(params.maxBalls, DEFAULT_PARAMS.maxBalls)), 40, 400),
    autoSpawn: Boolean(params.autoSpawn),
    recycleLoop: Boolean(params.recycleLoop),
    speed: clamp(finite(params.speed, DEFAULT_PARAMS.speed), 0.5, 2),
  };
}

function createPegs(rows: number, layout: LayoutMode): Peg[] {
  const pegs: Peg[] = [];
  const safeRows = clamp(Math.round(finite(rows, DEFAULT_PARAMS.pegRows)), 3, 12);
  const top = layout === 'galton' ? 185 : PEG_TOP;
  const bottom = layout === 'galton' ? 635 : PEG_BOTTOM;
  const rowGap = (bottom - top) / Math.max(1, safeRows - 1);
  const margin = layout === 'galton' ? 76 : 66;
  const colsBase = layout === 'galton' ? 9 : 7;
  const unit = (WORLD_W - margin * 2) / (colsBase - 0.5);

  for (let row = 0; row < safeRows; row += 1) {
    if (layout === 'gates' && row % 2 === 1) continue;
    const count = row % 2 === 0 ? colsBase : colsBase - 1;
    const offset = row % 2 === 0 ? 0 : 0.5;
    for (let col = 0; col < count; col += 1) {
      pegs.push({
        x: margin + (col + offset) * unit,
        y: top + row * rowGap,
        r: layout === 'galton' ? 6.5 : PEG_RADIUS,
        golden: layout === 'funnel' ? (row + col) % 3 === 0 : (row * 7 + col * 5) % 17 === 0,
        flash: 0,
        phase: (row * 1.1 + col * 0.7) % (Math.PI * 2),
      });
    }
  }
  return pegs;
}

function createGates(layout: LayoutMode): MultiplierGate[] {
  if (layout !== 'gates') return [];
  return [
    { id: 1, x: 165, y: 245, w: 390, h: 24, factor: 2, color: '#34d399', flash: 0 },
    { id: 2, x: 95, y: 390, w: 240, h: 24, factor: 2, color: '#38bdf8', flash: 0 },
    { id: 3, x: 385, y: 390, w: 240, h: 24, factor: 3, color: '#fbbf24', flash: 0 },
    { id: 4, x: 80, y: 540, w: 170, h: 24, factor: 2, color: '#a78bfa', flash: 0 },
    { id: 5, x: 275, y: 540, w: 170, h: 24, factor: 3, color: '#f472b6', flash: 0 },
    { id: 6, x: 470, y: 540, w: 170, h: 24, factor: 2, color: '#34d399', flash: 0 },
    { id: 7, x: 140, y: 675, w: 440, h: 24, factor: 2, color: '#fde68a', flash: 0 },
  ];
}

function createWalls(layout: LayoutMode): DeflectorWall[] {
  if (layout !== 'funnel') return [];
  return [
    { x1: WALL, y1: 230, x2: 245, y2: 340 },
    { x1: WORLD_W - WALL, y1: 230, x2: WORLD_W - 245, y2: 340 },
    { x1: 210, y1: 455, x2: 75, y2: 555 },
    { x1: WORLD_W - 210, y1: 455, x2: WORLD_W - 75, y2: 555 },
    { x1: WALL, y1: 625, x2: 260, y2: 725 },
    { x1: WORLD_W - WALL, y1: 625, x2: WORLD_W - 260, y2: 725 },
  ];
}

function makeSeedBall(id: number, x: number, vx = 0, vy = 72, color = 0): Ball {
  return {
    id,
    x,
    y: LAUNCH_Y + 18,
    vx: vx + (Math.random() - 0.5) * 18,
    vy,
    r: BALL_RADIUS,
    splitBudget: MAX_SPLIT_DEPTH,
    cooldown: 0.08,
    color,
    rest: 0,
    passedGates: [],
    binned: false,
  };
}

function createInitialSim(params: SimParams, withSeedBall = true): SimState {
  const safe = sanitizeParams(params);
  const seedBalls = withSeedBall ? [makeSeedBall(1, WORLD_W / 2, 12, 80, 0)] : [];
  return {
    running: true,
    params: safe,
    pegs: createPegs(safe.pegRows, safe.layout),
    gates: createGates(safe.layout),
    walls: createWalls(safe.layout),
    bins: Array.from({ length: GALTON_BINS }, () => 0),
    balls: seedBalls,
    nextBallId: seedBalls.length + 1,
    particles: [],
    aimX: WORLD_W / 2,
    aiming: false,
    pointerId: null,
    launcherFlash: withSeedBall ? 1 : 0,
    time: 0,
    history: [{ t: 0, count: seedBalls.length, splits: 0 }],
    historyTimer: 0,
    totalSplits: 0,
    peakBalls: seedBalls.length,
    collisionCount: 0,
    collisionWindow: 0,
    collisionRate: 0,
    autoTimer: 0.8,
    milestones: {
      t10: null,
      t50: null,
      t100: null,
      tMax: null,
    },
  };
}

function toHud(sim: SimState): HudState {
  let settledBalls = 0;
  for (const ball of sim.balls) {
    if (ball.rest > 0.3) settledBalls += 1;
  }
  const first = sim.history[0];
  const last = sim.history[sim.history.length - 1];
  const growthRate =
    first !== undefined && last !== undefined && last.t > first.t
      ? (last.count - first.count) / (last.t - first.t)
      : 0;

  // Effective doubling time: t * ln(2) / ln(N) using peakBalls or current activeBalls
  const nForDoubling = Math.max(sim.balls.length, sim.peakBalls);
  const refTime = sim.milestones.tMax ?? sim.time;
  const doublingTime =
    nForDoubling >= 2 && refTime > 0.05
      ? Math.round(((refTime * Math.LN2) / Math.log(nForDoubling)) * 100) / 100
      : null;

  return {
    running: sim.running,
    layout: sim.params.layout,
    activeBalls: sim.balls.length,
    maxBalls: sim.params.maxBalls,
    totalSplits: sim.totalSplits,
    collisionRate: Math.round(sim.collisionRate),
    peakBalls: sim.peakBalls,
    settledBalls,
    autoSpawn: sim.params.autoSpawn,
    recycleLoop: sim.params.recycleLoop,
    elapsed: Math.round(sim.time * 100) / 100,
    growthRate: Math.round(growthRate * 10) / 10,
    doublingTime,
    milestones: { ...sim.milestones },
    bins: [...sim.bins],
    history: [...sim.history],
  };
}

function spawnBurst(sim: SimState, x: number, y: number, color: string, count: number) {
  const room = MAX_PARTICLES - sim.particles.length;
  const amount = Math.min(count, Math.max(0, room));
  for (let index = 0; index < amount; index += 1) {
    const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.8;
    const speed = 35 + Math.random() * 150;
    const life = 0.35 + Math.random() * 0.5;
    sim.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 1 + Math.random() * 2.4,
      color,
    });
  }
}

function registerCollision(sim: SimState) {
  sim.collisionCount += 1;
}

function updateMilestones(sim: SimState) {
  const n = sim.balls.length;
  if (sim.milestones.t10 === null && n >= 10) {
    sim.milestones.t10 = Math.round(sim.time * 100) / 100;
  }
  if (sim.milestones.t50 === null && n >= 50) {
    sim.milestones.t50 = Math.round(sim.time * 100) / 100;
  }
  if (sim.milestones.t100 === null && n >= 100) {
    sim.milestones.t100 = Math.round(sim.time * 100) / 100;
  }
  if (sim.milestones.tMax === null && n >= sim.params.maxBalls) {
    sim.milestones.tMax = Math.round(sim.time * 100) / 100;
  }
}

function spawnBall(sim: SimState, x: number, vx = 0, vy = 62): boolean {
  if (sim.balls.length >= sim.params.maxBalls) return false;
  const spawnX = clamp(finite(x, WORLD_W / 2), LAUNCH_MIN_X, LAUNCH_MAX_X);
  const color = Math.floor(Math.random() * BALL_COLORS.length);
  const ball = makeSeedBall(sim.nextBallId, spawnX, vx, vy, color);
  sim.nextBallId += 1;
  sim.balls.push(ball);
  sim.peakBalls = Math.max(sim.peakBalls, sim.balls.length);
  sim.launcherFlash = 1;
  updateMilestones(sim);
  spawnBurst(sim, spawnX, LAUNCH_Y + 18, BALL_COLORS[color] ?? '#5eead4', 7);
  return true;
}

function trySplitOnPeg(sim: SimState, ball: Ball, peg: Peg, nx: number, ny: number, distance: number) {
  if (ball.cooldown > 0 || ball.splitBudget <= 0) return;
  if (!peg.golden && Math.random() >= sim.params.splitChance) return;
  if (sim.balls.length >= sim.params.maxBalls) return;
  if (peg.golden) {
    ball.splitBudget = Math.min(MAX_SPLIT_DEPTH + 2, ball.splitBudget + 1);
  }
  ball.splitBudget -= 1;
  ball.cooldown = 0.12;
  const tangentX = -ny;
  const tangentY = nx;
  const spread = (Math.random() - 0.5) * (150 + (1 - sim.params.restitution) * 220);
  const childColor = (ball.color + 1) % BALL_COLORS.length;
  const child: Ball = {
    id: sim.nextBallId,
    x: peg.x + nx * (distance + 1),
    y: peg.y + ny * (distance + 1),
    vx: clamp(ball.vx * 0.6 + tangentX * spread + (Math.random() - 0.5) * 30, -520, 520),
    vy: clamp(Math.abs(ball.vy) * 0.4 + 50 + Math.abs(spread) * 0.12, 20, 760),
    r: Math.max(5.5, ball.r * 0.94),
    splitBudget: ball.splitBudget,
    cooldown: 0.14,
    color: childColor,
    rest: 0,
    passedGates: [...ball.passedGates],
    binned: false,
  };
  sim.nextBallId += 1;
  sim.balls.push(child);
  sim.totalSplits += 1;
  sim.peakBalls = Math.max(sim.peakBalls, sim.balls.length);
  updateMilestones(sim);
  spawnBurst(sim, child.x, child.y, BALL_COLORS[childColor] ?? '#5eead4', 5);
}

function trySplitOnGate(sim: SimState, ball: Ball, gate: MultiplierGate) {
  if (ball.passedGates.includes(gate.id)) return;
  ball.passedGates.push(gate.id);
  gate.flash = 1;
  const copiesToSpawn = gate.factor - 1;
  for (let c = 0; c < copiesToSpawn; c += 1) {
    if (sim.balls.length >= sim.params.maxBalls) break;
    const offsetSign = c === 0 ? -1 : 1;
    const childColor = (ball.color + c + 1) % BALL_COLORS.length;
    const child: Ball = {
      id: sim.nextBallId,
      x: clamp(ball.x + offsetSign * (6 + Math.random() * 6), WALL + 12, WORLD_W - WALL - 12),
      y: ball.y + 4,
      vx: clamp(ball.vx * 0.7 + offsetSign * (65 + Math.random() * 55), -420, 420),
      vy: clamp(Math.max(80, ball.vy * 0.92), 60, 780),
      r: Math.max(5.5, ball.r * 0.96),
      splitBudget: ball.splitBudget,
      cooldown: 0.1,
      color: childColor,
      rest: 0,
      passedGates: [...ball.passedGates],
      binned: false,
    };
    sim.nextBallId += 1;
    sim.balls.push(child);
    sim.totalSplits += 1;
  }
  ball.vx += (Math.random() - 0.5) * 40;
  sim.peakBalls = Math.max(sim.peakBalls, sim.balls.length);
  updateMilestones(sim);
  spawnBurst(sim, ball.x, gate.y + gate.h / 2, gate.color, 8);
}

function updateEffects(sim: SimState, dt: number) {
  for (const particle of sim.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.985;
    particle.vy = particle.vy * 0.985 + 140 * dt;
  }
  sim.particles = sim.particles.filter(
    (particle) =>
      particle.life > 0 &&
      Number.isFinite(particle.x) &&
      Number.isFinite(particle.y) &&
      particle.y < WORLD_H + 60 &&
      particle.x > -60 &&
      particle.x < WORLD_W + 60
  );
  if (sim.launcherFlash > 0) sim.launcherFlash = Math.max(0, sim.launcherFlash - dt * 2.6);
  for (const peg of sim.pegs) {
    if (peg.flash > 0) peg.flash = Math.max(0, peg.flash - dt * 3.6);
  }
  for (const gate of sim.gates) {
    if (gate.flash > 0) gate.flash = Math.max(0, gate.flash - dt * 3.2);
  }
}

function collideSegment(ball: Ball, wall: DeflectorWall, restitution: number): boolean {
  const abx = wall.x2 - wall.x1;
  const aby = wall.y2 - wall.y1;
  const apx = ball.x - wall.x1;
  const apy = ball.y - wall.y1;
  const lenSq = abx * abx + aby * aby || 1;
  const t = clamp((apx * abx + apy * aby) / lenSq, 0, 1);
  const cx = wall.x1 + abx * t;
  const cy = wall.y1 + aby * t;
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const minDist = ball.r + 4;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist) return false;
  const dist = Math.sqrt(distSq) || 0.001;
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = cx + nx * minDist;
  ball.y = cy + ny * minDist;
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot < 0) {
    ball.vx -= (1 + restitution) * dot * nx;
    ball.vy -= (1 + restitution) * dot * ny;
  }
  return true;
}

function updateBall(sim: SimState, ball: Ball, dt: number): boolean {
  const restitution = sim.params.restitution;
  ball.cooldown = Math.max(0, ball.cooldown - dt);
  ball.vy = Math.min(1350, ball.vy + sim.params.gravity * dt);
  ball.vx = clamp(ball.vx * 0.999, -620, 620);
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (
    !Number.isFinite(ball.x) ||
    !Number.isFinite(ball.y) ||
    !Number.isFinite(ball.vx) ||
    !Number.isFinite(ball.vy)
  ) {
    return false;
  }

  if (ball.x - ball.r < WALL) {
    ball.x = WALL + ball.r;
    if (ball.vx < 0) {
      ball.vx = -ball.vx * restitution;
      registerCollision(sim);
    }
  }
  if (ball.x + ball.r > WORLD_W - WALL) {
    ball.x = WORLD_W - WALL - ball.r;
    if (ball.vx > 0) {
      ball.vx = -ball.vx * restitution;
      registerCollision(sim);
    }
  }

  // Multiplier gates check
  for (const gate of sim.gates) {
    if (
      ball.x >= gate.x &&
      ball.x <= gate.x + gate.w &&
      ball.y >= gate.y &&
      ball.y <= gate.y + gate.h
    ) {
      trySplitOnGate(sim, ball, gate);
    }
  }

  // Deflector walls check
  for (const wall of sim.walls) {
    if (collideSegment(ball, wall, restitution)) {
      registerCollision(sim);
    }
  }

  // Pegs check
  for (const peg of sim.pegs) {
    if (Math.abs(peg.y - ball.y) > 32 || Math.abs(peg.x - ball.x) > 32) continue;
    const dx = ball.x - peg.x;
    const dy = ball.y - peg.y;
    const minDist = ball.r + peg.r;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq >= minDist * minDist) continue;
    const distance = Math.sqrt(distanceSq) || 0.001;
    const nx = dx / distance;
    const ny = dy / distance;
    ball.x = peg.x + nx * minDist;
    ball.y = peg.y + ny * minDist;
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) {
      ball.vx -= (1 + restitution) * dot * nx;
      ball.vy -= (1 + restitution) * dot * ny;
      ball.vx += (Math.random() - 0.5) * 42;
      peg.flash = 1;
      registerCollision(sim);
      trySplitOnPeg(sim, ball, peg, nx, ny, minDist);
    }
    break;
  }

  // Galton bin dividers check
  if (sim.params.layout === 'galton' && ball.y > 670) {
    const innerW = WORLD_W - WALL * 2;
    const binW = innerW / GALTON_BINS;
    const relX = clamp(ball.x - WALL, 0, innerW - 0.01);
    const binIdx = Math.floor(relX / binW);
    if (!ball.binned && ball.y > 700) {
      ball.binned = true;
      sim.bins[binIdx] = (sim.bins[binIdx] ?? 0) + 1;
    }
    const leftDivider = WALL + binIdx * binW;
    const rightDivider = leftDivider + binW;
    if (ball.x - ball.r < leftDivider + 2) {
      ball.x = leftDivider + 2 + ball.r;
      ball.vx = Math.abs(ball.vx) * 0.4;
    } else if (ball.x + ball.r > rightDivider - 2) {
      ball.x = rightDivider - 2 - ball.r;
      ball.vx = -Math.abs(ball.vx) * 0.4;
    }
  }

  const floorLine = FLOOR_Y - ball.r;
  if (ball.y > floorLine) {
    // If recycleLoop is ON, warp the ball back to the top funnel so 1 seed ball keeps multiplying exponentially until maxBalls!
    if (sim.params.recycleLoop && sim.balls.length < sim.params.maxBalls) {
      ball.y = LAUNCH_Y + 18;
      ball.x = clamp(WORLD_W / 2 + (Math.random() - 0.5) * 180, LAUNCH_MIN_X, LAUNCH_MAX_X);
      ball.vx = (Math.random() - 0.5) * 65;
      ball.vy = 65 + Math.random() * 35;
      ball.passedGates = [];
      ball.binned = false;
      ball.rest = 0;
      return true;
    }

    ball.y = floorLine;
    if (ball.vy > 0) {
      const impact = ball.vy;
      ball.vy = -impact * restitution * 0.65;
      ball.vx *= 0.92;
      if (Math.abs(ball.vy) < 34) ball.vy = 0;
      if (impact > 12) registerCollision(sim);
    }
  }

  const nearFloor = ball.y >= floorLine - 1.5;
  if (nearFloor && Math.abs(ball.vy) < 38 && Math.abs(ball.vx) < 28) {
    ball.rest += dt;
    ball.vx *= 0.96;
  } else {
    ball.rest = 0;
  }

  if (ball.y > WORLD_H + 60 || ball.y < -240 || Math.abs(ball.x) > WORLD_W + 140) {
    return false;
  }
  return true;
}

function advanceSim(sim: SimState, rawDt: number) {
  const dt = Math.min(0.04, Math.max(0, finite(rawDt, 0))) * sim.params.speed;
  if (!Number.isFinite(dt) || dt <= 0) return;
  sim.time += dt;
  if (sim.time > 100000) sim.time = 0;
  sim.historyTimer += dt;
  if (sim.historyTimer >= 0.2) {
    sim.historyTimer = 0;
    sim.history.push({ t: sim.time, count: sim.balls.length, splits: sim.totalSplits });
    if (sim.history.length > 300) sim.history.shift();
  }
  updateEffects(sim, dt);

  if (sim.params.autoSpawn) {
    sim.autoTimer -= dt;
    if (sim.autoTimer <= 0) {
      if (sim.balls.length < sim.params.maxBalls) {
        const margin = WALL + 52;
        const x = margin + Math.random() * (WORLD_W - margin * 2);
        spawnBall(sim, x, (Math.random() - 0.5) * 40, 55 + Math.random() * 25);
        sim.autoTimer = 0.85 + Math.random() * 0.4;
      } else {
        sim.autoTimer = 0.35;
      }
    }
  }

  const substeps = clamp(Math.ceil(dt / 0.008), 1, 10);
  const stepDt = dt / substeps;
  for (let step = 0; step < substeps; step += 1) {
    for (let index = sim.balls.length - 1; index >= 0; index -= 1) {
      const ball = sim.balls[index];
      if (!ball) continue;
      if (!updateBall(sim, ball, stepDt)) sim.balls.splice(index, 1);
    }
  }

  sim.collisionWindow += dt;
  if (sim.collisionWindow >= 0.6) {
    sim.collisionRate = sim.collisionCount / sim.collisionWindow;
    sim.collisionCount = 0;
    sim.collisionWindow = 0;
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, time: number) {
  const background = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  background.addColorStop(0, '#031312');
  background.addColorStop(0.55, '#051b1a');
  background.addColorStop(1, '#07100f');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const glowA = ctx.createRadialGradient(150, 150, 20, 150, 150, 380);
  glowA.addColorStop(0, 'rgba(45,212,191,0.14)');
  glowA.addColorStop(0.6, 'rgba(13,148,136,0.05)');
  glowA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const glowB = ctx.createRadialGradient(560, 620, 20, 560, 620, 420);
  glowB.addColorStop(0, 'rgba(251,191,36,0.08)');
  glowB.addColorStop(0.55, 'rgba(180,83,9,0.04)');
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  ctx.save();
  ctx.strokeStyle = 'rgba(94,234,212,0.05)';
  ctx.lineWidth = 1;
  for (let x = WALL; x <= WORLD_W - WALL; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x, FLOOR_Y);
    ctx.stroke();
  }
  for (let y = 148; y < FLOOR_Y; y += 48) {
    ctx.beginPath();
    ctx.moveTo(WALL, y);
    ctx.lineTo(WORLD_W - WALL, y);
    ctx.stroke();
  }
  ctx.restore();

  const pulse = 0.5 + 0.5 * Math.sin(time * 1.4);
  ctx.save();
  ctx.strokeStyle = `rgba(94,234,212,${0.16 + pulse * 0.1})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WALL, LAUNCH_Y + 24);
  ctx.lineTo(WALL, FLOOR_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(WORLD_W - WALL, LAUNCH_Y + 24);
  ctx.lineTo(WORLD_W - WALL, FLOOR_Y);
  ctx.stroke();
  ctx.restore();
}

function drawFloorAndBins(ctx: CanvasRenderingContext2D, sim: SimState) {
  const height = WORLD_H - FLOOR_Y;
  const gradient = ctx.createLinearGradient(0, FLOOR_Y, 0, WORLD_H);
  gradient.addColorStop(0, 'rgba(13,148,136,0.22)');
  gradient.addColorStop(0.45, 'rgba(6,78,72,0.3)');
  gradient.addColorStop(1, 'rgba(2,13,12,0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(WALL, FLOOR_Y, WORLD_W - WALL * 2, height);

  ctx.save();
  ctx.strokeStyle = sim.params.recycleLoop
    ? 'rgba(52, 211, 153, 0.7)'
    : `rgba(153,246,228,${0.5 + Math.sin(sim.time * 2) * 0.08})`;
  ctx.lineWidth = 2;
  if (sim.params.recycleLoop) ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(WALL, FLOOR_Y);
  ctx.lineTo(WORLD_W - WALL, FLOOR_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (sim.params.recycleLoop && sim.balls.length < sim.params.maxBalls) {
    ctx.fillStyle = 'rgba(110, 231, 183, 0.75)';
    ctx.font = '700 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▲ RECYCLE PORTAL (底面到達ボールを上へ循環して上限まで増殖) ▲', WORLD_W / 2, FLOOR_Y + 24);
  }
  ctx.restore();

  if (sim.params.layout === 'galton') {
    const innerW = WORLD_W - WALL * 2;
    const binW = innerW / GALTON_BINS;
    const maxBin = Math.max(1, ...sim.bins);
    ctx.save();
    for (let i = 0; i <= GALTON_BINS; i += 1) {
      const x = WALL + i * binW;
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 675);
      ctx.lineTo(x, FLOOR_Y);
      ctx.stroke();
    }
    for (let i = 0; i < GALTON_BINS; i += 1) {
      const count = sim.bins[i] ?? 0;
      const barH = (count / maxBin) * 155;
      const bx = WALL + i * binW + 4;
      const bw = binW - 8;
      ctx.fillStyle = 'rgba(45, 212, 191, 0.26)';
      ctx.fillRect(bx, FLOOR_Y - barH, bw, barH);
      ctx.fillStyle = '#ccfbf1';
      ctx.font = '700 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${count}`, WALL + (i + 0.5) * binW, FLOOR_Y - 6);
    }
    ctx.restore();
  }
}

function drawGatesAndWalls(ctx: CanvasRenderingContext2D, sim: SimState) {
  for (const gate of sim.gates) {
    ctx.save();
    ctx.fillStyle =
      gate.factor === 3 ? 'rgba(251, 191, 36, 0.22)' : 'rgba(52, 211, 153, 0.20)';
    ctx.strokeStyle = gate.color;
    ctx.lineWidth = 2 + gate.flash * 2.5;
    ctx.shadowColor = gate.color;
    ctx.shadowBlur = 10 + gate.flash * 18;
    ctx.beginPath();
    ctx.roundRect(gate.x, gate.y, gate.w, gate.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`×${gate.factor} SPLIT GATE`, gate.x + gate.w / 2, gate.y + gate.h / 2);
    ctx.restore();
  }

  for (const wall of sim.walls) {
    ctx.save();
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#2dd4bf';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPegs(ctx: CanvasRenderingContext2D, sim: SimState) {
  for (const peg of sim.pegs) {
    const pulse = 0.5 + 0.5 * Math.sin(sim.time * 2 + peg.phase);
    const color = peg.golden ? '#fbbf24' : '#5eead4';
    ctx.save();
    if (peg.golden) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14 + peg.flash * 20;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.beginPath();
    ctx.arc(peg.x - peg.r * 0.3, peg.y - peg.r * 0.34, peg.r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (peg.golden ? 0.34 : 0.15) + peg.flash * 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2 + peg.flash * 2;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r + 2 + peg.flash * 5 + (peg.golden ? pulse * 2 : 0), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawLauncher(ctx: CanvasRenderingContext2D, sim: SimState) {
  const x = sim.aimX;
  const active = sim.running;
  ctx.save();
  const glow = ctx.createRadialGradient(x, LAUNCH_Y, 2, x, LAUNCH_Y, 60);
  glow.addColorStop(0, `rgba(94,234,212,${active ? 0.35 : 0.14})`);
  glow.addColorStop(1, 'rgba(94,234,212,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, LAUNCH_Y, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(15,118,110,0.55)';
  ctx.strokeStyle = 'rgba(153,246,228,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 30, LAUNCH_Y - 24);
  ctx.lineTo(x + 30, LAUNCH_Y - 24);
  ctx.lineTo(x + 14, LAUNCH_Y + 8);
  ctx.lineTo(x - 14, LAUNCH_Y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = active ? '#ccfbf1' : '#94a3b8';
  ctx.shadowColor = active ? '#5eead4' : 'transparent';
  ctx.shadowBlur = active ? 18 : 0;
  ctx.beginPath();
  ctx.arc(x, LAUNCH_Y + 16, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (sim.launcherFlash > 0) {
    ctx.globalAlpha = sim.launcherFlash;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, LAUNCH_Y + 16, 14 + (1 - sim.launcherFlash) * 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(153,246,228,0.75)';
  ctx.font = '700 10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SEED SPAWN', x, LAUNCH_Y - 34);
  ctx.restore();
}

function drawAimGuide(ctx: CanvasRenderingContext2D, sim: SimState) {
  const x = sim.aimX;
  const active = sim.aiming;
  ctx.save();
  ctx.setLineDash([5, 10]);
  ctx.strokeStyle = active ? 'rgba(94,234,212,0.5)' : 'rgba(94,234,212,0.18)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, LAUNCH_Y + 30);
  ctx.lineTo(x, FLOOR_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBalls(ctx: CanvasRenderingContext2D, sim: SimState) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const ball of sim.balls) {
    const color = BALL_COLORS[ball.color] ?? '#5eead4';
    ctx.globalAlpha = ball.rest > 0.3 ? 0.06 : 0.12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const ball of sim.balls) {
    const color = BALL_COLORS[ball.color] ?? '#5eead4';
    ctx.save();
    ctx.globalAlpha = ball.rest > 0.3 ? 0.72 : 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.beginPath();
    ctx.arc(ball.x - ball.r * 0.32, ball.y - ball.r * 0.36, ball.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderScene(ctx: CanvasRenderingContext2D, sim: SimState) {
  ctx.save();
  drawBackground(ctx, sim.time);
  drawFloorAndBins(ctx, sim);
  drawGatesAndWalls(ctx, sim);
  drawPegs(ctx, sim);
  drawAimGuide(ctx, sim);
  drawLauncher(ctx, sim);
  drawBalls(ctx, sim);
  drawParticles(ctx, sim.particles);

  const vignette = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.3,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.78
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.48)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.restore();
}

interface ParamSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

function ParamSlider({ id, label, value, min, max, step, display, onChange }: ParamSliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[11px] font-bold text-teal-100/80">
          {label}
        </label>
        <span className="font-mono text-[10px] font-black text-teal-200">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full cursor-pointer accent-teal-300"
      />
    </div>
  );
}

function GrowthChart({
  history,
  maxBalls,
  milestones,
}: {
  history: HistoryPoint[];
  maxBalls: number;
  milestones: Milestones;
}) {
  const width = 290;
  const height = 114;
  const padding = { top: 12, right: 10, bottom: 20, left: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  if (history.length < 2) {
    return (
      <div className="mt-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[10px] text-teal-100/40">
        0.2秒ごとにボール増殖曲線を記録します
      </div>
    );
  }
  const firstTime = history[0].t;
  const lastTime = history[history.length - 1].t;
  const timeSpan = Math.max(0.5, lastTime - firstTime);
  const maxCount = Math.max(maxBalls, ...history.map((point) => point.count));
  const x = (t: number) =>
    Math.round((padding.left + ((t - firstTime) / timeSpan) * plotWidth) * 100) / 100;
  const y = (count: number) =>
    Math.round((padding.top + (1 - count / maxCount) * plotHeight) * 100) / 100;
  const points = history.map((point) => `${x(point.t)},${y(point.count)}`).join(' ');

  const markers = [
    { count: 10, t: milestones.t10, color: '#38bdf8', label: '10' },
    { count: 50, t: milestones.t50, color: '#fbbf24', label: '50' },
    { count: 100, t: milestones.t100, color: '#f472b6', label: '100' },
    { count: maxBalls, t: milestones.tMax, color: '#34d399', label: 'MAX' },
  ];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-2 h-auto w-full rounded-lg bg-black/25 p-1"
      role="img"
      aria-label="経過時間に対するボール数の増殖曲線"
    >
      <line
        x1={padding.left}
        y1={padding.top + plotHeight}
        x2={width - padding.right}
        y2={padding.top + plotHeight}
        stroke="rgba(153,246,228,0.22)"
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + plotHeight}
        stroke="rgba(153,246,228,0.22)"
      />
      {[10, 50, 100].map((level) =>
        level < maxCount ? (
          <line
            key={level}
            x1={padding.left}
            y1={y(level)}
            x2={width - padding.right}
            y2={y(level)}
            stroke="rgba(153,246,228,0.08)"
            strokeDasharray="2 3"
          />
        ) : null
      )}
      <polyline points={points} fill="none" stroke="#5eead4" strokeWidth={2.2} strokeLinejoin="round" />
      {markers.map((m) =>
        m.t !== null && m.t >= firstTime && m.t <= lastTime ? (
          <g key={m.label}>
            <circle cx={x(m.t)} cy={y(Math.min(m.count, maxCount))} r={3.2} fill={m.color} />
          </g>
        ) : null
      )}
      <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" fontSize={8} fill="rgba(153,246,228,0.65)">
        {maxCount}
      </text>
      <text
        x={padding.left - 4}
        y={padding.top + plotHeight}
        textAnchor="end"
        fontSize={8}
        fill="rgba(153,246,228,0.65)"
      >
        0
      </text>
      <text x={padding.left} y={height - 4} fontSize={8} fill="rgba(153,246,228,0.65)">
        {firstTime.toFixed(1)}s
      </text>
      <text x={width - padding.right} y={height - 4} textAnchor="end" fontSize={8} fill="rgba(153,246,228,0.65)">
        {lastTime.toFixed(1)}s
      </text>
    </svg>
  );
}

export function BallMultiplyGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<SimState | null>(null);
  if (gameRef.current === null) {
    gameRef.current = createInitialSim(DEFAULT_PARAMS, true);
  }
  const [params, setParams] = useState<SimParams>({ ...DEFAULT_PARAMS });
  const [hud, setHud] = useState<HudState>(() => toHud(gameRef.current as SimState));

  const syncHud = useCallback(() => {
    const sim = gameRef.current;
    if (!sim) return;
    setHud(toHud(sim));
  }, []);

  const updateParams = useCallback(
    (patch: Partial<SimParams>) => {
      const sim = gameRef.current;
      if (!sim) return;
      const prev = sim.params;
      const next = sanitizeParams({
        layout: patch.layout ?? prev.layout,
        gravity: patch.gravity ?? prev.gravity,
        pegRows: patch.pegRows ?? prev.pegRows,
        splitChance: patch.splitChance ?? prev.splitChance,
        restitution: patch.restitution ?? prev.restitution,
        maxBalls: patch.maxBalls ?? prev.maxBalls,
        autoSpawn: patch.autoSpawn ?? prev.autoSpawn,
        recycleLoop: patch.recycleLoop ?? prev.recycleLoop,
        speed: patch.speed ?? prev.speed,
      });
      sim.params = next;
      if (next.pegRows !== prev.pegRows || next.layout !== prev.layout) {
        sim.pegs = createPegs(next.pegRows, next.layout);
        sim.gates = createGates(next.layout);
        sim.walls = createWalls(next.layout);
        sim.bins = Array.from({ length: GALTON_BINS }, () => 0);
      }
      if (sim.balls.length > next.maxBalls) sim.balls.length = next.maxBalls;
      if (!prev.autoSpawn && next.autoSpawn) sim.autoTimer = 0.25;
      setParams(next);
      syncHud();
    },
    [syncHud]
  );

  // Start a clean 1-ball doubling-time experiment from t = 0.00s
  const startOneBallExperiment = useCallback(() => {
    const sim = gameRef.current;
    if (!sim) return;
    const expParams: SimParams = {
      ...sim.params,
      autoSpawn: false,
      recycleLoop: true,
    };
    const fresh = createInitialSim(expParams, true);
    gameRef.current = fresh;
    setParams(fresh.params);
    syncHud();
  }, [syncHud]);

  const selectLayout = useCallback(
    (layoutId: LayoutMode) => {
      const sim = gameRef.current;
      if (!sim) return;
      const found = LAYOUT_OPTIONS.find((item) => item.id === layoutId);
      const nextParams = sanitizeParams({
        ...sim.params,
        ...(found?.defaultParams ?? {}),
        layout: layoutId,
      });
      const fresh = createInitialSim(nextParams, true);
      gameRef.current = fresh;
      setParams(fresh.params);
      syncHud();
    },
    [syncHud]
  );

  const resetSim = useCallback(() => {
    const sim = gameRef.current;
    if (!sim) return;
    const fresh = createInitialSim(sim.params, false);
    gameRef.current = fresh;
    setParams(fresh.params);
    syncHud();
  }, [syncHud]);

  const resetParams = useCallback(() => {
    const fresh = createInitialSim(DEFAULT_PARAMS, true);
    gameRef.current = fresh;
    setParams(fresh.params);
    syncHud();
  }, [syncHud]);

  const toggleRunning = useCallback(() => {
    const sim = gameRef.current;
    if (!sim) return;
    sim.running = !sim.running;
    syncHud();
  }, [syncHud]);

  const stepOnce = useCallback(() => {
    const sim = gameRef.current;
    if (!sim || sim.running) return;
    advanceSim(sim, 1 / 60);
    syncHud();
  }, [syncHud]);

  const spawnAt = useCallback(
    (x: number) => {
      const sim = gameRef.current;
      if (!sim) return;
      spawnBall(sim, x, (Math.random() - 0.5) * 30, 55 + Math.random() * 25);
      syncHud();
    },
    [syncHud]
  );

  const updateAim = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const sim = gameRef.current;
    if (!sim) return;
    const x = ((event.clientX - rect.left) / rect.width) * WORLD_W;
    sim.aimX = clamp(x, LAUNCH_MIN_X, LAUNCH_MAX_X);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, a')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const sim = gameRef.current;
      if (!sim) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      sim.aiming = true;
      sim.pointerId = event.pointerId;
      updateAim(event);
    },
    [updateAim]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const sim = gameRef.current;
      if (!sim || !sim.aiming || sim.pointerId !== event.pointerId) return;
      event.preventDefault();
      updateAim(event);
    },
    [updateAim]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const sim = gameRef.current;
      if (!sim || !sim.aiming || sim.pointerId !== event.pointerId) return;
      event.preventDefault();
      updateAim(event);
      sim.aiming = false;
      sim.pointerId = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      spawnAt(sim.aimX);
    },
    [spawnAt, updateAim]
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const sim = gameRef.current;
    if (!sim) return;
    if (sim.pointerId === event.pointerId) {
      sim.aiming = false;
      sim.pointerId = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let last = performance.now();
    let hudAccumulator = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const sim = gameRef.current;
      if (sim) {
        if (sim.running) advanceSim(sim, dt);
        hudAccumulator += dt;
        if (hudAccumulator >= 0.08) {
          hudAccumulator = 0;
          syncHud();
        }
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            const scaleX = canvas.width / WORLD_W;
            const scaleY = canvas.height / WORLD_H;
            ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
            ctx.clearRect(0, 0, WORLD_W, WORLD_H);
            renderScene(ctx, sim);
          }
        }
      }
      rafId = window.requestAnimationFrame(frame);
    };
    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [syncHud]);

  const fmtTime = (val: number | null) => (val === null ? '計測中…' : `${val.toFixed(2)}s`);

  return (
    <div className="min-h-screen select-none overflow-x-hidden bg-[#03110f] text-teal-50">
      <header className="border-b border-teal-400/15 bg-[#041210]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games#simulation-games"
              className="shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-teal-100/70 transition hover:border-teal-300/50 hover:text-teal-200 sm:px-3 sm:text-xs"
            >
              シミュレーション一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-[0.18em] text-teal-300/80 sm:text-[10px]">
                BALL MULTIPLY / DOUBLING TIME &amp; GROWTH CURVE LAB
              </p>
              <h2 className="truncate text-sm font-black sm:text-lg">
                ボール分裂・増殖時間アナライザー
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={startOneBallExperiment}
              className="rounded-lg border border-emerald-300/60 bg-emerald-400/20 px-2.5 py-1.5 text-[10px] font-black text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-400/30 sm:text-xs"
            >
              1個から実験スタート（タイマー計測）
            </button>
            <button
              type="button"
              onClick={resetSim}
              className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-black text-amber-200 transition hover:border-amber-300/70 hover:bg-amber-400/20 sm:text-xs"
            >
              全消去
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:grid-cols-[minmax(0,600px)_340px] lg:justify-center lg:gap-5">
        <div className="min-w-0 sm:mx-auto sm:w-full sm:max-w-[560px] lg:mx-0 lg:max-w-none">
          {/* Layout / Apparatus Selector */}
          <div className="mb-2.5 rounded-xl border border-teal-400/20 bg-teal-950/25 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black tracking-[0.16em] text-teal-300">
                実験装置・分裂ゲート切替（どのくらいの時間で増えるか比較）
              </span>
              <span className="font-mono text-[10px] font-bold text-emerald-300">
                倍増時間 τ: {hud.doublingTime === null ? '—' : `${hud.doublingTime.toFixed(2)}s`}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {LAYOUT_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectLayout(item.id)}
                  aria-pressed={params.layout === item.id}
                  className={`rounded-lg border px-2 py-1.5 text-left transition ${
                    params.layout === item.id
                      ? 'border-teal-300 bg-teal-400/20 text-teal-100'
                      : 'border-white/10 bg-white/[0.03] text-teal-100/70 hover:border-teal-300/40'
                  }`}
                >
                  <p className="truncate text-[10px] font-black">{item.label}</p>
                  <p className="truncate text-[8px] text-teal-200/70">{item.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div
            className="relative touch-none overflow-hidden rounded-2xl border border-teal-400/20 bg-[#04100f] shadow-[0_0_70px_rgba(45,212,191,0.08)]"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
          >
            <canvas
              ref={canvasRef}
              aria-label="増殖ボール・シミュレーターのシミュレーション画面"
              className="block aspect-[4/5] w-full"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 via-black/25 to-transparent p-2.5 sm:p-3">
              <div className="min-w-0">
                <p className="font-mono text-2xl font-black leading-tight text-white sm:text-3xl">
                  {hud.activeBalls}
                  <span className="ml-1 text-xs font-bold text-teal-200/70">/ {hud.maxBalls}</span>
                </p>
                <p className="text-[9px] font-bold text-teal-100/60">
                  ELAPSED <span className="font-mono text-teal-200">{hud.elapsed.toFixed(2)}s</span>
                </p>
                <p className="mt-0.5 text-[9px] font-bold text-teal-200/80">
                  SPLITS <span className="font-mono">{hud.totalSplits}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-black leading-tight text-emerald-300 sm:text-base">
                  τ = {hud.doublingTime === null ? '—' : `${hud.doublingTime.toFixed(2)}s`}
                </p>
                <p className="text-[8px] font-bold text-teal-100/60">実効倍増時間 (2倍化平均)</p>
                <p className="mt-1 text-[9px] font-bold text-teal-100/60">
                  衝突レート <span className="font-mono text-teal-100/90">{hud.collisionRate}/s</span>
                </p>
              </div>
            </div>

            {!hud.running && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
                <div className="rounded-xl border border-white/10 bg-black/45 px-4 py-2.5 text-center backdrop-blur-sm">
                  <p className="text-[10px] font-black tracking-[0.24em] text-teal-300">PAUSED</p>
                  <p className="mt-1 text-[10px] text-teal-100/60">再生または1ステップで増殖を観察できます</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <button
              type="button"
              onClick={startOneBallExperiment}
              className="rounded-lg border border-emerald-300/50 bg-emerald-400/20 px-3 py-1.5 text-[11px] font-black text-emerald-100 transition hover:bg-emerald-400/30"
            >
              1個から実験スタート
            </button>
            <button
              type="button"
              onClick={toggleRunning}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-black transition ${
                hud.running
                  ? 'border-teal-300/40 bg-teal-400/15 text-teal-100 hover:bg-teal-400/25'
                  : 'border-amber-300/50 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30'
              }`}
            >
              {hud.running ? '一時停止' : '再生'}
            </button>
            <button
              type="button"
              onClick={stepOnce}
              disabled={hud.running}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-teal-100/70 transition hover:border-teal-300/40 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-35"
            >
              1ステップ
            </button>
            <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/20 p-0.5">
              <span className="px-1 text-[9px] font-black tracking-[0.14em] text-teal-100/40">SPEED</span>
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => updateParams({ speed })}
                  aria-pressed={params.speed === speed}
                  className={`rounded-md px-2 py-1 font-mono text-[10px] font-black transition ${
                    params.speed === speed
                      ? 'bg-teal-300 text-slate-950'
                      : 'text-teal-100/60 hover:text-teal-100'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="mx-auto flex w-full max-w-[560px] flex-col gap-2.5 sm:gap-3 lg:mx-0 lg:max-w-none">
          {/* Doubling Time & Milestone Stopwatch Card */}
          <div className="rounded-xl border border-emerald-400/25 bg-[#061d1a]/90 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.16em] text-emerald-300">
                DOUBLING TIME &amp; MILESTONES (増殖到達タイム)
              </span>
              <span className="font-mono text-[10px] font-bold text-teal-200">
                t = {hud.elapsed.toFixed(2)}s
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="rounded-lg border border-sky-400/20 bg-black/25 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-sky-300">1個 → 10個 到達時間</p>
                <p className="font-mono text-sm font-black text-white">
                  {fmtTime(hud.milestones.t10)}
                </p>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-black/25 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-amber-300">1個 → 50個 到達時間</p>
                <p className="font-mono text-sm font-black text-white">
                  {fmtTime(hud.milestones.t50)}
                </p>
              </div>
              <div className="rounded-lg border border-pink-400/20 bg-black/25 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-pink-300">1個 → 100個 到達時間</p>
                <p className="font-mono text-sm font-black text-white">
                  {fmtTime(hud.milestones.t100)}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-400/20 bg-black/25 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-emerald-300">
                  1個 → 上限({hud.maxBalls}個)飽和
                </p>
                <p className="font-mono text-sm font-black text-emerald-200">
                  {fmtTime(hud.milestones.tMax)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-950/40 px-2.5 py-1.5 text-[10px]">
              <span className="font-bold text-emerald-200">実効倍増時間 (2倍になる平均秒数)</span>
              <span className="font-mono text-sm font-black text-emerald-300">
                {hud.doublingTime === null ? '—' : `${hud.doublingTime.toFixed(2)} 秒/倍`}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">
                GROWTH CURVE (増殖曲線グラフ)
              </span>
              <span className="font-mono text-[10px] text-teal-200">
                +{hud.growthRate.toFixed(1)} balls/s
              </span>
            </div>
            <GrowthChart
              history={hud.history}
              maxBalls={hud.maxBalls}
              milestones={hud.milestones}
            />
            <p className="mt-1 text-[9px] leading-4 text-teal-100/50">
              カラー点は10個・50個・100個・上限飽和の到達時点を示します。指数関数的な立ち上がりから上限飽和（ロジスティック型）への遷移を確認できます。
            </p>
          </div>

          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">
                SIMULATION PARAMS
              </span>
              <button
                type="button"
                onClick={resetParams}
                className="text-[10px] font-bold text-teal-100/50 transition hover:text-teal-200"
              >
                初期値に戻す
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              <ParamSlider
                id="param-split"
                label="ピン衝突時の分裂確率"
                value={Math.round(params.splitChance * 100)}
                min={0}
                max={100}
                step={5}
                display={`${Math.round(params.splitChance * 100)}%`}
                onChange={(value) => updateParams({ splitChance: value / 100 })}
              />
              <ParamSlider
                id="param-gravity"
                label="重力加速度"
                value={params.gravity}
                min={200}
                max={1800}
                step={20}
                display={`${params.gravity} px/s²`}
                onChange={(value) => updateParams({ gravity: value })}
              />
              <ParamSlider
                id="param-pegs"
                label="ピン段数"
                value={params.pegRows}
                min={3}
                max={12}
                step={1}
                display={`${params.pegRows} 段`}
                onChange={(value) => updateParams({ pegRows: value })}
              />
              <ParamSlider
                id="param-restitution"
                label="反発係数"
                value={params.restitution}
                min={0.2}
                max={0.95}
                step={0.01}
                display={params.restitution.toFixed(2)}
                onChange={(value) => updateParams({ restitution: value })}
              />
              <ParamSlider
                id="param-max-balls"
                label="上限ボール数 (飽和容量)"
                value={params.maxBalls}
                min={40}
                max={400}
                step={16}
                display={`${params.maxBalls} 個`}
                onChange={(value) => updateParams({ maxBalls: value })}
              />

              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-teal-100/80">底面ワープ循環（1個から連続増殖）</p>
                  <p className="text-[9px] leading-4 text-teal-100/45">
                    底に落ちたボールを上へ戻し上限に達するまで分裂を継続
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={params.recycleLoop}
                  onClick={() => updateParams({ recycleLoop: !params.recycleLoop })}
                  className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                    params.recycleLoop
                      ? 'border-emerald-300/60 bg-emerald-400/30'
                      : 'border-white/15 bg-white/10'
                  }`}
                >
                  <span
                    className={`absolute top-[3px] h-[18px] w-[18px] rounded-full transition-all ${
                      params.recycleLoop ? 'left-[23px] bg-emerald-200' : 'left-[3px] bg-slate-400'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-teal-100/80">自動連続スポーン</p>
                  <p className="text-[9px] leading-4 text-teal-100/45">
                    上部から一定間隔で新しい種ボールを投入
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={params.autoSpawn}
                  onClick={() => updateParams({ autoSpawn: !params.autoSpawn })}
                  className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                    params.autoSpawn
                      ? 'border-teal-300/60 bg-teal-400/30'
                      : 'border-white/15 bg-white/10'
                  }`}
                >
                  <span
                    className={`absolute top-[3px] h-[18px] w-[18px] rounded-full transition-all ${
                      params.autoSpawn ? 'left-[23px] bg-teal-200' : 'left-[3px] bg-slate-400'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
