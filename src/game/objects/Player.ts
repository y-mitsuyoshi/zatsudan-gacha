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

  public weaponLevel: number = 1;
  private maxWeaponLevel: number = 5;

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

    // Mouse/Touch (Follow pointer)
    const pointer = this.scene.input.activePointer;
    // Move if pointer is within game area (simple check) or just always follow if active
    // We want to follow without clicking for mouse, but maybe require touch for mobile?
    // Phaser pointer is always active.
    
    // Check if it's mouse or touch
    // For mouse, we want to follow. For touch, we usually drag.
    // Let's just move towards pointer if distance is significant
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, pointer.x, pointer.y);
    
    // If keyboard is not being used, use pointer
    if (vx === 0 && vy === 0) {
        if (dist > 10) {
            this.scene.physics.moveToObject(this, pointer, speed);
            return;
        } else {
            this.setVelocity(0, 0);
            return;
        }
    }

    this.setVelocity(vx, vy);
  }

  private handleShooting(time: number) {
    // Auto shoot always
    if (time > this.lastFired) {
        this.fireWeapon();
        this.lastFired = time + this.fireRate;
    }
  }

  private fireWeapon() {
      const scene = this.scene as MainScene;
      const x = this.x;
      const y = this.y;

      // Level 1: Single shot
      scene.fireBullet(x, y);

      // Level 2: Double shot
      if (this.weaponLevel >= 2) {
          scene.fireBullet(x - 10, y + 10);
          scene.fireBullet(x + 10, y + 10);
      }

      // Level 3: Spread
      if (this.weaponLevel >= 3) {
           // We need to implement angled shots in MainScene or Bullet
           // For now, just more bullets
           scene.fireBullet(x - 20, y + 20);
           scene.fireBullet(x + 20, y + 20);
      }
      
      // Level 4 & 5 could add more or change bullet type
  }

  public upgradeWeapon() {
      if (this.weaponLevel < this.maxWeaponLevel) {
          this.weaponLevel++;
      }
  }

  public heal(amount: number) {
      this.hp += amount;
      if (this.hp > this.maxHp) this.hp = this.maxHp;
  }

  public addBomb() {
      this.bombs++;
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
