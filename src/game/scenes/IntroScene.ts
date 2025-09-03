// Cinematic intro scene for ASTRO launch sequence
// Handles the pre-game cinematic with starfield, ship animation, and countdown

import Phaser from 'phaser';
import { Countdown } from '../ui/Countdown';
import { INTRO } from '../config';

export class IntroScene extends Phaser.Scene {
  private playerShip!: Phaser.GameObjects.Sprite;
  private starfield!: Phaser.GameObjects.TileSprite;
  private countdown!: Countdown;
  private launchText!: Phaser.GameObjects.Text;
  private typewriterText = '';
  private fullLaunchText = 'LAUNCHING...';
  private isSkipped = false;
  private isPlaying = false;

  constructor() {
    super({ key: 'IntroScene' });
  }

  preload(): void {
    // Reuse existing textures from BootScene
    // No additional loading needed
  }

  create(): void {
    this.isPlaying = true;
    this.isSkipped = false;

    // Create starfield (start invisible)
    this.createStarfield();

    // Create player ship (start off-screen)
    this.createPlayerShip();

    // Create countdown helper
    this.countdown = new Countdown(this);

    // Create launch text (start empty)
    this.createLaunchText();

    // Setup input for skipping
    this.setupSkipInput();

    // Start the sequence
    this.startSequence();
  }

  private createStarfield(): void {
    const { width, height } = this.cameras.main;

    // Create starfield using existing slow texture
    this.starfield = this.add.tileSprite(
      width / 2,
      height / 2,
      width,
      height,
      'starfield-slow'
    );
    this.starfield.setAlpha(0); // Start invisible
    this.starfield.setScrollFactor(0);
  }

  private createPlayerShip(): void {
    const { height } = this.cameras.main;

    this.playerShip = this.add.sprite(-100, height / 2, 'saucer');
    this.playerShip.setScale(0.8);
    this.playerShip.setVisible(false); // Start invisible
  }

  private createLaunchText(): void {
    const { centerX, centerY } = this.cameras.main;

    this.launchText = this.add.text(centerX, centerY - 100, '', {
      fontFamily: 'AstroUI',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    });
    this.launchText.setOrigin(0.5);
  }

  private setupSkipInput(): void {
    // Allow skipping with Space, Enter, or Click
    const skipKeys = [
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    ];

    skipKeys.forEach(key => {
      key.on('down', () => this.skipIntro());
    });

    // Mouse click to skip
    this.input.on('pointerdown', () => this.skipIntro());
  }

  private async startSequence(): Promise<void> {
    try {
      // 1. Fade in starfield
      await this.fadeInStarfield();

      // 2. Ship slides in with gentle bob
      await this.shipSlideIn();

      // 3. Typewriter "LAUNCHING..." text
      await this.typewriterLaunchText();

      // 4. Countdown sequence
      await this.playCountdown();

      // 5. "GO" flash with camera shake
      await this.goFlash();

      // 6. Transition to game
      this.transitionToGame();
    } catch {
      // If skipped or error, just transition
      this.transitionToGame();
    }
  }

  private fadeInStarfield(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isSkipped) {
        resolve();
        return;
      }

      this.tweens.add({
        targets: this.starfield,
        alpha: 1,
        duration: INTRO.durations.fadeIn,
        ease: 'Linear',
        onComplete: () => resolve()
      });
    });
  }

  private shipSlideIn(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isSkipped) {
        resolve();
        return;
      }

      const { centerX, centerY } = this.cameras.main;

      // Make ship visible
      this.playerShip.setVisible(true);

      // Slide in from left
      this.tweens.add({
        targets: this.playerShip,
        x: centerX - 200, // Position to the left of center
        duration: INTRO.durations.shipIn,
        ease: 'Power2',
        onComplete: () => {
          // Add gentle bob animation
          this.tweens.add({
            targets: this.playerShip,
            y: centerY - 10,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            onComplete: () => resolve()
          });
        }
      });
    });
  }

  private typewriterLaunchText(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isSkipped) {
        resolve();
        return;
      }

      this.typewriterText = '';
      let charIndex = 0;

      const typeChar = () => {
        if (this.isSkipped || charIndex >= this.fullLaunchText.length) {
          this.launchText.setText(this.fullLaunchText);
          resolve();
          return;
        }

        this.typewriterText += this.fullLaunchText[charIndex];
        this.launchText.setText(this.typewriterText);
        charIndex++;

        this.time.delayedCall(80, typeChar); // Typing speed
      };

      typeChar();
    });
  }

  private playCountdown(): Promise<void> {
    if (this.isSkipped) return Promise.resolve();

    return this.countdown.play(INTRO.countdownFrom);
  }

  private goFlash(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isSkipped) {
        resolve();
        return;
      }

      // Camera shake for "GO"
      this.cameras.main.shake(200, 0.005);

      // Small particle burst effect (if desired)
      // Could add muzzle flash particles here

      this.time.delayedCall(INTRO.durations.goFlash, () => resolve());
    });
  }

  private skipIntro(): void {
    if (this.isSkipped) return;

    this.isSkipped = true;
    this.countdown.skip();

    // Stop all tweens
    this.tweens.killAll();

    // Immediately transition
    this.transitionToGame();
  }

  private transitionToGame(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    // Clean up
    if (this.countdown) {
      this.countdown.destroy();
    }

    // Transition to game scene with intro flag
    this.scene.start('SaucerScene', { fromIntro: true });
  }

  destroy(): void {
    if (this.countdown) {
      this.countdown.destroy();
    }
    // Phaser.Scene handles cleanup automatically
  }
}
