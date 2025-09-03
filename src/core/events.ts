// Typed event system for ASTRO game
// Provides compile-time safety for game events and state changes

export type GameEvents = {
  enemyKilled: { type: 'red' | 'stinger' | string; score: number };
  playerHit: { damage: number };
  gameOver: { finalScore: number };
  scoreUpdated: { score: number; delta: number };
  streakUpdated: { streak: number };
  highScoreUpdated: { newBest: number };
};

/**
 * Lightweight event emitter with TypeScript type safety
 * Wraps Phaser's event system with typed payloads
 */
export class GameEventEmitter {
  private phaserEmitter: Phaser.Events.EventEmitter;

  constructor(scene: Phaser.Scene) {
    this.phaserEmitter = scene.events;
  }

  /**
   * Emit a typed event
   */
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    this.phaserEmitter.emit(event, data);
  }

  /**
   * Listen for a typed event
   */
  on<K extends keyof GameEvents>(
    event: K,
    callback: (data: GameEvents[K]) => void,
    context?: Phaser.Scene
  ): void {
    this.phaserEmitter.on(event, callback, context);
  }

  /**
   * Listen for a typed event once
   */
  once<K extends keyof GameEvents>(
    event: K,
    callback: (data: GameEvents[K]) => void,
    context?: Phaser.Scene
  ): void {
    this.phaserEmitter.once(event, callback, context);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof GameEvents>(
    event: K,
    callback?: (data: GameEvents[K]) => void,
    context?: Phaser.Scene
  ): void {
    this.phaserEmitter.off(event, callback, context);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof GameEvents>(event?: K): void {
    if (event) {
      this.phaserEmitter.removeAllListeners(event);
    } else {
      this.phaserEmitter.removeAllListeners();
    }
  }
}
