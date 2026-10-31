"use client";

import React from 'react';

interface YarukiGaugeProps {
  value: number;
}

export const YarukiGauge: React.FC<YarukiGaugeProps> = ({ value }) => {
  const normalizedValue = Math.max(0, Math.min(100, value));

  const state = normalizedValue > 70
    ? { label: '絶好調', color: 'from-emerald-500 to-green-400', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' }
    : normalizedValue > 40
      ? { label: 'まずまず', color: 'from-amber-500 to-yellow-400', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' }
      : normalizedValue > 15
        ? { label: 'お疲れ気味', color: 'from-orange-500 to-amber-400', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500' }
        : { label: '限界寸前', color: 'from-rose-600 to-red-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' };

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base" aria-hidden="true">🔥</span>
          <span className="text-sm font-black text-[#5f4b2f] dark:text-amber-100">やる気</span>
          <span className={`text-[10px] font-bold ${state.text}`}>{state.label}</span>
        </div>
        <span className={`text-xl font-black tabular-nums ${state.text}`}>{normalizedValue}</span>
      </div>
      <div
        className="relative h-4 overflow-hidden rounded-full border border-[#d8c6a2] bg-[#efe3ca] shadow-inner dark:border-[#5c4a32] dark:bg-[#342d22]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedValue}
        aria-label={`やる気 ${normalizedValue} / 100`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${state.color} transition-all duration-500`}
          style={{ width: `${normalizedValue}%` }}
        />
        <div className="pointer-events-none absolute inset-0 flex justify-between px-[6%]" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="h-full w-px bg-white/30" />
          ))}
        </div>
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] font-bold text-[#a58c66] dark:text-stone-500">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
};
