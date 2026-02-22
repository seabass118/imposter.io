'use client';

import { PublicPlayer, GamePhase } from '../../../shared/types';

interface Props {
  players: PublicPlayer[];
  myId: string;
  phase: GamePhase;
}

export default function PlayerList({ players, myId, phase }: Props) {
  return (
    <div className="bg-game-card border border-game-border rounded-xl p-4">
      <h3 className="text-xs text-game-muted uppercase tracking-wide mb-2">Players</h3>
      <div className="flex flex-wrap gap-2">
        {players.map(p => {
          let statusIcon = '';
          if (phase === 'submitting') {
            statusIcon = p.hasSubmitted ? ' ✓' : ' ...';
          } else if (phase === 'voting') {
            statusIcon = p.hasVoted ? ' ✓' : ' ...';
          }

          return (
            <div
              key={p.id}
              className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 ${
                !p.isConnected
                  ? 'bg-game-border/30 text-game-muted/50 line-through'
                  : p.id === myId
                    ? 'bg-game-accent/15 text-game-accent border border-game-accent/20'
                    : 'bg-game-bg/50 text-game-text'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${
                p.isConnected ? 'bg-game-safe' : 'bg-game-muted/50'
              }`} />
              {p.username}
              {p.isHost && ' ★'}
              {statusIcon}
            </div>
          );
        })}
      </div>
    </div>
  );
}
