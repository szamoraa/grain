// TODO(santiago): re-enable halftone after art pass

import Phaser from 'phaser';
import { sfx } from '../Sfx';
import { HUDLayer } from '../ui/HUDLayer';
import { INTRO, SCORE, STINGER } from '../config';
import { getHighScore, tryUpdateHighScore } from '../../services/highscore';
import { GameEventEmitter } from '../../core/events';
import { Stinger } from '../entities/enemies/Stinger';

// Game tuning constants for Level 1
const PLAYER_X = 140;             // Fixed X anchor for player
const PLAYER_SPEED = 380;         // Vertical speed in px/s
const LASER_COOLDOWN_MS = 140;    // Laser fire rate

// Wave system constants
const WAVE1_DURATION_MS = 40000;  // keep as-is

type WaveSpec = {
  durationMs: number;
  enemyFireMul: number;      // 1.0=baseline, lower=faster fire
  enemySpawnMul: number;     // 1.0=baseline, lower=more frequent spawns
  asteroidSpawnMul: number;  // 1.0 keep same density
  extraEnemyCap: number;     // adds to base enemy cap
};

const WAVES: WaveSpec[] = [
  // Wave 1 (unchanged)
  { durationMs: WAVE1_DURATION_MS, enemySpawnMul: 1.0, asteroidSpawnMul: 1.0, enemyFireMul: 1.0, extraEnemyCap: 0 },

  // Wave 2 (~20% harder): spawn intervals ~20% shorter = ×0.8; fire ~15–20% faster
  { durationMs: WAVE1_DURATION_MS, enemySpawnMul: 0.80, asteroidSpawnMul: 0.80, enemyFireMul: 0.85, extraEnemyCap: 1 },
];
const LASER_SPEED = 900;          // Laser projectile speed

// Spawn settings are now wave-specific in WAVES array

const INVULN_MS = 1000;           // Invulnerability duration after hit
const START_LIVES = 3;            // Starting lives

const STAR_SLOW_SPEED = 24;       // Background star scroll speed
const STAR_FAST_SPEED = 48;       // Foreground star scroll speed

const GAME_WIDTH = 1600;
const GAME_HEIGHT = 720;

// Asteroid size variations
const ASTEROID_SCALES = [0.6, 1.0, 1.4];

// Enemy shooting
const ENEMY_LASER_SPEED = 700;     // px/s to the left
const ENEMY_LASER_DEPTH = 80;      // draw above sprites/starfield

// Scoring - updated values
const POINT_ASTEROID = 50;   // 50 points per asteroid (all sizes)
const POINT_ENEMY = 200;     // 200 points per enemy

// Power-ups
const SHIELD_DURATION_MS = 5000;          // 5 seconds of invincibility

// Ammo system (20 shots, 3.5s reload)
const AMMO_MAX = 20;
const RELOAD_MS = 3500; // exact spec
const AMMO_ARC_EVENT = 'hud:ammoArc';

// Combo system
const COMBO_WINDOW_MS = 1800;
const COMBO_MAX = 4;

// Power-ups
const PWR_DOUBLE_MS = 10000;
const PWR_SCORE2_MS = 15000;
const PWR_DROP_CHANCE = 0.20; // per big split

// Death sequence
const DEATH_SLOWMO_MS = 500;
const DEATH_TOTAL_MS = 1000;

// HUD events
const HUD_INTRO_EVENT = 'hud:intro';
// const HUD_COMBO_EVENT = 'hud:combo'; // Removed - combo overlay no longer used
const HUD_BUFF_EVENT = 'hud:buff';
const HUD_WAVE_SUMMARY_EVENT = 'hud:waveSummary';

// Wave system constants
const SHOW_COMPLETE_BANNER_MS = 1200; // brief pause before restart option
// const INTER_WAVE_MS = 1200; // 1.2s quiet gap between waves - not used in single wave mode
// Baseline spawn intervals (Wave 1 values)
const ASTEROID_SPAWN_MIN_MS = 700;
const ASTEROID_SPAWN_MAX_MS = 1000;
const ENEMY_SPAWN_MIN_MS = 1300;
const ENEMY_SPAWN_MAX_MS = 1900;
const ENEMY_FIRE_MIN_MS = 800;
const ENEMY_FIRE_MAX_MS = 1800;
const ASTEROID_CHANCE = 0.65; // 65% asteroids
const ASTEROID_SPEED_BASE = 260;
const ENEMY_SPEED_BASE = 280;

// Bullet system - extended reach
const BULLET_TTL_MS = 2000; // 2s to reach right edge
const BULLET_CLEANUP_MARGIN = 100; // extra margin beyond camera width

// Size-based asteroid speed modifiers
const ASTEROID_SIZE_SPEED_MOD = (scale: number): number => {
  // Large (1.4) → slower; small (0.6) → faster
  // scale 0.6 → +100, 1.0 → 0, 1.4 → -80
  return Math.round((1.0 - scale) * 200); // linear mapping
};

// Asteroid splitting - big asteroids split into smaller ones
const SPLIT_COUNT = 3; // number of small asteroids from one big
const SMALL_SCALE = 0.6; // scale for split asteroids

// Wave bonus
// const WAVE_CLEAR_BONUS = 1000;              // score on wave complete - not used in single wave mode

// Edge/safe space removal
const EDGE_PADDING = 8;                     // tiny margin to avoid clipping UI
const WALL_DANGER_THICKNESS = 8;            // danger zone thickness
const WALL_TICK_COOLDOWN_MS = 1000;         // wall damage cooldown

// UI constants used in HUD component

// Simple game state
interface GameState {
  lives: number;
  enemyKills: number;
  asteroidKills: number;
  score: number;
  gameOver: boolean;
  invulnerable: boolean;
  invulnerabilityTime: number;
  waveIndex: number;
  progress: number;
}

// Simple player
interface Player {
  sprite: Phaser.GameObjects.Sprite;
  y: number;
}

// Simple enemy
interface Enemy {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  speed: number;
  wobbleOffset: number;
}

// Simple asteroid
interface Asteroid {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  speed: number;
}

// Simple projectile
interface Projectile {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
}

// Power-up
interface PowerUp {
  sprite: Phaser.GameObjects.Sprite;
  type: 'shield' | 'heart';
  x: number;
  y: number;
}

// Shield effect
interface Shield {
  sprite: Phaser.GameObjects.Sprite;
  endTime: number;
}



// Main game scene - simplified Level 1
export class SaucerScene extends Phaser.Scene {
  // Game state
  gameState: GameState = {
    lives: START_LIVES,
    enemyKills: 0,
    asteroidKills: 0,
    score: 0,
    gameOver: false,
    invulnerable: false,
    invulnerabilityTime: 0,
    waveIndex: 1,
    progress: 0,
  };

  // Game entities
  player!: Player;
  enemies: Enemy[] = [];
  asteroids: Asteroid[] = [];
  projectiles: Projectile[] = [];
  enemyLasers!: Phaser.Physics.Arcade.Group;
  powerUps: PowerUp[] = [];
  activeShield?: Shield;

  // Background
  starfieldSlow!: Phaser.GameObjects.TileSprite;
  starfieldFast!: Phaser.GameObjects.TileSprite;

  // Input
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasdKeys!: { [key: string]: Phaser.Input.Keyboard.Key };
  spaceKey!: Phaser.Input.Keyboard.Key;

  // Timers
  lastShotTime: number = 0;
  lastWallTickAt: number = 0;

  // Multi-wave system
  currentWaveIndex = 0;
  waveStartTime = 0;
  missionEnded = false;
  spawningEnabled = true;
  inInterWave = false;

  // Timer management for wave-specific spawners
  timers: Phaser.Time.TimerEvent[] = [];

  // Baseline values for wave scaling
  baseEnemyCap = 3;
  baseEnemySpawnEveryMs: [number, number] = [ENEMY_SPAWN_MIN_MS, ENEMY_SPAWN_MAX_MS];
  baseEnemyFireEveryMs: [number, number] = [ENEMY_FIRE_MIN_MS, ENEMY_FIRE_MAX_MS];
  baseAsteroidEveryMs: [number, number] = [ASTEROID_SPAWN_MIN_MS, ASTEROID_SPAWN_MAX_MS];

  // Power-ups
  powerups!: Phaser.Physics.Arcade.Group;
  shieldActive = false;
  shieldTimer?: Phaser.Time.TimerEvent;
  shieldRing?: Phaser.GameObjects.Image;

  // Ammo system
  shotsUsed = 0;        // 0..AMMO_MAX
  reloading = false;    // true during cooldown
  reloadStartTime = 0;

  // Combo system
  comboLevel = 1;
  comboTimerMs = 0;

  // Power-ups
  buffDoubleShotUntil = 0;
  buffScore2Until = 0;

  // Statistics tracking
  shotsFired = 0;
  shotsHit = 0;
  peakCombo = 1;



  // HUD
  hud!: HUDLayer;

  // Meta loop system
  gameEvents!: GameEventEmitter;
  currentStreak = 0;
  streakLastKillTime = 0;
  highScore = 0;

  // Stinger enemies
  stingers: Stinger[] = [];
  stingerSpawnTimer?: Phaser.Time.TimerEvent;

  // Intro gate
  fromIntro = false;

  constructor() {
    super({ key: 'SaucerScene' });
  }

  init(data: { fromIntro?: boolean } = {}) {
    this.fromIntro = data.fromIntro || false;
  }

  // Wave management functions
  private startWave(i: number) {
    this.currentWaveIndex = i;
    const spec = WAVES[i];

    // Reset wave timer & progress bar
    this.waveStartTime = this.time.now;
    this.events.emit('hud:progress', 0); // reset progress bar
    this.events.emit('hud:wave', i + 1); // show wave label
    this.spawningEnabled = true;
    this.inInterWave = false;

    // Ensure clean slate
    this.stopAllSpawnTimers();
    this.startWaveSpawners(spec);

    // Show wave intro card
    const _introTitle = `Wave ${i + 1}`;
    let _introSub = '';
    if (i === 0) {
      _introSub = 'Survive 40s';
    } else if (i === 1) {
      _introSub = 'Enemies fire faster (+20%)';
    }

    this.events.emit(HUD_INTRO_EVENT, { title: _introTitle, sub: _introSub });
    this.events.emit('hud:waveTheme', { waveIndex: i + 1 });
  }

  private endWave() {
    this.inInterWave = true;
    this.spawningEnabled = false;
    this.stopAllSpawnTimers();

    // Optional: clear remaining enemies after a short fade so Wave 2 starts clean
    this.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) return;
      this.tweens.add({
        targets: enemy.sprite, alpha: 0, duration: 250, onComplete: () => {
          const sprite = enemy.sprite as Phaser.Physics.Arcade.Sprite;
          sprite.disableBody(true, true);
        }
      });
    });

    // Emit wave summary
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    this.events.emit(HUD_WAVE_SUMMARY_EVENT, {
      waveIndex: this.currentWaveIndex + 1,
      asteroids: this.gameState.asteroidKills,
      enemies: this.gameState.enemyKills,
      accuracy,
      peakCombo: this.peakCombo
    });

    // Emit celebration event
    this.events.emit('hud:celebrate', { waveIndex: this.currentWaveIndex + 1 });

    this.time.delayedCall(1500, () => { // Show summary for 1.5s
      this.inInterWave = false;

      if (this.currentWaveIndex + 1 < WAVES.length) {
        // Start next wave fresh
        this.startWave(this.currentWaveIndex + 1);
      } else {
        // No more waves
        this.finishMission();
      }
    });
  }

  private stopAllSpawnTimers() {
    for (const t of this.timers) {
      if (t && !t.hasDispatched) t.remove(false);
    }
    this.timers = [];
  }

  private startWaveSpawners(spec: WaveSpec) {
    // Enemy spawner (interval scaled)
    const [emin, emax] = this.baseEnemySpawnEveryMs;
    const enemySpawnDelay = () => Phaser.Math.Between(
      Math.round(emin * spec.enemySpawnMul),
      Math.round(emax * spec.enemySpawnMul)
    );

    const enemySpawnTick = () => {
      if (!this.spawningEnabled || this.inInterWave) return;
      // respect cap
      const cap = this.baseEnemyCap + spec.extraEnemyCap;
      if (this.enemies.length < cap) {
        const spawnX = GAME_WIDTH + 50;
        const spawnY = Phaser.Math.Between(EDGE_PADDING, GAME_HEIGHT - EDGE_PADDING);
        this.spawnEnemy(spawnX, spawnY);
      }
      // reschedule next tick
      this.timers.push(this.time.delayedCall(enemySpawnDelay(), enemySpawnTick));
    };
    this.timers.push(this.time.delayedCall(enemySpawnDelay(), enemySpawnTick));

    // Asteroid spawner (keep density same unless you want slight change)
    const [amin, amax] = this.baseAsteroidEveryMs;
    const asteroidDelay = () => Phaser.Math.Between(
      Math.round(amin * spec.asteroidSpawnMul),
      Math.round(amax * spec.asteroidSpawnMul)
    );

    const asteroidTick = () => {
      if (!this.spawningEnabled || this.inInterWave) return;
      const spawnX = GAME_WIDTH + 50;
      const spawnY = Phaser.Math.Between(EDGE_PADDING, GAME_HEIGHT - EDGE_PADDING);
      this.spawnAsteroid(spawnX, spawnY);
      this.timers.push(this.time.delayedCall(asteroidDelay(), asteroidTick));
    };
    this.timers.push(this.time.delayedCall(asteroidDelay(), asteroidTick));

    // Tell per-enemy fire logic about the fire multiplier
    this.data.set('enemyFireMul', spec.enemyFireMul);
  }

  private showCenterBanner(text: string, duration: number) {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const banner = this.add.text(cx, cy, text, {
      fontFamily: 'AstroUI',
      fontSize: '32px',
      color: '#33ff99',
      align: 'center'
    }).setOrigin(0.5).setDepth(1000);

    // Fade out after duration
    this.tweens.add({
      targets: banner,
      alpha: 0,
      duration: 300,
      delay: duration - 300,
      onComplete: () => banner.destroy()
    });
  }

  private finishMission() {
    // Reuse existing mission complete flow
    this.missionEnded = true;
    this.spawningEnabled = false;

    // Show mission complete banner
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const title = this.add.text(cx, cy - 20, 'MISSION COMPLETE', {
      fontFamily: 'AstroUI',
      fontSize: '48px',
      color: '#33ff99'
    }).setOrigin(0.5);

    const sub = this.add.text(cx, cy + 28, 'Press R to Restart', {
      fontFamily: 'AstroUI',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Handle restart
    this.input.keyboard?.once('keydown-R', () => this.scene.restart());
  }

  create(): void {
    console.log("✅ SaucerScene started"); // Debug: Confirm scene runs

    // Initialize meta loop system
    this.gameEvents = new GameEventEmitter(this);
    this.highScore = getHighScore();

    // Gate gameplay until intro completes (if enabled)
    if (INTRO.enabled && !this.fromIntro) {
      console.log("⏸️ Gated: waiting for intro completion");
      // Show loading state or minimal setup
      this.initializeBackground();
      this.initializePlayer();
      this.setupInput();
      return;
    }

    console.log("🚀 Starting full gameplay initialization");

    // Initialize game systems
    this.initializeBackground();
    this.initializePlayer();
    this.setupInput();
    this.initializeEnemyLasers();

    // Initialize power-ups
    this.powerups = this.physics.add.group({
      maxSize: 8,
      allowGravity: false
    });
    this.physics.add.overlap(this.player.sprite, this.powerups, this.onPickup, undefined, this);

    // Initialize HUD FIRST (before calling methods on it)
    this.hud = new HUDLayer(this);
    this.hud.setLives(this.gameState.lives);
    this.hud.setScore(this.gameState.score);
    this.hud.setBest(this.highScore);
    this.hud.setStreak(this.currentStreak);

    // Initialize multi-wave system - start Wave 1
    this.startWave(0); // start Wave 1 exactly as before

    // Initialize ammo system
    this.emitAmmoArc();

    // Initialize Stinger spawning
    this.initializeStingerSpawning();
  }

  private initializeStingerSpawning(): void {
    if (!STINGER.enabled) return;

    // Start Stinger spawn timer
    this.stingerSpawnTimer = this.time.addEvent({
      delay: 3000, // Check every 3 seconds
      callback: this.trySpawnStinger,
      callbackScope: this,
      loop: true
    });
  }

  private trySpawnStinger = (): void => {
    if (!STINGER.enabled || this.gameState.gameOver || !this.spawningEnabled) return;

    // Check wave requirement
    if (this.currentWaveIndex + 1 < STINGER.spawn.fromWave) return;

    // Check concurrent limit
    if (this.stingers.length >= STINGER.spawn.maxAlive) return;

    // Random chance
    if (Math.random() > STINGER.spawn.chance) return;

    // Spawn Stinger from right edge
    const spawnY = Phaser.Math.Between(50, this.cameras.main.height - 50);
    const stinger = new Stinger(this, this.cameras.main.width + 50, spawnY);
    this.stingers.push(stinger);

    // Note: Collision detection for Stingers is handled manually in handleCollisions() method
    // to match the existing collision system used for enemies and asteroids
  }

  private onStingerHitPlayer(stinger: Stinger): void {
    if (this.shieldActive) return;

    stinger.onHitPlayer();
    this.playerHit();
  }

  private onLaserHitStinger(laser: Phaser.Physics.Arcade.Sprite, stinger: Stinger): void {
    // Remove laser
    this.spendBullet(laser);

    // Kill Stinger
    this.killStinger(stinger);

    // Award score
    this.awardScore(STINGER.scoreValue, 'stinger');
  }

  private killStinger(stinger: Stinger): void {
    // Remove from array
    const index = this.stingers.indexOf(stinger);
    if (index > -1) {
      this.stingers.splice(index, 1);
    }

    // Create explosion
    this.createExplosion(stinger.sprite.x, stinger.sprite.y);
    this.events.emit('hud:ripple', { kind: 'explosion' });

    // Destroy Stinger
    stinger.destroy();

    // Emit kill event for streak system
    this.gameEvents.emit('enemyKilled', { type: 'stinger', score: STINGER.scoreValue });
  }

  update(time: number, delta: number): void {
    if (this.gameState.gameOver) return;

    // Update background
    this.updateBackground();

    // Update player
    this.updatePlayer(delta);

    // Update enemies and asteroids
    this.updateEnemies(delta);
    this.updateAsteroids(delta);
    this.updateStingers(delta);
    this.updateProjectiles(delta);

    // Handle enemy shooting and bullet cleanup
    this.handleEnemyShooting(time);
    this.cleanupEnemyLasers();

    // Update wave system
    this.updateWaveSystem(time);

    // Handle wall damage (remove safe spaces)
    this.handleWallDamage(time);

    // Handle collisions
    this.handleCollisions();

    // Update invulnerability
    this.updateInvulnerability(delta);

    // Update power-ups and shield
    this.updatePowerUps();

    // Update ammo arc during reload for smooth animation
    if (this.reloading) this.emitAmmoArc();

    // Update combo decay
    if (this.comboLevel > 1 && time > this.comboTimerMs) {
      this.comboLevel = 1;
    }

    // Update power-up timers and emit HUD updates
    this.updatePowerUpTimers();
  }

  // Initialize simple background
  private initializeBackground(): void {
    // Create two layers of starfield
    this.starfieldSlow = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'starfield-slow')
      .setOrigin(0, 0)
      .setTint(0xffffff)
      .setAlpha(0.6);

    this.starfieldFast = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'starfield-fast')
      .setOrigin(0, 0)
      .setTint(0xffffff)
      .setAlpha(0.4);
  }

  // Initialize player at fixed position
  private initializePlayer(): void {
    this.player = {
      sprite: this.physics.add.sprite(PLAYER_X, GAME_HEIGHT / 2, 'saucer'),
      y: GAME_HEIGHT / 2,
    };

    this.player.sprite.setScale(0.8);
  }

  // Initialize enemy lasers group with collision
  private initializeEnemyLasers(): void {
    this.enemyLasers = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 64,
      runChildUpdate: false,
    });

    // Physics group handles gravity settings automatically

    // Bullet → Player overlap (respect invuln flag)
    this.physics.add.overlap(this.player.sprite, this.enemyLasers, (_player, bullet) => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      if (!b.active) return;
      b.destroy();
      this.playerHit();
    }, undefined, this);
  }

  // Set up desktop input only
  private setupInput(): void {
    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // Update background scrolling
  private updateBackground(): void {
    this.starfieldSlow.tilePositionX += STAR_SLOW_SPEED * (1/60); // Assuming 60fps
    this.starfieldFast.tilePositionX += STAR_FAST_SPEED * (1/60);
  }

  // Update player position (vertical only)
  private updatePlayer(delta: number): void {
    const dt = delta / 1000; // Convert to seconds

    // Handle input
    let moveDirection = 0;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      moveDirection = -1;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      moveDirection = 1;
    }

    // Update player position
    this.player.y += moveDirection * PLAYER_SPEED * dt;
    this.player.y = Phaser.Math.Clamp(this.player.y, 30, GAME_HEIGHT - 30);
    this.player.sprite.y = this.player.y;

    // Handle shooting
    if (this.spaceKey.isDown && this.time.now - this.lastShotTime > LASER_COOLDOWN_MS) {
      this.tryFireLaser();
    }

    // Invulnerability flashing
    if (this.gameState.invulnerable) {
      this.player.sprite.setAlpha(Math.sin(this.time.now * 0.01) > 0 ? 0.3 : 1);
    } else {
      this.player.sprite.setAlpha(1);
    }
  }

  // Update enemies (simple left movement with wobble and shooting)
  private updateEnemies(delta: number): void {
    const dt = delta / 1000;

    this.enemies.forEach((enemy, index) => {
      enemy.x -= enemy.speed * dt;
      enemy.y += Math.sin(this.time.now * 0.003 + enemy.wobbleOffset) * 0.5;
      enemy.sprite.x = enemy.x;
      enemy.sprite.y = enemy.y;

      // Check if enemy should shoot
      const nextFireAt = enemy.sprite.getData('nextFireAt');
      if (nextFireAt && this.time.now >= nextFireAt) {
        this.fireEnemyLaser(enemy.sprite);
        this.scheduleEnemyFire(enemy.sprite);
      }

      // Remove if off-screen
      if (enemy.x < -50) {
        enemy.sprite.destroy();
        this.enemies.splice(index, 1);
      }
    });
  }

  // Update asteroids (simple left movement)
  private updateAsteroids(delta: number): void {
    const dt = delta / 1000;

    this.asteroids.forEach((asteroid, index) => {
      asteroid.x -= asteroid.speed * dt;
      asteroid.sprite.x = asteroid.x;

      // Remove if off-screen
      if (asteroid.x < -50) {
        asteroid.sprite.destroy();
        this.asteroids.splice(index, 1);
      }
    });
  }

  // Update projectiles (move right)
  private updateProjectiles(delta: number): void {
    const dt = delta / 1000;

    this.projectiles.forEach((projectile, index) => {
      projectile.x += LASER_SPEED * dt;
      projectile.sprite.x = projectile.x;

      // Remove if off-screen (extended margin to ensure visual reach)
      if (projectile.x > GAME_WIDTH + BULLET_CLEANUP_MARGIN) {
        this.spendBullet(projectile.sprite);
        this.projectiles.splice(index, 1);
      }
    });
  }

  private updateStingers(delta: number): void {
    // Update all active Stingers
    this.stingers.forEach((stinger, index) => {
      stinger.update(delta);

      // Remove dead Stingers
      if (!stinger.isAlive()) {
        this.stingers.splice(index, 1);
      }
    });
  }

  // Handle collisions
  private handleCollisions(): void {
    // Player laser vs Enemies
    this.projectiles.forEach((projectile, pIndex) => {
      this.enemies.forEach((enemy, eIndex) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          projectile.sprite.getBounds(),
          enemy.sprite.getBounds()
        )) {
          // Idempotent collision handling
          if (!projectile.sprite.getData('spent') && !enemy.sprite.getData('dead')) {
            this.spendBullet(projectile.sprite);
            this.killEnemy(enemy.sprite);
            // Remove from arrays (destroy is handled in the methods above)
            this.projectiles.splice(pIndex, 1);
            this.enemies.splice(eIndex, 1);
          }
        }
      });
    });

    // Player laser vs Asteroids
    this.projectiles.forEach((projectile, pIndex) => {
      this.asteroids.forEach((asteroid, aIndex) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          projectile.sprite.getBounds(),
          asteroid.sprite.getBounds()
        )) {
          // Idempotent collision handling
          if (!projectile.sprite.getData('spent') && !asteroid.sprite.getData('dead')) {
            this.spendBullet(projectile.sprite);
            this.killAsteroid(asteroid.sprite);
            // Remove from arrays (destroy is handled in the methods above)
            this.projectiles.splice(pIndex, 1);
            this.asteroids.splice(aIndex, 1);
          }
        }
      });
    });

    // Player vs Enemies/Asteroids
    if (!this.gameState.invulnerable) {
      [...this.enemies, ...this.asteroids].forEach((entity) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          this.player.sprite.getBounds(),
          entity.sprite.getBounds()
        )) {
          this.playerHit();
        }
      });
    }

    // Player vs Stingers
    if (!this.gameState.invulnerable) {
      this.stingers.forEach((stinger) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          this.player.sprite.getBounds(),
          stinger.sprite.getBounds()
        )) {
          this.onStingerHitPlayer(stinger);
        }
      });
    }

    // Player lasers vs Stingers
    this.projectiles.forEach((projectile, pIndex) => {
      this.stingers.forEach((stinger, sIndex) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          projectile.sprite.getBounds(),
          stinger.sprite.getBounds()
        )) {
          // Idempotent collision handling
          if (!projectile.sprite.getData('spent') && stinger.isAlive()) {
            this.spendBullet(projectile.sprite);
            this.killStinger(stinger);
            // Remove from arrays
            this.projectiles.splice(pIndex, 1);
            this.stingers.splice(sIndex, 1);
          }
        }
      });
    });

    // Enemy lasers vs Player handled by physics overlap in initializeEnemyLasers()
  }

  // Handle player taking damage
  private playerHit(): void {
    // Check if shield is active - ignore damage if so
    if (this.shieldActive) {
      // Optional: brief flash effect when shielded
      this.player.sprite.setTint(0xffffff);
      this.time.delayedCall(100, () => {
        if (this.player.sprite.active) {
          this.player.sprite.clearTint();
        }
      });
      return;
    }

    // Reset streak on player hit (if configured)
    if (SCORE.onPlayerHitResetsStreak) {
      this.resetStreak();
    }

    // Emit player hit event
    this.gameEvents.emit('playerHit', { damage: 1 });

    this.gameState.lives--;
    this.gameState.invulnerable = true;
    this.gameState.invulnerabilityTime = INVULN_MS;

    // Update HUD lives with wobble effect
    this.hud.setLives(this.gameState.lives, true);

    sfx.boom();
    this.updateHUD();

    if (this.gameState.lives <= 0) {
      this.beginDeathSequence();
    }
  }

  // Cinematic death sequence
  private beginDeathSequence(): void {
    // Stop input and firing
    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
    }
    this.spawningEnabled = false;
    this.stopAllSpawnTimers();

    // Disable player collisions
    if (this.player.sprite.body && this.player.sprite.body instanceof Phaser.Physics.Arcade.Body) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    // Camera effects
    this.cameras.main.shake(250, 0.004);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.2,
      duration: DEATH_SLOWMO_MS,
      ease: 'Power2'
    });

    // Time slow effect
    this.time.timeScale = 0.6;
    this.time.delayedCall(DEATH_SLOWMO_MS, () => {
      this.time.timeScale = 1.0;
    });

    // Explosion effects
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    // Create expanding circles
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 100, () => {
        const circle = this.add.graphics();
        circle.fillStyle(0xffa500, 0.8);
        circle.fillCircle(px, py, 5);
        circle.setDepth(999);

        this.tweens.add({
          targets: circle,
          scaleX: 8,
          scaleY: 8,
          alpha: 0,
          duration: 400,
          ease: 'Power2',
          onComplete: () => circle.destroy()
        });
      });
    }

    // Particle burst
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30;
      const particle = this.add.graphics();
      particle.fillStyle(0xffffff, 0.9);
      particle.fillCircle(px + Math.cos(angle) * distance, py + Math.sin(angle) * distance, 3);
      particle.setDepth(999);

      this.tweens.add({
        targets: particle,
        x: px + Math.cos(angle) * 100,
        y: py + Math.sin(angle) * 100,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // White flash
    const flash = this.add.graphics();
    flash.fillStyle(0xffffff, 1);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    flash.setDepth(1000);
    flash.setAlpha(0);

    this.tweens.add({
      targets: flash,
      alpha: 0.8,
      duration: 120,
      yoyo: true,
      onComplete: () => flash.destroy()
    });

    // Play explosion sound
    sfx.explosionLarge();

    // After sequence, show game over
    this.time.delayedCall(DEATH_TOTAL_MS, () => {
      this.gameOver();
    });
  }

  // Game over
  private gameOver(): void {
    this.gameState.gameOver = true;

    // Stop all spawn timers and Stinger spawning
    this.stopAllSpawnTimers();
    if (this.stingerSpawnTimer) {
      this.stingerSpawnTimer.destroy();
    }

    // Check for new high score
    const highScoreResult = tryUpdateHighScore(this.gameState.score);

    // Emit game over event
    this.gameEvents.emit('gameOver', { finalScore: this.gameState.score });

    // Get camera center for perfect centering
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Show game over text - perfectly centered
    const gameOverText = this.add.text(cx, cy - 60, 'GAME OVER', {
      fontFamily: 'AstroUI',
      fontSize: '64px',
      color: '#ff2b2b',
      fontStyle: 'bold'
    });
    gameOverText.setOrigin(0.5, 0.5);

    // Show "NEW BEST!" banner if new high score
    let newBestBanner: Phaser.GameObjects.Text | null = null;
    if (highScoreResult.isNew) {
      newBestBanner = this.add.text(cx, cy - 120, 'NEW BEST!', {
        fontFamily: 'AstroUI',
        fontSize: '48px',
        color: '#ffd700',
        fontStyle: 'bold'
      });
      newBestBanner.setOrigin(0.5, 0.5);

      // Animate the banner
      this.tweens.add({
        targets: newBestBanner,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Power2'
      });

      // Emit high score updated event
      this.gameEvents.emit('highScoreUpdated', { newBest: highScoreResult.best });
    }

    // Show final score
    const scoreText = this.add.text(cx, cy, `Score: ${this.gameState.score}`, {
      fontFamily: 'AstroUI',
      fontSize: '28px',
      color: '#ffffff'
    });
    scoreText.setOrigin(0.5, 0.5);

    // Show best score
    const bestText = this.add.text(cx, cy + 32, `Best: ${highScoreResult.best}`, {
      fontFamily: 'AstroUI',
      fontSize: '24px',
      color: '#cccccc'
    });
    bestText.setOrigin(0.5, 0.5);

    // Restart instruction
    const restartText = this.add.text(cx, cy + 72, 'Press R to Restart', {
      fontFamily: 'AstroUI',
      fontSize: '24px',
      color: '#ffffff'
    });
    restartText.setOrigin(0.5, 0.5);

    // Handle resize to keep centering
    this.scale.on('resize', () => {
      const newCx = this.cameras.main.centerX;
      const newCy = this.cameras.main.centerY;
      gameOverText.setPosition(newCx, newCy - 60);
      if (newBestBanner) {
        newBestBanner.setPosition(newCx, newCy - 120);
      }
      scoreText.setPosition(newCx, newCy);
      bestText.setPosition(newCx, newCy + 32);
      restartText.setPosition(newCx, newCy + 72);
    });

    // Add restart key - restart with intro if enabled
    const restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    restartKey.on('down', () => {
      if (INTRO.enabled) {
        this.scene.start('IntroScene');
      } else {
        this.scene.restart();
      }
    });
  }

  // Update invulnerability timer
  private updateInvulnerability(delta: number): void {
    if (this.gameState.invulnerable) {
      this.gameState.invulnerabilityTime -= delta;
      if (this.gameState.invulnerabilityTime <= 0) {
        this.gameState.invulnerable = false;
      }
    }
  }

  // Start spawning enemies/asteroids


  // Spawn random entity (allows edge spawns to remove safe spaces)
  private spawnEntity(): void {
    // Don't spawn when mission is ended
    if (!this.spawningEnabled) return;

    const spawnX = GAME_WIDTH + 50;
    const spawnY = Phaser.Math.Between(EDGE_PADDING, GAME_HEIGHT - EDGE_PADDING);

    if (Math.random() < ASTEROID_CHANCE) {
      this.spawnAsteroid(spawnX, spawnY);
    } else {
      // Check enemy cap before spawning
      const baseCap = 3; // your existing enemy cap
      const extra = this.data.get('extraEnemyCap') ?? 0;
      const cap = baseCap + extra;
      if (this.enemies.length < cap) {
        this.spawnEnemy(spawnX, spawnY);
      }
    }
  }

  // Spawn enemy
  private spawnEnemy(x: number, y: number): void {
    const enemy: Enemy = {
      sprite: this.physics.add.sprite(x, y, 'enemy-saucer'),
      x: x,
      y: y,
      speed: Phaser.Math.Between(ENEMY_SPEED_BASE, ENEMY_SPEED_BASE + 40),
      wobbleOffset: Math.random() * Math.PI * 2,
    };

    enemy.sprite.setScale(0.7 * 2.0); // 200% larger
    this.scheduleEnemyFire(enemy.sprite);
    this.enemies.push(enemy);

    // Emit threat indicator if enemy spawns off-screen
    this.emitThreatIndicator(x, y);
  }

  // Schedule enemy fire
  private scheduleEnemyFire(enemy: Phaser.GameObjects.Sprite): void {
    const mul = this.data.get('enemyFireMul') ?? 1.0;
    const nextDelay = Phaser.Math.Between(
      Math.round(ENEMY_FIRE_MIN_MS * mul),
      Math.round(ENEMY_FIRE_MAX_MS * mul)
    );
    enemy.setData('nextFireAt', this.time.now + nextDelay);
  }

  // Spawn asteroid with variable size
  private spawnAsteroid(x: number, y: number): void {
    const scale = Phaser.Utils.Array.GetRandom(ASTEROID_SCALES);
    const speed = ASTEROID_SPEED_BASE + ASTEROID_SIZE_SPEED_MOD(scale) + Phaser.Math.Between(-30, 30);

    const asteroid: Asteroid = {
      sprite: this.physics.add.sprite(x, y, 'asteroid'),
      x: x,
      y: y,
      speed: speed,
    };

    // Make big asteroids 1.6x larger (reduced from 2.0x)
    const finalScale = scale >= 1.35 ? scale * 1.6 : scale;
    asteroid.sprite.setScale(finalScale);

    // Update physics body to match the new scale
    if (scale >= 1.35) {
      // For big asteroids, scale the physics body proportionally
      const originalRadius = 16; // Approximate original radius
      const newRadius = originalRadius * 1.6;
      (asteroid.sprite.body as Phaser.Physics.Arcade.Body).setCircle(newRadius, -newRadius, -newRadius);
    }

    this.asteroids.push(asteroid);
  }

  // Create explosion effect
  private createExplosion(x: number, y: number): void {
    // Simple explosion particles
    for (let i = 0; i < 8; i++) {
      const particle = this.add.sprite(x, y, 'explosion-particle');
      const angle = (i / 8) * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 150);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 500,
        onComplete: () => particle.destroy()
      });
    }

    // Kill sparkles - tiny white particles
    for (let i = 0; i < 6; i++) {
      const sparkle = this.add.graphics();
      sparkle.fillStyle(0xffffff, 0.8);
      sparkle.fillCircle(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10), 2);
      sparkle.setDepth(999);

      this.tweens.add({
        targets: sparkle,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 200,
        onComplete: () => sparkle.destroy()
      });
    }
  }

  // Shoot laser
  private spawnPlayerLaser(isDoubleShot = false): void {
    this.lastShotTime = this.time.now;

    // For double-shot, offset the second laser slightly
    const offsetX = isDoubleShot ? 8 : 0;
    const offsetY = isDoubleShot ? 3 : 0;

    const projectile: Projectile = {
      sprite: this.physics.add.sprite(PLAYER_X + 30 + offsetX, this.player.y + offsetY, 'playerLaser'),
      x: PLAYER_X + 30 + offsetX,
      y: this.player.y + offsetY,
    };

    projectile.sprite.setScale(0.8);
    this.projectiles.push(projectile);

    // Auto-timeout bullet after 2 seconds to ensure it reaches right edge
    this.time.delayedCall(BULLET_TTL_MS, () => this.spendBullet(projectile.sprite));

    sfx.laser();
  }



  // Handle enemy shooting based on their own timers
  private handleEnemyShooting(time: number): void {
    this.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) return;
      const nextFireAt = enemy.sprite.getData('nextFireAt');
      if (nextFireAt && time >= nextFireAt) {
        this.fireEnemyLaser(enemy.sprite);
        this.scheduleEnemyFire(enemy.sprite);
      }
    });
  }

  // Cleanup enemy bullets when offscreen
  private cleanupEnemyLasers(): void {
    this.enemyLasers.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const bullet = child as Phaser.Physics.Arcade.Image;
      if (!bullet || !bullet.active) return null;
      if (bullet.x <= (bullet.getData("killAt") ?? -40)) {
        bullet.destroy();
      }
      return null;
    });
  }

  // Fire enemy laser - chunky, bright, additive glow
  private fireEnemyLaser(from: Phaser.GameObjects.Sprite): void {
    const x = from.x - 20; // from the nose, slightly left of enemy
    const y = from.y;
    const b = this.enemyLasers.get(x, y, "enemyLaser") as Phaser.Physics.Arcade.Image | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.setBlendMode(Phaser.BlendModes.ADD);   // glow pop
    b.setDepth(ENEMY_LASER_DEPTH);
    b.setAngle(180);                         // face left (optional)

    // Hitbox roughly matches texture
    b.setSize(18, 6);

    // Motion
    b.setVelocityX(-ENEMY_LASER_SPEED);
    b.setVelocityY(0);

    // Auto-destroy offscreen
    b.setData("killAt", -40); // x threshold

    // Muzzle flash for visibility
    const flash = this.add.image(from.x - 10, from.y, "enemyLaser")
      .setDepth(ENEMY_LASER_DEPTH + 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.2,
      duration: 80,
      onComplete: () => flash.destroy()
    });

    sfx.laser();
  }

  // Add score
  private addScore(points: number): void {
    this.gameState.score += points;

    // Update high score if applicable
    const highScore = parseInt(localStorage.getItem('grain_highscore') || '0');
    if (this.gameState.score > highScore) {
      localStorage.setItem('grain_highscore', this.gameState.score.toString());
    }

    this.updateHUD();
  }

  // Update multi-wave system
  private updateWaveSystem(time: number): void {
    const spec = WAVES[this.currentWaveIndex];
    const elapsed = time - this.waveStartTime;
    const progress = Phaser.Math.Clamp(elapsed / spec.durationMs, 0, 1);

    // Update HUD progress
    this.hud.drawProgress(progress);

    // Progress bar glow effect during last 15%
    const isEndGame = progress >= 0.85;
    this.events.emit('hud:progressGlow', isEndGame);

    // Check for wave completion
    if (!this.inInterWave && progress >= 1) {
      this.endWave();
    }
  }



  destroy(): void {
    // Clean up HUD when scene is destroyed
    if (this.hud) {
      this.hud.destroy();
    }
    // Clean up shield timer
    if (this.shieldTimer) {
      this.shieldTimer.remove();
    }
  }

  // Combo methods (internal only, no HUD emission)
  private updateComboOnKill() {
    this.comboLevel = Math.min(this.comboLevel + 1, COMBO_MAX);
    this.comboTimerMs = this.time.now + COMBO_WINDOW_MS;
    this.peakCombo = Math.max(this.peakCombo, this.comboLevel);
  }

  // Threat indicator method
  private emitThreatIndicator(x: number, y: number): void {
    const cam = this.cameras.main;

    // Determine which side the enemy is spawning from
    let side: string;
    if (x < cam.worldView.x + 50) {
      side = 'left';
    } else if (x > cam.worldView.x + cam.width - 50) {
      side = 'right';
    } else if (y < cam.worldView.y + 50) {
      side = 'top';
    } else {
      return; // Not spawning off-screen
    }

    this.events.emit('hud:threat', { side, ttl: 900 });
  }

  // Power-up methods
  private isDoubleShot() {
    return this.time.now < this.buffDoubleShotUntil;
  }

  private isScore2() {
    return this.time.now < this.buffScore2Until;
  }

  private updatePowerUpTimers() {
    // Emit buff updates for active power-ups
    if (this.isDoubleShot()) {
      const progress = 1 - ((this.buffDoubleShotUntil - this.time.now) / PWR_DOUBLE_MS);
      this.events.emit(HUD_BUFF_EVENT, { type: 'double', progress: Phaser.Math.Clamp(progress, 0, 1), active: true });
    } else if (this.buffDoubleShotUntil > 0) {
      this.buffDoubleShotUntil = 0;
      this.events.emit(HUD_BUFF_EVENT, { type: 'double', progress: 0, active: false });
    }

    if (this.isScore2()) {
      const progress = 1 - ((this.buffScore2Until - this.time.now) / PWR_SCORE2_MS);
      this.events.emit(HUD_BUFF_EVENT, { type: 'score2', progress: Phaser.Math.Clamp(progress, 0, 1), active: true });
    } else if (this.buffScore2Until > 0) {
      this.buffScore2Until = 0;
      this.events.emit(HUD_BUFF_EVENT, { type: 'score2', progress: 0, active: false });
    }
  }

  private activateDoubleShot() {
    this.buffDoubleShotUntil = this.time.now + PWR_DOUBLE_MS;
    this.events.emit(HUD_BUFF_EVENT, { type: 'double', progress: 0, active: true });
  }

  private activateScore2() {
    this.buffScore2Until = this.time.now + PWR_SCORE2_MS;
    this.events.emit(HUD_BUFF_EVENT, { type: 'score2', progress: 0, active: true });
  }

  // Statistics tracking
  private trackShotFired() {
    this.shotsFired++;
  }

  private trackShotHit() {
    this.shotsHit++;
  }

  // Ammo methods
  private emitAmmoArc() {
    // ratioUsed: 0..1 (used portion)
    // during reload, show a shrinking value from 1 → 0 over RELOAD_MS
    let ratioUsed = this.shotsUsed / AMMO_MAX;
    if (this.reloading) {
      const t = Phaser.Math.Clamp((this.time.now - this.reloadStartTime) / RELOAD_MS, 0, 1);
      ratioUsed = 1 - t; // arc shrinks as it reloads
    }
    this.events.emit(AMMO_ARC_EVENT, { ratioUsed, reloading: this.reloading });
  }

  private tryFireLaser() {
    if (this.reloading) return;

    if (this.shotsUsed >= AMMO_MAX) {
      // lock & start reload
      this.reloading = true;
      this.reloadStartTime = this.time.now;
      this.emitAmmoArc();
      this.time.delayedCall(RELOAD_MS, () => {
        this.reloading = false;
        this.shotsUsed = 0;
        this.emitAmmoArc();
      });
      return;
    }

    // Spawn bullet as you already do
    this.spawnPlayerLaser();
    this.trackShotFired();

    // Emit ripple effect
    this.events.emit('hud:ripple', { kind: 'laser' });

    // Double-shot power-up: spawn second laser
    if (this.isDoubleShot()) {
      this.time.delayedCall(50, () => { // Small delay for visual effect
        this.spawnPlayerLaser(true); // offset for double-shot
        this.trackShotFired();
      });
    }

    this.shotsUsed = Math.min(AMMO_MAX, this.shotsUsed + 1);
    this.emitAmmoArc();

    // If we just hit cap, trigger reload
    if (this.shotsUsed >= AMMO_MAX) {
      this.reloading = true;
      this.reloadStartTime = this.time.now;
      this.emitAmmoArc();
      this.time.delayedCall(RELOAD_MS, () => {
        this.reloading = false;
        this.shotsUsed = 0;
        this.emitAmmoArc();
      });
    }
  }

  // Power-up methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onPickup = (_player: any, pu: any) => {
    if (!pu.active || pu.getData('taken')) return;
    pu.setData('taken', true);
    const kind = pu.getData('kind');
    pu.disableBody(true, true);

    if (kind === 'shield') this.activateShield(SHIELD_DURATION_MS);
    if (kind === 'life') this.addLife(1);
    if (kind === 'double') this.activateDoubleShot();
    if (kind === 'score2') this.activateScore2();
  };

  private spawnPowerup(x: number, y: number, kind: 'shield' | 'life' | 'double' | 'score2') {
    let key = '';
    if (kind === 'shield') key = 'pwr_shield';
    else if (kind === 'life') key = 'pwr_life';
    else if (kind === 'double') key = 'pwr_double';
    else if (kind === 'score2') key = 'pwr_score2';

    const pu = this.powerups.get(x, y, key) as Phaser.Physics.Arcade.Sprite;
    if (!pu) return;

    pu.setActive(true).setVisible(true);
    pu.setData('kind', kind).setData('taken', false);
    this.physics.world.enable(pu);
    if (pu.body) {
      (pu.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }
    pu.setDepth(9999);

    // Gentle drift left with bob
    const vx = Phaser.Math.Between(-160, -120);
    pu.setVelocity(vx, 0);
    this.tweens.add({
      targets: pu,
      y: y + 8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });

    // Cleanup if offscreen too far
    this.time.delayedCall(6000, () => {
      if (pu.active) pu.disableBody(true, true);
    });
  }

  private maybeDropFromBigAsteroid(x: number, y: number) {
    const roll = Math.random();
    if (roll < PWR_DROP_CHANCE) {
      // Split chance between double-shot and score2
      const subRoll = Math.random();
      if (subRoll < 0.5) {
        this.spawnPowerup(x, y, 'double');
      } else {
        this.spawnPowerup(x, y, 'score2');
      }
    }
  }

  // Shield mechanics
  private activateShield(ms: number) {
    if (this.shieldTimer) this.shieldTimer.remove(false);

    if (!this.shieldActive) {
      this.shieldActive = true;
      // Visuals: ring that follows player
      this.shieldRing = this.add.image(this.player.sprite.x, this.player.sprite.y, 'pwr_shield')
        .setDepth(9998)
        .setAlpha(0.9);

      this.tweens.add({
        targets: this.shieldRing,
        scale: { from: 1.0, to: 1.12 },
        alpha: { from: 0.9, to: 0.75 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    // Refresh timer
    this.shieldTimer = this.time.delayedCall(ms, () => {
      this.shieldActive = false;
      this.shieldRing?.destroy();
      this.shieldRing = undefined;
    });
  }

  private addLife(amount: number) {
    this.gameState.lives = Math.min(this.gameState.lives + amount, 5);
    this.hud?.setLives(this.gameState.lives);
  }





  // Handle wall damage to prevent safe space camping
  private handleWallDamage(time: number): void {
    if (this.gameState.invulnerable) return;

    const inDangerZone = this.player.y < WALL_DANGER_THICKNESS ||
                        this.player.y > GAME_HEIGHT - WALL_DANGER_THICKNESS;

    if (inDangerZone && time - this.lastWallTickAt > WALL_TICK_COOLDOWN_MS) {
      this.lastWallTickAt = time;
      this.playerHit();
    }
  }

  // Update HUD via custom event
  private updateHUD(): void {
    const event: CustomEvent = new CustomEvent('gameEvent', {
      detail: {
        type: 'update_hud',
        data: {
          lives: this.gameState.lives,
          level: this.gameState.waveIndex, // Shows wave number or "Complete"
          enemyKills: this.gameState.enemyKills,
          asteroidKills: this.gameState.asteroidKills,
          score: this.gameState.score,
          gameOver: this.gameState.gameOver,
        }
      }
    });
    window.dispatchEvent(event);
  }

  // Idempotent score awarding
  private awardScore(amount: number, _reason: 'asteroid' | 'enemy' | 'stinger'): void {
    // Update streak system first
    this.updateStreakOnKill();

    // Apply power-up multipliers first
    let finalAmount = amount;
    if (this.isScore2()) {
      finalAmount *= 2; // Score x2 power-up
    }

    // Then apply combo multiplier (legacy)
    finalAmount *= this.comboLevel;

    // Then apply streak multiplier
    const streakMultiplier = 1 + (this.currentStreak * SCORE.streakStep);
    finalAmount *= streakMultiplier;

    this.gameState.score += finalAmount;

    // Update HUD score with delta for pulse effect
    this.hud.setScore(this.gameState.score, finalAmount);
    this.hud.setStreak(this.currentStreak);

    // Emit events for meta loop system
    this.gameEvents.emit('enemyKilled', { type: _reason, score: finalAmount });
    this.gameEvents.emit('scoreUpdated', { score: this.gameState.score, delta: finalAmount });
    this.gameEvents.emit('streakUpdated', { streak: this.currentStreak });
  }

  private updateStreakOnKill(): void {
    const now = this.time.now;

    // Check if kill is within streak window
    if (this.streakLastKillTime > 0 && (now - this.streakLastKillTime) <= SCORE.streakWindowMs) {
      this.currentStreak = Math.min(this.currentStreak + 1, SCORE.streakCap);
    } else {
      this.currentStreak = 1; // Reset to 1 for first kill or after timeout
    }

    this.streakLastKillTime = now;
  }

  private resetStreak(): void {
    this.currentStreak = 0;
    this.streakLastKillTime = 0;
    this.hud.setStreak(0);
    this.gameEvents.emit('streakUpdated', { streak: 0 });
  }

  // Idempotent asteroid destruction with splitting
  private killAsteroid(ast: Phaser.GameObjects.Sprite): void {
    if (!ast.active || ast.getData('dead')) return;
    ast.setData('dead', true);

    const asteroidScale = ast.scale;
    const isBigAsteroid = asteroidScale >= 1.3; // big asteroids split

    if (isBigAsteroid) {
      // Split big asteroid into smaller ones
      this.splitAsteroid(ast.x, ast.y);

      // Chance to drop power-up from big asteroid kill
      this.maybeDropFromBigAsteroid(ast.x, ast.y);
    }

    ast.destroy(); // remove from scene
    this.createExplosion(ast.x, ast.y);
    this.events.emit('hud:ripple', { kind: 'explosion' });
    this.gameState.asteroidKills++;
    this.updateComboOnKill();
    this.awardScore(POINT_ASTEROID, 'asteroid');
    this.updateHUD();
  }

  // Split big asteroid into smaller asteroids
  private splitAsteroid(x: number, y: number): void {
    for (let i = 0; i < SPLIT_COUNT; i++) {
      const angle = (i / SPLIT_COUNT) * Math.PI * 2 + Math.random() * 0.5 - 0.25;
      const distance = 20 + Math.random() * 30;

      const splitX = x + Math.cos(angle) * distance;
      const splitY = y + Math.sin(angle) * distance;

      this.spawnSmallAsteroid(splitX, splitY);
    }
  }

  // Spawn small asteroid (for splitting)
  private spawnSmallAsteroid(x: number, y: number): void {
    const speed = ASTEROID_SPEED_BASE + ASTEROID_SIZE_SPEED_MOD(SMALL_SCALE) + Phaser.Math.Between(-30, 30);

    const asteroid: Asteroid = {
      sprite: this.physics.add.sprite(x, y, 'asteroid'),
      x: x,
      y: y,
      speed: speed,
    };

    asteroid.sprite.setScale(SMALL_SCALE);
    this.asteroids.push(asteroid);
  }

  // Idempotent enemy destruction
  private killEnemy(e: Phaser.GameObjects.Sprite): void {
    if (!e.active || e.getData('dead')) return;
    e.setData('dead', true);
    e.destroy(); // remove from scene
    this.createExplosion(e.x, e.y);
    this.events.emit('hud:ripple', { kind: 'explosion' });
    this.gameState.enemyKills++;
    this.trackShotHit(); // Track successful hits for accuracy
    this.updateComboOnKill();
    this.awardScore(POINT_ENEMY, 'enemy');
    this.updateHUD();
  }

  // Idempotent bullet spending
  private spendBullet(b: Phaser.GameObjects.Sprite): void {
    if (!b.active || b.getData('spent')) return;
    b.setData('spent', true);
    b.destroy(); // remove from scene
  }

  // Spawn shield power-up at given position (waves 2-3 only)
  private spawnShieldPowerUp(x: number, y: number): void {
    const powerUp: PowerUp = {
      sprite: this.physics.add.sprite(x, y, 'pwr_shield'),
      type: 'shield',
      x: x,
      y: y,
    };

    powerUp.sprite.setScale(0.8);
    (powerUp.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(-120 + Math.random() * 80); // -120 to -40
    (powerUp.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(Math.random() * 100 - 50); // -50 to 50
    (powerUp.sprite.body as Phaser.Physics.Arcade.Body).allowGravity = false;

    this.powerUps.push(powerUp);
  }

  // Handle power-up pickup (shields only)
  private handlePowerUpPickup(powerUp: PowerUp): void {
    if (powerUp.type === 'shield') {
      this.activateShield(SHIELD_DURATION_MS);
    }

    // Destroy power-up
    powerUp.sprite.destroy();
    const index = this.powerUps.indexOf(powerUp);
    if (index > -1) {
      this.powerUps.splice(index, 1);
    }
  }



  // Update power-ups and shield
  private updatePowerUps(): void {
    // Update shield ring position to follow player
    if (this.shieldRing && this.shieldActive) {
      this.shieldRing.setPosition(this.player.sprite.x, this.player.sprite.y);
    }

    // Update power-up cleanup (disable offscreen powerups)
    this.powerups.children.each((pu: Phaser.GameObjects.GameObject) => {
      if (pu.active && (pu as Phaser.GameObjects.Sprite).x < -50) {
        (pu as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
      }
      return null;
    });
  }

}
