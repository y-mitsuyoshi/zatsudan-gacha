import { STAGES, VIEW_W, VIEW_H, type EnemyId, type WeaponId, titleForStage } from './config';
import { shmupSound } from './audio';
import { buildSprites, buildBackground, type SpriteSet } from './sprites';
import { saveContinue, clearContinue } from './storage';

export interface HudSnapshot {
  score: number;
  combo: number;
  maxCombo: number;
  stage: number;
  hp: number;
  maxHp: number;
  bombs: number;
  weapon: WeaponId;
  weaponLevel: number;
  bossActive: boolean;
  bossHp: number;
  bossMax: number;
  bossName: string;
  kills: number;
  graze: number;
  fps: number;
  pb: number;
  eb: number;
}

export interface RunResult {
  score: number;
  stage: number;
  maxCombo: number;
  kills: number;
  graze: number;
  timeMs: number;
  cleared: boolean;
  rank: string;
}

export type EngineEvent =
  | { type: 'hud'; hud: HudSnapshot }
  | { type: 'banner'; title: string; sub?: string }
  | { type: 'gameover'; result: RunResult }
  | { type: 'error'; message: string }
  | { type: 'autopause' };

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  weapon: WeaponId;
  weaponLevel: number;
  stage: number;
  score: number;
  muted: boolean;
  shake: boolean;
  onEvent: (e: EngineEvent) => void;
}

interface PBullet { alive: boolean; x: number; y: number; vx: number; vy: number; dmg: number; kind: number; retarget: number; }
interface EBullet { alive: boolean; x: number; y: number; vx: number; vy: number; big: boolean; grazed: boolean; }
interface Enemy {
  alive: boolean; kind: EnemyId; x: number; y: number; x0: number; hp: number; maxHp: number;
  t: number; fireT: number; tele: number; speed: number; score: number; r: number;
}
interface Particle { alive: boolean; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; }
interface FloatText { alive: boolean; x: number; y: number; life: number; text: string; color: string; }
interface Item { alive: boolean; x: number; y: number; vy: number; kind: 'score' | 'power' | 'heal' | 'bomb' | 'weapon'; t: number; }

interface Boss {
  alive: boolean; idx: number; x: number; y: number; hp: number; maxHp: number;
  t: number; atkT: number; tele: number; pending: number; angle: number;
  burst: number; burstT: number; summonT: number; flash: number; entered: boolean;
}

const ENEMY_DEFS: Record<EnemyId, { hp: number; speed: number; score: number; r: number; elite: boolean }> = {
  commuter: { hp: 2, speed: 95, score: 100, r: 15, elite: false },
  mail: { hp: 4, speed: 80, score: 200, r: 14, elite: false },
  phone: { hp: 9, speed: 70, score: 300, r: 15, elite: true },
  manager: { hp: 14, speed: 85, score: 500, r: 16, elite: true },
  bug: { hp: 8, speed: 65, score: 400, r: 15, elite: true },
  black: { hp: 24, speed: 95, score: 1000, r: 17, elite: true },
};

const MAX_PB = 128;
const MAX_EB = 160;
const MAX_EN = 48;
const MAX_PT = 220;
const MAX_TX = 24;
const MAX_IT = 24;
const STEP = 1 / 60;

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export class ShmupEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onEvent: (e: EngineEvent) => void;
  private sound = shmupSound;
  private sprites: SpriteSet | null = null;
  private bg: HTMLCanvasElement | null = null;

  private raf = 0;
  private last = 0;
  private destroyed = false;
  private paused = false;
  private startedAt = 0;

  private keys = new Set<string>();
  private dragging = false;
  private dragX = 0;
  private dragY = 0;
  private focus = false;

  // run state
  private phase: 'fly' | 'warn' | 'boss' | 'interval' | 'over' = 'fly';
  private stage: number;
  private loop = 0;
  private stageIdx = 0;
  private score: number;
  private combo = 0;
  private comboT = 0;
  private maxCombo = 0;
  private kills = 0;
  private grazeCount = 0;
  private cleared6 = false;

  // player
  private px = VIEW_W / 2;
  private py = VIEW_H - 120;
  private hp = 100;
  private maxHp = 100;
  private bombs = 2;
  private weapon: WeaponId;
  private weaponLevel: number;
  private fireT = 0;
  private invuln = 0;
  private deadT = 0;
  private dying = false;
  private trailT = 0;

  // fx
  private trauma = 0;
  private hitstop = 0;
  private flashA = 0;
  private flashColor = '#ffffff';
  private scroll = 0;
  private hudT = 0;
  private fps = 60;
  private acc = 0;
  private errorReported = false;
  private bgGrad: CanvasGradient | null = null;
  private bgGradH = 0;
  private shakeEnabled: boolean;
  private time = 0;

  private stageT = 0;
  private spawnT = 1;
  private warnT = 0;
  private intervalT = 0;

  private pbullets: PBullet[] = [];
  private ebullets: EBullet[] = [];
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private items: Item[] = [];
  private boss: Boss = {
    alive: false, idx: 0, x: VIEW_W / 2, y: -80, hp: 1, maxHp: 1,
    t: 0, atkT: 2, tele: 0, pending: 0, angle: 0, burst: 0, burstT: 0, summonT: 6, flash: 0, entered: false,
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    this.keys.add(e.code);
    if (e.code === 'KeyX' || e.code === 'KeyK') this.useBomb();
    if (e.code === 'KeyC') this.cycleWeapon();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onVis = () => {
    if (document.hidden && !this.paused && !this.destroyed && this.phase !== 'over') {
      this.setPaused(true);
      this.onEvent({ type: 'autopause' });
    }
  };
  private onPointerDown = (e: PointerEvent) => {
    this.sound.unlock();
    const p = this.toLogical(e.clientX, e.clientY);
    if (!p) return;
    this.dragging = true;
    this.dragX = p.x;
    this.dragY = p.y;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch { /* ignore */ }
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const p = this.toLogical(e.clientX, e.clientY);
    if (!p) return;
    const dx = (p.x - this.dragX) * 1.3;
    const dy = (p.y - this.dragY) * 1.3;
    this.px = Math.min(VIEW_W - 18, Math.max(18, this.px + dx));
    this.py = Math.min(VIEW_H - 24, Math.max(70, this.py + dy));
    this.dragX = p.x;
    this.dragY = p.y;
  };
  private onPointerUp = () => {
    this.dragging = false;
  };

  constructor(opts: EngineOptions) {
    this.canvas = opts.canvas;
    const ctx = opts.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.onEvent = opts.onEvent;
    this.weapon = opts.weapon;
    this.weaponLevel = Math.min(5, Math.max(1, opts.weaponLevel));
    this.stage = Math.max(1, opts.stage);
    this.score = Math.max(0, opts.score);
    this.shakeEnabled = opts.shake;
    this.sound.setMuted(opts.muted);

    for (let i = 0; i < MAX_PB; i++) this.pbullets.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, dmg: 1, kind: 0, retarget: 0 });
    for (let i = 0; i < MAX_EB; i++) this.ebullets.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, big: false, grazed: false });
    for (let i = 0; i < MAX_EN; i++) this.enemies.push({ alive: false, kind: 'commuter', x: 0, y: 0, x0: 0, hp: 1, maxHp: 1, t: 0, fireT: 0, tele: 0, speed: 90, score: 100, r: 15 });
    for (let i = 0; i < MAX_PT; i++) this.particles.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff' });
    for (let i = 0; i < MAX_TX; i++) this.texts.push({ alive: false, x: 0, y: 0, life: 0, text: '', color: '#fff' });
    for (let i = 0; i < MAX_IT; i++) this.items.push({ alive: false, x: 0, y: 0, vy: 0, kind: 'score', t: 0 });

    this.loop = Math.floor((this.stage - 1) / 6);
    this.stageIdx = (this.stage - 1) % 6;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('visibilitychange', this.onVis);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  start(): void {
    this.sprites = buildSprites();
    try {
      (window as unknown as { __shmup?: ShmupEngine }).__shmup = this;
    } catch {
      /* ignore */
    }    this.bg = buildBackground(this.stageIdx, VIEW_W, VIEW_H);
    this.startedAt = performance.now();
    const st = STAGES[this.stageIdx];
    this.sound.unlock();
    this.sound.startBgm(110 + this.stageIdx * 8);
    this.onEvent({ type: 'banner', title: `Stage ${this.stage}`, sub: st ? `${st.name} — ${st.sub}` : '' });
    this.pushHud();
    this.last = performance.now();
    this.acc = 0;
    const frame = (now: number) => {
      if (this.destroyed) return;
      this.raf = requestAnimationFrame(frame);
      try {
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (!(dt > 0)) return;
        if (dt > 0.25) dt = 0.25;
        this.fps = this.fps * 0.95 + (1 / dt) * 0.05;
        if (!this.paused) {
          // fixed-timestep simulation: game speed stays correct on any device
          this.acc += dt;
          let n = 0;
          while (this.acc >= STEP && n < 4) {
            this.step(STEP);
            this.acc -= STEP;
            n++;
          }
          if (n === 4) this.acc = 0;
        }
        this.render();
      } catch (err) {
        if (!this.errorReported) {
          this.errorReported = true;
          this.paused = true;
          this.sound.stopBgm();
          this.onEvent({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('visibilitychange', this.onVis);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.sound.stopBgm();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  setPaused(p: boolean): void {
    if (this.phase === 'over') return;
    if (this.paused === p) return;
    this.paused = p;
    if (p) {
      this.sound.stopBgm();
      this.sound.suspend();
    } else {
      this.sound.resume();
      this.sound.startBgm(110 + this.stageIdx * 8);
      this.last = performance.now();
    }
  }

  setMuted(m: boolean): void {
    this.sound.setMuted(m);
    if (!m && !this.paused) this.sound.startBgm(110 + this.stageIdx * 8);
  }

  setShake(on: boolean): void {
    this.shakeEnabled = on;
  }

  /** Live diagnostics (used by automated checks and the on-screen debug line). */
  getStats(): {
    pb: number; eb: number; en: number; items: number; particles: number;
    phase: string; score: number; fireT: number; weapon: WeaponId;
    hasSprites: boolean; fps: number; px: number; py: number;
  } {
    let pb = 0;
    let eb = 0;
    let en = 0;
    let items = 0;
    let particles = 0;
    for (const b of this.pbullets) if (b.alive) pb++;
    for (const b of this.ebullets) if (b.alive) eb++;
    for (const e of this.enemies) if (e.alive) en++;
    for (const i of this.items) if (i.alive) items++;
    for (const p of this.particles) if (p.alive) particles++;
    return {
      pb, eb, en, items, particles,
      phase: this.phase, score: this.score,
      fireT: Math.round(this.fireT * 1000) / 1000, weapon: this.weapon,
      hasSprites: !!this.sprites, fps: Math.round(this.fps * 10) / 10,
      px: Math.round(this.px), py: Math.round(this.py),
    };
  }

  useBomb(): void {
    if (this.paused || this.destroyed || this.dying || this.phase === 'over') return;
    if (this.bombs <= 0) return;
    this.bombs--;
    this.invuln = Math.max(this.invuln, 2);
    // convert enemy bullets to score sparks (single scoring path)
    let cleared = 0;
    for (const b of this.ebullets) {
      if (!b.alive) continue;
      b.alive = false;
      cleared++;
      this.burst(b.x, b.y, 2, '#7fe7ff', 120);
    }
    if (cleared > 0) this.addScore(cleared * 30);
    for (const e of this.enemies) {
      if (e.alive) this.damageEnemy(e, 80, false);
    }
    if (this.boss.alive) this.damageBoss(150);
    this.flashA = 0.55;
    this.flashColor = '#ffffff';
    this.trauma = Math.min(1, this.trauma + 0.6);
    this.sound.bomb();
    this.pushHud();
  }

  cycleWeapon(): void {
    if (this.paused || this.dying) return;
    this.weapon = this.weapon === 'rensa' ? 'kakusan' : this.weapon === 'kakusan' ? 'tsuibi' : 'rensa';
    this.sound.power();
    this.addText(this.px, this.py - 40, this.weapon === 'rensa' ? '連射！' : this.weapon === 'kakusan' ? '拡散！' : '追尾！', '#7fe7ff');
    this.pushHud();
  }

  // ---------- core ----------

  private toLogical(cx: number, cy: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const s = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
    const ox = (rect.width - VIEW_W * s) / 2;
    const oy = (rect.height - VIEW_H * s) / 2;
    return { x: (cx - rect.left - ox) / s, y: (cy - rect.top - oy) / s };
  }

  private step(dt: number): void {
    this.time += dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.updateParticles(dt * 0.15);
      return;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.flashA = Math.max(0, this.flashA - dt * 2.2);
    this.invuln = Math.max(0, this.invuln - dt);
    this.scroll += dt * (60 + this.stageIdx * 8);

    if (this.dying) {
      this.deadT -= dt;
      this.updateParticles(dt);
      this.updateTexts(dt);
      if (this.deadT <= 0 && this.phase !== 'over') {
        this.phase = 'over';
        clearContinue();
        this.sound.stopBgm();
        this.onEvent({ type: 'gameover', result: this.buildResult() });
      }
      return;
    }

    // combo decay
    if (this.combo > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        this.combo = 0;
      }
    }

    this.updateStage(dt);
    this.updatePlayer(dt);
    this.updatePBullets(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateEBullets(dt);
    this.updateItems(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.collide();

    this.hudT += dt;
    if (this.hudT >= 0.1) {
      this.hudT = 0;
      this.pushHud();
    }
  }

  private updateStage(dt: number): void {
    if (this.phase === 'fly') {
      this.stageT += dt;
      this.spawnT -= dt;
      const st = STAGES[this.stageIdx];
      const interval = Math.max(0.4, 1.05 - this.stage * 0.05) / (1 + this.loop * 0.2);
      const cap = Math.min(20, 9 + this.stage);
      if (this.spawnT <= 0 && st) {
        this.spawnT = interval;
        let alive = 0;
        for (const e of this.enemies) if (e.alive) alive++;
        if (alive < cap) this.spawnEnemy(st.enemies);
      }
      const duration = st ? st.duration : 36;
      if (this.stageT >= duration) {
        // sweep remaining mobs into score, then warn
        for (const e of this.enemies) {
          if (!e.alive) continue;
          e.alive = false;
          this.addScore(Math.floor(e.score / 2));
          this.burst(e.x, e.y, 8, '#ffe14d', 160);
        }
        for (const b of this.ebullets) b.alive = false;
        this.phase = 'warn';
        this.warnT = 2.3;
        const bossName = st ? st.boss : '???';
        this.onEvent({ type: 'banner', title: '⚠ WARNING ⚠', sub: `${bossName} 接近中！` });
        this.sound.warn();
      }
    } else if (this.phase === 'warn') {
      this.warnT -= dt;
      if (this.warnT <= 0) {
        this.spawnBoss();
        this.phase = 'boss';
      }
    } else if (this.phase === 'interval') {
      this.intervalT -= dt;
      if (this.intervalT <= 0) {
        this.nextStage();
      }
    }
  }

  private nextStage(): void {
    this.stage++;
    this.loop = Math.floor((this.stage - 1) / 6);
    this.stageIdx = (this.stage - 1) % 6;
    this.stageT = 0;
    this.spawnT = 1;
    this.phase = 'fly';
    this.bg = buildBackground(this.stageIdx, VIEW_W, VIEW_H);
    const st = STAGES[this.stageIdx];
    this.sound.startBgm(110 + this.stageIdx * 8);
    if (this.stage === 7) {
      this.onEvent({ type: 'banner', title: '全制覇！無限残業ループ突入', sub: 'ここからが本当の社畜道…' });
    } else {
      this.onEvent({ type: 'banner', title: `Stage ${this.stage} — 昇進: ${titleForStage(this.stage)}`, sub: st ? `${st.name} — ${st.sub}` : '' });
    }
    this.pushHud();
  }

  private spawnEnemy(pool: EnemyId[]): void {
    const slot = this.enemies.find((e) => !e.alive);
    if (!slot) return;
    const len = Math.max(1, pool.length);
    const pick = pool[Math.min(len - 1, Math.floor(Math.pow(Math.random(), 0.7) * len))] ?? 'commuter';
    const def = ENEMY_DEFS[pick];
    const mult = (1 + (this.stage - 1) * 0.22) * (1 + this.loop * 0.45);
    slot.alive = true;
    slot.kind = pick;
    slot.x0 = 30 + Math.random() * (VIEW_W - 60);
    slot.x = slot.x0;
    slot.y = -30;
    slot.t = 0;
    slot.hp = slot.maxHp = Math.max(1, Math.round(def.hp * mult * 0.55));
    slot.speed = def.speed * Math.min(1.35, 1 + this.stage * 0.02);
    slot.score = Math.round(def.score * (1 + this.loop * 0.5));
    slot.r = def.r;
    slot.fireT = 1.2 + Math.random() * 1.6;
    slot.tele = 0;
  }

  private spawnBoss(): void {
    const b = this.boss;
    b.alive = true;
    b.entered = false;
    b.idx = this.stageIdx;
    b.x = VIEW_W / 2;
    b.y = -80;
    b.t = 0;
    b.atkT = 2.2;
    b.tele = 0;
    b.pending = 0;
    b.angle = Math.random() * Math.PI * 2;
    b.burst = 0;
    b.summonT = 7;
    b.flash = 0;
    const base = 90 + this.stage * 26;
    b.maxHp = b.hp = Math.round(base * (1 + this.loop * 0.8));
    this.pushHud();
  }

  private updatePlayer(dt: number): void {
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) vx -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) vx += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) vy -= 1;
    if (k.has('ArrowDown') || k.has('KeyS')) vy += 1;
    this.focus = k.has('ShiftLeft') || k.has('ShiftRight');
    const speed = this.focus ? 165 : 335;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      this.px = Math.min(VIEW_W - 18, Math.max(18, this.px + (vx / len) * speed * dt));
      this.py = Math.min(VIEW_H - 24, Math.max(70, this.py + (vy / len) * speed * dt));
    }
    // engine trail
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.06;
      this.spawnParticle(this.px + (Math.random() - 0.5) * 8, this.py + 22, 0, 120, 0.3, 3, '#5eb1ff');
    }
    // fire (auto-fire is always on for fun-first play)
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireWeapon();
    }
  }

  private fireWeapon(): void {
    const lvl = this.weaponLevel;
    if (this.weapon === 'rensa') {
      const cd = Math.max(0.085, 0.15 - lvl * 0.012);
      this.fireT = cd;
      const dmg = 1 + (lvl - 1) * 0.22;
      const streams: Array<[number, number]> = [[0, 0]];
      if (lvl >= 2) streams.push([-12, 0], [12, 0]);
      if (lvl >= 4) streams.push([-22, -0.12], [22, 0.12]);
      for (const [ox, ang] of streams) {
        const s = this.allocPB();
        if (!s) break;
        s.alive = true;
        s.x = this.px + ox;
        s.y = this.py - 24;
        s.vx = Math.sin(ang) * 660;
        s.vy = -Math.cos(ang) * 660;
        s.dmg = dmg;
        s.kind = 0;
      }
    } else if (this.weapon === 'kakusan') {
      this.fireT = 0.24;
      const dmg = 0.85 + (lvl - 1) * 0.16;
      const angs = lvl >= 3 ? [-0.34, -0.17, 0, 0.17, 0.34] : [-0.22, 0, 0.22];
      for (const a of angs) {
        const s = this.allocPB();
        if (!s) break;
        s.alive = true;
        s.x = this.px;
        s.y = this.py - 24;
        s.vx = Math.sin(a) * 580;
        s.vy = -Math.cos(a) * 580;
        s.dmg = dmg;
        s.kind = 1;
      }
    } else {
      this.fireT = 0.3;
      const n = 1 + Math.floor(lvl / 2);
      for (let i = 0; i < n; i++) {
        const s = this.allocPB();
        if (!s) break;
        s.alive = true;
        s.x = this.px + (i - (n - 1) / 2) * 16;
        s.y = this.py - 20;
        s.vx = (i - (n - 1) / 2) * 40;
        s.vy = -470;
        s.dmg = 1.25 + (lvl - 1) * 0.18;
        s.kind = 2;
        s.retarget = 0;
      }
    }
    // muzzle flash: two white sparks so every shot reads clearly
    this.spawnParticle(this.px - 4, this.py - 26, -40, -220, 0.1, 3, '#ffffff');
    this.spawnParticle(this.px + 4, this.py - 26, 40, -220, 0.1, 3, '#ffffff');
    this.sound.shoot();
  }

  private allocPB(): PBullet | null {
    return this.pbullets.find((b) => !b.alive) ?? null;
  }

  private allocEB(): EBullet | null {
    let alive = 0;
    for (const b of this.ebullets) if (b.alive) alive++;
    if (alive >= MAX_EB) return null;
    return this.ebullets.find((b) => !b.alive) ?? null;
  }

  private fireEB(x: number, y: number, vx: number, vy: number, big: boolean): void {
    const b = this.allocEB();
    if (!b) return;
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.big = big;
    b.grazed = false;
  }

  private aimAt(x: number, y: number, speed: number): [number, number] {
    const dx = this.px - x;
    const dy = this.py - y;
    const len = Math.hypot(dx, dy) || 1;
    return [(dx / len) * speed, (dy / len) * speed];
  }

  private updatePBullets(dt: number): void {
    for (const b of this.pbullets) {
      if (!b.alive) continue;
      if (b.kind === 2) {
        // homing: retarget on interval (not every frame)
        b.retarget -= dt;
        if (b.retarget <= 0) {
          b.retarget = 0.14;
          let best: { x: number; y: number } | null = null;
          let bestD = 460 * 460;
          for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = dist2(b.x, b.y, e.x, e.y);
            if (d < bestD) {
              bestD = d;
              best = e;
            }
          }
          if (this.boss.alive) {
            const d = dist2(b.x, b.y, this.boss.x, this.boss.y);
            if (d < bestD) best = this.boss;
          }
          if (best) {
            const want = Math.atan2(best.y - b.y, best.x - b.x);
            const cur = Math.atan2(b.vy, b.vx);
            let diff = want - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = Math.max(-5.5 * dt * 7, Math.min(5.5 * dt * 7, diff));
            const sp = Math.min(520, Math.hypot(b.vx, b.vy) + 500 * dt);
            const na = cur + turn;
            b.vx = Math.cos(na) * sp;
            b.vy = Math.sin(na) * sp;
          }
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -30 || b.y > VIEW_H + 30 || b.x < -30 || b.x > VIEW_W + 30) b.alive = false;
    }
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t += dt;
      const sp = e.speed;
      switch (e.kind) {
        case 'commuter':
          e.y += sp * dt;
          e.x = e.x0 + Math.sin(e.t * 3) * 22;
          break;
        case 'mail':
          e.y += sp * 0.85 * dt;
          e.x = e.x0 + Math.sin(e.t * 3.6) * 62;
          break;
        case 'phone':
          if (e.y < 170) e.y += sp * dt;
          else e.y += Math.sin(e.t * 2) * 20 * dt;
          e.x = e.x0 + Math.cos(e.t * 4.4) * 72;
          break;
        case 'manager':
          e.y += sp * dt;
          if (this.px > e.x) e.x += 55 * dt;
          else e.x -= 55 * dt;
          break;
        case 'bug':
          if (e.y < 150 + (e.x0 % 90)) e.y += sp * dt;
          else {
            e.y += Math.sin(e.t * 1.8) * 24 * dt;
            e.x = e.x0 + Math.sin(e.t * 1.4) * 70;
          }
          break;
        case 'black':
          e.y += (e.t % 2 < 1.2 ? sp * 0.5 : sp * 1.9) * dt;
          e.x = e.x0 + Math.sin(e.t * 2.6) * 88;
          break;
      }
      e.x = Math.min(VIEW_W - 14, Math.max(14, e.x));
      if (e.y > VIEW_H + 40) {
        e.alive = false;
        continue;
      }
      // shooting with telegraph for elites
      if (e.y < 10 || e.y > VIEW_H * 0.6) continue;
      const def = ENEMY_DEFS[e.kind];
      if (e.tele > 0) {
        e.tele -= dt;
        if (e.tele <= 0) {
          this.enemyFire(e);
          e.fireT = 2 + Math.random() * 1.6 - Math.min(0.8, this.stage * 0.05);
        }
        continue;
      }
      e.fireT -= dt;
      if (e.fireT <= 0) {
        if (def.elite) {
          e.tele = 0.45;
        } else {
          this.enemyFire(e);
          e.fireT = 2.2 + Math.random() * 1.6;
        }
      }
    }
  }

  private enemyFire(e: Enemy): void {
    const bs = Math.min(250, 150 + this.stage * 8 + this.loop * 14);
    switch (e.kind) {
      case 'commuter':
        this.fireEB(e.x, e.y + 14, 0, bs, false);
        break;
      case 'mail': {
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 0.95);
        const spread = 0.4;
        this.fireEB(e.x, e.y + 14, vx, vy, false);
        const cos = Math.cos(spread);
        const sin = Math.sin(spread);
        this.fireEB(e.x, e.y + 14, vx * cos - vy * sin, vx * sin + vy * cos, false);
        this.fireEB(e.x, e.y + 14, vx * cos + vy * sin, -vx * sin + vy * cos, false);
        break;
      }
      case 'phone': {
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 1.1);
        this.fireEB(e.x, e.y + 14, vx, vy, false);
        break;
      }
      case 'manager': {
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 1.05);
        this.fireEB(e.x, e.y + 14, vx, vy, false);
        const cos = Math.cos(0.3);
        const sin = Math.sin(0.3);
        this.fireEB(e.x, e.y + 14, vx * cos - vy * sin, vx * sin + vy * cos, false);
        this.fireEB(e.x, e.y + 14, vx * cos + vy * sin, -vx * sin + vy * cos, false);
        break;
      }
      case 'bug': {
        const d = Math.hypot(this.px - e.x, this.py - e.y);
        if (d < 150) {
          const [vx, vy] = this.aimAt(e.x, e.y, bs);
          this.fireEB(e.x, e.y + 14, vx, vy, true);
        } else {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + e.t;
            this.fireEB(e.x, e.y, Math.cos(a) * bs * 0.75, Math.sin(a) * bs * 0.75, false);
          }
        }
        break;
      }
      case 'black': {
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 1.2);
        this.fireEB(e.x, e.y + 14, vx, vy, true);
        const cos = Math.cos(0.25);
        const sin = Math.sin(0.25);
        this.fireEB(e.x, e.y + 14, vx * cos - vy * sin, vx * sin + vy * cos, false);
        this.fireEB(e.x, e.y + 14, vx * cos + vy * sin, -vx * sin + vy * cos, false);
        break;
      }
    }
    this.sound.enemyShoot();
  }

  private updateBoss(dt: number): void {
    const b = this.boss;
    if (!b.alive) return;
    b.t += dt;
    b.flash = Math.max(0, b.flash - dt * 6);
    if (!b.entered) {
      b.y += 95 * dt;
      if (b.y >= 150) {
        b.y = 150;
        b.entered = true;
      }
      return;
    }
    const enraged = b.hp < b.maxHp * 0.3;
    const spd = enraged ? 1.3 : 1;
    b.x = VIEW_W / 2 + Math.sin(b.t * 0.55 * spd) * (VIEW_W / 2 - 70);
    b.y = 150 + Math.sin(b.t * 0.85 * spd) * 34;

    // summon adds
    b.summonT -= dt;
    if (b.summonT <= 0) {
      b.summonT = 8;
      let alive = 0;
      for (const e of this.enemies) if (e.alive) alive++;
      if (alive < 6) {
        const st = STAGES[b.idx];
        if (st) this.spawnEnemy(st.enemies);
      }
    }

    // burst continuation
    if (b.burst > 0) {
      b.burstT -= dt;
      if (b.burstT <= 0) {
        b.burstT = 0.2;
        b.burst--;
        const [vx, vy] = this.aimAt(b.x, b.y + 40, 300);
        this.fireEB(b.x, b.y + 40, vx, vy, true);
        this.sound.enemyShoot();
      }
      return;
    }

    if (b.tele > 0) {
      b.tele -= dt;
      if (b.tele <= 0) {
        this.bossFire(b, b.pending, enraged);
        b.atkT = (enraged ? 1.5 : 2.2) + Math.random() * 0.6;
      }
      return;
    }
    b.atkT -= dt;
    if (b.atkT <= 0) {
      b.pending = (b.pending + 1) % 2;
      b.tele = 0.55;
    }
  }

  private bossFire(b: Boss, variant: number, enraged: boolean): void {
    const bs = (enraged ? 1.15 : 1) * (190 + this.loop * 16);
    const idx = b.idx;
    if (idx === 0) {
      // fan
      const [vx, vy] = this.aimAt(b.x, b.y + 40, bs * 1.2);
      const base = Math.atan2(vy, vx);
      for (let i = -2; i <= 2; i++) {
        const a = base + i * 0.22;
        this.fireEB(b.x, b.y + 40, Math.cos(a) * bs * 1.2, Math.sin(a) * bs * 1.2, i === 0);
      }
    } else if (idx === 1) {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        this.fireEB(b.x, b.y + 40, Math.cos(a) * bs, Math.abs(Math.sin(a)) * bs * 0.9 + 60, false);
      }
      const [vx, vy] = this.aimAt(b.x, b.y + 40, bs * 1.15);
      this.fireEB(b.x, b.y + 40, vx, vy, true);
    } else if (idx === 2) {
      const n = variant === 0 ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + b.angle;
        this.fireEB(b.x, b.y + 30, Math.cos(a) * bs, Math.sin(a) * bs, false);
      }
      b.angle += 0.4;
    } else if (idx === 3) {
      b.burst = 3;
      b.burstT = 0;
    } else if (idx === 4) {
      for (let i = -2; i <= 2; i++) {
        this.fireEB(b.x + i * 44, b.y + 40, Math.sin(this.time * 3 + i) * 40, bs * 1.5, false);
      }
    } else {
      // CEO: spiral + aimed
      for (let i = 0; i < 6; i++) {
        const a = b.angle + (i / 6) * Math.PI * 2;
        this.fireEB(b.x, b.y + 30, Math.cos(a) * bs * 0.9, Math.sin(a) * bs * 0.9, false);
      }
      b.angle += 0.55;
      if (variant === 1) {
        const [vx, vy] = this.aimAt(b.x, b.y + 40, bs * 1.4);
        this.fireEB(b.x, b.y + 40, vx, vy, true);
      }
    }
    this.sound.enemyShoot();
  }

  private updateEBullets(dt: number): void {
    for (const b of this.ebullets) {
      if (!b.alive) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -24 || b.x > VIEW_W + 24 || b.y < -30 || b.y > VIEW_H + 30) {
        b.alive = false;
        continue;
      }
      if (!b.grazed && !this.dying) {
        const d2 = dist2(b.x, b.y, this.px, this.py);
        if (d2 < 30 * 30 && d2 > 16 * 16) {
          b.grazed = true;
          this.grazeCount++;
          this.addScore(50);
          this.addText(this.px, this.py - 30, 'GRAZE', '#7fe7ff');
          this.sound.graze();
        }
      }
    }
  }

  private updateItems(dt: number): void {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.t += dt;
      const d2 = dist2(it.x, it.y, this.px, this.py);
      if (d2 < 130 * 130) {
        const d = Math.sqrt(d2) || 1;
        const pull = 300 * dt;
        it.x += ((this.px - it.x) / d) * pull;
        it.vy = 60;
      } else {
        it.vy = Math.min(190, it.vy + 60 * dt);
      }
      it.y += it.vy * dt;
      if (it.y > VIEW_H + 30) it.alive = false;
    }
  }

  private collide(): void {
    // player bullets vs enemies
    for (const pb of this.pbullets) {
      if (!pb.alive) continue;
      const pr = 8;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const rr = e.r + pr;
        if (Math.abs(e.x - pb.x) > rr || Math.abs(e.y - pb.y) > rr) continue;
        if (dist2(e.x, e.y, pb.x, pb.y) > rr * rr) continue;
        pb.alive = false;
        this.damageEnemy(e, pb.dmg, true);
        break;
      }
      if (!pb.alive) continue;
      const b = this.boss;
      if (b.alive && b.entered) {
        const rr = 44 + pr;
        if (Math.abs(b.x - pb.x) <= rr && Math.abs(b.y - pb.y) <= rr && dist2(b.x, b.y, pb.x, pb.y) <= rr * rr) {
          pb.alive = false;
          this.damageBoss(pb.dmg);
        }
      }
    }
    const vulnerable = this.invuln <= 0;
    if (vulnerable) {
      // enemy bullets vs player
      for (const eb of this.ebullets) {
        if (!eb.alive) continue;
        const rr = eb.big ? 12 : 10;
        if (Math.abs(eb.x - this.px) > rr || Math.abs(eb.y - this.py) > rr) continue;
        if (dist2(eb.x, eb.y, this.px, this.py) > rr * rr) continue;
        eb.alive = false;
        this.damagePlayer(12);
        break;
      }
      // contact vs enemies
      if (this.invuln <= 0) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const rr = e.r + 12;
          if (Math.abs(e.x - this.px) > rr || Math.abs(e.y - this.py) > rr) continue;
          if (dist2(e.x, e.y, this.px, this.py) > rr * rr) continue;
          this.damageEnemy(e, 999, true);
          this.damagePlayer(18);
          break;
        }
        const b = this.boss;
        if (b.alive && b.entered && this.invuln <= 0) {
          const rr = 44 + 12;
          if (Math.abs(b.x - this.px) <= rr && Math.abs(b.y - this.py) <= rr && dist2(b.x, b.y, this.px, this.py) <= rr * rr) {
            this.damagePlayer(25);
          }
        }
      }
    }
    // items vs player
    for (const it of this.items) {
      if (!it.alive) continue;
      if (dist2(it.x, it.y, this.px, this.py) > 26 * 26) continue;
      it.alive = false;
      this.collectItem(it.kind, it.x, it.y);
    }
  }

  private damageEnemy(e: Enemy, dmg: number, award: boolean): void {
    if (!e.alive) return;
    e.hp -= dmg;
    if (e.hp > 0) return;
    e.alive = false;
    this.kills++;
    this.combo++;
    this.comboT = 3.5;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.addScore(e.score);
    this.burst(e.x, e.y, 10, '#ffd257', 200);
    this.burst(e.x, e.y, 4, '#ffffff', 120);
    this.sound.boom();
    if (award) this.maybeDrop(e.x, e.y);
    if (this.combo > 0 && this.combo % 25 === 0) {
      this.addText(e.x, e.y - 20, `${this.combo} COMBO!`, '#ffe14d');
    }
  }

  private damageBoss(dmg: number): void {
    const b = this.boss;
    if (!b.alive) return;
    b.hp -= dmg;
    b.flash = 1;
    if (b.hp > 0) return;
    b.alive = false;
    const st = STAGES[b.idx];
    const value = 5000 * (this.stageIdx + 1) * (1 + this.loop);
    this.addScore(Math.round(value));
    this.combo += 5;
    this.comboT = 3.5;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.burst(b.x, b.y, 40, '#ffe14d', 320);
    this.burst(b.x, b.y, 24, '#ff5d5d', 220);
    this.burst(b.x, b.y, 16, '#ffffff', 160);
    for (const eb of this.ebullets) eb.alive = false;
    this.flashA = 0.5;
    this.flashColor = '#fff7d6';
    this.trauma = Math.min(1, this.trauma + 0.7);
    this.sound.bigBoom();
    if (this.stage >= 6) this.cleared6 = true;
    this.phase = 'interval';
    this.intervalT = 3.2;
    const next = this.stage + 1;
    saveContinue({ stage: next, score: this.score, weapon: this.weapon, weaponLevel: this.weaponLevel });
    this.onEvent({
      type: 'banner',
      title: `${st ? st.boss : 'ボス'} 撃破！`,
      sub: `昇進: ${titleForStage(next)} — ボーナス +${Math.round(value).toLocaleString()}`,
    });
    this.pushHud();
  }

  private damagePlayer(dmg: number): void {
    if (this.invuln > 0 || this.dying) return;
    this.hp -= dmg;
    this.combo = 0;
    this.comboT = 0;
    this.hitstop = 0.09;
    this.flashA = 0.3;
    this.flashColor = '#ff3b3b';
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.burst(this.px, this.py, 14, '#ff5d5d', 240);
    this.sound.hit();
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.deadT = 1.3;
      this.burst(this.px, this.py, 40, '#ffe14d', 320);
      this.burst(this.px, this.py, 24, '#5eb1ff', 220);
      this.sound.bigBoom();
      this.sound.stopBgm();
    } else {
      this.invuln = 1.2;
    }
    this.pushHud();
  }

  private maybeDrop(x: number, y: number): void {
    if (Math.random() > 0.16) return;
    const slot = this.items.find((i) => !i.alive);
    if (!slot) return;
    const r = Math.random();
    let kind: Item['kind'] = 'score';
    if (r < 0.24) kind = this.weaponLevel >= 5 ? 'score' : 'power';
    else if (r < 0.48) kind = 'heal';
    else if (r < 0.6) kind = 'bomb';
    else if (r < 0.74) kind = 'weapon';
    else kind = 'score';
    slot.alive = true;
    slot.x = Math.min(VIEW_W - 16, Math.max(16, x));
    slot.y = y;
    slot.vy = 120;
    slot.kind = kind;
    slot.t = 0;
  }

  private collectItem(kind: Item['kind'], x: number, y: number): void {
    switch (kind) {
      case 'score':
        this.addScore(500 + this.stage * 100);
        this.addText(x, y, `+${(500 + this.stage * 100).toLocaleString()}`, '#ffe14d');
        this.sound.pickup();
        break;
      case 'power':
        if (this.weaponLevel < 5) {
          this.weaponLevel++;
          this.addText(x, y, 'POWER UP!', '#4dffa6');
        } else {
          this.addScore(1000);
          this.addText(x, y, '+1000', '#ffe14d');
        }
        this.sound.power();
        break;
      case 'heal':
        this.hp = Math.min(this.maxHp, this.hp + 18);
        this.addText(x, y, '+18 ☕', '#4dffa6');
        this.sound.pickup();
        break;
      case 'bomb':
        this.bombs = Math.min(5, this.bombs + 1);
        this.addText(x, y, '+1 有給📄', '#ff8ad4');
        this.sound.power();
        break;
      case 'weapon':
        this.cycleWeapon();
        this.addScore(1000);
        break;
    }
    this.burst(x, y, 6, '#ffffff', 140);
    this.pushHud();
  }

  private addScore(base: number): void {
    const mult = 1 + Math.min(this.combo, 100) * 0.02;
    this.score += Math.round(base * mult);
  }

  private buildResult(): RunResult {
    const timeMs = Math.round(performance.now() - this.startedAt);
    let rank: string;
    const s = this.score;
    if (this.cleared6 && s >= 150000) rank = '伝説の社畜';
    else if (this.cleared6) rank = '社畜マスター';
    else if (s >= 90000) rank = '中間管理職';
    else if (s >= 45000) rank = '万年係長';
    else if (s >= 15000) rank = '若手ホープ';
    else if (s >= 4000) rank = '新入社員';
    else rank = '内定者';
    return { score: this.score, stage: this.stage, maxCombo: this.maxCombo, kills: this.kills, graze: this.grazeCount, timeMs, cleared: this.cleared6, rank };
  }

  // ---------- particles / text ----------

  private spawnParticle(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): void {
    const p = this.particles.find((q) => !q.alive);
    if (!p) return;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
  }

  private burst(x: number, y: number, n: number, color: string, speed: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.7);
      this.spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.35 + Math.random() * 0.4, 2 + Math.random() * 3, color);
    }
  }

  private addText(x: number, y: number, text: string, color: string): void {
    const t = this.texts.find((q) => !q.alive) ?? this.texts[0];
    if (!t) return;
    t.alive = true;
    t.x = Math.min(VIEW_W - 40, Math.max(40, x));
    t.y = y;
    t.life = 0.9;
    t.text = text;
    t.color = color;
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.4 * dt;
      p.vy *= 1 - 2.4 * dt;
    }
  }

  private updateTexts(dt: number): void {
    for (const t of this.texts) {
      if (!t.alive) continue;
      t.life -= dt;
      t.y -= 44 * dt;
      if (t.life <= 0) t.alive = false;
    }
  }

  private pushHud(): void {
    const b = this.boss;
    let pb = 0;
    let eb = 0;
    for (const x of this.pbullets) if (x.alive) pb++;
    for (const x of this.ebullets) if (x.alive) eb++;
    this.onEvent({
      type: 'hud',
      hud: {
        score: this.score,
        combo: this.combo,
        maxCombo: this.maxCombo,
        stage: this.stage,
        hp: Math.max(0, Math.round(this.hp)),
        maxHp: this.maxHp,
        bombs: this.bombs,
        weapon: this.weapon,
        weaponLevel: this.weaponLevel,
        bossActive: b.alive && b.entered,
        bossHp: Math.max(0, Math.round(b.hp)),
        bossMax: Math.max(1, Math.round(b.maxHp)),
        bossName: (STAGES[b.idx]?.boss ?? 'ボス') as string,
        kills: this.kills,
        graze: this.grazeCount,
        fps: Math.round(this.fps),
        pb,
        eb,
      },
    });
  }

  // ---------- render ----------

  private render(): void {
    const canvas = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth || VIEW_W;
    const ch = canvas.clientHeight || VIEW_H;
    const bw = Math.round(cw * dpr);
    const bh = Math.round(ch * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // full-bleed backdrop so fullscreen letterboxing looks intentional
    if (!this.bgGrad || this.bgGradH !== bh) {
      const gg = ctx.createLinearGradient(0, 0, 0, ch);
      gg.addColorStop(0, '#070714');
      gg.addColorStop(0.5, '#0b0b1c');
      gg.addColorStop(1, '#05050c');
      this.bgGrad = gg;
      this.bgGradH = bh;
    }
    ctx.fillStyle = this.bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    const s = Math.min(cw / VIEW_W, ch / VIEW_H);
    const ox = (cw - VIEW_W * s) / 2;
    const oy = (ch - VIEW_H * s) / 2;

    let shx = 0;
    let shy = 0;
    if (this.shakeEnabled && this.trauma > 0 && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const m = this.trauma * this.trauma * 14;
      shx = (Math.random() - 0.5) * 2 * m;
      shy = (Math.random() - 0.5) * 2 * m;
    }

    ctx.translate(ox + shx * s, oy + shy * s);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.clip();

    // background (two copies for seamless scroll)
    if (this.bg) {
      const off = this.scroll % VIEW_H;
      ctx.drawImage(this.bg, 0, off - VIEW_H, VIEW_W, VIEW_H);
      ctx.drawImage(this.bg, 0, off, VIEW_W, VIEW_H);
    } else {
      ctx.fillStyle = '#101020';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    const sp = this.sprites;
    // items
    if (sp) {
      for (const it of this.items) {
        if (!it.alive) continue;
        const img = sp.items[it.kind];
        if (!img) continue;
        const bob = Math.sin(it.t * 6) * 3;
        ctx.drawImage(img, it.x - 15, it.y - 15 + bob, 30, 30);
      }
      // enemies
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const img = sp.enemies[e.kind];
        if (img) {
          const size = e.r * 2 + 8;
          ctx.drawImage(img, e.x - size / 2, e.y - size / 2, size, size);
        }
        if (e.tele > 0) {
          ctx.strokeStyle = '#ff3b3b';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 18));
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (e.maxHp > 6) {
          const w = 30;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
          ctx.fillStyle = '#ff5d5d';
          ctx.fillRect(e.x - w / 2, e.y - e.r - 12, (w * Math.max(0, e.hp)) / e.maxHp, 4);
        }
      }
      // boss
      const b = this.boss;
      if (b.alive) {
        const img = sp.bosses[b.idx];
        if (img) ctx.drawImage(img, b.x - 46, b.y - 46, 92, 92);
        if (b.flash > 0) {
          ctx.globalAlpha = Math.min(0.7, b.flash);
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(b.x, b.y, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (b.tele > 0) {
          ctx.strokeStyle = '#ffd257';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(this.time * 16));
          ctx.beginPath();
          ctx.arc(b.x, b.y, 52 + (0.55 - b.tele) * 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // boss hp bar
        if (b.entered) {
          const w = VIEW_W - 60;
          const x0 = 30;
          const y0 = 54;
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(x0 - 2, y0 - 2, w + 4, 12);
          const ratio = Math.max(0, b.hp / b.maxHp);
          ctx.fillStyle = ratio < 0.3 ? '#ff3b3b' : ratio < 0.6 ? '#ffb13b' : '#ff5d7a';
          ctx.fillRect(x0, y0, w * ratio, 8);
        }
      }
      // player bullets
      for (const bl of this.pbullets) {
        if (!bl.alive) continue;
        if (bl.kind === 2) {
          const img = sp.missiles[0];
          if (img) {
            ctx.save();
            ctx.translate(bl.x, bl.y);
            ctx.rotate(Math.atan2(bl.vy, bl.vx) + Math.PI / 2);
            ctx.drawImage(img, -8, -12, 16, 24);
            ctx.restore();
          }
        } else {
          const img = sp.playerBullets[bl.kind === 1 ? 1 : 0];
          if (img) ctx.drawImage(img, bl.x - 9, bl.y - 17, 18, 34);
        }
      }
      // player
      if (!this.dying) {
        const blink = this.invuln > 0 && Math.floor(this.time * 14) % 2 === 0;
        if (!blink) {
          ctx.drawImage(sp.player, this.px - 22, this.py - 22, 44, 44);
          if (this.focus) {
            ctx.fillStyle = '#ff3b3b';
            ctx.beginPath();
            ctx.arc(this.px, this.py, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.px, this.py, 7, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      // enemy bullets
      for (const bl of this.ebullets) {
        if (!bl.alive) continue;
        const img = sp.enemyBullets[bl.big ? 1 : 0];
        if (img) {
          const sz = bl.big ? 20 : 16;
          ctx.drawImage(img, bl.x - sz / 2, bl.y - sz / 2, sz, sz);
        }
      }
    }

    // particles (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      if (!p.alive) continue;
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // floating texts
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui,sans-serif';
    for (const t of this.texts) {
      if (!t.alive) continue;
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // warn overlay
    if (this.phase === 'warn') {
      const blink = Math.floor(this.time * 6) % 2 === 0;
      ctx.fillStyle = blink ? 'rgba(255,30,30,0.16)' : 'rgba(255,30,30,0.06)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center';
      ctx.font = 'bold 40px system-ui,sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000';
      ctx.strokeText('⚠ WARNING ⚠', VIEW_W / 2, VIEW_H / 2 - 10);
      ctx.fillStyle = '#ff4d4d';
      ctx.fillText('⚠ WARNING ⚠', VIEW_W / 2, VIEW_H / 2 - 10);
    }

    // combo display
    if (this.combo >= 5) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px system-ui,sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      const label = `${this.combo} COMBO`;
      ctx.strokeText(label, 12, 108);
      ctx.fillStyle = '#ffe14d';
      ctx.fillText(label, 12, 108);
    }

    // flash
    if (this.flashA > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = Math.min(0.7, this.flashA);
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }
}
