'use client';

import { useState, useEffect } from 'react';
import { PublicPlayer, Submission } from '../shared/types';

interface Props {
  players: PublicPlayer[];
  myId: string;
  onSubmit: (word: string) => void;
  hasSubmitted: boolean;
  currentTurnId: string | null;
  submissions: Submission[];
}

export default function SubmissionPhase({ players, myId, onSubmit, hasSubmitted, currentTurnId, submissions }: Props) {
  const [word, setWord] = useState('');

  const connectedPlayers = players.filter(p => p.isConnected);
  const submittedCount = connectedPlayers.filter(p => p.hasSubmitted).length;
  const isMyTurn = currentTurnId === myId && !hasSubmitted;
  const currentPlayer = connectedPlayers.find(p => p.id === currentTurnId);

  // Map player id → submitted word for display
  const wordMap = new Map<string, string>();
  submissions.forEach(s => wordMap.set(s.playerId, s.word));

  // Reset input when it becomes my turn
  useEffect(() => {
    if (isMyTurn) setWord('');
  }, [isMyTurn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim();
    if (trimmed && isMyTurn) {
      onSubmit(trimmed);
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Turn indicator */}
      <div className="bg-game-card border border-game-border rounded-xl p-6 mb-4">
        {isMyTurn ? (
          <>
            {/* It's my turn — show input */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-game-accent/20 mb-2 animate-pulse-slow">
                <span className="text-xl">✍️</span>
              </div>
              <h2 className="text-lg font-bold text-game-accent">Your Turn!</h2>
              <p className="text-sm text-game-muted mt-1">
                Submit a word related to the secret — but don&apos;t be too obvious!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={word}
                onChange={e => setWord(e.target.value)}
                maxLength={30}
                placeholder="Type your word..."
                autoFocus
                className="w-full px-4 py-3.5 bg-game-input border border-game-accent/40 rounded-xl text-game-text text-center text-lg placeholder-game-muted/50 focus:outline-none focus:border-game-accent transition-colors"
              />
              <button
                type="submit"
                disabled={!word.trim()}
                className="w-full py-3.5 bg-game-accent hover:bg-game-accent/80 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
              >
                Submit
              </button>
            </form>
          </>
        ) : hasSubmitted ? (
          <>
            {/* Already submitted — waiting for others */}
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-game-safe/20 mb-2">
                <svg className="w-6 h-6 text-game-safe" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-game-safe font-semibold">Word submitted!</p>
              {currentPlayer && (
                <p className="text-sm text-game-muted mt-2">
                  Waiting for <span className="text-game-text font-medium">{currentPlayer.username}</span> to submit...
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Not my turn yet — watching */}
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 mb-2">
                <span className="text-xl">⏳</span>
              </div>
              <h2 className="text-lg font-bold mb-1">
                {currentPlayer ? (
                  <>
                    <span className="text-blue-400">{currentPlayer.username}</span>
                    <span className="text-game-text">&apos;s Turn</span>
                  </>
                ) : (
                  'Waiting...'
                )}
              </h2>
              <p className="text-sm text-game-muted">
                Wait for your turn to submit a word.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Turn order / progress */}
      <div className="bg-game-card border border-game-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-game-muted uppercase tracking-wide">Turn Order</span>
          <span className="text-xs text-game-muted">{submittedCount}/{connectedPlayers.length}</span>
        </div>
        <div className="w-full bg-game-bg rounded-full h-2 mb-3">
          <div
            className="bg-game-accent h-2 rounded-full transition-all duration-500"
            style={{ width: `${(submittedCount / connectedPlayers.length) * 100}%` }}
          />
        </div>
        <div className="space-y-1.5">
          {connectedPlayers.map(p => {
            const isCurrent = p.id === currentTurnId;
            const isDone = p.hasSubmitted;
            const isMe = p.id === myId;
            const submittedWord = wordMap.get(p.id);

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-game-accent/10 border border-game-accent/30'
                    : isDone
                      ? 'bg-game-safe/5 border border-transparent'
                      : 'bg-game-bg/30 border border-transparent'
                }`}
              >
                {/* Status icon */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  isDone
                    ? 'bg-game-safe/20 text-game-safe'
                    : isCurrent
                      ? 'bg-game-accent/20 text-game-accent animate-pulse'
                      : 'bg-game-border/50 text-game-muted'
                }`}>
                  {isDone ? '✓' : isCurrent ? '►' : '·'}
                </div>

                {/* Name + submitted word */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${
                    isCurrent ? 'text-game-accent' : isDone ? 'text-game-safe/80' : 'text-game-muted'
                  }`}>
                    {p.username}
                    {isMe && <span className="text-game-muted text-xs ml-1">(you)</span>}
                  </span>
                  {isDone && submittedWord && (
                    <p className="text-game-text font-mono text-sm mt-0.5 truncate">
                      &quot;{submittedWord}&quot;
                    </p>
                  )}
                </div>

                {/* Status label */}
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                  isDone
                    ? 'bg-game-safe/15 text-game-safe'
                    : isCurrent
                      ? 'bg-game-accent/15 text-game-accent'
                      : 'text-game-muted/50'
                }`}>
                  {isDone ? 'Done' : isCurrent ? 'Playing' : 'Waiting'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
