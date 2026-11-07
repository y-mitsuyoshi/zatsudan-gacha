'use client';

import React, { useEffect } from 'react';

export type StandardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Suit = StandardSuit | 'joker';

export interface CardItem {
  id: string;
  suit: Suit;
  rank: number; // 1 = A, 2..10, 11 = J, 12 = Q, 13 = K, 14 = Black Joker, 15 = Red Joker
  faceUp: boolean;
}

export const STANDARD_SUITS: StandardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  joker: '★',
};

export const SUIT_LABEL_JA: Record<Suit, string> = {
  spades: 'スペード',
  hearts: 'ハート',
  diamonds: 'ダイヤ',
  clubs: 'クラブ',
  joker: 'ジョーカー',
};

export function isRedSuit(suit: Suit, rank?: number): boolean {
  if (suit === 'hearts' || suit === 'diamonds') return true;
  if (suit === 'joker' && rank === 15) return true;
  return false;
}

export function isAlternatingColor(a: StandardSuit, b: StandardSuit): boolean {
  return isRedSuit(a) !== isRedSuit(b);
}

export function formatRank(rank: number): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    case 14:
    case 15:
      return 'JOKER';
    default:
      return String(rank);
  }
}

export function createStandardDeck(faceUp = false, deckIndex = 0): CardItem[] {
  const cards: CardItem[] = [];
  for (const suit of STANDARD_SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      cards.push({
        id: `${deckIndex}-${suit}-${rank}`,
        suit,
        rank,
        faceUp,
      });
    }
  }
  return cards;
}

export function shuffleWithRng<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export type SoundEffectType = 'card' | 'flip' | 'chip' | 'win' | 'error' | 'pass';
export type CardBgmStyle = 'lounge' | 'salon' | 'jazz';

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playCardSound(type: SoundEffectType, enabled = true): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'card') {
      // Crisp felt card snap + warm body
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      sub.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.055);
      sub.frequency.setValueAtTime(270, now);
      sub.frequency.exponentialRampToValueAtTime(410, now + 0.055);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.068);
      osc.connect(gain);
      sub.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      sub.start(now);
      osc.stop(now + 0.07);
      sub.stop(now + 0.07);
    } else if (type === 'flip') {
      // Airy card turn flutter
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      overtone.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.055);
      overtone.frequency.setValueAtTime(720, now + 0.01);
      overtone.frequency.exponentialRampToValueAtTime(1120, now + 0.06);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      overtone.start(now + 0.01);
      osc.stop(now + 0.068);
      overtone.stop(now + 0.068);
    } else if (type === 'chip') {
      // Dual-harmonic ceramic casino chip clink
      [1240, 1860].forEach((baseFreq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.setValueAtTime(baseFreq, now + i * 0.012);
        o.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + i * 0.012 + 0.065);
        g.gain.setValueAtTime(i === 0 ? 0.075 : 0.045, now + i * 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.012 + 0.075);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.012);
        o.stop(now + i * 0.012 + 0.08);
      });
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(215, now);
      osc.frequency.linearRampToValueAtTime(145, now + 0.13);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.145);
    } else if (type === 'pass') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.linearRampToValueAtTime(255, now + 0.085);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + idx * 0.075);
        g.gain.setValueAtTime(0.085, now + idx * 0.075);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.075 + 0.28);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + idx * 0.075);
        o.stop(now + idx * 0.075 + 0.29);
      });
    }
  } catch {
    // Ignore audio context restrictions
  }
}

const BGM_PATTERNS: Record<
  CardBgmStyle,
  {
    tempoMs: number;
    chords: number[][];
    melody: (number | null)[];
  }
> = {
  lounge: {
    tempoMs: 520,
    chords: [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
    ],
    melody: [523.25, null, 659.25, 587.33, 493.88, null, 440.0, 392.0, 587.33, null, 523.25, 440.0, 392.0, null, 493.88, 523.25],
  },
  salon: {
    tempoMs: 480,
    chords: [
      [196.0, 246.94, 293.66, 392.0], // G
      [220.0, 261.63, 329.63, 440.0], // Am
      [261.63, 329.63, 392.0, 523.25], // C
      [293.66, 369.99, 440.0, 587.33], // D
    ],
    melody: [587.33, 659.25, 783.99, null, 659.25, 587.33, 523.25, null, 659.25, 783.99, 880.0, null, 783.99, 698.46, 587.33, null],
  },
  jazz: {
    tempoMs: 440,
    chords: [
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [196.0, 246.94, 329.63, 349.23], // G13
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 277.18, 329.63, 392.0], // A7
    ],
    melody: [659.25, null, 587.33, 523.25, null, 493.88, 659.25, null, 587.33, 523.25, 440.0, null, 493.88, 523.25, 587.33, null],
  },
};

let activeBgmInterval: number | null = null;

export function stopCardTableBgm(): void {
  if (activeBgmInterval !== null && typeof window !== 'undefined') {
    window.clearInterval(activeBgmInterval);
    activeBgmInterval = null;
  }
}

export function startCardTableBgm(style: CardBgmStyle = 'lounge'): void {
  stopCardTableBgm();
  if (typeof window === 'undefined') return;
  const pattern = BGM_PATTERNS[style];
  let step = 0;

  const tick = () => {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const chordIdx = Math.floor(step / 4) % pattern.chords.length;
      const beatInBar = step % 4;
      const chord = pattern.chords[chordIdx];

      // Warm low-volume chord pad on beat 0 & walking bass on beat 0 and 2
      if (beatInBar === 0) {
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(idx === 0 ? 0.018 : 0.012, now + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + (pattern.tempoMs * 3.6) / 1000);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + (pattern.tempoMs * 3.8) / 1000);
        });
      } else if (beatInBar === 2) {
        // Gentle walking fifth bass note
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(chord[0] * 0.75, now);
        bassGain.gain.setValueAtTime(0.015, now);
        bassGain.gain.exponentialRampToValueAtTime(0.0008, now + (pattern.tempoMs * 1.5) / 1000);
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + (pattern.tempoMs * 1.6) / 1000);
      }

      // Soft electric piano / harp melody note
      const melFreq = pattern.melody[step % pattern.melody.length];
      if (melFreq) {
        const mOsc = ctx.createOscillator();
        const mGain = ctx.createGain();
        mOsc.type = style === 'salon' ? 'triangle' : 'sine';
        mOsc.frequency.setValueAtTime(melFreq, now);
        mGain.gain.setValueAtTime(0.0001, now);
        mGain.gain.linearRampToValueAtTime(0.016, now + 0.02);
        mGain.gain.exponentialRampToValueAtTime(0.0008, now + (pattern.tempoMs * 0.9) / 1000);
        mOsc.connect(mGain);
        mGain.connect(ctx.destination);
        mOsc.start(now);
        mOsc.stop(now + pattern.tempoMs / 1000);
      }

      step = (step + 1) % 16;
    } catch {
      // Ignore Web Audio errors
    }
  };

  tick();
  activeBgmInterval = window.setInterval(tick, pattern.tempoMs);
}

export function useCardTableBgm(enabled: boolean, style: CardBgmStyle = 'lounge'): void {
  useEffect(() => {
    if (!enabled) {
      stopCardTableBgm();
      return;
    }
    startCardTableBgm(style);
    const resumeOnGesture = () => {
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', resumeOnGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', resumeOnGesture);
      stopCardTableBgm();
    };
  }, [enabled, style]);
}

export function SuitVectorIcon({
  suit,
  className = 'w-4 h-4',
}: {
  suit: Suit;
  className?: string;
}) {
  if (suit === 'spades') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 2C7 8 3 11.5 3 15a5.5 5.5 0 0 0 8 4.89L9.5 22h5l-1.5-2.11A5.5 5.5 0 0 0 21 15c0-3.5-4-7-9-13Z" />
      </svg>
    );
  }
  if (suit === 'hearts') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" />
      </svg>
    );
  }
  if (suit === 'diamonds') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 2 20 12 12 22 4 12 12 2Z" />
      </svg>
    );
  }
  if (suit === 'clubs') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 3a4.2 4.2 0 0 0-3.7 6.18A4.3 4.3 0 1 0 9.6 17.5L8.5 21h7l-1.1-3.5a4.3 4.3 0 1 0 1.3-8.32A4.2 4.2 0 0 0 12 3Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77 5.82 21 7 14.14 2 9.27l7.1-1.01L12 2Z" />
    </svg>
  );
}

export interface PlayingCardProps {
  card: CardItem;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  badgeText?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<NonNullable<PlayingCardProps['size']>, string> = {
  xs: 'w-11 h-16 rounded-md text-xs',
  sm: 'w-13 h-19 sm:w-15 sm:h-22 rounded-lg text-xs sm:text-sm',
  md: 'w-15 h-22 sm:w-18 sm:h-26 rounded-xl text-sm sm:text-base',
  lg: 'w-18 h-26 sm:w-22 sm:h-32 rounded-xl text-base sm:text-lg',
};

export function PlayingCardView({
  card,
  size = 'md',
  selected = false,
  highlighted = false,
  dimmed = false,
  badgeText,
  onClick,
  className = '',
  ariaLabel,
}: PlayingCardProps) {
  const red = isRedSuit(card.suit, card.rank);
  const rankStr = formatRank(card.rank);
  const symbol = SUIT_SYMBOL[card.suit];

  if (!card.faceUp) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={ariaLabel ?? '裏向きのカード'}
        className={`relative select-none overflow-hidden border-2 border-amber-300/75 bg-slate-950 shadow-[0_6px_16px_rgba(0,0,0,0.65)] transition-transform ${
          SIZE_CLASSES[size]
        } ${onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : 'cursor-default'} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/holdem/card_back.webp"
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0.5 rounded border border-amber-200/40" />
      </button>
    );
  }

  const isJoker = card.suit === 'joker';
  const courtBadge =
    card.rank === 11
      ? 'JACK'
      : card.rank === 12
        ? 'QUEEN'
        : card.rank === 13
          ? 'KING'
          : card.rank === 1
            ? 'ACE'
            : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={
        ariaLabel ??
        (isJoker
          ? `ジョーカー (${card.rank === 15 ? '赤' : '黒'})`
          : `${SUIT_LABEL_JA[card.suit]}の${rankStr}`)
      }
      className={`relative flex flex-col justify-between select-none border bg-gradient-to-b from-white via-slate-50 to-slate-100 p-1 sm:p-1.5 text-left shadow-md transition-all ${
        SIZE_CLASSES[size]
      } ${
        selected
          ? '-translate-y-2 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.55)]'
          : highlighted
            ? 'border-emerald-400 ring-2 ring-emerald-400/90 shadow-[0_0_15px_rgba(52,211,153,0.45)]'
            : 'border-slate-300/90'
      } ${dimmed ? 'opacity-50' : 'opacity-100'} ${
        onClick ? 'cursor-pointer hover:border-amber-300 active:scale-95' : 'cursor-default'
      } ${red ? 'text-rose-600' : 'text-slate-900'} ${className}`}
    >
      {/* Top-left rank & suit */}
      <div className="flex items-center justify-between leading-none">
        <div className="flex flex-col items-center leading-none">
          <span className="font-mono text-[11px] font-black tracking-tighter sm:text-xs">
            {isJoker ? 'JK' : rankStr}
          </span>
          <span className="text-[10px] leading-none sm:text-xs">{symbol}</span>
        </div>
        {badgeText && (
          <span className="rounded bg-amber-500 px-1 py-0.5 text-[8px] font-black text-slate-950 shadow-xs">
            {badgeText}
          </span>
        )}
      </div>

      {/* Center pip or emblem */}
      <div className="pointer-events-none flex flex-col items-center justify-center">
        {isJoker ? (
          <div className="flex flex-col items-center">
            <SuitVectorIcon
              suit="joker"
              className={`h-5 w-5 sm:h-6 sm:w-6 ${red ? 'text-rose-600' : 'text-indigo-700'}`}
            />
            <span className="mt-0.5 text-[7px] font-black tracking-wider uppercase">JOKER</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <SuitVectorIcon suit={card.suit} className="h-4 w-4 sm:h-5 sm:w-5" />
            {courtBadge && (
              <span className="mt-0.5 hidden text-[7px] font-black tracking-widest opacity-65 sm:inline">
                {courtBadge}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom-right inverted rank & suit */}
      <div className="flex rotate-180 items-center justify-between leading-none">
        <div className="flex flex-col items-center leading-none">
          <span className="font-mono text-[11px] font-black tracking-tighter sm:text-xs">
            {isJoker ? 'JK' : rankStr}
          </span>
          <span className="text-[10px] leading-none sm:text-xs">{symbol}</span>
        </div>
      </div>
    </button>
  );
}
