'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WORLD_W = 390;
const WORLD_H = 600;
const WALL = 12;
const LEFT = WALL;
const RIGHT = WORLD_W - WALL;
const FLOOR = WORLD_H - 14;
const SPAWN_Y = 56;
const DANGER_Y = 112;
const GRAVITY = 1280;
const RESTITUTION = 0.18;
const WALL_BOUNCE = 0.38;
const MAX_LEVEL = 6;
const DROP_COOLDOWN = 0.42;
const COMBO_WINDOW = 2.6;
const DANGER_LIMIT = 1.8;
const STORAGE_KEY = 'bubble-merge-best-v1';
const BUBBLE_RADII = [13, 17, 22, 28, 35, 43, 52];
const MERGE_SCORE = [12, 24, 48, 96, 192, 384, 768];

type Phase = 'playing' | 'over';

type Palette = {
  light: string;
  mid: string;
  edge: string;
  glow: string;
};

const PALETTES: Palette[] = [
  { light: '#e0f7ff', mid: '#67d4f8', edge: '#0b8fc4', glow: 'rgba(103,212,248,0.5)' },
  { light: '#e7ffe9', mid: '#86efac', edge: '#16a34a', glow: 'rgba(134,239,172,0.45)' },
  { light: '#fff8dc', mid: '#fde68a', edge: '#d97706', glow: 'rgba(253,230,138,0.45)' },
  { light: '#ffe7ef', mid: '#f9a8d4', edge: '#db2777', glow: 'rgba(249,168,212,0.45)' },
  { light: '#efe7ff', mid: '#c4b5fd', edge: '#7c3aed', glow: 'rgba(196,181,253,0.48)' },
  { light: '#ffeadf', mid: '#fdba74', edge: '#ea580c', glow: 'rgba(253,186,116,0.48)' },
  { light: '#fff3c4', mid: '#fbbf24', edge: '#b45309', glow: 'rgba(251,191,36,0.55)' },
];

interface Bubble {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  level: number;
  age: number;
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

interface Ring {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

interface GameState {
  phase: Phase;
  bubbles: Bubble[];
  particles: Particle[];
  rings: Ring[];
  texts: FloatText[];
  score: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  best: number;
  newBest: boolean;
  merges: number;
  dropped: number;
  currentLevel: number;
  nextLevel: number;
  aimX: number;
  activePointer: number | null;
  cooldown: number;
  dangerTimer: number;
  shake: number;
  flash: number;
  time: number;
  nextId: number;
  hudDirty: boolean;
}

interface HudState {
  phase: Phase;
  score: number;
  combo: number;
  maxCombo: number;
  best: number;
  newBest: boolean;
  merges: number;
  dropped: number;
  nextLevel: number;
}

function randomLevel(): number {
  const roll = Math.random();
  if (roll < 0.48) return 0;
  if (roll < 0.82) return 1;
  return 2;
}

function comboMultiplier(combo: number): number {
  return Math.min(5, 1 + Math.max(0, combo - 1) * 0.25);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readBestScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeBestScore(score: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    return;
  }
}

function createInitialGame(bestScore: number): GameState {
  return {
    phase: 'playing',
    bubbles: [],
    particles: [],
    rings: [],
    texts: [],
    score: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    best: bestScore,
    newBest: false,
    merges: 0,
    dropped: 0,
    currentLevel: 0,
    nextLevel: 1,
    aimX: WORLD_W / 2,
    activePointer: null,
    cooldown: 0,
    dangerTimer: 0,
    shake: 0,
    flash: 0,
    time: 0,
    nextId: 1,
    hudDirty: false,
  };
}

function toHud(game: GameState): HudState {
  return {
    phase: game.phase,
    score: game.score,
    combo: game.combo,
    maxCombo: game.maxCombo,
    best: game.best,
    newBest: game.newBest,
    merges: game.merges,
    dropped: game.dropped,
    nextLevel: game.nextLevel,
  };
}

function triggerMerge(game: GameState, x: number, y: number, level: number) {
  const palette = PALETTES[Math.min(level, MAX_LEVEL)];
  const count = 12 + level * 4;
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * (90 + level * 26);
    const life = 0.3 + Math.random() * 0.55;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 24,
      life,
      maxLife: life,
      size: 1.4 + Math.random() * (2.4 + level * 0.6),
      color: index % 4 === 0 ? '#ffffff' : palette.mid,
    });
  }
  game.rings.push({
    x,
    y,
    radius: BUBBLE_RADII[Math.min(level + 1, MAX_LEVEL)] * 0.7,
    life: 0.5,
    maxLife: 0.5,
    color: palette.mid,
  });
  game.flash = Math.min(0.9, game.flash + 0.1 + level * 0.035);
  game.shake = Math.max(game.shake, 1.5 + level * 0.6);
}

function mergePair(game: GameState, first: Bubble, second: Bubble) {
  const level = first.level;
  const multiplier = comboMultiplier(game.combo + 1);
  const base = MERGE_SCORE[Math.min(level, MAX_LEVEL)];
  const points = Math.round(base * multiplier);
  let x = (first.x + second.x) / 2;
  let y = (first.y + second.y) / 2;

  game.merges += 1;
  game.combo += 1;
  game.comboTimer = COMBO_WINDOW;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  game.score += points;
  game.hudDirty = true;

  if (level < MAX_LEVEL) {
    const nextLevel = level + 1;
    const nextRadius = BUBBLE_RADII[nextLevel];
    x = clamp(x, LEFT + nextRadius, RIGHT - nextRadius);
    y = Math.min(y, FLOOR - nextRadius);
    game.bubbles.push({
      id: game.nextId,
      x,
      y,
      vx: (first.vx + second.vx) * 0.3,
      vy: Math.min((first.vy + second.vy) * 0.3, 20) - 24,
      radius: nextRadius,
      level: nextLevel,
      age: 0,
    });
    game.nextId += 1;
  } else {
    game.flash = Math.min(1, game.flash + 0.35);
  }

  triggerMerge(game, x, y, level);
  game.texts.push({
    x,
    y: y - 14,
    text: `+${points}`,
    life: 0.95,
    maxLife: 0.95,
    color: level >= 4 ? '#fde68a' : '#e0f2fe',
  });
}

function resolveBubbles(game: GameState) {
  const merged = new Set<number>();
  const bubbles = game.bubbles;

  for (let i = 0; i < bubbles.length; i += 1) {
    const first = bubbles[i];
    if (merged.has(first.id)) continue;
    for (let j = i + 1; j < bubbles.length; j += 1) {
      const second = bubbles[j];
      if (merged.has(second.id) || second.id === first.id) continue;
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const minDistance = first.radius + second.radius;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq >= minDistance * minDistance) continue;
      const distance = Math.sqrt(distanceSq) || 0.001;
      const nx = dx / distance;
      const ny = dy / distance;

      if (first.level === second.level) {
        merged.add(first.id);
        merged.add(second.id);
        mergePair(game, first, second);
        break;
      }

      const overlap = minDistance - distance;
      const push = overlap / 2 + 0.05;
      first.x -= nx * push;
      first.y -= ny * push;
      second.x += nx * push;
      second.y += ny * push;

      const relativeX = second.vx - first.vx;
      const relativeY = second.vy - first.vy;
      const normalVelocity = relativeX * nx + relativeY * ny;
      if (normalVelocity < 0) {
        const impulse = (-(1 + RESTITUTION) * normalVelocity) / 2;
        first.vx -= impulse * nx;
        first.vy -= impulse * ny;
        second.vx += impulse * nx;
        second.vy += impulse * ny;
      }

      const tangentX = -ny;
      const tangentY = nx;
      const tangentVelocity = relativeX * tangentX + relativeY * tangentY;
      const friction = tangentVelocity * 0.04;
      first.vx += friction * tangentX;
      first.vy += friction * tangentY;
      second.vx -= friction * tangentX;
      second.vy -= friction * tangentY;
    }
  }

  if (merged.size > 0) {
    game.bubbles = bubbles.filter((bubble) => !merged.has(bubble.id));
  }
}

function stepPhysics(game: GameState, dt: number) {
  for (const bubble of game.bubbles) {
    bubble.age += dt;
    bubble.vy += GRAVITY * dt;
    bubble.vx *= 0.999;
    bubble.x += bubble.vx * dt;
    bubble.y += bubble.vy * dt;

    if (bubble.x - bubble.radius < LEFT) {
      bubble.x = LEFT + bubble.radius;
      if (bubble.vx < 0) bubble.vx = -bubble.vx * WALL_BOUNCE;
    }
    if (bubble.x + bubble.radius > RIGHT) {
      bubble.x = RIGHT - bubble.radius;
      if (bubble.vx > 0) bubble.vx = -bubble.vx * WALL_BOUNCE;
    }
    if (bubble.y + bubble.radius > FLOOR) {
      bubble.y = FLOOR - bubble.radius;
      if (bubble.vy > 0) bubble.vy = -bubble.vy * RESTITUTION;
      if (Math.abs(bubble.vy) < 18) bubble.vy = 0;
      bubble.vx *= 0.9;
    }
  }

  for (let iteration = 0; iteration < 4; iteration += 1) {
    resolveBubbles(game);
  }
}

function updateEffects(game: GameState, dt: number) {
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.97;
    particle.vy = particle.vy * 0.97 + 210 * dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);

  for (const ring of game.rings) {
    ring.life -= dt;
  }
  game.rings = game.rings.filter((ring) => ring.life > 0);

  for (const text of game.texts) {
    text.life -= dt;
    text.y -= 30 * dt;
  }
  game.texts = game.texts.filter((text) => text.life > 0);
}

function endGame(game: GameState) {
  if (game.phase !== 'playing') return;
  game.phase = 'over';
  game.activePointer = null;
  game.newBest = game.score > game.best;
  if (game.newBest) {
    game.best = game.score;
    writeBestScore(game.best);
  }
  game.shake = Math.max(game.shake, 9);
  game.flash = Math.max(game.flash, 0.8);
  game.hudDirty = true;
}

function updateDanger(game: GameState, dt: number) {
  let aboveLine = false;
  for (const bubble of game.bubbles) {
    if (bubble.age > 0.55 && bubble.y - bubble.radius < DANGER_Y) {
      aboveLine = true;
      break;
    }
  }
  if (aboveLine) {
    game.dangerTimer = Math.min(DANGER_LIMIT, game.dangerTimer + dt);
    if (game.dangerTimer >= DANGER_LIMIT) endGame(game);
  } else {
    game.dangerTimer = Math.max(0, game.dangerTimer - dt * 1.7);
  }
}

function makeBackdrop() {
  let seed = 20261105;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 26 }, () => ({
    x: random() * WORLD_W,
    y: random() * WORLD_H,
    r: 2 + random() * 11,
    alpha: 0.025 + random() * 0.055,
    speed: 4 + random() * 11,
    phase: random() * Math.PI * 2,
  }));
}

const BACKDROP = makeBackdrop();

function drawBackground(ctx: CanvasRenderingContext2D, time: number, dangerRatio: number) {
  const background = ctx.createLinearGradient(-30, -30, WORLD_W + 30, WORLD_H + 30);
  background.addColorStop(0, '#061221');
  background.addColorStop(0.55, '#081a2d');
  background.addColorStop(1, '#04101d');
  ctx.fillStyle = background;
  ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);

  const glow = ctx.createRadialGradient(WORLD_W / 2, WORLD_H * 0.88, 20, WORLD_W / 2, WORLD_H * 0.88, 320);
  glow.addColorStop(0, `rgba(34,211,238,${0.12 + dangerRatio * 0.06})`);
  glow.addColorStop(0.55, 'rgba(14,116,144,0.06)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);

  const upperGlow = ctx.createRadialGradient(WORLD_W / 2, 20, 10, WORLD_W / 2, 20, 260);
  upperGlow.addColorStop(0, 'rgba(125,211,252,0.08)');
  upperGlow.addColorStop(1, 'rgba(125,211,252,0)');
  ctx.fillStyle = upperGlow;
  ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);

  ctx.save();
  ctx.strokeStyle = 'rgba(125,211,252,0.045)';
  ctx.lineWidth = 1;
  for (let x = LEFT; x <= RIGHT; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FLOOR);
    ctx.stroke();
  }
  for (let y = 0; y <= FLOOR; y += 36) {
    ctx.beginPath();
    ctx.moveTo(LEFT, y);
    ctx.lineTo(RIGHT, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  for (const piece of BACKDROP) {
    const y = ((piece.y + time * piece.speed) % (WORLD_H + 40)) - 20;
    const drift = Math.sin(time * 0.6 + piece.phase) * 6;
    ctx.globalAlpha = piece.alpha;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(piece.x + drift, y, piece.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#7dd3fc';
  for (let index = 0; index < 5; index += 1) {
    const x = 44 + index * 74;
    const y = 420 + Math.sin(time * 0.5 + index) * 18;
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawContainer(ctx: CanvasRenderingContext2D, dangerRatio: number) {
  const fill = ctx.createLinearGradient(0, 0, 0, FLOOR);
  fill.addColorStop(0, 'rgba(56,189,248,0.02)');
  fill.addColorStop(0.72, 'rgba(8,145,178,0.05)');
  fill.addColorStop(1, 'rgba(8,145,178,0.1)');
  ctx.fillStyle = fill;
  ctx.fillRect(LEFT, 0, RIGHT - LEFT, FLOOR);

  ctx.save();
  ctx.shadowColor = 'rgba(56,189,248,0.7)';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = `rgba(125,211,252,${0.32 + dangerRatio * 0.28})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LEFT, 0);
  ctx.lineTo(LEFT, FLOOR);
  ctx.lineTo(RIGHT, FLOOR);
  ctx.lineTo(RIGHT, 0);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(224,242,254,0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT + 3, 0);
  ctx.lineTo(LEFT + 3, FLOOR - 3);
  ctx.lineTo(RIGHT - 3, FLOOR - 3);
  ctx.lineTo(RIGHT - 3, 0);
  ctx.stroke();
  ctx.restore();

  const floorGlow = ctx.createLinearGradient(0, FLOOR - 22, 0, FLOOR);
  floorGlow.addColorStop(0, 'rgba(34,211,238,0)');
  floorGlow.addColorStop(1, 'rgba(34,211,238,0.14)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(LEFT, FLOOR - 22, RIGHT - LEFT, 22);
}

function drawDangerLine(ctx: CanvasRenderingContext2D, time: number, dangerRatio: number) {
  const active = dangerRatio > 0.02;
  const pulse = active ? 0.55 + 0.35 * Math.sin(time * 15) : 0.32;
  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -time * 20;
  ctx.strokeStyle = `rgba(251,113,133,${pulse})`;
  ctx.lineWidth = active ? 1.6 : 1.2;
  ctx.beginPath();
  ctx.moveTo(LEFT + 4, DANGER_Y);
  ctx.lineTo(RIGHT - 4, DANGER_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(254,205,211,${active ? 0.85 : 0.5})`;
  ctx.font = '700 8px ui-monospace, monospace';
  ctx.textAlign = 'right';
  ctx.fillText('DANGER', RIGHT - 8, DANGER_Y - 6);
  if (active) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(254,205,211,0.75)';
    ctx.fillText('LIMIT', LEFT + 8, DANGER_Y - 6);
  }
  ctx.restore();
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  level: number,
  alpha = 1
) {
  const palette = PALETTES[Math.min(level, MAX_LEVEL)];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 10 + level * 2;
  const body = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.42,
    radius * 0.08,
    x,
    y,
    radius
  );
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.26, palette.light);
  body.addColorStop(0.72, palette.mid);
  body.addColorStop(1, palette.edge);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.lineWidth = Math.max(1, radius * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, radius - 0.8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1.1, radius * 0.13);
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.68, -2.55, -1.05);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.33, y - radius * 0.4, Math.max(1.1, radius * 0.1), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(8,47,73,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.86, 0.5, 2.5);
  ctx.stroke();
  ctx.restore();
}

function drawAimGuide(ctx: CanvasRenderingContext2D, game: GameState) {
  const radius = BUBBLE_RADII[game.currentLevel];
  const ready = game.cooldown <= 0;
  ctx.save();
  ctx.setLineDash([4, 9]);
  ctx.lineDashOffset = -game.time * 26;
  ctx.strokeStyle = ready ? 'rgba(186,230,253,0.17)' : 'rgba(186,230,253,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(game.aimX, SPAWN_Y + radius + 5);
  ctx.lineTo(game.aimX, FLOOR - 5);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = ready ? 0.45 : 0.2;
  ctx.fillStyle = 'rgba(186,230,253,0.3)';
  ctx.beginPath();
  ctx.ellipse(game.aimX, FLOOR - 2, radius, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCurrentBubble(ctx: CanvasRenderingContext2D, game: GameState) {
  const radius = BUBBLE_RADII[game.currentLevel];
  const ready = game.cooldown <= 0;
  const bob = Math.sin(game.time * 3.2) * 2;
  const y = SPAWN_Y + bob;
  drawBubble(ctx, game.aimX, y, radius, game.currentLevel, ready ? 1 : 0.32);
  if (!ready) {
    ctx.save();
    ctx.strokeStyle = 'rgba(253,230,138,0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      game.aimX,
      y,
      radius + 4,
      -Math.PI / 2,
      -Math.PI / 2 + (1 - game.cooldown / DROP_COOLDOWN) * Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }
}

function drawEffects(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const particle of game.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const ring of game.rings) {
    const lifeRatio = Math.max(0, ring.life / ring.maxLife);
    const progress = 1 - lifeRatio;
    ctx.globalAlpha = lifeRatio * 0.8;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 2 + progress * 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius + progress * 46, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  ctx.font = '700 12px ui-monospace, monospace';
  for (const text of game.texts) {
    ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
    ctx.fillStyle = text.color;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.restore();
}

function renderScene(ctx: CanvasRenderingContext2D, game: GameState) {
  const dangerRatio = game.dangerTimer / DANGER_LIMIT;
  ctx.save();
  if (game.shake > 0.1) {
    const shakeX = Math.sin(game.time * 89) * game.shake * 0.5;
    const shakeY = Math.cos(game.time * 71) * game.shake * 0.4;
    ctx.translate(shakeX, shakeY);
  }
  drawBackground(ctx, game.time, dangerRatio);
  drawContainer(ctx, dangerRatio);
  drawDangerLine(ctx, game.time, dangerRatio);
  if (game.phase === 'playing') drawAimGuide(ctx, game);
  for (const bubble of game.bubbles) {
    drawBubble(ctx, bubble.x, bubble.y, bubble.radius, bubble.level, 1);
  }
  if (game.phase === 'playing') drawCurrentBubble(ctx, game);
  drawEffects(ctx, game);
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(186,230,253,${Math.min(0.22, game.flash * 0.12)})`;
    ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);
  }
  const vignette = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.3,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.82
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);
  ctx.restore();
}

export function BubbleMergeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createInitialGame(0));
  const [hud, setHud] = useState<HudState>(() => toHud(gameRef.current));

  const syncHud = useCallback(() => {
    setHud(toHud(gameRef.current));
  }, []);

  const updateAim = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const radius = BUBBLE_RADII[game.currentLevel];
    const x = ((event.clientX - rect.left) / rect.width) * WORLD_W;
    game.aimX = clamp(x, LEFT + radius, RIGHT - radius);
  }, []);

  const dropBubble = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'playing' || game.cooldown > 0) return;
    const level = game.currentLevel;
    const radius = BUBBLE_RADII[level];
    const x = clamp(game.aimX, LEFT + radius, RIGHT - radius);
    game.bubbles.push({
      id: game.nextId,
      x,
      y: SPAWN_Y,
      vx: 0,
      vy: 30,
      radius,
      level,
      age: 0,
    });
    game.nextId += 1;
    game.dropped += 1;
    game.currentLevel = game.nextLevel;
    game.nextLevel = randomLevel();
    const nextRadius = BUBBLE_RADII[game.currentLevel];
    game.aimX = clamp(game.aimX, LEFT + nextRadius, RIGHT - nextRadius);
    game.cooldown = DROP_COOLDOWN;
    game.hudDirty = true;
  }, []);

  const resetGame = useCallback(() => {
    const best = gameRef.current.best;
    gameRef.current = createInitialGame(best);
    gameRef.current.currentLevel = randomLevel();
    gameRef.current.nextLevel = randomLevel();
    syncHud();
  }, [syncHud]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, a')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const game = gameRef.current;
      if (game.phase !== 'playing') return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      game.activePointer = event.pointerId;
      updateAim(event);
    },
    [updateAim]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (game.phase !== 'playing') return;
      if (game.activePointer !== null && game.activePointer !== event.pointerId) return;
      if (game.activePointer === event.pointerId) event.preventDefault();
      updateAim(event);
    },
    [updateAim]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (game.activePointer !== event.pointerId) return;
      event.preventDefault();
      updateAim(event);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      game.activePointer = null;
      dropBubble();
    },
    [dropBubble, updateAim]
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    if (game.activePointer !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    game.activePointer = null;
  }, []);

  useEffect(() => {
    const game = gameRef.current;
    const best = readBestScore();
    if (best > game.best) game.best = best;
    game.currentLevel = randomLevel();
    game.nextLevel = randomLevel();
    syncHud();
  }, [syncHud]);

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
    let accumulator = 0;
    const step = 1 / 120;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const game = gameRef.current;
      game.time += dt;
      game.shake = Math.max(0, game.shake - dt * 30);
      game.flash = Math.max(0, game.flash - dt * 2.4);
      updateEffects(game, dt);

      if (game.phase === 'playing') {
        game.cooldown = Math.max(0, game.cooldown - dt);
        if (game.combo > 0) {
          game.comboTimer -= dt;
          if (game.comboTimer <= 0) {
            game.combo = 0;
            game.comboTimer = 0;
            game.hudDirty = true;
          }
        }
        accumulator = Math.min(accumulator + dt, step * 6);
        while (accumulator >= step) {
          stepPhysics(game, step);
          accumulator -= step;
        }
        updateDanger(game, dt);
      }

      if (game.hudDirty) {
        game.hudDirty = false;
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
          renderScene(ctx, game);
        }
      }
      rafId = window.requestAnimationFrame(frame);
    };
    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [syncHud]);

  const nextPalette = PALETTES[hud.nextLevel];
  const nextSize = Math.min(32, 13 + hud.nextLevel * 4);
  const multiplier = comboMultiplier(hud.combo);

  return (
    <div className="min-h-screen bg-[#06111f] text-slate-100 select-none">
      <header className="border-b border-cyan-300/15 bg-[#071526]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/games"
              className="shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"
            >
              ← ゲーム一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-[0.18em] text-cyan-300/80">
                BUBBLE MERGE / バブル・マージ
              </p>
              <h2 className="truncate text-sm font-black sm:text-base">バブル・マージ</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-950/30 px-2.5 py-1 text-[10px] text-slate-300">
              BEST <span className="font-mono font-black text-cyan-200">{hud.best.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={resetGame}
              className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-black text-amber-200 transition hover:border-amber-300/70 hover:bg-amber-400/20"
            >
              リセット
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-2 px-3 py-3">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border border-cyan-300/15 bg-white/[0.03] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.18em] text-slate-400">SCORE</p>
            <p className="truncate font-mono text-2xl font-black leading-tight text-white">
              {hud.score.toLocaleString()}
            </p>
          </div>
          <div className="min-w-[64px] text-right">
            <p className="text-[9px] font-bold tracking-[0.18em] text-slate-400">COMBO</p>
            <p
              className={`font-mono text-xl font-black leading-tight ${
                hud.combo > 0 ? 'text-amber-300' : 'text-slate-600'
              }`}
            >
              x{multiplier.toFixed(2)}
            </p>
            <p className="text-[9px] font-bold text-slate-500">{hud.combo} COMBO</p>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-2">
            <div>
              <p className="text-[9px] font-bold tracking-[0.18em] text-slate-400">NEXT</p>
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center">
                <span
                  className="block rounded-full"
                  style={{
                    width: nextSize,
                    height: nextSize,
                    background: `radial-gradient(circle at 34% 30%, #ffffff 0%, ${nextPalette.light} 24%, ${nextPalette.mid} 68%, ${nextPalette.edge} 100%)`,
                    boxShadow: `0 0 14px ${nextPalette.glow}`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="relative touch-none overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#07192c] shadow-[0_0_70px_rgba(34,211,238,0.08)]"
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
            aria-label="バブル・マージのゲーム画面"
            className="block aspect-[13/20] w-full"
          />

          {hud.phase === 'playing' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-7">
              <div className="rounded-full border border-cyan-300/25 bg-black/55 px-3 py-1.5 text-center text-[10px] font-bold text-cyan-100 backdrop-blur">
                左右にドラッグして狙い、タップで落とす
              </div>
            </div>
          )}

          {hud.phase === 'over' && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="リザルト"
              className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-[#03101f]/90 px-4 py-6 text-center backdrop-blur-md"
            >
              <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300">RESULT</p>
              <h3 className="mt-1 text-2xl font-black text-white">ゲームオーバー</h3>
              <p className="mt-1 text-[11px] text-slate-300">泡が危険ラインを超えました</p>
              <div className="mt-4 w-full max-w-[280px] rounded-xl border border-white/10 bg-white/[0.05] p-3">
                <div className="flex items-end justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold text-slate-400">FINAL SCORE</span>
                  <span className="font-mono text-2xl font-black text-cyan-200">
                    {hud.score.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-left">
                  {[
                    { label: '最大コンボ', value: `${hud.maxCombo}` },
                    { label: 'マージ回数', value: `${hud.merges}` },
                    { label: '落とした泡', value: `${hud.dropped}` },
                    { label: 'ベスト', value: hud.best.toLocaleString() },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                      <p className="text-[9px] font-bold text-slate-500">{item.label}</p>
                      <p className="font-mono text-sm font-black text-slate-100">{item.value}</p>
                    </div>
                  ))}
                </div>
                {hud.newBest && (
                  <p className="mt-2 text-[10px] font-black tracking-[0.15em] text-amber-300">NEW BEST</p>
                )}
              </div>
              <button
                type="button"
                onClick={resetGame}
                className="mt-4 rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-400 to-sky-500 px-6 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.03]"
              >
                もう一度遊ぶ
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold text-slate-400">
          <span>同じサイズの泡は合体して大きくなる</span>
          <span className="text-cyan-200">最大サイズは大きく弾ける</span>
        </div>
      </div>
    </div>
  );
}
