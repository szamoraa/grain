import Phaser from 'phaser';
import {
  GameState,
  Player,
  EnemySaucer,
  Asteroid,
  Projectile,
  ParticleSystem,
  GameConfig,
  TouchControls,
  SaucerScene as ISaucerScene,
  GameEventData
} from '../types';
import { HalftonePipeline } from '../pipelines/HalftonePipeline';
import { sfx } from '../Sfx';

// Game configuration constants - tweak these for balancing
const GAME_CONFIG: GameConfig = {
  WIDTH: 360,
  HEIGHT: 640,
  SCROLL_SPEED_BASE: 2.0, // Base scroll speed
  BOOST_MULT: 1.5, // Boost multiplier
  PLAYER_ACCEL: 0.8, // Player acceleration
  BULLET_COOLDOWN_MS: 167, // ~6 shots per second
  INVULN_MS: 2000, // 2 seconds invulnerability
  LEVEL_TIME_S: 45, // Level duration in seconds
  KILLS_FOR_LEVEL: 15, // Kills needed to advance level
};

// Main game scene
export class SaucerScene extends Phaser.Scene implements ISaucerScene {
  // Game state
  gameState: GameState = {
    lives: 3,
    level: 1,
    score: 0,
    enemyKills: 0,
    asteroidKills: 0,
    gameOver: false,
    invulnerable: false,
    invulnerabilityTime: 0,
  };

  // Game entities
  player!: Player;
  enemies: EnemySaucer[] = [];
  asteroids: Asteroid[] = [];
  projectiles: Projectile[] = [];

  // Visual elements
  starfield: Phaser.GameObjects.TileSprite[] = [];
  particles: ParticleSystem[] = [];

  // Effects and controls
  halftone?: Phaser.Renderer.WebGL.Pipelines.PostFXPipeline;
  touchControls: TouchControls = {
    isDragging: false,
    dragStartY: 0,
    currentY: 0,
    isBoosting: false,
    lastShootTime: 0,
  };

  // Timers and counters
  spawnerTimer?: Phaser.Time.TimerEvent;
  levelStartTime: number = 0;
  levelBannerTimer?: Phaser.Time.TimerEvent;
  invulnFlashTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'SaucerScene' });
  }

  create(): void {
    // Initialize game systems
    this.initializeStarfield();
    this.initializeParticles();
    this.initializePlayer();
    this.setupInput();
    this.setupHalftoneEffect();

    // Start game loop
    this.startSpawner();
    this.levelStartTime = this.time.now;

    // Send initial HUD update
    this.updateHUD();
  }

  update(time: number, delta: number): void {
    if (this.gameState.gameOver) return;

    // Update game systems
    this.updateStarfield();
    this.updatePlayer(delta);
    this.updateEnemies(delta);
    this.updateAsteroids(delta);
    this.updateProjectiles(delta);
    this.updateParticles();

    // Handle collisions
    this.handleCollisions();

    // Update game state
    this.updateInvulnerability(delta);
    this.checkLevelProgression(time);
  }

  // Initialize starfield background
  private initializeStarfield(): void {
    // Create three layers of starfield for parallax effect
    this.starfield = [
      // Background layer (slow moving, small stars)
      this.add.tileSprite(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, 'starfield-bg')
        .setOrigin(0, 0)
        .setTint(0xffffff)
        .setAlpha(0.8),

      // Mid layer (medium speed, medium stars)
      this.add.tileSprite(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, 'starfield-mid')
        .setOrigin(0, 0)
        .setTint(0xffffff)
        .setAlpha(0.6),

      // Foreground layer (fast moving, large stars)
      this.add.tileSprite(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, 'starfield-fg')
        .setOrigin(0, 0)
        .setTint(0xffffff)
        .setAlpha(0.4),
    ];

    // Generate starfield textures procedurally
    this.generateStarfieldTextures();
  }

  private generateStarfieldTextures(): void {
    // Background stars
    const bgGraphics = this.add.graphics();
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * GAME_CONFIG.WIDTH;
      const y = Math.random() * GAME_CONFIG.HEIGHT;
      const size = Math.random() * 1.5 + 0.5;
      bgGraphics.fillStyle(0xffffff, Math.random() * 0.8 + 0.2);
      bgGraphics.fillCircle(x, y, size);
    }
    bgGraphics.generateTexture('starfield-bg', GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    bgGraphics.destroy();

    // Mid layer stars
    const midGraphics = this.add.graphics();
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * GAME_CONFIG.WIDTH;
      const y = Math.random() * GAME_CONFIG.HEIGHT;
      const size = Math.random() * 2 + 1;
      midGraphics.fillStyle(0xffffff, Math.random() * 0.6 + 0.4);
      midGraphics.fillCircle(x, y, size);
    }
    midGraphics.generateTexture('starfield-mid', GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    midGraphics.destroy();

    // Foreground stars
    const fgGraphics = this.add.graphics();
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * GAME_CONFIG.WIDTH;
      const y = Math.random() * GAME_CONFIG.HEIGHT;
      const size = Math.random() * 3 + 1.5;
      fgGraphics.fillStyle(0xffffff, Math.random() * 0.9 + 0.1);
      fgGraphics.fillCircle(x, y, size);
    }
    fgGraphics.generateTexture('starfield-fg', GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    fgGraphics.destroy();
  }

  // Initialize particle systems
  private initializeParticles(): void {
    // Thruster particles
    const thrusterEmitter = this.add.particles(0, 0, 'thruster-particle', {
      speed: { min: 50, max: 100 },
      scale: { start: 1, end: 0 },
      lifespan: 300,
      alpha: { start: 1, end: 0 },
      quantity: 2,
    });

    // Explosion particles
    const explosionEmitter = this.add.particles(0, 0, 'explosion-particle', {
      speed: { min: 20, max: 100 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      alpha: { start: 1, end: 0 },
      quantity: 8,
    });

    // Muzzle flash
    const muzzleEmitter = this.add.particles(0, 0, 'muzzle-flash', {
      speed: { min: 10, max: 30 },
      scale: { start: 1, end: 0 },
      lifespan: 100,
      alpha: { start: 1, end: 0 },
      quantity: 3,
    });

    this.particles = [
      { emitter: thrusterEmitter, texture: 'thruster-particle' },
      { emitter: explosionEmitter, texture: 'explosion-particle' },
      { emitter: muzzleEmitter, texture: 'muzzle-flash' },
    ];
  }

  // Initialize player entity
  private initializePlayer(): void {
    this.player = {
      sprite: this.physics.add.sprite(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 100, 'saucer'),
      velocity: new Phaser.Math.Vector2(0, 0),
      isBoosting: false,
      lastShotTime: 0,
    };

    this.player.sprite.setCollideWorldBounds(true);
    this.player.sprite.setScale(0.8);

    // Set up thruster particle emitter to follow player
    this.particles[0].emitter.startFollow(this.player.sprite, -25, 0);
  }

  // Set up input handling
  private setupInput(): void {
    // Keyboard input
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.player.velocity.y = -GAME_CONFIG.PLAYER_ACCEL;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.player.velocity.y = GAME_CONFIG.PLAYER_ACCEL;
          break;
        case 'Space':
          this.shoot();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyX':
          this.startBoost();
          break;
      }
    });

    this.input.keyboard!.on('keyup', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'KeyW':
        case 'KeyS':
          this.player.velocity.y = 0;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyX':
          this.stopBoost();
          break;
      }
    });

    // Touch input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < GAME_CONFIG.WIDTH / 2) {
        // Left side - start dragging for movement
        this.touchControls.isDragging = true;
        this.touchControls.dragStartY = pointer.y;
        this.touchControls.currentY = pointer.y;
      } else {
        // Right side - shoot or boost
        if (this.touchControls.isBoosting) {
          this.stopBoost();
        } else {
          this.shoot();
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.touchControls.isDragging) {
        this.touchControls.currentY = pointer.y;
        const deltaY = this.touchControls.currentY - this.touchControls.dragStartY;
        this.player.velocity.y = Phaser.Math.Clamp(deltaY * 0.01, -GAME_CONFIG.PLAYER_ACCEL, GAME_CONFIG.PLAYER_ACCEL);
      }
    });

    this.input.on('pointerup', () => {
      if (this.touchControls.isDragging) {
        this.touchControls.isDragging = false;
        this.player.velocity.y = 0;
      }
    });
  }

  // Set up halftone post-processing effect
  private setupHalftoneEffect(): void {
    if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.halftone = this.game.renderer.addPipeline('Halftone', new HalftonePipeline(this.game));
      this.cameras.main.setRenderToTexture(this.halftone);
    }
  }

  // Update starfield scrolling
  private updateStarfield(): void {
    const scrollSpeed = GAME_CONFIG.SCROLL_SPEED_BASE * (1 + (this.gameState.level - 1) * 0.2);

    // Different scroll speeds for parallax effect
    this.starfield[0].tilePositionX += scrollSpeed * 0.5; // Background
    this.starfield[1].tilePositionX += scrollSpeed * 0.8; // Mid
    this.starfield[2].tilePositionX += scrollSpeed * 1.2; // Foreground

    // Add slight vertical drift to mid and foreground layers
    this.starfield[1].tilePositionY += Math.sin(this.time.now * 0.001) * 0.1;
    this.starfield[2].tilePositionY += Math.sin(this.time.now * 0.002) * 0.2;
  }

  // Update player movement and physics
  private updatePlayer(_delta: number): void {
    // Apply velocity
    this.player.sprite.x += this.player.velocity.x;
    this.player.sprite.y += this.player.velocity.y;

    // Apply auto-forward movement
    const forwardSpeed = GAME_CONFIG.SCROLL_SPEED_BASE * (this.player.isBoosting ? GAME_CONFIG.BOOST_MULT : 1);
    this.player.sprite.x += forwardSpeed;

    // Apply drag to smooth movement
    this.player.velocity.x *= 0.95;
    this.player.velocity.y *= 0.95;

    // Update thruster particles
    this.particles[0].emitter.setVisible(this.player.isBoosting);

    // Handle invulnerability flashing
    if (this.gameState.invulnerable) {
      this.player.sprite.setAlpha(Math.sin(this.time.now * 0.02) > 0 ? 0.3 : 1);
    } else {
      this.player.sprite.setAlpha(1);
    }
  }

  // Update enemy saucers
  private updateEnemies(_delta: number): void {
    this.enemies.forEach((enemy, index) => {
      // Simple AI: steer toward player with delay
      const direction = new Phaser.Math.Vector2(
        this.player.sprite.x - enemy.sprite.x,
        this.player.sprite.y - enemy.sprite.y
      ).normalize();

      enemy.velocity.x += direction.x * 0.02;
      enemy.velocity.y += direction.y * 0.02;

      // Apply velocity
      enemy.sprite.x += enemy.velocity.x;
      enemy.sprite.y += enemy.velocity.y;

      // Apply drag
      enemy.velocity.x *= 0.98;
      enemy.velocity.y *= 0.98;

      // Remove enemies that go off-screen
      if (enemy.sprite.x < -50 || enemy.sprite.x > GAME_CONFIG.WIDTH + 50 ||
          enemy.sprite.y < -50 || enemy.sprite.y > GAME_CONFIG.HEIGHT + 50) {
        enemy.sprite.destroy();
        this.enemies.splice(index, 1);
      }
    });
  }

  // Update asteroids
  private updateAsteroids(_delta: number): void {
    this.asteroids.forEach((asteroid, index) => {
      // Apply velocity
      asteroid.sprite.x += asteroid.velocity.x;
      asteroid.sprite.y += asteroid.velocity.y;

      // Remove asteroids that go off-screen
      if (asteroid.sprite.x < -50) {
        asteroid.sprite.destroy();
        this.asteroids.splice(index, 1);
      }
    });
  }

  // Update projectiles
  private updateProjectiles(_delta: number): void {
    this.projectiles.forEach((projectile, index) => {
      // Apply velocity
      projectile.sprite.x += projectile.velocity.x;
      projectile.sprite.y += projectile.velocity.y;

      // Remove projectiles that go off-screen
      if (projectile.sprite.x > GAME_CONFIG.WIDTH + 50) {
        projectile.sprite.destroy();
        this.projectiles.splice(index, 1);
      }
    });
  }

  // Update particle systems
  private updateParticles(): void {
    // Particles are automatically updated by Phaser
  }

  // Handle all collision detection
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

          // Update game state
          this.gameState.enemyKills++;
          this.gameState.score += 100;
          sfx.play('explosion');

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

          // Update game state
          this.gameState.asteroidKills++;
          this.gameState.score += 50;
          sfx.play('hit');

          this.updateHUD();
        }
      });
    });

    // Player vs Enemies/Asteroids (only if not invulnerable)
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
  }

  // Handle player taking damage
  private playerHit(): void {
    this.gameState.lives--;
    this.gameState.invulnerable = true;
    this.gameState.invulnerabilityTime = GAME_CONFIG.INVULN_MS;

    // Screen shake effect
    this.cameras.main.shake(200, 0.01);

    sfx.play('hit');
    this.updateHUD();

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  // Handle game over
  private gameOver(): void {
    this.gameState.gameOver = true;

    // Stop all timers
    if (this.spawnerTimer) {
      this.spawnerTimer.destroy();
    }

    // Create game over overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // Game over text
    const gameOverText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 100,
      'GAME OVER', { fontSize: '32px', color: '#ffffff' });
    gameOverText.setOrigin(0.5);

    // Stats
    const statsText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 - 50,
      `Ships: ${this.gameState.enemyKills}\nRocks: ${this.gameState.asteroidKills}\nHighest Level: ${this.gameState.level}`,
      { fontSize: '18px', color: '#ffffff', align: 'center' });
    statsText.setOrigin(0.5);

    // Restart button
    const restartButton = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 50,
      'RESTART', { fontSize: '24px', color: '#00ff00' });
    restartButton.setOrigin(0.5);
    restartButton.setInteractive();
    restartButton.on('pointerdown', () => this.restartGame());

    // Back to menu button
    const backButton = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 100,
      'BACK TO MENU', { fontSize: '20px', color: '#ffffff' });
    backButton.setOrigin(0.5);
    backButton.setInteractive();
    backButton.on('pointerdown', () => window.location.href = '/');

    // Send game over event to React HUD
    const event: GameEventData = { type: 'game_over' };
    window.dispatchEvent(new CustomEvent('gameEvent', { detail: event }));
  }

  // Restart the game
  private restartGame(): void {
    // Reset game state
    this.gameState = {
      lives: 3,
      level: 1,
      score: 0,
      enemyKills: 0,
      asteroidKills: 0,
      gameOver: false,
      invulnerable: false,
      invulnerabilityTime: 0,
    };

    // Destroy all entities
    this.enemies.forEach(e => e.sprite.destroy());
    this.asteroids.forEach(a => a.sprite.destroy());
    this.projectiles.forEach(p => p.sprite.destroy());

    this.enemies = [];
    this.asteroids = [];
    this.projectiles = [];

    // Reset player position
    this.player.sprite.setPosition(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 100);

    // Restart systems
    this.startSpawner();
    this.levelStartTime = this.time.now;

    this.updateHUD();
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

  // Check for level progression
  private checkLevelProgression(time: number): void {
    const timeSinceLevelStart = (time - this.levelStartTime) / 1000;
    const totalKills = this.gameState.enemyKills + this.gameState.asteroidKills;

    if (timeSinceLevelStart >= GAME_CONFIG.LEVEL_TIME_S ||
        totalKills >= this.gameState.level * GAME_CONFIG.KILLS_FOR_LEVEL) {
      this.advanceLevel();
    }
  }

  // Advance to next level
  private advanceLevel(): void {
    this.gameState.level++;

    // Show level banner
    const banner = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2,
      `LEVEL ${this.gameState.level}`, { fontSize: '48px', color: '#00ff00' });
    banner.setOrigin(0.5);

    // Fade out banner after 2 seconds
    this.tweens.add({
      targets: banner,
      alpha: 0,
      duration: 2000,
      onComplete: () => banner.destroy()
    });

    sfx.play('levelup');
    this.levelStartTime = this.time.now;

    // Send level up event to React HUD
    const event: GameEventData = { type: 'level_up', data: { level: this.gameState.level } };
    window.dispatchEvent(new CustomEvent('gameEvent', { detail: event }));

    this.updateHUD();
  }

  // Start enemy/asteroid spawner
  private startSpawner(): void {
    this.spawnerTimer = this.time.addEvent({
      delay: Phaser.Math.Between(500, 900),
      callback: this.spawnEntity,
      callbackScope: this,
      loop: true
    });
  }

  // Spawn random entity
  private spawnEntity(): void {
    const spawnX = GAME_CONFIG.WIDTH + 50;
    const spawnY = Phaser.Math.Between(50, GAME_CONFIG.HEIGHT - 50);

    // Determine what to spawn based on level
    const enemyChance = Math.min(0.4 + (this.gameState.level - 1) * 0.1, 0.8);
    const isEnemy = Math.random() < enemyChance;

    if (isEnemy) {
      this.spawnEnemy(spawnX, spawnY);
    } else {
      this.spawnAsteroid(spawnX, spawnY);
    }
  }

  // Spawn enemy saucer
  private spawnEnemy(x: number, y: number): void {
    const enemy: EnemySaucer = {
      sprite: this.physics.add.sprite(x, y, 'enemy-saucer'),
      velocity: new Phaser.Math.Vector2(-GAME_CONFIG.SCROLL_SPEED_BASE * 0.5, 0),
      targetPosition: new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y),
      steeringDelay: Phaser.Math.Between(500, 1500),
    };

    enemy.sprite.setScale(0.7);
    this.enemies.push(enemy);
  }

  // Spawn asteroid
  private spawnAsteroid(x: number, y: number): void {
    const asteroid: Asteroid = {
      sprite: this.physics.add.sprite(x, y, 'asteroid'),
      velocity: new Phaser.Math.Vector2(
        -GAME_CONFIG.SCROLL_SPEED_BASE - Math.random() * 2,
        (Math.random() - 0.5) * 1
      ),
    };

    asteroid.sprite.setScale(0.6 + Math.random() * 0.4);
    this.asteroids.push(asteroid);
  }

  // Create explosion effect
  private createExplosion(x: number, y: number): void {
    this.particles[1].emitter.explode(8, x, y);
  }

  // Shoot projectile
  private shoot(): void {
    const now = this.time.now;
    if (now - this.player.lastShotTime < GAME_CONFIG.BULLET_COOLDOWN_MS) return;

    this.player.lastShotTime = now;

    const projectile: Projectile = {
      sprite: this.physics.add.sprite(
        this.player.sprite.x + 30,
        this.player.sprite.y,
        'projectile'
      ),
      velocity: new Phaser.Math.Vector2(8, 0),
      damage: 1,
    };

    projectile.sprite.setScale(0.8);
    this.projectiles.push(projectile);

    // Muzzle flash effect
    this.particles[2].emitter.explode(3, this.player.sprite.x + 30, this.player.sprite.y);

    sfx.play('laser');
  }

  // Start boost
  private startBoost(): void {
    this.player.isBoosting = true;
    this.touchControls.isBoosting = true;
  }

  // Stop boost
  private stopBoost(): void {
    this.player.isBoosting = false;
    this.touchControls.isBoosting = false;
  }

  // Update HUD via custom event
  private updateHUD(): void {
    const event: GameEventData = {
      type: 'update_hud',
      data: {
        lives: this.gameState.lives,
        level: this.gameState.level,
        enemyKills: this.gameState.enemyKills,
        asteroidKills: this.gameState.asteroidKills,
        gameOver: this.gameState.gameOver,
      }
    };
    window.dispatchEvent(new CustomEvent('gameEvent', { detail: event }));
  }
}
