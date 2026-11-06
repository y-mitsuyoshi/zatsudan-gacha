'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Card } from '../types';
import { analyzeOuts, estimateEquity, evaluate7, preflopTier } from '../engine';
import { fmt } from './tableUtils';

export interface HudProps {
  hole: Card[];
  board: Card[];
  opponents: number;
  callAmount: number;
  potTotal: number;
  visible: boolean;
  compact?: boolean;
}

const TIER_BADGE: Record<'S' | 'A' | 'B' | 'C' | 'D', string> = {
  S: 'border-amber-300 bg-amber-400/25 text-amber-100',
  A: 'border-emerald-300 bg-emerald-500/25 text-emerald-100',
  B: 'border-sky-300 bg-sky-500/25 text-sky-100',
  C: 'border-slate-400 bg-slate-600/30 text-slate-200',
  D: 'border-rose-400/60 bg-rose-500/20 text-rose-200',
};

export function Hud({
  hole,
  board,
  opponents,
  callAmount,
  potTotal,
  visible,
  compact = false,
}: HudProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [equity, setEquity] = useState<number>(50);

  const tierInfo = useMemo(() => preflopTier(hole), [hole]);

  const madeHand = useMemo(() => {
    if (hole.length < 2) return null;
    if (board.length === 0) return null;
    const cards = [...hole, ...board];
    if (cards.length < 5) return null;
    return evaluate7(cards);
  }, [hole, board]);

  const outsInfo = useMemo(() => {
    if (hole.length < 2 || board.length < 3 || board.length >= 5) {
      return { outs: 0, labels: [] as string[] };
    }
    return analyzeOuts(hole, board);
  }, [hole, board]);

  const holeKey = hole.map((c) => c.id).join(',');
  const boardKey = board.map((c) => c.id).join(',');

  useEffect(() => {
    if (!visible || hole.length < 2 || opponents <= 0) return;
    const t = window.setTimeout(() => {
      const eq = estimateEquity(hole, board, Math.max(1, opponents), 130);
      setEquity(Math.round(eq));
    }, 30);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, holeKey, boardKey, opponents]);

  if (!visible || hole.length < 2) return null;

  const potOdds =
    callAmount > 0 ? Math.round((callAmount / Math.max(1, potTotal + callAmount)) * 100) : 0;
  const plusEv = callAmount === 0 || equity >= potOdds;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="勝率HUDを展開"
        className="flex items-center gap-2 rounded-xl border border-amber-300/35 bg-slate-950/85 px-2.5 py-1.5 text-[11px] font-black text-amber-200 shadow-lg backdrop-blur-md transition hover:border-amber-300"
      >
        <span className="font-mono text-emerald-300">{equity}%</span>
        <span className="text-white/70">{madeHand ? madeHand.nameJa : tierInfo.notation}</span>
        <span className="text-[9px] text-amber-300/70">▲ HUD</span>
      </button>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-amber-300/30 bg-slate-950/85 text-slate-100 shadow-[0_8px_28px_rgba(0,0,0,0.65)] backdrop-blur-md ${
        compact ? 'p-2 text-[10px]' : 'p-2.5 text-[11px]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black tracking-[0.25em] text-amber-300 uppercase">
            ANALYZER HUD
          </span>
          <span
            className={`rounded border px-1.5 py-0.5 text-[9px] font-black ${TIER_BADGE[tierInfo.tier]}`}
          >
            {tierInfo.notation} · Tier {tierInfo.tier}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="勝率HUDを折りたたむ"
          className="rounded px-1 text-[10px] font-bold text-slate-400 hover:text-white"
        >
          ▼
        </button>
      </div>

      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-1">
          <div className="text-[9px] text-slate-400">現在役</div>
          <div className="truncate font-black text-amber-200">
            {madeHand ? madeHand.nameJa : tierInfo.labelJa}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-1">
          <div className="text-[9px] text-slate-400">推定勝率</div>
          <div className="font-mono text-xs font-black text-emerald-300">{equity}%</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-1">
          <div className="text-[9px] text-slate-400">必要勝率 / EV</div>
          <div className={`font-mono font-black ${plusEv ? 'text-cyan-300' : 'text-rose-300'}`}>
            {callAmount > 0 ? `${potOdds}% (${plusEv ? '+EV' : '-EV'})` : 'CHECK可'}
          </div>
        </div>
      </div>

      {/* Equity Bar */}
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-all duration-300"
          style={{ width: `${Math.max(4, Math.min(100, equity))}%` }}
        />
      </div>

      {outsInfo.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[9px] font-bold text-cyan-300">
            アウツ ({outsInfo.outs}枚):
          </span>
          {outsInfo.labels.map((l) => (
            <span
              key={l}
              className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-100"
            >
              {l}
            </span>
          ))}
        </div>
      )}

      {callAmount > 0 && (
        <div className="mt-1 text-[9px] text-slate-400">
          コール額 {fmt(callAmount)} / ポット {fmt(potTotal)}
        </div>
      )}
    </div>
  );
}

export default Hud;
