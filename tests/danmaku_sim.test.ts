import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOSS_PHASE_THRESH,
  COLLECT_LINE_Y,
  DanmakuSim,
  MAX_IT,
  type InputState,
} from '../src/game/danmaku/sim';

const IDLE_INPUT: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  focus: false,
  tx: 240,
  ty: 680,
  tMode: null,
};

describe('DanmakuSim — Item Collection & Combat Mechanics', () => {
  it('auto-collects all items when player crosses above COLLECT_LINE_Y', () => {
    const sim = new DanmakuSim();
    sim.reset({ stage: 1, score: 0, lives: 3, weapon: 'rensa', power: 1, difficulty: 'normal' });

    // Place items at far corners of the screen
    sim.items[0] = { alive: true, x: 30, y: 740, vy: 100, kind: 'score', t: 0, magnet: false };
    sim.items[1] = { alive: true, x: 450, y: 620, vy: 100, kind: 'power', t: 0, magnet: false };
    sim.items[2] = { alive: true, x: 240, y: 500, vy: 100, kind: 'bomb', t: 0, magnet: false };

    // Move ship above collect line
    sim.px = 240;
    sim.py = COLLECT_LINE_Y - 10;

    for (let i = 0; i < 60; i++) {
      sim.step(1 / 60, { ...IDLE_INPUT, ty: sim.py });
    }

    const remaining = sim.items.filter((it) => it.alive).length;
    assert.equal(remaining, 0, 'All items must be collected after crossing collect line');
    assert.equal(sim.pickups, 3);
    assert.equal(sim.power, 2);
    assert.equal(sim.bombs, 4);
  });

  it('locks onto and collects items within proximity even when item is below the ship', () => {
    const sim = new DanmakuSim();
    sim.reset({ stage: 1, score: 0, lives: 3, weapon: 'rensa', power: 1, difficulty: 'normal' });
    sim.px = 240;
    sim.py = 500;

    // Item is 100px below the ship (within 150px proximity radius)
    sim.items[0] = { alive: true, x: 260, y: 600, vy: 120, kind: 'score', t: 0, magnet: false };

    for (let i = 0; i < 40; i++) {
      sim.step(1 / 60, { ...IDLE_INPUT, tx: 240, ty: 500 });
    }

    assert.equal(sim.items[0]!.alive, false, 'Item below ship within proximity radius should be pulled up and collected');
    assert.equal(sim.pickups, 1);
  });

  it('magnetizes all items on stage end, bomb use, boss phase break, and boss defeat, leaving zero uncollected on next stage', () => {
    const sim = new DanmakuSim();
    sim.reset({ stage: 1, score: 0, lives: 3, weapon: 'rensa', power: 1, difficulty: 'normal' });

    // Spawn an item and trigger bomb
    sim.items[0] = { alive: true, x: 40, y: 700, vy: 80, kind: 'score', t: 0, magnet: false };
    assert.equal(sim.useBomb(), true);
    assert.equal(sim.items[0]!.magnet, true, 'Bomb should magnetize all items on screen');

    // Advance to end of fly phase
    sim.items[1] = { alive: true, x: 440, y: 710, vy: 80, kind: 'score', t: 0, magnet: false };
    sim.stageT = 999;
    sim.step(1 / 60, IDLE_INPUT);
    assert.equal(sim.phase, 'warn');
    assert.equal(sim.items[1]!.magnet, true, 'Stage end should magnetize all items');
  });

  it('enforces 3-phase boss floors and awards spell card capture bonus when clean', () => {
    const sim = new DanmakuSim();
    sim.reset({ stage: 1, score: 0, lives: 3, weapon: 'laser', power: 5, difficulty: 'normal' });

    // Enter boss phase directly (warnT = 2.4s + entry 2.42s = ~290 steps)
    sim.stageT = 999;
    sim.step(1 / 60, IDLE_INPUT); // -> warn
    for (let i = 0; i < 300; i++) sim.step(1 / 60, IDLE_INPUT); // boss enters (y = 150)
    assert.equal(sim.phase, 'boss');
    assert.equal(sim.boss.alive, true);
    assert.equal(sim.boss.entered, true);
    assert.equal(sim.boss.phase, 0);

    // Deal massive damage via player bullet: must stop at phase 0 floor (66% maxHp) and advance to phase 1
    const p0Floor = Math.round(sim.boss.maxHp * BOSS_PHASE_THRESH[0]);
    sim.pbullets[0] = {
      alive: true,
      x: sim.boss.x,
      y: sim.boss.y,
      vx: 0,
      vy: -500,
      dmg: 99999,
      kind: 0,
      retarget: 0,
      pierce: 0,
    };
    sim.step(1 / 60, IDLE_INPUT);
    assert.equal(sim.boss.phase, 1, 'Boss should advance to phase 1 (Spell Card 1)');
    assert.equal(Math.round(sim.boss.hp), p0Floor);
    assert.ok(sim.currentSpellBonus() > 0, 'Active clean spell should report a positive bonus');

    // Wait out phase-break invulnerability (invT = 1.1s) and hitstop
    for (let i = 0; i < 90; i++) sim.step(1 / 60, IDLE_INPUT);

    // Break phase 1 cleanly -> should capture spell 1
    sim.pbullets[0] = {
      alive: true,
      x: sim.boss.x,
      y: sim.boss.y,
      vx: 0,
      vy: -500,
      dmg: 99999,
      kind: 0,
      retarget: 0,
      pierce: 0,
    };
    sim.step(1 / 60, IDLE_INPUT);
    assert.equal(sim.boss.phase, 2, 'Boss should advance to phase 2 (Spell Card 2)');
    assert.equal(sim.spellsCaptured, 1, 'Clean phase 1 break should award 1 spell capture');

    // Wait out invT, then use bomb during phase 2 (invalidates spellClean) and defeat boss
    for (let i = 0; i < 90; i++) sim.step(1 / 60, IDLE_INPUT);
    sim.bombs = 3;
    sim.bombCd = 0;
    sim.useBomb();
    assert.equal(sim.boss.spellClean, false, 'Using bomb during spell phase must void spellClean');

    sim.pbullets[0] = {
      alive: true,
      x: sim.boss.x,
      y: sim.boss.y,
      vx: 0,
      vy: -500,
      dmg: 99999,
      kind: 0,
      retarget: 0,
      pierce: 0,
    };
    sim.step(1 / 60, IDLE_INPUT);
    assert.equal(sim.boss.alive, false, 'Boss should be defeated after phase 2 HP reaches 0');
    assert.equal(sim.spellsCaptured, 1, 'Unclean phase 2 should not increment spellsCaptured');
    assert.equal(sim.phase, 'interval');
  });

  it('never loses drops when all MAX_IT item slots are occupied', () => {
    const sim = new DanmakuSim();
    sim.reset({ stage: 1, score: 0, lives: 3, weapon: 'rensa', power: 1, difficulty: 'normal' });

    for (let i = 0; i < MAX_IT; i++) {
      sim.items[i] = { alive: true, x: 100 + i * 10, y: 300, vy: 50, kind: 'score', t: 0, magnet: false };
    }

    // Collect all at stage transition
    sim.phase = 'interval';
    sim.intervalT = 0.01;
    sim.step(1 / 60, IDLE_INPUT);

    assert.equal(sim.stage, 2);
    assert.equal(sim.pickups, MAX_IT, 'All items must be auto-collected upon transitioning to next stage');
    assert.equal(sim.items.filter((i) => i.alive).length, 0);
  });

  it('charges HYPER OVERDRIVE via graze/kills/items, converts nearby bullets on activation, and exits safely with bullet conversion on expiration', () => {
    const sim = new DanmakuSim();
    sim.reset({ stage: 1, score: 0, lives: 3, weapon: 'rensa', power: 3, difficulty: 'normal' });
    sim.px = 240;
    sim.py = 600;

    // Cannot activate before reaching 100%
    assert.equal(sim.useHyper(), false);

    // Graze a bullet (+3.5 hyper)
    sim.ebullets[0] = { alive: true, x: 240 + 22, y: 600, vx: 0, vy: 10, big: false, grazed: false };
    sim.step(1 / 60, { ...IDLE_INPUT, ty: 600 });
    assert.ok(sim.hyper >= 3.5, 'Grazing should charge hyper gauge');

    // Fill hyper to 100% and place enemy bullets inside and outside the 220px blast radius
    sim.hyper = 100;
    sim.ebullets[0] = { alive: true, x: 240, y: 500, vx: 0, vy: 80, big: false, grazed: false }; // 100px away (inside 220px)
    sim.ebullets[1] = { alive: true, x: 240, y: 420, vx: 0, vy: 80, big: true, grazed: false };  // 180px away (inside 220px)
    sim.ebullets[2] = { alive: true, x: 240, y: 200, vx: 0, vy: 80, big: false, grazed: false }; // 400px away (outside 220px)

    assert.equal(sim.useHyper(), true, 'useHyper should succeed when hyper is 100%');
    assert.equal(sim.hyperActive, true);
    assert.equal(sim.hyperTimer, 7.0);
    assert.equal(sim.hyper, 0);
    assert.ok(sim.invuln >= 1.5, 'Activating hyper should grant at least 1.5s invulnerability');

    // Bullets within 220px converted into auto-homing score items; distant bullet remains
    assert.equal(sim.ebullets[0]!.alive, false, 'Bullet at 100px must be converted');
    assert.equal(sim.ebullets[1]!.alive, false, 'Bullet at 180px must be converted');
    assert.equal(sim.ebullets[2]!.alive, true, 'Bullet at 400px should remain active');
    const homingScoreItems = sim.items.filter((it) => it.alive && it.kind === 'score' && it.magnet);
    assert.equal(homingScoreItems.length, 2, 'Two enemy bullets should become homing score items');

    // Place a bullet within 140px just before hyperTimer expires (safe exit test)
    sim.hyperTimer = 0.01;
    sim.ebullets[3] = { alive: true, x: 240, y: 500, vx: 0, vy: 60, big: false, grazed: false }; // 100px away (inside 140px)
    sim.step(1 / 30, { ...IDLE_INPUT, ty: 600 });

    assert.equal(sim.hyperActive, false, 'Hyper should end when timer reaches 0');
    assert.equal(sim.hyperTimer, 0);
    assert.equal(sim.ebullets[3]!.alive, false, 'Bullet within 140px should be converted on hyper expiration');
  });
});
