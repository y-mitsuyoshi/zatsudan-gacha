'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// ============================================================================
// Types & Constants
// ============================================================================

export type GlassColor = 'ruby' | 'sapphire' | 'emerald' | 'amber' | 'amethyst';
export type AiPersona = 'chain' | 'cut' | 'bonus';
export type GameMode = 'cpu' | 'pvp';

export interface GlassMeta {
  id: GlassColor;
  name: string;
  shortName: string;
  enName: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
}

export const GLASS_COLORS: GlassMeta[] = [
  {
    id: 'ruby',
    name: '紅ルビー (Ruby)',
    shortName: '紅ルビー',
    enName: 'Ruby',
    bgClass: 'bg-rose-950/85',
    borderClass: 'border-rose-400/70',
    textClass: 'text-rose-200',
    badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-400/60',
    primaryHex: '#e11d48',
    secondaryHex: '#881337',
    accentHex: '#fda4af',
  },
  {
    id: 'sapphire',
    name: '蒼サファイア (Sapphire)',
    shortName: '蒼サファイア',
    enName: 'Sapphire',
    bgClass: 'bg-sky-950/85',
    borderClass: 'border-sky-400/70',
    textClass: 'text-sky-200',
    badgeClass: 'bg-sky-500/25 text-sky-200 border-sky-400/60',
    primaryHex: '#0284c7',
    secondaryHex: '#0c4a6e',
    accentHex: '#7dd3fc',
  },
  {
    id: 'emerald',
    name: '翠エメラルド (Emerald)',
    shortName: '翠エメラルド',
    enName: 'Emerald',
    bgClass: 'bg-emerald-950/85',
    borderClass: 'border-emerald-400/70',
    textClass: 'text-emerald-200',
    badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60',
    primaryHex: '#059669',
    secondaryHex: '#064e3b',
    accentHex: '#6ee7b7',
  },
  {
    id: 'amber',
    name: '琥珀アンバー (Amber)',
    shortName: '琥珀アンバー',
    enName: 'Amber',
    bgClass: 'bg-amber-950/85',
    borderClass: 'border-amber-400/70',
    textClass: 'text-amber-200',
    badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/60',
    primaryHex: '#d97706',
    secondaryHex: '#78350f',
    accentHex: '#fcd34d',
  },
  {
    id: 'amethyst',
    name: '紫アメジスト (Amethyst)',
    shortName: '紫アメジスト',
    enName: 'Amethyst',
    bgClass: 'bg-purple-950/85',
    borderClass: 'border-purple-400/70',
    textClass: 'text-purple-200',
    badgeClass: 'bg-purple-500/25 text-purple-200 border-purple-400/60',
    primaryHex: '#9333ea',
    secondaryHex: '#4c1d95',
    accentHex: '#d8b4fe',
  },
];

export const GLASS_MAP: Record<GlassColor, GlassMeta> = {
  ruby: GLASS_COLORS[0],
  sapphire: GLASS_COLORS[1],
  emerald: GLASS_COLORS[2],
  amber: GLASS_COLORS[3],
  amethyst: GLASS_COLORS[4],
};

export const ALL_COLOR_IDS: GlassColor[] = [
  'ruby',
  'sapphire',
  'emerald',
  'amber',
  'amethyst',
];

// 5x5 Latin Square for the Cathedral Stained Glass Window
export const WINDOW_PATTERN: GlassColor[][] = [
  ['sapphire', 'amber', 'ruby', 'amethyst', 'emerald'],
  ['emerald', 'sapphire', 'amber', 'ruby', 'amethyst'],
  ['amethyst', 'emerald', 'sapphire', 'amber', 'ruby'],
  ['ruby', 'amethyst', 'emerald', 'sapphire', 'amber'],
  ['amber', 'ruby', 'amethyst', 'emerald', 'sapphire'],
];

// 7-slot Broken Glass Floor penalties
export const BROKEN_PENALTIES: number[] = [-1, -1, -2, -2, -2, -3, -3];

export interface WorkbenchRow {
  capacity: number; // 1..5
  color: GlassColor | null;
  count: number;
}

export type BrokenItem = GlassColor | 'master';

export interface PlayerState {
  id: number;
  name: string;
  isAi: boolean;
  persona: AiPersona;
  workbenches: WorkbenchRow[];
  window: boolean[][]; // 5x5 glazed status
  brokenFloor: BrokenItem[]; // up to 7 items
  score: number;
  chainPointsTotal: number;
  brokenPenaltyTotal: number;
  rowBonusScore: number;
  colBonusScore: number;
  colorBonusScore: number;
  completedRowsCount: number;
  completedColsCount: number;
  completedColorsCount: number;
}

export interface DraftSelection {
  sourceType: 'kiln' | 'courtyard';
  kilnIndex?: number;
  color: GlassColor;
}

export interface RoundGlazeSummary {
  round: number;
  entries: {
    playerName: string;
    glazedDetails: string[];
    penalty: number;
    newScore: number;
  }[];
}

export interface GameSnapshot {
  round: number;
  turnPlayerIndex: number;
  startPlayerIndex: number;
  kilns: GlassColor[][];
  courtyard: GlassColor[];
  courtyardHasMaster: boolean;
  bag: GlassColor[];
  discardTower: GlassColor[];
  players: PlayerState[];
  logs: string[];
  lastGlazeSummary: RoundGlazeSummary | null;
}

export interface PlacementEvaluation {
  targetRow: number; // 0..4 for workbench, -1 for direct broken floor
  valid: boolean;
  invalidReason?: string;
  placedInWorkbench: number;
  willCompleteWorkbench: boolean;
  overflowToBroken: number;
  takesMasterMarker: boolean;
  projectedGlazePoints: number;
  projectedHChain: number;
  projectedVChain: number;
  projectedPenaltyDelta: number;
  netProjectedDelta: number;
}

export interface CandidateMove {
  selection: DraftSelection;
  targetRow: number; // 0..4 or -1
  evalResult: PlacementEvaluation;
  heuristicScore: number;
  reason: string;
}

// ============================================================================
// Web Audio API Sound & Cathedral Ambient BGM Engine
// ============================================================================

class CathedralAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playGlassClink(count = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseFreqs = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
    const hits = Math.min(4, Math.max(1, count));
    for (let i = 0; i < hits; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const freq = baseFreqs[(i + count) % baseFreqs.length];
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      osc.frequency.exponentialRampToValueAtTime(
        freq * 1.03,
        now + i * 0.055 + 0.16,
      );
      gain.gain.setValueAtTime(0.001, now + i * 0.055);
      gain.gain.linearRampToValueAtTime(0.11, now + i * 0.055 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.055 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.26);
    }
  }

  public playCrystalChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.05 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.58);
    });
  }

  public playShatterPenalty() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [390, 311, 233, 185];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.035);
      osc.frequency.exponentialRampToValueAtTime(
        freq * 0.65,
        now + idx * 0.035 + 0.18,
      );
      gain.gain.setValueAtTime(0.001, now + idx * 0.035);
      gain.gain.linearRampToValueAtTime(0.075, now + idx * 0.035 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.035 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.24);
    });
  }

  public playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0, d: 0.22 },
      { f: 659.25, t: 0.14, d: 0.22 },
      { f: 783.99, t: 0.28, d: 0.22 },
      { f: 1046.5, t: 0.44, d: 0.65 },
      { f: 1318.51, t: 0.58, d: 0.8 },
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.001, now + n.t);
      gain.gain.linearRampToValueAtTime(0.12, now + n.t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.04);
    });
  }

  public startBgm() {
    if (typeof window === 'undefined') return;
    this.stopBgm();
    const ctx = this.getContext();
    if (!ctx) return;

    // Gentle Cathedral Harp & Celesta arpeggio in D Dorian / F Major7
    const melody = [
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.0, // A5
      1046.5, // C6
      880.0, // A5
      783.99, // G5
      659.25, // E5
      523.25, // C5
      659.25, // E5
      783.99, // G5
      987.77, // B5
      880.0, // A5
      659.25, // E5
      587.33, // D5
      440.0, // A4
    ];

    const playTick = () => {
      const audio = this.getContext();
      if (!audio) return;
      const now = audio.currentTime;
      const note = melody[this.bgmStep % melody.length];
      this.bgmStep += 1;

      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(0.028, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0006, now + 1.35);

      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 1.4);
    };

    playTick();
    this.bgmTimer = window.setInterval(playTick, 720);
  }

  public stopBgm() {
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createInitialBag(): GlassColor[] {
  const bag: GlassColor[] = [];
  for (const color of ALL_COLOR_IDS) {
    for (let i = 0; i < 20; i++) {
      bag.push(color);
    }
  }
  return shuffleArray(bag);
}

function getKilnCount(playerCount: number): number {
  if (playerCount === 2) return 5;
  if (playerCount === 3) return 7;
  return 9;
}

function getPersonaLabel(persona: AiPersona): string {
  switch (persona) {
    case 'chain':
      return '連鎖重視AI';
    case 'cut':
      return '妨害カットAI';
    case 'bonus':
      return '完成ボーナス狙いAI';
  }
}

function createInitialPlayers(
  playerCount: number,
  mode: GameMode,
  leadPersona: AiPersona,
): PlayerState[] {
  const personas: AiPersona[] = [leadPersona, 'cut', 'bonus', 'chain'];
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    const isAi = mode === 'cpu' ? i > 0 : false;
    const persona = personas[(i - 1 + personas.length) % personas.length];
    const name =
      mode === 'pvp'
        ? `ガラス職人 P${i + 1}`
        : i === 0
          ? 'あなた（工房主）'
          : `職人AI-${i}（${getPersonaLabel(persona)}）`;

    players.push({
      id: i,
      name,
      isAi,
      persona,
      workbenches: [1, 2, 3, 4, 5].map((cap) => ({
        capacity: cap,
        color: null,
        count: 0,
      })),
      window: Array.from({ length: 5 }, () => Array(5).fill(false)),
      brokenFloor: [],
      score: 0,
      chainPointsTotal: 0,
      brokenPenaltyTotal: 0,
      rowBonusScore: 0,
      colBonusScore: 0,
      colorBonusScore: 0,
      completedRowsCount: 0,
      completedColsCount: 0,
      completedColorsCount: 0,
    });
  }
  return players;
}

function clonePlayers(players: PlayerState[]): PlayerState[] {
  return players.map((p) => ({
    ...p,
    workbenches: p.workbenches.map((wb) => ({ ...wb })),
    window: p.window.map((row) => [...row]),
    brokenFloor: [...p.brokenFloor],
  }));
}

function fillKilnsFromBag(
  kilnCount: number,
  currentBag: GlassColor[],
  currentDiscard: GlassColor[],
): {
  kilns: GlassColor[][];
  bag: GlassColor[];
  discardTower: GlassColor[];
} {
  let bag = [...currentBag];
  let discardTower = [...currentDiscard];
  const kilns: GlassColor[][] = [];

  for (let k = 0; k < kilnCount; k++) {
    const kiln: GlassColor[] = [];
    for (let t = 0; t < 4; t++) {
      if (bag.length === 0 && discardTower.length > 0) {
        bag = shuffleArray(discardTower);
        discardTower = [];
      }
      if (bag.length > 0) {
        const tile = bag.pop()!;
        kiln.push(tile);
      }
    }
    kilns.push(kiln);
  }

  return { kilns, bag, discardTower };
}

/**
 * Calculates the immediate points earned when placing a tile at (row, col) in `windowGrid`.
 */
export function calculateGlazeScore(
  windowGrid: boolean[][],
  row: number,
  col: number,
): { points: number; hChain: number; vChain: number } {
  let hChain = 1;
  // left
  for (let c = col - 1; c >= 0; c--) {
    if (windowGrid[row][c]) hChain++;
    else break;
  }
  // right
  for (let c = col + 1; c < 5; c++) {
    if (windowGrid[row][c]) hChain++;
    else break;
  }

  let vChain = 1;
  // up
  for (let r = row - 1; r >= 0; r--) {
    if (windowGrid[r][col]) vChain++;
    else break;
  }
  // down
  for (let r = row + 1; r < 5; r++) {
    if (windowGrid[r][col]) vChain++;
    else break;
  }

  let points = 0;
  if (hChain > 1) points += hChain;
  if (vChain > 1) points += vChain;
  if (hChain === 1 && vChain === 1) points = 1;

  return { points, hChain, vChain };
}

export function calculateBrokenFloorPenalty(count: number): number {
  const clamped = Math.min(BROKEN_PENALTIES.length, Math.max(0, count));
  let sum = 0;
  for (let i = 0; i < clamped; i++) {
    sum += BROKEN_PENALTIES[i]; // negative values
  }
  return sum; // e.g., -1, -2, -4...
}

/**
 * Simulates the window state up to `targetRow` during the Glazing phase so the Live Preview
 * accurately reflects earlier rows completing in the same round!
 */
export function evaluatePlacementOnPlayer(
  player: PlayerState,
  color: GlassColor,
  tileCount: number,
  takesMasterMarker: boolean,
  targetRow: number, // 0..4 for workbench, -1 for direct broken floor
): PlacementEvaluation {
  const currentBrokenLen = player.brokenFloor.length;
  const currentPenalty = calculateBrokenFloorPenalty(currentBrokenLen);

  if (targetRow === -1) {
    const addedBroken = tileCount + (takesMasterMarker ? 1 : 0);
    const newPenalty = calculateBrokenFloorPenalty(currentBrokenLen + addedBroken);
    const penaltyDelta = newPenalty - currentPenalty;
    return {
      targetRow: -1,
      valid: true,
      placedInWorkbench: 0,
      willCompleteWorkbench: false,
      overflowToBroken: tileCount,
      takesMasterMarker,
      projectedGlazePoints: 0,
      projectedHChain: 0,
      projectedVChain: 0,
      projectedPenaltyDelta: penaltyDelta,
      netProjectedDelta: penaltyDelta,
    };
  }

  const wb = player.workbenches[targetRow];
  const patternCol = WINDOW_PATTERN[targetRow].indexOf(color);

  if (player.window[targetRow][patternCol]) {
    return {
      targetRow,
      valid: false,
      invalidReason: 'この段の大聖堂ステンドグラス窓には既に同色が嵌め込まれています',
      placedInWorkbench: 0,
      willCompleteWorkbench: false,
      overflowToBroken: 0,
      takesMasterMarker,
      projectedGlazePoints: 0,
      projectedHChain: 0,
      projectedVChain: 0,
      projectedPenaltyDelta: 0,
      netProjectedDelta: 0,
    };
  }

  if (wb.color !== null && wb.color !== color) {
    return {
      targetRow,
      valid: false,
      invalidReason: `準備作業台${targetRow + 1}段目には既に${GLASS_MAP[wb.color].shortName}が置かれています`,
      placedInWorkbench: 0,
      willCompleteWorkbench: false,
      overflowToBroken: 0,
      takesMasterMarker,
      projectedGlazePoints: 0,
      projectedHChain: 0,
      projectedVChain: 0,
      projectedPenaltyDelta: 0,
      netProjectedDelta: 0,
    };
  }

  const remainingSpace = wb.capacity - wb.count;
  if (remainingSpace <= 0) {
    return {
      targetRow,
      valid: false,
      invalidReason: `準備作業台${targetRow + 1}段目は既に満杯です`,
      placedInWorkbench: 0,
      willCompleteWorkbench: false,
      overflowToBroken: 0,
      takesMasterMarker,
      projectedGlazePoints: 0,
      projectedHChain: 0,
      projectedVChain: 0,
      projectedPenaltyDelta: 0,
      netProjectedDelta: 0,
    };
  }

  const placedInWorkbench = Math.min(remainingSpace, tileCount);
  const overflowToBroken = tileCount - placedInWorkbench;
  const newCount = wb.count + placedInWorkbench;
  const willCompleteWorkbench = newCount === wb.capacity;

  // Simulate glazing from row 0 up to targetRow to preview exact chain points
  const simWindow = player.window.map((r) => [...r]);
  for (let r = 0; r < targetRow; r++) {
    const otherWb = player.workbenches[r];
    if (otherWb.color && otherWb.count === otherWb.capacity) {
      const cIdx = WINDOW_PATTERN[r].indexOf(otherWb.color);
      simWindow[r][cIdx] = true;
    }
  }

  let projectedGlazePoints = 0;
  let projectedHChain = 0;
  let projectedVChain = 0;

  if (willCompleteWorkbench) {
    const glaze = calculateGlazeScore(simWindow, targetRow, patternCol);
    projectedGlazePoints = glaze.points;
    projectedHChain = glaze.hChain;
    projectedVChain = glaze.vChain;
  }

  const totalBrokenAfter =
    currentBrokenLen + overflowToBroken + (takesMasterMarker ? 1 : 0);
  const newPenalty = calculateBrokenFloorPenalty(totalBrokenAfter);
  const projectedPenaltyDelta = newPenalty - currentPenalty;
  const netProjectedDelta = projectedGlazePoints + projectedPenaltyDelta;

  return {
    targetRow,
    valid: true,
    placedInWorkbench,
    willCompleteWorkbench,
    overflowToBroken,
    takesMasterMarker,
    projectedGlazePoints,
    projectedHChain,
    projectedVChain,
    projectedPenaltyDelta,
    netProjectedDelta,
  };
}

/**
 * Generates all legal moves for `player` and scores them according to the given `persona`.
 */
export function generateAllCandidateMoves(
  player: PlayerState,
  allPlayers: PlayerState[],
  kilns: GlassColor[][],
  courtyard: GlassColor[],
  courtyardHasMaster: boolean,
  persona: AiPersona,
): CandidateMove[] {
  const selections: { selection: DraftSelection; count: number }[] = [];

  kilns.forEach((kiln, kIdx) => {
    if (kiln.length === 0) return;
    const counts: Partial<Record<GlassColor, number>> = {};
    for (const c of kiln) {
      counts[c] = (counts[c] || 0) + 1;
    }
    (Object.keys(counts) as GlassColor[]).forEach((color) => {
      selections.push({
        selection: { sourceType: 'kiln', kilnIndex: kIdx, color },
        count: counts[color]!,
      });
    });
  });

  if (courtyard.length > 0) {
    const counts: Partial<Record<GlassColor, number>> = {};
    for (const c of courtyard) {
      counts[c] = (counts[c] || 0) + 1;
    }
    (Object.keys(counts) as GlassColor[]).forEach((color) => {
      selections.push({
        selection: { sourceType: 'courtyard', color },
        count: counts[color]!,
      });
    });
  }

  const candidates: CandidateMove[] = [];

  for (const { selection, count } of selections) {
    const takesMaster =
      selection.sourceType === 'courtyard' && courtyardHasMaster;

    for (const targetRow of [0, 1, 2, 3, 4, -1]) {
      const evalRes = evaluatePlacementOnPlayer(
        player,
        selection.color,
        count,
        takesMaster,
        targetRow,
      );
      if (!evalRes.valid) continue;

      let heuristic = evalRes.netProjectedDelta * 2.5;
      const reasons: string[] = [];

      if (targetRow >= 0) {
        const wb = player.workbenches[targetRow];
        const colIdx = WINDOW_PATTERN[targetRow].indexOf(selection.color);

        if (evalRes.willCompleteWorkbench) {
          heuristic += 5.5 + targetRow * 0.4;
          reasons.push(
            `${targetRow + 1}段目を満杯にして今ラウンド+${evalRes.projectedGlazePoints}点を確定`,
          );
        } else {
          const fillRatio =
            (wb.count + evalRes.placedInWorkbench) / wb.capacity;
          heuristic += fillRatio * 3.2;
          reasons.push(
            `${targetRow + 1}段目を${wb.count + evalRes.placedInWorkbench}/${wb.capacity}枚へ前進`,
          );
        }

        // Center column / row adjacency value
        if (colIdx >= 1 && colIdx <= 3) {
          heuristic += 0.6;
        }

        // Persona-specific bonuses
        if (persona === 'chain') {
          if (evalRes.projectedGlazePoints >= 3) {
            heuristic += evalRes.projectedGlazePoints * 1.8;
            reasons.push(`縦横連鎖（+${evalRes.projectedGlazePoints}点）を最大化`);
          }
        } else if (persona === 'bonus') {
          const rowFilledCount = player.window[targetRow].filter(Boolean).length;
          const colFilledCount = player.window.filter(
            (r) => r[colIdx],
          ).length;
          const colorFilledCount = player.window.reduce(
            (acc, r, rIdx) =>
              acc + (r[WINDOW_PATTERN[rIdx].indexOf(selection.color)] ? 1 : 0),
            0,
          );
          if (rowFilledCount >= 3) {
            heuristic += 3.5;
            reasons.push('横1列完成ボーナス（+2点＆終了トリガー）へ接近');
          }
          if (colFilledCount >= 3) {
            heuristic += 5.0;
            reasons.push('縦1列完成ボーナス（+7点）へ接近');
          }
          if (colorFilledCount >= 3) {
            heuristic += 6.0;
            reasons.push('同色5枚コンプリートボーナス（+10点）へ接近');
          }
        } else if (persona === 'cut') {
          // Check if opponents desperately want this color or if leftover tiles punish opponents
          const opponentDesire = allPlayers
            .filter((p) => p.id !== player.id)
            .reduce((acc, opp) => {
              let want = 0;
              opp.workbenches.forEach((owb) => {
                if (
                  owb.color === selection.color &&
                  owb.capacity - owb.count === count
                ) {
                  want += 3.5;
                }
              });
              return acc + want;
            }, 0);
          if (opponentDesire > 0) {
            heuristic += opponentDesire;
            reasons.push('相手が狙うぴったり枚数の色硝子を先回りカット');
          }
        }
      } else {
        // Direct to broken floor is only a last resort
        heuristic -= 8;
        reasons.push('置ける作業台がないため破損ガラス枠へ最小被害で退避');
      }

      if (evalRes.overflowToBroken > 0 && targetRow >= 0) {
        reasons.push(
          `余剰${evalRes.overflowToBroken}枚は破損枠（${evalRes.projectedPenaltyDelta}点）`,
        );
      }

      candidates.push({
        selection,
        targetRow,
        evalResult: evalRes,
        heuristicScore: heuristic,
        reason:
          reasons.join('・') ||
          `${GLASS_MAP[selection.color].shortName}を作業台へ配置`,
      });
    }
  }

  candidates.sort((a, b) => b.heuristicScore - a.heuristicScore);
  return candidates;
}

// ============================================================================
// Custom Stained Glass Tile SVG Component
// ============================================================================

interface StainedGlassTileSvgProps {
  color: GlassColor;
  size?: 'sm' | 'md' | 'lg';
  ghost?: boolean;
  highlighted?: boolean;
  className?: string;
}

function StainedGlassTileSvg({
  color,
  size = 'md',
  ghost = false,
  highlighted = false,
  className = '',
}: StainedGlassTileSvgProps) {
  const meta = GLASS_MAP[color];
  const dims =
    size === 'sm'
      ? 'w-7 h-7'
      : size === 'lg'
        ? 'w-11 h-11 sm:w-12 sm:h-12'
        : 'w-11 h-11 sm:w-10 sm:h-10';

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-lg select-none transition-transform duration-150 ${dims} ${
        ghost ? 'opacity-30 saturate-50' : 'shadow-md'
      } ${
        highlighted ? 'scale-105 ring-2 ring-[#c99555]' : ''
      } ${className}`}
      title={meta.name}
    >
      <svg
        viewBox="0 0 48 48"
        className="w-full h-full rounded-lg overflow-hidden"
        aria-hidden="true"
      >
        <defs>
          <radialGradient
            id={`glass-grad-${color}-${ghost ? 'g' : 'f'}`}
            cx="32%"
            cy="28%"
            r="75%"
          >
            <stop offset="0%" stopColor={meta.accentHex} stopOpacity="0.95" />
            <stop offset="48%" stopColor={meta.primaryHex} stopOpacity="0.95" />
            <stop offset="100%" stopColor={meta.secondaryHex} stopOpacity="0.98" />
          </radialGradient>
        </defs>

        {/* Lead Came Frame */}
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="7"
          fill={`url(#glass-grad-${color}-${ghost ? 'g' : 'f'})`}
          stroke={ghost ? '#64748b' : meta.accentHex}
          strokeWidth={ghost ? '1.5' : '2.2'}
        />

        {/* Inner Bevel Frame */}
        <rect
          x="5.5"
          y="5.5"
          width="37"
          height="37"
          rx="4"
          fill="none"
          stroke="#ffffff"
          strokeOpacity={ghost ? '0.2' : '0.45'}
          strokeWidth="1.2"
        />

        {/* Unique Stained-Glass Geometric Pattern per Color */}
        {color === 'ruby' && (
          <g stroke="#fff1f2" strokeOpacity="0.7" strokeWidth="1.4" fill="none">
            <polygon
              points="24,8 39,24 24,40 9,24"
              fill={meta.accentHex}
              fillOpacity="0.22"
            />
            <circle cx="24" cy="24" r="6.5" fill="#ffe4e6" fillOpacity="0.35" />
            <line x1="24" y1="8" x2="24" y2="40" />
            <line x1="9" y1="24" x2="39" y2="24" />
          </g>
        )}

        {color === 'sapphire' && (
          <g stroke="#e0f2fe" strokeOpacity="0.75" strokeWidth="1.4" fill="none">
            <polygon
              points="24,7 36,15 36,33 24,41 12,33 12,15"
              fill={meta.accentHex}
              fillOpacity="0.22"
            />
            <line x1="24" y1="7" x2="24" y2="41" />
            <line x1="12" y1="15" x2="36" y2="33" />
            <line x1="36" y1="15" x2="12" y2="33" />
            <circle cx="24" cy="24" r="5" fill="#bae6fd" fillOpacity="0.4" />
          </g>
        )}

        {color === 'emerald' && (
          <g stroke="#d1fae5" strokeOpacity="0.75" strokeWidth="1.4" fill="none">
            <rect
              x="11"
              y="11"
              width="26"
              height="26"
              rx="3"
              fill={meta.accentHex}
              fillOpacity="0.2"
            />
            <polygon
              points="24,10 38,24 24,38 10,24"
              fill="#a7f3d0"
              fillOpacity="0.28"
            />
            <rect x="19" y="19" width="10" height="10" rx="1.5" />
          </g>
        )}

        {color === 'amber' && (
          <g stroke="#fef3c7" strokeOpacity="0.8" strokeWidth="1.4" fill="none">
            <circle
              cx="24"
              cy="24"
              r="14"
              fill={meta.accentHex}
              fillOpacity="0.22"
            />
            <polygon
              points="24,8 28,20 40,24 28,28 24,40 20,28 8,24 20,20"
              fill="#fde68a"
              fillOpacity="0.38"
            />
            <circle cx="24" cy="24" r="4.2" fill="#fffbeb" fillOpacity="0.6" />
          </g>
        )}

        {color === 'amethyst' && (
          <g stroke="#f3e8ff" strokeOpacity="0.75" strokeWidth="1.4" fill="none">
            <path
              d="M24 8 C33 14, 38 19, 24 40 C10 19, 15 14, 24 8 Z"
              fill={meta.accentHex}
              fillOpacity="0.25"
            />
            <path
              d="M8 24 C14 15, 19 10, 40 24 C19 38, 14 33, 8 24 Z"
              fill="#e9d5ff"
              fillOpacity="0.22"
            />
            <circle cx="24" cy="24" r="5.2" fill="#faf5ff" fillOpacity="0.42" />
          </g>
        )}

        {/* Top-left Specular Glass Highlight */}
        <path
          d="M 6 14 Q 14 6 28 6"
          stroke="#ffffff"
          strokeOpacity={ghost ? '0.2' : '0.65'}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

// ============================================================================
// Main Game Component
// ============================================================================

export default function StainedGlassMosaicGame() {
  // Game Configuration State
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [leadAiPersona, setLeadAiPersona] = useState<AiPersona>('chain');

  // Audio Controls
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const audioRef = useRef<CathedralAudioEngine | null>(null);

  // Core Match State
  const [round, setRound] = useState<number>(1);
  const [turnPlayerIndex, setTurnPlayerIndex] = useState<number>(0);
  const [startPlayerIndex, setStartPlayerIndex] = useState<number>(0);
  const [kilns, setKilns] = useState<GlassColor[][]>(() =>
    Array.from({ length: 5 }, () => []),
  );
  const [courtyard, setCourtyard] = useState<GlassColor[]>([]);
  const [courtyardHasMaster, setCourtyardHasMaster] = useState<boolean>(true);
  const [bag, setBag] = useState<GlassColor[]>([]);
  const [discardTower, setDiscardTower] = useState<GlassColor[]>([]);
  const [players, setPlayers] = useState<PlayerState[]>(() =>
    createInitialPlayers(2, 'cpu', 'chain'),
  );
  const [logs, setLogs] = useState<string[]>([
    '『硝子工房のモザイク師』へようこそ！硝子窯（キルン）または中庭ストックから色硝子ピースを採取しましょう。',
  ]);
  const [lastGlazeSummary, setLastGlazeSummary] =
    useState<RoundGlazeSummary | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);

  // Player Interactive Selection & Assist
  const [selectedDraft, setSelectedDraft] = useState<DraftSelection | null>(
    null,
  );
  const [hoveredWorkbenchRow, setHoveredWorkbenchRow] = useState<number | null>(
    null,
  );
  const [hintMove, setHintMove] = useState<CandidateMove | null>(null);
  const [undoStack, setUndoStack] = useState<GameSnapshot[]>([]);

  // Initialize Audio Engine & First Deal on Client Mount
  useEffect(() => {
    audioRef.current = new CathedralAudioEngine();
    return () => {
      audioRef.current?.stopBgm();
    };
  }, []);

  const startNewGame = useCallback(
    (
      nextMode: GameMode = gameMode,
      nextCount: number = playerCount,
      nextPersona: AiPersona = leadAiPersona,
    ) => {
      const effectiveCount = nextMode === 'pvp' ? 2 : nextCount;
      const initialBag = createInitialBag();
      const kCount = getKilnCount(effectiveCount);
      const dealt = fillKilnsFromBag(kCount, initialBag, []);
      const initPlayers = createInitialPlayers(
        effectiveCount,
        nextMode,
        nextPersona,
      );

      setGameMode(nextMode);
      setPlayerCount(effectiveCount);
      setLeadAiPersona(nextPersona);
      setRound(1);
      setTurnPlayerIndex(0);
      setStartPlayerIndex(0);
      setKilns(dealt.kilns);
      setCourtyard([]);
      setCourtyardHasMaster(true);
      setBag(dealt.bag);
      setDiscardTower(dealt.discardTower);
      setPlayers(initPlayers);
      setSelectedDraft(null);
      setHoveredWorkbenchRow(null);
      setHintMove(null);
      setUndoStack([]);
      setLastGlazeSummary(null);
      setGameOver(false);
      setShowResultModal(false);
      setLogs([
        `第1ラウンド開始！${kCount}基の硝子窯（キルン）に色硝子ピースが4枚ずつ並びました。`,
      ]);
    },
    [gameMode, playerCount, leadAiPersona],
  );

  // Trigger initial client deal so SSR and client hydrate cleanly
  useEffect(() => {
    startNewGame('cpu', 2, 'chain');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle BGM
  const handleToggleBgm = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    if (next) {
      audioRef.current?.startBgm();
    } else {
      audioRef.current?.stopBgm();
    }
  };

  // Toggle SFX
  const handleToggleSfx = () => {
    setSfxEnabled((prev) => !prev);
  };

  const currentPlayer = players[turnPlayerIndex] ?? players[0];
  const isHumanTurn = !gameOver && currentPlayer && !currentPlayer.isAi;

  // Compute how many tiles are in the currently selected draft
  const selectedTileCount = useMemo(() => {
    if (!selectedDraft) return 0;
    if (
      selectedDraft.sourceType === 'kiln' &&
      selectedDraft.kilnIndex !== undefined
    ) {
      const kiln = kilns[selectedDraft.kilnIndex] || [];
      return kiln.filter((c) => c === selectedDraft.color).length;
    }
    return courtyard.filter((c) => c === selectedDraft.color).length;
  }, [selectedDraft, kilns, courtyard]);

  const selectedTakesMaster = useMemo(() => {
    if (!selectedDraft) return false;
    return selectedDraft.sourceType === 'courtyard' && courtyardHasMaster;
  }, [selectedDraft, courtyardHasMaster]);

  // Pre-calculate evaluations for all 5 workbench rows + broken floor (-1) when a draft is selected
  const rowEvaluations = useMemo(() => {
    if (!selectedDraft || !currentPlayer) return null;
    const map: Record<number, PlacementEvaluation> = {};
    for (const r of [0, 1, 2, 3, 4, -1]) {
      map[r] = evaluatePlacementOnPlayer(
        currentPlayer,
        selectedDraft.color,
        selectedTileCount,
        selectedTakesMaster,
        r,
      );
    }
    return map;
  }, [
    selectedDraft,
    currentPlayer,
    selectedTileCount,
    selectedTakesMaster,
  ]);

  // Execute a draft + placement move (used by both human and AI)
  const executeMove = useCallback(
    (
      selection: DraftSelection,
      targetRow: number,
      recordUndoSnapshot: boolean,
    ) => {
      if (gameOver) return;

      const activePlayer = players[turnPlayerIndex];
      if (!activePlayer) return;

      const sourceTiles =
        selection.sourceType === 'kiln' && selection.kilnIndex !== undefined
          ? kilns[selection.kilnIndex] || []
          : courtyard;

      const takenCount = sourceTiles.filter((c) => c === selection.color).length;
      if (takenCount === 0) return;

      const takesMaster =
        selection.sourceType === 'courtyard' && courtyardHasMaster;

      const evalRes = evaluatePlacementOnPlayer(
        activePlayer,
        selection.color,
        takenCount,
        takesMaster,
        targetRow,
      );
      if (!evalRes.valid) return;

      if (recordUndoSnapshot) {
        const snapshot: GameSnapshot = {
          round,
          turnPlayerIndex,
          startPlayerIndex,
          kilns: kilns.map((k) => [...k]),
          courtyard: [...courtyard],
          courtyardHasMaster,
          bag: [...bag],
          discardTower: [...discardTower],
          players: clonePlayers(players),
          logs: [...logs],
          lastGlazeSummary,
        };
        setUndoStack((prev) => [...prev.slice(-14), snapshot]);
      }

      // Play SFX
      if (sfxEnabled) {
        if (evalRes.overflowToBroken > 0 || targetRow === -1) {
          audioRef.current?.playShatterPenalty();
        } else {
          audioRef.current?.playGlassClink(takenCount);
        }
      }

      // Update Kilns & Courtyard
      const nextKilns = kilns.map((k) => [...k]);
      let nextCourtyard = [...courtyard];
      let nextCourtyardHasMaster = courtyardHasMaster;
      let nextStartPlayerIndex = startPlayerIndex;

      if (
        selection.sourceType === 'kiln' &&
        selection.kilnIndex !== undefined
      ) {
        const sourceKiln = nextKilns[selection.kilnIndex];
        const remaining = sourceKiln.filter((c) => c !== selection.color);
        nextKilns[selection.kilnIndex] = [];
        nextCourtyard.push(...remaining);
      } else {
        nextCourtyard = nextCourtyard.filter((c) => c !== selection.color);
        if (nextCourtyardHasMaster) {
          nextCourtyardHasMaster = false;
          nextStartPlayerIndex = turnPlayerIndex;
        }
      }

      // Update Player Workbench & Broken Floor
      const nextPlayers = clonePlayers(players);
      const p = nextPlayers[turnPlayerIndex];
      const nextDiscardTower = [...discardTower];

      if (takesMaster) {
        if (p.brokenFloor.length < 7) {
          p.brokenFloor.push('master');
        }
      }

      if (targetRow >= 0) {
        const wb = p.workbenches[targetRow];
        wb.color = selection.color;
        wb.count += evalRes.placedInWorkbench;
      }

      for (let i = 0; i < evalRes.overflowToBroken; i++) {
        if (p.brokenFloor.length < 7) {
          p.brokenFloor.push(selection.color);
        } else {
          nextDiscardTower.push(selection.color);
        }
      }

      const sourceLabel =
        selection.sourceType === 'kiln'
          ? `硝子窯#${(selection.kilnIndex ?? 0) + 1}`
          : '中庭ストック';
      const destLabel =
        targetRow >= 0 ? `準備作業台${targetRow + 1}段目` : '破損ガラス枠';
      const masterNote = takesMaster ? '（＋親方マーカー獲得）' : '';
      const overflowNote =
        evalRes.overflowToBroken > 0 && targetRow >= 0
          ? `（余剰${evalRes.overflowToBroken}枚→破損枠）`
          : '';

      const actionLog = `[R${round}] ${p.name}：${sourceLabel}から「${GLASS_MAP[selection.color].shortName}」×${takenCount}枚を採取 → ${destLabel}へ配置${masterNote}${overflowNote}`;

      // Check if all Kilns and Courtyard are now empty -> Trigger Phase 2 (Glazing & Scoring)!
      const allKilnsEmpty = nextKilns.every((k) => k.length === 0);
      const isRoundDraftComplete = allKilnsEmpty && nextCourtyard.length === 0;

      if (!isRoundDraftComplete) {
        setKilns(nextKilns);
        setCourtyard(nextCourtyard);
        setCourtyardHasMaster(nextCourtyardHasMaster);
        setStartPlayerIndex(nextStartPlayerIndex);
        setPlayers(nextPlayers);
        setDiscardTower(nextDiscardTower);
        setTurnPlayerIndex((turnPlayerIndex + 1) % nextPlayers.length);
        setSelectedDraft(null);
        setHoveredWorkbenchRow(null);
        setHintMove(null);
        setLogs((prev) => [actionLog, ...prev.slice(0, 39)]);
        return;
      }

      // ======================================================================
      // Phase 2: Mosaic Glazing Phase (焼き入れ＆ステンドグラス嵌め込み)
      // ======================================================================
      const summaryEntries: RoundGlazeSummary['entries'] = [];
      let anyRowCompleted = false;

      for (const pl of nextPlayers) {
        const glazedDetails: string[] = [];

        for (let r = 0; r < 5; r++) {
          const wb = pl.workbenches[r];
          if (wb.color && wb.count === wb.capacity) {
            const colIdx = WINDOW_PATTERN[r].indexOf(wb.color);
            const glazeRes = calculateGlazeScore(pl.window, r, colIdx);
            pl.window[r][colIdx] = true;
            pl.score += glazeRes.points;
            pl.chainPointsTotal += glazeRes.points;

            glazedDetails.push(
              `${r + 1}段目「${GLASS_MAP[wb.color].shortName}」嵌め込み(+${glazeRes.points}点)`,
            );

            // Remaining (capacity - 1) tiles go to discard tower
            for (let d = 0; d < wb.capacity - 1; d++) {
              nextDiscardTower.push(wb.color);
            }
            wb.color = null;
            wb.count = 0;
          }
        }

        // Apply Broken Glass Floor penalties
        const penalty = calculateBrokenFloorPenalty(pl.brokenFloor.length);
        if (penalty < 0) {
          pl.brokenPenaltyTotal += Math.abs(penalty);
          pl.score = Math.max(0, pl.score + penalty);
        }

        // Return broken glass tiles to discard tower
        for (const item of pl.brokenFloor) {
          if (item !== 'master') {
            nextDiscardTower.push(item);
          }
        }
        pl.brokenFloor = [];

        // Check if any horizontal row of 5 is completed
        for (let r = 0; r < 5; r++) {
          if (pl.window[r].every(Boolean)) {
            anyRowCompleted = true;
          }
        }

        summaryEntries.push({
          playerName: pl.name,
          glazedDetails,
          penalty,
          newScore: pl.score,
        });
      }

      const summaryObj: RoundGlazeSummary = {
        round,
        entries: summaryEntries,
      };

      if (anyRowCompleted) {
        // Calculate End-of-Game Bonuses
        for (const pl of nextPlayers) {
          let rowsDone = 0;
          for (let r = 0; r < 5; r++) {
            if (pl.window[r].every(Boolean)) rowsDone++;
          }
          let colsDone = 0;
          for (let c = 0; c < 5; c++) {
            if (pl.window.every((row) => row[c])) colsDone++;
          }
          let colorsDone = 0;
          for (const colorId of ALL_COLOR_IDS) {
            let countColor = 0;
            for (let r = 0; r < 5; r++) {
              const cIdx = WINDOW_PATTERN[r].indexOf(colorId);
              if (pl.window[r][cIdx]) countColor++;
            }
            if (countColor === 5) colorsDone++;
          }

          pl.completedRowsCount = rowsDone;
          pl.completedColsCount = colsDone;
          pl.completedColorsCount = colorsDone;
          pl.rowBonusScore = rowsDone * 2;
          pl.colBonusScore = colsDone * 7;
          pl.colorBonusScore = colorsDone * 10;
          pl.score +=
            pl.rowBonusScore + pl.colBonusScore + pl.colorBonusScore;
        }

        if (sfxEnabled) {
          audioRef.current?.playVictoryFanfare();
        }

        setKilns(nextKilns);
        setCourtyard([]);
        setCourtyardHasMaster(false);
        setPlayers(nextPlayers);
        setDiscardTower(nextDiscardTower);
        setLastGlazeSummary(summaryObj);
        setSelectedDraft(null);
        setHoveredWorkbenchRow(null);
        setHintMove(null);
        setGameOver(true);
        setShowResultModal(true);
        setLogs((prev) => [
          `🏆 大聖堂ステンドグラス窓の横1列が完成！最終ボーナス集計を行い対局終了となりました。`,
          `✨ 第${round}ラウンドの焼き入れ＆ステンドグラス嵌め込みフェーズ完了！`,
          actionLog,
          ...prev.slice(0, 37),
        ]);
        return;
      }

      // Deal next round
      if (sfxEnabled) {
        audioRef.current?.playCrystalChime();
      }

      const kCount = getKilnCount(nextPlayers.length);
      const dealt = fillKilnsFromBag(kCount, bag, nextDiscardTower);
      const nextRound = round + 1;

      setRound(nextRound);
      setKilns(dealt.kilns);
      setCourtyard([]);
      setCourtyardHasMaster(true);
      setBag(dealt.bag);
      setDiscardTower(dealt.discardTower);
      setPlayers(nextPlayers);
      setTurnPlayerIndex(nextStartPlayerIndex);
      setStartPlayerIndex(nextStartPlayerIndex);
      setLastGlazeSummary(summaryObj);
      setSelectedDraft(null);
      setHoveredWorkbenchRow(null);
      setHintMove(null);
      setLogs((prev) => [
        `✨ 第${round}ラウンドの焼き入れ完了！第${nextRound}ラウンドを開始します（先手：${nextPlayers[nextStartPlayerIndex].name}）。`,
        actionLog,
        ...prev.slice(0, 38),
      ]);
    },
    [
      gameOver,
      players,
      turnPlayerIndex,
      kilns,
      courtyard,
      courtyardHasMaster,
      round,
      startPlayerIndex,
      bag,
      discardTower,
      logs,
      lastGlazeSummary,
      sfxEnabled,
    ],
  );

  // Trigger AI Turn Automatically
  useEffect(() => {
    if (gameOver) return;
    const active = players[turnPlayerIndex];
    if (!active || !active.isAi) return;

    const timer = window.setTimeout(() => {
      const candidates = generateAllCandidateMoves(
        active,
        players,
        kilns,
        courtyard,
        courtyardHasMaster,
        active.persona,
      );
      if (candidates.length > 0) {
        const best = candidates[0];
        executeMove(best.selection, best.targetRow, false);
      }
    }, 520);

    return () => window.clearTimeout(timer);
  }, [
    gameOver,
    players,
    turnPlayerIndex,
    kilns,
    courtyard,
    courtyardHasMaster,
    executeMove,
  ]);

  // Undo Handler
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRound(prev.round);
    setTurnPlayerIndex(prev.turnPlayerIndex);
    setStartPlayerIndex(prev.startPlayerIndex);
    setKilns(prev.kilns);
    setCourtyard(prev.courtyard);
    setCourtyardHasMaster(prev.courtyardHasMaster);
    setBag(prev.bag);
    setDiscardTower(prev.discardTower);
    setPlayers(prev.players);
    setLogs(prev.logs);
    setLastGlazeSummary(prev.lastGlazeSummary);
    setGameOver(false);
    setShowResultModal(false);
    setSelectedDraft(null);
    setHoveredWorkbenchRow(null);
    setHintMove(null);
  };

  // AI Hint Handler
  const handleRequestHint = () => {
    if (!isHumanTurn || !currentPlayer) return;
    const candidates = generateAllCandidateMoves(
      currentPlayer,
      players,
      kilns,
      courtyard,
      courtyardHasMaster,
      'chain',
    );
    if (candidates.length > 0) {
      const best = candidates[0];
      setHintMove(best);
      setSelectedDraft(best.selection);
      setHoveredWorkbenchRow(best.targetRow);
    }
  };

  // Sorted Final Standings
  const standings = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.completedRowsCount - a.completedRowsCount;
    });
  }, [players]);

  const activePreviewEval = useMemo(() => {
    if (!rowEvaluations || hoveredWorkbenchRow === null) return null;
    return rowEvaluations[hoveredWorkbenchRow] ?? null;
  }, [rowEvaluations, hoveredWorkbenchRow]);

  return (
    <div className="tabletop-page pb-16">
      <header className="tabletop-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/games"
              className="tabletop-button inline-flex min-h-11 shrink-0 items-center px-3 text-xs sm:text-[13px]"
            >
              ← ゲーム一覧
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabletop-kicker">Stained Glass Mosaic</span>
                <span className="tabletop-chip inline-flex min-h-7 items-center px-2.5 text-[11px]">
                  第{round}ラウンド・袋 {bag.length} / 廃棄塔 {discardTower.length}
                </span>
              </div>
              <h2 className="tabletop-title truncate text-lg sm:text-xl">硝子工房のモザイク師</h2>
              <p className="tabletop-muted hidden text-[13px] sm:block">
                色硝子をドラフトして5×5の大聖堂ステンドグラスを完成させる
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleToggleBgm}
              className={`inline-flex min-h-11 items-center px-3 text-xs font-semibold transition ${
                bgmEnabled ? 'tabletop-chip tabletop-chip-active border font-bold' : 'tabletop-chip'
              }`}
            >
              🎵 BGM {bgmEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={handleToggleSfx}
              className={`inline-flex min-h-11 items-center px-3 text-xs font-semibold transition ${
                sfxEnabled ? 'tabletop-chip tabletop-chip-active border font-bold' : 'tabletop-chip'
              }`}
            >
              🔊 効果音 {sfxEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="tabletop-button inline-flex min-h-11 items-center px-2.5 text-xs disabled:pointer-events-none disabled:opacity-40"
            >
              ↩ 1手戻す
            </button>

            <button
              type="button"
              onClick={handleRequestHint}
              disabled={!isHumanTurn}
              className="tabletop-button inline-flex min-h-11 items-center px-2.5 text-xs text-[#dfb06d] disabled:pointer-events-none disabled:opacity-40"
            >
              💡 ヒント
            </button>

            <button
              type="button"
              onClick={() => setShowRuleModal(true)}
              className="tabletop-button inline-flex min-h-11 items-center px-2.5 text-xs"
            >
              📖 遊び方・得点表
            </button>

            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="mx-auto max-w-7xl space-y-5 px-3 pt-4 sm:px-6">
        {/* Match Mode & Setup Bar */}
        <section className="tabletop-panel p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="mr-1 text-[11px] font-semibold text-[#b9a88f]">対局設定</span>
              <button
                type="button"
                onClick={() => startNewGame('cpu', playerCount, leadAiPersona)}
                className={`inline-flex min-h-11 items-center px-3 text-[11px] font-bold transition sm:text-xs ${
                  gameMode === 'cpu' ? 'tabletop-chip tabletop-chip-active border' : 'tabletop-chip'
                }`}
              >
                🤖 CPU対戦（2〜4人）
              </button>
              <button
                type="button"
                onClick={() => startNewGame('pvp', 2, leadAiPersona)}
                className={`inline-flex min-h-11 items-center px-3 text-[11px] font-bold transition sm:text-xs ${
                  gameMode === 'pvp' ? 'tabletop-chip tabletop-chip-active border' : 'tabletop-chip'
                }`}
              >
                👥 1台で2人対戦
              </button>

              {gameMode === 'cpu' && (
                <>
                  <div className="mx-1 hidden h-5 w-px bg-[#4d3d2d] sm:block" />
                  <span className="text-[11px] text-[#b9a88f]">人数</span>
                  {[2, 3, 4].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => startNewGame('cpu', cnt, leadAiPersona)}
                      className={`inline-flex min-h-11 items-center px-2.5 text-[11px] font-semibold transition ${
                        playerCount === cnt
                          ? 'tabletop-chip tabletop-chip-active border'
                          : 'tabletop-chip'
                      }`}
                    >
                      {cnt}人（窯{getKilnCount(cnt)}基）
                    </button>
                  ))}

                  <div className="mx-1 hidden h-5 w-px bg-[#4d3d2d] sm:block" />
                  <span className="text-[11px] text-[#b9a88f]">AI思考</span>
                  {(['chain', 'cut', 'bonus'] as AiPersona[]).map((persona) => (
                    <button
                      key={persona}
                      type="button"
                      onClick={() =>
                        startNewGame('cpu', playerCount, persona)
                      }
                      className={`inline-flex min-h-11 items-center px-2.5 text-[11px] font-semibold transition ${
                        leadAiPersona === persona
                          ? 'tabletop-chip tabletop-chip-active border'
                          : 'tabletop-chip'
                      }`}
                    >
                      {getPersonaLabel(persona)}
                    </button>
                  ))}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {gameOver && (
                <button
                  type="button"
                  onClick={() => setShowResultModal(true)}
                  className="tabletop-button-primary inline-flex min-h-11 items-center px-3 text-xs"
                >
                  🏆 最終結果
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  startNewGame(gameMode, playerCount, leadAiPersona)
                }
                className="tabletop-button inline-flex min-h-11 items-center px-3 text-xs text-[#e3b6ad]"
              >
                ↻ 新規対局
              </button>
            </div>
          </div>
        </section>

        {/* Active Turn Banner & Step Guidance */}
        <section className="tabletop-panel flex flex-col items-start justify-between gap-3 p-3.5 sm:p-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabletop-chip tabletop-chip-active inline-flex min-h-7 items-center px-2.5 text-[11px] font-bold">
                第1フェーズ：硝子窯からの採取
              </span>
              <span className="text-sm font-bold text-[#f4ead8] sm:text-base">
                現在の手番：{currentPlayer?.name}
              </span>
              {currentPlayer?.isAi && !gameOver && (
                <span className="text-[11px] text-[#b9a88f]">
                  AIが最適な硝子配置を計算中…
                </span>
              )}
            </div>
            <p className="text-[13px] leading-relaxed text-[#c9b79d]">
              {!selectedDraft
                ? '① まず「硝子窯（キルン）」または「中庭ストック」の色硝子ピースをクリックして選択してください。'
                : `② 「${GLASS_MAP[selectedDraft.color].name}」×${selectedTileCount}枚を選択中。下の「準備作業台（1〜5段）」をクリックして配置してください。`}
            </p>
          </div>

          {/* Live Placement Score Preview Pill */}
          {selectedDraft && (
            <div className="tabletop-panel-soft w-full space-y-1 p-3 text-xs md:w-auto">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-[#dfb06d]">
                  ✨ 配置時の獲得点・減点プレビュー
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDraft(null);
                    setHoveredWorkbenchRow(null);
                  }}
                  className="min-h-11 px-1 text-[#b9a88f] underline-offset-2 hover:text-[#f4ead8] hover:underline"
                >
                  選択解除
                </button>
              </div>
              {activePreviewEval ? (
                activePreviewEval.valid ? (
                  <div className="flex flex-wrap items-center gap-2 text-[#d8cbb8]">
                    <span>
                      配置先：
                      <strong className="text-[#f4ead8]">
                        {activePreviewEval.targetRow >= 0
                          ? `準備作業台 ${activePreviewEval.targetRow + 1}段目`
                          : '破損ガラス枠へ直接破棄'}
                      </strong>
                    </span>
                    {activePreviewEval.willCompleteWorkbench ? (
                      <span className="rounded-sm border border-[#315d4e] bg-[#14211b] px-2 py-0.5 font-bold text-[#a9cdb7]">
                        完成時 +{activePreviewEval.projectedGlazePoints}点（横
                        {activePreviewEval.projectedHChain}/縦
                        {activePreviewEval.projectedVChain}）
                      </span>
                    ) : (
                      activePreviewEval.targetRow >= 0 && (
                        <span className="rounded-sm border border-[#3f5f78] bg-[#131d24] px-2 py-0.5 text-[#a9c8da]">
                          次ラウンドへ持ち越し（+{activePreviewEval.placedInWorkbench}枚）
                        </span>
                      )
                    )}
                    {activePreviewEval.projectedPenaltyDelta < 0 && (
                      <span className="rounded-sm border border-[#6b3a36] bg-[#241615] px-2 py-0.5 font-bold text-[#e0a9a2]">
                        破損減点 {activePreviewEval.projectedPenaltyDelta}点
                      </span>
                    )}
                    <span className="font-bold text-[#dfb06d]">
                      実質収支：
                      {activePreviewEval.netProjectedDelta >= 0
                        ? `+${activePreviewEval.netProjectedDelta}`
                        : activePreviewEval.netProjectedDelta}
                      点
                    </span>
                  </div>
                ) : (
                  <p className="font-medium text-[#e0a9a2]">
                    ⚠️ {activePreviewEval.invalidReason}
                  </p>
                )
              ) : (
                <p className="text-[#b9a88f]">
                  準備作業台（1〜5段目）にカーソルを合わせると、嵌め込み時の連鎖得点と余剰減点を自動試算します。
                </p>
              )}
            </div>
          )}
        </section>

        {/* AI Hint Banner if requested */}
        {hintMove && isHumanTurn && (
          <div className="tabletop-panel-soft flex flex-wrap items-center justify-between gap-2 border-l-2 border-l-[#315d4e] px-3.5 py-2.5 text-xs sm:text-[13px]">
            <div>
              <span className="mr-2 font-bold text-[#a9cdb7]">
                💡 AI推奨手：
              </span>
              <span className="text-[#e8dcc8]">
                {hintMove.selection.sourceType === 'kiln'
                  ? `硝子窯 #${(hintMove.selection.kilnIndex ?? 0) + 1}`
                  : '中庭ストック'}
                の「{GLASS_MAP[hintMove.selection.color].shortName}」を取り、
                <strong>
                  {hintMove.targetRow >= 0
                    ? `準備作業台 ${hintMove.targetRow + 1}段目`
                    : '破損ガラス枠'}
                </strong>
                へ配置するのが最善です（理由：{hintMove.reason}）
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                executeMove(hintMove.selection, hintMove.targetRow, true)
              }
              className="tabletop-button-primary inline-flex min-h-11 items-center px-3 text-xs"
            >
              この推奨手を実行
            </button>
          </div>
        )}

        {/* PHASE 1 AREA: Glass Kilns (硝子窯) & Center Courtyard (中庭ストック) */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Glass Kilns */}
          <div className="tabletop-panel p-3.5 sm:p-4 lg:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="tabletop-title flex flex-wrap items-center gap-2 text-sm sm:text-base">
                  <span>🔥 硝子窯（キルン）</span>
                  <span className="font-sans text-[11px] font-normal text-[#b9a88f]">
                    同色ピースをすべて獲得し、残りは中庭ストックへ移動
                  </span>
                </h3>
              </div>
              <span className="tabletop-chip inline-flex min-h-7 items-center px-2.5 text-[11px]">
                残り稼働窯：{kilns.filter((k) => k.length > 0).length} /{' '}
                {kilns.length}基
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
              {kilns.map((kiln, kIdx) => {
                const isEmpty = kiln.length === 0;
                return (
                  <div
                    key={kIdx}
                    className={`relative flex min-h-[132px] flex-col items-center justify-between rounded-md border p-2.5 transition ${
                      isEmpty
                        ? 'border-[#3a2e23] bg-[#171310] opacity-50'
                        : 'border-[#5a4631] bg-[#1d1712]'
                    }`}
                  >
                    <div className="mb-1.5 flex w-full items-center justify-between text-[11px] text-[#9c8d78]">
                      <span className="font-semibold text-[#dfb06d]">
                        硝子窯 #{kIdx + 1}
                      </span>
                      <span>{isEmpty ? '空' : `${kiln.length}枚`}</span>
                    </div>

                    {isEmpty ? (
                      <div className="my-auto text-[11px] text-[#7f7261]">
                        採取済み
                      </div>
                    ) : (
                      <div className="my-auto grid grid-cols-2 gap-1.5 sm:gap-2">
                        {kiln.map((color, tIdx) => {
                          const isSelected =
                            selectedDraft?.sourceType === 'kiln' &&
                            selectedDraft.kilnIndex === kIdx &&
                            selectedDraft.color === color;
                          return (
                            <button
                              key={`${kIdx}-${tIdx}`}
                              type="button"
                              disabled={!isHumanTurn}
                              onClick={() => {
                                setSelectedDraft({
                                  sourceType: 'kiln',
                                  kilnIndex: kIdx,
                                  color,
                                });
                              }}
                              className="group min-h-11 min-w-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c99555] disabled:opacity-60"
                              aria-label={`硝子窯${kIdx + 1}の${GLASS_MAP[color].name}を選択`}
                            >
                              <StainedGlassTileSvg
                                color={color}
                                size="md"
                                highlighted={isSelected}
                                className="group-hover:scale-105"
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Courtyard (中庭ストック) */}
          <div className="tabletop-panel flex flex-col justify-between p-3.5 sm:p-4 lg:col-span-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="tabletop-title text-sm sm:text-base">
                  ⛲ 中庭ストック
                </h3>
                <span className="tabletop-chip inline-flex min-h-7 items-center px-2.5 text-[11px]">
                  合計 {courtyard.length}枚
                </span>
              </div>
              <p className="mb-3 text-[11px] leading-relaxed text-[#b9a88f]">
                硝子窯から押し出された色硝子が溜まります。各ラウンドで最初に中庭から採取した職人は「親方マーカー（次ラウンド先手権 / -1点）」も受け取ります。
              </p>

              {/* Master Marker Badge */}
              {courtyardHasMaster && (
                <div className="tabletop-panel-soft mb-3 flex items-center justify-between border-l-2 border-l-[#c99555] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#c99555] text-[10px] font-black text-[#1b120b]">
                      親方
                    </span>
                    <div className="text-xs">
                      <div className="font-bold text-[#e8dcc8]">
                        親方マーカー（先手権 / -1点）
                      </div>
                      <div className="text-[11px] text-[#b9a88f]">
                        中庭から最初に採取すると自動獲得
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grouped Courtyard Tiles by Color */}
              {courtyard.length === 0 ? (
                <div className="tabletop-panel-soft border-dashed py-8 text-center text-[11px] text-[#8b7d69]">
                  現在、中庭ストックに色硝子はありません
                </div>
              ) : (
                <div className="space-y-2">
                  {ALL_COLOR_IDS.map((color) => {
                    const count = courtyard.filter((c) => c === color).length;
                    if (count === 0) return null;
                    const isSelected =
                      selectedDraft?.sourceType === 'courtyard' &&
                      selectedDraft.color === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={!isHumanTurn}
                        onClick={() =>
                          setSelectedDraft({
                            sourceType: 'courtyard',
                            color,
                          })
                        }
                        className={`flex min-h-11 w-full items-center justify-between rounded-md border p-2 transition ${
                          isSelected
                            ? 'border-[#c99555] bg-[#3a2a1c]'
                            : 'border-[#4d3d2d] bg-[#241c15] hover:border-[#6b543d]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="min-w-[92px] text-left text-xs font-bold text-[#e8dcc8]">
                            {GLASS_MAP[color].shortName}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: count }).map((_, idx) => (
                              <StainedGlassTileSvg
                                key={idx}
                                color={color}
                                size="sm"
                                highlighted={isSelected}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="rounded-sm border border-[#6b543d] bg-[#3a2a1c] px-2 py-0.5 text-xs font-bold text-[#dfb06d]">
                          ×{count}枚
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Color Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-1 border-t border-[#4d3d2d] pt-3 text-[11px] text-[#b9a88f]">
              {GLASS_COLORS.map((g) => (
                <span key={g.id} className="inline-flex items-center gap-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: g.primaryHex }}
                  />
                  {g.shortName}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* PLAYER BOARDS: Staging Workbenches (準備作業台 1〜5段) & 5x5 Cathedral Window (大聖堂ステンドグラス窓) */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {players.map((player, pIdx) => {
            const isCurrentTurnPlayer =
              !gameOver && pIdx === turnPlayerIndex;
            const isInteractiveBoard =
              isCurrentTurnPlayer && !player.isAi && selectedDraft !== null;
            const hasMasterInBroken = player.brokenFloor.includes('master');

            return (
              <div
                key={player.id}
                className={`tabletop-panel p-3.5 transition sm:p-4 ${
                  isCurrentTurnPlayer ? 'border-[#c99555] ring-1 ring-[#c99555]' : ''
                }`}
              >
                {/* Player Header */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#4d3d2d] pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {isCurrentTurnPlayer && (
                      <span className="inline-flex min-h-7 items-center rounded-sm bg-[#c99555] px-2 text-[11px] font-black text-[#1b120b]">
                        手番中
                      </span>
                    )}
                    <h3 className="tabletop-title text-base sm:text-lg">
                      {player.name}
                    </h3>
                    {(startPlayerIndex === pIdx || hasMasterInBroken) && (
                      <span className="tabletop-chip inline-flex min-h-7 items-center px-2 text-[11px] font-semibold">
                        👑 次ラウンド先手
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="mr-1.5 text-[11px] text-[#b9a88f]">
                        現在スコア
                      </span>
                      <span className="text-xl font-black text-[#dfb06d] sm:text-2xl">
                        {player.score}
                      </span>
                      <span className="ml-0.5 text-xs text-[#c99555]">点</span>
                    </div>
                  </div>
                </div>

                {/* Workbench + Cathedral Window 5 Rows Alignment */}
                <div className="grid grid-cols-1 items-center gap-2.5 sm:grid-cols-12">
                  {/* Column Headers */}
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[#c9b79d] sm:col-span-5">
                    <span>🛠️ 準備作業台（1〜5段）</span>
                    <span className="text-[10px] text-[#9c8d78]">
                      右端から充填
                    </span>
                  </div>
                  <div className="hidden justify-center text-xs text-[#8b7d69] sm:col-span-1 sm:flex">
                    ➔
                  </div>
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[#dfb06d] sm:col-span-6">
                    <span>🏰 大聖堂ステンドグラス窓（5×5）</span>
                    <span className="text-[10px] text-[#9c8d78]">
                      横1列完成で終了
                    </span>
                  </div>

                  {/* 5 Rows */}
                  {[0, 1, 2, 3, 4].map((rowIndex) => {
                    const wb = player.workbenches[rowIndex];
                    const rowEval =
                      isInteractiveBoard && rowEvaluations
                        ? rowEvaluations[rowIndex]
                        : null;
                    const canPlace = rowEval?.valid ?? false;

                    return (
                      <React.Fragment key={rowIndex}>
                        {/* Workbench Row (1..5 slots, right-aligned) */}
                        <div className="sm:col-span-5">
                          <button
                            type="button"
                            disabled={!isInteractiveBoard || !canPlace}
                            onMouseEnter={() => {
                              if (isInteractiveBoard) {
                                setHoveredWorkbenchRow(rowIndex);
                              }
                            }}
                            onMouseLeave={() => {
                              if (isInteractiveBoard) {
                                setHoveredWorkbenchRow(null);
                              }
                            }}
                            onClick={() => {
                              if (
                                isInteractiveBoard &&
                                selectedDraft &&
                                canPlace
                              ) {
                                executeMove(selectedDraft, rowIndex, true);
                              }
                            }}
                            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 transition ${
                              isInteractiveBoard
                                ? canPlace
                                  ? 'cursor-pointer border-[#315d4e] bg-[#14211b] hover:bg-[#1b2b24]'
                                  : 'cursor-not-allowed border-[#4d3d2d] bg-[#1d1712] opacity-55'
                                : 'border-[#4d3d2d] bg-[#241c15]'
                            }`}
                          >
                            <div className="flex min-w-[54px] flex-col items-start text-left">
                              <span className="text-[11px] font-bold text-[#e8dcc8]">
                                {rowIndex + 1}段目
                              </span>
                              <span className="text-[10px] text-[#9c8d78]">
                                容量 {wb.count}/{wb.capacity}
                              </span>
                              {isInteractiveBoard && rowEval && canPlace && (
                                <span className="mt-0.5 text-[10px] font-bold text-[#a9cdb7]">
                                  {rowEval.willCompleteWorkbench
                                    ? `完成 +${rowEval.projectedGlazePoints}点`
                                    : `+${rowEval.placedInWorkbench}枚`}
                                  {rowEval.projectedPenaltyDelta < 0
                                    ? ` (${rowEval.projectedPenaltyDelta})`
                                    : ''}
                                </span>
                              )}
                            </div>

                            {/* Slots rendered right-to-left visually so tiles fill toward the window */}
                            <div className="flex flex-1 items-center justify-end gap-1">
                              {Array.from({ length: wb.capacity }).map(
                                (_, slotIdx) => {
                                  // Fill from right to left
                                  const revIndex = wb.capacity - 1 - slotIdx;
                                  const isFilled = revIndex < wb.count;
                                  const isPreviewFilled =
                                    isInteractiveBoard &&
                                    canPlace &&
                                    !isFilled &&
                                    rowEval &&
                                    revIndex <
                                      wb.count + rowEval.placedInWorkbench;

                                  return (
                                    <div
                                      key={slotIdx}
                                      className="flex h-9 w-9 items-center justify-center rounded-md border border-[#4d3d2d] bg-[#171310]"
                                    >
                                      {isFilled && wb.color ? (
                                        <StainedGlassTileSvg
                                          color={wb.color}
                                          size="sm"
                                        />
                                      ) : isPreviewFilled && selectedDraft ? (
                                        <StainedGlassTileSvg
                                          color={selectedDraft.color}
                                          size="sm"
                                          ghost
                                          highlighted
                                        />
                                      ) : (
                                        <span className="text-[10px] text-[#5e5140]">
                                          •
                                        </span>
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </button>
                        </div>

                        {/* Arrow Connector */}
                        <div className="hidden justify-center sm:col-span-1 sm:flex">
                          <span
                            className={`text-[10px] font-bold ${
                              wb.count === wb.capacity
                                ? 'text-[#dfb06d]'
                                : 'text-[#6b543d]'
                            }`}
                          >
                            {wb.count === wb.capacity ? '🔥完成' : '→'}
                          </span>
                        </div>

                        {/* 5x5 Cathedral Stained Glass Window Row */}
                        <div className="grid grid-cols-5 gap-1.5 rounded-md border border-[#4d3d2d] bg-[#171310] p-1.5 sm:col-span-6">
                          {WINDOW_PATTERN[rowIndex].map((cellColor, colIdx) => {
                            const isGlazed = player.window[rowIndex][colIdx];
                            const isTargetPreview =
                              isInteractiveBoard &&
                              selectedDraft?.color === cellColor &&
                              rowEval?.valid;

                            return (
                              <div
                                key={colIdx}
                                className={`relative flex items-center justify-center rounded-md border p-1 transition ${
                                  isGlazed
                                    ? 'border-[#6b543d] bg-[#241c15]'
                                    : isTargetPreview
                                      ? 'border-dashed border-[#315d4e] bg-[#14211b]'
                                      : 'border-[#3a2e23] bg-[#1d1712]'
                                }`}
                              >
                                <StainedGlassTileSvg
                                  color={cellColor}
                                  size="sm"
                                  ghost={!isGlazed}
                                  highlighted={Boolean(isTargetPreview)}
                                />
                                {isGlazed && (
                                  <span
                                    className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#c99555] text-[9px] font-black text-[#1b120b]"
                                    title="嵌め込み済み"
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Broken Glass Floor (破損ガラス枠: -1, -1, -2, -2, -2, -3, -3) */}
                <div className="mt-3 flex flex-col justify-between gap-2 border-t border-[#4d3d2d] pt-3 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[#e0a9a2]">
                        💥 破損ガラス枠（減点ライン）
                      </span>
                      <span className="text-[11px] text-[#b9a88f]">
                        現在の減点予定：
                        <strong className="text-[#e0a9a2]">
                          {calculateBrokenFloorPenalty(
                            player.brokenFloor.length,
                          )}
                          点
                        </strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {BROKEN_PENALTIES.map((pen, slotIdx) => {
                        const item = player.brokenFloor[slotIdx];
                        return (
                          <div
                            key={slotIdx}
                            className={`flex h-12 w-11 flex-col items-center justify-between rounded-md border p-1 ${
                              item
                                ? 'border-[#6b3a36] bg-[#241615]'
                                : 'border-[#3a2e23] bg-[#171310]'
                            }`}
                          >
                            <span className="text-[10px] font-bold text-[#e0a9a2]">
                              {pen}
                            </span>
                            {item === 'master' ? (
                              <span className="rounded-sm bg-[#c99555] px-1 py-0.5 text-[9px] font-black text-[#1b120b]">
                                親方
                              </span>
                            ) : item ? (
                              <StainedGlassTileSvg color={item} size="sm" />
                            ) : (
                              <span className="text-[10px] text-[#5e5140]">
                                -
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Discard to Broken Glass Floor Button */}
                  {isInteractiveBoard && selectedDraft && (
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredWorkbenchRow(-1)}
                      onMouseLeave={() => setHoveredWorkbenchRow(null)}
                      onClick={() => executeMove(selectedDraft, -1, true)}
                      className="tabletop-button inline-flex min-h-11 items-center self-start px-3 text-xs font-bold text-[#e0a9a2] sm:self-end"
                    >
                      💥 破損ガラス枠へ直接破棄（
                      {rowEvaluations?.[-1]?.projectedPenaltyDelta ?? 0}点）
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Last Glazing Phase Summary & Action Logs */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Round Glazing Summary */}
          <div className="tabletop-panel p-3.5 sm:p-4 lg:col-span-5">
            <h3 className="tabletop-title mb-2 text-sm">
              🔥 第2フェーズ：焼き入れ＆嵌め込み集計
            </h3>
            {!lastGlazeSummary ? (
              <p className="text-xs leading-relaxed text-[#b9a88f]">
                すべての硝子窯と中庭ストックが空になると、自動的に「第2フェーズ：焼き入れ＆ステンドグラス嵌め込み」が実行され、満杯になった準備作業台の右端ピースが大聖堂ステンドグラス窓へ嵌め込まれます。
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-[#dfb06d]">
                  第{lastGlazeSummary.round}ラウンド終了時の嵌め込み結果
                </div>
                {lastGlazeSummary.entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="tabletop-panel-soft space-y-1 p-2.5"
                  >
                    <div className="flex items-center justify-between font-bold text-[#e8dcc8]">
                      <span>{entry.playerName}</span>
                      <span className="text-[#dfb06d]">
                        累計 {entry.newScore}点
                      </span>
                    </div>
                    <div className="text-[#c9b79d]">
                      {entry.glazedDetails.length > 0
                        ? entry.glazedDetails.join(' / ')
                        : 'このラウンドに完成した作業台なし'}
                    </div>
                    {entry.penalty < 0 && (
                      <div className="text-[#e0a9a2]">
                        破損ガラス枠減点：{entry.penalty}点
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Match Logs */}
          <div className="tabletop-panel p-3.5 sm:p-4 lg:col-span-7">
            <h3 className="tabletop-title mb-2 text-sm">
              📜 工房モザイク対局ログ
            </h3>
            <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1 text-xs text-[#c9b79d]">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="tabletop-panel-soft px-2.5 py-1.5 leading-relaxed"
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ==================================================================== */}
      {/* Final Score Breakdown Modal */}
      {/* ==================================================================== */}
      {showResultModal && gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="tabletop-panel max-h-[85vh] w-full max-w-2xl space-y-4 overflow-y-auto p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#4d3d2d] pb-3">
              <div>
                <span className="tabletop-kicker !text-[11px]">
                  Cathedral Masterpiece Complete
                </span>
                <h3 className="tabletop-title text-lg sm:text-xl">
                  🏆 大聖堂ステンドグラス窓 完成・最終得点内訳
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="tabletop-button inline-flex min-h-11 items-center px-3 text-xs"
              >
                閉じる
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#4d3d2d] text-[#b9a88f]">
                    <th className="py-2 pr-2">順位 / 職人</th>
                    <th className="px-2 py-2 text-right">基本連鎖点</th>
                    <th className="px-2 py-2 text-right">
                      横列ボーナス
                      <span className="block text-[10px]">(+2点×列)</span>
                    </th>
                    <th className="px-2 py-2 text-right">
                      縦列ボーナス
                      <span className="block text-[10px]">(+7点×列)</span>
                    </th>
                    <th className="px-2 py-2 text-right">
                      5色コンプ
                      <span className="block text-[10px]">(+10点×色)</span>
                    </th>
                    <th className="px-2 py-2 text-right">破損減点累計</th>
                    <th className="py-2 pl-2 text-right text-[#dfb06d]">
                      最終合計
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4d3d2d]">
                  {standings.map((pl, rankIdx) => (
                    <tr
                      key={pl.id}
                      className={
                        rankIdx === 0 ? 'bg-[#3a2a1c] font-semibold' : ''
                      }
                    >
                      <td className="py-2.5 pr-2 text-[#f4ead8]">
                        {rankIdx === 0 ? '🥇 1位 ' : `${rankIdx + 1}位 `}
                        {pl.name}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[#e8dcc8]">
                        +{pl.chainPointsTotal}点
                      </td>
                      <td className="px-2 py-2.5 text-right text-[#a9c8da]">
                        +{pl.rowBonusScore}点 ({pl.completedRowsCount}列)
                      </td>
                      <td className="px-2 py-2.5 text-right text-[#a9cdb7]">
                        +{pl.colBonusScore}点 ({pl.completedColsCount}列)
                      </td>
                      <td className="px-2 py-2.5 text-right text-[#cbb5dc]">
                        +{pl.colorBonusScore}点 ({pl.completedColorsCount}色)
                      </td>
                      <td className="px-2 py-2.5 text-right text-[#e0a9a2]">
                        -{pl.brokenPenaltyTotal}点
                      </td>
                      <td className="py-2.5 pl-2 text-right text-lg font-black text-[#dfb06d]">
                        {pl.score}点
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="tabletop-button inline-flex min-h-11 items-center px-4 text-xs font-bold"
              >
                盤面を確認する
              </button>
              <button
                type="button"
                onClick={() =>
                  startNewGame(gameMode, playerCount, leadAiPersona)
                }
                className="tabletop-button-primary inline-flex min-h-11 items-center px-4 text-xs font-black"
              >
                🔄 もう一度対局する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Rule & Scoring Guide Modal */}
      {/* ==================================================================== */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="tabletop-panel max-h-[85vh] w-full max-w-2xl space-y-4 overflow-y-auto p-4 text-xs text-[#e8dcc8] sm:p-6 sm:text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#4d3d2d] pb-3">
              <div>
                <span className="tabletop-kicker !text-[11px]">Rulebook</span>
                <h3 className="tabletop-title text-lg">
                  📖 『硝子工房のモザイク師』ルール＆得点早見表
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="tabletop-button inline-flex min-h-11 items-center px-3 text-xs"
              >
                閉じる
              </button>
            </div>

            <div className="space-y-3 leading-relaxed">
              <div>
                <h4 className="mb-1 font-bold text-[#dfb06d]">
                  1. 第1フェーズ：硝子窯からの採取（ドラフト）
                </h4>
                <p>
                  手番では「① いずれかの<strong>硝子窯（キルン）</strong>から1色を選び、その色の硝子をすべて獲得（残りは<strong>中庭ストック</strong>へ移動）」または「② <strong>中庭ストック</strong>から1色を選び、その色の硝子をすべて獲得（最初の1人は<strong>親方マーカー［次ラウンド先手権 / -1点］</strong>も獲得）」のどちらかを行います。
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-bold text-[#dfb06d]">
                  2. 準備作業台（1〜5段）への配置ルール
                </h4>
                <p>
                  獲得した色硝子は、自分の<strong>準備作業台（1段目［容量1］〜5段目［容量5］）</strong>のいずれか1段に配置します。同じ段には同じ色の硝子しか置けず、また<strong>その段の大聖堂ステンドグラス窓に既に嵌め込まれている色は置けません</strong>。段の容量を超えた余剰ピースは<strong>破損ガラス枠（減点ライン：-1, -1, -2, -2, -2, -3, -3）</strong>へ置かれます。
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-bold text-[#dfb06d]">
                  3. 第2フェーズ：焼き入れ＆ステンドグラス嵌め込み
                </h4>
                <p>
                  すべての硝子窯と中庭ストックが空になると、1段目から5段目まで順に<strong>満杯になった準備作業台</strong>の右端1枚が大聖堂ステンドグラス窓（5×5）の対応マスへ嵌め込まれます。嵌め込んだ瞬間、<strong>上下左右に隣接して繋がっているピース数（横の連続枚数＋縦の連続枚数、孤立時は1点）</strong>を即座に獲得します。
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-bold text-[#dfb06d]">
                  4. 対局終了条件と3大完成ボーナス
                </h4>
                <p>
                  いずれかの職人が大聖堂ステンドグラス窓の<strong>横1列（5マス）をすべて完成</strong>させたラウンドの終了時に対局終了となり、以下の最終ボーナスが加算されます：
                </p>
                <ul className="mt-1 list-disc list-inside space-y-1 text-[#dfb06d]">
                  <li>
                    <strong>横1列完成ボーナス</strong>：完成した横1列ごとに <strong>+2点</strong>
                  </li>
                  <li>
                    <strong>縦1列完成ボーナス</strong>：完成した縦1列ごとに <strong>+7点</strong>
                  </li>
                  <li>
                    <strong>同色5枚コンプリートボーナス</strong>：5枚すべて嵌め込んだ色ごとに <strong>+10点</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
