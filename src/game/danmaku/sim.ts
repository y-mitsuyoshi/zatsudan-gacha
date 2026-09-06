import { STAGES, EXTENDS, rankFor, difficultyDef, type Difficulty, type EnemyId, type WeaponId } from './config';

/**
 * Pure danmaku simulation: no DOM, no three.js, no audio.
 * Fixed-timestep stepped by the engine; fully unit-testable in Node.
 */

export type Phase = 'fly' | 'warn' | 'boss' | 'interval' | 'over';

export interface PBullet { alive: boolean; x: number; y: number; vx: number; vy: number; dmg: number; kind: number; retarget: number; pierce: number; }
export interface EBullet { alive: boolean; x: number; y: number; vx: number; vy: number; big: boolean; grazed: boolean; }
export interface Enemy {
  alive: boolean; kind: EnemyId; x: number; y: number; x0: number;
  hp: number; maxHp: number; t: number; fireT: number; tele: number;
  speed: number; score: number; r: number;
}
export interface Particle { alive: boolean; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: number; }
export interface FloatText { alive: boolean; x: number; y: number; life: number; text: string; color: string; }
export interface DropItem { alive: boolean; x: number; y: number; vy: number; kind: 'score' | 'power' | 'bomb' | 'weapon'; t: number; }
export interface Ring { alive: boolean; x: number; y: number; r: number; vr: number; life: number; maxLife: number; color: number; }

export interface BossState {
  alive: boolean; idx: number; x: number; y: number; hp: number; maxHp: number;
  t: number; atkT: number; tele: number; pending: number; angle: number;
  burst: number; burstT: number; summonT: number; flash: number; entered: boolean;
  spellActive: boolean; spellClean: boolean; spellShown: boolean[];
}

export interface RunResult {
  score: number; stage: number; maxChain: number; kills: number;
  graze: number; timeMs: number; cleared: boolean; rank: string;
  difficulty: Difficulty;
}

export type SimEvent =
  | { type: 'banner'; title: string; sub?: string }
  | { type: 'spell'; name: string; sub?: string }
  | { type: 'extend' }
  | { type: 'warn'; boss: string }
  | { type: 'gameover'; result: RunResult };

const ENEMY_DEFS: Record<EnemyId, { hp: number; speed: number; score: number; r: number; elite: boolean }> = {
  commuter: { hp: 2, speed: 100, score: 120, r: 15, elite: false },
  mail: { hp: 4, speed: 85, score: 220, r: 14, elite: false },
  phone: { hp: 10, speed: 72, score: 320, r: 15, elite: true },
  manager: { hp: 15, speed: 88, score: 550, r: 16, elite: true },
  bug: { hp: 9, speed: 68, score: 450, r: 15, elite: true },
  black: { hp: 26, speed: 98, score: 1100, r: 17, elite: true },
  dasher: { hp: 6, speed: 150, score: 350, r: 14, elite: false },
  printer: { hp: 22, speed: 42, score: 800, r: 18, elite: true },
};

export const MAX_PB = 224;
export const MAX_EB = 448;
export const MAX_EN = 64;
export const MAX_PT = 384;
export const MAX_TX = 12;
export const MAX_IT = 24;
export const MAX_RING = 10;

function d2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export interface InputState {
  left: boolean; right: boolean; up: boolean; down: boolean; focus: boolean;
  /** pointer target in logical coords (mouse hover or touch + grab offset) */
  tx: number; ty: number;
  /** active pointer kind; null = keyboard only */
  tMode: 'mouse' | 'touch' | null;
}

export class DanmakuSim {
  phase: Phase = 'fly';
  time = 0;
  timeMs = 0;

  stage = 1;
  loop = 0;
  stageIdx = 0;
  stageT = 0;
  spawnT = 1;
  warnT = 0;
  intervalT = 0;

  score = 0;
  chain = 0;
  chainT = 0;
  maxChain = 0;
  kills = 0;
  graze = 0;
  cleared6 = false;
  extendIdx = 0;

  px = 240;
  py = 680;
  lives = 3;
  bombs = 3;
  power = 1;
  weapon: WeaponId = 'rensa';
  fireT = 0;
  invuln = 0;
  deadT = 0; // >0 while death explosion plays
  bombCd = 0;
  trailT = 0;
  focusHeld = false;

  diff: Difficulty = 'normal';
  private bMult = 1;
  private eHpMult = 1;
  private bossHpMult = 1;
  private fireIntMult = 1;
  private spawnRateMult = 1;
  private scoreMult = 1;

  trauma = 0;
  hitstop = 0;
  slowmo = 0;
  flashA = 0;
  flashColor = '#ffffff';
  scroll = 0;

  boss: BossState = {
    alive: false, idx: 0, x: 240, y: -80, hp: 1, maxHp: 1,
    t: 0, atkT: 2, tele: 0, pending: 0, angle: 0, burst: 0, burstT: 0,
    summonT: 7, flash: 0, entered: false, spellActive: false, spellClean: true,
    spellShown: [false, false],
  };

  pbullets: PBullet[] = [];
  ebullets: EBullet[] = [];
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];
  items: DropItem[] = [];
  rings: Ring[] = [];
  events: SimEvent[] = [];

  constructor() {
    for (let i = 0; i < MAX_PB; i++) this.pbullets.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, dmg: 1, kind: 0, retarget: 0, pierce: 0 });
    for (let i = 0; i < MAX_EB; i++) this.ebullets.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, big: false, grazed: false });
    for (let i = 0; i < MAX_EN; i++) this.enemies.push({ alive: false, kind: 'commuter', x: 0, y: 0, x0: 0, hp: 1, maxHp: 1, t: 0, fireT: 0, tele: 0, speed: 90, score: 100, r: 15 });
    for (let i = 0; i < MAX_PT; i++) this.particles.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: 0xffffff });
    for (let i = 0; i < MAX_TX; i++) this.texts.push({ alive: false, x: 0, y: 0, life: 0, text: '', color: '#fff' });
    for (let i = 0; i < MAX_IT; i++) this.items.push({ alive: false, x: 0, y: 0, vy: 0, kind: 'score', t: 0 });
    for (let i = 0; i < MAX_RING; i++) this.rings.push({ alive: false, x: 0, y: 0, r: 0, vr: 0, life: 0, maxLife: 1, color: 0xffffff });
  }

  reset(o: { stage: number; score: number; lives: number; weapon: WeaponId; power: number; difficulty?: Difficulty }): void {
    this.phase = 'fly';
    this.time = 0;
    this.timeMs = 0;
    this.stage = Math.max(1, Math.floor(o.stage));
    this.loop = Math.floor((this.stage - 1) / 6);
    this.stageIdx = (this.stage - 1) % 6;
    this.stageT = 0;
    this.spawnT = 1.2;
    this.score = Math.max(0, Math.floor(o.score));
    this.chain = 0;
    this.chainT = 0;
    this.maxChain = 0;
    this.kills = 0;
    this.graze = 0;
    this.cleared6 = this.stage > 6;
    this.extendIdx = 0;
    while (this.extendIdx < EXTENDS.length && this.score >= (EXTENDS[this.extendIdx] ?? Infinity)) this.extendIdx++;
    this.diff = o.difficulty ?? 'normal';
    const dm = difficultyDef(this.diff);
    this.bMult = dm.bullet;
    this.eHpMult = dm.enemyHp;
    this.bossHpMult = dm.bossHp;
    this.fireIntMult = dm.fireInterval;
    this.spawnRateMult = dm.spawnRate;
    this.scoreMult = dm.score;
    this.focusHeld = false;
    this.px = 240;
    this.py = 680;
    this.lives = Math.min(5, Math.max(1, o.lives));
    this.bombs = 3;
    this.power = Math.min(5, Math.max(1, o.power));
    this.weapon = o.weapon;
    this.fireT = 0.3;
    this.invuln = 1;
    this.deadT = 0;
    this.bombCd = 0;
    this.trauma = 0;
    this.hitstop = 0;
    this.slowmo = 0;
    this.flashA = 0;
    this.scroll = 0;
    this.boss.alive = false;
    for (const a of [this.pbullets, this.ebullets, this.enemies, this.particles, this.texts, this.items, this.rings]) {
      for (const e of a as Array<{ alive: boolean }>) e.alive = false;
    }
    this.events.length = 0;
  }

  step(dt: number, input: InputState): void {
    this.time += dt;
    this.timeMs += dt * 1000;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.updateParticles(dt * 0.12);
      return;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    this.flashA = Math.max(0, this.flashA - dt * 2.4);
    this.slowmo = Math.max(0, this.slowmo - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.bombCd = Math.max(0, this.bombCd - dt);
    this.scroll += dt * (70 + this.stageIdx * 9);

    if (this.deadT > 0) {
      this.deadT -= dt;
      this.updateParticles(dt);
      this.updateTexts(dt);
      this.updateRings(dt);
      if (this.deadT <= 0) {
        if (this.lives < 0) {
          this.phase = 'over';
          this.events.push({ type: 'gameover', result: this.buildResult() });
        } else {
          this.px = 240;
          this.py = 700;
          this.invuln = 2.0;
        }
      }
      return;
    }
    if (this.phase === 'over') {
      this.updateParticles(dt);
      this.updateTexts(dt);
      this.updateRings(dt);
      return;
    }

    if (this.chain > 0) {
      this.chainT -= dt;
      if (this.chainT <= 0) this.chain = 0;
    }

    this.updateStage(dt);
    this.updatePlayer(dt, input);
    this.updatePBullets(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateEBullets(dt);
    this.updateItems(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateRings(dt);
    this.collide();
  }

  // ---------------- stages ----------------

  private updateStage(dt: number): void {
    if (this.phase === 'fly') {
      this.stageT += dt;
      this.spawnT -= dt;
      const st = STAGES[this.stageIdx];
      const interval = Math.max(0.3, 0.84 - this.stage * 0.05) / ((1 + this.loop * 0.2) * this.spawnRateMult);
      const cap = Math.min(26, 11 + this.stage);
      if (this.spawnT <= 0 && st) {
        this.spawnT = interval;
        let alive = 0;
        for (const e of this.enemies) if (e.alive) alive++;
        if (alive < cap) this.spawnEnemy(st.enemies);
      }
      if (this.stageT >= (st?.duration ?? 30)) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          e.alive = false;
          this.addScore(Math.floor(e.score / 2));
          this.burst(e.x, e.y, 8, 0xffe14d, 170);
        }
        for (const b of this.ebullets) b.alive = false;
        this.phase = 'warn';
        this.warnT = 2.4;
        this.events.push({ type: 'warn', boss: st?.boss ?? '???' });
      }
    } else if (this.phase === 'warn') {
      this.warnT -= dt;
      if (this.warnT <= 0) {
        this.spawnBoss();
        this.phase = 'boss';
      }
    } else if (this.phase === 'interval') {
      this.intervalT -= dt;
      if (this.intervalT <= 0) this.nextStage();
    }
  }

  private nextStage(): void {
    this.stage++;
    this.loop = Math.floor((this.stage - 1) / 6);
    this.stageIdx = (this.stage - 1) % 6;
    this.stageT = 0;
    this.spawnT = 1;
    this.phase = 'fly';
    const st = STAGES[this.stageIdx];
    if (this.stage === 7) {
      this.events.push({ type: 'banner', title: '全制覇！無限残業ループ突入', sub: 'ここからが本当の社畜道…' });
    } else if (st) {
      this.events.push({ type: 'banner', title: `Stage ${this.stage} — ${st.name}`, sub: st.sub });
    }
  }

  private spawnEnemy(pool: EnemyId[]): void {
    const slot = this.enemies.find((e) => !e.alive);
    if (!slot || pool.length === 0) return;
    const pick = pool[Math.min(pool.length - 1, Math.floor(Math.pow(Math.random(), 0.7) * pool.length))] ?? 'commuter';
    const def = ENEMY_DEFS[pick];
    const mult = (1 + (this.stage - 1) * 0.22) * (1 + this.loop * 0.45);
    slot.alive = true;
    slot.kind = pick;
    slot.x0 = 30 + Math.random() * 420;
    slot.x = slot.x0;
    slot.y = -30;
    slot.t = 0;
    slot.hp = slot.maxHp = Math.max(1, Math.round(def.hp * mult * 0.68 * this.eHpMult));
    slot.speed = def.speed * Math.min(1.35, 1 + this.stage * 0.02);
    slot.score = Math.round(def.score * (1 + this.loop * 0.5));
    slot.r = def.r;
    slot.fireT = (1.0 + Math.random() * 1.4) * this.fireIntMult;
    slot.tele = 0;
  }

  private spawnBoss(): void {
    const b = this.boss;
    b.alive = true;
    b.entered = false;
    b.idx = this.stageIdx;
    b.x = 240;
    b.y = -80;
    b.t = 0;
    b.atkT = 2.4;
    b.tele = 0;
    b.pending = 0;
    b.angle = Math.random() * Math.PI * 2;
    b.burst = 0;
    b.summonT = 8;
    b.flash = 0;
    b.spellActive = false;
    b.spellClean = true;
    b.spellShown = [false, false];
    b.maxHp = b.hp = Math.round((130 + this.stage * 36) * (1 + this.loop * 0.9) * this.bossHpMult);
  }

  // ---------------- player ----------------

  private updatePlayer(dt: number, input: InputState): void {
    this.focusHeld = input.focus;
    let vx = 0;
    let vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (vx !== 0 || vy !== 0) {
      // keyboard takes precedence over pointer follow
      const speed = input.focus ? 165 : 380;
      const len = Math.hypot(vx, vy);
      this.px += (vx / len) * speed * dt;
      this.py += (vy / len) * speed * dt;
    } else if (input.tMode === 'mouse') {
      // absolute follow with critically-damped smoothing: no button press needed
      const k = input.focus ? 11 : 19;
      const a = Math.min(1, dt * k);
      this.px += (input.tx - this.px) * a;
      this.py += (input.ty - this.py) * a;
    } else if (input.tMode === 'touch') {
      // near-direct follow of the offset-corrected touch target
      const a = Math.min(1, dt * 30);
      this.px += (input.tx - this.px) * a;
      this.py += (input.ty - this.py) * a;
    }
    this.px = Math.min(462, Math.max(18, this.px));
    this.py = Math.min(776, Math.max(60, this.py));

    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.05;
      this.spawnParticle(this.px + (Math.random() - 0.5) * 8, this.py + 26, 0, 130, 0.28, 5, 0x54e0ff);
    }
    this.fireT -= dt;
    if (this.fireT <= 0) this.fireWeapon();
  }

  private allocPB(): PBullet | null {
    return this.pbullets.find((b) => !b.alive) ?? null;
  }

  private emitPB(x: number, y: number, vx: number, vy: number, dmg: number, kind: number, pierce = 0): void {
    const s = this.allocPB();
    if (!s) return;
    s.alive = true;
    s.x = x;
    s.y = y;
    s.vx = vx;
    s.vy = vy;
    s.dmg = dmg;
    s.kind = kind;
    s.retarget = 0;
    s.pierce = pierce;
  }

  private fireWeapon(): void {
    const lvl = this.power;
    const ox = 26; // option pods
    if (this.weapon === 'rensa') {
      this.fireT = Math.max(0.08, 0.145 - lvl * 0.013);
      const dmg = 1 + (lvl - 1) * 0.25;
      const streams: Array<[number, number]> = [[0, 0]];
      if (lvl >= 2) streams.push([-13, 0], [13, 0]);
      if (lvl >= 4) streams.push([-24, -0.1], [24, 0.1]);
      for (const [dx, ang] of streams) {
        this.emitPB(this.px + dx, this.py - 26, Math.sin(ang) * 700, -Math.cos(ang) * 700, dmg, 0);
      }
      this.emitPB(this.px - ox, this.py - 6, 0, -640, 0.6, 0);
      this.emitPB(this.px + ox, this.py - 6, 0, -640, 0.6, 0);
    } else if (this.weapon === 'kakusan') {
      this.fireT = 0.23;
      const dmg = 0.9 + (lvl - 1) * 0.18;
      const angs = lvl >= 3 ? [-0.34, -0.17, 0, 0.17, 0.34] : [-0.22, 0, 0.22];
      for (const a of angs) {
        this.emitPB(this.px, this.py - 26, Math.sin(a) * 620, -Math.cos(a) * 620, dmg, 1);
      }
      this.emitPB(this.px - ox, this.py - 6, -60, -620, 0.6, 1);
      this.emitPB(this.px + ox, this.py - 6, 60, -620, 0.6, 1);
    } else if (this.weapon === 'tsuibi') {
      this.fireT = 0.29;
      const n = 1 + Math.floor(lvl / 2);
      for (let i = 0; i < n; i++) {
        this.emitPB(
          this.px + (i - (n - 1) / 2) * 16, this.py - 22,
          (i - (n - 1) / 2) * 46, -500, 1.3 + (lvl - 1) * 0.2, 2,
        );
      }
      this.emitPB(this.px - ox, this.py - 6, 0, -640, 0.6, 0);
      this.emitPB(this.px + ox, this.py - 6, 0, -640, 0.6, 0);
    } else {
      // laser: twin piercing beams that punch through enemy lines
      this.fireT = Math.max(0.12, 0.2 - lvl * 0.014);
      const dmg = 2.1 + (lvl - 1) * 0.35;
      const pierce = 1 + Math.floor(lvl / 2);
      const spread = lvl >= 3 ? [-0.04, 0.04] : [0];
      for (const dx of [-11, 11]) {
        for (const a of spread) {
          this.emitPB(this.px + dx, this.py - 28, Math.sin(a) * 780, -Math.cos(a) * 780, dmg, 3, pierce);
        }
      }
      this.emitPB(this.px - ox, this.py - 6, 0, -640, 0.6, 0);
      this.emitPB(this.px + ox, this.py - 6, 0, -640, 0.6, 0);
    }
    this.spawnParticle(this.px - 5, this.py - 28, -50, -230, 0.1, 5, 0xffffff);
    this.spawnParticle(this.px + 5, this.py - 28, 50, -230, 0.1, 5, 0xffffff);
  }

  useBomb(): boolean {
    if (this.phase === 'over' || this.deadT > 0 || this.bombs <= 0 || this.bombCd > 0) return false;
    this.bombs--;
    this.bombCd = 0.6;
    this.invuln = Math.max(this.invuln, 2);
    let cleared = 0;
    for (const b of this.ebullets) {
      if (!b.alive) continue;
      b.alive = false;
      cleared++;
      this.burst(b.x, b.y, 2, 0x7fe7ff, 130);
    }
    if (cleared > 0) this.addScore(cleared * 30);
    for (const e of this.enemies) {
      if (e.alive) this.damageEnemy(e, 120, false);
    }
    if (this.boss.alive) this.damageBoss(250);
    this.flashA = 0.6;
    this.flashColor = '#ffffff';
    this.trauma = Math.min(1, this.trauma + 0.65);
    this.slowmo = Math.max(this.slowmo, 0.3);
    this.ring(this.px, this.py, 420, 0xffffff);
    if (this.boss.spellActive) this.boss.spellClean = false;
    return true;
  }

  cycleWeapon(): WeaponId {
    this.weapon = this.weapon === 'rensa' ? 'kakusan'
      : this.weapon === 'kakusan' ? 'tsuibi'
        : this.weapon === 'tsuibi' ? 'laser' : 'rensa';
    this.addText(this.px, this.py - 44,
      this.weapon === 'rensa' ? '連射！' : this.weapon === 'kakusan' ? '拡散！' : this.weapon === 'laser' ? 'レーザー！' : '追尾！', '#7fe7ff');
    return this.weapon;
  }

  // ---------------- bullets ----------------

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
      if (b.kind === 3 && b.retarget > 0) b.retarget -= dt;
      if (b.kind === 2) {
        b.retarget -= dt;
        if (b.retarget <= 0) {
          b.retarget = 0.14;
          let tx = 0;
          let ty = -1000;
          let best = 460 * 460;
          let found = false;
          for (const e of this.enemies) {
            if (!e.alive) continue;
            const dd = d2(b.x, b.y, e.x, e.y);
            if (dd < best) {
              best = dd;
              tx = e.x;
              ty = e.y;
              found = true;
            }
          }
          if (this.boss.alive && this.boss.entered) {
            const dd = d2(b.x, b.y, this.boss.x, this.boss.y);
            if (dd < best) {
              tx = this.boss.x;
              ty = this.boss.y;
              found = true;
            }
          }
          if (found) {
            const want = Math.atan2(ty - b.y, tx - b.x);
            const cur = Math.atan2(b.vy, b.vx);
            let diff = want - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = Math.max(-38 * dt, Math.min(38 * dt, diff));
            const sp = Math.min(560, Math.hypot(b.vx, b.vy) + 520 * dt);
            const na = cur + turn;
            b.vx = Math.cos(na) * sp;
            b.vy = Math.sin(na) * sp;
          }
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -34 || b.y > 834 || b.x < -34 || b.x > 514) b.alive = false;
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
          e.x += (this.px > e.x ? 55 : -55) * dt;
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
        case 'dasher':
          // dives toward the player's x, then streaks down past them
          if (e.y < 110) {
            e.y += sp * dt;
            e.x = e.x0 + Math.sin(e.t * 5) * 14;
          } else {
            e.y += sp * 1.7 * dt;
            const dx = Math.max(-1, Math.min(1, (this.px - e.x) / 60));
            e.x += dx * 150 * dt;
          }
          break;
        case 'printer':
          // lumbers down, parks high, and sways while printing bullets
          if (e.y < 180) e.y += sp * dt;
          else {
            e.y += Math.sin(e.t * 1.6) * 14 * dt;
            e.x = e.x0 + Math.sin(e.t * 1.1) * 60;
          }
          break;
      }
      e.x = Math.min(466, Math.max(14, e.x));
      if (e.y > 840) {
        e.alive = false;
        continue;
      }
      if (e.y < 10 || e.y > 480) continue;
      const def = ENEMY_DEFS[e.kind];
      if (e.tele > 0) {
        e.tele -= dt;
        if (e.tele <= 0) {
          this.enemyFire(e);
          e.fireT = (1.8 + Math.random() * 1.4 - Math.min(0.8, this.stage * 0.05)) * this.fireIntMult;
        }
        continue;
      }
      e.fireT -= dt;
      if (e.fireT <= 0) {
        if (def.elite) e.tele = 0.45;
        else {
          this.enemyFire(e);
          e.fireT = (2.0 + Math.random() * 1.4) * this.fireIntMult;
        }
      }
    }
  }

  private enemyFire(e: Enemy): void {
    const bs = Math.min(300, 178 + this.stage * 10 + this.loop * 16) * this.bMult;
    switch (e.kind) {
      case 'commuter':
        this.fireEB(e.x, e.y + 14, 0, bs, false);
        break;
      case 'mail': {
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 0.95);
        this.spread(e.x, e.y + 14, vx, vy, 0.4, false);
        break;
      }
      case 'phone': {
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 1.1);
        this.fireEB(e.x, e.y + 14, vx, vy, false);
        break;
      }
      case 'manager': {
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 1.05);
        this.spread(e.x, e.y + 14, vx, vy, 0.3, false);
        break;
      }
      case 'bug': {
        const dist = Math.hypot(this.px - e.x, this.py - e.y);
        if (dist < 150) {
          const [vx, vy] = this.aimAt(e.x, e.y, bs);
          this.fireEB(e.x, e.y + 14, vx, vy, true);
        } else {
          this.ringFire(e.x, e.y, 8, bs * 0.75, e.t, false);
        }
        break;
      }
      case 'black': {
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 1.2);
        this.fireEB(e.x, e.y + 14, vx, vy, true);
        this.spread(e.x, e.y + 14, vx, vy, 0.25, false);
        break;
      }
      case 'dasher': {
        if (e.y > 140 && e.y < 520) {
          const [vx, vy] = this.aimAt(e.x, e.y, bs * 1.1);
          this.spread(e.x, e.y + 12, vx, vy, 0.2, false);
        }
        break;
      }
      case 'printer': {
        // 5-way downward fan plus one aimed shot down the middle
        for (const a of [-0.42, -0.21, 0, 0.21, 0.42]) {
          this.fireEB(e.x, e.y + 16, Math.sin(a) * bs, Math.cos(a) * bs, false);
        }
        const [vx, vy] = this.aimAt(e.x, e.y, bs * 1.05);
        this.fireEB(e.x, e.y + 16, vx, vy, true);
        break;
      }
    }
  }

  private spread(x: number, y: number, vx: number, vy: number, half: number, big: boolean): void {
    this.fireEB(x, y, vx, vy, big);
    const cos = Math.cos(half);
    const sin = Math.sin(half);
    this.fireEB(x, y, vx * cos - vy * sin, vx * sin + vy * cos, big);
    this.fireEB(x, y, vx * cos + vy * sin, -vx * sin + vy * cos, big);
  }

  private ringFire(x: number, y: number, n: number, speed: number, offset: number, big: boolean, gapAt = -1, gapHalf = 0): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + offset;
      if (gapAt >= 0) {
        let diff = Math.abs(a - gapAt) % (Math.PI * 2);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < gapHalf) continue;
      }
      this.fireEB(x, y, Math.cos(a) * speed, Math.sin(a) * speed, big);
    }
  }

  // ---------------- boss ----------------

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
    b.x = 240 + Math.sin(b.t * 0.55 * spd) * 170;
    b.y = 150 + Math.sin(b.t * 0.85 * spd) * 34;

    b.summonT -= dt;
    if (b.summonT <= 0) {
      b.summonT = 8;
      let alive = 0;
      for (const e of this.enemies) if (e.alive) alive++;
      if (alive < 5) {
        const st = STAGES[b.idx];
        if (st) this.spawnEnemy(st.enemies);
      }
    }

    if (b.burst > 0) {
      b.burstT -= dt;
      if (b.burstT <= 0) {
        b.burstT = 0.2;
        b.burst--;
        const [vx, vy] = this.aimAt(b.x, b.y + 44, 310);
        this.fireEB(b.x, b.y + 44, vx, vy, true);
      }
      return;
    }

    if (b.tele > 0) {
      b.tele -= dt;
      if (b.tele <= 0) {
        this.finishSpellWindow();
        this.bossFire(b, b.pending, enraged);
        b.atkT = ((enraged ? 1.35 : 2.05) + Math.random() * 0.55) * this.fireIntMult;
      }
      return;
    }
    b.atkT -= dt;
    if (b.atkT <= 0) {
      b.pending = (b.pending + 1) % 2;
      b.tele = 0.6;
      b.spellActive = true;
      b.spellClean = true;
      // announce each spell card only once per fight; repeats are telegraphed
      // by the boss flash alone instead of a fullscreen banner
      const key = b.pending % 2;
      if (!b.spellShown[key]) {
        b.spellShown[key] = true;
        const st = STAGES[b.idx];
        const spell = st?.spells[key];
        if (spell) this.events.push({ type: 'spell', name: spell.name, sub: spell.sub });
      }
    }
  }

  private finishSpellWindow(): void {
    const b = this.boss;
    if (b.spellActive && b.spellClean && b.entered) {
      const bonus = Math.round(15000 * (b.idx + 1) * (1 + this.loop * 0.5));
      this.addScore(bonus);
      this.addText(b.x, b.y - 70, `SPELL BONUS +${bonus.toLocaleString()}`, '#ffe14d');
    }
    b.spellActive = false;
  }

  private bossFire(b: BossState, variant: number, enraged: boolean): void {
    const bs = (enraged ? 1.15 : 1) * (222 + this.loop * 19) * this.bMult;
    const idx = b.idx;
    const gapAim = Math.atan2(this.py - (b.y + 40), this.px - b.x) + 0.55;
    if (idx === 0) {
      const [vx, vy] = this.aimAt(b.x, b.y + 44, bs * 1.2);
      const base = Math.atan2(vy, vx);
      for (let i = -2; i <= 2; i++) {
        const a = base + i * 0.22;
        this.fireEB(b.x, b.y + 44, Math.cos(a) * bs * 1.2, Math.sin(a) * bs * 1.2, i === 0);
      }
      if (variant === 1 || enraged) this.ringFire(b.x, b.y + 30, 10, bs * 0.8, b.angle, false);
      b.angle += 0.5;
    } else if (idx === 1) {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        this.fireEB(b.x, b.y + 44, Math.cos(a) * bs, Math.abs(Math.sin(a)) * bs * 0.9 + 60, false);
      }
      const [vx, vy] = this.aimAt(b.x, b.y + 44, bs * 1.15);
      this.fireEB(b.x, b.y + 44, vx, vy, true);
      if (variant === 1) {
        b.burst = 3;
        b.burstT = 0;
      }
    } else if (idx === 2) {
      this.ringFire(b.x, b.y + 30, variant === 0 ? 14 : 8, bs, b.angle, false, gapAim, 0.3);
      b.angle += 0.42;
      if (enraged) {
        const [vx, vy] = this.aimAt(b.x, b.y + 44, bs * 1.2);
        this.fireEB(b.x, b.y + 44, vx, vy, true);
      }
    } else if (idx === 3) {
      b.burst = 3;
      b.burstT = 0;
      if (variant === 1) {
        this.ringFire(b.x, b.y + 30, 8, bs * 0.7, -b.angle, false, gapAim + 1.1, 0.35);
        b.angle += 0.3;
      }
    } else if (idx === 4) {
      for (let i = -2; i <= 2; i++) {
        this.fireEB(b.x + i * 46, b.y + 44, Math.sin(this.time * 3 + i) * 40, bs * 1.5, false);
      }
      if (variant === 1 || enraged) {
        const [vx, vy] = this.aimAt(b.x, b.y + 44, bs);
        this.spread(b.x, b.y + 44, vx, vy, 0.28, true);
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const a = b.angle + (i / 7) * Math.PI * 2;
        this.fireEB(b.x, b.y + 30, Math.cos(a) * bs * 0.9, Math.sin(a) * bs * 0.9, false);
      }
      for (let i = 0; i < 7; i++) {
        const a = -b.angle * 0.7 + (i / 7) * Math.PI * 2;
        this.fireEB(b.x, b.y + 30, Math.cos(a) * bs * 0.7, Math.sin(a) * bs * 0.7, false);
      }
      b.angle += 0.55;
      if (variant === 1) {
        const [vx, vy] = this.aimAt(b.x, b.y + 44, bs * 1.4);
        this.fireEB(b.x, b.y + 44, vx, vy, true);
      }
    }
  }

  // ---------------- shared updates ----------------

  private updateEBullets(dt: number): void {
    for (const b of this.ebullets) {
      if (!b.alive) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -24 || b.x > 504 || b.y < -30 || b.y > 830) {
        b.alive = false;
        continue;
      }
      if (!b.grazed && this.deadT <= 0) {
        const dd = d2(b.x, b.y, this.px, this.py);
        if (dd < 30 * 30 && dd > 15 * 15) {
          b.grazed = true;
          this.graze++;
          this.addScore(100);
        }
      }
    }
  }

  private updateItems(dt: number): void {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.t += dt;
      const dd = d2(it.x, it.y, this.px, this.py);
      if (dd < 140 * 140) {
        const d = Math.sqrt(dd) || 1;
        const pull = 320 * dt;
        it.x += ((this.px - it.x) / d) * pull;
        it.vy = 60;
      } else {
        it.vy = Math.min(190, it.vy + 60 * dt);
      }
      it.y += it.vy * dt;
      if (it.y > 830) it.alive = false;
    }
  }

  private collide(): void {
    for (const pb of this.pbullets) {
      if (!pb.alive) continue;
      const pr = 9;
      let consumed = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const rr = e.r + pr;
        if (Math.abs(e.x - pb.x) > rr || Math.abs(e.y - pb.y) > rr) continue;
        if (d2(e.x, e.y, pb.x, pb.y) > rr * rr) continue;
        // laser ticks: one damage instance per 0.09s per bolt
        if (pb.kind === 3 && pb.retarget > 0) continue;
        this.damageEnemy(e, pb.dmg, true);
        if (pb.pierce > 0) {
          pb.pierce--;
          if (pb.kind === 3) pb.retarget = 0.09;
        } else {
          pb.alive = false;
          consumed = true;
          break;
        }
      }
      if (consumed) continue;
      const b = this.boss;
      if (b.alive && b.entered) {
        const rr = 46 + pr;
        if (Math.abs(b.x - pb.x) <= rr && Math.abs(b.y - pb.y) <= rr && d2(b.x, b.y, pb.x, pb.y) <= rr * rr) {
          if (!(pb.kind === 3 && pb.retarget > 0)) {
            this.damageBoss(pb.dmg);
            if (pb.kind === 3) pb.retarget = 0.09;
          }
          if (pb.pierce <= 0) pb.alive = false;
        }
      }
    }
    if (this.invuln <= 0 && this.deadT <= 0) {
      for (const eb of this.ebullets) {
        if (!eb.alive) continue;
        const rr = eb.big ? 7 : 6; // precise hitbox: commercial fairness
        if (Math.abs(eb.x - this.px) > rr + 4 || Math.abs(eb.y - this.py) > rr + 4) continue;
        if (d2(eb.x, eb.y, this.px, this.py) > rr * rr) continue;
        eb.alive = false;
        this.killPlayer();
        break;
      }
      if (this.deadT <= 0) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const rr = e.r + 4;
          if (Math.abs(e.x - this.px) > rr || Math.abs(e.y - this.py) > rr) continue;
          if (d2(e.x, e.y, this.px, this.py) > rr * rr) continue;
          this.damageEnemy(e, 9999, true);
          this.killPlayer();
          break;
        }
        const b = this.boss;
        if (b.alive && b.entered && this.deadT <= 0) {
          const rr = 46 + 4;
          if (Math.abs(b.x - this.px) <= rr && Math.abs(b.y - this.py) <= rr && d2(b.x, b.y, this.px, this.py) <= rr * rr) {
            this.killPlayer();
          }
        }
      }
    }
    for (const it of this.items) {
      if (!it.alive) continue;
      if (d2(it.x, it.y, this.px, this.py) > 26 * 26) continue;
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
    this.chain++;
    this.chainT = 4;
    if (this.chain > this.maxChain) this.maxChain = this.chain;
    this.addScore(e.score);
    this.burst(e.x, e.y, 10, 0xffe14d, 210);
    this.burst(e.x, e.y, 4, 0xffffff, 130);
    if (award) this.maybeDrop(e.x, e.y);
    if (this.chain > 0 && this.chain % 30 === 0) {
      this.addText(e.x, e.y - 22, `${this.chain} CHAIN!`, '#ffe14d');
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
    const value = Math.round(8000 * (this.stageIdx + 1) * (1 + this.loop * 0.5));
    this.finishSpellWindow();
    // remaining minions go down with the boss (score + bursts, no drops)
    for (const e of this.enemies) {
      if (e.alive) this.damageEnemy(e, 9999, false);
    }
    this.addScore(value);
    this.chain += 8;
    this.chainT = 4;
    if (this.chain > this.maxChain) this.maxChain = this.chain;
    this.burst(b.x, b.y, 42, 0xffe14d, 330);
    this.burst(b.x, b.y, 26, 0xff5d5d, 230);
    this.burst(b.x, b.y, 16, 0xffffff, 170);
    this.ring(b.x, b.y, 480, 0xfff7d6);
    for (const eb of this.ebullets) eb.alive = false;
    this.flashA = 0.5;
    this.flashColor = '#fff7d6';
    this.trauma = Math.min(1, this.trauma + 0.7);
    this.hitstop = Math.max(this.hitstop, 0.22);
    if (this.stage >= 6) this.cleared6 = true;
    this.phase = 'interval';
    this.intervalT = 3.2;
    this.events.push({
      type: 'banner',
      title: `${st?.boss ?? 'ボス'} 撃破！`,
      sub: `ボーナス +${value.toLocaleString()}`,
    });
  }

  private killPlayer(): void {
    if (this.invuln > 0 || this.deadT > 0 || this.phase === 'over') return;
    this.lives--;
    this.chain = 0;
    this.chainT = 0;
    this.hitstop = Math.max(this.hitstop, 0.12);
    this.slowmo = Math.max(this.slowmo, 0.9);
    this.flashA = 0.35;
    this.flashColor = '#ff3b3b';
    this.trauma = 1;
    this.burst(this.px, this.py, 42, 0xffe14d, 330);
    this.burst(this.px, this.py, 24, 0x54e0ff, 230);
    this.ring(this.px, this.py, 300, 0xff5d7a);
    for (const b of this.ebullets) {
      if (!b.alive) continue;
      b.alive = false;
      this.burst(b.x, b.y, 1, 0x7fe7ff, 100);
    }
    if (this.boss.spellActive) this.boss.spellClean = false;
    this.power = Math.max(1, this.power - 1);
    this.deadT = 1.5;
    if (this.lives < 0) {
      this.bombs = 0;
    } else {
      this.bombs = Math.max(this.bombs, 2);
    }
  }

  private maybeDrop(x: number, y: number): void {
    if (Math.random() > 0.16) return;
    const slot = this.items.find((i) => !i.alive);
    if (!slot) return;
    const r = Math.random();
    let kind: DropItem['kind'] = 'score';
    if (r < 0.24) kind = this.power >= 5 ? 'score' : 'power';
    else if (r < 0.48) kind = 'bomb';
    else if (r < 0.62) kind = 'weapon';
    else kind = 'score';
    slot.alive = true;
    slot.x = Math.min(464, Math.max(16, x));
    slot.y = y;
    slot.vy = 120;
    slot.kind = kind;
    slot.t = 0;
  }

  private collectItem(kind: DropItem['kind'], x: number, y: number): void {
    switch (kind) {
      case 'score':
        this.addScore(600 + this.stage * 120);
        this.addText(x, y, `+${(600 + this.stage * 120).toLocaleString()}`, '#ffe14d');
        break;
      case 'power':
        if (this.power < 5) {
          this.power++;
          this.addText(x, y, 'POWER UP!', '#4dffa6');
        } else {
          this.addScore(1500);
          this.addText(x, y, '+1500', '#ffe14d');
        }
        break;
      case 'bomb':
        this.bombs = Math.min(5, this.bombs + 1);
        this.addText(x, y, '+1 BOMB', '#ff8ad4');
        break;
      case 'weapon':
        this.cycleWeapon();
        this.addScore(1000);
        break;
    }
    this.burst(x, y, 6, 0xffffff, 150);
  }

  private addScore(base: number): void {
    const mult = (1 + Math.min(this.chain, 150) * 0.01) * this.scoreMult;
    this.score += Math.round(base * mult);
    while (this.extendIdx < EXTENDS.length && this.score >= (EXTENDS[this.extendIdx] ?? Infinity)) {
      this.extendIdx++;
      if (this.lives < 5) this.lives++;
      this.events.push({ type: 'extend' });
      this.addText(this.px, this.py - 60, '1UP!', '#4dffa6');
    }
  }

  private buildResult(): RunResult {
    return {
      score: this.score, stage: this.stage, maxChain: this.maxChain,
      kills: this.kills, graze: this.graze, timeMs: Math.round(this.timeMs),
      cleared: this.cleared6, rank: rankFor(this.score, this.cleared6),
      difficulty: this.diff,
    };
  }

  // ---------------- fx pools ----------------

  burst(x: number, y: number, n: number, color: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      const p = this.particles.find((q) => !q.alive);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.7);
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = p.maxLife = 0.35 + Math.random() * 0.4;
      p.size = 2 + Math.random() * 4;
      p.color = color;
    }
  }

  spawnParticle(x: number, y: number, vx: number, vy: number, life: number, size: number, color: number): void {
    const p = this.particles.find((q) => !q.alive);
    if (!p) return;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = p.maxLife = life;
    p.size = size;
    p.color = color;
  }

  ring(x: number, y: number, vr: number, color: number): void {
    const r = this.rings.find((q) => !q.alive);
    if (!r) return;
    r.alive = true;
    r.x = x;
    r.y = y;
    r.r = 8;
    r.vr = vr;
    r.life = r.maxLife = 0.5;
    r.color = color;
  }

  addText(x: number, y: number, text: string, color: string): void {
    const t = this.texts.find((q) => !q.alive) ?? this.texts[0];
    if (!t) return;
    t.alive = true;
    t.x = Math.min(440, Math.max(40, x));
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

  private updateRings(dt: number): void {
    for (const r of this.rings) {
      if (!r.alive) continue;
      r.life -= dt;
      r.r += r.vr * dt;
      if (r.life <= 0) r.alive = false;
    }
  }
}
