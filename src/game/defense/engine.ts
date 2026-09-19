import {
  VIEW_W, VIEW_H, BARRICADE_Y, BASE_Y, TURRET_Y,
  WEAPONS, ENEMIES, planWave, pickKind,
  MAX_ALLIES,
  type WeaponId, type EnemyKind, type CourseDef, type DifficultyDef, type BarrelKind,
} from './config';
import type { DefenseSound } from './audio';

export interface HudSnapshot {
  score: number;
  coins: number;
  wave: number;
  totalWaves: number;
  endless: number;
  combo: number;
  weapon: WeaponId;
  weaponT: number;
  baseHp: number;
  baseMax: number;
  wallHp: number;
  wallMax: number;
  allies: number;
  kills: number;
  bossHp: number;
  bossMax: number;
  fps: number;
  waveActive: boolean;
}

export interface ShopSnapshot {
  wave: number;
  totalWaves: number;
  endless: number;
  coins: number;
  wallHp: number;
  wallMax: number;
  baseHp: number;
  baseMax: number;
  allies: number;
  powerLv: number;
  wallLv: number;
  costs: Record<string, number>;
  victory: boolean;
}

export interface RunResult {
  victory: boolean;
  score: number;
  wave: number;
  kills: number;
  coins: number;
  maxCombo: number;
  bossKills: number;
  maxAllies: number;
  endless: number;
  killsByKind: Record<EnemyKind, number>;
}

interface Bullet { x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; splash: number; slow: number; color: string; r: number; ally: boolean; life: number; }
interface Enemy {
  id: number; kind: EnemyKind; x: number; y: number; hp: number; maxHp: number;
  speed: number; radius: number; attacking: boolean; atkT: number; flash: number;
  slowT: number; wob: number; dead: boolean;
}
interface Barrel { id: number; kind: BarrelKind; x: number; y: number; vx: number; hp: number; weapon: WeaponId; spin: number; dead: boolean; }
interface Pod { id: number; x: number; y: number; hp: number; maxHp: number; sway: number; dead: boolean; }
interface Ally { id: number; slot: number; cd: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; grav: number; }
interface Floater { x: number; y: number; text: string; color: string; life: number; max: number; }
interface Shock { x: number; y: number; r: number; max: number; life: number; maxLife: number; color: string; }

export interface EngineCallbacks {
  onHud: (h: HudSnapshot) => void;
  onShop: (s: ShopSnapshot) => void;
  onGameOver: (r: RunResult) => void;
  onBanner: (title: string, sub: string) => void;
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

const BARREL_HP = 26;
const POD_HP = 34;

export class DefenseEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sound: DefenseSound;
  private cb: EngineCallbacks;
  private raf = 0;
  private last = 0;
  private running = false;
  private destroyed = false;

  private course!: CourseDef;
  private diff!: DifficultyDef;

  // run state
  private score = 0;
  private coins = 0;
  private wave = 0;
  private endless = 0;
  private kills = 0;
  private combo = 0;
  private comboT = 0;
  private maxCombo = 0;
  private weapon: WeaponId = 'pistol';
  private weaponT = 0;
  private powerLv = 0;
  private wallLv = 0;
  private baseMax = 100;
  private baseHp = 100;
  private wallMax = 140;
  private wallHp = 140;
  private victory = false;
  private over = false;
  private perksDmg = 1;
  private killsByKind: Record<EnemyKind, number> = { runner: 0, walker: 0, brute: 0, shield: 0, kamikaze: 0, boss: 0 };
  private bossKills = 0;
  private maxAlliesEver = 0;

  // wave state
  private waveActive = false;
  private spawnLeft = 0;
  private spawnT = 0;
  private spawnMin = 1;
  private spawnMax = 1.6;
  private bossSpawned = false;
  private bossRef: Enemy | null = null;
  private bossMinionT = 0;
  private bossSlamT = 0;
  private slamCount = 0;
  private barrelT = 4;
  private podT = 12;
  private shopOpen = false;

  // player
  private turretX = VIEW_W / 2;
  private aimX = VIEW_W / 2;
  private aimY = 200;
  private fireT = 0;
  private muzzle = 0;
  private keyDir = 0;

  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private barrels: Barrel[] = [];
  private pods: Pod[] = [];
  private allies: Ally[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private shocks: Shock[] = [];
  private nextId = 1;

  private trauma = 0;
  private time = 0;
  private fps = 60;
  private hudT = 0;
  private shakeEnabled = true;

  constructor(canvas: HTMLCanvasElement, sound: DefenseSound, cb: EngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.sound = sound;
    this.cb = cb;
  }

  start(course: CourseDef, diff: DifficultyDef, opts?: { shake?: boolean; perksDmg?: number; wallMax?: number; baseMax?: number }): void {
    this.course = course;
    this.diff = diff;
    this.shakeEnabled = opts?.shake !== false;
    this.perksDmg = opts?.perksDmg ?? 1;
    this.score = 0;
    this.coins = 20;
    this.wave = 0;
    this.endless = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboT = 0;
    this.maxCombo = 0;
    this.weapon = 'pistol';
    this.weaponT = 0;
    this.powerLv = 0;
    this.wallLv = 0;
    this.baseMax = opts?.baseMax ?? 100;
    this.baseHp = this.baseMax;
    this.wallMax = (opts?.wallMax ?? 140);
    this.wallHp = this.wallMax;
    this.killsByKind = { runner: 0, walker: 0, brute: 0, shield: 0, kamikaze: 0, boss: 0 };
    this.bossKills = 0;
    this.maxAlliesEver = 0;
    this.victory = false;
    this.over = false;
    this.shopOpen = false;
    this.bullets = [];
    this.enemies = [];
    this.barrels = [];
    this.pods = [];
    this.allies = [];
    this.particles = [];
    this.floaters = [];
    this.shocks = [];
    this.bossRef = null;
    this.trauma = 0;
    this.time = 0;
    this.fps = 60;
    this.hudT = 0;
    // player state reset
    this.turretX = VIEW_W / 2;
    this.aimX = VIEW_W / 2;
    this.aimY = 200;
    this.fireT = 0;
    this.muzzle = 0;
    this.keyDir = 0;
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.loop(this.last);
    this.nextWave();
  }

  destroy(): void {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setPaused(p: boolean): void {
    if (this.over || this.shopOpen) return;
    this.running = !p;
    if (!p) {
      this.last = performance.now();
      cancelAnimationFrame(this.raf);
      this.loop(this.last);
    }
  }

  get paused(): boolean {
    return !this.running;
  }

  setAim(x: number, y: number): void {
    this.aimX = clamp(x, 0, VIEW_W);
    this.aimY = clamp(y, 0, VIEW_H);
  }

  setKeyDir(d: number): void {
    this.keyDir = d;
  }

  costs(): Record<string, number> {
    return {
      repair: 40,
      wall: 60 + this.wallLv * 40,
      power: 80 + this.powerLv * 60,
      ally: 120,
      heal: 50,
    };
  }

  buy(id: string): boolean {
    const c = this.costs()[id];
    if (c === undefined || this.coins < c) return false;
    if (id === 'ally' && this.allies.length >= MAX_ALLIES) return false;
    if (id === 'repair' && this.wallHp >= this.wallMax) return false;
    if (id === 'heal' && this.baseHp >= this.baseMax) return false;
    this.coins -= c;
    if (id === 'repair') this.wallHp = this.wallMax;
    else if (id === 'wall') { this.wallLv++; this.wallMax += 40; this.wallHp = Math.min(this.wallMax, this.wallHp + 40); }
    else if (id === 'power') this.powerLv++;
    else if (id === 'ally') this.addAlly();
    else if (id === 'heal') this.baseHp = this.baseMax;
    this.sound.pickup();
    this.emitHud();
    return true;
  }

  /** Close shop and begin the next wave. */
  nextWave(): void {
    this.shopOpen = false;
    this.wave++;
    const total = this.course.waves;
    let planEndless = 0;
    let pw = this.wave;
    if (this.wave > total) {
      // endless loop: replay final wave with scaling
      this.endless++;
      planEndless = this.endless;
      pw = total;
      this.wave = total;
    }
    const plan = planWave(this.course, pw, this.diff, planEndless);
    this.spawnLeft = plan.budget;
    this.spawnMin = plan.interval[0];
    this.spawnMax = plan.interval[1];
    this.spawnT = 0.8;
    this.bossSpawned = false;
    this.bossRef = null;
    this.bossMinionT = 0;
    this.bossSlamT = 6;
    this.slamCount = 0;
    this.waveActive = true;
    this.barrelT = 3;
    this.podT = 10;
    if (plan.isBoss) {
      this.cb.onBanner(`WAVE ${this.wave} — 社長出社`, '残業の大群が定時を阻む！差し入れと同期を活用せよ');
    } else {
      const label = this.endless > 0 ? `WAVE ${this.wave} +∞${this.endless}` : `WAVE ${this.wave} / ${total}`;
      this.cb.onBanner(label, '残業の大群が定時を阻みに来た！');
    }
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.loop(this.last);
  }

  continueEndless(): void {
    this.wave = this.course.waves; // nextWave() will roll into endless
    this.nextWave();
  }

  private addAlly(): void {
    const id = this.nextId++;
    this.allies.push({ id, slot: this.allies.length, cd: 0.3 });
    this.maxAlliesEver = Math.max(this.maxAlliesEver, this.allies.length);
    this.floaters.push({ x: VIEW_W / 2, y: TURRET_Y - 70, text: '同期参戦！', color: '#4ade80', life: 1.4, max: 1.4 });
    this.sound.rescue();
  }

  private powerMult(): number {
    return (1 + this.powerLv * 0.15) * this.perksDmg;
  }

  // ---------------- loop ----------------

  private loop = (now: number): void => {
    if (this.destroyed || !this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;
    this.fps += ((1 / dt) - this.fps) * 0.05;
    this.time += dt;
    this.update(dt);
    this.render();
    this.hudT += dt;
    if (this.hudT > 0.12) {
      this.hudT = 0;
      this.emitHud();
    }
  };

  private emitHud(): void {
    this.cb.onHud({
      score: Math.floor(this.score),
      coins: Math.floor(this.coins),
      wave: this.wave,
      totalWaves: this.course.waves,
      endless: this.endless,
      combo: this.combo,
      weapon: this.weapon,
      weaponT: Math.max(0, this.weaponT),
      baseHp: Math.ceil(this.baseHp),
      baseMax: this.baseMax,
      wallHp: Math.ceil(this.wallHp),
      wallMax: this.wallMax,
      allies: this.allies.length,
      kills: this.kills,
      bossHp: this.bossRef ? Math.max(0, this.bossRef.hp) : 0,
      bossMax: this.bossRef ? this.bossRef.maxHp : 0,
      fps: Math.round(this.fps),
      waveActive: this.waveActive,
    });
  }

  private openShop(victory: boolean): void {
    this.shopOpen = true;
    this.waveActive = false;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.emitHud();
    this.cb.onShop(this.snapshotShop(victory));
  }

  snapshotShop(victory: boolean): ShopSnapshot {
    return {
      wave: this.wave,
      totalWaves: this.course.waves,
      endless: this.endless,
      coins: Math.floor(this.coins),
      wallHp: Math.ceil(this.wallHp),
      wallMax: this.wallMax,
      baseHp: Math.ceil(this.baseHp),
      baseMax: this.baseMax,
      allies: this.allies.length,
      powerLv: this.powerLv,
      wallLv: this.wallLv,
      costs: this.costs(),
      victory,
    };
  }

  /** Finish the run voluntarily (used after campaign victory). */
  completeRun(): void {
    if (!this.over) this.gameOver(true);
  }

  private gameOver(victory: boolean): void {
    if (this.over) return;
    this.over = true;
    this.victory = victory;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.sound.gameOver(victory);
    if (victory) {
      this.burst(VIEW_W / 2, 300, '#fde047', 80, 260);
      this.burst(VIEW_W / 2, 300, '#f472b6', 60, 220);
    }
    this.render();
    this.emitHud();
    this.cb.onGameOver({
      victory,
      score: Math.floor(this.score),
      wave: this.wave,
      kills: this.kills,
      coins: Math.floor(this.coins),
      maxCombo: this.maxCombo,
      bossKills: this.bossKills,
      maxAllies: this.maxAlliesEver,
      endless: this.endless,
      killsByKind: { ...this.killsByKind },
    });
  }

  // ---------------- update ----------------

  private update(dt: number): void {
    // combo decay
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    // weapon timer
    if (this.weaponT > 0) {
      this.weaponT -= dt;
      if (this.weaponT <= 0) {
        this.weapon = 'pistol';
        this.weaponT = 0;
        this.floaters.push({ x: this.turretX, y: TURRET_Y - 50, text: 'シャーペンに戻った', color: '#94a3b8', life: 1, max: 1 });
      }
    }
    // turret movement
    const targetX = this.aimX;
    this.turretX += (clamp(targetX, 30, VIEW_W - 30) - this.turretX) * Math.min(1, dt * 10);
    if (this.keyDir !== 0) this.turretX = clamp(this.turretX + this.keyDir * 260 * dt, 30, VIEW_W - 30);
    this.muzzle = Math.max(0, this.muzzle - dt);

    this.updateSpawning(dt);
    this.updateFiring(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateBarrels(dt);
    this.updatePods(dt);
    this.updateAllies(dt);
    this.updateFx(dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    // wave clear?
    if (this.waveActive && !this.over) {
      const bossAlive = this.bossRef && !this.bossRef.dead;
      if (this.spawnLeft <= 0 && this.enemies.length === 0 && !bossAlive) {
        this.waveActive = false;
        const bonus = 100 * this.wave;
        this.score += bonus;
        this.coins += 20 + this.wave * 5;
        this.sound.waveClear();
        if (this.wave >= this.course.waves && this.endless === 0) {
          // campaign final cleared → shop with victory flag (player can stop or go endless)
          this.victory = true;
          this.openShop(true);
        } else {
          this.openShop(false);
        }
      }
    }
    // defeat?
    if (this.baseHp <= 0 && !this.over) {
      this.baseHp = 0;
      this.burst(this.turretX, TURRET_Y, '#ef4444', 90, 320);
      this.trauma = 1;
      this.sound.boom();
      this.gameOver(false);
    }
  }

  private updateSpawning(dt: number): void {
    if (!this.waveActive || this.shopOpen || this.over) return;
    const planWaveNum = Math.min(this.wave, this.course.waves);
    const plan = planWave(this.course, planWaveNum, this.diff, this.endless);
    // boss wave: spawn boss first
    if (plan.isBoss && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnBoss();
    }
    if (this.spawnLeft > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = rand(this.spawnMin, this.spawnMax);
        const n = plan.isBoss ? 1 : Math.random() < 0.35 ? 2 : 1;
        for (let i = 0; i < n && this.spawnLeft > 0; i++) {
          this.spawnEnemy(pickKind(plan, Math.random()));
          this.spawnLeft--;
        }
      }
    }
    // boss trickle
    if (this.bossRef && !this.bossRef.dead) {
      this.bossMinionT -= dt;
      if (this.bossMinionT <= 0) {
        this.bossMinionT = 4.5;
        this.spawnEnemy(Math.random() < 0.5 ? 'runner' : 'walker');
      }
      this.bossSlamT -= dt;
      if (this.bossSlamT <= 0) {
        this.bossSlamT = 8;
        this.bossSlam();
      }
    }
    // barrels
    this.barrelT -= dt;
    if (this.barrelT <= 0) {
      this.barrelT = rand(5, 8.5);
      this.spawnBarrel();
    }
    // ally pods
    this.podT -= dt;
    if (this.podT <= 0) {
      this.podT = rand(14, 20);
      if (this.allies.length < MAX_ALLIES && this.pods.length === 0) this.spawnPod();
    }
  }

  private scaledHp(base: number): number {
    const waveScale = 1 + (Math.min(this.wave, this.course.waves) - 1) * 0.22 + this.endless * 0.35;
    return base * this.diff.hpMul * waveScale;
  }

  private spawnEnemy(kind: EnemyKind): void {
    const def = ENEMIES[kind];
    const hp = this.scaledHp(def.hp);
    this.enemies.push({
      id: this.nextId++,
      kind,
      x: rand(34, VIEW_W - 34),
      y: rand(-70, -20),
      hp, maxHp: hp,
      speed: def.speed * this.diff.speedMul * rand(0.9, 1.1),
      radius: def.radius,
      attacking: false,
      atkT: rand(0, 0.5),
      flash: 0,
      slowT: 0,
      wob: rand(0, Math.PI * 2),
      dead: false,
    });
  }

  private spawnBoss(): void {
    const def = ENEMIES.boss;
    const bulk = this.course.id === 'snow' ? 1.35 : this.course.id === 'desert' ? 1.15 : 1;
    const hp = this.scaledHp(def.hp) * bulk;
    const boss: Enemy = {
      id: this.nextId++,
      kind: 'boss',
      x: VIEW_W / 2,
      y: -60,
      hp, maxHp: hp,
      speed: def.speed,
      radius: def.radius,
      attacking: false,
      atkT: 0,
      flash: 0,
      slowT: 0,
      wob: 0,
      dead: false,
    };
    this.enemies.push(boss);
    this.bossRef = boss;
    this.sound.boom();
    this.trauma = Math.min(1, this.trauma + 0.5);
  }

  private bossSlam(): void {
    const boss = this.bossRef;
    if (!boss || boss.dead) return;
    this.slamCount++;
    if (this.slamCount === 1) {
      this.cb.onBanner('⚠️ 社長の喝！！', '定時の壁に大ダメージ');
    } else {
      this.floaters.push({ x: boss.x, y: boss.y + 60, text: '社長の喝！！', color: '#ef4444', life: 1.2, max: 1.2 });
    }
    this.shocks.push({ x: boss.x, y: boss.y + 40, r: 10, max: 200, life: 0.6, maxLife: 0.6, color: '#ef4444' });
    this.damageWall(30 * this.diff.dmgMul);
    this.trauma = Math.min(1, this.trauma + 0.6);
    this.sound.boom();
  }

  private spawnBarrel(): void {
    const roll = Math.random();
    const kind: BarrelKind = roll < 0.42 ? 'weapon' : roll < 0.62 ? 'bomb' : roll < 0.82 ? 'coin' : 'repair';
    const fromLeft = Math.random() < 0.5;
    const weapons: WeaponId[] = ['smg', 'shotgun', 'rifle', 'launcher', 'freeze'];
    this.barrels.push({
      id: this.nextId++,
      kind,
      x: fromLeft ? -24 : VIEW_W + 24,
      y: rand(250, 430),
      vx: (fromLeft ? 1 : -1) * rand(55, 95),
      hp: BARREL_HP * (1 + this.endless * 0.2),
      weapon: weapons[Math.floor(Math.random() * weapons.length)],
      spin: 0,
      dead: false,
    });
  }

  private spawnPod(): void {
    this.pods.push({
      id: this.nextId++,
      x: rand(80, VIEW_W - 80),
      y: -30,
      hp: POD_HP,
      maxHp: POD_HP,
      sway: rand(0, Math.PI * 2),
      dead: false,
    });
    this.floaters.push({ x: VIEW_W / 2, y: 200, text: '🆘 同期がSOS！撃って救出！', color: '#4ade80', life: 2, max: 2 });
  }

  // ---------------- firing ----------------

  private updateFiring(dt: number): void {
    if (this.over || this.shopOpen) return;
    this.fireT -= dt;
    if (this.fireT > 0) return;
    const w = WEAPONS[this.weapon];
    this.fireT = w.interval;
    const mx = this.turretX;
    const my = TURRET_Y - 26;
    const baseAng = Math.atan2(this.aimY - my, this.aimX - mx);
    // avoid shooting backwards: clamp to upward hemisphere
    const ang = clamp(baseAng, -Math.PI + 0.15, -0.15);
    const mult = this.powerMult();
    for (let i = 0; i < w.count; i++) {
      const spread = w.count === 1 ? (Math.random() - 0.5) * w.spread * 2 : ((i / (w.count - 1)) - 0.5) * w.spread * 2 + (Math.random() - 0.5) * 0.03;
      const a = ang + spread;
      this.bullets.push({
        x: mx + Math.cos(a) * 20,
        y: my + Math.sin(a) * 20,
        vx: Math.cos(a) * w.speed,
        vy: Math.sin(a) * w.speed,
        dmg: w.damage * mult,
        pierce: w.pierce,
        splash: w.splash,
        slow: w.slow,
        color: w.color,
        r: w.id === 'launcher' ? 6 : 4,
        ally: false,
        life: 1.8,
      });
    }
    this.muzzle = 0.06;
    if (w.id === 'shotgun' || w.id === 'launcher') this.sound.shotgun();
    else this.sound.shoot();
  }

  private updateAllies(dt: number): void {
    for (const a of this.allies) {
      a.cd -= dt;
      if (a.cd > 0) continue;
      const target = this.nearestEnemy(a.slot);
      if (!target) {
        a.cd = 0.2;
        continue;
      }
      a.cd = 0.55;
      const ax = this.allyX(a.slot);
      const ay = TURRET_Y - 46;
      const ang = Math.atan2(target.y - ay, target.x - ax);
      const sp = 560;
      this.bullets.push({
        x: ax, y: ay,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        dmg: 9 * this.powerMult(), pierce: 0, splash: 0, slow: 0,
        color: '#4ade80', r: 3, ally: true, life: 1.6,
      });
    }
  }

  private allyX(slot: number): number {
    const n = this.allies.length;
    const cx = this.turretX;
    if (n === 1) return clamp(cx - 56, 24, VIEW_W - 24);
    if (n === 2) return clamp(slot === 0 ? cx - 56 : cx + 56, 24, VIEW_W - 24);
    return clamp(cx + (slot - 1) * 56, 24, VIEW_W - 24);
  }

  private nearestEnemy(slot: number): Enemy | null {
    const ax = this.allyX(slot);
    let best: Enemy | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      // 壁に最も近い（= 最も危険な）敵を優先
      const d = Math.abs(e.x - ax) + (BARRICADE_Y - e.y) * 0.5;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // ---------------- collisions ----------------

  private updateBullets(dt: number): void {
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < -20 || b.x > VIEW_W + 20 || b.y < -30 || b.y > VIEW_H + 20 || b.life <= 0) {
        b.life = -1;
        continue;
      }
      // vs enemies
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const rr = e.radius + b.r;
        if (dx * dx + dy * dy < rr * rr) {
          this.hitEnemy(e, b.dmg * (e.kind === 'shield' ? 0.62 : 1), b.slow);
          if (b.splash > 0) {
            this.explode(b.x, b.y, b.splash, b.dmg * 0.8, '#c084fc');
          }
          if (b.pierce > 0) {
            b.pierce--;
            b.dmg *= 0.8;
          } else {
            b.life = -1;
          }
          break;
        }
      }
      if (b.life === -1) continue;
      if (!b.ally) {
        // vs barrels
        for (const br of this.barrels) {
          if (br.dead) continue;
          const dx = b.x - br.x;
          const dy = b.y - br.y;
          if (dx * dx + dy * dy < 22 * 22) {
            br.hp -= b.dmg;
            b.life = -1;
            this.spark(b.x, b.y, '#fbbf24', 4);
            if (br.hp <= 0) {
              br.dead = true;
              this.popBarrel(br);
            }
            break;
          }
        }
      }
      if (b.life === -1 || b.ally) continue;
      // vs pods
      for (const p of this.pods) {
        if (p.dead) continue;
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (dx * dx + dy * dy < 26 * 26) {
          p.hp -= b.dmg;
          b.life = -1;
          this.spark(b.x, b.y, '#4ade80', 4);
          this.sound.hit();
          if (p.hp <= 0) {
            p.dead = true;
            if (this.allies.length < MAX_ALLIES) {
              this.addAlly();
              this.score += 200;
            } else {
              this.coins += 30;
              this.score += 200;
              this.floaters.push({ x: p.x, y: p.y, text: '+30 残業代', color: '#fde047', life: 1.2, max: 1.2 });
            }
          }
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    this.barrels = this.barrels.filter((b) => !b.dead);
    this.pods = this.pods.filter((p) => !p.dead);
  }

  private hitEnemy(e: Enemy, dmg: number, slow: number): void {
    e.hp -= dmg;
    e.flash = 0.08;
    if (slow > 0) e.slowT = Math.max(e.slowT, 2.2);
    this.sound.hit();
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.killEnemy(e);
    }
  }

  private killEnemy(e: Enemy): void {
    const def = ENEMIES[e.kind];
    this.kills++;
    this.killsByKind[e.kind]++;
    if (e.kind === 'boss') this.bossKills++;
    this.combo++;
    this.comboT = 3;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const mult = this.diff.scoreMul * (1 + Math.min(this.combo, 50) * 0.02);
    const s = Math.round(def.score * mult);
    this.score += s;
    this.coins += def.coins;
    this.floaters.push({ x: e.x, y: e.y, text: `+${s}`, color: '#fde047', life: 0.9, max: 0.9 });
    if (this.combo > 0 && this.combo % 15 === 0) {
      this.floaters.push({ x: e.x, y: e.y - 24, text: `${this.combo}連撃！`, color: '#f472b6', life: 1.2, max: 1.2 });
    }
    const big = e.kind === 'brute' || e.kind === 'boss';
    this.burst(e.x, e.y, def.color, big ? 26 : 12, big ? 260 : 170);
    if (e.kind === 'kamikaze' || big) {
      this.explodeVisual(e.x, e.y, big ? 120 : 70, big ? '#ef4444' : '#f472b6');
      this.trauma = Math.min(1, this.trauma + (big ? 0.5 : 0.25));
      this.sound.boom();
    } else {
      this.sound.kill();
    }
    if (e.kind === 'boss') {
      this.bossRef = null;
      this.trauma = 1;
      this.floaters.push({ x: e.x, y: e.y - 40, text: '社長撃破！！', color: '#fde047', life: 2, max: 2 });
    }
  }

  private popBarrel(br: Barrel): void {
    this.burst(br.x, br.y, '#fbbf24', 18, 220);
    if (br.kind === 'weapon') {
      const w = WEAPONS[br.weapon];
      this.weapon = br.weapon;
      this.weaponT = w.duration;
      this.floaters.push({ x: br.x, y: br.y - 10, text: `${w.icon} ${w.name} GET！`, color: '#fde047', life: 1.6, max: 1.6 });
      this.sound.pickup();
    } else if (br.kind === 'bomb') {
      this.floaters.push({ x: br.x, y: br.y - 10, text: '💥 お局の雷！', color: '#fb923c', life: 1.2, max: 1.2 });
      this.explode(br.x, br.y, 135, 130 * this.powerMult(), '#fb923c');
      this.trauma = Math.min(1, this.trauma + 0.55);
      this.sound.boom();
    } else if (br.kind === 'coin') {
      this.coins += 25;
      this.floaters.push({ x: br.x, y: br.y - 10, text: '+25 残業代💴', color: '#fde047', life: 1.2, max: 1.2 });
      this.sound.pickup();
    } else {
      this.wallHp = Math.min(this.wallMax, this.wallHp + 55);
      this.floaters.push({ x: br.x, y: br.y - 10, text: '🧱 壁+55！後輩が補修！', color: '#38bdf8', life: 1.2, max: 1.2 });
      this.sound.pickup();
    }
  }

  private explode(x: number, y: number, radius: number, dmg: number, color: string): void {
    this.explodeVisual(x, y, radius, color);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy < radius * radius) {
        this.hitEnemy(e, dmg, 0);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  /** roundRect with fallback for older WebViews. */
  private rr(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  private explodeVisual(x: number, y: number, radius: number, color: string): void {    this.shocks.push({ x, y, r: 8, max: radius, life: 0.35, maxLife: 0.35, color });
    this.burst(x, y, color, 16, 240);
    this.burst(x, y, '#ffffff', 8, 160);
  }

  // ---------------- enemies / objects ----------------

  private updateEnemies(dt: number): void {
    const wallAlive = this.wallHp > 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      const slowMul = e.slowT > 0 ? 0.45 : 1;
      if (e.kind === 'boss') {
        // descend to y~150 then strafe
        if (e.y < 150) e.y += e.speed * dt * 2;
        else {
          e.wob += dt * 0.9;
          e.x = VIEW_W / 2 + Math.sin(e.wob) * 150;
        }
        // boss body-slams wall if it somehow reaches it — stays ranged instead
        continue;
      }
      if (!e.attacking) {
        e.wob += dt * 4;
        e.x += Math.sin(e.wob) * 12 * dt;
        e.y += e.speed * slowMul * dt;
        const targetY = wallAlive ? BARRICADE_Y - e.radius : BASE_Y - e.radius - 6;
        if (e.y >= targetY) {
          if (e.kind === 'kamikaze') {
            e.dead = true;
            this.kamikazeBlast(e, wallAlive);
            continue;
          }
          e.attacking = true;
          e.y = targetY;
        }
      } else {
        // chew through wall / base
        e.atkT -= dt;
        e.wob += dt * 10;
        if (e.atkT <= 0) {
          e.atkT = 0.8;
          const def = ENEMIES[e.kind];
          const dmg = def.damage * this.diff.dmgMul;
          if (wallAlive) {
            this.damageWall(dmg);
            this.spark(e.x, BARRICADE_Y - 8, '#f87171', 3);
          } else {
            this.damageBase(dmg * 0.7);
            this.spark(e.x, BASE_Y - 20, '#f87171', 3);
          }
          if (Math.random() < 0.3) this.sound.hurt();
        }
        // if wall rebuilt while attacking base... enemies stay on base. fine.
        if (wallAlive && e.y > BARRICADE_Y) {
          e.attacking = false;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  private kamikazeBlast(e: Enemy, wallAlive: boolean): void {
    this.explodeVisual(e.x, e.y, 70, '#f472b6');
    this.burst(e.x, e.y, '#f472b6', 20, 260);
    this.sound.boom();
    this.trauma = Math.min(1, this.trauma + 0.35);
    const dmg = ENEMIES.kamikaze.damage * this.diff.dmgMul;
    if (wallAlive) this.damageWall(dmg);
    else this.damageBase(dmg * 0.8);
    // splash nearby enemies? no — hurts player side only. small chain to other kamikazes for fun:
    for (const o of this.enemies) {
      if (o.dead || o === e) continue;
      const dx = o.x - e.x;
      const dy = o.y - e.y;
      if (dx * dx + dy * dy < 70 * 70 && o.kind === 'kamikaze') this.hitEnemy(o, 999, 0);
    }
    this.enemies = this.enemies.filter((x) => !x.dead);
  }

  private damageWall(d: number): void {
    if (this.wallHp <= 0) return;
    this.wallHp -= d;
    if (this.wallHp <= 0) {
      this.wallHp = 0;
      this.cb.onBanner('🧱 定時の壁崩壊！', '残業がプライベートに迫っている！');
      this.trauma = Math.min(1, this.trauma + 0.6);
      this.sound.boom();
      // release attackers forward
      for (const e of this.enemies) {
        if (!e.dead && e.kind !== 'boss') e.attacking = false;
      }
    }
  }

  private damageBase(d: number): void {
    this.baseHp -= d;
    this.trauma = Math.min(1, this.trauma + 0.25);
    if (this.baseHp < 0) this.baseHp = 0;
  }

  private updateBarrels(dt: number): void {
    for (const br of this.barrels) {
      br.x += br.vx * dt;
      br.spin += dt * 6;
      if (br.x < -40 || br.x > VIEW_W + 40) br.dead = true;
    }
    this.barrels = this.barrels.filter((b) => !b.dead);
  }

  private updatePods(dt: number): void {
    for (const p of this.pods) {
      p.sway += dt * 1.6;
      if (p.y < 250) p.y += 46 * dt;
      else p.x = clamp(p.x + Math.sin(p.sway) * 30 * dt, 50, VIEW_W - 50);
    }
  }

  private updateFx(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 34 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const s of this.shocks) {
      s.life -= dt;
      s.r += (s.max - s.r) * Math.min(1, dt * 10);
    }
    this.shocks = this.shocks.filter((s) => s.life > 0);
  }

  private burst(x: number, y: number, color: string, n: number, spd: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(spd * 0.3, spd);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: rand(0.3, 0.7), max: 0.7,
        color, size: rand(2, 5), grav: 300,
      });
    }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  private spark(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(40, 160);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: rand(0.15, 0.35), max: 0.35,
        color, size: rand(1.5, 3), grav: 0,
      });
    }
  }

  // ---------------- render ----------------

  private render(): void {
    const ctx = this.ctx;
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const cw = this.canvas.width / dpr;
    const ch = this.canvas.height / dpr;
    const sx = cw / VIEW_W;
    const sy = ch / VIEW_H;
    const s = Math.min(sx, sy);
    const ox = (cw - VIEW_W * s) / 2;
    const oy = (ch - VIEW_H * s) / 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, cw, ch);
    ctx.translate(ox, oy);
    ctx.scale(s, s);

    // shake
    if (this.shakeEnabled && this.trauma > 0) {
      const m = this.trauma * this.trauma * 10;
      ctx.translate(rand(-m, m), rand(-m, m));
    }
    // clip to view
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.clip();

    this.drawBackground(ctx);
    this.drawWall(ctx);
    this.drawPods(ctx);
    this.drawBarrels(ctx);
    this.drawEnemies(ctx);
    this.drawAllies(ctx);
    this.drawTurret(ctx);
    this.drawBullets(ctx);
    this.drawFx(ctx);
    this.drawBase(ctx);
    this.drawAim(ctx);

    ctx.restore();

    // letterbox handled by outer fill; vignette
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 1, oy + 1, VIEW_W * s - 2, VIEW_H * s - 2);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const [top, mid] = this.course ? this.course.sky : ['#0b1026', '#1e2a5a'];
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, top);
    g.addColorStop(0.62, mid);
    g.addColorStop(0.62, this.course ? this.course.ground : '#1f2937');
    g.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + 13) % VIEW_W;
      const y = (i * 61 + 7) % 440;
      ctx.globalAlpha = 0.25 + ((i * 37) % 50) / 120;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    // horizon silhouettes
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    for (let i = 0; i < 12; i++) {
      const w = 30 + ((i * 53) % 40);
      const h = 26 + ((i * 29) % 46);
      ctx.fillRect(i * 42 - 10, 496 - h, w, h);
    }
    // lane line
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(VIEW_W / 2, 0);
    ctx.lineTo(VIEW_W / 2, BARRICADE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawWall(ctx: CanvasRenderingContext2D): void {
    if (this.wallHp <= 0) {
      // rubble
      ctx.fillStyle = 'rgba(120,90,60,0.5)';
      for (let i = 0; i < 10; i++) {
        ctx.fillRect(20 + i * 44 + ((i * 31) % 12), BARRICADE_Y - 4, 26, 8);
      }
      return;
    }
    const frac = this.wallHp / this.wallMax;
    const segs = 12;
    const lit = Math.ceil(frac * segs);
    for (let i = 0; i < segs; i++) {
      const x = 14 + i * ((VIEW_W - 28) / segs);
      const w = (VIEW_W - 28) / segs - 3;
      ctx.fillStyle = i < lit ? (frac > 0.5 ? '#b45309' : frac > 0.25 ? '#c2410c' : '#7f1d1d') : 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, BARRICADE_Y - 22, w, 22);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, BARRICADE_Y - 22, w, 4);
    }
    // sandbags
    ctx.font = '14px sans-serif';
    ctx.fillText('🧱', 4, BARRICADE_Y - 6);
  }

  private drawBase(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, BASE_Y, VIEW_W, VIEW_H - BASE_Y);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(30, BASE_Y + 8, VIEW_W - 60, 26);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(30, BASE_Y + 8, (VIEW_W - 60) * clamp(this.baseHp / this.baseMax, 0, 1), 26);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏠 自宅 ${Math.ceil(this.baseHp)}`, VIEW_W / 2, BASE_Y + 27);
    ctx.textAlign = 'left';
  }

  private drawTurret(ctx: CanvasRenderingContext2D): void {
    const mx = this.turretX;
    const my = TURRET_Y - 10;
    const ang = clamp(Math.atan2(this.aimY - (TURRET_Y - 26), this.aimX - mx), -Math.PI + 0.15, -0.15);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(mx, TURRET_Y + 16, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // barrel
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang + Math.PI / 2);
    const w = WEAPONS[this.weapon];
    ctx.fillStyle = w.color;
    ctx.fillRect(-5, -30, 10, 30);
    ctx.fillStyle = '#111827';
    ctx.fillRect(-7, -8, 14, 10);
    ctx.restore();
    // body
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(mx, my, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = w.color;
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(w.icon, mx, my + 5);
    ctx.textAlign = 'left';
    if (this.muzzle > 0) {
      ctx.fillStyle = 'rgba(253,224,71,0.9)';
      ctx.beginPath();
      ctx.arc(mx + Math.cos(ang) * 34, my + Math.sin(ang) * 34, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAllies(ctx: CanvasRenderingContext2D): void {
    this.allies.forEach((a, i) => {
      const x = this.allyX(i);
      const y = TURRET_Y - 46;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + 14, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#052e16';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🤝', x, y + 4);
      ctx.textAlign = 'left';
    });
  }

  private drawEnemies(ctx: CanvasRenderingContext2D): void {
    for (const e of this.enemies) {
      const bob = e.attacking ? Math.sin(e.wob) * 2 : Math.sin(e.wob) * 3;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.radius, e.radius * 0.9, e.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : ENEMIES[e.kind].color;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, e.radius, 0, Math.PI * 2);
      ctx.fill();
      if (e.slowT > 0) {
        ctx.strokeStyle = '#a5f3fc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      const fs = e.kind === 'boss' ? 40 : e.radius + 8;
      ctx.font = `${fs}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ENEMIES[e.kind].emoji, e.x, e.y + bob + fs * 0.35);
      ctx.textAlign = 'left';
      // hp bar
      const frac = clamp(e.hp / e.maxHp, 0, 1);
      const bw = e.kind === 'boss' ? 120 : e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw, e.kind === 'boss' ? 9 : 5);
      ctx.fillStyle = frac > 0.5 ? '#4ade80' : frac > 0.25 ? '#facc15' : '#ef4444';
      ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw * frac, e.kind === 'boss' ? 9 : 5);
    }
  }

  private drawBarrels(ctx: CanvasRenderingContext2D): void {
    for (const br of this.barrels) {
      // glow hint by kind
      const glow = br.kind === 'weapon' ? '#fde047' : br.kind === 'bomb' ? '#fb923c' : br.kind === 'coin' ? '#facc15' : '#38bdf8';
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(br.x, br.y + 20, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(br.x, br.y);
      ctx.rotate(Math.sin(br.spin) * 0.35);
      // 差し入れ段ボール
      ctx.fillStyle = '#a16207';
      this.rr(-17, -17, 34, 34, 5);
      ctx.fill();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2.5;
      this.rr(-17, -17, 34, 34, 5);
      ctx.stroke();
      ctx.fillStyle = '#713f12';
      ctx.fillRect(-17, -3, 34, 6);
      ctx.fillRect(-3, -17, 6, 34);
      const icon = br.kind === 'weapon' ? WEAPONS[br.weapon].icon : br.kind === 'bomb' ? '⚡' : br.kind === 'coin' ? '💴' : '🧱';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, 0, 7);
      ctx.textAlign = 'left';
      ctx.restore();
      // hp pips
      const frac = clamp(br.hp / (BARREL_HP * (1 + this.endless * 0.2)), 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(br.x - 16, br.y - 28, 32, 4);
      ctx.fillStyle = glow;
      ctx.fillRect(br.x - 16, br.y - 28, 32 * frac, 4);
    }
  }

  private drawPods(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pods) {
      const pulse = 1 + Math.sin(p.sway * 2) * 0.06;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(74,222,128,0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#064e3b';
      this.rr(-20, -24, 40, 48, 10);
      ctx.fill();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      this.rr(-20, -24, 40, 48, 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🙋', 0, 2);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText('SOS', 0, 20);
      ctx.textAlign = 'left';
      ctx.restore();
      const frac = clamp(p.hp / p.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(p.x - 20, p.y - 34, 40, 5);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(p.x - 20, p.y - 34, 40 * frac, 5);
    }
  }

  private drawBullets(ctx: CanvasRenderingContext2D): void {
    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFx(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const s of this.shocks) {
      ctx.globalAlpha = clamp(s.life / s.maxLife, 0, 1);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  private drawAim(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(253,224,71,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.aimX, this.aimY, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.aimX - 18, this.aimY);
    ctx.lineTo(this.aimX - 6, this.aimY);
    ctx.moveTo(this.aimX + 6, this.aimY);
    ctx.lineTo(this.aimX + 18, this.aimY);
    ctx.moveTo(this.aimX, this.aimY - 18);
    ctx.lineTo(this.aimX, this.aimY - 6);
    ctx.moveTo(this.aimX, this.aimY + 6);
    ctx.lineTo(this.aimX, this.aimY + 18);
    ctx.stroke();
  }
}
