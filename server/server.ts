import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import {
  ClientEvents, ServerEvents,
  CreateRoomPayload, JoinRoomPayload,
  SubmitWordPayload, VotePlayerPayload, GuessWordPayload,
  UpdateSettingsPayload,
} from '../shared/types';
import {
  createRoom, joinRoom, startGame, submitWord,
  moveToVoting, votePlayer, tallyVotes, moveToGuessing,
  checkImposterGuess, buildGameResult, moveToResult,
  resetToLobby, handleDisconnect, handleReconnect,
  getRoomState, getRoomBySocketId, getRoom,
  forceSkipCurrentTurn, getCurrentTurnPlayerId,
  updateSettings,
} from './roomManager';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10_000,
  pingTimeout: 20_000,
});

// ============================================================
// Timer management — tracks active timers by room code
// ============================================================
const roomTimers: Map<string, NodeJS.Timeout> = new Map();

function clearRoomTimer(roomCode: string): void {
  const existing = roomTimers.get(roomCode);
  if (existing) {
    clearTimeout(existing);
    roomTimers.delete(roomCode);
  }
}

function setRoomTimer(roomCode: string, ms: number, callback: () => void): void {
  clearRoomTimer(roomCode);
  const timer = setTimeout(callback, ms);
  roomTimers.set(roomCode, timer);
}

// Broadcast updated room state to everyone in the room
function broadcastRoom(roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit(ServerEvents.ROOM_UPDATE, getRoomState(room));
}

// ============================================================
// Socket connection handler
// ============================================================
io.on('connection', (socket: Socket) => {
  console.log(`Connected: ${socket.id}`);

  // ----------------------------------------------------------
  // CREATE ROOM
  // ----------------------------------------------------------
  socket.on(ClientEvents.CREATE_ROOM, ({ username }: CreateRoomPayload) => {
    if (!username || username.trim().length < 1 || username.trim().length > 16) {
      socket.emit(ServerEvents.ERROR, { message: 'Username must be 1-16 characters.' });
      return;
    }

    const room = createRoom(socket.id, username.trim());
    socket.join(room.code);
    socket.emit(ServerEvents.ROOM_CREATED, { roomCode: room.code });
    broadcastRoom(room.code);
  });

  // ----------------------------------------------------------
  // JOIN ROOM
  // ----------------------------------------------------------
  socket.on(ClientEvents.JOIN_ROOM, ({ roomCode, username }: JoinRoomPayload) => {
    if (!username || username.trim().length < 1 || username.trim().length > 16) {
      socket.emit(ServerEvents.ERROR, { message: 'Username must be 1-16 characters.' });
      return;
    }
    if (!roomCode || roomCode.trim().length !== 4) {
      socket.emit(ServerEvents.ERROR, { message: 'Room code must be 4 characters.' });
      return;
    }

    // Try reconnect first
    const reconnected = handleReconnect('', socket.id, roomCode.trim(), username.trim());
    if (reconnected) {
      socket.join(reconnected.code);
      socket.emit(ServerEvents.ROOM_CREATED, { roomCode: reconnected.code });
      // Send them their role back if game is in progress
      const player = reconnected.players.find(p => p.id === socket.id);
      if (reconnected.phase !== 'lobby' && player) {
        socket.emit(ServerEvents.RECEIVE_WORD, {
          word: player.isImposter ? null : reconnected.secretWord,
          isImposter: player.isImposter,
        });
      }
      broadcastRoom(reconnected.code);
      return;
    }

    const result = joinRoom(roomCode.trim(), socket.id, username.trim());
    if ('error' in result) {
      socket.emit(ServerEvents.ERROR, { message: result.error });
      return;
    }

    socket.join(result.room.code);
    socket.emit(ServerEvents.ROOM_CREATED, { roomCode: result.room.code });
    broadcastRoom(result.room.code);
  });

  // ----------------------------------------------------------
  // START GAME
  // ----------------------------------------------------------
  socket.on(ClientEvents.START_GAME, () => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const host = room.players.find(p => p.id === socket.id);
    if (!host?.isHost) {
      socket.emit(ServerEvents.ERROR, { message: 'Only the host can start the game.' });
      return;
    }

    const { error } = startGame(room);
    if (error) {
      socket.emit(ServerEvents.ERROR, { message: error });
      return;
    }

    // Send each player their role privately
    room.players.filter(p => p.isConnected).forEach(p => {
      io.to(p.id).emit(ServerEvents.RECEIVE_WORD, {
        word: p.isImposter ? null : room.secretWord,
        isImposter: p.isImposter,
      });
    });

    io.to(room.code).emit(ServerEvents.GAME_STARTED);
    broadcastRoom(room.code);

    // Start per-turn timer for first player
    startTurnTimer(room.code);
  });

  // ----------------------------------------------------------
  // SUBMIT WORD (turn-based)
  // ----------------------------------------------------------
  socket.on(ClientEvents.SUBMIT_WORD, ({ word }: SubmitWordPayload) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const { error, allDone } = submitWord(room, socket.id, word);
    if (error) {
      socket.emit(ServerEvents.ERROR, { message: error });
      return;
    }

    clearRoomTimer(room.code);
    broadcastRoom(room.code);

    if (allDone) {
      moveToVoting(room);
      broadcastRoom(room.code);
      startVotingTimer(room.code);
    } else {
      // Start timer for next player's turn
      startTurnTimer(room.code);
    }
  });

  // ----------------------------------------------------------
  // VOTE PLAYER
  // ----------------------------------------------------------
  socket.on(ClientEvents.VOTE_PLAYER, ({ targetId }: VotePlayerPayload) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const { error, allVoted } = votePlayer(room, socket.id, targetId);
    if (error) {
      socket.emit(ServerEvents.ERROR, { message: error });
      return;
    }

    broadcastRoom(room.code);

    if (allVoted) {
      clearRoomTimer(room.code);
      resolveVoting(room.code);
    }
  });

  // ----------------------------------------------------------
  // GUESS WORD (imposter's guess after surviving vote)
  // ----------------------------------------------------------
  socket.on(ClientEvents.GUESS_WORD, ({ guess }: GuessWordPayload) => {
    const room = getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'guessing') return;
    if (socket.id !== room.imposterId) return;

    clearRoomTimer(room.code);

    const correct = checkImposterGuess(room, guess);
    const result = buildGameResult(room, false, guess.trim(), correct);

    moveToResult(room);
    io.to(room.code).emit(ServerEvents.GAME_OVER, result);
    broadcastRoom(room.code);
  });

  // ----------------------------------------------------------
  // RESTART GAME (back to lobby)
  // ----------------------------------------------------------
  socket.on(ClientEvents.RESTART_GAME, () => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit(ServerEvents.ERROR, { message: 'Only the host can restart.' });
      return;
    }

    clearRoomTimer(room.code);
    resetToLobby(room);
    broadcastRoom(room.code);
  });

  // ----------------------------------------------------------
  // UPDATE SETTINGS
  // ----------------------------------------------------------
  socket.on(ClientEvents.UPDATE_SETTINGS, ({ settings }: UpdateSettingsPayload) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit(ServerEvents.ERROR, { message: 'Only the host can change settings.' });
      return;
    }

    const error = updateSettings(room, settings);
    if (error) {
      socket.emit(ServerEvents.ERROR, { message: error });
      return;
    }

    broadcastRoom(room.code);
  });

  // ----------------------------------------------------------
  // DISCONNECT
  // ----------------------------------------------------------
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);

    // Check if this player was the current turn player before disconnect
    const preRoom = getRoomBySocketId(socket.id);
    const wasCurrentTurn = preRoom?.phase === 'submitting' &&
      getCurrentTurnPlayerId(preRoom) === socket.id;

    const { room, tooFewPlayers } = handleDisconnect(socket.id);
    if (room) {
      broadcastRoom(room.code);

      // If mid-game and too few players, reset to lobby
      if (tooFewPlayers && room.phase !== 'lobby') {
        clearRoomTimer(room.code);
        resetToLobby(room);
        broadcastRoom(room.code);
        return;
      }

      // If the disconnected player was the current turn, force-skip and advance
      if (wasCurrentTurn && room.phase === 'submitting') {
        clearRoomTimer(room.code);
        const allDone = forceSkipCurrentTurn(room);
        broadcastRoom(room.code);
        if (allDone) {
          moveToVoting(room);
          broadcastRoom(room.code);
          startVotingTimer(room.code);
        } else {
          startTurnTimer(room.code);
        }
      }
    }
  });
});

// ============================================================
// Timer helpers
// ============================================================

/** Per-turn timer: if the current player doesn't submit in time, force-skip them */
function startTurnTimer(roomCode: string): void {
  const timerRoom = getRoom(roomCode);
  const turnMs = timerRoom ? timerRoom.settings.turnTimerSecs * 1000 : 15_000;
  setRoomTimer(roomCode, turnMs, () => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'submitting') return;

    const allDone = forceSkipCurrentTurn(room);
    broadcastRoom(roomCode);

    if (allDone) {
      moveToVoting(room);
      broadcastRoom(roomCode);
      startVotingTimer(roomCode);
    } else {
      // Start timer for the next player
      startTurnTimer(roomCode);
    }
  });
}

function startVotingTimer(roomCode: string): void {
  const timerRoom = getRoom(roomCode);
  const votingMs = timerRoom ? timerRoom.settings.votingTimerSecs * 1000 : 30_000;
  setRoomTimer(roomCode, votingMs, () => {
    const room = getRoom(roomCode);
    if (room && room.phase === 'voting') {
      resolveVoting(roomCode);
    }
  });
}

function resolveVoting(roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;

  const { results, ejectedId, imposterCaught } = tallyVotes(room);
  io.to(roomCode).emit(ServerEvents.REVEAL_RESULTS, { results, ejectedId, imposterCaught });

  if (imposterCaught) {
    // Crew wins — imposter was caught
    const result = buildGameResult(room, true);
    moveToResult(room);
    io.to(roomCode).emit(ServerEvents.GAME_OVER, result);
    broadcastRoom(roomCode);
  } else {
    // Imposter survived — give them a chance to guess
    moveToGuessing(room);
    broadcastRoom(roomCode);

    // Notify imposter specifically
    if (room.imposterId) {
      io.to(room.imposterId).emit(ServerEvents.IMPOSTER_GUESS_PROMPT);
    }

    // Timer for guess phase
    const guessMs = room.settings.guessingTimerSecs * 1000;
    setRoomTimer(roomCode, guessMs, () => {
      if (room.phase === 'guessing') {
        // Time ran out — imposter didn't guess, crew wins
        const result = buildGameResult(room, false, undefined, false);
        moveToResult(room);
        io.to(roomCode).emit(ServerEvents.GAME_OVER, result);
        broadcastRoom(roomCode);
      }
    });
  }
}

// ============================================================
// Start server
// ============================================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Imposter Word Game server running on port ${PORT}`);
});
