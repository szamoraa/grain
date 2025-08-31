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

  // Render lives as simple circles
  const renderLives = () => {
    const lives = [];
    for (let i = 0; i < 3; i++) {
      lives.push(
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 ${
            i < hudState.lives
              ? 'bg-blue-400 border-blue-300'
              : 'bg-gray-600 border-gray-500'
          }`}
        />
      );
    }
    return lives;
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Progress Bar - Very top, centered with animated sheen */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-2 bg-black/30 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-green-400 via-blue-400 to-cyan-400 h-full transition-all duration-300 ease-out relative overflow-hidden"
          style={{ width: `${hudState.progress * 100}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-sheen"></div>
        </div>
      </div>

      {/* Top HUD */}
      <div className="absolute top-2 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
        {/* Lives */}
        <div className="flex space-x-2">
          {renderLives()}
        </div>

        {/* Score and Wave - Top Right */}
        <div className="text-right">
          <div className="bg-black bg-opacity-70 px-3 py-1 rounded text-white font-bold mb-1">
            SCORE: {hudState.score}
          </div>
          <div className="bg-black bg-opacity-70 px-3 py-1 rounded text-white font-bold text-sm">
            WAVE {hudState.waveIndex}/3
          </div>
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
