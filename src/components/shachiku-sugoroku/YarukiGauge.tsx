"use client";

import React from 'react';

interface YarukiGaugeProps {
  value: number;
  strikes?: number;
}

export const YarukiGauge: React.FC<YarukiGaugeProps> = ({ value, strikes = 0 }) => {
  const normalizedValue = Math.max(0, Math.min(100, value));

  const state =
    normalizedValue > 70
      ? {
          label: '絶好調',
          bar: 'bg-gradient-to-r from-[#1f6f5c] to-[#2ea387]',
          badge: 'bg-[#1f6f5c] text-white',
          text: 'text-[#1f6f5c] dark:text-[#7adbc2]',
        }
      : normalizedValue > 40
        ? {
            label: '通常稼働',
            bar: 'bg-gradient-to-r from-[#b57c1e] to-[#dfb15b]',
            badge: 'bg-[#b57c1e] text-white',
            text: 'text-[#9c6712] dark:text-[#f5ca5c]',
          }
        : normalizedValue > 15
          ? {
              label: '疲労蓄積',
              bar: 'bg-gradient-to-r from-[#c96a22] to-[#e38842]',
              badge: 'bg-[#c96a22] text-white',
              text: 'text-[#b05816] dark:text-[#f5aa6e]',
            }
          : {
              label: '限界寸前',
              bar: 'bg-gradient-to-r from-[#8f2416] to-[#d94836]',
              badge: 'bg-[#b23a2a] text-white animate-pulse',
              text: 'text-[#b23a2a] dark:text-[#f59385]',
            };

  return (
    <div className="rounded-xl border-2 border-[#3b3022] bg-[#fffaf0] p-3 dark:border-[#594b38] dark:bg-[#1e1913]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-wide text-[#12100d] dark:text-[#fffaf0]">
            やる気（気力ゲージ）
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${state.badge}`}>
            {state.label}
          </span>
        </div>
        <span className={`font-mono text-2xl font-black tabular-nums leading-none ${state.text}`}>
          {normalizedValue}
          <span className="text-xs font-bold text-[#6e6250]">/100</span>
        </span>
      </div>

      <div
        className="relative h-4 overflow-hidden rounded-full border-2 border-[#3b3022] bg-[#e6dac6] shadow-inner dark:border-[#6e5a3e] dark:bg-[#120f0c]"
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
        <div
          className="pointer-events-none absolute inset-0 flex justify-between px-[9%]"
          aria-hidden="true"
        >
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="h-full w-px bg-black/15 dark:bg-white/15" />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-[#5c5141] dark:text-[#cfc2ad]">
        <span>0になると1回休み（3回で強制休職）</span>
        <span className="inline-flex items-center gap-1" title="メンタル耐久（3回ゼロでゲームオーバー）">
          <span>耐久:</span>
          {[0, 1, 2].map((idx) => {
            const broken = idx < strikes;
            return (
              <span
                key={idx}
                className={`inline-block h-2.5 w-2.5 rounded-full border border-[#12100d] ${
                  broken ? 'bg-[#b23a2a]' : 'bg-[#1f6f5c]'
                }`}
              />
            );
          })}
        </span>
      </div>
    </div>
  );
};
