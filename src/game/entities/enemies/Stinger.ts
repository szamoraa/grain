// Yellow Stinger enemy with zig-zag and seeking behavior
// Smaller, faster enemy that attempts to ram the player

import Phaser from 'phaser';
import { STINGER } from '../../config';

export class Stinger {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private timeAlive = 0;
  private lastLockTime = 0;
  private currentVelocity = new Phaser.Math.Vector2();
  private targetVelocity = new Phaser.Math.Vector2();
  private originalTint = 0xffff00; // Yellow
  private lockTint = 0xffffff; // White flash

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'stinger-saucer');
    this.sprite.setScale(STINGER.scale);
    this.sprite.setTint(this.originalTint);

    // Physics setup
    this.sprite.setVelocity(STINGER.speed, 0); // Start moving right
    this.sprite.setCollideWorldBounds(false);
    this.sprite.setImmovable(false);

    // Initial velocity
    this.currentVelocity.set(STINGER.speed, 0);
    this.targetVelocity.copy(this.currentVelocity);
  }

  /**
   * Update Stinger behavior
   * @param delta Time since last update in ms
   */
  update(delta: number): void {
    this.timeAlive += delta;
    const timeSeconds = this.timeAlive / 1000;

    // Base zig-zag motion
    const baseX = this.sprite.x;
    const zigzagOffset = Math.sin(timeSeconds * STINGER.zigzag.freq) * STINGER.zigzag.amplitude;
    const zigzagX = baseX + zigzagOffset;

    // Check if it's time to lock onto player
    const timeSinceLastLock = this.timeAlive - this.lastLockTime;
    if (timeSinceLastLock >= STINGER.lockIntervalMs) {
      this.lockOntoPlayer();
    }

    // Smooth steering toward target velocity
    this.currentVelocity.lerp(this.targetVelocity, STINGER.steerLerp);

    // Apply velocity with zig-zag
    this.sprite.setVelocity(
      this.currentVelocity.x,
      this.currentVelocity.y
    );

    // Update position with zig-zag
    this.sprite.x = zigzagX;

    // Keep speed within bounds
    const currentSpeed = this.currentVelocity.length();
    if (currentSpeed > STINGER.speed * 1.2) {
      this.currentVelocity.normalize().scale(STINGER.speed);
    } else if (currentSpeed < STINGER.speed * 0.8) {
      this.currentVelocity.normalize().scale(STINGER.speed);
    }

    // Remove if off-screen
    if (this.sprite.x > this.scene.cameras.main.width + 100 ||
        this.sprite.x < -100 ||
        this.sprite.y > this.scene.cameras.main.height + 100 ||
        this.sprite.y < -100) {
      this.destroy();
    }
  }

  /**
   * Lock onto player position and calculate steering vector
   */
  private lockOntoPlayer(): void {
    this.lastLockTime = this.timeAlive;

    // Get player position (assuming player exists in scene)
    const saucerScene = this.scene as Phaser.Scene & { player?: { sprite?: Phaser.GameObjects.Sprite } };
    const player = saucerScene.player;
    if (!player) return;

    // Get the actual sprite, handling both direct sprite and object with sprite property
    let playerSprite: Phaser.GameObjects.Sprite;
    if (player.sprite) {
      playerSprite = player.sprite;
    } else if (player instanceof Phaser.GameObjects.Sprite) {
      playerSprite = player;
    } else {
      return;
    }

    // Calculate vector to player
    const toPlayer = new Phaser.Math.Vector2(
      playerSprite.x - this.sprite.x,
      playerSprite.y - this.sprite.y
    );

    // Set target velocity toward player
    this.targetVelocity.copy(toPlayer).normalize().scale(STINGER.speed);

    // Flash effect when locking
    this.sprite.setTint(this.lockTint);
    this.scene.time.delayedCall(STINGER.flashOnLockMs, () => {
      this.sprite.setTint(this.originalTint);
    });
  }

  /**
   * Handle collision with player
   */
  onHitPlayer(): void {
    // Camera shake on impact
    this.scene.cameras.main.shake(150, 0.008);

    // Destroy the Stinger
    this.destroy();
  }

  /**
   * Destroy the Stinger
   */
  destroy(): void {
    if (this.sprite && this.sprite.active) {
      this.sprite.destroy();
    }
  }

  /**
   * Check if Stinger is still alive
   */
  isAlive(): boolean {
    return this.sprite && this.sprite.active;
  }

  /**
   * Get current position
   */
  getPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
  }
}
