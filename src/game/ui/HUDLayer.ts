import Phaser from 'phaser';

export class HUDLayer extends Phaser.GameObjects.Container {
  private livesIcons: Phaser.GameObjects.Sprite[] = [];
  private scoreCapsule!: Phaser.GameObjects.Container;
  private scoreBg!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private progressBarTrack!: Phaser.GameObjects.Graphics;
  private progressBarFill!: Phaser.GameObjects.Graphics;
  private progressBarGlow!: Phaser.GameObjects.Graphics;
  private progressWidth = 280;
  private progressHeight = 6;

  // Ammo Arc HUD (bottom-left)
  private ammoCtr!: Phaser.GameObjects.Container;
  private ammoTrack!: Phaser.GameObjects.Graphics;
  private ammoFill!: Phaser.GameObjects.Graphics;
  private ammoGlow!: Phaser.GameObjects.Graphics;
  private ammoR = 36;             // radius
  private ammoThick = 7;          // stroke width
  private ammoMargin = 20;        // from edges

  // HUD layout constants
  private readonly HUD_MARGIN = 24;     // increased for breathing room
  private readonly SCORE_SCALE = 1.5;     // +50%
  private readonly LIVES_ICON_SCALE = 3.0; // 300%
  private readonly LIVES_GAP_BASE = 6;    // base gap before scaling

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    // Pin to camera and set high depth
    this.setScrollFactor(0);
    this.setDepth(10000);

    this.createLivesIcons();
    this.createScoreCapsule();
    this.createProgressBar();
    this.createAmmoArc();

    // Initial layout
    this.layout();

    // Handle resize events
    scene.scale.on('resize', this.layout, this);

    // Listen for ammo arc updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (scene as any).events.on('hud:ammoArc', ({ratioUsed, reloading}:{ratioUsed:number; reloading:boolean}) => {
      this.drawAmmoArc(ratioUsed, reloading);
    });

    scene.add.existing(this);
  }

  private createLivesIcons(): void {
    // Create 3 saucer icons for lives (3x bigger, properly spaced)
    for (let i = 0; i < 3; i++) {
      const lifeIcon = this.scene.add.sprite(0, 0, 'saucer');
      lifeIcon.setScale(0.25 * this.LIVES_ICON_SCALE); // 3x bigger than original tiny size
      lifeIcon.setTint(0x53a8ff); // Blue tint to match player
      this.livesIcons.push(lifeIcon);
      this.add(lifeIcon);
    }
  }

  private createScoreCapsule(): void {
    // Create score container for easy positioning
    this.scoreCapsule = this.scene.add.container(0, 0);

    // Create background graphics
    this.scoreBg = this.scene.add.graphics();

    // Create score text (1.5x larger)
    this.scoreText = this.scene.add.text(
      0, 0,
      'Score: 0',
      {
        fontFamily: 'monospace',
        fontSize: `${Math.round(12 * this.SCORE_SCALE)}px`, // 18px (1.5x larger)
        color: '#ffffff'
      }
    );
    this.scoreText.setOrigin(0.5, 0.5);

    // Add text shadow for contrast
    this.scoreText.setShadow(1, 1, '#000000', 0.5);

    // Add elements to container
    this.scoreCapsule.add(this.scoreBg);
    this.scoreCapsule.add(this.scoreText);

    // Draw initial background
    this.drawScoreBg();

    this.add(this.scoreCapsule);
  }

  private drawScoreBg(): void {
    this.scoreBg.clear();

    // Calculate padding based on scale
    const padX = 10 * this.SCORE_SCALE;
    const padY = 4 * this.SCORE_SCALE;

    // Calculate background dimensions based on text size
    const w = this.scoreText.width + padX * 2;
    const h = this.scoreText.height + padY * 2;
    const cornerRadius = 12 * this.SCORE_SCALE;

    // Position background relative to text center
    this.scoreBg.fillStyle(0xffffff, 0.1);
    this.scoreBg.fillRoundedRect(-w/2, -h/2, w, h, cornerRadius);
    this.scoreBg.lineStyle(1, 0xffffff, 0.15);
    this.scoreBg.strokeRoundedRect(-w/2, -h/2, w, h, cornerRadius);

    // Add backdrop blur effect (simulated with semi-transparent overlay)
    this.scoreBg.fillStyle(0xffffff, 0.05);
    this.scoreBg.fillRoundedRect(-w/2 + 1, -h/2 + 1, w - 2, h - 2, cornerRadius - 1);
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

  private createAmmoArc(): void {
    // Ammo HUD container
    this.ammoCtr = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(10000);
    this.ammoTrack = this.scene.add.graphics();
    this.ammoFill = this.scene.add.graphics();
    this.ammoGlow = this.scene.add.graphics();
    this.ammoCtr.add([this.ammoGlow, this.ammoTrack, this.ammoFill]);

    this.add(this.ammoCtr);
  }

  public setLives(lives: number): void {
    // Show/hide life icons based on current lives
    this.livesIcons.forEach((icon, index) => {
      icon.setVisible(index < lives);
    });
    this.layout(); // Re-layout after visibility changes
  }

  public setScore(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
    this.drawScoreBg(); // Redraw background to fit new text
    this.layout(); // Re-layout after text changes
  }

  private layout(): void {
    const cam = this.scene.cameras.main;

    // Position lives icons at top-left with proper spacing
    this.livesIcons.forEach((icon, index) => {
      const gap = this.LIVES_GAP_BASE * this.LIVES_ICON_SCALE;
      const x = this.HUD_MARGIN + index * (icon.displayWidth + gap);
      const y = this.HUD_MARGIN + icon.displayHeight / 2;
      icon.setPosition(x, y);
    });

    // Position score capsule at top-right
    const scoreWidth = this.scoreText.width + (10 * this.SCORE_SCALE * 2);
    this.scoreCapsule.setPosition(
      cam.width - this.HUD_MARGIN - scoreWidth/2,
      this.HUD_MARGIN + this.scoreText.height/2
    );

    // Progress bar stays centered at top (unchanged)
    const trackX = (cam.width - this.progressWidth) / 2;
    const trackY = this.HUD_MARGIN;

    // Redraw progress bar track at new position
    this.progressBarTrack.clear();
    this.progressBarTrack.fillStyle(0xffffff, 0.15);
    this.progressBarTrack.lineStyle(1, 0xffffff, 0.1);
    this.progressBarTrack.fillRoundedRect(trackX, trackY, this.progressWidth, this.progressHeight, 3);
    this.progressBarTrack.strokeRoundedRect(trackX, trackY, this.progressWidth, this.progressHeight, 3);

    // Position ammo arc at bottom-left
    const ammoX = cam.worldView.x + this.ammoMargin + this.ammoR;
    const ammoY = cam.worldView.y + cam.height - this.ammoMargin - this.ammoR;
    this.ammoCtr.setPosition(ammoX, ammoY);
  }

  public drawProgress(progress: number): void {
    // Clear previous drawings
    this.progressBarFill.clear();
    this.progressBarGlow.clear();

    // Clamp progress between 0 and 1
    const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);

    // Calculate fill width
    const fillWidth = this.progressWidth * clampedProgress;

    // Position calculations (use same as layout method)
    const trackX = (this.scene.cameras.main.width - this.progressWidth) / 2;
    const trackY = this.HUD_MARGIN;

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

  private drawAmmoArc(ratioUsed: number, reloading: boolean): void {
    // Track (full circle, faint steel)
    this.drawArc(this.ammoTrack, this.ammoR, this.ammoThick, 0, Math.PI*2, 0xD7DEE7, 0.18);

    // Fill: we want a "bottom arc" that grows with usage.
    // Start at ~200° and sweep clockwise up to ~340° (bottom smile).
    const start = Phaser.Math.DegToRad(200);
    const maxSweep = Phaser.Math.DegToRad(140); // length of the smile arc
    const end = start + maxSweep * Phaser.Math.Clamp(ratioUsed, 0, 1);

    // Color ramp: cool → amber → red as it fills
    let color = 0xE8F4FF; // cool
    if (ratioUsed > 0.33 && ratioUsed <= 0.66) color = 0xFFB84D; // amber
    if (ratioUsed > 0.66) color = 0xFF4D4D;                     // red

    // Main stroke
    this.drawArc(this.ammoFill, this.ammoR, this.ammoThick, start, end, color, 0.95);

    // Subtle glow trail (slightly larger radius, lower alpha)
    this.drawArc(this.ammoGlow, this.ammoR + 2, 2, start, end, color, 0.35);

    // Reload pulse: quick alpha shimmer when reloading or just emptied
    if (reloading || ratioUsed >= 1) {
      this.scene.tweens.add({
        targets: this.ammoFill,
        alpha: { from: 1.0, to: 0.6 },
        duration: 180,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut'
      });
    }
  }

  private drawArc(g: Phaser.GameObjects.Graphics, r: number, thick: number, start: number, end: number, color: number, alpha: number): void {
    g.clear();
    g.lineStyle(thick, color, alpha);
    g.beginPath();
    g.arc(0, 0, r, start, end, false);
    g.strokePath();
  }

  public destroy(): void {
    // Clean up all graphics objects
    this.progressBarTrack.destroy();
    this.progressBarFill.destroy();
    this.progressBarGlow.destroy();
    this.scoreBg.destroy();
    this.ammoTrack.destroy();
    this.ammoFill.destroy();
    this.ammoGlow.destroy();

    // Clean up containers
    this.scoreCapsule.destroy();
    this.ammoCtr.destroy();

    // Clean up life icons
    this.livesIcons.forEach(icon => icon.destroy());
    this.livesIcons = [];

    super.destroy();
  }
}
