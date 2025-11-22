import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Load Backgrounds
    this.load.image('bg_stage1', '/assets/game/bg_stage1.png');
    this.load.image('bg_stage2', '/assets/game/bg_stage2.png');
    this.load.image('bg_stage3', '/assets/game/bg_stage3.png');
    this.load.image('bg_stage4', '/assets/game/bg_stage4.png');
    this.load.image('bg_stage5', '/assets/game/bg_stage5.png');
    this.load.image('bg_stage6', '/assets/game/bg_stage6.png');
  }

  create() {
    this.createProceduralGraphics();
    this.scene.start('TitleScene');
  }

  createProceduralGraphics() {
    // --- Player: Salaryman ---
    const player = this.make.graphics({ x: 0, y: 0 });

    // Head
    player.fillStyle(0xffccaa, 1); // Skin color
    player.fillRect(10, 0, 12, 10);

    // Body (Suit)
    player.fillStyle(0x000080, 1); // Navy Blue
    player.fillRect(4, 10, 24, 22);

    // Shirt (White center)
    player.fillStyle(0xffffff, 1);
    player.fillRect(13, 10, 6, 10);

    // Tie (Red)
    player.fillStyle(0xff0000, 1);
    player.fillRect(15, 10, 2, 12);

    // Legs (Pants split)
    player.fillStyle(0x000000, 1); // Gap between legs
    player.fillRect(15, 22, 2, 10);

    player.generateTexture('player', 32, 32);
    player.destroy();

    // --- Enemy: Document/Task ---
    const enemy = this.make.graphics({ x: 0, y: 0 });

    // Paper body
    enemy.fillStyle(0xffffff, 1);
    enemy.fillRect(2, 2, 28, 28);
    enemy.lineStyle(2, 0xcccccc, 1);
    enemy.strokeRect(2, 2, 28, 28);

    // Lines of text
    enemy.fillStyle(0x888888, 1);
    enemy.fillRect(6, 8, 20, 2);
    enemy.fillRect(6, 12, 20, 2);
    enemy.fillRect(6, 16, 20, 2);

    // "Urgent" Stamp
    enemy.fillStyle(0xff0000, 0.8);
    enemy.fillCircle(24, 24, 5);

    enemy.generateTexture('enemy', 32, 32);
    enemy.destroy();

    // --- Boss: Angry Boss / Big Stamp ---
    const boss = this.make.graphics({ x: 0, y: 0 });

    // Face
    boss.fillStyle(0xaa0000, 1); // Dark Red
    boss.fillRect(0, 0, 64, 64);

    // Eyes (Angry)
    boss.fillStyle(0xffffff, 1);
    boss.beginPath();
    boss.moveTo(10, 20);
    boss.lineTo(30, 25);
    boss.lineTo(10, 30);
    boss.fillPath();

    boss.beginPath();
    boss.moveTo(54, 20);
    boss.lineTo(34, 25);
    boss.lineTo(54, 30);
    boss.fillPath();

    // Mouth (Yelling)
    boss.fillStyle(0x000000, 1);
    boss.fillRect(15, 40, 34, 15);

    // Teeth
    boss.fillStyle(0xffffff, 1);
    boss.fillRect(15, 40, 10, 5);
    boss.fillRect(39, 40, 10, 5);

    boss.generateTexture('boss', 64, 64);
    boss.destroy();

    // --- Bullet: Energy ---
    const bullet = this.make.graphics({ x: 0, y: 0 });
    bullet.fillStyle(0xffff00, 1);
    bullet.fillCircle(5, 5, 5);
    bullet.fillStyle(0xffffff, 0.8); // shine
    bullet.fillCircle(3, 3, 2);
    bullet.generateTexture('bullet', 10, 10);
    bullet.destroy();

    // --- Items ---
    // Score (Coin)
    const itemScore = this.make.graphics({ x: 0, y: 0 });
    itemScore.fillStyle(0xffd700, 1); // Gold
    itemScore.fillCircle(10, 10, 10);
    itemScore.fillStyle(0xffff00, 1);
    itemScore.fillCircle(10, 10, 6);
    itemScore.generateTexture('item_score', 20, 20);
    itemScore.destroy();

    // Powerup (P)
    const itemPower = this.make.graphics({ x: 0, y: 0 });
    itemPower.fillStyle(0xff0000, 1); // Red box
    itemPower.fillRect(0, 0, 20, 20);
    itemPower.lineStyle(2, 0xffffff);
    itemPower.strokeRect(0, 0, 20, 20);
    // P text would be nice but graphics is easier
    itemPower.fillStyle(0xffffff, 1);
    itemPower.fillRect(5, 5, 10, 10);
    itemPower.generateTexture('item_powerup', 20, 20);
    itemPower.destroy();

    // Heal (Heart)
    const itemHeal = this.make.graphics({ x: 0, y: 0 });
    itemHeal.fillStyle(0xff69b4, 1); // Pink
    itemHeal.fillCircle(6, 6, 6);
    itemHeal.fillCircle(14, 6, 6);
    itemHeal.beginPath();
    itemHeal.moveTo(0, 6);
    itemHeal.lineTo(10, 20);
    itemHeal.lineTo(20, 6);
    itemHeal.fillPath();
    itemHeal.generateTexture('item_heal', 20, 20);
    itemHeal.destroy();

    // Bomb (B)
    const itemBomb = this.make.graphics({ x: 0, y: 0 });
    itemBomb.fillStyle(0x0000ff, 1); // Blue box
    itemBomb.fillRect(0, 0, 20, 20);
    itemBomb.fillStyle(0xffffff, 1);
    itemBomb.fillCircle(10, 10, 5);
    itemBomb.generateTexture('item_bomb', 20, 20);
    itemBomb.destroy();
  }
}
