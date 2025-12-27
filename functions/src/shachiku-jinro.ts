import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Helper to generate a random 4-character room ID
function generateRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const createRoom = onCall(async (request) => {
  const {userName} = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  if (!userName || typeof userName !== "string") {
    throw new HttpsError("invalid-argument", "User name is required.");
  }

  const roomId = generateRoomId();
  const roomRef = db.collection("shachiku_rooms").doc(roomId);

  const initialPlayer = {
    id: uid,
    name: userName,
    role: null, // Role not assigned yet
    isAlive: true,
    isHost: true,
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
      timestamp: Date.now(),
    }],
    votes: {},
    actions: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await roomRef.set(roomData);

  return {roomId};
});

export const joinRoom = onCall(async (request) => {
  const {roomId, userName} = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  if (!roomId || typeof roomId !== "string") {
    throw new HttpsError("invalid-argument", "Room ID is required.");
  }
  if (!userName || typeof userName !== "string") {
    throw new HttpsError("invalid-argument", "User name is required.");
  }

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

    if (Object.keys(roomData.players || {}).length >= 8) {
      throw new HttpsError("resource-exhausted", "Room is full.");
    }

    // Check if user is already in room
    if (roomData.players && roomData.players[uid]) {
       // Just update name if needed or do nothing
       return {roomId, joined: true};
    }

    const newPlayer = {
      id: uid,
      name: userName,
      role: null,
      isAlive: true,
      isHost: false,
    };

    const newLogs = [
      ...(roomData.logs || []),
      {
        id: Date.now().toString(),
        type: "SYSTEM",
        message: `${userName} joined the room.`,
        timestamp: Date.now(),
      },
    ];

    transaction.update(roomRef, {
      [`players.${uid}`]: newPlayer,
      logs: newLogs,
      updatedAt: Date.now(),
    });

    return {roomId, joined: true};
  });
});

export const startGame = onCall(async (request) => {
  const {roomId} = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  if (!roomId) {
    throw new HttpsError("invalid-argument", "Room ID is required.");
  }

  const roomRef = db.collection("shachiku_rooms").doc(roomId);

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

    // Role assignment logic
    // Roles:
    // SPY (Wolf), DRONE (Villager), HR (Seer), GA (Bodyguard)
    // GOSSIP (Medium), YESMAN (Madman), ENGINEER (Mason), CONSULTANT (Fox)

    let roles: string[] = [];
    const count = playerIds.length;

    // Minimum: 1 Spy, 1 HR, 1 GA, rest Drones
    if (count === 4) {
      roles = ['SPY', 'HR', 'GA', 'DRONE'];
    } else if (count === 5) {
      roles = ['SPY', 'HR', 'GA', 'DRONE', 'YESMAN'];
    } else if (count === 6) {
      roles = ['SPY', 'HR', 'GA', 'GOSSIP', 'YESMAN', 'DRONE'];
    } else if (count === 7) {
      roles = ['SPY', 'SPY', 'HR', 'GA', 'GOSSIP', 'YESMAN', 'DRONE'];
    } else if (count >= 8) {
      // 8 players: 2 Spies, 1 HR, 1 GA, 1 Gossip, 1 Consultant, 2 Drones?
      // Or 2 Spies, 1 HR, 1 GA, 1 Gossip, 1 Yesman, 1 Engineer, 1 Consultant?
      // Let's mix it up for variety or stick to a standard set.
      // User asked for "Engineer" and "Consultant" and "Others".
      // Let's try to include as many special roles as possible for 8 players.
      roles = ['SPY', 'SPY', 'HR', 'GA', 'GOSSIP', 'ENGINEER', 'CONSULTANT', 'YESMAN'];
    }

    // If we have more players than role slots defined above (e.g. if we expand to 9+), fill with DRONE
    while (roles.length < count) {
      roles.push('DRONE');
    }
    // If we have fewer players (shouldn't happen with logic above), trim
    roles = roles.slice(0, count);

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Assign roles to players
    const updates: Record<string, any> = {};
    playerIds.forEach((pid, index) => {
      updates[`players.${pid}.role`] = roles[index];
    });

    updates.phase = 'DAY_CONVERSATION';
    updates.dayCount = 1;
    updates.timeLimit = Date.now() + 180 * 1000; // 3 minutes for day 1

    // System log
    const newLog = {
      id: Date.now().toString(),
      type: "SYSTEM",
      message: "Game started! Day 1 conversation begin.",
      timestamp: Date.now(),
    };
    updates.logs = [...(roomData.logs || []), newLog];
    updates.updatedAt = Date.now();

    transaction.update(roomRef, updates);

    return {started: true};
  });
});

export const submitAction = onCall(async (request) => {
  const {roomId, actionType, targetId} = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  if (!roomId || !actionType) {
    throw new HttpsError("invalid-argument", "Missing arguments.");
  }

  const roomRef = db.collection("shachiku_rooms").doc(roomId);

  return db.runTransaction(async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists) {
      throw new HttpsError("not-found", "Room not found.");
    }
    const roomData = roomDoc.data();
    if (!roomData) return;

    const player = roomData.players[uid];
    if (!player || !player.isAlive) {
      throw new HttpsError("permission-denied", "You are not an active player.");
    }

    const updates: Record<string, any> = {};

    // --- DAY VOTE ---
    if (roomData.phase === 'DAY_VOTE' && actionType === 'VOTE') {
      if (roomData.votes && roomData.votes[uid]) {
         // Already voted (or allow changing vote?)
         // Let's allow changing vote for now, or just overwrite
      }
      updates[`votes.${uid}`] = targetId;

      // Check if everyone has voted
      const alivePlayers = Object.values(roomData.players).filter((p: any) => p.isAlive);
      const currentVotes = {...roomData.votes, [uid]: targetId};
      const voteCount = Object.keys(currentVotes).length;

      if (voteCount >= alivePlayers.length) {
        // Tally votes
        const tallies: Record<string, number> = {};
        Object.values(currentVotes).forEach((tid: any) => {
          tallies[tid] = (tallies[tid] || 0) + 1;
        });

        // Find max
        let maxVotes = 0;
        let candidate = null;
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
        let nextPhase = 'NIGHT_ACTION';

        if (candidate && !tie) {
           const executedPlayerName = roomData.players[candidate].name;
           // const executedPlayerRole = roomData.players[candidate].role;

           updates[`players.${candidate}.isAlive`] = false;
           newLogs.push({
             id: Date.now().toString(),
             type: "RESULT",
             message: `${executedPlayerName} was fired (executed).`,
             timestamp: Date.now()
           });

           // CONSULTANT (Fox) Death Check: If Consultant is executed, they die normally.
        } else {
           newLogs.push({
             id: Date.now().toString(),
             type: "RESULT",
             message: `Vote tied. No one was fired.`,
             timestamp: Date.now()
           });
        }

        updates.phase = nextPhase;
        updates.votes = {}; // Clear votes
        updates.logs = newLogs;
        updates.updatedAt = Date.now();

        // Check win condition
        // (Will implement simple check later or here)
      } else {
         updates.updatedAt = Date.now();
      }
    }

    // --- NIGHT ACTION ---
    else if (roomData.phase === 'NIGHT_ACTION') {
      // SPY (Wolf) -> ATTACK
      // HR (Seer) -> DIVINE
      // GA (Bodyguard) -> GUARD

      // Store action
      updates[`actions.${uid}`] = targetId;

      // Check if all active roles have acted
      const alivePlayers = Object.values(roomData.players).filter((p: any) => p.isAlive);
      // const activeRoles = ['SPY', 'HR', 'GA']; // Roles that MUST act
      // Note: If multiple spies, only one needs to act or we need consensus.
      // For simplicity: Last spy action overwrites.

      // const pendingActors = alivePlayers.filter((p: any) => activeRoles.includes(p.role));
      const currentActions = {...roomData.actions, [uid]: targetId};

      // Check if we have actions from all role types that exist and are alive
      const hasSpy = alivePlayers.some((p: any) => p.role === 'SPY');
      const hasHR = alivePlayers.some((p: any) => p.role === 'HR');
      const hasGA = alivePlayers.some((p: any) => p.role === 'GA');

      const spyActed = !hasSpy || Object.keys(currentActions).some(id => roomData.players[id].role === 'SPY');
      const hrActed = !hasHR || Object.keys(currentActions).some(id => roomData.players[id].role === 'HR');
      const gaActed = !hasGA || Object.keys(currentActions).some(id => roomData.players[id].role === 'GA');

      if (spyActed && hrActed && gaActed) {
        // Resolve Night
        const spyAction = Object.entries(currentActions).find(([actorId]) => roomData.players[actorId].role === 'SPY');
        const gaAction = Object.entries(currentActions).find(([actorId]) => roomData.players[actorId].role === 'GA');
        const hrAction = Object.entries(currentActions).find(([actorId]) => roomData.players[actorId].role === 'HR');

        const targetId = spyAction ? (spyAction[1] as string) : null;
        const guardedId = gaAction ? (gaAction[1] as string) : null;
        const divinedId = hrAction ? (hrAction[1] as string) : null;

        const newLogs = [...roomData.logs];

        // Resolve Attack
        if (targetId) {
          const targetPlayer = roomData.players[targetId];
          let isProtected = (targetId === guardedId);
          let isConsultant = (targetPlayer.role === 'CONSULTANT');

          if (!isProtected && !isConsultant) {
             updates[`players.${targetId}.isAlive`] = false;
             newLogs.push({
               id: Date.now().toString(),
               type: "RESULT",
               message: `Someone was found fired (attacked) in the morning.`,
               timestamp: Date.now()
             });
          } else {
             newLogs.push({
               id: Date.now().toString(),
               type: "RESULT",
               message: `Peaceful night. No one was fired.`,
               timestamp: Date.now()
             });
          }
        }

        // Resolve Divine (Just for logic, result is shown to Seer on client usually, or we can add private log)
        if (divinedId) {
           const divinedPlayer = roomData.players[divinedId];
           if (divinedPlayer.role === 'CONSULTANT') {
             // Consultant dies if divined
             updates[`players.${divinedId}.isAlive`] = false;
             newLogs.push({
                id: Date.now().toString(),
                type: "RESULT",
                message: `${divinedPlayer.name} (Consultant) was exposed and fired.`,
                timestamp: Date.now()
             });
           }
        }

        updates.phase = 'DAY_CONVERSATION';
        updates.dayCount = roomData.dayCount + 1;
        updates.actions = {};
        updates.logs = newLogs;
        updates.timeLimit = Date.now() + 180 * 1000;
        updates.updatedAt = Date.now();

        // Check Win Condition (Simpilifed)
        const activeAfter = Object.values(roomData.players).map((p:any) => {
           // Apply pending death updates
           if (updates[`players.${p.id}.isAlive`] === false) return {...p, isAlive: false};
           return p;
        }).filter((p:any) => p.isAlive);

        const spiesCount = activeAfter.filter((p:any) => p.role === 'SPY').length;
        const othersCount = activeAfter.length - spiesCount;

        if (spiesCount === 0) {
           updates.winner = 'COMPANY';
           updates.phase = 'GAME_OVER';
        } else if (spiesCount >= othersCount) {
           updates.winner = 'SPIES';
           updates.phase = 'GAME_OVER';

           // Check Consultant Win
           const consultant = activeAfter.find((p:any) => p.role === 'CONSULTANT');
           if (consultant) {
             updates.winner = 'CONSULTANT';
           }
        }
      } else {
         updates.updatedAt = Date.now();
      }
    }

    transaction.update(roomRef, updates);
    return {success: true};
  });
});

export const nextPhase = onCall(async (request) => {
  const {roomId} = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  if (!roomId) {
    throw new HttpsError("invalid-argument", "Room ID is required.");
  }

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

    if (roomData.phase !== 'DAY_CONVERSATION') {
      throw new HttpsError("failed-precondition", "Can only skip conversation.");
    }

    const updates: Record<string, any> = {};
    updates.phase = 'DAY_VOTE';
    updates.logs = [
      ...(roomData.logs || []),
      {
        id: Date.now().toString(),
        type: "SYSTEM",
        message: "Discussion ended. Time to vote (HR Meeting).",
        timestamp: Date.now(),
      }
    ];
    updates.updatedAt = Date.now();

    transaction.update(roomRef, updates);
    return {success: true};
  });
});
