// ============================================================
// Shared types for Imposter Word Game
// Used by both client and server
// ============================================================

export type GamePhase = 'lobby' | 'submitting' | 'voting' | 'guessing' | 'result';

export type WordCategory = 'Objects' | 'Places' | 'Animals' | 'Food' | 'Jobs';

export interface GameSettings {
  enabledCategories: WordCategory[];
  turnTimerSecs: number;
  votingTimerSecs: number;
  guessingTimerSecs: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  enabledCategories: ['Objects', 'Places', 'Animals', 'Food', 'Jobs'],
  turnTimerSecs: 15,
  votingTimerSecs: 30,
  guessingTimerSecs: 20,
};

export interface Player {
  id: string;          // socket.id
  username: string;
  isHost: boolean;
  isImposter: boolean;
  isConnected: boolean;
  submittedWord: string | null;
  votedFor: string | null;   // player id they voted for
  votesReceived: number;
}

export interface Room {
  code: string;
  players: Player[];
  phase: GamePhase;
  secretWord: string | null;
  imposterId: string | null;
  timerEnd: number | null;    // unix timestamp when timer expires
  submissions: Submission[];
  round: number;
  turnOrder: string[];        // ordered list of player ids for turn-based submission
  currentTurnIndex: number;   // index into turnOrder for whose turn it is
  settings: GameSettings;
}

export interface Submission {
  playerId: string;
  username: string;
  word: string;
}

export interface VoteResult {
  playerId: string;
  username: string;
  votes: number;
}

export interface GameResult {
  imposterCaught: boolean;
  imposterId: string;
  imposterName: string;
  secretWord: string;
  imposterGuess?: string;
  imposterGuessCorrect?: boolean;
  winners: 'crew' | 'imposter';
}

// Public-safe player info sent to all clients
export interface PublicPlayer {
  id: string;
  username: string;
  isHost: boolean;
  isConnected: boolean;
  hasSubmitted: boolean;
  hasVoted: boolean;
  votesReceived: number;
}

// Room state broadcast to all clients
export interface RoomState {
  code: string;
  players: PublicPlayer[];
  phase: GamePhase;
  timerEnd: number | null;
  submissions: Submission[];
  round: number;
  currentTurnId: string | null;  // player id whose turn it is during submission
  settings: GameSettings;
}

// ============================================================
// Socket event payloads
// ============================================================

// Client → Server
export interface CreateRoomPayload {
  username: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  username: string;
}

export interface SubmitWordPayload {
  word: string;
}

export interface VotePlayerPayload {
  targetId: string;
}

export interface GuessWordPayload {
  guess: string;
}

export interface UpdateSettingsPayload {
  settings: GameSettings;
}

// Server → Client
export interface ErrorPayload {
  message: string;
}

export interface RoomCreatedPayload {
  roomCode: string;
}

export interface ReceiveWordPayload {
  word: string;
  isImposter: boolean;
}

// Socket event name constants
export const ClientEvents = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  START_GAME: 'start_game',
  SUBMIT_WORD: 'submit_word',
  VOTE_PLAYER: 'vote_player',
  GUESS_WORD: 'guess_word',
  RESTART_GAME: 'restart_game',
  UPDATE_SETTINGS: 'update_settings',
} as const;

export const ServerEvents = {
  ROOM_UPDATE: 'room_update',
  GAME_STARTED: 'game_started',
  RECEIVE_WORD: 'receive_word',
  REVEAL_RESULTS: 'reveal_results',
  GAME_OVER: 'game_over',
  ERROR: 'error',
  ROOM_CREATED: 'room_created',
  IMPOSTER_GUESS_PROMPT: 'imposter_guess_prompt',
} as const;
