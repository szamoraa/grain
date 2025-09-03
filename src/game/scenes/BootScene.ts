import Phaser from 'phaser';
import { INTRO } from '../config';

// Boot scene - handles initial loading and setup
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Generate procedural textures for the game
    this.createProceduralTextures();

    // Create a simple loading bar
    const loadingBar = this.add.graphics();
    loadingBar.fillStyle(0x00ff00, 1);
    loadingBar.fillRect(this.cameras.main.width / 2 - 100, this.cameras.main.height / 2, 200, 20);

    // Since we're generating textures procedurally, we don't need actual file loading
    // Transition to intro scene if enabled, otherwise menu
    this.time.delayedCall(100, () => {
      console.log("🏁 BootScene complete, transitioning to:", INTRO.enabled ? 'IntroScene' : 'MenuScene');
      loadingBar.destroy();
      if (INTRO.enabled) {
        this.scene.start('IntroScene');
      } else {
        this.scene.start('MenuScene');
      }
    });
  }

  private createProceduralTextures(): void {
    // Create player saucer texture
    this.createSaucerTexture();

    // Create enemy saucer texture
    this.createEnemySaucerTexture();

    // Create asteroid texture
    this.createAsteroidTexture();

    // Create projectile texture
    this.createProjectileTexture();

    // Create particle textures
    this.createParticleTextures();

    // Create starfield textures
    this.createStarfieldTextures();

    // Create Stinger enemy texture
    this.createStingerTexture();
  }

  private createSaucerTexture(): void {
    const graphics = this.add.graphics();

    // Main saucer body (ellipse)
    graphics.fillStyle(0x87ceeb); // Sky blue
    graphics.fillEllipse(25, 15, 40, 20);

    // Dome on top
    graphics.fillStyle(0xa0d0ff); // Lighter blue
    graphics.fillEllipse(25, 10, 30, 15);

    // Cockpit window
    graphics.fillStyle(0x000080); // Dark blue
    graphics.fillEllipse(25, 12, 15, 8);

    // Generate texture from graphics
    graphics.generateTexture('saucer', 50, 30);
    graphics.destroy();
  }

  private createEnemySaucerTexture(): void {
    const graphics = this.add.graphics();

    // Simple enemy saucer (darker, more angular)
    graphics.fillStyle(0x8b0000); // Dark red
    graphics.fillEllipse(20, 12, 35, 18);

    // Simple dome
    graphics.fillStyle(0xb22222); // Firebrick
    graphics.fillEllipse(20, 8, 25, 12);

    // Generate texture
    graphics.generateTexture('enemy-saucer', 40, 24);
    graphics.destroy();
  }

  private createAsteroidTexture(): void {
    const graphics = this.add.graphics();

    // Simple asteroid shape
    graphics.fillStyle(0x696969); // Dim gray
    graphics.fillEllipse(15, 15, 25, 20);

    // Add some irregularity
    graphics.fillStyle(0x808080); // Gray
    graphics.fillCircle(12, 18, 8);
    graphics.fillCircle(22, 12, 6);

    // Generate texture
    graphics.generateTexture('asteroid', 30, 30);
    graphics.destroy();
  }

  private createProjectileTexture(): void {
    const graphics = this.add.graphics();

    // Simple blue projectile
    graphics.fillStyle(0x00bfff); // Deep sky blue
    graphics.fillRect(0, 2, 8, 4);

    // Bright tip
    graphics.fillStyle(0x87ceeb); // Sky blue
    graphics.fillRect(6, 1, 2, 6);

    // Generate texture
    graphics.generateTexture('projectile', 8, 8);
    graphics.destroy();
  }

  private createParticleTextures(): void {
    // Explosion particles
    const explosionGraphics = this.add.graphics();
    explosionGraphics.fillStyle(0xffa500); // Orange
    explosionGraphics.fillCircle(4, 4, 4);
    explosionGraphics.generateTexture('explosion-particle', 8, 8);
    explosionGraphics.destroy();

    // Thruster particles
    const thrusterGraphics = this.add.graphics();
    thrusterGraphics.fillStyle(0x00ffff); // Cyan
    thrusterGraphics.fillCircle(3, 3, 3);
    thrusterGraphics.generateTexture('thruster-particle', 6, 6);
    thrusterGraphics.destroy();

    // Muzzle flash
    const muzzleGraphics = this.add.graphics();
    muzzleGraphics.fillStyle(0xffffff); // White
    muzzleGraphics.fillCircle(2, 2, 2);
    muzzleGraphics.generateTexture('muzzle-flash', 4, 4);
    muzzleGraphics.destroy();
  }

  private createStarfieldTextures(): void {
    // Slow stars (background layer)
    const slowGraphics = this.add.graphics();
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 1600;
      const y = Math.random() * 720;
      const size = Math.random() * 1.5 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;
      slowGraphics.fillStyle(0xffffff, alpha);
      slowGraphics.fillCircle(x, y, size);
    }
    slowGraphics.generateTexture('starfield-slow', 1600, 720);
    slowGraphics.destroy();

    // Fast stars (foreground layer)
    const fastGraphics = this.add.graphics();
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 1600;
      const y = Math.random() * 720;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.6 + 0.4;
      fastGraphics.fillStyle(0xffffff, alpha);
      fastGraphics.fillCircle(x, y, size);
    }
    fastGraphics.generateTexture('starfield-fast', 1600, 720);
    fastGraphics.destroy();

    // ENEMY LASER (red) — 18x6 px with bright core for visibility
    const enemyLaserGraphics = this.add.graphics({ x: 0, y: 0 });
    enemyLaserGraphics.fillStyle(0x6a0000, 1);
    enemyLaserGraphics.fillRoundedRect(0, 0, 18, 6, 3);
    enemyLaserGraphics.fillStyle(0xff3b3b, 1);
    enemyLaserGraphics.fillRoundedRect(2, 1, 14, 4, 2);
    enemyLaserGraphics.generateTexture('enemyLaser', 18, 6);
    enemyLaserGraphics.destroy();

    // SHIELD POWER-UP (cyan ring)
    const shieldGraphics = this.add.graphics({ x: 0, y: 0 });
    shieldGraphics.lineStyle(3, 0x53e3ff, 1);
    shieldGraphics.strokeCircle(12, 12, 10);
    shieldGraphics.generateTexture('pwr_shield', 24, 24);
    shieldGraphics.destroy();

    // HEART POWER-UP (+1 life) - Simple cross shape
    const heartGraphics = this.add.graphics({ x: 0, y: 0 });
    heartGraphics.fillStyle(0xff6b9d, 1);

    // Simple heart shape using basic shapes
    // Top curves
    heartGraphics.fillCircle(8, 10, 5);
    heartGraphics.fillCircle(16, 10, 5);

    // Bottom triangle
    heartGraphics.fillTriangle(6, 12, 18, 12, 12, 22);

    heartGraphics.generateTexture('pwr_heart', 24, 24);
    heartGraphics.destroy();

    // AMMO ALERT GLYPH (center exclamation)
    {
      const alertGraphics = this.add.graphics({ x: 0, y: 0 });
      alertGraphics.fillStyle(0xE9F2FF, 1);
      // Vertical line
      alertGraphics.fillRect(14, 6, 4, 12);
      // Dot at bottom
      alertGraphics.fillRect(14, 22, 4, 4);
      alertGraphics.generateTexture('hud_alert', 32, 32);
      alertGraphics.destroy();
    }

    // PLAYER LASER (blue) — if not already present
    if (!this.textures.exists("playerLaser")) {
      const playerLaserGraphics = this.add.graphics({ x: 0, y: 0 });
      playerLaserGraphics.fillStyle(0x002a6a, 1);
      playerLaserGraphics.fillRoundedRect(0, 0, 18, 6, 3);
      playerLaserGraphics.fillStyle(0x53a8ff, 1);
      playerLaserGraphics.fillRoundedRect(2, 1, 14, 4, 2);
      playerLaserGraphics.generateTexture("playerLaser", 18, 6);
      playerLaserGraphics.destroy();
    }
  }

  private createStingerTexture(): void {
    const graphics = this.add.graphics();

    // Yellow Stinger - smaller, more angular than red enemy
    graphics.fillStyle(0xffff00); // Bright yellow
    graphics.fillEllipse(20, 12, 28, 16); // Smaller than red enemy (35x18)

    // Darker yellow accent
    graphics.fillStyle(0xcccc00); // Darker yellow
    graphics.fillEllipse(20, 8, 20, 10);

    // Generate texture
    graphics.generateTexture('stinger-saucer', 40, 24);
    graphics.destroy();
  }
}
