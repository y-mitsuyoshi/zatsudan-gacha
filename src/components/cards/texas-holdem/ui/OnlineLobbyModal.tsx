'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { holdemAudio } from '../audio';
import { FELTS, type CharId, type FeltId } from '../characters';
import type { GameModeId, TableConfig } from '../config';
import {
  buildOnlineRoomLineup,
  createAuthoritativeRoomTableState,
  createOnlineRoom,
  fetchOnlineRoom,
  joinOnlineRoom,
  leaveOnlineRoom,
  listPublicOnlineRooms,
  quickMatchOnline,
  subscribeRoomBus,
  syncOnlineRoomState,
  type OnlineRoomSettings,
  type OnlineRoomState,
  type PublicRoomSummary,
} from '../onlineClient';
import { computeRank, type HoldemProfile } from '../profile';
import { CharAvatar } from './CharAvatar';
import { FOCUS_RING, ModalShell, SUB_LABEL, fmt } from './OutGameKit';
import { RankBadge } from './RankBadge';

export interface OnlineLobbyModalProps {
  open: boolean;
  initialTab?: 'quick' | 'friend';
  initialRoomCode?: string;
  profile: HoldemProfile;
  onClose(): void;
  onStartOnlineMatch(cfg: TableConfig, room: OnlineRoomState): void;
}

export function OnlineLobbyModal({
  open,
  initialTab = 'quick',
  initialRoomCode = '',
  profile,
  onClose,
  onStartOnlineMatch,
}: OnlineLobbyModalProps) {
  const [tab, setTab] = useState<'quick' | 'friend'>(initialTab);
  const [room, setRoom] = useState<OnlineRoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [matchSeconds, setMatchSeconds] = useState(0);

  // Room creation settings
  const [createMode, setCreateMode] = useState<GameModeId>('lounge');
  const [createSeats, setCreateSeats] = useState<number>(6);
  const [createStack, setCreateStack] = useState<number>(2000);
  const [createBb, setCreateBb] = useState<number>(20);
  const [fillWithBots, setFillWithBots] = useState<boolean>(true);
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [createFelt, setCreateFelt] = useState<FeltId>('emerald');

  const launchedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setTab(initialRoomCode ? 'friend' : initialTab);
      if (initialRoomCode) setJoinCode(initialRoomCode.toUpperCase());
      setError(null);
      launchedRef.current = false;
    } else {
      setRoom(null);
      setMatchSeconds(0);
    }
  }, [open, initialTab, initialRoomCode]);

  const refreshPublicRooms = useCallback(async () => {
    const list = await listPublicOnlineRooms();
    setPublicRooms(list);
  }, []);

  useEffect(() => {
    if (!open || room) return;
    void refreshPublicRooms();
    const id = window.setInterval(() => {
      void refreshPublicRooms();
    }, 4000);
    return () => window.clearInterval(id);
  }, [open, room, refreshPublicRooms]);

  const launchFromRoom = useCallback(
    (activeRoom: OnlineRoomState) => {
      if (launchedRef.current) return;
      launchedRef.current = true;
      holdemAudio.se('open');

      const lineup =
        activeRoom.members.length >= 2 && !activeRoom.settings.fillWithBots
          ? activeRoom.members
          : buildOnlineRoomLineup(activeRoom);

      const myIdx = Math.max(
        0,
        lineup.findIndex((m) => m.accountId === profile.accountId),
      );
      const n = lineup.length;
      const rotatedOpponents: CharId[] = [];
      for (let i = 1; i < n; i++) {
        rotatedOpponents.push(lineup[(myIdx + i) % n].charId);
      }

      const authoritativeTable =
        activeRoom.tableState ?? createAuthoritativeRoomTableState(activeRoom, lineup);

      const cfg: TableConfig = {
        mode: activeRoom.settings.mode,
        hero: lineup[myIdx]?.charId ?? profile.partner,
        opponents: rotatedOpponents,
        felt: activeRoom.settings.felt,
        startingStack: activeRoom.settings.startingStack,
        blinds: activeRoom.settings.blinds,
        levelUpEveryHands: activeRoom.settings.mode === 'tournament' ? 5 : activeRoom.settings.mode === 'duel' ? 8 : 0,
        autoRebuy: activeRoom.settings.mode === 'lounge',
        online: {
          roomId: activeRoom.roomCode,
          roomCode: activeRoom.roomCode,
          accountId: profile.accountId,
          isPublicMatch: activeRoom.visibility === 'public',
          mySeat: myIdx,
          initialTableState: authoritativeTable,
          members: lineup.map((m) => ({
            accountId: m.accountId,
            playerName: m.playerName,
            charId: m.charId,
            isBot: m.isBot,
          })),
        },
      };

      onStartOnlineMatch(cfg, {
        ...activeRoom,
        status: 'playing',
        members: lineup,
        tableState: authoritativeTable,
      });
    },
    [onStartOnlineMatch, profile.accountId, profile.partner],
  );

  // Poll active waiting room & subscribe to BroadcastChannel
  useEffect(() => {
    if (!open || !room) return;
    const code = room.roomCode;

    const unsub = subscribeRoomBus(code, (updated) => {
      setRoom(updated);
      if (updated.status === 'playing') {
        launchFromRoom(updated);
      }
    });

    const pollId = window.setInterval(async () => {
      const latest = await fetchOnlineRoom(code);
      if (!latest) return;
      setRoom(latest);
      if (latest.status === 'playing') {
        launchFromRoom(latest);
      }
    }, 1400);

    return () => {
      unsub();
      window.clearInterval(pollId);
    };
  }, [open, room, launchFromRoom]);

  // Quick match elapsed timer
  useEffect(() => {
    if (!open || !room || room.visibility !== 'public' || room.status !== 'waiting') return;
    const id = window.setInterval(() => {
      setMatchSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, room]);

  const handleStartQuickMatch = async () => {
    if (busy) return;
    holdemAudio.se('click');
    setBusy(true);
    setError(null);
    setMatchSeconds(0);
    const res = await quickMatchOnline(profile);
    setBusy(false);
    if (res.ok && res.room) {
      setRoom(res.room);
      if (res.room.status === 'playing') {
        launchFromRoom(res.room);
      }
    } else {
      setError(res.error || 'マッチングの開始に失敗しました。');
    }
  };

  const handleCreateRoom = async () => {
    if (busy) return;
    holdemAudio.se('click');
    setBusy(true);
    setError(null);
    const settings: OnlineRoomSettings = {
      mode: createMode,
      maxSeats: createMode === 'duel' ? 2 : createSeats,
      startingStack: createStack,
      blinds: {
        sb: Math.floor(createBb / 2),
        bb: createBb,
        ante: 0,
      },
      fillWithBots,
      felt: createFelt,
    };
    const res = await createOnlineRoom(profile, visibility, settings);
    setBusy(false);
    if (res.ok && res.room) {
      setRoom(res.room);
    } else {
      setError(res.error || 'ルームの作成に失敗しました。');
    }
  };

  const handleJoinByCode = async (codeToJoin?: string) => {
    const target = (codeToJoin ?? joinCode).trim().toUpperCase();
    if (!target || busy) return;
    holdemAudio.se('click');
    setBusy(true);
    setError(null);
    const res = await joinOnlineRoom(profile, target);
    setBusy(false);
    if (res.ok && res.room) {
      setRoom(res.room);
      if (res.room.status === 'playing') {
        launchFromRoom(res.room);
      }
    } else {
      setError(res.error || 'ルームへの参加に失敗しました。');
    }
  };

  const handleHostStartGame = async () => {
    if (!room || busy) return;
    const humans = room.members.filter((m) => !m.isBot);
    if (!room.settings.fillWithBots && humans.length < 2) {
      setError('人間のみの対戦では2人以上の参加者が必要です（またはAI補充をONにしてください）。');
      return;
    }
    holdemAudio.se('open');
    setBusy(true);
    const lineup = buildOnlineRoomLineup(room);
    const initialTable = room.tableState ?? createAuthoritativeRoomTableState(room, lineup);
    const updated = await syncOnlineRoomState(room.roomCode, profile.accountId, {
      status: 'playing',
      members: lineup,
      tableState: initialTable,
      actionSeq: room.actionSeq + 1,
    });
    setBusy(false);
    launchFromRoom(
      updated ?? {
        ...room,
        status: 'playing',
        members: lineup,
        tableState: initialTable,
      },
    );
  };

  const copyShare = (text: string, label: string) => {
    holdemAudio.se('click');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedNotice(`${label}をコピーしました！`);
    window.setTimeout(() => setCopiedNotice(null), 2400);
  };

  const isHost = room ? room.hostAccountId === profile.accountId || room.members[0]?.accountId === profile.accountId : false;
  const humanMembers = room ? room.members.filter((m) => !m.isBot) : [];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="オンライン対戦＆フレンド個室"
      titleEn="ONLINE MATCHMAKING & PRIVATE ROOM"
      maxWidth="max-w-2xl"
      tall
    >
      <div className="space-y-4 px-4 py-4 sm:px-6">
        {/* Top Mode Switcher when not inside a room */}
        {!room && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-amber-300/25 bg-black/50 p-1">
            <button
              type="button"
              onClick={() => {
                holdemAudio.se('click');
                setTab('quick');
                setError(null);
              }}
              className={`rounded-xl px-3 py-2.5 text-center transition ${
                tab === 'quick'
                  ? 'border border-amber-300/60 bg-gradient-to-b from-amber-400/25 to-amber-600/15 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              } ${FOCUS_RING}`}
            >
              <div className="text-xs font-black sm:text-sm">🌐 ランダムオンライン対戦</div>
              <div className="text-[9px] tracking-[0.2em] text-amber-200/60">QUICK RANKED MATCH</div>
            </button>
            <button
              type="button"
              onClick={() => {
                holdemAudio.se('click');
                setTab('friend');
                setError(null);
              }}
              className={`rounded-xl px-3 py-2.5 text-center transition ${
                tab === 'friend'
                  ? 'border border-amber-300/60 bg-gradient-to-b from-amber-400/25 to-amber-600/15 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              } ${FOCUS_RING}`}
            >
              <div className="text-xs font-black sm:text-sm">🔑 フレンド個室対戦</div>
              <div className="text-[9px] tracking-[0.2em] text-amber-200/60">CREATE / JOIN ROOM</div>
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-400/50 bg-rose-950/60 px-3.5 py-2.5 text-xs font-bold text-rose-200">
            ⚠️ {error}
          </div>
        )}

        {/* ──────────────────── WAITING ROOM LOUNGE ──────────────────── */}
        {room && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-amber-300/40 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4 text-center shadow-[0_0_40px_rgba(251,191,36,0.18)]">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.25em] text-amber-200/75">
                <span>{room.visibility === 'public' ? '🌐 PUBLIC MATCHMAKING ROOM' : '🔑 PRIVATE FRIEND ROOM'}</span>
                <span>
                  {room.settings.blinds.sb}/{room.settings.blinds.bb} · STACK {fmt(room.settings.startingStack)}
                </span>
              </div>

              <div className="mt-2 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
                <div>
                  <div className="text-[10px] text-slate-400">ルームコード（6桁）</div>
                  <div className="font-mono text-3xl font-black tracking-[0.22em] text-amber-300 drop-shadow">
                    {room.roomCode}
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyShare(room.roomCode, 'ルームコード')}
                    className="rounded-xl border border-amber-300/45 bg-amber-400/15 px-3 py-1.5 text-xs font-black text-amber-100 hover:bg-amber-400/25"
                  >
                    📋 コードをコピー
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/texas-holdem?room=${room.roomCode}`
                          : `/texas-holdem?room=${room.roomCode}`;
                      copyShare(url, '招待URL');
                    }}
                    className="rounded-xl border border-teal-300/45 bg-teal-400/15 px-3 py-1.5 text-xs font-black text-teal-100 hover:bg-teal-400/25"
                  >
                    🔗 招待URLをコピー
                  </button>
                </div>
              </div>

              {copiedNotice && (
                <p className="mt-1.5 text-xs font-bold text-emerald-300">{copiedNotice}</p>
              )}

              {room.visibility === 'public' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-amber-100">
                  <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400" />
                  <span>
                    オンライン対戦相手を募集中… ({matchSeconds}秒経過 · いつでも対局開始できます)
                  </span>
                </div>
              )}
            </section>

            {/* Seated Players List */}
            <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <p className={SUB_LABEL}>
                  SEATED PLAYERS ({humanMembers.length} / {room.settings.maxSeats})
                </p>
                <span className="text-[11px] text-slate-400">
                  {room.settings.fillWithBots ? '空席にはAIライバルが自動着席します' : '人間プレイヤーのみ'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Array.from({ length: room.settings.maxSeats }, (_, idx) => {
                  const m = humanMembers[idx];
                  if (m) {
                    const r = computeRank(m.rankPoints);
                    return (
                      <div
                        key={m.accountId}
                        className="flex items-center gap-2.5 rounded-xl border border-amber-300/35 bg-amber-400/10 p-2.5"
                      >
                        <CharAvatar id={m.charId} size={40} active />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-black text-white">{m.playerName}</span>
                            {idx === 0 && (
                              <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
                                HOST
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[10px] text-amber-200/80">{m.equippedTitle}</div>
                          <div className="text-[10px] font-bold" style={{ color: r.tier.color }}>
                            {r.label} ({fmt(m.rankPoints)} pt)
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-black text-emerald-200">
                          READY
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="flex items-center gap-2.5 rounded-xl border border-dashed border-white/15 bg-black/35 p-2.5 text-slate-400"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-sm">
                        {room.settings.fillWithBots ? '🤖' : '👤'}
                      </div>
                      <div className="text-xs">
                        <div className="font-bold text-slate-300">Seat #{idx + 1} 空席</div>
                        <div className="text-[10px] text-slate-400">
                          {room.settings.fillWithBots ? '参加者待機中（開始時にAI補充）' : 'フレンドの参加を待機中…'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  holdemAudio.se('click');
                  if (room) {
                    void leaveOnlineRoom(profile, room.roomCode);
                  }
                  setRoom(null);
                }}
                className="rounded-xl border border-white/20 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-200 hover:border-amber-300/40"
              >
                ← ルームを退出する
              </button>
              <button
                type="button"
                onClick={handleHostStartGame}
                disabled={busy || (!isHost && room.visibility === 'private')}
                className="flex-1 rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 py-3 text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(0,0,0,0.45)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {isHost || room.visibility === 'public'
                  ? '🃏 このメンバーで対局開始！'
                  : 'ホストの対局開始を待っています…'}
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────── TAB A: QUICK MATCH ──────────────────── */}
        {!room && tab === 'quick' && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-amber-300/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 text-center">
              <div className="mx-auto mb-3 flex justify-center">
                <RankBadge points={profile.rankPoints} size="md" showProgress />
              </div>
              <h3 className="text-lg font-black text-amber-100">
                🌐 全国のプレイヤーとオンライン段位戦
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-300">
                現在オンラインのプレイヤーと自動的にテーブルをマッチングします。
                オンライン対局では勝利時のランクポイントに <span className="font-bold text-amber-300">+25% ボーナス</span> が加算されます！
              </p>
              <button
                type="button"
                onClick={handleStartQuickMatch}
                disabled={busy}
                className="mt-4 w-full max-w-sm rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_28px_rgba(245,158,11,0.35)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {busy ? 'マッチング検索中…' : '🌐 クイックマッチを開始する'}
              </button>
            </section>

            {/* Open Public Rooms */}
            <section className="rounded-2xl border border-white/10 bg-slate-950/75 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className={SUB_LABEL}>OPEN PUBLIC TABLES · 公開中のオンライン卓</p>
                <button
                  type="button"
                  onClick={() => void refreshPublicRooms()}
                  className="text-[11px] font-bold text-amber-200 hover:underline"
                >
                  🔄 更新
                </button>
              </div>
              {publicRooms.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  現在待機中の公開卓はありません。「クイックマッチを開始する」を押すと新規卓が作成されます。
                </p>
              ) : (
                <div className="space-y-2">
                  {publicRooms.map((r) => (
                    <div
                      key={r.roomCode}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-300">#{r.roomCode}</span>
                          <span className="font-bold text-white">{r.hostName} のテーブル</span>
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
                            {r.humanCount}/{r.maxSeats}人
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
                              r.status === 'waiting'
                                ? 'bg-amber-400/20 text-amber-200'
                                : 'bg-sky-400/20 text-sky-200'
                            }`}
                          >
                            {r.status === 'waiting' ? '待機中' : '対局中・途中参加OK'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          BLINDS {r.blinds.sb}/{r.blinds.bb} · STACK {fmt(r.startingStack)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleJoinByCode(r.roomCode)}
                        className="rounded-lg border border-amber-300/50 bg-amber-400/20 px-3 py-1.5 text-xs font-black text-amber-100 hover:bg-amber-400/30"
                      >
                        参加する
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ──────────────────── TAB B: FRIEND PRIVATE ROOM ──────────────────── */}
        {!room && tab === 'friend' && (
          <div className="space-y-4">
            {/* Join existing friend room by 6-digit code */}
            <section className="rounded-2xl border border-teal-300/30 bg-slate-950/85 p-4 space-y-2.5">
              <p className={SUB_LABEL}>JOIN FRIEND ROOM · ルームコードで参加</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="6桁のルームコードを入力 (例: 7K9P2M)"
                  maxLength={6}
                  className="flex-1 rounded-xl border border-white/20 bg-black/60 px-3.5 py-2.5 font-mono text-base font-black tracking-[0.2em] text-amber-200 outline-none focus:border-amber-300"
                />
                <button
                  type="button"
                  onClick={() => void handleJoinByCode()}
                  disabled={busy || joinCode.trim().length < 6}
                  className="rounded-xl border border-teal-300/60 bg-gradient-to-b from-teal-300 to-teal-600 px-5 py-2.5 text-xs font-black text-slate-950 shadow transition hover:brightness-110 active:scale-95 disabled:opacity-40 sm:text-sm"
                >
                  🚪 部屋に入る
                </button>
              </div>
            </section>

            {/* Create new friend room */}
            <section className="rounded-2xl border border-amber-300/25 bg-slate-950/85 p-4 space-y-3.5">
              <p className={SUB_LABEL}>CREATE NEW ROOM · 知り合い用の部屋を作成</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300">ゲーム形式</label>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'lounge', label: 'リング戦' },
                        { id: 'tournament', label: 'トーナメント' },
                        { id: 'duel', label: '1on1' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCreateMode(m.id)}
                        className={`rounded-lg border py-1.5 text-xs font-bold ${
                          createMode === m.id
                            ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                            : 'border-white/10 bg-black/40 text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300">最大人数</label>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {[2, 4, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={createMode === 'duel' && n !== 2}
                        onClick={() => setCreateSeats(n)}
                        className={`rounded-lg border py-1.5 text-xs font-bold ${
                          (createMode === 'duel' ? 2 : createSeats) === n
                            ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                            : 'border-white/10 bg-black/40 text-slate-400 disabled:opacity-30'
                        }`}
                      >
                        {n}人卓
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300">初期スタック</label>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {[1000, 2000, 5000].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCreateStack(st)}
                        className={`rounded-lg border py-1.5 font-mono text-xs font-bold ${
                          createStack === st
                            ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                            : 'border-white/10 bg-black/40 text-slate-400'
                        }`}
                      >
                        {fmt(st)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300">ブラインド (SB/BB)</label>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {[20, 50, 100].map((bb) => (
                      <button
                        key={bb}
                        type="button"
                        onClick={() => setCreateBb(bb)}
                        className={`rounded-lg border py-1.5 font-mono text-xs font-bold ${
                          createBb === bb
                            ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                            : 'border-white/10 bg-black/40 text-slate-400'
                        }`}
                      >
                        {bb / 2}/{bb}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={fillWithBots}
                    onChange={(e) => setFillWithBots(e.target.checked)}
                    className="h-4 w-4 accent-amber-400"
                  />
                  <span>空席にAIキャラクターを補充して対局する</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">公開設定:</span>
                  <button
                    type="button"
                    onClick={() => setVisibility(visibility === 'private' ? 'public' : 'private')}
                    className="rounded-lg border border-white/15 bg-black/50 px-2.5 py-1 text-xs font-bold text-amber-200"
                  >
                    {visibility === 'private' ? '🔑 プライベート（コードのみ）' : '🌐 公開ルーム'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">テーブルクロス:</span>
                {FELTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCreateFelt(f.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                      createFelt === f.id
                        ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                        : 'border-white/10 bg-black/40 text-slate-400'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.accent }} />
                    {f.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleCreateRoom()}
                disabled={busy}
                className="w-full rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 py-3 text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(0,0,0,0.45)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                ✨ ルームを作成して招待コードを発行する
              </button>
            </section>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
