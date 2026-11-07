import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {createHash, randomInt, timingSafeEqual} from "crypto";
import cors from "cors";
import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const allowedOrigins = [
  "https://zatsudan-gacha.app",
  "https://zatsudan-gacha.web.app",
  "https://zatsudan-gacha.firebaseapp.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3109",
  "http://127.0.0.1:3109",
  "http://localhost:3110",
  "http://127.0.0.1:3110"
];

const corsHandler = cors({
  origin: allowedOrigins,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 86400
});

const ACCOUNT_ID_REGEX = /^RFN-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
const MAX_BODY_BYTES = 120_000;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// In-memory sliding window rate limiters (per Cloud Function instance)
const ipReqBuckets = new Map<string, {count: number; resetAt: number}>();
const authFailBuckets = new Map<string, {fails: number; lockedUntil: number}>();

function checkRateLimit(ip: string, limit = 90, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = ipReqBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    if (ipReqBuckets.size > 2000) ipReqBuckets.clear();
    ipReqBuckets.set(ip, {count: 1, resetAt: now + windowMs});
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function isAuthLockedOut(key: string): boolean {
  const rec = authFailBuckets.get(key);
  if (!rec) return false;
  if (Date.now() >= rec.lockedUntil) {
    authFailBuckets.delete(key);
    return false;
  }
  return rec.fails >= 8;
}

function recordAuthFailure(key: string): void {
  const now = Date.now();
  const rec = authFailBuckets.get(key);
  if (!rec || now >= rec.lockedUntil) {
    if (authFailBuckets.size > 2000) authFailBuckets.clear();
    authFailBuckets.set(key, {fails: 1, lockedUntil: now + 10 * 60_000});
    return;
  }
  rec.fails += 1;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function hashCredential(purpose: "secret" | "transfer" | "room", accountId: string, credential: string): string {
  return sha256Hex(`rfn:v1:${purpose}:${accountId.trim().toUpperCase()}:${credential.trim()}`);
}

function safeCompareHex(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== 64 || b.length !== 64) return false;
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== 32 || bufB.length !== 32) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function verifyCredentialHash(
  storedHash: unknown,
  purpose: "secret" | "transfer" | "room",
  accountId: string,
  credential: string
): boolean {
  const v1 = hashCredential(purpose, accountId, credential);
  if (safeCompareHex(storedHash, v1)) return true;
  // Backward-compatibility check for v0 unsalted sha256
  const v0 = sha256Hex(credential.trim());
  return safeCompareHex(storedHash, v0);
}

function generateRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars.charAt(randomInt(0, chars.length));
  }
  return out;
}

/**
 * Scrubs accidental PII (emails, phone numbers, URLs, long digit IDs) and HTML/control chars.
 */
function scrubPiiString(val: unknown, fallback: string, maxLen = 32): string {
  if (typeof val !== "string") return fallback;
  const cleaned = val
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>'"&`]/g, "")
    .trim();
  if (!cleaned) return fallback;
  if (
    /\S+@\S+\.\S+/.test(cleaned) ||
    /https?:\/\/|www\./i.test(cleaned) ||
    /\d[\d\-\s()]{7,}\d/.test(cleaned)
  ) {
    return fallback;
  }
  const sliced = Array.from(cleaned).slice(0, maxLen).join("").trim();
  return sliced || fallback;
}

function sanitizeNumber(val: unknown, fallback: number, min = -1_000_000_000, max = 1_000_000_000): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * Recursively sanitizes arbitrary JSON payloads against prototype pollution, excessive depth, and oversized strings.
 */
function sanitizeDeepJson(val: unknown, depth = 0): unknown {
  if (depth > 14 || val === null || val === undefined) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    return val
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .slice(0, 256);
  }
  if (Array.isArray(val)) {
    return val.slice(0, 250).map((item) => sanitizeDeepJson(item, depth + 1));
  }
  if (typeof val === "object") {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(val as Record<string, unknown>).slice(0, 80);
    for (const [k, v] of entries) {
      if (FORBIDDEN_KEYS.has(k) || k.startsWith("__") || k.length > 64) continue;
      if (k === "accountSecret" || k === "transferCode") continue;
      out[k] = sanitizeDeepJson(v, depth + 1);
    }
    return out;
  }
  return null;
}

export interface RoomMemberDoc {
  accountId: string;
  playerName: string;
  charId: string;
  rankPoints: number;
  equippedTitle: string;
  isBot: boolean;
  ready: boolean;
  joinedAt: number;
  lastSeenAt: number;
}

export interface RoomStampDoc {
  id: string;
  seat: number;
  accountId: string;
  playerName: string;
  stampId: string;
  text: string;
  timestamp: number;
}

export interface RoomDoc {
  roomCode: string;
  visibility: "public" | "private";
  status: "waiting" | "playing" | "finished";
  hostAccountId: string;
  settings: {
    mode: "lounge" | "tournament" | "duel";
    maxSeats: number;
    startingStack: number;
    blinds: {sb: number; bb: number; ante: number};
    fillWithBots: boolean;
    felt: string;
  };
  members: RoomMemberDoc[];
  memberAuthHashes?: Record<string, string>;
  tableState: unknown;
  actionSeq: number;
  lastAction: unknown;
  stamps: RoomStampDoc[];
  createdAt: number;
  updatedAt: number;
}

function toPublicRoom(room: RoomDoc): Omit<RoomDoc, "memberAuthHashes"> {
  const copy: Partial<RoomDoc> = {...room};
  delete copy.memberAuthHashes;
  return copy as Omit<RoomDoc, "memberAuthHashes">;
}

function sanitizeProfilePayload(raw: Record<string, unknown>, accountId: string): Record<string, unknown> {
  const rankPoints = Math.floor(sanitizeNumber(raw.rankPoints, 0, 0, 10_000_000));
  const highestRankPoints = Math.max(
    rankPoints,
    Math.floor(sanitizeNumber(raw.highestRankPoints, rankPoints, 0, 10_000_000))
  );
  const rawStats = (
    typeof raw.stats === "object" && raw.stats !== null
      ? sanitizeDeepJson(raw.stats)
      : {}
  ) as Record<string, unknown>;
  const handsPlayed = Math.floor(sanitizeNumber(rawStats.handsPlayed, 0, 0, 10_000_000));
  const handsWon = Math.floor(sanitizeNumber(rawStats.handsWon, 0, 0, handsPlayed));

  return {
    version: 1,
    accountId,
    playerName: scrubPiiString(raw.playerName, "あなた", 12),
    equippedTitle: scrubPiiString(raw.equippedTitle, "ロイヤルラウンジの挑戦者", 32),
    partner: scrubPiiString(raw.partner, "karen", 16),
    rankPoints,
    highestRankPoints,
    winStreak: Math.floor(sanitizeNumber(raw.winStreak, 0, 0, 100_000)),
    maxWinStreak: Math.floor(sanitizeNumber(raw.maxWinStreak, 0, 0, 100_000)),
    demotionShield: Math.floor(sanitizeNumber(raw.demotionShield, 0, 0, 99)),
    coins: Math.floor(sanitizeNumber(raw.coins, 3000, 0, 1_000_000_000)),
    affection: typeof raw.affection === "object" && raw.affection !== null ? sanitizeDeepJson(raw.affection) : {},
    stats: {
      ...rawStats,
      handsPlayed,
      handsWon
    },
    recentHands: Array.isArray(raw.recentHands)
      ? raw.recentHands.slice(0, 20).map((item) => sanitizeDeepJson(item))
      : [],
    settings: typeof raw.settings === "object" && raw.settings !== null ? sanitizeDeepJson(raw.settings) : {},
    lastSyncedAt: Date.now()
  };
}

async function handleSyncAccount(body: Record<string, unknown>, clientIp: string): Promise<Record<string, unknown>> {
  const accountId = typeof body.accountId === "string" ? body.accountId.trim().toUpperCase() : "";
  const accountSecret = typeof body.accountSecret === "string" ? body.accountSecret.trim() : "";
  const transferCode = typeof body.transferCode === "string" ? body.transferCode.trim().toUpperCase() : "";
  const profileRaw = (typeof body.profile === "object" && body.profile !== null ? body.profile : {}) as Record<string, unknown>;

  if (!ACCOUNT_ID_REGEX.test(accountId) || accountSecret.length < 8 || transferCode.length < 6) {
    return {ok: false, error: "Invalid account credentials"};
  }
  if (isAuthLockedOut(`ip:${clientIp}`) || isAuthLockedOut(`acct:${accountId}`)) {
    throw new Error("RATE_LIMITED");
  }

  const secretHash = hashCredential("secret", accountId, accountSecret);
  const transferHash = hashCredential("transfer", accountId, transferCode);
  const sanitizedProfile = sanitizeProfilePayload(profileRaw, accountId);
  const docRef = db.collection("holdem_accounts").doc(accountId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (snap.exists) {
      const existing = snap.data() || {};
      const secretOk = verifyCredentialHash(existing.secretHash, "secret", accountId, accountSecret);
      const transferOk = verifyCredentialHash(existing.transferHash, "transfer", accountId, transferCode);
      if (existing.secretHash && !secretOk && !transferOk) {
        recordAuthFailure(`ip:${clientIp}`);
        recordAuthFailure(`acct:${accountId}`);
        throw new Error("CREDENTIAL_MISMATCH");
      }
    }
    tx.set(docRef, {
      accountId,
      secretHash,
      transferHash,
      playerName: sanitizedProfile.playerName,
      equippedTitle: sanitizedProfile.equippedTitle,
      partner: sanitizedProfile.partner,
      rankPoints: sanitizedProfile.rankPoints,
      highestRankPoints: sanitizedProfile.highestRankPoints,
      handsPlayed: (sanitizedProfile.stats as Record<string, unknown>).handsPlayed || 0,
      handsWon: (sanitizedProfile.stats as Record<string, unknown>).handsWon || 0,
      profile: sanitizedProfile,
      updatedAt: Date.now()
    }, {merge: true});
  });

  return {
    ok: true,
    accountId,
    syncedAt: Date.now()
  };
}

async function handleRestoreAccount(body: Record<string, unknown>, clientIp: string): Promise<Record<string, unknown>> {
  const accountId = typeof body.accountId === "string" ? body.accountId.trim().toUpperCase() : "";
  const transferCode = typeof body.transferCode === "string" ? body.transferCode.trim().toUpperCase() : "";

  if (!ACCOUNT_ID_REGEX.test(accountId) || transferCode.length < 4) {
    return {ok: false, error: "プレイヤーIDまたは引き継ぎコードの形式が正しくありません。"};
  }
  if (isAuthLockedOut(`ip:${clientIp}`) || isAuthLockedOut(`acct:${accountId}`)) {
    throw new Error("RATE_LIMITED");
  }

  const docRef = db.collection("holdem_accounts").doc(accountId);
  const snap = await docRef.get();
  if (!snap.exists) {
    recordAuthFailure(`ip:${clientIp}`);
    return {ok: false, error: "指定されたプレイヤーIDまたは引き継ぎコードが一致しません。"};
  }

  const data = snap.data() || {};
  if (!verifyCredentialHash(data.transferHash, "transfer", accountId, transferCode)) {
    recordAuthFailure(`ip:${clientIp}`);
    recordAuthFailure(`acct:${accountId}`);
    return {ok: false, error: "指定されたプレイヤーIDまたは引き継ぎコードが一致しません。"};
  }

  const storedProfile = (typeof data.profile === "object" && data.profile !== null ? {...data.profile} : {}) as Record<string, unknown>;
  delete storedProfile.accountSecret;
  delete storedProfile.transferCode;

  return {
    ok: true,
    profile: {
      ...storedProfile,
      accountId,
      transferCode
    }
  };
}

async function handleGetLeaderboard(): Promise<Record<string, unknown>> {
  const snap = await db
    .collection("holdem_accounts")
    .orderBy("rankPoints", "desc")
    .limit(15)
    .get();

  const entries = snap.docs.map((d) => {
    const data = d.data();
    const hp = Number(data.handsPlayed) || 0;
    const hw = Number(data.handsWon) || 0;
    return {
      accountId: data.accountId || d.id,
      playerName: scrubPiiString(data.playerName, "プレイヤー", 12),
      equippedTitle: scrubPiiString(data.equippedTitle, "ロイヤルラウンジの挑戦者", 32),
      partner: scrubPiiString(data.partner, "karen", 16),
      rankPoints: Number(data.rankPoints) || 0,
      handsPlayed: hp,
      winRate: hp > 0 ? Math.round((hw / hp) * 1000) / 10 : 0
    };
  });

  return {ok: true, entries};
}

function buildMemberFromRequest(body: Record<string, unknown>): {member: RoomMemberDoc; authHash: string} {
  const now = Date.now();
  const rawId = typeof body.accountId === "string" ? body.accountId.trim().toUpperCase() : "";
  const accountId = ACCOUNT_ID_REGEX.test(rawId) ? rawId : "RFN-0000-0000";
  const secret = typeof body.accountSecret === "string" ? body.accountSecret.trim() : "";
  const authHash = secret.length >= 8 ? hashCredential("room", accountId, secret) : "";
  return {
    member: {
      accountId,
      playerName: scrubPiiString(body.playerName, "ゲスト", 12),
      charId: scrubPiiString(body.charId, "karen", 16),
      rankPoints: Math.floor(sanitizeNumber(body.rankPoints, 0, 0, 10_000_000)),
      equippedTitle: scrubPiiString(body.equippedTitle, "ロイヤルラウンジの挑戦者", 32),
      isBot: false,
      ready: true,
      joinedAt: now,
      lastSeenAt: now
    },
    authHash
  };
}

async function handleCreateRoom(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const {member: host, authHash} = buildMemberFromRequest(body);
  const visibility = body.visibility === "public" ? "public" : "private";
  const settingsRaw = (typeof body.settings === "object" && body.settings !== null ? body.settings : {}) as Record<string, unknown>;
  const blindsRaw = (typeof settingsRaw.blinds === "object" && settingsRaw.blinds !== null ? settingsRaw.blinds : {}) as Record<string, unknown>;

  const modeRaw = settingsRaw.mode;
  const mode: "lounge" | "tournament" | "duel" =
    modeRaw === "tournament" || modeRaw === "duel" ? modeRaw : "lounge";
  const maxSeats = Math.floor(sanitizeNumber(settingsRaw.maxSeats, 6, 2, 6));
  const startingStack = Math.floor(sanitizeNumber(settingsRaw.startingStack, 2000, 200, 50000));
  const sb = Math.floor(sanitizeNumber(blindsRaw.sb, 10, 1, 5000));
  const bb = Math.floor(sanitizeNumber(blindsRaw.bb, sb * 2, sb * 2, 10000));
  const ante = Math.floor(sanitizeNumber(blindsRaw.ante, 0, 0, 2000));
  const fillWithBots = settingsRaw.fillWithBots !== false;
  const felt = scrubPiiString(settingsRaw.felt, "emerald", 16);

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = generateRoomCode();
    const roomRef = db.collection("holdem_rooms").doc(roomCode);
    const now = Date.now();
    const roomDoc: RoomDoc = {
      roomCode,
      visibility,
      status: "waiting",
      hostAccountId: host.accountId,
      settings: {
        mode,
        maxSeats,
        startingStack,
        blinds: {sb, bb, ante},
        fillWithBots,
        felt
      },
      members: [host],
      memberAuthHashes: authHash ? {[host.accountId]: authHash} : {},
      tableState: null,
      actionSeq: 0,
      lastAction: null,
      stamps: [],
      createdAt: now,
      updatedAt: now
    };

    try {
      await roomRef.create(roomDoc);
      return {ok: true, room: toPublicRoom(roomDoc)};
    } catch (err: unknown) {
      const code = (err as {code?: number})?.code;
      if (code !== 6) {
        throw err;
      }
    }
  }
  return {ok: false, error: "ルームコードの生成に失敗しました。もう一度お試しください。"};
}

async function handleJoinRoom(body: Record<string, unknown>, clientIp: string): Promise<Record<string, unknown>> {
  const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
  if (!ROOM_CODE_REGEX.test(roomCode)) {
    return {ok: false, error: "6桁のルームコードを正しく入力してください。"};
  }
  if (isAuthLockedOut(`ip:${clientIp}`)) {
    throw new Error("RATE_LIMITED");
  }
  const {member: joiner, authHash} = buildMemberFromRequest(body);
  const roomRef = db.collection("holdem_rooms").doc(roomCode);

  const updatedRoom = await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) {
      recordAuthFailure(`ip:${clientIp}`);
      throw new Error("ROOM_NOT_FOUND");
    }
    const room = snap.data() as RoomDoc;
    const members = Array.isArray(room.members) ? [...room.members] : [];
    const authHashes: Record<string, string> = {...(room.memberAuthHashes || {})};
    const existingIdx = members.findIndex((m) => m.accountId === joiner.accountId);

    if (existingIdx >= 0) {
      const existingHash = authHashes[joiner.accountId];
      if (existingHash && authHash && !safeCompareHex(existingHash, authHash)) {
        throw new Error("CREDENTIAL_MISMATCH");
      }
      members[existingIdx] = {
        ...members[existingIdx],
        playerName: joiner.playerName,
        charId: joiner.charId,
        rankPoints: joiner.rankPoints,
        equippedTitle: joiner.equippedTitle,
        isBot: false,
        lastSeenAt: Date.now()
      };
    } else {
      const humanCount = members.filter((m) => !m.isBot).length;
      if (humanCount >= room.settings.maxSeats) {
        throw new Error("ROOM_FULL");
      }
      const botIdx = members.findIndex((m) => m.isBot);
      if (botIdx >= 0 && members.length >= room.settings.maxSeats) {
        members[botIdx] = joiner;
      } else {
        members.push(joiner);
      }
    }
    if (authHash) {
      authHashes[joiner.accountId] = authHash;
    }

    const nextRoom: RoomDoc = {
      ...room,
      members,
      memberAuthHashes: authHashes,
      updatedAt: Date.now()
    };
    tx.set(roomRef, nextRoom);
    return nextRoom;
  });

  return {ok: true, room: toPublicRoom(updatedRoom)};
}

async function handleQuickMatch(body: Record<string, unknown>, clientIp: string): Promise<Record<string, unknown>> {
  const {member: player} = buildMemberFromRequest(body);
  const cutoff = Date.now() - 10 * 60 * 1000;

  const snap = await db
    .collection("holdem_rooms")
    .orderBy("updatedAt", "desc")
    .limit(30)
    .get();

  const candidates = snap.docs
    .map((d) => d.data() as RoomDoc)
    .filter((r) => {
      if (r.visibility !== "public" || r.updatedAt < cutoff || r.status === "finished") return false;
      const alreadyIn = r.members.some((m) => m.accountId === player.accountId);
      if (alreadyIn) return true;
      const humans = r.members.filter((m) => !m.isBot).length;
      if (humans >= r.settings.maxSeats) return false;
      return r.status === "waiting" || (r.status === "playing" && r.settings.fillWithBots);
    })
    .sort((a, b) => {
      const aWait = a.status === "waiting" ? 1 : 0;
      const bWait = b.status === "waiting" ? 1 : 0;
      if (aWait !== bWait) return bWait - aWait;
      return b.updatedAt - a.updatedAt;
    });

  if (candidates.length > 0) {
    return handleJoinRoom({
      ...body,
      roomCode: candidates[0].roomCode
    }, clientIp);
  }

  return handleCreateRoom({
    ...body,
    visibility: "public",
    settings: {
      mode: "lounge",
      maxSeats: 6,
      startingStack: 2000,
      blinds: {sb: 10, bb: 20, ante: 0},
      fillWithBots: true,
      felt: "emerald"
    }
  });
}

async function handleListPublicRooms(): Promise<Record<string, unknown>> {
  const cutoff = Date.now() - 15 * 60 * 1000;
  const snap = await db
    .collection("holdem_rooms")
    .orderBy("updatedAt", "desc")
    .limit(30)
    .get();

  const rooms = snap.docs
    .map((d) => d.data() as RoomDoc)
    .filter((r) => r.visibility === "public" && r.updatedAt >= cutoff && r.status !== "finished")
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8)
    .map((r) => ({
      roomCode: r.roomCode,
      status: r.status,
      mode: r.settings.mode,
      maxSeats: r.settings.maxSeats,
      humanCount: r.members.filter((m) => !m.isBot).length,
      totalCount: r.members.length,
      blinds: r.settings.blinds,
      startingStack: r.settings.startingStack,
      hostName: scrubPiiString(r.members[0]?.playerName, "ホスト", 12),
      updatedAt: r.updatedAt
    }));

  return {ok: true, rooms};
}

async function handleLeaveRoom(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
  if (!ROOM_CODE_REGEX.test(roomCode)) {
    return {ok: false, error: "Invalid room code"};
  }
  const accountId = typeof body.accountId === "string" ? body.accountId.trim().toUpperCase() : "";
  const accountSecret = typeof body.accountSecret === "string" ? body.accountSecret.trim() : "";
  const roomRef = db.collection("holdem_rooms").doc(roomCode);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) return;
    const room = snap.data() as RoomDoc;
    if (!verifyRoomMemberWrite(room, accountId, accountSecret)) return;

    const remaining = (room.members || []).filter((m) => m.accountId !== accountId);
    const humansLeft = remaining.filter((m) => !m.isBot);
    if (humansLeft.length === 0) {
      tx.set(roomRef, {
        ...room,
        members: [],
        status: "finished",
        updatedAt: Date.now()
      });
      return;
    }
    const nextHost =
      room.hostAccountId === accountId ? humansLeft[0].accountId : room.hostAccountId;
    tx.set(roomRef, {
      ...room,
      hostAccountId: nextHost,
      members: remaining,
      updatedAt: Date.now()
    });
  });

  return {ok: true};
}

function verifyRoomMemberWrite(room: RoomDoc, accountId: string, accountSecret: string): boolean {
  const isMember = room.members.some((m) => m.accountId === accountId);
  if (!isMember) return false;
  const expectedHash = room.memberAuthHashes?.[accountId];
  if (!expectedHash) return true;
  if (!accountSecret || accountSecret.length < 8) return false;
  const candidateHash = hashCredential("room", accountId, accountSecret);
  return safeCompareHex(expectedHash, candidateHash);
}

async function handleSyncRoomState(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
  if (!ROOM_CODE_REGEX.test(roomCode)) {
    return {ok: false, error: "Invalid room code"};
  }
  const accountId = typeof body.accountId === "string" ? body.accountId.trim().toUpperCase() : "";
  const accountSecret = typeof body.accountSecret === "string" ? body.accountSecret.trim() : "";
  const roomRef = db.collection("holdem_rooms").doc(roomCode);

  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) {
      throw new Error("ROOM_NOT_FOUND");
    }
    const room = snap.data() as RoomDoc;
    if (!verifyRoomMemberWrite(room, accountId, accountSecret)) {
      throw new Error("CREDENTIAL_MISMATCH");
    }

    const nextSeq = Math.floor(sanitizeNumber(body.actionSeq, room.actionSeq + 1, 0, 10_000_000));

    // Ignore stale out-of-order writes
    if (nextSeq < room.actionSeq) {
      return room;
    }

    const members = Array.isArray(body.members)
      ? (body.members as RoomMemberDoc[]).slice(0, 6).map((m) => ({
        accountId: scrubPiiString(m.accountId, "BOT", 24),
        playerName: scrubPiiString(m.playerName, "プレイヤー", 12),
        charId: scrubPiiString(m.charId, "karen", 16),
        rankPoints: Math.floor(sanitizeNumber(m.rankPoints, 0, 0, 10_000_000)),
        equippedTitle: scrubPiiString(m.equippedTitle, "ロイヤルラウンジの挑戦者", 32),
        isBot: Boolean(m.isBot),
        ready: Boolean(m.ready),
        joinedAt: Math.floor(sanitizeNumber(m.joinedAt, Date.now(), 0, Date.now() + 60_000)),
        lastSeenAt: Date.now()
      }))
      : room.members.map((m) =>
        m.accountId === accountId ? {...m, lastSeenAt: Date.now()} : m
      );

    const status =
      body.status === "waiting" || body.status === "playing" || body.status === "finished"
        ? body.status
        : room.status;

    const nextRoom: RoomDoc = {
      ...room,
      status,
      members,
      tableState: body.tableState !== undefined ? sanitizeDeepJson(body.tableState) : room.tableState,
      actionSeq: nextSeq,
      lastAction: body.lastAction !== undefined ? sanitizeDeepJson(body.lastAction) : room.lastAction,
      updatedAt: Date.now()
    };
    tx.set(roomRef, nextRoom);
    return nextRoom;
  });

  return {ok: true, room: toPublicRoom(updated)};
}

async function handleSendRoomStamp(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
  if (!ROOM_CODE_REGEX.test(roomCode)) {
    return {ok: false, error: "Invalid room code"};
  }
  const accountId = typeof body.accountId === "string" ? body.accountId.trim().toUpperCase() : "";
  const accountSecret = typeof body.accountSecret === "string" ? body.accountSecret.trim() : "";
  const playerName = scrubPiiString(body.playerName, "プレイヤー", 12);
  const stampId = scrubPiiString(body.stampId, "hello", 16);
  const text = scrubPiiString(body.text, "👋 よろしく！", 24);
  const seat = Math.floor(sanitizeNumber(body.seat, 0, 0, 5));

  const roomRef = db.collection("holdem_rooms").doc(roomCode);
  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) {
      throw new Error("ROOM_NOT_FOUND");
    }
    const room = snap.data() as RoomDoc;
    if (!verifyRoomMemberWrite(room, accountId, accountSecret)) {
      throw new Error("CREDENTIAL_MISMATCH");
    }
    const stamp: RoomStampDoc = {
      id: `${Date.now()}-${randomInt(100, 999)}`,
      seat,
      accountId,
      playerName,
      stampId,
      text,
      timestamp: Date.now()
    };
    const stamps = [...(room.stamps || []).slice(-9), stamp];
    const nextRoom: RoomDoc = {
      ...room,
      stamps,
      updatedAt: Date.now()
    };
    tx.set(roomRef, nextRoom);
    return nextRoom;
  });

  return {ok: true, room: toPublicRoom(updated)};
}

async function handleGetRoom(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
  if (!ROOM_CODE_REGEX.test(roomCode)) {
    return {ok: false, error: "Invalid room code"};
  }
  const roomRef = db.collection("holdem_rooms").doc(roomCode);
  const snap = await roomRef.get();
  if (!snap.exists) {
    return {ok: false, error: "指定されたルームが見つかりません。"};
  }
  return {ok: true, room: toPublicRoom(snap.data() as RoomDoc)};
}

export const holdemApi = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 20,
    memory: "256MiB",
    maxInstances: 10
  },
  (request, response) => {
    return new Promise<void>((resolve) => {
      corsHandler(request, response, async () => {
        try {
          response.set("Cache-Control", "no-store, no-cache, must-revalidate");
          response.set("X-Content-Type-Options", "nosniff");
          response.set("X-Frame-Options", "DENY");
          response.set("Referrer-Policy", "no-referrer");
          response.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

          if (request.method !== "POST") {
            response.status(405).json({ok: false, error: "Method not allowed"});
            resolve();
            return;
          }
          if (request.rawBody && request.rawBody.length > MAX_BODY_BYTES) {
            response.status(413).json({ok: false, error: "Payload too large"});
            resolve();
            return;
          }

          const forwarded = request.headers["x-forwarded-for"];
          const clientIp = (
            typeof forwarded === "string"
              ? forwarded.split(",")[0].trim()
              : request.ip || "unknown"
          ).slice(0, 64);

          if (!checkRateLimit(clientIp)) {
            response.status(429).json({ok: false, error: "リクエスト回数が上限に達しました。しばらく待ってからお試しください。"});
            resolve();
            return;
          }

          const body = (typeof request.body === "object" && request.body !== null ? request.body : {}) as Record<string, unknown>;
          const action = typeof body.action === "string" ? body.action : "";

          let result: Record<string, unknown>;
          switch (action) {
            case "syncAccount":
              result = await handleSyncAccount(body, clientIp);
              break;
            case "restoreAccount":
              result = await handleRestoreAccount(body, clientIp);
              break;
            case "getLeaderboard":
              result = await handleGetLeaderboard();
              break;
            case "createRoom":
              result = await handleCreateRoom(body);
              break;
            case "joinRoom":
              result = await handleJoinRoom(body, clientIp);
              break;
            case "quickMatch":
              result = await handleQuickMatch(body, clientIp);
              break;
            case "listPublicRooms":
              result = await handleListPublicRooms();
              break;
            case "syncRoomState":
              result = await handleSyncRoomState(body);
              break;
            case "sendRoomStamp":
              result = await handleSendRoomStamp(body);
              break;
            case "getRoom":
              result = await handleGetRoom(body);
              break;
            case "leaveRoom":
              result = await handleLeaveRoom(body);
              break;
            default:
              response.status(400).json({ok: false, error: "Unknown action"});
              resolve();
              return;
          }

          response.json(result);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "INTERNAL_ERROR";
          if (msg === "ROOM_NOT_FOUND") {
            response.status(404).json({ok: false, error: "ルームが見つかりません。"});
          } else if (msg === "ROOM_FULL") {
            response.status(409).json({ok: false, error: "このルームは満席です。"});
          } else if (msg === "CREDENTIAL_MISMATCH") {
            response.status(403).json({ok: false, error: "アカウント認証情報が一致しません。"});
          } else if (msg === "RATE_LIMITED") {
            response.status(429).json({ok: false, error: "試行回数が多すぎます。しばらく時間を置いてからお試しください。"});
          } else {
            logger.error("holdemApi error", {message: msg});
            response.status(500).json({ok: false, error: "通信エラーが発生しました。"});
          }
        }
        resolve();
      });
    });
  }
);
