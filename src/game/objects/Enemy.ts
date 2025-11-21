import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public hp: number = 1;
    public scoreValue: number = 100;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'enemy') {
        super(scene, x, y, texture);
    }

    spawn(x: number, y: number) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.hp = 1;
        this.setVelocityY(100); // Default downward movement
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
    }
}
