"use client";

import React from 'react';

interface PlayerTokenProps {
  playerName: string;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ playerName }) => {
  const initial = playerName.trim().charAt(0).toUpperCase() || 'P';

  return (
    <div className="absolute w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-lg z-10 animate-bounce">
      {initial}
    </div>
  );
};
