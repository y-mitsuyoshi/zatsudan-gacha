'use client';

import React, { useEffect, useState } from 'react';
import type { Card } from '../types';
import { HOLDEM_ASSETS } from '../characters';
import { rankLabel, SUIT_SYMBOL } from './tableUtils';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const CARD_DIMS: Record<CardSize, { w: number; h: number }> = {
  xs: { w: 26, h: 37 },
  sm: { w: 38, h: 54 },
  md: { w: 52, h: 73 },
  lg: { w: 68, h: 95 },
  xl: { w: 90, h: 126 },
};

export interface PlayingCardProps {
  card?: Card | null;
  faceUp: boolean;
  size?: CardSize;
  /** winning highlight (glow) or dimmed (not part of best 5) */
  highlight?: 'win' | 'dim' | null;
  /** mount face-down and flip after this many ms */
  flipInMs?: number;
  /** deal-in animation: offset (px) of the dealer from the card's final position */
  deal?: { dx: number; dy: number; delay: number } | null;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
}

const SUIT_COLOR: Record<Card['suit'], string> = {
  s: '#0f172a',
  c: '#0f172a',
  h: '#dc2626',
  d: '#dc2626',
};

function CourtArt({ rank, color, suit }: { rank: number; color: string; suit: string }) {
  const letter = rankLabel(rank);
  return (
    <svg viewBox="0 0 60 84" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`gold-${letter}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4c2" />
          <stop offset="45%" stopColor="#f5c542" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="54" height="78" rx="5" fill="none" stroke={`url(#gold-${letter})`} strokeWidth="1.6" />
      <rect x="6" y="6" width="48" height="72" rx="4" fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="0.8" />
      {/* crown */}
      <path
        d="M17 30 L20 18 L26 25 L30 14 L34 25 L40 18 L43 30 Z"
        fill={`url(#gold-${letter})`}
        stroke="#7c4a03"
        strokeWidth="0.7"
      />
      <circle cx="20" cy="17" r="1.6" fill="#fde68a" />
      <circle cx="30" cy="13" r="1.8" fill={color} />
      <circle cx="40" cy="17" r="1.6" fill="#fde68a" />
      <rect x="17" y="30" width="26" height="3" rx="1" fill={`url(#gold-${letter})`} />
      <text
        x="30"
        y="60"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="900"
        fontSize="26"
        fill={`url(#gold-${letter})`}
        stroke="#7c4a03"
        strokeWidth="0.8"
      >
        {letter}
      </text>
      <text x="30" y="74" textAnchor="middle" fontSize="10" fill={color}>
        {suit}
      </text>
    </svg>
  );
}

function CardFace({ card, size }: { card: Card; size: CardSize }) {
  const color = SUIT_COLOR[card.suit];
  const suit = SUIT_SYMBOL[card.suit];
  const { w } = CARD_DIMS[size];
  const small = size === 'xs' || size === 'sm';
  const court = card.rank >= 11 && card.rank <= 13;
  const label = rankLabel(card.rank);
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        borderRadius: w * 0.11,
        background: 'linear-gradient(160deg, #fffdf6 0%, #f7f0de 55%, #eadfc4 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(161,98,7,0.35), inset 0 1px 0 rgba(255,255,255,0.9)',
        color,
      }}
    >
      {small ? (
        <div className="flex h-full flex-col items-center justify-center leading-none">
          <span className="font-black tracking-tighter" style={{ fontSize: w * 0.46, fontFamily: 'Georgia, serif' }}>
            {label}
          </span>
          <span style={{ fontSize: w * 0.44, marginTop: -w * 0.02 }}>{suit}</span>
        </div>
      ) : (
        <>
          <div className="absolute left-[7%] top-[5%] flex flex-col items-center leading-none">
            <span className="font-black" style={{ fontSize: w * 0.27, fontFamily: 'Georgia, serif', letterSpacing: '-0.06em' }}>
              {label}
            </span>
            <span style={{ fontSize: w * 0.22 }}>{suit}</span>
          </div>
          <div className="absolute bottom-[5%] right-[7%] flex rotate-180 flex-col items-center leading-none">
            <span className="font-black" style={{ fontSize: w * 0.27, fontFamily: 'Georgia, serif', letterSpacing: '-0.06em' }}>
              {label}
            </span>
            <span style={{ fontSize: w * 0.22 }}>{suit}</span>
          </div>
          <div className="absolute inset-[18%_20%_14%_22%] flex items-center justify-center">
            {court ? (
              <CourtArt rank={card.rank} color={color} suit={suit} />
            ) : card.rank === 14 ? (
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute rounded-full"
                  style={{
                    width: w * 0.62,
                    height: w * 0.62,
                    border: '1.5px solid #d4a017',
                    boxShadow: '0 0 0 3px rgba(212,160,23,0.15)',
                  }}
                />
                <span style={{ fontSize: w * 0.5, filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.15))' }}>{suit}</span>
              </div>
            ) : (
              <span style={{ fontSize: w * 0.56, filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.15))' }}>{suit}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CardBack({ size }: { size: CardSize }) {
  const { w } = CARD_DIMS[size];
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        borderRadius: w * 0.11,
        transform: 'rotateY(180deg)',
        backfaceVisibility: 'hidden',
        background: '#3b0d18',
        boxShadow: 'inset 0 0 0 1px rgba(253,224,71,0.35)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HOLDEM_ASSETS.cardBack} alt="" draggable={false} className="h-full w-full object-cover" />
    </div>
  );
}

/** Premium playing card with 3D flip, deal-in and winning highlight states. */
export function PlayingCard({
  card,
  faceUp,
  size = 'md',
  highlight = null,
  flipInMs,
  deal,
  className = '',
  style,
  onClick,
  ariaLabel,
}: PlayingCardProps) {
  const [flipped, setFlipped] = useState(flipInMs === undefined);
  useEffect(() => {
    if (flipInMs === undefined) return;
    const t = window.setTimeout(() => setFlipped(true), flipInMs);
    return () => window.clearTimeout(t);
  }, [flipInMs]);
  const { w, h } = CARD_DIMS[size];
  const showFace = faceUp && flipped && !!card;
  const dealStyle: React.CSSProperties = deal
    ? ({
        '--dx': `${deal.dx}px`,
        '--dy': `${deal.dy}px`,
        animation: `rf-deal 420ms cubic-bezier(.2,.8,.25,1) ${deal.delay}ms both`,
      } as React.CSSProperties)
    : {};
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel ?? (showFace && card ? `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}` : '伏せカード')}
      className={`relative shrink-0 select-none ${className} ${onClick ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300' : ''}`}
      style={{ width: w, height: h, perspective: 700, ...dealStyle, ...style }}
    >
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: showFace ? 'rotateY(0deg)' : 'rotateY(180deg)',
          transitionTimingFunction: 'cubic-bezier(.3,1.4,.5,1)',
        }}
      >
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
          {card && <CardFace card={card} size={size} />}
        </div>
        <CardBack size={size} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-300"
        style={{
          borderRadius: w * 0.11,
          boxShadow:
            highlight === 'win'
              ? '0 0 0 2px #fde047, 0 0 18px 4px rgba(253,224,71,0.75)'
              : '0 4px 10px rgba(0,0,0,0.45)',
          background: highlight === 'dim' ? 'rgba(2,6,23,0.55)' : 'transparent',
          animation: highlight === 'win' ? 'rf-cardglow 1.2s ease-in-out infinite' : undefined,
        }}
      />
      {highlight === 'win' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: w * 0.11 }}>
          <div
            className="absolute -inset-y-2 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
            style={{ animation: 'rf-shine 1.6s ease-in-out infinite', left: '-40%' }}
          />
        </div>
      )}
    </Comp>
  );
}

export default PlayingCard;
