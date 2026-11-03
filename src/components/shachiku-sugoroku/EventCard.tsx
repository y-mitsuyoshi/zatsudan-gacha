"use client";

import { BoardSquare, SquareType } from '@/types/sugoroku';

const TYPE_META: Record<SquareType, { label: string; accent: string; tint: string }> = {
  start: { label: 'スタート', accent: 'text-[#2f5d57]', tint: 'bg-[#e7f0ec]' },
  goal: { label: 'ゴール', accent: 'text-[#a8751d]', tint: 'bg-[#fbf2dd]' },
  salary: { label: '給料日', accent: 'text-[#a8751d]', tint: 'bg-[#fbf5e6]' },
  item: { label: 'アイテム', accent: 'text-[#2f5d57]', tint: 'bg-[#eef5ee]' },
  'job-specific': { label: '職業イベント', accent: 'text-[#7a5a3a]', tint: 'bg-[#f5f0e8]' },
  event: { label: 'イベント', accent: 'text-[#b23a2a]', tint: 'bg-[#fbefeb]' },
  decision: { label: '選択イベント', accent: 'text-[#2f5d57]', tint: 'bg-[#edf5f2]' },
  normal: { label: '日常', accent: 'text-[var(--ink-soft)]', tint: 'bg-[var(--paper-muted)]' },
};

interface EventCardProps {
  square: BoardSquare;
  message: string;
  onContinue: () => void;
}

export function EventCard({ square, message, onContinue }: EventCardProps) {
  const meta = TYPE_META[square.type] ?? TYPE_META.event;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#12100d]/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-card-title"
    >
      <div className="w-full max-w-md border border-[var(--line-strong)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-[6px_6px_0_var(--paper-shadow)]">
        <div className={`border-b border-[var(--line)] px-5 py-4 ${meta.tint}`}>
          <p className={`font-label text-[9px] ${meta.accent}`}>Event Card / {meta.label}</p>
          <h2 id="event-card-title" className="font-editorial mt-1 text-2xl leading-tight">
            {square.title}
          </h2>
          <span className="font-label mt-2 inline-flex border border-[var(--line)] bg-[var(--paper-strong)] px-2 py-0.5 text-[9px] text-[var(--ink-soft)]">
            {square.position}マス
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="font-editorial flex h-14 w-14 shrink-0 items-center justify-center border border-[var(--line-strong)] bg-[var(--paper-muted)] text-lg text-[var(--accent)]" aria-hidden="true">
              {meta.label.slice(0, 1)}
            </span>
            <p className="pt-1 text-sm leading-7 text-[var(--ink-soft)]">
              {square.description}
            </p>
          </div>

          <p className="whitespace-pre-line border border-dashed border-[var(--line-strong)] bg-[var(--paper-muted)] p-3 text-sm font-medium leading-7 text-[var(--ink)]" aria-live="polite">
            {message}
          </p>

          <button
            type="button"
            onClick={onContinue}
            className="paper-button-primary w-full px-5 py-3 text-base"
          >
            カードを閉じて続ける
          </button>
        </div>
      </div>
    </div>
  );
}
