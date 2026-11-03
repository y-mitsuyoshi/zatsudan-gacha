'use client';

import { useState } from 'react';
import { getRoleName, getRoleDescription, getRoleComposition, Role } from '@/types/shachiku-jinro';

interface LobbyProps {
  onStart: (playerName: string, playerCount: number) => void;
}

const ROLES_INFO: { role: Role; team: string; teamClass: string }[] = [
  { role: 'SPY', team: 'スパイ陣営', teamClass: 'text-[#e07054]' },
  { role: 'DRONE', team: '会社陣営', teamClass: 'text-[#dfb15b]' },
  { role: 'HR', team: '会社陣営', teamClass: 'text-[#dfb15b]' },
  { role: 'GA', team: '会社陣営', teamClass: 'text-[#dfb15b]' },
  { role: 'GOSSIP', team: '会社陣営', teamClass: 'text-[#dfb15b]' },
  { role: 'YESMAN', team: 'スパイ陣営', teamClass: 'text-[#e07054]' },
  { role: 'ENGINEER', team: '会社陣営', teamClass: 'text-[#dfb15b]' },
  { role: 'CONSULTANT', team: '第三勢力', teamClass: 'text-[#83b8ac]' },
];

function roleChipClass(role: Role): string {
  if (role === 'SPY' || role === 'YESMAN') {
    return 'border-[#6d3027] bg-[#2b1a17] text-[#f0a08b]';
  }
  if (role === 'CONSULTANT') {
    return 'border-[#355952] bg-[#172622] text-[#9dd4c7]';
  }
  return 'border-[#5a4b38] bg-[#2a231b] text-[#e4c989]';
}

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
    <div className="flex min-h-screen items-center justify-center bg-[#12100d] p-4 text-[#f2e9d8]">
      <div className="w-full max-w-xl py-8">
        <div className="mb-7 border-b border-[#3b3328] pb-5">
          <p className="font-label text-[10px] text-[#dfb15b]">Solo Social Game / 4—8 Players</p>
          <h1 className="font-editorial mt-2 text-4xl leading-tight">社畜人狼</h1>
          <p className="mt-2 text-sm text-[#b7a992]">会社という名の戦場で、誰がスパイかを見抜く。</p>
        </div>

        <div className="game-panel">
          <div className="space-y-5 p-5 sm:p-6">
            {error && (
              <div className="border-l-2 border-[#e07054] bg-[#2b1a17] px-3 py-2 text-sm text-[#f0a08b]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="jinro-player-name" className="font-label mb-2 block text-[9px] text-[#b7a992]">
                社員名
              </label>
              <input
                id="jinro-player-name"
                type="text"
                className="w-full border border-[#5a4b38] bg-[#12100d] px-3 py-3 text-sm text-[#f2e9d8] placeholder-[#756957] outline-none transition focus:border-[#dfb15b] focus:ring-2 focus:ring-[#dfb15b]/15"
                placeholder="あなたの名前を入力"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={10}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="jinro-player-count" className="font-label text-[9px] text-[#b7a992]">
                  参加人数（AI含む）
                </label>
                <span className="font-label border border-[#5a4b38] bg-[#2a231b] px-2 py-0.5 text-xs font-bold text-[#e4c989]">
                  {playerCount}
                </span>
              </div>
              <input
                id="jinro-player-count"
                type="range"
                min="4"
                max="8"
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-none bg-[#3b3328] accent-[#e07054]"
              />
              <p className="mt-2 text-[11px] text-[#8a7d69]">
                あなた + AI {playerCount - 1}人 = 合計 {playerCount}人
              </p>
            </div>

            <div className="border border-[#3b3328] bg-[#16130f] p-3">
              <p className="font-label text-[9px] text-[#8a7d69]">配役構成</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {getRoleComposition(playerCount).map((role, i) => (
                  <span
                    key={i}
                    className={`inline-flex border px-2 py-1 text-[11px] font-bold ${roleChipClass(role)}`}
                  >
                    {getRoleName(role)}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={!playerName.trim()}
              className="w-full border border-[#f2e9d8] bg-[#b23a2a] px-5 py-3.5 text-base font-black text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#f2e9d8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              入社する（ゲーム開始）
            </button>
          </div>

          <div className="border-t border-[#3b3328]">
            <button
              onClick={() => setShowRules(!showRules)}
              className="flex w-full items-center justify-between px-5 py-3 text-sm text-[#b7a992] transition hover:bg-[#26211a] hover:text-[#f2e9d8]"
            >
              <span>ルール・役職一覧</span>
              <span className="font-label text-[10px]">{showRules ? 'Close' : 'Open'}</span>
            </button>

            {showRules && (
              <div className="space-y-4 border-t border-[#3b3328] px-5 py-5">
                <div className="border border-[#3b3328] bg-[#16130f] p-4">
                  <h3 className="font-label text-[10px] text-[#dfb15b]">基本ルール</h3>
                  <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs leading-6 text-[#b7a992]">
                    <li>昼に議論し、投票で1人を解雇（処刑）</li>
                    <li>夜にスパイが1人を襲撃</li>
                    <li>スパイを全員解雇すれば会社の勝利</li>
                    <li>スパイの数がその他以上になるとスパイの勝利</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-label text-[10px] text-[#dfb15b]">役職一覧</h3>
                  <div className="mt-2 space-y-2">
                    {ROLES_INFO.map(({ role, team, teamClass }) => (
                      <div key={role} className="border border-[#3b3328] bg-[#16130f] p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#f2e9d8]">{getRoleName(role)}</span>
                          <span className={`font-label text-[9px] ${teamClass}`}>{team}</span>
                        </div>
                        <p className="mt-1 text-xs leading-6 text-[#b7a992]">{getRoleDescription(role)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#8a7d69]">
          このゲームはソロプレイ（対AI）です。
        </p>
      </div>
    </div>
  );
}
