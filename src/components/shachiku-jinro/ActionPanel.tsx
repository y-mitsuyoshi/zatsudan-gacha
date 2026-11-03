'use client';

import { GameState, Player } from '@/types/shachiku-jinro';
import { useState, useEffect } from 'react';

interface ActionPanelProps {
  gameState: GameState;
  myself: Player;
  onVote: (targetId: string) => void;
  onNightAction: (targetId: string) => void;
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="game-panel p-4">{children}</div>;
}

export default function ActionPanel({ gameState, myself, onVote, onNightAction }: ActionPanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { phase, players, votes, actions, dayCount } = gameState;
  const alivePlayers = Object.values(players).filter(p => p.isAlive && p.id !== myself.id);

  useEffect(() => {
    setSelectedTarget(null);
    setConfirmed(false);
  }, [phase, dayCount]);

  const handleConfirm = () => {
    if (!selectedTarget) return;
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

  if (phase === 'DAY_CONVERSATION') {
    return (
      <Panel>
        <h3 className="font-label text-[10px] text-[#dfb15b]">Discussion</h3>
        <p className="mt-2 text-sm font-bold">議論中</p>
        <p className="mt-1 text-xs leading-6 text-[#b7a992]">怪しい社員を見極めましょう。議論が終わると投票が始まります。</p>
      </Panel>
    );
  }

  if (phase === 'DAY_VOTE') {
    const hasVoted = votes[myself.id] || confirmed;

    if (hasVoted) {
      return (
        <Panel>
          <p className="text-sm font-bold text-[#dfb15b]">投票完了</p>
          <p className="mt-1 text-xs text-[#b7a992]">他の社員の投票を待っています。</p>
        </Panel>
      );
    }

    return (
      <Panel>
        <h3 className="font-label text-[10px] text-[#e07054]">Vote</h3>
        <p className="mt-2 text-sm font-bold">解雇投票</p>
        <p className="mt-1 text-xs text-[#b7a992]">解雇したい社員を選んでください。</p>

        {alivePlayers.length === 0 ? (
          <p className="py-4 text-center text-xs text-[#8a7d69]">投票対象がいません。結果をお待ちください。</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {alivePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTarget(p.id)}
                  className={`border p-3 text-left text-sm transition-colors ${
                    selectedTarget === p.id
                      ? 'border-[#e07054] bg-[#2b1a17] text-[#f2e9d8]'
                      : 'border-[#3b3328] bg-[#16130f] text-[#b7a992] hover:border-[#5a4b38]'
                  }`}
                >
                  <span className="font-bold">{p.name}</span>
                  {selectedTarget === p.id && <span className="mt-0.5 block text-[10px] text-[#e07054]">選択中</span>}
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirm}
              disabled={!selectedTarget}
              className="mt-3 w-full border border-[#f2e9d8] bg-[#b23a2a] py-3 text-sm font-black text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#f2e9d8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              投票確定
            </button>
          </>
        )}
      </Panel>
    );
  }

  if (phase === 'NIGHT_ACTION') {
    const role = myself.role;
    const hasActed = actions[myself.id] || confirmed;

    if (!['SPY', 'HR', 'GA'].includes(role)) {
      return (
        <Panel>
          <p className="text-sm font-bold text-[#b7a992]">残業なし</p>
          <p className="mt-1 text-xs leading-6 text-[#8a7d69]">あなたは夜に行動する役職ではありません。朝を待ちましょう。</p>
        </Panel>
      );
    }

    if (hasActed) {
      return (
        <Panel>
          <p className="text-sm font-bold text-[#dfb15b]">アクション完了</p>
          <p className="mt-1 text-xs text-[#b7a992]">結果は朝に判明します。</p>
        </Panel>
      );
    }

    const actionInfo = getActionInfo(role);

    return (
      <Panel>
        <h3 className="font-label text-[10px] text-[#e07054]">Night Action</h3>
        <p className="mt-2 text-sm font-bold">{actionInfo.title}</p>
        <p className="mt-1 text-xs text-[#b7a992]">{actionInfo.description}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {alivePlayers.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedTarget(p.id)}
              className={`border p-3 text-left text-sm transition-colors ${
                selectedTarget === p.id
                  ? 'border-[#dfb15b] bg-[#2a231b] text-[#f2e9d8]'
                  : 'border-[#3b3328] bg-[#16130f] text-[#b7a992] hover:border-[#5a4b38]'
              }`}
            >
              <span className="font-bold">{p.name}</span>
              {selectedTarget === p.id && <span className="mt-0.5 block text-[10px] text-[#dfb15b]">選択中</span>}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedTarget}
          className="mt-3 w-full border border-[#f2e9d8] bg-[#b23a2a] py-3 text-sm font-black text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#f2e9d8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {actionInfo.buttonText}
        </button>
      </Panel>
    );
  }

  return null;
}

function getActionInfo(role: string) {
  switch (role) {
    case 'SPY':
      return {
        title: '解雇工作（襲撃）',
        description: '今夜解雇する社員を選んでください。',
        buttonText: '襲撃実行',
      };
    case 'HR':
      return {
        title: '身辺調査（占い）',
        description: '素性を調べたい社員を選んでください。',
        buttonText: '調査開始',
      };
    case 'GA':
      return {
        title: '擁護（護衛）',
        description: '守りたい社員を選んでください。',
        buttonText: '護衛開始',
      };
    default:
      return {
        title: 'アクション',
        description: '',
        buttonText: '実行',
      };
  }
}
