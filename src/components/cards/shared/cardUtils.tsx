'use client';

import React from 'react';

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

let sharedAudioCtx: AudioContext | null = null;

export function playCardSound(type: SoundEffectType, enabled = true): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'card') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.055);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'flip') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.05);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.065);
    } else if (type === 'chip') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1150, now);
      osc.frequency.exponentialRampToValueAtTime(1680, now + 0.06);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.075);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'pass') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.095);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.08, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.24);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.25);
      });
    }
  } catch {
    // Ignore audio context restrictions
  }
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
        className={`relative select-none overflow-hidden border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900 shadow-md transition-transform ${
          SIZE_CLASSES[size]
        } ${onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : 'cursor-default'} ${className}`}
      >
        <div
          className="absolute inset-1 rounded border border-amber-300/35 opacity-80"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.22) 1px, transparent 1px), repeating-linear-gradient(45deg, rgba(99, 102, 241, 0.16) 0px, rgba(99, 102, 241, 0.16) 3px, transparent 3px, transparent 6px)',
            backgroundSize: '8px 8px, 10px 10px',
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center">
          <span className="text-xs font-black tracking-widest text-amber-300/60">♠♥</span>
        </div>
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
