'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card, PlayerAction, TableState } from '../types';
import { applyAction, createTable, decideAi, legalActions, startHand } from '../engine';
import { holdemAudio, type SeName } from '../audio';
import { CHARACTERS, pickLine, type CharId, type VoiceEvent } from '../characters';
import { blindsForHand, resolveSeatPosition, type HandReport, type SessionSummary, type TableConfig } from '../config';
import {
  fetchOnlineRoom,
  getCachedOnlineRoom,
  rotateTableForHero,
  sendOnlineRoomStamp,
  subscribeRoomBus,
  syncOnlineRoomState,
  type OnlineRoomState,
} from '../onlineClient';
import type { HoldemSettings } from '../profile';
import { fmt, handTitleEn, inHandSeats, runoutEquity, STAMPS, thinkDelay, type BadgeType } from './tableUtils';

export type Phase = 'dealing' | 'playing' | 'animating' | 'handOver' | 'sessionOver';

export interface SeatBadge {
  type: BadgeType;
  amount: number;
  key: number;
}
export interface SeatBubble {
  text: string;
  key: number;
  stamp?: boolean;
}
export interface CutInData {
  key: number;
  charId: CharId;
  variant: 'allin' | 'win';
  title: string;
  subtitle: string;
  line: string;
}
export interface Toast {
  id: number;
  text: string;
  sub?: string;
  tone: 'gold' | 'info' | 'danger';
}
export interface HandHistoryItem {
  handNumber: number;
  winnerNames: string;
  handName: string;
  pot: number;
  heroNet: number;
  board: Card[];
  heroHole: Card[];
}
export interface ResultInfo {
  title: string;
  handName: string;
  pot: number;
  heroWon: boolean;
  heroNet: number;
  heroInHand: boolean;
  winners: number[];
  pots: { label: string; amount: number; winners: string }[];
}
export interface SessionEndInfo {
  summary: SessionSummary;
  placement: number;
}
export type PreAction = 'none' | 'checkFold' | 'autoCheck' | 'callCurrent';

const EVENT_FOR: Record<BadgeType, VoiceEvent> = {
  check: 'check',
  call: 'call',
  bet: 'raise',
  raise: 'raise',
  allin: 'allin',
  fold: 'fold',
};
const SE_FOR: Record<BadgeType, SeName> = {
  check: 'check',
  call: 'chip',
  bet: 'bet',
  raise: 'bet',
  allin: 'allin',
  fold: 'fold',
};
const VOICE_CHANCE: Record<BadgeType, number> = {
  check: 0.3,
  call: 0.35,
  bet: 0.7,
  raise: 0.8,
  allin: 1,
  fold: 0.45,
};
const STAMP_REPLY: Record<string, VoiceEvent> = {
  hello: 'greet',
  nice: 'win',
  wow: 'think',
  strong: 'bigWin',
  thanks: 'select',
  think: 'think',
  dm: 'lose',
  fight: 'raise',
};

function classify(prev: TableState, next: TableState, seat: number): { type: BadgeType; added: number } {
  const ps = prev.seats[seat];
  const ns = next.seats[seat];
  const added = Math.max(0, ns.committed - ps.committed);
  if (ns.folded && !ps.folded) return { type: 'fold', added: 0 };
  if (ns.allIn && !ps.allIn) return { type: 'allin', added };
  if (added === 0) return { type: 'check', added };
  if (ps.bet + added <= prev.currentBet) return { type: 'call', added };
  return { type: prev.currentBet === 0 ? 'bet' : 'raise', added };
}

function buildInitial(config: TableConfig, heroName: string): TableState {
  if (config.online) {
    const cached = getCachedOnlineRoom(config.online.roomId);
    const rawTable = config.online.initialTableState ?? cached?.tableState ?? null;
    const members = config.online.members ?? cached?.members ?? [];
    const mySeat =
      config.online.mySeat ??
      Math.max(
        0,
        members.findIndex((m) => m.accountId === config.online!.accountId),
      );
    if (rawTable && rawTable.seats && rawTable.seats.length >= 2) {
      const rotated = rotateTableForHero(rawTable, mySeat);
      const n = rotated.seats.length;
      return {
        ...rotated,
        seats: rotated.seats.map((s, vSeat) => {
          const rawIdx = (vSeat + mySeat) % n;
          const mem = members[rawIdx];
          return mem
            ? { ...s, name: mem.playerName, charId: mem.charId as CharId, isHuman: vSeat === 0 }
            : s;
        }),
      };
    }
  }
  const ids: CharId[] = [config.hero, ...config.opponents];
  const players = ids.map((id, i) => ({
    charId: id,
    name: i === 0 ? heroName : CHARACTERS[id].name,
    isHuman: i === 0,
    stack: config.startingStack,
  }));
  const { blinds } = blindsForHand(config, 1);
  const table = createTable({ players, blinds, button: Math.floor(Math.random() * players.length) });
  return startHand(table, { blinds });
}

export interface UseHoldemTableArgs {
  config: TableConfig;
  heroName: string;
  settings: HoldemSettings;
  onHandComplete: (r: HandReport) => void;
  onExit: (s: SessionSummary) => void;
  onRetry?: (s: SessionSummary) => void;
  /** menu open: AI turns and auto-continue pause */
  paused: boolean;
}

export function useHoldemTable({ config, heroName, settings, onHandComplete, onExit, onRetry, paused }: UseHoldemTableArgs) {
  const [initial] = useState(() => buildInitial(config, heroName));
  const stateRef = useRef<TableState>(initial);
  const [view, setView] = useState<TableState>(initial);
  const [phase, setPhaseState] = useState<Phase>('dealing');
  const phaseRef = useRef<Phase>('dealing');
  const [boardShown, setBoardShown] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [badges, setBadges] = useState<Record<number, SeatBadge>>({});
  const [bubbles, setBubbles] = useState<Record<number, SeatBubble>>({});
  const [thinking, setThinking] = useState<number | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [potFly, setPotFly] = useState<number[] | null>(null);
  const [payoutPending, setPayoutPending] = useState(false);
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const [winners, setWinners] = useState<number[]>([]);
  const [equities, setEquities] = useState<Record<number, number> | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [cutIn, setCutIn] = useState<CutInData | null>(null);
  const [fxKey, setFxKey] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<HandHistoryItem[]>([]);
  const [sessionEnd, setSessionEnd] = useState<SessionEndInfo | null>(null);
  const [dealKey, setDealKey] = useState(1);
  const [heroPeeked, setHeroPeeked] = useState(false);
  const [level, setLevel] = useState(() => blindsForHand(config, 1).level);
  const levelRef = useRef(level);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [preAction, setPreAction] = useState<PreAction>('none');

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const cbRef = useRef({ onHandComplete, onExit, onRetry });
  cbRef.current = { onHandComplete, onExit, onRetry };

  const aliveRef = useRef(true);
  const busyRef = useRef(true);
  const timersRef = useRef(new Set<number>());
  const keyRef = useRef(1);
  const rebuysRef = useRef(0);
  const handsPlayedRef = useRef(0);
  const cutInResolveRef = useRef<(() => void) | null>(null);
  const lastStampRef = useRef(0);
  const handTrackRef = useRef({
    vpip: false,
    pfr: false,
    threeBet: false,
    threeBetOpportunity: false,
    sawFlop: false,
    betsAndRaises: 0,
    calls: 0,
  });
  const onlineSeqRef = useRef(0);
  const mySeatRef = useRef(config.online?.mySeat ?? 0);
  const seenStampIdsRef = useRef(new Set<string>());
  const pendingRoomRef = useRef<OnlineRoomState | null>(null);
  const humanSeatsRef = useRef<Set<number>>((() => {
    const set = new Set<number>([0]);
    if (config.online?.members) {
      const members = config.online.members;
      const n = members.length;
      const myIdx = config.online.mySeat ?? 0;
      members.forEach((m, rawIdx) => {
        if (!m.isBot && n > 0) {
          set.add(((rawIdx - myIdx) % n + n) % n);
        }
      });
    }
    return set;
  })());

  const nextKey = () => ++keyRef.current;

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      if (aliveRef.current) fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const sleep = useCallback((ms: number) => new Promise<void>((resolve) => later(ms, resolve)), [later]);

  const se = useCallback((n: SeName) => holdemAudio.se(n), []);

  const toast = useCallback(
    (text: string, sub?: string, tone: Toast['tone'] = 'info') => {
      const id = nextKey();
      setToasts((t) => [...t.slice(-2), { id, text, sub, tone }]);
      later(2800, () => setToasts((t) => t.filter((x) => x.id !== id)));
    },
    [later],
  );

  const bubble = useCallback(
    (seat: number, text: string, ms = 2600, stamp = false) => {
      const key = nextKey();
      setBubbles((b) => ({ ...b, [seat]: { text, key, stamp } }));
      later(ms, () =>
        setBubbles((b) => {
          if (b[seat]?.key !== key) return b;
          const rest = { ...b };
          delete rest[seat];
          return rest;
        }),
      );
    },
    [later],
  );

  const speak = useCallback(
    (seat: number, ev: VoiceEvent, chance = 1, showBubble = true) => {
      const s = stateRef.current.seats[seat];
      if (!s) return;
      const id = s.charId as CharId;
      const ch = CHARACTERS[id];
      if (!ch) return;
      const line = pickLine(id, ev);
      if (showBubble) bubble(seat, line);
      if (Math.random() < chance) {
        const st = settingsRef.current;
        holdemAudio.speak(line, {
          pitch: ch.voicePitch,
          rate: ch.voiceRate,
          gender: ch.voiceGender,
          enabled: st.voiceOn,
          charId: id,
          event: ev,
        });
      }
    },
    [bubble],
  );

  const showCutIn = useCallback(
    (data: Omit<CutInData, 'key'>, ms: number) =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          cutInResolveRef.current = null;
          setCutIn(null);
          resolve();
        };
        cutInResolveRef.current = finish;
        setCutIn({ ...data, key: nextKey() });
        later(ms, finish);
      }),
    [later],
  );

  const dismissCutIn = useCallback(() => {
    cutInResolveRef.current?.();
  }, []);

  /* ------------------------------ sequences ------------------------------ */

  const dealSequence = useCallback(
    async (st: TableState) => {
      const n = st.seats.filter((s) => !s.sittingOut).length;
      se('shuffle');
      await sleep(250);
      for (let i = 0; i < n * 2; i++) {
        se('deal');
        await sleep(95);
      }
      await sleep(420);
      if (!settingsRef.current.squeeze) setHeroPeeked(true);
    },
    [se, sleep],
  );

  const dealBoard = useCallback(
    async (from: number, to: number) => {
      await sleep(220);
      for (let i = from + 1; i <= to; i++) {
        setBoardShown(i);
        se('deal');
        later(220, () => se('flip'));
        await sleep(180);
      }
      await sleep(420);
    },
    [later, se, sleep],
  );

  const runoutSequence = useCallback(
    async (from: number, next: TableState) => {
      const seats = inHandSeats(next);
      const players = seats.map((s) => ({ seat: s, hole: next.seats[s].holeCards }));
      setRevealed(seats);
      setBanner('ALL-IN SHOWDOWN');
      holdemAudio.playBgm('tension');
      se('reveal');
      setEquities(runoutEquity(players, next.board.slice(0, from)));
      await sleep(1600);
      setBanner(null);
      let count = from;
      for (const t of [3, 4, 5]) {
        if (t <= from || t > next.board.length) continue;
        await sleep(t === 5 ? 900 : 500);
        for (let i = count + 1; i <= t; i++) {
          setBoardShown(i);
          se('deal');
          later(220, () => se('flip'));
          if (i < t) await sleep(180);
        }
        count = t;
        await sleep(700);
        setEquities(runoutEquity(players, next.board.slice(0, t)));
      }
      await sleep(500);
    },
    [later, se, sleep],
  );

  const showdownSequence = useCallback(
    async (next: TableState) => {
      const r = next.result;
      if (!r) return;
      const hero = next.seats[0];
      const bb = next.blinds.bb;
      if (r.showdown) {
        const show = r.reveals.map((x) => x.seat);
        setRevealed((prev) => Array.from(new Set([...prev, ...show])));
        se('reveal');
        await sleep(950);
        const ids = new Set<string>();
        r.reveals.filter((x) => r.winners.includes(x.seat)).forEach((x) => x.hand.best5.forEach((c) => ids.add(c.id)));
        setHighlight(Array.from(ids));
      }
      setEquities(null);
      setWinners(r.winners);
      const pot = r.pots.reduce((a, p) => a + p.amount, 0) || next.potTotal;
      const names = r.winners.map((s) => next.seats[s].name).join(' & ');
      const heroWon = r.winners.includes(0);
      const heroInHand = !hero.folded && !hero.sittingOut && hero.holeCards.length > 0;
      const heroNet = (r.payouts[0] ?? 0) - hero.committed;
      const heroReveal = r.reveals.find((x) => x.seat === 0);
      const heroCat = heroReveal?.hand.category ?? -1;
      setResult({
        title: `${names} の勝利！`,
        handName: r.headline,
        pot,
        heroWon,
        heroNet,
        heroInHand,
        winners: r.winners,
        pots: r.pots.map((p) => ({
          label: p.label,
          amount: p.amount,
          winners: p.winners.map((s) => next.seats[s].name).join(' & '),
        })),
      });
      se(heroWon ? 'win' : heroInHand && r.showdown ? 'lose' : 'chips');
      const w0 = r.winners[0];
      const bigPot = pot >= bb * 25;
      if (w0 !== undefined) speak(w0, bigPot ? 'bigWin' : 'win', 1);
      if (!heroWon && heroInHand && r.showdown) later(900, () => speak(0, 'lose', 0, true));
      await sleep(800);
      setPotFly(r.winners);
      se('potSweep');
      await sleep(700);
      setPayoutPending(false);
      setPotFly(null);
      se('chips');

      const bigHero = heroWon && (heroCat >= 4 || bigPot || hero.allIn);
      if (bigHero) {
        const title =
          heroCat >= 4 && heroReveal ? `${handTitleEn(heroReveal.hand)}!!` : hero.allIn ? 'ALL-IN WIN!!' : 'BIG POT WIN!!';
        holdemAudio.playBgm('victory');
        se('bigWin');
        if (!settingsRef.current.reducedFx) setFxKey(nextKey());
        await showCutIn(
          {
            charId: hero.charId as CharId,
            variant: 'win',
            title,
            subtitle: `${r.headline || 'POT'}  +${fmt(Math.max(0, heroNet))}`,
            line: pickLine(hero.charId as CharId, 'bigWin'),
          },
          3400,
        );
        later(3500, () => holdemAudio.playBgm('table'));
      } else {
        holdemAudio.playBgm('table');
      }

      handsPlayedRef.current += 1;
      const ht = handTrackRef.current;
      const report: HandReport = {
        handNumber: next.handNumber,
        heroWon,
        heroNet,
        potTotal: pot,
        bigBlind: bb,
        wentToShowdown: r.showdown,
        heroAllIn: hero.allIn,
        heroHandCategory: heroCat,
        heroHandName: heroReveal?.hand.nameJa ?? '',
        opponentsInHand:
          heroWon && r.showdown
            ? r.reveals.filter((x) => x.seat !== 0 && !r.winners.includes(x.seat)).map((x) => next.seats[x.seat].charId as CharId)
            : [],
        position: resolveSeatPosition(next.button, next.seats.length, 0),
        vpip: ht.vpip,
        pfr: ht.pfr,
        threeBet: ht.threeBet,
        threeBetOpportunity: ht.threeBetOpportunity,
        sawFlop: ht.sawFlop || (next.board.length >= 3 && heroInHand),
        betsAndRaises: ht.betsAndRaises,
        calls: ht.calls,
        holeCards: hero.holeCards.map((c) => c.id),
        board: next.board.map((c) => c.id),
        isOnline: Boolean(config.online),
      };
      cbRef.current.onHandComplete(report);
      setHistory((h) =>
        [
          {
            handNumber: next.handNumber,
            winnerNames: names,
            handName: r.headline,
            pot,
            heroNet,
            board: next.board,
            heroHole: hero.holeCards,
          },
          ...h,
        ].slice(0, 15),
      );

      // busts & session end
      if (!config.autoRebuy) {
        next.seats.forEach((s) => {
          if (s.seat !== 0 && s.stack <= 0 && s.committed > 0) toast(`${s.name} が脱落`, 'ELIMINATED', 'danger');
        });
        const alive = next.seats.filter((s) => s.stack > 0);
        let placement = 0;
        if (next.seats[0].stack <= 0) placement = alive.length + 1;
        else if (alive.length === 1) placement = 1;
        if (placement > 0) {
          await sleep(1500);
          holdemAudio.playBgm(placement === 1 ? 'victory' : 'table');
          se(placement === 1 ? 'bigWin' : 'lose');
          if (placement === 1 && !settingsRef.current.reducedFx) setFxKey(nextKey());
          setSessionEnd({
            placement,
            summary: {
              mode: config.mode,
              handsPlayed: handsPlayedRef.current,
              netChips: next.seats[0].stack - config.startingStack,
              placement,
              players: next.seats.length,
              completed: true,
              isOnline: Boolean(config.online),
            },
          });
          setPhase('sessionOver');
          return;
        }
      } else {
        if (next.seats[0].stack <= 0) {
          toast('チップがなくなりました！', `無料リバイで ${fmt(config.startingStack)} チップを補充できます`, 'danger');
          bubble(0, 'まだ終わってないわ！無料リバイで新しいスタックを補充して巻き返しましょ！', 5000);
          setPhase('handOver');
          setCountdown(null);
          return;
        }
        if (next.seats.slice(1).every((s) => s.stack <= 0)) {
          toast('テーブル全員を飛ばしました！', '新たなチャレンジャーがフルスタックで着席します', 'gold');
        }
      }
      setPhase('handOver');
      setCountdown(5);
    },
    [bubble, config.autoRebuy, config.mode, config.online, config.startingStack, later, se, setPhase, showCutIn, sleep, speak, toast],
  );

  const processAction = useCallback(
    async (seat: number, action: PlayerAction, fromRemote = false) => {
      const prev = stateRef.current;
      if (prev.toAct !== seat || busyRef.current || phaseRef.current !== 'playing') return;
      busyRef.current = true;
      setPhase('animating');
      setThinking(null);
      let next: TableState;
      try {
        next = applyAction(prev, action);
      } catch {
        busyRef.current = false;
        setPhase('playing');
        return;
      }
      stateRef.current = next;
      const { type, added } = classify(prev, next, seat);
      const ps = prev.seats[seat];

      // Track hero stats for Pro Analytics
      if (seat === 0) {
        const ht = handTrackRef.current;
        const isAggressive =
          type === 'bet' ||
          type === 'raise' ||
          (type === 'allin' && ps.bet + added > prev.currentBet);
        if (prev.street === 'preflop') {
          const facingRaise = prev.currentBet > prev.blinds.bb;
          if (facingRaise) ht.threeBetOpportunity = true;
          if (type === 'call' || type === 'bet' || type === 'raise' || type === 'allin') {
            ht.vpip = true;
          }
          if (isAggressive) {
            ht.pfr = true;
            if (facingRaise) ht.threeBet = true;
          }
        }
        if (isAggressive) ht.betsAndRaises += 1;
        else if (type === 'call' || (type === 'allin' && added > 0)) ht.calls += 1;
      }
      if (next.board.length >= 3 && !next.seats[0].folded && !next.seats[0].sittingOut) {
        handTrackRef.current.sawFlop = true;
      }

      // Broadcast action to online room if local or host-driven bot
      if (config.online && !fromRemote) {
        const n = next.seats.length;
        const mySeat = mySeatRef.current;
        const rawSeat = (seat + mySeat) % n;
        const rawNext = rotateTableForHero(next, (n - mySeat) % n);
        const nextSeq = onlineSeqRef.current + 1;
        onlineSeqRef.current = nextSeq;
        void syncOnlineRoomState(config.online.roomId, config.online.accountId, {
          tableState: rawNext,
          actionSeq: nextSeq,
          lastAction: {
            seq: nextSeq,
            seat: rawSeat,
            action,
            actorAccountId: config.online.accountId,
            timestamp: Date.now(),
          },
        });
      }
      const badgeAmount =
        type === 'bet' || type === 'raise' || type === 'call' || type === 'allin'
          ? ps.bet + added
          : added;
      setBadges((b) => ({
        ...b,
        [seat]: { type, amount: badgeAmount, key: nextKey() },
      }));
      se(SE_FOR[type]);
      if (type === 'call' || type === 'bet' || type === 'raise') later(120, () => se('chips'));
      const isHero = seat === 0;
      speak(seat, EVENT_FOR[type], VOICE_CHANCE[type] * (isHero ? 0.6 : 1), !isHero || Math.random() < 0.6);

      const streetChanged = next.board.length !== prev.board.length || next.street !== prev.street || !!next.result;
      const betIncreased = !streetChanged && next.currentBet > prev.currentBet;
      if (streetChanged || betIncreased) {
        setPreAction('none');
      }
      const ns = next.seats[seat];
      const mid: TableState = {
        ...prev,
        toAct: null,
        potTotal: prev.potTotal + added,
        seats: prev.seats.map((s) =>
          s.seat === seat
            ? { ...s, bet: s.bet + added, stack: s.stack - added, committed: s.committed + added, folded: ns.folded, allIn: ns.allIn, lastAction: ns.lastAction }
            : s,
        ),
      };

      if (type === 'allin') {
        setView(mid);
        se('cutin');
        if (settingsRef.current.reducedFx) await sleep(600);
        else
          await showCutIn(
            {
              charId: ns.charId as CharId,
              variant: 'allin',
              title: 'ALL-IN!!',
              subtitle: ns.name,
              line: pickLine(ns.charId as CharId, 'allin'),
            },
            1400,
          );
      }

      if (!streetChanged) {
        setView(next);
        await sleep(280);
        busyRef.current = false;
        setPhase('playing');
        return;
      }

      setView(mid);
      await sleep(type === 'allin' ? 250 : 520);
      if (mid.seats.some((s) => s.bet > 0)) {
        setSweeping(true);
        se('potSweep');
        await sleep(480);
      }
      setBadges((b) => {
        const keep: Record<number, SeatBadge> = {};
        Object.entries(b).forEach(([k, v]) => {
          if (v.type === 'allin' || v.type === 'fold') keep[Number(k)] = v;
        });
        return keep;
      });
      setSweeping(false);
      if (next.result) setPayoutPending(true);
      setView(next);

      const grew = next.board.length > prev.board.length;
      if (grew && next.result?.showdown) await runoutSequence(prev.board.length, next);
      else if (grew) await dealBoard(prev.board.length, next.board.length);
      else setBoardShown(next.board.length);

      if (next.result) {
        await showdownSequence(next);
        return;
      }
      busyRef.current = false;
      setPhase('playing');
    },
    [config.online, dealBoard, later, runoutSequence, se, setPhase, showCutIn, showdownSequence, sleep, speak],
  );

  const nextHand = useCallback(async () => {
    if (phaseRef.current !== 'handOver') return;
    setPhase('dealing');
    setCountdown(null);
    handTrackRef.current = {
      vpip: false,
      pfr: false,
      threeBet: false,
      threeBetOpportunity: false,
      sawFlop: false,
      betsAndRaises: 0,
      calls: 0,
    };
    const cur = stateRef.current;
    const handNo = cur.handNumber + 1;
    const { blinds, level: lv } = blindsForHand(config, handNo);
    if (config.autoRebuy) {
      cur.seats.forEach((s) => {
        if (s.stack > 0) return;
        if (s.seat === 0) rebuysRef.current += 1;
        toast(`${s.name} がリバイ`, `REBUY ${fmt(config.startingStack)}`, 'info');
      });
    }
    const next = startHand(cur, { blinds, rebuyTo: config.autoRebuy ? config.startingStack : undefined });
    stateRef.current = next;
    if (config.online) {
      const n = next.seats.length;
      const mySeat = mySeatRef.current;
      const rawNext = rotateTableForHero(next, (n - mySeat) % n);
      const nextSeq = onlineSeqRef.current + 1;
      onlineSeqRef.current = nextSeq;
      void syncOnlineRoomState(config.online.roomId, config.online.accountId, {
        tableState: rawNext,
        actionSeq: nextSeq,
        lastAction: null,
      });
    }
    setRevealed([]);
    setBadges({});
    setHighlight(null);
    setWinners([]);
    setEquities(null);
    setResult(null);
    setPotFly(null);
    setPayoutPending(false);
    setPreAction('none');
    setHeroPeeked(false);
    setBoardShown(0);
    setView(next);
    setDealKey(nextKey());
    if (lv !== levelRef.current) {
      levelRef.current = lv;
      setLevel(lv);
      se('levelUp');
      toast('BLIND LEVEL UP', `Lv.${lv}  ${blinds.sb}/${blinds.bb}${blinds.ante ? ` (ante ${blinds.ante})` : ''}`, 'gold');
    }
    holdemAudio.playBgm('table');
    await dealSequence(next);
    busyRef.current = false;
    setPhase('playing');
  }, [config, dealSequence, se, setPhase, toast]);

  /* ------------------------------ effects ------------------------------ */

  // mount: intro + first deal
  useEffect(() => {
    aliveRef.current = true;
    const timers = timersRef.current;
    let cancelled = false;
    (async () => {
      holdemAudio.playBgm('table');
      const opps = stateRef.current.seats.filter((s) => !s.isHuman);
      const greeter = opps[Math.floor(Math.random() * opps.length)];
      await sleep(350);
      if (cancelled) return;
      if (greeter) speak(greeter.seat, 'greet', 1);
      await dealSequence(stateRef.current);
      if (cancelled) return;
      busyRef.current = false;
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
      aliveRef.current = false;
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
      holdemAudio.stopVoice();
    };
  }, [dealSequence, setPhase, sleep, speak]);

  // AI turns (in online rooms, remote human seats wait for remote actions; non-host clients wait for host bot actions)
  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    const s = view.toAct;
    if (s === null) return;
    const seat = stateRef.current.seats[s];
    if (!seat || s === 0) return;
    const isRemoteHuman = Boolean(config.online && humanSeatsRef.current.has(s));
    const isRemoteDrivenBot = Boolean(config.online && mySeatRef.current !== 0 && !isRemoteHuman);
    setThinking(s);
    const delay = isRemoteHuman ? 24000 : isRemoteDrivenBot ? 9000 : thinkDelay(settingsRef.current.speed);
    const thinkLine =
      !isRemoteHuman && !isRemoteDrivenBot && delay > 1300 && Math.random() < 0.25
        ? window.setTimeout(() => speak(s, 'think', 0), 400)
        : 0;
    const t = window.setTimeout(() => {
      const st = stateRef.current;
      if (st.toAct !== s) return;
      if (isRemoteHuman) {
        const leg = legalActions(st);
        void processAction(s, { type: leg.canCheck ? 'check' : 'fold' });
        return;
      }
      const dec = decideAi(st, CHARACTERS[seat.charId as CharId].ai);
      void processAction(s, dec.action);
    }, delay);
    return () => {
      window.clearTimeout(t);
      if (thinkLine) window.clearTimeout(thinkLine);
    };
  }, [config.online, phase, paused, view.toAct, view.handNumber, processAction, speak]);

  // Online Room live sync (actions, initial state, stamps, member names)
  useEffect(() => {
    const online = config.online;
    if (!online) return;

    const applyRoomUpdate = (room: OnlineRoomState) => {
      const members = room.members || [];
      const n = stateRef.current.seats.length;
      const myIdx = Math.max(
        0,
        members.findIndex((m) => m.accountId === online.accountId),
      );
      mySeatRef.current = myIdx;

      const prevHumans = humanSeatsRef.current;
      const nextHumanViewSeats = new Set<number>([0]);
      members.forEach((m, rawIdx) => {
        if (!m.isBot && rawIdx < n) {
          const vSeat = ((rawIdx - myIdx) % n + n) % n;
          if (vSeat !== 0 && !prevHumans.has(vSeat)) {
            toast(`${m.playerName} さんが着席しました！`, `SEAT #${rawIdx + 1} · ONLINE`, 'gold');
          }
          nextHumanViewSeats.add(vSeat);
        }
      });
      humanSeatsRef.current = nextHumanViewSeats;

      // Sync seat names & avatars from room members
      const cur = stateRef.current;
      let namesChanged = false;
      const updatedSeats = cur.seats.map((seatObj, vSeat) => {
        const rawIdx = (vSeat + myIdx) % n;
        const mem = members[rawIdx];
        if (!mem) return seatObj;
        if (seatObj.name !== mem.playerName || seatObj.charId !== mem.charId) {
          namesChanged = true;
          return { ...seatObj, name: mem.playerName, charId: mem.charId };
        }
        return seatObj;
      });
      if (namesChanged) {
        const patched = { ...cur, seats: updatedSeats };
        stateRef.current = patched;
        setView(patched);
      }

      // Display incoming remote stamps
      if (Array.isArray(room.stamps)) {
        for (const stmp of room.stamps) {
          if (!seenStampIdsRef.current.has(stmp.id)) {
            seenStampIdsRef.current.add(stmp.id);
            if (stmp.accountId !== online.accountId) {
              const vSeat = ((stmp.seat - myIdx) % n + n) % n;
              se('stamp');
              bubble(vSeat, stmp.text, 2400, true);
            }
          }
        }
      }

      // Sync remote action or new hand state
      if (room.actionSeq > onlineSeqRef.current) {
        if (busyRef.current) {
          pendingRoomRef.current = room;
          return;
        }
        const prevSeq = onlineSeqRef.current;
        onlineSeqRef.current = room.actionSeq;
        pendingRoomRef.current = null;

        if (
          room.lastAction &&
          room.lastAction.actorAccountId !== online.accountId &&
          room.lastAction.seq > prevSeq
        ) {
          const vSeat = ((room.lastAction.seat - myIdx) % n + n) % n;
          if (stateRef.current.toAct === vSeat && phaseRef.current === 'playing') {
            void processAction(vSeat, room.lastAction.action, true);
            return;
          }
        }

        if (room.tableState) {
          const rotated = rotateTableForHero(room.tableState, myIdx);
          const patchedSeats = rotated.seats.map((s, vSeat) => {
            const rawIdx = (vSeat + myIdx) % n;
            const mem = members[rawIdx];
            return mem ? { ...s, name: mem.playerName, charId: mem.charId } : s;
          });
          const nextState: TableState = { ...rotated, seats: patchedSeats };
          if (nextState.handNumber > stateRef.current.handNumber) {
            stateRef.current = nextState;
            setRevealed([]);
            setBadges({});
            setHighlight(null);
            setWinners([]);
            setEquities(null);
            setResult(null);
            setPotFly(null);
            setPayoutPending(false);
            setPreAction('none');
            setCountdown(null);
            setBoardShown(nextState.board.length);
            setView(nextState);
            setDealKey(nextKey());
            setPhase('playing');
          } else {
            stateRef.current = nextState;
            setView(nextState);
            setBoardShown(nextState.board.length);
          }
        }
      }
    };

    // Initial room sync: if host and room has no tableState yet, publish initial state
    void fetchOnlineRoom(online.roomId).then((room) => {
      if (!room) return;
      if (!room.tableState) {
        onlineSeqRef.current = room.actionSeq + 1;
        void syncOnlineRoomState(online.roomId, online.accountId, {
          tableState: stateRef.current,
          actionSeq: onlineSeqRef.current,
        });
      }
      applyRoomUpdate(room);
    });

    const unsub = subscribeRoomBus(online.roomId, applyRoomUpdate);
    const pollId = window.setInterval(async () => {
      if (!busyRef.current && pendingRoomRef.current) {
        const queued = pendingRoomRef.current;
        pendingRoomRef.current = null;
        applyRoomUpdate(queued);
      }
      const latest = await fetchOnlineRoom(online.roomId);
      if (latest) applyRoomUpdate(latest);
    }, 1100);

    return () => {
      unsub();
      window.clearInterval(pollId);
    };
  }, [bubble, config.online, processAction, se, setPhase, toast]);

  // hero turn cue + pre-actions
  useEffect(() => {
    if (phase !== 'playing' || view.toAct !== 0) return;
    if (preAction === 'none') {
      se('tick');
      return;
    }
    const t = window.setTimeout(() => {
      const st = stateRef.current;
      if (st.toAct !== 0 || phaseRef.current !== 'playing') return;
      const legal = legalActions(st);
      setPreAction('none');
      if (preAction === 'checkFold') {
        void processAction(0, { type: legal.canCheck ? 'check' : 'fold' });
      } else if (preAction === 'autoCheck') {
        if (legal.canCheck) void processAction(0, { type: 'check' });
        else se('tick');
      } else if (preAction === 'callCurrent') {
        if (legal.canCheck) void processAction(0, { type: 'check' });
        else if (legal.canCall) void processAction(0, { type: 'call' });
        else se('tick');
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [phase, view.toAct, view.handNumber, preAction, processAction, se]);

  // auto-continue countdown
  useEffect(() => {
    if (phase !== 'handOver' || countdown === null || paused) return;
    if (countdown <= 0) {
      void nextHand();
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [phase, countdown, paused, nextHand]);

  /* ------------------------------ actions ------------------------------ */

  const heroAct = useCallback((a: PlayerAction) => void processAction(0, a), [processAction]);

  const cancelAuto = useCallback(() => setCountdown(null), []);

  const peek = useCallback(() => {
    setHeroPeeked((p) => {
      if (!p) holdemAudio.se('flip');
      return true;
    });
  }, []);

  const sendStamp = useCallback(
    (id: string) => {
      const now = Date.now();
      if (now - lastStampRef.current < 1200) return;
      lastStampRef.current = now;
      const st = STAMPS.find((x) => x.id === id);
      if (!st) return;
      se('stamp');
      bubble(0, `${st.emoji} ${st.text}`, 2200, true);
      if (config.online) {
        void sendOnlineRoomStamp(
          config.online.roomId,
          config.online.accountId,
          heroName,
          mySeatRef.current,
          st.id,
          `${st.emoji} ${st.text}`,
        );
      }
      if (Math.random() < 0.6) {
        const opps = stateRef.current.seats.filter((s) => !s.isHuman && !s.sittingOut);
        const who = opps[Math.floor(Math.random() * opps.length)];
        if (who) later(900 + Math.random() * 700, () => speak(who.seat, STAMP_REPLY[id] ?? 'think', 0.3));
      }
    },
    [bubble, config.online, heroName, later, se, speak],
  );

  const leaveTable = useCallback(() => {
    const st = stateRef.current;
    const alive = st.seats.filter((s) => s.stack > 0).length;
    cbRef.current.onExit({
      mode: config.mode,
      handsPlayed: handsPlayedRef.current,
      netChips: st.seats[0].stack - config.startingStack * (1 + rebuysRef.current),
      placement: config.autoRebuy ? 0 : Math.max(1, alive),
      players: st.seats.length,
      completed: false,
      isOnline: Boolean(config.online),
    });
  }, [config.autoRebuy, config.mode, config.online, config.startingStack]);

  const finishSession = useCallback(() => {
    if (sessionEnd) cbRef.current.onExit(sessionEnd.summary);
  }, [sessionEnd]);

  const retrySession = useCallback(() => {
    if (sessionEnd) {
      if (cbRef.current.onRetry) cbRef.current.onRetry(sessionEnd.summary);
      else cbRef.current.onExit(sessionEnd.summary);
    }
  }, [sessionEnd]);

  const topUpHero = useCallback(() => {
    if (!config.autoRebuy || phaseRef.current !== 'handOver') return;
    const cur = stateRef.current;
    const heroSeat = cur.seats[0];
    if (!heroSeat || heroSeat.stack >= config.startingStack) return;
    const added = config.startingStack - heroSeat.stack;
    rebuysRef.current += added / config.startingStack;
    const next: TableState = {
      ...cur,
      seats: cur.seats.map((s) =>
        s.seat === 0 ? { ...s, stack: config.startingStack, sittingOut: false } : s,
      ),
    };
    stateRef.current = next;
    setView(next);
    se('chips');
    toast('チップを満額補充しました', `+${fmt(added)} → ${fmt(config.startingStack)}`, 'gold');
  }, [config.autoRebuy, config.startingStack, se, toast]);

  const changeHeroChar = useCallback(
    (newCharId: CharId) => {
      const cur = stateRef.current;
      const next: TableState = {
        ...cur,
        seats: cur.seats.map((s) => (s.seat === 0 ? { ...s, charId: newCharId } : s)),
      };
      stateRef.current = next;
      setView(next);
      se('open');
      speak(0, 'select', 1, true);
    },
    [se, speak],
  );

  return {
    view,
    phase,
    boardShown,
    revealed,
    badges,
    bubbles,
    thinking,
    sweeping,
    potFly,
    payoutPending,
    highlight,
    winners,
    equities,
    banner,
    result,
    cutIn,
    fxKey,
    toasts,
    history,
    sessionEnd,
    dealKey,
    heroPeeked,
    level,
    countdown,
    preAction,
    setPreAction,
    heroAct,
    nextHand,
    cancelAuto,
    dismissCutIn,
    peek,
    sendStamp,
    leaveTable,
    finishSession,
    retrySession,
    topUpHero,
    changeHeroChar,
  };
}

export type HoldemTableApi = ReturnType<typeof useHoldemTable>;
