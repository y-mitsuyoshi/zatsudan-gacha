'use client';

import { Player, Phase, WinnerType, getRoleName, getRoleEmoji } from '@/types/shachiku-jinro';

interface PlayerCardProps {
  player: Player;
  isSelf: boolean;
  gamePhase: Phase;
  winner: WinnerType;
  wasExecuted?: boolean;
  wasAttacked?: boolean;
}

export default function PlayerCard({ player, isSelf, gamePhase, winner, wasExecuted, wasAttacked }: PlayerCardProps) {
  const isDead = !player.isAlive;

  // Show role when: self view (always), or game over
  const shouldShowRole = isSelf || gamePhase === 'GAME_OVER';

  // Visual emphasis for recently affected players
  const isHighlighted = wasExecuted || wasAttacked;

  return (
    <div className={`
      relative rounded-xl border transition-all duration-500 overflow-hidden
      ${isDead
        ? 'bg-gray-900/60 border-gray-800/50 opacity-60'
        : isSelf
          ? 'bg-gray-800/80 border-blue-500/40 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/10'
          : 'bg-gray-800/60 border-gray-700/40'
      }
      ${isHighlighted ? 'ring-2 ring-red-500 shadow-lg shadow-red-500/30 animate-shake' : ''}
    `}>
      {/* Self indicator */}
      {isSelf && !isDead && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
      )}

      <div className="p-2.5">
        {/* Status + Host badge */}
        <div className="flex justify-between items-start mb-1.5">
          <div className={`
            w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
            ${isDead
              ? 'bg-red-900/50 text-red-400 border border-red-800/50'
              : 'bg-green-900/50 text-green-400 border border-green-800/50'
            }
          `}>
            {isDead ? '✕' : '◉'}
          </div>
          {player.isAI && !isDead && (
            <span className="text-[9px] bg-gray-700/50 text-gray-500 px-1 py-0.5 rounded border border-gray-700/30">
              AI
            </span>
          )}
        </div>

        {/* Name */}
        <div className="text-center mb-1.5">
          <p className={`font-bold text-xs truncate ${isDead ? 'line-through text-gray-600' : 'text-gray-200'}`}>
            {player.name}
          </p>
          {isSelf && (
            <p className="text-[10px] text-blue-400 font-medium">あなた</p>
          )}
        </div>

        {/* Role (visible for self or game over) */}
        {shouldShowRole && (
          <div className={`
            mt-1.5 p-1.5 rounded-md text-center
            ${isDead ? 'bg-gray-800/60' : 'bg-gray-900/50'}
          `}>
            <span className="text-sm">{getRoleEmoji(player.role)}</span>
            <p className="font-bold text-[10px] text-gray-300 mt-0.5">{getRoleName(player.role)}</p>
          </div>
        )}

        {/* Hidden role (unknown) */}
        {!shouldShowRole && !isDead && (
          <div className="mt-1.5 p-1.5 rounded-md bg-gray-900/40 text-center">
            <span className="text-sm">❓</span>
            <p className="text-[10px] text-gray-600 font-mono">???</p>
          </div>
        )}

        {/* Dead but role not revealed */}
        {!shouldShowRole && isDead && (
          <div className="mt-1.5 p-1.5 rounded-md bg-red-950/40 text-center border border-red-900/30">
            <span className="text-sm">💀</span>
            <p className="text-[10px] text-red-500 font-bold">解雇</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
