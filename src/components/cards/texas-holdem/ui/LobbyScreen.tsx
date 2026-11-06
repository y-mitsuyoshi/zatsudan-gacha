'use client';

import React, { useState } from 'react';
import { holdemAudio } from '../audio';
import { CHARACTERS, CHAR_IDS, FELTS, HOLDEM_ASSETS, charImage, type CharId, type FeltId } from '../characters';
import { MODE_PRESETS, type GameModeId, type TableConfig } from '../config';
import { computeRank, type HoldemProfile } from '../profile';
import { CharAvatar } from './CharAvatar';
import { CharacterGallery } from './CharacterGallery';
import { ProfileModal } from './ProfileModal';
import { RankBadge } from './RankBadge';
import {
  FOCUS_RING,
  GOLD_TEXT,
  IconBack,
  IconCards,
  IconCoin,
  IconGear,
  IconPlay,
  IconUser,
  OutGameStyles,
  PORTRAIT_MASK,
  SUB_LABEL,
  fmt,
  randomLine,
  speakLine,
  stagger,
} from './OutGameKit';

export interface LobbyScreenProps {
  profile: HoldemProfile;
  onProfileChange(p: HoldemProfile): void;
  onPlay(cfg: TableConfig): void;
  onBack(): void;
  onOpenSettings(): void;
}

const MODE_ORDER: GameModeId[] = ['lounge', 'tournament', 'duel'];

const MODE_STYLE: Record<GameModeId, { accent: string; grad: string; icon: React.ReactNode }> = {
  lounge: {
    accent: '#34d399',
    grad: 'from-emerald-500/25 via-emerald-900/30 to-slate-950/80',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M8 3h8M9 3v4a3 3 0 0 0 6 0V3M12 10v7M8 21h8M12 17v4" strokeLinecap="round" />
      </svg>
    ),
  },
  tournament: {
    accent: '#fbbf24',
    grad: 'from-amber-400/25 via-violet-900/30 to-slate-950/80',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8l-1-3H9l-1 3Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  duel: {
    accent: '#fb7185',
    grad: 'from-rose-500/25 via-rose-950/30 to-slate-950/80',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4M7 14l-3 3 3 3 3-3M17 14l3 3-3 3-3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Home hub: partner stage, mode selection, table options and PLAY. */
export function LobbyScreen({ profile, onProfileChange, onPlay, onBack, onOpenSettings }: LobbyScreenProps) {
  const hero = profile.partner;
  const ch = CHARACTERS[hero];
  const rank = computeRank(profile.rankPoints);
  const voiceOn = profile.settings.voiceOn;
  const reduced = profile.settings.reducedFx;

  const [mode, setMode] = useState<GameModeId>('lounge');
  const [loungeSeats, setLoungeSeats] = useState<number>(6);
  const [duelPick, setDuelPick] = useState<CharId>(() => CHAR_IDS.find((id) => id !== profile.partner) ?? 'rei');
  const [felt, setFelt] = useState<FeltId>('emerald');
  const [bubble, setBubble] = useState<{ text: string; key: number }>(() => ({ text: ch.catchphrase, key: 0 }));
  const [profileOpen, setProfileOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [tapKey, setTapKey] = useState(0);

  const others = CHAR_IDS.filter((id) => id !== hero);
  const duelOpponent: CharId = duelPick !== hero ? duelPick : others[0];
  const preset = MODE_PRESETS[mode];
  const seats = mode === 'lounge' ? loungeSeats : preset.seats[0];

  const click = () => holdemAudio.se('click');

  const tapPartner = () => {
    const line = randomLine(hero, ['select', 'greet']);
    speakLine(hero, line, voiceOn);
    setBubble({ text: line, key: Date.now() });
    setTapKey((k) => k + 1);
  };

  const play = () => {
    if (launching) return;
    const opponents = mode === 'duel' ? [duelOpponent] : shuffled(others).slice(0, seats - 1);
    const cfg: TableConfig = {
      mode,
      hero,
      opponents,
      felt,
      startingStack: preset.startingStack,
      blinds: { ...preset.blinds },
      levelUpEveryHands: preset.levelUpEveryHands,
      autoRebuy: preset.autoRebuy,
    };
    holdemAudio.se('open');
    const line = randomLine(hero, ['greet']);
    speakLine(hero, line, voiceOn);
    setBubble({ text: line, key: Date.now() });
    setLaunching(true);
    window.setTimeout(() => onPlay(cfg), reduced ? 60 : 650);
  };

  const topBtn = `inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-300/30 bg-gradient-to-b from-slate-800/90 to-slate-950/90 px-2.5 text-amber-100 transition hover:brightness-125 active:scale-[0.96] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_14px_rgba(0,0,0,0.45)] ${FOCUS_RING}`;

  return (
    <div className={`relative min-h-[100dvh] w-full overflow-x-hidden bg-[#070b14] text-white lg:h-[100dvh] lg:overflow-hidden ${reduced ? 'rfn-reduced' : ''}`}>
      <OutGameStyles />

      {/* background */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HOLDEM_ASSETS.bgLounge} alt="" className="h-full w-full scale-105 object-cover" draggable={false} />
        <div className="absolute inset-0 bg-[#070b14]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,transparent_25%,rgba(3,5,12,0.9)_100%)]" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 28% 55%, ${ch.color}30, transparent 45%)` }} />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#070b14] to-transparent" />
      </div>

      <div className="relative flex min-h-[100dvh] flex-col lg:h-full lg:min-h-0">
        {/* ── top bar ── */}
        <header className="relative z-20 flex flex-wrap items-center gap-2 px-3 pt-3 sm:px-5" style={stagger(0, 0, 'rfn-fade-in')}>
          <button type="button" className={topBtn} aria-label="タイトルへ戻る" onClick={() => { click(); onBack(); }}>
            <IconBack />
            <span className="hidden text-xs font-bold sm:inline">戻る</span>
          </button>
          <button
            type="button"
            onClick={() => { click(); setProfileOpen(true); }}
            aria-label="プロフィールを開く"
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-amber-300/30 bg-slate-950/70 px-2.5 py-1.5 text-left backdrop-blur-md transition hover:border-amber-300/60 sm:flex-none ${FOCUS_RING}`}
          >
            <CharAvatar id={hero} size={34} />
            <div className="min-w-0">
              <p className="max-w-[8rem] truncate text-xs font-black text-amber-50">{profile.playerName}</p>
              <RankBadge points={profile.rankPoints} size="sm" showProgress />
            </div>
          </button>
          <div className="flex h-10 items-center gap-1.5 rounded-full border border-amber-300/30 bg-slate-950/70 pl-1.5 pr-2.5 backdrop-blur-md" aria-label={`コイン ${profile.coins}`}>
            <IconCoin className="h-6 w-6" />
            <span className="text-sm font-black tabular-nums text-amber-100">{fmt(profile.coins)}</span>
            {profile.coins < 1000 && (
              <button
                type="button"
                onClick={() => {
                  holdemAudio.se('chips');
                  onProfileChange({ ...profile, coins: profile.coins + 2000 });
                  const line = 'ラウンジからの特別サポートよ！2,000コインを補充しておいたわ！';
                  setBubble({ text: line, key: Date.now() });
                }}
                className="ml-1 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow transition hover:brightness-110 active:scale-95"
                title="コインが少なくなった時の無料救済ボーナス（+2,000）を受け取る"
              >
                +無料補給
              </button>
            )}
          </div>
          <div className="ml-auto flex gap-1.5">
            <button type="button" className={topBtn} aria-label="プロフィール" onClick={() => { click(); setProfileOpen(true); }}>
              <IconUser />
              <span className="hidden text-xs font-bold md:inline">プロフィール</span>
            </button>
            <button type="button" className={topBtn} aria-label="キャラクター" onClick={() => { click(); setGalleryOpen(true); }}>
              <IconCards />
              <span className="hidden text-xs font-bold md:inline">キャラクター</span>
            </button>
            <button type="button" className={topBtn} aria-label="設定" onClick={() => { click(); onOpenSettings(); }}>
              <IconGear />
              <span className="hidden text-xs font-bold md:inline">設定</span>
            </button>
          </div>
        </header>

        <main className="relative z-10 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          {/* ── partner stage ── */}
          <section className="relative flex min-h-[340px] flex-col items-center justify-end sm:min-h-[420px] lg:min-h-0" aria-label="パートナー">
            <div className="relative aspect-square h-[330px] max-w-full sm:h-[420px] lg:h-[min(78dvh,760px)]" style={{ animation: 'rfn-slide-left 700ms cubic-bezier(.2,.8,.2,1) 120ms both' }}>
              <div className="absolute inset-[14%] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${ch.color}70, transparent 70%)` }} />
              <button
                type="button"
                onClick={tapPartner}
                aria-label={`${ch.name}に話しかける`}
                className={`group relative block h-full w-full rounded-[40%] ${FOCUS_RING}`}
              >
                <div key={hero} className="h-full w-full" style={{ animation: 'rfn-fade-in 500ms ease-out both' }}>
                  <div
                    key={tapKey}
                    className="h-full w-full"
                    style={tapKey ? { animation: 'rfn-scale-in 360ms cubic-bezier(.2,1.6,.4,1) both' } : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={charImage(hero, launching ? 'win' : 'normal')}
                      alt={ch.name}
                      draggable={false}
                      className="rfn-motion h-full w-full object-cover transition duration-300 group-hover:brightness-110"
                      style={{ ...PORTRAIT_MASK, animation: 'rfn-float 5.5s ease-in-out infinite' }}
                    />
                  </div>
                </div>
              </button>
              {/* speech bubble */}
              <div
                key={bubble.key}
                role="status"
                className="pointer-events-none absolute right-[2%] top-[6%] z-10 max-w-[62%] rounded-2xl border bg-white/95 px-3 py-2 text-[13px] font-bold leading-snug text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.5)] sm:text-sm"
                style={{ borderColor: ch.color, animation: `rfn-bubble ${bubble.key ? 5 : 6}s ease-out ${bubble.key ? 0 : 0.9}s both` }}
              >
                {bubble.text}
                <span className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-b border-r bg-white/95" style={{ borderColor: ch.color }} />
              </div>
            </div>

            {/* name plate */}
            <div
              className="absolute bottom-3 left-3 z-10 max-w-[78%] overflow-hidden rounded-2xl border bg-slate-950/75 py-2 pl-4 pr-4 backdrop-blur-md sm:bottom-6 sm:left-6 lg:bottom-8 lg:left-8"
              style={{ borderColor: `${ch.color}88`, boxShadow: `0 0 24px ${ch.color}33, inset 0 1px 0 rgba(255,255,255,0.12)`, ...stagger(0, 420, 'rfn-slide-left') }}
            >
              <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: `linear-gradient(${ch.color}, ${ch.color2})` }} />
              <p className="text-[9px] font-bold tracking-[0.35em]" style={{ color: ch.color }}>
                PARTNER · {ch.nameEn}
              </p>
              <p className="text-lg font-black tracking-wide text-white sm:text-2xl">{ch.name}</p>
              <p className="text-[11px] font-bold text-amber-200 sm:text-xs">{ch.title}</p>
              <p className="mt-0.5 hidden text-xs italic text-slate-300 sm:block">「{ch.catchphrase}」</p>
            </div>
            <button
              type="button"
              onClick={() => { click(); setGalleryOpen(true); }}
              aria-label="パートナーを変更"
              className={`absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-slate-950/70 px-3 py-1.5 text-[11px] font-bold text-amber-100 backdrop-blur-md transition hover:bg-slate-900 active:scale-95 sm:bottom-6 sm:right-6 lg:bottom-8 ${FOCUS_RING}`}
            >
              <IconCards className="h-4 w-4" />
              変更
            </button>
          </section>

          {/* ── mode panel ── */}
          <section className="relative flex min-h-0 flex-col px-3 pb-4 pt-2 sm:px-5 lg:py-4 lg:pr-6" aria-label="モード選択">
            <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-amber-300/30 bg-slate-950/70 shadow-[0_20px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(253,230,138,0.2)] backdrop-blur-md" style={stagger(0, 160, 'rfn-slide-right')}>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3.5 sm:p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className={SUB_LABEL}>GAME MODE</p>
                    <h2 className={`text-xl font-black tracking-wide sm:text-2xl ${GOLD_TEXT}`}>モード選択</h2>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    現在 <span className="font-bold" style={{ color: rank.tier.color }}>{rank.label}</span>
                  </p>
                </div>

                {/* mode cards */}
                <div className="space-y-2.5" role="radiogroup" aria-label="ゲームモード">
                  {MODE_ORDER.map((id, i) => {
                    const p = MODE_PRESETS[id];
                    const st = MODE_STYLE[id];
                    const active = mode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`${p.name}：${p.description}`}
                        onClick={() => { if (!active) { click(); setMode(id); } }}
                        className={`group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br p-3 text-left transition duration-200 active:scale-[0.985] sm:p-3.5 ${st.grad} ${FOCUS_RING} ${
                          active ? 'scale-[1.0]' : 'border-white/10 opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          ...stagger(i, 260),
                          borderColor: active ? st.accent : undefined,
                          boxShadow: active ? `0 0 0 1px ${st.accent}, 0 0 26px ${st.accent}44, inset 0 1px 0 rgba(255,255,255,0.15)` : undefined,
                        }}
                      >
                        {active && (
                          <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                            <span
                              className="rfn-motion absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                              style={{ animation: 'rfn-shine 3.5s ease-in-out infinite' }}
                            />
                          </span>
                        )}
                        <div className="relative flex items-start gap-3">
                          <span
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-black/40"
                            style={{ color: st.accent, borderColor: `${st.accent}66` }}
                          >
                            {st.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold tracking-[0.3em]" style={{ color: st.accent }}>
                              {p.nameEn}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-black tracking-wide text-white sm:text-lg">{p.name}</p>
                              {p.rankMultiplier !== 1 && (
                                <span className="rounded-md bg-gradient-to-b from-amber-200 to-amber-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                                  RANK ×{p.rankMultiplier}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{p.description}</p>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                              <span>
                                初期スタック <b className="tabular-nums text-amber-100">{fmt(p.startingStack)}</b>
                              </span>
                              <span>
                                ブラインド <b className="tabular-nums text-amber-100">{p.blinds.sb}/{p.blinds.bb}</b>
                              </span>
                              {p.levelUpEveryHands > 0 && <span>{p.levelUpEveryHands}ハンド毎に上昇</span>}
                              {p.rankMultiplier === 1 && <span>ランク ×1</span>}
                            </div>
                          </div>
                          <span
                            className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${active ? '' : 'border-white/25'}`}
                            style={active ? { borderColor: st.accent, background: st.accent } : undefined}
                            aria-hidden
                          >
                            {active && <span className="h-2 w-2 rounded-full bg-slate-950" />}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* mode options */}
                <div key={mode} className="rounded-2xl border border-white/10 bg-black/30 p-3" style={{ animation: 'rfn-fade-up 280ms ease-out both' }}>
                  {mode === 'lounge' && (
                    <div>
                      <p className={`${SUB_LABEL} mb-1.5`}>TABLE SIZE · 人数</p>
                      <div className="grid grid-cols-2 gap-1 rounded-xl border border-amber-300/25 bg-black/40 p-1" role="radiogroup" aria-label="テーブル人数">
                        {MODE_PRESETS.lounge.seats.map((n) => {
                          const active = loungeSeats === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              aria-label={`${n}人テーブル`}
                              onClick={() => { if (!active) { click(); setLoungeSeats(n); } }}
                              className={`rounded-lg py-2 text-sm font-black transition active:scale-[0.96] ${FOCUS_RING} ${
                                active
                                  ? 'bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]'
                                  : 'text-amber-100/70 hover:bg-white/5'
                              }`}
                            >
                              {n}人
                              <span className="ml-1 text-[10px] font-bold opacity-70">{n === 4 ? 'SHORT' : 'FULL'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {mode === 'tournament' && (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {others.map((id) => (
                          <CharAvatar key={id} id={id} size={30} />
                        ))}
                      </div>
                      <p className="text-[11px] leading-snug text-slate-300">
                        全キャラクター参戦の<b className="text-amber-200">6人</b>トーナメント。優勝でランクポイント大量獲得！
                      </p>
                    </div>
                  )}
                  {mode === 'duel' && (
                    <div>
                      <p className={`${SUB_LABEL} mb-1.5`}>OPPONENT · 対戦相手</p>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="対戦相手">
                        {others.map((id) => {
                          const c = CHARACTERS[id];
                          const active = duelOpponent === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              aria-label={`対戦相手：${c.name}`}
                              onClick={() => {
                                if (active) return;
                                click();
                                setDuelPick(id);
                              }}
                              className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 transition active:scale-95 ${FOCUS_RING} ${
                                active ? 'bg-slate-900' : 'border-white/10 bg-black/30 opacity-70 hover:opacity-100'
                              }`}
                              style={active ? { borderColor: c.color, boxShadow: `0 0 14px ${c.color}55` } : undefined}
                            >
                              <CharAvatar id={id} size={28} active={active} />
                              <span className="text-[11px] font-bold" style={{ color: active ? c.color : undefined }}>
                                {c.name.split(' ').pop()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        {CHARACTERS[duelOpponent].styleLabel}・{CHARACTERS[duelOpponent].title}
                      </p>
                    </div>
                  )}
                </div>

                {/* felt picker */}
                <div>
                  <p className={`${SUB_LABEL} mb-1.5`}>TABLE FELT · テーブル</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="テーブルクロス">
                    {FELTS.map((f) => {
                      const active = felt === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={`テーブル：${f.name}`}
                          onClick={() => { if (!active) { click(); setFelt(f.id); } }}
                          className={`group overflow-hidden rounded-xl border bg-black/40 text-left transition active:scale-[0.96] ${FOCUS_RING} ${
                            active ? '' : 'border-white/10 opacity-70 hover:opacity-100'
                          }`}
                          style={active ? { borderColor: f.accent, boxShadow: `0 0 16px ${f.accent}55` } : undefined}
                        >
                          <div className="aspect-video overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={HOLDEM_ASSETS.felt[f.id]}
                              alt=""
                              loading="lazy"
                              draggable={false}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                            />
                          </div>
                          <p className="truncate px-1.5 py-1 text-[9px] font-bold sm:text-[10px]" style={{ color: active ? f.accent : undefined }}>
                            {f.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PLAY */}
              <div className="shrink-0 border-t border-amber-300/15 p-3.5 sm:p-4">
                <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    {preset.name}・<b className="text-amber-100">{seats}人</b>
                  </span>
                  <span className="flex items-center gap-1">
                    {(mode === 'duel' ? [duelOpponent] : []).map((id) => (
                      <CharAvatar key={id} id={id} size={18} />
                    ))}
                    {mode === 'duel' ? 'と一騎打ち' : `${seats - 1}人のライバル`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={play}
                  disabled={launching}
                  aria-label={`対局開始：${preset.name}`}
                  className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-amber-100/80 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 py-3.5 text-slate-950 transition duration-150 hover:brightness-110 active:scale-[0.97] disabled:brightness-125 sm:py-4 ${FOCUS_RING}`}
                  style={{ animation: 'rfn-glow 2.4s ease-in-out infinite' }}
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" aria-hidden />
                  <span
                    className="rfn-motion pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                    style={{ animation: 'rfn-shine 2.8s ease-in-out infinite' }}
                    aria-hidden
                  />
                  <IconPlay className="relative h-6 w-6" />
                  <span className="relative flex flex-col items-start leading-none">
                    <span className="text-xl font-black tracking-[0.2em] sm:text-2xl">対局開始</span>
                    <span className="mt-1 text-[10px] font-black tracking-[0.5em] opacity-70">PLAY</span>
                  </span>
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {launching && (
        <div
          className="pointer-events-none fixed inset-0 z-[60] bg-[radial-gradient(circle,rgba(253,230,138,0.6),#070b14_70%)]"
          style={{ animation: 'rfn-fade-in 600ms ease-in both' }}
          aria-hidden
        />
      )}

      <ProfileModal
        open={profileOpen}
        profile={profile}
        onClose={() => setProfileOpen(false)}
        onRename={(name) => onProfileChange({ ...profile, playerName: name })}
      />
      <CharacterGallery
        open={galleryOpen}
        profile={profile}
        onClose={() => setGalleryOpen(false)}
        onSelectPartner={(id) => {
          onProfileChange({ ...profile, partner: id });
          setBubble({ text: CHARACTERS[id].catchphrase, key: Date.now() });
        }}
      />
    </div>
  );
}
