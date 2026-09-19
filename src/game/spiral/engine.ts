/**
 * 社畜スパイラルディフェンス — core engine.
 * Dark & Pop Modern 2D Vector Overhaul & Boss Mechanics.
 * ZERO EMOJIS — all in-game rendering is pure procedural canvas 2D vector geometry.
 */

import {
  VIEW, CENTER, ARENA_R, MOVE_R, FINAL_WAVE,
  MAX_CHAINS, MAX_PROJECTILES, MAX_PARTICLES, MAX_COINS,
  CHAINS, wavePlan, waveHpScale, waveDmgScale,
  DIFFICULTIES, UPGRADES, UPGRADE_ORDER, STAGES,
  type ChainKind, type Difficulty, type UpgradeId, type StageId,
} from './config';
import type { SpiralSound } from './audio';
import { TraumaScreenShake, HitStopManager, DamageNumberPool } from '../common/juice';
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
  drawVectorChest,
} from './vectorRenderer';

/* ---------------- public types ---------------- */

export interface HudBuild {
  dmg: number; interval: number; count: number; pierce: number; crit: number;
  orbN: number; blastLv: number; beamLv: number;
}

export interface HudSnapshot {
  hp: number; maxHp: number;
  wave: number; totalWaves: number;
  phase: 'build' | 'wave' | 'over';
  timeSec: number; score: number; coins: number;
  segs: number; chainsLeft: number;
  build: HudBuild;
  levels: { id: UpgradeId; icon: string; lv: number }[];
  bossName: string; bossHp: number; bossMax: number;
  endless: boolean;
}

export interface UpgradeChoice {
  kind: 'upgrade' | 'bonus';
  id: string;
  name: string;
  icon: string;
  desc: string;
  toLv: number;
  isNew: boolean;
}

export interface BuildData {
  wave: number; // wave about to start
  choices: UpgradeChoice[];
  canReroll: boolean;
  /** true when triggered by a treasure chest mid-wave */
  fromChest?: boolean;
}

export interface RunResult {
  victory: boolean;
  wave: number;
  segs: number;
  chains: number;
  score: number;
  coins: number;
  difficulty: Difficulty;
  timeSec: number;
  chainKills: Record<string, number>;
  upgradeLevels: Record<string, number>;
}

export interface StartOpts {
  difficulty: Difficulty;
  stage?: StageId;
  dmgMul: number;
  maxHpBonus: number;
  rateMul: number;
}

export interface EngineEvents {
  onHud: (h: HudSnapshot) => void;
  onBuild: (d: BuildData) => void;
  onGameOver: (r: RunResult) => void;
  onBanner: (title: string, sub: string) => void;
}

/* ---------------- entities ---------------- */

interface Seg {
  x: number; y: number;
  hp: number; maxHp: number;
  radius: number;
  hitCd: number; orbCd: number;
}

interface BossState {
  enraged: boolean;
  memoCd: number;
  laserCharging: boolean;
  laserTelegraphT: number;
  laserFiring: boolean;
  laserAngle: number;
  laserSweepSpeed: number;
  laserDuration: number;
  laserCooldown: number;
  reverseCd: number;
  barrierActive: boolean;
  barrierAngle: number;
  barrierArc: number;
  barrierHp: number;
  maxBarrierHp: number;
  shockwaveCharging: boolean;
  shockwaveTelegraphT: number;
  shockwaveCd: number;
  minionsSummoned: number;
}

interface Chain {
  kind: ChainKind;
  icon: string; color: string;
  segs: Seg[];
  r: number; theta: number; dir: 1 | -1;
  shrink: number; angular: number;
  wobble: number;
  contact: number; score: number; coins: number;
  segRadius: number; boss: boolean;
  name: string;
  stunT: number;
  bossState: BossState;
}

interface Proj {
  x: number; y: number; vx: number; vy: number;
  dmg: number; radius: number; pierce: number; life: number;
  crit: boolean;
  hit: Set<Seg>;
}

interface BossProj {
  x: number; y: number; vx: number; vy: number;
  dmg: number; radius: number; life: number;
  kind: 'memo';
}

interface CoinP { x: number; y: number; vx: number; vy: number; val: number }
interface BeamFx { x2: number; y2: number; t: number }
interface Ring { x: number; y: number; r: number; maxR: number; t: number; dur: number; color: string }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }

/** Treasure chest clamped in the gap between two chain segments (moves with the chain). */
interface Chest {
  id: number;
  chain: Chain;
  segA: Seg;
  segB: Seg;
  x: number; y: number;
  spin: number;
  openT: number; // >0 while opening animation plays
  taken: boolean;
}

interface SpawnReq { kind: ChainKind; at: number }

function rand(a: number, b: number): number { return a + Math.random() * (b - a); }
function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy;
}

const safeRaf = (cb: FrameRequestCallback): number => {
  if (typeof requestAnimationFrame !== 'undefined') return requestAnimationFrame(cb);
  if (typeof window !== 'undefined' && window.requestAnimationFrame) return window.requestAnimationFrame(cb);
  return setTimeout(() => cb(performance.now()), 16) as unknown as number;
};

const safeCancelRaf = (id: number): void => {
  if (typeof cancelAnimationFrame !== 'undefined') { cancelAnimationFrame(id); return; }
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) { window.cancelAnimationFrame(id); return; }
  clearTimeout(id);
};

/* ---------------- engine ---------------- */

export class SpiralEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sound: SpiralSound;
  private ev: EngineEvents;
  private raf = 0;
  private last = 0;
  private running = false;
  private destroyed = false;
  /** generation counter: stale loops exit, resume always takes over */
  private activeGen = 0;

  private paused = false;
  private phase: 'build' | 'wave' | 'over' = 'build';
  private over = false;
  private endless = false;

  private diff = DIFFICULTIES.normal;
  private stage = STAGES.hq;
  private meta = { dmgMul: 1, maxHpBonus: 0, rateMul: 1 };

  private wave = 0;
  private waveTime = 0;
  private runTime = 0;
  private score = 0;
  private coins = 0;
  private segsKilled = 0;
  private chainsKilled = 0;

  // player
  private px = CENTER; private py = CENTER;
  private moveX = 0; private moveY = 0;
  /** Tap/drag aim direction (radians). null = auto-target nearest. */
  private aimAngle: number | null = null;
  private hp = 120; private maxHp = 120;
  private shield = 0; private maxShield = 60;
  private iframes = 0;
  private regen = 0;

  // build
  private levels: Record<UpgradeId, number> = {
    dmg: 0, rate: 0, multi: 0, pierce: 0, crit: 0,
    orb: 0, blast: 0, beam: 0, hp: 0, regen: 0,
  };
  private fireCd = 0;
  private blastCd = 0;
  private beamCd = 0;
  private orbAngle = 0;
  private rerollLeft = 1;

  // world
  private chains: Chain[] = [];
  private projs: Proj[] = [];
  private bossProjs: BossProj[] = [];
  private coinPs: CoinP[] = [];
  private beams: BeamFx[] = [];
  private rings: Ring[] = [];
  private parts: Particle[] = [];
  private chests: Chest[] = [];
  private nextChestId = 1;
  private queue: SpawnReq[] = [];
  private hudT = 0;
  private chainKills: Record<string, number> = {};

  // Commercial juice integration
  private shake: TraumaScreenShake = new TraumaScreenShake({ maxOffset: 16, maxAngle: 0.04, decayRate: 1.5 });
  private hitstop: HitStopManager = new HitStopManager();
  private dmgNumbers: DamageNumberPool = new DamageNumberPool(60);

  constructor(canvas: HTMLCanvasElement, sound: SpiralSound, ev: EngineEvents) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.sound = sound;
    this.ev = ev;
  }

  /* ----- derived ----- */

  private dmgMul(): number {
    return Math.pow(1.25, this.levels.dmg) * this.meta.dmgMul;
  }
  private interval(): number {
    return 0.45 / (Math.pow(1.12, this.levels.rate) * this.meta.rateMul);
  }
  private shotCount(): number { return 1 + this.levels.multi; }
  private pierce(): number { return this.levels.pierce; }
  private critCh(): number { return 0.05 + 0.07 * this.levels.crit; }
  private shotDmg(): number { return 12 * this.dmgMul(); }
  private orbN(): number { return this.levels.orb === 0 ? 0 : this.levels.orb + 1; }
  private orbDmg(): number { return (12 + 8 * this.levels.orb) * this.dmgMul(); }
  private orbR(): number { return 74 + 5 * this.levels.orb; }
  private blastDmg(): number { return (30 + 26 * this.levels.blast) * this.dmgMul(); }
  private blastR(): number { return 140 + 16 * this.levels.blast; }
  private beamDmg(): number { return (70 + 60 * this.levels.beam) * this.dmgMul(); }

  /* ----- lifecycle ----- */

  start(opts: StartOpts): void {
    this.diff = DIFFICULTIES[opts.difficulty];
    this.stage = STAGES[opts.stage ?? 'hq'];
    this.meta = { dmgMul: opts.dmgMul, maxHpBonus: opts.maxHpBonus, rateMul: opts.rateMul };
    this.wave = 0; this.waveTime = 0; this.runTime = 0;
    this.score = 0; this.coins = 0;
    this.segsKilled = 0; this.chainsKilled = 0;
    this.px = CENTER; this.py = CENTER;
    this.moveX = 0; this.moveY = 0;
    this.maxHp = 120 + opts.maxHpBonus;
    this.hp = this.maxHp;
    this.maxShield = 60;
    this.shield = 20;
    this.iframes = 0; this.regen = 0;
    this.levels = { dmg: 0, rate: 0, multi: 0, pierce: 0, crit: 0, orb: 0, blast: 0, beam: 0, hp: 0, regen: 0 };
    this.fireCd = 0; this.blastCd = 0; this.beamCd = 0; this.orbAngle = 0;
    this.chains = []; this.projs = []; this.bossProjs = []; this.coinPs = [];
    this.beams = []; this.rings = []; this.parts = [];
    this.chests = []; this.nextChestId = 1;
    this.queue = [];
    this.chainKills = {};
    this.paused = false; this.over = false; this.endless = false;
    this.phase = 'build';
    this.shake.reset();
    this.hitstop.reset();
    this.dmgNumbers.clear();
    this.last = performance.now();
    if (!this.running) {
      this.running = true;
      this.registerLoop();
    }
    this.emitBuild();
    this.emitHud();
    this.ev.onBanner('渦が迫る！', '強化を選択して防衛開始');
  }

  private loop = (now: number, gen: number): void => {
    if (gen !== this.activeGen || this.destroyed) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;

    // HitStop micro-freeze check
    const { frozen } = this.hitstop.update(dt);
    if (frozen) {
      // Hitstop micro-freeze: update screen shake and render impact frame
      this.shake.update(dt);
      this.render();
      this.raf = requestAnimationFrame((n) => this.loop(n, gen));
      return;
    }

    if (!this.paused && !this.over && this.phase === 'wave') this.update(dt);
    else if (!this.paused && !this.over && this.phase === 'build') this.updateBuildFx(dt);

    this.shake.update(dt);
    this.dmgNumbers.update(dt);
    this.render();

    this.hudT += dt;
    if (this.hudT >= 0.12) { this.hudT = 0; this.emitHud(); }
    this.raf = safeRaf((n) => this.loop(n, gen));
  };

  private registerLoop(): void {
    this.activeGen += 1;
    const gen = this.activeGen;
    this.last = performance.now();
    this.raf = safeRaf((n) => this.loop(n, gen));
  }

  /** Re-register the rAF loop (stale loops exit via generation check). */
  resumeLoop(): void {
    if (this.destroyed) return;
    this.registerLoop();
  }

  destroy(): void {
    this.destroyed = true;
    this.activeGen += 1;
    safeCancelRaf(this.raf);
    this.running = false;
  }

  setPaused(p: boolean): void { this.paused = p; }
  setMove(x: number, y: number): void { this.moveX = x; this.moveY = y; }
  /** Aim at a world point (player stays center-fixed). */
  setAim(x: number, y: number): void {
    this.aimAngle = Math.atan2(y - CENTER, x - CENTER);
  }
  clearAim(): void { this.aimAngle = null; }

  continueEndless(): void {
    if (!this.over) return;
    this.over = false;
    this.endless = true;
    this.hp = this.maxHp;
    this.phase = 'build';
    this.emitBuild();
    this.ev.onBanner('残業突入！', '渦は終わらない…どこまで耐えられるか');
  }

  /* ----- build phase ----- */

  private buildChoices(): UpgradeChoice[] {
    const pool: UpgradeChoice[] = [];
    for (const id of UPGRADE_ORDER) {
      const lv = this.levels[id];
      const def = UPGRADES[id];
      if (lv < def.maxLv) {
        pool.push({
          kind: 'upgrade', id, name: def.name, icon: def.icon, desc: def.desc,
          toLv: lv + 1, isNew: lv === 0,
        });
      }
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = pool.slice(0, 3);
    while (picks.length < 3) {
      picks.push(picks.length % 2 === 0
        ? { kind: 'bonus', id: `coins${picks.length}`, name: '臨時ボーナス', icon: 'bonus_coin', desc: '残業手当 +80', toLv: 0, isNew: false }
        : { kind: 'bonus', id: `heal${picks.length}`, name: '栄養ドリンク', icon: 'bonus_heal', desc: 'HPを全回復', toLv: 0, isNew: false });
    }
    return picks;
  }

  private currentChoices: UpgradeChoice[] = [];
  /** true while the build modal was opened by a chest (resume wave instead of advancing) */
  private buildFromChest = false;

  private emitBuild(): void {
    this.rerollLeft = 1;
    this.buildFromChest = false;
    this.currentChoices = this.buildChoices();
    this.ev.onBuild({ wave: this.wave + 1, choices: this.currentChoices, canReroll: true });
  }

  applyUpgrade(choice: UpgradeChoice): void {
    if (this.phase !== 'build' || this.over) return;
    if (!this.currentChoices.some((c) => c.kind === choice.kind && c.id === choice.id)) return;
    this.sound.upgrade();
    if (choice.kind === 'upgrade') {
      const id = choice.id as UpgradeId;
      this.levels[id] += 1;
      if (id === 'hp') {
        this.maxHp += 25;
        this.hp = Math.min(this.maxHp, this.hp + 25);
      }
      if (id === 'regen') this.regen += 0.7;
    } else {
      if (choice.id.startsWith('heal')) {
        this.hp = this.maxHp;
        this.sound.heal();
      } else {
        this.coins += 80;
        this.score += 400;
        this.sound.coin();
      }
    }
    if (this.buildFromChest) {
      // Resume the same wave
      this.buildFromChest = false;
      this.phase = 'wave';
      this.ev.onBanner('武器強化！', '戦闘を再開せよ');
      this.emitHud();
      return;
    }
    this.startWave();
  }

  rerollBuild(): void {
    if (this.phase !== 'build' || this.over || this.rerollLeft <= 0) return;
    this.rerollLeft -= 1;
    this.currentChoices = this.buildChoices();
    this.sound.upgrade();
    this.ev.onBuild({ wave: this.buildFromChest ? this.wave : this.wave + 1, choices: this.currentChoices, canReroll: false, fromChest: this.buildFromChest });
  }

  /* ----- waves ----- */

  private startWave(): void {
    this.wave += 1;
    this.waveTime = 0;
    this.queue = [];
    const plan = wavePlan(this.wave);
    for (const item of plan) {
      const count = Math.max(1, Math.round(item.count * this.diff.countMul * this.stage.countMul));
      for (let i = 0; i < count; i++) {
        this.queue.push({ kind: item.kind, at: item.delay + i * item.gap });
      }
    }
    this.queue.sort((a, b) => a.at - b.at);
    this.phase = 'wave';
    const bossItem = plan.find((p) => CHAINS[p.kind].boss);
    if (bossItem) {
      const def = CHAINS[bossItem.kind];
      this.ev.onBanner(`WARNING: ${def.name} 接近！`, `第${this.wave}波・統括リーダー迎撃！頭部を狙え！`);
      this.sound.boss();
      this.shake.addTrauma(0.45);
    } else {
      this.ev.onBanner(`WAVE ${this.wave}`, '渦巻く業務列を迎撃せよ！');
    }
    this.emitHud();
  }

  private spawnChain(kind: ChainKind): void {
    if (this.chains.length >= MAX_CHAINS) return;
    const def = CHAINS[kind];
    const hs = waveHpScale(this.wave, this.endless) * this.diff.hpMul * this.stage.hpMul;
    const ds = waveDmgScale(this.wave) * this.diff.dmgMul;
    const theta = rand(0, Math.PI * 2);
    const segs: Seg[] = [];
    for (let i = 0; i < def.segs; i++) {
      // Rebalanced head HP: bosses have 4.5x, regular mobs have 2.8x
      const headMul = def.boss ? 4.5 : 2.8;
      const hp = def.segHp * hs * (i === 0 ? headMul : 1);
      segs.push({ x: 0, y: 0, hp, maxHp: hp, radius: def.segRadius, hitCd: 0, orbCd: 0 });
    }

    const bossBarrierHp = kind === 'president' ? 350 * hs : 0;
    const chain: Chain = {
      kind, icon: def.icon, color: def.color, segs,
      r: ARENA_R + 70, theta, dir: Math.random() < 0.5 ? 1 : -1,
      shrink: def.shrink * rand(0.9, 1.1) * this.stage.speedMul,
      angular: def.angular * rand(0.9, 1.1),
      wobble: rand(0, Math.PI * 2),
      contact: def.contact * ds, score: def.score, coins: def.coins,
      segRadius: def.segRadius, boss: def.boss, name: def.name,
      stunT: 0,
      bossState: {
        enraged: false,
        memoCd: 2.2,
        laserCharging: false,
        laserTelegraphT: 0,
        laserFiring: false,
        laserAngle: 0,
        laserSweepSpeed: 1.1,
        laserDuration: 0,
        laserCooldown: 4.8,
        reverseCd: 6.5,
        barrierActive: kind === 'president',
        barrierAngle: 0,
        barrierArc: Math.PI * 0.65,
        barrierHp: bossBarrierHp,
        maxBarrierHp: bossBarrierHp,
        shockwaveCharging: false,
        shockwaveTelegraphT: 0,
        shockwaveCd: 6.5,
        minionsSummoned: 0,
      },
    };

    // lay out body along the outward spiral
    for (let i = 0; i < segs.length; i++) {
      const rr = chain.r + i * def.segRadius * 1.7;
      segs[i].x = CENTER + Math.cos(theta - chain.dir * i * 0.12) * rr;
      segs[i].y = CENTER + Math.sin(theta - chain.dir * i * 0.12) * rr;
    }
    this.chains.push(chain);

    // Treasure chest in the gap between chain segments (moves with the chain)
    if (this.chests.length < 4 && Math.random() < (kind === 'mail' ? 0.16 : 0.3)) {
      const midStart = Math.max(1, Math.floor(segs.length / 2));
      const gapIndex = Math.min(segs.length - 2, midStart - 1);
      if (gapIndex >= 0) {
        const segA = segs[gapIndex];
        const segB = segs[gapIndex + 1];
        this.chests.push({
          id: this.nextChestId++,
          chain,
          segA,
          segB,
          x: (segA.x + segB.x) / 2,
          y: (segA.y + segB.y) / 2,
          spin: rand(0, Math.PI * 2),
          openT: 0,
          taken: false,
        });
      }
    }
  }

  /* ----- update ----- */

  private update(dt: number): void {
    this.waveTime += dt;
    this.runTime += dt;

    // Player is FIXED at the center core (ad-game style)
    this.px = CENTER;
    this.py = CENTER;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.regen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    }

    // spawns
    while (this.queue.length > 0 && this.queue[0].at <= this.waveTime) {
      if (this.chains.length >= MAX_CHAINS) break;
      const req = this.queue.shift();
      if (req) this.spawnChain(req.kind);
    }

    this.updateChains(dt);
    this.updateWeapons(dt);
    this.updateProjs(dt);
    this.updateBossProjs(dt);
    this.updateChests(dt);
    this.updateCoins(dt);
    this.updateFx(dt);

    // wave clear
    if (this.queue.length === 0 && this.chains.length === 0) {
      const bonus = Math.round((10 + this.wave * 2) * this.stage.coinMul);
      this.coins += bonus;
      this.score += Math.round(200 * this.wave * this.diff.scoreMul * this.stage.scoreMul);
      this.sound.waveClear();
      if (!this.endless && this.wave >= FINAL_WAVE) {
        this.finishRun(true);
        return;
      }
      this.phase = 'build';
      this.ev.onBanner(`WAVE ${this.wave} 制圧！`, `報酬 +${bonus} — 強化を選択してください`);
      this.emitBuild();
      this.emitHud();
      return;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.finishRun(false);
    }
  }

  private updateBuildFx(dt: number): void {
    this.orbAngle += dt * 2;
    this.updateFx(dt);
  }

  private updateChains(dt: number): void {
    for (let ci = this.chains.length - 1; ci >= 0; ci--) {
      const c = this.chains[ci];

      // Handle Stun
      if (c.stunT > 0) {
        c.stunT -= dt;
        // Jitter segments during stun
        continue;
      }

      c.wobble += dt * 2;

      // Spiral contraction — smooth continuous descent
      // Avoid endless orbit clamping at center core:
      // When radius reaches core threshold (<= 28), initiate direct breach assault!
      if (c.r > 24) {
        c.r = Math.max(16, c.r - c.shrink * dt);
        c.theta += c.angular * c.dir * dt;
      }

      const rEff = c.r + Math.sin(c.wobble) * 10;
      const sx = CENTER + Math.cos(c.theta) * rEff;
      const sy = CENTER + Math.sin(c.theta) * rEff;

      const head = c.segs[0];
      if (!head) { this.chains.splice(ci, 1); continue; }

      if (c.r <= 24) {
        // Direct core breach charge: head accelerates toward player core
        const bdx = this.px - head.x;
        const bdy = this.py - head.y;
        const bd = Math.hypot(bdx, bdy);
        if (bd > 1) {
          head.x += (bdx / bd) * (c.shrink * 1.6) * dt;
          head.y += (bdy / bd) * (c.shrink * 1.6) * dt;
        }
      } else {
        // Smooth spiral guidance with gentle homing (14%)
        head.x = sx * 0.86 + this.px * 0.14;
        head.y = sy * 0.86 + this.py * 0.14;
      }

      if (head.hitCd > 0) head.hitCd -= dt;
      if (head.orbCd > 0) head.orbCd -= dt;

      // Distance-Verlet Follow Physics (No rigid step clamp!)
      // Segments maintain continuous distance constraint without rubber-banding or detaching
      const spacing = c.segRadius * 1.7;
      for (let i = 1; i < c.segs.length; i++) {
        const s = c.segs[i];
        const prev = c.segs[i - 1];
        if (s.hitCd > 0) s.hitCd -= dt;
        if (s.orbCd > 0) s.orbCd -= dt;

        const fdx = prev.x - s.x;
        const fdy = prev.y - s.y;
        const fd = Math.hypot(fdx, fdy);

        if (fd > 0.001) {
          const targetX = prev.x - (fdx / fd) * spacing;
          const targetY = prev.y - (fdy / fd) * spacing;
          // Exponential smoothing follow
          const followAlpha = 1 - Math.exp(-26 * dt);
          s.x += (targetX - s.x) * Math.max(followAlpha, 0.45);
          s.y += (targetY - s.y) * Math.max(followAlpha, 0.45);

          // Hard distance clamp constraint
          const curDist = Math.hypot(prev.x - s.x, prev.y - s.y);
          if (curDist > spacing * 1.15) {
            const scale = spacing / curDist;
            s.x = prev.x - (prev.x - s.x) * scale;
            s.y = prev.y - (prev.y - s.y) * scale;
          }
        }
      }

      // Boss Attack Gimmicks & Behavior
      if (c.boss) {
        this.updateBossGimmicks(c, ci, dt);
      }

      // Contact with player core
      const pr = 16;
      for (let si = 0; si < c.segs.length; si++) {
        const s = c.segs[si];
        if (s.hitCd > 0 || this.iframes > 0) continue;
        const rr = s.radius + pr;
        if (dist2(s.x, s.y, this.px, this.py) < rr * rr) {
          s.hitCd = 0.9;
          this.damagePlayer(c.contact);

          // Knock the player away so contact grinds are escapable
          const pdx = this.px - s.x; const pdy = this.py - s.y;
          const pd = Math.max(1, Math.hypot(pdx, pdy));
          const nx = this.px + (pdx / pd) * 65;
          const ny = this.py + (pdy / pd) * 65;
          const nd = Math.hypot(nx - CENTER, ny - CENTER);
          if (nd > MOVE_R) {
            this.px = CENTER + ((nx - CENTER) / nd) * MOVE_R;
            this.py = CENTER + ((ny - CENTER) / nd) * MOVE_R;
          } else {
            this.px = nx;
            this.py = ny;
          }

          // If breaching core at extreme proximity, breach segment self-destructs
          if (c.r <= 24 && si === 0) {
            this.burst(head.x, head.y, '#f59e0b', 16, 240);
            this.killSeg(c, ci, 0);
          }
          break;
        }
      }
    }
  }

  /**
   * Updates boss-specific attack patterns:
   * - Wave 5 (課長): Urgent memo spread barrage & enrage state under 50% HP
   * - Wave 10 (役員): Sweeping conference laser & rotation direction reversal
   * - Wave 15 (社長): Golden executive barrier, minion chain summon & radial shockwaves
   */
  private updateBossGimmicks(c: Chain, _ci: number, dt: number): void {
    const head = c.segs[0];
    if (!head) return;
    const b = c.bossState;

    // Calculate total boss HP ratio
    let currentHp = 0;
    let maxHp = 0;
    for (const s of c.segs) { currentHp += Math.max(0, s.hp); maxHp += s.maxHp; }
    const hpRatio = maxHp > 0 ? currentHp / maxHp : 0;

    // ==========================================
    // Wave 5: 課長 (bossMid) — Memo Spread & Enrage
    // ==========================================
    if (c.kind === 'bossMid') {
      // Enrage check at 50% HP
      if (hpRatio < 0.5 && !b.enraged) {
        b.enraged = true;
        c.angular *= 1.35;
        this.shake.addTrauma(0.45);
        this.ev.onBanner('課長激怒モード！', '「本日中必着だ！！」連射速度上昇！');
      }

      b.memoCd -= dt;
      const memoInterval = b.enraged ? 1.7 : 3.0;
      if (b.memoCd <= 0) {
        b.memoCd = memoInterval;
        const memoCount = b.enraged ? 7 : 5;
        const baseAngle = Math.atan2(this.py - head.y, this.px - head.x);
        for (let i = 0; i < memoCount; i++) {
          const spread = (i - (memoCount - 1) / 2) * 0.15;
          const a = baseAngle + spread;
          const speed = b.enraged ? 240 : 200;
          this.bossProjs.push({
            x: head.x, y: head.y,
            vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
            dmg: 10, radius: 7, life: 2.4,
            kind: 'memo',
          });
        }
        this.sound.shoot();
        this.burst(head.x, head.y, '#ef4444', 8, 140);
      }
    }

    // ==========================================
    // Wave 10: 役員 (exec) — Sweeping Laser & Reversal
    // ==========================================
    if (c.kind === 'exec') {
      // Rotation direction reversal
      b.reverseCd -= dt;
      if (b.reverseCd <= 0) {
        b.reverseCd = 6.5;
        c.dir = c.dir === 1 ? -1 : 1;
        this.shake.addTrauma(0.35);
        this.burst(head.x, head.y, '#dc2626', 14, 200);
        this.ev.onBanner('役員会議 方針転換！', '業務の旋回方向が逆転した！');
      }

      // Sweeping conference laser
      b.laserCooldown -= dt;
      if (b.laserCooldown <= 0 && !b.laserCharging && !b.laserFiring) {
        b.laserCharging = true;
        b.laserTelegraphT = 1.5; // 1.5s telegraph warning
      }

      if (b.laserCharging) {
        b.laserTelegraphT -= dt;
        b.laserAngle = Math.atan2(this.py - head.y, this.px - head.x);
        if (b.laserTelegraphT <= 0) {
          b.laserCharging = false;
          b.laserFiring = true;
          b.laserDuration = 1.4;
          b.laserAngle -= 0.65;
          b.laserSweepSpeed = 1.15;
          this.sound.boss();
        }
      }

      if (b.laserFiring) {
        b.laserDuration -= dt;
        b.laserAngle += b.laserSweepSpeed * dt;

        // Check swept line intersection with player core
        const laserLen = 380;
        const lx1 = head.x; const ly1 = head.y;
        const lx2 = head.x + Math.cos(b.laserAngle) * laserLen;
        const ly2 = head.y + Math.sin(b.laserAngle) * laserLen;

        const distToPlayer = distToSegment(this.px, this.py, lx1, ly1, lx2, ly2);
        if (distToPlayer < 18 && this.iframes <= 0) {
          this.damagePlayer(16);
          this.shake.addTrauma(0.5);
        }

        if (b.laserDuration <= 0) {
          b.laserFiring = false;
          b.laserCooldown = 5.2;
        }
      }
    }

    // ==========================================
    // Wave 15: 社長 (president) — Golden Barrier, Minions & Radial Shockwaves
    // ==========================================
    if (c.kind === 'president') {
      // Align frontal executive barrier
      b.barrierAngle = c.theta + (c.dir > 0 ? 0.35 : -0.35);

      // Minion chains summon ("全社朝礼")
      if (hpRatio < 0.75 && b.minionsSummoned === 0) {
        b.minionsSummoned = 1;
        this.spawnChain('mail');
        this.spawnChain('claim');
        this.shake.addTrauma(0.5);
        this.ev.onBanner('社長「全社朝礼を始める！」', '護衛メール・クレーム列が召集された！');
      } else if (hpRatio < 0.35 && b.minionsSummoned === 1) {
        b.minionsSummoned = 2;
        this.spawnChain('doc');
        this.spawnChain('claim');
        this.shake.addTrauma(0.55);
        this.ev.onBanner('社長「総力戦だ！！」', '追加護衛部隊が突入！');
      }

      // Radial Shockwaves
      b.shockwaveCd -= dt;
      if (b.shockwaveCd <= 0 && !b.shockwaveCharging) {
        b.shockwaveCharging = true;
        b.shockwaveTelegraphT = 1.5; // 1.5s telegraph warning
      }

      if (b.shockwaveCharging) {
        b.shockwaveTelegraphT -= dt;
        if (b.shockwaveTelegraphT <= 0) {
          b.shockwaveCharging = false;
          b.shockwaveCd = 6.8;
          // Unleash radial shockwave!
          this.rings.push({
            x: head.x, y: head.y,
            r: 10, maxR: 340,
            t: 0, dur: 0.9,
            color: '251,191,36',
          });
          this.shake.addTrauma(0.65);
          this.sound.boss();

          // Shockwave deals damage if player is within blast wave radius without iframes
          const distToHead = Math.hypot(this.px - head.x, this.py - head.y);
          if (distToHead < 180 && this.iframes <= 0) {
            this.damagePlayer(15);
          }
        }
      }
    }
  }

  /**
   * Applies damage to player with shield absorption and trauma shake.
   */
  private damagePlayer(amount: number): void {
    if (this.iframes > 0 || this.hp <= 0) return;
    this.iframes = 0.85;

    let dmg = Math.max(1, Math.round(amount));

    // Shield absorption
    if (this.shield > 0) {
      if (this.shield >= dmg) {
        this.shield -= dmg;
        this.dmgNumbers.spawn(this.px, this.py - 14, `-${dmg}`, 'custom', {
          color: '#38bdf8',
          strokeColor: '#0c4a6e',
          strokeWidth: 3,
          fontSize: 14,
          fontFamily: 'sans-serif',
          initialScale: 1.3,
        });
        this.hitstop.triggerMs(40);
        this.shake.addTrauma(0.3);
        this.sound.hit();
        this.burst(this.px, this.py, '#38bdf8', 8, 180);
        return;
      } else {
        dmg -= this.shield;
        this.shield = 0;
      }
    }

    this.hp = Math.max(0, this.hp - dmg);
    this.dmgNumbers.spawn(this.px, this.py - 14, `-${dmg}`, 'player');
    this.shake.addTrauma(0.5);
    this.sound.hurt();
    this.burst(this.px, this.py, '#ef4444', 12, 220);
    if (this.hp <= 0) this.hp = 0;
  }

  private updateBossProjs(dt: number): void {
    for (let i = this.bossProjs.length - 1; i >= 0; i--) {
      const p = this.bossProjs[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Check collision with player
      const pr = 16;
      if (dist2(p.x, p.y, this.px, this.py) < (p.radius + pr) * (p.radius + pr)) {
        this.damagePlayer(p.dmg);
        this.bossProjs.splice(i, 1);
        continue;
      }

      if (p.life <= 0) {
        this.bossProjs.splice(i, 1);
      }
    }
  }

  /** Head-preferential targeting: killing the head collapses the chain. */
  private nearestSeg(maxDist: number): { chain: Chain; seg: Seg; ci: number; si: number } | null {
    let best: { chain: Chain; seg: Seg; ci: number; si: number } | null = null;
    let bs = Infinity;
    const md = maxDist * maxDist;
    for (let ci = 0; ci < this.chains.length; ci++) {
      const c = this.chains[ci];
      for (let si = 0; si < c.segs.length; si++) {
        const s = c.segs[si];
        const dd = dist2(this.px, this.py, s.x, s.y);
        if (dd > md) continue;
        const scored = dd * (si === 0 ? 0.6 : 1);
        if (scored < bs) { bs = scored; best = { chain: c, seg: s, ci, si }; }
      }
    }
    return best;
  }

  private strongestSeg(maxDist: number): { chain: Chain; seg: Seg; ci: number; si: number } | null {
    let best: { chain: Chain; seg: Seg; ci: number; si: number } | null = null;
    let bh = -1;
    const md = maxDist * maxDist;
    for (let ci = 0; ci < this.chains.length; ci++) {
      const c = this.chains[ci];
      for (let si = 0; si < c.segs.length; si++) {
        const s = c.segs[si];
        if (dist2(this.px, this.py, s.x, s.y) > md) continue;
        if (s.hp > bh) { bh = s.hp; best = { chain: c, seg: s, ci, si }; }
      }
    }
    return best;
  }

  private updateWeapons(dt: number): void {
    // main shots — aim at tapped point, else auto-target nearest
    this.fireCd -= dt;
    if (this.fireCd <= 0) {
      let base: number;
      let hasTarget = false;
      if (this.aimAngle !== null) {
        base = this.aimAngle;
        hasTarget = true;
      } else {
        const tgt = this.nearestSeg(430);
        if (tgt) {
          base = Math.atan2(tgt.seg.y - this.py, tgt.seg.x - this.px);
          hasTarget = true;
        } else {
          base = 0;
        }
      }
      if (!hasTarget) {
        this.fireCd = 0.1;
      } else {
        this.fireCd = this.interval();
        const n = this.shotCount();
        for (let i = 0; i < n; i++) {
          if (this.projs.length >= MAX_PROJECTILES) break;
          const a = base + (i - (n - 1) / 2) * 0.13;
          const crit = Math.random() < this.critCh();
          this.projs.push({
            x: this.px, y: this.py,
            vx: Math.cos(a) * 540, vy: Math.sin(a) * 540,
            dmg: this.shotDmg() * (crit ? 2 : 1), radius: 6,
            pierce: this.pierce(), life: 1.2, crit, hit: new Set(),
          });
        }
        this.sound.shoot();
      }
    }

    // orbitals
    const orbN = this.orbN();
    if (orbN > 0) {
      this.orbAngle += dt * 2.6;
      const R = this.orbR();
      const dmg = this.orbDmg();
      for (let i = 0; i < orbN; i++) {
        const a = this.orbAngle + (i * Math.PI * 2) / orbN;
        const ox = this.px + Math.cos(a) * R;
        const oy = this.py + Math.sin(a) * R;
        for (let ci = 0; ci < this.chains.length; ci++) {
          const c = this.chains[ci];
          for (let si = 0; si < c.segs.length; si++) {
            const s = c.segs[si];
            if (s.orbCd > 0) continue;
            const rr = 17 + s.radius;
            if (dist2(ox, oy, s.x, s.y) < rr * rr) {
              s.orbCd = 0.4;
              this.damageSeg(c, ci, si, dmg, 120, ox, oy, false);
              if (this.phase !== 'wave') return;
            }
          }
        }
      }
    }

    // blast
    if (this.levels.blast > 0) {
      this.blastCd -= dt;
      if (this.blastCd <= 0) {
        this.blastCd = 3.2;
        const R = this.blastR();
        const dmg = this.blastDmg();
        this.rings.push({ x: this.px, y: this.py, r: 20, maxR: R, t: 0, dur: 0.35, color: '251,146,60' });
        this.burst(this.px, this.py, '#fb923c', 14, 220);
        for (let ci = this.chains.length - 1; ci >= 0; ci--) {
          const c = this.chains[ci];
          for (let si = c.segs.length - 1; si >= 0; si--) {
            const s = c.segs[si];
            if (dist2(this.px, this.py, s.x, s.y) < (R + s.radius) * (R + s.radius)) {
              this.damageSeg(c, ci, si, dmg, 260, this.px, this.py, false);
              if (this.phase !== 'wave') return;
            }
          }
        }
        this.sound.hit();
      }
    }

    // beam
    if (this.levels.beam > 0) {
      this.beamCd -= dt;
      if (this.beamCd <= 0) {
        const tgt = this.strongestSeg(440);
        if (!tgt) {
          this.beamCd = 0.3;
        } else {
          this.beamCd = Math.max(2.2, 4.6 - 0.35 * this.levels.beam);
          this.beams.push({ x2: tgt.seg.x, y2: tgt.seg.y, t: 0.4 });
          this.damageSeg(tgt.chain, tgt.ci, tgt.si, this.beamDmg(), 200, this.px, this.py, false);
          this.sound.hit();
        }
      }
    }

    // rings expand
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      r.r += 520 * dt;
      if (r.t >= r.dur || r.r >= r.maxR) this.rings.splice(i, 1);
    }
  }

  private updateProjs(dt: number): void {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let dead = p.life <= 0;

      // treasure chests (in gaps between chains)
      if (!dead) {
        for (let ch = 0; ch < this.chests.length; ch++) {
          const c = this.chests[ch];
          if (c.taken) continue;
          const rr = p.radius + 20;
          if (dist2(p.x, p.y, c.x, c.y) < rr * rr) {
            this.openChest(c);
            dead = true;
            break;
          }
        }
      }

      if (!dead) {
        for (let ci = 0; ci < this.chains.length && !dead; ci++) {
          const c = this.chains[ci];
          for (let si = 0; si < c.segs.length; si++) {
            const s = c.segs[si];
            if (p.hit.has(s)) continue;
            const rr = p.radius + s.radius;
            if (dist2(p.x, p.y, s.x, s.y) < rr * rr) {
              p.hit.add(s);
              this.damageSeg(c, ci, si, p.dmg, 110, p.x - p.vx * 0.01, p.y - p.vy * 0.01, p.crit);
              if (this.phase !== 'wave') { dead = true; break; }
              if (p.hit.size > p.pierce) { dead = true; break; }
            }
          }
        }
      }
      if (dead) this.projs.splice(i, 1);
    }
  }

  /** Chest opened → pause for a 3-choice weapon evolution pick. */
  private openChest(c: Chest): void {
    c.taken = true;
    c.openT = 0.45;
    this.burst(c.x, c.y, '#fde047', 26, 300);
    this.rings.push({ x: c.x, y: c.y, r: 10, maxR: 70, t: 0, dur: 0.4, color: '253,224,71' });
    this.hitstop.triggerMs(90);
    this.shake.addTrauma(0.4);
    this.sound.upgrade();
    this.score += 200;
    this.ev.onBanner('宝箱を発見！', '武器進化を1つ選択せよ');
    // trigger build with evolution-flavoured choices
    this.phase = 'build';
    this.buildFromChest = true;
    this.currentChoices = this.buildChoices();
    this.ev.onBuild({ wave: this.wave, choices: this.currentChoices, canReroll: this.rerollLeft > 0, fromChest: true });
  }

  private updateChests(dt: number): void {
    for (const ch of this.chests) {
      ch.spin += dt * 1.4;
      if (ch.openT > 0) ch.openT -= dt;
      if (ch.taken) continue;
      // Follow the gap between the two segments; drop the chest if the chain broke there.
      if (!this.chains.includes(ch.chain) || ch.segA.hp <= 0 || ch.segB.hp <= 0) {
        ch.taken = true;
        ch.openT = 0.3;
        continue;
      }
      ch.x = (ch.segA.x + ch.segB.x) / 2;
      ch.y = (ch.segA.y + ch.segB.y) / 2;
    }
    this.chests = this.chests.filter((c) => !c.taken || c.openT > -0.6);
  }

  private damageSeg(
    c: Chain,
    ci: number,
    si: number,
    dmg: number,
    knock: number,
    fromX: number,
    fromY: number,
    crit: boolean
  ): void {
    if (this.chains[ci] !== c) return;
    const s = c.segs[si];
    if (!s || s.hp <= 0) return;

    // Check Wave 15 President Golden Executive Barrier
    if (c.kind === 'president' && si === 0 && c.bossState.barrierActive && c.bossState.barrierHp > 0) {
      // Check if attack comes from the frontal arc
      const attackAngle = Math.atan2(fromY - s.y, fromX - s.x);
      let angleDiff = Math.abs(attackAngle - c.bossState.barrierAngle);
      while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

      if (angleDiff < c.bossState.barrierArc / 2) {
        // Frontal hit absorbed by barrier!
        c.bossState.barrierHp = Math.max(0, c.bossState.barrierHp - dmg);
        this.burst(s.x, s.y, '#fbbf24', 6, 160);
        this.dmgNumbers.spawn(s.x, s.y - s.radius - 2, 'GUARD', 'custom', {
          color: '#fbbf24',
          strokeColor: '#78350f',
          strokeWidth: 3,
          fontSize: 13,
          fontFamily: 'sans-serif',
          initialScale: 1.4,
        });
        if (c.bossState.barrierHp <= 0) {
          c.bossState.barrierActive = false;
          this.burst(s.x, s.y, '#fde047', 22, 260);
          this.shake.addTrauma(0.5);
          this.ev.onBanner('役員バリア破壊！', '社長の正面防壁が崩壊！');
        }
        return;
      }
    }

    s.hp -= dmg;
    this.dmgNumbers.spawn(s.x + rand(-6, 6), s.y - s.radius - 2, Math.round(dmg), crit ? 'crit' : 'normal');
    this.sound.hit();

    // knock the whole chain slightly
    const d = Math.max(1, Math.hypot(s.x - fromX, s.y - fromY));
    const push = Math.min(26, knock * 0.06);
    const kx = ((s.x - fromX) / d) * push;
    const ky = ((s.y - fromY) / d) * push;
    for (const seg of c.segs) {
      seg.x += kx;
      seg.y += ky;
    }

    if (s.hp <= 0) this.killSeg(c, ci, si);
  }

  /**
   * Rebalanced Head vs Body HP & Anti-Insta-Wipe Boss Chain Reaction:
   * When a boss chain head is destroyed, instead of instantly collapsing the entire 22-segment chain,
   * trigger a dramatic chain reaction: head explodes with shockwave, stuns remaining segments for 1.5s,
   * and promotes the next segment to a mini-head.
   */
  private killSeg(c: Chain, ci: number, si: number): void {
    if (this.chains[ci] !== c) return;
    const isHead = si === 0;
    const mult = (1 + this.wave * 0.05) * this.diff.scoreMul * this.stage.scoreMul;

    if (isHead) {
      const head = c.segs[0];
      const headX = head ? head.x : this.px;
      const headY = head ? head.y : this.py;

      // Boss Anti-Insta-Wipe with multiple segments remaining
      if (c.boss && c.segs.length > 2) {
        // 1. Head explodes with dramatic shockwave
        this.burst(headX, headY, '#fde047', 24, 280);
        this.rings.push({
          x: headX, y: headY,
          r: 15, maxR: 85,
          t: 0, dur: 0.45,
          color: '251,191,36',
        });

        // 2. Chain reaction explosion deals splash damage to adjacent segments
        const explosionRadius = 45;
        for (let i = 1; i < c.segs.length; i++) {
          const adj = c.segs[i];
          const dist = Math.hypot(adj.x - headX, adj.y - headY);
          if (dist <= explosionRadius) {
            adj.hp = Math.max(1, adj.hp - 25);
            this.burst(adj.x, adj.y, c.color, 4, 120);
          }
        }

        // 3. Stun remaining segments for 1.5s
        c.stunT = 1.5;

        // 4. Promote next segment to mini-head
        c.segs.shift(); // Remove defeated leader head
        if (c.segs[0]) {
          c.segs[0].radius = Math.min(18, c.segs[0].radius + 2);
          c.segs[0].maxHp = Math.round(c.segs[0].maxHp * 1.6);
          c.segs[0].hp = c.segs[0].maxHp;
        }

        // 5. Kinetic juice feedback
        this.shake.addTrauma(0.55);
        this.hitstop.triggerMs(60);
        this.sound.segDown();
        this.score += Math.round(c.score * mult * 0.4);
        this.segsKilled += 1;

        // Drop coins from defeated head
        this.dropCoin(headX, headY, c.coins * 2);
        this.ev.onBanner('ボスの頭部撃破！', '1.5秒スタン！後続セグメントが活性化！');
        return;
      }

      // Non-boss head kill OR boss with <= 2 segments: complete chain collapse
      for (const s of c.segs) {
        this.burst(s.x, s.y, c.color, 4, 150);
        this.score += Math.round(c.score * mult * 0.5);
        this.segsKilled += 1;
      }
      this.chains.splice(ci, 1);
      this.chainsKilled += 1;
      this.chainKills[c.kind] = (this.chainKills[c.kind] ?? 0) + 1;
      this.sound.segDown();
      this.burst(headX, headY, '#fde047', 18, 260);

      // head always drops coins
      const n = c.boss ? 4 : 1;
      for (let i = 0; i < n; i++) this.dropCoin(headX, headY, Math.round(c.coins * this.stage.coinMul));

      if (c.boss) {
        this.coins += Math.round(50 * this.stage.coinMul);
        this.hitstop.triggerMs(120);
        this.shake.addTrauma(0.7);
        this.ev.onBanner('大物完全撃破！', `+50コイン — ${c.name}を完全討伐！`);
      } else {
        this.shake.addTrauma(0.3);
      }
    } else {
      // Body segment destroyed → split the chain in two!
      const s = c.segs[si];
      if (!s) return;
      this.burst(s.x, s.y, c.color, 5, 150);
      this.score += Math.round(c.score * mult);
      this.segsKilled += 1;
      this.sound.segDown();
      if (Math.random() < 0.22) this.dropCoin(s.x, s.y, Math.round(c.coins * this.stage.coinMul));
      if (Math.random() < 0.02) {
        this.coinPs.push({ x: s.x, y: s.y, vx: 0, vy: 0, val: -20 });
      }

      const tail = c.segs.splice(si);
      tail.shift(); // remove the destroyed segment
      c.segs = c.segs.length > 0 ? c.segs : [];
      if (tail.length > 0) {
        if (this.chains.length < MAX_CHAINS) {
          this.splitChain(c, tail, s.x, s.y);
        } else {
          // No room for a split — just shorten
          for (const t of tail) this.burst(t.x, t.y, c.color, 2, 90);
        }
      }
      // If the front part vanished, the remainder becomes the new head chain
      if (c.segs.length === 0) {
        this.chains.splice(ci, 1);
      }
    }
  }

  /**
   * 分断機構: a cut body segment spawns the trailing half as an independent
   * smaller chain that keeps spiraling on its own (ad-game style slicing).
   */
  private splitChain(parent: Chain, segs: Seg[], cutX: number, cutY: number): void {
    const head = segs[0];
    const nr = Math.max(40, Math.hypot(head.x - CENTER, head.y - CENTER));
    const nth = Math.atan2(head.y - CENTER, head.x - CENTER);
    const def = CHAINS[parent.kind];
    // Promote the new front segment to a head so the piece is killable
    head.maxHp = Math.round(head.maxHp * 1.6);
    head.hp = head.maxHp;
    head.radius = Math.min(18, head.radius + 2);
    this.chains.push({
      kind: parent.kind, icon: parent.icon, color: parent.color, segs,
      r: nr, theta: nth, dir: parent.dir,
      shrink: def.shrink * 0.8,
      angular: def.angular * 0.8,
      wobble: rand(0, Math.PI * 2),
      contact: parent.contact, score: def.score, coins: def.coins,
      segRadius: parent.segRadius, boss: false, name: parent.name,
      stunT: 0.35,
      bossState: { ...parent.bossState, enraged: false, barrierActive: false, barrierHp: 0 },
    });
    // Slice juice
    this.burst(cutX, cutY, '#ffffff', 14, 300);
    this.rings.push({ x: cutX, y: cutY, r: 6, maxR: 42, t: 0, dur: 0.3, color: '255,255,255' });
    this.hitstop.triggerMs(45);
    this.shake.addTrauma(0.18);
    this.score += Math.round(parent.score * 0.5 * (1 + this.wave * 0.05) * this.diff.scoreMul * this.stage.scoreMul);
    this.dmgNumbers.spawn(cutX, cutY - 18, '分断!', 'custom', {
      color: '#f8fafc',
      strokeColor: '#0ea5e9',
      strokeWidth: 3,
      fontSize: 16,
      fontFamily: 'sans-serif',
      initialScale: 1.5,
    });
  }

  private dropCoin(x: number, y: number, val: number): void {
    if (this.coinPs.length >= MAX_COINS) return;
    this.coinPs.push({ x, y, vx: rand(-70, 70), vy: rand(-70, 70), val });
  }

  private updateCoins(dt: number): void {
    const mr = 150;
    const mr2 = mr * mr;
    for (let i = this.coinPs.length - 1; i >= 0; i--) {
      const c = this.coinPs[i];
      const d2 = dist2(c.x, c.y, this.px, this.py);
      if (c.val < 0) {
        // heal bento: drift to player when close
        if (d2 < mr2) {
          const d = Math.max(1, Math.sqrt(d2));
          c.vx += ((this.px - c.x) / d) * 2000 * dt;
          c.vy += ((this.py - c.y) / d) * 2000 * dt;
        }
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (d2 < 26 * 26) {
          this.coinPs.splice(i, 1);
          this.hp = Math.min(this.maxHp, this.hp + 20);
          this.shield = Math.min(this.maxShield, this.shield + 20);
          this.dmgNumbers.spawn(this.px, this.py - 14, '+20', 'heal');
          this.ev.onBanner('エナジーパック回収！', 'HPとシールドが回復！');
          this.sound.heal();
        }
        continue;
      }
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
        this.coins += c.val;
        this.score += c.val * 5;
        this.sound.coin();
      }
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
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].t -= dt;
      if (this.beams[i].t <= 0) this.beams.splice(i, 1);
    }
  }

  private finishRun(victory: boolean): void {
    this.over = true;
    this.phase = 'over';
    const upgradeLevels: Record<string, number> = {};
    for (const id of Object.keys(this.levels) as UpgradeId[]) {
      if (this.levels[id] > 0) upgradeLevels[id] = this.levels[id];
    }
    const result: RunResult = {
      victory, wave: this.wave,
      segs: this.segsKilled, chains: this.chainsKilled,
      score: Math.round(this.score), coins: this.coins,
      difficulty: this.diff.id, timeSec: Math.floor(this.runTime),
      chainKills: { ...this.chainKills }, upgradeLevels,
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
    for (const c of this.chains) {
      if (c.boss && c.segs[0] && c.segs[0].hp > 0) {
        bossName = c.name;
        let hp = 0; let max = 0;
        for (const s of c.segs) { hp += Math.max(0, s.hp); max += s.maxHp; }
        bossHp = Math.ceil(hp);
        bossMax = Math.ceil(max);
        break;
      }
    }
    this.ev.onHud({
      hp: Math.ceil(this.hp), maxHp: this.maxHp,
      wave: Math.max(1, this.wave), totalWaves: FINAL_WAVE,
      phase: this.phase,
      timeSec: Math.floor(this.runTime), score: Math.round(this.score), coins: this.coins,
      segs: this.segsKilled, chainsLeft: this.chains.length + this.queue.length,
      build: {
        dmg: Math.round(this.shotDmg()), interval: this.interval(),
        count: this.shotCount(), pierce: this.pierce(), crit: this.critCh(),
        orbN: this.orbN(), blastLv: this.levels.blast, beamLv: this.levels.beam,
      },
      levels: (Object.keys(this.levels) as UpgradeId[])
        .filter((id) => this.levels[id] > 0)
        .map((id) => ({ id, icon: UPGRADES[id].icon, lv: this.levels[id] })),
      bossName, bossHp, bossMax,
      endless: this.endless,
    });
  }

  /* ----- render ----- */

  private render(): void {
    const { ctx } = this;
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    ctx.save();
    ctx.scale(dpr, dpr);
    const W = VIEW;

    // Apply Trauma Screen Shake translation and rotation
    this.shake.applyToCanvas(ctx, CENTER, CENTER);

    // 1. Cyber-Office Grid Backdrop (stage-tinted)
    const g0 = ctx.createRadialGradient(CENTER, CENTER, 40, CENTER, CENTER, ARENA_R + 60);
    g0.addColorStop(0, this.stage.bg[1]);
    g0.addColorStop(1, this.stage.bg[0]);
    ctx.fillStyle = g0;
    ctx.fillRect(-20, -20, W + 40, W + 40);

    // Subtle holographic radar grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let r = 60; r <= ARENA_R; r += 60) {
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Arena border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, ARENA_R, 0, Math.PI * 2);
    ctx.stroke();

    // Movement boundary ring
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.28)';
    if (ctx.setLineDash) ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, MOVE_R, 0, Math.PI * 2);
    ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);

    // 2. Bento Drops & Energy Packs (Zero emojis)
    for (const c of this.coinPs) {
      if (c.val < 0) {
        drawVectorBento(ctx, c.x, c.y, this.runTime);
      } else {
        // High-tech scrap/credit crystal
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 3. Blast & Shockwave Rings
    for (const r of this.rings) {
      const k = r.t / r.dur;
      ctx.strokeStyle = `rgba(${r.color},${1 - k})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Laser Beams (Additive Blend)
    for (const b of this.beams) {
      const alpha = Math.max(0, b.t / 0.4);
      drawVectorLaser(ctx, this.px, this.py, b.x2, b.y2, 4, '#fbbf24', alpha);
    }

    // 5. Boss Attack Telegraphs & Gimmicks
    for (const c of this.chains) {
      if (!c.boss) continue;
      const head = c.segs[0];
      if (!head) continue;
      const b = c.bossState;

      // Wave 10 Conference Laser Telegraph
      if (b.laserCharging) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.5;
        if (ctx.setLineDash) ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        ctx.lineTo(head.x + Math.cos(b.laserAngle) * 380, head.y + Math.sin(b.laserAngle) * 380);
        ctx.stroke();
        ctx.restore();
      }

      // Wave 10 Conference Laser Active Sweeping Beam
      if (b.laserFiring) {
        const lx2 = head.x + Math.cos(b.laserAngle) * 380;
        const ly2 = head.y + Math.sin(b.laserAngle) * 380;
        drawVectorLaser(ctx, head.x, head.y, lx2, ly2, 7, '#dc2626', 0.95);
      }

      // Wave 15 Executive Barrier
      if (c.kind === 'president' && b.barrierActive && b.barrierHp > 0) {
        const barRatio = b.maxBarrierHp > 0 ? b.barrierHp / b.maxBarrierHp : 1;
        drawVectorExecutiveBarrier(ctx, head.x, head.y, head.radius, b.barrierAngle, b.barrierArc, barRatio, this.runTime);
      }

      // Wave 15 Radial Shockwave Telegraph
      if (b.shockwaveCharging) {
        const pulse = (1.5 - b.shockwaveTelegraphT) / 1.5;
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(head.x, head.y, pulse * 120, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 6. Chains & Segments (Tail to Head)
    for (const c of this.chains) {
      for (let i = c.segs.length - 1; i >= 0; i--) {
        const s = c.segs[i];
        const isHead = i === 0;
        const hpRatio = s.maxHp > 0 ? s.hp / s.maxHp : 0;
        drawVectorSegment(
          ctx,
          s.x, s.y,
          s.radius,
          c.kind,
          isHead,
          hpRatio,
          undefined,
          {
            enraged: c.bossState?.enraged,
            stunned: c.stunT > 0,
            time: this.runTime,
          }
        );
      }
    }

    // 6.5 Treasure Chests in chain gaps
    for (const ch of this.chests) {
      drawVectorChest(ctx, ch.x, ch.y, this.runTime + ch.spin, ch.openT);
    }

    // 7. Player Projectiles
    for (const p of this.projs) {
      drawVectorProjectile(ctx, p.x, p.y, p.vx, p.vy, p.crit, this.runTime);
    }

    // 8. Boss Urgent Memo Spread Projectiles
    for (const bp of this.bossProjs) {
      drawVectorMemoProjectile(ctx, bp.x, bp.y, bp.vx, bp.vy, this.runTime);
    }

    // 9. Orbitals (Holographic Defense Drones)
    const orbN = this.orbN();
    if (orbN > 0 && this.hp > 0) {
      const R = this.orbR();
      for (let i = 0; i < orbN; i++) {
        const a = this.orbAngle + (i * Math.PI * 2) / orbN;
        const ox = this.px + Math.cos(a) * R;
        const oy = this.py + Math.sin(a) * R;
        drawVectorOrbital(ctx, ox, oy, a + Math.PI / 2);
      }
    }

    // 10. Player Corporate Reactor Core
    if (this.hp > 0) {
      const blink = this.iframes > 0 && Math.floor(this.runTime * 14) % 2 === 0;
      if (!blink) {
        const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
        const shieldRatio = this.maxShield > 0 ? this.shield / this.maxShield : 0;
        const aimingAngle = Math.atan2(this.moveY, this.moveX) || (this.runTime * 1.5);
        drawVectorCore(ctx, this.px, this.py, 16, hpRatio, shieldRatio, aimingAngle);
      }

      // Laser Targeting Reticle tracking nearest segment
      const nearest = this.nearestSeg(360);
      if (nearest) {
        drawVectorReticle(ctx, this.px, this.py, nearest.seg.x, nearest.seg.y, this.runTime);
      }
    } else if (this.phase === 'over') {
      // Overheated core rupture
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(this.px, this.py, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // 11. Kinetic Particles
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // 12. Floating Spring Combat Damage Numbers
    this.dmgNumbers.render(ctx);

    // 13. Low HP Emergency Vignette
    const frac = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    if (frac < 0.35 && this.hp > 0) {
      const pulse = 0.22 + 0.14 * Math.sin(this.runTime * 6);
      const vg = ctx.createRadialGradient(CENTER, CENTER, 160, CENTER, CENTER, 420);
      vg.addColorStop(0, 'rgba(239, 68, 68, 0)');
      vg.addColorStop(1, `rgba(239, 68, 68, ${pulse})`);
      ctx.fillStyle = vg;
      ctx.fillRect(-20, -20, W + 40, W + 40);
    }

    ctx.restore();
  }
}

// Distance from point to line segment helper
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = dist2(x1, y1, x2, y2);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export { UPGRADE_ORDER };
