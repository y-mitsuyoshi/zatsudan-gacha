'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WORLD_W = 390;
const WORLD_H = 600;
const WALL = 12;
const LEFT = WALL;
const RIGHT = WORLD_W - WALL;
const TOP = 0;
const FLOOR = WORLD_H - 14;
const FIXED_STEP = 1 / 120;
const MAX_BUBBLES = 120;
const MAX_LEVEL = 6;
const MAX_SPEED = 2600;
const MERGE_TOLERANCE = 10;
const MAX_PARTICLES = 520;
const MAX_RINGS = 48;
const TIER_RADII = Array.from({ length: MAX_LEVEL + 1 }, (_, level) =>
  9 * Math.pow(Math.SQRT2, level)
);

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

interface Settings {
  gravity: number;
  tension: number;
  minRadius: number;
  maxRadius: number;
  spawnRate: number;
  targetCount: number;
  elasticity: number;
  autoSpawn: boolean;
  paused: boolean;
  speed: number;
}

const DEFAULT_SETTINGS: Settings = {
  gravity: 420,
  tension: 0.55,
  minRadius: 9,
  maxRadius: 25.5,
  spawnRate: 1.6,
  targetCount: 24,
  elasticity: 0.28,
  autoSpawn: true,
  paused: false,
  speed: 1,
};

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

interface GameState {
  bubbles: Bubble[];
  particles: Particle[];
  rings: Ring[];
  merges: number;
  collisions: number;
  time: number;
  spawnTimer: number;
  shake: number;
  flash: number;
  nextId: number;
  activePointer: number | null;
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
  lastSpawnX: number;
  lastSpawnY: number;
  lastSpawnTime: number;
}

interface HudState {
  count: number;
  merges: number;
  largest: number;
  average: number;
  collisions: number;
}

const EMPTY_HUD: HudState = {
  count: 0,
  merges: 0,
  largest: 0,
  average: 0,
  collisions: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createInitialGame(): GameState {
  return {
    bubbles: [],
    particles: [],
    rings: [],
    merges: 0,
    collisions: 0,
    time: 0,
    spawnTimer: 0,
    shake: 0,
    flash: 0,
    nextId: 1,
    activePointer: null,
    pointerX: WORLD_W / 2,
    pointerY: WORLD_H / 2,
    pointerActive: false,
    lastSpawnX: WORLD_W / 2,
    lastSpawnY: WORLD_H / 2,
    lastSpawnTime: 0,
  };
}

function toHud(game: GameState): HudState {
  let largest = 0;
  let total = 0;
  for (const bubble of game.bubbles) {
    if (bubble.radius > largest) largest = bubble.radius;
    total += bubble.radius;
  }
  return {
    count: game.bubbles.length,
    merges: game.merges,
    largest,
    average: game.bubbles.length > 0 ? total / game.bubbles.length : 0,
    collisions: game.collisions,
  };
}

function pickSpawnLevel(settings: Settings): number {
  const allowed: number[] = [];
  for (let level = 0; level <= MAX_LEVEL; level += 1) {
    const radius = TIER_RADII[level];
    if (radius >= settings.minRadius - 0.01 && radius <= settings.maxRadius + 0.01) {
      allowed.push(level);
    }
  }
  if (allowed.length === 0) {
    const middle = (settings.minRadius + settings.maxRadius) / 2;
    let best = 0;
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      if (Math.abs(TIER_RADII[level] - middle) < Math.abs(TIER_RADII[best] - middle)) {
        best = level;
      }
    }
    return best;
  }
  const roll = Math.pow(Math.random(), 1.6);
  return allowed[Math.min(allowed.length - 1, Math.floor(roll * allowed.length))];
}

function pushBubble(
  game: GameState,
  x: number,
  y: number,
  level: number,
  vx = 0,
  vy = 0
): Bubble {
  const radius = TIER_RADII[level];
  const bubble: Bubble = {
    id: game.nextId,
    x: clamp(Number.isFinite(x) ? x : WORLD_W / 2, LEFT + radius, RIGHT - radius),
    y: clamp(Number.isFinite(y) ? y : WORLD_H / 2, TOP + radius, FLOOR - radius),
    vx: clamp(Number.isFinite(vx) ? vx : 0, -MAX_SPEED, MAX_SPEED),
    vy: clamp(Number.isFinite(vy) ? vy : 0, -MAX_SPEED, MAX_SPEED),
    radius,
    level,
    age: 0,
  };
  game.nextId += 1;
  game.bubbles.push(bubble);
  return bubble;
}

function spawnAtTop(game: GameState, settings: Settings): boolean {
  if (game.bubbles.length >= MAX_BUBBLES) return false;
  const level = pickSpawnLevel(settings);
  const radius = TIER_RADII[level];
  const span = Math.max(1, RIGHT - LEFT - radius * 2);
  const x = LEFT + radius + Math.random() * span;
  pushBubble(game, x, TOP + radius + 2, level, (Math.random() - 0.5) * 30, 40);
  return true;
}

function spawnAtPoint(game: GameState, settings: Settings, x: number, y: number): boolean {
  if (game.bubbles.length >= MAX_BUBBLES) return false;
  const level = pickSpawnLevel(settings);
  pushBubble(game, x, y, level, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20);
  return true;
}

function spawnInside(game: GameState, settings: Settings): boolean {
  if (game.bubbles.length >= MAX_BUBBLES) return false;
  const level = pickSpawnLevel(settings);
  const radius = TIER_RADII[level];
  const xMin = LEFT + radius;
  const xMax = RIGHT - radius;
  const yMin = TOP + radius;
  const yMax = FLOOR - radius;
  let x = (xMin + xMax) / 2;
  let y = (yMin + yMax) / 2;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    x = xMin + Math.random() * Math.max(1, xMax - xMin);
    y = yMin + Math.random() * Math.max(1, yMax - yMin);
    let clear = true;
    for (const bubble of game.bubbles) {
      const dx = bubble.x - x;
      const dy = bubble.y - y;
      const minDistance = bubble.radius + radius + 2;
      if (dx * dx + dy * dy < minDistance * minDistance) {
        clear = false;
        break;
      }
    }
    if (clear) break;
  }
  pushBubble(game, x, y, level, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
  return true;
}

function adjustPopulation(game: GameState, settings: Settings, target: number) {
  const desired = clamp(Math.round(target), 1, MAX_BUBBLES);
  let guard = 0;
  while (game.bubbles.length < desired && guard < MAX_BUBBLES) {
    if (!spawnInside(game, settings)) break;
    guard += 1;
  }
  while (game.bubbles.length > desired) {
    game.bubbles.pop();
  }
}

function triggerMerge(game: GameState, x: number, y: number, level: number, pop: boolean) {
  const palette = PALETTES[Math.min(level, MAX_LEVEL)];
  const count = 10 + level * 4 + (pop ? 18 : 0);
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * (90 + level * 28) + (pop ? 60 : 0);
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
  if (game.particles.length > MAX_PARTICLES) {
    game.particles.splice(0, game.particles.length - MAX_PARTICLES);
  }
  const ringRadius = TIER_RADII[Math.min(level + 1, MAX_LEVEL)] * (pop ? 0.9 : 0.65);
  game.rings.push({
    x,
    y,
    radius: ringRadius,
    life: pop ? 0.68 : 0.48,
    maxLife: pop ? 0.68 : 0.48,
    color: palette.mid,
  });
  if (pop) {
    game.rings.push({
      x,
      y,
      radius: ringRadius * 0.5,
      life: 0.78,
      maxLife: 0.78,
      color: '#ffffff',
    });
  }
  if (game.rings.length > MAX_RINGS) {
    game.rings.splice(0, game.rings.length - MAX_RINGS);
  }
  game.flash = Math.min(1, game.flash + (pop ? 0.3 : 0.08 + level * 0.025));
  game.shake = Math.max(game.shake, (pop ? 3 : 1) + level * 0.5);
}

function mergePair(game: GameState, first: Bubble, second: Bubble) {
  const level = first.level;
  const x = clamp((first.x + second.x) / 2, LEFT, RIGHT);
  const y = clamp((first.y + second.y) / 2, TOP, FLOOR);
  game.merges += 1;
  if (level < MAX_LEVEL) {
    pushBubble(
      game,
      x,
      y,
      level + 1,
      (first.vx + second.vx) * 0.25,
      (first.vy + second.vy) * 0.25 - 14
    );
  }
  triggerMerge(game, x, y, level, level >= MAX_LEVEL);
}

function resolveBubbles(game: GameState, settings: Settings, countCollisions: boolean) {
  const merged = new Set<number>();
  const bubbles = game.bubbles;
  const tolerance = settings.tension * MERGE_TOLERANCE;

  for (let i = 0; i < bubbles.length; i += 1) {
    const first = bubbles[i];
    if (merged.has(first.id)) continue;
    for (let j = i + 1; j < bubbles.length; j += 1) {
      const second = bubbles[j];
      if (merged.has(second.id)) continue;
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const minDistance = first.radius + second.radius;
      const distanceSq = dx * dx + dy * dy;
      const mergeDistance = minDistance + tolerance;
      if (distanceSq > mergeDistance * mergeDistance) continue;

      if (first.level === second.level) {
        merged.add(first.id);
        merged.add(second.id);
        mergePair(game, first, second);
        break;
      }

      if (distanceSq >= minDistance * minDistance) continue;
      const distance = Math.sqrt(distanceSq);
      const nx = distance > 0.001 ? dx / distance : 1;
      const ny = distance > 0.001 ? dy / distance : 0;
      const overlap = minDistance - Math.max(distance, 0.001);
      const massFirst = first.radius * first.radius;
      const massSecond = second.radius * second.radius;
      const totalMass = massFirst + massSecond;
      const firstShare = massSecond / totalMass;
      const secondShare = massFirst / totalMass;

      first.x -= nx * overlap * firstShare;
      first.y -= ny * overlap * firstShare;
      second.x += nx * overlap * secondShare;
      second.y += ny * overlap * secondShare;

      const relativeX = second.vx - first.vx;
      const relativeY = second.vy - first.vy;
      const normalVelocity = relativeX * nx + relativeY * ny;
      if (normalVelocity < 0) {
        const inverseFirst = 1 / massFirst;
        const inverseSecond = 1 / massSecond;
        const impulse =
          (-(1 + settings.elasticity) * normalVelocity) / (inverseFirst + inverseSecond);
        first.vx -= impulse * inverseFirst * nx;
        first.vy -= impulse * inverseFirst * ny;
        second.vx += impulse * inverseSecond * nx;
        second.vy += impulse * inverseSecond * ny;
        if (countCollisions) game.collisions += 1;
      }

      const tangentX = -ny;
      const tangentY = nx;
      const tangentVelocity = relativeX * tangentX + relativeY * tangentY;
      const friction = tangentVelocity * 0.02;
      first.vx += friction * tangentX * firstShare;
      first.vy += friction * tangentY * firstShare;
      second.vx -= friction * tangentX * secondShare;
      second.vy -= friction * tangentY * secondShare;
    }
  }

  if (merged.size > 0) {
    game.bubbles = bubbles.filter((bubble) => !merged.has(bubble.id));
  }
}

function stepPhysics(game: GameState, settings: Settings, dt: number) {
  const drag = Math.exp(-0.18 * dt);
  const wallBounce = Math.max(0.02, settings.elasticity * 0.9);
  const floorBounce = Math.max(0.02, settings.elasticity);

  for (const bubble of game.bubbles) {
    if (
      !Number.isFinite(bubble.x) ||
      !Number.isFinite(bubble.y) ||
      !Number.isFinite(bubble.vx) ||
      !Number.isFinite(bubble.vy)
    ) {
      bubble.x = WORLD_W / 2;
      bubble.y = FLOOR / 2;
      bubble.vx = 0;
      bubble.vy = 0;
    }
    bubble.age += dt;
    bubble.vy += settings.gravity * dt;
    bubble.vx *= drag;
    bubble.vy *= drag;
    bubble.vx = clamp(bubble.vx, -MAX_SPEED, MAX_SPEED);
    bubble.vy = clamp(bubble.vy, -MAX_SPEED, MAX_SPEED);
    bubble.x += bubble.vx * dt;
    bubble.y += bubble.vy * dt;

    if (bubble.x - bubble.radius < LEFT) {
      bubble.x = LEFT + bubble.radius;
      if (bubble.vx < 0) {
        bubble.vx = -bubble.vx * wallBounce;
        if (Math.abs(bubble.vx) > 20) game.collisions += 1;
      }
    }
    if (bubble.x + bubble.radius > RIGHT) {
      bubble.x = RIGHT - bubble.radius;
      if (bubble.vx > 0) {
        bubble.vx = -bubble.vx * wallBounce;
        if (Math.abs(bubble.vx) > 20) game.collisions += 1;
      }
    }
    if (bubble.y - bubble.radius < TOP) {
      bubble.y = TOP + bubble.radius;
      if (bubble.vy < 0) {
        bubble.vy = -bubble.vy * wallBounce;
        if (Math.abs(bubble.vy) > 20) game.collisions += 1;
      }
    }
    if (bubble.y + bubble.radius > FLOOR) {
      bubble.y = FLOOR - bubble.radius;
      if (bubble.vy > 0) {
        bubble.vy = -bubble.vy * floorBounce;
        if (Math.abs(bubble.vy) > 20) game.collisions += 1;
      }
      if (Math.abs(bubble.vy) < 16) bubble.vy = 0;
      bubble.vx *= 0.94;
    }
  }

  for (let iteration = 0; iteration < 3; iteration += 1) {
    resolveBubbles(game, settings, iteration === 0);
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
}

function updateAutoSpawn(game: GameState, settings: Settings, dt: number) {
  if (!settings.autoSpawn || settings.spawnRate <= 0) {
    game.spawnTimer = 0;
    return;
  }
  if (game.bubbles.length >= settings.targetCount) {
    game.spawnTimer = Math.min(game.spawnTimer, 0);
    return;
  }
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  spawnAtTop(game, settings);
  game.spawnTimer = Math.max(0.08, 1 / settings.spawnRate);
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

function drawBackground(ctx: CanvasRenderingContext2D, time: number) {
  const background = ctx.createLinearGradient(-30, -30, WORLD_W + 30, WORLD_H + 30);
  background.addColorStop(0, '#061221');
  background.addColorStop(0.55, '#081a2d');
  background.addColorStop(1, '#04101d');
  ctx.fillStyle = background;
  ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);

  const glow = ctx.createRadialGradient(WORLD_W / 2, WORLD_H * 0.88, 20, WORLD_W / 2, WORLD_H * 0.88, 320);
  glow.addColorStop(0, 'rgba(34,211,238,0.12)');
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

function drawContainer(ctx: CanvasRenderingContext2D) {
  const fill = ctx.createLinearGradient(0, 0, 0, FLOOR);
  fill.addColorStop(0, 'rgba(56,189,248,0.02)');
  fill.addColorStop(0.72, 'rgba(8,145,178,0.05)');
  fill.addColorStop(1, 'rgba(8,145,178,0.1)');
  ctx.fillStyle = fill;
  ctx.fillRect(LEFT, 0, RIGHT - LEFT, FLOOR);

  ctx.save();
  ctx.shadowColor = 'rgba(56,189,248,0.7)';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = 'rgba(125,211,252,0.4)';
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

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  level: number,
  withGlow: boolean
) {
  const palette = PALETTES[Math.min(level, MAX_LEVEL)];
  ctx.save();
  if (withGlow) {
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 8 + level * 2;
  }
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

function drawPointer(ctx: CanvasRenderingContext2D, game: GameState) {
  if (!game.pointerActive) return;
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.lineDashOffset = -game.time * 20;
  ctx.strokeStyle = 'rgba(186,230,253,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(game.pointerX, game.pointerY, 15 + Math.sin(game.time * 6) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
  ctx.restore();
}

function renderScene(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.save();
  if (game.shake > 0.1) {
    const shakeX = Math.sin(game.time * 89) * game.shake * 0.5;
    const shakeY = Math.cos(game.time * 71) * game.shake * 0.4;
    ctx.translate(shakeX, shakeY);
  }
  drawBackground(ctx, game.time);
  drawContainer(ctx);
  const withGlow = game.bubbles.length < 70;
  for (const bubble of game.bubbles) {
    drawBubble(ctx, bubble.x, bubble.y, bubble.radius, bubble.level, withGlow || bubble.level >= 3);
  }
  drawPointer(ctx, game);
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

function pointerToWorld(event: React.PointerEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: rect.width > 0 ? ((event.clientX - rect.left) / rect.width) * WORLD_W : WORLD_W / 2,
    y: rect.height > 0 ? ((event.clientY - rect.top) / rect.height) * WORLD_H : WORLD_H / 2,
  };
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-[78px_minmax(0,1fr)_48px] items-center gap-2">
      <span className="text-[10px] font-bold text-slate-300">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-5 w-full cursor-pointer accent-cyan-300"
      />
      <span className="text-right font-mono text-[10px] font-black text-cyan-200">{display}</span>
    </div>
  );
}

export function BubbleMergeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createInitialGame());
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);

  const syncHud = useCallback(() => {
    setHud(toHud(gameRef.current));
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const current = settingsRef.current;
      const next = { ...current, ...patch };
      settingsRef.current = next;
      setSettings(next);
      if (patch.targetCount !== undefined) {
        adjustPopulation(gameRef.current, next, next.targetCount);
        syncHud();
      }
    },
    [syncHud]
  );

  const handleStartSize = useCallback(
    (value: number) => {
      const current = settingsRef.current;
      updateSettings({
        minRadius: value,
        maxRadius: Math.max(value, current.maxRadius),
      });
    },
    [updateSettings]
  );

  const handleEndSize = useCallback(
    (value: number) => {
      const current = settingsRef.current;
      updateSettings({
        maxRadius: value,
        minRadius: Math.min(value, current.minRadius),
      });
    },
    [updateSettings]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, a, input')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const game = gameRef.current;
      const position = pointerToWorld(event);
      game.activePointer = event.pointerId;
      game.pointerX = position.x;
      game.pointerY = position.y;
      game.pointerActive = true;
      if (spawnAtPoint(game, settingsRef.current, position.x, position.y)) {
        game.lastSpawnX = position.x;
        game.lastSpawnY = position.y;
        game.lastSpawnTime = performance.now();
        syncHud();
      }
    },
    [syncHud]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (game.activePointer !== event.pointerId) return;
      event.preventDefault();
      const position = pointerToWorld(event);
      game.pointerX = position.x;
      game.pointerY = position.y;
      game.pointerActive = true;
      const now = performance.now();
      const distance = Math.hypot(position.x - game.lastSpawnX, position.y - game.lastSpawnY);
      if (distance < 18 && now - game.lastSpawnTime < 110) return;
      if (spawnAtPoint(game, settingsRef.current, position.x, position.y)) {
        game.lastSpawnX = position.x;
        game.lastSpawnY = position.y;
        game.lastSpawnTime = now;
        syncHud();
      }
    },
    [syncHud]
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    if (game.activePointer !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    game.activePointer = null;
    game.pointerActive = false;
  }, []);

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    if (game.activePointer !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    game.activePointer = null;
    game.pointerActive = false;
  }, []);

  const handleReset = useCallback(() => {
    const current = settingsRef.current;
    gameRef.current = createInitialGame();
    adjustPopulation(gameRef.current, current, current.targetCount);
    syncHud();
  }, [syncHud]);

  const handleStep = useCallback(() => {
    const game = gameRef.current;
    const current = settingsRef.current;
    if (!current.paused) updateSettings({ paused: true });
    stepPhysics(game, current, FIXED_STEP);
    updateEffects(game, FIXED_STEP);
    syncHud();
  }, [syncHud, updateSettings]);

  useEffect(() => {
    const game = gameRef.current;
    adjustPopulation(game, settingsRef.current, settingsRef.current.targetCount);
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
    let lastHud = 0;
    let accumulator = 0;
    const frame = (now: number) => {
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      const game = gameRef.current;
      const current = settingsRef.current;
      if (!current.paused) {
        const simDt = dt * current.speed;
        game.time += simDt;
        game.shake = Math.max(0, game.shake - simDt * 30);
        game.flash = Math.max(0, game.flash - simDt * 2.4);
        updateEffects(game, simDt);
        updateAutoSpawn(game, current, simDt);
        accumulator = Math.min(accumulator + simDt, FIXED_STEP * 16);
        let steps = 0;
        while (accumulator >= FIXED_STEP && steps < 16) {
          stepPhysics(game, current, FIXED_STEP);
          accumulator -= FIXED_STEP;
          steps += 1;
        }
      }
      if (now - lastHud > 180) {
        lastHud = now;
        setHud(toHud(game));
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
  }, []);

  const handleAutoSpawn = () => updateSettings({ autoSpawn: !settingsRef.current.autoSpawn });
  const handlePause = () => updateSettings({ paused: !settingsRef.current.paused });

  const stats = [
    { label: '泡の数', value: hud.count.toLocaleString() },
    { label: '合体回数', value: hud.merges.toLocaleString() },
    { label: '最大半径', value: hud.largest.toFixed(1) },
    { label: '平均半径', value: hud.average.toFixed(1) },
    { label: '衝突回数', value: hud.collisions.toLocaleString() },
  ];

  return (
    <div className="min-h-screen bg-[#06111f] text-slate-100 select-none">
      <header className="border-b border-cyan-300/15 bg-[#071526]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/games#simulation-games"
              className="shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"
            >
              ← シミュレーション一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-[0.18em] text-cyan-300/80">
                BUBBLE MERGE / PHYSICS LAB
              </p>
              <h2 className="truncate text-sm font-black sm:text-base">バブル・マージ・ラボ</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black ${
                settings.paused
                  ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
                  : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  settings.paused ? 'bg-amber-300' : 'bg-emerald-300'
                }`}
              />
              {settings.paused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-2.5 px-3 py-3">
        <div className="grid grid-cols-5 gap-1 rounded-xl border border-cyan-300/15 bg-white/[0.03] py-1.5">
          {stats.map((item) => (
            <div key={item.label} className="min-w-0 px-1 text-center">
              <p className="truncate text-[8px] font-bold tracking-[0.08em] text-slate-400">
                {item.label}
              </p>
              <p className="truncate font-mono text-xs font-black text-cyan-100">{item.value}</p>
            </div>
          ))}
        </div>

        <div
          className="relative touch-none overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#07192c] shadow-[0_0_70px_rgba(34,211,238,0.08)]"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handlePointerCancel}
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
        >
          <canvas
            ref={canvasRef}
            aria-label="バブル合体シミュレーターのキャンバス"
            className="block aspect-[13/20] w-full"
          />

          {settings.paused && (
            <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
              <span className="rounded-full border border-amber-300/30 bg-black/55 px-3 py-1 text-[10px] font-black tracking-[0.12em] text-amber-200 backdrop-blur">
                一時停止中
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-7">
            <div className="rounded-full border border-cyan-300/25 bg-black/55 px-3 py-1.5 text-center text-[10px] font-bold text-cyan-100 backdrop-blur">
              タップ / ドラッグで泡を追加
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleAutoSpawn}
              aria-pressed={settings.autoSpawn}
              className={`rounded-lg border px-2 py-2 text-[11px] font-black transition ${
                settings.autoSpawn
                  ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200'
                  : 'border-white/10 bg-white/[0.03] text-slate-400'
              }`}
            >
              自動生成 {settings.autoSpawn ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={handlePause}
              className={`rounded-lg border px-2 py-2 text-[11px] font-black transition ${
                settings.paused
                  ? 'border-amber-300/40 bg-amber-400/10 text-amber-200'
                  : 'border-cyan-300/30 bg-cyan-400/10 text-cyan-200'
              }`}
            >
              {settings.paused ? '再生' : '一時停止'}
            </button>
            <button
              type="button"
              onClick={handleStep}
              className="rounded-lg border border-sky-300/25 bg-sky-400/10 px-2 py-2 text-[11px] font-black text-sky-200 transition hover:border-sky-300/60"
            >
              1ステップ
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2 py-2 text-[11px] font-black text-amber-200 transition hover:border-amber-300/70 hover:bg-amber-400/20"
            >
              リセット
            </button>
          </div>

          <div className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2.5">
            <SliderRow
              label="重力"
              value={settings.gravity}
              display={`${Math.round(settings.gravity)}`}
              min={0}
              max={1800}
              step={20}
              onChange={(value) => updateSettings({ gravity: value })}
            />
            <SliderRow
              label="表面張力"
              value={settings.tension}
              display={`${Math.round(settings.tension * 100)}%`}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateSettings({ tension: value })}
            />
            <SliderRow
              label="最小サイズ"
              value={settings.minRadius}
              display={`${settings.minRadius.toFixed(1)}`}
              min={8}
              max={40}
              step={0.5}
              onChange={handleStartSize}
            />
            <SliderRow
              label="最大サイズ"
              value={settings.maxRadius}
              display={`${settings.maxRadius.toFixed(1)}`}
              min={12}
              max={72}
              step={0.5}
              onChange={handleEndSize}
            />
            <SliderRow
              label="発生レート"
              value={settings.spawnRate}
              display={`${settings.spawnRate.toFixed(1)}/s`}
              min={0}
              max={8}
              step={0.1}
              onChange={(value) => updateSettings({ spawnRate: value })}
            />
            <SliderRow
              label="泡の数"
              value={settings.targetCount}
              display={`${settings.targetCount}`}
              min={4}
              max={100}
              step={1}
              onChange={(value) => updateSettings({ targetCount: value })}
            />
            <SliderRow
              label="弾性"
              value={settings.elasticity}
              display={`${Math.round(settings.elasticity * 100)}%`}
              min={0}
              max={0.9}
              step={0.01}
              onChange={(value) => updateSettings({ elasticity: value })}
            />
            <SliderRow
              label="シミュ速度"
              value={settings.speed}
              display={`${settings.speed.toFixed(2)}x`}
              min={0.25}
              max={2.5}
              step={0.05}
              onChange={(value) => updateSettings({ speed: value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold text-slate-400">
          <span>同サイズの泡は合体して大きくなる</span>
          <span className="text-cyan-200">上限 {MAX_BUBBLES} 個</span>
        </div>
      </div>
    </div>
  );
}
