import Phaser from 'phaser';

export class HUDLayer extends Phaser.GameObjects.Container {
  private livesIcons: Phaser.GameObjects.Sprite[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private progressBarTrack!: Phaser.GameObjects.Graphics;
  private progressBarFill!: Phaser.GameObjects.Graphics;
  private progressBarGlow!: Phaser.GameObjects.Graphics;
  private progressWidth = 280;
  private progressHeight = 6;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    // Pin to camera and set high depth
    this.setScrollFactor(0);
    this.setDepth(10000);

    this.createLivesIcons();
    this.createScoreCapsule();
    this.createProgressBar();

    scene.add.existing(this);
  }

  private createLivesIcons(): void {
    // Create 3 tiny saucer icons for lives (initially all visible)
    for (let i = 0; i < 3; i++) {
      const lifeIcon = this.scene.add.sprite(16 + i * 20, 16, 'saucer');
      lifeIcon.setScale(0.25);
      lifeIcon.setTint(0x53a8ff); // Blue tint to match player
      this.livesIcons.push(lifeIcon);
      this.add(lifeIcon);
    }
  }

  private createScoreCapsule(): void {
    // Create frosted glass capsule background
    const capsuleGraphics = this.scene.add.graphics();
    capsuleGraphics.fillStyle(0xffffff, 0.1); // Semi-transparent white
    capsuleGraphics.lineStyle(1, 0xffffff, 0.15); // Subtle border

    // Draw rounded rectangle
    const capsuleWidth = 120;
    const capsuleHeight = 24;
    const cornerRadius = 12;
    const x = 16 + 3 * 20 + 16; // Position after lives icons
    const y = 10;

    capsuleGraphics.fillRoundedRect(x, y, capsuleWidth, capsuleHeight, cornerRadius);
    capsuleGraphics.strokeRoundedRect(x, y, capsuleWidth, capsuleHeight, cornerRadius);

    // Add backdrop blur effect (simulated with semi-transparent overlay)
    const blurOverlay = this.scene.add.graphics();
    blurOverlay.fillStyle(0xffffff, 0.05);
    blurOverlay.fillRoundedRect(x + 1, y + 1, capsuleWidth - 2, capsuleHeight - 2, cornerRadius - 1);

    // Create score text
    this.scoreText = this.scene.add.text(
      x + capsuleWidth / 2,
      y + capsuleHeight / 2,
      'Score: 0',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff'
      }
    );
    this.scoreText.setOrigin(0.5, 0.5);

    // Add text shadow for contrast
    this.scoreText.setShadow(1, 1, '#000000', 0.5);

    this.add(capsuleGraphics);
    this.add(blurOverlay);
    this.add(this.scoreText);
  }

  private createProgressBar(): void {
    // Progress bar track (center-top)
    this.progressBarTrack = this.scene.add.graphics();
    this.progressBarTrack.fillStyle(0xffffff, 0.15);
    this.progressBarTrack.lineStyle(1, 0xffffff, 0.1);

    const trackX = (this.scene.cameras.main.width - this.progressWidth) / 2;
    const trackY = 12;

    this.progressBarTrack.fillRoundedRect(trackX, trackY, this.progressWidth, this.progressHeight, 3);
    this.progressBarTrack.strokeRoundedRect(trackX, trackY, this.progressWidth, this.progressHeight, 3);

    // Progress bar fill
    this.progressBarFill = this.scene.add.graphics();
    this.progressBarFill.fillStyle(0xffffff, 0.9);

    // Progress bar glow effect
    this.progressBarGlow = this.scene.add.graphics();
    this.progressBarGlow.fillStyle(0xffffff, 0.3);

    this.add(this.progressBarTrack);
    this.add(this.progressBarGlow);
    this.add(this.progressBarFill);
  }

  public setLives(lives: number): void {
    // Show/hide life icons based on current lives
    this.livesIcons.forEach((icon, index) => {
      icon.setVisible(index < lives);
    });
  }

  public setScore(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
  }

  public drawProgress(progress: number): void {
    // Clear previous drawings
    this.progressBarFill.clear();
    this.progressBarGlow.clear();

    // Clamp progress between 0 and 1
    const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);

    // Calculate fill width
    const fillWidth = this.progressWidth * clampedProgress;

    // Position calculations
    const trackX = (this.scene.cameras.main.width - this.progressWidth) / 2;
    const trackY = 12;

    // Draw fill
    this.progressBarFill.fillStyle(0xffffff, 0.9);
    this.progressBarFill.fillRoundedRect(trackX, trackY, fillWidth, this.progressHeight, 3);

    // Draw glow effect (slightly larger and more transparent)
    const glowWidth = Math.min(fillWidth + 20, this.progressWidth);
    const glowOffset = Math.max(0, (fillWidth + 20 - this.progressWidth) / 2);

    this.progressBarGlow.fillStyle(0xffffff, 0.2);
    this.progressBarGlow.fillRoundedRect(trackX - glowOffset, trackY - 1, glowWidth, this.progressHeight + 2, 4);

    // Add pulsing animation to glow
    const pulseAlpha = 0.2 + Math.sin(this.scene.time.now * 0.005) * 0.1;
    this.progressBarGlow.alpha = pulseAlpha;
  }

  public destroy(): void {
    // Clean up all graphics objects
    this.progressBarTrack.destroy();
    this.progressBarFill.destroy();
    this.progressBarGlow.destroy();

    // Clean up life icons
    this.livesIcons.forEach(icon => icon.destroy());
    this.livesIcons = [];

    // Clean up score text
    this.scoreText.destroy();

    super.destroy();
  }
}
