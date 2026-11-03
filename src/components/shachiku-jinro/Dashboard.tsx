'use client';

import {
  GameState,
  Role,
  getRoleName,
  getRoleAlias,
  getRoleDescription,
  getRoleGoal,
  getRoleTeam,
  getTeamName,
} from '@/types/shachiku-jinro';
import { getMaxTimeForPhase } from './useJinroGame';
import { AudioToggle } from '@/components/game/AudioToggle';
import PlayerCard from './PlayerCard';
import ActionPanel from './ActionPanel';
import ChatLog from './ChatLog';
import { EmployeePortrait, RoleEmblem } from './AvatarSvg';

interface DashboardProps {
  gameState: GameState;
  onVote: (targetId: string) => void;
  onNightAction: (targetId: string) => void;
  onSkip: () => void;
  onReset: () => void;
  onClaimRole: (role: Role) => void;
  onClaimResult: (targetId: string, isSpy: boolean, kind: 'DIVINE' | 'MEDIUM') => void;
  onSpeakStance: (targetId: string, kind: 'ACCUSE' | 'TRUST') => void;
  onSpeakGeneral: (kind: 'DEFEND' | 'PROMPT') => void;
  onFlushNext: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export default function Dashboard({
  gameState,
  onVote,
  onNightAction,
  onSkip,
  onReset,
  onClaimRole,
  onClaimResult,
  onSpeakStance,
  onSpeakGeneral,
  onFlushNext,
  isPaused,
  onTogglePause,
}: DashboardProps) {
  const {
    phase,
    players,
    order,
    dayCount,
    timeRemaining,
    winner,
    logs,
    divinationResults,
    gossipResults,
    lastExecutedId,
    lastAttackedId,
    lastVote,
    lastNight,
    claims,
    claimedResults,
    voteHistory,
    nightHistory,
    pendingLines,
  } = gameState;

  const orderedPlayers =
    order.length > 0
      ? order.map((id) => players[id]).filter(Boolean)
      : Object.values(players);

  const myself = orderedPlayers.find((p) => !p.isAI) ?? null;
  const alivePlayers = orderedPlayers.filter((p) => p.isAlive);
  const aliveSpiesCount = alivePlayers.filter((p) => p.role === 'SPY').length;

  const getPhaseMeta = () => {
    switch (phase) {
      case 'ROLE_REVEAL':
        return {
          code: 'APPOINTMENT',
          title: '極秘辞令交付',
          subtitle: 'あなたの配属役職と極秘任務を確認してください',
          bgClass: 'bg-[#12100d]',
          headerClass: 'border-[#4a3e2e] bg-[#1b1611]',
        };
      case 'DAY_CONVERSATION':
        return {
          code: `DAY ${dayCount} // CONFERENCE`,
          title: `${dayCount}日目・昼の定例会議`,
          subtitle: '証言と役職COからスパイの矛盾を暴いてください',
          bgClass: 'bg-[#15120e]',
          headerClass: 'border-[#524330] bg-[#211b14]',
        };
      case 'DAY_VOTE':
        return {
          code: `DAY ${dayCount} // TRIBUNAL`,
          title: `${dayCount}日目・夕方の人事査定会議`,
          subtitle: '最多得票者を懲戒解雇します',
          bgClass: 'bg-[#17100e]',
          headerClass: 'border-[#6e3026] bg-[#241411]',
        };
      case 'VOTE_RESULT':
        return {
          code: `DAY ${dayCount} // VERDICT`,
          title: `${dayCount}日目・人事査定結果通達`,
          subtitle: '開票結果が確定しました',
          bgClass: 'bg-[#16100e]',
          headerClass: 'border-[#6e3026] bg-[#241411]',
        };
      case 'NIGHT_ACTION':
        return {
          code: `NIGHT ${dayCount} // OVERTIME`,
          title: `${dayCount}日目・深夜残業フロア`,
          subtitle: '消灯後のオフィスで各役職が暗躍しています',
          bgClass: 'bg-[#0b0e14]',
          headerClass: 'border-[#283242] bg-[#111621]',
        };
      case 'NIGHT_RESULT':
        return {
          code: `DAY ${dayCount + 1} // DAWN REPORT`,
          title: '翌朝の出勤状況報告',
          subtitle: '昨晩の残業フロアの結果が判明しました',
          bgClass: 'bg-[#101216]',
          headerClass: 'border-[#353d4b] bg-[#171b24]',
        };
      case 'GAME_OVER':
        return {
          code: 'FINAL AUDIT // SETTLEMENT',
          title: '最終決算・人事監査報告書',
          subtitle: '全社員の正体と行動記録が開示されました',
          bgClass: 'bg-[#110f0c]',
          headerClass: 'border-[#5a4b38] bg-[#1e1913]',
        };
      default:
        return {
          code: 'STANDBY',
          title: '待機中',
          subtitle: '',
          bgClass: 'bg-[#12100d]',
          headerClass: 'border-[#3b3328] bg-[#1d1914]',
        };
    }
  };

  const meta = getPhaseMeta();

  const didPlayerWin = (() => {
    if (!myself || !winner) return false;
    const myTeam = getRoleTeam(myself.role);
    if (winner === 'COMPANY') return myTeam === 'company';
    if (winner === 'SPIES') return myTeam === 'spy';
    if (winner === 'CONSULTANT') return myself.role === 'CONSULTANT';
    return false;
  })();

  return (
    <div className={`min-h-screen pb-12 text-[#f2e9d8] transition-colors duration-500 ${meta.bgClass}`}>
      {/* Sticky Top HUD */}
      <header className={`sticky top-0 z-30 border-b shadow-md ${meta.headerClass}`}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-[#dfb15b]">
                {meta.code}
              </span>
              {myself && (
                <span className="border border-[#5a4b38] bg-[#14110d] px-1.5 py-0.5 text-[10px] font-bold text-[#e4c989]">
                  あなた: {getRoleName(myself.role)} {!myself.isAlive ? '(解雇済)' : ''}
                </span>
              )}
            </div>
            <h1 className="mt-0.5 text-base font-black text-[#f6efe2] sm:text-lg">
              {meta.title}
            </h1>
            <p className="text-[11px] text-[#b7a992]">{meta.subtitle}</p>
          </div>

          <div className="flex items-center gap-2.5">
            {timeRemaining > 0 && phase !== 'GAME_OVER' && (
              <div className="min-w-[78px] text-right">
                <div
                  className={`font-mono text-xl font-black leading-none ${
                    isPaused
                      ? 'text-[#8a7d69]'
                      : timeRemaining <= 10
                        ? 'animate-pulse text-[#e07054]'
                        : 'text-[#f2e9d8]'
                  }`}
                >
                  {isPaused
                    ? 'PAUSED'
                    : `${Math.floor(timeRemaining / 60)}:${String(
                        timeRemaining % 60,
                      ).padStart(2, '0')}`}
                </div>
                <div className="mt-1 h-1.5 w-20 overflow-hidden bg-[#2c251d]">
                  <div
                    className="h-full bg-[#dfb15b] transition-all duration-300 ease-linear"
                    style={{
                      width: `${Math.min(
                        100,
                        (timeRemaining / getMaxTimeForPhase(phase)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <AudioToggle variant="compact" />

            {phase !== 'GAME_OVER' && (
              <button
                type="button"
                onClick={onTogglePause}
                className="min-h-[36px] border border-[#5a4b38] bg-[#16130f] px-2.5 py-1 text-xs font-bold text-[#e4c989] transition hover:border-[#dfb15b]"
              >
                {isPaused ? '再開' : '一時停止'}
              </button>
            )}

            <button
              type="button"
              onClick={onReset}
              className="min-h-[36px] border border-[#463b2d] bg-[#14110d] px-2.5 py-1 text-xs text-[#9e907a] transition hover:border-[#e07054] hover:text-[#f2e9d8]"
            >
              ロビーへ
            </button>
          </div>
        </div>
      </header>

      {/* Pause Overlay Banner */}
      {isPaused && phase !== 'GAME_OVER' && (
        <div className="border-b border-[#dfb15b] bg-[#2a2114] px-4 py-2.5 text-center text-xs font-bold text-[#f5d98e]">
          ゲームを一時停止中です（タイマーとBGMが停止しています）。右上の「再開」ボタンで続行できます。
        </div>
      )}

      {/* Main Content Container */}
      <div className="mx-auto max-w-4xl space-y-5 px-4 pt-5">
        {/* ===== ROLE_REVEAL ===== */}
        {phase === 'ROLE_REVEAL' && myself && (
          <div className="border-2 border-[#dfb15b] bg-gradient-to-b from-[#231d15] to-[#17130e] p-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.65)]">
            <span className="inline-block border border-[#dfb15b] bg-[#2e2416] px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-[#f5d98e]">
              STRICTLY CONFIDENTIAL // 辞令書
            </span>
            <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center border border-[#dfb15b] bg-[#14110d] text-[#dfb15b]">
              <RoleEmblem role={myself.role} size={36} />
            </div>
            <p className="mt-3 font-mono text-xs text-[#b7a992]">
              {myself.name} 殿 — あなたの役職は
            </p>
            <h2 className="font-editorial mt-1 text-3xl font-black text-[#f7efe0] sm:text-4xl">
              {getRoleName(myself.role)}
              <span className="ml-2 text-base font-normal text-[#dfb15b]">
                （{getRoleAlias(myself.role)} / {getTeamName(getRoleTeam(myself.role))}）
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#d8cbb5]">
              {getRoleDescription(myself.role)}
            </p>
            <div className="mx-auto mt-3 inline-block border border-[#4a3e2e] bg-[#12100d] px-3.5 py-1.5 font-mono text-xs font-bold text-[#dfb15b]">
              勝利条件: {getRoleGoal(myself.role)}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={onSkip}
                className="min-h-[46px] border border-[#f2e9d8] bg-[#b23a2a] px-7 py-2.5 text-sm font-black text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38]"
              >
                確認完了 — 1日目の定例会議へ進む
              </button>
            </div>
          </div>
        )}

        {/* ===== VOTE_RESULT Banner ===== */}
        {phase === 'VOTE_RESULT' && (
          <div className="border border-[#7c2d23] bg-[#241310] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-widest text-[#e07054]">
                  TRIBUNAL VERDICT // 人事査定開票結果
                </p>
                <h2 className="mt-1 text-xl font-black text-[#f7efe0]">
                  {lastExecutedId && players[lastExecutedId]
                    ? `${players[lastExecutedId].name} が懲戒解雇されました`
                    : '票が割れたため、本日の解雇処分は見送られました'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onSkip}
                className="min-h-[42px] border border-[#f2e9d8] bg-[#b23a2a] px-4 py-2 text-xs font-bold text-[#fffaf0]"
              >
                次へ進む →
              </button>
            </div>

            {lastVote && (
              <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-[#47221c] pt-3 text-xs sm:grid-cols-3">
                {Object.entries(lastVote.votes).map(([voterId, targetId]) => (
                  <div
                    key={voterId}
                    className="border border-[#3d201b] bg-[#180d0b] px-2.5 py-1 text-[#d8cbb5]"
                  >
                    <span className="font-bold">{players[voterId]?.name}</span>
                    <span className="mx-1 text-[#e07054]">→</span>
                    <span>{players[targetId]?.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== NIGHT_RESULT Banner ===== */}
        {phase === 'NIGHT_RESULT' && (
          <div className="border border-[#354256] bg-[#131822] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-widest text-[#8ca2c0]">
                  MORNING ROLL CALL // 翌朝の出勤確認
                </p>
                <h2 className="mt-1 text-xl font-black text-[#f6efe2]">
                  {lastAttackedId && players[lastAttackedId]
                    ? `昨晩の工作で ${players[lastAttackedId].name} が退職に追い込まれました`
                    : lastNight?.peaceful
                      ? '昨晩は襲撃が阻止され、誰も欠けませんでした！'
                      : '平穏な朝を迎えました'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onSkip}
                className="min-h-[42px] border border-[#dfb15b] bg-[#2a2216] px-4 py-2 text-xs font-bold text-[#f5d98e]"
              >
                定例会議へ進む →
              </button>
            </div>
          </div>
        )}

        {/* ===== GAME_OVER: Full Spoilers & Audit Report ===== */}
        {phase === 'GAME_OVER' && (
          <div className="space-y-5">
            <div
              className={`border-2 p-6 text-center shadow-xl ${
                didPlayerWin
                  ? 'border-[#dfb15b] bg-gradient-to-b from-[#282013] to-[#17130d]'
                  : 'border-[#7c2d23] bg-gradient-to-b from-[#291310] to-[#160d0b]'
              }`}
            >
              <span
                className={`inline-block border px-3 py-0.5 font-mono text-xs font-black tracking-widest ${
                  didPlayerWin
                    ? 'border-[#dfb15b] bg-[#362b17] text-[#f5d98e]'
                    : 'border-[#e07054] bg-[#381814] text-[#f5a492]'
                }`}
              >
                {didPlayerWin ? 'VICTORY // あなたの勝利' : 'DEFEAT // あなたの敗北'}
              </span>

              <h2 className="font-editorial mt-3 text-3xl font-black text-[#f7efe0] sm:text-4xl">
                {winner === 'COMPANY'
                  ? '会社存続 — 産業スパイ完全排除！'
                  : winner === 'SPIES'
                    ? '会社倒産 — 産業スパイによる乗っ取り完了'
                    : 'コンサルタントの横取り独り勝ち！'}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#cbbd9f]">
                {winner === 'COMPANY'
                  ? '社畜たちの推理によってすべての産業スパイが解雇され、会社の機密は守られました。'
                  : winner === 'SPIES'
                    ? 'スパイの数が社員と同数以上に達し、会社の経営権は完全に奪われました。'
                    : '会社とスパイの抗争の裏で生き延びたコンサルタントが、全利益を独占しました。'}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={onReset}
                  className="min-h-[48px] border border-[#f2e9d8] bg-[#b23a2a] px-8 py-3 text-sm font-black text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38]"
                >
                  もう一度監査に挑む（再戦）
                </button>
              </div>
            </div>

            {/* Full Employee Role Reveal Table */}
            <div className="border border-[#463b2d] bg-[#181410]">
              <div className="border-b border-[#332b21] bg-[#201b15] px-4 py-2.5">
                <h3 className="font-mono text-xs font-bold tracking-wider text-[#dfb15b]">
                  FULL ROSTER REVEAL // 全社員の真の役職・最終戦績一覧
                </h3>
              </div>
              <div className="divide-y divide-[#2a231b]">
                {orderedPlayers.map((p, idx) => {
                  const pTeam = getRoleTeam(p.role);
                  const pClaim = claims.find((c) => c.playerId === p.id);
                  const pWon =
                    (winner === 'COMPANY' && pTeam === 'company') ||
                    (winner === 'SPIES' && pTeam === 'spy') ||
                    (winner === 'CONSULTANT' && p.role === 'CONSULTANT');

                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <EmployeePortrait
                          personaIndex={p.personaIndex}
                          isDead={!p.isAlive}
                          size={44}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-[#8a7d69]">
                              ID-{String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-sm font-bold text-[#f2e9d8]">
                              {p.name}
                            </span>
                            {!p.isAI && (
                              <span className="border border-[#dfb15b] bg-[#2b2214] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#dfb15b]">
                                YOU
                              </span>
                            )}
                            <span
                              className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                pWon
                                  ? 'border-[#dfb15b] bg-[#2e2415] text-[#f5d98e]'
                                  : 'border-[#3b3328] bg-[#14110d] text-[#8a7d69]'
                              }`}
                            >
                              {pWon ? 'WIN' : 'LOSE'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#9e907a]">
                            {p.isAlive
                              ? '最終日まで生存（在籍）'
                              : `${p.deathDay ?? '?'}日目に${
                                  p.deathCause === 'EXECUTED'
                                    ? '会議投票により懲戒解雇'
                                    : '深夜のスパイ工作により退職'
                                }`}
                            {pClaim
                              ? ` ／ 会議での主張: ${getRoleName(pClaim.role)}CO`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 border border-[#5a4b38] bg-[#221c14] px-2.5 py-1 text-xs font-bold text-[#f2e9d8]">
                          <RoleEmblem role={p.role} size={15} />
                          <span>{getRoleName(p.role)}</span>
                          <span className="font-mono text-[10px] text-[#b7a992]">
                            ({getTeamName(pTeam)})
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chronological Audit Trail (Votes & Night Actions) */}
            {(voteHistory.length > 0 || nightHistory.length > 0) && (
              <div className="border border-[#463b2d] bg-[#181410]">
                <div className="border-b border-[#332b21] bg-[#201b15] px-4 py-2.5">
                  <h3 className="font-mono text-xs font-bold tracking-wider text-[#dfb15b]">
                    CHRONOLOGICAL AUDIT // 日別の投票・深夜行動ネタバレ記録
                  </h3>
                </div>
                <div className="space-y-3 p-4 text-xs">
                  {voteHistory.map((vh) => {
                    const nh = nightHistory.find((n) => n.day === vh.day);
                    return (
                      <div
                        key={vh.day}
                        className="border border-[#332b21] bg-[#13100c] p-3"
                      >
                        <p className="font-mono font-bold text-[#dfb15b]">
                          DAY {vh.day} 記録
                        </p>
                        <p className="mt-1 text-[#cbbd9f]">
                          <span className="font-bold text-[#e07054]">[昼の投票]</span>{' '}
                          {Object.entries(vh.votes)
                            .map(
                              ([vId, tId]) =>
                                `${players[vId]?.name ?? '?'}→${
                                  players[tId]?.name ?? '?'
                                }`,
                            )
                            .join(' ／ ')}{' '}
                          （解雇:{' '}
                          {vh.executedId
                            ? players[vh.executedId]?.name
                            : 'なし'}
                          ）
                        </p>
                        {nh && (
                          <p className="mt-1 text-[#94a3b8]">
                            <span className="font-bold text-[#8ca2c0]">[夜の裏側]</span>{' '}
                            スパイ狙い:{' '}
                            {nh.spyTargetId
                              ? players[nh.spyTargetId]?.name
                              : 'なし'}
                            {' ／ '}
                            総務護衛:{' '}
                            {nh.guardTargetId
                              ? players[nh.guardTargetId]?.name
                              : 'なし'}
                            {' ／ '}
                            人事調査:{' '}
                            {nh.divineTargetId
                              ? players[nh.divineTargetId]?.name
                              : 'なし'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== Private Knowledge Panel (HR / GOSSIP / ENGINEER / SPY) ===== */}
        {myself && phase !== 'GAME_OVER' && (
          <PrivateIntelPanel
            role={myself.role}
            myselfId={myself.id}
            players={players}
            divinationResults={divinationResults}
            gossipResults={gossipResults}
          />
        )}

        {/* ===== Public Deduction Summary Board (COs & Reported Verdicts) ===== */}
        {(claims.length > 0 || claimedResults.length > 0) && phase !== 'ROLE_REVEAL' && (
          <div className="border border-[#463b2d] bg-[#181410] p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold tracking-wider text-[#dfb15b]">
                DEDUCTION BOARD // 会議で公開された役職CO・調査報告
              </span>
              <span className="font-mono text-[10px] text-[#8a7d69]">
                ※偽装COの可能性があります
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {claims.map((c) => {
                const claimer = players[c.playerId];
                const reps = claimedResults.filter((r) => r.claimerId === c.playerId);
                return (
                  <div
                    key={`${c.playerId}-${c.role}`}
                    className="border border-[#4a3e2e] bg-[#13100c] px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[#f2e9d8]">
                      <RoleEmblem role={c.role} size={13} />
                      <span>{claimer?.name}</span>
                      <span className="text-[#dfb15b]">
                        = {getRoleName(c.role)}CO
                      </span>
                    </div>
                    {reps.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {reps.map((r, i) => (
                          <span
                            key={i}
                            className={`border px-1.5 py-0.5 text-[10px] font-bold ${
                              r.isSpy
                                ? 'border-[#b23a2a] bg-[#301511] text-[#f5a492]'
                                : 'border-[#35635a] bg-[#142824] text-[#9de0d1]'
                            }`}
                          >
                            {players[r.targetId]?.name}: {r.isSpy ? '黒' : '白'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Employee Roster Grid ===== */}
        <div>
          <div className="mb-2.5 flex items-center justify-between border-b border-[#3b3328] pb-1.5">
            <h3 className="font-mono text-[11px] font-bold tracking-wider text-[#dfb15b]">
              EMPLOYEE ROSTER // 社員証一覧
            </h3>
            <div className="flex items-center gap-3 font-mono text-[11px] text-[#b7a992]">
              <span>在籍 {alivePlayers.length}名</span>
              {phase === 'GAME_OVER' && <span>残存スパイ {aliveSpiesCount}名</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {orderedPlayers.map((p, idx) => (
              <PlayerCard
                key={p.id}
                player={p}
                index={idx}
                isSelf={!p.isAI}
                viewerRole={myself?.role}
                gamePhase={phase}
                winner={winner}
                claim={claims.find((c) => c.playerId === p.id)}
                reportsOnPlayer={claimedResults.filter((r) => r.targetId === p.id)}
                wasExecuted={p.id === lastExecutedId && phase === 'VOTE_RESULT'}
                wasAttacked={p.id === lastAttackedId && phase === 'NIGHT_RESULT'}
              />
            ))}
          </div>
        </div>

        {/* ===== Interactive Action Panel (Speech Deck / Vote / Night Action) ===== */}
        {myself && myself.isAlive && phase !== 'GAME_OVER' && (
          <ActionPanel
            gameState={gameState}
            myself={myself}
            onVote={onVote}
            onNightAction={onNightAction}
            onClaimRole={onClaimRole}
            onClaimResult={onClaimResult}
            onSpeakStance={onSpeakStance}
            onSpeakGeneral={onSpeakGeneral}
          />
        )}

        {/* ===== Phase Skip Bar for DAY_CONVERSATION ===== */}
        {phase === 'DAY_CONVERSATION' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSkip}
              className="min-h-[42px] border border-[#6e3026] bg-[#261411] px-5 py-2 text-xs font-bold text-[#f4a28e] transition hover:border-[#e07054] hover:bg-[#331a16]"
            >
              議論を切り上げて人事査定投票へ進む →
            </button>
          </div>
        )}

        {/* ===== Conference Chat Log ===== */}
        {phase !== 'ROLE_REVEAL' && (
          <div className="overflow-hidden border border-[#463b2d] bg-[#181410]">
            <div className="flex items-center justify-between border-b border-[#332b21] bg-[#201b15] px-4 py-2.5">
              <span className="font-mono text-[10px] font-bold tracking-wider text-[#dfb15b]">
                CONFERENCE MINUTES // 定例会議議事録
              </span>
              <span className="font-mono text-[10px] text-[#8a7d69]">
                発言数 {logs.filter((l) => l.type === 'CHAT').length}件
              </span>
            </div>
            <ChatLog
              logs={logs}
              players={players}
              claims={claims}
              myId={myself?.id}
              pendingCount={phase === 'DAY_CONVERSATION' ? pendingLines.length : 0}
              onFlushNext={phase === 'DAY_CONVERSATION' ? onFlushNext : undefined}
            />
          </div>
        )}

        {/* ===== System & Private Audit Log ===== */}
        <div className="overflow-hidden border border-[#3b3328] bg-[#15120e]">
          <div className="flex items-center justify-between border-b border-[#2e271e] bg-[#1c1813] px-4 py-2">
            <span className="font-mono text-[10px] font-bold tracking-wider text-[#b7a992]">
              SYSTEM LOG // 業務日誌・通知
            </span>
          </div>
          <div className="custom-scrollbar max-h-40 space-y-1.5 overflow-y-auto p-3">
            {logs
              .filter((l) => {
                if (l.type === 'CHAT') return false;
                if (l.type === 'PRIVATE') return l.playerId === myself?.id;
                return true;
              })
              .map((log) => (
                <div
                  key={log.id}
                  className={`border-l-2 px-2.5 py-1 text-xs ${
                    log.type === 'RESULT'
                      ? 'border-[#e07054] bg-[#281512] text-[#f4a28e]'
                      : log.type === 'PRIVATE'
                        ? 'border-[#dfb15b] bg-[#261f14] text-[#f5d98e]'
                        : 'border-[#463b2d] text-[#9e907a]'
                  }`}
                >
                  {log.message}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivateIntelPanel({
  role,
  myselfId,
  players,
  divinationResults,
  gossipResults,
}: {
  role: Role;
  myselfId: string;
  players: GameState['players'];
  divinationResults: GameState['divinationResults'];
  gossipResults: GameState['gossipResults'];
}) {
  const fellowEngineers =
    role === 'ENGINEER'
      ? Object.values(players).filter(
          (p) => p.role === 'ENGINEER' && p.id !== myselfId,
        )
      : [];
  const fellowSpies =
    role === 'SPY'
      ? Object.values(players).filter((p) => p.role === 'SPY' && p.id !== myselfId)
      : [];

  const hasHr = role === 'HR' && divinationResults.length > 0;
  const hasGossip = role === 'GOSSIP' && gossipResults.length > 0;
  const hasEngineer = role === 'ENGINEER' && fellowEngineers.length > 0;
  const hasSpy = role === 'SPY' && fellowSpies.length > 0;

  if (!hasHr && !hasGossip && !hasEngineer && !hasSpy) return null;

  return (
    <div className="border border-[#614e35] bg-[#211b13] p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[#dfb15b]">
          <RoleEmblem role={role} size={15} />
        </span>
        <h3 className="font-mono text-[11px] font-bold tracking-wider text-[#dfb15b]">
          {role === 'HR'
            ? 'CONFIDENTIAL // 人事部・極秘身辺調査ファイル（あなたのみ閲覧可）'
            : role === 'GOSSIP'
              ? 'CONFIDENTIAL // お局様の社内裏情報（あなたのみ閲覧可）'
              : role === 'ENGINEER'
                ? 'CONFIDENTIAL // エンジニア同期ネットワーク'
                : 'CONFIDENTIAL // 産業スパイ連絡網'}
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {role === 'HR' &&
          divinationResults.map((r, i) => (
            <div
              key={i}
              className={`border px-2.5 py-1 text-xs font-bold ${
                r.isSpy
                  ? 'border-[#b23a2a] bg-[#331612] text-[#f5a492]'
                  : 'border-[#35635a] bg-[#142824] text-[#9de0d1]'
              }`}
            >
              {r.dayNumber === 0 ? '初日事前調査' : `${r.dayNumber}日目夜`}:{' '}
              {r.targetName} → {r.isSpy ? '【黒：スパイ】' : '【白：潔白】'}
            </div>
          ))}

        {role === 'GOSSIP' &&
          gossipResults.map((r, i) => (
            <div
              key={i}
              className={`border px-2.5 py-1 text-xs font-bold ${
                r.wasSpy
                  ? 'border-[#b23a2a] bg-[#331612] text-[#f5a492]'
                  : 'border-[#35635a] bg-[#142824] text-[#9de0d1]'
              }`}
            >
              {r.dayNumber}日目解雇: {r.targetName} →{' '}
              {r.wasSpy ? '【黒：スパイだった】' : '【白：スパイではなかった】'}
            </div>
          ))}

        {role === 'ENGINEER' &&
          fellowEngineers.map((p) => (
            <div
              key={p.id}
              className="border border-[#dfb15b] bg-[#2c2214] px-2.5 py-1 text-xs font-bold text-[#f5d98e]"
            >
              味方エンジニア: {p.name} {!p.isAlive ? '(解雇済)' : '(生存)'}
            </div>
          ))}

        {role === 'SPY' &&
          fellowSpies.map((p) => (
            <div
              key={p.id}
              className="border border-[#b23a2a] bg-[#301511] px-2.5 py-1 text-xs font-bold text-[#f5a492]"
            >
              仲間スパイ: {p.name} {!p.isAlive ? '(解雇済)' : '(生存)'}
            </div>
          ))}
      </div>
    </div>
  );
}
