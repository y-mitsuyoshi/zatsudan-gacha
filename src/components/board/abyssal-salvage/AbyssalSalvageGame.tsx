'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// ============================================================================
// Types & Constants
// ============================================================================

export type HazardType = 'thermal' | 'jellyfish' | 'collapse' | 'vortex' | 'magnetic';

export interface HazardMeta {
  type: HazardType;
  name: string;
  subtitle: string;
  color: string;
  border: string;
  bg: string;
}

export const HAZARDS: Record<HazardType, HazardMeta> = {
  thermal: {
    type: 'thermal',
    name: '熱水噴出',
    subtitle: '超高温ブラックスモーカー',
    color: '#fb7185',
    border: 'border-[#9f4540]/60',
    bg: 'from-rose-950/80 to-orange-950/60',
  },
  jellyfish: {
    type: 'jellyfish',
    name: '巨大発光クラゲ',
    subtitle: '生体神経パルス放電',
    color: '#c084fc',
    border: 'border-[#6a4a66]/60',
    bg: 'from-purple-950/80 to-fuchsia-950/60',
  },
  collapse: {
    type: 'collapse',
    name: '海溝崩落',
    subtitle: '深海プレート地滑り',
    color: '#fbbf24',
    border: 'border-[var(--table-line-strong)]/60',
    bg: 'from-amber-950/80 to-yellow-950/60',
  },
  vortex: {
    type: 'vortex',
    name: '強潮流渦',
    subtitle: '乱流メイルシュトローム',
    color: '#38bdf8',
    border: 'border-[#3f5f78]/60',
    bg: 'from-sky-950/80 to-blue-950/60',
  },
  magnetic: {
    type: 'magnetic',
    name: '高圧磁気嵐',
    subtitle: '地磁気異常・計器狂い',
    color: '#34d399',
    border: 'border-[#315d4e]/60',
    bg: 'from-emerald-950/80 to-teal-950/60',
  },
};

export const HAZARD_ORDER: HazardType[] = ['thermal', 'jellyfish', 'collapse', 'vortex', 'magnetic'];

export type CardKind = 'relic' | 'core' | 'hazard';

export interface AbyssalCard {
  id: string;
  kind: CardKind;
  name: string;
  value: number; // 3..17 for relic, 5/8/12 for core, 0 for hazard
  hazardType?: HazardType;
  remainderOnPath: number; // uncollected points sitting on this card
  coreAvailable: boolean; // true if solo-retreat bonus core is still on path
}

export type DiverAction = 'dive' | 'return';
export type DiverStatus = 'diving' | 'returning' | 'docked' | 'aborted';

export interface DiverPilot {
  id: string;
  name: string;
  roleTitle: string;
  isHuman: boolean;
  personality: 'human' | 'cautious' | 'greedy' | 'analyst';
  accent: string;
  badgeBg: string;
  vaultScore: number; // safely banked in submarine vault
  bagScore: number; // unbanked points in current dive
  status: DiverStatus;
  lastDecision?: DiverAction;
  thoughtText: string;
  roundHistory: number[];
}

export type GamePhase =
  | 'ready' // Ready to start Dive 1 or choose decision at depth
  | 'deciding' // Waiting for player decision (dive deeper vs return to sub)
  | 'roundEnd' // Summary of finished dive (all returned or emergency abort)
  | 'gameOver'; // Final results after Dive 3

const RELIC_BLUEPRINTS: { value: number; name: string }[] = [
  { value: 3, name: '古代サンゴの石板' },
  { value: 4, name: '沈没船の青銅羅針盤' },
  { value: 5, name: '発光水晶のクラスター' },
  { value: 7, name: '深海神殿の黄金貨' },
  { value: 7, name: '紺碧の星辰アストロラーベ' },
  { value: 9, name: '黒曜石の海神レリーフ' },
  { value: 11, name: 'オリハルコン合金インゴット' },
  { value: 11, name: '深淵王の蒼玉ゴブレット' },
  { value: 13, name: '超古代文明の記憶結晶' },
  { value: 14, name: '白金製クロノメーター' },
  { value: 15, name: '海溝祭壇の秘宝冠' },
  { value: 17, name: '深海神殿のアーク聖櫃' },
];

const CORE_BY_DIVE: Record<number, { value: number; name: string }> = {
  1: { value: 5, name: '単独帰還ボーナス：古代コア α' },
  2: { value: 8, name: '単独帰還ボーナス：古代コア β' },
  3: { value: 12, name: '単独帰還ボーナス：古代コア Ω' },
};

const TOTAL_DIVES = 3;

function createInitialPilots(): DiverPilot[] {
  return [
    {
      id: 'player',
      name: 'あなた',
      roleTitle: '主席サルベージ操縦士',
      isHuman: true,
      personality: 'human',
      accent: '#22d3ee',
      badgeBg: 'bg-[#3f5f78]/18 text-[#9db8c8] border-[#3f5f78]/40',
      vaultScore: 0,
      bagScore: 0,
      status: 'diving',
      thoughtText: 'ソナー稼働中。潜行か帰還かを判断せよ。',
      roundHistory: [],
    },
    {
      id: 'cautious',
      name: 'ミオ',
      roleTitle: '慎重派ナビゲーター',
      isHuman: false,
      personality: 'cautious',
      accent: '#34d399',
      badgeBg: 'bg-[#315d4e]/22 text-[#9dc4af] border-[#315d4e]/40',
      vaultScore: 0,
      bagScore: 0,
      status: 'diving',
      thoughtText: '安全第一。警報が増えたら早めに母艦へ戻ります。',
      roundHistory: [],
    },
    {
      id: 'greedy',
      name: 'ガルド',
      roleTitle: '強欲トレジャーハンター',
      isHuman: false,
      personality: 'greedy',
      accent: '#fbbf24',
      badgeBg: 'bg-[#c99555]/16 text-[var(--table-accent-strong)] border-[var(--table-line-strong)]/40',
      vaultScore: 0,
      bagScore: 0,
      status: 'diving',
      thoughtText: '深層の大型遺物と単独コアこそ真の獲物だ！',
      roundHistory: [],
    },
    {
      id: 'analyst',
      name: 'ケイ',
      roleTitle: '確率計算アナリスト',
      isHuman: false,
      personality: 'analyst',
      accent: '#a78bfa',
      badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
      vaultScore: 0,
      bagScore: 0,
      status: 'diving',
      thoughtText: '残存デッキ期待値とバースト確率を常時演算中。',
      roundHistory: [],
    },
  ];
}

function buildMasterDeck(): AbyssalCard[] {
  const cards: AbyssalCard[] = [];
  RELIC_BLUEPRINTS.forEach((r, idx) => {
    cards.push({
      id: `relic-${idx + 1}`,
      kind: 'relic',
      name: r.name,
      value: r.value,
      remainderOnPath: 0,
      coreAvailable: false,
    });
  });

  HAZARD_ORDER.forEach((hType) => {
    for (let copy = 1; copy <= 3; copy++) {
      cards.push({
        id: `hazard-${hType}-${copy}`,
        kind: 'hazard',
        name: HAZARDS[hType].name,
        value: 0,
        hazardType: hType,
        remainderOnPath: 0,
        coreAvailable: false,
      });
    }
  });

  return cards;
}

function shuffleCards<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// ============================================================================
// Web Audio Synthesizer (Deep-Ocean Sonar & Bubbles)
// ============================================================================

class SonarAudioEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playSonarPing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  playRelicChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.1, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.35);
    });
  }

  playWarningBeep() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [320, 260].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.11, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.25);
    });
  }

  playEmergencyAbort() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now + i * 0.18);
      osc.frequency.linearRampToValueAtTime(170, now + i * 0.18 + 0.16);
      gain.gain.setValueAtTime(0.14, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.17);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.18);
    }
  }

  playVaultLock() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.11, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.3);
    });
  }
}

// ============================================================================
// Custom SVG Artwork Components
// ============================================================================

function CardArtworkSvg({ card, isFatal }: { card: AbyssalCard; isFatal?: boolean }) {
  if (card.kind === 'core') {
    return (
      <svg viewBox="0 0 80 80" className="w-12 h-12 mx-auto drop-">
        <defs>
          <radialGradient id={`coreGrad-${card.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
        </defs>
        <polygon
          points="40,6 68,22 68,58 40,74 12,58 12,22"
          fill={`url(#coreGrad-${card.id})`}
          stroke="#fde047"
          strokeWidth="2.5"
        />
        <circle cx="40" cy="40" r="14" fill="#fffbeb" opacity="0.9" />
        <path d="M40 16 L40 64 M18 28 L62 52 M62 28 L18 52" stroke="#fef08a" strokeWidth="1.6" opacity="0.75" />
      </svg>
    );
  }

  if (card.kind === 'relic') {
    return (
      <svg viewBox="0 0 80 80" className="w-12 h-12 mx-auto drop-">
        <defs>
          <linearGradient id={`relicGrad-${card.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        <polygon
          points="40,8 66,30 56,68 24,68 14,30"
          fill={`url(#relicGrad-${card.id})`}
          stroke="#a5f3fc"
          strokeWidth="2"
        />
        <polygon points="40,16 56,32 40,60 24,32" fill="#cffafe" opacity="0.45" />
        <circle cx="40" cy="34" r="5" fill="#ecfeff" />
      </svg>
    );
  }

  // Hazard card artwork
  const hType = card.hazardType || 'thermal';
  const strokeColor = isFatal ? '#ff2e4c' : HAZARDS[hType].color;

  return (
    <svg viewBox="0 0 80 80" className="w-12 h-12 mx-auto">
      {hType === 'thermal' && (
        <g stroke={strokeColor} strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M20 66 L32 42 L48 42 L60 66 Z" fill="rgba(244,63,94,0.25)" />
          <path d="M34 36 C30 26, 42 22, 36 12" />
          <path d="M46 36 C42 26, 54 22, 48 12" />
          <circle cx="40" cy="24" r="3" fill={strokeColor} />
        </g>
      )}
      {hType === 'jellyfish' && (
        <g stroke={strokeColor} strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M18 38 C18 16, 62 16, 62 38 Z" fill="rgba(192,132,252,0.25)" />
          <path d="M26 38 C24 50, 30 58, 25 68" />
          <path d="M36 38 C36 50, 42 58, 38 70" />
          <path d="M46 38 C46 50, 40 58, 45 70" />
          <path d="M54 38 C56 50, 50 58, 55 68" />
        </g>
      )}
      {hType === 'collapse' && (
        <g stroke={strokeColor} strokeWidth="2.5" fill="rgba(251,191,36,0.22)" strokeLinejoin="round">
          <polygon points="18,62 30,38 44,46 38,64" />
          <polygon points="42,58 52,32 66,44 58,64" />
          <polygon points="28,28 40,14 50,24 38,34" />
        </g>
      )}
      {hType === 'vortex' && (
        <g stroke={strokeColor} strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M40 40 m-4 0 a 4 4 0 1 0 8 0 a 8 8 0 1 0 -16 0 a 14 14 0 1 0 28 0 a 21 21 0 1 0 -42 0" />
        </g>
      )}
      {hType === 'magnetic' && (
        <g stroke={strokeColor} strokeWidth="2.5" fill="none" strokeLinejoin="round">
          <polygon points="44,10 24,42 40,42 34,70 58,36 42,36" fill="rgba(52,211,153,0.25)" />
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// Main Game Component
// ============================================================================

export default function AbyssalSalvageGame() {
  const audioRef = useRef<SonarAudioEngine | null>(null);
  const bgmCtxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const [bgmOn, setBgmOn] = useState(false);

  // Procedural Deep-Sea Submersible Ambient & Sonar Echo BGM
  useEffect(() => {
    if (!bgmOn || typeof window === 'undefined') return undefined;
    let cancelled = false;
    let timerId: number | null = null;
    const chords = [
      [110.0, 164.81, 220.0, 261.63, 329.63], // Am7 deep
      [87.31, 130.81, 174.61, 220.0, 261.63], // Fmaj7 deep
      [98.0, 146.83, 196.0, 246.94, 293.66], // G6 deep
      [82.41, 123.47, 164.81, 196.0, 246.94], // Em7 deep
    ];
    let step = 0;

    const tick = () => {
      if (cancelled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          if (!bgmCtxRef.current) {
            bgmCtxRef.current = new AudioCtx();
          }
          const ctx = bgmCtxRef.current;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const now = ctx.currentTime;
          const chord = chords[step % chords.length];
          chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = idx === 0 ? 'triangle' : 'sine';
            const start = now + idx * 0.32;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(idx === 0 ? 0.022 : 0.01, start + 0.14);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 2.65);
          });
          step += 1;
        }
      } catch {
        // ignore audio errors
      }
      timerId = window.setTimeout(tick, 3000);
    };

    tick();
    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [bgmOn]);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new SonarAudioEngine();
    }
    audioRef.current.muted = muted;
    return audioRef.current;
  }, [muted]);

  // Persistent master deck across 3 dives (triggered 2nd hazard cards get permanently removed!)
  const [masterDeck, setMasterDeck] = useState<AbyssalCard[]>(() => buildMasterDeck());
  const [removedHazards, setRemovedHazards] = useState<HazardType[]>([]);

  // Dive / Round state
  const [currentDive, setCurrentDive] = useState<number>(1);
  const [diveDeck, setDiveDeck] = useState<AbyssalCard[]>([]);
  const [pathCards, setPathCards] = useState<AbyssalCard[]>([]);
  const [pilots, setPilots] = useState<DiverPilot[]>(() => createInitialPilots());
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [abortHazard, setAbortHazard] = useState<HazardType | null>(null);
  const [logs, setLogs] = useState<string[]>([
    '深海探査母艦「ノーチラス・アーク」が海溝直上に到着。全3回の潜水で最も多くの遺物ポイントを母艦金庫へ持ち帰った操縦士が勝利します。',
  ]);
  const [bestRecord, setBestRecord] = useState<number>(0);

  // Load the saved record only after mount so SSR and hydration match.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('abyssal_salvage_best_score');
      if (saved) setBestRecord(parseInt(saved, 10) || 0);
    } catch {
      // localStorage can be unavailable in private browsing modes.
    }
  }, []);

  // Add log message helper
  const pushLog = useCallback((msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 30));
  }, []);

  // Start a specific dive (1..3)
  const startDive = useCallback(
    (diveNumber: number, customMasterDeck?: AbyssalCard[], currentPilots?: DiverPilot[]) => {
      const baseDeck = customMasterDeck ?? masterDeck;
      const coreMeta = CORE_BY_DIVE[diveNumber] || CORE_BY_DIVE[1];
      const coreCard: AbyssalCard = {
        id: `core-dive-${diveNumber}`,
        kind: 'core',
        name: coreMeta.name,
        value: coreMeta.value,
        remainderOnPath: 0,
        coreAvailable: true,
      };

      // Reset card remainders and shuffle with the new Solo-Retreat Core
      const freshDeck = shuffleCards(
        [...baseDeck, coreCard].map((c) => ({
          ...c,
          remainderOnPath: 0,
          coreAvailable: c.kind === 'core',
        }))
      );

      setCurrentDive(diveNumber);
      setDiveDeck(freshDeck);
      setPathCards([]);
      setAbortHazard(null);
      setPhase('deciding');
      setPilots((prev) =>
        (currentPilots ?? prev).map((p) => ({
          ...p,
          bagScore: 0,
          status: 'diving',
          lastDecision: undefined,
          thoughtText:
            p.personality === 'human'
              ? `第${diveNumber}潜水開始。最初の深度へ潜行しますか？`
              : `第${diveNumber}潜水スタンバイ完了。`,
        }))
      );

      getAudio().playSonarPing();
      pushLog(
        ` 【第${diveNumber}潜水 開始】海溝デッキ（全${freshDeck.length}枚）に『${coreMeta.name}（+${coreMeta.value}pt）』が投入されました！`
      );
    },
    [masterDeck, getAudio, pushLog]
  );

  // Full game reset
  const startNewExpedition = useCallback(() => {
    const freshMaster = buildMasterDeck();
    const freshPilots = createInitialPilots();
    setMasterDeck(freshMaster);
    setRemovedHazards([]);
    setLogs(['新たな深海サルベージ作戦を開始しました！全3回の潜水で最高スコアを目指しましょう。']);
    startDive(1, freshMaster, freshPilots);
  }, [startDive]);

  // ============================================================================
  // Real-Time Probability & EV HUD Calculations (`深海ソナー確率アナライザー`)
  // ============================================================================

  const sonarStats = useMemo(() => {
    const activeWarnings = new Set<HazardType>();
    pathCards.forEach((c) => {
      if (c.kind === 'hazard' && c.hazardType) {
        activeWarnings.add(c.hazardType);
      }
    });

    const totalRemaining = diveDeck.length;
    if (totalRemaining === 0) {
      return {
        totalRemaining: 0,
        burstCardsCount: 0,
        burstProbability: 0,
        safeRelicCount: 0,
        safeRelicProbability: 0,
        warningHazardCount: 0,
        pathRemainderTotal: 0,
        pathCoreTotal: 0,
        guaranteedReturnScore: 0,
        expectedContinueBagValue: 0,
        activeDiversCount: 1,
        activeWarnings,
        recommendation: '帰還推奨' as '潜行有利' | '帰還推奨' | '警戒水域',
      };
    }

    const activeDiversCount = Math.max(
      1,
      pilots.filter((p) => p.status === 'diving').length
    );

    let burstCardsCount = 0;
    let safeRelicCount = 0;
    let warningHazardCount = 0;
    let sumRelicShare = 0;

    diveDeck.forEach((c) => {
      if (c.kind === 'hazard' && c.hazardType) {
        if (activeWarnings.has(c.hazardType)) {
          burstCardsCount += 1;
        } else {
          warningHazardCount += 1;
        }
      } else if (c.kind === 'relic') {
        safeRelicCount += 1;
        sumRelicShare += Math.floor(c.value / activeDiversCount);
      } else if (c.kind === 'core') {
        safeRelicCount += 1;
      }
    });

    const burstProbability = (burstCardsCount / totalRemaining) * 100;
    const safeRelicProbability = (safeRelicCount / totalRemaining) * 100;

    const pathRemainderTotal = pathCards.reduce((acc, c) => acc + c.remainderOnPath, 0);
    const pathCoreTotal = pathCards.reduce(
      (acc, c) => acc + (c.kind === 'core' && c.coreAvailable ? c.value : 0),
      0
    );

    const playerPilot = pilots.find((p) => p.isHuman) || pilots[0];
    const currentBag = playerPilot ? playerPilot.bagScore : 0;

    // Guaranteed score if player returns alone right now:
    const soloReturnBonus = pathRemainderTotal + pathCoreTotal;
    const guaranteedReturnScore = currentBag + soloReturnBonus;

    // Expected bag value after 1 more step if diving with activeDiversCount divers:
    // P(survive) * currentBag + E[gain on next card]
    const surviveProb = (totalRemaining - burstCardsCount) / totalRemaining;
    const expectedGainNextStep = sumRelicShare / totalRemaining;
    const expectedContinueBagValue = surviveProb * currentBag + expectedGainNextStep;

    let recommendation: '潜行有利' | '帰還推奨' | '警戒水域' = '潜行有利';
    if (burstProbability >= 25 || (currentBag >= 12 && expectedContinueBagValue < guaranteedReturnScore)) {
      recommendation = '帰還推奨';
    } else if (burstProbability > 0) {
      recommendation = '警戒水域';
    }

    return {
      totalRemaining,
      burstCardsCount,
      burstProbability,
      safeRelicCount,
      safeRelicProbability,
      warningHazardCount,
      pathRemainderTotal,
      pathCoreTotal,
      guaranteedReturnScore,
      expectedContinueBagValue,
      activeDiversCount,
      activeWarnings,
      recommendation,
    };
  }, [diveDeck, pathCards, pilots]);

  // ============================================================================
  // AI Decision Logic for the 3 Rival Submersible Pilots
  // ============================================================================

  const computeAiDecision = useCallback(
    (
      pilot: DiverPilot,
      stats: typeof sonarStats,
      depth: number
    ): { action: DiverAction; reason: string } => {
      // Never return at depth 0 or when there is 0% burst probability AND nothing to gain by returning
      if (stats.burstCardsCount === 0) {
        // Exception: If a huge solo core + remainder is sitting on the path and greedy/analyst wants to snipe it
        if (
          pilot.personality === 'analyst' &&
          stats.pathCoreTotal + stats.pathRemainderTotal >= 14 &&
          depth >= 3
        ) {
          return {
            action: 'return',
            reason: `無警報だが海溝上の単独コア＋端数（計${stats.pathCoreTotal + stats.pathRemainderTotal}pt）の独占期待値が極大。帰還を選択。`,
          };
        }
        return {
          action: 'dive',
          reason: '第1警報が0件（バースト確率0.0%）のため安全に潜行続行。',
        };
      }

      const warningCount = stats.activeWarnings.size;
      const burstPct = stats.burstProbability;
      const potentialSoloSweep = stats.pathRemainderTotal + stats.pathCoreTotal;

      if (pilot.personality === 'cautious') {
        // Cautious Navigator Mio: retreats early when warnings appear and she has decent loot
        if (
          warningCount >= 2 ||
          (warningCount >= 1 && pilot.bagScore >= 7) ||
          burstPct >= 16 ||
          pilot.bagScore + potentialSoloSweep >= 14
        ) {
          return {
            action: 'return',
            reason: `警報${warningCount}種（危険度${burstPct.toFixed(1)}%）。回収済み${pilot.bagScore}ptを確実に母艦へ持ち帰ります！`,
          };
        }
        return {
          action: 'dive',
          reason: `警報${warningCount}種ですがまだ浅層。慎重に次の深度を探査します。`,
        };
      }

      if (pilot.personality === 'greedy') {
        // Greedy Treasure Hunter Gald: pushes deep unless holding a massive bag or huge solo core
        if (
          (warningCount >= 3 && pilot.bagScore >= 16) ||
          pilot.bagScore >= 24 ||
          (stats.pathCoreTotal >= 8 && pilot.bagScore >= 14 && warningCount >= 2)
        ) {
          return {
            action: 'return',
            reason: `これだけ財宝（${pilot.bagScore}pt）を積めば十分だ！母艦へ凱旋するぜ！`,
          };
        }
        return {
          action: 'dive',
          reason: `危険度${burstPct.toFixed(1)}%など恐れるに足らず！さらに深い遺跡の秘宝を狙う！`,
        };
      }

      // Probability Analyst Kei: compares exact EV vs guaranteed return
      const soloAdjustedReturn =
        pilot.bagScore +
        Math.floor(stats.pathRemainderTotal / Math.max(1, stats.activeDiversCount - 1)) +
        (stats.activeDiversCount <= 2 ? stats.pathCoreTotal : Math.floor(stats.pathCoreTotal * 0.4));
      const surviveProb = (100 - burstPct) / 100;
      const evContinue = surviveProb * (pilot.bagScore + 3.2);

      if (evContinue < soloAdjustedReturn && (pilot.bagScore >= 6 || potentialSoloSweep >= 8)) {
        return {
          action: 'return',
          reason: `続行期待値(${evContinue.toFixed(1)}pt) ＜ 帰還回収値(${soloAdjustedReturn.toFixed(1)}pt)。数理最適解により帰還。`,
        };
      }
      return {
        action: 'dive',
        reason: `バースト率${burstPct.toFixed(1)}%。潜行続行の期待値が帰還を上回るため前進。`,
      };
    },
    []
  );

  // ============================================================================
  // Core Step Resolution: Simultaneous Decision (`さらに潜行する` vs `母艦へ帰還する`)
  // ============================================================================

  const handlePlayerDecision = useCallback(
    (playerAction: DiverAction) => {
      if (phase !== 'deciding') return;

      const depth = pathCards.length;
      const decisions = new Map<string, { action: DiverAction; reason: string }>();

      pilots.forEach((p) => {
        if (p.status !== 'diving') return;
        if (p.isHuman) {
          decisions.set(p.id, {
            action: playerAction,
            reason:
              playerAction === 'dive'
                ? `深度${depth + 1}へ潜行を決断！`
                : '母艦への帰還を決断！海溝残留物を回収して浮上します。',
          });
        } else {
          decisions.set(p.id, computeAiDecision(p, sonarStats, depth));
        }
      });

      const returningPilotIds = Array.from(decisions.entries())
        .filter(([, d]) => d.action === 'return')
        .map(([id]) => id);

      const divingPilotIds = Array.from(decisions.entries())
        .filter(([, d]) => d.action === 'dive')
        .map(([id]) => id);

      // 1. Process Retreating Divers (`母艦へ帰還する`)
      let updatedPath = pathCards.map((c) => ({ ...c }));
      let remainderSharePerRetreater = 0;
      let soloCoreClaimed = 0;

      if (returningPilotIds.length > 0) {
        const retCount = returningPilotIds.length;
        updatedPath = updatedPath.map((card) => {
          let nextCard = { ...card };
          if (nextCard.remainderOnPath > 0) {
            const share = Math.floor(nextCard.remainderOnPath / retCount);
            if (share > 0) {
              remainderSharePerRetreater += share;
              nextCard.remainderOnPath = nextCard.remainderOnPath % retCount;
            }
          }
          // Solo-Retreat Bonus Core (`古代コア`) is ONLY claimed if exactly 1 diver retreats alone!
          if (retCount === 1 && nextCard.kind === 'core' && nextCard.coreAvailable) {
            soloCoreClaimed += nextCard.value;
            nextCard = {
              ...nextCard,
              coreAvailable: false,
            };
          }
          return nextCard;
        });

        const returningNames = pilots
          .filter((p) => returningPilotIds.includes(p.id))
          .map((p) => p.name)
          .join('・');

        if (returningPilotIds.length === 1 && soloCoreClaimed > 0) {
          pushLog(
            ` 【単独帰還ボーナス発動】${returningNames}が単独帰還に成功！海溝端数+${remainderSharePerRetreater}ptに加え、古代コア（+${soloCoreClaimed}pt）を独占回収しました！`
          );
        } else if (remainderSharePerRetreater > 0) {
          pushLog(
            ` 【母艦帰還】${returningNames}が帰還を選択し、海溝に残っていた端数から各自 +${remainderSharePerRetreater}pt を回収して金庫へ格納しました。`
          );
        } else {
          pushLog(` 【母艦帰還】${returningNames}が調査バッグの遺物を母艦金庫へ安全に格納しました。`);
        }
        getAudio().playVaultLock();
      }

      // Update pilots who returned
      let nextPilots = pilots.map((p) => {
        const dec = decisions.get(p.id);
        if (!dec) return p;
        if (dec.action === 'return') {
          const totalLocked = p.bagScore + remainderSharePerRetreater + (returningPilotIds.length === 1 ? soloCoreClaimed : 0);
          return {
            ...p,
            vaultScore: p.vaultScore + totalLocked,
            bagScore: 0,
            status: 'docked' as DiverStatus,
            lastDecision: 'return' as DiverAction,
            thoughtText: `${dec.reason}（今回確定 +${totalLocked}pt）`,
            roundHistory: [...p.roundHistory, totalLocked],
          };
        }
        return {
          ...p,
          lastDecision: 'dive' as DiverAction,
          thoughtText: dec.reason,
        };
      });

      // If no divers remain in the trench (or deck is empty), the dive ends safely!
      if (divingPilotIds.length === 0 || diveDeck.length === 0) {
        if (divingPilotIds.length > 0 && diveDeck.length === 0) {
          nextPilots = nextPilots.map((p) =>
            p.status === 'diving'
              ? {
                  ...p,
                  vaultScore: p.vaultScore + p.bagScore,
                  bagScore: 0,
                  status: 'docked' as DiverStatus,
                  thoughtText: `海溝最深部に到達し安全帰還！（今回確定 +${p.bagScore}pt）`,
                  roundHistory: [...p.roundHistory, p.bagScore],
                }
              : p
          );
        }
        setPathCards(updatedPath);
        setPilots(nextPilots);
        if (currentDive >= TOTAL_DIVES) {
          setPhase('gameOver');
          const finalPlayer = nextPilots.find((p) => p.isHuman);
          if (finalPlayer && finalPlayer.vaultScore > bestRecord) {
            setBestRecord(finalPlayer.vaultScore);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('abyssal_salvage_best_score', String(finalPlayer.vaultScore));
            }
          }
          pushLog(' 全3回の深海サルベージ作戦が完了しました！最終スコアを集計します。');
        } else {
          setPhase('roundEnd');
          pushLog(` 第${currentDive}潜水：全操縦士が母艦へ帰還完了。次の潜水へ備えます。`);
        }
        return;
      }

      // 2. Process Diving Pilots (`さらに潜行する`) -> Reveal next card from Abyssal Deck
      const [drawnCard, ...restDeck] = diveDeck;
      const activeCount = divingPilotIds.length;

      if (drawnCard.kind === 'relic') {
        const share = Math.floor(drawnCard.value / activeCount);
        const remainder = drawnCard.value % activeCount;
        const cardOnPath: AbyssalCard = {
          ...drawnCard,
          remainderOnPath: remainder,
        };
        updatedPath = [...updatedPath, cardOnPath];
        nextPilots = nextPilots.map((p) =>
          divingPilotIds.includes(p.id)
            ? {
                ...p,
                bagScore: p.bagScore + share,
              }
            : p
        );
        getAudio().playRelicChime();
        pushLog(
          ` 【遺物発見：${drawnCard.name}（価値 ${drawnCard.value}pt）】潜行中の${activeCount}名で山分け（各自 +${share}pt / 海溝端数 +${remainder}pt）！`
        );
        setPathCards(updatedPath);
        setDiveDeck(restDeck);
        setPilots(nextPilots);
      } else if (drawnCard.kind === 'core') {
        const cardOnPath: AbyssalCard = {
          ...drawnCard,
          coreAvailable: true,
        };
        updatedPath = [...updatedPath, cardOnPath];
        getAudio().playRelicChime();
        pushLog(
          ` 【古代コア発見：${drawnCard.name}（+${drawnCard.value}pt）】海溝ルート上に出現！以降、単独（1人だけ）で帰還した操縦士が丸ごと獲得します！`
        );
        setPathCards(updatedPath);
        setDiveDeck(restDeck);
        setPilots(nextPilots);
      } else if (drawnCard.kind === 'hazard' && drawnCard.hazardType) {
        const hType = drawnCard.hazardType;
        const alreadyWarned = updatedPath.some(
          (c) => c.kind === 'hazard' && c.hazardType === hType
        );
        updatedPath = [...updatedPath, drawnCard];

        if (!alreadyWarned) {
          // 1st Hazard of this type -> First Warning (リーチ)
          getAudio().playWarningBeep();
          pushLog(
            `️ 【第1警報（リーチ）：${HAZARDS[hType].name}】次回以降もう1枚『${HAZARDS[hType].name}』が出ると強制浮上（バースト）となります！`
          );
          setPathCards(updatedPath);
          setDiveDeck(restDeck);
          setPilots(nextPilots);
        } else {
          // 2nd Hazard of the SAME type -> Emergency Abort (` 緊急浮上！`)
          getAudio().playEmergencyAbort();
          setAbortHazard(hType);
          // Permanently remove this triggering hazard card from masterDeck for subsequent dives
          setMasterDeck((prevMaster) => prevMaster.filter((c) => c.id !== drawnCard.id));
          setRemovedHazards((prevRem) => [...prevRem, hType]);

          nextPilots = nextPilots.map((p) =>
            divingPilotIds.includes(p.id)
              ? {
                  ...p,
                  bagScore: 0,
                  status: 'aborted' as DiverStatus,
                  thoughtText: ` ${HAZARDS[hType].name}の2枚目に遭遇し緊急浮上！未格納の調査バッグ遺物をすべて喪失…`,
                  roundHistory: [...p.roundHistory, 0],
                }
              : p
          );

          pushLog(
            ` 【緊急浮上発生！】2枚目の『${HAZARDS[hType].name}』に遭遇！海溝に残っていた操縦士は調査バッグの遺物をすべて失いました（この災害カード1枚は以降の潜水から永久排除されます）。`
          );

          setPathCards(updatedPath);
          setDiveDeck(restDeck);
          setPilots(nextPilots);

          if (currentDive >= TOTAL_DIVES) {
            setPhase('gameOver');
            const finalPlayer = nextPilots.find((p) => p.isHuman);
            if (finalPlayer && finalPlayer.vaultScore > bestRecord) {
              setBestRecord(finalPlayer.vaultScore);
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('abyssal_salvage_best_score', String(finalPlayer.vaultScore));
              }
            }
          } else {
            setPhase('roundEnd');
          }
        }
      }
    },
    [
      phase,
      pathCards,
      pilots,
      computeAiDecision,
      sonarStats,
      diveDeck,
      currentDive,
      bestRecord,
      getAudio,
      pushLog,
    ]
  );

  // If the human player has already returned to the sub (`docked`), allow stepping or auto-resolving remaining AI divers
  const playerPilot = pilots.find((p) => p.isHuman) || pilots[0];
  const isPlayerDockedWhileAiDiving =
    phase === 'deciding' &&
    playerPilot.status === 'docked' &&
    pilots.some((p) => p.status === 'diving');

  useEffect(() => {
    if (!isPlayerDockedWhileAiDiving) return;
    const timer = window.setTimeout(() => {
      handlePlayerDecision('return');
    }, 850);
    return () => window.clearTimeout(timer);
  }, [isPlayerDockedWhileAiDiving, handlePlayerDecision]);

  // Ranked pilots for leaderboard display
  const rankedPilots = useMemo(() => {
    return [...pilots].sort((a, b) => b.vaultScore + b.bagScore - (a.vaultScore + a.bagScore));
  }, [pilots]);

  return (
    <section className="tabletop-page relative min-h-screen overflow-x-hidden pb-16">
      {/* Top Navigation & Telemetry Header */}
      <header className="tabletop-header sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/games"
              className="tabletop-button inline-flex min-h-11 items-center gap-1.5 px-3 text-xs"
            >
              <span>←</span>
              <span>ゲーム一覧</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#3f5f78] " />
                <span className="tabletop-kicker">
                  ABYSSAL SALVAGE // DEEP TRENCH SONAR
                </span>
              </div>
              <h2 className="tabletop-title text-base sm:text-lg">
                深海サルベージ：酸素限界の遺跡探査
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="tabletop-stat px-3 py-1.5 text-xs">
              <span className="text-[var(--table-muted)] mr-1.5">潜水ラウンド:</span>
              <span className="font-mono font-bold text-[#9db8c8]">
                第 {currentDive} / {TOTAL_DIVES} 潜水
              </span>
            </div>
            <div className="tabletop-stat hidden px-3 py-1.5 text-xs sm:block">
              <span className="text-[var(--table-muted)] mr-1.5">自己ベスト金庫記録:</span>
              <span className="font-mono font-bold text-[var(--table-accent-strong)]">{bestRecord} pt</span>
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
              onClick={() => setMuted((m) => !m)}
              className="tabletop-button min-h-11 px-3 text-xs"
              aria-label={muted ? '効果音をオンにする' : '効果音をミュートする'}
            >
              {muted ? ' 消音中' : ' ソナー音ON'}
            </button>
            <button
              type="button"
              onClick={startNewExpedition}
              className="tabletop-button min-h-11 px-3 text-xs"
            >
              新規作戦リセット
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center Column: Command Controls, Trench Path & Diver Status (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Primary Decision Console */}
          <div className="tabletop-panel border-[#3f5f78] p-5">
            {phase === 'ready' && (
              <div className="text-center py-4 space-y-4">
                <div className="tabletop-chip px-3 py-1 text-xs font-medium">
                  深海チキンレース＆確率リスク管理ボードゲーム
                </div>
                <h3 className="tabletop-title text-xl sm:text-2xl">
                  全3回の潜水で最大の深海遺物を母艦金庫へ持ち帰れ！
                </h3>
                <p className="text-sm text-[var(--table-muted)] max-w-2xl mx-auto leading-relaxed">
                  各深度で4名の操縦士が同時に<strong className="text-[#9db8c8]">「さらに潜行する」</strong>か
                  <strong className="text-[var(--table-accent-strong)]">「母艦へ帰還する」</strong>かを決断します。
                  同じ種類の<strong className="text-[#d9a19b]">深海災害カードが2枚</strong>出る前に帰還すれば、調査バッグの遺物と海溝に残った端数（単独帰還なら古代コアも！）をすべて母艦金庫へ確定格納できます。
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => startDive(1)}
                    className="tabletop-button-primary min-h-12 px-8 text-base"
                  >
                     第1潜水を開始する（ハッチ開放）
                  </button>
                </div>
              </div>
            )}

            {phase === 'deciding' && (
              <div className="space-y-4">
                <div className="tabletop-divider flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#9db8c8]">
                      CURRENT DEPTH: {pathCards.length}00m // ACTIVE DIVERS: {sonarStats.activeDiversCount}名
                    </span>
                    <h3 className="tabletop-title text-lg">
                      {playerPilot.status === 'diving'
                        ? `深度 ${(pathCards.length + 1) * 100}m への進退を決断してください`
                        : 'あなたは母艦へ帰還済みです（残存AI操縦士の潜行を観測中…）'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="tabletop-stat px-3 py-1.5">
                      <span className="text-[var(--table-muted)]">あなたの未格納バッグ: </span>
                      <span className="font-mono font-bold text-[#9db8c8] text-sm">
                        {playerPilot.bagScore} pt
                      </span>
                    </div>
                    <div className="tabletop-stat px-3 py-1.5">
                      <span className="text-[var(--table-muted)]">海溝残留端数＋コア: </span>
                      <span className="font-mono font-bold text-[var(--table-accent-strong)] text-sm">
                        +{sonarStats.pathRemainderTotal + sonarStats.pathCoreTotal} pt
                      </span>
                    </div>
                  </div>
                </div>

                {playerPilot.status === 'diving' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePlayerDecision('dive')}
                      className="group relative flex min-h-24 flex-col items-center justify-center rounded-md border-2 border-[#3f5f78] bg-[#3f5f78]/14 p-4 transition hover:bg-[#3f5f78]/22"
                    >
                      <span className="text-base sm:text-lg font-extrabold text-[#9db8c8] group-hover:text-[var(--table-ink)] flex items-center gap-2">
                        <span></span>
                        <span>さらに潜行する（DIVE DEEPER）</span>
                      </span>
                      <span className="text-xs text-[#9db8c8]/80 mt-1">
                        次の深度カードをめくる｜続行期待値 {sonarStats.expectedContinueBagValue.toFixed(1)} pt（バースト率{' '}
                        {sonarStats.burstProbability.toFixed(1)}%）
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={pathCards.length === 0}
                      onClick={() => handlePlayerDecision('return')}
                      className={`group relative flex min-h-24 flex-col items-center justify-center rounded-md border-2 p-4 transition ${
                        pathCards.length === 0
                          ? 'tabletop-panel cursor-not-allowed border-[var(--table-line)] text-[var(--table-muted)]'
                          : 'border-[var(--table-accent)] bg-[#c99555]/14 hover:bg-[#c99555]/22'
                      }`}
                    >
                      <span className="text-base sm:text-lg font-extrabold text-[var(--table-accent-strong)] group-hover:text-[var(--table-ink)] flex items-center gap-2">
                        <span></span>
                        <span>母艦へ帰還する（RETURN TO SUB）</span>
                      </span>
                      <span className="text-xs text-[var(--table-accent-strong)]/85 mt-1">
                        {pathCards.length === 0
                          ? '最初の深度では帰還できません'
                          : `単独帰還なら確定 +${sonarStats.guaranteedReturnScore} pt（バッグ${playerPilot.bagScore} + 端数${sonarStats.pathRemainderTotal} + コア${sonarStats.pathCoreTotal}）`}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="tabletop-panel-soft flex items-center justify-between border-[#3f5f78] px-4 py-3">
                    <span className="text-sm text-[#9db8c8] ">
                       残存AIダイバーが深度 {(pathCards.length + 1) * 100}m を探査中…
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlayerDecision('return')}
                      className="tabletop-button min-h-11 px-4 text-xs"
                    >
                      即時ステップ送り
                    </button>
                  </div>
                )}
              </div>
            )}

            {phase === 'roundEnd' && (
              <div className="text-center py-3 space-y-4">
                {abortHazard ? (
                  <div className="tabletop-chip border-[#9f4540] px-4 py-1.5 text-xs font-bold text-[#d9a19b]">
                     緊急浮上（バースト）発生：{HAZARDS[abortHazard].name}（2枚目）
                  </div>
                ) : (
                  <div className="tabletop-chip border-[#315d4e] px-4 py-1.5 text-xs font-bold text-[#9dc4af]">
                     第{currentDive}潜水 全員帰還完了
                  </div>
                )}
                <h3 className="tabletop-title text-xl">
                  第{currentDive}潜水が終了しました（残り {TOTAL_DIVES - currentDive} 潜水）
                </h3>
                <p className="text-xs sm:text-sm text-[var(--table-muted)] max-w-xl mx-auto">
                  {abortHazard
                    ? `2枚目の『${HAZARDS[abortHazard].name}』が引き当てられたため強制浮上となり、逃げ遅れた操縦士の未格納バッグは0ptとなりました。発動した災害カード1枚は海溝デッキから永久排除されます。`
                    : '全操縦士が無事に母艦へ帰還し、獲得した遺物を金庫へロックしました。次の潜水ではさらに高価値な古代コアが海溝デッキに追加されます！'}
                </p>
                <button
                  type="button"
                  onClick={() => startDive(currentDive + 1)}
                  className="tabletop-button-primary min-h-11 px-7 text-sm"
                >
                   第{currentDive + 1}潜水へ進む（古代コア +{CORE_BY_DIVE[currentDive + 1]?.value ?? 12}pt 追加）
                </button>
              </div>
            )}

            {phase === 'gameOver' && (
              <div className="text-center py-4 space-y-4">
                <div className="tabletop-chip border-[var(--table-accent)] px-4 py-1.5 text-xs font-bold text-[var(--table-accent-strong)]">
                   全3潜水 最終サルベージ結果発表
                </div>
                <h3 className="tabletop-title text-2xl">
                  優勝：{rankedPilots[0]?.name}（母艦金庫 {rankedPilots[0]?.vaultScore} pt）
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto pt-1">
                  {rankedPilots.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-md border ${
                        idx === 0
                          ? 'border-[var(--table-accent)] bg-[#c99555]/10'
                          : 'tabletop-panel-soft'
                      }`}
                    >
                      <div className="text-xs text-[var(--table-muted)]">第{idx + 1}位</div>
                      <div className="font-bold text-sm text-[var(--table-ink)] mt-0.5">{p.name}</div>
                      <div className="font-mono text-lg font-extrabold text-[#9db8c8] mt-1">
                        {p.vaultScore} pt
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={startNewExpedition}
                    className="tabletop-button-primary min-h-11 px-8 text-sm"
                  >
                     もう一度深海サルベージに挑戦する
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4 Submersible Pilots Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {pilots.map((pilot) => {
              const isWarn = pilot.status === 'aborted';
              const isDocked = pilot.status === 'docked';
              return (
                <div
                  key={pilot.id}
                  className={`rounded-md border p-4 transition ${
                    pilot.isHuman
                      ? 'tabletop-panel border-[var(--table-accent)]'
                      : 'tabletop-panel'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[var(--table-ink)]">{pilot.name}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${pilot.badgeBg}`}>
                          {pilot.roleTitle}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--table-muted)] mt-1.5 leading-snug">{pilot.thoughtText}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                        isWarn
                          ? 'border-[#9f4540] bg-[#9f4540]/20 text-[#d9a19b]'
                          : isDocked
                          ? 'bg-[#315d4e]/20 border-[#315d4e]/50 text-[#9dc4af]'
                          : 'border-[#3f5f78] bg-[#3f5f78]/14 text-[#9db8c8]'
                      }`}
                    >
                      {isWarn ? ' 緊急浮上' : isDocked ? ' 母艦帰還済' : ' 潜行中'}
                    </span>
                  </div>

                  <div className="tabletop-divider mt-3 flex items-center justify-between border-t pt-2.5 text-xs">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[var(--table-muted)]">母艦金庫(確定): </span>
                        <span className="font-mono font-bold text-[var(--table-accent-strong)] text-sm">
                          {pilot.vaultScore} pt
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--table-muted)]">調査バッグ(未格納): </span>
                        <span className="font-mono font-bold text-[#9db8c8] text-sm">
                          {pilot.bagScore} pt
                        </span>
                      </div>
                    </div>
                    {pilot.roundHistory.length > 0 && (
                      <div className="text-[11px] font-mono text-[var(--table-muted)]">
                        各回: [{pilot.roundHistory.map(( pts) => `${pts}`).join(' / ')}]
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Abyssal Trench Revealed Card Trail (`深海海溝ルート`) */}
          <div className="tabletop-panel space-y-4 border-[#3f5f78] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="tabletop-title flex items-center gap-2 text-base">
                  <span>️</span>
                  <span>深海海溝探査ルート（めくられた深度カード履歴）</span>
                </h3>
                <p className="text-xs text-[var(--table-muted)]">
                  山分けで割り切れなかった「海溝端数ポイント」と「古代コア」は帰還する操縦士が回収します。
                </p>
              </div>
              <div className="text-xs font-mono text-[#9db8c8]">
                残存デッキ枚数: {diveDeck.length} 枚
              </div>
            </div>

            {pathCards.length === 0 ? (
              <div className="tabletop-panel-soft rounded-md border-dashed border-[#3f5f78] py-10 text-center text-sm text-[var(--table-muted)]">
                まだ深度カードがめくられていません。「さらに潜行する」を選択すると深度100mのカードが公開されます。
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pathCards.map((card, idx) => {
                  const depthMeters = (idx + 1) * 100;
                  const isHazard = card.kind === 'hazard' && card.hazardType;
                  const hazardMeta = isHazard && card.hazardType ? HAZARDS[card.hazardType] : null;
                  const priorSameHazard =
                    isHazard &&
                    pathCards
                      .slice(0, idx)
                      .some((prev) => prev.kind === 'hazard' && prev.hazardType === card.hazardType);

                  return (
                    <div
                      key={`${card.id}-${idx}`}
                      className={`relative rounded-md border p-3 ${
                        card.kind === 'core'
                          ? 'tabletop-panel border-[var(--table-accent)]'
                          : card.kind === 'relic'
                          ? 'tabletop-panel border-[#3f5f78]'
                          : priorSameHazard
                          ? 'tabletop-panel border-2 border-[#9f4540]'
                          : 'tabletop-panel border-[#9f4540]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--table-muted)] mb-1.5">
                        <span>DEPTH {depthMeters}m</span>
                        {card.kind === 'relic' && (
                          <span className="px-1.5 py-0.5 rounded bg-[#3f5f78]/18 text-[#9db8c8] font-bold">
                            価値 {card.value}pt
                          </span>
                        )}
                        {card.kind === 'core' && (
                          <span className="px-1.5 py-0.5 rounded bg-[#c99555]/20 text-[var(--table-accent-strong)] font-bold">
                            単独 +{card.value}pt
                          </span>
                        )}
                        {isHazard && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              priorSameHazard
                                ? 'bg-[#9f4540] text-[var(--table-ink)]'
                                : 'bg-[#c99555]/20 text-[var(--table-accent-strong)]'
                            }`}
                          >
                            {priorSameHazard ? ' 2枚目バースト' : '️ 第1警報'}
                          </span>
                        )}
                      </div>

                      <CardArtworkSvg card={card} isFatal={Boolean(priorSameHazard)} />

                      <div className="mt-2 text-center">
                        <div className="text-xs font-bold text-[var(--table-ink)] truncate" title={card.name}>
                          {card.name}
                        </div>
                        {card.kind === 'relic' && (
                          <div className="mt-1 text-[11px] font-mono">
                            {card.remainderOnPath > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-[#c99555]/16 border border-[var(--table-accent)]/40 text-[var(--table-accent-strong)] font-semibold">
                                海溝端数: +{card.remainderOnPath}pt
                              </span>
                            ) : (
                              <span className="text-[var(--table-muted)]">端数なし (0pt)</span>
                            )}
                          </div>
                        )}
                        {card.kind === 'core' && (
                          <div className="mt-1 text-[11px] font-mono">
                            {card.coreAvailable ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-[#c99555]/20 border border-[var(--table-accent)]/60 text-[var(--table-accent-strong)] font-bold">
                                未回収: 単独帰還で+{card.value}pt
                              </span>
                            ) : (
                              <span className="text-[var(--table-muted)]">回収済み</span>
                            )}
                          </div>
                        )}
                        {isHazard && hazardMeta && (
                          <div className="mt-1 text-[11px] text-[var(--table-muted)]">{hazardMeta.subtitle}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real-Time Probability & EV HUD (`深海ソナー確率アナライザー`) + Logs (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="tabletop-panel space-y-4 p-5">
            <div className="tabletop-divider flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#9db8c8]">
                  REAL-TIME PROBABILITY & EV HUD
                </span>
                <h3 className="tabletop-title text-base">深海ソナー確率アナライザー</h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  sonarStats.recommendation === '帰還推奨'
                    ? 'border-[#9f4540] bg-[#9f4540]/20 text-[#d9a19b]'
                    : sonarStats.recommendation === '警戒水域'
                    ? 'bg-[#c99555]/16 border-[var(--table-line-strong)]/50 text-[var(--table-accent-strong)]'
                    : 'bg-[#315d4e]/22 border-[#315d4e]/50 text-[#9dc4af]'
                }`}
              >
                AI判定: {sonarStats.recommendation}
              </span>
            </div>

            {/* Key Probability Gauges */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--table-muted)]">次の深度で強制浮上（バースト）する確率</span>
                  <span className="font-mono font-bold text-[#d9a19b]">
                    {sonarStats.burstProbability.toFixed(1)}% ({sonarStats.burstCardsCount}/
                    {sonarStats.totalRemaining}枚)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[var(--table-panel-raised)] overflow-hidden">
                  <div
                    className="h-full bg-[#9f4540] transition-all duration-300"
                    style={{ width: `${Math.min(100, sonarStats.burstProbability)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--table-muted)]">安全に遺物・コアを引き当てる確率</span>
                  <span className="font-mono font-bold text-[#9db8c8]">
                    {sonarStats.safeRelicProbability.toFixed(1)}% ({sonarStats.safeRelicCount}/
                    {sonarStats.totalRemaining}枚)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[var(--table-panel-raised)] overflow-hidden">
                  <div
                    className="h-full bg-[#315d4e] transition-all duration-300"
                    style={{ width: `${Math.min(100, sonarStats.safeRelicProbability)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* EV vs Guaranteed Return Comparison Box */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="tabletop-stat border-[var(--table-accent)] p-3">
                <div className="text-[11px] text-[var(--table-muted)]">帰還時の確定持ち帰り(単独)</div>
                <div className="font-mono text-lg font-extrabold text-[var(--table-accent-strong)] mt-0.5">
                  {sonarStats.guaranteedReturnScore} pt
                </div>
                <div className="text-[11px] text-[var(--table-muted)] mt-0.5">
                  バッグ{playerPilot.bagScore} + 残留{sonarStats.pathRemainderTotal + sonarStats.pathCoreTotal}
                </div>
              </div>
              <div className="tabletop-stat border-[#3f5f78] p-3">
                <div className="text-[11px] text-[var(--table-muted)]">潜行続行の期待値 (EV)</div>
                <div className="font-mono text-lg font-extrabold text-[#9db8c8] mt-0.5">
                  {sonarStats.expectedContinueBagValue.toFixed(1)} pt
                </div>
                <div className="text-[11px] text-[var(--table-muted)] mt-0.5">
                  生存率 {(100 - sonarStats.burstProbability).toFixed(0)}% × 次深度期待加算
                </div>
              </div>
            </div>

            {/* Visual Tracker of the 5 Hazard Types (`安全 / ️リーチ / 排除済み`) */}
            <div className="tabletop-divider space-y-2 border-t pt-2">
              <div className="text-xs font-bold text-[var(--table-ink)] flex items-center justify-between">
                <span>5大深海災害トラッカー（初期各3枚）</span>
                <span className="text-[11px] font-normal text-[var(--table-muted)]">2枚目出現で即バースト</span>
              </div>
              <div className="space-y-1.5">
                {HAZARD_ORDER.map((hType) => {
                  const meta = HAZARDS[hType];
                  const isWarned = sonarStats.activeWarnings.has(hType);
                  const removedCount = removedHazards.filter((h) => h === hType).length;
                  const remainingInDeck = diveDeck.filter(
                    (c) => c.kind === 'hazard' && c.hazardType === hType
                  ).length;

                  return (
                    <div
                      key={hType}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
                        isWarned
                          ? 'border-[#9f4540] bg-[#9f4540]/18 text-[#d9a19b]'
                          : 'tabletop-panel-soft text-[var(--table-muted)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="font-semibold">{meta.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-[var(--table-muted)]">山札残:{remainingInDeck}</span>
                        {removedCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--table-panel-raised)] text-[var(--table-muted)]">
                            排除済:{removedCount}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isWarned
                              ? 'bg-[#9f4540]/25 text-[#d9a19b] border border-[#9f4540]/50'
                              : 'bg-[#315d4e]/22 text-[#9dc4af]'
                          }`}
                        >
                          {isWarned ? '️ リーチ' : '安全'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sonar Action Log */}
          <div className="tabletop-panel space-y-2.5 p-4">
            <h3 className="tabletop-kicker">
              SONAR TELEMETRY LOG // 探査通信ログ
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {logs.map((entry, idx) => (
                <div
                  key={idx}
                  className="tabletop-panel-soft p-2 leading-relaxed text-[var(--table-muted)]"
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
