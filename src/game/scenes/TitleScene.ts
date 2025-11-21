import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 4, '社畜\nシューティング', {
      fontSize: '40px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Start Button
    const startText = this.add.text(width / 2, height / 2, '出社する (Start)', {
      fontSize: '24px',
      color: '#00ff00'
    }).setOrigin(0.5).setInteractive();

    startText.on('pointerdown', () => {
      // New Game
      localStorage.removeItem('shachiku_save');
      this.scene.start('MainScene');
    });

    // Continue Button
    const saveData = localStorage.getItem('shachiku_save');
    if (saveData) {
        const continueText = this.add.text(width / 2, height / 2 + 60, '続きから出社 (Continue)', {
            fontSize: '24px',
            color: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        continueText.on('pointerdown', () => {
            const data = JSON.parse(saveData);
            this.scene.start('MainScene', data);
        });
    }
  }
}
