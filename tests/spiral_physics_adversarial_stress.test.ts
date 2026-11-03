/**
 * Adversarial Stress Harness: Spiral Knockback Impulse & Chain Invariance
 * Tests extreme edge cases: zero distance impact, massive knockback,
 * all hit positions (head, body, tail), multi-hit cumulative deformation.
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpiralEngine } from '../src/game/spiral/engine';
import { setupTestEnvironment, createMockCanvas, createMockAudio } from './e2e/testEnv';

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

describe('Adversarial Stress: Spiral Knockback Impulse Hoisting & Rigid Translation', () => {
  it('Edge case 1: Zero-distance impact (fromX === s.x, fromY === s.y) handles singularity gracefully', () => {
    const engine = createEngine();
    const anyEngine = engine as any;
    anyEngine.chains = [];
    anyEngine.spawnChain('president');
    const chain = anyEngine.chains[0];

    const targetIndex = 5;
    const s = chain.segs[targetIndex];
    // Exact zero-distance collision
    anyEngine.damageSeg(chain, 0, targetIndex, 5, 100, s.x, s.y, false);

    for (let i = 0; i < chain.segs.length; i++) {
      assert.ok(!Number.isNaN(chain.segs[i].x), `Seg ${i} x is NaN`);
      assert.ok(!Number.isNaN(chain.segs[i].y), `Seg ${i} y is NaN`);
      assert.ok(Number.isFinite(chain.segs[i].x), `Seg ${i} x is infinite`);
      assert.ok(Number.isFinite(chain.segs[i].y), `Seg ${i} y is infinite`);
    }
    engine.destroy();
  });

  it('Edge case 2: Extreme knockback value (1e6) adheres to Math.min(26, push) clamp', () => {
    const engine = createEngine();
    const anyEngine = engine as any;
    anyEngine.chains = [];
    anyEngine.spawnChain('president');
    const chain = anyEngine.chains[0];

    const targetIndex = 10;
    const s = chain.segs[targetIndex];
    const initialPos = chain.segs.map((seg: any) => ({ x: seg.x, y: seg.y }));

    // Knock of 1,000,000 from (s.x - 10, s.y) -> purely horizontal
    anyEngine.damageSeg(chain, 0, targetIndex, 10, 1_000_000, s.x - 10, s.y, false);

    // Max push is 26. Since d = 10, (10/10)*26 = 26px
    for (let i = 0; i < chain.segs.length; i++) {
      const dx = chain.segs[i].x - initialPos[i].x;
      const dy = chain.segs[i].y - initialPos[i].y;
      assert.ok(Math.abs(dx - 26) < 1e-5, `Seg ${i} displacement dx=${dx} exceeded push clamp 26`);
      assert.ok(Math.abs(dy - 0) < 1e-5, `Seg ${i} displacement dy=${dy} should be 0`);
    }
    engine.destroy();
  });

  it('Edge case 3: Comprehensive hit across all 22 segment positions preserves exact inter-segment distances', () => {
    const engine = createEngine();
    const anyEngine = engine as any;

    for (let hitIndex = 0; hitIndex < 22; hitIndex++) {
      anyEngine.chains = [];
      anyEngine.spawnChain('president');
      const chain = anyEngine.chains[0];

      // Settle
      for (let f = 0; f < 10; f++) anyEngine.updateChains(1 / 60);

      const distancesBefore: number[] = [];
      for (let i = 1; i < chain.segs.length; i++) {
        distancesBefore.push(Math.hypot(chain.segs[i - 1].x - chain.segs[i].x, chain.segs[i - 1].y - chain.segs[i].y));
      }

      // Hit at segment hitIndex
      const target = chain.segs[hitIndex];
      anyEngine.damageSeg(chain, 0, hitIndex, 1, 100, target.x - 15, target.y + 20, false);

      const distancesAfter: number[] = [];
      for (let i = 1; i < chain.segs.length; i++) {
        distancesAfter.push(Math.hypot(chain.segs[i - 1].x - chain.segs[i].x, chain.segs[i - 1].y - chain.segs[i].y));
      }

      for (let i = 0; i < distancesBefore.length; i++) {
        const delta = Math.abs(distancesAfter[i] - distancesBefore[i]);
        assert.ok(
          delta < 1e-6,
          `Hit at seg ${hitIndex}: joint ${i}->${i + 1} delta distance is ${delta.toFixed(6)}px (must be < 1e-6)`
        );
      }
    }
    engine.destroy();
  });

  it('Edge case 4: 100 consecutive rapid projectile impacts maintain rigid translation invariance without cumulative drift', () => {
    const engine = createEngine();
    const anyEngine = engine as any;
    anyEngine.chains = [];
    anyEngine.spawnChain('president');
    const chain = anyEngine.chains[0];

    // Settle
    for (let f = 0; f < 10; f++) anyEngine.updateChains(1 / 60);

    const initialDistances: number[] = [];
    for (let i = 1; i < chain.segs.length; i++) {
      initialDistances.push(Math.hypot(chain.segs[i - 1].x - chain.segs[i].x, chain.segs[i - 1].y - chain.segs[i].y));
    }

    // Fire 100 consecutive non-lethal projectile impacts from varying angles onto random segments
    for (let hit = 0; hit < 100; hit++) {
      const segIdx = hit % chain.segs.length;
      const target = chain.segs[segIdx];
      const angle = (hit * 1.37) % (Math.PI * 2);
      const fromX = target.x + Math.cos(angle) * 30;
      const fromY = target.y + Math.sin(angle) * 30;
      anyEngine.damageSeg(chain, 0, segIdx, 0.1, 80, fromX, fromY, false);

      // Check all joint distances after each hit
      for (let i = 1; i < chain.segs.length; i++) {
        const d = Math.hypot(chain.segs[i - 1].x - chain.segs[i].x, chain.segs[i - 1].y - chain.segs[i].y);
        const delta = Math.abs(d - initialDistances[i - 1]);
        assert.ok(
          delta < 1e-4,
          `Hit #${hit} at seg ${segIdx}: joint ${i - 1}->${i} drifted by ${delta.toFixed(6)}px`
        );
      }
    }

    engine.destroy();
  });
});
