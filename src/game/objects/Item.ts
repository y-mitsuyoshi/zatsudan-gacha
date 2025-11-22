import Phaser from 'phaser';

export type ItemType = 'SCORE' | 'POWERUP' | 'HEAL' | 'BOMB';

export class Item extends Phaser.Physics.Arcade.Sprite {
    public itemType: ItemType;
    public value: number;

    constructor(scene: Phaser.Scene, x: number, y: number, type: ItemType) {
        let texture = 'item_score';
        switch (type) {
            case 'POWERUP': texture = 'item_powerup'; break;
            case 'HEAL': texture = 'item_heal'; break;
            case 'BOMB': texture = 'item_bomb'; break;
        }
        super(scene, x, y, texture);
        this.itemType = type;
        this.value = 0;

        // Set values based on type
        if (type === 'SCORE') this.value = 1000;
        if (type === 'HEAL') this.value = 20;
        if (type === 'BOMB') this.value = 1;
        if (type === 'POWERUP') this.value = 1;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setVelocityY(100);
        this.setCollideWorldBounds(false);
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (this.y > this.scene.scale.height + 50) {
            this.destroy();
        }
    }
}
