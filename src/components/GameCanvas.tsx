'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Phaser from 'phaser';
import { createPhaserConfig } from '../game/phaser.config';

interface GameCanvasProps {
  gameKey: string;
  width?: number;
  height?: number;
  className?: string;
}

// Dynamic import to disable SSR for Phaser
const PhaserGame = dynamic(() => Promise.resolve(GameCanvasInner), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-black text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading game...</p>
      </div>
    </div>
  )
});

function GameCanvasInner({ gameKey, width = 360, height = 640, className = '' }: GameCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create unique container ID for this game instance
    const containerId = `game-container-${gameKey}-${Date.now()}`;

    // Set container ID
    containerRef.current.id = containerId;

    // Create Phaser game configuration
    const config = createPhaserConfig(containerId);

    // Override dimensions if specified
    if (width) config.width = width;
    if (height) config.height = height;

    // Create and start the game
    gameRef.current = new Phaser.Game(config);

    // Cleanup function
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameKey, width, height]);

  return (
    <div
      ref={containerRef}
      className={`game-canvas-container ${className}`}
      style={{
        width: '100%',
        maxWidth: '1280px', // Widescreen max width
        aspectRatio: '16/9', // Fixed 16:9 aspect ratio
        backgroundColor: '#000000',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Game canvas will be inserted here by Phaser */}
    </div>
  );
}

// Main exported component with dynamic import
export default function GameCanvas(props: GameCanvasProps) {
  return <PhaserGame {...props} />;
}
