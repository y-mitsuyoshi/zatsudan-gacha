import * as THREE from 'three';
import {
  VIEW_W, VIEW_H,
  WEAPONS, ENEMIES, planWave, pickKind, courseLength, MAX_ALLIES,
  type WeaponId, type EnemyKind, type CourseDef, type DifficultyDef, type BarrelKind,
} from './config';
import type { DefenseSound } from './audio';
import {
  buildSalarymanMesh,
  buildBarricadeMesh,
  buildGateMesh,
  buildEnemyMesh,
  buildTrainBossMesh,
  buildCrateMesh,
  buildCageMesh,
  updateSalarymanAnimation,
  updateBarricadeDurability,
  updateGateCurtain,
  updateCageAnimation,
  type GateOp,
} from './models';
import { TraumaScreenShake, HitStopManager } from '../common/juice';

/* ============ snapshots (component bridge — field names kept stable) ============ */

export interface HudSnapshot {
  score: number;
  coins: number;
  wave: number;
  totalWaves: number;
  endless: number;
  combo: number;
  weapon: WeaponId;
  weaponT: number;
  baseHp: number; // 体力
  baseMax: number;
  wallHp: number; // 通勤ガード
  wallMax: number;
  allies: number;
  kills: number;
  bossHp: number;
  bossMax: number;
  fps: number;
  waveActive: boolean;
  distLeft: number; // 会社までの残りm
  distTotal: number;
  /** ゲートで得た恒久バフ倍率（HUD表示用） */
  runDmgMul: number;
  lastGate: string; // 直近のゲート効果テキスト
  gaugeName: string; // コース固有名
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
  dist: number;
  killsByKind: Record<EnemyKind, number>;
}

export interface EngineCallbacks {
  onHud: (h: HudSnapshot) => void;
  onShop: (s: ShopSnapshot) => void;
  onGameOver: (r: RunResult) => void;
  onBanner: (title: string, sub: string) => void;
}

/* ============ world constants ============ */

const SPAWN_Z = -58;
const SCROLL = 8.5; // world scroll speed (units/s)
const HERO_Z = 0;
const BARRICADE_Z = -1.1;
const X_LIMIT = 4.3;
const LANES = [-3.4, -1.7, 0, 1.7, 3.4];
const CRATE_HP = 26;
const CAGE_HP = 40;

const MAX_BOLTS = 250;
const MAX_PARTICLES = 320;
const MAX_RINGS = 24;
const MAX_FLOATERS = 36;

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}
function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============ entity types ============ */

interface Foe {
  g: THREE.Group;
  kind: EnemyKind;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  walk: number;
  radius: number;
  dmg: number;
  flash: number;
  slowT: number;
  wob: number;
  dead: boolean;
  elite: boolean;
  isBoss: boolean;
  slamT: number;
  minionT: number;
  hpBarGroup?: THREE.Group;
  hpBarFill?: THREE.Mesh;
}

interface PooledBolt {
  m: THREE.Mesh;
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  vx: number;
  vz: number;
  dmg: number;
  pierce: number;
  splash: number;
  slow: number;
  life: number;
  ally: boolean;
  active: boolean;
}

interface Crate {
  g: THREE.Group;
  kind: BarrelKind;
  x: number;
  z: number;
  hp: number;
  weapon: WeaponId;
  dead: boolean;
}

interface Cage {
  g: THREE.Group;
  x: number;
  z: number;
  hp: number;
  dead: boolean;
  hpBarGroup?: THREE.Group;
  hpBarFill?: THREE.Mesh;
}

interface GateDef {
  op: GateOp;
  val: number;
  label: string;
  isGood: boolean;
  apply: () => void;
}

interface Gate {
  g: THREE.Group;
  z: number;
  left: GateDef;
  right: GateDef;
  leftMesh: THREE.Group;
  rightMesh: THREE.Group;
  done: boolean;
}

interface PooledParticle {
  m: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  active: boolean;
}

interface PooledRing {
  m: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  max: number;
  grow: number;
  active: boolean;
}

interface PooledFloater {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  life: number;
  max: number;
  active: boolean;
}

interface Ally {
  g: THREE.Group;
  vx: number;
  vz: number;
  cd: number;
}

/* ============ engine ============ */

export class DefenseEngine {
  private canvas: HTMLCanvasElement;
  private sound: DefenseSound;
  private cb: EngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private raf = 0;
  private last = 0;
  private running = false;
  private destroyed = false;

  private course!: CourseDef;
  private diff!: DifficultyDef;
  private length = 500;

  // Juice systems
  private screenShake = new TraumaScreenShake({ maxOffset: 0.65, maxAngle: 0.04, decayRate: 1.5 });
  private hitStop = new HitStopManager();

  // run state
  private score = 0;
  private coins = 20;
  private endless = 0;
  private kills = 0;
  private combo = 0;
  private comboT = 0;
  private maxCombo = 0;
  private weapon: WeaponId = 'pistol';
  private weaponT = 0;
  private powerLv = 0;
  private wallLv = 0;
  private hpMax = 100;
  private hp = 100;
  private guardMax = 140;
  private guard = 140;
  private perksDmg = 1;
  private runDmgMul = 1;
  private rateMul = 1;
  private lastGateText = '';
  private over = false;
  private victory = false;
  private shopOpen = false;
  private guardBroke = false;
  private killsByKind: Record<EnemyKind, number> = { runner: 0, walker: 0, brute: 0, shield: 0, kamikaze: 0, boss: 0 };
  private bossKills = 0;
  private maxAlliesEver = 0;

  // run progress
  private dist = 0;
  private targetX = 0;
  private fireT = 0;
  private iframes = 0;
  private time = 0;
  private fps = 60;
  private hudT = 0;
  private shakeEnabled = true;

  // director
  private rows: number[] = [];
  private rowIdx = 0;
  private gates: number[] = [];
  private gateIdx = 0;
  private cratesAt: { at: number; kind: BarrelKind }[] = [];
  private crateIdx = 0;
  private cagesAt: number[] = [];
  private cageIdx = 0;
  private elitesAt: number[] = [];
  private eliteIdx = 0;
  private bossAt = 0;
  private bossSpawned = false;
  private bossRef: Foe | null = null;
  private slamAnnounced = false;

  // scene objects
  private hero!: THREE.Group;
  private barricade!: THREE.Group;
  private muzzleGroup!: THREE.Group;
  private muzzleT = 0;
  private allies: Ally[] = [];
  private foes: Foe[] = [];
  private crates: Crate[] = [];
  private cages: Cage[] = [];
  private gateObjs: Gate[] = [];
  private buildings: THREE.Group[] = [];
  private dashes: THREE.Mesh[] = [];
  private goalGroup: THREE.Group | null = null;

  // high-performance pools (zero runtime allocations)
  private boltPool: PooledBolt[] = [];
  private particlePool: PooledParticle[] = [];
  private ringPool: PooledRing[] = [];
  private floaterPool: PooledFloater[] = [];

  // shared geometries/materials
  private geoBox = new THREE.BoxGeometry(1, 1, 1);
  private geoBolt = new THREE.SphereGeometry(0.16, 8, 6);
  private geoParticle = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  private boltMats: Record<string, THREE.MeshBasicMaterial> = {};

  constructor(canvas: HTMLCanvasElement, sound: DefenseSound, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.sound = sound;
    this.cb = cb;
  }

  /* ---------------- public API ---------------- */

  start(course: CourseDef, diff: DifficultyDef, opts?: { shake?: boolean; perksDmg?: number; wallMax?: number; baseMax?: number }): void {
    this.course = course;
    this.diff = diff;
    this.length = courseLength(course);
    this.shakeEnabled = opts?.shake !== false;
    this.perksDmg = opts?.perksDmg ?? 1;
    this.score = 0;
    this.coins = 20;
    this.endless = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboT = 0;
    this.maxCombo = 0;
    this.weapon = 'pistol';
    this.weaponT = 0;
    this.powerLv = 0;
    this.wallLv = 0;
    this.hpMax = opts?.baseMax ?? 100;
    this.hp = this.hpMax;
    this.guardMax = opts?.wallMax ?? 140;
    this.guard = this.guardMax;
    this.runDmgMul = 1;
    this.rateMul = 1;
    this.lastGateText = '';
    this.over = false;
    this.victory = false;
    this.shopOpen = false;
    this.guardBroke = false;
    this.killsByKind = { runner: 0, walker: 0, brute: 0, shield: 0, kamikaze: 0, boss: 0 };
    this.bossKills = 0;
    this.maxAlliesEver = 0;
    this.dist = 0;
    this.targetX = 0;
    this.fireT = 0;
    this.iframes = 0;
    this.time = 0;
    this.fps = 60;
    this.hudT = 0;

    this.initScene();
    this.buildDirector();
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.cb.onBanner(`${course.name} — 出発進行`, `会社まであと${this.length}m！満員ラッシュを突破せよ`);
    this.loop(this.last);
  }

  destroy(): void {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    try {
      this.scene?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose?.();
          const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(m)) {
            m.forEach((x) => {
              (x as THREE.Material & { map?: THREE.Texture | null }).map?.dispose();
              x.dispose();
            });
          } else if (m) {
            (m as THREE.Material & { map?: THREE.Texture | null }).map?.dispose?.();
            m.dispose();
          }
        }
      });
      this.renderer?.dispose();
    } catch {
      /* ignore */
    }
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

  setAim(x: number, _y: number): void {
    this.targetX = clamp((x / VIEW_W) * 9 - 4.5, -X_LIMIT, X_LIMIT);
  }

  setKeyDir(_d: number): void {
    /* keyboard steering handled via setAim */
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
    if (id === 'repair' && this.guard >= this.guardMax) return false;
    if (id === 'heal' && this.hp >= this.hpMax) return false;
    this.coins -= c;
    if (id === 'repair') {
      this.guard = this.guardMax;
      updateBarricadeDurability(this.barricade, 1.0, this.time);
    } else if (id === 'wall') {
      this.wallLv++;
      this.guardMax += 40;
      this.guard = Math.min(this.guardMax, this.guard + 40);
      updateBarricadeDurability(this.barricade, this.guard / this.guardMax, this.time);
    } else if (id === 'power') {
      this.powerLv++;
    } else if (id === 'ally') {
      this.addAlly();
    } else if (id === 'heal') {
      this.hp = this.hpMax;
    }
    this.sound.pickup();
    this.emitHud();
    return true;
  }

  nextWave(): void {
    this.shopOpen = false;
    this.dist = 0;
    this.buildDirector();

    // Clear active field elements
    for (const f of this.foes) this.scene.remove(f.g);
    for (const c of this.crates) this.scene.remove(c.g);
    for (const c of this.cages) this.scene.remove(c.g);
    for (const g of this.gateObjs) this.scene.remove(g.g);
    this.foes = [];
    this.crates = [];
    this.cages = [];
    this.gateObjs = [];
    this.bossRef = null;

    // Reset pools
    for (const b of this.boltPool) { b.active = false; b.m.visible = false; }
    for (const p of this.particlePool) { p.active = false; p.m.visible = false; }
    for (const r of this.ringPool) { r.active = false; r.m.visible = false; }
    for (const f of this.floaterPool) { f.active = false; f.sprite.visible = false; }

    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.cb.onBanner(`${this.course.name} — 出発進行`, `会社まであと${this.length}m！`);
    this.loop(this.last);
  }

  continueEndless(): void {
    this.endless++;
    this.hp = Math.min(this.hpMax, this.hp + 40);
    this.guard = Math.min(this.guardMax, this.guard + 50);
    updateBarricadeDurability(this.barricade, this.guard / this.guardMax, this.time);
    this.nextWave();
    this.cb.onBanner(`残業${this.endless}日目`, '混雑がさらに激化！会社はまだ遠い…');
  }

  snapshotShop(victory: boolean): ShopSnapshot {
    return {
      wave: 1, totalWaves: 1, endless: this.endless,
      coins: Math.floor(this.coins),
      wallHp: Math.ceil(this.guard), wallMax: this.guardMax,
      baseHp: Math.ceil(this.hp), baseMax: this.hpMax,
      allies: this.allies.length, powerLv: this.powerLv, wallLv: this.wallLv,
      costs: this.costs(), victory,
    };
  }

  completeRun(): void {
    if (!this.over) this.gameOver(true);
  }

  /* ---------------- scene setup & object pools ---------------- */

  private powerMult(): number {
    return (1 + this.powerLv * 0.15) * this.perksDmg * this.runDmgMul;
  }

  private initScene(): void {
    const canvas = this.canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.course.sky[0]);
    this.scene.fog = new THREE.Fog(new THREE.Color(this.course.sky[0]), 32, 85);

    this.camera = new THREE.PerspectiveCamera(56, 3 / 5, 0.1, 240);
    this.camera.position.set(0, 8.6, 11.2);
    this.camera.lookAt(0, 1.2, -7.5);

    // Dynamic Lighting
    const hemi = new THREE.HemisphereLight(new THREE.Color(this.course.sky[1]), new THREE.Color(this.course.ground), 1.1);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xfffaed, 1.25);
    dir.position.set(7, 14, 8);
    this.scene.add(dir);

    // Track, road, and roadside landscape
    this.buildTrackEnvironment();

    // 1. Procedural 3D Salaryman Hero (Zero Emojis!)
    this.hero = buildSalarymanMesh({
      weapon: this.weapon,
      isHero: true,
      suitColor: 0x1e3a8a,
      scale: 1.0,
    });
    this.hero.position.set(0, 0, HERO_Z);
    this.scene.add(this.hero);

    // 2. Physical 3D Deployable Modular Barricade
    this.barricade = buildBarricadeMesh(1 + this.wallLv, this.guard / this.guardMax);
    this.barricade.position.set(0, 0, BARRICADE_Z);
    this.scene.add(this.barricade);

    // Muzzle Flash Effect Mesh (3D rotating cross star)
    this.muzzleGroup = new THREE.Group();
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const starH = new THREE.Mesh(this.geoBox, starMat);
    starH.scale.set(0.65, 0.14, 0.14);
    this.muzzleGroup.add(starH);
    const starV = new THREE.Mesh(this.geoBox, starMat);
    starV.scale.set(0.14, 0.65, 0.14);
    this.muzzleGroup.add(starV);
    this.muzzleGroup.position.set(0, 1.25, HERO_Z - 1.1);
    this.muzzleGroup.visible = false;
    this.scene.add(this.muzzleGroup);

    // 3. Pre-allocated Object Pools (Zero per-frame allocations)
    this.initPools();

    this.allies = [];
    this.foes = [];
    this.crates = [];
    this.cages = [];
    this.gateObjs = [];
    this.goalGroup = null;
    this.bossRef = null;

    this.resize();
  }

  private buildTrackEnvironment(): void {
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 240),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(this.course.ground) })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -60);
    this.scene.add(ground);

    // Main 5-lane highway asphalt
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 240),
      new THREE.MeshLambertMaterial({ color: 0x1f242d })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -60);
    this.scene.add(road);

    // Metallic guardrails & sidewalks
    for (const sx of [-6.3, 6.3]) {
      const walk = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 240),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
      );
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(sx, 0.005, -60);
      this.scene.add(walk);

      const rail = new THREE.Mesh(
        this.geoBox,
        new THREE.MeshLambertMaterial({ color: 0x64748b })
      );
      rail.scale.set(0.25, 0.7, 240);
      rail.position.set(sx + (sx > 0 ? 0.7 : -0.7), 0.35, -60);
      this.scene.add(rail);
    }

    // Lane dashes
    this.dashes = [];
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    for (let i = 0; i < 28; i++) {
      for (const dx of [-2.28, 2.28]) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 1.8), dashMat);
        d.position.set(dx, 0.02, 18 - i * 4);
        this.scene.add(d);
        this.dashes.push(d);
      }
    }

    // Roadside buildings
    this.buildings = [];
    for (let i = 0; i < 32; i++) {
      const b = this.makeBuilding();
      const side = i % 2 === 0 ? -1 : 1;
      b.position.set(side * rand(9.5, 18), 0, 18 - Math.floor(i / 2) * 9 + rand(-2, 2));
      this.scene.add(b);
      this.buildings.push(b);
    }
  }

  private makeBuilding(): THREE.Group {
    const g = new THREE.Group();
    const h = rand(8, 22);
    const w = rand(4.5, 8.5);
    const hue = Math.random();
    const col = new THREE.Color().setHSL(hue, 0.22, rand(0.12, 0.28));
    const m = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: col }));
    m.scale.set(w, h, w);
    m.position.y = h / 2;
    g.add(m);

    // Office window strips
    const win = new THREE.Mesh(
      this.geoBox,
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.12, 0.8, rand(0.45, 0.65)) })
    );
    win.scale.set(w * 0.75, Math.min(2.4, h * 0.32), 0.1);
    win.position.set(0, h * rand(0.4, 0.7), w / 2 + 0.06);
    g.add(win);
    return g;
  }

  private initPools(): void {
    // 1. Bolt pool
    this.boltMats = {};
    for (const wid of Object.keys(WEAPONS)) {
      this.boltMats[wid] = new THREE.MeshBasicMaterial({ color: new THREE.Color(WEAPONS[wid as WeaponId].color) });
    }
    this.boltMats['ally'] = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

    this.boltPool = [];
    for (let i = 0; i < MAX_BOLTS; i++) {
      const m = new THREE.Mesh(this.geoBolt, this.boltMats.pistol);
      m.visible = false;
      this.scene.add(m);
      this.boltPool.push({
        m, x: 0, z: 0, prevX: 0, prevZ: 0, vx: 0, vz: 0,
        dmg: 0, pierce: 0, splash: 0, slow: 0, life: 0, ally: false, active: false,
      });
    }

    // 2. Particle pool
    this.particlePool = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(this.geoParticle, mat);
      m.visible = false;
      this.scene.add(m);
      this.particlePool.push({ m, mat, vx: 0, vy: 0, vz: 0, life: 0, max: 0.7, active: false });
    }

    // 3. Ring pool
    this.ringPool = [];
    const ringGeo = new THREE.RingGeometry(0.8, 1.05, 28);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const m = new THREE.Mesh(ringGeo, mat);
      m.visible = false;
      this.scene.add(m);
      this.ringPool.push({ m, mat, life: 0, max: 0.35, grow: 10, active: false });
    }

    // 4. Floater combat text pool
    this.floaterPool = [];
    for (let i = 0; i < MAX_FLOATERS; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 48;
      const ctx = canvas.getContext('2d')!;
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.visible = false;
      this.scene.add(sprite);
      this.floaterPool.push({ sprite, canvas, ctx, tex, life: 0, max: 1.1, active: false });
    }
  }

  /* ---------------- director ---------------- */

  private buildDirector(): void {
    const L = this.length;
    this.rows = [];
    for (let d = 14; d < L - 70; d += rand(11, 15)) this.rows.push(d);
    this.rowIdx = 0;

    this.gates = [];
    for (let d = 55; d < L - 90; d += rand(55, 80)) this.gates.push(d);
    this.gateIdx = 0;

    const barrelKinds: BarrelKind[] = ['weapon', 'bomb', 'coin', 'repair'];
    this.cratesAt = [];
    let bi = Math.floor(rand(0, 4));
    for (let d = 30; d < L - 60; d += rand(36, 50)) {
      this.cratesAt.push({ at: d, kind: barrelKinds[bi % 4] });
      bi++;
    }
    this.crateIdx = 0;

    this.cagesAt = [];
    for (let d = 65; d < L - 80; d += rand(75, 100)) this.cagesAt.push(d);
    this.cageIdx = 0;

    this.elitesAt = [];
    const eliteGap = this.course.id === 'rain' || this.course.id === 'tunnel' ? 0.22 : this.course.id === 'snow' ? 0.28 : 0.35;
    for (let d = L * eliteGap; d < L - 90; d += L * 0.25) this.elitesAt.push(d);
    this.eliteIdx = 0;

    this.bossAt = L - 80;
    this.bossSpawned = false;
    this.slamAnnounced = false;
  }

  private waveNum(): number {
    const frac = clamp(this.dist / this.length, 0, 1);
    return 1 + frac * (this.course.waves - 1);
  }

  private scaledHp(base: number): number {
    const bulk =
      this.course.id === 'snow' ? 1.1 :
      this.course.id === 'rain' ? 1.2 :
      this.course.id === 'tunnel' ? 1.32 : 1;
    // Gentle ramp: longest course (9 waves) tops out around ~2.0x instead of ~3.4x
    return base * this.diff.hpMul * (1 + (this.waveNum() - 1) * 0.12 + this.endless * 0.25) * bulk;
  }

  private spawnRow(): void {
    if (this.foes.length > 46) return;
    const plan = planWave(this.course, Math.min(this.course.waves, Math.round(this.waveNum())), this.diff, this.endless);
    const n = 2 + Math.floor(rand(0, 2.99) + this.endless * 0.3);
    const lanes = shuffled(LANES).slice(0, Math.min(5, n));
    for (const lx of lanes) {
      this.spawnFoe(pickKind(plan, Math.random()), lx + rand(-0.4, 0.4), false);
    }
  }

  private spawnFoe(kind: EnemyKind, x: number, elite: boolean): void {
    const def = ENEMIES[kind];
    const hpScale = (elite ? 2.4 : 1) * (kind === 'boss' && this.course.id === 'snow' ? 1.35 : kind === 'boss' && this.course.id === 'desert' ? 1.15 : kind === 'boss' && this.course.id === 'tunnel' ? 1.55 : 1);
    const hp = this.scaledHp(def.hp) * hpScale;

    // Procedural 3D Enemy Mesh (Zero Emojis!)
    const g = kind === 'boss'
      ? buildTrainBossMesh(this.course.id)
      : buildEnemyMesh(kind, elite);

    // Procedural 3D Health Bar Bracket (No emoji!)
    const barWidth = kind === 'boss' ? 4.8 : elite ? 2.0 : 1.4;
    const hpBarGroup = new THREE.Group();
    const bgMesh = new THREE.Mesh(this.geoBox, new THREE.MeshBasicMaterial({ color: 0x111827 }));
    bgMesh.scale.set(barWidth, 0.16, 0.12);
    hpBarGroup.add(bgMesh);

    const fillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const hpBarFill = new THREE.Mesh(this.geoBox, fillMat);
    hpBarFill.scale.set(barWidth - 0.08, 0.12, 0.14);
    hpBarFill.position.z = 0.02;
    hpBarGroup.add(hpBarFill);

    hpBarGroup.position.y = kind === 'boss' ? 3.8 : elite ? 2.3 : 1.8;
    g.add(hpBarGroup);

    g.position.set(x, 0, kind === 'boss' ? SPAWN_Z - 4 : SPAWN_Z + rand(-3, 1));
    this.scene.add(g);

    const foe: Foe = {
      g,
      kind,
      x: g.position.x,
      z: g.position.z,
      hp,
      maxHp: hp,
      walk: (kind === 'boss' ? def.speed : def.speed * rand(0.9, 1.1)) * this.diff.speedMul,
      radius: def.radius * (elite ? 1.35 : 1.0),
      dmg: def.damage * this.diff.dmgMul,
      flash: 0,
      slowT: 0,
      wob: rand(0, Math.PI * 2),
      dead: false,
      elite,
      isBoss: kind === 'boss',
      slamT: kind === 'boss' ? 6 : 0,
      minionT: kind === 'boss' ? 2.5 : 0,
      hpBarGroup,
      hpBarFill,
    };

    this.foes.push(foe);
    if (kind === 'boss') {
      this.bossRef = foe;
      this.sound.boom();
      this.screenShake.addTrauma(0.5);
      this.cb.onBanner('満員電車が接近！', '突破できれば大量ボーナス！逃げ切りも可');
    }
  }

  private spawnCrate(kind: BarrelKind): void {
    const g = buildCrateMesh(kind);
    const x = LANES[Math.floor(rand(0, LANES.length))];
    g.position.set(x, 0, SPAWN_Z);
    this.scene.add(g);

    const weapons: WeaponId[] = ['smg', 'shotgun', 'rifle', 'launcher', 'freeze'];
    this.crates.push({
      g, kind, x, z: SPAWN_Z,
      hp: CRATE_HP * (1 + this.endless * 0.2),
      weapon: weapons[Math.floor(Math.random() * weapons.length)],
      dead: false,
    });
  }

  private spawnCage(): void {
    const g = buildCageMesh();
    const x = LANES[Math.floor(rand(0, LANES.length))];
    g.position.set(x, 0, SPAWN_Z);
    this.scene.add(g);

    this.cages.push({
      g, x, z: SPAWN_Z,
      hp: CAGE_HP,
      dead: false,
    });
  }

  private generateGateDefs(): { left: GateDef; right: GateDef } {
    const goodPool: GateDef[] = [
      { op: 'mult', val: 2, label: '×2 隊員倍増', isGood: true, apply: () => this.applySquadGate('mult', 2) },
      { op: 'add', val: 5, label: '+5 隊員急募', isGood: true, apply: () => this.applySquadGate('add', 5) },
      { op: 'add', val: 10, label: '+10 大動員', isGood: true, apply: () => this.applySquadGate('add', 10) },
      { op: 'mult', val: 3, label: '×3 突撃編成', isGood: true, apply: () => this.applySquadGate('mult', 3) },
      { op: 'mult', val: 3, label: '火力×3', isGood: true, apply: () => { this.runDmgMul = Math.min(12, this.runDmgMul * 3); } },
      { op: 'mult', val: 2, label: '火力×2', isGood: true, apply: () => { this.runDmgMul = Math.min(12, this.runDmgMul * 2); } },
      { op: 'add', val: 50, label: 'ガード+50', isGood: true, apply: () => { this.guard = Math.min(this.guardMax, this.guard + 50); updateBarricadeDurability(this.barricade, this.guard / this.guardMax, this.time); } },
      { op: 'add', val: 25, label: '体力+25', isGood: true, apply: () => { this.hp = Math.min(this.hpMax, this.hp + 25); } },
      { op: 'add', val: 50, label: '残業代+50', isGood: true, apply: () => { this.coins += 50; } },
      { op: 'add', val: 40, label: 'ガード+40', isGood: true, apply: () => { this.guard = Math.min(this.guardMax, this.guard + 40); updateBarricadeDurability(this.barricade, this.guard / this.guardMax, this.time); } },
      { op: 'add', val: 20, label: '体力+20', isGood: true, apply: () => { this.hp = Math.min(this.hpMax, this.hp + 20); } },
      { op: 'add', val: 30, label: '残業代+30', isGood: true, apply: () => { this.coins += 30; } },
    ];

    const badPool: GateDef[] = [
      { op: 'div', val: 2, label: '÷2 途中下車', isGood: false, apply: () => this.applySquadGate('div', 2) },
      { op: 'sub', val: 5, label: '-5 離脱発生', isGood: false, apply: () => this.applySquadGate('sub', 5) },
      { op: 'div', val: 2, label: '火力÷2', isGood: false, apply: () => { this.runDmgMul = Math.max(0.25, this.runDmgMul * 0.5); } },
      { op: 'sub', val: 30, label: 'ガード-30', isGood: false, apply: () => { this.damageGuard(30); } },
      { op: 'sub', val: 20, label: '体力-20', isGood: false, apply: () => { this.damageHp(20); } },
      { op: 'sub', val: 30, label: '減給-30', isGood: false, apply: () => { this.coins = Math.max(0, this.coins - 30); } },
    ];

    // 60% of the time both sides include the squad multiplier (ad-game staple)
    const leftFirst = Math.random() < 0.5;
    const good = goodPool[Math.floor(rand(0, goodPool.length))];
    const bad = badPool[Math.floor(rand(0, badPool.length))];
    return {
      left: leftFirst ? good : bad,
      right: leftFirst ? bad : good,
    };
  }

  private applySquadGate(op: GateOp, val: number): void {
    const current = this.allies.length;
    let nextAllies = current;

    if (op === 'add') {
      nextAllies = Math.min(MAX_ALLIES, current + val);
    } else if (op === 'mult') {
      // Squad size is 1 (hero) + allies
      const totalSquad = 1 + current;
      const targetSquad = Math.min(MAX_ALLIES + 1, totalSquad * val);
      nextAllies = Math.max(0, targetSquad - 1);
    } else if (op === 'sub') {
      const totalSquad = 1 + current;
      const targetSquad = Math.max(1, totalSquad - val);
      nextAllies = Math.max(0, targetSquad - 1);
    } else if (op === 'div') {
      const totalSquad = 1 + current;
      const targetSquad = Math.max(1, Math.floor(totalSquad / val));
      nextAllies = Math.max(0, targetSquad - 1);
    }

    this.setAllyCount(nextAllies);
  }

  private setAllyCount(count: number): void {
    const target = clamp(count, 0, MAX_ALLIES);
    while (this.allies.length < target) {
      this.addAlly(false);
    }
    while (this.allies.length > target) {
      const removed = this.allies.pop();
      if (removed) {
        this.burst(removed.g.position.x, 1.2, removed.g.position.z, 12, 5, '#ef4444');
        this.scene.remove(removed.g);
      }
    }
    this.maxAlliesEver = Math.max(this.maxAlliesEver, this.allies.length);
  }

  private spawnGate(): void {
    const g = new THREE.Group();
    const { left, right } = this.generateGateDefs();

    const leftMesh = buildGateMesh(left.op, left.val);
    leftMesh.position.x = -2.25;
    g.add(leftMesh);

    const rightMesh = buildGateMesh(right.op, right.val);
    rightMesh.position.x = 2.25;
    g.add(rightMesh);

    // Center divider dividing barrier post
    const dividerMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const divider = new THREE.Mesh(this.geoBox, dividerMat);
    divider.scale.set(0.35, 3.4, 0.4);
    divider.position.set(0, 1.7, 0);
    g.add(divider);

    g.position.set(0, 0, SPAWN_Z);
    this.scene.add(g);

    this.gateObjs.push({
      g,
      z: SPAWN_Z,
      left,
      right,
      leftMesh,
      rightMesh,
      done: false,
    });
  }

  private spawnGoal(): void {
    const g = new THREE.Group();
    for (const px of [-5, 5]) {
      const post = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0xf59e0b }));
      post.scale.set(0.6, 6.5, 0.6);
      post.position.set(px, 3.25, 0);
      g.add(post);
    }
    const barTop = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0xf59e0b }));
    barTop.scale.set(11, 1.2, 0.6);
    barTop.position.set(0, 6.5, 0);
    g.add(barTop);

    g.position.set(0, 0, SPAWN_Z);
    this.scene.add(g);
    this.goalGroup = g;
  }

  /* ---------------- combat & entities ---------------- */

  private addAlly(playSound = true): void {
    if (this.allies.length >= MAX_ALLIES) return;

    const g = buildSalarymanMesh({
      suitColor: 0x15803d,
      isHero: false,
      weapon: 'smg',
      scale: 0.88,
    });
    // Start with a small vertical drop for juice
    g.position.set(this.hero.position.x + rand(-0.6, 0.6), 1.8, HERO_Z + 1.2);
    this.scene.add(g);

    this.allies.push({
      g,
      vx: 0,
      vz: 0,
      cd: rand(0.15, 0.45),
    });

    this.maxAlliesEver = Math.max(this.maxAlliesEver, this.allies.length);
    if (playSound) {
      this.floater(this.hero.position.x, 2.6, HERO_Z + 1, '同期参戦！', '#4ade80');
      this.sound.rescue();
    }
  }

  private damageGuard(d: number): void {
    if (this.guard <= 0 || this.over) return;
    this.guard = Math.max(0, this.guard - d);
    updateBarricadeDurability(this.barricade, this.guard / this.guardMax, this.time);

    if (this.guard <= 0) {
      this.guard = 0;
      if (!this.guardBroke) {
        this.guardBroke = true;
        this.cb.onBanner('ガード崩壊！', '体力に直撃するぞ！');
      }
      this.screenShake.addTrauma(0.6);
      this.hitStop.triggerMs(40);
      this.sound.boom();
    }
  }

  private damageHp(d: number): void {
    if (this.over) return;
    this.hp -= d;
    this.screenShake.addTrauma(0.35);
    if (this.hp < 0) this.hp = 0;
  }

  private hitFoe(f: Foe, dmg: number, slow: number): void {
    f.hp -= dmg;
    f.flash = 0.08;
    if (slow > 0) f.slowT = Math.max(f.slowT, 2.2);

    // Update 3D HP bar fill
    if (f.hpBarFill) {
      const frac = clamp(f.hp / f.maxHp, 0, 1);
      f.hpBarFill.scale.x = (f.isBoss ? 4.7 : f.elite ? 1.92 : 1.32) * frac;
      const mat = f.hpBarFill.material as THREE.MeshBasicMaterial;
      mat.color.setHex(frac > 0.5 ? 0x22c55e : frac > 0.25 ? 0xeab308 : 0xef4444);
    }

    this.sound.hit();
    if (f.hp <= 0 && !f.dead) {
      f.dead = true;
      this.killFoe(f);
    }
  }

  private killFoe(f: Foe): void {
    const def = ENEMIES[f.kind];
    this.kills++;
    this.killsByKind[f.kind]++;
    if (f.kind === 'boss') this.bossKills++;
    this.combo++;
    this.comboT = 3;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const mult = this.diff.scoreMul * (1 + Math.min(this.combo, 50) * 0.02);
    const s = Math.round(def.score * mult * (f.elite ? 3 : 1));
    this.score += s;
    this.coins += def.coins * (f.elite ? 3 : 1);
    this.floater(f.x, 2.4, f.z, `+${s}`, '#fde047');

    if (this.combo > 0 && this.combo % 15 === 0) {
      this.floater(f.x, 3.2, f.z, `${this.combo}連撃！`, '#f472b6');
    }

    const big = f.kind === 'brute' || f.kind === 'boss' || f.elite;
    this.burst(f.x, 1.2, f.z, big ? 28 : 14, big ? 7 : 4.5, def.color);

    if (f.kind === 'kamikaze' || big) {
      this.spawnRing(f.x, 0.6, f.z, big ? 5 : 3, big ? '#ef4444' : '#f472b6');
      this.screenShake.addTrauma(big ? 0.55 : 0.28);
      this.sound.boom();
    } else {
      this.sound.kill();
    }

    if (f.kind === 'boss') {
      this.bossRef = null;
      this.screenShake.addTrauma(1.0);
      this.hitStop.triggerMs(80);
      this.floater(f.x, 4.5, f.z, '満員電車突破！！', '#fde047');
      this.cb.onBanner('満員電車突破！！', '大量ボーナスGET！');
    }
    this.scene.remove(f.g);
  }

  private popCrate(c: Crate): void {
    this.burst(c.x, 0.8, c.z, 20, 5.5, '#fbbf24');
    if (c.kind === 'weapon') {
      const w = WEAPONS[c.weapon];
      this.weapon = c.weapon;
      this.weaponT = w.duration;
      this.floater(c.x, 2.4, c.z, `${w.name} GET！`, '#fde047');
      this.sound.pickup();
    } else if (c.kind === 'bomb') {
      this.floater(c.x, 2.4, c.z, '雷鳴炸裂！', '#fb923c');
      this.explode(c.x, c.z, 4.2, 130 * this.powerMult());
      this.screenShake.addTrauma(0.55);
      this.hitStop.triggerMs(40);
      this.sound.boom();
    } else if (c.kind === 'coin') {
      this.coins += 25;
      this.floater(c.x, 2.4, c.z, '+25 残業代', '#fde047');
      this.sound.pickup();
    } else {
      this.guard = Math.min(this.guardMax, this.guard + 55);
      updateBarricadeDurability(this.barricade, this.guard / this.guardMax, this.time);
      this.floater(c.x, 2.4, c.z, 'ガード+55！', '#38bdf8');
      this.sound.pickup();
    }
    this.scene.remove(c.g);
  }

  private explode(x: number, z: number, radius: number, dmg: number): void {
    this.spawnRing(x, 0.6, z, radius * 1.4, '#fb923c');
    this.burst(x, 1, z, 24, 7, '#fb923c');
    for (const f of this.foes) {
      if (f.dead) continue;
      const dx = f.x - x;
      const dz = f.z - z;
      if (dx * dx + dz * dz < radius * radius) {
        this.hitFoe(f, dmg, 0);
      }
    }
    this.foes = this.foes.filter((f) => !f.dead);
  }

  /* ---------------- pooled visual effects ---------------- */

  private burst(x: number, y: number, z: number, n: number, spd: number, color: string): void {
    const colHex = new THREE.Color(color).getHex();
    let spawned = 0;
    for (const p of this.particlePool) {
      if (p.active) continue;
      p.active = true;
      p.m.visible = true;
      p.m.position.set(x, y, z);
      p.mat.color.setHex(colHex);
      p.mat.opacity = 1;

      const a = Math.random() * Math.PI * 2;
      const v = rand(spd * 0.3, spd);
      p.vx = Math.cos(a) * v;
      p.vy = rand(2.2, spd);
      p.vz = Math.sin(a) * v;
      p.life = rand(0.3, 0.7);
      p.max = p.life;

      spawned++;
      if (spawned >= n) break;
    }
  }

  private spawnRing(x: number, y: number, z: number, size: number, color: string): void {
    const colHex = new THREE.Color(color).getHex();
    for (const r of this.ringPool) {
      if (r.active) continue;
      r.active = true;
      r.m.visible = true;
      r.m.position.set(x, y, z);
      r.m.scale.set(0.1, 0.1, 0.1);
      r.mat.color.setHex(colHex);
      r.mat.opacity = 0.85;
      r.life = 0.35;
      r.max = 0.35;
      r.grow = size / 0.35;
      break;
    }
  }

  private floater(x: number, y: number, z: number, text: string, color: string): void {
    for (const f of this.floaterPool) {
      if (f.active) continue;
      f.active = true;
      f.sprite.visible = true;
      f.sprite.position.set(x, y, z);
      f.life = 1.1;
      f.max = 1.1;

      const ctx = f.ctx;
      const cvs = f.canvas;
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(text, cvs.width / 2, cvs.height / 2);

      // Fill
      ctx.fillStyle = color;
      ctx.fillText(text, cvs.width / 2, cvs.height / 2);

      f.tex.needsUpdate = true;
      f.sprite.scale.set(2.4, 0.72, 1);
      break;
    }
  }

  /* ---------------- main loop & updates ---------------- */

  private loop = (now: number): void => {
    if (this.destroyed || !this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;

    this.fps += (1 / dt - this.fps) * 0.05;

    // HitStop micro-freeze check
    const { frozen, effectiveDt } = this.hitStop.update(dt);
    if (!frozen) {
      this.time += effectiveDt;
      this.update(effectiveDt);
    }

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
      wave: 1,
      totalWaves: 1,
      endless: this.endless,
      combo: this.combo,
      weapon: this.weapon,
      weaponT: Math.max(0, this.weaponT),
      baseHp: Math.ceil(this.hp),
      baseMax: this.hpMax,
      wallHp: Math.ceil(this.guard),
      wallMax: this.guardMax,
      allies: this.allies.length,
      kills: this.kills,
      bossHp: this.bossRef && !this.bossRef.dead ? Math.max(0, this.bossRef.hp) : 0,
      bossMax: this.bossRef && !this.bossRef.dead ? this.bossRef.maxHp : 0,
      fps: Math.round(this.fps),
      waveActive: true,
      distLeft: Math.max(0, Math.round(this.length - this.dist)),
      distTotal: this.length,
      runDmgMul: this.runDmgMul,
      lastGate: this.lastGateText,
      gaugeName: this.course ? this.course.name : '',
    });
  }

  private openShop(victory: boolean): void {
    this.shopOpen = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.emitHud();
    this.cb.onShop(this.snapshotShop(victory));
  }

  private gameOver(victory: boolean): void {
    if (this.over) return;
    this.over = true;
    this.victory = victory;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.sound.gameOver(victory);
    if (victory) {
      this.burst(0, 2, HERO_Z - 2, 60, 8, '#fde047');
      this.spawnRing(0, 0.5, HERO_Z - 2, 8, '#fde047');
    }
    this.emitHud();
    this.cb.onGameOver({
      victory,
      score: Math.floor(this.score),
      wave: 1,
      kills: this.kills,
      coins: Math.floor(this.coins),
      maxCombo: this.maxCombo,
      bossKills: this.bossKills,
      maxAllies: this.maxAlliesEver,
      endless: this.endless,
      dist: Math.floor(this.dist),
      killsByKind: { ...this.killsByKind },
    });
  }

  private update(dt: number): void {
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.weaponT > 0) {
      this.weaponT -= dt;
      if (this.weaponT <= 0) {
        this.weapon = 'pistol';
        this.weaponT = 0;
        this.floater(this.hero.position.x, 2.6, HERO_Z, '傘に戻った', '#94a3b8');
      }
    }
    this.iframes = Math.max(0, this.iframes - dt);
    this.muzzleT = Math.max(0, this.muzzleT - dt);
    this.muzzleGroup.visible = this.muzzleT > 0;

    // Hero steering & procedural running animation
    const hx = this.hero.position.x;
    this.hero.position.x += (clamp(this.targetX, -X_LIMIT, X_LIMIT) - hx) * Math.min(1, dt * 14);
    this.hero.position.y = Math.abs(Math.sin(this.time * 12)) * 0.08;
    this.hero.rotation.z = clamp((this.targetX - hx) * -0.06, -0.28, 0.28);
    updateSalarymanAnimation(this.hero, this.time, 14);

    // Barricade visual durability
    updateBarricadeDurability(this.barricade, this.guard / this.guardMax, this.time);

    // World forward scrolling
    this.dist += SCROLL * dt;

    this.director();
    this.updateFiring(dt);
    this.updateBolts(dt);
    this.updateFoes(dt);
    this.updateCrates(dt);
    this.updateCages(dt);
    this.updateGates(dt);
    this.updateAllies(dt);
    this.updateAmbient(dt);
    this.updateFx(dt);

    // Check course finish
    if (!this.over && this.dist >= this.length) {
      const bonus = 500 + this.endless * 200;
      this.score += bonus;
      this.coins += 60;
      this.sound.waveClear();
      this.victory = true;
      this.openShop(true);
    }
    if (this.hp <= 0 && !this.over) {
      this.hp = 0;
      this.burst(hx, 1.2, HERO_Z, 60, 8, '#ef4444');
      this.screenShake.addTrauma(1.0);
      this.sound.boom();
      this.gameOver(false);
    }
  }

  private director(): void {
    while (this.rowIdx < this.rows.length && this.dist >= this.rows[this.rowIdx]) {
      this.rowIdx++;
      this.spawnRow();
    }
    while (this.gateIdx < this.gates.length && this.dist >= this.gates[this.gateIdx]) {
      this.gateIdx++;
      this.spawnGate();
    }
    while (this.crateIdx < this.cratesAt.length && this.dist >= this.cratesAt[this.crateIdx].at) {
      this.spawnCrate(this.cratesAt[this.crateIdx].kind);
      this.crateIdx++;
    }
    while (this.cageIdx < this.cagesAt.length && this.dist >= this.cagesAt[this.cageIdx]) {
      this.cageIdx++;
      if (this.cages.length < 2) this.spawnCage();
    }
    while (this.eliteIdx < this.elitesAt.length && this.dist >= this.elitesAt[this.eliteIdx]) {
      this.eliteIdx++;
      const x = LANES[Math.floor(rand(0, LANES.length))];
      this.spawnFoe('brute', x, true);
      this.floater(x, 3, SPAWN_Z, '巨漢リーマン出現', '#fb923c');
    }
    if (!this.bossSpawned && this.dist >= this.bossAt) {
      this.bossSpawned = true;
      this.spawnFoe('boss', 0, false);
    }
    if (!this.goalGroup && this.dist >= this.length - 70) this.spawnGoal();
  }

  private updateFiring(dt: number): void {
    if (this.over || this.shopOpen) return;
    this.fireT -= dt;
    if (this.fireT > 0) return;

    const w = WEAPONS[this.weapon];
    this.fireT = w.interval * this.rateMul;
    const hx = this.hero.position.x;
    const mult = this.powerMult();

    for (let i = 0; i < w.count; i++) {
      const spread = w.count === 1
        ? (Math.random() - 0.5) * w.spread * 2
        : ((i / (w.count - 1)) - 0.5) * w.spread * 2 + (Math.random() - 0.5) * 0.03;

      this.spawnBolt(hx, HERO_Z - 0.8, spread, w.speed, w.damage * mult, w.pierce, w.splash, w.slow, this.weapon, false);
    }

    this.muzzleGroup.position.set(hx, 1.25, HERO_Z - 1.1);
    this.muzzleGroup.rotation.z += 0.45;
    this.muzzleT = 0.06;

    if (w.id === 'shotgun' || w.id === 'launcher') this.sound.shotgun();
    else this.sound.shoot();
  }

  private spawnBolt(
    x: number, z: number, spread: number, speed: number,
    dmg: number, pierce: number, splash: number, slow: number,
    wid: string, isAlly: boolean
  ): void {
    for (const b of this.boltPool) {
      if (b.active) continue;
      b.active = true;
      b.x = x + Math.sin(spread) * 0.4;
      b.z = z;
      b.prevX = b.x;
      b.prevZ = b.z;
      b.vx = Math.sin(spread) * speed;
      b.vz = -Math.cos(spread) * speed;
      b.dmg = dmg;
      b.pierce = pierce;
      b.splash = splash;
      b.slow = slow;
      b.life = 2.2;
      b.ally = isAlly;

      b.m.material = isAlly ? this.boltMats.ally : (this.boltMats[wid] ?? this.boltMats.pistol);
      b.m.position.set(b.x, 1.25, b.z);
      b.m.visible = true;
      break;
    }
  }

  /** Dynamic Crowd Flocking & Formation (Phalanx/Wedge for 1 to 30+ allies) */
  private updateAllies(dt: number): void {
    const hx = this.hero.position.x;
    const count = this.allies.length;

    this.allies.forEach((a, i) => {
      // Tactical formation offset: row & symmetric column spacing
      const row = Math.floor(i / 5) + 1;
      const countInRow = Math.min(5, count - (row - 1) * 5);
      const col = (i % 5) - (countInRow - 1) / 2;

      const targetX = clamp(hx + col * 0.72, -X_LIMIT, X_LIMIT);
      const targetZ = HERO_Z + row * 0.95;

      // Spring-damper attraction to formation slot
      const fx = (targetX - a.g.position.x) * 16;
      const fz = (targetZ - a.g.position.z) * 16;

      // Soft local ally-to-ally separation
      let repX = 0;
      let repZ = 0;
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const other = this.allies[j];
        const dx = a.g.position.x - other.g.position.x;
        const dz = a.g.position.z - other.g.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.48 && d > 0.001) {
          const push = (0.48 - d) * 14;
          repX += (dx / d) * push;
          repZ += (dz / d) * push;
        }
      }

      a.vx = (a.vx + (fx + repX) * dt) * Math.max(0, 1 - dt * 8);
      a.vz = (a.vz + (fz + repZ) * dt) * Math.max(0, 1 - dt * 8);

      a.g.position.x += a.vx * dt;
      a.g.position.z += a.vz * dt;
      a.g.position.y = Math.abs(Math.sin(this.time * 12 + i)) * 0.07;
      updateSalarymanAnimation(a.g, this.time + i * 0.2, 14);

      // Automated ally support fire
      a.cd -= dt;
      if (a.cd > 0) return;

      // Find nearest enemy in front
      let best: Foe | null = null;
      for (const f of this.foes) {
        if (f.dead || f.z > HERO_Z + 1) continue;
        if (!best || f.z > best.z) best = f;
      }
      if (!best) {
        a.cd = 0.2;
        return;
      }
      a.cd = 0.52;

      const dx = best.x - a.g.position.x;
      const dz = best.z - a.g.position.z;
      const len = Math.max(0.001, Math.hypot(dx, dz));
      const sp = 32;
      const spread = Math.atan2(dx, -dz);

      this.spawnBolt(a.g.position.x, a.g.position.z - 0.4, spread, sp, 9 * this.powerMult(), 0, 0, 0, 'smg', true);
    });
  }

  /** Precision Physics: Swept-Sphere Continuous Collision Detection (CCD) */
  private updateBolts(dt: number): void {
    for (const b of this.boltPool) {
      if (!b.active) continue;

      b.prevX = b.x;
      b.prevZ = b.z;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.m.position.set(b.x, 1.25, b.z);
      b.life -= dt;

      if (b.z < -70 || b.z > 14 || Math.abs(b.x) > 9.5 || b.life <= 0) {
        b.active = false;
        b.m.visible = false;
        continue;
      }

      // Swept segment vector
      const segX = b.x - b.prevX;
      const segZ = b.z - b.prevZ;
      const segLenSq = segX * segX + segZ * segZ;

      // 1. Swept CCD vs Foes
      for (const f of this.foes) {
        if (f.dead) continue;

        // Project foe center onto swept segment
        const rx = f.x - b.prevX;
        const rz = f.z - b.prevZ;
        const t = segLenSq > 1e-6 ? clamp((rx * segX + rz * segZ) / segLenSq, 0, 1) : 0;
        const qx = b.prevX + t * segX;
        const qz = b.prevZ + t * segZ;

        const distSq = (f.x - qx) ** 2 + (f.z - qz) ** 2;
        const hitRadius = f.radius + 0.35;

        if (distSq < hitRadius * hitRadius) {
          const dmg = b.dmg * (f.kind === 'shield' ? 0.62 : 1);
          this.hitFoe(f, dmg, b.slow);

          if (b.splash > 0) this.explode(qx, qz, b.splash, b.dmg * 0.8);

          if (b.pierce > 0) {
            b.pierce--;
            b.dmg *= 0.8;
          } else {
            b.active = false;
            b.m.visible = false;
            break;
          }
        }
      }

      if (!b.active || b.ally) continue;

      // 2. Swept CCD vs Crates
      for (const c of this.crates) {
        if (c.dead) continue;
        const rx = c.x - b.prevX;
        const rz = c.z - b.prevZ;
        const t = segLenSq > 1e-6 ? clamp((rx * segX + rz * segZ) / segLenSq, 0, 1) : 0;
        const qx = b.prevX + t * segX;
        const qz = b.prevZ + t * segZ;

        if ((c.x - qx) ** 2 + (c.z - qz) ** 2 < 1.25) {
          c.hp -= b.dmg;
          b.active = false;
          b.m.visible = false;
          this.burst(qx, 1, qz, 5, 3.5, '#fbbf24');
          if (c.hp <= 0 && !c.dead) {
            c.dead = true;
            this.popCrate(c);
          }
          break;
        }
      }

      if (!b.active) continue;

      // 3. Swept CCD vs Cages
      for (const cg of this.cages) {
        if (cg.dead) continue;
        const rx = cg.x - b.prevX;
        const rz = cg.z - b.prevZ;
        const t = segLenSq > 1e-6 ? clamp((rx * segX + rz * segZ) / segLenSq, 0, 1) : 0;
        const qx = b.prevX + t * segX;
        const qz = b.prevZ + t * segZ;

        if ((cg.x - qx) ** 2 + (cg.z - qz) ** 2 < 1.45) {
          cg.hp -= b.dmg;
          b.active = false;
          b.m.visible = false;
          this.burst(qx, 1.2, qz, 5, 3.5, '#4ade80');
          this.sound.hit();
          if (cg.hp <= 0 && !cg.dead) {
            cg.dead = true;
            this.scene.remove(cg.g);
            if (this.allies.length < MAX_ALLIES) {
              this.addAlly();
              this.score += 200;
            } else {
              this.coins += 30;
              this.score += 200;
              this.floater(cg.x, 2.4, cg.z, '+30 残業代', '#fde047');
            }
          }
          break;
        }
      }
    }
  }

  /** Enemy Horde Updates & 2D Planar Swarm Separation */
  private updateFoes(dt: number): void {
    const hx = this.hero.position.x;
    const count = this.foes.length;

    // 2D Planar relaxation between enemies to prevent stacking/merging
    for (let i = 0; i < count; i++) {
      const fi = this.foes[i];
      if (fi.dead || fi.isBoss) continue;

      for (let j = i + 1; j < count; j++) {
        const fj = this.foes[j];
        if (fj.dead || fj.isBoss) continue;

        const dx = fi.x - fj.x;
        const dz = fi.z - fj.z;
        const dist = Math.hypot(dx, dz);
        const minDist = fi.radius + fj.radius;

        if (dist < minDist && dist > 0.001) {
          const overlap = (minDist - dist) * 0.5;
          const pushX = (dx / dist) * overlap * Math.min(1, dt * 6);
          fi.x = clamp(fi.x + pushX, -X_LIMIT, X_LIMIT);
          fj.x = clamp(fj.x - pushX, -X_LIMIT, X_LIMIT);
        }
      }
    }

    for (const f of this.foes) {
      if (f.dead) continue;
      f.flash = Math.max(0, f.flash - dt);
      f.slowT = Math.max(0, f.slowT - dt);
      const slowMul = f.slowT > 0 ? 0.45 : 1;

      if (f.isBoss) {
        if (f.z < -13) {
          f.z += (SCROLL * 0.6 + f.walk) * dt;
        } else {
          f.wob += dt * 0.9;
          f.x = clamp(Math.sin(f.wob) * 3.2, -3.4, 3.4);
        }
        f.g.position.set(f.x, 0, f.z);

        // Minion commuters deploy
        f.minionT -= dt;
        if (f.minionT <= 0 && this.foes.length < 44) {
          f.minionT = 4.5;
          this.spawnFoe(Math.random() < 0.5 ? 'runner' : 'walker', rand(-3.5, 3.5), false);
        }

        // Locomotive ram / slam attack
        f.slamT -= dt;
        if (f.slamT <= 0) {
          f.slamT = 8;
          this.spawnRing(f.x, 0.6, f.z, 9, '#ef4444');
          this.damageGuard(30 * this.diff.dmgMul);
          this.screenShake.addTrauma(0.65);
          this.hitStop.triggerMs(60);
          this.sound.boom();
          if (!this.slamAnnounced) {
            this.slamAnnounced = true;
            this.cb.onBanner('満員電車が急接近！', '通勤ガードに大ダメージ');
          } else {
            this.floater(f.x, 4.5, f.z, '急接近！！', '#ef4444');
          }
        }
        continue;
      }

      // Regular enemy approach
      const prevZ = f.z;
      f.z += (SCROLL + f.walk * slowMul) * dt;
      f.wob += dt * 6;
      f.g.position.set(f.x + Math.sin(f.wob) * 0.12, Math.abs(Math.sin(f.wob * 1.3)) * 0.08, f.z);

      // 1. Collision with Physical Barricade (BARRICADE_Z = -1.1)
      if (this.guard > 0 && prevZ < BARRICADE_Z + 0.3 && f.z >= BARRICADE_Z - 0.1) {
        f.dead = true;
        this.scene.remove(f.g);

        this.damageGuard(f.dmg);
        this.burst(f.x, 1.2, BARRICADE_Z, 12, 4.5, f.kind === 'kamikaze' ? '#f472b6' : '#06b6d4');
        if (f.kind === 'kamikaze') {
          this.spawnRing(f.x, 0.6, BARRICADE_Z, 3.5, '#f472b6');
          this.sound.boom();
        } else {
          this.sound.hit();
        }
        continue;
      }

      // 2. Collision with Hero / Squad (HERO_Z = 0)
      if (prevZ < HERO_Z + 0.5 && f.z >= HERO_Z + 0.5 && Math.abs(f.x - hx) < 1.0) {
        f.dead = true;
        this.scene.remove(f.g);

        const dmg = f.dmg;
        if (f.kind === 'kamikaze') {
          this.spawnRing(f.x, 0.8, HERO_Z, 3, '#f472b6');
          this.burst(f.x, 1, HERO_Z, 16, 6, '#f472b6');
          this.sound.boom();
        } else {
          this.burst(f.x, 1, HERO_Z, 8, 4, '#f87171');
          this.sound.hurt();
        }

        if (this.iframes <= 0) {
          this.iframes = 0.7;
          let rest = dmg;
          if (this.guard > 0) {
            const g = Math.min(this.guard, rest);
            this.damageGuard(g);
            rest -= g;
          }
          if (rest > 0) this.damageHp(rest);
          this.screenShake.addTrauma(0.45);
        }
        continue;
      }

      if (f.z > 13) {
        f.dead = true;
        this.scene.remove(f.g);
      }
    }

    this.foes = this.foes.filter((f) => !f.dead);
  }

  private updateCrates(dt: number): void {
    for (const c of this.crates) {
      c.z += SCROLL * dt;
      c.g.position.z = c.z;
      c.g.rotation.y += dt * 1.2;
      if (c.z > 12) {
        c.dead = true;
        this.scene.remove(c.g);
      }
    }
    this.crates = this.crates.filter((c) => !c.dead);
  }

  private updateCages(dt: number): void {
    for (const c of this.cages) {
      c.z += SCROLL * dt;
      c.g.position.z = c.z;
      updateCageAnimation(c.g, this.time);
      if (c.z > 12) {
        c.dead = true;
        this.scene.remove(c.g);
      }
    }
    this.cages = this.cages.filter((c) => !c.dead);
  }

  /** Precision 3D OBB Gate Volume Collision & Energy Curtains */
  private updateGates(dt: number): void {
    const hx = this.hero.position.x;

    for (const gt of this.gateObjs) {
      if (gt.done) continue;
      const prev = gt.z;
      gt.z += SCROLL * dt;
      gt.g.position.z = gt.z;

      updateGateCurtain(gt.leftMesh, this.time);
      updateGateCurtain(gt.rightMesh, this.time);

      // 3D OBB Volume check at gate passage plane
      if (prev < HERO_Z && gt.z >= HERO_Z) {
        gt.done = true;

        // Left Gate: [-4.4, -0.15], Right Gate: [0.15, 4.4]
        // Center divider splits at 0
        const isLeft = hx < 0;
        const fx = isLeft ? gt.left : gt.right;

        fx.apply();
        this.lastGateText = fx.label;
        this.floater(this.hero.position.x, 4.2, HERO_Z - 1, fx.label, fx.isGood ? '#4ade80' : '#f87171');
        this.floater(this.hero.position.x, 3.2, HERO_Z - 1,
          fx.isGood ? `火力 ×${this.runDmgMul.toFixed(1)} ／ 同期 ${1 + this.allies.length}人` : 'デバフを受けた…',
          fx.isGood ? '#a7f3d0' : '#fca5a5');

        // Big readable pass-through feedback
        this.spawnRing(this.hero.position.x, 1, HERO_Z, fx.isGood ? 6 : 4, fx.isGood ? '#4ade80' : '#ef4444');
        this.burst(this.hero.position.x, 2, HERO_Z, fx.isGood ? 34 : 20, 7, fx.isGood ? '#10b981' : '#ef4444');

        if (fx.isGood) {
          this.sound.pickup();
          this.screenShake.addTrauma(0.22);
          this.hitStop.triggerMs(35);
        } else {
          this.sound.hurt();
          this.screenShake.addTrauma(0.34);
        }
        this.emitHud();
      }

      if (gt.z > 14) {
        gt.done = true;
        this.scene.remove(gt.g);
      }
    }

    this.gateObjs = this.gateObjs.filter((gt) => !gt.done || gt.z <= 14);

    // Fade out passed gates
    for (const gt of this.gateObjs) {
      if (gt.done && gt.z > HERO_Z) {
        gt.g.position.y -= dt * 3;
        if (gt.g.position.y < -4) {
          this.scene.remove(gt.g);
          gt.z = 99;
        }
      }
    }
  }

  private updateAmbient(dt: number): void {
    for (const d of this.dashes) {
      d.position.z += SCROLL * dt;
      if (d.position.z > 18) d.position.z -= 112;
    }
    for (const b of this.buildings) {
      b.position.z += SCROLL * dt;
      if (b.position.z > 20) {
        b.position.z -= 160;
        b.position.x = (b.position.x < 0 ? -1 : 1) * rand(9.5, 18);
      }
    }
    if (this.goalGroup) {
      this.goalGroup.position.z += SCROLL * dt;
    }
  }

  private updateFx(dt: number): void {
    // 1. Particle pool
    for (const p of this.particlePool) {
      if (!p.active) continue;
      p.life -= dt;
      p.m.position.x += p.vx * dt;
      p.m.position.y += p.vy * dt;
      p.m.position.z += p.vz * dt;
      p.vy -= 12 * dt;
      p.mat.opacity = clamp(p.life / p.max, 0, 1);
      if (p.life <= 0) {
        p.active = false;
        p.m.visible = false;
      }
    }

    // 2. Ring pool
    for (const r of this.ringPool) {
      if (!r.active) continue;
      r.life -= dt;
      const s = r.m.scale.x + r.grow * dt;
      r.m.scale.set(s, s, s);
      r.mat.opacity = clamp(r.life / r.max, 0, 1) * 0.85;
      if (r.life <= 0) {
        r.active = false;
        r.m.visible = false;
      }
    }

    // 3. Floater pool
    for (const f of this.floaterPool) {
      if (!f.active) continue;
      f.life -= dt;
      f.sprite.position.y += dt * 1.5;
      (f.sprite.material as THREE.SpriteMaterial).opacity = clamp(f.life / f.max, 0, 1);
      if (f.life <= 0) {
        f.active = false;
        f.sprite.visible = false;
      }
    }
  }

  /* ---------------- render ---------------- */

  private resize(): void {
    const w = this.canvas.clientWidth || VIEW_W;
    const h = this.canvas.clientHeight || VIEW_H;
    const pr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const bw = Math.floor(w * pr);
    const bh = Math.floor(h * pr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  private render(): void {
    this.resize();
    const cam = this.camera;

    // Reset camera baseline
    cam.position.set(0, 8.6, 11.2);
    cam.rotation.set(0, 0, 0);

    // Apply trauma non-linear screen shake
    if (this.shakeEnabled) {
      this.screenShake.applyToCamera(cam);
    }

    cam.lookAt(this.hero.position.x * 0.35, 1.2, -7.5);
    this.renderer.render(this.scene, cam);
  }
}
