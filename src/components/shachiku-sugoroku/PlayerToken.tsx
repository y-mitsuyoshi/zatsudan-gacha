"use client";

import React from 'react';

interface PlayerTokenProps {
  playerName: string;
  job?: string;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ playerName, job }) => {
  // Job to Icon mapping
  const jobIcons: { [key: string]: string } = {
    '営業': '👔',
    'エンジニア': '💻',
    'デザイナー': '🎨',
    '企画・マーケティング': '📈',
    '人事・総務': '📋',
    '経理・財務': '💰',
    '法務・コンプラ': '⚖️',
    '広報・PR': '📢',
    '品質保証': '🔍',
    '総合職': '🏢',
  };

  // Fallback avatar logic
  const avatars = ['🐶', '🐱', '🐼', '🐨', '🐰', '🦊', '🦁', '🐯'];
  const avatarIndex = playerName.length % avatars.length;
  const fallbackAvatar = avatars[avatarIndex];

  const icon = (job && jobIcons[job]) ? jobIcons[job] : fallbackAvatar;

  return (
    <div className="relative group">
      {/* Bounce animation wrapper */}
      <div className="animate-bounce-slow">
        {/* Avatar Container */}
        <div className="relative w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white transform transition-transform group-hover:scale-110 z-10">
          <span className="text-2xl filter drop-shadow-md">{icon}</span>
          
          {/* Name Tag */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {playerName} {job && `(${job})`}
          </div>
        </div>
        
        {/* Shadow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/20 rounded-full blur-sm animate-pulse"></div>
      </div>
    </div>
  );
};
