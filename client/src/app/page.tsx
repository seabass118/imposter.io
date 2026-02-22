'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { sounds } from '@/lib/sounds';
import {
  ClientEvents, ServerEvents,
  RoomState, GameResult, ReceiveWordPayload,
  PublicPlayer, Submission, GameSettings, DEFAULT_SETTINGS,
} from '../../shared/types';
import JoinScreen from '@/components/JoinScreen';
import Lobby from '@/components/Lobby';
import SubmissionPhase from '@/components/SubmissionPhase';
import VotingPhase from '@/components/VotingPhase';
import GuessingPhase from '@/components/GuessingPhase';
import ResultScreen from '@/components/ResultScreen';
import Timer from '@/components/Timer';
import PlayerList from '@/components/PlayerList';
import PhaseIndicator from '@/components/PhaseIndicator';

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [isImposter, setIsImposter] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showGuessPrompt, setShowGuessPrompt] = useState(false);
  const [voteReveal, setVoteReveal] = useState<{
    results: { playerId: string; username: string; votes: number }[];
    ejectedId: string;
    imposterCaught: boolean;
  } | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  const prevPhaseRef = useRef<string | null>(null);
  const settingsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const socket = getSocket();

  // ----------------------------------------------------------
  // Socket event listeners
  // ----------------------------------------------------------
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      setMyId(socket.id || '');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on(ServerEvents.ROOM_CREATED, ({ roomCode }: { roomCode: string }) => {
      setRoomCode(roomCode);
    });

    socket.on(ServerEvents.ROOM_UPDATE, (state: RoomState) => {
      setRoomState(state);
      setSettings(state.settings);
      // Clear game result when returning to lobby
      if (state.phase === 'lobby') {
        setGameResult(null);
        setSecretWord(null);
        setIsImposter(false);
        setShowGuessPrompt(false);
        setVoteReveal(null);
      }
    });

    socket.on(ServerEvents.RECEIVE_WORD, ({ word, isImposter: imp }: ReceiveWordPayload) => {
      setSecretWord(word);
      setIsImposter(imp);
    });

    socket.on(ServerEvents.GAME_STARTED, () => {
      setGameResult(null);
      setShowGuessPrompt(false);
      setVoteReveal(null);
      sounds.start();
    });

    socket.on(ServerEvents.REVEAL_RESULTS, (data: {
      results: { playerId: string; username: string; votes: number }[];
      ejectedId: string;
      imposterCaught: boolean;
    }) => {
      setVoteReveal(data);
    });

    socket.on(ServerEvents.IMPOSTER_GUESS_PROMPT, () => {
      setShowGuessPrompt(true);
    });

    socket.on(ServerEvents.GAME_OVER, (result: GameResult) => {
      setGameResult(result);
      if (result.winners === 'crew') {
        // If I'm not imposter, I win
        if (!isImposter) sounds.win();
        else sounds.lose();
      } else {
        if (isImposter) sounds.win();
        else sounds.lose();
      }
    });

    socket.on(ServerEvents.ERROR, ({ message }: { message: string }) => {
      setError(message);
      sounds.error();
      setTimeout(() => setError(null), 4000);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Play sound on phase change
  useEffect(() => {
    if (roomState && prevPhaseRef.current !== roomState.phase) {
      if (roomState.phase === 'voting' && prevPhaseRef.current === 'submitting') {
        sounds.vote();
      }
      prevPhaseRef.current = roomState.phase;
    }
  }, [roomState?.phase]);

  // ----------------------------------------------------------
  // Actions
  // ----------------------------------------------------------
  const createRoom = useCallback((name: string) => {
    setUsername(name);
    socket.emit(ClientEvents.CREATE_ROOM, { username: name });
  }, [socket]);

  const joinRoom = useCallback((code: string, name: string) => {
    setUsername(name);
    socket.emit(ClientEvents.JOIN_ROOM, { roomCode: code, username: name });
  }, [socket]);

  const startGame = useCallback(() => {
    socket.emit(ClientEvents.START_GAME);
  }, [socket]);

  const submitWord = useCallback((word: string) => {
    socket.emit(ClientEvents.SUBMIT_WORD, { word });
    sounds.submit();
  }, [socket]);

  const voteForPlayer = useCallback((targetId: string) => {
    socket.emit(ClientEvents.VOTE_PLAYER, { targetId });
    sounds.vote();
  }, [socket]);

  const guessWord = useCallback((guess: string) => {
    socket.emit(ClientEvents.GUESS_WORD, { guess });
  }, [socket]);

  const restartGame = useCallback(() => {
    socket.emit(ClientEvents.RESTART_GAME);
  }, [socket]);

  const handleSettingsChange = useCallback((newSettings: GameSettings) => {
    setSettings(newSettings);
    if (settingsDebounceRef.current) clearTimeout(settingsDebounceRef.current);
    settingsDebounceRef.current = setTimeout(() => {
      socket.emit(ClientEvents.UPDATE_SETTINGS, { settings: newSettings });
    }, 300);
  }, [socket]);

  // ----------------------------------------------------------
  // Derived state
  // ----------------------------------------------------------
  const me: PublicPlayer | undefined = roomState?.players.find(p => p.id === myId);
  const amHost = me?.isHost ?? false;
  const phase = roomState?.phase ?? 'lobby';

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  // Not in a room yet — show join screen
  if (!roomState) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {error && <ErrorBanner message={error} />}
          <JoinScreen
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            connected={connected}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pb-8">
      {error && <ErrorBanner message={error} />}

      {/* Header */}
      <header className="w-full max-w-2xl flex items-center justify-between mb-4 mt-2">
        <div>
          <h1 className="text-lg font-bold text-game-accent tracking-wide">IMPOSTER</h1>
          <p className="text-xs text-game-muted">
            Room: <span className="text-game-text font-mono font-bold tracking-widest">{roomState.code}</span>
            {roomState.round > 0 && <span className="ml-2">Round {roomState.round}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {roomState.timerEnd && phase !== 'lobby' && phase !== 'result' && (
            <Timer deadline={roomState.timerEnd} />
          )}
          <PhaseIndicator phase={phase} />
        </div>
      </header>

      {/* Game card */}
      <div className="w-full max-w-2xl flex-1">
        {/* Secret word display for non-imposters during active phases */}
        {(phase === 'submitting' || phase === 'voting' || phase === 'guessing') && (
          <div className="mb-4 animate-fade-in">
            <div className={`text-center py-3 px-4 rounded-xl border ${
              isImposter
                ? 'bg-game-accent/10 border-game-accent/30'
                : 'bg-game-safe/10 border-game-safe/30'
            }`}>
              {isImposter ? (
                <p className="text-game-accent font-semibold text-sm">
                  You are the IMPOSTER — blend in!
                </p>
              ) : (
                <p className="text-sm">
                  <span className="text-game-muted">The word is: </span>
                  <span className="text-game-safe font-bold text-lg">{secretWord}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Phase content */}
        <div className="phase-enter">
          {phase === 'lobby' && !gameResult && (
            <Lobby
              players={roomState.players}
              amHost={amHost}
              onStart={startGame}
              roomCode={roomState.code}
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          )}

          {phase === 'submitting' && (
            <SubmissionPhase
              players={roomState.players}
              myId={myId}
              onSubmit={submitWord}
              hasSubmitted={me?.hasSubmitted ?? false}
              currentTurnId={roomState.currentTurnId}
              submissions={roomState.submissions}
            />
          )}

          {phase === 'voting' && (
            <VotingPhase
              players={roomState.players}
              submissions={roomState.submissions}
              myId={myId}
              onVote={voteForPlayer}
              hasVoted={me?.hasVoted ?? false}
            />
          )}

          {phase === 'guessing' && (
            <GuessingPhase
              isImposter={isImposter}
              showPrompt={showGuessPrompt}
              onGuess={guessWord}
              voteReveal={voteReveal}
            />
          )}

          {phase === 'result' && gameResult && (
            <ResultScreen
              result={gameResult}
              amHost={amHost}
              onRestart={restartGame}
              myId={myId}
              voteReveal={voteReveal}
            />
          )}
        </div>

        {/* Player list sidebar for active game */}
        {phase !== 'lobby' && phase !== 'result' && (
          <div className="mt-4">
            <PlayerList players={roomState.players} myId={myId} phase={phase} />
          </div>
        )}
      </div>
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-game-accent/90 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-game-accent/20">
        {message}
      </div>
    </div>
  );
}
