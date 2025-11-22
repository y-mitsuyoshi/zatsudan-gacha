import Phaser from 'phaser';

export type BulletType = 'NORMAL' | 'LASER' | 'FLAME';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
    public bulletType: BulletType = 'NORMAL';
    public damage: number = 1;
    public isPlayerBullet: boolean = true;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bullet');
    }

    fire(x: number, y: number, type: BulletType = 'NORMAL', angle: number = -90) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.bulletType = type;
        this.isPlayerBullet = true;

        switch (type) {
            case 'LASER':
                this.setTexture('bullet_laser');
                this.damage = 2; // High damage
                // Laser moves extremely fast or instant
                const rad = Phaser.Math.DegToRad(angle);
                this.setVelocity(Math.cos(rad) * 1000, Math.sin(rad) * 1000);
                this.setRotation(rad + Math.PI/2);
                break;

            case 'FLAME':
                this.setTexture('bullet_flame');
                this.damage = 0.5; // Low damage but hits often/multiple times (if overlap logic allows)
                const radFlame = Phaser.Math.DegToRad(angle + Phaser.Math.Between(-15, 15));
                this.setVelocity(Math.cos(radFlame) * 400, Math.sin(radFlame) * 400);
                this.setScale(0.5);
                // Flame grows and fades
                this.scene.tweens.add({
                    targets: this,
                    scale: 1.5,
                    alpha: 0,
                    duration: 600,
                    onComplete: () => {
                        this.setActive(false);
                        this.setVisible(false);
                    }
                });
                break;

            case 'NORMAL':
            default:
                this.setTexture('bullet');
                this.damage = 1;
                this.setVelocityY(-600);
                this.setScale(1);
                this.setAlpha(1);
                this.setRotation(0);
                break;
        }
    }

    // For Enemy Bullets
    fireEnemy(x: number, y: number, velocityX: number, velocityY: number) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.isPlayerBullet = false;
        this.bulletType = 'NORMAL';
        this.setTexture('bullet');
        this.setTint(0xff0000);
        this.setVelocity(velocityX, velocityY);
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        if (this.y < -50 || this.y > this.scene.scale.height + 50 || this.x < -50 || this.x > this.scene.scale.width + 50) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}
