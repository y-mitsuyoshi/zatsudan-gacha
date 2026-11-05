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
  drawVectorExecutiveBarrier,
  drawVectorReticle,
  drawVectorChest,
  drawSpiralTrackRail,
  drawCellularSynapseLinks,
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
  chests: number; drops: number;
  build: HudBuild;
  levels: { id: UpgradeId; icon: string; lv: number }[];
  bossName: string; bossHp: number; bossMax: number;
  endless: boolean;
  /** shield (absorbs damage before HP) */
  shield: number; maxShield: number;
  /** true when the current/upcoming wave contains a boss */
  bossWave: boolean;
  /** enemy chains spawned+queued this wave vs. defeated, for the wave progress gauge */
  waveSpawnTotal: number;
  /** true during the short post-wave "回収" interlude (drops are vacuumed in) */
  clearing: boolean;
  /** Rolling 1.5s live DPS and run peak DPS */
  dps?: number;
  peakDps?: number;
  /** Game speed multiplier (1x or 2x) */
  speedScale?: 1 | 2;
  /** Active + queued segment count */
  segsRemaining?: number;
}

export type UpgradeRarity = 'common' | 'rare' | 'epic';

export interface UpgradeChoice {
  kind: 'upgrade' | 'bonus';
  id: string;
  name: string;
  icon: string;
  desc: string;
  toLv: number;
  isNew: boolean;
  /** visual rarity tier of the card */
  rarity: UpgradeRarity;
  category?: 'weapon' | 'tech' | 'core' | 'bonus';
  /** max level of the upgrade (0 for bonus) */
  maxLv: number;
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
  recoverable?: boolean;
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
  flashT?: number;
  weak?: boolean;
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
  slowT?: number;
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

/** Coin / energy-pack drop. val < 0 = energy pack (heal + shield). */
interface CoinP { x: number; y: number; vx: number; vy: number; val: number; age?: number }

/** Drops older than this are force-homed into the core so nothing lingers on screen. */
const DROP_FORCE_HOME_SEC = 2.4;
/** Free (detached) chests within this radius of the core are auto-opened. */
const CHEST_AUTO_OPEN_R = 64;
/** Post-wave vacuum interlude length (drops/chests are sucked into the core). */
const CLEAR_INTERLUDE_SEC = 1.15;
/** Coins granted per unopened chest converted at wave end. */
const CHEST_CONVERT_COINS = 40;
const MAX_SIM_STEP = 1 / 60;
const MAX_SIM_SUBSTEPS = 8;
const WEAKPOINT_DMG_MUL = 1.75;
const RECOVERY_IFRAMES = 2.2;
interface BeamFx { x1?: number; y1?: number; x2: number; y2: number; t: number; color?: string; width?: number }
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
  free: boolean;
}

interface SpawnReq { kind: ChainKind; at: number }

interface SweepHit {
  t: number;
  chest?: Chest;
  chain?: Chain;
  seg?: Seg;
  ci: number;
  si: number;
}

function rand(a: number, b: number): number { return a + Math.random() * (b - a); }
function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy;
}
function sweepCircleT(
  x0: number, y0: number, x1: number, y1: number,
  cx: number, cy: number, radius: number
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const fx = x0 - cx;
  const fy = y0 - cy;
  const a = dx * dx + dy * dy;
  const c = fx * fx + fy * fy - radius * radius;
  if (c <= 0) return 0;
  if (a <= 1e-9) return -1;
  const b = 2 * (fx * dx + fy * dy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const root = Math.sqrt(disc);
  const t = (-b - root) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
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
  private victory = false;
  private endless = false;
  private recoveryUsed = false;
  private speedScale: 1 | 2 = 1;

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
  /** >0 while the post-wave vacuum interlude plays (phase stays 'wave', no spawns) */
  private clearT = 0;
  /** chains spawned (incl. splits) + queued at wave start, for the progress gauge */
  private waveSpawnTotal = 0;
  /** boss arrival cinematic timer (canvas WARNING overlay) */
  private bossIntroT = 0;
  private bossIntroName = '';
  /** wave-clear canvas stamp timer */
  private clearStampT = 0;
  /** coin pickup flash on the core */
  private coreFlashT = 0;
  /** turret muzzle flash timer */
  private muzzleFlashT = 0;
  /** rolling 1.5s damage window for live DPS telemetry */
  private dmgHistory: Array<{ t: number; dmg: number }> = [];
  private peakDps = 0;

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
    this.paused = false; this.over = false; this.victory = false; this.endless = false;
    this.recoveryUsed = false;
    this.phase = 'build';
    this.aimAngle = null;
    this.buildFromChest = false;
    this.replayWaveOnBuild = false;
    this.currentChoices = [];
    this.clearT = 0; this.waveSpawnTotal = 0;
    this.bossIntroT = 0; this.bossIntroName = '';
    this.clearStampT = 0; this.coreFlashT = 0; this.muzzleFlashT = 0;
    this.dmgHistory = []; this.peakDps = 0;
    this.hudT = 0;
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
    const rawDt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const scaledDt = rawDt * this.speedScale;

    // HitStop micro-freeze check
    const { frozen } = this.hitstop.update(rawDt);
    if (frozen) {
      // Hitstop micro-freeze: update screen shake and render impact frame
      this.shake.update(rawDt);
      this.render();
      this.raf = safeRaf((n) => this.loop(n, gen));
      return;
    }

    this.updateScaled(scaledDt);
    this.shake.update(rawDt);
    this.dmgNumbers.update(scaledDt);
    this.render();

    this.hudT += rawDt;
    if (this.hudT >= 0.12) { this.hudT = 0; this.emitHud(); }
    this.raf = safeRaf((n) => this.loop(n, gen));
  };

  private updateScaled(dt: number): void {
    let remaining = dt;
    for (let i = 0; i < MAX_SIM_SUBSTEPS && remaining > 1e-6; i++) {
      const step = Math.min(remaining, MAX_SIM_STEP);
      if (!this.paused && !this.over && this.phase === 'wave') this.update(step);
      else if (!this.paused && !this.over && this.phase === 'build') this.updateBuildFx(step);
      else if (!this.paused && this.over) this.updateOverFx(step);
      remaining -= step;
    }
  }

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
  setSpeed(scale: 1 | 2): void {
    this.speedScale = scale;
    this.emitHud();
  }
  getSpeed(): 1 | 2 {
    return this.speedScale;
  }
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
    this.shield = Math.max(this.shield, Math.round(this.maxShield / 2));
    this.iframes = RECOVERY_IFRAMES;
    this.chains = []; this.queue = [];
    this.projs = []; this.bossProjs = [];
    this.coinPs = []; this.chests = [];
    this.beams = []; this.rings = []; this.parts = [];
    this.clearT = 0; this.bossIntroT = 0; this.clearStampT = 0;
    this.coreFlashT = 0; this.muzzleFlashT = 0;
    this.dmgHistory = []; this.peakDps = 0;
    this.hitstop.reset();
    this.shake.reset();
    this.dmgNumbers.clear();
    this.fireCd = 0; this.blastCd = 0; this.beamCd = 0;
    this.buildFromChest = false;
    this.replayWaveOnBuild = false;
    this.currentChoices = [];
    this.aimAngle = null;
    this.phase = 'build';
    this.emitBuild();
    this.emitHud();
    this.ev.onBanner('残業突入！', '渦は終わらない…どこまで耐えられるか');
  }

  recoverRun(): boolean {
    if (!this.over || this.victory || this.recoveryUsed) return false;
    this.recoveryUsed = true;
    this.over = false;
    this.phase = 'build';
    this.replayWaveOnBuild = true;
    this.hp = this.maxHp;
    this.shield = Math.max(Math.round(this.maxShield * 0.5), this.shield);
    this.iframes = RECOVERY_IFRAMES;
    this.chains = []; this.queue = [];
    this.projs = []; this.bossProjs = [];
    this.coinPs = []; this.chests = [];
    this.beams = []; this.rings = []; this.parts = [];
    this.clearT = 0; this.bossIntroT = 0; this.clearStampT = 0;
    this.coreFlashT = 0; this.muzzleFlashT = 0;
    this.dmgHistory = []; this.peakDps = 0;
    this.hitstop.reset();
    this.shake.reset();
    this.dmgNumbers.clear();
    this.fireCd = 0; this.blastCd = 0; this.beamCd = 0;
    this.buildFromChest = false;
    this.currentChoices = [];
    this.aimAngle = null;
    this.emitBuild();
    this.emitHud();
    this.ev.onBanner('再起動 // 立て直し', '同じ波から再開。装備と強化は維持される');
    return true;
  }

  /* ----- build phase ----- */

  private rarityOf(id: UpgradeId, toLv: number): UpgradeRarity {
    const def = UPGRADES[id];
    const weapon = id === 'orb' || id === 'blast' || id === 'beam';
    if ((weapon && toLv === 1) || toLv >= def.maxLv) return 'epic';
    if (weapon || id === 'multi' || id === 'pierce' || id === 'crit') return 'rare';
    return 'common';
  }

  private buildChoices(fromChest = false): UpgradeChoice[] {
    const pool: UpgradeChoice[] = [];
    for (const id of UPGRADE_ORDER) {
      const lv = this.levels[id];
      const def = UPGRADES[id];
      if (lv < def.maxLv) {
        pool.push({
          kind: 'upgrade', id, name: def.name, icon: def.icon, desc: def.desc,
          toLv: lv + 1, isNew: lv === 0,
          rarity: this.rarityOf(id, lv + 1), category: def.category ?? 'tech', maxLv: def.maxLv,
        });
      }
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks: UpgradeChoice[] = [];
    const usedCategories = new Set<string>();
    for (const p of pool) {
      if (picks.length >= 3) break;
      const category = p.category ?? 'tech';
      if (usedCategories.has(category)) continue;
      usedCategories.add(category);
      picks.push(p);
    }
    for (const p of pool) {
      if (picks.length >= 3) break;
      if (!picks.includes(p)) picks.push(p);
    }
    if (fromChest && picks.length > 0 && !picks.some((p) => p.rarity !== 'common')) {
      const better = pool.find((p) => !picks.includes(p) && p.rarity !== 'common');
      if (better) picks[picks.length - 1] = better;
    }
    while (picks.length < 3) {
      picks.push(picks.length % 2 === 0
        ? { kind: 'bonus', id: `coins${picks.length}`, name: '臨時ボーナス', icon: 'bonus_coin', desc: '残業手当 +80', toLv: 0, isNew: false, rarity: 'common', category: 'bonus', maxLv: 0 }
        : { kind: 'bonus', id: `heal${picks.length}`, name: '栄養ドリンク', icon: 'bonus_heal', desc: 'HPを全回復', toLv: 0, isNew: false, rarity: 'common', category: 'bonus', maxLv: 0 });
    }
    return picks;
  }

  private currentChoices: UpgradeChoice[] = [];
  /** true while the build modal was opened by a chest (resume wave instead of advancing) */
  private buildFromChest = false;
  private replayWaveOnBuild = false;

  private emitBuild(): void {
    this.rerollLeft = 1;
    this.buildFromChest = false;
    this.currentChoices = this.buildChoices();
    const displayWave = this.wave + (this.replayWaveOnBuild ? 0 : 1);
    this.ev.onBuild({ wave: displayWave, choices: this.currentChoices, canReroll: true });
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
    const replay = this.replayWaveOnBuild;
    this.replayWaveOnBuild = false;
    this.startWave(!replay);
  }

  rerollBuild(): void {
    if (this.phase !== 'build' || this.over || this.rerollLeft <= 0) return;
    this.rerollLeft -= 1;
    this.currentChoices = this.buildChoices(this.buildFromChest);
    this.sound.upgrade();
    const displayWave = this.buildFromChest ? this.wave : this.wave + (this.replayWaveOnBuild ? 0 : 1);
    this.ev.onBuild({ wave: displayWave, choices: this.currentChoices, canReroll: false, fromChest: this.buildFromChest });
  }

  /* ----- waves ----- */

  private startWave(advance = true): void {
    if (advance) this.wave += 1;
    this.waveTime = 0;
    this.clearT = 0;
    this.queue = [];
    // Never carry live hazards/drops across waves (they would be frozen during build)
    this.projs = []; this.bossProjs = [];
    this.flushDrops();
    this.chests = this.chests.filter((c) => !c.taken && this.chains.includes(c.chain));
    const plan = wavePlan(this.wave);
    for (const item of plan) {
      const count = Math.max(1, Math.round(item.count * this.diff.countMul * this.stage.countMul));
      for (let i = 0; i < count; i++) {
        this.queue.push({ kind: item.kind, at: item.delay + i * item.gap });
      }
    }
    this.queue.sort((a, b) => a.at - b.at);
    this.waveSpawnTotal = this.queue.length + this.chains.length;
    this.phase = 'wave';
    const bossItem = plan.find((p) => CHAINS[p.kind].boss);
    if (bossItem) {
      const def = CHAINS[bossItem.kind];
      this.ev.onBanner(`第${this.wave}波 — 決裁者襲来`, `${def.name}が接近中。頭部を狙え！`);
      this.shake.addTrauma(0.25);
    } else {
      this.ev.onBanner(`第${this.wave}波`, this.wave === 1 ? '業務列を撃ち落とせ。タップで照準、離すと自動照準' : '渦巻く業務列を迎撃せよ！');
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
      const headMul = def.headHpMul ?? (def.boss ? 4.5 : 2.8);
      const taper = def.boss && i > 0
        ? 1 - Math.min(0.38, (i / Math.max(1, def.segs - 1)) * 0.42)
        : 1;
      const hp = def.segHp * hs * (i === 0 ? headMul : taper);
      const weak = def.boss && i > 0 && (def.weakEvery ?? 0) > 0 && i % (def.weakEvery ?? 0) === 0;
      segs.push({ x: 0, y: 0, hp, maxHp: hp, radius: def.segRadius, hitCd: 0, orbCd: 0, weak });
    }

    const bossBarrierHp = kind === 'president' ? 260 * hs : 0;
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

    const spacing = def.segRadius * 1.7;
    for (let i = 0; i < segs.length; i++) {
      const rr = chain.r + i * spacing;
      segs[i].x = CENTER + Math.cos(theta) * rr;
      segs[i].y = CENTER + Math.sin(theta) * rr;
    }
    this.chains.push(chain);

    if (def.boss) {
      // Boss arrival cinematic: canvas WARNING tape + rumble
      this.bossIntroT = 2.2;
      this.bossIntroName = def.name;
      this.sound.boss();
      this.shake.addTrauma(0.6);
      this.hitstop.triggerMs(80);
      this.ev.onBanner(`WARNING — ${def.name}`, '頭部破壊で1.5秒スタン。金色の弱点節は1.75倍ダメージ！');
    }
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
          free: false,
        });
      }
    }
  }

  /* ----- update ----- */

  private update(dt: number): void {
    // Post-wave interlude: no enemies, drops/chests are vacuumed into the core
    if (this.clearT > 0) {
      this.updateClearing(dt);
      return;
    }

    this.waveTime += dt;
    this.runTime += dt;
    this.tickTimers(dt);

    const mvx = Number.isFinite(this.moveX) ? Math.max(-1, Math.min(1, this.moveX)) : 0;
    const mvy = Number.isFinite(this.moveY) ? Math.max(-1, Math.min(1, this.moveY)) : 0;
    this.px = CENTER + mvx * MOVE_R;
    this.py = CENTER + mvy * MOVE_R;
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

    if (this.hp <= 0) {
      this.hp = 0;
      this.finishRun(false);
      return;
    }

    // A chest opened this frame switched us into its pick modal; resolve the
    // wave clear after the pick so the chest reward is never overridden.
    if (this.phase !== 'wave' || this.over) return;

    // wave clear → start the vacuum interlude
    if (this.queue.length === 0 && this.chains.length === 0) {
      this.beginClear();
    }
  }

  private tickTimers(dt: number): void {
    if (this.bossIntroT > 0) this.bossIntroT = Math.max(0, this.bossIntroT - dt);
    if (this.clearStampT > 0) this.clearStampT = Math.max(0, this.clearStampT - dt);
    if (this.coreFlashT > 0) this.coreFlashT = Math.max(0, this.coreFlashT - dt);
    if (this.muzzleFlashT > 0) this.muzzleFlashT = Math.max(0, this.muzzleFlashT - dt);
  }

  /** Wave defeated: clear hazards and start sucking every remaining drop into the core. */
  private beginClear(): void {
    this.clearT = CLEAR_INTERLUDE_SEC;
    this.clearStampT = 1.4;
    this.projs = [];
    this.bossProjs = [];
    this.iframes = 0;
    this.sound.waveClear();
    this.shake.addTrauma(0.2);
    // Every untaken chest is released and flies to the core
    for (const ch of this.chests) if (!ch.taken) ch.free = true;
  }

  private updateClearing(dt: number): void {
    this.runTime += dt;
    this.tickTimers(dt);
    this.clearT -= dt;
    this.orbAngle += dt * 2.6;
    this.updateCoins(dt, true);
    this.updateClearChests(dt);
    this.updateFx(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt; r.r += 520 * dt;
      if (r.t >= r.dur || r.r >= r.maxR) this.rings.splice(i, 1);
    }
    const pending = this.coinPs.length > 0 || this.chests.some((c) => !c.taken);
    // Leave early once everything is in (but give the stamp a moment to read)
    if (this.clearT <= 0 || (!pending && this.clearT < CLEAR_INTERLUDE_SEC - 0.6)) {
      this.finishClear();
    }
  }

  /** Chests fly straight into the core during the interlude and convert to coins. */
  private updateClearChests(dt: number): void {
    for (const ch of this.chests) {
      ch.spin += dt * 6;
      if (ch.taken) { ch.openT -= dt; continue; }
      const dx = CENTER - ch.x; const dy = CENTER - ch.y;
      const d = Math.hypot(dx, dy);
      const step = Math.max(420, d * 4) * dt;
      if (d <= Math.max(18, step)) {
        this.convertChest(ch);
      } else {
        ch.x += (dx / d) * step;
        ch.y += (dy / d) * step;
      }
    }
    this.chests = this.chests.filter((c) => !c.taken || c.openT > 0);
  }

  private convertChest(ch: Chest): void {
    if (ch.taken) return;
    ch.taken = true;
    ch.openT = 0.45;
    const val = Math.round(CHEST_CONVERT_COINS * this.stage.coinMul);
    this.coins += val;
    this.score += 200;
    this.coreFlashT = 0.3;
    this.burst(ch.x, ch.y, '#fde047', 18, 240);
    this.dmgNumbers.spawn(CENTER, CENTER - 34, `宝箱 +${val}`, 'custom', {
      color: '#fde68a', strokeColor: '#78350f', strokeWidth: 3, fontSize: 15, fontFamily: 'sans-serif', initialScale: 1.4,
    });
    this.sound.coin();
  }

  private finishClear(): void {
    this.clearT = 0;
    // Guarantee: anything still in flight is credited, nothing stays on screen
    this.flushDrops();
    for (const ch of this.chests) if (!ch.taken) this.convertChest(ch);
    this.chests = [];
    const bonus = Math.round((10 + this.wave * 2) * this.stage.coinMul);
    this.coins += bonus;
    this.score += Math.round(200 * this.wave * this.diff.scoreMul * this.stage.scoreMul);
    if (!this.endless && this.wave >= FINAL_WAVE) {
      this.finishRun(true);
      return;
    }
    this.phase = 'build';
    this.ev.onBanner(`第${this.wave}波 制圧`, `残業手当 +${bonus} — 強化を1つ選択`);
    this.emitBuild();
    this.emitHud();
  }

  /** Instantly credit every drop still on screen (no drop is ever lost or frozen). */
  private flushDrops(): void {
    for (const c of this.coinPs) this.collectDrop(c, false);
    this.coinPs = [];
  }

  private updateBuildFx(dt: number): void {
    this.orbAngle += dt * 2;
    this.tickTimers(dt);
    this.updateChests(dt);
    // Drops keep flying into the core while a pick modal is open (never freeze on screen)
    this.updateCoins(dt);
    this.updateFx(dt);
  }

  private updateOverFx(dt: number): void {
    this.tickTimers(dt);
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
      if (c.slowT && c.slowT > 0) {
        c.slowT = Math.max(0, c.slowT - dt);
      }
      const speedMul = c.slowT && c.slowT > 0 ? 0.55 : 1;

      // Spiral contraction — smooth continuous descent
      // Avoid endless orbit clamping at center core:
      // When radius reaches core threshold (<= 28), initiate direct breach assault!
      if (c.r > 24) {
        c.r = Math.max(16, c.r - c.shrink * speedMul * dt);
        c.theta += c.angular * speedMul * c.dir * dt;
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
          head.x += (bdx / bd) * (c.shrink * 1.6 * speedMul) * dt;
          head.y += (bdy / bd) * (c.shrink * 1.6 * speedMul) * dt;
        }
      } else {
        // Smooth spiral guidance with gentle homing (14%)
        head.x = sx * 0.86 + this.px * 0.14;
        head.y = sy * 0.86 + this.py * 0.14;
      }

      if (head.hitCd > 0) head.hitCd -= dt;
      if (head.orbCd > 0) head.orbCd -= dt;
      if (head.flashT && head.flashT > 0) head.flashT = Math.max(0, head.flashT - dt);

      // Distance-Verlet Follow Physics (No rigid step clamp!)
      // Segments maintain continuous distance constraint without rubber-banding or detaching
      const spacing = c.segRadius * 1.7;
      for (let i = 1; i < c.segs.length; i++) {
        const s = c.segs[i];
        const prev = c.segs[i - 1];
        if (s.hitCd > 0) s.hitCd -= dt;
        if (s.orbCd > 0) s.orbCd -= dt;
        if (s.flashT && s.flashT > 0) s.flashT = Math.max(0, s.flashT - dt);

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

          c.r = Math.min(ARENA_R, c.r + 22);

          // If breaching core at extreme proximity, breach segment self-destructs
          if (c.r <= 46 && si === 0) {
            this.burst(head.x, head.y, '#f59e0b', 16, 240);
            this.killSeg(c, ci, 0);
          }
          break;
        }
      }
    }
  }

  /**
   * Updates boss-specific gimmicks (Cell Survivor style — ZERO enemy projectiles or ranged player damage!):
   * - Wave 5 (課長): Enrage speed surge under 50% HP + periodic crimson reinforcement aura pulse
   * - Wave 10 (役員): Rotation direction reversal + non-damaging conference scanner haste surge
   * - Wave 15 (社長): Golden executive frontal barrier, minion chain summons & non-damaging imperial roar
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
    // Wave 5: 課長 (bossMid) — Enrage & Reinforcement Aura (No Projectiles!)
    // ==========================================
    if (c.kind === 'bossMid') {
      // Enrage check at 50% HP
      if (hpRatio < 0.5 && !b.enraged) {
        b.enraged = true;
        c.angular *= 1.35;
        this.shake.addTrauma(0.45);
        this.ev.onBanner('課長激怒モード！', '進行速度上昇＆督促オーラ発動！');
      }

      b.memoCd -= dt;
      const auraInterval = b.enraged ? 1.8 : 3.0;
      if (b.memoCd <= 0) {
        b.memoCd = auraInterval;
        // Non-damaging visual督促オーラ ring that reinforces body segments slightly
        this.rings.push({
          x: head.x, y: head.y,
          r: 12, maxR: 92,
          t: 0, dur: 0.45,
          color: '239,68,68',
        });
        for (let i = 1; i < c.segs.length; i++) {
          const seg = c.segs[i];
          seg.hp = Math.min(seg.maxHp, seg.hp + (b.enraged ? 4 : 2));
        }
        this.burst(head.x, head.y, '#ef4444', 8, 140);
      }
    }

    // ==========================================
    // Wave 10: 役員 (exec) — Reversal & Scanner Haste Surge (No Ranged Damage!)
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

      // Non-damaging visual scanner / haste surge
      b.laserCooldown -= dt;
      if (b.laserCooldown <= 0 && !b.laserCharging && !b.laserFiring) {
        b.laserCharging = true;
        b.laserTelegraphT = 1.5;
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
          this.rings.push({
            x: head.x, y: head.y,
            r: 14, maxR: 120,
            t: 0, dur: 0.5,
            color: '220,38,38',
          });
          this.sound.boss();
        }
      }

      if (b.laserFiring) {
        b.laserDuration -= dt;
        b.laserAngle += b.laserSweepSpeed * dt;
        // Haste surge: advances slightly faster along the spiral during scan (zero ranged player damage!)
        if (c.r > 26) {
          c.r = Math.max(24, c.r - c.shrink * 0.35 * dt);
        }

        if (b.laserDuration <= 0) {
          b.laserFiring = false;
          b.laserCooldown = 5.2;
        }
      }
    }

    // ==========================================
    // Wave 15: 社長 (president) — Golden Barrier, Minions & Imperial Roar (No Ranged Damage!)
    // ==========================================
    if (c.kind === 'president') {
      // Align frontal executive barrier
      b.barrierAngle = c.theta + (c.dir > 0 ? 0.35 : -0.35);

      // Minion chains summon ("全社朝礼")
      if (hpRatio < 0.75 && b.minionsSummoned === 0) {
        b.minionsSummoned = 1;
        this.spawnChain('mail');
        this.spawnChain('claim');
        this.waveSpawnTotal += 2;
        this.shake.addTrauma(0.5);
        this.ev.onBanner('社長「全社朝礼を始める！」', '護衛メール・クレーム列が召集された！');
      } else if (hpRatio < 0.35 && b.minionsSummoned === 1) {
        b.minionsSummoned = 2;
        this.spawnChain('doc');
        this.spawnChain('claim');
        this.waveSpawnTotal += 2;
        this.shake.addTrauma(0.55);
        this.ev.onBanner('社長「総力戦だ！！」', '追加護衛部隊が突入！');
      }

      // Non-damaging Radial Imperial Roar Shockwave
      b.shockwaveCd -= dt;
      if (b.shockwaveCd <= 0 && !b.shockwaveCharging) {
        b.shockwaveCharging = true;
        b.shockwaveTelegraphT = 1.5;
      }

      if (b.shockwaveCharging) {
        b.shockwaveTelegraphT -= dt;
        if (b.shockwaveTelegraphT <= 0) {
          b.shockwaveCharging = false;
          b.shockwaveCd = 6.8;
          // Visual gold shockwave roar + slight advance surge (zero ranged player damage!)
          this.rings.push({
            x: head.x, y: head.y,
            r: 10, maxR: 340,
            t: 0, dur: 0.9,
            color: '251,191,36',
          });
          if (c.r > 32) {
            c.r = Math.max(24, c.r - 8);
          }
          this.shake.addTrauma(0.45);
          this.sound.boss();
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

  private updateBossProjs(_dt: number): void {
    // Cell Survivor rule: enemies never shoot projectiles at the player.
    if (this.bossProjs.length > 0) this.bossProjs.length = 0;
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
        this.muzzleFlashT = 0.085;
        const n = this.shotCount();
        for (let i = 0; i < n; i++) {
          if (this.projs.length >= MAX_PROJECTILES) break;
          const a = base + (i - (n - 1) / 2) * 0.13;
          const crit = Math.random() < this.critCh();
          this.projs.push({
            x: this.px + Math.cos(a) * 16, y: this.py + Math.sin(a) * 16,
            vx: Math.cos(a) * 580, vy: Math.sin(a) * 580,
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
      this.orbAngle += dt * 2.8;
      const R = this.orbR();
      const dmg = this.orbDmg();
      for (let i = 0; i < orbN; i++) {
        const a = this.orbAngle + (i * Math.PI * 2) / orbN;
        const ox = this.px + Math.cos(a) * R;
        const oy = this.py + Math.sin(a) * R;
        for (const ch of this.chests) {
          if (ch.taken) continue;
          if (dist2(ox, oy, ch.x, ch.y) < (17 + 20) * (17 + 20)) {
            this.openChest(ch);
            if (this.phase !== 'wave') return;
          }
        }
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

    // blast (AOE cryo/EMP shockwave — damages, pushes chains back slightly & slows advance!)
    if (this.levels.blast > 0) {
      this.blastCd -= dt;
      if (this.blastCd <= 0) {
        this.blastCd = 3.2;
        const R = this.blastR();
        const dmg = this.blastDmg();
        this.rings.push({ x: this.px, y: this.py, r: 20, maxR: R, t: 0, dur: 0.35, color: '56,189,248' });
        this.rings.push({ x: this.px, y: this.py, r: 10, maxR: R * 0.85, t: 0, dur: 0.3, color: '251,146,60' });
        this.burst(this.px, this.py, '#38bdf8', 16, 240);
        for (const ch of this.chests) {
          if (ch.taken) continue;
          if (dist2(this.px, this.py, ch.x, ch.y) < (R + 20) * (R + 20)) {
            this.openChest(ch);
            if (this.phase !== 'wave') {
              this.sound.hit();
              return;
            }
          }
        }
        for (let ci = this.chains.length - 1; ci >= 0; ci--) {
          const c = this.chains[ci];
          let chainHit = false;
          for (let si = c.segs.length - 1; si >= 0; si--) {
            const s = c.segs[si];
            if (dist2(this.px, this.py, s.x, s.y) < (R + s.radius) * (R + s.radius)) {
              chainHit = true;
              this.damageSeg(c, ci, si, dmg, 260, this.px, this.py, false);
              if (this.phase !== 'wave') return;
            }
          }
          if (chainHit && this.chains.includes(c)) {
            c.slowT = Math.max(c.slowT ?? 0, 1.1);
            c.r = Math.min(ARENA_R, c.r + 10);
          }
        }
        this.sound.hit();
      }
    }

    // beam (High-energy rail-beam + chain lightning arcs to nearby segments!)
    if (this.levels.beam > 0) {
      this.beamCd -= dt;
      if (this.beamCd <= 0) {
        const tgt = this.strongestSeg(440);
        if (!tgt) {
          this.beamCd = 0.3;
        } else {
          this.beamCd = Math.max(2.2, 4.6 - 0.35 * this.levels.beam);
          const tx = tgt.seg.x;
          const ty = tgt.seg.y;
          this.beams.push({ x1: this.px, y1: this.py, x2: tx, y2: ty, t: 0.4, color: '#fbbf24', width: 4.5 });
          this.damageSeg(tgt.chain, tgt.ci, tgt.si, this.beamDmg(), 200, this.px, this.py, false);
          // Chain lightning arcs to up to (1 + beamLv) nearby segments
          if (this.phase === 'wave') {
            let prevX = tx;
            let prevY = ty;
            const maxArcs = Math.min(4, this.levels.beam);
            const chainDmg = this.beamDmg() * 0.45;
            for (let arc = 0; arc < maxArcs && this.chains.length > 0; arc++) {
              const c = this.chains[arc % this.chains.length];
              if (!c || c.segs.length === 0) continue;
              const segIdx = Math.min(c.segs.length - 1, arc + 1);
              const arcSeg = c.segs[segIdx];
              if (!arcSeg || (arcSeg.x === prevX && arcSeg.y === prevY)) continue;
              this.beams.push({
                x1: prevX, y1: prevY,
                x2: arcSeg.x, y2: arcSeg.y,
                t: 0.32, color: '#38bdf8', width: 2.8,
              });
              prevX = arcSeg.x;
              prevY = arcSeg.y;
              this.damageSeg(c, this.chains.indexOf(c), segIdx, chainDmg, 90, this.px, this.py, false);
              if (this.phase !== 'wave') break;
            }
          }
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
      const nx = p.x + p.vx * dt;
      const ny = p.y + p.vy * dt;
      let dead = p.life <= 0;

      if (!dead) {
        const events: SweepHit[] = [];
        for (const ch of this.chests) {
          if (ch.taken) continue;
          const t = sweepCircleT(p.x, p.y, nx, ny, ch.x, ch.y, p.radius + 20);
          if (t >= 0) events.push({ t, chest: ch, ci: -1, si: -1 });
        }
        for (let ci = 0; ci < this.chains.length; ci++) {
          const c = this.chains[ci];
          for (let si = 0; si < c.segs.length; si++) {
            const s = c.segs[si];
            if (p.hit.has(s)) continue;
            const t = sweepCircleT(p.x, p.y, nx, ny, s.x, s.y, p.radius + s.radius);
            if (t >= 0) events.push({ t, chain: c, seg: s, ci, si });
          }
        }
        events.sort((a, b) => a.t - b.t);

        for (const e of events) {
          if (e.chest) {
            if (e.chest.taken) continue;
            if (this.phase !== 'wave' || this.over) { dead = true; break; }
            this.openChest(e.chest);
            dead = true;
            break;
          }
          const c = e.chain;
          const s = e.seg;
          if (!c || !s || this.chains[e.ci] !== c || c.segs[e.si] !== s || s.hp <= 0) continue;
          if (this.phase !== 'wave' || this.over) { dead = true; break; }
          p.hit.add(s);
          const hx = p.x + (nx - p.x) * e.t;
          const hy = p.y + (ny - p.y) * e.t;
          this.damageSeg(c, e.ci, e.si, p.dmg, 110, hx - p.vx * 0.01, hy - p.vy * 0.01, p.crit);
          if (this.phase !== 'wave' || this.over) { dead = true; break; }
          if (p.hit.size > p.pierce) { dead = true; break; }
        }
      }

      p.x = nx;
      p.y = ny;
      if (dead) this.projs.splice(i, 1);
    }
  }

  /** Chest opened → pause for a 3-choice weapon evolution pick. */
  private openChest(c: Chest): void {
    if (c.taken || this.over) return;
    if (this.clearT > 0 || this.phase !== 'wave') {
      this.convertChest(c);
      return;
    }
    c.taken = true;
    c.openT = 0.45;
    this.coreFlashT = 0.35;
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
    this.currentChoices = this.buildChoices(true);
    this.ev.onBuild({ wave: this.wave, choices: this.currentChoices, canReroll: this.rerollLeft > 0, fromChest: true });
  }

  private updateChests(dt: number): void {
    for (const ch of this.chests) {
      ch.spin += dt * 1.4;
      if (ch.taken) {
        // Continue the opening animation even after openT reaches 0 so the
        // chest is eventually removed and can be replaced by a new one.
        ch.openT -= dt;
        continue;
      }
      const attached =
        this.chains.includes(ch.chain) &&
        ch.chain.segs.includes(ch.segA) &&
        ch.chain.segs.includes(ch.segB) &&
        ch.segA.hp > 0 &&
        ch.segB.hp > 0;
      if (!attached) {
        ch.free = true;
      }
      if (ch.free) {
        const dx = CENTER - ch.x;
        const dy = CENTER - ch.y;
        const distance = Math.hypot(dx, dy);
        const step = Math.max(240, distance * 2.8) * dt;
        if (distance > step) {
          ch.x += (dx / distance) * step;
          ch.y += (dy / distance) * step;
        } else {
          ch.x = CENTER;
          ch.y = CENTER;
        }
        if (Math.hypot(CENTER - ch.x, CENTER - ch.y) <= CHEST_AUTO_OPEN_R) {
          if (this.phase === 'wave' && !this.over && this.clearT <= 0) {
            this.openChest(ch);
          } else if (this.clearT > 0) {
            this.convertChest(ch);
          }
        }
        continue;
      }
      ch.x = (ch.segA.x + ch.segB.x) / 2;
      ch.y = (ch.segA.y + ch.segB.y) / 2;
      if (
        Math.hypot(CENTER - ch.x, CENTER - ch.y) <= CHEST_AUTO_OPEN_R &&
        this.phase === 'wave' &&
        !this.over &&
        this.clearT <= 0
      ) {
        this.openChest(ch);
      }
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

    const appliedDamage = dmg * (s.weak ? WEAKPOINT_DMG_MUL : 1);
    s.hp -= appliedDamage;
    s.flashT = 0.14;
    if (appliedDamage > 0) {
      this.dmgHistory.push({ t: this.runTime, dmg: appliedDamage });
    }
    if (s.weak) {
      this.dmgNumbers.spawn(s.x + rand(-6, 6), s.y - s.radius - 2, `${Math.round(appliedDamage)} WEAK`, 'custom', {
        color: '#fde047', strokeColor: '#78350f', strokeWidth: 3, fontSize: 15, fontFamily: 'sans-serif', initialScale: 1.55,
      });
      this.burst(s.x, s.y, '#fde047', 5, 170);
    } else {
      this.dmgNumbers.spawn(s.x + rand(-6, 6), s.y - s.radius - 2, Math.round(appliedDamage), crit ? 'crit' : 'normal');
    }
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
          c.segs[0].weak = false;
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
        this.dropBento(s.x, s.y);
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
    head.weak = false;
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
    this.waveSpawnTotal += 1;
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
    if (this.coinPs.length >= MAX_COINS) {
      const oldest = this.coinPs.shift();
      if (oldest) this.collectDrop(oldest, false);
    }
    this.coinPs.push({ x, y, vx: rand(-70, 70), vy: rand(-70, 70), val, age: 0 });
  }

  private dropBento(x: number, y: number): void {
    if (this.coinPs.length >= MAX_COINS) {
      const oldest = this.coinPs.shift();
      if (oldest) this.collectDrop(oldest, false);
    }
    this.coinPs.push({ x, y, vx: rand(-45, 45), vy: rand(-45, 45), val: -20, age: 0 });
  }

  private collectDrop(c: CoinP, withFx = true): void {
    if (c.val < 0) {
      const healAmt = Math.abs(c.val);
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
      this.shield = Math.min(this.maxShield, this.shield + healAmt);
      if (withFx) {
        this.coreFlashT = 0.28;
        this.dmgNumbers.spawn(CENTER, CENTER - 16, `+${healAmt}`, 'heal');
        this.ev.onBanner('エナジーパック回収！', 'HPとシールドが回復！');
        this.sound.heal();
      }
    } else {
      this.coins += c.val;
      this.score += c.val * 5;
      if (withFx) {
        this.coreFlashT = Math.max(this.coreFlashT, 0.14);
        this.sound.coin();
      }
    }
  }

  private updateCoins(dt: number, fast = false): void {
    for (let i = this.coinPs.length - 1; i >= 0; i--) {
      const c = this.coinPs[i];
      c.age = (c.age ?? 0) + dt;
      const dx = CENTER - c.x;
      const dy = CENTER - c.y;
      const distance = Math.hypot(dx, dy);
      const collectDistance = c.val < 0 ? 36 : 32;

      if (c.age >= DROP_FORCE_HOME_SEC || distance <= collectDistance) {
        this.coinPs.splice(i, 1);
        this.collectDrop(c, true);
        continue;
      }

      if (fast || c.age >= 0.18) {
        const homedSpeed = fast
          ? Math.max(620, distance * 5.5)
          : Math.min(760, 340 + c.age * 420);
        const step = homedSpeed * dt;
        if (distance <= Math.max(collectDistance, step)) {
          this.coinPs.splice(i, 1);
          this.collectDrop(c, true);
          continue;
        }
        c.vx = (dx / distance) * homedSpeed;
        c.vy = (dy / distance) * homedSpeed;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      } else {
        if (distance > 0.001) {
          const pull = 1800;
          c.vx += (dx / distance) * pull * dt;
          c.vy += (dy / distance) * pull * dt;
        }
        const drag = Math.max(0, 1 - 4.5 * dt);
        c.vx *= drag;
        c.vy *= drag;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (Math.hypot(CENTER - c.x, CENTER - c.y) <= collectDistance) {
          this.coinPs.splice(i, 1);
          this.collectDrop(c, true);
        }
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
    this.flushDrops();
    for (const ch of this.chests) if (!ch.taken) this.convertChest(ch);
    this.chests = [];
    this.victory = victory;
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
      recoverable: !victory && !this.recoveryUsed,
    };
    if (victory) this.sound.victory();
    else this.sound.defeat();
    this.emitHud();
    this.ev.onGameOver(result);
  }

  private computeDps(): { dps: number; peakDps: number } {
    const windowSec = 1.5;
    const cutoff = this.runTime - windowSec;
    while (this.dmgHistory.length > 0 && this.dmgHistory[0].t < cutoff) {
      this.dmgHistory.shift();
    }
    let total = 0;
    for (let i = 0; i < this.dmgHistory.length; i++) {
      total += this.dmgHistory[i].dmg;
    }
    const dps = Math.round(total / windowSec);
    if (dps > this.peakDps) this.peakDps = dps;
    return { dps, peakDps: this.peakDps };
  }

  private emitHud(): void {
    let bossName = '';
    let bossHp = 0;
    let bossMax = 0;
    let liveSegs = 0;
    for (const c of this.chains) {
      liveSegs += c.segs.length;
      if (c.boss && c.segs[0] && c.segs[0].hp > 0) {
        bossName = c.name;
        let hp = 0; let max = 0;
        for (const s of c.segs) { hp += Math.max(0, s.hp); max += s.maxHp; }
        bossHp = Math.ceil(hp);
        bossMax = Math.ceil(max);
      }
    }
    let queuedSegs = 0;
    for (const q of this.queue) {
      queuedSegs += CHAINS[q.kind]?.segs ?? 5;
    }
    const { dps, peakDps } = this.computeDps();
    const checkWave = this.phase === 'build' && !this.buildFromChest ? this.wave + 1 : Math.max(1, this.wave);
    const bossWave = bossMax > 0 || wavePlan(checkWave).some((p) => CHAINS[p.kind].boss);
    this.ev.onHud({
      hp: Math.ceil(this.hp), maxHp: this.maxHp,
      wave: Math.max(1, this.wave), totalWaves: FINAL_WAVE,
      phase: this.phase,
      timeSec: Math.floor(this.runTime), score: Math.round(this.score), coins: this.coins,
      segs: this.segsKilled, chainsLeft: this.chains.length + this.queue.length,
      chests: this.chests.filter((c) => !c.taken).length, drops: this.coinPs.length,
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
      shield: Math.ceil(this.shield),
      maxShield: this.maxShield,
      bossWave,
      waveSpawnTotal: Math.max(1, this.waveSpawnTotal),
      clearing: this.clearT > 0,
      dps,
      peakDps,
      speedScale: this.speedScale,
      segsRemaining: liveSegs + queuedSegs,
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

    // Subtle holographic radar grid + sector lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.055)';
    ctx.lineWidth = 1;
    for (let r = 60; r <= ARENA_R; r += 60) {
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(CENTER + Math.cos(a) * 36, CENTER + Math.sin(a) * 36);
      ctx.lineTo(CENTER + Math.cos(a) * ARENA_R, CENTER + Math.sin(a) * ARENA_R);
      ctx.stroke();
    }

    // 1.5 Cell Survivor Visible Spiral Track Rail & Danger Perimeter Zone
    drawSpiralTrackRail(ctx, CENTER, CENTER, ARENA_R, this.runTime);

    // Arena border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, ARENA_R, 0, Math.PI * 2);
    ctx.stroke();

    // Inner core defense perimeter ring
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.24)';
    if (ctx.setLineDash) ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, MOVE_R, 0, Math.PI * 2);
    ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);

    // 2. Bento Drops & Credit Chips (Zero emojis, with vacuum trails)
    for (const c of this.coinPs) {
      if (c.val < 0) {
        drawVectorBento(ctx, c.x, c.y, this.runTime);
      } else {
        // Motion trail toward core
        const speed = Math.hypot(c.vx, c.vy);
        if (speed > 80) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x - c.vx * 0.035, c.y - c.vy * 0.035);
          ctx.stroke();
        }
        // High-contrast corporate credit chip
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(c.x - 1.2, c.y - 1.2, 1.5, 0, Math.PI * 2);
        ctx.fill();
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

    // 4. Laser Beams & Chain Lightning Arcs (Additive Blend)
    for (const b of this.beams) {
      const alpha = Math.max(0, b.t / 0.4);
      drawVectorLaser(
        ctx,
        b.x1 ?? this.px,
        b.y1 ?? this.py,
        b.x2,
        b.y2,
        b.width ?? 4,
        b.color ?? '#fbbf24',
        alpha
      );
    }

    // 5. Boss Attack Telegraphs & Gimmicks
    for (const c of this.chains) {
      if (!c.boss) continue;
      const head = c.segs[0];
      if (!head) continue;
      const b = c.bossState;

      // Wave 10 Conference Scanner Telegraph
      if (b.laserCharging) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1.5;
        if (ctx.setLineDash) ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        ctx.lineTo(head.x + Math.cos(b.laserAngle) * 380, head.y + Math.sin(b.laserAngle) * 380);
        ctx.stroke();
        ctx.restore();
      }

      // Wave 10 Conference Scanner Active Beam (Non-damaging visual haste scanner)
      if (b.laserFiring) {
        const lx2 = head.x + Math.cos(b.laserAngle) * 380;
        const ly2 = head.y + Math.sin(b.laserAngle) * 380;
        drawVectorLaser(ctx, head.x, head.y, lx2, ly2, 5, '#dc2626', 0.75);
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

    // 6. Chains & Numbered Cell Segments (Tail to Head, with Cellular Synapse Links)
    for (const c of this.chains) {
      if (c.segs.length > 1) {
        drawCellularSynapseLinks(ctx, c.segs, c.kind, this.runTime, c.bossState?.enraged);
      }
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
            slowed: (c.slowT ?? 0) > 0,
            hpValue: s.hp,
            hitFlash: s.flashT ?? 0,
            weak: s.weak,
            time: this.runTime,
          }
        );
      }
    }

    // 6.5 Treasure Chests in chain gaps (with tractor tether when free)
    for (const ch of this.chests) {
      if (ch.free && !ch.taken) {
        ctx.save();
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
        ctx.lineWidth = 1.6;
        if (ctx.setLineDash) ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER);
        ctx.lineTo(ch.x, ch.y);
        ctx.stroke();
        ctx.restore();
      }
      drawVectorChest(ctx, ch.x, ch.y, this.runTime + ch.spin, ch.openT);
    }

    // 7. Player Projectiles
    for (const p of this.projs) {
      drawVectorProjectile(ctx, p.x, p.y, p.vx, p.vy, p.crit, this.runTime);
    }

    // 8. Orbitals (Rotating Plasma Saws)
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

    // 10. Player Corporate Reactor Core & Hyper-Turret
    if (this.hp > 0) {
      const nearest = this.nearestSeg(380);
      const blink = this.iframes > 0 && Math.floor(this.runTime * 14) % 2 === 0;
      if (this.coreFlashT > 0) {
        const fa = Math.min(1, this.coreFlashT / 0.28);
        ctx.strokeStyle = `rgba(253, 224, 71, ${fa * 0.75})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.px, this.py, 22 + (1 - fa) * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!blink) {
        const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
        const shieldRatio = this.maxShield > 0 ? this.shield / this.maxShield : 0;
        const aimingAngle =
          this.aimAngle !== null
            ? this.aimAngle
            : nearest
              ? Math.atan2(nearest.seg.y - this.py, nearest.seg.x - this.px)
              : this.runTime * 1.5;
        drawVectorCore(ctx, this.px, this.py, 16, hpRatio, shieldRatio, aimingAngle, this.muzzleFlashT);
      }

      // Laser Targeting Reticle (manual aim sight or auto-lock on nearest segment)
      if (this.aimAngle !== null) {
        const tx = this.px + Math.cos(this.aimAngle) * 210;
        const ty = this.py + Math.sin(this.aimAngle) * 210;
        drawVectorReticle(ctx, this.px, this.py, tx, ty, this.runTime);
      } else if (nearest) {
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

    // 12.5 Wave-Clear Hanko Stamp & Boss Warning Tape
    if (this.clearStampT > 0) {
      const a = Math.min(1, this.clearStampT / 0.35);
      ctx.save();
      ctx.globalAlpha = a * 0.92;
      ctx.translate(CENTER, 88);
      ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
      ctx.fillRect(-118, -22, 236, 44);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(-118, -22, 236, 44);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`第${this.wave}波 決裁完了 // 報酬回収中`, 0, -4);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('ALL DROPS VACUUMED TO CORE', 0, 12);
      ctx.restore();
    }

    if (this.bossIntroT > 0) {
      const a = Math.min(1, this.bossIntroT / 0.35);
      ctx.save();
      ctx.globalAlpha = a * 0.95;
      ctx.fillStyle = 'rgba(69, 10, 10, 0.88)';
      ctx.fillRect(0, 56, W, 46);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 56);
      ctx.lineTo(W, 56);
      ctx.moveTo(0, 102);
      ctx.lineTo(W, 102);
      ctx.stroke();
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WARNING // EXECUTIVE THREAT DETECTED', CENTER, 71);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(this.bossIntroName, CENTER, 89);
      ctx.restore();
    }

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

export { UPGRADE_ORDER };
