"use client";

import { GameDecision, GameDecisionOption } from '@/types/sugoroku';

interface DecisionCardProps {
  decision: GameDecision;
  onChoose: (optionId: string) => void;
}

function EffectChip({ label, value, type }: { label: string; value: number; type: 'career' | 'yaruki' }) {
  const positive = value >= 0;
  const color = type === 'career'
    ? positive
      ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
      : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200'
    : positive
      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
      : 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${color}`}>
      {type === 'career' ? '評価' : 'やる気'} {positive ? '+' : ''}{value}
    </span>
  );
}

function OptionButton({ option, onChoose }: { option: GameDecisionOption; onChoose: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChoose(option.id)}
      className="group w-full rounded-xl border-2 border-[#e2d4b8] bg-white/80 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-lg dark:border-[#4c3f2c] dark:bg-[#2b2720] dark:hover:border-amber-500"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black text-[#3b2f1e] dark:text-amber-50">{option.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8a7557] dark:text-stone-300">{option.resultMessage}</p>
        </div>
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#d8c6a2] text-xs font-black text-[#9a8464] transition-colors group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-white dark:border-[#5c4a32] dark:text-stone-300" aria-hidden="true">
          →
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <EffectChip label="評価" value={option.career} type="career" />
        <EffectChip label="やる気" value={option.yaruki} type="yaruki" />
      </div>
    </button>
  );
}

export function DecisionCard({ decision, onChoose }: DecisionCardProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-card-title"
      aria-describedby="decision-card-description"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border-4 border-[#e7d8b5] bg-[#fffaf0] shadow-2xl dark:border-[#5a4a33] dark:bg-[#211e19]">
        <div className="relative overflow-hidden bg-gradient-to-r from-cyan-700 via-sky-600 to-teal-500 px-5 py-5 text-white">
          <span className="absolute -right-5 -top-6 text-7xl opacity-20" aria-hidden="true">🧭</span>
          <p className="text-[10px] font-black tracking-[0.25em] text-white/80">DECISION CARD</p>
          <h2 id="decision-card-title" className="mt-0.5 text-2xl font-black leading-tight">
            {decision.title}
          </h2>
          <p id="decision-card-description" className="mt-1.5 text-sm leading-relaxed text-white/90">
            {decision.description}
          </p>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black tracking-widest text-cyan-700 dark:text-cyan-300">CHOOSE ONE</p>
            <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
              選択で結末が変わる
            </span>
          </div>
          {decision.options.map((option) => (
            <OptionButton key={option.id} option={option} onChoose={onChoose} />
          ))}
          <p className="text-center text-[10px] text-[#9a8464] dark:text-stone-400">
            評価は高いほど良い結末に近づきます。やる気がゼロになると休みが発生します。
          </p>
        </div>
      </div>
    </div>
  );
}
