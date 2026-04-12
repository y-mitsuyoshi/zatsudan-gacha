import Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';
import { BulletType } from './Bullet';

export type WeaponType = 'NORMAL' | 'LASER' | 'FLAME' | 'MISSILE' | 'SHOTGUN' | 'BEAM';

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
  private autoFire: boolean = true; // Auto-fire enabled by default

  // Invincibility state
  private isInvincible: boolean = false;
  private invincibleTimer: number = 0;
  private readonly INVINCIBLE_DURATION: number = 1000; // 1 second

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

    // Update invincibility
    if (this.isInvincible) {
        this.invincibleTimer -= delta;
        // Blinking effect
        this.setAlpha(Math.sin(time * 0.02) > 0 ? 1 : 0.3);
        if (this.invincibleTimer <= 0) {
            this.isInvincible = false;
            this.setAlpha(1);
        }
    }

    this.handleMovement();
    this.handleShooting(time);
    this.handleBomb();
  }

  private handleMovement() {
    let speed = 300;
    
    // Focus Mode (Shift)
    if (this.cursors.shift.isDown) {
        speed = 150; // Half speed for precision
    }

    let vx = 0;
    let vy = 0;

    // Keyboard
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;

    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
        vx *= 0.707;
        vy *= 0.707;
    }

    // Mouse/Touch (Follow pointer) - Only when pointer is down (clicking/touching)
    if (vx === 0 && vy === 0) {
        const isMobile = this.scene.sys.game.device.os.android || this.scene.sys.game.device.os.iOS;

        if (isMobile) {
            // Mobile: use multi-touch pointers, exclude button areas
            const pointers = [this.scene.input.pointer1, this.scene.input.pointer2];
            let movePointer: Phaser.Input.Pointer | null = null;

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

            if (movePointer) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, movePointer.x, movePointer.y);
                if (dist > 5) {
                    this.x = Phaser.Math.Linear(this.x, movePointer.x, 0.2);
                    this.y = Phaser.Math.Linear(this.y, movePointer.y, 0.2);
                    this.x = Phaser.Math.Clamp(this.x, 20, this.scene.scale.width - 20);
                    this.y = Phaser.Math.Clamp(this.y, 20, this.scene.scale.height - 20);
                    return;
                }
            }
        } else {
            // PC: Only follow mouse when left button is held down
            const pointer = this.scene.input.activePointer;
            if (pointer.isDown) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, pointer.x, pointer.y);
                if (dist > 5) {
                    this.x = Phaser.Math.Linear(this.x, pointer.x, 0.2);
                    this.y = Phaser.Math.Linear(this.y, pointer.y, 0.2);
                    this.x = Phaser.Math.Clamp(this.x, 20, this.scene.scale.width - 20);
                    this.y = Phaser.Math.Clamp(this.y, 20, this.scene.scale.height - 20);
                    return;
                }
            }
        }
    }

    this.setVelocity(vx, vy);
  }

  private handleShooting(time: number) {
    const pointer = this.scene.input.activePointer;
    const isMobile = this.scene.sys.game.device.os.android || this.scene.sys.game.device.os.iOS;
    const isClicking = !isMobile && pointer.isDown; 
    
    if (this.keySpace.isDown || this.keyZ.isDown || isClicking || this.isFiring || this.autoFire) {
        // Determine fire rate based on weapon
        let currentFireRate = this.fireRate;
        if (this.weaponType === 'FLAME') currentFireRate = 50;
        if (this.weaponType === 'LASER') currentFireRate = 300;
        if (this.weaponType === 'MISSILE') currentFireRate = 400;
        if (this.weaponType === 'SHOTGUN') currentFireRate = 600;
        if (this.weaponType === 'BEAM') currentFireRate = 100;

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
          scene.fireBullet(x, y - 20, 'LASER', -90);
          
          if (level >= 2) {
              scene.fireBullet(x - 10, y - 20, 'LASER', -90);
              scene.fireBullet(x + 10, y - 20, 'LASER', -90);
          }
          if (level >= 4) {
               scene.fireBullet(x - 20, y - 10, 'LASER', -95);
               scene.fireBullet(x + 20, y - 10, 'LASER', -85);
          }
          return;
      }

      if (this.weaponType === 'FLAME') {
          const angleSpread = 10 + (level * 2);
          
          scene.fireBullet(x, y - 20, 'FLAME', -90);
          
          if (level >= 2) {
               scene.fireBullet(x, y - 20, 'FLAME', -90 - angleSpread);
               scene.fireBullet(x, y - 20, 'FLAME', -90 + angleSpread);
          }
          if (level >= 3) {
               scene.fireBullet(x, y - 20, 'FLAME', -90 - (angleSpread * 2));
               scene.fireBullet(x, y - 20, 'FLAME', -90 + (angleSpread * 2));
          }
          return;
      }

      if (this.weaponType === 'MISSILE') {
          scene.fireBullet(x, y - 20, 'MISSILE', -90);
          if (level >= 3) {
              scene.fireBullet(x - 20, y - 10, 'MISSILE', -100);
              scene.fireBullet(x + 20, y - 10, 'MISSILE', -80);
          }
          if (level >= 5) {
              scene.fireBullet(x - 40, y, 'MISSILE', -110);
              scene.fireBullet(x + 40, y, 'MISSILE', -70);
          }
          return;
      }

      if (this.weaponType === 'SHOTGUN') {
          for(let i=0; i<3 + level; i++) {
              scene.fireBullet(x, y - 20, 'SHOTGUN', -90);
          }
          return;
      }

      if (this.weaponType === 'BEAM') {
          scene.fireBullet(x, y - 40, 'BEAM', -90);
          if (level >= 3) {
               scene.fireBullet(x - 15, y - 40, 'BEAM', -90);
               scene.fireBullet(x + 15, y - 40, 'BEAM', -90);
          }
          return;
      }

      // NORMAL WEAPON
      scene.fireBullet(x, y);

      if (this.weaponLevel >= 2) {
          scene.fireBullet(x - 10, y + 10);
          scene.fireBullet(x + 10, y + 10);
      }

      if (this.weaponLevel >= 3) {
           scene.fireBullet(x - 20, y + 20, 'NORMAL', -100);
           scene.fireBullet(x + 20, y + 20, 'NORMAL', -80);
      }
      
      if (this.weaponLevel >= 4) {
           scene.fireBullet(x - 30, y + 30, 'NORMAL', -110);
           scene.fireBullet(x + 30, y + 30, 'NORMAL', -70);
      }

      if (this.weaponLevel >= 5) {
           scene.fireBullet(x - 40, y + 10, 'NORMAL', -120);
           scene.fireBullet(x + 40, y + 10, 'NORMAL', -60);
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
      // Skip if currently invincible
      if (this.isInvincible) return;

      this.hp -= amount;
      if (this.hp < 0) this.hp = 0;

      // Activate invincibility
      this.isInvincible = true;
      this.invincibleTimer = this.INVINCIBLE_DURATION;
  }

  public get invincible(): boolean {
      return this.isInvincible;
  }
}
