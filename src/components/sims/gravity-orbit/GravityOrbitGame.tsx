'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const WORLD_W = 720;
const WORLD_H = 900;
const LAUNCH_X = 360;
const LAUNCH_Y = 800;
const SENSOR_X = 360;
const SENSOR_Y = 155;
const SENSOR_RADIUS = 52;
const PROBE_RADIUS = 5;
const MAX_PROBES = 12;
const MIN_LAUNCH_SPEED = 60;
const MAX_LAUNCH_SPEED = 620;
const MIN_TRAIL = 40;
const MAX_TRAIL = 1200;
const MAX_SPEED = 2600;
const MAX_ACCEL = 12000;
const G_BASE = 1.15e7;
const SOFTENING = 42;
const FIXED_STEP = 1 / 120;
const PREDICT_STEPS = 720;
const MAX_PARTICLES = 260;
const MAX_GHOSTS = 6;
const MAX_GHOST_POINTS = 600;
const MAX_TELEMETRY_POINTS = 120;

const PROBE_COLORS = [
  '#67e8f9',
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#4ade80',
  '#fb7185',
  '#38bdf8',
  '#fde68a',
  '#34d399',
  '#f97316',
  '#e879f9',
  '#60a5fa',
] as const;

const SPEEDS = [0.5, 1, 2] as const;
const PRESET_KEYS = ['single', 'binary', 'triple', 'ring'] as const;

type Speed = (typeof SPEEDS)[number];
type PresetKey = (typeof PRESET_KEYS)[number];
type BodyKind = 'star' | 'planet';

interface Body {
  x: number;
  y: number;
  radius: number;
  mass: number;
  kind: BodyKind;
  name: string;
  ring: boolean;
  glow: string;
  light: string;
  mid: string;
  dark: string;
  spin: number;
}

interface SystemPreset {
  name: string;
  tagline: string;
  bodies: Body[];
}

interface TrailPoint {
  x: number;
  y: number;
}

interface TelemetrySample {
  t: number;
  speed: number;
  distance: number;
}

interface Probe {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  initialAngleDeg: number;
  color: string;
  trail: TrailPoint[];
  hitSensor: boolean;
  minSensorDist: number;
  maxDeflectionDeg: number;
}

interface GhostTrail {
  id: number;
  points: TrailPoint[];
  color: string;
  life: number;
  maxLife: number;
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

interface AimState {
  active: boolean;
  pointerId: number | null;
  draggingBodyIndex: number | null;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
  originalAngle: number;
}

interface Settings {
  preset: PresetKey;
  planetMass: number;
  gravity: number;
  launchSpeed: number;
  launchAngle: number;
  trailLength: number;
  starEnabled: boolean;
  sensorEnabled: boolean;
  running: boolean;
  speed: Speed;
}

interface GameState {
  bodies: Body[];
  probes: Probe[];
  ghosts: GhostTrail[];
  particles: Particle[];
  telemetry: TelemetrySample[];
  telemetryTimer: number;
  simTime: number;
  aim: AimState;
  selectedId: number | null;
  nextProbeId: number;
  nextGhostId: number;
  visual: number;
  sensorHits: number;
  sensorFlash: number;
  bestSensorApproach: number | null;
  lastDeflectionDeg: number;
}

interface Metrics {
  speed: number;
  distance: number;
  period: number | null;
  active: number;
  trail: number;
  target: string;
  color: string;
  sensorHits: number;
  bestSensorApproach: number | null;
  lastDeflectionDeg: number;
  predictedHitsSensor: boolean;
   predictedMinDist: number;
  telemetry: TelemetrySample[];
}

const PRESETS: Record<PresetKey, SystemPreset> = {
  single: {
    name: 'ソロ・スター',
    tagline: 'ひとつの恒星と2つの惑星。スイングバイと周回軌道を観察する',
    bodies: [
      {
        x: 360,
        y: 360,
        radius: 52,
        mass: 1,
        kind: 'star',
        name: 'SOL',
        ring: false,
        glow: '#22d3ee',
        light: '#ecfeff',
        mid: '#0891b2',
        dark: '#083344',
        spin: 0.14,
      },
      {
        x: 168,
        y: 296,
        radius: 18,
        mass: 0.16,
        kind: 'planet',
        name: 'LUNE',
        ring: false,
        glow: '#94a3b8',
        light: '#f1f5f9',
        mid: '#64748b',
        dark: '#0f172a',
        spin: 0.6,
      },
      {
        x: 552,
        y: 468,
        radius: 24,
        mass: 0.24,
        kind: 'planet',
        name: 'TERRA',
        ring: true,
        glow: '#38bdf8',
        light: '#e0f2fe',
        mid: '#0284c7',
        dark: '#082f49',
        spin: 0.34,
      },
    ],
  },
  binary: {
    name: '連星',
    tagline: '2つの恒星がつくる非対称な重力場と8の字スイングバイを観察する',
    bodies: [
      {
        x: 228,
        y: 344,
        radius: 40,
        mass: 0.62,
        kind: 'star',
        name: 'VEGA',
        ring: false,
        glow: '#f472b6',
        light: '#fce7f3',
        mid: '#db2777',
        dark: '#500724',
        spin: 0.2,
      },
      {
        x: 492,
        y: 344,
        radius: 40,
        mass: 0.62,
        kind: 'star',
        name: 'ALTAIR',
        ring: false,
        glow: '#a78bfa',
        light: '#ede9fe',
        mid: '#7c3aed',
        dark: '#2e1065',
        spin: -0.17,
      },
      {
        x: 360,
        y: 646,
        radius: 20,
        mass: 0.18,
        kind: 'planet',
        name: 'ECHO',
        ring: false,
        glow: '#2dd4bf',
        light: '#ccfbf1',
        mid: '#0d9488',
        dark: '#042f2e',
        spin: 0.5,
      },
    ],
  },
  triple: {
    name: '三体',
    tagline: '3つの重力源が重なり合うカオス的な三体軌道を試す',
    bodies: [
      {
        x: 360,
        y: 246,
        radius: 34,
        mass: 0.48,
        kind: 'star',
        name: 'MIRA',
        ring: false,
        glow: '#fbbf24',
        light: '#fef3c7',
        mid: '#d97706',
        dark: '#451a03',
        spin: 0.19,
      },
      {
        x: 214,
        y: 508,
        radius: 34,
        mass: 0.48,
        kind: 'star',
        name: 'KAON',
        ring: false,
        glow: '#fb7185',
        light: '#ffe4e6',
        mid: '#e11d48',
        dark: '#4c0519',
        spin: -0.22,
      },
      {
        x: 506,
        y: 508,
        radius: 34,
        mass: 0.48,
        kind: 'star',
        name: 'NYX',
        ring: false,
        glow: '#818cf8',
        light: '#e0e7ff',
        mid: '#4f46e5',
        dark: '#1e1b4b',
        spin: 0.16,
      },
      {
        x: 604,
        y: 690,
        radius: 16,
        mass: 0.14,
        kind: 'planet',
        name: 'PICO',
        ring: false,
        glow: '#4ade80',
        light: '#dcfce7',
        mid: '#16a34a',
        dark: '#052e16',
        spin: 0.7,
      },
    ],
  },
  ring: {
    name: 'リング',
    tagline: '恒星のまわりを巡る4惑星と軌道共鳴を観察する',
    bodies: [
      {
        x: 360,
        y: 380,
        radius: 48,
        mass: 0.95,
        kind: 'star',
        name: 'HELIOS',
        ring: false,
        glow: '#f59e0b',
        light: '#fef3c7',
        mid: '#d97706',
        dark: '#451a03',
        spin: 0.13,
      },
      {
        x: 516,
        y: 536,
        radius: 16,
        mass: 0.12,
        kind: 'planet',
        name: 'A1',
        ring: false,
        glow: '#38bdf8',
        light: '#e0f2fe',
        mid: '#0284c7',
        dark: '#082f49',
        spin: 0.55,
      },
      {
        x: 204,
        y: 536,
        radius: 16,
        mass: 0.12,
        kind: 'planet',
        name: 'A2',
        ring: false,
        glow: '#f472b6',
        light: '#fce7f3',
        mid: '#db2777',
        dark: '#500724',
        spin: -0.48,
      },
      {
        x: 204,
        y: 224,
        radius: 16,
        mass: 0.12,
        kind: 'planet',
        name: 'A3',
        ring: false,
        glow: '#4ade80',
        light: '#dcfce7',
        mid: '#16a34a',
        dark: '#052e16',
        spin: 0.42,
      },
      {
        x: 516,
        y: 224,
        radius: 16,
        mass: 0.12,
        kind: 'planet',
        name: 'A4',
        ring: false,
        glow: '#c084fc',
        light: '#f3e8ff',
        mid: '#9333ea',
        dark: '#3b0764',
        spin: -0.39,
      },
    ],
  },
};

// Default settings pre-configured to a verified swingby trajectory that curves around SOL and hits the behind-the-star sensor ring at (360, 155)!
const INITIAL_SETTINGS: Settings = {
  preset: 'single',
  planetMass: 1,
  gravity: 1,
  launchSpeed: 130,
  launchAngle: -59,
  trailLength: 560,
  starEnabled: true,
  sensorEnabled: true,
  running: true,
  speed: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampTrail(value: number): number {
  return clamp(Math.round(value), MIN_TRAIL, MAX_TRAIL);
}

function createBodies(preset: PresetKey): Body[] {
  return PRESETS[preset].bodies.map((body) => ({ ...body }));
}

function createAim(angle: number): AimState {
  return {
    active: false,
    pointerId: null,
    draggingBodyIndex: null,
    x: LAUNCH_X,
    y: LAUNCH_Y - 150,
    startX: LAUNCH_X,
    startY: LAUNCH_Y - 150,
    moved: false,
    originalAngle: angle,
  };
}

function makeProbeAt(
  id: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: string
): Probe {
  const initialAngleDeg = (Math.atan2(vy, vx) * 180) / Math.PI;
  const distToSensor = Math.hypot(x - SENSOR_X, y - SENSOR_Y);
  return {
    id,
    x,
    y,
    vx,
    vy,
    initialAngleDeg,
    color,
    trail: [{ x, y }],
    hitSensor: distToSensor <= SENSOR_RADIUS,
    minSensorDist: distToSensor,
    maxDeflectionDeg: 0,
  };
}

function createGame(): GameState {
  const rad1 = (-59 * Math.PI) / 180;
  const rad2 = (-146 * Math.PI) / 180;
  const p1 = makeProbeAt(
    1,
    LAUNCH_X,
    LAUNCH_Y,
    Math.cos(rad1) * 130,
    Math.sin(rad1) * 130,
    PROBE_COLORS[0]
  );
  const p2 = makeProbeAt(
    2,
    LAUNCH_X,
    LAUNCH_Y,
    Math.cos(rad2) * 140,
    Math.sin(rad2) * 140,
    PROBE_COLORS[1]
  );
  return {
    bodies: createBodies('single'),
    probes: [p1, p2],
    ghosts: [],
    particles: [],
    telemetry: [],
    telemetryTimer: 0,
    simTime: 0,
    aim: createAim(INITIAL_SETTINGS.launchAngle),
    selectedId: 1,
    nextProbeId: 3,
    nextGhostId: 1,
    visual: 0,
    sensorHits: 0,
    sensorFlash: 0,
    bestSensorApproach: null,
    lastDeflectionDeg: 0,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(value)) return `rgba(103, 232, 249, ${alpha})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getActiveBodies(game: GameState, settings: Settings): Body[] {
  return settings.starEnabled ? game.bodies : game.bodies.filter((body) => body.kind !== 'star');
}

function bodyMu(body: Body, settings: Settings): number {
  const massScale = body.kind === 'planet' ? settings.planetMass : 1;
  return G_BASE * settings.gravity * body.mass * massScale;
}

function accelerationAt(x: number, y: number, bodies: Body[], settings: Settings) {
  let ax = 0;
  let ay = 0;
  for (const body of bodies) {
    const dx = body.x - x;
    const dy = body.y - y;
    const softSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
    const distance = Math.sqrt(softSq);
    const scale = bodyMu(body, settings) / (softSq * Math.max(distance, 1));
    ax += dx * scale;
    ay += dy * scale;
  }
  if (!Number.isFinite(ax) || !Number.isFinite(ay)) return { ax: 0, ay: 0 };
  const magnitude = Math.hypot(ax, ay);
  if (magnitude > MAX_ACCEL) {
    const ratio = MAX_ACCEL / magnitude;
    return { ax: ax * ratio, ay: ay * ratio };
  }
  return { ax, ay };
}

function angleDiffDeg(a: number, b: number): number {
  let diff = ((a - b + 540) % 360) - 180;
  if (diff < -180) diff += 360;
  return Math.abs(diff);
}

function pushTrailPoint(probe: Probe, cap: number) {
  const last = probe.trail[probe.trail.length - 1];
  if (!last) {
    probe.trail.push({ x: probe.x, y: probe.y });
    return;
  }
  const dx = probe.x - last.x;
  const dy = probe.y - last.y;
  if (dx * dx + dy * dy < 0.25) return;
  probe.trail.push({ x: probe.x, y: probe.y });
  if (probe.trail.length > cap) {
    probe.trail.splice(0, probe.trail.length - cap);
  }
}

function pushGhost(game: GameState, probe: Probe) {
  if (probe.trail.length < 3) return;
  const stride = Math.max(1, Math.ceil(probe.trail.length / MAX_GHOST_POINTS));
  const points = probe.trail.filter((_, index) => index % stride === 0);
  game.ghosts.push({
    id: game.nextGhostId,
    points,
    color: probe.color,
    life: 1.5,
    maxLife: 1.5,
  });
  game.nextGhostId += 1;
  if (game.ghosts.length > MAX_GHOSTS) game.ghosts.shift();
}

function spawnBurst(game: GameState, x: number, y: number, color: string, count: number) {
  const room = Math.max(0, MAX_PARTICLES - game.particles.length);
  const total = Math.min(count, room);
  for (let index = 0; index < total; index += 1) {
    const angle = (Math.PI * 2 * index) / Math.max(1, total) + Math.random() * 0.5;
    const speed = 30 + Math.random() * 150;
    const life = 0.35 + Math.random() * 0.55;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 0.8 + Math.random() * 2.1,
      color,
    });
  }
}

function updateEffects(game: GameState, dt: number) {
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.988;
    particle.vy = particle.vy * 0.988 + 24 * dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
  for (const ghost of game.ghosts) {
    ghost.life -= dt;
  }
  game.ghosts = game.ghosts.filter((ghost) => ghost.life > 0);
  if (game.sensorFlash > 0) {
    game.sensorFlash = Math.max(0, game.sensorFlash - dt * 1.8);
  }
}

function integrateProbe(
  probe: Probe,
  bodies: Body[],
  settings: Settings,
  dt: number,
  game: GameState
): 'ok' | 'crash' | 'escape' | 'invalid' {
  const acceleration = accelerationAt(probe.x, probe.y, bodies, settings);
  probe.vx += acceleration.ax * dt;
  probe.vy += acceleration.ay * dt;
  const speed = Math.hypot(probe.vx, probe.vy);
  if (!Number.isFinite(speed)) return 'invalid';
  if (speed > MAX_SPEED) {
    const ratio = MAX_SPEED / speed;
    probe.vx *= ratio;
    probe.vy *= ratio;
  }
  probe.x += probe.vx * dt;
  probe.y += probe.vy * dt;
  if (!Number.isFinite(probe.x) || !Number.isFinite(probe.y)) return 'invalid';

  const currentAngleDeg = (Math.atan2(probe.vy, probe.vx) * 180) / Math.PI;
  const deflection = angleDiffDeg(currentAngleDeg, probe.initialAngleDeg);
  if (deflection > probe.maxDeflectionDeg) {
    probe.maxDeflectionDeg = deflection;
  }
  game.lastDeflectionDeg = Math.round(probe.maxDeflectionDeg);

  if (settings.sensorEnabled) {
    const dSensor = Math.hypot(probe.x - SENSOR_X, probe.y - SENSOR_Y);
    if (dSensor < probe.minSensorDist) {
      probe.minSensorDist = dSensor;
    }
    if (game.bestSensorApproach === null || dSensor < game.bestSensorApproach) {
      game.bestSensorApproach = dSensor;
    }
    if (!probe.hitSensor && dSensor <= SENSOR_RADIUS) {
      probe.hitSensor = true;
      game.sensorHits += 1;
      game.sensorFlash = 1;
      spawnBurst(game, probe.x, probe.y, '#34d399', 18);
      sound.sensorPass();
    }
  }

  for (const body of bodies) {
    const dx = body.x - probe.x;
    const dy = body.y - probe.y;
    const radius = body.radius + PROBE_RADIUS;
    if (dx * dx + dy * dy < radius * radius) return 'crash';
  }
  if (probe.x < -180 || probe.x > WORLD_W + 180 || probe.y < -240 || probe.y > WORLD_H + 180) {
    return 'escape';
  }
  return 'ok';
}

function advanceSteps(game: GameState, settings: Settings, count: number) {
  const bodies = getActiveBodies(game, settings);
  const trailCap = clampTrail(settings.trailLength);
  for (let index = 0; index < count; index += 1) {
    game.simTime += FIXED_STEP;
    const survivors: Probe[] = [];
    for (const probe of game.probes) {
      let result: 'ok' | 'crash' | 'escape' | 'invalid' = 'ok';
      for (let sub = 0; sub < 2; sub += 1) {
        result = integrateProbe(probe, bodies, settings, FIXED_STEP / 2, game);
        if (result !== 'ok') break;
      }
      if (result === 'ok') {
        pushTrailPoint(probe, trailCap);
        survivors.push(probe);
      } else {
        pushGhost(game, probe);
        if (result === 'crash') sound.impact();
        spawnBurst(
          game,
          clamp(probe.x, 0, WORLD_W),
          clamp(probe.y, 0, WORLD_H),
          result === 'crash' ? '#fb7185' : probe.color,
          result === 'crash' ? 20 : 10
        );
      }
    }
    game.probes = survivors;
    if (game.selectedId !== null && !game.probes.some((probe) => probe.id === game.selectedId)) {
      game.selectedId = game.probes.length > 0 ? game.probes[game.probes.length - 1].id : null;
    }

    game.telemetryTimer += FIXED_STEP;
    if (game.telemetryTimer >= 0.08) {
      game.telemetryTimer = 0;
      const activeProbe =
        game.probes.find((item) => item.id === game.selectedId) ??
        game.probes[game.probes.length - 1] ??
        null;
      if (activeProbe && bodies.length > 0) {
        let minDist = Number.POSITIVE_INFINITY;
        for (const body of bodies) {
          const dist = Math.max(0, Math.hypot(body.x - activeProbe.x, body.y - activeProbe.y) - body.radius);
          if (dist < minDist) minDist = dist;
        }
        game.telemetry.push({
          t: game.simTime,
          speed: Math.hypot(activeProbe.vx, activeProbe.vy),
          distance: Number.isFinite(minDist) ? minDist : 0,
        });
        if (game.telemetry.length > MAX_TELEMETRY_POINTS) {
          game.telemetry.shift();
        }
      }
    }

    updateEffects(game, FIXED_STEP);
  }
}

function computeAimPrediction(
  bodies: Body[],
  settings: Settings
): { points: TrailPoint[]; hitsSensor: boolean; minSensorDist: number } {
  const angle = (settings.launchAngle * Math.PI) / 180;
  let x = LAUNCH_X;
  let y = LAUNCH_Y;
  let vx = Math.cos(angle) * settings.launchSpeed;
  let vy = Math.sin(angle) * settings.launchSpeed;
  const points: TrailPoint[] = [{ x, y }];
  let hitsSensor = false;
  let minSensorDist = Math.hypot(x - SENSOR_X, y - SENSOR_Y);

  for (let step = 0; step < PREDICT_STEPS; step += 1) {
    let hit = false;
    for (let sub = 0; sub < 2; sub += 1) {
      const dt = FIXED_STEP / 2;
      const acceleration = accelerationAt(x, y, bodies, settings);
      vx += acceleration.ax * dt;
      vy += acceleration.ay * dt;
      const speed = Math.hypot(vx, vy);
      if (!Number.isFinite(speed)) {
        hit = true;
        break;
      }
      if (speed > MAX_SPEED) {
        const ratio = MAX_SPEED / speed;
        vx *= ratio;
        vy *= ratio;
      }
      x += vx * dt;
      y += vy * dt;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        hit = true;
        break;
      }
      const dSensor = Math.hypot(x - SENSOR_X, y - SENSOR_Y);
      if (dSensor < minSensorDist) minSensorDist = dSensor;
      if (dSensor <= SENSOR_RADIUS) hitsSensor = true;

      for (const body of bodies) {
        const dx = body.x - x;
        const dy = body.y - y;
        const radius = body.radius + PROBE_RADIUS;
        if (dx * dx + dy * dy < radius * radius) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    if (step % 2 === 0) points.push({ x, y });
    if (hit) break;
    if (x < -180 || x > WORLD_W + 180 || y < -240 || y > WORLD_H + 180) break;
  }
  return { points, hitsSensor, minSensorDist };
}

function computeMetrics(game: GameState, settings: Settings): Metrics {
  const bodies = getActiveBodies(game, settings);
  const prediction = computeAimPrediction(bodies, settings);
  const probe =
    game.probes.find((item) => item.id === game.selectedId) ??
    game.probes[game.probes.length - 1] ??
    null;
  if (!probe) {
    return {
      speed: 0,
      distance: 0,
      period: null,
      active: game.probes.length,
      trail: 0,
      target: '—',
      color: '#67e8f9',
      sensorHits: game.sensorHits,
      bestSensorApproach: game.bestSensorApproach,
      lastDeflectionDeg: game.lastDeflectionDeg,
      predictedHitsSensor: prediction.hitsSensor,
      predictedMinDist: prediction.minSensorDist,
      telemetry: [...game.telemetry],
    };
  }

  let nearestBody: Body | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let dominantBody: Body | null = null;
  let dominantPull = 0;
  let dominantDistance = 0;

  for (const body of bodies) {
    const dx = body.x - probe.x;
    const dy = body.y - probe.y;
    const centerDistance = Math.hypot(dx, dy);
    const surfaceDistance = Math.max(0, centerDistance - body.radius);
    if (surfaceDistance < nearestDistance) {
      nearestDistance = surfaceDistance;
      nearestBody = body;
    }
    const pull = bodyMu(body, settings) / Math.max(1, centerDistance * centerDistance);
    if (pull > dominantPull) {
      dominantPull = pull;
      dominantBody = body;
      dominantDistance = centerDistance;
    }
  }

  let period: number | null = null;
  if (dominantBody) {
    const mu = bodyMu(dominantBody, settings);
    const radius = Math.max(dominantBody.radius + PROBE_RADIUS, dominantDistance);
    const speed = Math.hypot(probe.vx, probe.vy);
    const energy = (speed * speed) / 2 - mu / radius;
    if (energy < -1e-5) {
      const semiMajor = -mu / (2 * energy);
      if (Number.isFinite(semiMajor) && semiMajor > 0) {
        const estimate = Math.PI * 2 * Math.sqrt((semiMajor * semiMajor * semiMajor) / mu);
        if (Number.isFinite(estimate) && estimate > 0 && estimate < 3600) {
          period = estimate;
        }
      }
    }
  }

  return {
    speed: Math.hypot(probe.vx, probe.vy),
    distance: Number.isFinite(nearestDistance) ? nearestDistance : 0,
    period,
    active: game.probes.length,
    trail: probe.trail.length,
    target: nearestBody?.name ?? '—',
    color: probe.color,
    sensorHits: game.sensorHits,
    bestSensorApproach: game.bestSensorApproach,
    lastDeflectionDeg: Math.round(probe.maxDeflectionDeg),
    predictedHitsSensor: prediction.hitsSensor,
    predictedMinDist: prediction.minSensorDist,
    telemetry: [...game.telemetry],
  };
}

function makeBackgroundStars() {
  let seed = 20261105;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 140 }, () => ({
    x: random() * WORLD_W,
    y: random() * WORLD_H,
    r: 0.5 + random() * 1.7,
    alpha: 0.18 + random() * 0.68,
    phase: random() * Math.PI * 2,
    speed: 0.35 + random() * 1.4,
  }));
}

const BG_STARS = makeBackgroundStars();

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
    this.tone(170, 520, 0.2, 'sine', 0.09);
    this.tone(420, 180, 0.1, 'triangle', 0.04, 0.02);
  }

  sensorPass() {
    this.tone(520, 880, 0.16, 'sine', 0.07);
    this.tone(660, 1040, 0.18, 'triangle', 0.05, 0.05);
  }

  impact() {
    this.tone(160, 52, 0.28, 'sine', 0.05);
  }

  ui() {
    this.tone(420, 520, 0.06, 'sine', 0.035);
  }
}

const sound = new OrbitSound();

function drawBackground(ctx: CanvasRenderingContext2D, time: number) {
  const background = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  background.addColorStop(0, '#040611');
  background.addColorStop(0.52, '#080d1c');
  background.addColorStop(1, '#0b0716');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const nebulaA = ctx.createRadialGradient(148, 190, 20, 148, 190, 380);
  nebulaA.addColorStop(0, 'rgba(34,211,238,0.14)');
  nebulaA.addColorStop(0.5, 'rgba(37,99,235,0.07)');
  nebulaA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebulaA;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const nebulaB = ctx.createRadialGradient(604, 526, 10, 604, 526, 430);
  nebulaB.addColorStop(0, 'rgba(217,70,239,0.11)');
  nebulaB.addColorStop(0.55, 'rgba(76,29,149,0.06)');
  nebulaB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebulaB;
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
  ctx.strokeStyle = 'rgba(103,232,249,0.045)';
  ctx.lineWidth = 1;
  for (let index = 0; index < 6; index += 1) {
    ctx.beginPath();
    ctx.arc(LAUNCH_X, LAUNCH_Y, 90 + index * 78, -Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrbitGuides(ctx: CanvasRenderingContext2D, bodies: Body[]) {
  ctx.save();
  ctx.setLineDash([3, 11]);
  ctx.lineWidth = 1;
  for (const body of bodies) {
    ctx.strokeStyle = hexToRgba(body.glow, 0.12);
    ctx.beginPath();
    ctx.arc(body.x, body.y, body.radius + 98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(253,230,138,0.05)';
    ctx.beginPath();
    ctx.arc(body.x, body.y, body.radius + 185, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSensorZone(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  settings: Settings,
  time: number,
  predictedHits: boolean
) {
  if (!settings.sensorEnabled) return;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
  const flash = game.sensorFlash;
  ctx.save();
  ctx.translate(SENSOR_X, SENSOR_Y);

  const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, SENSOR_RADIUS * 1.45);
  glow.addColorStop(
    0,
    predictedHits || flash > 0
      ? `rgba(52, 211, 153, ${0.26 + flash * 0.35})`
      : 'rgba(56, 189, 248, 0.14)'
  );
  glow.addColorStop(0.65, 'rgba(16, 185, 129, 0.06)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, SENSOR_RADIUS * 1.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle =
    predictedHits || flash > 0
      ? `rgba(52, 211, 153, ${0.65 + pulse * 0.25})`
      : `rgba(103, 232, 249, ${0.38 + pulse * 0.18})`;
  ctx.lineWidth = 2 + flash * 2;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 18;
  ctx.beginPath();
  ctx.arc(0, 0, SENSOR_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(167, 243, 208, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, SENSOR_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.moveTo(-14, 0);
  ctx.lineTo(14, 0);
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 14);
  ctx.stroke();

  ctx.fillStyle = predictedHits ? '#6ee7b7' : '#a5f3fc';
  ctx.font = '700 9px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SWING-BY SENSOR (星の背後観測ゾーン)', 0, -SENSOR_RADIUS - 10);
  ctx.fillStyle = 'rgba(209, 250, 229, 0.85)';
  ctx.font = '700 10px ui-monospace, monospace';
  ctx.fillText(`通過数: ${game.sensorHits}`, 0, SENSOR_RADIUS + 16);
  ctx.restore();
}

function strokeTrail(
  ctx: CanvasRenderingContext2D,
  points: TrailPoint[],
  color: string,
  alpha: number
) {
  if (points.length < 2) return;
  const first = points[0];
  const last = points[points.length - 1];
  const gradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
  gradient.addColorStop(0, hexToRgba(color, 0));
  gradient.addColorStop(0.35, hexToRgba(color, alpha * 0.28));
  gradient.addColorStop(0.82, hexToRgba(color, alpha * 0.78));
  gradient.addColorStop(1, hexToRgba(color, alpha * 0.95));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexToRgba(color, alpha * 0.32);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}

function drawGhosts(ctx: CanvasRenderingContext2D, ghosts: GhostTrail[]) {
  for (const ghost of ghosts) {
    const alpha = Math.max(0, ghost.life / ghost.maxLife);
    strokeTrail(ctx, ghost.points, ghost.color, alpha * 0.55);
  }
}

function drawBody(ctx: CanvasRenderingContext2D, body: Body, time: number, isDragging: boolean) {
  if (body.ring) {
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(-0.3);
    ctx.strokeStyle = hexToRgba(body.glow, 0.24);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, body.radius * 1.72, body.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(body.glow, 0.1);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, body.radius * 1.88, body.radius * 0.57, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (body.kind === 'star') {
    const pulse = 0.78 + 0.22 * Math.sin(time * 1.6 + body.spin * 9);
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(time * body.spin);
    ctx.strokeStyle = hexToRgba(body.glow, 0.22 * pulse);
    ctx.lineWidth = 2;
    for (let index = 0; index < 8; index += 1) {
      const angle = (index * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (body.radius + 7), Math.sin(angle) * (body.radius + 7));
      ctx.lineTo(Math.cos(angle) * (body.radius + 28), Math.sin(angle) * (body.radius + 28));
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = body.glow;
  ctx.shadowBlur = body.kind === 'star' ? 44 : 24;
  const surface = ctx.createRadialGradient(
    body.x - body.radius * 0.38,
    body.y - body.radius * 0.42,
    body.radius * 0.08,
    body.x,
    body.y,
    body.radius
  );
  surface.addColorStop(0, body.light);
  surface.addColorStop(0.42, body.mid);
  surface.addColorStop(1, body.dark);
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = isDragging ? 0.9 : 0.5;
  ctx.strokeStyle = isDragging ? '#fde68a' : body.glow;
  ctx.lineWidth = isDragging ? 2.5 : 1.4;
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius + (isDragging ? 6 : 1.5), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = hexToRgba(body.light, 0.72);
  ctx.font = '600 10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${body.name} (ドラッグ移動可)`, body.x, body.y + body.radius + 20);
  ctx.restore();
}

function drawLaunchPad(ctx: CanvasRenderingContext2D, time: number, ready: boolean) {
  ctx.save();
  ctx.translate(LAUNCH_X, LAUNCH_Y);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 76);
  glow.addColorStop(0, `rgba(34,211,238,${ready ? 0.22 : 0.09})`);
  glow.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 76, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(103,232,249,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(103,232,249,0.24)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.rotate(time * 0.5);
  ctx.strokeStyle = 'rgba(253,230,138,0.62)';
  ctx.lineWidth = 2;
  for (let index = 0; index < 4; index += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, 43, (index * Math.PI) / 2 + 0.18, (index * Math.PI) / 2 + 0.78);
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
  ctx.fillStyle = 'rgba(165,243,252,0.66)';
  ctx.font = '700 9px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LAUNCH PAD', 0, 58);
  ctx.restore();
}

function drawPredictedPathAndAim(
  ctx: CanvasRenderingContext2D,
  aim: AimState,
  prediction: { points: TrailPoint[]; hitsSensor: boolean; minSensorDist: number },
  settings: Settings
) {
  const { points, hitsSensor } = prediction;
  if (points.length < 2) return;
  ctx.save();

  // Always render the predicted trajectory curve from current launchSpeed + launchAngle
  ctx.setLineDash([5, 6]);
  ctx.strokeStyle = hitsSensor ? 'rgba(52, 211, 153, 0.58)' : 'rgba(165, 243, 252, 0.32)';
  ctx.lineWidth = hitsSensor ? 2.2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  const angle = (settings.launchAngle * Math.PI) / 180;
  ctx.strokeStyle = hitsSensor ? 'rgba(52, 211, 153, 0.85)' : 'rgba(103, 232, 249, 0.75)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(LAUNCH_X + Math.cos(angle) * 24, LAUNCH_Y + Math.sin(angle) * 24);
  ctx.lineTo(LAUNCH_X + Math.cos(angle) * 68, LAUNCH_Y + Math.sin(angle) * 68);
  ctx.stroke();

  if (aim.active && aim.moved && aim.draggingBodyIndex === null) {
    ctx.strokeStyle = 'rgba(253,230,138,0.88)';
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
  }
  ctx.restore();
}

function drawProbe(ctx: CanvasRenderingContext2D, probe: Probe, time: number) {
  ctx.save();
  const halo = ctx.createRadialGradient(probe.x, probe.y, 1, probe.x, probe.y, 25);
  halo.addColorStop(0, 'rgba(255,255,255,0.96)');
  halo.addColorStop(0.24, hexToRgba(probe.color, 0.56));
  halo.addColorStop(1, hexToRgba(probe.color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(probe.x, probe.y, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(probe.x, probe.y);
  ctx.rotate(time * 1.7 + probe.id);
  ctx.strokeStyle = hexToRgba(probe.color, 0.8);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0.3, 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 11, 3.44, 5.54);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = probe.color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
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

function renderScene(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  settings: Settings,
  visualTime: number
) {
  const bodies = getActiveBodies(game, settings);
  const prediction = computeAimPrediction(bodies, settings);
  drawBackground(ctx, visualTime);
  drawOrbitGuides(ctx, bodies);
  drawSensorZone(ctx, game, settings, visualTime, prediction.hitsSensor);
  drawGhosts(ctx, game.ghosts);
  for (const probe of game.probes) {
    strokeTrail(ctx, probe.trail, probe.color, 1);
  }
  for (let i = 0; i < game.bodies.length; i += 1) {
    const body = game.bodies[i];
    if (!settings.starEnabled && body.kind === 'star') continue;
    drawBody(ctx, body, visualTime, game.aim.draggingBodyIndex === i);
  }
  drawLaunchPad(ctx, visualTime, game.probes.length < MAX_PROBES);
  drawPredictedPathAndAim(ctx, game.aim, prediction, settings);
  for (const probe of game.probes) {
    drawProbe(ctx, probe, visualTime);
  }
  drawParticles(ctx, game.particles);

  const vignette = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.28,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.78
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

function KeplerTelemetryGraph({ samples }: { samples: TelemetrySample[] }) {
  const width = 280;
  const height = 88;
  const pad = { top: 8, right: 8, bottom: 16, left: 26 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (samples.length < 2) {
    return (
      <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 text-[10px] text-slate-400">
        探査機が飛行すると軌道速度と距離の波形を記録します
      </div>
    );
  }

  const maxSpeed = Math.max(200, ...samples.map((s) => s.speed));
  const maxDist = Math.max(200, ...samples.map((s) => s.distance));

  const speedPoints = samples
    .map((s, idx) => {
      const x = pad.left + (idx / Math.max(1, samples.length - 1)) * plotW;
      const y = pad.top + (1 - Math.min(1, s.speed / maxSpeed)) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const distPoints = samples
    .map((s, idx) => {
      const x = pad.left + (idx / Math.max(1, samples.length - 1)) * plotW;
      const y = pad.top + (1 - Math.min(1, s.distance / maxDist)) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-1.5 h-auto w-full rounded-lg bg-black/25 p-1"
      role="img"
      aria-label="軌道速度と天体距離のリアルタイム推移グラフ"
    >
      <line
        x1={pad.left}
        y1={pad.top + plotH}
        x2={width - pad.right}
        y2={pad.top + plotH}
        stroke="rgba(148,163,184,0.2)"
      />
      <line
        x1={pad.left}
        y1={pad.top}
        x2={pad.left}
        y2={pad.top + plotH}
        stroke="rgba(148,163,184,0.2)"
      />
      <polyline
        points={distPoints}
        fill="none"
        stroke="#fbbf24"
        strokeWidth={1.5}
        strokeDasharray="3 2"
      />
      <polyline points={speedPoints} fill="none" stroke="#22d3ee" strokeWidth={2} />
      <text x={pad.left - 3} y={pad.top + 6} textAnchor="end" fontSize={7} fill="#67e8f9">
        {Math.round(maxSpeed)}
      </text>
      <text x={pad.left - 3} y={pad.top + plotH} textAnchor="end" fontSize={7} fill="#94a3b8">
        0
      </text>
      <text x={pad.left + 4} y={height - 3} fontSize={7} fill="#67e8f9">
        ― 速度(u/s)
      </text>
      <text x={width - pad.right} y={height - 3} textAnchor="end" fontSize={7} fill="#fbbf24">
        --- 天体距離(u)
      </text>
    </svg>
  );
}

export default function GravityOrbitGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  if (gameRef.current === null) {
    gameRef.current = createGame();
  }
  const settingsRef = useRef<Settings>(INITIAL_SETTINGS);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [metrics, setMetrics] = useState<Metrics>(() =>
    computeMetrics(gameRef.current as GameState, settingsRef.current)
  );
  const [soundOn, setSoundOn] = useState(true);

  const publishMetrics = useCallback(() => {
    if (!gameRef.current) return;
    setMetrics(computeMetrics(gameRef.current, settingsRef.current));
  }, []);

  const applySettings = useCallback(
    (patch: Partial<Settings>) => {
      const game = gameRef.current;
      if (!game) return;
      const next = { ...settingsRef.current, ...patch };
      if (patch.trailLength !== undefined) {
        const cap = clampTrail(next.trailLength);
        next.trailLength = cap;
        for (const probe of game.probes) {
          if (probe.trail.length > cap) {
            probe.trail.splice(0, probe.trail.length - cap);
          }
        }
      }
      settingsRef.current = next;
      setSettings(next);
      publishMetrics();
    },
    [publishMetrics]
  );

  const spawnProbeWithVelocity = useCallback(
    (x: number, y: number, vx: number, vy: number, customColor?: string) => {
      const game = gameRef.current;
      if (!game) return;
      if (game.probes.length >= MAX_PROBES) {
        const oldest = game.probes.shift();
        if (oldest) pushGhost(game, oldest);
      }
      const id = game.nextProbeId;
      game.nextProbeId += 1;
      const color = customColor ?? PROBE_COLORS[(id - 1) % PROBE_COLORS.length];
      const probe = makeProbeAt(id, x, y, vx, vy, color);
      game.probes.push(probe);
      game.selectedId = id;
      spawnBurst(game, x, y, color, 10);
    },
    []
  );

  const launchProbe = useCallback(() => {
    const current = settingsRef.current;
    const angle = (current.launchAngle * Math.PI) / 180;
    spawnProbeWithVelocity(
      LAUNCH_X,
      LAUNCH_Y,
      Math.cos(angle) * current.launchSpeed,
      Math.sin(angle) * current.launchSpeed
    );
    sound.launch();
    publishMetrics();
  }, [publishMetrics, spawnProbeWithVelocity]);

  // 1-Click Orbital Experiment Presets
  const runExperimentSwingbyBehindStar = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const next: Settings = {
      ...settingsRef.current,
      preset: 'single',
      planetMass: 1,
      gravity: 1,
      starEnabled: true,
      sensorEnabled: true,
      launchSpeed: 130,
      launchAngle: -59,
      running: true,
    };
    settingsRef.current = next;
    setSettings(next);
    game.bodies = createBodies('single');
    game.probes = [];
    game.ghosts = [];
    game.telemetry = [];
    // Launch two verified swingby probes (right-side -59° @ 130 u/s & left-side -146° @ 140 u/s) that both curve behind SOL into (360, 155)!
    const rRight = (-59 * Math.PI) / 180;
    const rLeft = (-146 * Math.PI) / 180;
    spawnProbeWithVelocity(
      LAUNCH_X,
      LAUNCH_Y,
      Math.cos(rRight) * 130,
      Math.sin(rRight) * 130,
      '#34d399'
    );
    spawnProbeWithVelocity(
      LAUNCH_X,
      LAUNCH_Y,
      Math.cos(rLeft) * 140,
      Math.sin(rLeft) * 140,
      '#67e8f9'
    );
    sound.launch();
    publishMetrics();
  }, [publishMetrics, spawnProbeWithVelocity]);

  const runExperimentStableOrbit = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const next: Settings = {
      ...settingsRef.current,
      preset: 'single',
      planetMass: 0.4,
      gravity: 1,
      starEnabled: true,
      launchSpeed: 130,
      launchAngle: -59,
      running: true,
    };
    settingsRef.current = next;
    setSettings(next);
    game.bodies = createBodies('single');
    game.probes = [];
    game.ghosts = [];
    game.telemetry = [];

    // 1. Inner circular orbit around SOL (r = 150, y = 210)
    const r1 = 150;
    const v1 = Math.sqrt((G_BASE * r1 * r1) / Math.pow(r1 * r1 + SOFTENING * SOFTENING, 1.5));
    spawnProbeWithVelocity(360, 360 - r1, v1, 0, '#fbbf24');

    // 2. Outer elliptical orbit around SOL (r = 220, y = 580)
    const r2 = 220;
    const v2 =
      Math.sqrt((G_BASE * r2 * r2) / Math.pow(r2 * r2 + SOFTENING * SOFTENING, 1.5)) * 1.08;
    spawnProbeWithVelocity(360, 360 + r2, -v2, 0, '#67e8f9');

    // 3. High-inclination bound orbit from launchpad
    const angle = (-59 * Math.PI) / 180;
    spawnProbeWithVelocity(
      LAUNCH_X,
      LAUNCH_Y,
      Math.cos(angle) * 130,
      Math.sin(angle) * 130,
      '#a78bfa'
    );
    sound.launch();
    publishMetrics();
  }, [publishMetrics, spawnProbeWithVelocity]);

  const runExperimentSpreadFan = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const next: Settings = {
      ...settingsRef.current,
      running: true,
    };
    settingsRef.current = next;
    setSettings(next);
    game.probes = [];
    game.ghosts = [];
    game.telemetry = [];

    const speed = next.launchSpeed;
    // Launch 11 probes in a fan from -140° to -40°
    for (let i = 0; i < 11; i += 1) {
      const deg = -140 + i * 10;
      const rad = (deg * Math.PI) / 180;
      spawnProbeWithVelocity(
        LAUNCH_X,
        LAUNCH_Y,
        Math.cos(rad) * speed,
        Math.sin(rad) * speed,
        PROBE_COLORS[i % PROBE_COLORS.length]
      );
    }
    sound.launch();
    publishMetrics();
  }, [publishMetrics, spawnProbeWithVelocity]);

  const runExperimentBinaryFigure8 = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const nextPreset: PresetKey = settingsRef.current.preset === 'binary' ? 'triple' : 'binary';
    const launchSpeed = nextPreset === 'binary' ? 120 : 155;
    const launchAngle = nextPreset === 'binary' ? -131 : -102;
    const next: Settings = {
      ...settingsRef.current,
      preset: nextPreset,
      planetMass: 1,
      gravity: 1,
      starEnabled: true,
      launchSpeed,
      launchAngle,
      running: true,
    };
    settingsRef.current = next;
    setSettings(next);
    game.bodies = createBodies(nextPreset);
    game.probes = [];
    game.ghosts = [];
    game.telemetry = [];

    const a1 = (launchAngle * Math.PI) / 180;
    const a2 = ((-180 - launchAngle) * Math.PI) / 180;
    spawnProbeWithVelocity(
      LAUNCH_X,
      LAUNCH_Y,
      Math.cos(a1) * launchSpeed,
      Math.sin(a1) * launchSpeed,
      '#f472b6'
    );
    spawnProbeWithVelocity(
      LAUNCH_X,
      LAUNCH_Y,
      Math.cos(a2) * launchSpeed,
      Math.sin(a2) * launchSpeed,
      '#a78bfa'
    );
    sound.launch();
    publishMetrics();
  }, [publishMetrics, spawnProbeWithVelocity]);

  const resetSim = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.bodies = createBodies(settingsRef.current.preset);
    game.probes = [];
    game.ghosts = [];
    game.particles = [];
    game.telemetry = [];
    game.aim = createAim(settingsRef.current.launchAngle);
    game.selectedId = null;
    game.sensorHits = 0;
    game.bestSensorApproach = null;
    game.lastDeflectionDeg = 0;
    sound.ui();
    publishMetrics();
  }, [publishMetrics]);

  const selectPreset = useCallback(
    (preset: PresetKey) => {
      const game = gameRef.current;
      if (!game) return;
      const defaultLaunch =
        preset === 'single'
          ? { launchSpeed: 130, launchAngle: -59 }
          : preset === 'binary'
            ? { launchSpeed: 120, launchAngle: -131 }
            : preset === 'triple'
              ? { launchSpeed: 155, launchAngle: -102 }
              : { launchSpeed: 145, launchAngle: -64 };
      const next = { ...settingsRef.current, preset, ...defaultLaunch };
      settingsRef.current = next;
      setSettings(next);
      game.bodies = createBodies(preset);
      game.probes = [];
      game.ghosts = [];
      game.particles = [];
      game.telemetry = [];
      game.aim = createAim(next.launchAngle);
      game.selectedId = null;
      const rad = (next.launchAngle * Math.PI) / 180;
      spawnProbeWithVelocity(
        LAUNCH_X,
        LAUNCH_Y,
        Math.cos(rad) * next.launchSpeed,
        Math.sin(rad) * next.launchSpeed
      );
      sound.ui();
      publishMetrics();
    },
    [publishMetrics, spawnProbeWithVelocity]
  );

  const toggleRunning = useCallback(() => {
    applySettings({ running: !settingsRef.current.running });
    sound.ui();
  }, [applySettings]);

  const stepOnce = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const next = { ...settingsRef.current, running: false };
    settingsRef.current = next;
    setSettings(next);
    advanceSteps(game, next, 2);
    publishMetrics();
  }, [publishMetrics]);

  const toggleStar = useCallback(() => {
    applySettings({ starEnabled: !settingsRef.current.starEnabled });
    sound.ui();
  }, [applySettings]);

  const toggleSensor = useCallback(() => {
    applySettings({ sensorEnabled: !settingsRef.current.sensorEnabled });
    sound.ui();
  }, [applySettings]);

  const toggleSound = useCallback(() => {
    const next = !sound.enabled;
    sound.enabled = next;
    setSoundOn(next);
    if (next) sound.ui();
  }, []);

  const getWorldPoint = useCallback((clientX: number, clientY: number, element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * WORLD_W,
      y: ((clientY - rect.top) / Math.max(1, rect.height)) * WORLD_H,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, a, input, label')) return;
      if (!event.isPrimary) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const game = gameRef.current;
      if (!game) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = getWorldPoint(event.clientX, event.clientY, event.currentTarget);

      // Check if user clicked on a celestial body to drag it!
      let hitBodyIndex: number | null = null;
      for (let i = 0; i < game.bodies.length; i += 1) {
        const body = game.bodies[i];
        if (!settingsRef.current.starEnabled && body.kind === 'star') continue;
        if (Math.hypot(point.x - body.x, point.y - body.y) <= body.radius + 16) {
          hitBodyIndex = i;
          break;
        }
      }

      game.aim = {
        active: true,
        pointerId: event.pointerId,
        draggingBodyIndex: hitBodyIndex,
        x: point.x,
        y: point.y,
        startX: point.x,
        startY: point.y,
        moved: false,
        originalAngle: settingsRef.current.launchAngle,
      };
    },
    [getWorldPoint]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (!game || !game.aim.active || game.aim.pointerId !== event.pointerId) return;
      event.preventDefault();
      const point = getWorldPoint(event.clientX, event.clientY, event.currentTarget);

      if (game.aim.draggingBodyIndex !== null) {
        const body = game.bodies[game.aim.draggingBodyIndex];
        if (body) {
          body.x = clamp(point.x, body.radius + 12, WORLD_W - body.radius - 12);
          body.y = clamp(point.y, body.radius + 12, WORLD_H - 120);
        }
        return;
      }

      const dx = point.x - game.aim.startX;
      const dy = point.y - game.aim.startY;
      if (dx * dx + dy * dy > 25) game.aim.moved = true;
      game.aim.x = point.x;
      game.aim.y = point.y;
      if (game.aim.moved) {
        const aimX = point.x - LAUNCH_X;
        const aimY = point.y - LAUNCH_Y;
        if (aimX * aimX + aimY * aimY > 400) {
          const angle = Math.round((Math.atan2(aimY, aimX) * 180) / Math.PI);
          const next = { ...settingsRef.current, launchAngle: angle };
          settingsRef.current = next;
          setSettings(next);
        }
      }
    },
    [getWorldPoint]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const game = gameRef.current;
      if (!game || !game.aim.active || game.aim.pointerId !== event.pointerId) return;
      event.preventDefault();
      const point = getWorldPoint(event.clientX, event.clientY, event.currentTarget);
      const aim = { ...game.aim };
      game.aim = {
        active: false,
        pointerId: null,
        draggingBodyIndex: null,
        x: point.x,
        y: point.y,
        startX: point.x,
        startY: point.y,
        moved: false,
        originalAngle: aim.originalAngle,
      };
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (aim.draggingBodyIndex !== null) {
        publishMetrics();
        return;
      }
      if (!aim.moved) {
        // Single tap on canvas aims toward that point and launches!
        const tapDx = point.x - LAUNCH_X;
        const tapDy = point.y - LAUNCH_Y;
        if (tapDx * tapDx + tapDy * tapDy > 900) {
          const angle = Math.round((Math.atan2(tapDy, tapDx) * 180) / Math.PI);
          const next = { ...settingsRef.current, launchAngle: angle };
          settingsRef.current = next;
          setSettings(next);
          launchProbe();
        }
        return;
      }
      const dx = point.x - LAUNCH_X;
      const dy = point.y - LAUNCH_Y;
      if (dx * dx + dy * dy < 400) {
        settingsRef.current = { ...settingsRef.current, launchAngle: aim.originalAngle };
        return;
      }
      const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      const next = { ...settingsRef.current, launchAngle: angle };
      settingsRef.current = next;
      setSettings(next);
      launchProbe();
    },
    [getWorldPoint, launchProbe, publishMetrics]
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const game = gameRef.current;
    if (game && game.aim.active && game.aim.pointerId === event.pointerId) {
      settingsRef.current = { ...settingsRef.current, launchAngle: game.aim.originalAngle };
      game.aim = createAim(game.aim.originalAngle);
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
    let rafId = 0;
    let last = performance.now();
    let accumulator = 0;
    let hudClock = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const game = gameRef.current;
      const current = settingsRef.current;
      if (game) {
        game.visual += dt;
        if (current.running) {
          accumulator += dt * current.speed;
          let steps = 0;
          while (accumulator >= FIXED_STEP && steps < 14) {
            advanceSteps(game, current, 1);
            accumulator -= FIXED_STEP;
            steps += 1;
          }
          if (accumulator > FIXED_STEP * 10) accumulator = 0;
        } else {
          accumulator = 0;
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            const scaleX = canvas.width / WORLD_W;
            const scaleY = canvas.height / WORLD_H;
            ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
            ctx.clearRect(0, 0, WORLD_W, WORLD_H);
            renderScene(ctx, game, current, game.visual);
          }
        }

        hudClock += dt;
        if (hudClock >= 0.12) {
          hudClock = 0;
          publishMetrics();
        }
      }
      rafId = window.requestAnimationFrame(frame);
    };
    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [publishMetrics]);

  const preset = PRESETS[settings.preset];
  const angleValue = settings.launchAngle;
  const periodLabel = metrics.period === null ? '—' : `${metrics.period.toFixed(1)} s`;
  const bestApproachLabel =
    metrics.bestSensorApproach === null ? '—' : `${metrics.bestSensorApproach.toFixed(1)} px`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05070f] text-slate-100 select-none">
      <header className="border-b border-cyan-400/15 bg-[#070b16]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games#simulation-games"
              className="shrink-0 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200 sm:px-3 sm:text-xs"
            >
              一覧へ
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-[0.18em] text-cyan-300/80 sm:text-[10px]">
                GRAVITY ORBIT / ORBITAL &amp; SWING-BY LAB
              </p>
              <h2 className="truncate text-sm font-black sm:text-lg">重力オービット・軌道実験ラボ</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-950/30 px-2.5 py-1 text-[10px] text-slate-300">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  settings.running ? 'animate-pulse bg-cyan-300' : 'bg-amber-300'
                }`}
              />
              <span className="font-mono font-bold">{settings.running ? 'RUNNING' : 'PAUSED'}</span>
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
              onClick={resetSim}
              className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-black text-amber-200 transition hover:border-amber-300/70 hover:bg-amber-400/20 sm:text-xs"
            >
              リセット
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:grid-cols-[minmax(0,600px)_340px] lg:justify-center lg:gap-5">
        <div className="min-w-0 sm:mx-auto sm:w-full sm:max-w-[560px] lg:mx-0 lg:max-w-none">
          {/* 1-Click Orbital Experiment Presets Bar */}
          <div className="mb-2.5 rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black tracking-[0.16em] text-emerald-300">
                ワンタップ軌道実験プリセット（即座に軌道を再現）
              </span>
              <span className="text-[9px] font-bold text-emerald-200/70">天体もドラッグで移動可能</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={runExperimentSwingbyBehindStar}
                className="rounded-lg border border-emerald-300/50 bg-emerald-400/15 px-2 py-2 text-[10px] font-black text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-400/25"
              >
                星の背後へスイングバイ命中
              </button>
              <button
                type="button"
                onClick={runExperimentStableOrbit}
                className="rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-2 py-2 text-[10px] font-black text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-400/25"
              >
                安定周回（円・楕円軌道）
              </button>
              <button
                type="button"
                onClick={runExperimentSpreadFan}
                className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-2 py-2 text-[10px] font-black text-amber-100 transition hover:border-amber-200 hover:bg-amber-400/25"
              >
                扇状11機スプレッド発射
              </button>
              <button
                type="button"
                onClick={runExperimentBinaryFigure8}
                className="rounded-lg border border-fuchsia-300/40 bg-fuchsia-400/15 px-2 py-2 text-[10px] font-black text-fuchsia-100 transition hover:border-fuchsia-200 hover:bg-fuchsia-400/25"
              >
                連星8の字・カオス三体実験
              </button>
            </div>
          </div>

          <div
            className="relative touch-none overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#060914] shadow-[0_0_70px_rgba(34,211,238,0.08)]"
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
              aria-label="重力オービットの軌道シミュレーション画面"
              className="block aspect-[4/5] w-full touch-none"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 via-black/30 to-transparent p-2.5 sm:p-3">
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-[0.18em] text-cyan-300/80">OBSERVATION</p>
                <p className="mt-0.5 truncate text-sm font-black text-white">{preset.name}</p>
                <p className="mt-0.5 truncate text-[9px] font-bold text-slate-400">{preset.tagline}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-black leading-tight text-cyan-200">
                  {metrics.active}/{MAX_PROBES}
                </p>
                <p className="text-[9px] font-bold text-slate-400">PROBES</p>
                <p className="mt-1 font-mono text-[10px] font-bold text-emerald-300">
                  背後ゾーン通過: {metrics.sensorHits}回
                </p>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/75 to-transparent px-2 pb-2.5 pt-6">
              <div className="rounded-full border border-cyan-300/25 bg-black/60 px-3 py-1.5 text-center text-[10px] font-bold text-cyan-100 backdrop-blur sm:text-xs">
                {metrics.predictedHitsSensor
                  ? '予測軌道が星の背後センサーに命中中！タップまたは発射ボタンで投入'
                  : '画面タップ/ドラッグで発射 / 恒星・惑星をドラッグして重力場を直接変形'}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 sm:text-xs">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: metrics.color }} />
              <span>選択探査機</span>
              <span className="font-mono text-slate-200">
                {metrics.active > 0 ? `#${gameRef.current?.selectedId ?? '—'}` : '—'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 sm:text-xs">
              <span>
                速度 <span className="font-mono text-cyan-200">{Math.round(metrics.speed)}</span> u/s
              </span>
              <span>
                最大偏向角 <span className="font-mono text-emerald-300">{metrics.lastDeflectionDeg}°</span>
              </span>
              <span>
                周期 <span className="font-mono text-amber-200">{periodLabel}</span>
              </span>
            </div>
          </div>
        </div>

        <aside className="mx-auto flex w-full max-w-[560px] flex-col gap-2.5 sm:gap-3 lg:mx-0 lg:max-w-none">
          <div className="rounded-xl border border-emerald-400/20 bg-[#071518]/85 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.16em] text-emerald-300">
                SWING-BY SENSOR (星の背後到達テスト)
              </span>
              <button
                type="button"
                onClick={toggleSensor}
                aria-pressed={settings.sensorEnabled}
                className={`rounded border px-2 py-0.5 text-[9px] font-bold transition ${
                  settings.sensorEnabled
                    ? 'border-emerald-300 bg-emerald-400/20 text-emerald-200'
                    : 'border-white/10 bg-white/[0.04] text-slate-400'
                }`}
              >
                {settings.sensorEnabled ? 'センサー ON' : 'センサー OFF'}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="rounded-lg bg-black/30 px-2 py-1.5">
                <p className="text-[9px] text-slate-400">背後ゾーン通過</p>
                <p className="font-mono text-sm font-black text-emerald-300">{metrics.sensorHits} 機</p>
              </div>
              <div className="rounded-lg bg-black/30 px-2 py-1.5">
                <p className="text-[9px] text-slate-400">最接近距離</p>
                <p className="font-mono text-sm font-black text-cyan-200">{bestApproachLabel}</p>
              </div>
              <div className="rounded-lg bg-black/30 px-2 py-1.5">
                <p className="text-[9px] text-slate-400">予測軌道判定</p>
                <p
                  className={`font-mono text-xs font-black ${
                    metrics.predictedHitsSensor ? 'text-emerald-300' : 'text-amber-200'
                  }`}
                >
                  {metrics.predictedHitsSensor
                    ? '命中コース'
                    : `あと${Math.max(0, Math.round(metrics.predictedMinDist - SENSOR_RADIUS))}px`}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-slate-400">
              重力スイングバイで恒星の背後（上方の緑リング）へ回り込む軌道を検証できます。「星の背後へスイングバイ命中」ボタンで理論命中軌道を即座に再現します。
            </p>
          </div>

          <div className="rounded-xl border border-cyan-400/15 bg-[#080d1b]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-cyan-300">SIMULATION</span>
              <span className="font-mono text-[10px] font-bold text-slate-400">{settings.speed}x</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={toggleRunning}
                aria-pressed={!settings.running}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-1 py-2 text-[10px] font-bold text-slate-100 transition hover:border-cyan-300/60 hover:text-cyan-200"
              >
                {settings.running ? '一時停止' : '再生'}
              </button>
              <button
                type="button"
                onClick={stepOnce}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-1 py-2 text-[10px] font-bold text-slate-100 transition hover:border-cyan-300/60 hover:text-cyan-200"
              >
                1ステップ
              </button>
              <button
                type="button"
                onClick={resetSim}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-1 py-2 text-[10px] font-bold text-slate-100 transition hover:border-cyan-300/60 hover:text-cyan-200"
              >
                リセット
              </button>
            </div>
            <p className="mt-2.5 text-[9px] font-bold tracking-wider text-slate-400">再生速度</p>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => applySettings({ speed })}
                  aria-pressed={settings.speed === speed}
                  className={`rounded-lg border px-1 py-1.5 font-mono text-[10px] font-bold transition ${
                    settings.speed === speed
                      ? 'border-cyan-300 bg-cyan-400/15 text-cyan-200'
                      : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.2em] text-amber-300">LAUNCH</span>
              <span className="font-mono text-[10px] font-bold text-slate-400">
                {settings.launchSpeed} u/s / {angleValue}°
              </span>
            </div>
            <label className="mt-2 block">
              <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                <span>発射速度</span>
                <span className="font-mono text-amber-200">{settings.launchSpeed} u/s</span>
              </span>
              <input
                type="range"
                min={MIN_LAUNCH_SPEED}
                max={MAX_LAUNCH_SPEED}
                step={2}
                value={settings.launchSpeed}
                onChange={(event) => applySettings({ launchSpeed: Number(event.target.value) })}
                aria-label="発射速度"
                className="mt-1 h-6 w-full accent-amber-300"
              />
            </label>
            <label className="mt-1 block">
              <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                <span>発射角度</span>
                <span className="font-mono text-amber-200">{angleValue}°</span>
              </span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={angleValue}
                onChange={(event) => applySettings({ launchAngle: Number(event.target.value) })}
                aria-label="発射角度"
                className="mt-1 h-6 w-full accent-amber-300"
              />
            </label>
            <button
              type="button"
              onClick={launchProbe}
              className="mt-2 w-full rounded-lg border border-amber-300/40 bg-amber-400/15 py-2 text-[11px] font-black text-amber-200 transition hover:border-amber-300 hover:bg-amber-400/25"
            >
              現在の角度・速度で探査機を発射
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.2em] text-cyan-300">
                GRAVITY &amp; PRESETS
              </span>
              <button
                type="button"
                onClick={toggleStar}
                aria-pressed={settings.starEnabled}
                className={`rounded border px-2 py-1 text-[9px] font-bold transition ${
                  settings.starEnabled
                    ? 'border-cyan-300 bg-cyan-400/15 text-cyan-200'
                    : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-slate-500'
                }`}
              >
                恒星 {settings.starEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {PRESET_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectPreset(key)}
                  aria-pressed={settings.preset === key}
                  className={`rounded-lg border px-1.5 py-1.5 text-[10px] font-bold transition ${
                    settings.preset === key
                      ? 'border-amber-300 bg-amber-400/10 text-amber-200'
                      : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {PRESETS[key].name}
                </button>
              ))}
            </div>
            <label className="mt-2 block">
              <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                <span>惑星質量倍率</span>
                <span className="font-mono text-cyan-200">{settings.planetMass.toFixed(1)}x</span>
              </span>
              <input
                type="range"
                min={0.2}
                max={2.5}
                step={0.1}
                value={settings.planetMass}
                onChange={(event) => applySettings({ planetMass: Number(event.target.value) })}
                aria-label="惑星質量"
                className="mt-1 h-6 w-full accent-cyan-300"
              />
            </label>
            <label className="mt-1 block">
              <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                <span>重力定数 G</span>
                <span className="font-mono text-cyan-200">{settings.gravity.toFixed(2)}x</span>
              </span>
              <input
                type="range"
                min={0.2}
                max={2}
                step={0.05}
                value={settings.gravity}
                onChange={(event) => applySettings({ gravity: Number(event.target.value) })}
                aria-label="重力定数"
                className="mt-1 h-6 w-full accent-cyan-300"
              />
            </label>
            <label className="mt-1 block">
              <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                <span>トレイル長</span>
                <span className="font-mono text-cyan-200">{settings.trailLength} PT</span>
              </span>
              <input
                type="range"
                min={MIN_TRAIL}
                max={900}
                step={20}
                value={settings.trailLength}
                onChange={(event) => applySettings({ trailLength: Number(event.target.value) })}
                aria-label="トレイル長"
                className="mt-1 h-6 w-full accent-cyan-300"
              />
            </label>
          </div>

          <div className="rounded-xl border border-cyan-400/15 bg-[#080d1b]/80 p-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black tracking-[0.16em] text-cyan-300">
                KEPLER TELEMETRY (速度・天体距離波形)
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: metrics.color }} />
                {metrics.target}
              </span>
            </div>
            <KeplerTelemetryGraph samples={metrics.telemetry} />
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
                <p className="text-slate-400">探査機速度</p>
                <p className="font-mono text-base font-black text-cyan-200">
                  {Math.round(metrics.speed)}
                  <span className="ml-1 text-[9px] font-bold">u/s</span>
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
                <p className="text-slate-400">最寄り天体距離</p>
                <p className="font-mono text-base font-black text-slate-100">
                  {Math.round(metrics.distance)}
                  <span className="ml-1 text-[9px] font-bold">u</span>
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
                <p className="text-slate-400">推定公転周期</p>
                <p className="font-mono text-base font-black text-amber-200">{periodLabel}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5">
                <p className="text-slate-400">スイングバイ最大偏向角</p>
                <p className="font-mono text-base font-black text-emerald-300">
                  {metrics.lastDeflectionDeg}°
                </p>
              </div>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-slate-500">
              ケプラーの第2法則（面積速度一定）により、天体に近づく（近点）ほど速度が急上昇し、離れる（遠点）ほど減速する様子がグラフで確認できます。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
