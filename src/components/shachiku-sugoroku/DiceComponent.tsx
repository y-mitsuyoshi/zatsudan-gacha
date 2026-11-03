"use client";

import React, { useEffect, useState } from 'react';
import { audioManager } from '@/utils/audio';

interface DiceComponentProps {
  isRolling: boolean;
  finalValue: number;
  finalValues?: number[];
  diceCount?: 1 | 2;
  boost?: number;
  onRollComplete?: () => void;
}

type PipPos =
  | 'top-left'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

const PIP_MAP: Record<number, PipPos[]> = {
  1: ['center'],
  2: ['top-left', 'bottom-right'],
  3: ['top-left', 'center', 'bottom-right'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
};

const PIP_POSITION_CLASS: Record<PipPos, string> = {
  'top-left': 'left-2.5 top-2.5',
  'top-right': 'right-2.5 top-2.5',
  'middle-left': 'left-2.5 top-1/2 -translate-y-1/2',
  'middle-right': 'right-2.5 top-1/2 -translate-y-1/2',
  'bottom-left': 'bottom-2.5 left-2.5',
  'bottom-right': 'bottom-2.5 right-2.5',
  center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
};

function SingleDieFace({
  value,
  isRolling,
  showFinal,
  index,
}: {
  value: number;
  isRolling: boolean;
  showFinal: boolean;
  index: number;
}) {
  const safeVal = Math.max(1, Math.min(6, value || 1));
  const pips = PIP_MAP[safeVal] || PIP_MAP[1];
  const isOne = safeVal === 1;

  return (
    <div
      role="img"
      aria-label={`サイコロ${index + 1}の目: ${safeVal}`}
      className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-[#261e14] border-b-[6px] bg-gradient-to-br from-[#fffdf7] via-[#f7efe0] to-[#e5d5b5] shadow-[0_6px_14px_rgba(0,0,0,0.28),inset_0_2px_2px_rgba(255,255,255,0.9)] transition-transform duration-200 sm:h-[72px] sm:w-[72px] ${
        isRolling
          ? index % 2 === 0
            ? 'animate-[spin_0.36s_linear_infinite] scale-105'
            : 'animate-[spin_0.36s_linear_infinite_reverse] scale-105'
          : showFinal
            ? 'animate-[bounce_0.38s_ease-out_1]'
            : ''
      }`}
    >
      {/* 内側の彫り込み枠 */}
      <div
        className="pointer-events-none absolute inset-1.5 rounded-xl border border-[#d8c7a6]/70"
        aria-hidden="true"
      />
      {pips.map((pos, idx) => (
        <span
          key={idx}
          className={`absolute rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] ${PIP_POSITION_CLASS[pos]} ${
            isOne
              ? 'h-4 w-4 bg-[#b23a2a] ring-2 ring-[#b23a2a]/25'
              : 'h-2.5 w-2.5 bg-[#1a1612]'
          }`}
        />
      ))}
    </div>
  );
}

export const DiceComponent: React.FC<DiceComponentProps> = ({
  isRolling,
  finalValue,
  finalValues,
  diceCount = 1,
  boost = 0,
  onRollComplete,
}) => {
  const targetValues =
    finalValues && finalValues.length > 0
      ? finalValues
      : diceCount === 2
        ? [finalValue || 1, 1]
        : [finalValue || 1];

  const [currentValues, setCurrentValues] = useState<number[]>(targetValues);
  const [showFinal, setShowFinal] = useState(false);

  const callbackRef = React.useRef(onRollComplete);
  callbackRef.current = onRollComplete;
  const targetsRef = React.useRef(targetValues);
  targetsRef.current = targetValues;

  useEffect(() => {
    if (!isRolling) {
      setCurrentValues(targetsRef.current);
      return;
    }

    setShowFinal(false);
    const interval = window.setInterval(() => {
      setCurrentValues(
        targetsRef.current.map(() => Math.floor(Math.random() * 6) + 1),
      );
    }, 70);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setCurrentValues(targetsRef.current);
      setShowFinal(true);
      audioManager.playSe('dice-hit');
      callbackRef.current?.();
    }, 680);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [isRolling, diceCount]);

  const rawSum = currentValues.reduce((a, b) => a + b, 0);
  const totalWithBoost = rawSum + (boost > 0 ? boost : 0);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-2.5">
        {currentValues.map((val, idx) => (
          <SingleDieFace
            key={idx}
            index={idx}
            value={val}
            isRolling={isRolling}
            showFinal={showFinal}
          />
        ))}
      </div>

      <div className="mt-2 min-h-[24px] text-center" aria-live="polite">
        {isRolling ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#b23a2a] px-2.5 py-0.5 text-[11px] font-black text-white">
            ダイス抽選中…
          </span>
        ) : showFinal ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#3b3022] bg-[#12100d] px-3 py-0.5 text-xs font-black text-[#fffaf0]">
            <span>出目合計</span>
            <span className="font-mono text-base text-[#f5ca5c]">{totalWithBoost}</span>
            {boost > 0 && (
              <span className="text-[10px] text-[#7adbc2]">（+{boost}補正込）</span>
            )}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[#6e6250] dark:text-[#b5a790]">
            {diceCount === 2 ? '全力残業：2ダイス同時振り' : '定時進行：1ダイス振り'}
          </span>
        )}
      </div>
    </div>
  );
};
