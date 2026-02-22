'use client';

import { PublicPlayer, GameSettings, WordCategory } from '../../../shared/types';

const ALL_CATEGORIES: WordCategory[] = ['Objects', 'Places', 'Animals', 'Food', 'Jobs'];

interface Props {
  players: PublicPlayer[];
  amHost: boolean;
  onStart: () => void;
  roomCode: string;
  settings: GameSettings;
  onSettingsChange: (s: GameSettings) => void;
}

export default function Lobby({ players, amHost, onStart, roomCode, settings, onSettingsChange }: Props) {
  const canStart = players.filter(p => p.isConnected).length >= 4;

  function toggleCategory(cat: WordCategory) {
    if (!amHost) return;
    const active = settings.enabledCategories;
    if (active.includes(cat)) {
      // Prevent deselecting the last category
      if (active.length === 1) return;
      onSettingsChange({ ...settings, enabledCategories: active.filter(c => c !== cat) });
    } else {
      onSettingsChange({ ...settings, enabledCategories: [...active, cat] });
    }
  }

  function handleTimerChange(field: keyof Omit<GameSettings, 'enabledCategories'>, value: number) {
    if (!amHost) return;
    onSettingsChange({ ...settings, [field]: value });
  }

  return (
    <div className="animate-slide-up">
      {/* Room code display */}
      <div className="text-center mb-6">
        <p className="text-xs text-game-muted uppercase tracking-wide mb-1">Share this code</p>
        <div className="inline-flex items-center gap-2 bg-game-card border border-game-border rounded-xl px-6 py-3">
          <span className="text-3xl font-black font-mono tracking-[0.3em] text-game-accent">
            {roomCode}
          </span>
          <button
            onClick={() => navigator.clipboard?.writeText(roomCode)}
            className="text-game-muted hover:text-game-text transition-colors p-1"
            title="Copy code"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Player list */}
      <div className="bg-game-card border border-game-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-game-muted uppercase tracking-wide">Players</h2>
          <span className="text-xs text-game-muted">{players.length}/10</span>
        </div>
        <div className="space-y-2">
          {players.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-game-bg/50 animate-pop"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                p.isHost ? 'bg-game-accent/20 text-game-accent' : 'bg-game-border text-game-muted'
              }`}>
                {p.username[0].toUpperCase()}
              </div>
              <span className="text-game-text font-medium flex-1">{p.username}</span>
              {p.isHost && (
                <span className="text-[10px] bg-game-accent/20 text-game-accent px-2 py-0.5 rounded-full font-bold uppercase">
                  Host
                </span>
              )}
              <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-game-safe' : 'bg-game-muted'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Game Settings */}
      <div className={`bg-game-card border border-game-border rounded-xl p-4 mb-4 ${!amHost ? 'opacity-75' : ''}`}>
        <h2 className="text-sm font-bold text-game-muted uppercase tracking-wide mb-4">Game Settings</h2>

        {/* Word Categories */}
        <div className="mb-5">
          <p className="text-xs text-game-muted mb-2">Word Categories</p>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => {
              const active = settings.enabledCategories.includes(cat);
              const isLast = active && settings.enabledCategories.length === 1;
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  disabled={!amHost || isLast}
                  title={isLast ? 'At least one category must remain active' : undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-game-accent/20 border-game-accent text-game-accent'
                      : 'bg-game-bg/50 border-game-border text-game-muted'
                  } ${amHost && !isLast ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timer Settings */}
        <div className="space-y-4">
          <TimerSlider
            label="Turn Timer"
            value={settings.turnTimerSecs}
            min={5}
            max={60}
            disabled={!amHost}
            onChange={v => handleTimerChange('turnTimerSecs', v)}
          />
          <TimerSlider
            label="Voting Timer"
            value={settings.votingTimerSecs}
            min={10}
            max={90}
            disabled={!amHost}
            onChange={v => handleTimerChange('votingTimerSecs', v)}
          />
          <TimerSlider
            label="Guess Timer"
            value={settings.guessingTimerSecs}
            min={10}
            max={60}
            disabled={!amHost}
            onChange={v => handleTimerChange('guessingTimerSecs', v)}
          />
        </div>

        {!amHost && (
          <p className="text-[10px] text-game-muted mt-3 text-center">Only the host can change settings</p>
        )}
      </div>

      {/* Waiting / Start */}
      {amHost ? (
        <div>
          <button
            onClick={onStart}
            disabled={!canStart}
            className="w-full py-4 bg-game-accent hover:bg-game-accent/80 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98] text-lg"
          >
            {canStart ? 'Start Game' : `Need ${4 - players.filter(p => p.isConnected).length} more players`}
          </button>
          {!canStart && (
            <p className="text-center text-xs text-game-muted mt-2">Minimum 4 players required</p>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-game-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-game-accent animate-pulse" />
            <span className="text-sm">Waiting for host to start...</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimerSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (v: number) => void;
}

function TimerSlider({ label, value, min, max, disabled, onChange }: TimerSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-game-muted">{label}</span>
        <span className="text-xs font-mono font-semibold text-game-text">{value}s</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-game-border accent-game-accent disabled:opacity-50 disabled:cursor-default cursor-pointer"
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-game-muted">{min}s</span>
        <span className="text-[10px] text-game-muted">{max}s</span>
      </div>
    </div>
  );
}
