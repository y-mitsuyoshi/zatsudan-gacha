'use client';

import React from 'react';
import { CHARACTERS, charImage, pickLine, type CharId } from '../characters';
import { fmt } from './tableUtils';
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

  return (
    <div
      className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-amber-300/45 bg-slate-950/92 px-4 py-3 text-center shadow-[0_12px_36px_rgba(0,0,0,0.75)] backdrop-blur-md"
      style={{ animation: 'rf-fadeup 260ms ease-out both' }}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold tracking-[0.25em] text-amber-200/80 uppercase">
        <span>{result.handName || 'フォールド勝ち'}</span>
        <span className="font-mono text-amber-300">POT {fmt(result.pot)}</span>
      </div>

      <div className="mt-0.5 bg-gradient-to-b from-white via-amber-100 to-amber-400 bg-clip-text text-lg font-black text-transparent sm:text-xl">
        {result.title}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono font-black ${
            result.heroNet > 0
              ? 'bg-emerald-500/25 text-emerald-200'
              : result.heroNet < 0
                ? 'bg-rose-500/20 text-rose-200'
                : 'bg-white/10 text-slate-300'
          }`}
        >
          あなた: {result.heroNet >= 0 ? '+' : ''}
          {fmt(result.heroNet)}
        </span>
        {result.pots.length > 1 &&
          result.pots.map((p) => (
            <span
              key={p.label}
              className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-amber-100"
            >
              {p.label}: {fmt(p.amount)} ({p.winners})
            </span>
          ))}
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
            className="flex-1 rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_14px_rgba(0,0,0,0.45)] transition hover:brightness-110 active:scale-95 sm:text-sm"
          >
            次のハンドへ {countdown !== null ? `(${countdown}s)` : ''} →
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
