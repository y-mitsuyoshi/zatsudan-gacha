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
        spawnRate: 0.02,
        enemyTypes: ['COMMUTER']
    },
    { 
        title: "朝礼\n社長の話を聞け！", 
        spawnRate: 0.03, 
        enemyTypes: ['COMMUTER', 'EMAIL']
    },
    { 
        title: "メールの嵐\n全員に返信！", 
        spawnRate: 0.03,
        enemyTypes: ['EMAIL', 'PHONE', 'GHOST']
    },
    { 
        title: "中間管理職\n承認地獄！", 
        spawnRate: 0.04,
        enemyTypes: ['PHONE', 'MANAGER', 'HEADHUNTER']
    },
    { 
        title: "システム障害\n致命的なエラー！", 
        spawnRate: 0.05,
        enemyTypes: ['BUG', 'MANAGER', 'DRONE', 'GHOST']
    },
    { 
        title: "ブラック企業\n最終決戦！", 
        spawnRate: 0.06,
        enemyTypes: ['BLACK_COMPANY', 'BUG', 'HEADHUNTER', 'MANAGER']
    }
];

const TITLES = [
    "インターン",
    "正社員",
    "係長",
    "課長",
    "部長",
    "役員",
    "社長"
];

export class MainScene extends Phaser.Scene {
  public player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  public enemies!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;

  private score: number = 0;
  private stage: number = 1;

  private scoreText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private bombText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private rankText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;

  private gameTime: number = 0;
  private stageDuration: number = 45000;
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
        onUpdate: () => {
            bg.tilePositionY -= (2 + (this.stage * 0.5)) * this.enemySpeedMult;
        }
    });

    // --- Object Pooling ---
    this.bullets = this.physics.add.group({
        classType: Bullet,
        maxSize: 50,
        runChildUpdate: true
    });
    this.bullets.setDepth(30);

    this.enemyBullets = this.physics.add.group({
        classType: Bullet,
        maxSize: 200,
        runChildUpdate: true
    });
    this.enemyBullets.setDepth(30);

    this.enemies = this.physics.add.group({
        classType: Enemy,
        maxSize: 100,
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
      this.cameras.main.shake(300, 0.02);

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
      boss.spawn(this.scale.width / 2, -100, this.stage);
      boss.on('died', (score: number) => {
          this.addScore(score);
          this.stageClear();
      });

      // Boss HP bar
      this.createBossHPBar(boss);

      // Boss warning
      const warning = this.add.text(this.scale.width/2, this.scale.height/3, "⚠ 警告 ⚠\nボス接近中", {
          fontSize: '40px', color: '#ff0000', align: 'center', stroke: '#000', strokeThickness: 6
      }).setOrigin(0.5);
      warning.setDepth(100);
      this.tweens.add({
          targets: warning,
          alpha: 0,
          duration: 500,
          yoyo: true,
          repeat: 5,
          onComplete: () => warning.destroy()
      });
  }

  private createBossHPBar(boss: Boss) {
      const barWidth = 200;
      const barHeight = 12;
      const barX = this.scale.width / 2 - barWidth / 2;
      const barY = 120;

      const barBg = this.add.rectangle(barX, barY, barWidth + 4, barHeight + 4, 0x000000).setOrigin(0);
      barBg.setDepth(50);
      const barFill = this.add.rectangle(barX + 2, barY + 2, barWidth, barHeight, 0xff0000).setOrigin(0);
      barFill.setDepth(51);
      const bossLabel = this.add.text(this.scale.width / 2, barY - 14, 'BOSS', {
          fontSize: '14px', color: '#ff4444', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5);
      bossLabel.setDepth(50);

      // Update the bar each frame
      const updateEvent = this.time.addEvent({
          delay: 50,
          loop: true,
          callback: () => {
              if (!boss.active) {
                  barBg.destroy();
                  barFill.destroy();
                  bossLabel.destroy();
                  updateEvent.destroy();
                  return;
              }
              const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
              barFill.width = barWidth * ratio;
              if (ratio < 0.3) barFill.fillColor = 0xff0000;
              else if (ratio < 0.6) barFill.fillColor = 0xffaa00;
              else barFill.fillColor = 0xff4444;
          }
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

          const item = this.items.get(x, y) as Item | null;
          if (item) {
              item.spawn(x, y, type);
          }
      }
  }

  private stageClear() {
      const clearText = this.add.text(this.scale.width/2, this.scale.height/2, "ステージクリア！", {
          fontSize: '36px', color: '#ffff00', stroke: '#000', strokeThickness: 4,
          fontStyle: 'bold'
      }).setOrigin(0.5);
      clearText.setDepth(100);

      // Animate the clear text
      this.tweens.add({
          targets: clearText,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 500,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut'
      });

      const nextStage = this.stage + 1;

      const titleIndex = Math.min(this.stage, TITLES.length - 1);
      const newTitle = TITLES[titleIndex];

      // Show promotion
      this.time.delayedCall(1500, () => {
          const promo = this.add.text(this.scale.width/2, this.scale.height/2 + 50, `昇進: ${newTitle}`, {
              fontSize: '24px', color: '#00ff00', stroke: '#000', strokeThickness: 3
          }).setOrigin(0.5);
          promo.setDepth(100);
      });

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

          if (bullet.bulletType !== 'LASER') {
              bullet.setActive(false);
              bullet.setVisible(false);
              soundManager.playExplosion();
              // Particle effect
              const particles = this.add.particles(bullet.x, bullet.y, 'bullet', {
                  speed: 100,
                  scale: { start: 0.5, end: 0 },
                  lifespan: 200,
                  blendMode: 'ADD'
              });
              this.time.delayedCall(200, () => particles.destroy());
          }
      }
  }

  private handlePlayerEnemyCollision(obj1: any, obj2: any) {
      const player = obj1 as Player;
      const enemy = obj2 as Enemy;

      if (player.active && enemy.active && !player.invincible) {
          soundManager.playDamage();
          if (enemy instanceof Boss) {
               player.takeDamage(10);
               player.y += 50;
          } else {
               enemy.die();
               player.takeDamage(15);
          }
      }
  }

  private handlePlayerBulletCollision(obj1: any, obj2: any) {
      const player = obj1 as Player;
      const bullet = obj2 as Bullet;

      if (player.active && bullet.active && !player.invincible) {
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
          item.setActive(false);
          item.setVisible(false);
          soundManager.playPowerUp();

          switch (item.itemType) {
              case 'SCORE':
                  this.addScore(item.value);
                  this.showPickupText(item.x, item.y, `+${item.value}`, '#ffff00');
                  break;
              case 'POWERUP':
                  player.upgradeWeapon();
                  this.addScore(500);
                  this.showPickupText(item.x, item.y, 'POWER UP!', '#00ff00');
                  break;
              case 'HEAL':
                  player.heal(item.value);
                  this.showPickupText(item.x, item.y, `+${item.value} HP`, '#00ffff');
                  break;
              case 'BOMB':
                  player.addBomb();
                  this.showPickupText(item.x, item.y, '+1 有給', '#ff00ff');
                  break;
              case 'WEAPON_LASER':
                  player.setWeaponType('LASER');
                  this.addScore(1000);
                  this.showPickupText(item.x, item.y, 'LASER!', '#00ffff');
                  break;
              case 'WEAPON_FLAME':
                  player.setWeaponType('FLAME');
                  this.addScore(1000);
                  this.showPickupText(item.x, item.y, 'FLAME!', '#ff4500');
                  break;
              case 'WEAPON_MISSILE':
                  player.setWeaponType('MISSILE');
                  this.addScore(1000);
                  this.showPickupText(item.x, item.y, 'MISSILE!', '#ff00ff');
                  break;
              case 'WEAPON_SHOTGUN':
                  player.setWeaponType('SHOTGUN');
                  this.addScore(1000);
                  this.showPickupText(item.x, item.y, 'SHOTGUN!', '#ffff00');
                  break;
              case 'WEAPON_BEAM':
                  player.setWeaponType('BEAM');
                  this.addScore(1000);
                  this.showPickupText(item.x, item.y, 'BEAM!', '#00ffff');
                  break;
          }
      }
  }

  private showPickupText(x: number, y: number, text: string, color: string) {
      const t = this.add.text(x, y, text, {
          fontSize: '16px', color: color, stroke: '#000', strokeThickness: 3, fontStyle: 'bold'
      }).setOrigin(0.5);
      t.setDepth(60);
      this.tweens.add({
          targets: t,
          y: y - 40,
          alpha: 0,
          duration: 800,
          onComplete: () => t.destroy()
      });
  }

  // --- UI & Score ---

  private createHUD() {
      const hudDepth = 40;

      // Rank
      const currentTitle = TITLES[Math.min(this.stage - 1, TITLES.length - 1)];
      this.rankText = this.add.text(10, 10, `役職: ${currentTitle}`, { fontSize: '14px', color: '#ffff00', stroke: '#000', strokeThickness: 3 });
      this.rankText.setDepth(hudDepth);

      // Score
      this.scoreText = this.add.text(10, 30, '残業代: 0', { fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 });
      this.scoreText.setDepth(hudDepth);
      
      // Health Bar
      const hpLabel = this.add.text(10, 55, 'メンタル:', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 });
      hpLabel.setDepth(hudDepth);
      const hpBarBg = this.add.rectangle(10, 75, 104, 14, 0xffffff).setOrigin(0);
      hpBarBg.setDepth(hudDepth);
      this.add.rectangle(12, 77, 100, 10, 0x000000).setOrigin(0).setDepth(hudDepth);
      this.hpBar = this.add.rectangle(12, 77, 100, 10, 0x00ff00).setOrigin(0);
      this.hpBar.setDepth(hudDepth + 1);
      this.hpText = this.add.text(120, 55, '100%', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 });
      this.hpText.setDepth(hudDepth);
      
      // Bomb
      this.bombText = this.add.text(10, 95, '有給: 3', { fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 });
      this.bombText.setDepth(hudDepth);

      // Weapon indicator
      this.weaponText = this.add.text(10, 115, '武器: NORMAL', { fontSize: '14px', color: '#aaffaa', stroke: '#000', strokeThickness: 3 });
      this.weaponText.setDepth(hudDepth);
      
      // Stage
      this.stageText = this.add.text(this.scale.width - 10, 10, `Stage ${this.stage}`, { 
          fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4 
      }).setOrigin(1, 0);
      this.stageText.setDepth(hudDepth);

      // Mobile Controls
      const btnSize = 35;
      const btnY = this.scale.height - 50;

      const bombBtn = this.add.circle(this.scale.width - 50, btnY, btnSize, 0xff0000).setInteractive();
      bombBtn.setAlpha(0.6);
      bombBtn.setDepth(hudDepth);
      const bombLabel = this.add.text(this.scale.width - 50, btnY, '有給', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
      bombLabel.setDepth(hudDepth + 1);
      
      bombBtn.on('pointerdown', () => {
          if (this.player.active) {
              this.player.useBomb();
          }
      });

      // Fire button (for mobile - auto fire handles PC)
      const fireBtn = this.add.circle(50, btnY, btnSize, 0x0000ff).setInteractive();
      fireBtn.setAlpha(0.6);
      fireBtn.setDepth(hudDepth);
      const fireLabel = this.add.text(50, btnY, 'Fire', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
      fireLabel.setDepth(hudDepth + 1);

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
      this.scoreText.setText(`残業代: ${this.score.toLocaleString()}`);
      this.bombText.setText(`有給: ${this.player.bombs}`);
      this.weaponText.setText(`武器: ${this.player.weaponType} Lv.${this.player.weaponLevel}`);
      
      const hpPercent = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
      this.hpText.setText(`${Math.floor(hpPercent * 100)}%`);
      
      this.hpBar.width = 100 * hpPercent;
      
      if (hpPercent < 0.3) this.hpBar.fillColor = 0xff0000;
      else if (hpPercent < 0.6) this.hpBar.fillColor = 0xffff00;
      else this.hpBar.fillColor = 0x00ff00;
  }

  private addScore(amount: number) {
      this.score += amount;
  }
}
