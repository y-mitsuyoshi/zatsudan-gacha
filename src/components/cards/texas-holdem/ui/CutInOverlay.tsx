'use client';

import React from 'react';
import { CHARACTERS, charImage } from '../characters';
import type { CutInData } from './useHoldemTable';

export interface CutInOverlayProps {
  data: CutInData | null;
  reducedFx: boolean;
  onSkip: () => void;
}

const SPARKS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 3 + ((i * 7) % 6),
  delay: (i % 9) * 0.09,
  dur: 0.9 + ((i * 13) % 7) / 10,
}));

/** Full-screen anime-style cut-in (ALL-IN / big win). Tap to skip. */
export function CutInOverlay({ data, reducedFx, onSkip }: CutInOverlayProps) {
  if (!data) return null;
  const ch = CHARACTERS[data.charId];
  const heroWin = data.variant === 'win';
  const oppWin = data.variant === 'oppWin';
  const anyWin = heroWin || oppWin;
  const dur = heroWin ? 3.4 : oppWin ? 2.6 : 1.4;
  const displayName = data.playerName || ch.name;
  const roleBadge =
    data.isHero === true
      ? '🌟 YOU'
      : data.isHumanPlayer
        ? '🟢 👤 PLAYER'
        : data.isHero === false
          ? '🤖 CPU'
          : null;
  return (
    <div
      key={data.key}
      role="dialog"
      aria-label={`${data.title} カットイン（タップでスキップ）`}
      onClick={onSkip}
      className="fixed inset-0 z-[80] cursor-pointer overflow-hidden"
      style={{ animation: `rfc-life ${dur}s ease-in-out both` }}
    >
      <style>{`
@keyframes rfc-life { 0% { opacity: 0; } 8% { opacity: 1; } 88% { opacity: 1; } 100% { opacity: 0; } }
@keyframes rfc-band { 0% { transform: translateX(-120%) skewY(-12deg); } 100% { transform: translateX(0) skewY(-12deg); } }
@keyframes rfc-band2 { 0% { transform: translateX(120%) skewY(-12deg); } 100% { transform: translateX(0) skewY(-12deg); } }
@keyframes rfc-lines { 0% { background-position: 0 0; } 100% { background-position: -600px 0; } }
@keyframes rfc-char { 0% { transform: translateX(60%) scale(1.15); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
@keyframes rfc-drift { 0% { transform: translateX(0); } 100% { transform: translateX(-3%); } }
@keyframes rfc-title { 0% { transform: scale(3) rotate(-6deg); opacity: 0; filter: blur(8px); } 45% { transform: scale(0.92) rotate(-6deg); opacity: 1; filter: blur(0); } 70% { transform: scale(1.06) rotate(-6deg); } 100% { transform: scale(1) rotate(-6deg); opacity: 1; } }
@keyframes rfc-flash { 0% { opacity: 0.9; } 100% { opacity: 0; } }
@keyframes rfc-spark { 0% { transform: translateY(20px) scale(0); opacity: 0; } 30% { opacity: 1; transform: translateY(0) scale(1); } 100% { transform: translateY(-80px) scale(0.3); opacity: 0; } }
@keyframes rfc-sub { 0% { transform: translateX(-30px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
`}</style>
      <div className="absolute inset-0 bg-black/65" />
      {!reducedFx && <div className="absolute inset-0 bg-white" style={{ animation: 'rfc-flash 380ms ease-out both' }} />}

      {/* main diagonal band */}
      <div
        className="absolute left-[-10%] right-[-10%] top-1/2 -mt-[19vh] h-[38vh] min-h-[200px] overflow-hidden"
        style={{
          background: oppWin
            ? `linear-gradient(100deg, #4c0519 0%, ${ch.color}cc 38%, #090d1a 72%, #fb7185 100%)`
            : `linear-gradient(100deg, ${ch.color} 0%, ${ch.color}dd 35%, #0b0f1d 70%, ${ch.color2} 100%)`,
          animation: reducedFx ? undefined : 'rfc-band 360ms cubic-bezier(.2,.9,.2,1) both',
          transform: 'skewY(-12deg)',
          boxShadow: oppWin
            ? `0 0 0 4px #fb7185aa, 0 0 60px ${ch.color}`
            : `0 0 0 4px ${ch.color2}aa, 0 0 60px ${ch.color}`,
        }}
      >
        {!reducedFx && (
          <div
            className="absolute inset-0 opacity-50 mix-blend-screen"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 24px, rgba(255,255,255,0.65) 26px, rgba(255,255,255,0) 30px, rgba(255,255,255,0) 70px)',
              backgroundSize: '600px 100%',
              animation: 'rfc-lines 0.35s linear infinite',
            }}
          />
        )}
      </div>
      {/* thin accent band */}
      <div
        className="absolute left-[-10%] right-[-10%] top-1/2 mt-[20vh] h-[3vh] min-h-[14px]"
        style={{
          background: oppWin
            ? `linear-gradient(90deg, transparent, #fb7185, #fecdd3, #fb7185, transparent)`
            : `linear-gradient(90deg, transparent, ${ch.color2}, #fff7ae, ${ch.color2}, transparent)`,
          animation: reducedFx ? undefined : 'rfc-band2 420ms cubic-bezier(.2,.9,.2,1) 80ms both',
          transform: 'skewY(-12deg)',
        }}
      />

      {/* character */}
      <div
        className="absolute bottom-0 right-[-4%] top-[6%] w-[min(78vw,640px)]"
        style={{ animation: reducedFx ? undefined : 'rfc-char 520ms cubic-bezier(.2,.9,.2,1) 60ms both' }}
      >
        {heroWin && !reducedFx && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
            style={{
              background:
                'repeating-conic-gradient(from 0deg, rgba(253,224,71,0.45) 0deg 10deg, transparent 10deg 24deg)',
              maskImage: 'radial-gradient(circle, black 20%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 70%)',
              animation: 'rf-rays 8s linear infinite',
            }}
          />
        )}
        <div className="h-full w-full" style={{ animation: reducedFx ? undefined : `rfc-drift ${dur}s linear both` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={charImage(data.charId, anyWin ? 'win' : 'normal')}
            alt={ch.name}
            draggable={false}
            className="h-full w-full object-cover object-top"
            style={{
              maskImage: 'radial-gradient(ellipse 60% 75% at 55% 40%, black 55%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 75% at 55% 40%, black 55%, transparent 80%)',
              filter: `drop-shadow(0 0 30px ${ch.color})`,
            }}
          />
        </div>
      </div>

      {/* sparks */}
      {!reducedFx &&
        SPARKS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              background: i % 3 === 0 ? '#fff7ae' : i % 3 === 1 ? ch.color2 : oppWin ? '#fb7185' : '#fde047',
              boxShadow: `0 0 10px 2px ${i % 2 ? (oppWin ? '#fb7185' : '#fde047') : ch.color}`,
              animation: `rfc-spark ${s.dur}s ease-out ${s.delay}s infinite`,
            }}
          />
        ))}

      {/* text */}
      <div className="absolute left-[4%] top-1/2 z-10 max-w-[92vw] -translate-y-1/2">
        <div
          className={`inline-flex flex-wrap items-center gap-1.5 rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.22em] shadow-lg sm:text-xs ${
            oppWin
              ? 'border-rose-300/70 bg-rose-950/90 text-rose-100'
              : 'border-amber-300/60 bg-slate-950/85 text-amber-200'
          }`}
          style={{ animation: 'rfc-sub 300ms ease-out 200ms both' }}
        >
          <span>
            {heroWin
              ? '👑 YOU WIN!! · あなたの勝利'
              : oppWin
                ? `⚔️ RIVAL WIN · ${displayName} の勝利`
                : '🔥 HIGH STAKES ALL-IN'}
          </span>
          <span className="text-white/50">|</span>
          <span>{displayName}</span>
          {roleBadge && (
            <span
              className={`rounded-full px-1.5 py-[1px] text-[9px] font-black ${
                data.isHero
                  ? 'bg-amber-400 text-slate-950'
                  : data.isHumanPlayer
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-slate-700 text-slate-100'
              }`}
            >
              {roleBadge}
            </span>
          )}
        </div>
        <div
          className={`mt-1 whitespace-nowrap bg-clip-text font-black italic leading-none text-transparent ${
            oppWin
              ? 'bg-gradient-to-b from-white via-rose-200 to-rose-500'
              : 'bg-gradient-to-b from-white via-amber-200 to-amber-500'
          }`}
          style={{
            fontSize: anyWin ? 'clamp(36px, 9.5vw, 118px)' : 'clamp(48px, 13vw, 150px)',
            WebkitTextStroke: oppWin ? '2px rgba(136,19,55,0.85)' : '2px rgba(120,53,15,0.85)',
            filter: oppWin
              ? 'drop-shadow(0 6px 0 rgba(0,0,0,0.6)) drop-shadow(0 0 28px rgba(251,113,133,0.75))'
              : 'drop-shadow(0 6px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 28px rgba(253,224,71,0.75))',
            animation: reducedFx ? undefined : 'rfc-title 520ms cubic-bezier(.2,1.2,.4,1) 120ms both',
            transform: 'rotate(-6deg)',
          }}
        >
          {data.title}
        </div>
        {data.subtitle && (
          <div
            className={`mt-2.5 inline-flex items-center gap-2 rounded-xl border px-4 py-1.5 text-sm font-black tracking-wider shadow-lg sm:text-lg ${
              oppWin
                ? 'border-rose-300/70 bg-gradient-to-r from-slate-950/90 via-rose-950/85 to-slate-950/90 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.45)]'
                : 'border-amber-300/70 bg-gradient-to-r from-slate-950/90 via-amber-950/85 to-slate-950/90 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.45)]'
            }`}
            style={{ animation: 'rfc-sub 300ms ease-out 380ms both' }}
          >
            <span>{oppWin ? '🃏 相手の上がり役:' : '🏆 上がり役:'}</span>
            <span>{data.subtitle}</span>
          </div>
        )}
        {data.line && (
          <div
            className="mt-2.5 max-w-[68vw] rounded-2xl border-2 bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xl sm:max-w-md sm:text-base"
            style={{ borderColor: ch.color, animation: 'rfc-sub 300ms ease-out 520ms both' }}
          >
            「{data.line}」
          </div>
        )}
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] text-white/60">TAP TO SKIP</div>
    </div>
  );
}

export default CutInOverlay;
