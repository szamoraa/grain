import Phaser from 'phaser';
import { INTRO } from '../config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Center everything in the camera view
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Title
    const title = this.add.text(cx, cy - 40, 'Retro Saucer', {
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(cx, cy, 'Level 1', {
      fontSize: '36px',
      color: '#cccccc'
    });
    subtitle.setOrigin(0.5);

    // Play button
    const playButton = this.add.text(cx, cy + 56, 'PLAY', {
      fontSize: '48px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    playButton.setOrigin(0.5);
    playButton.setInteractive({ useHandCursor: true });

    playButton.on('pointerover', () => {
      playButton.setColor('#ffffff');
    });

    playButton.on('pointerout', () => {
      playButton.setColor('#00ff00');
    });

    const startGameScene = () => {
      if (INTRO.enabled) {
        this.scene.start('IntroScene');
      } else {
        this.scene.start('SaucerScene');
      }
    };

    playButton.on('pointerdown', startGameScene);

    // Instructions
    const instructions = this.add.text(cx, cy + 140, 'Use ↑↓ or W/S to move\nPress SPACE to shoot\nPress R to restart when game over', {
      fontFamily: 'AstroUI',
      fontSize: '18px',
      color: '#888888',
      align: 'center'
    });
    instructions.setOrigin(0.5);

    // Keyboard controls
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    enterKey.on('down', startGameScene);
    spaceKey.on('down', startGameScene);
  }
}
