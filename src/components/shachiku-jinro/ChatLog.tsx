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
    <div className="custom-scrollbar h-48 space-y-2.5 overflow-y-auto bg-[#16130f] p-3">
      {conversations.length === 0 && chatLogs.length === 0 && (
        <p className="py-6 text-center text-xs text-[#756957]">議論はまだ始まっていません...</p>
      )}

      {conversations.map((conv, idx) => {
        const player = players[conv.playerId];
        if (!player) return null;

        const isSelf = conv.playerId === myId;

        return (
          <div key={`conv-${idx}`} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${isSelf ? 'order-1' : ''}`}>
              <div className={`flex items-baseline gap-1.5 mb-0.5 ${isSelf ? 'justify-end' : ''}`}>
                <span className="text-xs font-semibold text-[#b7a992]">
                  {player.name}
                </span>
                {!player.isAlive && (
                  <span className="text-[10px] text-[#e07054]">(退職済)</span>
                )}
              </div>
              <div className={`
                border px-3 py-2 text-sm leading-relaxed
                ${isSelf
                  ? 'border-[#5a4b38] bg-[#2a231b] text-[#f2e9d8]'
                  : 'border-[#3b3328] bg-[#1d1914] text-[#b7a992]'
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
