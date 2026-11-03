"use client";

import React from 'react';

interface PlayerTokenProps {
  playerName: string;
  job?: string;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ playerName, job }) => {
  const icon = job ? job.slice(0, 1) : '社';

  return (
    <div
      className="group relative flex flex-col items-center"
      title={`${playerName}${job ? `（${job}）` : ''}`}
      aria-label={`${playerName}${job ? `（${job}）` : ''}のコマ`}
      role="img"
    >
      <div className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap border border-[var(--line-strong)] bg-[var(--paper-strong)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--ink)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        {playerName}
      </div>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--paper-strong)] bg-[var(--ink)] text-[var(--paper-strong)] shadow-[0_3px_0_var(--paper-shadow)] ring-1 ring-[var(--ink)] sm:h-10 sm:w-10">
        <span className="font-editorial text-sm leading-none sm:text-base" aria-hidden="true">{icon}</span>
        <span className="absolute -bottom-1 h-2 w-2 rotate-45 border-b border-r border-[var(--paper-strong)] bg-[var(--ink)]" aria-hidden="true" />
      </div>
    </div>
  );
};
