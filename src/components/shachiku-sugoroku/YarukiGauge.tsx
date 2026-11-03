"use client";

import React from 'react';

interface YarukiGaugeProps {
  value: number;
}

export const YarukiGauge: React.FC<YarukiGaugeProps> = ({ value }) => {
  const normalizedValue = Math.max(0, Math.min(100, value));

  const state = normalizedValue > 70
    ? { label: '絶好調', bar: 'bg-[#2f5d57]', text: 'text-[#2f5d57]', bg: 'bg-[#2f5d57]' }
    : normalizedValue > 40
      ? { label: 'まずまず', bar: 'bg-[#c9922e]', text: 'text-[#c9922e]', bg: 'bg-[#c9922e]' }
      : normalizedValue > 15
        ? { label: 'お疲れ気味', bar: 'bg-[#b8652a]', text: 'text-[#b8652a]', bg: 'bg-[#b8652a]' }
        : { label: '限界寸前', bar: 'bg-[#b23a2a]', text: 'text-[#b23a2a]', bg: 'bg-[#b23a2a]' };

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-[var(--ink)]">やる気</span>
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
          className={`h-full ${state.bar} transition-all duration-500`}
          style={{ width: `${normalizedValue}%` }}
        />
        <div className="pointer-events-none absolute inset-0 flex justify-between px-[6%]" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="h-full w-px bg-white/30" />
          ))}
        </div>
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] font-bold text-[var(--ink-soft)]">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
};
