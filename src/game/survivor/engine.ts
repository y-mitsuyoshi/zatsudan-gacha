/**
 * 社畜サバイバー — core game engine (Canvas2D, infinite office floor).
 * Player moves, weapons fire automatically. Survive 10:00 (9:00 -> 18:00).
 */

import {
  VIEW_W, VIEW_H, RUN_SECONDS, MAX_ENEMIES, MAX_PROJECTILES, MAX_PARTICLES,
  MAX_DMG_NUMBERS, MAX_GEMS, WEAPON_ORDER, PASSIVE_ORDER, ENEMIES, BOSS_SCHEDULE,
  DIFFICULTIES, xpForLevel, MAX_WEAPON_SLOTS, MAX_PASSIVE_SLOTS,
  WEAPONS, PASSIVES,
  type WeaponId, type PassiveId, type EnemyKind, type Difficulty,
} from './config';
import type { SurvivorSound } from './audio';

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
  kind: 'shuriken' | 'coffee' | 'boomerang' | 'missile';
  color: string; blast: number; homing: number; age: number;
  hit: Set<Enemy>;
}

interface EnemyProj { x: number; y: number; vx: number; vy: number; dmg: number; radius: number; life: number }

interface Gem { x: number; y: number; vx: number; vy: number; val: number }
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

  private paused = false;
  private levelPending = false;
  private over = false;
  private endless = false;

  // run state
  private time = 0;
  private kills = 0;
  private score = 0;
  private coins = 0;
  private diff = DIFFICULTIES.normal;
  private meta = { dmgMul: 1, maxHpBonus: 0, speedMul: 1, magnetMul: 1 };

  // player
  private px = 0; private py = 0;
  private hp = 100; private maxHp = 100;
  private level = 1; private xp = 0; private xpNext = xpForLevel(1);
  private iframes = 0;
  private moveX = 0; private moveY = 0;
  private weapons: OwnedWeapon[] = [];
  private passives: OwnedPassive[] = [];
  private pendingLevels = 0;
  private rerollLeft = 1;
  private banishLeft = 1;
  private banned = new Set<string>();
  private barrierAngle = 0;
  private walkPhase = 0;

  // world
  private enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private eprojs: EnemyProj[] = [];
  private gems: Gem[] = [];
  private coinPs: CoinP[] = [];
  private pickups: Pickup[] = [];
  private rings: Ring[] = [];
  private booms: Boom[] = [];
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
    this.meta = { dmgMul: opts.dmgMul, maxHpBonus: opts.maxHpBonus, speedMul: opts.speedMul, magnetMul: opts.magnetMul };
    this.time = 0; this.kills = 0; this.score = 0; this.coins = 0;
    this.px = 0; this.py = 0;
    this.maxHp = 100 + opts.maxHpBonus;
    this.hp = this.maxHp;
    this.level = 1; this.xp = 0; this.xpNext = xpForLevel(1);
    this.iframes = 0;
    this.weapons = [{ id: 'shuriken', lv: 1, cd: 0.4 }];
    this.passives = [];
    this.pendingLevels = 0; this.rerollLeft = 1; this.banishLeft = 1;
    this.banned = new Set();
    this.enemies = []; this.projs = []; this.eprojs = []; this.gems = [];
    this.coinPs = []; this.pickups = []; this.rings = []; this.booms = [];
    this.parts = []; this.nums = [];
    this.spawnT = 0.5; this.bossIdx = 0;
    this.chests = 0; this.gemsCollected = 0; this.killsByKind = {};
    this.paused = false; this.levelPending = false; this.over = false; this.endless = false;
    this.last = performance.now();
    if (!this.running) {
      this.running = true;
      const loop = (now: number) => {
        if (this.destroyed) return;
        const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        if (!this.paused && !this.levelPending && !this.over) this.update(dt);
        this.render();
        this.hudT += dt;
        if (this.hudT >= 0.12) { this.hudT = 0; this.emitHud(); }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    this.emitHud();
    this.ev.onBanner('🏢 出社！', '定時まで生き残れ！やる気を集めて強化しよう');
  }

  destroy(): void {
    this.destroyed = true;
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
    this.bossIdx = 0;
    this.ev.onBanner('♾️ 残業突入！', '終わらない残業…どこまで耐えられるか');
    this.emitHud();
  }

  /* ----- derived stats ----- */

  private passiveLv(id: PassiveId): number {
    return this.passives.find((p) => p.id === id)?.lv ?? 0;
  }
  private dmgMul(): number { return (1 + 0.08 * this.passiveLv('power')) * this.meta.dmgMul; }
  private speed(): number { return 215 * (1 + 0.06 * this.passiveLv('shoes')) * this.meta.speedMul; }
  private magnetR(): number { return 95 * (1 + 0.25 * this.passiveLv('magnet')) * this.meta.magnetMul; }
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
          ? { kind: 'bonus', id: `heal${picks.length}`, name: '社食弁当', icon: '🍱', desc: 'HPを50%回復', toLv: 0, isNew: false }
          : { kind: 'bonus', id: `coins${picks.length}`, name: '臨時ボーナス', icon: '💰', desc: '残業代 +50', toLv: 0, isNew: false },
      );
    }
    // ensure fallback variety
    if (pool.length === 0) {
      picks[0] = { kind: 'bonus', id: 'heal0', name: '社食弁当', icon: '🍱', desc: 'HPを50%回復', toLv: 0, isNew: false };
      picks[1] = { kind: 'bonus', id: 'coins1', name: '臨時ボーナス', icon: '💰', desc: '残業代 +50', toLv: 0, isNew: false };
      picks[2] = { kind: 'bonus', id: 'heal2', name: '栄養ドリンク', icon: '🥤', desc: 'HPを全回復', toLv: 0, isNew: false };
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
    this.time += dt;
    const t = this.time;

    // victory
    if (!this.endless && t >= RUN_SECONDS) {
      this.finishRun(true);
      return;
    }

    // movement
    const mx = this.moveX; const my = this.moveY;
    const len = Math.hypot(mx, my);
    if (len > 0.01) {
      const sp = this.speed();
      this.px += (mx / Math.max(1, len)) * sp * dt * Math.min(1, len);
      this.py += (my / Math.max(1, len)) * sp * dt * Math.min(1, len);
      this.walkPhase += dt * 10;
    }
    if (this.iframes > 0) this.iframes -= dt;
    const rg = this.regen();
    if (rg > 0 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + rg * dt);

    // boss schedule
    while (this.bossIdx < BOSS_SCHEDULE.length && t >= BOSS_SCHEDULE[this.bossIdx].atSec) {
      const b = BOSS_SCHEDULE[this.bossIdx];
      this.bossIdx += 1;
      this.spawnBoss(b.kind);
      this.ev.onBanner(b.title, b.sub);
      this.sound.boss();
      this.shake(0.4, 6);
    }
    // endless extra bosses
    if (this.endless && Math.floor(t) % 90 === 0 && Math.floor(t - dt) % 90 !== 0) {
      this.spawnBoss(Math.random() < 0.5 ? 'exec' : 'senmu');
      this.ev.onBanner('⚠️ 増援役員！', '残業はまだ終わらない…');
    }

    // director
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.enemies.length < MAX_ENEMIES) {
      const interval = Math.max(0.22, 1.05 - t * 0.0013) / this.diff.countMul;
      this.spawnT = interval * rand(0.7, 1.2);
      const batch = 1 + Math.floor(t / 75);
      for (let i = 0; i < batch; i++) this.spawnTrash();
    }

    this.updateWeapons(dt);
    this.updateProjs(dt);
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
    return (1 + t * 0.011 + Math.pow(t / 60, 1.6) * 0.25) * this.diff.hpMul;
  }
  private dmgScale(): number {
    return (1 + this.time * 0.0018) * this.diff.dmgMul;
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
    return {
      o: true, kind, x, y, hp, maxHp: hp,
      spd: d.speed * rand(0.9, 1.1) * Math.min(1.3, 1 + this.time * 0.0004),
      dmg: d.damage * this.dmgScale() * (elite ? 1.3 : 1),
      xp: d.xp * (elite ? 5 : 1), coins: d.coins * (elite ? 5 : 1),
      radius: d.radius * (elite ? 1.35 : 1) * (boss ? 1.15 : 1),
      icon: d.icon, color: d.color,
      hitCd: 0, flash: 0, kx: 0, ky: 0,
      elite, boss, ranged: d.ranged, splitter: d.splitter, score: d.score * (elite ? 5 : 1) * (boss ? 3 : 1),
      shootCd: rand(1, 2.5), dashCd: rand(3, 5), dashT: 0, summonCd: 4,
      barrierCd: 0, boomHit: 0,
    };
  }

  private spawnTrash(): void {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const kind = this.pickTrashKind();
    const p = this.spawnPos();
    const elite = this.time > 120 && Math.random() < (this.time > 300 ? 0.06 : 0.04);
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
          const { dmg } = this.critRoll(11 * (1 + 0.28 * (w.lv - 1)) * dm);
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
          const { dmg } = this.critRoll(8 * (1 + 0.28 * (w.lv - 1)) * dm);
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
          const { dmg } = this.critRoll(15 * (1 + 0.3 * (w.lv - 1)) * dm);
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
          const { dmg } = this.critRoll(32 * (1 + 0.3 * (w.lv - 1)) * dm);
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
          const { dmg } = this.critRoll(26 * (1 + 0.3 * (w.lv - 1)) * dm);
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
          const { dmg } = this.critRoll(13 * (1 + 0.28 * (w.lv - 1)) * dm);
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
          const { dmg } = this.critRoll(22 * (1 + 0.32 * (w.lv - 1)) * dm);
          this.rings.push({
            x: this.px, y: this.py, r: 30, maxR: 190 + 22 * w.lv,
            dmg, knock: 430, width: 30, color: '#fde047', hit: new Set(),
          });
          this.sound.hit();
          break;
        }
      }
    }

    // barrier damage
    const barrier = this.weapons.find((w) => w.id === 'barrier');
    if (barrier) {
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

  private updateProjs(dt: number): void {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.age += dt;
      p.life -= dt;
      if (p.kind === 'boomerang' && p.age > 0.45) {
        const a = Math.atan2(this.py - p.y, this.px - p.x);
        const sp = 460;
        p.vx += (Math.cos(a) * sp - p.vx) * Math.min(1, 5 * dt);
        p.vy += (Math.sin(a) * sp - p.vy) * Math.min(1, 5 * dt);
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
    const pr = 16;
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
        this.iframes = 0.5;
        this.hp -= Math.max(1, Math.round(e.dmg));
        this.sound.hurt();
        this.burst(this.px, this.py, '#ef4444', 10, 200);
        this.shake(0.25, 5);
        if (this.hp <= 0) { this.hp = 0; }
      }
    }
    // separation (cheap: only push overlapping pairs within grid... simple O(n) jitter for perf)
    // skip full separation; knockback + contact is enough.
  }

  private updateEprojs(dt: number): void {
    for (let i = this.eprojs.length - 1; i >= 0; i--) {
      const p = this.eprojs[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let dead = p.life <= 0;
      if (!dead && this.iframes <= 0) {
        const rr = p.radius + 14;
        if (dist2(p.x, p.y, this.px, this.py) < rr * rr) {
          dead = true;
          this.iframes = 0.5;
          this.hp -= Math.max(1, Math.round(p.dmg));
          this.sound.hurt();
          this.burst(this.px, this.py, '#ef4444', 8, 180);
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
    if (this.nums.length < MAX_DMG_NUMBERS) {
      this.nums.push({ x: e.x + rand(-8, 8), y: e.y - e.radius - 4, val: Math.round(final), life: 0.6, crit });
    }
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
    // drops
    if (this.gems.length < MAX_GEMS) {
      const big = e.xp >= 15;
      const n = big ? Math.min(5, 1 + Math.floor(e.xp / 20)) : 1;
      for (let i = 0; i < n; i++) {
        this.gems.push({ x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: rand(-60, 60), vy: rand(-60, 60), val: Math.ceil(e.xp / n) });
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
      const d2 = dist2(g.x, g.y, this.px, this.py);
      if (d2 < mr2) {
        const d = Math.max(1, Math.sqrt(d2));
        const pull = 700 * (1 - d / (mr + 1)) + 200;
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
        this.gainXp(Math.round(g.val * this.diff.xpMul));
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
        this.coins += c.val;
        this.score += c.val * 5;
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
      this.ev.onBanner('🍱 差し入れ！', 'HPが25回復した');
      this.sound.heal();
    } else if (kind === 'magnet') {
      for (const g of this.gems) {
        g.vx = (this.px - g.x) * 3;
        g.vy = (this.py - g.y) * 3;
      }
      this.ev.onBanner('🧲 定期券パワー！', 'やる気を一気に引き寄せた');
      this.sound.pickup();
    } else if (kind === 'bomb') {
      this.ev.onBanner('💥 全部壊したれ！', '画面内の敵に大ダメージ！');
      const targets = [...this.enemies];
      for (const e of targets) this.damageEnemy(e, 160 * this.dmgMul(), 300, this.px, this.py, true);
      this.shake(0.4, 8);
      this.sound.chest();
    } else {
      // chest: coins + random upgrade
      this.chests += 1;
      const bonus = 30 + Math.floor(this.time / 10);
      this.coins += bonus;
      const upgradable = this.weapons.filter((w) => w.lv < weaponDefOf(w.id).maxLv);
      if (upgradable.length > 0 && (this.weapons.length < MAX_WEAPON_SLOTS || Math.random() < 0.8)) {
        const w = upgradable[Math.floor(Math.random() * upgradable.length)];
        w.lv += 1;
        this.ev.onBanner('🎁 宝箱！', `${weaponDefOf(w.id).name}がLv${w.lv}にアップ！ +🪙${bonus}`);
      } else {
        this.hp = Math.min(this.maxHp, this.hp + 40);
        this.ev.onBanner('🎁 宝箱！', `HPが40回復！ +🪙${bonus}`);
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
    });
  }

  /* ----- render ----- */

  private render(): void {
    const { ctx } = this;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.save();
    ctx.scale(dpr, dpr);
    const W = VIEW_W; const H = VIEW_H;

    let sx = 0; let sy = 0;
    if (this.shakeT > 0) {
      sx = rand(-this.shakeMag, this.shakeMag);
      sy = rand(-this.shakeMag, this.shakeMag);
    }
    const camX = this.px - W / 2 + sx;
    const camY = this.py - H / 2 + sy;

    // floor
    const night = Math.max(0, Math.min(1, (this.time - 420) / 180));
    ctx.fillStyle = night > 0.5 ? '#0d1226' : '#141a2e';
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
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
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🪴', dx + 62, dy + 26);
          }
        }
      }
    }

    const sx2 = (x: number) => x - camX;
    const sy2 = (y: number) => y - camY;

    // gems
    for (const g of this.gems) {
      const x = sx2(g.x); const y = sy2(g.y);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      ctx.fillStyle = g.val >= 15 ? '#f87171' : g.val >= 5 ? '#60a5fa' : '#4ade80';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      const s = g.val >= 15 ? 7 : 5;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
    // coins
    for (const c of this.coinPs) {
      const x = sx2(c.x); const y = sy2(c.y);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // pickups
    ctx.textAlign = 'center';
    for (const p of this.pickups) {
      const x = sx2(p.x); const y = sy2(p.y) + Math.sin(p.bob * 4) * 3;
      if (x < -30 || y < -30 || x > W + 30 || y > H + 30) continue;
      if (p.kind === 'chest') {
        ctx.fillStyle = 'rgba(251,191,36,0.25)';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '26px sans-serif';
      ctx.fillText(p.kind === 'heal' ? '🍱' : p.kind === 'magnet' ? '🧲' : p.kind === 'bomb' ? '💥' : '🎁', x, y + 9);
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

    // enemies
    for (const e of this.enemies) {
      const x = sx2(e.x); const y = sy2(e.y);
      if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + e.radius * 0.8, e.radius * 0.8, e.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(x, y, e.radius, 0, Math.PI * 2);
      ctx.fill();
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
      if (e.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(x, y, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `${Math.round(e.radius * 1.25)}px sans-serif`;
      ctx.fillText(e.icon, x, y + e.radius * 0.45);
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

    // projectiles
    for (const p of this.projs) {
      const x = sx2(p.x); const y = sy2(p.y);
      if (p.kind === 'shuriken') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-9, -5, 18, 10);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-2, -5, 4, 10);
        ctx.restore();
      } else if (p.kind === 'coffee') {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'boomerang') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.age * 12);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-12, -4, 24, 8);
        ctx.restore();
        ctx.font = '12px sans-serif';
        ctx.fillText('💳', x, y + 4);
      } else {
        ctx.font = '16px sans-serif';
        ctx.fillText('📞', x, y + 6);
      }
    }

    // player barrier orbs
    const barrier = this.weapons.find((w) => w.id === 'barrier');
    if (barrier && this.hp > 0) {
      const orbs = 1 + Math.ceil(barrier.lv / 2);
      const radius = 66 + 5 * barrier.lv;
      ctx.font = '20px sans-serif';
      for (let i = 0; i < orbs; i++) {
        const a = this.barrierAngle + (i * Math.PI * 2) / orbs;
        ctx.fillText('🗒️', this.px - camX + Math.cos(a) * radius, this.py - camY + Math.sin(a) * radius + 7);
      }
    }

    // player
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
      if (!blink) {
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        const bob = Math.abs(Math.sin(this.walkPhase)) * 2;
        ctx.font = '26px sans-serif';
        ctx.fillText('🧑‍💼', x, y + 9 - bob);
      }
    }

    // particles
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx2(p.x) - p.size / 2, sy2(p.y) - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // damage numbers
    ctx.textAlign = 'center';
    for (const n of this.nums) {
      const a = Math.min(1, n.life / 0.4);
      ctx.globalAlpha = a;
      ctx.font = n.crit ? 'bold 15px sans-serif' : 'bold 12px sans-serif';
      ctx.fillStyle = n.crit ? '#fde047' : '#ffffff';
      ctx.fillText(String(n.val), sx2(n.x), sy2(n.y));
    }
    ctx.globalAlpha = 1;

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
