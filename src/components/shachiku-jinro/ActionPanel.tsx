'use client';

import {
  GameState,
  Player,
  Role,
  getRoleName,
} from '@/types/shachiku-jinro';
import { useState, useEffect } from 'react';
import { EmployeePortrait, RoleEmblem } from './AvatarSvg';

interface ActionPanelProps {
  gameState: GameState;
  myself: Player;
  onVote: (targetId: string) => void;
  onNightAction: (targetId: string) => void;
  onClaimRole: (role: Role) => void;
  onClaimResult: (targetId: string, isSpy: boolean, kind: 'DIVINE' | 'MEDIUM') => void;
  onSpeakStance: (targetId: string, kind: 'ACCUSE' | 'TRUST') => void;
  onSpeakGeneral: (kind: 'DEFEND' | 'PROMPT') => void;
}

const CLAIMABLE_ROLES: Role[] = ['HR', 'GOSSIP', 'GA', 'ENGINEER', 'DRONE'];

export default function ActionPanel({
  gameState,
  myself,
  onVote,
  onNightAction,
  onClaimRole,
  onClaimResult,
  onSpeakStance,
  onSpeakGeneral,
}: ActionPanelProps) {
  const {
    phase,
    players,
    votes,
    actions,
    dayCount,
    speechesLeft,
    claims,
    claimedResults,
    divinationResults,
    gossipResults,
  } = gameState;

  const aliveOthers = Object.values(players).filter(
    (p) => p.isAlive && p.id !== myself.id,
  );
  const allOthers = Object.values(players).filter((p) => p.id !== myself.id);

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [speechTab, setSpeechTab] = useState<'STANCE' | 'CLAIM'>('STANCE');
  const [reportTargetId, setReportTargetId] = useState<string>('');
  const [reportIsSpy, setReportIsSpy] = useState<boolean>(false);
  const [reportKind, setReportKind] = useState<'DIVINE' | 'MEDIUM'>('DIVINE');

  useEffect(() => {
    setSelectedTarget(null);
    setConfirmed(false);
  }, [phase, dayCount]);

  useEffect(() => {
    if (!reportTargetId && aliveOthers.length > 0) {
      setReportTargetId(aliveOthers[0].id);
    }
  }, [aliveOthers, reportTargetId]);

  const handleConfirmTargetAction = () => {
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

  // ===== DAY_CONVERSATION: Interactive Discussion Deck =====
  if (phase === 'DAY_CONVERSATION') {
    const myClaim = claims.find((c) => c.playerId === myself.id);
    const unreportedDivs =
      myself.role === 'HR'
        ? divinationResults.filter(
            (r) =>
              !claimedResults.some(
                (cr) =>
                  cr.claimerId === myself.id &&
                  cr.targetId === r.targetId &&
                  cr.kind === 'DIVINE',
              ),
          )
        : [];
    const unreportedGossips =
      myself.role === 'GOSSIP'
        ? gossipResults.filter(
            (r) =>
              !claimedResults.some(
                (cr) =>
                  cr.claimerId === myself.id &&
                  cr.targetId === r.targetId &&
                  cr.kind === 'MEDIUM',
              ),
          )
        : [];

    return (
      <div className="border border-[#463b2d] bg-[#181410]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#332b21] bg-[#201b15] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold tracking-wider text-[#dfb15b]">
              SPEECH DECK // 会議発言コマンド
            </span>
            {myClaim && (
              <span className="border border-[#dfb15b] bg-[#2c2214] px-1.5 py-0.5 text-[10px] font-bold text-[#f5d98e]">
                {getRoleName(myClaim.role)}CO済
              </span>
            )}
          </div>
          <span className="font-mono text-xs font-bold text-[#e4c989]">
            本日の残り発言権: {speechesLeft} 回
          </span>
        </div>

        {/* One-tap shortcut for real HR/GOSSIP unreported results */}
        {speechesLeft > 0 && (unreportedDivs.length > 0 || unreportedGossips.length > 0) && (
          <div className="border-b border-[#3a3022] bg-[#241d13] px-4 py-2.5">
            <p className="mb-1.5 text-[11px] font-bold text-[#dfb15b]">
              未公表の調査結果があります（ワンタップで会議に報告）:
            </p>
            <div className="flex flex-wrap gap-2">
              {unreportedDivs.map((r) => (
                <button
                  key={`div-${r.dayNumber}-${r.targetId}`}
                  type="button"
                  onClick={() => onClaimResult(r.targetId, r.isSpy, 'DIVINE')}
                  className="min-h-[40px] border border-[#dfb15b] bg-[#302515] px-3 py-1.5 text-xs font-bold text-[#f7efe0] transition hover:bg-[#3d2f1a]"
                >
                  人事COして報告: {r.targetName} = {r.isSpy ? '黒(スパイ)' : '白(潔白)'}
                </button>
              ))}
              {unreportedGossips.map((r) => (
                <button
                  key={`gos-${r.dayNumber}-${r.targetId}`}
                  type="button"
                  onClick={() => onClaimResult(r.targetId, r.wasSpy, 'MEDIUM')}
                  className="min-h-[40px] border border-[#dfb15b] bg-[#302515] px-3 py-1.5 text-xs font-bold text-[#f7efe0] transition hover:bg-[#3d2f1a]"
                >
                  お局COして報告: {r.targetName} = {r.wasSpy ? '黒(スパイ)' : '白(潔白)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex border-b border-[#2e271e] bg-[#14110d]">
          <button
            type="button"
            onClick={() => setSpeechTab('STANCE')}
            className={`min-h-[42px] flex-1 px-3 py-2 text-xs font-bold transition ${
              speechTab === 'STANCE'
                ? 'border-b-2 border-[#dfb15b] bg-[#1d1812] text-[#f2e9d8]'
                : 'text-[#8a7d69] hover:text-[#cbbd9f]'
            }`}
          >
            社員への追及・信頼・弁明
          </button>
          <button
            type="button"
            onClick={() => setSpeechTab('CLAIM')}
            className={`min-h-[42px] flex-1 px-3 py-2 text-xs font-bold transition ${
              speechTab === 'CLAIM'
                ? 'border-b-2 border-[#dfb15b] bg-[#1d1812] text-[#f2e9d8]'
                : 'text-[#8a7d69] hover:text-[#cbbd9f]'
            }`}
          >
            役職CO・調査結果の発表（ブラフ可）
          </button>
        </div>

        <div className="p-4">
          {speechesLeft <= 0 ? (
            <p className="py-2 text-center text-xs text-[#9e907a]">
              本日の発言回数を使い切りました。議論を見守るか「投票へ進む」を押してください。
            </p>
          ) : speechTab === 'STANCE' ? (
            <div className="space-y-3">
              <p className="text-xs text-[#b7a992]">
                気になる社員を選んで「疑う」または「信じる」と発言すると、AI社員たちが反応し投票判断にも影響します。
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {aliveOthers.map((p) => {
                  const isSel = selectedTarget === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedTarget(p.id)}
                      className={`flex min-h-[44px] items-center gap-2 border px-2.5 py-1.5 text-left text-xs font-bold transition ${
                        isSel
                          ? 'border-[#dfb15b] bg-[#2b2216] text-[#f2e9d8]'
                          : 'border-[#383025] bg-[#14110d] text-[#b7a992] hover:border-[#5a4b38]'
                      }`}
                    >
                      <EmployeePortrait personaIndex={p.personaIndex} size={28} />
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={!selectedTarget}
                  onClick={() => selectedTarget && onSpeakStance(selectedTarget, 'ACCUSE')}
                  className="min-h-[44px] border border-[#b23a2a] bg-[#2e1612] px-3 py-2 text-xs font-bold text-[#f5a492] transition hover:bg-[#3d1c17] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  選択した社員を「疑う」
                </button>
                <button
                  type="button"
                  disabled={!selectedTarget}
                  onClick={() => selectedTarget && onSpeakStance(selectedTarget, 'TRUST')}
                  className="min-h-[44px] border border-[#35635a] bg-[#152925] px-3 py-2 text-xs font-bold text-[#9de0d1] transition hover:bg-[#1c3631] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  選択した社員を「信じる」
                </button>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-[#2e271e] pt-3">
                <button
                  type="button"
                  onClick={() => onSpeakGeneral('DEFEND')}
                  className="min-h-[40px] flex-1 border border-[#4a3e2e] bg-[#1d1812] px-3 py-1.5 text-xs font-bold text-[#d8cbb5] transition hover:border-[#dfb15b] hover:text-[#f2e9d8]"
                >
                  自分の潔白を主張する
                </button>
                <button
                  type="button"
                  onClick={() => onSpeakGeneral('PROMPT')}
                  className="min-h-[40px] flex-1 border border-[#4a3e2e] bg-[#1d1812] px-3 py-1.5 text-xs font-bold text-[#d8cbb5] transition hover:border-[#dfb15b] hover:text-[#f2e9d8]"
                >
                  役職者のCO・情報開示を促す
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs text-[#b7a992]">
                  役職を名乗り出る（CO）：あなたの本当の役職は「
                  <span className="font-bold text-[#dfb15b]">{getRoleName(myself.role)}</span>
                  」ですが、スパイやイエスマンの場合は嘘の役職を騙ることも可能です。
                </p>
                <div className="flex flex-wrap gap-2">
                  {CLAIMABLE_ROLES.map((r) => {
                    const isReal = myself.role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onClaimRole(r)}
                        className={`inline-flex min-h-[42px] items-center gap-1.5 border px-3 py-1.5 text-xs font-bold transition ${
                          isReal
                            ? 'border-[#dfb15b] bg-[#2c2214] text-[#f5d98e] hover:bg-[#382b19]'
                            : 'border-[#463b2d] bg-[#15120e] text-[#b7a992] hover:border-[#6e5c45] hover:text-[#f2e9d8]'
                        }`}
                      >
                        <RoleEmblem role={r} size={14} />
                        <span>{getRoleName(r)}CO</span>
                        {isReal && (
                          <span className="font-mono text-[9px] text-[#dfb15b]">[真]</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#2e271e] pt-3">
                <p className="mb-2 text-xs font-bold text-[#cbbd9f]">
                  調査結果の報告（人事部 / お局様として白黒を発表）
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="報告対象の社員"
                    value={reportTargetId}
                    onChange={(e) => setReportTargetId(e.target.value)}
                    className="min-h-[42px] border border-[#463b2d] bg-[#12100d] px-2.5 py-1.5 text-xs font-bold text-[#f2e9d8]"
                  >
                    {allOthers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {!p.isAlive ? '(解雇済)' : ''}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="報告種別"
                    value={reportKind}
                    onChange={(e) => setReportKind(e.target.value as 'DIVINE' | 'MEDIUM')}
                    className="min-h-[42px] border border-[#463b2d] bg-[#12100d] px-2.5 py-1.5 text-xs font-bold text-[#f2e9d8]"
                  >
                    <option value="DIVINE">人事調査として</option>
                    <option value="MEDIUM">お局情報として</option>
                  </select>

                  <select
                    aria-label="白黒判定"
                    value={reportIsSpy ? 'BLACK' : 'WHITE'}
                    onChange={(e) => setReportIsSpy(e.target.value === 'BLACK')}
                    className="min-h-[42px] border border-[#463b2d] bg-[#12100d] px-2.5 py-1.5 text-xs font-bold text-[#f2e9d8]"
                  >
                    <option value="WHITE">白（潔白）と報告</option>
                    <option value="BLACK">黒（スパイ）と報告</option>
                  </select>

                  <button
                    type="button"
                    disabled={!reportTargetId}
                    onClick={() =>
                      reportTargetId && onClaimResult(reportTargetId, reportIsSpy, reportKind)
                    }
                    className="min-h-[42px] border border-[#dfb15b] bg-[#2e2416] px-3.5 py-1.5 text-xs font-bold text-[#f5d98e] transition hover:bg-[#3b2e1c] disabled:opacity-40"
                  >
                    この内容で報告する
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== DAY_VOTE: HR Dismissal Ballot =====
  if (phase === 'DAY_VOTE') {
    const hasVoted = Boolean(votes[myself.id] || confirmed);

    if (hasVoted) {
      const votedTarget = players[votes[myself.id]];
      return (
        <div className="border border-[#5a4b38] bg-[#1d1812] p-5 text-center">
          <p className="font-mono text-xs font-bold text-[#dfb15b]">
            BALLOT SUBMITTED // 査定票提出完了
          </p>
          <p className="mt-1 text-sm text-[#e6dac4]">
            {votedTarget ? `${votedTarget.name} への解雇票を投じました。` : '解雇票を提出しました。'}
            開票結果をお待ちください...
          </p>
        </div>
      );
    }

    return (
      <div className="border border-[#6e3026] bg-[#1b1311] p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#47221c] pb-2.5">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-widest text-[#e07054]">
              DISMISSAL VOTE // 人事査定・懲戒解雇投票
            </p>
            <h3 className="mt-0.5 text-base font-bold text-[#f6efe2]">
              本日解雇する社員を1名指名してください
            </h3>
          </div>
          <span className="border border-[#7c2d23] bg-[#2c1410] px-2 py-0.5 font-mono text-[10px] font-bold text-[#f4a28e]">
            要決裁
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {aliveOthers.map((p) => {
            const isSel = selectedTarget === p.id;
            const pClaim = claims.find((c) => c.playerId === p.id);
            const blackRep = claimedResults.some(
              (r) => r.targetId === p.id && r.isSpy,
            );
            const whiteRep =
              !blackRep &&
              claimedResults.some((r) => r.targetId === p.id && !r.isSpy);

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedTarget(p.id)}
                className={`flex min-h-[56px] items-center justify-between border p-2.5 text-left transition ${
                  isSel
                    ? 'border-[#e07054] bg-[#331814] text-[#f7efe0] shadow-[2px_2px_0_#e07054]'
                    : 'border-[#3e3129] bg-[#14100e] text-[#cbbd9f] hover:border-[#6e453b]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <EmployeePortrait personaIndex={p.personaIndex} size={38} />
                  <div>
                    <p className="text-sm font-bold text-[#f2e9d8]">{p.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {pClaim && (
                        <span className="border border-[#5a472a] bg-[#251d12] px-1 py-0.2 text-[9px] font-bold text-[#dfb15b]">
                          {getRoleName(pClaim.role)}CO
                        </span>
                      )}
                      {blackRep && (
                        <span className="border border-[#b23a2a] bg-[#361612] px-1 py-0.2 text-[9px] font-bold text-[#f7a492]">
                          黒報告あり
                        </span>
                      )}
                      {whiteRep && (
                        <span className="border border-[#35635a] bg-[#152925] px-1 py-0.2 text-[9px] font-bold text-[#9de0d1]">
                          白報告あり
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={`border px-2 py-1 font-mono text-[10px] font-bold ${
                    isSel
                      ? 'border-[#e07054] bg-[#b23a2a] text-white'
                      : 'border-[#3b3328] text-[#8a7d69]'
                  }`}
                >
                  {isSel ? '選択中' : '指名'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleConfirmTargetAction}
          disabled={!selectedTarget}
          className="mt-4 min-h-[48px] w-full border border-[#f2e9d8] bg-[#b23a2a] py-3 text-sm font-black tracking-wider text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#f2e9d8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          解雇稟議書に捺印する（投票確定）
        </button>
      </div>
    );
  }

  // ===== NIGHT_ACTION: Overtime Terminal =====
  if (phase === 'NIGHT_ACTION') {
    const role = myself.role;
    const hasActed = Boolean(actions[myself.id] || confirmed);

    if (!['SPY', 'HR', 'GA'].includes(role)) {
      return (
        <div className="border border-[#333b48] bg-[#10141b] p-5 text-center">
          <p className="font-mono text-xs font-bold text-[#8ca2c0]">
            OFF-DUTY // 深夜残業なし
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#94a3b8]">
            あなたの役職（{getRoleName(role)}）は深夜の特殊行動がありません。翌朝の出社時刻をお待ちください。
          </p>
        </div>
      );
    }

    if (hasActed) {
      return (
        <div className="border border-[#333b48] bg-[#10141b] p-5 text-center">
          <p className="font-mono text-xs font-bold text-[#dfb15b]">
            NIGHT COMMAND ACCEPTED // 指示完了
          </p>
          <p className="mt-1 text-xs text-[#94a3b8]">
            深夜の極秘オペレーションを実行中です。結果は翌朝判明します。
          </p>
        </div>
      );
    }

    const actionInfo = getNightActionInfo(role);
    const examinedIds = new Set(divinationResults.map((r) => r.targetId));

    return (
      <div className="border border-[#3a4659] bg-[#11161f] p-4 sm:p-5">
        <div className="border-b border-[#263040] pb-2.5">
          <p className="font-mono text-[10px] font-bold tracking-widest text-[#dfb15b]">
            {`MIDNIGHT OPERATION / ${actionInfo.code}`}
          </p>
          <h3 className="mt-0.5 text-base font-bold text-[#f2e9d8]">
            {actionInfo.title}
          </h3>
          <p className="mt-0.5 text-xs text-[#94a3b8]">{actionInfo.description}</p>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {aliveOthers.map((p) => {
            const isSel = selectedTarget === p.id;
            const alreadyDivined = role === 'HR' && examinedIds.has(p.id);
            const isFellowSpy = role === 'SPY' && p.role === 'SPY';

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedTarget(p.id)}
                className={`flex min-h-[54px] items-center justify-between border p-2.5 text-left transition ${
                  isSel
                    ? 'border-[#dfb15b] bg-[#252b38] text-[#f7efe0] shadow-[2px_2px_0_#dfb15b]'
                    : 'border-[#283242] bg-[#0d1118] text-[#cbd5e1] hover:border-[#4b5b73]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <EmployeePortrait personaIndex={p.personaIndex} size={36} />
                  <div>
                    <p className="text-sm font-bold text-[#f2e9d8]">{p.name}</p>
                    {alreadyDivined && (
                      <span className="font-mono text-[9px] text-[#8ca2c0]">
                        [調査済]
                      </span>
                    )}
                    {isFellowSpy && (
                      <span className="font-mono text-[9px] text-[#e07054]">
                        [仲間スパイ]
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold text-[#dfb15b]">
                  {isSel ? '選択中' : '対象'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleConfirmTargetAction}
          disabled={!selectedTarget}
          className="mt-4 min-h-[48px] w-full border border-[#f2e9d8] bg-[#b23a2a] py-3 text-sm font-black tracking-wider text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {actionInfo.buttonText}
        </button>
      </div>
    );
  }

  return null;
}

function getNightActionInfo(role: Role) {
  switch (role) {
    case 'SPY':
      return {
        code: 'SABOTAGE',
        title: '深夜の解雇工作（襲撃）',
        description: '今夜、会社から排除する社員を1名選んでください。',
        buttonText: '襲撃工作を実行する',
      };
    case 'HR':
      return {
        code: 'BACKGROUND CHECK',
        title: '極秘人事ファイル照会（占い）',
        description: '経歴を調査し、産業スパイかどうか暴く社員を1名選んでください。',
        buttonText: '人事調査を実行する',
      };
    case 'GA':
      return {
        code: 'SECURITY ESCORT',
        title: '総務部の特別警護（騎士）',
        description: '今夜スパイの襲撃から守る社員を1名選んでください（自分以外）。',
        buttonText: '警護対象を確定する',
      };
    default:
      return {
        code: 'ACTION',
        title: '深夜アクション',
        description: '',
        buttonText: '実行する',
      };
  }
}
