'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// ============================================================================
// Types & Game Data Definitions
// ============================================================================

export type CardColor = 'blue' | 'green' | 'red' | 'purple';
export type CardTag = 'harvest' | 'craft' | 'market' | 'tavern' | 'fleet' | 'guild';
export type WonderId = 'lighthouse' | 'station' | 'shipyard' | 'clocktower';
export type AiStyle = 'balanced' | 'rush1d' | 'heavy2d';
export type GameMode = 'cpu' | 'pvp';
export type TurnPhase =
  | 'choose_roll'
  | 'rolling'
  | 'reroll_prompt'
  | 'resolving'
  | 'purple_swap'
  | 'build'
  | 'game_over';

export interface DistrictDef {
  id: string;
  name: string;
  dice: number[];
  diceLabel: string;
  color: CardColor;
  tag: CardTag;
  tagLabel: string;
  cost: number;
  maxStock: number;
  maxPerPlayer?: number;
  icon: string;
  shortDesc: string;
  detailDesc: string;
  baseIncome: number;
  synergyTag?: CardTag;
}

export interface WonderDef {
  id: WonderId;
  name: string;
  cost: number;
  icon: string;
  title: string;
  effectText: string;
}

export interface PlayerState {
  id: number;
  name: string;
  isCpu: boolean;
  aiStyle: AiStyle;
  colorClass: string;
  badgeBg: string;
  gold: number;
  cards: Record<string, number>;
  wonders: Record<WonderId, boolean>;
}

export interface FloatingDelta {
  id: string;
  playerId: number;
  amount: number;
  reason: string;
  color: CardColor | 'gold';
}

export interface ResolutionEvent {
  stepOrder: 1 | 2 | 3; // 1: Red, 2: Blue, 3: Green & Purple
  cardId: string;
  cardName: string;
  cardColor: CardColor;
  ownerId: number;
  ownerName: string;
  deltaByPlayer: Record<number, number>;
  summary: string;
}

export const WONDER_DEFS: WonderDef[] = [
  {
    id: 'lighthouse',
    name: '双子灯台',
    cost: 4,
    icon: '',
    title: '1ダイス / 2ダイス選択解放',
    effectText: '手番のダイスロール時に「1個（1〜6）」か「2個（2〜12）」を自由に選んで振れるようになります。',
  },
  {
    id: 'station',
    name: '蒸気鉄道駅',
    cost: 10,
    icon: '',
    title: '振り直し特権（1ターン1回）',
    effectText: 'ダイスを振った出目が気に入らない時、1ターンに1度だけダイスを振り直すことができます（個数変更も可）。',
  },
  {
    id: 'shipyard',
    name: '交易造船所',
    cost: 16,
    icon: '',
    title: '商業・歓楽街の収益+1G強化',
    effectText: '自分が所有する「商業市場（商船タグ）」と「歓楽街（赤カード）」の1枚あたりの獲得コインが常時+1Gされます。',
  },
  {
    id: 'clocktower',
    name: '天空時計塔',
    cost: 24,
    icon: '️',
    title: 'ゾロ目で追加ターン発動',
    effectText: 'ダイスを2個振って同じ出目（ゾロ目）が出た場合、このターンの都市建設フェーズ終了後にもう1回連続で自分の手番を行えます。',
  },
];

export const DISTRICT_DEFS: DistrictDef[] = [
  {
    id: 'wheat_field',
    name: '潮風小麦畑',
    dice: [1],
    diceLabel: '[1]',
    color: 'blue',
    tag: 'harvest',
    tagLabel: '農水資源',
    cost: 1,
    maxStock: 6,
    icon: '',
    shortDesc: '誰の番でも出目[1]で +1G',
    detailDesc: '一次産業ブルーカード：誰のターンでもダイス合計が1なら銀行から1Gを獲得（初期所有）。',
    baseIncome: 1,
  },
  {
    id: 'kelp_ranch',
    name: '海藻牧場',
    dice: [2],
    diceLabel: '[2]',
    color: 'blue',
    tag: 'harvest',
    tagLabel: '農水資源',
    cost: 1,
    maxStock: 6,
    icon: '',
    shortDesc: '誰の番でも出目[2]で +1G',
    detailDesc: '一次産業ブルーカード：誰のターンでもダイス合計が2なら銀行から1Gを獲得。',
    baseIncome: 1,
  },
  {
    id: 'harbor_bakery',
    name: '港のパン工房',
    dice: [2, 3],
    diceLabel: '[2・3]',
    color: 'green',
    tag: 'market',
    tagLabel: '商業市場',
    cost: 1,
    maxStock: 6,
    icon: '',
    shortDesc: '自分の番に出目[2・3]で +1G',
    detailDesc: '商業グリーンカード：自分のターンにダイス合計が2または3なら銀行から1Gを獲得（交易造船所で+1G）。',
    baseIncome: 1,
  },
  {
    id: 'sailors_tavern',
    name: '船乗り酒場',
    dice: [3],
    diceLabel: '[3]',
    color: 'red',
    tag: 'tavern',
    tagLabel: '歓楽街',
    cost: 2,
    maxStock: 6,
    icon: '',
    shortDesc: '他人の番に出目[3]で手番者から 1G徴収',
    detailDesc: '歓楽街レッドカード：他プレイヤーのターンに出目3が出た時、手番プレイヤーから1Gを徴収（交易造船所で2G徴収）。',
    baseIncome: 1,
  },
  {
    id: 'general_pier',
    name: '雑貨桟橋',
    dice: [4],
    diceLabel: '[4]',
    color: 'green',
    tag: 'market',
    tagLabel: '商業市場',
    cost: 2,
    maxStock: 6,
    icon: '',
    shortDesc: '自分の番に出目[4]で +3G',
    detailDesc: '商業グリーンカード：自分のターンにダイス合計が4なら銀行から3Gを獲得（交易造船所で+1G）。',
    baseIncome: 3,
  },
  {
    id: 'cedar_woods',
    name: '帆船杉林',
    dice: [5],
    diceLabel: '[5]',
    color: 'blue',
    tag: 'craft',
    tagLabel: '工業資材',
    cost: 3,
    maxStock: 6,
    icon: '',
    shortDesc: '誰の番でも出目[5]で +1G',
    detailDesc: '一次産業ブルーカード：誰のターンでもダイス合計が5なら銀行から1Gを獲得。後半の大型工房のシナジー源になります。',
    baseIncome: 1,
  },
  {
    id: 'lighthouse_guild',
    name: '港湾組合本部',
    dice: [6],
    diceLabel: '[6]',
    color: 'purple',
    tag: 'guild',
    tagLabel: 'ギルド',
    cost: 6,
    maxStock: 4,
    maxPerPlayer: 1,
    icon: '️',
    shortDesc: '自分の番に出目[6]で全員から 2Gずつ徴収',
    detailDesc: 'ギルドパープルカード（1人1枚制限）：自分のターンに出目6が出た時、他の全プレイヤーから最大2Gずつを徴収します。',
    baseIncome: 2,
  },
  {
    id: 'merchant_exchange',
    name: '海運取引所',
    dice: [6],
    diceLabel: '[6]',
    color: 'purple',
    tag: 'guild',
    tagLabel: 'ギルド',
    cost: 7,
    maxStock: 4,
    maxPerPlayer: 1,
    icon: '️',
    shortDesc: '自分の番に出目[6]で 施設1枚トレード＋2G',
    detailDesc: 'ギルドパープルカード（1人1枚制限）：自分のターンに出目6が出た時、銀行から2Gを得て、さらに他人の非紫カード1枚と自分のカード1枚を交換できます。',
    baseIncome: 2,
  },
  {
    id: 'spice_depot',
    name: '香辛料熟成庫',
    dice: [7],
    diceLabel: '[7]',
    color: 'green',
    tag: 'fleet',
    tagLabel: '大型商団',
    cost: 5,
    maxStock: 6,
    icon: '',
    shortDesc: '自分の番[7]で「農水資源」1枚につき +3G',
    detailDesc: '商業グリーンカード：自分のターンに出目7が出た時、自分が持つ「農水資源（潮風小麦畑・海藻牧場・遠洋トロール船）」1枚につき3Gを獲得！',
    baseIncome: 3,
    synergyTag: 'harvest',
  },
  {
    id: 'barrel_foundry',
    name: '大樽造船工房',
    dice: [8],
    diceLabel: '[8]',
    color: 'green',
    tag: 'fleet',
    tagLabel: '大型商団',
    cost: 3,
    maxStock: 6,
    icon: '️',
    shortDesc: '自分の番[8]で「工業資材」1枚につき +3G',
    detailDesc: '商業グリーンカード：自分のターンに出目8が出た時、自分が持つ「工業資材（帆船杉林・海底鉄鉱脈）」1枚につき3Gを獲得！',
    baseIncome: 3,
    synergyTag: 'craft',
  },
  {
    id: 'iron_reef_mine',
    name: '海底鉄鉱脈',
    dice: [9],
    diceLabel: '[9]',
    color: 'blue',
    tag: 'craft',
    tagLabel: '工業資材',
    cost: 6,
    maxStock: 6,
    icon: '️',
    shortDesc: '誰の番でも出目[9]で +5G',
    detailDesc: '一次産業ブルーカード：誰のターンでもダイス合計が9なら銀行から一気に5Gを獲得。大樽造船工房の倍率も跳ね上がります。',
    baseIncome: 5,
  },
  {
    id: 'admirals_banquet',
    name: '提督の晩餐館',
    dice: [9, 10],
    diceLabel: '[9・10]',
    color: 'red',
    tag: 'tavern',
    tagLabel: '歓楽街',
    cost: 3,
    maxStock: 6,
    icon: '',
    shortDesc: '他人の番に出目[9・10]で手番者から 2G徴収',
    detailDesc: '歓楽街レッドカード：他プレイヤーが2ダイスを振って9または10を出した時、手番プレイヤーから2Gを徴収（交易造船所で3G徴収）。',
    baseIncome: 2,
  },
  {
    id: 'deep_sea_trawler',
    name: '遠洋トロール船',
    dice: [10],
    diceLabel: '[10]',
    color: 'blue',
    tag: 'harvest',
    tagLabel: '農水資源',
    cost: 3,
    maxStock: 6,
    icon: '',
    shortDesc: '誰の番でも出目[10]で +3G',
    detailDesc: '一次産業ブルーカード：誰のターンでもダイス合計が10なら銀行から3Gを獲得。香辛料熟成庫のシナジー対象にもなります。',
    baseIncome: 3,
  },
  {
    id: 'grand_trade_bazaar',
    name: '海洋大交易市場',
    dice: [11, 12],
    diceLabel: '[11・12]',
    color: 'green',
    tag: 'fleet',
    tagLabel: '大型商団',
    cost: 2,
    maxStock: 6,
    icon: '️',
    shortDesc: '自分の番[11・12]で「農水資源」1枚につき +2G',
    detailDesc: '商業グリーンカード：自分のターンに出目11または12が出た時、自分が持つ「農水資源」カード1枚につき2Gを獲得。',
    baseIncome: 2,
    synergyTag: 'harvest',
  },
];

export const DISTRICT_MAP: Record<string, DistrictDef> = Object.fromEntries(
  DISTRICT_DEFS.map((d) => [d.id, d])
);

const PROB_1D: Record<number, number> = {
  1: 1 / 6,
  2: 1 / 6,
  3: 1 / 6,
  4: 1 / 6,
  5: 1 / 6,
  6: 1 / 6,
};

const PROB_2D: Record<number, number> = {
  2: 1 / 36,
  3: 2 / 36,
  4: 3 / 36,
  5: 4 / 36,
  6: 5 / 36,
  7: 6 / 36,
  8: 5 / 36,
  9: 4 / 36,
  10: 3 / 36,
  11: 2 / 36,
  12: 1 / 36,
};

// ============================================================================
// Pure Mathematical EV & Resolution Engine
// ============================================================================

export function countPlayerTag(player: PlayerState, tag: CardTag): number {
  let sum = 0;
  for (const [cardId, qty] of Object.entries(player.cards)) {
    if (qty <= 0) continue;
    const def = DISTRICT_MAP[cardId];
    if (def && def.tag === tag) {
      sum += qty;
    }
  }
  return sum;
}

export function countCompletedWonders(player: PlayerState): number {
  return Object.values(player.wonders).filter(Boolean).length;
}

/**
 * Simulates income distribution for a given dice total when `rollerIndex` rolls.
 * Returns net gold change for each player and ordered resolution events.
 */
export function simulateRollOutcome(
  players: PlayerState[],
  rollerIndex: number,
  diceTotal: number
): {
  nextGoldById: Record<number, number>;
  netDeltaById: Record<number, number>;
  events: ResolutionEvent[];
  activatedCardIds: Set<string>;
} {
  const goldMap: Record<number, number> = {};
  for (const p of players) {
    goldMap[p.id] = p.gold;
  }

  const events: ResolutionEvent[] = [];
  const activatedCardIds = new Set<string>();
  const n = players.length;
  const roller = players[rollerIndex];

  // 1. RED CARDS (歓楽街レッドカード): Counter-clockwise (or turn order starting from next player)
  // Other players steal from the active roller before blue/green income
  for (let offset = 1; offset < n; offset++) {
    const idx = (rollerIndex + offset) % n;
    const owner = players[idx];
    for (const def of DISTRICT_DEFS) {
      if (def.color !== 'red') continue;
      if (!def.dice.includes(diceTotal)) continue;
      const qty = owner.cards[def.id] ?? 0;
      if (qty <= 0) continue;

      const perCard = def.baseIncome + (owner.wonders.shipyard ? 1 : 0);
      const demand = perCard * qty;
      const actualTaken = Math.min(goldMap[roller.id], demand);
      activatedCardIds.add(def.id);

      if (actualTaken > 0) {
        goldMap[roller.id] -= actualTaken;
        goldMap[owner.id] += actualTaken;
        events.push({
          stepOrder: 1,
          cardId: def.id,
          cardName: def.name,
          cardColor: 'red',
          ownerId: owner.id,
          ownerName: owner.name,
          deltaByPlayer: { [roller.id]: -actualTaken, [owner.id]: actualTaken },
          summary: ` ${owner.name}の『${def.name}×${qty}』が発動！ ${roller.name}から ${actualTaken}G を徴収`,
        });
      } else {
        events.push({
          stepOrder: 1,
          cardId: def.id,
          cardName: def.name,
          cardColor: 'red',
          ownerId: owner.id,
          ownerName: owner.name,
          deltaByPlayer: {},
          summary: ` ${owner.name}の『${def.name}×${qty}』が発動（${roller.name}の所持金0Gのため徴収なし）`,
        });
      }
    }
  }

  // 2. BLUE CARDS (一次産業ブルーカード): Every player gets bank income
  for (let offset = 0; offset < n; offset++) {
    const idx = (rollerIndex + offset) % n;
    const owner = players[idx];
    for (const def of DISTRICT_DEFS) {
      if (def.color !== 'blue') continue;
      if (!def.dice.includes(diceTotal)) continue;
      const qty = owner.cards[def.id] ?? 0;
      if (qty <= 0) continue;

      const gain = def.baseIncome * qty;
      activatedCardIds.add(def.id);
      goldMap[owner.id] += gain;
      events.push({
        stepOrder: 2,
        cardId: def.id,
        cardName: def.name,
        cardColor: 'blue',
        ownerId: owner.id,
        ownerName: owner.name,
        deltaByPlayer: { [owner.id]: gain },
        summary: ` ${owner.name}の『${def.name}×${qty}』が生産！ +${gain}G`,
      });
    }
  }

  // 3. GREEN CARDS (商業グリーンカード): Only active roller gets bank income
  for (const def of DISTRICT_DEFS) {
    if (def.color !== 'green') continue;
    if (!def.dice.includes(diceTotal)) continue;
    const qty = roller.cards[def.id] ?? 0;
    if (qty <= 0) continue;

    let perCard = def.baseIncome;
    if (def.tag === 'market' && roller.wonders.shipyard) {
      perCard += 1;
    }
    if (def.synergyTag) {
      const synCount = countPlayerTag(roller, def.synergyTag);
      perCard = def.baseIncome * synCount;
    }
    const gain = perCard * qty;
    activatedCardIds.add(def.id);

    if (gain > 0) {
      goldMap[roller.id] += gain;
      events.push({
        stepOrder: 3,
        cardId: def.id,
        cardName: def.name,
        cardColor: 'green',
        ownerId: roller.id,
        ownerName: roller.name,
        deltaByPlayer: { [roller.id]: gain },
        summary: ` ${roller.name}の『${def.name}×${qty}』が稼働！ +${gain}G`,
      });
    } else {
      events.push({
        stepOrder: 3,
        cardId: def.id,
        cardName: def.name,
        cardColor: 'green',
        ownerId: roller.id,
        ownerName: roller.name,
        deltaByPlayer: {},
        summary: ` ${roller.name}の『${def.name}×${qty}』が発動（対象資源0枚のため +0G）`,
      });
    }
  }

  // 4. PURPLE CARDS (ギルドパープルカード): Only active roller
  for (const def of DISTRICT_DEFS) {
    if (def.color !== 'purple') continue;
    if (!def.dice.includes(diceTotal)) continue;
    const qty = roller.cards[def.id] ?? 0;
    if (qty <= 0) continue;

    activatedCardIds.add(def.id);

    if (def.id === 'lighthouse_guild') {
      let totalCollected = 0;
      const deltaMap: Record<number, number> = {};
      for (let offset = 1; offset < n; offset++) {
        const opp = players[(rollerIndex + offset) % n];
        const taken = Math.min(goldMap[opp.id], 2 * qty);
        if (taken > 0) {
          goldMap[opp.id] -= taken;
          goldMap[roller.id] += taken;
          deltaMap[opp.id] = -taken;
          totalCollected += taken;
        }
      }
      if (totalCollected > 0) {
        deltaMap[roller.id] = totalCollected;
      }
      events.push({
        stepOrder: 3,
        cardId: def.id,
        cardName: def.name,
        cardColor: 'purple',
        ownerId: roller.id,
        ownerName: roller.name,
        deltaByPlayer: deltaMap,
        summary: ` ${roller.name}の『${def.name}』が発動！ 全プレイヤーから合計 +${totalCollected}G 徴収`,
      });
    } else if (def.id === 'merchant_exchange') {
      const gain = 2 * qty;
      goldMap[roller.id] += gain;
      events.push({
        stepOrder: 3,
        cardId: def.id,
        cardName: def.name,
        cardColor: 'purple',
        ownerId: roller.id,
        ownerName: roller.name,
        deltaByPlayer: { [roller.id]: gain },
        summary: ` ${roller.name}の『${def.name}』が発動！ +${gain}G ＆ 施設トレード権獲得`,
      });
    }
  }

  const netDeltaById: Record<number, number> = {};
  for (const p of players) {
    netDeltaById[p.id] = goldMap[p.id] - p.gold;
  }

  return {
    nextGoldById: goldMap,
    netDeltaById,
    events,
    activatedCardIds,
  };
}

/**
 * Calculates exact mathematical Expected Value (EV) on the player's own turn
 * for rolling 1 die (1-6) vs rolling 2 dice (2-12).
 */
export function calculateRollEV(
  players: PlayerState[],
  rollerIndex: number
): {
  ev1d: number;
  ev2d: number;
  breakdown1d: { sum: number; prob: number; net: number }[];
  breakdown2d: { sum: number; prob: number; net: number }[];
} {
  const rollerId = players[rollerIndex].id;
  let ev1d = 0;
  const breakdown1d: { sum: number; prob: number; net: number }[] = [];

  for (let s = 1; s <= 6; s++) {
    const prob = PROB_1D[s];
    const sim = simulateRollOutcome(players, rollerIndex, s);
    let net = sim.netDeltaById[rollerId] ?? 0;
    if (s === 6 && (players[rollerIndex].cards['merchant_exchange'] ?? 0) > 0) {
      net += 1.5; // Strategic value of facility swap
    }
    ev1d += prob * net;
    breakdown1d.push({ sum: s, prob, net });
  }

  let ev2d = 0;
  const breakdown2d: { sum: number; prob: number; net: number }[] = [];
  for (let s = 2; s <= 12; s++) {
    const prob = PROB_2D[s];
    const sim = simulateRollOutcome(players, rollerIndex, s);
    let net = sim.netDeltaById[rollerId] ?? 0;
    if (s === 6 && (players[rollerIndex].cards['merchant_exchange'] ?? 0) > 0) {
      net += 1.5;
    }
    ev2d += prob * net;
    breakdown2d.push({ sum: s, prob, net });
  }

  return { ev1d, ev2d, breakdown1d, breakdown2d };
}

/**
 * Calculates how much each market card increases the player's full-round Expected Income
 * (Own turn EV + Passive income on all opponents' turns) per Gold spent.
 */
export function evaluateMarketCardEfficiency(
  players: PlayerState[],
  playerIndex: number,
  marketStock: Record<string, number>
): {
  cardId: string;
  deltaEvPerRound: number;
  evPerGold: number;
  bestDiceMode: '1d' | '2d';
}[] {
  const targetPlayer = players[playerIndex];

  const computeFullRoundEV = (simPlayers: PlayerState[]): { totalEv: number; mode: '1d' | '2d' } => {
    const own = calculateRollEV(simPlayers, playerIndex);
    const can2d = simPlayers[playerIndex].wonders.lighthouse;
    const bestOwn = can2d ? Math.max(own.ev1d, own.ev2d) : own.ev1d;
    const bestMode: '1d' | '2d' = can2d && own.ev2d > own.ev1d ? '2d' : '1d';

    // Passive income during other players' turns
    let passiveEv = 0;
    for (let i = 0; i < simPlayers.length; i++) {
      if (i === playerIndex) continue;
      const opp = simPlayers[i];
      const oppRoll = calculateRollEV(simPlayers, i);
      const oppUses2d = opp.wonders.lighthouse && oppRoll.ev2d > oppRoll.ev1d;
      const dist = oppUses2d ? PROB_2D : PROB_1D;

      for (const [sumStr, prob] of Object.entries(dist)) {
        const sum = Number(sumStr);
        const sim = simulateRollOutcome(simPlayers, i, sum);
        passiveEv += prob * (sim.netDeltaById[targetPlayer.id] ?? 0);
      }
    }

    return { totalEv: bestOwn + passiveEv, mode: bestMode };
  };

  const base = computeFullRoundEV(players);
  const results: {
    cardId: string;
    deltaEvPerRound: number;
    evPerGold: number;
    bestDiceMode: '1d' | '2d';
  }[] = [];

  for (const def of DISTRICT_DEFS) {
    if ((marketStock[def.id] ?? 0) <= 0) continue;
    if (def.maxPerPlayer && (targetPlayer.cards[def.id] ?? 0) >= def.maxPerPlayer) continue;

    // Also evaluate 2D potential even if lighthouse isn't built yet (discounted slightly if lighthouse not built)
    const cloned = players.map((p, idx) =>
      idx === playerIndex
        ? {
            ...p,
            cards: { ...p.cards, [def.id]: (p.cards[def.id] ?? 0) + 1 },
            wonders: {
              ...p.wonders,
              lighthouse: p.wonders.lighthouse || def.dice.some((d) => d >= 7),
            },
          }
        : p
    );

    const next = computeFullRoundEV(cloned);
    const rawDelta = Math.max(0.05, next.totalEv - base.totalEv);
    const lighthousePenalty =
      !targetPlayer.wonders.lighthouse && def.dice.every((d) => d >= 7) ? 0.65 : 1.0;
    const deltaEvPerRound = rawDelta * lighthousePenalty;
    const evPerGold = deltaEvPerRound / Math.max(1, def.cost);

    results.push({
      cardId: def.id,
      deltaEvPerRound,
      evPerGold,
      bestDiceMode: next.mode,
    });
  }

  results.sort((a, b) => b.evPerGold - a.evPerGold);
  return results;
}

// ============================================================================
// Initial State Factory
// ============================================================================

function createInitialMarket(): Record<string, number> {
  const stock: Record<string, number> = {};
  for (const def of DISTRICT_DEFS) {
    stock[def.id] = def.maxStock;
  }
  return stock;
}

function createInitialPlayers(mode: GameMode, cpuCount: number, primaryAiStyle: AiStyle): PlayerState[] {
  const baseCards = {
    wheat_field: 1,
    harbor_bakery: 1,
  };
  const baseWonders: Record<WonderId, boolean> = {
    lighthouse: false,
    station: false,
    shipyard: false,
    clocktower: false,
  };

  if (mode === 'pvp') {
    return [
      {
        id: 0,
        name: '第1港長（P1）',
        isCpu: false,
        aiStyle: 'balanced',
        colorClass: 'border-[#3f5f78]/60 bg-[#3f5f78]/12',
        badgeBg: 'bg-[#3f5f78] text-[#1b120b]',
        gold: 3,
        cards: { ...baseCards },
        wonders: { ...baseWonders },
      },
      {
        id: 1,
        name: '第2港長（P2）',
        isCpu: false,
        aiStyle: 'balanced',
        colorClass: 'border-[var(--table-accent)]/60 bg-[#c99555]/10',
        badgeBg: 'bg-[var(--table-accent)] text-[#1b120b]',
        gold: 3,
        cards: { ...baseCards },
        wonders: { ...baseWonders },
      },
    ];
  }

  const cpuPresets: { name: string; style: AiStyle; colorClass: string; badgeBg: string }[] = [
    {
      name:
        primaryAiStyle === 'rush1d'
          ? 'シェリー船長（1ダイス速攻AI）'
          : primaryAiStyle === 'heavy2d'
          ? 'バルトロ提督（2ダイス重工AI）'
          : 'オリヴィア商会（バランスAI）',
      style: primaryAiStyle,
      colorClass: 'border-[var(--table-accent)]/50 bg-[#c99555]/10',
      badgeBg: 'bg-[var(--table-accent)] text-[#1b120b]',
    },
    {
      name: 'シェリー船長（1ダイス速攻AI）',
      style: 'rush1d',
      colorClass: 'border-[#9f4540]/50 bg-[#9f4540]/12',
      badgeBg: 'bg-[#9f4540] text-[#f4ead8]',
    },
    {
      name: 'バルトロ提督（2ダイス重工AI）',
      style: 'heavy2d',
      colorClass: 'border-[#6a4a66]/50 bg-[#6a4a66]/12',
      badgeBg: 'bg-[#6a4a66] text-[#1b120b]',
    },
  ];

  const list: PlayerState[] = [
    {
      id: 0,
      name: 'あなた（港長）',
      isCpu: false,
      aiStyle: 'balanced',
      colorClass: 'border-[#3f5f78]/60 bg-[#3f5f78]/12',
      badgeBg: 'bg-[#3f5f78] text-[#1b120b]',
      gold: 3,
      cards: { ...baseCards },
      wonders: { ...baseWonders },
    },
  ];

  for (let i = 0; i < cpuCount; i++) {
    const preset = cpuPresets[i % cpuPresets.length];
    list.push({
      id: i + 1,
      name: preset.name,
      isCpu: true,
      aiStyle: preset.style,
      colorClass: preset.colorClass,
      badgeBg: preset.badgeBg,
      gold: 3,
      cards: { ...baseCards },
      wonders: { ...baseWonders },
    });
  }

  return list;
}

// ============================================================================
// SVG Die Visual Component
// ============================================================================

function SvgDieFace({
  value,
  rolling,
  accent = 'amber',
}: {
  value: number;
  rolling: boolean;
  accent?: 'amber' | 'cyan';
}) {
  const pipsByValue: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [
      [28, 28],
      [72, 72],
    ],
    3: [
      [26, 26],
      [50, 50],
      [74, 74],
    ],
    4: [
      [28, 28],
      [72, 28],
      [28, 72],
      [72, 72],
    ],
    5: [
      [26, 26],
      [74, 26],
      [50, 50],
      [26, 74],
      [74, 74],
    ],
    6: [
      [28, 24],
      [72, 24],
      [28, 50],
      [72, 50],
      [28, 76],
      [72, 76],
    ],
  };

  const pips = pipsByValue[value] ?? pipsByValue[1];
  const isOne = value === 1;

  return (
    <div
      className={`relative h-16 w-16 sm:h-20 sm:w-20 rounded-lg  transition-transform duration-200 ${
        rolling ? ' scale-105 rotate-6' : 'hover:scale-105'
      }`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow">
        <defs>
          <linearGradient id={`dieGrad-${accent}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {accent === 'amber' ? (
              <>
                <stop offset="0%" stopColor="#fffbeb" />
                <stop offset="100%" stopColor="#fde68a" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ecfeff" />
                <stop offset="100%" stopColor="#a5f3fc" />
              </>
            )}
          </linearGradient>
        </defs>
        {/* 3D Bevel Base */}
        <rect
          x="4"
          y="7"
          width="92"
          height="90"
          rx="20"
          fill={accent === 'amber' ? '#b45309' : '#0e7490'}
        />
        {/* Main Face */}
        <rect
          x="4"
          y="3"
          width="92"
          height="90"
          rx="20"
          fill={`url(#dieGrad-${accent})`}
          stroke={accent === 'amber' ? '#f59e0b' : '#06b6d4'}
          strokeWidth="3"
        />
        {/* Inner Subtle Frame */}
        <rect
          x="12"
          y="11"
          width="76"
          height="74"
          rx="14"
          fill="none"
          stroke={accent === 'amber' ? '#fcd34d' : '#67e8f9'}
          strokeWidth="1.5"
        />
        {/* Pips */}
        {pips.map(([cx, cy], idx) => (
          <circle
            key={idx}
            cx={cx}
            cy={cy - 2}
            r={isOne ? 11 : 8}
            fill={isOne ? '#e11d48' : '#0f172a'}
          />
        ))}
      </svg>
    </div>
  );
}

// ============================================================================
// Main Component: DiceHarborGame
// ============================================================================

export default function DiceHarborGame() {
  // Game Setup State
  const [mode, setMode] = useState<GameMode>('cpu');
  const [cpuCount, setCpuCount] = useState<number>(2); // 1 to 3 CPUs (2 to 4 players total)
  const [primaryAiStyle, setPrimaryAiStyle] = useState<AiStyle>('balanced');
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);

  // Core Match State
  const [players, setPlayers] = useState<PlayerState[]>(() =>
    createInitialPlayers('cpu', 2, 'balanced')
  );
  const [marketStock, setMarketStock] = useState<Record<string, number>>(() =>
    createInitialMarket()
  );
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [phase, setPhase] = useState<TurnPhase>('choose_roll');

  // Dice & Resolution State
  const [diceValues, setDiceValues] = useState<number[]>([1]);
  const [animDiceValues, setAnimDiceValues] = useState<number[]>([3, 4]);
  const [usedReroll, setUsedReroll] = useState<boolean>(false);
  const [extraTurnQueued, setExtraTurnQueued] = useState<boolean>(false);
  const [activeCardIds, setActiveCardIds] = useState<Set<string>>(new Set());
  const [resolutionEvents, setResolutionEvents] = useState<ResolutionEvent[]>([]);
  const [floatingDeltas, setFloatingDeltas] = useState<FloatingDelta[]>([]);
  const [turnLogs, setTurnLogs] = useState<string[]>([
    ' 『サイコロ港町（ダイス・ハーバー）』へようこそ！ 4つの港湾モニュメントを最初に完成させた港長が勝利します。',
  ]);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<'all' | CardColor>('all');
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);

  // Audio Context & Timer Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rollIntervalRef = useRef<number | null>(null);
  const resolveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current !== null) window.clearInterval(rollIntervalRef.current);
      if (resolveTimeoutRef.current !== null) window.clearTimeout(resolveTimeoutRef.current);
    };
  }, []);

  // Procedural Harbor Port Town Marimba BGM
  useEffect(() => {
    if (!bgmOn || typeof window === 'undefined') return undefined;
    let cancelled = false;
    let timerId: number | null = null;
    const chords = [
      [261.63, 329.63, 392.0, 523.25], // C
      [196.0, 246.94, 293.66, 392.0], // G
      [220.0, 261.63, 329.63, 440.0], // Am
      [174.61, 220.0, 261.63, 349.23], // F
    ];
    let step = 0;

    const tick = () => {
      if (cancelled) return;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContextClass();
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
            const start = now + idx * 0.22;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(idx === 0 ? 0.02 : 0.012, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 1.45);
          });
          step += 1;
        }
      } catch {
        // ignore audio errors
      }
      timerId = window.setTimeout(tick, 2200);
    };

    tick();
    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [bgmOn]);

  const playSound = useCallback(
    (type: 'roll' | 'coin' | 'steal' | 'build' | 'wonder' | 'win') => {
      if (!soundOn || typeof window === 'undefined') return;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        const now = ctx.currentTime;

        if (type === 'roll') {
          for (let i = 0; i < 4; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220 + i * 75, now + i * 0.055);
            gain.gain.setValueAtTime(0.08, now + i * 0.055);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.055);
            osc.stop(now + i * 0.055 + 0.05);
          }
        } else if (type === 'coin') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.setValueAtTime(1318.5, now + 0.07);
          gain.gain.setValueAtTime(0.11, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === 'steal') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.linearRampToValueAtTime(260, now + 0.2);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.22);
        } else if (type === 'build') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          osc.frequency.setValueAtTime(783.99, now + 0.16);
          gain.gain.setValueAtTime(0.11, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'wonder' || type === 'win') {
          const notes = type === 'win' ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25, 880];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.09);
            gain.gain.setValueAtTime(0.12, now + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.32);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.09);
            osc.stop(now + idx * 0.09 + 0.32);
          });
        }
      } catch {
        // Ignore audio errors on restricted devices
      }
    },
    [soundOn]
  );

  const appendLog = useCallback((msg: string) => {
    setTurnLogs((prev) => [msg, ...prev.slice(0, 29)]);
  }, []);

  // Reset / Start New Game
  const startNewGame = useCallback(
    (nextMode = mode, nextCpuCount = cpuCount, nextAiStyle = primaryAiStyle) => {
      if (rollIntervalRef.current !== null) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      if (resolveTimeoutRef.current !== null) {
        window.clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
      setPlayers(createInitialPlayers(nextMode, nextCpuCount, nextAiStyle));
      setMarketStock(createInitialMarket());
      setTurnIndex(0);
      setRoundNumber(1);
      setPhase('choose_roll');
      setDiceValues([1]);
      setUsedReroll(false);
      setExtraTurnQueued(false);
      setActiveCardIds(new Set());
      setResolutionEvents([]);
      setFloatingDeltas([]);
      setWinnerId(null);
      setTurnLogs([
        ' 新しい交易シーズンが開幕！ ダイスを振って港町を発展させ、4つの港湾モニュメントを完成させましょう。',
      ]);
    },
    [cpuCount, mode, primaryAiStyle]
  );

  const currentPlayer = players[turnIndex] ?? players[0];
  const humanPlayerIndex = mode === 'cpu' ? 0 : turnIndex;
  const evFocusPlayerIndex = players[turnIndex]?.isCpu ? 0 : turnIndex;

  // Real-time EV Analyzer Data
  const currentEvAnalysis = useMemo(
    () => calculateRollEV(players, evFocusPlayerIndex),
    [players, evFocusPlayerIndex]
  );

  const marketEfficiencyList = useMemo(
    () => evaluateMarketCardEfficiency(players, evFocusPlayerIndex, marketStock),
    [players, evFocusPlayerIndex, marketStock]
  );

  const topRecommendedCardId = marketEfficiencyList[0]?.cardId ?? null;
  const efficiencyByCardId = useMemo(() => {
    const map: Record<string, { deltaEvPerRound: number; evPerGold: number; rank: number }> = {};
    marketEfficiencyList.forEach((item, idx) => {
      map[item.cardId] = {
        deltaEvPerRound: item.deltaEvPerRound,
        evPerGold: item.evPerGold,
        rank: idx + 1,
      };
    });
    return map;
  }, [marketEfficiencyList]);

  // Execute Resolution of Rolled Dice
  const resolveConfirmedRoll = useCallback(
    (finalDice: number[]) => {
      const sum = finalDice.reduce((a, b) => a + b, 0);
      const isDoubles = finalDice.length === 2 && finalDice[0] === finalDice[1];
      const activePlayer = players[turnIndex];
      const grantsExtraTurn = isDoubles && activePlayer.wonders.clocktower;

      setExtraTurnQueued(grantsExtraTurn);

      const outcome = simulateRollOutcome(players, turnIndex, sum);
      setActiveCardIds(outcome.activatedCardIds);
      setResolutionEvents(outcome.events);

      // Update player gold
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          gold: outcome.nextGoldById[p.id] ?? p.gold,
        }))
      );

      // Build floating coin deltas
      const deltas: FloatingDelta[] = [];
      for (const p of players) {
        const net = outcome.netDeltaById[p.id] ?? 0;
        if (net !== 0) {
          deltas.push({
            id: `${Date.now()}-${p.id}`,
            playerId: p.id,
            amount: net,
            reason: net > 0 ? `+${net}G` : `${net}G`,
            color: net > 0 ? 'gold' : 'red',
          });
        }
      }
      setFloatingDeltas(deltas);

      if (outcome.events.some((e) => e.cardColor === 'red')) {
        playSound('steal');
      } else if (deltas.some((d) => d.amount > 0)) {
        playSound('coin');
      }

      const diceText =
        finalDice.length === 2
          ? `${finalDice[0]} + ${finalDice[1]} = 【${sum}】${isDoubles ? '（ゾロ目！）' : ''}`
          : `【${sum}】`;

      if (outcome.events.length === 0) {
        appendLog(` ${activePlayer.name}の出目 ${diceText} → 発動した施設はありませんでした。`);
      } else {
        appendLog(
          ` ${activePlayer.name}の出目 ${diceText} → ${outcome.events
            .map((e) => e.summary)
            .join(' / ')}`
        );
      }

      if (grantsExtraTurn) {
        appendLog(
          `️ 『天空時計塔』が共鳴！ ゾロ目ボーナスにより、このターンの後に${activePlayer.name}の追加ターンが発生します！`
        );
      }

      // Check if Merchant Exchange (purple swap) triggered on 6
      const hasMerchantExchange =
        sum === 6 && (activePlayer.cards['merchant_exchange'] ?? 0) > 0;

      setPhase('resolving');
      if (resolveTimeoutRef.current !== null) {
        window.clearTimeout(resolveTimeoutRef.current);
      }
      resolveTimeoutRef.current = window.setTimeout(() => {
        resolveTimeoutRef.current = null;
        setFloatingDeltas([]);
        if (hasMerchantExchange && !activePlayer.isCpu) {
          setPhase('purple_swap');
        } else if (hasMerchantExchange && activePlayer.isCpu) {
          // CPU auto-executes best swap if profitable
          setPlayers((prev) => {
            const cpu = prev[turnIndex];
            const ownGiveCandidates = ['wheat_field', 'kelp_ranch', 'harbor_bakery'].filter(
              (cid) => (cpu.cards[cid] ?? 0) > 0
            );
            if (ownGiveCandidates.length === 0) return prev;
            const giveId = ownGiveCandidates[0];

            let bestOppIdx = -1;
            let bestTakeId = '';
            let bestTakeCost = 1;

            prev.forEach((opp, idx) => {
              if (idx === turnIndex) return;
              for (const def of DISTRICT_DEFS) {
                if (def.color === 'purple') continue;
                if ((opp.cards[def.id] ?? 0) > 0 && def.cost > bestTakeCost) {
                  bestTakeCost = def.cost;
                  bestOppIdx = idx;
                  bestTakeId = def.id;
                }
              }
            });

            if (bestOppIdx === -1 || !bestTakeId) return prev;

            return prev.map((p, idx) => {
              if (idx === turnIndex) {
                return {
                  ...p,
                  cards: {
                    ...p.cards,
                    [giveId]: Math.max(0, (p.cards[giveId] ?? 0) - 1),
                    [bestTakeId]: (p.cards[bestTakeId] ?? 0) + 1,
                  },
                };
              }
              if (idx === bestOppIdx) {
                return {
                  ...p,
                  cards: {
                    ...p.cards,
                    [bestTakeId]: Math.max(0, (p.cards[bestTakeId] ?? 0) - 1),
                    [giveId]: (p.cards[giveId] ?? 0) + 1,
                  },
                };
              }
              return p;
            });
          });
          setPhase('build');
        } else {
          setPhase('build');
        }
      }, 900);
    },
    [appendLog, playSound, players, turnIndex]
  );

  // Trigger Dice Roll (1 or 2 dice)
  const handleRollDice = useCallback(
    (diceCount: 1 | 2, isRerollAction = false) => {
      if (phase !== 'choose_roll' && phase !== 'reroll_prompt') return;
      playSound('roll');
      setPhase('rolling');
      if (isRerollAction) {
        setUsedReroll(true);
      }

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const finalRoll = diceCount === 2 ? [d1, d2] : [d1];

      let ticks = 0;
      if (rollIntervalRef.current !== null) {
        window.clearInterval(rollIntervalRef.current);
      }
      const timer = window.setInterval(() => {
        ticks += 1;
        setAnimDiceValues([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
        if (ticks >= 7) {
          window.clearInterval(timer);
          rollIntervalRef.current = null;
          setDiceValues(finalRoll);
          const activePlayer = players[turnIndex];
          // Check if player has Steam Station and hasn't rerolled yet
          if (activePlayer.wonders.station && !isRerollAction && !activePlayer.isCpu) {
            setPhase('reroll_prompt');
          } else {
            resolveConfirmedRoll(finalRoll);
          }
        }
      }, 65);
      rollIntervalRef.current = timer;
    },
    [phase, playSound, players, resolveConfirmedRoll, turnIndex]
  );

  // Advance to Next Turn
  const advanceTurn = useCallback(
    (updatedPlayers: PlayerState[], hasExtraTurn = extraTurnQueued) => {
      setActiveCardIds(new Set());
      setResolutionEvents([]);
      setUsedReroll(false);

      if (hasExtraTurn) {
        setExtraTurnQueued(false);
        setPhase('choose_roll');
        appendLog(`️ 『天空時計塔』の効果で ${updatedPlayers[turnIndex].name} の連続ターン開始！`);
        return;
      }

      const nextIndex = (turnIndex + 1) % updatedPlayers.length;
      if (nextIndex === 0) {
        setRoundNumber((r) => r + 1);
      }
      setTurnIndex(nextIndex);
      setPhase('choose_roll');
    },
    [appendLog, extraTurnQueued, turnIndex]
  );

  // Build a District Card
  const handleBuildDistrict = useCallback(
    (cardId: string) => {
      if (phase !== 'build') return;
      const def = DISTRICT_MAP[cardId];
      if (!def) return;
      const stock = marketStock[cardId] ?? 0;
      const activePlayer = players[turnIndex];
      if (stock <= 0 || activePlayer.gold < def.cost) return;
      if (def.maxPerPlayer && (activePlayer.cards[cardId] ?? 0) >= def.maxPerPlayer) return;

      playSound('build');
      const nextPlayers = players.map((p, idx) =>
        idx === turnIndex
          ? {
              ...p,
              gold: p.gold - def.cost,
              cards: {
                ...p.cards,
                [cardId]: (p.cards[cardId] ?? 0) + 1,
              },
            }
          : p
      );

      setPlayers(nextPlayers);
      setMarketStock((prev) => ({
        ...prev,
        [cardId]: Math.max(0, (prev[cardId] ?? 0) - 1),
      }));

      appendLog(
        `️ ${activePlayer.name}が『${def.name}』（${def.cost}G）を建設しました！（所有: ${
          (activePlayer.cards[cardId] ?? 0) + 1
        }枚）`
      );
      advanceTurn(nextPlayers);
    },
    [advanceTurn, appendLog, marketStock, phase, playSound, players, turnIndex]
  );

  // Build a Port Wonder
  const handleBuildWonder = useCallback(
    (wonderId: WonderId) => {
      if (phase !== 'build') return;
      const wonder = WONDER_DEFS.find((w) => w.id === wonderId);
      if (!wonder) return;
      const activePlayer = players[turnIndex];
      if (activePlayer.wonders[wonderId] || activePlayer.gold < wonder.cost) return;

      const nextPlayers = players.map((p, idx) =>
        idx === turnIndex
          ? {
              ...p,
              gold: p.gold - wonder.cost,
              wonders: {
                ...p.wonders,
                [wonderId]: true,
              },
            }
          : p
      );

      const updatedActive = nextPlayers[turnIndex];
      const completedCount = countCompletedWonders(updatedActive);

      setPlayers(nextPlayers);
      appendLog(
        ` ${activePlayer.name}が港湾モニュメント『${wonder.name}』（${wonder.cost}G）を竣工！（完成 ${completedCount}/4）`
      );

      if (completedCount >= 4) {
        playSound('win');
        setWinnerId(activePlayer.id);
        setPhase('game_over');
        appendLog(
          ` 祝砲！ ${activePlayer.name}が4つすべての港湾モニュメントを完成させ、海洋交易都市の覇者となりました！`
        );
        return;
      }

      playSound('wonder');
      advanceTurn(nextPlayers);
    },
    [advanceTurn, appendLog, phase, playSound, players, turnIndex]
  );

  // Pass Building Phase (Save Gold)
  const handleSkipBuild = useCallback(() => {
    if (phase !== 'build') return;
    const activePlayer = players[turnIndex];
    appendLog(` ${activePlayer.name}は建設を見送り、資金（${activePlayer.gold}G）を温存しました。`);
    advanceTurn(players);
  }, [advanceTurn, appendLog, phase, players, turnIndex]);

  // Execute Human Merchant Exchange Swap
  const handleExecuteSwap = useCallback(
    (giveCardId: string, targetPlayerId: number, takeCardId: string) => {
      if (phase !== 'purple_swap') return;
      const activePlayer = players[turnIndex];
      const targetPlayer = players.find((p) => p.id === targetPlayerId);
      if (!targetPlayer) return;
      if ((activePlayer.cards[giveCardId] ?? 0) <= 0 || (targetPlayer.cards[takeCardId] ?? 0) <= 0) {
        return;
      }

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === activePlayer.id) {
            return {
              ...p,
              cards: {
                ...p.cards,
                [giveCardId]: Math.max(0, (p.cards[giveCardId] ?? 0) - 1),
                [takeCardId]: (p.cards[takeCardId] ?? 0) + 1,
              },
            };
          }
          if (p.id === targetPlayerId) {
            return {
              ...p,
              cards: {
                ...p.cards,
                [takeCardId]: Math.max(0, (p.cards[takeCardId] ?? 0) - 1),
                [giveCardId]: (p.cards[giveCardId] ?? 0) + 1,
              },
            };
          }
          return p;
        })
      );

      appendLog(
        `️ 『海運取引所』トレード成立！ ${activePlayer.name}の『${DISTRICT_MAP[giveCardId]?.name}』と${targetPlayer.name}の『${DISTRICT_MAP[takeCardId]?.name}』を交換しました。`
      );
      playSound('build');
      setPhase('build');
    },
    [appendLog, phase, playSound, players, turnIndex]
  );

  // ============================================================================
  // Autonomous CPU AI Decision Engine
  // ============================================================================
  useEffect(() => {
    const activePlayer = players[turnIndex];
    if (!activePlayer || !activePlayer.isCpu || winnerId !== null) return;

    if (phase === 'choose_roll') {
      const timer = window.setTimeout(() => {
        const ev = calculateRollEV(players, turnIndex);
        let choose2d = false;
        if (activePlayer.wonders.lighthouse) {
          if (activePlayer.aiStyle === 'rush1d') {
            choose2d = ev.ev2d > ev.ev1d + 0.6;
          } else if (activePlayer.aiStyle === 'heavy2d') {
            choose2d = ev.ev2d >= ev.ev1d - 0.3;
          } else {
            choose2d = ev.ev2d > ev.ev1d;
          }
        }
        handleRollDice(choose2d ? 2 : 1, false);
      }, 650);
      return () => window.clearTimeout(timer);
    }

    if (phase === 'build') {
      const timer = window.setTimeout(() => {
        const gold = activePlayer.gold;
        const completedWonders = countCompletedWonders(activePlayer);

        // 1. If CPU can win immediately by building final wonder, do it!
        const unbuiltWonders = WONDER_DEFS.filter((w) => !activePlayer.wonders[w.id]);
        if (unbuiltWonders.length === 1 && gold >= unbuiltWonders[0].cost) {
          handleBuildWonder(unbuiltWonders[0].id);
          return;
        }

        // 2. Check strategic Wonder purchase
        if (
          !activePlayer.wonders.lighthouse &&
          gold >= 4 &&
          (activePlayer.aiStyle === 'heavy2d' ||
            (activePlayer.cards['cedar_woods'] ?? 0) >= 2 ||
            roundNumber >= 4)
        ) {
          handleBuildWonder('lighthouse');
          return;
        }

        if (!activePlayer.wonders.station && gold >= 10 && completedWonders >= 1) {
          handleBuildWonder('station');
          return;
        }

        if (!activePlayer.wonders.shipyard && gold >= 16) {
          handleBuildWonder('shipyard');
          return;
        }

        if (!activePlayer.wonders.clocktower && gold >= 24) {
          handleBuildWonder('clocktower');
          return;
        }

        // 3. If close to final hefty wonder (Clocktower 24G or Shipyard 16G) and high income, save gold
        const ownEv = calculateRollEV(players, turnIndex);
        const bestTurnEv = activePlayer.wonders.lighthouse
          ? Math.max(ownEv.ev1d, ownEv.ev2d)
          : ownEv.ev1d;

        const nextTargetWonder = unbuiltWonders[0];
        if (
          nextTargetWonder &&
          gold >= nextTargetWonder.cost * 0.62 &&
          bestTurnEv >= 3.2
        ) {
          handleSkipBuild();
          return;
        }

        // 4. Otherwise pick best EV market card matching AI personality
        const effList = evaluateMarketCardEfficiency(players, turnIndex, marketStock).filter(
          (item) => {
            const def = DISTRICT_MAP[item.cardId];
            return def && def.cost <= gold;
          }
        );

        if (effList.length > 0) {
          let chosenId = effList[0].cardId;
          if (activePlayer.aiStyle === 'rush1d') {
            const rushCandidate = effList.find((item) => {
              const def = DISTRICT_MAP[item.cardId];
              return def && def.dice.every((d) => d <= 6);
            });
            if (rushCandidate) chosenId = rushCandidate.cardId;
          } else if (activePlayer.aiStyle === 'heavy2d') {
            const heavyCandidate = effList.find((item) => {
              const def = DISTRICT_MAP[item.cardId];
              return def && (def.tag === 'craft' || def.dice.some((d) => d >= 7));
            });
            if (heavyCandidate) chosenId = heavyCandidate.cardId;
          }
          handleBuildDistrict(chosenId);
        } else {
          handleSkipBuild();
        }
      }, 750);
      return () => window.clearTimeout(timer);
    }
  }, [
    handleBuildDistrict,
    handleBuildWonder,
    handleRollDice,
    handleSkipBuild,
    marketStock,
    phase,
    players,
    roundNumber,
    turnIndex,
    winnerId,
  ]);

  // Filtered Market Cards
  const filteredDistricts = useMemo(() => {
    if (selectedMarketFilter === 'all') return DISTRICT_DEFS;
    return DISTRICT_DEFS.filter((d) => d.color === selectedMarketFilter);
  }, [selectedMarketFilter]);

  const diceSum = diceValues.reduce((a, b) => a + b, 0);
  const inspectedCard = inspectedCardId ? DISTRICT_MAP[inspectedCardId] : null;
  const evFocusPlayer = players[evFocusPlayerIndex] ?? players[0];

  const colorStyleMap: Record<
    CardColor,
    { badge: string; border: string; bg: string; label: string }
  > = {
    blue: {
      badge: 'bg-[#3f5f78] text-[#1b120b]',
      border: 'border-[#3f5f78]/45',
      bg: 'bg-[#142330]',
      label: '青：一次産業（誰の番でも生産）',
    },
    green: {
      badge: 'bg-[#4f806b] text-[#1b120b]',
      border: 'border-[#315d4e]/45',
      bg: 'bg-[#315d4e]/16',
      label: '緑：商業（自分の番に高収入）',
    },
    red: {
      badge: 'bg-[#9f4540] text-[var(--table-ink)]',
      border: 'border-[#9f4540]/45',
      bg: 'bg-[#9f4540]/14',
      label: '赤：歓楽街（他人の番に通行料）',
    },
    purple: {
      badge: 'bg-[#6a4a66] text-[#f4ead8]',
      border: 'border-[#6a4a66]/45',
      bg: 'bg-[#6a4a66]/14',
      label: '紫：ギルド（自分の番に特別効果）',
    },
  };

  return (
    <div className="tabletop-page min-h-screen overflow-x-hidden select-none">
      {/* Top Header */}
      <header className="tabletop-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/games"
              className="tabletop-button inline-flex min-h-11 items-center px-3 text-xs"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="tabletop-kicker">
                DICE ENGINE &amp; HARBOR CITY BUILDER
              </p>
              <h2 className="tabletop-title text-base sm:text-lg">
                サイコロ港町（ダイス・ハーバー）：出目で育つ交易都市
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="tabletop-panel-soft flex p-0.5">
              <button
                type="button"
                onClick={() => {
                  setMode('cpu');
                  startNewGame('cpu', cpuCount, primaryAiStyle);
                }}
                className={`min-h-11 rounded-md px-3 text-xs font-black transition ${
                  mode === 'cpu'
                    ? 'tabletop-button-primary'
                    : 'tabletop-button border-transparent bg-transparent'
                }`}
              >
                CPU対戦（{cpuCount + 1}人）
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('pvp');
                  startNewGame('pvp', cpuCount, primaryAiStyle);
                }}
                className={`min-h-11 rounded-md px-3 text-xs font-black transition ${
                  mode === 'pvp'
                    ? 'tabletop-button-primary'
                    : 'tabletop-button border-transparent bg-transparent'
                }`}
              >
                1台で2人対戦
              </button>
            </div>

            <button
              type="button"
              onClick={() => setBgmOn((v) => !v)}
              className={`tabletop-button min-h-11 px-3 text-xs ${
                bgmOn ? 'tabletop-chip-active' : ''
              }`}
            >
              {bgmOn ? ' BGM ON' : ' BGM OFF'}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="tabletop-button min-h-11 px-3 text-xs"
            >
              {soundOn ? ' 効果音 ON' : ' 効果音 OFF'}
            </button>
            <button
              type="button"
              onClick={() => startNewGame(mode, cpuCount, primaryAiStyle)}
              className="tabletop-button-primary min-h-11 px-3 text-xs"
            >
               新規ゲーム
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
        {/* Game Mode & AI Configuration Bar */}
        <div className="tabletop-panel mb-4 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="tabletop-chip px-2.5 py-0.5 font-black text-[#9db8c8]">
              ROUND {roundNumber}
            </span>
            <span className="font-bold text-[var(--table-ink)]">
              現在の手番:{' '}
              <strong className="text-[var(--table-accent-strong)]">{currentPlayer.name}</strong>
            </span>
            <span className="text-[var(--table-muted)]">|</span>
            <span className="font-bold text-[#9dc4af]">
              フェーズ:{' '}
              {phase === 'choose_roll' && ' ダイスロール選択'}
              {phase === 'rolling' && ' ダイス回転中...'}
              {phase === 'reroll_prompt' && ' 蒸気鉄道駅・振り直し確認'}
              {phase === 'resolving' && ' 施設発動＆収入計算中'}
              {phase === 'purple_swap' && '️ 海運取引所・施設トレード選択'}
              {phase === 'build' && '️ 都市建設フェーズ（1枚建設 または 資金温存）'}
              {phase === 'game_over' && ' 対局決着！'}
            </span>
          </div>

          {mode === 'cpu' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-[var(--table-muted)]">人数:</span>
                {[1, 2, 3].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setCpuCount(cnt);
                      startNewGame('cpu', cnt, primaryAiStyle);
                    }}
                    className={`min-h-11 rounded-md px-2.5 font-bold transition ${
                      cpuCount === cnt
                        ? 'tabletop-button-primary'
                        : 'tabletop-button'
                    }`}
                  >
                    {cnt + 1}人
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--table-muted)]">主力AI戦略:</span>
                {(
                  [
                    ['balanced', 'バランス型'],
                    ['rush1d', '1ダイス速攻型'],
                    ['heavy2d', '2ダイス重工業型'],
                  ] as const
                ).map(([stKey, stLabel]) => (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => {
                      setPrimaryAiStyle(stKey);
                      startNewGame('cpu', cpuCount, stKey);
                    }}
                    className={`min-h-11 rounded-md px-2.5 font-bold transition ${
                      primaryAiStyle === stKey
                        ? 'tabletop-button-primary'
                        : 'tabletop-button'
                    }`}
                  >
                    {stLabel}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Grid: Dice Dock + Real-Time EV Simulator */}
        <div className="mb-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          {/* Left: Dice Roll & Turn Control Dock */}
          <div className="tabletop-panel flex flex-col justify-between border-[var(--table-accent)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="tabletop-chip px-2.5 py-0.5 text-[11px] font-black text-[var(--table-accent-strong)]">
                  {currentPlayer.name} のターン
                </span>
                <h3 className="tabletop-title mt-1 text-base sm:text-lg">
                  {phase === 'choose_roll' && ' ダイスを振って港湾施設を発動させましょう！'}
                  {phase === 'rolling' && ' 運命のダイスが港町を駆け巡っています...'}
                  {phase === 'reroll_prompt' && ' 『蒸気鉄道駅』特権：この出目で確定しますか？'}
                  {phase === 'resolving' && ` 出目合計【${diceSum}】の施設を順番に処理中！`}
                  {phase === 'purple_swap' && '️ 『海運取引所』発動：交換する施設を選んでください'}
                  {phase === 'build' &&
                    `️ 出目【${diceSum}】完了！ 市場から1枚建設するかモニュメントを着工できます`}
                  {phase === 'game_over' &&
                    ` ${players.find((p) => p.id === winnerId)?.name} が全4モニュメントを完成させて勝利！`}
                </h3>
              </div>

              {/* 3D SVG Dice Display */}
              <div className="flex items-center gap-3 rounded-lg border border-[var(--table-line)] bg-black/20 px-4 py-2.5">
                {(phase === 'rolling' ? animDiceValues.slice(0, diceValues.length || 1) : diceValues).map(
                  (val, idx) => (
                    <SvgDieFace
                      key={idx}
                      value={val}
                      rolling={phase === 'rolling'}
                      accent={idx === 0 ? 'amber' : 'cyan'}
                    />
                  )
                )}
                <div className="pl-1 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--table-muted)]">
                    TOTAL
                  </p>
                  <p className="font-mono text-3xl font-black text-[var(--table-accent-strong)]">
                    {phase === 'rolling' ? '?' : diceSum}
                  </p>
                  {diceValues.length === 2 && diceValues[0] === diceValues[1] && phase !== 'rolling' && (
                    <span className="inline-block rounded bg-[var(--table-accent)] px-1.5 py-0.5 text-[11px] font-black text-[#1b120b]">
                      ゾロ目!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons by Phase */}
            <div className="tabletop-divider mt-4 border-t pt-3">
              {phase === 'choose_roll' && !currentPlayer.isCpu && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleRollDice(1, false)}
                    className="tabletop-button-primary min-h-12 flex-1 px-4 py-3 text-sm"
                  >
                     1ダイスを振る（出目 1〜6）
                    <span className="ml-2 rounded bg-black/20 px-2 py-0.5 text-xs">
                      期待値 +{currentEvAnalysis.ev1d.toFixed(2)}G
                    </span>
                  </button>

                  {currentPlayer.wonders.lighthouse ? (
                    <button
                      type="button"
                      onClick={() => handleRollDice(2, false)}
                      className="tabletop-button-primary min-h-12 flex-1 px-4 py-3 text-sm"
                    >
                       2ダイスを振る（出目 2〜12）
                      <span className="ml-2 rounded bg-black/20 px-2 py-0.5 text-xs">
                        期待値 +{currentEvAnalysis.ev2d.toFixed(2)}G
                      </span>
                    </button>
                  ) : (
                    <div className="rounded-md border border-[var(--table-line)] bg-[var(--table-panel-soft)] px-3 py-2 text-xs text-[var(--table-muted)]">
                       <strong>双子灯台（4G）</strong>を建設すると2ダイス（2〜12）が解放されます
                    </div>
                  )}
                </div>
              )}

              {phase === 'reroll_prompt' && !currentPlayer.isCpu && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => resolveConfirmedRoll(diceValues)}
                    className="tabletop-button-primary min-h-11 px-4 text-xs"
                  >
                     出目【{diceSum}】のまま確定する
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRollDice(1, true)}
                    className="tabletop-button min-h-11 px-3.5 text-xs"
                  >
                     1ダイスで振り直す
                  </button>
                  {currentPlayer.wonders.lighthouse && (
                    <button
                      type="button"
                      onClick={() => handleRollDice(2, true)}
                      className="tabletop-button min-h-11 px-3.5 text-xs"
                    >
                       2ダイスで振り直す
                    </button>
                  )}
                  {usedReroll && (
                    <span className="text-xs text-[var(--table-muted)]">（振り直し済み）</span>
                  )}
                </div>
              )}

              {phase === 'purple_swap' && !currentPlayer.isCpu && (
                <div className="tabletop-panel-soft border-[#6a4a66] p-3">
                  <p className="text-xs font-bold text-[#cbb3c9]">
                    ️ 『海運取引所』の効果：あなたの施設1枚と、他プレイヤーの施設（紫以外）1枚を交換できます。
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {players
                      .filter((p) => p.id !== currentPlayer.id)
                      .flatMap((opp) =>
                        DISTRICT_DEFS.filter(
                          (d) => d.color !== 'purple' && (opp.cards[d.id] ?? 0) > 0
                        ).map((takeDef) => {
                          const giveDef =
                            DISTRICT_DEFS.find(
                              (gd) =>
                                gd.color !== 'purple' && (currentPlayer.cards[gd.id] ?? 0) > 0
                            ) ?? DISTRICT_DEFS[0];
                          return (
                            <button
                              key={`${opp.id}-${takeDef.id}`}
                              type="button"
                              onClick={() =>
                                handleExecuteSwap(giveDef.id, opp.id, takeDef.id)
                              }
                              className="tabletop-button min-h-11 px-3 text-xs text-[#cbb3c9]"
                            >
                              自分の『{giveDef.name}』⇄ {opp.name}の『{takeDef.name}』
                            </button>
                          );
                        })
                      )}
                    <button
                      type="button"
                      onClick={() => setPhase('build')}
                      className="tabletop-button min-h-11 px-3 text-xs"
                    >
                      交換せずに建設フェーズへ進む
                    </button>
                  </div>
                </div>
              )}

              {phase === 'build' && !currentPlayer.isCpu && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#9db8c8]">
                     下の「港湾モニュメント」または「港町カード市場」から1つ選んで建設できます（所持金:{' '}
                    <strong className="text-[var(--table-accent-strong)]">{currentPlayer.gold}G</strong>）
                  </p>
                  <button
                    type="button"
                    onClick={handleSkipBuild}
                    className="tabletop-button min-h-11 px-4 text-xs"
                  >
                     何も建設せず資金を貯めてターン終了 →
                  </button>
                </div>
              )}

              {currentPlayer.isCpu && phase !== 'game_over' && (
                <p className="text-xs font-bold text-[var(--table-accent-strong)]">
                   {currentPlayer.name} が港湾データを分析して行動しています...
                </p>
              )}

              {phase === 'game_over' && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-black text-[var(--table-accent-strong)]">
                     全ての港湾モニュメントが完成しました！ もう一度新しい街づくりに挑戦しますか？
                  </p>
                  <button
                    type="button"
                    onClick={() => startNewGame(mode, cpuCount, primaryAiStyle)}
                    className="rounded-md bg-[var(--table-accent)] px-4 py-2 text-xs font-black text-[#1b120b] shadow hover:bg-[var(--table-accent-strong)]"
                  >
                     もう一度プレイする
                  </button>
                </div>
              )}

              {/* Resolution Order Step Badges */}
              {resolutionEvents.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 rounded-md border border-[var(--table-line)] bg-black/20 p-2">
                  <span className="text-[11px] font-black text-[var(--table-muted)]">
                    発動順ログ（赤→青→緑・紫）:
                  </span>
                  {resolutionEvents.map((ev, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-[var(--table-line)] bg-[var(--table-panel-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--table-ink)]"
                    >
                      {ev.summary}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Real-Time 1D vs 2D Expected Value (EV) Analyzer */}
          <div className="tabletop-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="tabletop-kicker">
                  REAL-TIME EXPECTED VALUE SIMULATOR
                </p>
                <h3 className="tabletop-title text-sm sm:text-base">
                   1ダイス vs 2ダイス 期待収益シミュレーター（{evFocusPlayer.name}）
                </h3>
              </div>
              <span className="tabletop-chip px-2.5 py-1 text-[11px] font-black text-[#9db8c8]">
                推奨:{' '}
                {evFocusPlayer.wonders.lighthouse &&
                currentEvAnalysis.ev2d > currentEvAnalysis.ev1d
                  ? ' 2ダイス'
                  : ' 1ダイス'}
              </span>
            </div>

            {/* 1D vs 2D Comparison Cards */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div
                className={`rounded-md border p-2.5 ${
                  !evFocusPlayer.wonders.lighthouse ||
                  currentEvAnalysis.ev1d >= currentEvAnalysis.ev2d
                    ? 'border-[#3f5f78]/60 bg-[#142330]'
                    : 'border-[var(--table-line)] bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#9db8c8]"> 1ダイス期待値 (1〜6)</span>
                  <span className="text-[11px] font-bold text-[var(--table-muted)]">各 16.7%</span>
                </div>
                <p className="mt-1 font-mono text-2xl font-black text-[var(--table-ink)]">
                  +{currentEvAnalysis.ev1d.toFixed(2)}{' '}
                  <span className="text-xs font-bold text-[#9db8c8]">G/ターン</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {currentEvAnalysis.breakdown1d.map((b) => (
                    <span
                      key={b.sum}
                      className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                        b.net > 0
                          ? 'bg-[#3f5f78]/20 text-[#9db8c8]'
                          : b.net < 0
                          ? 'bg-[#9f4540]/25 text-[#d9a19b]'
                          : 'bg-[var(--table-panel-soft)] text-[var(--table-muted)]'
                      }`}
                    >
                      [{b.sum}]:{b.net >= 0 ? `+${b.net}` : b.net}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={`rounded-md border p-2.5 ${
                  evFocusPlayer.wonders.lighthouse &&
                  currentEvAnalysis.ev2d > currentEvAnalysis.ev1d
                    ? 'border-[var(--table-accent)]/60 bg-[#c99555]/10'
                    : 'border-[var(--table-line)] bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[var(--table-accent-strong)]">
                     2ダイス期待値 (2〜12)
                  </span>
                  <span className="text-[11px] font-bold text-[var(--table-muted)]">
                    {evFocusPlayer.wonders.lighthouse ? '解放済' : '双子灯台で解放'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-2xl font-black text-[var(--table-ink)]">
                  +{currentEvAnalysis.ev2d.toFixed(2)}{' '}
                  <span className="text-xs font-bold text-[var(--table-accent-strong)]">G/ターン</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {currentEvAnalysis.breakdown2d
                    .filter((b) => b.sum >= 5 && b.sum <= 10)
                    .map((b) => (
                      <span
                        key={b.sum}
                        className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                          b.net > 0
                            ? 'bg-[#c99555]/20 text-[var(--table-accent-strong)]'
                            : b.net < 0
                            ? 'bg-[#9f4540]/25 text-[#d9a19b]'
                            : 'bg-[var(--table-panel-soft)] text-[var(--table-muted)]'
                        }`}
                      >
                        [{b.sum}]:{b.net >= 0 ? `+${b.net}` : b.net}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Best Investment Recommendation */}
            <div className="mt-3 rounded-md border border-[#315d4e]/30 bg-[#315d4e]/12 px-3 py-2">
              <p className="text-[11px] font-black text-[#9dc4af]">
                 1ゴールドあたりの期待収益（EV投資効率）TOP3 市場カード:
              </p>
              <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-3">
                {marketEfficiencyList.slice(0, 3).map((item, idx) => {
                  const def = DISTRICT_MAP[item.cardId];
                  if (!def) return null;
                  return (
                    <div
                      key={item.cardId}
                      className="flex items-center justify-between rounded-lg border border-[var(--table-line)] bg-black/20 px-2 py-1 text-[11px]"
                    >
                      <span className="truncate font-bold text-[var(--table-ink)]">
                        {idx === 0 ? '' : `${idx + 1}.`} {def.icon} {def.name}
                      </span>
                      <span className="ml-1 shrink-0 font-mono font-black text-[#9dc4af]">
                        +{item.deltaEvPerRound.toFixed(2)}G/周
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Players' Harbor Tableaus (All 2-4 Players) */}
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          {players.map((player, pIdx) => {
            const isTurn = pIdx === turnIndex;
            const completedWonders = countCompletedWonders(player);
            const playerDeltas = floatingDeltas.filter((d) => d.playerId === player.id);

            return (
              <div
                key={player.id}
                className={`relative rounded-md border p-3.5 transition-all ${
                  isTurn
                    ? 'tabletop-panel border-[var(--table-accent)]'
                    : `tabletop-panel ${player.colorClass}`
                }`}
              >
                {/* Floating Coin Animation Badges */}
                {playerDeltas.map((delta) => (
                  <div
                    key={delta.id}
                    className={`pointer-events-none absolute right-4 top-2 z-20  rounded-full px-3 py-1 font-mono text-sm font-black  ${
                      delta.amount > 0
                        ? 'border border-[var(--table-accent)] bg-[var(--table-accent)] text-[#1b120b]'
                        : 'border border-[#9f4540] bg-[#9f4540] text-[#f4ead8]'
                    }`}
                  >
                    {delta.reason}
                  </div>
                ))}

                {/* Player Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-black ${player.badgeBg}`}
                    >
                      {isTurn ? ' 手番中' : `P${pIdx + 1}`}
                    </span>
                    <h4 className="tabletop-title text-sm sm:text-base">{player.name}</h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-md border border-[var(--table-accent)]/40 bg-black/20 px-3 py-1 text-right">
                      <span className="text-[11px] font-bold text-[var(--table-accent-strong)]">GOLD</span>
                      <span className="ml-1.5 font-mono text-lg font-black text-[var(--table-accent-strong)]">
                        {player.gold} G
                      </span>
                    </div>
                    <div className="rounded-md border border-[#3f5f78]/30 bg-black/20 px-2.5 py-1 text-xs font-black text-[#9db8c8]">
                      ️ モニュメント {completedWonders}/4
                    </div>
                  </div>
                </div>

                {/* 4 Port Wonders Row */}
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {WONDER_DEFS.map((wonder) => {
                    const built = player.wonders[wonder.id];
                    const canBuildNow =
                      isTurn &&
                      !player.isCpu &&
                      phase === 'build' &&
                      !built &&
                      player.gold >= wonder.cost;

                    return (
                      <button
                        key={wonder.id}
                        type="button"
                        disabled={!canBuildNow}
                        onClick={() => canBuildNow && handleBuildWonder(wonder.id)}
                        title={wonder.effectText}
                        className={`flex flex-col justify-between rounded-md border p-2 text-left transition ${
                          built
                            ? 'border-[var(--table-accent)] bg-[#c99555]/16 text-[var(--table-accent-strong)]'
                            : canBuildNow
                            ? 'cursor-pointer border-[#315d4e] bg-[#315d4e]/18 hover:bg-[#315d4e]/25'
                            : 'tabletop-panel-soft opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black">
                            {wonder.icon} {wonder.name}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-black ${
                              built
                                ? 'bg-[var(--table-accent)] text-[#1b120b]'
                                : canBuildNow
                                ? 'bg-[#4f806b] text-[#1b120b]'
                                : 'bg-[var(--table-panel-soft)] text-[var(--table-muted)]'
                            }`}
                          >
                            {built ? '完成!' : `${wonder.cost}G`}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-[var(--table-muted)]">
                          {wonder.title}
                        </p>
                        {canBuildNow && (
                          <span className="mt-1 inline-block rounded bg-[#315d4e]/22 px-1.5 py-0.5 text-center text-[11px] font-black text-[#9dc4af]">
                             クリックで着工
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Owned District Cards with Quantity Badges (×2, ×3) */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {DISTRICT_DEFS.map((def) => {
                    const qty = player.cards[def.id] ?? 0;
                    if (qty <= 0) return null;
                    const isTriggered = activeCardIds.has(def.id);
                    const cStyle = colorStyleMap[def.color];

                    return (
                      <button
                        key={def.id}
                        type="button"
                        onClick={() => setInspectedCardId(def.id)}
                        className={`group relative flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${
                          cStyle.border
                        } ${cStyle.bg} ${
                          isTriggered
                            ? 'ring-2 ring-amber-300 scale-105 '
                            : 'hover:border-[var(--table-accent)]'
                        }`}
                      >
                        <span className={`rounded px-1 font-mono text-[11px] font-black ${cStyle.badge}`}>
                          {def.diceLabel}
                        </span>
                        <span className="font-bold text-[var(--table-ink)]">
                          {def.icon} {def.name}
                        </span>
                        <span className="rounded-full bg-black/20 px-1.5 py-0.5 font-mono text-[11px] font-black text-[var(--table-accent-strong)]">
                          ×{qty}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Harbor Market Section (14 District Cards) */}
        <div className="tabletop-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="tabletop-kicker">
                HARBOR DISTRICT MARKETPLACE
              </p>
              <h3 className="tabletop-title text-base sm:text-lg">
                 港町カード市場（全14施設・都市建設フェーズに1ターン1枚まで購入可能）
              </h3>
            </div>

            {/* Category Color Filter */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(
                [
                  ['all', 'すべて表示'],
                  ['blue', ' 一次産業 (青)'],
                  ['green', ' 商業 (緑)'],
                  ['red', ' 歓楽街 (赤)'],
                  ['purple', ' ギルド (紫)'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMarketFilter(key)}
                  className={`min-h-11 rounded-md px-2.5 font-bold transition ${
                    selectedMarketFilter === key
                      ? 'tabletop-button-primary'
                      : 'tabletop-button'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Card Detail Inspector Banner (if clicked) */}
          {inspectedCard && (
            <div className="tabletop-panel-soft mt-3 flex flex-wrap items-center justify-between gap-2 border-[#3f5f78] px-3.5 py-2 text-xs">
              <div>
                <span className="font-black text-[#9db8c8]">
                  {inspectedCard.icon} 『{inspectedCard.name}』出目{inspectedCard.diceLabel}（コスト{' '}
                  {inspectedCard.cost}G / {inspectedCard.tagLabel}）:
                </span>{' '}
                <span className="text-[var(--table-ink)]">{inspectedCard.detailDesc}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedCardId(null)}
                className="rounded bg-[var(--table-panel-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--table-muted)] hover:bg-[var(--table-panel-raised)]"
              >
                閉じる ✕
              </button>
            </div>
          )}

          {/* Market Cards Grid */}
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredDistricts.map((def) => {
              const stock = marketStock[def.id] ?? 0;
              const cStyle = colorStyleMap[def.color];
              const ownedCount = players[humanPlayerIndex]?.cards[def.id] ?? 0;
              const reachedMaxPerPlayer =
                Boolean(def.maxPerPlayer) && ownedCount >= (def.maxPerPlayer ?? 99);
              const canBuyNow =
                phase === 'build' &&
                !currentPlayer.isCpu &&
                stock > 0 &&
                !reachedMaxPerPlayer &&
                currentPlayer.gold >= def.cost;

              const eff = efficiencyByCardId[def.id];
              const isBestEv = topRecommendedCardId === def.id && stock > 0;

              return (
                <div
                  key={def.id}
                  className={`flex flex-col justify-between rounded-lg border p-3 transition ${
                    cStyle.border
                  } ${cStyle.bg} ${
                    stock <= 0
                      ? 'opacity-45 grayscale'
                      : canBuyNow
                      ? 'hover:border-[var(--table-accent)]'
                      : ''
                  }`}
                >
                  <div>
                    {/* Top Row: Dice Badge + Best EV Tag + Cost */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-xs font-black ${cStyle.badge}`}
                      >
                        出目 {def.diceLabel}
                      </span>

                      <div className="flex items-center gap-1">
                        {isBestEv && (
                          <span className="rounded-full bg-[#4f806b] px-2 py-0.5 text-[11px] font-black text-[#1b120b] shadow">
                            ★ 最高EV効率
                          </span>
                        )}
                        <span className="rounded-lg border border-[var(--table-accent)]/40 bg-black/20 px-2 py-0.5 font-mono text-xs font-black text-[var(--table-accent-strong)]">
                          {def.cost}G
                        </span>
                      </div>
                    </div>

                    {/* Title & Tag */}
                    <div className="mt-2 flex items-baseline justify-between gap-1">
                      <h4 className="tabletop-title text-sm">
                        {def.icon} {def.name}
                      </h4>
                      <span className="text-[11px] font-bold text-[var(--table-muted)]">
                        {def.tagLabel}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-1 text-xs font-bold text-[var(--table-ink)]">{def.shortDesc}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--table-muted)]">
                      {def.detailDesc}
                    </p>
                  </div>

                  {/* Bottom Bar: EV Delta, Stock, & Buy Button */}
                  <div className="mt-3 border-t border-[var(--table-line)] pt-2">
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-[#9dc4af]">
                        {eff ? `期待収益 +${eff.deltaEvPerRound.toFixed(2)}G/周` : '上限到達'}
                      </span>
                      <span className="font-mono font-bold text-[var(--table-muted)]">
                        在庫: {stock}/{def.maxStock}（所持 ×{ownedCount}）
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!canBuyNow}
                      onClick={() => handleBuildDistrict(def.id)}
                      className={`min-h-11 w-full rounded-md text-xs font-black transition ${
                        stock <= 0
                          ? 'bg-[var(--table-panel-raised)] text-[var(--table-muted)]'
                          : reachedMaxPerPlayer
                          ? 'bg-[#6a4a66]/18 text-[#cbb3c9]'
                          : canBuyNow
                          ? 'tabletop-button-primary'
                          : 'tabletop-button cursor-not-allowed opacity-50'
                      }`}
                    >
                      {stock <= 0
                        ? '完売（SOLD OUT）'
                        : reachedMaxPerPlayer
                        ? '1人1枚制限（所有済）'
                        : phase !== 'build'
                        ? '建設フェーズで購入可'
                        : currentPlayer.gold < def.cost
                        ? `資金不足（あと ${def.cost - currentPlayer.gold}G）`
                        : `️ ${def.cost}G で建設する`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Turn History Log & Quick Color Legend */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="tabletop-panel p-3.5">
            <h4 className="tabletop-kicker">
               航海＆都市開発ログ（最新30件）
            </h4>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1 text-xs">
              {turnLogs.map((log, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[var(--table-line)] bg-[var(--table-panel-soft)] px-2.5 py-1 text-[var(--table-ink)]"
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="tabletop-panel p-3.5 text-xs">
            <h4 className="tabletop-kicker">
               施設カラーと収入解決の順番ルール
            </h4>
            <ul className="mt-2 space-y-1.5 text-[var(--table-muted)]">
              <li>
                <strong className="text-[#d9a19b]">① 歓楽街レッドカード（赤）</strong>：
                他のプレイヤーのターンに出目が一致すると真っ先に発動し、手番プレイヤーから通行料・飲食代を徴収します。
              </li>
              <li>
                <strong className="text-[#9db8c8]">② 一次産業ブルーカード（青）</strong>：
                誰のターンでも出目が一致すれば、所有している全員が同時に銀行から生産コインを受け取ります。
              </li>
              <li>
                <strong className="text-[#9dc4af]">③ 商業グリーンカード（緑）</strong>：
                自分のターンに出目が一致した時のみ、銀行から高収入を獲得します（シナジー施設は資源カード枚数に応じて倍増）。
              </li>
              <li>
                <strong className="text-[#cbb3c9]">④ ギルドパープルカード（紫）</strong>：
                自分のターンに出目[6]が出た時のみ、全員からの徴収や施設トレードなどの強力なギルド特権を発動します。
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
