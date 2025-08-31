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
    <main className="min-h-dvh">
      <div className="mx-auto max-w-[1900px] px-6 pt-8 pb-10">
        <header className="mb-6">
          <h1 className="text-[18px] font-semibold tracking-tight text-white/90">Retro Saucer</h1>
          <p className="text-[12px] text-white/50 mt-1">Built with Phaser 3 — with love, Santiago</p>
        </header>

        {/* Game Container */}
        <div
          ref={gameContainerRef}
          className="relative w-full max-w-[1800px] mx-auto mb-8"
        >
          {/* Game Canvas */}
          <GameCanvas
            gameKey="saucer"
            width={1600}
            height={720}
            className="w-full h-full"
          />

          {/* HUD Overlay */}
          <HUD />
        </div>

        {/* Instructions */}
        <div className="max-w-md">
          <h3 className="font-medium text-white/80 mb-3 text-sm">Desktop Controls</h3>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Move:</span>
                <span className="text-white/90">↑↓ or W/S</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Shoot:</span>
                <span className="text-white/90">Space</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Restart:</span>
                <span className="text-white/90">R (when game over)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back to menu link */}
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors text-sm border border-white/10"
          >
            ← Back to Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
