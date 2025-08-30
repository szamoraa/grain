'use client';

import { useState, useEffect } from 'react';
import { HUDState, GameEventData } from '../types';

interface HUDProps {
  onBoost?: () => void;
  onShoot?: () => void;
}

export default function HUD({ onBoost, onShoot }: HUDProps) {
  const [hudState, setHudState] = useState<HUDState>({
    lives: 3,
    level: 1,
    enemyKills: 0,
    asteroidKills: 0,
    gameOver: false,
    showLevelBanner: false,
    levelBannerText: '',
  });

  const [isMobile, setIsMobile] = useState(false);
  const [boostPressed, setBoostPressed] = useState(false);
  const [shootPressed, setShootPressed] = useState(false);

  useEffect(() => {
    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Listen for game events from Phaser
    const handleGameEvent = (event: CustomEvent<GameEventData>) => {
      const gameEvent = event.detail;

      switch (gameEvent.type) {
        case 'update_hud':
          if (gameEvent.data) {
            setHudState(prev => ({
              ...prev,
              lives: gameEvent.data.lives,
              level: gameEvent.data.level,
              enemyKills: gameEvent.data.enemyKills,
              asteroidKills: gameEvent.data.asteroidKills,
              gameOver: gameEvent.data.gameOver,
            }));
          }
          break;

        case 'level_up':
          if (gameEvent.data) {
            setHudState(prev => ({
              ...prev,
              level: gameEvent.data.level,
              showLevelBanner: true,
              levelBannerText: `LEVEL ${gameEvent.data.level}`,
            }));

            // Hide level banner after 3 seconds
            setTimeout(() => {
              setHudState(prev => ({
                ...prev,
                showLevelBanner: false,
              }));
            }, 3000);
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

    window.addEventListener('gameEvent', handleGameEvent as EventListener);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('gameEvent', handleGameEvent as EventListener);
    };
  }, []);

  // Handle boost button
  const handleBoostStart = () => {
    setBoostPressed(true);
    onBoost?.();
  };

  const handleBoostEnd = () => {
    setBoostPressed(false);
    // Send boost end event to Phaser
    window.dispatchEvent(new CustomEvent('gameEvent', {
      detail: { type: 'boost_end' }
    }));
  };

  // Handle shoot button
  const handleShoot = () => {
    setShootPressed(true);
    onShoot?.();
    setTimeout(() => setShootPressed(false), 100);
  };

  // Render lives as tiny saucer icons
  const renderLives = () => {
    const lives = [];
    for (let i = 0; i < 3; i++) {
      lives.push(
        <div
          key={i}
          className={`w-4 h-3 rounded-full border ${
            i < hudState.lives
              ? 'bg-blue-400 border-blue-300'
              : 'bg-gray-600 border-gray-500'
          }`}
          style={{
            clipPath: 'ellipse(70% 50% at 50% 40%)', // Saucer shape
          }}
        >
          {/* Small dome on top */}
          <div
            className={`w-full h-1 rounded-full ${
              i < hudState.lives ? 'bg-blue-300' : 'bg-gray-500'
            }`}
            style={{
              clipPath: 'ellipse(60% 60% at 50% 20%)',
            }}
          />
        </div>
      );
    }
    return lives;
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
        {/* Lives */}
        <div className="flex space-x-1">
          {renderLives()}
        </div>

        {/* Level */}
        <div className="bg-black bg-opacity-50 px-3 py-1 rounded text-white font-bold">
          LEVEL {hudState.level}
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end pointer-events-auto">
        {/* Stats */}
        <div className="bg-black bg-opacity-50 px-3 py-2 rounded text-white text-sm">
          <div>Ships: {hudState.enemyKills}</div>
          <div>Rocks: {hudState.asteroidKills}</div>
        </div>

        {/* Mobile Controls */}
        {isMobile && (
          <div className="flex space-x-3">
            {/* Boost Button */}
            <button
              className={`w-16 h-16 rounded-full font-bold text-white border-2 transition-all ${
                boostPressed
                  ? 'bg-blue-600 border-blue-400 shadow-lg scale-95'
                  : 'bg-blue-500 border-blue-300 hover:bg-blue-600'
              }`}
              onTouchStart={handleBoostStart}
              onTouchEnd={handleBoostEnd}
              onMouseDown={handleBoostStart}
              onMouseUp={handleBoostEnd}
              onMouseLeave={handleBoostEnd}
            >
              BOOST
            </button>

            {/* Shoot Button */}
            <button
              className={`w-16 h-16 rounded-full font-bold text-white border-2 transition-all ${
                shootPressed
                  ? 'bg-green-600 border-green-400 shadow-lg scale-95'
                  : 'bg-green-500 border-green-300 hover:bg-green-600'
              }`}
              onTouchStart={handleShoot}
              onMouseDown={handleShoot}
            >
              SHOOT
            </button>
          </div>
        )}
      </div>

      {/* Level Banner */}
      {hudState.showLevelBanner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 pointer-events-none">
          <div className="text-4xl font-bold text-green-400 animate-pulse">
            {hudState.levelBannerText}
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {hudState.gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center pointer-events-auto">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4 text-red-400">GAME OVER</h2>

            <div className="mb-6 space-y-2">
              <p className="text-xl">Ships Destroyed: {hudState.enemyKills}</p>
              <p className="text-xl">Rocks Destroyed: {hudState.asteroidKills}</p>
              <p className="text-xl">Highest Level: {hudState.level}</p>
            </div>

            <div className="space-y-3">
              <button
                className="block w-48 mx-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition-colors"
                onClick={() => window.location.reload()}
              >
                RESTART
              </button>

              <button
                className="block w-48 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors"
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
