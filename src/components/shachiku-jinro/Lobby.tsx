'use client';

import { useState } from 'react';
import { getRoleName, getRoleEmoji, getRoleDescription, getRoleComposition, Role } from '@/types/shachiku-jinro';

interface LobbyProps {
  onStart: (playerName: string, playerCount: number) => void;
}

const ROLES_INFO: { role: Role; team: string; teamColor: string }[] = [
  { role: 'SPY', team: 'スパイ陣営', teamColor: 'text-red-400' },
  { role: 'DRONE', team: '会社陣営', teamColor: 'text-blue-400' },
  { role: 'HR', team: '会社陣営', teamColor: 'text-blue-400' },
  { role: 'GA', team: '会社陣営', teamColor: 'text-blue-400' },
  { role: 'GOSSIP', team: '会社陣営', teamColor: 'text-blue-400' },
  { role: 'YESMAN', team: 'スパイ陣営', teamColor: 'text-red-400' },
  { role: 'ENGINEER', team: '会社陣営', teamColor: 'text-blue-400' },
  { role: 'CONSULTANT', team: '第三勢力', teamColor: 'text-yellow-400' },
];

export default function Lobby({ onStart }: LobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [playerCount, setPlayerCount] = useState(5);
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (!playerName.trim()) {
      setError('社員名を入力してください');
      return;
    }
    if (playerName.trim().length > 10) {
      setError('社員名は10文字以内にしてください');
      return;
    }
    setError(null);
    onStart(playerName.trim(), playerCount);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">

      <div className="w-full max-w-lg">

        {/* Title Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block mb-3">
            <span className="text-6xl">🏢</span>
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            社畜人狼
          </h1>
          <p className="text-gray-400 mt-2 text-sm tracking-wider">
            〜 会社という名の戦場 〜
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">

          {/* Form Section */}
          <div className="p-6 space-y-5">

            {/* Error */}
            {error && (
              <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            {/* Player Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                社員名
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="あなたの名前を入力..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={10}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>

            {/* Player Count */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                参加人数（AI含む）
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="4"
                  max="8"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="bg-blue-600/30 border border-blue-500/30 rounded-lg px-4 py-2 text-blue-300 font-bold text-lg min-w-[50px] text-center">
                  {playerCount}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                あなた + AI {playerCount - 1}人 = 合計 {playerCount}人
              </p>
            </div>

            {/* Role Composition Preview */}
            <div className="bg-gray-900/40 rounded-xl p-3 border border-gray-700/30">
              <p className="text-xs font-semibold text-gray-400 mb-2">配役構成:</p>
              <div className="flex flex-wrap gap-1.5">
                {getRoleComposition(playerCount).map((role, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      role === 'SPY' ? 'bg-red-900/40 text-red-300 border border-red-800/50' :
                      role === 'YESMAN' ? 'bg-red-900/30 text-red-300/80 border border-red-800/30' :
                      role === 'CONSULTANT' ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-800/50' :
                      'bg-blue-900/30 text-blue-300 border border-blue-800/30'
                    }`}
                  >
                    <span>{getRoleEmoji(role)}</span>
                    {getRoleName(role)}
                  </span>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={!playerName.trim()}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
            >
              🚀 入社する（ゲーム開始）
            </button>
          </div>

          {/* Rules Toggle */}
          <div className="border-t border-gray-700/50">
            <button
              onClick={() => setShowRules(!showRules)}
              className="w-full px-6 py-3 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700/30 transition-colors flex items-center justify-center gap-2"
            >
              <span>{showRules ? '▲' : '▼'}</span>
              ルール・役職一覧
            </button>

            {showRules && (
              <div className="px-6 pb-6 space-y-4 animate-fade-in">

                {/* Basic Rules */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                  <h3 className="text-sm font-bold text-white mb-2">📋 基本ルール</h3>
                  <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
                    <li>昼に議論 → 投票で1人を解雇（処刑）</li>
                    <li>夜にスパイが1人を襲撃</li>
                    <li>スパイを全員解雇すれば会社の勝利</li>
                    <li>スパイの数 ≧ その他で スパイの勝利</li>
                  </ul>
                </div>

                {/* Role List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">👥 役職一覧</h3>
                  {ROLES_INFO.map(({ role, team, teamColor }) => (
                    <div key={role} className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getRoleEmoji(role)}</span>
                        <span className="font-bold text-sm text-white">{getRoleName(role)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${teamColor} bg-gray-800`}>
                          {team}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {getRoleDescription(role)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-4">
          ※ このゲームはソロプレイ（対AI）です
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
