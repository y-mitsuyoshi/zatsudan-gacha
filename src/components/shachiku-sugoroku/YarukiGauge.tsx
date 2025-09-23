"use client";

import React from 'react';

interface YarukiGaugeProps {
  value: number;
}

export const YarukiGauge: React.FC<YarukiGaugeProps> = ({ value }) => {
  const normalizedValue = Math.max(0, Math.min(100, value));

  const getBarColor = () => {
    if (normalizedValue > 60) return 'bg-green-500';
    if (normalizedValue > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="my-2">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">やる気</span>
        <span className={`text-lg font-bold ${getBarColor().replace('bg-', 'text-')}`}>{normalizedValue}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden">
        <div
          className={`h-4 rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
};
