import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment, createMockCanvas, createMockAudio } from './e2e/testEnv';

setupTestEnvironment();

import { SurvivorEngine, type LevelUpData, type RunResult } from '@/game/survivor/engine';
import { SurvivorSound } from '@/game/survivor/audio';
import { setAudioSettings } from '@/game/common/audioSettings';

describe('Shachiku Survivor — Polish & Drop/Transition Regression Suite', () => {
  it('1. Boss defeat vacuums distant gems, coins, and chest all the way to the player', () => {
    const canvas = createMockCanvas(960, 600);
    const engine = new SurvivorEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onLevelUp: () => {},
      onLevelClosed: () => {},
      onGameOver: () => {},
      onBanner: () => {},
    });
    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
    const anyEng = engine as any;
    anyEng.enemies = [];
    anyEng.gems = [{ x: 100, y: 100, vx: 0, vy: 0, val: 5, age: 0 }];
    anyEng.coinPs = [{ x: 120, y: 120, vx: 0, vy: 0, val: 10, age: 0 }];
    anyEng.pickups = [];
    anyEng.px = 500;
    anyEng.py = 500;

    // Spawn and kill a boss far from the player
    anyEng.spawnBoss('exec');
    const boss = anyEng.enemies.find((e: any) => e.boss);
    assert.ok(boss, 'Boss should be spawned');
    boss.x = 850;
    boss.y = 850;
    anyEng.killEnemy(boss);

    // Existing and newly dropped gems/coins/chest should have vac=true
    assert.ok(anyEng.gems.every((g: any) => g.vac === true), 'All gems must be vacuumed on boss kill');
    assert.ok(anyEng.coinPs.every((c: any) => c.vac === true), 'All coins must be vacuumed on boss kill');
    const chest = anyEng.pickups.find((p: any) => p.kind === 'chest');
    assert.ok(chest && chest.vac === true, 'Boss chest must be marked vac=true');

    // Simulate 2.5 seconds of pickup updates; everything should converge and be collected
    for (let i = 0; i < 150; i++) {
      anyEng.updatePickups(1 / 60);
    }
    assert.strictEqual(anyEng.gems.length, 0, 'All vacuumed gems must be collected');
    assert.strictEqual(anyEng.coinPs.length, 0, 'All vacuumed coins must be collected');
    assert.strictEqual(anyEng.pickups.length, 0, 'Boss chest must home in and be collected');
    assert.strictEqual(anyEng.chests, 1, 'Chest counter incremented');

    engine.destroy();
  });

  it('2. Aged recovery items (heal) and chests automatically home in so drops are never stranded', () => {
    const canvas = createMockCanvas(960, 600);
    const engine = new SurvivorEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onLevelUp: () => {},
      onLevelClosed: () => {},
      onGameOver: () => {},
      onBanner: () => {},
    });
    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
    const anyEng = engine as any;
    anyEng.enemies = [];
    anyEng.px = 500;
    anyEng.py = 500;
    anyEng.hp = 60;
    anyEng.maxHp = 120;
    anyEng.pickups = [
      { x: 900, y: 500, kind: 'heal', bob: 0, age: 15 },
      { x: 100, y: 500, kind: 'chest', bob: 0, age: 6 },
    ];

    for (let i = 0; i < 90; i++) {
      anyEng.updatePickups(1 / 60);
    }
    assert.strictEqual(anyEng.pickups.length, 0, 'Aged heal and chest must home in and be collected');
    assert.ok(anyEng.hp > 60, 'Player HP must be restored by the homed heal pickup');
    assert.strictEqual(anyEng.chests, 1, 'Aged chest must be collected');

    engine.destroy();
  });

  it('3. Victory at 18:00 sweeps remaining floor XP gems, coins, and chests into RunResult', () => {
    const canvas = createMockCanvas(960, 600);
    let finalResult: RunResult | null = null;
    const engine = new SurvivorEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onLevelUp: () => {},
      onLevelClosed: () => {},
      onGameOver: (r) => { finalResult = r; },
      onBanner: () => {},
    });
    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
    const anyEng = engine as any;
    anyEng.enemies = [];
    anyEng.weapons = [{ id: 'shuriken', lv: 8, cd: 0 }];
    anyEng.passives = [{ id: 'power', lv: 1 }];
    anyEng.gems = [{ x: 900, y: 900, vx: 0, vy: 0, val: 50, age: 0 }];
    anyEng.coinPs = [{ x: 900, y: 900, vx: 0, vy: 0, val: 25, age: 0 }];
    anyEng.pickups = [{ x: 900, y: 900, kind: 'chest', bob: 0, age: 0 }];
    anyEng.time = 599.95;

    // Step past 600s to trigger victory
    anyEng.update(0.1);

    const res = finalResult as RunResult | null;
    assert.ok(res, 'RunResult must be emitted on victory');
    assert.strictEqual(res.victory, true);
    assert.strictEqual(res.chests, 1, 'Uncollected chest on floor must be swept on victory');
    assert.ok(res.coins >= 25, 'Uncollected coins on floor must be swept on victory');
    assert.ok(res.level > 1, 'Uncollected XP gems on floor must be swept on victory');
    assert.strictEqual(res.weaponLevels['contract_storm'], 1, 'Swept chest at victory must evolve eligible weapon');

    engine.destroy();
  });

  it('4. Level-up stale seq guard, post-choice iframes, and evolved weapon deduplication', () => {
    const canvas = createMockCanvas(960, 600);
    const levelEvents: LevelUpData[] = [];
    let closedCount = 0;
    const engine = new SurvivorEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onLevelUp: (lv) => levelEvents.push(lv),
      onLevelClosed: () => { closedCount += 1; },
      onGameOver: () => {},
      onBanner: () => {},
    });
    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
    const anyEng = engine as any;
    anyEng.enemies = [];
    // Player already has evolved contract_storm (from shuriken)
    anyEng.weapons = [{ id: 'contract_storm', lv: 1, cd: 0.2 }];

    // Queue 2 level-ups
    anyEng.gainXp(100);
    assert.ok(anyEng.pendingLevels >= 2, 'Should queue at least 2 level-ups');
    anyEng.triggerLevelUp();
    assert.strictEqual(levelEvents.length, 1);

    const firstEvent = levelEvents[0];
    // Base weapon 'shuriken' must NOT be offered since 'contract_storm' is already owned
    assert.ok(
      !firstEvent.choices.some((c) => c.kind === 'weapon' && c.id === 'shuriken'),
      'Base weapon of an already-evolved weapon must never be re-offered',
    );

    const pendingBefore = anyEng.pendingLevels;
    // Stale seq must be rejected
    engine.applyUpgrade(firstEvent.choices[0], firstEvent.seq + 999);
    assert.strictEqual(anyEng.pendingLevels, pendingBefore, 'Mismatched seq must be ignored');

    // Valid seq consumes 1 pending level and emits next LevelUpData with incremented seq
    engine.applyUpgrade(firstEvent.choices[0], firstEvent.seq);
    assert.strictEqual(anyEng.pendingLevels, pendingBefore - 1);
    assert.strictEqual(levelEvents.length, 2);
    assert.strictEqual(levelEvents[1].seq, firstEvent.seq + 1);

    // Drain remaining pending levels
    while (anyEng.levelPending) {
      const latest = levelEvents[levelEvents.length - 1];
      engine.applyUpgrade(latest.choices[0], latest.seq);
    }
    assert.strictEqual(closedCount, 1, 'onLevelClosed must fire once all queued levels are resolved');
    assert.ok(anyEng.iframes >= 0.45, 'Closing level-up modal must grant brief iframes');

    engine.destroy();
  });

  it('5. Simultaneous lethal hit and XP pickup does not emit onLevelUp on a dead player', () => {
    const canvas = createMockCanvas(960, 600);
    let levelUpFired = false;
    let gameOverFired = false;
    const engine = new SurvivorEngine(canvas, createMockAudio(), {
      onHud: () => {},
      onLevelUp: () => { levelUpFired = true; },
      onLevelClosed: () => {},
      onGameOver: () => { gameOverFired = true; },
      onBanner: () => {},
    });
    engine.start({ difficulty: 'normal', dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 });
    const anyEng = engine as any;
    anyEng.px = 500;
    anyEng.py = 500;
    anyEng.hp = 5;
    anyEng.iframes = 0;
    // Place lethal enemy AND high-XP gem right on the player
    anyEng.enemies = [anyEng.makeEnemy('bossMid', 500, 500, false, false)];
    anyEng.gems = [{ x: 500, y: 500, vx: 0, vy: 0, val: 500, age: 0 }];

    anyEng.update(0.016);

    assert.strictEqual(gameOverFired, true, 'GameOver must fire when HP hits 0');
    assert.strictEqual(levelUpFired, false, 'LevelUp must NOT fire on the frame the player dies');

    engine.destroy();
  });

  it('6. SurvivorSound syncs with shared audioSettings', () => {
    const sound = new SurvivorSound();
    setAudioSettings({ se: false });
    assert.strictEqual((sound as any).isSilent(), true, 'Sound must be silent when shared SE is off');
    setAudioSettings({ se: true, seVolume: 0.8 });
    assert.strictEqual((sound as any).isSilent(), false, 'Sound must be active when shared SE is on');
    sound.dispose();
  });
});
