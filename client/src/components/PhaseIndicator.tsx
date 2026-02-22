'use client';

import { GamePhase } from '../shared/types';

const phaseLabels: Record<GamePhase, string> = {
  lobby: 'Lobby',
  submitting: 'Submit',
  voting: 'Vote',
  guessing: 'Guess',
  result: 'Result',
};

const phaseColors: Record<GamePhase, string> = {
  lobby: 'bg-game-muted/20 text-game-muted',
  submitting: 'bg-blue-500/20 text-blue-400',
  voting: 'bg-amber-500/20 text-amber-400',
  guessing: 'bg-purple-500/20 text-purple-400',
  result: 'bg-game-safe/20 text-game-safe',
};

export default function PhaseIndicator({ phase }: { phase: GamePhase }) {
  return (
    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg ${phaseColors[phase]}`}>
      {phaseLabels[phase]}
    </span>
  );
}
