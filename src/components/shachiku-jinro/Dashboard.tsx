'use client';

import { GameState, getRoleName, getRoleDescription } from '@/types/shachiku-jinro';
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
        return { title: '役職発表', subtitle: 'あなたの正体は...' };
      case 'DAY_CONVERSATION':
        return { title: '昼休み', subtitle: `${dayCount}日目 - 議論中` };
      case 'DAY_VOTE':
        return { title: '人事評価会議', subtitle: `${dayCount}日目 - 投票` };
      case 'VOTE_RESULT':
        return { title: '投票結果', subtitle: `${dayCount}日目` };
      case 'NIGHT_ACTION':
        return { title: '残業時間', subtitle: `${dayCount}日目 - 夜` };
      case 'NIGHT_RESULT':
        return { title: '朝のニュース', subtitle: `${dayCount}日目の夜の結果` };
      case 'GAME_OVER':
        return { title: '決算報告', subtitle: 'ゲーム終了' };
      default:
        return { title: '待機中', subtitle: '' };
    }
  };

  const phaseInfo = getPhaseInfo();
  const isNight = phase === 'NIGHT_ACTION' || phase === 'NIGHT_RESULT';

  return (
    <div className={`min-h-screen pb-6 ${isNight ? 'bg-[#0e0c0a]' : 'bg-[#12100d]'}`}>

      <div className="sticky top-0 z-20 border-b border-[#3b3328] bg-[#1d1914]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-label text-[9px] text-[#dfb15b]">{phase}</p>
            <h1 className="mt-0.5 text-lg font-bold text-[#f2e9d8]">{phaseInfo.title}</h1>
            <p className="text-xs text-[#b7a992]">{phaseInfo.subtitle}</p>
          </div>

          {timeRemaining > 0 && phase !== 'GAME_OVER' && (
            <div className="text-right">
              <div className={`font-mono text-2xl font-bold ${timeRemaining <= 10 ? 'animate-pulse text-[#e07054]' : 'text-[#f2e9d8]'}`}>
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </div>
              <div className="mt-1 h-1 w-24 overflow-hidden bg-[#3b3328]">
                <div
                  className="h-full bg-[#dfb15b] transition-all duration-1000 ease-linear"
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
            className="game-panel w-full py-2 text-sm text-[#b7a992] transition-colors hover:border-[#5a4b38] hover:text-[#f2e9d8]"
          >
            議論をスキップして投票へ
          </button>
        )}
        {phase === 'ROLE_REVEAL' && (
          <button
            onClick={onSkip}
            className="game-panel w-full py-2 text-sm text-[#b7a992] transition-colors hover:border-[#5a4b38] hover:text-[#f2e9d8]"
          >
            スキップ
          </button>
        )}

        {/* Role Reveal */}
        {phase === 'ROLE_REVEAL' && myself && (
          <div className="game-panel p-6 text-center">
            <p className="font-label text-[9px] text-[#8a7d69]">Your Role</p>
            <h2 className="font-editorial mt-2 text-3xl text-[#f2e9d8]">{getRoleName(myself.role)}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#b7a992]">
              {getRoleDescription(myself.role)}
            </p>
          </div>
        )}

        {/* Game Over Banner */}
        {phase === 'GAME_OVER' && (
          <div className={`border p-8 text-center ${winner === 'COMPANY' ? 'border-[#355952] bg-[#172622]' : winner === 'SPIES' ? 'border-[#6d3027] bg-[#2b1a17]' : 'border-[#5a4b38] bg-[#2a231b]'}`}>
            <p className="font-label text-[9px] text-[#8a7d69]">Game Over</p>
            <h2 className="font-editorial mt-3 text-3xl text-[#f2e9d8]">
              {winner === 'COMPANY' ? '会社存続！' :
               winner === 'SPIES' ? '会社倒産...' :
               'コンサルの一人勝ち！'}
            </h2>
            <p className="mb-6 mt-2 text-sm leading-7 text-[#b7a992]">
              {winner === 'COMPANY' ? '社畜たちは平和な日常を取り戻しました。' :
               winner === 'SPIES' ? 'スパイの暗躍により、会社は崩壊しました。' :
               '会社もスパイも利用され、コンサルだけが利益を得ました。'}
            </p>
            <button
              onClick={onReset}
              className="border border-[#f2e9d8] bg-[#b23a2a] px-8 py-3 text-sm font-black text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38]"
            >
              もう一度プレイ
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
          <div className="mb-2 flex items-center justify-between border-b border-[#3b3328] pb-2">
            <h3 className="font-label text-[9px] text-[#dfb15b]">社員一覧</h3>
            <span className="font-label text-[9px] text-[#8a7d69]">{alivePlayers.length} alive</span>
          </div>
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
          <div className="game-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#3b3328] px-4 py-2.5">
              <span className="font-label text-[9px] text-[#dfb15b]">議論</span>
              <span className="font-label text-[9px] text-[#8a7d69]">Chat</span>
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
        <div className="game-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#3b3328] px-4 py-2.5">
            <span className="font-label text-[9px] text-[#dfb15b]">業務日誌</span>
            <span className="font-label text-[9px] text-[#8a7d69]">Log</span>
          </div>
          <div className="custom-scrollbar h-40 space-y-1.5 overflow-y-auto p-3">
            {logs.filter(l => {
              if (l.type === 'CHAT') return false;
              // PRIVATEは宛先本人のみに表示(情報漏洩防止)。宛先なしPRIVATEは非表示。
              if (l.type === 'PRIVATE') return l.playerId === myself?.id;
              return true;
            }).map(log => (
              <div key={log.id} className={`border-l-2 px-2 py-1 text-xs ${
                log.type === 'RESULT' ? 'border-[#e07054] bg-[#2b1a17] text-[#f0a08b]' :
                log.type === 'PRIVATE' ? 'border-[#dfb15b] bg-[#2a231b] text-[#e4c989]' :
                'border-transparent text-[#8a7d69]'
              }`}>
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>

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
    <div className="border border-[#5a4b38] bg-[#2a231b] p-4">
      <h3 className="font-label mb-2 text-[9px] text-[#dfb15b]">
        {role === 'HR' ? '人事調査結果' : role === 'GOSSIP' ? 'お局情報' : 'エンジニア回線'}
      </h3>
      <div className="space-y-1.5">
        {role === 'HR' && divinationResults.map((r, i) => (
          <div key={i} className={`border-l-2 px-2 py-1.5 text-xs ${r.isSpy ? 'border-[#e07054] bg-[#2b1a17] text-[#f0a08b]' : 'border-[#83b8ac] bg-[#172622] text-[#9dd4c7]'}`}>
            {r.dayNumber}日目: {r.targetName} → {r.isSpy ? 'スパイ' : 'シロ'}
          </div>
        ))}
        {role === 'GOSSIP' && gossipResults.map((r, i) => (
          <div key={i} className={`border-l-2 px-2 py-1.5 text-xs ${r.wasSpy ? 'border-[#e07054] bg-[#2b1a17] text-[#f0a08b]' : 'border-[#83b8ac] bg-[#172622] text-[#9dd4c7]'}`}>
            {r.dayNumber}日目: {r.targetName} → {r.wasSpy ? 'スパイだった' : 'スパイではなかった'}
          </div>
        ))}
        {role === 'ENGINEER' && engineerPartners.map(p => (
          <div key={p.id} className="border-l-2 border-[#dfb15b] bg-[#2a231b] px-2 py-1.5 text-xs text-[#e4c989]">
            相方: {p.name} {!p.isAlive ? '(解雇済み)' : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
