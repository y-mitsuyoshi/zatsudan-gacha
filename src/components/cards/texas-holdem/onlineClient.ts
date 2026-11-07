'use client';

import { CHAR_IDS, CHARACTERS, type CharId, type FeltId } from './characters';
import type { GameModeId } from './config';
import { createTable, startHand } from './engine';
import { loadProfile, normalizeProfile, scrubPiiText, type HoldemProfile } from './profile';
import type { Blinds, PlayerAction, TableState } from './types';

const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL ||
  'https://us-central1-zatsudan-gacha.cloudfunctions.net';

const HOLDEM_API_URL = `${FUNCTIONS_BASE_URL}/holdemApi`;

const LOCAL_ROOMS_KEY = 'rfn-online-rooms-mirror-v1';
const LOCAL_ACCOUNTS_KEY = 'rfn-online-accounts-mirror-v1';
const BUS_CHANNEL_NAME = 'rfn-online-bus-v1';

export interface OnlineRoomMember {
  accountId: string;
  playerName: string;
  charId: CharId;
  rankPoints: number;
  equippedTitle: string;
  isBot: boolean;
  ready: boolean;
  joinedAt: number;
  lastSeenAt: number;
}

export interface OnlineRoomStamp {
  id: string;
  seat: number;
  accountId: string;
  playerName: string;
  stampId: string;
  text: string;
  timestamp: number;
}

export interface OnlineLastAction {
  seq: number;
  seat: number;
  action: PlayerAction;
  actorAccountId: string;
  timestamp: number;
}

export interface OnlineRoomSettings {
  mode: GameModeId;
  maxSeats: number;
  startingStack: number;
  blinds: Blinds;
  fillWithBots: boolean;
  felt: FeltId;
}

export interface OnlineRoomState {
  roomCode: string;
  visibility: 'public' | 'private';
  status: 'waiting' | 'playing' | 'finished';
  hostAccountId: string;
  settings: OnlineRoomSettings;
  members: OnlineRoomMember[];
  tableState: TableState | null;
  actionSeq: number;
  lastAction: OnlineLastAction | null;
  stamps: OnlineRoomStamp[];
  createdAt: number;
  updatedAt: number;
}

export interface PublicRoomSummary {
  roomCode: string;
  status: 'waiting' | 'playing' | 'finished';
  mode: GameModeId;
  maxSeats: number;
  humanCount: number;
  totalCount: number;
  blinds: Blinds;
  startingStack: number;
  hostName: string;
  updatedAt: number;
}

export interface LeaderboardEntry {
  accountId: string;
  playerName: string;
  equippedTitle: string;
  partner: CharId;
  rankPoints: number;
  handsPlayed: number;
  winRate: number;
  isSelf?: boolean;
}

// ---------------------------------------------------------------------------
// Local mirror + BroadcastChannel for instant multi-tab & offline resilience
// ---------------------------------------------------------------------------

type BusListener = (room: OnlineRoomState) => void;
const listeners = new Set<BusListener>();
let busChannel: BroadcastChannel | null = null;

function ensureBus(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!busChannel) {
    try {
      busChannel = new BroadcastChannel(BUS_CHANNEL_NAME);
      busChannel.onmessage = (ev: MessageEvent) => {
        const data = ev.data as { type?: string; room?: OnlineRoomState } | null;
        if (data?.type === 'ROOM_UPDATE' && data.room) {
          saveRoomToLocalMirror(data.room, false);
          listeners.forEach((fn) => fn(data.room!));
        }
      };
    } catch {
      busChannel = null;
    }
  }
  return busChannel;
}

export function subscribeRoomBus(roomCode: string, cb: (room: OnlineRoomState) => void): () => void {
  ensureBus();
  const norm = roomCode.trim().toUpperCase();
  const handler: BusListener = (r) => {
    if (r.roomCode === norm) cb(r);
  };
  listeners.add(handler);

  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_ROOMS_KEY && e.newValue) {
      try {
        const map = JSON.parse(e.newValue) as Record<string, OnlineRoomState>;
        if (map[norm]) cb(map[norm]);
      } catch {
        // ignore
      }
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    listeners.delete(handler);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

function readLocalRooms(): Record<string, OnlineRoomState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_ROOMS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OnlineRoomState>) : {};
  } catch {
    return {};
  }
}

function saveRoomToLocalMirror(room: OnlineRoomState, broadcast = true): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readLocalRooms();
    const prev = map[room.roomCode];
    if (prev && prev.actionSeq > room.actionSeq && prev.updatedAt > room.updatedAt) {
      return;
    }
    map[room.roomCode] = room;
    // Prune old rooms (> 2 hours)
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const k of Object.keys(map)) {
      if (map[k].updatedAt < cutoff) delete map[k];
    }
    window.localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(map));
    if (broadcast) {
      const ch = ensureBus();
      ch?.postMessage({ type: 'ROOM_UPDATE', room });
      listeners.forEach((fn) => fn(room));
    }
  } catch {
    // ignore
  }
}

function hashLocalCode(accountId: string, code: string): string {
  const input = `rfn-local-v1:${accountId.trim().toUpperCase()}:${code.trim().toUpperCase()}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

interface MirroredAccountEntry {
  transferDigest: string;
  profile: Omit<HoldemProfile, 'accountSecret' | 'transferCode'>;
}

function saveAccountToLocalMirror(profile: HoldemProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const map: Record<string, MirroredAccountEntry> = raw ? JSON.parse(raw) : {};
    const rest: Partial<HoldemProfile> = { ...profile };
    delete rest.accountSecret;
    delete rest.transferCode;
    map[profile.accountId.toUpperCase()] = {
      transferDigest: hashLocalCode(profile.accountId, profile.transferCode),
      profile: {
        ...(rest as Omit<HoldemProfile, 'accountSecret' | 'transferCode'>),
        playerName: scrubPiiText(profile.playerName, 'あなた', 12),
      },
    };
    window.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function loadAccountFromLocalMirror(accountId: string, transferCode: string): HoldemProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, MirroredAccountEntry>;
    const cleanId = accountId.trim().toUpperCase();
    const cleanCode = transferCode.trim().toUpperCase();
    const found = map[cleanId];
    if (!found || !found.transferDigest) return null;
    if (found.transferDigest !== hashLocalCode(cleanId, cleanCode)) return null;
    return normalizeProfile({
      ...found.profile,
      accountId: cleanId,
      transferCode: cleanCode,
    });
  } catch {
    return null;
  }
}

async function callHoldemApi<T>(payload: Record<string, unknown>, timeoutMs = 8000): Promise<T | null> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(HOLDEM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      if (errJson) return errJson as T;
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Account Cloud Sync, Transfer & Leaderboard
// ---------------------------------------------------------------------------

export async function syncProfileToCloud(profile: HoldemProfile): Promise<{ ok: boolean; syncedAt: number }> {
  saveAccountToLocalMirror(profile);
  const res = await callHoldemApi<{ ok?: boolean; syncedAt?: number }>({
    action: 'syncAccount',
    accountId: profile.accountId,
    accountSecret: profile.accountSecret,
    transferCode: profile.transferCode,
    profile,
  });
  const syncedAt = res?.syncedAt ?? Date.now();
  return { ok: Boolean(res?.ok ?? true), syncedAt };
}

export async function restoreProfileFromCloud(
  accountId: string,
  transferCode: string,
): Promise<{ ok: boolean; profile?: HoldemProfile; error?: string }> {
  const cleanId = accountId.trim().toUpperCase();
  const cleanCode = transferCode.trim().toUpperCase();
  if (!/^RFN-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanId)) {
    return { ok: false, error: 'プレイヤーIDは「RFN-XXXX-XXXX」の形式で入力してください。' };
  }
  if (cleanCode.length < 4) {
    return { ok: false, error: '引き継ぎコードを入力してください。' };
  }

  const res = await callHoldemApi<{ ok?: boolean; profile?: Partial<HoldemProfile>; error?: string }>({
    action: 'restoreAccount',
    accountId: cleanId,
    transferCode: cleanCode,
  });
  if (res?.ok && res.profile) {
    const restored = normalizeProfile({
      ...res.profile,
      accountId: cleanId,
      transferCode: cleanCode,
      lastSyncedAt: Date.now(),
    });
    saveAccountToLocalMirror(restored);
    return { ok: true, profile: restored };
  }

  // Fallback to local mirror if same browser / offline
  const local = loadAccountFromLocalMirror(cleanId, cleanCode);
  if (local) {
    return { ok: true, profile: { ...local, lastSyncedAt: Date.now() } };
  }

  return {
    ok: false,
    error: res?.error || '該当するプレイヤーIDまたは引き継ぎコードが見つかりませんでした。',
  };
}

const LOUNGE_RIVAL_LEADERBOARD: LeaderboardEntry[] = [
  { accountId: 'RFN-7777-KING', playerName: '獅子堂レオン', equippedTitle: 'レジェンド・オーバーロード', partner: 'leon', rankPoints: 3920, handsPlayed: 840, winRate: 34.2 },
  { accountId: 'RFN-2048-ALGO', playerName: 'クロエ・V', equippedTitle: 'ロイヤル・クラウン', partner: 'chloe', rankPoints: 2980, handsPlayed: 710, winRate: 32.8 },
  { accountId: 'RFN-9001-EMPR', playerName: 'ヴァレンティナ', equippedTitle: 'ロイヤル・クラウン', partner: 'valentina', rankPoints: 2640, handsPlayed: 620, winRate: 31.5 },
  { accountId: 'RFN-5120-MATH', playerName: '九条レイ', equippedTitle: 'ダイヤモンド・マエストロ', partner: 'rei', rankPoints: 1950, handsPlayed: 530, winRate: 30.4 },
  { accountId: 'RFN-4400-SUOU', playerName: '蘇芳', equippedTitle: 'ダイヤモンド・マエストロ', partner: 'suou', rankPoints: 1720, handsPlayed: 480, winRate: 29.8 },
  { accountId: 'RFN-3310-WOLF', playerName: '黒崎ジン', equippedTitle: 'プラチナ・ハイローラー', partner: 'jin', rankPoints: 1380, handsPlayed: 410, winRate: 28.5 },
  { accountId: 'RFN-2890-SAKU', playerName: '天宮サクラ', equippedTitle: 'プラチナ・ハイローラー', partner: 'sakura', rankPoints: 1120, handsPlayed: 360, winRate: 27.9 },
  { accountId: 'RFN-1920-ROSE', playerName: '一ノ瀬カレン', equippedTitle: 'ゴールド・シャーク', partner: 'karen', rankPoints: 790, handsPlayed: 290, winRate: 27.1 },
  { accountId: 'RFN-1480-STAR', playerName: '星野ルナ', equippedTitle: 'ゴールド・シャーク', partner: 'luna', rankPoints: 560, handsPlayed: 240, winRate: 26.4 },
  { accountId: 'RFN-1120-ROCK', playerName: '紅蓮ヒビキ', equippedTitle: 'シルバー・タクティシャン', partner: 'hibiki', rankPoints: 340, handsPlayed: 180, winRate: 25.8 },
];

export async function fetchLeaderboard(selfProfile: HoldemProfile): Promise<LeaderboardEntry[]> {
  const res = await callHoldemApi<{ ok?: boolean; entries?: LeaderboardEntry[] }>({
    action: 'getLeaderboard',
  });
  const map = new Map<string, LeaderboardEntry>();
  for (const r of LOUNGE_RIVAL_LEADERBOARD) {
    map.set(r.accountId, { ...r });
  }
  if (res?.ok && Array.isArray(res.entries)) {
    for (const e of res.entries) {
      const charId = (CHAR_IDS.includes(e.partner as CharId) ? e.partner : 'karen') as CharId;
      map.set(e.accountId, { ...e, partner: charId });
    }
  }
  const hp = selfProfile.stats.handsPlayed;
  const hw = selfProfile.stats.handsWon;
  map.set(selfProfile.accountId, {
    accountId: selfProfile.accountId,
    playerName: selfProfile.playerName,
    equippedTitle: selfProfile.equippedTitle,
    partner: selfProfile.partner,
    rankPoints: selfProfile.rankPoints,
    handsPlayed: hp,
    winRate: hp > 0 ? Math.round((hw / hp) * 1000) / 10 : 0,
    isSelf: true,
  });

  return Array.from(map.values())
    .map((e) => ({ ...e, isSelf: e.accountId === selfProfile.accountId }))
    .sort((a, b) => b.rankPoints - a.rankPoints)
    .slice(0, 15);
}

// ---------------------------------------------------------------------------
// Online Multiplayer Rooms (Quick Match + Private Friend Rooms)
// ---------------------------------------------------------------------------

function makeLocalRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buf = new Uint8Array(6);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < 6; i++) s += chars[buf[i] % chars.length];
    return s;
  }
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function profileToMember(profile: HoldemProfile): OnlineRoomMember {
  const now = Date.now();
  return {
    accountId: profile.accountId,
    playerName: scrubPiiText(profile.playerName, 'あなた', 12),
    charId: profile.partner,
    rankPoints: profile.rankPoints,
    equippedTitle: profile.equippedTitle,
    isBot: false,
    ready: true,
    joinedAt: now,
    lastSeenAt: now,
  };
}

export async function createOnlineRoom(
  profile: HoldemProfile,
  visibility: 'public' | 'private',
  settings: OnlineRoomSettings,
): Promise<{ ok: boolean; room?: OnlineRoomState; error?: string }> {
  const res = await callHoldemApi<{ ok?: boolean; room?: OnlineRoomState; error?: string }>({
    action: 'createRoom',
    accountId: profile.accountId,
    accountSecret: profile.accountSecret,
    playerName: scrubPiiText(profile.playerName, 'あなた', 12),
    charId: profile.partner,
    rankPoints: profile.rankPoints,
    equippedTitle: profile.equippedTitle,
    visibility,
    settings,
  });
  if (res?.ok && res.room) {
    saveRoomToLocalMirror(res.room, true);
    return { ok: true, room: res.room };
  }

  // Fallback local room creation
  const now = Date.now();
  const room: OnlineRoomState = {
    roomCode: makeLocalRoomCode(),
    visibility,
    status: 'waiting',
    hostAccountId: profile.accountId,
    settings,
    members: [profileToMember(profile)],
    tableState: null,
    actionSeq: 0,
    lastAction: null,
    stamps: [],
    createdAt: now,
    updatedAt: now,
  };
  saveRoomToLocalMirror(room, true);
  return { ok: true, room };
}

export async function joinOnlineRoom(
  profile: HoldemProfile,
  roomCode: string,
): Promise<{ ok: boolean; room?: OnlineRoomState; error?: string }> {
  const code = roomCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return { ok: false, error: '6文字の英数字ルームコードを入力してください。' };
  }

  const res = await callHoldemApi<{ ok?: boolean; room?: OnlineRoomState; error?: string }>({
    action: 'joinRoom',
    roomCode: code,
    accountId: profile.accountId,
    accountSecret: profile.accountSecret,
    playerName: scrubPiiText(profile.playerName, 'あなた', 12),
    charId: profile.partner,
    rankPoints: profile.rankPoints,
    equippedTitle: profile.equippedTitle,
  });
  if (res?.ok && res.room) {
    saveRoomToLocalMirror(res.room, true);
    return { ok: true, room: res.room };
  }

  // Check local mirror (e.g. multi-tab on same browser)
  const localMap = readLocalRooms();
  const local = localMap[code];
  if (local) {
    const members = [...local.members];
    const joiner = profileToMember(profile);
    const idx = members.findIndex((m) => m.accountId === profile.accountId);
    if (idx >= 0) {
      members[idx] = { ...members[idx], ...joiner };
    } else {
      const humans = members.filter((m) => !m.isBot).length;
      if (humans >= local.settings.maxSeats) {
        return { ok: false, error: 'このルームは満席です。' };
      }
      const botIdx = members.findIndex((m) => m.isBot);
      if (botIdx >= 0 && members.length >= local.settings.maxSeats) {
        members[botIdx] = joiner;
      } else {
        members.push(joiner);
      }
    }
    const updated: OnlineRoomState = {
      ...local,
      members,
      updatedAt: Date.now(),
    };
    saveRoomToLocalMirror(updated, true);
    return { ok: true, room: updated };
  }

  return { ok: false, error: res?.error || '指定されたルームコードが見つかりません。' };
}

export async function quickMatchOnline(
  profile: HoldemProfile,
): Promise<{ ok: boolean; room?: OnlineRoomState; error?: string }> {
  const res = await callHoldemApi<{ ok?: boolean; room?: OnlineRoomState; error?: string }>({
    action: 'quickMatch',
    accountId: profile.accountId,
    accountSecret: profile.accountSecret,
    playerName: scrubPiiText(profile.playerName, 'あなた', 12),
    charId: profile.partner,
    rankPoints: profile.rankPoints,
    equippedTitle: profile.equippedTitle,
  });
  if (res?.ok && res.room) {
    saveRoomToLocalMirror(res.room, true);
    return { ok: true, room: res.room };
  }

  // Fallback to local mirror public room search
  const localMap = readLocalRooms();
  const cutoff = Date.now() - 10 * 60 * 1000;
  const openPublic = Object.values(localMap)
    .filter((r) => {
      if (r.visibility !== 'public' || r.updatedAt < cutoff || r.status === 'finished') return false;
      const humans = r.members.filter((m) => !m.isBot).length;
      if (humans >= r.settings.maxSeats) return false;
      return r.status === 'waiting' || (r.status === 'playing' && r.settings.fillWithBots);
    })
    .sort((a, b) => {
      const aWait = a.status === 'waiting' ? 1 : 0;
      const bWait = b.status === 'waiting' ? 1 : 0;
      if (aWait !== bWait) return bWait - aWait;
      return b.updatedAt - a.updatedAt;
    })[0];
  if (openPublic) {
    return joinOnlineRoom(profile, openPublic.roomCode);
  }
  return createOnlineRoom(profile, 'public', {
    mode: 'lounge',
    maxSeats: 6,
    startingStack: 2000,
    blinds: { sb: 10, bb: 20, ante: 0 },
    fillWithBots: true,
    felt: 'emerald',
  });
}

export async function leaveOnlineRoom(profile: HoldemProfile, roomCode: string): Promise<void> {
  const code = roomCode.trim().toUpperCase();
  const localMap = readLocalRooms();
  const local = localMap[code];
  if (local) {
    const remaining = local.members.filter((m) => m.accountId !== profile.accountId);
    const humansLeft = remaining.filter((m) => !m.isBot);
    if (humansLeft.length === 0) {
      delete localMap[code];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(localMap));
      }
    } else {
      const nextHost =
        local.hostAccountId === profile.accountId ? humansLeft[0].accountId : local.hostAccountId;
      saveRoomToLocalMirror(
        {
          ...local,
          hostAccountId: nextHost,
          members: remaining,
          updatedAt: Date.now(),
        },
        true,
      );
    }
  }
  await callHoldemApi({
    action: 'leaveRoom',
    roomCode: code,
    accountId: profile.accountId,
    accountSecret: profile.accountSecret,
  });
}

export function getCachedOnlineRoom(roomCode: string): OnlineRoomState | null {
  const code = roomCode.trim().toUpperCase();
  return readLocalRooms()[code] ?? null;
}

/**
 * Creates the authoritative initial Hand #1 TableState in canonical seat order (0..N-1)
 * so all players in the online room receive the exact same deck, hole cards, button, and toAct.
 */
export function createAuthoritativeRoomTableState(
  room: OnlineRoomState,
  lineup: OnlineRoomMember[],
): TableState {
  const players = lineup.map((m, i) => ({
    charId: m.charId,
    name: m.playerName,
    isHuman: i === 0,
    stack: room.settings.startingStack,
  }));
  const table = createTable({
    players,
    blinds: room.settings.blinds,
    button: 0,
  });
  return startHand(table, { blinds: room.settings.blinds });
}

export async function listPublicOnlineRooms(): Promise<PublicRoomSummary[]> {
  const res = await callHoldemApi<{ ok?: boolean; rooms?: PublicRoomSummary[] }>({
    action: 'listPublicRooms',
  });
  const map = new Map<string, PublicRoomSummary>();
  if (res?.ok && Array.isArray(res.rooms)) {
    for (const r of res.rooms) map.set(r.roomCode, r);
  }
  const localMap = readLocalRooms();
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const r of Object.values(localMap)) {
    if (r.visibility === 'public' && r.updatedAt >= cutoff && r.status !== 'finished') {
      map.set(r.roomCode, {
        roomCode: r.roomCode,
        status: r.status,
        mode: r.settings.mode,
        maxSeats: r.settings.maxSeats,
        humanCount: r.members.filter((m) => !m.isBot).length,
        totalCount: r.members.length,
        blinds: r.settings.blinds,
        startingStack: r.settings.startingStack,
        hostName: r.members[0]?.playerName || 'ホスト',
        updatedAt: r.updatedAt,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function fetchOnlineRoom(roomCode: string): Promise<OnlineRoomState | null> {
  const code = roomCode.trim().toUpperCase();
  const local = readLocalRooms()[code] ?? null;
  const res = await callHoldemApi<{ ok?: boolean; room?: OnlineRoomState }>(
    { action: 'getRoom', roomCode: code },
    5000,
  );
  if (res?.ok && res.room) {
    if (!local || res.room.actionSeq >= local.actionSeq) {
      saveRoomToLocalMirror(res.room, false);
      return res.room;
    }
  }
  return local;
}

export async function syncOnlineRoomState(
  roomCode: string,
  accountId: string,
  patch: {
    status?: 'waiting' | 'playing' | 'finished';
    members?: OnlineRoomMember[];
    tableState?: TableState | null;
    actionSeq: number;
    lastAction?: OnlineLastAction | null;
  },
): Promise<OnlineRoomState | null> {
  const code = roomCode.trim().toUpperCase();
  const local = readLocalRooms()[code];
  if (local) {
    const optimistic: OnlineRoomState = {
      ...local,
      status: patch.status ?? local.status,
      members: patch.members ?? local.members,
      tableState: patch.tableState !== undefined ? patch.tableState : local.tableState,
      actionSeq: patch.actionSeq,
      lastAction: patch.lastAction !== undefined ? patch.lastAction : local.lastAction,
      updatedAt: Date.now(),
    };
    saveRoomToLocalMirror(optimistic, true);
  }

  const currentSecret = loadProfile().accountSecret;
  const res = await callHoldemApi<{ ok?: boolean; room?: OnlineRoomState }>({
    action: 'syncRoomState',
    roomCode: code,
    accountId,
    accountSecret: currentSecret,
    ...patch,
  });
  if (res?.ok && res.room) {
    saveRoomToLocalMirror(res.room, true);
    return res.room;
  }
  return readLocalRooms()[code] ?? null;
}

export async function sendOnlineRoomStamp(
  roomCode: string,
  accountId: string,
  playerName: string,
  seat: number,
  stampId: string,
  text: string,
): Promise<void> {
  const code = roomCode.trim().toUpperCase();
  const local = readLocalRooms()[code];
  if (local) {
    const stamp: OnlineRoomStamp = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      seat,
      accountId,
      playerName,
      stampId,
      text,
      timestamp: Date.now(),
    };
    const optimistic: OnlineRoomState = {
      ...local,
      stamps: [...(local.stamps || []).slice(-9), stamp],
      updatedAt: Date.now(),
    };
    saveRoomToLocalMirror(optimistic, true);
  }
  const currentSecret = loadProfile().accountSecret;
  await callHoldemApi({
    action: 'sendRoomStamp',
    roomCode: code,
    accountId,
    accountSecret: currentSecret,
    playerName: scrubPiiText(playerName, 'あなた', 12),
    seat,
    stampId,
    text,
  });
}

/** Populate remaining seats with AI rivals before starting an online room match. */
export function buildOnlineRoomLineup(room: OnlineRoomState): OnlineRoomMember[] {
  const humans = room.members.filter((m) => !m.isBot);
  const maxSeats = Math.max(2, Math.min(6, room.settings.maxSeats));
  if (!room.settings.fillWithBots && humans.length >= 2) {
    return humans.slice(0, maxSeats);
  }
  const targetCount = Math.max(2, maxSeats);
  const usedChars = new Set<CharId>(humans.map((h) => h.charId));
  const pool = CHAR_IDS.filter((id) => !usedChars.has(id));
  const result: OnlineRoomMember[] = [...humans];
  let botIdx = 0;
  while (result.length < targetCount) {
    const cid = pool[botIdx % pool.length] ?? CHAR_IDS[botIdx % CHAR_IDS.length];
    const ch = CHARACTERS[cid];
    result.push({
      accountId: `BOT-${cid.toUpperCase()}-${botIdx}`,
      playerName: ch.name,
      charId: cid,
      rankPoints: 300 + botIdx * 240,
      equippedTitle: ch.title,
      isBot: true,
      ready: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
    });
    botIdx++;
  }
  return result;
}

/**
 * Rotates an authoritative TableState so that `heroSeat` (0..N-1) becomes view seat 0.
 * Preserves all relative clockwise seat positions, button, toAct, pots, payouts, and reveals.
 */
export function rotateTableForHero(raw: TableState, heroSeat: number): TableState {
  const n = raw.seats.length;
  if (n === 0 || heroSeat <= 0 || heroSeat >= n) return raw;
  const toView = (s: number) => ((s - heroSeat) % n + n) % n;
  const toRaw = (v: number) => (v + heroSeat) % n;

  const rotatedSeats = Array.from({ length: n }, (_, v) => {
    const orig = raw.seats[toRaw(v)];
    return {
      ...orig,
      seat: v,
      isHuman: v === 0,
    };
  });

  const rotatedResult = raw.result
    ? {
        ...raw.result,
        winners: raw.result.winners.map(toView),
        pots: raw.result.pots.map((p) => ({
          ...p,
          eligible: p.eligible.map(toView),
          winners: p.winners.map(toView),
        })),
        payouts: Object.fromEntries(
          Object.entries(raw.result.payouts).map(([seatStr, amt]) => [toView(Number(seatStr)), amt]),
        ),
        reveals: raw.result.reveals.map((rev) => ({
          ...rev,
          seat: toView(rev.seat),
        })),
      }
    : null;

  return {
    ...raw,
    button: toView(raw.button),
    toAct: raw.toAct === null ? null : toView(raw.toAct),
    seats: rotatedSeats,
    result: rotatedResult,
  };
}
