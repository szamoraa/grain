import { SoundType } from './types';

// Simple WebAudio sound effect generator
// TODO: Replace with real audio assets later
export class Sfx {
  private audioContext?: AudioContext;
  private gainNode?: GainNode;
  private muted = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    // Don't touch audio during SSR/build
    if (typeof window === "undefined") return;

    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) {
        // No WebAudio (very rare), just mute gracefully
        this.muted = true;
        return;
      }

      this.audioContext = new AC();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.3; // Master volume
    } catch {
      // Some browsers require a user gesture before creating/starting audio
      this.muted = true;
    }
  }

  public setMuted(on: boolean) {
    this.muted = on;
  }

  private ensureResumed() {
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      // Resume on first user interaction
      this.audioContext.resume().catch(() => {});
    }
  }

  // Tiny beep helpers (replace later with real assets)
  public laser() {
    if (this.muted || !this.audioContext || !this.gainNode) return;
    this.ensureResumed();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = "square";
    osc.frequency.value = 880;

    gain.gain.value = 0.0;
    osc.connect(gain).connect(this.gainNode);

    const t = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  public boom() {
    if (this.muted || !this.audioContext || !this.gainNode) return;
    this.ensureResumed();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.3);

    gain.gain.value = 0.0;
    osc.connect(gain).connect(this.gainNode);

    const t = this.audioContext.currentTime;
    gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.start(t);
    osc.stop(t + 0.38);
  }

  public explosionLarge() {
    if (this.muted || !this.audioContext || !this.gainNode) return;
    this.ensureResumed();

    // Multiple oscillators for richer explosion sound
    const oscillators = [];
    const frequencies = [120, 80, 60, 200];

    for (let i = 0; i < 4; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(frequencies[i], this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.8);

      gain.gain.value = 0.0;
      osc.connect(gain).connect(this.gainNode);

      const t = this.audioContext.currentTime;
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

      osc.start(t);
      osc.stop(t + 0.9);
      oscillators.push(osc);
    }
  }

  // Legacy methods for backward compatibility
  playLaser(): void {
    this.laser();
  }

  playHit(): void {
    this.boom();
  }

  playExplosion(): void {
    this.explosionLarge();
  }

  playLevelUp(): void {
    this.laser(); // Use laser sound for now
  }

  play(type: SoundType): void {
    switch (type) {
      case 'laser':
        this.laser();
        break;
      case 'hit':
        this.boom();
        break;
      case 'explosion':
        this.explosionLarge();
        break;
      case 'levelup':
        this.laser();
        break;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // Clean up resources
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = undefined;
      this.gainNode = undefined;
    }
  }
}

// Global sound manager instance
export const sfx = new Sfx();
