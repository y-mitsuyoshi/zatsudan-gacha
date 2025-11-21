import Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyZ: Phaser.Input.Keyboard.Key;
  private keyX: Phaser.Input.Keyboard.Key;
  private wasd: any;

  private lastFired: number = 0;
  private fireRate: number = 150; // ms

  public hp: number = 100; // メンタル
  public maxHp: number = 100;
  public bombs: number = 3; // 有給休暇

  constructor(scene: MainScene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    // Input setup
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keyZ = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    this.wasd = scene.input.keyboard!.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });
  }

  update(time: number, delta: number) {
    // Player dies if HP is 0
    if (this.hp <= 0) {
        this.setActive(false);
        this.setVisible(false);
        // Let scene handle game over
        return;
    }

    this.handleMovement();
    this.handleShooting(time);
    this.handleBomb();
  }

  private handleMovement() {
    const speed = 300;
    let vx = 0;
    let vy = 0;

    // Keyboard
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;

    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    // Touch (Move towards pointer if active)
    const pointer = this.scene.input.activePointer;
    if (pointer.isDown) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, pointer.x, pointer.y);
        if (dist > 10) {
            this.scene.physics.moveToObject(this, pointer, speed);
            // physics.moveToObject sets velocity, so we return to avoid overwriting it below
            return;
        } else {
            // Close enough, stop
            this.setVelocity(0, 0);
            return;
        }
    }

    this.setVelocity(vx, vy);
  }

  private handleShooting(time: number) {
    const pointer = this.scene.input.activePointer;
    // Auto shoot on touch or Z key
    if (this.keyZ.isDown || pointer.isDown) {
        if (time > this.lastFired) {
            (this.scene as MainScene).fireBullet(this.x, this.y);
            this.lastFired = time + this.fireRate;
        }
    }
  }

  private handleBomb() {
     if (Phaser.Input.Keyboard.JustDown(this.keyX)) {
         this.useBomb();
     }

     // Multi-touch for bomb on mobile could be handled here,
     // but Phaser's pointer logic for multi-touch might need enabling in config.
     // For now, we'll stick to a UI button for Bomb in SP (later) or Z/X keys.
  }

  public useBomb() {
      if (this.bombs > 0) {
          this.bombs--;
          (this.scene as MainScene).triggerBomb();
      }
  }

  public takeDamage(amount: number) {
      this.hp -= amount;
      if (this.hp < 0) this.hp = 0;
  }
}
