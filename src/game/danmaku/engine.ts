import { STAGES, type Difficulty, type WeaponId } from './config';
import { DanmakuSim, type InputState, type RunResult } from './sim';
import { DanmakuView } from './view';
import { shmupSound } from '../shmup/audio';
import { saveContinue, clearContinue } from '../shmup/storage';

export interface HudSnapshot {
  score: number;
  chain: number;
  chainT: number;
  maxChain: number;
  stage: number;
  lives: number;
  bombs: number;
  power: number;
  weapon: WeaponId;
  difficulty: Difficulty;
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

export type EngineEvent =
  | { type: 'hud'; hud: HudSnapshot }
  | { type: 'banner'; title: string; sub?: string; spell?: boolean }
  | { type: 'gameover'; result: RunResult }
  | { type: 'error'; message: string }
  | { type: 'autopause' };

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  weapon: WeaponId;
  difficulty: Difficulty;
  power: number;
  stage: number;
  score: number;
  lives: number;
  muted: boolean;
  shake: boolean;
  onEvent: (e: EngineEvent) => void;
}

const STEP = 1 / 60;

export class DanmakuEngine {
  private canvas: HTMLCanvasElement;
  private onEvent: (e: EngineEvent) => void;
  private sound = shmupSound;
  private sim = new DanmakuSim();
  private view: DanmakuView | null = null;

  private raf = 0;
  private last = 0;
  private acc = 0;
  private destroyed = false;
  private paused = false;
  private errorReported = false;
  private fps = 60;
  private hudT = 0;
  private time = 0;
  private shakeOn: boolean;

  private keys = new Set<string>();
  // mouse: absolute follow without any button pressed. Touch/pen: relative
  // follow with a grab offset so the finger never covers or teleports the ship.
  private mouseSeen = false;
  private mouseX = 240;
  private mouseY = 680;
  private touchId: number | null = null;
  private touchTX = 240;
  private touchTY = 680;
  private grabOX = 0;
  private grabOY = 0;
  private rFocus = false;

  // transition polling
  private prevLives = 3;
  private prevBombs = 3;
  private prevPower = 1;
  private prevKills = 0;
  private prevGraze = 0;
  private prevStageIdx = 0;
  private prevBossAlive = false;

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
    if (document.hidden && !this.paused && !this.destroyed && this.sim.phase !== 'over') {
      this.setPaused(true);
      this.onEvent({ type: 'autopause' });
    }
  };
  private onPointerDown = (e: PointerEvent) => {
    this.sound.unlock();
    const p = this.toLogical(e.clientX, e.clientY);
    if (!p) return;
    if (e.pointerType === 'mouse') {
      if (e.button === 2) {
        this.rFocus = true;
        return;
      }
      // snap-free: smoothing in sim eases the ship to the cursor
      this.mouseSeen = true;
      this.mouseX = p.x;
      this.mouseY = p.y;
    } else {
      if (this.touchId !== null) return;
      this.touchId = e.pointerId;
      // grab offset keeps the ship where it is instead of jumping under the finger
      this.grabOX = this.sim.px - p.x;
      this.grabOY = this.sim.py - p.y;
      this.touchTX = this.sim.px;
      this.touchTY = this.sim.py;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch { /* ignore */ }
    }
  };
  private onPointerMove = (e: PointerEvent) => {
    const p = this.toLogical(e.clientX, e.clientY);
    if (!p) return;
    if (e.pointerType === 'mouse') {
      this.mouseSeen = true;
      this.mouseX = p.x;
      this.mouseY = p.y;
    } else if (e.pointerId === this.touchId) {
      this.touchTX = p.x + this.grabOX;
      this.touchTY = p.y + this.grabOY;
    }
  };
  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 2) this.rFocus = false;
      return;
    }
    if (e.pointerId === this.touchId) this.touchId = null;
  };
  private onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') this.mouseSeen = false;
  };
  private onContextMenu = (e: Event) => {
    e.preventDefault();
  };
  private onBlur = () => {
    this.touchId = null;
    this.rFocus = false;
    this.mouseSeen = false;
    this.keys.clear();
  };

  constructor(opts: EngineOptions) {
    this.canvas = opts.canvas;
    this.onEvent = opts.onEvent;
    this.shakeOn = opts.shake;
    this.sim.reset({
      stage: opts.stage, score: opts.score, lives: opts.lives,
      weapon: opts.weapon, power: opts.power, difficulty: opts.difficulty,
    });
    this.sound.setMuted(opts.muted);
    this.prevLives = this.sim.lives;
    this.prevBombs = this.sim.bombs;
    this.prevPower = this.sim.power;
    this.prevStageIdx = this.sim.stageIdx;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVis);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  start(): void {
    try {
      this.startInner();
    } catch (err) {
      this.errorReported = true;
      this.onEvent({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  private startInner(): void {
    this.view = new DanmakuView(this.canvas);
    this.view.setShakeEnabled(this.shakeOn);
    try {
      (window as unknown as { __danmaku?: DanmakuEngine }).__danmaku = this;
    } catch { /* ignore */ }
    this.sound.unlock();
    this.sound.startBgm(110 + this.sim.stageIdx * 8);
    const st = STAGES[this.sim.stageIdx];
    this.onEvent({ type: 'banner', title: `Stage ${this.sim.stage}`, sub: st ? `${st.name} — ${st.sub}` : '' });
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
          const ts = this.sim.slowmo > 0 ? 0.35 : 1;
          this.acc += dt * ts;
          let n = 0;
          while (this.acc >= STEP && n < 4) {
            this.stepSim(STEP);
            this.acc -= STEP;
            n++;
          }
          if (n === 4) this.acc = 0;
        }
        this.time += dt;
        this.view?.render(this.sim, this.time);
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
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVis);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.view?.dispose();
    this.view = null;
    this.sound.stopBgm();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  setPaused(p: boolean): void {
    if (this.sim.phase === 'over') return;
    if (this.paused === p) return;
    this.paused = p;
    if (p) {
      this.sound.stopBgm();
      this.sound.suspend();
    } else {
      this.sound.resume();
      this.sound.startBgm(110 + this.sim.stageIdx * 8);
      this.last = performance.now();
      this.acc = 0;
    }
  }

  setMuted(m: boolean): void {
    this.sound.setMuted(m);
    if (!m && !this.paused) this.sound.startBgm(110 + this.sim.stageIdx * 8);
  }

  setShake(on: boolean): void {
    this.shakeOn = on;
    this.view?.setShakeEnabled(on);
  }

  useBomb(): void {
    if (this.paused || this.destroyed) return;
    if (this.sim.useBomb()) this.sound.bomb();
  }

  cycleWeapon(): void {
    if (this.paused || this.destroyed) return;
    this.sim.cycleWeapon();
    this.sound.power();
    this.pushHud();
  }

  getStats(): Record<string, number | string> {
    let pb = 0;
    let eb = 0;
    let en = 0;
    for (const b of this.sim.pbullets) if (b.alive) pb++;
    for (const b of this.sim.ebullets) if (b.alive) eb++;
    for (const e of this.sim.enemies) if (e.alive) en++;
    return {
      pb, eb, en, phase: this.sim.phase, score: this.sim.score,
      lives: this.sim.lives, power: this.sim.power, weapon: this.sim.weapon,
      fps: Math.round(this.fps), stage: this.sim.stage,
      boss: this.sim.boss.alive ? Math.round(this.sim.boss.hp) : 0,
    };
  }

  // ---------------- internals ----------------

  private toLogical(cx: number, cy: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    // mirror DanmakuView.resize: height 800 always visible; wider/narrower
    // screens extend the visible world. Y axis: sim y=0 is screen top.
    const aspect = rect.width / rect.height;
    let halfW = 400 * aspect;
    let halfH = 400;
    if (halfW < 240) {
      halfW = 240;
      halfH = 240 / Math.max(0.01, aspect);
    }
    return {
      x: 240 - halfW + ((cx - rect.left) / rect.width) * 2 * halfW,
      y: 400 - halfH + ((cy - rect.top) / rect.height) * 2 * halfH,
    };
  }

  private stepSim(dt: number): void {
    const k = this.keys;
    const touching = this.touchId !== null;
    const kb = k.has('ArrowLeft') || k.has('KeyA') || k.has('ArrowRight') || k.has('KeyD')
      || k.has('ArrowUp') || k.has('KeyW') || k.has('ArrowDown') || k.has('KeyS');
    if (kb) {
      // re-sync pointer targets so the ship doesn't snap back to a stale
      // cursor/finger position when the keys are released
      this.mouseX = this.sim.px;
      this.mouseY = this.sim.py;
      this.touchTX = this.sim.px;
      this.touchTY = this.sim.py;
    }
    const input: InputState = {
      left: k.has('ArrowLeft') || k.has('KeyA'),
      right: k.has('ArrowRight') || k.has('KeyD'),
      up: k.has('ArrowUp') || k.has('KeyW'),
      down: k.has('ArrowDown') || k.has('KeyS'),
      focus: k.has('ShiftLeft') || k.has('ShiftRight') || this.rFocus,
      tx: touching ? this.touchTX : this.mouseX,
      ty: touching ? this.touchTY : this.mouseY,
      tMode: touching ? 'touch' : this.mouseSeen ? 'mouse' : null,
    };
    this.sim.step(dt, input);
    this.sound.shoot();

    // transition-driven SFX + persistence
    const s = this.sim;
    if (s.kills > this.prevKills) this.sound.boom();
    if (s.graze > this.prevGraze) this.sound.graze();
    if (s.power > this.prevPower) this.sound.power();
    if (s.lives < this.prevLives) this.sound.bigBoom();
    if (s.stageIdx !== this.prevStageIdx) {
      this.sound.startBgm(110 + s.stageIdx * 8);
    }
    if (this.prevBossAlive && !s.boss.alive && s.phase === 'interval') {
      this.sound.bigBoom();
      saveContinue({ stage: s.stage + 1, score: s.score, weapon: s.weapon, weaponLevel: s.power });
    }
    this.prevKills = s.kills;
    this.prevGraze = s.graze;
    this.prevPower = s.power;
    this.prevLives = s.lives;
    this.prevBombs = s.bombs;
    this.prevStageIdx = s.stageIdx;
    this.prevBossAlive = s.boss.alive;

    for (const ev of s.events.splice(0, s.events.length)) {
      if (ev.type === 'banner') this.onEvent({ type: 'banner', title: ev.title, sub: ev.sub });
      else if (ev.type === 'spell') {
        this.onEvent({ type: 'banner', title: ev.name, sub: ev.sub, spell: true });
        this.sound.warn();
      } else if (ev.type === 'warn') {
        this.onEvent({ type: 'banner', title: '⚠ WARNING ⚠', sub: `${ev.boss} 接近中！` });
        this.sound.warn();
      } else if (ev.type === 'extend') {
        this.onEvent({ type: 'banner', title: '1UP！残機追加', sub: 'よく頑張った！' });
        this.sound.power();
      } else if (ev.type === 'gameover') {
        clearContinue();
        this.sound.stopBgm();
        this.onEvent({ type: 'gameover', result: ev.result });
      }
    }

    this.hudT += dt;
    if (this.hudT >= 0.1) {
      this.hudT = 0;
      this.pushHud();
    }
  }

  private pushHud(): void {
    const s = this.sim;
    const b = s.boss;
    let pb = 0;
    let eb = 0;
    for (const x of s.pbullets) if (x.alive) pb++;
    for (const x of s.ebullets) if (x.alive) eb++;
    this.onEvent({
      type: 'hud',
      hud: {
        score: s.score,
        chain: s.chain,
        chainT: s.chainT,
        maxChain: s.maxChain,
        stage: s.stage,
        lives: Math.max(0, s.lives),
        bombs: s.bombs,
        power: s.power,
        weapon: s.weapon,
        difficulty: s.diff,
        bossActive: b.alive && b.entered,
        bossHp: Math.max(0, Math.round(b.hp)),
        bossMax: Math.max(1, Math.round(b.maxHp)),
        bossName: (STAGES[b.idx]?.boss ?? 'ボス') as string,
        kills: s.kills,
        graze: s.graze,
        fps: Math.round(this.fps),
        pb,
        eb,
      },
    });
  }
}
