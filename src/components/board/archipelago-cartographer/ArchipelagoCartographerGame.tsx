'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// ============================================================================
// Types & Constants
// ============================================================================

export type EdgeTerrain = 'ocean' | 'route' | 'island';
export type CenterFeature = 'none' | 'lighthouse' | 'port' | 'reef_junction';
export type Rotation = 0 | 90 | 180 | 270;
export type SlotId = 'N' | 'E' | 'S' | 'W' | 'C';
export type PlayerId = 1 | 2;
export type GameMode = 'cpu' | 'pvp';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type TurnPhase = 'place_tile' | 'place_beacon' | 'game_over';

export interface TileTemplate {
  id: string;
  name: string;
  /** Edges at 0° rotation: [North, East, South, West] */
  edges: [EdgeTerrain, EdgeTerrain, EdgeTerrain, EdgeTerrain];
  center: CenterFeature;
  /** Whether route edges on this tile connect continuously through the center */
  connectRoutes: boolean;
  /** Whether island edges on this tile form one connected landmass */
  connectIslands: boolean;
  count: number;
}

export interface PlacedBeacon {
  player: PlayerId;
  slot: SlotId;
}

export interface PlacedTile {
  uid: string;
  templateId: string;
  name: string;
  /** Rotated edges: [North, East, South, West] */
  edges: [EdgeTerrain, EdgeTerrain, EdgeTerrain, EdgeTerrain];
  center: CenterFeature;
  connectRoutes: boolean;
  connectIslands: boolean;
  rotation: Rotation;
  beacon: PlacedBeacon | null;
  placedBy: PlayerId | 0;
  turnNumber: number;
}

export interface ScoreBreakdown {
  route: number;
  island: number;
  lighthouse: number;
  incomplete: number;
}

export interface ScorePopup {
  id: string;
  r: number;
  c: number;
  text: string;
  player: PlayerId | 'both';
}

export interface MoveLogItem {
  id: string;
  turn: number;
  player: PlayerId;
  coord: string;
  tileName: string;
  beaconText: string;
  scoredText: string | null;
}

export interface BeaconOption {
  slot: SlotId;
  kind: 'route' | 'island' | 'lighthouse';
  label: string;
  willCompleteImmediately: boolean;
  estimatedPoints: number;
}

export interface HintRecommendation {
  r: number;
  c: number;
  rotation: Rotation;
  beaconSlot: SlotId | null;
  reason: string;
  score: number;
}

const GRID_SIZE = 9;
const CENTER_R = 4;
const CENTER_C = 4;
const INITIAL_BEACONS = 5;

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const DIR_DELTAS: Record<0 | 1 | 2 | 3, [number, number]> = {
  0: [-1, 0], // North
  1: [0, 1], // East
  2: [1, 0], // South
  3: [0, -1], // West
};

const DIR_TO_SLOT: [SlotId, SlotId, SlotId, SlotId] = ['N', 'E', 'S', 'W'];
const SLOT_TO_DIR: Record<Exclude<SlotId, 'C'>, 0 | 1 | 2 | 3> = {
  N: 0,
  E: 1,
  S: 2,
  W: 3,
};

const OPPOSITE_DIR: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3] = [2, 3, 0, 1];

const START_TILE_TEMPLATE: TileTemplate = {
  id: 'start_harbor',
  name: '起点海図・王立基準港',
  edges: ['island', 'route', 'ocean', 'route'],
  center: 'none',
  connectRoutes: true,
  connectIslands: false,
  count: 1,
};

/**
 * 28 Nautical Chart Tiles (海域タイルデッキ)
 * Designed so every edge type (外洋 / 珊瑚航路 / 群島陸地) has balanced connectors and caps.
 */
const TILE_CATALOG: TileTemplate[] = [
  {
    id: 'straight_route',
    name: '直進珊瑚航路',
    edges: ['route', 'ocean', 'route', 'ocean'],
    center: 'none',
    connectRoutes: true,
    connectIslands: false,
    count: 4,
  },
  {
    id: 'curve_route',
    name: '湾曲珊瑚航路',
    edges: ['route', 'route', 'ocean', 'ocean'],
    center: 'none',
    connectRoutes: true,
    connectIslands: false,
    count: 4,
  },
  {
    id: 'reef_tri',
    name: '三叉潮流分岐点',
    edges: ['route', 'route', 'route', 'ocean'],
    center: 'reef_junction',
    connectRoutes: false,
    connectIslands: false,
    count: 2,
  },
  {
    id: 'reef_cross',
    name: '十字潮流交差点',
    edges: ['route', 'route', 'route', 'route'],
    center: 'reef_junction',
    connectRoutes: false,
    connectIslands: false,
    count: 1,
  },
  {
    id: 'lighthouse_open',
    name: '外洋の古代灯台',
    edges: ['ocean', 'ocean', 'ocean', 'ocean'],
    center: 'lighthouse',
    connectRoutes: false,
    connectIslands: false,
    count: 2,
  },
  {
    id: 'lighthouse_route',
    name: '灯台へ続く航路',
    edges: ['ocean', 'ocean', 'route', 'ocean'],
    center: 'lighthouse',
    connectRoutes: false,
    connectIslands: false,
    count: 2,
  },
  {
    id: 'cape_single',
    name: '孤島の岬',
    edges: ['island', 'ocean', 'ocean', 'ocean'],
    center: 'none',
    connectRoutes: false,
    connectIslands: false,
    count: 3,
  },
  {
    id: 'cape_route_curve',
    name: '岬と湾曲航路',
    edges: ['island', 'route', 'route', 'ocean'],
    center: 'none',
    connectRoutes: true,
    connectIslands: false,
    count: 2,
  },
  {
    id: 'cape_route_pass',
    name: '沿岸航路と岬',
    edges: ['island', 'route', 'ocean', 'route'],
    center: 'none',
    connectRoutes: true,
    connectIslands: false,
    count: 2,
  },
  {
    id: 'archipelago_corner',
    name: '連島湾岸（二辺群島）',
    edges: ['island', 'island', 'ocean', 'ocean'],
    center: 'none',
    connectRoutes: false,
    connectIslands: true,
    count: 2,
  },
  {
    id: 'archipelago_port_corner',
    name: '交易港のある湾岸群島',
    edges: ['island', 'island', 'route', 'route'],
    center: 'port',
    connectRoutes: true,
    connectIslands: true,
    count: 1,
  },
  {
    id: 'archipelago_strait',
    name: '群島地峡（対岸連結）',
    edges: ['island', 'ocean', 'island', 'ocean'],
    center: 'port',
    connectRoutes: false,
    connectIslands: true,
    count: 1,
  },
  {
    id: 'twin_capes',
    name: '双子岬の海峡',
    edges: ['island', 'ocean', 'island', 'ocean'],
    center: 'none',
    connectRoutes: false,
    connectIslands: false,
    count: 1,
  },
  {
    id: 'grand_harbor',
    name: '大交易港の群島',
    edges: ['island', 'island', 'route', 'island'],
    center: 'port',
    connectRoutes: false,
    connectIslands: true,
    count: 1,
  },
];

// ============================================================================
// Helper Functions: Rotation, Board & Feature Graph Analysis
// ============================================================================

function rotateEdges(
  edges: [EdgeTerrain, EdgeTerrain, EdgeTerrain, EdgeTerrain],
  rotation: Rotation
): [EdgeTerrain, EdgeTerrain, EdgeTerrain, EdgeTerrain] {
  const steps = ((rotation / 90) % 4 + 4) % 4;
  if (steps === 0) return [...edges];
  if (steps === 1) return [edges[3], edges[0], edges[1], edges[2]];
  if (steps === 2) return [edges[2], edges[3], edges[0], edges[1]];
  return [edges[1], edges[2], edges[3], edges[0]];
}

function formatCoord(r: number, c: number): string {
  return `${COL_LABELS[c]}${ROW_LABELS[r]}`;
}

function terrainLabel(t: EdgeTerrain): string {
  if (t === 'route') return '珊瑚航路';
  if (t === 'island') return '群島陸地';
  return '外洋';
}

function createInitialBoard(): (PlacedTile | null)[][] {
  const grid: (PlacedTile | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array<PlacedTile | null>(GRID_SIZE).fill(null)
  );
  grid[CENTER_R][CENTER_C] = {
    uid: 'tile-start',
    templateId: START_TILE_TEMPLATE.id,
    name: START_TILE_TEMPLATE.name,
    edges: [...START_TILE_TEMPLATE.edges],
    center: START_TILE_TEMPLATE.center,
    connectRoutes: START_TILE_TEMPLATE.connectRoutes,
    connectIslands: START_TILE_TEMPLATE.connectIslands,
    rotation: 0,
    beacon: null,
    placedBy: 0,
    turnNumber: 0,
  };
  return grid;
}

function cloneBoard(board: (PlacedTile | null)[][]): (PlacedTile | null)[][] {
  return board.map((row) =>
    row.map((cell) =>
      cell
        ? {
            ...cell,
            edges: [...cell.edges] as [EdgeTerrain, EdgeTerrain, EdgeTerrain, EdgeTerrain],
            beacon: cell.beacon ? { ...cell.beacon } : null,
          }
        : null
    )
  );
}

function createShuffledDeck(): TileTemplate[] {
  const list: TileTemplate[] = [];
  for (const tpl of TILE_CATALOG) {
    for (let i = 0; i < tpl.count; i++) {
      list.push({ ...tpl, edges: [...tpl.edges] });
    }
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

/**
 * Checks whether a tile with `rotatedEdges` can be legally placed at `(r, c)`.
 * Must be empty, orthogonally adjacent to at least 1 existing tile, and match all touching edges.
 */
function canPlaceTileAt(
  board: (PlacedTile | null)[][],
  r: number,
  c: number,
  rotatedEdges: [EdgeTerrain, EdgeTerrain, EdgeTerrain, EdgeTerrain]
): boolean {
  if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
  if (board[r][c] !== null) return false;

  let hasNeighbor = false;
  for (const d of [0, 1, 2, 3] as const) {
    const [dr, dc] = DIR_DELTAS[d];
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
    const neighbor = board[nr][nc];
    if (neighbor) {
      hasNeighbor = true;
      const oppDir = OPPOSITE_DIR[d];
      if (neighbor.edges[oppDir] !== rotatedEdges[d]) {
        return false;
      }
    }
  }
  return hasNeighbor;
}

function getValidCellsForRotation(
  board: (PlacedTile | null)[][],
  template: TileTemplate,
  rotation: Rotation
): [number, number][] {
  const rotated = rotateEdges(template.edges, rotation);
  const valid: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlaceTileAt(board, r, c, rotated)) {
        valid.push([r, c]);
      }
    }
  }
  return valid;
}

function hasAnyValidPlacement(board: (PlacedTile | null)[][], template: TileTemplate): boolean {
  for (const rot of [0, 90, 180, 270] as Rotation[]) {
    if (getValidCellsForRotation(board, template, rot).length > 0) {
      return true;
    }
  }
  return false;
}

interface ComponentNode {
  r: number;
  c: number;
  slot: SlotId;
}

interface FeatureComponent {
  kind: 'route' | 'island' | 'lighthouse';
  nodes: ComponentNode[];
  tiles: [number, number][];
  beacons: { r: number; c: number; player: PlayerId; slot: SlotId }[];
  completed: boolean;
  pointsIfCompleted: number;
  pointsIfIncomplete: number;
  portCount: number;
}

function nodeKey(r: number, c: number, slot: SlotId): string {
  return `${r},${c},${slot}`;
}

/**
 * Given a tile at (startR, startC) and a slot ('N' | 'E' | 'S' | 'W' | 'C'),
 * traces the entire connected feature component across the board.
 */
function traceFeatureComponent(
  board: (PlacedTile | null)[][],
  startR: number,
  startC: number,
  startSlot: SlotId
): FeatureComponent | null {
  const startTile = board[startR]?.[startC];
  if (!startTile) return null;

  if (startSlot === 'C') {
    if (startTile.center !== 'lighthouse') return null;
    // Lighthouse component is centered at (startR, startC) and checks 3x3 neighborhood
    let totalCells = 0;
    let filledCells = 0;
    const neighborhoodTiles: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = startR + dr;
        const nc = startC + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          totalCells++;
          if (board[nr][nc] !== null) {
            filledCells++;
            neighborhoodTiles.push([nr, nc]);
          }
        }
      }
    }
    const completed = filledCells === totalCells;
    const beacons: { r: number; c: number; player: PlayerId; slot: SlotId }[] = [];
    if (startTile.beacon && startTile.beacon.slot === 'C') {
      beacons.push({
        r: startR,
        c: startC,
        player: startTile.beacon.player,
        slot: 'C',
      });
    }
    return {
      kind: 'lighthouse',
      nodes: [{ r: startR, c: startC, slot: 'C' }],
      tiles: neighborhoodTiles,
      beacons,
      completed,
      pointsIfCompleted: filledCells + 2, // 1 pt per tile in 3x3 + 2 completion bonus (up to 11 pts)
      pointsIfIncomplete: filledCells,
      portCount: 0,
    };
  }

  const startDir = SLOT_TO_DIR[startSlot];
  const kind = startTile.edges[startDir];
  if (kind !== 'route' && kind !== 'island') return null;

  const visited = new Set<string>();
  const queue: ComponentNode[] = [{ r: startR, c: startC, slot: startSlot }];
  visited.add(nodeKey(startR, startC, startSlot));

  const nodes: ComponentNode[] = [];
  const tileSet = new Set<string>();
  const tiles: [number, number][] = [];
  const beacons: { r: number; c: number; player: PlayerId; slot: SlotId }[] = [];
  let openEdges = 0;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    nodes.push(curr);

    const tKey = `${curr.r},${curr.c}`;
    const tile = board[curr.r][curr.c]!;
    if (!tileSet.has(tKey)) {
      tileSet.add(tKey);
      tiles.push([curr.r, curr.c]);
    }

    if (tile.beacon && tile.beacon.slot === curr.slot) {
      beacons.push({
        r: curr.r,
        c: curr.c,
        player: tile.beacon.player,
        slot: curr.slot,
      });
    }

    const dir = SLOT_TO_DIR[curr.slot as Exclude<SlotId, 'C'>];

    // 1. Internal connections on the same tile
    const connectsInternally =
      (kind === 'route' && tile.connectRoutes) || (kind === 'island' && tile.connectIslands);
    if (connectsInternally) {
      for (const otherDir of [0, 1, 2, 3] as const) {
        if (otherDir !== dir && tile.edges[otherDir] === kind) {
          const otherSlot = DIR_TO_SLOT[otherDir];
          const k = nodeKey(curr.r, curr.c, otherSlot);
          if (!visited.has(k)) {
            visited.add(k);
            queue.push({ r: curr.r, c: curr.c, slot: otherSlot });
          }
        }
      }
    }

    // 2. External connection across grid edge
    const [dr, dc] = DIR_DELTAS[dir];
    const nr = curr.r + dr;
    const nc = curr.c + dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      const neighbor = board[nr][nc];
      if (!neighbor) {
        openEdges++;
      } else {
        const oppDir = OPPOSITE_DIR[dir];
        if (neighbor.edges[oppDir] === kind) {
          const oppSlot = DIR_TO_SLOT[oppDir];
          const k = nodeKey(nr, nc, oppSlot);
          if (!visited.has(k)) {
            visited.add(k);
            queue.push({ r: nr, c: nc, slot: oppSlot });
          }
        }
      }
    }
  }

  let portCount = 0;
  if (kind === 'island') {
    for (const [tr, tc] of tiles) {
      if (board[tr][tc]?.center === 'port') {
        portCount++;
      }
    }
  }

  const completed = openEdges === 0;
  const tileCount = tiles.length;
  const pointsIfCompleted =
    kind === 'route' ? tileCount * 2 : tileCount * 3 + portCount * 2;
  const pointsIfIncomplete =
    kind === 'route' ? tileCount * 1 : tileCount * 1 + portCount * 1;

  return {
    kind,
    nodes,
    tiles,
    beacons,
    completed,
    pointsIfCompleted,
    pointsIfIncomplete,
    portCount,
  };
}

/**
 * Finds all distinct local feature options on the tile at `(r, c)` where the player could place a beacon.
 * A feature is eligible only if its connected component currently has 0 beacons.
 */
function getBeaconOptionsForTile(
  board: (PlacedTile | null)[][],
  r: number,
  c: number
): BeaconOption[] {
  const tile = board[r]?.[c];
  if (!tile) return [];

  const options: BeaconOption[] = [];
  const seenLocalNodes = new Set<string>();

  for (const dir of [0, 1, 2, 3] as const) {
    const slot = DIR_TO_SLOT[dir];
    if (seenLocalNodes.has(nodeKey(r, c, slot))) continue;

    const terrain = tile.edges[dir];
    if (terrain !== 'route' && terrain !== 'island') continue;

    const comp = traceFeatureComponent(board, r, c, slot);
    if (!comp) continue;

    for (const n of comp.nodes) {
      if (n.r === r && n.c === c) {
        seenLocalNodes.add(nodeKey(r, c, n.slot));
      }
    }

    if (comp.beacons.length === 0) {
      const dirNames: Record<SlotId, string> = {
        N: '北辺',
        E: '東辺',
        S: '南辺',
        W: '西辺',
        C: '中央',
      };
      const kindName = comp.kind === 'route' ? '珊瑚航路' : '群島陸地';
      options.push({
        slot,
        kind: comp.kind,
        label: `${dirNames[slot]}の${kindName}`,
        willCompleteImmediately: comp.completed,
        estimatedPoints: comp.completed ? comp.pointsIfCompleted : comp.pointsIfIncomplete,
      });
    }
  }

  if (tile.center === 'lighthouse') {
    const comp = traceFeatureComponent(board, r, c, 'C');
    if (comp && comp.beacons.length === 0) {
      options.push({
        slot: 'C',
        kind: 'lighthouse',
        label: '中央の古代灯台',
        willCompleteImmediately: comp.completed,
        estimatedPoints: comp.completed ? comp.pointsIfCompleted : comp.pointsIfIncomplete,
      });
    }
  }

  return options;
}

/**
 * Evaluates all completed features on the board, awards points to beacon majority holders,
 * and removes beacons from completed features (returning them to their owners' supply).
 */
function resolveCompletedFeatures(
  board: (PlacedTile | null)[][],
  scores: Record<PlayerId, ScoreBreakdown>,
  beaconsLeft: Record<PlayerId, number>
): {
  nextBoard: (PlacedTile | null)[][];
  nextScores: Record<PlayerId, ScoreBreakdown>;
  nextBeaconsLeft: Record<PlayerId, number>;
  events: {
    kind: 'route' | 'island' | 'lighthouse';
    points: number;
    winners: PlayerId[];
    anchorR: number;
    anchorC: number;
  }[];
} {
  const nextBoard = cloneBoard(board);
  const nextScores: Record<PlayerId, ScoreBreakdown> = {
    1: { ...scores[1] },
    2: { ...scores[2] },
  };
  const nextBeaconsLeft: Record<PlayerId, number> = {
    1: beaconsLeft[1],
    2: beaconsLeft[2],
  };

  const processedNodes = new Set<string>();
  const events: {
    kind: 'route' | 'island' | 'lighthouse';
    points: number;
    winners: PlayerId[];
    anchorR: number;
    anchorC: number;
  }[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = nextBoard[r][c];
      if (!tile) continue;

      const slotsToCheck: SlotId[] = ['N', 'E', 'S', 'W', 'C'];
      for (const slot of slotsToCheck) {
        const key = nodeKey(r, c, slot);
        if (processedNodes.has(key)) continue;

        const comp = traceFeatureComponent(nextBoard, r, c, slot);
        if (!comp) continue;

        for (const n of comp.nodes) {
          processedNodes.add(nodeKey(n.r, n.c, n.slot));
        }

        if (comp.completed && comp.beacons.length > 0) {
          let p1Count = 0;
          let p2Count = 0;
          for (const b of comp.beacons) {
            if (b.player === 1) p1Count++;
            else p2Count++;
          }

          const winners: PlayerId[] = [];
          if (p1Count > p2Count) winners.push(1);
          else if (p2Count > p1Count) winners.push(2);
          else {
            winners.push(1, 2);
          }

          for (const w of winners) {
            nextScores[w][comp.kind] += comp.pointsIfCompleted;
          }

          // Return all beacons in this completed component back to their owners
          for (const b of comp.beacons) {
            const bTile = nextBoard[b.r][b.c];
            if (bTile && bTile.beacon && bTile.beacon.slot === b.slot) {
              bTile.beacon = null;
              nextBeaconsLeft[b.player] = Math.min(INITIAL_BEACONS, nextBeaconsLeft[b.player] + 1);
            }
          }

          events.push({
            kind: comp.kind,
            points: comp.pointsIfCompleted,
            winners,
            anchorR: comp.beacons[0].r,
            anchorC: comp.beacons[0].c,
          });
        }
      }
    }
  }

  return { nextBoard, nextScores, nextBeaconsLeft, events };
}

/**
 * Calculates end-of-game points for all remaining incomplete features that have beacons.
 */
function calculateEndGameIncompleteScores(
  board: (PlacedTile | null)[][]
): Record<PlayerId, number> {
  const bonus: Record<PlayerId, number> = { 1: 0, 2: 0 };
  const processedNodes = new Set<string>();

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = board[r][c];
      if (!tile) continue;

      for (const slot of ['N', 'E', 'S', 'W', 'C'] as SlotId[]) {
        const key = nodeKey(r, c, slot);
        if (processedNodes.has(key)) continue;

        const comp = traceFeatureComponent(board, r, c, slot);
        if (!comp) continue;

        for (const n of comp.nodes) {
          processedNodes.add(nodeKey(n.r, n.c, n.slot));
        }

        if (!comp.completed && comp.beacons.length > 0) {
          let p1Count = 0;
          let p2Count = 0;
          for (const b of comp.beacons) {
            if (b.player === 1) p1Count++;
            else p2Count++;
          }

          if (p1Count >= p2Count) bonus[1] += comp.pointsIfIncomplete;
          if (p2Count >= p1Count) bonus[2] += comp.pointsIfIncomplete;
        }
      }
    }
  }

  return bonus;
}

function getTotalScore(b: ScoreBreakdown): number {
  return b.route + b.island + b.lighthouse + b.incomplete;
}

// ============================================================================
// AI Move & Hint Evaluator
// ============================================================================

function chooseBestAction(
  board: (PlacedTile | null)[][],
  template: TileTemplate,
  player: PlayerId,
  scores: Record<PlayerId, ScoreBreakdown>,
  beaconsLeft: Record<PlayerId, number>,
  difficulty: Difficulty
): HintRecommendation | null {
  const opp: PlayerId = player === 1 ? 2 : 1;
  const candidates: HintRecommendation[] = [];

  for (const rotation of [0, 90, 180, 270] as Rotation[]) {
    const validCells = getValidCellsForRotation(board, template, rotation);
    const rotatedEdges = rotateEdges(template.edges, rotation);

    for (const [r, c] of validCells) {
      const simBoard = cloneBoard(board);
      simBoard[r][c] = {
        uid: 'sim',
        templateId: template.id,
        name: template.name,
        edges: rotatedEdges,
        center: template.center,
        connectRoutes: template.connectRoutes,
        connectIslands: template.connectIslands,
        rotation,
        beacon: null,
        placedBy: player,
        turnNumber: 0,
      };

      const beaconOptions =
        beaconsLeft[player] > 0 ? getBeaconOptionsForTile(simBoard, r, c) : [];

      const slotChoices: (BeaconOption | null)[] = [null, ...beaconOptions];

      for (const opt of slotChoices) {
        const branchBoard = cloneBoard(simBoard);
        const branchBeacons = { ...beaconsLeft };
        if (opt) {
          branchBoard[r][c]!.beacon = { player, slot: opt.slot };
          branchBeacons[player]--;
        }

        const resolved = resolveCompletedFeatures(branchBoard, scores, branchBeacons);
        const myGain =
          getTotalScore(resolved.nextScores[player]) - getTotalScore(scores[player]);
        const oppGain =
          getTotalScore(resolved.nextScores[opp]) - getTotalScore(scores[opp]);

        const incompleteBonus = calculateEndGameIncompleteScores(resolved.nextBoard);
        const baseIncomplete = calculateEndGameIncompleteScores(board);
        const myPotentialGain = incompleteBonus[player] - baseIncomplete[player];
        const oppPotentialGain = incompleteBonus[opp] - baseIncomplete[opp];

        // Neighbor synergy (how many adjacent tiles touch this cell)
        let neighborCount = 0;
        for (const d of [0, 1, 2, 3] as const) {
          const [dr, dc] = DIR_DELTAS[d];
          if (board[r + dr]?.[c + dc]) neighborCount++;
        }

        // Conserve last beacon unless immediate completion or high value
        const beaconPenalty =
          opt && !opt.willCompleteImmediately
            ? branchBeacons[player] === 0
              ? 3.2
              : 0.9
            : 0;

        const evalScore =
          (myGain - oppGain) * 3.0 +
          (myPotentialGain - oppPotentialGain) * 1.35 +
          neighborCount * 0.45 -
          beaconPenalty;

        let reason = `${formatCoord(r, c)}（${rotation}°回転）に配置`;
        if (myGain > 0 && opt?.willCompleteImmediately) {
          reason = `${formatCoord(r, c)}（${rotation}°）に配置し「${opt.label}」にブイを置いて即時完成（+${myGain}点＆ブイ回収）！`;
        } else if (myGain > 0) {
          reason = `${formatCoord(r, c)}（${rotation}°）で既存の海域ネットワークを完成させて+${myGain}点獲得！`;
        } else if (opt) {
          reason = `${formatCoord(r, c)}（${rotation}°）に配置し「${opt.label}」へ測量ブイを展開（見込み+${opt.estimatedPoints}点）`;
        } else {
          reason = `${formatCoord(r, c)}（${rotation}°）で海図を広げ、測量ブイを温存`;
        }

        candidates.push({
          r,
          c,
          rotation,
          beaconSlot: opt ? opt.slot : null,
          reason,
          score: evalScore,
        });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);

  if (difficulty === 'easy') {
    const pool = candidates.slice(0, Math.min(5, candidates.length));
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (difficulty === 'normal') {
    const pool = candidates.slice(0, Math.min(2, candidates.length));
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return candidates[0];
}

// ============================================================================
// Web Audio Synthesizer
// ============================================================================

function useSoundEffects(soundOn: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback((): AudioContext | null => {
    if (!soundOn || typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        ctxRef.current = new AudioCtx();
      }
    }
    if (ctxRef.current && ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, [soundOn]);

  const playRotate = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.065);
  }, [getContext]);

  const playPlaceTile = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(390, ctx.currentTime + 0.11);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.125);
  }, [getContext]);

  const playBeacon = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.11, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  }, [getContext]);

  const playCompleteBonus = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.065;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.23);
    });
  }, [getContext]);

  return { playRotate, playPlaceTile, playBeacon, playCompleteBonus };
}

// ============================================================================
// SVG Tile Renderer
// ============================================================================

interface NauticalTileSvgProps {
  edges: [EdgeTerrain, EdgeTerrain, EdgeTerrain, EdgeTerrain];
  center: CenterFeature;
  connectRoutes: boolean;
  connectIslands: boolean;
  beacon?: PlacedBeacon | null;
  interactiveSlots?: BeaconOption[];
  onSelectSlot?: (slot: SlotId) => void;
  isGhost?: boolean;
  isStartTile?: boolean;
}

const SLOT_COORDS: Record<SlotId, { x: number; y: number }> = {
  N: { x: 50, y: 18 },
  E: { x: 82, y: 50 },
  S: { x: 50, y: 82 },
  W: { x: 18, y: 50 },
  C: { x: 50, y: 50 },
};

function NauticalTileSvg({
  edges,
  center,
  connectRoutes,
  connectIslands,
  beacon,
  interactiveSlots,
  onSelectSlot,
  isGhost = false,
  isStartTile = false,
}: NauticalTileSvgProps) {
  const [n, e, s, w] = edges;

  const renderIslandElements = () => {
    const elements: React.ReactNode[] = [];

    // Connected central island mass when connectIslands is true
    if (connectIslands) {
      const polyPoints: string[] = [];
      if (n === 'island') polyPoints.push('0,0 100,0 78,42 22,42');
      if (e === 'island') polyPoints.push('100,0 100,100 58,78 58,22');
      if (s === 'island') polyPoints.push('100,100 0,100 22,58 78,58');
      if (w === 'island') polyPoints.push('0,100 0,0 42,22 42,78');

      elements.push(
        <g key="island-connected">
          {polyPoints.map((pts, i) => (
            <polygon
              key={`ipoly-${i}`}
              points={pts}
              fill="#15803d"
              stroke="#fde68a"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          ))}
          <circle
            cx="50"
            cy="50"
            r="28"
            fill="#15803d"
            stroke="#fde68a"
            strokeWidth="2.5"
          />
          <circle cx="50" cy="50" r="21" fill="#16a34a" opacity="0.85" />
        </g>
      );
    } else {
      // Individual coastal island capes on edges
      if (n === 'island') {
        elements.push(
          <path
            key="isl-n"
            d="M 0,0 L 100,0 Q 75,34 50,34 Q 25,34 0,0 Z"
            fill="#15803d"
            stroke="#fde68a"
            strokeWidth="3"
          />
        );
      }
      if (e === 'island') {
        elements.push(
          <path
            key="isl-e"
            d="M 100,0 L 100,100 Q 66,75 66,50 Q 66,25 100,0 Z"
            fill="#15803d"
            stroke="#fde68a"
            strokeWidth="3"
          />
        );
      }
      if (s === 'island') {
        elements.push(
          <path
            key="isl-s"
            d="M 0,100 L 100,100 Q 75,66 50,66 Q 25,66 0,100 Z"
            fill="#15803d"
            stroke="#fde68a"
            strokeWidth="3"
          />
        );
      }
      if (w === 'island') {
        elements.push(
          <path
            key="isl-w"
            d="M 0,0 L 0,100 Q 34,75 34,50 Q 34,25 0,0 Z"
            fill="#15803d"
            stroke="#fde68a"
            strokeWidth="3"
          />
        );
      }
    }

    return elements;
  };

  const renderRouteElements = () => {
    const routeDirs: (0 | 1 | 2 | 3)[] = [];
    if (n === 'route') routeDirs.push(0);
    if (e === 'route') routeDirs.push(1);
    if (s === 'route') routeDirs.push(2);
    if (w === 'route') routeDirs.push(3);

    if (routeDirs.length === 0) return null;

    const midpoints: Record<0 | 1 | 2 | 3, [number, number]> = {
      0: [50, 0],
      1: [100, 50],
      2: [50, 100],
      3: [0, 50],
    };

    if (connectRoutes && routeDirs.length === 2) {
      const [x1, y1] = midpoints[routeDirs[0]];
      const [x2, y2] = midpoints[routeDirs[1]];
      const pathD = `M ${x1},${y1} Q 50,50 ${x2},${y2}`;
      return (
        <g key="route-connected">
          <path
            d={pathD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="18"
            strokeLinecap="round"
            opacity="0.45"
          />
          <path
            d={pathD}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="6"
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
        </g>
      );
    }

    return (
      <g key="route-spokes">
        {routeDirs.map((d) => {
          const [x, y] = midpoints[d];
          return (
            <g key={`spoke-${d}`}>
              <line
                x1={x}
                y1={y}
                x2={50}
                y2={50}
                stroke="#38bdf8"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.45"
              />
              <line
                x1={x}
                y1={y}
                x2={50}
                y2={50}
                stroke="#fbbf24"
                strokeWidth="5.5"
                strokeDasharray="5 4"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </g>
    );
  };

  const renderCenterBadge = () => {
    if (center === 'lighthouse') {
      return (
        <g key="center-lighthouse">
          <circle cx="50" cy="50" r="18" fill="#fef3c7" opacity="0.25" />
          <circle
            cx="50"
            cy="50"
            r="12"
            fill="#78350f"
            stroke="#fde047"
            strokeWidth="2.5"
          />
          <polygon points="46,56 54,56 52,40 48,40" fill="#f8fafc" />
          <circle cx="50" cy="38" r="3.5" fill="#fde047" />
        </g>
      );
    }
    if (center === 'port') {
      return (
        <g key="center-port">
          <circle
            cx="50"
            cy="50"
            r="12"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          <text
            x="50"
            y="54"
            textAnchor="middle"
            fontSize="12"
            fontWeight="900"
            fill="#fde047"
          >
            ⚓
          </text>
        </g>
      );
    }
    if (center === 'reef_junction') {
      return (
        <g key="center-junction">
          <circle
            cx="50"
            cy="50"
            r="11"
            fill="#0284c7"
            stroke="#fde047"
            strokeWidth="2.5"
          />
          <circle cx="50" cy="50" r="4.5" fill="#fde047" />
        </g>
      );
    }
    if (isStartTile) {
      return (
        <g key="center-start">
          <circle
            cx="50"
            cy="50"
            r="9"
            fill="#0f172a"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <circle cx="50" cy="50" r="3.5" fill="#f59e0b" />
        </g>
      );
    }
    return null;
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={`h-full w-full select-none ${isGhost ? 'opacity-70' : ''}`}
    >
      {/* Deep Ocean Base */}
      <rect x="0" y="0" width="100" height="100" fill="#0c2d48" />
      {/* Subtle Nautical Grid Lines */}
      <line x1="0" y1="50" x2="100" y2="50" stroke="#38bdf8" strokeOpacity="0.12" strokeWidth="1" />
      <line x1="50" y1="0" x2="50" y2="100" stroke="#38bdf8" strokeOpacity="0.12" strokeWidth="1" />

      {/* Coral Routes & Archipelago Islands */}
      {renderRouteElements()}
      {renderIslandElements()}
      {renderCenterBadge()}

      {/* Placed Surveyor Beacon */}
      {beacon && (
        <g
          transform={`translate(${SLOT_COORDS[beacon.slot].x}, ${SLOT_COORDS[beacon.slot].y})`}
        >
          <circle
            r="12"
            fill={beacon.player === 1 ? '#f59e0b' : '#ec4899'}
            stroke="#ffffff"
            strokeWidth="2.8"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fontSize="10"
            fontWeight="900"
            fill="#0f172a"
          >
            {beacon.player === 1 ? 'P1' : 'P2'}
          </text>
        </g>
      )}

      {/* Interactive Beacon Placement Targets (Phase 2) */}
      {interactiveSlots &&
        interactiveSlots.map((opt) => {
          const pos = SLOT_COORDS[opt.slot];
          return (
            <g
              key={`opt-${opt.slot}`}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer"
              onClick={(ev) => {
                ev.stopPropagation();
                onSelectSlot?.(opt.slot);
              }}
            >
              <circle
                r="14"
                fill="#22c55e"
                fillOpacity="0.92"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fontSize="11"
                fontWeight="900"
                fill="#052e16"
              >
                +
              </text>
            </g>
          );
        })}

      {/* Tile Border */}
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        fill="none"
        stroke={isStartTile ? '#f59e0b' : '#38bdf8'}
        strokeOpacity={isStartTile ? '0.65' : '0.28'}
        strokeWidth="2"
      />
    </svg>
  );
}

// ============================================================================
// Main Game Component
// ============================================================================

export default function ArchipelagoCartographerGame() {
  const [mode, setMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [humanSide, setHumanSide] = useState<PlayerId>(1);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  const [board, setBoard] = useState<(PlacedTile | null)[][]>(() => createInitialBoard());
  const [deck, setDeck] = useState<TileTemplate[]>(() => createShuffledDeck());
  const [turn, setTurn] = useState<PlayerId>(1);
  const [phase, setPhase] = useState<TurnPhase>('place_tile');
  const [rotation, setRotation] = useState<Rotation>(0);
  const [pendingCoord, setPendingCoord] = useState<[number, number] | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<[number, number] | null>(null);

  const [scores, setScores] = useState<Record<PlayerId, ScoreBreakdown>>({
    1: { route: 0, island: 0, lighthouse: 0, incomplete: 0 },
    2: { route: 0, island: 0, lighthouse: 0, incomplete: 0 },
  });
  const [beaconsLeft, setBeaconsLeft] = useState<Record<PlayerId, number>>({
    1: INITIAL_BEACONS,
    2: INITIAL_BEACONS,
  });
  const [turnCount, setTurnCount] = useState<number>(1);
  const [moveLogs, setMoveLogs] = useState<MoveLogItem[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [hint, setHint] = useState<HintRecommendation | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const { playRotate, playPlaceTile, playBeacon, playCompleteBonus } = useSoundEffects(soundOn);

  const currentTemplate: TileTemplate | null = deck.length > 0 ? deck[0] : null;
  const isCpuTurn =
    phase !== 'game_over' && mode === 'cpu' && turn !== humanSide;

  const currentRotatedEdges = useMemo<[EdgeTerrain, EdgeTerrain, EdgeTerrain, EdgeTerrain]>(() => {
    if (!currentTemplate) return ['ocean', 'ocean', 'ocean', 'ocean'];
    return rotateEdges(currentTemplate.edges, rotation);
  }, [currentTemplate, rotation]);

  const validCells = useMemo<[number, number][]>(() => {
    if (!currentTemplate || phase !== 'place_tile') return [];
    return getValidCellsForRotation(board, currentTemplate, rotation);
  }, [board, currentTemplate, phase, rotation]);

  const validCellSet = useMemo(() => {
    const s = new Set<string>();
    for (const [r, c] of validCells) s.add(`${r},${c}`);
    return s;
  }, [validCells]);

  const pendingBeaconOptions = useMemo<BeaconOption[]>(() => {
    if (phase !== 'place_beacon' || !pendingCoord) return [];
    const [pr, pc] = pendingCoord;
    return getBeaconOptionsForTile(board, pr, pc);
  }, [board, phase, pendingCoord]);

  // Ensure the top tile of the deck has at least 1 valid placement on the board
  useEffect(() => {
    if (phase !== 'place_tile' || deck.length === 0) return;
    if (hasAnyValidPlacement(board, deck[0])) return;

    const playableIdx = deck.findIndex((tpl) => hasAnyValidPlacement(board, tpl));
    if (playableIdx > 0) {
      setDeck((prev) => {
        const next = [...prev];
        const [playable] = next.splice(playableIdx, 1);
        return [playable, ...next];
      });
      setStatusBanner('配置不能な海図タイルを山札の下へ送り、配置可能なタイルを引き直しました。');
    } else if (playableIdx === -1) {
      // No remaining tile in deck can be placed anywhere -> finalize game
      const endBonuses = calculateEndGameIncompleteScores(board);
      setScores((prev) => ({
        1: { ...prev[1], incomplete: endBonuses[1] },
        2: { ...prev[2], incomplete: endBonuses[2] },
      }));
      setPhase('game_over');
    }
  }, [board, deck, phase]);

  const startNewGame = useCallback(
    (nextMode = mode, nextDiff = difficulty, nextHuman = humanSide) => {
      setMode(nextMode);
      setDifficulty(nextDiff);
      setHumanSide(nextHuman);
      setBoard(createInitialBoard());
      setDeck(createShuffledDeck());
      setTurn(1);
      setPhase('place_tile');
      setRotation(0);
      setPendingCoord(null);
      setHoveredCoord(null);
      setScores({
        1: { route: 0, island: 0, lighthouse: 0, incomplete: 0 },
        2: { route: 0, island: 0, lighthouse: 0, incomplete: 0 },
      });
      setBeaconsLeft({ 1: INITIAL_BEACONS, 2: INITIAL_BEACONS });
      setTurnCount(1);
      setMoveLogs([]);
      setPopups([]);
      setHint(null);
      setStatusBanner(null);
    },
    [difficulty, humanSide, mode]
  );

  /**
   * Commits the end of a turn (after beacon placement or skip), resolves completed features,
   * updates scores & move log, and advances to next tile or ends the game.
   */
  const finalizeTurnWithBeacon = useCallback(
    (
      workingBoard: (PlacedTile | null)[][],
      placedR: number,
      placedC: number,
      chosenSlot: SlotId | null,
      chosenLabel: string | null
    ) => {
      const nextBoard = cloneBoard(workingBoard);
      const nextBeacons = { ...beaconsLeft };
      const placedTile = nextBoard[placedR][placedC];
      if (!placedTile) return;

      if (chosenSlot && nextBeacons[turn] > 0) {
        placedTile.beacon = { player: turn, slot: chosenSlot };
        nextBeacons[turn] -= 1;
        playBeacon();
      }

      const resolved = resolveCompletedFeatures(nextBoard, scores, nextBeacons);
      if (resolved.events.length > 0) {
        playCompleteBonus();
        const newPopups: ScorePopup[] = resolved.events.map((ev, idx) => {
          const kindLabel =
            ev.kind === 'route'
              ? '珊瑚航路完成'
              : ev.kind === 'island'
              ? '群島開拓完成'
              : '古代灯台完成';
          return {
            id: `pop-${Date.now()}-${idx}`,
            r: ev.anchorR,
            c: ev.anchorC,
            text: `${kindLabel} +${ev.points}点（ブイ帰還）`,
            player: ev.winners.length === 2 ? 'both' : ev.winners[0],
          };
        });
        setPopups((prev) => [...prev, ...newPopups]);
        setTimeout(() => {
          setPopups((prev) => prev.filter((p) => !newPopups.some((np) => np.id === p.id)));
        }, 2600);
      }

      const scoredSummary =
        resolved.events.length > 0
          ? resolved.events
              .map((ev) => {
                const kName =
                  ev.kind === 'route' ? '航路' : ev.kind === 'island' ? '群島' : '灯台';
                const wName =
                  ev.winners.length === 2
                    ? '双方'
                    : ev.winners[0] === 1
                    ? 'P1'
                    : 'P2';
                return `${kName}完成(${wName} +${ev.points}点)`;
              })
              .join(' / ')
          : null;

      const remainingDeck = deck.slice(1);
      const isLastTile = remainingDeck.length === 0;

      const finalScores = {
        1: { ...resolved.nextScores[1] },
        2: { ...resolved.nextScores[2] },
      };

      if (isLastTile) {
        const endIncomplete = calculateEndGameIncompleteScores(resolved.nextBoard);
        finalScores[1].incomplete = endIncomplete[1];
        finalScores[2].incomplete = endIncomplete[2];
      }

      setBoard(resolved.nextBoard);
      setScores(finalScores);
      setBeaconsLeft(resolved.nextBeaconsLeft);
      setDeck(remainingDeck);
      setPendingCoord(null);
      setRotation(0);
      setHint(null);
      setStatusBanner(null);

      setMoveLogs((prev) => [
        {
          id: `log-${turnCount}-${Date.now()}`,
          turn: turnCount,
          player: turn,
          coord: formatCoord(placedR, placedC),
          tileName: placedTile.name,
          beaconText: chosenLabel ? `ブイ配置: ${chosenLabel}` : 'ブイ温存',
          scoredText: scoredSummary,
        },
        ...prev.slice(0, 29),
      ]);

      if (isLastTile) {
        setPhase('game_over');
      } else {
        setTurn(turn === 1 ? 2 : 1);
        setTurnCount((c) => c + 1);
        setPhase('place_tile');
      }
    },
    [beaconsLeft, deck, playBeacon, playCompleteBonus, scores, turn, turnCount]
  );

  /**
   * Handles clicking a valid grid cell during Phase 1 (`place_tile`).
   */
  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (phase !== 'place_tile' || isCpuTurn || !currentTemplate) return;
      if (!canPlaceTileAt(board, r, c, currentRotatedEdges)) return;

      playPlaceTile();
      const nextBoard = cloneBoard(board);
      nextBoard[r][c] = {
        uid: `tile-${turnCount}-${r}-${c}`,
        templateId: currentTemplate.id,
        name: currentTemplate.name,
        edges: currentRotatedEdges,
        center: currentTemplate.center,
        connectRoutes: currentTemplate.connectRoutes,
        connectIslands: currentTemplate.connectIslands,
        rotation,
        beacon: null,
        placedBy: turn,
        turnNumber: turnCount,
      };

      const options =
        beaconsLeft[turn] > 0 ? getBeaconOptionsForTile(nextBoard, r, c) : [];

      if (options.length === 0) {
        // Either player has 0 beacons left or all features on this tile already have beacons
        finalizeTurnWithBeacon(nextBoard, r, c, null, null);
      } else {
        setBoard(nextBoard);
        setPendingCoord([r, c]);
        setPhase('place_beacon');
      }
    },
    [
      beaconsLeft,
      board,
      currentRotatedEdges,
      currentTemplate,
      finalizeTurnWithBeacon,
      isCpuTurn,
      phase,
      playPlaceTile,
      rotation,
      turn,
      turnCount,
    ]
  );

  /**
   * CPU Turn Execution
   */
  useEffect(() => {
    if (!isCpuTurn || !currentTemplate || phase !== 'place_tile') return;

    const timer = setTimeout(() => {
      const choice = chooseBestAction(
        board,
        currentTemplate,
        turn,
        scores,
        beaconsLeft,
        difficulty
      );
      if (!choice) return;

      playPlaceTile();
      const rotatedEdges = rotateEdges(currentTemplate.edges, choice.rotation);
      const nextBoard = cloneBoard(board);
      nextBoard[choice.r][choice.c] = {
        uid: `tile-${turnCount}-${choice.r}-${choice.c}`,
        templateId: currentTemplate.id,
        name: currentTemplate.name,
        edges: rotatedEdges,
        center: currentTemplate.center,
        connectRoutes: currentTemplate.connectRoutes,
        connectIslands: currentTemplate.connectIslands,
        rotation: choice.rotation,
        beacon: null,
        placedBy: turn,
        turnNumber: turnCount,
      };

      const opts = getBeaconOptionsForTile(nextBoard, choice.r, choice.c);
      const matchedOpt = choice.beaconSlot
        ? opts.find((o) => o.slot === choice.beaconSlot) ?? null
        : null;

      finalizeTurnWithBeacon(
        nextBoard,
        choice.r,
        choice.c,
        matchedOpt ? matchedOpt.slot : null,
        matchedOpt ? matchedOpt.label : null
      );
    }, 520);

    return () => clearTimeout(timer);
  }, [
    beaconsLeft,
    board,
    currentTemplate,
    difficulty,
    finalizeTurnWithBeacon,
    isCpuTurn,
    phase,
    playPlaceTile,
    scores,
    turn,
    turnCount,
  ]);

  const handleRequestHint = useCallback(() => {
    if (!currentTemplate || phase !== 'place_tile' || isCpuTurn) return;
    const rec = chooseBestAction(board, currentTemplate, turn, scores, beaconsLeft, 'hard');
    if (rec) {
      setRotation(rec.rotation);
      setHint(rec);
    }
  }, [beaconsLeft, board, currentTemplate, isCpuTurn, phase, scores, turn]);

  // Keyboard shortcut: R or Space to rotate tile
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'place_tile' || isCpuTurn) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        playRotate();
        setRotation((prev) => (((prev + 90) % 360) as Rotation));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCpuTurn, phase, playRotate]);

  const p1Total = getTotalScore(scores[1]);
  const p2Total = getTotalScore(scores[2]);

  const winnerBanner = useMemo(() => {
    if (phase !== 'game_over') return null;
    if (p1Total > p2Total) {
      return mode === 'cpu'
        ? humanSide === 1
          ? `あなたの勝利！（${p1Total} 対 ${p2Total}）`
          : `CPUの勝利（${p2Total} 対 ${p1Total}）`
        : `プレイヤー1（琥珀船団）の勝利！（${p1Total} 対 ${p2Total}）`;
    }
    if (p2Total > p1Total) {
      return mode === 'cpu'
        ? humanSide === 2
          ? `あなたの勝利！（${p2Total} 対 ${p1Total}）`
          : `CPUの勝利（${p2Total} 対 ${p1Total}）`
        : `プレイヤー2（珊瑚船団）の勝利！（${p2Total} 対 ${p1Total}）`;
    }
    return `引き分け！（${p1Total} 対 ${p2Total}）`;
  }, [humanSide, mode, p1Total, p2Total, phase]);

  return (
    <div className="min-h-screen bg-[#06101e] text-slate-100 select-none">
      {/* Top Header */}
      <header className="border-b border-sky-500/20 bg-[#081526]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/games"
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:border-sky-400/50 hover:text-sky-200"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-sky-400">
                NAUTICAL TILE PLACEMENT / 9×9 ARCHIPELAGO CHART
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                群島開拓記（Archipelago Cartographer）
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:border-sky-400/50"
            >
              {soundOn ? '🔊 効果音 ON' : '🔇 効果音 OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left Column: Scoreboard & 9x9 Ocean Map Grid */}
        <div className="flex flex-col gap-3">
          {/* Score & Beacon Supply Bar */}
          <div className="rounded-2xl border border-sky-500/20 bg-[#0a192f]/90 p-3 shadow-lg">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:items-center">
              {/* Player 1 Card */}
              <div
                className={`rounded-xl border p-2.5 transition ${
                  turn === 1 && phase !== 'game_over'
                    ? 'border-amber-400/70 bg-amber-500/10'
                    : 'border-white/10 bg-black/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                    <span className="inline-block h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white/60" />
                    琥珀船団（先手・{mode === 'cpu' ? (humanSide === 1 ? 'あなた' : 'CPU') : 'P1'}）
                  </span>
                  <span className="font-mono text-xl font-black text-white">{p1Total} 点</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-300">
                  <span>
                    航路:{scores[1].route} / 群島:{scores[1].island} / 灯台:{scores[1].lighthouse}
                    {scores[1].incomplete > 0 ? ` / 未完:${scores[1].incomplete}` : ''}
                  </span>
                  <span className="font-bold text-amber-200">
                    残りブイ: {'●'.repeat(beaconsLeft[1])}
                    {'○'.repeat(INITIAL_BEACONS - beaconsLeft[1])} ({beaconsLeft[1]})
                  </span>
                </div>
              </div>

              {/* Center Status Pill */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-sky-400/25 bg-sky-950/40 px-3 py-2 text-center">
                <span className="text-[11px] font-bold text-sky-300">
                  残り海図タイル: <strong className="font-mono text-sm text-white">{deck.length}</strong> / 28枚
                </span>
                {phase === 'game_over' ? (
                  <span className="mt-0.5 text-xs font-black text-amber-300">{winnerBanner}</span>
                ) : isCpuTurn ? (
                  <span className="mt-0.5 text-xs font-black text-sky-200">
                    CPUが海図を測量中...
                  </span>
                ) : phase === 'place_beacon' ? (
                  <span className="mt-0.5 text-xs font-black text-emerald-300">
                    手順2：測量ブイを配置するか温存を選択
                  </span>
                ) : (
                  <span className="mt-0.5 text-xs font-black text-sky-100">
                    手順1：タイルを回転して緑枠の海域へ配置（候補 {validCells.length} 箇所）
                  </span>
                )}
              </div>

              {/* Player 2 Card */}
              <div
                className={`rounded-xl border p-2.5 transition ${
                  turn === 2 && phase !== 'game_over'
                    ? 'border-pink-400/70 bg-pink-500/10'
                    : 'border-white/10 bg-black/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black text-pink-300">
                    <span className="inline-block h-3 w-3 rounded-full bg-pink-500 ring-2 ring-white/60" />
                    珊瑚船団（後手・{mode === 'cpu' ? (humanSide === 2 ? 'あなた' : 'CPU') : 'P2'}）
                  </span>
                  <span className="font-mono text-xl font-black text-white">{p2Total} 点</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-300">
                  <span>
                    航路:{scores[2].route} / 群島:{scores[2].island} / 灯台:{scores[2].lighthouse}
                    {scores[2].incomplete > 0 ? ` / 未完:${scores[2].incomplete}` : ''}
                  </span>
                  <span className="font-bold text-pink-200">
                    残りブイ: {'●'.repeat(beaconsLeft[2])}
                    {'○'.repeat(INITIAL_BEACONS - beaconsLeft[2])} ({beaconsLeft[2]})
                  </span>
                </div>
              </div>
            </div>

            {statusBanner && (
              <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-center text-xs font-bold text-amber-200">
                {statusBanner}
              </div>
            )}
          </div>

          {/* Phase 2 Beacon Action Banner (shown right above the board when placing a beacon) */}
          {phase === 'place_beacon' && pendingCoord && (
            <div className="rounded-2xl border border-emerald-400/50 bg-emerald-950/60 p-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-emerald-300">
                    📍 測量ブイ（開拓コマ）配置フェーズ — {formatCoord(pendingCoord[0], pendingCoord[1])}
                  </p>
                  <p className="text-[11px] text-slate-200">
                    配置したタイル上の未占有エリアにブイを1個置くか、置かずにブイを温存できます。
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pendingBeaconOptions.map((opt) => (
                    <button
                      key={opt.slot}
                      type="button"
                      onClick={() =>
                        finalizeTurnWithBeacon(
                          board,
                          pendingCoord[0],
                          pendingCoord[1],
                          opt.slot,
                          opt.label
                        )
                      }
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow transition hover:bg-emerald-400"
                    >
                      {opt.label}に配置
                      {opt.willCompleteImmediately
                        ? `（即時完成 +${opt.estimatedPoints}点！）`
                        : `（見込み${opt.estimatedPoints}点）`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      finalizeTurnWithBeacon(board, pendingCoord[0], pendingCoord[1], null, null)
                    }
                    className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
                  >
                    ブイを置かずに確定（温存）
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 9x9 Ocean Map Grid */}
          <div className="relative overflow-hidden rounded-2xl border border-sky-500/25 bg-[#071527] p-2 sm:p-3.5 shadow-2xl">
            {/* Column Headers (A - I) */}
            <div className="mb-1 grid grid-cols-[22px_repeat(9,minmax(0,1fr))] gap-1 text-center text-[10px] font-bold text-sky-300/70">
              <span />
              {COL_LABELS.map((col) => (
                <span key={col}>{col}</span>
              ))}
            </div>

            <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-1">
              {/* Row Headers (1 - 9) */}
              <div className="grid grid-rows-9 gap-1 text-center text-[10px] font-bold text-sky-300/70">
                {ROW_LABELS.map((row) => (
                  <span key={row} className="flex items-center justify-center">
                    {row}
                  </span>
                ))}
              </div>

              {/* 9x9 Cells */}
              <div className="grid aspect-square w-full grid-cols-9 grid-rows-9 gap-1 rounded-xl border border-sky-500/20 bg-[#040d1a] p-1">
                {board.map((row, r) =>
                  row.map((cell, c) => {
                    const isValid = phase === 'place_tile' && !isCpuTurn && validCellSet.has(`${r},${c}`);
                    const isPending =
                      phase === 'place_beacon' &&
                      pendingCoord !== null &&
                      pendingCoord[0] === r &&
                      pendingCoord[1] === c;
                    const isHintCell =
                      hint !== null && hint.r === r && hint.c === c && phase === 'place_tile';
                    const isHovered =
                      hoveredCoord !== null && hoveredCoord[0] === r && hoveredCoord[1] === c;

                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => {
                          if (isValid) handleCellClick(r, c);
                        }}
                        onMouseEnter={() => setHoveredCoord([r, c])}
                        onMouseLeave={() => setHoveredCoord(null)}
                        className={`relative aspect-square overflow-hidden rounded-md transition ${
                          cell
                            ? isPending
                              ? 'ring-2 ring-emerald-400 shadow-lg'
                              : 'border border-sky-500/20'
                            : isValid
                            ? isHintCell
                              ? 'cursor-pointer border-2 border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(251,191,36,0.45)]'
                              : 'cursor-pointer border-2 border-emerald-400/75 bg-emerald-500/15 hover:bg-emerald-500/30'
                            : 'border border-white/[0.05] bg-[#061224]/70'
                        }`}
                      >
                        {cell ? (
                          <NauticalTileSvg
                            edges={cell.edges}
                            center={cell.center}
                            connectRoutes={cell.connectRoutes}
                            connectIslands={cell.connectIslands}
                            beacon={cell.beacon}
                            interactiveSlots={isPending ? pendingBeaconOptions : undefined}
                            onSelectSlot={
                              isPending
                                ? (slot) => {
                                    const opt = pendingBeaconOptions.find((o) => o.slot === slot);
                                    finalizeTurnWithBeacon(
                                      board,
                                      r,
                                      c,
                                      slot,
                                      opt ? opt.label : null
                                    );
                                  }
                                : undefined
                            }
                            isStartTile={r === CENTER_R && c === CENTER_C}
                          />
                        ) : isValid && currentTemplate && (isHovered || isHintCell) ? (
                          <NauticalTileSvg
                            edges={currentRotatedEdges}
                            center={currentTemplate.center}
                            connectRoutes={currentTemplate.connectRoutes}
                            connectIslands={currentTemplate.connectIslands}
                            isGhost
                          />
                        ) : isValid ? (
                          <div className="flex h-full w-full flex-col items-center justify-center">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="mt-0.5 text-[9px] font-bold text-emerald-200/80">
                              {formatCoord(r, c)}
                            </span>
                          </div>
                        ) : null}

                        {/* Coordinate Watermark on Placed Tiles */}
                        {cell && (
                          <span className="pointer-events-none absolute bottom-0.5 right-1 text-[8px] font-bold text-white/55 drop-shadow">
                            {formatCoord(r, c)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Floating Score Completion Popups */}
            {popups.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-4 flex flex-col items-center gap-1.5">
                {popups.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-full border border-amber-300 bg-slate-950/90 px-4 py-1.5 text-xs font-black text-amber-300 shadow-xl"
                  >
                    🎉 {formatCoord(p.r, p.c)}: {p.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Current Tile Controller, Rules & Move Log */}
        <div className="flex flex-col gap-3">
          {/* Current Nautical Tile & Rotation Box */}
          <div className="rounded-2xl border border-sky-500/25 bg-[#0a192f]/90 p-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-wider text-sky-300">
                🧭 現在の海域タイル（山札残り {deck.length} 枚）
              </h3>
              <span className="rounded-md bg-sky-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-200">
                回転角: {rotation}°
              </span>
            </div>

            {currentTemplate && phase !== 'game_over' ? (
              <div className="mt-3 flex items-center gap-3.5">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-sky-400/50 bg-[#061325] shadow-inner">
                  <NauticalTileSvg
                    edges={currentRotatedEdges}
                    center={currentTemplate.center}
                    connectRoutes={currentTemplate.connectRoutes}
                    connectIslands={currentTemplate.connectIslands}
                  />
                </div>

                <div className="flex flex-1 flex-col gap-1.5">
                  <p className="text-sm font-black text-white">{currentTemplate.name}</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                    <span>北: {terrainLabel(currentRotatedEdges[0])}</span>
                    <span>東: {terrainLabel(currentRotatedEdges[1])}</span>
                    <span>南: {terrainLabel(currentRotatedEdges[2])}</span>
                    <span>西: {terrainLabel(currentRotatedEdges[3])}</span>
                  </div>
                  {currentTemplate.center !== 'none' && (
                    <span className="inline-block w-fit rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      中央特性:{' '}
                      {currentTemplate.center === 'lighthouse'
                        ? '古代灯台（周囲8マス完成で最大11点）'
                        : currentTemplate.center === 'port'
                        ? '交易港（完成群島+2点）'
                        : '潮流分岐点（航路の終端）'}
                    </span>
                  )}

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={phase !== 'place_tile' || isCpuTurn}
                      onClick={() => {
                        playRotate();
                        setRotation((prev) => (((prev + 90) % 360) as Rotation));
                      }}
                      className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-sky-400 disabled:opacity-40"
                    >
                      ↻ 90°回転（Rキー）
                    </button>
                    <button
                      type="button"
                      disabled={phase !== 'place_tile' || isCpuTurn}
                      onClick={handleRequestHint}
                      className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-40"
                    >
                      💡 AIヒント
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-center">
                <p className="text-sm font-black text-amber-200">{winnerBanner}</p>
                <p className="mt-1 text-xs text-slate-300">
                  全28枚の海域タイル開拓が完了し、未完成エリアのボーナス集計が行われました。
                </p>
              </div>
            )}

            {hint && phase === 'place_tile' && (
              <div className="mt-2.5 rounded-xl border border-amber-400/40 bg-amber-500/15 p-2.5 text-xs text-amber-100">
                <p className="font-black text-amber-300">💡 航海士AIの推奨手:</p>
                <p className="mt-0.5">{hint.reason}</p>
              </div>
            )}
          </div>

          {/* Mode & Difficulty Settings */}
          <div className="rounded-2xl border border-sky-500/20 bg-[#0a192f]/90 p-3.5 shadow-lg">
            <h3 className="text-xs font-black tracking-wider text-sky-300">⚙️ 対戦モード・設定</h3>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => startNewGame('cpu', difficulty, humanSide)}
                className={`rounded-lg py-1.5 text-xs font-black transition ${
                  mode === 'cpu'
                    ? 'bg-sky-500 text-slate-950'
                    : 'border border-white/15 bg-white/[0.04] text-slate-300 hover:text-white'
                }`}
              >
                🤖 CPU対戦
              </button>
              <button
                type="button"
                onClick={() => startNewGame('pvp', difficulty, humanSide)}
                className={`rounded-lg py-1.5 text-xs font-black transition ${
                  mode === 'pvp'
                    ? 'bg-sky-500 text-slate-950'
                    : 'border border-white/15 bg-white/[0.04] text-slate-300 hover:text-white'
                }`}
              >
                👥 1台で2人対戦
              </button>
            </div>

            {mode === 'cpu' && (
              <div className="mt-2.5 space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['easy', '初級 AI'],
                      ['normal', '中級 AI'],
                      ['hard', '上級 AI'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => startNewGame('cpu', key, humanSide)}
                      className={`rounded-lg py-1 text-xs font-bold transition ${
                        difficulty === key
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'border border-white/15 bg-white/[0.04] text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => startNewGame('cpu', difficulty, 1)}
                    className={`rounded-lg py-1 text-xs font-bold transition ${
                      humanSide === 1
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'border border-white/15 bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    先手（琥珀船団）で開始
                  </button>
                  <button
                    type="button"
                    onClick={() => startNewGame('cpu', difficulty, 2)}
                    className={`rounded-lg py-1 text-xs font-bold transition ${
                      humanSide === 2
                        ? 'bg-pink-400 text-slate-950 font-black'
                        : 'border border-white/15 bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    後手（珊瑚船団）で開始
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => startNewGame(mode, difficulty, humanSide)}
              className="mt-2.5 w-full rounded-lg border border-sky-400/40 bg-sky-500/15 py-1.5 text-xs font-black text-sky-200 transition hover:bg-sky-500/25"
            >
              🔄 新しい海図で最初から対局
            </button>
          </div>

          {/* Scoring Reference Card */}
          <div className="rounded-2xl border border-sky-500/20 bg-[#0a192f]/90 p-3.5 text-xs shadow-lg">
            <h3 className="font-black tracking-wider text-sky-300">
              📐 得点と測量ブイ回収ルール
            </h3>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-300">
              <li>
                <strong className="text-sky-200">1. 辺の一致配置:</strong> 上下左右に隣接するタイルの辺（
                <span className="text-amber-300">珊瑚航路</span> /{' '}
                <span className="text-emerald-300">群島陸地</span> /{' '}
                <span className="text-sky-300">外洋</span>）がすべて一致するマスにのみ配置できます。
              </li>
              <li>
                <strong className="text-emerald-300">2. 測量ブイ（各5個）:</strong>{' '}
                配置したタイルの未占有エリアにブイを1個置けます。エリアが完成すると即座に得点し、
                <strong className="text-amber-200">ブイが手元に戻ります</strong>。
              </li>
              <li>
                <strong className="text-amber-300">3. 完成ボーナス:</strong>
                <div className="mt-0.5 grid grid-cols-1 gap-0.5 pl-2 text-[10.5px]">
                  <span>・珊瑚航路（両端閉鎖・環状）: 1タイル2点（未完1点）</span>
                  <span>・群島陸地（全周閉鎖）: 1タイル3点＋交易港⚓2点（未完1点）</span>
                  <span>・古代灯台（周囲3×3マス完成）: 最大11点（未完は周囲枚数×1点）</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Move Log */}
          <div className="rounded-2xl border border-sky-500/20 bg-[#0a192f]/90 p-3.5 shadow-lg">
            <h3 className="text-xs font-black tracking-wider text-sky-300">📜 航海測量ログ</h3>
            <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1 text-[11px]">
              {moveLogs.length === 0 ? (
                <p className="text-slate-400">
                  中央E5の「王立基準港」に隣接する緑枠マスをタップして最初の海域タイルを配置しましょう。
                </p>
              ) : (
                moveLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-black ${
                          log.player === 1 ? 'text-amber-300' : 'text-pink-300'
                        }`}
                      >
                        #{log.turn} {log.player === 1 ? '琥珀船団(P1)' : '珊瑚船団(P2)'} → {log.coord}
                      </span>
                      <span className="text-[10px] text-slate-400">{log.tileName}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1 text-[10.5px] text-slate-300">
                      <span>{log.beaconText}</span>
                      {log.scoredText && (
                        <span className="font-bold text-emerald-300">★ {log.scoredText}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
