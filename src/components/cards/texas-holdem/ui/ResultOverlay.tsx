'use client';

import React from 'react';
import { CHARACTERS, charImage, pickLine, type CharId } from '../characters';
import { fmt, rankLabel, SUIT_SYMBOL } from './tableUtils';
import type { ResultInfo, SessionEndInfo } from './useHoldemTable';

export interface ResultOverlayProps {
  result: ResultInfo | null;
  handOver: boolean;
  countdown: number | null;
  onNextHand: () => void;
  onCancelAuto: () => void;
  sessionEnd: SessionEndInfo | null;
  heroCharId: CharId;
  onFinishSession: () => void;
  onRetrySession?: () => void;
  heroBusted?: boolean;
  canTopUp?: boolean;
  startingStack?: number;
  onTopUpHero?: () => void;
  onLeaveTable?: () => void;
}

export function ResultOverlay({
  result,
  handOver,
  countdown,
  onNextHand,
  onCancelAuto,
  sessionEnd,
  heroCharId,
  onFinishSession,
  onRetrySession,
  heroBusted = false,
  canTopUp = false,
  startingStack = 2000,
  onTopUpHero,
  onLeaveTable,
}: ResultOverlayProps) {
  const ch = CHARACTERS[heroCharId];

  if (sessionEnd) {
    const isChampion = sessionEnd.placement === 1;
    const isBusted = sessionEnd.placement > 1;
    const net = sessionEnd.summary.netChips;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="対局結果"
        className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      >
        <div
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-300/50 bg-slate-950/95 p-6 text-center shadow-[0_0_70px_rgba(251,191,36,0.3)]"
          style={{ animation: 'rf-fadeup 320ms ease-out both' }}
        >
          <p className="text-[10px] font-bold tracking-[0.35em] text-amber-300/80 uppercase">
            {isChampion
              ? 'TOURNAMENT CHAMPION'
              : isBusted
                ? 'BUSTED OUT · チップ消失'
                : 'SESSION COMPLETE'}
          </p>
          <h3 className="mt-1 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">
            {isChampion
              ? '優勝おめでとう！'
              : sessionEnd.placement > 0
                ? `第 ${sessionEnd.placement} 位で終了`
                : '対局終了'}
          </h3>

          <div className="mx-auto mt-4 h-32 w-32 overflow-hidden rounded-full border-2 border-amber-300/70 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={charImage(heroCharId, isChampion ? 'win' : 'normal')}
              alt={ch.name}
              className="h-full w-full object-cover object-top"
            />
          </div>

          <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs italic text-slate-200">
            「{pickLine(heroCharId, isChampion ? 'bigWin' : 'lose')}」
          </p>

          {isBusted && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-[11px] font-bold text-amber-200">
              <span>🎁 救済サポートボーナス</span>
              <span className="font-mono font-black text-amber-300">+50 🪙</span>
            </div>
          )}

          <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/45 p-3 text-xs">
            <div>
              <div className="text-[10px] text-slate-400">順位</div>
              <div className="mt-0.5 font-black text-amber-200">
                {sessionEnd.placement > 0
                  ? `${sessionEnd.placement} / ${sessionEnd.summary.players}位`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">プレイハンド</div>
              <div className="mt-0.5 font-mono font-black text-white">
                {sessionEnd.summary.handsPlayed}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">チップ収支</div>
              <div
                className={`mt-0.5 font-mono font-black ${
                  net >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {net >= 0 ? '+' : ''}
                {fmt(net)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {onRetrySession && (
              <button
                type="button"
                onClick={onRetrySession}
                className="flex-1 rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 py-3 text-xs font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(0,0,0,0.45)] transition hover:brightness-110 active:scale-95 sm:text-sm"
              >
                🔄 チップ満額で再挑戦
              </button>
            )}
            <button
              type="button"
              onClick={onFinishSession}
              className={`rounded-xl py-3 text-xs font-black transition active:scale-95 sm:text-sm ${
                onRetrySession
                  ? 'flex-1 border border-white/20 bg-slate-900 text-slate-100 hover:border-amber-300/50'
                  : 'w-full border border-amber-200/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(0,0,0,0.45)] hover:brightness-110'
              }`}
            >
              ロビーへ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;
  const winChar = CHARACTERS[result.winnerCharId] ?? ch;
  const heroWon = result.heroWon;
  const winnerHoleIds = new Set((result.winnerHoleCards ?? []).map((c) => c.id));
  const roleBadge = result.winnerIsSelf
    ? '🌟 YOU'
    : result.winnerIsHuman
      ? '🟢 👤 PLAYER'
      : '🤖 CPU';

  return (
    <div
      className={`pointer-events-auto relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border px-3.5 py-2.5 text-center backdrop-blur-md sm:px-4 sm:py-3 ${
        heroWon
          ? 'border-amber-300/75 bg-gradient-to-b from-slate-950/95 via-amber-950/35 to-slate-950/95 shadow-[0_14px_44px_rgba(0,0,0,0.85),0_0_32px_rgba(251,191,36,0.35)]'
          : 'border-rose-400/55 bg-gradient-to-b from-slate-950/95 via-rose-950/30 to-slate-950/95 shadow-[0_14px_44px_rgba(0,0,0,0.88),0_0_26px_rgba(244,63,94,0.22)]'
      }`}
      style={{ animation: 'rf-fadeup 260ms ease-out both' }}
    >
      {/* Top shimmer accent bar */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: heroWon
            ? `linear-gradient(90deg, transparent, ${winChar.color}, #fde047, ${winChar.color2}, transparent)`
            : `linear-gradient(90deg, transparent, #fb7185, ${winChar.color}, #fb7185, transparent)`,
        }}
      />

      <div className="flex items-start gap-3 text-left">
        {/* Winner Portrait Showcase */}
        <div className="relative shrink-0">
          <div
            className="h-14 w-14 overflow-hidden rounded-2xl border-2 shadow-[0_0_20px_rgba(253,224,71,0.45)] sm:h-16 sm:w-16"
            style={{
              borderColor: heroWon ? '#fde047' : '#fb7185',
              background: `radial-gradient(circle at 50% 30%, ${winChar.color}66, #090d1a 80%)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={charImage(result.winnerCharId, 'win')}
              alt={winChar.name}
              draggable={false}
              className="h-full w-full object-cover object-top"
            />
          </div>
          <span
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-[1px] text-[9px] font-black tracking-wider shadow ${
              heroWon
                ? 'border-amber-100 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 text-slate-950'
                : 'border-rose-200 bg-gradient-to-r from-rose-500 to-amber-500 text-white'
            }`}
          >
            {heroWon ? '👑 YOU WIN' : '⚔️ WINNER'}
          </span>
        </div>

        {/* Winner Headline, Hand Rank & Winning 5-Card Strip */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-black tracking-[0.12em]">
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${
                  heroWon
                    ? 'border-amber-300/60 bg-amber-400/20 text-amber-200'
                    : 'border-rose-300/50 bg-rose-500/20 text-rose-200'
                }`}
              >
                <span>{heroWon ? '🎉 あなたの勝利' : `⚔️ ${result.winnerName} の勝利`}</span>
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                  result.winnerIsSelf
                    ? 'bg-amber-400/25 text-amber-200 border border-amber-300/40'
                    : result.winnerIsHuman
                      ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-300/45'
                      : 'bg-slate-800 text-slate-300 border border-white/15'
                }`}
              >
                {roleBadge}
              </span>
            </div>
            <span className="rounded-full border border-amber-300/40 bg-black/50 px-2.5 py-0.5 font-mono text-[11px] font-black text-amber-300">
              POT {fmt(result.pot)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <div
              className={`truncate bg-clip-text text-base font-black text-transparent sm:text-lg ${
                heroWon
                  ? 'bg-gradient-to-b from-white via-amber-100 to-amber-400'
                  : 'bg-gradient-to-b from-white via-rose-100 to-rose-300'
              }`}
            >
              {result.title}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-black ${
                result.heroNet > 0
                  ? 'border border-emerald-400/45 bg-emerald-500/25 text-emerald-200'
                  : result.heroNet < 0
                    ? 'border border-rose-400/40 bg-rose-500/20 text-rose-200'
                    : 'bg-white/10 text-slate-300'
              }`}
            >
              あなた収支: {result.heroNet >= 0 ? '+' : ''}
              {fmt(result.heroNet)}
            </span>
          </div>

          {/* Highlighted Winning Hand (上がり役) Box */}
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/35 bg-black/45 px-2.5 py-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black tracking-wider text-amber-200">
                🏆 上がり役
              </span>
              <span className="text-xs font-black text-amber-100 sm:text-sm">
                {result.showdown
                  ? result.handDetailJa || result.handName || 'ハイカード'
                  : 'フォールド勝ち（全員降り）'}
              </span>
            </div>

            {result.showdown && result.best5 && result.best5.length > 0 && (
              <div className="flex items-center gap-1" aria-label="勝利ハンドの5枚">
                <span className="mr-0.5 text-[9px] font-bold text-amber-200/80">成立5枚:</span>
                {result.best5.map((c) => {
                  const isRed = c.suit === 'h' || c.suit === 'd';
                  const fromHole = winnerHoleIds.has(c.id);
                  return (
                    <span
                      key={c.id}
                      title={fromHole ? '勝者の手札カード' : 'コミュニティボード'}
                      className={`relative inline-flex items-center gap-0.5 rounded border px-1.5 py-[1px] font-mono text-[10px] font-black shadow-sm ${
                        fromHole
                          ? 'border-amber-300 bg-gradient-to-b from-amber-100 to-amber-200 ring-1 ring-amber-400'
                          : 'border-slate-300/80 bg-gradient-to-b from-white to-slate-100'
                      } ${isRed ? 'text-red-600' : 'text-slate-900'}`}
                    >
                      <span>{rankLabel(c.rank)}</span>
                      <span>{SUIT_SYMBOL[c.suit]}</span>
                      {fromHole && (
                        <span className="ml-0.5 rounded bg-amber-600 px-0.5 text-[7px] font-black text-white">
                          手札
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Showdown Contenders Hand Comparison Strip */}
          {result.showdown &&
            result.showdownContenders &&
            result.showdownContenders.length > 1 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {result.showdownContenders.map((ct) => {
                  const tag = ct.isSelf
                    ? '🌟YOU'
                    : ct.isHumanPlayer
                      ? '🟢👤'
                      : '🤖';
                  return (
                    <div
                      key={ct.seat}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] ${
                        ct.isWinner
                          ? 'border-amber-300/70 bg-amber-400/15 text-amber-100 font-black'
                          : 'border-white/15 bg-slate-900/80 text-slate-300 font-bold'
                      }`}
                    >
                      <span>{ct.isWinner ? '👑' : ''}</span>
                      <span className="text-[9px] opacity-85">{tag}</span>
                      <span className="max-w-[72px] truncate">{ct.playerName ?? `Seat ${ct.seat}`}</span>
                      <span className="inline-flex items-center gap-0.5">
                        {(ct.holeCards ?? []).map((hc) => {
                          const red = hc.suit === 'h' || hc.suit === 'd';
                          return (
                            <span
                              key={hc.id}
                              className={`rounded bg-white px-1 py-[0.5px] font-mono text-[9px] font-black ${
                                red ? 'text-red-600' : 'text-slate-900'
                              }`}
                            >
                              {rankLabel(hc.rank)}
                              {SUIT_SYMBOL[hc.suit]}
                            </span>
                          );
                        })}
                      </span>
                      <span className="text-amber-200/95">
                        {ct.detailJa || ct.nameJa}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

          {result.pots.length > 1 && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {result.pots.map((p) => (
                <span
                  key={p.label}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-100"
                >
                  {p.label}: {fmt(p.amount)} ({p.winners})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {handOver && heroBusted && (
        <div className="mt-2.5 rounded-xl border border-rose-400/40 bg-rose-950/45 p-2.5 text-left">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={charImage(heroCharId, 'normal')}
              alt={ch.name}
              className="h-10 w-10 shrink-0 rounded-full border border-amber-300/60 object-cover object-top"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-black text-rose-200">
                💸 チップがなくなりました（BUSTED）
              </div>
              <div className="text-[11px] leading-snug text-slate-200">
                無料リバイで初期スタック（<span className="font-mono font-black text-amber-300">{fmt(startingStack)}</span>）を補充してすぐに復帰できます！
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onNextHand}
              className="flex-1 rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 px-3 py-2 text-xs font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_14px_rgba(0,0,0,0.45)] transition hover:brightness-110 active:scale-95"
            >
              🪙 無料リバイして続行 (+{fmt(startingStack)})
            </button>
            {onLeaveTable && (
              <button
                type="button"
                onClick={onLeaveTable}
                className="rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-200 hover:text-white"
              >
                ロビーへ戻る
              </button>
            )}
          </div>
        </div>
      )}

      {handOver && !heroBusted && (
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onNextHand}
            className="relative flex-1 overflow-hidden rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_14px_rgba(0,0,0,0.45)] transition hover:brightness-110 active:scale-95 sm:text-sm"
          >
            {countdown !== null && (
              <span
                className="pointer-events-none absolute inset-y-0 left-0 bg-white/30 transition-all duration-1000 ease-linear"
                style={{ width: `${Math.max(0, Math.min(100, ((5 - countdown) / 5) * 100))}%` }}
              />
            )}
            <span className="relative z-10">
              次のハンドへ {countdown !== null ? `(${countdown}s)` : ''} →
            </span>
          </button>
          {canTopUp && onTopUpHero && (
            <button
              type="button"
              onClick={onTopUpHero}
              className="rounded-xl border border-amber-300/45 bg-amber-400/15 px-2.5 py-2 text-[11px] font-black text-amber-200 transition hover:bg-amber-400/25 active:scale-95"
              title={`チップを初期スタック（${fmt(startingStack)}）まで無料で補充します`}
            >
              🪙 満額補充
            </button>
          )}
          {countdown !== null && (
            <button
              type="button"
              onClick={onCancelAuto}
              className="rounded-xl border border-white/20 bg-slate-900 px-2.5 py-2 text-[11px] font-bold text-slate-300 hover:text-white"
            >
              一時停止
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ResultOverlay;
