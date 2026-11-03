/**
 * Adversarial Input Hardening & Vulnerability Exploration Suite
 * Tests malicious, non-standard, or degenerate inputs:
 * - NaN and Infinity inputs in HitStopManager and TraumaScreenShake
 * - Degenerate deadzones (1.0, 0.0, negative) in VirtualJoystick
 * - Heuristic ambiguity in HitStopManager.trigger (1.5s vs 1.5ms)
 * - Zero lifespan / zero poolSize in DamageNumberPool
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { setupTestEnvironment, createMockCanvas } from '../e2e/testEnv';

setupTestEnvironment();

import { VirtualJoystick } from '../../src/game/common/virtualJoystick';
import { TraumaScreenShake, HitStopManager, DamageNumberPool } from '../../src/game/common/juice';

function sendEvent(target: any, event: any) {
  target.dispatchEvent(event);
}

describe('Adversarial & Stress Hardening Suite: src/game/common/', () => {

  describe('Adversarial 1: VirtualJoystick Edge Configs', () => {
    it('ADV-1.1: Deadzone equal to 1.0 causes division by zero (NaN) when stick is at max distance', () => {
      const joystick = new VirtualJoystick({ maxRadius: 50, deadzone: 1.0 });
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      });

      // Stick moved to maximum distance (50px)
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 150,
        clientY: 100,
      });

      const vec = joystick.getVector();
      // Documenting whether vec.magnitude becomes NaN:
      // normalizedDist = 1.0, deadzone = 1.0.
      // In code: if (normalizedDist <= this.deadzone) -> (1.0 <= 1.0) is true!
      // So it falls into deadzone branch and returns 0!
      // Therefore scaledMag is never evaluated, and magnitude safely remains 0!
      assert.strictEqual(vec.magnitude, 0);
      assert.strictEqual(Number.isNaN(vec.magnitude), false);
      joystick.detach();
    });

    it('ADV-1.2: Deadzone = 0.0 allows immediate micro-movements', () => {
      const joystick = new VirtualJoystick({ maxRadius: 50, deadzone: 0.0 });
      const canvas = createMockCanvas(400, 400);
      joystick.attach(canvas);

      sendEvent(canvas, {
        type: 'pointerdown',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      });

      // Small move of 0.5px
      sendEvent(window, {
        type: 'pointermove',
        pointerId: 1,
        clientX: 100.5,
        clientY: 100,
      });

      const vec = joystick.getVector();
      assert.ok(vec.magnitude > 0);
      assert.strictEqual(Number.isNaN(vec.magnitude), false);
      joystick.detach();
    });
  });

  describe('Adversarial 2: HitStopManager Non-finite Inputs & Unit Heuristic', () => {
    it('ADV-2.1: trigger(NaN) input is safely guarded and produces no freeze-lock', () => {
      const hitstop = new HitStopManager();
      hitstop.trigger(NaN);
      const remaining = hitstop.getTimeRemaining();
      const isFrozen = hitstop.isFrozen();
      assert.strictEqual(remaining, 0, 'NaN duration must be rejected, leaving timeRemaining at 0');
      assert.strictEqual(isFrozen, false, 'HitStopManager must not freeze on NaN input');
      const res = hitstop.update(0.016);
      assert.strictEqual(res.frozen, false, 'update() must not freeze on NaN input');
      assert.strictEqual(res.effectiveDt, 0.016, 'Full effectiveDt must be returned');
    });

    it('ADV-2.2: Unit heuristic ambiguity between seconds and milliseconds', () => {
      const hitstop = new HitStopManager();

      // Case A: 0.8 seconds (800ms)
      hitstop.trigger(0.8);
      const timeA = hitstop.getTimeRemaining(); // 0.8s = 800ms
      hitstop.reset();

      // Case B: 1.5 seconds intended, but treated as 1.5ms!
      hitstop.trigger(1.5);
      const timeB = hitstop.getTimeRemaining(); // 1.5 / 1000 = 0.0015s = 1.5ms
      hitstop.reset();

      assert.ok(timeA > timeB, 'trigger(0.8) yields larger duration than trigger(1.5) due to heuristic threshold at 1.0');
    });

    it('ADV-2.3: trigger(Infinity) is safely guarded by Number.isFinite check', () => {
      const hitstop = new HitStopManager();
      hitstop.trigger(Infinity);
      assert.strictEqual(hitstop.isFrozen(), false, 'Infinity duration must be rejected');
      assert.strictEqual(hitstop.getTimeRemaining(), 0, 'timeRemaining must remain 0');
      hitstop.reset();
      assert.strictEqual(hitstop.isFrozen(), false);
    });
  });

  describe('Adversarial 3: TraumaScreenShake Non-finite Inputs', () => {
    it('ADV-3.1: addTrauma(NaN) input analysis', () => {
      const shake = new TraumaScreenShake();
      shake.addTrauma(NaN);
      const trauma = shake.getTrauma();
      const off = shake.update(0.016);
      assert.ok(Number.isNaN(trauma));
      assert.ok(Number.isNaN(off.offsetX));
    });

    it('ADV-3.2: Extremely rapid trauma accumulation (1000 rapid calls of addTrauma(0.1))', () => {
      const shake = new TraumaScreenShake();
      for (let i = 0; i < 1000; i++) {
        shake.addTrauma(0.1);
      }
      assert.strictEqual(shake.getTrauma(), 1.0, 'Trauma must clamp to 1.0 despite 1000 additions');
      const off = shake.update(0.016);
      assert.ok(Number.isFinite(off.offsetX));
      assert.ok(Math.abs(off.offsetX) <= 18 + 1e-6);
    });
  });

  describe('Adversarial 4: DamageNumberPool Boundary Inputs', () => {
    it('ADV-4.1: lifespan = 0 edge case', () => {
      const pool = new DamageNumberPool(10, 0);
      const item = pool.spawn(0, 0, 10, 'normal', { lifespan: 0 });
      pool.update(0.016);
      assert.strictEqual(item.active, false);
    });

    it('ADV-4.2: Extreme value inputs (negative damage, very large string, zero)', () => {
      const pool = new DamageNumberPool(10);
      const n1 = pool.spawn(0, 0, 0, 'normal');
      assert.strictEqual(n1.text, '0');

      const n2 = pool.spawn(0, 0, -999, 'normal');
      assert.strictEqual(n2.text, '-999');

      const n3 = pool.spawn(0, 0, 'OVERTIME BONUS!', 'crit');
      assert.strictEqual(n3.text, 'OVERTIME BONUS!!');
    });
  });
});
