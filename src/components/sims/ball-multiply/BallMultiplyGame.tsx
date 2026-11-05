'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WORLD_W = 720;
const WORLD_H = 900;
const WALL = 24;
const LAUNCH_Y = 104;
const LAUNCH_MIN_X = 86;
const LAUNCH_MAX_X = WORLD_W - 86;
const ZONE_TOP = 806;
const COLLECT_Y = 840;
const GRAVITY = 880;
const BALL_RADIUS = 7;
const PEG_RADIUS = 8;
const MAX_BALLS = 150;
const LAUNCH_SUPPLY = 14;
const ROUND_TIME = 90;
const COMBO_WINDOW = 1.8;
const STORAGE_KEY = 'ball-multiply-best-v1';
const ZONE_VALUES = [40, 80, 160, 320, 160, 80, 40];
const ZONE_COLORS = ['#38bdf8', '#2dd4bf', '#a3e635', '#fbbf24', '#fb7185', '#c084fc', '#60a5fa'];
const BALL_COLORS = ['#5eead4', '#67e8f9', '#a5b4fc', '#f9a8d4', '#fde68a'];
const ZONE_WIDTH = (WORLD_W - WALL * 2) / ZONE_VALUES.length;

type Phase = 'ready' | 'playing' | 'result';

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
  splits: number;
  cooldown: number;
  color: number;
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
  pegs: Peg[];
  balls: Ball[];
  particles: Particle[];
  texts: FloatText[];
  score: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  dropsLeft: number;
  collected: number;
  timeLeft: number;
  time: number;
  aimX: number;
  aiming: boolean;
  pointerId: number | null;
  launcherFlash: number;
  zoneFlash: number[];
  bestScore: number;
  endReason: string;
  victory: boolean;
  shake: number;
}

interface HudState {
  phase: Phase;
  score: number;
  combo: number;
  multiplier: number;
  maxCombo: number;
  dropsLeft: number;
  activeBalls: number;
  collected: number;
  timeLeft: number;
  bestScore: number;
  endReason: string;
  victory: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function comboMultiplier(combo: number): number {
  return 1 + Math.min(4, Math.floor(combo / 5) * 0.5);
}

function zoneIndexForX(x: number): number {
  const index = Math.floor((x - WALL) / ZONE_WIDTH);
  return clamp(index, 0, ZONE_VALUES.length - 1);
}

function createPegs(): Peg[] {
  const pegs: Peg[] = [];
  const rows = 8;
  const rowGap = 62;
  const startY = 214;
  const margin = 56;
  const unit = (WORLD_W - margin * 2) / 7;
  for (let row = 0; row < rows; row += 1) {
    const count = row % 2 === 0 ? 8 : 7;
    const offset = row % 2 === 0 ? 0 : 0.5;
    for (let col = 0; col < count; col += 1) {
      pegs.push({
        x: margin + (col + offset) * unit,
        y: startY + row * rowGap,
        r: PEG_RADIUS,
        golden: (row * 5 + col * 3) % 17 === 0,
        flash: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  return pegs;
}

function readBestScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
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
    phase: 'ready',
    pegs: createPegs(),
    balls: [],
    particles: [],
    texts: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    dropsLeft: LAUNCH_SUPPLY,
    collected: 0,
    timeLeft: ROUND_TIME,
    time: 0,
    aimX: WORLD_W / 2,
    aiming: false,
    pointerId: null,
    launcherFlash: 0,
    zoneFlash: ZONE_VALUES.map(() => 0),
    bestScore,
    endReason: '',
    victory: false,
    shake: 0,
  };
}

function resetRun(game: GameState) {
  game.phase = 'playing';
  game.pegs = createPegs();
  game.balls = [];
  game.particles = [];
  game.texts = [];
  game.score = 0;
  game.combo = 0;
  game.maxCombo = 0;
  game.comboTimer = 0;
  game.dropsLeft = LAUNCH_SUPPLY;
  game.collected = 0;
  game.timeLeft = ROUND_TIME;
  game.time = 0;
  game.aimX = WORLD_W / 2;
  game.aiming = false;
  game.pointerId = null;
  game.launcherFlash = 0;
  game.zoneFlash = ZONE_VALUES.map(() => 0);
  game.endReason = '';
  game.victory = false;
  game.shake = 0;
}

function toHud(game: GameState): HudState {
  return {
    phase: game.phase,
    score: game.score,
    combo: game.combo,
    multiplier: comboMultiplier(game.combo),
    maxCombo: game.maxCombo,
    dropsLeft: game.dropsLeft,
    activeBalls: game.balls.length,
    collected: game.collected,
    timeLeft: game.timeLeft,
    bestScore: game.bestScore,
    endReason: game.endReason,
    victory: game.victory,
  };
}

function spawnBurst(game: GameState, x: number, y: number, color: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.7;
    const speed = 40 + Math.random() * 170;
    const life = 0.4 + Math.random() * 0.6;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 1 + Math.random() * 2.6,
      color,
    });
  }
}

function addText(game: GameState, x: number, y: number, text: string, color: string) {
  game.texts.push({
    x,
    y,
    text,
    life: 1,
    maxLife: 1,
    color,
  });
}

function updateEffects(game: GameState, dt: number) {
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.985;
    particle.vy = particle.vy * 0.985 + 40 * dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
  for (const text of game.texts) {
    text.life -= dt;
    text.y -= 34 * dt;
  }
  game.texts = game.texts.filter((text) => text.life > 0);
  for (let index = 0; index < game.zoneFlash.length; index += 1) {
    if (game.zoneFlash[index] > 0) {
      game.zoneFlash[index] = Math.max(0, game.zoneFlash[index] - dt * 2.6);
    }
  }
  if (game.launcherFlash > 0) game.launcherFlash = Math.max(0, game.launcherFlash - dt * 2.4);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 22);
  for (const peg of game.pegs) {
    if (peg.flash > 0) peg.flash = Math.max(0, peg.flash - dt * 3.4);
  }
}

function collectBall(game: GameState, ball: Ball) {
  const index = zoneIndexForX(ball.x);
  game.combo += 1;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  game.comboTimer = COMBO_WINDOW;
  const multiplier = comboMultiplier(game.combo);
  const points = Math.round(ZONE_VALUES[index] * multiplier);
  game.score += points;
  game.collected += 1;
  game.zoneFlash[index] = 1;
  game.shake = Math.min(7, game.shake + 1.4);
  const color = ZONE_COLORS[index] ?? '#5eead4';
  spawnBurst(game, ball.x, COLLECT_Y - 8, color, 11);
  addText(game, ball.x, COLLECT_Y - 24, `+${points}`, color);
  if (multiplier > 1) {
    addText(game, ball.x, COLLECT_Y - 46, `x${multiplier}`, '#fef3c7');
  }
}

function finishRun(game: GameState, victory: boolean, reason: string) {
  if (game.phase !== 'playing') return;
  game.phase = 'result';
  game.victory = victory;
  game.endReason = reason;
  game.aiming = false;
  game.pointerId = null;
  if (game.score > game.bestScore) {
    game.bestScore = game.score;
    writeBestScore(game.bestScore);
  }
}

function updateGame(game: GameState, dt: number) {
  game.time += dt;
  updateEffects(game, dt);

  if (game.phase !== 'playing') return;

  game.timeLeft = Math.max(0, game.timeLeft - dt);
  if (game.comboTimer > 0) {
    game.comboTimer = Math.max(0, game.comboTimer - dt);
    if (game.comboTimer === 0 && game.combo > 0) game.combo = 0;
  }

  const substeps = Math.min(4, Math.max(1, Math.ceil(dt / (1 / 120))));
  const stepDt = dt / substeps;
  for (let step = 0; step < substeps; step += 1) {
    for (let index = game.balls.length - 1; index >= 0; index -= 1) {
      const ball = game.balls[index];
      if (!ball) continue;
      ball.cooldown = Math.max(0, ball.cooldown - stepDt);
      ball.vy = Math.min(1100, ball.vy + GRAVITY * stepDt);
      ball.vx = clamp(ball.vx * 0.999, -520, 520);
      ball.x += ball.vx * stepDt;
      ball.y += ball.vy * stepDt;

      if (ball.x - ball.r < WALL) {
        ball.x = WALL + ball.r;
        ball.vx = Math.abs(ball.vx) * 0.58;
      }
      if (ball.x + ball.r > WORLD_W - WALL) {
        ball.x = WORLD_W - WALL - ball.r;
        ball.vx = -Math.abs(ball.vx) * 0.58;
      }

      for (const peg of game.pegs) {
        if (Math.abs(peg.y - ball.y) > 28 || Math.abs(peg.x - ball.x) > 28) continue;
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
          ball.vx -= 1.6 * dot * nx;
          ball.vy -= 1.6 * dot * ny;
        }
        ball.vx += (Math.random() - 0.5) * 80;
        ball.vy = Math.abs(ball.vy) * 0.65 + 30;
        peg.flash = 1;

        if (peg.golden) {
          game.score += 25;
          ball.splits = Math.min(5, ball.splits + 1);
          spawnBurst(game, peg.x, peg.y, '#fbbf24', 8);
          addText(game, peg.x, peg.y - 14, '+25', '#fbbf24');
        }

        if (ball.cooldown === 0 && ball.splits > 0 && game.balls.length < MAX_BALLS) {
          ball.splits -= 1;
          ball.cooldown = 0.12;
          const color = (ball.color + 1) % BALL_COLORS.length;
          const child: Ball = {
            x: peg.x + nx * (minDist + 1),
            y: peg.y + ny * (minDist + 1),
            vx: ball.vx * 0.72 + (Math.random() - 0.5) * 170,
            vy: Math.abs(ball.vy) * 0.55 + 30,
            r: Math.max(4.5, ball.r - 0.6),
            splits: ball.splits,
            cooldown: 0.16,
            color,
          };
          game.balls.push(child);
          spawnBurst(game, child.x, child.y, BALL_COLORS[color] ?? '#5eead4', 5);
        }
        break;
      }

      if (ball.y + ball.r >= COLLECT_Y) {
        collectBall(game, ball);
        game.balls.splice(index, 1);
        continue;
      }
      if (ball.y > WORLD_H + 80) {
        game.balls.splice(index, 1);
      }
    }
  }

  if (game.balls.length === 0 && game.dropsLeft === 0) {
    finishRun(game, true, 'すべてのボールを回収しました');
  } else if (game.timeLeft <= 0) {
    finishRun(game, false, '制限時間が終了しました');
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
  glowB.addColorStop(0, 'rgba(251,191,36,0.09)');
  glowB.addColorStop(0.55, 'rgba(180,83,9,0.04)');
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  ctx.save();
  ctx.strokeStyle = 'rgba(94,234,212,0.05)';
  ctx.lineWidth = 1;
  for (let x = WALL; x <= WORLD_W - WALL; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 130);
    ctx.lineTo(x, ZONE_TOP);
    ctx.stroke();
  }
  for (let y = 160; y < ZONE_TOP; y += 48) {
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
  ctx.lineTo(WALL, ZONE_TOP);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(WORLD_W - WALL, LAUNCH_Y + 24);
  ctx.lineTo(WORLD_W - WALL, ZONE_TOP);
  ctx.stroke();
  ctx.restore();
}

function drawZones(ctx: CanvasRenderingContext2D, game: GameState) {
  const top = ZONE_TOP;
  const height = WORLD_H - top - 12;
  for (let index = 0; index < ZONE_VALUES.length; index += 1) {
    const x = WALL + index * ZONE_WIDTH;
    const flash = game.zoneFlash[index] ?? 0;
    const color = ZONE_COLORS[index] ?? '#5eead4';
    const gradient = ctx.createLinearGradient(0, top, 0, top + height);
    gradient.addColorStop(0, `${color}22`);
    gradient.addColorStop(0.5, `${color}${flash > 0.2 ? '66' : '38'}`);
    gradient.addColorStop(1, `${color}${flash > 0.2 ? '99' : '55'}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x + 1, top, ZONE_WIDTH - 2, height);

    ctx.save();
    ctx.globalAlpha = 0.35 + flash * 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, top + 0.75, ZONE_WIDTH - 1.5, height - 1.5);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    ctx.textAlign = 'center';
    ctx.font = '700 16px ui-monospace, monospace';
    ctx.fillText(String(ZONE_VALUES[index]), x + ZONE_WIDTH / 2, top + height * 0.55);
    ctx.globalAlpha = 0.5;
    ctx.font = '600 9px ui-monospace, monospace';
    ctx.fillText('PTS', x + ZONE_WIDTH / 2, top + height * 0.78);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(253,230,138,0.72)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WALL, top);
  ctx.lineTo(WORLD_W - WALL, top);
  ctx.stroke();
  ctx.restore();
}

function drawPegs(ctx: CanvasRenderingContext2D, game: GameState) {
  for (const peg of game.pegs) {
    const pulse = 0.5 + 0.5 * Math.sin(game.time * 2 + peg.phase);
    const color = peg.golden ? '#fbbf24' : '#5eead4';
    ctx.save();
    if (peg.golden) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 16 + peg.flash * 22;
    }
    const gradient = ctx.createRadialGradient(peg.x - peg.r * 0.35, peg.y - peg.r * 0.4, 1, peg.x, peg.y, peg.r);
    gradient.addColorStop(0, peg.golden ? '#fef3c7' : '#ccfbf1');
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, peg.golden ? '#92400e' : '#0f766e');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = (peg.golden ? 0.34 : 0.15) + peg.flash * 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2 + peg.flash * 2;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r + 2 + peg.flash * 5 + (peg.golden ? pulse * 2 : 0), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawLauncher(ctx: CanvasRenderingContext2D, game: GameState) {
  const x = game.aimX;
  const active = game.phase === 'playing' && game.dropsLeft > 0;
  ctx.save();
  const glow = ctx.createRadialGradient(x, LAUNCH_Y, 2, x, LAUNCH_Y, 60);
  glow.addColorStop(0, `rgba(94,234,212,${active ? 0.35 : 0.1})`);
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

  ctx.fillStyle = active ? '#ccfbf1' : '#475569';
  ctx.shadowColor = active ? '#5eead4' : 'transparent';
  ctx.shadowBlur = active ? 18 : 0;
  ctx.beginPath();
  ctx.arc(x, LAUNCH_Y + 16, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (game.launcherFlash > 0) {
    ctx.globalAlpha = game.launcherFlash;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, LAUNCH_Y + 16, 14 + (1 - game.launcherFlash) * 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(153,246,228,0.75)';
  ctx.font = '700 10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DROP', x, LAUNCH_Y - 38);
  ctx.restore();
}

function drawAimGuide(ctx: CanvasRenderingContext2D, game: GameState) {
  const x = game.aimX;
  const active = game.phase === 'playing' && game.dropsLeft > 0;
  const index = zoneIndexForX(x);
  const color = ZONE_COLORS[index] ?? '#5eead4';
  ctx.save();
  ctx.setLineDash([5, 10]);
  ctx.strokeStyle = active ? 'rgba(94,234,212,0.35)' : 'rgba(94,234,212,0.12)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, LAUNCH_Y + 30);
  ctx.lineTo(x, COLLECT_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = color;
  ctx.globalAlpha = active ? 0.85 : 0.35;
  ctx.beginPath();
  ctx.arc(x, COLLECT_Y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, COLLECT_Y, 12 + Math.sin(game.time * 4) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBalls(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const ball of game.balls) {
    const color = BALL_COLORS[ball.color] ?? '#5eead4';
    const glow = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, ball.r * 4);
    glow.addColorStop(0, `${color}cc`);
    glow.addColorStop(0.45, `${color}44`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const ball of game.balls) {
    const color = BALL_COLORS[ball.color] ?? '#5eead4';
    const gradient = ctx.createRadialGradient(
      ball.x - ball.r * 0.35,
      ball.y - ball.r * 0.4,
      1,
      ball.x,
      ball.y,
      ball.r
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, '#0f766e');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
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

function drawTexts(ctx: CanvasRenderingContext2D, texts: FloatText[]) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 13px ui-monospace, monospace';
  for (const text of texts) {
    const alpha = Math.max(0, text.life / text.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.restore();
}

function renderScene(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.save();
  if (game.shake > 0.1) {
    ctx.translate(Math.sin(game.time * 90) * game.shake * 0.4, Math.cos(game.time * 71) * game.shake * 0.3);
  }
  drawBackground(ctx, game.time);
  drawZones(ctx, game);
  drawPegs(ctx, game);
  if (game.phase !== 'result') drawAimGuide(ctx, game);
  drawLauncher(ctx, game);
  drawBalls(ctx, game);
  drawParticles(ctx, game.particles);
  drawTexts(ctx, game.texts);

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

export function BallMultiplyGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createInitialGame(0));
  const hudRef = useRef<HudState | null>(null);
  const [hud, setHud] = useState<HudState>(() => toHud(gameRef.current));

  const syncHud = useCallback(() => {
    const next = toHud(gameRef.current);
    const prev = hudRef.current;
    if (
      prev !== null &&
      prev.phase === next.phase &&
      prev.score === next.score &&
      prev.combo === next.combo &&
      prev.multiplier === next.multiplier &&
      prev.maxCombo === next.maxCombo &&
      prev.dropsLeft === next.dropsLeft &&
      prev.activeBalls === next.activeBalls &&
      prev.collected === next.collected &&
      Math.ceil(prev.timeLeft) === Math.ceil(next.timeLeft) &&
      prev.bestScore === next.bestScore &&
      prev.endReason === next.endReason &&
      prev.victory === next.victory
    ) {
      return;
    }
    hudRef.current = next;
    setHud(next);
  }, []);

  const startGame = useCallback(() => {
    resetRun(gameRef.current);
    syncHud();
  }, [syncHud]);

  const launchBall = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'playing' || game.dropsLeft <= 0) return;
    if (game.balls.length >= MAX_BALLS) return;
    game.dropsLeft -= 1;
    game.launcherFlash = 1;
    const color = Math.floor(Math.random() * BALL_COLORS.length);
    game.balls.push({
      x: game.aimX,
      y: LAUNCH_Y + 22,
      vx: (Math.random() - 0.5) * 30,
      vy: 55 + Math.random() * 25,
      r: BALL_RADIUS,
      splits: 3,
      cooldown: 0.1,
      color,
    });
    spawnBurst(game, game.aimX, LAUNCH_Y + 22, BALL_COLORS[color] ?? '#5eead4', 8);
    syncHud();
  }, [syncHud]);

  const updateAim = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * WORLD_W;
    gameRef.current.aimX = clamp(x, LAUNCH_MIN_X, LAUNCH_MAX_X);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, a')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const game = gameRef.current;
      if (game.phase !== 'playing' || game.dropsLeft <= 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      game.aiming = true;
      game.pointerId = event.pointerId;
      updateAim(event);
    },
    [updateAim]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (!game.aiming || game.pointerId !== event.pointerId) return;
      event.preventDefault();
      updateAim(event);
    },
    [updateAim]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (!game.aiming || game.pointerId !== event.pointerId) return;
      event.preventDefault();
      updateAim(event);
      game.aiming = false;
      game.pointerId = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      launchBall();
    },
    [launchBall, updateAim]
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    if (game.pointerId === event.pointerId) {
      game.aiming = false;
      game.pointerId = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    const best = readBestScore();
    if (best > gameRef.current.bestScore) {
      gameRef.current.bestScore = best;
      syncHud();
    }
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
    let hudAccumulator = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;
      const game = gameRef.current;
      updateGame(game, dt);
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
          renderScene(ctx, game);
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
              href="/games"
              className="shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-teal-100/70 transition hover:border-teal-300/50 hover:text-teal-200 sm:px-3 sm:text-xs"
            >
              ゲーム一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-[0.18em] text-teal-300/80 sm:text-[10px]">
                BALL MULTIPLY / CASCADE SIMULATOR
              </p>
              <h2 className="truncate text-sm font-black sm:text-lg">増殖ボール・カスケード</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden rounded-lg border border-teal-400/20 bg-teal-950/30 px-2.5 py-1 text-[10px] text-teal-100/70 sm:block">
              BEST <span className="font-mono font-black text-teal-200">{hud.bestScore.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={startGame}
              className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-black text-amber-200 transition hover:border-amber-300/70 hover:bg-amber-400/20 sm:text-xs"
            >
              リセット
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:grid-cols-[minmax(0,600px)_300px] lg:justify-center lg:gap-5">
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
            <canvas ref={canvasRef} aria-label="増殖ボール・カスケードのゲーム画面" className="block aspect-[4/5] w-full" />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent p-2.5 sm:p-3">
              <div className="min-w-0">
                <p className="font-mono text-2xl font-black leading-tight text-white sm:text-3xl">
                  {hud.score.toLocaleString()}
                </p>
                <p className="text-[9px] font-bold text-teal-100/50">SCORE</p>
                <p className="mt-1 text-[9px] font-bold text-teal-200/80">
                  BALLS <span className="font-mono">{hud.activeBalls}</span>
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-xl font-black leading-tight ${
                    hud.combo > 0 ? 'text-amber-300' : 'text-slate-500'
                  }`}
                >
                  {hud.combo}
                  <span className="ml-1 text-[10px]">COMBO</span>
                </p>
                <p className="text-[9px] font-bold text-teal-100/50">MULTIPLIER x{hud.multiplier.toFixed(1)}</p>
                <p className="mt-1 text-[9px] font-bold text-teal-200">
                  DROP <span className="font-mono">{hud.dropsLeft}</span>
                </p>
                <p className="text-[9px] font-bold text-amber-200">
                  TIME <span className="font-mono">{Math.ceil(hud.timeLeft)}s</span>
                </p>
              </div>
            </div>

            {hud.phase === 'ready' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-[#03110f]/85 px-5 py-6 text-center backdrop-blur-sm">
                <p className="text-[10px] font-black tracking-[0.28em] text-teal-300">BALL MULTIPLY CASCADE</p>
                <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">増殖ボール・カスケード</h3>
                <p className="mt-2 max-w-xs text-[11px] leading-6 text-teal-50/75">
                  ピンに当たるたびにボールが分裂。ドラッグで狙いを定め、指を離してドロップ。7つの回収ゾーンへ導いてコンボを繋げよう。
                </p>
                <div className="mt-4 flex gap-3 text-[10px] font-bold text-teal-200/80">
                  <span>ドロップ {LAUNCH_SUPPLY}</span>
                  <span>制限時間 {ROUND_TIME}秒</span>
                </div>
                <button
                  type="button"
                  onClick={startGame}
                  className="mt-4 rounded-xl border-2 border-teal-300 bg-gradient-to-r from-teal-400 to-emerald-500 px-6 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.03]"
                >
                  ゲームスタート
                </button>
                <p className="mt-3 text-[10px] text-teal-100/50">タップでもその位置からドロップできます</p>
              </div>
            )}

            {hud.phase === 'result' && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="リザルト"
                className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-[#020d0c]/90 px-4 py-6 text-center backdrop-blur-md"
              >
                <p className="text-[10px] font-black tracking-[0.25em] text-teal-300">
                  {hud.victory ? 'CASCADE COMPLETE' : 'SESSION REPORT'}
                </p>
                <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  {hud.victory ? '全ボール回収' : 'リザルト'}
                </h3>
                <p className="mt-1 text-[11px] text-teal-100/60">{hud.endReason}</p>
                <div className="mt-4 w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-end justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-bold text-teal-100/50">FINAL SCORE</span>
                    <span className="font-mono text-2xl font-black text-teal-200">{hud.score.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-left">
                    {[
                      { label: '回収ボール', value: `${hud.collected}` },
                      { label: '最大コンボ', value: `${hud.maxCombo}` },
                      { label: '残りドロップ', value: `${hud.dropsLeft}` },
                      { label: 'ランク', value: hud.score >= 8000 ? 'S' : hud.score >= 5000 ? 'A' : hud.score >= 2500 ? 'B' : 'C' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                        <p className="text-[9px] font-bold text-teal-100/40">{item.label}</p>
                        <p className="font-mono text-sm font-black text-teal-50">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-amber-200">自己ベスト {hud.bestScore.toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={startGame}
                  className="mt-4 rounded-xl border-2 border-teal-300 bg-gradient-to-r from-teal-400 to-emerald-500 px-6 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.03]"
                >
                  もう一度挑戦する
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-teal-100/60 sm:text-xs">
              <span>残りドロップ</span>
              <span className="flex items-center gap-1">
                {Array.from({ length: LAUNCH_SUPPLY }, (_, index) => (
                  <span
                    key={index}
                    className={`h-2 w-2 rounded-full ${
                      index < hud.dropsLeft ? 'bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.9)]' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </span>
              <span className="font-mono text-teal-200">
                {hud.dropsLeft}/{LAUNCH_SUPPLY}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-teal-100/60 sm:text-xs">
              <span className="font-bold text-amber-200">TIME {Math.ceil(hud.timeLeft)}s</span>
              <span className="hidden sm:inline">ドラッグで狙い・離してドロップ</span>
            </div>
          </div>
        </div>

        <aside className="mx-auto flex w-full max-w-[560px] flex-col gap-2.5 sm:gap-3 lg:mx-0 lg:max-w-none">
          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">HOW TO PLAY</span>
              <span className="text-[10px] text-teal-100/50">3 STEPS</span>
            </div>
            <ol className="mt-2 space-y-2 text-[11px] leading-5 text-teal-100/75">
              <li>1. 画面をドラッグして落とす位置を決める</li>
              <li>2. 指を離してボールをドロップ</li>
              <li>3. 分裂したボールを回収ゾーンへ導く</li>
            </ol>
          </div>

          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">SESSION</span>
              <span className="text-[10px] text-teal-100/50">STATUS</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { label: 'フィールド上', value: `${hud.activeBalls}` },
                { label: '回収ボール', value: `${hud.collected}` },
                { label: '最大コンボ', value: `${hud.maxCombo}` },
                { label: '倍率', value: `x${hud.multiplier.toFixed(1)}` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                  <p className="text-[9px] font-bold text-teal-100/40">{item.label}</p>
                  <p className="font-mono text-sm font-black text-teal-50">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-bold text-teal-100/50">
                <span>TIME</span>
                <span className="font-mono text-teal-200">{Math.ceil(hud.timeLeft)}s</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-300 to-amber-300"
                  style={{ width: `${Math.max(0, Math.min(100, (hud.timeLeft / ROUND_TIME) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-teal-400/15 bg-[#071b19]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-teal-300">CASCADE RULES</span>
              <span className="text-[10px] text-teal-100/50">TIPS</span>
            </div>
            <div className="mt-2 space-y-2 text-[11px] leading-5 text-teal-100/70">
              <p>
                <span className="font-bold text-teal-200">分裂</span> ピンに当たるたび最大3回まで分裂
              </p>
              <p>
                <span className="font-bold text-amber-200">金ピン</span> 25点と分裂回数1回を追加
              </p>
              <p>
                <span className="font-bold text-teal-200">コンボ</span> 連続回収で最大5倍の倍率
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
