import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Bullet } from '../objects/Bullet';
import { Enemy, EnemyType } from '../objects/Enemy';
import { Boss } from '../objects/Boss';
import { Item, ItemType } from '../objects/Item';
import { soundManager } from '../utils/SoundManager';

interface GameState {
    score: number;
    hp: number;
    bombs: number;
    weaponLevel: number;
    stage: number;
    weaponType?: 'NORMAL' | 'LASER' | 'FLAME' | 'MISSILE' | 'SHOTGUN' | 'BEAM';
}

interface StageConfig {
    title: string;
    spawnRate: number;
    enemyTypes: EnemyType[];
}

// Stage Configuration
const STAGE_CONFIG: StageConfig[] = [
    { 
        title: "朝の通勤ラッシュ\n電車に駆け込め！", 
        spawnRate: 0.02, // Very easy start
        enemyTypes: ['COMMUTER']
    },
    { 
        title: "朝礼\n社長の話を聞け！", 
        spawnRate: 0.03, 
        enemyTypes: ['COMMUTER', 'EMAIL']
    },
    { 
        title: "メールの嵐\n全員に返信！", 
        spawnRate: 0.03, // Reduced from 0.04
        enemyTypes: ['EMAIL', 'PHONE', 'GHOST']
    },
    { 
        title: "中間管理職\n承認地獄！", 
        spawnRate: 0.04, // Reduced from 0.06
        enemyTypes: ['PHONE', 'MANAGER', 'HEADHUNTER']
    },
    { 
        title: "システム障害\n致命的なエラー！", 
        spawnRate: 0.05, // Reduced from 0.08
        enemyTypes: ['BUG', 'MANAGER', 'DRONE', 'GHOST']
    },
    { 
        title: "ブラック企業\n最終決戦！", 
        spawnRate: 0.06, // Reduced from 0.12
        enemyTypes: ['BLACK_COMPANY', 'BUG', 'HEADHUNTER', 'MANAGER']
    }
];

const TITLES = [
    "インターン",           // Start
    "正社員", // Clear Stage 1
    "係長",            // Clear Stage 2
    "課長",          // Clear Stage 3
    "部長",  // Clear Stage 4
    "役員",        // Clear Stage 5
    "社長"         // Clear Stage 6
];

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
  private rankText!: Phaser.GameObjects.Text;

  private gameTime: number = 0;
  private stageDuration: number = 45000; // Increased duration per stage
  private bossSpawned: boolean = false;

  // Difficulty Multipliers
  private spawnRate: number = 0.05;
  private enemySpeedMult: number = 1;

  constructor() {
    super('MainScene');
  }

  init(data: Partial<GameState>) {
      this.score = data.score || 0;
      this.stage = data.stage || 1;

      this.registry.set('initialHp', data.hp !== undefined ? data.hp : 100);
      this.registry.set('initialBombs', data.bombs !== undefined ? data.bombs : 3);
      this.registry.set('initialWeaponLevel', data.weaponLevel !== undefined ? data.weaponLevel : 1);
      this.registry.set('initialWeaponType', data.weaponType || 'NORMAL');
  }

  create() {
    this.gameTime = 0;
    this.bossSpawned = false;

    // Difficulty Scaling
    // Gradual scaling: 1.0 -> 1.1 -> 1.2 ...
    const difficultyMult = 1 + ((this.stage - 1) * 0.1);

    // Use Config or fallback
    const config = STAGE_CONFIG[this.stage - 1] || STAGE_CONFIG[STAGE_CONFIG.length - 1];
    this.spawnRate = config.spawnRate;
    this.enemySpeedMult = difficultyMult;

    soundManager.playBGM();

    // --- Background ---
    const bgTexture = `bg_stage${this.stage > 6 ? 6 : this.stage}`;
    const bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, bgTexture).setOrigin(0);
    bg.setDepth(-10);

    this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 1000,
        repeat: -1,
        onUpdate: (tween) => {
            bg.tilePositionY -= (2 + (this.stage * 0.5)) * this.enemySpeedMult;
        }
    });

    // --- Object Pooling ---
    // Increased limits for "Rush" feel
    this.bullets = this.physics.add.group({
        classType: Bullet,
        maxSize: 50,
        runChildUpdate: true
    });
    this.bullets.setDepth(30);

    this.enemyBullets = this.physics.add.group({
        classType: Bullet,
        maxSize: 200, // Bullet hell!
        runChildUpdate: true
    });
    this.enemyBullets.setDepth(30);

    this.enemies = this.physics.add.group({
        classType: Enemy,
        maxSize: 100, // More enemies
        runChildUpdate: true
    });
    this.enemies.setDepth(10);

    this.items = this.physics.add.group({
        classType: Item,
        maxSize: 30,
        runChildUpdate: true
    });
    this.items.setDepth(5);

    // --- Player ---
    const initialHp = this.registry.get('initialHp');
    const initialBombs = this.registry.get('initialBombs');
    const initialWeaponLevel = this.registry.get('initialWeaponLevel');
    
    this.player = new Player(this, this.scale.width / 2, this.scale.height - 100, initialHp, initialBombs, initialWeaponLevel);
    this.player.setWeaponType(this.registry.get('initialWeaponType'));
    this.player.setDepth(20);

    // --- Collisions ---
    this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.handlePlayerBulletCollision, undefined, this);
    this.physics.add.overlap(this.player, this.items, this.handlePlayerItemCollision, undefined, this);

    // --- UI ---
    this.createHUD();

    // Show Stage Title
    const stageConfig = STAGE_CONFIG[this.stage - 1] || { title: `Stage ${this.stage}` };
    const stageTitle = this.add.text(this.scale.width/2, this.scale.height/2, `Stage ${this.stage}\n${stageConfig.title}`, {
        fontSize: '32px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
    stageTitle.setDepth(100);
    this.time.delayedCall(3000, () => stageTitle.destroy());
  }

  update(time: number, delta: number) {
    if (!this.player.active) {
        this.scene.start('GameOverScene', {
            score: this.score,
            stage: this.stage,
            reason: 'ゲームオーバー\n(Game Over)'
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
        // Kill all existing mobs before boss?
        // Maybe not, keep the chaos.
        this.spawnBoss();
        this.bossSpawned = true;
    }
  }

  // --- Core Logic ---

  public fireBullet(x: number, y: number, type: 'NORMAL' | 'LASER' | 'FLAME' | 'MISSILE' | 'SHOTGUN' | 'BEAM' = 'NORMAL', angle: number = -90) {
      const bullet = this.bullets.get(x, y);
      if (bullet) {
          bullet.fire(x, y, type, angle);
          soundManager.playShoot();
          // Recoil effect
          this.cameras.main.shake(50, 0.002);
      }
  }

  public fireEnemyBullet(x: number, y: number, velocityX: number = 0, velocityY: number = 300) {
      const bullet = this.enemyBullets.get(x, y);
      if (bullet) {
          bullet.fireEnemy(x, y, velocityX, velocityY);
      }
  }

  public triggerBomb() {
      this.enemies.getChildren().forEach((child) => {
          const enemy = child as Enemy;
          if (enemy.active) {
              // Bosses take damage but don't die instantly
              if (enemy instanceof Boss) {
                  enemy.takeDamage(50);
              } else {
                  enemy.die();
                  this.addScore(enemy.scoreValue);
              }
          }
      });

      // Clear enemy bullets
      this.enemyBullets.clear(true, true);

      soundManager.playExplosion();
      this.cameras.main.shake(300, 0.02); // Big shake for bomb

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
          // Pick random enemy type from current stage config
          const config = STAGE_CONFIG[this.stage - 1] || STAGE_CONFIG[STAGE_CONFIG.length - 1];
          const types = config.enemyTypes;
          const type = types[Phaser.Math.Between(0, types.length - 1)];

          enemy.spawn(x, -50, this.stage, type);
          
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
      // Correctly pass the current stage to spawn
      boss.spawn(this.scale.width / 2, -100, this.stage);
      boss.on('died', (score: number) => {
          this.addScore(score);
          this.stageClear();
      });

      // Boss warning
      const warning = this.add.text(this.scale.width/2, this.scale.height/3, "警告\nボス接近中", {
          fontSize: '40px', color: '#ff0000', align: 'center', stroke: '#000', strokeThickness: 6
      }).setOrigin(0.5);
      this.tweens.add({
          targets: warning,
          alpha: 0,
          duration: 500,
          yoyo: true,
          repeat: 5,
          onComplete: () => warning.destroy()
      });
  }

  private spawnItem(x: number, y: number) {
      // Chance to drop item
      if (Math.random() < 0.2) {
          const rand = Math.random();
          let type: ItemType = 'SCORE';

          // Weapon drops (rare)
          if (rand < 0.03) type = 'WEAPON_LASER';
          else if (rand < 0.06) type = 'WEAPON_FLAME';
          else if (rand < 0.09) type = 'WEAPON_MISSILE';
          else if (rand < 0.12) type = 'WEAPON_SHOTGUN';
          else if (rand < 0.15) type = 'WEAPON_BEAM';
          else if (rand < 0.5) type = 'SCORE';
          else if (rand < 0.7) type = 'POWERUP';
          else if (rand < 0.9) type = 'HEAL';
          else type = 'BOMB';

          const item = this.items.get(x, y, type);
          if (item) {
              item.setActive(true);
              item.setVisible(true);
              item.body.reset(x, y);
              item.setVelocityY(150);
          }
      }
  }

  private stageClear() {
      this.add.text(this.scale.width/2, this.scale.height/2, "ステージクリア", {fontSize: '32px', color: '#ffff00', stroke: '#000', strokeThickness: 4}).setOrigin(0.5);

      const nextStage = this.stage + 1;

      // Determine Title
      const titleIndex = Math.min(this.stage, TITLES.length - 1);
      const newTitle = TITLES[titleIndex];

      const saveData: GameState = {
          score: this.score,
          hp: this.player.hp,
          bombs: this.player.bombs,
          weaponLevel: this.player.weaponLevel,
          weaponType: this.player.weaponType,
          stage: nextStage
      };
      localStorage.setItem('shachiku_save', JSON.stringify(saveData));

      this.time.delayedCall(4000, () => {
           if (nextStage > 6) {
               // All Clear
               this.scene.start('GameOverScene', {
                   score: this.score,
                   stage: 6,
                   reason: '完全攻略！\n伝説の社畜 (Legendary Salaryman)'
               });
           } else {
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
          enemy.takeDamage(bullet.damage);

          // Laser doesn't destroy itself immediately (piercing), but we don't want it to kill the same enemy every frame
          // Arcade Physics overlap runs every frame.
          // To make laser pierce effectively without multi-hitting the same target instantly:
          // We could use an immunity timer on enemy or check overlap only once.
          // For simplicity: Normal bullets die. Laser bullets stay alive.

          if (bullet.bulletType !== 'LASER') {
              bullet.setActive(false);
              bullet.setVisible(false);
              soundManager.playExplosion(); // Mini explosion sound
              // Particle effect
              const particles = this.add.particles(bullet.x, bullet.y, 'bullet', {
                  speed: 100,
                  scale: { start: 0.5, end: 0 },
                  lifespan: 200,
                  blendMode: 'ADD'
              });
              this.time.delayedCall(200, () => particles.destroy());
          } else {
               // Laser visual effect hit?
          }
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
               // Push back
          } else {
               enemy.die();
               player.takeDamage(15);
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
          this.cameras.main.shake(200, 0.01);
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
              case 'WEAPON_LASER':
                  player.setWeaponType('LASER');
                  this.addScore(1000);
                  break;
              case 'WEAPON_FLAME':
                  player.setWeaponType('FLAME');
                  this.addScore(1000);
                  break;
              case 'WEAPON_MISSILE':
                  player.setWeaponType('MISSILE');
                  this.addScore(1000);
                  break;
              case 'WEAPON_SHOTGUN':
                  player.setWeaponType('SHOTGUN');
                  this.addScore(1000);
                  break;
              case 'WEAPON_BEAM':
                  player.setWeaponType('BEAM');
                  this.addScore(1000);
                  break;
          }
      }
  }

  // --- UI & Score ---

  private createHUD() {
      // Rank
      const currentTitle = TITLES[Math.min(this.stage - 1, TITLES.length - 1)];
      this.rankText = this.add.text(10, 10, `役職: ${currentTitle}`, { fontSize: '14px', color: '#ffff00', stroke: '#000', strokeThickness: 3 });

      // Score
      this.scoreText = this.add.text(10, 30, '残業代: 0', { fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 });
      
      // Health Bar
      this.add.text(10, 55, 'メンタル:', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 });
      this.add.rectangle(10, 75, 104, 14, 0xffffff).setOrigin(0);
      this.add.rectangle(12, 77, 100, 10, 0x000000).setOrigin(0);
      this.hpText = this.add.text(120, 55, '100%', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 });
      
      // Bomb
      this.bombText = this.add.text(10, 95, '有給: 3', { fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 });
      
      // Stage
      this.stageText = this.add.text(this.scale.width - 100, 10, `Stage ${this.stage}`, { fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 });

      // Mobile Controls
      const bombBtn = this.add.circle(this.scale.width - 40, this.scale.height - 40, 30, 0xff0000).setInteractive();
      bombBtn.setAlpha(0.6);
      this.add.text(this.scale.width - 40, this.scale.height - 40, '有給', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
      
      bombBtn.on('pointerdown', () => {
          if (this.player.active) {
              this.player.useBomb();
          }
      });

      const fireBtn = this.add.circle(50, this.scale.height - 40, 30, 0x0000ff).setInteractive();
      fireBtn.setAlpha(0.6);
      this.add.text(50, this.scale.height - 40, 'Fire', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);

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
      
      const hpPercent = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
      this.hpText.setText(`${Math.floor(hpPercent * 100)}%`);
      
      if (!this.registry.get('hpBar')) {
           this.registry.set('hpBar', this.add.rectangle(12, 77, 100, 10, 0x00ff00).setOrigin(0));
      }
      const bar = this.registry.get('hpBar') as Phaser.GameObjects.Rectangle;
      bar.width = 100 * hpPercent;
      
      if (hpPercent < 0.3) bar.fillColor = 0xff0000;
      else if (hpPercent < 0.6) bar.fillColor = 0xffff00;
      else bar.fillColor = 0x00ff00;
  }

  private addScore(amount: number) {
      this.score += amount;
  }
}
