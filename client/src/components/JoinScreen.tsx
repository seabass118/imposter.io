'use client';

import { useState } from 'react';

interface Props {
  onCreateRoom: (username: string) => void;
  onJoinRoom: (code: string, username: string) => void;
  connected: boolean;
}

export default function JoinScreen({ onCreateRoom, onJoinRoom, connected }: Props) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');

  const canSubmit = username.trim().length >= 1 && username.trim().length <= 16;

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-game-accent tracking-tight mb-2">
          IMPOSTER
        </h1>
        <p className="text-game-muted text-sm">Find the imposter. Prove your innocence.</p>
      </div>

      {/* Connection status */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-game-safe' : 'bg-game-accent animate-pulse'}`} />
        <span className="text-xs text-game-muted">
          {connected ? 'Connected' : 'Connecting...'}
        </span>
      </div>

      {mode === 'menu' && (
        <div className="space-y-3 animate-slide-up">
          <button
            onClick={() => setMode('create')}
            disabled={!connected}
            className="w-full py-4 bg-game-accent hover:bg-game-accent/80 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            Create Room
          </button>
          <button
            onClick={() => setMode('join')}
            disabled={!connected}
            className="w-full py-4 bg-game-card hover:bg-game-hover border border-game-border text-game-text font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            Join Room
          </button>
        </div>
      )}

      {mode === 'create' && (
        <form
          onSubmit={e => { e.preventDefault(); if (canSubmit) onCreateRoom(username.trim()); }}
          className="space-y-4 animate-slide-up"
        >
          <div>
            <label className="block text-xs text-game-muted mb-1.5 uppercase tracking-wide">Your Name</label>
            <input
              type="text"
              maxLength={16}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your name..."
              autoFocus
              className="w-full px-4 py-3 bg-game-input border border-game-border rounded-xl text-game-text placeholder-game-muted/50 focus:outline-none focus:border-game-accent transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 bg-game-accent hover:bg-game-accent/80 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            Create Room
          </button>
          <button
            type="button"
            onClick={() => setMode('menu')}
            className="w-full py-2 text-game-muted hover:text-game-text text-sm transition-colors"
          >
            Back
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (canSubmit && code.trim().length === 4) onJoinRoom(code.trim(), username.trim());
          }}
          className="space-y-4 animate-slide-up"
        >
          <div>
            <label className="block text-xs text-game-muted mb-1.5 uppercase tracking-wide">Your Name</label>
            <input
              type="text"
              maxLength={16}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your name..."
              autoFocus
              className="w-full px-4 py-3 bg-game-input border border-game-border rounded-xl text-game-text placeholder-game-muted/50 focus:outline-none focus:border-game-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-game-muted mb-1.5 uppercase tracking-wide">Room Code</label>
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              className="w-full px-4 py-3 bg-game-input border border-game-border rounded-xl text-game-text font-mono text-center text-2xl tracking-[0.5em] placeholder-game-muted/50 focus:outline-none focus:border-game-accent transition-colors uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={!canSubmit || code.trim().length !== 4}
            className="w-full py-3.5 bg-game-accent hover:bg-game-accent/80 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
          >
            Join Room
          </button>
          <button
            type="button"
            onClick={() => setMode('menu')}
            className="w-full py-2 text-game-muted hover:text-game-text text-sm transition-colors"
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}
