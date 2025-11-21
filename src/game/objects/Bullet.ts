import Phaser from 'phaser';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bullet');
    }

    fire(x: number, y: number) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.setVelocityY(-600);
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (this.y < -10) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}
