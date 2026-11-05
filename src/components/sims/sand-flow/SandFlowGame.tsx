'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const GRID_W = 96;
const GRID_H = 128;
const CELL = 5;
const WORLD_W = GRID_W * CELL;
const WORLD_H = GRID_H * CELL;
const SIM_STEP = 1 / 60;
const ROUND_TIME = 70;
const BRUSH_RADIUS = 2;
const POUR_LIMIT = 94;
const CLEAR_RATIO = 0.55;
const MAX_COMBO = 20;
const EMPTY = 0;
const WALL = 1;
const MIX_BASE = 6;

const MATERIALS = [2, 3, 4, 5] as const;
const COLOR_NAMES = ['朱砂', '金砂', '翠砂', '紫砂'] as const;
const COLOR_TAGS = ['CORAL', 'GOLD', 'TEAL', 'VIOLET'] as const;
const MATERIAL_COLORS = [
  '#000000',
  '#000000',
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

const ZONE_LAYOUT = [
  { x: 3, y: 102, w: 20, h: 25 },
  { x: 26, y: 102, w: 20, h: 25 },
  { x: 49, y: 102, w: 20, h: 25 },
  { x: 72, y: 102, w: 20, h: 25 },
] as const;

const PEGS = [
  { x: 10, y: 24, w: 5, h: 3 },
  { x: 33, y: 24, w: 5, h: 3 },
  { x: 58, y: 24, w: 5, h: 3 },
  { x: 81, y: 24, w: 5, h: 3 },
  { x: 0, y: 42, w: 5, h: 3 },
  { x: 23, y: 42, w: 5, h: 3 },
  { x: 57, y: 42, w: 5, h: 3 },
  { x: 89, y: 42, w: 5, h: 3 },
  { x: 12, y: 60, w: 5, h: 3 },
  { x: 40, y: 60, w: 5, h: 3 },
  { x: 69, y: 60, w: 5, h: 3 },
  { x: 27, y: 78, w: 5, h: 3 },
  { x: 62, y: 78, w: 5, h: 3 },
] as const;

const WALL_MASK = (() => {
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
  fill(0, GRID_H - 1, GRID_W, 1);
  fill(0, 102, 3, GRID_H - 102);
  fill(92, 102, 4, GRID_H - 102);
  fill(23, 103, 3, GRID_H - 103);
  fill(46, 103, 3, GRID_H - 103);
  fill(69, 103, 3, GRID_H - 103);
  for (const peg of PEGS) fill(peg.x, peg.y, peg.w, peg.h);
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
  const palette = new Uint32Array(12);
  for (let index = 2; index < palette.length; index += 1) {
    palette[index] = hexToPixel(MATERIAL_COLORS[index]);
  }
  return palette;
})();

type Phase = 'title' | 'playing' | 'result';

type Zone = {
  x: number;
  y: number;
  w: number;
  h: number;
  material: number;
  label: string;
  color: string;
  coverage: number;
  cleared: boolean;
};

type Popup = {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
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
  scored: Uint8Array;
  updated: Uint8Array;
  zones: Zone[];
  time: number;
  score: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  mixed: number;
  placed: number;
  popups: Popup[];
  pour: PourState;
  brush: { x: number; y: number } | null;
  tick: number;
};

type HudState = {
  time: number;
  score: number;
  combo: number;
  cleared: number;
  mixed: number;
  zoneProgress: number[];
  zoneCleared: boolean[];
};

type ResultState = {
  score: number;
  cleared: number;
  mixed: number;
  maxCombo: number;
  placed: number;
  rank: string;
  message: string;
};

function createSim(): Sim {
  const cells = new Uint8Array(GRID_W * GRID_H);
  cells.set(WALL_MASK);
  return {
    cells,
    moved: new Uint8Array(GRID_W * GRID_H),
    scored: new Uint8Array(GRID_W * GRID_H),
    updated: new Uint8Array(GRID_W * GRID_H),
    zones: ZONE_LAYOUT.map((zone, index) => ({
      x: zone.x,
      y: zone.y,
      w: zone.w,
      h: zone.h,
      material: MATERIALS[index],
      label: COLOR_NAMES[index],
      color: MATERIAL_COLORS[MATERIALS[index]],
      coverage: 0,
      cleared: false,
    })),
    time: ROUND_TIME,
    score: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    mixed: 0,
    placed: 0,
    popups: [],
    pour: { active: false, x: GRID_W / 2, y: 20, lastX: GRID_W / 2, lastY: 20 },
    brush: null,
    tick: 0,
  };
}

function addPopup(sim: Sim, x: number, y: number, text: string, color: string) {
  sim.popups.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
  if (sim.popups.length > 18) sim.popups.shift();
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

function spawnSand(sim: Sim, gx: number, gy: number, material: number) {
  const centerX = Math.max(0, Math.min(GRID_W - 1, Math.round(gx)));
  const centerY = Math.min(POUR_LIMIT, Math.max(1, Math.round(gy)));
  const x = centerX + Math.floor(Math.random() * (BRUSH_RADIUS * 2 + 1)) - BRUSH_RADIUS;
  const y = centerY + Math.floor(Math.random() * 3) - 1;
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;
  const index = y * GRID_W + x;
  if (sim.cells[index] !== EMPTY) return;
  sim.cells[index] = material;
  sim.moved[index] = 0;
  sim.scored[index] = 0;
  sim.placed += 1;
}

function pourLine(sim: Sim, material: number) {
  const pour = sim.pour;
  if (!pour.active) return;
  const dx = pour.x - pour.lastX;
  const dy = pour.y - pour.lastY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.min(3, Math.ceil(distance / 3)));
  for (let step = 1; step <= steps; step += 1) {
    spawnSand(sim, pour.lastX + (dx * step) / steps, pour.lastY + (dy * step) / steps, material);
  }
  pour.lastX = pour.x;
  pour.lastY = pour.y;
}

function moveCell(sim: Sim, from: number, to: number) {
  sim.cells[to] = sim.cells[from];
  sim.cells[from] = EMPTY;
  sim.moved[to] = 1;
  sim.moved[from] = 0;
  sim.scored[to] = 0;
  sim.scored[from] = 0;
  sim.updated[to] = 1;
}

function processCell(sim: Sim, x: number, y: number) {
  const index = y * GRID_W + x;
  if (sim.updated[index]) return;
  const material = sim.cells[index];
  if (material < 2) return;
  const below = index + GRID_W;
  if (sim.cells[below] === EMPTY) {
    moveCell(sim, index, below);
    return;
  }
  const startRight = Math.random() < 0.5;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const direction = attempt === 0 ? (startRight ? 1 : -1) : (startRight ? -1 : 1);
    const nx = x + direction;
    if (nx < 0 || nx >= GRID_W) continue;
    const side = y * GRID_W + nx;
    const target = below + direction;
    if (sim.cells[side] === EMPTY && sim.cells[target] === EMPTY) {
      moveCell(sim, index, target);
      return;
    }
  }
}

function findMixNeighbor(sim: Sim, x: number, y: number, material: number): number {
  if (material >= MIX_BASE) return 0;
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

function updateZones(sim: Sim) {
  for (const zone of sim.zones) {
    let filled = 0;
    for (let y = zone.y; y < zone.y + zone.h; y += 1) {
      for (let x = zone.x; x < zone.x + zone.w; x += 1) {
        const value = sim.cells[y * GRID_W + x];
        if (value === zone.material || value >= MIX_BASE) filled += 1;
      }
    }
    zone.coverage = filled / (zone.w * zone.h);
    if (!zone.cleared && zone.coverage >= CLEAR_RATIO) {
      zone.cleared = true;
      const bonus = 700 + Math.round(sim.time) * 4;
      sim.score += bonus;
      sim.combo = Math.min(MAX_COMBO, sim.combo + 2);
      sim.comboTimer = 2.5;
      sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
      addPopup(sim, zone.x + zone.w / 2, zone.y - 2, `ZONE +${bonus}`, zone.color);
    }
  }
}

function stepSim(sim: Sim, material: number): boolean {
  sim.tick += 1;
  sim.time = Math.max(0, sim.time - SIM_STEP);
  sim.comboTimer = Math.max(0, sim.comboTimer - SIM_STEP);
  if (sim.comboTimer <= 0 && sim.combo > 0) sim.combo = 0;

  pourLine(sim, material);
  sim.updated.fill(0);
  sim.moved.fill(0);

  const leftToRight = (sim.tick & 1) === 0;
  for (let y = GRID_H - 2; y >= 0; y -= 1) {
    if (leftToRight) {
      for (let x = 0; x < GRID_W; x += 1) processCell(sim, x, y);
    } else {
      for (let x = GRID_W - 1; x >= 0; x -= 1) processCell(sim, x, y);
    }
  }

  let settleCount = 0;
  for (let index = 0; index < sim.cells.length; index += 1) {
    const materialValue = sim.cells[index];
    if (materialValue < 2 || sim.moved[index] !== 0 || sim.scored[index] !== 0) continue;
    sim.scored[index] = 1;
    settleCount += 1;
    const x = index % GRID_W;
    const y = (index / GRID_W) | 0;
    const neighbor = findMixNeighbor(sim, x, y, materialValue);
    if (neighbor > 0 && Math.random() < 0.08) {
      const mix = mixedMaterial(materialValue, neighbor);
      if (mix > 0) {
        sim.cells[index] = mix;
        sim.mixed += 1;
        const bonus = 20 * Math.max(1, sim.combo + 1);
        sim.score += bonus;
        sim.combo = Math.min(MAX_COMBO, sim.combo + 1);
        sim.comboTimer = 2.2;
        sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
        addPopup(sim, x, y - 2, `MIX +${bonus}`, MATERIAL_COLORS[mix]);
      }
    }
  }

  if (settleCount > 0) {
    sim.combo = Math.min(MAX_COMBO, sim.combo + 1);
    sim.comboTimer = 2.2;
    sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
    sim.score += settleCount * 3 * Math.max(1, sim.combo);
  }

  updateZones(sim);

  for (let index = sim.popups.length - 1; index >= 0; index -= 1) {
    const popup = sim.popups[index];
    popup.life -= SIM_STEP;
    popup.y -= SIM_STEP * 7;
    if (popup.life <= 0) sim.popups.splice(index, 1);
  }

  return sim.time <= 0;
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
  gradient.addColorStop(0, '#0c1320');
  gradient.addColorStop(1, '#06090e');
  context.fillStyle = gradient;
  context.fillRect(0, 0, WORLD_W, WORLD_H);

  for (let index = 0; index < ZONE_LAYOUT.length; index += 1) {
    const zone = ZONE_LAYOUT[index];
    const color = MATERIAL_COLORS[MATERIALS[index]];
    const px = zone.x * CELL;
    const py = zone.y * CELL;
    const pw = zone.w * CELL;
    const ph = zone.h * CELL;
    context.save();
    context.globalAlpha = 0.12;
    context.fillStyle = color;
    context.fillRect(px, py, pw, ph);
    context.globalAlpha = 0.38;
    context.strokeStyle = color;
    context.lineWidth = 1.2;
    context.strokeRect(px + 0.6, py + 0.6, pw - 1.2, ph - 1.2);
    context.restore();
  }

  context.setLineDash([5, 5]);
  context.strokeStyle = 'rgba(148, 163, 184, 0.24)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, POUR_LIMIT * CELL);
  context.lineTo(WORLD_W, POUR_LIMIT * CELL);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = 'rgba(148, 163, 184, 0.45)';
  context.font = '700 9px ui-sans-serif, system-ui, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'bottom';
  context.fillText('POUR LIMIT', WORLD_W - 4, POUR_LIMIT * CELL - 3);

  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      if (!WALL_MASK[y * GRID_W + x]) continue;
      context.fillStyle = '#39424f';
      context.fillRect(x * CELL, y * CELL, CELL, CELL);
      if (y === 0 || !WALL_MASK[(y - 1) * GRID_W + x]) {
        context.fillStyle = '#5b6878';
        context.fillRect(x * CELL, y * CELL, CELL, 2);
      }
    }
  }
}

export function SandFlowGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundRef = useRef<HTMLCanvasElement | null>(null);
  const sandCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sandContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const pixelViewRef = useRef<Uint32Array | null>(null);
  const simRef = useRef<Sim | null>(null);
  const phaseRef = useRef<Phase>('title');
  const colorRef = useRef(0);
  const pointerDownRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('title');
  const [color, setColor] = useState(0);
  const [hud, setHud] = useState<HudState>({
    time: ROUND_TIME,
    score: 0,
    combo: 0,
    cleared: 0,
    mixed: 0,
    zoneProgress: [0, 0, 0, 0],
    zoneCleared: [false, false, false, false],
  });
  const [result, setResult] = useState<ResultState | null>(null);

  const publishHud = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    let cleared = 0;
    for (const zone of sim.zones) {
      if (zone.cleared) cleared += 1;
    }
    setHud({
      time: sim.time,
      score: sim.score,
      combo: sim.combo,
      cleared,
      mixed: sim.mixed,
      zoneProgress: sim.zones.map((zone) => zone.coverage),
      zoneCleared: sim.zones.map((zone) => zone.cleared),
    });
  }, []);

  const startRound = useCallback(() => {
    pointerDownRef.current = false;
    simRef.current = createSim();
    phaseRef.current = 'playing';
    setPhase('playing');
    setResult(null);
    setHud({
      time: ROUND_TIME,
      score: 0,
      combo: 0,
      cleared: 0,
      mixed: 0,
      zoneProgress: [0, 0, 0, 0],
      zoneCleared: [false, false, false, false],
    });
  }, []);

  const endRound = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    phaseRef.current = 'result';
    pointerDownRef.current = false;
    sim.pour.active = false;
    sim.brush = null;
    setPhase('result');
    const cleared = sim.zones.filter((zone) => zone.cleared).length;
    const rank = cleared >= 4 ? 'S' : cleared >= 3 ? 'A' : cleared >= 2 ? 'B' : 'C';
    const message =
      rank === 'S'
        ? '全ゾーン制圧。砂の流れを完全に支配しました。'
        : rank === 'A'
          ? 'ほぼ全ゾーンを攻略。見事な砂使いです。'
          : rank === 'B'
            ? '半分のゾーンをクリア。色の切り替えが鍵になります。'
            : 'まずは1つのゾーンへ砂を集中させてみましょう。';
    setResult({
      score: sim.score,
      cleared,
      mixed: sim.mixed,
      maxCombo: sim.maxCombo,
      placed: sim.placed,
      rank,
      message,
    });
    setHud({
      time: 0,
      score: sim.score,
      combo: sim.combo,
      cleared,
      mixed: sim.mixed,
      zoneProgress: sim.zones.map((zone) => zone.coverage),
      zoneCleared: sim.zones.map((zone) => zone.cleared),
    });
  }, []);

  const selectColor = useCallback((index: number) => {
    colorRef.current = index;
    setColor(index);
  }, []);

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
      context.fillStyle = '#06090e';
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
        if (value >= 2) pixels[index] = PIXEL_PALETTE[value];
      }
      sandContext.putImageData(imageData, 0, 0);
      context.imageSmoothingEnabled = false;
      context.drawImage(sandCanvas, 0, 0, GRID_W, GRID_H, 0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
    }

    const sx = canvas.width / WORLD_W;
    const sy = canvas.height / WORLD_H;
    context.setTransform(sx, 0, 0, sy, 0, 0);

    if (sim) {
      for (const zone of sim.zones) {
        const px = zone.x * CELL;
        const py = zone.y * CELL;
        const pw = zone.w * CELL;
        const ph = zone.h * CELL;
        const ratio = Math.min(1, zone.coverage);
        context.fillStyle = 'rgba(0, 0, 0, 0.38)';
        context.fillRect(px + 2, py + ph - 8, pw - 4, 5);
        context.fillStyle = zone.color;
        context.fillRect(px + 2, py + ph - 8, (pw - 4) * ratio, 5);

        const label = zone.cleared
          ? `${zone.label} CLEAR`
          : `${zone.label} ${Math.round(zone.coverage * 100)}%`;
        context.font = '700 11px ui-sans-serif, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        const width = context.measureText(label).width;
        context.fillStyle = 'rgba(6, 9, 14, 0.72)';
        context.fillRect(px + pw / 2 - width / 2 - 2, py + 2, width + 4, 13);
        context.fillStyle = zone.cleared ? '#f4f7fb' : zone.color;
        context.fillText(label, px + pw / 2, py + 3);
      }

      context.textAlign = 'center';
      context.textBaseline = 'middle';
      for (const popup of sim.popups) {
        const alpha = Math.max(0, popup.life / popup.maxLife);
        context.globalAlpha = alpha;
        context.font = '900 12px ui-sans-serif, system-ui, sans-serif';
        context.lineWidth = 2;
        context.strokeStyle = 'rgba(0, 0, 0, 0.55)';
        context.strokeText(popup.text, popup.x * CELL, popup.y * CELL);
        context.fillStyle = popup.color;
        context.fillText(popup.text, popup.x * CELL, popup.y * CELL);
        context.globalAlpha = 1;
      }

      if (phaseRef.current === 'playing' && sim.brush) {
        const material = MATERIALS[colorRef.current];
        context.beginPath();
        context.arc(
          sim.brush.x * CELL,
          Math.min(POUR_LIMIT, sim.brush.y) * CELL,
          BRUSH_RADIUS * CELL + 4,
          0,
          Math.PI * 2,
        );
        context.strokeStyle = MATERIAL_COLORS[material];
        context.globalAlpha = 0.7;
        context.lineWidth = 1.5;
        context.stroke();
        context.globalAlpha = 1;
      }
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
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const sim = simRef.current;
      if (sim && phaseRef.current === 'playing') {
        accumulator += dt;
        let steps = 0;
        while (accumulator >= SIM_STEP && steps < 4) {
          const ended = stepSim(sim, MATERIALS[colorRef.current]);
          accumulator -= SIM_STEP;
          steps += 1;
          if (ended) {
            endRound();
            break;
          }
        }
        if (accumulator > SIM_STEP) accumulator = 0;
      } else {
        accumulator = 0;
      }
      draw();
      hudClock += dt;
      if (sim && phaseRef.current === 'playing' && hudClock >= 0.1) {
        hudClock = 0;
        publishHud();
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [draw, endRound, publishHud]);

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
    if (!sim || phaseRef.current !== 'playing') return;
    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerDownRef.current = true;
    const material = MATERIALS[colorRef.current];
    sim.pour.active = true;
    sim.pour.x = point.x;
    sim.pour.y = point.y;
    sim.pour.lastX = point.x;
    sim.pour.lastY = point.y;
    sim.brush = { x: point.x, y: point.y };
    for (let count = 0; count < 4; count += 1) {
      spawnSand(sim, point.x, point.y, material);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    const sim = simRef.current;
    if (!sim) return;
    const point = getGridPoint(event.clientX, event.clientY);
    if (!point) return;
    sim.brush = { x: point.x, y: point.y };
    if (!pointerDownRef.current || phaseRef.current !== 'playing') return;
    event.preventDefault();
    sim.pour.active = true;
    sim.pour.x = point.x;
    sim.pour.y = point.y;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    pointerDownRef.current = false;
    const sim = simRef.current;
    if (!sim) return;
    sim.pour.active = false;
    sim.brush = null;
  };

  const handlePointerCancel = () => {
    pointerDownRef.current = false;
    const sim = simRef.current;
    if (!sim) return;
    sim.pour.active = false;
    sim.brush = null;
  };

  const timerRatio = Math.max(0, Math.min(1, hud.time / ROUND_TIME));

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080b10] text-slate-100 select-none">
      <header className="border-b border-slate-800 bg-[#080b10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="shrink-0 whitespace-nowrap rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300 sm:px-3 sm:text-xs"
            >
              ← 無料ゲーム一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] font-bold tracking-[0.18em] text-emerald-300 sm:text-[10px]">
                SAND FLOW / GRAIN LAB
              </p>
              <h2 className="truncate text-xs font-black sm:text-base">サンド・フロー・シミュレーター</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={startRound}
            className="shrink-0 rounded-lg border border-emerald-400/50 bg-emerald-950/40 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100 sm:px-3 sm:text-xs"
          >
            リスタート
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-2.5 py-2.5 sm:px-4 sm:py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-4">
          <div className="mx-auto w-full max-w-[430px] min-w-0">
            <div
              className="relative overflow-hidden rounded-xl border-2 border-slate-800 bg-[#06090e] shadow-2xl"
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

              {phase !== 'title' && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
                  <div className="flex items-start justify-between gap-2 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-2.5 pb-5 pt-2 sm:px-3">
                    <div>
                      <p className="text-[8px] font-bold tracking-wider text-slate-400 sm:text-[9px]">SCORE</p>
                      <p className="font-mono text-sm font-black leading-none text-white sm:text-lg">
                        {hud.score.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-bold tracking-wider text-slate-400 sm:text-[9px]">COMBO</p>
                      <p
                        className={`font-mono text-xs font-black leading-none sm:text-base ${
                          hud.combo >= 2 ? 'text-amber-300' : 'text-slate-300'
                        }`}
                      >
                        x{Math.max(1, hud.combo)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold tracking-wider text-slate-400 sm:text-[9px]">TIME</p>
                      <p
                        className={`font-mono text-sm font-black leading-none sm:text-lg ${
                          hud.time <= 10 ? 'text-rose-300' : 'text-emerald-200'
                        }`}
                      >
                        {Math.ceil(hud.time)}s
                      </p>
                    </div>
                  </div>
                  <div className="mx-2 mt-1 h-1 overflow-hidden rounded-full bg-black/40 sm:mx-3">
                    <div
                      className={`h-full rounded-full transition-[width] duration-100 ${
                        hud.time <= 10 ? 'bg-rose-400' : 'bg-emerald-300'
                      }`}
                      style={{ width: `${timerRatio * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {phase === 'title' && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-[#05080d]/85 px-3 py-3 text-center backdrop-blur-[2px] sm:px-6"
                  style={{ touchAction: 'pan-y' }}
                >
                  <p className="font-mono text-[9px] font-bold tracking-[0.22em] text-emerald-300/90 sm:text-[11px]">
                    FALLING SAND PLAYGROUND
                  </p>
                  <h3 className="mt-1 text-xl font-black leading-tight text-white sm:mt-2 sm:text-3xl">
                    サンド・フロー・シミュレーター
                  </h3>
                  <p className="mt-1 max-w-md text-[10px] leading-4 text-slate-300 sm:mt-2 sm:text-sm sm:leading-6">
                    色砂を注いで4つのターゲットゾーンを埋めよう。障害物を避け、混色とコンボで高スコアを目指す70秒の砂遊び。
                  </p>
                  <div className="mt-3 flex w-full max-w-xs items-center justify-center gap-1.5 sm:mt-4">
                    {MATERIALS.map((material, index) => (
                      <div
                        key={material}
                        className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 px-1 py-1.5"
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/20 sm:h-4 sm:w-4"
                          style={{ backgroundColor: MATERIAL_COLORS[material] }}
                        />
                        <span className="text-[9px] font-bold text-slate-200 sm:text-[10px]">{COLOR_NAMES[index]}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={startRound}
                    className="mt-3 w-full max-w-xs rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-400 to-teal-600 px-4 py-2.5 text-sm font-black text-slate-950 shadow-xl transition hover:scale-[1.02] active:scale-[0.98] sm:mt-5 sm:py-3"
                  >
                    スタート
                  </button>
                  <p className="mt-2 text-[9px] text-slate-500 sm:text-[11px]">
                    70秒 / 4色 / 4ゾーン。ドラッグまたはタップで砂を注げます。
                  </p>
                </div>
              )}

              {phase === 'result' && result && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-[#05080d]/90 px-3 py-3 text-center backdrop-blur-sm sm:px-6"
                  style={{ touchAction: 'pan-y' }}
                >
                  <p className="font-mono text-[9px] font-bold tracking-[0.22em] text-emerald-300/90 sm:text-[11px]">
                    FLOW REPORT
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 sm:mt-2 sm:gap-3">
                    <span className="font-mono text-3xl font-black leading-none text-amber-300 sm:text-5xl">
                      {result.rank}
                    </span>
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-slate-400 sm:text-[11px]">SCORE</p>
                      <p className="font-mono text-lg font-black leading-none text-white sm:text-3xl">
                        {result.score.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-emerald-200 sm:mt-2 sm:text-sm">{result.message}</p>
                  <div className="mt-2 grid w-full max-w-xs grid-cols-4 gap-1 sm:mt-4 sm:max-w-lg sm:gap-2">
                    <div className="rounded border border-slate-700 bg-slate-900/80 px-1 py-1.5 sm:px-2">
                      <p className="text-[8px] font-bold text-slate-400 sm:text-[10px]">ゾーン</p>
                      <p className="font-mono text-[11px] font-black text-emerald-200 sm:text-base">
                        {result.cleared}/4
                      </p>
                    </div>
                    <div className="rounded border border-slate-700 bg-slate-900/80 px-1 py-1.5 sm:px-2">
                      <p className="text-[8px] font-bold text-slate-400 sm:text-[10px]">ミックス</p>
                      <p className="font-mono text-[11px] font-black text-sky-200 sm:text-base">{result.mixed}</p>
                    </div>
                    <div className="rounded border border-slate-700 bg-slate-900/80 px-1 py-1.5 sm:px-2">
                      <p className="text-[8px] font-bold text-slate-400 sm:text-[10px]">MAX COMBO</p>
                      <p className="font-mono text-[11px] font-black text-amber-200 sm:text-base">
                        {result.maxCombo}
                      </p>
                    </div>
                    <div className="rounded border border-slate-700 bg-slate-900/80 px-1 py-1.5 sm:px-2">
                      <p className="text-[8px] font-bold text-slate-400 sm:text-[10px]">砂粒</p>
                      <p className="font-mono text-[11px] font-black text-white sm:text-base">{result.placed}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex w-full max-w-xs flex-row gap-1.5 sm:mt-4 sm:max-w-sm sm:gap-2">
                    <button
                      type="button"
                      onClick={startRound}
                      className="flex-1 rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-400 to-teal-600 px-2 py-2 text-[11px] font-black text-slate-950 shadow-lg transition hover:scale-[1.02] active:scale-[0.98] sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      もう一度
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 sm:mt-3">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {MATERIALS.map((material, index) => (
                  <button
                    key={material}
                    type="button"
                    onClick={() => selectColor(index)}
                    aria-pressed={color === index}
                    aria-label={`${COLOR_NAMES[index]}を選ぶ`}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition ${
                      color === index
                        ? 'border-white/70 bg-white/10'
                        : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-white/20"
                      style={{ backgroundColor: MATERIAL_COLORS[material] }}
                    />
                    <span className="text-[10px] font-bold text-slate-100">{COLOR_NAMES[index]}</span>
                    <span className="font-mono text-[8px] text-slate-400">{COLOR_TAGS[index]}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-[10px] text-slate-300 sm:text-xs">
                <span>
                  ゾーン <b className="font-mono text-emerald-200">{hud.cleared}/4</b>
                </span>
                <span>
                  ミックス <b className="font-mono text-sky-200">{hud.mixed}</b>
                </span>
                <span className="text-right text-slate-400">ドラッグ / タップで注ぐ</span>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-emerald-300">HOW TO PLAY</p>
              <ol className="mt-2 space-y-2 text-[11px] leading-5 text-slate-300 sm:text-xs">
                <li>
                  <span className="font-bold text-white">1.</span> 4色から砂を選び、画面上部をドラッグまたはタップして注ぐ。
                </li>
                <li>
                  <span className="font-bold text-white">2.</span> 対応する色で4つのゾーンを埋める。混色はどのゾーンにも有効。
                </li>
                <li>
                  <span className="font-bold text-white">3.</span> 70秒でスコアを稼ぎ、全ゾーンクリアでSランク。
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-amber-300">TARGET ZONES</p>
              <div className="mt-2 space-y-1.5 text-[10px] sm:text-xs">
                {ZONE_LAYOUT.map((zone, index) => (
                  <div key={zone.x} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: MATERIAL_COLORS[MATERIALS[index]] }}
                      />
                      {COLOR_NAMES[index]}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        hud.zoneCleared[index] ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      {hud.zoneCleared[index]
                        ? 'CLEAR'
                        : `${Math.round((hud.zoneProgress[index] ?? 0) * 100)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <p className="font-mono text-[9px] font-bold tracking-[0.2em] text-sky-300">SCORING</p>
              <div className="mt-2 space-y-1.5 text-[10px] text-slate-300 sm:text-xs">
                <div className="flex justify-between">
                  <span>安定堆積</span>
                  <span className="font-mono text-white">+3〜</span>
                </div>
                <div className="flex justify-between">
                  <span>混色ボーナス</span>
                  <span className="font-mono text-sky-200">+20〜</span>
                </div>
                <div className="flex justify-between">
                  <span>ゾーンクリア</span>
                  <span className="font-mono text-amber-200">+700〜</span>
                </div>
              </div>
              <p className="mt-2 text-[9px] leading-4 text-slate-500 sm:text-[11px]">
                砂を積もらせ続けるとコンボが上昇。混色と早いゾーンクリアでスコアが伸びます。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
