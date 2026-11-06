'use client';

import React from 'react';
import type { SeatState } from '../types';
import { CHARACTERS, type CharId } from '../characters';
import { CharAvatar } from './CharAvatar';
import { PlayingCard } from './PlayingCard';
import { BADGE_STYLE, fmt, type Pt } from './tableUtils';
import type { SeatBadge, SeatBubble } from './useHoldemTable';

export interface SeatViewProps {
  seat: SeatState;
  pos: Pt;
  /** dealer point (for deal-in offsets) */
  dealer: Pt;
  compact: boolean;
  isButton: boolean;
  isSB: boolean;
  isBB: boolean;
  acting: boolean;
  thinking: boolean;
  badge?: SeatBadge;
  bubble?: SeatBubble;
  revealed: boolean;
  winner: boolean;
  highlightIds: string[] | null;
  displayStack: number;
  equity?: number;
  dealKey: number;
  /** deal order index of the first hole card (second = +players) */
  dealOrder: number;
  players: number;
  /** where the seat sits relative to the table centre */
  side: 'top' | 'left' | 'right';
}

/** Badge showing the last action (CHECK / CALL / RAISE …) */
export function ActionBadge({ badge, className = '' }: { badge: SeatBadge; className?: string }) {
  const st = BADGE_STYLE[badge.type];
  return (
    <div
      key={badge.key}
      className={`pointer-events-none absolute left-1/2 z-30 whitespace-nowrap ${className}`}
      style={{ animation: 'rf-pop 380ms cubic-bezier(.2,1.4,.4,1) both' }}
    >
      <div
        className={`rounded-md border border-white/40 bg-gradient-to-b ${st.cls} px-2 py-[2px] text-center shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.5)]`}
        style={{ transform: 'skewX(-10deg)' }}
      >
        <span className="block text-[11px] font-black italic leading-tight tracking-wider text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
          {st.label}
          {badge.amount > 0 && badge.type !== 'fold' && badge.type !== 'check' ? ` ${fmt(badge.amount)}` : ''}
        </span>
      </div>
    </div>
  );
}

export function SpeechBubble({
  bubble,
  color,
  placement = 'top',
  className = '',
}: {
  bubble: SeatBubble;
  color: string;
  placement?: 'top' | 'bottom';
  className?: string;
}) {
  return (
    <div
      key={bubble.key}
      className={`pointer-events-none absolute z-40 w-max max-w-[180px] ${className}`}
      style={{ animation: 'rf-bubble 260ms ease-out both' }}
    >
      <div
        className={`relative rounded-2xl border px-2.5 py-1.5 text-[11px] font-bold leading-snug shadow-[0_6px_18px_rgba(0,0,0,0.5)] ${
          bubble.stamp ? 'bg-gradient-to-b from-amber-50 to-amber-200 text-amber-950' : 'bg-white/95 text-slate-900'
        }`}
        style={{ borderColor: color }}
      >
        {bubble.text}
        <span
          className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border bg-white/95 ${
            placement === 'top' ? '-bottom-[6px] border-l-0 border-t-0' : '-top-[6px] border-b-0 border-r-0'
          } ${bubble.stamp ? 'bg-amber-200' : ''}`}
          style={{ borderColor: color }}
        />
      </div>
    </div>
  );
}

function ThinkingDots({ color }: { color: string }) {
  return (
    <div
      className="pointer-events-none absolute -top-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full border bg-slate-950/90 px-2 py-1"
      style={{ borderColor: color }}
      aria-label="考え中"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color, animation: `rf-dots 1s ${i * 0.18}s infinite` }}
        />
      ))}
    </div>
  );
}

export function PositionMarkers({ isButton, isSB, isBB }: { isButton: boolean; isSB: boolean; isBB: boolean }) {
  if (!isButton && !isSB && !isBB) return null;
  return (
    <div className="flex items-center gap-0.5">
      {isButton && (
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-slate-400 bg-gradient-to-b from-white to-slate-300 text-[10px] font-black text-slate-900 shadow">
          D
        </span>
      )}
      {isSB && <span className="rounded-full bg-sky-600 px-1 text-[9px] font-black leading-[16px] text-white shadow">SB</span>}
      {isBB && <span className="rounded-full bg-amber-500 px-1 text-[9px] font-black leading-[16px] text-slate-950 shadow">BB</span>}
    </div>
  );
}

/** Opponent seat around the table */
export function SeatView(p: SeatViewProps) {
  const { seat, pos, compact } = p;
  const id = seat.charId as CharId;
  const ch = CHARACTERS[id];
  const avatar = compact ? 46 : 64;
  const out = seat.sittingOut;
  const dimmed = out || seat.folded;
  const hasCards = seat.holeCards.length > 0 && !out;
  const cardSize = p.revealed ? (compact ? 'sm' : 'md') : 'xs';
  const cardsSide = p.side === 'right' ? 'right-full mr-[-10px]' : 'left-full ml-[-10px]';
  return (
    <div
      className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* winner rays */}
      {p.winner && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 rounded-full rf-motion"
          style={{
            width: avatar * 3,
            height: avatar * 3,
            background:
              'repeating-conic-gradient(from 0deg, rgba(253,224,71,0.55) 0deg 8deg, transparent 8deg 22deg)',
            maskImage: 'radial-gradient(circle, black 20%, transparent 68%)',
            WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 68%)',
            animation: 'rf-rays 6s linear infinite',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
      <div className="relative">
        {p.badge && <ActionBadge badge={p.badge} className="-top-6" />}
        {p.thinking && !p.bubble && <ThinkingDots color={ch.color} />}
        {p.bubble && (
          <SpeechBubble
            bubble={p.bubble}
            color={ch.color}
            placement={p.side === 'top' ? 'bottom' : 'top'}
            className={
              p.side === 'top'
                ? 'left-1/2 top-[calc(100%+34px)] -translate-x-1/2'
                : 'bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2'
            }
          />
        )}
        <div
          className="rounded-full"
          style={{ animation: p.acting ? 'rf-pulse 1.2s ease-out infinite' : undefined }}
        >
          <CharAvatar
            id={id}
            expr={p.winner ? 'win' : 'normal'}
            size={avatar}
            active={p.acting || p.thinking}
            dimmed={dimmed}
            winner={p.winner}
          />
        </div>
        {out && (
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black tracking-widest text-rose-300">
            OUT
          </span>
        )}
        {seat.folded && !out && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] font-black tracking-widest text-slate-300/90">
            FOLD
          </span>
        )}
        {/* hole cards */}
        {hasCards && (
          <div
            className={`absolute top-1/2 flex -translate-y-1/2 ${cardsSide} ${p.revealed ? 'z-30 gap-0.5' : '-space-x-3'}`}
            style={{ opacity: seat.folded && !p.revealed ? 0.35 : 1 }}
          >
            {seat.holeCards.map((c, i) => {
              const hl = p.highlightIds ? (p.highlightIds.includes(c.id) ? 'win' : 'dim') : null;
              return (
                <PlayingCard
                  key={`${p.dealKey}-${i}`}
                  card={c}
                  faceUp={p.revealed}
                  size={cardSize}
                  highlight={p.revealed ? hl : null}
                  deal={{
                    dx: p.dealer.x - pos.x,
                    dy: p.dealer.y - pos.y,
                    delay: 250 + (p.dealOrder + i * p.players) * 95,
                  }}
                  style={{ transform: p.revealed ? undefined : `rotate(${i ? 8 : -6}deg)` }}
                />
              );
            })}
          </div>
        )}
        {p.equity !== undefined && (
          <div className="absolute -bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-200/70 bg-gradient-to-b from-amber-300 to-amber-600 px-1.5 text-[11px] font-black tabular-nums text-slate-950 shadow-lg">
            {p.equity.toFixed(0)}%
          </div>
        )}
      </div>
      {/* name plate */}
      <div
        className="relative mt-1 min-w-[78px] max-w-[120px] overflow-hidden rounded-lg border bg-slate-950/85 px-2 pb-0.5 pt-[3px] text-center shadow-[0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur"
        style={{ borderColor: p.winner ? '#fde047' : `${ch.color}88` }}
      >
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${ch.color}, ${ch.color2})` }} />
        <div className="truncate text-[10px] font-bold leading-tight text-white/90">{ch.name}</div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-[11px] font-black tabular-nums text-amber-200">{fmt(p.displayStack)}</span>
        </div>
        <div className="absolute -right-0.5 -top-0.5">
          <PositionMarkers isButton={p.isButton} isSB={p.isSB} isBB={p.isBB} />
        </div>
      </div>
    </div>
  );
}

export default SeatView;
