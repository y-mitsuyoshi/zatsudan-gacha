import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {randomInt} from "crypto";

// Ensure Firebase Admin is initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const ROOM_ID_REGEX = /^[A-Z0-9]{4}$/;
const MAX_USERNAME_LENGTH = 20;

// Helper to generate a cryptographically secure random 4-character room ID
function generateRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(randomInt(0, chars.length));
  }
  return result;
}

function validateUserName(rawName: unknown): string {
  if (!rawName || typeof rawName !== "string") {
    throw new HttpsError("invalid-argument", "User name is required.");
  }
  const trimmed = rawName.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_USERNAME_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `User name must be between 1 and ${MAX_USERNAME_LENGTH} characters.`
    );
  }
  return trimmed;
}

function validateRoomId(rawRoomId: unknown): string {
  if (!rawRoomId || typeof rawRoomId !== "string" || !ROOM_ID_REGEX.test(rawRoomId)) {
    throw new HttpsError("invalid-argument", "Valid 4-character Room ID is required.");
  }
  return rawRoomId;
}

export const createRoom = onCall({region: "us-central1"}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  const userName = validateUserName(request.data?.userName);

  const roomId = generateRoomId();
  const roomRef = db.collection("shachiku_rooms").doc(roomId);

  const initialPlayer = {
    id: uid,
    name: userName,
    role: null, // Public role remains null until game over to prevent role leakage
    isAlive: true,
    isHost: true
  };

  const roomData = {
    id: roomId,
    hostId: uid,
    players: {[uid]: initialPlayer},
    phase: "LOBBY",
    dayCount: 0,
    timeLimit: 0,
    logs: [{
      id: Date.now().toString(),
      type: "SYSTEM",
      message: `Room created by ${userName}`,
      timestamp: Date.now()
    }],
    votes: {},
    actions: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await roomRef.set(roomData);
    return {roomId};
  } catch (error) {
    console.error("Error creating room:", error);
    throw new HttpsError("internal", "Failed to create room.");
  }
});

export const joinRoom = onCall({region: "us-central1"}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  const roomId = validateRoomId(request.data?.roomId);
  const userName = validateUserName(request.data?.userName);

  const roomRef = db.collection("shachiku_rooms").doc(roomId);

  return db.runTransaction(async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const roomData = roomDoc.data();
    if (roomData?.phase !== "LOBBY") {
      throw new HttpsError("failed-precondition", "Game has already started.");
    }

    // Check if user is already in room
    if (roomData.players && roomData.players[uid]) {
      return {roomId, joined: true};
    }

    if (Object.keys(roomData.players || {}).length >= 8) {
      throw new HttpsError("resource-exhausted", "Room is full.");
    }

    const newPlayer = {
      id: uid,
      name: userName,
      role: null,
      isAlive: true,
      isHost: false
    };

    const newLogs = [
      ...(roomData.logs || []),
      {
        id: Date.now().toString(),
        type: "SYSTEM",
        message: `${userName} joined the room.`,
        timestamp: Date.now()
      }
    ];

    transaction.update(roomRef, {
      [`players.${uid}`]: newPlayer,
      logs: newLogs,
      updatedAt: Date.now()
    });

    return {roomId, joined: true};
  });
});

export const startGame = onCall({region: "us-central1"}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  const roomId = validateRoomId(request.data?.roomId);

  const roomRef = db.collection("shachiku_rooms").doc(roomId);
  const secretsRef = roomRef.collection("secrets").doc("roles");

  return db.runTransaction(async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists) {
      throw new HttpsError("not-found", "Room not found.");
    }
    const roomData = roomDoc.data();
    if (!roomData) return;

    if (roomData.hostId !== uid) {
      throw new HttpsError("permission-denied", "Only host can start the game.");
    }

    if (roomData.phase !== "LOBBY") {
      throw new HttpsError("failed-precondition", "Game already started.");
    }

    const playerIds = Object.keys(roomData.players);
    if (playerIds.length < 4) {
      throw new HttpsError("failed-precondition", "Need at least 4 players.");
    }

    let roles: string[] = [];
    const count = playerIds.length;

    if (count === 4) {
      roles = ["SPY", "HR", "GA", "DRONE"];
    } else if (count === 5) {
      roles = ["SPY", "HR", "GA", "DRONE", "YESMAN"];
    } else if (count === 6) {
      roles = ["SPY", "HR", "GA", "GOSSIP", "YESMAN", "DRONE"];
    } else if (count === 7) {
      roles = ["SPY", "SPY", "HR", "GA", "GOSSIP", "YESMAN", "DRONE"];
    } else if (count >= 8) {
      roles = ["SPY", "SPY", "HR", "GA", "GOSSIP", "ENGINEER", "CONSULTANT", "YESMAN"];
    }

    while (roles.length < count) {
      roles.push("DRONE");
    }
    roles = roles.slice(0, count);

    // Cryptographically secure Fisher-Yates shuffle
    for (let i = roles.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Store secret roles in server-side subcollection & per-player private docs
    const roleMap: Record<string, string> = {};
    playerIds.forEach((pid, index) => {
      roleMap[pid] = roles[index];
      const playerSecretRef = roomRef.collection("player_secrets").doc(pid);
      transaction.set(playerSecretRef, {role: roles[index]});
    });
    transaction.set(secretsRef, {roles: roleMap, actions: {}});

    const updates: Record<string, unknown> = {
      phase: "DAY_CONVERSATION",
      dayCount: 1,
      timeLimit: Date.now() + 180 * 1000,
      logs: [
        ...(roomData.logs || []),
        {
          id: Date.now().toString(),
          type: "SYSTEM",
          message: "Game started! Day 1 conversation begin.",
          timestamp: Date.now()
        }
      ],
      updatedAt: Date.now()
    };

    transaction.update(roomRef, updates);

    return {started: true};
  });
});

export const submitAction = onCall({region: "us-central1"}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  const roomId = validateRoomId(request.data?.roomId);
  const {actionType, targetId} = request.data || {};
  if (!actionType || typeof actionType !== "string" || !targetId || typeof targetId !== "string") {
    throw new HttpsError("invalid-argument", "Missing or invalid arguments.");
  }

  const roomRef = db.collection("shachiku_rooms").doc(roomId);
  const secretsRef = roomRef.collection("secrets").doc("roles");

  return db.runTransaction(async (transaction) => {
    const [roomDoc, secretsDoc] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(secretsRef)
    ]);
    if (!roomDoc.exists) {
      throw new HttpsError("not-found", "Room not found.");
    }
    const roomData = roomDoc.data();
    if (!roomData) return;

    const secretsData = secretsDoc.data() || {};
    const roleMap: Record<string, string> = secretsData.roles || {};
    const secretActions: Record<string, string> = secretsData.actions || {};

    const player = roomData.players[uid];
    if (!player || !player.isAlive) {
      throw new HttpsError("permission-denied", "You are not an active player.");
    }

    const targetPlayer = roomData.players[targetId];
    if (!targetPlayer || !targetPlayer.isAlive || targetId === uid) {
      throw new HttpsError("invalid-argument", "Invalid target player.");
    }

    const getPlayerRole = (pid: string): string | null => {
      return roleMap[pid] || roomData.players[pid]?.role || null;
    };

    const updates: Record<string, unknown> = {};

    // --- DAY VOTE ---
    if (roomData.phase === "DAY_VOTE" && actionType === "VOTE") {
      updates[`votes.${uid}`] = targetId;

      const alivePlayers = Object.values(roomData.players).filter((p: any) => p.isAlive);
      const currentVotes = {...roomData.votes, [uid]: targetId};
      const voteCount = Object.keys(currentVotes).length;

      if (voteCount >= alivePlayers.length) {
        const tallies: Record<string, number> = {};
        Object.values(currentVotes).forEach((tid: any) => {
          tallies[tid] = (tallies[tid] || 0) + 1;
        });

        let maxVotes = 0;
        let candidate: string | null = null;
        let tie = false;
        for (const [tid, count] of Object.entries(tallies)) {
          if (count > maxVotes) {
            maxVotes = count;
            candidate = tid;
            tie = false;
          } else if (count === maxVotes) {
            tie = true;
          }
        }

        const newLogs = [...roomData.logs];

        if (candidate && !tie && roomData.players[candidate]) {
          const executedPlayerName = roomData.players[candidate].name;
          updates[`players.${candidate}.isAlive`] = false;
          newLogs.push({
            id: Date.now().toString(),
            type: "RESULT",
            message: `${executedPlayerName} was fired (executed).`,
            timestamp: Date.now()
          });
        } else {
          newLogs.push({
            id: Date.now().toString(),
            type: "RESULT",
            message: "Vote tied. No one was fired.",
            timestamp: Date.now()
          });
        }

        updates.phase = "NIGHT_ACTION";
        updates.votes = {};
        updates.logs = newLogs;
        updates.updatedAt = Date.now();
      } else {
        updates.updatedAt = Date.now();
      }
    } else if (roomData.phase === "NIGHT_ACTION") {
      // --- NIGHT ACTION ---
      const actorRole = getPlayerRole(uid);
      if (!actorRole || !["SPY", "HR", "GA"].includes(actorRole)) {
        throw new HttpsError("permission-denied", "Your role cannot perform night actions.");
      }

      const currentActions: Record<string, string> = {...secretActions, [uid]: targetId};
      const alivePlayers = Object.values(roomData.players).filter((p: any) => p.isAlive);

      const hasSpy = alivePlayers.some((p: any) => getPlayerRole(p.id) === "SPY");
      const hasHR = alivePlayers.some((p: any) => getPlayerRole(p.id) === "HR");
      const hasGA = alivePlayers.some((p: any) => getPlayerRole(p.id) === "GA");

      const spyActed = !hasSpy || Object.keys(currentActions).some((id) => getPlayerRole(id) === "SPY");
      const hrActed = !hasHR || Object.keys(currentActions).some((id) => getPlayerRole(id) === "HR");
      const gaActed = !hasGA || Object.keys(currentActions).some((id) => getPlayerRole(id) === "GA");

      if (spyActed && hrActed && gaActed) {
        const spyAction = Object.entries(currentActions).find(([actorId]) => getPlayerRole(actorId) === "SPY");
        const gaAction = Object.entries(currentActions).find(([actorId]) => getPlayerRole(actorId) === "GA");
        const hrAction = Object.entries(currentActions).find(([actorId]) => getPlayerRole(actorId) === "HR");

        const attackedTargetId = spyAction ? spyAction[1] : null;
        const guardedId = gaAction ? gaAction[1] : null;
        const divinedId = hrAction ? hrAction[1] : null;

        const newLogs = [...roomData.logs];

        if (attackedTargetId && roomData.players[attackedTargetId]) {
          const attackedRole = getPlayerRole(attackedTargetId);
          const isProtected = attackedTargetId === guardedId;
          const isConsultant = attackedRole === "CONSULTANT";

          if (!isProtected && !isConsultant) {
            updates[`players.${attackedTargetId}.isAlive`] = false;
            newLogs.push({
              id: Date.now().toString(),
              type: "RESULT",
              message: "Someone was found fired (attacked) in the morning.",
              timestamp: Date.now()
            });
          } else {
            newLogs.push({
              id: Date.now().toString(),
              type: "RESULT",
              message: "Peaceful night. No one was fired.",
              timestamp: Date.now()
            });
          }
        }

        if (divinedId && roomData.players[divinedId]) {
          const divinedPlayer = roomData.players[divinedId];
          const divinedRole = getPlayerRole(divinedId);
          if (divinedRole === "CONSULTANT") {
            updates[`players.${divinedId}.isAlive`] = false;
            newLogs.push({
              id: Date.now().toString(),
              type: "RESULT",
              message: `${divinedPlayer.name} (Consultant) was exposed and fired.`,
              timestamp: Date.now()
            });
          }
        }

        updates.phase = "DAY_CONVERSATION";
        updates.dayCount = roomData.dayCount + 1;
        updates.actions = {};
        updates.logs = newLogs;
        updates.timeLimit = Date.now() + 180 * 1000;
        updates.updatedAt = Date.now();

        transaction.set(secretsRef, {roles: roleMap, actions: {}}, {merge: true});

        const activeAfter = Object.values(roomData.players)
          .map((p: any) => {
            if (updates[`players.${p.id}.isAlive`] === false) return {...p, isAlive: false};
            return p;
          })
          .filter((p: any) => p.isAlive);

        const spiesCount = activeAfter.filter((p: any) => getPlayerRole(p.id) === "SPY").length;
        const othersCount = activeAfter.length - spiesCount;

        if (spiesCount === 0) {
          updates.winner = "COMPANY";
          updates.phase = "GAME_OVER";
        } else if (spiesCount >= othersCount) {
          updates.winner = "SPIES";
          updates.phase = "GAME_OVER";

          const consultant = activeAfter.find((p: any) => getPlayerRole(p.id) === "CONSULTANT");
          if (consultant) {
            updates.winner = "CONSULTANT";
          }
        }

        // Reveal roles only when game is over
        if (updates.phase === "GAME_OVER") {
          for (const [pid, r] of Object.entries(roleMap)) {
            updates[`players.${pid}.role`] = r;
          }
        }
      } else {
        transaction.set(secretsRef, {roles: roleMap, actions: currentActions}, {merge: true});
        updates.updatedAt = Date.now();
      }
    } else {
      throw new HttpsError("failed-precondition", "Action not allowed in current phase.");
    }

    transaction.update(roomRef, updates);
    return {success: true};
  });
});

export const nextPhase = onCall({region: "us-central1"}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  const roomId = validateRoomId(request.data?.roomId);

  const roomRef = db.collection("shachiku_rooms").doc(roomId);

  return db.runTransaction(async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists) {
      throw new HttpsError("not-found", "Room not found.");
    }
    const roomData = roomDoc.data();
    if (!roomData) return;

    if (roomData.hostId !== uid) {
      throw new HttpsError("permission-denied", "Only host can change phase.");
    }

    if (roomData.phase !== "DAY_CONVERSATION") {
      throw new HttpsError("failed-precondition", "Can only skip conversation.");
    }

    const updates: Record<string, unknown> = {
      phase: "DAY_VOTE",
      logs: [
        ...(roomData.logs || []),
        {
          id: Date.now().toString(),
          type: "SYSTEM",
          message: "Discussion ended. Time to vote (HR Meeting).",
          timestamp: Date.now()
        }
      ],
      updatedAt: Date.now()
    };

    transaction.update(roomRef, updates);
    return {success: true};
  });
});
