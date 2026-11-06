'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const CANVAS_W = 960;
const CANVAS_H = 720;
const TRACK_STEP = 4;
const DOMINO_W = 26;
const MIN_GAP = 20;
const MAX_DOMINOES = 180;
const FALL_LIMIT = Math.PI / 2 - 0.035;
const ACCENTS = ['#7fd6c2', '#f0b45c', '#ef8a78', '#9db4ff', '#d9a6f2'];

type Preset = 's' | 'loop' | 'zigzag' | 'spiral' | 'branch';
type Quality = 'good' | 'bad' | 'blocked';

type Vec = { x: number; y: number };
type TrackPoint = { x: number; y: number; s: number; tx: number; ty: number };
type TrackShape = { points: TrackPoint[]; length: number; branches?: TrackShape[] };

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
  triggeredAt: number | null;
  nextTriggered: boolean;
  accent: string;
};

type WaveSample = {
  index: number;
  time: number;
  instSpeedPx: number;
  instSpeedDom: number;
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

type Ghost = { x: number; y: number; s: number; quality: Quality };

type Settings = {
  preset: Preset;
  spacing: number;
  height: number;
  friction: number;
  pushForce: number;
  gravity: number;
  speed: number;
};

type SimState = {
  preset: Preset;
  track: TrackShape;
  dominos: Domino[];
  nextId: number;
  spacing: number;
  height: number;
  friction: number;
  pushForce: number;
  gravity: number;
  speed: number;
  running: boolean;
  paused: boolean;
  launched: boolean;
  settled: boolean;
  toppled: number;
  maxChain: number;
  propSpeedDom: number;
  propSpeedPx: number;
  cascadeDuration: number;
  completed: boolean;
  chainBreakS: number | null;
  runTime: number;
  settleTime: number;
  firstTriggerAt: number;
  lastTriggerAt: number;
  waveSamples: WaveSample[];
  ghost: Ghost | null;
  hoverRemoveId: number | null;
  particles: Particle[];
  time: number;
};

type HudState = {
  placed: number;
  toppled: number;
  remaining: number;
  propSpeedDom: number;
  propSpeedPx: number;
  cascadeDuration: number;
  maxChain: number;
  completed: boolean;
  settled: boolean;
  launched: boolean;
  running: boolean;
  paused: boolean;
  status: string;
  waveSamples: WaveSample[];
};

const DEFAULT_SETTINGS: Settings = {
  preset: 's',
  spacing: 52,
  height: 94,
  friction: 0.3,
  pushForce: 1.4,
  gravity: 1,
  speed: 1,
};

const PRESET_CONTROLS: Record<Preset, Vec[]> = {
  s: [
    { x: 80, y: 600 },
    { x: 180, y: 560 },
    { x: 270, y: 400 },
    { x: 390, y: 290 },
    { x: 520, y: 340 },
    { x: 610, y: 510 },
    { x: 730, y: 570 },
    { x: 840, y: 450 },
    { x: 890, y: 260 },
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
    { x: 170, y: 220 },
    { x: 290, y: 600 },
    { x: 410, y: 220 },
    { x: 530, y: 600 },
    { x: 650, y: 220 },
    { x: 770, y: 600 },
    { x: 880, y: 260 },
  ],
  spiral: [
    { x: 110, y: 610 },
    { x: 100, y: 340 },
    { x: 220, y: 140 },
    { x: 500, y: 110 },
    { x: 790, y: 170 },
    { x: 860, y: 390 },
    { x: 760, y: 585 },
    { x: 490, y: 615 },
    { x: 250, y: 535 },
    { x: 215, y: 355 },
    { x: 340, y: 235 },
    { x: 570, y: 235 },
    { x: 695, y: 360 },
    { x: 620, y: 485 },
    { x: 440, y: 485 },
    { x: 375, y: 380 },
    { x: 485, y: 350 },
  ],
  branch: [
    { x: 75, y: 360 },
    { x: 185, y: 360 },
    { x: 300, y: 360 },
    { x: 440, y: 360 },
    { x: 590, y: 360 },
    { x: 745, y: 360 },
    { x: 885, y: 360 },
  ],
};

const BRANCH_ARMS: Vec[][] = [
  [
    { x: 300, y: 360 },
    { x: 395, y: 250 },
    { x: 540, y: 175 },
    { x: 715, y: 155 },
    { x: 880, y: 165 },
  ],
  [
    { x: 300, y: 360 },
    { x: 395, y: 470 },
    { x: 540, y: 545 },
    { x: 715, y: 565 },
    { x: 880, y: 555 },
  ],
];

const PRESET_LABELS: Record<Preset, string> = {
  s: 'S字カーブ',
  loop: 'ループ交差',
  zigzag: 'ジグザグ',
  spiral: '渦巻きスパイラル',
  branch: '三股分岐（同時連鎖）',
};

const PRESET_NAMES: Record<Preset, string> = {
  s: 'S字カーブ（標準伝播コース）',
  loop: 'ループ交差（立体交差コース）',
  zigzag: 'ジグザグ（急角度コーナー減衰実験）',
  spiral: '渦巻きスパイラル（長距離定常波実験）',
  branch: '三股分岐（中央・上・下の3ルート同時伝播比較）',
};

const QUALITY_COLORS: Record<Quality, string> = {
  good: '#8cf0cd',
  bad: '#ff9b86',
  blocked: '#77827c',
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
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

function buildSingleSpline(controls: Vec[]): TrackShape {
  const first = controls[0];
  const last = controls[controls.length - 1];
  const extended: Vec[] = [
    { x: first.x * 2 - controls[1].x, y: first.y * 2 - controls[1].y },
    ...controls,
    {
      x: last.x * 2 - controls[controls.length - 2].x,
      y: last.y * 2 - controls[controls.length - 2].y,
    },
  ];
  const dense: Vec[] = [];
  for (let i = 0; i < extended.length - 3; i += 1) {
    const p0 = extended[i];
    const p1 = extended[i + 1];
    const p2 = extended[i + 2];
    const p3 = extended[i + 3];
    const segmentLength = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(10, Math.min(220, Math.ceil(segmentLength / 5)));
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
  const count = Math.max(2, Math.min(900, Math.ceil(total / TRACK_STEP)));
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

function buildTrack(preset: Preset): TrackShape {
  const main = buildSingleSpline(PRESET_CONTROLS[preset]);
  if (preset === 'branch') {
    main.branches = BRANCH_ARMS.map((arm) => buildSingleSpline(arm));
  }
  return main;
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

function getReach(height: number): number {
  return Math.max(24, height * 0.94);
}

function makeDomino(track: TrackShape, distance: number, id: number, sOffset = 0): Domino {
  const point = pointAt(track, distance);
  return {
    id,
    s: point.s + sOffset,
    x: point.x,
    y: point.y,
    tx: point.tx,
    ty: point.ty,
    angle: 0,
    vel: 0,
    falling: false,
    done: false,
    triggered: false,
    triggeredAt: null,
    nextTriggered: false,
    accent: ACCENTS[Math.floor((point.s + sOffset) / 64) % ACCENTS.length],
  };
}

function fillTrack(track: TrackShape, spacing: number): Domino[] {
  const gap = clamp(spacing, MIN_GAP, 120);
  const dominos: Domino[] = [];
  let distance = 36;
  let id = 0;
  let guard = 0;
  while (distance < track.length - 24 && dominos.length < MAX_DOMINOES && guard < 400) {
    dominos.push(makeDomino(track, distance, id, 0));
    id += 1;
    distance += gap;
    guard += 1;
  }
  if (track.branches) {
    let branchOffset = track.length + 200;
    for (const branch of track.branches) {
      let bDist = gap * 0.85;
      while (bDist < branch.length - 20 && dominos.length < MAX_DOMINOES) {
        dominos.push(makeDomino(branch, bDist, id, branchOffset));
        id += 1;
        bDist += gap;
      }
      branchOffset += branch.length + 200;
    }
  }
  return dominos;
}

function getGapQuality(sim: SimState, gap: number): Quality {
  if (!Number.isFinite(gap) || gap < MIN_GAP) return 'blocked';
  return gap <= getReach(sim.height) ? 'good' : 'bad';
}

function getPlacementQuality(sim: SimState, distance: number): Quality {
  if (sim.dominos.length >= MAX_DOMINOES) return 'blocked';
  if (distance < 24 || distance > sim.track.length - 20) return 'blocked';
  let prev: Domino | null = null;
  let next: Domino | null = null;
  for (const domino of sim.dominos) {
    if (domino.s > sim.track.length) continue;
    if (domino.s <= distance) {
      if (!prev || domino.s > prev.s) prev = domino;
    } else if (!next || domino.s < next.s) {
      next = domino;
    }
  }
  if (!prev && !next) return 'good';
  const gaps: number[] = [];
  if (prev) gaps.push(distance - prev.s);
  if (next) gaps.push(next.s - distance);
  if (gaps.some((gap) => gap < MIN_GAP)) return 'blocked';
  const maxGap = Math.max(...gaps);
  return maxGap <= getReach(sim.height) ? 'good' : 'bad';
}

function insertDomino(sim: SimState, distance: number): boolean {
  if (getPlacementQuality(sim, distance) === 'blocked') return false;
  const domino = makeDomino(sim.track, distance, sim.nextId);
  sim.nextId += 1;
  let index = sim.dominos.findIndex((item) => item.s > domino.s);
  if (index < 0) index = sim.dominos.length;
  sim.dominos.splice(index, 0, domino);
  return true;
}

function longestChain(dominos: Domino[]): number {
  let longest = 0;
  let run = 0;
  for (const domino of dominos) {
    if (domino.triggered) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  return longest;
}

function resetPose(sim: SimState) {
  for (const domino of sim.dominos) {
    domino.angle = 0;
    domino.vel = 0;
    domino.falling = false;
    domino.done = false;
    domino.triggered = false;
    domino.triggeredAt = null;
    domino.nextTriggered = false;
  }
  sim.running = false;
  sim.paused = false;
  sim.launched = false;
  sim.settled = false;
  sim.toppled = 0;
  sim.maxChain = 0;
  sim.propSpeedDom = 0;
  sim.propSpeedPx = 0;
  sim.cascadeDuration = 0;
  sim.completed = false;
  sim.chainBreakS = null;
  sim.runTime = 0;
  sim.settleTime = 0;
  sim.firstTriggerAt = 0;
  sim.lastTriggerAt = 0;
  sim.waveSamples = [];
  sim.ghost = null;
  sim.hoverRemoveId = null;
  sim.particles = [];
}

function createInitialSim(settings: Settings): SimState {
  const track = buildTrack(settings.preset);
  const dominos = fillTrack(track, settings.spacing);
  return {
    preset: settings.preset,
    track,
    dominos,
    nextId: dominos.length,
    spacing: settings.spacing,
    height: settings.height,
    friction: settings.friction,
    pushForce: settings.pushForce,
    gravity: settings.gravity,
    speed: settings.speed,
    running: false,
    paused: false,
    launched: false,
    settled: false,
    toppled: 0,
    maxChain: 0,
    propSpeedDom: 0,
    propSpeedPx: 0,
    cascadeDuration: 0,
    completed: false,
    chainBreakS: null,
    runTime: 0,
    settleTime: 0,
    firstTriggerAt: 0,
    lastTriggerAt: 0,
    waveSamples: [],
    ghost: null,
    hoverRemoveId: null,
    particles: [],
    time: 0,
  };
}

function spawnDust(sim: SimState, domino: Domino) {
  if (sim.particles.length > 180) return;
  for (let i = 0; i < 6; i += 1) {
    const direction = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 64;
    const life = 0.28 + Math.random() * 0.24;
    sim.particles.push({
      x: domino.x,
      y: domino.y,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed * 0.38 - 24,
      size: 1.6 + Math.random() * 2.8,
      color: i % 3 === 0 ? '#f0c46c' : '#c9b58e',
      life,
      maxLife: life,
    });
  }
}

function triggerDomino(sim: SimState, index: number, fromDomino?: Domino) {
  const domino = sim.dominos[index];
  if (!domino || domino.triggered) return;
  domino.triggered = true;
  domino.triggeredAt = sim.runTime;
  domino.falling = true;
  domino.vel = clamp(0.55 + sim.pushForce * 0.9, 0.4, 5);
  if (sim.toppled === 0) sim.firstTriggerAt = sim.runTime;
  sim.lastTriggerAt = sim.runTime;
  sim.toppled += 1;
  sim.cascadeDuration = Math.max(0, sim.lastTriggerAt - sim.firstTriggerAt);
  sim.maxChain = Math.max(sim.maxChain, longestChain(sim.dominos));

  const elapsed = Math.max(0.001, sim.runTime - sim.firstTriggerAt);
  sim.propSpeedDom = sim.toppled > 1 ? clamp((sim.toppled - 1) / elapsed, 0, 120) : 0;

  let instSpeedPx = sim.propSpeedDom * sim.spacing;
  if (fromDomino && fromDomino.triggeredAt !== null) {
    const dt = Math.max(0.004, sim.runTime - fromDomino.triggeredAt);
    const dist = Math.hypot(domino.x - fromDomino.x, domino.y - fromDomino.y);
    instSpeedPx = clamp(dist / dt, 0, 2400);
  }
  sim.propSpeedPx =
    sim.toppled > 1 ? clamp(((sim.toppled - 1) * sim.spacing) / elapsed, 0, 2400) : 0;

  sim.waveSamples.push({
    index: sim.toppled,
    time: sim.runTime,
    instSpeedPx,
    instSpeedDom: sim.propSpeedDom,
  });
}

function updateEffects(sim: SimState, dt: number) {
  for (const particle of sim.particles) {
    particle.vy += 190 * dt;
    particle.vx *= 0.986;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  sim.particles = sim.particles.filter((particle) => particle.life > 0);
}

function updateRunningSim(sim: SimState, dt: number, force = false) {
  if (!sim.running || (sim.paused && !force)) return;
  sim.runTime += dt;
  let active = false;
  const reach = getReach(sim.height);

  for (let i = 0; i < sim.dominos.length; i += 1) {
    const domino = sim.dominos[i];
    if (!domino.falling || domino.done) continue;
    active = true;
    const gravityAccel = (0.8 + sim.gravity * 5.2) * Math.cos(clamp(domino.angle, 0, FALL_LIMIT));
    domino.vel += gravityAccel * dt;
    domino.vel *= Math.max(0, 1 - sim.friction * 1.4 * dt);
    domino.vel = clamp(domino.vel, 0, 14);
    domino.angle = clamp(domino.angle + domino.vel * dt, 0, FALL_LIMIT);

    if (!domino.nextTriggered) {
      let triggeredAny = false;
      // Check both next along track AND spatial forward neighbors (for branches/intersections)
      for (let j = 0; j < sim.dominos.length; j += 1) {
        if (i === j) continue;
        const candidate = sim.dominos[j];
        if (candidate.triggered) continue;
        const dx = candidate.x - domino.x;
        const dy = candidate.y - domino.y;
        const forwardDot = dx * domino.tx + dy * domino.ty;
        const lateralDist = Math.abs(-dx * domino.ty + dy * domino.tx);
        const dist = Math.hypot(dx, dy);
        if (forwardDot > 12 && dist <= reach && lateralDist <= 38) {
          const contactAngle = Math.asin(
            clamp(Math.min(dist, sim.height * 0.985) / sim.height, 0.12, 0.985),
          );
          if (domino.angle >= contactAngle) {
            triggerDomino(sim, j, domino);
            triggeredAny = true;
          }
        }
      }

      const next = sim.dominos[i + 1];
      if (next && Math.abs(next.s - domino.s) < 160) {
        const gap = Math.max(0, next.s - domino.s);
        const contactAngle = Math.asin(
          clamp(Math.min(gap, sim.height * 0.985) / sim.height, 0.12, 0.985),
        );
        if (domino.angle >= contactAngle) {
          domino.nextTriggered = true;
          if (gap <= reach) {
            triggerDomino(sim, i + 1, domino);
            triggeredAny = true;
          } else if (!triggeredAny && domino.s <= sim.track.length) {
            sim.chainBreakS = (domino.s + next.s) / 2;
          }
        }
      } else if (domino.angle >= 0.65) {
        domino.nextTriggered = true;
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
  if (sim.settleTime > 0.65) {
    sim.running = false;
    sim.paused = false;
    sim.settled = true;
    sim.toppled = sim.dominos.filter((domino) => domino.triggered).length;
    sim.maxChain = longestChain(sim.dominos);
    sim.completed = sim.dominos.length > 0 && sim.toppled === sim.dominos.length;
    sim.cascadeDuration = Math.max(0, sim.lastTriggerAt - sim.firstTriggerAt);
  }
}

function toHud(sim: SimState): HudState {
  let status = '待機';
  if (sim.running && sim.paused) status = '一時停止';
  else if (sim.running) status = '連鎖伝播中';
  else if (sim.settled) status = sim.completed ? '全枚完走' : '連鎖停止';
  else if (sim.launched) status = '停止';
  return {
    placed: sim.dominos.length,
    toppled: sim.toppled,
    remaining: Math.max(0, sim.dominos.length - sim.toppled),
    propSpeedDom: sim.propSpeedDom,
    propSpeedPx: sim.propSpeedPx,
    cascadeDuration: sim.cascadeDuration,
    maxChain: sim.maxChain,
    completed: sim.completed,
    settled: sim.settled,
    launched: sim.launched,
    running: sim.running,
    paused: sim.paused,
    status,
    waveSamples: [...sim.waveSamples],
  };
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
}

function strokeSplineShape(ctx: CanvasRenderingContext2D, shape: TrackShape) {
  const { points } = shape;
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
  ctx.lineWidth = 58;
  ctx.save();
  ctx.translate(0, 7);
  ctx.stroke(path);
  ctx.restore();
  ctx.strokeStyle = '#0b1715';
  ctx.lineWidth = 54;
  ctx.stroke(path);
  ctx.strokeStyle = '#263b35';
  ctx.lineWidth = 44;
  ctx.stroke(path);
  ctx.strokeStyle = 'rgba(238, 226, 198, 0.075)';
  ctx.lineWidth = 28;
  ctx.stroke(path);
  ctx.strokeStyle = 'rgba(238, 226, 198, 0.16)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 16]);
  ctx.stroke(path);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawTrack(ctx: CanvasRenderingContext2D, sim: SimState) {
  strokeSplineShape(ctx, sim.track);
  if (sim.track.branches) {
    for (const branch of sim.track.branches) {
      strokeSplineShape(ctx, branch);
    }
  }

  const start = pointAt(sim.track, 0);
  const pulse = 1 + Math.sin(sim.time * 3.2) * 0.08;
  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.fillStyle = 'rgba(8, 18, 16, 0.92)';
  ctx.beginPath();
  ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8b06a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#d8b06a';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const end = pointAt(sim.track, sim.track.length);
  ctx.save();
  ctx.translate(end.x, end.y);
  ctx.strokeStyle = '#d8b06a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -40);
  ctx.stroke();
  ctx.fillStyle = '#7fd6c2';
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(28, -32);
  ctx.lineTo(0, -23);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (sim.chainBreakS !== null) {
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

function drawLinkGuide(
  ctx: CanvasRenderingContext2D,
  sim: SimState,
  fromS: number,
  toS: number,
  color: string,
) {
  if (fromS > sim.track.length || toS > sim.track.length) return;
  const start = Math.min(fromS, toS);
  const end = Math.max(fromS, toS);
  const span = Math.max(1, end - start);
  const steps = Math.max(2, Math.ceil(span / 16));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.58;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const point = pointAt(sim.track, start + (span * i) / steps);
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawDomino(
  ctx: CanvasRenderingContext2D,
  domino: Domino,
  height: number,
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
  const body = ctx.createLinearGradient(0, 0, height, 0);
  body.addColorStop(0, ghostColor ?? '#c9b58e');
  body.addColorStop(0.36, ghostColor ?? '#f4e6c9');
  body.addColorStop(1, ghostColor ?? '#dcc59b');
  ctx.beginPath();
  roundRectPath(ctx, 1, -DOMINO_W / 2, height - 2, DOMINO_W, 7);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = ghostColor ? 'rgba(255, 255, 255, 0.55)' : 'rgba(36, 29, 18, 0.68)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  roundRectPath(ctx, height - 18, -DOMINO_W / 2 + 3, 9, DOMINO_W - 6, 3.5);
  ctx.fillStyle = domino.accent;
  ctx.fill();

  ctx.fillStyle = 'rgba(42, 36, 24, 0.5)';
  ctx.beginPath();
  ctx.arc(height * 0.42, 0, 3.8, 0, Math.PI * 2);
  ctx.fill();
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
    triggeredAt: null,
    nextTriggered: false,
    accent: color,
  };
  drawDomino(ctx, ghostDomino, sim.height, color, 0.48);
}

function drawHoverRemove(ctx: CanvasRenderingContext2D, sim: SimState) {
  if (sim.hoverRemoveId === null) return;
  const domino = sim.dominos.find((item) => item.id === sim.hoverRemoveId);
  if (!domino) return;
  ctx.save();
  ctx.translate(domino.x, domino.y);
  ctx.strokeStyle = 'rgba(255, 155, 134, 0.95)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function renderSim(
  ctx: CanvasRenderingContext2D,
  sim: SimState,
  background: HTMLCanvasElement | null,
) {
  if (background) {
    ctx.drawImage(background, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    ctx.fillStyle = '#07100f';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  drawTrack(ctx, sim);
  if (!sim.running) {
    for (let i = 0; i < sim.dominos.length - 1; i += 1) {
      const gap = sim.dominos[i + 1].s - sim.dominos[i].s;
      if (gap < 160) {
        drawLinkGuide(
          ctx,
          sim,
          sim.dominos[i].s,
          sim.dominos[i + 1].s,
          QUALITY_COLORS[getGapQuality(sim, gap)],
        );
      }
    }
  }
  for (const domino of sim.dominos) {
    drawDomino(ctx, domino, sim.height);
  }
  drawHoverRemove(ctx, sim);
  if (!sim.running) drawGhost(ctx, sim);
  for (const particle of sim.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function PropagationWaveGraph({
  samples,
  totalPlaced,
}: {
  samples: WaveSample[];
  totalPlaced: number;
}) {
  const width = 280;
  const height = 92;
  const pad = { top: 10, right: 8, bottom: 18, left: 28 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (samples.length < 2) {
    return (
      <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-stone-700 bg-black/25 text-[10px] text-stone-400">
        「連鎖開始」を押すと伝播速度と転倒時刻の波形を記録します
      </div>
    );
  }

  const maxIdx = Math.max(totalPlaced, samples[samples.length - 1].index, 2);
  const maxSpeed = Math.max(200, ...samples.map((s) => s.instSpeedPx));
  const maxTime = Math.max(0.2, samples[samples.length - 1].time);

  const speedPoints = samples
    .map((s) => {
      const x = pad.left + (s.index / maxIdx) * plotW;
      const y = pad.top + (1 - Math.min(1, s.instSpeedPx / maxSpeed)) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const timePoints = samples
    .map((s) => {
      const x = pad.left + (s.index / maxIdx) * plotW;
      const y = pad.top + (1 - Math.min(1, s.time / maxTime)) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-2 h-auto w-full rounded-lg bg-black/30 p-1"
      role="img"
      aria-label="ドミノ番号に対する連鎖伝播速度と転倒時刻グラフ"
    >
      <line
        x1={pad.left}
        y1={pad.top + plotH}
        x2={width - pad.right}
        y2={pad.top + plotH}
        stroke="rgba(168,162,158,0.25)"
      />
      <line
        x1={pad.left}
        y1={pad.top}
        x2={pad.left}
        y2={pad.top + plotH}
        stroke="rgba(168,162,158,0.25)"
      />
      <polyline
        points={timePoints}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={1.6}
        strokeDasharray="3 2"
      />
      <polyline points={speedPoints} fill="none" stroke="#5eead4" strokeWidth={2} />
      <text x={pad.left - 3} y={pad.top + 6} textAnchor="end" fontSize={7} fill="#5eead4">
        {Math.round(maxSpeed)}
      </text>
      <text x={pad.left - 3} y={pad.top + plotH} textAnchor="end" fontSize={7} fill="#a8a29e">
        0
      </text>
      <text x={pad.left + 2} y={height - 4} fontSize={7} fill="#5eead4">
        ― 伝播速度(px/s)
      </text>
      <text x={width - pad.right} y={height - 4} textAnchor="end" fontSize={7} fill="#f59e0b">
        --- 到達時刻({maxTime.toFixed(2)}s)
      </text>
    </svg>
  );
}

type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
};

function RangeControl({ label, value, min, max, step, display, onChange }: RangeControlProps) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 text-[11px] font-bold text-stone-300">
        <span>{label}</span>
        <span className="font-mono text-[11px] text-teal-200">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-1.5 w-full cursor-pointer accent-teal-400"
      />
    </label>
  );
}

export default function DominoCascadeGame() {
  const simRef = useRef<SimState | null>(null);
  if (simRef.current === null) simRef.current = createInitialSim(DEFAULT_SETTINGS);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  const [hud, setHud] = useState<HudState>(() => toHud(simRef.current as SimState));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundRef = useRef<HTMLCanvasElement | null>(null);
  const pointerDownRef = useRef(false);
  const removeModeRef = useRef(false);

  const publishHud = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    setHud(toHud(sim));
  }, []);

  const applySettings = (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    const sim = simRef.current;
    if (sim) {
      const spacingChanged = patch.spacing !== undefined && patch.spacing !== sim.spacing;
      sim.preset = next.preset;
      sim.spacing = next.spacing;
      sim.height = next.height;
      sim.friction = next.friction;
      sim.pushForce = next.pushForce;
      sim.gravity = next.gravity;
      sim.speed = next.speed;
      sim.ghost = null;
      if (spacingChanged && !sim.running) {
        sim.dominos = fillTrack(sim.track, next.spacing);
        sim.nextId = sim.dominos.length;
        resetPose(sim);
      }
    }
    publishHud();
  };

  const choosePreset = (preset: Preset) => {
    const sim = simRef.current;
    if (!sim) return;
    const next = { ...settingsRef.current, preset };
    settingsRef.current = next;
    setSettings(next);
    const track = buildTrack(preset);
    sim.preset = preset;
    sim.track = track;
    sim.dominos = fillTrack(track, sim.spacing);
    sim.nextId = sim.dominos.length;
    sim.spacing = next.spacing;
    resetPose(sim);
    publishHud();
  };

  const autoFill = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.dominos = fillTrack(sim.track, sim.spacing);
    sim.nextId = sim.dominos.length;
    resetPose(sim);
    publishHud();
  };

  const clearDominoes = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.dominos = [];
    sim.nextId = 0;
    resetPose(sim);
    publishHud();
  };

  // Stand dominoes back up in the exact same custom/preset arrangement
  const standUpDominoes = () => {
    const sim = simRef.current;
    if (!sim) return;
    resetPose(sim);
    publishHud();
  };

  const launch = () => {
    const sim = simRef.current;
    if (!sim || sim.dominos.length === 0) return;
    resetPose(sim);
    sim.launched = true;
    sim.running = true;
    sim.paused = false;
    sim.settled = false;
    sim.runTime = 0;
    sim.firstTriggerAt = 0;
    sim.lastTriggerAt = 0;
    triggerDomino(sim, 0);
    publishHud();
  };

  const togglePause = () => {
    const sim = simRef.current;
    if (!sim || !sim.running) return;
    sim.paused = !sim.paused;
    publishHud();
  };

  const stepOnce = () => {
    const sim = simRef.current;
    if (!sim || !sim.running || !sim.paused) return;
    const dt = (1 / 60) * clamp(sim.speed, 0.5, 2);
    updateRunningSim(sim, dt, true);
    updateEffects(sim, dt);
    sim.time += dt;
    publishHud();
  };

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
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
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
        const raw = (now - last) / 1000;
        last = now;
        const dt = clamp(Number.isFinite(raw) ? raw : 0, 0, 0.05);
        if (!sim.paused) sim.time += dt;
        if (sim.running && !sim.paused) {
          const scaled = dt * clamp(sim.speed, 0.5, 2);
          const steps = Math.max(1, Math.min(8, Math.ceil(scaled / 0.014)));
          const stepDt = scaled / steps;
          for (let i = 0; i < steps; i += 1) {
            updateRunningSim(sim, stepDt);
            if (!sim.running) break;
          }
          updateEffects(sim, scaled);
        }
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(canvas.width / CANVAS_W, 0, 0, canvas.height / CANVAS_H, 0, 0);
            renderSim(ctx, sim, backgroundRef.current);
          }
        }
        hudClock += dt;
        if (hudClock >= 0.08) {
          hudClock = 0;
          setHud(toHud(sim));
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

  const findDominoIndex = (sim: SimState, x: number, y: number) => {
    const radius = clamp(sim.height * 0.45, 30, 54);
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < sim.dominos.length; i += 1) {
      const domino = sim.dominos[i];
      const distance = Math.hypot(domino.x - x, domino.y - y);
      if (distance < bestDistance && distance <= radius) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    return bestIndex;
  };

  const clearHover = (sim: SimState) => {
    sim.ghost = null;
    sim.hoverRemoveId = null;
  };

  const refreshGhost = (sim: SimState, clientX: number, clientY: number) => {
    const point = getWorldPoint(clientX, clientY);
    if (!point) {
      clearHover(sim);
      return;
    }
    const hit = findDominoIndex(sim, point.x, point.y);
    if (hit >= 0) {
      sim.hoverRemoveId = sim.dominos[hit].id;
      sim.ghost = null;
      return;
    }
    sim.hoverRemoveId = null;
    if (sim.running) {
      sim.ghost = null;
      return;
    }
    const nearest = nearestOnTrack(sim.track, point.x, point.y);
    if (nearest.dist > 132) {
      sim.ghost = null;
      return;
    }
    const quality = getPlacementQuality(sim, nearest.s);
    if (quality === 'blocked') {
      sim.ghost = null;
      return;
    }
    sim.ghost = { x: nearest.x, y: nearest.y, s: nearest.s, quality };
  };

  const beginEdit = (sim: SimState) => {
    if (sim.launched || sim.running || sim.settled || sim.paused) resetPose(sim);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerDownRef.current = true;
    const sim = simRef.current;
    if (!sim) return;
    beginEdit(sim);
    const point = getWorldPoint(event.clientX, event.clientY);
    if (!point) {
      publishHud();
      return;
    }
    const hit = findDominoIndex(sim, point.x, point.y);
    if (hit >= 0) {
      removeModeRef.current = true;
      sim.dominos.splice(hit, 1);
      clearHover(sim);
      publishHud();
      return;
    }
    removeModeRef.current = false;
    const nearest = nearestOnTrack(sim.track, point.x, point.y);
    if (nearest.dist <= 132 && insertDomino(sim, nearest.s)) {
      sim.ghost = null;
    }
    publishHud();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    const sim = simRef.current;
    if (!sim) return;
    if (!pointerDownRef.current) {
      refreshGhost(sim, event.clientX, event.clientY);
      return;
    }
    event.preventDefault();
    const point = getWorldPoint(event.clientX, event.clientY);
    if (!point) return;
    if (removeModeRef.current) {
      const hit = findDominoIndex(sim, point.x, point.y);
      if (hit >= 0) {
        sim.dominos.splice(hit, 1);
        clearHover(sim);
        publishHud();
      }
      return;
    }
    const nearest = nearestOnTrack(sim.track, point.x, point.y);
    if (nearest.dist <= 132 && insertDomino(sim, nearest.s)) {
      sim.ghost = null;
      publishHud();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    pointerDownRef.current = false;
    removeModeRef.current = false;
    if (event.pointerType !== 'mouse') {
      const sim = simRef.current;
      if (sim) clearHover(sim);
    }
  };

  const handlePointerCancel = () => {
    pointerDownRef.current = false;
    removeModeRef.current = false;
    const sim = simRef.current;
    if (sim) clearHover(sim);
  };

  const reach = Math.round(getReach(settings.height));

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07100f] text-stone-100 select-none">
      <header className="border-b border-stone-800 bg-[#07100f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games#simulation-games"
              className="shrink-0 whitespace-nowrap rounded border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-[10px] font-bold text-stone-300 transition hover:border-amber-400 hover:text-amber-300 sm:px-3 sm:text-xs"
            >
              ← シミュレーション一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] font-bold tracking-[0.18em] text-amber-400 sm:text-[10px]">
                DOMINO WAVE PROPAGATION LAB
              </p>
              <h2 className="truncate text-xs font-black sm:text-base">
                ドミノ・カスケード連鎖伝播ラボ
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={standUpDominoes}
              className="rounded-lg border border-teal-400/50 bg-teal-950/40 px-2.5 py-1.5 text-[10px] font-black text-teal-200 transition hover:border-teal-300 hover:bg-teal-900/50 sm:text-xs"
            >
              同じ配置のまま立たせ直す
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-2.5 py-2.5 sm:px-4 sm:py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-4">
          <div className="min-w-0">
            {/* 5 Course Presets Bar */}
            <div className="mb-2.5 rounded-xl border border-stone-800 bg-stone-900/60 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black tracking-[0.16em] text-amber-400">
                  コース形状プリセット（5種類）
                </span>
                <span className="text-[10px] text-stone-400">{PRESET_NAMES[settings.preset]}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {(['s', 'loop', 'zigzag', 'spiral', 'branch'] as Preset[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => choosePreset(item)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold transition ${
                      settings.preset === item
                        ? 'border-teal-400 bg-teal-950/60 text-teal-200'
                        : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                    }`}
                  >
                    {PRESET_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="relative overflow-hidden rounded-xl border-2 border-stone-800 bg-[#07100f] shadow-2xl"
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerCancel}
              onLostPointerCapture={handlePointerCancel}
              onContextMenu={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="block w-full touch-none cursor-crosshair"
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/85 via-black/35 to-transparent px-2 py-2 sm:px-3">
                <span className="rounded border border-teal-400/40 bg-teal-950/60 px-2 py-0.5 font-mono text-[10px] font-black text-teal-200 sm:text-xs">
                  {hud.status}
                </span>
                <span className="font-mono text-[10px] font-bold text-stone-200 sm:text-xs">
                  転倒 {hud.toppled} / {hud.placed} 枚 ({hud.cascadeDuration.toFixed(2)}s)
                </span>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 py-2 text-[9px] font-bold text-stone-300 sm:px-3 sm:text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-4 rounded-full bg-[#8cf0cd]" />
                  連鎖到達可 (≤{reach}px)
                  <span className="ml-2 h-1.5 w-4 rounded-full bg-[#ff9b86]" />
                  間隔過大で停止
                </span>
                <span className="hidden text-stone-400 sm:inline">
                  既存ドミノをタップで削除 / トラック上をドラッグで追加配置
                </span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5 sm:gap-2">
              <div className="rounded-lg border border-stone-800 bg-stone-900/70 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-stone-400">転倒枚数 / 総数</p>
                <p className="font-mono text-sm font-black text-teal-200 sm:text-base">
                  {hud.toppled} / {hud.placed}
                </p>
              </div>
              <div className="rounded-lg border border-stone-800 bg-stone-900/70 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-stone-400">伝播速度 (枚/秒)</p>
                <p className="font-mono text-sm font-black text-amber-200 sm:text-base">
                  {hud.propSpeedDom.toFixed(1)} <span className="text-[9px]">枚/s</span>
                </p>
              </div>
              <div className="rounded-lg border border-stone-800 bg-stone-900/70 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-stone-400">空間伝播速度 (px/s)</p>
                <p className="font-mono text-sm font-black text-cyan-200 sm:text-base">
                  {Math.round(hud.propSpeedPx)} <span className="text-[9px]">px/s</span>
                </p>
              </div>
              <div className="rounded-lg border border-stone-800 bg-stone-900/70 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-stone-400">連鎖所要時間</p>
                <p className="font-mono text-sm font-black text-white sm:text-base">
                  {hud.cascadeDuration.toFixed(2)}s
                </p>
              </div>
              <div className="rounded-lg border border-stone-800 bg-stone-900/70 px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-stone-400">最大到達距離</p>
                <p className="font-mono text-sm font-black text-emerald-200 sm:text-base">
                  {reach}px
                </p>
              </div>
            </div>

            <div className="mt-2 rounded-xl border border-stone-800 bg-stone-900/60 p-2.5 sm:p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={launch}
                  disabled={hud.placed === 0}
                  className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-black text-stone-950 shadow-lg transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  連鎖スタート（先頭ドミノを倒す）
                </button>
                <button
                  type="button"
                  onClick={standUpDominoes}
                  disabled={hud.placed === 0 && !hud.launched}
                  className="rounded-xl border border-teal-400/60 bg-teal-950/50 px-4 py-2.5 text-sm font-black text-teal-100 transition hover:border-teal-300 hover:bg-teal-900/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  同じ配置のままドミノを立たせ直す
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={togglePause}
                  disabled={!hud.running}
                  className="rounded-lg border border-teal-500/40 bg-teal-950/40 px-2 py-1.5 text-xs font-bold text-teal-200 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {hud.paused ? '再開' : '一時停止'}
                </button>
                <button
                  type="button"
                  onClick={stepOnce}
                  disabled={!hud.paused}
                  className="rounded-lg border border-stone-600 bg-stone-900 px-2 py-1.5 text-xs font-bold text-stone-200 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  1ステップ
                </button>
                <button
                  type="button"
                  onClick={autoFill}
                  className="rounded-lg border border-stone-600 bg-stone-900 px-2 py-1.5 text-xs font-bold text-stone-200 transition hover:border-teal-400 hover:text-teal-200"
                >
                  等間隔で再配置
                </button>
                <button
                  type="button"
                  onClick={clearDominoes}
                  disabled={hud.placed === 0}
                  className="rounded-lg border border-stone-600 bg-stone-900 px-2 py-1.5 text-xs font-bold text-stone-200 transition hover:border-rose-400 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  全撤去
                </button>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-2.5">
            <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-teal-300">
                  WAVE PROPAGATION (連鎖伝播グラフ)
                </p>
                <span className="font-mono text-[10px] text-amber-200">
                  {hud.cascadeDuration.toFixed(2)}s
                </span>
              </div>
              <PropagationWaveGraph samples={hud.waveSamples} totalPlaced={hud.placed} />
              <p className="mt-1.5 text-[10px] leading-4 text-stone-400">
                最初の数枚で加速したあと、重力トルクと衝突減衰が釣り合う「終端伝播速度（定常波）」へ収束する様子を観察できます。
              </p>
            </section>

            <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-teal-300">
                PHYSICS PARAMETERS
              </p>
              <div className="mt-3 space-y-3">
                <RangeControl
                  label="配置間隔 (動かすだけで即時再配置)"
                  value={settings.spacing}
                  min={MIN_GAP}
                  max={120}
                  step={2}
                  display={`${settings.spacing}px`}
                  onChange={(value) => applySettings({ spacing: value })}
                />
                <RangeControl
                  label="ドミノの高さ (到達距離に比例)"
                  value={settings.height}
                  min={56}
                  max={132}
                  step={2}
                  display={`${settings.height}px`}
                  onChange={(value) => applySettings({ height: value })}
                />
                <RangeControl
                  label="摩擦減衰係数"
                  value={settings.friction}
                  min={0}
                  max={1.2}
                  step={0.05}
                  display={settings.friction.toFixed(2)}
                  onChange={(value) => applySettings({ friction: value })}
                />
                <RangeControl
                  label="初速・押し出しインパルス"
                  value={settings.pushForce}
                  min={0.6}
                  max={2.4}
                  step={0.1}
                  display={settings.pushForce.toFixed(1)}
                  onChange={(value) => applySettings({ pushForce: value })}
                />
                <RangeControl
                  label="重力加速度倍率"
                  value={settings.gravity}
                  min={0.4}
                  max={2}
                  step={0.05}
                  display={`${settings.gravity.toFixed(2)}x`}
                  onChange={(value) => applySettings({ gravity: value })}
                />
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-bold text-stone-300">シミュレーション再生速度</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {[0.5, 1, 2].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => applySettings({ speed: item })}
                      className={`rounded-lg border px-1 py-1.5 font-mono text-[11px] font-bold transition sm:text-xs ${
                        settings.speed === item
                          ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                          : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {item}x
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-amber-300">
                EXPERIMENT TIPS
              </p>
              <ul className="mt-2 space-y-1.5 text-[10px] leading-4 text-stone-300">
                <li>
                  ・<span className="font-bold text-teal-200">間隔と高さの比率実験:</span>{' '}
                  間隔が高さの94%（現在 {reach}px）を超えると、隣のドミノに届かず連鎖が止まります。
                </li>
                <li>
                  ・<span className="font-bold text-amber-200">同条件での再実験:</span>{' '}
                  「同じ配置のままドミノを立たせ直す」を押すと、抜いた隙間を維持したまま重力や高さを変えて再実験できます。
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
