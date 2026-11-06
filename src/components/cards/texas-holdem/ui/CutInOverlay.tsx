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
  const win = data.variant === 'win';
  const dur = win ? 3.4 : 1.4;
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
      <div className="absolute inset-0 bg-black/60" />
      {!reducedFx && <div className="absolute inset-0 bg-white" style={{ animation: 'rfc-flash 380ms ease-out both' }} />}

      {/* main diagonal band */}
      <div
        className="absolute left-[-10%] right-[-10%] top-1/2 -mt-[19vh] h-[38vh] min-h-[200px] overflow-hidden"
        style={{
          background: `linear-gradient(100deg, ${ch.color} 0%, ${ch.color}dd 35%, #0b0f1d 70%, ${ch.color2} 100%)`,
          animation: reducedFx ? undefined : 'rfc-band 360ms cubic-bezier(.2,.9,.2,1) both',
          transform: 'skewY(-12deg)',
          boxShadow: `0 0 0 4px ${ch.color2}aa, 0 0 60px ${ch.color}`,
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
          background: `linear-gradient(90deg, transparent, ${ch.color2}, #fff7ae, ${ch.color2}, transparent)`,
          animation: reducedFx ? undefined : 'rfc-band2 420ms cubic-bezier(.2,.9,.2,1) 80ms both',
          transform: 'skewY(-12deg)',
        }}
      />

      {/* character */}
      <div
        className="absolute bottom-0 right-[-4%] top-[6%] w-[min(78vw,640px)]"
        style={{ animation: reducedFx ? undefined : 'rfc-char 520ms cubic-bezier(.2,.9,.2,1) 60ms both' }}
      >
        <div className="h-full w-full" style={{ animation: reducedFx ? undefined : `rfc-drift ${dur}s linear both` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={charImage(data.charId, win ? 'win' : 'normal')}
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
              background: i % 3 === 0 ? '#fff7ae' : i % 3 === 1 ? ch.color2 : '#fde047',
              boxShadow: `0 0 10px 2px ${i % 2 ? '#fde047' : ch.color}`,
              animation: `rfc-spark ${s.dur}s ease-out ${s.delay}s infinite`,
            }}
          />
        ))}

      {/* text */}
      <div className="absolute left-[4%] top-1/2 z-10 max-w-[92vw] -translate-y-1/2">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/80 sm:text-xs"
          style={{ animation: 'rfc-sub 300ms ease-out 200ms both' }}
        >
          {win ? 'VICTORY' : 'ALL-IN'} — {ch.nameEn}
        </div>
        <div
          className="whitespace-nowrap bg-gradient-to-b from-white via-amber-200 to-amber-600 bg-clip-text font-black italic leading-none text-transparent"
          style={{
            fontSize: win ? 'clamp(40px, 11vw, 132px)' : 'clamp(48px, 13vw, 150px)',
            WebkitTextStroke: '2px rgba(120,53,15,0.85)',
            filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 24px rgba(253,224,71,0.6))',
            animation: reducedFx ? undefined : 'rfc-title 520ms cubic-bezier(.2,1.2,.4,1) 120ms both',
            transform: 'rotate(-6deg)',
          }}
        >
          {data.title}
        </div>
        {data.subtitle && (
          <div
            className="mt-2 inline-block rounded-md bg-black/60 px-3 py-1 text-sm font-black tracking-wider text-amber-100 sm:text-lg"
            style={{ animation: 'rfc-sub 300ms ease-out 380ms both' }}
          >
            {data.subtitle}
          </div>
        )}
        {data.line && (
          <div
            className="mt-2 max-w-[60vw] rounded-2xl border-2 bg-white/95 px-3 py-2 text-xs font-bold text-slate-900 shadow-xl sm:max-w-md sm:text-base"
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
