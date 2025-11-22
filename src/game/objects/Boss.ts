import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Boss extends Enemy {
    private moveTimer: number = 0;
    private attackTimer: number = 0;
    private bossState: 'IDLE' | 'ATTACK' = 'IDLE';
    private stage: number = 1;
    private maxHp: number = 100;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'boss_s1'); // Default to s1, will change in spawn
        this.setScale(1); // Graphics are already large (96x96)
        this.scoreValue = 5000;
        this.hp = 200;
    }

    spawn(x: number, y: number, stage: number = 1) {
        // Reset Physics
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);

        this.stage = stage;

        // Texture
        const textureKey = `boss_s${stage}`;
        if (this.scene.textures.exists(textureKey)) {
            this.setTexture(textureKey);
        }

        // Scale Boss HP Significantly
        // Base 200 + (stage * 100) -> Stage 6 = 800HP
        // Mobs have like 2-5 HP. This makes boss 100x stronger roughly.
        this.maxHp = 200 + (stage * 150);
        this.hp = this.maxHp;

        this.scoreValue = 5000 * stage;

        this.setVelocityY(100);
        this.bossState = 'IDLE';
        this.startY = 150;
    }

    private startY: number = 150;

    preUpdate(time: number, delta: number) {
        // Custom preUpdate to avoid Enemy logic destroying it or moving it weirdly
        // We DO NOT call super.preUpdate() fully if it kills the boss on boundary
        // effectively we just copy the parts we need or override.
        
        // Standard sprite update
        if (this.anims) this.anims.update(time, delta);

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
            // Move faster on higher stages
            if (this.moveTimer > 2000 - (this.stage * 100)) {
                const targetX = Phaser.Math.Between(100, this.scene.scale.width - 100);
                this.scene.physics.moveTo(this, targetX, this.startY, 100 + (this.stage * 20));
                
                // Randomly swoop down
                if (Math.random() < 0.3 + (this.stage * 0.05)) {
                    this.scene.tweens.add({
                        targets: this,
                        y: this.startY + 100 + (this.stage * 20),
                        yoyo: true,
                        duration: 1000 - (this.stage * 50), // Faster swoops
                        ease: 'Sine.easeInOut'
                    });
                }
                
                this.moveTimer = 0;
            }
            
            // Stop horizontal movement when close to target (simple check)
             const dist = Math.abs(this.body!.velocity.x);
             if (dist > 0 && Math.random() < 0.05) {
                 // occasional stop
             }
        }

        // Bounce off walls
        if (this.x < 60) this.setVelocityX(100);
        if (this.x > this.scene.scale.width - 60) this.setVelocityX(-100);

        this.attackTimer += delta;
        // Attack frequency increases with stage
        const attackInterval = Math.max(400, 1500 - (this.stage * 150));
        if (this.attackTimer > attackInterval) {
            this.attack();
            this.attackTimer = 0;
        }
    }

    attack() {
        const scene = this.scene as any;
        if (!scene.fireEnemyBullet) return;

        const bulletSpeed = 300 + (this.stage * 30);

        // Stage 1: 3-Way
        if (this.stage === 1) {
            scene.fireEnemyBullet(this.x, this.y + 40, 0, bulletSpeed);
            scene.fireEnemyBullet(this.x, this.y + 40, -100, bulletSpeed - 20);
            scene.fireEnemyBullet(this.x, this.y + 40, 100, bulletSpeed - 20);
        }
        // Stage 2: 5-Way
        else if (this.stage === 2) {
             for(let i=-2; i<=2; i++) {
                 scene.fireEnemyBullet(this.x, this.y + 40, i * 100, bulletSpeed);
             }
        }
        // Stage 3: Circular Burst
        else if (this.stage === 3) {
            const count = 8;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                scene.fireEnemyBullet(this.x, this.y, Math.cos(angle) * 200, Math.sin(angle) * 200);
            }
        }
        // Stage 4: Spiral (Rapid single shots rotating)
        else if (this.stage === 4) {
             // This is hard to do in a single frame function without state, so we simulate a burst
             const count = 12;
             for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + (this.scene.time.now / 1000);
                scene.fireEnemyBullet(this.x, this.y, Math.cos(angle) * 300, Math.sin(angle) * 300);
            }
        }
        // Stage 5: Targeted + Random Chaos
        else if (this.stage === 5) {
            scene.fireEnemyBullet(this.x, this.y + 40, 0, bulletSpeed + 100); // Fast center
            for(let i=0; i<5; i++) {
                scene.fireEnemyBullet(this.x + Phaser.Math.Between(-50, 50), this.y + 40, Phaser.Math.Between(-200, 200), bulletSpeed);
            }
        }
        // Stage 6: CEO Hell (Everything)
        else {
            // Circular
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                scene.fireEnemyBullet(this.x, this.y, Math.cos(angle) * 250, Math.sin(angle) * 250);
            }
            // Directed
            scene.fireEnemyBullet(this.x, this.y + 40, 0, 500);
        }
        
        this.setTint(0xff00ff);
        this.scene.time.delayedCall(200, () => this.clearTint());
    }
}
