import * as THREE from 'three';
import { VIEW_W, VIEW_H } from './config';
import { MAX_PB, MAX_EB, MAX_EN, MAX_PT, MAX_RING, MAX_TX, type DanmakuSim } from './sim';
import {
  orbTexture, boltTexture, ringTexture, dotTexture, playerTexture, optionTexture,
  hitboxTexture, enemyTextures, bossTextures, itemTextures, backgroundTexture, TextLabel,
} from './textures';

const WORLD_X = (x: number): number => x - VIEW_W / 2;
const WORLD_Y = (y: number): number => VIEW_H / 2 - y;

/** Three.js renderer: instanced quads + additive glow. Zero per-frame allocation. */
export class DanmakuView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private canvas: HTMLCanvasElement;
  private dummy = new THREE.Object3D();
  private tmpColor = new THREE.Color();

  private bgMat!: THREE.MeshBasicMaterial;
  private bgMeshes: THREE.Mesh[] = [];
  private bgTex: THREE.Texture | null = null;
  private stageIdx = -1;

  private stars: THREE.Points[] = [];
  private starSpeed = [14, 34];

  private pbMesh!: THREE.InstancedMesh;
  private ebMesh!: THREE.InstancedMesh;
  private enemyMeshes: Record<string, THREE.InstancedMesh> = {};
  private itemMeshes: Record<string, THREE.InstancedMesh> = {};
  private particleMesh!: THREE.InstancedMesh;
  private ringMesh!: THREE.InstancedMesh;

  private bossSprite!: THREE.Sprite;
  private bossMats!: THREE.SpriteMaterial;
  private bossTex: THREE.Texture[] = [];
  private playerSprite!: THREE.Sprite;
  private optionSprites: THREE.Sprite[] = [];
  private hitboxSprite!: THREE.Sprite;

  private labels: TextLabel[] = [];
  private labelSprites: THREE.Sprite[] = [];
  private labelMats: THREE.SpriteMaterial[] = [];
  private labelLast: string[] = [];

  private flashMat!: THREE.MeshBasicMaterial;
  private lastW = 0;
  private lastH = 0;
  private shakeEnabled = true;

  setShakeEnabled(on: boolean): void {
    this.shakeEnabled = on;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.camera = new THREE.OrthographicCamera(-240, 240, 400, -400, 0.1, 50);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    // background planes (two copies for seamless scroll)
    this.bgMat = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false });
    const bgGeo = new THREE.PlaneGeometry(VIEW_W, VIEW_H);
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(bgGeo, this.bgMat);
      m.position.z = -5;
      m.renderOrder = 0;
      m.frustumCulled = false;
      this.scene.add(m);
      this.bgMeshes.push(m);
    }

    // starfields
    for (let layer = 0; layer < 2; layer++) {
      const n = layer === 0 ? 130 : 90;
      const pos = new Float32Array(n * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        size: layer === 0 ? 2.2 : 3.4,
        map: dotTexture(),
        transparent: true,
        opacity: layer === 0 ? 0.55 : 0.85,
        color: layer === 0 ? 0x8fb8ff : 0xffffff,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.renderOrder = 1;
      pts.frustumCulled = false;
      pts.userData.seed = 1000 + layer * 777;
      this.scene.add(pts);
      this.stars.push(pts);
    }

    const quad = new THREE.PlaneGeometry(1, 1);
    const mkInst = (
      map: THREE.Texture, cap: number, additive: boolean, order: number,
    ): THREE.InstancedMesh => {
      const mat = new THREE.MeshBasicMaterial({
        map, transparent: true, depthTest: false, depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const mesh = new THREE.InstancedMesh(quad, mat, cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.renderOrder = order;
      mesh.frustumCulled = false;
      const white = new THREE.Color(1, 1, 1);
      for (let i = 0; i < cap; i++) {
        this.dummy.position.set(0, 0, -50);
        this.dummy.scale.set(0.001, 0.001, 1);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
        mesh.setColorAt(i, white);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.scene.add(mesh);
      return mesh;
    };

    this.pbMesh = mkInst(boltTexture(), MAX_PB, true, 5);
    this.ebMesh = mkInst(orbTexture(), MAX_EB, true, 7);
    this.particleMesh = mkInst(dotTexture(), MAX_PT, true, 8);
    this.ringMesh = mkInst(ringTexture(), MAX_RING, true, 9);

    const et = enemyTextures();
    for (const [kind, t] of Object.entries(et)) {
      this.enemyMeshes[kind] = mkInst(t, 24, false, 3);
    }
    const it = itemTextures();
    for (const [kind, t] of Object.entries(it)) {
      this.itemMeshes[kind] = mkInst(t, 10, false, 2);
    }

    // boss / player / options / hitbox
    this.bossTex = bossTextures();
    this.bossMats = new THREE.SpriteMaterial({ map: this.bossTex[0], transparent: true, depthTest: false });
    this.bossSprite = new THREE.Sprite(this.bossMats);
    this.bossSprite.scale.set(116, 116, 1);
    this.bossSprite.renderOrder = 4;
    this.bossSprite.visible = false;
    this.scene.add(this.bossSprite);

    this.playerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: playerTexture(), transparent: true, depthTest: false }));
    this.playerSprite.scale.set(52, 52, 1);
    this.playerSprite.renderOrder = 6;
    this.scene.add(this.playerSprite);

    const optTex = optionTexture();
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: optTex, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
      s.scale.set(24, 24, 1);
      s.renderOrder = 6;
      this.scene.add(s);
      this.optionSprites.push(s);
    }
    this.hitboxSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: hitboxTexture(), transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
    this.hitboxSprite.scale.set(20, 20, 1);
    this.hitboxSprite.renderOrder = 6;
    this.scene.add(this.hitboxSprite);

    // floating text labels
    for (let i = 0; i < MAX_TX; i++) {
      const label = new TextLabel();
      const mat = new THREE.SpriteMaterial({ map: label.texture, transparent: true, depthTest: false });
      const s = new THREE.Sprite(mat);
      s.scale.set(150, 28, 1);
      s.renderOrder = 10;
      s.visible = false;
      this.scene.add(s);
      this.labels.push(label);
      this.labelSprites.push(s);
      this.labelMats.push(mat);
      this.labelLast.push('');
    }

    // fullscreen flash quad (follows camera size)
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.flashMat);
    flash.position.z = 8;
    flash.renderOrder = 11;
    flash.frustumCulled = false;
    flash.onBeforeRender = (renderer) => {
      const size = new THREE.Vector2();
      renderer.getSize(size);
      flash.scale.set(size.x + 4, size.y + 4, 1);
    };
    this.scene.add(flash);

    this.resize(true);
  }

  resize(force = false): void {
    const w = this.canvas.clientWidth || VIEW_W;
    const h = this.canvas.clientHeight || VIEW_H;
    if (!force && w === this.lastW && h === this.lastH) return;
    this.lastW = w;
    this.lastH = h;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const aspect = w / Math.max(1, h);
    let halfW = 400 * aspect;
    let halfH = 400;
    if (halfW < 240) {
      halfW = 240;
      halfH = 240 / Math.max(0.01, aspect);
    }
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    // spread stars across the visible frustum
    for (const pts of this.stars) {
      const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      let seed = pts.userData.seed as number;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      for (let i = 0; i < attr.count; i++) {
        attr.setXYZ(i, (rand() * 2 - 1) * halfW, (rand() * 2 - 1) * halfH, -4 + rand() * 2);
      }
      attr.needsUpdate = true;
    }
  }

  setStage(idx: number): void {
    if (idx === this.stageIdx) return;
    this.stageIdx = idx;
    if (this.bgTex) this.bgTex.dispose();
    this.bgTex = backgroundTexture(idx, VIEW_W, VIEW_H);
    this.bgMat.map = this.bgTex;
    this.bgMat.needsUpdate = true;
    const bt = this.bossTex[idx % this.bossTex.length];
    if (bt) {
      this.bossMats.map = bt;
      this.bossMats.needsUpdate = true;
    }
  }

  private writeInst(
    mesh: THREE.InstancedMesh, i: number,
    x: number, y: number, w: number, h: number, rot: number,
    r: number, g: number, b: number,
  ): void {
    this.dummy.position.set(x, y, 0);
    this.dummy.rotation.set(0, 0, rot);
    this.dummy.scale.set(Math.max(0.001, w), Math.max(0.001, h), 1);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(i, this.dummy.matrix);
    this.tmpColor.setRGB(r, g, b);
    mesh.setColorAt(i, this.tmpColor);
  }

  private flush(mesh: THREE.InstancedMesh, n: number): void {
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  render(sim: DanmakuSim, time: number): void {
    this.resize();
    this.setStage(sim.stageIdx);

    // camera shake (trauma^2)
    const allowShake =
      this.shakeEnabled && (typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const tr = allowShake ? sim.trauma * sim.trauma : 0;
    this.camera.position.set((Math.random() - 0.5) * 2 * tr * 13, (Math.random() - 0.5) * 2 * tr * 13, 10);

    // background scroll (two wrapped copies covering logical [off-800,off] and [off,off+800])
    const off = sim.scroll % VIEW_H;
    if (this.bgMeshes[0]) this.bgMeshes[0].position.y = 800 - off;
    if (this.bgMeshes[1]) this.bgMeshes[1].position.y = -off;

    // starfields drift
    for (let l = 0; l < this.stars.length; l++) {
      const pts = this.stars[l];
      if (!pts) continue;
      const sp = this.starSpeed[l] ?? 20;
      pts.position.y = -((sim.scroll * sp * 0.02) % 160);
      if (pts.position.y > 0) pts.position.y -= 160;
    }

    // player bullets
    let n = 0;
    for (const bl of sim.pbullets) {
      if (!bl.alive) continue;
      const rot = Math.atan2(bl.vx, -bl.vy);
      if (bl.kind === 0) this.writeInst(this.pbMesh, n++, WORLD_X(bl.x), WORLD_Y(bl.y), 20, 38, rot, 1, 0.68, 0.16);
      else if (bl.kind === 1) this.writeInst(this.pbMesh, n++, WORLD_X(bl.x), WORLD_Y(bl.y), 22, 32, rot, 0.3, 0.85, 1);
      else if (bl.kind === 2) this.writeInst(this.pbMesh, n++, WORLD_X(bl.x), WORLD_Y(bl.y), 18, 30, rot, 0.75, 0.45, 1);
      else this.writeInst(this.pbMesh, n++, WORLD_X(bl.x), WORLD_Y(bl.y), 26, 46, rot, 0.45, 1, 0.55);
    }
    this.flush(this.pbMesh, n);

    // enemy bullets (gentle pulse)
    n = 0;
    let bi = 0;
    for (const bl of sim.ebullets) {
      if (!bl.alive) continue;
      const pulse = 1 + 0.09 * Math.sin(time * 11 + bi * 1.7);
      bi++;
      if (bl.big) this.writeInst(this.ebMesh, n++, WORLD_X(bl.x), WORLD_Y(bl.y), 24 * pulse, 24 * pulse, 0, 1, 0.55, 0.2);
      else this.writeInst(this.ebMesh, n++, WORLD_X(bl.x), WORLD_Y(bl.y), 16 * pulse, 16 * pulse, 0, 1, 0.25, 0.4);
    }
    this.flush(this.ebMesh, n);

    // enemies grouped by kind
    const counts: Record<string, number> = {};
    for (const e of sim.enemies) {
      if (!e.alive) continue;
      const mesh = this.enemyMeshes[e.kind];
      if (!mesh) continue;
      const i = counts[e.kind] ?? 0;
      counts[e.kind] = i + 1;
      if (i >= 24) continue;
      const pulse = e.tele > 0 ? 1 + 0.14 * Math.sin(time * 30) : 1;
      const s = (e.r * 2 + 12) * pulse;
      this.writeInst(mesh, i, WORLD_X(e.x), WORLD_Y(e.y), s, s, 0, 1, 1, 1);
    }
    for (const [kind, mesh] of Object.entries(this.enemyMeshes)) {
      this.flush(mesh, Math.min(24, counts[kind] ?? 0));
    }

    // items grouped by kind
    const icounts: Record<string, number> = {};
    for (const it of sim.items) {
      if (!it.alive) continue;
      const mesh = this.itemMeshes[it.kind];
      if (!mesh) continue;
      const i = icounts[it.kind] ?? 0;
      icounts[it.kind] = i + 1;
      if (i >= 10) continue;
      this.writeInst(mesh, i, WORLD_X(it.x), WORLD_Y(it.y + Math.sin(it.t * 6) * 3), 34, 34, 0, 1, 1, 1);
    }
    for (const [kind, mesh] of Object.entries(this.itemMeshes)) {
      this.flush(mesh, Math.min(10, icounts[kind] ?? 0));
    }

    // boss
    const b = sim.boss;
    this.bossSprite.visible = b.alive;
    if (b.alive) {
      this.bossSprite.position.set(WORLD_X(b.x), WORLD_Y(b.y), 0);
      const telePulse = b.tele > 0 ? 1 + 0.06 * Math.sin(time * 26) : 1;
      this.bossSprite.scale.set(116 * telePulse, 116 * telePulse, 1);
      this.bossSprite.material.rotation = Math.sin(b.t * 0.8) * 0.06;
      if (b.flash > 0) this.bossMats.color.setRGB(1, 0.45 + 0.3 * (1 - b.flash), 0.45 + 0.3 * (1 - b.flash));
      else if (b.tele > 0) this.bossMats.color.setRGB(1, 0.9, 0.6);
      else this.bossMats.color.setRGB(1, 1, 1);
    }

    // player + options + hitbox
    const showShip = sim.deadT <= 0 && sim.phase !== 'over';
    this.playerSprite.visible = showShip && !(sim.invuln > 0 && Math.floor(time * 14) % 2 === 0);
    if (showShip) {
      this.playerSprite.position.set(WORLD_X(sim.px), WORLD_Y(sim.py), 0);
      for (let k = 0; k < 2; k++) {
        const s = this.optionSprites[k];
        if (!s) continue;
        s.visible = this.playerSprite.visible;
        s.position.set(WORLD_X(sim.px + (k === 0 ? -27 : 27)), WORLD_Y(sim.py + 8 + Math.sin(time * 5 + k * 2) * 2), 0);
      }
      this.hitboxSprite.visible = this.playerSprite.visible && sim.focusHeld;
      this.hitboxSprite.position.set(WORLD_X(sim.px), WORLD_Y(sim.py), 0);
      if (this.hitboxSprite.visible) {
        const pulse = 1 + 0.12 * Math.sin(time * 12);
        this.hitboxSprite.scale.set(20 * pulse, 20 * pulse, 1);
      }
    } else {
      this.playerSprite.visible = false;
      for (const s of this.optionSprites) s.visible = false;
      this.hitboxSprite.visible = false;
    }

    // particles (additive fade via color scaling)
    n = 0;
    for (const p of sim.particles) {
      if (!p.alive) continue;
      const a = Math.max(0, p.life / p.maxLife);
      const cr = ((p.color >> 16) & 255) / 255;
      const cg = ((p.color >> 8) & 255) / 255;
      const cb = (p.color & 255) / 255;
      const s = p.size * (0.5 + a * 0.7) * 2.2;
      this.writeInst(this.particleMesh, n++, WORLD_X(p.x), WORLD_Y(p.y), s, s, 0, cr * a, cg * a, cb * a);
      if (n >= MAX_PT) break;
    }
    this.flush(this.particleMesh, n);

    // shockwave rings
    n = 0;
    for (const r of sim.rings) {
      if (!r.alive) continue;
      const a = Math.max(0, r.life / r.maxLife);
      const cr = ((r.color >> 16) & 255) / 255;
      const cg = ((r.color >> 8) & 255) / 255;
      const cb = (r.color & 255) / 255;
      this.writeInst(this.ringMesh, n++, WORLD_X(r.x), WORLD_Y(r.y), r.r * 2, r.r * 2, 0, cr * a, cg * a, cb * a);
      if (n >= MAX_RING) break;
    }
    this.flush(this.ringMesh, n);

    // floating texts
    for (let i = 0; i < MAX_TX; i++) {
      const t = sim.texts[i];
      const spr = this.labelSprites[i];
      const mat = this.labelMats[i];
      const label = this.labels[i];
      if (!t || !spr || !mat || !label) continue;
      if (!t.alive) {
        spr.visible = false;
        this.labelLast[i] = '';
        continue;
      }
      const key = `${t.text}|${t.color}`;
      if (this.labelLast[i] !== key) {
        this.labelLast[i] = key;
        label.set(t.text, t.color);
      }
      spr.visible = true;
      spr.position.set(WORLD_X(t.x), WORLD_Y(t.y), 0);
      mat.opacity = Math.min(1, t.life * 2);
    }

    // screen flash
    this.flashMat.opacity = Math.min(0.75, sim.flashA);
    this.flashMat.color.set(sim.flashColor);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const geo = (mesh as THREE.InstancedMesh).geometry ?? (mesh as THREE.Mesh).geometry;
      if (geo) geo.dispose();
      const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) {
        for (const m of mat) {
          const mm = m as THREE.MeshBasicMaterial;
          if (mm.map) mm.map.dispose();
          m.dispose();
        }
      } else if (mat) {
        const mm = mat as THREE.MeshBasicMaterial;
        if (mm.map) mm.map.dispose();
        mat.dispose();
      }
    });
    for (const l of this.labels) l.dispose();
    if (this.bgTex) this.bgTex.dispose();
    this.renderer.dispose();
  }
}
