import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public hp: number = 1;
    public scoreValue: number = 100;
    private shootTimer: number = 0;
    private movePattern: number = 0;
    private startX: number = 0;
    private timeAlive: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, texture?: string) {
        super(scene, x, y, texture || 'enemy_s1');
    }

    spawn(x: number, y: number, stage: number = 1) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.startX = x;
        this.timeAlive = 0;

        // Set Texture based on Stage
        const textureKey = `enemy_s${stage}`;
        if (this.scene.textures.exists(textureKey)) {
            this.setTexture(textureKey);
        } else {
            this.setTexture('enemy_s1');
        }

        // HP Scales slightly: Base 1 + (Stage / 2)
        this.hp = Math.floor(1 + (stage * 0.5));
        this.scoreValue = 100 * stage;

        // Speed increases with stage
        const speed = 100 + (stage * 30);
        this.setVelocityY(speed);
        
        this.shootTimer = Phaser.Math.Between(500, 2000);

        // Move Pattern based on Stage
        // Stage 1: Straight down (Default)
        // Stage 2: Slight Sway
        // Stage 3: Zig Zag
        // Stage 4+: Fast & Chaotic
        this.movePattern = stage;
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
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.timeAlive += delta;

        if (this.y > this.scene.scale.height + 50) {
             this.setActive(false);
             this.setVisible(false);
        }

        // Movement Logic
        if (this.movePattern >= 2) {
            const waveSpeed = this.movePattern * 0.005;
            const waveAmp = this.movePattern * 20;
            this.x = this.startX + Math.sin(this.timeAlive * waveSpeed) * waveAmp;
        }

        // Shooting logic
        this.shootTimer -= delta;
        if (this.shootTimer <= 0 && this.active && this.y > 0 && this.y < this.scene.scale.height - 100) {
            this.shoot();
            // Fire rate increases with stage
            const fireRateBase = 3000;
            const fireRateMin = Math.max(500, fireRateBase - (this.movePattern * 400));
            this.shootTimer = Phaser.Math.Between(fireRateMin, fireRateMin + 1000);
        }
    }

    shoot() {
        if ((this.scene as any).fireEnemyBullet) {
            // Aim at player roughly
            // const player = (this.scene as any).player; // If we had reference
            // For now, straight down or simple aim

            // Higher stages -> Aimed shots?
            if (this.movePattern >= 4) {
                // Tri-shot or faster shot
                (this.scene as any).fireEnemyBullet(this.x, this.y + 20, 0, 400);
            } else {
                (this.scene as any).fireEnemyBullet(this.x, this.y + 20, 0, 300);
            }
        }
    }
}
