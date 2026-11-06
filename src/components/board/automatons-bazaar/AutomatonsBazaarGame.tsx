'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export type GuildEmblem = 'astro' | 'steam' | 'automata' | 'compass';

export interface AuctionLot {
  id: string;
  name: string;
  subtitle: string;
  kind: 'artifact' | 'scrap';
  basePoints: number; // +4 to +10 for artifact, -3 to -6 for scrap
  emblem?: GuildEmblem;
  lore: string;
}

export interface MerchantPlayer {
  id: string;
  name: string;
  title: string;
  isHuman: boolean;
  persona: 'human' | 'highroller' | 'collector' | 'trickster';
  accent: string;
  badgeBg: string;
  remainingBids: number[];
  wonLots: AuctionLot[];
  lastBid: number | null;
}

export interface BidEntry {
  playerId: string;
  playerName: string;
  bid: number;
  isCancelled: boolean;
  isWinner: boolean;
}

export interface RoundResolution {
  round: number;
  lotsAtStake: AuctionLot[];
  entries: BidEntry[];
  winnerId: string | null;
  winnerName: string | null;
  winningBid: number | null;
  isCarryOver: boolean;
  summaryText: string;
}

export interface BidRecommendation {
  bid: number;
  collisionRisk: number; // 0 to 100
  winProbability: number; // 0 to 100
  expectedNetGain: number;
  tag: string;
  reason: string;
}

const EMBLEM_META: Record<
  GuildEmblem,
  {
    name: string;
    shortName: string;
    color: string;
    border: string;
    bg: string;
    badge: string;
  }
> = {
  astro: {
    name: '天文時計ギルド',
    shortName: '天文時計',
    color: 'text-amber-300',
    border: 'border-amber-400/50',
    bg: 'bg-amber-950/40',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  },
  steam: {
    name: '蒸気機関ギルド',
    shortName: '蒸気機関',
    color: 'text-orange-300',
    border: 'border-orange-400/50',
    bg: 'bg-orange-950/40',
    badge: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
  },
  automata: {
    name: '自動人形ギルド',
    shortName: '自動人形',
    color: 'text-cyan-300',
    border: 'border-cyan-400/50',
    bg: 'bg-cyan-950/40',
    badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
  },
  compass: {
    name: '飛行羅針盤ギルド',
    shortName: '飛行羅針盤',
    color: 'text-emerald-300',
    border: 'border-emerald-400/50',
    bg: 'bg-emerald-950/40',
    badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  },
};

const ALL_EMBLEMS: GuildEmblem[] = ['astro', 'steam', 'automata', 'compass'];
const INITIAL_HAND = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const MASTER_LOT_POOL: AuctionLot[] = [
  // Astro (天文時計)
  {
    id: 'astro-10',
    name: '星辰クロノグラフ大時計',
    subtitle: '王立天文台の最高傑作',
    kind: 'artifact',
    basePoints: 10,
    emblem: 'astro',
    lore: '三重の真鍮リングが惑星の公転周期を寸分の狂いなく刻む伝説級天文時計。',
  },
  {
    id: 'astro-7',
    name: '月齢アストロラーベ懐中儀',
    subtitle: '潮汐と月相を読む精密円盤',
    kind: 'artifact',
    basePoints: 7,
    emblem: 'astro',
    lore: '夜空の高度角を測り、蒼い燐光ガラスで新月から満月までを映し出す携帯天球儀。',
  },
  {
    id: 'astro-5',
    name: '日食予測オルゴール渾天儀',
    subtitle: '星々の旋律を奏でる歯車球',
    kind: 'artifact',
    basePoints: 5,
    emblem: 'astro',
    lore: 'ゼンマイを巻くと100年先の日食と彗星回帰をベルの音階で告げる工芸品。',
  },
  // Steam (蒸気機関)
  {
    id: 'steam-9',
    name: '高圧霊気ボイラー心臓炉',
    subtitle: '都市動力塔の黄金シリンダー',
    kind: 'artifact',
    basePoints: 9,
    emblem: 'steam',
    lore: '青白い圧縮蒸気を循環させ、飛空艇一隻を無補給で浮揚させる超小型機関。',
  },
  {
    id: 'steam-7',
    name: '複式ピストン調速タービン',
    subtitle: '遠心ガバナー搭載の精密機関',
    kind: 'artifact',
    basePoints: 7,
    emblem: 'steam',
    lore: '真鍮の双子フライホイールが高速回転し、工房全体の歯車網を同期させる動力源。',
  },
  {
    id: 'steam-4',
    name: '赤銅バルブ圧力計マニホールド',
    subtitle: '職人鍛造の蒸気制御弁',
    kind: 'artifact',
    basePoints: 4,
    emblem: 'steam',
    lore: '熟練の蒸気技師が叩き上げた耐熱ガラス管と八連バルブの美しい制御装置。',
  },
  // Automata (自動人形)
  {
    id: 'automata-9',
    name: '白銀の自動書記オートマタ',
    subtitle: '千枚のカムで詩を綴るからくり人形',
    kind: 'artifact',
    basePoints: 9,
    emblem: 'automata',
    lore: '極小の万年筆を握り、内蔵された黄金カムのプログラムで古文書を清書する傑作。',
  },
  {
    id: 'automata-6',
    name: '翡翠眼のぜんまい歌姫鳥',
    subtitle: '宮廷サロンを魅了する機械鳴鳥',
    kind: 'artifact',
    basePoints: 6,
    emblem: 'automata',
    lore: '精巧なふいごと銀の羽根が連動し、本物の夜鶯さながらにさえずる工芸鳥。',
  },
  {
    id: 'automata-5',
    name: '真鍮騎士の盤上チェス人形',
    subtitle: '三手先を読む歯車論理回路',
    kind: 'artifact',
    basePoints: 5,
    emblem: 'automata',
    lore: '内部の差分歯車機構によって盤面の駒配置を計算し、自動で腕を動かす騎士像。',
  },
  // Compass (飛行羅針盤)
  {
    id: 'compass-8',
    name: '成層圏ジャイロ航法羅針盤',
    subtitle: '嵐の雲海を貫く三軸ジンバル',
    kind: 'artifact',
    basePoints: 8,
    emblem: 'compass',
    lore: 'どれほど飛空艇が揺れても水平を保ち、磁北と風脈を同時に指し示す航法儀。',
  },
  {
    id: 'compass-6',
    name: 'エーテル気流六分儀コンパス',
    subtitle: '空島航路を切り拓く観測器',
    kind: 'artifact',
    basePoints: 6,
    emblem: 'compass',
    lore: '水晶レンズと真鍮目盛りで上空の気流密度を読み取る、空賊垂涎の航海具。',
  },
  {
    id: 'compass-4',
    name: '折り畳み式測量クロノコンパス',
    subtitle: '探検ギルド公認の携帯羅針儀',
    kind: 'artifact',
    basePoints: 4,
    emblem: 'compass',
    lore: '方位磁針と日時計、傾斜計が一体となった冒険商人必携の真鍮コンパス。',
  },
  // Scrap Lots (暴走スクラップ)
  {
    id: 'scrap-3',
    name: '逆流スチーム漏れ配管塊',
    subtitle: '修理費がかさむ暴走スクラップ',
    kind: 'scrap',
    basePoints: -3,
    lore: '黒煙と高温蒸気を噴き出す不良ロット。引き取ると工房の修繕費が差し引かれる！',
  },
  {
    id: 'scrap-5',
    name: '噛み合い崩壊の呪われ歯車箱',
    subtitle: '単独最低額の入札者に押し付けられる厄災',
    kind: 'scrap',
    basePoints: -5,
    lore: 'ゼンマイが逆回転して周囲の機械を巻き込む危険な暴走スクラップ。',
  },
  {
    id: 'scrap-6',
    name: '過負荷爆発寸前の黒鉄ボイラー',
    subtitle: '絶対回避すべき特大負債ロット',
    kind: 'scrap',
    basePoints: -6,
    lore: '安全弁が吹き飛び警報笛が鳴り響く最悪のスクラップ。廃棄処分に莫大な費用が必要！',
  },
];

export function getSetBonusForCount(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 3;
  if (count === 3) return 8;
  return 15; // 4 or more
}

export interface PlayerScoreBreakdown {
  artifactPoints: number;
  scrapPenalty: number;
  emblemCounts: Record<GuildEmblem, number>;
  setBonusPoints: number;
  grandMasterBonus: number;
  leftoverCoinTiebreaker: number;
  totalScore: number;
}

export function calculatePlayerScore(player: MerchantPlayer): PlayerScoreBreakdown {
  let artifactPoints = 0;
  let scrapPenalty = 0;
  const emblemCounts: Record<GuildEmblem, number> = {
    astro: 0,
    steam: 0,
    automata: 0,
    compass: 0,
  };

  for (const lot of player.wonLots) {
    if (lot.kind === 'artifact') {
      artifactPoints += lot.basePoints;
      if (lot.emblem) {
        emblemCounts[lot.emblem] += 1;
      }
    } else {
      scrapPenalty += lot.basePoints; // negative
    }
  }

  let setBonusPoints = 0;
  for (const emblem of ALL_EMBLEMS) {
    setBonusPoints += getSetBonusForCount(emblemCounts[emblem]);
  }

  const hasAllFour = ALL_EMBLEMS.every((e) => emblemCounts[e] >= 1);
  const grandMasterBonus = hasAllFour ? 10 : 0;

  const leftoverCoinTiebreaker = player.remainingBids.reduce((acc, v) => acc + v, 0);
  const totalScore = artifactPoints + scrapPenalty + setBonusPoints + grandMasterBonus;

  return {
    artifactPoints,
    scrapPenalty,
    emblemCounts,
    setBonusPoints,
    grandMasterBonus,
    leftoverCoinTiebreaker,
    totalScore,
  };
}

function buildAuctionDeck(): AuctionLot[] {
  // Always build a balanced 10-round deck:
  // 2 artifacts of each of the 4 emblems (8 artifacts total) + 2 scrap lots = 10 rounds
  const byEmblem: Record<GuildEmblem, AuctionLot[]> = {
    astro: MASTER_LOT_POOL.filter((l) => l.emblem === 'astro'),
    steam: MASTER_LOT_POOL.filter((l) => l.emblem === 'steam'),
    automata: MASTER_LOT_POOL.filter((l) => l.emblem === 'automata'),
    compass: MASTER_LOT_POOL.filter((l) => l.emblem === 'compass'),
  };
  const scraps = MASTER_LOT_POOL.filter((l) => l.kind === 'scrap');

  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const chosen: AuctionLot[] = [
    ...shuffle(byEmblem.astro).slice(0, 2),
    ...shuffle(byEmblem.steam).slice(0, 2),
    ...shuffle(byEmblem.automata).slice(0, 2),
    ...shuffle(byEmblem.compass).slice(0, 2),
    ...shuffle(scraps).slice(0, 2),
  ];

  return shuffle(chosen);
}

function createInitialPlayers(): MerchantPlayer[] {
  return [
    {
      id: 'human',
      name: 'あなた（工房主）',
      title: '新進気鋭の歯車競売人',
      isHuman: true,
      persona: 'human',
      accent: 'text-amber-300',
      badgeBg: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
      remainingBids: [...INITIAL_HAND],
      wonLots: [],
      lastBid: null,
    },
    {
      id: 'ai-highroller',
      name: 'クロノス卿',
      title: '時計塔の大富豪（高点狙い）',
      isHuman: false,
      persona: 'highroller',
      accent: 'text-rose-300',
      badgeBg: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
      remainingBids: [...INITIAL_HAND],
      wonLots: [],
      lastBid: null,
    },
    {
      id: 'ai-collector',
      name: 'ヴェスパー嬢',
      title: '飛空商会令嬢（セット重視）',
      isHuman: false,
      persona: 'collector',
      accent: 'text-cyan-300',
      badgeBg: 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200',
      remainingBids: [...INITIAL_HAND],
      wonLots: [],
      lastBid: null,
    },
    {
      id: 'ai-trickster',
      name: 'ガジェット博士',
      title: '奇術発明家（バッティング裏かき）',
      isHuman: false,
      persona: 'trickster',
      accent: 'text-emerald-300',
      badgeBg: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
      remainingBids: [...INITIAL_HAND],
      wonLots: [],
      lastBid: null,
    },
  ];
}

// Marginal score gain if `player` wins `lots`
function evaluateMarginalValue(player: MerchantPlayer, lots: AuctionLot[]): number {
  const currentScore = calculatePlayerScore(player).totalScore;
  const hypotheticalPlayer: MerchantPlayer = {
    ...player,
    wonLots: [...player.wonLots, ...lots],
  };
  const nextScore = calculatePlayerScore(hypotheticalPlayer).totalScore;
  return nextScore - currentScore;
}

// Compute AI weight distribution across its remaining hand for a given lot stack
function computeAiBidWeights(
  ai: MerchantPlayer,
  allPlayers: MerchantPlayer[],
  lotsAtStake: AuctionLot[]
): Map<number, number> {
  const hand = ai.remainingBids;
  const weights = new Map<number, number>();
  if (hand.length === 0) return weights;

  const marginalGain = evaluateMarginalValue(ai, lotsAtStake);
  const isScrapRound = marginalGain < 0;
  const absStakes = Math.abs(marginalGain);

  // Count how many opponents also hold each number
  const others = allPlayers.filter((p) => p.id !== ai.id);
  const opponentHoldCount = (card: number) =>
    others.filter((o) => o.remainingBids.includes(card)).length;

  const sortedHand = [...hand].sort((a, b) => a - b);
  const n = sortedHand.length;

  for (let idx = 0; idx < n; idx++) {
    const card = sortedHand[idx];
    const percentile = n === 1 ? 0.5 : idx / (n - 1); // 0 = lowest card in hand, 1 = highest card in hand
    const oppCount = opponentHoldCount(card);
    let w = 1.0;

    if (!isScrapRound) {
      // Positive lot: higher marginal gain => wants higher percentile card
      const targetPercentile = Math.min(0.98, Math.max(0.1, (marginalGain - 3) / 14));
      const dist = Math.abs(percentile - targetPercentile);

      if (ai.persona === 'highroller') {
        // Loves high cards on high value lots, dumps lowest cards on low value lots
        if (marginalGain >= 9) {
          w = Math.pow(percentile + 0.15, 3.2);
        } else if (marginalGain <= 5) {
          w = Math.pow(1.1 - percentile, 2.5);
        } else {
          w = Math.exp(-dist * dist * 5.5);
        }
      } else if (ai.persona === 'collector') {
        // Focuses strongly on set bonuses
        const targetP = Math.min(1.0, Math.max(0.05, (marginalGain - 2) / 13));
        const d = Math.abs(percentile - targetP);
        w = Math.exp(-d * d * 6.5);
      } else {
        // trickster: avoids cards held by all 3 opponents, aims slightly below top to snipe collisions
        const snipeTarget = Math.min(0.85, Math.max(0.15, targetPercentile - 0.12));
        const d = Math.abs(percentile - snipeTarget);
        const collisionPenalty = oppCount >= 2 ? 0.55 : oppCount === 0 ? 1.45 : 1.0;
        w = Math.exp(-d * d * 5.0) * collisionPenalty;
      }
    } else {
      // Scrap round (negative lot): lowest unique bid takes the penalty!
      // Players want to NOT be the lowest unique bid, without wasting their absolute best 9-10 cards unless penalty is huge.
      const dangerSeverity = Math.min(1.0, absStakes / 8);
      const safeTarget = 0.28 + dangerSeverity * 0.42;
      const d = Math.abs(percentile - safeTarget);
      // Lowest card in hand is super dangerous unless another player is likely to collide on it
      const lowestDanger = idx === 0 && oppCount <= 1 ? 0.2 : 1.0;
      w = Math.exp(-d * d * 5.0) * lowestDanger;
    }

    weights.set(card, Math.max(0.05, w));
  }

  // Normalize
  let sum = 0;
  weights.forEach((v) => {
    sum += v;
  });
  if (sum > 0) {
    weights.forEach((v, k) => {
      weights.set(k, v / sum);
    });
  }
  return weights;
}

function sampleFromWeights(weights: Map<number, number>): number {
  const entries = Array.from(weights.entries());
  if (entries.length === 0) return 1;
  const r = Math.random();
  let acc = 0;
  for (const [card, prob] of entries) {
    acc += prob;
    if (r <= acc) return card;
  }
  return entries[entries.length - 1][0];
}

// Resolve a set of bids for a given lot stack
export function resolveAuctionBids(
  bids: { playerId: string; playerName: string; bid: number }[],
  lotsAtStake: AuctionLot[]
): {
  entries: BidEntry[];
  winnerId: string | null;
  winnerName: string | null;
  winningBid: number | null;
} {
  const netPoints = lotsAtStake.reduce((acc, l) => acc + l.basePoints, 0);
  const isPositive = netPoints >= 0;

  const freq = new Map<number, number>();
  for (const b of bids) {
    freq.set(b.bid, (freq.get(b.bid) ?? 0) + 1);
  }

  const uniqueBids = bids.filter((b) => (freq.get(b.bid) ?? 0) === 1);
  let winner: { playerId: string; playerName: string; bid: number } | null = null;

  if (uniqueBids.length > 0) {
    uniqueBids.sort((a, b) => (isPositive ? b.bid - a.bid : a.bid - b.bid));
    winner = uniqueBids[0];
  }

  const entries: BidEntry[] = bids
    .map((b) => ({
      playerId: b.playerId,
      playerName: b.playerName,
      bid: b.bid,
      isCancelled: (freq.get(b.bid) ?? 0) > 1,
      isWinner: winner?.playerId === b.playerId,
    }))
    .sort((a, b) => b.bid - a.bid);

  return {
    entries,
    winnerId: winner ? winner.playerId : null,
    winnerName: winner ? winner.playerName : null,
    winningBid: winner ? winner.bid : null,
  };
}

// Custom SVG Icon for each Guild Emblem + Scrap
function LotEmblemSvg({
  kind,
  emblem,
  size = 56,
}: {
  kind: 'artifact' | 'scrap';
  emblem?: GuildEmblem;
  size?: number;
}) {
  if (kind === 'scrap') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className="drop-shadow-[0_2px_8px_rgba(244,63,94,0.45)]"
      >
        <circle cx="32" cy="32" r="26" fill="#2a0a12" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5 3" />
        <path
          d="M22 20L42 44M42 20L22 44"
          stroke="#fb7185"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="10" fill="#881337" stroke="#fda4af" strokeWidth="2" />
        <path d="M32 12V18M32 46V52M12 32H18M46 32H52" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (emblem === 'astro') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className="drop-shadow-[0_2px_8px_rgba(251,191,36,0.45)]"
      >
        <circle cx="32" cy="32" r="26" fill="#271a05" stroke="#fbbf24" strokeWidth="2.5" />
        <ellipse cx="32" cy="32" rx="22" ry="10" transform="rotate(-25 32 32)" stroke="#fde68a" strokeWidth="1.8" />
        <ellipse cx="32" cy="32" rx="22" ry="10" transform="rotate(35 32 32)" stroke="#f59e0b" strokeWidth="1.8" />
        <circle cx="32" cy="32" r="7" fill="#fbbf24" />
        <path d="M32 8V14M32 50V56M8 32H14M50 32H56" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (emblem === 'steam') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className="drop-shadow-[0_2px_8px_rgba(249,115,22,0.45)]"
      >
        <circle cx="32" cy="32" r="25" fill="#2a1205" stroke="#fb923c" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="15" fill="#431407" stroke="#fdba74" strokeWidth="2.2" strokeDasharray="6 4" />
        <rect x="25" y="18" width="14" height="28" rx="4" fill="#ea580c" stroke="#ffedd5" strokeWidth="2" />
        <circle cx="32" cy="32" r="4" fill="#ffedd5" />
      </svg>
    );
  }

  if (emblem === 'automata') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className="drop-shadow-[0_2px_8px_rgba(34,211,238,0.45)]"
      >
        <circle cx="32" cy="32" r="26" fill="#062229" stroke="#22d3ee" strokeWidth="2.5" />
        <path
          d="M22 26C22 20.5 26.5 16 32 16C37.5 16 42 20.5 42 26V38C42 42.4 38.4 46 34 46H30C25.6 46 22 42.4 22 38V26Z"
          fill="#083344"
          stroke="#67e8f9"
          strokeWidth="2.2"
        />
        <circle cx="28" cy="28" r="3" fill="#a5f3fc" />
        <circle cx="36" cy="28" r="3" fill="#a5f3fc" />
        <path d="M27 37H37" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  // compass
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className="drop-shadow-[0_2px_8px_rgba(52,211,153,0.45)]"
    >
      <circle cx="32" cy="32" r="26" fill="#04261c" stroke="#34d399" strokeWidth="2.5" />
      <polygon points="32,12 38,32 32,52 26,32" fill="#10b981" stroke="#a7f3d0" strokeWidth="1.8" />
      <polygon points="12,32 32,26 52,32 32,38" fill="#065f46" stroke="#6ee7b7" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="4.5" fill="#ecfdf5" />
    </svg>
  );
}

export default function AutomatonsBazaarGame() {
  const [deck, setDeck] = useState<AuctionLot[]>(() => buildAuctionDeck());
  const [roundIndex, setRoundIndex] = useState<number>(0); // 0 to 9
  const [carryOverLots, setCarryOverLots] = useState<AuctionLot[]>([]);
  const [players, setPlayers] = useState<MerchantPlayer[]>(() => createInitialPlayers());
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const [roundResolution, setRoundResolution] = useState<RoundResolution | null>(null);
  const [history, setHistory] = useState<RoundResolution[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  const [showAnalyzer, setShowAnalyzer] = useState<boolean>(true);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Procedural Steampunk Clockwork Waltz Music-Box BGM
  useEffect(() => {
    if (!bgmOn || typeof window === 'undefined') return undefined;
    let cancelled = false;
    let timerId: number | null = null;
    // 3/4 waltz patterns in D minor / A7 steampunk clockwork style
    const waltzBars = [
      [146.83, 293.66, 349.23, 440.0], // Dm
      [130.81, 261.63, 329.63, 392.0], // C
      [116.54, 233.08, 293.66, 349.23], // Bb
      [110.0, 220.0, 277.18, 329.63], // A7
    ];
    let bar = 0;

    const tick = () => {
      if (cancelled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioCtx();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') {
            void ctx.resume();
          }
          const now = ctx.currentTime;
          const notes = waltzBars[bar % waltzBars.length];
          // Beat 1: Bass, Beat 2 & 3: Clockwork upper chimes
          [0, 1, 2].forEach((beat) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + beat * 0.55;
            const freq = beat === 0 ? notes[0] : beat === 1 ? notes[2] : notes[3];
            osc.type = beat === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(beat === 0 ? 0.022 : 0.013, start + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.52);
          });
          bar += 1;
        }
      } catch {
        // ignore audio errors
      }
      timerId = window.setTimeout(tick, 1650);
    };

    tick();
    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [bgmOn]);

  const playSound = useCallback(
    (type: 'coin' | 'gavel' | 'win' | 'collision' | 'scrap' | 'fanfare') => {
      if (!soundOn || typeof window === 'undefined') return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        const now = ctx.currentTime;

        if (type === 'coin') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1180, now);
          osc.frequency.exponentialRampToValueAtTime(1760, now + 0.09);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'gavel') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(62, now + 0.12);
          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.16);
        } else if (type === 'win') {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0.14, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.24);
          });
        } else if (type === 'collision') {
          [320, 235].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.11, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.2);
          });
        } else if (type === 'scrap') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.linearRampToValueAtTime(85, now + 0.28);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.31);
        } else if (type === 'fanfare') {
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.16, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.32);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.35);
          });
        }
      } catch {
        // Ignore Web Audio errors on restricted autoplay
      }
    },
    [soundOn]
  );

  const isMatchFinished = roundIndex >= deck.length;
  const currentLot = !isMatchFinished ? deck[roundIndex] : null;
  const lotsAtStake = useMemo(() => {
    if (!currentLot) return [];
    return [...carryOverLots, currentLot];
  }, [carryOverLots, currentLot]);

  const humanPlayer = players[0];

  // Calculate score breakdowns for all 4 players
  const scoreMap = useMemo(() => {
    const map = new Map<string, PlayerScoreBreakdown>();
    for (const p of players) {
      map.set(p.id, calculatePlayerScore(p));
    }
    return map;
  }, [players]);

  // Collision Risk & Recommended Bid Analyzer using exact probability distributions of the 3 AI bidders
  const bidRecommendations = useMemo<BidRecommendation[]>(() => {
    if (!currentLot || roundResolution) return [];
    const aiPlayers = players.filter((p) => !p.isHuman);
    const aiDistributions = aiPlayers.map((ai) => computeAiBidWeights(ai, players, lotsAtStake));

    const humanGainIfWin = evaluateMarginalValue(humanPlayer, lotsAtStake);
    const netStake = lotsAtStake.reduce((acc, l) => acc + l.basePoints, 0);
    const isPositiveLot = netStake >= 0;

    // Enumerate all possible AI bid triples (at most 10*10*10 = 1000 combinations, instantaneous!)
    const ai0Entries = Array.from(aiDistributions[0]?.entries() ?? []);
    const ai1Entries = Array.from(aiDistributions[1]?.entries() ?? []);
    const ai2Entries = Array.from(aiDistributions[2]?.entries() ?? []);

    const results: BidRecommendation[] = [];

    for (const candidateBid of humanPlayer.remainingBids) {
      let probCollisionWithHuman = 0;
      let probHumanWins = 0;

      for (const [b0, p0] of ai0Entries) {
        for (const [b1, p1] of ai1Entries) {
          for (const [b2, p2] of ai2Entries) {
            const jointProb = p0 * p1 * p2;
            const humanCollided = candidateBid === b0 || candidateBid === b1 || candidateBid === b2;
            if (humanCollided) {
              probCollisionWithHuman += jointProb;
              continue;
            }

            // Human bid is unique. Check which AI bids are unique
            const b0Unique = b0 !== b1 && b0 !== b2;
            const b1Unique = b1 !== b0 && b1 !== b2;
            const b2Unique = b2 !== b0 && b2 !== b1;

            let humanBeatsAllUniqueAis = true;
            if (isPositiveLot) {
              if (b0Unique && b0 > candidateBid) humanBeatsAllUniqueAis = false;
              if (b1Unique && b1 > candidateBid) humanBeatsAllUniqueAis = false;
              if (b2Unique && b2 > candidateBid) humanBeatsAllUniqueAis = false;
            } else {
              // Scrap lot: lowest unique bidder gets the scrap
              if (b0Unique && b0 < candidateBid) humanBeatsAllUniqueAis = false;
              if (b1Unique && b1 < candidateBid) humanBeatsAllUniqueAis = false;
              if (b2Unique && b2 < candidateBid) humanBeatsAllUniqueAis = false;
            }

            if (humanBeatsAllUniqueAis) {
              probHumanWins += jointProb;
            }
          }
        }
      }

      const collisionRisk = Math.round(probCollisionWithHuman * 100);
      const winProbability = Math.round(probHumanWins * 100);

      // Opportunity cost of spending a high bid card
      const cardCost = candidateBid * 0.48;
      const expectedNetGain = isPositiveLot
        ? probHumanWins * humanGainIfWin - cardCost
        : (1 - probHumanWins) * Math.abs(humanGainIfWin) - cardCost * 0.55;

      let tag = '標準手';
      let reason = '';

      if (isPositiveLot) {
        if (collisionRisk === 0 && winProbability >= 95) {
          tag = '単独確定勝利';
          reason = 'AI誰も持っていないか上回れない単独最高額カードです。';
        } else if (winProbability >= 65 && collisionRisk <= 28) {
          tag = '本命落札ライン';
          reason = `バッティング率${collisionRisk}%を抑えつつ高確率（${winProbability}%）で落札を狙えます。`;
        } else if (collisionRisk >= 45) {
          tag = 'バッティング警戒';
          reason = `AIと額が被って無効化されるリスクが${collisionRisk}%あります。`;
        } else if (candidateBid <= 3 && winProbability >= 18) {
          tag = '漁夫の利スナイプ';
          reason = `上位陣の同額相殺による繰り上がり落札（${winProbability}%）を低コストで狙う奇策です。`;
        } else {
          tag = '温存・様子見';
          reason = '金貨を節約して後半の高額ロットに備える選択です。';
        }
      } else {
        // Scrap round
        if (winProbability <= 8) {
          tag = '安全回避ライン';
          reason = `スクラップ押し付け確率を${winProbability}%以下に抑えて安全にやり過ごせます。`;
        } else if (winProbability >= 45) {
          tag = '被弾危険！';
          reason = `単独最低額になり暴走スクラップを引き取る危険が${winProbability}%あります！`;
        } else {
          tag = '中位回避';
          reason = `被弾リスク${winProbability}%。他家の低額入札を祈るラインです。`;
        }
      }

      results.push({
        bid: candidateBid,
        collisionRisk,
        winProbability,
        expectedNetGain,
        tag,
        reason,
      });
    }

    return results;
  }, [currentLot, humanPlayer, lotsAtStake, players, roundResolution]);

  const bestRecommendation = useMemo(() => {
    if (bidRecommendations.length === 0) return null;
    return [...bidRecommendations].sort((a, b) => b.expectedNetGain - a.expectedNetGain)[0];
  }, [bidRecommendations]);

  const handlePlaceBid = useCallback(
    (humanBid: number) => {
      if (!currentLot || roundResolution) return;
      if (!humanPlayer.remainingBids.includes(humanBid)) return;

      playSound('gavel');

      const allBids: { playerId: string; playerName: string; bid: number }[] = players.map((p) => {
        if (p.isHuman) {
          return { playerId: p.id, playerName: p.name, bid: humanBid };
        }
        const weights = computeAiBidWeights(p, players, lotsAtStake);
        const aiBid = sampleFromWeights(weights);
        return { playerId: p.id, playerName: p.name, bid: aiBid };
      });

      const resolved = resolveAuctionBids(allBids, lotsAtStake);
      const isCarryOver = resolved.winnerId === null;
      const netPoints = lotsAtStake.reduce((acc, l) => acc + l.basePoints, 0);

      let summaryText = '';
      if (isCarryOver) {
        summaryText =
          '全員がバッティング（同額相殺）！今回の出品ロットは次ラウンドへキャリーオーバーされます！';
        playSound('collision');
      } else if (netPoints >= 0) {
        summaryText = `${resolved.winnerName} が【${resolved.winningBid} ソヴリン金貨】の単独最高額で落札しました！`;
        if (resolved.winnerId === 'human') {
          playSound('win');
        } else if (resolved.entries.some((e) => e.playerId === 'human' && e.isCancelled)) {
          playSound('collision');
        }
      } else {
        summaryText = `${resolved.winnerName} が【${resolved.winningBid} ソヴリン金貨】の単独最低額となり、暴走スクラップを引き取りました…！`;
        if (resolved.winnerId === 'human') {
          playSound('scrap');
        }
      }

      const nextPlayers = players.map((p) => {
        const myBidObj = allBids.find((b) => b.playerId === p.id)!;
        const nextRemaining = p.remainingBids.filter((c) => c !== myBidObj.bid);
        const nextWonLots =
          resolved.winnerId === p.id && !isCarryOver ? [...p.wonLots, ...lotsAtStake] : p.wonLots;
        return {
          ...p,
          remainingBids: nextRemaining,
          wonLots: nextWonLots,
          lastBid: myBidObj.bid,
        };
      });

      const resolutionRecord: RoundResolution = {
        round: roundIndex + 1,
        lotsAtStake,
        entries: resolved.entries,
        winnerId: resolved.winnerId,
        winnerName: resolved.winnerName,
        winningBid: resolved.winningBid,
        isCarryOver,
        summaryText,
      };

      setPlayers(nextPlayers);
      setRoundResolution(resolutionRecord);
      setHistory((prev) => [resolutionRecord, ...prev]);
      setSelectedBid(null);
    },
    [currentLot, humanPlayer.remainingBids, lotsAtStake, playSound, players, roundIndex, roundResolution]
  );

  const handleAdvanceRound = useCallback(() => {
    if (!roundResolution) return;
    const nextRound = roundIndex + 1;
    if (roundResolution.isCarryOver && nextRound < deck.length) {
      setCarryOverLots(roundResolution.lotsAtStake);
    } else {
      setCarryOverLots([]);
    }
    setRoundResolution(null);
    setRoundIndex(nextRound);
    if (nextRound >= deck.length) {
      playSound('fanfare');
    } else {
      playSound('coin');
    }
  }, [deck.length, playSound, roundIndex, roundResolution]);

  const handleNewMatch = useCallback(() => {
    playSound('coin');
    setDeck(buildAuctionDeck());
    setRoundIndex(0);
    setCarryOverLots([]);
    setPlayers(createInitialPlayers());
    setSelectedBid(null);
    setRoundResolution(null);
    setHistory([]);
  }, [playSound]);

  // Final standings sorted by totalScore desc, then leftoverCoinTiebreaker desc
  const rankedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const sa = scoreMap.get(a.id)!;
      const sb = scoreMap.get(b.id)!;
      if (sb.totalScore !== sa.totalScore) return sb.totalScore - sa.totalScore;
      return sb.leftoverCoinTiebreaker - sa.leftoverCoinTiebreaker;
    });
  }, [players, scoreMap]);

  const netLotPoints = lotsAtStake.reduce((acc, l) => acc + l.basePoints, 0);
  const isCurrentScrap = netLotPoints < 0;

  return (
    <div className="min-h-screen bg-[#120d08] text-amber-50 selection:bg-amber-500/30">
      {/* Top Steampunk Header */}
      <header className="sticky top-0 z-30 border-b border-amber-500/25 bg-[#16100a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/games"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-950/40 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:border-amber-300 hover:bg-amber-900/50"
            >
              <span>←</span>
              <span>ゲーム一覧</span>
            </Link>
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-amber-400/80 uppercase">
                CLOCKWORK SIMULTANEOUS AUCTION &amp; SET COLLECTION
              </p>
              <h2 className="text-sm font-black tracking-tight text-amber-50 sm:text-base">
                からくりバザール：歯車都市の競売人
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAnalyzer((v) => !v)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                showAnalyzer
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                  : 'border-white/15 bg-white/[0.04] text-stone-300'
              }`}
            >
              {showAnalyzer ? '⚙ 競売参謀 AI ON' : '⚙ 競売参謀 AI OFF'}
            </button>
            <button
              type="button"
              onClick={() => setBgmOn((v) => !v)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                bgmOn
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                  : 'border-amber-500/25 bg-amber-950/30 text-stone-300 hover:border-amber-400/60'
              }`}
            >
              {bgmOn ? '🎵 BGM ON' : '🎵 BGM OFF'}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              className="rounded-lg border border-amber-500/25 bg-amber-950/30 px-2.5 py-1.5 text-xs font-bold text-amber-100 transition hover:border-amber-400/60"
            >
              {soundOn ? '🔊 効果音 ON' : '🔇 効果音 OFF'}
            </button>
            <button
              type="button"
              onClick={handleNewMatch}
              className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1.5 text-xs font-black text-amber-200 transition hover:bg-amber-500/30"
            >
              新規オークション
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_390px]">
        {/* Left Column: Auction Stage, Bidding Hand, Resolution */}
        <div className="flex flex-col gap-4">
          {/* Round Progress Track */}
          <div className="rounded-2xl border border-amber-500/25 bg-[#1b130c]/95 p-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 font-mono text-xs font-black text-amber-200">
                  {isMatchFinished ? 'FINAL RESULT' : `ROUND ${roundIndex + 1} / ${deck.length}`}
                </span>
                <span className="text-xs font-bold text-amber-200/80">
                  {isMatchFinished
                    ? '全10ラウンドの競売が完了しました！'
                    : '手札の1〜10金貨は1回使い切り！同額入札（バッティング）は無効化されます'}
                </span>
              </div>
              {carryOverLots.length > 0 && (
                <span className="animate-pulse rounded-full border border-rose-400/50 bg-rose-500/20 px-3 py-0.5 text-xs font-black text-rose-200">
                  🔥 キャリーオーバー中（+{carryOverLots.length}品累積）
                </span>
              )}
            </div>

            {/* 10 Round Pips */}
            <div className="mt-2.5 grid grid-cols-10 gap-1.5">
              {deck.map((lot, idx) => {
                const isPast = idx < roundIndex;
                const isCurrent = idx === roundIndex && !isMatchFinished;
                return (
                  <div
                    key={lot.id}
                    className={`flex flex-col items-center justify-center rounded-lg border py-1 text-[10px] font-black transition ${
                      isCurrent
                        ? 'border-amber-300 bg-amber-500/30 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                        : isPast
                          ? 'border-amber-500/15 bg-black/40 text-stone-500'
                          : 'border-amber-500/20 bg-amber-950/25 text-amber-200/70'
                    }`}
                  >
                    <span>R{idx + 1}</span>
                    <span
                      className={
                        lot.kind === 'scrap' ? 'text-rose-400' : 'text-amber-300'
                      }
                    >
                      {lot.basePoints > 0 ? `+${lot.basePoints}` : lot.basePoints}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Auction Lot Stage OR Final Podium */}
          {!isMatchFinished && currentLot ? (
            <div
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-xl transition sm:p-5 ${
                isCurrentScrap
                  ? 'border-rose-500/50 bg-gradient-to-br from-[#2a0d14] via-[#1c0c10] to-[#14090c]'
                  : 'border-amber-400/45 bg-gradient-to-br from-[#281b0e] via-[#1d140b] to-[#140e08]'
              }`}
            >
              {/* Rule Banner */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-black ${
                      isCurrentScrap
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-400 text-stone-950'
                    }`}
                  >
                    {isCurrentScrap ? '⚠ 暴走スクラップ回（逆競り）' : '👑 名匠からくり出品ロット'}
                  </span>
                  <span className="text-xs font-bold text-amber-100/90">
                    {isCurrentScrap
                      ? '【単独最低額】を出した商人がマイナス品を引き取ります（同額は相殺回避）'
                      : '【単独最高額】を出した商人が落札します（同額はバッティング無効！）'}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-amber-300/80">
                  一斉公開オークション
                </span>
              </div>

              {/* Lots on the Pedestal */}
              <div className="grid gap-3 sm:grid-cols-1">
                {lotsAtStake.map((lot, idx) => {
                  const emblemInfo = lot.emblem ? EMBLEM_META[lot.emblem] : null;
                  const humanCountOfEmblem = lot.emblem
                    ? scoreMap.get('human')?.emblemCounts[lot.emblem] ?? 0
                    : 0;
                  const nextBonusDelta =
                    lot.emblem
                      ? getSetBonusForCount(humanCountOfEmblem + 1) -
                        getSetBonusForCount(humanCountOfEmblem)
                      : 0;

                  return (
                    <div
                      key={lot.id}
                      className={`flex flex-col justify-between gap-4 rounded-xl border p-3.5 sm:flex-row sm:items-center ${
                        lot.kind === 'scrap'
                          ? 'border-rose-400/40 bg-rose-950/30'
                          : 'border-amber-400/35 bg-black/35'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="shrink-0">
                          <LotEmblemSvg kind={lot.kind} emblem={lot.emblem} size={60} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {idx < lotsAtStake.length - 1 && (
                              <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-black text-amber-200">
                                前回キャリーオーバー品
                              </span>
                            )}
                            {emblemInfo ? (
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${emblemInfo.badge}`}
                              >
                                ⚙ {emblemInfo.name}
                              </span>
                            ) : (
                              <span className="rounded-full border border-rose-400/50 bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-black text-rose-200">
                                💥 負債スクラップ
                              </span>
                            )}
                            <span className="text-xs font-semibold text-amber-200/70">
                              {lot.subtitle}
                            </span>
                          </div>
                          <h3 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">
                            {lot.name}
                          </h3>
                          <p className="mt-0.5 text-xs leading-relaxed text-amber-100/75">
                            {lot.lore}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-white/10 pt-2.5 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold tracking-wider text-amber-200/70 uppercase">
                            基本評価値
                          </span>
                          <span
                            className={`font-mono text-2xl font-black sm:text-3xl ${
                              lot.basePoints >= 0 ? 'text-amber-300' : 'text-rose-400'
                            }`}
                          >
                            {lot.basePoints > 0 ? `+${lot.basePoints}` : lot.basePoints} pt
                          </span>
                        </div>
                        {lot.emblem && (
                          <div className="rounded-lg border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-right text-[11px]">
                            <span className="text-amber-200/80">
                              現在所持: <strong>{humanCountOfEmblem}個</strong>
                            </span>
                            {nextBonusDelta > 0 && (
                              <span className="ml-1.5 font-black text-emerald-300">
                                （獲得でセット+{nextBonusDelta}pt!）
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Round Resolution Reveal Box OR Human Bid Selector */}
              {roundResolution ? (
                <div className="mt-4 rounded-xl border border-amber-300/40 bg-black/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-amber-200">
                      🔔 第{roundResolution.round}ラウンド 一斉公開結果
                    </h4>
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-200">
                      {roundResolution.isCarryOver ? '全員相殺・キャリーオーバー' : '落札確定'}
                    </span>
                  </div>

                  <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-amber-100 sm:text-sm">
                    {roundResolution.summaryText}
                  </p>

                  {/* 4 Bidders Cards Revealed */}
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {roundResolution.entries.map((entry) => (
                      <div
                        key={entry.playerId}
                        className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                          entry.isWinner
                            ? isCurrentScrap
                              ? 'border-rose-400 bg-rose-950/60 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                              : 'border-amber-300 bg-amber-500/25 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
                            : entry.isCancelled
                              ? 'border-rose-500/40 bg-stone-900/80 opacity-75'
                              : 'border-white/15 bg-white/[0.04]'
                        }`}
                      >
                        <span className="text-xs font-bold text-amber-100">{entry.playerName}</span>
                        <span
                          className={`my-1 font-mono text-2xl font-black ${
                            entry.isCancelled
                              ? 'text-rose-400 line-through'
                              : entry.isWinner
                                ? 'text-amber-300'
                                : 'text-stone-200'
                          }`}
                        >
                          {entry.bid} 金貨
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-black ${
                            entry.isWinner
                              ? isCurrentScrap
                                ? 'bg-rose-500 text-white'
                                : 'bg-amber-400 text-stone-950'
                              : entry.isCancelled
                                ? 'bg-rose-500/25 text-rose-300'
                                : 'bg-white/10 text-stone-300'
                          }`}
                        >
                          {entry.isWinner
                            ? isCurrentScrap
                              ? '💥 スクラップ引取'
                              : '👑 単独落札！'
                            : entry.isCancelled
                              ? '⚡ バッティング無効'
                              : '次点・見送り'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAdvanceRound}
                      className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 text-sm font-black text-stone-950 shadow-lg transition hover:brightness-110 sm:w-auto"
                    >
                      {roundIndex + 1 >= deck.length
                        ? '🏆 最終決算スコアボードへ進む'
                        : `次の第${roundIndex + 2}ラウンドへ進む →`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-400/30 bg-[#140e08]/90 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black tracking-wider text-amber-300 uppercase sm:text-sm">
                        🪙 あなたの入札手札（残り {humanPlayer.remainingBids.length} 枚・使い切り）
                      </h4>
                      <p className="text-[11px] text-amber-100/70">
                        金貨カードを選んで「一斉公開で入札する」を押してください（数字ボタンダブルタップでも即入札可能）
                      </p>
                    </div>
                    {bestRecommendation && showAnalyzer && (
                      <div className="rounded-lg border border-emerald-400/40 bg-emerald-950/50 px-2.5 py-1 text-xs font-bold text-emerald-200">
                        💡 参謀推奨: <strong className="text-emerald-300">{bestRecommendation.bid}金貨</strong>（{bestRecommendation.tag}）
                      </div>
                    )}
                  </div>

                  {/* 1..10 Bid Card Buttons */}
                  <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {INITIAL_HAND.map((coin) => {
                      const isAvailable = humanPlayer.remainingBids.includes(coin);
                      const isSelected = selectedBid === coin;
                      const rec = bidRecommendations.find((r) => r.bid === coin);
                      const isRecommended = bestRecommendation?.bid === coin;

                      return (
                        <button
                          key={coin}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => {
                            if (!isAvailable) return;
                            playSound('coin');
                            if (selectedBid === coin) {
                              handlePlaceBid(coin);
                            } else {
                              setSelectedBid(coin);
                            }
                          }}
                          className={`group relative flex flex-col items-center justify-center rounded-xl border py-2.5 transition ${
                            !isAvailable
                              ? 'cursor-not-allowed border-stone-800 bg-stone-950/50 text-stone-700 opacity-45'
                              : isSelected
                                ? ' -translate-y-1 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 shadow-[0_6px_18px_rgba(251,191,36,0.45)]'
                                : isRecommended && showAnalyzer
                                  ? 'border-emerald-400/70 bg-emerald-950/40 text-amber-100 hover:-translate-y-0.5 hover:border-emerald-300'
                                  : 'border-amber-500/35 bg-amber-950/35 text-amber-100 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-900/40'
                          }`}
                        >
                          {isRecommended && isAvailable && showAnalyzer && (
                            <span className="absolute -top-2 rounded-full bg-emerald-400 px-1.5 py-0.2 text-[9px] font-black text-stone-950">
                              推奨
                            </span>
                          )}
                          <span className="font-mono text-lg font-black sm:text-xl">{coin}</span>
                          <span
                            className={`text-[9px] font-bold ${
                              !isAvailable
                                ? 'text-stone-600'
                                : isSelected
                                  ? 'text-stone-900'
                                  : 'text-amber-300/75'
                            }`}
                          >
                            {!isAvailable
                              ? '使用済'
                              : rec && showAnalyzer
                                ? `勝${rec.winProbability}%`
                                : '金貨'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Bid Detail & Action Button */}
                  <div className="mt-3.5 flex flex-col items-stretch justify-between gap-2.5 sm:flex-row sm:items-center">
                    <div className="text-xs text-amber-100/85">
                      {selectedBid !== null ? (
                        (() => {
                          const rec = bidRecommendations.find((r) => r.bid === selectedBid);
                          return rec ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono font-black text-amber-200">
                                選択中: {selectedBid} ソヴリン金貨
                              </span>
                              <span className="text-emerald-300 font-bold">
                                [{rec.tag}] 落札/回避期待 {rec.winProbability}%・被り率 {rec.collisionRisk}%
                              </span>
                              <span className="text-amber-100/70">{rec.reason}</span>
                            </div>
                          ) : null;
                        })()
                      ) : (
                        <span className="text-amber-200/70">
                          👆 上の1〜10金貨カードから、このラウンドで入札する1枚を選択してください
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={selectedBid === null}
                      onClick={() => selectedBid !== null && handlePlaceBid(selectedBid)}
                      className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-black transition ${
                        selectedBid !== null
                          ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 text-stone-950 shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:brightness-110'
                          : 'cursor-not-allowed border border-amber-500/20 bg-stone-900 text-stone-500'
                      }`}
                    >
                      {selectedBid !== null
                        ? `🔨 ${selectedBid} 金貨で一斉公開入札する！`
                        : '金貨カードを選択してください'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Final Result Podium */
            <div className="rounded-2xl border border-amber-400/50 bg-gradient-to-br from-[#2b1d0f] via-[#1c130a] to-[#120c07] p-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/25 pb-3">
                <div>
                  <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                    GRAND CLOCKWORK BAZAAR FINALE
                  </span>
                  <h3 className="text-xl font-black text-white sm:text-2xl">
                    🏆 歯車都市の競売会 最終決算ランキング
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleNewMatch}
                  className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-xs font-black text-stone-950 shadow-lg transition hover:brightness-110"
                >
                  🔄 新しいデッキで再戦する
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {rankedPlayers.map((p, idx) => {
                  const sc = scoreMap.get(p.id)!;
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center ${
                        idx === 0
                          ? 'border-amber-300 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                          : p.isHuman
                            ? 'border-amber-400/40 bg-amber-950/40'
                            : 'border-white/10 bg-black/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-black ${
                            idx === 0
                              ? 'bg-amber-400 text-stone-950'
                              : idx === 1
                                ? 'bg-stone-300 text-stone-950'
                                : idx === 2
                                  ? 'bg-amber-700 text-amber-100'
                                  : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {idx + 1}位
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white">{p.name}</span>
                            <span className="text-xs text-amber-200/70">{p.title}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-amber-100/80">
                            <span>基本品: +{sc.artifactPoints}pt</span>
                            <span>スクラップ: {sc.scrapPenalty}pt</span>
                            <span className="text-emerald-300">
                              同紋章セットボーナス: +{sc.setBonusPoints}pt
                            </span>
                            {sc.grandMasterBonus > 0 && (
                              <span className="font-black text-amber-300">
                                ★4種コンプリート大賞: +{sc.grandMasterBonus}pt
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-2xl font-black text-amber-300">
                          {sc.totalScore} pt
                        </span>
                        <span className="block text-[10px] text-amber-200/60">
                          落札数 {p.wonLots.length}品
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4 Guild Merchants Inventory & Set Synergy Grid */}
          <div className="rounded-2xl border border-amber-500/25 bg-[#19120b]/95 p-4 shadow-lg">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-amber-200">
                🏛 4大商人ギルドの獲得コレクション＆セットボーナス状況
              </h3>
              <div className="flex flex-wrap gap-2 text-[11px] font-bold text-amber-200/80">
                <span className="rounded border border-amber-400/30 bg-amber-950/40 px-2 py-0.5">
                  同紋章2個: +3pt / 3個: +8pt / 4個: +15pt
                </span>
                <span className="rounded border border-emerald-400/30 bg-emerald-950/40 px-2 py-0.5 text-emerald-200">
                  4紋章すべて1個以上: 大工房ボーナス +10pt
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {players.map((p) => {
                const sc = scoreMap.get(p.id)!;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-3 ${
                      p.isHuman
                        ? 'border-amber-400/45 bg-amber-950/25'
                        : 'border-white/10 bg-black/35'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <span className={`text-sm font-black ${p.accent}`}>{p.name}</span>
                        <span className="ml-1.5 text-[11px] text-amber-100/60">{p.title}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-lg font-black text-white">
                          {sc.totalScore} pt
                        </span>
                        {sc.setBonusPoints + sc.grandMasterBonus > 0 && (
                          <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">
                            ボーナス+{sc.setBonusPoints + sc.grandMasterBonus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4 Emblem Counters */}
                    <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                      {ALL_EMBLEMS.map((emblem) => {
                        const meta = EMBLEM_META[emblem];
                        const count = sc.emblemCounts[emblem];
                        const bonus = getSetBonusForCount(count);
                        return (
                          <div
                            key={emblem}
                            className={`rounded-lg border px-2 py-1.5 text-center ${
                              count > 0
                                ? `${meta.border} ${meta.bg}`
                                : 'border-white/5 bg-black/30 opacity-60'
                            }`}
                          >
                            <span className={`block text-[10px] font-bold ${meta.color}`}>
                              {meta.shortName}
                            </span>
                            <span className="font-mono text-sm font-black text-white">
                              {count}個
                            </span>
                            {bonus > 0 && (
                              <span className="block text-[9px] font-black text-emerald-300">
                                +{bonus}pt
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Won Lots List */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.wonLots.length === 0 ? (
                        <span className="text-[11px] text-stone-500">まだ落札品はありません</span>
                      ) : (
                        p.wonLots.map((lot) => (
                          <span
                            key={lot.id}
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                              lot.kind === 'scrap'
                                ? 'border-rose-500/40 bg-rose-950/60 text-rose-200'
                                : 'border-amber-400/30 bg-amber-950/50 text-amber-100'
                            }`}
                          >
                            {lot.name} ({lot.basePoints > 0 ? `+${lot.basePoints}` : lot.basePoints})
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Complete Information Card-Counting Matrix & Collision Risk Analyzer */}
        <div className="flex flex-col gap-4">
          {/* Card-Counting Matrix */}
          <div className="rounded-2xl border border-amber-400/35 bg-[#19120b]/95 p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
              <div>
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                  COMPLETE INFORMATION COUNTER
                </span>
                <h3 className="text-sm font-black text-white">
                  📊 全プレイヤー残り手札カウンティング表
                </h3>
              </div>
              <span className="rounded-md border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                公開情報
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-amber-100/75">
              全員が同じ「1〜10」の金貨カードからスタートし、一度使ったカードは復活しません。ライバルがどの高額カードを温存しているかが一目で分かります。
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] text-amber-200/80">
                    <th className="py-1.5 text-left font-bold">競売人</th>
                    {INITIAL_HAND.map((c) => (
                      <th key={c} className="px-1 py-1.5 font-mono font-black">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {players.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className={`py-2 pr-2 text-left text-[11px] font-black ${p.accent}`}>
                        {p.isHuman ? 'あなた' : p.name}
                      </td>
                      {INITIAL_HAND.map((c) => {
                        const held = p.remainingBids.includes(c);
                        const wasLastPlayed = p.lastBid === c;
                        return (
                          <td key={c} className="p-0.5">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded font-mono text-[11px] font-black ${
                                held
                                  ? p.isHuman
                                    ? 'border border-amber-400/50 bg-amber-500/25 text-amber-100'
                                    : 'border border-white/15 bg-white/10 text-stone-100'
                                  : wasLastPlayed
                                    ? 'border border-rose-400/50 bg-rose-950/60 text-rose-300 line-through'
                                    : 'bg-black/40 text-stone-700'
                              }`}
                              title={
                                held
                                  ? `${p.name}は「${c}」をまだ所持しています`
                                  : `${p.name}は「${c}」を使用済みです`
                              }
                            >
                              {held ? c : '×'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Number scarcity summary */}
            <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-2.5 text-[11px]">
              <span className="font-bold text-amber-300">🔍 単独確定カード（あなただけが保持）: </span>
              {(() => {
                const uniqueToHuman = humanPlayer.remainingBids.filter((c) =>
                  players.filter((p) => !p.isHuman).every((ai) => !ai.remainingBids.includes(c))
                );
                return uniqueToHuman.length > 0 ? (
                  <span className="font-mono font-black text-emerald-300">
                    {uniqueToHuman.map((c) => `[${c}金貨]`).join(' ')}（バッティング確率 0%！）
                  </span>
                ) : (
                  <span className="text-stone-400">現在なし（AIと所持カードが重なっています）</span>
                );
              })()}
            </div>
          </div>

          {/* Collision Risk & Recommended Bid Analyzer */}
          {showAnalyzer && !isMatchFinished && !roundResolution && (
            <div className="rounded-2xl border border-emerald-500/30 bg-[#111c17]/95 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-emerald-400/20 pb-2">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                    COLLISION RISK &amp; EV ANALYZER
                  </span>
                  <h3 className="text-sm font-black text-white">
                    🧠 バッティング確率＆推奨入札アナライザー
                  </h3>
                </div>
              </div>

              <div className="mt-2.5 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {[...bidRecommendations]
                  .sort((a, b) => b.expectedNetGain - a.expectedNetGain)
                  .slice(0, 5)
                  .map((rec, i) => (
                    <button
                      key={rec.bid}
                      type="button"
                      onClick={() => {
                        playSound('coin');
                        setSelectedBid(rec.bid);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
                        selectedBid === rec.bid
                          ? 'border-amber-300 bg-amber-500/20'
                          : i === 0
                            ? 'border-emerald-400/45 bg-emerald-950/40 hover:bg-emerald-900/40'
                            : 'border-white/10 bg-black/30 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-amber-300">
                            {rec.bid} ソヴリン金貨
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                              i === 0
                                ? 'bg-emerald-400 text-stone-950'
                                : 'bg-white/10 text-amber-100'
                            }`}
                          >
                            {rec.tag}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-stone-300">{rec.reason}</p>
                      </div>
                      <div className="shrink-0 pl-2 text-right font-mono text-[11px]">
                        <div className="font-black text-emerald-300">
                          {isCurrentScrap ? `被弾 ${rec.winProbability}%` : `勝率 ${rec.winProbability}%`}
                        </div>
                        <div className="text-rose-300">被り {rec.collisionRisk}%</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Round History Log */}
          <div className="rounded-2xl border border-amber-500/25 bg-[#19120b]/95 p-4 shadow-lg">
            <h3 className="text-sm font-black text-amber-200">📜 競売ラウンド履歴</h3>
            <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-xs text-stone-500">
                  まだ履歴はありません。第1ラウンドの入札を開始してください。
                </p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.round}
                    className="rounded-xl border border-white/10 bg-black/35 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-200">
                      <span>
                        R{h.round}: {h.lotsAtStake.map((l) => l.name).join(' ＋ ')}
                      </span>
                      <span className="font-mono text-[11px] text-amber-300">
                        {h.isCarryOver ? '全員相殺' : `${h.winnerName} (${h.winningBid}金貨)`}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                      {h.entries.map((e) => (
                        <span
                          key={e.playerId}
                          className={`rounded px-1.5 py-0.5 font-mono ${
                            e.isWinner
                              ? 'bg-amber-400/25 font-black text-amber-200'
                              : e.isCancelled
                                ? 'bg-rose-950/60 text-rose-300 line-through'
                                : 'bg-white/5 text-stone-400'
                          }`}
                        >
                          {e.playerName.replace('（工房主）', '')}:{e.bid}
                        </span>
                      ))}
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
