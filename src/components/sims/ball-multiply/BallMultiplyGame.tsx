'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WORLD_W = 720;
const WORLD_H = 900;
const WALL = 22;
const LAUNCH_Y = 96;
const LAUNCH_MIN_X = WALL + 34;
const LAUNCH_MAX_X = WORLD_W - WALL - 34;
const FLOOR_Y = WORLD_H - 46;
const PEG_TOP = 196;
const PEG_BOTTOM = 716;
const BALL_RADIUS = 8;
const PEG_RADIUS = 9;
const MAX_SPLIT_DEPTH = 3;
const MAX_PARTICLES = 220;
const SETTLE_TTL = 6;
const SPEED_OPTIONS = [0.5, 1, 2];

const BALL_COLORS = ['#5eead4', '#67e8f9', '#a5b4fc', '#f9a8d4', '#fde68a'];

interface SimParams {
  gravity: number;
  pegRows: number;
  splitChance: number;
  restitution: number;
  maxBalls: number;
  autoSpawn: boolean;
  speed: number;
}

const DEFAULT_PARAMS: SimParams = {
  gravity: 880,
  pegRows: 8,
  splitChance: 0.4,
  restitution: 0.72,
  maxBalls: 220,
  autoSpawn: true,
  speed: 1,
};

const PRESETS: { id: string; label: string; params: SimParams }[] = [
  { id: 'standard', label: '標準', params: { ...DEFAULT_PARAMS } },
  {
    id: 'gravity',
    label: '高重力',
    params: { ...DEFAULT_PARAMS, gravity: 1500, restitution: 0.52, splitChance: 0.45, maxBalls: 260 },
  },
  {
    id: 'split',
    label: '分裂多め',
    params: { ...DEFAULT_PARAMS, splitChance: 0.75, pegRows: 10, maxBalls: 340 },
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
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  splitBudget: number;
  cooldown: number;
  color: number;
  rest: number;
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

interface SimState {
  running: boolean;
  params: SimParams;
  pegs: Peg[];
  balls: Ball[];
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
}

interface HudState {
  running: boolean;
  activeBalls: number;
  totalSplits: number;
  collisionRate: number;
  peakBalls: number;
  settledBalls: number;
  autoSpawn: boolean;
  elapsed: number;
  growthRate: number;
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
    gravity: clamp(finite(params.gravity, DEFAULT_PARAMS.gravity), 200, 1800),
    pegRows: clamp(Math.round(finite(params.pegRows, DEFAULT_PARAMS.pegRows)), 3, 12),
    splitChance: clamp(finite(params.splitChance, DEFAULT_PARAMS.splitChance), 0, 1),
    restitution: clamp(finite(params.restitution, DEFAULT_PARAMS.restitution), 0.2, 0.95),
    maxBalls: clamp(Math.round(finite(params.maxBalls, DEFAULT_PARAMS.maxBalls)), 40, 400),
    autoSpawn: Boolean(params.autoSpawn),
    speed: clamp(finite(params.speed, DEFAULT_PARAMS.speed), 0.5, 2),
  };
}

function createPegs(rows: number): Peg[] {
  const pegs: Peg[] = [];
  const safeRows = clamp(Math.round(finite(rows, DEFAULT_PARAMS.pegRows)), 3, 12);
  const rowGap = (PEG_BOTTOM - PEG_TOP) / Math.max(1, safeRows - 1);
  const margin = 66;
  const unit = (WORLD_W - margin * 2) / 6.5;
  for (let row = 0; row < safeRows; row += 1) {
    const count = row % 2 === 0 ? 7 : 6;
    const offset = row % 2 === 0 ? 0 : 0.5;
    for (let col = 0; col < count; col += 1) {
      pegs.push({
        x: margin + (col + offset) * unit,
        y: PEG_TOP + row * rowGap,
        r: PEG_RADIUS,
        golden: (row * 7 + col * 5) % 23 === 0,
        flash: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  return pegs;
}

function createInitialSim(params: SimParams): SimState {
  const safe = sanitizeParams(params);
  return {
    running: true,
    params: safe,
    pegs: createPegs(safe.pegRows),
    balls: [],
    particles: [],
    aimX: WORLD_W / 2,
    aiming: false,
    pointerId: null,
    launcherFlash: 0,
    time: 0,
    history: [],
    historyTimer: 0,
    totalSplits: 0,
    peakBalls: 0,
    collisionCount: 0,
    collisionWindow: 0,
    collisionRate: 0,
    autoTimer: 0.8,
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
  return {
    running: sim.running,
    activeBalls: sim.balls.length,
    totalSplits: sim.totalSplits,
    collisionRate: Math.round(sim.collisionRate),
    peakBalls: sim.peakBalls,
    settledBalls,
    autoSpawn: sim.params.autoSpawn,
    elapsed: Math.round(sim.time * 10) / 10,
    growthRate: Math.round(growthRate * 10) / 10,
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

function spawnBall(sim: SimState, x: number, vx = 0, vy = 62): boolean {
  if (sim.balls.length >= sim.params.maxBalls) return false;
  const spawnX = clamp(finite(x, WORLD_W / 2), LAUNCH_MIN_X, LAUNCH_MAX_X);
  const color = Math.floor(Math.random() * BALL_COLORS.length);
  sim.balls.push({
    x: spawnX,
    y: LAUNCH_Y + 18,
    vx: clamp(finite(vx, 0) + (Math.random() - 0.5) * 20, -260, 260),
    vy: clamp(finite(vy, 62), 20, 320),
    r: BALL_RADIUS,
    splitBudget: MAX_SPLIT_DEPTH,
    cooldown: 0.12,
    color,
    rest: 0,
  });
  sim.peakBalls = Math.max(sim.peakBalls, sim.balls.length);
  sim.launcherFlash = 1;
  spawnBurst(sim, spawnX, LAUNCH_Y + 18, BALL_COLORS[color] ?? '#5eead4', 7);
  return true;
}

function trySplit(sim: SimState, ball: Ball, peg: Peg, nx: number, ny: number, distance: number) {
  if (ball.cooldown > 0 || ball.splitBudget <= 0) return;
  if (!peg.golden && Math.random() >= sim.params.splitChance) return;
  if (sim.balls.length >= sim.params.maxBalls) return;
  if (peg.golden) {
    ball.splitBudget = Math.min(MAX_SPLIT_DEPTH + 1, ball.splitBudget + 1);
  }
  ball.splitBudget -= 1;
  ball.cooldown = 0.16;
  const tangentX = -ny;
  const tangentY = nx;
  const spread = (Math.random() - 0.5) * (150 + (1 - sim.params.restitution) * 220);
  const childColor = (ball.color + 1) % BALL_COLORS.length;
  const child: Ball = {
    x: peg.x + nx * (distance + 1),
    y: peg.y + ny * (distance + 1),
    vx: clamp(ball.vx * 0.6 + tangentX * spread + (Math.random() - 0.5) * 30, -520, 520),
    vy: clamp(Math.abs(ball.vy) * 0.4 + 50 + Math.abs(spread) * 0.12, 20, 760),
    r: Math.max(4.5, ball.r * 0.87),
    splitBudget: ball.splitBudget,
    cooldown: 0.2,
    color: childColor,
    rest: 0,
  };
  sim.balls.push(child);
  sim.totalSplits += 1;
  sim.peakBalls = Math.max(sim.peakBalls, sim.balls.length);
  spawnBurst(sim, child.x, child.y, BALL_COLORS[childColor] ?? '#5eead4', 6);
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
      ball.vx += (Math.random() - 0.5) * 46;
      peg.flash = 1;
      registerCollision(sim);
      trySplit(sim, ball, peg, nx, ny, minDist);
    }
    break;
  }

  const floorLine = FLOOR_Y - ball.r;
  if (ball.y > floorLine) {
    ball.y = floorLine;
    if (ball.vy > 0) {
      const impact = ball.vy;
      ball.vy = -impact * restitution;
      ball.vx *= 0.94;
      if (Math.abs(ball.vy) < 34) ball.vy = 0;
      if (impact > 12) registerCollision(sim);
    }
  }

  const nearFloor = ball.y >= floorLine - 1.5;
  if (nearFloor && Math.abs(ball.vy) < 38 && Math.abs(ball.vx) < 28) {
    ball.rest += dt;
    ball.vx *= 0.975;
  } else {
    ball.rest = 0;
  }

  if (ball.y > WORLD_H + 60 || ball.y < -240 || Math.abs(ball.x) > WORLD_W + 140) {
    return false;
  }
  if (ball.rest > SETTLE_TTL) {
    spawnBurst(sim, ball.x, ball.y, BALL_COLORS[ball.color] ?? '#5eead4', 4);
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
  if (sim.historyTimer >= 0.5) {
    sim.historyTimer = 0;
    sim.history.push({ t: sim.time, count: sim.balls.length, splits: sim.totalSplits });
    if (sim.history.length > 240) sim.history.shift();
  }
  updateEffects(sim, dt);

  if (sim.params.autoSpawn) {
    sim.autoTimer -= dt;
    if (sim.autoTimer <= 0) {
      if (sim.balls.length < sim.params.maxBalls) {
        const margin = WALL + 52;
        const x = margin + Math.random() * (WORLD_W - margin * 2);
        spawnBall(sim, x, (Math.random() - 0.5) * 40, 55 + Math.random() * 25);
        sim.autoTimer = 1 + Math.random() * 0.5;
      } else {
        sim.autoTimer = 0.35;
      }
    }
  } else {
    sim.autoTimer = Math.max(sim.autoTimer, 0.55);
  }

  const substeps = clamp(Math.ceil(dt / 0.009), 1, 10);
  const stepDt = dt / substeps;
  for (let step = 0; step < substeps; step += 1) {
    for (let index = sim.balls.length - 1; index >= 0; index -= 1) {
      const ball = sim.balls[index];
      if (!ball) continue;
      if (!updateBall(sim, ball, stepDt)) sim.balls.splice(index, 1);
    }
  }

  sim.collisionWindow += dt;
  if (sim.collisionWindow >= 0.75) {
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
    ctx.moveTo(x, 138);
    ctx.lineTo(x, FLOOR_Y);
    ctx.stroke();
  }
  for (let y = 160; y < FLOOR_Y; y += 48) {
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

function drawFloor(ctx: CanvasRenderingContext2D, time: number) {
  const height = WORLD_H - FLOOR_Y;
  const gradient = ctx.createLinearGradient(0, FLOOR_Y, 0, WORLD_H);
  gradient.addColorStop(0, 'rgba(13,148,136,0.22)');
  gradient.addColorStop(0.45, 'rgba(6,78,72,0.3)');
  gradient.addColorStop(1, 'rgba(2,13,12,0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(WALL, FLOOR_Y, WORLD_W - WALL * 2, height);

  ctx.save();
  ctx.strokeStyle = `rgba(153,246,228,${0.5 + Math.sin(time * 2) * 0.08})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WALL, FLOOR_Y);
  ctx.lineTo(WORLD_W - WALL, FLOOR_Y);
  ctx.stroke();

  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  for (let x = WALL + 18; x < WORLD_W - WALL; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_Y + 7);
    ctx.lineTo(x + 10, FLOOR_Y + 20);
    ctx.stroke();
  }
  ctx.restore();
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
  ctx.fillText('SPAWN', x, LAUNCH_Y - 38);
  ctx.restore();
}

function drawAimGuide(ctx: CanvasRenderingContext2D, sim: SimState) {
  const x = sim.aimX;
  const active = sim.aiming;
  ctx.save();
  ctx.setLineDash([5, 10]);
  ctx.strokeStyle = active ? 'rgba(94,234,212,0.5)' : 'rgba(94,234,212,0.2)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, LAUNCH_Y + 30);
  ctx.lineTo(x, FLOOR_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#5eead4';
  ctx.globalAlpha = active ? 0.9 : 0.45;
  ctx.beginPath();
  ctx.arc(x, FLOOR_Y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#5eead4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, FLOOR_Y, 12 + Math.sin(sim.time * 4) * 2, 0, Math.PI * 2);
  ctx.stroke();
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
    ctx.arc(ball.x, ball.y, ball.r * 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const ball of sim.balls) {
    const color = BALL_COLORS[ball.color] ?? '#5eead4';
    ctx.save();
    ctx.globalAlpha = ball.rest > 0.3 ? 0.66 : 1;
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
  drawFloor(ctx, sim.time);
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
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
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

function GrowthChart({ history }: { history: HistoryPoint[] }) {
  const width = 280;
  const height = 96;
  const padding = { top: 10, right: 8, bottom: 18, left: 26 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  if (history.length < 2) {
    return (
      <div className="mt-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[10px] text-teal-100/40">
        0.5秒ごとにボール数を記録します
      </div>
    );
  }
  const firstTime = history[0].t;
  const lastTime = history[history.length - 1].t;
  const timeSpan = Math.max(0.5, lastTime - firstTime);
  const maxCount = Math.max(1, ...history.map((point) => point.count));
  const x = (t: number) => Math.round((padding.left + ((t - firstTime) / timeSpan) * plotWidth) * 1000) / 1000;
  const y = (count: number) => Math.round((padding.top + (1 - count / maxCount) * plotHeight) * 1000) / 1000;
  const points = history.map((point) => `${x(point.t)},${y(point.count)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-auto w-full" role="img" aria-label="経過時間に対するボール数の推移">
      <line x1={padding.left} y1={padding.top + plotHeight} x2={width - padding.right} y2={padding.top + plotHeight} stroke="rgba(153,246,228,0.2)" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="rgba(153,246,228,0.2)" />
      <polyline points={points} fill="none" stroke="#5eead4" strokeWidth={2} strokeLinejoin="round" />
      <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" fontSize={8} fill="rgba(153,246,228,0.55)">{maxCount}</text>
      <text x={padding.left - 4} y={padding.top + plotHeight} textAnchor="end" fontSize={8} fill="rgba(153,246,228,0.55)">0</text>
      <text x={padding.left} y={height - 4} fontSize={8} fill="rgba(153,246,228,0.55)">0s</text>
      <text x={width - padding.right} y={height - 4} textAnchor="end" fontSize={8} fill="rgba(153,246,228,0.55)">{Math.round(lastTime)}s</text>
    </svg>
  );
}

export function BallMultiplyGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<SimState | null>(null);
  if (gameRef.current === null) {
    gameRef.current = createInitialSim(DEFAULT_PARAMS);
  }
  const [params, setParams] = useState<SimParams>({ ...DEFAULT_PARAMS });
  const [hud, setHud] = useState<HudState>(() => toHud(gameRef.current as SimState));
  const hudRef = useRef<HudState | null>(null);

  const syncHud = useCallback(() => {
    const sim = gameRef.current;
    if (!sim) return;
    const next = toHud(sim);
    const prev = hudRef.current;
    if (
      prev !== null &&
      prev.running === next.running &&
      prev.activeBalls === next.activeBalls &&
      prev.totalSplits === next.totalSplits &&
      prev.collisionRate === next.collisionRate &&
      prev.peakBalls === next.peakBalls &&
      prev.settledBalls === next.settledBalls &&
      prev.autoSpawn === next.autoSpawn &&
      prev.elapsed === next.elapsed &&
      prev.growthRate === next.growthRate &&
      prev.history.length === next.history.length
    ) {
      return;
    }
    hudRef.current = next;
    setHud(next);
  }, []);

  const updateParams = useCallback(
    (patch: Partial<SimParams>) => {
      const sim = gameRef.current;
      if (!sim) return;
      const prev = sim.params;
      const next = sanitizeParams({
        gravity: patch.gravity ?? prev.gravity,
        pegRows: patch.pegRows ?? prev.pegRows,
        splitChance: patch.splitChance ?? prev.splitChance,
        restitution: patch.restitution ?? prev.restitution,
        maxBalls: patch.maxBalls ?? prev.maxBalls,
        autoSpawn: patch.autoSpawn ?? prev.autoSpawn,
        speed: patch.speed ?? prev.speed,
      });
      sim.params = next;
      if (next.pegRows !== prev.pegRows) sim.pegs = createPegs(next.pegRows);
      if (sim.balls.length > next.maxBalls) sim.balls.length = next.maxBalls;
      if (!prev.autoSpawn && next.autoSpawn) sim.autoTimer = 0.3;
      setParams(next);
      syncHud();
    },
    [syncHud]
  );

  const resetSim = useCallback(() => {
    const sim = gameRef.current;
    if (!sim) return;
    const fresh = createInitialSim(sim.params);
    gameRef.current = fresh;
    setParams(fresh.params);
    syncHud();
  }, [syncHud]);

  const resetParams = useCallback(() => {
    const sim = gameRef.current;
    if (!sim) return;
    const next = { ...DEFAULT_PARAMS };
    sim.params = next;
    sim.pegs = createPegs(next.pegRows);
    if (sim.balls.length > next.maxBalls) sim.balls.length = next.maxBalls;
    sim.autoTimer = 0.8;
    setParams(next);
    syncHud();
  }, [syncHud]);

  const applyPreset = useCallback(
    (preset: SimParams) => {
      const fresh = createInitialSim(preset);
      gameRef.current = fresh;
      setParams(fresh.params);
      syncHud();
    },
    [syncHud]
  );

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
        if (hudAccumulator >= 0.1) {
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
                BALL MULTIPLY / PHYSICS SANDBOX
              </p>
              <h2 className="truncate text-sm font-black sm:text-lg">増殖ボール・シミュレーター</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`hidden rounded-lg border px-2.5 py-1 text-[10px] font-black sm:block ${
                hud.running
                  ? 'border-teal-400/20 bg-teal-950/30 text-teal-200'
                  : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
              }`}
            >
              {hud.running ? 'RUNNING' : 'PAUSED'}
            </div>
            <button
              type="button"
              onClick={resetSim}
              className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-black text-amber-200 transition hover:border-amber-300/70 hover:bg-amber-400/20 sm:text-xs"
            >
              リセット
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:grid-cols-[minmax(0,600px)_320px] lg:justify-center lg:gap-5">
        <div className="min-w-0 sm:mx-auto sm:w-full sm:max-w-[560px] lg:mx-0 lg:max-w-none">
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
                </p>
                <p className="text-[9px] font-bold text-teal-100/50">CURRENT BALLS</p>
                <p className="mt-1 text-[9px] font-bold text-teal-200/80">
                  SPLITS <span className="font-mono">{hud.totalSplits}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-base font-black leading-tight text-teal-200 sm:text-lg">
                  {hud.collisionRate}
                  <span className="ml-1 text-[9px] text-teal-100/50">COL/S</span>
                </p>
                <p className="mt-1 text-[9px] font-bold text-teal-100/60">
                  PEAK <span className="font-mono text-teal-100/90">{hud.peakBalls}</span>
                </p>
                <p className="text-[9px] font-bold text-teal-100/60">
                  SETTLED <span className="font-mono text-teal-100/90">{hud.settledBalls}</span>
                </p>
              </div>
            </div>

            {!hud.running && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
                <div className="rounded-xl border border-white/10 bg-black/45 px-4 py-2.5 text-center backdrop-blur-sm">
                  <p className="text-[10px] font-black tracking-[0.24em] text-teal-300">PAUSED</p>
                  <p className="mt-1 text-[10px] text-teal-100/60">再生するとシミュレーションが再開します</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
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
            <button
              type="button"
              onClick={resetSim}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-teal-100/70 transition hover:border-teal-300/40 hover:text-teal-200"
            >
              リセット
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
          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">SIMULATION PARAMS</span>
              <button
                type="button"
                onClick={resetParams}
                className="text-[10px] font-bold text-teal-100/50 transition hover:text-teal-200"
              >
                初期値に戻す
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <ParamSlider
                id="param-gravity"
                label="重力"
                value={params.gravity}
                min={200}
                max={1800}
                step={20}
                display={`${params.gravity}`}
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
                id="param-split"
                label="分裂確率"
                value={Math.round(params.splitChance * 100)}
                min={0}
                max={100}
                step={5}
                display={`${Math.round(params.splitChance * 100)}%`}
                onChange={(value) => updateParams({ splitChance: value / 100 })}
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
                label="上限ボール数"
                value={params.maxBalls}
                min={40}
                max={400}
                step={20}
                display={`${params.maxBalls}`}
                onChange={(value) => updateParams({ maxBalls: value })}
              />

              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-teal-100/80">自動スポーン</p>
                  <p className="text-[9px] leading-4 text-teal-100/40">一定間隔でボールを自動投入</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={params.autoSpawn}
                  aria-label="自動スポーン"
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

            <div className="mt-3 border-t border-white/10 pt-2.5">
              <p className="text-[9px] font-black tracking-[0.18em] text-teal-300/80">PRESETS</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.params)}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[10px] font-bold text-teal-100/70 transition hover:border-teal-300/50 hover:text-teal-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">GROWTH CURVE</span>
              <span className="text-[10px] text-teal-100/50">BALLS / TIME</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-teal-100/60">
              <span>経過 <span className="font-mono text-teal-100">{hud.elapsed.toFixed(1)}s</span></span>
              <span>増加 <span className="font-mono text-teal-100">{hud.growthRate.toFixed(1)}</span> balls/s</span>
            </div>
            <GrowthChart history={hud.history} />
            <p className="mt-1 text-[9px] leading-4 text-teal-100/40">0.5秒ごとのボール数を記録。分裂の立ち上がりと飽和の仕方を確認できます。</p>
          </div>

          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">OBSERVATION</span>
              <span className="text-[10px] text-teal-100/50">LIVE</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { label: '現在のボール', value: `${hud.activeBalls}` },
                { label: '累計分裂', value: `${hud.totalSplits}` },
                { label: '衝突 / 秒', value: `${hud.collisionRate}` },
                { label: '最大ボール', value: `${hud.peakBalls}` },
                { label: '静止中', value: `${hud.settledBalls}` },
                { label: '自動スポーン', value: hud.autoSpawn ? 'ON' : 'OFF' },
                { label: '経過時間', value: `${hud.elapsed.toFixed(1)}s` },
                { label: '増加速度', value: `${hud.growthRate.toFixed(1)}/s` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                  <p className="text-[9px] font-bold text-teal-100/40">{item.label}</p>
                  <p className="font-mono text-sm font-black text-teal-50">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">HOW TO OBSERVE</span>
              <span className="text-[10px] text-teal-100/50">3 STEPS</span>
            </div>
            <ol className="mt-2 space-y-2 text-[11px] leading-5 text-teal-100/75">
              <li>1. 画面をタップ／ドラッグしてボールを投入</li>
              <li>2. ピンに当たったボールが確率で分裂</li>
              <li>3. スライダーで重力・反発・分裂を調整して観察</li>
            </ol>
            <p className="mt-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[10px] leading-4 text-teal-100/55">
              金色のピンは必ず分裂し、分裂回数を1回追加します。静止したボールはしばらくすると排出されます。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
