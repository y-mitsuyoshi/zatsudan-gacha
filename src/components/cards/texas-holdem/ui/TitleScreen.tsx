'use client';

import React, { useEffect, useRef, useState } from 'react';
import { holdemAudio } from '../audio';
import { CHARACTERS, GAME_TITLE, GAME_TITLE_JA, HOLDEM_ASSETS, charImage } from '../characters';
import type { HoldemProfile } from '../profile';
import { HowToPlayModal } from './HowToPlayModal';
import { RankBadge } from './RankBadge';
import { FOCUS_RING, IconBook, IconGear, OutGameStyles, PORTRAIT_MASK, stagger } from './OutGameKit';

export interface TitleScreenProps {
  profile: HoldemProfile;
  onStart(initialOnlineTab?: 'quick' | 'friend'): void;
  onOpenSettings(): void;
}

const VERSION = 'Ver 1.0.0';

/** Deterministic pseudo-random sparkle layout (no Math.random during render). */
const SPARKLES = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 97.13 + n * 13.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    left: `${(r(1) * 100).toFixed(2)}%`,
    top: `${(r(2) * 100).toFixed(2)}%`,
    size: 4 + r(3) * 10,
    delay: `${(r(4) * 5).toFixed(2)}s`,
    dur: `${(2.4 + r(5) * 3).toFixed(2)}s`,
  };
});

const EMBERS = Array.from({ length: 14 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 31.7 + n * 7.31) * 9973.13;
    return x - Math.floor(x);
  };
  return {
    left: `${(r(1) * 100).toFixed(2)}%`,
    size: 2 + r(2) * 4,
    delay: `${(r(3) * 9).toFixed(2)}s`,
    dur: `${(7 + r(4) * 6).toFixed(2)}s`,
  };
});

/** Cinematic title screen. The tap is also the audio-unlock gesture. */
export function TitleScreen({ profile, onStart, onOpenSettings }: TitleScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const partner = CHARACTERS[profile.partner];
  const reduced = profile.settings.reducedFx;

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const start = (initialOnlineTab?: 'quick' | 'friend') => {
    if (leaving) return;
    holdemAudio.unlock();
    holdemAudio.se('open');
    setLeaving(true);
    timer.current = window.setTimeout(() => onStart(initialOnlineTab), reduced ? 80 : 520);
  };

  const topBtn = `grid h-10 w-10 place-items-center rounded-full border border-amber-300/40 bg-slate-950/60 text-amber-100 backdrop-blur-md transition hover:bg-slate-900/80 hover:text-amber-50 active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_14px_rgba(0,0,0,0.5)] ${FOCUS_RING}`;

  return (
    <div
      className={`relative min-h-[100dvh] w-full overflow-hidden bg-[#070b14] text-white ${reduced ? 'rfn-reduced' : ''}`}
      style={{ animation: 'rfn-fade-in 600ms ease-out both' }}
    >
      <OutGameStyles />

      {/* background key visual with Ken-Burns */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HOLDEM_ASSETS.keyVisual}
          alt=""
          draggable={false}
          className="rfn-motion absolute inset-0 h-full w-full object-cover object-[70%_50%]"
          style={{ animation: 'rfn-kenburns 28s ease-in-out infinite' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/30 to-[#070b14]/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
        {/* light rays */}
        <div
          className="rfn-motion absolute left-1/2 top-[-60vmax] h-[120vmax] w-[120vmax] -translate-x-1/2 opacity-30 mix-blend-screen"
          style={{
            background:
              'repeating-conic-gradient(from 0deg at 50% 50%, rgba(253,230,138,0.22) 0deg 4deg, transparent 4deg 18deg)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 0%, transparent 60%)',
            maskImage: 'radial-gradient(circle at 50% 50%, #000 0%, transparent 60%)',
            animation: 'rfn-rays 90s linear infinite',
          }}
        />
        {/* sparkles */}
        {!reduced &&
          SPARKLES.map((s, i) => (
            <span
              key={i}
              className="rfn-motion absolute"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                animation: `rfn-sparkle ${s.dur} ease-in-out ${s.delay} infinite both`,
                background:
                  'radial-gradient(circle, #fffbe6 0%, rgba(253,224,71,0.8) 25%, transparent 70%)',
                clipPath: 'polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%)',
              }}
            />
          ))}
        {!reduced &&
          EMBERS.map((e, i) => (
            <span
              key={`e${i}`}
              className="rfn-motion absolute bottom-0 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(253,224,71,0.9)]"
              style={{ left: e.left, width: e.size, height: e.size, animation: `rfn-rise ${e.dur} linear ${e.delay} infinite both` }}
            />
          ))}
      </div>

      {/* partner illustration */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[min(118vw,560px)] -translate-x-1/2 opacity-80 md:left-[-2vw] md:w-[min(62vw,88dvh)] md:translate-x-0 md:opacity-100"
        aria-hidden
      >
        <div className="h-full w-full" style={{ animation: 'rfn-slide-left 1s cubic-bezier(.2,.8,.2,1) 400ms both' }}>
          <div
            className="absolute inset-[10%] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${partner.color}66, transparent 70%)` }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={charImage(profile.partner)}
            alt=""
            draggable={false}
            className="rfn-motion relative h-full w-full object-cover"
            style={{ ...PORTRAIT_MASK, animation: 'rfn-float 6s ease-in-out infinite' }}
          />
        </div>
      </div>

      {/* full-screen tap target */}
      <button
        type="button"
        onClick={() => start()}
        aria-label="タップしてスタート"
        className="absolute inset-0 z-10 cursor-pointer outline-none"
      />

      {/* top bar */}
      <div className="pointer-events-none relative z-20 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div
          className="pointer-events-auto rounded-2xl border border-amber-300/30 bg-slate-950/60 px-3 py-2 backdrop-blur-md"
          style={stagger(0, 300, 'rfn-slide-left')}
        >
          <p className="max-w-[9rem] truncate text-[11px] font-bold text-amber-50/90">{profile.playerName}</p>
          <RankBadge points={profile.rankPoints} size="sm" />
        </div>
        <div className="pointer-events-auto flex gap-2" style={stagger(0, 300, 'rfn-slide-right')}>
          <button
            type="button"
            className={topBtn}
            aria-label="遊び方"
            onClick={() => {
              holdemAudio.unlock();
              holdemAudio.se('click');
              setHowOpen(true);
            }}
          >
            <IconBook />
          </button>
          <button
            type="button"
            className={topBtn}
            aria-label="設定"
            onClick={() => {
              holdemAudio.unlock();
              holdemAudio.se('click');
              onOpenSettings();
            }}
          >
            <IconGear />
          </button>
        </div>
      </div>

      {/* logo */}
      <div className="pointer-events-none relative z-[5] mx-auto mt-[4dvh] flex w-full flex-col items-center px-4 md:ml-auto md:mr-[4vw] md:mt-[8dvh] md:w-[min(52vw,720px)]">
        <h1 className="sr-only">
          {GAME_TITLE} {GAME_TITLE_JA}
        </h1>
        <div
          className="relative w-[min(92vw,640px)] md:w-full"
          style={{ mixBlendMode: 'screen', animation: 'rfn-scale-in 900ms cubic-bezier(.2,.8,.2,1) 150ms both' }}
        >
          <div className="relative isolate overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HOLDEM_ASSETS.logo} alt="" draggable={false} className="block h-auto w-full" />
            {!reduced && (
              <div
                className="rfn-motion absolute inset-y-0 left-0 w-1/3"
                style={{
                  mixBlendMode: 'color-dodge',
                  background: 'linear-gradient(90deg, transparent, rgba(255,250,220,0.85), transparent)',
                  animation: 'rfn-shine 4.5s ease-in-out 1.4s infinite',
                }}
              />
            )}
          </div>
        </div>
        <div className="-mt-[2%] flex items-center gap-3" style={stagger(0, 700)}>
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-300/80 sm:w-14" />
          <p className="bg-gradient-to-b from-amber-50 via-amber-200 to-amber-500 bg-clip-text text-base font-black tracking-[0.35em] text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] sm:text-xl">
            {GAME_TITLE_JA}
          </p>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-300/80 sm:w-14" />
        </div>
        <p className="mt-2 text-[10px] tracking-[0.4em] text-amber-100/60" style={stagger(1, 700)}>
          NO-LIMIT TEXAS HOLD&apos;EM
        </p>
      </div>

      {/* tap to start */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[11dvh] z-[5] flex flex-col items-center md:bottom-[14dvh] md:left-auto md:right-[4vw] md:w-[min(52vw,720px)]">
        <div style={stagger(0, 1100)}>
          <div className="rfn-motion flex flex-col items-center" style={{ animation: 'rfn-pulse 2.2s ease-in-out infinite' }}>
            <p className="text-xl font-black tracking-[0.35em] text-amber-50 drop-shadow-[0_0_14px_rgba(251,191,36,0.9)] sm:text-2xl">
              TAP TO START
            </p>
            <p className="mt-1 text-xs font-bold tracking-[0.4em] text-amber-200/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              タップしてスタート
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur-sm" style={stagger(1, 1100)}>
          <span className="h-2 w-2 rounded-full" style={{ background: partner.color, boxShadow: `0 0 8px ${partner.color}` }} />
          <span className="text-[11px] text-slate-200">
            パートナー：<span className="font-bold" style={{ color: partner.color }}>{partner.name}</span>
          </span>
        </div>
        <div className="pointer-events-auto relative z-20 mt-3 flex flex-wrap justify-center gap-2 px-3" style={stagger(2, 1100)}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              start('quick');
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-slate-950/85 px-3.5 py-1.5 text-xs font-black text-amber-100 shadow-lg backdrop-blur-md transition hover:border-amber-200 hover:bg-slate-900 active:scale-95 ${FOCUS_RING}`}
          >
            <span aria-hidden>🌐</span>
            <span>オンライン対戦（全国マッチ）</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              start('friend');
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border border-teal-300/60 bg-slate-950/85 px-3.5 py-1.5 text-xs font-black text-teal-100 shadow-lg backdrop-blur-md transition hover:border-teal-200 hover:bg-slate-900 active:scale-95 ${FOCUS_RING}`}
          >
            <span aria-hidden>🔑</span>
            <span>フレンド個室（部屋作成・参加）</span>
          </button>
        </div>
      </div>

      {/* footer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex items-end justify-between px-3 pb-2 text-[9px] text-slate-400/80 sm:px-5 sm:text-[10px]">
        <span>© zatsudan-gacha — オリジナル作品</span>
        <span className="tabular-nums">{VERSION}</span>
      </div>

      {/* leave flash */}
      {leaving && (
        <div
          className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-amber-100/90 via-white/80 to-[#070b14]"
          style={{ animation: 'rfn-fade-in 480ms ease-in both' }}
          aria-hidden
        />
      )}

      <HowToPlayModal open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  );
}
