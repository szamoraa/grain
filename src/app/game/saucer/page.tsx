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

        {/* Optional bottom pill placeholder */}
        <div className="mt-6 flex justify-center">
          <div className="h-12 w-[min(520px,86vw)] rounded-2xl bg-white/[0.04] border border-white/[0.06]" />
        </div>
      </div>
    </main>
  );
}
