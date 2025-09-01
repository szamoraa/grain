'use client';

import dynamic from 'next/dynamic';

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



  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-[1800px] px-6 py-10">
        {/* Small, left-aligned title stays subtle */}
        <header className="mb-6">
          <h1 className="text-sm font-semibold tracking-tight text-white/90">Retro Saucer</h1>
          <p className="text-xs text-white/45 mt-1">Built with Phaser 3 — with love, Santiago</p>
        </header>

        <GameCanvas
          gameKey="saucer"
          width={1600}
          height={720}
        />

        {/* Controls and Info Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[1243px] mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold text-white/90 mb-2">Desktop Controls</h3>
            <ul className="text-xs text-white/70 space-y-1">
              <li>↑ / ↓ or W / S — Move up / down</li>
              <li>Space — Shoot</li>
              <li>R — Restart (after mission)</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold text-white/90 mb-2">Info</h3>
            <ul className="text-xs text-white/70 space-y-1">
              <li>Wave 1 lasts ~20 seconds.</li>
              <li>Big asteroids split into smaller ones when destroyed.</li>
              <li>Small asteroids are faster; big are slower.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
