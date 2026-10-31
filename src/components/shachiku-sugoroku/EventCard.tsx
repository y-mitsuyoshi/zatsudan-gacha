"use client";

import { BoardSquare, SquareType } from '@/types/sugoroku';

const TYPE_META: Record<SquareType, { label: string; header: string }> = {
  start: { label: 'スタート', header: 'from-emerald-600 to-teal-500' },
  goal: { label: 'ゴール', header: 'from-amber-500 to-yellow-400' },
  salary: { label: '給料日', header: 'from-blue-600 to-cyan-500' },
  item: { label: 'アイテム', header: 'from-purple-600 to-fuchsia-500' },
  'job-specific': { label: '職業イベント', header: 'from-indigo-600 to-blue-500' },
  event: { label: 'イベント', header: 'from-pink-600 to-rose-500' },
  decision: { label: '選択イベント', header: 'from-cyan-600 to-sky-500' },
  normal: { label: '日常', header: 'from-stone-600 to-stone-500' },
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-card-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border-4 border-[#e7d8b5] bg-[#fffaf0] shadow-2xl dark:border-[#5a4a33] dark:bg-[#211e19]">
        <div className={`relative bg-gradient-to-r ${meta.header} px-5 py-4 text-white`}>
          <p className="text-[10px] font-black tracking-[0.25em] text-white/80">EVENT CARD</p>
          <h2 id="event-card-title" className="mt-0.5 text-2xl font-black leading-tight">
            {square.title}
          </h2>
          <span className="mt-2 inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold">
            {meta.label} / {square.position}マス
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[#e7d8b5] bg-white text-3xl shadow-inner dark:border-[#5a4a33] dark:bg-[#2c2820]" aria-hidden="true">
              {square.icon ?? '🎴'}
            </span>
            <p className="pt-1 text-sm leading-relaxed text-[#6f5d42] dark:text-stone-300">
              {square.description}
            </p>
          </div>

          <p className="whitespace-pre-line rounded-xl border border-[#e5d7bb] bg-white/80 p-3 text-sm font-medium leading-relaxed text-[#3b2f1e] dark:border-[#4c3f2c] dark:bg-[#2b2720] dark:text-amber-50" aria-live="polite">
            {message}
          </p>

          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-xl border-b-4 border-amber-800 bg-gradient-to-b from-amber-500 to-amber-600 px-5 py-3 text-base font-black text-white shadow-md transition-all hover:from-amber-400 hover:to-amber-500 active:translate-y-0.5 active:border-b-2"
          >
            カードを閉じて続ける
          </button>
        </div>
      </div>
    </div>
  );
}
