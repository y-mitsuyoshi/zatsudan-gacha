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
  onRollComplete 
}) => {
  const [currentValue, setCurrentValue] = useState(1);
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    if (isRolling) {
      setShowFinal(false);
      const interval = setInterval(() => {
        setCurrentValue(Math.floor(Math.random() * 6) + 1);
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setCurrentValue(finalValue);
        setShowFinal(true);
        onRollComplete?.();
      }, 800);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isRolling, finalValue, onRollComplete]);

  const getDotPositions = (value: number) => {
    const positions = {
      1: ['center'],
      2: ['top-left', 'bottom-right'],
      3: ['top-left', 'center', 'bottom-right'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    };
    return positions[value as keyof typeof positions] || [];
  };

  const getDotClassName = (position: string) => {
    const base = "absolute w-3 h-3 bg-gray-800 rounded-full";
    const positions = {
      'top-left': 'top-2 left-2',
      'top-right': 'top-2 right-2',
      'middle-left': 'top-1/2 left-2 -translate-y-1/2',
      'middle-right': 'top-1/2 right-2 -translate-y-1/2',
      'bottom-left': 'bottom-2 left-2',
      'bottom-right': 'bottom-2 right-2',
      'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    };
    return `${base} ${positions[position as keyof typeof positions]}`;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        className={`
          relative w-20 h-20 bg-white rounded-lg border-2 border-gray-300 shadow-lg
          ${isRolling ? 'animate-spin' : showFinal ? 'animate-bounce' : ''}
          transition-all duration-300
        `}
      >
        {getDotPositions(currentValue).map((position, index) => (
          <div key={index} className={getDotClassName(position)} />
        ))}
      </div>
      
      {!isRolling && showFinal && (
        <div className="text-lg font-bold text-gray-700 dark:text-gray-300 animate-pulse">
          {finalValue}が出ました！
        </div>
      )}
      
      {isRolling && (
        <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          🎲 サイコロを振っています...
        </div>
      )}
    </div>
  );
};