'use client';

import { GameState, getRoleName, getRoleEmoji, getRoleDescription } from '@/types/shachiku-jinro';
import { getMaxTimeForPhase } from './useJinroGame';
import PlayerCard from './PlayerCard';
import ActionPanel from './ActionPanel';
import ChatLog from './ChatLog';

interface DashboardProps {
  gameState: GameState;
  onVote: (targetId: string) => void;
  onNightAction: (targetId: string) => void;
  onSkip: () => void;
  onReset: () => void;
}

export default function Dashboard({ gameState, onVote, onNightAction, onSkip, onReset }: DashboardProps) {
  const { phase, players, dayCount, timeRemaining, winner, logs, votes, divinationResults, gossipResults, lastExecutedId, lastAttackedId, currentConversations } = gameState;

  const myself = Object.values(players).find(p => !p.isAI) ?? null;
  const alivePlayers = Object.values(players).filter(p => p.isAlive);

  const sortedPlayers = [...Object.values(players)].sort((a, b) => {
    if (!a.isAI) return -1;
    if (!b.isAI) return 1;
    return a.name.localeCompare(b.name);
  });

  const getPhaseInfo = () => {
    switch (phase) {
      case 'ROLE_REVEAL':
        return { title: '役職発表', subtitle: 'あなたの正体は...', icon: '🎭', color: 'from-purple-600 to-pink-600' };
      case 'DAY_CONVERSATION':
        return { title: '昼休み', subtitle: `${dayCount}日目 - 議論中`, icon: '☀️', color: 'from-amber-500 to-orange-500' };
      case 'DAY_VOTE':
        return { title: '人事評価会議', subtitle: `${dayCount}日目 - 投票`, icon: '🗳️', color: 'from-red-500 to-rose-600' };
      case 'VOTE_RESULT':
        return { title: '投票結果', subtitle: `${dayCount}日目`, icon: '📊', color: 'from-orange-500 to-red-500' };
      case 'NIGHT_ACTION':
        return { title: '残業時間', subtitle: `${dayCount}日目 - 夜`, icon: '🌙', color: 'from-indigo-600 to-purple-700' };
      case 'NIGHT_RESULT':
        return { title: '朝のニュース', subtitle: `${dayCount}日目の夜の結果`, icon: '🌅', color: 'from-blue-500 to-indigo-600' };
      case 'GAME_OVER':
        return { title: '決算報告', subtitle: 'ゲーム終了', icon: '🏁', color: winner === 'COMPANY' ? 'from-blue-500 to-cyan-500' : winner === 'SPIES' ? 'from-red-600 to-pink-600' : 'from-yellow-500 to-orange-500' };
      default:
        return { title: '待機中', subtitle: '', icon: '⏳', color: 'from-gray-500 to-gray-600' };
    }
  };

  const phaseInfo = getPhaseInfo();
  const isNight = phase === 'NIGHT_ACTION' || phase === 'NIGHT_RESULT';

  return (
    <div className={`min-h-screen pb-6 transition-colors duration-700 ${
      isNight ? 'bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950' : 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800'
    }`}>

      {/* Header */}
      <div className={`sticky top-0 z-20 bg-gradient-to-r ${phaseInfo.color} shadow-lg`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{phaseInfo.icon}</span>
            <div>
              <h1 className="text-lg font-bold text-white">{phaseInfo.title}</h1>
              <p className="text-xs text-white/70">{phaseInfo.subtitle}</p>
            </div>
          </div>

          {/* Timer */}
          {timeRemaining > 0 && phase !== 'GAME_OVER' && (
            <div className="text-right">
              <div className={`text-2xl font-mono font-bold ${timeRemaining <= 10 ? 'text-yellow-300 animate-pulse' : 'text-white'}`}>
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </div>
              {/* Timer bar */}
              <div className="w-24 h-1.5 bg-white/20 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.min(100, (timeRemaining / getMaxTimeForPhase(phase)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Skip button for conversation phase */}
        {phase === 'DAY_CONVERSATION' && (
          <button
            onClick={onSkip}
            className="w-full py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
          >
            ⏭ 議論をスキップして投票へ
          </button>
        )}
        {phase === 'ROLE_REVEAL' && (
          <button
            onClick={onSkip}
            className="w-full py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
          >
            ⏭ スキップ
          </button>
        )}

        {/* Role Reveal */}
        {phase === 'ROLE_REVEAL' && myself && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 text-center animate-scale-in">
            <p className="text-gray-400 text-sm mb-3">あなたの役職は...</p>
            <div className="text-6xl mb-3">{getRoleEmoji(myself.role)}</div>
            <h2 className="text-3xl font-extrabold text-white mb-2">{getRoleName(myself.role)}</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
              {getRoleDescription(myself.role)}
            </p>
          </div>
        )}

        {/* Game Over Banner */}
        {phase === 'GAME_OVER' && (
          <div className={`rounded-2xl p-8 text-center shadow-2xl animate-scale-in bg-gradient-to-r ${phaseInfo.color}`}>
            <div className="text-5xl mb-4">
              {winner === 'COMPANY' ? '🎉' : winner === 'SPIES' ? '💀' : '🦊'}
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2">
              {winner === 'COMPANY' ? '会社存続！' :
               winner === 'SPIES' ? '会社倒産...' :
               'コンサルの一人勝ち！'}
            </h2>
            <p className="text-white/80 mb-6">
              {winner === 'COMPANY' ? '社畜たちは平和な日常を取り戻しました。' :
               winner === 'SPIES' ? 'スパイの暗躍により、会社は崩壊しました。' :
               '会社もスパイも利用され、コンサルだけが利益を得ました。'}
            </p>
            <button
              onClick={onReset}
              className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl border border-white/30 transition-colors"
            >
              🔄 もう一度プレイ
            </button>
          </div>
        )}

        {/* Divination & Gossip Results (Private to player) */}
        {myself && (myself.role === 'HR' || myself.role === 'GOSSIP' || myself.role === 'ENGINEER') && (
          <PrivateResults
            role={myself.role}
            myselfId={myself.id}
            players={players}
            divinationResults={divinationResults}
            gossipResults={gossipResults}
            logs={logs}
          />
        )}

        {/* Player Grid */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            社員一覧 ({alivePlayers.length}名 生存)
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {sortedPlayers.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isSelf={!p.isAI}
                gamePhase={phase}
                winner={winner}
                wasExecuted={p.id === lastExecutedId && phase === 'VOTE_RESULT'}
                wasAttacked={p.id === lastAttackedId && phase === 'NIGHT_RESULT'}
              />
            ))}
          </div>
        </div>

        {/* Action Panel */}
        {myself && myself.isAlive && phase !== 'GAME_OVER' && (
          <ActionPanel
            gameState={gameState}
            myself={myself}
            onVote={onVote}
            onNightAction={onNightAction}
          />
        )}

        {/* Chat / Conversation Log */}
        {(phase === 'DAY_CONVERSATION' || currentConversations.length > 0) && (
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-700/40 flex items-center gap-2">
              <span className="text-xs">💬</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">議論</span>
            </div>
            <ChatLog
              logs={logs}
              players={players}
              myId={myself?.id}
              conversations={currentConversations}
            />
          </div>
        )}

        {/* System Log */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/30 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700/30 flex items-center gap-2">
            <span className="text-xs">📋</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">業務日誌</span>
          </div>
          <div className="h-40 overflow-y-auto p-3 space-y-1.5">
            {logs.filter(l => {
              if (l.type === 'CHAT') return false;
              // PRIVATEは宛先本人のみに表示(情報漏洩防止)。宛先なしPRIVATEは非表示。
              if (l.type === 'PRIVATE') return l.playerId === myself?.id;
              return true;
            }).map(log => (
              <div key={log.id} className={`text-xs px-2 py-1 rounded ${
                log.type === 'RESULT' ? 'bg-red-900/30 text-red-300' :
                log.type === 'PRIVATE' ? 'bg-purple-900/30 text-purple-300' :
                'text-gray-500'
              }`}>
                {log.type === 'PRIVATE' && <span className="mr-1">🔒</span>}
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

// Private results sub-component
function PrivateResults({ role, myselfId, players, divinationResults, gossipResults, logs }: {
  role: string;
  myselfId: string;
  players: GameState['players'];
  divinationResults: GameState['divinationResults'];
  gossipResults: GameState['gossipResults'];
  logs: GameState['logs'];
}) {
  const engineerPartners = role === 'ENGINEER'
    ? Object.values(players).filter(p => p.role === 'ENGINEER' && p.id !== myselfId)
    : [];
  const engineerNote = role === 'ENGINEER'
    ? logs.filter(l => l.type === 'PRIVATE' && l.playerId === myselfId).slice(-1)[0]
    : undefined;

  const hasHr = role === 'HR' && divinationResults.length > 0;
  const hasGossip = role === 'GOSSIP' && gossipResults.length > 0;
  const hasEngineer = role === 'ENGINEER' && (engineerPartners.length > 0 || engineerNote);
  if (!hasHr && !hasGossip && !hasEngineer) return null;

  return (
    <div className="bg-purple-900/30 backdrop-blur-sm rounded-xl border border-purple-700/40 p-4">
      <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-1">
        <span>🔒</span>
        {role === 'HR' ? '人事調査結果' : role === 'GOSSIP' ? 'お局情報' : 'エンジニア回線'}
      </h3>
      <div className="space-y-1.5">
        {role === 'HR' && divinationResults.map((r, i) => (
          <div key={i} className={`text-xs px-2 py-1.5 rounded-md ${r.isSpy ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
            {r.dayNumber}日目: {r.targetName} → {r.isSpy ? '⚠️ スパイ！' : '✅ シロ'}
          </div>
        ))}
        {role === 'GOSSIP' && gossipResults.map((r, i) => (
          <div key={i} className={`text-xs px-2 py-1.5 rounded-md ${r.wasSpy ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
            {r.dayNumber}日目: {r.targetName} → {r.wasSpy ? '⚠️ スパイだった' : '✅ スパイじゃなかった'}
          </div>
        ))}
        {role === 'ENGINEER' && engineerPartners.map(p => (
          <div key={p.id} className="text-xs px-2 py-1.5 rounded-md bg-blue-900/40 text-blue-300">
            💻 相方: {p.name} {!p.isAlive ? '(解雇済み)' : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
