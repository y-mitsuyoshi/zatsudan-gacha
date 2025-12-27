import { GameLog, Player } from '@/types/shachiku-jinro';
import { useEffect, useRef } from 'react';

interface ChatLogProps {
  logs: GameLog[];
  players: Record<string, Player>;
}

export default function ChatLog({ logs, players }: ChatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-64 overflow-y-auto p-4 bg-slate-50 space-y-3">
      {logs.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-4">履歴はありません</p>
      )}

      {logs.map((log) => {
        const isSystem = log.type === 'SYSTEM' || log.type === 'RESULT';

        if (isSystem) {
          return (
            <div key={log.id} className="flex justify-center my-2">
              <span className={`
                px-3 py-1 rounded-full text-xs font-bold shadow-sm
                ${log.type === 'RESULT'
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'}
              `}>
                {log.message}
              </span>
            </div>
          );
        }

        const player = log.playerId ? players[log.playerId] : null;
        const playerName = player ? player.name : 'Unknown';

        return (
          <div key={log.id} className="flex flex-col items-start">
             <div className="flex items-baseline space-x-2">
               <span className="font-bold text-sm text-slate-700">{playerName}</span>
               <span className="text-[10px] text-slate-400">
                 {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </span>
             </div>
             <div className="bg-white p-2 rounded-r-lg rounded-bl-lg border border-slate-200 shadow-sm text-sm text-slate-800 mt-1 max-w-[90%]">
               {log.message}
             </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
