"use client";

import React from 'react';

interface PlayerTokenProps {
  playerName: string;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ playerName }) => {
  const initial = playerName.trim().charAt(0).toUpperCase() || 'P';

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute inset-0 w-12 h-12 bg-blue-400 rounded-full blur-md opacity-60 animate-pulse"></div>
      
      {/* Main token */}
      <div className="relative w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg border-3 border-white shadow-xl z-10 transform transition-all duration-300 hover:scale-110">
        <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
        <span className="relative z-10">{initial}</span>
      </div>
      
      {/* Shadow */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-black opacity-30 rounded-full blur-sm"></div>
    </div>
  );
};
