import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Title
    const title = this.add.text(512, 200, 'Retro Saucer', {
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(512, 280, 'Level 1', {
      fontSize: '36px',
      color: '#cccccc'
    });
    subtitle.setOrigin(0.5);

    // Play button
    const playButton = this.add.text(512, 380, 'PLAY', {
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

    playButton.on('pointerdown', () => {
      this.scene.start('SaucerScene');
    });

    // Instructions
    const instructions = this.add.text(512, 480, 'Use ↑↓ or W/S to move\nPress SPACE to shoot\nPress R to restart when game over', {
      fontSize: '18px',
      color: '#888888',
      align: 'center'
    });
    instructions.setOrigin(0.5);

    // Keyboard controls
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    enterKey.on('down', () => {
      this.scene.start('SaucerScene');
    });

    spaceKey.on('down', () => {
      this.scene.start('SaucerScene');
    });
  }
}
