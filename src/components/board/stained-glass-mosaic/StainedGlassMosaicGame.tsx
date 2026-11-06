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
        : 'w-9 h-9 sm:w-10 sm:h-10';

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-lg select-none transition-transform duration-150 ${dims} ${
        ghost ? 'opacity-30 saturate-50' : 'shadow-md'
      } ${
        highlighted
          ? 'ring-2 ring-amber-300 scale-105 shadow-[0_0_15px_rgba(251,191,36,0.65)]'
          : ''
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
    <div className="min-h-screen bg-gradient-to-b from-[#070914] via-[#0c1224] to-[#090d1a] text-slate-100 pb-16">
      {/* Top Cathedral Stained-Glass Accent Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-amber-400 to-purple-500 opacity-90" />

      {/* Header Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#070b18]/90 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Link
              href="/games"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/60 text-xs font-medium text-slate-200 transition"
            >
              ← ゲーム一覧
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  Stained Glass Mosaic
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  第{round}ラウンド｜袋残り {bag.length}枚 / 廃棄塔{' '}
                  {discardTower.length}枚
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-amber-100">
                硝子工房のモザイク師
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleToggleBgm}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                bgmEnabled
                  ? 'bg-amber-500/25 border-amber-400/70 text-amber-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/70'
              }`}
            >
              🎵 BGM {bgmEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={handleToggleSfx}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                sfxEnabled
                  ? 'bg-sky-500/25 border-sky-400/70 text-sky-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/70'
              }`}
            >
              🔊 効果音 {sfxEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-slate-800/80 border-slate-600/70 text-slate-200 hover:bg-slate-700/80 disabled:opacity-40 disabled:pointer-events-none transition"
            >
              ↩ 1手戻す
            </button>

            <button
              type="button"
              onClick={handleRequestHint}
              disabled={!isHumanTurn}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-500/20 border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-40 disabled:pointer-events-none transition"
            >
              💡 AI推奨手ヒント
            </button>

            <button
              type="button"
              onClick={() => setShowRuleModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-purple-500/20 border-purple-400/60 text-purple-200 hover:bg-purple-500/30 transition"
            >
              📖 遊び方・得点表
            </button>

            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 space-y-5">
        {/* Match Mode & Setup Bar */}
        <section className="rounded-2xl bg-slate-900/80 border border-amber-500/25 p-3.5 sm:p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 mr-1">
                対局モード設定：
              </span>
              <button
                type="button"
                onClick={() => startNewGame('cpu', playerCount, leadAiPersona)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  gameMode === 'cpu'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm'
                    : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                🤖 CPU対戦（2〜4人）
              </button>
              <button
                type="button"
                onClick={() => startNewGame('pvp', 2, leadAiPersona)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  gameMode === 'pvp'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm'
                    : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                👥 1台で2人対戦（パス＆プレイ）
              </button>

              {gameMode === 'cpu' && (
                <>
                  <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />
                  <span className="text-xs text-slate-300">人数:</span>
                  {[2, 3, 4].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => startNewGame('cpu', cnt, leadAiPersona)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                        playerCount === cnt
                          ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cnt}人（窯{getKilnCount(cnt)}基）
                    </button>
                  ))}

                  <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />
                  <span className="text-xs text-slate-300">AI思考:</span>
                  {(['chain', 'cut', 'bonus'] as AiPersona[]).map((persona) => (
                    <button
                      key={persona}
                      type="button"
                      onClick={() =>
                        startNewGame('cpu', playerCount, persona)
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                        leadAiPersona === persona
                          ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {getPersonaLabel(persona)}
                    </button>
                  ))}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {gameOver && (
                <button
                  type="button"
                  onClick={() => setShowResultModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow"
                >
                  🏆 最終結果内訳を表示
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  startNewGame(gameMode, playerCount, leadAiPersona)
                }
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 border border-rose-400/60 text-rose-200 hover:bg-rose-500/30 transition"
              >
                🔄 新規対局リセット
              </button>
            </div>
          </div>
        </section>

        {/* Active Turn Banner & Step Guidance */}
        <section className="rounded-2xl bg-gradient-to-r from-slate-900/95 via-indigo-950/80 to-slate-900/95 border border-indigo-400/30 p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950">
                第1フェーズ：硝子窯からの採取
              </span>
              <span className="text-sm sm:text-base font-bold text-white">
                現在の手番：{currentPlayer?.name}
              </span>
              {currentPlayer?.isAi && !gameOver && (
                <span className="text-xs text-sky-300 animate-pulse">
                  （AIが最適な硝子配置を計算中...）
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              {!selectedDraft
                ? '① まず「硝子窯（キルン）」または「中庭ストック」の色硝子ピースをクリックして選択してください。'
                : `② 「${GLASS_MAP[selectedDraft.color].name}」×${selectedTileCount}枚を選択中！下の「準備作業台（1〜5段）」をクリックして配置してください。`}
            </p>
          </div>

          {/* Live Placement Score Preview Pill */}
          {selectedDraft && (
            <div className="w-full md:w-auto rounded-xl bg-slate-950/90 border border-amber-400/50 px-3.5 py-2 text-xs space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-amber-300">
                  ✨ 配置時の即時獲得点＆減点プレビュー
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDraft(null);
                    setHoveredWorkbenchRow(null);
                  }}
                  className="text-slate-400 hover:text-white underline"
                >
                  選択解除
                </button>
              </div>
              {activePreviewEval ? (
                activePreviewEval.valid ? (
                  <div className="flex flex-wrap items-center gap-2 text-slate-200">
                    <span>
                      配置先：
                      <strong className="text-white">
                        {activePreviewEval.targetRow >= 0
                          ? `準備作業台 ${activePreviewEval.targetRow + 1}段目`
                          : '破損ガラス枠へ直接破棄'}
                      </strong>
                    </span>
                    {activePreviewEval.willCompleteWorkbench ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 font-bold">
                        完成時 +{activePreviewEval.projectedGlazePoints}点（横
                        {activePreviewEval.projectedHChain}/縦
                        {activePreviewEval.projectedVChain}）
                      </span>
                    ) : (
                      activePreviewEval.targetRow >= 0 && (
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200">
                          次ラウンドへ持ち越し（+{activePreviewEval.placedInWorkbench}枚）
                        </span>
                      )
                    )}
                    {activePreviewEval.projectedPenaltyDelta < 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/25 border border-rose-400/60 text-rose-200 font-bold">
                        破損減点 {activePreviewEval.projectedPenaltyDelta}点
                      </span>
                    )}
                    <span className="font-bold text-amber-300">
                      実質収支：
                      {activePreviewEval.netProjectedDelta >= 0
                        ? `+${activePreviewEval.netProjectedDelta}`
                        : activePreviewEval.netProjectedDelta}
                      点
                    </span>
                  </div>
                ) : (
                  <p className="text-rose-300 font-medium">
                    ⚠️ {activePreviewEval.invalidReason}
                  </p>
                )
              ) : (
                <p className="text-slate-400">
                  準備作業台（1〜5段目）にカーソルを合わせると、嵌め込み時の連鎖得点と余剰減点を自動試算します。
                </p>
              )}
            </div>
          )}
        </section>

        {/* AI Hint Banner if requested */}
        {hintMove && isHumanTurn && (
          <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <div>
              <span className="font-bold text-emerald-300 mr-2">
                💡 AI推奨手ナビ：
              </span>
              <span className="text-emerald-100">
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
              className="px-3 py-1 rounded-lg bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300 transition"
            >
              この推奨手を実行する
            </button>
          </div>
        )}

        {/* PHASE 1 AREA: Glass Kilns (硝子窯) & Center Courtyard (中庭ストック) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Glass Kilns */}
          <div className="lg:col-span-8 rounded-2xl bg-slate-900/85 border border-amber-500/25 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-amber-200 flex items-center gap-2">
                  <span>🔥 硝子窯（キルン）</span>
                  <span className="text-xs font-normal text-slate-400">
                    選んだ窯の同色ピースをすべて獲得し、残りは中庭ストックへ移動します
                  </span>
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                残り稼働窯：{kilns.filter((k) => k.length > 0).length} /{' '}
                {kilns.length}基
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {kilns.map((kiln, kIdx) => {
                const isEmpty = kiln.length === 0;
                return (
                  <div
                    key={kIdx}
                    className={`relative rounded-2xl p-3 border transition flex flex-col items-center justify-between min-h-[126px] ${
                      isEmpty
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-45'
                        : 'bg-[radial-gradient(circle_at_center,#1e293b_0%,#0f172a_100%)] border-amber-500/35 shadow-inner'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span className="font-semibold text-amber-200/90">
                        硝子窯 #{kIdx + 1}
                      </span>
                      <span>{isEmpty ? '空' : `${kiln.length}枚`}</span>
                    </div>

                    {isEmpty ? (
                      <div className="my-auto text-xs text-slate-600">
                        採取済み
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 my-auto">
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
                              className="focus:outline-none group"
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
          <div className="lg:col-span-4 rounded-2xl bg-slate-900/85 border border-sky-500/30 p-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-bold text-sky-200">
                  ⛲ 中庭ストック
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950/90 text-sky-300 border border-sky-500/40">
                  合計 {courtyard.length}枚
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                硝子窯から押し出された色硝子が溜まります。各ラウンドで最初に中庭から採取した職人は「親方マーカー（次ラウンド先手権 / -1点）」も受け取ります。
              </p>

              {/* Master Marker Badge */}
              {courtyardHasMaster && (
                <div className="mb-3 rounded-xl bg-amber-500/15 border border-amber-400/50 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow">
                      親方
                    </span>
                    <div className="text-xs">
                      <div className="font-bold text-amber-200">
                        親方マーカー（先手権 / -1点）
                      </div>
                      <div className="text-[11px] text-amber-300/80">
                        中庭から最初に採取すると自動獲得
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grouped Courtyard Tiles by Color */}
              {courtyard.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700/80 py-8 text-center text-xs text-slate-500">
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
                        className={`w-full rounded-xl p-2 border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200 min-w-[92px] text-left">
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
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                          ×{count}枚
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Color Legend */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400">
              {GLASS_COLORS.map((g) => (
                <span key={g.id} className="inline-flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
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
                className={`rounded-2xl p-4 sm:p-5 border transition shadow-2xl ${
                  isCurrentTurnPlayer
                    ? 'bg-slate-900/95 border-amber-400/80 ring-1 ring-amber-400/40'
                    : 'bg-slate-900/75 border-slate-800'
                }`}
              >
                {/* Player Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    {isCurrentTurnPlayer && (
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-xs">
                        手番中
                      </span>
                    )}
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {player.name}
                    </h3>
                    {(startPlayerIndex === pIdx || hasMasterInBroken) && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/50">
                        👑 次ラウンド先手
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 mr-1.5">
                        現在スコア
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-amber-300">
                        {player.score}
                      </span>
                      <span className="text-xs text-amber-200 ml-0.5">点</span>
                    </div>
                  </div>
                </div>

                {/* Workbench + Cathedral Window 5 Rows Alignment */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Column Headers */}
                  <div className="sm:col-span-5 text-xs font-bold text-slate-300 flex items-center justify-between px-1">
                    <span>🛠️ 準備作業台（1〜5段）</span>
                    <span className="text-[11px] text-slate-400">
                      右端から充填
                    </span>
                  </div>
                  <div className="hidden sm:flex sm:col-span-1 justify-center text-slate-500 text-xs">
                    ➔
                  </div>
                  <div className="sm:col-span-6 text-xs font-bold text-amber-200 flex items-center justify-between px-1">
                    <span>🏰 大聖堂ステンドグラス窓（5×5）</span>
                    <span className="text-[11px] text-slate-400">
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
                            className={`w-full rounded-xl px-2.5 py-1.5 border flex items-center justify-between gap-2 transition ${
                              isInteractiveBoard
                                ? canPlace
                                  ? 'bg-emerald-950/40 border-emerald-400/80 hover:bg-emerald-900/50 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                                  : 'bg-rose-950/20 border-rose-800/40 opacity-50 cursor-not-allowed'
                                : 'bg-slate-950/60 border-slate-800/90'
                            }`}
                          >
                            <div className="flex flex-col items-start text-left min-w-[54px]">
                              <span className="text-xs font-bold text-slate-300">
                                {rowIndex + 1}段目
                              </span>
                              <span className="text-[10px] text-slate-400">
                                容量 {wb.count}/{wb.capacity}
                              </span>
                              {isInteractiveBoard && rowEval && canPlace && (
                                <span className="mt-0.5 text-[10px] font-bold text-emerald-300">
                                  {rowEval.willCompleteWorkbench
                                    ? `完成+${rowEval.projectedGlazePoints}点`
                                    : `+${rowEval.placedInWorkbench}枚`}
                                  {rowEval.projectedPenaltyDelta < 0
                                    ? ` (${rowEval.projectedPenaltyDelta})`
                                    : ''}
                                </span>
                              )}
                            </div>

                            {/* Slots rendered right-to-left visually so tiles fill toward the window */}
                            <div className="flex items-center justify-end gap-1 flex-1">
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
                                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-slate-700/80 bg-slate-900/90 flex items-center justify-center"
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
                                        <span className="text-[10px] text-slate-700">
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
                        <div className="hidden sm:flex sm:col-span-1 justify-center">
                          <span
                            className={`text-xs font-bold ${
                              wb.count === wb.capacity
                                ? 'text-amber-300 animate-pulse'
                                : 'text-slate-600'
                            }`}
                          >
                            {wb.count === wb.capacity ? '🔥完成' : '→'}
                          </span>
                        </div>

                        {/* 5x5 Cathedral Stained Glass Window Row */}
                        <div className="sm:col-span-6 grid grid-cols-5 gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                          {WINDOW_PATTERN[rowIndex].map((cellColor, colIdx) => {
                            const isGlazed = player.window[rowIndex][colIdx];
                            const isTargetPreview =
                              isInteractiveBoard &&
                              selectedDraft?.color === cellColor &&
                              rowEval?.valid;

                            return (
                              <div
                                key={colIdx}
                                className={`relative rounded-lg p-1 flex items-center justify-center border transition ${
                                  isGlazed
                                    ? 'bg-slate-900/90 border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.22)]'
                                    : isTargetPreview
                                      ? 'bg-emerald-950/50 border-emerald-400 border-dashed'
                                      : 'bg-slate-950/60 border-slate-800/80'
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
                                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center shadow"
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
                <div className="mt-4 pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-300">
                        💥 破損ガラス枠（減点ライン）
                      </span>
                      <span className="text-[11px] text-slate-400">
                        現在減点予定：
                        <strong className="text-rose-300">
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
                            className={`w-10 h-11 rounded-lg border flex flex-col items-center justify-between p-1 ${
                              item
                                ? 'bg-rose-950/60 border-rose-400/70'
                                : 'bg-slate-950/70 border-slate-800'
                            }`}
                          >
                            <span className="text-[10px] font-bold text-rose-300">
                              {pen}
                            </span>
                            {item === 'master' ? (
                              <span className="px-1 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                                親方
                              </span>
                            ) : item ? (
                              <StainedGlassTileSvg color={item} size="sm" />
                            ) : (
                              <span className="text-[10px] text-slate-700">
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
                      className="self-start sm:self-end px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900/80 border border-rose-400/60 text-xs font-bold text-rose-200 transition"
                    >
                      💥 破損ガラス枠へ直接破棄する（
                      {rowEvaluations?.[-1]?.projectedPenaltyDelta ?? 0}点）
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Last Glazing Phase Summary & Action Logs */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Round Glazing Summary */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900/80 border border-amber-500/25 p-4">
            <h3 className="text-sm font-bold text-amber-200 mb-2">
              🔥 第2フェーズ：焼き入れ＆嵌め込み集計レポート
            </h3>
            {!lastGlazeSummary ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                すべての硝子窯と中庭ストックが空になると、自動的に「第2フェーズ：焼き入れ＆ステンドグラス嵌め込み」が実行され、満杯になった準備作業台の右端ピースが大聖堂ステンドグラス窓へ嵌め込まれます。
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="text-amber-300 font-semibold">
                  第{lastGlazeSummary.round}ラウンド終了時の嵌め込み結果：
                </div>
                {lastGlazeSummary.entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>{entry.playerName}</span>
                      <span className="text-amber-300">
                        累計 {entry.newScore}点
                      </span>
                    </div>
                    <div className="text-slate-300">
                      {entry.glazedDetails.length > 0
                        ? entry.glazedDetails.join(' / ')
                        : 'このラウンドに完成した作業台なし'}
                    </div>
                    {entry.penalty < 0 && (
                      <div className="text-rose-300">
                        破損ガラス枠減点：{entry.penalty}点
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Match Logs */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <h3 className="text-sm font-bold text-slate-200 mb-2">
              📜 工房モザイク対局ログ
            </h3>
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 text-xs text-slate-300">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-slate-950/60 border border-slate-800/80 px-2.5 py-1.5"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-slate-900 border border-amber-400/60 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Cathedral Masterpiece Complete
                </span>
                <h3 className="text-xl font-black text-white">
                  🏆 大聖堂ステンドグラス窓 完成・最終得点内訳
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                閉じる
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-2">順位 / 職人</th>
                    <th className="py-2 px-2 text-right">基本連鎖点</th>
                    <th className="py-2 px-2 text-right">
                      横列ボーナス
                      <span className="block text-[10px]">(+2点×列)</span>
                    </th>
                    <th className="py-2 px-2 text-right">
                      縦列ボーナス
                      <span className="block text-[10px]">(+7点×列)</span>
                    </th>
                    <th className="py-2 px-2 text-right">
                      5色コンプ
                      <span className="block text-[10px]">(+10点×色)</span>
                    </th>
                    <th className="py-2 px-2 text-right">破損減点累計</th>
                    <th className="py-2 pl-2 text-right text-amber-300">
                      最終合計
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {standings.map((pl, rankIdx) => (
                    <tr
                      key={pl.id}
                      className={
                        rankIdx === 0 ? 'bg-amber-500/10 font-semibold' : ''
                      }
                    >
                      <td className="py-2.5 pr-2 text-white">
                        {rankIdx === 0 ? '🥇 1位 ' : `${rankIdx + 1}位 `}
                        {pl.name}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-200">
                        +{pl.chainPointsTotal}点
                      </td>
                      <td className="py-2.5 px-2 text-right text-sky-300">
                        +{pl.rowBonusScore}点 ({pl.completedRowsCount}列)
                      </td>
                      <td className="py-2.5 px-2 text-right text-emerald-300">
                        +{pl.colBonusScore}点 ({pl.completedColsCount}列)
                      </td>
                      <td className="py-2.5 px-2 text-right text-purple-300">
                        +{pl.colorBonusScore}点 ({pl.completedColorsCount}色)
                      </td>
                      <td className="py-2.5 px-2 text-right text-rose-300">
                        -{pl.brokenPenaltyTotal}点
                      </td>
                      <td className="py-2.5 pl-2 text-right text-lg font-black text-amber-300">
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
              >
                盤面を確認する
              </button>
              <button
                type="button"
                onClick={() =>
                  startNewGame(gameMode, playerCount, leadAiPersona)
                }
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-black text-slate-950 transition shadow"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-900 border border-purple-400/50 p-5 sm:p-6 shadow-2xl space-y-4 text-xs sm:text-sm text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                📖 『硝子工房のモザイク師』ルール＆得点早見表
              </h3>
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                閉じる
              </button>
            </div>

            <div className="space-y-3 leading-relaxed">
              <div>
                <h4 className="font-bold text-amber-300 mb-1">
                  1. 第1フェーズ：硝子窯からの採取（ドラフト）
                </h4>
                <p>
                  手番では「① いずれかの<strong>硝子窯（キルン）</strong>から1色を選び、その色の硝子をすべて獲得（残りは<strong>中庭ストック</strong>へ移動）」または「② <strong>中庭ストック</strong>から1色を選び、その色の硝子をすべて獲得（最初の1人は<strong>親方マーカー［次ラウンド先手権 / -1点］</strong>も獲得）」のどちらかを行います。
                </p>
              </div>

              <div>
                <h4 className="font-bold text-amber-300 mb-1">
                  2. 準備作業台（1〜5段）への配置ルール
                </h4>
                <p>
                  獲得した色硝子は、自分の<strong>準備作業台（1段目［容量1］〜5段目［容量5］）</strong>のいずれか1段に配置します。同じ段には同じ色の硝子しか置けず、また<strong>その段の大聖堂ステンドグラス窓に既に嵌め込まれている色は置けません</strong>。段の容量を超えた余剰ピースは<strong>破損ガラス枠（減点ライン：-1, -1, -2, -2, -2, -3, -3）</strong>へ置かれます。
                </p>
              </div>

              <div>
                <h4 className="font-bold text-amber-300 mb-1">
                  3. 第2フェーズ：焼き入れ＆ステンドグラス嵌め込み
                </h4>
                <p>
                  すべての硝子窯と中庭ストックが空になると、1段目から5段目まで順に<strong>満杯になった準備作業台</strong>の右端1枚が大聖堂ステンドグラス窓（5×5）の対応マスへ嵌め込まれます。嵌め込んだ瞬間、<strong>上下左右に隣接して繋がっているピース数（横の連続枚数＋縦の連続枚数、孤立時は1点）</strong>を即座に獲得します。
                </p>
              </div>

              <div>
                <h4 className="font-bold text-amber-300 mb-1">
                  4. 対局終了条件と3大完成ボーナス
                </h4>
                <p>
                  いずれかの職人が大聖堂ステンドグラス窓の<strong>横1列（5マス）をすべて完成</strong>させたラウンドの終了時に対局終了となり、以下の最終ボーナスが加算されます：
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-amber-200">
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
