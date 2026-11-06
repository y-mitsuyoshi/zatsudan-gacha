'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { legalActions } from '../engine';
import { holdemAudio } from '../audio';
import { CHARACTERS, charImage, FELTS, HOLDEM_ASSETS, type CharId } from '../characters';
import {
  MODE_PRESETS,
  type HandReport,
  type SessionSummary,
  type TableConfig,
} from '../config';
import type { HoldemProfile, HoldemSettings } from '../profile';
import { ActionPanel } from './ActionPanel';
import { ChipStack } from './ChipStack';
import { CutInOverlay } from './CutInOverlay';
import { Hud } from './Hud';
import { PlayingCard } from './PlayingCard';
import { RankBadge } from './RankBadge';
import { ResultOverlay } from './ResultOverlay';
import { ActionBadge, PositionMarkers, SeatView, SpeechBubble } from './SeatView';
import { SettingsModal } from './SettingsModal';
import { TableStyles } from './TableStyles';
import {
  computeGeometry,
  fmt,
  inHandSeats,
  middlePot,
  STAMPS,
} from './tableUtils';
import { ThreeFx } from './ThreeFx';
import { useHoldemTable } from './useHoldemTable';

export interface TableScreenProps {
  config: TableConfig;
  profile: HoldemProfile;
  onProfileChange: (p: HoldemProfile) => void;
  onHandComplete: (r: HandReport) => void;
  onExit: (s: SessionSummary) => void;
  onRetry?: (s: SessionSummary) => void;
}

export function TableScreen({
  config,
  profile,
  onProfileChange,
  onHandComplete,
  onExit,
  onRetry,
}: TableScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [stampsOpen, setStampsOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 860, h: 460 });

  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 80 && r.height > 80) {
        setBox({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const paused = menuOpen || settingsOpen || confirmExit;
  const t = useHoldemTable({
    config,
    heroName: profile.playerName,
    settings: profile.settings,
    onHandComplete,
    onExit,
    onRetry,
    paused,
  });

  const { view } = t;
  const hero = view.seats[0];
  const heroChar = CHARACTERS[config.hero];
  const modePreset = MODE_PRESETS[config.mode];
  const feltAccent = FELTS.find((f) => f.id === config.felt)?.accent ?? '#34d399';

  const portrait = box.h > box.w * 1.05;
  const geo = useMemo(
    () => computeGeometry(view.seats.length, box.w, box.h, portrait),
    [view.seats.length, box.w, box.h, portrait],
  );

  const heroTurn = t.phase === 'playing' && view.toAct === 0;
  const heroLegal = useMemo(
    () => (heroTurn ? legalActions(view) : null),
    [heroTurn, view],
  );

  const activeOppCount = useMemo(
    () =>
      view.seats.filter(
        (s) => s.seat !== 0 && !s.sittingOut && !s.folded && s.holeCards.length > 0,
      ).length,
    [view.seats],
  );

  const heroInHand =
    !!hero && !hero.sittingOut && !hero.folded && hero.holeCards.length > 0;

  const displayStack = (seatIdx: number) => {
    const s = view.seats[seatIdx];
    if (!s) return 0;
    if (t.payoutPending && view.result) {
      return Math.max(0, s.stack - (view.result.payouts[seatIdx] ?? 0));
    }
    return s.stack;
  };

  const midPot = middlePot(view);

  const statusText = useMemo(() => {
    if (t.phase === 'dealing') return 'カードを配っています…';
    if (t.phase === 'handOver') return 'ハンド終了 — 次のハンドへ進めます';
    if (t.phase === 'sessionOver') return '対局終了';
    if (view.toAct !== null && view.seats[view.toAct]) {
      return `${view.seats[view.toAct].name} のアクション中…`;
    }
    return '進行中…';
  }, [t.phase, view]);

  const handleSettingsChange = (settings: HoldemSettings) => {
    onProfileChange({ ...profile, settings });
  };

  const heroFaceUp = !profile.settings.squeeze || t.heroPeeked || t.revealed.includes(0);
  const alivePlayers = inHandSeats(view).length;

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#060a14] text-slate-100 select-none">
      <TableStyles />
      <ThreeFx burstKey={t.fxKey} disabled={profile.settings.reducedFx} />
      <CutInOverlay
        data={t.cutIn}
        reducedFx={profile.settings.reducedFx}
        onSkip={t.dismissCutIn}
      />

      {/* Background Sky Lounge */}
      <div className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HOLDEM_ASSETS.bgLounge}
          alt=""
          className="h-full w-full scale-105 object-cover opacity-40 blur-[2px]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 45%, rgba(7,11,20,0.3) 0%, rgba(5,8,16,0.88) 75%, #04070e 100%)',
          }}
        />
      </div>

      {/* Top Toast Notifications */}
      <div className="pointer-events-none fixed right-3 top-14 z-50 flex flex-col gap-1.5">
        {t.toasts.map((item) => (
          <div
            key={item.id}
            style={{ animation: 'rf-toast 2.8s ease-out both' }}
            className={`rounded-xl border px-3.5 py-2 shadow-xl backdrop-blur-md ${
              item.tone === 'gold'
                ? 'border-amber-300 bg-amber-950/90 text-amber-100'
                : item.tone === 'danger'
                  ? 'border-rose-400/70 bg-rose-950/90 text-rose-100'
                  : 'border-sky-300/50 bg-slate-950/90 text-sky-100'
            }`}
          >
            <div className="text-xs font-black tracking-wide">{item.text}</div>
            {item.sub && (
              <div className="text-[10px] font-bold tracking-widest opacity-80">
                {item.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top Header Bar */}
      <header className="relative z-30 flex items-center justify-between gap-2 border-b border-amber-300/20 bg-slate-950/80 px-2.5 py-1.5 backdrop-blur-md sm:px-4 sm:py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="メニューを開く"
            onClick={() => {
              holdemAudio.se('click');
              setMenuOpen(true);
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-300/35 bg-slate-900/90 px-2.5 text-xs font-black text-amber-100 shadow transition hover:border-amber-300 active:scale-95"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z" />
            </svg>
            <span className="hidden sm:inline">メニュー</span>
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide text-amber-200 sm:text-sm">
                {modePreset.name}
              </span>
              <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-300">
                HAND #{view.handNumber}
              </span>
            </div>
            <div className="text-[10px] font-bold text-slate-300">
              {config.levelUpEveryHands > 0 ? `Lv.${t.level} · ` : ''}
              BLINDS {view.blinds.sb}/{view.blinds.bb}
              {view.blinds.ante > 0 ? ` (ANTE ${view.blinds.ante})` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden md:block">
            <RankBadge points={profile.rankPoints} size="sm" />
          </div>

          <button
            type="button"
            aria-label="スタンプを送る"
            onClick={() => {
              holdemAudio.se('click');
              setStampsOpen((v) => !v);
            }}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-black transition active:scale-95 ${
              stampsOpen
                ? 'border-amber-300 bg-amber-400/25 text-amber-100'
                : 'border-white/15 bg-slate-900/80 text-slate-200 hover:border-amber-300/40'
            }`}
          >
            💬 スタンプ
          </button>

          <button
            type="button"
            aria-label="ハンド履歴・ログ"
            onClick={() => {
              holdemAudio.se('click');
              setLogOpen((v) => !v);
            }}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-black transition active:scale-95 ${
              logOpen
                ? 'border-amber-300 bg-amber-400/25 text-amber-100'
                : 'border-white/15 bg-slate-900/80 text-slate-200 hover:border-amber-300/40'
            }`}
          >
            📜 ログ
          </button>

          <button
            type="button"
            aria-label="設定を開く"
            onClick={() => {
              holdemAudio.se('click');
              setSettingsOpen(true);
            }}
            className="rounded-xl border border-white/15 bg-slate-900/80 px-2.5 py-1.5 text-xs font-black text-slate-200 transition hover:border-amber-300/40 active:scale-95"
          >
            ⚙ 設定
          </button>
        </div>
      </header>

      {/* Center Table Arena */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-2 py-2 sm:px-6 sm:py-3">
        <div
          ref={arenaRef}
          className="relative h-[44dvh] min-h-[270px] w-full max-w-5xl sm:h-[54dvh] sm:min-h-[340px]"
        >
          {/* Oval Table Felt Image */}
          <div
            className="pointer-events-none absolute inset-[5%] overflow-hidden rounded-[999px] border-4 shadow-[0_20px_70px_rgba(0,0,0,0.85),inset_0_0_50px_rgba(0,0,0,0.75)] sm:inset-[6%]"
            style={{ borderColor: `${feltAccent}66` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HOLDEM_ASSETS.felt[config.felt]}
              alt=""
              draggable={false}
              className="h-full w-full scale-110 object-cover"
            />
            <div
              className="absolute inset-3 rounded-[999px] border"
              style={{ borderColor: `${feltAccent}44` }}
            />
          </div>

          {/* Central Pot Display */}
          <div
            className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: geo.pot.x, top: geo.pot.y }}
          >
            <div className="flex items-center gap-1.5 rounded-full border border-amber-300/45 bg-slate-950/85 px-3 py-1 shadow-lg backdrop-blur-md">
              <span className="text-[9px] font-black tracking-[0.25em] text-amber-200/80 uppercase">
                TOTAL POT
              </span>
              <span className="font-mono text-sm font-black text-amber-300 sm:text-base">
                {fmt(view.potTotal)}
              </span>
            </div>
            {midPot > 0 && !t.potFly && (
              <div className="mt-1">
                <ChipStack amount={midPot} size={geo.compact ? 18 : 22} showLabel={false} />
              </div>
            )}
          </div>

          {/* Flying Pot Chips to Winner */}
          {t.potFly &&
            t.potFly.map((wSeat) => {
              const target = geo.seats[wSeat] ?? geo.center;
              return (
                <div
                  key={`fly-${wSeat}`}
                  className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  style={
                    {
                      left: geo.pot.x,
                      top: geo.pot.y,
                      '--tx': `${target.x - geo.pot.x}px`,
                      '--ty': `${target.y - geo.pot.y}px`,
                      animation: 'rf-fly 650ms cubic-bezier(.2,.8,.2,1) forwards',
                    } as React.CSSProperties
                  }
                >
                  <ChipStack
                    amount={Math.max(10, Math.floor(view.potTotal / (t.potFly?.length || 1)))}
                    size={22}
                    showLabel={false}
                  />
                </div>
              );
            })}

          {/* 5 Community Board Cards */}
          <div
            className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 sm:gap-2"
            style={{ left: geo.center.x, top: geo.center.y + (portrait ? 14 : 18) }}
          >
            {Array.from({ length: 5 }).map((_, idx) => {
              const card = idx < t.boardShown ? view.board[idx] : null;
              const slotSize = geo.compact ? 'sm' : 'md';
              if (!card) {
                return (
                  <div
                    key={`slot-${idx}`}
                    className={`flex items-center justify-center rounded-lg border border-dashed border-amber-200/25 bg-black/25 text-[10px] font-black text-amber-200/30 ${
                      slotSize === 'sm' ? 'h-[54px] w-[38px]' : 'h-[73px] w-[52px]'
                    }`}
                  >
                    ♠
                  </div>
                );
              }
              const hl = t.highlight
                ? t.highlight.includes(card.id)
                  ? 'win'
                  : 'dim'
                : null;
              return (
                <PlayingCard
                  key={`${t.dealKey}-board-${idx}-${card.id}`}
                  card={card}
                  faceUp
                  size={slotSize}
                  highlight={hl}
                  flipInMs={120}
                  deal={{ dx: 0, dy: -28, delay: 0 }}
                />
              );
            })}
          </div>

          {/* All-In Showdown Banner */}
          {t.banner && (
            <div className="pointer-events-none absolute inset-x-0 top-[18%] z-40 flex justify-center">
              <div
                style={{ animation: 'rf-banner 420ms ease-out both' }}
                className="rounded-full border-2 border-amber-300 bg-gradient-to-r from-rose-950/95 via-amber-900/95 to-rose-950/95 px-6 py-1.5 text-sm font-black tracking-[0.2em] text-amber-100 shadow-[0_0_40px_rgba(251,191,36,0.7)] sm:text-lg"
              >
                ⚡ {t.banner} ⚡
              </div>
            </div>
          )}

          {/* Street Bets per Seat */}
          {view.seats.map((s, idx) => {
            if (s.bet <= 0) return null;
            const bPos = geo.bets[idx] ?? geo.center;
            const sPos = geo.seats[idx] ?? geo.center;
            return (
              <div
                key={`bet-${idx}-${s.bet}`}
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={
                  t.sweeping
                    ? ({
                        left: bPos.x,
                        top: bPos.y,
                        '--tx': `${geo.pot.x - bPos.x}px`,
                        '--ty': `${geo.pot.y - bPos.y}px`,
                        animation: 'rf-fly 450ms ease-in forwards',
                      } as React.CSSProperties)
                    : ({
                        left: bPos.x,
                        top: bPos.y,
                        '--fx': `${(sPos.x - bPos.x) * 0.5}px`,
                        '--fy': `${(sPos.y - bPos.y) * 0.5}px`,
                        animation: 'rf-chip-in 240ms ease-out both',
                      } as React.CSSProperties)
                }
              >
                <ChipStack amount={s.bet} size={geo.compact ? 17 : 20} />
              </div>
            );
          })}

          {/* Opponent Seats (seat 1..N-1) */}
          {view.seats.slice(1).map((seat) => {
            const idx = seat.seat;
            const pos = geo.seats[idx] ?? { x: geo.w / 2, y: 20 };
            const side: 'top' | 'left' | 'right' =
              pos.y < geo.h * 0.25
                ? 'top'
                : pos.x < geo.w * 0.5
                  ? 'left'
                  : 'right';
            return (
              <SeatView
                key={seat.seat}
                seat={seat}
                pos={pos}
                dealer={geo.dealer}
                compact={geo.compact}
                isButton={view.button === idx}
                isSB={view.sbSeat === idx}
                isBB={view.bbSeat === idx}
                acting={t.phase === 'playing' && view.toAct === idx}
                thinking={t.thinking === idx}
                badge={t.badges[idx]}
                bubble={t.bubbles[idx]}
                revealed={t.revealed.includes(idx)}
                winner={t.winners.includes(idx)}
                highlightIds={t.highlight}
                displayStack={displayStack(idx)}
                equity={t.equities?.[idx]}
                dealKey={t.dealKey}
                dealOrder={idx}
                players={alivePlayers}
                side={side}
              />
            );
          })}

          {/* Result Banner Floating Inside Table */}
          {t.result && !t.sessionEnd && (
            <div className="pointer-events-none absolute inset-x-2 bottom-2 z-30 flex justify-center">
              <ResultOverlay
                result={t.result}
                handOver={t.phase === 'handOver'}
                countdown={t.countdown}
                onNextHand={() => void t.nextHand()}
                onCancelAuto={t.cancelAuto}
                sessionEnd={null}
                heroCharId={config.hero}
                onFinishSession={t.finishSession}
                heroBusted={config.autoRebuy && (hero?.stack ?? 0) <= 0}
                canTopUp={
                  config.autoRebuy &&
                  (hero?.stack ?? 0) > 0 &&
                  (hero?.stack ?? 0) < config.startingStack
                }
                startingStack={config.startingStack}
                onTopUpHero={t.topUpHero}
                onLeaveTable={t.leaveTable}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stamp Quick Bar */}
      {stampsOpen && (
        <div className="relative z-30 mx-auto mb-1 flex max-w-2xl flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-amber-300/35 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur-md">
          {STAMPS.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                t.sendStamp(st.id);
                setStampsOpen(false);
              }}
              className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-900 px-2.5 py-1 text-xs font-bold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/20 active:scale-95"
            >
              <span>{st.emoji}</span>
              <span>{st.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Hero Console: Partner Illustration + Hole Cards + HUD + ActionPanel */}
      {hero && (
        <footer className="relative z-30 border-t border-amber-300/25 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/80 px-2.5 py-2 backdrop-blur-md sm:px-5 sm:py-3">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-end gap-2.5 lg:grid-cols-12">
            {/* Left: Partner Bust Illustration + Hero Hole Cards & Stack */}
            <div className="flex items-center justify-between gap-2.5 lg:col-span-5">
              {/* Partner Character Bust + Speech Bubble */}
              <div className="relative flex items-center gap-2.5">
                <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                  {t.badges[0] && <ActionBadge badge={t.badges[0]} className="-top-5" />}
                  {t.bubbles[0] && (
                    <SpeechBubble
                      bubble={t.bubbles[0]}
                      color={heroChar.color}
                      placement="top"
                      className="bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2"
                    />
                  )}
                  <div
                    className="h-full w-full overflow-hidden rounded-2xl border-2 shadow-lg"
                    style={{
                      borderColor: t.winners.includes(0) ? '#fde047' : heroChar.color,
                      boxShadow: heroTurn
                        ? `0 0 20px ${heroChar.color}`
                        : '0 6px 18px rgba(0,0,0,0.6)',
                      animation: 'rf-breathe 3.6s ease-in-out infinite',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={charImage(
                        config.hero,
                        t.winners.includes(0) ? 'win' : 'normal',
                      )}
                      alt={heroChar.name}
                      draggable={false}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-black text-white sm:text-sm">
                      {profile.playerName}
                    </span>
                    <PositionMarkers
                      isButton={view.button === 0}
                      isSB={view.sbSeat === 0}
                      isBB={view.bbSeat === 0}
                    />
                  </div>
                  <div className="text-[10px] font-bold" style={{ color: heroChar.color }}>
                    {heroChar.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-xs font-black text-amber-200 sm:text-sm">
                      {fmt(displayStack(0))}
                    </span>
                    {t.equities?.[0] !== undefined && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 font-mono text-[11px] font-black text-slate-950">
                        {t.equities[0].toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hero Hole Cards */}
              <div className="relative flex items-center gap-1.5 sm:gap-2">
                {hero.holeCards.map((c, i) => {
                  const hl = t.highlight
                    ? t.highlight.includes(c.id)
                      ? 'win'
                      : 'dim'
                    : null;
                  return (
                    <PlayingCard
                      key={`${t.dealKey}-hero-${i}-${c.id}`}
                      card={c}
                      faceUp={heroFaceUp}
                      size={geo.compact ? 'md' : 'lg'}
                      highlight={hl}
                      onClick={!heroFaceUp ? t.peek : undefined}
                      ariaLabel={!heroFaceUp ? 'タップして手札をめくる' : undefined}
                      deal={{ dx: 0, dy: -80, delay: 250 + i * 110 }}
                    />
                  );
                })}
                {!heroFaceUp && hero.holeCards.length > 0 && (
                  <button
                    type="button"
                    onClick={t.peek}
                    className="absolute inset-x-0 -bottom-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow"
                  >
                    👆 タップで絞る
                  </button>
                )}
              </div>
            </div>

            {/* Middle: HUD Analyzer */}
            <div className="lg:col-span-3">
              <Hud
                hole={hero.holeCards}
                board={view.board.slice(0, t.boardShown)}
                opponents={activeOppCount}
                callAmount={heroLegal?.callAmount ?? 0}
                potTotal={view.potTotal}
                visible={profile.settings.showHud && heroFaceUp}
                compact={geo.compact}
              />
            </div>

            {/* Right: Action Panel */}
            <div className="lg:col-span-4">
              <ActionPanel
                legal={heroLegal}
                potTotal={view.potTotal}
                heroBet={hero.bet}
                heroStack={hero.stack}
                bb={view.blinds.bb}
                sb={view.blinds.sb}
                heroInHand={heroInHand}
                preAction={t.preAction}
                onPreAction={t.setPreAction}
                onAction={t.heroAct}
                onClickSe={() => holdemAudio.se('click')}
                compact={geo.compact}
                statusText={statusText}
              />
            </div>
          </div>
        </footer>
      )}

      {/* Session End Modal */}
      <ResultOverlay
        result={null}
        handOver={false}
        countdown={null}
        onNextHand={() => void t.nextHand()}
        onCancelAuto={t.cancelAuto}
        sessionEnd={t.sessionEnd}
        heroCharId={config.hero}
        onFinishSession={t.finishSession}
        onRetrySession={t.retrySession}
      />

      {/* Hand Log & History Drawer */}
      {logOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ハンド履歴とアクションログ"
          className="fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-xs"
          onClick={() => setLogOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-sm flex-col border-l border-amber-300/30 bg-slate-950/95 p-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-bold tracking-[0.3em] text-amber-300 uppercase">
                  TABLE LOG
                </div>
                <h3 className="text-base font-black text-white">アクション履歴＆戦績</h3>
              </div>
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold text-white"
              >
                ✕ 閉じる
              </button>
            </div>

            <div className="mt-3 flex-1 space-y-4 overflow-y-auto pr-1 text-xs">
              <div>
                <h4 className="mb-1.5 text-[11px] font-black text-amber-200">
                  現在のハンド (#{view.handNumber})
                </h4>
                <div className="space-y-1 rounded-xl border border-white/10 bg-black/40 p-2.5">
                  {view.log.map((line, idx) => (
                    <div key={idx} className="text-[11px] text-slate-200">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {t.history.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[11px] font-black text-amber-200">
                    直近のハンド結果
                  </h4>
                  <div className="space-y-2">
                    {t.history.map((h) => (
                      <div
                        key={h.handNumber}
                        className="rounded-xl border border-white/10 bg-black/40 p-2.5"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-amber-200">
                            #{h.handNumber} {h.winnerNames}
                          </span>
                          <span
                            className={`font-mono ${
                              h.heroNet >= 0 ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {h.heroNet >= 0 ? '+' : ''}
                            {fmt(h.heroNet)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {h.handName || 'フォールド勝ち'} · POT {fmt(h.pot)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu Modal */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ポーズメニュー"
          className="fixed inset-0 z-[72] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl border border-amber-300/40 bg-slate-950/95 p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] font-bold tracking-[0.35em] text-amber-300/80 uppercase">
              PAUSE MENU
            </div>
            <h3 className="mt-1 text-lg font-black text-white">{modePreset.name}</h3>
            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  holdemAudio.se('click');
                  setMenuOpen(false);
                }}
                className="w-full rounded-xl bg-gradient-to-b from-amber-300 to-amber-600 py-2.5 text-xs font-black text-slate-950 shadow transition active:scale-95"
              >
                対局を続ける
              </button>
              {config.autoRebuy &&
                t.phase === 'handOver' &&
                (hero?.stack ?? 0) < config.startingStack && (
                  <button
                    type="button"
                    onClick={() => {
                      t.topUpHero();
                      setMenuOpen(false);
                    }}
                    className="w-full rounded-xl border border-amber-300/50 bg-amber-400/15 py-2.5 text-xs font-black text-amber-200 transition hover:bg-amber-400/25 active:scale-95"
                  >
                    🪙 チップを満額補充 ({fmt(config.startingStack)})
                  </button>
                )}
              <button
                type="button"
                onClick={() => {
                  holdemAudio.se('click');
                  setMenuOpen(false);
                  setSettingsOpen(true);
                }}
                className="w-full rounded-xl border border-white/20 bg-slate-900 py-2.5 text-xs font-bold text-slate-100 transition hover:border-amber-300/50 active:scale-95"
              >
                サウンド・表示設定
              </button>
              <button
                type="button"
                onClick={() => {
                  holdemAudio.se('click');
                  setMenuOpen(false);
                  setConfirmExit(true);
                }}
                className="w-full rounded-xl border border-rose-400/40 bg-rose-950/50 py-2.5 text-xs font-bold text-rose-200 transition hover:bg-rose-900/60 active:scale-95"
              >
                テーブルを離れる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Exit Modal */}
      {confirmExit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="退出確認"
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setConfirmExit(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl border border-rose-400/40 bg-slate-950 p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-white">テーブルを離れますか？</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {config.mode === 'lounge'
                ? '現在のチップ収支を記録してロビーへ戻ります。'
                : '途中のトーナメント／デュエルを終了してロビーへ戻ります。'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="rounded-xl border border-white/20 bg-slate-900 py-2.5 text-xs font-bold text-slate-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={t.leaveTable}
                className="rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 py-2.5 text-xs font-black text-white shadow"
              >
                ロビーへ戻る
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        settings={profile.settings}
        onChange={handleSettingsChange}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default TableScreen;
