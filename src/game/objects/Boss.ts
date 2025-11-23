import Phaser from 'phaser';
import { Enemy } from './Enemy';

export type BossType = 'STATION_MASTER' | 'PAPERWORK' | 'ANGRY_CALLER' | 'SECTION_CHIEF' | 'SERVER_ROOM' | 'CEO';

export class Boss extends Enemy {
    public hp: number = 100;
    public maxHp: number = 100;
    public scoreValue: number = 5000;
    
    private attackTimer: number = 0;
    private moveTimer: number = 0;
    private bossType: BossType = 'STATION_MASTER';
    private stage: number = 1;
    private startY: number = 150;

    constructor(scene: Phaser.Scene, x: number, y: number, texture?: string) {
        super(scene, x, y, texture || 'boss_s1');
        this.setScale(1);
    }

    spawn(x: number, y: number, stage: number = 1) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.stage = stage;

        this.bossType = this.getBossTypeForStage(stage);
        const textureKey = `boss_s${stage}`;
        if (this.scene.textures.exists(textureKey)) {
            this.setTexture(textureKey);
        } else {
            this.setTexture('boss_s1'); // Fallback
            this.setTint(0xff0000); // Tint red to show it's a fallback/different
        }

        // HP Scaling: Reduced
        // Stage 1: 100, Stage 2: 200, ...
        this.maxHp = 100 * stage;
        this.hp = this.maxHp;
        this.scoreValue = 5000 * stage;

        // Initial movement to center
        this.setVelocityY(100);
        
        this.attackTimer = 2000;
        this.startY = 150;
        
        // Set Depth
        this.setDepth(15); // Above normal enemies
    }

    private getBossTypeForStage(stage: number): BossType {
        switch(stage) {
            case 1: return 'STATION_MASTER';
            case 2: return 'PAPERWORK';
            case 3: return 'ANGRY_CALLER';
            case 4: return 'SECTION_CHIEF';
            case 5: return 'SERVER_ROOM';
            case 6: return 'CEO';
            default: return 'CEO';
        }
    }

    takeDamage(amount: number) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.die();
        } else {
            this.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => this.clearTint());
        }
    }

    die() {
        this.setActive(false);
        this.setVisible(false);
        this.emit('died', this.scoreValue);
        // Big explosion effect would go here
    }

    preUpdate(time: number, delta: number) {
        // DO NOT call super.preUpdate(time, delta) because it destroys the object if y > height
        // Instead, we manually update the physics body and animations if needed
        // But since we extend Arcade.Sprite, we need the physics update.
        // The issue is Enemy.ts preUpdate has the check.
        // So we bypass Enemy.preUpdate and go straight to Sprite.preUpdate if possible, 
        // or just re-implement what we need.
        
        // Actually, we can just call the Phaser Sprite preUpdate directly if we cast to any or use prototype
        // But safer is to just copy the necessary parts of Enemy.preUpdate minus the kill check.
        
        // Update physics/animation (Phaser internal)
        if (this.anims) this.anims.update(time, delta);
        if (this.body) (this.body as Phaser.Physics.Arcade.Body).update(delta);

        // Enemy logic
        // this.timeAlive += delta; // Private in Enemy, can't access easily without protected.
        // Let's just manage our own timers.
        
        // Entry movement
        if (this.y < this.startY) {
            if (this.body!.velocity.y === 0) this.setVelocityY(100);
        } else {
            // Reached target Y area
            
            // Wander Logic
            this.moveTimer -= delta;
            if (this.moveTimer <= 0) {
                // Pick a new random point
                const targetX = Phaser.Math.Between(50, this.scene.scale.width - 50);
                const targetY = Phaser.Math.Between(50, this.scene.scale.height * 0.6); // Stay in top 60%
                
                this.scene.physics.moveTo(this, targetX, targetY, 100);
                
                // Set time to move + wait
                this.moveTimer = Phaser.Math.Between(2000, 4000);
            }
            
            // Stop if close to target (simple check, or just let it drift)
            // For smoother movement, we can just let moveTo handle velocity
        }

        // Clamp bounds
        if (this.x < 50) this.setVelocityX(Math.abs(this.body!.velocity.x));
        if (this.x > this.scene.scale.width - 50) this.setVelocityX(-Math.abs(this.body!.velocity.x));
        if (this.y > this.scene.scale.height * 0.6) this.setVelocityY(-Math.abs(this.body!.velocity.y));

        // Attack Logic
        this.attackTimer -= delta;
        if (this.attackTimer <= 0 && this.active && this.y >= 50) {
            this.attack();
            // Attack rate
            this.attackTimer = Math.max(1500, 3000 - (this.stage * 300));
        }
    }

    private attack() {
        const scene = this.scene as any;
        if (!scene.fireEnemyBullet) return;

        switch(this.bossType) {
            case 'STATION_MASTER':
                // Whistle Blast: Spread of 5 bullets
                for(let i = -2; i <= 2; i++) {
                    scene.fireEnemyBullet(this.x, this.y + 40, i * 100, 300);
                }
                break;

            case 'PAPERWORK':
                // Paper Storm: Random chaotic bullets
                for(let i = 0; i < 5; i++) { // Reduced from 8
                    scene.fireEnemyBullet(this.x + Phaser.Math.Between(-40, 40), this.y + 40, Phaser.Math.Between(-200, 200), Phaser.Math.Between(200, 400));
                }
                break;

            case 'ANGRY_CALLER':
                // Sound Waves: Rings of bullets
                for(let i = 0; i < 8; i++) { // Reduced from 12
                    const angle = (i / 8) * Math.PI * 2;
                    scene.fireEnemyBullet(this.x, this.y + 40, Math.cos(angle) * 300, Math.sin(angle) * 300);
                }
                break;

            case 'SECTION_CHIEF':
                // Aimed Laser-like shots
                const player = scene.player;
                if (player && player.active) {
                    for(let i = 0; i < 3; i++) {
                         scene.time.delayedCall(i * 200, () => {
                             if (!this.active) return;
                             const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
                             scene.fireEnemyBullet(this.x, this.y + 40, Math.cos(angle) * 500, Math.sin(angle) * 500);
                         });
                    }
                }
                break;

            case 'SERVER_ROOM':
                // Data Stream: Vertical rain
                for(let i = 0; i < 5; i++) {
                    scene.fireEnemyBullet(this.x + (i * 40) - 80, this.y + 40, 0, 500);
                }
                break;

            case 'CEO':
                // God Mode: Spiral + Aimed
                // Spiral
                for(let i = 0; i < 10; i++) { // Reduced from 16
                    const angle = (i / 10) * Math.PI * 2 + (this.moveTimer * 0.001);
                    scene.fireEnemyBullet(this.x, this.y + 40, Math.cos(angle) * 300, Math.sin(angle) * 300);
                }
                break;
        }
    }
}
