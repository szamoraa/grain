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

  // Wave Intro Card
  private introCard!: Phaser.GameObjects.Container;
  private introBg!: Phaser.GameObjects.Graphics;
  private introTitle!: Phaser.GameObjects.Text;
  private introSub!: Phaser.GameObjects.Text;

  // Combo Meter
  private comboBadge!: Phaser.GameObjects.Container;
  private comboText!: Phaser.GameObjects.Text;
  private comboGlow!: Phaser.GameObjects.Graphics;

  // Buff Pills (bottom-center)
  private buffContainer!: Phaser.GameObjects.Container;
  private doublePill!: Phaser.GameObjects.Container;
  private score2Pill!: Phaser.GameObjects.Container;

  // Wave Summary
  private summaryCard!: Phaser.GameObjects.Container;
  private summaryBg!: Phaser.GameObjects.Graphics;
  private summaryTitle!: Phaser.GameObjects.Text;
  private summaryStats!: Phaser.GameObjects.Text;

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
    this.createIntroCard();
    this.createComboBadge();
    this.createBuffPills();
    this.createSummaryCard();

    // Initial layout
    this.layout();

    // Handle resize events
    scene.scale.on('resize', this.layout, this);

    // Listen for ammo arc updates
    (scene as Phaser.Scene).events.on('hud:ammoArc', ({ratioUsed, reloading}:{ratioUsed:number; reloading:boolean}) => {
      this.drawAmmoArc(ratioUsed, reloading);
    });

    // Listen for intro card
    (scene as Phaser.Scene).events.on('hud:intro', ({title, sub}:{title:string; sub?:string}) => {
      this.showIntroCard(title, sub);
    });

    // Listen for combo updates
    (scene as Phaser.Scene).events.on('hud:combo', ({level}:{level:number}) => {
      this.updateComboBadge(level);
    });

    // Listen for buff updates
    (scene as Phaser.Scene).events.on('hud:buff', (data: {type:string; progress:number; active:boolean}) => {
      this.updateBuffPill(data.type, data.progress, data.active);
    });

    // Listen for wave summary
    (scene as Phaser.Scene).events.on('hud:waveSummary', (data: {waveIndex:number; asteroids:number; enemies:number; accuracy:number; peakCombo:number}) => {
      this.showWaveSummary(data);
    });

    // Listen for score pulse
    (scene as Phaser.Scene).events.on('hud:scorePulse', () => {
      this.pulseScore();
    });

    // Listen for progress glow
    (scene as Phaser.Scene).events.on('hud:progressGlow', (isEndGame: boolean) => {
      this.setProgressGlow(isEndGame);
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

  private createIntroCard(): void {
    this.introCard = this.scene.add.container(0, 0).setDepth(10001);
    this.introBg = this.scene.add.graphics();
    this.introTitle = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.introSub = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5);

    this.introCard.add([this.introBg, this.introTitle, this.introSub]);
    this.introCard.setAlpha(0); // Start hidden
    this.add(this.introCard);
  }

  private createComboBadge(): void {
    this.comboBadge = this.scene.add.container(0, 0).setDepth(10001);
    this.comboGlow = this.scene.add.graphics();
    this.comboText = this.scene.add.text(0, 0, 'x1', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.comboBadge.add([this.comboGlow, this.comboText]);
    this.comboBadge.setAlpha(0); // Start hidden
    this.add(this.comboBadge);
  }

  private createBuffPills(): void {
    this.buffContainer = this.scene.add.container(0, 0).setDepth(10001);

    // Double-shot pill
    this.doublePill = this.scene.add.container(0, 0);
    const doubleBg = this.scene.add.graphics();
    doubleBg.fillStyle(0x4a90e2, 0.9);
    doubleBg.fillRoundedRect(-50, -12, 100, 24, 8);
    const doubleText = this.scene.add.text(0, 0, 'DOUBLE SHOT', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.doublePill.add([doubleBg, doubleText]);
    this.doublePill.setAlpha(0); // Start hidden

    // Score x2 pill
    this.score2Pill = this.scene.add.container(0, 0);
    const score2Bg = this.scene.add.graphics();
    score2Bg.fillStyle(0xe74c3c, 0.9);
    score2Bg.fillRoundedRect(-40, -12, 80, 24, 8);
    const score2Text = this.scene.add.text(0, 0, '×2 SCORE', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.score2Pill.add([score2Bg, score2Text]);
    this.score2Pill.setAlpha(0); // Start hidden

    this.buffContainer.add([this.doublePill, this.score2Pill]);
    this.add(this.buffContainer);
  }

  private createSummaryCard(): void {
    this.summaryCard = this.scene.add.container(0, 0).setDepth(10001);
    this.summaryBg = this.scene.add.graphics();
    this.summaryTitle = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.summaryStats = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5);

    this.summaryCard.add([this.summaryBg, this.summaryTitle, this.summaryStats]);
    this.summaryCard.setAlpha(0); // Start hidden
    this.add(this.summaryCard);
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

    // Position buff pills at bottom-center
    const buffY = cam.worldView.y + cam.height - this.ammoMargin - 30;
    this.doublePill.setPosition(cam.centerX - 60, buffY);
    this.score2Pill.setPosition(cam.centerX + 60, buffY);

    // Position combo badge near player (will be updated in updateComboBadge)
    this.updateComboBadgePosition();
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

  // New HUD methods
  public showIntroCard(title: string, sub?: string): void {
    this.introTitle.setText(title);
    this.introSub.setText(sub || '');

    // Create background
    this.introBg.clear();
    const titleWidth = Math.max(200, this.introTitle.width + 40);
    const subWidth = sub ? Math.max(200, this.introSub.width + 40) : 0;
    const width = Math.max(titleWidth, subWidth);
    const height = 60 + (sub ? 30 : 0);

    this.introBg.fillStyle(0xffffff, 0.1);
    this.introBg.fillRoundedRect(-width/2, -height/2, width, height, 16);
    this.introBg.lineStyle(2, 0xffffff, 0.15);
    this.introBg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

    // Position text
    this.introTitle.setPosition(0, sub ? -15 : 0);
    this.introSub.setPosition(0, 15);

    // Center on screen
    const cam = this.scene.cameras.main;
    this.introCard.setPosition(cam.centerX, cam.centerY);

    // Animate in
    this.introCard.setAlpha(0).setScale(0.95);
    this.scene.tweens.add({
      targets: this.introCard,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.out'
    });

    // Auto-hide after 1.8s
    this.scene.time.delayedCall(1800, () => {
      this.scene.tweens.add({
        targets: this.introCard,
        alpha: 0,
        scale: 0.95,
        duration: 300,
        onComplete: () => this.introCard.setAlpha(0)
      });
    });
  }

  public updateComboBadge(level: number): void {
    if (level <= 1) {
      this.comboBadge.setAlpha(0);
      return;
    }

    this.comboText.setText(`x${level}`);
    this.updateComboBadgePosition();

    // Update glow based on level
    this.comboGlow.clear();
    const glowSize = 20 + level * 5;
    this.comboGlow.fillStyle(0xffffff, 0.3);
    this.comboGlow.fillCircle(0, 0, glowSize);

    // Animate in
    this.comboBadge.setAlpha(0).setScale(0.8);
    this.scene.tweens.add({
      targets: this.comboBadge,
      alpha: 1,
      scale: 1,
      duration: 200,
      ease: 'Back.out'
    });

    // Pulse animation
    this.scene.tweens.add({
      targets: this.comboGlow,
      alpha: { from: 0.3, to: 0.6 },
      scale: { from: 1, to: 1.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  private updateComboBadgePosition(): void {
    // Position near player (simplified - would need player position from scene)
    const cam = this.scene.cameras.main;
    this.comboBadge.setPosition(cam.centerX + 100, cam.centerY - 50);
  }

  public updateBuffPill(type: string, progress: number, active: boolean): void {
    const pill = type === 'double' ? this.doublePill : this.score2Pill;

    if (!active) {
      pill.setAlpha(0);
      return;
    }

    pill.setAlpha(1);

    // Update progress bar on pill
    const pillBg = pill.getAt(0) as Phaser.GameObjects.Graphics;
    pillBg.clear();

    const color = type === 'double' ? 0x4a90e2 : 0xe74c3c;
    const width = type === 'double' ? 100 : 80;
    const height = 24;

    // Background
    pillBg.fillStyle(color, 0.9);
    pillBg.fillRoundedRect(-width/2, -height/2, width, height, 8);

    // Progress bar (top)
    const progressWidth = width * progress;
    pillBg.fillStyle(0xffffff, 0.8);
    pillBg.fillRoundedRect(-width/2, -height/2, progressWidth, 3, 2);
  }

  public showWaveSummary(data: {waveIndex:number; asteroids:number; enemies:number; accuracy:number; peakCombo:number}): void {
    this.summaryTitle.setText(`Wave ${data.waveIndex} Complete!`);

    const stats = [
      `Asteroids destroyed: ${data.asteroids}`,
      `Enemies destroyed: ${data.enemies}`,
      `Accuracy: ${data.accuracy}%`,
      `Combo Peak: x${data.peakCombo}`
    ];
    this.summaryStats.setText(stats.join('\n'));

    // Create background
    this.summaryBg.clear();
    const width = 300;
    const height = 120;
    this.summaryBg.fillStyle(0xffffff, 0.1);
    this.summaryBg.fillRoundedRect(-width/2, -height/2, width, height, 16);
    this.summaryBg.lineStyle(2, 0xffffff, 0.15);
    this.summaryBg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

    // Position text
    this.summaryTitle.setPosition(0, -35);
    this.summaryStats.setPosition(0, 10);

    // Center on screen
    const cam = this.scene.cameras.main;
    this.summaryCard.setPosition(cam.centerX, cam.centerY);

    // Animate in
    this.summaryCard.setAlpha(0);
    this.scene.tweens.add({
      targets: this.summaryCard,
      alpha: 1,
      duration: 500,
      ease: 'Power2.out'
    });

    // Auto-hide after 1.5s
    this.scene.time.delayedCall(1500, () => {
      this.scene.tweens.add({
        targets: this.summaryCard,
        alpha: 0,
        duration: 300,
        onComplete: () => this.summaryCard.setAlpha(0)
      });
    });
  }

  public pulseScore(): void {
    this.scene.tweens.add({
      targets: this.scoreCapsule,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 150,
      yoyo: true,
      ease: 'Power2.out'
    });
  }

  public setProgressGlow(isEndGame: boolean): void {
    if (isEndGame) {
      this.scene.tweens.add({
        targets: this.progressBarGlow,
        alpha: { from: 0.1, to: 0.3 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      });
    } else {
      this.progressBarGlow.alpha = 0.1;
      this.scene.tweens.killTweensOf(this.progressBarGlow);
    }
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
    this.introBg.destroy();
    this.comboGlow.destroy();
    this.summaryBg.destroy();

    // Clean up text objects
    this.introTitle.destroy();
    this.introSub.destroy();
    this.comboText.destroy();
    this.summaryTitle.destroy();
    this.summaryStats.destroy();

    // Clean up containers
    this.scoreCapsule.destroy();
    this.ammoCtr.destroy();
    this.introCard.destroy();
    this.comboBadge.destroy();
    this.buffContainer.destroy();
    this.summaryCard.destroy();

    // Clean up life icons
    this.livesIcons.forEach(icon => icon.destroy());
    this.livesIcons = [];

    super.destroy();
  }
}
