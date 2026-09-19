import * as THREE from 'three';
import {
  VIEW_W, VIEW_H,
  WEAPONS, ENEMIES, planWave, pickKind, courseLength, MAX_ALLIES,
  type WeaponId, type EnemyKind, type CourseDef, type DifficultyDef, type BarrelKind,
} from './config';
import type { DefenseSound } from './audio';

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
const X_LIMIT = 4.3;
const LANES = [-3.4, -1.7, 0, 1.7, 3.4];
const CRATE_HP = 26;
const CAGE_HP = 40;

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

interface BarLabel {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  sprite: THREE.Sprite;
}

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
  bodyMat: THREE.MeshLambertMaterial;
  bar: BarLabel | null;
  slamT: number;
  minionT: number;
}

interface Bolt {
  m: THREE.Mesh;
  x: number;
  z: number;
  vx: number;
  vz: number;
  dmg: number;
  pierce: number;
  splash: number;
  slow: number;
  life: number;
  ally: boolean;
  dead: boolean;
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
}

interface GateFx {
  label: string;
  icon: string;
  good: boolean;
  apply: () => void;
}

interface Gate {
  g: THREE.Group;
  z: number;
  left: GateFx;
  right: GateFx;
  done: boolean;
}

interface Particle {
  m: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
}

interface Ring {
  m: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  max: number;
  grow: number;
}

interface Floater {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  life: number;
  max: number;
}

interface Ally {
  g: THREE.Group;
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
  private trauma = 0;
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
  private heroBodyMat!: THREE.MeshLambertMaterial;
  private muzzle!: THREE.Sprite;
  private muzzleT = 0;
  private allies: Ally[] = [];
  private foes: Foe[] = [];
  private bolts: Bolt[] = [];
  private crates: Crate[] = [];
  private cages: Cage[] = [];
  private gateObjs: Gate[] = [];
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private floaters: Floater[] = [];
  private buildings: THREE.Group[] = [];
  private dashes: THREE.Mesh[] = [];
  private goalGroup: THREE.Group | null = null;
  private nextId = 1;

  // shared geometries/materials
  private geoBox = new THREE.BoxGeometry(1, 1, 1);
  private geoSphere = new THREE.SphereGeometry(0.5, 12, 10);
  private geoBolt = new THREE.SphereGeometry(0.16, 8, 6);
  private geoParticle = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  private geoShadow = new THREE.CircleGeometry(0.55, 16);
  private matShadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });

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
    this.trauma = 0;
    this.time = 0;
    this.fps = 60;
    this.hudT = 0;
    this.initScene();
    this.buildDirector();
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.cb.onBanner(`${course.icon} ${course.name} — 出発進行`, `会社まであと${this.length}m！満員ラッシュを突破せよ`);
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
          if (Array.isArray(m)) m.forEach((x) => { (x as THREE.Material & { map?: THREE.Texture | null }).map?.dispose(); x.dispose(); });
          else if (m) { (m as THREE.Material & { map?: THREE.Texture | null }).map?.dispose?.(); m.dispose(); }
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
    /* keyboard moves aim via setAim in component */
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
    if (id === 'repair') this.guard = this.guardMax;
    else if (id === 'wall') { this.wallLv++; this.guardMax += 40; this.guard = Math.min(this.guardMax, this.guard + 40); }
    else if (id === 'power') this.powerLv++;
    else if (id === 'ally') this.addAlly();
    else if (id === 'heal') this.hp = this.hpMax;
    this.sound.pickup();
    this.emitHud();
    return true;
  }

  /** Start (or restart) the course run. */
  nextWave(): void {
    this.shopOpen = false;
    this.dist = 0;
    this.buildDirector();
    // clear field
    for (const f of this.foes) this.scene.remove(f.g);
    for (const b of this.bolts) this.scene.remove(b.m);
    for (const c of this.crates) this.scene.remove(c.g);
    for (const c of this.cages) this.scene.remove(c.g);
    for (const g of this.gateObjs) this.scene.remove(g.g);
    this.foes = [];
    this.bolts = [];
    this.crates = [];
    this.cages = [];
    this.gateObjs = [];
    this.bossRef = null;
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.cb.onBanner(`${this.course.icon} ${this.course.name} — 出発進行`, `会社まであと${this.length}m！`);
    this.loop(this.last);
  }

  continueEndless(): void {
    this.endless++;
    this.hp = Math.min(this.hpMax, this.hp + 40);
    this.nextWave();
    this.cb.onBanner(`♾️ 残業${this.endless}日目`, '混雑がさらに激化！会社はまだ遠い…');
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

  /* ---------------- setup ---------------- */

  private powerMult(): number {
    return (1 + this.powerLv * 0.15) * this.perksDmg * this.runDmgMul;
  }

  private initScene(): void {
    const canvas = this.canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.course.sky[0]);
    this.scene.fog = new THREE.Fog(new THREE.Color(this.course.sky[0]), 30, 78);
    this.camera = new THREE.PerspectiveCamera(62, 3 / 5, 0.1, 220);
    this.camera.position.set(0, 8.2, 10.8);
    this.camera.lookAt(0, 1.2, -7);

    const hemi = new THREE.HemisphereLight(new THREE.Color(this.course.sky[1]), new THREE.Color(this.course.ground), 1.0);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(6, 12, 8);
    this.scene.add(dir);

    // ground + road
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 220),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(this.course.ground) }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -60);
    this.scene.add(ground);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 220),
      new THREE.MeshLambertMaterial({ color: 0x23262e }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -60);
    this.scene.add(road);
    // sidewalks
    for (const sx of [-6.6, 6.6]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 220), new THREE.MeshLambertMaterial({ color: 0x3a3f4a }));
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(sx, 0.005, -60);
      this.scene.add(walk);
    }
    // lane dashes
    this.dashes = [];
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });
    for (let i = 0; i < 26; i++) {
      for (const dx of [-2.28, 2.28]) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 1.6), dashMat);
        d.position.set(dx, 0.02, 18 - i * 4);
        this.scene.add(d);
        this.dashes.push(d);
      }
    }
    // buildings
    this.buildings = [];
    for (let i = 0; i < 30; i++) {
      const b = this.makeBuilding();
      const side = i % 2 === 0 ? -1 : 1;
      b.position.set(side * rand(9.5, 17), 0, 18 - Math.floor(i / 2) * 9 + rand(-2, 2));
      this.scene.add(b);
      this.buildings.push(b);
    }
    // hero
    this.hero = this.makePerson(0x1e3a8a, 1, true);
    this.hero.position.set(0, 0, HERO_Z);
    this.heroBodyMat = (this.hero.children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial;
    this.scene.add(this.hero);
    // muzzle flash
    const mc = document.createElement('canvas');
    mc.width = 64; mc.height = 64;
    const mg = mc.getContext('2d')!;
    const grad = mg.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,200,1)');
    grad.addColorStop(1, 'rgba(255,180,50,0)');
    mg.fillStyle = grad;
    mg.fillRect(0, 0, 64, 64);
    const mtex = new THREE.CanvasTexture(mc);
    this.muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: mtex, transparent: true, depthWrite: false }));
    this.muzzle.scale.set(1.4, 1.4, 1);
    this.muzzle.visible = false;
    this.scene.add(this.muzzle);

    this.allies = [];
    this.foes = [];
    this.bolts = [];
    this.crates = [];
    this.cages = [];
    this.gateObjs = [];
    this.particles = [];
    this.rings = [];
    this.floaters = [];
    this.goalGroup = null;
    this.bossRef = null;
    this.resize();
  }

  private makeBuilding(): THREE.Group {
    const g = new THREE.Group();
    const h = rand(6, 20);
    const w = rand(4, 8);
    const hue = Math.random();
    const col = new THREE.Color().setHSL(hue, 0.25, rand(0.12, 0.3));
    const m = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: col }));
    m.scale.set(w, h, w);
    m.position.y = h / 2;
    g.add(m);
    // lit windows strip
    const win = new THREE.Mesh(
      this.geoBox,
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.12, 0.8, rand(0.45, 0.6)) }),
    );
    win.scale.set(w * 0.7, Math.min(2.2, h * 0.3), 0.1);
    win.position.set(0, h * rand(0.4, 0.7), w / 2 + 0.06);
    g.add(win);
    return g;
  }

  private blobShadow(scale = 1): THREE.Mesh {
    const s = new THREE.Mesh(this.geoShadow, this.matShadow);
    s.rotation.x = -Math.PI / 2;
    s.position.y = 0.03;
    s.scale.setScalar(scale);
    return s;
  }

  /** Box-person: body + head (+briefcase for hero). */
  private makePerson(suitColor: number, scale: number, hero: boolean): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: suitColor }));
    body.scale.set(0.72 * scale, 0.95 * scale, 0.42 * scale);
    body.position.y = 0.85 * scale;
    g.add(body);
    const head = new THREE.Mesh(this.geoSphere, new THREE.MeshLambertMaterial({ color: 0xf2c89b }));
    head.scale.setScalar(0.55 * scale);
    head.position.y = 1.62 * scale;
    g.add(head);
    if (hero) {
      const tie = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
      tie.scale.set(0.12, 0.5, 0.05);
      tie.position.set(0, 1.0, 0.24);
      g.add(tie);
      const kase = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0x7c4a12 }));
      kase.scale.set(0.5, 0.38, 0.16);
      kase.position.set(0.55, 0.55, 0);
      g.add(kase);
    }
    g.add(this.blobShadow(scale));
    return g;
  }

  private makeHpBar(w: number): BarLabel {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 24;
    const ctx = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(w, w * 0.1875, 1);
    this.drawHpBar(canvas, ctx, tex, 1);
    return { canvas, ctx, tex, sprite };
  }

  private drawHpBar(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, tex: THREE.CanvasTexture, frac: number): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = frac > 0.5 ? '#4ade80' : frac > 0.25 ? '#facc15' : '#ef4444';
    ctx.fillRect(2, 2, (canvas.width - 4) * clamp(frac, 0, 1), canvas.height - 4);
    tex.needsUpdate = true;
  }

  private makeTextSprite(text: string, size: number, fg = '#ffffff', bg = 'rgba(0,0,0,0.55)'): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = `bold ${size}px sans-serif`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + size;
    canvas.width = w;
    canvas.height = size + 24;
    const c2 = canvas.getContext('2d')!;
    c2.fillStyle = bg;
    c2.fillRect(0, 0, canvas.width, canvas.height);
    c2.font = font;
    c2.fillStyle = fg;
    c2.textAlign = 'center';
    c2.textBaseline = 'middle';
    c2.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(canvas.width / 64, canvas.height / 64, 1);
    return sp;
  }

  private makeEmojiSprite(emoji: string, s: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '96px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 68);
    const tex = new THREE.CanvasTexture(canvas);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(s, s, 1);
    return sp;
  }

  /* ---------------- director ---------------- */

  private buildDirector(): void {
    const L = this.length;
    this.rows = [];
    for (let d = 14; d < L - 70; d += rand(11, 15)) this.rows.push(d);
    this.rowIdx = 0;
    this.gates = [];
    for (let d = 60; d < L - 90; d += rand(60, 85)) this.gates.push(d);
    this.gateIdx = 0;
    const barrelKinds: BarrelKind[] = ['weapon', 'bomb', 'coin', 'repair'];
    this.cratesAt = [];
    let bi = Math.floor(rand(0, 4));
    for (let d = 32; d < L - 60; d += rand(38, 52)) {
      this.cratesAt.push({ at: d, kind: barrelKinds[bi % 4] });
      bi++;
    }
    this.crateIdx = 0;
    this.cagesAt = [];
    for (let d = 70; d < L - 80; d += rand(85, 110)) this.cagesAt.push(d);
    this.cageIdx = 0;
    this.elitesAt = [L * 0.35, L * 0.6];
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
    const bulk = this.course.id === 'snow' ? 1.2 : 1;
    return base * this.diff.hpMul * (1 + (this.waveNum() - 1) * 0.22 + this.endless * 0.35) * bulk;
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
    const hpScale = (elite ? 3.2 : 1) * (kind === 'boss' && this.course.id === 'snow' ? 1.35 : kind === 'boss' && this.course.id === 'desert' ? 1.15 : 1);
    const hp = this.scaledHp(def.hp) * hpScale;
    const g = new THREE.Group();
    const s = kind === 'boss' ? 3.4 : elite ? 1.5 : 1;
    if (kind === 'boss') {
      // train!
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
      const body = new THREE.Mesh(this.geoBox, bodyMat);
      body.scale.set(3.4, 2.4, 6.5);
      body.position.y = 1.5;
      g.add(body);
      const stripe = new THREE.Mesh(this.geoBox, new THREE.MeshBasicMaterial({ color: 0xe5e7eb }));
      stripe.scale.set(3.45, 0.5, 6.55);
      stripe.position.y = 1.1;
      g.add(stripe);
      const face = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0x111827 }));
      face.scale.set(2.6, 1.0, 0.3);
      face.position.set(0, 1.9, 3.3);
      g.add(face);
      const lampL = new THREE.Mesh(this.geoSphere, new THREE.MeshBasicMaterial({ color: 0xfde047 }));
      lampL.scale.setScalar(0.4);
      lampL.position.set(-1, 0.7, 3.35);
      g.add(lampL);
      const lampR = lampL.clone();
      lampR.position.x = 1;
      g.add(lampR);
      g.add(this.blobShadow(3.4));
      const bar = this.makeHpBar(5);
      bar.sprite.position.y = 3.6;
      g.add(bar.sprite);
      const label = this.makeTextSprite('🚃 満員電車', 40, '#fecaca');
      label.position.y = 4.4;
      g.add(label);
      this.scene.add(g);
      g.position.set(0, 0, SPAWN_Z - 4);
      const foe: Foe = {
        g, kind, x: 0, z: SPAWN_Z - 4, hp, maxHp: hp,
        walk: def.speed * this.diff.speedMul, radius: def.radius, dmg: def.damage * this.diff.dmgMul,
        flash: 0, slowT: 0, wob: 0, dead: false, elite: false, isBoss: true,
        bodyMat, bar, slamT: 6, minionT: 2,
      };
      this.foes.push(foe);
      this.bossRef = foe;
      this.sound.boom();
      this.trauma = Math.min(1, this.trauma + 0.5);
      this.cb.onBanner('🚃 満員電車が接近！', '突破できれば大量ボーナス！逃げ切りも可');
      return;
    }
    const person = this.makePerson(new THREE.Color(def.color).getHex(), s, false);
    g.add(person);
    // umbrella shield visual
    if (kind === 'shield') {
      const um = new THREE.Mesh(this.geoSphere, new THREE.MeshLambertMaterial({ color: 0x0ea5e9 }));
      um.scale.set(1.5 * s, 0.5 * s, 1.5 * s);
      um.position.y = 1.7 * s;
      g.add(um);
    }
    if (kind === 'kamikaze') {
      const wheel = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0x111827 }));
      wheel.scale.set(0.9 * s, 0.9 * s, 0.2);
      wheel.position.y = 0.45 * s;
      g.add(wheel);
    }
    const bar = this.makeHpBar(1.5 * s);
    bar.sprite.position.y = 2.15 * s;
    g.add(bar.sprite);
    const icon = this.makeEmojiSprite(def.emoji, 0.7 * s);
    icon.position.y = 1.15 * s;
    g.add(icon);
    g.position.set(x, 0, SPAWN_Z + rand(-3, 1));
    this.scene.add(g);
    this.foes.push({
      g, kind, x, z: g.position.z, hp, maxHp: hp,
      walk: def.speed * this.diff.speedMul * rand(0.9, 1.1),
      radius: def.radius * s, dmg: def.damage * this.diff.dmgMul,
      flash: 0, slowT: 0, wob: rand(0, Math.PI * 2), dead: false, elite,
      isBoss: false, bodyMat: (person.children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial,
      bar, slamT: 0, minionT: 0,
    });
  }

  private spawnCrate(kind: BarrelKind): void {
    const g = new THREE.Group();
    const glow = kind === 'weapon' ? 0xfde047 : kind === 'bomb' ? 0xfb923c : kind === 'coin' ? 0xfacc15 : 0x38bdf8;
    const box = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0x8a5a1e, emissive: glow, emissiveIntensity: 0.25 }));
    box.scale.set(1.1, 1.1, 1.1);
    box.position.y = 0.55;
    g.add(box);
    const tape = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0x5b3a10 }));
    tape.scale.set(1.14, 0.2, 1.14);
    tape.position.y = 0.55;
    g.add(tape);
    const icon = this.makeEmojiSprite(kind === 'weapon' ? '🎁' : kind === 'bomb' ? '⚡' : kind === 'coin' ? '💴' : '🧱', 0.9);
    icon.position.y = 1.7;
    g.add(icon);
    g.add(this.blobShadow(1));
    const x = LANES[Math.floor(rand(0, LANES.length))];
    g.position.set(x, 0, SPAWN_Z);
    this.scene.add(g);
    const weapons: WeaponId[] = ['smg', 'shotgun', 'rifle', 'launcher', 'freeze'];
    this.crates.push({ g, kind, x, z: SPAWN_Z, hp: CRATE_HP * (1 + this.endless * 0.2), weapon: weapons[Math.floor(Math.random() * weapons.length)], dead: false });
  }

  private spawnCage(): void {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0x6b7280, wireframe: true }));
    frame.scale.set(1.4, 2.0, 1.4);
    frame.position.y = 1.0;
    g.add(frame);
    const person = this.makePerson(0x4ade80, 0.85, false);
    g.add(person);
    const sos = this.makeTextSprite('🆘 SOS', 40, '#a7f3d0');
    sos.position.y = 2.7;
    g.add(sos);
    const bar = this.makeHpBar(1.6);
    bar.sprite.position.y = 3.3;
    g.add(bar.sprite);
    const x = LANES[Math.floor(rand(0, LANES.length))];
    g.position.set(x, 0, SPAWN_Z);
    this.scene.add(g);
    const cage: Cage = { g, x, z: SPAWN_Z, hp: CAGE_HP, dead: false };
    (g as THREE.Group & { __cage?: Cage }).__cage = cage;
    (bar.sprite as THREE.Sprite & { __bar?: BarLabel }).__bar = bar;
    this.cages.push(cage);
  }

  private goodFx(): GateFx {
    const pool: GateFx[] = [
      { label: '火力×2', icon: '⚡', good: true, apply: () => { this.runDmgMul = Math.min(8, this.runDmgMul * 2); } },
      { label: '連射UP', icon: '🔥', good: true, apply: () => { this.rateMul = Math.max(0.45, this.rateMul * 0.82); } },
      { label: 'ガード+40', icon: '🛡️', good: true, apply: () => { this.guard = Math.min(this.guardMax, this.guard + 40); } },
      { label: '体力+25', icon: '🍙', good: true, apply: () => { this.hp = Math.min(this.hpMax, this.hp + 25); } },
      { label: '同期+1', icon: '🤝', good: true, apply: () => { if (this.allies.length < MAX_ALLIES) this.addAlly(); else { this.coins += 40; } } },
      { label: '残業代+50', icon: '💴', good: true, apply: () => { this.coins += 50; } },
    ];
    return pool[Math.floor(rand(0, pool.length))];
  }

  private badFx(): GateFx {
    const pool: GateFx[] = [
      { label: '火力÷2', icon: '🐌', good: false, apply: () => { this.runDmgMul = Math.max(0.25, this.runDmgMul * 0.5); } },
      { label: 'ガード-30', icon: '💨', good: false, apply: () => { this.damageGuard(30); } },
      { label: '体力-20', icon: '😷', good: false, apply: () => { this.damageHp(20); } },
      { label: '残業代-30', icon: '📉', good: false, apply: () => { this.coins = Math.max(0, this.coins - 30); } },
    ];
    return pool[Math.floor(rand(0, pool.length))];
  }

  private spawnGate(): void {
    const g = new THREE.Group();
    const good = this.goodFx();
    const bad = this.badFx();
    const leftFirst = Math.random() < 0.5;
    const mk = (fx: GateFx, cx: number) => {
      const col = fx.good ? 0x16a34a : 0xdc2626;
      const panel = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.55, emissive: col, emissiveIntensity: 0.35 }));
      panel.scale.set(4.4, 2.6, 0.4);
      panel.position.set(cx, 1.3, 0);
      g.add(panel);
      const label = this.makeTextSprite(`${fx.icon} ${fx.label}`, 44, '#ffffff', fx.good ? 'rgba(20,100,40,0.85)' : 'rgba(140,20,20,0.85)');
      label.position.set(cx, 3.2, 0);
      if (label.scale.x > 4.0) label.scale.multiplyScalar(4.0 / label.scale.x);
      g.add(label);
    };
    const left = leftFirst ? good : bad;
    const right = leftFirst ? bad : good;
    mk(left, -2.3);
    mk(right, 2.3);
    g.position.set(0, 0, SPAWN_Z);
    this.scene.add(g);
    this.gateObjs.push({ g, z: SPAWN_Z, left, right, done: false });
  }

  private spawnGoal(): void {
    const g = new THREE.Group();
    for (const px of [-5, 5]) {
      const post = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0xf59e0b }));
      post.scale.set(0.6, 6, 0.6);
      post.position.set(px, 3, 0);
      g.add(post);
    }
    const barTop = new THREE.Mesh(this.geoBox, new THREE.MeshLambertMaterial({ color: 0xf59e0b }));
    barTop.scale.set(11, 1.2, 0.6);
    barTop.position.set(0, 6.2, 0);
    g.add(barTop);
    const label = this.makeTextSprite('🏢 会社（定時まで）', 48, '#fef3c7', 'rgba(120,60,0,0.9)');
    label.position.set(0, 7.6, 0);
    if (label.scale.x > 9) label.scale.multiplyScalar(9 / label.scale.x);
    g.add(label);
    g.position.set(0, 0, SPAWN_Z);
    this.scene.add(g);
    this.goalGroup = g;
  }

  /* ---------------- combat ---------------- */

  private addAlly(): void {
    this.nextId++;
    const g = this.makePerson(0x15803d, 0.85, false);
    this.scene.add(g);
    this.allies.push({ g, cd: 0.3 });
    this.maxAlliesEver = Math.max(this.maxAlliesEver, this.allies.length);
    this.floater(this.hero.position.x, 2.6, HERO_Z + 1, '同期参戦！', '#4ade80');
    this.sound.rescue();
  }

  private damageGuard(d: number): void {
    if (this.guard <= 0 || this.over) return;
    this.guard -= d;
    if (this.guard <= 0) {
      this.guard = 0;
      if (!this.guardBroke) {
        this.guardBroke = true;
        this.cb.onBanner('🛡️ ガード崩壊！', '体力に直撃するぞ！');
      }
      this.trauma = Math.min(1, this.trauma + 0.6);
      this.sound.boom();
    }
  }

  private damageHp(d: number): void {
    if (this.over) return;
    this.hp -= d;
    this.trauma = Math.min(1, this.trauma + 0.3);
    if (this.hp < 0) this.hp = 0;
  }

  private hitFoe(f: Foe, dmg: number, slow: number): void {
    f.hp -= dmg;
    f.flash = 0.08;
    if (slow > 0) f.slowT = Math.max(f.slowT, 2.2);
    if (f.bar) this.drawHpBar(f.bar.canvas, f.bar.ctx, f.bar.tex, f.hp / f.maxHp);
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
    this.burst(f.x, 1.2, f.z, big ? 26 : 12, big ? 7 : 4.5, def.color);
    if (f.kind === 'kamikaze' || big) {
      this.ring(f.x, 0.6, f.z, big ? 5 : 3, big ? '#ef4444' : '#f472b6');
      this.trauma = Math.min(1, this.trauma + (big ? 0.5 : 0.25));
      this.sound.boom();
    } else {
      this.sound.kill();
    }
    if (f.kind === 'boss') {
      this.bossRef = null;
      this.trauma = 1;
      this.floater(f.x, 4.5, f.z, '満員電車突破！！', '#fde047');
      this.cb.onBanner('🚃 満員電車突破！！', '大量ボーナスGET！');
    }
    this.scene.remove(f.g);
  }

  private popCrate(c: Crate): void {
    this.burst(c.x, 0.8, c.z, 18, 5, '#fbbf24');
    if (c.kind === 'weapon') {
      const w = WEAPONS[c.weapon];
      this.weapon = c.weapon;
      this.weaponT = w.duration;
      this.floater(c.x, 2.4, c.z, `${w.icon} ${w.name} GET！`, '#fde047');
      this.sound.pickup();
    } else if (c.kind === 'bomb') {
      this.floater(c.x, 2.4, c.z, '⚡ お局の雷！', '#fb923c');
      this.explode(c.x, c.z, 4.2, 130 * this.powerMult());
      this.trauma = Math.min(1, this.trauma + 0.55);
      this.sound.boom();
    } else if (c.kind === 'coin') {
      this.coins += 25;
      this.floater(c.x, 2.4, c.z, '+25 残業代💴', '#fde047');
      this.sound.pickup();
    } else {
      this.guard = Math.min(this.guardMax, this.guard + 55);
      this.floater(c.x, 2.4, c.z, '🧱 ガード+55！', '#38bdf8');
      this.sound.pickup();
    }
    this.scene.remove(c.g);
  }

  private explode(x: number, z: number, radius: number, dmg: number): void {
    this.ring(x, 0.6, z, radius * 1.4, '#fb923c');
    this.burst(x, 1, z, 22, 7, '#fb923c');
    for (const f of this.foes) {
      if (f.dead) continue;
      const dx = f.x - x;
      const dz = f.z - z;
      if (dx * dx + dz * dz < radius * radius) this.hitFoe(f, dmg, 0);
    }
    this.foes = this.foes.filter((f) => !f.dead);
  }

  /* ---------------- fx ---------------- */

  private burst(x: number, y: number, z: number, n: number, spd: number, color: string): void {
    for (let i = 0; i < n; i++) {
      if (this.particles.length > 170) break;
      const m = new THREE.Mesh(this.geoParticle, new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
      m.position.set(x, y, z);
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      const v = rand(spd * 0.3, spd);
      this.particles.push({ m, vx: Math.cos(a) * v, vy: rand(2, spd), vz: Math.sin(a) * v, life: rand(0.3, 0.7), max: 0.7 });
    }
  }

  private ring(x: number, y: number, z: number, size: number, color: string): void {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    this.scene.add(m);
    this.rings.push({ m, mat, life: 0.35, max: 0.35, grow: size / 0.35 });
  }

  private floater(x: number, y: number, z: number, text: string, color: string): void {
    if (this.floaters.length > 14) {
      const old = this.floaters.shift()!;
      this.scene.remove(old.sprite);
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = 'bold 44px sans-serif';
    ctx.font = font;
    canvas.width = Math.ceil(ctx.measureText(text).width) + 30;
    canvas.height = 68;
    const c2 = canvas.getContext('2d')!;
    c2.font = font;
    c2.textAlign = 'center';
    c2.textBaseline = 'middle';
    c2.fillStyle = 'rgba(0,0,0,0.7)';
    c2.fillText(text, canvas.width / 2 + 2, 36);
    c2.fillStyle = color;
    c2.fillText(text, canvas.width / 2, 34);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(canvas.width / 60, canvas.height / 60, 1);
    sprite.position.set(x, y, z);
    this.scene.add(sprite);
    this.floaters.push({ sprite, canvas, ctx, tex, life: 1.2, max: 1.2 });
  }

  /* ---------------- loop ---------------- */

  private loop = (now: number): void => {
    if (this.destroyed || !this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;
    this.fps += (1 / dt - this.fps) * 0.05;
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
      this.ring(0, 0.5, HERO_Z - 2, 8, '#fde047');
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

  /* ---------------- update ---------------- */

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
    this.muzzle.visible = this.muzzleT > 0;

    // hero steering
    const hx = this.hero.position.x;
    this.hero.position.x += (clamp(this.targetX, -X_LIMIT, X_LIMIT) - hx) * Math.min(1, dt * 12);
    this.hero.position.y = Math.abs(Math.sin(this.time * 10)) * 0.08; // run bob
    this.hero.rotation.z = clamp((this.targetX - hx) * -0.06, -0.3, 0.3);

    // scroll world
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
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    // goal
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
      this.trauma = 1;
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
      this.floater(x, 3, SPAWN_Z, '⚠️ 巨漢リーマン出現', '#fb923c');
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
      const spread = w.count === 1 ? (Math.random() - 0.5) * w.spread * 2 : ((i / (w.count - 1)) - 0.5) * w.spread * 2 + (Math.random() - 0.5) * 0.03;
      const m = new THREE.Mesh(this.geoBolt, new THREE.MeshBasicMaterial({ color: new THREE.Color(w.color) }));
      const bx = hx + Math.sin(spread) * 0.5;
      m.position.set(bx, 1.25, HERO_Z - 0.8);
      this.scene.add(m);
      this.bolts.push({
        m, x: bx, z: HERO_Z - 0.8,
        vx: Math.sin(spread) * w.speed, vz: -Math.cos(spread) * w.speed,
        dmg: w.damage * mult, pierce: w.pierce, splash: w.splash, slow: w.slow,
        life: 2.2, ally: false, dead: false,
      });
    }
    this.muzzle.position.set(hx, 1.25, HERO_Z - 1.1);
    this.muzzleT = 0.06;
    if (w.id === 'shotgun' || w.id === 'launcher') this.sound.shotgun();
    else this.sound.shoot();
  }

  private updateAllies(dt: number): void {
    const hx = this.hero.position.x;
    const offs = [[-1.7, 1.5], [1.7, 1.5], [0, 2.6]];
    this.allies.forEach((a, i) => {
      const [ox, oz] = offs[Math.min(i, 2)];
      a.g.position.x += (hx + ox - a.g.position.x) * Math.min(1, dt * 8);
      a.g.position.z = HERO_Z + oz;
      a.g.position.y = Math.abs(Math.sin(this.time * 10 + i)) * 0.07;
      a.cd -= dt;
      if (a.cd > 0) return;
      // nearest = closest to hero (largest z)
      let best: Foe | null = null;
      for (const f of this.foes) {
        if (f.dead || f.z > HERO_Z + 1) continue;
        if (!best || f.z > best.z) best = f;
      }
      if (!best) {
        a.cd = 0.2;
        return;
      }
      a.cd = 0.55;
      const m = new THREE.Mesh(this.geoBolt, new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
      m.position.set(a.g.position.x, 1.2, a.g.position.z - 0.5);
      this.scene.add(m);
      const dx = best.x - a.g.position.x;
      const dz = best.z - a.g.position.z;
      const len = Math.max(0.001, Math.hypot(dx, dz));
      const sp = 30;
      this.bolts.push({
        m, x: a.g.position.x, z: a.g.position.z - 0.5,
        vx: (dx / len) * sp, vz: (dz / len) * sp,
        dmg: 9 * this.powerMult(), pierce: 0, splash: 0, slow: 0,
        life: 2.0, ally: true, dead: false,
      });
    });
  }

  private updateBolts(dt: number): void {
    for (const b of this.bolts) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.m.position.set(b.x, b.m.position.y, b.z);
      b.life -= dt;
      if (b.z < -70 || b.z > 14 || Math.abs(b.x) > 9 || b.life <= 0) {
        b.dead = true;
        this.scene.remove(b.m);
        (b.m.material as THREE.Material).dispose();
        continue;
      }
      // vs foes
      for (const f of this.foes) {
        if (f.dead) continue;
        const dx = b.x - f.x;
        const dz = b.z - f.z;
        const rr = f.radius + 0.3;
        if (dx * dx + dz * dz < rr * rr) {
          this.hitFoe(f, b.dmg * (f.kind === 'shield' ? 0.62 : 1), b.slow);
          if (b.splash > 0) this.explode(b.x, b.z, b.splash, b.dmg * 0.8);
          if (b.pierce > 0) {
            b.pierce--;
            b.dmg *= 0.8;
          } else {
            b.dead = true;
            this.scene.remove(b.m);
            (b.m.material as THREE.Material).dispose();
          }
          break;
        }
      }
      if (b.dead || b.ally) continue;
      // vs crates
      for (const c of this.crates) {
        if (c.dead) continue;
        const dx = b.x - c.x;
        const dz = b.z - c.z;
        if (dx * dx + dz * dz < 1.1) {
          c.hp -= b.dmg;
          b.dead = true;
          this.scene.remove(b.m);
          (b.m.material as THREE.Material).dispose();
          this.burst(b.x, 1, b.z, 4, 3, '#fbbf24');
          if (c.hp <= 0 && !c.dead) {
            c.dead = true;
            this.popCrate(c);
          }
          break;
        }
      }
      if (b.dead) continue;
      // vs cages
      for (const cg of this.cages) {
        if (cg.dead) continue;
        const dx = b.x - cg.x;
        const dz = b.z - cg.z;
        if (dx * dx + dz * dz < 1.3) {
          cg.hp -= b.dmg;
          b.dead = true;
          this.scene.remove(b.m);
          (b.m.material as THREE.Material).dispose();
          this.burst(b.x, 1.2, b.z, 4, 3, '#4ade80');
          this.sound.hit();
          const bar = this.cageBar(cg);
          if (bar) this.drawHpBar(bar.canvas, bar.ctx, bar.tex, cg.hp / CAGE_HP);
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
    this.bolts = this.bolts.filter((b) => !b.dead);
    this.crates = this.crates.filter((c) => !c.dead);
    this.cages = this.cages.filter((c) => !c.dead);
    this.foes = this.foes.filter((f) => {
      if (f.dead) return false;
      return true;
    });
  }

  private cageBar(cg: Cage): BarLabel | null {
    let found: BarLabel | null = null;
    cg.g.traverse((o) => {
      const s = o as THREE.Sprite & { __bar?: BarLabel };
      if (s.isSprite && s.__bar) found = s.__bar;
    });
    return found;
  }

  private updateFoes(dt: number): void {
    const hx = this.hero.position.x;
    for (const f of this.foes) {
      if (f.dead) continue;
      f.flash = Math.max(0, f.flash - dt);
      f.slowT = Math.max(0, f.slowT - dt);
      const slowMul = f.slowT > 0 ? 0.45 : 1;
      f.g.children.forEach((ch) => {
        const mesh = ch as THREE.Mesh;
        if (mesh.isMesh && mesh.material && (mesh.material as THREE.MeshLambertMaterial).emissive) {
          ((mesh.material as THREE.MeshLambertMaterial).emissive as THREE.Color).setHex(f.flash > 0 ? 0xffffff : 0x000000);
        }
      });
      if (f.isBoss) {
        if (f.z < -13) {
          f.z += (SCROLL * 0.6 + f.walk) * dt;
        } else {
          f.wob += dt * 0.9;
          f.x = clamp(Math.sin(f.wob) * 3.2, -3.4, 3.4);
        }
        f.g.position.set(f.x, 0, f.z);
        // minions
        f.minionT -= dt;
        if (f.minionT <= 0 && this.foes.length < 44) {
          f.minionT = 4.5;
          this.spawnFoe(Math.random() < 0.5 ? 'runner' : 'walker', rand(-3.5, 3.5), false);
        }
        // slam
        f.slamT -= dt;
        if (f.slamT <= 0) {
          f.slamT = 8;
          this.ring(f.x, 0.6, f.z, 9, '#ef4444');
          this.damageGuard(30 * this.diff.dmgMul);
          this.trauma = Math.min(1, this.trauma + 0.6);
          this.sound.boom();
          if (!this.slamAnnounced) {
            this.slamAnnounced = true;
            this.cb.onBanner('⚠️ 満員電車が急接近！', '通勤ガードに大ダメージ');
          } else {
            this.floater(f.x, 4.5, f.z, '急接近！！', '#ef4444');
          }
        }
        continue;
      }
      const prevZ = f.z;
      f.z += (SCROLL + f.walk * slowMul) * dt;
      f.wob += dt * 6;
      f.g.position.set(f.x + Math.sin(f.wob) * 0.15, Math.abs(Math.sin(f.wob * 1.3)) * 0.1, f.z);
      // contact with hero?
      if (prevZ < HERO_Z + 0.5 && f.z >= HERO_Z + 0.5 && Math.abs(f.x - hx) < 1.0) {
        f.dead = true;
        this.scene.remove(f.g);
        const dmg = f.dmg * (f.kind === 'kamikaze' ? 1 : 1);
        if (f.kind === 'kamikaze') {
          this.ring(f.x, 0.8, HERO_Z, 3, '#f472b6');
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
          this.trauma = Math.min(1, this.trauma + 0.45);
        }
        continue;
      }
      if (f.z > 13) {
        f.dead = true; // slipped past (missed dodge vis) — small chip, no damage
        this.scene.remove(f.g);
      }
    }
    this.foes = this.foes.filter((f) => !f.dead);
  }

  private updateCrates(dt: number): void {
    for (const c of this.crates) {
      c.z += SCROLL * dt;
      c.g.position.z = c.z;
      c.g.rotation.y += dt * 0.8;
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
      if (c.z > 12) {
        c.dead = true;
        this.scene.remove(c.g);
      }
    }
    this.cages = this.cages.filter((c) => !c.dead);
  }

  private updateGates(dt: number): void {
    for (const gt of this.gateObjs) {
      if (gt.done) continue;
      const prev = gt.z;
      gt.z += SCROLL * dt;
      gt.g.position.z = gt.z;
      if (prev < HERO_Z && gt.z >= HERO_Z) {
        gt.done = true;
        const fx = this.hero.position.x < 0 ? gt.left : gt.right;
        fx.apply();
        this.floater(this.hero.position.x, 3.4, HERO_Z - 1, `${fx.icon} ${fx.label}`, fx.good ? '#4ade80' : '#f87171');
        if (fx.good) this.sound.pickup();
        else this.sound.hurt();
        this.emitHud();
      }
      if (gt.z > 14) {
        gt.done = true;
        this.scene.remove(gt.g);
      }
    }
    this.gateObjs = this.gateObjs.filter((gt) => !gt.done || gt.z <= 14);
    // fade out passed gates
    for (const gt of this.gateObjs) {
      if (gt.done && gt.z > HERO_Z) {
        gt.g.position.y -= dt * 2;
        if (gt.g.position.y < -3) {
          this.scene.remove(gt.g);
          gt.z = 99;
        }
      }
    }
  }

  private updateAmbient(dt: number): void {
    for (const d of this.dashes) {
      d.position.z += SCROLL * dt;
      if (d.position.z > 18) d.position.z -= 104;
    }
    for (const b of this.buildings) {
      b.position.z += SCROLL * dt;
      if (b.position.z > 20) {
        b.position.z -= 150;
        b.position.x = (b.position.x < 0 ? -1 : 1) * rand(9.5, 17);
      }
    }
    if (this.goalGroup) {
      this.goalGroup.position.z += SCROLL * dt;
    }
  }

  private updateFx(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.m.position.x += p.vx * dt;
      p.m.position.y += p.vy * dt;
      p.m.position.z += p.vz * dt;
      p.vy -= 12 * dt;
      (p.m.material as THREE.MeshBasicMaterial).transparent = true;
      (p.m.material as THREE.MeshBasicMaterial).opacity = clamp(p.life / p.max, 0, 1);
      if (p.life <= 0) {
        this.scene.remove(p.m);
        (p.m.material as THREE.Material).dispose();
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      const s = r.m.scale.x + r.grow * dt;
      r.m.scale.set(s, s, s);
      r.mat.opacity = clamp(r.life / r.max, 0, 1) * 0.9;
      if (r.life <= 0) {
        this.scene.remove(r.m);
        r.m.geometry.dispose();
        r.mat.dispose();
      }
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.sprite.position.y += dt * 1.6;
      (f.sprite.material as THREE.SpriteMaterial).opacity = clamp(f.life / f.max, 0, 1);
      if (f.life <= 0) {
        this.scene.remove(f.sprite);
        f.tex.dispose();
        (f.sprite.material as THREE.Material).dispose();
      }
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
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
    if (this.shakeEnabled && this.trauma > 0) {
      const m = this.trauma * this.trauma * 0.5;
      cam.position.set(rand(-m, m), 8.2 + rand(-m, m), 10.8);
    } else {
      cam.position.set(0, 8.2, 10.8);
    }
    cam.lookAt(this.hero.position.x * 0.35, 1.2, -7);
    this.renderer.render(this.scene, cam);
  }
}
