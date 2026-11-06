'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// ============================================================================
// Types & Constants: 『王宮の密使』（Royal Courier）
// ============================================================================

export type CardRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type GameMode = 'cpu4' | 'cpu3' | 'cpu2' | 'pvp2';
export type TargetMode = 'none' | 'opponent' | 'any_player';

export interface RoleDefinition {
  rank: CardRank;
  name: string;
  shortName: string;
  titleEn: string;
  countInDeck: number;
  targetMode: TargetMode;
  requiresRoleGuess: boolean;
  summary: string;
  detail: string;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    accentHex: string;
    secondaryHex: string;
  };
}

export const ROLE_DEFINITIONS: Record<CardRank, RoleDefinition> = {
  1: {
    rank: 1,
    name: '城門の衛兵',
    shortName: '衛兵',
    titleEn: 'GATE SENTINEL',
    countInDeck: 5,
    targetMode: 'opponent',
    requiresRoleGuess: true,
    summary: '相手の役職(Lv.2〜8)を宣言し、的中すれば即時脱落させる',
    detail:
      '指名した相手1人の手札の役職（Lv.2〜8）を1つ宣言する。的中すれば相手は手札を公開して即時脱落！（Lv.1 城門の衛兵は宣言できない）',
    colorTheme: {
      bg: 'from-slate-900 via-zinc-900 to-stone-950',
      border: 'border-amber-500/60',
      text: 'text-amber-200',
      badge: 'bg-[#3a2a1c] text-[#dfb06d] border-[#6b543d]',
      accentHex: '#f59e0b',
      secondaryHex: '#94a3b8',
    },
  },
  2: {
    rank: 2,
    name: '占星術師',
    shortName: '占星術師',
    titleEn: 'COURT ASTROLOGER',
    countInDeck: 2,
    targetMode: 'opponent',
    requiresRoleGuess: false,
    summary: '指名した相手1人の手札を密かに覗き見る',
    detail:
      '指名した相手1人の現在の手札を密かに確認する。確認した正体は「正体判明バッジ」として推理トラッカーに記録される。',
    colorTheme: {
      bg: 'from-indigo-950 via-blue-950 to-slate-950',
      border: 'border-sky-400/60',
      text: 'text-sky-200',
      badge: 'bg-[#182530] text-[#a9c8da] border-[#3f5f78]',
      accentHex: '#38bdf8',
      secondaryHex: '#818cf8',
    },
  },
  3: {
    rank: 3,
    name: '決闘騎士',
    shortName: '決闘騎士',
    titleEn: 'DUELIST KNIGHT',
    countInDeck: 2,
    targetMode: 'opponent',
    requiresRoleGuess: false,
    summary: '相手と手札の強さ(Lv)を比較し、低い方を即時脱落させる',
    detail:
      '指名した相手1人と残りの手札1枚の強さ（Lv）を密かに比較し、数値が低い方が即時脱落する。同値なら両者とも生存する。',
    colorTheme: {
      bg: 'from-rose-950 via-red-950 to-stone-950',
      border: 'border-rose-400/60',
      text: 'text-rose-200',
      badge: 'bg-[#241615] text-[#e0a9a2] border-[#6b3a36]',
      accentHex: '#fb7185',
      secondaryHex: '#f43f5e',
    },
  },
  4: {
    rank: 4,
    name: '結界の修道女',
    shortName: '修道女',
    titleEn: 'AEGIS SISTER',
    countInDeck: 2,
    targetMode: 'none',
    requiresRoleGuess: false,
    summary: '次の自分の手番まで、他者からの指名を完全無効化する',
    detail:
      '次の自分の手番が開始するまで「守護結界」状態となり、他プレイヤーからのあらゆるカード指名効果の対象にならなくなる。',
    colorTheme: {
      bg: 'from-emerald-950 via-teal-950 to-slate-950',
      border: 'border-emerald-400/60',
      text: 'text-emerald-200',
      badge: 'bg-[#14211b] text-[#a9cdb7] border-[#315d4e]',
      accentHex: '#34d399',
      secondaryHex: '#2dd4bf',
    },
  },
  5: {
    rank: 5,
    name: '宮廷魔導師',
    shortName: '魔導師',
    titleEn: 'ROYAL ARCANIST',
    countInDeck: 2,
    targetMode: 'any_player',
    requiresRoleGuess: false,
    summary: '自分または相手1人の手札を捨てさせ、新しい1枚を引かせる',
    detail:
      '自分自身を含む生存プレイヤー1人を指名し、現在の手札を捨て札にして山札から1枚引かせる（山札が0枚の時は除外された「伏せ密書」を引く）。Lv.8 王女を捨てさせたら即時脱落！',
    colorTheme: {
      bg: 'from-purple-950 via-violet-950 to-slate-950',
      border: 'border-violet-400/60',
      text: 'text-violet-200',
      badge: 'bg-[#282033] text-[#cbb5dc] border-[#5b4668]',
      accentHex: '#a78bfa',
      secondaryHex: '#c084fc',
    },
  },
  6: {
    rank: 6,
    name: '枢機卿（宰相）',
    shortName: '枢機卿',
    titleEn: 'GRAND CARDINAL',
    countInDeck: 1,
    targetMode: 'opponent',
    requiresRoleGuess: false,
    summary: '指名した相手1人と自分の残りの手札を強制交換する',
    detail:
      '指名した相手1人と自分の残りの手札1枚を強制的に交換する。交換した相手の手札は「自分が渡した正体判明カード」として把握できる。',
    colorTheme: {
      bg: 'from-amber-950 via-yellow-950 to-stone-950',
      border: 'border-yellow-400/70',
      text: 'text-yellow-200',
      badge: 'bg-[#3a2a1c] text-[#f0d9ae] border-[#6b543d]',
      accentHex: '#facc15',
      secondaryHex: '#fbbf24',
    },
  },
  7: {
    rank: 7,
    name: '女公爵',
    shortName: '女公爵',
    titleEn: 'ARCHDUCHESS',
    countInDeck: 1,
    targetMode: 'none',
    requiresRoleGuess: false,
    summary: '手札にLv.5魔導師かLv.6枢機卿があると必ず場に出さねばならない',
    detail:
      '場に出しても効果はないが、自分の手番に「Lv.5 宮廷魔導師」または「Lv.6 枢機卿」と一緒に手札にある場合、必ずこの女公爵の方を場に出さなければならない（あえて早く出してブラフに使うことも可能）。',
    colorTheme: {
      bg: 'from-fuchsia-950 via-pink-950 to-stone-950',
      border: 'border-pink-400/70',
      text: 'text-pink-200',
      badge: 'bg-[#35201e] text-[#dfb0c8] border-[#6b3a50]',
      accentHex: '#f472b6',
      secondaryHex: '#e879f9',
    },
  },
  8: {
    rank: 8,
    name: '王女セレスティア',
    shortName: '王女',
    titleEn: 'PRINCESS CELESTIA',
    countInDeck: 1,
    targetMode: 'none',
    requiresRoleGuess: false,
    summary: '最強のLv.8だが、場に出すか捨てさせられた瞬間に即時脱落！',
    detail:
      '宮廷最高のランク8を誇る密使カード。ラウンド終了まで守り抜けば必ず最高ランクで勝利できるが、自ら場に出すか、Lv.5魔導師などで捨てさせられた瞬間に即時脱落してしまう！',
    colorTheme: {
      bg: 'from-amber-900 via-rose-950 to-purple-950',
      border: 'border-amber-300/90',
      text: 'text-amber-100',
      badge: 'bg-[#3a2a1c] text-[#f0d9ae] border-[#6b543d]',
      accentHex: '#fde047',
      secondaryHex: '#fb7185',
    },
  },
};

export const ALL_RANKS: CardRank[] = [1, 2, 3, 4, 5, 6, 7, 8];

export interface CourierCard {
  id: string;
  rank: CardRank;
}

export type AiPersonaId = 'claude' | 'eleanor' | 'marcus';

export interface PlayerState {
  id: string;
  name: string;
  title: string;
  isHuman: boolean;
  personaId?: AiPersonaId;
  hand: CourierCard[];
  discards: CourierCard[];
  isEliminated: boolean;
  eliminatedReason?: string;
  isProtected: boolean;
  seals: number;
  speechBubble?: string;
  /** Knowledge map: targetPlayerId -> known CardRank */
  knownOpponentHands: Record<string, { rank: CardRank; reason: string }>;
}

export interface ActionLogEntry {
  id: string;
  round: number;
  turn: number;
  actorName: string;
  rank: CardRank;
  text: string;
  highlight?: 'elimination' | 'shield' | 'peek' | 'swap' | 'win' | 'normal';
}

export interface RoundSummary {
  roundNumber: number;
  winnerIds: string[];
  winnerNames: string[];
  reason: string;
  hiddenDecree: CourierCard | null;
  survivingHands: Array<{
    playerId: string;
    playerName: string;
    card: CourierCard | null;
    totalDiscardScore: number;
  }>;
}

// ============================================================================
// AI Rivals Metadata
// ============================================================================

interface AiRivalProfile {
  personaId: AiPersonaId;
  name: string;
  title: string;
  styleTag: string;
  description: string;
}

const AI_RIVALS: AiRivalProfile[] = [
  {
    personaId: 'claude',
    name: 'クロード',
    title: '記憶型スパイ',
    styleTag: 'カウンティング＆精密狙撃',
    description:
      '場の捨て札と覗き見た正体を完璧に記憶し、残存枚数から最も確率の高い役職を衛兵で狙い撃つ宮廷諜報員。',
  },
  {
    personaId: 'eleanor',
    name: 'エレノア',
    title: '強気騎士',
    styleTag: '高ランク保持＆決闘特化',
    description:
      '高ランクカードを手元に温存しながら「Lv.3 決闘騎士」や「Lv.1 城門の衛兵」で積極的に正面突破を図る近衛騎士。',
  },
  {
    personaId: 'marcus',
    name: 'マルクス',
    title: 'ブラフ公爵',
    styleTag: '結界防衛＆心理フェイント',
    description:
      '修道女の結界や早めの女公爵プレイで周囲の推理を撹乱し、終盤に魔導師や枢機卿で盤面をひっくり返す策士。',
  },
];

// ============================================================================
// Web Audio API Sound & Baroque Harpsichord BGM Engine
// ============================================================================

class RoyalAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  public sfxEnabled = true;
  public bgmEnabled = false;

  private getContext(): AudioContext | null {
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

  public playCardDraw(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playSwordClash(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [520, 780, 1040].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + idx * 0.04 + 0.16);
      gain.gain.setValueAtTime(0.07, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.17);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.18);
    });
  }

  public playCrystalShield(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.08, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.36);
    });
  }

  public playMagicChime(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.07, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.3);
    });
  }

  public playElimination(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [293.66, 261.63, 220].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.075, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.26);
    });
  }

  public playWaxSealWin(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.09, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.46);
    });
  }

  public startBgm(): void {
    this.stopBgm();
    if (!this.bgmEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Baroque Harpsichord A-minor court progression
    const melody = [
      440.0, 523.25, 659.25, 523.25, 493.88, 587.33, 698.46, 587.33, 440.0, 523.25, 659.25, 880.0,
      783.99, 659.25, 587.33, 523.25, 415.3, 493.88, 659.25, 493.88, 440.0, 523.25, 659.25, 440.0,
    ];
    const bass = [
      220.0, 220.0, 220.0, 220.0, 196.0, 196.0, 196.0, 196.0, 174.61, 174.61, 164.81, 164.81,
      146.83, 146.83, 164.81, 164.81, 207.65, 207.65, 164.81, 164.81, 220.0, 220.0, 220.0, 220.0,
    ];

    this.bgmTimer = window.setInterval(() => {
      if (!this.bgmEnabled) return;
      const c = this.getContext();
      if (!c) return;
      const now = c.currentTime;
      const step = this.bgmStep % melody.length;
      this.bgmStep += 1;

      // Pluck melody note (harpsichord feel)
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melody[step], now);
      gain.gain.setValueAtTime(0.028, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.29);

      // Bass note on every 2nd step
      if (step % 2 === 0) {
        const bOsc = c.createOscillator();
        const bGain = c.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bass[step], now);
        bGain.gain.setValueAtTime(0.024, now);
        bGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.5);
        bOsc.connect(bGain);
        bGain.connect(c.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.52);
      }
    }, 320);
  }

  public stopBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// ============================================================================
// Custom SVG Gothic Royal Crest & Role Character Art
// ============================================================================

function RoleCrestSvg({ rank, className = 'w-14 h-14' }: { rank: CardRank; className?: string }) {
  const def = ROLE_DEFINITIONS[rank];
  const primary = def.colorTheme.accentHex;
  const secondary = def.colorTheme.secondaryHex;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Ornate Gothic Shield Frame */}
      <path
        d="M50 6 L88 20 V50 C88 73 71 88 50 95 C29 88 12 73 12 50 V20 L50 6 Z"
        fill="#0c0a16"
        stroke={primary}
        strokeWidth="3"
      />
      <path
        d="M50 11 L83 23 V49 C83 69 68 83 50 89 C32 83 17 69 17 49 V23 L50 11 Z"
        stroke={secondary}
        strokeWidth="1.2"
        strokeDasharray="3 2"
        opacity="0.65"
      />

      {rank === 1 && (
        /* Lv.1 Gate Sentinel: Crossed Halberd & Watchtower Helm */
        <g>
          <path d="M28 74 L72 26" stroke={secondary} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M62 22 L76 24 L68 38 Z" fill={primary} />
          <path
            d="M36 42 C36 31 64 31 64 42 V62 H36 V42 Z"
            fill={primary}
            fillOpacity="0.25"
            stroke={primary}
            strokeWidth="2.5"
          />
          <line x1="42" y1="50" x2="58" y2="50" stroke={primary} strokeWidth="2.5" />
          <line x1="50" y1="42" x2="50" y2="62" stroke={primary} strokeWidth="2.5" />
        </g>
      )}

      {rank === 2 && (
        /* Lv.2 Court Astrologer: All-Seeing Celestial Eye & Astrolabe */
        <g>
          <circle
            cx="50"
            cy="50"
            r="24"
            stroke={secondary}
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          <path
            d="M24 50 C34 35 66 35 76 50 C66 65 34 65 24 50 Z"
            fill={primary}
            fillOpacity="0.2"
            stroke={primary}
            strokeWidth="2.5"
          />
          <circle cx="50" cy="50" r="8" fill={primary} />
          <circle cx="52.5" cy="47.5" r="2.5" fill="#090d16" />
          <path d="M50 20 L52 25 L50 28 L48 25 Z" fill={primary} />
        </g>
      )}

      {rank === 3 && (
        /* Lv.3 Duelist Knight: Twin Crossed Royal Rapier Blades */
        <g>
          <path d="M26 72 L72 26" stroke={primary} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M74 72 L28 26" stroke={secondary} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="50" cy="49" r="9" fill="#1f121d" stroke={primary} strokeWidth="2.5" />
          <path d="M50 24 L54 32 L50 36 L46 32 Z" fill={primary} />
        </g>
      )}

      {rank === 4 && (
        /* Lv.4 Aegis Sister: Sacred Sanctuary Barrier & Lily Cross */
        <g>
          <path
            d="M50 22 L72 32 V50 C72 64 62 74 50 79 C38 74 28 64 28 50 V32 L50 22 Z"
            fill={primary}
            fillOpacity="0.22"
            stroke={primary}
            strokeWidth="2.5"
          />
          <path d="M50 31 V69 M34 48 H66" stroke={primary} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="50" cy="48" r="5" fill={secondary} />
        </g>
      )}

      {rank === 5 && (
        /* Lv.5 Royal Arcanist: Hexagram Tome & Arcane Vortex */
        <g>
          <polygon
            points="50,23 71,61 29,61"
            stroke={primary}
            strokeWidth="2.2"
            fill={primary}
            fillOpacity="0.15"
          />
          <polygon
            points="50,73 71,35 29,35"
            stroke={secondary}
            strokeWidth="2.2"
            fill="none"
          />
          <circle cx="50" cy="48" r="7" fill={primary} />
        </g>
      )}

      {rank === 6 && (
        /* Lv.6 Grand Cardinal: Scales of Decree & Exchanging Rings */
        <g>
          <circle cx="42" cy="48" r="13" stroke={primary} strokeWidth="2.8" fill="none" />
          <circle cx="58" cy="48" r="13" stroke={secondary} strokeWidth="2.8" fill="none" />
          <path d="M50 22 L56 31 H44 L50 22 Z" fill={primary} />
          <path d="M36 68 H64" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {rank === 7 && (
        /* Lv.7 Archduchess: Noble Folding Fan & Rose Tiara */
        <g>
          <path
            d="M24 62 C28 38 72 38 76 62 L50 68 Z"
            fill={primary}
            fillOpacity="0.28"
            stroke={primary}
            strokeWidth="2.5"
          />
          <line x1="50" y1="68" x2="34" y2="45" stroke={secondary} strokeWidth="1.8" />
          <line x1="50" y1="68" x2="50" y2="41" stroke={secondary} strokeWidth="1.8" />
          <line x1="50" y1="68" x2="66" y2="45" stroke={secondary} strokeWidth="1.8" />
          <circle cx="50" cy="30" r="5" fill={primary} />
        </g>
      )}

      {rank === 8 && (
        /* Lv.8 Princess Celestia: Imperial Sovereign Crown & Star Jewel */
        <g>
          <path
            d="M24 64 L29 36 L43 49 L50 27 L57 49 L71 36 L76 64 Z"
            fill={primary}
            fillOpacity="0.32"
            stroke={primary}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <rect x="26" y="65" width="48" height="7" rx="3" fill={primary} />
          <circle cx="50" cy="23" r="4" fill={primary} />
          <circle cx="28" cy="33" r="3" fill={secondary} />
          <circle cx="72" cy="33" r="3" fill={secondary} />
          <circle cx="50" cy="54" r="4.5" fill={secondary} />
        </g>
      )}
    </svg>
  );
}

function WaxSealBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold transition-all ${
        active
          ? 'scale-105 border-[#c98d86] bg-[#9f4540] text-[#f4ead8]'
          : 'border-[#4d3d2d] bg-[#1d1712] text-[#6b543d]'
      }`}
      title={active ? '獲得済み：王宮の封蝋トークン' : '未獲得の封蝋枠'}
    >

    </span>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function createShuffledDeck(): CourierCard[] {
  const cards: CourierCard[] = [];
  let seq = 1;
  for (const rank of ALL_RANKS) {
    const count = ROLE_DEFINITIONS[rank].countInDeck;
    for (let i = 0; i < count; i++) {
      cards.push({
        id: `rc-card-${rank}-${i + 1}-${seq++}`,
        rank,
      });
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = cards[i];
    cards[i] = cards[j];
    cards[j] = tmp;
  }
  return cards;
}

/**
 * Checks the Lv.7 Archduchess (女公爵) mandatory play rule:
 * If a player holds Lv.7 AND (Lv.5 or Lv.6), they MUST play Lv.7.
 */
function mustPlayArchduchess(hand: CourierCard[]): boolean {
  const has7 = hand.some((c) => c.rank === 7);
  const has5Or6 = hand.some((c) => c.rank === 5 || c.rank === 6);
  return has7 && has5Or6;
}

// ============================================================================
// Main Component: RoyalCourierGame
// ============================================================================

export default function RoyalCourierGame() {
  const audioRef = useRef<RoyalAudioEngine | null>(null);
  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = new RoyalAudioEngine();
  }

  // Settings & Mode
  const [gameMode, setGameMode] = useState<GameMode>('cpu4');
  const [targetSeals, setTargetSeals] = useState<number>(3);
  const [sfxOn, setSfxOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);

  // Round & Match State
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [turnCounter, setTurnCounter] = useState<number>(1);
  const [deck, setDeck] = useState<CourierCard[]>([]);
  const [hiddenDecree, setHiddenDecree] = useState<CourierCard | null>(null);
  const [faceUpExiles, setFaceUpExiles] = useState<CourierCard[]>([]);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);

  // Turn Interaction State
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [guessedRank, setGuessedRank] = useState<CardRank>(2);
  const [pvpPrivacyGate, setPvpPrivacyGate] = useState<boolean>(false);
  const [roundSummary, setRoundSummary] = useState<RoundSummary | null>(null);
  const [matchWinner, setMatchWinner] = useState<PlayerState | null>(null);
  const [logs, setLogs] = useState<ActionLogEntry[]>([]);
  const [bannerMessage, setBannerMessage] = useState<{
    title: string;
    subtitle: string;
    tone: 'gold' | 'crimson' | 'emerald' | 'sky';
  } | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Sync audio toggles
  const handleToggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    if (audioRef.current) {
      audioRef.current.sfxEnabled = next;
    }
  };

  const handleToggleBgm = () => {
    const next = !bgmOn;
    setBgmOn(next);
    if (audioRef.current) {
      audioRef.current.bgmEnabled = next;
      if (next) {
        audioRef.current.startBgm();
      } else {
        audioRef.current.stopBgm();
      }
    }
  };

  useEffect(() => {
    const engine = audioRef.current;
    return () => {
      engine?.stopBgm();
    };
  }, []);

  // ==========================================================================
  // Initialize / Start Round & Match
  // ==========================================================================

  const startRound = useCallback(
    (
      existingPlayers: PlayerState[] | null,
      mode: GameMode,
      nextRoundNumber: number,
      startingPlayerIndex = 0
    ) => {
      const freshDeck = createShuffledDeck();
      // 1 card set aside face-down as the Hidden Royal Decree (伏せ密書)
      const secretCard = freshDeck.shift() ?? null;

      let basePlayers: PlayerState[];
      if (existingPlayers && existingPlayers.length > 0) {
        basePlayers = existingPlayers.map((p) => ({
          ...p,
          hand: [],
          discards: [],
          isEliminated: false,
          eliminatedReason: undefined,
          isProtected: false,
          speechBubble: undefined,
          knownOpponentHands: {},
        }));
      } else {
        if (mode === 'pvp2') {
          basePlayers = [
            {
              id: 'p1',
              name: 'プレイヤー1',
              title: '第一密使',
              isHuman: true,
              hand: [],
              discards: [],
              isEliminated: false,
              isProtected: false,
              seals: 0,
              knownOpponentHands: {},
            },
            {
              id: 'p2',
              name: 'プレイヤー2',
              title: '第二密使',
              isHuman: true,
              hand: [],
              discards: [],
              isEliminated: false,
              isProtected: false,
              seals: 0,
              knownOpponentHands: {},
            },
          ];
        } else {
          const cpuCount = mode === 'cpu4' ? 3 : mode === 'cpu3' ? 2 : 1;
          basePlayers = [
            {
              id: 'human',
              name: 'あなた',
              title: '王宮筆頭密使',
              isHuman: true,
              hand: [],
              discards: [],
              isEliminated: false,
              isProtected: false,
              seals: 0,
              knownOpponentHands: {},
            },
            ...AI_RIVALS.slice(0, cpuCount).map((rival, idx) => ({
              id: `cpu-${idx + 1}`,
              name: rival.name,
              title: rival.title,
              isHuman: false,
              personaId: rival.personaId,
              hand: [],
              discards: [],
              isEliminated: false,
              isProtected: false,
              seals: 0,
              knownOpponentHands: {},
            })),
          ];
        }
      }

      // In 2-player games, also set aside 3 cards face-up so card counting is razor-sharp!
      const openExiles: CourierCard[] = [];
      if (basePlayers.length === 2) {
        for (let i = 0; i < 3; i++) {
          const ex = freshDeck.shift();
          if (ex) openExiles.push(ex);
        }
      }

      // Deal 1 card to each player
      for (const p of basePlayers) {
        const dealt = freshDeck.shift();
        if (dealt) p.hand.push(dealt);
      }

      // First active player draws their turn card immediately
      const safeStartIdx = startingPlayerIndex % basePlayers.length;
      const firstPlayer = basePlayers[safeStartIdx];
      const turnDraw = freshDeck.shift();
      if (turnDraw && firstPlayer) {
        firstPlayer.hand.push(turnDraw);
      }

      setDeck(freshDeck);
      setHiddenDecree(secretCard);
      setFaceUpExiles(openExiles);
      setPlayers(basePlayers);
      setActivePlayerIdx(safeStartIdx);
      setRoundNumber(nextRoundNumber);
      setTurnCounter(1);
      setSelectedCardId(firstPlayer?.hand[0]?.id ?? null);
      setSelectedTargetId(null);
      setGuessedRank(2);
      setRoundSummary(null);
      setPvpPrivacyGate(mode === 'pvp2');
      setBannerMessage({
        title: `第 ${nextRoundNumber} ラウンド 開幕`,
        subtitle: `${firstPlayer.name}の手番から宮廷心理戦が始まります`,
        tone: 'gold',
      });

      if (nextRoundNumber === 1) {
        setMatchWinner(null);
        setLogs([
          {
            id: `log-init-${Date.now()}`,
            round: 1,
            turn: 1,
            actorName: '王宮書記官',
            rank: 8,
            text: `全16枚の密使デッキをシャッフルし、伏せ密書1枚を封印しました（先手：${firstPlayer.name}）。`,
            highlight: 'normal',
          },
        ]);
      } else {
        setLogs((prev) => [
          {
            id: `log-round-${nextRoundNumber}-${Date.now()}`,
            round: nextRoundNumber,
            turn: 1,
            actorName: '王宮書記官',
            rank: 8,
            text: `=== 第 ${nextRoundNumber} ラウンド開始（先手：${firstPlayer.name}） ===`,
            highlight: 'normal',
          },
          ...prev,
        ]);
      }
    },
    []
  );

  // Initial mount
  useEffect(() => {
    startRound(null, 'cpu4', 1, 0);
  }, [startRound]);

  const handleRestartMatch = (newMode?: GameMode, newTargetSeals?: number) => {
    const modeToUse = newMode ?? gameMode;
    const sealsToUse = newTargetSeals ?? targetSeals;
    if (newMode) setGameMode(newMode);
    if (newTargetSeals) setTargetSeals(newTargetSeals);
    setMatchWinner(null);
    startRound(null, modeToUse, 1, 0);
  };

  // ==========================================================================
  // Live Card-Counting & Deduction Matrix Calculation
  // ==========================================================================

  const cardCountingMatrix = useMemo(() => {
    // Publicly visible cards: all players' discards + 2P faceUpExiles
    const publicCounts: Record<CardRank, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
    };

    for (const c of faceUpExiles) {
      publicCounts[c.rank] += 1;
    }
    for (const p of players) {
      for (const d of p.discards) {
        publicCounts[d.rank] += 1;
      }
    }

    return ALL_RANKS.map((rank) => {
      const def = ROLE_DEFINITIONS[rank];
      const playedCount = publicCounts[rank];
      const remainingUnknown = Math.max(0, def.countInDeck - playedCount);
      return {
        rank,
        def,
        total: def.countInDeck,
        played: playedCount,
        remaining: remainingUnknown,
      };
    });
  }, [players, faceUpExiles]);

  // Identify current perspective human player (for showing known badges & hand)
  const viewerPlayer = useMemo(() => {
    if (gameMode === 'pvp2') {
      return players[activePlayerIdx] ?? players[0] ?? null;
    }
    return players.find((p) => p.isHuman) ?? players[0] ?? null;
  }, [players, activePlayerIdx, gameMode]);

  const activePlayer = players[activePlayerIdx] ?? null;

  // Selectable opponents for the currently selected card
  const selectedCardObj = useMemo(() => {
    if (!activePlayer || !selectedCardId) return null;
    return activePlayer.hand.find((c) => c.id === selectedCardId) ?? activePlayer.hand[0] ?? null;
  }, [activePlayer, selectedCardId]);

  const validTargets = useMemo(() => {
    if (!activePlayer || !selectedCardObj) return [];
    const def = ROLE_DEFINITIONS[selectedCardObj.rank];
    if (def.targetMode === 'none') return [];
    if (def.targetMode === 'any_player') {
      // Mage (Lv.5) can target any surviving unprotected opponent OR self
      return players.filter(
        (p) => !p.isEliminated && (p.id === activePlayer.id || !p.isProtected)
      );
    }
    // 'opponent': surviving, not self, not protected
    return players.filter(
      (p) => !p.isEliminated && p.id !== activePlayer.id && !p.isProtected
    );
  }, [activePlayer, selectedCardObj, players]);

  // Keep selectedTargetId valid whenever validTargets changes
  useEffect(() => {
    if (validTargets.length === 0) {
      setSelectedTargetId(null);
      return;
    }
    if (!selectedTargetId || !validTargets.some((t) => t.id === selectedTargetId)) {
      // Prefer targeting an opponent over self for Lv.5 Mage by default
      const firstOpponent = validTargets.find((t) => t.id !== activePlayer?.id);
      setSelectedTargetId((firstOpponent ?? validTargets[0]).id);
    }
  }, [validTargets, selectedTargetId, activePlayer]);

  // ==========================================================================
  // Finish Round Check & Resolution
  // ==========================================================================

  const finalizeRound = useCallback(
    (
      updatedPlayers: PlayerState[],
      currentDeck: CourierCard[],
      secretDecree: CourierCard | null,
      currentLogs: ActionLogEntry[],
      currentRound: number,
      currentTurn: number
    ) => {
      const survivors = updatedPlayers.filter((p) => !p.isEliminated);
      let winnerIds: string[] = [];
      let reason = '';

      if (survivors.length === 1) {
        winnerIds = [survivors[0].id];
        reason = `他の密使が全員脱落し、最後まで生き残った「${survivors[0].name}」が単独勝利！`;
      } else if (survivors.length > 1) {
        // Deck exhausted: compare hand ranks, then total discard rank sum on tie
        let bestRank = -1;
        let bestDiscardSum = -1;
        for (const s of survivors) {
          const handRank = s.hand[0]?.rank ?? 0;
          const discardSum = s.discards.reduce((acc, c) => acc + c.rank, 0);
          if (
            handRank > bestRank ||
            (handRank === bestRank && discardSum > bestDiscardSum)
          ) {
            bestRank = handRank;
            bestDiscardSum = discardSum;
            winnerIds = [s.id];
          } else if (handRank === bestRank && discardSum === bestDiscardSum) {
            winnerIds.push(s.id);
          }
        }
        const winnerNamesStr = updatedPlayers
          .filter((p) => winnerIds.includes(p.id))
          .map((p) => `${p.name}（Lv.${p.hand[0]?.rank ?? '?'} ${ROLE_DEFINITIONS[p.hand[0]?.rank ?? 1].shortName}）`)
          .join('・');
        reason = `山札が尽きたため生存者で最終手札を公開比較！最高ランクの「${winnerNamesStr}」がラウンド勝利！`;
      }

      const nextPlayers = updatedPlayers.map((p) =>
        winnerIds.includes(p.id) ? { ...p, seals: p.seals + 1 } : p
      );

      const winnerNames = nextPlayers
        .filter((p) => winnerIds.includes(p.id))
        .map((p) => p.name);

      audioRef.current?.playWaxSealWin();

      const summary: RoundSummary = {
        roundNumber: currentRound,
        winnerIds,
        winnerNames,
        reason,
        hiddenDecree: secretDecree,
        survivingHands: survivors.map((s) => ({
          playerId: s.id,
          playerName: s.name,
          card: s.hand[0] ?? null,
          totalDiscardScore: s.discards.reduce((acc, c) => acc + c.rank, 0),
        })),
      };

      const champion = nextPlayers.find((p) => p.seals >= targetSeals) ?? null;

      setPlayers(nextPlayers);
      setDeck(currentDeck);
      setRoundSummary(summary);
      if (champion) {
        setMatchWinner(champion);
      }
      setLogs([
        {
          id: `log-round-win-${Date.now()}`,
          round: currentRound,
          turn: currentTurn,
          actorName: '王宮宰相府',
          rank: 8,
          text: `【封蝋授与】${reason}`,
          highlight: 'win',
        },
        ...currentLogs,
      ]);
      setBannerMessage({
        title: ` ${winnerNames.join(' & ')} が封蝋トークンを獲得！`,
        subtitle: reason,
        tone: 'gold',
      });
    },
    [targetSeals]
  );

  // ==========================================================================
  // Execute a Card Play (Human or AI)
  // ==========================================================================

  const executeCardPlay = useCallback(
    (cardToPlayId: string, targetPlayerId: string | null, declaredRank: CardRank) => {
      if (roundSummary || matchWinner) return;
      const actor = players[activePlayerIdx];
      if (!actor) return;

      const cardIndex = actor.hand.findIndex((c) => c.id === cardToPlayId);
      if (cardIndex === -1) return;
      const playedCard = actor.hand[cardIndex];

      // Enforce Lv.7 Archduchess rule
      if (playedCard.rank !== 7 && mustPlayArchduchess(actor.hand)) {
        setBannerMessage({
          title: '女公爵の宮廷儀礼ルール！',
          subtitle:
            '手札に「Lv.5 宮廷魔導師」または「Lv.6 枢機卿」がある場合、必ず「Lv.7 女公爵」を場に出さなければなりません。',
          tone: 'crimson',
        });
        return;
      }

      // Clone state for resolution
      const nextDeck = [...deck];
      let nextHiddenDecree = hiddenDecree;
      const nextPlayers: PlayerState[] = players.map((p) => ({
        ...p,
        hand: [...p.hand],
        discards: [...p.discards],
        knownOpponentHands: { ...p.knownOpponentHands },
        speechBubble: p.id === actor.id ? undefined : p.speechBubble,
      }));

      const mutableActor = nextPlayers[activePlayerIdx];
      // Remove played card from actor's hand & push to actor's discards
      mutableActor.hand.splice(cardIndex, 1);
      mutableActor.discards.push(playedCard);

      // Clear any outdated knowledge other players had about actor's hand if needed
      const target = targetPlayerId
        ? nextPlayers.find((p) => p.id === targetPlayerId) ?? null
        : null;

      let logText = '';
      let logHighlight: ActionLogEntry['highlight'] = 'normal';
      let speech = '';

      // Resolve by card rank
      switch (playedCard.rank) {
        case 1: {
          // Gate Sentinel
          if (!target) {
            audioRef.current?.playCardDraw();
            logText = `${mutableActor.name}は「Lv.1 城門の衛兵」を出したが、全員が守護結界中のため指名対象がいなかった。`;
            speech = 'むっ、全員結界に守られているか…！';
          } else {
            const targetCard = target.hand[0];
            const guessedDef = ROLE_DEFINITIONS[declaredRank];
            if (targetCard && targetCard.rank === declaredRank) {
              audioRef.current?.playElimination();
              target.isEliminated = true;
              target.eliminatedReason = `${mutableActor.name}の衛兵に「Lv.${declaredRank} ${guessedDef.shortName}」を見破られ脱落`;
              if (target.hand[0]) {
                target.discards.push(target.hand[0]);
                target.hand = [];
              }
              logText = `${mutableActor.name}の「Lv.1 城門の衛兵」が${target.name}を「Lv.${declaredRank} ${guessedDef.name}」と名指し！見事的中し、${target.name}は脱落！`;
              logHighlight = 'elimination';
              speech = `そこだ！${target.name}、貴様の正体は「${guessedDef.shortName}」だな！`;
            } else {
              audioRef.current?.playSwordClash();
              logText = `${mutableActor.name}の「Lv.1 城門の衛兵」が${target.name}を「Lv.${declaredRank} ${guessedDef.name}」と推理したが、外れた！`;
              speech = `${target.name}は「${guessedDef.shortName}」ではないのか…！`;
              // Everyone now knows target does NOT hold declaredRank
            }
          }
          break;
        }

        case 2: {
          // Court Astrologer
          audioRef.current?.playMagicChime();
          if (!target) {
            logText = `${mutableActor.name}は「Lv.2 占星術師」を出したが、全員が守護結界中のため覗き見ることができなかった。`;
            speech = '結界に阻まれて星が読めぬ…';
          } else {
            const targetCard = target.hand[0];
            if (targetCard) {
              mutableActor.knownOpponentHands[target.id] = {
                rank: targetCard.rank,
                reason: 'Lv.2 占星術師で透視',
              };
            }
            const secretHint =
              mutableActor.isHuman && targetCard
                ? `（正体は「Lv.${targetCard.rank} ${ROLE_DEFINITIONS[targetCard.rank].name}」！）`
                : '';
            logText = `${mutableActor.name}は「Lv.2 占星術師」で${target.name}の手札を密かに覗き見た！${secretHint}`;
            logHighlight = 'peek';
            speech = `なるほど…${target.name}の秘めたるカード、しかと見届けたぞ。`;
          }
          break;
        }

        case 3: {
          // Duelist Knight
          audioRef.current?.playSwordClash();
          if (!target) {
            logText = `${mutableActor.name}は「Lv.3 決闘騎士」を構えたが、指名できる相手がいなかった。`;
            speech = '決闘相手が不在とはな…';
          } else {
            const actorCard = mutableActor.hand[0];
            const targetCard = target.hand[0];
            if (actorCard && targetCard) {
              if (actorCard.rank > targetCard.rank) {
                target.isEliminated = true;
                target.eliminatedReason = `${mutableActor.name}との決闘に敗北（Lv.${targetCard.rank} 対 Lv.${actorCard.rank}）`;
                target.discards.push(targetCard);
                target.hand = [];
                logText = `${mutableActor.name}が「Lv.3 決闘騎士」で${target.name}に一騎打ちを挑み勝利！（${target.name}のLv.${targetCard.rank} ${ROLE_DEFINITIONS[targetCard.rank].shortName}が敗れ脱落）`;
                logHighlight = 'elimination';
                speech = `我が剣の勝ちだ、${target.name}！`;
              } else if (actorCard.rank < targetCard.rank) {
                mutableActor.isEliminated = true;
                mutableActor.eliminatedReason = `${target.name}への決闘で返り討ち（Lv.${actorCard.rank} 対 Lv.${targetCard.rank}）`;
                mutableActor.discards.push(actorCard);
                mutableActor.hand = [];
                // Target now knows actor is out, and actor learned target is higher
                logText = `${mutableActor.name}が「Lv.3 決闘騎士」で${target.name}に挑んだが、返り討ちに遭い脱落！（${mutableActor.name}のLv.${actorCard.rank} ${ROLE_DEFINITIONS[actorCard.rank].shortName}が敗北）`;
                logHighlight = 'elimination';
                speech = `くっ…${target.name}の方が格上だったとは…！`;
              } else {
                // Tie: both survive and know each other's rank!
                mutableActor.knownOpponentHands[target.id] = {
                  rank: targetCard.rank,
                  reason: 'Lv.3 決闘引き分けで判明',
                };
                target.knownOpponentHands[mutableActor.id] = {
                  rank: actorCard.rank,
                  reason: 'Lv.3 決闘引き分けで判明',
                };
                logText = `${mutableActor.name}と${target.name}の「Lv.3 決闘騎士」は互角の同ランク引き分け！両者とも生存した。`;
                speech = `互角の剣筋…引き分けだな！`;
              }
            }
          }
          break;
        }

        case 4: {
          // Aegis Sister
          audioRef.current?.playCrystalShield();
          mutableActor.isProtected = true;
          logText = `${mutableActor.name}は「Lv.4 結界の修道女」を祈り、次の自分の手番まで守護結界を張った！`;
          logHighlight = 'shield';
          speech = '聖なる守護結界よ、あらゆる干渉を退けよ！';
          break;
        }

        case 5: {
          // Royal Arcanist
          audioRef.current?.playMagicChime();
          const chosenTarget = target ?? mutableActor;
          const discarded = chosenTarget.hand.shift();
          // Anyone who knew chosenTarget's old hand loses that certainty
          for (const p of nextPlayers) {
            delete p.knownOpponentHands[chosenTarget.id];
          }
          if (discarded) {
            chosenTarget.discards.push(discarded);
            if (discarded.rank === 8) {
              audioRef.current?.playElimination();
              chosenTarget.isEliminated = true;
              chosenTarget.eliminatedReason = `${mutableActor.name}の宮廷魔導師により「Lv.8 王女セレスティア」を捨てさせられ脱落`;
              logText = `${mutableActor.name}の「Lv.5 宮廷魔導師」が${chosenTarget.name}の手札を破棄させた結果、「Lv.8 王女セレスティア」が暴かれ${chosenTarget.name}は即時脱落！`;
              logHighlight = 'elimination';
              speech = `王女セレスティアを暴いたぞ！これで脱落だ！`;
            } else {
              // Draw replacement from deck (or hiddenDecree if deck is empty)
              let replacement = nextDeck.shift() ?? null;
              if (!replacement && nextHiddenDecree) {
                replacement = nextHiddenDecree;
                nextHiddenDecree = null;
              }
              if (replacement) {
                chosenTarget.hand.push(replacement);
              }
              logText = `${mutableActor.name}の「Lv.5 宮廷魔導師」により、${chosenTarget.name}は「Lv.${discarded.rank} ${ROLE_DEFINITIONS[discarded.rank].name}」を捨てて新しい1枚を引いた。`;
              speech = `${chosenTarget.name}の手札を魔導の風で入れ替えさせてもらう！`;
            }
          }
          break;
        }

        case 6: {
          // Grand Cardinal
          audioRef.current?.playMagicChime();
          if (!target) {
            logText = `${mutableActor.name}は「Lv.6 枢機卿」を出したが、全員が守護結界中のため手札交換は起きなかった。`;
            speech = '交換すべき相手が結界の中か…';
          } else {
            const actorRemaining = mutableActor.hand[0];
            const targetRemaining = target.hand[0];
            if (actorRemaining && targetRemaining) {
              mutableActor.hand = [targetRemaining];
              target.hand = [actorRemaining];
              // Both players now know the exact card the other holds!
              mutableActor.knownOpponentHands[target.id] = {
                rank: actorRemaining.rank,
                reason: 'Lv.6 枢機卿で渡したカード',
              };
              target.knownOpponentHands[mutableActor.id] = {
                rank: targetRemaining.rank,
                reason: 'Lv.6 枢機卿で奪われたカード',
              };
              logText = `${mutableActor.name}は「Lv.6 枢機卿」の権威を発動し、${target.name}と残りの手札を強制交換した！`;
              logHighlight = 'swap';
              speech = `${target.name}よ、枢機卿の勅命により手札を交換する！`;
            }
          }
          break;
        }

        case 7: {
          // Archduchess
          audioRef.current?.playCardDraw();
          logText = `${mutableActor.name}は「Lv.7 女公爵」を優雅に場へ出した（手札に高位の密使を秘めているのか、それともブラフか…？）。`;
          speech = 'ふふ、女公爵はここで退場して差し上げますわ。';
          break;
        }

        case 8: {
          // Princess Celestia (self-elimination if played!)
          audioRef.current?.playElimination();
          mutableActor.isEliminated = true;
          mutableActor.eliminatedReason = '自ら「Lv.8 王女セレスティア」を場に出してしまい脱落';
          if (mutableActor.hand[0]) {
            mutableActor.discards.push(mutableActor.hand[0]);
            mutableActor.hand = [];
          }
          logText = `${mutableActor.name}は「Lv.8 王女セレスティア」を場に出してしまったため、規定により即時脱落となった！`;
          logHighlight = 'elimination';
          speech = 'しまった、王女を場に出してしまった…！';
          break;
        }
      }

      mutableActor.speechBubble = speech;

      const newLogEntry: ActionLogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        round: roundNumber,
        turn: turnCounter,
        actorName: mutableActor.name,
        rank: playedCard.rank,
        text: logText,
        highlight: logHighlight,
      };
      const updatedLogs = [newLogEntry, ...logs];

      // Check if round ends: either <= 1 survivor OR deck is empty
      const alivePlayers = nextPlayers.filter((p) => !p.isEliminated);
      if (alivePlayers.length <= 1 || nextDeck.length === 0) {
        setHiddenDecree(nextHiddenDecree);
        finalizeRound(
          nextPlayers,
          nextDeck,
          nextHiddenDecree,
          updatedLogs,
          roundNumber,
          turnCounter
        );
        return;
      }

      // Advance to next surviving player
      let nextIdx = (activePlayerIdx + 1) % nextPlayers.length;
      while (nextPlayers[nextIdx].isEliminated) {
        nextIdx = (nextIdx + 1) % nextPlayers.length;
      }

      const nextTurnPlayer = nextPlayers[nextIdx];
      // Protection wears off at the start of that player's turn
      nextTurnPlayer.isProtected = false;

      // Draw 1 card from deck for nextTurnPlayer
      const drawn = nextDeck.shift();
      if (drawn) {
        nextTurnPlayer.hand.push(drawn);
      }

      setDeck(nextDeck);
      setHiddenDecree(nextHiddenDecree);
      setPlayers(nextPlayers);
      setActivePlayerIdx(nextIdx);
      setTurnCounter((t) => t + 1);
      setSelectedCardId(nextTurnPlayer.hand[0]?.id ?? null);
      setSelectedTargetId(null);
      setLogs(updatedLogs);
      if (gameMode === 'pvp2') {
        setPvpPrivacyGate(true);
      }
      setBannerMessage({
        title: `${mutableActor.name}：「Lv.${playedCard.rank} ${ROLE_DEFINITIONS[playedCard.rank].name}」`,
        subtitle: logText,
        tone:
          logHighlight === 'elimination'
            ? 'crimson'
            : logHighlight === 'shield'
            ? 'emerald'
            : 'sky',
      });
    },
    [
      roundSummary,
      matchWinner,
      players,
      activePlayerIdx,
      deck,
      hiddenDecree,
      roundNumber,
      turnCounter,
      logs,
      finalizeRound,
      gameMode,
    ]
  );

  // ==========================================================================
  // Intelligent AI Decision Engine (Claude / Eleanor / Marcus) + Human Hint
  // ==========================================================================

  const computeRecommendation = useCallback(
    (actor: PlayerState) => {
      if (!actor || actor.hand.length === 0) return null;

      const hand = actor.hand;
      const aliveOpponents = players.filter(
        (p) => !p.isEliminated && p.id !== actor.id && !p.isProtected
      );

      // 1. Check mandatory Lv.7 Archduchess rule
      if (mustPlayArchduchess(hand)) {
        const archCard = hand.find((c) => c.rank === 7)!;
        return {
          card: archCard,
          targetId: null,
          guessRank: 2 as CardRank,
          reason:
            '手札に「Lv.5 魔導師」または「Lv.6 枢機卿」があるため、ルールにより必ず「Lv.7 女公爵」を出す必要があります。',
        };
      }

      // Never play Lv.8 Princess!
      const playableCards = hand.filter((c) => c.rank !== 8);
      const candidates = playableCards.length > 0 ? playableCards : [hand[0]];

      // Calculate unseen counts for smart guessing (exclude publicly played + actor's own hand)
      const unseenCounts: Record<CardRank, number> = {
        1: 5,
        2: 2,
        3: 2,
        4: 2,
        5: 2,
        6: 1,
        7: 1,
        8: 1,
      };
      for (const c of faceUpExiles) unseenCounts[c.rank] = Math.max(0, unseenCounts[c.rank] - 1);
      for (const p of players) {
        for (const d of p.discards) unseenCounts[d.rank] = Math.max(0, unseenCounts[d.rank] - 1);
      }
      for (const c of actor.hand) unseenCounts[c.rank] = Math.max(0, unseenCounts[c.rank] - 1);

      // Best guess rank (2..8) based on highest remaining unseen count
      let bestProbableGuess: CardRank = 2;
      let bestCount = -1;
      for (const r of [2, 3, 4, 5, 6, 7, 8] as CardRank[]) {
        if (unseenCounts[r] > bestCount) {
          bestCount = unseenCounts[r];
          bestProbableGuess = r;
        }
      }

      // Check if actor knows any unprotected opponent's exact hand!
      for (const opp of aliveOpponents) {
        const known = actor.knownOpponentHands[opp.id];
        if (known) {
          // If we have Lv.1 Sentinel and opponent holds Lv.2..8, 100% sniper kill!
          const sentinel = candidates.find((c) => c.rank === 1);
          if (sentinel && known.rank >= 2) {
            return {
              card: sentinel,
              targetId: opp.id,
              guessRank: known.rank,
              reason: `${opp.name}の正体（Lv.${known.rank} ${ROLE_DEFINITIONS[known.rank].shortName}）が判明しているため、「Lv.1 城門の衛兵」で100%確実に狙撃できます！`,
            };
          }
          // If we have Lv.5 Mage and opponent holds Lv.8 Princess, 100% elimination!
          const mage = candidates.find((c) => c.rank === 5);
          if (mage && known.rank === 8) {
            return {
              card: mage,
              targetId: opp.id,
              guessRank: 8 as CardRank,
              reason: `${opp.name}が「Lv.8 王女セレスティア」を持っているため、「Lv.5 宮廷魔導師」で捨てさせれば即時脱落させられます！`,
            };
          }
          // If we have Lv.3 Duelist Knight and our other card beats opponent's known rank
          const knight = candidates.find((c) => c.rank === 3);
          const otherCard = hand.find((c) => c.id !== knight?.id);
          if (knight && otherCard && otherCard.rank > known.rank) {
            return {
              card: knight,
              targetId: opp.id,
              guessRank: known.rank,
              reason: `残りの手札（Lv.${otherCard.rank}）が${opp.name}の判明手札（Lv.${known.rank}）を上回るため、「Lv.3 決闘騎士」で確実に勝利できます！`,
            };
          }
        }
      }

      // Priority heuristics:
      // Prefer keeping higher-rank card in hand and playing lower-rank utility card,
      // unless Lv.3 Knight would risk losing a low card or Lv.6 Cardinal would give away Lv.8 Princess!
      const sortedAsc = [...candidates].sort((a, b) => a.rank - b.rank);
      let chosenCard = sortedAsc[0];

      // Avoid playing Lv.3 Knight if our remaining card is <= 3 and we have another safe play
      if (chosenCard.rank === 3 && candidates.length > 1) {
        const other = candidates.find((c) => c.id !== chosenCard.id)!;
        if (other.rank <= 3) {
          chosenCard = other;
        }
      }

      // Avoid playing Lv.6 Cardinal if our other card is Lv.8 Princess or Lv.7 Archduchess
      if (chosenCard.rank === 6 && candidates.length > 1) {
        const other = candidates.find((c) => c.id !== chosenCard.id)!;
        if (other.rank >= 7) {
          chosenCard = other;
        }
      }

      // Choose best target
      const targetLeader =
        [...aliveOpponents].sort((a, b) => b.seals - a.seals)[0] ?? null;

      let chosenTargetId: string | null = targetLeader?.id ?? null;
      let chosenGuess: CardRank = bestProbableGuess;

      // Smart deduction: if target recently played Lv.7 Archduchess, they very likely hold Lv.5, Lv.6, or Lv.8!
      if (chosenCard.rank === 1 && targetLeader) {
        const lastDiscard =
          targetLeader.discards[targetLeader.discards.length - 1];
        if (lastDiscard?.rank === 7) {
          if (unseenCounts[6] > 0) chosenGuess = 6;
          else if (unseenCounts[5] > 0) chosenGuess = 5;
          else if (unseenCounts[8] > 0) chosenGuess = 8;
        }
      }

      if (chosenCard.rank === 5 && !chosenTargetId) {
        chosenTargetId = actor.id;
      }

      return {
        card: chosenCard,
        targetId: chosenTargetId,
        guessRank: chosenGuess,
        reason:
          chosenCard.rank === 1
            ? `手元に高ランク札を残しつつ、「Lv.1 城門の衛兵」で未公開枚数の多い「Lv.${chosenGuess} ${ROLE_DEFINITIONS[chosenGuess].shortName}」を宣言する手が有力です。`
            : chosenCard.rank === 4
            ? '「Lv.4 結界の修道女」で次の手番まで指名を完全シャットアウトするのが安全です。'
            : `より高いランクの手札を温存し、「Lv.${chosenCard.rank} ${ROLE_DEFINITIONS[chosenCard.rank].name}」を切って盤面を動かすのが最善です。`,
      };
    },
    [players, faceUpExiles]
  );

  // Trigger AI turn automatically when activePlayer is CPU
  useEffect(() => {
    if (!activePlayer || activePlayer.isHuman || roundSummary || matchWinner) {
      return;
    }
    const timer = window.setTimeout(() => {
      const rec = computeRecommendation(activePlayer);
      if (rec) {
        executeCardPlay(rec.card.id, rec.targetId, rec.guessRank);
      }
    }, 950);
    return () => window.clearTimeout(timer);
  }, [activePlayer, roundSummary, matchWinner, computeRecommendation, executeCardPlay]);

  const humanRecommendation = useMemo(() => {
    if (!activePlayer || !activePlayer.isHuman || roundSummary || matchWinner) {
      return null;
    }
    return computeRecommendation(activePlayer);
  }, [activePlayer, roundSummary, matchWinner, computeRecommendation]);

  const applyHumanRecommendation = () => {
    if (!humanRecommendation) return;
    setSelectedCardId(humanRecommendation.card.id);
    if (humanRecommendation.targetId) {
      setSelectedTargetId(humanRecommendation.targetId);
    }
    setGuessedRank(humanRecommendation.guessRank);
  };

  // ==========================================================================
  // Render
  // ==========================================================================

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
                <span className="tabletop-kicker">Royal Courier</span>
                <span className="tabletop-chip inline-flex min-h-7 items-center px-2.5 text-[11px]">
                  全16枚・手札1枚の宮廷推理
                </span>
              </div>
              <h2 className="tabletop-title truncate text-lg sm:text-xl">王宮の密使</h2>
              <p className="tabletop-muted hidden text-[13px] sm:block">
                16枚デッキを読み切る、手札1枚の宮廷サバイバル
              </p>
            </div>
          </div>

          {/* Mode, Audio & Rules Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <select
              aria-label="対戦モード選択"
              value={gameMode}
              onChange={(e) => handleRestartMatch(e.target.value as GameMode)}
              className="tabletop-button min-h-11 cursor-pointer px-2.5 text-xs text-[#f4ead8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c99555]"
            >
              <option value="cpu4">CPU対戦 4人テーブル（推奨）</option>
              <option value="cpu3">CPU対戦 3人テーブル</option>
              <option value="cpu2">CPU対戦 2人一騎打ち</option>
              <option value="pvp2">1台で2人対戦（パス＆プレイ）</option>
            </select>

            <select
              aria-label="勝利封蝋数選択"
              value={targetSeals}
              onChange={(e) => handleRestartMatch(undefined, Number(e.target.value))}
              className="tabletop-button min-h-11 cursor-pointer px-2.5 text-xs text-[#f4ead8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c99555]"
            >
              <option value={3}>3封蝋先取（標準）</option>
              <option value={4}>4封蝋先取（ロング）</option>
              <option value={2}>2封蝋先取（短時間）</option>
            </select>

            <button
              type="button"
              onClick={handleToggleBgm}
              className={`inline-flex min-h-11 items-center px-3 text-xs font-semibold transition ${
                bgmOn ? 'tabletop-chip tabletop-chip-active border font-bold' : 'tabletop-chip'
              }`}
            >
               BGM {bgmOn ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={handleToggleSfx}
              className={`inline-flex min-h-11 items-center px-3 text-xs font-semibold transition ${
                sfxOn ? 'tabletop-chip tabletop-chip-active border font-bold' : 'tabletop-chip'
              }`}
            >
               効果音 {sfxOn ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="tabletop-button inline-flex min-h-11 items-center px-2.5 text-xs"
            >
               役職・ルール
            </button>

            <button
              type="button"
              onClick={() => handleRestartMatch()}
              className="tabletop-button-primary inline-flex min-h-11 items-center px-3 text-xs font-bold"
            >
              ↻ 新規対局
            </button>

            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-6">
        {/* Top Status Banner & Deck / Hidden Royal Decree Bar */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
          {/* Center Dramatic Event Banner */}
          <div className="tabletop-panel flex flex-col justify-between p-3.5 sm:p-4 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabletop-chip tabletop-chip-active inline-flex min-h-7 items-center px-2.5 text-[11px] font-bold">
                  第 {roundNumber} ラウンド・{turnCounter} 手目
                </span>
                {activePlayer && !roundSummary && (
                  <span className="tabletop-chip inline-flex min-h-7 items-center px-2.5 text-[11px] font-bold">
                    手番：{activePlayer.name}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#b9a88f]">
                勝利条件：封蝋トークン  <strong className="text-[#dfb06d]">{targetSeals}個</strong> 先取
              </span>
            </div>

            {bannerMessage && (
              <div className="tabletop-panel-soft mt-3 px-3.5 py-2.5">
                <p className="text-sm font-bold text-[#dfb06d]">{bannerMessage.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#c9b79d]">
                  {bannerMessage.subtitle}
                </p>
              </div>
            )}
          </div>

          {/* Royal Court Deck & Hidden Decree Status */}
          <div className="tabletop-panel flex flex-wrap items-center justify-between gap-4 p-3.5 sm:p-4 lg:col-span-5">
            <div className="flex items-center gap-3">
              {/* Deck Stack Visual */}
              <div className="relative flex h-20 w-14 flex-col items-center justify-center rounded-md border border-[#6b543d] bg-[#2a211a]">
                <span className="text-[11px] font-bold text-[#dfb06d]">山札</span>
                <span className="text-2xl font-black text-[#f4ead8]">{deck.length}</span>
                <span className="text-[11px] text-[#9c8d78]">枚</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#e8dcc8]">王宮密使デッキ（全16枚）</p>
                <p className="mt-0.5 text-[11px] text-[#b9a88f]">
                  山札が0枚になるか、生存者が1人になるとラウンド決着
                </p>
                {faceUpExiles.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#dfb06d]">
                      2人戦公開除外（3枚）：
                    </span>
                    {faceUpExiles.map((c) => (
                      <span
                        key={c.id}
                        className="tabletop-chip inline-flex min-h-6 items-center px-1.5 text-[11px] font-bold"
                      >
                        Lv.{c.rank} {ROLE_DEFINITIONS[c.rank].shortName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hidden Royal Decree (伏せ密書 1枚) */}
            <div
              className="tabletop-panel-soft flex min-w-[110px] flex-col items-center justify-center border-dashed border-[#6b543d] px-3 py-2 text-center"
              title="ラウンド開始時に裏向きで1枚除外された「伏せ密書」。最後まで誰の手にも渡らない可能性があるため、完全なカウンティングに揺らぎを生みます（山札0枚時にLv.5魔導師が使われた場合のみ引かれます）。"
            >
              <span className="text-[11px] font-bold tracking-wider text-[#dfb06d]">
                 伏せ密書
              </span>
              {roundSummary && roundSummary.hiddenDecree ? (
                <span className="mt-1 text-xs font-extrabold text-[#e0a9a2]">
                  Lv.{roundSummary.hiddenDecree.rank}{' '}
                  {ROLE_DEFINITIONS[roundSummary.hiddenDecree.rank].shortName}
                </span>
              ) : hiddenDecree ? (
                <span className="mt-1 text-xs font-bold text-[#e8dcc8]">裏向き封印（1枚）</span>
              ) : (
                <span className="mt-1 text-xs font-bold text-[#7f7261]">魔導師で引かれ済</span>
              )}
              <span className="mt-0.5 text-[11px] text-[#9c8d78]">
                {roundSummary ? 'ラウンド終了公開' : '正体不明の1枚'}
              </span>
            </div>
          </div>
        </div>

        {/* Main 12-Col Grid: Left Table & Hand (8 cols) | Right Live Deduction Matrix & Logs (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 8 Columns: Players Table + Active Player Hand & Action Console */}
          <div className="lg:col-span-8 space-y-5">
            {/* Players Court Table Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {players.map((p, idx) => {
                const isTurn = idx === activePlayerIdx && !roundSummary && !matchWinner;
                const knownByViewer =
                  viewerPlayer && viewerPlayer.id !== p.id
                    ? viewerPlayer.knownOpponentHands[p.id]
                    : undefined;

                return (
                  <div
                    key={p.id}
                    className={`relative rounded-md border p-3.5 transition-all ${
                      p.isEliminated
                        ? 'border-[#3a2e23] bg-[#1d1712] opacity-60'
                        : isTurn
                        ? 'border-[#c99555] bg-[#2a211a] ring-1 ring-[#c99555]'
                        : 'tabletop-panel-soft'
                    }`}
                  >
                    {/* Header: Name, Title, Seals */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-[#f4ead8]">
                            {p.name}
                          </span>
                          <span className="tabletop-chip inline-flex min-h-6 items-center px-1.5 text-[11px] font-semibold">
                            {p.title}
                          </span>
                          {isTurn && (
                            <span className="inline-flex min-h-6 items-center rounded-sm bg-[#c99555] px-2 text-[11px] font-black text-[#1b120b]">
                              手番中
                            </span>
                          )}
                        </div>

                        {/* Status Badges: Shield / Eliminated / Known Identity */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {p.isProtected && !p.isEliminated && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#315d4e] bg-[#14211b] px-2 py-0.5 text-[11px] font-bold text-[#a9cdb7]">
                              ️ 守護結界中（指名無効）
                            </span>
                          )}
                          {p.isEliminated && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#6b3a36] bg-[#241615] px-2 py-0.5 text-[11px] font-bold text-[#e0a9a2]">
                               脱落（{p.eliminatedReason ?? '脱落'}）
                            </span>
                          )}
                          {!p.isEliminated && knownByViewer && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#3f5f78] bg-[#131d24] px-2.5 py-0.5 text-[11px] font-bold text-[#a9c8da]">
                              ️ 正体判明：Lv.{knownByViewer.rank}{' '}
                              {ROLE_DEFINITIONS[knownByViewer.rank].name}（{knownByViewer.reason}）
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Royal Wax Seals */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: targetSeals }).map((_, sIdx) => (
                          <WaxSealBadge key={sIdx} active={sIdx < p.seals} />
                        ))}
                      </div>
                    </div>

                    {/* Speech Bubble (AI or Character Reaction) */}
                    {p.speechBubble && (
                      <div className="tabletop-panel-soft mt-2.5 px-3 py-1.5 text-xs italic text-[#d8cbb8]">
                         「{p.speechBubble}」
                      </div>
                    )}

                    {/* Current Hand Summary (Hidden for opponents unless round ended or peeked) */}
                    <div className="mt-3 flex items-center justify-between border-t border-[#4d3d2d] pt-2.5 text-xs">
                      <span className="text-[#b9a88f]">
                        所持手札：<strong className="text-[#e8dcc8]">{p.hand.length}枚</strong>
                      </span>
                      {roundSummary && !p.isEliminated && p.hand[0] && (
                        <span className="tabletop-chip tabletop-chip-active inline-flex min-h-6 items-center px-2 text-[11px] font-bold">
                          公開手札：Lv.{p.hand[0].rank}{' '}
                          {ROLE_DEFINITIONS[p.hand[0].rank].name}
                        </span>
                      )}
                    </div>

                    {/* Face-up Discards History */}
                    <div className="mt-2">
                      <p className="mb-1 text-[11px] font-semibold text-[#b9a88f]">
                        場に出した捨て札（公開情報）
                      </p>
                      {p.discards.length === 0 ? (
                        <span className="text-[11px] text-[#7f7261]">まだ捨て札はありません</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {p.discards.map((d, dIdx) => {
                            const rDef = ROLE_DEFINITIONS[d.rank];
                            return (
                              <span
                                key={d.id}
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${rDef.colorTheme.badge}`}
                              >
                                <span className="opacity-70">{dIdx + 1}.</span> Lv.{d.rank}{' '}
                                {rDef.shortName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pass-and-Play Privacy Gate Modal/Card */}
            {gameMode === 'pvp2' && pvpPrivacyGate && activePlayer && !roundSummary && !matchWinner && (
              <div className="tabletop-panel border-[#6b543d] p-5 text-center sm:p-6">
                <p className="tabletop-kicker !text-[11px]">
                  Pass &amp; Play Privacy Shield
                </p>
                <h3 className="tabletop-title mt-1 text-xl">
                  次は「{activePlayer.name}」の手番です
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#c9b79d]">
                  相手プレイヤーに手札が見えないよう端末を受け渡してから、下のボタンを押して手札を開いてください。
                </p>
                <button
                  type="button"
                  onClick={() => setPvpPrivacyGate(false)}
                  className="tabletop-button-primary mt-4 inline-flex min-h-11 items-center px-5 text-sm font-black"
                >
                  ️ {activePlayer.name}の手札を表示する
                </button>
              </div>
            )}

            {/* Round Summary / Next Round Modal Box */}
            {roundSummary && (
              <div className="tabletop-panel space-y-4 border-[#6b543d] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="tabletop-kicker !text-[11px]">
                      Round {roundSummary.roundNumber} Result
                    </span>
                    <h3 className="tabletop-title text-lg sm:text-xl">
                       {roundSummary.winnerNames.join('・')} が王宮の封蝋を獲得
                    </h3>
                  </div>
                  {roundSummary.hiddenDecree && (
                    <div className="tabletop-panel-soft px-3 py-1.5 text-xs">
                      <span className="text-[#b9a88f]">今回の伏せ密書：</span>{' '}
                      <strong className="text-[#dfb06d]">
                        Lv.{roundSummary.hiddenDecree.rank}{' '}
                        {ROLE_DEFINITIONS[roundSummary.hiddenDecree.rank].name}
                      </strong>
                    </div>
                  )}
                </div>

                <p className="text-[13px] leading-relaxed text-[#d8cbb8]">
                  {roundSummary.reason}
                </p>

                {roundSummary.survivingHands.length > 0 && (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {roundSummary.survivingHands.map((sh) => (
                      <div
                        key={sh.playerId}
                        className="tabletop-panel-soft flex items-center justify-between px-3.5 py-2.5"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#e8dcc8]">{sh.playerName}</p>
                          <p className="text-[11px] text-[#b9a88f]">
                            捨て札合計ランク：{sh.totalDiscardScore}
                          </p>
                        </div>
                        {sh.card ? (
                          <span className="tabletop-chip tabletop-chip-active inline-flex min-h-7 items-center px-2.5 text-xs font-extrabold">
                            Lv.{sh.card.rank} {ROLE_DEFINITIONS[sh.card.rank].name}
                          </span>
                        ) : (
                          <span className="text-xs text-[#b9a88f]">手札なし</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  {matchWinner ? (
                    <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md border border-[#6b543d] bg-[#3a2a1c] px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-[#f4ead8]">
                           最終優勝：{matchWinner.name}（封蝋 {matchWinner.seals}個 達成）
                        </p>
                        <p className="text-xs text-[#c9b79d]">
                          見事な宮廷推理と心理戦で王宮筆頭密使の栄冠を勝ち取りました。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestartMatch()}
                        className="tabletop-button-primary inline-flex min-h-11 items-center px-5 text-xs font-black sm:text-sm"
                      >
                         新しい対局を始める
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const winnerIdx = players.findIndex((p) =>
                          roundSummary.winnerIds.includes(p.id)
                        );
                        startRound(
                          players,
                          gameMode,
                          roundNumber + 1,
                          winnerIdx >= 0 ? winnerIdx : 0
                        );
                      }}
                      className="tabletop-button-primary inline-flex min-h-11 items-center px-6 text-sm font-black"
                    >
                       第 {roundNumber + 1} ラウンドへ進む
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Human Player Active Turn Hand & Target Selection Console */}
            {activePlayer &&
              activePlayer.isHuman &&
              !pvpPrivacyGate &&
              !roundSummary &&
              !matchWinner && (
                <div className="tabletop-panel space-y-4 border-[#6b543d] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="tabletop-kicker !text-[11px]">
                        Your Turn — Choose 1 Card
                      </span>
                      <h3 className="tabletop-title text-base sm:text-lg">
                        {activePlayer.name}の手札（2枚のうち1枚を場に出して効果を発動）
                      </h3>
                    </div>

                    {humanRecommendation && (
                      <button
                        type="button"
                        onClick={applyHumanRecommendation}
                        className="tabletop-button inline-flex min-h-11 items-center px-3 text-xs font-bold text-[#a9c8da]"
                      >
                         AI推奨手をセット
                      </button>
                    )}
                  </div>

                  {/* Mandatory Lv.7 Archduchess Alert */}
                  {mustPlayArchduchess(activePlayer.hand) && (
                    <div className="rounded-md border border-[#6b3a36] bg-[#241615] px-3.5 py-2 text-xs font-bold text-[#e0a9a2]">
                      ️ 宮廷儀礼ルール：手札に「Lv.5 宮廷魔導師」または「Lv.6 枢機卿」があるため、この手番は必ず「Lv.7 女公爵」を場に出さなければなりません。
                    </div>
                  )}

                  {/* Two Cards in Hand */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {activePlayer.hand.map((card) => {
                      const def = ROLE_DEFINITIONS[card.rank];
                      const isSelected = (selectedCardObj?.id ?? '') === card.id;
                      const lockedByArchduchess =
                        card.rank !== 7 && mustPlayArchduchess(activePlayer.hand);

                      return (
                        <button
                          key={card.id}
                          type="button"
                          disabled={lockedByArchduchess}
                          onClick={() => setSelectedCardId(card.id)}
                          className={`group relative flex flex-col justify-between rounded-md border p-4 text-left transition-all ${
                            lockedByArchduchess
                              ? 'cursor-not-allowed border-[#3a2e23] bg-[#1d1712] opacity-45'
                              : isSelected
                              ? 'border-[#c99555] bg-[#3a2a1c] ring-1 ring-[#c99555]'
                              : 'border-[#4d3d2d] bg-[#241c15] hover:border-[#6b543d]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-[#c99555] text-sm font-black text-[#1b120b]">
                                  {card.rank}
                                </span>
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#d8a86f]">
                                    {def.titleEn}
                                  </p>
                                  <h4 className="text-base font-bold text-[#f4ead8]">
                                    {def.name}
                                  </h4>
                                </div>
                              </div>
                            </div>
                            <RoleCrestSvg rank={card.rank} className="h-14 w-14 shrink-0" />
                          </div>

                          <p className="mt-3 text-xs leading-relaxed text-[#c9b79d]">
                            {def.detail}
                          </p>

                          <div className="mt-3 flex items-center justify-between border-t border-[#4d3d2d] pt-2 text-[11px]">
                            <span className="text-[#9c8d78]">
                              デッキ総数：{def.countInDeck}枚
                            </span>
                            <span
                              className={`font-bold ${
                                isSelected ? 'text-[#dfb06d]' : 'text-[#9c8d78]'
                              }`}
                            >
                              {isSelected ? '✓ 選択中' : 'クリックして選択'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Target & Role Guess Selector */}
                  {selectedCardObj && (
                    <div className="tabletop-panel-soft space-y-3 p-3.5">
                      {ROLE_DEFINITIONS[selectedCardObj.rank].targetMode !== 'none' && (
                        <div>
                          <p className="mb-2 text-xs font-bold text-[#dfb06d]">
                             指名する対象プレイヤー
                          </p>
                          {validTargets.length === 0 ? (
                            <p className="text-xs text-[#a9cdb7]">
                              他プレイヤー全員が「️ 守護結界」中のため、指名なしでカードのみ場に出します。
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {validTargets.map((t) => {
                                const known = activePlayer.knownOpponentHands[t.id];
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedTargetId(t.id)}
                                    className={`inline-flex min-h-11 items-center rounded-md border px-3.5 text-xs font-bold transition ${
                                      selectedTargetId === t.id
                                        ? 'border-[#c99555] bg-[#3a2a1c] text-[#dfb06d]'
                                        : 'border-[#4d3d2d] bg-[#241c15] text-[#d8cbb8] hover:border-[#6b543d]'
                                    }`}
                                  >
                                    {t.name}
                                    {t.id === activePlayer.id ? '（自分自身）' : ''}
                                    {known
                                      ? ` [️ Lv.${known.rank} ${ROLE_DEFINITIONS[known.rank].shortName}]`
                                      : ''}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lv.1 Gate Sentinel Role Guess Buttons (Lv.2 .. Lv.8) */}
                      {selectedCardObj.rank === 1 && validTargets.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold text-[#dfb06d]">
                            ️ 宣言する相手の役職（Lv.2〜Lv.8）
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {([2, 3, 4, 5, 6, 7, 8] as CardRank[]).map((r) => {
                              const rDef = ROLE_DEFINITIONS[r];
                              const mat = cardCountingMatrix.find((m) => m.rank === r);
                              const rem = mat?.remaining ?? 0;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setGuessedRank(r)}
                                  className={`min-h-11 rounded-md border px-2.5 py-2 text-left text-xs transition ${
                                    guessedRank === r
                                      ? 'border-[#c99555] bg-[#3a2a1c] font-bold text-[#dfb06d]'
                                      : 'border-[#4d3d2d] bg-[#241c15] text-[#d8cbb8] hover:border-[#6b543d]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>
                                      Lv.{r} {rDef.shortName}
                                    </span>
                                    <span
                                      className={`rounded-sm px-1.5 py-0.5 text-[11px] ${
                                        rem > 0
                                          ? 'border border-[#6b543d] bg-[#3a2a1c] text-[#dfb06d]'
                                          : 'bg-[#1d1712] text-[#7f7261]'
                                      }`}
                                    >
                                      未公開 {rem}枚
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* AI Recommendation Reason Preview */}
                      {humanRecommendation && (
                        <p className="text-[11px] leading-relaxed text-[#a9c8da]">
                           参謀の助言：{humanRecommendation.reason}
                        </p>
                      )}

                      {/* Confirm Play Button */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            executeCardPlay(
                              selectedCardObj.id,
                              selectedTargetId,
                              guessedRank
                            )
                          }
                          className="tabletop-button-primary inline-flex min-h-11 items-center px-5 text-sm font-black"
                        >
                           「Lv.{selectedCardObj.rank}{' '}
                          {ROLE_DEFINITIONS[selectedCardObj.rank].name}」を場に出す
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Right 4 Columns: Live 16-Card Counting & Deduction Tracker + Court Chronicles Log */}
          <div className="space-y-5 lg:col-span-4">
            {/* Live Card-Counting & Deduction Matrix */}
            <div className="tabletop-panel p-3.5 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#4d3d2d] pb-2.5">
                <div>
                  <span className="tabletop-kicker !text-[11px]">
                    Deduction Matrix
                  </span>
                  <h3 className="tabletop-title text-sm">
                    全16枚カウンティング＆生存確率
                  </h3>
                </div>
                <span className="tabletop-chip inline-flex min-h-7 items-center px-2 text-[11px] font-bold">
                  残り未知：{deck.length + players.reduce((acc, p) => acc + p.hand.length, 0) + (hiddenDecree ? 1 : 0)}枚
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {cardCountingMatrix.map((row) => (
                  <div
                    key={row.rank}
                    className={`rounded-md border px-3 py-2 transition ${
                      row.remaining === 0
                        ? 'border-[#3a2e23] bg-[#1d1712] opacity-50'
                        : 'tabletop-panel-soft'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-[#c99555] text-[11px] font-black text-[#1b120b]">
                          {row.rank}
                        </span>
                        <span className="text-xs font-bold text-[#e8dcc8]">
                          {row.def.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-[#9c8d78]">
                          公開済 {row.played}/{row.total}
                        </span>
                        <span
                          className={`rounded-sm border px-1.5 py-0.5 font-bold ${
                            row.remaining > 0
                              ? 'border-[#6b543d] bg-[#3a2a1c] text-[#dfb06d]'
                              : 'border-[#3a2e23] bg-[#1d1712] text-[#7f7261]'
                          }`}
                        >
                          残り {row.remaining}枚
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#9c8d78]">{row.def.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Royal Court Chronicles (Action Log) */}
            <div className="tabletop-panel p-3.5 sm:p-4">
              <h3 className="tabletop-title border-b border-[#4d3d2d] pb-2 text-sm">
                 宮廷年代記（推理想定ログ）
              </h3>
              <div className="mt-2.5 max-h-64 space-y-2 overflow-y-auto pr-1">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-md border px-2.5 py-2 text-xs leading-relaxed ${
                      entry.highlight === 'elimination'
                        ? 'border-[#6b3a36] bg-[#241615] text-[#e0a9a2]'
                        : entry.highlight === 'win'
                        ? 'border-[#6b543d] bg-[#3a2a1c] font-semibold text-[#dfb06d]'
                        : entry.highlight === 'peek'
                        ? 'border-[#3f5f78] bg-[#131d24] text-[#a9c8da]'
                        : entry.highlight === 'shield'
                        ? 'border-[#315d4e] bg-[#14211b] text-[#a9cdb7]'
                        : 'tabletop-panel-soft text-[#c9b79d]'
                    }`}
                  >
                    <span className="mr-1.5 text-[11px] font-bold text-[#c99555]">
                      [R{entry.round}-T{entry.turn}]
                    </span>
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Encyclopedia & Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="tabletop-panel max-h-[88vh] w-full max-w-3xl space-y-4 overflow-y-auto p-4 text-[#e8dcc8] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#4d3d2d] pb-3">
              <div>
                <span className="tabletop-kicker !text-[11px]">
                  Royal Courier Encyclopedia
                </span>
                <h3 className="tabletop-title text-lg">
                  『王宮の密使』全8役職（16枚デッキ）＆ルール早見表
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="tabletop-button inline-flex min-h-11 items-center px-3 text-xs font-bold"
              >
                ✕ 閉じる
              </button>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-[#c9b79d]">
              <p>
                ・ラウンド開始時、全16枚の密使デッキから<strong className="text-[#e8dcc8]">「伏せ密書（1枚）」</strong>を裏向きで除外し、各プレイヤーに手札を1枚ずつ配ります。
              </p>
              <p>
                ・自分の手番が来たら山札から1枚引き（手札2枚）、どちらか1枚を場に出して効果を発動します。
              </p>
              <p>
                ・<strong className="text-[#e8dcc8]">生存者が最後の1人になる</strong>か、<strong className="text-[#e8dcc8]">山札が0枚になった時点</strong>で生存者の手札を比較し、最もランク（Lv）が高いプレイヤーが<strong className="text-[#dfb06d]">「王宮の封蝋トークン 」</strong>を1個獲得します。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ALL_RANKS.map((r) => {
                const def = ROLE_DEFINITIONS[r];
                return (
                  <div
                    key={r}
                    className="tabletop-panel-soft flex items-start gap-3 p-3"
                  >
                    <RoleCrestSvg rank={r} className="h-12 w-12 shrink-0" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#dfb06d]">
                          Lv.{r} {def.name}
                        </span>
                        <span className="tabletop-chip inline-flex min-h-6 items-center px-1.5 text-[11px] font-bold">
                          全{def.countInDeck}枚
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#c9b79d]">
                        {def.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
