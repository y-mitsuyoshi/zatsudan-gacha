import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Boss extends Enemy {
    private moveTimer: number = 0;
    private attackTimer: number = 0;
    private bossState: 'IDLE' | 'ATTACK' = 'IDLE';
    private stage: number = 1;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'boss');
        this.setScale(2); // 64x64 -> 128x128
        this.scoreValue = 5000;
        this.hp = 50;
    }

    spawn(x: number, y: number, stage: number = 1) {
        super.spawn(x, y, stage);
        this.stage = stage;
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
                this.scene.physics.moveTo(this, targetX, this.startY, 100 + (this.stage * 10));
                
                // Randomly swoop down
                if (Math.random() < 0.3 + (this.stage * 0.05)) {
                    this.scene.tweens.add({
                        targets: this,
                        y: this.startY + 150,
                        yoyo: true,
                        duration: 1000 - (this.stage * 50), // Faster swoops
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
        // Attack frequency increases with stage
        const attackInterval = Math.max(500, 1500 - (this.stage * 100));
        if (this.attackTimer > attackInterval) {
            this.attack();
            this.attackTimer = 0;
        }
    }

    attack() {
        // Spread shot
        const scene = this.scene as any;
        if (scene.fireEnemyBullet) {
            const bulletSpeed = 300 + (this.stage * 20);
            
            // Pattern 1: Targeted Spread
            // Base: 3-way shot
            scene.fireEnemyBullet(this.x, this.y + 40, 0, bulletSpeed);
            scene.fireEnemyBullet(this.x, this.y + 40, -100, bulletSpeed - 20);
            scene.fireEnemyBullet(this.x, this.y + 40, 100, bulletSpeed - 20);

            // Stage 3+: 5-way
            if (this.stage >= 3) {
                scene.fireEnemyBullet(this.x, this.y + 40, -200, bulletSpeed - 40);
                scene.fireEnemyBullet(this.x, this.y + 40, 200, bulletSpeed - 40);
            }

            // Stage 5+: 7-way or Circular
            if (this.stage >= 5) {
                scene.fireEnemyBullet(this.x, this.y + 40, -300, bulletSpeed - 60);
                scene.fireEnemyBullet(this.x, this.y + 40, 300, bulletSpeed - 60);
                
                // Extra: Circular burst
                if (Math.random() < 0.5) {
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const vx = Math.cos(angle) * 200;
                        const vy = Math.sin(angle) * 200;
                        scene.fireEnemyBullet(this.x, this.y, vx, vy);
                    }
                }
            }
        }
        
        this.setTint(0xff00ff);
        this.scene.time.delayedCall(200, () => this.clearTint());
    }
}
