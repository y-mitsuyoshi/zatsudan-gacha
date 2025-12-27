import { Room, Player } from '@/types/shachiku-jinro';
import { User } from 'firebase/auth';
import PlayerCard from './PlayerCard';
import ActionPanel from './ActionPanel';
import ChatLog from './ChatLog';
import { useState, useEffect } from 'react';

interface DashboardProps {
  user: User | null;
  room: Room;
}

export default function Dashboard({ user, room }: DashboardProps) {
  const myself = user ? room.players[user.uid] : null;
  const players = Object.values(room.players);

  // Sort players: Self first, then others
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === user?.uid) return -1;
    if (b.id === user?.uid) return 1;
    return a.name.localeCompare(b.name);
  });

  const getPhaseTitle = () => {
    switch (room.phase) {
      case 'DAY_CONVERSATION': return '昼休み (議論中)';
      case 'DAY_VOTE': return '人事評価会議 (投票)';
      case 'NIGHT_ACTION': return '残業時間 (夜のアクション)';
      case 'GAME_OVER': return '決算報告 (ゲーム終了)';
      default: return '待機中';
    }
  };

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((room.timeLimit - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [room.timeLimit]);

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-md border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            {getPhaseTitle()}
          </h1>
          <p className="text-xs text-slate-500">
            {room.phase !== 'GAME_OVER' && `残り時間: ${Math.floor(timeLeft / 60)}分${timeLeft % 60}秒`}
            {room.phase === 'DAY_CONVERSATION' && ` | ${room.dayCount}日目`}
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          ID: {room.id}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">

        {/* Game Over Banner */}
        {room.phase === 'GAME_OVER' && (
           <div className={`p-6 rounded-xl text-center shadow-lg mb-6 ${
             room.winner === 'COMPANY' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
             room.winner === 'CONSULTANT' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
             'bg-gradient-to-r from-red-600 to-pink-600 text-white'
           }`}>
             <h2 className="text-3xl font-extrabold mb-2">
               {room.winner === 'COMPANY' ? '会社存続！' :
                room.winner === 'CONSULTANT' ? 'コンサルの一人勝ち！' :
                '会社倒産... (スパイ勝利)'}
             </h2>
             <p className="opacity-90">
               {room.winner === 'COMPANY' ? '社畜たちは平和な日常を取り戻しました。' :
                room.winner === 'CONSULTANT' ? '会社もスパイも利用され、コンサルだけが利益を得ました。' :
                'スパイの暗躍により、会社は崩壊しました。'}
             </p>
           </div>
        )}

        {/* Player Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {sortedPlayers.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isSelf={p.id === user?.uid}
              gamePhase={room.phase}
              winner={room.winner}
            />
          ))}
        </div>

        {/* Action Panel (Bottom Fixed or Inline) */}
        {myself && myself.isAlive && room.phase !== 'GAME_OVER' && (
          <ActionPanel
            room={room}
            myself={myself}
          />
        )}

        {/* Logs */}
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            業務日誌 (ログ)
          </div>
          <ChatLog logs={room.logs} players={room.players} />
        </div>
      </div>
    </div>
  );
}
