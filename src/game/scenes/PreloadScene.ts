import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Load Backgrounds (Generate them procedurally if not present)
    // We will generate them in create() and use them as textures
  }

  create() {
    this.createProceduralGraphics();
    this.createProceduralBackgrounds();
    this.scene.start('TitleScene');
  }

  createProceduralBackgrounds() {
      const width = 600;
      const height = 1066;

      const generateBg = (key: string, color1: number, color2: number, details: (gfx: Phaser.GameObjects.Graphics) => void) => {
          const gfx = this.make.graphics({ x: 0, y: 0 });
          
          // Gradient Background
          gfx.fillGradientStyle(color1, color1, color2, color2, 1);
          gfx.fillRect(0, 0, width, height);

          details(gfx);

          gfx.generateTexture(key, width, height);
          gfx.destroy();
      };

      // Stage 1: Morning Commute (Blue Sky + City Silhouette)
      generateBg('bg_stage1', 0x87CEEB, 0xE0F7FA, (gfx) => {
          gfx.fillStyle(0x95a5a6, 1);
          // Cityscape
          for(let i=0; i<20; i++) {
              const h = Phaser.Math.Between(100, 400);
              const w = Phaser.Math.Between(50, 150);
              const x = Phaser.Math.Between(0, width);
              gfx.fillRect(x, height - h, w, h);
          }
      });

      // Stage 2: Office Building (Grey/White + Windows)
      generateBg('bg_stage2', 0xf5f5f5, 0xdcdcdc, (gfx) => {
          gfx.lineStyle(2, 0xbdc3c7, 0.5);
          // Grid pattern
          for(let y=0; y<height; y+=50) {
              gfx.moveTo(0, y);
              gfx.lineTo(width, y);
          }
          for(let x=0; x<width; x+=50) {
              gfx.moveTo(x, 0);
              gfx.lineTo(x, height);
          }
          gfx.strokePath();
      });

      // Stage 3: Email Storm (Digital Chaos - Blue/White)
      generateBg('bg_stage3', 0x2196f3, 0xffffff, (gfx) => {
          gfx.fillStyle(0xe3f2fd, 0.5);
          // Flying envelopes/packets
          for(let i=0; i<30; i++) {
              const x = Phaser.Math.Between(0, width);
              const y = Phaser.Math.Between(0, height);
              gfx.fillRect(x, y, 20, 14);
          }
      });

      // Stage 4: Middle Management (Sunset/Evening - Overtime)
      generateBg('bg_stage4', 0xFF9800, 0x3e2723, (gfx) => {
          gfx.fillStyle(0x000000, 0.3);
          // Dark office silhouettes
          for(let i=0; i<15; i++) {
              const h = Phaser.Math.Between(100, 300);
              const w = Phaser.Math.Between(60, 150);
              const x = Phaser.Math.Between(0, width);
              gfx.fillRect(x, height - h, w, h);
          }
      });

      // Stage 5: Server Room (Matrix Green/Black)
      generateBg('bg_stage5', 0x000000, 0x001100, (gfx) => {
          gfx.fillStyle(0x00ff00, 0.2);
          // Code rain look
          for(let i=0; i<200; i++) {
              const x = Phaser.Math.Between(0, width);
              const y = Phaser.Math.Between(0, height);
              gfx.fillRect(x, y, 2, Phaser.Math.Between(10, 30));
          }
      });

      // Stage 6: The Void/Black Company (Red/Black Chaos)
      generateBg('bg_stage6', 0x2c0000, 0x000000, (gfx) => {
          gfx.lineStyle(2, 0xff0000, 0.3);
          // Chaos lines
          for(let i=0; i<50; i++) {
              gfx.moveTo(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height));
              gfx.lineTo(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height));
          }
          gfx.strokePath();
      });
  }

  createProceduralGraphics() {
    // Helper to clean up
    const generate = (key: string, width: number, height: number, drawFn: (gfx: Phaser.GameObjects.Graphics) => void) => {
        const gfx = this.make.graphics({ x: 0, y: 0 });
        drawFn(gfx);
        gfx.generateTexture(key, width, height);
        gfx.destroy();
    };

    // --- Player: Salaryman (Enhanced) ---
    generate('player', 32, 32, (gfx) => {
        // Aura/Speed lines
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillTriangle(0, 10, 0, 22, 10, 16);

        // Suit Body
        gfx.fillStyle(0x2c3e50, 1); // Dark Blue Suit
        gfx.fillRect(8, 12, 16, 14);
        
        // Head
        gfx.fillStyle(0xffdbac, 1); // Skin
        gfx.fillRect(10, 2, 12, 10);
        
        // Hair (Messy)
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(10, 2, 12, 4);
        gfx.fillRect(8, 4, 2, 6);
        gfx.fillRect(22, 4, 2, 6);
        gfx.fillRect(12, 0, 4, 2); // Ahoge
        
        // Shirt
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(14, 12, 4, 10);
        
        // Tie (Flying back)
        gfx.fillStyle(0xe74c3c, 1); // Red
        gfx.fillRect(15, 12, 2, 6);
        gfx.fillTriangle(15, 18, 17, 18, 13, 22); // Flapping tie
        
        // Briefcase (Held in front)
        gfx.fillStyle(0x5d4037, 1);
        gfx.fillRect(20, 16, 10, 8);
        gfx.fillStyle(0xffd700, 1);
        gfx.fillRect(24, 16, 2, 2);

        // Legs (Flying pose)
        gfx.fillStyle(0x2c3e50, 1);
        gfx.fillRect(6, 26, 8, 4); // Left leg back
        gfx.fillRect(18, 26, 8, 4); // Right leg straight
    });

    // --- Projectiles ---
    // Normal Bullet (Glowing)
    generate('bullet', 16, 16, (gfx) => {
        gfx.fillStyle(0xffff00, 1);
        gfx.fillCircle(8, 8, 4);
        gfx.lineStyle(2, 0xffffff, 0.8);
        gfx.strokeCircle(8, 8, 6);
        gfx.fillStyle(0xffffff, 0.4);
        gfx.fillCircle(8, 8, 8); // Glow
    });

    // Laser Beam (Detailed)
    generate('bullet_laser', 16, 64, (gfx) => {
        gfx.fillStyle(0x00ffff, 0.8); // Cyan core
        gfx.fillRect(6, 0, 4, 64);
        gfx.lineStyle(2, 0x0088ff, 0.5); // Blue glow
        gfx.strokeRect(4, 0, 8, 64);
        gfx.fillStyle(0xffffff, 0.9); // White hot center
        gfx.fillRect(7, 0, 2, 64);
    });

    // Flame Particle (Animated look)
    generate('bullet_flame', 32, 32, (gfx) => {
        gfx.fillStyle(0xff4500, 0.6); // OrangeRed outer
        gfx.fillCircle(16, 16, 12);
        gfx.fillStyle(0xff8c00, 0.8); // DarkOrange mid
        gfx.fillCircle(16, 16, 8);
        gfx.fillStyle(0xffff00, 1); // Yellow center
        gfx.fillCircle(16, 16, 4);
    });

    // --- Enemies per Stage (Enhanced) ---

    // Stage 1: Commuter (Bag/Person rushing)
    generate('enemy_s1', 32, 32, (gfx) => {
        // Briefcase Monster
        gfx.fillStyle(0x8b4513, 1); // Brown leather
        gfx.fillRoundedRect(4, 6, 24, 18, 2);
        gfx.fillStyle(0xffd700, 1); // Gold Buckle
        gfx.fillRect(14, 10, 4, 4);
        // Handle
        gfx.lineStyle(2, 0x3e2723);
        gfx.strokeRect(10, 2, 12, 4);
        // Angry Eyes
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(10, 12, 4);
        gfx.fillCircle(22, 12, 4);
        gfx.fillStyle(0xff0000, 1); // Red Pupils
        gfx.fillCircle(10, 12, 1.5);
        gfx.fillCircle(22, 12, 1.5);
        // Teeth
        gfx.fillStyle(0xffffff, 1);
        gfx.fillTriangle(12, 20, 14, 24, 16, 20);
        gfx.fillTriangle(16, 20, 18, 24, 20, 20);
    });

    // Stage 2: Email/Letter (Flying)
    generate('enemy_s2', 32, 32, (gfx) => {
        gfx.fillStyle(0xf5f5f5, 1); // White paper
        gfx.fillRect(2, 8, 28, 18);
        gfx.lineStyle(1, 0xbdbdbd);
        gfx.strokeRect(2, 8, 28, 18);
        // Envelope flap
        gfx.beginPath();
        gfx.moveTo(2, 8);
        gfx.lineTo(16, 20);
        gfx.lineTo(30, 8);
        gfx.strokePath();
        // Wings
        gfx.fillStyle(0xe0f7fa, 0.8);
        gfx.fillTriangle(2, 10, -6, 4, 2, 18); // Left wing
        gfx.fillTriangle(30, 10, 38, 4, 30, 18); // Right wing
        // Notification Badge
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(28, 6, 5);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(27, 3, 2, 6); // Exclamation
        gfx.fillRect(27, 10, 2, 2);
    });

    // Stage 3: Phone/Receiver (Ringing)
    generate('enemy_s3', 32, 32, (gfx) => {
        gfx.fillStyle(0x424242, 1); // Dark Grey
        // Receiver handle
        gfx.fillRoundedRect(8, 4, 16, 24, 4);
        // Ear and Mouth pieces
        gfx.fillStyle(0x212121, 1);
        gfx.fillCircle(16, 8, 7);
        gfx.fillCircle(16, 24, 7);
        // Sound waves (Red)
        gfx.lineStyle(2, 0xff1744);
        gfx.beginPath();
        gfx.arc(16, 24, 10, 0, Math.PI, false);
        gfx.strokePath();
        gfx.beginPath();
        gfx.arc(16, 24, 14, 0, Math.PI, false);
        gfx.strokePath();
    });

    // Stage 4: Middle Manager (Glasses & Moustache)
    generate('enemy_s4', 32, 32, (gfx) => {
        gfx.fillStyle(0xffcc80, 1); // Face
        gfx.fillCircle(16, 16, 14);
        // Hair (Balding)
        gfx.fillStyle(0x4e342e, 1);
        gfx.beginPath();
        gfx.arc(16, 16, 14, Math.PI, 0, false);
        gfx.lineTo(28, 16);
        gfx.lineTo(4, 16);
        gfx.fillPath();
        // Glasses
        gfx.lineStyle(2, 0x000000);
        gfx.strokeCircle(10, 14, 5);
        gfx.strokeCircle(22, 14, 5);
        gfx.lineStyle(1, 0x000000);
        gfx.beginPath();
        gfx.moveTo(15, 14);
        gfx.lineTo(17, 14);
        gfx.strokePath();
        // Moustache
        gfx.fillStyle(0x3e2723, 1);
        gfx.fillRect(10, 22, 12, 4);
        // Sweat drop
        gfx.fillStyle(0x00b0ff, 1);
        gfx.fillCircle(26, 8, 3);
    });

    // Stage 5: Error Dialog/Bug
    generate('enemy_s5', 32, 32, (gfx) => {
        gfx.fillStyle(0xe0e0e0, 1); // Window
        gfx.fillRect(2, 4, 28, 24);
        gfx.fillStyle(0x1565c0, 1); // Title bar
        gfx.fillRect(2, 4, 28, 6);
        // X button
        gfx.fillStyle(0xd32f2f, 1);
        gfx.fillRect(24, 5, 4, 4);
        // Bug icon (Green beetle)
        gfx.fillStyle(0x4caf50, 1);
        gfx.fillCircle(16, 18, 7);
        gfx.lineStyle(1, 0x1b5e20);
        gfx.beginPath();
        gfx.moveTo(16, 11);
        gfx.lineTo(16, 25); // Spine
        gfx.moveTo(16, 18);
        gfx.lineTo(8, 14); // Legs
        gfx.moveTo(16, 18);
        gfx.lineTo(24, 14);
        gfx.moveTo(16, 20);
        gfx.lineTo(8, 22);
        gfx.moveTo(16, 20);
        gfx.lineTo(24, 22);
        gfx.strokePath();
    });

    // Stage 6: Black Company Logo (Pyramid/Eye)
    generate('enemy_s6', 32, 32, (gfx) => {
        // Dark Aura
        gfx.fillStyle(0x000000, 0.3);
        gfx.fillCircle(16, 16, 16);
        // Pyramid
        gfx.fillStyle(0x212121, 1);
        gfx.fillTriangle(16, 4, 4, 28, 28, 28);
        // Evil Eye
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(16, 18, 5);
        gfx.fillStyle(0xffff00, 1); // Pupil
        gfx.fillRect(15, 14, 2, 8); // Slit pupil
    });

    // --- Bosses per Stage (Enhanced) ---

    const bossSize = 96;

    // Boss 1: Station Master (Hat & Whistle) - Enhanced
    generate('boss_s1', bossSize, bossSize, (gfx) => {
        // Body
        gfx.fillStyle(0x1a237e, 1); // Blue Uniform
        gfx.fillRect(20, 30, 56, 60);
        gfx.fillStyle(0xffd700, 1); // Buttons
        gfx.fillCircle(48, 45, 4);
        gfx.fillCircle(48, 60, 4);
        gfx.fillCircle(48, 75, 4);
        
        // Epaulettes
        gfx.fillStyle(0xffd700, 1);
        gfx.fillRect(15, 30, 15, 8);
        gfx.fillRect(66, 30, 15, 8);

        // Hat
        gfx.fillStyle(0x1a237e, 1);
        gfx.fillRect(20, 10, 56, 20);
        gfx.fillStyle(0xffd700, 1); // Gold Badge
        // Star manually
        gfx.beginPath();
        gfx.moveTo(48, 15);
        gfx.lineTo(49, 18);
        gfx.lineTo(52, 18);
        gfx.lineTo(50, 20);
        gfx.lineTo(51, 23);
        gfx.lineTo(48, 21);
        gfx.lineTo(45, 23);
        gfx.lineTo(46, 20);
        gfx.lineTo(44, 18);
        gfx.lineTo(47, 18);
        gfx.closePath();
        gfx.fillPath();

        gfx.fillStyle(0x000000, 1); // Brim
        gfx.fillRect(10, 25, 76, 5);
        
        // Face
        gfx.fillStyle(0xffdbac, 1);
        gfx.fillRect(30, 35, 36, 30);
        // Eyes (Angry)
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(38, 45, 6);
        gfx.fillCircle(58, 45, 6);
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(38, 45, 2);
        gfx.fillCircle(58, 45, 2);
        gfx.lineStyle(2, 0x000000); // Eyebrows
        gfx.beginPath();
        gfx.moveTo(32, 40);
        gfx.lineTo(44, 46);
        gfx.moveTo(64, 40);
        gfx.lineTo(52, 46);
        gfx.strokePath();
        
        // Whistle
        gfx.fillStyle(0xc0c0c0, 1);
        gfx.fillRect(44, 60, 8, 12);
        // Steam from ears (Angry)
        gfx.fillStyle(0xffffff, 0.5);
        gfx.fillCircle(25, 40, 5);
        gfx.fillCircle(71, 40, 5);
    });

    // Boss 2: Mountain of Paperwork - Enhanced
    generate('boss_s2', bossSize, bossSize, (gfx) => {
        // Stack of papers (Messy)
        for(let i=0; i<20; i++) {
            gfx.fillStyle(i%2===0 ? 0xf5f5f5 : 0xffffff, 1);
            const w = 70 - (i*1.5);
            const x = 13 + (i) + Math.sin(i)*8;
            const y = 85 - (i*4);
            gfx.fillRect(x, y, w, 8);
            gfx.lineStyle(1, 0xe0e0e0);
            gfx.strokeRect(x, y, w, 8);
        }
        // Hanko Stamps
        gfx.fillStyle(0xd32f2f, 0.7);
        gfx.fillCircle(30, 30, 12);
        gfx.fillCircle(60, 50, 12);
        gfx.fillCircle(40, 70, 12);
        // Text on stamps
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillRect(26, 26, 8, 8);
        // Flying papers
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillRect(10, 20, 15, 20);
        gfx.fillRect(70, 10, 15, 20);
    });

    // Boss 3: The Angry Caller (Giant Phone) - Enhanced
    generate('boss_s3', bossSize, bossSize, (gfx) => {
        gfx.fillStyle(0x212121, 1); // Phone Base
        gfx.fillRoundedRect(10, 10, 76, 80, 8);
        // Screen
        gfx.fillStyle(0x64dd17, 1); // Bright Green Backlight
        gfx.fillRect(20, 20, 56, 40);
        // Angry Emoji Face
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(35, 35, 4); // Eye
        gfx.fillCircle(61, 35, 4); // Eye
        gfx.lineStyle(3, 0x000000);
        gfx.beginPath();
        gfx.moveTo(30, 30);
        gfx.lineTo(40, 38); // Eyebrow
        gfx.moveTo(66, 30);
        gfx.lineTo(56, 38); // Eyebrow
        gfx.moveTo(30, 50);
        // Simple frown line instead of bezier
        gfx.lineTo(48, 40);
        gfx.lineTo(66, 50);
        gfx.strokePath();
        
        // Buttons
        gfx.fillStyle(0x424242, 1);
        for(let i=0; i<3; i++) {
            for(let j=0; j<3; j++) {
                gfx.fillRect(25 + (i*16), 65 + (j*8), 12, 6);
            }
        }
        // Antenna
        gfx.lineStyle(4, 0x000000);
        gfx.beginPath();
        gfx.moveTo(80, 20);
        gfx.lineTo(90, 5);
        gfx.strokePath();
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(90, 5, 4);
    });

    // Boss 4: Section Chief (Desk Fortress) - Enhanced
    generate('boss_s4', bossSize, bossSize, (gfx) => {
        // Desk
        gfx.fillStyle(0x5d4037, 1);
        gfx.fillRect(5, 60, 86, 30);
        // Laptop back
        gfx.fillStyle(0x9e9e9e, 1);
        gfx.fillRect(30, 40, 36, 24);
        gfx.fillStyle(0xffffff, 1); // Apple logo-ish
        gfx.fillCircle(48, 52, 4);
        
        // Person peeking over
        gfx.fillStyle(0x455a64, 1); // Suit
        gfx.fillRect(10, 30, 20, 30); // Left arm stack
        gfx.fillRect(66, 30, 20, 30); // Right arm stack
        
        gfx.fillStyle(0xffdbac, 1); // Head
        gfx.fillCircle(48, 25, 15);
        // Shining Glasses
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillRect(38, 20, 20, 8);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeRect(38, 20, 20, 8);
        // Sparkle on glasses
        gfx.fillStyle(0x00e5ff, 1);
        gfx.fillRect(40, 22, 4, 4); // Simple sparkle
        
        // Coffee Mug
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(80, 50, 10, 10);
        gfx.fillStyle(0x6f4e37, 1);
        gfx.fillRect(82, 52, 6, 6);
    });

    // Boss 5: The Server Room (Cables & Racks) - Enhanced
    generate('boss_s5', bossSize, bossSize, (gfx) => {
        gfx.fillStyle(0x212121, 1); // Black Rack
        gfx.fillRect(10, 0, 76, 90);
        gfx.lineStyle(2, 0x424242);
        gfx.strokeRect(10, 0, 76, 90);
        
        // Blinking lights
        for(let y=10; y<80; y+=8) {
            for(let x=20; x<80; x+=10) {
                const color = Math.random() > 0.5 ? 0x00e676 : 0xff1744;
                gfx.fillStyle(color, 1);
                gfx.fillCircle(x, y, 2);
            }
        }
        // Cables - simple lines
        gfx.lineStyle(2, 0x2979ff);
        gfx.beginPath();
        gfx.moveTo(15, 85);
        gfx.lineTo(30, 95);
        gfx.lineTo(50, 70);
        gfx.lineTo(80, 85);
        gfx.strokePath();
        
        // Warning Sign
        gfx.fillStyle(0xffff00, 1);
        gfx.fillTriangle(48, 30, 40, 45, 56, 45);
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(47, 35, 2, 6);
        gfx.fillRect(47, 42, 2, 2);
    });

    // Boss 6: The CEO (Godlike Aura) - Enhanced
    generate('boss_s6', bossSize, bossSize, (gfx) => {
        // Gold Aura (Pulsing)
        gfx.fillStyle(0xffd700, 0.4);
        gfx.fillCircle(48, 48, 46);
        gfx.fillStyle(0xffea00, 0.6);
        gfx.fillCircle(48, 48, 38);
        
        // Silhouette
        gfx.fillStyle(0x000000, 1);
        gfx.fillTriangle(48, 10, 10, 80, 86, 80);
        
        // Red Eyes (Glowing)
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(38, 40, 4);
        gfx.fillCircle(58, 40, 4);
        gfx.fillStyle(0xff8a80, 1);
        gfx.fillCircle(38, 40, 2);
        gfx.fillCircle(58, 40, 2);
        
        // Tie (Gold)
        gfx.fillStyle(0xffd700, 1);
        gfx.fillTriangle(48, 50, 44, 70, 52, 70);
        
        // Wings (Angel/Demon)
        gfx.fillStyle(0x000000, 0.8);
        gfx.fillTriangle(10, 40, -10, 10, 10, 60);
        gfx.fillTriangle(86, 40, 106, 10, 86, 60);
    });

    // --- Items (Enhanced) ---

    // Score: Hanko (Stamp)
    generate('item_score', 24, 24, (gfx) => {
        gfx.fillStyle(0xffffff, 1); // Paper bg
        gfx.fillCircle(12, 12, 12);
        gfx.lineStyle(2, 0xd32f2f); // Red border
        gfx.strokeCircle(12, 12, 10);
        // 済 character-ish
        gfx.fillStyle(0xd32f2f, 1);
        gfx.fillRect(8, 8, 8, 8);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(10, 10, 4, 4);
    });

    // Powerup: Energy Drink
    generate('item_powerup', 24, 24, (gfx) => {
        gfx.fillStyle(0x2962ff, 1); // Blue can
        gfx.fillRect(6, 4, 12, 18);
        gfx.fillStyle(0xe0e0e0, 1); // Top
        gfx.fillRect(6, 2, 12, 2);
        // Lightning bolt
        gfx.fillStyle(0xffff00, 1);
        gfx.fillTriangle(14, 6, 8, 12, 16, 12);
        gfx.fillTriangle(10, 20, 16, 12, 8, 12);
    });

    // Weapon: Missile
    generate('item_weapon_missile', 24, 24, (gfx) => {
        gfx.fillStyle(0xff00ff, 1); // Purple
        gfx.fillCircle(12, 12, 10);
        gfx.lineStyle(2, 0xffffff);
        gfx.strokeCircle(12, 12, 10);
        // M icon
        gfx.lineStyle(2, 0xffffff);
        gfx.beginPath();
        gfx.moveTo(8, 16);
        gfx.lineTo(8, 8);
        gfx.lineTo(12, 12);
        gfx.lineTo(16, 8);
        gfx.lineTo(16, 16);
        gfx.strokePath();
    });

    // Weapon: Shotgun
    generate('item_weapon_shotgun', 24, 24, (gfx) => {
        gfx.fillStyle(0xffff00, 1); // Yellow
        gfx.fillCircle(12, 12, 10);
        gfx.lineStyle(2, 0xffffff);
        gfx.strokeCircle(12, 12, 10);
        // S icon
        gfx.lineStyle(2, 0xffffff);
        gfx.beginPath();
        gfx.moveTo(16, 8);
        gfx.lineTo(10, 8);
        gfx.lineTo(8, 10);
        gfx.lineTo(16, 14);
        gfx.lineTo(14, 16);
        gfx.lineTo(8, 16);
        gfx.strokePath();
    });

    // Weapon: Beam
    generate('item_weapon_beam', 24, 24, (gfx) => {
        gfx.fillStyle(0x00ffff, 1); // Cyan
        gfx.fillCircle(12, 12, 10);
        gfx.lineStyle(2, 0xffffff);
        gfx.strokeCircle(12, 12, 10);
        // B icon
        gfx.lineStyle(2, 0xffffff);
        gfx.beginPath();
        gfx.moveTo(8, 8);
        gfx.lineTo(14, 8);
        gfx.lineTo(16, 10);
        gfx.lineTo(14, 12);
        gfx.lineTo(8, 12);
        gfx.moveTo(8, 12);
        gfx.lineTo(14, 12);
        gfx.lineTo(16, 14);
        gfx.lineTo(14, 16);
        gfx.lineTo(8, 16);
        gfx.lineTo(8, 8);
        gfx.strokePath();
    });

    // Heal: Coffee
    generate('item_heal', 24, 24, (gfx) => {
        gfx.fillStyle(0xffffff, 1); // Cup
        gfx.fillRect(6, 8, 14, 12);
        gfx.lineStyle(2, 0xffffff);
        gfx.strokeRect(6, 8, 14, 12);
        // Handle
        gfx.lineStyle(2, 0xffffff);
        gfx.beginPath();
        gfx.moveTo(20, 10);
        // Simple handle
        gfx.lineTo(24, 12);
        gfx.lineTo(20, 16);
        gfx.strokePath();
        // Steam
        gfx.lineStyle(1, 0xffffff, 0.5);
        gfx.beginPath();
        gfx.moveTo(10, 4);
        gfx.lineTo(10, 6);
        gfx.moveTo(14, 3);
        gfx.lineTo(14, 6);
        gfx.strokePath();
        // Brown liquid
        gfx.fillStyle(0x4e342e, 1);
        gfx.fillRect(8, 10, 10, 8);
    });

    // Bomb: Resignation Envelope
    generate('item_bomb', 24, 24, (gfx) => {
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(2, 6, 20, 14);
        // Red seal
        gfx.fillStyle(0xd32f2f, 1);
        gfx.fillCircle(12, 13, 3);
        // Text lines
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(4, 8, 2, 10); // "Tai"
        gfx.fillRect(8, 8, 2, 10); // "Shoku"
    });

    // Weapon: Laser (Chip/Card)
    generate('item_weapon_laser', 24, 24, (gfx) => {
        gfx.fillStyle(0x00e5ff, 1); // Cyan card
        gfx.fillRoundedRect(4, 4, 16, 16, 2);
        gfx.lineStyle(2, 0xffffff);
        gfx.strokeRoundedRect(4, 4, 16, 16, 2);
        // L text
        gfx.fillStyle(0x000000, 1);
        gfx.fillRect(8, 8, 2, 8);
        gfx.fillRect(8, 14, 6, 2);
    });

    // Weapon: Flame (Canister)
    generate('item_weapon_flame', 24, 24, (gfx) => {
        gfx.fillStyle(0xff3d00, 1); // Orange Tank
        gfx.fillRoundedRect(6, 4, 12, 16, 4);
        // F text
        gfx.fillStyle(0xffff00, 1);
        gfx.fillRect(10, 8, 6, 2);
        gfx.fillRect(10, 8, 2, 8);
        gfx.fillRect(10, 12, 4, 2);
    });
  }
}
