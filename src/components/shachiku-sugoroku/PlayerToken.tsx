"use client";

import React from 'react';

interface PlayerTokenProps {
  playerName: string;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ playerName }) => {
  // Generate a consistent avatar based on the name length or char code
  const avatars = ['🐶', '🐱', '🐼', '🐨', '🐰', '🦊', '🦁', '🐯'];
  const avatarIndex = playerName.length % avatars.length;
  const avatar = avatars[avatarIndex];

  return (
    <div className="relative group">
      {/* Bounce animation wrapper */}
      <div className="animate-bounce-slow">
        {/* Avatar Container */}
        <div className="relative w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white transform transition-transform group-hover:scale-110 z-10">
          <span className="text-2xl filter drop-shadow-md">{avatar}</span>
          
          {/* Name Tag */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {playerName}
          </div>
        </div>
        
        {/* Shadow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/20 rounded-full blur-sm animate-pulse"></div>
      </div>
    </div>
  );
};
