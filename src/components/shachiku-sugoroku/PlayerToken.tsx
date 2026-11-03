"use client";

import React from 'react';
import { Job } from '@/types/sugoroku';
import { JOB_PROFILES } from '@/lib/sugoroku-logic';
import { JobIcon } from './SugorokuIcons';

interface PlayerTokenProps {
  playerName: string;
  job?: Job | string;
  isMoving?: boolean;
  rankName?: string;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({
  playerName,
  job = '営業',
  isMoving = false,
  rankName,
}) => {
  const validJob = (job in JOB_PROFILES ? job : '営業') as Job;
  const profile = JOB_PROFILES[validJob];

  return (
    <div
      className={`group relative flex flex-col items-center select-none ${
        isMoving ? 'animate-bounce' : 'transition-transform duration-300'
      }`}
      title={`${playerName}（${validJob}${rankName ? ` / ${rankName}` : ''}）`}
      aria-label={`${playerName}（${validJob}）のコマ`}
      role="img"
    >
      {/* プレイヤー名プレート */}
      <div className="pointer-events-none mb-0.5 flex items-center gap-1 whitespace-nowrap rounded-sm border border-[#12100d] bg-[#12100d] px-1.5 py-0.5 text-[9px] font-black tracking-tight text-[#fffaf0] shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: profile.accentColor }}
        />
        <span className="max-w-[72px] truncate">{playerName}</span>
      </div>

      {/* 立体コマ本体 */}
      <div className="relative flex flex-col items-center">
        {/* パルスリング */}
        <span
          className="pointer-events-none absolute inset-0 -m-1 rounded-full opacity-55 animate-ping"
          style={{ backgroundColor: profile.accentColor, animationDuration: '2s' }}
          aria-hidden="true"
        />

        {/* コマ頭部メダル */}
        <div
          className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#fffaf0] text-white shadow-[0_4px_0_#12100d,0_6px_12px_rgba(0,0,0,0.45)] ring-2 ring-[#12100d] sm:h-10 sm:w-10"
          style={{
            background: `radial-gradient(circle at 32% 28%, #ffffff38, transparent 55%), ${profile.accentColor}`,
          }}
        >
          <JobIcon job={validJob} size={18} className="drop-shadow-sm" />
        </div>

        {/* コマ台座（木製・真鍮ペデスタル風） */}
        <div
          className="relative z-0 -mt-1.5 h-3 w-8 rounded-full border border-[#12100d] bg-gradient-to-b from-[#d8b878] to-[#8f6828] shadow-[0_3px_5px_rgba(0,0,0,0.5)]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
