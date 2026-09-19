/**
 * 社畜サバイバー — core game engine (Canvas2D, infinite office floor).
 * Player moves, weapons fire automatically. Survive 10:00 (9:00 -> 18:00).
 */

import {
  VIEW_W, VIEW_H, RUN_SECONDS, MAX_ENEMIES, MAX_PROJECTILES, MAX_PARTICLES,
  MAX_DMG_NUMBERS, MAX_GEMS, WEAPON_ORDER, PASSIVE_ORDER, ENEMIES, BOSS_SCHEDULE,
  DIFFICULTIES, xpForLevel, MAX_WEAPON_SLOTS, MAX_PASSIVE_SLOTS,
  WEAPONS, PASSIVES, STAGES,
  type WeaponId, type PassiveId, type EnemyKind, type Difficulty, type StageId,
} from './config';
import type { SurvivorSound } from './audio';
import { getPixelSprite } from './pixelSprites';
import { checkEvolution } from './evolutions';
import { TraumaScreenShake, HitStopManager, DamageNumberPool } from '@/game/common/juice';

/* ---------------- public types ---------------- */

export interface HudWeapon { id: WeaponId; icon: string; lv: number }
export interface HudPassive { id: PassiveId; icon: string; lv: number }

export interface HudSnapshot {
  hp: number; maxHp: number;
  level: number; xp: number; xpNext: number;
  time: number; kills: number; score: number; coins: number;
  weapons: HudWeapon[]; passives: HudPassive[];
  bossName: string; bossHp: number; bossMax: number;
  endless: boolean;
  dashCd: number; dashMax: number;
  xpBoostT: number; coinBoostT: number;
}

export interface LevelChoice {
  kind: 'weapon' | 'passive' | 'bonus';
  id: string;
  name: string;
  icon: string;
  desc: string;
  toLv: number;
  isNew: boolean;
}

export interface LevelUpData {
  level: number;
  choices: LevelChoice[];
  canReroll: boolean;
  canBanish: boolean;
}

export interface RunResult {
  victory: boolean;
  time: number;
  kills: number;
  level: number;
  score: number;
  coins: number;
  difficulty: Difficulty;
  chests: number;
  gems: number;
  killsByKind: Record<string, number>;
  weaponLevels: Record<string, number>;
}

export interface StartOpts {
  difficulty: Difficulty;
  stage?: StageId;
  dmgMul: number;
  maxHpBonus: number;
  speedMul: number;
  magnetMul: number;
}

export interface EngineEvents {
  onHud: (h: HudSnapshot) => void;
  onLevelUp: (d: LevelUpData) => void;
  onLevelClosed: () => void;
  onGameOver: (r: RunResult) => void;
  onBanner: (title: string, sub: string) => void;
}

/* ---------------- internal entities ---------------- */

interface OwnedWeapon { id: WeaponId; lv: number; cd: number }
interface OwnedPassive { id: PassiveId; lv: number }

interface Enemy {
  o: true;
  kind: EnemyKind;
  x: number; y: number;
  hp: number; maxHp: number;
  spd: number; dmg: number; xp: number; coins: number;
  radius: number; icon: string; color: string;
  hitCd: number; flash: number;
  kx: number; ky: number;
  elite: boolean; boss: boolean;
  ranged: boolean; splitter: boolean; score: number;
  shootCd: number; dashCd: number; dashT: number; summonCd: number;
  barrierCd: number; boomHit: number;
}

interface Proj {
  x: number; y: number; vx: number; vy: number;
  dmg: number; radius: number; pierce: number; life: number;
  kind: 'shuriken' | 'coffee' | 'boomerang' | 'missile' | 'contract_storm' | 'caffeine_geyser' | 'gold_exchange';
  color: string; blast: number; homing: number; age: number;
  hit: Set<Enemy>;
}

interface Pool {
  x: number; y: number; r: number; dmg: number; life: number; maxLife: number; tickCd: number;
}

interface EnemyProj { x: number; y: number; vx: number; vy: number; dmg: number; radius: number; life: number }

interface Gem { x: number; y: number; vx: number; vy: number; val: number; age: number }
interface CoinP { x: number; y: number; vx: number; vy: number; val: number }
interface Pickup { x: number; y: number; kind: 'heal' | 'magnet' | 'bomb' | 'chest'; bob: number }
interface Ring { x: number; y: number; r: number; maxR: number; dmg: number; knock: number; width: number; color: string; hit: Set<Enemy> }
interface Boom { x: number; y: number; r: number; dmg: number; t: number; dur: number; knock: number; hit: Set<Enemy> }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface DmgNum { x: number; y: number; val: number; life: number; crit: boolean }

function rand(a: number, b: number): number { return a + Math.random() * (b - a); }
function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy;
}
function hashCell(cx: number, cy: number): number {
  let h = (cx * 374761393 + cy * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

/* ---------------- engine ---------------- */

export class SurvivorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sound: SurvivorSound;
  private ev: EngineEvents;
  private raf = 0;
  private last = 0;
  private running = false;
  private destroyed = false;
  /** generation counter: stale loops exit, only the newest loop runs */
  private activeGen = 0;

  private paused = false;
  private levelPending = false;
  private over = false;
  private endless = false;
  /** 0..1 spawn pressure ramp after entering endless (fair restart) */
  private endlessRamp = 1;

  // run state
  private time = 0;
  private kills = 0;
  private score = 0;
  private coins = 0;
  private diff = DIFFICULTIES.normal;
  private stage = STAGES.honsha;
  private meta = { dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 };

  // player
  private px = 0; private py = 0;
  private hp = 120; private maxHp = 120;
  private level = 1; private xp = 0; private xpNext = xpForLevel(1);
  private iframes = 0;
  private moveX = 0; private moveY = 0;
  private lastDirX = 1; private lastDirY = 0;
  // dash (original action: burst move + brief iframes)
  private dashCd = 0; private dashT = 0;
  private dashDx = 1; private dashDy = 0;
  private static readonly DASH_MAX = 2.5;
  // random office events (original system)
  private nextEventT = 80;
  private xpBoostT = 0;
  private coinBoostT = 0;
  private weapons: OwnedWeapon[] = [];
  private passives: OwnedPassive[] = [];
  private pendingLevels = 0;
  private rerollLeft = 1;
  private banishLeft = 1;
  private banned = new Set<string>();
  private barrierAngle = 0;
  private walkPhase = 0;
  private facingLeft = false;

  // juice & visual enhancements
  private traumaShake = new TraumaScreenShake();
  private hitstop = new HitStopManager();
  private damageNumberPool = new DamageNumberPool(128);

  // world
  private enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private eprojs: EnemyProj[] = [];
  private gems: Gem[] = [];
  private coinPs: CoinP[] = [];
  private pickups: Pickup[] = [];
  private rings: Ring[] = [];
  private booms: Boom[] = [];
  private pools: Pool[] = [];
  private parts: Particle[] = [];
  private nums: DmgNum[] = [];
  private spawnT = 0;
  private bossIdx = 0;
  private hudT = 0;
  private shakeT = 0; private shakeMag = 0;
  private chests = 0;
  private gemsCollected = 0;
  private killsByKind: Record<string, number> = {};

  constructor(canvas: HTMLCanvasElement, sound: SurvivorSound, ev: EngineEvents) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.sound = sound;
    this.ev = ev;
  }

  start(opts: StartOpts): void {
    this.diff = DIFFICULTIES[opts.difficulty];
    this.stage = STAGES[opts.stage ?? 'honsha'];
    this.meta = { dmgMul: opts.dmgMul, maxHpBonus: opts.maxHpBonus, speedMul: opts.speedMul, magnetMul: opts.magnetMul };
    this.time = 0; this.kills = 0; this.score = 0; this.coins = 0;
    this.px = 0; this.py = 0;
    this.maxHp = 120 + opts.maxHpBonus;
    this.hp = this.maxHp;
    this.level = 1; this.xp = 0; this.xpNext = xpForLevel(1);
    this.iframes = 0;
    this.moveX = 0; this.moveY = 0;
    this.facingLeft = false;
    this.barrierAngle = 0; this.walkPhase = 0;
    this.hudT = 0; this.shakeT = 0;
    this.traumaShake.reset();
    this.hitstop.reset();
    this.damageNumberPool.clear();
    this.weapons = [{ id: 'shuriken', lv: 1, cd: 0.4 }];
    this.passives = [];
    this.pendingLevels = 0; this.rerollLeft = 1; this.banishLeft = 1;
    this.banned = new Set();
    this.enemies = []; this.projs = []; this.eprojs = []; this.gems = [];
    this.coinPs = []; this.pickups = []; this.rings = []; this.booms = [];
    this.pools = [];
    this.parts = []; this.nums = [];
    this.spawnT = 0.5; this.bossIdx = 0;
    this.chests = 0; this.gemsCollected = 0; this.killsByKind = {};
    this.dashCd = 0; this.dashT = 0;
    this.nextEventT = 80; this.xpBoostT = 0; this.coinBoostT = 0;
    this.paused = false; this.levelPending = false; this.over = false; this.endless = false;
    this.endlessRamp = 1;
    this.last = performance.now();
    if (!this.running) {
      this.running = true;
      this.registerLoop();
    }
    this.emitHud();
    this.ev.onBanner('出社！', '定時まで生き残れ！やる気を集めて強化しよう');
  }

  private loop = (now: number, gen: number): void => {
    if (gen !== this.activeGen || this.destroyed) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (!this.paused && !this.levelPending && !this.over) this.update(dt);
    this.render();
    this.hudT += dt;
    if (this.hudT >= 0.12) { this.hudT = 0; this.emitHud(); }
    this.raf = requestAnimationFrame((n) => this.loop(n, gen));
  };

  private registerLoop(): void {
    this.activeGen += 1;
    const gen = this.activeGen;
    this.last = performance.now();
    this.raf = requestAnimationFrame((n) => this.loop(n, gen));
  }

  destroy(): void {
    this.destroyed = true;
    this.activeGen += 1;
    cancelAnimationFrame(this.raf);
    this.running = false;
  }

  setPaused(p: boolean): void { this.paused = p; }
  setMove(x: number, y: number): void {
    const safeX = Number.isFinite(x) ? x : 0;
    const safeY = Number.isFinite(y) ? y : 0;
    this.moveX = safeX;
    this.moveY = safeY;
    if (safeX < 0) {
      this.facingLeft = true;
    } else if (safeX > 0) {
      this.facingLeft = false;
    }
  }

  /** Dash toward current input (or last direction). Brief burst + iframes. */
  setDash(): void {
    if (this.paused || this.levelPending || this.over || this.dashCd > 0) return;
    let dx = this.moveX; let dy = this.moveY;
    if (Math.hypot(dx, dy) < 0.1) { dx = this.lastDirX; dy = this.lastDirY; }
    const len = Math.hypot(dx, dy) || 1;
    this.dashDx = dx / len;
    this.dashDy = dy / len;
    this.dashT = 0.22;
    this.dashCd = SurvivorEngine.DASH_MAX;
    this.iframes = Math.max(this.iframes, 0.32);
    this.sound.dash();
    this.burst(this.px, this.py, '#67e8f9', 10, 260);
  }

  continueEndless(): void {
    if (!this.over) return;
    this.over = false;
    this.endless = true;
    this.hp = this.maxHp;
    // schedule bosses were already spawned (or skipped); endless uses periodic reinforcements
    this.bossIdx = BOSS_SCHEDULE.length;
    // fair restart: clear the floor (leftover bosses included) & bullets, brief breather.
    // Endless then escalates fresh via the director + periodic reinforcements.
    this.enemies = [];
    this.eprojs = [];
    this.iframes = 2;
    this.endlessRamp = 0;
    this.spawnT = 2;
    // pre-seed a scattered field far away (avoids a synchronized kill-ring)
    for (let i = 0; i < 36; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 900 + Math.random() * 600;
      const kind = this.pickTrashKind();
      this.enemies.push(this.makeEnemy(kind, this.px + Math.cos(ang) * r, this.py + Math.sin(ang) * r, false, false));
    }
    this.ev.onBanner('[無限] 残業突入！', '終わらない残業…どこまで耐えられるか');
    this.emitHud();
  }

  /* ----- derived stats ----- */

  private passiveLv(id: PassiveId): number {
    return this.passives.find((p) => p.id === id)?.lv ?? 0;
  }
  private dmgMul(): number { return (1 + 0.08 * this.passiveLv('power')) * this.meta.dmgMul; }
  private speed(): number { return 215 * (1 + 0.06 * this.passiveLv('shoes')) * this.meta.speedMul; }
  private magnetR(): number { return 120 * (1 + 0.25 * this.passiveLv('magnet')) * this.meta.magnetMul; }
  private regen(): number { return 0.8 * this.passiveLv('care'); }
  private cdr(): number { return Math.pow(0.94, this.passiveLv('watch')); }

  /* ----- level up ----- */

  private weaponLv(id: WeaponId): number { return this.weapons.find((w) => w.id === id)?.lv ?? 0; }

  private buildChoices(): LevelChoice[] {
    const pool: LevelChoice[] = [];
    for (const id of WEAPON_ORDER) {
      if (this.banned.has(`w:${id}`)) continue;
      const lv = this.weaponLv(id);
      const def = weaponDefOf(id);
      if (lv === 0 && this.weapons.length < MAX_WEAPON_SLOTS) {
        pool.push({ kind: 'weapon', id, name: def.name, icon: def.icon, desc: `${def.desc}`, toLv: 1, isNew: true });
      } else if (lv > 0 && lv < def.maxLv) {
        pool.push({ kind: 'weapon', id, name: def.name, icon: def.icon, desc: `Lv${lv} → Lv${lv + 1} に強化`, toLv: lv + 1, isNew: false });
      }
    }
    for (const id of PASSIVE_ORDER) {
      if (this.banned.has(`p:${id}`)) continue;
      const lv = this.passiveLv(id);
      const def = passiveDefOf(id);
      if (lv === 0 && this.passives.length < MAX_PASSIVE_SLOTS) {
        pool.push({ kind: 'passive', id, name: def.name, icon: def.icon, desc: def.desc, toLv: 1, isNew: true });
      } else if (lv > 0 && lv < def.maxLv) {
        pool.push({ kind: 'passive', id, name: def.name, icon: def.icon, desc: `${def.desc} (Lv${lv + 1})`, toLv: lv + 1, isNew: false });
      }
    }
    // shuffle, prefer upgrades slightly? plain shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = pool.slice(0, 3);
    while (picks.length < 3) {
      picks.push(
        picks.length === pool.length
          ? { kind: 'bonus', id: `heal${picks.length}`, name: '社食弁当', icon: 'heal', desc: 'HPを50%回復', toLv: 0, isNew: false }
          : { kind: 'bonus', id: `coins${picks.length}`, name: '臨時ボーナス', icon: 'coin', desc: '残業代 +50', toLv: 0, isNew: false },
      );
    }
    // ensure fallback variety
    if (pool.length === 0) {
      picks[0] = { kind: 'bonus', id: 'heal0', name: '社食弁当', icon: 'heal', desc: 'HPを50%回復', toLv: 0, isNew: false };
      picks[1] = { kind: 'bonus', id: 'coins1', name: '臨時ボーナス', icon: 'coin', desc: '残業代 +50', toLv: 0, isNew: false };
      picks[2] = { kind: 'bonus', id: 'heal2', name: '栄養ドリンク', icon: 'bomb', desc: 'HPを全回復', toLv: 0, isNew: false };
    }
    return picks;
  }

  private currentChoices: LevelChoice[] = [];

  private triggerLevelUp(): void {
    this.levelPending = true;
    this.currentChoices = this.buildChoices();
    this.sound.levelup();
    this.ev.onLevelUp({
      level: this.level,
      choices: this.currentChoices,
      canReroll: this.rerollLeft > 0,
      canBanish: this.banishLeft > 0,
    });
  }

  applyUpgrade(choice: LevelChoice): void {
    if (!this.levelPending) return;
    this.sound.select();
    if (choice.kind === 'weapon') {
      const w = this.weapons.find((x) => x.id === choice.id);
      if (w) w.lv = choice.toLv;
      else this.weapons.push({ id: choice.id as WeaponId, lv: 1, cd: 0.3 });
    } else if (choice.kind === 'passive') {
      const p = this.passives.find((x) => x.id === choice.id);
      if (p) p.lv = choice.toLv;
      else this.passives.push({ id: choice.id as PassiveId, lv: 1 });
      if (choice.id === 'lunch') {
        const gain = 15;
        this.maxHp += gain;
        this.hp = Math.min(this.maxHp, this.hp + gain);
      }
    } else {
      if (choice.id.startsWith('heal')) {
        this.hp = choice.id === 'heal2' ? this.maxHp : Math.min(this.maxHp, this.hp + this.maxHp * 0.5);
        this.sound.heal();
      } else {
        this.coins += 50;
        this.score += 250;
        this.sound.coin();
      }
    }
    this.pendingLevels -= 1;
    if (this.pendingLevels > 0) {
      this.currentChoices = this.buildChoices();
      this.ev.onLevelUp({
        level: this.level, choices: this.currentChoices,
        canReroll: this.rerollLeft > 0, canBanish: this.banishLeft > 0,
      });
    } else {
      this.levelPending = false;
      this.emitHud();
      this.ev.onLevelClosed();
    }
  }

  rerollChoices(): void {
    if (!this.levelPending || this.rerollLeft <= 0) return;
    this.rerollLeft -= 1;
    this.currentChoices = this.buildChoices();
    this.sound.select();
    this.ev.onLevelUp({
      level: this.level, choices: this.currentChoices,
      canReroll: this.rerollLeft > 0, canBanish: this.banishLeft > 0,
    });
  }

  banishChoice(index: number): void {
    if (!this.levelPending || this.banishLeft <= 0) return;
    const c = this.currentChoices[index];
    if (!c || c.kind === 'bonus') return;
    this.banishLeft -= 1;
    this.banned.add(`${c.kind === 'weapon' ? 'w' : 'p'}:${c.id}`);
    this.currentChoices = this.buildChoices();
    this.sound.select();
    this.ev.onLevelUp({
      level: this.level, choices: this.currentChoices,
      canReroll: this.rerollLeft > 0, canBanish: this.banishLeft > 0,
    });
  }

  /* ----- update ----- */

  private update(dt: number): void {
    const { frozen } = this.hitstop.update(dt);
    this.traumaShake.update(dt);
    this.damageNumberPool.update(dt);

    if (frozen) {
      return;
    }

    this.time += dt;
    const t = this.time;

    // victory
    if (!this.endless && t >= RUN_SECONDS) {
      this.finishRun(true);
      return;
    }

    // movement (dash overrides)
    const mx = this.moveX; const my = this.moveY;
    const len = Math.hypot(mx, my);
    if (len > 0.1) {
      this.lastDirX = mx / len;
      this.lastDirY = my / len;
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      const sp = this.speed() * 2.7;
      this.px += this.dashDx * sp * dt;
      this.py += this.dashDy * sp * dt;
      this.walkPhase += dt * 22;
      if (Math.random() < 0.6) this.burst(this.px, this.py, '#67e8f9', 1, 60);
    } else if (len > 0.01) {
      const sp = this.speed();
      this.px += (mx / Math.max(1, len)) * sp * dt * Math.min(1, len);
      this.py += (my / Math.max(1, len)) * sp * dt * Math.min(1, len);
      this.walkPhase += dt * 10;
    }
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.xpBoostT > 0) this.xpBoostT -= dt;
    if (this.coinBoostT > 0) this.coinBoostT -= dt;
    const rg = this.regen();
    if (rg > 0 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + rg * dt);

    // random office events (original)
    if (!this.endless && t >= this.nextEventT && t < RUN_SECONDS - 20) {
      this.nextEventT = t + 75 + Math.random() * 30;
      const roll = Math.random();
      if (roll < 0.34) {
        // coffee break: vacuum everything + heal
        for (const g of this.gems) {
          g.vx = (this.px - g.x) * 4;
          g.vy = (this.py - g.y) * 4;
        }
        for (const c of this.coinPs) {
          c.vx = (this.px - c.x) * 4;
          c.vy = (this.py - c.y) * 4;
        }
        this.hp = Math.min(this.maxHp, this.hp + 20);
        this.ev.onBanner('【休憩】コーヒーブレイク！', 'やる気と残業代を一気に回収＋HP回復');
        this.sound.heal();
      } else if (roll < 0.67) {
        this.xpBoostT = 30;
        this.ev.onBanner('【査定】査定タイム！', '30秒間やる気2倍！稼ぎ時だ');
        this.sound.chest();
      } else {
        this.coinBoostT = 30;
        this.ev.onBanner('【割増】残業割り増し！', '30秒間残業代2倍！稼ぎ時だ');
        this.sound.chest();
      }
    }

    // boss schedule
    while (this.bossIdx < BOSS_SCHEDULE.length && t >= BOSS_SCHEDULE[this.bossIdx].atSec) {
      const b = BOSS_SCHEDULE[this.bossIdx];
      this.bossIdx += 1;
      this.spawnBoss(b.kind);
      this.ev.onBanner(b.title, b.sub);
      this.sound.boss();
      this.traumaShake.addTrauma(0.5);
    }
    // endless extra bosses
    if (this.endless && Math.floor(t) % 90 === 0 && Math.floor(t - dt) % 90 !== 0) {
      this.spawnBoss(Math.random() < 0.5 ? 'exec' : 'senmu');
      this.ev.onBanner('【警報】増援役員！', '残業はまだ終わらない…');
    }

    // director
    if (this.endless && this.endlessRamp < 1) {
      this.endlessRamp = Math.min(1, this.endlessRamp + dt / 30);
    }
    const ramp = this.endless ? Math.max(0.25, this.endlessRamp) : 1;
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.enemies.length < MAX_ENEMIES) {
      const interval = Math.max(0.22, 1.05 - t * 0.0013) / this.diff.countMul / this.stage.spawnMul / ramp;
      this.spawnT = interval * rand(0.7, 1.2);
      const batch = Math.max(1, Math.round((1 + Math.floor(t / 75)) * ramp));
      for (let i = 0; i < batch; i++) this.spawnTrash();
    }

    this.updateWeapons(dt);
    this.updateProjs(dt);
    this.updatePools(dt);
    this.updateEnemies(dt);
    this.updateEprojs(dt);
    this.updatePickups(dt);
    this.updateFx(dt);

    // level queue
    if (this.pendingLevels > 0 && !this.levelPending) this.triggerLevelUp();

    if (this.hp <= 0) {
      this.hp = 0;
      this.finishRun(false);
    }
  }

  private hpScale(): number {
    const t = this.time;
    return (1 + t * 0.011 + Math.pow(t / 60, 1.6) * 0.25) * this.diff.hpMul * this.stage.hpMul;
  }
  private dmgScale(): number {
    // damage grows much slower than HP: endless stays skill-based, not one-shot
    return (1 + this.time * 0.0009) * this.diff.dmgMul;
  }

  private spawnPos(): { x: number; y: number } {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.hypot(VIEW_W, VIEW_H) / 2 + rand(40, 140);
    return { x: this.px + Math.cos(ang) * r, y: this.py + Math.sin(ang) * r };
  }

  private pickTrashKind(): EnemyKind {
    const min = this.time / 60;
    const cands: { kind: EnemyKind; w: number }[] = [];
    for (const k of ['mail', 'doc', 'claim', 'overtime', 'nomikai', 'bossMid', 'hr', 'audit'] as EnemyKind[]) {
      const d = ENEMIES[k];
      if (min >= d.fromMin && d.weight > 0) cands.push({ kind: k, w: d.weight });
    }
    let total = 0;
    for (const c of cands) total += c.w;
    let x = Math.random() * total;
    for (const c of cands) { x -= c.w; if (x < 0) return c.kind; }
    return 'mail';
  }

  private makeEnemy(kind: EnemyKind, x: number, y: number, elite: boolean, boss: boolean): Enemy {
    const d = ENEMIES[kind];
    const hs = this.hpScale() * (elite ? 7 : 1) * (boss ? 1 : 1);
    const hp = d.hp * hs;
    // bosses scale less aggressively on contact damage so stacked bosses stay fair
    const dmgMulBoss = boss ? 0.75 : 1;
    return {
      o: true, kind, x, y, hp, maxHp: hp,
      spd: d.speed * rand(0.9, 1.1) * Math.min(1.3, 1 + this.time * 0.0004) * this.stage.speedMul,
      dmg: d.damage * this.dmgScale() * (elite ? 1.3 : 1) * dmgMulBoss,
      xp: d.xp * (elite ? 5 : 1) * this.stage.xpMul,
      coins: d.coins * (elite ? 5 : 1) * this.stage.coinMul,
      radius: d.radius * (elite ? 1.35 : 1) * (boss ? 1.15 : 1),
      icon: d.icon, color: d.color,
      hitCd: 0, flash: 0, kx: 0, ky: 0,
      elite, boss, ranged: d.ranged, splitter: d.splitter, score: d.score * (elite ? 5 : 1) * (boss ? 3 : 1) * this.stage.scoreMul,
      shootCd: rand(1, 2.5), dashCd: rand(3, 5), dashT: 0, summonCd: 4,
      barrierCd: 0, boomHit: 0,
    };
  }

  private spawnTrash(): void {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const kind = this.pickTrashKind();
    const p = this.spawnPos();
    const elite = this.time > 120 && Math.random() < (this.time > 300 ? 0.08 : 0.05);
    this.enemies.push(this.makeEnemy(kind, p.x, p.y, elite, false));
  }

  private spawnBoss(kind: EnemyKind): void {
    const p = this.spawnPos();
    this.enemies.push(this.makeEnemy(kind, p.x, p.y, false, true));
  }

  /* ----- weapons ----- */

  private nearestEnemy(maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    for (const e of this.enemies) {
      const d = dist2(this.px, this.py, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  private randomEnemyWithin(maxDist: number): Enemy | null {
    let pick: Enemy | null = null;
    let n = 0;
    const md = maxDist * maxDist;
    for (const e of this.enemies) {
      if (dist2(this.px, this.py, e.x, e.y) < md) {
        n += 1;
        if (Math.random() < 1 / n) pick = e;
      }
    }
    return pick;
  }

  private critRoll(dmg: number): { dmg: number; crit: boolean } {
    if (Math.random() < 0.05) return { dmg: dmg * 2, crit: true };
    return { dmg, crit: false };
  }

  private updateWeapons(dt: number): void {
    const cdr = this.cdr();
    const dm = this.dmgMul();
    for (const w of this.weapons) {
      w.cd -= dt;
      switch (w.id) {
        case 'shuriken': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(540);
          if (!tgt) { w.cd = 0.1; break; }
          w.cd = 1.05 * cdr;
          const n = 1 + Math.floor((w.lv + 1) / 3);
          const dmg = 11 * (1 + 0.28 * (w.lv - 1)) * dm;
          const base = Math.atan2(tgt.y - this.py, tgt.x - this.px);
          for (let i = 0; i < n; i++) {
            if (this.projs.length >= MAX_PROJECTILES) break;
            const a = base + (i - (n - 1) / 2) * 0.12;
            this.projs.push({
              x: this.px, y: this.py,
              vx: Math.cos(a) * 560, vy: Math.sin(a) * 560,
              dmg, radius: 10, pierce: 1 + Math.floor(w.lv / 3), life: 1.4,
              kind: 'shuriken', color: '#e2e8f0', blast: 0, homing: 0, age: 0, hit: new Set(),
            });
          }
          this.sound.shoot();
          break;
        }
        case 'coffee': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(480);
          if (!tgt) { w.cd = 0.1; break; }
          w.cd = 1.5 * cdr;
          const n = 2 + Math.floor(w.lv / 2);
          const dmg = 8 * (1 + 0.28 * (w.lv - 1)) * dm;
          const base = Math.atan2(tgt.y - this.py, tgt.x - this.px);
          for (let i = 0; i < n; i++) {
            if (this.projs.length >= MAX_PROJECTILES) break;
            const a = base + (i - (n - 1) / 2) * 0.16;
            this.projs.push({
              x: this.px, y: this.py,
              vx: Math.cos(a) * 480, vy: Math.sin(a) * 480,
              dmg, radius: 9, pierce: 0, life: 1.1,
              kind: 'coffee', color: '#b45309', blast: 0, homing: 0, age: 0, hit: new Set(),
            });
          }
          this.sound.shoot();
          break;
        }
        case 'barrier': {
          // continuous — handled in updateEnemies collision
          this.barrierAngle += dt * (2.4 + 0.15 * w.lv);
          break;
        }
        case 'boomerang': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(520);
          if (!tgt) { w.cd = 0.15; break; }
          w.cd = 2.2 * cdr;
          const n = 1 + Math.floor(w.lv / 3);
          const dmg = 15 * (1 + 0.3 * (w.lv - 1)) * dm;
          const base = Math.atan2(tgt.y - this.py, tgt.x - this.px);
          for (let i = 0; i < n; i++) {
            if (this.projs.length >= MAX_PROJECTILES) break;
            const a = base + ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 0.35);
            this.projs.push({
              x: this.px, y: this.py,
              vx: Math.cos(a) * 430, vy: Math.sin(a) * 430,
              dmg, radius: 13, pierce: 999, life: 1.7,
              kind: 'boomerang', color: '#fde047', blast: 0, homing: 1, age: 0, hit: new Set(),
            });
          }
          this.sound.shoot();
          break;
        }
        case 'bomb': {
          if (w.cd > 0) break;
          w.cd = Math.max(0.9, 2.5 - 0.12 * w.lv) * cdr;
          const tgt = this.randomEnemyWithin(460);
          const tx = tgt ? tgt.x : this.px + rand(-200, 200);
          const ty = tgt ? tgt.y : this.py + rand(-200, 200);
          const dmg = 32 * (1 + 0.3 * (w.lv - 1)) * dm;
          this.booms.push({
            x: tx, y: ty, r: 85 + 9 * w.lv, dmg, t: 0, dur: 0.35, knock: 260, hit: new Set(),
          });
          this.burst(tx, ty, '#fb923c', 14, 160);
          this.sound.shoot();
          break;
        }
        case 'hanko': {
          if (w.cd > 0) break;
          w.cd = Math.max(1.4, 3.2 - 0.15 * w.lv) * cdr;
          const dmg = 26 * (1 + 0.3 * (w.lv - 1)) * dm;
          this.booms.push({
            x: this.px, y: this.py, r: 120 + 12 * w.lv, dmg, t: 0, dur: 0.3, knock: 340, hit: new Set(),
          });
          this.burst(this.px, this.py, '#f472b6', 16, 220);
          this.sound.shoot();
          break;
        }
        case 'phone': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(600);
          if (!tgt) { w.cd = 0.15; break; }
          w.cd = 1.9 * cdr;
          const n = 1 + Math.floor(w.lv / 2);
          const dmg = 13 * (1 + 0.28 * (w.lv - 1)) * dm;
          for (let i = 0; i < n; i++) {
            if (this.projs.length >= MAX_PROJECTILES) break;
            const a = rand(0, Math.PI * 2);
            this.projs.push({
              x: this.px, y: this.py,
              vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
              dmg, radius: 9, pierce: 0, life: 2.2,
              kind: 'missile', color: '#4ade80', blast: 34, homing: 6, age: 0, hit: new Set(),
            });
          }
          this.sound.shoot();
          break;
        }
        case 'bell': {
          if (w.cd > 0) break;
          w.cd = Math.max(2.2, 5.2 - 0.3 * w.lv) * cdr;
          const dmg = 22 * (1 + 0.32 * (w.lv - 1)) * dm;
          this.rings.push({
            x: this.px, y: this.py, r: 30, maxR: 190 + 22 * w.lv,
            dmg, knock: 430, width: 30, color: '#fde047', hit: new Set(),
          });
          this.sound.hit();
          break;
        }
        case 'contract_storm': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(600);
          if (!tgt) { w.cd = 0.1; break; }
          w.cd = 0.65 * cdr;
          const dmg = 24 * dm;
          const base = Math.atan2(tgt.y - this.py, tgt.x - this.px);
          for (let i = 0; i < 4; i++) {
            if (this.projs.length >= MAX_PROJECTILES) break;
            const a = base + (i - 1.5) * 0.22;
            this.projs.push({
              x: this.px, y: this.py,
              vx: Math.cos(a) * 640, vy: Math.sin(a) * 640,
              dmg, radius: 12, pierce: 999, life: 1.8,
              kind: 'contract_storm', color: '#f8fafc', blast: 0, homing: 0, age: 0, hit: new Set(),
            });
          }
          this.sound.shoot();
          break;
        }
        case 'caffeine_geyser': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(520);
          if (!tgt) { w.cd = 0.1; break; }
          w.cd = 0.9 * cdr;
          const dmg = 22 * dm;
          const base = Math.atan2(tgt.y - this.py, tgt.x - this.px);
          const angles = [base - 0.2, base, base + 0.2, base + Math.PI - 0.15, base + Math.PI + 0.15];
          for (const a of angles) {
            if (this.projs.length >= MAX_PROJECTILES) break;
            this.projs.push({
              x: this.px, y: this.py,
              vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
              dmg, radius: 14, pierce: 999, life: 1.3,
              kind: 'caffeine_geyser', color: '#78350f', blast: 0, homing: 0, age: 0, hit: new Set(),
            });
          }
          this.sound.shoot();
          break;
        }
        case 'kanban_barrier': {
          this.barrierAngle += dt * 3.8;
          break;
        }
        case 'gold_exchange': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(560);
          if (!tgt) { w.cd = 0.15; break; }
          w.cd = 1.8 * cdr;
          const dmg = 42 * dm;
          const base = Math.atan2(tgt.y - this.py, tgt.x - this.px);
          for (let i = 0; i < 4; i++) {
            if (this.projs.length >= MAX_PROJECTILES) break;
            const a = base + (i * Math.PI) / 2;
            this.projs.push({
              x: this.px, y: this.py,
              vx: Math.cos(a) * 480, vy: Math.sin(a) * 480,
              dmg, radius: 16, pierce: 999, life: 2.2,
              kind: 'gold_exchange', color: '#facc15', blast: 0, homing: 1, age: 0, hit: new Set(),
            });
          }
          this.sound.shoot();
          break;
        }
        case 'taurine_supernova': {
          if (w.cd > 0) break;
          w.cd = 1.6 * cdr;
          const dmg = 45 * dm;
          for (let c = 0; c < 3; c++) {
            const tgt = this.randomEnemyWithin(480);
            const tx = tgt ? tgt.x + rand(-20, 20) : this.px + rand(-180, 180);
            const ty = tgt ? tgt.y + rand(-20, 20) : this.py + rand(-180, 180);
            this.pools.push({
              x: tx, y: ty, r: 75, dmg: dmg * 0.35, life: 4.0, maxLife: 4.0, tickCd: 0.1,
            });
            this.burst(tx, ty, '#84cc16', 12, 140);
          }
          this.sound.shoot();
          break;
        }
        case 'emergency_hotline': {
          if (w.cd > 0) break;
          w.cd = 0.85 * cdr;
          const tgt = this.nearestEnemy(600);
          if (!tgt) break;
          const dmg = 50 * dm;
          this.booms.push({
            x: tgt.x, y: tgt.y, r: 110, dmg, t: 0, dur: 0.25, knock: 300, hit: new Set(),
          });
          this.burst(tgt.x, tgt.y, '#38bdf8', 18, 240);
          this.sound.shoot();
          break;
        }
        case 'imperial_seal': {
          if (w.cd > 0) break;
          w.cd = 2.2 * cdr;
          const dmg = 80 * dm;
          const radius = 240;
          this.booms.push({
            x: this.px, y: this.py, r: radius, dmg, t: 0, dur: 0.45, knock: 450, hit: new Set(),
          });
          this.burst(this.px, this.py, '#dc2626', 28, 300);
          this.traumaShake.addTrauma(0.5);
          for (const e of this.enemies) {
            if (dist2(this.px, this.py, e.x, e.y) < radius * radius) {
              e.hitCd = 1.0;
            }
          }
          this.sound.hit();
          break;
        }
        case 'grand_chime': {
          if (w.cd > 0) break;
          w.cd = 3.5 * cdr;
          const dmg = 60 * dm;
          this.rings.push({
            x: this.px, y: this.py, r: 40, maxR: 360,
            dmg, knock: 500, width: 45, color: '#fde047', hit: new Set(),
          });
          this.traumaShake.addTrauma(0.4);
          for (const e of this.enemies) {
            if (!e.boss) {
              e.hitCd = 1.5;
              e.kx = 0;
              e.ky = 0;
            }
          }
          this.sound.hit();
          break;
        }
      }
    }

    // barrier & kanban barrier damage
    const kanban = this.weapons.find((w) => w.id === 'kanban_barrier');
    const barrier = this.weapons.find((w) => w.id === 'barrier');
    if (kanban) {
      const orbs = 4;
      const radius = 95;
      const dmg = 42 * dm;
      for (let i = 0; i < orbs; i++) {
        const a = this.barrierAngle + (i * Math.PI * 2) / orbs;
        const ox = this.px + Math.cos(a) * radius;
        const oy = this.py + Math.sin(a) * radius;
        for (const e of this.enemies) {
          if (e.barrierCd > 0) continue;
          if (dist2(ox, oy, e.x, e.y) < (24 + e.radius) * (24 + e.radius)) {
            e.barrierCd = 0.25;
            this.damageEnemy(e, dmg, 220, ox, oy, false);
            this.burst(ox, oy, '#38bdf8', 4, 100);
          }
        }
      }
    } else if (barrier) {
      const orbs = 1 + Math.ceil(barrier.lv / 2);
      const radius = 66 + 5 * barrier.lv;
      const dmg = (9 + 4 * barrier.lv) * dm;
      for (let i = 0; i < orbs; i++) {
        const a = this.barrierAngle + (i * Math.PI * 2) / orbs;
        const ox = this.px + Math.cos(a) * radius;
        const oy = this.py + Math.sin(a) * radius;
        for (const e of this.enemies) {
          if (e.barrierCd > 0) continue;
          if (dist2(ox, oy, e.x, e.y) < (18 + e.radius) * (18 + e.radius)) {
            e.barrierCd = 0.35;
            this.damageEnemy(e, dmg, 140, ox, oy, false);
          }
        }
      }
    }

    // rings expand
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.x = this.px; r.y = this.py;
      r.r += 420 * dt;
      for (const e of this.enemies) {
        if (r.hit.has(e)) continue;
        const d = Math.sqrt(dist2(r.x, r.y, e.x, e.y));
        if (Math.abs(d - r.r) < r.width / 2 + e.radius) {
          r.hit.add(e);
          this.damageEnemy(e, r.dmg, r.knock, r.x, r.y, false);
        }
      }
      if (r.r >= r.maxR) this.rings.splice(i, 1);
    }

    // explosions / stamps
    for (let i = this.booms.length - 1; i >= 0; i--) {
      const b = this.booms[i];
      b.t += dt;
      for (const e of this.enemies) {
        if (b.hit.has(e)) continue;
        if (dist2(b.x, b.y, e.x, e.y) < (b.r + e.radius) * (b.r + e.radius)) {
          b.hit.add(e);
          this.damageEnemy(e, b.dmg, b.knock, b.x, b.y, false);
        }
      }
      if (b.t >= b.dur) this.booms.splice(i, 1);
    }
  }

  private updatePools(dt: number): void {
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const p = this.pools[i];
      p.life -= dt;
      p.tickCd -= dt;
      if (p.tickCd <= 0) {
        p.tickCd = 0.25;
        const r2 = p.r * p.r;
        for (const e of this.enemies) {
          if (dist2(p.x, p.y, e.x, e.y) < r2) {
            this.damageEnemy(e, p.dmg, 20, p.x, p.y, true);
            e.kx *= 0.5;
            e.ky *= 0.5;
          }
        }
      }
      if (p.life <= 0) {
        this.pools.splice(i, 1);
      }
    }
  }

  private updateProjs(dt: number): void {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.age += dt;
      p.life -= dt;
      if ((p.kind === 'boomerang' || p.kind === 'gold_exchange') && p.age > 0.4) {
        const a = Math.atan2(this.py - p.y, this.px - p.x);
        const sp = p.kind === 'gold_exchange' ? 520 : 460;
        p.vx += (Math.cos(a) * sp - p.vx) * Math.min(1, 5 * dt);
        p.vy += (Math.sin(a) * sp - p.vy) * Math.min(1, 5 * dt);
        if (p.kind === 'gold_exchange' && Math.random() < 0.15) {
          this.burst(p.x, p.y, '#facc15', 1, 30);
        }
      } else if (p.kind === 'missile') {
        const tgt = this.nearestTo(p.x, p.y, 500);
        if (tgt) {
          const a = Math.atan2(tgt.y - p.y, tgt.x - p.x);
          const cur = Math.atan2(p.vy, p.vx);
          let da = a - cur;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          const na = cur + Math.max(-p.homing * dt, Math.min(p.homing * dt, da));
          const sp = Math.min(520, 380 + p.age * 120);
          p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let dead = p.life <= 0;
      if (!dead) {
        for (const e of this.enemies) {
          if (p.hit.has(e)) continue;
          const rr = p.radius + e.radius;
          if (dist2(p.x, p.y, e.x, e.y) < rr * rr) {
            p.hit.add(e);
            this.damageEnemy(e, p.dmg, 120, p.x - p.vx * 0.01, p.y - p.vy * 0.01, false);
            if (p.blast > 0) {
              this.booms.push({ x: p.x, y: p.y, r: p.blast, dmg: p.dmg * 0.6, t: 0, dur: 0.2, knock: 150, hit: new Set([e]) });
              this.burst(p.x, p.y, '#4ade80', 6, 120);
              dead = true;
              break;
            }
            if (p.hit.size > p.pierce) { dead = true; break; }
          }
        }
      }
      if (dead) this.projs.splice(i, 1);
    }
  }

  private nearestTo(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    for (const e of this.enemies) {
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  private updateEnemies(dt: number): void {
    const pr = 8;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.flash > 0) e.flash -= dt;
      if (e.hitCd > 0) e.hitCd -= dt;
      if (e.barrierCd > 0) e.barrierCd -= dt;
      if (e.shootCd > 0) e.shootCd -= dt;
      if (e.dashCd > 0) e.dashCd -= dt;
      if (e.summonCd > 0) e.summonCd -= dt;
      if (e.dashT > 0) e.dashT -= dt;

      const dx = this.px - e.x; const dy = this.py - e.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      let sp = e.spd;
      // ranged keep distance
      let mvx = dx / d; let mvy = dy / d;
      if (e.ranged && !e.boss && d < 240) { mvx = -mvx; mvy = -mvy; }
      if (e.kind === 'senmu' || e.kind === 'president') {
        if (e.dashCd <= 0 && d < 420) { e.dashT = 0.8; e.dashCd = 5; }
        if (e.dashT > 0) sp *= 3;
      }
      e.x += (mvx * sp + e.kx) * dt;
      e.y += (mvy * sp + e.ky) * dt;
      e.kx *= Math.max(0, 1 - 6 * dt);
      e.ky *= Math.max(0, 1 - 6 * dt);

      // ranged fire
      if (e.ranged && e.shootCd <= 0 && d < 520) {
        e.shootCd = e.boss ? 3.2 : 2.4;
        if (e.boss) {
          const n = 8 + Math.floor(this.time / 120);
          const base = Math.atan2(dy, dx);
          for (let k = 0; k < n; k++) {
            const a = base + (k * Math.PI * 2) / n;
            this.eprojs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: e.dmg * 0.5, radius: 8, life: 4 });
          }
        } else {
          const a = Math.atan2(dy, dx);
          this.eprojs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 175, vy: Math.sin(a) * 175, dmg: e.dmg * 0.7, radius: 7, life: 4 });
        }
      }
      // president summon
      if (e.kind === 'president' && e.summonCd <= 0 && this.enemies.length < MAX_ENEMIES - 3) {
        e.summonCd = 6;
        for (let k = 0; k < 3; k++) {
          this.enemies.push(this.makeEnemy('mail', e.x + rand(-40, 40), e.y + rand(-40, 40), false, false));
        }
      }

      // contact damage
      const rr = e.radius + pr;
      if (dist2(e.x, e.y, this.px, this.py) < rr * rr && e.hitCd <= 0 && this.iframes <= 0) {
        e.hitCd = 0.8;
        this.iframes = 0.6;
        this.hp -= Math.max(1, Math.round(e.dmg));
        this.sound.hurt();
        this.burst(this.px, this.py, '#ef4444', 10, 200);
        this.hitstop.triggerMs(20);
        this.traumaShake.addTrauma(0.4);
        if (this.hp <= 0) { this.hp = 0; }
      }
    }

    // soft circle-circle swarm separation without stacking death balls or NaN singularities
    const numEnemies = this.enemies.length;
    for (let a = 0; a < numEnemies; a++) {
      const e1 = this.enemies[a];
      for (let b = a + 1; b < numEnemies; b++) {
        const e2 = this.enemies[b];
        let sepX = e2.x - e1.x;
        let sepY = e2.y - e1.y;
        const minDist = e1.radius + e2.radius;
        const d2 = sepX * sepX + sepY * sepY;
        if (d2 < minDist * minDist) {
          let dist = Math.sqrt(d2);
          if (dist < 0.001) {
            const ang = Math.random() * Math.PI * 2;
            sepX = Math.cos(ang);
            sepY = Math.sin(ang);
            dist = 1;
          }
          const overlap = minDist - dist;
          const push = overlap * 0.5 * Math.min(1, 10 * dt);
          const nx = sepX / dist;
          const ny = sepY / dist;
          e1.x -= nx * push;
          e1.y -= ny * push;
          e2.x += nx * push;
          e2.y += ny * push;
        }
      }
    }
  }

  private updateEprojs(dt: number): void {
    const kanban = this.weapons.find((w) => w.id === 'kanban_barrier');
    for (let i = this.eprojs.length - 1; i >= 0; i--) {
      const p = this.eprojs[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let dead = p.life <= 0;

      // kanban barrier intercepts enemy projectiles
      if (!dead && kanban) {
        const orbs = 4;
        const radius = 95;
        for (let k = 0; k < orbs; k++) {
          const a = this.barrierAngle + (k * Math.PI * 2) / orbs;
          const ox = this.px + Math.cos(a) * radius;
          const oy = this.py + Math.sin(a) * radius;
          if (dist2(p.x, p.y, ox, oy) < (p.radius + 22) * (p.radius + 22)) {
            dead = true;
            this.burst(p.x, p.y, '#38bdf8', 6, 120);
            this.sound.hit();
            break;
          }
        }
      }

      if (!dead && this.iframes <= 0) {
        const rr = p.radius + 8;
        if (dist2(p.x, p.y, this.px, this.py) < rr * rr) {
          dead = true;
          this.iframes = 0.6;
          this.hp -= Math.max(1, Math.round(p.dmg));
          this.sound.hurt();
          this.burst(this.px, this.py, '#ef4444', 8, 180);
          this.hitstop.triggerMs(20);
          this.traumaShake.addTrauma(0.4);
        }
      }
      if (dead) this.eprojs.splice(i, 1);
    }
  }

  private damageEnemy(e: Enemy, dmg: number, knock: number, fromX: number, fromY: number, silent: boolean): void {
    if (e.hp <= 0) return;
    const { dmg: final, crit } = this.critRoll(dmg);
    e.hp -= final;
    e.flash = 0.09;
    const d = Math.max(1, Math.hypot(e.x - fromX, e.y - fromY));
    e.kx += ((e.x - fromX) / d) * knock;
    e.ky += ((e.y - fromY) / d) * knock;

    if (crit || e.boss || final >= 30) {
      this.hitstop.triggerMs(25);
    }

    this.damageNumberPool.spawn(
      e.x + rand(-8, 8),
      e.y - e.radius - 4,
      Math.round(final),
      crit ? 'crit' : 'normal'
    );

    if (!silent) this.sound.hit();
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);
    this.kills += 1;
    this.killsByKind[e.kind] = (this.killsByKind[e.kind] ?? 0) + 1;
    this.score += Math.round(e.score * this.diff.scoreMul);
    this.sound.kill();
    this.burst(e.x, e.y, e.color, e.boss ? 30 : 8, e.boss ? 320 : 170);

    if (e.boss) {
      this.hitstop.triggerMs(120);
      this.traumaShake.addTrauma(0.6);
    }
    // drops
    if (this.gems.length < MAX_GEMS) {
      const big = e.xp >= 15;
      const n = big ? Math.min(5, 1 + Math.floor(e.xp / 20)) : 1;
      for (let i = 0; i < n; i++) {
        this.gems.push({ x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: rand(-60, 60), vy: rand(-60, 60), val: Math.ceil(e.xp / n), age: 0 });
      }
    }
    if (Math.random() < 0.35) {
      this.coinPs.push({ x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-80, 80), val: e.coins });
    }
    // special drops
    const roll = Math.random();
    if (e.boss || e.elite) {
      this.pickups.push({ x: e.x, y: e.y, kind: 'chest', bob: 0 });
    } else if (roll < 0.012) {
      this.pickups.push({ x: e.x, y: e.y, kind: 'heal', bob: 0 });
    } else if (roll < 0.02) {
      this.pickups.push({ x: e.x, y: e.y, kind: 'magnet', bob: 0 });
    } else if (roll < 0.027) {
      this.pickups.push({ x: e.x, y: e.y, kind: 'bomb', bob: 0 });
    }
    // splitter
    if (e.splitter) {
      for (let i = 0; i < 2; i++) {
        if (this.enemies.length >= MAX_ENEMIES) break;
        this.enemies.push(this.makeEnemy('mail', e.x + rand(-16, 16), e.y + rand(-16, 16), false, false));
      }
    }
  }

  private updatePickups(dt: number): void {
    const mr = this.magnetR();
    const mr2 = mr * mr;
    // gems
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.age += dt;
      const d2 = dist2(g.x, g.y, this.px, this.py);
      // old gems fly to the player: no XP is ever stranded (catch-up)
      const attracted = d2 < mr2 || g.age > 25;
      if (attracted) {
        const d = Math.max(1, Math.sqrt(d2));
        const pull = g.age > 25 ? 1400 : 700 * (1 - d / (mr + 1)) + 200;
        g.vx += ((this.px - g.x) / d) * pull * dt * 4;
        g.vy += ((this.py - g.y) / d) * pull * dt * 4;
      } else {
        g.vx *= Math.max(0, 1 - 4 * dt);
        g.vy *= Math.max(0, 1 - 4 * dt);
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (d2 < 26 * 26) {
        this.gems.splice(i, 1);
        this.gainXp(Math.round(g.val * this.diff.xpMul * (this.xpBoostT > 0 ? 2 : 1)));
        this.sound.pickup();
      }
    }
    // coins
    for (let i = this.coinPs.length - 1; i >= 0; i--) {
      const c = this.coinPs[i];
      const d2 = dist2(c.x, c.y, this.px, this.py);
      if (d2 < mr2) {
        const d = Math.max(1, Math.sqrt(d2));
        c.vx += ((this.px - c.x) / d) * 2400 * dt;
        c.vy += ((this.py - c.y) / d) * 2400 * dt;
      } else {
        c.vx *= Math.max(0, 1 - 4 * dt);
        c.vy *= Math.max(0, 1 - 4 * dt);
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (d2 < 26 * 26) {
        this.coinPs.splice(i, 1);
        const v = c.val * (this.coinBoostT > 0 ? 2 : 1);
        this.coins += v;
        this.score += v * 5;
        this.sound.coin();
      }
    }
    // pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.bob += dt;
      const d2 = dist2(p.x, p.y, this.px, this.py);
      const grabR = p.kind === 'chest' ? 30 : 26;
      if (d2 < Math.max(mr2 * 0.25, grabR * grabR) || d2 < 30 * 30) {
        // drift toward player when close
        const d = Math.max(1, Math.sqrt(d2));
        p.x += ((this.px - p.x) / d) * 260 * dt;
        p.y += ((this.py - p.y) / d) * 260 * dt;
      }
      if (d2 < grabR * grabR) {
        this.pickups.splice(i, 1);
        this.collectPickup(p.kind);
      }
    }
  }

  private collectPickup(kind: Pickup['kind']): void {
    if (kind === 'heal') {
      this.hp = Math.min(this.maxHp, this.hp + 25);
      this.ev.onBanner('【支給】差し入れ！', 'HPが25回復した');
      this.sound.heal();
    } else if (kind === 'magnet') {
      for (const g of this.gems) {
        g.vx = (this.px - g.x) * 3;
        g.vy = (this.py - g.y) * 3;
      }
      this.ev.onBanner('【吸引】定期券パワー！', 'やる気を一気に引き寄せた');
      this.sound.pickup();
    } else if (kind === 'bomb') {
      this.ev.onBanner('【爆破】全部壊したれ！', '画面内の敵に大ダメージ！');
      const targets = [...this.enemies];
      for (const e of targets) this.damageEnemy(e, 160 * this.dmgMul(), 300, this.px, this.py, true);
      this.traumaShake.addTrauma(0.5);
      this.sound.chest();
    } else {
      // chest: check evolution first!
      this.chests += 1;
      const weaponsMap = new Map<string, number>(this.weapons.map((w) => [w.id, w.lv]));
      const passivesMap = new Map<string, number>(this.passives.map((p) => [p.id, p.lv]));
      const recipe = checkEvolution(weaponsMap, passivesMap);

      if (recipe) {
        // Evolve base weapon!
        const baseIdx = this.weapons.findIndex((w) => w.id === recipe.baseWeaponId);
        if (baseIdx >= 0) {
          this.weapons[baseIdx] = {
            id: recipe.evolvedId as WeaponId,
            lv: 1,
            cd: 0.2,
          };
          this.hitstop.triggerMs(120);
          this.traumaShake.addTrauma(0.7);
          this.ev.onBanner(`【進化】${recipe.name}`, `${recipe.flavor} ${recipe.desc}`);
          this.sound.boss();
          this.burst(this.px, this.py, '#facc15', 35, 300);
          this.score += 2000;
          return;
        }
      }

      // normal chest: coins + random upgrade
      const bonus = 30 + Math.floor(this.time / 10);
      this.coins += bonus;
      const upgradable = this.weapons.filter((w) => w.lv < weaponDefOf(w.id).maxLv);
      if (upgradable.length > 0 && (this.weapons.length < MAX_WEAPON_SLOTS || Math.random() < 0.8)) {
        const w = upgradable[Math.floor(Math.random() * upgradable.length)];
        w.lv += 1;
        this.ev.onBanner('【宝箱】強化獲得！', `${weaponDefOf(w.id).name}がLv${w.lv}にアップ！ +${bonus}コイン`);
      } else {
        this.hp = Math.min(this.maxHp, this.hp + 40);
        this.ev.onBanner('【宝箱】社食支給！', `HPが40回復！ +${bonus}コイン`);
      }
      this.score += 500;
      this.sound.chest();
    }
  }

  private gainXp(v: number): void {
    this.xp += v;
    this.gemsCollected += 1;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level += 1;
      this.xpNext = xpForLevel(this.level);
      this.pendingLevels += 1;
      this.score += 100;
    }
  }

  private burst(x: number, y: number, color: string, n: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= MAX_PARTICLES) return;
      const a = rand(0, Math.PI * 2);
      const s = rand(speed * 0.3, speed);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), max: 0.6, color, size: rand(2, 5) });
    }
  }

  private shake(t: number, mag: number): void {
    this.shakeT = Math.max(this.shakeT, t);
    this.shakeMag = mag;
  }

  private updateFx(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - 5 * dt);
      p.vy *= Math.max(0, 1 - 5 * dt);
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.life -= dt;
      n.y -= 46 * dt;
      if (n.life <= 0) this.nums.splice(i, 1);
    }
    if (this.shakeT > 0) this.shakeT -= dt;
  }

  private finishRun(victory: boolean): void {
    this.over = true;
    const score = Math.round(this.score + this.time * 5 * this.diff.scoreMul + this.level * 100);
    const weaponLevels: Record<string, number> = {};
    for (const w of this.weapons) weaponLevels[w.id] = w.lv;
    const result: RunResult = {
      victory, time: Math.min(this.time, RUN_SECONDS + 3600),
      kills: this.kills, level: this.level, score,
      coins: this.coins, difficulty: this.diff.id,
      chests: this.chests, gems: this.gemsCollected,
      killsByKind: { ...this.killsByKind }, weaponLevels,
    };
    if (victory) this.sound.victory();
    else this.sound.defeat();
    this.emitHud();
    this.ev.onGameOver(result);
  }

  private emitHud(): void {
    let bossName = '';
    let bossHp = 0;
    let bossMax = 0;
    for (const e of this.enemies) {
      if (e.boss && e.hp > 0) {
        bossName = `${e.icon} ${ENEMIES[e.kind].name}`;
        bossHp = Math.max(0, Math.ceil(e.hp));
        bossMax = Math.ceil(e.maxHp);
        break;
      }
    }
    this.ev.onHud({
      hp: Math.ceil(this.hp), maxHp: this.maxHp,
      level: this.level, xp: this.xp, xpNext: this.xpNext,
      time: this.time, kills: this.kills, score: this.score, coins: this.coins,
      weapons: this.weapons.map((w) => ({ id: w.id, icon: weaponDefOf(w.id).icon, lv: w.lv })),
      passives: this.passives.map((p) => ({ id: p.id, icon: passiveDefOf(p.id).icon, lv: p.lv })),
      bossName, bossHp, bossMax,
      endless: this.endless,
      dashCd: Math.max(0, this.dashCd), dashMax: SurvivorEngine.DASH_MAX,
      xpBoostT: Math.max(0, this.xpBoostT), coinBoostT: Math.max(0, this.coinBoostT),
    });
  }

  /* ----- render ----- */

  private render(): void {
    const { ctx } = this;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.save();
    ctx.scale(dpr, dpr);
    // crisp pixel art: never smooth scaled sprites
    ctx.imageSmoothingEnabled = false;
    const W = VIEW_W; const H = VIEW_H;

    const traumaOffset = this.traumaShake.getOffset();
    let sx = traumaOffset.offsetX;
    let sy = traumaOffset.offsetY;
    if (this.shakeT > 0) {
      sx += rand(-this.shakeMag, this.shakeMag);
      sy += rand(-this.shakeMag, this.shakeMag);
    }
    const camX = this.px - W / 2 + sx;
    const camY = this.py - H / 2 + sy;

    // floor
    const night = Math.max(0, Math.min(1, (this.time - 420) / 180));
    ctx.fillStyle = night > 0.5 ? '#0d1226' : this.stage.floor;
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = this.stage.grid;
    ctx.lineWidth = 1;
    const grid = 80;
    const x0 = Math.floor(camX / grid) * grid;
    const y0 = Math.floor(camY / grid) * grid;
    ctx.beginPath();
    for (let x = x0; x < camX + W + grid; x += grid) {
      ctx.moveTo(x - camX, 0);
      ctx.lineTo(x - camX, H);
    }
    for (let y = y0; y < camY + H + grid; y += grid) {
      ctx.moveTo(0, y - camY);
      ctx.lineTo(W, y - camY);
    }
    ctx.stroke();

    // desks decor
    const cell = 240;
    const cx0 = Math.floor(camX / cell);
    const cy0 = Math.floor(camY / cell);
    for (let cx = cx0; cx < cx0 + W / cell + 2; cx++) {
      for (let cy = cy0; cy < cy0 + H / cell + 2; cy++) {
        const h = hashCell(cx, cy);
        if (h < 0.55) {
          const dx = cx * cell + h * 120 - camX;
          const dy = cy * cell + ((h * 7919) % 1) * 120 - camY;
          ctx.fillStyle = 'rgba(120,90,60,0.35)';
          ctx.fillRect(dx, dy, 74, 40);
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(dx + 8, dy + 6, 24, 14);
          if (h > 0.4) {
            // pixel plant
            ctx.fillStyle = '#15803d';
            ctx.fillRect(dx + 58, dy + 18, 4, 10);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(dx + 56, dy + 12, 3, 8);
            ctx.fillRect(dx + 62, dy + 14, 3, 7);
          }
        }
      }
    }

    const sx2 = (x: number) => x - camX;
    const sy2 = (y: number) => y - camY;

    // pools (taurine_supernova)
    for (const pool of this.pools) {
      const x = sx2(pool.x); const y = sy2(pool.y);
      const alpha = Math.min(0.6, (pool.life / pool.maxLife) * 0.7);
      ctx.fillStyle = `rgba(132, 204, 22, ${alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, pool.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(217, 249, 157, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, pool.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // faceted diamond gems
    for (const g of this.gems) {
      const x = sx2(g.x); const y = sy2(g.y);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      const gemName = g.val >= 30 ? 'gem_gold' : g.val >= 15 ? 'gem_red' : g.val >= 5 ? 'gem_blue' : 'gem_green';
      const sprite = getPixelSprite(gemName, 0, false);
      const s = g.val >= 30 ? 18 : g.val >= 15 ? 14 : g.val >= 5 ? 12 : 10;
      ctx.drawImage(sprite, Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    }

    // coins
    for (const c of this.coinPs) {
      const x = sx2(c.x); const y = sy2(c.y);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      const sprite = getPixelSprite('coin', 0, false);
      ctx.drawImage(sprite, Math.round(x - 7), Math.round(y - 7), 14, 14);
    }

    // pickups (pixel art)
    for (const p of this.pickups) {
      const x = sx2(p.x); const y = sy2(p.y) + Math.sin(p.bob * 4) * 3;
      if (x < -30 || y < -30 || x > W + 30 || y > H + 30) continue;
      if (p.kind === 'chest') {
        ctx.fillStyle = 'rgba(251,191,36,0.25)';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      const sprite = getPixelSprite(p.kind, 0, false);
      ctx.drawImage(sprite, Math.round(x - 14), Math.round(y - 14), 28, 28);
    }

    // explosions / stamps
    for (const b of this.booms) {
      const x = sx2(b.x); const y = sy2(b.y);
      const k = b.t / b.dur;
      ctx.strokeStyle = `rgba(251,146,60,${1 - k})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, b.r * (0.4 + 0.6 * k), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(251,146,60,${0.25 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(x, y, b.r * (0.4 + 0.6 * k), 0, Math.PI * 2);
      ctx.fill();
    }
    // rings
    for (const r of this.rings) {
      const x = sx2(r.x); const y = sy2(r.y);
      ctx.strokeStyle = 'rgba(253,224,71,0.85)';
      ctx.lineWidth = r.width * (1 - r.r / (r.maxR * 1.4));
      ctx.beginPath();
      ctx.arc(x, y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // enemies (16-bit retro pixel art with 2-frame animation and hit-flash)
    const animFrame = Math.floor(this.time * 4) % 2;
    for (const e of this.enemies) {
      const x = sx2(e.x); const y = sy2(e.y);
      if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + e.radius * 0.8, e.radius * 0.8, e.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // sprite body
      const size = e.boss ? 54 : e.elite ? 44 : Math.round(e.radius * 2.6);
      const spriteName = e.flash > 0 ? `${e.kind}_white` : e.kind;
      const flip = e.kx < 0 || (this.px < e.x);
      const sprite = getPixelSprite(spriteName, animFrame, flip);
      ctx.drawImage(sprite, Math.round(x - size / 2), Math.round(y - size / 2), size, size);

      if (e.elite) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, e.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.boss) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, e.radius + 5 + Math.sin(this.time * 6) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if ((e.elite || e.boss) && e.hp < e.maxHp) {
        const w = e.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - w / 2, y - e.radius - 12, w, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - w / 2, y - e.radius - 12, (w * Math.max(0, e.hp)) / e.maxHp, 5);
      }
    }

    // enemy bullets
    for (const p of this.eprojs) {
      const x = sx2(p.x); const y = sy2(p.y);
      ctx.fillStyle = '#f0abfc';
      ctx.beginPath();
      ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a21caf';
      ctx.beginPath();
      ctx.arc(x, y, p.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // projectiles (16-bit retro pixel art)
    for (const p of this.projs) {
      const x = sx2(p.x); const y = sy2(p.y);
      let spriteName: string;
      let size = 18;
      switch (p.kind) {
        case 'shuriken': spriteName = 'shuriken'; size = 18; break;
        case 'coffee': spriteName = 'coffee'; size = 16; break;
        case 'boomerang': spriteName = 'boomerang'; size = 20; break;
        case 'missile': spriteName = 'phone'; size = 16; break;
        case 'contract_storm': spriteName = 'contract_storm'; size = 22; break;
        case 'caffeine_geyser': spriteName = 'caffeine_geyser'; size = 24; break;
        case 'gold_exchange': spriteName = 'gold_exchange'; size = 24; break;
        default: spriteName = 'shuriken'; size = 16; break;
      }
      const sprite = getPixelSprite(spriteName, 0, false);
      ctx.drawImage(sprite, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }

    // player barrier orbs & kanban boards
    const kanban = this.weapons.find((w) => w.id === 'kanban_barrier');
    const barrier = this.weapons.find((w) => w.id === 'barrier');
    if (kanban && this.hp > 0) {
      const orbs = 4;
      const radius = 95;
      const sprite = getPixelSprite('kanban_barrier', 0, false);
      for (let i = 0; i < orbs; i++) {
        const a = this.barrierAngle + (i * Math.PI * 2) / orbs;
        const ox = this.px - camX + Math.cos(a) * radius;
        const oy = this.py - camY + Math.sin(a) * radius;
        ctx.drawImage(sprite, Math.round(ox - 14), Math.round(oy - 14), 28, 28);
      }
    } else if (barrier && this.hp > 0) {
      const orbs = 1 + Math.ceil(barrier.lv / 2);
      const radius = 66 + 5 * barrier.lv;
      const sprite = getPixelSprite('barrier', 0, false);
      for (let i = 0; i < orbs; i++) {
        const a = this.barrierAngle + (i * Math.PI * 2) / orbs;
        const ox = this.px - camX + Math.cos(a) * radius;
        const oy = this.py - camY + Math.sin(a) * radius;
        ctx.drawImage(sprite, Math.round(ox - 10), Math.round(oy - 10), 20, 20);
      }
    }

    // player (4-frame walk cycle + horizontal flip + hit flash)
    if (this.hp > 0) {
      const x = this.px - camX; const y = this.py - camY;
      const blink = this.iframes > 0 && Math.floor(this.time * 16) % 2 === 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + 14, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // magnet range faint
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, this.magnetR(), 0, Math.PI * 2);
      ctx.stroke();

      const moving = Math.hypot(this.moveX, this.moveY) > 0.1;
      const walkFrame = moving ? Math.floor(this.walkPhase) % 4 : 0;
      const spriteName = blink ? 'player_white' : 'player';
      const sprite = getPixelSprite(spriteName, walkFrame, this.facingLeft);
      ctx.drawImage(sprite, Math.round(x - 20), Math.round(y - 24), 40, 40);
    }

    // particles
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx2(p.x) - p.size / 2, sy2(p.y) - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // damage numbers via DamageNumberPool
    ctx.save();
    ctx.translate(-camX, -camY);
    this.damageNumberPool.render(ctx);
    ctx.restore();

    // night tint
    if (night > 0) {
      ctx.fillStyle = `rgba(30,27,75,${0.25 * night})`;
      ctx.fillRect(0, 0, W, H);
    }
    // low hp vignette
    const hpFrac = this.hp / this.maxHp;
    if (hpFrac < 0.35 && this.hp > 0) {
      const pulse = 0.25 + 0.15 * Math.sin(this.time * 6);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, 'rgba(239,68,68,0)');
      g.addColorStop(1, `rgba(239,68,68,${pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }
}

/* ---------------- def lookups (non-nullable index access) ---------------- */

function weaponDefOf(id: WeaponId) { return WEAPONS[id]; }
function passiveDefOf(id: PassiveId) { return PASSIVES[id]; }

export { WEAPON_ORDER, PASSIVE_ORDER };
