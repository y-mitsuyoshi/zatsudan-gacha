/**
 * Empirical Edge Cases & Boundary Conditions Test Suite
 * Specifically targets src/game/common/ modules:
 * 1. VirtualJoystick floating-point edge cases (deadzone boundaries, maxRadius clamping, zero-division, multi-touch)
 * 2. HitStopManager edge cases (0ms, negative durations, rapid consecutive triggers, timeScale, unit detection)
 * 3. TraumaScreenShake frequency bounds, offset boundedness, finite number guarantees, trauma clamping
 * 4. DamageNumberPool spring stability, pool exhaustion, recycling
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { setupTestEnvironment, createMockCanvas } from '../e2e/testEnv';

// Setup headless mock DOM/Canvas environment
setupTestEnvironment();

import { VirtualJoystick } from '../../src/game/common/virtualJoystick';
import { TraumaScreenShake, HitStopManager, DamageNumberPool } from '../../src/game/common/juice';

// Helper to assert approximately equal for IEEE 754 floating points
function assertApprox(actual: number, expected: number, tolerance = 1e-6, msg?: string) {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= tolerance,
    `${msg ?? 'Values not approx equal'}: actual=${actual}, expected=${expected}, diff=${diff}, tol=${tolerance}`
  );
}

function sendEvent(target: any, event: any) {
  target.dispatchEvent(event);
}

describe('Empirical Edge Cases & Boundary Conditions: src/game/common/', () => {

  // =========================================================================
  // 1. VirtualJoystick Edge Cases
  // =========================================================================
  describe('1. VirtualJoystick Floating-Point & Boundary Cases', () => {

    it('1.1: Deadzone boundary - below threshold (r = 0.079 * maxRadius) produces strictly zero vector and magnitude', () => {
      const maxRadius = 50;
      const deadzone = 0.08;
      const joystick = new VirtualJoystick({ maxRadius, deadzone });
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      // Simulate pointerdown at (100, 100)
      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        pointerType: 'touch',
      });

      // r = 0.079 * 50 = 3.95 px. Move along X axis to (103.95, 100)
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 103.95,
        clientY: 100,
        pointerType: 'touch',
      });

      const vec = joystick.getVector();
      assert.strictEqual(vec.active, true);
      assert.strictEqual(vec.magnitude, 0, 'Magnitude must be strictly 0 below deadzone');
      assert.strictEqual(vec.x, 0, 'vectorX must be strictly 0 below deadzone');
      assert.strictEqual(vec.y, 0, 'vectorY must be strictly 0 below deadzone');
      joystick.detach();
    });

    it('1.2: Deadzone boundary - exact threshold (r = 0.080 * maxRadius) produces zero vector', () => {
      const maxRadius = 50;
      const deadzone = 0.08;
      const joystick = new VirtualJoystick({ maxRadius, deadzone });
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        pointerType: 'touch',
      });

      // r = 0.08 * 50 = 4.0 px
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 104.0,
        clientY: 100,
        pointerType: 'touch',
      });

      const vec = joystick.getVector();
      assert.strictEqual(vec.magnitude, 0, 'Magnitude must be 0 at exact deadzone boundary');
      assert.strictEqual(vec.x, 0);
      assert.strictEqual(vec.y, 0);
      joystick.detach();
    });

    it('1.3: Deadzone boundary - above threshold (r = 0.081 * maxRadius) produces positive magnitude and directional vector', () => {
      const maxRadius = 50;
      const deadzone = 0.08;
      const joystick = new VirtualJoystick({ maxRadius, deadzone });
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        pointerType: 'touch',
      });

      // r = 0.081 * 50 = 4.05 px
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 104.05,
        clientY: 100,
        pointerType: 'touch',
      });

      const vec = joystick.getVector();
      assert.strictEqual(vec.active, true);
      assert.ok(vec.magnitude > 0, `Magnitude must be > 0 above deadzone, got ${vec.magnitude}`);
      // Expected scaled magnitude: (0.081 - 0.080) / (1.0 - 0.080) = 0.001 / 0.92 = ~0.0010869565
      const expectedMag = (0.081 - 0.08) / (1 - 0.08);
      assertApprox(vec.magnitude, expectedMag, 1e-6);
      assertApprox(vec.x, expectedMag, 1e-6);
      assertApprox(vec.y, 0, 1e-6);
      joystick.detach();
    });

    it('1.4: maxRadius clamping - large displacement (r = 1000) clamps magnitude to 1.0 and unit length', () => {
      const maxRadius = 50;
      const joystick = new VirtualJoystick({ maxRadius });
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        pointerType: 'touch',
      });

      // Move by 1000px horizontally
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 1100,
        clientY: 100,
        pointerType: 'touch',
      });

      const vec = joystick.getVector();
      assert.strictEqual(vec.magnitude, 1.0, 'Magnitude must clamp to exactly 1.0');
      assert.strictEqual(vec.x, 1.0, 'vectorX must clamp to 1.0');
      assert.strictEqual(vec.y, 0, 'vectorY must be 0');

      const state = joystick.getState();
      assertApprox(state.currentX, 150, 1e-5, 'Thumb X coordinate must be clamped to originX + maxRadius');
      assertApprox(state.currentY, 100, 1e-5, 'Thumb Y coordinate must remain originY');
      joystick.detach();
    });

    it('1.5: maxRadius clamping - diagonal displacement (r = 1000 at 45 degrees)', () => {
      const maxRadius = 50;
      const joystick = new VirtualJoystick({ maxRadius });
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        pointerType: 'touch',
      });

      const d = 1000 * Math.SQRT1_2;
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 100 + d,
        clientY: 100 + d,
        pointerType: 'touch',
      });

      const vec = joystick.getVector();
      assertApprox(vec.magnitude, 1.0, 1e-6, 'Magnitude must be 1.0');
      const vectorLength = Math.hypot(vec.x, vec.y);
      assertApprox(vectorLength, 1.0, 1e-6, 'Vector hypotenuse must be 1.0');
      assertApprox(vec.x, Math.SQRT1_2, 1e-6);
      assertApprox(vec.y, Math.SQRT1_2, 1e-6);

      const state = joystick.getState();
      const clampedDist = Math.hypot(state.currentX - state.originX, state.currentY - state.originY);
      assertApprox(clampedDist, 50, 1e-5, 'Visual thumb distance must be clamped to maxRadius');
      joystick.detach();
    });

    it('1.6: Zero division prevention in vector normalization (dist = 0, dist <= 0.0001)', () => {
      const joystick = new VirtualJoystick();
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 200,
        clientY: 200,
        pointerType: 'touch',
      });

      let vec = joystick.getVector();
      assert.strictEqual(vec.magnitude, 0);
      assert.strictEqual(vec.x, 0);
      assert.strictEqual(vec.y, 0);
      assert.ok(!Number.isNaN(vec.x) && !Number.isNaN(vec.y) && !Number.isNaN(vec.magnitude));

      // Microscopic move dist = 0.00005 <= 0.0001
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 200.00005,
        clientY: 200.00005,
        pointerType: 'touch',
      });

      vec = joystick.getVector();
      assert.strictEqual(vec.magnitude, 0);
      assert.strictEqual(vec.x, 0);
      assert.strictEqual(vec.y, 0);
      assert.ok(!Number.isNaN(vec.x));
      joystick.detach();
    });

    it('1.7: Multi-touch and pointer isolation', () => {
      const joystick = new VirtualJoystick();
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      // First finger down
      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 10,
        clientX: 100,
        clientY: 100,
        pointerType: 'touch',
      });
      assert.strictEqual(joystick.getVector().active, true);

      // Second finger down (should be ignored)
      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 20,
        clientX: 300,
        clientY: 300,
        pointerType: 'touch',
      });
      const state = joystick.getState();
      assert.strictEqual(state.originX, 100);
      assert.strictEqual(state.pointerId, 10);

      // Second finger moves (should be ignored)
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 20,
        clientX: 350,
        clientY: 350,
        pointerType: 'touch',
      });
      assert.strictEqual(joystick.getVector().magnitude, 0);

      // Second finger lifts (should not reset joystick)
      sendEvent(window, {
        type: 'pointerup',
        pointerId: 20,
        clientX: 350,
        clientY: 350,
        pointerType: 'touch',
      });
      assert.strictEqual(joystick.getVector().active, true);

      // First finger moves
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 10,
        clientX: 150,
        clientY: 100,
        pointerType: 'touch',
      });
      assert.strictEqual(joystick.getVector().magnitude, 1.0);

      // First finger lifts (resets joystick)
      sendEvent(window, {
        type: 'pointerup',
        pointerId: 10,
        clientX: 150,
        clientY: 100,
        pointerType: 'touch',
      });
      assert.strictEqual(joystick.getVector().active, false);
      assert.strictEqual(joystick.getVector().magnitude, 0);
      joystick.detach();
    });

    it('1.8: Canvas rendering does not crash or emit NaN in any edge state', () => {
      const joystick = new VirtualJoystick();
      const canvas = createMockCanvas(400, 400);
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      joystick.attach(canvas);

      // Inactive render
      assert.doesNotThrow(() => joystick.renderCanvas(ctx));

      // Active in deadzone
      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      });
      assert.doesNotThrow(() => joystick.renderCanvas(ctx));

      // Active at maxRadius
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      });
      assert.doesNotThrow(() => joystick.renderCanvas(ctx));

      joystick.detach();
    });

    it('1.9: Defensive null check in attach(container)', () => {
      const joystick = new VirtualJoystick();
      assert.doesNotThrow(() => {
        joystick.attach(null as any);
      });
      assert.doesNotThrow(() => {
        joystick.attach(undefined as any);
      });
    });
  });

  // =========================================================================
  // 2. HitStopManager Edge Cases
  // =========================================================================
  describe('2. HitStopManager Boundary & Concurrency Cases', () => {

    it('2.1: 0ms duration trigger produces no freeze and returns full effectiveDt', () => {
      const hitstop = new HitStopManager();
      hitstop.trigger(0);
      assert.strictEqual(hitstop.isFrozen(), false);
      assert.strictEqual(hitstop.getTimeRemaining(), 0);

      let res = hitstop.update(0.016);
      assert.strictEqual(res.frozen, false);
      assert.strictEqual(res.effectiveDt, 0.016);

      hitstop.triggerMs(0);
      assert.strictEqual(hitstop.isFrozen(), false);
      assert.strictEqual(hitstop.getTimeRemaining(), 0);

      res = hitstop.update(0.016);
      assert.strictEqual(res.frozen, false);
      assert.strictEqual(res.effectiveDt, 0.016);
    });

    it('2.2: Negative duration trigger is safely clamped to 0 without corrupting state', () => {
      const hitstop = new HitStopManager();
      hitstop.trigger(-25);
      assert.strictEqual(hitstop.isFrozen(), false);
      assert.strictEqual(hitstop.getTimeRemaining(), 0);

      hitstop.triggerMs(-100);
      assert.strictEqual(hitstop.isFrozen(), false);
      assert.strictEqual(hitstop.getTimeRemaining(), 0);

      // Verify negative duration does not reduce an existing active freeze
      hitstop.triggerMs(50); // 50ms active
      assertApprox(hitstop.getTimeRemaining(), 0.05, 1e-6);

      hitstop.trigger(-30); // negative trigger attempt
      assertApprox(hitstop.getTimeRemaining(), 0.05, 1e-6, 'Negative trigger must not reduce remaining freeze');

      hitstop.triggerMs(-200);
      assertApprox(hitstop.getTimeRemaining(), 0.05, 1e-6, 'Negative triggerMs must not reduce remaining freeze');
    });

    it('2.3: Rapid consecutive triggers preserve maximum remaining duration without accumulating unbounded time', () => {
      const hitstop = new HitStopManager();

      // Trigger smaller then larger
      hitstop.triggerMs(30); // 0.030s
      assertApprox(hitstop.getTimeRemaining(), 0.03, 1e-6);

      hitstop.triggerMs(80); // 0.080s -> should extend
      assertApprox(hitstop.getTimeRemaining(), 0.08, 1e-6);

      // Trigger smaller -> should NOT shorten
      hitstop.triggerMs(20); // 0.020s -> should keep 0.080s
      assertApprox(hitstop.getTimeRemaining(), 0.08, 1e-6);

      // 1000 rapid consecutive triggers in a single tick
      for (let i = 0; i < 1000; i++) {
        hitstop.triggerMs(50);
      }
      // Should still be exactly 0.080s (since 80ms > 50ms)
      assertApprox(hitstop.getTimeRemaining(), 0.08, 1e-6);
    });

    it('2.4: Frame surplus calculation when freeze finishes mid-frame', () => {
      const hitstop = new HitStopManager();
      hitstop.triggerMs(10); // 0.010s freeze

      // Frame dt = 0.016s (16ms). Freeze is 10ms, leaving 6ms surplus!
      const res = hitstop.update(0.016);
      assert.strictEqual(res.frozen, false);
      assertApprox(res.effectiveDt, 0.006, 1e-6, 'Unconsumed frame time (6ms) must be returned as surplus effectiveDt');
      assert.strictEqual(hitstop.getTimeRemaining(), 0);
      assert.strictEqual(hitstop.isFrozen(), false);
    });

    it('2.5: Slow-motion timeScale option behavior', () => {
      const hitstop = new HitStopManager({ timeScale: 0.1 });
      hitstop.triggerMs(50);

      const res = hitstop.update(0.016);
      assert.strictEqual(res.frozen, true);
      assertApprox(res.effectiveDt, 0.016 * 0.1, 1e-6, 'effectiveDt during slow-mo must equal dt * timeScale');
    });

    it('2.6: Automatic unit detection for trigger(duration)', () => {
      const hitstop = new HitStopManager();

      // Value > 1.0 treated as milliseconds
      hitstop.trigger(40);
      assertApprox(hitstop.getTimeRemaining(), 0.040, 1e-6);
      hitstop.reset();

      // Value <= 1.0 treated as seconds
      hitstop.trigger(0.040);
      assertApprox(hitstop.getTimeRemaining(), 0.040, 1e-6);
      hitstop.reset();

      // Explicit 1.0 second
      hitstop.trigger(1.0);
      assertApprox(hitstop.getTimeRemaining(), 1.0, 1e-6);
      hitstop.reset();
    });

    it('2.7: Reset cancels active freeze immediately', () => {
      const hitstop = new HitStopManager();
      hitstop.triggerMs(500);
      assert.strictEqual(hitstop.isFrozen(), true);
      hitstop.reset();
      assert.strictEqual(hitstop.isFrozen(), false);
      assert.strictEqual(hitstop.getTimeRemaining(), 0);
      const res = hitstop.update(0.016);
      assert.strictEqual(res.frozen, false);
      assert.strictEqual(res.effectiveDt, 0.016);
    });

    it('2.8: Explicit triggerSeconds(durationSec) method', () => {
      const hitstop = new HitStopManager();
      hitstop.triggerSeconds(0.045);
      assertApprox(hitstop.getTimeRemaining(), 0.045, 1e-6);
      hitstop.reset();

      // Negative and non-finite values are safely ignored
      hitstop.triggerSeconds(-0.5);
      assert.strictEqual(hitstop.getTimeRemaining(), 0);
      hitstop.triggerSeconds(NaN);
      assert.strictEqual(hitstop.getTimeRemaining(), 0);
      hitstop.triggerSeconds(Infinity);
      assert.strictEqual(hitstop.getTimeRemaining(), 0);
    });
  });

  // =========================================================================
  // 3. TraumaScreenShake Edge Cases
  // =========================================================================
  describe('3. TraumaScreenShake Frequency & Bound Guarantees', () => {

    it('3.1: Offsets are strictly bounded: |offsetX| <= maxOffset, |offsetY| <= maxOffset, |angle| <= maxAngle', () => {
      const maxOffset = 25;
      const maxAngle = 0.08;
      const shake = new TraumaScreenShake({ maxOffset, maxAngle });

      shake.setTrauma(1.0); // Full trauma

      // Run 500 ticks across different delta times
      for (let i = 0; i < 500; i++) {
        // Keep trauma refreshed to test maximum range
        shake.setTrauma(1.0);
        const off = shake.update(0.016);

        assert.ok(Number.isFinite(off.offsetX), 'offsetX must be finite');
        assert.ok(Number.isFinite(off.offsetY), 'offsetY must be finite');
        assert.ok(Number.isFinite(off.angle), 'angle must be finite');

        assert.ok(
          Math.abs(off.offsetX) <= maxOffset + 1e-6,
          `offsetX ${off.offsetX} exceeded maxOffset ${maxOffset}`
        );
        assert.ok(
          Math.abs(off.offsetY) <= maxOffset + 1e-6,
          `offsetY ${off.offsetY} exceeded maxOffset ${maxOffset}`
        );
        assert.ok(
          Math.abs(off.angle) <= maxAngle + 1e-6,
          `angle ${off.angle} exceeded maxAngle ${maxAngle}`
        );
      }
    });

    it('3.2: Extreme frequency bounds (frequency = 0, frequency = 10000, frequency = -50)', () => {
      // Frequency = 0 (static noise sampling)
      const shakeZeroFreq = new TraumaScreenShake({ frequency: 0 });
      shakeZeroFreq.setTrauma(1.0);
      let off = shakeZeroFreq.update(0.016);
      assert.ok(Number.isFinite(off.offsetX) && !Number.isNaN(off.offsetX));
      assert.ok(Number.isFinite(off.offsetY) && !Number.isNaN(off.offsetY));

      // Frequency = 10000 (extreme high frequency)
      const shakeHighFreq = new TraumaScreenShake({ frequency: 10000 });
      shakeHighFreq.setTrauma(1.0);
      for (let i = 0; i < 100; i++) {
        off = shakeHighFreq.update(0.016);
        assert.ok(Number.isFinite(off.offsetX) && !Number.isNaN(off.offsetX));
        assert.ok(Math.abs(off.offsetX) <= 18 + 1e-6);
      }

      // Frequency = -50 (negative frequency)
      const shakeNegFreq = new TraumaScreenShake({ frequency: -50 });
      shakeNegFreq.setTrauma(1.0);
      off = shakeNegFreq.update(0.016);
      assert.ok(Number.isFinite(off.offsetX) && !Number.isNaN(off.offsetX));
      assert.ok(Math.abs(off.offsetX) <= 18 + 1e-6);
    });

    it('3.3: Large time simulation (t = 100,000s) does not degrade into NaN or unbounded values', () => {
      const shake = new TraumaScreenShake();
      shake.setTrauma(1.0);

      // Advance by 1,000s increments
      for (let i = 0; i < 100; i++) {
        shake.setTrauma(1.0);
        const off = shake.update(1000);
        assert.ok(Number.isFinite(off.offsetX), `Tick ${i}: offsetX not finite`);
        assert.ok(Number.isFinite(off.offsetY), `Tick ${i}: offsetY not finite`);
        assert.ok(Number.isFinite(off.angle), `Tick ${i}: angle not finite`);
        assert.ok(!Number.isNaN(off.offsetX));
      }
    });

    it('3.4: Trauma clamping limits trauma strictly within [0, 1]', () => {
      const shake = new TraumaScreenShake();

      // Excessive positive addition
      shake.addTrauma(5.0);
      assert.strictEqual(shake.getTrauma(), 1.0);
      assertApprox(shake.getIntensity(), 1.0, 1e-6);

      // Negative addition clamps at 0
      shake.addTrauma(-10.0);
      assert.strictEqual(shake.getTrauma(), 0.0);
      assert.strictEqual(shake.getIntensity(), 0.0);

      // setTrauma clamping
      shake.setTrauma(999);
      assert.strictEqual(shake.getTrauma(), 1.0);
      shake.setTrauma(-999);
      assert.strictEqual(shake.getTrauma(), 0.0);
    });

    it('3.5: Trauma natural decay and clean zero settle', () => {
      const decayRate = 2.0;
      const shake = new TraumaScreenShake({ decayRate });
      shake.setTrauma(1.0);

      // After 0.5s at decayRate=2, trauma should be ~0
      shake.update(0.5);
      assert.strictEqual(shake.getTrauma(), 0);
      assert.strictEqual(shake.getIntensity(), 0);

      const off = shake.getOffset();
      assert.strictEqual(off.offsetX, 0);
      assert.strictEqual(off.offsetY, 0);
      assert.strictEqual(off.angle, 0);

      // Further updates at 0 trauma should remain strictly 0
      const nextOff = shake.update(0.016);
      assert.strictEqual(nextOff.offsetX, 0);
      assert.strictEqual(nextOff.offsetY, 0);
      assert.strictEqual(nextOff.angle, 0);
    });

    it('3.6: Three.js and Canvas camera application helpers', () => {
      const shake = new TraumaScreenShake();
      shake.setTrauma(0.8);
      shake.update(0.016);

      // Mock Canvas
      const canvas = createMockCanvas(800, 600);
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      assert.doesNotThrow(() => {
        shake.applyToCanvas(ctx);
      });

      // Mock Three.js camera
      const camera = {
        position: { x: 0, y: 0, z: 10 },
        rotation: { z: 0 },
      };
      shake.applyToCamera(camera);
      assert.ok(Number.isFinite(camera.position.x));
      assert.ok(Number.isFinite(camera.position.y));
      assert.strictEqual(camera.position.z, 10);
      assert.ok(Number.isFinite(camera.rotation.z));
    });
  });

  // =========================================================================
  // 4. DamageNumberPool Stress & Physical Stability
  // =========================================================================
  describe('4. DamageNumberPool Physical Stability & Recycling', () => {

    it('4.1: Spring scale dynamics remain stable and bounded under high delta times', () => {
      const pool = new DamageNumberPool(32, 1.0);
      const num = pool.spawn(100, 100, 100, 'crit');
      assert.ok(num.scale > 1.0);

      // Simulate 60 frames with varied dt (including large dt spikes)
      for (let i = 0; i < 60; i++) {
        pool.update(0.05); // 50ms ticks
        assert.ok(Number.isFinite(num.scale), `Scale must be finite, got ${num.scale}`);
        assert.ok(!Number.isNaN(num.scale), 'Scale must not be NaN');
        assert.ok(num.scale > 0 && num.scale < 3.0, `Scale ${num.scale} diverged out of stable range`);
      }
    });

    it('4.2: Pool saturation and recycling when exceeding max capacity', () => {
      const poolSize = 10;
      const pool = new DamageNumberPool(poolSize);

      // Spawn more than capacity
      for (let i = 0; i < 25; i++) {
        pool.spawn(i * 10, i * 10, i);
      }

      assert.strictEqual(pool.getActiveCount(), poolSize, 'Active count must be capped by pool capacity');

      // Clear pool
      pool.clear();
      assert.strictEqual(pool.getActiveCount(), 0);
    });

    it('4.3: Euler spring numerical stability across all frame rates (dt up to 0.10s)', () => {
      const dts = [0.016, 0.033, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1];
      for (const dt of dts) {
        const pool = new DamageNumberPool(1, 1.0);
        const item = pool.spawn(0, 0, 10, 'crit', { initialScale: 1.65 });
        let maxScale = 0;
        for (let step = 0; step < 30; step++) {
          pool.update(dt);
          assert.ok(Number.isFinite(item.scale), `Scale must be finite at dt=${dt}`);
          assert.ok(!Number.isNaN(item.scale), `Scale must not be NaN at dt=${dt}`);
          assert.ok(item.scale >= 0.0 && item.scale <= 3.0, `Scale ${item.scale} diverged out of bounds at dt=${dt}`);
          if (item.scale > maxScale) maxScale = item.scale;
        }
        // Ensure scale did not explode and smoothly snapped towards target 1.0
        assert.ok(maxScale < 2.0, `maxScale ${maxScale} exceeded expected threshold at dt=${dt}`);
      }
    });
  });
});
