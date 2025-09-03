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

  // Wave theme colors
  private readonly WAVE_THEME = {
    1: { accent: 0x7FB7FF }, // blue
    2: { accent: 0xB08CFF }, // purple
    3: { accent: 0xFF7A7A }, // red
  } as const;

  private currentAccent = 0x7FB7FF; // default to wave 1 blue

  // Threat indicators
  private threatIndicators: Phaser.GameObjects.Graphics[] = [];
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
    this.createBuffPills();
    this.createSummaryCard();
    this.createThreatIndicators();

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

    // Listen for wave theme updates
    (scene as Phaser.Scene).events.on('hud:waveTheme', ({waveIndex}:{waveIndex:number}) => {
      this.updateWaveTheme(waveIndex);
    });

    // Listen for threat indicators
    (scene as Phaser.Scene).events.on('hud:threat', ({side, ttl}:{side:string, ttl:number}) => {
      this.showThreatIndicator(side, ttl);
    });

    // Listen for celebration
    (scene as Phaser.Scene).events.on('hud:celebrate', ({waveIndex}:{waveIndex:number}) => {
      this.celebrateWave(waveIndex);
    });

    // Listen for ripple effects
    (scene as Phaser.Scene).events.on('hud:ripple', ({kind}:{kind:string}) => {
      this.showRipple(kind);
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
        fontFamily: 'AstroUI',
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
      fontFamily: 'AstroUI',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.introSub = this.scene.add.text(0, 0, '', {
      fontFamily: 'AstroUI',
      fontSize: '16px',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5);

    this.introCard.add([this.introBg, this.introTitle, this.introSub]);
    this.introCard.setAlpha(0); // Start hidden
    this.add(this.introCard);
  }

  private createThreatIndicators(): void {
    // Pre-create threat indicators pool
    for (let i = 0; i < 8; i++) {
      const indicator = this.scene.add.graphics().setDepth(10001);
      indicator.setAlpha(0);
      this.threatIndicators.push(indicator);
      this.add(indicator);
    }
  }

  private createBuffPills(): void {
    this.buffContainer = this.scene.add.container(0, 0).setDepth(10001);

    // Double-shot pill
    this.doublePill = this.scene.add.container(0, 0);
    const doubleBg = this.scene.add.graphics();
    doubleBg.fillStyle(0x4a90e2, 0.9);
    doubleBg.fillRoundedRect(-50, -12, 100, 24, 8);
    const doubleText = this.scene.add.text(0, 0, 'DOUBLE SHOT', {
      fontFamily: 'AstroUI',
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
      fontFamily: 'AstroUI',
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
      fontFamily: 'AstroUI',
      fontSize: '28px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.summaryStats = this.scene.add.text(0, 0, '', {
      fontFamily: 'AstroUI',
      fontSize: '16px',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5);

    this.summaryCard.add([this.summaryBg, this.summaryTitle, this.summaryStats]);
    this.summaryCard.setAlpha(0); // Start hidden
    this.add(this.summaryCard);
  }

  public setLives(lives: number, lost: boolean = false): void {
    // Show/hide life icons based on current lives
    this.livesIcons.forEach((icon, index) => {
      icon.setVisible(index < lives);
    });

    // Wobble animation when losing a life
    if (lost) {
      this.scene.tweens.add({
        targets: this.livesIcons.filter(icon => icon.visible),
        rotation: { from: -0.1, to: 0.1 },
        y: { from: -2, to: 2 },
        duration: 220,
        yoyo: true,
        ease: 'Back.out'
      });
    }

    this.layout(); // Re-layout after visibility changes
  }

  public setScore(score: number, delta: number = 0): void {
    this.scoreText.setText(`Score: ${score}`);
    this.drawScoreBg(); // Redraw background to fit new text
    this.layout(); // Re-layout after text changes

    // Pulse animation for big score gains
    if (delta >= 1000) {
      this.scene.tweens.add({
        targets: this.scoreCapsule,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 90,
        yoyo: true,
        ease: 'Power2.out'
      });

      // Add quick radial glow
      const glow = this.scene.add.graphics().setDepth(999);
      glow.fillStyle(this.currentAccent, 0.3);
      glow.fillCircle(0, 0, 30);
      glow.setPosition(this.scoreCapsule.x, this.scoreCapsule.y);

      this.scene.tweens.add({
        targets: glow,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 120,
        ease: 'Power2.out',
        onComplete: () => glow.destroy()
      });
    }
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

    // Draw fill with current accent color
    this.progressBarFill.fillStyle(this.currentAccent, 0.9);
    this.progressBarFill.fillRoundedRect(trackX, trackY, fillWidth, this.progressHeight, 3);

    // Draw glow effect (enhanced for end game)
    const glowWidth = Math.min(fillWidth + 20, this.progressWidth);
    const glowOffset = Math.max(0, (fillWidth + 20 - this.progressWidth) / 2);

    if (clampedProgress >= 0.85) {
      // Enhanced glow for end game
      this.progressBarGlow.fillStyle(this.currentAccent, 0.4);
      this.progressBarGlow.fillRoundedRect(trackX - glowOffset, trackY - 1, glowWidth, this.progressHeight + 2, 4);

      // Add pulsing animation
      const pulseAlpha = 0.4 + Math.sin(this.scene.time.now * 0.008) * 0.2;
      this.progressBarGlow.alpha = pulseAlpha;
    } else {
      // Normal glow
      this.progressBarGlow.fillStyle(0xffffff, 0.2);
      this.progressBarGlow.fillRoundedRect(trackX - glowOffset, trackY - 1, glowWidth, this.progressHeight + 2, 4);
      this.progressBarGlow.alpha = 0.2;
    }
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

    // Reload tilt animation and steam particles
    if (reloading) {
      const tiltAngle = Math.sin(this.scene.time.now * 0.02) * 0.05;
      this.ammoCtr.setRotation(tiltAngle);

      // Add steam particles occasionally
      if (Math.random() < 0.3) {
        const steam = this.scene.add.graphics().setDepth(10001);
        steam.fillStyle(0xFFFFFF, 0.4);
        steam.fillCircle(0, 0, 2);
        steam.setPosition(this.ammoCtr.x, this.ammoCtr.y - 15);

        this.scene.tweens.add({
          targets: steam,
          y: steam.y - 20,
          alpha: 0,
          scale: 0.5,
          duration: 400,
          ease: 'Power2.out',
          onComplete: () => steam.destroy()
        });
      }
    } else {
      this.ammoCtr.setRotation(0);
    }

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

  public updateWaveTheme(waveIndex: number): void {
    const theme = this.WAVE_THEME[waveIndex as keyof typeof this.WAVE_THEME] || this.WAVE_THEME[1];
    this.currentAccent = theme.accent;

    // Update existing UI elements with new accent color
    this.updateAccentColors();
  }

  private updateAccentColors(): void {
    // Update score capsule glow
    if (this.scoreBg) {
      // We'll implement this in the score capsule creation method
    }

    // Update progress bar glow
    // This will be updated in drawProgress
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

  public showThreatIndicator(side: string, ttl: number): void {
    // Find an available indicator
    const indicator = this.threatIndicators.find(ind => ind.alpha === 0);
    if (!indicator) return;

    const cam = this.scene.cameras.main;
    let x = 0, y = 0, rotation = 0;

    // Position based on side
    switch (side) {
      case 'left':
        x = cam.worldView.x + 20;
        y = cam.centerY;
        rotation = Math.PI / 2;
        break;
      case 'right':
        x = cam.worldView.x + cam.width - 20;
        y = cam.centerY;
        rotation = -Math.PI / 2;
        break;
      case 'top':
        x = cam.centerX;
        y = cam.worldView.y + 20;
        rotation = Math.PI;
        break;
    }

    // Draw chevron
    indicator.clear();
    indicator.fillStyle(this.currentAccent, 0.8);
    indicator.beginPath();
    indicator.moveTo(0, -8);
    indicator.lineTo(8, 8);
    indicator.lineTo(-8, 8);
    indicator.closePath();
    indicator.fill();

    // Position and animate
    indicator.setPosition(x, y).setRotation(rotation);
    indicator.setAlpha(0);

    this.scene.tweens.add({
      targets: indicator,
      alpha: 0.8,
      duration: 90,
      ease: 'Power2.out',
      onComplete: () => {
        // Float toward center
        const floatX = side === 'left' ? 8 : side === 'right' ? -8 : 0;
        const floatY = side === 'top' ? 8 : 0;

        this.scene.tweens.add({
          targets: indicator,
          x: x + floatX,
          y: y + floatY,
          duration: 300,
          ease: 'Power2.out'
        });

        // Fade out
        this.scene.tweens.add({
          targets: indicator,
          alpha: 0,
          duration: ttl - 90,
          delay: 90,
          ease: 'Power2.out'
        });
      }
    });
  }

  public celebrateWave(_waveIndex: number): void {
    // Crown flash on progress bar
    this.scene.tweens.add({
      targets: this.progressBarFill,
      alpha: { from: 1, to: 0.3 },
      duration: 180,
      yoyo: true,
      ease: 'Power2.out'
    });

    // Digital confetti
    const cam = this.scene.cameras.main;
    const colors = [0xFFF7C2, 0xFFE08A, 0xFFFFFF];

    for (let i = 0; i < 25; i++) {
      const particle = this.scene.add.graphics().setDepth(10001);
      const color = colors[i % colors.length];
      particle.fillStyle(color, 0.8);
      particle.fillCircle(0, 0, 2);

      const startX = cam.centerX + (Math.random() - 0.5) * 200;
      const startY = cam.worldView.y + 50;
      const endX = startX + (Math.random() - 0.5) * 100;
      const endY = cam.worldView.y + cam.height - 50;

      particle.setPosition(startX, startY);

      this.scene.tweens.add({
        targets: particle,
        x: endX,
        y: endY,
        alpha: 0,
        scale: { from: 1, to: 0.5 },
        duration: 600,
        delay: Math.random() * 200,
        ease: 'Power2.out',
        onComplete: () => particle.destroy()
      });
    }
  }

  public showRipple(_kind: string): void {
    // Create ripple behind score capsule
    const cam = this.scene.cameras.main;
    const rippleX = cam.worldView.x + this.HUD_MARGIN + 100; // Near score capsule
    const rippleY = cam.worldView.y + this.HUD_MARGIN + 20;

    const ripple = this.scene.add.graphics().setDepth(999);
    ripple.fillStyle(0xffffff, 0.18);
    ripple.fillCircle(rippleX, rippleY, 9);

    this.scene.tweens.add({
      targets: ripple,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 140,
      ease: 'Power2.out',
      onComplete: () => ripple.destroy()
    });
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
    this.summaryBg.destroy();
    this.threatIndicators.forEach(indicator => indicator.destroy());

    // Clean up text objects
    this.introTitle.destroy();
    this.introSub.destroy();
    this.summaryTitle.destroy();
    this.summaryStats.destroy();

    // Clean up containers
    this.scoreCapsule.destroy();
    this.ammoCtr.destroy();
    this.introCard.destroy();
    this.buffContainer.destroy();
    this.summaryCard.destroy();

    // Clean up life icons
    this.livesIcons.forEach(icon => icon.destroy());
    this.livesIcons = [];

    super.destroy();
  }
}
