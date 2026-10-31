"use client";

import React, { useState, useEffect } from 'react';

interface DiceComponentProps {
  isRolling: boolean;
  finalValue: number;
  onRollComplete?: () => void;
}

export const DiceComponent: React.FC<DiceComponentProps> = ({
  isRolling,
  finalValue,
  onRollComplete,
}) => {
  const [currentValue, setCurrentValue] = useState(finalValue || 1);
  const [showFinal, setShowFinal] = useState(false);
  const callbackRef = React.useRef(onRollComplete);
  callbackRef.current = onRollComplete;
  const finalRef = React.useRef(finalValue);
  finalRef.current = finalValue;

  useEffect(() => {
    if (!isRolling) {
      return;
    }

    setShowFinal(false);
    const interval = setInterval(() => {
      setCurrentValue(Math.floor(Math.random() * 6) + 1);
    }, 80);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setCurrentValue(finalRef.current);
      setShowFinal(true);
      callbackRef.current?.();
    }, 800);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRolling]);

  const getDotPositions = (value: number) => {
    const positions = {
      1: ['center'],
      2: ['top-left', 'bottom-right'],
      3: ['top-left', 'center', 'bottom-right'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
    };
    return positions[value as keyof typeof positions] || [];
  };

  const getDotClassName = (position: string) => {
    const base = 'absolute h-3.5 w-3.5 rounded-full bg-stone-800 shadow-inner';
    const positions = {
      'top-left': 'left-3 top-3',
      'top-right': 'right-3 top-3',
      'middle-left': 'left-3 top-1/2 -translate-y-1/2',
      'middle-right': 'right-3 top-1/2 -translate-y-1/2',
      'bottom-left': 'bottom-3 left-3',
      'bottom-right': 'bottom-3 right-3',
      center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
    };
    return `${base} ${positions[position as keyof typeof positions]}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {isRolling && <div className="absolute inset-0 -z-10 scale-125 rounded-full bg-amber-400/30 blur-xl" aria-hidden="true" />}
        <div
          role="img"
          aria-label={`サイコロの目: ${currentValue}`}
          className={`relative flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-[#e5d7bb] bg-gradient-to-br from-white to-[#f5eee0] shadow-[5px_5px_12px_rgba(82,61,30,0.2),-5px_-5px_10px_rgba(255,255,255,0.8)] transition-transform duration-300 ${
            isRolling ? 'animate-[spin_0.5s_linear_infinite]' : showFinal ? 'animate-[bounce_0.4s_ease-out_1]' : ''
          }`}
        >
          {getDotPositions(currentValue).map((position, index) => (
            <div key={index} className={getDotClassName(position)} />
          ))}
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-stone-800 px-2 py-0.5 text-[9px] font-black tracking-widest text-amber-200">
            DICE
          </span>
        </div>
      </div>

      <div className="mt-3 min-h-6 text-center" aria-live="polite">
        {isRolling ? (
          <span className="text-xs font-black text-amber-700 dark:text-amber-300">コロコロ…</span>
        ) : showFinal ? (
          <span className="text-sm font-black text-amber-700 dark:text-amber-300">
            出目 <span className="text-xl text-[#3b2f1e] dark:text-amber-50">{currentValue}</span>
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[#9a8464] dark:text-stone-400">サイコロを振ろう</span>
        )}
      </div>
    </div>
  );
};
