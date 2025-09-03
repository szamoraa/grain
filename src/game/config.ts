// Game configuration tunables for ASTRO
// All gameplay parameters centralized here for easy tuning

// Cinematic intro sequence settings
export const INTRO = {
  enabled: true,
  countdownFrom: 3,
  skippable: true,
  durations: {
    fadeIn: 600,      // starfield fade in
    shipIn: 900,      // ship slide in + bob
    betweenNumbers: 500, // pause between countdown numbers
    goFlash: 500,     // "GO" flash duration
  },
} as const;

// Scoring and streak system
export const SCORE = {
  base: 200,              // default enemy points (matches current POINT_ENEMY)
  asteroid: 50,           // asteroid points (matches current POINT_ASTEROID)
  streakWindowMs: 1200,   // time allowed between kills to keep streak
  streakStep: 0.2,        // +20% per step
  streakCap: 5,           // max 5 -> 200% bonus
  onPlayerHitResetsStreak: true,
} as const;

// Yellow Stinger enemy settings
export const STINGER = {
  enabled: true,
  scale: 0.8,             // 80% of red enemy size
  speed: 260,             // px/s baseline forward
  zigzag: {
    amplitude: 38,       // sin(k*t)
    freq: 2.2,
  },
  lockIntervalMs: 800,    // how often to retarget player
  steerLerp: 0.12,        // 0..1 factor toward player direction
  spawn: {
    fromWave: 3,         // introduce from wave 3
    chance: 0.35,        // 35% chance when spawning enemies
    maxAlive: 6,         // max concurrent Stingers
  },
  scoreValue: 120,        // points for destroying Stinger
  flashOnLockMs: 120,     // brief flash when locking on
} as const;
