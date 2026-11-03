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
    const base = 'absolute h-3 w-3 rounded-full bg-[var(--ink)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]';
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
        <div
          role="img"
          aria-label={`サイコロの目: ${currentValue}`}
          className={`relative flex h-20 w-20 items-center justify-center rounded-[18px] border-2 border-[var(--line-strong)] bg-[var(--paper-strong)] shadow-[4px_4px_0_var(--paper-shadow)] transition-transform duration-300 sm:h-24 sm:w-24 ${
            isRolling ? 'animate-[spin_0.5s_linear_infinite]' : showFinal ? 'animate-[bounce_0.4s_ease-out_1]' : ''
          }`}
        >
          {getDotPositions(currentValue).map((position, index) => (
            <div key={index} className={getDotClassName(position)} />
          ))}
          <span className="font-label absolute -bottom-2 left-1/2 -translate-x-1/2 border border-[var(--line-strong)] bg-[var(--ink)] px-2 py-0.5 text-[7px] text-[var(--paper-strong)]">
            DICE
          </span>
        </div>
      </div>

      <div className="mt-3 min-h-6 text-center" aria-live="polite">
        {isRolling ? (
          <span className="text-xs font-black text-[var(--accent)]">コロコロ…</span>
        ) : showFinal ? (
          <span className="text-sm font-black text-[var(--ink)]">
            出目 <span className="font-editorial text-2xl text-[var(--accent)]">{currentValue}</span>
          </span>
        ) : (
          <span className="text-[11px] font-bold text-[var(--ink-soft)]">サイコロを振ろう</span>
        )}
      </div>
    </div>
  );
};
