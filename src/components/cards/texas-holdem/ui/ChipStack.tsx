'use client';

import React from 'react';
import { breakChips, fmt, type ChipDenom } from './tableUtils';

const CHIP_COLORS: Record<ChipDenom, { base: string; edge: string; stripe: string; text: string }> = {
  1: { base: '#f1f5f9', edge: '#cbd5e1', stripe: '#2563eb', text: '#1e3a8a' },
  5: { base: '#dc2626', edge: '#991b1b', stripe: '#fef2f2', text: '#fff' },
  25: { base: '#16a34a', edge: '#14532d', stripe: '#f0fdf4', text: '#fff' },
  100: { base: '#18181b', edge: '#000', stripe: '#e4e4e7', text: '#fde68a' },
  500: { base: '#7e22ce', edge: '#4c1d95', stripe: '#f5d0fe', text: '#fff' },
  1000: { base: '#eab308', edge: '#a16207', stripe: '#fff7d6', text: '#5b3a00' },
};

/** A single casino chip (SVG) */
export function Chip({ denom, size = 22 }: { denom: ChipDenom; size?: number }) {
  const c = CHIP_COLORS[denom];
  const stripes = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="block drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
      <circle cx="20" cy="20" r="19" fill={c.edge} />
      <circle cx="20" cy="20" r="18" fill={c.base} />
      {stripes.map((deg) => (
        <rect
          key={deg}
          x="17"
          y="2"
          width="6"
          height="6.5"
          rx="1"
          fill={c.stripe}
          transform={`rotate(${deg + 22.5} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="11.5" fill={c.base} stroke={c.stripe} strokeWidth="1.2" strokeDasharray="2 1.6" />
      <circle cx="20" cy="20" r="9" fill={c.base} stroke={c.edge} strokeWidth="0.6" />
      <text
        x="20"
        y="23.4"
        textAnchor="middle"
        fontSize={denom >= 1000 ? 7.5 : 9.5}
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        fill={c.text}
      >
        {denom >= 1000 ? '1K' : denom}
      </text>
      <ellipse cx="15" cy="12" rx="8" ry="4" fill="#fff" opacity="0.18" />
    </svg>
  );
}

export interface ChipStackProps {
  amount: number;
  /** chip diameter in px */
  size?: number;
  showLabel?: boolean;
  maxChips?: number;
  className?: string;
  style?: React.CSSProperties;
  labelClassName?: string;
}

/** Stacked chips grouped by denomination with amount label */
export function ChipStack({
  amount,
  size = 22,
  showLabel = true,
  maxChips = 14,
  className = '',
  style,
  labelClassName = '',
}: ChipStackProps) {
  if (amount <= 0) return null;
  const chips = breakChips(amount, maxChips);
  const cols: ChipDenom[][] = [];
  chips.forEach((d) => {
    const last = cols[cols.length - 1];
    if (last && last[0] === d && last.length < 6) last.push(d);
    else cols.push([d]);
  });
  const shown = cols.slice(0, 4);
  const step = Math.max(2, size * 0.14);
  const maxH = Math.max(...shown.map((c) => c.length));
  return (
    <div className={`pointer-events-none flex flex-col items-center ${className}`} style={style}>
      <div className="flex items-end" style={{ height: size + (maxH - 1) * step, gap: size * 0.05 }}>
        {shown.map((col, ci) => (
          <div key={ci} className="relative" style={{ width: size, height: size + (col.length - 1) * step }}>
            {col.map((d, i) => (
              <div
                key={i}
                className="absolute left-0"
                style={{ bottom: i * step, transform: `translateX(${((i * 7 + ci * 3) % 3) - 1}px)` }}
              >
                <Chip denom={d} size={size} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {showLabel && (
        <div
          className={`mt-0.5 rounded-full border border-amber-300/40 bg-black/70 px-1.5 py-[1px] text-[10px] font-black tabular-nums text-amber-100 shadow ${labelClassName}`}
        >
          {fmt(amount)}
        </div>
      )}
    </div>
  );
}

export default ChipStack;
