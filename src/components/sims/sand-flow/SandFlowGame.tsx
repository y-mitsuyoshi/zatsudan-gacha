'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const GRID_W = 96;
const GRID_H = 128;
const CELL = 5;
const WORLD_W = GRID_W * CELL;
const WORLD_H = GRID_H * CELL;
const SIM_STEP = 1 / 60;
const EMPTY = 0;
const WALL = 1;
const MIX_BASE = 6;
const MAX_SAND = 9000;
const MAX_FLOW_PARTICLES = 12;
const MIX_CHANCE = 0.06;
const WIND_CHANCE = 0.18;

const MATERIALS = [2, 3, 4, 5] as const;
const COLOR_NAMES = ['朱砂', '金砂', '翠砂', '紫砂'] as const;
const COLOR_TAGS = ['CORAL', 'GOLD', 'TEAL', 'VIOLET'] as const;
const MATERIAL_COLORS = [
  '#000000',
  '#414b5a',
  '#ff7a6b',
  '#f5c451',
  '#4fd1b5',
  '#b18cff',
  '#ff9d5c',
  '#e3e07a',
  '#ff8fc8',
  '#9be36d',
  '#d9b36b',
  '#7cc8ff',
] as const;

const SPEEDS = [0.5, 1, 2] as const;
const WIND_DIRECTIONS = [
  { value: -1, label: '左' },
  { value: 0, label: '停止' },
  { value: 1, label: '右' },
] as const;

const INITIAL_BLOCKS = [
  { x: 18, y: 30, w: 24, h: 2 },
  { x: 54, y: 46, w: 24, h: 2 },
  { x: 30, y: 63, w: 36, h: 2 },
  { x: 8, y: 82, w: 20, h: 2 },
  { x: 68, y: 82, w: 20, h: 2 },
] as const;

const INITIAL_WALL_MASK = (() => {
  const mask = new Uint8Array(GRID_W * GRID_H);
  const fill = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy += 1) {
      if (yy < 0 || yy >= GRID_H) continue;
      for (let xx = x; xx < x + w; xx += 1) {
        if (xx < 0 || xx >= GRID_W) continue;
        mask[yy * GRID_W + xx] = WALL;
      }
    }
  };
  fill(0, 0, 2, GRID_H);
  fill(GRID_W - 2, 0, 2, GRID_H);
  fill(0, GRID_H - 1, GRID_W, 1);
  for (const block of INITIAL_BLOCKS) fill(block.x, block.y, block.w, block.h);
  return mask;
})();

function hexToPixel(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

const PIXEL_PALETTE = (() => {
  const palette = new Uint32Array(MATERIAL_COLORS.length);
  for (let index = 1; index < palette.length; index += 1) {
    palette[index] = hexToPixel(MATERIAL_COLORS[index]);
  }
  return palette;
})();

type Tool = 'sand' | 'wall' | 'erase';
type Speed = (typeof SPEEDS)[number];
type WindDirection = (typeof WIND_DIRECTIONS)[number]['value'];

type Controls = {
  tool: Tool;
  colorIndex: number;
  brushSize: number;
  flow: number;
  gravity: number;
  windDir: WindDirection;
  windStrength: number;
  speed: Speed;
  running: boolean;
};

type PourState = {
  active: boolean;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
};

type Sim = {
  cells: Uint8Array;
  moved: Uint8Array;
  updated: Uint8Array;
  count: number;
  movedCount: number;
  stepCount: number;
  pour: PourState;
  brush: { x: number; y: number } | null;
};

type Stats = {
  particles: number;
  settled: number;
  mixed: number;
  fps: number;
  steps: number;
  counts: number[];
};

const INITIAL_CONTROLS: Controls = {
  tool: 'sand',
  colorIndex: 0,
  brushSize: 3,
  flow: 35,
  gravity: 100,
  windDir: 0,
  windStrength: 0,
  speed: 1,
  running: true,
};

function createSim(): Sim {
  const cells = new Uint8Array(GRID_W * GRID_H);
  cells.set(INITIAL_WALL_MASK);
  return {
    cells,
    moved: new Uint8Array(GRID_W * GRID_H),
    updated: new Uint8Array(GRID_W * GRID_H),
    count: 0,
    movedCount: 0,
    stepCount: 0,
    pour: { active: false, x: GRID_W / 2, y: 12, lastX: GRID_W / 2, lastY: 12 },
    brush: null,
  };
}

function mixedMaterial(a: number, b: number): number {
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  if (low === 2 && high === 3) return 6;
  if (low === 2 && high === 4) return 7;
  if (low === 2 && high === 5) return 8;
  if (low === 3 && high === 4) return 9;
  if (low === 3 && high === 5) return 10;
  if (low === 4 && high === 5) return 11;
  return 0;
}

function spawnSand(sim: Sim, gx: number, gy: number, material: number, radius: number) {
  if (sim.count >= MAX_SAND) return;
  const centerX = Math.max(0, Math.min(GRID_W - 1, Math.round(gx)));
  const centerY = Math.max(0, Math.min(GRID_H - 1, Math.round(gy)));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * radius;
    const x = Math.round(centerX + Math.cos(angle) * distance);
    const y = Math.round(centerY + Math.sin(angle) * distance);
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) continue;
    const index = y * GRID_W + x;
    if (sim.cells[index] !== EMPTY) continue;
    sim.cells[index] = material;
    sim.moved[index] = 0;
    sim.updated[index] = 0;
    sim.count += 1;
    return;
  }
}

function spawnStroke(
  sim: Sim,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  amount: number,
  material: number,
  radius: number,
) {
  if (amount <= 0) return;
  for (let index = 0; index < amount; index += 1) {
    const t = Math.random();
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;
    spawnSand(sim, x, y, material, radius);
  }
}

function spawnPour(sim: Sim, material: number, radius: number, amount: number) {
  const pour = sim.pour;
  if (!pour.active) return;
  spawnStroke(sim, pour.lastX, pour.lastY, pour.x, pour.y, amount, material, radius);
  pour.lastX = pour.x;
  pour.lastY = pour.y;
}

function moveCell(sim: Sim, from: number, to: number) {
  sim.cells[to] = sim.cells[from];
  sim.cells[from] = EMPTY;
  sim.moved[to] = 1;
  sim.moved[from] = 0;
  sim.updated[to] = 1;
  sim.movedCount += 1;
}

function processCell(
  sim: Sim,
  x: number,
  y: number,
  gravity: number,
  windDir: WindDirection,
  windStrength: number,
) {
  const index = y * GRID_W + x;
  if (sim.updated[index]) return;
  const material = sim.cells[index];
  if (material < 2) return;
  const below = index + GRID_W;

  if (sim.cells[below] === EMPTY && Math.random() < gravity) {
    moveCell(sim, index, below);
    return;
  }

  if (gravity > 0) {
    const startRight = windDir === 0 ? Math.random() < 0.5 : windDir > 0;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const direction = attempt === 0 ? (startRight ? 1 : -1) : startRight ? -1 : 1;
      const nx = x + direction;
      if (nx < 0 || nx >= GRID_W) continue;
      const side = y * GRID_W + nx;
      const target = below + direction;
      if (sim.cells[side] === EMPTY && sim.cells[target] === EMPTY && Math.random() < gravity) {
        moveCell(sim, index, target);
        return;
      }
    }
  }

  if (windDir !== 0 && windStrength > 0 && Math.random() < windStrength * WIND_CHANCE) {
    const nx = x + windDir;
    if (nx >= 0 && nx < GRID_W) {
      const target = y * GRID_W + nx;
      if (sim.cells[target] === EMPTY) moveCell(sim, index, target);
    }
  }
}

function findMixNeighbor(sim: Sim, x: number, y: number, material: number): number {
  const index = y * GRID_W + x;
  const neighbors = [
    y > 0 ? sim.cells[index - GRID_W] : 0,
    y < GRID_H - 1 ? sim.cells[index + GRID_W] : 0,
    x > 0 ? sim.cells[index - 1] : 0,
    x < GRID_W - 1 ? sim.cells[index + 1] : 0,
  ];
  for (const value of neighbors) {
    if (value >= 2 && value < MIX_BASE && value !== material) return value;
  }
  return 0;
}

function mixSettled(sim: Sim) {
  for (let y = GRID_H - 1; y >= 0; y -= 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      const index = y * GRID_W + x;
      const material = sim.cells[index];
      if (material < 2 || material >= MIX_BASE) continue;
      if (sim.moved[index]) continue;
      if (y < GRID_H - 1 && sim.cells[index + GRID_W] === EMPTY) continue;
      if (Math.random() >= MIX_CHANCE) continue;
      const neighbor = findMixNeighbor(sim, x, y, material);
      if (neighbor === 0) continue;
      const mix = mixedMaterial(material, neighbor);
      if (mix > 0) sim.cells[index] = mix;
    }
  }
}

function stepSim(sim: Sim, controls: Controls) {
  sim.stepCount += 1;
  const flowParticles = Math.round((controls.flow / 100) * MAX_FLOW_PARTICLES);
  if (sim.pour.active) {
    spawnPour(sim, MATERIALS[controls.colorIndex], controls.brushSize, flowParticles);
  }
  sim.updated.fill(0);
  sim.moved.fill(0);
  sim.movedCount = 0;

  const gravity = controls.gravity / 100;
  const windStrength = controls.windStrength / 100;
  const leftToRight = (sim.stepCount & 1) === 0;
  for (let y = GRID_H - 2; y >= 0; y -= 1) {
    if (leftToRight) {
      for (let x = 0; x < GRID_W; x += 1) {
        processCell(sim, x, y, gravity, controls.windDir, windStrength);
      }
    } else {
      for (let x = GRID_W - 1; x >= 0; x -= 1) {
        processCell(sim, x, y, gravity, controls.windDir, windStrength);
      }
    }
  }

  mixSettled(sim);
}

function stampWall(sim: Sim, gx: number, gy: number, radius: number, erase: boolean) {
  const centerX = Math.round(gx);
  const centerY = Math.round(gy);
  const limit = radius * radius + radius;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const y = centerY + dy;
    if (y < 0 || y >= GRID_H) continue;
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy > limit) continue;
      const x = centerX + dx;
      if (x < 0 || x >= GRID_W) continue;
      const index = y * GRID_W + x;
      if (erase) {
        if (sim.cells[index] === WALL) sim.cells[index] = EMPTY;
      } else if (sim.cells[index] !== WALL) {
        if (sim.cells[index] >= 2) sim.count = Math.max(0, sim.count - 1);
        sim.cells[index] = WALL;
        sim.moved[index] = 0;
        sim.updated[index] = 1;
      }
    }
  }
}

function paintWallLine(
  sim: Sim,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
  erase: boolean,
) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius)));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    stampWall(sim, fromX + dx * t, fromY + dy * t, radius, erase);
  }
}

function drawBackground(target: HTMLCanvasElement, width: number, height: number) {
  target.width = width;
  target.height = height;
  const context = target.getContext('2d');
  if (!context) return;
  const sx = width / WORLD_W;
  const sy = height / WORLD_H;
  context.setTransform(sx, 0, 0, sy, 0, 0);

  const gradient = context.createLinearGradient(0, 0, 0, WORLD_H);
  gradient.addColorStop(0, '#0d1622');
  gradient.addColorStop(0.55, '#091019');
  gradient.addColorStop(1, '#05080d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, WORLD_W, WORLD_H);

  const glow = context.createRadialGradient(
    WORLD_W / 2,
    WORLD_H * 0.18,
    8,
    WORLD_W / 2,
    WORLD_H * 0.55,
    WORLD_H * 0.8,
  );
  glow.addColorStop(0, 'rgba(79, 209, 181, 0.12)');
  glow.addColorStop(1, 'rgba(5, 8, 13, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, WORLD_W, WORLD_H);

  context.strokeStyle = 'rgba(148, 163, 184, 0.055)';
  context.lineWidth = 1;
  context.beginPath();
  for (let x = CELL * 8; x < WORLD_W; x += CELL * 8) {
    context.moveTo(x, 0);
    context.lineTo(x, WORLD_H);
  }
  for (let y = CELL * 8; y < WORLD_H; y += CELL * 8) {
    context.moveTo(0, y);
    context.lineTo(WORLD_W, y);
  }
  context.stroke();
}

export function SandFlowGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundRef = useRef<HTMLCanvasElement | null>(null);
  const sandCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sandContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const pixelViewRef = useRef<Uint32Array | null>(null);
  const simRef = useRef<Sim | null>(null);
  if (simRef.current === null) simRef.current = createSim();
  const controlsRef = useRef<Controls>(INITIAL_CONTROLS);
  const pointerDownRef = useRef(false);
  const paintFromRef = useRef<{ x: number; y: number } | null>(null);
  const fpsRef = useRef(60);

  const [controls, setControls] = useState<Controls>(INITIAL_CONTROLS);
  const [stats, setStats] = useState<Stats>({
    particles: 0,
    settled: 0,
    mixed: 0,
    fps: 60,
    steps: 0,
    counts: [0, 0, 0, 0],
  });

  const applyControls = useCallback((patch: Partial<Controls>) => {
    const next = { ...controlsRef.current, ...patch };
    controlsRef.current = next;
    setControls(next);
  }, []);

  const publishStats = useCallback((fps: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const counts = [0, 0, 0, 0];
    let mixed = 0;
    for (let index = 0; index < sim.cells.length; index += 1) {
      const value = sim.cells[index];
      if (value >= 2 && value < MIX_BASE) counts[value - 2] += 1;
      else if (value >= MIX_BASE) mixed += 1;
    }
    setStats({
      particles: sim.count,
      settled: Math.max(0, sim.count - sim.movedCount),
      mixed,
      fps: Math.max(0, Math.round(fps)),
      steps: sim.stepCount,
      counts,
    });
  }, []);

  const resetSim = useCallback(() => {
    simRef.current = createSim();
    pointerDownRef.current = false;
    paintFromRef.current = null;
    setStats({
      particles: 0,
      settled: 0,
      mixed: 0,
      fps: Math.max(0, Math.round(fpsRef.current)),
      steps: 0,
      counts: [0, 0, 0, 0],
    });
  }, []);

  const toggleRunning = useCallback(() => {
    applyControls({ running: !controlsRef.current.running });
  }, [applyControls]);

  const stepOnce = useCallback(() => {
    applyControls({ running: false });
    const sim = simRef.current;
    if (!sim) return;
    stepSim(sim, controlsRef.current);
    publishStats(fpsRef.current);
  }, [applyControls, publishStats]);

  const selectTool = useCallback(
    (tool: Tool) => {
      const sim = simRef.current;
      if (sim) {
        sim.pour.active = false;
        sim.brush = null;
      }
      pointerDownRef.current = false;
      paintFromRef.current = null;
      applyControls({ tool });
    },
    [applyControls],
  );

  const selectColor = useCallback(
    (colorIndex: number) => {
      applyControls({ colorIndex, tool: 'sand' });
    },
    [applyControls],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const sim = simRef.current;

    context.setTransform(1, 0, 0, 1, 0, 0);
    const background = backgroundRef.current;
    if (background && background.width === canvas.width && background.height === canvas.height) {
      context.drawImage(background, 0, 0);
    } else {
      context.fillStyle = '#05080d';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    const sandCanvas = sandCanvasRef.current;
    const sandContext = sandContextRef.current;
    const imageData = imageDataRef.current;
    const pixels = pixelViewRef.current;
    if (sandCanvas && sandContext && imageData && pixels && sim) {
      pixels.fill(0);
      for (let index = 0; index < sim.cells.length; index += 1) {
        const value = sim.cells[index];
        if (value > 0) pixels[index] = PIXEL_PALETTE[value];
      }
      sandContext.putImageData(imageData, 0, 0);
      context.imageSmoothingEnabled = false;
      context.drawImage(sandCanvas, 0, 0, GRID_W, GRID_H, 0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
    }

    if (sim && sim.brush) {
      const sx = canvas.width / WORLD_W;
      const sy = canvas.height / WORLD_H;
      context.setTransform(sx, 0, 0, sy, 0, 0);
      const current = controlsRef.current;
      const color =
        current.tool === 'sand'
          ? MATERIAL_COLORS[MATERIALS[current.colorIndex]]
          : current.tool === 'wall'
            ? '#cbd5e1'
            : '#fb7185';
      context.beginPath();
      context.arc(
        sim.brush.x * CELL,
        sim.brush.y * CELL,
        (current.brushSize + 0.5) * CELL,
        0,
        Math.PI * 2,
      );
      context.globalAlpha = 0.18;
      context.fillStyle = color;
      context.fill();
      context.globalAlpha = 0.95;
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      if (current.tool === 'erase') context.setLineDash([3, 3]);
      context.stroke();
      context.setLineDash([]);
      context.globalAlpha = 1;
    }
  }, []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = GRID_W;
    canvas.height = GRID_H;
    const context = canvas.getContext('2d');
    if (!context) return;
    sandCanvasRef.current = canvas;
    sandContextRef.current = context;
    const imageData = context.createImageData(GRID_W, GRID_H);
    imageDataRef.current = imageData;
    pixelViewRef.current = new Uint32Array(imageData.data.buffer);
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
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      const background = backgroundRef.current ?? document.createElement('canvas');
      backgroundRef.current = background;
      drawBackground(background, width, height);
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
    let accumulator = 0;
    let hudClock = 0;
    const frame = (now: number) => {
      const rawDelta = (now - last) / 1000;
      last = now;
      const dt = Math.min(0.05, Math.max(0, rawDelta));
      if (rawDelta > 0 && rawDelta < 1) {
        const instant = 1 / rawDelta;
        fpsRef.current += (instant - fpsRef.current) * 0.1;
      }
      const sim = simRef.current;
      if (sim) {
        const current = controlsRef.current;
        if (current.running) {
          accumulator += dt * current.speed;
          let steps = 0;
          const maxSteps = Math.max(4, Math.ceil(10 * current.speed));
          while (accumulator >= SIM_STEP && steps < maxSteps) {
            stepSim(sim, current);
            accumulator -= SIM_STEP;
            steps += 1;
          }
          if (accumulator > SIM_STEP * 4) accumulator = 0;
        } else {
          accumulator = 0;
        }
      }
      draw();
      hudClock += dt;
      if (hudClock >= 0.25) {
        hudClock = 0;
        publishStats(fpsRef.current);
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [draw, publishStats]);

  const getGridPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((clientX - rect.left) / rect.width) * GRID_W;
    const y = ((clientY - rect.top) / rect.height) * GRID_H;
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return null;
    return { x, y };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const sim = simRef.current;
    if (!sim) return;
    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerDownRef.current = true;
    paintFromRef.current = point;
    sim.brush = { x: point.x, y: point.y };
    const current = controlsRef.current;
    if (current.tool === 'sand') {
      sim.pour.active = true;
      sim.pour.x = point.x;
      sim.pour.y = point.y;
      sim.pour.lastX = point.x;
      sim.pour.lastY = point.y;
      const amount = Math.round((current.flow / 100) * MAX_FLOW_PARTICLES);
      spawnStroke(
        sim,
        point.x,
        point.y,
        point.x,
        point.y,
        amount,
        MATERIALS[current.colorIndex],
        current.brushSize,
      );
    } else {
      stampWall(sim, point.x, point.y, current.brushSize, current.tool === 'erase');
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    const sim = simRef.current;
    if (!sim) return;
    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;
    sim.brush = { x: point.x, y: point.y };
    if (!pointerDownRef.current) return;
    event.preventDefault();
    const current = controlsRef.current;
    const from = paintFromRef.current ?? point;
    if (current.tool === 'sand') {
      sim.pour.active = true;
      sim.pour.x = point.x;
      sim.pour.y = point.y;
      if (!current.running) {
        const amount = Math.round((current.flow / 100) * MAX_FLOW_PARTICLES);
        spawnStroke(
          sim,
          from.x,
          from.y,
          point.x,
          point.y,
          amount,
          MATERIALS[current.colorIndex],
          current.brushSize,
        );
      }
    } else {
      paintWallLine(
        sim,
        from.x,
        from.y,
        point.x,
        point.y,
        current.brushSize,
        current.tool === 'erase',
      );
    }
    paintFromRef.current = { x: point.x, y: point.y };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    pointerDownRef.current = false;
    paintFromRef.current = null;
    const sim = simRef.current;
    if (!sim) return;
    sim.pour.active = false;
    sim.brush = null;
  };

  const handlePointerCancel = () => {
    pointerDownRef.current = false;
    paintFromRef.current = null;
    const sim = simRef.current;
    if (!sim) return;
    sim.pour.active = false;
    sim.brush = null;
  };

  const flowParticles = Math.round((controls.flow / 100) * MAX_FLOW_PARTICLES);
  const capRatio = Math.min(1, stats.particles / MAX_SAND);
  const distributionTotal = stats.counts.reduce((sum, value) => sum + value, 0) + stats.mixed;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080b10] text-slate-100 select-none">
      <header className="border-b border-slate-800 bg-[#080b10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games#simulation-games"
              className="shrink-0 whitespace-nowrap rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300 sm:px-3 sm:text-xs"
            >
              一覧へ
            </Link>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] font-bold tracking-[0.18em] text-emerald-300 sm:text-[10px]">
                SAND FLOW / GRAIN LAB
              </p>
              <h2 className="truncate text-xs font-black sm:text-base">サンド・フロー・サンドボックス</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={resetSim}
            className="shrink-0 rounded-lg border border-emerald-400/50 bg-emerald-950/40 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100 sm:px-3 sm:text-xs"
          >
            リセット
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-2.5 py-2.5 sm:px-4 sm:py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
          <div className="mx-auto w-full max-w-[440px] min-w-0">
            <div
              className="relative overflow-hidden rounded-xl border-2 border-slate-800 bg-[#05080d] shadow-2xl"
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
                width={WORLD_W}
                height={WORLD_H}
                className="block h-auto w-full touch-none"
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent px-2.5 pb-6 pt-2 sm:px-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      controls.running ? 'animate-pulse bg-emerald-300' : 'bg-amber-300'
                    }`}
                  />
                  <span className="font-mono text-[9px] font-bold tracking-[0.16em] text-slate-200">
                    {controls.running ? 'RUNNING' : 'PAUSED'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] font-black leading-none text-white sm:text-xs">
                    {stats.particles.toLocaleString()} / {MAX_SAND.toLocaleString()}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-slate-400 sm:text-[9px]">
                    PARTICLES / LIMIT
                  </p>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-2.5 pb-2 pt-6 sm:px-3">
                <p className="text-[9px] leading-4 text-slate-400 sm:text-[10px]">
                  ドラッグで操作 / ツールは下のパネル
                </p>
                <p className="shrink-0 font-mono text-[9px] text-slate-400 sm:text-[10px]">
                  {stats.steps.toLocaleString()} STEP / {controls.speed}x
                </p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-emerald-300">SIMULATION</p>
                <p className="font-mono text-[9px] text-slate-500">{controls.running ? 'LIVE' : 'PAUSED'}</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={toggleRunning}
                  aria-pressed={!controls.running}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-1 py-2 text-[10px] font-bold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  {controls.running ? '一時停止' : '再生'}
                </button>
                <button
                  type="button"
                  onClick={stepOnce}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-1 py-2 text-[10px] font-bold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  1ステップ
                </button>
                <button
                  type="button"
                  onClick={resetSim}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-1 py-2 text-[10px] font-bold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  リセット
                </button>
              </div>
              <p className="mt-3 text-[9px] font-bold tracking-wider text-slate-400">速度</p>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                {SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => applyControls({ speed })}
                    aria-pressed={controls.speed === speed}
                    className={`rounded-lg border px-1 py-1.5 font-mono text-[10px] font-bold transition ${
                      controls.speed === speed
                        ? 'border-emerald-300 bg-emerald-400/15 text-emerald-200'
                        : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-sky-300">TOOL / COLOR</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => selectTool('sand')}
                  aria-pressed={controls.tool === 'sand'}
                  className={`rounded-lg border px-1 py-2 text-[10px] font-bold leading-4 transition ${
                    controls.tool === 'sand'
                      ? 'border-emerald-300 bg-emerald-400/15 text-emerald-200'
                      : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  砂を注ぐ
                </button>
                <button
                  type="button"
                  onClick={() => selectTool('wall')}
                  aria-pressed={controls.tool === 'wall'}
                  className={`rounded-lg border px-1 py-2 text-[10px] font-bold leading-4 transition ${
                    controls.tool === 'wall'
                      ? 'border-slate-200 bg-slate-200/15 text-white'
                      : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  障害物を追加
                </button>
                <button
                  type="button"
                  onClick={() => selectTool('erase')}
                  aria-pressed={controls.tool === 'erase'}
                  className={`rounded-lg border px-1 py-2 text-[10px] font-bold leading-4 transition ${
                    controls.tool === 'erase'
                      ? 'border-rose-300 bg-rose-400/15 text-rose-200'
                      : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  障害物を削除
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {MATERIALS.map((material, index) => (
                  <button
                    key={material}
                    type="button"
                    onClick={() => selectColor(index)}
                    aria-pressed={controls.colorIndex === index && controls.tool === 'sand'}
                    aria-label={`${COLOR_NAMES[index]}を選ぶ`}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition ${
                      controls.colorIndex === index && controls.tool === 'sand'
                        ? 'border-white/70 bg-white/10'
                        : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: MATERIAL_COLORS[material] }}
                    />
                    <span className="text-[9px] font-bold text-slate-100">{COLOR_NAMES[index]}</span>
                    <span className="font-mono text-[7px] text-slate-400">{COLOR_TAGS[index]}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[9px] leading-4 text-slate-500">
                砂ツールでドラッグすると選択色の砂を注ぎます。障害物ブラシは壁の追加と削除に使えます。
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-amber-300">PHYSICS</p>
              <label className="mt-2 block">
                <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                  <span>重力</span>
                  <span className="font-mono text-amber-200">{controls.gravity}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={controls.gravity}
                  onChange={(event) => applyControls({ gravity: Number(event.target.value) })}
                  aria-label="重力"
                  className="mt-1 h-6 w-full accent-amber-300"
                />
              </label>
              <label className="mt-2 block">
                <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                  <span>ブラシサイズ</span>
                  <span className="font-mono text-amber-200">{controls.brushSize}セル</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={controls.brushSize}
                  onChange={(event) => applyControls({ brushSize: Number(event.target.value) })}
                  aria-label="ブラシサイズ"
                  className="mt-1 h-6 w-full accent-amber-300"
                />
              </label>
              <label className="mt-2 block">
                <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                  <span>流量</span>
                  <span className="font-mono text-amber-200">
                    {controls.flow}% / {flowParticles}粒
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={controls.flow}
                  onChange={(event) => applyControls({ flow: Number(event.target.value) })}
                  aria-label="流量"
                  className="mt-1 h-6 w-full accent-amber-300"
                />
              </label>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-300">風向き</span>
                <div className="grid grid-cols-3 gap-1">
                  {WIND_DIRECTIONS.map((direction) => (
                    <button
                      key={direction.value}
                      type="button"
                      onClick={() => applyControls({ windDir: direction.value })}
                      aria-pressed={controls.windDir === direction.value}
                      className={`rounded border px-2 py-1 text-[9px] font-bold transition ${
                        controls.windDir === direction.value
                          ? 'border-sky-300 bg-sky-400/15 text-sky-200'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {direction.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="mt-2 block">
                <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300">
                  <span>風の強さ</span>
                  <span className="font-mono text-sky-200">{controls.windStrength}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={controls.windStrength}
                  onChange={(event) => applyControls({ windStrength: Number(event.target.value) })}
                  aria-label="風の強さ"
                  className="mt-1 h-6 w-full accent-sky-300"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-emerald-300">LIVE STATS</p>
                <p className="font-mono text-[9px] text-slate-500">{stats.fps} FPS</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5">
                  <p className="text-slate-400">粒子数</p>
                  <p className="font-mono text-sm font-black text-white">{stats.particles.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5">
                  <p className="text-slate-400">静止</p>
                  <p className="font-mono text-sm font-black text-emerald-200">{stats.settled.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5">
                  <p className="text-slate-400">混色</p>
                  <p className="font-mono text-sm font-black text-sky-200">{stats.mixed.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-1.5">
                  <p className="text-slate-400">ステップ</p>
                  <p className="font-mono text-sm font-black text-amber-200">{stats.steps.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span>粒子上限</span>
                  <span className="font-mono">
                    {stats.particles.toLocaleString()} / {MAX_SAND.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-[width] duration-200 ${
                      capRatio >= 0.9 ? 'bg-amber-300' : 'bg-emerald-300'
                    }`}
                    style={{ width: `${capRatio * 100}%` }}
                  />
                </div>
              </div>
              <p className="mt-3 text-[9px] font-bold tracking-wider text-slate-400">色の分布</p>
              <div className="mt-1 space-y-1.5">
                {MATERIALS.map((material, index) => {
                  const count = stats.counts[index] ?? 0;
                  const ratio = distributionTotal > 0 ? count / distributionTotal : 0;
                  return (
                    <div key={material}>
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: MATERIAL_COLORS[material] }}
                          />
                          {COLOR_NAMES[index]}
                        </span>
                        <span className="font-mono text-slate-400">
                          {count} ({Math.round(ratio * 100)}%)
                        </span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${ratio * 100}%`, backgroundColor: MATERIAL_COLORS[material] }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t border-slate-800 pt-1 text-[10px] text-slate-400">
                  <span>混色</span>
                  <span className="font-mono">{stats.mixed}</span>
                </div>
              </div>
              {stats.particles >= MAX_SAND && (
                <p className="mt-2 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[9px] leading-4 text-amber-200">
                  粒子数の上限に達しました。リセットすると再び砂を注げます。
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-slate-400">CONTROLS</p>
              <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-slate-400">
                <li>砂ツールで画面をドラッグすると、選択色の砂を注ぎます。</li>
                <li>障害物ブラシで壁を追加・削除し、砂の流れを変えられます。</li>
                <li>一時停止中も配置でき、1ステップで1フレームずつ観察できます。</li>
                <li>粒子数が上限に達すると生成が止まります。リセットで空にできます。</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
