// TODO(santiago): re-enable halftone after art pass

import Phaser from 'phaser';
import { sfx } from '../Sfx';

// Game tuning constants for Level 1
const PLAYER_X = 140;             // Fixed X anchor for player
const PLAYER_SPEED = 380;         // Vertical speed in px/s
const LASER_COOLDOWN_MS = 140;    // Laser fire rate
const LASER_SPEED = 900;          // Laser projectile speed

const SPAWN_MIN_MS = 800;         // Minimum spawn delay
const SPAWN_MAX_MS = 1100;        // Maximum spawn delay
const ASTEROID_CHANCE = 0.7;      // Chance of spawning asteroid vs enemy

const INVULN_MS = 1000;           // Invulnerability duration after hit
const START_LIVES = 3;            // Starting lives

const STAR_SLOW_SPEED = 24;       // Background star scroll speed
const STAR_FAST_SPEED = 48;       // Foreground star scroll speed

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 576;

// Asteroid size variations
const ASTEROID_SCALES = [0.6, 1.0, 1.4];
const ASTEROID_BASE_SPEED = 210;     // px/s baseline
const ASTEROID_SPEED_VARIANCE = 80;  // ±

// Enemy shooting
const ENEMY_SHOT_MIN_MS = 800;
const ENEMY_SHOT_MAX_MS = 1800;
const ENEMY_LASER_SPEED = 700;

// Scoring
const POINT_ASTEROID = 100;
const POINT_ENEMY = 1000;

// Simple game state
interface GameState {
  lives: number;
  enemyKills: number;
  asteroidKills: number;
  score: number;
  gameOver: boolean;
  invulnerable: boolean;
  invulnerabilityTime: number;
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

// Enemy laser
interface EnemyLaser {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
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
  };

  // Game entities
  player!: Player;
  enemies: Enemy[] = [];
  asteroids: Asteroid[] = [];
  projectiles: Projectile[] = [];
  enemyLasers: EnemyLaser[] = [];

  // Background
  starfieldSlow!: Phaser.GameObjects.TileSprite;
  starfieldFast!: Phaser.GameObjects.TileSprite;

  // Input
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasdKeys!: { [key: string]: Phaser.Input.Keyboard.Key };
  spaceKey!: Phaser.Input.Keyboard.Key;

  // Timers
  spawnerTimer?: Phaser.Time.TimerEvent;
  lastShotTime: number = 0;

  constructor() {
    super({ key: 'SaucerScene' });
  }

  create(): void {
    // Initialize game systems
    this.initializeBackground();
    this.initializePlayer();
    this.setupInput();

    // Start spawning enemies/asteroids
    this.startSpawner();

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
    this.updateEnemyLasers(delta);

    // Handle collisions
    this.handleCollisions();

    // Update invulnerability
    this.updateInvulnerability(delta);
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
      if (this.time.now >= enemy.sprite.getData('nextFireAt')) {
        this.fireEnemyLaser(enemy);
        enemy.sprite.setData('nextFireAt', this.time.now + Phaser.Math.Between(ENEMY_SHOT_MIN_MS, ENEMY_SHOT_MAX_MS));
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
        projectile.sprite.destroy();
        this.projectiles.splice(index, 1);
      }
    });
  }

  // Handle collisions
  private handleCollisions(): void {
    // Projectiles vs Enemies
    this.projectiles.forEach((projectile, pIndex) => {
      this.enemies.forEach((enemy, eIndex) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          projectile.sprite.getBounds(),
          enemy.sprite.getBounds()
        )) {
          // Destroy enemy
          this.createExplosion(enemy.sprite.x, enemy.sprite.y);
          enemy.sprite.destroy();
          this.enemies.splice(eIndex, 1);

          // Destroy projectile
          projectile.sprite.destroy();
          this.projectiles.splice(pIndex, 1);

          // Update stats
          this.gameState.enemyKills++;
          this.addScore(POINT_ENEMY);
          sfx.boom();
          this.updateHUD();
        }
      });
    });

    // Projectiles vs Asteroids
    this.projectiles.forEach((projectile, pIndex) => {
      this.asteroids.forEach((asteroid, aIndex) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          projectile.sprite.getBounds(),
          asteroid.sprite.getBounds()
        )) {
          // Destroy asteroid
          this.createExplosion(asteroid.sprite.x, asteroid.sprite.y);
          asteroid.sprite.destroy();
          this.asteroids.splice(aIndex, 1);

          // Destroy projectile
          projectile.sprite.destroy();
          this.projectiles.splice(pIndex, 1);

          // Update stats
          this.gameState.asteroidKills++;
          this.addScore(POINT_ASTEROID);
          sfx.boom();
          this.updateHUD();
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

    // Enemy lasers vs Player
    if (!this.gameState.invulnerable) {
      this.enemyLasers.forEach((laser, index) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          this.player.sprite.getBounds(),
          laser.sprite.getBounds()
        )) {
          // Destroy enemy laser
          laser.sprite.destroy();
          this.enemyLasers.splice(index, 1);

          // Hit player
          this.playerHit();
        }
      });
    }
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

    // Stop spawner
    if (this.spawnerTimer) {
      this.spawnerTimer.destroy();
    }

    // Show game over text
    const gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff0000'
    });
    gameOverText.setOrigin(0.5);

    // Show final score
    const scoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, `Score: ${this.gameState.score}`, {
      fontSize: '24px',
      color: '#ffffff'
    });
    scoreText.setOrigin(0.5);

    // Show high score
    const highScore = parseInt(localStorage.getItem('grain_highscore') || '0');
    const highScoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, `High Score: ${highScore}`, {
      fontSize: '20px',
      color: '#cccccc'
    });
    highScoreText.setOrigin(0.5);

    const restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'Press R to Restart', {
      fontSize: '24px',
      color: '#ffffff'
    });
    restartText.setOrigin(0.5);

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
  private startSpawner(): void {
    this.spawnerTimer = this.time.addEvent({
      delay: Phaser.Math.Between(SPAWN_MIN_MS, SPAWN_MAX_MS),
      callback: this.spawnEntity,
      callbackScope: this,
      loop: true
    });
  }

  // Spawn random entity
  private spawnEntity(): void {
    const spawnX = GAME_WIDTH + 50;
    const spawnY = Phaser.Math.Between(50, GAME_HEIGHT - 50);

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
      speed: Phaser.Math.Between(80, 120),
      wobbleOffset: Math.random() * Math.PI * 2,
    };

    enemy.sprite.setScale(0.7);
    enemy.sprite.setData('nextFireAt', this.time.now + Phaser.Math.Between(ENEMY_SHOT_MIN_MS, ENEMY_SHOT_MAX_MS));
    this.enemies.push(enemy);
  }

  // Spawn asteroid with variable size
  private spawnAsteroid(x: number, y: number): void {
    const scale = Phaser.Utils.Array.GetRandom(ASTEROID_SCALES);
    const speed = ASTEROID_BASE_SPEED - (scale - 1.0) * 60 + Phaser.Math.Between(-ASTEROID_SPEED_VARIANCE, ASTEROID_SPEED_VARIANCE);

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
      sprite: this.physics.add.sprite(PLAYER_X + 30, this.player.y, 'projectile'),
      x: PLAYER_X + 30,
      y: this.player.y,
    };

    projectile.sprite.setScale(0.8);
    this.projectiles.push(projectile);

    sfx.laser();
  }

  // Update enemy lasers
  private updateEnemyLasers(delta: number): void {
    const dt = delta / 1000;

    this.enemyLasers.forEach((laser, index) => {
      laser.x -= ENEMY_LASER_SPEED * dt;
      laser.sprite.x = laser.x;

      // Remove if off-screen
      if (laser.x < -50) {
        laser.sprite.destroy();
        this.enemyLasers.splice(index, 1);
      }
    });
  }

  // Fire enemy laser
  private fireEnemyLaser(enemy: Enemy): void {
    const laser: EnemyLaser = {
      sprite: this.physics.add.sprite(enemy.x - 30, enemy.y, 'projectile'),
      x: enemy.x - 30,
      y: enemy.y,
    };

    laser.sprite.setScale(0.6);
    laser.sprite.setTint(0xff0000); // Red tint for enemy lasers
    this.enemyLasers.push(laser);

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

  // Update HUD via custom event
  private updateHUD(): void {
    const event: CustomEvent = new CustomEvent('gameEvent', {
      detail: {
        type: 'update_hud',
        data: {
          lives: this.gameState.lives,
          level: 1, // Always Level 1
          enemyKills: this.gameState.enemyKills,
          asteroidKills: this.gameState.asteroidKills,
          score: this.gameState.score,
          gameOver: this.gameState.gameOver,
        }
      }
    });
    window.dispatchEvent(event);
  }

}
