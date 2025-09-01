'use client';

import { useState, useEffect } from 'react';

interface HUDState {
  lives: number;
  enemyKills: number;
  asteroidKills: number;
  score: number;
  waveIndex: number;
  progress: number;
  gameOver: boolean;
}

interface GameEventData {
  type: string;
  data?: {
    lives?: number;
    enemyKills?: number;
    asteroidKills?: number;
    score?: number;
    level?: number;
    gameOver?: boolean;
  };
  progress?: number;
}

export default function HUD() {
  const [hudState, setHudState] = useState<HUDState>({
    lives: 3,
    enemyKills: 0,
    asteroidKills: 0,
    score: 0,
    waveIndex: 1,
    progress: 0,
    gameOver: false,
  });

  useEffect(() => {
    // Listen for game events from Phaser
    const handleGameEvent = (event: CustomEvent<GameEventData>) => {
      const gameEvent = event.detail;

      switch (gameEvent.type) {
        case 'update_hud':
          if (gameEvent.data) {
            const data = gameEvent.data;
            setHudState(prev => ({
              ...prev,
              lives: data.lives ?? prev.lives,
              enemyKills: data.enemyKills ?? prev.enemyKills,
              asteroidKills: data.asteroidKills ?? prev.asteroidKills,
              score: data.score ?? prev.score,
              waveIndex: data.level ?? prev.waveIndex,
              gameOver: data.gameOver ?? prev.gameOver,
            }));
          }
          break;

        case 'game_over':
          setHudState(prev => ({
            ...prev,
            gameOver: true,
          }));
          break;
      }
    };

    // Listen for progress updates
    const handleProgress = (progress: number) => {
      setHudState(prev => ({
        ...prev,
        progress: progress
      }));
    };

    window.addEventListener('gameEvent', handleGameEvent as EventListener);

    // Listen for progress events from Phaser scene
    const handleProgressEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventData = customEvent.detail as { type: string; progress: number };
      if (eventData?.type === 'hud:progress') {
        handleProgress(eventData.progress);
      }
    };
    window.addEventListener('gameEvent', handleProgressEvent);

    return () => {
      window.removeEventListener('gameEvent', handleGameEvent as EventListener);
      window.removeEventListener('gameEvent', handleProgressEvent);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      {/* Top-left cluster */}
      <div className="absolute left-4 top-3 flex items-center gap-3">
        {/* Lives (no box) */}
        <div className="flex items-center gap-2">
          <span className="text-white/90 text-xs tracking-wide">Lives:</span>
          <div className="flex gap-1">
            {Array.from({ length: hudState.lives }).map((_, i) => (
              <div key={i} className="h-3 w-3 rounded-full bg-white/90" />
            ))}
          </div>
        </div>

        {/* Score frosted capsule */}
        <div className="
          px-3 py-1 rounded-full
          bg-white/10
          border border-white/15
          backdrop-blur-md
          text-white/95 text-xs font-medium
          shadow-[0_2px_8px_rgba(0,0,0,0.25)]
        ">
          Score: {hudState.score}
        </div>
      </div>

      {/* Top-center progress bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <div className="h-1.5 w-[280px] rounded-full bg-white/15 overflow-hidden border border-white/10">
          <div
            className="h-full bg-white/90 transition-[width] duration-100"
            style={{ width: `${Math.min(Math.max(hudState.progress * 100, 0), 100)}%` }}
          />
        </div>
      </div>

      {/* Game Over Overlay */}
      {hudState.gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center pointer-events-auto">
          <div className="text-center text-white">
            <h2 className="text-5xl font-bold mb-6 text-red-400">GAME OVER</h2>

            <div className="mb-8 text-xl">
              <p>Final Score: {hudState.score}</p>
            </div>

            <div className="space-y-4">
              <button
                className="block w-56 mx-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-lg"
                onClick={() => window.location.reload()}
              >
                RESTART
              </button>

              <button
                className="block w-56 mx-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
                onClick={() => window.location.href = '/'}
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
