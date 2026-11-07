'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { LegalActions, PlayerAction } from '../types';
import { fmt } from './tableUtils';
import type { PreAction } from './useHoldemTable';

export interface ActionPanelProps {
  /** null = not hero's turn */
  legal: LegalActions | null;
  potTotal: number;
  heroBet: number;
  heroStack: number;
  currentBet?: number;
  bb: number;
  sb: number;
  /** hero still in the hand (for pre-actions) */
  heroInHand: boolean;
  /** true only when phase === 'playing' and an opponent seat is currently acting */
  waitingForOpponent?: boolean;
  preAction: PreAction;
  onPreAction: (p: PreAction) => void;
  onAction: (a: PlayerAction) => void;
  onClickSe: () => void;
  compact: boolean;
  statusText: string;
}

const BTN =
  'relative flex select-none flex-col items-center justify-center rounded-xl border font-black tracking-wide text-white transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:saturate-50 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_20px_rgba(0,0,0,0.45)]';

export function ActionPanel(p: ActionPanelProps) {
  const { legal } = p;
  const [raiseTo, setRaiseTo] = useState(0);

  const canAggro = !!legal && (legal.canBet || legal.canRaise);
  const minTo = legal?.minRaiseTo ?? 0;
  const maxTo = legal?.maxRaiseTo ?? 0;
  const step = Math.max(1, p.sb);

  // Reset bet/raise slider whenever legal bounds change on a new turn or street
  useEffect(() => {
    if (legal && (legal.canBet || legal.canRaise)) {
      setRaiseTo(legal.minRaiseTo);
    } else {
      setRaiseTo(0);
    }
  }, [legal, minTo, maxTo]);

  const clamp = (v: number) => {
    if (!legal) return 0;
    const r = Math.round(v / step) * step;
    return Math.max(minTo, Math.min(maxTo, r));
  };
  const value = raiseTo ? clamp(raiseTo) : minTo;
  const isAllIn = !!legal && value >= maxTo;
  const verb = legal?.canBet ? 'BET' : 'RAISE';
  const callIsAllIn = !!legal && legal.canCall && legal.callAmount >= p.heroStack;

  const presets = useMemo(() => {
    if (!legal || !canAggro) return [];
    const call = legal.callAmount;
    const potAfter = p.potTotal + call;
    const mk = (f: number) => p.heroBet + call + potAfter * f;
    return [
      { label: 'MIN', v: minTo },
      { label: '1/2 POT', v: mk(0.5) },
      { label: '2/3 POT', v: mk(2 / 3) },
      { label: 'POT', v: mk(1) },
      { label: 'ALL-IN', v: maxTo },
    ];
  }, [legal, canAggro, p.potTotal, p.heroBet, minTo, maxTo]);

  const act = (a: PlayerAction) => {
    p.onClickSe();
    setRaiseTo(0);
    p.onAction(a);
  };

  const confirmRaise = () => {
    if (!legal || !canAggro) return;
    if (isAllIn || maxTo <= minTo) act({ type: 'allin' });
    else act({ type: legal.canBet ? 'bet' : 'raise', amount: value });
  };

  // keyboard shortcuts
  useEffect(() => {
    if (!legal) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'text') return;
      if (t && t.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'f' && legal.canFold && !legal.canCheck) {
        e.preventDefault();
        p.onClickSe();
        p.onAction({ type: 'fold' });
      } else if (k === 'c') {
        e.preventDefault();
        p.onClickSe();
        p.onAction({ type: legal.canCheck ? 'check' : callIsAllIn ? 'allin' : 'call' });
      } else if ((k === 'r' || k === 'enter') && (legal.canBet || legal.canRaise)) {
        e.preventDefault();
        const v = raiseTo ? Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, raiseTo)) : legal.minRaiseTo;
        p.onClickSe();
        setRaiseTo(0);
        if (v >= legal.maxRaiseTo) p.onAction({ type: 'allin' });
        else p.onAction({ type: legal.canBet ? 'bet' : 'raise', amount: v });
      } else if (k === 'a' && (legal.canBet || legal.canRaise)) {
        e.preventDefault();
        p.onClickSe();
        setRaiseTo(legal.maxRaiseTo);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [legal, raiseTo, callIsAllIn, p]);

  const h = p.compact ? 'h-14' : 'h-16';

  if (!legal) {
    const curBet = p.currentBet ?? 0;
    const pendingToCall = Math.min(p.heroStack, Math.max(0, curBet - p.heroBet));
    const preOptions: [PreAction, string][] =
      pendingToCall > 0
        ? [
            ['checkFold', 'チェック / フォールド'],
            [
              'callCurrent',
              p.heroBet > 0
                ? `コール +${fmt(pendingToCall)} (計${fmt(p.heroBet + pendingToCall)})`
                : `コール ${fmt(pendingToCall)}`,
            ],
          ]
        : [
            ['checkFold', 'チェック / フォールド'],
            ['autoCheck', '自動チェック'],
          ];

    return (
      <div className="flex w-full flex-col gap-2">
        <div className="rounded-xl border border-amber-300/20 bg-slate-950/75 px-3 py-2 text-center text-[11px] font-bold text-amber-100/85 backdrop-blur-md">
          {p.statusText}
        </div>
        {p.heroInHand && p.waitingForOpponent && p.heroStack > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {preOptions.map(([id, label]) => {
              const on = p.preAction === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  aria-label={`先行アクション ${label}`}
                  onClick={() => {
                    p.onClickSe();
                    p.onPreAction(on ? 'none' : id);
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition active:scale-95 ${
                    on
                      ? 'border-amber-300 bg-amber-400/20 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.25)]'
                      : 'border-white/15 bg-slate-900/75 text-white/75 hover:border-white/30'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      on ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-white/40'
                    }`}
                  >
                    {on && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                        <path d="M2 6.5 L5 9 L10 3" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const callTotalStreetBet = p.heroBet + legal.callAmount;
  const raiseAddedChips = Math.max(0, value - p.heroBet);

  return (
    <div className="relative flex w-full flex-col gap-1.5">
      {canAggro && maxTo > minTo && (
        <div className="rounded-2xl border border-amber-300/35 bg-slate-950/90 px-2.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black tracking-[0.2em] text-amber-200/80 uppercase">
                {verb === 'BET' ? 'BET SIZE' : 'RAISE TO'}
              </span>
              {p.heroBet > 0 && (
                <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-200">
                  +{fmt(raiseAddedChips)} 追加
                </span>
              )}
            </div>
            <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text font-mono text-base font-black tabular-nums text-transparent sm:text-lg">
              {isAllIn ? `ALL-IN ${fmt(value)}` : fmt(value)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="ベット額を減らす"
              onClick={() => {
                p.onClickSe();
                setRaiseTo(clamp(value - p.bb));
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-slate-800 text-sm font-black text-white transition hover:border-amber-300/50 active:scale-95"
            >
              −
            </button>
            <input
              type="range"
              aria-label="ベット額スライダー"
              min={minTo}
              max={maxTo}
              step={step}
              value={value}
              onChange={(e) => setRaiseTo(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-amber-400"
            />
            <button
              type="button"
              aria-label="ベット額を増やす"
              onClick={() => {
                p.onClickSe();
                setRaiseTo(clamp(value + p.bb));
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-slate-800 text-sm font-black text-white transition hover:border-amber-300/50 active:scale-95"
            >
              +
            </button>
          </div>

          <div className="mt-1.5 grid grid-cols-5 gap-1">
            {presets.map((pr) => {
              const v = clamp(pr.v);
              const on = v === value;
              return (
                <button
                  key={pr.label}
                  type="button"
                  aria-label={`${pr.label} (${fmt(v)})`}
                  onClick={() => {
                    p.onClickSe();
                    setRaiseTo(v);
                  }}
                  className={`rounded-lg border px-1 py-1 text-[10px] font-black transition active:scale-95 ${
                    on
                      ? 'border-amber-200 bg-gradient-to-b from-amber-300 to-amber-600 text-slate-950 shadow'
                      : 'border-amber-300/25 bg-slate-900/90 text-amber-100 hover:border-amber-300/60'
                  }`}
                >
                  {pr.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {legal.canCheck ? (
          <button
            type="button"
            aria-label="フォールド (現在チェック可能)"
            disabled={!legal.canFold}
            onClick={() => act({ type: 'fold' })}
            className={`${BTN} ${h} border-rose-300/40 bg-gradient-to-b from-rose-500/70 to-rose-900/80 opacity-80`}
          >
            <span className="text-sm">FOLD</span>
            <span className="text-[9px] font-bold opacity-70">チェック可</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="フォールド (F)"
            onClick={() => act({ type: 'fold' })}
            className={`${BTN} ${h} border-rose-300/50 bg-gradient-to-b from-rose-500 via-rose-600 to-rose-900`}
          >
            <span className="text-base">FOLD</span>
            <span className="text-[9px] font-bold opacity-75">降りる [F]</span>
          </button>
        )}

        {legal.canCheck ? (
          <button
            type="button"
            aria-label="チェック (C)"
            onClick={() => act({ type: 'check' })}
            className={`${BTN} ${h} border-sky-200/50 bg-gradient-to-b from-sky-400 via-sky-600 to-blue-900`}
            style={{ animation: 'rf-glowbtn 2s ease-in-out infinite' }}
          >
            <span className="text-base">CHECK</span>
            <span className="text-[9px] font-bold opacity-80">パス [C]</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label={`コール ${legal.callAmount} (C)`}
            disabled={!legal.canCall}
            onClick={() => act({ type: callIsAllIn ? 'allin' : 'call' })}
            className={`${BTN} ${h} border-emerald-200/50 bg-gradient-to-b from-emerald-400 via-emerald-600 to-teal-900`}
          >
            <span className="text-xs leading-none sm:text-sm">
              {callIsAllIn ? 'ALL-IN CALL' : 'CALL'}
            </span>
            <span className="mt-0.5 font-mono text-sm font-black tabular-nums leading-none text-emerald-50">
              {p.heroBet > 0 ? `+${fmt(legal.callAmount)}` : fmt(legal.callAmount)}
            </span>
            <span className="mt-0.5 text-[9px] font-bold leading-none text-emerald-100/85">
              {p.heroBet > 0 ? `計 ${fmt(callTotalStreetBet)} [C]` : 'コール [C]'}
            </span>
          </button>
        )}

        <button
          type="button"
          aria-label={`${verb} ${value} (R)`}
          disabled={!canAggro}
          onClick={confirmRaise}
          className={`${BTN} ${h} border-amber-100/60 bg-gradient-to-b from-amber-300 via-amber-500 to-orange-700 text-slate-950`}
        >
          <span className="text-xs font-black leading-none sm:text-sm">
            {isAllIn || (maxTo <= minTo && canAggro) ? 'ALL-IN' : `${verb} TO`}
          </span>
          {canAggro && (
            <span className="mt-0.5 font-mono text-sm font-black tabular-nums leading-none text-slate-950">
              {fmt(value)}
            </span>
          )}
          <span className="mt-0.5 text-[9px] font-bold leading-none text-slate-950/75">
            {canAggro && p.heroBet > 0 ? `+${fmt(raiseAddedChips)} 追加 [R]` : `${verb} [R]`}
          </span>
        </button>
      </div>
    </div>
  );
}

export default ActionPanel;
