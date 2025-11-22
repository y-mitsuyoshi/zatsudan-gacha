import Phaser from 'phaser';
import { soundManager } from '../utils/SoundManager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data: { score: number; stage: number }) {
      soundManager.stopBGM();
      // Dispatch event to React
      const event = new CustomEvent('shachiku-game-over', { detail: data });
      window.dispatchEvent(event);
  }

  create() {
    // Scene itself can just stay dark or show background
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8).setOrigin(0);
  }
}
