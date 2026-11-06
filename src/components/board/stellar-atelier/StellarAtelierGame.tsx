'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// ============================================================================
// Types & Constants
// ============================================================================

export type ElementColor = 'crimson' | 'azure' | 'emerald' | 'amber' | 'violet';
export type ShardType = ElementColor | 'prism';
export type Tier = 1 | 2 | 3;
export type AiPersona = 'steady' | 'rush' | 'patron';
export type GameMode = 'cpu' | 'pvp';

export interface ElementMeta {
  id: ElementColor;
  name: string;
  shortName: string;
  sub: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  glowHex: string;
}

export const ELEMENTS: ElementMeta[] = [
  {
    id: 'crimson',
    name: '紅炎（クリムゾン）',
    shortName: '紅炎',
    sub: '火成星片',
    bgClass: 'bg-rose-950/80',
    borderClass: 'border-rose-400/60',
    textClass: 'text-rose-300',
    badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-400/50',
    glowHex: '#fb7185',
  },
  {
    id: 'azure',
    name: '蒼氷（サファイア）',
    shortName: '蒼氷',
    sub: '氷晶星片',
    bgClass: 'bg-sky-950/80',
    borderClass: 'border-sky-400/60',
    textClass: 'text-sky-300',
    badgeClass: 'bg-sky-500/25 text-sky-200 border-sky-400/50',
    glowHex: '#38bdf8',
  },
  {
    id: 'emerald',
    name: '翠風（エメラルド）',
    shortName: '翠風',
    sub: '翠嵐星片',
    bgClass: 'bg-emerald-950/80',
    borderClass: 'border-emerald-400/60',
    textClass: 'text-emerald-300',
    badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50',
    glowHex: '#34d399',
  },
  {
    id: 'amber',
    name: '琥珀（アンバー）',
    shortName: '琥珀',
    sub: '黄金星片',
    bgClass: 'bg-amber-950/80',
    borderClass: 'border-amber-400/60',
    textClass: 'text-amber-300',
    badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/50',
    glowHex: '#fbbf24',
  },
  {
    id: 'violet',
    name: '紫電（ヴァイオレット）',
    shortName: '紫電',
    sub: '星雲星片',
    bgClass: 'bg-purple-950/80',
    borderClass: 'border-purple-400/60',
    textClass: 'text-purple-300',
    badgeClass: 'bg-purple-500/25 text-purple-200 border-purple-400/50',
    glowHex: '#c084fc',
  },
];

export const ELEMENT_MAP: Record<ElementColor, ElementMeta> = {
  crimson: ELEMENTS[0],
  azure: ELEMENTS[1],
  emerald: ELEMENTS[2],
  amber: ELEMENTS[3],
  violet: ELEMENTS[4],
};

export interface RecipeCard {
  id: string;
  tier: Tier;
  title: string;
  bonus: ElementColor;
  prestige: number;
  cost: Record<ElementColor, number>;
}

export interface PatronTile {
  id: string;
  name: string;
  constellation: string;
  prestige: number;
  requirement: Partial<Record<ElementColor, number>>;
}

export interface PlayerState {
  id: number;
  name: string;
  isAi: boolean;
  persona: AiPersona;
  shards: Record<ShardType, number>;
  crafted: RecipeCard[];
  reserved: RecipeCard[];
  patrons: PatronTile[];
}

export interface GameSnapshot {
  players: PlayerState[];
  supply: Record<ShardType, number>;
  decks: Record<Tier, RecipeCard[]>;
  market: Record<Tier, (RecipeCard | null)[]>;
  patrons: PatronTile[];
  turnIndex: number;
  round: number;
  finalRoundTriggered: boolean;
  logs: string[];
}

export interface RecommendedMove {
  type: 'craft-market' | 'craft-reserved' | 'take-same' | 'take-diff' | 'reserve';
  label: string;
  reason: string;
  cardId?: string;
  shards?: ElementColor[];
}

const TARGET_PRESTIGE = 15;
const MAX_SHARDS = 10;
const MAX_RESERVED = 3;

const TIER_META: Record<Tier, { label: string; sub: string; badge: string }> = {
  1: {
    label: 'Tier I：初級錬成式',
    sub: '基礎共鳴エンジン構築（0〜1★）',
    badge: 'border-teal-400/40 bg-teal-950/70 text-teal-200',
  },
  2: {
    label: 'Tier II：中級天球儀',
    sub: '中核アストラル機構（1〜3★）',
    badge: 'border-indigo-400/40 bg-indigo-950/70 text-indigo-200',
  },
  3: {
    label: 'Tier III：高等星辰機関',
    sub: '高純度名声結晶（3〜5★）',
    badge: 'border-amber-400/50 bg-amber-950/70 text-amber-200',
  },
};

const PERSONA_META: Record<AiPersona, { label: string; desc: string }> = {
  steady: {
    label: '堅実型AI（バランス共鳴）',
    desc: '初級レシピで満遍なく共鳴ボーナスを伸ばしてから中級・高等へ繋ぐ正統派',
  },
  rush: {
    label: '速攻型AI（高名声直行）',
    desc: '名声星を持つ中級・高等レシピを優先予約し、最短ターンで15★到達を狙う',
  },
  patron: {
    label: 'パトロン重視型AI（星座特化）',
    desc: '場の星座パトロンが要求する属性ボーナスを集中的に揃えて+3★招聘を狙う',
  },
};

// ============================================================================
// Card & Patron Pools (100% Original Celestial Atelier Worldbuilding)
// ============================================================================

function makeCost(
  c = 0,
  az = 0,
  em = 0,
  am = 0,
  vi = 0
): Record<ElementColor, number> {
  return { crimson: c, azure: az, emerald: em, amber: am, violet: vi };
}

const ALL_RECIPE_CARDS: RecipeCard[] = [
  // --- Tier I: 初級錬成式 (35 cards) ---
  { id: 't1-c1', tier: 1, title: '紅炎の星砂ランプ', bonus: 'crimson', prestige: 0, cost: makeCost(0, 3, 0, 0, 0) },
  { id: 't1-c2', tier: 1, title: '赤星の蒸留レトルト', bonus: 'crimson', prestige: 0, cost: makeCost(0, 0, 0, 2, 1) },
  { id: 't1-c3', tier: 1, title: '焔紋の観測レンズ', bonus: 'crimson', prestige: 0, cost: makeCost(0, 1, 1, 1, 1) },
  { id: 't1-c4', tier: 1, title: '火成の小さな炉心', bonus: 'crimson', prestige: 0, cost: makeCost(0, 2, 1, 0, 0) },
  { id: 't1-c5', tier: 1, title: '紅玉星の分銅', bonus: 'crimson', prestige: 0, cost: makeCost(0, 1, 2, 1, 1) },
  { id: 't1-c6', tier: 1, title: 'プロミネンス試験管', bonus: 'crimson', prestige: 0, cost: makeCost(1, 0, 0, 1, 3) },
  { id: 't1-c7', tier: 1, title: '紅星のアストロラーベ', bonus: 'crimson', prestige: 1, cost: makeCost(0, 4, 0, 0, 0) },

  { id: 't1-a1', tier: 1, title: '蒼氷の冷却コイル', bonus: 'azure', prestige: 0, cost: makeCost(0, 0, 3, 0, 0) },
  { id: 't1-a2', tier: 1, title: '氷晶の星見コンパス', bonus: 'azure', prestige: 0, cost: makeCost(1, 0, 0, 0, 2) },
  { id: 't1-a3', tier: 1, title: '蒼穹の滴定フラスコ', bonus: 'azure', prestige: 0, cost: makeCost(1, 0, 1, 1, 1) },
  { id: 't1-a4', tier: 1, title: '零度の銀砂時計', bonus: 'azure', prestige: 0, cost: makeCost(0, 0, 2, 1, 0) },
  { id: 't1-a5', tier: 1, title: '白夜星のプリズム鏡', bonus: 'azure', prestige: 0, cost: makeCost(1, 0, 1, 2, 1) },
  { id: 't1-a6', tier: 1, title: '氷河の共鳴音叉', bonus: 'azure', prestige: 0, cost: makeCost(3, 1, 0, 0, 1) },
  { id: 't1-a7', tier: 1, title: '蒼星の天球リング', bonus: 'azure', prestige: 1, cost: makeCost(4, 0, 0, 0, 0) },

  { id: 't1-e1', tier: 1, title: '翠風の羽根ペン', bonus: 'emerald', prestige: 0, cost: makeCost(0, 0, 0, 3, 0) },
  { id: 't1-e2', tier: 1, title: '風の星図スクロール', bonus: 'emerald', prestige: 0, cost: makeCost(0, 2, 0, 1, 0) },
  { id: 't1-e3', tier: 1, title: '翠嵐の気流バルブ', bonus: 'emerald', prestige: 0, cost: makeCost(1, 1, 0, 1, 1) },
  { id: 't1-e4', tier: 1, title: '若葉星の天秤皿', bonus: 'emerald', prestige: 0, cost: makeCost(2, 1, 0, 0, 0) },
  { id: 't1-e5', tier: 1, title: 'シルフの風見鶏', bonus: 'emerald', prestige: 0, cost: makeCost(1, 1, 0, 1, 2) },
  { id: 't1-e6', tier: 1, title: '緑光の抽出フィルター', bonus: 'emerald', prestige: 0, cost: makeCost(0, 3, 1, 1, 0) },
  { id: 't1-e7', tier: 1, title: '翠星の風車オルゴール', bonus: 'emerald', prestige: 1, cost: makeCost(0, 0, 0, 0, 4) },

  { id: 't1-m1', tier: 1, title: '琥珀の星光るつぼ', bonus: 'amber', prestige: 0, cost: makeCost(0, 0, 0, 0, 3) },
  { id: 't1-m2', tier: 1, title: '黄金比のディバイダ', bonus: 'amber', prestige: 0, cost: makeCost(0, 2, 1, 0, 0) },
  { id: 't1-m3', tier: 1, title: '陽だまりの結晶皿', bonus: 'amber', prestige: 0, cost: makeCost(1, 1, 1, 0, 1) },
  { id: 't1-m4', tier: 1, title: '琥珀星の封蝋印', bonus: 'amber', prestige: 0, cost: makeCost(0, 0, 1, 0, 2) },
  { id: 't1-m5', tier: 1, title: '金砂のクロノメーター', bonus: 'amber', prestige: 0, cost: makeCost(2, 1, 1, 0, 1) },
  { id: 't1-m6', tier: 1, title: '黄道十二宮のルーペ', bonus: 'amber', prestige: 0, cost: makeCost(0, 0, 3, 1, 1) },
  { id: 't1-m7', tier: 1, title: '琥珀の太陽儀', bonus: 'amber', prestige: 1, cost: makeCost(0, 0, 4, 0, 0) },

  { id: 't1-v1', tier: 1, title: '紫電の磁気コイル', bonus: 'violet', prestige: 0, cost: makeCost(3, 0, 0, 0, 0) },
  { id: 't1-v2', tier: 1, title: '星雲インクの万年筆', bonus: 'violet', prestige: 0, cost: makeCost(2, 0, 1, 0, 0) },
  { id: 't1-v3', tier: 1, title: '宵闇の分光プリズム', bonus: 'violet', prestige: 0, cost: makeCost(1, 1, 1, 1, 0) },
  { id: 't1-v4', tier: 1, title: '紫水晶の振子時計', bonus: 'violet', prestige: 0, cost: makeCost(0, 1, 0, 2, 0) },
  { id: 't1-v5', tier: 1, title: 'エーテル蓄電瓶', bonus: 'violet', prestige: 0, cost: makeCost(1, 2, 1, 1, 0) },
  { id: 't1-v6', tier: 1, title: '銀河の共鳴ベル', bonus: 'violet', prestige: 0, cost: makeCost(1, 0, 1, 3, 0) },
  { id: 't1-v7', tier: 1, title: '紫電の星見望遠鏡', bonus: 'violet', prestige: 1, cost: makeCost(0, 0, 0, 4, 0) },

  // --- Tier II: 中級天球儀 (25 cards) ---
  { id: 't2-c1', tier: 2, title: '紅蓮の天球儀', bonus: 'crimson', prestige: 1, cost: makeCost(2, 0, 0, 3, 2) },
  { id: 't2-c2', tier: 2, title: '太陽コロナの精製炉', bonus: 'crimson', prestige: 1, cost: makeCost(2, 3, 0, 0, 3) },
  { id: 't2-c3', tier: 2, title: '不死鳥の恒星コンパス', bonus: 'crimson', prestige: 2, cost: makeCost(0, 4, 2, 1, 0) },
  { id: 't2-c4', tier: 2, title: 'フレア共鳴チェンバー', bonus: 'crimson', prestige: 2, cost: makeCost(0, 0, 0, 5, 0) },
  { id: 't2-c5', tier: 2, title: '紅炎の六分儀コア', bonus: 'crimson', prestige: 3, cost: makeCost(6, 0, 0, 0, 0) },

  { id: 't2-a1', tier: 2, title: '蒼氷のプラネタリウム', bonus: 'azure', prestige: 1, cost: makeCost(0, 2, 2, 3, 0) },
  { id: 't2-a2', tier: 2, title: '深海星の冷凍蒸留塔', bonus: 'azure', prestige: 1, cost: makeCost(3, 2, 3, 0, 0) },
  { id: 't2-a3', tier: 2, title: 'オーロラ屈折望遠鏡', bonus: 'azure', prestige: 2, cost: makeCost(2, 0, 0, 4, 1) },
  { id: 't2-a4', tier: 2, title: '絶対零度の星辰鏡', bonus: 'azure', prestige: 2, cost: makeCost(0, 5, 0, 0, 0) },
  { id: 't2-a5', tier: 2, title: '蒼氷の天体クロノグラフ', bonus: 'azure', prestige: 3, cost: makeCost(0, 6, 0, 0, 0) },

  { id: 't2-e1', tier: 2, title: '翠嵐の軌道計算機', bonus: 'emerald', prestige: 1, cost: makeCost(3, 0, 2, 0, 2) },
  { id: 't2-e2', tier: 2, title: '星風の循環ハーモニウム', bonus: 'emerald', prestige: 1, cost: makeCost(0, 3, 2, 3, 0) },
  { id: 't2-e3', tier: 2, title: '世界樹のアストロラーベ', bonus: 'emerald', prestige: 2, cost: makeCost(0, 4, 0, 2, 1) },
  { id: 't2-e4', tier: 2, title: 'エメラルド星雲タービン', bonus: 'emerald', prestige: 2, cost: makeCost(0, 0, 5, 0, 0) },
  { id: 't2-e5', tier: 2, title: '翠風の天球オルガン', bonus: 'emerald', prestige: 3, cost: makeCost(0, 0, 6, 0, 0) },

  { id: 't2-m1', tier: 2, title: '琥珀の黄道観測儀', bonus: 'amber', prestige: 1, cost: makeCost(2, 2, 3, 0, 0) },
  { id: 't2-m2', tier: 2, title: '黄金律の錬成マトリクス', bonus: 'amber', prestige: 1, cost: makeCost(3, 0, 0, 2, 3) },
  { id: 't2-m3', tier: 2, title: '日輪の重力天秤', bonus: 'amber', prestige: 2, cost: makeCost(4, 0, 1, 0, 2) },
  { id: 't2-m4', tier: 2, title: 'ソラリス集光ドーム', bonus: 'amber', prestige: 2, cost: makeCost(0, 0, 0, 0, 5) },
  { id: 't2-m5', tier: 2, title: '琥珀の恒星カレンダー', bonus: 'amber', prestige: 3, cost: makeCost(0, 0, 0, 6, 0) },

  { id: 't2-v1', tier: 2, title: '紫電の星間通信機', bonus: 'violet', prestige: 1, cost: makeCost(0, 3, 2, 2, 0) },
  { id: 't2-v2', tier: 2, title: 'ダークマター分光器', bonus: 'violet', prestige: 1, cost: makeCost(0, 0, 3, 3, 2) },
  { id: 't2-v3', tier: 2, title: '星雲渦のアーク炉', bonus: 'violet', prestige: 2, cost: makeCost(1, 2, 4, 0, 0) },
  { id: 't2-v4', tier: 2, title: '紫電の位相シフト鏡', bonus: 'violet', prestige: 2, cost: makeCost(5, 0, 0, 0, 0) },
  { id: 't2-v5', tier: 2, title: '紫電の次元天球儀', bonus: 'violet', prestige: 3, cost: makeCost(0, 0, 0, 0, 6) },

  // --- Tier III: 高等星辰機関 (20 cards) ---
  { id: 't3-c1', tier: 3, title: '超新星イグニッション機関', bonus: 'crimson', prestige: 3, cost: makeCost(0, 3, 5, 3, 3) },
  { id: 't3-c2', tier: 3, title: '紅炎のグランド・アーク', bonus: 'crimson', prestige: 4, cost: makeCost(0, 0, 7, 0, 0) },
  { id: 't3-c3', tier: 3, title: 'セラフィム恒星炉', bonus: 'crimson', prestige: 4, cost: makeCost(3, 0, 6, 3, 0) },
  { id: 't3-c4', tier: 3, title: '創世紅炎のコズミック・コア', bonus: 'crimson', prestige: 5, cost: makeCost(3, 0, 7, 0, 0) },

  { id: 't3-a1', tier: 3, title: '銀河氷河の永久機関', bonus: 'azure', prestige: 3, cost: makeCost(3, 0, 3, 3, 5) },
  { id: 't3-a2', tier: 3, title: '蒼氷のネビュラ大聖堂', bonus: 'azure', prestige: 4, cost: makeCost(0, 0, 0, 7, 0) },
  { id: 't3-a3', tier: 3, title: 'ポラリス天頂の玉座', bonus: 'azure', prestige: 4, cost: makeCost(0, 3, 0, 6, 3) },
  { id: 't3-a4', tier: 3, title: '創世蒼氷のアストラル・エンジン', bonus: 'azure', prestige: 5, cost: makeCost(0, 3, 0, 7, 0) },

  { id: 't3-e1', tier: 3, title: '星風交響のグランド・オルガン', bonus: 'emerald', prestige: 3, cost: makeCost(5, 3, 0, 3, 3) },
  { id: 't3-e2', tier: 3, title: '翠風のエデン・テラリウム', bonus: 'emerald', prestige: 4, cost: makeCost(0, 7, 0, 0, 0) },
  { id: 't3-e3', tier: 3, title: '天空庭園の星辰回廊', bonus: 'emerald', prestige: 4, cost: makeCost(0, 6, 3, 0, 3) },
  { id: 't3-e4', tier: 3, title: '創世翠風のクロノスフィア', bonus: 'emerald', prestige: 5, cost: makeCost(0, 7, 3, 0, 0) },

  { id: 't3-m1', tier: 3, title: '黄金太陽のダイソン・リング', bonus: 'amber', prestige: 3, cost: makeCost(3, 5, 3, 0, 3) },
  { id: 't3-m2', tier: 3, title: '琥珀のヘリオス大天文台', bonus: 'amber', prestige: 4, cost: makeCost(0, 0, 0, 0, 7) },
  { id: 't3-m3', tier: 3, title: '黄金宮の万象天球儀', bonus: 'amber', prestige: 4, cost: makeCost(3, 0, 0, 3, 6) },
  { id: 't3-m4', tier: 3, title: '創世琥珀のソラリス・クラウン', bonus: 'amber', prestige: 5, cost: makeCost(0, 0, 0, 3, 7) },

  { id: 't3-v1', tier: 3, title: '紫電のアカシック・レコード', bonus: 'violet', prestige: 3, cost: makeCost(3, 3, 3, 5, 0) },
  { id: 't3-v2', tier: 3, title: '星雲王のクエーサー機関', bonus: 'violet', prestige: 4, cost: makeCost(7, 0, 0, 0, 0) },
  { id: 't3-v3', tier: 3, title: '深淵銀河のシンギュラリティ炉', bonus: 'violet', prestige: 4, cost: makeCost(6, 3, 0, 0, 3) },
  { id: 't3-v4', tier: 3, title: '創世紫電のオムニ・オーラリー', bonus: 'violet', prestige: 5, cost: makeCost(7, 0, 0, 0, 3) },
];

const ALL_PATRON_TILES: PatronTile[] = [
  {
    id: 'p-1',
    name: '焔と氷と風の三賢者',
    constellation: 'オリオン大星団',
    prestige: 3,
    requirement: { crimson: 3, azure: 3, emerald: 3 },
  },
  {
    id: 'p-2',
    name: '蒼穹と翠嵐と黄金の観測卿',
    constellation: 'ヴェガ琴座連盟',
    prestige: 3,
    requirement: { azure: 3, emerald: 3, amber: 3 },
  },
  {
    id: 'p-3',
    name: '翠風と琥珀と紫電の占星公',
    constellation: 'カシオペア星宮',
    prestige: 3,
    requirement: { emerald: 3, amber: 3, violet: 3 },
  },
  {
    id: 'p-4',
    name: '紅炎と琥珀と紫電の錬金伯',
    constellation: 'アンタレス紅星団',
    prestige: 3,
    requirement: { crimson: 3, amber: 3, violet: 3 },
  },
  {
    id: 'p-5',
    name: '紅炎と蒼氷と紫電の天文学者',
    constellation: 'シリウス双星院',
    prestige: 3,
    requirement: { crimson: 3, azure: 3, violet: 3 },
  },
  {
    id: 'p-6',
    name: '紅炎と翠風の双翼パトロン',
    constellation: 'アルタイル飛翔座',
    prestige: 3,
    requirement: { crimson: 4, emerald: 4 },
  },
  {
    id: 'p-7',
    name: '蒼氷と琥珀の双晶パトロン',
    constellation: 'スピカ白銀宮',
    prestige: 3,
    requirement: { azure: 4, amber: 4 },
  },
  {
    id: 'p-8',
    name: '琥珀と紫電の双星パトロン',
    constellation: 'アンドロメダ王立院',
    prestige: 3,
    requirement: { amber: 4, violet: 4 },
  },
  {
    id: 'p-9',
    name: '紅炎と紫電の双焔パトロン',
    constellation: 'ペテルギウス評議会',
    prestige: 3,
    requirement: { crimson: 4, violet: 4 },
  },
  {
    id: 'p-10',
    name: '蒼氷と翠風の双流パトロン',
    constellation: 'プレアデス七星会',
    prestige: 3,
    requirement: { azure: 4, emerald: 4 },
  },
];

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

export function getPlayerBonuses(player: PlayerState): Record<ElementColor, number> {
  const bonuses: Record<ElementColor, number> = {
    crimson: 0,
    azure: 0,
    emerald: 0,
    amber: 0,
    violet: 0,
  };
  for (const card of player.crafted) {
    bonuses[card.bonus] += 1;
  }
  return bonuses;
}

export function getPlayerPrestige(player: PlayerState): number {
  const cardPts = player.crafted.reduce((acc, c) => acc + c.prestige, 0);
  const patronPts = player.patrons.reduce((acc, p) => acc + p.prestige, 0);
  return cardPts + patronPts;
}

export function getTotalShards(shards: Record<ShardType, number>): number {
  return (
    shards.crimson +
    shards.azure +
    shards.emerald +
    shards.amber +
    shards.violet +
    shards.prism
  );
}

export interface CostAnalysis {
  discountedCost: Record<ElementColor, number>;
  totalAfterDiscount: number;
  spendByColor: Record<ElementColor, number>;
  prismNeeded: number;
  missingAfterPrism: number;
  canCraftNow: boolean;
  isOneTurnAway: boolean;
}

export function analyzeCardCost(player: PlayerState, card: RecipeCard): CostAnalysis {
  const bonuses = getPlayerBonuses(player);
  const discountedCost: Record<ElementColor, number> = {
    crimson: 0,
    azure: 0,
    emerald: 0,
    amber: 0,
    violet: 0,
  };
  const spendByColor: Record<ElementColor, number> = {
    crimson: 0,
    azure: 0,
    emerald: 0,
    amber: 0,
    violet: 0,
  };

  let totalAfterDiscount = 0;
  let shortfallSum = 0;
  let colorsWithShortfall = 0;
  let maxSingleShortfall = 0;

  for (const el of ELEMENTS) {
    const c = el.id;
    const raw = card.cost[c] || 0;
    const disc = Math.max(0, raw - bonuses[c]);
    discountedCost[c] = disc;
    totalAfterDiscount += disc;

    const have = player.shards[c];
    const spend = Math.min(have, disc);
    spendByColor[c] = spend;

    const short = disc - spend;
    if (short > 0) {
      shortfallSum += short;
      colorsWithShortfall += 1;
      if (short > maxSingleShortfall) maxSingleShortfall = short;
    }
  }

  const prismAvail = player.shards.prism;
  const prismNeeded = Math.min(prismAvail, shortfallSum);
  const missingAfterPrism = Math.max(0, shortfallSum - prismAvail);
  const canCraftNow = missingAfterPrism === 0;

  // 1-turn-away check: either missing <= 3 across distinct colors (max 1 per color after prism) or missing == 2 in 1 color
  const isOneTurnAway =
    !canCraftNow &&
    ((missingAfterPrism <= 3 && maxSingleShortfall - prismAvail <= 1) ||
      (missingAfterPrism <= 2 && colorsWithShortfall === 1));

  return {
    discountedCost,
    totalAfterDiscount,
    spendByColor,
    prismNeeded,
    missingAfterPrism,
    canCraftNow,
    isOneTurnAway,
  };
}

export function checkPatronEligibility(
  bonuses: Record<ElementColor, number>,
  patron: PatronTile
): boolean {
  for (const el of ELEMENTS) {
    const req = patron.requirement[el.id] || 0;
    if (bonuses[el.id] < req) return false;
  }
  return true;
}

function cloneSnapshot(s: GameSnapshot): GameSnapshot {
  return {
    players: s.players.map((p) => ({
      ...p,
      shards: { ...p.shards },
      crafted: [...p.crafted],
      reserved: [...p.reserved],
      patrons: [...p.patrons],
    })),
    supply: { ...s.supply },
    decks: {
      1: [...s.decks[1]],
      2: [...s.decks[2]],
      3: [...s.decks[3]],
    },
    market: {
      1: [...s.market[1]],
      2: [...s.market[2]],
      3: [...s.market[3]],
    },
    patrons: [...s.patrons],
    turnIndex: s.turnIndex,
    round: s.round,
    finalRoundTriggered: s.finalRoundTriggered,
    logs: [...s.logs],
  };
}

function createInitialGame(
  mode: GameMode,
  playerCount: number,
  personas: AiPersona[]
): GameSnapshot {
  const numPlayers = mode === 'pvp' ? 2 : playerCount;
  const baseGemSupply = numPlayers === 2 ? 4 : numPlayers === 3 ? 5 : 7;

  const t1 = shuffleArray(ALL_RECIPE_CARDS.filter((c) => c.tier === 1));
  const t2 = shuffleArray(ALL_RECIPE_CARDS.filter((c) => c.tier === 2));
  const t3 = shuffleArray(ALL_RECIPE_CARDS.filter((c) => c.tier === 3));

  const market: Record<Tier, (RecipeCard | null)[]> = {
    1: t1.slice(0, 4),
    2: t2.slice(0, 4),
    3: t3.slice(0, 4),
  };

  const decks: Record<Tier, RecipeCard[]> = {
    1: t1.slice(4),
    2: t2.slice(4),
    3: t3.slice(4),
  };

  const patrons = shuffleArray(ALL_PATRON_TILES).slice(0, numPlayers + 1);

  const players: PlayerState[] = Array.from({ length: numPlayers }, (_, idx) => {
    const isAi = mode === 'cpu' && idx > 0;
    const persona = personas[(idx - 1) % personas.length] || 'steady';
    const personaTag =
      persona === 'steady' ? '堅実' : persona === 'rush' ? '速攻' : 'パトロン';
    return {
      id: idx,
      name:
        mode === 'pvp'
          ? `錬金術師 P${idx + 1}`
          : idx === 0
            ? 'あなた（星見工房長）'
            : `自動人形 AI-${idx}（${personaTag}）`,
      isAi,
      persona,
      shards: {
        crimson: 0,
        azure: 0,
        emerald: 0,
        amber: 0,
        violet: 0,
        prism: 0,
      },
      crafted: [],
      reserved: [],
      patrons: [],
    };
  });

  return {
    players,
    supply: {
      crimson: baseGemSupply,
      azure: baseGemSupply,
      emerald: baseGemSupply,
      amber: baseGemSupply,
      violet: baseGemSupply,
      prism: 5,
    },
    decks,
    market,
    patrons,
    turnIndex: 0,
    round: 1,
    finalRoundTriggered: false,
    logs: [
      `✨ 『星屑のアトリエ』開幕！${numPlayers}人戦（名声星15★到達で最終ラウンド突入）`,
    ],
  };
}

// ============================================================================
// AI Decision Engine (Supports Both CPU Turns and Player AI Hints)
// ============================================================================

function computeRecommendedMove(
  state: GameSnapshot,
  playerIndex: number
): RecommendedMove {
  const player = state.players[playerIndex];
  const bonuses = getPlayerBonuses(player);
  const currentPrestige = getPlayerPrestige(player);
  const persona = player.persona;

  // Score helper for a card
  const scoreCardForPlayer = (card: RecipeCard, analysis: CostAnalysis): number => {
    let score = card.prestige * 16;

    // Does this bonus help toward any active patron?
    let patronSynergy = 0;
    for (const p of state.patrons) {
      const req = p.requirement[card.bonus] || 0;
      if (req > 0 && bonuses[card.bonus] < req) {
        const remainingForColor = req - bonuses[card.bonus];
        patronSynergy += remainingForColor === 1 ? 14 : 8;
      }
    }

    // Engine value: early in the game, bonuses are more valuable
    const totalBonuses =
      bonuses.crimson +
      bonuses.azure +
      bonuses.emerald +
      bonuses.amber +
      bonuses.violet;
    const engineWeight = Math.max(2, 14 - totalBonuses * 1.4);

    if (persona === 'steady') {
      score += engineWeight * 1.5 + patronSynergy * 1.0 - analysis.totalAfterDiscount * 1.6;
    } else if (persona === 'rush') {
      score += card.prestige * 10 + engineWeight * 0.7 - analysis.totalAfterDiscount * 1.2;
    } else {
      // patron-focused
      score += patronSynergy * 2.2 + engineWeight * 1.1 - analysis.totalAfterDiscount * 1.3;
    }

    // Winning move bonus!
    if (currentPrestige + card.prestige >= TARGET_PRESTIGE) {
      score += 200;
    }

    return score;
  };

  // 1. Check all craftable cards (Reserved + Market)
  let bestCraft: {
    card: RecipeCard;
    isReserved: boolean;
    score: number;
    analysis: CostAnalysis;
  } | null = null;

  for (const card of player.reserved) {
    const analysis = analyzeCardCost(player, card);
    if (analysis.canCraftNow) {
      const score = scoreCardForPlayer(card, analysis) + 4; // Slight preference to clear reserved slot
      if (!bestCraft || score > bestCraft.score) {
        bestCraft = { card, isReserved: true, score, analysis };
      }
    }
  }

  for (const tier of [3, 2, 1] as Tier[]) {
    for (const card of state.market[tier]) {
      if (!card) continue;
      const analysis = analyzeCardCost(player, card);
      if (analysis.canCraftNow) {
        const score = scoreCardForPlayer(card, analysis);
        if (!bestCraft || score > bestCraft.score) {
          bestCraft = { card, isReserved: false, score, analysis };
        }
      }
    }
  }

  if (bestCraft) {
    const discountSaved =
      Object.values(bestCraft.card.cost).reduce((a, b) => a + b, 0) -
      bestCraft.analysis.totalAfterDiscount;
    return {
      type: bestCraft.isReserved ? 'craft-reserved' : 'craft-market',
      cardId: bestCraft.card.id,
      label: `『${bestCraft.card.title}』を錬成（+${bestCraft.card.prestige}★ / ${ELEMENT_MAP[bestCraft.card.bonus].shortName}共鳴+1）`,
      reason:
        discountSaved > 0
          ? `共鳴エンジン割引（-${discountSaved}個）を活かして即座に錬成できます。`
          : `手持ちの星片で即座に錬成し、永続${ELEMENT_MAP[bestCraft.card.bonus].shortName}ボーナスを得られます。`,
    };
  }

  // 2. Identify target cards we are close to crafting
  const allCandidateCards: { card: RecipeCard; analysis: CostAnalysis; priority: number }[] = [];
  for (const c of player.reserved) {
    const an = analyzeCardCost(player, c);
    allCandidateCards.push({
      card: c,
      analysis: an,
      priority: scoreCardForPlayer(c, an) - an.missingAfterPrism * 9 + 8,
    });
  }
  for (const tier of [1, 2, 3] as Tier[]) {
    for (const c of state.market[tier]) {
      if (!c) continue;
      const an = analyzeCardCost(player, c);
      allCandidateCards.push({
        card: c,
        analysis: an,
        priority: scoreCardForPlayer(c, an) - an.missingAfterPrism * 9,
      });
    }
  }
  allCandidateCards.sort((a, b) => b.priority - a.priority);

  const currentTotalShards = getTotalShards(player.shards);

  // 3. If we have room for shards, gather the most needed Starlight Shards
  if (currentTotalShards < MAX_SHARDS) {
    const colorUrgency: Record<ElementColor, number> = {
      crimson: 1,
      azure: 1,
      emerald: 1,
      amber: 1,
      violet: 1,
    };

    const topTargets = allCandidateCards.slice(0, 4);
    topTargets.forEach((item, idx) => {
      const weight = (4 - idx) * 3;
      for (const el of ELEMENTS) {
        const c = el.id;
        const needed = Math.max(0, item.analysis.discountedCost[c] - player.shards[c]);
        if (needed > 0) {
          colorUrgency[c] += needed * weight;
        }
      }
    });

    // Check if taking 2 of the same color is legal and strongly helpful
    const topTarget = topTargets[0];
    if (topTarget && currentTotalShards <= MAX_SHARDS - 2) {
      for (const el of ELEMENTS) {
        const c = el.id;
        const deficit = topTarget.analysis.discountedCost[c] - player.shards[c];
        if (deficit >= 2 && state.supply[c] >= 4) {
          return {
            type: 'take-same',
            shards: [c, c],
            label: `${el.shortName}の星片を2個採取`,
            reason: `『${topTarget.card.title}』の不足分（${el.shortName}×${deficit}）を一気に埋める集中採取です。`,
          };
        }
      }
    }

    // Otherwise pick up to 3 different available colors sorted by urgency
    const availableColors = ELEMENTS.map((e) => e.id)
      .filter((c) => state.supply[c] > 0)
      .sort((a, b) => colorUrgency[b] - colorUrgency[a]);

    const maxTake = Math.min(3, MAX_SHARDS - currentTotalShards, availableColors.length);
    if (maxTake > 0) {
      const chosen = availableColors.slice(0, maxTake);
      const names = chosen.map((c) => ELEMENT_MAP[c].shortName).join('・');
      return {
        type: 'take-diff',
        shards: chosen,
        label: `異なる星片を採取（${names}）`,
        reason: topTarget
          ? `『${topTarget.card.title}』などの錬成に必要な星片を効率よく集めます。`
          : `次のレシピ錬成に向けて手元の星片バランスを整えます。`,
      };
    }
  }

  // 4. Reserve a high-value or 1-turn-away card (especially if prism available or hand is near full)
  if (player.reserved.length < MAX_RESERVED) {
    const reserveTarget =
      allCandidateCards.find(
        (item) =>
          !player.reserved.some((r) => r.id === item.card.id) &&
          item.card.prestige >= 2 &&
          item.analysis.missingAfterPrism <= 3
      ) ||
      allCandidateCards.find(
        (item) => !player.reserved.some((r) => r.id === item.card.id)
      );

    if (reserveTarget) {
      return {
        type: 'reserve',
        cardId: reserveTarget.card.id,
        label: `『${reserveTarget.card.title}』を予約（虹プリズム+1）`,
        reason: `狙い目の設計図を確保しつつ、ワイルド星片「虹プリズム結晶」を入手します。`,
      };
    }
  }

  // Fallback: take any available shard
  const fallbackColor = ELEMENTS.map((e) => e.id).find((c) => state.supply[c] > 0);
  if (fallbackColor) {
    return {
      type: 'take-diff',
      shards: [fallbackColor],
      label: `${ELEMENT_MAP[fallbackColor].shortName}の星片を採取`,
      reason: `サプライに残っている星片を確保します。`,
    };
  }

  return {
    type: 'take-diff',
    shards: [],
    label: '待機（採取可能な星片なし）',
    reason: '場の星片が枯渇しているため手番を送ります。',
  };
}

// ============================================================================
// Custom SVG Gem & Constellation Icons
// ============================================================================

function ShardSvgIcon({
  type,
  className = 'w-5 h-5',
}: {
  type: ShardType;
  className?: string;
}) {
  if (type === 'prism') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <defs>
          <linearGradient id="prismGrad" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="35%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <polygon
          points="12,2 20,8 17,20 7,20 4,8"
          fill="url(#prismGrad)"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <polygon points="12,5 16,10 12,18 8,10" fill="rgba(255,255,255,0.45)" />
      </svg>
    );
  }

  if (type === 'crimson') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <polygon
          points="12,2 20,9 16,21 8,21 4,9"
          fill="#e11d48"
          stroke="#fda4af"
          strokeWidth="1.5"
        />
        <polygon points="12,5 16,10 12,17 8,10" fill="#fb7185" />
      </svg>
    );
  }

  if (type === 'azure') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <polygon
          points="12,2 21,12 12,22 3,12"
          fill="#0284c7"
          stroke="#7dd3fc"
          strokeWidth="1.5"
        />
        <polygon points="12,6 17,12 12,18 7,12" fill="#38bdf8" />
      </svg>
    );
  }

  if (type === 'emerald') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <polygon
          points="7,3 17,3 21,12 17,21 7,21 3,12"
          fill="#059669"
          stroke="#6ee7b7"
          strokeWidth="1.5"
        />
        <polygon points="9,7 15,7 17,12 15,17 9,17 7,12" fill="#34d399" />
      </svg>
    );
  }

  if (type === 'amber') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="#d97706"
          stroke="#fde68a"
          strokeWidth="1.5"
        />
        <polygon points="12,5 15,12 12,19 9,12" fill="#fbbf24" />
      </svg>
    );
  }

  // violet
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <polygon
        points="12,2 19,7 19,17 12,22 5,17 5,7"
        fill="#7e22ce"
        stroke="#d8b4fe"
        strokeWidth="1.5"
      />
      <polygon points="12,6 16,9 16,15 12,18 8,15 8,9" fill="#c084fc" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function StellarAtelierGame() {
  // Game Configuration State
  const [mode, setMode] = useState<GameMode>('cpu');
  const [playerCount, setPlayerCount] = useState<number>(3);
  const [aiPersonas, setAiPersonas] = useState<AiPersona[]>(['steady', 'rush', 'patron']);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);

  // Core Game Snapshot & Undo Stack
  const [gameState, setGameState] = useState<GameSnapshot>(() =>
    createInitialGame('cpu', 3, ['steady', 'rush', 'patron'])
  );
  const [history, setHistory] = useState<GameSnapshot[]>([]);

  // Interactive Selection State
  const [selectedShards, setSelectedShards] = useState<ElementColor[]>([]);
  const [selectedReturnShards, setSelectedReturnShards] = useState<ShardType[]>([]);
  const [hintMove, setHintMove] = useState<RecommendedMove | null>(null);
  const [filterCraftableOnly, setFilterCraftableOnly] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Procedural Celestial Starlight Music-Box BGM
  useEffect(() => {
    if (!bgmOn || typeof window === 'undefined') return undefined;
    let cancelled = false;
    let timerId: number | null = null;
    const chords = [
      [261.63, 329.63, 392.0, 493.88, 659.25], // Cmaj9
      [220.0, 261.63, 329.63, 392.0, 587.33], // Am9
      [174.61, 220.0, 261.63, 329.63, 523.25], // Fmaj9
      [196.0, 246.94, 293.66, 392.0, 587.33], // G6
    ];
    let step = 0;

    const tick = () => {
      if (cancelled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioCtx();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') {
            void ctx.resume();
          }
          const now = ctx.currentTime;
          const chord = chords[step % chords.length];
          chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = idx === 0 ? 'triangle' : 'sine';
            const start = now + idx * 0.28;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(idx === 0 ? 0.018 : 0.011, start + 0.09);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 2.25);
          });
          step += 1;
        }
      } catch {
        // ignore audio errors
      }
      timerId = window.setTimeout(tick, 2800);
    };

    tick();
    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [bgmOn]);

  const playSound = useCallback(
    (kind: 'shard' | 'craft' | 'reserve' | 'patron' | 'win' | 'click') => {
      if (!soundOn || typeof window === 'undefined') return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const now = ctx.currentTime;
        const notes =
          kind === 'shard'
            ? [587.33, 880]
            : kind === 'craft'
              ? [523.25, 659.25, 783.99, 1046.5]
              : kind === 'reserve'
                ? [440, 554.37, 659.25]
                : kind === 'patron'
                  ? [587.33, 739.99, 880, 1174.66]
                  : kind === 'win'
                    ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
                    : [660];

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = kind === 'craft' || kind === 'patron' ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.065);
          gain.gain.setValueAtTime(0.08, now + i * 0.065);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.065);
          osc.stop(now + i * 0.065 + 0.24);
        });
      } catch {
        // Ignore Web Audio errors on restricted devices
      }
    },
    [soundOn]
  );

  // Derived Turn & Endgame State
  const numPlayers = gameState.players.length;
  const isGameOver =
    gameState.finalRoundTriggered && gameState.turnIndex === 0 && gameState.round > 1;
  const activePlayer = gameState.players[gameState.turnIndex] || gameState.players[0];
  const isHumanTurn = !isGameOver && !activePlayer.isAi;

  // Perspective player for the Engine Discount Analyzer (in CPU mode, always Human P0; in PvP, active player)
  const analyzerPlayer = mode === 'cpu' ? gameState.players[0] : activePlayer;
  const analyzerBonuses = useMemo(
    () => getPlayerBonuses(analyzerPlayer),
    [analyzerPlayer]
  );

  // Standings / Winner ranking
  const rankedPlayers = useMemo(() => {
    return [...gameState.players].sort((a, b) => {
      const diff = getPlayerPrestige(b) - getPlayerPrestige(a);
      if (diff !== 0) return diff;
      // Tie-breaker: fewer crafted cards wins
      return a.crafted.length - b.crafted.length;
    });
  }, [gameState.players]);

  // Reset / Start New Game
  const startNewGame = useCallback(
    (nextMode = mode, nextCount = playerCount, nextPersonas = aiPersonas) => {
      const fresh = createInitialGame(nextMode, nextCount, nextPersonas);
      setGameState(fresh);
      setHistory([]);
      setSelectedShards([]);
      setSelectedReturnShards([]);
      setHintMove(null);
      setBannerNotice(null);
      playSound('click');
    },
    [mode, playerCount, aiPersonas, playSound]
  );

  // End-of-turn processor (handles automatic Constellation Patron visit + Round advancement)
  const advanceTurnAndCheckPatrons = useCallback(
    (draft: GameSnapshot, actingPlayerIdx: number, actionLog: string): GameSnapshot => {
      const player = draft.players[actingPlayerIdx];
      const bonuses = getPlayerBonuses(player);

      // Automatic Constellation Patron Visit (1 patron per turn max)
      const eligiblePatronIdx = draft.patrons.findIndex((p) =>
        checkPatronEligibility(bonuses, p)
      );
      let patronNote = '';
      if (eligiblePatronIdx !== -1) {
        const [visitedPatron] = draft.patrons.splice(eligiblePatronIdx, 1);
        player.patrons.push(visitedPatron);
        patronNote = ` ／ 🌟星座パトロン『${visitedPatron.name}』が来訪（+3★）！`;
      }

      const newPrestige = getPlayerPrestige(player);
      let triggerNote = '';
      if (!draft.finalRoundTriggered && newPrestige >= TARGET_PRESTIGE) {
        draft.finalRoundTriggered = true;
        triggerNote = ` ／ 🔔${player.name}が${newPrestige}★に到達！このラウンド終了で終局します！`;
      }

      draft.logs = [
        `[R${draft.round}] ${player.name}: ${actionLog}${patronNote}${triggerNote}`,
        ...draft.logs.slice(0, 39),
      ];

      // Advance turn index
      const nextTurn = (actingPlayerIdx + 1) % draft.players.length;
      if (nextTurn === 0) {
        draft.round += 1;
      }
      draft.turnIndex = nextTurn;

      return draft;
    },
    []
  );

  // ============================================================================
  // Player & AI Action Executors
  // ============================================================================

  // Action 1: Gather Starlight Shards
  const executeTakeShards = useCallback(
    (
      takeColors: ElementColor[],
      returnShards: ShardType[] = [],
      recordUndo = true
    ) => {
      if (recordUndo) {
        setHistory((h) => [...h.slice(-15), cloneSnapshot(gameState)]);
      }
      const next = cloneSnapshot(gameState);
      const player = next.players[next.turnIndex];

      for (const c of takeColors) {
        if (next.supply[c] > 0) {
          next.supply[c] -= 1;
          player.shards[c] += 1;
        }
      }

      for (const r of returnShards) {
        if (player.shards[r] > 0) {
          player.shards[r] -= 1;
          next.supply[r] += 1;
        }
      }

      // Enforce 10-shard cap automatically if AI or any overflow remains
      while (getTotalShards(player.shards) > MAX_SHARDS) {
        const removable = ELEMENTS.map((e) => e.id).find(
          (c) => player.shards[c] > 0
        );
        if (removable) {
          player.shards[removable] -= 1;
          next.supply[removable] += 1;
        } else {
          break;
        }
      }

      const summary =
        takeColors.length === 2 && takeColors[0] === takeColors[1]
          ? `${ELEMENT_MAP[takeColors[0]].shortName}の星片を2個採取`
          : `星片を採取（${takeColors.map((c) => ELEMENT_MAP[c].shortName).join('・')}）`;

      const returnText =
        returnShards.length > 0
          ? `（上限10個調整のため${returnShards.length}個返却）`
          : '';

      const updated = advanceTurnAndCheckPatrons(
        next,
        gameState.turnIndex,
        `${summary}${returnText}`
      );
      setGameState(updated);
      setSelectedShards([]);
      setSelectedReturnShards([]);
      setHintMove(null);
      playSound('shard');
    },
    [gameState, advanceTurnAndCheckPatrons, playSound]
  );

  // Action 2: Craft a Recipe Card (from Market or Reserved)
  const executeCraftCard = useCallback(
    (cardId: string, recordUndo = true) => {
      const player = gameState.players[gameState.turnIndex];

      // Find card in market or reserved
      let targetCard: RecipeCard | null = null;
      let fromReservedIdx = -1;
      let fromMarketTier: Tier | null = null;
      let fromMarketSlot = -1;

      fromReservedIdx = player.reserved.findIndex((c) => c.id === cardId);
      if (fromReservedIdx !== -1) {
        targetCard = player.reserved[fromReservedIdx];
      } else {
        for (const tier of [1, 2, 3] as Tier[]) {
          const idx = gameState.market[tier].findIndex((c) => c?.id === cardId);
          if (idx !== -1 && gameState.market[tier][idx]) {
            targetCard = gameState.market[tier][idx];
            fromMarketTier = tier;
            fromMarketSlot = idx;
            break;
          }
        }
      }

      if (!targetCard) return;
      const analysis = analyzeCardCost(player, targetCard);
      if (!analysis.canCraftNow) return;

      if (recordUndo) {
        setHistory((h) => [...h.slice(-15), cloneSnapshot(gameState)]);
      }

      const next = cloneSnapshot(gameState);
      const nextPlayer = next.players[next.turnIndex];

      // Spend shards and return to supply
      for (const el of ELEMENTS) {
        const c = el.id;
        const spend = analysis.spendByColor[c];
        if (spend > 0) {
          nextPlayer.shards[c] -= spend;
          next.supply[c] += spend;
        }
      }
      if (analysis.prismNeeded > 0) {
        nextPlayer.shards.prism -= analysis.prismNeeded;
        next.supply.prism += analysis.prismNeeded;
      }

      // Remove from source & refill market if needed
      if (fromReservedIdx !== -1) {
        nextPlayer.reserved.splice(fromReservedIdx, 1);
      } else if (fromMarketTier !== null && fromMarketSlot !== -1) {
        const replacement = next.decks[fromMarketTier].shift() || null;
        next.market[fromMarketTier][fromMarketSlot] = replacement;
      }

      nextPlayer.crafted.push(targetCard);

      const prevPatrons = nextPlayer.patrons.length;
      const updated = advanceTurnAndCheckPatrons(
        next,
        gameState.turnIndex,
        `『${targetCard.title}』を錬成（+${targetCard.prestige}★ / ${ELEMENT_MAP[targetCard.bonus].shortName}共鳴+1）`
      );
      const gotPatron = updated.players[gameState.turnIndex].patrons.length > prevPatrons;

      setGameState(updated);
      setSelectedShards([]);
      setSelectedReturnShards([]);
      setHintMove(null);
      playSound(gotPatron ? 'patron' : 'craft');
    },
    [gameState, advanceTurnAndCheckPatrons, playSound]
  );

  // Action 3: Reserve a Market Recipe Card (+1 Prism Wild if available)
  const executeReserveCard = useCallback(
    (cardId: string, recordUndo = true) => {
      const player = gameState.players[gameState.turnIndex];
      if (player.reserved.length >= MAX_RESERVED) return;

      let targetCard: RecipeCard | null = null;
      let foundTier: Tier | null = null;
      let foundSlot = -1;

      for (const tier of [1, 2, 3] as Tier[]) {
        const idx = gameState.market[tier].findIndex((c) => c?.id === cardId);
        if (idx !== -1 && gameState.market[tier][idx]) {
          targetCard = gameState.market[tier][idx];
          foundTier = tier;
          foundSlot = idx;
          break;
        }
      }

      if (!targetCard || foundTier === null) return;

      if (recordUndo) {
        setHistory((h) => [...h.slice(-15), cloneSnapshot(gameState)]);
      }

      const next = cloneSnapshot(gameState);
      const nextPlayer = next.players[next.turnIndex];

      const replacement = next.decks[foundTier].shift() || null;
      next.market[foundTier][foundSlot] = replacement;
      nextPlayer.reserved.push(targetCard);

      let prismMsg = '（サプライの虹プリズム在庫0）';
      if (next.supply.prism > 0) {
        if (getTotalShards(nextPlayer.shards) < MAX_SHARDS) {
          next.supply.prism -= 1;
          nextPlayer.shards.prism += 1;
          prismMsg = '（+虹プリズム結晶1個）';
        } else {
          prismMsg = '（所持星片10個上限のため虹プリズム受取なし）';
        }
      }

      const updated = advanceTurnAndCheckPatrons(
        next,
        gameState.turnIndex,
        `設計図『${targetCard.title}』を予約${prismMsg}`
      );
      setGameState(updated);
      setSelectedShards([]);
      setSelectedReturnShards([]);
      setHintMove(null);
      playSound('reserve');
    },
    [gameState, advanceTurnAndCheckPatrons, playSound]
  );

  // ============================================================================
  // Automatic AI Turn Effect
  // ============================================================================

  useEffect(() => {
    if (isGameOver) return;
    const current = gameState.players[gameState.turnIndex];
    if (!current || !current.isAi) return;

    const timer = window.setTimeout(() => {
      const move = computeRecommendedMove(gameState, gameState.turnIndex);
      if (
        (move.type === 'craft-market' || move.type === 'craft-reserved') &&
        move.cardId
      ) {
        executeCraftCard(move.cardId, false);
      } else if (move.type === 'reserve' && move.cardId) {
        executeReserveCard(move.cardId, false);
      } else if (
        (move.type === 'take-same' || move.type === 'take-diff') &&
        move.shards
      ) {
        executeTakeShards(move.shards, [], false);
      } else {
        executeTakeShards([], [], false);
      }
    }, 620);

    return () => window.clearTimeout(timer);
  }, [
    gameState,
    isGameOver,
    executeCraftCard,
    executeReserveCard,
    executeTakeShards,
  ]);

  // Play victory fanfare when game ends
  useEffect(() => {
    if (isGameOver) {
      playSound('win');
    }
  }, [isGameOver, playSound]);

  // ============================================================================
  // Human Interactive Shard Selection Helpers
  // ============================================================================

  const handleToggleShardSelection = (color: ElementColor) => {
    if (!isHumanTurn) return;
    setBannerNotice(null);

    const countInSelection = selectedShards.filter((c) => c === color).length;
    const availableInSupply = gameState.supply[color];

    // If not yet selected:
    if (countInSelection === 0) {
      // Cannot add a new color if we already selected a pair of the same color
      if (
        selectedShards.length === 2 &&
        selectedShards[0] === selectedShards[1]
      ) {
        setBannerNotice(
          '同色2個採取を選んでいるため、他の色の星片は同時に選べません。'
        );
        return;
      }
      if (selectedShards.length >= 3) {
        setBannerNotice('異なる色の星片は1ターンに最大3個まで選択できます。');
        return;
      }
      if (availableInSupply <= 0) {
        setBannerNotice('その色の星片はサプライに在庫がありません。');
        return;
      }
      setSelectedShards([...selectedShards, color]);
      playSound('click');
      return;
    }

    // If selected once: clicking again either upgrades to a pair of 2 (if only 1 selected & supply >= 4) or deselects
    if (countInSelection === 1) {
      if (selectedShards.length === 1 && availableInSupply >= 4) {
        setSelectedShards([color, color]);
        playSound('click');
        return;
      }
      setSelectedShards(selectedShards.filter((c) => c !== color));
      setSelectedReturnShards([]);
      playSound('click');
      return;
    }

    // If selected twice (pair), clicking again clears it
    setSelectedShards([]);
    setSelectedReturnShards([]);
    playSound('click');
  };

  const activePlayerTotalShards = getTotalShards(activePlayer.shards);
  const overflowCount = Math.max(
    0,
    activePlayerTotalShards + selectedShards.length - MAX_SHARDS
  );

  const handleToggleReturnShard = (type: ShardType) => {
    const owned = activePlayer.shards[type];
    const alreadyReturning = selectedReturnShards.filter((t) => t === type).length;
    if (alreadyReturning < owned && selectedReturnShards.length < overflowCount) {
      setSelectedReturnShards([...selectedReturnShards, type]);
    } else if (alreadyReturning > 0) {
      const idx = selectedReturnShards.indexOf(type);
      if (idx !== -1) {
        const copy = [...selectedReturnShards];
        copy.splice(idx, 1);
        setSelectedReturnShards(copy);
      }
    }
  };

  const canConfirmShardTake =
    isHumanTurn &&
    selectedShards.length > 0 &&
    selectedReturnShards.length === overflowCount;

  // Undo handler
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGameState(prev);
    setSelectedShards([]);
    setSelectedReturnShards([]);
    setHintMove(null);
    setBannerNotice('1手前の状態に戻しました。');
    playSound('click');
  };

  // AI Hint handler
  const handleShowHint = () => {
    if (!isHumanTurn) return;
    const rec = computeRecommendedMove(gameState, gameState.turnIndex);
    setHintMove(rec);
    playSound('click');
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 select-none">
      {/* Top Navigation & Mode Header */}
      <header className="border-b border-indigo-500/25 bg-[#0b0f22]/95 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/games"
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/60 hover:text-amber-200"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-amber-400">
                CELESTIAL ENGINE-BUILDING BOARD GAME
              </p>
              <h2 className="text-sm font-black sm:text-lg text-white">
                星屑のアトリエ（Stellar Atelier）
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/50 disabled:opacity-40"
            >
              ↩ 1手戻す
            </button>
            <button
              type="button"
              onClick={handleShowHint}
              disabled={!isHumanTurn}
              className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-black text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-40"
            >
              💡 AI推奨手ナビ
            </button>
            <button
              type="button"
              onClick={() => setBgmOn((v) => !v)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                bgmOn
                  ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200'
                  : 'border-white/15 bg-white/[0.05] text-slate-300 hover:border-indigo-400/50'
              }`}
            >
              {bgmOn ? '🎵 BGM ON' : '🎵 BGM OFF'}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:border-indigo-400/50"
            >
              {soundOn ? '🔊 効果音 ON' : '🔇 効果音 OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 space-y-4">
        {/* Control Bar: Mode, Player Count, AI Personas & New Game */}
        <section className="rounded-2xl border border-indigo-500/25 bg-[#0d1329]/90 p-3.5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-indigo-400/30 bg-black/40 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('cpu');
                    startNewGame('cpu', playerCount, aiPersonas);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    mode === 'cpu'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🤖 CPU対戦（2〜4人）
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('pvp');
                    startNewGame('pvp', 2, aiPersonas);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    mode === 'pvp'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  👥 1台で2人対戦（パス＆プレイ）
                </button>
              </div>

              {mode === 'cpu' && (
                <>
                  <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1">
                    <span className="text-[11px] font-bold text-slate-300">人数:</span>
                    {[2, 3, 4].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          setPlayerCount(cnt);
                          startNewGame('cpu', cnt, aiPersonas);
                        }}
                        className={`rounded-md px-2 py-0.5 text-xs font-black transition ${
                          playerCount === cnt
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cnt}人
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1">
                    <span className="text-[11px] font-bold text-slate-300">
                      AI1思考タイプ:
                    </span>
                    {(['steady', 'rush', 'patron'] as AiPersona[]).map((pType) => (
                      <button
                        key={pType}
                        type="button"
                        onClick={() => {
                          const updated: AiPersona[] = [
                            pType,
                            pType === 'steady' ? 'rush' : 'steady',
                            'patron',
                          ];
                          setAiPersonas(updated);
                          startNewGame('cpu', playerCount, updated);
                        }}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-black transition ${
                          aiPersonas[0] === pType
                            ? 'bg-purple-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {pType === 'steady'
                          ? '堅実型'
                          : pType === 'rush'
                            ? '速攻型'
                            : 'パトロン重視型'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-amber-400/30 bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-200">
                ラウンド <span className="font-mono font-black">{gameState.round}</span> ／ 勝利条件:{' '}
                <span className="font-mono font-black text-amber-300">
                  {TARGET_PRESTIGE}★
                </span>
              </div>
              <button
                type="button"
                onClick={() => startNewGame()}
                className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-3 py-1.5 text-xs font-black text-indigo-100 transition hover:bg-indigo-500/35"
              >
                🔄 新規対局
              </button>
            </div>
          </div>
        </section>

        {/* Final Round or Game Over Banner */}
        {isGameOver && (
          <section className="rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-950/90 via-indigo-950/90 to-purple-950/90 p-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-widest text-amber-300">
                  🌟 GRAND ATELIER FINALE — 終局結果発表
                </p>
                <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
                  🏆 優勝: {rankedPlayers[0].name}（名声星{' '}
                  {getPlayerPrestige(rankedPlayers[0])}★ ／ 錬成数{' '}
                  {rankedPlayers[0].crafted.length}枚）
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  同点の場合は、より少ないレシピ枚数で効率よくエンジンを築いた錬金術師が上位となります。
                </p>
              </div>
              <button
                type="button"
                onClick={() => startNewGame()}
                className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-300"
              >
                もう一度アトリエを開く
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {rankedPlayers.map((p, idx) => (
                <div
                  key={p.id}
                  className={`rounded-xl border p-3 ${
                    idx === 0
                      ? 'border-amber-400 bg-amber-500/15'
                      : 'border-white/15 bg-black/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300">
                      #{idx + 1} {p.name}
                    </span>
                    <span className="font-mono text-base font-black text-white">
                      {getPlayerPrestige(p)} ★
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">
                    錬成レシピ: {p.crafted.length}枚 ／ パトロン来訪: {p.patrons.length}人
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI Hint or System Notice Banner */}
        {(hintMove || bannerNotice) && (
          <div className="rounded-xl border border-amber-400/50 bg-amber-950/60 px-4 py-2.5 text-xs text-amber-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              {hintMove ? (
                <>
                  <span className="font-black text-amber-300">
                    💡 AI推奨手: {hintMove.label}
                  </span>{' '}
                  — {hintMove.reason}
                </>
              ) : (
                <span>ℹ️ {bannerNotice}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setHintMove(null);
                setBannerNotice(null);
              }}
              className="text-[11px] font-bold text-amber-300 underline"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Constellation Patrons Bar + Engine Discount & Efficiency Analyzer */}
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          {/* Constellation Patrons (`星座パトロンタイル`, +3 Prestige) */}
          <section className="rounded-2xl border border-purple-500/30 bg-[#0d1228]/90 p-3.5 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div>
                <h3 className="text-xs font-black tracking-wider text-purple-200 flex items-center gap-1.5">
                  <span>👑 星座パトロンタイル（条件達成で手番終了時に自動来訪 +3★）</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  星片の消費ではなく、錬成済みレシピの「永続共鳴ボーナス数」が条件を満たすと自動で訪れます。
                </p>
              </div>
              <span className="rounded-full border border-purple-400/40 bg-purple-950/60 px-2.5 py-0.5 text-[11px] font-black text-purple-200">
                残り {gameState.patrons.length} 柱
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {gameState.patrons.map((patron) => {
                const eligible = checkPatronEligibility(analyzerBonuses, patron);
                return (
                  <div
                    key={patron.id}
                    className={`rounded-xl border p-2.5 transition ${
                      eligible
                        ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                        : 'border-purple-400/25 bg-black/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-purple-300">
                        {patron.constellation}
                      </span>
                      <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-xs font-black text-amber-300">
                        +{patron.prestige}★
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-black text-white truncate">
                      {patron.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ELEMENTS.map((el) => {
                        const req = patron.requirement[el.id];
                        if (!req) return null;
                        const have = analyzerBonuses[el.id];
                        const met = have >= req;
                        return (
                          <span
                            key={el.id}
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black ${
                              met
                                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                : el.badgeClass
                            }`}
                          >
                            <ShardSvgIcon type={el.id} className="w-3 h-3" />
                            {el.shortName} {have}/{req}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Engine Discount & Efficiency Analyzer (`錬成エンジン割引＆必要コスト計算ナビ`) */}
          <section className="rounded-2xl border border-amber-500/30 bg-[#0d1326]/90 p-3.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="text-xs font-black tracking-wider text-amber-300">
                  ⚙️ 錬成エンジン割引＆必要コスト計算ナビ（{analyzerPlayer.name}）
                </h3>
                <p className="text-[11px] text-slate-400">
                  各属性の「永続共鳴割引」と「手持ち星片」の合計購買力（最大支払可能コスト）をリアルタイム算出
                </p>
              </div>
              <span className="rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-200">
                総割引力:{' '}
                {Object.values(analyzerBonuses).reduce((a, b) => a + b, 0)} 個分
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {ELEMENTS.map((el) => {
                const disc = analyzerBonuses[el.id];
                const shard = analyzerPlayer.shards[el.id];
                const totalPower = disc + shard;
                return (
                  <div
                    key={el.id}
                    className={`rounded-xl border p-2 ${el.bgClass} ${el.borderClass}`}
                  >
                    <div className="flex items-center gap-1">
                      <ShardSvgIcon type={el.id} className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-black text-white">
                        {el.shortName}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-[10px]">
                      <div className="flex justify-between text-slate-300">
                        <span>永続割引</span>
                        <span className="font-mono font-black text-emerald-300">
                          -{disc}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>所持星片</span>
                        <span className="font-mono font-bold text-white">
                          {shard}
                        </span>
                      </div>
                      <div className="border-t border-white/10 pt-0.5 flex justify-between font-black text-amber-300">
                        <span>購買力</span>
                        <span className="font-mono">{totalPower}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Prism Wild Power */}
              <div className="rounded-xl border border-pink-400/50 bg-gradient-to-br from-rose-950/70 via-indigo-950/70 to-purple-950/70 p-2">
                <div className="flex items-center gap-1">
                  <ShardSvgIcon type="prism" className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-black text-white">虹結晶</span>
                </div>
                <div className="mt-1 space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-slate-300">
                    <span>ワイルド</span>
                    <span className="font-mono font-black text-pink-300">
                      全色対応
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>所持数</span>
                    <span className="font-mono font-bold text-white">
                      {analyzerPlayer.shards.prism}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-0.5 flex justify-between font-black text-amber-300">
                    <span>予約枠</span>
                    <span className="font-mono">
                      {analyzerPlayer.reserved.length}/{MAX_RESERVED}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Main Two-Column Arena: Left = Starlight Shard Supply + Tier I/II/III Market | Right = Alchemist Dashboards + Logs */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px]">
          {/* Left Column: Shard Supply & Recipe Market */}
          <div className="space-y-4">
            {/* Action 1: Starlight Shard Supply & Collection Panel */}
            <section className="rounded-2xl border border-indigo-500/30 bg-[#0c1226]/95 p-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>💎 星片サプライ（アクション①：星片の採取）</span>
                    <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-black text-indigo-200">
                      手番: {activePlayer.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    【ルール】異なる色を最大3個まで採取、または在庫4個以上の同じ色を2個採取（所持上限10個）
                  </p>
                </div>

                {selectedShards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedShards([]);
                      setSelectedReturnShards([]);
                    }}
                    className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    選択クリア
                  </button>
                )}
              </div>

              {/* 5 Elemental Shards + 1 Prism Crystal */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {ELEMENTS.map((el) => {
                  const supplyCount = gameState.supply[el.id];
                  const pickedCount = selectedShards.filter(
                    (c) => c === el.id
                  ).length;
                  const canTakePair = supplyCount >= 4;

                  return (
                    <button
                      key={el.id}
                      type="button"
                      disabled={!isHumanTurn || (supplyCount === 0 && pickedCount === 0)}
                      onClick={() => handleToggleShardSelection(el.id)}
                      className={`group relative flex flex-col items-center justify-between rounded-xl border p-2.5 text-left transition ${
                        pickedCount > 0
                          ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_16px_rgba(251,191,36,0.3)] scale-[1.02]'
                          : `${el.bgClass} ${el.borderClass} hover:border-white/50`
                      } disabled:opacity-40`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs font-black text-white">
                          {el.shortName}
                        </span>
                        <span className="rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-xs font-black text-white">
                          残 {supplyCount}
                        </span>
                      </div>

                      <div className="my-2 flex items-center justify-center">
                        <ShardSvgIcon type={el.id} className="w-8 h-8" />
                      </div>

                      <div className="w-full text-center">
                        {pickedCount > 0 ? (
                          <span className="inline-block w-full rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-black text-slate-950">
                            選択中 ×{pickedCount}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">
                            {canTakePair ? '1個 / 同色2個OK' : supplyCount > 0 ? '1個採取OK' : '在庫切れ'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Wild Prism Crystal info card */}
                <div className="flex flex-col items-center justify-between rounded-xl border border-pink-400/40 bg-gradient-to-b from-rose-950/60 to-purple-950/60 p-2.5">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-black text-pink-200">
                      虹プリズム
                    </span>
                    <span className="rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-xs font-black text-pink-200">
                      残 {gameState.supply.prism}
                    </span>
                  </div>
                  <div className="my-2 flex items-center justify-center">
                    <ShardSvgIcon type="prism" className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] font-bold text-pink-200 text-center">
                    設計図予約で+1獲得
                  </span>
                </div>
              </div>

              {/* 10-Shard Hand Limit Return Selector (shown when taking shards would exceed 10) */}
              {selectedShards.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-400/40 bg-black/40 p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black text-white">
                      <span>
                        採取予定:{' '}
                        {selectedShards
                          .map((c) => ELEMENT_MAP[c].shortName)
                          .join(' ＋ ')}
                      </span>
                      <span className="text-slate-400">｜</span>
                      <span>
                        採取後の所持数:{' '}
                        <span
                          className={
                            overflowCount > 0
                              ? 'text-rose-300 font-black'
                              : 'text-emerald-300 font-black'
                          }
                        >
                          {activePlayerTotalShards +
                            selectedShards.length -
                            selectedReturnShards.length}{' '}
                          / {MAX_SHARDS}個
                        </span>
                      </span>
                    </div>

                    {overflowCount > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-rose-300">
                          ⚠️ 上限10個を超えるため、手元から返却する星片をあと{' '}
                          {overflowCount - selectedReturnShards.length} 個選んでください:
                        </span>
                        {ELEMENTS.map((el) => {
                          const owned = activePlayer.shards[el.id];
                          if (owned <= 0) return null;
                          const returning = selectedReturnShards.filter(
                            (t) => t === el.id
                          ).length;
                          return (
                            <button
                              key={el.id}
                              type="button"
                              onClick={() => handleToggleReturnShard(el.id)}
                              className={`rounded-md border px-2 py-0.5 text-[11px] font-black ${
                                returning > 0
                                  ? 'border-rose-400 bg-rose-500/30 text-white'
                                  : 'border-white/20 bg-white/5 text-slate-200'
                              }`}
                            >
                              {el.shortName}（所持{owned} / 返却{returning}）
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!canConfirmShardTake}
                    onClick={() =>
                      executeTakeShards(selectedShards, selectedReturnShards, true)
                    }
                    className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:bg-amber-300 disabled:opacity-40"
                  >
                    ✨ この星片を採取して手番終了
                  </button>
                </div>
              )}
            </section>

            {/* Action 2 & 3: Alchemical Recipe Market (Tier III, II, I) */}
            <section className="rounded-2xl border border-indigo-500/30 bg-[#0b1022]/95 p-4 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white">
                    📜 工房レシピマーケット（アクション②：錬成 ／ アクション③：設計図の予約）
                  </h3>
                  <p className="text-xs text-slate-300">
                    各カードのコストは<strong className="text-amber-300">永続共鳴ボーナス割引後</strong>の必要星片数を併記しています。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterCraftableOnly((v) => !v)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                    filterCraftableOnly
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                      : 'border-white/15 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  {filterCraftableOnly
                    ? '✅ 錬成可能・1手圏内のみ表示中'
                    : '🔍 全レシピ表示中（絞込切替）'}
                </button>
              </div>

              {([3, 2, 1] as Tier[]).map((tier) => {
                const meta = TIER_META[tier];
                const deckCount = gameState.decks[tier].length;
                const cards = gameState.market[tier];

                return (
                  <div key={tier} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-lg border px-2.5 py-0.5 text-xs font-black ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {meta.sub}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        山札残り: {deckCount}枚
                      </span>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                      {cards.map((card, slotIdx) => {
                        if (!card) {
                          return (
                            <div
                              key={`empty-${tier}-${slotIdx}`}
                              className="flex h-44 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 text-xs text-slate-500"
                            >
                              山札枯渇
                            </div>
                          );
                        }

                        const analysis = analyzeCardCost(analyzerPlayer, card);
                        const activeAnalysis = analyzeCardCost(activePlayer, card);
                        const bonusMeta = ELEMENT_MAP[card.bonus];
                        const isHinted = hintMove?.cardId === card.id;

                        if (
                          filterCraftableOnly &&
                          !analysis.canCraftNow &&
                          !analysis.isOneTurnAway
                        ) {
                          return (
                            <div
                              key={card.id}
                              className="flex h-44 flex-col items-center justify-center rounded-xl border border-white/5 bg-black/20 p-3 opacity-35 text-center"
                            >
                              <p className="text-xs font-bold text-slate-400">
                                {card.title}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1">
                                あと {analysis.missingAfterPrism} 星片不足
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={card.id}
                            className={`relative flex flex-col justify-between rounded-xl border p-3 transition ${
                              isHinted
                                ? 'border-amber-300 ring-2 ring-amber-400/60 bg-amber-950/35'
                                : analysis.canCraftNow
                                  ? 'border-emerald-400/80 bg-emerald-950/25 shadow-[0_0_18px_rgba(52,211,153,0.18)]'
                                  : analysis.isOneTurnAway
                                    ? 'border-amber-400/50 bg-indigo-950/40'
                                    : 'border-white/15 bg-[#111833]/90'
                            }`}
                          >
                            {/* Top Row: Prestige Stars + Permanent Elemental Resonance Bonus */}
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="rounded-lg bg-black/60 px-2 py-0.5 font-mono text-base font-black text-amber-300">
                                    {card.prestige > 0 ? `${card.prestige}★` : '0★'}
                                  </span>
                                  {analysis.canCraftNow ? (
                                    <span className="rounded-md bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                                      錬成可能！
                                    </span>
                                  ) : analysis.isOneTurnAway ? (
                                    <span className="rounded-md border border-amber-400/60 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
                                      あと1手圏内
                                    </span>
                                  ) : null}
                                </div>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-black ${bonusMeta.badgeClass}`}
                                  title="錬成後に永続で得られる星片割引ボーナス"
                                >
                                  <ShardSvgIcon
                                    type={card.bonus}
                                    className="w-3.5 h-3.5"
                                  />
                                  {bonusMeta.shortName}+1
                                </span>
                              </div>

                              <h4 className="mt-1.5 text-xs font-black text-white leading-snug">
                                {card.title}
                              </h4>
                            </div>

                            {/* Middle Row: Cost Breakdown with Discounted Values */}
                            <div className="my-2.5 space-y-1">
                              <div className="flex flex-wrap gap-1">
                                {ELEMENTS.map((el) => {
                                  const raw = card.cost[el.id];
                                  if (!raw) return null;
                                  const afterDisc = analysis.discountedCost[el.id];
                                  const have = analyzerPlayer.shards[el.id];
                                  const isMet = have >= afterDisc;

                                  return (
                                    <div
                                      key={el.id}
                                      className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${
                                        isMet
                                          ? 'border-emerald-400/50 bg-emerald-950/60 text-emerald-200'
                                          : el.badgeClass
                                      }`}
                                    >
                                      <ShardSvgIcon
                                        type={el.id}
                                        className="w-3 h-3"
                                      />
                                      <span>{el.shortName}</span>
                                      <span className="font-mono font-black">
                                        {afterDisc}
                                      </span>
                                      {afterDisc < raw && (
                                        <span className="text-[9px] line-through opacity-60">
                                          {raw}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-[10px] text-slate-400">
                                割引後コスト計:{' '}
                                <span className="font-mono font-black text-white">
                                  {analysis.totalAfterDiscount}
                                </span>
                                {analysis.prismNeeded > 0 && (
                                  <span className="text-pink-300">
                                    （虹結晶{analysis.prismNeeded}個使用）
                                  </span>
                                )}
                                {!analysis.canCraftNow && (
                                  <span className="text-amber-300">
                                    {' '}
                                    ／ 不足 {analysis.missingAfterPrism}個
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Action Buttons: Craft or Reserve */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
                              <button
                                type="button"
                                disabled={!isHumanTurn || !activeAnalysis.canCraftNow}
                                onClick={() => executeCraftCard(card.id, true)}
                                className={`rounded-lg px-2 py-1.5 text-[11px] font-black transition ${
                                  isHumanTurn && activeAnalysis.canCraftNow
                                    ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow'
                                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                ⚒️ 錬成する
                              </button>
                              <button
                                type="button"
                                disabled={
                                  !isHumanTurn ||
                                  activePlayer.reserved.length >= MAX_RESERVED
                                }
                                onClick={() => executeReserveCard(card.id, true)}
                                className="rounded-lg border border-pink-400/40 bg-pink-500/15 px-2 py-1.5 text-[11px] font-black text-pink-200 transition hover:bg-pink-500/30 disabled:opacity-35"
                              >
                                📌 予約(+虹)
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          {/* Right Column: Alchemist Player Boards, Reserved Cards & Action Log */}
          <div className="space-y-4">
            {/* Players Status & Engine Summary */}
            <section className="rounded-2xl border border-indigo-500/30 bg-[#0c1226]/95 p-3.5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black tracking-wider text-indigo-200">
                  🧙 各錬金術師のアトリエ状況（全{numPlayers}名）
                </h3>
                {gameState.finalRoundTriggered && !isGameOver && (
                  <span className="rounded-full bg-rose-500/30 border border-rose-400 px-2 py-0.5 text-[10px] font-black text-rose-200 animate-pulse">
                    🔥 最終ラウンド進行中
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {gameState.players.map((p, idx) => {
                  const isCurrent = idx === gameState.turnIndex && !isGameOver;
                  const prestige = getPlayerPrestige(p);
                  const bonuses = getPlayerBonuses(p);
                  const shardTotal = getTotalShards(p.shards);

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-3 transition ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-950/25 shadow-[0_0_15px_rgba(251,191,36,0.18)]'
                          : 'border-white/10 bg-black/35'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                          )}
                          <span className="text-xs font-black text-white">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                            星片 {shardTotal}/{MAX_SHARDS}
                          </span>
                          <span className="rounded-lg bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 font-mono text-sm font-black text-amber-300">
                            {prestige} ★
                          </span>
                        </div>
                      </div>

                      {/* Shards & Resonance Bonuses Matrix */}
                      <div className="mt-2 grid grid-cols-6 gap-1 text-center">
                        {ELEMENTS.map((el) => (
                          <div
                            key={el.id}
                            className={`rounded-lg border px-1 py-1 ${el.bgClass} ${el.borderClass}`}
                          >
                            <div className="flex items-center justify-center gap-0.5">
                              <ShardSvgIcon type={el.id} className="w-3 h-3" />
                              <span className="text-[9px] font-bold text-slate-200">
                                {el.shortName}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] font-mono">
                              <span
                                className="font-black text-emerald-300"
                                title="永続割引ボーナス"
                              >
                                +{bonuses[el.id]}
                              </span>
                              <span className="text-slate-400"> / </span>
                              <span
                                className="font-bold text-white"
                                title="所持星片"
                              >
                                {p.shards[el.id]}
                              </span>
                            </div>
                          </div>
                        ))}

                        <div className="rounded-lg border border-pink-400/40 bg-pink-950/50 px-1 py-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <ShardSvgIcon type="prism" className="w-3 h-3" />
                            <span className="text-[9px] font-bold text-pink-200">
                              虹
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10px] font-mono font-black text-pink-200">
                            {p.shards.prism}個
                          </div>
                        </div>
                      </div>

                      {/* Patrons & Crafted Count */}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
                        <span>
                          錬成済: <strong className="text-white">{p.crafted.length}</strong>枚 ／ 予約中:{' '}
                          <strong className="text-white">{p.reserved.length}</strong>/{MAX_RESERVED}枚
                        </span>
                        {p.patrons.length > 0 && (
                          <span className="text-amber-300 font-bold">
                            👑 パトロン×{p.patrons.length}（+{p.patrons.length * 3}★）
                          </span>
                        )}
                      </div>

                      {/* Reserved Cards for this player (Craftable on their turn) */}
                      {p.reserved.length > 0 && (
                        <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                          <p className="text-[10px] font-black text-pink-300">
                            📌 {p.name}の予約済み設計図（{p.reserved.length}枚）:
                          </p>
                          {p.reserved.map((rCard) => {
                            const rAnalysis = analyzeCardCost(p, rCard);
                            const rBonus = ELEMENT_MAP[rCard.bonus];
                            return (
                              <div
                                key={rCard.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-pink-400/30 bg-black/50 px-2.5 py-1.5"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-black text-amber-300">
                                      {rCard.prestige}★
                                    </span>
                                    <span
                                      className={`rounded border px-1 py-0.2 text-[9px] font-black ${rBonus.badgeClass}`}
                                    >
                                      {rBonus.shortName}+1
                                    </span>
                                    <span className="text-xs font-bold text-white truncate">
                                      {rCard.title}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    割引後残りコスト: {rAnalysis.totalAfterDiscount}（不足{' '}
                                    {rAnalysis.missingAfterPrism}）
                                  </p>
                                </div>

                                {isCurrent && !p.isAi && (
                                  <button
                                    type="button"
                                    disabled={!rAnalysis.canCraftNow}
                                    onClick={() => executeCraftCard(rCard.id, true)}
                                    className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-black ${
                                      rAnalysis.canCraftNow
                                        ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    錬成
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Action History Log */}
            <section className="rounded-2xl border border-indigo-500/30 bg-[#0b1022]/95 p-3.5 shadow-xl">
              <h3 className="text-xs font-black tracking-wider text-indigo-200 mb-2">
                📜 アトリエ錬成ログ（行動履歴）
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {gameState.logs.map((entry, i) => (
                  <div
                    key={`${i}-${entry.slice(0, 12)}`}
                    className={`rounded-lg border px-2.5 py-1.5 leading-relaxed ${
                      i === 0
                        ? 'border-amber-400/40 bg-amber-950/30 text-amber-100 font-bold'
                        : 'border-white/5 bg-black/30 text-slate-300'
                    }`}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
