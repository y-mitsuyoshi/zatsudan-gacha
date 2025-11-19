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
      }, 80); // Faster rotation

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
    const base = "absolute w-4 h-4 bg-gray-800 rounded-full shadow-inner";
    const positions = {
      'top-left': 'top-3 left-3',
      'top-right': 'top-3 right-3',
      'middle-left': 'top-1/2 left-3 -translate-y-1/2',
      'middle-right': 'top-1/2 right-3 -translate-y-1/2',
      'bottom-left': 'bottom-3 left-3',
      'bottom-right': 'bottom-3 right-3',
      'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    };
    return `${base} ${positions[position as keyof typeof positions]}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative perspective-1000">
        <div 
          className={`
            relative w-24 h-24 bg-white rounded-2xl border-4 border-gray-200 shadow-xl
            ${isRolling ? 'animate-[spin_0.5s_linear_infinite]' : showFinal ? 'animate-bounce' : ''}
            transition-all duration-300 transform
          `}
          style={{
            background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
            boxShadow: '5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff'
          }}
        >
          {getDotPositions(currentValue).map((position, index) => (
            <div key={index} className={getDotClassName(position)} />
          ))}
        </div>
      </div>
      
      {!isRolling && showFinal && (
        <div className="mt-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
            {finalValue}！
          </div>
        </div>
      )}
    </div>
  );
};