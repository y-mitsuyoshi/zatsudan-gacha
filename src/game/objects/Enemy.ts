import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public hp: number = 1;
    public scoreValue: number = 100;
    private shootTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, texture?: string) {
        super(scene, x, y, texture || 'enemy');
    }

    spawn(x: number, y: number, stage: number = 1) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.hp = 1; // Normal enemies die in 1 hit usually

        // Speed increases with stage
        // Base 100 + (stage * 20)
        const speed = 100 + (stage * 20);
        this.setVelocityY(speed);
        
        this.shootTimer = Phaser.Math.Between(500, 2000);
    }

    takeDamage(amount: number) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.setActive(false);
        this.setVisible(false);
        this.emit('died', this.scoreValue);
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (this.y > this.scene.scale.height + 50) {
             this.setActive(false);
             this.setVisible(false);
        }

        // Shooting logic
        this.shootTimer -= delta;
        if (this.shootTimer <= 0 && this.active && this.y > 0 && this.y < this.scene.scale.height - 100) {
            this.shoot();
            this.shootTimer = Phaser.Math.Between(2000, 5000);
        }
    }

    shoot() {
        if ((this.scene as any).fireEnemyBullet) {
            (this.scene as any).fireEnemyBullet(this.x, this.y + 20, 0, 300);
        }
    }
}
