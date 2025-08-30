import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { SaucerScene } from './scenes/SaucerScene';

// Game configuration for Retro Saucer
export const createPhaserConfig = (parentElement: string): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO, // Use WebGL if available, fallback to Canvas
    parent: parentElement,
    width: 1024, // Internal game resolution - widescreen 16:9
    height: 576,
    scale: {
      mode: Phaser.Scale.FIT, // Fit to container while maintaining aspect ratio
      autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game canvas
    },
    backgroundColor: '#000000', // Black space background
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 }, // No gravity in space
        debug: false, // Disable physics debug for performance
      },
    },
    scene: [BootScene, MenuScene, SaucerScene], // Scene loading order
    render: {
      pixelArt: false, // Smooth graphics
      antialias: true,
      roundPixels: false,
    },
    // Disable audio to prevent conflicts with our custom Sfx system
    audio: {
      disableWebAudio: false,
      noAudio: false,
    },
  };
};

// Helper function to create a game instance
export const createGame = (parentElement: string): Phaser.Game => {
  const config = createPhaserConfig(parentElement);
  return new Phaser.Game(config);
};
