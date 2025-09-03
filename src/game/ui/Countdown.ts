// Countdown helper for cinematic intro sequences
// Handles centered text countdown with scale/opacity animations

export class Countdown {
  private scene: Phaser.Scene;
  private textObject: Phaser.GameObjects.Text;
  private isPlaying = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.textObject = scene.add.text(
      scene.cameras.main.centerX,
      scene.cameras.main.centerY,
      '',
      {
        fontFamily: 'AstroUI',
        fontSize: '72px',
        color: '#ffffff',
        align: 'center'
      }
    );
    this.textObject.setOrigin(0.5);
    this.textObject.setVisible(false);
    this.textObject.setDepth(1000);
  }

  /**
   * Play countdown sequence from given number to 1, then GO
   * @param from Starting number (e.g., 3 for 3-2-1-GO)
   * @returns Promise that resolves when countdown completes
   */
  play(from: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.isPlaying) return resolve();

      this.isPlaying = true;
      this.textObject.setVisible(true);
      let current = from;

      const showNumber = () => {
        if (current > 0) {
          // Show countdown number
          this.textObject.setText(current.toString());
          this.textObject.setScale(0.8);
          this.textObject.setAlpha(0.8);

          // Scale up and fade animation
          this.scene.tweens.add({
            targets: this.textObject,
            scale: 1.2,
            alpha: 1,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
              // Brief hold, then fade out
              this.scene.time.delayedCall(300, () => {
                this.scene.tweens.add({
                  targets: this.textObject,
                  scale: 0.6,
                  alpha: 0,
                  duration: 200,
                  ease: 'Power2',
                  onComplete: () => {
                    current--;
                    showNumber();
                  }
                });
              });
            }
          });
        } else {
          // Show "GO"
          this.textObject.setText('GO');
          this.textObject.setScale(1.5);
          this.textObject.setAlpha(1);

          // Flash animation for "GO"
          this.scene.tweens.add({
            targets: this.textObject,
            scale: 2.0,
            duration: 300,
            ease: 'Power2',
            yoyo: true,
            onComplete: () => {
              // Quick fade out
              this.scene.tweens.add({
                targets: this.textObject,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                  this.textObject.setVisible(false);
                  this.isPlaying = false;
                  resolve();
                }
              });
            }
          });
        }
      };

      showNumber();
    });
  }

  /**
   * Skip the current countdown if playing
   */
  skip(): void {
    if (!this.isPlaying) return;

    // Cancel all tweens
    this.scene.tweens.killTweensOf(this.textObject);

    // Hide immediately
    this.textObject.setVisible(false);
    this.isPlaying = false;
  }

  /**
   * Destroy the countdown helper
   */
  destroy(): void {
    this.skip();
    this.textObject.destroy();
  }
}
