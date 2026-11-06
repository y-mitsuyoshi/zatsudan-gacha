'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

type DewType = 'sun' | 'rain' | 'star' | 'leaf';
type HabitatType = 'forest' | 'waterside' | 'sky';
type GameMode = 'cpu2' | 'cpu3' | 'cpu4' | 'pvp2' | 'solo';
type AiProfile = 'chain' | 'giant' | 'goal';
type TriggerKind = 'plant' | 'chain' | 'end';
type EffectKind =
  | 'gain_sun'
  | 'gain_rain'
  | 'gain_star'
  | 'gain_leaf'
  | 'gain_any2'
  | 'seed_self'
  | 'seed_any2'
  | 'draw1'
  | 'draw2'
  | 'compost_hand'
  | 'compost_deck2'
  | 'end_per_forest'
  | 'end_per_waterside'
  | 'end_per_sky'
  | 'end_full_seeds';

interface FloraCardDef {
  id: string;
  name: string;
  subtitle: string;
  habitats: HabitatType[];
  cost: Partial<Record<DewType, number>>;
  points: number;
  seedCap: number;
  iconType: 'lotus' | 'fern' | 'tree' | 'crystal' | 'vine' | 'bloom';
  trigger: TriggerKind;
  effect: EffectKind;
  abilityDesc: string;
}

interface PlantedFlora {
  uid: string;
  card: FloraCardDef;
  seeds: number;
  compost: number;
}

interface PlayerState {
  id: string;
  name: string;
  isAi: boolean;
  aiProfile?: AiProfile;
  color: string;
  dew: Record<DewType, number>;
  hand: FloraCardDef[];
  board: Record<HabitatType, (PlantedFlora | null)[]>;
  seasonScore: number;
}

interface SeasonGoal {
  id: string;
  title: string;
  desc: string;
  evaluate: (p: PlayerState) => number;
}

interface GameSnapshot {
  seasonIndex: number;
  turnsRemaining: number[];
  activePlayerIndex: number;
  players: PlayerState[];
  tray: FloraCardDef[];
  deck: FloraCardDef[];
  seasonGoals: SeasonGoal[];
  logs: string[];
  finished: boolean;
}

const DEW_META: Record<DewType, { label: string; emoji: string; badge: string }> = {
  sun: { label: '太陽雫', emoji: '☀️', badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40' },
  rain: { label: '雨露', emoji: '💧', badge: 'bg-sky-500/20 text-sky-200 border-sky-400/40' },
  star: { label: '星砂', emoji: '✨', badge: 'bg-purple-500/20 text-purple-200 border-purple-400/40' },
  leaf: { label: '翠葉', emoji: '🌿', badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' },
};

const HABITAT_META: Record<
  HabitatType,
  {
    name: string;
    actionName: string;
    sub: string;
    theme: string;
    headerBg: string;
    baseRewards: string[];
  }
> = {
  forest: {
    name: '森林ビオトープ',
    actionName: '森林を稼働（霊水獲得＋右→左連鎖）',
    sub: '霊水を生み出す樹冠層',
    theme: 'border-emerald-500/40 bg-emerald-950/35',
    headerBg: 'from-emerald-900/80 to-teal-950/80',
    baseRewards: ['霊水+1', '霊水+1', '霊水+2', '霊水+2', '霊水+3', '霊水+3'],
  },
  waterside: {
    name: '水辺ビオトープ',
    actionName: '水辺を稼働（種子育成＋右→左連鎖）',
    sub: '生命の種子（各1点＆植栽コスト）を宿す泉層',
    theme: 'border-cyan-500/40 bg-cyan-950/35',
    headerBg: 'from-cyan-900/80 to-sky-950/80',
    baseRewards: ['種子+1', '種子+2', '種子+2', '種子+3', '種子+3', '種子+4'],
  },
  sky: {
    name: '天空ビオトープ',
    actionName: '天空を稼働（植物探査＋右→左連鎖）',
    sub: '浮遊温室から新種カードを引き寄せる雲海層',
    theme: 'border-indigo-500/40 bg-indigo-950/35',
    headerBg: 'from-indigo-900/80 to-purple-950/80',
    baseRewards: ['探査1枚', '探査1枚+雫1', '探査2枚', '探査2枚+雫1', '探査3枚', '探査3枚+雫1'],
  },
};

const COLUMN_SEED_COST = [0, 1, 1, 2, 2];
const SEASON_NAMES = ['第1季節：春風季 (8手)', '第2季節：夏陽季 (7手)', '第3季節：秋月季 (6手)', '第4季節：冬星季 (5手)'];
const SEASON_TURNS = [8, 7, 6, 5];

const FLORA_CATALOG: FloraCardDef[] = [
  { id: 'f1', name: '陽だまりの若葉樹', subtitle: 'Sunleaf Sapling', habitats: ['forest'], cost: { leaf: 1 }, points: 2, seedCap: 3, iconType: 'tree', trigger: 'chain', effect: 'gain_sun', abilityDesc: '[連鎖時] ☀️太陽雫を1個得る' },
  { id: 'f2', name: '霧紡ぎのシダ', subtitle: 'Mistweaver Fern', habitats: ['forest', 'waterside'], cost: { rain: 1 }, points: 2, seedCap: 3, iconType: 'fern', trigger: 'chain', effect: 'gain_rain', abilityDesc: '[連鎖時] 💧雨露を1個得る' },
  { id: 'f3', name: '翠玉の苔むす古木', subtitle: 'Jade Moss Elder', habitats: ['forest'], cost: { leaf: 1, rain: 1 }, points: 4, seedCap: 4, iconType: 'tree', trigger: 'chain', effect: 'gain_leaf', abilityDesc: '[連鎖時] 🌿翠葉を1個得る' },
  { id: 'f4', name: '星喰みの夜光蔓', subtitle: 'Starlight Vine', habitats: ['forest', 'sky'], cost: { sun: 1, star: 1 }, points: 4, seedCap: 3, iconType: 'vine', trigger: 'chain', effect: 'gain_star', abilityDesc: '[連鎖時] ✨星砂を1個得る' },
  { id: 'f5', name: '黄金蜜のアンバー樹', subtitle: 'Amber Nectar Tree', habitats: ['forest'], cost: { sun: 2, leaf: 1 }, points: 6, seedCap: 4, iconType: 'tree', trigger: 'plant', effect: 'gain_any2', abilityDesc: '[植栽時] ☀️太陽雫1＋🌿翠葉1を得る' },
  { id: 'f6', name: '腐葉の錬金茸', subtitle: 'Alchemy Mycelium', habitats: ['forest'], cost: { rain: 1, leaf: 1 }, points: 3, seedCap: 3, iconType: 'crystal', trigger: 'chain', effect: 'compost_deck2', abilityDesc: '[連鎖時] 山札から2枚をこの植物の堆肥(+2点)にする' },
  { id: 'f7', name: '千年樹冠のユグドラ', subtitle: 'Canopy Monarch', habitats: ['forest'], cost: { sun: 1, rain: 1, leaf: 2 }, points: 8, seedCap: 5, iconType: 'tree', trigger: 'end', effect: 'end_per_forest', abilityDesc: '[終了時] 森林ビオトープの植物1枚につき+1点' },
  { id: 'f8', name: '木漏れ日の妖精蘭', subtitle: 'Sunbeam Orchid', habitats: ['forest', 'waterside'], cost: { sun: 1 }, points: 3, seedCap: 2, iconType: 'bloom', trigger: 'plant', effect: 'draw1', abilityDesc: '[植栽時] カードを1枚引く' },
  { id: 'w1', name: '瑠璃色の睡蓮', subtitle: 'Azure Waterlily', habitats: ['waterside'], cost: { rain: 1 }, points: 2, seedCap: 4, iconType: 'lotus', trigger: 'chain', effect: 'seed_self', abilityDesc: '[連鎖時] この植物に生命の種子を1個置く(+1点)' },
  { id: 'w2', name: '湧水のガラス藻', subtitle: 'Crystal Spring Kelp', habitats: ['waterside'], cost: { rain: 1, leaf: 1 }, points: 3, seedCap: 5, iconType: 'fern', trigger: 'chain', effect: 'seed_any2', abilityDesc: '[連鎖時] 空きのある植物に種子を最大2個置く' },
  { id: 'w3', name: '月影の白鷺草', subtitle: 'Moonlit Egret Grass', habitats: ['waterside', 'sky'], cost: { rain: 1, star: 1 }, points: 4, seedCap: 4, iconType: 'bloom', trigger: 'chain', effect: 'compost_hand', abilityDesc: '[連鎖時] 手札1枚を堆肥(+1点)にしカード1枚引く' },
  { id: 'w4', name: '虹彩のサンゴ蓮', subtitle: 'Prism Coral Lotus', habitats: ['waterside'], cost: { sun: 1, rain: 2 }, points: 6, seedCap: 5, iconType: 'lotus', trigger: 'chain', effect: 'gain_rain', abilityDesc: '[連鎖時] 💧雨露1個と種子1個を得る' },
  { id: 'w5', name: '深淵の真珠貝草', subtitle: 'Abyssal Pearlwort', habitats: ['waterside'], cost: { rain: 2, star: 1 }, points: 5, seedCap: 6, iconType: 'crystal', trigger: 'plant', effect: 'seed_any2', abilityDesc: '[植栽時] 種子を2個配置し💧雨露1を得る' },
  { id: 'w6', name: '清流の歌姫葦', subtitle: 'Siren Reed', habitats: ['waterside', 'forest'], cost: { leaf: 1 }, points: 1, seedCap: 4, iconType: 'fern', trigger: 'chain', effect: 'seed_self', abilityDesc: '[連鎖時] この植物に種子を1個置く(+1点)' },
  { id: 'w7', name: '聖泉のアクアマリン樹', subtitle: 'Fountain Spirit Tree', habitats: ['waterside'], cost: { rain: 2, leaf: 1, star: 1 }, points: 8, seedCap: 5, iconType: 'lotus', trigger: 'end', effect: 'end_per_waterside', abilityDesc: '[終了時] 水辺ビオトープの植物1枚につき+1点' },
  { id: 'w8', name: '朝露の滴り草', subtitle: 'Morning Drop Herb', habitats: ['waterside'], cost: { sun: 1, rain: 1 }, points: 3, seedCap: 4, iconType: 'bloom', trigger: 'chain', effect: 'gain_sun', abilityDesc: '[連鎖時] ☀️太陽雫を1個得る' },
  { id: 's1', name: '風乗りの綿毛冠', subtitle: 'Zephyr Dandelion', habitats: ['sky'], cost: { sun: 1 }, points: 2, seedCap: 2, iconType: 'bloom', trigger: 'chain', effect: 'draw1', abilityDesc: '[連鎖時] 山札からカードを1枚引く' },
  { id: 's2', name: '星雲のガラス薔薇', subtitle: 'Nebula Glass Rose', habitats: ['sky'], cost: { star: 1, sun: 1 }, points: 5, seedCap: 3, iconType: 'crystal', trigger: 'chain', effect: 'compost_deck2', abilityDesc: '[連鎖時] 山札から2枚をこの植物の堆肥(+2点)にする' },
  { id: 's3', name: '天空回廊の浮遊シダ', subtitle: 'Floating Sky Fern', habitats: ['sky', 'forest'], cost: { star: 1, leaf: 1 }, points: 4, seedCap: 3, iconType: 'fern', trigger: 'chain', effect: 'gain_star', abilityDesc: '[連鎖時] ✨星砂を1個得る' },
  { id: 's4', name: 'オーロラ翼の天華', subtitle: 'Aurora Petal', habitats: ['sky'], cost: { sun: 1, rain: 1, star: 1 }, points: 6, seedCap: 4, iconType: 'bloom', trigger: 'plant', effect: 'draw2', abilityDesc: '[植栽時] 温室トレイまたは山札から2枚引く' },
  { id: 's5', name: '成層圏のクリスタル蔓', subtitle: 'Stratosphere Vine', habitats: ['sky', 'waterside'], cost: { star: 2 }, points: 5, seedCap: 4, iconType: 'vine', trigger: 'chain', effect: 'seed_self', abilityDesc: '[連鎖時] この植物に種子1個を置きカード1枚引く' },
  { id: 's6', name: '星座を紡ぐ天文樹', subtitle: 'Astrolabe Yew', habitats: ['sky'], cost: { sun: 2, star: 2 }, points: 9, seedCap: 4, iconType: 'tree', trigger: 'end', effect: 'end_per_sky', abilityDesc: '[終了時] 天空ビオトープの植物1枚につき+1点' },
  { id: 's7', name: '雲海のアンブロシア', subtitle: 'Cloud Ambrosia', habitats: ['sky', 'forest', 'waterside'], cost: { sun: 1, rain: 1, leaf: 1, star: 1 }, points: 7, seedCap: 5, iconType: 'lotus', trigger: 'end', effect: 'end_full_seeds', abilityDesc: '[終了時] 種子が満杯の植物1枚につき+2点' },
  { id: 's8', name: '彗星尾のエアプランツ', subtitle: 'Comet Tail Tillandsia', habitats: ['sky'], cost: { star: 1 }, points: 2, seedCap: 3, iconType: 'vine', trigger: 'chain', effect: 'gain_any2', abilityDesc: '[連鎖時] ☀️太陽雫を1個得る' },
];

const ALL_SEASON_GOALS: SeasonGoal[] = [
  {
    id: 'g_forest',
    title: '樹冠の繁栄',
    desc: '森林ビオトープに植えられた植物1枚につき +2点',
    evaluate: (p) => p.board.forest.filter(Boolean).length * 2,
  },
  {
    id: 'g_seeds',
    title: '豊穣の種子',
    desc: '植物の上に置かれた生命の種子2個につき +1点',
    evaluate: (p) => {
      const totalSeeds = (['forest', 'waterside', 'sky'] as HabitatType[])
        .flatMap((h) => p.board[h])
        .reduce((acc, slot) => acc + (slot ? slot.seeds : 0), 0);
      return Math.floor(totalSeeds / 2);
    },
  },
  {
    id: 'g_biodiversity',
    title: '三層生態系の調和',
    desc: '森林・水辺・天空の3層すべてに植物が1枚以上ある組ごとに +3点',
    evaluate: (p) => {
      const counts = (['forest', 'waterside', 'sky'] as HabitatType[]).map(
        (h) => p.board[h].filter(Boolean).length
      );
      return Math.min(...counts) * 3;
    },
  },
  {
    id: 'g_compost',
    title: '循環する腐葉堆肥',
    desc: '蓄えた堆肥カード1枚につき +1点（最大+6点）',
    evaluate: (p) => {
      const totalCompost = (['forest', 'waterside', 'sky'] as HabitatType[])
        .flatMap((h) => p.board[h])
        .reduce((acc, slot) => acc + (slot ? slot.compost : 0), 0);
      return Math.min(6, totalCompost);
    },
  },
  {
    id: 'g_giant',
    title: '高得点古木の育成',
    desc: '素点5点以上の植物1枚につき +2点',
    evaluate: (p) => {
      const big = (['forest', 'waterside', 'sky'] as HabitatType[])
        .flatMap((h) => p.board[h])
        .filter((slot) => slot && slot.card.points >= 5).length;
      return big * 2;
    },
  },
];

function FloraSvgIcon({ type, className = 'w-6 h-6' }: { type: FloraCardDef['iconType']; className?: string }) {
  switch (type) {
    case 'lotus':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
          <path d="M12 4C10 8 8 11 8 15a4 4 0 0 0 8 0c0-4-2-7-4-11Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 19c-4 0-7-2-8-6 3 0 5.5 1.5 8 6Zm0 0c4 0 7-2 8-6-3 0-5.5 1.5-8 6Z" />
        </svg>
      );
    case 'fern':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
          <path d="M6 20C10 14 14 9 19 4" />
          <path d="M9 16l-3-2m6-2l-3-2m6-2l-3-2m-1 9l3 1m0-4l3 1m0-4l3 1" />
        </svg>
      );
    case 'tree':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3a6 6 0 0 0-5 9.3A5 5 0 0 0 9 20h6a5 5 0 0 0 2-7.7A6 6 0 0 0 12 3Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 22v-8m0 3l-2.5-2.5M12 15l2.5-2" />
        </svg>
      );
    case 'crystal':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
          <polygon points="12 2 19 9 16 21 8 21 5 9" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 2v19M5 9h14" />
        </svg>
      );
    case 'vine':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
          <path d="M4 19c4-1 6-5 8-9s4-7 8-7" />
          <circle cx="8" cy="11" r="2" fill="currentColor" />
          <circle cx="16" cy="11" r="2" fill="currentColor" />
        </svg>
      );
    case 'bloom':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M12 4a3 3 0 0 1 2 5.2A3 3 0 0 1 18.5 13a3 3 0 0 1-3.3 4.8A3 3 0 0 1 9 18a3 3 0 0 1-3.5-4.8A3 3 0 0 1 9.8 9.2 3 3 0 0 1 12 4Z" />
        </svg>
      );
  }
}

function cloneSnapshot(s: GameSnapshot): GameSnapshot {
  return {
    seasonIndex: s.seasonIndex,
    turnsRemaining: [...s.turnsRemaining],
    activePlayerIndex: s.activePlayerIndex,
    players: s.players.map((p) => ({
      ...p,
      dew: { ...p.dew },
      hand: [...p.hand],
      board: {
        forest: p.board.forest.map((slot) => (slot ? { ...slot } : null)),
        waterside: p.board.waterside.map((slot) => (slot ? { ...slot } : null)),
        sky: p.board.sky.map((slot) => (slot ? { ...slot } : null)),
      },
    })),
    tray: [...s.tray],
    deck: [...s.deck],
    seasonGoals: [...s.seasonGoals],
    logs: [...s.logs],
    finished: s.finished,
  };
}

function totalSeedsOnBoard(p: PlayerState): number {
  return (['forest', 'waterside', 'sky'] as HabitatType[])
    .flatMap((h) => p.board[h])
    .reduce((acc, s) => acc + (s ? s.seeds : 0), 0);
}

function removeSeedsFromBoard(p: PlayerState, count: number): void {
  let rem = count;
  for (const h of ['forest', 'waterside', 'sky'] as HabitatType[]) {
    for (const slot of p.board[h]) {
      if (slot && slot.seeds > 0 && rem > 0) {
        const take = Math.min(slot.seeds, rem);
        slot.seeds -= take;
        rem -= take;
      }
    }
  }
}

function addSeedsAuto(p: PlayerState, count: number): number {
  let added = 0;
  for (const h of ['waterside', 'forest', 'sky'] as HabitatType[]) {
    for (const slot of p.board[h]) {
      if (slot && slot.seeds < slot.card.seedCap && added < count) {
        const room = slot.card.seedCap - slot.seeds;
        const put = Math.min(room, count - added);
        slot.seeds += put;
        added += put;
      }
    }
  }
  return added;
}

function canAffordCard(p: PlayerState, card: FloraCardDef, habitat: HabitatType): { ok: boolean; col: number; seedCost: number } {
  if (!card.habitats.includes(habitat)) return { ok: false, col: -1, seedCost: 0 };
  const col = p.board[habitat].findIndex((s) => s === null);
  if (col === -1) return { ok: false, col: -1, seedCost: 0 };
  const seedCost = COLUMN_SEED_COST[col];
  if (totalSeedsOnBoard(p) < seedCost) return { ok: false, col, seedCost };

  let wildAvailable = 0;
  let deficit = 0;
  for (const d of ['sun', 'rain', 'star', 'leaf'] as DewType[]) {
    const req = card.cost[d] || 0;
    const have = p.dew[d];
    if (have >= req) {
      wildAvailable += have - req;
    } else {
      deficit += req - have;
    }
  }
  if (deficit === 0 || Math.floor(wildAvailable / 2) >= deficit) {
    return { ok: true, col, seedCost };
  }
  return { ok: false, col, seedCost };
}

function payForCard(p: PlayerState, card: FloraCardDef, seedCost: number): void {
  removeSeedsFromBoard(p, seedCost);
  let deficit = 0;
  for (const d of ['sun', 'rain', 'star', 'leaf'] as DewType[]) {
    const req = card.cost[d] || 0;
    if (p.dew[d] >= req) {
      p.dew[d] -= req;
    } else {
      deficit += req - p.dew[d];
      p.dew[d] = 0;
    }
  }
  let toBurn = deficit * 2;
  for (const d of ['leaf', 'sun', 'rain', 'star'] as DewType[]) {
    if (toBurn > 0 && p.dew[d] > 0) {
      const take = Math.min(p.dew[d], toBurn);
      p.dew[d] -= take;
      toBurn -= take;
    }
  }
}

export function calculateScoreBreakdown(p: PlayerState) {
  let cardPts = 0;
  let seedPts = 0;
  let compostPts = 0;
  let endAbilityPts = 0;

  const forestCount = p.board.forest.filter(Boolean).length;
  const watersideCount = p.board.waterside.filter(Boolean).length;
  const skyCount = p.board.sky.filter(Boolean).length;
  const fullSeedCount = (['forest', 'waterside', 'sky'] as HabitatType[])
    .flatMap((h) => p.board[h])
    .filter((s) => s && s.seeds >= s.card.seedCap).length;

  for (const h of ['forest', 'waterside', 'sky'] as HabitatType[]) {
    for (const slot of p.board[h]) {
      if (!slot) continue;
      cardPts += slot.card.points;
      seedPts += slot.seeds;
      compostPts += slot.compost;
      if (slot.card.trigger === 'end') {
        if (slot.card.effect === 'end_per_forest') endAbilityPts += forestCount;
        if (slot.card.effect === 'end_per_waterside') endAbilityPts += watersideCount;
        if (slot.card.effect === 'end_per_sky') endAbilityPts += skyCount;
        if (slot.card.effect === 'end_full_seeds') endAbilityPts += fullSeedCount * 2;
      }
    }
  }

  return {
    cardPts,
    seedPts,
    compostPts,
    endAbilityPts,
    seasonPts: p.seasonScore,
    total: cardPts + seedPts + compostPts + endAbilityPts + p.seasonScore,
  };
}

function createInitialGame(mode: GameMode): GameSnapshot {
  const deckPool: FloraCardDef[] = [];
  FLORA_CATALOG.forEach((c) => {
    deckPool.push({ ...c, id: `${c.id}_a` });
    deckPool.push({ ...c, id: `${c.id}_b` });
  });
  for (let i = deckPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deckPool[i], deckPool[j]] = [deckPool[j], deckPool[i]];
  }

  const playerConfigs: { name: string; isAi: boolean; aiProfile?: AiProfile; color: string }[] =
    mode === 'solo'
      ? [{ name: 'あなた (主任植物学者)', isAi: false, color: 'emerald' }]
      : mode === 'pvp2'
      ? [
          { name: 'プレイヤー1 (翡翠園)', isAi: false, color: 'emerald' },
          { name: 'プレイヤー2 (琥珀園)', isAi: false, color: 'amber' },
        ]
      : mode === 'cpu2'
      ? [
          { name: 'あなた', isAi: false, color: 'emerald' },
          { name: 'セレス (連鎖特化AI)', isAi: true, aiProfile: 'chain', color: 'cyan' },
        ]
      : mode === 'cpu3'
      ? [
          { name: 'あなた', isAi: false, color: 'emerald' },
          { name: 'セレス (連鎖特化AI)', isAi: true, aiProfile: 'chain', color: 'cyan' },
          { name: 'オーベロン (高得点巨木AI)', isAi: true, aiProfile: 'giant', color: 'amber' },
        ]
      : [
          { name: 'あなた', isAi: false, color: 'emerald' },
          { name: 'セレス (連鎖特化AI)', isAi: true, aiProfile: 'chain', color: 'cyan' },
          { name: 'オーベロン (高得点巨木AI)', isAi: true, aiProfile: 'giant', color: 'amber' },
          { name: 'リリア (目標達成AI)', isAi: true, aiProfile: 'goal', color: 'purple' },
        ];

  const players: PlayerState[] = playerConfigs.map((cfg, idx) => ({
    id: `p_${idx}`,
    name: cfg.name,
    isAi: cfg.isAi,
    aiProfile: cfg.aiProfile,
    color: cfg.color,
    dew: { sun: 1, rain: 1, star: 1, leaf: 1 },
    hand: deckPool.splice(0, 4),
    board: {
      forest: [null, null, null, null, null],
      waterside: [null, null, null, null, null],
      sky: [null, null, null, null, null],
    },
    seasonScore: 0,
  }));

  const tray = deckPool.splice(0, 3);
  const seasonGoals = ALL_SEASON_GOALS.slice(0, 4);

  return {
    seasonIndex: 0,
    turnsRemaining: players.map(() => SEASON_TURNS[0]),
    activePlayerIndex: 0,
    players,
    tray,
    deck: deckPool,
    seasonGoals,
    logs: ['🌿 天空の植物園が開園しました。植物を植えるか、3層のビオトープを稼働させて連鎖エンジンを育てましょう！'],
    finished: false,
  };
}

function drawFromDeckOrTray(snap: GameSnapshot, p: PlayerState, count: number) {
  for (let i = 0; i < count; i++) {
    if (snap.tray.length > 0) {
      const c = snap.tray.shift()!;
      p.hand.push(c);
      if (snap.deck.length > 0) snap.tray.push(snap.deck.shift()!);
    } else if (snap.deck.length > 0) {
      p.hand.push(snap.deck.shift()!);
    }
  }
}

function triggerCardEffect(snap: GameSnapshot, p: PlayerState, slot: PlantedFlora, logParts: string[]) {
  const eff = slot.card.effect;
  if (eff === 'gain_sun') {
    p.dew.sun += 1;
    logParts.push(`「${slot.card.name}」で☀️+1`);
  } else if (eff === 'gain_rain') {
    p.dew.rain += 1;
    if (slot.card.id.startsWith('w4')) slot.seeds = Math.min(slot.card.seedCap, slot.seeds + 1);
    logParts.push(`「${slot.card.name}」で💧+1`);
  } else if (eff === 'gain_star') {
    p.dew.star += 1;
    logParts.push(`「${slot.card.name}」で✨+1`);
  } else if (eff === 'gain_leaf') {
    p.dew.leaf += 1;
    logParts.push(`「${slot.card.name}」で🌿+1`);
  } else if (eff === 'gain_any2') {
    p.dew.sun += 1;
    p.dew.leaf += 1;
    logParts.push(`「${slot.card.name}」で霊水獲得`);
  } else if (eff === 'seed_self') {
    if (slot.seeds < slot.card.seedCap) {
      slot.seeds += 1;
      logParts.push(`「${slot.card.name}」に種子+1`);
    }
    if (slot.card.id.startsWith('s5')) drawFromDeckOrTray(snap, p, 1);
  } else if (eff === 'seed_any2') {
    const put = addSeedsAuto(p, 2);
    if (slot.card.trigger === 'plant') p.dew.rain += 1;
    logParts.push(`「${slot.card.name}」で種子+${put}`);
  } else if (eff === 'draw1') {
    drawFromDeckOrTray(snap, p, 1);
    logParts.push(`「${slot.card.name}」で探査+1枚`);
  } else if (eff === 'draw2') {
    drawFromDeckOrTray(snap, p, 2);
    logParts.push(`「${slot.card.name}」で探査+2枚`);
  } else if (eff === 'compost_hand') {
    if (p.hand.length > 0) {
      p.hand.shift();
      slot.compost += 1;
      drawFromDeckOrTray(snap, p, 1);
      logParts.push(`「${slot.card.name}」で堆肥+1＆1枚引く`);
    }
  } else if (eff === 'compost_deck2') {
    const cCount = Math.min(2, snap.deck.length);
    snap.deck.splice(0, cCount);
    slot.compost += cCount;
    logParts.push(`「${slot.card.name}」で堆肥+${cCount}`);
  }
}

export default function SkyBotanistGame() {
  const [mode, setMode] = useState<GameMode>('cpu2');
  const [game, setGame] = useState<GameSnapshot>(() => createInitialGame('cpu2'));
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [viewedPlayerIdx, setViewedPlayerIdx] = useState<number>(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [chainHighlight, setChainHighlight] = useState<string | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmTimerRef = useRef<number | null>(null);

  const playSound = useCallback(
    (kind: 'plant' | 'chain' | 'season' | 'win') => {
      if (!sfxEnabled || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        const notes =
          kind === 'plant'
            ? [523.25, 659.25, 783.99]
            : kind === 'chain'
            ? [440, 554.37, 659.25, 880]
            : kind === 'season'
            ? [392, 523.25, 659.25, 783.99]
            : [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.08, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.26);
        });
      } catch {
        // Ignore audio errors
      }
    },
    [sfxEnabled]
  );

  useEffect(() => {
    if (!bgmEnabled || typeof window === 'undefined') {
      if (bgmTimerRef.current) {
        window.clearInterval(bgmTimerRef.current);
        bgmTimerRef.current = null;
      }
      return;
    }
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    let step = 0;
    bgmTimerRef.current = window.setInterval(() => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freq = scale[(step * 2 + (step % 3)) % scale.length];
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.025, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.82);
        step++;
      } catch {
        // Ignore
      }
    }, 950);
    return () => {
      if (bgmTimerRef.current) window.clearInterval(bgmTimerRef.current);
    };
  }, [bgmEnabled]);

  const advanceTurnAndSeason = useCallback(
    (snap: GameSnapshot) => {
      snap.turnsRemaining[snap.activePlayerIndex] -= 1;
      const totalRem = snap.turnsRemaining.reduce((a, b) => a + b, 0);

      if (totalRem <= 0) {
        const goal = snap.seasonGoals[snap.seasonIndex];
        const summary: string[] = [];
        snap.players.forEach((pl) => {
          const pts = goal.evaluate(pl);
          pl.seasonScore += pts;
          summary.push(`${pl.name}: +${pts}点`);
        });
        snap.logs.unshift(`🏆 【${goal.title}】季節評価完了！ (${summary.join(' / ')})`);

        while (snap.tray.length < 3 && snap.deck.length > 0) {
          snap.tray.push(snap.deck.shift()!);
        }

        if (snap.seasonIndex >= 3) {
          snap.finished = true;
          playSound('win');
          snap.logs.unshift('🎉 全4季節が終了しました！最終生態系スコアを集計します。');
          return;
        }
        snap.seasonIndex += 1;
        snap.turnsRemaining = snap.players.map(() => SEASON_TURNS[snap.seasonIndex]);
        snap.activePlayerIndex = 0;
        playSound('season');
      } else {
        let next = (snap.activePlayerIndex + 1) % snap.players.length;
        for (let i = 0; i < snap.players.length; i++) {
          if (snap.turnsRemaining[next] > 0) break;
          next = (next + 1) % snap.players.length;
        }
        snap.activePlayerIndex = next;
      }
    },
    [playSound]
  );

  const executePlantAction = useCallback(
    (cardIndex: number, habitat: HabitatType) => {
      const next = cloneSnapshot(game);
      const p = next.players[next.activePlayerIndex];
      const card = p.hand[cardIndex];
      if (!card) return;
      const check = canAffordCard(p, card, habitat);
      if (!check.ok) return;

      if (!p.isAi) {
        setHistory((prev) => [...prev.slice(-12), cloneSnapshot(game)]);
      }

      payForCard(p, card, check.seedCost);
      p.hand.splice(cardIndex, 1);
      const planted: PlantedFlora = {
        uid: `${card.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        card,
        seeds: 0,
        compost: 0,
      };
      p.board[habitat][check.col] = planted;

      const effectsLog: string[] = [];
      if (card.trigger === 'plant') {
        triggerCardEffect(next, p, planted, effectsLog);
      }

      next.logs.unshift(
        `🌱 ${p.name}が【${HABITAT_META[habitat].name}】第${check.col + 1}列に「${card.name}」を植栽！ ${effectsLog.join(' / ')}`
      );
      setSelectedCardIdx(null);
      setHintText(null);
      playSound('plant');
      advanceTurnAndSeason(next);
      setGame(next);
      setViewedPlayerIdx(next.players[next.activePlayerIndex]?.isAi ? 0 : next.activePlayerIndex);
    },
    [game, advanceTurnAndSeason, playSound]
  );

  const executeActivateRow = useCallback(
    (habitat: HabitatType) => {
      const next = cloneSnapshot(game);
      const p = next.players[next.activePlayerIndex];
      if (!p.isAi) {
        setHistory((prev) => [...prev.slice(-12), cloneSnapshot(game)]);
      }

      const row = p.board[habitat];
      const count = row.filter(Boolean).length;
      const chainLog: string[] = [];

      if (habitat === 'forest') {
        const gainCount = count <= 1 ? 1 : count <= 3 ? 2 : 3;
        const order: DewType[] = ['sun', 'rain', 'leaf', 'star'];
        for (let i = 0; i < gainCount; i++) {
          const d = order[(count + i) % order.length];
          p.dew[d] += 1;
        }
        chainLog.push(`基礎霊水+${gainCount}`);
      } else if (habitat === 'waterside') {
        const seedGain = count === 0 ? 1 : count <= 2 ? 2 : count <= 4 ? 3 : 4;
        const placed = addSeedsAuto(p, seedGain);
        if (placed < seedGain) p.dew.rain += 1;
        chainLog.push(`基礎種子+${placed}`);
      } else {
        const drawCount = count <= 1 ? 1 : count <= 3 ? 2 : 3;
        drawFromDeckOrTray(next, p, drawCount);
        if (count % 2 === 1) p.dew.star += 1;
        chainLog.push(`基礎探査+${drawCount}枚`);
      }

      // Trigger right-to-left chain!
      for (let col = 4; col >= 0; col--) {
        const slot = row[col];
        if (slot && slot.card.trigger === 'chain') {
          triggerCardEffect(next, p, slot, chainLog);
        }
      }

      setChainHighlight(habitat);
      setTimeout(() => setChainHighlight(null), 650);

      next.logs.unshift(`⚡ ${p.name}が【${HABITAT_META[habitat].name}】を稼働（右→左連鎖）: ${chainLog.join(' → ')}`);
      setSelectedCardIdx(null);
      setHintText(null);
      playSound('chain');
      advanceTurnAndSeason(next);
      setGame(next);
      setViewedPlayerIdx(next.players[next.activePlayerIndex]?.isAi ? 0 : next.activePlayerIndex);
    },
    [game, advanceTurnAndSeason, playSound]
  );

  const computeBestMoveForPlayer = useCallback((snap: GameSnapshot, p: PlayerState) => {
    let bestPlant: { cardIdx: number; habitat: HabitatType; score: number; reason: string } | null = null;
    p.hand.forEach((card, idx) => {
      for (const h of card.habitats) {
        const check = canAffordCard(p, card, h);
        if (check.ok) {
          let val = card.points * 2 + (card.trigger === 'chain' ? 5 : 3) - check.seedCost;
          if (p.aiProfile === 'chain' && card.trigger === 'chain') val += 5;
          if (p.aiProfile === 'giant' && card.points >= 5) val += 6;
          if (p.aiProfile === 'goal' && h === 'forest') val += 4;
          if (!bestPlant || val > bestPlant.score) {
            bestPlant = {
              cardIdx: idx,
              habitat: h,
              score: val,
              reason: `手札の「${card.name}」（${card.points}点）を【${HABITAT_META[h].name}】に植えると、以降の右→左連鎖エンジンが強化されます！`,
            };
          }
        }
      }
    });

    if (bestPlant && (bestPlant as { score: number }).score >= 7) {
      return { type: 'plant' as const, ...(bestPlant as { cardIdx: number; habitat: HabitatType; score: number; reason: string }) };
    }

    const totalDew = p.dew.sun + p.dew.rain + p.dew.star + p.dew.leaf;
    if (p.hand.length <= 1) {
      return {
        type: 'activate' as const,
        habitat: 'sky' as HabitatType,
        reason: '手札が少ないため【天空ビオトープ】を稼働して新しい幻想植物カードを補充しましょう。',
      };
    }
    if (totalDew <= 2) {
      return {
        type: 'activate' as const,
        habitat: 'forest' as HabitatType,
        reason: '霊水リソースが不足しているため【森林ビオトープ】を稼働して霊水と連鎖ボーナスを獲得しましょう。',
      };
    }
    return {
      type: 'activate' as const,
      habitat: 'waterside' as HabitatType,
      reason: '【水辺ビオトープ】を稼働して生命の種子（各1点＆上位列の植栽コスト）を増やしましょう。',
    };
  }, []);

  useEffect(() => {
    if (game.finished) return;
    const active = game.players[game.activePlayerIndex];
    if (!active?.isAi) return;
    const timer = window.setTimeout(() => {
      const decision = computeBestMoveForPlayer(game, active);
      if (decision.type === 'plant') {
        executePlantAction(decision.cardIdx, decision.habitat);
      } else {
        executeActivateRow(decision.habitat);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [game, computeBestMoveForPlayer, executePlantAction, executeActivateRow]);

  const handleReset = (newMode: GameMode) => {
    setMode(newMode);
    setHistory([]);
    setSelectedCardIdx(null);
    setHintText(null);
    setViewedPlayerIdx(0);
    setGame(createInitialGame(newMode));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGame(prev);
    setSelectedCardIdx(null);
    setHintText(null);
  };

  const handleShowHint = () => {
    const active = game.players[game.activePlayerIndex];
    if (!active || active.isAi) return;
    const rec = computeBestMoveForPlayer(game, active);
    setHintText(rec.reason);
  };

  const activePlayer = game.players[game.activePlayerIndex];
  const viewedPlayer = game.players[viewedPlayerIdx] || activePlayer;
  const selectedCard = selectedCardIdx !== null ? activePlayer.hand[selectedCardIdx] : null;
  const currentGoal = game.seasonGoals[game.seasonIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-emerald-950/90 to-slate-950 text-slate-100 pb-16">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/80 border-b border-emerald-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-emerald-300 border border-emerald-500/30 transition"
            >
              ← ボードゲーム一覧
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200">
                🌿 天空の植物園 — Sky Botanist
              </h1>
              <p className="text-xs text-slate-400">3層ビオトープと右→左の連鎖能力で育てる生態系エンジン構築ボードゲーム</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="対戦モード選択"
              value={mode}
              onChange={(e) => handleReset(e.target.value as GameMode)}
              className="bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-100"
            >
              <option value="cpu2">2人対戦 (vs 連鎖AI)</option>
              <option value="cpu3">3人対戦 (vs 連鎖AI・巨木AI)</option>
              <option value="cpu4">4人対戦 (vs 3種個性AI)</option>
              <option value="pvp2">2人パス＆プレイ</option>
              <option value="solo">ソロ・スコアアタック</option>
            </select>

            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs border border-slate-600 transition"
            >
              ↩ 1手戻す
            </button>

            <button
              type="button"
              onClick={handleShowHint}
              disabled={activePlayer.isAi || game.finished}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs border border-amber-400/40 transition"
            >
              💡 AI推奨手ヒント
            </button>

            <button
              type="button"
              onClick={() => setBgmEnabled((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                bgmEnabled
                  ? 'bg-emerald-600/30 text-emerald-200 border-emerald-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              🎵 BGM {bgmEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => setSfxEnabled((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                sfxEnabled
                  ? 'bg-teal-600/30 text-teal-200 border-teal-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              🔊 効果音 {sfxEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => handleReset(mode)}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 text-xs border border-rose-500/30 transition"
            >
              新規開園
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-4 space-y-4">
        {/* Season Banner & Goals */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-900/75 border border-emerald-500/30 rounded-2xl p-4 shadow-xl">
          <div className="lg:col-span-5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {SEASON_NAMES[game.seasonIndex]}
              </span>
              <span className="text-xs text-slate-300">
                残りアクション手番:{' '}
                <strong className="text-amber-300 text-sm">{game.turnsRemaining[game.activePlayerIndex]}</strong> 手
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-amber-500/30">
              <div className="text-xs text-amber-300 font-semibold">
                🏆 今季の生態系目標：【{currentGoal.title}】
              </div>
              <div className="text-xs text-slate-300 mt-0.5">{currentGoal.desc}</div>
            </div>
          </div>

          {/* Player Score Tabs */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {game.players.map((pl, idx) => {
              const bd = calculateScoreBreakdown(pl);
              const isTurn = idx === game.activePlayerIndex && !game.finished;
              const isViewed = idx === viewedPlayerIdx;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => setViewedPlayerIdx(idx)}
                  className={`text-left p-2.5 rounded-xl border transition relative ${
                    isViewed
                      ? 'bg-emerald-900/50 border-emerald-400 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {isTurn && (
                    <span className="absolute -top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-400 text-slate-950">
                      手番中
                    </span>
                  )}
                  <div className="text-xs font-bold truncate text-slate-100">{pl.name}</div>
                  <div className="text-lg font-extrabold text-amber-300 mt-0.5">{bd.total} ★</div>
                  <div className="flex flex-wrap gap-1 mt-1 text-[11px] text-slate-300">
                    <span>☀️{pl.dew.sun}</span>
                    <span>💧{pl.dew.rain}</span>
                    <span>✨{pl.dew.star}</span>
                    <span>🌿{pl.dew.leaf}</span>
                    <span>🃏{pl.hand.length}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Hint Banner */}
        {hintText && (
          <div className="bg-amber-950/80 border border-amber-400/50 text-amber-100 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
            <span>💡 <strong>主任植物学者の助言:</strong> {hintText}</span>
            <button type="button" onClick={() => setHintText(null)} className="text-amber-300 hover:underline ml-4">
              閉じる
            </button>
          </div>
        )}

        {/* Finished Modal Banner */}
        {game.finished && (
          <section className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-amber-900/90 border-2 border-amber-400 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-amber-200 mb-3">👑 最終生態系スコア結果発表</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[...game.players]
                .map((pl) => ({ pl, bd: calculateScoreBreakdown(pl) }))
                .sort((a, b) => b.bd.total - a.bd.total)
                .map(({ pl, bd }, rank) => (
                  <div key={pl.id} className="bg-slate-950/80 border border-amber-300/40 rounded-xl p-3">
                    <div className="text-xs text-amber-300 font-bold">第{rank + 1}位 — {pl.name}</div>
                    <div className="text-2xl font-extrabold text-white my-1">{bd.total} 点</div>
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <div>🌿 植物素点: {bd.cardPts}点</div>
                      <div>🌰 生命の種子: {bd.seedPts}点</div>
                      <div>🍂 腐葉堆肥: {bd.compostPts}点</div>
                      <div>✨ 終了時能力: {bd.endAbilityPts}点</div>
                      <div>🏆 季節目標: {bd.seasonPts}点</div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* 3 Habitat Biotope Rows */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-emerald-200">
              🏞️ {viewedPlayer.name} の3層ビオトープ個人ボード
              {selectedCard && !activePlayer.isAi && (
                <span className="ml-2 text-xs text-amber-300 font-normal">
                  （植栽先ビオトープを選択してください: 「{selectedCard.name}」）
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-400">
              ※不足している霊水は任意の霊水2個で1個分に代替可能 / 列2〜5には盤面の種子コストが必要です
            </span>
          </div>

          {(['forest', 'waterside', 'sky'] as HabitatType[]).map((habitat) => {
            const meta = HABITAT_META[habitat];
            const rowSlots = viewedPlayer.board[habitat];
            const canPlantHere =
              selectedCard &&
              !activePlayer.isAi &&
              viewedPlayerIdx === game.activePlayerIndex &&
              canAffordCard(activePlayer, selectedCard, habitat).ok;

            return (
              <div
                key={habitat}
                className={`rounded-2xl border p-3.5 transition-all ${meta.theme} ${
                  chainHighlight === habitat ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{meta.name}</span>
                      <span className="text-xs text-slate-300">（{meta.sub}）</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedCard && viewedPlayerIdx === game.activePlayerIndex && (
                      <button
                        type="button"
                        disabled={!canPlantHere || game.finished}
                        onClick={() => selectedCardIdx !== null && executePlantAction(selectedCardIdx, habitat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          canPlantHere
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        🌱 この層に「{selectedCard.name}」を植える
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={activePlayer.isAi || viewedPlayerIdx !== game.activePlayerIndex || game.finished}
                      onClick={() => executeActivateRow(habitat)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-md transition"
                    >
                      ⚡ {meta.actionName}
                    </button>
                  </div>
                </div>

                {/* 5 Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {rowSlots.map((slot, colIdx) => {
                    const seedReq = COLUMN_SEED_COST[colIdx];
                    return (
                      <div
                        key={colIdx}
                        className={`min-h-[138px] rounded-xl border p-2.5 flex flex-col justify-between relative ${
                          slot
                            ? 'bg-slate-900/90 border-emerald-400/50 shadow-inner'
                            : 'bg-slate-950/45 border-dashed border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                          <span>第{colIdx + 1}列 (←連鎖順)</span>
                          <span>{seedReq > 0 ? `種子コスト:${seedReq}🌰` : '種子コスト:0'}</span>
                        </div>

                        {slot ? (
                          <div className="my-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                                <FloraSvgIcon type={slot.card.iconType} className="w-4 h-4 shrink-0" />
                                <span className="truncate">{slot.card.name}</span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-xs">
                                {slot.card.points}★
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">{slot.card.abilityDesc}</p>
                            <div className="flex items-center justify-between pt-1 text-[11px]">
                              <span className="text-cyan-300 font-semibold">
                                🌰 種子: {slot.seeds}/{slot.card.seedCap}
                              </span>
                              {slot.compost > 0 && (
                                <span className="text-amber-300 font-semibold">🍂 堆肥: +{slot.compost}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="my-auto text-center text-xs text-slate-500 py-4">
                            空きスロット
                            <div className="text-[10px] text-emerald-400/80 mt-1">
                              稼働報酬: {meta.baseRewards[colIdx]}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* Hand & Greenhouse Tray & Logs */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Active Player Hand */}
          <div className="lg:col-span-8 bg-slate-900/75 border border-emerald-500/30 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-emerald-200">
                🃏 {activePlayer.name} の手札 ({activePlayer.hand.length}枚) — カードをクリックしてビオトープに植栽
              </h3>
              <div className="flex items-center gap-2 text-xs">
                {(Object.keys(DEW_META) as DewType[]).map((d) => (
                  <span key={d} className={`px-2 py-0.5 rounded-full border ${DEW_META[d].badge}`}>
                    {DEW_META[d].emoji} {DEW_META[d].label}: <strong>{activePlayer.dew[d]}</strong>
                  </span>
                ))}
                <span className="px-2 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-200 border-cyan-400/40">
                  🌰 盤面種子: <strong>{totalSeedsOnBoard(activePlayer)}</strong>
                </span>
              </div>
            </div>

            {activePlayer.hand.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                手札がありません。「天空を稼働」アクションで新しい幻想植物カードを探査しましょう！
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {activePlayer.hand.map((card, idx) => {
                  const isSel = selectedCardIdx === idx;
                  const affordableHabitats = card.habitats.filter((h) => canAffordCard(activePlayer, card, h).ok);
                  return (
                    <div
                      key={`${card.id}_${idx}`}
                      onClick={() => !activePlayer.isAi && setSelectedCardIdx(isSel ? null : idx)}
                      className={`cursor-pointer rounded-xl border p-3 transition flex flex-col justify-between ${
                        isSel
                          ? 'bg-emerald-900/70 border-amber-400 ring-2 ring-amber-400/60'
                          : affordableHabitats.length > 0
                          ? 'bg-slate-950/80 border-emerald-500/40 hover:border-emerald-400'
                          : 'bg-slate-950/50 border-slate-800 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-200">
                            <FloraSvgIcon type={card.iconType} className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{card.name}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-xs">
                            {card.points}点
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[11px]">
                          {(Object.entries(card.cost) as [DewType, number][]).map(([d, amt]) => (
                            <span key={d} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                              {DEW_META[d].emoji}×{amt}
                            </span>
                          ))}
                          <span className="ml-auto text-slate-400">種子上限:{card.seedCap}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {card.habitats.map((h) => (
                            <span
                              key={h}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/30"
                            >
                              {HABITAT_META[h].name.replace('ビオトープ', '')}
                            </span>
                          ))}
                        </div>

                        <p className="text-[11px] text-slate-300 mt-2 leading-snug">{card.abilityDesc}</p>
                      </div>

                      {isSel && affordableHabitats.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap gap-1">
                          {affordableHabitats.map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                executePlantAction(idx, h);
                              }}
                              className="flex-1 py-1 px-2 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px]"
                            >
                              {HABITAT_META[h].name.replace('ビオトープ', '')}に植える
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Greenhouse Tray & Logs */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/75 border border-emerald-500/30 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-indigo-300 mb-2">
                🔭 浮遊温室トレイ（天空稼働時に優先獲得 / 山札残り {game.deck.length}枚）
              </h3>
              <div className="space-y-1.5">
                {game.tray.map((c, i) => (
                  <div
                    key={`${c.id}_tray_${i}`}
                    className="p-2 rounded-lg bg-slate-950/70 border border-indigo-500/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-indigo-200">{c.name} ({c.points}★)</div>
                      <div className="text-[11px] text-slate-400">{c.abilityDesc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/75 border border-emerald-500/30 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-emerald-300 mb-2">📜 植物園の観察記録ログ</h3>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs text-slate-300">
                {game.logs.slice(0, 10).map((lg, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                    {lg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
