import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GameState, Player, Role, Phase, WinnerType,
  GameLog, DivinationResult,
  AI_NAMES, AI_CONVERSATIONS,
  getRoleName, getRoleComposition,
} from '@/types/shachiku-jinro';

// ===== Utility Helpers =====

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildRoles(count: number): Role[] {
  const comp = getRoleComposition(count);
  return shuffle([...comp]);
}

function makeLog(type: GameLog['type'], message: string, playerId?: string): GameLog {
  return { id: genId(), type, message, timestamp: Date.now(), playerId };
}

export function checkWinCondition(players: Record<string, Player>): WinnerType {
  const alive = Object.values(players).filter(p => p.isAlive);
  const spies = alive.filter(p => p.role === 'SPY');
  const others = alive.filter(p => p.role !== 'SPY');
  const consultantAlive = alive.some(p => p.role === 'CONSULTANT');

  if (spies.length === 0) {
    // スパイ全滅時: コンサルが生き残っていればコンサルの横取り勝利(仕様)、
    // そうでなければ会社勝利。ゲームは必ず終了する。
    if (consultantAlive) return 'CONSULTANT';
    return 'COMPANY';
  }
  if (spies.length >= others.length) {
    if (consultantAlive) return 'CONSULTANT';
    return 'SPIES';
  }
  return null;
}

export const CONVERSATION_DURATION = 30;
export const VOTE_DURATION = 60;
export const NIGHT_DURATION = 30;
export const REVEAL_DURATION = 5;
/** 人間が死亡済み/行動不要でAIのみの場合は待たせない短縮時間 */
const FAST_FORWARD_DURATION = 5;

export function getMaxTimeForPhase(phase: Phase): number {
  switch (phase) {
    case 'DAY_CONVERSATION': return CONVERSATION_DURATION;
    case 'DAY_VOTE': return VOTE_DURATION;
    case 'NIGHT_ACTION': return NIGHT_DURATION;
    case 'ROLE_REVEAL':
    case 'VOTE_RESULT':
    case 'NIGHT_RESULT': return REVEAL_DURATION;
    default: return 60;
  }
}

// ===== Hook =====

export interface JinroGameActions {
  startGame: (playerName: string, playerCount: number) => void;
  submitVote: (targetId: string) => void;
  submitNightAction: (targetId: string) => void;
  skipPhase: () => void;
  resetGame: () => void;
}

function initialState(): GameState {
  return {
    phase: 'LOBBY',
    players: {},
    dayCount: 0,
    timeRemaining: 0,
    logs: [],
    votes: {},
    actions: {},
    winner: null,
    lastExecutedId: null,
    lastAttackedId: null,
    divinationResults: [],
    gossipResults: [],
    currentConversations: [],
  };
}

function findHumanId(players: Record<string, Player>): string | null {
  return Object.values(players).find(p => !p.isAI)?.id ?? null;
}

function isValidTarget(players: Record<string, Player>, actorId: string, targetId: string): boolean {
  const target = players[targetId];
  if (!target || !target.isAlive) return false;
  if (targetId === actorId) return false;
  return true;
}

export function useJinroGame(): [GameState, JinroGameActions] {
  const [state, setState] = useState<GameState>(initialState);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** タイマーの世代。フェーズ遷移/リセットで加算し、旧タイマーの誤発火を防ぐ */
  const genRef = useRef(0);
  /** 二重解決防止 (vote/nightの多重発火ガード) */
  const resolvingRef = useRef(false);

  // Use refs for functions to break circular dependency
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (conversationTimerRef.current) clearInterval(conversationTimerRef.current);
      if (conversationTimeoutRef.current) clearTimeout(conversationTimeoutRef.current);
      if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
    };
  }, []);

  // ---- Timer management ----
  const stopTimers = useCallback(() => {
    genRef.current += 1;
    resolvingRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (conversationTimerRef.current) { clearInterval(conversationTimerRef.current); conversationTimerRef.current = null; }
    if (conversationTimeoutRef.current) { clearTimeout(conversationTimeoutRef.current); conversationTimeoutRef.current = null; }
    if (resolveTimeoutRef.current) { clearTimeout(resolveTimeoutRef.current); resolveTimeoutRef.current = null; }
  }, []);

  const startTimer = useCallback((duration: number, onComplete: () => void) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const gen = genRef.current;
    const endTime = Date.now() + duration * 1000;

    // 即時反映(残り時間表示のチラつき防止)
    setState(prev => (prev.timeRemaining === duration ? prev : { ...prev, timeRemaining: duration }));

    timerRef.current = setInterval(() => {
      if (gen !== genRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        return;
      }
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setState(prev => (prev.timeRemaining === remaining ? prev : { ...prev, timeRemaining: remaining }));

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        if (gen === genRef.current) onComplete();
      }
    }, 250);
  }, []);

  const stopConversations = useCallback(() => {
    if (conversationTimerRef.current) { clearInterval(conversationTimerRef.current); conversationTimerRef.current = null; }
    if (conversationTimeoutRef.current) { clearTimeout(conversationTimeoutRef.current); conversationTimeoutRef.current = null; }
  }, []);

  // ---- AI conversation simulation ----
  const startConversations = useCallback(() => {
    stopConversations();
    const gen = genRef.current;
    let index = 0;

    const addConversation = () => {
      if (gen !== genRef.current) return;
      const current = stateRef.current;
      if (current.phase !== 'DAY_CONVERSATION') return;
      const aiPlayers = Object.values(current.players).filter(p => p.isAI && p.isAlive);
      if (aiPlayers.length === 0) return;
      // 会話は無限に増やさず上限で打ち止め(メモリ/描画負荷対策)
      if (current.currentConversations.length >= 40) {
        stopConversations();
        return;
      }
      const speaker = aiPlayers[index % aiPlayers.length];
      const pools = [
        ...AI_CONVERSATIONS.suspicious,
        ...AI_CONVERSATIONS.defense,
        ...AI_CONVERSATIONS.general,
        ...AI_CONVERSATIONS.accusation,
      ];
      const message = pickRandom(pools);
      const log = makeLog('CHAT', message, speaker.id);
      setState(prev => {
        if (prev.phase !== 'DAY_CONVERSATION') return prev;
        return {
          ...prev,
          currentConversations: [...prev.currentConversations, { playerId: speaker.id, message }].slice(-40),
          logs: [...prev.logs, log],
        };
      });
      index++;
    };

    conversationTimeoutRef.current = setTimeout(() => {
      addConversation();
      if (gen !== genRef.current) return;
      conversationTimerRef.current = setInterval(addConversation, 3500);
    }, 1500);
  }, [stopConversations]);

  // ---- Phase transitions (all read fresh state, never stale closure logs) ----

  const transitionToDay = useCallback((dayCount: number) => {
    const gen = genRef.current;
    resolvingRef.current = false;
    stopConversations();
    setState(prev => ({
      ...prev,
      phase: 'DAY_CONVERSATION',
      dayCount,
      logs: [...prev.logs, makeLog('SYSTEM', `${dayCount}日目の朝です。昼休みの議論が始まります。`)],
      timeRemaining: CONVERSATION_DURATION,
      // 会話履歴は全日分残す(以前はクリアして履歴が消えるバグがあった)
      votes: {},
    }));
    startConversations();
    startTimer(CONVERSATION_DURATION, () => {
      if (gen === genRef.current) fnsRef.current.transitionToVote();
    });
  }, [startConversations, startTimer, stopConversations]);

  const transitionToVote = useCallback(() => {
    const gen = genRef.current;
    resolvingRef.current = false;
    stopConversations();
    setState(prev => {
      if (prev.phase === 'DAY_VOTE') return prev;
      return {
        ...prev,
        phase: 'DAY_VOTE',
        logs: [...prev.logs, makeLog('SYSTEM', '人事評価会議が始まります。解雇したい社員に投票してください。')],
        timeRemaining: VOTE_DURATION,
        votes: {},
      };
    });
    // 人間が死亡済みならフル待機させず短縮
    const s = stateRef.current;
    const human = Object.values(s.players).find(p => !p.isAI && p.isAlive);
    const duration = human ? VOTE_DURATION : FAST_FORWARD_DURATION;
    startTimer(duration, () => {
      if (gen !== genRef.current) return;
      // 人間の未投票はランダム補完
      setState(prev => {
        const myId = findHumanId(prev.players);
        const me = myId ? prev.players[myId] : undefined;
        if (myId && me && me.isAlive && !prev.votes[myId]) {
          const targets = Object.values(prev.players).filter(p => p.isAlive && p.id !== myId);
          if (targets.length > 0) {
            return { ...prev, votes: { ...prev.votes, [myId]: pickRandom(targets).id } };
          }
        }
        return prev;
      });
      // state反映を待ってから解決( updater内の副作用を避ける )
      resolveTimeoutRef.current = setTimeout(() => {
        if (gen === genRef.current) fnsRef.current.resolveVote();
      }, 50);
    });
  }, [startTimer, stopConversations]);

  const resolveVote = useCallback(() => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    stopConversations();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const currentState = stateRef.current;
    if (currentState.phase !== 'DAY_VOTE') {
      resolvingRef.current = false;
      return;
    }
    const alivePlayers = Object.values(currentState.players).filter(p => p.isAlive);
    const allVotes: Record<string, string> = { ...currentState.votes };

    // AI votes (生存者のみ・有効ターゲットのみ)
    alivePlayers.forEach(p => {
      if (p.isAI && !allVotes[p.id]) {
        const targets = alivePlayers.filter(t => t.id !== p.id);
        if (targets.length > 0) allVotes[p.id] = pickRandom(targets).id;
      }
    });
    // 無効票(死亡者・自分への投票)を除去
    for (const [voterId, targetId] of Object.entries(allVotes)) {
      const voter = currentState.players[voterId];
      if (!voter || !voter.isAlive || !isValidTarget(currentState.players, voterId, targetId)) {
        delete allVotes[voterId];
      }
    }

    // Tally
    const tallies: Record<string, number> = {};
    Object.values(allVotes).forEach(tid => { tallies[tid] = (tallies[tid] || 0) + 1; });

    let maxVotes = 0;
    let candidate: string | null = null;
    let tie = false;
    for (const [tid, count] of Object.entries(tallies)) {
      if (count > maxVotes) { maxVotes = count; candidate = tid; tie = false; }
      else if (count === maxVotes) { tie = true; }
    }

    const newPlayers: Record<string, Player> = {};
    for (const [k, v] of Object.entries(currentState.players)) {
      newPlayers[k] = { ...v };
    }
    const extraLogs: GameLog[] = [];
    let executedId: string | null = null;
    let gossipAppend: GameLog[] = [];

    Object.entries(allVotes).forEach(([voterId, targetId]) => {
      const voterName = newPlayers[voterId]?.name || '???';
      const targetName = newPlayers[targetId]?.name || '???';
      extraLogs.push(makeLog('SYSTEM', `${voterName} → ${targetName}`));
    });

    let gossipResultAppend: GameState['gossipResults'] = [];

    if (candidate && !tie && newPlayers[candidate]) {
      const executedPlayer = newPlayers[candidate];
      newPlayers[candidate] = { ...executedPlayer, isAlive: false };
      executedId = candidate;
      extraLogs.push(makeLog('RESULT', `${executedPlayer.name} が解雇されました。`));

      const gossipPlayer = Object.values(newPlayers).find(p => p.role === 'GOSSIP' && p.isAlive);
      if (gossipPlayer) {
        const wasSpy = executedPlayer.role === 'SPY';
        gossipResultAppend = [{
          targetId: candidate,
          targetName: executedPlayer.name,
          wasSpy,
          dayNumber: currentState.dayCount,
        }];
        gossipAppend = [makeLog(
          'PRIVATE',
          wasSpy
            ? `お局情報: ${executedPlayer.name} はスパイだったわよ。`
            : `お局情報: ${executedPlayer.name} はスパイじゃなかったわ。`,
          gossipPlayer.id,
        )];
      }
    } else {
      extraLogs.push(makeLog('RESULT', '投票は同数でした。今回は誰も解雇されません。'));
    }

    const winner = checkWinCondition(newPlayers);
    const gen = genRef.current;

    setState(prev => ({
      ...prev,
      phase: 'VOTE_RESULT',
      players: newPlayers,
      votes: allVotes,
      logs: [...prev.logs, ...extraLogs, ...gossipAppend],
      lastExecutedId: executedId,
      winner,
      timeRemaining: REVEAL_DURATION,
      gossipResults: gossipResultAppend.length > 0
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
    setState(prev => {
      if (prev.phase === 'NIGHT_ACTION') return prev;
      return {
        ...prev,
        phase: 'NIGHT_ACTION',
        logs: [...prev.logs, makeLog('SYSTEM', '残業時間です。夜のアクションを実行してください。')],
        timeRemaining: NIGHT_DURATION,
        actions: {},
      };
    });
    const s = stateRef.current;
    const human = Object.values(s.players).find(p => !p.isAI && p.isAlive);
    const humanNeedsAction = !!human && ['SPY', 'HR', 'GA'].includes(human.role);
    const duration = humanNeedsAction ? NIGHT_DURATION : FAST_FORWARD_DURATION;
    startTimer(duration, () => {
      if (gen !== genRef.current) return;
      // 人間の未行動はランダム補完
      setState(prev => {
        const myId = findHumanId(prev.players);
        const me = myId ? prev.players[myId] : undefined;
        if (myId && me && me.isAlive && ['SPY', 'HR', 'GA'].includes(me.role) && !prev.actions[myId]) {
          const targets = Object.values(prev.players).filter(p => p.isAlive && p.id !== myId);
          if (targets.length > 0) {
            return { ...prev, actions: { ...prev.actions, [myId]: pickRandom(targets).id } };
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const currentState = stateRef.current;
    if (currentState.phase !== 'NIGHT_ACTION') {
      resolvingRef.current = false;
      return;
    }
    const alivePlayers = Object.values(currentState.players).filter(p => p.isAlive);
    const allActions: Record<string, string> = { ...currentState.actions };

    // AI night actions
    alivePlayers.forEach(p => {
      if (p.isAI && !allActions[p.id]) {
        const targets = alivePlayers.filter(t => t.id !== p.id);
        if (targets.length === 0) return;
        if (p.role === 'SPY') {
          const nonSpies = targets.filter(t => t.role !== 'SPY');
          allActions[p.id] = pickRandom(nonSpies.length > 0 ? nonSpies : targets).id;
        } else if (p.role === 'HR' || p.role === 'GA') {
          allActions[p.id] = pickRandom(targets).id;
        }
      }
    });

    // Auto-act for human if needed
    const myId = findHumanId(currentState.players);
    const myPlayer = myId ? currentState.players[myId] : undefined;
    if (myPlayer && myPlayer.isAlive && !allActions[myPlayer.id] && ['SPY', 'HR', 'GA'].includes(myPlayer.role)) {
      const targets = alivePlayers.filter(t => t.id !== myPlayer.id);
      if (targets.length > 0) allActions[myPlayer.id] = pickRandom(targets).id;
    }

    // 無効アクション除去(死亡者・自分指定)
    for (const [actorId, targetId] of Object.entries(allActions)) {
      const actor = currentState.players[actorId];
      if (!actor || !actor.isAlive || !isValidTarget(currentState.players, actorId, targetId)) {
        delete allActions[actorId];
      }
    }

    const newPlayers: Record<string, Player> = {};
    for (const [k, v] of Object.entries(currentState.players)) {
      newPlayers[k] = { ...v };
    }

    const extraLogs: GameLog[] = [];
    let attackedId: string | null = null;

    const spyActions = Object.entries(allActions).filter(([actorId]) => newPlayers[actorId]?.role === 'SPY');
    const spyTarget = spyActions.length > 0 ? spyActions[spyActions.length - 1][1] : null;

    const gaActions = Object.entries(allActions).filter(([actorId]) => newPlayers[actorId]?.role === 'GA');
    const guardTarget = gaActions.length > 0 ? gaActions[gaActions.length - 1][1] : null;

    const hrActions = Object.entries(allActions).filter(([actorId]) => newPlayers[actorId]?.role === 'HR');
    const divineTarget = hrActions.length > 0 ? hrActions[hrActions.length - 1][1] : null;

    if (spyTarget && newPlayers[spyTarget]) {
      const target = newPlayers[spyTarget];
      const isProtected = spyTarget === guardTarget;
      const isConsultant = target.role === 'CONSULTANT';

      if (!isProtected && !isConsultant) {
        newPlayers[spyTarget] = { ...target, isAlive: false };
        attackedId = spyTarget;
        extraLogs.push(makeLog('RESULT', `${target.name} が解雇(襲撃)されました。`));
      } else {
        extraLogs.push(makeLog('RESULT', '平穏な夜でした。被害者はいません。'));
      }
    } else {
      extraLogs.push(makeLog('RESULT', '平穏な夜でした。'));
    }

    let divAppend: DivinationResult[] = [];
    const divLogs: GameLog[] = [];
    if (divineTarget && newPlayers[divineTarget]) {
      const divinedPlayer = newPlayers[divineTarget];
      const isSpy = divinedPlayer.role === 'SPY';
      const hrPlayer = Object.values(newPlayers).find(p => p.role === 'HR' && p.isAlive);

      if (hrPlayer) {
        divAppend = [{
          targetId: divineTarget,
          targetName: divinedPlayer.name,
          isSpy,
          dayNumber: currentState.dayCount,
        }];
        divLogs.push(makeLog(
          'PRIVATE',
          isSpy
            ? `調査結果: ${divinedPlayer.name} はスパイです！`
            : `調査結果: ${divinedPlayer.name} はスパイではありません。`,
          hrPlayer.id,
        ));
      }
    }

    const winner = checkWinCondition(newPlayers);
    const gen = genRef.current;
    const nextDay = currentState.dayCount + 1;

    setState(prev => ({
      ...prev,
      phase: 'NIGHT_RESULT',
      players: newPlayers,
      actions: allActions,
      logs: [...prev.logs, ...extraLogs, ...divLogs],
      lastAttackedId: attackedId,
      winner,
      timeRemaining: REVEAL_DURATION,
      divinationResults: divAppend.length > 0 ? [...prev.divinationResults, ...divAppend] : prev.divinationResults,
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setState(prev => ({ ...prev, phase: 'GAME_OVER', timeRemaining: 0 }));
  }, [stopConversations]);

  // Update refs whenever functions change
  useEffect(() => {
    fnsRef.current = {
      transitionToDay,
      transitionToVote,
      transitionToNight,
      resolveVote,
      resolveNight,
      goGameOver,
    };
  }, [transitionToDay, transitionToVote, transitionToNight, resolveVote, resolveNight, goGameOver]);

  // ---- Public actions ----

  const startGame = useCallback((playerName: string, playerCount: number) => {
    const name = playerName.trim().slice(0, 10);
    const count = Math.min(12, Math.max(4, Math.floor(playerCount) || 4));
    if (!name) return;
    stopTimers();
    const gen = genRef.current;
    const roles = buildRoles(count);
    const aiNames = shuffle(AI_NAMES).slice(0, count - 1);
    const players: Record<string, Player> = {};

    const humanId = 'human-player';
    players[humanId] = {
      id: humanId, name, role: roles[0],
      isAlive: true, isHost: true, isAI: false,
    };

    for (let i = 1; i < count; i++) {
      const aiId = `ai-${i}`;
      players[aiId] = {
        id: aiId, name: aiNames[i - 1] ?? `社員${i}`, role: roles[i],
        isAlive: true, isHost: false, isAI: true,
      };
    }

    const logs: GameLog[] = [
      makeLog('SYSTEM', 'ゲーム開始！役職が配布されました。'),
      makeLog('SYSTEM', `あなたの役職は「${getRoleName(roles[0])}」です。`),
    ];

    // ENGINEERは相方を private で通知(単独の場合は出さない)
    if (roles[0] === 'ENGINEER') {
      const partners = Object.values(players).filter(p => p.role === 'ENGINEER' && p.id !== humanId);
      if (partners.length > 0) {
        logs.push(makeLog('PRIVATE', `相方のエンジニア: ${partners.map(p => p.name).join('、')}`, humanId));
      }
    }
    // ENGINEER同士(AI)の把握は表示上不要。GOSSIP/HRは結果パネルで開示。

    setState({
      phase: 'ROLE_REVEAL',
      players,
      dayCount: 1,
      timeRemaining: REVEAL_DURATION,
      logs,
      votes: {},
      actions: {},
      winner: null,
      lastExecutedId: null,
      lastAttackedId: null,
      divinationResults: [],
      gossipResults: [],
      currentConversations: [],
    });

    startTimer(REVEAL_DURATION, () => {
      if (gen === genRef.current) fnsRef.current.transitionToDay(1);
    });
  }, [stopTimers, startTimer]);

  const submitVote = useCallback((targetId: string) => {
    const s = stateRef.current;
    if (s.phase !== 'DAY_VOTE') return;
    const myId = findHumanId(s.players);
    if (!myId) return;
    const me = s.players[myId];
    if (!me || !me.isAlive) return;
    if (s.votes[myId]) return; // 二重投票防止
    if (!isValidTarget(s.players, myId, targetId)) return;
    if (resolvingRef.current) return;

    setState(prev => {
      if (prev.phase !== 'DAY_VOTE') return prev;
      const id = findHumanId(prev.players);
      if (!id) return prev;
      const p = prev.players[id];
      if (!p || !p.isAlive || prev.votes[id]) return prev;
      if (!isValidTarget(prev.players, id, targetId)) return prev;
      return { ...prev, votes: { ...prev.votes, [id]: targetId } };
    });
    // 即時解決(60秒待たせない)。updater外で一度だけ予約。
    if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
    const gen = genRef.current;
    resolveTimeoutRef.current = setTimeout(() => {
      if (gen === genRef.current) fnsRef.current.resolveVote();
    }, 600);
  }, []);

  const submitNightAction = useCallback((targetId: string) => {
    const s = stateRef.current;
    if (s.phase !== 'NIGHT_ACTION') return;
    const myId = findHumanId(s.players);
    if (!myId) return;
    const me = s.players[myId];
    if (!me || !me.isAlive) return;
    if (!['SPY', 'HR', 'GA'].includes(me.role)) return;
    if (s.actions[myId]) return;
    if (!isValidTarget(s.players, myId, targetId)) return;
    if (resolvingRef.current) return;

    setState(prev => {
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
    }, 600);
  }, []);

  const skipPhase = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'DAY_CONVERSATION') {
      const gen = genRef.current;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      stopConversations();
      // 世代を進めずに直接遷移(旧タイマー誤発火はgenチェックで防止済み)
      void gen;
      fnsRef.current.transitionToVote();
    } else if (s.phase === 'ROLE_REVEAL') {
      const gen = genRef.current;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      const day = s.dayCount || 1;
      fnsRef.current.transitionToDay(day);
      void gen;
    }
  }, [stopConversations]);

  const resetGame = useCallback(() => {
    stopTimers();
    setState(initialState());
  }, [stopTimers]);

  return [state, { startGame, submitVote, submitNightAction, skipPhase, resetGame }];
}
