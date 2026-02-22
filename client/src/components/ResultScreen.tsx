'use client';

import { GameResult } from '../shared/types';

interface Props {
  result: GameResult;
  amHost: boolean;
  onRestart: () => void;
  myId: string;
  voteReveal: {
    results: { playerId: string; username: string; votes: number }[];
    ejectedId: string;
    imposterCaught: boolean;
  } | null;
}

export default function ResultScreen({ result, amHost, onRestart, myId, voteReveal }: Props) {
  const isImposter = myId === result.imposterId;
  const iWon = (result.winners === 'imposter' && isImposter) ||
               (result.winners === 'crew' && !isImposter);

  return (
    <div className="animate-slide-up">
      <div className="bg-game-card border border-game-border rounded-xl p-6 text-center">
        {/* Win/lose header */}
        <div className="mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            iWon ? 'bg-game-safe/20' : 'bg-game-accent/20'
          }`}>
            <span className="text-4xl">{iWon ? '🎉' : '💀'}</span>
          </div>
          <h2 className={`text-2xl font-black ${iWon ? 'text-game-safe' : 'text-game-accent'}`}>
            {iWon ? 'Victory!' : 'Defeat!'}
          </h2>
          <p className="text-game-muted mt-1">
            {result.winners === 'crew' ? 'The crew wins!' : 'The imposter wins!'}
          </p>
        </div>

        {/* Result details */}
        <div className="space-y-3 mb-6">
          <div className="bg-game-bg/50 rounded-xl p-4">
            <p className="text-xs text-game-muted uppercase tracking-wide mb-1">The Imposter</p>
            <p className="text-lg font-bold text-game-accent">{result.imposterName}</p>
          </div>

          <div className="bg-game-bg/50 rounded-xl p-4">
            <p className="text-xs text-game-muted uppercase tracking-wide mb-1">The Secret Word</p>
            <p className="text-lg font-bold text-game-safe">{result.secretWord}</p>
          </div>

          {result.imposterCaught ? (
            <div className="bg-game-safe/10 border border-game-safe/20 rounded-xl p-4">
              <p className="text-sm text-game-safe font-semibold">
                Imposter was caught by vote!
              </p>
            </div>
          ) : result.imposterGuess !== undefined ? (
            <div className={`rounded-xl p-4 border ${
              result.imposterGuessCorrect
                ? 'bg-game-accent/10 border-game-accent/20'
                : 'bg-game-safe/10 border-game-safe/20'
            }`}>
              <p className="text-xs text-game-muted uppercase tracking-wide mb-1">Imposter&apos;s Guess</p>
              <p className={`text-lg font-bold ${result.imposterGuessCorrect ? 'text-game-accent' : 'text-game-muted line-through'}`}>
                &quot;{result.imposterGuess}&quot;
              </p>
              <p className={`text-sm mt-1 font-semibold ${result.imposterGuessCorrect ? 'text-game-accent' : 'text-game-safe'}`}>
                {result.imposterGuessCorrect ? 'Correct! Imposter wins!' : 'Wrong! Crew wins!'}
              </p>
            </div>
          ) : (
            <div className="bg-game-safe/10 border border-game-safe/20 rounded-xl p-4">
              <p className="text-sm text-game-safe font-semibold">
                Imposter ran out of time to guess!
              </p>
            </div>
          )}
        </div>

        {/* Vote breakdown */}
        {voteReveal && (
          <div className="mb-6">
            <p className="text-xs text-game-muted uppercase tracking-wide mb-2">Vote Breakdown</p>
            <div className="space-y-1">
              {voteReveal.results.map(r => (
                <div
                  key={r.playerId}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    r.playerId === result.imposterId
                      ? 'bg-game-accent/10 border border-game-accent/20'
                      : 'bg-game-bg/50'
                  }`}
                >
                  <span className={`text-sm ${r.playerId === result.imposterId ? 'text-game-accent font-bold' : 'text-game-text'}`}>
                    {r.username} {r.playerId === result.imposterId && '(Imposter)'}
                  </span>
                  <span className="text-sm font-mono text-game-muted">
                    {r.votes} vote{r.votes !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restart */}
        {amHost ? (
          <button
            onClick={onRestart}
            className="w-full py-4 bg-game-accent hover:bg-game-accent/80 text-white font-bold rounded-xl transition-all active:scale-[0.98] text-lg"
          >
            Play Again
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-game-muted py-3">
            <div className="w-1.5 h-1.5 rounded-full bg-game-accent animate-pulse" />
            <span className="text-sm">Waiting for host to restart...</span>
          </div>
        )}
      </div>
    </div>
  );
}
