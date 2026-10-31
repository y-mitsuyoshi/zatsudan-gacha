"use client";

import React from 'react';
import { Job } from '@/types/sugoroku';
import { JOB_PROFILES } from '@/lib/sugoroku-logic';

interface PlayerTokenProps {
  playerName: string;
  job?: string;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ playerName, job }) => {
  const profile = job && job in JOB_PROFILES ? JOB_PROFILES[job as Job] : undefined;
  const icon = profile?.icon ?? '🧑‍💼';
  const accent = profile?.accent ?? 'from-amber-400 to-orange-500';

  return (
    <div
      className="group relative flex flex-col items-center"
      title={`${playerName}${job ? `（${job}）` : ''}`}
      aria-label={`${playerName}${job ? `（${job}）` : ''}のコマ`}
      role="img"
    >
      <div className="pointer-events-none absolute -top-6 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900/90 px-1.5 py-0.5 text-[8px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {playerName}
      </div>
      <div className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br ${accent} shadow-[0_4px_8px_rgba(0,0,0,0.25)] ring-2 ring-amber-300/90 sm:h-10 sm:w-10`}>
        <span className="text-base drop-shadow-sm sm:text-lg" aria-hidden="true">{icon}</span>
      </div>
      <span className="absolute -bottom-1 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full bg-stone-900/25 blur-[1px]" aria-hidden="true" />
    </div>
  );
};
