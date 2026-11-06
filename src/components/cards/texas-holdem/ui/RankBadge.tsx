'use client';

import React, { useId } from 'react';
import { computeRank, type RankTier } from '../profile';

export interface RankBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

const SIZE = {
  sm: { emblem: 30, name: 'text-xs', sub: 'text-[8px]', star: 'text-[9px]', bar: 'h-1 w-16', gap: 'gap-1.5' },
  md: { emblem: 44, name: 'text-sm', sub: 'text-[9px]', star: 'text-[11px]', bar: 'h-1.5 w-24', gap: 'gap-2' },
  lg: { emblem: 96, name: 'text-2xl', sub: 'text-[11px]', star: 'text-lg', bar: 'h-2 w-44', gap: 'gap-4' },
} as const;

/** Two gradient stops per tier for the SVG emblem. */
const TIER_STOPS: Record<string, [string, string, string]> = {
  bronze: ['#fcd9a8', '#c2410c', '#5c2a0a'],
  silver: ['#ffffff', '#94a3b8', '#334155'],
  gold: ['#fff7c2', '#f59e0b', '#7c4a03'],
  platinum: ['#e6fffb', '#2dd4bf', '#0f4c4a'],
  diamond: ['#e0f2fe', '#60a5fa', '#312e81'],
  royal: ['#fde68a', '#c026d3', '#3b0764'],
  legend: ['#fffbe0', '#fb7185', '#4c1d95'],
};

/** Inline SVG crest (shield + wings for upper tiers) with the tier suit icon. */
export function RankEmblem({ tier, size, stars }: { tier: RankTier; size: number; stars: number }) {
  const uid = useId().replace(/:/g, '');
  const [c1, c2, c3] = TIER_STOPS[tier.id] ?? TIER_STOPS.bronze;
  const tierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'royal', 'legend'].indexOf(tier.id);
  const winged = tierIndex >= 3;
  const crowned = tierIndex >= 5;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="shrink-0 drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]">
      <defs>
        <linearGradient id={`rb-g-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="55%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
        <linearGradient id={`rb-r-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff8d6" />
          <stop offset="50%" stopColor="#d4a017" />
          <stop offset="100%" stopColor="#7a5200" />
        </linearGradient>
        <radialGradient id={`rb-s-${uid}`} cx="0.35" cy="0.25" r="0.7">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {winged && (
        <g fill={`url(#rb-g-${uid})`} stroke={`url(#rb-r-${uid})`} strokeWidth="1.5" opacity="0.95">
          <path d="M22 40 C8 36 3 46 4 58 C10 54 14 56 20 58 C12 62 10 68 12 74 C18 68 22 68 27 68 Z" />
          <path d="M78 40 C92 36 97 46 96 58 C90 54 86 56 80 58 C88 62 90 68 88 74 C82 68 78 68 73 68 Z" />
        </g>
      )}
      {crowned && (
        <path
          d="M34 20 L38 8 L44 15 L50 4 L56 15 L62 8 L66 20 Z"
          fill={`url(#rb-r-${uid})`}
          stroke="#7a5200"
          strokeWidth="1"
        />
      )}
      <path
        d="M50 16 L80 26 L80 52 C80 70 66 82 50 90 C34 82 20 70 20 52 L20 26 Z"
        fill={`url(#rb-r-${uid})`}
      />
      <path
        d="M50 21 L75 29.5 L75 52 C75 67 63.5 77 50 84 C36.5 77 25 67 25 52 L25 29.5 Z"
        fill={`url(#rb-g-${uid})`}
      />
      <path
        d="M50 21 L75 29.5 L75 52 C75 67 63.5 77 50 84 C36.5 77 25 67 25 52 L25 29.5 Z"
        fill={`url(#rb-s-${uid})`}
      />
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontSize="30"
        fontWeight="900"
        fill="#fffdf2"
        stroke={c3}
        strokeWidth="1.2"
        style={{ paintOrder: 'stroke' }}
      >
        {tier.icon}
      </text>
      {/* stars on the shield base */}
      {Array.from({ length: tier.id === 'legend' ? 0 : 3 }, (_, i) => (
        <path
          key={i}
          transform={`translate(${38 + i * 12} 71) scale(0.42)`}
          d="M0 -10 L2.9 -3.1 L10 -3.1 L4.3 1.4 L6.4 8.6 L0 4.3 L-6.4 8.6 L-4.3 1.4 L-10 -3.1 L-2.9 -3.1 Z"
          fill={i < stars ? '#fff7ae' : 'rgba(0,0,0,0.45)'}
          stroke={i < stars ? '#a16207' : 'rgba(255,255,255,0.25)'}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

/** Reusable rank badge: SVG crest + tier name + stars + optional progress bar. */
export function RankBadge({ points, size = 'md', showProgress = false, className = '' }: RankBadgeProps) {
  const rank = computeRank(points);
  const s = SIZE[size];
  const isLegend = rank.tier.id === 'legend';
  return (
    <div
      className={`inline-flex items-center ${s.gap} ${className}`}
      role="img"
      aria-label={`ランク ${rank.label}${isLegend ? '' : `、次の星まで ${rank.pointsToNext} pt`}`}
    >
      <RankEmblem tier={rank.tier} size={s.emblem} stars={rank.stars} />
      <div className="min-w-0 leading-tight">
        <p className={`${s.sub} font-semibold uppercase tracking-[0.25em] text-amber-200/70`}>{rank.tier.nameEn}</p>
        <p className={`${s.name} flex items-center gap-1 font-black tracking-wide`} style={{ color: rank.tier.color }}>
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{rank.tier.name}</span>
          {!isLegend && (
            <span className={`${s.star} tracking-tight`} aria-hidden>
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={i < rank.stars ? 'text-amber-200' : 'text-white/20'}>
                  ★
                </span>
              ))}
            </span>
          )}
        </p>
        {showProgress && (
          <div className="mt-1">
            <div className={`${s.bar} overflow-hidden rounded-full bg-black/60 ring-1 ring-amber-300/25`}>
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-100"
                style={{ width: `${Math.round(rank.progress * 100)}%`, animation: 'rfn-bar 700ms ease-out both' }}
              />
            </div>
            {size !== 'sm' && (
              <p className="mt-0.5 text-[9px] tabular-nums text-amber-100/60">
                {isLegend ? `${points} pt` : `NEXT ${rank.pointsToNext} pt`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
