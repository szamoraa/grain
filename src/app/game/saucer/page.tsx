'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import HUD from '../../../game/ui/HUD';

// Dynamically import GameCanvas to ensure it only loads on client
const GameCanvas = dynamic(() => import('../../../components/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-black text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading Retro Saucer...</p>
      </div>
    </div>
  )
});

export default function SaucerGamePage() {
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Any initialization logic can go here
    return () => {
      // Cleanup if needed
    };
  }, []);



  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Retro Saucer</h1>
        <p className="text-gray-300 mb-4">
          Navigate through space, destroy enemies, and survive as long as possible!
        </p>

        {/* Back to menu link */}
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          ← Back to Menu
        </Link>
      </div>

      {/* Game Container */}
      <div
        ref={gameContainerRef}
        className="relative w-full max-w-4xl mx-auto"
        style={{ aspectRatio: '16/9' }}
      >
        {/* Game Canvas */}
        <GameCanvas
          gameKey="saucer"
          width={960}
          height={540}
          className="w-full h-full"
        />

        {/* HUD Overlay */}
        <HUD />
      </div>

      {/* Instructions */}
      <div className="mt-6 max-w-md text-center text-gray-300 text-sm">
        <h3 className="font-bold text-white mb-2">Desktop Controls:</h3>
        <div className="bg-gray-800 bg-opacity-50 rounded p-4">
          <div className="space-y-1">
            <div><strong className="text-white">↑↓ or W/S:</strong> Move up/down</div>
            <div><strong className="text-white">Space:</strong> Shoot laser</div>
            <div><strong className="text-white">R:</strong> Restart (when game over)</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-400 text-xs">
        <p>A retro-futuristic side-scroller built with Phaser 3</p>
        <p className="mt-1">Navigate • Shoot • Survive</p>
      </div>
    </div>
  );
}
