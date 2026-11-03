/**
 * EMPIRICAL CHALLENGER RECHECK: HITBOX PRECISION & PHYSICS RIGOR TEST SUITE
 *
 * Verifies:
 * 1. Shachiku Survivor:
 *    - Exact player hurtbox precision: bullet passing at distance 9px from player center
 *      must NOT trigger collision, while bullet passing at distance 7px MUST trigger collision.
 *    - Confirmation that `p.radius + 8` eliminates the previous 6px phantom hitzone.
 *    - Soft swarm circle-circle separation with 150+ enemies under high load (zero NaNs, smooth dispersion).
 * 2. Barricade Defense:
 *    - Swept-sphere CCD collision under extreme bullet speeds (speed = 500 units/s+), confirming 0% tunneling.
 *    - Dynamic squad flocking expansion up to 30 allies without NaN divergence under extreme stress.
 *    - Barricade 4-state durability transitions (Pristine -> Damaged -> Critical Alarm -> Broken).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment, createMockCanvas, createMockAudio } from './e2e/testEnv';

setupTestEnvironment();

import * as THREE from 'three';
import { SurvivorEngine } from '@/game/survivor/engine';
import { DefenseEngine } from '@/game/defense/engine';
import { COURSES, DIFFICULTIES, ENEMIES, MAX_ALLIES } from '@/game/defense/config';
import { buildBarricadeMesh, updateBarricadeDurability } from '@/game/defense/models';

describe('Empirical Challenger: Hitbox Precision & Physics Stress Verification', () => {

  // =========================================================================
  // 1. SHACHIKU SURVIVOR: HITBOX PRECISION & PHANTOM ZONE ELIMINATION
  // =========================================================================
  describe('1. Shachiku Survivor: Hitbox Precision & Swarm Physics', () => {

    it('1.1: Bullet passing at distance 9px does NOT hit, while distance 7px MUST hit (Point Bullet r=0)', () => {
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

      // Clean state
      eng.enemies = [];
      eng.eprojs = [];
      eng.px = 500;
      eng.py = 500;
      eng.hp = 100;
      eng.iframes = 0;

      // --- Test 1.1A: Bullet at distance 9px from player center ---
      // Player center is (500, 500). Bullet at (500, 509). Distance = 9px.
      // Bullet radius = 0.
      // Formula: rr = p.radius + 8 = 0 + 8 = 8.
      // Distance squared = 81. rr^2 = 64. 81 < 64 is FALSE -> NO HIT.
      eng.eprojs = [{
        x: 500,
        y: 509,
        vx: 0,
        vy: 0,
        dmg: 25,
        radius: 0,
        life: 2.0,
      }];

      eng.updateEprojs(0.016);
      assert.strictEqual(eng.hp, 100, 'Bullet at distance 9px must NOT damage player');
      assert.strictEqual(eng.iframes, 0, 'Bullet at distance 9px must NOT trigger iframes');
      assert.strictEqual(eng.eprojs.length, 1, 'Bullet at distance 9px must remain alive (not absorbed)');

      // --- Test 1.1B: Bullet at distance 7px from player center ---
      // Player center is (500, 500). Bullet at (500, 507). Distance = 7px.
      // Distance squared = 49. rr^2 = 64. 49 < 64 is TRUE -> HIT!
      eng.eprojs = [{
        x: 500,
        y: 507,
        vx: 0,
        vy: 0,
        dmg: 25,
        radius: 0,
        life: 2.0,
      }];

      eng.updateEprojs(0.016);
      assert.strictEqual(eng.hp, 75, 'Bullet at distance 7px MUST damage player (100 - 25 = 75)');
      assert.ok(eng.iframes > 0, 'Bullet at distance 7px MUST trigger iframes');
      assert.strictEqual(eng.eprojs.length, 0, 'Bullet at distance 7px must be consumed on impact');

      engine.destroy();
    });

    it('1.2: Standard bullet (radius 7px) honors precise hurtbox boundary (safe at dist 16px, hit at dist 14px)', () => {
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
      eng.hp = 100;
      eng.iframes = 0;

      // With bullet radius 7 and player hurtbox radius 8:
      // rr = 7 + 8 = 15px.
      // Distance 16px (500, 516): 16 >= 15 -> SAFE (dist^2 = 256 >= 225)
      eng.eprojs = [{
        x: 500,
        y: 516,
        vx: 0,
        vy: 0,
        dmg: 20,
        radius: 7,
        life: 1.0,
      }];
      eng.updateEprojs(0.016);
      assert.strictEqual(eng.hp, 100, 'Bullet (r=7) at distance 16px must NOT damage player');

      // Distance 14px (500, 514): 14 < 15 -> HIT (dist^2 = 196 < 225)
      eng.eprojs = [{
        x: 500,
        y: 514,
        vx: 0,
        vy: 0,
        dmg: 20,
        radius: 7,
        life: 1.0,
      }];
      eng.updateEprojs(0.016);
      assert.strictEqual(eng.hp, 80, 'Bullet (r=7) at distance 14px MUST damage player');

      engine.destroy();
    });

    it('1.3: Elimination of 6px phantom hitzone verified across the entire (8px, 14px) interval', () => {
      // Under the previous defect: rr = p.radius + 14.
      // For p.radius = 0, collision boundary was at 14px instead of 8px.
      // Every distance in [8, 14) was a phantom hitzone where player took phantom damage!
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

      // Test all integer distances from 8px to 14px for r=0
      for (let dist = 8; dist <= 14; dist++) {
        eng.enemies = [];
        eng.eprojs = [];
        eng.px = 500;
        eng.py = 500;
        eng.hp = 100;
        eng.iframes = 0;

        eng.eprojs.push({
          x: 500,
          y: 500 + dist,
          vx: 0,
          vy: 0,
          dmg: 10,
          radius: 0,
          life: 1.0,
        });

        eng.updateEprojs(0.016);

        // Current code with +8:
        // rr = 0 + 8 = 8.
        // dist = 8 -> dist^2 = 64, rr^2 = 64 -> 64 < 64 is FALSE -> NO HIT!
        // dist > 8 -> NO HIT!
        assert.strictEqual(
          eng.hp,
          100,
          `Distance ${dist}px must NOT register a hit under precise r=8 hurtbox (previously hit in phantom zone!)`
        );
      }

      engine.destroy();
    });

    it('1.4: Dynamic trajectory sweep: Fast bullet passing player at closest approach 9px vs 7px', () => {
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

      // Pass 1: Bullet travels vertically from y=400 to y=600 along line x = 509 (closest approach = 9px)
      eng.enemies = [];
      eng.eprojs = [];
      eng.px = 500;
      eng.py = 500;
      eng.hp = 100;
      eng.iframes = 0;

      eng.eprojs.push({
        x: 509,
        y: 450,
        vx: 0,
        vy: 300, // 300 px/s
        dmg: 30,
        radius: 0,
        life: 1.0,
      });

      const dt = 1 / 60;
      for (let step = 0; step < 30; step++) {
        eng.updateEprojs(dt);
      }
      assert.strictEqual(eng.hp, 100, 'Bullet flying past player at 9px closest distance must cleanly miss');

      // Pass 2: Bullet travels vertically along line x = 507 (closest approach = 7px)
      eng.eprojs = [{
        x: 507,
        y: 450,
        vx: 0,
        vy: 300,
        dmg: 30,
        radius: 0,
        life: 1.0,
      }];
      eng.iframes = 0;

      let hitOccurred = false;
      for (let step = 0; step < 30; step++) {
        eng.updateEprojs(dt);
        if (eng.hp < 100) {
          hitOccurred = true;
          break;
        }
      }
      assert.ok(hitOccurred, 'Bullet flying past player at 7px closest distance MUST collide');
      assert.strictEqual(eng.hp, 70, 'Player takes 30 damage on 7px trajectory');

      engine.destroy();
    });

    // -----------------------------------------------------------------------
    // Soft Swarm Circle-Circle Separation with 150+ Enemies
    // -----------------------------------------------------------------------
    it('1.5: Soft swarm circle-circle separation with 160 enemies under high load (zero NaNs, smooth dispersion)', () => {
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

      // Populate 160 enemies at a high-density cluster (centered at 500, 500)
      eng.enemies = [];
      const numEnemies = 160;
      for (let i = 0; i < numEnemies; i++) {
        // Place tightly within a 10x10 px area with slight jitter
        const jitterX = (i % 8) * 1.2;
        const jitterY = Math.floor(i / 8) * 1.2;
        const e = eng.makeEnemy('mail', 500 + jitterX, 500 + jitterY, false, false);
        e.spd = 0; // Disable pursuit movement to isolate circle-circle separation physics
        eng.enemies.push(e);
      }
      assert.strictEqual(eng.enemies.length, 160, 'Must spawn exactly 160 enemies');

      // Calculate initial mean pairwise distance
      let initialDistSum = 0;
      let pairCount = 0;
      for (let a = 0; a < numEnemies; a++) {
        for (let b = a + 1; b < numEnemies; b++) {
          initialDistSum += Math.hypot(eng.enemies[a].x - eng.enemies[b].x, eng.enemies[a].y - eng.enemies[b].y);
          pairCount++;
        }
      }
      const initialMeanDist = initialDistSum / pairCount;

      // Run 120 ticks of swarm update (simulating 2 seconds of high-load flocking)
      const startTime = performance.now();
      const dt = 1 / 60;
      for (let step = 0; step < 120; step++) {
        eng.updateEnemies(dt);

        // Invariant check: zero NaNs in positions or knockbacks at every step
        for (let i = 0; i < numEnemies; i++) {
          const e = eng.enemies[i];
          assert.ok(!Number.isNaN(e.x), `Enemy ${i} x must not be NaN at step ${step}`);
          assert.ok(!Number.isNaN(e.y), `Enemy ${i} y must not be NaN at step ${step}`);
          assert.ok(!Number.isNaN(e.kx), `Enemy ${i} kx must not be NaN at step ${step}`);
          assert.ok(!Number.isNaN(e.ky), `Enemy ${i} ky must not be NaN at step ${step}`);
          assert.ok(Number.isFinite(e.x), `Enemy ${i} x must be finite at step ${step}`);
          assert.ok(Number.isFinite(e.y), `Enemy ${i} y must be finite at step ${step}`);
        }
      }
      const elapsedMs = performance.now() - startTime;

      // Calculate post-separation mean pairwise distance
      let finalDistSum = 0;
      let minPairDist = Infinity;
      for (let a = 0; a < numEnemies; a++) {
        for (let b = a + 1; b < numEnemies; b++) {
          const d = Math.hypot(eng.enemies[a].x - eng.enemies[b].x, eng.enemies[a].y - eng.enemies[b].y);
          finalDistSum += d;
          if (d < minPairDist) minPairDist = d;
        }
      }
      const finalMeanDist = finalDistSum / pairCount;

      // Assert smooth physical expansion
      assert.ok(
        finalMeanDist > initialMeanDist * 3,
        `Enemies must physically disperse (initialMean: ${initialMeanDist.toFixed(2)}, finalMean: ${finalMeanDist.toFixed(2)})`
      );
      assert.ok(
        minPairDist > 2.0,
        `No two enemies should be stacked at singular point (minPairDist: ${minPairDist.toFixed(2)}px)`
      );
      // High load performance: 120 frames with 12,720 pairwise checks each must finish smoothly (< 1000ms total in node)
      assert.ok(elapsedMs < 1000, `Swarm separation must execute efficiently (${elapsedMs.toFixed(1)}ms for 120 ticks)`);

      engine.destroy();
    });

    it('1.6: Extreme Singularity: 160 enemies stacked at exact identical coordinates (0,0) disperse safely without NaN', () => {
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

      // Place 160 enemies all at (500, 500) exactly (dist = 0 singularity)
      eng.enemies = [];
      for (let i = 0; i < 160; i++) {
        const e = eng.makeEnemy('mail', 500, 500, false, false);
        e.spd = 0;
        eng.enemies.push(e);
      }

      const dt = 1 / 60;
      for (let step = 0; step < 60; step++) {
        eng.updateEnemies(dt);
        for (let i = 0; i < eng.enemies.length; i++) {
          assert.ok(!Number.isNaN(eng.enemies[i].x), `Singularity test: Enemy ${i} x must not be NaN`);
          assert.ok(!Number.isNaN(eng.enemies[i].y), `Singularity test: Enemy ${i} y must not be NaN`);
        }
      }

      // After 60 steps, enemies must have pushed outward away from singularity
      const distinctPositions = new Set(eng.enemies.map((e: any) => `${e.x.toFixed(1)},${e.y.toFixed(1)}`));
      assert.ok(distinctPositions.size > 100, 'Identical singularity must break symmetry and disperse enemies');

      engine.destroy();
    });
  });

  // =========================================================================
  // 2. BARRICADE DEFENSE: SWEPT-SPHERE CCD, FLOCKING & DURABILITY
  // =========================================================================
  describe('2. Barricade Defense: Swept-Sphere CCD & Flocking Physics', () => {

    it('2.1: Swept-Sphere CCD collision under extreme bullet speeds (500 units/s to 2000 units/s) achieves 0% tunneling', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      // Speeds to test: 500 (required), plus extreme supersonic speeds up to 2000 units/s
      const testSpeeds = [500, 800, 1200, 1600, 2000];
      // Target enemy Z positions spanning close, mid, and long ranges
      const targetZCoords = [-6.5, -12.3, -21.8, -34.2, -49.7];

      let trials = 0;
      let hits = 0;

      for (const speed of testSpeeds) {
        for (const foeZ of targetZCoords) {
          trials++;

          // Setup single stationary target foe directly in projectile line
          eng.foes = [{
            g: new THREE.Group(),
            kind: 'runner',
            x: 0,
            z: foeZ,
            hp: 100,
            maxHp: 100,
            walk: 0,
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
          eng.crates = [];
          eng.cages = [];

          // Reset all bolts
          for (const b of eng.boltPool) b.active = false;

          // Spawn single bullet at origin moving towards target: vx=0, vz=-speed
          eng.spawnBolt(0, 0, 0, speed, 25, 0, 0, 0, 'pistol', false);

          const bolt = eng.boltPool.find((b: any) => b.active);
          assert.ok(bolt, `Bolt must be initialized for speed ${speed}`);

          // Simulate physics steps with dt = 1/60s.
          // Note: at speed=500, single frame displacement is 500 * (1/60) = 8.33 units!
          // Since foe hitRadius = 0.65 + 0.35 = 1.0 unit, discrete testing would tunnel and miss!
          const dt = 1 / 60;
          let hitDetected = false;

          for (let step = 0; step < 60; step++) {
            eng.updateBolts(dt);
            if (eng.foes[0].hp < 100 || !bolt.active) {
              hitDetected = true;
              break;
            }
          }

          if (hitDetected) {
            hits++;
          }
        }
      }

      assert.strictEqual(hits, trials, `Swept CCD must achieve 0% tunneling (${hits}/${trials} hits registered)`);

      // Verify True Negative: Bullet fired with lateral offset (x = 2.0) outside hitRadius (1.0)
      // must NOT falsely register a hit.
      eng.foes = [{
        g: new THREE.Group(),
        kind: 'runner',
        x: 0,
        z: -20,
        hp: 100,
        maxHp: 100,
        walk: 0,
        radius: 0.65,
        dmg: 10,
        dead: false,
      }];
      for (const b of eng.boltPool) b.active = false;
      eng.spawnBolt(2.0, 0, 0, 500, 25, 0, 0, 0, 'pistol', false);
      for (let step = 0; step < 60; step++) {
        eng.updateBolts(1 / 60);
      }
      assert.strictEqual(eng.foes[0].hp, 100, 'Bullet outside hitRadius must cleanly miss (0% false positives)');

      engine.destroy();
    });

    it('2.2: Dynamic squad flocking expansion up to 30 allies without NaN divergence under violent motion', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      // Add allies up to maximum capacity (30 allies)
      while (eng.allies.length < MAX_ALLIES) {
        eng.addAlly();
      }
      assert.strictEqual(eng.allies.length, 30, 'Must have exactly 30 allies in squad');

      const dt = 1 / 60;

      // Stress test: Simulate 180 frames while dynamically jerking the hero position left and right
      for (let step = 0; step < 180; step++) {
        // Aggressive zig-zag trajectory
        eng.hero.position.x = Math.sin(step * 0.15) * 4.5;

        eng.updateAllies(dt);

        // Check each ally for NaN, Infinity, and boundary violations
        for (let i = 0; i < eng.allies.length; i++) {
          const a = eng.allies[i];
          assert.ok(!Number.isNaN(a.g.position.x), `Ally ${i} position.x must not be NaN at step ${step}`);
          assert.ok(!Number.isNaN(a.g.position.z), `Ally ${i} position.z must not be NaN at step ${step}`);
          assert.ok(!Number.isNaN(a.vx), `Ally ${i} vx must not be NaN at step ${step}`);
          assert.ok(!Number.isNaN(a.vz), `Ally ${i} vz must not be NaN at step ${step}`);
          assert.ok(Number.isFinite(a.g.position.x), `Ally ${i} position.x must be finite`);
          assert.ok(Number.isFinite(a.g.position.z), `Ally ${i} position.z must be finite`);
        }
      }

      // Verify formation coherence: Allies should maintain tactical column/row spacing behind hero
      for (let i = 0; i < eng.allies.length; i++) {
        const a = eng.allies[i];
        assert.ok(a.g.position.z > eng.hero.position.z, `Ally ${i} must stay behind hero on Z-axis`);
      }

      engine.destroy();
    });

    it('2.3: Extreme Singularity Flocking: All 30 allies placed at identical position (0,0,0) without NaN divergence', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      while (eng.allies.length < 30) {
        eng.addAlly();
      }

      // Force-collapse all 30 allies directly onto identical coordinates (0, 0, 0)
      eng.allies.forEach((a: any) => {
        a.g.position.set(0, 0, 0);
        a.vx = 0;
        a.vz = 0;
      });

      const dt = 1 / 60;
      for (let step = 0; step < 60; step++) {
        eng.updateAllies(dt);
        eng.allies.forEach((a: any, idx: number) => {
          assert.ok(!Number.isNaN(a.g.position.x), `Singularity: Ally ${idx} x must not be NaN`);
          assert.ok(!Number.isNaN(a.g.position.z), `Singularity: Ally ${idx} z must not be NaN`);
          assert.ok(!Number.isNaN(a.vx), `Singularity: Ally ${idx} vx must not be NaN`);
          assert.ok(!Number.isNaN(a.vz), `Singularity: Ally ${idx} vz must not be NaN`);
        });
      }

      // Verify that allies successfully repelled and organized into non-singular positions
      let minPairDist = Infinity;
      for (let i = 0; i < eng.allies.length; i++) {
        for (let j = i + 1; j < eng.allies.length; j++) {
          const d = Math.hypot(
            eng.allies[i].g.position.x - eng.allies[j].g.position.x,
            eng.allies[i].g.position.z - eng.allies[j].g.position.z
          );
          if (d < minPairDist) minPairDist = d;
        }
      }
      assert.ok(minPairDist > 0.1, `Singularity allies must repel each other (minPairDist: ${minPairDist})`);

      engine.destroy();
    });

    // -----------------------------------------------------------------------
    // Barricade 4-State Durability Transitions
    // -----------------------------------------------------------------------
    it('2.4: Barricade 4-state durability transitions (Pristine -> Damaged -> Critical Alarm -> Broken)', () => {
      // 1. Build barricade mesh at pristine durability (1.0)
      const barricade = buildBarricadeMesh(1, 1.0);
      const ud = barricade.userData;
      assert.ok(ud, 'Barricade userData must be initialized');

      // State 1: Pristine (100% - 70%)
      updateBarricadeDurability(barricade, 1.0, 0);
      assert.strictEqual(ud.energyMesh.visible, true, 'State 1 (1.0): Energy mesh visible');
      assert.strictEqual(ud.crackMesh.visible, false, 'State 1 (1.0): Crack mesh hidden');
      assert.strictEqual(ud.debrisGroup.visible, false, 'State 1 (1.0): Debris hidden');
      assert.strictEqual(ud.energyMat.color.getHex(), 0x06b6d4, 'State 1 (1.0): Pristine Cyan color');
      assert.strictEqual(ud.beaconMat.color.getHex(), 0x06b6d4, 'State 1 (1.0): Beacon cyan');

      updateBarricadeDurability(barricade, 0.70, 0);
      assert.strictEqual(ud.crackMesh.visible, false, 'State 1 boundary (0.70): Crack mesh still hidden');
      assert.strictEqual(ud.energyMat.color.getHex(), 0x06b6d4, 'State 1 boundary (0.70): Cyan');

      // State 2: Damaged (69% - 30%)
      updateBarricadeDurability(barricade, 0.699, 0);
      assert.strictEqual(ud.energyMesh.visible, true, 'State 2 (0.699): Energy mesh visible');
      assert.strictEqual(ud.crackMesh.visible, true, 'State 2 (0.699): Crack mesh appears');
      assert.strictEqual(ud.debrisGroup.visible, false, 'State 2 (0.699): Debris hidden');
      assert.strictEqual(ud.energyMat.color.getHex(), 0xf59e0b, 'State 2 (0.699): Orange warning color');
      assert.strictEqual(ud.crackMat.color.getHex(), 0xf59e0b, 'State 2 (0.699): Crack orange');

      updateBarricadeDurability(barricade, 0.30, 0);
      assert.strictEqual(ud.energyMat.color.getHex(), 0xf59e0b, 'State 2 boundary (0.30): Still orange');

      // State 3: Critical Alarm (29% - 1%)
      updateBarricadeDurability(barricade, 0.299, 0);
      assert.strictEqual(ud.energyMesh.visible, true, 'State 3 (0.299): Energy mesh visible');
      assert.strictEqual(ud.crackMesh.visible, true, 'State 3 (0.299): Crack mesh visible');
      assert.strictEqual(ud.debrisGroup.visible, false, 'State 3 (0.299): Debris hidden');
      assert.strictEqual(ud.energyMat.color.getHex(), 0xef4444, 'State 3 (0.299): Alarm Red color');
      assert.strictEqual(ud.crackMat.color.getHex(), 0xef4444, 'State 3 (0.299): Crack red');

      updateBarricadeDurability(barricade, 0.01, 0);
      assert.strictEqual(ud.energyMat.color.getHex(), 0xef4444, 'State 3 (0.01): Alarm Red');

      // State 4: Broken / Shattered (0%)
      updateBarricadeDurability(barricade, 0.0005, 0);
      assert.strictEqual(ud.energyMesh.visible, false, 'State 4 (0%): Energy mesh vanishes');
      assert.strictEqual(ud.crackMesh.visible, false, 'State 4 (0%): Crack mesh vanishes');
      assert.strictEqual(ud.debrisGroup.visible, true, 'State 4 (0%): Shattered debris appears on track');
      assert.strictEqual(ud.topRail.position.y, 0.6, 'State 4 (0%): Top rail collapses downward to y=0.6');
      assert.strictEqual(ud.topRail.rotation.z, 0.08, 'State 4 (0%): Top rail tilts realistically');
      assert.strictEqual(ud.beaconMat.color.getHex(), 0x334155, 'State 4 (0%): Beacon extinguished to dark slate');

      // Repair / Restoration Transition (0% back to 100%)
      updateBarricadeDurability(barricade, 1.0, 0);
      assert.strictEqual(ud.energyMesh.visible, true, 'Restored: Energy mesh returns');
      assert.strictEqual(ud.debrisGroup.visible, false, 'Restored: Debris cleared');
      assert.strictEqual(ud.topRail.position.y, 2.3, 'Restored: Top rail restored to normal height');
      assert.strictEqual(ud.topRail.rotation.z, 0, 'Restored: Top rail rotation reset to 0');
      assert.strictEqual(ud.energyMat.color.getHex(), 0x06b6d4, 'Restored: Cyan active barrier');
    });

    it('2.5: Barricade durability continuous degradation ramp (1.00 down to 0.00 in steps of 0.02)', () => {
      const barricade = buildBarricadeMesh(2, 1.0);
      const ud = barricade.userData;

      let stateCounts = { pristine: 0, damaged: 0, critical: 0, broken: 0 };

      for (let r = 100; r >= 0; r -= 2) {
        const ratio = r / 100;
        updateBarricadeDurability(barricade, ratio, ratio * 10);

        if (ratio <= 0.001) {
          stateCounts.broken++;
          assert.strictEqual(ud.debrisGroup.visible, true);
        } else if (ratio < 0.3) {
          stateCounts.critical++;
          assert.strictEqual(ud.energyMat.color.getHex(), 0xef4444);
        } else if (ratio < 0.7) {
          stateCounts.damaged++;
          assert.strictEqual(ud.energyMat.color.getHex(), 0xf59e0b);
        } else {
          stateCounts.pristine++;
          assert.strictEqual(ud.energyMat.color.getHex(), 0x06b6d4);
        }
      }

      assert.ok(stateCounts.pristine > 0, 'Pristine state encountered');
      assert.ok(stateCounts.damaged > 0, 'Damaged state encountered');
      assert.ok(stateCounts.critical > 0, 'Critical state encountered');
      assert.ok(stateCounts.broken > 0, 'Broken state encountered');
    });
  });
});
