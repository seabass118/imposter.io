'use client';

import { useEffect, useState } from 'react';

interface Props {
  deadline: number; // unix timestamp in ms
}

export default function Timer({ deadline }: Props) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [deadline]);

  const isCritical = seconds <= 5;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
      isCritical
        ? 'bg-game-accent/10 border-game-accent/30 timer-critical'
        : 'bg-game-card border-game-border'
    }`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={`font-mono font-bold text-sm tabular-nums ${
        isCritical ? 'text-game-accent' : 'text-game-text'
      }`}>
        {seconds}s
      </span>
    </div>
  );
}
