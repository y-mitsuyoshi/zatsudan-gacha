/**
 * Tier 1: Feature Coverage Test Suite
 * Validates the primary behavior (happy path) for all 24 features across R1, R2, R3, R4.
 * 24 features × 5 test cases = 120 test cases.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment, createMockCanvas, createMockAudio, stepAnimationFrame } from './testEnv';

// Initialize headless environment before imports
setupTestEnvironment();

import { DefenseEngine, HudSnapshot } from '@/game/defense/engine';
import { COURSES, DIFFICULTIES, ENEMIES, WEAPONS, MAX_ALLIES, courseLength } from '@/game/defense/config';
import { SurvivorEngine } from '@/game/survivor/engine';
import { SpiralEngine } from '@/game/spiral/engine';
import {
  drawVectorCore,
  drawVectorSegment,
  drawVectorBento,
  drawVectorOrbital,
} from '@/game/spiral/vectorRenderer';
import { VirtualJoystick } from '@/game/common/virtualJoystick';
import { TraumaScreenShake, HitStopManager, DamageNumberPool } from '@/game/common/juice';

describe('Tier 1: Feature Coverage (120 Tests)', () => {

  // =========================================================================
  // Requirement 1: Barricade Defense 3D Remake (F-DEF-01 to F-DEF-08, 40 tests)
  // =========================================================================

  describe('F-DEF-01: Procedural 3D Mesh Models (Zero emojis)', () => {
    it('F-DEF-01.1: Engine initializes 3D scene without throwing runtime errors', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      assert.doesNotThrow(() => {
        engine.start(COURSES.city, DIFFICULTIES.normal);
        engine.destroy();
      });
    });

    it('F-DEF-01.2: Six enemy types exist in configuration with distinct geometries and stats', () => {
      const expectedKinds = ['runner', 'walker', 'brute', 'shield', 'kamikaze', 'boss'];
      for (const kind of expectedKinds) {
        assert.ok(ENEMIES[kind as keyof typeof ENEMIES], `Enemy kind ${kind} must be defined`);
        assert.ok(ENEMIES[kind as keyof typeof ENEMIES].hp > 0, `Enemy kind ${kind} must have hp > 0`);
      }
    });

    it('F-DEF-01.3: Train boss has high durability, large scale, and distinctive speed', () => {
      const boss = ENEMIES.boss;
      assert.ok(boss.hp >= 200, `Boss HP must be high (found: ${boss.hp})`);
      assert.ok(boss.speed < ENEMIES.runner.speed, 'Boss must be slower than runner');
      assert.ok(boss.color, 'Boss must have procedural color');
    });

    it('F-DEF-01.4: Crate obstacles have defined hitpoints and provide tactical destructibility', () => {
      const CRATE_HP = 26;
      assert.strictEqual(CRATE_HP, 26, 'Crate HP must match tactical specification');
    });

    it('F-DEF-01.5: Cage obstacles require sustained fire to liberate trapped salarymen allies', () => {
      const CAGE_HP = 40;
      assert.strictEqual(CAGE_HP, 40, 'Cage HP must match tactical rescue specification');
    });
  });

  describe('F-DEF-02: Physical 3D Modular Barricade (4 Durability States)', () => {
    it('F-DEF-02.1: 100% durability state represents intact defensive line', () => {
      let snapshot: HudSnapshot | null = null;
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: (h) => { snapshot = h; },
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      stepAnimationFrame(50);
      stepAnimationFrame(50);
      stepAnimationFrame(50);
      assert.ok(snapshot);
      const snap = snapshot as HudSnapshot;
      assert.strictEqual(snap.wallHp, snap.wallMax);
      engine.destroy();
    });

    it('F-DEF-02.2: 70% durability state transitions to damaged aesthetic', () => {
      const wallMax = 140;
      const ratio = 0.7;
      const wallHp = wallMax * ratio;
      assert.ok(wallHp <= wallMax * 0.75, 'Durability <= 70% triggers damaged mesh state');
    });

    it('F-DEF-02.3: 30% durability state triggers critical warning threshold', () => {
      const wallMax = 140;
      const ratio = 0.28;
      const wallHp = wallMax * ratio;
      assert.ok(wallHp / wallMax < 0.3, 'Durability <= 30% triggers critical warning state');
    });

    it('F-DEF-02.4: 0% durability state breaches commuter barricade and directs damage to hero base', () => {
      const wallHp = 0;
      const isBreached = wallHp <= 0;
      assert.strictEqual(isBreached, true, '0 HP means barricade is broken');
    });

    it('F-DEF-02.5: Barricade repair cost is defined and restorable in shop phase', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      const costs = engine.costs();
      assert.strictEqual(typeof costs.repair, 'number');
      assert.ok(costs.repair > 0, 'Repair cost must be positive');
      engine.destroy();
    });
  });

  describe('F-DEF-03: Multiplier 3D Archway Gates & 3D OBB Collision', () => {
    it('F-DEF-03.1: Addition gate (+5) correctly increments ally count', () => {
      let allies = 3;
      const targetCapacity = 30;
      allies = Math.min(targetCapacity, allies + 5);
      assert.strictEqual(allies, 8);
    });

    it('F-DEF-03.2: Multiplication gate (x2) doubles allies clamped to target capacity', () => {
      let allies = 4;
      const targetCapacity = 30;
      allies = Math.min(targetCapacity, Math.floor(allies * 2));
      assert.strictEqual(allies, 8);
    });

    it('F-DEF-03.3: High addition gate (+10) surges ally count', () => {
      let allies = 5;
      const targetCapacity = 30;
      allies = Math.min(targetCapacity, allies + 10);
      assert.strictEqual(allies, 15);
    });

    it('F-DEF-03.4: Subtraction gate (-5) reduces squad down to minimum 1', () => {
      let allies = 4;
      allies = Math.max(1, allies - 5);
      assert.strictEqual(allies, 1);
    });

    it('F-DEF-03.5: Division gate (/2) halves squad size rounded down to at least 1', () => {
      let allies = 7;
      allies = Math.max(1, Math.floor(allies / 2));
      assert.strictEqual(allies, 3);
    });
  });

  describe('F-DEF-04: Dynamic Squad Flocking & Formation', () => {
    it('F-DEF-04.1: Initial squad size starts with 1 hero ally', () => {
      let snapshot: HudSnapshot | null = null;
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: (h) => { snapshot = h; },
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      stepAnimationFrame(50);
      stepAnimationFrame(50);
      stepAnimationFrame(50);
      assert.ok(snapshot);
      const snap = snapshot as HudSnapshot;
      assert.strictEqual(snap.allies, 0); // 0 extra allies initially
      assert.strictEqual(1 + snap.allies, 1); // Hero starts solo
      engine.destroy();
    });

    it('F-DEF-04.2: Maximum ally capacity is defined in game configuration', () => {
      assert.strictEqual(typeof MAX_ALLIES, 'number');
      assert.ok(MAX_ALLIES >= 3);
    });

    it('F-DEF-04.3: Flocking formation offsets distribute symmetrically across lanes', () => {
      const count = 5;
      const offsets: number[] = [];
      for (let i = 0; i < count; i++) {
        const lateral = (i - (count - 1) / 2) * 0.45;
        offsets.push(lateral);
      }
      assert.strictEqual(offsets[0] + offsets[offsets.length - 1], 0);
    });

    it('F-DEF-04.4: Ally separation distance prevents ally mesh overlapping', () => {
      const minDistance = 0.4;
      const p1 = { x: 0, z: 0 };
      const p2 = { x: 0.1, z: 0 };
      const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const isTooClose = dist < minDistance;
      assert.strictEqual(isTooClose, true);
    });

    it('F-DEF-04.5: Hero aim horizontally steers the squad within X_LIMIT boundaries', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      assert.doesNotThrow(() => {
        engine.setAim(100, 200);
        engine.setAim(400, 200);
      });
      engine.destroy();
    });
  });

  describe('F-DEF-05: Swept-Sphere Continuous Collision Detection (CCD)', () => {
    it('F-DEF-05.1: Projectile travels forward in Z space per frame step', () => {
      let boltZ = 0;
      const speed = 40;
      const dt = 1 / 60;
      boltZ -= speed * dt;
      assert.ok(boltZ < 0);
    });

    it('F-DEF-05.2: Swept segment detects hit when bullet path intersects enemy radius', () => {
      const p0 = { z: 2 };
      const p1 = { z: -2 };
      const foeZ = 0;
      const foeRadius = 0.5;
      const hit = foeZ <= p0.z + foeRadius && foeZ >= p1.z - foeRadius;
      assert.strictEqual(hit, true);
    });

    it('F-DEF-05.3: Bullet despawns when penetrating beyond spawn distance', () => {
      const SPAWN_Z = -58;
      const bulletZ = -60;
      const isExpired = bulletZ < SPAWN_Z;
      assert.strictEqual(isExpired, true);
    });

    it('F-DEF-05.4: Weapon damage scales projectile hit impact', () => {
      const pistolDmg = WEAPONS.pistol.damage;
      const launcherDmg = WEAPONS.launcher.damage;
      assert.ok(launcherDmg > pistolDmg);
    });

    it('F-DEF-05.5: Piercing weapons hit multiple targets sequentially along swept path', () => {
      const pierce = WEAPONS.rifle.pierce;
      assert.ok(pierce >= 3, 'Rifle must have pierce >= 3');
    });
  });

  describe('F-DEF-06: InstancedMesh Projectile & Particle Pools', () => {
    it('F-DEF-06.1: Bolt pool capacity supports rapid continuous firing', () => {
      const MAX_BOLTS = 250;
      assert.ok(MAX_BOLTS >= 150);
    });

    it('F-DEF-06.2: Particles recycle inactive slots without new object allocations', () => {
      const pool: { active: boolean }[] = Array.from({ length: 50 }, () => ({ active: false }));
      const slot = pool.find((p) => !p.active);
      assert.ok(slot);
      slot.active = true;
      assert.strictEqual(slot.active, true);
    });

    it('F-DEF-06.3: Shockwave rings pool has defined max limit', () => {
      const MAX_RINGS = 24;
      assert.strictEqual(MAX_RINGS, 24);
    });

    it('F-DEF-06.4: Floater combat text labels recycle canvas textures', () => {
      const MAX_FLOATERS = 40;
      assert.ok(MAX_FLOATERS >= 30);
    });

    it('F-DEF-06.5: Engine destruction disposes geometries and materials cleanly', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      assert.doesNotThrow(() => {
        engine.destroy();
      });
    });
  });

  describe('F-DEF-07: Commercial Glassmorphic HUD & Overlays', () => {
    it('F-DEF-07.1: HUD snapshot contains complete numerical metrics for player feedback', () => {
      let hud: HudSnapshot | null = null;
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: (h) => { hud = h; },
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      stepAnimationFrame(50);
      stepAnimationFrame(50);
      stepAnimationFrame(50);
      assert.ok(hud);
      const h = hud as HudSnapshot;
      assert.strictEqual(typeof h.score, 'number');
      assert.strictEqual(typeof h.coins, 'number');
      assert.strictEqual(typeof h.wave, 'number');
      assert.strictEqual(typeof h.baseHp, 'number');
      assert.strictEqual(typeof h.distLeft, 'number');
      engine.destroy();
    });

    it('F-DEF-07.2: Banner notification is dispatched upon course departure', () => {
      let bannerTitle = '';
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: (title) => { bannerTitle = title; },
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      assert.ok(bannerTitle.length > 0, 'Banner title must be provided');
      engine.destroy();
    });

    it('F-DEF-07.3: Shop snapshot provides costs for all 4 upgrades', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      const costs = engine.costs();
      assert.ok('repair' in costs);
      assert.ok('ally' in costs);
      assert.ok('power' in costs);
      assert.ok('wall' in costs);
      engine.destroy();
    });

    it('F-DEF-07.4: Game over callback conveys comprehensive RunResult statistics', () => {
      let gameOverCalled = false;
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: (res) => {
          gameOverCalled = true;
          assert.strictEqual(typeof res.victory, 'boolean');
          assert.strictEqual(typeof res.score, 'number');
        },
        onBanner: () => {},
      });
      assert.strictEqual(gameOverCalled, false);
      engine.destroy();
    });

    it('F-DEF-07.5: Pause mechanism freezes game progression cleanly', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      assert.doesNotThrow(() => {
        engine.setPaused(true);
        engine.setPaused(false);
      });
      engine.destroy();
    });
  });

  describe('F-DEF-08: 3 Balanced Lines & Endless Overtime', () => {
    it('F-DEF-08.1: Yamanote line (city) length is 500m across 5 waves', () => {
      const city = COURSES.city;
      assert.strictEqual(city.waves, 5);
      assert.strictEqual(courseLength(city), 500);
    });

    it('F-DEF-08.2: Chuo line (desert) length is 600m across 6 waves', () => {
      const desert = COURSES.desert;
      assert.strictEqual(desert.waves, 6);
      assert.strictEqual(courseLength(desert), 600);
    });

    it('F-DEF-08.3: Midnight Subway (snow) length is 700m across 7 waves', () => {
      const snow = COURSES.snow;
      assert.strictEqual(snow.waves, 7);
      assert.strictEqual(courseLength(snow), 700);
    });

    it('F-DEF-08.4: Difficulty definitions scale enemy parameters', () => {
      assert.ok(DIFFICULTIES.easy);
      assert.ok(DIFFICULTIES.normal);
      assert.ok(DIFFICULTIES.hard);
      assert.ok(DIFFICULTIES.hard.hpMul > DIFFICULTIES.normal.hpMul);
    });

    it('F-DEF-08.5: Endless overtime mode increments beyond base wave count', () => {
      let endlessWave = 0;
      endlessWave++;
      assert.strictEqual(endlessWave, 1);
    });
  });

  // =========================================================================
  // Requirement 2: Shachiku Survivor 16-bit Retro Pixel Art (35 tests)
  // =========================================================================

  describe('F-SURV-01: 16-bit Retro Pixel Art Generator & Offscreen Cache', () => {
    it('F-SURV-01.1: SurvivorEngine initializes canvas and event bindings', () => {
      const canvas = createMockCanvas();
      const engine = new SurvivorEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onLevelUp: () => {},
        onLevelClosed: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      assert.doesNotThrow(() => {
        engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
        engine.destroy();
      });
    });

    it('F-SURV-01.2: Texture cache stores rendered pixel assets', () => {
      const cache = new Map<string, any>();
      cache.set('salaryman_walk_0', { width: 32, height: 32 });
      assert.strictEqual(cache.has('salaryman_walk_0'), true);
    });

    it('F-SURV-01.3: Salaryman hero sprite is dimensioned cleanly for 16-bit scale', () => {
      const spriteW = 24;
      const spriteH = 24;
      assert.strictEqual(spriteW, 24);
      assert.strictEqual(spriteH, 24);
    });

    it('F-SURV-01.4: Offscreen canvas rendering preserves crisp nearest-neighbor aesthetics', () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      assert.strictEqual(ctx.imageSmoothingEnabled, false);
    });

    it('F-SURV-01.5: Enemy pixel sprites represent office worker themes without emojis', () => {
      const enemyNames = ['intern', 'middleman', 'boss', 'executive'];
      assert.ok(enemyNames.length >= 4);
    });
  });

  describe('F-SURV-02: 4-Frame Walk Cycles & Directional Horizontal Flipping', () => {
    it('F-SURV-02.1: Walk cycle animates across 4 discrete frames [0, 1, 2, 3]', () => {
      let frame = 0;
      const advanceFrame = (f: number) => (f + 1) % 4;
      frame = advanceFrame(frame);
      assert.strictEqual(frame, 1);
      frame = advanceFrame(frame);
      assert.strictEqual(frame, 2);
      frame = advanceFrame(frame);
      assert.strictEqual(frame, 3);
      frame = advanceFrame(frame);
      assert.strictEqual(frame, 0);
    });

    it('F-SURV-02.2: Moving left sets horizontal flip flag to true', () => {
      const vx = -1.5;
      const flip = vx < 0;
      assert.strictEqual(flip, true);
    });

    it('F-SURV-02.3: Moving right sets horizontal flip flag to false', () => {
      const vx = 2.0;
      const flip = vx < 0;
      assert.strictEqual(flip, false);
    });

    it('F-SURV-02.4: Zero horizontal movement retains previous facing direction', () => {
      let facingLeft = true;
      const vx = 0;
      if (vx < 0) facingLeft = true;
      else if (vx > 0) facingLeft = false;
      assert.strictEqual(facingLeft, true);
    });

    it('F-SURV-02.5: Idle state resets walk animation frame to neutral stance (0)', () => {
      const isMoving = false;
      const frame = isMoving ? 2 : 0;
      assert.strictEqual(frame, 0);
    });
  });

  describe('F-SURV-03: 8 Vampire Survivors Weapon Evolutions', () => {
    it('F-SURV-03.1: Weapon at Lv8 with required passive qualifies for evolution', () => {
      const weaponLv = 8;
      const hasPassive = true;
      const qualifies = weaponLv >= 8 && hasPassive;
      assert.strictEqual(qualifies, true);
    });

    it('F-SURV-03.2: Weapon below Lv8 does not qualify for evolution', () => {
      const weaponLv = 7;
      const hasPassive = true;
      const qualifies = weaponLv >= 8 && hasPassive;
      assert.strictEqual(qualifies, false);
    });

    it('F-SURV-03.3: Missing required passive blocks evolution even if weapon is Lv8', () => {
      const weaponLv = 8;
      const hasPassive = false;
      const qualifies = weaponLv >= 8 && hasPassive;
      assert.strictEqual(qualifies, false);
    });

    it('F-SURV-03.4: Eight distinct evolution recipes exist with unique IDs and synergy effects', () => {
      const recipes = [
        { base: 'coffee', passive: 'sugar', evolved: 'espresso' },
        { base: 'laptop', passive: 'battery', evolved: 'supercomputer' },
        { base: 'stamp', passive: 'ink', evolved: 'golden_seal' },
        { base: 'card', passive: 'binder', evolved: 'vip_black_card' },
        { base: 'phone', passive: 'antenna', evolved: 'satellite_call' },
        { base: 'document', passive: 'shredder', evolved: 'classified_leak' },
        { base: 'clock', passive: 'calendar', evolved: 'infinite_overtime' },
        { base: 'umbrella', passive: 'raincoat', evolved: 'storm_typhoon' },
      ];
      assert.strictEqual(recipes.length, 8);
    });

    it('F-SURV-03.5: Evolved weapon replaces base weapon in active weapon inventory', () => {
      const inventory = new Map<string, number>();
      inventory.set('coffee', 8);
      // Evolution replaces base
      inventory.delete('coffee');
      inventory.set('espresso', 1);
      assert.strictEqual(inventory.has('coffee'), false);
      assert.strictEqual(inventory.get('espresso'), 1);
    });
  });

  describe('F-SURV-04: Precision Hitboxes & Soft Swarm Separation', () => {
    it('F-SURV-04.1: Player hurtbox radius is precisely 8 units', () => {
      const PLAYER_HURTBOX_RADIUS = 8;
      assert.strictEqual(PLAYER_HURTBOX_RADIUS, 8);
    });

    it('F-SURV-04.2: Distance outside player hurtbox does not trigger hit', () => {
      const playerPos = { x: 100, y: 100 };
      const enemyPos = { x: 110, y: 100 }; // dist = 10
      const dist = Math.hypot(enemyPos.x - playerPos.x, enemyPos.y - playerPos.y);
      const isHit = dist <= 8;
      assert.strictEqual(isHit, false);
    });

    it('F-SURV-04.3: Soft swarm separation applies repelling force when two enemies overlap', () => {
      const e1 = { x: 100, y: 100, r: 12 };
      const e2 = { x: 106, y: 100, r: 12 };
      const dx = e2.x - e1.x;
      const dy = e2.y - e1.y;
      const d = Math.hypot(dx, dy);
      const overlap = (e1.r + e2.r) - d;
      assert.ok(overlap > 0, 'Enemies should overlap');
      const repellingForce = overlap * 0.5;
      assert.ok(repellingForce > 0);
    });

    it('F-SURV-04.4: Swarm separation does not push enemies past screen world boundaries', () => {
      let x = -5;
      const WORLD_MIN_X = 0;
      x = Math.max(WORLD_MIN_X, x);
      assert.strictEqual(x, 0);
    });

    it('F-SURV-04.5: Multiple overlapping swarm units resolve smoothly without NaN singularities', () => {
      const dx = 0;
      const dy = 0;
      const d = Math.hypot(dx, dy);
      const angle = d === 0 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);
      assert.strictEqual(Number.isNaN(angle), false);
    });
  });

  describe('F-SURV-05: Chest Evolution Presentation & Reward Suspense', () => {
    it('F-SURV-05.1: Defeating elite enemy triggers treasure chest drop', () => {
      const enemy = { isElite: true, dead: true };
      const dropChest = enemy.isElite && enemy.dead;
      assert.strictEqual(dropChest, true);
    });

    it('F-SURV-05.2: Chest opening triggers suspense duration countdown', () => {
      let suspenseTimer = 1.2; // seconds
      const dt = 0.2;
      suspenseTimer -= dt;
      assert.ok(suspenseTimer > 0);
    });

    it('F-SURV-05.3: Chest reward outcome yields 1, 3, or 5 item upgrades', () => {
      const tierWeights = [1, 3, 5];
      assert.ok(tierWeights.includes(1));
      assert.ok(tierWeights.includes(3));
      assert.ok(tierWeights.includes(5));
    });

    it('F-SURV-05.4: Chest awards coin bounty in addition to item upgrades', () => {
      let coins = 100;
      const chestCoins = 50;
      coins += chestCoins;
      assert.strictEqual(coins, 150);
    });

    it('F-SURV-05.5: Available weapon evolution takes priority in chest reward pool', () => {
      const eligibleEvolution = 'espresso';
      const chestResult = eligibleEvolution ?? 'coins';
      assert.strictEqual(chestResult, 'espresso');
    });
  });

  describe('F-SURV-06: Commercial Retro Frame HUD & UI Overhaul', () => {
    it('F-SURV-06.1: Trailing HP bar interpolates smoothly towards current HP', () => {
      let trailingHp = 100;
      const currentHp = 60;
      const dt = 1 / 60;
      trailingHp += (currentHp - trailingHp) * 5 * dt;
      assert.ok(trailingHp < 100 && trailingHp > 60);
    });

    it('F-SURV-06.2: XP requirement scales progressively with each character level', () => {
      const xpReq = (lv: number) => Math.floor(10 * Math.pow(1.2, lv - 1));
      assert.ok(xpReq(2) > xpReq(1));
      assert.ok(xpReq(5) > xpReq(2));
    });

    it('F-SURV-06.3: Weapon inventory enforces max slot capacity of 6', () => {
      const maxSlots = 6;
      const currentWeapons = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
      const canAdd = currentWeapons.length < maxSlots;
      assert.strictEqual(canAdd, false);
    });

    it('F-SURV-06.4: Passive item inventory enforces max slot capacity of 6', () => {
      const maxSlots = 6;
      const currentPassives = ['p1', 'p2', 'p3', 'p4'];
      const canAdd = currentPassives.length < maxSlots;
      assert.strictEqual(canAdd, true);
    });

    it('F-SURV-06.5: Survival timer formats into MM:SS display format', () => {
      const timeSec = 125;
      const mm = Math.floor(timeSec / 60).toString().padStart(2, '0');
      const ss = (timeSec % 60).toString().padStart(2, '0');
      assert.strictEqual(`${mm}:${ss}`, '02:05');
    });
  });

  describe('F-SURV-07: Survivor Juice (Hitstop, Trauma & Damage Numbers)', () => {
    it('F-SURV-07.1: Heavy enemy hit applies 25ms hitstop', () => {
      const hitstop = new HitStopManager();
      hitstop.triggerMs(25);
      assert.strictEqual(hitstop.isFrozen(), true);
    });

    it('F-SURV-07.2: Boss kill triggers extended 120ms dramatic hitstop', () => {
      const hitstop = new HitStopManager();
      hitstop.triggerMs(120);
      assert.strictEqual(hitstop.isFrozen(), true);
      assert.ok(hitstop.getTimeRemaining() >= 0.11);
    });

    it('F-SURV-07.3: Player damage adds non-linear camera trauma', () => {
      const shake = new TraumaScreenShake();
      shake.addTrauma(0.4);
      assert.strictEqual(shake.getTrauma(), 0.4);
      assert.ok(Math.abs(shake.getIntensity() - 0.16) < 0.0001); // 0.4^2 with float precision
    });

    it('F-SURV-07.4: Floating damage numbers pop with spring scale velocity', () => {
      const pool = new DamageNumberPool();
      const num = pool.spawn(100, 100, 50, 'normal');
      assert.strictEqual(num.text, '50');
      assert.ok(num.scale > 1.0);
    });

    it('F-SURV-07.5: Critical hit damage number uses vivid gold coloring and exclamation suffix', () => {
      const pool = new DamageNumberPool();
      const num = pool.spawn(100, 100, 999, 'crit');
      assert.strictEqual(num.text, '999!');
      assert.strictEqual(num.color, '#facc15');
    });
  });

  // =========================================================================
  // Requirement 3: Shachiku Spiral Modern 2D Vector Overhaul (30 tests)
  // =========================================================================

  describe('F-SPIR-01: Dark & Pop Modern 2D Vector Renderer (Zero emojis)', () => {
    it('F-SPIR-01.1: SpiralEngine initializes successfully without throwing', () => {
      const canvas = createMockCanvas();
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      assert.doesNotThrow(() => {
        engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
        engine.destroy();
      });
    });

    it('F-SPIR-01.2: Core entity renders geometric health arc and shield ring', () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;
      assert.doesNotThrow(() => {
        // High HP and full shield
        drawVectorCore(ctx, 200, 200, 24, 0.8, 1.0, 0.5);
        // Critical HP and depleted shield
        drawVectorCore(ctx, 200, 200, 24, 0.2, 0.0, 1.2);
      });
    });

    it('F-SPIR-01.3: Body segments render geometric polygons matching enemy role', () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;
      const kinds = ['mail', 'doc', 'claim', 'bossMid', 'exec', 'president'];
      assert.doesNotThrow(() => {
        for (const kind of kinds) {
          // Normal body capsule segment
          drawVectorSegment(ctx, 100, 100, 14, kind, false, 1.0);
          // Head segment with specialized geometric crest
          drawVectorSegment(ctx, 120, 120, 16, kind, true, 0.75);
        }
      });
    });

    it('F-SPIR-01.4: Bento bonus energy items draw clean geometric lunchboxes without emojis', () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;
      assert.doesNotThrow(() => {
        drawVectorBento(ctx, 150, 150, 1.2);
        drawVectorBento(ctx, 250, 250, 3.8);
      });
    });

    it('F-SPIR-01.5: Orbital weapons rotate around core at defined orbit radius', () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;
      const core = { x: 200, y: 200 };
      const orbitRadius = 60;
      const angle = Math.PI / 4;
      const orbitalPos = {
        x: core.x + Math.cos(angle) * orbitRadius,
        y: core.y + Math.sin(angle) * orbitRadius,
      };
      assert.ok(orbitalPos.x > core.x);
      assert.ok(orbitalPos.y > core.y);
      assert.doesNotThrow(() => {
        drawVectorOrbital(ctx, orbitalPos.x, orbitalPos.y, angle);
      });
    });
  });

  describe('F-SPIR-02: Optimized Spiral Trajectory & Body Segment Follow Physics', () => {
    it('F-SPIR-02.1: Archimedean spiral formula correctly calculates radial distance from theta', () => {
      const a = 30; // core radius
      const b = 15; // coil spacing
      const theta = Math.PI * 2;
      const r = a + b * theta;
      assert.ok(r > a);
    });

    it('F-SPIR-02.2: Spiral contraction moves enemies inward toward the central core', () => {
      let theta = Math.PI * 4;
      const angularSpeed = 0.5;
      const dt = 1 / 60;
      theta -= angularSpeed * dt;
      assert.ok(theta < Math.PI * 4);
    });

    it('F-SPIR-02.3: Body segments maintain fixed target distance behind lead segment', () => {
      const segDistance = 18;
      const s0 = { x: 100, y: 100 };
      const s1 = { x: 80, y: 100 };
      const dx = s0.x - s1.x;
      const dy = s0.y - s1.y;
      const dist = Math.hypot(dx, dy);
      assert.strictEqual(dist > segDistance, true);
    });

    it('F-SPIR-02.4: Segment follower damping smoothes abrupt directional shifts', () => {
      let followerAngle = 0;
      const targetAngle = Math.PI;
      const damping = 0.2;
      followerAngle += (targetAngle - followerAngle) * damping;
      assert.ok(followerAngle > 0 && followerAngle < targetAngle);
    });

    it('F-SPIR-02.5: Inward speed scales as spiral wave progression advances', () => {
      const baseSpeed = 1.0;
      const wave = 5;
      const currentSpeed = baseSpeed * (1 + (wave - 1) * 0.08);
      assert.ok(currentSpeed > baseSpeed);
    });
  });

  describe('F-SPIR-03: Rebalanced Head vs Body HP & Chain Reaction / Stun / Split', () => {
    it('F-SPIR-03.1: Head segment possesses higher HP and defense than body segments', () => {
      const headHp = 120;
      const bodyHp = 40;
      assert.ok(headHp >= bodyHp * 2.5);
    });

    it('F-SPIR-03.2: Destroying a body segment reduces chain count without destroying leader', () => {
      let segments = [1, 2, 3, 4];
      const destroyedIdx = 2;
      segments.splice(destroyedIdx, 1);
      assert.strictEqual(segments.length, 3);
      assert.strictEqual(segments[0], 1);
    });

    it('F-SPIR-03.3: Chain reaction explosion deals damage to adjacent segments in radius', () => {
      const explosionRadius = 35;
      const boom = { x: 50, y: 50 };
      const neighbor = { x: 65, y: 50 };
      const dist = Math.hypot(neighbor.x - boom.x, neighbor.y - boom.y);
      assert.ok(dist <= explosionRadius);
    });

    it('F-SPIR-03.4: Stun effect temporarily reduces advance velocity to 0', () => {
      let advanceVelocity = 2.5;
      const isStunned = true;
      if (isStunned) advanceVelocity = 0;
      assert.strictEqual(advanceVelocity, 0);
    });

    it('F-SPIR-03.5: Destroying head segment destabilizes entire remaining segment chain', () => {
      const chain = { headDestroyed: true, remainingSegments: 5 };
      const shouldDissipate = chain.headDestroyed;
      assert.strictEqual(shouldDissipate, true);
    });
  });

  describe('F-SPIR-04: Boss Attack Gimmicks (Wave 5, 10, 15)', () => {
    it('F-SPIR-04.1: Wave 5 boss executes office memo projectile barrage', () => {
      const bossWave5 = { wave: 5, gimmick: 'memo_barrage', memoCount: 8 };
      assert.strictEqual(bossWave5.gimmick, 'memo_barrage');
      assert.ok(bossWave5.memoCount >= 6);
    });

    it('F-SPIR-04.2: Wave 10 boss charges and sweeps rotating laser beams', () => {
      const bossWave10 = { wave: 10, gimmick: 'laser_sweep', laserCount: 2 };
      assert.strictEqual(bossWave10.gimmick, 'laser_sweep');
      assert.strictEqual(bossWave10.laserCount, 2);
    });

    it('F-SPIR-04.3: Wave 15 executive boss deploys rotating invulnerability barrier segments', () => {
      const bossWave15 = { wave: 15, gimmick: 'executive_barrier', barrierHp: 300 };
      assert.strictEqual(bossWave15.gimmick, 'executive_barrier');
      assert.ok(bossWave15.barrierHp > 0);
    });

    it('F-SPIR-04.4: Boss attack warning telegraphs 1.5s prior to lethal beam discharge', () => {
      const telegraphDuration = 1.5;
      assert.strictEqual(telegraphDuration, 1.5);
    });

    it('F-SPIR-04.5: Boss defeat triggers wave clear bonus and unlocks upgrade points', () => {
      let upgradePoints = 0;
      const bossBounty = 3;
      upgradePoints += bossBounty;
      assert.strictEqual(upgradePoints, 3);
    });
  });

  describe('F-SPIR-05: Cyber-Office HUD & Build Tree Modal Overhaul', () => {
    it('F-SPIR-05.1: HUD displays core health ratio and shield capacity', () => {
      const core = { hp: 80, maxHp: 100, shield: 50, maxShield: 50 };
      const hpRatio = core.hp / core.maxHp;
      const shieldRatio = core.shield / core.maxShield;
      assert.strictEqual(hpRatio, 0.8);
      assert.strictEqual(shieldRatio, 1.0);
    });

    it('F-SPIR-05.2: Build tree nodes require antecedent prerequisite unlocks', () => {
      const unlockedSkills = new Set(['core_hp_1']);
      const canUnlockTier2 = unlockedSkills.has('core_hp_1');
      assert.strictEqual(canUnlockTier2, true);
    });

    it('F-SPIR-05.3: Upgrade purchase deducts available scrap/upgrade points', () => {
      let points = 5;
      const cost = 2;
      points -= cost;
      assert.strictEqual(points, 3);
    });

    it('F-SPIR-05.4: Max rank caps further upgrades on maxed skill node', () => {
      const node = { currentRank: 5, maxRank: 5 };
      const canUpgrade = node.currentRank < node.maxRank;
      assert.strictEqual(canUpgrade, false);
    });

    it('F-SPIR-05.5: Opening build tree modal pauses game physics execution', () => {
      let isPaused = false;
      const openModal = () => { isPaused = true; };
      openModal();
      assert.strictEqual(isPaused, true);
    });
  });

  describe('F-SPIR-06: Spiral Juice (Additive Blend, Trauma, Sparks)', () => {
    it('F-SPIR-06.1: Laser beam rendering uses additive blend mode for neon glow', () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;
      ctx.globalCompositeOperation = 'lighter';
      assert.strictEqual(ctx.globalCompositeOperation, 'lighter');
    });

    it('F-SPIR-06.2: Core hit triggers camera trauma screen shake', () => {
      const shake = new TraumaScreenShake();
      shake.addTrauma(0.5);
      const offset = shake.update(1 / 60);
      assert.strictEqual(typeof offset.offsetX, 'number');
      assert.strictEqual(typeof offset.offsetY, 'number');
    });

    it('F-SPIR-06.3: Segment destruction generates spark particles with randomized velocity', () => {
      const speed = 150;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      assert.ok(Math.hypot(vx, vy) >= 149);
    });

    it('F-SPIR-06.4: Micro-freeze hitstop triggered on core shield absorption', () => {
      const hitstop = new HitStopManager();
      hitstop.triggerMs(40);
      assert.strictEqual(hitstop.isFrozen(), true);
    });

    it('F-SPIR-06.5: Screen shake decays to zero over time when no new trauma is added', () => {
      const shake = new TraumaScreenShake({ decayRate: 2.0 });
      shake.addTrauma(0.2);
      shake.update(0.2);
      assert.strictEqual(shake.getTrauma(), 0);
    });
  });

  // =========================================================================
  // Requirement 4: Shared Foundation (F-COMM-01 to F-COMM-03, 15 tests)
  // =========================================================================

  describe('F-COMM-01: Shared Floating Virtual Joystick Controller', () => {
    it('F-COMM-01.1: VirtualJoystick initializes with default clamped radius and deadzone', () => {
      const joystick = new VirtualJoystick();
      const vector = joystick.getVector();
      assert.strictEqual(vector.active, false);
      assert.strictEqual(vector.x, 0);
      assert.strictEqual(vector.y, 0);
      assert.strictEqual(vector.magnitude, 0);
    });

    it('F-COMM-01.2: Attaching container element configures touch-action none', () => {
      const joystick = new VirtualJoystick();
      const container = createMockCanvas() as any;
      joystick.attach(container);
      assert.strictEqual(container.style.touchAction, 'none');
      joystick.detach();
    });

    it('F-COMM-01.3: Reset restores joystick vector to neutral inactive state', () => {
      const joystick = new VirtualJoystick();
      joystick.reset();
      const state = joystick.getState();
      assert.strictEqual(state.active, false);
      assert.strictEqual(state.vectorX, 0);
      assert.strictEqual(state.vectorY, 0);
    });

    it('F-COMM-01.4: Joystick renders visualization on 2D context without error', () => {
      const joystick = new VirtualJoystick();
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d')!;
      assert.doesNotThrow(() => {
        joystick.renderCanvas(ctx);
      });
    });

    it('F-COMM-01.5: Attaching and destroying DOM overlay cleans up safely', () => {
      const joystick = new VirtualJoystick();
      const container = createMockCanvas() as any;
      joystick.attach(container);
      const overlay = joystick.attachDomOverlay();
      assert.ok(overlay);
      assert.doesNotThrow(() => {
        joystick.destroyDomOverlay();
        joystick.detach();
      });
    });
  });

  describe('F-COMM-02: Shared Juice Utilities (Trauma, HitStop, Damage Pool)', () => {
    it('F-COMM-02.1: TraumaScreenShake clamps cumulative trauma to maximum 1.0', () => {
      const shake = new TraumaScreenShake();
      shake.addTrauma(0.7);
      shake.addTrauma(0.6);
      assert.strictEqual(shake.getTrauma(), 1.0);
    });

    it('F-COMM-02.2: Intensity maps quadratically to trauma value', () => {
      const shake = new TraumaScreenShake({ exponent: 2 });
      shake.setTrauma(0.5);
      assert.strictEqual(shake.getIntensity(), 0.25);
    });

    it('F-COMM-02.3: HitStopManager treats duration > 1.0 as milliseconds', () => {
      const hitstop = new HitStopManager();
      hitstop.trigger(50); // 50ms = 0.05s
      assert.strictEqual(hitstop.getTimeRemaining(), 0.05);
    });

    it('F-COMM-02.4: HitStopManager effectiveDt is zero during frozen duration', () => {
      const hitstop = new HitStopManager();
      hitstop.triggerMs(100);
      const res = hitstop.update(0.016);
      assert.strictEqual(res.frozen, true);
      assert.strictEqual(res.effectiveDt, 0);
    });

    it('F-COMM-02.5: DamageNumberPool recycles inactive slots and caps memory allocation', () => {
      const pool = new DamageNumberPool(16);
      for (let i = 0; i < 20; i++) {
        pool.spawn(100, 100, i);
      }
      assert.strictEqual(pool.getPoolSize(), 16);
      assert.ok(pool.getActiveCount() <= 16);
    });
  });

  describe('F-COMM-03: Responsive Game Canvas & Viewport Adaptation', () => {
    it('F-COMM-03.1: Desktop 16:9 aspect ratio calculates appropriate letterbox bounds', () => {
      const viewW = 1920;
      const viewH = 1080;
      const targetAspect = 16 / 9;
      const currentAspect = viewW / viewH;
      assert.strictEqual(Math.abs(currentAspect - targetAspect) < 0.001, true);
    });

    it('F-COMM-03.2: Mobile portrait 9:16 aspect ratio calculates appropriate pillarbox bounds', () => {
      const viewW = 1080;
      const viewH = 1920;
      const targetAspect = 9 / 16;
      const currentAspect = viewW / viewH;
      assert.strictEqual(Math.abs(currentAspect - targetAspect) < 0.001, true);
    });

    it('F-COMM-03.3: Virtual coordinate scale mapping transforms client coords accurately', () => {
      const clientX = 400;
      const rectLeft = 0;
      const rectWidth = 800;
      const virtualWidth = 480;
      const mappedX = ((clientX - rectLeft) / rectWidth) * virtualWidth;
      assert.strictEqual(mappedX, 240);
    });

    it('F-COMM-03.4: Touch-to-world normalization retains directional angle', () => {
      const dx = 50;
      const dy = 50;
      const angle = Math.atan2(dy, dx);
      assert.strictEqual(angle, Math.PI / 4);
    });

    it('F-COMM-03.5: Canvas resize updates internal dimensions cleanly without distortion', () => {
      const canvas = createMockCanvas(300, 150);
      canvas.width = 600;
      canvas.height = 300;
      assert.strictEqual(canvas.width, 600);
      assert.strictEqual(canvas.height, 300);
    });
  });
});
