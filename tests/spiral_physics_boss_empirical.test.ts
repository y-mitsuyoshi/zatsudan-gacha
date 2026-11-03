/**
 * Empirical Verification & Stress Harness:
 * Shachiku Spiral Follow Physics (Distance-Verlet 22-segment chains),
 * Anti-Insta-Wipe Boss Mechanics, and Wave 15 Golden Executive Barrier Deflection.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpiralEngine } from '../src/game/spiral/engine';
import { setupTestEnvironment, createMockCanvas, createMockAudio } from './e2e/testEnv';

// Setup headless browser mocks
setupTestEnvironment();

function createEngine(): SpiralEngine {
  const canvas = createMockCanvas(640, 640);
  const audio = createMockAudio();
  const engine = new SpiralEngine(canvas, audio, {
    onHud: () => {},
    onBuild: (b) => {
      if (b.choices.length > 0) engine.applyUpgrade(b.choices[0]);
    },
    onGameOver: () => {},
    onBanner: () => {},
  });
  engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
  return engine;
}

describe('Empirical Verification: Shachiku Spiral Follow Physics & Boss Mechanics', () => {

  // =========================================================================
  // 1. Distance-Verlet Follow Physics (22-segment chains)
  // =========================================================================
  describe('1. Distance-Verlet Follow Physics on 22-Segment Chains', () => {
    it('1.1: 22-segment chain maintains stable segment distances across 300 simulation steps', () => {
      const engine = createEngine();
      const anyEngine = engine as any;

      anyEngine.chains = [];
      anyEngine.spawnChain('president');
      assert.strictEqual(anyEngine.chains.length, 1);

      const chain = anyEngine.chains[0];
      assert.strictEqual(chain.segs.length, 22, 'President chain must have exactly 22 segments');

      const spacing = chain.segRadius * 1.7; // 17 * 1.7 = 28.9
      const maxAllowedClamp = spacing * 1.15 + 0.01; // 33.235 + tolerance

      const allDistances: number[] = [];
      let minObservedDist = Infinity;
      let maxObservedDist = -Infinity;

      // Step follow physics simulation for 300 frames (5.0 seconds at 60fps)
      for (let frame = 0; frame < 300; frame++) {
        anyEngine.updateChains(1 / 60);

        for (let i = 1; i < chain.segs.length; i++) {
          const prev = chain.segs[i - 1];
          const curr = chain.segs[i];
          const dist = Math.hypot(prev.x - curr.x, prev.y - curr.y);

          assert.ok(!Number.isNaN(dist), `Segment ${i} distance is NaN at frame ${frame}`);
          assert.ok(Number.isFinite(dist), `Segment ${i} distance is Infinite at frame ${frame}`);

          allDistances.push(dist);
          if (dist < minObservedDist) minObservedDist = dist;
          if (dist > maxObservedDist) maxObservedDist = dist;

          // Verify distance-Verlet hard clamp bound
          assert.ok(
            dist <= maxAllowedClamp,
            `Joint ${i - 1}->${i} stretched to ${dist.toFixed(2)}px (limit: ${maxAllowedClamp.toFixed(2)}px) at frame ${frame}`
          );
          // Verify no collapse or inversion
          assert.ok(
            dist > 5.0,
            `Joint ${i - 1}->${i} collapsed to ${dist.toFixed(2)}px at frame ${frame}`
          );
        }
      }

      const meanDist = allDistances.reduce((a, b) => a + b, 0) / allDistances.length;
      console.log(`[Follow Physics Baseline] Spacing: ${spacing.toFixed(2)}px, Min: ${minObservedDist.toFixed(2)}px, Max: ${maxObservedDist.toFixed(2)}px, Mean: ${meanDist.toFixed(2)}px, Samples: ${allDistances.length}`);

      assert.ok(meanDist > spacing * 0.85 && meanDist < maxAllowedClamp, 'Mean distance is well within target spacing');
      engine.destroy();
    });

    it('1.2: 22-segment chain under angular acceleration and Wave 10 direction reversals maintains distance bounds without disconnecting', () => {
      const engine = createEngine();
      const anyEngine = engine as any;

      anyEngine.chains = [];
      anyEngine.spawnChain('president');
      const chain = anyEngine.chains[0];
      assert.strictEqual(chain.segs.length, 22);

      const spacing = chain.segRadius * 1.7; // 28.9
      const maxAllowedClamp = spacing * 1.15 + 0.01; // 33.24

      // Stress test: 2.5x base angular velocity (angular acceleration)
      chain.angular = 1.75;

      let reversals = 0;
      let minObservedDist = Infinity;
      let maxObservedDist = -Infinity;
      let totalDistSum = 0;
      let sampleCount = 0;

      // Simulate 360 frames (6 seconds) with direction reversals every 25 frames
      for (let frame = 0; frame < 360; frame++) {
        // Wave 10-style direction reversal
        if (frame % 25 === 0 && frame > 0) {
          chain.dir = chain.dir === 1 ? -1 : 1;
          reversals++;
        }

        anyEngine.updateChains(1 / 60);

        for (let i = 1; i < chain.segs.length; i++) {
          const prev = chain.segs[i - 1];
          const curr = chain.segs[i];
          const dist = Math.hypot(prev.x - curr.x, prev.y - curr.y);

          sampleCount++;
          totalDistSum += dist;
          if (dist < minObservedDist) minObservedDist = dist;
          if (dist > maxObservedDist) maxObservedDist = dist;

          // Must strictly adhere to clamp constraint even during sharp reversal snaps
          assert.ok(
            dist <= maxAllowedClamp,
            `Joint ${i} stretched to ${dist.toFixed(2)}px during reversal #${reversals} at frame ${frame}`
          );
          assert.ok(
            dist > 8.0,
            `Joint ${i} collapsed to ${dist.toFixed(2)}px during reversal #${reversals} at frame ${frame}`
          );
        }
      }

      const meanDist = totalDistSum / sampleCount;
      console.log(`[Follow Physics Reversals] Reversals: ${reversals}, Min: ${minObservedDist.toFixed(2)}px, Max: ${maxObservedDist.toFixed(2)}px, Mean: ${meanDist.toFixed(2)}px, Samples: ${sampleCount}`);

      assert.strictEqual(reversals, 14, 'Executed 14 full direction reversals');
      assert.ok(maxObservedDist <= maxAllowedClamp, 'Maximum distance never broke Verlet clamp constraint');
      assert.ok(minObservedDist > 8.0, 'Minimum distance never collapsed');

      engine.destroy();
    });

    it('1.3: Chain knockback impulse audit: verifies uniform segment knockback without in-place mutation defect', () => {
      const engine = createEngine();
      const anyEngine = engine as any;

      anyEngine.chains = [];
      anyEngine.spawnChain('president');
      const chain = anyEngine.chains[0];

      // Settle chain with 10 follow ticks
      for (let i = 0; i < 10; i++) anyEngine.updateChains(1 / 60);

      const targetSegIndex = 3;
      const targetSeg = chain.segs[targetSegIndex];
      const prevSegBefore = { ...chain.segs[targetSegIndex - 1] };
      const nextSegBefore = { ...chain.segs[targetSegIndex + 1] };

      // Record pre-knock delta between target and adjacent segments
      const distBeforePrev = Math.hypot(prevSegBefore.x - targetSeg.x, prevSegBefore.y - targetSeg.y);
      const distBeforeNext = Math.hypot(targetSeg.x - nextSegBefore.x, targetSeg.y - nextSegBefore.y);

      // Perform damageSeg call on targetSeg
      const fromX = targetSeg.x - 20;
      const fromY = targetSeg.y - 15;
      anyEngine.damageSeg(chain, 0, targetSegIndex, 10, 150, fromX, fromY, false);

      const prevSegAfter = chain.segs[targetSegIndex - 1];
      const targetSegAfter = chain.segs[targetSegIndex];
      const nextSegAfter = chain.segs[targetSegIndex + 1];

      // Calculate the displacement vectors applied to segments before, at, and after the target
      const dispPrev = { x: prevSegAfter.x - prevSegBefore.x, y: prevSegAfter.y - prevSegBefore.y };
      const dispTarget = { x: targetSegAfter.x - targetSeg.x, y: targetSegAfter.y - targetSeg.y };
      const dispNext = { x: nextSegAfter.x - nextSegBefore.x, y: nextSegAfter.y - nextSegBefore.y };

      const distAfterPrev = Math.hypot(prevSegAfter.x - targetSegAfter.x, prevSegAfter.y - targetSegAfter.y);
      const distAfterNext = Math.hypot(targetSegAfter.x - nextSegAfter.x, targetSegAfter.y - nextSegAfter.y);

      const prevDeltaDiff = Math.abs(distAfterPrev - distBeforePrev);
      const nextDeltaDiff = Math.abs(distAfterNext - distBeforeNext);

      console.log(`[Knockback Impulse Audit] Delta dist (prev-target): ${prevDeltaDiff.toFixed(4)}px, Delta dist (target-next): ${nextDeltaDiff.toFixed(4)}px`);
      console.log(`[Knockback Impulse Audit] Displacement prev: (${dispPrev.x.toFixed(3)}, ${dispPrev.y.toFixed(3)}), next: (${dispNext.x.toFixed(3)}, ${dispNext.y.toFixed(3)})`);

      // Detect whether the in-place mutation defect in damageSeg exists:
      const hasInPlaceMutationDefect = nextDeltaDiff > 0.001;
      if (hasInPlaceMutationDefect) {
        console.warn(`[DEFECT DETECTED] damageSeg mutates segment s in-place during the loop, creating an asymmetrical knock impulse of ${nextDeltaDiff.toFixed(3)}px on downstream segments!`);
      }

      // Assert that physical impulse is strictly uniform (dispPrev == dispNext) and no defect exists
      assert.strictEqual(
        hasInPlaceMutationDefect,
        false,
        'Knockback impulse must be uniform across all segments'
      );
      assert.ok(Math.abs(dispPrev.x - dispNext.x) < 1e-6, 'X displacement is strictly uniform');
      assert.ok(Math.abs(dispPrev.y - dispNext.y) < 1e-6, 'Y displacement is strictly uniform');
      assert.ok(nextDeltaDiff < 1e-4, 'Inter-segment distance preserved under uniform translation');

      engine.destroy();
    });
  });

  // =========================================================================
  // 2. Anti-Insta-Wipe Boss Mechanics
  // =========================================================================
  describe('2. Anti-Insta-Wipe Boss Mechanics', () => {
    it('2.1: Destroying boss head triggers 1.5s stun, shockwave ring, mini-head promotion without collapsing body segments', () => {
      const engine = createEngine();
      const anyEngine = engine as any;

      anyEngine.chains = [];
      anyEngine.spawnChain('president');
      const chain = anyEngine.chains[0];
      assert.strictEqual(chain.segs.length, 22);

      const initialHead = chain.segs[0];
      const initialHeadX = initialHead.x;
      const initialHeadY = initialHead.y;
      const initialSecondSegRadius = chain.segs[1].radius;
      const initialSecondSegMaxHp = chain.segs[1].maxHp;

      const initialRingsCount = anyEngine.rings.length;

      // Inflict lethal damage directly to the boss head
      anyEngine.killSeg(chain, 0, 0);

      // 1. Check Anti-Insta-Wipe: body segments do NOT collapse!
      assert.strictEqual(chain.segs.length, 21, 'Remaining 21 body segments must NOT collapse when head is destroyed');

      // 2. Check 1.5s Stun
      assert.strictEqual(chain.stunT, 1.5, 'Chain must receive exactly 1.5s stun on head destruction');

      // 3. Check Shockwave ring spawned
      assert.strictEqual(anyEngine.rings.length, initialRingsCount + 1, 'Shockwave ring must be spawned');
      const spawnedRing = anyEngine.rings[anyEngine.rings.length - 1];
      assert.strictEqual(spawnedRing.color, '251,191,36', 'Shockwave ring must be gold executive color');
      assert.strictEqual(spawnedRing.dur, 0.45, 'Shockwave ring duration must be 0.45s');
      assert.strictEqual(spawnedRing.maxR, 85, 'Shockwave ring max radius must be 85px');
      assert.strictEqual(spawnedRing.x, initialHeadX, 'Shockwave ring origin X matches destroyed head');
      assert.strictEqual(spawnedRing.y, initialHeadY, 'Shockwave ring origin Y matches destroyed head');

      // 4. Check Mini-Head Promotion
      const promotedHead = chain.segs[0];
      assert.ok(promotedHead.radius > initialSecondSegRadius, 'Promoted mini-head must have increased radius');
      assert.strictEqual(promotedHead.radius, Math.min(18, initialSecondSegRadius + 2), 'Radius promoted by +2 (clamped to 18)');
      assert.strictEqual(promotedHead.maxHp, Math.round(initialSecondSegMaxHp * 1.6), 'Promoted mini-head receives 1.6x maxHp buff');
      assert.strictEqual(promotedHead.hp, promotedHead.maxHp, 'Promoted mini-head is fully healed');

      // 5. Verify adjacent segment splash damage (within 45px)
      // Check that remaining segments are intact with hp >= 1
      for (let i = 0; i < chain.segs.length; i++) {
        assert.ok(chain.segs[i].hp >= 1, `Segment ${i} must have positive HP`);
      }

      engine.destroy();
    });

    it('2.2: Stun freezes chain trajectory during 1.5s duration and resumes cleanly afterwards', () => {
      const engine = createEngine();
      const anyEngine = engine as any;

      anyEngine.chains = [];
      anyEngine.spawnChain('bossMid');
      const chain = anyEngine.chains[0];
      assert.strictEqual(chain.segs.length, 12);

      // Trigger head defeat
      anyEngine.killSeg(chain, 0, 0);
      assert.strictEqual(chain.stunT, 1.5);

      const stunHeadX = chain.segs[0].x;
      const stunHeadY = chain.segs[0].y;
      const stunRadius = chain.r;
      const stunTheta = chain.theta;

      // Advance 60 frames (1.0 second of simulation)
      for (let f = 0; f < 60; f++) {
        anyEngine.updateChains(1 / 60);
      }

      // stunT should have decreased by ~1.0s, remaining ~0.5s
      assert.ok(chain.stunT > 0.45 && chain.stunT < 0.55, `stunT should be ~0.5s, got ${chain.stunT}`);
      // Coordinates and spiral parameters should have remained completely frozen
      assert.strictEqual(chain.r, stunRadius, 'Radial position frozen during stun');
      assert.strictEqual(chain.theta, stunTheta, 'Theta frozen during stun');
      assert.strictEqual(chain.segs[0].x, stunHeadX, 'Head X frozen during stun');
      assert.strictEqual(chain.segs[0].y, stunHeadY, 'Head Y frozen during stun');

      // Advance another 35 frames (~0.58 seconds) to expire stun
      for (let f = 0; f < 35; f++) {
        anyEngine.updateChains(1 / 60);
      }

      assert.ok(chain.stunT <= 0, 'Stun expired');
      // Movement should have resumed
      assert.ok(chain.r < stunRadius, 'Chain resumed spiral inward movement');
      assert.ok(chain.theta !== stunTheta, 'Chain resumed angular rotation');

      engine.destroy();
    });
  });

  // =========================================================================
  // 3. Wave 15 President Golden Executive Barrier Frontal Deflection
  // =========================================================================
  describe('3. Wave 15 President Golden Executive Barrier Frontal Damage Deflection', () => {
    it('3.1: Frontal angle attacks are fully absorbed by executive barrier without damaging head HP', () => {
      const engine = createEngine();
      const anyEngine = engine as any;

      anyEngine.chains = [];
      anyEngine.spawnChain('president');
      const chain = anyEngine.chains[0];
      assert.strictEqual(chain.kind, 'president');
      assert.strictEqual(chain.bossState.barrierActive, true);

      const initialBarrierHp = chain.bossState.barrierHp;
      const head = chain.segs[0];
      const initialHeadHp = head.hp;

      assert.ok(initialBarrierHp > 0, 'President barrier HP initialized');

      // Update one frame to establish barrier angle
      anyEngine.updateChains(1 / 60);
      const barrierAngle = chain.bossState.barrierAngle;

      // Attack from direct front (along barrier angle)
      const attackDist = 40;
      const fromX = head.x + Math.cos(barrierAngle) * attackDist;
      const fromY = head.y + Math.sin(barrierAngle) * attackDist;

      // Deal 80 frontal damage
      anyEngine.damageSeg(chain, 0, 0, 80, 50, fromX, fromY, false);

      // Barrier absorbs 80 damage; Head takes 0 damage
      assert.strictEqual(head.hp, initialHeadHp, 'Frontal attack must NOT damage head HP');
      assert.strictEqual(chain.bossState.barrierHp, initialBarrierHp - 80, 'Barrier HP absorbed 80 damage');
      assert.strictEqual(chain.bossState.barrierActive, true, 'Barrier remains active');

      engine.destroy();
    });

    it('3.2: Flank and rear attacks bypass executive barrier and damage head HP directly', () => {
      const engine = createEngine();
      const anyEngine = engine as any;

      anyEngine.chains = [];
      anyEngine.spawnChain('president');
      const chain = anyEngine.chains[0];
      anyEngine.updateChains(1 / 60);

      const barrierAngle = chain.bossState.barrierAngle;
      const head = chain.segs[0];
      const initialBarrierHp = chain.bossState.barrierHp;
      const initialHeadHp = head.hp;

      // Attack from direct rear (barrierAngle + PI, 180 degrees away)
      const rearAngle = barrierAngle + Math.PI;
      const fromX = head.x + Math.cos(rearAngle) * 40;
      const fromY = head.y + Math.sin(rearAngle) * 40;

      // Deal 45 rear damage
      anyEngine.damageSeg(chain, 0, 0, 45, 50, fromX, fromY, false);

      // Barrier is bypassed: barrier HP unchanged, head takes 45 damage
      assert.strictEqual(chain.bossState.barrierHp, initialBarrierHp, 'Rear attack must NOT affect barrier HP');
      assert.strictEqual(head.hp, initialHeadHp - 45, 'Rear attack must deal direct damage to head HP');

      engine.destroy();
    });

    it('3.3: Depleting barrier HP breaks executive barrier and exposes head to subsequent frontal damage', () => {
      let bannerDispatched = false;
      let bannerTitle = '';
      const canvas = createMockCanvas(640, 640);
      const audio = createMockAudio();
      const engine = new SpiralEngine(canvas, audio, {
        onHud: () => {},
        onBuild: () => {},
        onGameOver: () => {},
        onBanner: (title) => {
          bannerDispatched = true;
          bannerTitle = title;
        },
      });
      engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
      const anyEngine = engine as any;

      anyEngine.chains = [];
      anyEngine.spawnChain('president');
      const chain = anyEngine.chains[0];
      anyEngine.updateChains(1 / 60);

      const barrierAngle = chain.bossState.barrierAngle;
      const head = chain.segs[0];
      const initialBarrierHp = chain.bossState.barrierHp;
      const initialHeadHp = head.hp;

      const fromX = head.x + Math.cos(barrierAngle) * 40;
      const fromY = head.y + Math.sin(barrierAngle) * 40;

      // Deal lethal damage to barrier (initialBarrierHp + 50)
      anyEngine.damageSeg(chain, 0, 0, initialBarrierHp + 50, 50, fromX, fromY, false);

      // Barrier must break
      assert.strictEqual(chain.bossState.barrierHp, 0, 'Barrier HP reduced to 0');
      assert.strictEqual(chain.bossState.barrierActive, false, 'Barrier marked inactive');
      assert.ok(bannerDispatched, 'Banner notification dispatched upon barrier break');
      assert.strictEqual(bannerTitle, '役員バリア破壊！', 'Correct banner title displayed');
      assert.strictEqual(head.hp, initialHeadHp, 'Breaking attack damage absorbed by barrier collapse');

      // Subsequent frontal attack now directly penetrates to head!
      anyEngine.damageSeg(chain, 0, 0, 60, 50, fromX, fromY, false);
      assert.strictEqual(head.hp, initialHeadHp - 60, 'Frontal attack penetrates now that barrier is destroyed');

      engine.destroy();
    });
  });
});
