import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Bullet } from '../objects/Bullet';
import { Enemy } from '../objects/Enemy';
import { Boss } from '../objects/Boss';

interface GameState {
    score: number;
    hp: number;
    bombs: number;
    stage: number;
}

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;

  private score: number = 0;
  private stage: number = 1;

  private scoreText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private bombText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;

  private gameTime: number = 0;
  private stageDuration: number = 30000; // 30 seconds for Stage 1
  private bossSpawned: boolean = false;

  constructor() {
    super('MainScene');
  }

  init(data: Partial<GameState>) {
      this.score = data.score || 0;
      this.stage = data.stage || 1;
      // HP and Bombs are set on Player init, but if we want to carry over:
      // We'll pass them to player or set them after creation.
      // For now, let's assume full HP on new stage?
      // PRD says "Continue" -> "Each stage clear... save".
      // Usually you keep status.
      this.registry.set('initialHp', data.hp !== undefined ? data.hp : 100);
      this.registry.set('initialBombs', data.bombs !== undefined ? data.bombs : 3);
  }

  create() {
    this.gameTime = 0;
    this.bossSpawned = false;

    // --- Object Pooling ---
    this.bullets = this.physics.add.group({
        classType: Bullet,
        maxSize: 30,
        runChildUpdate: true
    });

    this.enemies = this.physics.add.group({
        classType: Enemy,
        maxSize: 50,
        runChildUpdate: true
    });

    // --- Player ---
    this.player = new Player(this, this.scale.width / 2, this.scale.height - 100);
    this.player.hp = this.registry.get('initialHp');
    this.player.bombs = this.registry.get('initialBombs');

    // --- Collisions ---
    this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);

    // --- UI ---
    this.createHUD();

    // Show Stage Title
    const stageTitle = this.add.text(this.scale.width/2, this.scale.height/2, `Stage ${this.stage}\nCommuter Rush`, {
        fontSize: '32px', color: '#fff', align: 'center'
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
        if (Math.random() < 0.02) {
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
      }
  }

  public triggerBomb() {
      this.enemies.getChildren().forEach((child) => {
          const enemy = child as Enemy;
          if (enemy.active) {
              enemy.die();
              this.addScore(enemy.scoreValue);
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
          enemy.spawn(x, -50);
          enemy.off('died');
          enemy.on('died', (score: number) => this.addScore(score));
      }
  }

  private spawnBoss() {
      const boss = new Boss(this, this.scale.width / 2, -100);
      this.enemies.add(boss);
      boss.spawn(this.scale.width / 2, -100);
      boss.on('died', (score: number) => {
          this.addScore(score);
          this.stageClear();
      });
  }

  private stageClear() {
      this.add.text(this.scale.width/2, this.scale.height/2, "STAGE CLEAR", {fontSize: '32px', color: '#ffff00'}).setOrigin(0.5);

      // Save Progress
      const saveData: GameState = {
          score: this.score,
          hp: this.player.hp,
          bombs: this.player.bombs,
          stage: this.stage + 1 // Unlock next stage (logic wise)
      };
      localStorage.setItem('shachiku_save', JSON.stringify(saveData));

      this.time.delayedCall(3000, () => {
           // Loop back to Stage 1 (or implement multiple stages)
           // For now, restart with saved data (Stage 2... but we treat as loop for this scope)
           this.scene.restart(saveData);
      });
  }

  private handleBulletEnemyCollision(obj1: any, obj2: any) {
      const bullet = obj1 as Bullet;
      const enemy = obj2 as Enemy;

      if (bullet.active && enemy.active) {
          bullet.setActive(false);
          bullet.setVisible(false);
          enemy.takeDamage(1);
      }
  }

  private handlePlayerEnemyCollision(obj1: any, obj2: any) {
      const player = obj1 as Player;
      const enemy = obj2 as Enemy;

      if (player.active && enemy.active) {
          if (enemy instanceof Boss) {
               player.takeDamage(10);
               player.y += 50;
          } else {
               enemy.die();
               player.takeDamage(20);
          }
      }
  }

  // --- UI & Score ---

  private createHUD() {
      this.scoreText = this.add.text(10, 10, '残業代: 0', { fontSize: '16px', color: '#fff' });
      this.hpText = this.add.text(10, 30, 'メンタル: 100', { fontSize: '16px', color: '#fff' });
      this.bombText = this.add.text(10, 50, '有給: 3', { fontSize: '16px', color: '#fff' });
      this.stageText = this.add.text(this.scale.width - 80, 10, `Stage ${this.stage}`, { fontSize: '16px', color: '#fff' });
  }

  private updateHUD() {
      this.scoreText.setText(`残業代: ${this.score}`);
      this.hpText.setText(`メンタル: ${this.player.hp}`);
      this.bombText.setText(`有給: ${this.player.bombs}`);
  }

  private addScore(amount: number) {
      this.score += amount;
  }
}
