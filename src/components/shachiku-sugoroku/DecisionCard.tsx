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
      ? 'border-[#d8bf85] bg-[#fbf5e6] text-[#7a5a3a]'
      : 'border-[var(--line)] bg-[var(--paper-muted)] text-[var(--ink-soft)]'
    : positive
      ? 'border-[#b8cdc8] bg-[#edf5f2] text-[#2f5d57]'
      : 'border-[#e0c1b7] bg-[#fbefeb] text-[#b23a2a]';

  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-black ${color}`}>
      {label} {positive ? '+' : ''}{value}
    </span>
  );
}

function OptionButton({ option, onChoose }: { option: GameDecisionOption; onChoose: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChoose(option.id)}
      className="group w-full border border-[var(--line)] bg-[var(--paper-strong)] p-3 text-left transition-colors hover:border-[var(--accent)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black text-[var(--ink)]">{option.label}</p>
          <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">{option.resultMessage}</p>
        </div>
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--line-strong)] text-xs font-black text-[var(--accent)] transition-colors group-hover:border-[var(--accent)] group-hover:bg-[var(--paper-muted)]" aria-hidden="true">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#12100d]/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-card-title"
      aria-describedby="decision-card-description"
    >
      <div className="w-full max-w-lg border border-[var(--line-strong)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-[6px_6px_0_var(--paper-shadow)]">
        <div className="border-b border-[var(--line)] bg-[var(--paper-muted)] px-5 py-5">
          <p className="paper-kicker">Decision Card</p>
          <h2 id="decision-card-title" className="font-editorial mt-1 text-2xl leading-tight">
            {decision.title}
          </h2>
          <p id="decision-card-description" className="mt-1.5 text-sm leading-7 text-[var(--ink-soft)]">
            {decision.description}
          </p>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
            <p className="font-label text-[9px] text-[var(--accent)]">Choose one</p>
            <span className="font-label border border-[var(--line)] bg-[var(--paper-muted)] px-2 py-0.5 text-[9px] text-[var(--ink-soft)]">
              選択で結末が変わる
            </span>
          </div>
          {decision.options.map((option) => (
            <OptionButton key={option.id} option={option} onChoose={onChoose} />
          ))}
          <p className="text-center text-[10px] leading-5 text-[var(--ink-soft)]">
            評価は高いほど良い結末に近づきます。やる気がゼロになると休みが発生します。
          </p>
        </div>
      </div>
    </div>
  );
}
