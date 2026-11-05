'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WORLD_W = 720;
const WORLD_H = 900;
const LAUNCH_X = 360;
const LAUNCH_Y = 792;
const PROBE_RADIUS = 8;
const STAR_PICKUP = 30;
const MAX_DRAG = 280;
const MIN_LAUNCH_SPEED = 95;
const MAX_LAUNCH_SPEED = 430;
const PROBES_PER_ROUND = 3;
const TOTAL_ROUNDS = 6;
const PROBE_LIFETIME = 10;
const STORAGE_KEY = 'gravity-orbit-best-v1';

type Phase = 'aiming' | 'flying' | 'roundClear' | 'result' | 'victory';

interface Planet {
  x: number;
  y: number;
  radius: number;
  gravity: number;
  name: string;
  ring: boolean;
  glow: string;
  light: string;
  mid: string;
  dark: string;
}

interface StarNode {
  x: number;
  y: number;
  phase: number;
  collected: boolean;
}

interface RoundConfig {
  name: string;
  tagline: string;
  planets: Planet[];
  stars: StarNode[];
}

interface AimState {
  active: boolean;
  x: number;
  y: number;
  pointerId: number | null;
}

interface TrailPoint {
  x: number;
  y: number;
}

interface Probe {
  x: number;
  y: number;
  vx: number;
  vy: number;
  time: number;
  trail: TrailPoint[];
  active: boolean;
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
  roundConfigs: RoundConfig[];
  round: number;
  score: number;
  combo: number;
  maxCombo: number;
  launches: number;
  probesLeft: number;
  starsCollected: number;
  starsTotal: number;
  totalStarsCollected: number;
  roundBonus: number;
  roundTimer: number;
  endReason: string;
  bestScore: number;
  probe: Probe | null;
  aim: AimState;
  particles: Particle[];
  texts: FloatText[];
  time: number;
  shake: number;
  flash: number;
}

interface HudState {
  phase: Phase;
  round: number;
  score: number;
  combo: number;
  multiplier: number;
  maxCombo: number;
  launches: number;
  probesLeft: number;
  starsCollected: number;
  starsTotal: number;
  totalStars: number;
  availableStars: number;
  roundName: string;
  roundTagline: string;
  roundBonus: number;
  bestScore: number;
  endReason: string;
}

class OrbitSound {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) this.ctx = new AudioCtor();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  launch() {
    this.tone(180, 520, 0.22, 'sine', 0.11);
    this.tone(440, 160, 0.12, 'triangle', 0.05, 0.02);
  }

  star(combo: number) {
    const base = 520 + Math.min(combo, 12) * 38;
    this.tone(base, base * 1.4, 0.12, 'sine', 0.07);
    this.tone(base * 1.5, base * 2, 0.09, 'triangle', 0.035, 0.03);
  }

  crash() {
    this.tone(180, 45, 0.42, 'sawtooth', 0.09);
    this.tone(420, 55, 0.3, 'square', 0.04);
  }

  recall() {
    this.tone(320, 140, 0.22, 'sine', 0.045);
  }

  clear() {
    [523, 659, 784, 1046].forEach((freq, index) => {
      this.tone(freq, freq * 1.01, 0.16, 'sine', 0.07, index * 0.09);
    });
  }

  victory() {
    [523, 659, 784, 1046, 1318].forEach((freq, index) => {
      this.tone(freq, freq * 1.02, 0.24, 'triangle', 0.07, index * 0.11);
    });
  }

  fail() {
    this.tone(220, 110, 0.5, 'sine', 0.06);
  }

  ui() {
    this.tone(420, 520, 0.06, 'sine', 0.04);
  }
}

const sound = new OrbitSound();

function placeStar(x: number, y: number, phase: number): StarNode {
  return { x, y, phase, collected: false };
}

function orbitStar(cx: number, cy: number, radius: number, degrees: number, phase: number): StarNode {
  const angle = (degrees * Math.PI) / 180;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
    phase,
    collected: false,
  };
}

function createRoundConfigs(): RoundConfig[] {
  return [
    {
      name: 'LUMINA GATE',
      tagline: 'ルミナの淡い環をなぞり、最初の軌道をつくる',
      planets: [
        {
          x: 360,
          y: 370,
          radius: 64,
          gravity: 5.6e6,
          name: 'LUMINA',
          ring: false,
          glow: '#22d3ee',
          light: '#e0f2fe',
          mid: '#0ea5e9',
          dark: '#082f49',
        },
      ],
      stars: [
        orbitStar(360, 370, 172, -150, 0.2),
        orbitStar(360, 370, 172, -90, 1.1),
        orbitStar(360, 370, 172, -30, 2.4),
        orbitStar(360, 370, 172, 40, 3.3),
        orbitStar(360, 370, 172, 130, 4.5),
      ],
    },
    {
      name: 'TWIN VEGA',
      tagline: 'ふたつの重力圏を行き交い、星の橋を渡る',
      planets: [
        {
          x: 215,
          y: 320,
          radius: 48,
          gravity: 3.8e6,
          name: 'VEGA',
          ring: false,
          glow: '#f472b6',
          light: '#fce7f3',
          mid: '#db2777',
          dark: '#500724',
        },
        {
          x: 505,
          y: 410,
          radius: 52,
          gravity: 4.4e6,
          name: 'ALTAIR',
          ring: false,
          glow: '#a78bfa',
          light: '#ede9fe',
          mid: '#7c3aed',
          dark: '#2e1065',
        },
      ],
      stars: [
        placeStar(215, 178, 0.4),
        placeStar(88, 372, 1.5),
        placeStar(330, 242, 2.6),
        placeStar(505, 545, 3.7),
        placeStar(628, 352, 4.8),
        placeStar(382, 660, 5.9),
      ],
    },
    {
      name: 'ORBIS RING',
      tagline: '黄金の環を持つ惑星のまわりを一周する',
      planets: [
        {
          x: 360,
          y: 340,
          radius: 78,
          gravity: 7.2e6,
          name: 'ORBIS',
          ring: true,
          glow: '#fbbf24',
          light: '#fef3c7',
          mid: '#d97706',
          dark: '#451a03',
        },
      ],
      stars: [
        orbitStar(360, 340, 170, -150, 0.1),
        orbitStar(360, 340, 170, -100, 1.2),
        orbitStar(360, 340, 170, -50, 2.3),
        orbitStar(360, 340, 170, 0, 3.4),
        orbitStar(360, 340, 170, 50, 4.5),
        orbitStar(360, 340, 170, 100, 5.6),
        orbitStar(360, 340, 170, 150, 6.7),
      ],
    },
    {
      name: 'TRIAD MAZE',
      tagline: '三つの重力井戸の間を縫って星を回収する',
      planets: [
        {
          x: 190,
          y: 275,
          radius: 44,
          gravity: 2.6e6,
          name: 'MIRA',
          ring: false,
          glow: '#2dd4bf',
          light: '#ccfbf1',
          mid: '#0d9488',
          dark: '#042f2e',
        },
        {
          x: 530,
          y: 275,
          radius: 44,
          gravity: 2.6e6,
          name: 'KAON',
          ring: false,
          glow: '#fb7185',
          light: '#ffe4e6',
          mid: '#e11d48',
          dark: '#4c0519',
        },
        {
          x: 360,
          y: 505,
          radius: 52,
          gravity: 3.6e6,
          name: 'NYX',
          ring: false,
          glow: '#818cf8',
          light: '#e0e7ff',
          mid: '#4f46e5',
          dark: '#1e1b4b',
        },
      ],
      stars: [
        placeStar(360, 150, 0.7),
        placeStar(95, 390, 1.8),
        placeStar(625, 390, 2.9),
        placeStar(360, 665, 4),
        placeStar(270, 360, 5.1),
        placeStar(450, 360, 6.2),
        placeStar(360, 300, 7.3),
      ],
    },
    {
      name: 'CRIMSON WELL',
      tagline: '深紅の重力井戸と小さな月を同時に意識する',
      planets: [
        {
          x: 360,
          y: 430,
          radius: 88,
          gravity: 8.5e6,
          name: 'SCARLET',
          ring: true,
          glow: '#f43f5e',
          light: '#ffe4e6',
          mid: '#be123c',
          dark: '#4c0519',
        },
        {
          x: 145,
          y: 220,
          radius: 28,
          gravity: 1.1e6,
          name: 'LUNE',
          ring: false,
          glow: '#94a3b8',
          light: '#f1f5f9',
          mid: '#64748b',
          dark: '#0f172a',
        },
      ],
      stars: [
        orbitStar(360, 430, 205, -150, 0.3),
        orbitStar(360, 430, 205, -90, 1.4),
        orbitStar(360, 430, 205, -30, 2.5),
        orbitStar(360, 430, 205, 30, 3.6),
        orbitStar(360, 430, 205, 90, 4.7),
        orbitStar(360, 430, 205, 150, 5.8),
        placeStar(68, 302, 6.9),
        placeStar(252, 136, 8),
      ],
    },
    {
      name: 'CORONA END',
      tagline: '最後の星図で6つの軌道をひとつにつなぐ',
      planets: [
        {
          x: 225,
          y: 300,
          radius: 56,
          gravity: 5.2e6,
          name: 'HELIOS',
          ring: false,
          glow: '#f59e0b',
          light: '#fef3c7',
          mid: '#d97706',
          dark: '#451a03',
        },
        {
          x: 505,
          y: 360,
          radius: 64,
          gravity: 6.4e6,
          name: 'CYANIS',
          ring: true,
          glow: '#38bdf8',
          light: '#e0f2fe',
          mid: '#0284c7',
          dark: '#082f49',
        },
        {
          x: 360,
          y: 600,
          radius: 28,
          gravity: 1.2e6,
          name: 'ECHO',
          ring: false,
          glow: '#c084fc',
          light: '#f3e8ff',
          mid: '#9333ea',
          dark: '#3b0764',
        },
      ],
      stars: [
        placeStar(225, 160, 0.2),
        placeStar(90, 360, 1.3),
        placeStar(345, 185, 2.4),
        placeStar(505, 210, 3.5),
        placeStar(640, 310, 4.6),
        placeStar(505, 540, 5.7),
        placeStar(225, 500, 6.8),
        placeStar(360, 720, 7.9),
        placeStar(440, 650, 9),
      ],
    },
  ];
}

function comboMultiplier(combo: number): number {
  return Math.min(4, 1 + Math.floor(combo / 3) * 0.5);
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
  const roundConfigs = createRoundConfigs();
  return {
    phase: 'aiming',
    roundConfigs,
    round: 1,
    score: 0,
    combo: 0,
    maxCombo: 0,
    launches: 0,
    probesLeft: PROBES_PER_ROUND,
    starsCollected: 0,
    starsTotal: roundConfigs[0].stars.length,
    totalStarsCollected: 0,
    roundBonus: 0,
    roundTimer: 0,
    endReason: '',
    bestScore,
    probe: null,
    aim: { active: false, x: LAUNCH_X, y: LAUNCH_Y, pointerId: null },
    particles: [],
    texts: [],
    time: 0,
    shake: 0,
    flash: 0,
  };
}

function setupRound(game: GameState, round: number) {
  const config = game.roundConfigs[round - 1];
  game.round = round;
  game.phase = 'aiming';
  game.probe = null;
  game.aim = { active: false, x: LAUNCH_X, y: LAUNCH_Y, pointerId: null };
  game.probesLeft = PROBES_PER_ROUND;
  game.starsCollected = 0;
  game.starsTotal = config.stars.length;
  game.combo = 0;
  game.roundBonus = 0;
  game.roundTimer = 0;
  game.particles = [];
  game.texts = [];
}

function toHud(game: GameState): HudState {
  const config = game.roundConfigs[game.round - 1];
  return {
    phase: game.phase,
    round: game.round,
    score: game.score,
    combo: game.combo,
    multiplier: comboMultiplier(game.combo),
    maxCombo: game.maxCombo,
    launches: game.launches,
    probesLeft: game.probesLeft,
    starsCollected: game.starsCollected,
    starsTotal: game.starsTotal,
    totalStars: game.totalStarsCollected,
    availableStars: game.roundConfigs.reduce((sum, roundConfig) => sum + roundConfig.stars.length, 0),
    roundName: config.name,
    roundTagline: config.tagline,
    roundBonus: game.roundBonus,
    bestScore: game.bestScore,
    endReason: game.endReason,
  };
}

function spawnBurst(game: GameState, x: number, y: number, color: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.6;
    const speed = 40 + Math.random() * 190;
    const life = 0.45 + Math.random() * 0.7;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 1 + Math.random() * 2.8,
      color,
    });
  }
}

function addText(game: GameState, x: number, y: number, text: string, color: string) {
  game.texts.push({
    x,
    y,
    text,
    life: 1.05,
    maxLife: 1.05,
    color,
  });
}

function updateEffects(game: GameState, dt: number) {
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.985;
    particle.vy = particle.vy * 0.985 + 36 * dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
  for (const text of game.texts) {
    text.life -= dt;
    text.y -= 32 * dt;
  }
  game.texts = game.texts.filter((text) => text.life > 0);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 26);
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 2.2);
}

function integrateProbe(probe: Probe, planets: Planet[], dt: number): 'ok' | 'crash' | 'exit' {
  let ax = 0;
  let ay = 0;
  for (const planet of planets) {
    const dx = planet.x - probe.x;
    const dy = planet.y - probe.y;
    const distanceSq = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSq) || 1;
    const force = planet.gravity / Math.max(distanceSq, 400);
    ax += (dx / distance) * force;
    ay += (dy / distance) * force;
  }
  probe.vx += ax * dt;
  probe.vy += ay * dt;
  probe.x += probe.vx * dt;
  probe.y += probe.vy * dt;
  for (const planet of planets) {
    const dx = planet.x - probe.x;
    const dy = planet.y - probe.y;
    const radius = planet.radius + PROBE_RADIUS;
    if (dx * dx + dy * dy < radius * radius) return 'crash';
  }
  if (probe.x < -90 || probe.x > WORLD_W + 90 || probe.y < -260 || probe.y > WORLD_H + 90) {
    return 'exit';
  }
  return 'ok';
}

interface AimShot {
  points: TrailPoint[];
  power: number;
  impact: boolean;
  speed: number;
}

function computeAimShot(aimX: number, aimY: number, planets: Planet[]): AimShot {
  const dx = aimX - LAUNCH_X;
  const dy = aimY - LAUNCH_Y;
  const distance = Math.hypot(dx, dy);
  if (distance < 4) return { points: [], power: 0, impact: false, speed: 0 };
  const power = Math.min(1, distance / MAX_DRAG);
  const speed = MIN_LAUNCH_SPEED + (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED) * power;
  let x = LAUNCH_X;
  let y = LAUNCH_Y;
  let vx = (dx / distance) * speed;
  let vy = (dy / distance) * speed;
  const points: TrailPoint[] = [];
  let impact = false;
  const dt = 1 / 60;
  for (let step = 0; step < 190; step += 1) {
    let ax = 0;
    let ay = 0;
    for (const planet of planets) {
      const pdx = planet.x - x;
      const pdy = planet.y - y;
      const distanceSq = pdx * pdx + pdy * pdy;
      const planetDistance = Math.sqrt(distanceSq) || 1;
      const force = planet.gravity / Math.max(distanceSq, 400);
      ax += (pdx / planetDistance) * force;
      ay += (pdy / planetDistance) * force;
    }
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    if (step % 2 === 0) points.push({ x, y });
    let hit = false;
    for (const planet of planets) {
      const pdx = planet.x - x;
      const pdy = planet.y - y;
      const radius = planet.radius + PROBE_RADIUS;
      if (pdx * pdx + pdy * pdy < radius * radius) {
        hit = true;
        break;
      }
    }
    if (hit) {
      impact = true;
      break;
    }
    if (x < -90 || x > WORLD_W + 90 || y < -260 || y > WORLD_H + 90) break;
  }
  return { points, power, impact, speed };
}

function makeBackgroundStars() {
  let seed = 20261105;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 120 }, () => ({
    x: random() * WORLD_W,
    y: random() * WORLD_H,
    r: 0.5 + random() * 1.7,
    alpha: 0.2 + random() * 0.7,
    phase: random() * Math.PI * 2,
    speed: 0.4 + random() * 1.5,
  }));
}

const BG_STARS = makeBackgroundStars();

function drawBackground(ctx: CanvasRenderingContext2D, time: number) {
  const background = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  background.addColorStop(0, '#040611');
  background.addColorStop(0.52, '#080d1c');
  background.addColorStop(1, '#0b0716');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const nebulaA = ctx.createRadialGradient(150, 190, 20, 150, 190, 360);
  nebulaA.addColorStop(0, 'rgba(34,211,238,0.14)');
  nebulaA.addColorStop(0.5, 'rgba(37,99,235,0.07)');
  nebulaA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebulaA;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const nebulaB = ctx.createRadialGradient(600, 530, 10, 600, 530, 420);
  nebulaB.addColorStop(0, 'rgba(217,70,239,0.11)');
  nebulaB.addColorStop(0.55, 'rgba(76,29,149,0.06)');
  nebulaB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebulaB;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const nebulaC = ctx.createRadialGradient(360, 790, 10, 360, 790, 300);
  nebulaC.addColorStop(0, 'rgba(14,116,144,0.12)');
  nebulaC.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebulaC;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (const star of BG_STARS) {
    const twinkle = 0.55 + 0.45 * Math.sin(time * star.speed + star.phase);
    ctx.globalAlpha = star.alpha * twinkle;
    ctx.fillStyle = '#cffafe';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.strokeStyle = 'rgba(103,232,249,0.055)';
  ctx.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.arc(LAUNCH_X, LAUNCH_Y, 110 + index * 70, -Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrbitGuides(ctx: CanvasRenderingContext2D, planets: Planet[]) {
  ctx.save();
  ctx.setLineDash([3, 10]);
  ctx.lineWidth = 1;
  for (const planet of planets) {
    ctx.strokeStyle = 'rgba(103,232,249,0.09)';
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius + 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(253,230,138,0.045)';
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius + 205, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, probe: Probe) {
  const trail = probe.trail;
  if (trail.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let index = 1; index < trail.length; index += 1) {
    const ratio = index / trail.length;
    ctx.strokeStyle = `rgba(103,232,249,${0.04 + ratio * 0.42})`;
    ctx.lineWidth = 0.8 + ratio * 2.8;
    ctx.beginPath();
    ctx.moveTo(trail[index - 1].x, trail[index - 1].y);
    ctx.lineTo(trail[index].x, trail[index].y);
    ctx.stroke();
  }
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = 'rgba(165,243,252,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);
  for (let index = 1; index < trail.length; index += 1) {
    ctx.lineTo(trail[index].x, trail[index].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawStars(ctx: CanvasRenderingContext2D, stars: StarNode[], time: number) {
  ctx.save();
  for (const star of stars) {
    if (star.collected) continue;
    const pulse = 0.7 + 0.3 * Math.sin(time * 3.2 + star.phase);
    const halo = ctx.createRadialGradient(star.x, star.y, 1, star.x, star.y, 24);
    halo.addColorStop(0, 'rgba(253,230,138,0.55)');
    halo.addColorStop(0.45, 'rgba(251,191,36,0.18)');
    halo.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(star.x, star.y, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(time * 0.6 + star.phase);
    const size = 6 + pulse * 2.5;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.22, -size * 0.22, size, 0);
    ctx.quadraticCurveTo(size * 0.22, size * 0.22, 0, size);
    ctx.quadraticCurveTo(-size * 0.22, size * 0.22, -size, 0);
    ctx.quadraticCurveTo(-size * 0.22, -size * 0.22, 0, -size);
    ctx.fill();
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet, time: number) {
  if (planet.ring) {
    ctx.save();
    ctx.translate(planet.x, planet.y);
    ctx.rotate(-0.32);
    ctx.strokeStyle = 'rgba(253,230,138,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, planet.radius * 1.72, planet.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(253,230,138,0.1)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, planet.radius * 1.86, planet.radius * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = planet.glow;
  ctx.shadowBlur = 38;
  const body = ctx.createRadialGradient(
    planet.x - planet.radius * 0.38,
    planet.y - planet.radius * 0.42,
    planet.radius * 0.08,
    planet.x,
    planet.y,
    planet.radius
  );
  body.addColorStop(0, planet.light);
  body.addColorStop(0.42, planet.mid);
  body.addColorStop(1, planet.dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = planet.glow;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius + 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = planet.light;
  ctx.lineWidth = 1;
  for (let index = 1; index <= 2; index += 1) {
    ctx.beginPath();
    ctx.ellipse(
      planet.x,
      planet.y,
      planet.radius * (0.45 + index * 0.18),
      planet.radius * (0.22 + index * 0.12),
      -0.3 + time * 0.02,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(226,232,240,0.52)';
  ctx.font = '600 10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(planet.name, planet.x, planet.y + planet.radius + 20);
  ctx.restore();
}

function drawLaunchPad(ctx: CanvasRenderingContext2D, time: number, ready: boolean) {
  ctx.save();
  ctx.translate(LAUNCH_X, LAUNCH_Y);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 74);
  glow.addColorStop(0, `rgba(34,211,238,${ready ? 0.22 : 0.08})`);
  glow.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(103,232,249,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(103,232,249,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.rotate(time * 0.55);
  ctx.strokeStyle = 'rgba(253,230,138,0.65)';
  ctx.lineWidth = 2;
  for (let index = 0; index < 4; index += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, 42, (index * Math.PI) / 2 + 0.18, (index * Math.PI) / 2 + 0.78);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#a5f3fc';
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(165,243,252,0.65)';
  ctx.font = '700 9px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LAUNCH', 0, 58);
  ctx.restore();
}

function drawAim(ctx: CanvasRenderingContext2D, aim: AimState, planets: Planet[]) {
  const shot = computeAimShot(aim.x, aim.y, planets);
  if (shot.points.length === 0) return;
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = 'rgba(165,243,252,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LAUNCH_X, LAUNCH_Y);
  ctx.lineTo(aim.x, aim.y);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let index = 0; index < shot.points.length; index += 2) {
    const point = shot.points[index];
    const alpha = 0.65 * (1 - index / shot.points.length) + 0.08;
    ctx.fillStyle = `rgba(165,243,252,${alpha})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const last = shot.points[shot.points.length - 1];
  if (last) {
    ctx.strokeStyle = shot.impact ? 'rgba(251,113,133,0.85)' : 'rgba(253,230,138,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 9, 0, Math.PI * 2);
    ctx.moveTo(last.x - 13, last.y);
    ctx.lineTo(last.x + 13, last.y);
    ctx.moveTo(last.x, last.y - 13);
    ctx.lineTo(last.x, last.y + 13);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(103,232,249,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(LAUNCH_X, LAUNCH_Y, 49, -Math.PI / 2, -Math.PI / 2 + shot.power * Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(253,230,138,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(aim.x, aim.y, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(aim.x - 18, aim.y);
  ctx.lineTo(aim.x + 18, aim.y);
  ctx.moveTo(aim.x, aim.y - 18);
  ctx.lineTo(aim.x, aim.y + 18);
  ctx.stroke();
  ctx.restore();
}

function drawProbe(ctx: CanvasRenderingContext2D, probe: Probe, time: number) {
  ctx.save();
  const halo = ctx.createRadialGradient(probe.x, probe.y, 1, probe.x, probe.y, 27);
  halo.addColorStop(0, 'rgba(236,254,255,0.95)');
  halo.addColorStop(0.25, 'rgba(103,232,249,0.55)');
  halo.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(probe.x, probe.y, 27, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(probe.x, probe.y);
  ctx.rotate(time * 1.6);
  ctx.strokeStyle = 'rgba(165,243,252,0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0.3, 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 3.44, 5.54);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  const config = game.roundConfigs[game.round - 1];
  ctx.save();
  if (game.shake > 0.1) {
    const shakeX = Math.sin(game.time * 93) * game.shake * 0.45;
    const shakeY = Math.cos(game.time * 77) * game.shake * 0.35;
    ctx.translate(shakeX, shakeY);
  }
  drawBackground(ctx, game.time);
  drawOrbitGuides(ctx, config.planets);
  if (game.probe) drawTrail(ctx, game.probe);
  drawStars(ctx, config.stars, game.time);
  for (const planet of config.planets) drawPlanet(ctx, planet, game.time);
  drawLaunchPad(ctx, game.time, game.phase === 'aiming');
  if (game.phase === 'aiming' && game.aim.active) drawAim(ctx, game.aim, config.planets);
  if (game.probe) drawProbe(ctx, game.probe, game.time);
  drawParticles(ctx, game.particles);
  drawTexts(ctx, game.texts);

  const vignette = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.28,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.78
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(186,230,253,${game.flash * 0.16})`;
    ctx.fillRect(-40, -40, WORLD_W + 80, WORLD_H + 80);
  }
  ctx.restore();
}

export default function GravityOrbitGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createInitialGame(0));
  const [hud, setHud] = useState<HudState>(() => toHud(gameRef.current));
  const [soundOn, setSoundOn] = useState(true);

  const syncHud = useCallback(() => {
    setHud(toHud(gameRef.current));
  }, []);

  const finishGame = useCallback(
    (victory: boolean, reason: string) => {
      const game = gameRef.current;
      if (game.phase === 'result' || game.phase === 'victory') return;
      game.phase = victory ? 'victory' : 'result';
      game.endReason = reason;
      game.aim.active = false;
      if (victory) {
        game.score += 2000;
        sound.victory();
      } else {
        sound.fail();
      }
      if (game.score > game.bestScore) {
        game.bestScore = game.score;
        writeBestScore(game.bestScore);
      }
      syncHud();
    },
    [syncHud]
  );

  const endProbe = useCallback(
    (reason: string, crash: boolean) => {
      const game = gameRef.current;
      if (game.phase !== 'flying' || !game.probe) return;
      const x = game.probe.x;
      const y = game.probe.y;
      spawnBurst(game, x, y, crash ? '#fb7185' : '#67e8f9', crash ? 24 : 14);
      addText(game, x, y - 8, reason, crash ? '#fecdd3' : '#cffafe');
      game.probe = null;
      game.combo = 0;
      game.shake = crash ? 10 : 5;
      if (crash) sound.crash();
      else sound.recall();
      if (game.probesLeft <= 0) {
        finishGame(false, reason);
      } else {
        game.phase = 'aiming';
        syncHud();
      }
    },
    [finishGame, syncHud]
  );

  const clearRound = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'flying') return;
    const bonus = 400 * game.round + game.probesLeft * 150;
    game.score += bonus;
    game.roundBonus = bonus;
    game.phase = 'roundClear';
    game.roundTimer = 1.8;
    game.aim.active = false;
    if (game.probe) game.probe.active = false;
    const x = game.probe?.x ?? LAUNCH_X;
    const y = game.probe?.y ?? 360;
    spawnBurst(game, x, y, '#fde68a', 30);
    addText(game, x, y - 18, `ROUND CLEAR +${bonus}`, '#fde68a');
    game.flash = 1;
    sound.clear();
    syncHud();
  }, [syncHud]);

  const advanceRound = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'roundClear') return;
    if (game.round >= TOTAL_ROUNDS) {
      finishGame(true, '全6星図の星を回収');
      return;
    }
    setupRound(game, game.round + 1);
    sound.ui();
    syncHud();
  }, [finishGame, syncHud]);

  const resetGame = useCallback(() => {
    const best = gameRef.current.bestScore;
    gameRef.current = createInitialGame(best);
    sound.ui();
    syncHud();
  }, [syncHud]);

  const launchProbe = useCallback(
    (vx: number, vy: number) => {
      const game = gameRef.current;
      if (game.phase !== 'aiming' || game.probesLeft <= 0) return;
      game.phase = 'flying';
      game.probesLeft -= 1;
      game.launches += 1;
      game.combo = 0;
      game.probe = {
        x: LAUNCH_X,
        y: LAUNCH_Y,
        vx,
        vy,
        time: 0,
        trail: [{ x: LAUNCH_X, y: LAUNCH_Y }],
        active: true,
      };
      game.aim.active = false;
      sound.launch();
      syncHud();
    },
    [syncHud]
  );

  const getWorldPoint = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WORLD_W,
      y: ((event.clientY - rect.top) / rect.height) * WORLD_H,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, a')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const game = gameRef.current;
      if (game.phase !== 'aiming') return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = getWorldPoint(event);
      game.aim = { active: true, x: point.x, y: point.y, pointerId: event.pointerId };
    },
    [getWorldPoint]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (!game.aim.active || game.aim.pointerId !== event.pointerId) return;
      event.preventDefault();
      const point = getWorldPoint(event);
      game.aim.x = point.x;
      game.aim.y = point.y;
    },
    [getWorldPoint]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (!game.aim.active || game.aim.pointerId !== event.pointerId) return;
      event.preventDefault();
      const aim = { ...game.aim };
      game.aim = { active: false, x: aim.x, y: aim.y, pointerId: null };
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const dx = aim.x - LAUNCH_X;
      const dy = aim.y - LAUNCH_Y;
      const distance = Math.hypot(dx, dy);
      if (distance < 20) return;
      const power = Math.min(1, distance / MAX_DRAG);
      const speed = MIN_LAUNCH_SPEED + (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED) * power;
      launchProbe((dx / distance) * speed, (dy / distance) * speed);
    },
    [launchProbe]
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    if (game.aim.pointerId === event.pointerId) {
      game.aim = { active: false, x: game.aim.x, y: game.aim.y, pointerId: null };
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const toggleSound = useCallback(() => {
    const next = !sound.enabled;
    sound.enabled = next;
    setSoundOn(next);
    if (next) sound.ui();
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
    const frame = (now: number) => {
      const dt = Math.min(0.038, Math.max(0, (now - last) / 1000));
      last = now;
      const game = gameRef.current;
      game.time += dt;
      updateEffects(game, dt);

      if (game.phase === 'flying' && game.probe) {
        const planets = game.roundConfigs[game.round - 1].planets;
        game.probe.time += dt;
        const substeps = Math.min(5, Math.max(1, Math.ceil(dt / (1 / 180))));
        const stepDt = dt / substeps;
        for (let step = 0; step < substeps; step += 1) {
          const result = integrateProbe(game.probe, planets, stepDt);
          if (result !== 'ok') {
            endProbe(result === 'crash' ? '惑星に衝突' : '軌道を離脱', result === 'crash');
            break;
          }
        }
        if (gameRef.current.phase === 'flying' && game.probe) {
          game.probe.trail.push({ x: game.probe.x, y: game.probe.y });
          if (game.probe.trail.length > 240) game.probe.trail.shift();
          if (game.probe.time >= PROBE_LIFETIME) {
            endProbe('観測時間終了', false);
          } else {
            const config = game.roundConfigs[game.round - 1];
            let gained = false;
            for (const star of config.stars) {
              if (star.collected) continue;
              const dx = star.x - game.probe.x;
              const dy = star.y - game.probe.y;
              if (dx * dx + dy * dy < STAR_PICKUP * STAR_PICKUP) {
                star.collected = true;
                game.combo += 1;
                game.maxCombo = Math.max(game.maxCombo, game.combo);
                game.starsCollected += 1;
                game.totalStarsCollected += 1;
                const multiplier = comboMultiplier(game.combo);
                const points = Math.round(110 * multiplier);
                game.score += points;
                gained = true;
                spawnBurst(game, star.x, star.y, '#fbbf24', 14);
                addText(game, star.x, star.y - 10, `+${points}`, '#fde68a');
                if (multiplier > 1) addText(game, star.x, star.y + 16, `x${multiplier}`, '#67e8f9');
                sound.star(game.combo);
              }
            }
            const allCollected = game.starsCollected >= config.stars.length;
            if (gained) syncHud();
            if (allCollected) clearRound();
          }
        }
      }

      if (game.phase === 'roundClear') {
        game.roundTimer -= dt;
        if (game.roundTimer <= 0) advanceRound();
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
  }, [advanceRound, clearRound, endProbe, syncHud]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05070f] text-slate-100 select-none">
      <header className="border-b border-cyan-400/15 bg-[#070b16]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200 sm:px-3 sm:text-xs"
            >
              ← ゲーム一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-[0.18em] text-cyan-300/80 sm:text-[10px]">
                GRAVITY ORBIT / 重力遊泳シミュレーター
              </p>
              <h2 className="truncate text-sm font-black sm:text-lg">重力オービット</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden rounded-lg border border-cyan-400/20 bg-cyan-950/30 px-2.5 py-1 text-[10px] text-slate-300 sm:block">
              BEST <span className="font-mono font-black text-cyan-200">{hud.bestScore.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200 sm:text-xs"
            >
              {soundOn ? '音 ON' : '音 OFF'}
            </button>
            <button
              type="button"
              onClick={resetGame}
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
            className="relative touch-none overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#060914] shadow-[0_0_70px_rgba(34,211,238,0.08)]"
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
              aria-label="重力オービットのゲーム画面"
              className="block aspect-[4/5] w-full"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent p-2.5 sm:p-3">
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-[0.18em] text-cyan-300/80">
                  ROUND {hud.round} / {TOTAL_ROUNDS}
                </p>
                <p className="font-mono text-2xl font-black leading-tight text-white sm:text-3xl">
                  {hud.score.toLocaleString()}
                </p>
                <p className="text-[9px] font-bold text-slate-400">SCORE</p>
                <p className="mt-1 truncate text-[9px] font-bold text-cyan-200/80">{hud.roundName}</p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-xl font-black leading-tight ${
                    hud.combo > 0 ? 'text-amber-300' : 'text-slate-500'
                  }`}
                >
                  {hud.combo}
                  <span className="ml-1 text-[10px]">HIT</span>
                </p>
                <p className="text-[9px] font-bold text-slate-400">COMBO x{hud.multiplier.toFixed(1)}</p>
                <p className="mt-1 text-[9px] font-bold text-slate-300">
                  LAUNCH <span className="font-mono text-cyan-200">{hud.launches}</span>
                </p>
                <p className="text-[9px] font-bold text-amber-200">PROBE {hud.probesLeft}</p>
              </div>
            </div>

            {hud.phase === 'aiming' && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/75 to-transparent px-2 pb-2.5 pt-6">
                <div className="rounded-full border border-cyan-300/25 bg-black/60 px-3 py-1.5 text-center text-[10px] font-bold text-cyan-100 backdrop-blur sm:text-xs">
                  {hud.starsCollected === 0
                    ? 'ドラッグで照準、離して発射'
                    : `残り ${hud.starsTotal - hud.starsCollected} 個の星を回収しよう`}
                </div>
              </div>
            )}

            {hud.phase === 'flying' && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-2 pb-2.5 pt-6">
                <div className="rounded-full border border-amber-300/25 bg-black/60 px-3 py-1.5 text-[10px] font-bold text-amber-100 backdrop-blur sm:text-xs">
                  重力に乗って軌道をつなぐ
                </div>
              </div>
            )}

            {hud.phase === 'roundClear' && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/20 px-4 text-center backdrop-blur-[1px]">
                <p className="text-[10px] font-black tracking-[0.25em] text-cyan-200">
                  ROUND {hud.round} CLEAR
                </p>
                <p className="mt-1 font-mono text-4xl font-black text-amber-300">
                  +{hud.roundBonus.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] font-bold text-cyan-50">{hud.roundName} の星をすべて回収</p>
              </div>
            )}

            {(hud.phase === 'result' || hud.phase === 'victory') && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="リザルト"
                className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-[#03060d]/90 px-4 py-6 text-center backdrop-blur-md"
              >
                <p className="text-[10px] font-black tracking-[0.25em] text-cyan-300">
                  {hud.phase === 'victory' ? 'MISSION COMPLETE' : 'ORBIT REPORT'}
                </p>
                <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  {hud.phase === 'victory' ? '全星図を制覇' : '観測終了'}
                </h3>
                <p className="mt-1 text-[11px] text-slate-300">{hud.endReason}</p>
                <div className="mt-4 w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-end justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-bold text-slate-400">FINAL SCORE</span>
                    <span className="font-mono text-2xl font-black text-cyan-200">
                      {hud.score.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-left">
                    {[
                      { label: '回収した星', value: `${hud.totalStars}/${hud.availableStars}` },
                      { label: '最大コンボ', value: `${hud.maxCombo}` },
                      { label: '到達ラウンド', value: `${hud.round}/${TOTAL_ROUNDS}` },
                      { label: '発射回数', value: `${hud.launches}` },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                        <p className="text-[9px] font-bold text-slate-500">{item.label}</p>
                        <p className="font-mono text-sm font-black text-slate-100">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-amber-200">
                    自己ベスト {hud.bestScore.toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetGame}
                  className="mt-4 rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-400 to-sky-500 px-6 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.03]"
                >
                  もう一度挑戦する
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 sm:text-xs">
              <span>探査機</span>
              <span className="flex items-center gap-1">
                {Array.from({ length: PROBES_PER_ROUND }, (_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full ${
                      index < hud.probesLeft
                        ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-200">{hud.probesLeft}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 sm:text-xs">
              <span className="font-bold text-amber-200">
                STAR {hud.starsCollected}/{hud.starsTotal}
              </span>
              <span className="hidden sm:inline">ドラッグで照準・離して発射</span>
            </div>
          </div>
        </div>

        <aside className="mx-auto flex w-full max-w-[560px] flex-col gap-2.5 sm:gap-3 lg:mx-0 lg:max-w-none">
          <div className="rounded-xl border border-cyan-400/15 bg-[#080d1b]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-cyan-300">MISSION</span>
              <span className="font-mono text-[10px] font-bold text-slate-400">
                {hud.round}/{TOTAL_ROUNDS}
              </span>
            </div>
            <p className="mt-2 text-sm font-black text-white">{hud.roundName}</p>
            <p className="mt-0.5 text-[10px] leading-5 text-slate-400">{hud.roundTagline}</p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>星の回収</span>
              <span className="font-mono text-amber-200">
                {hud.starsCollected}/{hud.starsTotal}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-300 transition-all duration-300"
                style={{
                  width: `${hud.starsTotal > 0 ? (hud.starsCollected / hud.starsTotal) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>残り探査機</span>
              <span className="flex items-center gap-1">
                {Array.from({ length: PROBES_PER_ROUND }, (_, index) => (
                  <span
                    key={index}
                    className={`h-2 w-2 rounded-full ${index < hud.probesLeft ? 'bg-cyan-300' : 'bg-slate-700'}`}
                  />
                ))}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-300">HOW TO PLAY</h3>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-slate-400">
              <li>
                <span className="font-bold text-cyan-200">1.</span> 画面をドラッグして方向とパワーを決める
              </li>
              <li>
                <span className="font-bold text-cyan-200">2.</span> 指を離して探査機を発射
              </li>
              <li>
                <span className="font-bold text-cyan-200">3.</span> 予測軌道と光る残像を見ながら星を回収
              </li>
              <li>
                <span className="font-bold text-cyan-200">4.</span> 3機以内に星を集めて次のラウンドへ
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-300">RECORD</h3>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">自己ベスト</span>
              <span className="font-mono font-black text-cyan-200">{hud.bestScore.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">通算発射</span>
              <span className="font-mono font-bold text-slate-200">{hud.launches}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">最大コンボ</span>
              <span className="font-mono font-bold text-amber-200">{hud.maxCombo}</span>
            </div>
            <button
              type="button"
              onClick={resetGame}
              className="mt-2.5 w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[10px] font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            >
              最初からやり直す
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
