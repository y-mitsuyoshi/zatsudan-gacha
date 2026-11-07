'use client';

import type { CharId } from './characters';

/** Persistent player profile, zero-PII account identity, rank progression & poker analytics. */

export type PositionId = 'BTN' | 'SB' | 'BB' | 'UTG' | 'MP' | 'CO';

export interface PositionStat {
  played: number;
  won: number;
  netBb: number;
}

export interface RecentHandRecord {
  id: string;
  handNumber: number;
  mode: string;
  position: PositionId;
  holeCards: string[];
  board: string[];
  handName: string;
  potTotal: number;
  netChips: number;
  bigBlind: number;
  won: boolean;
  wentToShowdown: boolean;
  isOnline?: boolean;
  timestamp: number;
}

export interface HoldemSettings {
  masterVolume: number; // 0..1
  bgmVolume: number; // 0..1
  seVolume: number; // 0..1
  voiceVolume: number; // 0..1
  voiceOn: boolean;
  /** AI thinking speed */
  speed: 'slow' | 'normal' | 'fast';
  /** show equity / outs HUD */
  showHud: boolean;
  /** squeeze (peel) hole cards at deal */
  squeeze: boolean;
  /** reduce motion / effects */
  reducedFx: boolean;
}

export interface HoldemStats {
  handsPlayed: number;
  handsWon: number;
  showdownsWon: number;
  wentToShowdownHands: number;
  flopSeenHands: number;
  vpipHands: number;
  pfrHands: number;
  threeBetHands: number;
  threeBetOpportunities: number;
  totalBetsAndRaises: number;
  totalCalls: number;
  biggestPot: number;
  bestHandCategory: number; // -1 if none
  bestHandName: string;
  sessions: number;
  tournamentsWon: number;
  allInCount: number;
  allInWins: number;
  onlineHandsPlayed: number;
  onlineHandsWon: number;
  onlineMatchesPlayed: number;
  onlineMatchesWon: number;
  totalNetBb: number;
  bbHistory: number[];
  handCategoryCounts: Record<string, number>;
  positionStats: Record<PositionId, PositionStat>;
}

export interface HoldemProfile {
  version: 1;
  /** Zero-PII anonymous Player ID (e.g. RFN-4829-7310) */
  accountId: string;
  /** Secret device token for cloud persistence */
  accountSecret: string;
  /** User-facing Transfer Passcode (引き継ぎコード, e.g. K7M9-P2Q4) */
  transferCode: string;
  playerName: string;
  equippedTitle: string;
  partner: CharId;
  /** total rank points (see computeRank) */
  rankPoints: number;
  /** highest rank points ever reached */
  highestRankPoints: number;
  /** current hand/session win streak */
  winStreak: number;
  maxWinStreak: number;
  /** demotion shield charges when at tier floor */
  demotionShield: number;
  /** lounge coins (meta currency, earned by playing) */
  coins: number;
  /** affection points per character */
  affection: Record<CharId, number>;
  stats: HoldemStats;
  recentHands: RecentHandRecord[];
  settings: HoldemSettings;
  lastSyncedAt?: number;
}

const KEY = 'royal-flush-night-profile-v1';

export const POSITIONS: PositionId[] = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];

export const HAND_CATEGORY_NAMES_JA: Record<number, string> = {
  0: 'ハイカード',
  1: 'ワンペア',
  2: 'ツーペア',
  3: 'スリーカード',
  4: 'ストレート',
  5: 'フラッシュ',
  6: 'フルハウス',
  7: 'フォーカード',
  8: 'ストレートフラッシュ',
  9: 'ロイヤルフラッシュ',
};

function randomCode(len: number, alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'): string {
  const n = alphabet.length;
  let out = '';
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    // Rejection sampling over CSPRNG bytes to eliminate modulo bias
    const maxUnbiased = Math.floor(256 / n) * n;
    const buf = new Uint8Array(len * 2);
    while (out.length < len) {
      cryptoObj.getRandomValues(buf);
      for (let i = 0; i < buf.length && out.length < len; i++) {
        if (buf[i] < maxUnbiased) {
          out += alphabet[buf[i] % n];
        }
      }
    }
    return out;
  }
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * n)];
  }
  return out;
}

/**
 * Scrubs accidental PII (emails, phone numbers, URLs, long digit IDs) and HTML/control chars
 * from user-entered display names or short strings.
 */
export function scrubPiiText(raw: unknown, fallback = 'あなた', maxLen = 12): string {
  if (typeof raw !== 'string') return fallback;
  let s = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>'"&`]/g, '')
    .trim();
  if (!s) return fallback;
  // Detect and reject email addresses, URLs, or phone-number-like digit sequences
  if (
    /\S+@\S+\.\S+/.test(s) ||
    /https?:\/\/|www\./i.test(s) ||
    /\d[\d\-\s()]{7,}\d/.test(s)
  ) {
    return fallback;
  }
  s = Array.from(s).slice(0, maxLen).join('').trim();
  return s || fallback;
}

export function generateAccountId(): string {
  return `RFN-${randomCode(4, '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ')}-${randomCode(4, '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ')}`;
}

export function generateTransferCode(): string {
  return `${randomCode(4)}-${randomCode(4)}`;
}

export function generateAccountSecret(): string {
  return `${randomCode(12)}-${randomCode(12)}`;
}

export const DEFAULT_SETTINGS: HoldemSettings = {
  masterVolume: 0.8,
  bgmVolume: 0.55,
  seVolume: 0.8,
  voiceVolume: 0.9,
  voiceOn: true,
  speed: 'normal',
  showHud: true,
  squeeze: false,
  reducedFx: false,
};

export function defaultPositionStats(): Record<PositionId, PositionStat> {
  return {
    BTN: { played: 0, won: 0, netBb: 0 },
    SB: { played: 0, won: 0, netBb: 0 },
    BB: { played: 0, won: 0, netBb: 0 },
    UTG: { played: 0, won: 0, netBb: 0 },
    MP: { played: 0, won: 0, netBb: 0 },
    CO: { played: 0, won: 0, netBb: 0 },
  };
}

export function defaultStats(): HoldemStats {
  return {
    handsPlayed: 0,
    handsWon: 0,
    showdownsWon: 0,
    wentToShowdownHands: 0,
    flopSeenHands: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBetHands: 0,
    threeBetOpportunities: 0,
    totalBetsAndRaises: 0,
    totalCalls: 0,
    biggestPot: 0,
    bestHandCategory: -1,
    bestHandName: '',
    sessions: 0,
    tournamentsWon: 0,
    allInCount: 0,
    allInWins: 0,
    onlineHandsPlayed: 0,
    onlineHandsWon: 0,
    onlineMatchesPlayed: 0,
    onlineMatchesWon: 0,
    totalNetBb: 0,
    bbHistory: [0],
    handCategoryCounts: {},
    positionStats: defaultPositionStats(),
  };
}

export function defaultProfile(): HoldemProfile {
  return {
    version: 1,
    accountId: generateAccountId(),
    accountSecret: generateAccountSecret(),
    transferCode: generateTransferCode(),
    playerName: 'あなた',
    equippedTitle: 'ロイヤルラウンジの挑戦者',
    partner: 'karen',
    rankPoints: 0,
    highestRankPoints: 0,
    winStreak: 0,
    maxWinStreak: 0,
    demotionShield: 1,
    coins: 3000,
    affection: {
      karen: 0,
      rei: 0,
      koharu: 0,
      valentina: 0,
      jin: 0,
      luna: 0,
      sakura: 0,
      alice: 0,
      leon: 0,
      chloe: 0,
      hibiki: 0,
      suou: 0,
    },
    stats: defaultStats(),
    recentHands: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function normalizeProfile(parsed: Partial<HoldemProfile>): HoldemProfile {
  const base = defaultProfile();
  const rawStats: Partial<HoldemStats> = parsed.stats ?? {};
  const posBase = defaultPositionStats();
  const mergedPos: Record<PositionId, PositionStat> = { ...posBase };
  if (rawStats.positionStats) {
    for (const pos of POSITIONS) {
      if (rawStats.positionStats[pos]) {
        mergedPos[pos] = {
          played: Number(rawStats.positionStats[pos].played) || 0,
          won: Number(rawStats.positionStats[pos].won) || 0,
          netBb: Number(rawStats.positionStats[pos].netBb) || 0,
        };
      }
    }
  }
  const rankPoints = Math.max(0, Number(parsed.rankPoints) || 0);
  const highestRankPoints = Math.max(rankPoints, Number(parsed.highestRankPoints) || 0);
  return {
    ...base,
    ...parsed,
    playerName: scrubPiiText(parsed.playerName, base.playerName, 12),
    accountId:
      typeof parsed.accountId === 'string' && /^RFN-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(parsed.accountId)
        ? parsed.accountId
        : base.accountId,
    accountSecret:
      typeof parsed.accountSecret === 'string' && parsed.accountSecret.length >= 8
        ? parsed.accountSecret
        : base.accountSecret,
    transferCode:
      typeof parsed.transferCode === 'string' && parsed.transferCode.length >= 6
        ? parsed.transferCode
        : base.transferCode,
    equippedTitle:
      typeof parsed.equippedTitle === 'string' && parsed.equippedTitle.length > 0
        ? parsed.equippedTitle
        : base.equippedTitle,
    rankPoints,
    highestRankPoints,
    winStreak: Math.max(0, Number(parsed.winStreak) || 0),
    maxWinStreak: Math.max(0, Number(parsed.maxWinStreak) || 0),
    demotionShield:
      typeof parsed.demotionShield === 'number' ? Math.max(0, parsed.demotionShield) : base.demotionShield,
    affection: { ...base.affection, ...(parsed.affection ?? {}) },
    stats: {
      ...base.stats,
      ...rawStats,
      bbHistory:
        Array.isArray(rawStats.bbHistory) && rawStats.bbHistory.length > 0
          ? rawStats.bbHistory.slice(-30)
          : [0],
      handCategoryCounts: { ...(rawStats.handCategoryCounts ?? {}) },
      positionStats: mergedPos,
    },
    recentHands: Array.isArray(parsed.recentHands) ? parsed.recentHands.slice(0, 20) : [],
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
    version: 1,
  };
}

export function loadProfile(): HoldemProfile {
  if (typeof window === 'undefined') return defaultProfile();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const fresh = defaultProfile();
      window.localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<HoldemProfile>;
    const normalized = normalizeProfile(parsed);
    // Persist back if accountId or transferCode was generated for an older profile
    if (!parsed.accountId || !parsed.transferCode || !parsed.accountSecret) {
      window.localStorage.setItem(KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: HoldemProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const safe = {
      ...p,
      playerName: scrubPiiText(p.playerName, 'あなた', 12),
    };
    window.localStorage.setItem(KEY, JSON.stringify(safe));
  } catch {
    // storage full / disabled: ignore
  }
}

// ---------------------------------------------------------------------------
// Rank system: Bronze → Silver → Gold → Platinum → Diamond → Royal → Legend
// ---------------------------------------------------------------------------

export interface RankTier {
  id: string;
  name: string;
  nameEn: string;
  /** points needed to enter this tier */
  min: number;
  /** points span per star (3 stars per tier) */
  span: number;
  color: string;
  gradient: string;
  icon: string;
  /** description of tier prestige */
  perk: string;
}

export const RANK_TIERS: RankTier[] = [
  { id: 'bronze', name: 'ブロンズ', nameEn: 'BRONZE', min: 0, span: 60, color: '#d97706', gradient: 'from-amber-700 via-orange-600 to-amber-900', icon: '♣', perk: '入門テーブル解放・降格なし' },
  { id: 'silver', name: 'シルバー', nameEn: 'SILVER', min: 180, span: 100, color: '#cbd5e1', gradient: 'from-slate-300 via-slate-400 to-slate-600', icon: '♦', perk: '称号「シルバー・タクティシャン」解放' },
  { id: 'gold', name: 'ゴールド', nameEn: 'GOLD', min: 480, span: 150, color: '#fbbf24', gradient: 'from-yellow-300 via-amber-400 to-yellow-600', icon: '♥', perk: '称号「ゴールド・シャーク」＆昇格シールド付与' },
  { id: 'platinum', name: 'プラチナ', nameEn: 'PLATINUM', min: 930, span: 220, color: '#5eead4', gradient: 'from-teal-200 via-cyan-300 to-teal-500', icon: '♠', perk: '翼付きプラチナクレスト＆称号「プラチナ・ハイローラー」解放' },
  { id: 'diamond', name: 'ダイヤモンド', nameEn: 'DIAMOND', min: 1590, span: 300, color: '#93c5fd', gradient: 'from-sky-300 via-blue-400 to-indigo-500', icon: '◆', perk: '称号「ダイヤモンド・マエストロ」解放' },
  { id: 'royal', name: 'ロイヤル', nameEn: 'ROYAL', min: 2490, span: 420, color: '#e879f9', gradient: 'from-fuchsia-400 via-purple-500 to-amber-400', icon: '♛', perk: '王冠クレスト＆称号「ロイヤル・クラウン」解放' },
  { id: 'legend', name: 'レジェンド', nameEn: 'LEGEND', min: 3750, span: 99999, color: '#fde047', gradient: 'from-yellow-200 via-rose-300 to-violet-400', icon: '★', perk: '最高峰称号「レジェンド・オーバーロード」解放' },
];

export interface RankInfo {
  tier: RankTier;
  tierIndex: number;
  /** 1..3 (legend is always 1) */
  stars: number;
  /** Roman numeral division I / II / III */
  divisionRoman: string;
  label: string;
  /** progress within current star 0..1 */
  progress: number;
  pointsToNext: number;
  /** points needed to reach the next full Tier (e.g. Gold -> Platinum) */
  pointsToNextTier: number;
  nextTierName: string | null;
  /** true when on 3rd star and >= 75% to next tier */
  isPromotionZone: boolean;
}

const ROMAN = ['I', 'II', 'III'] as const;

export function computeRank(points: number): RankInfo {
  const safePts = Math.max(0, Math.floor(points));
  let tierIndex = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (safePts >= RANK_TIERS[i].min) tierIndex = i;
  }
  const tier = RANK_TIERS[tierIndex];
  const nextTier = RANK_TIERS[tierIndex + 1] ?? null;
  if (tier.id === 'legend') {
    return {
      tier,
      tierIndex,
      stars: 1,
      divisionRoman: '★',
      label: `${tier.name}`,
      progress: 1,
      pointsToNext: 0,
      pointsToNextTier: 0,
      nextTierName: null,
      isPromotionZone: false,
    };
  }
  const within = safePts - tier.min;
  const stars = Math.min(3, Math.floor(within / tier.span) + 1);
  const starBase = (stars - 1) * tier.span;
  const progress = Math.min(1, (within - starBase) / tier.span);
  const pointsToNext = Math.max(0, tier.span - (within - starBase));
  const pointsToNextTier = nextTier ? Math.max(0, nextTier.min - safePts) : 0;
  const divisionRoman = ROMAN[stars - 1] ?? 'I';
  return {
    tier,
    tierIndex,
    stars,
    divisionRoman,
    label: `${tier.name} ★${stars}`,
    progress,
    pointsToNext,
    pointsToNextTier,
    nextTierName: nextTier ? nextTier.name : null,
    isPromotionZone: stars === 3 && progress >= 0.7,
  };
}

// ---------------------------------------------------------------------------
// Unlockable Titles (称号システム)
// ---------------------------------------------------------------------------

export interface TitleDef {
  id: string;
  title: string;
  condition: string;
  unlocked: (p: HoldemProfile) => boolean;
}

export const PROFILE_TITLES: TitleDef[] = [
  {
    id: 'starter',
    title: 'ロイヤルラウンジの挑戦者',
    condition: '初期称号',
    unlocked: () => true,
  },
  {
    id: 'silver',
    title: 'シルバー・タクティシャン',
    condition: 'シルバーランク到達',
    unlocked: (p) => p.highestRankPoints >= 180,
  },
  {
    id: 'gold',
    title: 'ゴールド・シャーク',
    condition: 'ゴールドランク到達',
    unlocked: (p) => p.highestRankPoints >= 480,
  },
  {
    id: 'platinum',
    title: 'プラチナ・ハイローラー',
    condition: 'プラチナランク到達',
    unlocked: (p) => p.highestRankPoints >= 930,
  },
  {
    id: 'diamond',
    title: 'ダイヤモンド・マエストロ',
    condition: 'ダイヤモンドランク到達',
    unlocked: (p) => p.highestRankPoints >= 1590,
  },
  {
    id: 'royal',
    title: 'ロイヤル・クラウン',
    condition: 'ロイヤルランク到達',
    unlocked: (p) => p.highestRankPoints >= 2490,
  },
  {
    id: 'legend',
    title: 'レジェンド・オーバーロード',
    condition: 'レジェンドランク到達',
    unlocked: (p) => p.highestRankPoints >= 3750,
  },
  {
    id: 'allin',
    title: '不敵なるオールインの覇者',
    condition: 'オールイン勝利 5回以上',
    unlocked: (p) => p.stats.allInWins >= 5,
  },
  {
    id: 'veteran',
    title: '百戦錬磨の勝負師',
    condition: '累計100ハンド以上プレイ',
    unlocked: (p) => p.stats.handsPlayed >= 100,
  },
  {
    id: 'champion',
    title: 'ミッドナイト・チャンピオン',
    condition: 'トーナメント優勝 1回以上',
    unlocked: (p) => p.stats.tournamentsWon >= 1,
  },
  {
    id: 'online',
    title: 'ワールド・ラウンジ・プレイヤー',
    condition: 'オンライン対局をプレイ',
    unlocked: (p) => p.stats.onlineHandsPlayed >= 1,
  },
];

// ---------------------------------------------------------------------------
// Poker Analytics & Playstyle Radar Diagnosis
// ---------------------------------------------------------------------------

export interface ComputedPokerMetrics {
  winRate: number; // %
  vpip: number; // %
  pfr: number; // %
  threeBet: number; // %
  af: number; // ratio
  wtsd: number; // %
  wsd: number; // %
  allInWinRate: number; // %
  bbPer100: number;
  styleCode: 'TAG' | 'LAG' | 'ROCK' | 'STATION' | 'BALANCED' | 'ROOKIE';
  styleName: string;
  styleBadgeColor: string;
  styleSummary: string;
  radar: { label: string; short: string; value: number }[];
}

export function computePokerMetrics(stats: HoldemStats): ComputedPokerMetrics {
  const hp = stats.handsPlayed;
  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

  const winRate = pct(stats.handsWon, hp);
  // If an older profile has handsPlayed > 0 but vpipHands === 0, infer sensible baseline from handsWon
  const vpipRaw = stats.vpipHands > 0 ? pct(stats.vpipHands, hp) : hp > 0 ? Math.min(85, Math.max(18, Math.round(winRate * 1.45 * 10) / 10)) : 0;
  const pfrRaw = stats.pfrHands > 0 ? pct(stats.pfrHands, hp) : hp > 0 ? Math.min(vpipRaw, Math.round(vpipRaw * 0.68 * 10) / 10) : 0;
  const threeBet = stats.threeBetOpportunities > 0 ? pct(stats.threeBetHands, stats.threeBetOpportunities) : hp > 0 ? Math.round(pfrRaw * 0.35 * 10) / 10 : 0;
  const af =
    stats.totalBetsAndRaises > 0 || stats.totalCalls > 0
      ? Math.round((stats.totalBetsAndRaises / Math.max(1, stats.totalCalls)) * 100) / 100
      : hp > 0
        ? 1.85
        : 0;
  const flopDen = Math.max(stats.flopSeenHands, stats.wentToShowdownHands);
  const wtsd = flopDen > 0 ? pct(stats.wentToShowdownHands, flopDen) : hp > 0 ? 32.0 : 0;
  const wsdDen = Math.max(stats.wentToShowdownHands, stats.showdownsWon);
  const wsd = wsdDen > 0 ? pct(stats.showdownsWon, wsdDen) : hp > 0 ? 52.0 : 0;
  const allInDen = Math.max(stats.allInCount, stats.allInWins);
  const allInWinRate = allInDen > 0 ? pct(stats.allInWins, allInDen) : 0;
  const bbPer100 = hp > 0 ? Math.round((stats.totalNetBb / hp) * 100 * 10) / 10 : 0;

  let styleCode: ComputedPokerMetrics['styleCode'] = 'ROOKIE';
  let styleName = 'ニューカマー（データ収集中）';
  let styleBadgeColor = '#94a3b8';
  let styleSummary = 'ハンドを重ねると、あなたのVPIP・PFR・アグレッションからプレイスタイルを精密診断します。';

  if (hp >= 5) {
    if (vpipRaw <= 28 && (pfrRaw >= 15 || af >= 1.8)) {
      styleCode = 'TAG';
      styleName = 'TAG（タイト・アグレッシブ）';
      styleBadgeColor = '#34d399';
      styleSummary = '厳選した強いハンドで主導権を握り、鋭いベット＆レイズでポットを制圧する王道プロフェッショナル型です。';
    } else if (vpipRaw > 28 && (pfrRaw >= 18 || af >= 2.0)) {
      styleCode = 'LAG';
      styleName = 'LAG（ルース・アグレッシブ）';
      styleBadgeColor = '#f43f5e';
      styleSummary = '幅広いレンジから積極的にプレッシャーをかけ、ブラフとバリューを織り交ぜて相手を翻弄する実戦派スタイルです。';
    } else if (vpipRaw <= 24 && af < 1.8) {
      styleCode = 'ROCK';
      styleName = 'ロック（堅実・鉄壁派）';
      styleBadgeColor = '#60a5fa';
      styleSummary = 'プレミアムハンドを中心に手堅く立ち回り、無駄な失点を最小限に抑えるディフェンシブ・スタイルです。';
    } else if (vpipRaw > 34 && af < 1.5) {
      styleCode = 'STATION';
      styleName = 'コーリング・ハンター（コール主体）';
      styleBadgeColor = '#fbbf24';
      styleSummary = '多くのフロップを見に行き、ショーダウンまで粘り強く相手のブラフをキャッチするスタイルです。レイズ比率を高めるとさらに勝率が伸びます。';
    } else {
      styleCode = 'BALANCED';
      styleName = 'バランス型オールラウンダー';
      styleBadgeColor = '#c084fc';
      styleSummary = '参加率と攻撃性のバランスが取れた柔軟なスタイルです。テーブル状況に応じた対応力に優れています。';
    }
  }

  const clamp100 = (n: number) => Math.max(12, Math.min(100, Math.round(n)));
  const radar = [
    { label: '参加率 (VPIP)', short: '参加率', value: hp > 0 ? clamp100((vpipRaw / 55) * 100) : 40 },
    { label: '先制力 (PFR)', short: '先制力', value: hp > 0 ? clamp100((pfrRaw / 40) * 100) : 40 },
    { label: '攻撃性 (AF)', short: '攻撃性', value: hp > 0 ? clamp100((af / 3.5) * 100) : 40 },
    { label: 'SD勝率 (W$SD)', short: '勝負強さ', value: hp > 0 ? clamp100(wsd) : 50 },
    { label: '粘り強さ (WTSD)', short: '粘り強さ', value: hp > 0 ? clamp100((wtsd / 60) * 100) : 45 },
    { label: '収支安定度', short: '収支力', value: hp > 0 ? clamp100(55 + bbPer100 * 0.8) : 50 },
  ];

  return {
    winRate,
    vpip: vpipRaw,
    pfr: pfrRaw,
    threeBet,
    af,
    wtsd,
    wsd,
    allInWinRate,
    bbPer100,
    styleCode,
    styleName,
    styleBadgeColor,
    styleSummary,
    radar,
  };
}

// Affection (親密度) levels
export const AFFECTION_LEVEL_STEP = 120;
export function affectionLevel(points: number): { level: number; progress: number } {
  const level = Math.min(10, Math.floor(points / AFFECTION_LEVEL_STEP) + 1);
  const progress = level >= 10 ? 1 : (points % AFFECTION_LEVEL_STEP) / AFFECTION_LEVEL_STEP;
  return { level, progress };
}
