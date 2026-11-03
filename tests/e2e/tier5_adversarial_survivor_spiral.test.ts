/**
 * Tier 5: Adversarial Coverage Hardening Test Suite
 *
 * Comprehensive White-Box Adversarial Stress Testing for:
 * 1. Shachiku Survivor:
 *    - Simultaneous weapon evolution checks with multiple max-level weapons and passives.
 *    - Boss chest fanfare timing, state transitions, and rapid dual pickups.
 *    - 300+ enemy swarm circle-circle separation performance under sub-16ms budgets.
 *    - Sub-pixel precision player hurtbox boundaries (`r = 7.99px` vs `r = 8.01px`) across all angles.
 * 2. Shachiku Spiral:
 *    - Wave 15 President Golden Executive Barrier deflection vs bypass edge boundaries (`angle = barrierAngle ± barrierArc/2 ± 1e-5`).
 *    - Angular discontinuity wrap-around at ±π boundaries.
 *    - Minion chain summon limits and monotonic phase progression (anti-healing exploit).
 *    - Chain split and mini-head promotion when chain length is 1, 2, or > 2.
 *    - Canvas2D vector renderer performance with 50+ chain segments, 20+ orbitals, and 100+ lasers under additive blending.
 *    - Strict zero-emoji compliance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { setupTestEnvironment, createMockCanvas, createMockAudio } from './testEnv';

// Initialize headless browser environment
setupTestEnvironment();

import { SurvivorEngine } from '@/game/survivor/engine';
import { checkEvolution, EVOLUTION_RECIPES, isEvolvedWeapon, getRecipeByEvolvedId } from '@/game/survivor/evolutions';
import { SpiralEngine } from '@/game/spiral/engine';
import {
  drawVectorCore,
  drawVectorSegment,
  drawVectorOrbital,
  drawVectorLaser,
  drawVectorProjectile,
  drawVectorExecutiveBarrier,
} from '@/game/spiral/vectorRenderer';

// Helper to create a survivor engine
function createSurvivorEngine(options: { onBanner?: (title: string, sub: string) => void } = {}): {
  engine: SurvivorEngine;
  anyEngine: any;
  canvas: HTMLCanvasElement;
  banners: Array<{ title: string; sub: string }>;
} {
  const canvas = createMockCanvas(960, 600);
  const banners: Array<{ title: string; sub: string }> = [];
  const engine = new SurvivorEngine(canvas, createMockAudio(), {
    onHud: () => {},
    onLevelUp: () => {},
    onLevelClosed: () => {},
    onGameOver: () => {},
    onBanner: (t, s) => {
      banners.push({ title: t, sub: s });
      if (options.onBanner) options.onBanner(t, s);
    },
  });
  engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
  const anyEngine = engine as any;
  // Clean initial state for controlled tests
  anyEngine.enemies = [];
  anyEngine.eprojs = [];
  anyEngine.pickups = [];
  anyEngine.px = 500;
  anyEngine.py = 500;
  anyEngine.hp = 100;
  anyEngine.iframes = 0;
  return { engine, anyEngine, canvas, banners };
}

// Helper to create a spiral engine
function createSpiralEngine(options: { onBanner?: (title: string, sub: string) => void } = {}): {
  engine: SpiralEngine;
  anyEngine: any;
  canvas: HTMLCanvasElement;
  banners: Array<{ title: string; sub: string }>;
} {
  const canvas = createMockCanvas(640, 640);
  const banners: Array<{ title: string; sub: string }> = [];
  const engine = new SpiralEngine(canvas, createMockAudio(), {
    onHud: () => {},
    onBuild: (b) => {
      if (b.choices.length > 0) engine.applyUpgrade(b.choices[0]);
    },
    onGameOver: () => {},
    onBanner: (t, s) => {
      banners.push({ title: t, sub: s });
      if (options.onBanner) options.onBanner(t, s);
    },
  });
  engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
  const anyEngine = engine as any;
  anyEngine.chains = [];
  return { engine, anyEngine, canvas, banners };
}

describe('Tier 5: Adversarial Coverage Hardening (Survivor & Spiral)', () => {

  // =========================================================================
  // SUITE 1: SURVIVOR WEAPON EVOLUTIONS & CHEST SUSPENSE MECHANICS
  // =========================================================================
  describe('Suite 1: Survivor Weapon Evolutions & Chest Suspense Mechanics', () => {

    it('T5-SURV-01.1: Multi-candidate evolution priority deterministically selects first recipe in order', () => {
      // Setup inventory where all 8 weapons are at Lv8 and matching passives at Lv5
      const weapons = new Map<string, number>([
        ['shuriken', 8],
        ['coffee', 8],
        ['barrier', 8],
        ['boomerang', 8],
        ['bomb', 8],
        ['phone', 8],
        ['hanko', 8],
        ['bell', 8],
      ]);
      const passives = new Map<string, number>([
        ['power', 5],
        ['watch', 5],
        ['magnet', 5],
        ['shoes', 5],
        ['lunch', 5],
        ['care', 5],
      ]);

      const firstChoice = checkEvolution(weapons, passives);
      assert.ok(firstChoice, 'Must find a valid evolution recipe');
      assert.strictEqual(firstChoice.baseWeaponId, 'shuriken', 'First recipe in EVOLUTION_RECIPES must take priority');
      assert.strictEqual(firstChoice.evolvedId, 'contract_storm');
    });

    it('T5-SURV-01.2: Successive chest opens progress through all qualified evolutions without stalls', () => {
      const weapons = new Map<string, number>([
        ['shuriken', 8],
        ['coffee', 8],
        ['barrier', 8],
      ]);
      const passives = new Map<string, number>([
        ['power', 1],
        ['watch', 1],
        ['magnet', 1],
      ]);

      // Evolve 1st weapon
      const ev1 = checkEvolution(weapons, passives);
      assert.ok(ev1);
      assert.strictEqual(ev1.evolvedId, 'contract_storm');
      weapons.delete('shuriken');
      weapons.set('contract_storm', 1);

      // Evolve 2nd weapon
      const ev2 = checkEvolution(weapons, passives);
      assert.ok(ev2);
      assert.strictEqual(ev2.evolvedId, 'caffeine_geyser');
      weapons.delete('coffee');
      weapons.set('caffeine_geyser', 1);

      // Evolve 3rd weapon
      const ev3 = checkEvolution(weapons, passives);
      assert.ok(ev3);
      assert.strictEqual(ev3.evolvedId, 'kanban_barrier');
      weapons.delete('barrier');
      weapons.set('kanban_barrier', 1);

      // No more evolutions remain
      const ev4 = checkEvolution(weapons, passives);
      assert.strictEqual(ev4, null, 'Must return null when all qualified weapons are evolved');
    });

    it('T5-SURV-01.3: Shared passive dependency resolution (power shared between shuriken & hanko)', () => {
      // shuriken -> contract_storm (req power)
      // hanko -> imperial_seal (req power)
      const weapons = new Map<string, number>([
        ['shuriken', 8],
        ['hanko', 8],
      ]);
      const passives = new Map<string, number>([
        ['power', 1],
      ]);

      const ev1 = checkEvolution(weapons, passives);
      assert.ok(ev1);
      assert.strictEqual(ev1.baseWeaponId, 'shuriken');

      // After shuriken evolves, hanko can still evolve using the same power passive
      weapons.delete('shuriken');
      weapons.set('contract_storm', 1);

      const ev2 = checkEvolution(weapons, passives);
      assert.ok(ev2);
      assert.strictEqual(ev2.baseWeaponId, 'hanko');
      assert.strictEqual(ev2.evolvedId, 'imperial_seal');
    });

    it('T5-SURV-01.4: Strict boundary limits (Lv7 vs Lv8 weapon, Lv0 vs Lv1 passive)', () => {
      // Weapon at Lv 7 (1 below max) -> MUST FAIL
      assert.strictEqual(
        checkEvolution(new Map([['coffee', 7]]), new Map([['watch', 5]])),
        null,
        'Weapon at Lv 7 must not qualify for evolution'
      );

      // Passive at Lv 0 (unacquired) -> MUST FAIL
      assert.strictEqual(
        checkEvolution(new Map([['coffee', 8]]), new Map([['watch', 0]])),
        null,
        'Passive at Lv 0 must not qualify for evolution'
      );

      // Weapon Lv 8 + Passive Lv 1 -> MUST SUCCEED
      const success = checkEvolution(new Map([['coffee', 8]]), new Map([['watch', 1]]));
      assert.ok(success);
      assert.strictEqual(success.evolvedId, 'caffeine_geyser');
    });

    it('T5-SURV-01.5: Already-evolved weapon idempotency (cannot re-evolve or block other weapons)', () => {
      const weapons = new Map<string, number>([
        ['contract_storm', 1],
        ['shuriken', 8], // edge case: if base weapon somehow remained
        ['coffee', 8],
      ]);
      const passives = new Map<string, number>([
        ['power', 1],
        ['watch', 1],
      ]);

      // Since contract_storm is already present in weapons map, shuriken is considered evolved
      const nextEv = checkEvolution(weapons, passives);
      assert.ok(nextEv);
      assert.strictEqual(nextEv.baseWeaponId, 'coffee', 'Must skip already-evolved contract_storm and pick coffee');
    });

    it('T5-SURV-01.6: Null safety and corrupt input resilience in checkEvolution', () => {
      assert.strictEqual(checkEvolution(null as any, new Map()), null);
      assert.strictEqual(checkEvolution(new Map(), null as any), null);
      assert.strictEqual(checkEvolution(new Map(), new Map()), null);
      assert.strictEqual(checkEvolution(new Map([['unknown_weapon', 99]]), new Map([['unknown_passive', 99]])), null);
      assert.strictEqual(isEvolvedWeapon('unknown'), false);
      assert.strictEqual(getRecipeByEvolvedId('unknown'), undefined);
    });

    it('T5-SURV-01.7: Boss chest fanfare timing & rapid dual pickup handling', () => {
      const { engine, anyEngine, banners } = createSurvivorEngine();

      // Give player Lv8 weapon + Lv1 passive
      anyEngine.weapons = [{ id: 'coffee', lv: 8, cd: 0 }];
      anyEngine.passives = [{ id: 'watch', lv: 1 }];

      // Place 2 chests at player position
      anyEngine.pickups = [
        { x: 500, y: 500, kind: 'chest', bob: 0 },
        { x: 500, y: 500, kind: 'chest', bob: 0 },
      ];

      // Step simulation by 1 frame (16ms)
      anyEngine.updatePickups(0.016);

      // Both chests should be collected
      assert.strictEqual(anyEngine.chests, 2, 'Two chests collected');
      assert.strictEqual(anyEngine.pickups.length, 0, 'No pickups remaining');

      // First chest evolved coffee -> caffeine_geyser
      assert.strictEqual(anyEngine.weapons[0].id, 'caffeine_geyser');
      assert.strictEqual(anyEngine.weapons[0].lv, 1);

      // Second chest gave normal coins/upgrade since no evolutions remained
      assert.ok(anyEngine.coins > 0, 'Coins awarded from second chest');
      assert.ok(banners.length >= 2, 'Banners dispatched for evolution and chest reward');

      // Verify hitstop and trauma shake were applied cleanly
      assert.ok(anyEngine.hitstop.isFrozen(), 'Hitstop triggered on evolution');
      assert.ok(anyEngine.traumaShake.getIntensity() > 0, 'Trauma shake triggered');

      engine.destroy();
    });
  });

  // =========================================================================
  // SUITE 2: SURVIVOR PLAYER HURTBOX SUB-PIXEL PRECISION & SWARM SEPARATION
  // =========================================================================
  describe('Suite 2: Survivor Player Hurtbox Sub-Pixel Precision & Swarm Separation', () => {

    it('T5-SURV-02.1: Player hurtbox sub-pixel precision at r = 7.99px vs r = 8.01px (enemy contact)', () => {
      const { engine, anyEngine } = createSurvivorEngine();

      // Case A: Enemy placed at distance 8.01px (just outside hurtbox)
      // Player at (500, 500). Enemy with radius 0 at (500 + 8.01, 500).
      anyEngine.enemies = [{
        o: true,
        kind: 'mail',
        x: 500 + 8.01,
        y: 500,
        hp: 10,
        maxHp: 10,
        spd: 0,
        dmg: 20,
        xp: 1,
        coins: 1,
        radius: 0,
        hitCd: 0,
        flash: 0,
        kx: 0,
        ky: 0,
        elite: false,
        boss: false,
        ranged: false,
        splitter: false,
        score: 10,
        shootCd: 0,
        dashCd: 0,
        dashT: 0,
        summonCd: 0,
        barrierCd: 0,
        boomHit: 0,
      }];
      anyEngine.hp = 100;
      anyEngine.iframes = 0;

      anyEngine.updateEnemies(0.016);
      assert.strictEqual(anyEngine.hp, 100, 'Enemy at distance 8.01px must NOT damage player');
      assert.strictEqual(anyEngine.iframes, 0, 'Enemy at distance 8.01px must NOT trigger iframes');

      // Case B: Enemy placed at distance 7.99px (just inside hurtbox)
      anyEngine.enemies[0].x = 500 + 7.99;
      anyEngine.updateEnemies(0.016);
      assert.strictEqual(anyEngine.hp, 80, 'Enemy at distance 7.99px MUST damage player (100 - 20 = 80)');
      assert.ok(anyEngine.iframes > 0, 'Enemy at distance 7.99px MUST trigger iframes');

      engine.destroy();
    });

    it('T5-SURV-02.2: Precision hurtbox boundary across 8 radial directions (sub-pixel 7.99px vs 8.01px)', () => {
      const angles = [
        0,
        Math.PI / 4,
        Math.PI / 2,
        (3 * Math.PI) / 4,
        Math.PI,
        (5 * Math.PI) / 4,
        (3 * Math.PI) / 2,
        (7 * Math.PI) / 4,
      ];

      for (let i = 0; i < angles.length; i++) {
        const a = angles[i];
        const deg = Math.round((a * 180) / Math.PI);

        // Sub-pixel miss test at 8.01px
        {
          const { engine, anyEngine } = createSurvivorEngine();
          anyEngine.enemies = [{
            o: true, kind: 'mail',
            x: 500 + Math.cos(a) * 8.01,
            y: 500 + Math.sin(a) * 8.01,
            hp: 10, maxHp: 10, spd: 0, dmg: 10, xp: 1, coins: 1,
            radius: 0, hitCd: 0, flash: 0, kx: 0, ky: 0,
            elite: false, boss: false, ranged: false, splitter: false, score: 10,
            shootCd: 0, dashCd: 0, dashT: 0, summonCd: 0, barrierCd: 0, boomHit: 0,
          }];
          anyEngine.updateEnemies(0.016);
          assert.strictEqual(anyEngine.hp, 100, `Enemy at angle ${deg}° at dist 8.01px must NOT hit`);
          engine.destroy();
        }

        // Sub-pixel hit test at 7.99px
        {
          const { engine, anyEngine } = createSurvivorEngine();
          anyEngine.enemies = [{
            o: true, kind: 'mail',
            x: 500 + Math.cos(a) * 7.99,
            y: 500 + Math.sin(a) * 7.99,
            hp: 10, maxHp: 10, spd: 0, dmg: 10, xp: 1, coins: 1,
            radius: 0, hitCd: 0, flash: 0, kx: 0, ky: 0,
            elite: false, boss: false, ranged: false, splitter: false, score: 10,
            shootCd: 0, dashCd: 0, dashT: 0, summonCd: 0, barrierCd: 0, boomHit: 0,
          }];
          anyEngine.updateEnemies(0.016);
          assert.strictEqual(anyEngine.hp, 90, `Enemy at angle ${deg}° at dist 7.99px MUST hit`);
          engine.destroy();
        }
      }
    });

    it('T5-SURV-02.3: Projectile collision boundary with standard radius p.radius = 7 (dist 15.01px vs 14.99px)', () => {
      // rr = p.radius + 8 = 7 + 8 = 15.0px
      const { engine, anyEngine } = createSurvivorEngine();

      // Case A: Projectile at distance 15.01px
      anyEngine.eprojs = [{
        x: 500,
        y: 500 + 15.01,
        vx: 0,
        vy: 0,
        dmg: 15,
        radius: 7,
        life: 2.0,
      }];
      anyEngine.updateEprojs(0.016);
      assert.strictEqual(anyEngine.hp, 100, 'Bullet at distance 15.01px must NOT hit player');
      assert.strictEqual(anyEngine.eprojs.length, 1, 'Bullet at distance 15.01px must remain alive');

      // Case B: Projectile at distance 14.99px
      anyEngine.eprojs = [{
        x: 500,
        y: 500 + 14.99,
        vx: 0,
        vy: 0,
        dmg: 15,
        radius: 7,
        life: 2.0,
      }];
      anyEngine.updateEprojs(0.016);
      assert.strictEqual(anyEngine.hp, 85, 'Bullet at distance 14.99px MUST hit player (100 - 15 = 85)');
      assert.strictEqual(anyEngine.eprojs.length, 0, 'Bullet at distance 14.99px must be consumed');

      engine.destroy();
    });

    it('T5-SURV-02.4: 300+ enemy swarm circle-circle separation resolves extreme clustering without NaNs', () => {
      const { engine, anyEngine } = createSurvivorEngine();

      // Spawn 320 enemies clustered at EXACTLY (500, 500)
      const enemyCount = 320;
      for (let i = 0; i < enemyCount; i++) {
        anyEngine.enemies.push({
          o: true,
          kind: i % 2 === 0 ? 'mail' : 'slack',
          x: 500, // Exact same coordinate
          y: 500,
          hp: 20,
          maxHp: 20,
          spd: 0, // Zero speed so only swarm separation moves them
          dmg: 5,
          xp: 1,
          coins: 1,
          radius: 10,
          hitCd: 0,
          flash: 0,
          kx: 0,
          ky: 0,
          elite: false,
          boss: false,
          ranged: false,
          splitter: false,
          score: 10,
          shootCd: 0,
          dashCd: 0,
          dashT: 0,
          summonCd: 0,
          barrierCd: 0,
          boomHit: 0,
        });
      }

      // Simulate 30 frames (0.5 seconds)
      for (let f = 0; f < 30; f++) {
        anyEngine.updateEnemies(0.016);
      }

      // Verify all enemies have valid finite non-NaN coordinates
      let maxDistFromOrigin = 0;
      for (let i = 0; i < enemyCount; i++) {
        const e = anyEngine.enemies[i];
        assert.ok(Number.isFinite(e.x), `Enemy ${i} x coordinate must be finite`);
        assert.ok(Number.isFinite(e.y), `Enemy ${i} y coordinate must be finite`);
        assert.ok(!Number.isNaN(e.x), `Enemy ${i} x coordinate must not be NaN`);
        assert.ok(!Number.isNaN(e.y), `Enemy ${i} y coordinate must not be NaN`);
        const d = Math.hypot(e.x - 500, e.y - 500);
        if (d > maxDistFromOrigin) maxDistFromOrigin = d;
      }

      // Enemies must have smoothly dispersed outward from singularity
      assert.ok(maxDistFromOrigin > 20, 'Enemies must disperse outward under circle-circle separation');

      engine.destroy();
    });

    it('T5-SURV-02.5: Swarm separation execution time for 300+ enemies achieves sub-16ms budget', () => {
      const { engine, anyEngine } = createSurvivorEngine();

      // Spawn 300 enemies in close proximity
      for (let i = 0; i < 300; i++) {
        const a = (i / 300) * Math.PI * 2;
        const r = (i % 5) * 6;
        anyEngine.enemies.push({
          o: true,
          kind: 'mail',
          x: 500 + Math.cos(a) * r,
          y: 500 + Math.sin(a) * r,
          hp: 20,
          maxHp: 20,
          spd: 10,
          dmg: 5,
          xp: 1,
          coins: 1,
          radius: 9,
          hitCd: 0,
          flash: 0,
          kx: 0,
          ky: 0,
          elite: false,
          boss: false,
          ranged: false,
          splitter: false,
          score: 10,
          shootCd: 0,
          dashCd: 0,
          dashT: 0,
          summonCd: 0,
          barrierCd: 0,
          boomHit: 0,
        });
      }

      // Benchmark 60 simulation frames
      const frameCount = 60;
      const t0 = performance.now();
      for (let f = 0; f < frameCount; f++) {
        anyEngine.updateEnemies(0.016);
      }
      const t1 = performance.now();
      const totalTime = t1 - t0;
      const avgFrameTime = totalTime / frameCount;

      // Assert average frame time is strictly below 16ms (typically < 3ms)
      assert.ok(
        avgFrameTime < 16.0,
        `Average frame time for 300 swarm separation must be < 16ms, got ${avgFrameTime.toFixed(3)}ms`
      );

      engine.destroy();
    });
  });

  // =========================================================================
  // SUITE 3: SPIRAL WAVE 15 PRESIDENT EXECUTIVE BARRIER DEFLECTION & BYPASS
  // =========================================================================
  describe('Suite 3: Spiral Wave 15 President Executive Barrier Deflection vs Bypass', () => {

    it('T5-SPIR-03.1: Direct frontal attack is 100% deflected/absorbed by executive barrier', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];
      const head = boss.segs[0];
      const initialHeadHp = head.hp;
      const initialBarrierHp = boss.bossState.barrierHp;

      // Align barrier to angle 0
      boss.bossState.barrierAngle = 0;
      boss.bossState.barrierArc = Math.PI * 0.65; // ~117 degrees
      boss.bossState.barrierActive = true;

      // Direct frontal attack from (head.x + 50, head.y)
      anyEngine.damageSeg(boss, 0, 0, 100, 20, head.x + 50, head.y, false);

      // Barrier absorbed 100 dmg, head took 0 dmg
      assert.strictEqual(head.hp, initialHeadHp, 'Direct frontal attack must NOT damage head');
      assert.strictEqual(boss.bossState.barrierHp, initialBarrierHp - 100, 'Barrier must absorb 100 damage');

      engine.destroy();
    });

    it('T5-SPIR-03.2: Deflection edge boundary (angle = barrierAngle + barrierArc/2 - 1e-5) is DEFLECTED', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];
      const head = boss.segs[0];
      const initialHeadHp = head.hp;
      const initialBarrierHp = boss.bossState.barrierHp;

      boss.bossState.barrierAngle = 0.5;
      const halfArc = boss.bossState.barrierArc / 2;
      const attackAngle = boss.bossState.barrierAngle + halfArc - 1e-5;

      const attackDist = 50;
      const fromX = head.x + Math.cos(attackAngle) * attackDist;
      const fromY = head.y + Math.sin(attackAngle) * attackDist;

      anyEngine.damageSeg(boss, 0, 0, 50, 0, fromX, fromY, false);

      assert.strictEqual(head.hp, initialHeadHp, 'Hit just inside barrier boundary must NOT damage head');
      assert.strictEqual(boss.bossState.barrierHp, initialBarrierHp - 50, 'Barrier must absorb hit just inside arc');

      engine.destroy();
    });

    it('T5-SPIR-03.3: Deflection edge boundary opposite side (angle = barrierAngle - barrierArc/2 + 1e-5) is DEFLECTED', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];
      const head = boss.segs[0];
      const initialHeadHp = head.hp;
      const initialBarrierHp = boss.bossState.barrierHp;

      boss.bossState.barrierAngle = 0.5;
      const halfArc = boss.bossState.barrierArc / 2;
      const attackAngle = boss.bossState.barrierAngle - halfArc + 1e-5;

      const attackDist = 50;
      const fromX = head.x + Math.cos(attackAngle) * attackDist;
      const fromY = head.y + Math.sin(attackAngle) * attackDist;

      anyEngine.damageSeg(boss, 0, 0, 50, 0, fromX, fromY, false);

      assert.strictEqual(head.hp, initialHeadHp, 'Hit just inside negative barrier boundary must NOT damage head');
      assert.strictEqual(boss.bossState.barrierHp, initialBarrierHp - 50, 'Barrier must absorb hit');

      engine.destroy();
    });

    it('T5-SPIR-03.4: Bypass edge boundary (angle = barrierAngle + barrierArc/2 + 1e-5) BYPASSES barrier', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];
      const head = boss.segs[0];
      const initialHeadHp = head.hp;
      const initialBarrierHp = boss.bossState.barrierHp;

      boss.bossState.barrierAngle = 0.5;
      const halfArc = boss.bossState.barrierArc / 2;
      const attackAngle = boss.bossState.barrierAngle + halfArc + 1e-5;

      const attackDist = 50;
      const fromX = head.x + Math.cos(attackAngle) * attackDist;
      const fromY = head.y + Math.sin(attackAngle) * attackDist;

      anyEngine.damageSeg(boss, 0, 0, 50, 0, fromX, fromY, false);

      assert.strictEqual(head.hp, initialHeadHp - 50, 'Hit just outside barrier boundary MUST damage head');
      assert.strictEqual(boss.bossState.barrierHp, initialBarrierHp, 'Barrier HP must remain untouched when bypassed');

      engine.destroy();
    });

    it('T5-SPIR-03.5: Bypass edge boundary opposite side (angle = barrierAngle - barrierArc/2 - 1e-5) BYPASSES barrier', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];
      const head = boss.segs[0];
      const initialHeadHp = head.hp;
      const initialBarrierHp = boss.bossState.barrierHp;

      boss.bossState.barrierAngle = 0.5;
      const halfArc = boss.bossState.barrierArc / 2;
      const attackAngle = boss.bossState.barrierAngle - halfArc - 1e-5;

      const attackDist = 50;
      const fromX = head.x + Math.cos(attackAngle) * attackDist;
      const fromY = head.y + Math.sin(attackAngle) * attackDist;

      anyEngine.damageSeg(boss, 0, 0, 50, 0, fromX, fromY, false);

      assert.strictEqual(head.hp, initialHeadHp - 50, 'Hit just outside negative barrier boundary MUST damage head');
      assert.strictEqual(boss.bossState.barrierHp, initialBarrierHp, 'Barrier HP must remain untouched when bypassed');

      engine.destroy();
    });

    it('T5-SPIR-03.6: Angular discontinuity wrap-around at ±π boundaries correctly deflecting/bypassing', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];
      const head = boss.segs[0];
      const initialHeadHp = head.hp;
      const initialBarrierHp = boss.bossState.barrierHp;

      // Place barrier angle right at π - 0.1 (~3.0416 rad)
      boss.bossState.barrierAngle = Math.PI - 0.1;

      // Attack angle across the +π / -π seam: -π + 0.1 (~ -3.0416 rad)
      // Angular difference across seam is 0.2 rad < barrierArc/2 (~1.02 rad)
      const attackAngleAcrossSeam = -Math.PI + 0.1;
      const fromX = head.x + Math.cos(attackAngleAcrossSeam) * 50;
      const fromY = head.y + Math.sin(attackAngleAcrossSeam) * 50;

      anyEngine.damageSeg(boss, 0, 0, 40, 0, fromX, fromY, false);

      // Must be absorbed across seam!
      assert.strictEqual(head.hp, initialHeadHp, 'Wrap-around hit must NOT damage head');
      assert.strictEqual(boss.bossState.barrierHp, initialBarrierHp - 40, 'Wrap-around hit must be absorbed by barrier');

      engine.destroy();
    });

    it('T5-SPIR-03.7: Barrier depletion collapses barrier and subsequent frontal hits directly damage head', () => {
      const { engine, anyEngine, banners } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];
      const head = boss.segs[0];

      boss.bossState.barrierAngle = 0;
      boss.bossState.barrierHp = 60; // Set low barrier HP

      // Deal 80 frontal damage to deplete barrier (60 - 80 <= 0)
      anyEngine.damageSeg(boss, 0, 0, 80, 0, head.x + 50, head.y, false);

      assert.strictEqual(boss.bossState.barrierHp, 0, 'Barrier HP depleted to 0');
      assert.strictEqual(boss.bossState.barrierActive, false, 'Barrier marked inactive');
      assert.ok(banners.some((b) => b.title.includes('役員バリア破壊')), 'Barrier destroyed banner dispatched');

      // Subsequent frontal hit penetrates directly to head
      const headHpBeforeSecondHit = head.hp;
      anyEngine.damageSeg(boss, 0, 0, 50, 0, head.x + 50, head.y, false);

      assert.strictEqual(head.hp, headHpBeforeSecondHit - 50, 'Penetrating hit damages head directly');

      engine.destroy();
    });
  });

  // =========================================================================
  // SUITE 4: SPIRAL WAVE 15 PRESIDENT MINION SUMMON LIMITS
  // =========================================================================
  describe('Suite 4: Spiral Wave 15 President Minion Summon Limits', () => {

    it('T5-SPIR-04.1: President summons phase 1 minions (mail, claim) when HP drops below 75%', () => {
      const { engine, anyEngine, banners } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];
      assert.strictEqual(anyEngine.chains.length, 1);

      // Lower total boss HP to 74% across all segments
      for (const s of boss.segs) s.hp = s.maxHp * 0.74;

      anyEngine.updateChains(0.016);

      // Phase 1 summon: 2 new minion chains spawned
      assert.strictEqual(boss.bossState.minionsSummoned, 1, 'minionsSummoned transitioned to 1');
      assert.strictEqual(anyEngine.chains.length, 3, '2 minion chains added (total 3)');
      assert.ok(anyEngine.chains.some((c: any) => c.kind === 'mail'));
      assert.ok(anyEngine.chains.some((c: any) => c.kind === 'claim'));
      assert.ok(banners.some((b) => b.title.includes('全社朝礼')));

      engine.destroy();
    });

    it('T5-SPIR-04.2: Intermediate HP between 35% and 75% does NOT trigger additional summons', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];

      // Lower to 74% to trigger phase 1
      for (const s of boss.segs) s.hp = s.maxHp * 0.74;
      anyEngine.updateChains(0.016);
      assert.strictEqual(anyEngine.chains.length, 3);

      // Lower to 50%
      for (const s of boss.segs) s.hp = s.maxHp * 0.50;
      anyEngine.updateChains(0.016);
      anyEngine.updateChains(0.016);

      // Still 3 chains
      assert.strictEqual(anyEngine.chains.length, 3, 'No additional chains spawned between 35% and 75%');
      assert.strictEqual(boss.bossState.minionsSummoned, 1);

      engine.destroy();
    });

    it('T5-SPIR-04.3: President summons phase 2 minions (doc, claim) when HP drops below 35%', () => {
      const { engine, anyEngine, banners } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];

      // Trigger phase 1
      for (const s of boss.segs) s.hp = s.maxHp * 0.74;
      anyEngine.updateChains(0.016);
      assert.strictEqual(anyEngine.chains.length, 3);

      // Trigger phase 2 (lower to 34%)
      for (const s of boss.segs) s.hp = s.maxHp * 0.34;
      anyEngine.updateChains(0.016);

      assert.strictEqual(boss.bossState.minionsSummoned, 2, 'minionsSummoned transitioned to 2');
      assert.strictEqual(anyEngine.chains.length, 5, '2 more minion chains added (total 5)');
      assert.ok(anyEngine.chains.some((c: any) => c.kind === 'doc'));
      assert.ok(banners.some((b) => b.title.includes('総力戦')));

      engine.destroy();
    });

    it('T5-SPIR-04.4: Low HP limit (under 10%) enforces absolute summon ceiling', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];

      // Trigger phase 1 and 2
      for (const s of boss.segs) s.hp = s.maxHp * 0.74;
      anyEngine.updateChains(0.016);
      for (const s of boss.segs) s.hp = s.maxHp * 0.34;
      anyEngine.updateChains(0.016);
      assert.strictEqual(anyEngine.chains.length, 5);

      // Drop HP to 5%
      for (const s of boss.segs) s.hp = s.maxHp * 0.05;
      for (let f = 0; f < 30; f++) anyEngine.updateChains(0.016);

      // Exactly 5 chains remain (no extra spawns)
      assert.strictEqual(anyEngine.chains.length, 5, 'Summon count remains strictly capped at 2 phases');

      engine.destroy();
    });

    it('T5-SPIR-04.5: Monotonic phase progression prevents healing exploit from re-summoning', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('president');
      const boss = anyEngine.chains[0];

      // Trigger phase 1 then phase 2
      for (const s of boss.segs) s.hp = s.maxHp * 0.70;
      anyEngine.updateChains(0.016);
      assert.strictEqual(anyEngine.chains.length, 3);
      assert.strictEqual(boss.bossState.minionsSummoned, 1);

      for (const s of boss.segs) s.hp = s.maxHp * 0.30;
      anyEngine.updateChains(0.016);
      assert.strictEqual(anyEngine.chains.length, 5);
      assert.strictEqual(boss.bossState.minionsSummoned, 2);

      // Artificially heal boss back to 95% HP
      for (const s of boss.segs) s.hp = s.maxHp * 0.95;
      anyEngine.updateChains(0.016);

      // Damage back down to 30%
      for (const s of boss.segs) s.hp = s.maxHp * 0.30;
      anyEngine.updateChains(0.016);

      // minionsSummoned remains 2, no additional summons triggered
      assert.strictEqual(anyEngine.chains.length, 5, 'Healed boss cannot re-trigger summon waves');
      assert.strictEqual(boss.bossState.minionsSummoned, 2);

      engine.destroy();
    });
  });

  // =========================================================================
  // SUITE 5: SPIRAL CHAIN SPLIT & MINI-HEAD PROMOTION MECHANICS
  // =========================================================================
  describe('Suite 5: Spiral Chain Split & Mini-Head Promotion Mechanics', () => {

    it('T5-SPIR-05.1: Boss chain with length > 2 promotes 2nd segment to mini-head upon head destruction', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('bossMid');
      const boss = anyEngine.chains[0];
      assert.strictEqual(boss.segs.length, 12, 'bossMid starts with 12 segments');

      const secondSegOldMaxHp = boss.segs[1].maxHp;
      const secondSegOldRadius = boss.segs[1].radius;

      // Kill the head (si = 0)
      anyEngine.killSeg(boss, 0, 0);

      // Boss chain must NOT be removed from chains list
      assert.strictEqual(anyEngine.chains.length, 1, 'Boss chain must survive head destruction');
      assert.strictEqual(boss.segs.length, 11, 'Head removed, length decreased to 11');

      // Promoted mini-head attributes
      const newHead = boss.segs[0];
      assert.strictEqual(newHead.radius, Math.min(18, secondSegOldRadius + 2), 'Radius increased by +2 (clamped to 18)');
      assert.strictEqual(newHead.maxHp, Math.round(secondSegOldMaxHp * 1.6), 'maxHp buffed by 1.6x');
      assert.strictEqual(newHead.hp, newHead.maxHp, 'Mini-head healed to full HP');
      assert.strictEqual(boss.stunT, 1.5, 'Stun duration set to 1.5s');

      engine.destroy();
    });

    it('T5-SPIR-05.2: Boss chain with length = 2 does NOT promote mini-head and triggers full collapse', () => {
      const { engine, anyEngine, banners } = createSpiralEngine();
      anyEngine.spawnChain('bossMid');
      const boss = anyEngine.chains[0];

      // Trim chain so only 2 segments remain
      boss.segs = boss.segs.slice(0, 2);
      assert.strictEqual(boss.segs.length, 2);

      // Kill the head
      anyEngine.killSeg(boss, 0, 0);

      // When segs.length <= 2, entire chain collapses!
      assert.strictEqual(anyEngine.chains.length, 0, 'Boss chain collapses completely when length is 2');
      assert.strictEqual(anyEngine.chainsKilled, 1, 'chainsKilled incremented');
      assert.ok(anyEngine.coins >= 50, 'Boss defeat coin bounty awarded');
      assert.ok(banners.some((b) => b.title.includes('大物完全撃破')), 'Boss defeat banner dispatched');

      engine.destroy();
    });

    it('T5-SPIR-05.3: Boss chain with length = 1 collapses immediately upon head destruction', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('bossMid');
      const boss = anyEngine.chains[0];

      // Trim chain so only 1 segment remains
      boss.segs = [boss.segs[0]];
      assert.strictEqual(boss.segs.length, 1);

      // Kill the lone head
      anyEngine.killSeg(boss, 0, 0);

      assert.strictEqual(anyEngine.chains.length, 0, 'Single segment boss chain collapses completely');
      assert.strictEqual(anyEngine.chainsKilled, 1);

      engine.destroy();
    });

    it('T5-SPIR-05.4: Non-boss chain collapses entirely regardless of segment count when head is killed', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('mail');
      const chain = anyEngine.chains[0];
      assert.strictEqual(chain.boss, false);
      assert.ok(chain.segs.length > 2, 'Non-boss chain has multiple segments');

      // Kill non-boss head
      anyEngine.killSeg(chain, 0, 0);

      // Instantly collapses whole chain
      assert.strictEqual(anyEngine.chains.length, 0, 'Non-boss chain must collapse instantly');

      engine.destroy();
    });

    it('T5-SPIR-05.5: Body segment destruction (si > 0) removes only targeted segment without disturbing head', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('bossMid');
      const boss = anyEngine.chains[0];
      const initialLength = boss.segs.length;
      const head = boss.segs[0];
      const initialHeadHp = head.hp;

      // Destroy body segment at index 3. The trailing half becomes a split chain,
      // so count segments across both chains rather than expecting one flat array.
      anyEngine.killSeg(boss, 0, 3);

      const totalSegments = anyEngine.chains.reduce(
        (sum: number, chain: { segs: unknown[] }) => sum + chain.segs.length,
        0,
      );
      assert.strictEqual(totalSegments, initialLength - 1, 'Exactly one targeted segment was removed');
      assert.strictEqual(boss.segs[0], head, 'Head segment remains untouched');
      assert.strictEqual(boss.segs[0].hp, initialHeadHp, 'Head HP remains intact');
      assert.ok(anyEngine.chains.length >= 2, 'Trailing half is preserved as a split chain');

      engine.destroy();
    });

    it('T5-SPIR-05.6: distant coins and heal packs are pulled into the fixed center player', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.chains = [];
      anyEngine.coinPs = [
        { x: 8, y: 8, vx: 0, vy: 0, val: 5 },
        { x: 632, y: 632, vx: 0, vy: 0, val: 7 },
        { x: 16, y: 600, vx: 0, vy: 0, val: -20 },
      ];
      anyEngine.px = 320;
      anyEngine.py = 320;
      anyEngine.hp = 50;
      anyEngine.maxHp = 100;
      anyEngine.shield = 0;
      anyEngine.maxShield = 100;

      for (let frame = 0; frame < 240; frame++) anyEngine.updateCoins(1 / 60);

      assert.strictEqual(anyEngine.coinPs.length, 0, 'All distant drops are collected');
      assert.strictEqual(anyEngine.coins, 12, 'Both coin drops were credited');
      assert.strictEqual(anyEngine.hp, 70, 'Distant heal pack restored HP');
      engine.destroy();
    });

    it('T5-SPIR-05.7: chests remain collectible when their host chain breaks', () => {
      const { engine, anyEngine } = createSpiralEngine();
      anyEngine.spawnChain('mail');
      const chain = anyEngine.chains[0];
      const segA = chain.segs[1];
      const segB = chain.segs[2];
      const chest = {
        id: 999,
        chain,
        segA,
        segB,
        x: segA.x,
        y: segA.y,
        spin: 0,
        openT: 0,
        taken: false,
        free: false,
      };
      anyEngine.chests = [chest];
      const distanceBefore = Math.hypot(chest.x - 320, chest.y - 320);

      chain.segs.splice(1, 2);
      for (let frame = 0; frame < 20; frame++) anyEngine.updateChests(1 / 60);

      assert.strictEqual(chest.free, true, 'Detached chest is marked free');
      assert.ok(Math.hypot(chest.x - 320, chest.y - 320) < distanceBefore, 'Chest drifts toward the core');

      for (let frame = 0; frame < 120; frame++) anyEngine.updateChests(1 / 60);
      assert.strictEqual(chest.taken, true, 'Chest auto-opens upon reaching the center core');
      assert.ok(anyEngine.score >= 200, 'Opening detached chest awards chest score and upgrade');
      engine.destroy();
    });
  });

  // =========================================================================
  // SUITE 6: SPIRAL CANVAS2D VECTOR RENDERER PERFORMANCE & ZERO EMOJIS
  // =========================================================================
  describe('Suite 6: Spiral Canvas2D Vector Renderer Performance & Zero Emojis', () => {

    it('T5-SPIR-06.1: High-concurrency rendering stress (50+ segments, 20+ orbitals, 100+ lasers)', () => {
      const canvas = createMockCanvas(1280, 720);
      const ctx = canvas.getContext('2d')!;

      // Render dense frame
      assert.doesNotThrow(() => {
        // 1. Core
        drawVectorCore(ctx, 640, 360, 24, 0.85, 0.5, 1.2);

        // 2. 60 chain segments with varied roles and options
        for (let i = 0; i < 60; i++) {
          const kind = i % 4 === 0 ? 'senmu' : i % 3 === 0 ? 'claim' : i % 2 === 0 ? 'doc' : 'mail';
          drawVectorSegment(ctx, 100 + (i % 10) * 100, 100 + Math.floor(i / 10) * 80, 16, kind, i === 0, 0.7, undefined, {
            enraged: i % 5 === 0,
            stunned: i % 7 === 0,
            time: i * 0.1,
          });
        }

        // 3. 24 orbitals
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          drawVectorOrbital(ctx, 640 + Math.cos(a) * 120, 360 + Math.sin(a) * 120, a);
        }

        // 4. 120 additive blend lasers and projectiles
        for (let i = 0; i < 120; i++) {
          const a = (i / 120) * Math.PI * 2;
          drawVectorLaser(ctx, 640, 360, 640 + Math.cos(a) * 400, 360 + Math.sin(a) * 400, 4, '#38bdf8', 0.9);
          drawVectorProjectile(ctx, 640 + Math.cos(a) * 200, 360 + Math.sin(a) * 200, Math.cos(a) * 300, Math.sin(a) * 300, i % 2 === 0, 1.0);
        }

        // 5. Boss Executive Barrier
        drawVectorExecutiveBarrier(ctx, 640, 360, 30, 0.5, Math.PI * 0.65, 0.8, 1.0);
      }, 'High concurrency vector rendering must execute without errors');
    });

    it('T5-SPIR-06.2: Frame budget benchmark executes 60 high-density frames under sub-16ms budget', () => {
      const canvas = createMockCanvas(1280, 720);
      const ctx = canvas.getContext('2d')!;

      const frameCount = 60;
      const t0 = performance.now();

      for (let f = 0; f < frameCount; f++) {
        const time = f * 0.016;
        drawVectorCore(ctx, 640, 360, 24, 0.85, 0.5, time);

        for (let i = 0; i < 50; i++) {
          drawVectorSegment(ctx, 200 + (i % 10) * 80, 150 + Math.floor(i / 10) * 80, 16, 'mail', false, 0.7);
        }

        for (let i = 0; i < 20; i++) {
          drawVectorOrbital(ctx, 640 + Math.cos(time + i) * 100, 360 + Math.sin(time + i) * 100, time);
        }

        for (let i = 0; i < 100; i++) {
          drawVectorProjectile(ctx, 640 + (i - 50) * 5, 360, 100, 0, false, time);
        }

        drawVectorExecutiveBarrier(ctx, 640, 360, 28, 0, Math.PI * 0.65, 0.8, time);
      }

      const t1 = performance.now();
      const avgFrameMs = (t1 - t0) / frameCount;

      assert.ok(
        avgFrameMs < 16.0,
        `Vector rendering frame time must be under 16ms, got ${avgFrameMs.toFixed(3)}ms`
      );
    });

    it('T5-SPIR-06.3: Strict zero-emoji compliance audit across Canvas2D render calls', () => {
      const canvas = createMockCanvas(1280, 720);
      const ctx = canvas.getContext('2d')!;

      // Intercept fillText and strokeText to capture all rendered text strings
      const renderedStrings: string[] = [];
      const origFillText = ctx.fillText;
      const origStrokeText = ctx.strokeText;
      ctx.fillText = (text: string, ...args: any[]) => {
        renderedStrings.push(String(text));
        origFillText.call(ctx, text, ...(args as [number, number]));
      };
      ctx.strokeText = (text: string, ...args: any[]) => {
        renderedStrings.push(String(text));
        origStrokeText.call(ctx, text, ...(args as [number, number]));
      };

      // Perform a full scene render
      drawVectorCore(ctx, 640, 360, 24, 1.0, 1.0, 0);
      drawVectorSegment(ctx, 600, 300, 16, 'president', true, 1.0);
      drawVectorSegment(ctx, 600, 320, 16, 'claim', false, 1.0);
      drawVectorOrbital(ctx, 640, 300, 0);
      drawVectorExecutiveBarrier(ctx, 640, 360, 28, 0, Math.PI * 0.65, 1.0, 0);

      // Emoji regex: checks for Unicode emoji ranges
      const emojiRegex = new RegExp('[\\u{1F300}-\\u{1F6FF}\\u{1F900}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]', 'u');

      for (const str of renderedStrings) {
        assert.ok(!emojiRegex.test(str), `Rendered string "${str}" must not contain emojis`);
      }
    });
  });
});
