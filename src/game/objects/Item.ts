import Phaser from 'phaser';

export type ItemType = 'SCORE' | 'POWERUP' | 'HEAL' | 'BOMB' | 'WEAPON_LASER' | 'WEAPON_FLAME' | 'WEAPON_MISSILE' | 'WEAPON_SHOTGUN' | 'WEAPON_BEAM';

const ITEM_TEXTURE_MAP: Record<ItemType, string> = {
    'SCORE': 'item_score',
    'POWERUP': 'item_powerup',
    'HEAL': 'item_heal',
    'BOMB': 'item_bomb',
    'WEAPON_LASER': 'item_weapon_laser',
    'WEAPON_FLAME': 'item_weapon_flame',
    'WEAPON_MISSILE': 'item_weapon_missile',
    'WEAPON_SHOTGUN': 'item_weapon_shotgun',
    'WEAPON_BEAM': 'item_weapon_beam',
};

const ITEM_VALUE_MAP: Record<ItemType, number> = {
    'SCORE': 1000,
    'POWERUP': 1,
    'HEAL': 20,
    'BOMB': 1,
    'WEAPON_LASER': 0,
    'WEAPON_FLAME': 0,
    'WEAPON_MISSILE': 0,
    'WEAPON_SHOTGUN': 0,
    'WEAPON_BEAM': 0,
};

export class Item extends Phaser.Physics.Arcade.Sprite {
    public itemType: ItemType = 'SCORE';
    public value: number = 0;

    // Constructor compatible with Phaser Group (scene, x, y, texture, frame)
    constructor(scene: Phaser.Scene, x: number, y: number, texture?: string, frame?: string | number) {
        super(scene, x, y, texture || 'item_score');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(false);
    }

    // Call this after getting from group to configure the item type
    spawn(x: number, y: number, type: ItemType) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);

        this.itemType = type;
        this.value = ITEM_VALUE_MAP[type] || 0;
        this.setTexture(ITEM_TEXTURE_MAP[type] || 'item_score');
        this.setVelocityY(150);
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        if (this.y > this.scene.scale.height + 50) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}
