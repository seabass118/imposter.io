'use client';

import { useState } from 'react';
import { PublicPlayer, Submission } from '../shared/types';

interface Props {
  players: PublicPlayer[];
  submissions: Submission[];
  myId: string;
  onVote: (targetId: string) => void;
  hasVoted: boolean;
}

export default function VotingPhase({ players, submissions, myId, onVote, hasVoted }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const connectedPlayers = players.filter(p => p.isConnected);
  const votedCount = connectedPlayers.filter(p => p.hasVoted).length;

  // Build a map of player submissions for display
  const submissionMap = new Map<string, string>();
  submissions.forEach(s => submissionMap.set(s.playerId, s.word));

  const handleVote = () => {
    if (selected && !hasVoted) {
      onVote(selected);
      setConfirmed(true);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-game-card border border-game-border rounded-xl p-6 mb-4">
        <h2 className="text-lg font-bold text-center mb-1">Vote for the Imposter</h2>
        <p className="text-sm text-game-muted text-center mb-6">
          Who submitted a suspicious word? Tap to select, then confirm.
        </p>

        {/* Submission cards */}
        <div className="space-y-2 mb-6">
          {connectedPlayers.map((p, i) => {
            const word = submissionMap.get(p.id) ?? '...';
            const isMe = p.id === myId;
            const isSelected = selected === p.id;
            const canSelect = !hasVoted && !isMe;

            return (
              <button
                key={p.id}
                onClick={() => canSelect && setSelected(p.id)}
                disabled={!canSelect}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'border-game-accent bg-game-accent/10'
                    : isMe
                      ? 'border-game-border/50 bg-game-bg/30 opacity-60 cursor-default'
                      : 'border-game-border bg-game-bg/50 hover:border-game-muted'
                } ${!canSelect && !isMe ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isSelected ? 'bg-game-accent/30 text-game-accent' : 'bg-game-border text-game-muted'
                }`}>
                  {p.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-game-text truncate">
                    {p.username} {isMe && <span className="text-game-muted text-xs">(you)</span>}
                  </p>
                  <p className="text-game-accent font-mono text-sm">&quot;{word}&quot;</p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-game-accent flex items-center justify-center shrink-0 animate-pop">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Vote button */}
        {!hasVoted ? (
          <button
            onClick={handleVote}
            disabled={!selected}
            className="w-full py-3.5 bg-game-accent hover:bg-game-accent/80 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            {selected ? `Vote for ${connectedPlayers.find(p => p.id === selected)?.username}` : 'Select a player'}
          </button>
        ) : (
          <div className="text-center py-3">
            <p className="text-game-safe font-semibold">Vote cast!</p>
            <p className="text-xs text-game-muted mt-1">Waiting for others...</p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="bg-game-card border border-game-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-game-muted uppercase tracking-wide">Votes</span>
          <span className="text-xs text-game-muted">{votedCount}/{connectedPlayers.length}</span>
        </div>
        <div className="w-full bg-game-bg rounded-full h-2">
          <div
            className="bg-game-accent h-2 rounded-full transition-all duration-500"
            style={{ width: `${(votedCount / connectedPlayers.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
