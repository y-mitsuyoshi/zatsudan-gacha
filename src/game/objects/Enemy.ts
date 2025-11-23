import Phaser from 'phaser';

export type EnemyType = 'COMMUTER' | 'EMAIL' | 'PHONE' | 'MANAGER' | 'BUG' | 'BLACK_COMPANY' | 'DRONE' | 'GHOST' | 'HEADHUNTER';
export interface EnemyConfig {
    type: EnemyType;
    hp: number;
    speed: number;
    score: number;
    texture: string;
    movePattern: 'STRAIGHT' | 'WAVE' | 'ZIGZAG' | 'CHASE' | 'DASH' | 'STATIONARY' | 'CIRCLE' | 'FADE' | 'TRACK';
    shootPattern: 'STRAIGHT' | 'SPREAD_3' | 'SPREAD_5' | 'CIRCLE' | 'AIMED_BURST' | 'NONE';
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public hp: number = 1;
    public scoreValue: number = 100;
    private shootTimer: number = 0;
    private movePattern: string = 'STRAIGHT';
    private shootPattern: string = 'STRAIGHT';
    private startX: number = 0;
    private timeAlive: number = 0;
    private enemyType: EnemyType = 'COMMUTER';

    constructor(scene: Phaser.Scene, x: number, y: number, texture?: string) {
        super(scene, x, y, texture || 'enemy_s1');
    }

    spawn(x: number, y: number, stage: number = 1, typeOverride?: EnemyType) {
        this.body!.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.setAlpha(1);
        this.startX = x;
        this.timeAlive = 0;

        // Determine Enemy Type based on Stage if not overridden
        this.enemyType = typeOverride || this.getEnemyTypeForStage(stage);
        const config = this.getEnemyConfig(this.enemyType, stage);

        this.setTexture(config.texture);
        this.hp = config.hp;
        this.scoreValue = config.score;
        this.movePattern = config.movePattern;
        this.shootPattern = config.shootPattern;
        
        // Speed
        this.setVelocityY(config.speed);
        
        // Shooting setup
        // Randomize start time so they don't all shoot at once
        this.shootTimer = Phaser.Math.Between(500, 2000); 
    }

    private getEnemyTypeForStage(stage: number): EnemyType {
        // Mix of current stage enemies and previous ones sometimes?
        // For now, strict stage mapping
        switch(stage) {
            case 1: return 'COMMUTER';
            case 2: return 'EMAIL';
            case 3: return 'PHONE';
            case 4: return 'MANAGER';
            case 5: return 'BUG';
            case 6: return 'BLACK_COMPANY';
            default: return 'BLACK_COMPANY';
        }
    }

    private getEnemyConfig(type: EnemyType, stage: number): EnemyConfig {
        const difficultyMult = 1 + (stage * 0.1); // Reduced scaling
        
        // Base stats
        const baseHp = 1; // Weakest enemy
        const baseSpeed = 100;

        switch(type) {
            case 'COMMUTER': // Stage 1: Weak, Straight shot
                return {
                    type, hp: Math.floor(baseHp * difficultyMult), speed: baseSpeed * 0.8, score: 100,
                    texture: 'enemy_s1', movePattern: 'STRAIGHT', shootPattern: 'STRAIGHT'
                };
            case 'EMAIL': // Stage 2: Slightly tougher, Spread shot
                return {
                    type, hp: Math.floor(baseHp * 2 * difficultyMult), speed: baseSpeed * 1.0, score: 200,
                    texture: 'enemy_s2', movePattern: 'WAVE', shootPattern: 'SPREAD_3'
                };
            case 'PHONE': // Stage 3: Tanky, Aimed Burst
                return {
                    type, hp: Math.floor(baseHp * 5 * difficultyMult), speed: baseSpeed * 0.6, score: 300,
                    texture: 'enemy_s3', movePattern: 'ZIGZAG', shootPattern: 'AIMED_BURST'
                };
            case 'MANAGER': // Stage 4: Fast, Chasing, Spread 5
                return {
                    type, hp: Math.floor(baseHp * 8 * difficultyMult), speed: baseSpeed * 1.2, score: 500,
                    texture: 'enemy_s4', movePattern: 'CHASE', shootPattern: 'SPREAD_5'
                };
            case 'BUG': // Stage 5: Stationary, Circle shot
                return {
                    type, hp: Math.floor(baseHp * 4 * difficultyMult), speed: baseSpeed * 1.5, score: 400,
                    texture: 'enemy_s5', movePattern: 'STATIONARY', shootPattern: 'CIRCLE'
                };
            case 'BLACK_COMPANY': // Stage 6: Boss-like mob
                return {
                    type, hp: Math.floor(baseHp * 15 * difficultyMult), speed: baseSpeed * 1.0, score: 1000,
                    texture: 'enemy_s6', movePattern: 'DASH', shootPattern: 'AIMED_BURST'
                };
            case 'DRONE':
                return {
                    type, hp: Math.floor(baseHp * 3 * difficultyMult), speed: baseSpeed * 1.2, score: 300,
                    texture: 'enemy_s5', movePattern: 'CIRCLE', shootPattern: 'STRAIGHT'
                };
            case 'GHOST':
                return {
                    type, hp: Math.floor(baseHp * 2 * difficultyMult), speed: baseSpeed * 0.8, score: 400,
                    texture: 'enemy_s2', movePattern: 'FADE', shootPattern: 'NONE'
                };
            case 'HEADHUNTER':
                return {
                    type, hp: Math.floor(baseHp * 6 * difficultyMult), speed: baseSpeed * 1.5, score: 600,
                    texture: 'enemy_s4', movePattern: 'TRACK', shootPattern: 'SPREAD_3'
                };
            default:
                return {
                    type: 'COMMUTER', hp: 1, speed: 100, score: 100,
                    texture: 'enemy_s1', movePattern: 'STRAIGHT', shootPattern: 'STRAIGHT'
                };
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
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);
        this.timeAlive += delta;

        if (this.y > this.scene.scale.height + 50) {
             this.setActive(false);
             this.setVisible(false);
        }

        this.updateMovement(delta);
        this.updateShooting(delta);
    }

    private updateMovement(delta: number) {
        switch(this.movePattern) {
            case 'STRAIGHT':
                // Constant velocity Y set in spawn
                break;
            case 'WAVE':
                this.x = this.startX + Math.sin(this.timeAlive * 0.005) * 50;
                break;
            case 'ZIGZAG':
                this.x = this.startX + Math.cos(this.timeAlive * 0.01) * 80;
                break;
            case 'CHASE':
                // Move towards player slowly on X
                const player = (this.scene as any).player;
                if (player && player.active) {
                    if (this.x < player.x) this.x += 1;
                    else this.x -= 1;
                }
                break;
            case 'STATIONARY':
                if (this.y > 100 && this.y < 300) {
                    this.setVelocityY(0);
                } else {
                    this.setVelocityY(100);
                }
                break;
            case 'DASH':
                // Stop then dash
                if (this.timeAlive % 2000 < 1000) {
                     this.setVelocityY(50);
                } else {
                     this.setVelocityY(400);
                }
                break;
            case 'CIRCLE':
                this.x = this.startX + Math.cos(this.timeAlive * 0.003) * 100;
                this.setVelocityY(50); // Slow descent
                break;
            case 'FADE':
                // Fade in/out
                const alpha = 0.5 + 0.5 * Math.sin(this.timeAlive * 0.005);
                this.setAlpha(alpha);
                break;
            case 'TRACK': {
                // Aggressive tracking
                const player = (this.scene as any).player;
                if (player && player.active) {
                    if (this.x < player.x - 10) this.setVelocityX(100);
                    else if (this.x > player.x + 10) this.setVelocityX(-100);
                    else this.setVelocityX(0);
                }
                break;
            }
        }
    }

    private updateShooting(delta: number) {
        if (this.shootPattern === 'NONE') return;

        this.shootTimer -= delta;
        if (this.shootTimer <= 0 && this.active && this.y > 0 && this.y < this.scene.scale.height - 100) {
            this.shoot();
            // Reset timer based on pattern intensity
            let baseTime = 2000;
            if (this.shootPattern === 'AIMED_BURST') baseTime = 3000;
            if (this.shootPattern === 'CIRCLE') baseTime = 4000;
            
            this.shootTimer = Phaser.Math.Between(baseTime, baseTime + 1000);
        }
    }

    shoot() {
        if (!(this.scene as any).fireEnemyBullet) return;

        const player = (this.scene as any).player;
        const fire = (vx: number, vy: number) => (this.scene as any).fireEnemyBullet(this.x, this.y + 20, vx, vy);
        const speed = 200; // Slower bullets for fairness

        switch(this.shootPattern) {
            case 'STRAIGHT':
                // Simple straight down or aimed if close
                fire(0, speed);
                break;

            case 'SPREAD_3':
                // 3-way
                fire(0, speed);
                fire(-speed * 0.5, speed * 0.8);
                fire(speed * 0.5, speed * 0.8);
                break;

            case 'SPREAD_5':
                // 5-way
                fire(0, speed);
                fire(-speed * 0.3, speed * 0.9);
                fire(speed * 0.3, speed * 0.9);
                fire(-speed * 0.6, speed * 0.7);
                fire(speed * 0.6, speed * 0.7);
                break;

            case 'CIRCLE':
                // 8 directions
                for (let i = 0; i < 8; i++) {
                    const angle = i * (Math.PI / 4);
                    fire(Math.cos(angle) * speed, Math.sin(angle) * speed);
                }
                break;

            case 'AIMED_BURST':
                if (player && player.active) {
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
                    const vx = Math.cos(angle) * speed;
                    const vy = Math.sin(angle) * speed;
                    
                    // Fire 3 shots with delay
                    fire(vx, vy);
                    this.scene.time.delayedCall(200, () => { if(this.active) fire(vx, vy); });
                    this.scene.time.delayedCall(400, () => { if(this.active) fire(vx, vy); });
                } else {
                    fire(0, speed);
                }
                break;
        }
    }
}
