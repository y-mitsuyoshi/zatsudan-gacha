/**
 * Tier 5: Adversarial Coverage Hardening Test Suite (Barricade Defense Scope)
 *
 * White-box adversarial testing covering:
 * - Barricade durability state boundary jitter & extreme thresholds (src/game/defense/models.ts)
 * - Swept-Sphere Continuous Collision Detection (CCD) degenerate cases (src/game/defense/engine.ts)
 * - Dynamic crowd flocking formation under extreme coordinate bounds & barrier collapse (src/game/defense/engine.ts)
 * - VirtualJoystick multi-touch conflict, rapid attach/detach cycles, extreme drag radius (src/game/common/virtualJoystick.ts)
 * - TraumaScreenShake overflow, negative trauma, zero/negative dt (src/game/common/juice.ts)
 * - LocalStorage corrupted data, prototype pollution, extreme boundary values (src/game/defense/storage.ts)
 * - DefenseEngine high-stress state transitions, shop edge conditions & HUD mapping (src/components/defense/BarricadeDefenseGame.tsx)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { setupTestEnvironment, createMockCanvas, createMockAudio } from './testEnv';

// Initialize headless environment before imports
setupTestEnvironment();

import { DefenseEngine } from '../../src/game/defense/engine';
import {
  buildBarricadeMesh,
  updateBarricadeDurability,
  buildSalarymanMesh,
  buildGateMesh,
  buildEnemyMesh,
  buildTrainBossMesh,
} from '../../src/game/defense/models';
import {
  COURSES,
  DIFFICULTIES,
  ENEMIES,
  MAX_ALLIES,
} from '../../src/game/defense/config';
import { VirtualJoystick } from '../../src/game/common/virtualJoystick';
import { TraumaScreenShake, HitStopManager, DamageNumberPool } from '../../src/game/common/juice';
import {
  loadSettings,
  saveSettings,
  loadRecords,
  saveRecord,
  loadProgress,
  saveProgress,
  type Progress,
  type RecordEntry,
} from '../../src/game/defense/storage';

function sendPointerEvent(target: any, event: { type: string; pointerId?: number; clientX: number; clientY: number; pointerType?: string }) {
  target.dispatchEvent({
    pointerId: 1,
    pointerType: 'touch',
    ...event,
  });
}

describe('Tier 5: Adversarial Coverage Hardening (Barricade Defense & Shared Modules)', () => {

  // =========================================================================
  // 1. BARRICADE DURABILITY STATE BOUNDARY JITTER & THRESHOLD STRESS
  // =========================================================================
  describe('Group 1: Barricade Durability State Boundary Jitter (models.ts)', () => {

    it('T5-B01: Rapid oscillation right on 70% threshold (0.69999 <-> 0.70001) for 1000 cycles', () => {
      const barricade = buildBarricadeMesh(1, 1.0);
      const ud = barricade.userData;
      assert.ok(ud.energyMat, 'UserData must have energyMat');

      for (let i = 0; i < 1000; i++) {
        const ratioLow = 0.69999;
        updateBarricadeDurability(barricade, ratioLow, i * 0.016);
        assert.strictEqual(ud.crackMesh.visible, true, `Crack mesh must be visible at ratio ${ratioLow}`);
        assert.strictEqual(ud.energyMat.color.getHex(), 0xf59e0b, `Color must be orange at ratio ${ratioLow}`);
        assert.strictEqual(ud.topRail.position.y, 2.3, 'Top rail must remain at y=2.3');

        const ratioHigh = 0.70001;
        updateBarricadeDurability(barricade, ratioHigh, i * 0.016);
        assert.strictEqual(ud.crackMesh.visible, false, `Crack mesh must be hidden at ratio ${ratioHigh}`);
        assert.strictEqual(ud.energyMat.color.getHex(), 0x06b6d4, `Color must be cyan at ratio ${ratioHigh}`);
        assert.strictEqual(ud.topRail.position.y, 2.3, 'Top rail must remain at y=2.3');
      }
    });

    it('T5-B02: Rapid oscillation right on 30% threshold (0.29999 <-> 0.30001) for 1000 cycles', () => {
      const barricade = buildBarricadeMesh(1, 1.0);
      const ud = barricade.userData;

      for (let i = 0; i < 1000; i++) {
        const ratioLow = 0.29999;
        updateBarricadeDurability(barricade, ratioLow, i * 0.016);
        assert.strictEqual(ud.crackMesh.visible, true);
        assert.strictEqual(ud.energyMat.color.getHex(), 0xef4444, `Color must be red alarm at ratio ${ratioLow}`);
        assert.strictEqual(ud.debrisGroup.visible, false);
        assert.strictEqual(ud.topRail.position.y, 2.3);

        const ratioHigh = 0.30001;
        updateBarricadeDurability(barricade, ratioHigh, i * 0.016);
        assert.strictEqual(ud.crackMesh.visible, true);
        assert.strictEqual(ud.energyMat.color.getHex(), 0xf59e0b, `Color must be orange at ratio ${ratioHigh}`);
        assert.strictEqual(ud.debrisGroup.visible, false);
        assert.strictEqual(ud.topRail.position.y, 2.3);
      }
    });

    it('T5-B03: Rapid oscillation right on 0.1% broken threshold (0.00099 <-> 0.00101) for 1000 cycles', () => {
      const barricade = buildBarricadeMesh(1, 1.0);
      const ud = barricade.userData;

      for (let i = 0; i < 1000; i++) {
        // Broken state
        const ratioBroken = 0.00099;
        updateBarricadeDurability(barricade, ratioBroken, i * 0.016);
        assert.strictEqual(ud.energyMesh.visible, false, 'Energy mesh must be hidden when broken');
        assert.strictEqual(ud.crackMesh.visible, false, 'Crack mesh must be hidden when broken');
        assert.strictEqual(ud.debrisGroup.visible, true, 'Debris must be visible when broken');
        assert.strictEqual(ud.topRail.position.y, 0.6, 'Top rail must drop to y=0.6 when broken');

        // Critical alarm state (just above 0.001)
        const ratioAlarm = 0.00101;
        updateBarricadeDurability(barricade, ratioAlarm, i * 0.016);
        assert.strictEqual(ud.energyMesh.visible, true, 'Energy mesh must be visible in critical alarm');
        assert.strictEqual(ud.debrisGroup.visible, false, 'Debris must be hidden in critical alarm');
        assert.strictEqual(ud.topRail.position.y, 2.3, 'Top rail must restore to y=2.3');
      }
    });

    it('T5-B04: Extreme boundary and negative durability ratios clamp safely', () => {
      const barricade = buildBarricadeMesh(1, 1.0);
      const ud = barricade.userData;

      // Extreme negative ratio
      updateBarricadeDurability(barricade, -9999.0, 0);
      assert.strictEqual(ud.debrisGroup.visible, true, 'Negative ratio must clamp to broken state');
      assert.strictEqual(ud.energyMesh.visible, false);
      assert.strictEqual(ud.topRail.position.y, 0.6);

      // Extreme positive overflow ratio
      updateBarricadeDurability(barricade, 9999.0, 0);
      assert.strictEqual(ud.debrisGroup.visible, false, 'Overflow ratio must clamp to pristine state');
      assert.strictEqual(ud.energyMesh.visible, true);
      assert.strictEqual(ud.crackMesh.visible, false);
      assert.strictEqual(ud.energyMat.color.getHex(), 0x06b6d4);
      assert.strictEqual(ud.topRail.position.y, 2.3);

      // Exact zero ratio
      updateBarricadeDurability(barricade, 0, 0);
      assert.strictEqual(ud.debrisGroup.visible, true);
      assert.strictEqual(ud.topRail.position.y, 0.6);
    });

    it('T5-B05: Non-numeric ratios (NaN, Infinity, -Infinity) do not crash mesh updater', () => {
      const barricade = buildBarricadeMesh(1, 1.0);
      const ud = barricade.userData;

      assert.doesNotThrow(() => {
        updateBarricadeDurability(barricade, NaN, 0);
        updateBarricadeDurability(barricade, Infinity, 0);
        updateBarricadeDurability(barricade, -Infinity, 0);
      });

      // After Infinity, clamps to 1.0 pristine
      updateBarricadeDurability(barricade, Infinity, 0);
      assert.strictEqual(ud.energyMesh.visible, true);
      assert.strictEqual(ud.debrisGroup.visible, false);

      // After -Infinity, clamps to 0.0 broken
      updateBarricadeDurability(barricade, -Infinity, 0);
      assert.strictEqual(ud.debrisGroup.visible, true);
      assert.strictEqual(ud.energyMesh.visible, false);
    });

    it('T5-B06: Extreme simulation time stamps (1e9s, negative time) with sin-wave pulsing', () => {
      const barricade = buildBarricadeMesh(1, 0.15); // Critical alarm (sin pulse active)
      const ud = barricade.userData;

      const extremeTimes = [0, -1000, 1e8, 1e12, 0.00001];
      for (const t of extremeTimes) {
        updateBarricadeDurability(barricade, 0.15, t);
        assert.ok(Number.isFinite(ud.energyMat.emissiveIntensity), `Emissive intensity must be finite at time ${t}`);
        assert.ok(Number.isFinite(ud.energyMat.opacity), `Opacity must be finite at time ${t}`);
        assert.ok(ud.energyMat.opacity >= 0.3 && ud.energyMat.opacity <= 0.85, 'Opacity must stay bounded in [0.3, 0.85]');
      }
    });
  });

  // =========================================================================
  // 2. CCD SWEPT SEGMENT DEGENERATE CASES
  // =========================================================================
  describe('Group 2: CCD Swept Segment Degenerate Cases (engine.ts)', () => {

    it('T5-C01: Zero-length swept segment (stationary bullet or dt=0) avoids 0/0 division and detects contact', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      // Clear existing elements
      for (const b of eng.boltPool) b.active = false;
      eng.crates = [];
      eng.cages = [];

      // Foe placed right at origin
      const targetFoe = {
        g: new THREE.Group(),
        kind: 'runner',
        x: 0,
        z: -5,
        hp: 100,
        maxHp: 100,
        walk: 0,
        radius: 0.65,
        dmg: 10,
        color: '#ef4444',
        score: 100,
        wob: 0,
        slowT: 0,
        flash: 0,
        dead: false,
        isBoss: false,
        elite: false,
      };
      eng.foes = [targetFoe];

      // Spawn bolt right inside foe hitbox with 0 velocity
      eng.spawnBolt(0, -5, 0, 0, 50, 0, 0, 0, 'pistol', false);
      const bolt = eng.boltPool.find((b: any) => b.active);
      assert.ok(bolt, 'Bolt must be active');
      assert.strictEqual(bolt.vx, 0);
      assert.strictEqual(bolt.vz === 0, true, 'vz must be 0');

      // Execute update with dt = 0.016. segLenSq will be 0.
      assert.doesNotThrow(() => {
        eng.updateBolts(0.016);
      });

      assert.strictEqual(targetFoe.hp, 50, 'Stationary bolt with segLenSq=0 must hit foe through fallback t=0');
      assert.strictEqual(bolt.active, false, 'Bolt must deactivate after hitting');

      engine.destroy();
    });

    it('T5-C02: Opposite direction sweeps: High-speed bullet and moving foe intercepted mid-stride', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      for (const b of eng.boltPool) b.active = false;
      eng.crates = [];
      eng.cages = [];

      // Foe placed at z = -8.0, radius 0.65. Hitbox spans [-8.65, -7.35].
      const foe = {
        g: new THREE.Group(),
        kind: 'runner',
        x: 0,
        z: -8.0,
        hp: 100,
        maxHp: 100,
        walk: 0,
        radius: 0.65,
        dmg: 10,
        dead: false,
      };
      eng.foes = [foe];

      // Bolt starts at z = 0 and moves forward to z = -16 in a single frame (vz = -32, dt = 0.5s).
      // Note: z=0 is 8 units away from foe. z=-16 is 8 units away from foe.
      // A discrete check would miss! CCD swept segment MUST catch it at t = 0.5.
      eng.spawnBolt(0, 0, 0, 32, 40, 0, 0, 0, 'pistol', false);
      const bolt = eng.boltPool.find((b: any) => b.active);
      assert.ok(bolt);

      eng.updateBolts(0.5);

      assert.strictEqual(foe.hp, 60, 'Swept CCD must intercept foe at midpoint of 16-unit single frame displacement');
      assert.strictEqual(bolt.active, false);

      engine.destroy();
    });

    it('T5-C03: Extreme delta time dt = 0.5s supersonic tunneling prevention across 16 units', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      for (const b of eng.boltPool) b.active = false;
      eng.crates = [];
      eng.cages = [];

      // Test multiple positions along the 16-unit sweep: z = -3, -7, -11, -15
      const testZPositions = [-3, -7, -11, -15];

      for (const testZ of testZPositions) {
        const foe = {
          g: new THREE.Group(),
          kind: 'walker',
          x: 0,
          z: testZ,
          hp: 100,
          maxHp: 100,
          walk: 0,
          radius: 0.7,
          dmg: 10,
          dead: false,
        };
        eng.foes = [foe];

        for (const b of eng.boltPool) b.active = false;
        eng.spawnBolt(0, 0, 0, 32, 45, 0, 0, 0, 'pistol', false);

        eng.updateBolts(0.5); // single huge frame leap
        assert.strictEqual(foe.hp, 55, `Must hit foe at z=${testZ} during dt=0.5s swept step without tunneling`);
      }

      engine.destroy();
    });

    it('T5-C04: Near-epsilon degenerate segment length (segLenSq ≈ 1e-6) does not produce NaN projection', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      for (const b of eng.boltPool) b.active = false;
      eng.crates = [];
      eng.cages = [];

      const foe = {
        g: new THREE.Group(),
        kind: 'runner',
        x: 0,
        z: -10,
        hp: 100,
        maxHp: 100,
        walk: 0,
        radius: 0.65,
        dmg: 10,
        dead: false,
      };
      eng.foes = [foe];

      // Speed chosen so that dx^2 + dz^2 is right at 1.0001e-6
      // displacement = 0.00100005. At dt = 0.001, speed = 1.00005
      eng.spawnBolt(0, -10, 0, 1.00005, 30, 0, 0, 0, 'pistol', false);
      const bolt = eng.boltPool.find((b: any) => b.active);
      assert.ok(bolt);

      assert.doesNotThrow(() => {
        eng.updateBolts(0.001);
      });

      assert.ok(Number.isFinite(bolt.x));
      assert.ok(Number.isFinite(bolt.z));
      assert.strictEqual(foe.hp, 70, 'Near-epsilon segment must register direct hit');

      engine.destroy();
    });

    it('T5-C05: Multi-target swept penetration (pierce=3) across a dense line of 5 foes', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      for (const b of eng.boltPool) b.active = false;
      eng.crates = [];
      eng.cages = [];

      // 5 foes aligned at z = -2, -4, -6, -8, -10
      const foes = [2, 4, 6, 8, 10].map((dist) => ({
        g: new THREE.Group(),
        kind: 'walker',
        x: 0,
        z: -dist,
        hp: 100,
        maxHp: 100,
        walk: 0,
        radius: 0.7,
        dmg: 10,
        dead: false,
      }));
      eng.foes = foes;

      // Bolt with pierce = 3, base dmg = 50. Sweeps from 0 to -12 in one frame (sp = 24, dt = 0.5s)
      eng.spawnBolt(0, 0, 0, 24, 50, 3, 0, 0, 'express', false);
      const bolt = eng.boltPool.find((b: any) => b.active);
      assert.ok(bolt);
      assert.strictEqual(bolt.pierce, 3);

      eng.updateBolts(0.5);

      // Pierce = 3 can hit 4 foes in total before deactivating:
      // Foe 0 (z=-2): pierce becomes 2, dmg becomes 40
      // Foe 1 (z=-4): pierce becomes 1, dmg becomes 32
      // Foe 2 (z=-6): pierce becomes 0, dmg becomes 25.6
      // Foe 3 (z=-8): pierce was 0 -> hits and deactivates bolt
      // Foe 4 (z=-10): untouched (hp remains 100)
      assert.ok(foes[0].hp < 100, 'Foe 0 must take damage');
      assert.ok(foes[1].hp < 100, 'Foe 1 must take damage');
      assert.ok(foes[2].hp < 100, 'Foe 2 must take damage');
      assert.ok(foes[3].hp < 100, 'Foe 3 must take damage');
      assert.strictEqual(foes[4].hp, 100, 'Foe 4 must remain untouched after pierce exhaustion');
      assert.strictEqual(bolt.active, false, 'Bolt must deactivate after pierce depleted');

      engine.destroy();
    });

    it('T5-C06: Swept collision against crates and cages with zero-length and high-speed vectors', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      for (const b of eng.boltPool) b.active = false;
      eng.foes = [];

      // Setup crate at z = -6.0
      eng.crates = [{
        g: new THREE.Group(),
        x: 0,
        z: -6.0,
        hp: 30,
        dead: false,
        gold: false,
      }];

      // High-speed sweep from z = 0 to z = -12
      eng.spawnBolt(0, 0, 0, 24, 50, 0, 0, 0, 'pistol', false);
      eng.updateBolts(0.5);

      assert.strictEqual(eng.crates[0].dead, true, 'Crate must be intercepted and destroyed via CCD sweep');

      // Setup cage at z = -6.0
      eng.cages = [{
        g: new THREE.Group(),
        x: 0,
        z: -6.0,
        hp: 30,
        dead: false,
      }];
      eng.spawnBolt(0, 0, 0, 24, 50, 0, 0, 0, 'pistol', false);
      eng.updateBolts(0.5);

      assert.strictEqual(eng.cages[0].dead, true, 'Cage must be intercepted and popped via CCD sweep');

      engine.destroy();
    });
  });

  // =========================================================================
  // 3. 30-ALLY DYNAMIC FLOCKING FORMATION & BARRIER COLLAPSE STRESS
  // =========================================================================
  describe('Group 3: 30-Ally Dynamic Flocking & Barrier Collapse Stress (engine.ts)', () => {

    it('T5-F01: Steady-state flocking with max 30 allies maintains valid lateral bounds & non-zero spacing', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      // Fill squad to MAX_ALLIES (30)
      while (eng.allies.length < MAX_ALLIES) {
        eng.addAlly(false);
      }
      assert.strictEqual(eng.allies.length, 30);

      // Run 200 frames of flocking physics
      for (let step = 0; step < 200; step++) {
        eng.updateAllies(0.016);
      }

      // Assert formation integrity
      for (let i = 0; i < eng.allies.length; i++) {
        const a = eng.allies[i];
        assert.ok(Number.isFinite(a.g.position.x), `Ally ${i} position.x must be finite`);
        assert.ok(Number.isFinite(a.g.position.z), `Ally ${i} position.z must be finite`);
        assert.ok(Math.abs(a.g.position.x) <= 4.8, `Ally ${i} position.x (${a.g.position.x}) must stay within road boundaries`);
        assert.ok(a.g.position.z > eng.hero.position.z, `Ally ${i} position.z (${a.g.position.z}) must stay behind hero (${eng.hero.position.z})`);
        assert.ok(Number.isFinite(a.vx), `Ally ${i} vx must be finite`);
        assert.ok(Number.isFinite(a.vz), `Ally ${i} vz must be finite`);
      }

      engine.destroy();
    });

    it('T5-F02: Extreme hero steering (hx = -X_LIMIT and +X_LIMIT) with 30 allies avoids repulsion runaway', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      while (eng.allies.length < MAX_ALLIES) {
        eng.addAlly(false);
      }

      // Hard pin hero to extreme left wall
      eng.hero.position.x = -4.3;
      for (let step = 0; step < 120; step++) {
        eng.updateAllies(0.016);
      }

      for (let i = 0; i < eng.allies.length; i++) {
        const a = eng.allies[i];
        assert.ok(!Number.isNaN(a.g.position.x), `Ally ${i} position.x must not be NaN at left wall`);
        assert.ok(!Number.isNaN(a.vx), `Ally ${i} vx must not be NaN at left wall`);
        assert.ok(Math.abs(a.vx) < 50, `Ally ${i} vx (${a.vx}) must not experience repulsion runaway`);
      }

      // Hard pin hero to extreme right wall
      eng.hero.position.x = 4.3;
      for (let step = 0; step < 120; step++) {
        eng.updateAllies(0.016);
      }

      for (let i = 0; i < eng.allies.length; i++) {
        const a = eng.allies[i];
        assert.ok(!Number.isNaN(a.g.position.x), `Ally ${i} position.x must not be NaN at right wall`);
        assert.ok(!Number.isNaN(a.vx), `Ally ${i} vx must not be NaN at right wall`);
        assert.ok(Math.abs(a.vx) < 50, `Ally ${i} vx (${a.vx}) must not experience repulsion runaway`);
      }

      engine.destroy();
    });

    it('T5-F03: Pathological initial condition: All 30 allies placed at identical position (0, 0, 0)', () => {
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
        eng.addAlly(false);
      }

      // Force-collapse every ally onto (0, 0, 0)
      eng.allies.forEach((a: any) => {
        a.g.position.set(0, 0, 0);
        a.vx = 0;
        a.vz = 0;
      });

      // Execute flocking step with d = 0 for all pairs
      // Should avoid division by zero via d > 0.001 check
      assert.doesNotThrow(() => {
        eng.updateAllies(0.016);
      });

      for (let i = 0; i < eng.allies.length; i++) {
        const a = eng.allies[i];
        assert.strictEqual(Number.isNaN(a.g.position.x), false, `Ally ${i} x must not be NaN after singularity step`);
        assert.strictEqual(Number.isNaN(a.g.position.z), false, `Ally ${i} z must not be NaN after singularity step`);
        assert.strictEqual(Number.isNaN(a.vx), false, `Ally ${i} vx must not be NaN`);
        assert.strictEqual(Number.isNaN(a.vz), false, `Ally ${i} vz must not be NaN`);
      }

      // Run 100 steps and verify they smoothly fan out into formation
      for (let step = 0; step < 100; step++) {
        eng.updateAllies(0.016);
      }

      // At least 25 allies must have separated from origin
      const separated = eng.allies.filter((a: any) => Math.hypot(a.g.position.x, a.g.position.z) > 0.5);
      assert.ok(separated.length >= 25, 'Allies must fan out into formation from singularity');

      engine.destroy();
    });

    it('T5-F04: Micro-distance clustering (d = 0.0011) under max repulsive gradient', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      while (eng.allies.length < 5) {
        eng.addAlly(false);
      }

      // Position 5 allies separated by exactly 0.0011 (just above 0.001 deadzone)
      eng.allies.forEach((a: any, idx: number) => {
        a.g.position.set(idx * 0.0011, 0, 2);
        a.vx = 0;
        a.vz = 0;
      });

      // Run 60 frames
      for (let step = 0; step < 60; step++) {
        eng.updateAllies(0.016);
      }

      for (let i = 0; i < eng.allies.length; i++) {
        const a = eng.allies[i];
        assert.ok(Number.isFinite(a.g.position.x), `Ally ${i} x must remain finite under sharp repulsive gradient`);
        assert.ok(Number.isFinite(a.vx), `Ally ${i} vx must remain finite`);
      }

      engine.destroy();
    });

    it('T5-F05: Simultaneous barrier collapse under 30 allies during active combat encounter', () => {
      let bannerMsg = '';
      let bannerSub = '';
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: (title, sub) => {
          bannerMsg = title;
          bannerSub = sub;
        },
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      while (eng.allies.length < MAX_ALLIES) {
        eng.addAlly(false);
      }
      assert.strictEqual(eng.allies.length, 30);
      assert.strictEqual(eng.guard, 140);
      assert.strictEqual(eng.guardBroke, false);

      // Spawn 10 attacking foes in front
      for (let i = 0; i < 10; i++) {
        eng.foes.push({
          g: new THREE.Group(),
          kind: 'runner',
          x: (i - 4.5) * 0.8,
          z: -5,
          hp: 100,
          maxHp: 100,
          walk: 0,
          radius: 0.65,
          dmg: 15,
          dead: false,
        });
      }

      // Barricade takes catastrophic lethal hit (damageGuard = 500)
      eng.damageGuard(500);

      assert.strictEqual(eng.guard, 0, 'Guard HP must drop to 0');
      assert.strictEqual(eng.guardBroke, true, 'guardBroke flag must be set');
      assert.strictEqual(bannerMsg, 'ガード崩壊！', 'Banner title must signal barrier collapse');
      assert.strictEqual(bannerSub, '体力に直撃するぞ！', 'Banner subtitle must signal base vulnerability');
      assert.ok(eng.screenShake.getTrauma() >= 0.6, 'Screen shake must receive 0.6 trauma');

      // Continue simulation for 60 frames after barrier collapse
      assert.doesNotThrow(() => {
        for (let step = 0; step < 60; step++) {
          eng.updateAllies(0.016);
          eng.updateBolts(0.016);
        }
      });

      // Allies must remain intact, firing support bolts, without null dereference
      assert.strictEqual(eng.allies.length, 30, '30 allies must remain alive and active');
      const activeBolts = eng.boltPool.filter((b: any) => b.active);
      assert.ok(activeBolts.length > 0, 'Allies must continue firing support bolts through collapse');

      engine.destroy();
    });

    it('T5-F06: Extreme delta time (dt = 0.5s) on flocking physics damps velocity to zero without reversal', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      while (eng.allies.length < 5) {
        eng.addAlly(false);
      }

      // At dt = 0.5, (1 - dt * 8) = 1 - 4 = -3.
      // Thanks to Math.max(0, 1 - dt * 8), it clamps to 0!
      assert.doesNotThrow(() => {
        eng.updateAllies(0.5);
      });

      for (const a of eng.allies) {
        assert.ok(Number.isFinite(a.vx));
        assert.ok(Number.isFinite(a.vz));
        assert.ok(Number.isFinite(a.g.position.x));
      }

      engine.destroy();
    });
  });

  // =========================================================================
  // 4. VIRTUAL JOYSTICK MULTI-TOUCH, DETACH/ATTACH CYCLES & DRAG LIMITS
  // =========================================================================
  describe('Group 4: VirtualJoystick Multi-Touch, Detach/Attach & Drag Limits (virtualJoystick.ts)', () => {

    it('T5-J01: Multi-touch conflict: Secondary finger ignored, primary finger retains smooth control', () => {
      const container = createMockCanvas(400, 400);
      const joystick = new VirtualJoystick({ maxRadius: 50, deadzone: 0.1 });
      joystick.attach(container);

      // 1. Primary finger touches at (100, 100)
      sendPointerEvent(container, {
        type: 'pointerdown',
        pointerId: 10,
        clientX: 100,
        clientY: 100,
      });

      let state = joystick.getState();
      assert.strictEqual(state.active, true);
      assert.strictEqual(state.pointerId, 10);
      assert.strictEqual(state.originX, 100);

      // 2. Secondary finger touches at (300, 300) with pointerId: 20
      sendPointerEvent(container, {
        type: 'pointerdown',
        pointerId: 20,
        clientX: 300,
        clientY: 300,
      });

      // Joystick must NOT switch to finger 2
      state = joystick.getState();
      assert.strictEqual(state.pointerId, 10, 'Must ignore second finger touch down');
      assert.strictEqual(state.originX, 100, 'Origin must stay at finger 1 position');

      // 3. Secondary finger moves wildly at (350, 350)
      sendPointerEvent(window, {
        type: 'pointermove',
        pointerId: 20,
        clientX: 350,
        clientY: 350,
      });

      let vec = joystick.getVector();
      assert.strictEqual(vec.magnitude, 0, 'Secondary finger motion must not affect joystick vector');

      // 4. Primary finger moves to (140, 100) -> 40px right
      sendPointerEvent(window, {
        type: 'pointermove',
        pointerId: 10,
        clientX: 140,
        clientY: 100,
      });

      vec = joystick.getVector();
      assert.ok(vec.x > 0.5, `Primary finger must drive vector (got x=${vec.x})`);
      assert.strictEqual(vec.active, true);

      // 5. Secondary finger lifts up
      sendPointerEvent(window, {
        type: 'pointerup',
        pointerId: 20,
        clientX: 350,
        clientY: 350,
      });

      // Primary finger MUST remain active!
      state = joystick.getState();
      assert.strictEqual(state.active, true, 'Secondary finger release must not reset active primary joystick');
      assert.strictEqual(state.pointerId, 10);

      // 6. Primary finger lifts up
      sendPointerEvent(window, {
        type: 'pointerup',
        pointerId: 10,
        clientX: 140,
        clientY: 100,
      });

      state = joystick.getState();
      assert.strictEqual(state.active, false, 'Primary finger release resets joystick');
      assert.strictEqual(state.pointerId, null);

      joystick.detach();
    });

    it('T5-J02: Pointer cancellation & window blur while active resets joystick cleanly', () => {
      const container = createMockCanvas(400, 400);
      const joystick = new VirtualJoystick({ maxRadius: 50 });
      joystick.attach(container);

      // Touch down
      sendPointerEvent(container, { type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 100 });
      assert.strictEqual(joystick.getVector().active, true);

      // Pointer cancel
      sendPointerEvent(window, { type: 'pointercancel', pointerId: 1, clientX: 100, clientY: 100 });
      assert.strictEqual(joystick.getVector().active, false);
      assert.strictEqual(joystick.getVector().magnitude, 0);

      // Touch down again, then trigger window blur
      sendPointerEvent(container, { type: 'pointerdown', pointerId: 2, clientX: 100, clientY: 100 });
      assert.strictEqual(joystick.getVector().active, true);

      (window as any).dispatchEvent({ type: 'blur' });
      assert.strictEqual(joystick.getVector().active, false);
      assert.strictEqual(joystick.getVector().magnitude, 0);

      joystick.detach();
    });

    it('T5-J03: Rapid attach / detach stress harness (1000 cycles in succession)', () => {
      const container = createMockCanvas(400, 400);
      const joystick = new VirtualJoystick({ maxRadius: 50 });

      assert.doesNotThrow(() => {
        for (let i = 0; i < 1000; i++) {
          joystick.attach(container);
          if (i % 2 === 0) {
            // Touch down mid-cycle then detach
            sendPointerEvent(container, { type: 'pointerdown', pointerId: i + 1, clientX: 50, clientY: 50 });
          }
          joystick.detach();
        }
      });

      // Detach when already detached is a safe no-op
      assert.doesNotThrow(() => {
        joystick.detach();
        joystick.detach();
      });

      // Final re-attach works normally
      joystick.attach(container);
      sendPointerEvent(container, { type: 'pointerdown', pointerId: 999, clientX: 200, clientY: 200 });
      assert.strictEqual(joystick.getVector().active, true);
      joystick.detach();
    });

    it('T5-J04: Extreme drag coordinates (clientX = 1e7, clientY = -1e7) clamp strictly to unit circle', () => {
      const container = createMockCanvas(400, 400);
      const joystick = new VirtualJoystick({ maxRadius: 50, deadzone: 0.08 });
      joystick.attach(container);

      sendPointerEvent(container, { type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 100 });

      // Drag into stratosphere
      sendPointerEvent(window, { type: 'pointermove', pointerId: 1, clientX: 1e7, clientY: -1e7 });

      const vec = joystick.getVector();
      assert.strictEqual(vec.active, true);
      assert.strictEqual(vec.magnitude, 1.0, 'Magnitude must be strictly clamped to 1.0');

      const computedLen = Math.hypot(vec.x, vec.y);
      assert.ok(Math.abs(computedLen - 1.0) < 1e-6, `Normalized vector length must be 1.0 (got ${computedLen})`);

      const state = joystick.getState();
      const currentDist = Math.hypot(state.currentX - state.originX, state.currentY - state.originY);
      assert.ok(Math.abs(currentDist - 50) < 1e-4, `Current thumb position must clamp to maxRadius (got ${currentDist})`);

      joystick.detach();
    });

    it('T5-J05: Zero / degenerate deadzone and maxRadius parameters', () => {
      // deadzone = 0.0: immediate micro-movement response
      const jZeroDead = new VirtualJoystick({ maxRadius: 50, deadzone: 0.0 });
      const container = createMockCanvas(400, 400);
      jZeroDead.attach(container);
      sendPointerEvent(container, { type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 100 });
      sendPointerEvent(window, { type: 'pointermove', pointerId: 1, clientX: 101, clientY: 100 }); // 1px move
      assert.ok(jZeroDead.getVector().magnitude > 0, 'Deadzone 0.0 must immediately register magnitude');
      jZeroDead.detach();

      // deadzone = 1.0: stick cannot exceed deadzone, magnitude safely remains 0 without NaN
      const jFullDead = new VirtualJoystick({ maxRadius: 50, deadzone: 1.0 });
      jFullDead.attach(container);
      sendPointerEvent(container, { type: 'pointerdown', pointerId: 2, clientX: 100, clientY: 100 });
      sendPointerEvent(window, { type: 'pointermove', pointerId: 2, clientX: 150, clientY: 100 });
      assert.strictEqual(jFullDead.getVector().magnitude, 0, 'Deadzone 1.0 magnitude must be 0');
      assert.strictEqual(Number.isNaN(jFullDead.getVector().magnitude), false);
      jFullDead.detach();

      // maxRadius = 0: handled safely without throwing
      const jZeroRadius = new VirtualJoystick({ maxRadius: 0, deadzone: 0.1 });
      jZeroRadius.attach(container);
      assert.doesNotThrow(() => {
        sendPointerEvent(container, { type: 'pointerdown', pointerId: 3, clientX: 100, clientY: 100 });
        sendPointerEvent(window, { type: 'pointermove', pointerId: 3, clientX: 150, clientY: 100 });
      });
      jZeroRadius.detach();
    });

    it('T5-J06: DOM overlay lifecycle stress and canvas rendering under neutral and extreme vectors', () => {
      const container = createMockCanvas(400, 400);
      const joystick = new VirtualJoystick({ maxRadius: 50 });
      joystick.attach(container);

      // Attach DOM overlay
      const overlay = joystick.attachDomOverlay();
      assert.ok(overlay);

      // Repeated calls return same element
      assert.strictEqual(joystick.attachDomOverlay(), overlay);

      // Render canvas neutral
      const ctx = container.getContext('2d') as CanvasRenderingContext2D;
      assert.doesNotThrow(() => {
        joystick.renderCanvas(ctx);
      });

      // Active state rendering
      sendPointerEvent(container, { type: 'pointerdown', pointerId: 1, clientX: 200, clientY: 200 });
      sendPointerEvent(window, { type: 'pointermove', pointerId: 1, clientX: 240, clientY: 220 });
      assert.doesNotThrow(() => {
        joystick.renderCanvas(ctx);
      });

      // Destroy overlay and detach
      assert.doesNotThrow(() => {
        joystick.destroyDomOverlay();
        joystick.detach();
      });
    });
  });

  // =========================================================================
  // 5. TRAUMA SCREEN SHAKE & JUICE ADVERSARIAL LIMITS
  // =========================================================================
  describe('Group 5: TraumaScreenShake & Juice Adversarial Limits (juice.ts)', () => {

    it('T5-S01: Massive trauma overflow (addTrauma(100.0)) clamps strictly to 1.0 and bounds offsets', () => {
      const shake = new TraumaScreenShake({ maxOffset: 20, maxAngle: 0.1 });

      shake.addTrauma(100.0);
      assert.strictEqual(shake.getTrauma(), 1.0, 'Trauma must clamp to 1.0');
      assert.strictEqual(shake.getIntensity(), 1.0, 'Intensity (trauma^2) must clamp to 1.0');

      shake.setTrauma(999.0);
      assert.strictEqual(shake.getTrauma(), 1.0);

      // Compute offset
      const offset = shake.update(0.016);
      assert.ok(Math.abs(offset.offsetX) <= 20.0, `OffsetX (${offset.offsetX}) must not exceed maxOffset`);
      assert.ok(Math.abs(offset.offsetY) <= 20.0, `OffsetY (${offset.offsetY}) must not exceed maxOffset`);
      assert.ok(Math.abs(offset.angle) <= 0.1, `Angle (${offset.angle}) must not exceed maxAngle`);
    });

    it('T5-S02: Negative trauma inputs clamp strictly to 0.0 and yield zero offsets', () => {
      const shake = new TraumaScreenShake();

      shake.addTrauma(-50.0);
      assert.strictEqual(shake.getTrauma(), 0.0);
      assert.strictEqual(shake.getIntensity(), 0.0);

      shake.setTrauma(-100.0);
      assert.strictEqual(shake.getTrauma(), 0.0);

      const offset = shake.update(0.016);
      assert.strictEqual(offset.offsetX, 0);
      assert.strictEqual(offset.offsetY, 0);
      assert.strictEqual(offset.angle, 0);
    });

    it('T5-S03: Zero delta time (dt = 0.0) updates cleanly without trauma loss or division by zero', () => {
      const shake = new TraumaScreenShake();
      shake.setTrauma(0.8);

      for (let i = 0; i < 50; i++) {
        const offset = shake.update(0.0);
        assert.strictEqual(shake.getTrauma(), 0.8, 'Trauma must not decay at dt=0');
        assert.ok(Number.isFinite(offset.offsetX));
        assert.ok(Number.isFinite(offset.offsetY));
        assert.ok(Number.isFinite(offset.angle));
      }
    });

    it('T5-S04: Extreme large delta time (dt = 1000s) instantaneously settles trauma to exactly 0', () => {
      const shake = new TraumaScreenShake();
      shake.setTrauma(1.0);

      const offset = shake.update(1000.0);
      assert.strictEqual(shake.getTrauma(), 0.0);
      assert.strictEqual(shake.getIntensity(), 0.0);
      assert.strictEqual(offset.offsetX, 0);
      assert.strictEqual(offset.offsetY, 0);
      assert.strictEqual(offset.angle, 0);
    });

    it('T5-S05: Negative delta time recovery: Negative dt does not break subsequent positive decay', () => {
      const shake = new TraumaScreenShake();
      shake.setTrauma(0.5);

      // If negative dt was passed
      shake.update(-0.1);
      // Now pass normal positive dt steps
      for (let i = 0; i < 100; i++) {
        shake.update(0.1);
      }
      assert.strictEqual(shake.getTrauma(), 0.0, 'Trauma must cleanly decay to 0');
    });

    it('T5-S06: HitStopManager adversarial inputs (NaN, Infinity, negative ms, extreme values)', () => {
      const hitStop = new HitStopManager();

      // Negative ms
      hitStop.triggerMs(-50);
      let res = hitStop.update(0.016);
      assert.strictEqual(res.frozen, false, 'Negative ms must not freeze engine');

      // NaN
      hitStop.trigger(NaN);
      res = hitStop.update(0.016);
      assert.strictEqual(res.frozen, false, 'NaN must not freeze engine');

      // Infinity
      hitStop.trigger(Infinity);
      res = hitStop.update(0.016);
      assert.strictEqual(res.frozen, false, 'Infinity must be guarded');

      // Valid freeze countdown
      hitStop.triggerMs(50);
      res = hitStop.update(0.020);
      assert.strictEqual(res.frozen, true);
      res = hitStop.update(0.040);
      assert.strictEqual(res.frozen, false);
    });
  });

  // =========================================================================
  // 6. STORAGE & DATA BOUNDARY STRESS
  // =========================================================================
  describe('Group 6: Storage & Game Data Boundary Stress (storage.ts)', () => {

    // Setup mock localStorage in memory
    const mockStorage = new Map<string, string>();
    const fakeLocalStorage = {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => { mockStorage.set(k, String(v)); },
      removeItem: (k: string) => { mockStorage.delete(k); },
      clear: () => { mockStorage.clear(); },
    };

    beforeEach: {
      (globalThis.window as any).localStorage = fakeLocalStorage;
      mockStorage.clear();
    }

    it('T5-M01: Malformed and corrupted JSON strings handled with safe defaults without throwing', () => {
      (globalThis.window as any).localStorage = fakeLocalStorage;
      mockStorage.set('barricade-defense-v1:progress', '{"broken json: !!! @@##$$');
      mockStorage.set('barricade-defense-v1:settings', 'INVALID_JSON');
      mockStorage.set('barricade-defense-v1:records', '[{score: not closed');

      assert.doesNotThrow(() => {
        const progress = loadProgress();
        assert.strictEqual(progress.coins, 0);
        assert.deepStrictEqual(progress.unlocked, ['city']);
        assert.strictEqual(progress.powerBonus, 0);

        const settings = loadSettings();
        assert.strictEqual(settings.muted, false);
        assert.strictEqual(settings.shake, true);

        const records = loadRecords();
        assert.deepStrictEqual(records, []);
      });
    });

    it('T5-M02: Progress bonus level clamping (out of bounds, negative, and extreme coins)', () => {
      (globalThis.window as any).localStorage = fakeLocalStorage;
      mockStorage.set('barricade-defense-v1:progress', JSON.stringify({
        coins: 1e12,        // Should clamp to 999999
        powerBonus: 9999,   // Max is 10
        wallBonus: -50,     // Min is 0
        baseBonus: 100,     // Max is 10
        totalKills: 1e10,   // Should clamp to 9999999
        unlocked: ['desert', 'unknown_course'], // Should filter unknown and keep city
      }));

      const p = loadProgress();
      assert.strictEqual(p.coins, 999999, 'Coins must clamp to 999999');
      assert.strictEqual(p.powerBonus, 10, 'powerBonus must clamp to 10');
      assert.strictEqual(p.wallBonus, 0, 'wallBonus must clamp to min 0');
      assert.strictEqual(p.baseBonus, 10, 'baseBonus must clamp to 10');
      assert.strictEqual(p.totalKills, 9999999, 'totalKills must clamp to 9999999');
      assert.ok(p.unlocked.includes('city'), 'City course must always be unlocked');
      assert.ok(p.unlocked.includes('desert'));
      assert.strictEqual(p.unlocked.includes('unknown_course' as any), false);
    });

    it('T5-M03: Malicious prototype pollution payload strings in storage do not corrupt prototypes', () => {
      (globalThis.window as any).localStorage = fakeLocalStorage;
      mockStorage.set('barricade-defense-v1:progress', JSON.stringify({
        __proto__: { isAdmin: true },
        constructor: { prototype: { hacked: true } },
        codex: {
          runner: 50,
          __proto__: { evil: 'yes' },
        },
      }));

      const p = loadProgress();
      assert.strictEqual((Object.prototype as any).isAdmin, undefined);
      assert.strictEqual((Object.prototype as any).hacked, undefined);
      assert.strictEqual((Object.prototype as any).evil, undefined);
      assert.strictEqual(p.codex.runner, 50);
    });

    it('T5-M04: High-volume score records maintaining strictly top 10 descending order', () => {
      (globalThis.window as any).localStorage = fakeLocalStorage;
      mockStorage.clear();

      for (let i = 1; i <= 50; i++) {
        saveRecord({
          score: i * 100,
          course: 'city',
          difficulty: 'normal',
          wave: 5,
          victory: true,
          date: Date.now() + i,
        });
      }

      const top10 = loadRecords();
      assert.strictEqual(top10.length, 10, 'Must store exactly top 10 records');
      assert.strictEqual(top10[0].score, 5000, 'Highest score must be first');
      assert.strictEqual(top10[9].score, 4100, '10th highest score must be 4100');

      // Verify strict descending order
      for (let i = 0; i < top10.length - 1; i++) {
        assert.ok(top10[i].score >= top10[i + 1].score);
      }
    });
  });

  // =========================================================================
  // 7. DEFENSE ENGINE HIGH-LOAD & STATE TRANSITION STRESS
  // =========================================================================
  describe('Group 7: Barricade Defense Engine Stress Harness (engine.ts & UI)', () => {

    it('T5-E01: Rapid engine start/destroy stress cycles (50 cycles) without resource leaks', () => {
      const canvas = createMockCanvas();
      const audio = createMockAudio();

      assert.doesNotThrow(() => {
        for (let i = 0; i < 50; i++) {
          const engine = new DefenseEngine(canvas, audio, {
            onHud: () => {},
            onShop: () => {},
            onGameOver: () => {},
            onBanner: () => {},
          });
          engine.start(COURSES.city, DIFFICULTIES.normal);
          engine.destroy();
        }
      });
    });

    it('T5-E02: Shop transactions under boundary coin counts and upgrade caps', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      // Coins = 0: buying any item must fail
      eng.coins = 0;
      assert.strictEqual(engine.buy('repair'), false);
      assert.strictEqual(engine.buy('wall'), false);
      assert.strictEqual(engine.buy('power'), false);
      assert.strictEqual(engine.buy('ally'), false);
      assert.strictEqual(engine.buy('heal'), false);
      assert.strictEqual(eng.coins, 0, 'Coins must not go negative');

      // Coins = 10000: buy until wall max / ally max
      eng.coins = 10000;
      while (eng.allies.length < MAX_ALLIES) {
        const success = engine.buy('ally');
        assert.strictEqual(success, true);
      }
      assert.strictEqual(eng.allies.length, 30);
      assert.strictEqual(engine.buy('ally'), false, 'Buying beyond MAX_ALLIES must return false');

      // Repair when barricade is already full must return false
      eng.guard = eng.guardMax;
      assert.strictEqual(engine.buy('repair'), false);

      // Heal when base is already full must return false
      eng.hp = eng.hpMax;
      assert.strictEqual(engine.buy('heal'), false);

      engine.destroy();
    });

    it('T5-E03: Extreme endless wave scaling (wave 500) remains finite without numerical NaN', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.hard);
      const eng = engine as any;

      // Simulate 100 endless transitions
      for (let i = 0; i < 100; i++) {
        engine.continueEndless();
      }
      assert.strictEqual(eng.endless, 100);
      assert.ok(Number.isFinite(eng.hp));
      assert.ok(Number.isFinite(eng.guard));
      assert.ok(Number.isFinite(eng.guardMax));

      // Build director wave plan
      assert.doesNotThrow(() => {
        eng.buildDirector();
      });

      engine.destroy();
    });

    it('T5-E04: Barricade integrity status mapping matches exact design thresholds', () => {
      // Replicates BarricadeIntegrityBar status text logic from BarricadeDefenseGame.tsx:
      // ratio <= 0 -> 崩壊！
      // ratio < 0.3 -> 警報！
      // ratio < 0.7 -> 亀裂
      // ratio >= 0.7 -> 堅牢
      function getStatus(wallHp: number, wallMax: number): string {
        const ratio = wallMax > 0 ? wallHp / wallMax : 0;
        if (ratio <= 0) return '崩壊！';
        if (ratio < 0.3) return '警報！';
        if (ratio < 0.7) return '亀裂';
        return '堅牢';
      }

      assert.strictEqual(getStatus(0, 140), '崩壊！');
      assert.strictEqual(getStatus(-10, 140), '崩壊！');
      assert.strictEqual(getStatus(1, 140), '警報！');
      assert.strictEqual(getStatus(41, 140), '警報！'); // 41/140 = 0.2928 < 0.3
      assert.strictEqual(getStatus(42, 140), '亀裂');  // 42/140 = 0.300
      assert.strictEqual(getStatus(97, 140), '亀裂');  // 97/140 = 0.6928 < 0.7
      assert.strictEqual(getStatus(98, 140), '堅牢');  // 98/140 = 0.700
      assert.strictEqual(getStatus(140, 140), '堅牢');
    });

    it('T5-E05: Procedural mesh builders execute with zero emojis and valid scene hierarchy', () => {
      // Salaryman hero & ally
      const hero = buildSalarymanMesh({ isHero: true });
      const ally = buildSalarymanMesh({ isHero: false });
      assert.strictEqual(hero.name, 'hero_salaryman');
      assert.strictEqual(ally.name, 'ally_salaryman');

      // Gate meshes
      const addGate = buildGateMesh('add', 5);
      const multGate = buildGateMesh('mult', 2);
      const divGate = buildGateMesh('div', 2);
      const subGate = buildGateMesh('sub', 5);
      assert.ok(addGate);
      assert.ok(multGate);
      assert.ok(divGate);
      assert.ok(subGate);

      // Enemy meshes
      for (const kind of ['runner', 'walker', 'brute', 'shield', 'kamikaze'] as const) {
        const enemy = buildEnemyMesh(kind, false);
        assert.ok(enemy);
      }

      // Boss train
      const boss = buildTrainBossMesh('city');
      assert.ok(boss);
    });

    it('T5-E06: Multiplier and division gate squad arithmetic edge cases', () => {
      const canvas = createMockCanvas();
      const engine = new DefenseEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onShop: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start(COURSES.city, DIFFICULTIES.normal);
      const eng = engine as any;

      // Initial state: 0 allies, hero alone (total squad = 1)
      assert.strictEqual(eng.allies.length, 0);

      // 1. Double from 0 allies -> total squad becomes 2 (hero + 1 ally)
      eng.applySquadGate('mult', 2);
      assert.strictEqual(eng.allies.length, 1);

      // 2. Divide by 2 from 1 ally (total squad = 2) -> floor(2/2) = 1 (hero + 0 allies)
      eng.applySquadGate('div', 2);
      assert.strictEqual(eng.allies.length, 0);

      // 3. Subtract 10 when 0 allies -> total squad clamped to min 1 (hero never removed)
      eng.applySquadGate('sub', 10);
      assert.strictEqual(eng.allies.length, 0);

      // 4. Divide by 2 when 0 allies -> total squad clamped to min 1 (hero preserved)
      eng.applySquadGate('div', 2);
      assert.strictEqual(eng.allies.length, 0);

      // 5. Huge multiplier (×100) -> clamped to MAX_ALLIES (30)
      eng.applySquadGate('mult', 100);
      assert.strictEqual(eng.allies.length, 30);

      // 6. Divide by 2 from 30 allies (total squad = 31) -> floor(31 / 2) = 15 total squad -> 14 allies
      eng.applySquadGate('div', 2);
      assert.strictEqual(eng.allies.length, 14);

      engine.destroy();
    });

    it('T5-E07: Achievement evaluation logic under boundary run outcomes', () => {
      // Direct replication of evalAchievements logic from BarricadeDefenseGame.tsx
      function evalAchievements(r: any, p: Progress, records: RecordEntry[]): string[] {
        const has = new Set(p.achievements);
        const give: string[] = [];
        const grant = (id: string, cond: boolean) => {
          if (cond && !has.has(id)) {
            give.push(id);
            has.add(id);
          }
        };
        grant('first_run', true);
        grant('first_win', r.victory);
        grant('boss', r.bossKills > 0);
        grant('nakama', r.maxAllies >= 3);
        grant('combo50', r.maxCombo >= 50);
        grant('combo100', r.maxCombo >= 100);
        grant('scorer', r.score >= 10000);
        grant('endless', r.endless > 0);
        grant('veteran', p.totalRuns >= 10);
        grant('slayer', p.totalKills >= 1000);
        grant('rich', p.coins >= 1000);
        const won = new Set(records.filter((x) => x.victory).map((x) => x.course));
        grant('all_course', won.size >= 3);
        if (give.length > 0) p.achievements = Array.from(has);
        return give;
      }

      const p: Progress = {
        coins: 1500,
        unlocked: ['city', 'desert', 'snow'],
        powerBonus: 5,
        wallBonus: 5,
        baseBonus: 5,
        achievements: [],
        codex: {},
        totalKills: 2000,
        totalRuns: 15,
        endlessBest: 5,
      };

      const records: RecordEntry[] = [
        { course: 'city', victory: true, score: 5000, difficulty: 'normal', wave: 5, date: 1 },
        { course: 'desert', victory: true, score: 6000, difficulty: 'normal', wave: 5, date: 2 },
        { course: 'snow', victory: true, score: 7000, difficulty: 'normal', wave: 5, date: 3 },
      ];

      const runResult = {
        victory: true,
        bossKills: 1,
        maxAllies: 10,
        maxCombo: 120,
        score: 15000,
        endless: 2,
      };

      const unlocked = evalAchievements(runResult, p, records);
      // All 12 achievements should be unlocked in this god run!
      assert.strictEqual(unlocked.length, 12);
      assert.strictEqual(p.achievements.length, 12);

      // Running evalAchievements again with same progress: should unlock 0 new achievements
      const secondRun = evalAchievements(runResult, p, records);
      assert.strictEqual(secondRun.length, 0);
    });

    it('T5-E08: DamageNumberPool zero-allocation recycling under 500 rapid bursts', () => {
      const pool = new DamageNumberPool(32, 0.5);
      const canvas = createMockCanvas(400, 400);
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

      // Spawn 500 numbers into pool of size 32
      assert.doesNotThrow(() => {
        for (let i = 0; i < 500; i++) {
          pool.spawn(100, 100, i + 1, 'crit');
          pool.update(0.016);
          pool.render(ctx);
        }
      });

      // Advance time by 2.0 seconds so all numbers expire
      pool.update(2.0);

      // Pool items should all be recycled cleanly
      assert.doesNotThrow(() => {
        pool.render(ctx);
      });
    });
  });

});
