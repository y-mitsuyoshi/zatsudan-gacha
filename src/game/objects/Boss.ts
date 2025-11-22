import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Boss extends Enemy {
    private moveTimer: number = 0;
    private attackTimer: number = 0;
    private bossState: 'IDLE' | 'ATTACK' = 'IDLE';

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'boss');
        this.setScale(2); // 64x64 -> 128x128
        this.scoreValue = 5000;
        this.hp = 50;
    }

    spawn(x: number, y: number, stage: number = 1) {
        super.spawn(x, y, stage);
        // Scale Boss HP
        // Base 50 + (stage * 25)
        this.hp = 50 + (stage * 25);
        this.setVelocityY(100); // Move down to enter screen (overrides super speed for entry)
    }

    private startY: number = 150;

    preUpdate(time: number, delta: number) {
        // We don't call super.preUpdate() because it destroys the object if y > screen height.
        // We want the boss to stay.
        
        // Entry logic
        if (this.bossState === 'IDLE') {
            if (this.y < this.startY) {
                this.setVelocityY(100);
            } else {
                this.setVelocityY(0);
                this.y = this.startY;
                this.bossState = 'ATTACK';
            }
        } else {
            // Hover movement
            this.moveTimer += delta;
            if (this.moveTimer > 2000) {
                const targetX = Phaser.Math.Between(50, this.scene.scale.width - 50);
                this.scene.physics.moveTo(this, targetX, this.startY, 100);
                
                // Randomly swoop down
                if (Math.random() < 0.3) {
                    this.scene.tweens.add({
                        targets: this,
                        y: this.startY + 150,
                        yoyo: true,
                        duration: 1000,
                        ease: 'Sine.easeInOut'
                    });
                }
                
                this.moveTimer = 0;
            }
            
            // Stop horizontal movement when close to target (simple check)
             if (this.body!.velocity.x !== 0) {
                 // Friction or stop logic handled by physics or simple timer reset
                 // For simplicity, let physics handle it or just let it drift
             }
        }

        // Bounce off walls
        if (this.x < 50) this.setVelocityX(100);
        if (this.x > this.scene.scale.width - 50) this.setVelocityX(-100);

        this.attackTimer += delta;
        if (this.attackTimer > 1500) {
            this.attack();
            this.attackTimer = 0;
        }
    }

    attack() {
        // Spread shot
        const scene = this.scene as any;
        if (scene.fireEnemyBullet) {
            // 3-way shot
            scene.fireEnemyBullet(this.x, this.y + 40, 0, 300);
            scene.fireEnemyBullet(this.x, this.y + 40, -100, 280);
            scene.fireEnemyBullet(this.x, this.y + 40, 100, 280);
        }
        
        this.setTint(0xff00ff);
        this.scene.time.delayedCall(200, () => this.clearTint());
    }
}
