'use client';

import { useState } from 'react';
import {
  getRoleName,
  getRoleAlias,
  getRoleDescription,
  getRoleGoal,
  getRoleTeam,
  getTeamName,
  getRoleComposition,
  AI_PERSONAS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  Role,
} from '@/types/shachiku-jinro';
import { AudioToggle } from '@/components/game/AudioToggle';
import { EmployeePortrait, RoleEmblem } from './AvatarSvg';
import { playJinroSe } from './sound';

interface LobbyProps {
  onStart: (playerName: string, playerCount: number) => void;
}

const ALL_ROLES: Role[] = [
  'SPY',
  'DRONE',
  'HR',
  'GA',
  'GOSSIP',
  'YESMAN',
  'ENGINEER',
  'CONSULTANT',
];

function teamBadgeStyle(team: 'company' | 'spy' | 'third'): string {
  if (team === 'spy') {
    return 'border-[#7c2d23] bg-[#2a1411] text-[#f4a28e]';
  }
  if (team === 'third') {
    return 'border-[#2f5d54] bg-[#132622] text-[#95d8c9]';
  }
  return 'border-[#614e35] bg-[#261f16] text-[#e8ca86]';
}

export default function Lobby({ onStart }: LobbyProps) {
  const [playerName, setPlayerName] = useState('佐藤');
  const [playerCount, setPlayerCount] = useState(6);
  const [activeTab, setActiveTab] = useState<'ROLES' | 'GUIDE'>('ROLES');
  const [error, setError] = useState<string | null>(null);

  const composition = getRoleComposition(playerCount);
  const spyCount = composition.filter((r) => r === 'SPY').length;
  const companyCount = composition.filter((r) => getRoleTeam(r) === 'company').length;

  const handleStart = () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError('社員名（あなたの呼称）を入力してください');
      return;
    }
    if (trimmed.length > 10) {
      setError('社員名は10文字以内で入力してください');
      return;
    }
    setError(null);
    playJinroSe('start');
    onStart(trimmed, playerCount);
  };

  return (
    <div className="min-h-screen bg-[#110f0c] px-4 py-6 text-[#f2e9d8] sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        {/* Top Confidential Dossier Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#3a3126] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-block border border-[#b23a2a] bg-[#2c1512] px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-[#f0927d]">
              CONFIDENTIAL // 人事保安監査室
            </span>
            <span className="font-mono text-[11px] text-[#8d7f6a]">
              CASE-FILE #404-JINRO
            </span>
          </div>
          <AudioToggle variant="full" />
        </div>

        {/* Hero Title Block */}
        <div className="relative mb-6 overflow-hidden border border-[#463b2d] bg-gradient-to-b from-[#1d1813] to-[#14110d] p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs tracking-widest text-[#dfb15b]">
                CORPORATE DEDUCTION MYSTERY
              </p>
              <h1 className="font-editorial mt-1.5 text-4xl font-black tracking-tight text-[#f6efe2] sm:text-5xl">
                社畜人狼
              </h1>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[#b9ab94]">
                機密情報を盗み出す「産業スパイ」が社内に紛れ込んだ。
                定例会議の証言・役職CO・投票履歴の矛盾を暴き、会社が倒産する前にスパイを懲戒解雇せよ。
              </p>
            </div>

            {/* Mini preview of AI Employee IDs */}
            <div className="flex -space-x-2 self-start sm:self-end">
              {[0, 2, 4, 5, 8].map((idx) => (
                <div
                  key={idx}
                  className="overflow-hidden border border-[#5a4b38] bg-[#1b1712] shadow-md"
                  title={`${AI_PERSONAS[idx].name} ${AI_PERSONAS[idx].title}`}
                >
                  <EmployeePortrait personaIndex={idx} size={42} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Setup Card */}
        <div className="border border-[#463b2d] bg-[#181410] shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#332b21] bg-[#201b15] px-5 py-3">
            <h2 className="font-mono text-xs font-bold tracking-wider text-[#dfb15b]">
              01 // 監査セッション設定（入社手続き）
            </h2>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {error && (
              <div
                role="alert"
                className="border-l-4 border-[#e07054] bg-[#2b1815] px-3.5 py-2.5 text-sm font-medium text-[#f5a997]"
              >
                {error}
              </div>
            )}

            {/* Player Name Input */}
            <div>
              <label
                htmlFor="jinro-player-name"
                className="mb-2 flex items-center justify-between text-xs font-bold text-[#cbbd9f]"
              >
                <span>あなたの社員名（呼称）</span>
                <span className="font-mono text-[11px] font-normal text-[#8a7d69]">
                  最大10文字
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  id="jinro-player-name"
                  type="text"
                  className="min-h-[44px] flex-1 border border-[#5a4b38] bg-[#100e0b] px-3.5 py-2.5 text-sm font-bold text-[#f2e9d8] placeholder-[#6e6250] outline-none transition focus:border-[#dfb15b]"
                  placeholder="例: 佐藤"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={10}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                />
                <div className="flex gap-1.5">
                  {['佐藤', '菊池', '監査役'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPlayerName(preset)}
                      className={`min-h-[44px] border px-3 text-xs font-bold transition ${
                        playerName === preset
                          ? 'border-[#dfb15b] bg-[#2d251a] text-[#f2e9d8]'
                          : 'border-[#3b3328] bg-[#16130f] text-[#9e907a] hover:border-[#5a4b38] hover:text-[#f2e9d8]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Player Count Selector */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="jinro-player-count"
                  className="text-xs font-bold text-[#cbbd9f]"
                >
                  招集メンバー数（あなた + AI社員 {playerCount - 1}名）
                </label>
                <span className="font-mono text-xs font-bold text-[#dfb15b]">
                  全 {playerCount} 名（スパイ {spyCount} / 会社 {companyCount}）
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[4, 5, 6, 7, 8].map((cnt) => {
                  const active = playerCount === cnt;
                  const label =
                    cnt === 4
                      ? '入門'
                      : cnt === 5
                        ? '手軽'
                        : cnt === 6
                          ? '標準'
                          : cnt === 7
                            ? '本格'
                            : '混沌';
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setPlayerCount(cnt)}
                      className={`flex min-h-[52px] flex-col items-center justify-center border px-2 py-1.5 transition ${
                        active
                          ? 'border-[#dfb15b] bg-[#2d2419] text-[#f7efe0] shadow-[2px_2px_0_#dfb15b]'
                          : 'border-[#3b3328] bg-[#14110d] text-[#9e907a] hover:border-[#5a4b38] hover:text-[#f2e9d8]'
                      }`}
                    >
                      <span className="font-mono text-sm font-black">{cnt}人</span>
                      <span className="text-[10px] text-[#b7a992]">{label}</span>
                    </button>
                  );
                })}
              </div>

              <input
                id="jinro-player-count"
                type="range"
                min={MIN_PLAYERS}
                max={MAX_PLAYERS}
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="sr-only"
                aria-label="参加人数スライダー"
              />
            </div>

            {/* Role Composition Breakdown */}
            <div className="border border-[#3b3328] bg-[#13100c] p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-[#dfb15b]">
                  配属役職内訳（{playerCount}人編成）
                </span>
                <span className="text-[11px] text-[#8a7d69]">
                  ランダムに1役職があなたに割り当てられます
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {composition.map((role, i) => {
                  const team = getRoleTeam(role);
                  return (
                    <span
                      key={`${role}-${i}`}
                      className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-bold ${teamBadgeStyle(
                        team,
                      )}`}
                    >
                      <RoleEmblem role={role} size={15} />
                      <span>{getRoleName(role)}</span>
                      <span className="font-mono text-[10px] opacity-75">
                        ({getRoleAlias(role)})
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Start CTA */}
            <button
              type="button"
              onClick={handleStart}
              disabled={!playerName.trim()}
              className="min-h-[52px] w-full border border-[#f2e9d8] bg-[#b23a2a] px-6 py-3.5 text-base font-black tracking-wide text-[#fffaf0] shadow-[4px_4px_0_#f2e9d8] transition hover:bg-[#c94b38] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#f2e9d8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              出社して会議に参加する（ゲーム開始）
            </button>
          </div>

          {/* Rules & Strategy Tabs */}
          <div className="border-t border-[#3b3328] bg-[#14110d]">
            <div className="flex border-b border-[#332b21]">
              <button
                type="button"
                onClick={() => setActiveTab('ROLES')}
                className={`min-h-[44px] flex-1 px-4 py-2.5 text-xs font-bold tracking-wider transition ${
                  activeTab === 'ROLES'
                    ? 'border-b-2 border-[#dfb15b] bg-[#1e1913] text-[#f2e9d8]'
                    : 'text-[#8a7d69] hover:text-[#cbbd9f]'
                }`}
              >
                02 // 役職ファイル一覧
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('GUIDE')}
                className={`min-h-[44px] flex-1 px-4 py-2.5 text-xs font-bold tracking-wider transition ${
                  activeTab === 'GUIDE'
                    ? 'border-b-2 border-[#dfb15b] bg-[#1e1913] text-[#f2e9d8]'
                    : 'text-[#8a7d69] hover:text-[#cbbd9f]'
                }`}
              >
                03 // 推理・立ち回りマニュアル
              </button>
            </div>

            {activeTab === 'ROLES' ? (
              <div className="grid grid-cols-1 gap-2.5 p-5 sm:grid-cols-2">
                {ALL_ROLES.map((role) => {
                  const team = getRoleTeam(role);
                  const inCurrentComp = composition.includes(role);
                  return (
                    <div
                      key={role}
                      className={`border p-3.5 transition ${
                        inCurrentComp
                          ? 'border-[#4a3e2e] bg-[#1a1611]'
                          : 'border-[#2a241c] bg-[#13100c] opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[#dfb15b]">
                            <RoleEmblem role={role} size={18} />
                          </span>
                          <span className="text-sm font-bold text-[#f2e9d8]">
                            {getRoleName(role)}
                          </span>
                          <span className="font-mono text-[10px] text-[#8a7d69]">
                            [{getRoleAlias(role)}]
                          </span>
                        </div>
                        <span
                          className={`border px-1.5 py-0.5 text-[10px] font-bold ${teamBadgeStyle(
                            team,
                          )}`}
                        >
                          {getTeamName(team)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[#b7a992]">
                        {getRoleDescription(role)}
                      </p>
                      <p className="mt-1.5 font-mono text-[10px] text-[#dfb15b]">
                        勝利条件: {getRoleGoal(role)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 p-5 text-xs leading-relaxed text-[#b7a992]">
                <div className="border border-[#3b3328] bg-[#1a1611] p-3.5">
                  <p className="font-bold text-[#dfb15b]">
                    STEP 1: 昼の定例会議（COと調査報告の照合）
                  </p>
                  <p className="mt-1">
                    人事部（占い師）やお局様（霊媒師）は昼の会議で名乗り出て（CO）、誰が白か黒かを報告します。ただし、スパイやイエスマンが偽の人事部を騙ることもあるため、複数の人事部が現れたら「どちらの報告に矛盾がないか」を見極めてください。
                  </p>
                </div>
                <div className="border border-[#3b3328] bg-[#1a1611] p-3.5">
                  <p className="font-bold text-[#dfb15b]">
                    STEP 2: あなた自身の議論コマンド活用
                  </p>
                  <p className="mt-1">
                    昼の会議中、画面下部の「発言デッキ」からあなた自身も役職CO（ブラフ含む）、調査結果報告、特定社員への疑い表明・擁護を行えます。あなたの発言に対してAI社員が即座に反論や賛同を返し、投票行動にも影響します。
                  </p>
                </div>
                <div className="border border-[#3b3328] bg-[#1a1611] p-3.5">
                  <p className="font-bold text-[#dfb15b]">
                    STEP 3: 夕方の人事査定投票と深夜残業
                  </p>
                  <p className="mt-1">
                    夕方の投票で最多票を集めた社員1名が懲戒解雇されます（同票時は決選投票）。深夜にはスパイが襲撃、人事部が調査、総務部が護衛を行います。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
