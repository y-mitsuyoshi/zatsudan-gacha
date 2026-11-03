/**
 * EMPIRICAL CHALLENGER STRESS HARNESS — Milestone 2, 3, 4 Verification
 * Adversarial edge cases, boundary testing, stress benchmarks, and oracle verification.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment, createMockCanvas, createMockAudio } from './e2e/testEnv';

setupTestEnvironment();

import * as THREE from 'three';
import { DefenseEngine } from '@/game/defense/engine';
import { COURSES, DIFFICULTIES, ENEMIES, MAX_ALLIES } from '@/game/defense/config';
import { buildBarricadeMesh, updateBarricadeDurability } from '@/game/defense/models';
import { SurvivorEngine } from '@/game/survivor/engine';
import { EVOLUTION_RECIPES, checkEvolution } from '@/game/survivor/evolutions';
import { MAX_ENEMIES } from '@/game/survivor/config';

describe('Empirical Challenger: Barricade Defense 3D (R1) Stress Harness', () => {

  // -------------------------------------------------------------------------
  // 1. Swept-Sphere CCD Under Extreme Projectile Speeds
  // -------------------------------------------------------------------------
  describe('1. Swept-Sphere Continuous Collision Detection (CCD) Physics', () => {
    it('1.1: 0% tunneling across extreme projectile speeds (v = 32 to 1800) through stationary & fast-moving foes', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);

      const eng = engine as any;
      // Clear existing entities
      eng.foes = [];
      eng.crates = [];
      eng.cages = [];

      const testSpeeds = [32, 64, 120, 250, 500, 800, 1200, 1800];
      const enemyZPositions = [-5, -12, -20, -32, -45, -55];
      let trials = 0;
      let hits = 0;
      let misses = 0;

      for (const speed of testSpeeds) {
        for (const foeZ of enemyZPositions) {
          trials++;
          // Place a runner enemy directly on trajectory
          eng.foes = [{
            g: new THREE.Group(),
            kind: 'runner',
            x: 0,
            z: foeZ,
            hp: 100,
            maxHp: 100,
            walk: 8.0, // fast moving runner
            radius: ENEMIES.runner.radius, // 0.65
            dmg: 10,
            color: '#ef4444',
            score: 100,
            wob: 0,
            slowT: 0,
            flash: 0,
            dead: false,
            isBoss: false,
            elite: false,
          }];

          // Clear bolt pool and spawn bolt aimed straight at enemy
          for (const b of eng.boltPool) b.active = false;
          eng.spawnBolt(0, 0, 0, speed, 25, 0, 0, 0, 'pistol', false);

          const bolt = eng.boltPool.find((b: any) => b.active);
          assert.ok(bolt, `Bolt must be active at speed ${speed}`);

          // Simulate steps with standard frame delta dt = 1/60s
          const dt = 1 / 60;
          let hitDetected = false;
          for (let step = 0; step < 120; step++) {
            // Update enemy position
            eng.foes[0].z += eng.foes[0].walk * dt;
            eng.updateBolts(dt);

            if (eng.foes[0].hp < 100 || !bolt.active) {
              hitDetected = true;
              break;
            }
          }

          if (hitDetected) {
            hits++;
          } else {
            misses++;
          }
        }
      }

      console.log(`[Swept CCD Benchmark] Speeds: 32-1800 | Trials: ${trials} | Hits: ${hits} | Misses: ${misses} | Tunnel Rate: ${((misses / trials) * 100).toFixed(2)}%`);
      assert.strictEqual(misses, 0, `Tunneling detected! ${misses}/${trials} shots tunneled through enemy`);
      engine.destroy();
    });

    it('1.2: Boundary precision: lateral grazing check at hitRadius boundary (hit vs miss)', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;
      eng.foes = [];

      const runnerRadius = ENEMIES.runner.radius; // 0.65
      const hitRadius = runnerRadius + 0.35; // 1.00

      // Case A: Just inside boundary (x = hitRadius - 0.02 = 0.98) -> MUST HIT
      eng.foes = [{
        g: new THREE.Group(),
        kind: 'runner',
        x: hitRadius - 0.02,
        z: -20,
        hp: 100,
        maxHp: 100,
        walk: 0,
        radius: runnerRadius,
        dmg: 10,
        color: '#ef4444',
        score: 100,
        wob: 0,
        slowT: 0,
        flash: 0,
        dead: false,
        isBoss: false,
        elite: false,
      }];
      for (const b of eng.boltPool) b.active = false;
      eng.spawnBolt(0, 0, 0, 100, 25, 0, 0, 0, 'pistol', false);
      eng.updateBolts(0.25); // Moves from z=0 to z=-25
      assert.strictEqual(eng.foes[0].hp < 100, true, 'Shots grazing inside hitRadius must hit');

      // Case B: Just outside boundary (x = hitRadius + 0.05 = 1.05) -> MUST MISS
      eng.foes = [{
        g: new THREE.Group(),
        kind: 'runner',
        x: hitRadius + 0.05,
        z: -20,
        hp: 100,
        maxHp: 100,
        walk: 0,
        radius: runnerRadius,
        dmg: 10,
        color: '#ef4444',
        score: 100,
        wob: 0,
        slowT: 0,
        flash: 0,
        dead: false,
        isBoss: false,
        elite: false,
      }];
      for (const b of eng.boltPool) b.active = false;
      eng.spawnBolt(0, 0, 0, 100, 25, 0, 0, 0, 'pistol', false);
      eng.updateBolts(0.25);
      assert.strictEqual(eng.foes[0].hp, 100, 'Shots passing outside hitRadius must miss');

      engine.destroy();
    });

    it('1.3: Adversarial speed investigation: pre-cull boundary limit check (speed > 4000)', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;
      eng.foes = [];

      // If bullet travels past z = -70 in a single frame (e.g. speed = 5000, dt = 0.02, deltaZ = -100)
      eng.foes = [{
        g: new THREE.Group(),
        kind: 'runner',
        x: 0,
        z: -20,
        hp: 100,
        maxHp: 100,
        walk: 0,
        radius: ENEMIES.runner.radius,
        dmg: 10,
        color: '#ef4444',
        score: 100,
        wob: 0,
        slowT: 0,
        flash: 0,
        dead: false,
        isBoss: false,
        elite: false,
      }];
      for (const b of eng.boltPool) b.active = false;
      eng.spawnBolt(0, 0, 0, 5000, 25, 0, 0, 0, 'pistol', false);
      eng.updateBolts(0.02); // z moves from 0 to -100 (< -70)

      // Test whether pre-culling at line 1541 triggers tunneling when deltaZ > 70
      const culledBeforeCcd = eng.foes[0].hp === 100;
      console.log(`[Adversarial Speed Check] At v=5000, dt=0.02 (deltaZ=-100): Culled before CCD = ${culledBeforeCcd}`);

      engine.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Crowd Expansion up to 30 Allies: Flocking Stability & No NaN
  // -------------------------------------------------------------------------
  describe('2. Dynamic Crowd Expansion (1 to 30 Allies) Flocking Physics', () => {
    it('2.1: Expands to full 30 allies without NaN, Infinity, or position explosion', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      // Add allies until reaching MAX_ALLIES (30)
      for (let i = 0; i < 35; i++) {
        eng.addAlly(false);
      }
      assert.strictEqual(eng.allies.length, MAX_ALLIES, `Squad count must be clamped at MAX_ALLIES (${MAX_ALLIES})`);

      // Stress simulation: 600 frames under heavy erratic input
      let hasNan = false;
      let hasInf = false;
      let maxAbsX = 0;

      for (let frame = 0; frame < 600; frame++) {
        // High-frequency oscillating steering input
        eng.hero.position.x = Math.sin(frame * 0.25) * 4.2;
        const dt = 0.016 + Math.sin(frame) * 0.005; // varying dt

        eng.updateAllies(dt);

        for (const a of eng.allies) {
          const x = a.g.position.x;
          const z = a.g.position.z;
          const vx = a.vx;
          const vz = a.vz;

          if (Number.isNaN(x) || Number.isNaN(z) || Number.isNaN(vx) || Number.isNaN(vz)) {
            hasNan = true;
          }
          if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(vx) || !Number.isFinite(vz)) {
            hasInf = true;
          }
          maxAbsX = Math.max(maxAbsX, Math.abs(x));
        }
      }

      console.log(`[Flocking Benchmark] 30 Allies | 600 Frames | Has NaN: ${hasNan} | Has Inf: ${hasInf} | Max |X|: ${maxAbsX.toFixed(2)}`);
      assert.strictEqual(hasNan, false, 'No ally coordinate may be NaN');
      assert.strictEqual(hasInf, false, 'No ally coordinate may be Infinite');
      assert.ok(maxAbsX < 6.0, `Allies must stay within road corridor bounds (found max |X|: ${maxAbsX})`);

      engine.destroy();
    });

    it('2.2: Singularity stress: 30 allies initialized at identical coordinate resolve without NaN', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      for (let i = 0; i < 30; i++) eng.addAlly(false);

      // Force singularity: collapse all 30 allies to the exact same point
      for (const a of eng.allies) {
        a.g.position.set(0, 0, 0);
        a.vx = 0;
        a.vz = 0;
      }

      // Run 60 frames
      for (let f = 0; f < 60; f++) {
        eng.updateAllies(1 / 60);
      }

      for (const a of eng.allies) {
        assert.ok(!Number.isNaN(a.g.position.x), 'Position X must not be NaN after singularity');
        assert.ok(!Number.isNaN(a.g.position.z), 'Position Z must not be NaN after singularity');
      }

      // Measure separation: allies must have naturally expanded into formation
      const distances: number[] = [];
      for (let i = 0; i < eng.allies.length; i++) {
        for (let j = i + 1; j < eng.allies.length; j++) {
          const dx = eng.allies[i].g.position.x - eng.allies[j].g.position.x;
          const dz = eng.allies[i].g.position.z - eng.allies[j].g.position.z;
          distances.push(Math.hypot(dx, dz));
        }
      }
      const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
      console.log(`[Flocking Singularity Resolution] 30 Allies separated from (0,0) -> Average inter-ally distance: ${avgDist.toFixed(2)}m`);
      assert.ok(avgDist > 0.4, `Allies must expand into formation (avg distance ${avgDist} > 0.4)`);

      engine.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Barricade Durability Transitions (100% -> 70% -> 30% -> 0%) & Destruction
  // -------------------------------------------------------------------------
  describe('3. Barricade Durability Transitions & Destruction Mechanics', () => {
    it('3.1: All 4 visual durability states render distinct geometries, colors, and visibilities', () => {
      const barricade = buildBarricadeMesh(1, 1.0);
      const ud = barricade.userData;
      assert.ok(ud && ud.energyMat, 'Barricade userData must be initialized');

      // State 1: Pristine (100% -> 70%)
      updateBarricadeDurability(barricade, 1.0, 0);
      assert.strictEqual(ud.energyMesh.visible, true);
      assert.strictEqual(ud.crackMesh.visible, false);
      assert.strictEqual(ud.debrisGroup.visible, false);
      assert.strictEqual(ud.energyMat.color.getHex(), 0x06b6d4, 'State 1 must be Pristine Cyan (#06b6d4)');
      assert.strictEqual(ud.topRail.position.y, 2.3);

      updateBarricadeDurability(barricade, 0.70, 0);
      assert.strictEqual(ud.energyMat.color.getHex(), 0x06b6d4, '70% threshold is Pristine Cyan');

      // State 2: Damaged (69% -> 30%)
      updateBarricadeDurability(barricade, 0.69, 0);
      assert.strictEqual(ud.energyMesh.visible, true);
      assert.strictEqual(ud.crackMesh.visible, true, 'Crack mesh must be visible in Damaged state');
      assert.strictEqual(ud.debrisGroup.visible, false);
      assert.strictEqual(ud.energyMat.color.getHex(), 0xf59e0b, 'State 2 must be Damaged Orange (#f59e0b)');
      assert.strictEqual(ud.crackMat.color.getHex(), 0xf59e0b);

      updateBarricadeDurability(barricade, 0.30, 0);
      assert.strictEqual(ud.energyMat.color.getHex(), 0xf59e0b, '30% threshold is Damaged Orange');

      // State 3: Critical Alarm (29% -> 1%)
      updateBarricadeDurability(barricade, 0.29, 0);
      assert.strictEqual(ud.energyMesh.visible, true);
      assert.strictEqual(ud.crackMesh.visible, true);
      assert.strictEqual(ud.debrisGroup.visible, false);
      assert.strictEqual(ud.energyMat.color.getHex(), 0xef4444, 'State 3 must be Critical Alarm Red (#ef4444)');
      assert.strictEqual(ud.crackMat.color.getHex(), 0xef4444);

      updateBarricadeDurability(barricade, 0.05, 0);
      assert.strictEqual(ud.energyMat.color.getHex(), 0xef4444);

      // State 4: Broken (0%)
      updateBarricadeDurability(barricade, 0.0, 0);
      assert.strictEqual(ud.energyMesh.visible, false, 'Energy field must be deactivated at 0%');
      assert.strictEqual(ud.crackMesh.visible, false);
      assert.strictEqual(ud.debrisGroup.visible, true, 'Debris group must be visible at 0%');
      assert.strictEqual(ud.topRail.position.y, 0.6, 'Top rail must collapse to 0.6m');
      assert.strictEqual(ud.topRail.rotation.z, 0.08, 'Top rail must have tilt angle');
      assert.strictEqual(ud.beaconMat.color.getHex(), 0x334155, 'Beacons must power off to dark slate');
    });

    it('3.2: Barricade destruction gameplay behavior: absorbs damage until broken, then exposes Hero', () => {
      const canvas = createMockCanvas();
      let bannerTitle = '';
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: (title: string) => { bannerTitle = title; },
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;
      eng.foes = [];

      assert.strictEqual(eng.guard, eng.guardMax);
      const initialHp = eng.hp;

      // Test 1: Damage absorbed by guard
      eng.damageGuard(50);
      assert.strictEqual(eng.guard, eng.guardMax - 50);
      assert.strictEqual(eng.hp, initialHp, 'Hero HP must not take damage while guard is intact');
      assert.strictEqual(eng.guardBroke, false);

      // Test 2: Fatal guard damage triggers collapse
      eng.damageGuard(1000);
      assert.strictEqual(eng.guard, 0);
      assert.strictEqual(eng.guardBroke, true, 'guardBroke must be true when guard reaches 0');
      assert.strictEqual(bannerTitle, 'ガード崩壊！', 'Guard collapse banner must trigger');

      // Test 3: With broken guard, advancing enemy reaches hero (Z = 0) and directly inflicts HP damage
      eng.iframes = 0;
      eng.foes = [{
        g: new THREE.Group(),
        kind: 'walker',
        x: 0,
        z: -0.2, // just behind hero
        hp: 50,
        maxHp: 50,
        walk: 5.0,
        radius: 0.6,
        dmg: 25,
        color: '#f59e0b',
        score: 50,
        wob: 0,
        slowT: 0,
        flash: 0,
        dead: false,
        isBoss: false,
        elite: false,
      }];
      eng.hero.position.x = 0;

      // Enemy moves past HERO_Z + 0.5
      eng.updateFoes(0.2); // moves to z >= 0.8
      assert.ok(eng.hp < initialHp, `Hero HP (${eng.hp}) must decrease after barricade is broken (initial: ${initialHp})`);

      engine.destroy();
    });
  });
});

describe('Empirical Challenger: Shachiku Survivor (R2) Stress Harness', () => {

  // -------------------------------------------------------------------------
  // 1. Player Hurtbox Precision (r=8) Dodging Dense Patterns
  // -------------------------------------------------------------------------
  describe('1. Player Hurtbox Precision (r=8) & Dodging Behavior', () => {
    it('1.1: Direct enemy contact honors precisely r = 8 hurtbox radius', () => {
      const canvas = createMockCanvas();
      const engine = new SurvivorEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onLevelUp: () => {},
        onLevelClosed: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
      const eng = engine as any;
      eng.enemies = [];
      eng.px = 500;
      eng.py = 500;
      eng.hp = 120;
      eng.iframes = 0;

      const enemyRadius = 14; // standard enemy radius
      const pr = 8; // player hurtbox radius
      const exactContactDist = enemyRadius + pr; // 22

      // Trial A: Position enemy just OUTSIDE hurtbox (dist = 22.05) -> NO CONTACT
      const eOutside = eng.makeEnemy('mail', 500 + exactContactDist + 0.05, 500, false, false);
      eOutside.radius = enemyRadius;
      eOutside.spd = 0;
      eng.enemies = [eOutside];
      eng.updateEnemies(0.001);
      assert.strictEqual(eng.hp, 120, 'Distance > enemyRadius + 8 must NOT inflict contact damage');

      // Trial B: Position enemy just INSIDE hurtbox (dist = 21.95) -> CONTACT DAMAGE
      eng.iframes = 0;
      const eInside = eng.makeEnemy('mail', 500 + exactContactDist - 0.05, 500, false, false);
      eInside.radius = enemyRadius;
      eInside.spd = 0;
      eng.enemies = [eInside];
      eng.updateEnemies(0.001);
      assert.ok(eng.hp < 120, 'Distance < enemyRadius + 8 MUST inflict contact damage');

      engine.destroy();
    });

    it('1.2: Adversarial investigation: Projectile hurtbox discrepancy in updateEprojs (r=14 vs r=8)', () => {
      const canvas = createMockCanvas();
      const engine = new SurvivorEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onLevelUp: () => {},
        onLevelClosed: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
      const eng = engine as any;
      eng.enemies = [];
      eng.eprojs = [];
      eng.px = 500;
      eng.py = 500;
      eng.hp = 120;
      eng.iframes = 0;

      // Projectile with radius 7.
      // Under r=8 specification, safe distance is dist > 7 + 8 = 15.
      // If player is at (500, 500) and projectile is at (500, 518), distance is 18.
      // Distance 18 > 15 (safe from r=8).
      // But under r=14 bug, collision occurs at dist < 7 + 14 = 21 (18 < 21 -> HIT!).
      eng.eprojs.push({
        x: 500,
        y: 518,
        vx: 0,
        vy: 0,
        dmg: 20,
        radius: 7,
        life: 2.0,
      });

      eng.updateEprojs(0.001);

      const hitAtDist18 = eng.hp < 120;
      console.log(`[Hurtbox Investigation] Projectile (r=7) at dist=18 (safe for r=8): Player took hit = ${hitAtDist18}`);
      console.log(`[Finding] updateEprojs uses 'rr = p.radius + 14' instead of 'p.radius + 8', causing a 6px phantom hitzone when dodging dense projectile patterns.`);

      engine.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Soft Swarm Circle-Circle Separation with 150+ Enemies
  // -------------------------------------------------------------------------
  describe('2. Soft Swarm Circle-Circle Separation with 150+ Enemies', () => {
    it('2.1: 160 enemies at single-pixel singularity (500,500) disperse smoothly without NaN or stacking', () => {
      const canvas = createMockCanvas();
      const engine = new SurvivorEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onLevelUp: () => {},
        onLevelClosed: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
      const eng = engine as any;
      eng.enemies = [];

      // Spawn 160 enemies all at the EXACT SAME coordinate (500, 500)
      for (let i = 0; i < MAX_ENEMIES; i++) {
        const e = eng.makeEnemy('mail', 500, 500, false, false);
        e.x = 500;
        e.y = 500;
        eng.enemies.push(e);
      }
      assert.strictEqual(eng.enemies.length, 160);

      // Run 60 frames of enemy update and swarm separation
      for (let f = 0; f < 60; f++) {
        eng.updateEnemies(1 / 60);
      }

      let hasNan = false;
      let identicalPairs = 0;
      for (let i = 0; i < eng.enemies.length; i++) {
        const e1 = eng.enemies[i];
        if (Number.isNaN(e1.x) || Number.isNaN(e1.y)) hasNan = true;

        for (let j = i + 1; j < eng.enemies.length; j++) {
          const e2 = eng.enemies[j];
          if (Math.hypot(e1.x - e2.x, e1.y - e2.y) < 0.01) {
            identicalPairs++;
          }
        }
      }

      console.log(`[Swarm Singularity Test] 160 Enemies | 60 Frames | Has NaN: ${hasNan} | Identical Coords: ${identicalPairs}`);
      assert.strictEqual(hasNan, false, 'Enemies must not have NaN coordinates');
      assert.strictEqual(identicalPairs, 0, 'All 160 enemies must gently separate; zero stacking singularities allowed');

      engine.destroy();
    });

    it('2.2: Swarm execution benchmark: 300 simulation frames with 160 active colliding enemies', () => {
      const canvas = createMockCanvas();
      const engine = new SurvivorEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onLevelUp: () => {},
        onLevelClosed: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
      const eng = engine as any;
      eng.enemies = [];

      for (let i = 0; i < MAX_ENEMIES; i++) {
        eng.enemies.push(eng.makeEnemy('mail', 300 + (i % 16) * 20, 300 + Math.floor(i / 16) * 20, false, false));
      }

      const startTime = performance.now();
      const frames = 300;
      for (let f = 0; f < frames; f++) {
        eng.updateEnemies(1 / 60);
      }
      const totalTimeMs = performance.now() - startTime;
      const msPerFrame = totalTimeMs / frames;

      console.log(`[Swarm Performance Benchmark] 160 Enemies × 300 Frames: Total ${totalTimeMs.toFixed(2)}ms | Average: ${msPerFrame.toFixed(3)}ms/frame`);
      // Target: under 16.6ms frame budget (in fact, under 2ms in pure JS)
      assert.ok(msPerFrame < 5.0, `Swarm separation must not collapse frame rate (found: ${msPerFrame.toFixed(3)}ms/frame)`);

      engine.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // 3. All 8 Weapon Evolutions Triggering from Chests
  // -------------------------------------------------------------------------
  describe('3. All 8 Weapon Evolutions Triggering from Chests', () => {
    it('3.1: All 8 evolution recipes trigger sequentially from chest pickups and transform weapon loadout', () => {
      const canvas = createMockCanvas();
      const banners: string[] = [];
      const engine = new SurvivorEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onLevelUp: () => {},
        onLevelClosed: () => {},
        onGameOver: () => {},
        onBanner: (t: string) => { banners.push(t); },
      });
      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
      const eng = engine as any;

      assert.strictEqual(EVOLUTION_RECIPES.length, 8, 'Exactly 8 evolution recipes must be defined');

      for (let i = 0; i < EVOLUTION_RECIPES.length; i++) {
        const recipe = EVOLUTION_RECIPES[i];

        // Configure player weapon & passive loadout
        eng.weapons = [{ id: recipe.baseWeaponId, lv: 8, cd: 0 }];
        eng.passives = [{ id: recipe.requiredPassiveId, lv: 1 }];

        // Verify checkEvolution recognizes qualifying state
        const weaponsMap = new Map<string, number>(eng.weapons.map((w: any) => [w.id, w.lv]));
        const passivesMap = new Map<string, number>(eng.passives.map((p: any) => [p.id, p.lv]));
        const detectedRecipe = checkEvolution(weaponsMap, passivesMap);
        assert.ok(detectedRecipe, `Recipe for ${recipe.name} must be detected at Lv8 base + Lv1 passive`);
        assert.strictEqual(detectedRecipe.evolvedId, recipe.evolvedId);

        // Open chest pickup
        const prevScore = eng.score;
        eng.collectPickup('chest');

        // Verify evolution results:
        // 1. Base weapon replaced by evolved weapon
        assert.strictEqual(eng.weapons.length, 1);
        assert.strictEqual(eng.weapons[0].id, recipe.evolvedId, `Weapon must evolve to ${recipe.evolvedId}`);
        assert.strictEqual(eng.weapons[0].lv, 1, 'Evolved weapon starts at Lv1');

        // 2. Score bonus +2000 awarded
        assert.strictEqual(eng.score, prevScore + 2000, 'Evolution must award 2000 points');

        // 3. Banner emitted
        const lastBanner = banners[banners.length - 1];
        assert.ok(lastBanner.includes(`【進化】${recipe.name}`), `Banner must announce ${recipe.name}`);

        // 4. Step engine and verify evolved weapon fires without throwing runtime exceptions
        eng.enemies = [eng.makeEnemy('mail', 520, 500, false, false)];
        eng.weapons[0].cd = 0;
        assert.doesNotThrow(() => {
          eng.updateWeapons(1 / 60);
        }, `Evolved weapon ${recipe.evolvedId} must fire without exceptions`);
      }

      console.log(`[Evolution Verification] Successfully tested all 8 weapon evolutions triggering from chests!`);
      engine.destroy();
    });

    it('3.2: Chest rejects evolution if base weapon is below Lv8 or passive is missing', () => {
      const canvas = createMockCanvas();
      const engine = new SurvivorEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onLevelUp: () => {},
        onLevelClosed: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
      const eng = engine as any;

      // Sub-case A: Base weapon is Lv7 (not maxed)
      eng.weapons = [{ id: 'shuriken', lv: 7, cd: 0 }];
      eng.passives = [{ id: 'power', lv: 1 }];
      eng.collectPickup('chest');
      assert.strictEqual(eng.weapons[0].id, 'shuriken', 'Lv7 weapon must NOT evolve');

      // Sub-case B: Base weapon is Lv8 but matching passive is missing
      eng.weapons = [{ id: 'coffee', lv: 8, cd: 0 }];
      eng.passives = [{ id: 'lunch', lv: 1 }]; // needs 'watch'
      eng.collectPickup('chest');
      assert.strictEqual(eng.weapons[0].id, 'coffee', 'Weapon without required passive must NOT evolve');

      engine.destroy();
    });
  });
});
