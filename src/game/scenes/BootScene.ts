import Phaser from 'phaser';

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
    // Just transition to the main scene immediately
    this.time.delayedCall(100, () => {
      loadingBar.destroy();
      this.scene.start('SaucerScene');
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

    // Enemy saucer (darker, more angular)
    graphics.fillStyle(0x8b0000); // Dark red
    graphics.fillEllipse(20, 12, 35, 18);

    // Angular dome
    graphics.fillStyle(0xb22222); // Firebrick
    graphics.fillEllipse(20, 8, 25, 12);

    // Generate texture
    graphics.generateTexture('enemy-saucer', 40, 24);
    graphics.destroy();
  }

  private createAsteroidTexture(): void {
    const graphics = this.add.graphics();

    // Irregular asteroid shape
    graphics.fillStyle(0x696969); // Dim gray
    graphics.fillEllipse(15, 15, 25, 20);

    // Add some irregularity with smaller circles
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

    // Add a bright tip
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
}
