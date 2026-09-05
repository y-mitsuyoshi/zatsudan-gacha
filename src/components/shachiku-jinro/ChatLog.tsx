'use client';

import { GameLog, Player } from '@/types/shachiku-jinro';
import { useEffect, useRef } from 'react';

interface ChatLogProps {
  logs: GameLog[];
  players: Record<string, Player>;
  myId?: string;
  conversations: { playerId: string; message: string }[];
}

export default function ChatLog({ logs, players, myId, conversations }: ChatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  // Only show chat-type messages and conversations
  const chatLogs = logs.filter(l => l.type === 'CHAT');

  return (
    <div className="h-48 overflow-y-auto p-3 space-y-2.5 bg-gray-900/30">
      {conversations.length === 0 && chatLogs.length === 0 && (
        <p className="text-center text-gray-600 text-xs py-6">議論はまだ始まっていません...</p>
      )}

      {conversations.map((conv, idx) => {
        const player = players[conv.playerId];
        if (!player) return null;

        const isSelf = conv.playerId === myId;

        return (
          <div key={`conv-${idx}`} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${isSelf ? 'order-1' : ''}`}>
              <div className={`flex items-baseline gap-1.5 mb-0.5 ${isSelf ? 'justify-end' : ''}`}>
                <span className="text-xs font-semibold text-gray-400">
                  {player.name}
                </span>
                {!player.isAlive && (
                  <span className="text-[10px] text-red-500">(退職済)</span>
                )}
              </div>
              <div className={`
                px-3 py-2 rounded-xl text-sm leading-relaxed
                ${isSelf
                  ? 'bg-blue-600/30 text-blue-200 rounded-br-sm border border-blue-700/30'
                  : 'bg-gray-800/80 text-gray-300 rounded-bl-sm border border-gray-700/30'
                }
              `}>
                {conv.message}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
