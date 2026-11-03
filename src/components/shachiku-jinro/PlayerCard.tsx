'use client';

import { Player, Phase, WinnerType, getRoleName } from '@/types/shachiku-jinro';

interface PlayerCardProps {
  player: Player;
  isSelf: boolean;
  gamePhase: Phase;
  winner: WinnerType;
  wasExecuted?: boolean;
  wasAttacked?: boolean;
}

export default function PlayerCard({ player, isSelf, gamePhase, wasExecuted, wasAttacked }: PlayerCardProps) {
  const isDead = !player.isAlive;
  const shouldShowRole = isSelf || gamePhase === 'GAME_OVER';
  const isHighlighted = wasExecuted || wasAttacked;

  return (
    <div className={`
      relative overflow-hidden border transition-all duration-500
      ${isDead
        ? 'border-[#2c251d] bg-[#16130f] opacity-50'
        : isSelf
          ? 'border-[#dfb15b] bg-[#26211a] shadow-[3px_3px_0_#0b0907]'
          : 'border-[#3b3328] bg-[#1d1914]'
      }
      ${isHighlighted ? 'border-[#e07054]' : ''}
    `}>
      {isSelf && !isDead && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[#dfb15b]" />
      )}

      <div className="p-2.5">
        <div className="mb-1.5 flex items-start justify-between">
          <div className={`flex h-5 w-5 items-center justify-center border text-[9px] font-bold ${
            isDead
              ? 'border-[#6d3027] bg-[#2b1a17] text-[#e07054]'
              : 'border-[#355952] bg-[#172622] text-[#83b8ac]'
          }`}>
            {isDead ? '×' : '●'}
          </div>
          {player.isAI && !isDead && (
            <span className="font-label border border-[#3b3328] bg-[#16130f] px-1 py-0.5 text-[8px] text-[#8a7d69]">
              AI
            </span>
          )}
        </div>

        <div className="mb-1.5 text-center">
          <p className={`truncate text-xs font-bold ${isDead ? 'text-[#756957] line-through' : 'text-[#f2e9d8]'}`}>
            {player.name}
          </p>
          {isSelf && <p className="font-label text-[8px] text-[#dfb15b]">You</p>}
        </div>

        {shouldShowRole && (
          <div className={`mt-1.5 border p-1.5 text-center ${isDead ? 'border-[#2c251d] bg-[#16130f]' : 'border-[#3b3328] bg-[#12100d]'}`}>
            <p className="text-[10px] font-bold text-[#b7a992]">{getRoleName(player.role)}</p>
          </div>
        )}

        {!shouldShowRole && !isDead && (
          <div className="mt-1.5 border border-[#3b3328] bg-[#12100d] p-1.5 text-center">
            <p className="font-label text-[10px] text-[#756957]">???</p>
          </div>
        )}

        {!shouldShowRole && isDead && (
          <div className="mt-1.5 border border-[#6d3027] bg-[#2b1a17] p-1.5 text-center">
            <p className="text-[10px] font-bold text-[#e07054]">解雇</p>
          </div>
        )}
      </div>
    </div>
  );
}
