import {
  Room, Player, GamePhase, PublicPlayer, RoomState,
  Submission, VoteResult, GameResult, GameSettings, WordCategory, DEFAULT_SETTINGS,
} from '../shared/types';
import { getRandomWordFromCategories } from './wordList';

// ============================================================
// In-memory room storage
// ============================================================
const rooms: Map<string, Room> = new Map();

// Maps socket id → room code for fast lookup on disconnect
const playerRoomMap: Map<string, string> = new Map();

// ============================================================
// Helpers
// ============================================================

/** Generate a random 4-character uppercase room code */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O to avoid confusion
  let code: string;
  do {
    code = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

/** Build the public room state (no secret info leaked) */
export function getRoomState(room: Room): RoomState {
  const currentTurnId = room.phase === 'submitting' && room.currentTurnIndex < room.turnOrder.length
    ? room.turnOrder[room.currentTurnIndex]
    : null;

  return {
    code: room.code,
    players: room.players.map(toPublicPlayer),
    phase: room.phase,
    timerEnd: room.timerEnd,
    submissions: room.phase === 'submitting' || room.phase === 'voting' || room.phase === 'guessing' || room.phase === 'result'
      ? room.submissions
      : [],
    round: room.round,
    currentTurnId,
    settings: room.settings,
  };
}

function toPublicPlayer(p: Player): PublicPlayer {
  return {
    id: p.id,
    username: p.username,
    isHost: p.isHost,
    isConnected: p.isConnected,
    hasSubmitted: p.submittedWord !== null,
    hasVoted: p.votedFor !== null,
    votesReceived: p.votesReceived,
  };
}

// ============================================================
// Room lifecycle
// ============================================================

export function createRoom(socketId: string, username: string): Room {
  const code = generateCode();
  const host: Player = {
    id: socketId,
    username,
    isHost: true,
    isImposter: false,
    isConnected: true,
    submittedWord: null,
    votedFor: null,
    votesReceived: 0,
  };
  const room: Room = {
    code,
    players: [host],
    phase: 'lobby',
    secretWord: null,
    imposterId: null,
    timerEnd: null,
    submissions: [],
    round: 0,
    turnOrder: [],
    currentTurnIndex: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
  rooms.set(code, room);
  playerRoomMap.set(socketId, code);
  return room;
}

export function joinRoom(
  roomCode: string, socketId: string, username: string
): { room: Room } | { error: string } {
  const code = roomCode.toUpperCase();
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found.' };
  if (room.phase !== 'lobby') return { error: 'Game already in progress.' };
  if (room.players.length >= 10) return { error: 'Room is full (max 10).' };
  if (room.players.some(p => p.username.toLowerCase() === username.toLowerCase())) {
    return { error: 'Username already taken in this room.' };
  }

  const player: Player = {
    id: socketId,
    username,
    isHost: false,
    isImposter: false,
    isConnected: true,
    submittedWord: null,
    votedFor: null,
    votesReceived: 0,
  };
  room.players.push(player);
  playerRoomMap.set(socketId, code);
  return { room };
}

// ============================================================
// Game start
// ============================================================

/** Shuffle an array in place (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function startGame(room: Room): { error?: string } {
  const connected = room.players.filter(p => p.isConnected);
  if (connected.length < 4) {
    return { error: 'Need at least 4 connected players to start.' };
  }

  // Pick secret word and imposter
  room.secretWord = getRandomWordFromCategories(room.settings.enabledCategories);
  const imposterIndex = Math.floor(Math.random() * connected.length);
  room.imposterId = connected[imposterIndex].id;

  // Reset player state for new round
  room.players.forEach(p => {
    p.isImposter = p.id === room.imposterId;
    p.submittedWord = null;
    p.votedFor = null;
    p.votesReceived = 0;
  });

  room.submissions = [];
  room.round += 1;

  // Build shuffled turn order from connected players
  room.turnOrder = shuffle(connected.map(p => p.id));
  room.currentTurnIndex = 0;

  room.phase = 'submitting';
  room.timerEnd = Date.now() + room.settings.turnTimerSecs * 1000;

  return {};
}

// ============================================================
// Submission phase (turn-based)
// ============================================================

/** Get the player id whose turn it currently is, or null if all turns done */
export function getCurrentTurnPlayerId(room: Room): string | null {
  if (room.currentTurnIndex >= room.turnOrder.length) return null;
  return room.turnOrder[room.currentTurnIndex];
}

export function submitWord(
  room: Room, socketId: string, word: string
): { error?: string; turnAdvanced: boolean; allDone: boolean } {
  if (room.phase !== 'submitting') return { error: 'Not in submission phase.', turnAdvanced: false, allDone: false };

  const currentId = getCurrentTurnPlayerId(room);
  if (socketId !== currentId) return { error: 'It is not your turn.', turnAdvanced: false, allDone: false };

  const player = room.players.find(p => p.id === socketId);
  if (!player) return { error: 'Player not found.', turnAdvanced: false, allDone: false };
  if (player.submittedWord !== null) return { error: 'Already submitted.', turnAdvanced: false, allDone: false };

  const trimmed = word.trim();
  if (!trimmed || trimmed.length > 30) return { error: 'Invalid word.', turnAdvanced: false, allDone: false };

  player.submittedWord = trimmed;
  room.submissions.push({ playerId: player.id, username: player.username, word: trimmed });

  // Advance to next turn
  room.currentTurnIndex++;
  const allDone = skipDisconnectedTurns(room);

  if (!allDone) {
    room.timerEnd = Date.now() + room.settings.turnTimerSecs * 1000;
  }

  return { turnAdvanced: true, allDone };
}

/** Skip over any disconnected players in turn order. Returns true if all turns exhausted. */
export function skipDisconnectedTurns(room: Room): boolean {
  while (room.currentTurnIndex < room.turnOrder.length) {
    const pid = room.turnOrder[room.currentTurnIndex];
    const p = room.players.find(pl => pl.id === pid);
    if (p && p.isConnected && p.submittedWord === null) {
      return false; // found a valid next player
    }
    // Skip — player is disconnected or already submitted somehow
    if (p && p.isConnected && p.submittedWord === null) {
      // won't happen but guard
      break;
    }
    room.currentTurnIndex++;
  }
  return room.currentTurnIndex >= room.turnOrder.length;
}

/** Force-submit "..." for the current turn player (timer ran out) and advance */
export function forceSkipCurrentTurn(room: Room): boolean {
  const currentId = getCurrentTurnPlayerId(room);
  if (!currentId) return true; // already done

  const player = room.players.find(p => p.id === currentId);
  if (player && player.submittedWord === null) {
    player.submittedWord = '...';
    room.submissions.push({ playerId: player.id, username: player.username, word: '...' });
  }

  room.currentTurnIndex++;
  const allDone = skipDisconnectedTurns(room);

  if (!allDone) {
    room.timerEnd = Date.now() + room.settings.turnTimerSecs * 1000;
  }

  return allDone;
}

/** Move room to voting phase */
export function moveToVoting(room: Room): void {
  // Fill in "..." for anyone who still didn't submit (safety net)
  room.players.forEach(p => {
    if (p.isConnected && p.submittedWord === null) {
      p.submittedWord = '...';
      room.submissions.push({ playerId: p.id, username: p.username, word: '...' });
    }
  });
  room.phase = 'voting';
  room.timerEnd = Date.now() + room.settings.votingTimerSecs * 1000;
}

// ============================================================
// Voting phase
// ============================================================

export function votePlayer(
  room: Room, voterId: string, targetId: string
): { error?: string; allVoted: boolean } {
  if (room.phase !== 'voting') return { error: 'Not in voting phase.', allVoted: false };

  const voter = room.players.find(p => p.id === voterId);
  if (!voter) return { error: 'Voter not found.', allVoted: false };
  if (voter.votedFor !== null) return { error: 'Already voted.', allVoted: false };
  if (voterId === targetId) return { error: 'Cannot vote for yourself.', allVoted: false };

  const target = room.players.find(p => p.id === targetId);
  if (!target || !target.isConnected) return { error: 'Invalid target.', allVoted: false };

  voter.votedFor = targetId;
  target.votesReceived += 1;

  const connected = room.players.filter(p => p.isConnected);
  const allVoted = connected.every(p => p.votedFor !== null);

  return { allVoted };
}

/** Tally votes and determine result */
export function tallyVotes(room: Room): {
  results: VoteResult[];
  ejectedId: string;
  imposterCaught: boolean;
} {
  // Build vote results
  const results: VoteResult[] = room.players
    .filter(p => p.isConnected)
    .map(p => ({ playerId: p.id, username: p.username, votes: p.votesReceived }))
    .sort((a, b) => b.votes - a.votes);

  const maxVotes = results[0]?.votes ?? 0;
  const tied = results.filter(r => r.votes === maxVotes);

  // Break ties randomly
  const ejected = tied[Math.floor(Math.random() * tied.length)];
  const imposterCaught = ejected.playerId === room.imposterId;

  return { results, ejectedId: ejected.playerId, imposterCaught };
}

// ============================================================
// Imposter guess phase
// ============================================================

export function moveToGuessing(room: Room): void {
  room.phase = 'guessing';
  room.timerEnd = Date.now() + room.settings.guessingTimerSecs * 1000;
}

export function checkImposterGuess(room: Room, guess: string): boolean {
  return guess.trim().toLowerCase() === room.secretWord!.toLowerCase();
}

// ============================================================
// Result helpers
// ============================================================

export function buildGameResult(
  room: Room,
  imposterCaught: boolean,
  imposterGuess?: string,
  imposterGuessCorrect?: boolean
): GameResult {
  const imposter = room.players.find(p => p.id === room.imposterId)!;
  let winners: 'crew' | 'imposter';

  if (imposterCaught) {
    winners = 'crew';
  } else {
    // Imposter survived the vote
    winners = imposterGuessCorrect ? 'imposter' : 'crew';
  }

  return {
    imposterCaught,
    imposterId: room.imposterId!,
    imposterName: imposter.username,
    secretWord: room.secretWord!,
    imposterGuess,
    imposterGuessCorrect,
    winners,
  };
}

export function moveToResult(room: Room): void {
  room.phase = 'result';
  room.timerEnd = null;
}

export function resetToLobby(room: Room): void {
  room.phase = 'lobby';
  room.secretWord = null;
  room.imposterId = null;
  room.timerEnd = null;
  room.submissions = [];
  room.turnOrder = [];
  room.currentTurnIndex = 0;
  room.players.forEach(p => {
    p.isImposter = false;
    p.submittedWord = null;
    p.votedFor = null;
    p.votesReceived = 0;
  });
  // Remove disconnected players on restart
  room.players = room.players.filter(p => p.isConnected);
  // settings intentionally NOT reset — persists across rounds
}

const ALL_CATEGORIES: WordCategory[] = ['Objects', 'Places', 'Animals', 'Food', 'Jobs'];

/** Validate and apply new settings; returns an error string or null on success */
export function updateSettings(room: Room, settings: GameSettings): string | null {
  if (room.phase !== 'lobby') return 'Settings can only be changed in the lobby.';

  // Validate categories — must have at least 1 valid entry
  const validCats = settings.enabledCategories.filter(
    (c): c is WordCategory => ALL_CATEGORIES.includes(c as WordCategory)
  );
  if (validCats.length === 0) return 'At least one category must be enabled.';

  // Clamp timers to allowed ranges
  const turnTimerSecs = Math.min(60, Math.max(5, Math.round(settings.turnTimerSecs)));
  const votingTimerSecs = Math.min(90, Math.max(10, Math.round(settings.votingTimerSecs)));
  const guessingTimerSecs = Math.min(60, Math.max(10, Math.round(settings.guessingTimerSecs)));

  room.settings = { enabledCategories: validCats, turnTimerSecs, votingTimerSecs, guessingTimerSecs };
  return null;
}

// ============================================================
// Disconnect handling
// ============================================================

export function handleDisconnect(socketId: string): {
  room: Room | null;
  wasHost: boolean;
  newHostId: string | null;
  tooFewPlayers: boolean;
} {
  const code = playerRoomMap.get(socketId);
  if (!code) return { room: null, wasHost: false, newHostId: null, tooFewPlayers: false };

  const room = rooms.get(code);
  if (!room) {
    playerRoomMap.delete(socketId);
    return { room: null, wasHost: false, newHostId: null, tooFewPlayers: false };
  }

  const player = room.players.find(p => p.id === socketId);
  if (!player) return { room: null, wasHost: false, newHostId: null, tooFewPlayers: false };

  player.isConnected = false;
  const wasHost = player.isHost;
  let newHostId: string | null = null;

  // Transfer host if needed
  if (wasHost) {
    player.isHost = false;
    const nextHost = room.players.find(p => p.isConnected);
    if (nextHost) {
      nextHost.isHost = true;
      newHostId = nextHost.id;
    }
  }

  playerRoomMap.delete(socketId);

  const connectedCount = room.players.filter(p => p.isConnected).length;
  const tooFewPlayers = connectedCount < 2;

  // Clean up empty rooms
  if (connectedCount === 0) {
    rooms.delete(code);
    return { room: null, wasHost, newHostId, tooFewPlayers: true };
  }

  // If in lobby, remove disconnected players entirely
  if (room.phase === 'lobby') {
    room.players = room.players.filter(p => p.isConnected);
  }

  return { room, wasHost, newHostId, tooFewPlayers };
}

// ============================================================
// Reconnect handling
// ============================================================

export function handleReconnect(
  oldSocketId: string, newSocketId: string, roomCode: string, username: string
): Room | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;

  const player = room.players.find(
    p => p.username.toLowerCase() === username.toLowerCase() && !p.isConnected
  );
  if (!player) return null;

  // Update socket id
  playerRoomMap.delete(oldSocketId);
  player.id = newSocketId;
  player.isConnected = true;
  playerRoomMap.set(newSocketId, room.code);

  return room;
}

// ============================================================
// Lookup helpers
// ============================================================

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function getRoomBySocketId(socketId: string): Room | undefined {
  const code = playerRoomMap.get(socketId);
  return code ? rooms.get(code) : undefined;
}

export function getPlayerRoom(socketId: string): string | undefined {
  return playerRoomMap.get(socketId);
}
