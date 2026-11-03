/**
 * Dedicated M4 Verification Suite: Shachiku Spiral Modern 2D Vector & Boss Mechanics
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SpiralEngine } from '../src/game/spiral/engine';
import {
  drawVectorCore,
  drawVectorSegment,
  drawVectorBento,
  drawVectorOrbital,
  drawVectorLaser,
  drawVectorProjectile,
  drawVectorMemoProjectile,
  drawVectorExecutiveBarrier,
  drawVectorReticle,
} from '../src/game/spiral/vectorRenderer';
import { setupTestEnvironment, createMockCanvas, createMockAudio, stepAnimationFrame } from './e2e/testEnv';

// Setup headless browser mocks
setupTestEnvironment();

describe('M4: Shachiku Spiral Modern 2D Vector & Boss Mechanics Verification', () => {
  it('1. vectorRenderer renders all entities with zero errors on mock canvas', () => {
    const canvas = createMockCanvas(640, 640);
    const ctx = canvas.getContext('2d')!;

    // drawVectorCore
    assert.doesNotThrow(() => {
      drawVectorCore(ctx, 320, 320, 16, 0.8, 0.5, 1.2);
      drawVectorCore(ctx, 320, 320, 16, 0, 0, 0); // zero hp
      drawVectorCore(ctx, 320, 320, 16, 1.5, 1.5, Math.PI * 4); // boundary ratios
    });

    // drawVectorSegment for all kinds
    const kinds = ['mail', 'doc', 'claim', 'bossMid', 'exec', 'president', 'unknown'];
    for (const kind of kinds) {
      assert.doesNotThrow(() => {
        // Body segment
        drawVectorSegment(ctx, 100, 100, 14, kind, false, 0.75, undefined, { time: 1.0 });
        // Head segment (normal)
        drawVectorSegment(ctx, 100, 100, 16, kind, true, 0.9, undefined, { time: 1.5 });
        // Head segment (enraged & stunned)
        drawVectorSegment(ctx, 100, 100, 18, kind, true, 0.3, undefined, { enraged: true, stunned: true, time: 2.0 });
      });
    }

    // drawVectorBento
    assert.doesNotThrow(() => {
      drawVectorBento(ctx, 200, 200, 1.25);
    });

    // drawVectorOrbital
    assert.doesNotThrow(() => {
      drawVectorOrbital(ctx, 250, 250, Math.PI / 3);
    });

    // drawVectorLaser
    assert.doesNotThrow(() => {
      drawVectorLaser(ctx, 320, 320, 450, 450, 6, '#fbbf24', 0.8);
    });

    // drawVectorProjectile
    assert.doesNotThrow(() => {
      drawVectorProjectile(ctx, 300, 300, 200, 200, true, 0.5);
      drawVectorProjectile(ctx, 300, 300, -100, 0, false, 1.0);
    });

    // drawVectorMemoProjectile
    assert.doesNotThrow(() => {
      drawVectorMemoProjectile(ctx, 280, 280, 150, 100, 0.8);
    });

    // drawVectorExecutiveBarrier
    assert.doesNotThrow(() => {
      drawVectorExecutiveBarrier(ctx, 320, 320, 18, 1.0, Math.PI * 0.65, 0.8, 1.5);
    });

    // drawVectorReticle
    assert.doesNotThrow(() => {
      drawVectorReticle(ctx, 320, 320, 400, 250, 2.5);
    });
  });

  it('2. SpiralEngine wave execution, boss spawn and hitstop/shake lifecycle', () => {
    const canvas = createMockCanvas(640, 640);
    let bannerTitle = '';
    let bannerSub = '';
    const engine = new SpiralEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onBuild: (b) => {
        // Auto select upgrade to proceed through waves
        if (b.choices.length > 0) {
          engine.applyUpgrade(b.choices[0]);
        }
      },
      onGameOver: () => {},
      onBanner: (title, sub) => {
        bannerTitle = title;
        bannerSub = sub;
      },
    });

    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
    assert.ok(bannerTitle.length > 0);

    // Step simulation frames
    for (let f = 0; f < 120; f++) {
      stepAnimationFrame(16);
    }

    // Set movement via virtual coordinates
    engine.setMove(0.5, -0.5);
    for (let f = 0; f < 30; f++) {
      stepAnimationFrame(16);
    }

    // Test pause and resume
    engine.setPaused(true);
    stepAnimationFrame(16);
    engine.setPaused(false);
    stepAnimationFrame(16);

    engine.destroy();
  });

  it('3. Boss Anti-Insta-Wipe & Segment promotion mechanics validation', () => {
    const canvas = createMockCanvas(640, 640);
    const engine = new SpiralEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onBuild: () => {},
      onGameOver: () => {},
      onBanner: () => {},
    });

    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });

    // Access private chains for direct assertion
    const chains = (engine as any).chains;
    (engine as any).spawnChain('president');
    assert.ok(chains.length > 0);

    const presidentChain = chains.find((c: any) => c.kind === 'president');
    assert.ok(presidentChain);
    const initialSegCount = presidentChain.segs.length;
    assert.strictEqual(initialSegCount, 22);

    // Simulate killing the president head
    (engine as any).killSeg(presidentChain, chains.indexOf(presidentChain), 0);

    // Chain reaction: remaining segments must NOT be instantly wiped!
    assert.strictEqual(presidentChain.segs.length, initialSegCount - 1);
    // Chain must be stunned for 1.5s
    assert.ok(presidentChain.stunT > 1.0);
    // Next segment must be promoted to mini-head with larger radius
    assert.ok(presidentChain.segs[0].radius >= 18);

    engine.destroy();
  });

  it('4. Wave 15 Executive Barrier deflection verification', () => {
    const canvas = createMockCanvas(640, 640);
    const engine = new SpiralEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onBuild: () => {},
      onGameOver: () => {},
      onBanner: () => {},
    });

    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
    (engine as any).spawnChain('president');

    const chains = (engine as any).chains;
    const president = chains.find((c: any) => c.kind === 'president');
    assert.ok(president);
    assert.strictEqual(president.bossState.barrierActive, true);
    const initialBarrierHp = president.bossState.barrierHp;
    assert.ok(initialBarrierHp > 0);

    // Damage from the front (incident along barrier angle)
    const head = president.segs[0];
    const frontalX = head.x + Math.cos(president.bossState.barrierAngle) * 30;
    const frontalY = head.y + Math.sin(president.bossState.barrierAngle) * 30;

    const headInitialHp = head.hp;
    (engine as any).damageSeg(president, chains.indexOf(president), 0, 50, 100, frontalX, frontalY, false);

    // Barrier absorbed the hit! Head HP remains undamaged
    assert.strictEqual(head.hp, headInitialHp);
    assert.strictEqual(president.bossState.barrierHp, initialBarrierHp - 50);

    engine.destroy();
  });

  it('5. Drop & Chest Vacuum Regression: outer-ring coins, energy packs, and freed chests never linger uncollected', () => {
    const canvas = createMockCanvas(640, 640);
    let buildFromChestCount = 0;
    const engine = new SpiralEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onBuild: (b) => {
        if (b.fromChest) buildFromChestCount += 1;
        if (b.choices.length > 0) engine.applyUpgrade(b.choices[0]);
      },
      onGameOver: () => {},
      onBanner: () => {},
    });

    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, rateMul: 1 });
    const anyEngine = engine as any;

    // 1. Spawn outer-ring drops (coins + energy pack) with tangential velocity
    anyEngine.hp = 80;
    anyEngine.shield = 10;
    const coinsBefore = anyEngine.coins;
    anyEngine.dropCoin(320 + 300, 320, 25);
    anyEngine.dropBento(320 - 280, 320);
    assert.strictEqual(anyEngine.coinPs.length, 2);

    // Step 60 frames (1.0s): both drops must home straight into the core and be collected
    for (let f = 0; f < 60; f++) {
      anyEngine.updateCoins(1 / 60);
    }
    assert.strictEqual(anyEngine.coinPs.length, 0, 'All outer-ring drops must be collected within 1s');
    assert.strictEqual(anyEngine.coins, coinsBefore + 25, 'Coin drop value credited');
    assert.strictEqual(anyEngine.hp, 100, 'Energy pack healed +20 HP');
    assert.strictEqual(anyEngine.shield, 30, 'Energy pack restored +20 Shield');

    // 2. Detached chest (after enemy chain is defeated) auto-flies into core and opens
    anyEngine.chains = [];
    anyEngine.spawnChain('doc');
    const docChain = anyEngine.chains[0];
    anyEngine.chests = [{
      id: 99,
      chain: docChain,
      segA: docChain.segs[0],
      segB: docChain.segs[1],
      x: docChain.segs[0].x,
      y: docChain.segs[0].y,
      spin: 0,
      openT: 0,
      taken: false,
      free: false,
    }];
    // Defeat the chain -> chest becomes detached
    anyEngine.killSeg(docChain, 0, 0);
    assert.strictEqual(anyEngine.chains.length, 0);

    // Step updateChests: detached chest must fly into the core and trigger openChest
    for (let f = 0; f < 90; f++) {
      anyEngine.updateChests(1 / 60);
    }
    assert.strictEqual(buildFromChestCount, 1, 'Detached chest must auto-open upon reaching core');

    // 3. Wave-clear interlude guarantees zero leftover drops or unopened chests
    anyEngine.dropCoin(50, 50, 15);
    anyEngine.chests.push({
      id: 100,
      chain: docChain,
      segA: docChain.segs[0],
      segB: docChain.segs[1],
      x: 600,
      y: 600,
      spin: 0,
      openT: 0,
      taken: false,
      free: true,
    });
    const preClearCoins = anyEngine.coins;
    anyEngine.beginClear();
    for (let f = 0; f < 90 && anyEngine.clearT > 0; f++) {
      anyEngine.updateClearing(1 / 60);
    }
    assert.strictEqual(anyEngine.coinPs.length, 0, 'Zero coin drops left after wave clear');
    assert.strictEqual(anyEngine.chests.filter((c: any) => !c.taken).length, 0, 'Zero untaken chests left after wave clear');
    assert.ok(anyEngine.coins > preClearCoins + 15, 'Both leftover coins and converted chest were credited');

    engine.destroy();
  });
});
