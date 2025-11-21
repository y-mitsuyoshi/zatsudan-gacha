import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Create placeholder graphics if needed, or load assets here
  }

  create() {
    this.createPlaceholderGraphics();
    this.scene.start('TitleScene');
  }

  createPlaceholderGraphics() {
    // Player (Green Square)
    const player = this.make.graphics({ x: 0, y: 0 });
    player.fillStyle(0x00ff00, 1);
    player.fillRect(0, 0, 32, 32);
    player.generateTexture('player', 32, 32);
    player.destroy();

    // Enemy (Red Square)
    const enemy = this.make.graphics({ x: 0, y: 0 });
    enemy.fillStyle(0xff0000, 1);
    enemy.fillRect(0, 0, 32, 32);
    enemy.generateTexture('enemy', 32, 32);
    enemy.destroy();

    // Bullet (Yellow Circle)
    const bullet = this.make.graphics({ x: 0, y: 0 });
    bullet.fillStyle(0xffff00, 1);
    bullet.fillCircle(5, 5, 5);
    bullet.generateTexture('bullet', 10, 10);
    bullet.destroy();
  }
}
