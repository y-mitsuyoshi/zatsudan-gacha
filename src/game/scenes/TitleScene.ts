import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;

    // Background (Dark Office Theme)
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);
    
    // Matrix/Code Rain Effect (Subtle background)
    const particles = this.add.particles(0, 0, 'bullet', {
        x: { min: 0, max: width },
        y: -10,
        lifespan: 4000,
        speedY: { min: 50, max: 150 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.3, end: 0 },
        tint: 0x00ff00,
        frequency: 100,
        blendMode: 'ADD'
    });

    // Title Text with Shadow and Float Animation
    const title = this.add.text(width / 2, height / 3, '社畜\nシューティング', {
      fontSize: '64px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 4, stroke: true, fill: true }
    }).setOrigin(0.5);

    this.tweens.add({
        targets: title,
        y: title.y - 10,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Subtitle
    this.add.text(width / 2, height / 3 + 80, '- The Legend of Salaryman -', {
        fontSize: '20px',
        color: '#aaaaaa',
        fontStyle: 'italic'
    }).setOrigin(0.5);

    // Start Button (Pulsing)
    const startBtn = this.add.container(width / 2, height / 2 + 40);
    const startBg = this.add.rectangle(0, 0, 240, 60, 0x2ecc71).setInteractive({ useHandCursor: true });
    const startText = this.add.text(0, 0, '出社する', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    startBtn.add([startBg, startText]);

    startBg.on('pointerover', () => startBg.setFillStyle(0x27ae60));
    startBg.on('pointerout', () => startBg.setFillStyle(0x2ecc71));
    startBg.on('pointerdown', () => {
      // New Game
      localStorage.removeItem('shachiku_save');
      this.scene.start('MainScene');
    });

    this.tweens.add({
        targets: startBtn,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Continue Button (if save exists)
    const saveData = localStorage.getItem('shachiku_save');
    if (saveData) {
        const continueBtn = this.add.container(width / 2, height / 2 + 120);
        const continueBg = this.add.rectangle(0, 0, 240, 60, 0xf1c40f).setInteractive({ useHandCursor: true });
        const continueText = this.add.text(0, 0, '続きから', {
            fontSize: '24px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        continueBtn.add([continueBg, continueText]);

        continueBg.on('pointerover', () => continueBg.setFillStyle(0xf39c12));
        continueBg.on('pointerout', () => continueBg.setFillStyle(0xf1c40f));
        continueBg.on('pointerdown', () => {
            const data = JSON.parse(saveData);
            this.scene.start('MainScene', data);
        });
    }
  }
}
