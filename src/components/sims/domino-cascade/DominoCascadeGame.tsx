'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const CANVAS_W = 960;
const CANVAS_H = 720;
const TRACK_STEP = 4;
const DOMINO_H = 92;
const DOMINO_W = 28;
const IDEAL_GAP = 58;
const IDEAL_MIN = 46;
const IDEAL_MAX = 78;
const MAX_REACH = 104;
const MIN_GAP = 46;
const MAX_DOMINOES = 58;
const BUILD_TIME = 45;
const FALL_LIMIT = Math.PI / 2 - 0.04;
const STORAGE_KEY = 'domino-cascade-best-v1';
const ACCENTS = ['#7fd6c2', '#f0b45c', '#ef8a78', '#9db4ff', '#d9a6f2'];

type Phase = 'title' | 'build' | 'running' | 'result';
type Preset = 's' | 'loop' | 'zigzag';
type Quality = 'perfect' | 'ok' | 'far' | 'blocked';

type Vec = { x: number; y: number };

type TrackPoint = {
  x: number;
  y: number;
  s: number;
  tx: number;
  ty: number;
};

type TrackShape = {
  points: TrackPoint[];
  length: number;
};

type Domino = {
  id: number;
  s: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  angle: number;
  vel: number;
  falling: boolean;
  done: boolean;
  triggered: boolean;
  nextTriggered: boolean;
  linkGap: number;
  linkPerfect: boolean;
  accent: string;
};

type Popup = {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
};

type Banner = {
  text: string;
  sub: string;
  color: string;
  life: number;
  maxLife: number;
};

type Ghost = {
  x: number;
  y: number;
  s: number;
  quality: Quality;
};

type Result = {
  score: number;
  toppled: number;
  total: number;
  perfect: number;
  maxCombo: number;
  coverage: number;
  rank: string;
  isBest: boolean;
};

type HudState = {
  placed: number;
  toppled: number;
  score: number;
  combo: number;
  time: number;
  perfect: number;
};

type SimState = {
  preset: Preset;
  track: TrackShape;
  dominos: Domino[];
  nextId: number;
  score: number;
  toppled: number;
  perfectLinks: number;
  combo: number;
  maxCombo: number;
  buildRemaining: number;
  runTime: number;
  settleTime: number;
  launched: boolean;
  finished: boolean;
  autoLaunched: boolean;
  chainBroke: boolean;
  chainBreakS: number;
  popups: Popup[];
  particles: Particle[];
  banner: Banner | null;
  ghost: Ghost | null;
  time: number;
};

const PRESET_CONTROLS: Record<Preset, Vec[]> = {
  s: [
    { x: 80, y: 600 },
    { x: 180, y: 560 },
    { x: 270, y: 400 },
    { x: 390, y: 300 },
    { x: 520, y: 350 },
    { x: 610, y: 510 },
    { x: 730, y: 570 },
    { x: 840, y: 460 },
    { x: 890, y: 280 },
  ],
  loop: [
    { x: 70, y: 590 },
    { x: 180, y: 540 },
    { x: 280, y: 390 },
    { x: 330, y: 240 },
    { x: 460, y: 170 },
    { x: 620, y: 210 },
    { x: 690, y: 350 },
    { x: 640, y: 500 },
    { x: 510, y: 530 },
    { x: 420, y: 430 },
    { x: 460, y: 320 },
    { x: 580, y: 300 },
    { x: 700, y: 360 },
    { x: 800, y: 490 },
    { x: 900, y: 580 },
  ],
  zigzag: [
    { x: 80, y: 600 },
    { x: 170, y: 240 },
    { x: 290, y: 600 },
    { x: 410, y: 240 },
    { x: 530, y: 600 },
    { x: 650, y: 240 },
    { x: 770, y: 600 },
    { x: 880, y: 280 },
  ],
};

const PRESET_LABELS: Record<Preset, string> = {
  s: 'S字',
  loop: 'ループ',
  zigzag: 'ジグザグ',
};

const PRESET_NAMES: Record<Preset, string> = {
  s: 'S字カーブ',
  loop: 'ループコース',
  zigzag: 'ジグザグコース',
};

const QUALITY_COLORS: Record<Quality, string> = {
  perfect: '#8cf0cd',
  ok: '#f2c76a',
  far: '#ff9b86',
  blocked: '#77827c',
};

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function catmullRom(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function sampleDense(dense: Vec[], cumulative: number[], target: number): Vec {
  const total = cumulative[cumulative.length - 1];
  if (target <= 0) return { x: dense[0].x, y: dense[0].y };
  if (target >= total) {
    return { x: dense[dense.length - 1].x, y: dense[dense.length - 1].y };
  }
  let low = 0;
  let high = cumulative.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (cumulative[mid] <= target) low = mid;
    else high = mid;
  }
  const span = cumulative[high] - cumulative[low] || 1;
  const t = (target - cumulative[low]) / span;
  return {
    x: dense[low].x + (dense[high].x - dense[low].x) * t,
    y: dense[low].y + (dense[high].y - dense[low].y) * t,
  };
}

function buildTrack(preset: Preset): TrackShape {
  const controls = PRESET_CONTROLS[preset];
  const first = controls[0];
  const last = controls[controls.length - 1];
  const extended: Vec[] = [
    { x: first.x * 2 - controls[1].x, y: first.y * 2 - controls[1].y },
    ...controls,
    { x: last.x * 2 - controls[controls.length - 2].x, y: last.y * 2 - controls[controls.length - 2].y },
  ];
  const dense: Vec[] = [];
  for (let i = 0; i < extended.length - 3; i += 1) {
    const p0 = extended[i];
    const p1 = extended[i + 1];
    const p2 = extended[i + 2];
    const p3 = extended[i + 3];
    const segmentLength = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(10, Math.ceil(segmentLength / 5));
    for (let j = 0; j < steps; j += 1) {
      dense.push(catmullRom(p0, p1, p2, p3, j / steps));
    }
  }
  dense.push({ x: last.x, y: last.y });
  const cumulative: number[] = [0];
  for (let i = 1; i < dense.length; i += 1) {
    cumulative.push(
      cumulative[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y),
    );
  }
  const total = cumulative[cumulative.length - 1];
  const count = Math.max(2, Math.ceil(total / TRACK_STEP));
  const points: TrackPoint[] = [];
  for (let i = 0; i <= count; i += 1) {
    const target = Math.min(total, i * TRACK_STEP);
    const sample = sampleDense(dense, cumulative, target);
    points.push({ x: sample.x, y: sample.y, s: target, tx: 1, ty: 0 });
  }
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    points[i].tx = dx / length;
    points[i].ty = dy / length;
  }
  return { points, length: total };
}

function pointAt(track: TrackShape, distance: number): TrackPoint {
  const target = clamp(distance, 0, track.length);
  let index = clamp(Math.floor(target / TRACK_STEP), 0, track.points.length - 2);
  while (index < track.points.length - 2 && track.points[index + 1].s <= target) {
    index += 1;
  }
  const a = track.points[index];
  const b = track.points[Math.min(track.points.length - 1, index + 1)];
  const span = Math.max(0.0001, b.s - a.s);
  const t = clamp((target - a.s) / span, 0, 1);
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  let tx = a.tx + (b.tx - a.tx) * t;
  let ty = a.ty + (b.ty - a.ty) * t;
  const length = Math.hypot(tx, ty) || 1;
  tx /= length;
  ty /= length;
  return { x, y, s: target, tx, ty };
}

function nearestOnTrack(track: TrackShape, x: number, y: number) {
  let best = track.points[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const point of track.points) {
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return { x: best.x, y: best.y, s: best.s, dist: Math.sqrt(bestDistance) };
}

function makeDomino(track: TrackShape, distance: number, id: number): Domino {
  const point = pointAt(track, distance);
  return {
    id,
    s: point.s,
    x: point.x,
    y: point.y,
    tx: point.tx,
    ty: point.ty,
    angle: 0,
    vel: 0,
    falling: false,
    done: false,
    triggered: false,
    nextTriggered: false,
    linkGap: 0,
    linkPerfect: false,
    accent: ACCENTS[Math.floor(point.s / IDEAL_GAP) % ACCENTS.length],
  };
}

function fillTrack(track: TrackShape): Domino[] {
  const dominos: Domino[] = [];
  let distance = 40;
  let id = 0;
  while (distance < track.length - 28 && dominos.length < MAX_DOMINOES) {
    dominos.push(makeDomino(track, distance, id));
    id += 1;
    distance += IDEAL_GAP;
  }
  return dominos;
}

function getPlacementQuality(sim: SimState, distance: number): Quality {
  if (sim.dominos.length >= MAX_DOMINOES) return 'blocked';
  if (distance < 26 || distance > sim.track.length - 20) return 'blocked';
  let prev: Domino | null = null;
  let next: Domino | null = null;
  for (const domino of sim.dominos) {
    if (domino.s <= distance) {
      if (!prev || domino.s > prev.s) prev = domino;
    } else if (!next || domino.s < next.s) {
      next = domino;
    }
  }
  if (!prev && !next) return 'perfect';
  let minGap = Number.POSITIVE_INFINITY;
  if (prev) minGap = Math.min(minGap, distance - prev.s);
  if (next) minGap = Math.min(minGap, next.s - distance);
  if (minGap < MIN_GAP) return 'blocked';
  if (minGap >= IDEAL_MIN && minGap <= IDEAL_MAX) return 'perfect';
  if (minGap <= MAX_REACH) return 'ok';
  return 'far';
}

function tryPlaceDomino(sim: SimState, distance: number): boolean {
  if (getPlacementQuality(sim, distance) === 'blocked') return false;
  sim.dominos.push(makeDomino(sim.track, distance, sim.nextId));
  sim.nextId += 1;
  return true;
}

function resetSimState(sim: SimState, preset: Preset, fill: boolean) {
  const track = buildTrack(preset);
  sim.preset = preset;
  sim.track = track;
  sim.dominos = fill ? fillTrack(track) : [];
  sim.nextId = sim.dominos.length;
  sim.score = 0;
  sim.toppled = 0;
  sim.perfectLinks = 0;
  sim.combo = 0;
  sim.maxCombo = 0;
  sim.buildRemaining = BUILD_TIME;
  sim.runTime = 0;
  sim.settleTime = 0;
  sim.launched = false;
  sim.finished = false;
  sim.autoLaunched = false;
  sim.chainBroke = false;
  sim.chainBreakS = 0;
  sim.popups = [];
  sim.particles = [];
  sim.banner = null;
  sim.ghost = null;
}

function createInitialSim(): SimState {
  const track = buildTrack('s');
  const dominos = fillTrack(track);
  return {
    preset: 's',
    track,
    dominos,
    nextId: dominos.length,
    score: 0,
    toppled: 0,
    perfectLinks: 0,
    combo: 0,
    maxCombo: 0,
    buildRemaining: BUILD_TIME,
    runTime: 0,
    settleTime: 0,
    launched: false,
    finished: false,
    autoLaunched: false,
    chainBroke: false,
    chainBreakS: 0,
    popups: [],
    particles: [],
    banner: null,
    ghost: null,
    time: 0,
  };
}

function addPopup(sim: SimState, domino: Domino, text: string, color: string) {
  if (sim.popups.length > 28) sim.popups.shift();
  sim.popups.push({
    x: domino.x,
    y: domino.y - DOMINO_H * 0.78,
    text,
    color,
    life: 0.95,
    maxLife: 0.95,
  });
}

function spawnDust(sim: SimState, domino: Domino) {
  for (let i = 0; i < 7; i += 1) {
    const direction = Math.random() * Math.PI * 2;
    const speed = 24 + Math.random() * 76;
    const life = 0.32 + Math.random() * 0.28;
    sim.particles.push({
      x: domino.x,
      y: domino.y,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed * 0.42 - 28,
      size: 2 + Math.random() * 3.4,
      color: i % 3 === 0 ? '#f0c46c' : '#c9b58e',
      life,
      maxLife: life,
    });
  }
}

function triggerDomino(sim: SimState, index: number) {
  const domino = sim.dominos[index];
  if (!domino || domino.triggered) return;
  domino.triggered = true;
  domino.falling = true;
  domino.vel = 2.5 + Math.random() * 0.5;
  sim.toppled += 1;
  if (index > 0) {
    if (domino.linkPerfect) {
      sim.combo += 1;
      sim.perfectLinks += 1;
      sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
      const bonus = 60 + Math.min(sim.combo, 10) * 20;
      sim.score += 100 + bonus;
      addPopup(sim, domino, `PERFECT x${sim.combo}`, '#8cf0cd');
    } else {
      sim.combo = 0;
      sim.score += 100;
      addPopup(sim, domino, '+100', '#f0d8a8');
    }
  } else {
    sim.score += 100;
    addPopup(sim, domino, '+100', '#f0d8a8');
  }
  if (sim.toppled === sim.dominos.length) {
    sim.banner = {
      text: 'ALL TOPPLED',
      sub: '全ドミノ倒壊',
      color: '#8cf0cd',
      life: 2,
      maxLife: 2,
    };
  }
}

function updateEffects(sim: SimState, dt: number) {
  for (const popup of sim.popups) {
    popup.y -= 52 * dt;
    popup.life -= dt;
  }
  sim.popups = sim.popups.filter((popup) => popup.life > 0);
  for (const particle of sim.particles) {
    particle.vy += 210 * dt;
    particle.vx *= 0.985;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  sim.particles = sim.particles.filter((particle) => particle.life > 0);
  if (sim.banner) {
    sim.banner.life -= dt;
    if (sim.banner.life <= 0) sim.banner = null;
  }
}

function updateRunningSim(sim: SimState, dt: number): boolean {
  sim.runTime += dt;
  let active = false;
  for (let i = 0; i < sim.dominos.length; i += 1) {
    const domino = sim.dominos[i];
    if (!domino.falling || domino.done) continue;
    active = true;
    domino.vel = Math.min(11, domino.vel + 14 * dt);
    domino.angle += domino.vel * dt;
    if (!domino.nextTriggered) {
      const next = sim.dominos[i + 1];
      if (!next) {
        domino.nextTriggered = true;
      } else {
        const gap = next.s - domino.s;
        const reach = clamp((gap - DOMINO_W * 0.35) / DOMINO_H, 0.18, 0.97);
        const contactAngle = Math.max(0.42, Math.min(1.05, Math.asin(reach)));
        if (domino.angle >= contactAngle) {
          domino.nextTriggered = true;
          if (gap <= MAX_REACH) {
            triggerDomino(sim, i + 1);
          } else {
            sim.chainBroke = true;
            sim.chainBreakS = (domino.s + next.s) / 2;
            sim.banner = {
              text: 'CHAIN BREAK',
              sub: '間隔が広すぎます',
              color: '#ff9b86',
              life: 1.7,
              maxLife: 1.7,
            };
          }
        }
      }
    }
    if (domino.angle >= FALL_LIMIT) {
      domino.angle = FALL_LIMIT;
      domino.done = true;
      spawnDust(sim, domino);
    }
  }
  if (active) sim.settleTime = 0;
  else sim.settleTime += dt;
  return sim.launched && !active && sim.settleTime > 1.05;
}

function getResultMessage(result: Result): string {
  if (result.total === 0) return 'ドミノがありません。コースを埋めてから打ち上げよう。';
  if (result.rank === 'S') return '完璧なカスケード。工房中に拍手が響く。';
  if (result.rank === 'A') return '見事な連鎖。間隔をそろえてSを狙える。';
  if (result.rank === 'B') return 'いい流れ。間隔をそろえるとさらに伸びる。';
  if (result.rank === 'C') return 'まだ伸びしろあり。コースを埋めて連鎖をつなげよう。';
  return '最初の一枚から。まずはコース全体にドミノを並べよう。';
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawStaticBackground(ctx: CanvasRenderingContext2D) {
  const background = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  background.addColorStop(0, '#0b1a18');
  background.addColorStop(0.55, '#0a1513');
  background.addColorStop(1, '#060d0c');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const glow = ctx.createRadialGradient(
    CANVAS_W * 0.52,
    CANVAS_H * 0.42,
    30,
    CANVAS_W * 0.52,
    CANVAS_H * 0.42,
    CANVAS_W * 0.64,
  );
  glow.addColorStop(0, 'rgba(83, 166, 142, 0.2)');
  glow.addColorStop(0.55, 'rgba(38, 80, 70, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = 'rgba(214, 232, 220, 0.055)';
  for (let x = 24; x < CANVAS_W; x += 48) {
    for (let y = 24; y < CANVAS_H; y += 48) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(222, 180, 104, 0.065)';
  ctx.lineWidth = 2;
  for (let radius = 180; radius < 700; radius += 120) {
    ctx.beginPath();
    ctx.arc(CANVAS_W * 0.52, CANVAS_H * 0.44, radius, Math.PI * 0.16, Math.PI * 0.84);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(
    CANVAS_W / 2,
    CANVAS_H / 2,
    CANVAS_H * 0.22,
    CANVAS_W / 2,
    CANVAS_H / 2,
    CANVAS_W * 0.74,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.56)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.strokeStyle = 'rgba(216, 176, 106, 0.18)';
  ctx.lineWidth = 2;
  const margin = 26;
  const length = 34;
  const corners = [
    [margin, margin, 1, 1],
    [CANVAS_W - margin, margin, -1, 1],
    [margin, CANVAS_H - margin, 1, -1],
    [CANVAS_W - margin, CANVAS_H - margin, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * length, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * length);
    ctx.stroke();
  }
}

function drawTrack(ctx: CanvasRenderingContext2D, sim: SimState) {
  const { points, length } = sim.track;
  if (points.length < 2) return;
  const path = new Path2D();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    path.lineTo(points[i].x, points[i].y);
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 62;
  ctx.save();
  ctx.translate(0, 7);
  ctx.stroke(path);
  ctx.restore();
  ctx.strokeStyle = '#0b1715';
  ctx.lineWidth = 58;
  ctx.stroke(path);
  ctx.strokeStyle = '#263b35';
  ctx.lineWidth = 48;
  ctx.stroke(path);
  ctx.strokeStyle = 'rgba(238, 226, 198, 0.075)';
  ctx.lineWidth = 30;
  ctx.stroke(path);
  ctx.strokeStyle = 'rgba(238, 226, 198, 0.16)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 16]);
  ctx.stroke(path);
  ctx.setLineDash([]);
  ctx.restore();

  for (let distance = 40; distance < length - 24; distance += IDEAL_GAP) {
    const point = pointAt(sim.track, distance);
    const nx = -point.ty;
    const ny = point.tx;
    ctx.strokeStyle = 'rgba(240, 224, 190, 0.17)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x - nx * 9, point.y - ny * 9);
    ctx.lineTo(point.x + nx * 9, point.y + ny * 9);
    ctx.stroke();
  }

  for (let distance = 130; distance < length - 70; distance += 190) {
    const point = pointAt(sim.track, distance);
    const nx = -point.ty;
    const ny = point.tx;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.strokeStyle = 'rgba(240, 224, 190, 0.2)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-point.tx * 4 - nx * 9, -point.ty * 4 - ny * 9);
    ctx.lineTo(point.tx * 9, point.ty * 9);
    ctx.lineTo(-point.tx * 4 + nx * 9, -point.ty * 4 + ny * 9);
    ctx.stroke();
    ctx.restore();
  }

  const start = pointAt(sim.track, 0);
  const pulse = 1 + Math.sin(sim.time * 3.2) * 0.08;
  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.fillStyle = 'rgba(8, 18, 16, 0.92)';
  ctx.beginPath();
  ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8b06a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#d8b06a';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(216, 176, 106, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(start.tx * 28, start.ty * 28);
  ctx.stroke();
  ctx.restore();

  const end = pointAt(sim.track, length);
  ctx.save();
  ctx.translate(end.x, end.y);
  ctx.strokeStyle = '#d8b06a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -44);
  ctx.stroke();
  ctx.fillStyle = '#7fd6c2';
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.lineTo(32, -35);
  ctx.lineTo(0, -25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (sim.chainBroke) {
    const breakPoint = pointAt(sim.track, sim.chainBreakS);
    ctx.save();
    ctx.translate(breakPoint.x, breakPoint.y);
    ctx.strokeStyle = 'rgba(255, 155, 134, 0.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, 8);
    ctx.moveTo(8, -8);
    ctx.lineTo(-8, 8);
    ctx.stroke();
    ctx.restore();
  }
}

function drawDomino(
  ctx: CanvasRenderingContext2D,
  domino: Domino,
  ghostColor?: string,
  alpha = 1,
) {
  const angle = domino.angle;
  const lx = Math.sin(angle) * domino.tx;
  const ly = -Math.cos(angle) + Math.sin(angle) * domino.ty;
  const axisLength = Math.hypot(lx, ly) || 1;
  const ux = lx / axisLength;
  const uy = ly / axisLength;
  const rotation = Math.atan2(uy, ux);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(domino.x, domino.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 4, DOMINO_W * 0.72, DOMINO_W * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(rotation);
  const body = ctx.createLinearGradient(0, 0, DOMINO_H, 0);
  body.addColorStop(0, ghostColor ?? '#c9b58e');
  body.addColorStop(0.36, ghostColor ?? '#f4e6c9');
  body.addColorStop(1, ghostColor ?? '#dcc59b');
  ctx.beginPath();
  roundRectPath(ctx, 1, -DOMINO_W / 2, DOMINO_H - 2, DOMINO_W, 7);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = ghostColor ? 'rgba(255, 255, 255, 0.55)' : 'rgba(36, 29, 18, 0.68)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  roundRectPath(ctx, DOMINO_H - 18, -DOMINO_W / 2 + 3, 9, DOMINO_W - 6, 3.5);
  ctx.fillStyle = domino.accent;
  ctx.fill();

  ctx.fillStyle = 'rgba(42, 36, 24, 0.5)';
  ctx.beginPath();
  ctx.arc(DOMINO_H * 0.42, 0, 3.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 248, 232, 0.38)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, -DOMINO_W / 2 + 4);
  ctx.lineTo(DOMINO_H - 26, -DOMINO_W / 2 + 4);
  ctx.stroke();
  ctx.restore();
}

function drawGhost(ctx: CanvasRenderingContext2D, sim: SimState) {
  if (!sim.ghost) return;
  const point = pointAt(sim.track, sim.ghost.s);
  const color = QUALITY_COLORS[sim.ghost.quality];
  const ghostDomino: Domino = {
    id: -1,
    s: point.s,
    x: point.x,
    y: point.y,
    tx: point.tx,
    ty: point.ty,
    angle: 0,
    vel: 0,
    falling: false,
    done: false,
    triggered: false,
    nextTriggered: false,
    linkGap: 0,
    linkPerfect: false,
    accent: color,
  };
  drawDomino(ctx, ghostDomino, color, 0.48);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 19 + Math.sin(sim.time * 6) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function renderSim(
  ctx: CanvasRenderingContext2D,
  sim: SimState,
  phase: Phase,
  background: HTMLCanvasElement | null,
) {
  if (background) {
    ctx.drawImage(background, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    ctx.fillStyle = '#07100f';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  drawTrack(ctx, sim);
  if (phase === 'build') drawGhost(ctx, sim);
  for (const domino of sim.dominos) {
    drawDomino(ctx, domino);
  }
  for (const particle of sim.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const popup of sim.popups) {
    ctx.save();
    ctx.globalAlpha = clamp((popup.life / popup.maxLife) * 1.5, 0, 1);
    ctx.fillStyle = popup.color;
    ctx.font = '700 26px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 9;
    ctx.fillText(popup.text, popup.x, popup.y);
    ctx.restore();
  }
  if (sim.banner) {
    const banner = sim.banner;
    ctx.save();
    ctx.globalAlpha = clamp((banner.life / banner.maxLife) * 2, 0, 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = banner.color;
    ctx.font = '800 56px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText(banner.text, CANVAS_W / 2, CANVAS_H * 0.34);
    ctx.font = '700 24px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(245, 235, 215, 0.88)';
    ctx.fillText(banner.sub, CANVAS_W / 2, CANVAS_H * 0.34 + 38);
    ctx.restore();
  }
}

export default function DominoCascadeGame() {
  const simRef = useRef<SimState | null>(null);
  if (simRef.current === null) simRef.current = createInitialSim();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundRef = useRef<HTMLCanvasElement | null>(null);
  const pointerDownRef = useRef(false);
  const phaseRef = useRef<Phase>('title');
  const bestRef = useRef(0);
  const launchRef = useRef<() => void>(() => undefined);
  const finishRef = useRef<() => void>(() => undefined);

  const [phase, setPhase] = useState<Phase>('title');
  const [preset, setPreset] = useState<Preset>('s');
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [hud, setHud] = useState<HudState>({
    placed: 0,
    toppled: 0,
    score: 0,
    combo: 0,
    time: BUILD_TIME,
    perfect: 0,
  });

  const publishHud = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    setHud({
      placed: sim.dominos.length,
      toppled: sim.toppled,
      score: sim.score,
      combo: sim.combo,
      time: sim.buildRemaining,
      perfect: sim.perfectLinks,
    });
  }, []);

  const startGame = useCallback(
    (nextPreset: Preset, fill: boolean) => {
      const sim = simRef.current;
      if (!sim) return;
      resetSimState(sim, nextPreset, fill);
      phaseRef.current = 'build';
      setPhase('build');
      setPreset(nextPreset);
      setResult(null);
      publishHud();
    },
    [publishHud],
  );

  const changePreset = useCallback(
    (nextPreset: Preset) => {
      if (phaseRef.current !== 'build') return;
      const sim = simRef.current;
      if (!sim) return;
      const track = buildTrack(nextPreset);
      sim.preset = nextPreset;
      sim.track = track;
      sim.dominos = fillTrack(track);
      sim.nextId = sim.dominos.length;
      sim.ghost = null;
      setPreset(nextPreset);
      publishHud();
    },
    [publishHud],
  );

  const clearDominoes = useCallback(() => {
    if (phaseRef.current !== 'build') return;
    const sim = simRef.current;
    if (!sim) return;
    sim.dominos = [];
    sim.nextId = 0;
    sim.ghost = null;
    publishHud();
  }, [publishHud]);

  const launch = useCallback(() => {
    const sim = simRef.current;
    if (!sim || phaseRef.current !== 'build' || sim.dominos.length === 0) return;
    sim.dominos.sort((a, b) => a.s - b.s);
    for (let i = 0; i < sim.dominos.length; i += 1) {
      const domino = sim.dominos[i];
      domino.angle = 0;
      domino.vel = 0;
      domino.falling = false;
      domino.done = false;
      domino.triggered = false;
      domino.nextTriggered = false;
      domino.linkGap = i > 0 ? domino.s - sim.dominos[i - 1].s : 0;
      domino.linkPerfect = i > 0 && domino.linkGap >= IDEAL_MIN && domino.linkGap <= IDEAL_MAX;
    }
    sim.score = 0;
    sim.toppled = 0;
    sim.perfectLinks = 0;
    sim.combo = 0;
    sim.maxCombo = 0;
    sim.runTime = 0;
    sim.settleTime = 0;
    sim.launched = true;
    sim.finished = false;
    sim.chainBroke = false;
    sim.chainBreakS = 0;
    sim.popups = [];
    sim.particles = [];
    sim.banner = null;
    sim.ghost = null;
    phaseRef.current = 'running';
    setPhase('running');
    triggerDomino(sim, 0);
    publishHud();
  }, [publishHud]);

  const finish = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.finished) return;
    const currentPhase = phaseRef.current;
    if (currentPhase !== 'running' && !(currentPhase === 'build' && sim.dominos.length === 0)) return;
    sim.finished = true;
    const total = sim.dominos.length;
    let occupied = total > 0 ? DOMINO_W : 0;
    for (let i = 1; i < total; i += 1) {
      occupied += Math.min(sim.dominos[i].s - sim.dominos[i - 1].s, IDEAL_MAX);
    }
    const coverage = total > 0 ? clamp(occupied / sim.track.length, 0, 1) : 0;
    const toppleRate = total > 0 ? sim.toppled / total : 0;
    const completion = coverage * toppleRate;
    const perfectRatio = total > 1 ? sim.perfectLinks / (total - 1) : 0;
    let rank = 'D';
    if (completion >= 0.93 && perfectRatio >= 0.8) rank = 'S';
    else if (completion >= 0.78) rank = 'A';
    else if (completion >= 0.5) rank = 'B';
    else if (completion >= 0.22) rank = 'C';
    const score = sim.score + (total > 0 && sim.toppled === total ? 1500 : 0);
    sim.score = score;
    const isBest = score > bestRef.current;
    if (isBest) {
      bestRef.current = score;
      setBest(score);
      try {
        window.localStorage.setItem(STORAGE_KEY, String(score));
      } catch {
        void 0;
      }
    }
    const nextResult: Result = {
      score,
      toppled: sim.toppled,
      total,
      perfect: sim.perfectLinks,
      maxCombo: sim.maxCombo,
      coverage: Math.round(coverage * 100),
      rank,
      isBest,
    };
    phaseRef.current = 'result';
    setPhase('result');
    setResult(nextResult);
    publishHud();
  }, [publishHud]);

  const goTitle = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    resetSimState(sim, 's', true);
    phaseRef.current = 'title';
    setPhase('title');
    setPreset('s');
    setResult(null);
    publishHud();
  }, [publishHud]);

  useEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const saved = raw ? Number.parseInt(raw, 10) : 0;
      if (Number.isFinite(saved) && saved > 0) {
        bestRef.current = saved;
        setBest(saved);
      }
    } catch {
      setBest(0);
    }
  }, []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawStaticBackground(ctx);
    backgroundRef.current = canvas;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
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
    let raf = 0;
    let last = performance.now();
    let hudClock = 0;
    const frame = (now: number) => {
      const sim = simRef.current;
      if (sim) {
        const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
        last = now;
        sim.time += dt;
        const current = phaseRef.current;
        if (current === 'build') {
          sim.buildRemaining = Math.max(0, sim.buildRemaining - dt);
          if (sim.buildRemaining <= 0 && !sim.autoLaunched) {
            sim.autoLaunched = true;
            if (sim.dominos.length > 0) launchRef.current();
            else finishRef.current();
          }
        } else if (current === 'running') {
          const ready = updateRunningSim(sim, dt);
          if (ready) finishRef.current();
        }
        updateEffects(sim, dt);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(canvas.width / CANVAS_W, 0, 0, canvas.height / CANVAS_H, 0, 0);
            renderSim(ctx, sim, phaseRef.current, backgroundRef.current);
          }
        }
        hudClock += dt;
        if (hudClock >= 0.08 && (current === 'build' || current === 'running')) {
          hudClock = 0;
          setHud({
            placed: sim.dominos.length,
            toppled: sim.toppled,
            score: sim.score,
            combo: sim.combo,
            time: sim.buildRemaining,
            perfect: sim.perfectLinks,
          });
        }
      } else {
        last = now;
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const getWorldPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top) * (CANVAS_H / rect.height),
    };
  };

  const refreshGhost = (clientX: number, clientY: number): Ghost | null => {
    const sim = simRef.current;
    if (!sim || phaseRef.current !== 'build') return null;
    const point = getWorldPoint(clientX, clientY);
    if (!point) {
      sim.ghost = null;
      return null;
    }
    const nearest = nearestOnTrack(sim.track, point.x, point.y);
    if (nearest.dist > 126) {
      sim.ghost = null;
      return null;
    }
    const quality = getPlacementQuality(sim, nearest.s);
    if (quality === 'blocked') {
      sim.ghost = null;
      return null;
    }
    const ghost: Ghost = { x: nearest.x, y: nearest.y, s: nearest.s, quality };
    sim.ghost = ghost;
    return ghost;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (phaseRef.current !== 'build') return;
    const sim = simRef.current;
    if (!sim) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerDownRef.current = true;
    const ghost = refreshGhost(event.clientX, event.clientY);
    if (ghost && tryPlaceDomino(sim, ghost.s)) {
      sim.ghost = null;
      publishHud();
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    if (phaseRef.current !== 'build') return;
    const sim = simRef.current;
    if (!sim) return;
    const ghost = refreshGhost(event.clientX, event.clientY);
    if (!pointerDownRef.current || !ghost) return;
    if (tryPlaceDomino(sim, ghost.s)) {
      sim.ghost = null;
      publishHud();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    pointerDownRef.current = false;
    if (event.pointerType !== 'mouse') {
      const sim = simRef.current;
      if (sim) sim.ghost = null;
    }
  };

  const handlePointerCancel = () => {
    pointerDownRef.current = false;
    const sim = simRef.current;
    if (sim) sim.ghost = null;
  };

  const handlePointerLeave = () => {
    pointerDownRef.current = false;
    const sim = simRef.current;
    if (sim) sim.ghost = null;
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07100f] text-stone-100 select-none">
      <header className="border-b border-stone-800 bg-[#07100f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="shrink-0 whitespace-nowrap rounded border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-[10px] font-bold text-stone-300 transition hover:border-amber-400 hover:text-amber-300 sm:px-3 sm:text-xs"
            >
              ← 無料ゲーム一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] font-bold tracking-[0.18em] text-amber-400 sm:text-[10px]">
                DOMINO CASCADE / CHAIN LAB
              </p>
              <h2 className="truncate text-xs font-black sm:text-base">ドミノ・カスケード</h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-[10px] sm:px-3 sm:text-xs">
              <span className="text-stone-400">BEST </span>
              <span className="font-mono font-black text-amber-300">{best.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-2.5 py-2.5 sm:px-4 sm:py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_264px] lg:gap-4">
          <div className="min-w-0">
            <div
              className="relative overflow-hidden rounded-xl border-2 border-stone-800 bg-[#07100f] shadow-2xl"
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerLeave}
              onLostPointerCapture={handlePointerCancel}
              onContextMenu={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className={`block w-full touch-none ${
                  phase === 'build' ? 'cursor-crosshair' : 'cursor-default'
                }`}
              />

              {(phase === 'build' || phase === 'running') && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1 bg-gradient-to-b from-black/85 via-black/35 to-transparent px-2 py-2 sm:px-3 sm:py-2.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-4">
                    <div>
                      <p className="text-[8px] font-bold tracking-wider text-stone-400 sm:text-[9px]">配置</p>
                      <p className="font-mono text-xs font-black leading-none text-amber-200 sm:text-lg">
                        {hud.placed}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold tracking-wider text-stone-400 sm:text-[9px]">倒壊</p>
                      <p className="font-mono text-xs font-black leading-none text-teal-200 sm:text-lg">
                        {hud.toppled}
                        <span className="text-[9px] font-bold text-stone-400">/{hud.placed}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold tracking-wider text-stone-400 sm:text-[9px]">SCORE</p>
                      <p className="font-mono text-sm font-black leading-none text-white sm:text-xl">
                        {hud.score.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {phase === 'build' ? (
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[10px] font-black sm:text-xs ${
                          hud.time <= 10
                            ? 'border-rose-400/60 bg-rose-950/50 text-rose-200'
                            : 'border-amber-400/40 bg-black/50 text-amber-200'
                        }`}
                      >
                        {Math.max(0, Math.ceil(hud.time))}s
                      </span>
                    ) : (
                      <span className="rounded border border-teal-400/40 bg-black/50 px-2 py-0.5 font-mono text-[10px] font-black text-teal-200 sm:text-xs">
                        PERFECT x{hud.combo}
                      </span>
                    )}
                    <span className="hidden text-[9px] font-bold text-stone-300 sm:block">
                      {phase === 'build' ? 'なぞって配置 / タップで追加' : '連鎖発生中'}
                    </span>
                  </div>
                </div>
              )}

              {phase === 'title' && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-[#050d0c]/80 px-3 py-3 text-center backdrop-blur-[2px] sm:px-6"
                  style={{ touchAction: 'pan-y' }}
                >
                  <p className="font-mono text-[9px] font-bold tracking-[0.25em] text-amber-300/90 sm:text-[11px]">
                    CHAIN REACTION ATELIER
                  </p>
                  <h3 className="mt-1 text-xl font-black leading-tight text-white sm:mt-2 sm:text-4xl">
                    ドミノ・カスケード
                  </h3>
                  <p className="mt-1 max-w-md text-[10px] leading-4 text-stone-300 sm:mt-2 sm:text-sm sm:leading-6">
                    真鍮のトラックにドミノを並べ、最初の一枚を倒そう。間隔をそろえるほどPERFECTコンボが伸びる。
                  </p>
                  <button
                    type="button"
                    onClick={() => startGame('s', false)}
                    className="mt-3 w-full max-w-xs rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-black text-stone-950 shadow-xl transition hover:scale-[1.02] active:scale-[0.98] sm:mt-5 sm:py-3"
                  >
                    スタート
                  </button>
                  <div className="mt-2 w-full max-w-xs">
                    <p className="text-[9px] font-bold tracking-wider text-stone-400 sm:text-[10px]">
                      おまかせコースで開始
                    </p>
                    <div className="mt-1 grid grid-cols-3 gap-1.5">
                      {(['s', 'loop', 'zigzag'] as Preset[]).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => startGame(item, true)}
                          className="rounded-lg border border-stone-600 bg-stone-900/80 px-1 py-1.5 text-[10px] font-bold text-stone-200 transition hover:border-teal-400 hover:text-teal-200 sm:text-xs"
                        >
                          {PRESET_LABELS[item]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-[9px] text-stone-500 sm:text-[11px]">
                    配置はなぞるだけ。打ち上げで連鎖開始。
                  </p>
                </div>
              )}

              {phase === 'result' && result && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-[#050d0c]/90 px-3 py-3 text-center backdrop-blur-sm sm:px-6"
                  style={{ touchAction: 'pan-y' }}
                >
                  <p className="font-mono text-[9px] font-bold tracking-[0.22em] text-amber-300/90 sm:text-[11px]">
                    CASCADE REPORT / {PRESET_NAMES[preset]}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 sm:mt-2 sm:gap-3">
                    <span className="font-mono text-3xl font-black leading-none text-amber-300 sm:text-5xl">
                      {result.rank}
                    </span>
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-stone-400 sm:text-[11px]">SCORE</p>
                      <p className="font-mono text-lg font-black leading-none text-white sm:text-3xl">
                        {result.score.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-teal-200 sm:mt-2 sm:text-sm">
                    {getResultMessage(result)}
                  </p>
                  <div className="mt-2 grid w-full max-w-xs grid-cols-4 gap-1 sm:mt-4 sm:max-w-lg sm:gap-2">
                    <div className="rounded border border-stone-700 bg-stone-900/80 px-1 py-1.5 sm:px-2">
                      <p className="text-[8px] font-bold text-stone-400 sm:text-[10px]">倒壊</p>
                      <p className="font-mono text-[11px] font-black text-white sm:text-base">
                        {result.toppled}/{result.total}
                      </p>
                    </div>
                    <div className="rounded border border-stone-700 bg-stone-900/80 px-1 py-1.5 sm:px-2">
                      <p className="text-[8px] font-bold text-stone-400 sm:text-[10px]">PERFECT</p>
                      <p className="font-mono text-[11px] font-black text-teal-200 sm:text-base">
                        {result.perfect}
                      </p>
                    </div>
                    <div className="rounded border border-stone-700 bg-stone-900/80 px-1 py-1.5 sm:px-2">
                      <p className="text-[8px] font-bold text-stone-400 sm:text-[10px]">MAX COMBO</p>
                      <p className="font-mono text-[11px] font-black text-amber-200 sm:text-base">
                        {result.maxCombo}
                      </p>
                    </div>
                    <div className="rounded border border-stone-700 bg-stone-900/80 px-1 py-1.5 sm:px-2">
                      <p className="text-[8px] font-bold text-stone-400 sm:text-[10px]">充足率</p>
                      <p className="font-mono text-[11px] font-black text-white sm:text-base">
                        {result.coverage}%
                      </p>
                    </div>
                  </div>
                  {result.isBest && (
                    <p className="mt-1 text-[9px] font-bold text-amber-300 sm:text-xs">自己ベスト更新</p>
                  )}
                  <div className="mt-2.5 flex w-full max-w-xs flex-row gap-1.5 sm:mt-4 sm:max-w-sm sm:gap-2">
                    <button
                      type="button"
                      onClick={() => startGame(preset, true)}
                      className="flex-1 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-2 text-[11px] font-black text-stone-950 shadow-lg transition hover:scale-[1.02] active:scale-[0.98] sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      もう一度
                    </button>
                    <button
                      type="button"
                      onClick={goTitle}
                      className="flex-1 rounded-xl border border-stone-600 bg-stone-900 px-2 py-2 text-[11px] font-bold text-stone-200 transition hover:border-stone-400 sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      コース選択
                    </button>
                  </div>
                </div>
              )}
            </div>

            {phase === 'build' && (
              <div className="mt-2 sm:mt-3">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {(['s', 'loop', 'zigzag'] as Preset[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => changePreset(item)}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-bold transition sm:text-xs ${
                        preset === item
                          ? 'border-teal-400 bg-teal-950/50 text-teal-200'
                          : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {PRESET_LABELS[item]}コース
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={clearDominoes}
                    disabled={hud.placed === 0}
                    className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5 text-xs font-bold text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                  >
                    クリア
                  </button>
                  <button
                    type="button"
                    onClick={launch}
                    disabled={hud.placed === 0}
                    className="flex-1 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-black text-stone-950 shadow-lg transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-800 disabled:bg-none disabled:text-stone-500 disabled:shadow-none sm:text-base"
                  >
                    打ち上げ
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] leading-4 text-stone-400 sm:text-xs">
                  トラックをなぞって配置。間隔 {IDEAL_MIN}〜{IDEAL_MAX} でPERFECT。
                </p>
              </div>
            )}

            {phase === 'running' && (
              <div className="mt-2 rounded-xl border border-stone-700 bg-stone-900/70 p-3 sm:mt-3">
                <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <span className="font-bold text-teal-200">連鎖中...</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-teal-200">PERFECT {hud.perfect}</span>
                    <span className="font-mono text-stone-300">
                      {hud.toppled} / {hud.placed}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-300 transition-[width] duration-150"
                    style={{ width: `${hud.placed > 0 ? (hud.toppled / hud.placed) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-amber-400">HOW TO PLAY</p>
              <ol className="mt-2 space-y-2 text-[11px] leading-5 text-stone-300 sm:text-xs">
                <li>
                  <span className="font-bold text-white">1.</span> コースを選ぶか、トラックをなぞってドミノを配置。
                </li>
                <li>
                  <span className="font-bold text-white">2.</span> 打ち上げボタンで最初の一枚を倒す。
                </li>
                <li>
                  <span className="font-bold text-white">3.</span> 間隔をそろえてPERFECTコンボを伸ばす。
                </li>
              </ol>
            </div>
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-teal-300">SCORING</p>
              <div className="mt-2 space-y-1.5 text-[10px] text-stone-300 sm:text-xs">
                <div className="flex justify-between">
                  <span>倒壊ボーナス</span>
                  <span className="font-mono text-white">+100</span>
                </div>
                <div className="flex justify-between">
                  <span>PERFECT間隔</span>
                  <span className="font-mono text-teal-200">+80〜</span>
                </div>
                <div className="flex justify-between">
                  <span>全倒達成</span>
                  <span className="font-mono text-amber-200">+1,500</span>
                </div>
              </div>
              <p className="mt-2 text-[9px] leading-4 text-stone-500 sm:text-[11px]">
                理想の間隔は {IDEAL_MIN}〜{IDEAL_MAX}。広すぎると連鎖が止まります。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
