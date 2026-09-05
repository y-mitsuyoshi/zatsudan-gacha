'use client';

import { GameState, Player } from '@/types/shachiku-jinro';
import { useState, useEffect } from 'react';

interface ActionPanelProps {
  gameState: GameState;
  myself: Player;
  onVote: (targetId: string) => void;
  onNightAction: (targetId: string) => void;
}

export default function ActionPanel({ gameState, myself, onVote, onNightAction }: ActionPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { phase, players, votes, actions, dayCount } = gameState;
  const alivePlayers = Object.values(players).filter(p => p.isAlive && p.id !== myself.id);

  // フェーズ/日数が変わったら選択状態をリセット(2日目以降投票不能になるバグの修正)
  useEffect(() => {
    setSelectedTarget(null);
    setConfirmed(false);
  }, [phase, dayCount]);

  // Reset selection when phase changes
  const handleConfirm = () => {
    if (!selectedTarget) return;
    // 死亡者・自分への投票は無効
    const target = players[selectedTarget];
    if (!target || !target.isAlive || target.id === myself.id) return;

    if (phase === 'DAY_VOTE') {
      onVote(selectedTarget);
    } else if (phase === 'NIGHT_ACTION') {
      onNightAction(selectedTarget);
    }

    setConfirmed(true);
    setSelectedTarget(null);
  };

  // Day Conversation
  if (phase === 'DAY_CONVERSATION') {
    return (
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-amber-700/30 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">☕</span>
          <div>
            <h3 className="font-bold text-amber-300 text-sm">議論中</h3>
            <p className="text-xs text-gray-400">怪しい社員を見極めましょう</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          議論が終わると投票が始まります。
        </p>
      </div>
    );
  }

  // Voting Phase
  if (phase === 'DAY_VOTE') {
    const hasVoted = votes[myself.id] || confirmed;

    if (hasVoted) {
      return (
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-red-700/30 p-4 text-center">
          <span className="text-3xl">🗳️</span>
          <p className="text-red-300 font-bold mt-2">投票完了</p>
          <p className="text-xs text-gray-500 mt-1">他の社員の投票を待っています...</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-red-700/30 p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h3 className="font-bold text-red-300 text-sm">解雇投票</h3>
            <p className="text-xs text-gray-400">解雇したい社員を選んでください</p>
          </div>
        </div>

        {alivePlayers.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">投票対象がいません。結果をお待ちください...</p>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {alivePlayers.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedTarget(p.id)}
              className={`p-3 rounded-lg border text-sm text-left transition-all duration-200 ${
                selectedTarget === p.id
                  ? 'bg-red-600/40 text-white border-red-500 ring-1 ring-red-500 shadow-lg shadow-red-600/20'
                  : 'bg-gray-900/40 text-gray-300 border-gray-700/50 hover:bg-gray-700/40 hover:border-gray-600'
              }`}
            >
              <span className="font-medium">{p.name}</span>
              {selectedTarget === p.id && (
                <span className="block text-xs text-red-300 mt-0.5">✓ 選択中</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedTarget}
          className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-lg shadow-lg shadow-red-600/25 hover:shadow-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          投票確定
        </button>
        </>
        )}
      </div>
    );
  }

  // Night Action
  if (phase === 'NIGHT_ACTION') {
    const role = myself.role;
    const hasActed = actions[myself.id] || confirmed;

    // No night action for these roles
    if (!['SPY', 'HR', 'GA'].includes(role)) {
      return (
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-indigo-800/30 p-4 text-center">
          <span className="text-3xl">😴</span>
          <p className="text-indigo-300 font-bold mt-2">残業なし</p>
          <p className="text-xs text-gray-500 mt-1">あなたは夜に行動する役職ではありません。<br />朝が来るのを待ちましょう...</p>
        </div>
      );
    }

    if (hasActed) {
      return (
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-purple-700/30 p-4 text-center">
          <span className="text-3xl">✅</span>
          <p className="text-purple-300 font-bold mt-2">アクション完了</p>
          <p className="text-xs text-gray-500 mt-1">結果は朝に判明します...</p>
        </div>
      );
    }

    const actionInfo = getActionInfo(role);

    return (
      <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-purple-700/30 p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{actionInfo.icon}</span>
          <div>
            <h3 className="font-bold text-purple-300 text-sm">{actionInfo.title}</h3>
            <p className="text-xs text-gray-400">{actionInfo.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {alivePlayers.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedTarget(p.id)}
              className={`p-3 rounded-lg border text-sm text-left transition-all duration-200 ${
                selectedTarget === p.id
                  ? 'bg-purple-600/40 text-white border-purple-500 ring-1 ring-purple-500 shadow-lg shadow-purple-600/20'
                  : 'bg-gray-900/60 text-gray-300 border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600'
              }`}
            >
              <span className="font-medium">{p.name}</span>
              {selectedTarget === p.id && (
                <span className="block text-xs text-purple-300 mt-0.5">✓ 選択中</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedTarget}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          {actionInfo.buttonText}
        </button>
      </div>
    );
  }

  // Vote result or Night result - show waiting
  if (phase === 'VOTE_RESULT' || phase === 'NIGHT_RESULT') {
    return null;
  }

  return null;
}

function getActionInfo(role: string) {
  switch (role) {
    case 'SPY':
      return {
        icon: '🗡️',
        title: '解雇工作（襲撃）',
        description: '今夜解雇する社員を選んでください',
        buttonText: '襲撃実行',
      };
    case 'HR':
      return {
        icon: '🔍',
        title: '身辺調査（占い）',
        description: '素性を調べたい社員を選んでください',
        buttonText: '調査開始',
      };
    case 'GA':
      return {
        icon: '🛡️',
        title: '擁護（護衛）',
        description: '守りたい社員を選んでください',
        buttonText: '護衛開始',
      };
    default:
      return {
        icon: '❓',
        title: 'アクション',
        description: '',
        buttonText: '実行',
      };
  }
}
