import { SoundType } from './types';

// Simple WebAudio sound effect generator
// TODO: Replace with real audio assets later
export class Sfx {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private muted: boolean = false;

  constructor() {
    // Initialize WebAudio context on first user interaction
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.3; // Master volume
    } catch (error) {
      console.warn('WebAudio not supported:', error);
    }
  }

  // Play a simple oscillator-based sound
  private playTone(frequency: number, duration: number, type: OscillatorType = 'square'): void {
    if (!this.audioContext || !this.gainNode || this.muted) return;

    // Resume context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    oscillator.connect(envelope);
    envelope.connect(this.gainNode);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    // Simple envelope for attack/decay
    envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
    envelope.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Play laser sound effect
  playLaser(): void {
    this.playTone(800, 0.1, 'sawtooth');
  }

  // Play hit/damage sound
  playHit(): void {
    // Two-tone hit effect
    this.playTone(200, 0.15, 'square');
    setTimeout(() => this.playTone(150, 0.1, 'square'), 50);
  }

  // Play explosion sound
  playExplosion(): void {
    // Descending tone explosion
    const frequencies = [400, 300, 200, 150];
    frequencies.forEach((freq, index) => {
      setTimeout(() => this.playTone(freq, 0.08, 'sawtooth'), index * 30);
    });
  }

  // Play level up sound
  playLevelUp(): void {
    // Ascending arpeggio
    const frequencies = [300, 400, 500, 600];
    frequencies.forEach((freq, index) => {
      setTimeout(() => this.playTone(freq, 0.1, 'sine'), index * 50);
    });
  }

  // Generic method to play any sound type
  play(type: SoundType): void {
    switch (type) {
      case 'laser':
        this.playLaser();
        break;
      case 'hit':
        this.playHit();
        break;
      case 'explosion':
        this.playExplosion();
        break;
      case 'levelup':
        this.playLevelUp();
        break;
    }
  }

  // Mute/unmute all sounds
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : 0.3;
    }
  }

  // Check if audio is muted
  isMuted(): boolean {
    return this.muted;
  }

  // Clean up resources
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.gainNode = null;
    }
  }
}

// Global sound manager instance
export const sfx = new Sfx();
