import Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';
import { BulletType } from './Bullet';

export type WeaponType = 'NORMAL' | 'LASER' | 'FLAME';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyZ: Phaser.Input.Keyboard.Key;
  private keyX: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;
  private wasd: any;

  private lastFired: number = 0;
  private fireRate: number = 150; // ms

  public hp: number = 100; // メンタル
  public maxHp: number = 100;
  public bombs: number = 3; // 有給休暇

  public weaponLevel: number = 1;
  private maxWeaponLevel: number = 5;
  public weaponType: WeaponType = 'NORMAL';

  private isFiring: boolean = false;

  constructor(scene: MainScene, x: number, y: number, initialHp: number = 100, initialBombs: number = 3, initialWeaponLevel: number = 1) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = initialHp;
    this.bombs = initialBombs;
    this.weaponLevel = initialWeaponLevel;

    this.setCollideWorldBounds(true);

    // Input setup
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keyZ = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keySpace = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

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
    const pointers = [this.scene.input.pointer1, this.scene.input.pointer2];
    let movePointer = null;

    for (const p of pointers) {
        if (p && p.isDown) {
            const isOverFireBtn = p.x < 100 && p.y > this.scene.scale.height - 100;
            const isOverBombBtn = p.x > this.scene.scale.width - 100 && p.y > this.scene.scale.height - 100;
            
            if (!isOverFireBtn && !isOverBombBtn) {
                movePointer = p;
                break;
            }
        }
    }

    if (!movePointer && !this.scene.sys.game.device.os.android && !this.scene.sys.game.device.os.iOS) {
        movePointer = this.scene.input.activePointer;
    }

    if (vx === 0 && vy === 0 && movePointer) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, movePointer.x, movePointer.y);
        if (dist > 10) {
             this.scene.physics.moveToObject(this, movePointer, speed);
             return;
        } else {
            this.setVelocity(0, 0);
            return;
        }
    }

    this.setVelocity(vx, vy);
  }

  private handleShooting(time: number) {
    const pointer = this.scene.input.activePointer;
    const isMobile = this.scene.sys.game.device.os.android || this.scene.sys.game.device.os.iOS;
    const isClicking = !isMobile && pointer.isDown; 
    
    if (this.keySpace.isDown || this.keyZ.isDown || isClicking || this.isFiring) {
        // Determine fire rate based on weapon
        let currentFireRate = this.fireRate;
        if (this.weaponType === 'FLAME') currentFireRate = 50; // Fast fire for flame
        if (this.weaponType === 'LASER') currentFireRate = 300; // Slow heavy fire

        if (time > this.lastFired) {
            this.fireWeapon();
            this.lastFired = time + currentFireRate;
        }
    }
  }

  public setFiring(status: boolean) {
      this.isFiring = status;
  }

  public setWeaponType(type: WeaponType) {
      this.weaponType = type;
  }

  private fireWeapon() {
      const scene = this.scene as MainScene;
      const x = this.x;
      const y = this.y;
      const level = this.weaponLevel;

      if (this.weaponType === 'LASER') {
          scene.fireBullet(x, y - 10, 'LASER', -90);
          if (level >= 3) {
              scene.fireBullet(x - 10, y, 'LASER', -100);
              scene.fireBullet(x + 10, y, 'LASER', -80);
          }
          if (level >= 5) {
              scene.fireBullet(x - 20, y + 10, 'LASER', -110);
              scene.fireBullet(x + 20, y + 10, 'LASER', -70);
          }
          return;
      }

      if (this.weaponType === 'FLAME') {
          scene.fireBullet(x, y - 20, 'FLAME', -90);
          if (level >= 2) {
               scene.fireBullet(x - 10, y - 10, 'FLAME', -100);
               scene.fireBullet(x + 10, y - 10, 'FLAME', -80);
          }
          if (level >= 4) {
               scene.fireBullet(x - 20, y, 'FLAME', -110);
               scene.fireBullet(x + 20, y, 'FLAME', -70);
          }
          return;
      }

      // NORMAL WEAPON
      // Level 1: Single shot
      scene.fireBullet(x, y);

      // Level 2: Double shot
      if (this.weaponLevel >= 2) {
          scene.fireBullet(x - 10, y + 10);
          scene.fireBullet(x + 10, y + 10);
      }

      // Level 3: Spread
      if (this.weaponLevel >= 3) {
           scene.fireBullet(x - 20, y + 20, 'NORMAL', -100);
           scene.fireBullet(x + 20, y + 20, 'NORMAL', -80);
      }
      
      // Level 4: More spread
      if (this.weaponLevel >= 4) {
           scene.fireBullet(x - 30, y + 30, 'NORMAL', -110);
           scene.fireBullet(x + 30, y + 30, 'NORMAL', -70);
      }

      // Level 5: Max
      if (this.weaponLevel >= 5) {
           scene.fireBullet(x, y - 20);
      }
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
