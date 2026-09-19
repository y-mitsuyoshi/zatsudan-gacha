/**
 * 社畜スパイラルディフェンス — core engine.
 * Central core + business chains spiral inward. Wave-based with build phases.
 */

import {
  VIEW, CENTER, ARENA_R, MOVE_R, FINAL_WAVE,
  MAX_CHAINS, MAX_PROJECTILES, MAX_PARTICLES, MAX_DMG_NUMBERS, MAX_COINS,
  CHAINS, wavePlan, waveHpScale, waveDmgScale,
  DIFFICULTIES, UPGRADES, UPGRADE_ORDER,
  type ChainKind, type Difficulty, type UpgradeId,
} from './config';
import type { SpiralSound } from './audio';

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
}

interface Proj {
  x: number; y: number; vx: number; vy: number;
  dmg: number; radius: number; pierce: number; life: number;
  crit: boolean;
  hit: Set<Seg>;
}

interface CoinP { x: number; y: number; vx: number; vy: number; val: number }
interface BeamFx { x2: number; y2: number; t: number }
interface Ring { x: number; y: number; r: number; maxR: number; t: number; dur: number; color: string }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface DmgNum { x: number; y: number; val: number; life: number; crit: boolean }

interface SpawnReq { kind: ChainKind; at: number }

function rand(a: number, b: number): number { return a + Math.random() * (b - a); }
function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy;
}

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
  private hp = 120; private maxHp = 120;
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
  private coinPs: CoinP[] = [];
  private beams: BeamFx[] = [];
  private rings: Ring[] = [];
  private parts: Particle[] = [];
  private nums: DmgNum[] = [];
  private queue: SpawnReq[] = [];
  private hudT = 0;
  private shakeT = 0; private shakeMag = 0;
  /** hit-stop freeze timer (boss kills feel weighty) */
  private hitStopT = 0;
  private chainKills: Record<string, number> = {};

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
    this.meta = { dmgMul: opts.dmgMul, maxHpBonus: opts.maxHpBonus, rateMul: opts.rateMul };
    this.wave = 0; this.waveTime = 0; this.runTime = 0;
    this.score = 0; this.coins = 0;
    this.segsKilled = 0; this.chainsKilled = 0;
    this.px = CENTER; this.py = CENTER;
    this.moveX = 0; this.moveY = 0;
    this.maxHp = 120 + opts.maxHpBonus;
    this.hp = this.maxHp;
    this.iframes = 0; this.regen = 0;
    this.levels = { dmg: 0, rate: 0, multi: 0, pierce: 0, crit: 0, orb: 0, blast: 0, beam: 0, hp: 0, regen: 0 };
    this.fireCd = 0; this.blastCd = 0; this.beamCd = 0; this.orbAngle = 0;
    this.chains = []; this.projs = []; this.coinPs = [];
    this.beams = []; this.rings = []; this.parts = []; this.nums = [];
    this.queue = [];
    this.hitStopT = 0;
    this.chainKills = {};
    this.paused = false; this.over = false; this.endless = false;
    this.phase = 'build';
    this.last = performance.now();
    if (!this.running) {
      this.running = true;
      this.registerLoop();
    }
    this.emitBuild();
    this.emitHud();
    this.ev.onBanner('🌀 渦が迫る！', '強化を選んで出勤しよう');
  }

  private loop = (now: number, gen: number): void => {
    if (gen !== this.activeGen || this.destroyed) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (this.hitStopT > 0) {
      // hit-stop: render the impact frame, skip simulation
      this.hitStopT -= dt;
      this.render();
      this.raf = requestAnimationFrame((n) => this.loop(n, gen));
      return;
    }
    if (!this.paused && !this.over && this.phase === 'wave') this.update(dt);
    else if (!this.paused && !this.over && this.phase === 'build') this.updateBuildFx(dt);
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

  /** Re-register the rAF loop (stale loops exit via generation check). */
  resumeLoop(): void {
    if (this.destroyed) return;
    this.registerLoop();
  }

  destroy(): void {
    this.destroyed = true;
    this.activeGen += 1;
    cancelAnimationFrame(this.raf);
    this.running = false;
  }

  setPaused(p: boolean): void { this.paused = p; }
  setMove(x: number, y: number): void { this.moveX = x; this.moveY = y; }

  continueEndless(): void {
    if (!this.over) return;
    this.over = false;
    this.endless = true;
    this.hp = this.maxHp;
    this.phase = 'build';
    this.emitBuild();
    this.ev.onBanner('♾️ 残業突入！', '渦は終わらない…どこまで耐えられるか');
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
        ? { kind: 'bonus', id: `coins${picks.length}`, name: '臨時ボーナス', icon: '💰', desc: '残業代 +80', toLv: 0, isNew: false }
        : { kind: 'bonus', id: `heal${picks.length}`, name: '栄養ドリンク', icon: '🥤', desc: 'HPを全回復', toLv: 0, isNew: false });
    }
    return picks;
  }

  private currentChoices: UpgradeChoice[] = [];

  private emitBuild(): void {
    this.rerollLeft = 1;
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
    this.startWave();
  }

  rerollBuild(): void {
    if (this.phase !== 'build' || this.over || this.rerollLeft <= 0) return;
    this.rerollLeft -= 1;
    this.currentChoices = this.buildChoices();
    this.sound.upgrade();
    this.ev.onBuild({ wave: this.wave + 1, choices: this.currentChoices, canReroll: false });
  }

  /* ----- waves ----- */

  private startWave(): void {
    this.wave += 1;
    this.waveTime = 0;
    this.queue = [];
    const plan = wavePlan(this.wave);
    for (const item of plan) {
      const count = Math.max(1, Math.round(item.count * this.diff.countMul));
      for (let i = 0; i < count; i++) {
        this.queue.push({ kind: item.kind, at: item.delay + i * item.gap });
      }
    }
    this.queue.sort((a, b) => a.at - b.at);
    this.phase = 'wave';
    const bossItem = plan.find((p) => CHAINS[p.kind].boss);
    if (bossItem) {
      const def = CHAINS[bossItem.kind];
      this.ev.onBanner(`⚠️ ${def.icon} ${def.name} 出現！`, `${this.wave}の渦の主だ！頭を狙え！`);
      this.sound.boss();
      this.shake(0.4, 6);
    } else {
      this.ev.onBanner(`🌊 WAVE ${this.wave}`, '渦巻く業務列を迎撃せよ！');
    }
    this.emitHud();
  }

  private spawnChain(kind: ChainKind): void {
    if (this.chains.length >= MAX_CHAINS) return;
    const def = CHAINS[kind];
    const hs = waveHpScale(this.wave, this.endless) * this.diff.hpMul;
    const ds = waveDmgScale(this.wave) * this.diff.dmgMul;
    const theta = rand(0, Math.PI * 2);
    const segs: Seg[] = [];
    for (let i = 0; i < def.segs; i++) {
      // heads are tanks: sniping them is strong but takes focus fire
      const hp = def.segHp * hs * (i === 0 ? 3.5 : 1);
      segs.push({ x: 0, y: 0, hp, maxHp: hp, radius: def.segRadius, hitCd: 0, orbCd: 0 });
    }
    const chain: Chain = {
      kind, icon: def.icon, color: def.color, segs,
      r: ARENA_R + 70, theta, dir: Math.random() < 0.5 ? 1 : -1,
      shrink: def.shrink * rand(0.9, 1.1), angular: def.angular * rand(0.9, 1.1),
      wobble: rand(0, Math.PI * 2),
      contact: def.contact * ds, score: def.score, coins: def.coins,
      segRadius: def.segRadius, boss: def.boss, name: def.name,
    };
    // lay out body along the outward spiral
    for (let i = 0; i < segs.length; i++) {
      const rr = chain.r + i * def.segRadius * 1.7;
      segs[i].x = CENTER + Math.cos(theta - chain.dir * i * 0.12) * rr;
      segs[i].y = CENTER + Math.sin(theta - chain.dir * i * 0.12) * rr;
    }
    this.chains.push(chain);
  }

  /* ----- update ----- */

  private update(dt: number): void {
    this.waveTime += dt;
    this.runTime += dt;

    // player movement (clamped circle around center)
    const tx = CENTER + this.moveX * MOVE_R;
    const ty = CENTER + this.moveY * MOVE_R;
    const dx = tx - this.px; const dy = ty - this.py;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      const sp = Math.min(d / dt, 320);
      this.px += (dx / d) * sp * dt;
      this.py += (dy / d) * sp * dt;
    }
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
    this.updateCoins(dt);
    this.updateFx(dt);

    // wave clear
    if (this.queue.length === 0 && this.chains.length === 0) {
      const bonus = 10 + this.wave * 2;
      this.coins += bonus;
      this.score += Math.round(200 * this.wave * this.diff.scoreMul);
      this.sound.waveClear();
      if (!this.endless && this.wave >= FINAL_WAVE) {
        this.finishRun(true);
        return;
      }
      this.phase = 'build';
      this.ev.onBanner(`✅ WAVE ${this.wave} 制圧！`, `報酬 🪙${bonus} — 次の強化を選べ`);
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
      c.wobble += dt * 2;
      c.r = Math.max(26, c.r - c.shrink * dt);
      c.theta += c.angular * c.dir * dt;
      const rEff = c.r + Math.sin(c.wobble) * 12;
      const sx = CENTER + Math.cos(c.theta) * rEff;
      const sy = CENTER + Math.sin(c.theta) * rEff;
      // gentle homing toward player (12%)
      const head = c.segs[0];
      if (!head) { this.chains.splice(ci, 1); continue; }
      head.x = sx * 0.88 + this.px * 0.12;
      head.y = sy * 0.88 + this.py * 0.12;
      if (head.hitCd > 0) head.hitCd -= dt;
      if (head.orbCd > 0) head.orbCd -= dt;
      // body follow
      const spacing = c.segRadius * 1.7;
      for (let i = 1; i < c.segs.length; i++) {
        const s = c.segs[i];
        const prev = c.segs[i - 1];
        if (s.hitCd > 0) s.hitCd -= dt;
        if (s.orbCd > 0) s.orbCd -= dt;
        const fdx = prev.x - s.x; const fdy = prev.y - s.y;
        const fd = Math.hypot(fdx, fdy);
        if (fd > spacing) {
          const stepLen = Math.min(fd - spacing, 300 * dt);
          s.x += (fdx / fd) * stepLen;
          s.y += (fdy / fd) * stepLen;
        }
      }
      // contact with player
      const pr = 15;
      for (const s of c.segs) {
        if (s.hitCd > 0 || this.iframes > 0) continue;
        const rr = s.radius + pr;
        if (dist2(s.x, s.y, this.px, this.py) < rr * rr) {
          s.hitCd = 1.0;
          this.iframes = 0.8;
          this.hp -= Math.max(1, Math.round(c.contact));
          // knock the player away so grinds are escapable
          const pdx = this.px - s.x; const pdy = this.py - s.y;
          const pd = Math.max(1, Math.hypot(pdx, pdy));
          const nx = this.px + (pdx / pd) * 70;
          const ny = this.py + (pdy / pd) * 70;
          const nd = Math.hypot(nx - CENTER, ny - CENTER);
          if (nd > MOVE_R) {
            this.px = CENTER + ((nx - CENTER) / nd) * MOVE_R;
            this.py = CENTER + ((ny - CENTER) / nd) * MOVE_R;
          } else {
            this.px = nx;
            this.py = ny;
          }
          this.sound.hurt();
          this.burst(this.px, this.py, '#ef4444', 10, 200);
          this.shake(0.25, 5);
          if (this.hp <= 0) this.hp = 0;
          break;
        }
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
    // main shots
    this.fireCd -= dt;
    if (this.fireCd <= 0) {
      const tgt = this.nearestSeg(430);
      if (!tgt) {
        this.fireCd = 0.1;
      } else {
        this.fireCd = this.interval();
        const n = this.shotCount();
        const base = Math.atan2(tgt.seg.y - this.py, tgt.seg.x - this.px);
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

  private damageSeg(c: Chain, ci: number, si: number, dmg: number, knock: number, fromX: number, fromY: number, crit: boolean): void {
    if (this.chains[ci] !== c) return;
    const s = c.segs[si];
    if (!s || s.hp <= 0) return;
    s.hp -= dmg;
    if (this.nums.length < MAX_DMG_NUMBERS) {
      this.nums.push({ x: s.x + rand(-6, 6), y: s.y - s.radius - 2, val: Math.round(dmg), life: 0.55, crit });
    }
    this.sound.hit();
    // knock the whole chain slightly
    const d = Math.max(1, Math.hypot(s.x - fromX, s.y - fromY));
    const push = Math.min(26, knock * 0.06);
    for (const seg of c.segs) {
      seg.x += ((s.x - fromX) / d) * push;
      seg.y += ((s.y - fromY) / d) * push;
    }
    if (s.hp <= 0) this.killSeg(c, ci, si);
  }

  private killSeg(c: Chain, ci: number, si: number): void {
    if (this.chains[ci] !== c) return;
    const isHead = si === 0;
    const mult = (1 + this.wave * 0.05) * this.diff.scoreMul;
    if (isHead) {
      // head down: whole chain collapses (leftovers pay half score)
      for (const s of c.segs) {
        this.burst(s.x, s.y, c.color, 4, 150);
        this.score += Math.round(c.score * mult * 0.5);
        this.segsKilled += 1;
      }
      this.chains.splice(ci, 1);
      this.chainsKilled += 1;
      this.chainKills[c.kind] = (this.chainKills[c.kind] ?? 0) + 1;
      this.sound.segDown();
      this.burst(c.segs[0]?.x ?? this.px, c.segs[0]?.y ?? this.py, '#fde047', 16, 260);
      // head always drops coins
      const n = c.boss ? 3 : 1;
      for (let i = 0; i < n; i++) this.dropCoin(c.segs[0]?.x ?? CENTER, c.segs[0]?.y ?? CENTER, c.coins);
      if (c.boss) {
        this.coins += 50;
        this.hitStopT = 0.14;
        this.ev.onBanner('🎁 大物撃破！', `+🪙50 — ${c.name}を切り崩した！`);
      }
      this.shake(0.25, c.boss ? 8 : 4);
    } else {
      const s = c.segs[si];
      if (!s) return;
      this.burst(s.x, s.y, c.color, 5, 150);
      this.score += Math.round(c.score * mult);
      this.segsKilled += 1;
      this.sound.segDown();
      c.segs.splice(si, 1);
      if (Math.random() < 0.18) this.dropCoin(s.x, s.y, c.coins);
      if (Math.random() < 0.012) {
        this.coinPs.push({ x: s.x, y: s.y, vx: 0, vy: 0, val: -20 });
      }
    }
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
          this.ev.onBanner('🍱 差し入れ！', 'HPが20回復した');
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
      n.y -= 44 * dt;
      if (n.life <= 0) this.nums.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].t -= dt;
      if (this.beams[i].t <= 0) this.beams.splice(i, 1);
    }
    if (this.shakeT > 0) this.shakeT -= dt;
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
        bossName = `${c.icon} ${c.name}`;
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
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.save();
    ctx.scale(dpr, dpr);
    const W = VIEW;

    let sx = 0; let sy = 0;
    if (this.shakeT > 0) {
      sx = rand(-this.shakeMag, this.shakeMag);
      sy = rand(-this.shakeMag, this.shakeMag);
    }
    ctx.translate(sx, sy);

    // bg
    const g0 = ctx.createRadialGradient(CENTER, CENTER, 40, CENTER, CENTER, ARENA_R + 60);
    g0.addColorStop(0, '#1a1440');
    g0.addColorStop(1, '#0a0e1f');
    ctx.fillStyle = g0;
    ctx.fillRect(-20, -20, W + 40, W + 40);

    // spiral guides
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let r = 60; r <= ARENA_R; r += 60) {
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // move range
    ctx.strokeStyle = 'rgba(253,224,71,0.25)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, MOVE_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // coins / bentos
    ctx.textAlign = 'center';
    for (const c of this.coinPs) {
      if (c.val < 0) {
        ctx.font = '20px sans-serif';
        ctx.fillText('🍱', c.x, c.y + 7);
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // rings
    for (const r of this.rings) {
      const k = r.t / r.dur;
      ctx.strokeStyle = `rgba(${r.color},${1 - k})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // beams
    for (const b of this.beams) {
      ctx.strokeStyle = `rgba(253,224,71,${Math.max(0, b.t / 0.4)})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(this.px, this.py);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.px, this.py);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }

    // chains (tail first so head draws on top)
    for (const c of this.chains) {
      for (let i = c.segs.length - 1; i >= 0; i--) {
        const s = c.segs[i];
        const isHead = i === 0;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + s.radius * 0.7, s.radius * 0.75, s.radius * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isHead ? c.color : this.shade(c.color);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
        if (c.boss && isHead) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (isHead) {
          ctx.font = `${Math.round(s.radius * 1.3)}px sans-serif`;
          ctx.fillText(c.icon, s.x, s.y + s.radius * 0.45);
        } else {
          // HP number like the ads
          ctx.font = `bold ${Math.max(9, Math.round(s.radius * 0.75))}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(String(Math.max(0, Math.ceil(s.hp))), s.x, s.y + s.radius * 0.3);
        }
      }
    }

    // projectiles
    for (const p of this.projs) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = p.crit ? '#fde047' : '#e2e8f0';
      ctx.fillRect(-8, -4, 16, 8);
      ctx.restore();
    }

    // orbitals
    const orbN = this.orbN();
    if (orbN > 0 && this.hp > 0) {
      ctx.font = '20px sans-serif';
      for (let i = 0; i < orbN; i++) {
        const a = this.orbAngle + (i * Math.PI * 2) / orbN;
        ctx.fillText('🗒️', this.px + Math.cos(a) * this.orbR(), this.py + Math.sin(a) * this.orbR() + 7);
      }
    }

    // player core
    if (this.hp > 0) {
      const blink = this.iframes > 0 && Math.floor(this.runTime * 14) % 2 === 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(this.px, this.py + 14, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!blink) {
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.arc(this.px, this.py, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.px, this.py, 19, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '26px sans-serif';
        ctx.fillText('🧑‍💼', this.px, this.py + 9);
      }
    } else if (this.phase === 'over') {
      ctx.font = '40px sans-serif';
      ctx.fillText('💀', this.px, this.py + 14);
    }

    // particles
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // damage numbers
    for (const n of this.nums) {
      const a = Math.min(1, n.life / 0.35);
      ctx.globalAlpha = a;
      ctx.font = n.crit ? 'bold 15px sans-serif' : 'bold 12px sans-serif';
      ctx.fillStyle = n.crit ? '#fde047' : '#ffffff';
      ctx.fillText(String(n.val), n.x, n.y);
    }
    ctx.globalAlpha = 1;

    // low hp vignette
    const frac = this.hp / this.maxHp;
    if (frac < 0.35 && this.hp > 0) {
      const pulse = 0.25 + 0.15 * Math.sin(this.runTime * 6);
      const vg = ctx.createRadialGradient(CENTER, CENTER, 180, CENTER, CENTER, 420);
      vg.addColorStop(0, 'rgba(239,68,68,0)');
      vg.addColorStop(1, `rgba(239,68,68,${pulse})`);
      ctx.fillStyle = vg;
      ctx.fillRect(-20, -20, W + 40, W + 40);
    }

    ctx.restore();
  }

  private shade(hex: string): string {
    // darken body segments relative to head color (expects #rrggbb)
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * 0.72)));
    const r = f((n >> 16) & 255);
    const gg = f((n >> 8) & 255);
    const b = f(n & 255);
    return `rgb(${r},${gg},${b})`;
  }
}

export { UPGRADE_ORDER };
