'use client';

import { useState } from 'react';

interface Props {
  isImposter: boolean;
  showPrompt: boolean;
  onGuess: (guess: string) => void;
  voteReveal: {
    results: { playerId: string; username: string; votes: number }[];
    ejectedId: string;
    imposterCaught: boolean;
  } | null;
}

export default function GuessingPhase({ isImposter, showPrompt, onGuess, voteReveal }: Props) {
  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim() && !submitted) {
      onGuess(guess.trim());
      setSubmitted(true);
    }
  };

  // Imposter survived — show guess prompt to imposter
  if (isImposter && showPrompt) {
    return (
      <div className="animate-slide-up">
        <div className="bg-game-card border border-game-accent/30 rounded-xl p-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-game-accent/20 mb-3">
              <span className="text-2xl">🕵️</span>
            </div>
            <h2 className="text-lg font-bold text-game-accent">You Survived!</h2>
            <p className="text-sm text-game-muted mt-1">
              Guess the secret word to win the round.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleGuess} className="space-y-4">
              <input
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                maxLength={30}
                placeholder="Guess the secret word..."
                autoFocus
                className="w-full px-4 py-3.5 bg-game-input border border-game-accent/30 rounded-xl text-game-text text-center text-lg placeholder-game-muted/50 focus:outline-none focus:border-game-accent transition-colors"
              />
              <button
                type="submit"
                disabled={!guess.trim()}
                className="w-full py-3.5 bg-game-accent hover:bg-game-accent/80 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
              >
                Submit Guess
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-1.5 h-1.5 rounded-full bg-game-accent animate-pulse mx-auto mb-2" />
              <p className="text-game-muted text-sm">Revealing result...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Non-imposter players see a waiting screen
  return (
    <div className="animate-slide-up">
      <div className="bg-game-card border border-game-border rounded-xl p-6 text-center">
        {/* Vote reveal summary */}
        {voteReveal && (
          <div className="mb-6">
            <p className="text-sm text-game-muted mb-3">Vote Results</p>
            <div className="space-y-1">
              {voteReveal.results.map(r => (
                <div key={r.playerId} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-game-bg/50">
                  <span className="text-sm text-game-text">{r.username}</span>
                  <span className="text-sm font-mono text-game-muted">{r.votes} vote{r.votes !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-game-accent/20 mb-3">
          <span className="text-2xl">⏳</span>
        </div>
        <h2 className="text-lg font-bold mb-1">Imposter Survived!</h2>
        <p className="text-sm text-game-muted">
          The imposter is guessing the secret word...
        </p>
      </div>
    </div>
  );
}
