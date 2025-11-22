import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Load Backgrounds (Keep existing assets if they are real, otherwise we might need to generate bg textures too if they fail,
    // but for now assuming these paths are valid placeholders or user provided)
    this.load.image('bg_stage1', '/assets/game/bg_stage1.png');
    this.load.image('bg_stage2', '/assets/game/bg_stage2.png');
    this.load.image('bg_stage3', '/assets/game/bg_stage3.png');
    this.load.image('bg_stage4', '/assets/game/bg_stage4.png');
    this.load.image('bg_stage5', '/assets/game/bg_stage5.png');
    this.load.image('bg_stage6', '/assets/game/bg_stage6.png');
  }

  create() {
    this.createProceduralGraphics();
    this.scene.start('TitleScene');
  }

  createProceduralGraphics() {
    // Helper to clean up
    const generate = (key: string, width: number, height: number, drawFn: (gfx: Phaser.GameObjects.Graphics) => void) => {
        const gfx = this.make.graphics({ x: 0, y: 0 });
        drawFn(gfx);
        gfx.generateTexture(key, width, height);
        gfx.destroy();
    };

    // --- Player: Salaryman ---
    generate('player', 32, 32, (gfx) => {
        // Suit
        gfx.fillStyle(0x2c3e50, 1); // Dark Blue Suit
        gfx.fillRect(8, 12, 16, 14);
        // Head
        gfx.fillStyle(0xffdbac, 1); // Skin
        gfx.fillRect(10, 2, 12, 10);
        // Hair
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(10, 2, 12, 4);
        gfx.fillRect(8, 4, 2, 6);
        gfx.fillRect(22, 4, 2, 6);
        // Shirt
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(14, 12, 4, 10);
        // Tie
        gfx.fillStyle(0xe74c3c, 1); // Red
        gfx.fillRect(15, 12, 2, 8);
        // Legs
        gfx.fillStyle(0x2c3e50, 1);
        gfx.fillRect(10, 26, 4, 6);
        gfx.fillRect(18, 26, 4, 6);
    });

    // --- Projectiles ---
    // Normal Bullet
    generate('bullet', 12, 12, (gfx) => {
        gfx.fillStyle(0xffff00, 1);
        gfx.fillCircle(6, 6, 4);
        gfx.lineStyle(2, 0xffffff, 0.8);
        gfx.strokeCircle(6, 6, 4);
    });

    // Laser Beam (Vertical Segment)
    generate('bullet_laser', 16, 64, (gfx) => {
        gfx.fillStyle(0x00ffff, 0.8); // Cyan core
        gfx.fillRect(6, 0, 4, 64);
        gfx.lineStyle(2, 0x0088ff, 0.5); // Blue glow
        gfx.strokeRect(4, 0, 8, 64);
    });

    // Flame Particle
    generate('bullet_flame', 32, 32, (gfx) => {
        gfx.fillStyle(0xff4500, 0.7); // OrangeRed
        gfx.fillCircle(16, 16, 10);
        gfx.fillStyle(0xffff00, 0.5); // Yellow center
        gfx.fillCircle(16, 16, 6);
    });

    // --- Enemies per Stage ---

    // Stage 1: Commuter (Bag/Person rushing)
    generate('enemy_s1', 32, 32, (gfx) => {
        // Simple briefcase shape with legs
        gfx.fillStyle(0x8b4513, 1); // Brown leather
        gfx.fillRect(4, 6, 24, 18);
        gfx.fillStyle(0xffd700, 1); // Gold Buckle
        gfx.fillRect(14, 10, 4, 4);
        // Handle
        gfx.lineStyle(2, 0x000000);
        gfx.strokeRect(10, 2, 12, 4);
        // Angry eyes on the bag?
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(6, 8, 6, 6);
        gfx.fillRect(20, 8, 6, 6);
        gfx.fillStyle(0x000000, 1); // Pupils
        gfx.fillRect(8, 10, 2, 2);
        gfx.fillRect(22, 10, 2, 2);
    });

    // Stage 2: Email/Letter
    generate('enemy_s2', 32, 32, (gfx) => {
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(2, 6, 28, 20);
        gfx.lineStyle(2, 0xaaaaaa);
        gfx.strokeRect(2, 6, 28, 20);
        // Envelope lines
        gfx.beginPath();
        gfx.moveTo(2, 6);
        gfx.lineTo(16, 18);
        gfx.lineTo(30, 6);
        gfx.strokePath();
        // Red alert notification
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(28, 4, 4);
    });

    // Stage 3: Phone/Receiver
    generate('enemy_s3', 32, 32, (gfx) => {
        gfx.fillStyle(0x555555, 1); // Dark Grey
        // Receiver handle
        gfx.fillRoundedRect(8, 4, 16, 24, 4);
        // Ear and Mouth pieces
        gfx.fillStyle(0x222222, 1);
        gfx.fillCircle(16, 8, 6);
        gfx.fillCircle(16, 24, 6);
        // Sound waves
        gfx.lineStyle(2, 0xff0000);
        gfx.beginPath();
        gfx.moveTo(24, 24);
        gfx.lineTo(30, 20);
        gfx.moveTo(24, 26);
        gfx.lineTo(30, 30);
        gfx.strokePath();
    });

    // Stage 4: Middle Manager (Glasses & Moustache)
    generate('enemy_s4', 32, 32, (gfx) => {
        gfx.fillStyle(0xffdbac, 1); // Face
        gfx.fillCircle(16, 16, 14);
        // Glasses
        gfx.lineStyle(2, 0x000000);
        gfx.strokeCircle(10, 14, 4);
        gfx.strokeCircle(22, 14, 4);
        gfx.beginPath();
        gfx.moveTo(14, 14);
        gfx.lineTo(18, 14);
        gfx.strokePath();
        // Moustache
        gfx.fillStyle(0x4a4a4a, 1);
        gfx.fillRect(10, 22, 12, 3);
    });

    // Stage 5: Error Dialog/Bug
    generate('enemy_s5', 32, 32, (gfx) => {
        gfx.fillStyle(0xcccccc, 1); // Window
        gfx.fillRect(2, 4, 28, 24);
        gfx.fillStyle(0x0000aa, 1); // Title bar
        gfx.fillRect(2, 4, 28, 6);
        // X button
        gfx.fillStyle(0xff0000, 1);
        gfx.fillRect(24, 5, 4, 4);
        // Bug icon
        gfx.fillStyle(0x00aa00, 1);
        gfx.fillCircle(16, 18, 6);
        gfx.lineStyle(1, 0x000000);
        gfx.beginPath();
        gfx.moveTo(16, 18);
        gfx.lineTo(10, 12); // Legs
        gfx.moveTo(16, 18);
        gfx.lineTo(22, 12);
        gfx.moveTo(16, 18);
        gfx.lineTo(10, 24);
        gfx.moveTo(16, 18);
        gfx.lineTo(22, 24);
        gfx.strokePath();
    });

    // Stage 6: Black Company Logo (Pyramid/Eye)
    generate('enemy_s6', 32, 32, (gfx) => {
        gfx.fillStyle(0x000000, 1);
        gfx.beginPath();
        gfx.moveTo(16, 2);
        gfx.lineTo(4, 30);
        gfx.lineTo(28, 30);
        gfx.fillPath();
        // Evil Eye
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(16, 20, 4);
    });

    // --- Bosses per Stage ---

    const bossSize = 96; // Larger than normal

    // Boss 1: Station Master (Hat & Whistle)
    generate('boss_s1', bossSize, bossSize, (gfx) => {
        gfx.fillStyle(0x1a237e, 1); // Blue Uniform
        gfx.fillRect(20, 30, 56, 60);
        // Hat
        gfx.fillStyle(0x1a237e, 1);
        gfx.fillRect(20, 10, 56, 20);
        gfx.fillStyle(0xffd700, 1); // Gold Badge
        gfx.fillCircle(48, 20, 8);
        gfx.fillStyle(0x000000, 1); // Brim
        gfx.fillRect(10, 25, 76, 5);
        // Angry Face
        gfx.fillStyle(0xffdbac, 1);
        gfx.fillRect(30, 35, 36, 30);
        gfx.fillStyle(0xff0000, 1); // Yelling mouth
        gfx.fillRect(35, 55, 26, 8);
    });

    // Boss 2: Mountain of Paperwork
    generate('boss_s2', bossSize, bossSize, (gfx) => {
        gfx.fillStyle(0xffffff, 1);
        // Stack of papers
        for(let i=0; i<10; i++) {
            gfx.fillStyle(i%2===0 ? 0xeeeeee : 0xffffff, 1);
            gfx.fillRect(10 + (i*2), 80 - (i*8), 70, 10);
            gfx.lineStyle(1, 0xcccccc);
            gfx.strokeRect(10 + (i*2), 80 - (i*8), 70, 10);
        }
        // Red Stamps all over
        gfx.fillStyle(0xff0000, 0.6);
        gfx.fillCircle(30, 30, 15);
        gfx.fillCircle(60, 50, 15);
        gfx.fillCircle(40, 70, 15);
    });

    // Boss 3: The Angry Caller (Giant Phone/Headset)
    generate('boss_s3', bossSize, bossSize, (gfx) => {
        gfx.fillStyle(0x333333, 1); // Phone Base
        gfx.fillRect(10, 20, 76, 60);
        // Screen with Angry Emoji
        gfx.fillStyle(0x00ff00, 1); // Backlit
        gfx.fillRect(20, 30, 56, 40);
        // Angry Eyebrows
        gfx.lineStyle(4, 0x000000);
        gfx.beginPath();
        gfx.moveTo(25, 40);
        gfx.lineTo(40, 50);
        gfx.moveTo(70, 40);
        gfx.lineTo(55, 50);
        gfx.strokePath();
    });

    // Boss 4: Section Chief (Desk & Computer)
    generate('boss_s4', bossSize, bossSize, (gfx) => {
        // Desk
        gfx.fillStyle(0x8b4513, 1);
        gfx.fillRect(5, 60, 86, 30);
        // Person
        gfx.fillStyle(0x555555, 1); // Suit
        gfx.fillRect(25, 20, 46, 40);
        gfx.fillStyle(0xffdbac, 1); // Head
        gfx.fillCircle(48, 15, 15);
        // Shining Glasses
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillRect(38, 10, 20, 8);
    });

    // Boss 5: The Server Room (Cables & Racks)
    generate('boss_s5', bossSize, bossSize, (gfx) => {
        gfx.fillStyle(0x111111, 1); // Black Rack
        gfx.fillRect(10, 0, 76, 90);
        // Blinking lights
        gfx.fillStyle(0x00ff00, 1);
        for(let y=10; y<80; y+=10) {
            for(let x=20; x<80; x+=15) {
                if (Math.random() > 0.5) gfx.fillStyle(0xff0000, 1);
                else gfx.fillStyle(0x00ff00, 1);
                gfx.fillCircle(x, y, 3);
            }
        }
    });

    // Boss 6: The CEO (Godlike Aura)
    generate('boss_s6', bossSize, bossSize, (gfx) => {
        // Gold Aura
        gfx.fillStyle(0xffd700, 0.5);
        gfx.fillCircle(48, 48, 45);
        // Silhouette
        gfx.fillStyle(0x000000, 1);
        gfx.fillTriangle(48, 10, 10, 80, 86, 80);
        // Red Eyes
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(38, 40, 4);
        gfx.fillCircle(58, 40, 4);
    });

    // --- Items ---

    // Score: Hanko (Stamp)
    generate('item_score', 24, 24, (gfx) => {
        gfx.fillStyle(0xffffff, 1); // Paper bg
        gfx.fillCircle(12, 12, 12);
        gfx.lineStyle(2, 0xff0000); // Red border
        gfx.strokeCircle(12, 12, 10);
        // 済 character-ish
        gfx.fillStyle(0xff0000, 1);
        gfx.fillRect(8, 8, 8, 8);
    });

    // Powerup: Energy Drink
    generate('item_powerup', 24, 24, (gfx) => {
        gfx.fillStyle(0x0000ff, 1); // Blue can
        gfx.fillRect(6, 4, 12, 18);
        gfx.fillStyle(0xc0c0c0, 1); // Top
        gfx.fillRect(6, 2, 12, 2);
        // Lightning bolt
        gfx.fillStyle(0xffff00, 1);
        gfx.beginPath();
        gfx.moveTo(14, 6);
        gfx.lineTo(8, 12);
        gfx.lineTo(16, 12);
        gfx.lineTo(10, 20);
        gfx.fillPath();
    });

    // Heal: Coffee
    generate('item_heal', 24, 24, (gfx) => {
        gfx.fillStyle(0xffffff, 1); // Cup
        gfx.fillRect(6, 8, 14, 12);
        gfx.lineStyle(2, 0xffffff);
        gfx.strokeRect(6, 8, 14, 12);
        // Handle
        gfx.beginPath();
        gfx.moveTo(20, 10);
        gfx.lineTo(24, 12);
        gfx.lineTo(20, 16);
        gfx.strokePath();
        // Brown liquid
        gfx.fillStyle(0x6f4e37, 1);
        gfx.fillRect(8, 10, 10, 8);
    });

    // Bomb: Resignation Envelope
    generate('item_bomb', 24, 24, (gfx) => {
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(2, 6, 20, 14);
        // Red seal
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(12, 13, 3);
        // Text lines
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(4, 8, 2, 10); // "Tai"
        gfx.fillRect(8, 8, 2, 10); // "Shoku"
    });

    // Weapon: Laser (Chip/Card)
    generate('item_weapon_laser', 24, 24, (gfx) => {
        gfx.fillStyle(0x00ffff, 1); // Cyan card
        gfx.fillRect(4, 4, 16, 16);
        gfx.lineStyle(2, 0xffffff);
        gfx.strokeRect(4, 4, 16, 16);
        // L text
        gfx.fillStyle(0x000000, 1);
        // Simple pixel font 'L'
        gfx.fillRect(8, 8, 2, 8);
        gfx.fillRect(8, 14, 6, 2);
    });

    // Weapon: Flame (Canister)
    generate('item_weapon_flame', 24, 24, (gfx) => {
        gfx.fillStyle(0xff4500, 1); // Orange Tank
        gfx.fillRoundedRect(6, 4, 12, 16, 2);
        // F text
        gfx.fillStyle(0xffff00, 1);
        // Simple pixel font 'F'
        gfx.fillRect(10, 8, 6, 2);
        gfx.fillRect(10, 8, 2, 8);
        gfx.fillRect(10, 12, 4, 2);
    });
  }
}
