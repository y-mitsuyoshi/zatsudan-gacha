/**
 * 社畜サバイバー — core game engine (Canvas2D, infinite office floor).
 * Player moves, weapons fire automatically. Survive 10:00 (9:00 -> 18:00).
 */

import {
  VIEW_W, VIEW_H, RUN_SECONDS, MAX_ENEMIES, MAX_PROJECTILES, MAX_PARTICLES,
  MAX_GEMS, WEAPON_ORDER, PASSIVE_ORDER, ENEMIES, BOSS_SCHEDULE,
  DIFFICULTIES, xpForLevel, MAX_WEAPON_SLOTS, MAX_PASSIVE_SLOTS,
  WEAPONS, PASSIVES, STAGES,
  type WeaponId, type PassiveId, type EnemyKind, type Difficulty, type StageId,
} from './config';
import type { SurvivorSound } from './audio';
import { getPixelSprite } from './pixelSprites';
import { checkEvolution, EVOLUTION_RECIPES } from './evolutions';
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
  /** Rolling 1.5s damage-per-second telemetry */
  dps?: number;
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
  /** monotonically increasing id of this choice set (stale-click guard) */
  seq: number;
  /** remaining queued level-ups including this one */
  pending: number;
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
  kind?: 'taurine' | 'roast';
}

interface BeamArc {
  x1: number; y1: number; x2: number; y2: number;
  color: string; core: string; life: number; max: number; width: number;
}

interface EnemyProj { x: number; y: number; vx: number; vy: number; dmg: number; radius: number; life: number }

/** vac: vacuumed by magnet/coffee break — homes in until collected (never stalls mid-way) */
interface Gem { x: number; y: number; vx: number; vy: number; val: number; age: number; vac?: boolean }
interface CoinP { x: number; y: number; vx: number; vy: number; val: number; age?: number; vac?: boolean }
interface Pickup { x: number; y: number; kind: 'heal' | 'magnet' | 'bomb' | 'chest'; bob: number; age?: number; vac?: boolean }
interface Ring { x: number; y: number; r: number; maxR: number; dmg: number; knock: number; width: number; color: string; hit: Set<Enemy>; evolved?: boolean }
interface Boom { x: number; y: number; r: number; dmg: number; t: number; dur: number; knock: number; hit: Set<Enemy>; kind?: 'bomb' | 'hanko' | 'imperial_seal' | 'hotline' }
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
  /** rate-limit for minor (per-hit) hitstops so dense late-game combat never stalls the clock */
  private minorHitstopCd = 0;
  /** red full-screen flash when the player takes damage (seconds) */
  private hurtFlash = 0;
  /** golden flash/ring when a level is gained (seconds) */
  private levelFlash = 0;
  /** boss arrival warning overlay (seconds) */
  private bossWarnT = 0;
  /** endless mode: next reinforcement boss time */
  private nextEndlessBossT = 0;
  /** stale-click guard for level-up choices */
  private choiceSeq = 0;
  /** logical viewport size (world units visible on screen) */
  private viewW = VIEW_W;
  private viewH = VIEW_H;

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
  private beams: BeamArc[] = [];
  private parts: Particle[] = [];
  private nums: DmgNum[] = [];
  private dmgHistory: { t: number; dmg: number }[] = [];
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
    this.minorHitstopCd = 0; this.hurtFlash = 0; this.levelFlash = 0; this.bossWarnT = 0;
    this.nextEndlessBossT = 0;
    this.currentChoices = [];
    this.weapons = [{ id: 'shuriken', lv: 1, cd: 0.4 }];
    this.passives = [];
    this.pendingLevels = 0; this.rerollLeft = 1; this.banishLeft = 1;
    this.banned = new Set();
    this.enemies = []; this.projs = []; this.eprojs = []; this.gems = [];
    this.coinPs = []; this.pickups = []; this.rings = []; this.booms = [];
    this.pools = []; this.beams = [];
    this.parts = []; this.nums = []; this.dmgHistory = [];
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

  setPaused(p: boolean): void {
    this.paused = p;
    // avoid a dt spike / stuck input direction after resuming
    this.last = performance.now();
    if (p) { this.moveX = 0; this.moveY = 0; }
  }

  /** Logical viewport (world units). The canvas backing store should be viewW*dpr x viewH*dpr. */
  setViewport(w: number, h: number): void {
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 100 || h < 100) return;
    this.viewW = Math.round(w);
    this.viewH = Math.round(h);
  }

  getViewport(): { w: number; h: number } { return { w: this.viewW, h: this.viewH }; }

  /** Give up the current run (pause menu "早退"). Settles as a defeat so earnings are kept. */
  forfeit(): void {
    if (this.over || this.destroyed) return;
    this.levelPending = false;
    this.pendingLevels = 0;
    this.paused = false;
    this.finishRun(false);
  }

  isOver(): boolean { return this.over; }
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
    this.nextEndlessBossT = this.time + 90;
    this.paused = false;
    this.last = performance.now();
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
  private magnetR(): number { return 145 * (1 + 0.25 * this.passiveLv('magnet')) * this.meta.magnetMul; }
  private regen(): number { return 0.8 * this.passiveLv('care'); }
  private cdr(): number { return Math.pow(0.94, this.passiveLv('watch')); }
  private currentDps(): number {
    const cutoff = this.time - 1.5;
    let total = 0;
    for (let i = this.dmgHistory.length - 1; i >= 0; i--) {
      if (this.dmgHistory[i].t < cutoff) {
        this.dmgHistory.splice(0, i + 1);
        break;
      }
      total += this.dmgHistory[i].dmg;
    }
    return total / 1.5;
  }

  /* ----- level up ----- */

  private weaponLv(id: WeaponId): number { return this.weapons.find((w) => w.id === id)?.lv ?? 0; }

  private buildChoices(): LevelChoice[] {
    const pool: LevelChoice[] = [];
    for (const id of WEAPON_ORDER) {
      if (this.banned.has(`w:${id}`)) continue;
      // Do not re-offer a base weapon that has already evolved into its legendary form
      const evolvedRecipe = EVOLUTION_RECIPES.find((r) => r.baseWeaponId === id);
      if (evolvedRecipe && this.weapons.some((w) => w.id === evolvedRecipe.evolvedId)) continue;
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

  private emitLevelUp(): void {
    this.emitHud();
    this.choiceSeq += 1;
    this.ev.onLevelUp({
      level: this.level,
      choices: this.currentChoices,
      canReroll: this.rerollLeft > 0,
      canBanish: this.banishLeft > 0,
      seq: this.choiceSeq,
      pending: this.pendingLevels,
    });
  }

  private triggerLevelUp(): void {
    this.levelPending = true;
    this.hitstop.reset();
    this.currentChoices = this.buildChoices();
    this.sound.levelup();
    this.levelFlash = 0.6;
    this.burst(this.px, this.py, '#dfb15b', 18, 240);
    this.emitLevelUp();
  }

  /**
   * Apply a level-up choice. `seq` (from LevelUpData) rejects stale/double clicks that
   * would otherwise silently consume the *next* queued level-up.
   */
  applyUpgrade(choice: LevelChoice, seq?: number): void {
    if (!this.levelPending || this.over) return;
    if (seq !== undefined && seq !== this.choiceSeq) return;
    if (this.currentChoices.length > 0 && !this.currentChoices.some((c) => c.kind === choice.kind && c.id === choice.id)) return;
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
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    if (this.pendingLevels > 0) {
      this.currentChoices = this.buildChoices();
      this.emitLevelUp();
    } else {
      this.levelPending = false;
      this.currentChoices = [];
      this.iframes = Math.max(this.iframes, 0.45);
      this.last = performance.now();
      this.emitHud();
      this.ev.onLevelClosed();
    }
  }

  rerollChoices(): void {
    if (!this.levelPending || this.rerollLeft <= 0) return;
    this.rerollLeft -= 1;
    this.currentChoices = this.buildChoices();
    this.sound.select();
    this.emitLevelUp();
  }

  banishChoice(index: number): void {
    if (!this.levelPending || this.banishLeft <= 0) return;
    const c = this.currentChoices[index];
    if (!c || c.kind === 'bonus') return;
    this.banishLeft -= 1;
    this.banned.add(`${c.kind === 'weapon' ? 'w' : 'p'}:${c.id}`);
    this.currentChoices = this.buildChoices();
    this.sound.select();
    this.emitLevelUp();
  }

  /* ----- update ----- */

  private update(dt: number): void {
    const { frozen } = this.hitstop.update(dt);
    this.traumaShake.update(dt);
    this.damageNumberPool.update(dt);
    if (this.minorHitstopCd > 0) this.minorHitstopCd -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.levelFlash > 0) this.levelFlash -= dt;
    if (this.bossWarnT > 0) this.bossWarnT -= dt;

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
        for (const g of this.gems) g.vac = true;
        for (const c of this.coinPs) c.vac = true;
        for (const p of this.pickups) if (p.kind === 'heal' || p.kind === 'chest') p.vac = true;
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
      this.bossWarnT = 2.2;
    }
    // endless extra bosses (time-scheduled: never double-fires, never skipped by frame timing)
    if (this.endless && this.nextEndlessBossT > 0 && t >= this.nextEndlessBossT) {
      this.nextEndlessBossT = t + 90;
      this.spawnBoss(Math.random() < 0.5 ? 'exec' : 'senmu');
      this.ev.onBanner('【警報】増援役員！', '残業はまだ終わらない…');
      this.sound.boss();
      this.bossWarnT = 2.2;
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

    if (this.hp <= 0) {
      this.hp = 0;
      this.finishRun(false);
      return;
    }

    // level queue
    if (this.pendingLevels > 0 && !this.levelPending) this.triggerLevelUp();
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
    const r = Math.hypot(this.viewW, this.viewH) / 2 + rand(40, 140);
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
          const tgt = this.nearestEnemy(560);
          if (!tgt) { w.cd = 0.1; break; }
          w.cd = 0.92 * cdr;
          const n = 1 + Math.floor((w.lv + 1) / 3);
          const dmg = 12 * (1 + 0.28 * (w.lv - 1)) * dm;
          const base = Math.atan2(tgt.y - this.py, tgt.x - this.px);
          for (let i = 0; i < n; i++) {
            if (this.projs.length >= MAX_PROJECTILES) break;
            const a = base + (i - (n - 1) / 2) * 0.12;
            this.projs.push({
              x: this.px, y: this.py,
              vx: Math.cos(a) * 580, vy: Math.sin(a) * 580,
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
          w.cd = 1.42 * cdr;
          const n = 2 + Math.floor(w.lv / 2);
          const dmg = 9 * (1 + 0.28 * (w.lv - 1)) * dm;
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
          if (w.lv >= 3 && this.pools.length < 18) {
            const distP = 110 + rand(0, 70);
            this.pools.push({
              x: this.px + Math.cos(base) * distP,
              y: this.py + Math.sin(base) * distP,
              r: 36 + w.lv * 3,
              dmg: dmg * 0.35,
              life: 2.2,
              maxLife: 2.2,
              tickCd: 0.15,
              kind: 'roast',
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
          w.cd = 2.05 * cdr;
          const n = 1 + Math.floor(w.lv / 3);
          const dmg = 16 * (1 + 0.3 * (w.lv - 1)) * dm;
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
          w.cd = Math.max(0.9, 2.4 - 0.12 * w.lv) * cdr;
          const tgt = this.randomEnemyWithin(460);
          const tx = tgt ? tgt.x : this.px + rand(-200, 200);
          const ty = tgt ? tgt.y : this.py + rand(-200, 200);
          const dmg = 34 * (1 + 0.3 * (w.lv - 1)) * dm;
          this.booms.push({
            x: tx, y: ty, r: 85 + 9 * w.lv, dmg, t: 0, dur: 0.35, knock: 260, hit: new Set(), kind: 'bomb',
          });
          this.burst(tx, ty, '#fb923c', 14, 160);
          this.sound.shoot();
          break;
        }
        case 'hanko': {
          if (w.cd > 0) break;
          w.cd = Math.max(1.35, 3.0 - 0.15 * w.lv) * cdr;
          const dmg = 28 * (1 + 0.3 * (w.lv - 1)) * dm;
          this.booms.push({
            x: this.px, y: this.py, r: 120 + 12 * w.lv, dmg, t: 0, dur: 0.35, knock: 340, hit: new Set(), kind: 'hanko',
          });
          this.burst(this.px, this.py, '#f472b6', 16, 220);
          this.sound.shoot();
          break;
        }
        case 'phone': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(600);
          if (!tgt) { w.cd = 0.15; break; }
          w.cd = 1.8 * cdr;
          const n = 1 + Math.floor(w.lv / 2);
          const dmg = 14 * (1 + 0.28 * (w.lv - 1)) * dm;
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
          // Signal laser trace to target
          this.beams.push({
            x1: this.px, y1: this.py, x2: tgt.x, y2: tgt.y,
            color: '#f43f5e', core: '#fda4af', life: 0.18, max: 0.18, width: 3,
          });
          this.sound.shoot();
          break;
        }
        case 'bell': {
          if (w.cd > 0) break;
          w.cd = Math.max(2.1, 5.0 - 0.3 * w.lv) * cdr;
          const dmg = 24 * (1 + 0.32 * (w.lv - 1)) * dm;
          this.rings.push({
            x: this.px, y: this.py, r: 30, maxR: 190 + 22 * w.lv,
            dmg, knock: 430, width: 30, color: '#fde047', hit: new Set(), evolved: false,
          });
          this.sound.hit();
          break;
        }
        case 'contract_storm': {
          if (w.cd > 0) break;
          const tgt = this.nearestEnemy(600);
          if (!tgt) { w.cd = 0.1; break; }
          w.cd = 0.6 * cdr;
          const dmg = 28 * dm;
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
          w.cd = 0.85 * cdr;
          const dmg = 25 * dm;
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
          if (this.pools.length < 18) {
            this.pools.push({
              x: this.px + Math.cos(base) * 140,
              y: this.py + Math.sin(base) * 140,
              r: 62,
              dmg: dmg * 0.35,
              life: 3.0,
              maxLife: 3.0,
              tickCd: 0.12,
              kind: 'roast',
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
          w.cd = 1.7 * cdr;
          const dmg = 45 * dm;
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
          w.cd = 1.55 * cdr;
          const dmg = 48 * dm;
          for (let c = 0; c < 3; c++) {
            const tgt = this.randomEnemyWithin(480);
            const tx = tgt ? tgt.x + rand(-20, 20) : this.px + rand(-180, 180);
            const ty = tgt ? tgt.y + rand(-20, 20) : this.py + rand(-180, 180);
            this.pools.push({
              x: tx, y: ty, r: 75, dmg: dmg * 0.35, life: 4.0, maxLife: 4.0, tickCd: 0.1, kind: 'taurine',
            });
            this.burst(tx, ty, '#84cc16', 12, 140);
          }
          this.sound.shoot();
          break;
        }
        case 'emergency_hotline': {
          if (w.cd > 0) break;
          w.cd = 0.8 * cdr;
          const tgt = this.nearestEnemy(600);
          if (!tgt) break;
          const dmg = 54 * dm;
          this.booms.push({
            x: tgt.x, y: tgt.y, r: 110, dmg, t: 0, dur: 0.3, knock: 300, hit: new Set(), kind: 'hotline',
          });
          // Multi-core satellite lightning beam from sky and hero
          this.beams.push({
            x1: tgt.x + rand(-30, 30), y1: tgt.y - 360, x2: tgt.x, y2: tgt.y,
            color: '#0ea5e9', core: '#ffffff', life: 0.28, max: 0.28, width: 7,
          });
          this.beams.push({
            x1: this.px, y1: this.py, x2: tgt.x, y2: tgt.y,
            color: '#38bdf8', core: '#fde047', life: 0.22, max: 0.22, width: 4,
          });
          this.burst(tgt.x, tgt.y, '#38bdf8', 18, 240);
          this.sound.shoot();
          break;
        }
        case 'imperial_seal': {
          if (w.cd > 0) break;
          w.cd = 2.1 * cdr;
          const dmg = 85 * dm;
          const radius = 240;
          this.booms.push({
            x: this.px, y: this.py, r: radius, dmg, t: 0, dur: 0.52, knock: 450, hit: new Set(), kind: 'imperial_seal',
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
          w.cd = 3.4 * cdr;
          const dmg = 65 * dm;
          this.rings.push({
            x: this.px, y: this.py, r: 40, maxR: 360,
            dmg, knock: 500, width: 45, color: '#fde047', hit: new Set(), evolved: true,
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
        this.hitstop.triggerMs(45);
        this.traumaShake.addTrauma(0.4);
        this.hurtFlash = 0.25;
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
          this.hitstop.triggerMs(45);
          this.traumaShake.addTrauma(0.4);
          this.hurtFlash = 0.25;
        }
      }
      if (dead) this.eprojs.splice(i, 1);
    }
  }

  private damageEnemy(e: Enemy, dmg: number, knock: number, fromX: number, fromY: number, silent: boolean): void {
    if (e.hp <= 0) return;
    const { dmg: final, crit } = this.critRoll(dmg);
    const dealt = Math.max(0, Math.min(e.hp, final));
    this.dmgHistory.push({ t: this.time, dmg: dealt });
    e.hp -= final;
    e.flash = 0.09;
    const d = Math.max(1, Math.hypot(e.x - fromX, e.y - fromY));
    e.kx += ((e.x - fromX) / d) * knock;
    e.ky += ((e.y - fromY) / d) * knock;

    // Per-hit micro freeze is rate-limited: with many weapons nearly every frame lands a
    // big hit, and unthrottled 25ms freezes made late-game time crawl at ~1/3 speed.
    if ((crit || e.boss) && this.minorHitstopCd <= 0) {
      this.hitstop.triggerMs(18);
      this.minorHitstopCd = 0.35;
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
      this.burst(e.x, e.y, '#dfb15b', 24, 380);
      for (const g of this.gems) g.vac = true;
      for (const c of this.coinPs) c.vac = true;
      this.ev.onBanner(`【撃破】${ENEMIES[e.kind].name}`, '宝箱をドロップ！画面外なら矢印が場所を示す');
    }
    // drops
    const big = e.xp >= 15;
    const n = big ? Math.min(5, 1 + Math.floor(e.xp / 20)) : 1;
    for (let i = 0; i < n; i++) {
      this.dropGem(e.x + rand(-10, 10), e.y + rand(-10, 10), Math.ceil(e.xp / n), e.boss);
    }
    if (Math.random() < 0.35 || e.boss) {
      this.coinPs.push({ x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-80, 80), val: e.coins, age: 0, vac: e.boss });
    }
    // special drops
    const roll = Math.random();
    if (e.boss || e.elite) {
      this.pickups.push({ x: e.x, y: e.y, kind: 'chest', bob: 0, age: 0, vac: e.boss });
    } else if (roll < 0.012) {
      this.pickups.push({ x: e.x, y: e.y, kind: 'heal', bob: 0, age: 0 });
    } else if (roll < 0.02) {
      this.pickups.push({ x: e.x, y: e.y, kind: 'magnet', bob: 0, age: 0 });
    } else if (roll < 0.027) {
      this.pickups.push({ x: e.x, y: e.y, kind: 'bomb', bob: 0, age: 0 });
    }
    // splitter
    if (e.splitter) {
      for (let i = 0; i < 2; i++) {
        if (this.enemies.length >= MAX_ENEMIES) break;
        this.enemies.push(this.makeEnemy('mail', e.x + rand(-16, 16), e.y + rand(-16, 16), false, false));
      }
    }
  }

  /**
   * Drop an XP gem. At the gem cap the value is merged into the oldest gem instead of being
   * discarded, so XP is never silently lost during huge swarms.
   */
  private dropGem(x: number, y: number, val: number, vac = false): void {
    if (this.gems.length < MAX_GEMS) {
      this.gems.push({ x, y, vx: rand(-60, 60), vy: rand(-60, 60), val, age: 0, vac });
      return;
    }
    const g = this.gems[0];
    if (g) {
      g.val += val;
      if (vac) g.vac = true;
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
      const attracted = d2 < mr2 || g.age > 25 || g.vac === true;
      if (attracted) {
        const d = Math.max(1, Math.sqrt(d2));
        const pull = g.age > 25 || g.vac ? 1400 : 700 * (1 - d / (mr + 1)) + 200;
        g.vx += ((this.px - g.x) / d) * pull * dt * 4;
        g.vy += ((this.py - g.y) / d) * pull * dt * 4;
      } else {
        g.vx *= Math.max(0, 1 - 4 * dt);
        g.vy *= Math.max(0, 1 - 4 * dt);
      }
      if (g.vac || g.age > 25) {
        // cap homing speed & damp lateral drift so vacuumed gems converge instead of orbiting
        const sp = Math.hypot(g.vx, g.vy);
        const max = 1100;
        if (sp > max) { g.vx = (g.vx / sp) * max; g.vy = (g.vy / sp) * max; }
        g.vx *= Math.max(0, 1 - 2 * dt);
        g.vy *= Math.max(0, 1 - 2 * dt);
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (d2 < 26 * 26 || dist2(g.x, g.y, this.px, this.py) < 26 * 26) {
        this.gems.splice(i, 1);
        this.gainXp(Math.round(g.val * this.diff.xpMul * (this.xpBoostT > 0 ? 2 : 1)));
        this.sound.pickup();
      }
    }
    // coins
    for (let i = this.coinPs.length - 1; i >= 0; i--) {
      const c = this.coinPs[i];
      c.age = (c.age ?? 0) + dt;
      const d2 = dist2(c.x, c.y, this.px, this.py);
      if (d2 < mr2 || c.vac || c.age > 30) {
        const d = Math.max(1, Math.sqrt(d2));
        c.vx += ((this.px - c.x) / d) * 2400 * dt;
        c.vy += ((this.py - c.y) / d) * 2400 * dt;
        const sp = Math.hypot(c.vx, c.vy);
        if (sp > 1100) { c.vx = (c.vx / sp) * 1100; c.vy = (c.vy / sp) * 1100; }
        c.vx *= Math.max(0, 1 - 2 * dt);
        c.vy *= Math.max(0, 1 - 2 * dt);
      } else {
        c.vx *= Math.max(0, 1 - 4 * dt);
        c.vy *= Math.max(0, 1 - 4 * dt);
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (d2 < 26 * 26 || dist2(c.x, c.y, this.px, this.py) < 26 * 26) {
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
      p.age = (p.age ?? 0) + dt;
      const d2 = dist2(p.x, p.y, this.px, this.py);
      const grabR = p.kind === 'chest' ? 36 : 30;
      // Chests and aged/vacuumed pickups smoothly home toward the player so they are never stranded
      const autoHome = p.vac === true || (p.kind === 'chest' ? p.age > 5 : p.age > 14);
      const pullR2 = p.kind === 'chest' ? Math.max(mr2 * 1.4, 110 * 110) : Math.max(mr2 * 0.5, 75 * 75);
      if (autoHome || d2 < pullR2) {
        const d = Math.max(1, Math.sqrt(d2));
        const speed = autoHome ? 540 : 340;
        const step = Math.min(d, speed * dt);
        p.x += ((this.px - p.x) / d) * step;
        p.y += ((this.py - p.y) / d) * step;
      }
      if (dist2(p.x, p.y, this.px, this.py) < grabR * grabR) {
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
      // vacuum flag keeps homing until collected (old one-shot impulse decayed and
      // left far gems stranded mid-way on screen)
      for (const g of this.gems) g.vac = true;
      for (const c of this.coinPs) c.vac = true;
      for (const p of this.pickups) if (p.kind === 'heal' || p.kind === 'chest') p.vac = true;
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
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= dt;
      if (b.life <= 0) this.beams.splice(i, 1);
    }
    if (this.shakeT > 0) this.shakeT -= dt;
  }

  private finishRun(victory: boolean): void {
    if (this.over) return;
    this.over = true;
    this.levelPending = false;
    this.currentChoices = [];
    this.hitstop.reset();
    if (victory) {
      // clocking out: XP gems, chests/heals, and overtime pay left on the floor are collected automatically
      for (const g of this.gems) {
        this.gainXp(Math.round(g.val * this.diff.xpMul * (this.xpBoostT > 0 ? 2 : 1)));
      }
      this.gems = [];
      for (const p of this.pickups) {
        if (p.kind === 'chest' || p.kind === 'heal') {
          this.collectPickup(p.kind);
        }
      }
      this.pickups = [];
      for (const c of this.coinPs) {
        const v = c.val * (this.coinBoostT > 0 ? 2 : 1);
        this.coins += v;
        this.score += v * 5;
      }
      this.coinPs = [];
    }
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
        bossName = ENEMIES[e.kind].name;
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
      dps: Math.round(this.currentDps()),
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
    const W = this.viewW; const H = this.viewH;

    const traumaOffset = this.traumaShake.getOffset();
    let sx = traumaOffset.offsetX;
    let sy = traumaOffset.offsetY;
    if (this.shakeT > 0) {
      sx += rand(-this.shakeMag, this.shakeMag);
      sy += rand(-this.shakeMag, this.shakeMag);
    }
    const camX = this.px - W / 2 + sx;
    const camY = this.py - H / 2 + sy;

    // 1. Rich 16-bit Tiled Dark-Office Arena
    const night = Math.max(0, Math.min(1, (this.time - 420) / 180));
    ctx.fillStyle = this.stage.floor;
    ctx.fillRect(0, 0, W, H);

    const grid = 80;
    const gx0 = Math.floor(camX / grid);
    const gy0 = Math.floor(camY / grid);
    const cols = Math.ceil(W / grid) + 2;
    const rows = Math.ceil(H / grid) + 2;
    for (let gx = gx0; gx < gx0 + cols; gx++) {
      for (let gy = gy0; gy < gy0 + rows; gy++) {
        const variant = Math.abs((gx * 3 + gy * 7) % 4);
        const tileSprite = getPixelSprite(`tile_${this.stage.id}`, variant, false);
        const tx = Math.round(gx * grid - camX);
        const ty = Math.round(gy * grid - camY);
        ctx.drawImage(tileSprite, tx, ty, grid, grid);
      }
    }

    // Subtle gothic grid lines over tiles
    ctx.strokeStyle = this.stage.grid;
    ctx.lineWidth = 1;
    const x0 = gx0 * grid;
    const y0 = gy0 * grid;
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

    // 2. Stage-Specific World Landmarks & Ambient Torch/Monitor Lighting Halos
    const cell = 240;
    const cx0 = Math.floor(camX / cell);
    const cy0 = Math.floor(camY / cell);
    for (let cx = cx0; cx < cx0 + W / cell + 2; cx++) {
      for (let cy = cy0; cy < cy0 + H / cell + 2; cy++) {
        const h = hashCell(cx, cy);
        if (h < 0.6) {
          const dx = Math.round(cx * cell + h * 110 - camX);
          const dy = Math.round(cy * cell + ((h * 7919) % 1) * 110 - camY);

          if (this.stage.id === 'factory') {
            // Industrial conveyor segment with hazard stripes & molten vent
            ctx.fillStyle = 'rgba(15,12,8,0.65)';
            ctx.fillRect(dx - 2, dy + 4, 84, 38);
            ctx.fillStyle = '#33291f';
            ctx.fillRect(dx, dy, 80, 36);
            ctx.fillStyle = '#d97706';
            for (let s = 4; s < 74; s += 14) {
              ctx.fillRect(dx + s, dy + 2, 7, 3);
              ctx.fillRect(dx + s, dy + 31, 7, 3);
            }
            ctx.fillStyle = '#1c1610';
            ctx.fillRect(dx + 6, dy + 8, 68, 20);
            if (h > 0.35) {
              // Molten forge vent halo
              const flicker = 0.14 + 0.05 * Math.sin(this.time * 7 + cx);
              ctx.fillStyle = `rgba(249,115,22,${flicker})`;
              ctx.beginPath();
              ctx.arc(dx + 40, dy + 18, 42, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ea580c';
              ctx.fillRect(dx + 32, dy + 13, 16, 10);
            }
          } else if (this.stage.id === 'datacenter') {
            // Obsidian Server Rack Monolith & Cryo Conduit Halo
            ctx.fillStyle = 'rgba(4,10,16,0.7)';
            ctx.fillRect(dx - 2, dy + 4, 68, 46);
            ctx.fillStyle = '#0f2230';
            ctx.fillRect(dx, dy, 64, 42);
            ctx.strokeStyle = '#155e75';
            ctx.lineWidth = 1;
            ctx.strokeRect(dx, dy, 64, 42);
            // Blinking server blade LEDs
            const blinkOn = Math.floor(this.time * 5 + cx + cy) % 2 === 0;
            ctx.fillStyle = blinkOn ? '#22d3ee' : '#0284c7';
            ctx.fillRect(dx + 8, dy + 7, 18, 3);
            ctx.fillRect(dx + 8, dy + 15, 18, 3);
            ctx.fillRect(dx + 8, dy + 23, 18, 3);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(dx + 34, dy + 7, 6, 3);
            ctx.fillRect(dx + 34, dy + 15, 6, 3);
            // Ambient neon cyan monitor/server halo
            ctx.fillStyle = 'rgba(34,211,238,0.08)';
            ctx.beginPath();
            ctx.arc(dx + 32, dy + 21, 46, 0, Math.PI * 2);
            ctx.fill();
          } else if (this.stage.id === 'boardroom') {
            // Gothic Executive Mahogany Table & Golden Candelabra Torch Pillar
            ctx.fillStyle = 'rgba(12,4,7,0.7)';
            ctx.fillRect(dx - 2, dy + 4, 86, 44);
            ctx.fillStyle = '#45121b';
            ctx.fillRect(dx, dy, 82, 40);
            ctx.strokeStyle = '#ca8a04';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(dx + 2, dy + 2, 78, 36);
            // Golden torch pillar & warm flickering halo
            const flicker = 0.14 + 0.05 * Math.sin(this.time * 8 + cy);
            ctx.fillStyle = `rgba(250,204,21,${flicker})`;
            ctx.beginPath();
            ctx.arc(dx + 41, dy + 20, 48, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.fillRect(dx + 38, dy + 17, 6, 6);
          } else {
            // HQ Cubicle Matrix: Dark desk, dual glowing monitors, plant, or Magic-Circle Water Cooler
            ctx.fillStyle = 'rgba(8,11,20,0.55)';
            ctx.fillRect(dx - 2, dy + 4, 78, 42);
            ctx.fillStyle = '#2d231e';
            ctx.fillRect(dx, dy, 74, 38);
            ctx.strokeStyle = '#47382f';
            ctx.lineWidth = 1;
            ctx.strokeRect(dx, dy, 74, 38);
            // Glowing dual monitors
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(dx + 8, dy + 5, 24, 13);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(dx + 10, dy + 7, 20, 9);
            ctx.fillStyle = 'rgba(56,189,248,0.09)';
            ctx.beginPath();
            ctx.arc(dx + 20, dy + 12, 34, 0, Math.PI * 2);
            ctx.fill();
            if (h > 0.42) {
              // Arcane Water Cooler Magic Circle landmark next to cubicle
              const sigilX = dx + 58;
              const sigilY = dy + 19;
              ctx.strokeStyle = 'rgba(56,189,248,0.32)';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.arc(sigilX, sigilY, 13, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = '#15803d';
              ctx.fillRect(dx + 56, dy + 16, 4, 9);
              ctx.fillStyle = '#4ade80';
              ctx.fillRect(dx + 54, dy + 11, 3, 7);
              ctx.fillRect(dx + 60, dy + 13, 3, 6);
            }
          }
        }
      }
    }

    const sx2 = (x: number) => x - camX;
    const sy2 = (y: number) => y - camY;

    // 3. Bubbling Magma / Roast / Taurine Pools
    for (let pi = 0; pi < this.pools.length; pi++) {
      const pool = this.pools[pi];
      const x = sx2(pool.x); const y = sy2(pool.y);
      if (x < -pool.r - 20 || y < -pool.r - 20 || x > W + pool.r + 20 || y > H + pool.r + 20) continue;
      const alpha = Math.min(0.75, (pool.life / pool.maxLife) * 0.85);
      const isRoast = pool.kind === 'roast';
      ctx.fillStyle = isRoast
        ? `rgba(120, 53, 15, ${alpha * 0.55})`
        : `rgba(132, 204, 22, ${alpha * 0.42})`;
      ctx.beginPath();
      ctx.arc(x, y, pool.r, 0, Math.PI * 2);
      ctx.fill();

      // Inner dark-core / magma ring
      ctx.fillStyle = isRoast
        ? `rgba(217, 119, 6, ${alpha * 0.38})`
        : `rgba(163, 230, 53, ${alpha * 0.32})`;
      ctx.beginPath();
      ctx.arc(x, y, pool.r * (0.62 + 0.08 * Math.sin(this.time * 5 + pi)), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isRoast
        ? `rgba(251, 191, 36, ${alpha * 0.85})`
        : `rgba(217, 249, 157, ${alpha * 0.85})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, pool.r, 0, Math.PI * 2);
      ctx.stroke();

      // Bubbling surface blisters & rising steam
      for (let b = 0; b < 4; b++) {
        const ang = (b * Math.PI) / 2 + pi * 1.3 + this.time * 1.2;
        const distB = pool.r * (0.25 + ((b * 0.19 + this.time * 0.4) % 0.55));
        const bx = x + Math.cos(ang) * distB;
        const by = y + Math.sin(ang) * distB;
        const br = 2.5 + 1.5 * Math.abs(Math.sin(this.time * 6 + b + pi));
        ctx.fillStyle = isRoast ? `rgba(254, 243, 199, ${alpha * 0.75})` : `rgba(236, 252, 203, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
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
        // Golden treasure beacon ring + aura
        ctx.fillStyle = 'rgba(251,191,36,0.26)';
        ctx.beginPath();
        ctx.arc(x, y, 22 + Math.sin(this.time * 6) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(253,224,71,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 19, 0, Math.PI * 2);
        ctx.stroke();
      }
      const sprite = getPixelSprite(p.kind, 0, false);
      ctx.drawImage(sprite, Math.round(x - 14), Math.round(y - 14), 28, 28);
    }

    // 4. Explosions / Corporate Hanko Seals / Imperial Decree Stamps
    for (const b of this.booms) {
      const x = sx2(b.x); const y = sy2(b.y);
      const k = Math.min(1, b.t / Math.max(0.01, b.dur));
      const curR = b.r * (0.4 + 0.6 * k);
      const alpha = Math.max(0, 1 - k);

      if (b.kind === 'imperial_seal' || b.kind === 'hanko') {
        const isImperial = b.kind === 'imperial_seal';
        ctx.strokeStyle = isImperial ? `rgba(250,204,21,${alpha * 0.95})` : `rgba(239,68,68,${alpha * 0.9})`;
        ctx.lineWidth = isImperial ? 5 : 3.5;
        ctx.beginPath();
        ctx.arc(x, y, curR, 0, Math.PI * 2);
        ctx.stroke();

        // Inner vermilion hanko ring & cross grid
        ctx.strokeStyle = `rgba(220,38,38,${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, curR * 0.82, 0, Math.PI * 2);
        ctx.moveTo(x - curR * 0.58, y - curR * 0.58);
        ctx.lineTo(x + curR * 0.58, y - curR * 0.58);
        ctx.lineTo(x + curR * 0.58, y + curR * 0.58);
        ctx.lineTo(x - curR * 0.58, y + curR * 0.58);
        ctx.closePath();
        ctx.moveTo(x, y - curR * 0.58);
        ctx.lineTo(x, y + curR * 0.58);
        ctx.moveTo(x - curR * 0.58, y);
        ctx.lineTo(x + curR * 0.58, y);
        ctx.stroke();

        ctx.fillStyle = isImperial ? `rgba(220,38,38,${0.28 * alpha})` : `rgba(244,63,94,${0.22 * alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, curR, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'hotline') {
        ctx.strokeStyle = `rgba(56,189,248,${alpha * 0.95})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, curR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(14,165,233,${0.28 * alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, curR * 0.75, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(251,146,60,${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, curR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(251,146,60,${0.25 * alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, curR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Clockface Resonance Rings (定時の鐘 / 完全定時チャイム)
    for (const r of this.rings) {
      const x = sx2(r.x); const y = sy2(r.y);
      const frac = Math.min(1, r.r / Math.max(1, r.maxR));
      const alpha = Math.max(0.1, 1 - frac * 0.85);
      ctx.strokeStyle = r.evolved ? `rgba(56,189,248,${alpha})` : `rgba(253,224,71,${alpha})`;
      ctx.lineWidth = Math.max(2, r.width * (1 - r.r / (r.maxR * 1.4)));
      ctx.beginPath();
      ctx.arc(x, y, r.r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner gold harmonic ring & 12 clockwork dial ticks
      ctx.strokeStyle = `rgba(253,224,71,${alpha * 0.75})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r.r * 0.86, 0, Math.PI * 2);
      for (let h = 0; h < 12; h++) {
        const ha = (h * Math.PI) / 6 + this.time * 0.5;
        ctx.moveTo(x + Math.cos(ha) * (r.r * 0.82), y + Math.sin(ha) * (r.r * 0.82));
        ctx.lineTo(x + Math.cos(ha) * (r.r * 0.96), y + Math.sin(ha) * (r.r * 0.96));
      }
      ctx.stroke();
    }

    // 6. Multi-Core Plasma & Lightning Beams (取引先コール / 緊急ホットライン)
    for (const b of this.beams) {
      const x1 = sx2(b.x1); const y1 = sy2(b.y1);
      const x2 = sx2(b.x2); const y2 = sy2(b.y2);
      const a = Math.max(0, b.life / b.max);
      ctx.save();
      ctx.globalAlpha = a;
      // Outer plasma glow
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * 2.2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const midX = (x1 + x2) / 2 + Math.sin(this.time * 45) * 10;
      const midY = (y1 + y2) / 2 + Math.cos(this.time * 45) * 10;
      ctx.lineTo(midX, midY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // Inner hot core
      ctx.strokeStyle = b.core;
      ctx.lineWidth = Math.max(1.5, b.width * 0.7);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(midX, midY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Enemies (16-bit retro pixel art + Boss Dread Sigil Aura)
    const animFrame = Math.floor(this.time * 4) % 2;
    let activeBoss: Enemy | null = null;
    for (const e of this.enemies) {
      if (e.boss && e.hp > 0 && !activeBoss) activeBoss = e;
      const x = sx2(e.x); const y = sy2(e.y);
      if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;

      // Ominous rotating crimson-and-gold dread aura beneath Bosses
      if (e.boss) {
        const auraR = e.radius + 14 + Math.sin(this.time * 5) * 3;
        ctx.fillStyle = 'rgba(220,38,38,0.18)';
        ctx.beginPath();
        ctx.arc(x, y + 4, auraR + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(239,68,68,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y + 4, auraR, 0, Math.PI * 2);
        ctx.stroke();
        // Rotating 4-point dread diamond sigil
        ctx.strokeStyle = 'rgba(250,204,21,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let pIdx = 0; pIdx < 4; pIdx++) {
          const pa = this.time * 2.2 + (pIdx * Math.PI) / 2;
          const pxp = x + Math.cos(pa) * auraR;
          const pyp = y + 4 + Math.sin(pa) * auraR;
          if (pIdx === 0) ctx.moveTo(pxp, pyp);
          else ctx.lineTo(pxp, pyp);
        }
        ctx.closePath();
        ctx.stroke();
      }

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
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, e.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if ((e.elite || e.boss) && e.hp < e.maxHp) {
        const w = e.radius * 2.2;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - w / 2, y - e.radius - 13, w, 5);
        ctx.fillStyle = e.boss ? '#f59e0b' : '#ef4444';
        ctx.fillRect(x - w / 2, y - e.radius - 13, (w * Math.max(0, e.hp)) / e.maxHp, 5);
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

    // 8. Projectiles with 16-bit Afterimage Trails & Evolved Sigils
    for (const p of this.projs) {
      const x = sx2(p.x); const y = sy2(p.y);
      if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      let spriteName: string;
      let size = 18;
      let evolvedProj = false;
      let trailColor = 'rgba(226,232,240,0.22)';
      switch (p.kind) {
        case 'shuriken': spriteName = 'shuriken'; size = 18; trailColor = 'rgba(148,163,184,0.25)'; break;
        case 'coffee': spriteName = 'coffee'; size = 16; trailColor = 'rgba(217,119,6,0.25)'; break;
        case 'boomerang': spriteName = 'boomerang'; size = 20; trailColor = 'rgba(253,224,71,0.28)'; break;
        case 'missile': spriteName = 'phone'; size = 16; trailColor = 'rgba(74,222,128,0.28)'; break;
        case 'contract_storm': spriteName = 'contract_storm'; size = 24; evolvedProj = true; trailColor = 'rgba(244,63,94,0.38)'; break;
        case 'caffeine_geyser': spriteName = 'caffeine_geyser'; size = 24; evolvedProj = true; trailColor = 'rgba(251,146,60,0.42)'; break;
        case 'gold_exchange': spriteName = 'gold_exchange'; size = 26; evolvedProj = true; trailColor = 'rgba(250,204,21,0.45)'; break;
        default: spriteName = 'shuriken'; size = 16; break;
      }

      // Motion afterimage trail
      const sp = Math.hypot(p.vx, p.vy) || 1;
      const nx = p.vx / sp;
      const ny = p.vy / sp;
      ctx.fillStyle = trailColor;
      ctx.beginPath();
      ctx.arc(x - nx * 12, y - ny * 12, size * 0.36, 0, Math.PI * 2);
      ctx.arc(x - nx * 22, y - ny * 22, size * 0.22, 0, Math.PI * 2);
      ctx.fill();

      if (evolvedProj) {
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }

      const sprite = getPixelSprite(spriteName, 0, false);
      ctx.drawImage(sprite, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }

    // 9. Player Orbital Barriers (付箋バリア & タスク管理結界) with Arcane Rune Ring
    const kanban = this.weapons.find((w) => w.id === 'kanban_barrier');
    const barrier = this.weapons.find((w) => w.id === 'barrier');
    if (kanban && this.hp > 0) {
      const orbs = 4;
      const radius = 95;
      const hx = this.px - camX;
      const hy = this.py - camY;
      // Arcane cyan-gold barrier ring + inscribed diamond connecting orbitals
      ctx.strokeStyle = 'rgba(34,211,238,0.42)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(hx, hy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(250,204,21,0.38)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < orbs; i++) {
        const a = this.barrierAngle + (i * Math.PI * 2) / orbs;
        const ox = hx + Math.cos(a) * radius;
        const oy = hy + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.closePath();
      ctx.stroke();

      const sprite = getPixelSprite('kanban_barrier', 0, false);
      for (let i = 0; i < orbs; i++) {
        const a = this.barrierAngle + (i * Math.PI * 2) / orbs;
        const ox = hx + Math.cos(a) * radius;
        const oy = hy + Math.sin(a) * radius;
        ctx.drawImage(sprite, Math.round(ox - 14), Math.round(oy - 14), 28, 28);
      }
    } else if (barrier && this.hp > 0) {
      const orbs = 1 + Math.ceil(barrier.lv / 2);
      const radius = 66 + 5 * barrier.lv;
      const hx = this.px - camX;
      const hy = this.py - camY;
      // Glowing amber-gold rune ring connecting the rotating post-it orbitals
      ctx.strokeStyle = 'rgba(250,204,21,0.28)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(hx, hy, radius, 0, Math.PI * 2);
      ctx.stroke();

      const sprite = getPixelSprite('barrier', 0, false);
      for (let i = 0; i < orbs; i++) {
        const a = this.barrierAngle + (i * Math.PI * 2) / orbs;
        const ox = hx + Math.cos(a) * radius;
        const oy = hy + Math.sin(a) * radius;
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

    // hurt flash
    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(178,58,42,${Math.min(0.35, this.hurtFlash * 1.4)})`;
      ctx.fillRect(0, 0, W, H);
    }
    // level-up shockwave around the player
    if (this.levelFlash > 0 && this.hp > 0) {
      const k = 1 - this.levelFlash / 0.6;
      ctx.strokeStyle = `rgba(223,177,91,${0.9 * (1 - k)})`;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(this.px - camX, this.py - camY, 24 + k * 140, 0, Math.PI * 2);
      ctx.stroke();
    }

    this.renderOffscreenMarkers(camX, camY, W, H);

    // 10. In-Canvas Gothic Dark-Gold Boss Health Bar & Nameplate
    if (activeBoss) {
      const barW = Math.min(440, W - 40);
      const barH = 11;
      const bx = Math.round((W - barW) / 2);
      const by = H - 36;
      const ratio = Math.max(0, Math.min(1, activeBoss.hp / Math.max(1, activeBoss.maxHp)));

      ctx.fillStyle = 'rgba(12,10,8,0.88)';
      ctx.fillRect(bx - 6, by - 18, barW + 12, barH + 24);
      ctx.strokeStyle = '#dfb15b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx - 6, by - 18, barW + 12, barH + 24);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`【役職強襲】${ENEMIES[activeBoss.kind].name}`, bx, by - 5);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f2e9d8';
      ctx.fillText(`HP ${Math.ceil(activeBoss.hp)} / ${Math.ceil(activeBoss.maxHp)}`, bx + barW, by - 5);

      ctx.fillStyle = '#1c1412';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bx, by, Math.round(barW * ratio), barH);
      ctx.fillStyle = 'rgba(253,224,71,0.35)';
      ctx.fillRect(bx, by, Math.round(barW * ratio), 3);
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);
    }

    // boss arrival: hazard tape top & bottom
    if (this.bossWarnT > 0) {
      const a = Math.min(1, this.bossWarnT / 0.4) * (0.55 + 0.45 * Math.abs(Math.sin(this.bossWarnT * 9)));
      ctx.globalAlpha = a;
      const band = 18;
      for (const yy of [0, H - band]) {
        ctx.fillStyle = '#1a0d0a';
        ctx.fillRect(0, yy, W, band);
        ctx.fillStyle = '#b23a2a';
        const off = (this.bossWarnT * 80) % 36;
        for (let x = -36 + off; x < W + 36; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, yy + band);
          ctx.lineTo(x + 18, yy);
          ctx.lineTo(x + 30, yy);
          ctx.lineTo(x + 12, yy + band);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /** Edge arrows pointing at off-screen bosses, treasure chests, and heal items (so drops are never "lost"). */
  private renderOffscreenMarkers(camX: number, camY: number, W: number, H: number): void {
    const { ctx } = this;
    const marks: { x: number; y: number; color: string; icon: string }[] = [];
    for (const e of this.enemies) if (e.boss) marks.push({ x: e.x, y: e.y, color: '#e0533c', icon: e.kind });
    for (const p of this.pickups) {
      if (p.kind === 'chest') marks.push({ x: p.x, y: p.y, color: '#dfb15b', icon: 'chest' });
      else if (p.kind === 'heal') marks.push({ x: p.x, y: p.y, color: '#22c55e', icon: 'heal' });
    }
    if (marks.length === 0) return;
    const mTop = 96; const mSide = 26; const mBottom = 34;
    const cx = W / 2; const cy = H / 2;
    for (const m of marks) {
      const sx = m.x - camX; const sy = m.y - camY;
      if (sx >= 0 && sx <= W && sy >= 0 && sy <= H) continue;
      const dx = sx - cx; const dy = sy - cy;
      const minX = mSide - cx; const maxX = W - mSide - cx;
      const minY = mTop - cy; const maxY = H - mBottom - cy;
      let t = 1;
      if (dx > 0) t = Math.min(t, maxX / dx); else if (dx < 0) t = Math.min(t, minX / dx);
      if (dy > 0) t = Math.min(t, maxY / dy); else if (dy < 0) t = Math.min(t, minY / dy);
      const ax = cx + dx * t; const ay = cy + dy * t;
      const ang = Math.atan2(dy, dx);
      const pulse = 0.75 + 0.25 * Math.sin(this.time * 8);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = 'rgba(18,16,13,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.rotate(ang);
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.moveTo(23, 0);
      ctx.lineTo(15, -6);
      ctx.lineTo(15, 6);
      ctx.closePath();
      ctx.fill();
      ctx.rotate(-ang);
      ctx.globalAlpha = 1;
      const spr = getPixelSprite(m.icon, 0, false);
      ctx.drawImage(spr, -10, -10, 20, 20);
      ctx.restore();
    }
  }
}

/* ---------------- def lookups (non-nullable index access) ---------------- */

function weaponDefOf(id: WeaponId) { return WEAPONS[id]; }
function passiveDefOf(id: PassiveId) { return PASSIVES[id]; }

export { WEAPON_ORDER, PASSIVE_ORDER };
