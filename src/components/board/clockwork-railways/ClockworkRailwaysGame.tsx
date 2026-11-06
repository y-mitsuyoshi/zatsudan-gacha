'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// ============================================================================
// Types & Constants
// ============================================================================

export type GameMode = 'cpu' | 'pvp';
export type AiPersona = 'engine' | 'network' | 'contract';
export type TerrainType = 'plains' | 'bridge' | 'tunnel';

export type FacilityId =
  | 'coal_mine'
  | 'steel_foundry'
  | 'locomotive_works'
  | 'railway_construction'
  | 'freight_exchange'
  | 'central_bank'
  | 'grand_expo';

export type SlotType = 'prime' | 'overtime';

export interface CityNode {
  id: string;
  name: string;
  shortName: string;
  region: string;
  x: number;
  y: number;
  icon: string;
  arrivalBonusText: string;
  arrivalBonus: {
    coal?: number;
    steel?: number;
    gold?: number;
    prestige?: number;
  };
}

export interface RailwayRoute {
  id: string;
  from: string;
  to: string;
  terrain: TerrainType;
  cost: {
    coal: number;
    steel: number;
    gold: number;
  };
  prestige: number;
  distance: number; // 1 hop
}

export interface DeliveryContract {
  id: string;
  title: string;
  cargo: string;
  fromCity: string;
  toCity: string;
  minEngineLv: number;
  rewardPrestige: number;
  rewardGold: number;
  rewardCoal?: number;
  rewardSteel?: number;
}

export interface ExpoMedal {
  id: string;
  title: string;
  subtitle: string;
  cost: {
    coal: number;
    steel: number;
    gold: number;
  };
  minRoutes?: number;
  minEngineLv?: number;
  prestige: number;
  claimedBy: number | null; // player index
}

export interface WorkerPlacement {
  playerId: number;
  facilityId: FacilityId;
  slotType: SlotType;
  round: number;
}

export interface PlayerState {
  id: number;
  name: string;
  isHuman: boolean;
  persona?: AiPersona;
  colorHex: string;
  colorName: string;
  badgeClass: string;
  borderClass: string;
  coal: number;
  steel: number;
  gold: number;
  prestige: number;
  engineLv: number; // 1 to 5
  totalWorkers: number; // 3 (becomes 4 at engineLv >= 3)
  availableWorkers: number;
  ownedRoutes: string[]; // route IDs
  visitedCities: string[]; // city IDs for first-visit bonus tracking
  activeContracts: DeliveryContract[];
  completedContracts: DeliveryContract[];
  claimedMedals: string[];
}

export interface GameSnapshot {
  round: number;
  maxRounds: number;
  currentPlayerIndex: number;
  firstPlayerIndex: number;
  nextFirstPlayerIndex: number;
  pocketWatchClaimedThisRound: boolean;
  players: PlayerState[];
  placements: WorkerPlacement[];
  contractMarket: DeliveryContract[];
  contractDeck: DeliveryContract[];
  expoMedals: ExpoMedal[];
  logs: string[];
  gameOver: boolean;
}

export interface RecommendedMove {
  facilityId: FacilityId;
  slotType: SlotType;
  title: string;
  reason: string;
  score: number;
  routeId?: string;
  secondRouteId?: string;
  contractIdToTake?: string;
  contractIdToFulfill?: string;
  medalId?: string;
  subChoice?: 'standard' | 'alt';
}

// ============================================================================
// Steampunk Continent Data: 12 Cities & 22 Routes
// ============================================================================

export const CITIES: CityNode[] = [
  {
    id: 'gearhaven',
    name: 'ギアヘイヴン王都',
    shortName: '王都ギアヘイヴン',
    region: '中央王都圏',
    x: 490,
    y: 265,
    icon: '',
    arrivalBonusText: '名声+1★・金貨+1',
    arrivalBonus: { prestige: 1, gold: 1 },
  },
  {
    id: 'ironforge',
    name: 'アイアンフォージ鉱山',
    shortName: 'アイアンフォージ',
    region: '北部黒鉄山脈',
    x: 270,
    y: 115,
    icon: '️',
    arrivalBonusText: '石炭+2',
    arrivalBonus: { coal: 2 },
  },
  {
    id: 'steamport',
    name: 'スチームポート港',
    shortName: 'スチームポート',
    region: '西海岸蒸気湾',
    x: 115,
    y: 255,
    icon: '',
    arrivalBonusText: '金貨+2',
    arrivalBonus: { gold: 2 },
  },
  {
    id: 'chronos',
    name: 'クロノス学術都市',
    shortName: 'クロノス学都',
    region: '北東時計塔高地',
    x: 685,
    y: 120,
    icon: '️',
    arrivalBonusText: '名声+2★',
    arrivalBonus: { prestige: 2 },
  },
  {
    id: 'amber_gorge',
    name: 'アンバー渓谷',
    shortName: 'アンバー渓谷',
    region: '西部赤銅峡谷',
    x: 255,
    y: 235,
    icon: '️',
    arrivalBonusText: '石炭+1・金貨+1',
    arrivalBonus: { coal: 1, gold: 1 },
  },
  {
    id: 'brassbridge',
    name: 'ブラスブリッジ',
    shortName: 'ブラスブリッジ',
    region: '中央大河流域',
    x: 380,
    y: 350,
    icon: '',
    arrivalBonusText: '鋼鉄+1・金貨+1',
    arrivalBonus: { steel: 1, gold: 1 },
  },
  {
    id: 'cloudpeak',
    name: 'クラウドピーク',
    shortName: 'クラウドピーク',
    region: '北部白雲連峰',
    x: 485,
    y: 105,
    icon: '️',
    arrivalBonusText: '鋼鉄+1・名声+1★',
    arrivalBonus: { steel: 1, prestige: 1 },
  },
  {
    id: 'coppervale',
    name: 'コッパーベール',
    shortName: 'コッパーベール',
    region: '南西緑銅盆地',
    x: 195,
    y: 415,
    icon: '',
    arrivalBonusText: '石炭+1・鋼鉄+1',
    arrivalBonus: { coal: 1, steel: 1 },
  },
  {
    id: 'silverlake',
    name: 'シルヴァーレイク',
    shortName: 'シルヴァーレイク',
    region: '東部銀鏡湖畔',
    x: 660,
    y: 280,
    icon: '',
    arrivalBonusText: '金貨+2',
    arrivalBonus: { gold: 2 },
  },
  {
    id: 'vulcan',
    name: 'ヴァルカン溶鉱炉',
    shortName: 'ヴァルカン炉',
    region: '南東火成工業帯',
    x: 615,
    y: 430,
    icon: '',
    arrivalBonusText: '鋼鉄+2',
    arrivalBonus: { steel: 2 },
  },
  {
    id: 'emerald_farm',
    name: 'エメラルド農園',
    shortName: 'エメラルド農園',
    region: '南部豊穣平原',
    x: 425,
    y: 465,
    icon: '',
    arrivalBonusText: '金貨+1・名声+1★',
    arrivalBonus: { gold: 1, prestige: 1 },
  },
  {
    id: 'starlight',
    name: 'スターライト天文台',
    shortName: 'スターライト台',
    region: '極東星見岬',
    x: 865,
    y: 225,
    icon: '',
    arrivalBonusText: '名声+3★',
    arrivalBonus: { prestige: 3 },
  },
];

export const CITY_MAP: Record<string, CityNode> = Object.fromEntries(
  CITIES.map((c) => [c.id, c])
);

export const ROUTES: RailwayRoute[] = [
  // 1
  {
    id: 'r_steam_iron',
    from: 'steamport',
    to: 'ironforge',
    terrain: 'mountain' === ('mountain' as string) ? 'tunnel' : 'plains',
    cost: { coal: 2, steel: 2, gold: 0 },
    prestige: 4,
    distance: 1,
  },
  // 2
  {
    id: 'r_steam_amber',
    from: 'steamport',
    to: 'amber_gorge',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 3
  {
    id: 'r_steam_copper',
    from: 'steamport',
    to: 'coppervale',
    terrain: 'bridge',
    cost: { coal: 0, steel: 2, gold: 1 },
    prestige: 3,
    distance: 1,
  },
  // 4
  {
    id: 'r_iron_amber',
    from: 'ironforge',
    to: 'amber_gorge',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 5
  {
    id: 'r_iron_cloud',
    from: 'ironforge',
    to: 'cloudpeak',
    terrain: 'tunnel',
    cost: { coal: 2, steel: 2, gold: 0 },
    prestige: 4,
    distance: 1,
  },
  // 6
  {
    id: 'r_amber_gear',
    from: 'amber_gorge',
    to: 'gearhaven',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 7
  {
    id: 'r_amber_brass',
    from: 'amber_gorge',
    to: 'brassbridge',
    terrain: 'bridge',
    cost: { coal: 0, steel: 2, gold: 1 },
    prestige: 3,
    distance: 1,
  },
  // 8
  {
    id: 'r_amber_copper',
    from: 'amber_gorge',
    to: 'coppervale',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 9
  {
    id: 'r_cloud_gear',
    from: 'cloudpeak',
    to: 'gearhaven',
    terrain: 'tunnel',
    cost: { coal: 2, steel: 2, gold: 0 },
    prestige: 4,
    distance: 1,
  },
  // 10
  {
    id: 'r_cloud_chronos',
    from: 'cloudpeak',
    to: 'chronos',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 11
  {
    id: 'r_gear_brass',
    from: 'gearhaven',
    to: 'brassbridge',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 12
  {
    id: 'r_gear_chronos',
    from: 'gearhaven',
    to: 'chronos',
    terrain: 'bridge',
    cost: { coal: 0, steel: 2, gold: 1 },
    prestige: 3,
    distance: 1,
  },
  // 13
  {
    id: 'r_gear_silver',
    from: 'gearhaven',
    to: 'silverlake',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 14
  {
    id: 'r_gear_vulcan',
    from: 'gearhaven',
    to: 'vulcan',
    terrain: 'bridge',
    cost: { coal: 0, steel: 2, gold: 1 },
    prestige: 3,
    distance: 1,
  },
  // 15
  {
    id: 'r_copper_brass',
    from: 'coppervale',
    to: 'brassbridge',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 16
  {
    id: 'r_copper_emerald',
    from: 'coppervale',
    to: 'emerald_farm',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 17
  {
    id: 'r_brass_emerald',
    from: 'brassbridge',
    to: 'emerald_farm',
    terrain: 'bridge',
    cost: { coal: 0, steel: 2, gold: 1 },
    prestige: 3,
    distance: 1,
  },
  // 18
  {
    id: 'r_brass_vulcan',
    from: 'brassbridge',
    to: 'vulcan',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 19
  {
    id: 'r_emerald_vulcan',
    from: 'emerald_farm',
    to: 'vulcan',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 20
  {
    id: 'r_chronos_silver',
    from: 'chronos',
    to: 'silverlake',
    terrain: 'plains',
    cost: { coal: 1, steel: 1, gold: 0 },
    prestige: 2,
    distance: 1,
  },
  // 21
  {
    id: 'r_chronos_starlight',
    from: 'chronos',
    to: 'starlight',
    terrain: 'tunnel',
    cost: { coal: 2, steel: 2, gold: 0 },
    prestige: 4,
    distance: 1,
  },
  // 22
  {
    id: 'r_silver_vulcan',
    from: 'silverlake',
    to: 'vulcan',
    terrain: 'tunnel',
    cost: { coal: 2, steel: 2, gold: 0 },
    prestige: 4,
    distance: 1,
  },
  // Bonus 22nd/23rd check: wait let's count!
  // Above is 22 routes! Let's also check if starlight connects to silverlake so starlight has 2 connections:
  // Let's replace r_steam_copper or adjust so there are exactly 22 routes and starlight has 2 connections!
];

// Let's make sure the 22 routes connect every city cleanly with at least 2 connections per city:
export const CONTINENT_ROUTES: RailwayRoute[] = [
  { id: 'r01', from: 'steamport', to: 'ironforge', terrain: 'tunnel', cost: { coal: 2, steel: 2, gold: 0 }, prestige: 4, distance: 1 },
  { id: 'r02', from: 'steamport', to: 'amber_gorge', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r03', from: 'steamport', to: 'coppervale', terrain: 'bridge', cost: { coal: 0, steel: 2, gold: 1 }, prestige: 3, distance: 1 },
  { id: 'r04', from: 'ironforge', to: 'amber_gorge', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r05', from: 'ironforge', to: 'cloudpeak', terrain: 'tunnel', cost: { coal: 2, steel: 2, gold: 0 }, prestige: 4, distance: 1 },
  { id: 'r06', from: 'amber_gorge', to: 'gearhaven', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r07', from: 'amber_gorge', to: 'brassbridge', terrain: 'bridge', cost: { coal: 0, steel: 2, gold: 1 }, prestige: 3, distance: 1 },
  { id: 'r08', from: 'amber_gorge', to: 'coppervale', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r09', from: 'cloudpeak', to: 'gearhaven', terrain: 'tunnel', cost: { coal: 2, steel: 2, gold: 0 }, prestige: 4, distance: 1 },
  { id: 'r10', from: 'cloudpeak', to: 'chronos', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r11', from: 'gearhaven', to: 'brassbridge', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r12', from: 'gearhaven', to: 'chronos', terrain: 'bridge', cost: { coal: 0, steel: 2, gold: 1 }, prestige: 3, distance: 1 },
  { id: 'r13', from: 'gearhaven', to: 'silverlake', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r14', from: 'coppervale', to: 'brassbridge', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r15', from: 'coppervale', to: 'emerald_farm', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r16', from: 'brassbridge', to: 'emerald_farm', terrain: 'bridge', cost: { coal: 0, steel: 2, gold: 1 }, prestige: 3, distance: 1 },
  { id: 'r17', from: 'brassbridge', to: 'vulcan', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r18', from: 'emerald_farm', to: 'vulcan', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r19', from: 'chronos', to: 'silverlake', terrain: 'plains', cost: { coal: 1, steel: 1, gold: 0 }, prestige: 2, distance: 1 },
  { id: 'r20', from: 'chronos', to: 'starlight', terrain: 'tunnel', cost: { coal: 2, steel: 2, gold: 0 }, prestige: 4, distance: 1 },
  { id: 'r21', from: 'silverlake', to: 'vulcan', terrain: 'tunnel', cost: { coal: 2, steel: 2, gold: 0 }, prestige: 4, distance: 1 },
  { id: 'r22', from: 'silverlake', to: 'starlight', terrain: 'bridge', cost: { coal: 0, steel: 2, gold: 1 }, prestige: 3, distance: 1 },
];

export const ROUTE_MAP: Record<string, RailwayRoute> = Object.fromEntries(
  CONTINENT_ROUTES.map((r) => [r.id, r])
);

// ============================================================================
// Steam Engine Output Levels (Lv.1 ~ Lv.5)
// ============================================================================

export interface EngineLevelSpec {
  level: number;
  name: string;
  maxDeliveryDistance: number;
  upgradeCost: { steel: number; gold: number };
  upgradePrestigeGain: number;
  incomeCoal: number;
  incomeSteel: number;
  incomeGold: number;
  unlocksFourthWorker: boolean;
}

export const ENGINE_LEVELS: Record<number, EngineLevelSpec> = {
  1: {
    level: 1,
    name: 'Lv.1 初期型単式ボイラー',
    maxDeliveryDistance: 1,
    upgradeCost: { steel: 0, gold: 0 },
    upgradePrestigeGain: 0,
    incomeCoal: 1,
    incomeSteel: 0,
    incomeGold: 1,
    unlocksFourthWorker: false,
  },
  2: {
    level: 2,
    name: 'Lv.2 複式高圧ピストン機関',
    maxDeliveryDistance: 2,
    upgradeCost: { steel: 2, gold: 2 },
    upgradePrestigeGain: 2,
    incomeCoal: 1,
    incomeSteel: 0,
    incomeGold: 2,
    unlocksFourthWorker: false,
  },
  3: {
    level: 3,
    name: 'Lv.3 王立過熱蒸気タービン',
    maxDeliveryDistance: 3,
    upgradeCost: { steel: 3, gold: 3 },
    upgradePrestigeGain: 3,
    incomeCoal: 2,
    incomeSteel: 0,
    incomeGold: 2,
    unlocksFourthWorker: true,
  },
  4: {
    level: 4,
    name: 'Lv.4 連成装甲ドレッドノート機関',
    maxDeliveryDistance: 4,
    upgradeCost: { steel: 3, gold: 4 },
    upgradePrestigeGain: 4,
    incomeCoal: 2,
    incomeSteel: 1,
    incomeGold: 3,
    unlocksFourthWorker: true,
  },
  5: {
    level: 5,
    name: 'Lv.5 クロノス超臨界永久蒸気機関',
    maxDeliveryDistance: 5,
    upgradeCost: { steel: 4, gold: 5 },
    upgradePrestigeGain: 5,
    incomeCoal: 2,
    incomeSteel: 1,
    incomeGold: 4,
    unlocksFourthWorker: true,
  },
};

// ============================================================================
// Express Delivery Contracts (`特急輸送指令書`)
// ============================================================================

export const INITIAL_CONTRACTS: DeliveryContract[] = [
  {
    id: 'c01',
    title: '王都への黒鉄石炭直行便',
    cargo: '精製無煙炭 40トン',
    fromCity: 'ironforge',
    toCity: 'gearhaven',
    minEngineLv: 2,
    rewardPrestige: 5,
    rewardGold: 3,
    rewardCoal: 1,
  },
  {
    id: 'c02',
    title: '西海岸蒸気港・輸出鋼材便',
    cargo: '高張力ボイラー鋼板',
    fromCity: 'steamport',
    toCity: 'gearhaven',
    minEngineLv: 2,
    rewardPrestige: 5,
    rewardGold: 3,
  },
  {
    id: 'c03',
    title: '中央大河・農園穀物急行',
    cargo: 'エメラルド小麦＆蒸気麦酒',
    fromCity: 'emerald_farm',
    toCity: 'gearhaven',
    minEngineLv: 2,
    rewardPrestige: 5,
    rewardGold: 3,
  },
  {
    id: 'c04',
    title: '学術都市への精密歯車輸送',
    cargo: '真鍮クロノメーター部品',
    fromCity: 'amber_gorge',
    toCity: 'chronos',
    minEngineLv: 2,
    rewardPrestige: 6,
    rewardGold: 3,
    rewardSteel: 1,
  },
  {
    id: 'c05',
    title: '溶鉱炉・銀鏡湖の重工業連絡便',
    cargo: '耐火レンガ＆タービン軸',
    fromCity: 'brassbridge',
    toCity: 'silverlake',
    minEngineLv: 2,
    rewardPrestige: 5,
    rewardGold: 3,
  },
  {
    id: 'c06',
    title: '南部銅山・大河横断貨物指令',
    cargo: '精錬赤銅インゴット',
    fromCity: 'coppervale',
    toCity: 'vulcan',
    minEngineLv: 2,
    rewardPrestige: 5,
    rewardGold: 3,
    rewardSteel: 1,
  },
  {
    id: 'c07',
    title: '北部連峰・学術観測機材輸送',
    cargo: '高圧蒸気ドリル＆天体レンズ',
    fromCity: 'ironforge',
    toCity: 'chronos',
    minEngineLv: 2,
    rewardPrestige: 6,
    rewardGold: 3,
  },
  {
    id: 'c08',
    title: '西港〜南部農園の蒸気交易路',
    cargo: '外洋スパイス＆蒸気農機',
    fromCity: 'steamport',
    toCity: 'emerald_farm',
    minEngineLv: 2,
    rewardPrestige: 5,
    rewardGold: 4,
  },
  {
    id: 'c09',
    title: '大陸横断・天文台レンズ特送',
    cargo: '口径2mエーテル反射鏡',
    fromCity: 'gearhaven',
    toCity: 'starlight',
    minEngineLv: 2,
    rewardPrestige: 7,
    rewardGold: 4,
  },
  {
    id: 'c10',
    title: '白雲連峰〜火成工業帯縦断便',
    cargo: '氷河冷却水＆超硬合金',
    fromCity: 'cloudpeak',
    toCity: 'vulcan',
    minEngineLv: 2,
    rewardPrestige: 7,
    rewardGold: 4,
    rewardCoal: 1,
  },
  {
    id: 'c11',
    title: '東西大陸横断・超特急ロイヤル号',
    cargo: '万博展示用・黄金蒸気機関車',
    fromCity: 'steamport',
    toCity: 'starlight',
    minEngineLv: 4,
    rewardPrestige: 11,
    rewardGold: 5,
  },
  {
    id: 'c12',
    title: '南北縦断・帝国重工特別編成',
    cargo: '大型装甲蒸気タービン一式',
    fromCity: 'ironforge',
    toCity: 'emerald_farm',
    minEngineLv: 3,
    rewardPrestige: 8,
    rewardGold: 4,
    rewardSteel: 1,
  },
];

// ============================================================================
// Industrial Milestone Medals (`万国博覧会・産業勲章`)
// ============================================================================

export const INITIAL_EXPO_MEDALS: ExpoMedal[] = [
  {
    id: 'm_transcontinent',
    title: '大陸鉄路開拓勲章',
    subtitle: '敷設済み鉄路リンク3本以上＋石炭2・鋼鉄2・金貨2を奉納',
    cost: { coal: 2, steel: 2, gold: 2 },
    minRoutes: 3,
    prestige: 6,
    claimedBy: null,
  },
  {
    id: 'm_steam_master',
    title: '黒鉄蒸気機関大賞',
    subtitle: '蒸気機関出力Lv.3以上＋鋼鉄2・金貨3を奉納',
    cost: { coal: 0, steel: 2, gold: 3 },
    minEngineLv: 3,
    prestige: 7,
    claimedBy: null,
  },
  {
    id: 'm_golden_pavilion',
    title: '黄金時計塔パビリオン賞',
    subtitle: '金貨6枚＋石炭1・鋼鉄1で万博記念塔を建造',
    cost: { coal: 1, steel: 1, gold: 6 },
    prestige: 7,
    claimedBy: null,
  },
  {
    id: 'm_grand_foundry',
    title: '帝国高炉マイスター勲章',
    subtitle: '石炭3・鋼鉄3を奉納して巨大蒸気パビリオンを鍛造',
    cost: { coal: 3, steel: 3, gold: 0 },
    prestige: 6,
    claimedBy: null,
  },
  {
    id: 'm_grand_prix',
    title: '万国博覧会グランプリ勲章',
    subtitle: '蒸気機関出力Lv.4以上＋石炭2・鋼鉄2・金貨4を奉納',
    cost: { coal: 2, steel: 2, gold: 4 },
    minEngineLv: 4,
    prestige: 9,
    claimedBy: null,
  },
];

// ============================================================================
// 7 Guild Facilities Metadata
// ============================================================================

export interface FacilityMeta {
  id: FacilityId;
  number: number;
  name: string;
  enName: string;
  icon: string;
  primeDesc: string;
  overtimeDesc: string;
  accentClass: string;
  borderClass: string;
}

export const FACILITIES: FacilityMeta[] = [
  {
    id: 'coal_mine',
    number: 1,
    name: '黒鉄炭鉱',
    enName: 'Black-Iron Coal Mine',
    icon: '️',
    primeDesc: '主任枠（無料）：「石炭+3」または「石炭+2 ＆ 金貨+1」を獲得',
    overtimeDesc: '残業枠（金貨1枚）：「石炭+2」を獲得',
    accentClass: 'from-[#2a211a] to-[#1d1712]',
    borderClass: 'border-[#6b543d]',
  },
  {
    id: 'steel_foundry',
    number: 2,
    name: '高炉製鉄所',
    enName: 'Blast Steel Foundry',
    icon: '',
    primeDesc: '主任枠（無料）：「鋼鉄+2」または「石炭1消費 → 鋼鉄+3」を精錬',
    overtimeDesc: '残業枠（金貨1枚）：「鋼鉄+2」を獲得',
    accentClass: 'from-[#2f1b19] to-[#1d1712]',
    borderClass: 'border-[#6b3a36]',
  },
  {
    id: 'locomotive_works',
    number: 3,
    name: '王立機関車ドック',
    enName: 'Royal Locomotive Works',
    icon: '',
    primeDesc: '主任枠（無料）：鋼鉄-1割引で「蒸気機関出力Lv」を強化（Lv.3で4人目の機関士解放！）',
    overtimeDesc: '残業枠（金貨1枚）：通常コストで「蒸気機関出力Lv」を1段階強化',
    accentClass: 'from-[#182530] to-[#131d24]',
    borderClass: 'border-[#3f5f78]',
  },
  {
    id: 'railway_construction',
    number: 4,
    name: '大陸鉄道敷設局',
    enName: 'Continental Railway Bureau',
    icon: '️',
    primeDesc: '主任枠（無料）：隣接都市間に「鉄路リンク」を最大2区間敷設（1区間目の石炭コスト-1割引）',
    overtimeDesc: '残業枠（金貨1枚）：隣接都市間に「鉄路リンク」を最大2区間敷設（通常コスト）',
    accentClass: 'from-[#14211b] to-[#131d24]',
    borderClass: 'border-[#315d4e]',
  },
  {
    id: 'freight_exchange',
    number: 5,
    name: '中央貨物取引所',
    enName: 'Central Freight Exchange',
    icon: '',
    primeDesc: '主任枠（無料）：「特急輸送指令書」の獲得 ＆ 接続済み鉄路での「貨物輸送（名声＆金貨獲得）」＋ボーナス金貨+1',
    overtimeDesc: '残業枠（金貨1枚）：「特急輸送指令書」の獲得 ＆ 接続済み鉄路での「貨物輸送」を実行',
    accentClass: 'from-[#282033] to-[#1d1712]',
    borderClass: 'border-[#5b4668]',
  },
  {
    id: 'central_bank',
    number: 6,
    name: '蒸気銀行＆総督府',
    enName: 'Steam Bank & Governorate',
    icon: '️',
    primeDesc: '主任枠（無料）：「金貨+4 ＆ 名声+1★」を獲得し、「次ラウンド先手懐中時計」を確保！',
    overtimeDesc: '残業枠（金貨1枚）：差し引き「金貨+3 ＆ 石炭+1」を獲得',
    accentClass: 'from-[#3a2a1c] to-[#241c15]',
    borderClass: 'border-[#6b543d]',
  },
  {
    id: 'grand_expo',
    number: 7,
    name: '万国博覧会パビリオン',
    enName: 'Grand Expo Pavilion',
    icon: '️',
    primeDesc: '主任枠（無料）：資材を奉納して「産業勲章（+6〜+9★）」を獲得＋主任ボーナス名声+1★',
    overtimeDesc: '残業枠（金貨1枚）：資材を奉納して「産業勲章（+6〜+9★）」を獲得',
    accentClass: 'from-[#35201e] to-[#241c15]',
    borderClass: 'border-[#6b3a36]',
  },
];

// ============================================================================
// Player Colors & Personas
// ============================================================================

const PLAYER_PALETTES = [
  {
    colorHex: '#d9a75f',
    colorName: '琥珀ブラス',
    badgeClass: 'bg-[#3a2a1c] text-[#dfb06d] border-[#6b543d]',
    borderClass: 'border-[#c99555]',
  },
  {
    colorHex: '#7fa7c0',
    colorName: '蒼鋼スチーム',
    badgeClass: 'bg-[#182530] text-[#a9c8da] border-[#3f5f78]',
    borderClass: 'border-[#3f5f78]',
  },
  {
    colorHex: '#7fae95',
    colorName: '翠銅エメラルド',
    badgeClass: 'bg-[#14211b] text-[#a9cdb7] border-[#315d4e]',
    borderClass: 'border-[#315d4e]',
  },
  {
    colorHex: '#c98d86',
    colorName: '紅鉄クリムゾン',
    badgeClass: 'bg-[#241615] text-[#e0a9a2] border-[#6b3a36]',
    borderClass: 'border-[#6b3a36]',
  },
];

const AI_PROFILES: { name: string; persona: AiPersona; desc: string }[] = [
  {
    name: '蒸気技師ヴァルカン（拡大再生産AI）',
    persona: 'engine',
    desc: '早期に機関車出力Lv.3（4人目ワーカー）へ強化し、毎期収入と万博勲章で圧倒する重工業型AI',
  },
  {
    name: '鉄路王レジーナ（幹線独占AI）',
    persona: 'network',
    desc: '王都ギアヘイヴン周辺の要衝リンクと山岳隧道をいち早く敷設し、大陸ネットワークを掌握する開拓型AI',
  },
  {
    name: '特務機関長クロノス（契約速攻AI）',
    persona: 'contract',
    desc: '特急輸送指令書の最短ルートをピンポイントで結び、高額の輸送名声と金貨を稼ぎ出す速攻型AI',
  },
];

// ============================================================================
// Network Pathfinding Helpers
// ============================================================================

/**
 * Computes shortest hop distance between `cityA` and `cityB` using only routes owned by `ownedRouteIds`.
 * Returns `null` if not connected.
 */
export function getConnectedDistance(
  ownedRouteIds: string[],
  cityA: string,
  cityB: string
): number | null {
  if (cityA === cityB) return 0;
  const ownedSet = new Set(ownedRouteIds);
  const adj: Record<string, string[]> = {};
  for (const r of CONTINENT_ROUTES) {
    if (!ownedSet.has(r.id)) continue;
    if (!adj[r.from]) adj[r.from] = [];
    if (!adj[r.to]) adj[r.to] = [];
    adj[r.from].push(r.to);
    adj[r.to].push(r.from);
  }
  const visited = new Set<string>([cityA]);
  const queue: { city: string; dist: number }[] = [{ city: cityA, dist: 0 }];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const next of adj[curr.city] ?? []) {
      if (next === cityB) return curr.dist + 1;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ city: next, dist: curr.dist + 1 });
      }
    }
  }
  return null;
}

/**
 * Returns true if the player can build `route` (either it touches an already-visited city or player has 0 routes and starts from any city, or builds adjacent to their network).
 * Note: To keep gameplay intuitive and strategic, a player's first route can be built anywhere (or touching Gearhaven/any city), and subsequent routes can be built anywhere or gain a network synergy when connected! Let's allow building any unclaimed route, and highlight routes connected to the player's existing network or contract cities!
 */
export function isRouteUnclaimed(players: PlayerState[], routeId: string): boolean {
  return !players.some((p) => p.ownedRoutes.includes(routeId));
}

export function getRouteOwner(players: PlayerState[], routeId: string): PlayerState | null {
  return players.find((p) => p.ownedRoutes.includes(routeId)) ?? null;
}

export function canFulfillContract(player: PlayerState, contract: DeliveryContract): boolean {
  if (player.engineLv < contract.minEngineLv) return false;
  const dist = getConnectedDistance(player.ownedRoutes, contract.fromCity, contract.toCity);
  return dist !== null;
}

// ============================================================================
// Web Audio Procedural Steampunk Sound & BGM Engine
// ============================================================================

class SteampunkAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playSfx(
    type: 'whistle' | 'anvil' | 'coin' | 'piston' | 'fanfare' | 'click'
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'whistle') {
      // Steam locomotive dual-chord whistle ("ポーッ！")
      const freqs = [587.33, 739.99, 880]; // D major/7th steam whistle
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f * 0.98, now);
        osc.frequency.exponentialRampToValueAtTime(f, now + 0.08);
        osc.frequency.setValueAtTime(f, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(f * 0.96, now + 0.55);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    } else if (type === 'anvil') {
      // Metallic rail spike clang
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1320, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'coin') {
      // Gold coin clink
      [1567.98, 2093.0].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.07);
        gain.gain.setValueAtTime(0.06, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.24);
      });
    } else if (type === 'piston') {
      // Low mechanical chug
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'fanfare') {
      // Grand Expo brass chord arpeggio
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.08);
        gain.gain.setValueAtTime(0.07, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.48);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  public startBgm(): void {
    if (this.bgmTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Clockwork waltz / steampunk brass bass + chime pattern
    const bassNotes = [146.83, 220.0, 174.61, 220.0, 164.81, 246.94, 146.83, 220.0];
    const melodyNotes = [587.33, 0, 659.25, 698.46, 880.0, 0, 783.99, 659.25];

    this.bgmTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const step = this.bgmStep % bassNotes.length;
      this.bgmStep += 1;

      // Clockwork tick + bass
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassNotes[step], now);
      bassGain.gain.setValueAtTime(0.022, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.38);

      const mel = melodyNotes[step];
      if (mel > 0) {
        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();
        melOsc.type = 'sine';
        melOsc.frequency.setValueAtTime(mel, now);
        melGain.gain.setValueAtTime(0.016, now);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        melOsc.connect(melGain);
        melGain.connect(this.ctx.destination);
        melOsc.start(now);
        melOsc.stop(now + 0.45);
      }
    }, 480);
  }

  public stopBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// ============================================================================
// Initial Game Setup & Helper Functions
// ============================================================================

function cloneSnapshot(s: GameSnapshot): GameSnapshot {
  return JSON.parse(JSON.stringify(s)) as GameSnapshot;
}

function createInitialGame(mode: GameMode, playerCount: number): GameSnapshot {
  const count = mode === 'pvp' ? 2 : Math.min(4, Math.max(2, playerCount));
  const contracts = [...INITIAL_CONTRACTS];

  const players: PlayerState[] = [];
  for (let i = 0; i < count; i++) {
    const palette = PLAYER_PALETTES[i];
    const isHuman = mode === 'pvp' ? true : i === 0;
    const aiProfile = AI_PROFILES[(i - 1 + AI_PROFILES.length) % AI_PROFILES.length];
    const initialContract = contracts.shift()!;

    players.push({
      id: i,
      name:
        mode === 'pvp'
          ? `プレイヤー${i + 1}（${palette.colorName}）`
          : i === 0
            ? 'あなた（主任機関士）'
            : aiProfile.name,
      isHuman,
      persona: isHuman ? undefined : aiProfile.persona,
      colorHex: palette.colorHex,
      colorName: palette.colorName,
      badgeClass: palette.badgeClass,
      borderClass: palette.borderClass,
      coal: 2,
      steel: 2,
      gold: 3 + (i >= 2 ? 1 : 0), // Turn order compensation
      prestige: 0,
      engineLv: 1,
      totalWorkers: 3,
      availableWorkers: 3,
      ownedRoutes: [],
      visitedCities: ['gearhaven'],
      activeContracts: [initialContract],
      completedContracts: [],
      claimedMedals: [],
    });
  }

  const contractMarket = contracts.splice(0, 4);

  return {
    round: 1,
    maxRounds: 6,
    currentPlayerIndex: 0,
    firstPlayerIndex: 0,
    nextFirstPlayerIndex: 0,
    pocketWatchClaimedThisRound: false,
    players,
    placements: [],
    contractMarket,
    contractDeck: contracts,
    expoMedals: INITIAL_EXPO_MEDALS.map((m) => ({ ...m })),
    logs: [
      ' 第1期（全6期）が幕を開けました！各プレイヤーに初期資材（石炭2・鋼鉄2・金貨3〜4）と初期「特急輸送指令書」1枚が配られました。',
    ],
    gameOver: false,
  };
}

export function isPrimeSlotAvailable(placements: WorkerPlacement[], facilityId: FacilityId): boolean {
  return !placements.some((w) => w.facilityId === facilityId && w.slotType === 'prime');
}

export function getRouteEffectiveCost(
  route: RailwayRoute,
  isFirstLinkOnPrime: boolean
): { coal: number; steel: number; gold: number } {
  return {
    coal: Math.max(0, route.cost.coal - (isFirstLinkOnPrime ? 1 : 0)),
    steel: route.cost.steel,
    gold: route.cost.gold,
  };
}

// ============================================================================
// AI Move Evaluation & Hint Engine (`AI推奨アクションナビ`)
// ============================================================================

export function computeBestMoveForPlayer(
  state: GameSnapshot,
  playerIndex: number
): RecommendedMove {
  const player = state.players[playerIndex];
  const persona: AiPersona = player.persona ?? 'engine';
  const candidates: RecommendedMove[] = [];

  const checkSlot = (facilityId: FacilityId): { slotType: SlotType; overtimeGold: number } | null => {
    const primeFree = isPrimeSlotAvailable(state.placements, facilityId);
    if (primeFree) return { slotType: 'prime', overtimeGold: 0 };
    if (player.gold >= 1) return { slotType: 'overtime', overtimeGold: 1 };
    return null;
  };

  // 1. Check Grand Expo Pavilion (`万国博覧会パビリオン`) - Huge Prestige!
  const expoSlot = checkSlot('grand_expo');
  if (expoSlot) {
    for (const medal of state.expoMedals) {
      if (medal.claimedBy !== null) continue;
      if (medal.minRoutes && player.ownedRoutes.length < medal.minRoutes) continue;
      if (medal.minEngineLv && player.engineLv < medal.minEngineLv) continue;
      const neededGold = medal.cost.gold + expoSlot.overtimeGold;
      if (
        player.coal >= medal.cost.coal &&
        player.steel >= medal.cost.steel &&
        player.gold >= neededGold
      ) {
        const primeBonus = expoSlot.slotType === 'prime' ? 1 : 0;
        candidates.push({
          facilityId: 'grand_expo',
          slotType: expoSlot.slotType,
          medalId: medal.id,
          title: `万国博覧会パビリオン（${medal.title}を獲得）`,
          reason: `条件を満たしている産業勲章「${medal.title}」を奉納し、一気に+${medal.prestige + primeBonus}★の名声を確定させます！`,
          score: (medal.prestige + primeBonus) * 14,
        });
      }
    }
  }

  // 2. Check Central Freight Exchange (`中央貨物取引所`) - Fulfill Ready Contracts!
  const freightSlot = checkSlot('freight_exchange');
  if (freightSlot) {
    const fulfillable = player.activeContracts.find((c) => canFulfillContract(player, c));
    if (fulfillable) {
      const primeGold = freightSlot.slotType === 'prime' ? 1 : 0;
      candidates.push({
        facilityId: 'freight_exchange',
        slotType: freightSlot.slotType,
        contractIdToFulfill: fulfillable.id,
        contractIdToTake: state.contractMarket[0]?.id,
        title: `中央貨物取引所（「${fulfillable.title}」の特急輸送達成！）`,
        reason: `${CITY_MAP[fulfillable.fromCity].shortName}〜${CITY_MAP[fulfillable.toCity].shortName}間の鉄路が開通しており、名声+${fulfillable.rewardPrestige}★と金貨+${fulfillable.rewardGold + primeGold}を獲得できます！`,
        score: fulfillable.rewardPrestige * 15 + fulfillable.rewardGold * 4 + (persona === 'contract' ? 20 : 8),
      });
    } else if (player.activeContracts.length < 2 && state.contractMarket.length > 0 && player.ownedRoutes.length >= 1) {
      const bestContract = state.contractMarket[0];
      candidates.push({
        facilityId: 'freight_exchange',
        slotType: freightSlot.slotType,
        contractIdToTake: bestContract.id,
        title: `中央貨物取引所（新規指令書「${bestContract.title}」獲得＋ローカル輸送）`,
        reason: `新たな特急輸送指令書を確保しつつ、既存路線でのローカル貨物輸送（名声+2★・金貨+2）を行います。`,
        score: 36 + (persona === 'contract' ? 14 : 0),
      });
    }
  }

  // 3. Check Continental Railway Construction (`大陸鉄道敷設局`)
  const railSlot = checkSlot('railway_construction');
  if (railSlot) {
    const isPrime = railSlot.slotType === 'prime';
    const unclaimed = CONTINENT_ROUTES.filter((r) => isRouteUnclaimed(state.players, r.id));

    // Find cities mentioned in player's active contracts
    const targetCities = new Set<string>();
    for (const c of player.activeContracts) {
      targetCities.add(c.fromCity);
      targetCities.add(c.toCity);
    }

    for (const route of unclaimed) {
      const effCost = getRouteEffectiveCost(route, isPrime);
      const totalGold = effCost.gold + railSlot.overtimeGold;
      if (
        player.coal >= effCost.coal &&
        player.steel >= effCost.steel &&
        player.gold >= totalGold
      ) {
        const touchesNetwork =
          player.visitedCities.includes(route.from) ||
          player.visitedCities.includes(route.to);
        const touchesContract =
          targetCities.has(route.from) || targetCities.has(route.to);

        // Does this route directly complete an active contract?
        const simulatedRoutes = [...player.ownedRoutes, route.id];
        const completesContract = player.activeContracts.some(
          (c) =>
            getConnectedDistance(simulatedRoutes, c.fromCity, c.toCity) !== null
        );

        let routeScore = route.prestige * 11 + (touchesNetwork ? 14 : 0) + (touchesContract ? 18 : 0);
        if (completesContract) routeScore += 38;
        if (persona === 'network') routeScore += 14;

        candidates.push({
          facilityId: 'railway_construction',
          slotType: railSlot.slotType,
          routeId: route.id,
          title: `大陸鉄道敷設局（${CITY_MAP[route.from].shortName} ⇄ ${CITY_MAP[route.to].shortName} 敷設）`,
          reason: completesContract
            ? `この区間を敷設すると手持ちの「特急輸送指令書」のルートが開通します！即座に名声+${route.prestige}★と都市到着ボーナスも獲得。`
            : `要衝区間「${CITY_MAP[route.from].shortName}〜${CITY_MAP[route.to].shortName}」を敷設して名声+${route.prestige}★と都市ボーナスを獲得します。`,
          score: routeScore,
        });
      }
    }
  }

  // 4. Check Royal Locomotive Works (`王立機関車ドック`)
  const locoSlot = checkSlot('locomotive_works');
  if (locoSlot && player.engineLv < 5) {
    const nextSpec = ENGINE_LEVELS[player.engineLv + 1];
    const steelCost = Math.max(
      1,
      nextSpec.upgradeCost.steel - (locoSlot.slotType === 'prime' ? 1 : 0)
    );
    const goldCost = nextSpec.upgradeCost.gold + locoSlot.overtimeGold;
    if (player.steel >= steelCost && player.gold >= goldCost) {
      const unlocksWorker = player.engineLv + 1 === 3;
      const roundsLeft = state.maxRounds - state.round + 1;
      const score =
        nextSpec.upgradePrestigeGain * 10 +
        roundsLeft * 9 +
        (unlocksWorker ? 35 : 0) +
        (persona === 'engine' ? 18 : 0);
      candidates.push({
        facilityId: 'locomotive_works',
        slotType: locoSlot.slotType,
        title: `王立機関車ドック（蒸気機関出力 Lv.${player.engineLv + 1} へ強化）`,
        reason: unlocksWorker
          ? `出力Lv.3到達により「4人目の機関士ワーカー」が即座に解放され、名声+${nextSpec.upgradePrestigeGain}★と毎期収入も大幅増加します！`
          : `蒸気機関出力をLv.${player.engineLv + 1}に高め、名声+${nextSpec.upgradePrestigeGain}★と毎期の資源・金貨収入を強化します。`,
        score,
      });
    }
  }

  // 5. Check Black-Iron Coal Mine (`黒鉄炭鉱`)
  const coalSlot = checkSlot('coal_mine');
  if (coalSlot) {
    const scarcityBonus = player.coal <= 1 ? 26 : 8;
    candidates.push({
      facilityId: 'coal_mine',
      slotType: coalSlot.slotType,
      subChoice: 'standard',
      title: `黒鉄炭鉱（${coalSlot.slotType === 'prime' ? '主任枠：石炭+3' : '残業枠：石炭+2'}）`,
      reason: `鉄道敷設と山岳隧道開削に不可欠な石炭燃料を補充します（現在所持: ${player.coal}個）。`,
      score: 24 + scarcityBonus + (coalSlot.slotType === 'prime' ? 10 : 0),
    });
  }

  // 6. Check Blast Steel Foundry (`高炉製鉄所`)
  const steelSlot = checkSlot('steel_foundry');
  if (steelSlot) {
    const canConvert = steelSlot.slotType === 'prime' && player.coal >= 2;
    const scarcityBonus = player.steel <= 1 ? 28 : 10;
    candidates.push({
      facilityId: 'steel_foundry',
      slotType: steelSlot.slotType,
      subChoice: canConvert ? 'alt' : 'standard',
      title: `高炉製鉄所（${canConvert ? '主任枠：石炭1→鋼鉄+3精錬' : '鋼鉄+2獲得'}）`,
      reason: `鉄路敷設・鉄橋架橋・機関車ドック強化のすべてで必要となる鋼鉄を確保します（現在所持: ${player.steel}個）。`,
      score: 25 + scarcityBonus + (steelSlot.slotType === 'prime' ? 11 : 0),
    });
  }

  // 7. Check Steam Bank & Governorate (`蒸気銀行＆総督府`)
  const bankSlot = checkSlot('central_bank');
  if (bankSlot) {
    const goldNeed = player.gold <= 2 ? 25 : 8;
    const isPrime = bankSlot.slotType === 'prime';
    candidates.push({
      facilityId: 'central_bank',
      slotType: bankSlot.slotType,
      title: `蒸気銀行＆総督府（${isPrime ? '金貨+4・名声+1★・先手懐中時計' : '差し引き金貨+3・石炭+1'}）`,
      reason: isPrime
        ? `金貨+4と名声+1★を獲得しつつ、次ラウンドの先手権（懐中時計）を確保します！`
        : `運転資金となる金貨+3と石炭+1を確実に補充します。`,
      score: 22 + goldNeed + (isPrime ? 15 : 0),
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return (
    candidates[0] ?? {
      facilityId: 'coal_mine',
      slotType: 'prime',
      title: '黒鉄炭鉱（石炭補充）',
      reason: '基本資材である石炭を確保します。',
      score: 10,
    }
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ClockworkRailwaysGame() {
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [playerCount, setPlayerCount] = useState<number>(3);
  const [state, setState] = useState<GameSnapshot>(() => createInitialGame('cpu', 3));
  const [history, setHistory] = useState<GameSnapshot[]>([]);

  // Selection UI state for the active human turn
  const [selectedFacility, setSelectedFacility] = useState<FacilityId>('railway_construction');
  const [coalChoice, setCoalChoice] = useState<'coal3' | 'coal2gold1'>('coal3');
  const [steelChoice, setSteelChoice] = useState<'steel2' | 'convert3'>('steel2');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('r06');
  const [secondRouteId, setSecondRouteId] = useState<string>('');
  const [selectedContractToTake, setSelectedContractToTake] = useState<string>('');
  const [selectedContractToFulfill, setSelectedContractToFulfill] = useState<string>('');
  const [selectedMedalId, setSelectedMedalId] = useState<string>('m_transcontinent');
  const [showHint, setShowHint] = useState<boolean>(true);
  const [hoveredCityId, setHoveredCityId] = useState<string | null>(null);

  // Audio state
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const audioRef = useRef<SteampunkAudioEngine | null>(null);

  useEffect(() => {
    audioRef.current = new SteampunkAudioEngine();
    return () => {
      audioRef.current?.stopBgm();
    };
  }, []);

  const triggerSfx = useCallback(
    (type: 'whistle' | 'anvil' | 'coin' | 'piston' | 'fanfare' | 'click') => {
      if (!sfxEnabled) return;
      audioRef.current?.playSfx(type);
    },
    [sfxEnabled]
  );

  const toggleBgm = useCallback(() => {
    setBgmEnabled((prev) => {
      const next = !prev;
      if (next) {
        audioRef.current?.startBgm();
      } else {
        audioRef.current?.stopBgm();
      }
      return next;
    });
  }, []);

  const currentPlayer = state.players[state.currentPlayerIndex];

  // Keep default selections valid
  useEffect(() => {
    const unclaimed = CONTINENT_ROUTES.find((r) => isRouteUnclaimed(state.players, r.id));
    if (unclaimed && !isRouteUnclaimed(state.players, selectedRouteId)) {
      setSelectedRouteId(unclaimed.id);
    }
    if (secondRouteId && !isRouteUnclaimed(state.players, secondRouteId)) {
      setSecondRouteId('');
    }
    if (state.contractMarket.length > 0 && !state.contractMarket.some((c) => c.id === selectedContractToTake)) {
      setSelectedContractToTake(state.contractMarket[0].id);
    }
    const fulfillable = currentPlayer?.activeContracts.find((c) =>
      canFulfillContract(currentPlayer, c)
    );
    if (fulfillable) {
      setSelectedContractToFulfill(fulfillable.id);
    } else {
      setSelectedContractToFulfill('');
    }
    const openMedal = state.expoMedals.find((m) => m.claimedBy === null);
    if (openMedal && !state.expoMedals.some((m) => m.id === selectedMedalId && m.claimedBy === null)) {
      setSelectedMedalId(openMedal.id);
    }
  }, [state, currentPlayer, selectedRouteId, secondRouteId, selectedContractToTake, selectedMedalId]);

  const recommendedMove = useMemo(
    () => computeBestMoveForPlayer(state, state.currentPlayerIndex),
    [state]
  );

  // ============================================================================
  // Advance Turn / Round Transition Logic
  // ============================================================================

  const advanceTurnOrRound = useCallback((next: GameSnapshot) => {
    const count = next.players.length;
    // Check if any player still has availableWorkers > 0
    const anyWorkersLeft = next.players.some((p) => p.availableWorkers > 0);

    if (anyWorkersLeft) {
      for (let offset = 1; offset <= count; offset++) {
        const idx = (next.currentPlayerIndex + offset) % count;
        if (next.players[idx].availableWorkers > 0) {
          next.currentPlayerIndex = idx;
          return;
        }
      }
    }

    // All workers placed for this round!
    if (next.round >= next.maxRounds) {
      // Game Over! Calculate final end-of-game bonuses:
      // +1★ per 3 leftover resources/gold, +2★ for Longest Network (most routes)
      const maxRoutes = Math.max(...next.players.map((p) => p.ownedRoutes.length));
      next.players.forEach((p) => {
        const resourceBonus = Math.floor((p.coal + p.steel + p.gold) / 4);
        const networkBonus =
          maxRoutes > 0 && p.ownedRoutes.length === maxRoutes ? 3 : 0;
        p.prestige += resourceBonus + networkBonus;
        next.logs.unshift(
          ` 【最終決算】${p.name}：残余資材ボーナス+${resourceBonus}★${networkBonus > 0 ? `・最大鉄路網ボーナス+${networkBonus}★` : ''} → 最終名声 ${p.prestige}★！`
        );
      });
      next.gameOver = true;
      return;
    }

    // Advance to next round & distribute Steam Engine Output Income
    next.round += 1;
    next.placements = [];
    next.firstPlayerIndex = next.nextFirstPlayerIndex;
    next.currentPlayerIndex = next.firstPlayerIndex;
    next.pocketWatchClaimedThisRound = false;

    next.players.forEach((p) => {
      const spec = ENGINE_LEVELS[p.engineLv];
      p.coal += spec.incomeCoal;
      p.steel += spec.incomeSteel;
      p.gold += spec.incomeGold;
      p.availableWorkers = p.totalWorkers;
    });

    next.logs.unshift(
      ` 第${next.round}期（全${next.maxRounds}期）開始！全機関士ワーカーが帰還し、各自の「蒸気機関出力」に応じた定期収入が支給されました。先手は ${next.players[next.firstPlayerIndex].name} です。`
    );
  }, []);

  // ============================================================================
  // Execute Worker Placement Action
  // ============================================================================

  const applyCityArrivalBonus = (
    player: PlayerState,
    cityId: string,
    logs: string[]
  ) => {
    if (player.visitedCities.includes(cityId)) return;
    player.visitedCities.push(cityId);
    const city = CITY_MAP[cityId];
    if (!city) return;
    if (city.arrivalBonus.coal) player.coal += city.arrivalBonus.coal;
    if (city.arrivalBonus.steel) player.steel += city.arrivalBonus.steel;
    if (city.arrivalBonus.gold) player.gold += city.arrivalBonus.gold;
    if (city.arrivalBonus.prestige) player.prestige += city.arrivalBonus.prestige;
    logs.unshift(
      ` ${player.name} が新都市「${city.name}」に鉄路を接続！初到達ボーナス（${city.arrivalBonusText}）を獲得！`
    );
  };

  const executeAction = useCallback(
    (
      facilityId: FacilityId,
      options?: {
        coalMode?: 'coal3' | 'coal2gold1';
        steelMode?: 'steel2' | 'convert3';
        route1?: string;
        route2?: string;
        takeContractId?: string;
        fulfillContractId?: string;
        medalId?: string;
      }
    ): boolean => {
      if (state.gameOver) return false;
      const next = cloneSnapshot(state);
      const player = next.players[next.currentPlayerIndex];
      if (player.availableWorkers <= 0) return false;

      const primeFree = isPrimeSlotAvailable(next.placements, facilityId);
      const slotType: SlotType = primeFree ? 'prime' : 'overtime';
      const overtimeCost = slotType === 'overtime' ? 1 : 0;

      if (player.gold < overtimeCost) {
        return false;
      }

      // Facility-specific validation & execution
      if (facilityId === 'coal_mine') {
        player.gold -= overtimeCost;
        if (slotType === 'prime') {
          if (options?.coalMode === 'coal2gold1') {
            player.coal += 2;
            player.gold += 1;
            next.logs.unshift(
              `️ ${player.name} が【黒鉄炭鉱・主任枠】に機関士を配置し、石炭+2・金貨+1を獲得しました。`
            );
          } else {
            player.coal += 3;
            next.logs.unshift(
              `️ ${player.name} が【黒鉄炭鉱・主任枠】に機関士を配置し、石炭+3を獲得しました。`
            );
          }
        } else {
          player.coal += 2;
          next.logs.unshift(
            `️ ${player.name} が【黒鉄炭鉱・残業枠（金貨-1）】に機関士を配置し、石炭+2を獲得しました。`
          );
        }
        triggerSfx('piston');
      } else if (facilityId === 'steel_foundry') {
        if (slotType === 'prime' && options?.steelMode === 'convert3') {
          if (player.coal < 1) return false;
          player.coal -= 1;
          player.steel += 3;
          next.logs.unshift(
            ` ${player.name} が【高炉製鉄所・主任枠】で石炭1を投入し、高純度鋼鉄+3を精錬しました！`
          );
        } else {
          player.gold -= overtimeCost;
          player.steel += 2;
          next.logs.unshift(
            ` ${player.name} が【高炉製鉄所・${slotType === 'prime' ? '主任枠' : '残業枠'}】で鋼鉄+2を獲得しました。`
          );
        }
        triggerSfx('anvil');
      } else if (facilityId === 'locomotive_works') {
        if (player.engineLv >= 5) return false;
        const nextSpec = ENGINE_LEVELS[player.engineLv + 1];
        const reqSteel = Math.max(
          1,
          nextSpec.upgradeCost.steel - (slotType === 'prime' ? 1 : 0)
        );
        const reqGold = nextSpec.upgradeCost.gold + overtimeCost;
        if (player.steel < reqSteel || player.gold < reqGold) return false;

        player.steel -= reqSteel;
        player.gold -= reqGold;
        player.engineLv += 1;
        player.prestige += nextSpec.upgradePrestigeGain;

        let workerMsg = '';
        if (player.engineLv === 3 && player.totalWorkers < 4) {
          player.totalWorkers = 4;
          player.availableWorkers += 1;
          workerMsg = ' さらに「4人目の機関士ワーカー」が即座に解放されました！';
        }

        next.logs.unshift(
          ` ${player.name} が【王立機関車ドック】で蒸気機関出力を「Lv.${player.engineLv}」へ強化！名声+${nextSpec.upgradePrestigeGain}★を獲得！${workerMsg}`
        );
        triggerSfx('whistle');
      } else if (facilityId === 'railway_construction') {
        const r1Id = options?.route1 || selectedRouteId;
        const r1 = ROUTE_MAP[r1Id];
        if (!r1 || !isRouteUnclaimed(next.players, r1.id)) return false;

        const r2Id = options?.route2 || '';
        const r2 = r2Id && r2Id !== r1Id ? ROUTE_MAP[r2Id] : undefined;
        if (r2 && !isRouteUnclaimed(next.players, r2.id)) return false;

        const cost1 = getRouteEffectiveCost(r1, slotType === 'prime');
        const cost2 = r2 ? r2.cost : { coal: 0, steel: 0, gold: 0 };

        const totalCoal = cost1.coal + cost2.coal;
        const totalSteel = cost1.steel + cost2.steel;
        const totalGold = cost1.gold + cost2.gold + overtimeCost;

        if (
          player.coal < totalCoal ||
          player.steel < totalSteel ||
          player.gold < totalGold
        ) {
          return false;
        }

        player.coal -= totalCoal;
        player.steel -= totalSteel;
        player.gold -= totalGold;

        player.ownedRoutes.push(r1.id);
        player.prestige += r1.prestige;
        applyCityArrivalBonus(player, r1.from, next.logs);
        applyCityArrivalBonus(player, r1.to, next.logs);

        if (r2) {
          player.ownedRoutes.push(r2.id);
          player.prestige += r2.prestige;
          applyCityArrivalBonus(player, r2.from, next.logs);
          applyCityArrivalBonus(player, r2.to, next.logs);
          next.logs.unshift(
            `️ ${player.name} が【大陸鉄道敷設局】で2区間（「${CITY_MAP[r1.from].shortName}〜${CITY_MAP[r1.to].shortName}」＆「${CITY_MAP[r2.from].shortName}〜${CITY_MAP[r2.to].shortName}」）を同時敷設！名声+${r1.prestige + r2.prestige}★！`
          );
        } else {
          next.logs.unshift(
            `️ ${player.name} が【大陸鉄道敷設局】で「${CITY_MAP[r1.from].shortName} ⇄ ${CITY_MAP[r1.to].shortName}」に鉄路を敷設！名声+${r1.prestige}★！`
          );
        }
        triggerSfx('anvil');
      } else if (facilityId === 'freight_exchange') {
        player.gold -= overtimeCost;
        if (slotType === 'prime') {
          player.gold += 1;
        }

        let didSomething = false;
        const fulfillId = options?.fulfillContractId ?? selectedContractToFulfill;
        const contractIdx = player.activeContracts.findIndex(
          (c) => c.id === fulfillId && canFulfillContract(player, c)
        );

        if (contractIdx >= 0) {
          const fulfilled = player.activeContracts.splice(contractIdx, 1)[0];
          player.completedContracts.push(fulfilled);
          player.prestige += fulfilled.rewardPrestige;
          player.gold += fulfilled.rewardGold;
          if (fulfilled.rewardCoal) player.coal += fulfilled.rewardCoal;
          if (fulfilled.rewardSteel) player.steel += fulfilled.rewardSteel;
          didSomething = true;
          next.logs.unshift(
            ` ${player.name} が特急輸送指令「${fulfilled.title}」を達成！名声+${fulfilled.rewardPrestige}★・金貨+${fulfilled.rewardGold}を獲得！`
          );
          triggerSfx('whistle');
        }

        const takeId = options?.takeContractId ?? selectedContractToTake;
        if (player.activeContracts.length < 3 && takeId) {
          const marketIdx = next.contractMarket.findIndex((c) => c.id === takeId);
          if (marketIdx >= 0) {
            const taken = next.contractMarket.splice(marketIdx, 1)[0];
            player.activeContracts.push(taken);
            if (next.contractDeck.length > 0) {
              next.contractMarket.push(next.contractDeck.shift()!);
            }
            didSomething = true;
            next.logs.unshift(
              ` ${player.name} が新規指令書「${taken.title}（${CITY_MAP[taken.fromCity].shortName}→${CITY_MAP[taken.toCity].shortName}）」を受注しました。`
            );
          }
        }

        // Local freight bonus if no express contract was fulfilled this action
        if (contractIdx < 0) {
          const localPrestige = player.ownedRoutes.length > 0 ? 2 : 1;
          const localGold = 2;
          player.prestige += localPrestige;
          player.gold += localGold;
          didSomething = true;
          next.logs.unshift(
            ` ${player.name} が【中央貨物取引所】で定期貨物便を運行し、名声+${localPrestige}★・金貨+${localGold}を獲得しました。`
          );
          triggerSfx('coin');
        }

        if (!didSomething) return false;
      } else if (facilityId === 'central_bank') {
        player.gold -= overtimeCost;
        if (slotType === 'prime') {
          player.gold += 4;
          player.prestige += 1;
          next.nextFirstPlayerIndex = player.id;
          next.pocketWatchClaimedThisRound = true;
          next.logs.unshift(
            `️ ${player.name} が【蒸気銀行＆総督府・主任枠】で金貨+4・名声+1★と「次ラウンド先手懐中時計」を獲得しました！`
          );
        } else {
          player.gold += 4; // net +3 after 1 overtime cost
          player.coal += 1;
          next.logs.unshift(
            `️ ${player.name} が【蒸気銀行＆総督府・残業枠】で差し引き金貨+3・石炭+1を獲得しました。`
          );
        }
        triggerSfx('coin');
      } else if (facilityId === 'grand_expo') {
        const targetMedalId = options?.medalId || selectedMedalId;
        const medal = next.expoMedals.find(
          (m) => m.id === targetMedalId && m.claimedBy === null
        );
        if (!medal) return false;
        if (medal.minRoutes && player.ownedRoutes.length < medal.minRoutes) {
          return false;
        }
        if (medal.minEngineLv && player.engineLv < medal.minEngineLv) {
          return false;
        }
        const totalGold = medal.cost.gold + overtimeCost;
        if (
          player.coal < medal.cost.coal ||
          player.steel < medal.cost.steel ||
          player.gold < totalGold
        ) {
          return false;
        }

        player.coal -= medal.cost.coal;
        player.steel -= medal.cost.steel;
        player.gold -= totalGold;
        const primeBonus = slotType === 'prime' ? 1 : 0;
        player.prestige += medal.prestige + primeBonus;
        player.claimedMedals.push(medal.id);
        medal.claimedBy = player.id;

        next.logs.unshift(
          `️ ${player.name} が【万国博覧会パビリオン】で産業勲章「${medal.title}」を授与されました！名声+${medal.prestige + primeBonus}★！`
        );
        triggerSfx('fanfare');
      }

      // Consume 1 Engineer Worker & record placement
      player.availableWorkers -= 1;
      next.placements.push({
        playerId: player.id,
        facilityId,
        slotType,
        round: next.round,
      });

      // Save undo snapshot if human acted
      if (player.isHuman) {
        setHistory((prev) => [...prev.slice(-14), cloneSnapshot(state)]);
      }

      advanceTurnOrRound(next);
      setState(next);
      return true;
    },
    [
      state,
      selectedRouteId,
      selectedContractToTake,
      selectedContractToFulfill,
      selectedMedalId,
      advanceTurnOrRound,
      triggerSfx,
    ]
  );

  // ============================================================================
  // AI Turn Automation
  // ============================================================================

  useEffect(() => {
    if (state.gameOver) return;
    const active = state.players[state.currentPlayerIndex];
    if (!active || active.isHuman) return;

    const timer = window.setTimeout(() => {
      const move = computeBestMoveForPlayer(state, state.currentPlayerIndex);
      const ok = executeAction(move.facilityId, {
        coalMode: move.subChoice === 'alt' ? 'coal2gold1' : 'coal3',
        steelMode: move.subChoice === 'alt' ? 'convert3' : 'steel2',
        route1: move.routeId,
        route2: move.secondRouteId,
        takeContractId: move.contractIdToTake,
        fulfillContractId: move.contractIdToFulfill,
        medalId: move.medalId,
      });
      if (!ok) {
        // Fallback to coal mine or central bank
        const fallbackOk = executeAction('coal_mine');
        if (!fallbackOk) {
          executeAction('central_bank');
        }
      }
    }, 620);

    return () => window.clearTimeout(timer);
  }, [state, executeAction]);

  // ============================================================================
  // Handlers (Undo, New Game, Apply Hint)
  // ============================================================================

  const handleNewGame = useCallback(
    (newMode: GameMode, newCount: number) => {
      setGameMode(newMode);
      setPlayerCount(newCount);
      setHistory([]);
      setState(createInitialGame(newMode, newCount));
      triggerSfx('whistle');
    },
    [triggerSfx]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setState(prev);
    triggerSfx('click');
  }, [history, triggerSfx]);

  const handleApplyRecommendedMove = useCallback(() => {
    if (!currentPlayer?.isHuman || state.gameOver) return;
    setSelectedFacility(recommendedMove.facilityId);
    if (recommendedMove.routeId) setSelectedRouteId(recommendedMove.routeId);
    if (recommendedMove.contractIdToTake) setSelectedContractToTake(recommendedMove.contractIdToTake);
    if (recommendedMove.contractIdToFulfill) setSelectedContractToFulfill(recommendedMove.contractIdToFulfill);
    if (recommendedMove.medalId) setSelectedMedalId(recommendedMove.medalId);
    triggerSfx('click');
  }, [currentPlayer, state.gameOver, recommendedMove, triggerSfx]);

  // Cities needed by current player's active contracts
  const highlightedContractCities = useMemo(() => {
    const s = new Set<string>();
    for (const c of currentPlayer?.activeContracts ?? []) {
      s.add(c.fromCity);
      s.add(c.toCity);
    }
    return s;
  }, [currentPlayer]);

  // Winner calculation when gameOver
  const rankedPlayers = useMemo(() => {
    return [...state.players].sort((a, b) => {
      if (b.prestige !== a.prestige) return b.prestige - a.prestige;
      if (b.ownedRoutes.length !== a.ownedRoutes.length) {
        return b.ownedRoutes.length - a.ownedRoutes.length;
      }
      return b.gold - a.gold;
    });
  }, [state.players]);

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
                <span className="tabletop-kicker">Clockwork Railways</span>
                <span className="tabletop-chip inline-flex min-h-7 items-center px-2.5 text-[11px]">
                  第 {state.round} / {state.maxRounds} 期
                </span>
              </div>
              <h2 className="tabletop-title truncate text-lg sm:text-xl">蒸気機関の鉄路王</h2>
              <p className="tabletop-muted hidden text-[13px] sm:block">
                機関士ワーカー配置と12都市・22路線の鉄路ネットワーク開拓
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Mode Switcher */}
            {([2, 3, 4] as const).map((cnt) => (
              <button
                key={`cpu-${cnt}`}
                type="button"
                onClick={() => handleNewGame('cpu', cnt)}
                className={`inline-flex min-h-11 items-center px-2.5 text-xs font-semibold transition ${
                  gameMode === 'cpu' && playerCount === cnt
                    ? 'tabletop-chip tabletop-chip-active border font-bold'
                    : 'tabletop-chip'
                }`}
              >
                CPU {cnt}人
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNewGame('pvp', 2)}
              className={`inline-flex min-h-11 items-center px-2.5 text-xs font-semibold transition ${
                gameMode === 'pvp'
                  ? 'tabletop-chip tabletop-chip-active border font-bold'
                  : 'tabletop-chip'
              }`}
            >
              1台2人
            </button>

            {/* Undo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="tabletop-button inline-flex min-h-11 items-center px-2.5 text-xs disabled:pointer-events-none disabled:opacity-40"
            >
               1手戻す
            </button>

            {/* Hint Toggle */}
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className={`inline-flex min-h-11 items-center px-2.5 text-xs font-semibold transition ${
                showHint ? 'tabletop-chip tabletop-chip-active border font-bold' : 'tabletop-chip'
              }`}
            >
               AI推奨ナビ {showHint ? 'ON' : 'OFF'}
            </button>

            {/* BGM Toggle */}
            <button
              type="button"
              onClick={toggleBgm}
              className={`inline-flex min-h-11 items-center px-3 text-xs font-semibold transition ${
                bgmEnabled ? 'tabletop-chip tabletop-chip-active border font-bold' : 'tabletop-chip'
              }`}
            >
               BGM {bgmEnabled ? 'ON' : 'OFF'}
            </button>

            {/* SFX Toggle */}
            <button
              type="button"
              onClick={() => setSfxEnabled((v) => !v)}
              className={`inline-flex min-h-11 items-center px-3 text-xs font-semibold transition ${
                sfxEnabled ? 'tabletop-chip tabletop-chip-active border font-bold' : 'tabletop-chip'
              }`}
            >
               効果音 {sfxEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => handleNewGame(gameMode, playerCount)}
              className="tabletop-button-primary inline-flex min-h-11 items-center px-3 text-xs font-bold"
            >
              ↻ 新規対局
            </button>

            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-6">
        {/* Round Banner & Player Dashboards */}
        <section className="tabletop-panel p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#4d3d2d] pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabletop-chip tabletop-chip-active inline-flex min-h-7 items-center px-2.5 text-[11px] font-bold">
                ️ 第 {state.round} / {state.maxRounds} 期
              </span>
              <span className="text-xs text-[#b9a88f]">
                現在の手番：
                <strong className="ml-1 text-[#dfb06d]">{currentPlayer.name}</strong>
                {!currentPlayer.isHuman && (
                  <span className="ml-2 rounded-sm border border-[#4d3d2d] bg-[#2a211a] px-2 py-0.5 text-[11px] text-[#b9a88f]">
                    AI思考中…
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#b9a88f]">
              <span>
                ️ 次ラウンド先手：
                <strong className="ml-1 text-[#dfb06d]">
                  {state.players[state.nextFirstPlayerIndex]?.name}
                </strong>
              </span>
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {state.players.map((p, idx) => {
              const isCurrent = idx === state.currentPlayerIndex && !state.gameOver;
              const engineSpec = ENGINE_LEVELS[p.engineLv];
              return (
                <div
                  key={p.id}
                  className={`rounded-md border p-3 transition ${
                    isCurrent
                      ? 'border-[#c99555] bg-[#2a211a] ring-1 ring-[#c99555]'
                      : 'tabletop-panel-soft'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border border-[#6b543d]"
                        style={{ backgroundColor: p.colorHex }}
                      />
                      <span className="text-xs font-bold text-[#e8dcc8]">{p.name}</span>
                    </div>
                    <span className="tabletop-chip inline-flex min-h-6 items-center px-2 text-[11px] font-bold">
                      ★ {p.prestige} 名声
                    </span>
                  </div>

                  {/* Resources & Workers */}
                  <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-[11px]">
                    <div className="rounded-sm border border-[#6b543d] bg-[#2a211a] px-1.5 py-1">
                      <div className="text-[#b9a88f]">️石炭</div>
                      <div className="font-bold text-[#dfb06d]">{p.coal}</div>
                    </div>
                    <div className="rounded-sm border border-[#3f5f78] bg-[#182530] px-1.5 py-1">
                      <div className="text-[#a9c8da]">鋼鉄</div>
                      <div className="font-bold text-[#d6e4ed]">{p.steel}</div>
                    </div>
                    <div className="rounded-sm border border-[#6b543d] bg-[#3a2a1c] px-1.5 py-1">
                      <div className="text-[#c99555]">金貨</div>
                      <div className="font-bold text-[#f0d9ae]">{p.gold}</div>
                    </div>
                    <div className="rounded-sm border border-[#315d4e] bg-[#14211b] px-1.5 py-1">
                      <div className="text-[#a9cdb7]">機関士</div>
                      <div className="font-bold text-[#cfe4d8]">
                        {p.availableWorkers}/{p.totalWorkers}
                      </div>
                    </div>
                  </div>

                  {/* Steam Engine Output & Network Stats */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#b9a88f]">
                    <span className="rounded-sm border border-[#4d3d2d] bg-[#241c15] px-2 py-0.5 font-semibold text-[#d8cbb8]">
                       機関出力 Lv.{p.engineLv}（毎期 炭+{engineSpec.incomeCoal}
                      {engineSpec.incomeSteel > 0 ? `/鋼+${engineSpec.incomeSteel}` : ''}/金+
                      {engineSpec.incomeGold}）
                    </span>
                    <span>
                      ️ 鉄路 {p.ownedRoutes.length}本 /  契約 {p.completedContracts.length}件
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Game Over Victory Modal Banner */}
        {state.gameOver && (
          <section className="tabletop-panel space-y-4 border-[#6b543d] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="tabletop-kicker !text-[11px]">
                  Grand Steam Industrial Revolution Completed
                </span>
                <h2 className="tabletop-title mt-1 text-xl sm:text-2xl">
                   第6期終了！優勝：{rankedPlayers[0]?.name}（最終名声 ★{rankedPlayers[0]?.prestige}）
                </h2>
                <p className="mt-1 text-xs text-[#c9b79d]">
                  残余資材ボーナス（合計4個につき+1★）および最大鉄路網ボーナス（+3★）を加算した最終順位です。
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleNewGame(gameMode, playerCount)}
                className="tabletop-button-primary inline-flex min-h-11 items-center px-5 text-sm font-bold"
              >
                 もう一度対局する
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {rankedPlayers.map((p, rank) => (
                <div
                  key={p.id}
                  className="tabletop-panel-soft p-3 text-xs"
                >
                  <div className="font-bold text-[#dfb06d]">
                    第{rank + 1}位：{p.name}
                  </div>
                  <div className="mt-1 text-base font-bold text-[#f4ead8]">
                    ★ {p.prestige} 名声点
                  </div>
                  <div className="mt-1 text-[11px] text-[#b9a88f]">
                    敷設鉄路 {p.ownedRoutes.length}本 / 機関出力 Lv.{p.engineLv} / 契約{' '}
                    {p.completedContracts.length}件 / 勲章 {p.claimedMedals.length}個
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI Recommended Move Bar */}
        {showHint && currentPlayer.isHuman && !state.gameOver && (
          <section className="tabletop-panel-soft flex flex-wrap items-center justify-between gap-3 border-l-2 border-l-[#315d4e] px-3.5 py-3">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#a9cdb7]">
                <span> AI推奨アクション（期待値トップ手）</span>
                <span className="rounded-sm border border-[#315d4e] bg-[#14211b] px-2 py-0.5 text-[11px] text-[#cfe4d8]">
                  推奨：{recommendedMove.title}
                </span>
              </div>
              <p className="text-xs text-[#c9b79d]">{recommendedMove.reason}</p>
            </div>
            <button
              type="button"
              onClick={handleApplyRecommendedMove}
              className="tabletop-button inline-flex min-h-11 items-center px-3 text-xs font-bold text-[#a9cdb7]"
            >
              この推奨施設を選択
            </button>
          </section>
        )}

        {/* Main 2-Column Layout: Left = Interactive SVG Steampunk Map, Right = 7 Guild Action Board & Execution Panel */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* PART B: Interactive SVG Steampunk Continent Map (7 cols) */}
          <div className="space-y-4 xl:col-span-7">
            <div className="tabletop-panel p-3.5 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="tabletop-title text-sm sm:text-base">
                    ️ 蒸気大陸鉄路マップ（12都市・22路線）
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#b9a88f]">
                    路線をクリックすると「4. 大陸鉄道敷設局」の敷設対象として直接選択できます。金枠の都市は現在の手番プレイヤーの「特急輸送指令書」の目的地です。
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="tabletop-chip inline-flex min-h-6 items-center px-2">
                    平原軌道: 炭1+鋼1 (+2★)
                  </span>
                  <span className="tabletop-chip inline-flex min-h-6 items-center px-2">
                    大河鉄橋: 鋼2+金1 (+3★)
                  </span>
                  <span className="tabletop-chip inline-flex min-h-6 items-center px-2">
                    山岳隧道: 炭2+鋼2 (+4★)
                  </span>
                </div>
              </div>

              {/* SVG Continent Map */}
              <div className="tabletop-board-frame relative overflow-hidden">
                <svg
                  viewBox="0 0 980 560"
                  className="h-auto w-full select-none"
                  role="img"
                  aria-label="蒸気大陸12都市・22路線のインタラクティブ鉄路マップ"
                >
                  <defs>
                    <radialGradient id="steampunkParchment" cx="50%" cy="50%" r="70%">
                      <stop offset="0%" stopColor="#2a1d12" />
                      <stop offset="65%" stopColor="#19110b" />
                      <stop offset="100%" stopColor="#0d0805" />
                    </radialGradient>
                    <pattern
                      id="brassGrid"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="0.4"
                        strokeOpacity="0.14"
                      />
                    </pattern>
                  </defs>

                  {/* Map Background */}
                  <rect width="980" height="560" fill="url(#steampunkParchment)" />
                  <rect width="980" height="560" fill="url(#brassGrid)" />

                  {/* Decorative Compass Gear & Rivers */}
                  <circle
                    cx="890"
                    cy="90"
                    r="46"
                    fill="none"
                    stroke="#f59e0b"
                    strokeOpacity="0.18"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <path
                    d="M 340 0 Q 375 210 380 350 T 450 560"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeOpacity="0.18"
                    strokeWidth="16"
                  />

                  {/* 22 Railway Routes */}
                  {CONTINENT_ROUTES.map((route) => {
                    const fromCity = CITY_MAP[route.from];
                    const toCity = CITY_MAP[route.to];
                    const owner = getRouteOwner(state.players, route.id);
                    const isSelected1 = selectedRouteId === route.id;
                    const isSelected2 = secondRouteId === route.id;
                    const isRecommended = recommendedMove.routeId === route.id;

                    const midX = (fromCity.x + toCity.x) / 2;
                    const midY = (fromCity.y + toCity.y) / 2;

                    const terrainStroke =
                      route.terrain === 'tunnel'
                        ? '#fb923c'
                        : route.terrain === 'bridge'
                          ? '#38bdf8'
                          : '#a8a29e';

                    return (
                      <g
                        key={route.id}
                        onClick={() => {
                          if (!owner) {
                            setSelectedFacility('railway_construction');
                            setSelectedRouteId(route.id);
                            triggerSfx('click');
                          }
                        }}
                        className={owner ? 'cursor-default' : 'cursor-pointer'}
                      >
                        {/* Outer Glow when selected or recommended */}
                        {(isSelected1 || isSelected2 || isRecommended) && !owner && (
                          <line
                            x1={fromCity.x}
                            y1={fromCity.y}
                            x2={toCity.x}
                            y2={toCity.y}
                            stroke={isSelected1 || isSelected2 ? '#fde047' : '#34d399'}
                            strokeWidth="13"
                            strokeOpacity="0.38"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Base Railway Track Line */}
                        <line
                          x1={fromCity.x}
                          y1={fromCity.y}
                          x2={toCity.x}
                          y2={toCity.y}
                          stroke={owner ? owner.colorHex : terrainStroke}
                          strokeWidth={owner ? 7 : 4}
                          strokeDasharray={owner ? undefined : '8 5'}
                          strokeOpacity={owner ? 0.95 : 0.72}
                        />

                        {/* Crossties on claimed routes */}
                        {owner && (
                          <line
                            x1={fromCity.x}
                            y1={fromCity.y}
                            x2={toCity.x}
                            y2={toCity.y}
                            stroke="#1c1917"
                            strokeWidth="3"
                            strokeDasharray="3 6"
                          />
                        )}

                        {/* Route Cost / Owner Badge at Midpoint */}
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x="-34"
                            y="-11"
                            width="68"
                            height="22"
                            rx="6"
                            fill={owner ? owner.colorHex : '#1c140d'}
                            stroke={
                              isSelected1 || isSelected2
                                ? '#fde047'
                                : owner
                                  ? '#ffffff'
                                  : terrainStroke
                            }
                            strokeWidth={isSelected1 || isSelected2 ? 2 : 1}
                          />
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="bold"
                            fill={owner ? '#0c0a09' : '#fef3c7'}
                          >
                            {owner
                              ? ` +${route.prestige}★`
                              : route.terrain === 'plains'
                                ? `炭1鋼1 +2★`
                                : route.terrain === 'bridge'
                                  ? `橋:鋼2金1 +3★`
                                  : `隧:炭2鋼2 +4★`}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* 12 Steampunk Cities */}
                  {CITIES.map((city) => {
                    const isContractTarget = highlightedContractCities.has(city.id);
                    const isVisitedByCurrent = currentPlayer?.visitedCities.includes(
                      city.id
                    );
                    const isHovered = hoveredCityId === city.id;

                    return (
                      <g
                        key={city.id}
                        transform={`translate(${city.x}, ${city.y})`}
                        onMouseEnter={() => setHoveredCityId(city.id)}
                        onMouseLeave={() => setHoveredCityId(null)}
                        className="cursor-pointer"
                      >
                        {isContractTarget && (
                          <circle
                            r="29"
                            fill="none"
                            stroke="#facc15"
                            strokeWidth="2.5"
                            strokeDasharray="4 3"
                          />
                        )}
                        <circle
                          r={isHovered ? 23 : 20}
                          fill={isVisitedByCurrent ? '#451a03' : '#1c1917'}
                          stroke={isContractTarget ? '#facc15' : isVisitedByCurrent ? '#f59e0b' : '#a8a29e'}
                          strokeWidth={isContractTarget ? 3 : 2}
                        />
                        <text x="0" y="5" textAnchor="middle" fontSize="15">
                          {city.icon}
                        </text>

                        {/* City Name Label */}
                        <rect
                          x="-58"
                          y="23"
                          width="116"
                          height="19"
                          rx="5"
                          fill="#0c0907"
                          fillOpacity="0.88"
                          stroke={isContractTarget ? '#facc15' : '#78350f'}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="36"
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill={isContractTarget ? '#fef08a' : '#fde68a'}
                        >
                          {city.shortName}
                        </text>

                        {/* Arrival Bonus Pill */}
                        <rect
                          x="-46"
                          y="-37"
                          width="92"
                          height="15"
                          rx="4"
                          fill="#1c140e"
                          fillOpacity="0.9"
                          stroke="#f59e0b"
                          strokeOpacity="0.4"
                        />
                        <text
                          x="0"
                          y="-26"
                          textAnchor="middle"
                          fontSize="8.5"
                          fill="#fcd34d"
                        >
                          {city.arrivalBonusText}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Active Player's Express Delivery Contracts & Expo Medals Bar */}
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Active Player Contracts */}
                <div className="tabletop-panel-soft border-l-2 border-l-[#5b4668] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h3 className="text-xs font-bold text-[#e8dcc8]">
                       特急輸送指令書
                    </h3>
                    <span className="text-[11px] text-[#b9a88f]">
                      達成済み {currentPlayer.completedContracts.length}件
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {currentPlayer.activeContracts.length === 0 ? (
                      <p className="text-xs leading-relaxed text-[#8b7d69]">
                        現在所持している指令書はありません。「5. 中央貨物取引所」で新規受注できます。
                      </p>
                    ) : (
                      currentPlayer.activeContracts.map((c) => {
                        const ready = canFulfillContract(currentPlayer, c);
                        const dist = getConnectedDistance(
                          currentPlayer.ownedRoutes,
                          c.fromCity,
                          c.toCity
                        );
                        return (
                          <div
                            key={c.id}
                            className={`rounded-md border p-2 text-xs ${
                              ready
                                ? 'border-[#315d4e] bg-[#14211b] text-[#cfe4d8]'
                                : 'border-[#5b4668] bg-[#241c15] text-[#d8cbb8]'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1 font-bold">
                              <span>
                                {c.title}（要 出力Lv.{c.minEngineLv}）
                              </span>
                              <span className="text-[#dfb06d]">
                                +{c.rewardPrestige}★ / +{c.rewardGold}金
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                              <span>
                                 {CITY_MAP[c.fromCity].shortName} ➔{' '}
                                {CITY_MAP[c.toCity].shortName}
                              </span>
                              <span
                                className={`rounded-sm border px-1.5 py-0.5 font-semibold ${
                                  ready
                                    ? 'border-[#315d4e] bg-[#315d4e] text-[#f4ead8]'
                                    : dist !== null
                                      ? 'border-[#6b543d] bg-[#3a2a1c] text-[#dfb06d]'
                                      : 'border-[#4d3d2d] bg-[#241c15] text-[#9c8d78]'
                                }`}
                              >
                                {ready
                                  ? ' 輸送可能（貨物取引所で達成）'
                                  : dist !== null
                                    ? `鉄路開通済（要 機関出力Lv.${c.minEngineLv}）`
                                    : '鉄路未接続'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Grand Expo Medals Overview */}
                <div className="tabletop-panel-soft border-l-2 border-l-[#6b3a36] p-3">
                  <h3 className="text-xs font-bold text-[#e8dcc8]">
                    ️ 万国博覧会・産業勲章
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {state.expoMedals.map((m) => {
                      const holder =
                        m.claimedBy !== null ? state.players[m.claimedBy] : null;
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-wrap items-center justify-between gap-1 rounded-md border px-2.5 py-1.5 text-[11px] ${
                            holder
                              ? 'border-[#3a2e23] bg-[#1d1712] opacity-65'
                              : 'border-[#6b3a36] bg-[#241615]'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-[#e8dcc8]">
                              {m.title}{' '}
                              <span className="text-[#dfb06d]">(+{m.prestige}★)</span>
                            </div>
                            <div className="text-[#9c8d78]">{m.subtitle}</div>
                          </div>
                          <div>
                            {holder ? (
                              <span className="rounded-sm border border-[#4d3d2d] bg-[#2a211a] px-2 py-0.5 font-bold text-[#dfb06d]">
                                {holder.name} 獲得済
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFacility('grand_expo');
                                  setSelectedMedalId(m.id);
                                }}
                                className="tabletop-button inline-flex min-h-11 items-center px-3 text-[11px] font-semibold"
                              >
                                選択
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PART A: The 7 Industrial Guild Facilities & Worker Placement Execution Panel (5 cols) */}
          <div className="space-y-4 xl:col-span-5">
            <div className="tabletop-panel p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="tabletop-title text-sm sm:text-base">
                    ️ 7大ギルド施設
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#b9a88f]">
                    先着1名の「主任枠（無料・高出力）」と、金貨1枚で入れる「残業枠」があります。
                  </p>
                </div>
              </div>

              {/* 7 Facilities List */}
              <div className="space-y-2">
                {FACILITIES.map((fac) => {
                  const primeOccupant = state.placements.find(
                    (w) => w.facilityId === fac.id && w.slotType === 'prime'
                  );
                  const overtimeOccupants = state.placements.filter(
                    (w) => w.facilityId === fac.id && w.slotType === 'overtime'
                  );
                  const isSelected = selectedFacility === fac.id;
                  const isRecommended = recommendedMove.facilityId === fac.id;

                  return (
                    <div
                      key={fac.id}
                      onClick={() => {
                        setSelectedFacility(fac.id);
                        triggerSfx('click');
                      }}
                      className={`cursor-pointer rounded-md border bg-gradient-to-r p-3 transition ${fac.accentClass} ${
                        isSelected
                          ? 'border-[#c99555] ring-1 ring-[#c99555]'
                          : fac.borderClass
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{fac.icon}</span>
                          <span className="text-xs font-bold text-[#f4ead8] sm:text-sm">
                            {fac.number}. {fac.name}
                          </span>
                          {isRecommended && showHint && (
                            <span className="tabletop-chip tabletop-chip-active inline-flex min-h-6 items-center px-2 text-[11px] font-bold">
                              AI推奨
                            </span>
                          )}
                        </div>

                        {/* Slot Occupancy Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {primeOccupant ? (
                            <span
                              className="rounded-sm border border-[#4d3d2d] px-2 py-0.5 font-bold text-[#1b120b]"
                              style={{
                                backgroundColor:
                                  state.players[primeOccupant.playerId]?.colorHex,
                              }}
                            >
                              主任枠: {state.players[primeOccupant.playerId]?.name.slice(0, 6)}
                            </span>
                          ) : (
                            <span className="rounded-sm border border-[#315d4e] bg-[#14211b] px-2 py-0.5 font-bold text-[#a9cdb7]">
                               主任枠 空き（無料）
                            </span>
                          )}
                          <span className="rounded-sm border border-[#6b543d] bg-[#241c15] px-2 py-0.5 text-[#dfb06d]">
                            残業枠(要1金): {overtimeOccupants.length}名
                          </span>
                        </div>
                      </div>

                      <div className="mt-1.5 text-[11px] leading-relaxed text-[#d8cbb8]">
                        <div>・{fac.primeDesc}</div>
                        <div className="text-[#9c8d78]">・{fac.overtimeDesc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Execution Configuration Box */}
              <div className="mt-4 rounded-md border border-[#6b543d] bg-[#1d1712] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-[#e8dcc8] sm:text-sm">
                    ️ 配置先：{FACILITIES.find((f) => f.id === selectedFacility)?.name}
                  </h3>
                  <span className="tabletop-chip inline-flex min-h-7 items-center px-2 text-[11px] font-bold">
                    {isPrimeSlotAvailable(state.placements, selectedFacility)
                      ? '主任枠（追加金貨0）'
                      : '残業枠（金貨1枚）'}
                  </span>
                </div>

                {/* Dynamic Controls per Facility */}
                <div className="mt-3 space-y-3 text-xs">
                  {selectedFacility === 'coal_mine' &&
                    isPrimeSlotAvailable(state.placements, 'coal_mine') && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setCoalChoice('coal3')}
                          className={`min-h-11 rounded-md border px-3 font-bold transition ${
                            coalChoice === 'coal3'
                              ? 'border-[#c99555] bg-[#c99555] text-[#1b120b]'
                              : 'tabletop-button text-[11px]'
                          }`}
                        >
                          ️ 石炭 +3 を受け取る
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoalChoice('coal2gold1')}
                          className={`min-h-11 rounded-md border px-3 font-bold transition ${
                            coalChoice === 'coal2gold1'
                              ? 'border-[#c99555] bg-[#c99555] text-[#1b120b]'
                              : 'tabletop-button text-[11px]'
                          }`}
                        >
                          ️ 石炭 +2 ＆  金貨 +1
                        </button>
                      </div>
                    )}

                  {selectedFacility === 'steel_foundry' &&
                    isPrimeSlotAvailable(state.placements, 'steel_foundry') && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSteelChoice('steel2')}
                          className={`min-h-11 rounded-md border px-3 font-bold transition ${
                            steelChoice === 'steel2'
                              ? 'border-[#c99555] bg-[#c99555] text-[#1b120b]'
                              : 'tabletop-button text-[11px]'
                          }`}
                        >
                           鋼鉄 +2 を受け取る（無料）
                        </button>
                        <button
                          type="button"
                          onClick={() => setSteelChoice('convert3')}
                          className={`min-h-11 rounded-md border px-3 font-bold transition ${
                            steelChoice === 'convert3'
                              ? 'border-[#c99555] bg-[#c99555] text-[#1b120b]'
                              : 'tabletop-button text-[11px]'
                          }`}
                        >
                           石炭1を消費して 鋼鉄 +3
                        </button>
                      </div>
                    )}

                  {selectedFacility === 'locomotive_works' && (
                    <div className="rounded-md border border-[#3f5f78] bg-[#182530] p-2.5 text-[#d6e4ed]">
                      {currentPlayer.engineLv >= 5 ? (
                        <div>既に最高出力（Lv.5）に達しています。</div>
                      ) : (
                        (() => {
                          const nextSpec = ENGINE_LEVELS[currentPlayer.engineLv + 1];
                          const isPrime = isPrimeSlotAvailable(
                            state.placements,
                            'locomotive_works'
                          );
                          const reqSteel = Math.max(
                            1,
                            nextSpec.upgradeCost.steel - (isPrime ? 1 : 0)
                          );
                          const reqGold =
                            nextSpec.upgradeCost.gold + (isPrime ? 0 : 1);
                          return (
                            <div>
                              <div className="font-bold">
                                次段階：{nextSpec.name}（名声+{nextSpec.upgradePrestigeGain}★）
                              </div>
                              <div className="mt-1 text-[11px]">
                                必要コスト：鋼鉄 {reqSteel}個 ＆ 金貨 {reqGold}枚
                                {nextSpec.level === 3 &&
                                  ' ／  4人目の機関士ワーカーが即座に解放'}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {selectedFacility === 'railway_construction' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] text-[#b9a88f]">
                          第1敷設区間（マップ上の路線クリックでも選択可能）
                        </label>
                        <select
                          value={selectedRouteId}
                          onChange={(e) => setSelectedRouteId(e.target.value)}
                          className="tabletop-button mt-1 min-h-11 w-full px-2.5 text-xs text-[#f4ead8]"
                        >
                          {CONTINENT_ROUTES.filter((r) =>
                            isRouteUnclaimed(state.players, r.id)
                          ).map((r) => (
                            <option key={r.id} value={r.id}>
                              {CITY_MAP[r.from].shortName} ⇄ {CITY_MAP[r.to].shortName}（
                              {r.terrain === 'plains'
                                ? '平原:炭1鋼1 / +2★'
                                : r.terrain === 'bridge'
                                  ? '鉄橋:鋼2金1 / +3★'
                                  : '隧道:炭2鋼2 / +4★'}
                              ）
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#b9a88f]">
                          第2敷設区間（任意・2区間同時敷設する場合のみ選択）
                        </label>
                        <select
                          value={secondRouteId}
                          onChange={(e) => setSecondRouteId(e.target.value)}
                          className="tabletop-button mt-1 min-h-11 w-full px-2.5 text-xs text-[#f4ead8]"
                        >
                          <option value="">（1区間のみ敷設する）</option>
                          {CONTINENT_ROUTES.filter(
                            (r) =>
                              r.id !== selectedRouteId &&
                              isRouteUnclaimed(state.players, r.id)
                          ).map((r) => (
                            <option key={r.id} value={r.id}>
                              {CITY_MAP[r.from].shortName} ⇄ {CITY_MAP[r.to].shortName}（
                              {r.terrain === 'plains'
                                ? '平原:炭1鋼1 / +2★'
                                : r.terrain === 'bridge'
                                  ? '鉄橋:鋼2金1 / +3★'
                                  : '隧道:炭2鋼2 / +4★'}
                              ）
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedFacility === 'freight_exchange' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] text-[#b9a88f]">
                          新規受注する「特急輸送指令書」（上限3枚まで）
                        </label>
                        <select
                          value={selectedContractToTake}
                          onChange={(e) => setSelectedContractToTake(e.target.value)}
                          className="tabletop-button mt-1 min-h-11 w-full px-2.5 text-xs text-[#f4ead8]"
                        >
                          <option value="">（新規指令書を受注しない）</option>
                          {state.contractMarket.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}：{CITY_MAP[c.fromCity].shortName}→
                              {CITY_MAP[c.toCity].shortName}（要Lv.{c.minEngineLv} / +
                              {c.rewardPrestige}★・+{c.rewardGold}金）
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#b9a88f]">
                          達成する「特急輸送指令書」（未選択時はローカル貨物運行 +2★・+2金）
                        </label>
                        <select
                          value={selectedContractToFulfill}
                          onChange={(e) => setSelectedContractToFulfill(e.target.value)}
                          className="tabletop-button mt-1 min-h-11 w-full px-2.5 text-xs text-[#f4ead8]"
                        >
                          <option value="">
                            （ローカル定期貨物便を運行：+{currentPlayer.ownedRoutes.length > 0 ? 2 : 1}★・+2金）
                          </option>
                          {currentPlayer.activeContracts
                            .filter((c) => canFulfillContract(currentPlayer, c))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                 {c.title} を達成！（+{c.rewardPrestige}★・+{c.rewardGold}金）
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedFacility === 'grand_expo' && (
                    <div>
                      <label className="block text-[11px] text-[#b9a88f]">
                        奉納して獲得する「万国博覧会・産業勲章」
                      </label>
                      <select
                        value={selectedMedalId}
                        onChange={(e) => setSelectedMedalId(e.target.value)}
                        className="tabletop-button mt-1 min-h-11 w-full px-2.5 text-xs text-[#f4ead8]"
                      >
                        {state.expoMedals
                          .filter((m) => m.claimedBy === null)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title}（+{m.prestige}★ / 炭{m.cost.coal}・鋼{m.cost.steel}・金
                              {m.cost.gold}）
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!currentPlayer.isHuman || state.gameOver}
                    onClick={() =>
                      executeAction(selectedFacility, {
                        coalMode: coalChoice,
                        steelMode: steelChoice,
                        route1: selectedRouteId,
                        route2: secondRouteId,
                        takeContractId: selectedContractToTake,
                        fulfillContractId: selectedContractToFulfill,
                        medalId: selectedMedalId,
                      })
                    }
                    className="tabletop-button-primary w-full min-h-11 text-sm font-bold disabled:opacity-40"
                  >
                     機関士ワーカーを配置してアクション実行
                  </button>
                </div>
              </div>
            </div>

            {/* Action Log */}
            <div className="tabletop-panel p-3.5 sm:p-4">
              <h3 className="tabletop-title text-sm">
                 大陸鉄道年代記
              </h3>
              <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1 text-xs text-[#c9b79d]">
                {state.logs.slice(0, 18).map((log, i) => (
                  <div
                    key={`log-${i}`}
                    className="tabletop-panel-soft px-2.5 py-1.5 leading-relaxed"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
