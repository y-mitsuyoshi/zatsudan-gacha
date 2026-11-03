import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GameState,
  Player,
  Role,
  Phase,
  WinnerType,
  GameLog,
  DivinationResult,
  GossipResult,
  Claim,
  ClaimedResult,
  Stance,
  VoteRecord,
  NightRecord,
  PendingLine,
  Tone,
  AI_PERSONAS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  personaDisplayName,
  getRoleName,
  getRoleComposition,
} from '@/types/shachiku-jinro';
import { say } from './dialogue';
import { playJinroSe } from './sound';

// ===== Utility Helpers =====

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

let seqId = 0;
function genId(): string {
  seqId += 1;
  return `${Date.now()}-${seqId}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeLog(
  type: GameLog['type'],
  message: string,
  opts: {
    playerId?: string;
    tag?: GameLog['tag'];
    targetId?: string;
    day?: number;
  } = {},
): GameLog {
  return {
    id: genId(),
    type,
    message,
    timestamp: Date.now(),
    playerId: opts.playerId,
    tag: opts.tag,
    targetId: opts.targetId,
    day: opts.day,
  };
}

export function getPlayerTone(player: Player): Tone {
  if (player.personaIndex >= 0 && player.personaIndex < AI_PERSONAS.length) {
    return AI_PERSONAS[player.personaIndex].tone;
  }
  return 'polite';
}

export function checkWinCondition(players: Record<string, Player>): WinnerType {
  const alive = Object.values(players).filter((p) => p.isAlive);
  const spies = alive.filter((p) => p.role === 'SPY');
  const others = alive.filter((p) => p.role !== 'SPY');
  const consultantAlive = alive.some((p) => p.role === 'CONSULTANT');

  if (spies.length === 0) {
    if (consultantAlive) return 'CONSULTANT';
    return 'COMPANY';
  }
  if (spies.length >= others.length) {
    if (consultantAlive) return 'CONSULTANT';
    return 'SPIES';
  }
  return null;
}

export const CONVERSATION_DURATION = 45;
export const VOTE_DURATION = 60;
export const NIGHT_DURATION = 30;
export const REVEAL_DURATION = 5;
const FAST_FORWARD_DURATION = 4;

export function getMaxTimeForPhase(phase: Phase): number {
  switch (phase) {
    case 'DAY_CONVERSATION':
      return CONVERSATION_DURATION;
    case 'DAY_VOTE':
      return VOTE_DURATION;
    case 'NIGHT_ACTION':
      return NIGHT_DURATION;
    case 'ROLE_REVEAL':
    case 'VOTE_RESULT':
    case 'NIGHT_RESULT':
      return REVEAL_DURATION;
    default:
      return 60;
  }
}

// ===== Deduction & AI Brain =====

/**
 * 観察者 `observer` から見た対象 `target` の怪しさスコアを計算する。
 * 値が高いほど「スパイらしい（投票したい）」と判断する。
 */
export function computeSuspicion(
  state: GameState,
  observer: Player,
  target: Player,
): number {
  if (observer.id === target.id) return -100;
  let score = state.gut[observer.id]?.[target.id] ?? 0;

  // 1. 観察者自身の確定知識
  if (observer.role === 'HR') {
    const myRes = state.divinationResults.find((r) => r.targetId === target.id);
    if (myRes) {
      return myRes.isSpy ? 10 : -8;
    }
  }
  if (observer.role === 'ENGINEER' && target.role === 'ENGINEER') {
    return -10;
  }
  if (observer.role === 'SPY' && target.role === 'SPY') {
    // 仲間スパイには原則投票しないが、全員から黒出しされて絶体絶命ならライン切りもあり得る
    return -5;
  }

  // 2. 自分の固有役職を騙っている相手は偽物確定 (スパイ or イエスマン)
  const uniqueRoles: Role[] = ['HR', 'GOSSIP', 'GA'];
  if (uniqueRoles.includes(observer.role)) {
    const fakeClaim = state.claims.find(
      (c) => c.playerId === target.id && c.role === observer.role,
    );
    if (fakeClaim) {
      score += 4.5;
    }
  }
  if (observer.role === 'ENGINEER') {
    const fakeEng = state.claims.find(
      (c) => c.playerId === target.id && c.role === 'ENGINEER',
    );
    if (fakeEng && target.role !== 'ENGINEER') {
      score += 5.0;
    }
  }

  // 3. 公開されている人事調査 (DIVINE) の評価
  const hrClaims = state.claims.filter((c) => c.role === 'HR');
  const divReportsOnTarget = state.claimedResults.filter(
    (r) => r.kind === 'DIVINE' && r.targetId === target.id,
  );
  for (const rep of divReportsOnTarget) {
    // 自分が本物HRなら他人のHR報告は偽物
    if (observer.role === 'HR' && rep.claimerId !== observer.id) continue;
    // 報告者が夜に襲撃された場合は真HRの可能性が高い
    const claimer = state.players[rep.claimerId];
    const claimerAttacked = claimer?.deathCause === 'ATTACKED';
    const weight = hrClaims.length <= 1 ? 3.2 : claimerAttacked ? 2.8 : 1.5;
    score += rep.isSpy ? weight : -weight * 0.85;
  }

  // 4. 役職CO自体の信頼度
  const targetClaim = state.claims.find((c) => c.playerId === target.id);
  if (targetClaim) {
    if (targetClaim.role === 'ENGINEER') {
      score -= 1.8;
    } else if (targetClaim.role === 'HR') {
      // 単独HRは吊り回避、対抗がいる場合は少し様子見しつつ怪しむ
      score += hrClaims.length === 1 ? -2.2 : 0.4;
    } else if (targetClaim.role === 'GOSSIP') {
      const gossipClaims = state.claims.filter((c) => c.role === 'GOSSIP');
      score += gossipClaims.length === 1 ? -1.4 : 0.6;
    } else if (targetClaim.role === 'GA') {
      score -= 0.8;
    }
  }

  // 5. 偽報告の矛盾チェック (自分が白なのに黒出ししてきた相手は偽物確定)
  const falseBlackOnMe = state.claimedResults.find(
    (r) =>
      r.claimerId === target.id &&
      r.targetId === observer.id &&
      r.isSpy &&
      observer.role !== 'SPY',
  );
  if (falseBlackOnMe) {
    score += 5.5;
  }

  // 6. 議論スタンスによる印象補正
  for (const st of state.stances) {
    if (st.fromId === target.id && st.toId === observer.id) {
      if (st.kind === 'ACCUSE') score += 0.55;
      if (st.kind === 'TRUST') score -= 0.4;
    }
  }

  // 7. 過去の投票履歴: 解雇された白社員に投票していた人は少し怪しい
  for (const vr of state.voteHistory) {
    const votedId = vr.votes[target.id];
    if (!votedId) continue;
    const mediumRep = state.claimedResults.find(
      (r) => r.kind === 'MEDIUM' && r.targetId === votedId,
    );
    if (mediumRep && !mediumRep.isSpy) {
      score += 0.35;
    } else if (mediumRep && mediumRep.isSpy) {
      score -= 0.45;
    }
  }

  return score;
}

/**
 * 1日の開始時にAI社員たちの発言キュー (`PendingLine[]`) を組み立てる。
 */
export function planDayLines(
  state: GameState,
  rng: () => number = Math.random,
): PendingLine[] {
  const lines: PendingLine[] = [];
  const aliveAIs = state.order
    .map((id) => state.players[id])
    .filter((p): p is Player => Boolean(p && p.isAI && p.isAlive));
  const aliveAll = state.order
    .map((id) => state.players[id])
    .filter((p): p is Player => Boolean(p && p.isAlive));

  if (aliveAIs.length === 0) return lines;

  // 模擬的に「この日の会話中にすでに計画されたCO・結果」を追跡して対抗反応を作る
  const plannedClaims: Claim[] = [...state.claims];
  const plannedResults: ClaimedResult[] = [...state.claimedResults];
  const plannedStances: Stance[] = [...state.stances];

  const hasClaimed = (playerId: string, role?: Role) =>
    plannedClaims.some((c) => c.playerId === playerId && (!role || c.role === role));
  const hasReported = (claimerId: string, targetId: string, kind: 'DIVINE' | 'MEDIUM') =>
    plannedResults.some(
      (r) => r.claimerId === claimerId && r.targetId === targetId && r.kind === kind,
    );

  // 1. 朝の第一声 (犠牲者への追悼 / 平和な朝 / 1日目の雑談)
  if (state.dayCount === 1) {
    const opener = pickRandom(aliveAIs, rng);
    lines.push({
      playerId: opener.id,
      message: say(getPlayerTone(opener), 'chatter', rng),
      tag: 'CHATTER',
    });
  } else if (state.lastNight) {
    const reactor = pickRandom(aliveAIs, rng);
    if (state.lastNight.attackedId && state.lastNight.attackedName) {
      lines.push({
        playerId: reactor.id,
        message: say(getPlayerTone(reactor), 'mourn', rng, {
          t: state.lastNight.attackedName,
        }),
        tag: 'CHATTER',
        targetId: state.lastNight.attackedId,
      });
    } else if (state.lastNight.peaceful) {
      lines.push({
        playerId: reactor.id,
        message: say(getPlayerTone(reactor), 'peaceful', rng),
        tag: 'CHATTER',
      });
    }
  }

  // 2. 本物の人事部 (HR) のCOと調査結果報告
  for (const ai of aliveAIs) {
    if (ai.role !== 'HR') continue;
    const tone = getPlayerTone(ai);
    const otherHr = plannedClaims.find((c) => c.role === 'HR' && c.playerId !== ai.id);
    if (!hasClaimed(ai.id, 'HR')) {
      if (otherHr) {
        const fakeName = state.players[otherHr.playerId]?.name ?? '誰か';
        lines.push({
          playerId: ai.id,
          message: say(tone, 'counterHR', rng, { t: fakeName }),
          tag: 'CLAIM',
          targetId: otherHr.playerId,
          claim: 'HR',
        });
      } else {
        lines.push({
          playerId: ai.id,
          message: say(tone, 'claimHR', rng),
          tag: 'CLAIM',
          claim: 'HR',
        });
      }
      plannedClaims.push({ playerId: ai.id, role: 'HR', day: state.dayCount });
    }

    for (const res of state.divinationResults) {
      if (hasReported(ai.id, res.targetId, 'DIVINE')) continue;
      lines.push({
        playerId: ai.id,
        message: say(tone, res.isSpy ? 'reportBlack' : 'reportWhite', rng, {
          t: res.targetName,
        }),
        tag: 'REPORT',
        targetId: res.targetId,
        result: { targetId: res.targetId, isSpy: res.isSpy, kind: 'DIVINE' },
      });
      plannedResults.push({
        claimerId: ai.id,
        targetId: res.targetId,
        isSpy: res.isSpy,
        day: state.dayCount,
        kind: 'DIVINE',
      });
    }
  }

  // 3. スパイ・イエスマンの偽CO (ブラフ計画があるAI)
  for (const ai of aliveAIs) {
    const bluff = state.bluffs[ai.id];
    if (!bluff || state.dayCount < bluff.day) continue;
    const tone = getPlayerTone(ai);

    if (bluff.role === 'HR') {
      const existingHr = plannedClaims.find(
        (c) => c.role === 'HR' && c.playerId !== ai.id,
      );
      if (!hasClaimed(ai.id, 'HR')) {
        if (existingHr) {
          const otherName = state.players[existingHr.playerId]?.name ?? '';
          lines.push({
            playerId: ai.id,
            message: say(tone, 'counterHR', rng, { t: otherName }),
            tag: 'CLAIM',
            targetId: existingHr.playerId,
            claim: 'HR',
          });
        } else {
          lines.push({
            playerId: ai.id,
            message: say(tone, 'claimHR', rng),
            tag: 'CLAIM',
            claim: 'HR',
          });
        }
        plannedClaims.push({ playerId: ai.id, role: 'HR', day: state.dayCount });

        // 本物HRがまだ対抗発言をしていなければ割り込み対抗を入れる
        const realHr = aliveAIs.find((p) => p.role === 'HR' && p.id !== ai.id);
        if (realHr && hasClaimed(realHr.id, 'HR')) {
          lines.push({
            playerId: realHr.id,
            message: say(getPlayerTone(realHr), 'counterHR', rng, { t: ai.name }),
            tag: 'ACCUSE',
            targetId: ai.id,
            stance: 'ACCUSE',
          });
        }
      }

      // 偽の調査結果を1件出す
      const alreadyDivinedIds = new Set(
        plannedResults
          .filter((r) => r.claimerId === ai.id && r.kind === 'DIVINE')
          .map((r) => r.targetId),
      );
      const candidates = aliveAll.filter(
        (p) => p.id !== ai.id && !alreadyDivinedIds.has(p.id),
      );
      if (candidates.length > 0) {
        // スパイが偽HRなら非スパイに黒を塗るか仲間に白を出す
        const nonSpyTargets = candidates.filter(
          (p) => !(ai.role === 'SPY' && p.role === 'SPY'),
        );
        const target = pickRandom(
          nonSpyTargets.length > 0 ? nonSpyTargets : candidates,
          rng,
        );
        const fakeBlack =
          target.role !== 'SPY' && (state.dayCount >= 2 || rng() < 0.45);
        lines.push({
          playerId: ai.id,
          message: say(tone, fakeBlack ? 'reportBlack' : 'reportWhite', rng, {
            t: target.name,
          }),
          tag: 'REPORT',
          targetId: target.id,
          result: { targetId: target.id, isSpy: fakeBlack, kind: 'DIVINE' },
        });
        plannedResults.push({
          claimerId: ai.id,
          targetId: target.id,
          isSpy: fakeBlack,
          day: state.dayCount,
          kind: 'DIVINE',
        });
      }
    } else if (bluff.role === 'GOSSIP' && state.dayCount >= 2 && state.lastExecutedId) {
      if (!hasClaimed(ai.id, 'GOSSIP')) {
        lines.push({
          playerId: ai.id,
          message: say(tone, 'claimGossip', rng),
          tag: 'CLAIM',
          claim: 'GOSSIP',
        });
        plannedClaims.push({ playerId: ai.id, role: 'GOSSIP', day: state.dayCount });
      }
      const execPlayer = state.players[state.lastExecutedId];
      if (execPlayer && !hasReported(ai.id, execPlayer.id, 'MEDIUM')) {
        const fakeWasSpy = execPlayer.role !== 'SPY';
        lines.push({
          playerId: ai.id,
          message: say(tone, fakeWasSpy ? 'mediumBlack' : 'mediumWhite', rng, {
            t: execPlayer.name,
          }),
          tag: 'REPORT',
          targetId: execPlayer.id,
          result: { targetId: execPlayer.id, isSpy: fakeWasSpy, kind: 'MEDIUM' },
        });
        plannedResults.push({
          claimerId: ai.id,
          targetId: execPlayer.id,
          isSpy: fakeWasSpy,
          day: state.dayCount,
          kind: 'MEDIUM',
        });
      }
    }
  }

  // 4. 本物のお局様 (GOSSIP) の霊媒報告 (2日目以降で解雇結果があるとき)
  for (const ai of aliveAIs) {
    if (ai.role !== 'GOSSIP' || state.gossipResults.length === 0) continue;
    const tone = getPlayerTone(ai);
    if (!hasClaimed(ai.id, 'GOSSIP')) {
      lines.push({
        playerId: ai.id,
        message: say(tone, 'claimGossip', rng),
        tag: 'CLAIM',
        claim: 'GOSSIP',
      });
      plannedClaims.push({ playerId: ai.id, role: 'GOSSIP', day: state.dayCount });
    }
    for (const gr of state.gossipResults) {
      if (hasReported(ai.id, gr.targetId, 'MEDIUM')) continue;
      lines.push({
        playerId: ai.id,
        message: say(tone, gr.wasSpy ? 'mediumBlack' : 'mediumWhite', rng, {
          t: gr.targetName,
        }),
        tag: 'REPORT',
        targetId: gr.targetId,
        result: { targetId: gr.targetId, isSpy: gr.wasSpy, kind: 'MEDIUM' },
      });
      plannedResults.push({
        claimerId: ai.id,
        targetId: gr.targetId,
        isSpy: gr.wasSpy,
        day: state.dayCount,
        kind: 'MEDIUM',
      });
    }
  }

  // 5. エンジニア (共有者) のペアCO
  for (const ai of aliveAIs) {
    if (ai.role !== 'ENGINEER') continue;
    const anyEngineerClaimed = plannedClaims.some((c) => c.role === 'ENGINEER');
    if (!anyEngineerClaimed && (state.dayCount >= 2 || rng() < 0.65)) {
      const partner = Object.values(state.players).find(
        (p) => p.role === 'ENGINEER' && p.id !== ai.id,
      );
      if (partner) {
        lines.push({
          playerId: ai.id,
          message: say(getPlayerTone(ai), 'claimEngineer', rng, { p: partner.name }),
          tag: 'CLAIM',
          targetId: partner.id,
          claim: 'ENGINEER',
        });
        plannedClaims.push({ playerId: ai.id, role: 'ENGINEER', day: state.dayCount });
      }
    }
  }

  // 6. 黒出しされたAIの反論 (denyBlack)
  const blackTargetsToday = plannedResults.filter(
    (r) => r.kind === 'DIVINE' && r.isSpy && r.day === state.dayCount,
  );
  for (const rep of blackTargetsToday) {
    const accused = state.players[rep.targetId];
    if (accused && accused.isAI && accused.isAlive) {
      lines.push({
        playerId: accused.id,
        message: say(getPlayerTone(accused), 'denyBlack', rng, {
          t: state.players[rep.claimerId]?.name ?? '',
        }),
        tag: 'DEFEND',
        targetId: rep.claimerId,
        stance: 'ACCUSE',
      });
      plannedStances.push({
        fromId: accused.id,
        toId: rep.claimerId,
        kind: 'ACCUSE',
        day: state.dayCount,
      });
    }
  }

  // 7. 各AIの推理発言 (疑い・信用・投票宣言)
  const virtualState: GameState = {
    ...state,
    claims: plannedClaims,
    claimedResults: plannedResults,
    stances: plannedStances,
  };

  for (const ai of shuffle(aliveAIs, rng)) {
    const others = aliveAll.filter((p) => p.id !== ai.id);
    if (others.length === 0) continue;
    const tone = getPlayerTone(ai);

    const ranked = [...others]
      .map((t) => ({ player: t, score: computeSuspicion(virtualState, ai, t) }))
      .sort((a, b) => b.score - a.score);

    const topSuspect = ranked[0];
    const mostTrusted = ranked[ranked.length - 1];

    // すでに黒判定が出ている相手がいれば黒追及、複数のCOがあれば偽物追及、それ以外は直感/投票追及
    const blackReported = plannedResults.some(
      (r) => r.kind === 'DIVINE' && r.targetId === topSuspect.player.id && r.isSpy,
    );
    const hasCounterClaim =
      plannedClaims.some((c) => c.playerId === topSuspect.player.id && c.role === 'HR') &&
      plannedClaims.filter((c) => c.role === 'HR').length >= 2;

    if (blackReported && topSuspect.score >= 1.2) {
      lines.push({
        playerId: ai.id,
        message: say(tone, 'accuseBlack', rng, { t: topSuspect.player.name }),
        tag: 'ACCUSE',
        targetId: topSuspect.player.id,
        stance: 'ACCUSE',
      });
    } else if (hasCounterClaim && topSuspect.score >= 0.3) {
      lines.push({
        playerId: ai.id,
        message: say(tone, 'accuseFake', rng, { t: topSuspect.player.name }),
        tag: 'ACCUSE',
        targetId: topSuspect.player.id,
        stance: 'ACCUSE',
      });
    } else if (state.dayCount >= 2 && rng() < 0.35) {
      lines.push({
        playerId: ai.id,
        message: say(tone, 'accuseVote', rng, { t: topSuspect.player.name }),
        tag: 'ACCUSE',
        targetId: topSuspect.player.id,
        stance: 'ACCUSE',
      });
    } else {
      lines.push({
        playerId: ai.id,
        message: say(tone, 'accuseGut', rng, { t: topSuspect.player.name }),
        tag: 'ACCUSE',
        targetId: topSuspect.player.id,
        stance: 'ACCUSE',
      });
    }

    plannedStances.push({
      fromId: ai.id,
      toId: topSuspect.player.id,
      kind: 'ACCUSE',
      day: state.dayCount,
    });

    // 白確定や高信頼の相手がいれば一定の確率でフォロー発言
    if (mostTrusted && mostTrusted.score <= -1.5 && rng() < 0.45) {
      const whiteReported = plannedResults.some(
        (r) => r.kind === 'DIVINE' && r.targetId === mostTrusted.player.id && !r.isSpy,
      );
      lines.push({
        playerId: ai.id,
        message: say(tone, whiteReported ? 'trustWhite' : 'trustGut', rng, {
          t: mostTrusted.player.name,
        }),
        tag: 'TRUST',
        targetId: mostTrusted.player.id,
        stance: 'TRUST',
      });
    }
  }

  // 8. 疑われたAIの弁明・反論 + 終盤の投票宣言
  const accusedCounts: Record<string, string[]> = {};
  for (const st of plannedStances.filter((s) => s.day === state.dayCount && s.kind === 'ACCUSE')) {
    if (!accusedCounts[st.toId]) accusedCounts[st.toId] = [];
    accusedCounts[st.toId].push(st.fromId);
  }
  for (const [targetId, accuserIds] of Object.entries(accusedCounts)) {
    const target = state.players[targetId];
    if (!target || !target.isAI || !target.isAlive) continue;
    const tone = getPlayerTone(target);
    if (target.role === 'GA' && accuserIds.length >= 2 && !hasClaimed(target.id, 'GA')) {
      lines.push({
        playerId: target.id,
        message: say(tone, 'claimGA', rng),
        tag: 'CLAIM',
        claim: 'GA',
      });
    } else {
      const accuser = state.players[accuserIds[0]];
      if (accuser && rng() < 0.6) {
        lines.push({
          playerId: target.id,
          message: say(tone, 'deflect', rng, { t: accuser.name }),
          tag: 'DEFEND',
          targetId: accuser.id,
          stance: 'ACCUSE',
        });
      } else {
        lines.push({
          playerId: target.id,
          message: say(tone, 'defend', rng),
          tag: 'DEFEND',
        });
      }
    }
  }

  // 投票宣言 (2〜3人)
  for (const ai of shuffle(aliveAIs, rng).slice(0, 3)) {
    const others = aliveAll.filter((p) => p.id !== ai.id);
    if (others.length === 0) continue;
    const best = [...others].sort(
      (a, b) => computeSuspicion(virtualState, ai, b) - computeSuspicion(virtualState, ai, a),
    )[0];
    if (best) {
      lines.push({
        playerId: ai.id,
        message: say(getPlayerTone(ai), 'voteIntent', rng, { t: best.name }),
        tag: 'ACCUSE',
        targetId: best.id,
      });
    }
  }

  return lines.slice(0, 16);
}

/**
 * AI社員の投票先を推理スコアに基づいて決定する。
 */
export function chooseAiVote(
  state: GameState,
  voter: Player,
  candidates: Player[],
  rng: () => number = Math.random,
): string {
  const valid = candidates.filter((c) => c.id !== voter.id && c.isAlive);
  if (valid.length === 0) return voter.id;

  const scored = valid.map((c) => {
    let s = computeSuspicion(state, voter, c);
    // 今日自分がACCUSEした相手には一貫して投票しやすい
    const accusedToday = state.stances.some(
      (st) =>
        st.day === state.dayCount &&
        st.fromId === voter.id &&
        st.toId === c.id &&
        st.kind === 'ACCUSE',
    );
    if (accusedToday) s += 1.2;
    // 微小ノイズで完全な同票膠着を防ぐ
    s += (rng() - 0.5) * 0.25;
    return { id: c.id, score: s };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}

/**
 * AI社員の夜アクション対象を役職の戦術に基づいて決定する。
 */
export function chooseAiNightAction(
  state: GameState,
  actor: Player,
  rng: () => number = Math.random,
): string | null {
  const aliveTargets = Object.values(state.players).filter(
    (p) => p.isAlive && p.id !== actor.id,
  );
  if (aliveTargets.length === 0) return null;

  if (actor.role === 'SPY') {
    const nonSpies = aliveTargets.filter((p) => p.role !== 'SPY');
    const pool = nonSpies.length > 0 ? nonSpies : aliveTargets;
    // 優先度: 本物っぽいHR/GOSSIP/ENGINEERや白確定者を優先して襲撃、ただし対抗HRがいる場合はローラーに任せて他を噛むことも
    const hrClaims = state.claims.filter((c) => c.role === 'HR');
    const scored = pool.map((t) => {
      let priority = (rng() - 0.5) * 0.5;
      const claim = state.claims.find((c) => c.playerId === t.id);
      if (claim?.role === 'HR' && hrClaims.length === 1) priority += 3.0;
      if (claim?.role === 'GOSSIP') priority += 2.2;
      if (claim?.role === 'ENGINEER') priority += 2.0;
      const whiteRep = state.claimedResults.some(
        (r) => r.kind === 'DIVINE' && r.targetId === t.id && !r.isSpy,
      );
      if (whiteRep) priority += 1.5;
      // 偽COしているイエスマンっぽい人物は噛まない
      if (claim?.role === 'HR' && hrClaims.length >= 2) priority -= 1.5;
      return { id: t.id, priority };
    });
    scored.sort((a, b) => b.priority - a.priority);
    return scored[0].id;
  }

  if (actor.role === 'HR') {
    const alreadyIds = new Set(state.divinationResults.map((r) => r.targetId));
    const unexamined = aliveTargets.filter((p) => !alreadyIds.has(p.id));
    const pool = unexamined.length > 0 ? unexamined : aliveTargets;
    const scored = pool.map((t) => ({
      id: t.id,
      score: computeSuspicion(state, actor, t) + (rng() - 0.5) * 0.4,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].id;
  }

  if (actor.role === 'GA') {
    // 総務部(騎士)は単独COの人事部・お局様・エンジニア・白確定者を優先護衛
    const hrClaims = state.claims.filter((c) => c.role === 'HR');
    const scored = aliveTargets.map((t) => {
      let priority = -computeSuspicion(state, actor, t) * 0.5 + (rng() - 0.5) * 0.3;
      const claim = state.claims.find((c) => c.playerId === t.id);
      if (claim?.role === 'HR' && hrClaims.length === 1) priority += 4.0;
      if (claim?.role === 'GOSSIP') priority += 2.5;
      if (claim?.role === 'ENGINEER') priority += 2.2;
      return { id: t.id, priority };
    });
    scored.sort((a, b) => b.priority - a.priority);
    return scored[0].id;
  }

  return null;
}

/**
 * 新規ゲーム開始時の `GameState` を構築する純粋関数。
 */
export function createInitialGameState(
  playerName: string,
  playerCount: number,
  rng: () => number = Math.random,
): GameState {
  const name = playerName.trim().slice(0, 10) || '社員';
  const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.floor(playerCount) || 5));
  const roles = shuffle(getRoleComposition(count), rng);

  // ペルソナを重複なく選出 (プレイヤー名と被る姓は避ける)
  const personaIndices = shuffle(
    AI_PERSONAS.map((_, idx) => idx).filter((idx) => !name.includes(AI_PERSONAS[idx].name)),
    rng,
  );

  const players: Record<string, Player> = {};
  const order: string[] = [];

  const humanId = 'human-player';
  players[humanId] = {
    id: humanId,
    name,
    role: roles[0],
    isAlive: true,
    isHost: true,
    isAI: false,
    personaIndex: -1,
  };
  order.push(humanId);

  for (let i = 1; i < count; i++) {
    const aiId = `ai-${i}`;
    const pIdx = personaIndices[(i - 1) % personaIndices.length] ?? i - 1;
    const persona = AI_PERSONAS[pIdx];
    players[aiId] = {
      id: aiId,
      name: persona ? personaDisplayName(persona) : `社員${i}`,
      role: roles[i],
      isAlive: true,
      isHost: false,
      isAI: true,
      personaIndex: pIdx,
    };
    order.push(aiId);
  }

  // AIごとの直感値 (-0.35 .. +0.35)
  const gut: Record<string, Record<string, number>> = {};
  for (const obs of Object.values(players)) {
    if (!obs.isAI) continue;
    gut[obs.id] = {};
    for (const tgt of Object.values(players)) {
      if (obs.id === tgt.id) continue;
      gut[obs.id][tgt.id] = (rng() - 0.5) * 0.7;
    }
  }

  // AIスパイ/イエスマンの偽CO計画
  const bluffs: Record<string, { role: Role; day: number }> = {};
  const aiYesman = Object.values(players).find((p) => p.isAI && p.role === 'YESMAN');
  if (aiYesman && rng() < 0.78) {
    bluffs[aiYesman.id] = {
      role: rng() < 0.8 ? 'HR' : 'GOSSIP',
      day: 1,
    };
  }
  const aiSpies = Object.values(players).filter((p) => p.isAI && p.role === 'SPY');
  if (aiSpies.length > 0 && (!aiYesman || rng() < 0.45)) {
    const blufferSpy = pickRandom(aiSpies, rng);
    bluffs[blufferSpy.id] = {
      role: rng() < 0.75 ? 'HR' : 'GOSSIP',
      day: rng() < 0.65 ? 1 : 2,
    };
  }

  // 初日 (Day 0) の人事部・事前白確定調査
  const divinationResults: DivinationResult[] = [];
  const hrPlayer = Object.values(players).find((p) => p.role === 'HR');
  if (hrPlayer) {
    const whitePool = Object.values(players).filter(
      (p) => p.id !== hrPlayer.id && p.role !== 'SPY',
    );
    if (whitePool.length > 0) {
      const target = pickRandom(whitePool, rng);
      divinationResults.push({
        targetId: target.id,
        targetName: target.name,
        isSpy: false,
        dayNumber: 0,
      });
    }
  }

  const logs: GameLog[] = [
    makeLog('SYSTEM', `人事監査プロトコルを開始します（参加社員 ${count}名）。`),
    makeLog('SYSTEM', `あなたの配属役職は「${getRoleName(roles[0])}」です。`),
  ];

  if (roles[0] === 'HR' && divinationResults.length > 0) {
    const first = divinationResults[0];
    logs.push(
      makeLog(
        'PRIVATE',
        `事前経歴調査: ${first.targetName} はスパイではありません（白確定）。`,
        { playerId: humanId, day: 0 },
      ),
    );
  }
  if (roles[0] === 'ENGINEER') {
    const partners = Object.values(players).filter(
      (p) => p.role === 'ENGINEER' && p.id !== humanId,
    );
    if (partners.length > 0) {
      logs.push(
        makeLog(
          'PRIVATE',
          `同期エンジニア確認: ${partners.map((p) => p.name).join('、')} は味方です。`,
          { playerId: humanId, day: 0 },
        ),
      );
    }
  }
  if (roles[0] === 'SPY') {
    const fellowSpies = Object.values(players).filter(
      (p) => p.role === 'SPY' && p.id !== humanId,
    );
    if (fellowSpies.length > 0) {
      logs.push(
        makeLog(
          'PRIVATE',
          `スパイ連絡網: 仲間の産業スパイは ${fellowSpies.map((p) => p.name).join('、')} です。`,
          { playerId: humanId, day: 0 },
        ),
      );
    }
  }

  return {
    phase: 'ROLE_REVEAL',
    phaseSeq: 1,
    players,
    order,
    dayCount: 1,
    timeRemaining: REVEAL_DURATION,
    logs,
    votes: {},
    actions: {},
    winner: null,
    lastExecutedId: null,
    lastAttackedId: null,
    lastNight: null,
    lastVote: null,
    divinationResults,
    gossipResults: [],
    claims: [],
    claimedResults: [],
    stances: [],
    voteHistory: [],
    nightHistory: [],
    gut,
    bluffs,
    pendingLines: [],
    speechesLeft: 3,
  };
}

function emptyLobbyState(): GameState {
  return {
    phase: 'LOBBY',
    phaseSeq: 0,
    players: {},
    order: [],
    dayCount: 0,
    timeRemaining: 0,
    logs: [],
    votes: {},
    actions: {},
    winner: null,
    lastExecutedId: null,
    lastAttackedId: null,
    lastNight: null,
    lastVote: null,
    divinationResults: [],
    gossipResults: [],
    claims: [],
    claimedResults: [],
    stances: [],
    voteHistory: [],
    nightHistory: [],
    gut: {},
    bluffs: {},
    pendingLines: [],
    speechesLeft: 0,
  };
}

function findHumanId(players: Record<string, Player>): string | null {
  return Object.values(players).find((p) => !p.isAI)?.id ?? null;
}

function isValidTarget(
  players: Record<string, Player>,
  actorId: string,
  targetId: string,
): boolean {
  const target = players[targetId];
  if (!target || !target.isAlive) return false;
  if (targetId === actorId) return false;
  return true;
}

/** `PendingLine` 1件を `GameState` に反映する純粋ヘルパー */
export function applyPendingLine(prev: GameState, line: PendingLine): GameState {
  const speaker = prev.players[line.playerId];
  if (!speaker || !speaker.isAlive) return prev;

  const log = makeLog('CHAT', line.message, {
    playerId: line.playerId,
    tag: line.tag,
    targetId: line.targetId,
    day: prev.dayCount,
  });

  let claims = prev.claims;
  if (line.claim) {
    const exists = claims.some(
      (c) => c.playerId === line.playerId && c.role === line.claim,
    );
    if (!exists) {
      claims = [
        ...claims.filter((c) => c.playerId !== line.playerId),
        { playerId: line.playerId, role: line.claim, day: prev.dayCount },
      ];
    }
  }

  let claimedResults = prev.claimedResults;
  if (line.result) {
    const r = line.result;
    const exists = claimedResults.some(
      (cr) =>
        cr.claimerId === line.playerId &&
        cr.targetId === r.targetId &&
        cr.kind === r.kind,
    );
    if (!exists) {
      claimedResults = [
        ...claimedResults,
        {
          claimerId: line.playerId,
          targetId: r.targetId,
          isSpy: r.isSpy,
          kind: r.kind,
          day: prev.dayCount,
        },
      ];
    }
  }

  let stances = prev.stances;
  if (line.stance && line.targetId) {
    stances = [
      ...stances,
      {
        fromId: line.playerId,
        toId: line.targetId,
        kind: line.stance,
        day: prev.dayCount,
      },
    ];
  }

  return {
    ...prev,
    logs: [...prev.logs, log],
    claims,
    claimedResults,
    stances,
  };
}

// ===== Hook =====

export interface JinroGameActions {
  startGame: (playerName: string, playerCount: number) => void;
  submitVote: (targetId: string) => void;
  submitNightAction: (targetId: string) => void;
  skipPhase: () => void;
  resetGame: () => void;
  /** プレイヤー自身の役職CO (ブラフ可) */
  claimRole: (role: Role) => void;
  /** プレイヤー自身の調査・霊媒結果報告 (ブラフ可) */
  claimResult: (targetId: string, isSpy: boolean, kind: 'DIVINE' | 'MEDIUM') => void;
  /** プレイヤー自身の疑い・信頼表明 */
  speakStance: (targetId: string, kind: 'ACCUSE' | 'TRUST') => void;
  /** プレイヤー自身の弁明・議論促し */
  speakGeneral: (kind: 'DEFEND' | 'PROMPT') => void;
  /** 次のAI発言を即座に1件進める */
  flushNextLine: () => void;
  /** 一時停止状態 */
  isPaused: boolean;
  togglePause: () => void;
}

export function useJinroGame(): [GameState, JinroGameActions] {
  const [state, setState] = useState<GameState>(emptyLobbyState);
  const [isPaused, setIsPaused] = useState(false);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const genRef = useRef(0);
  const resolvingRef = useRef(false);

  const fnsRef = useRef<{
    transitionToDay: (dayCount: number) => void;
    transitionToVote: () => void;
    transitionToNight: () => void;
    resolveVote: () => void;
    resolveNight: () => void;
    goGameOver: () => void;
  }>({
    transitionToDay: () => {},
    transitionToVote: () => {},
    transitionToNight: () => {},
    resolveVote: () => {},
    resolveNight: () => {},
    goGameOver: () => {},
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (conversationTimerRef.current) clearInterval(conversationTimerRef.current);
      if (conversationTimeoutRef.current) clearTimeout(conversationTimeoutRef.current);
      if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }
    };
  }, []);

  const stopTimers = useCallback(() => {
    genRef.current += 1;
    resolvingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (conversationTimerRef.current) {
      clearInterval(conversationTimerRef.current);
      conversationTimerRef.current = null;
    }
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current);
      conversationTimeoutRef.current = null;
    }
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number, onComplete: () => void) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
    }
    const gen = genRef.current;
    let endTime = Date.now() + duration * 1000;
    let hiddenAt: number | null =
      (typeof document !== 'undefined' && document.hidden) || pausedRef.current
        ? Date.now()
        : null;

    const onVisibility = () => {
      if (document.hidden || pausedRef.current) {
        if (hiddenAt === null) hiddenAt = Date.now();
      } else if (hiddenAt !== null) {
        endTime += Date.now() - hiddenAt;
        hiddenAt = null;
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
      visibilityHandlerRef.current = onVisibility;
    }

    setState((prev) =>
      prev.timeRemaining === duration ? prev : { ...prev, timeRemaining: duration },
    );

    timerRef.current = setInterval(() => {
      if ((typeof document !== 'undefined' && document.hidden) || pausedRef.current) {
        if (hiddenAt === null) hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null) {
        endTime += Date.now() - hiddenAt;
        hiddenAt = null;
      }
      if (gen !== genRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibility);
        }
        if (visibilityHandlerRef.current === onVisibility) visibilityHandlerRef.current = null;
        return;
      }
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setState((prev) =>
        prev.timeRemaining === remaining ? prev : { ...prev, timeRemaining: remaining },
      );

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibility);
        }
        if (visibilityHandlerRef.current === onVisibility) visibilityHandlerRef.current = null;
        if (gen === genRef.current) onComplete();
      }
    }, 250);
  }, []);

  const stopConversations = useCallback(() => {
    if (conversationTimerRef.current) {
      clearInterval(conversationTimerRef.current);
      conversationTimerRef.current = null;
    }
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current);
      conversationTimeoutRef.current = null;
    }
  }, []);

  const popNextPendingLine = useCallback(() => {
    if (pausedRef.current) return;
    const current = stateRef.current;
    if (current.phase !== 'DAY_CONVERSATION') return;
    if (current.pendingLines.length === 0) {
      stopConversations();
      return;
    }
    const next = current.pendingLines[0];
    if (next.tag === 'CLAIM' || next.tag === 'REPORT') {
      playJinroSe('claim');
    } else {
      playJinroSe('chat');
    }
    setState((prev) => {
      if (prev.phase !== 'DAY_CONVERSATION' || prev.pendingLines.length === 0) return prev;
      const [head, ...rest] = prev.pendingLines;
      const updated = applyPendingLine(prev, head);
      return {
        ...updated,
        pendingLines: rest,
      };
    });
  }, [stopConversations]);

  const startConversations = useCallback(() => {
    stopConversations();
    const gen = genRef.current;

    conversationTimeoutRef.current = setTimeout(() => {
      if (gen !== genRef.current) return;
      popNextPendingLine();
      conversationTimerRef.current = setInterval(() => {
        if (gen !== genRef.current) return;
        popNextPendingLine();
      }, 2400);
    }, 900);
  }, [popNextPendingLine, stopConversations]);

  // ---- Phase transitions ----

  const transitionToDay = useCallback(
    (dayCount: number) => {
      const gen = genRef.current;
      resolvingRef.current = false;
      stopConversations();
      playJinroSe('day');

      setState((prev) => {
        const base: GameState = {
          ...prev,
          phase: 'DAY_CONVERSATION',
          phaseSeq: prev.phaseSeq + 1,
          dayCount,
          logs: [
            ...prev.logs,
            makeLog(
              'SYSTEM',
              `━━ ${dayCount}日目 朝 — 定例会議が始まります ━━`,
              { day: dayCount },
            ),
          ],
          timeRemaining: CONVERSATION_DURATION,
          votes: {},
          speechesLeft: 3,
        };
        const planned = planDayLines(base);
        return {
          ...base,
          pendingLines: planned,
        };
      });

      startConversations();
      startTimer(CONVERSATION_DURATION, () => {
        if (gen === genRef.current) fnsRef.current.transitionToVote();
      });
    },
    [startConversations, startTimer, stopConversations],
  );

  const transitionToVote = useCallback(() => {
    const gen = genRef.current;
    resolvingRef.current = false;
    stopConversations();
    playJinroSe('votePhase');

    setState((prev) => {
      if (prev.phase === 'DAY_VOTE') return prev;
      // 未消化の重要発言 (CO / 結果報告) が残っていればスキップ時にも自動反映して情報欠落を防ぐ
      let flushed = prev;
      for (const line of prev.pendingLines) {
        if (line.claim || line.result) {
          flushed = applyPendingLine(flushed, line);
        }
      }
      return {
        ...flushed,
        phase: 'DAY_VOTE',
        phaseSeq: flushed.phaseSeq + 1,
        pendingLines: [],
        logs: [
          ...flushed.logs,
          makeLog(
            'SYSTEM',
            '人事査定会議（投票フェーズ）に移行します。解雇対象者を1名指名してください。',
            { day: flushed.dayCount },
          ),
        ],
        timeRemaining: VOTE_DURATION,
        votes: {},
      };
    });

    const s = stateRef.current;
    const human = Object.values(s.players).find((p) => !p.isAI && p.isAlive);
    const duration = human ? VOTE_DURATION : FAST_FORWARD_DURATION;
    startTimer(duration, () => {
      if (gen !== genRef.current) return;
      setState((prev) => {
        const myId = findHumanId(prev.players);
        const me = myId ? prev.players[myId] : undefined;
        if (myId && me && me.isAlive && !prev.votes[myId]) {
          const targets = Object.values(prev.players).filter(
            (p) => p.isAlive && p.id !== myId,
          );
          if (targets.length > 0) {
            return {
              ...prev,
              votes: { ...prev.votes, [myId]: pickRandom(targets).id },
            };
          }
        }
        return prev;
      });
      resolveTimeoutRef.current = setTimeout(() => {
        if (gen === genRef.current) fnsRef.current.resolveVote();
      }, 50);
    });
  }, [startTimer, stopConversations]);

  const resolveVote = useCallback(() => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    stopConversations();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentState = stateRef.current;
    if (currentState.phase !== 'DAY_VOTE') {
      resolvingRef.current = false;
      return;
    }
    const alivePlayers = Object.values(currentState.players).filter((p) => p.isAlive);
    const allVotes: Record<string, string> = { ...currentState.votes };

    // AI社員の推理ベース投票
    alivePlayers.forEach((p) => {
      if (p.isAI && !allVotes[p.id]) {
        const targets = alivePlayers.filter((t) => t.id !== p.id);
        if (targets.length > 0) {
          allVotes[p.id] = chooseAiVote(currentState, p, targets);
        }
      }
    });

    // 無効票の除去
    for (const [voterId, targetId] of Object.entries(allVotes)) {
      const voter = currentState.players[voterId];
      if (
        !voter ||
        !voter.isAlive ||
        !isValidTarget(currentState.players, voterId, targetId)
      ) {
        delete allVotes[voterId];
      }
    }

    const tallies: Record<string, number> = {};
    Object.values(allVotes).forEach((tid) => {
      tallies[tid] = (tallies[tid] || 0) + 1;
    });

    let maxVotes = 0;
    let topIds: string[] = [];
    for (const [tid, count] of Object.entries(tallies)) {
      if (count > maxVotes) {
        maxVotes = count;
        topIds = [tid];
      } else if (count === maxVotes) {
        topIds.push(tid);
      }
    }

    let runoffVotes: Record<string, string> | null = null;
    let executedId: string | null = null;

    if (topIds.length === 1) {
      executedId = topIds[0];
    } else if (topIds.length > 1) {
      // 同数上位者による決選投票
      runoffVotes = {};
      const runoffCandidates = topIds
        .map((id) => currentState.players[id])
        .filter((p): p is Player => Boolean(p));
      for (const voter of alivePlayers) {
        if (topIds.includes(voter.id)) continue;
        if (!voter.isAI) {
          // 人間が既に上位候補の誰かに投票していればそれを維持
          const humanPick = allVotes[voter.id];
          if (humanPick && topIds.includes(humanPick)) {
            runoffVotes[voter.id] = humanPick;
          }
        } else {
          runoffVotes[voter.id] = chooseAiVote(currentState, voter, runoffCandidates);
        }
      }
      const rTallies: Record<string, number> = {};
      Object.values(runoffVotes).forEach((tid) => {
        rTallies[tid] = (rTallies[tid] || 0) + 1;
      });
      let rMax = 0;
      let rTop: string[] = [];
      for (const [tid, c] of Object.entries(rTallies)) {
        if (c > rMax) {
          rMax = c;
          rTop = [tid];
        } else if (c === rMax) {
          rTop.push(tid);
        }
      }
      if (rTop.length === 1) {
        executedId = rTop[0];
      }
    }

    const newPlayers: Record<string, Player> = {};
    for (const [k, v] of Object.entries(currentState.players)) {
      newPlayers[k] = { ...v };
    }
    const extraLogs: GameLog[] = [];
    let gossipAppend: GameLog[] = [];
    let gossipResultAppend: GossipResult[] = [];

    Object.entries(allVotes).forEach(([voterId, targetId]) => {
      const voterName = newPlayers[voterId]?.name || '???';
      const targetName = newPlayers[targetId]?.name || '???';
      extraLogs.push(
        makeLog('SYSTEM', `投票: ${voterName} → ${targetName} (${tallies[targetId] ?? 1}票)`, {
          day: currentState.dayCount,
        }),
      );
    });

    if (runoffVotes && Object.keys(runoffVotes).length > 0) {
      extraLogs.push(
        makeLog(
          'SYSTEM',
          `上位同数のため決選投票を実施（候補: ${topIds.map((id) => newPlayers[id]?.name).join(' / ')}）`,
          { day: currentState.dayCount },
        ),
      );
    }

    if (executedId && newPlayers[executedId]) {
      const executedPlayer = newPlayers[executedId];
      newPlayers[executedId] = {
        ...executedPlayer,
        isAlive: false,
        deathDay: currentState.dayCount,
        deathCause: 'EXECUTED',
      };
      if (executedPlayer.isAI) {
        extraLogs.push(
          makeLog(
            'CHAT',
            say(getPlayerTone(executedPlayer), 'lastWords', Math.random),
            {
              playerId: executedPlayer.id,
              tag: 'DEFEND',
              day: currentState.dayCount,
            },
          ),
        );
      }
      extraLogs.push(
        makeLog('RESULT', `人事査定の結果、${executedPlayer.name} に懲戒解雇処分が下されました。`, {
          targetId: executedId,
          day: currentState.dayCount,
        }),
      );
      playJinroSe('executed');

      const gossipPlayer = Object.values(newPlayers).find(
        (p) => p.role === 'GOSSIP' && p.isAlive,
      );
      if (gossipPlayer) {
        const wasSpy = executedPlayer.role === 'SPY';
        gossipResultAppend = [
          {
            targetId: executedId,
            targetName: executedPlayer.name,
            wasSpy,
            dayNumber: currentState.dayCount,
          },
        ];
        gossipAppend = [
          makeLog(
            'PRIVATE',
            wasSpy
              ? `お局情報: 解雇された ${executedPlayer.name} はやはり産業スパイだったわよ。`
              : `お局情報: 解雇された ${executedPlayer.name} はスパイではなかったわ。`,
            { playerId: gossipPlayer.id, day: currentState.dayCount },
          ),
        ];
      }
    } else {
      extraLogs.push(
        makeLog('RESULT', '決選投票も同数となったため、本日の解雇処分は見送られました。', {
          day: currentState.dayCount,
        }),
      );
      playJinroSe('peaceful');
    }

    const voteRecord: VoteRecord = {
      day: currentState.dayCount,
      votes: allVotes,
      runoffVotes,
      executedId,
    };

    const winner = checkWinCondition(newPlayers);
    const gen = genRef.current;

    setState((prev) => ({
      ...prev,
      phase: 'VOTE_RESULT',
      phaseSeq: prev.phaseSeq + 1,
      players: newPlayers,
      votes: allVotes,
      lastVote: voteRecord,
      voteHistory: [...prev.voteHistory, voteRecord],
      logs: [...prev.logs, ...extraLogs, ...gossipAppend],
      lastExecutedId: executedId,
      winner,
      timeRemaining: REVEAL_DURATION,
      gossipResults:
        gossipResultAppend.length > 0
          ? [...prev.gossipResults, ...gossipResultAppend]
          : prev.gossipResults,
    }));

    if (winner) {
      startTimer(REVEAL_DURATION, () => {
        if (gen === genRef.current) fnsRef.current.goGameOver();
      });
    } else {
      startTimer(REVEAL_DURATION, () => {
        if (gen === genRef.current) fnsRef.current.transitionToNight();
      });
    }
  }, [startTimer, stopConversations]);

  const transitionToNight = useCallback(() => {
    const gen = genRef.current;
    resolvingRef.current = false;
    playJinroSe('night');

    setState((prev) => {
      if (prev.phase === 'NIGHT_ACTION') return prev;
      return {
        ...prev,
        phase: 'NIGHT_ACTION',
        phaseSeq: prev.phaseSeq + 1,
        logs: [
          ...prev.logs,
          makeLog('SYSTEM', `━━ ${prev.dayCount}日目 深夜 — 残業フロア ━━`, {
            day: prev.dayCount,
          }),
        ],
        timeRemaining: NIGHT_DURATION,
        actions: {},
      };
    });

    const s = stateRef.current;
    const human = Object.values(s.players).find((p) => !p.isAI && p.isAlive);
    const humanNeedsAction = Boolean(human && ['SPY', 'HR', 'GA'].includes(human.role));
    const duration = humanNeedsAction ? NIGHT_DURATION : FAST_FORWARD_DURATION;
    startTimer(duration, () => {
      if (gen !== genRef.current) return;
      setState((prev) => {
        const myId = findHumanId(prev.players);
        const me = myId ? prev.players[myId] : undefined;
        if (
          myId &&
          me &&
          me.isAlive &&
          ['SPY', 'HR', 'GA'].includes(me.role) &&
          !prev.actions[myId]
        ) {
          const targets = Object.values(prev.players).filter(
            (p) => p.isAlive && p.id !== myId,
          );
          if (targets.length > 0) {
            return {
              ...prev,
              actions: { ...prev.actions, [myId]: pickRandom(targets).id },
            };
          }
        }
        return prev;
      });
      resolveTimeoutRef.current = setTimeout(() => {
        if (gen === genRef.current) fnsRef.current.resolveNight();
      }, 50);
    });
  }, [startTimer]);

  const resolveNight = useCallback(() => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentState = stateRef.current;
    if (currentState.phase !== 'NIGHT_ACTION') {
      resolvingRef.current = false;
      return;
    }
    const alivePlayers = Object.values(currentState.players).filter((p) => p.isAlive);
    const allActions: Record<string, string> = { ...currentState.actions };
    const myId = findHumanId(currentState.players);
    const myPlayer = myId ? currentState.players[myId] : undefined;
    const humanIsSpy = Boolean(myPlayer?.isAlive && myPlayer.role === 'SPY');

    // AI night actions (戦術AI)
    alivePlayers.forEach((p) => {
      if (p.isAI && !allActions[p.id]) {
        if (p.role === 'SPY' && humanIsSpy && myId && allActions[myId]) return;
        const targetId = chooseAiNightAction(currentState, p);
        if (targetId) allActions[p.id] = targetId;
      }
    });

    if (
      myPlayer &&
      myPlayer.isAlive &&
      !allActions[myPlayer.id] &&
      ['SPY', 'HR', 'GA'].includes(myPlayer.role)
    ) {
      const targets = alivePlayers.filter((t) => t.id !== myPlayer.id);
      if (targets.length > 0) allActions[myPlayer.id] = pickRandom(targets).id;
    }

    for (const [actorId, targetId] of Object.entries(allActions)) {
      const actor = currentState.players[actorId];
      if (
        !actor ||
        !actor.isAlive ||
        !isValidTarget(currentState.players, actorId, targetId)
      ) {
        delete allActions[actorId];
      }
    }

    const newPlayers: Record<string, Player> = {};
    for (const [k, v] of Object.entries(currentState.players)) {
      newPlayers[k] = { ...v };
    }

    const extraLogs: GameLog[] = [];
    let attackedId: string | null = null;
    let attackedName: string | null = null;

    const spyActions = Object.entries(allActions).filter(
      ([actorId]) => newPlayers[actorId]?.role === 'SPY',
    );
    const humanSpyTarget = humanIsSpy && myId ? allActions[myId] : null;
    const spyTarget =
      humanSpyTarget ?? (spyActions.length > 0 ? spyActions[0][1] : null);

    const gaActions = Object.entries(allActions).filter(
      ([actorId]) => newPlayers[actorId]?.role === 'GA',
    );
    const guardTarget =
      gaActions.length > 0 ? gaActions[gaActions.length - 1][1] : null;

    const hrActions = Object.entries(allActions).filter(
      ([actorId]) => newPlayers[actorId]?.role === 'HR',
    );
    const divineTarget =
      hrActions.length > 0 ? hrActions[hrActions.length - 1][1] : null;

    if (spyTarget && newPlayers[spyTarget]) {
      const target = newPlayers[spyTarget];
      const isProtected = spyTarget === guardTarget;
      const isConsultant = target.role === 'CONSULTANT';

      if (!isProtected && !isConsultant) {
        newPlayers[spyTarget] = {
          ...target,
          isAlive: false,
          deathDay: currentState.dayCount,
          deathCause: 'ATTACKED',
        };
        attackedId = spyTarget;
        attackedName = target.name;
        extraLogs.push(
          makeLog(
            'RESULT',
            `深夜の工作により、${target.name} が退職（襲撃）に追い込まれました。`,
            { targetId: spyTarget, day: currentState.dayCount },
          ),
        );
        playJinroSe('attacked');
      } else {
        extraLogs.push(
          makeLog('RESULT', '昨晩は不審な退職者は出ませんでした（襲撃阻止）。', {
            day: currentState.dayCount,
          }),
        );
        playJinroSe('peaceful');
      }
    } else {
      extraLogs.push(
        makeLog('RESULT', '昨晩は平穏な夜でした。', { day: currentState.dayCount }),
      );
      playJinroSe('peaceful');
    }

    let divAppend: DivinationResult[] = [];
    const divLogs: GameLog[] = [];
    if (divineTarget && newPlayers[divineTarget]) {
      const divinedPlayer = newPlayers[divineTarget];
      const isSpy = divinedPlayer.role === 'SPY';
      const hrPlayer = Object.values(newPlayers).find(
        (p) => p.role === 'HR' && p.isAlive,
      );

      if (hrPlayer) {
        divAppend = [
          {
            targetId: divineTarget,
            targetName: divinedPlayer.name,
            isSpy,
            dayNumber: currentState.dayCount,
          },
        ];
        divLogs.push(
          makeLog(
            'PRIVATE',
            isSpy
              ? `人事調査報告 (${currentState.dayCount}日目夜): ${divinedPlayer.name} は【産業スパイ】です！`
              : `人事調査報告 (${currentState.dayCount}日目夜): ${divinedPlayer.name} はスパイではありません（白）。`,
            { playerId: hrPlayer.id, day: currentState.dayCount },
          ),
        );
      }
    }

    const nightRecord: NightRecord = {
      day: currentState.dayCount,
      attackedId,
      spyTargetId: spyTarget,
      guardTargetId: guardTarget,
      divineTargetId: divineTarget,
    };

    const winner = checkWinCondition(newPlayers);
    const gen = genRef.current;
    const nextDay = currentState.dayCount + 1;

    setState((prev) => ({
      ...prev,
      phase: 'NIGHT_RESULT',
      phaseSeq: prev.phaseSeq + 1,
      players: newPlayers,
      actions: allActions,
      logs: [...prev.logs, ...extraLogs, ...divLogs],
      lastAttackedId: attackedId,
      lastNight: {
        attackedId,
        attackedName,
        peaceful: attackedId === null,
      },
      nightHistory: [...prev.nightHistory, nightRecord],
      winner,
      timeRemaining: REVEAL_DURATION,
      divinationResults:
        divAppend.length > 0
          ? [...prev.divinationResults, ...divAppend]
          : prev.divinationResults,
    }));

    if (winner) {
      startTimer(REVEAL_DURATION, () => {
        if (gen === genRef.current) fnsRef.current.goGameOver();
      });
    } else {
      startTimer(REVEAL_DURATION, () => {
        if (gen === genRef.current) fnsRef.current.transitionToDay(nextDay);
      });
    }
  }, [startTimer]);

  const goGameOver = useCallback(() => {
    stopConversations();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const s = stateRef.current;
    const human = Object.values(s.players).find((p) => !p.isAI);
    const humanWon =
      (s.winner === 'COMPANY' &&
        human &&
        !['SPY', 'YESMAN', 'CONSULTANT'].includes(human.role)) ||
      (s.winner === 'SPIES' && human && ['SPY', 'YESMAN'].includes(human.role)) ||
      (s.winner === 'CONSULTANT' && human?.role === 'CONSULTANT');
    playJinroSe(humanWon ? 'win' : 'lose');
    setState((prev) => ({
      ...prev,
      phase: 'GAME_OVER',
      phaseSeq: prev.phaseSeq + 1,
      timeRemaining: 0,
    }));
  }, [stopConversations]);

  useEffect(() => {
    fnsRef.current = {
      transitionToDay,
      transitionToVote,
      transitionToNight,
      resolveVote,
      resolveNight,
      goGameOver,
    };
  }, [
    transitionToDay,
    transitionToVote,
    transitionToNight,
    resolveVote,
    resolveNight,
    goGameOver,
  ]);

  // ---- Public actions ----

  const startGame = useCallback(
    (playerName: string, playerCount: number) => {
      if (!playerName.trim()) return;
      stopTimers();
      setIsPaused(false);
      pausedRef.current = false;
      const gen = genRef.current;
      const init = createInitialGameState(playerName, playerCount);
      playJinroSe('reveal');
      setState(init);

      startTimer(REVEAL_DURATION, () => {
        if (gen === genRef.current) fnsRef.current.transitionToDay(1);
      });
    },
    [stopTimers, startTimer],
  );

  const submitVote = useCallback((targetId: string) => {
    const s = stateRef.current;
    if (s.phase !== 'DAY_VOTE') return;
    const myId = findHumanId(s.players);
    if (!myId) return;
    const me = s.players[myId];
    if (!me || !me.isAlive || s.votes[myId]) return;
    if (!isValidTarget(s.players, myId, targetId)) return;
    if (resolvingRef.current) return;

    playJinroSe('voteCast');
    setState((prev) => {
      if (prev.phase !== 'DAY_VOTE') return prev;
      const id = findHumanId(prev.players);
      if (!id) return prev;
      const p = prev.players[id];
      if (!p || !p.isAlive || prev.votes[id]) return prev;
      if (!isValidTarget(prev.players, id, targetId)) return prev;
      return { ...prev, votes: { ...prev.votes, [id]: targetId } };
    });

    if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
    const gen = genRef.current;
    resolveTimeoutRef.current = setTimeout(() => {
      if (gen === genRef.current) fnsRef.current.resolveVote();
    }, 550);
  }, []);

  const submitNightAction = useCallback((targetId: string) => {
    const s = stateRef.current;
    if (s.phase !== 'NIGHT_ACTION') return;
    const myId = findHumanId(s.players);
    if (!myId) return;
    const me = s.players[myId];
    if (!me || !me.isAlive || !['SPY', 'HR', 'GA'].includes(me.role)) return;
    if (s.actions[myId]) return;
    if (!isValidTarget(s.players, myId, targetId)) return;
    if (resolvingRef.current) return;

    playJinroSe('voteCast');
    setState((prev) => {
      if (prev.phase !== 'NIGHT_ACTION') return prev;
      const id = findHumanId(prev.players);
      if (!id) return prev;
      const p = prev.players[id];
      if (!p || !p.isAlive || prev.actions[id]) return prev;
      if (!['SPY', 'HR', 'GA'].includes(p.role)) return prev;
      if (!isValidTarget(prev.players, id, targetId)) return prev;
      return { ...prev, actions: { ...prev.actions, [id]: targetId } };
    });

    if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
    const gen = genRef.current;
    resolveTimeoutRef.current = setTimeout(() => {
      if (gen === genRef.current) fnsRef.current.resolveNight();
    }, 550);
  }, []);

  // ---- Interactive Human Speech Actions ----

  const claimRole = useCallback((role: Role) => {
    const s = stateRef.current;
    if (s.phase !== 'DAY_CONVERSATION') return;
    const myId = findHumanId(s.players);
    if (!myId) return;
    const me = s.players[myId];
    if (!me || !me.isAlive || s.speechesLeft <= 0) return;

    playJinroSe('claim');
    setState((prev) => {
      if (prev.phase !== 'DAY_CONVERSATION' || prev.speechesLeft <= 0) return prev;
      const human = prev.players[myId];
      if (!human || !human.isAlive) return prev;

      const msg = `【役職CO】私は「${getRoleName(role)}」です。`;
      let next = applyPendingLine(prev, {
        playerId: myId,
        message: msg,
        tag: 'CLAIM',
        claim: role,
      });

      // もしAIの中に本物のその役職がいれば、即座に反論(対抗CO / 偽物指摘)をキュー先頭に差し込む
      const reactions: PendingLine[] = [];
      if (role === 'HR' || role === 'GOSSIP' || role === 'GA' || role === 'ENGINEER') {
        const realHolder = Object.values(next.players).find(
          (p) => p.isAI && p.isAlive && p.role === role,
        );
        if (realHolder && !(role === 'ENGINEER' && human.role === 'ENGINEER')) {
          const rTone = getPlayerTone(realHolder);
          reactions.push({
            playerId: realHolder.id,
            message:
              role === 'HR'
                ? say(rTone, 'counterHR', Math.random, { t: human.name })
                : say(rTone, 'fakeCallout', Math.random, { t: human.name }),
            tag: 'CLAIM',
            targetId: myId,
            claim: role,
            stance: 'ACCUSE',
          });
        }
      }

      next = {
        ...next,
        speechesLeft: prev.speechesLeft - 1,
        pendingLines: [...reactions, ...next.pendingLines],
      };
      return next;
    });
  }, []);

  const claimResult = useCallback(
    (targetId: string, isSpy: boolean, kind: 'DIVINE' | 'MEDIUM') => {
      const s = stateRef.current;
      if (s.phase !== 'DAY_CONVERSATION') return;
      const myId = findHumanId(s.players);
      if (!myId) return;
      const me = s.players[myId];
      const target = s.players[targetId];
      if (!me || !me.isAlive || !target || s.speechesLeft <= 0) return;

      playJinroSe('claim');
      setState((prev) => {
        if (prev.phase !== 'DAY_CONVERSATION' || prev.speechesLeft <= 0) return prev;
        const claimRoleType: Role = kind === 'DIVINE' ? 'HR' : 'GOSSIP';
        const verdict = isSpy ? '【スパイ（黒）】' : '【潔白（白）】';
        const label = kind === 'DIVINE' ? '人事調査' : 'お局情報';
        const msg = `【${label}報告】${target.name} さんを調べた結果、${verdict}でした。`;

        let next = applyPendingLine(prev, {
          playerId: myId,
          message: msg,
          tag: 'REPORT',
          targetId,
          claim: claimRoleType,
          result: { targetId, isSpy, kind },
        });

        const reactions: PendingLine[] = [];
        if (target.isAI && target.isAlive) {
          const tTone = getPlayerTone(target);
          if (isSpy) {
            reactions.push({
              playerId: target.id,
              message: say(tTone, 'denyBlack', Math.random, { t: me.name }),
              tag: 'DEFEND',
              targetId: myId,
              stance: 'ACCUSE',
            });
          } else {
            reactions.push({
              playerId: target.id,
              message: say(tTone, 'thanks', Math.random),
              tag: 'TRUST',
              targetId: myId,
              stance: 'TRUST',
            });
          }
        }

        next = {
          ...next,
          speechesLeft: prev.speechesLeft - 1,
          pendingLines: [...reactions, ...next.pendingLines],
        };
        return next;
      });
    },
    [],
  );

  const speakStance = useCallback((targetId: string, kind: 'ACCUSE' | 'TRUST') => {
    const s = stateRef.current;
    if (s.phase !== 'DAY_CONVERSATION') return;
    const myId = findHumanId(s.players);
    if (!myId) return;
    const me = s.players[myId];
    const target = s.players[targetId];
    if (!me || !me.isAlive || !target || target.id === myId || s.speechesLeft <= 0) return;

    playJinroSe('chat');
    setState((prev) => {
      if (prev.phase !== 'DAY_CONVERSATION' || prev.speechesLeft <= 0) return prev;
      const msg =
        kind === 'ACCUSE'
          ? `${target.name} さんの言動や票の動きが怪しいと思います。`
          : `${target.name} さんは現時点で信用できると思います。`;

      let next = applyPendingLine(prev, {
        playerId: myId,
        message: msg,
        tag: kind === 'ACCUSE' ? 'ACCUSE' : 'TRUST',
        targetId,
        stance: kind,
      });

      const reactions: PendingLine[] = [];
      if (target.isAI && target.isAlive) {
        const tTone = getPlayerTone(target);
        if (kind === 'ACCUSE') {
          reactions.push({
            playerId: target.id,
            message: say(tTone, 'defend', Math.random),
            tag: 'DEFEND',
            targetId: myId,
          });
        } else {
          reactions.push({
            playerId: target.id,
            message: say(tTone, 'thanks', Math.random),
            tag: 'TRUST',
            targetId: myId,
          });
        }
      }

      // 別のAIが賛同または異論を挟む
      const bystander = Object.values(next.players).find(
        (p) => p.isAI && p.isAlive && p.id !== targetId,
      );
      if (bystander) {
        const bSuspicion = computeSuspicion(next, bystander, target);
        const bTone = getPlayerTone(bystander);
        if (kind === 'ACCUSE' && bSuspicion > 0.2) {
          reactions.push({
            playerId: bystander.id,
            message: say(bTone, 'agree', Math.random, { t: target.name }),
            tag: 'ACCUSE',
            targetId,
            stance: 'ACCUSE',
          });
        } else if (kind === 'ACCUSE' && bSuspicion < -0.5) {
          reactions.push({
            playerId: bystander.id,
            message: say(bTone, 'disagree', Math.random, { t: target.name }),
            tag: 'TRUST',
            targetId,
          });
        }
      }

      next = {
        ...next,
        speechesLeft: prev.speechesLeft - 1,
        pendingLines: [...reactions, ...next.pendingLines],
      };
      return next;
    });
  }, []);

  const speakGeneral = useCallback((kind: 'DEFEND' | 'PROMPT') => {
    const s = stateRef.current;
    if (s.phase !== 'DAY_CONVERSATION') return;
    const myId = findHumanId(s.players);
    if (!myId) return;
    const me = s.players[myId];
    if (!me || !me.isAlive || s.speechesLeft <= 0) return;

    playJinroSe('chat');
    setState((prev) => {
      if (prev.phase !== 'DAY_CONVERSATION' || prev.speechesLeft <= 0) return prev;
      const msg =
        kind === 'DEFEND'
          ? '私は会社のために真面目に働いています。スパイではありません！'
          : '役職を持っている方は、判断材料のために情報を出してください。';
      const next = applyPendingLine(prev, {
        playerId: myId,
        message: msg,
        tag: kind === 'DEFEND' ? 'DEFEND' : 'CHATTER',
      });
      return {
        ...next,
        speechesLeft: prev.speechesLeft - 1,
      };
    });
  }, []);

  const flushNextLine = useCallback(() => {
    popNextPendingLine();
  }, [popNextPendingLine]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      pausedRef.current = next;
      return next;
    });
  }, []);

  const skipPhase = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'DAY_CONVERSATION') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopConversations();
      fnsRef.current.transitionToVote();
    } else if (s.phase === 'ROLE_REVEAL') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const day = s.dayCount || 1;
      fnsRef.current.transitionToDay(day);
    } else if (s.phase === 'VOTE_RESULT') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (s.winner) fnsRef.current.goGameOver();
      else fnsRef.current.transitionToNight();
    } else if (s.phase === 'NIGHT_RESULT') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (s.winner) fnsRef.current.goGameOver();
      else fnsRef.current.transitionToDay(s.dayCount + 1);
    }
  }, [stopConversations]);

  const resetGame = useCallback(() => {
    stopTimers();
    setIsPaused(false);
    pausedRef.current = false;
    setState(emptyLobbyState());
  }, [stopTimers]);

  return [
    state,
    {
      startGame,
      submitVote,
      submitNightAction,
      skipPhase,
      resetGame,
      claimRole,
      claimResult,
      speakStance,
      speakGeneral,
      flushNextLine,
      isPaused,
      togglePause,
    },
  ];
}
