/**
 * Empirical Stress-Test Suite for Milestone 234 Challenger:
 * - Shachiku Spiral (R3):
 *   1. Distance-verlet follow physics (22-segment chain at high angular velocity & rapid direction reversals)
 *   2. Anti-insta-wipe boss mechanic (head destruction triggers shockwave splash, 1.5s stun, mini-head promotion)
 *   3. Wave 15 President golden executive barrier (frontal projectile deflection, arc boundary, collapse)
 * - Shared Controls & Juice (R4):
 *   4. Floating VirtualJoystick touch input across both games (spiral and survivor)
 *   5. Hitstop micro-freezes and non-linear trauma camera shake
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpiralEngine } from '../src/game/spiral/engine';
import { VirtualJoystick } from '../src/game/common/virtualJoystick';
import { HitStopManager, TraumaScreenShake } from '../src/game/common/juice';
import { setupTestEnvironment, createMockCanvas, createMockAudio } from './e2e/testEnv';

// Initialize headless browser environment (window, document, requestAnimationFrame, etc.)
setupTestEnvironment();

describe('Empirical Challenger Suite: Shachiku Spiral (R3) & Shared Controls & Juice (R4)', () => {

  // =========================================================================
  // SUITE 1: Distance-Verlet Follow Physics for 22-Segment Chain
  // =========================================================================
  describe('1. Shachiku Spiral: Distance-Verlet Follow Physics', () => {

    it('1.1: 22-segment President chain maintains strict distance constraints without detaching or stretching', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0; // isolate chain follow physics from random mob spawns
      (engine as any).projs.length = 0; // isolate from player auto-projectiles
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('president');
      const president = chains.find((c: any) => c.kind === 'president');
      assert.ok(president, 'President chain must spawn');
      assert.strictEqual(president.segs.length, 22, 'President must have exactly 22 segments');

      const spacing = president.segRadius * 1.7; // 17 * 1.7 = 28.9px
      const maxAllowedClamp = spacing * 1.15;    // 33.235px

      // Step through 600 frames (10 seconds of simulation at 60 FPS)
      const dt = 1 / 60;
      let maxObservedDist = 0;
      let minObservedDist = Infinity;

      for (let frame = 0; frame < 600; frame++) {
        (engine as any).projs.length = 0; // prevent shooting chain
        (engine as any).update(dt);

        for (let i = 1; i < president.segs.length; i++) {
          const s = president.segs[i];
          const prev = president.segs[i - 1];

          assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y), `Segment ${i} coordinates must be finite numbers`);
          const dist = Math.hypot(prev.x - s.x, prev.y - s.y);

          if (dist > maxObservedDist) maxObservedDist = dist;
          if (dist < minObservedDist) minObservedDist = dist;

          // Segment must NEVER detach or stretch beyond the hard clamp threshold (+ numerical epsilon)
          assert.ok(
            dist <= maxAllowedClamp + 1e-4,
            `Frame ${frame}: Segment ${i} stretched beyond clamp limit! dist=${dist}, maxAllowed=${maxAllowedClamp}`
          );

          // Segment must NOT collapse into the exact same point or turn negative
          assert.ok(
            dist > 0.01,
            `Frame ${frame}: Segment ${i} collapsed into predecessor! dist=${dist}`
          );
        }
      }

      // Assertions on overall physics quality
      assert.ok(maxObservedDist <= maxAllowedClamp + 1e-4, 'Max distance must strictly respect the clamp limit');
      assert.ok(minObservedDist > 1.0, 'Segments must maintain separation and not bunch up into a singularity');

      engine.destroy();
    });

    it('1.2: High angular velocity (up to 8.0 rad/s) does not break 22-segment distance-verlet stability', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'hard', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('president');
      const president = chains[0];
      const spacing = president.segRadius * 1.7;
      const maxAllowedClamp = spacing * 1.15;

      // Inject aggressive angular speeds (standard is 0.7 rad/s, we test 3.0, 5.0, 8.0 rad/s)
      const speeds = [3.0, 5.0, 8.0];
      const dt = 1 / 60;

      for (const speed of speeds) {
        president.angular = speed;
        for (let frame = 0; frame < 180; frame++) {
          (engine as any).projs.length = 0;
          (engine as any).update(dt);

          for (let i = 1; i < president.segs.length; i++) {
            const s = president.segs[i];
            const prev = president.segs[i - 1];
            const dist = Math.hypot(prev.x - s.x, prev.y - s.y);

            assert.ok(
              dist <= maxAllowedClamp + 1e-4,
              `At angular speed ${speed} rad/s: Segment ${i} detached! dist=${dist}, limit=${maxAllowedClamp}`
            );
            assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y), 'Coordinates must remain finite at high speed');
          }
        }
      }

      engine.destroy();
    });

    it('1.3: Rapid direction reversals (Wave 10 Executive Reversals) never cause detachment, stretching or stuttering', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      // Spawn Wave 10 exec chain (16 segments)
      (engine as any).spawnChain('exec');
      const exec = chains[0];
      const spacing = exec.segRadius * 1.7;
      const maxAllowedClamp = spacing * 1.15;

      const dt = 1 / 60;

      // Stress test 3 reversal regimes:
      // A: Frequent reversals every 10 frames (0.16s)
      for (let f = 0; f < 100; f++) {
        (engine as any).projs.length = 0;
        if (f % 10 === 0) {
          exec.dir *= -1; // reverse direction
        }
        (engine as any).update(dt);

        for (let i = 1; i < exec.segs.length; i++) {
          const dist = Math.hypot(exec.segs[i - 1].x - exec.segs[i].x, exec.segs[i - 1].y - exec.segs[i].y);
          assert.ok(dist <= maxAllowedClamp + 1e-4, `Reversal regime A: segment ${i} detached (dist=${dist})`);
          assert.ok(dist > 0.05, `Reversal regime A: segment ${i} collapsed (dist=${dist})`);
        }
      }

      // B: Reversals every 3 frames (0.05s, rapid oscillation)
      for (let f = 0; f < 60; f++) {
        (engine as any).projs.length = 0;
        if (f % 3 === 0) {
          exec.dir *= -1;
        }
        (engine as any).update(dt);

        for (let i = 1; i < exec.segs.length; i++) {
          const dist = Math.hypot(exec.segs[i - 1].x - exec.segs[i].x, exec.segs[i - 1].y - exec.segs[i].y);
          assert.ok(dist <= maxAllowedClamp + 1e-4, `Reversal regime B: segment ${i} detached (dist=${dist})`);
        }
      }

      // C: Reversal every single frame (extreme high-frequency flutter)
      for (let f = 0; f < 30; f++) {
        (engine as any).projs.length = 0;
        exec.dir *= -1;
        (engine as any).update(dt);

        for (let i = 1; i < exec.segs.length; i++) {
          const dist = Math.hypot(exec.segs[i - 1].x - exec.segs[i].x, exec.segs[i - 1].y - exec.segs[i].y);
          assert.ok(dist <= maxAllowedClamp + 1e-4, `Reversal regime C: segment ${i} detached (dist=${dist})`);
          assert.ok(Number.isFinite(exec.segs[i].x), 'Coordinates must be valid');
        }
      }

      engine.destroy();
    });

    it('1.4: Intermediate body segment destruction gap is immediately recovered by verlet follow on next frame', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('president');
      const president = chains[0];
      const spacing = president.segRadius * 1.7;
      const maxAllowedClamp = spacing * 1.15;

      // Settle initial positions over 10 frames
      for (let f = 0; f < 10; f++) {
        (engine as any).projs.length = 0;
        (engine as any).update(1 / 60);
      }

      // Manually simulate destroying segment 5 mid-frame (as when pierced by lasers/orbitals)
      president.segs.splice(5, 1);
      assert.strictEqual(president.segs.length, 21);

      // Immediately after splice, the gap between segment 4 and newly adjacent segment 5 is wide (~2x spacing)
      const gapDist = Math.hypot(president.segs[4].x - president.segs[5].x, president.segs[4].y - president.segs[5].y);
      assert.ok(gapDist > spacing * 1.5, 'Splicing out segment leaves an initial gap');

      // Update one frame: follow physics must pull the chain together and clamp to spacing
      (engine as any).projs.length = 0;
      (engine as any).update(1 / 60);

      const recoveredDist = Math.hypot(president.segs[4].x - president.segs[5].x, president.segs[4].y - president.segs[5].y);
      assert.ok(
        recoveredDist <= maxAllowedClamp + 1e-4,
        `Follow physics must clamp the gap on the next frame! recoveredDist=${recoveredDist}, limit=${maxAllowedClamp}`
      );

      engine.destroy();
    });

    it('1.5: Variable frame rate & dt jitter (1ms to 100ms) preserves physical stability', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('president');
      const president = chains[0];
      const spacing = president.segRadius * 1.7;
      const maxAllowedClamp = spacing * 1.15;

      // Jitter deltas representing 10 FPS lag spikes to 500 FPS hyper-ticks
      const testDts = [0.002, 0.016, 0.033, 0.080, 0.005, 0.100, 0.016];

      for (let cycle = 0; cycle < 50; cycle++) {
        for (const dt of testDts) {
          (engine as any).projs.length = 0;
          (engine as any).update(dt);

          for (let i = 1; i < president.segs.length; i++) {
            const dist = Math.hypot(president.segs[i - 1].x - president.segs[i].x, president.segs[i - 1].y - president.segs[i].y);
            assert.ok(
              dist <= maxAllowedClamp + 1e-4,
              `dt=${dt}s jitter: Segment ${i} detached with dist=${dist} (limit=${maxAllowedClamp})`
            );
          }
        }
      }

      engine.destroy();
    });

    it('1.6: Core breach assault transition prevents infinite radius 26 orbit clamping', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('mail');
      const chain = chains[0];

      // Move chain radius close to breach trigger (r = 24.5)
      chain.r = 24.5;
      (engine as any).update(0.1); // transitions to r <= 24

      assert.ok(chain.r <= 24, 'Chain radius must cross breach threshold (<= 24)');
      const lockedTheta = chain.theta;

      const head = chain.segs[0];
      const px = (engine as any).px;
      const py = (engine as any).py;
      const initialDistToCore = Math.hypot(px - head.x, py - head.y);

      // Run 5 updates of breach charge
      for (let f = 0; f < 5; f++) {
        (engine as any).update(0.05);
      }

      // Assert: theta did not orbit, head moved strictly closer to core
      assert.strictEqual(chain.theta, lockedTheta, 'Theta must lock during core breach (orbital rotation halted)');
      const finalDistToCore = Math.hypot(px - head.x, py - head.y);
      assert.ok(
        finalDistToCore < initialDistToCore,
        `Head must charge directly toward core! initial=${initialDistToCore}, final=${finalDistToCore}`
      );

      engine.destroy();
    });
  });

  // =========================================================================
  // SUITE 2: Boss Anti-Insta-Wipe & Segment Promotion Mechanics
  // =========================================================================
  describe('2. Shachiku Spiral: Boss Anti-Insta-Wipe & Promotion', () => {

    it('2.1: Destroying boss head does NOT wipe chain, but triggers shockwave splash, 1.5s stun & mini-head promotion', () => {
      const canvas = createMockCanvas(640, 640);
      let bannerTitle = '';

      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: (t) => { bannerTitle = t; },
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('president');
      const president = chains[0];
      const initialSegCount = president.segs.length;
      assert.strictEqual(initialSegCount, 22, 'President starts with 22 segments');

      const originalSecondSeg = president.segs[1];
      const initialSecondSegRadius = originalSecondSeg.radius;
      const initialSecondSegMaxHp = originalSecondSeg.maxHp;

      // Kill the leader head segment (si = 0)
      (engine as any).killSeg(president, 0, 0);

      // Requirement Check 1: Remaining segments must NOT be wiped!
      assert.strictEqual(
        president.segs.length,
        initialSegCount - 1,
        `Expected ${initialSegCount - 1} remaining segments, found ${president.segs.length}`
      );

      // Requirement Check 2: Triggers 1.5s stun freezing chain advance
      assert.strictEqual(president.stunT, 1.5, 'Boss chain must receive exactly 1.5s stun duration');

      // Requirement Check 3: Shockwave splash ring created
      const rings = (engine as any).rings;
      const shockwave = rings.find((r: any) => r.maxR === 85 && r.dur === 0.45);
      assert.ok(shockwave, 'Head explosion must spawn an expanding shockwave ring (maxR=85, dur=0.45)');

      // Requirement Check 4: Mini-head promotion of next segment
      const promotedHead = president.segs[0];
      assert.strictEqual(
        promotedHead.radius,
        Math.min(18, initialSecondSegRadius + 2),
        'Promoted mini-head must have radius increased by 2px (capped at 18px)'
      );
      assert.strictEqual(
        promotedHead.maxHp,
        Math.round(initialSecondSegMaxHp * 1.6),
        'Promoted mini-head must have maxHp scaled by 1.6x'
      );
      assert.strictEqual(
        promotedHead.hp,
        promotedHead.maxHp,
        'Promoted mini-head must be restored to full boosted HP'
      );

      // Requirement Check 5: Kinetic juice & Banner
      assert.ok(bannerTitle.includes('ボスの頭部撃破'), `Banner title should announce head defeat, got: "${bannerTitle}"`);
      assert.ok((engine as any).hitstop.isFrozen(), 'Hitstop micro-freeze must be triggered on head explosion');
      assert.ok((engine as any).shake.getTrauma() >= 0.5, 'High trauma camera shake must be added');

      engine.destroy();
    });

    it('2.2: Stun cleanly freezes advance during full 1.5s and then resumes normal spiral motion', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('bossMid');
      const boss = chains[0];

      // Kill head to initiate stun
      (engine as any).killSeg(boss, 0, 0);
      assert.strictEqual(boss.stunT, 1.5);

      const headPosBefore = { x: boss.segs[0].x, y: boss.segs[0].y };

      // Update 30 frames (0.5 seconds at dt = 1/60s)
      for (let i = 0; i < 30; i++) {
        (engine as any).update(1 / 60);
      }

      // During stun, position must be frozen
      assert.strictEqual(boss.segs[0].x, headPosBefore.x, 'Head must not translate during stun period');
      assert.strictEqual(boss.segs[0].y, headPosBefore.y, 'Head must not translate during stun period');
      assert.ok(boss.stunT <= 1.05 && boss.stunT >= 0.95, `stunT should decay to ~1.0s, got ${boss.stunT}`);

      // Step through remaining stun frames (65 frames * 1/60s > 1.0s)
      for (let i = 0; i < 65; i++) {
        (engine as any).update(1 / 60);
      }
      assert.ok(boss.stunT <= 0, 'stunT must expire to <= 0');

      // Now update 30 frames after stun has expired
      for (let i = 0; i < 30; i++) {
        (engine as any).update(1 / 60);
      }

      // Head must have resumed moving
      const hasMoved = boss.segs[0].x !== headPosBefore.x || boss.segs[0].y !== headPosBefore.y;
      assert.ok(hasMoved, 'Boss must resume spiral advancement after 1.5s stun elapses');

      engine.destroy();
    });

    it('2.3: Sequential head kills cascade cleanly down to 2 segments before final complete wipe', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('exec'); // 16 segments
      const exec = chains[0];
      assert.strictEqual(exec.segs.length, 16);

      // Successively kill head until 2 segments remain
      while (exec.segs.length > 2) {
        const expectedCount = exec.segs.length - 1;
        (engine as any).killSeg(exec, 0, 0);
        assert.strictEqual(exec.segs.length, expectedCount);
        assert.strictEqual(exec.stunT, 1.5);
      }

      assert.strictEqual(exec.segs.length, 2, 'Boss reached 2 remaining segments');

      // Killing head with <= 2 segments must trigger final complete chain collapse
      (engine as any).killSeg(exec, 0, 0);
      assert.strictEqual(chains.length, 0, 'Final head destruction must completely collapse the boss chain');

      engine.destroy();
    });

    it('2.4: Non-boss chains (mob) head destruction immediately wipes the entire chain', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('doc'); // Mob chain with 8 segments
      const mob = chains[0];
      assert.strictEqual(mob.segs.length, 8);
      assert.strictEqual(mob.boss, false);

      // Kill mob head
      (engine as any).killSeg(mob, 0, 0);

      // Mob must be completely wiped immediately (0 segments remaining in chain or removed from chains)
      assert.strictEqual(chains.length, 0, 'Mob chain must instantly collapse upon head defeat');

      engine.destroy();
    });
  });

  // =========================================================================
  // SUITE 3: Wave 15 President Golden Executive Barrier Deflection
  // =========================================================================
  describe('3. Shachiku Spiral: Wave 15 President Golden Executive Barrier', () => {

    it('3.1: Frontal projectiles are 100% absorbed by barrier while head HP is unaffected', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('president');
      const president = chains[0];
      assert.ok(president.bossState.barrierActive, 'Barrier must be active at spawn');
      const initialBarrierHp = president.bossState.barrierHp;
      assert.ok(initialBarrierHp > 0, 'Barrier must have initial HP');

      const head = president.segs[0];
      const initialHeadHp = head.hp;

      // Update gimmicks to set barrierAngle
      (engine as any).updateBossGimmicks(president, 0, 0.016);
      const barrierAngle = president.bossState.barrierAngle;

      // Calculate attack point directly on the frontal vector (along barrierAngle)
      const frontalX = head.x + Math.cos(barrierAngle) * 50;
      const frontalY = head.y + Math.sin(barrierAngle) * 50;

      // Apply 60 damage from front
      (engine as any).damageSeg(president, 0, 0, 60, 100, frontalX, frontalY, false);

      // Verification: Barrier absorbed the damage, head is undamaged!
      assert.strictEqual(head.hp, initialHeadHp, 'Head HP must NOT be reduced by frontal barrier hit');
      assert.strictEqual(
        president.bossState.barrierHp,
        initialBarrierHp - 60,
        'Barrier HP must be decremented by exactly the hit damage'
      );

      engine.destroy();
    });

    it('3.2: Flank and rear attacks bypass the barrier and damage head directly', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('president');
      const president = chains[0];
      (engine as any).updateBossGimmicks(president, 0, 0.016);

      const head = president.segs[0];
      const initialHeadHp = head.hp;
      const initialBarrierHp = president.bossState.barrierHp;
      const barrierAngle = president.bossState.barrierAngle;

      // Rear attack (opposite direction: barrierAngle + PI)
      const rearX = head.x + Math.cos(barrierAngle + Math.PI) * 50;
      const rearY = head.y + Math.sin(barrierAngle + Math.PI) * 50;

      (engine as any).damageSeg(president, 0, 0, 40, 100, rearX, rearY, false);

      // Verification: Head was damaged directly, barrier HP remained untouched
      assert.strictEqual(head.hp, initialHeadHp - 40, 'Rear hit must directly damage head HP');
      assert.strictEqual(president.bossState.barrierHp, initialBarrierHp, 'Barrier HP must NOT absorb rear hit');

      engine.destroy();
    });

    it('3.3: Barrier breaking threshold collapses barrier and exposes head to frontal hits', () => {
      const canvas = createMockCanvas(640, 640);
      let bannerTitle = '';
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: (t) => { bannerTitle = t; },
      });

      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      (engine as any).queue.length = 0;
      (engine as any).projs.length = 0;
      const chains = (engine as any).chains;
      chains.length = 0;

      (engine as any).spawnChain('president');
      const president = chains[0];
      (engine as any).updateBossGimmicks(president, 0, 0.016);

      const head = president.segs[0];
      const barrierAngle = president.bossState.barrierAngle;
      const frontalX = head.x + Math.cos(barrierAngle) * 50;
      const frontalY = head.y + Math.sin(barrierAngle) * 50;

      // Deal lethal damage to barrier
      const remainingBarrier = president.bossState.barrierHp;
      (engine as any).damageSeg(president, 0, 0, remainingBarrier + 100, 100, frontalX, frontalY, false);

      // Barrier must break
      assert.strictEqual(president.bossState.barrierActive, false, 'Barrier must become inactive');
      assert.strictEqual(president.bossState.barrierHp, 0, 'Barrier HP must clamp to 0');
      assert.ok(bannerTitle.includes('役員バリア破壊'), `Barrier collapse banner must fire, got: "${bannerTitle}"`);

      // Subsequent frontal hit must now damage head HP directly
      const headHpBefore = head.hp;
      (engine as any).damageSeg(president, 0, 0, 50, 100, frontalX, frontalY, false);
      assert.strictEqual(head.hp, headHpBefore - 50, 'Head must take direct damage after barrier is broken');

      engine.destroy();
    });
  });

  // =========================================================================
  // SUITE 4: Floating VirtualJoystick on Touch Input Across Both Games
  // =========================================================================
  describe('4. Controls: Floating VirtualJoystick Across Both Games', () => {

    it('4.1: Floating origin spawns dynamically at pointerdown coordinates', () => {
      const container = createMockCanvas(400, 400);

      const joystick = new VirtualJoystick({
        maxRadius: 50,
        deadzone: 0.08,
        floating: true,
      });
      joystick.attach(container);

      // Touch down at coordinates (150, 250)
      container.dispatchEvent({
        type: 'pointerdown',
        pointerId: 1,
        clientX: 150,
        clientY: 250,
        pointerType: 'touch',
      } as any);

      const state = joystick.getState();
      assert.strictEqual(state.active, true, 'Joystick must be active after pointerdown');
      assert.strictEqual(state.originX, 150, 'Origin X must dynamically match touch clientX');
      assert.strictEqual(state.originY, 250, 'Origin Y must dynamically match touch clientY');

      joystick.detach();
    });

    it('4.2: Deadzone filtering produces strictly zero vector and magnitude within threshold', () => {
      const container = createMockCanvas(400, 400);

      const joystick = new VirtualJoystick({
        maxRadius: 50,
        deadzone: 0.10, // 5px deadzone
        floating: true,
      });
      joystick.attach(container);

      // Down at (200, 200)
      container.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 200, clientY: 200, pointerType: 'touch' } as any);

      // Move 3px right (within 5px deadzone)
      window.dispatchEvent({ type: 'pointermove', pointerId: 1, clientX: 203, clientY: 200, pointerType: 'touch' } as any);

      const vec = joystick.getVector();
      assert.strictEqual(vec.active, true, 'Joystick is actively touched');
      assert.strictEqual(vec.x, 0, 'Vector X must be 0 within deadzone');
      assert.strictEqual(vec.y, 0, 'Vector Y must be 0 within deadzone');
      assert.strictEqual(vec.magnitude, 0, 'Magnitude must be 0 within deadzone');

      joystick.detach();
    });

    it('4.3: Proportional rescaling and maxRadius clamping beyond boundary', () => {
      const container = createMockCanvas(400, 400);

      const joystick = new VirtualJoystick({
        maxRadius: 50,
        deadzone: 0.10, // deadzone = 5px
        floating: true,
      });
      joystick.attach(container);

      container.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 100, pointerType: 'touch' } as any);

      // A: Half-way travel (27.5px right) -> normalized = 0.55 -> scaled = (0.55 - 0.10)/(1 - 0.10) = 0.50
      window.dispatchEvent({ type: 'pointermove', pointerId: 1, clientX: 127.5, clientY: 100, pointerType: 'touch' } as any);
      const midVec = joystick.getVector();
      assert.ok(Math.abs(midVec.magnitude - 0.5) < 1e-3, `Expected magnitude 0.5, got ${midVec.magnitude}`);
      assert.ok(Math.abs(midVec.x - 0.5) < 1e-3, `Expected x 0.5, got ${midVec.x}`);
      assert.strictEqual(midVec.y, 0);

      // B: Far beyond maxRadius (250px diagonal right-down)
      window.dispatchEvent({ type: 'pointermove', pointerId: 1, clientX: 350, clientY: 350, pointerType: 'touch' } as any);
      const farVec = joystick.getVector();
      assert.strictEqual(farVec.magnitude, 1.0, 'Magnitude must clamp to exactly 1.0 beyond maxRadius');
      const unitLength = Math.hypot(farVec.x, farVec.y);
      assert.ok(Math.abs(unitLength - 1.0) < 1e-3, `Vector must have unit length, got ${unitLength}`);

      joystick.detach();
    });

    it('4.4: Multi-touch rejection and pointer isolation', () => {
      const container = createMockCanvas(400, 400);

      const joystick = new VirtualJoystick({ maxRadius: 50, floating: true });
      joystick.attach(container);

      // Primary touch (pointerId 1) at (100, 100)
      container.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 100, pointerType: 'touch' } as any);

      // Secondary touch (pointerId 2) attempted at (300, 300)
      container.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 300, clientY: 300, pointerType: 'touch' } as any);

      // State must retain primary pointer ID and origin
      const state = joystick.getState();
      assert.strictEqual(state.pointerId, 1, 'Joystick must lock to initial pointer ID 1');
      assert.strictEqual(state.originX, 100, 'Origin must remain at pointer 1 location');

      // Pointer 2 move events must be ignored
      window.dispatchEvent({ type: 'pointermove', pointerId: 2, clientX: 350, clientY: 350, pointerType: 'touch' } as any);
      assert.strictEqual(joystick.getVector().magnitude, 0, 'Pointer 2 movement must not alter vector');

      // Pointer 1 move events update properly
      window.dispatchEvent({ type: 'pointermove', pointerId: 1, clientX: 150, clientY: 100, pointerType: 'touch' } as any);
      assert.strictEqual(joystick.getVector().magnitude, 1.0, 'Pointer 1 movement updates vector');

      joystick.detach();
    });

    it('4.5: Release / blur resets joystick state cleanly', () => {
      const container = createMockCanvas(400, 400);

      const joystick = new VirtualJoystick({ maxRadius: 50, floating: true });
      joystick.attach(container);

      container.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 100, pointerType: 'touch' } as any);
      window.dispatchEvent({ type: 'pointermove', pointerId: 1, clientX: 140, clientY: 100, pointerType: 'touch' } as any);
      assert.ok(joystick.getVector().active);

      // Pointer up
      window.dispatchEvent({ type: 'pointerup', pointerId: 1, clientX: 140, clientY: 100, pointerType: 'touch' } as any);
      const releasedVec = joystick.getVector();
      assert.strictEqual(releasedVec.active, false, 'Active must be false on release');
      assert.strictEqual(releasedVec.x, 0, 'Vector X must reset to 0');
      assert.strictEqual(releasedVec.y, 0, 'Vector Y must reset to 0');
      assert.strictEqual(releasedVec.magnitude, 0, 'Magnitude must reset to 0');

      joystick.detach();
    });

    it('4.6: Floating joystick touch integration in Shachiku Spiral engine input sync', () => {
      const canvas = createMockCanvas(640, 640);
      const engine = new SpiralEngine(canvas, createMockAudio(), {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: () => {},
      });
      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });

      const joystick = new VirtualJoystick({ maxRadius: 48, deadzone: 0.08, floating: true });
      joystick.attach(canvas);

      // Touch down at (320, 320) and drag right to (368, 320)
      canvas.dispatchEvent({ type: 'pointerdown', pointerId: 10, clientX: 320, clientY: 320, pointerType: 'touch' } as any);
      window.dispatchEvent({ type: 'pointermove', pointerId: 10, clientX: 368, clientY: 320, pointerType: 'touch' } as any);

      const jVec = joystick.getVector();
      assert.ok(jVec.active);
      assert.ok(jVec.x > 0.9);

      // Send to engine (mimicking game component pushMove)
      engine.setMove(jVec.x, jVec.y);

      // Update engine: player should translate in positive X
      const initialPx = (engine as any).px;
      (engine as any).update(1 / 60);
      assert.ok((engine as any).px > initialPx, 'Spiral player must move right according to joystick vector');

      joystick.detach();
      engine.destroy();
    });

    it('4.7: Floating joystick touchOnly mode ignores mouse input in Shachiku Survivor', () => {
      const stage = createMockCanvas(480, 800);
      const joystick = new VirtualJoystick({
        maxRadius: 46,
        deadzone: 0.08,
        floating: true,
        touchOnly: true, // as configured in ShachikuSurvivorGame.tsx
      });
      joystick.attach(stage);

      // Mouse down event must be ignored in touchOnly mode
      stage.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 100, clientY: 200, pointerType: 'mouse' } as any);
      assert.strictEqual(joystick.getVector().active, false, 'Mouse pointerdown must be ignored when touchOnly is true');

      // Touch down event must be accepted
      stage.dispatchEvent({ type: 'pointerdown', pointerId: 3, clientX: 100, clientY: 200, pointerType: 'touch' } as any);
      assert.strictEqual(joystick.getVector().active, true, 'Touch pointerdown must activate joystick');

      window.dispatchEvent({ type: 'pointermove', pointerId: 3, clientX: 100, clientY: 150, pointerType: 'touch' } as any);
      const v = joystick.getVector();
      assert.ok(v.y < -0.9, 'Touch drag upward must produce negative Y movement vector');

      joystick.detach();
    });
  });

  // =========================================================================
  // SUITE 5: Hitstop Micro-Freezes & Non-Linear Trauma Camera Shake
  // =========================================================================
  describe('5. Juice: Hitstop Micro-Freezes & Non-Linear Trauma Camera Shake', () => {

    it('5.1: HitStopManager freezes effective delta time and calculates exact surplus on unfreeze', () => {
      const hitstop = new HitStopManager();

      // Trigger 60ms freeze
      hitstop.triggerMs(60);
      assert.ok(hitstop.isFrozen(), 'Hitstop must be frozen initially');
      assert.strictEqual(hitstop.getTimeRemaining(), 0.06);

      // Frame 1 (16ms elapsed): remaining 44ms -> frozen, effectiveDt = 0
      const f1 = hitstop.update(0.016);
      assert.strictEqual(f1.frozen, true);
      assert.strictEqual(f1.effectiveDt, 0);

      // Frame 2 (16ms elapsed): remaining 28ms -> frozen, effectiveDt = 0
      const f2 = hitstop.update(0.016);
      assert.strictEqual(f2.frozen, true);
      assert.strictEqual(f2.effectiveDt, 0);

      // Frame 3 (16ms elapsed): remaining 12ms -> frozen, effectiveDt = 0
      const f3 = hitstop.update(0.016);
      assert.strictEqual(f3.frozen, true);
      assert.strictEqual(f3.effectiveDt, 0);

      // Frame 4 (16ms elapsed): 16ms > 12ms -> unfreezes! Surplus = 4ms (0.004s)
      const f4 = hitstop.update(0.016);
      assert.strictEqual(f4.frozen, false);
      assert.ok(Math.abs(f4.effectiveDt - 0.004) < 1e-4, `Expected surplus 0.004s, got ${f4.effectiveDt}`);

      // Frame 5 (normal 16ms frame after unfreeze): frozen = false, effectiveDt = 16ms
      const f5 = hitstop.update(0.016);
      assert.strictEqual(f5.frozen, false);
      assert.strictEqual(f5.effectiveDt, 0.016);
    });

    it('5.2: HitStopManager concurrent trigger preserves maximum duration without runaway accumulation', () => {
      const hitstop = new HitStopManager();

      hitstop.triggerMs(30); // 30ms remaining
      hitstop.update(0.010); // 20ms remaining

      // Triggering smaller duration (10ms) does NOT shorten the remaining 20ms
      hitstop.triggerMs(10);
      assert.ok(Math.abs(hitstop.getTimeRemaining() - 0.020) < 1e-4);

      // Triggering larger duration (80ms) extends to 80ms (does NOT add to 100ms)
      hitstop.triggerMs(80);
      assert.ok(Math.abs(hitstop.getTimeRemaining() - 0.080) < 1e-4);
    });

    it('5.3: TraumaScreenShake quadratic intensity curve ($intensity = trauma^2$)', () => {
      const shake = new TraumaScreenShake({ exponent: 2, decayRate: 1.4 });

      // Test intensity across range [0, 1]
      const testCases = [
        { trauma: 0.0, expectedIntensity: 0.0 },
        { trauma: 0.2, expectedIntensity: 0.04 },
        { trauma: 0.5, expectedIntensity: 0.25 },
        { trauma: 0.8, expectedIntensity: 0.64 },
        { trauma: 1.0, expectedIntensity: 1.00 },
      ];

      for (const tc of testCases) {
        shake.setTrauma(tc.trauma);
        const intensity = shake.getIntensity();
        assert.ok(
          Math.abs(intensity - tc.expectedIntensity) < 1e-4,
          `Trauma ${tc.trauma} gave intensity ${intensity}, expected ${tc.expectedIntensity}`
        );
      }
    });

    it('5.4: TraumaScreenShake translational and rotational bounds are strictly respected', () => {
      const maxOffset = 18;
      const maxAngle = 0.05;
      const shake = new TraumaScreenShake({
        maxOffset,
        maxAngle,
        decayRate: 0, // disable decay during bound check
      });

      shake.setTrauma(1.0); // full trauma

      // Sample 1,000 continuous updates across harmonic noise cycles
      for (let i = 0; i < 1000; i++) {
        const offset = shake.update(0.016);

        assert.ok(
          Math.abs(offset.offsetX) <= maxOffset + 1e-4,
          `offsetX ${offset.offsetX} exceeded maxOffset ${maxOffset}`
        );
        assert.ok(
          Math.abs(offset.offsetY) <= maxOffset + 1e-4,
          `offsetY ${offset.offsetY} exceeded maxOffset ${maxOffset}`
        );
        assert.ok(
          Math.abs(offset.angle) <= maxAngle + 1e-4,
          `angle ${offset.angle} exceeded maxAngle ${maxAngle}`
        );
      }
    });

    it('5.5: Linear decay cleanly settles to zero with zero-drift guarantee', () => {
      const decayRate = 1.4;
      const shake = new TraumaScreenShake({
        decayRate,
        exponent: 2,
      });

      shake.setTrauma(1.0);

      // Duration to decay 1.0 at 1.4/s is 1.0 / 1.4 = 0.714s
      // Step 50 frames of 16ms (0.80s total)
      for (let i = 0; i < 50; i++) {
        shake.update(0.016);
      }

      assert.strictEqual(shake.getTrauma(), 0, 'Trauma must decay to exactly 0');
      assert.strictEqual(shake.getIntensity(), 0, 'Intensity must be 0');

      const offset = shake.getOffset();
      assert.strictEqual(offset.offsetX, 0, 'offsetX must be exactly 0 after settle');
      assert.strictEqual(offset.offsetY, 0, 'offsetY must be exactly 0 after settle');
      assert.strictEqual(offset.angle, 0, 'angle must be exactly 0 after settle');
    });
  });
});
