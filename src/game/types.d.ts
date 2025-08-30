// Game-related type definitions for Retro Saucer

// Game state and entities
export interface GameState {
  lives: number;
  level: number;
  score: number;
  enemyKills: number;
  asteroidKills: number;
  gameOver: boolean;
  invulnerable: boolean;
  invulnerabilityTime: number;
}

// Player entity interface
export interface Player {
  sprite: Phaser.GameObjects.Sprite;
  velocity: Phaser.Math.Vector2;
  isBoosting: boolean;
  lastShotTime: number;
}

// Enemy saucer interface
export interface EnemySaucer {
  sprite: Phaser.GameObjects.Sprite;
  velocity: Phaser.Math.Vector2;
  targetPosition: Phaser.Math.Vector2;
  steeringDelay: number;
}

// Asteroid interface
export interface Asteroid {
  sprite: Phaser.GameObjects.Sprite;
  velocity: Phaser.Math.Vector2;
}

// Projectile interface
export interface Projectile {
  sprite: Phaser.GameObjects.Sprite;
  velocity: Phaser.Math.Vector2;
  damage: number;
}

// Particle system interface
export interface ParticleSystem {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  texture: string;
}

// Game configuration constants
export interface GameConfig {
  WIDTH: number;
  HEIGHT: number;
  SCROLL_SPEED_BASE: number;
  BOOST_MULT: number;
  PLAYER_ACCEL: number;
  BULLET_COOLDOWN_MS: number;
  INVULN_MS: number;
  LEVEL_TIME_S: number;
  KILLS_FOR_LEVEL: number;
}

// Halftone pipeline uniforms
export interface HalftoneUniforms {
  uResolution: { x: number; y: number };
  uTime: number;
  uDotScale: number;
  uAngle: number;
  uForegroundColor: { x: number; y: number; z: number };
  uBackgroundColor: { x: number; y: number; z: number };
  uIntensity: number;
}

// Sound effect types
export type SoundType = 'laser' | 'hit' | 'explosion' | 'levelup';

// HUD state for React overlay
export interface HUDState {
  lives: number;
  level: number;
  enemyKills: number;
  asteroidKills: number;
  gameOver: boolean;
  showLevelBanner: boolean;
  levelBannerText: string;
}

// Touch controls
export interface TouchControls {
  isDragging: boolean;
  dragStartY: number;
  currentY: number;
  isBoosting: boolean;
  lastShootTime: number;
}

// Game events for communication between Phaser and React
export interface GameEventData {
  type: 'update_hud' | 'game_over' | 'level_up' | 'restart' | 'boost_start' | 'boost_end' | 'shoot';
  data?: {
    lives?: number;
    level?: number;
    enemyKills?: number;
    asteroidKills?: number;
    gameOver?: boolean;
  };
}

// Custom Phaser scene with game state
export interface SaucerScene extends Phaser.Scene {
  gameState: GameState;
  player: Player;
  enemies: EnemySaucer[];
  asteroids: Asteroid[];
  projectiles: Projectile[];
  starfield: Phaser.GameObjects.TileSprite[];
  particles: ParticleSystem[];
  halftone?: Phaser.Renderer.WebGL.Pipelines.PostFXPipeline;
  touchControls: TouchControls;
  spawnerTimer?: Phaser.Time.TimerEvent;
}
