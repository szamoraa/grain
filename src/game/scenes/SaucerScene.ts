// TODO(santiago): re-enable halftone after art pass

import Phaser from 'phaser';
import { sfx } from '../Sfx';

// Game tuning constants for Level 1
const PLAYER_X = 140;             // Fixed X anchor for player
const PLAYER_SPEED = 380;         // Vertical speed in px/s
const LASER_COOLDOWN_MS = 140;    // Laser fire rate
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

// Scoring
const POINT_ASTEROID = 100;
const POINT_ENEMY = 1000;

// Power-ups
const SHIELD_DURATION_MS = 5000;          // 5 seconds of invincibility

// Inter-wave breather
const INTER_WAVE_MS = 1500;               // 1.5s pause between waves

// Single wave system - 20s mission
const WAVE_DURATION_MS = 20000; // ~20s
const ASTEROID_SPAWN_MIN_MS = 700;
const ASTEROID_SPAWN_MAX_MS = 1000;
const ENEMY_SPAWN_MIN_MS = 1300;
const ENEMY_SPAWN_MAX_MS = 1900;
const ASTEROID_CHANCE = 0.65; // 65% asteroids
const ASTEROID_SPEED_BASE = 260;
const ENEMY_SPEED_BASE = 280;
const ENEMY_FIRE_MIN_MS = 1000;
const ENEMY_FIRE_MAX_MS = 1500;

// Size-based asteroid speed modifiers
const ASTEROID_SIZE_SPEED_MOD = (scale: number): number => {
  // Large (1.4) → slower; small (0.6) → faster
  // scale 0.6 → +80, 1.0 → 0, 1.4 → -70
  return Math.round((1.0 - scale) * 200); // linear mapping
};

// Wave bonus
const WAVE_CLEAR_BONUS = 1000;              // score on wave complete

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

  // Single wave system
  waveStartTime: number = 0;
  missionEnded: boolean = false;
  spawningEnabled: boolean = true;

  // Spawn timers
  asteroidTimer: Phaser.Time.TimerEvent | null = null;
  enemyTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'SaucerScene' });
  }

  create(): void {
    // Initialize game systems
    this.initializeBackground();
    this.initializePlayer();
    this.setupInput();
    this.initializeEnemyLasers();

    // Initialize single wave system
    this.waveStartTime = this.time.now;
    this.spawningEnabled = true;
    this.missionEnded = false;
    this.gameState.waveIndex = 1; // Show "Wave 1"
    this.startSpawnTimers();

    // Send initial HUD update
    this.updateHUD();
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
      this.shoot();
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

      // Remove if off-screen
      if (projectile.x > GAME_WIDTH + 50) {
        this.spendBullet(projectile.sprite);
        this.projectiles.splice(index, 1);
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

    // Enemy lasers vs Player handled by physics overlap in initializeEnemyLasers()
  }

  // Handle player taking damage
  private playerHit(): void {
    this.gameState.lives--;
    this.gameState.invulnerable = true;
    this.gameState.invulnerabilityTime = INVULN_MS;

    sfx.boom();
    this.updateHUD();

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  // Game over
  private gameOver(): void {
    this.gameState.gameOver = true;

    // Stop all spawn timers
    this.stopTimers();

    // Get camera center for perfect centering
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Show game over text - perfectly centered
    const gameOverText = this.add.text(cx, cy - 60, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff2b2b',
      fontStyle: 'bold'
    });
    gameOverText.setOrigin(0.5, 0.5);

    // Show final score
    const scoreText = this.add.text(cx, cy, `Score: ${this.gameState.score}`, {
      fontSize: '28px',
      color: '#ffffff'
    });
    scoreText.setOrigin(0.5, 0.5);

    // Show high score
    const highScore = parseInt(localStorage.getItem('grain_highscore') || '0');
    const highScoreText = this.add.text(cx, cy + 32, `High Score: ${highScore}`, {
      fontSize: '24px',
      color: '#cccccc'
    });
    highScoreText.setOrigin(0.5, 0.5);

    // Restart instruction
    const restartText = this.add.text(cx, cy + 72, 'Press R to Restart', {
      fontSize: '24px',
      color: '#ffffff'
    });
    restartText.setOrigin(0.5, 0.5);

    // Handle resize to keep centering
    this.scale.on('resize', () => {
      const newCx = this.cameras.main.centerX;
      const newCy = this.cameras.main.centerY;
      gameOverText.setPosition(newCx, newCy - 60);
      scoreText.setPosition(newCx, newCy);
      highScoreText.setPosition(newCx, newCy + 32);
      restartText.setPosition(newCx, newCy + 72);
    });

    // Add restart key
    const restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    restartKey.on('down', () => {
      this.scene.restart();
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
      this.spawnEnemy(spawnX, spawnY);
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

    enemy.sprite.setScale(0.7);
    this.scheduleEnemyFire(enemy.sprite);
    this.enemies.push(enemy);
  }

  // Schedule enemy fire
  private scheduleEnemyFire(enemy: Phaser.GameObjects.Sprite): void {
    enemy.setData('nextFireAt', this.time.now + Phaser.Math.Between(ENEMY_FIRE_MIN_MS, ENEMY_FIRE_MAX_MS));
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

    asteroid.sprite.setScale(scale);
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
  }

  // Shoot laser
  private shoot(): void {
    this.lastShotTime = this.time.now;

    const projectile: Projectile = {
      sprite: this.physics.add.sprite(PLAYER_X + 30, this.player.y, 'playerLaser'),
      x: PLAYER_X + 30,
      y: this.player.y,
    };

    projectile.sprite.setScale(0.8);
    this.projectiles.push(projectile);

    // Auto-timeout bullet after 1.2 seconds to prevent stuck projectiles
    this.time.delayedCall(1200, () => this.spendBullet(projectile.sprite));

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

  // Update single wave system
  private updateWaveSystem(time: number): void {
    const elapsed = time - this.waveStartTime;
    this.gameState.progress = Phaser.Math.Clamp(elapsed / WAVE_DURATION_MS, 0, 1);

    // Check for mission completion
    if (!this.missionEnded && elapsed >= WAVE_DURATION_MS) {
      this.endMission();
    }

    // Emit progress update for HUD
    this.events.emit('hud:progress', this.gameState.progress);
  }

  // End the mission
  private endMission(): void {
    this.missionEnded = true;
    this.spawningEnabled = false;

    // Stop future spawns
    this.stopTimers();

    // Show centered "MISSION COMPLETE" banner
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const title = this.add.text(cx, cy - 20, 'MISSION COMPLETE', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#33ff99'
    }).setOrigin(0.5);

    const sub = this.add.text(cx, cy + 28, 'Press R to Restart', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Update HUD to show "Complete"
    this.gameState.waveIndex = 0; // Special value to indicate completion
    this.updateHUD();

    // Handle restart
    this.input.keyboard?.once('keydown-R', () => this.scene.restart());
  }

  // Start spawn timers for single wave
  private startSpawnTimers(): void {
    this.asteroidTimer = this.time.addEvent({
      delay: Phaser.Math.Between(ASTEROID_SPAWN_MIN_MS, ASTEROID_SPAWN_MAX_MS),
      loop: true,
      callback: () => {
        if (this.spawningEnabled) {
          const spawnX = GAME_WIDTH + 50;
          const spawnY = Phaser.Math.Between(EDGE_PADDING, GAME_HEIGHT - EDGE_PADDING);
          this.spawnAsteroid(spawnX, spawnY);
        }
      }
    });

    this.enemyTimer = this.time.addEvent({
      delay: Phaser.Math.Between(ENEMY_SPAWN_MIN_MS, ENEMY_SPAWN_MAX_MS),
      loop: true,
      callback: () => {
        if (this.spawningEnabled) {
          const spawnX = GAME_WIDTH + 50;
          const spawnY = Phaser.Math.Between(EDGE_PADDING, GAME_HEIGHT - EDGE_PADDING);
          this.spawnEnemy(spawnX, spawnY);
        }
      }
    });
  }

  // Stop all spawn timers
  private stopTimers(): void {
    if (this.asteroidTimer) {
      this.asteroidTimer.remove();
      this.asteroidTimer = null;
    }
    if (this.enemyTimer) {
      this.enemyTimer.remove();
      this.enemyTimer = null;
    }
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
  private awardScore(amount: number, reason: 'asteroid' | 'enemy'): void {
    this.gameState.score += amount;
    this.events.emit('hud:score', this.gameState.score);
  }

  // Idempotent asteroid destruction
  private killAsteroid(ast: Phaser.GameObjects.Sprite): void {
    if (!ast.active || ast.getData('dead')) return;
    ast.setData('dead', true);
    ast.destroy(); // remove from scene
    this.createExplosion(ast.x, ast.y);
    this.gameState.asteroidKills++;
    this.awardScore(100, 'asteroid');
    this.updateHUD();
  }

  // Idempotent enemy destruction
  private killEnemy(e: Phaser.GameObjects.Sprite): void {
    if (!e.active || e.getData('dead')) return;
    e.setData('dead', true);
    e.destroy(); // remove from scene
    this.createExplosion(e.x, e.y);
    this.gameState.enemyKills++;
    this.awardScore(1000, 'enemy');
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
      this.activateShield();
    }

    // Destroy power-up
    powerUp.sprite.destroy();
    const index = this.powerUps.indexOf(powerUp);
    if (index > -1) {
      this.powerUps.splice(index, 1);
    }
  }

  // Activate shield power-up
  private activateShield(): void {
    // Remove existing shield if any
    if (this.activeShield) {
      this.activeShield.sprite.destroy();
    }

    // Create shield ring
    const shieldSprite = this.add.sprite(this.player.sprite.x, this.player.sprite.y, 'pwr_shield');
    shieldSprite.setDepth(10); // Above player
    shieldSprite.setScale(1.5);

    // Add pulsing animation
    this.tweens.add({
      targets: shieldSprite,
      scale: 1.8,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Set shield data
    this.activeShield = {
      sprite: shieldSprite,
      endTime: this.time.now + SHIELD_DURATION_MS
    };

    // Set invulnerability
    this.gameState.invulnerable = true;
    this.gameState.invulnerabilityTime = this.time.now + SHIELD_DURATION_MS;

    // Add blinking effect to player
    this.startPlayerBlink();
  }

  // Start player blinking effect
  private startPlayerBlink(): void {
    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0.3,
      duration: 200,
      yoyo: true,
      repeat: Math.floor(SHIELD_DURATION_MS / 400) - 1, // Blink for duration
      onComplete: () => {
        this.player.sprite.setAlpha(1); // Reset alpha
      }
    });
  }

  // Update power-ups and shield
  private updatePowerUps(): void {
    // Update power-up positions and cleanup offscreen
    this.powerUps = this.powerUps.filter(powerUp => {
      if (powerUp.sprite.x < -50 || powerUp.sprite.y < -50 || powerUp.sprite.y > GAME_HEIGHT + 50) {
        powerUp.sprite.destroy();
        return false;
      }

      // Check collision with player
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        powerUp.sprite.getBounds(),
        this.player.sprite.getBounds()
      )) {
        this.handlePowerUpPickup(powerUp);
        return false;
      }

      return true;
    });

    // Update shield position and expiration
    if (this.activeShield) {
      this.activeShield.sprite.setPosition(this.player.sprite.x, this.player.sprite.y);

      if (this.time.now >= this.activeShield.endTime) {
        this.activeShield.sprite.destroy();
        this.activeShield = undefined;
      }
    }
  }

}
