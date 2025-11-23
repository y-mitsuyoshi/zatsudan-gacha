import Phaser from 'phaser';
import { soundManager } from '../utils/SoundManager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    const { width, height } = this.scale;

    // Dark overlay with slight red tint
    this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0);
    this.add.rectangle(0, 0, width, height, 0xff0000, 0.1).setOrigin(0);

    // "RETIRED" Text (Game Over)
    const title = this.add.text(width / 2, height / 4, '退職届提出', {
      fontSize: '64px',
      color: '#e74c3c',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Stats Container
    const statsY = height / 2 - 20;
    
    // Final Score
    this.add.text(width / 2, statsY, `最終評価 (Score): ${this.score.toLocaleString()}`, {
        fontSize: '32px',
        color: '#ffffff'
    }).setOrigin(0.5);

    // Stage Reached
    const stageName = `第 ${this.stage} 階層`;
    this.add.text(width / 2, statsY + 50, `到達: ${stageName}`, {
        fontSize: '24px',
        color: '#aaaaaa'
    }).setOrigin(0.5);

    // Buttons
    // Try Again
    const retryBtn = this.add.container(width / 2, height * 0.75);
    const retryBg = this.add.rectangle(0, 0, 200, 50, 0x3498db).setInteractive({ useHandCursor: true });
    const retryText = this.add.text(0, 0, '再就職', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    retryBtn.add([retryBg, retryText]);

    retryBg.on('pointerover', () => retryBg.setFillStyle(0x2980b9));
    retryBg.on('pointerout', () => retryBg.setFillStyle(0x3498db));
    retryBg.on('pointerdown', () => {
        this.scene.start('MainScene');
    });

    // Title Screen
    const titleBtn = this.add.container(width / 2, height * 0.75 + 70);
    const titleBg = this.add.rectangle(0, 0, 200, 50, 0x95a5a6).setInteractive({ useHandCursor: true });
    const titleText = this.add.text(0, 0, 'タイトルへ', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    titleBtn.add([titleBg, titleText]);

    titleBg.on('pointerover', () => titleBg.setFillStyle(0x7f8c8d));
    titleBg.on('pointerout', () => titleBg.setFillStyle(0x95a5a6));
    titleBg.on('pointerdown', () => {
        this.scene.start('TitleScene');
    });
  }

  private score: number = 0;
  private stage: number = 1;

  init(data: { score: number; stage: number }) {
      soundManager.stopBGM();
      this.score = data.score || 0;
      this.stage = data.stage || 1;
      
      // Dispatch event to React
      const event = new CustomEvent('shachiku-game-over', { detail: data });
      window.dispatchEvent(event);
  }
}
