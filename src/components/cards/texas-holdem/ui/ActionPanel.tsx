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
  bb: number;
  sb: number;
  /** hero still in the hand (for pre-actions) */
  heroInHand: boolean;
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
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseTo, setRaiseTo] = useState(0);

  const canAggro = !!legal && (legal.canBet || legal.canRaise);
  const minTo = legal?.minRaiseTo ?? 0;
  const maxTo = legal?.maxRaiseTo ?? 0;
  const step = Math.max(1, p.sb);
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
      { label: '1/2', v: mk(0.5) },
      { label: '2/3', v: mk(2 / 3) },
      { label: 'POT', v: mk(1) },
      { label: 'ALL-IN', v: maxTo },
    ];
  }, [legal, canAggro, p.potTotal, p.heroBet, minTo, maxTo]);

  const act = (a: PlayerAction) => {
    p.onClickSe();
    setRaiseOpen(false);
    setRaiseTo(0);
    p.onAction(a);
  };
  const confirmRaise = () => {
    if (!legal) return;
    if (isAllIn) act({ type: 'allin' });
    else act({ type: legal.canBet ? 'bet' : 'raise', amount: value });
  };
  const onRaiseBtn = () => {
    if (!legal || !canAggro) return;
    if (maxTo <= minTo) {
      act({ type: 'allin' });
      return;
    }
    if (!raiseOpen) {
      p.onClickSe();
      setRaiseOpen(true);
      return;
    }
    confirmRaise();
  };

  // keyboard shortcuts
  useEffect(() => {
    if (!legal) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'text')) return;
      if (t && t.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'f' && legal.canFold && !legal.canCheck) {
        e.preventDefault();
        p.onClickSe();
        setRaiseOpen(false);
        p.onAction({ type: 'fold' });
      } else if (k === 'c') {
        e.preventDefault();
        p.onClickSe();
        setRaiseOpen(false);
        p.onAction({ type: legal.canCheck ? 'check' : 'call' });
      } else if (k === 'r' && (legal.canBet || legal.canRaise)) {
        e.preventDefault();
        setRaiseOpen((o) => !o);
      } else if (k === 'a' && (legal.canBet || legal.canRaise || legal.canCall)) {
        e.preventDefault();
        setRaiseOpen(true);
        setRaiseTo(legal.maxRaiseTo);
      } else if (k === 'enter' && raiseOpen) {
        e.preventDefault();
        const v = raiseTo ? Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, raiseTo)) : legal.minRaiseTo;
        p.onClickSe();
        setRaiseOpen(false);
        setRaiseTo(0);
        if (v >= legal.maxRaiseTo) p.onAction({ type: 'allin' });
        else p.onAction({ type: legal.canBet ? 'bet' : 'raise', amount: v });
      } else if (k === 'escape') {
        setRaiseOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [legal, raiseOpen, raiseTo, p]);

  const h = p.compact ? 'h-14' : 'h-16';

  if (!legal) {
    return (
      <div className="flex w-full flex-col gap-2">
        <div className="rounded-xl border border-amber-300/20 bg-slate-950/70 px-3 py-2 text-center text-[11px] font-bold text-amber-100/80 backdrop-blur-md">
          {p.statusText}
        </div>
        {p.heroInHand && (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['checkFold', 'チェック / フォールド'],
                ['callAny', 'コール・エニー'],
              ] as [PreAction, string][]
            ).map(([id, label]) => {
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
                    on ? 'border-amber-300 bg-amber-400/20 text-amber-100' : 'border-white/15 bg-slate-900/70 text-white/70'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      on ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-white/40'
                    }`}
                  >
                    {on && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                        <path d="M2 6.5 L5 9 L10 3" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col gap-2">
      {raiseOpen && canAggro && (
        <div
          className="rounded-2xl border border-amber-300/40 bg-slate-950/90 p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md"
          style={{ animation: 'rf-fadeup 200ms ease-out both' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70">{verb} TO</span>
            <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-2xl font-black tabular-nums text-transparent">
              {fmt(value)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="減らす"
              onClick={() => setRaiseTo(clamp(value - p.bb))}
              className="h-9 w-9 shrink-0 rounded-lg border border-white/20 bg-slate-800 text-lg font-black text-white active:scale-95"
            >
              −
            </button>
            <input
              type="range"
              aria-label="ベット額"
              min={minTo}
              max={maxTo}
              step={step}
              value={value}
              onChange={(e) => setRaiseTo(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-amber-400"
            />
            <button
              type="button"
              aria-label="増やす"
              onClick={() => setRaiseTo(clamp(value + p.bb))}
              className="h-9 w-9 shrink-0 rounded-lg border border-white/20 bg-slate-800 text-lg font-black text-white active:scale-95"
            >
              +
            </button>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1">
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
                  className={`rounded-lg border px-1 py-1.5 text-[10px] font-black transition active:scale-95 ${
                    on
                      ? 'border-amber-200 bg-gradient-to-b from-amber-300 to-amber-600 text-slate-950'
                      : 'border-amber-300/30 bg-slate-900 text-amber-100'
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
            aria-label="チェック / フォールド (F)"
            disabled={!legal.canFold}
            onClick={() => act({ type: 'fold' })}
            className={`${BTN} ${h} border-rose-300/40 bg-gradient-to-b from-rose-500/70 to-rose-900/80 opacity-80`}
          >
            <span className="text-sm">FOLD</span>
            <span className="text-[9px] font-bold opacity-70">F</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="フォールド (F)"
            onClick={() => act({ type: 'fold' })}
            className={`${BTN} ${h} border-rose-300/50 bg-gradient-to-b from-rose-500 via-rose-600 to-rose-900`}
          >
            <span className="text-base">FOLD</span>
            <span className="text-[9px] font-bold opacity-70">F</span>
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
            <span className="text-[9px] font-bold opacity-70">C</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label={`コール ${legal.callAmount} (C)`}
            disabled={!legal.canCall}
            onClick={() => act({ type: callIsAllIn ? 'allin' : 'call' })}
            className={`${BTN} ${h} border-emerald-200/50 bg-gradient-to-b from-emerald-400 via-emerald-600 to-teal-900`}
          >
            <span className="text-sm leading-none">{callIsAllIn ? 'ALL-IN' : 'CALL'}</span>
            <span className="mt-0.5 text-sm tabular-nums leading-none text-emerald-50">{fmt(legal.callAmount)}</span>
          </button>
        )}
        <button
          type="button"
          aria-label={raiseOpen ? `${verb} ${value} を確定 (Enter)` : `${verb} (R)`}
          disabled={!canAggro}
          onClick={onRaiseBtn}
          className={`${BTN} ${h} border-amber-100/60 bg-gradient-to-b from-amber-300 via-amber-500 to-orange-700 text-slate-950`}
          style={raiseOpen ? { animation: 'rf-glowbtn 1.2s ease-in-out infinite' } : undefined}
        >
          {raiseOpen ? (
            <>
              <span className="text-[11px] leading-none">{isAllIn ? 'ALL-IN' : `${verb} TO`}</span>
              <span className="mt-0.5 text-sm tabular-nums leading-none">{fmt(value)}</span>
            </>
          ) : (
            <>
              <span className="text-base">{maxTo <= minTo && canAggro ? 'ALL-IN' : verb}</span>
              <span className="text-[9px] font-bold opacity-70">R</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ActionPanel;
