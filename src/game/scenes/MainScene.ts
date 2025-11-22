import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Bullet } from '../objects/Bullet';
import { Enemy } from '../objects/Enemy';
import { Boss } from '../objects/Boss';
import { Item, ItemType } from '../objects/Item';
import { soundManager } from '../utils/SoundManager';

interface GameState {
    score: number;
    hp: number;
    bombs: number;
    weaponLevel: number;
    stage: number;
}

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;

  private score: number = 0;
  private stage: number = 1;

  private scoreText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private bombText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;

  private gameTime: number = 0;
  private stageDuration: number = 30000; // 30 seconds for Stage 1
  private bossSpawned: boolean = false;

  // Difficulty Multipliers
  private spawnRate: number = 0.02;
  private enemySpeedMult: number = 1;

  constructor() {
    super('MainScene');
  }

  init(data: Partial<GameState>) {
      this.score = data.score || 0;
      this.stage = data.stage || 1;
      // Ensure we don't reset to default if 0 is passed (which is falsy but valid for HP/Bombs potentially, though HP 0 is dead)
      this.registry.set('initialHp', data.hp !== undefined ? data.hp : 100);
      this.registry.set('initialBombs', data.bombs !== undefined ? data.bombs : 3);
      this.registry.set('initialWeaponLevel', data.weaponLevel !== undefined ? data.weaponLevel : 1);
      
      console.log('Stage Init:', { stage: this.stage, hp: data.hp, bombs: data.bombs, weapon: data.weaponLevel });
  }

  create() {
    this.gameTime = 0;
    this.bossSpawned = false;

    // Difficulty Scaling
    // Stage 1: Base
    // Stage 2: +20% speed, +20% spawn
    // Stage 3: +40% speed, +40% spawn
    // Exponential scaling for higher stages
    const difficultyMult = Math.pow(1.2, this.stage - 1);
    this.spawnRate = 0.02 * difficultyMult;
    this.enemySpeedMult = difficultyMult;

    soundManager.playBGM();

    // --- Background ---
    const bgTexture = `bg_stage${this.stage > 6 ? 6 : this.stage}`;
    const bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, bgTexture).setOrigin(0);
    // Scroll background
    this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1000,
        repeat: -1,
        onUpdate: (tween) => {
            bg.tilePositionY -= 2 * this.enemySpeedMult; // Scroll speed matches enemy speed scaling
        }
    });

    // --- Object Pooling ---
    this.bullets = this.physics.add.group({
        classType: Bullet,
        maxSize: 30,
        runChildUpdate: true
    });

    this.enemyBullets = this.physics.add.group({
        classType: Bullet,
        maxSize: 100,
        runChildUpdate: true
    });

    this.enemies = this.physics.add.group({
        classType: Enemy,
        maxSize: 50,
        runChildUpdate: true
    });

    this.items = this.physics.add.group({
        classType: Item,
        maxSize: 20,
        runChildUpdate: true
    });

    // --- Player ---
    const initialHp = this.registry.get('initialHp');
    const initialBombs = this.registry.get('initialBombs');
    const initialWeaponLevel = this.registry.get('initialWeaponLevel');
    
    this.player = new Player(this, this.scale.width / 2, this.scale.height - 100, initialHp, initialBombs, initialWeaponLevel);

    // --- Collisions ---
    this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.handlePlayerBulletCollision, undefined, this);
    this.physics.add.overlap(this.player, this.items, this.handlePlayerItemCollision, undefined, this);

    // --- UI ---
    this.createHUD();

    // Show Stage Title
    const stageTitle = this.add.text(this.scale.width/2, this.scale.height/2, `Stage ${this.stage}\nCommuter Rush`, {
        fontSize: '32px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
    this.time.delayedCall(2000, () => stageTitle.destroy());
  }

  update(time: number, delta: number) {
    if (!this.player.active) {
        this.scene.start('GameOverScene', {
            score: this.score,
            stage: this.stage,
            reason: 'GAME OVER'
        });
        return;
    }

    this.player.update(time, delta);
    this.updateHUD();

    // --- Stage Logic ---
    this.gameTime += delta;

    if (this.gameTime < this.stageDuration) {
        if (Math.random() < this.spawnRate) {
            this.spawnEnemy();
        }
    } else if (!this.bossSpawned) {
        this.spawnBoss();
        this.bossSpawned = true;
    }
  }

  // --- Core Logic ---

  public fireBullet(x: number, y: number) {
      const bullet = this.bullets.get(x, y);
      if (bullet) {
          bullet.fire(x, y);
          soundManager.playShoot();
      }
  }

  public fireEnemyBullet(x: number, y: number, velocityX: number = 0, velocityY: number = 300) {
      const bullet = this.enemyBullets.get(x, y);
      if (bullet) {
          bullet.enableBody(true, x, y, true, true);
          bullet.setActive(true);
          bullet.setVisible(true);
          // Scale bullet speed with stage
          const speedMult = 1 + ((this.stage - 1) * 0.1);
          bullet.setVelocity(velocityX * speedMult, velocityY * speedMult);
          bullet.setTint(0xff0000); // Red for enemy bullets
      }
  }

  public triggerBomb() {
      this.enemies.getChildren().forEach((child) => {
          const enemy = child as Enemy;
          if (enemy.active) {
              enemy.die();
              this.addScore(enemy.scoreValue);
              soundManager.playExplosion();
          }
      });

      const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff);
      flash.setOrigin(0);
      flash.setAlpha(0.8);
      this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy()
      });
  }

  private spawnEnemy() {
      const x = Phaser.Math.Between(20, this.scale.width - 20);
      const enemy = this.enemies.get(x, -50);
      if (enemy) {
          // Pass stage info to scale difficulty (speed)
          enemy.spawn(x, -50, this.stage);
          // Apply speed multiplier from scene (redundant if Enemy uses stage, but good for fine tuning)
          // Enemy.spawn uses stage to set speed, so we rely on that.
          
          enemy.off('died');
          enemy.on('died', (score: number) => {
              this.addScore(score);
              this.spawnItem(enemy.x, enemy.y);
          });
      }
  }

  private spawnBoss() {
      const boss = new Boss(this, this.scale.width / 2, -100);
      this.enemies.add(boss);
      boss.spawn(this.scale.width / 2, -100, this.stage);
      boss.on('died', (score: number) => {
          this.addScore(score);
          this.stageClear();
      });
  }

  private spawnItem(x: number, y: number) {
      if (Math.random() < 0.3) { // 30% chance
          const rand = Math.random();
          let type: ItemType = 'SCORE';
          if (rand < 0.5) type = 'SCORE';
          else if (rand < 0.7) type = 'POWERUP';
          else if (rand < 0.9) type = 'HEAL';
          else type = 'BOMB';

          const item = this.items.get(x, y, type);
          if (item) {
              item.setActive(true);
              item.setVisible(true);
              item.body.reset(x, y);
              item.setVelocityY(100);
          }
      }
  }

  private stageClear() {
      this.add.text(this.scale.width/2, this.scale.height/2, "STAGE CLEAR", {fontSize: '32px', color: '#ffff00', stroke: '#000', strokeThickness: 4}).setOrigin(0.5);

      // Save Progress
      const nextStage = this.stage + 1;
      const saveData: GameState = {
          score: this.score,
          hp: this.player.hp,
          bombs: this.player.bombs,
          weaponLevel: this.player.weaponLevel,
          stage: nextStage
      };
      localStorage.setItem('shachiku_save', JSON.stringify(saveData));

      this.time.delayedCall(3000, () => {
           if (nextStage > 6) {
               // All Clear
               this.scene.start('GameOverScene', {
                   score: this.score,
                   stage: 6,
                   reason: 'ALL CLEAR! 伝説の社畜'
               });
           } else {
               // Seamless transition?
               // Ideally we fade out and restart scene with new data
               this.cameras.main.fade(1000, 0, 0, 0);
               this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                   this.scene.restart(saveData);
               });
           }
      });
  }

  private handleBulletEnemyCollision(obj1: any, obj2: any) {
      const bullet = obj1 as Bullet;
      const enemy = obj2 as Enemy;

      if (bullet.active && enemy.active) {
          bullet.setActive(false);
          bullet.setVisible(false);
          enemy.takeDamage(1);
          soundManager.playExplosion();
      }
  }

  private handlePlayerEnemyCollision(obj1: any, obj2: any) {
      const player = obj1 as Player;
      const enemy = obj2 as Enemy;

      if (player.active && enemy.active) {
          soundManager.playDamage();
          if (enemy instanceof Boss) {
               player.takeDamage(10);
               player.y += 50;
          } else {
               enemy.die();
               player.takeDamage(20);
          }
      }
  }

  private handlePlayerBulletCollision(obj1: any, obj2: any) {
      const player = obj1 as Player;
      const bullet = obj2 as Bullet;

      if (player.active && bullet.active) {
          bullet.setActive(false);
          bullet.setVisible(false);
          player.takeDamage(10);
          soundManager.playDamage();
      }
  }

  private handlePlayerItemCollision(obj1: any, obj2: any) {
      const player = obj1 as Player;
      const item = obj2 as Item;

      if (player.active && item.active) {
          item.destroy();
          soundManager.playPowerUp();

          switch (item.itemType) {
              case 'SCORE':
                  this.addScore(item.value);
                  break;
              case 'POWERUP':
                  player.upgradeWeapon();
                  this.addScore(500);
                  break;
              case 'HEAL':
                  player.heal(item.value);
                  break;
              case 'BOMB':
                  player.addBomb();
                  break;
          }
      }
  }

  // --- UI & Score ---

  private createHUD() {
      // Score
      this.scoreText = this.add.text(10, 10, '残業代: 0', { fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 });
      
      // Health Bar
      this.add.text(10, 35, 'メンタル:', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 });
      this.add.rectangle(10, 55, 104, 14, 0xffffff).setOrigin(0); // Border
      this.add.rectangle(12, 57, 100, 10, 0x000000).setOrigin(0); // Background
      this.hpText = this.add.text(120, 35, '100%', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 });
      
      // Bomb
      this.bombText = this.add.text(10, 80, '有給: 3', { fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 });
      
      // Stage
      this.stageText = this.add.text(this.scale.width - 80, 10, `Stage ${this.stage}`, { fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 });

      // Mobile Controls
      
      // Bomb Button (Right side)
      const bombBtn = this.add.circle(this.scale.width - 40, this.scale.height - 40, 30, 0xff0000).setInteractive();
      bombBtn.setAlpha(0.6);
      const bombIcon = this.add.text(this.scale.width - 40, this.scale.height - 40, '有給', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
      
      bombBtn.on('pointerdown', () => {
          if (this.player.active) {
              this.player.useBomb();
          }
      });

      // Fire Button (Left side)
      // User requested: "Separate move button and bullet button".
      // Assuming touch movement is drag anywhere, or maybe a virtual joystick?
      // For now, let's add a dedicated Fire button on the left.
      const fireBtn = this.add.circle(50, this.scale.height - 40, 30, 0x0000ff).setInteractive();
      fireBtn.setAlpha(0.6);
      const fireIcon = this.add.text(50, this.scale.height - 40, 'Fire', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);

      fireBtn.on('pointerdown', () => {
          if (this.player.active) {
              this.player.setFiring(true);
          }
      });
      fireBtn.on('pointerup', () => {
          if (this.player.active) {
              this.player.setFiring(false);
          }
      });
      fireBtn.on('pointerout', () => {
          if (this.player.active) {
              this.player.setFiring(false);
          }
      });
  }

  private updateHUD() {
      this.scoreText.setText(`残業代: ${this.score}`);
      this.bombText.setText(`有給: ${this.player.bombs}`);
      
      // Update HP Bar
      const hpPercent = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
      this.hpText.setText(`${Math.floor(hpPercent * 100)}%`);
      
      // Redraw HP bar
      if (!this.registry.get('hpBar')) {
           this.registry.set('hpBar', this.add.rectangle(12, 57, 100, 10, 0x00ff00).setOrigin(0));
      }
      const bar = this.registry.get('hpBar') as Phaser.GameObjects.Rectangle;
      bar.width = 100 * hpPercent;
      
      // Color change based on HP
      if (hpPercent < 0.3) bar.fillColor = 0xff0000;
      else if (hpPercent < 0.6) bar.fillColor = 0xffff00;
      else bar.fillColor = 0x00ff00;
  }

  private addScore(amount: number) {
      this.score += amount;
  }
}
