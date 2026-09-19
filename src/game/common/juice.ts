/**
 * Shared Juice Utilities
 * Commercial-grade game feel and kinetic feedback components:
 * 1. TraumaScreenShake: Non-linear trauma decay screen shake with multi-octave noise.
 * 2. HitStopManager: Frame micro-freeze timer for punchy impact weight.
 * 3. DamageNumberPool: Zero-GC spring-scale animated floating combat numbers.
 */

// ==========================================
// 1. Trauma Screen Shake
// ==========================================

export interface TraumaScreenShakeOptions {
  /** Maximum translational pixel offset at full trauma (default: 18) */
  maxOffset?: number;
  /** Maximum rotational angle in radians at full trauma (default: 0.05 rad ≈ 2.8°) */
  maxAngle?: number;
  /** Linear decay rate of trauma per second (default: 1.4) */
  decayRate?: number;
  /** Oscillation frequency for noise/sine generators (default: 32) */
  frequency?: number;
  /** Exponent for trauma to intensity mapping (default: 2, quadratic) */
  exponent?: number;
}

export interface ScreenShakeOffset {
  offsetX: number;
  offsetY: number;
  angle: number;
}

export class TraumaScreenShake {
  private trauma = 0;
  private maxOffset: number;
  private maxAngle: number;
  private decayRate: number;
  private frequency: number;
  private exponent: number;
  private time = 0;

  // Cached current offsets
  private currentOffsetX = 0;
  private currentOffsetY = 0;
  private currentAngle = 0;

  constructor(options: TraumaScreenShakeOptions = {}) {
    this.maxOffset = options.maxOffset ?? 18;
    this.maxAngle = options.maxAngle ?? 0.05;
    this.decayRate = options.decayRate ?? 1.4;
    this.frequency = options.frequency ?? 32;
    this.exponent = options.exponent ?? 2;
  }

  /**
   * Adds trauma clamped to [0, 1].
   * @param amount Float typically between 0.1 (minor hit) and 0.8 (huge explosion/death)
   */
  public addTrauma(amount: number): void {
    this.trauma = Math.min(1, Math.max(0, this.trauma + amount));
  }

  /**
   * Directly sets the current trauma value clamped to [0, 1].
   */
  public setTrauma(amount: number): void {
    this.trauma = Math.min(1, Math.max(0, amount));
  }

  /**
   * Returns current raw trauma in [0, 1].
   */
  public getTrauma(): number {
    return this.trauma;
  }

  /**
   * Returns current shake intensity (trauma ^ exponent, quadratic falloff by default).
   */
  public getIntensity(): number {
    return Math.pow(this.trauma, this.exponent);
  }

  /**
   * Returns the last computed offset and angle.
   */
  public getOffset(): ScreenShakeOffset {
    return {
      offsetX: this.currentOffsetX,
      offsetY: this.currentOffsetY,
      angle: this.currentAngle,
    };
  }

  /**
   * Resets trauma and offsets to 0.
   */
  public reset(): void {
    this.trauma = 0;
    this.currentOffsetX = 0;
    this.currentOffsetY = 0;
    this.currentAngle = 0;
    this.time = 0;
  }

  /**
   * Updates trauma decay and computes new screen shake translational and rotational offsets.
   * @param dt Delta time in seconds
   * @returns Computed offsetX, offsetY, and angle
   */
  public update(dt: number): ScreenShakeOffset {
    if (this.trauma <= 0.0001) {
      this.trauma = 0;
      this.currentOffsetX = 0;
      this.currentOffsetY = 0;
      this.currentAngle = 0;
      return { offsetX: 0, offsetY: 0, angle: 0 };
    }

    // Linear trauma decay
    this.trauma = Math.max(0, this.trauma - this.decayRate * dt);
    this.time += dt;

    // Intensity = trauma * trauma (quadratic falloff gives heavy feel for large hits, rapid settle)
    const intensity = Math.pow(this.trauma, this.exponent);

    if (intensity <= 0.0001) {
      this.currentOffsetX = 0;
      this.currentOffsetY = 0;
      this.currentAngle = 0;
      return { offsetX: 0, offsetY: 0, angle: 0 };
    }

    // High-frequency organic multi-octave harmonic noise
    const noiseX = this.sampleNoise(0.0);
    const noiseY = this.sampleNoise(137.5);
    const noiseRot = this.sampleNoise(271.3);

    this.currentOffsetX = this.maxOffset * intensity * noiseX;
    this.currentOffsetY = this.maxOffset * intensity * noiseY;
    this.currentAngle = this.maxAngle * intensity * noiseRot;

    return {
      offsetX: this.currentOffsetX,
      offsetY: this.currentOffsetY,
      angle: this.currentAngle,
    };
  }

  /**
   * Applies the computed trauma shake translation and rotation to a 2D Canvas context.
   * Typically called right after ctx.save() and before rendering world objects.
   * @param ctx CanvasRenderingContext2D
   * @param centerX Center point of canvas for rotation (defaults to ctx.canvas.width / 2)
   * @param centerY Center point of canvas for rotation (defaults to ctx.canvas.height / 2)
   */
  public applyToCanvas(ctx: CanvasRenderingContext2D, centerX?: number, centerY?: number): void {
    if (this.trauma <= 0.0001) return;

    const cx = centerX ?? ctx.canvas.width / 2;
    const cy = centerY ?? ctx.canvas.height / 2;

    ctx.translate(this.currentOffsetX + cx, this.currentOffsetY + cy);
    if (this.currentAngle !== 0) {
      ctx.rotate(this.currentAngle);
    }
    ctx.translate(-cx, -cy);
  }

  /**
   * Applies camera offsets to a 3D camera (e.g. Three.js PerspectiveCamera).
   */
  public applyToCamera(camera: { position: { x: number; y: number; z?: number }; rotation?: { z: number } }): void {
    camera.position.x += this.currentOffsetX;
    camera.position.y += this.currentOffsetY;
    if (camera.rotation) {
      camera.rotation.z += this.currentAngle;
    }
  }

  /**
   * Multi-octave continuous pseudo-noise function using non-harmonic irrational multipliers.
   */
  private sampleNoise(seed: number): number {
    const t = this.time * this.frequency + seed;
    // 3 octaves with irrational/prime frequency multipliers for continuous, non-repeating shaking
    const o1 = Math.sin(t);
    const o2 = Math.sin(t * 2.19 + 1.23) * 0.5;
    const o3 = Math.sin(t * 4.47 + 2.71) * 0.25;
    return (o1 + o2 + o3) / 1.75;
  }
}

// ==========================================
// 2. HitStop Micro-Freeze Manager
// ==========================================

export interface HitStopOptions {
  /** Optional slow-motion time multiplier during freeze (0 = complete freeze, 0.1 = slow-mo). Default: 0 */
  timeScale?: number;
}

export class HitStopManager {
  private timeRemaining = 0;
  private timeScale: number;

  constructor(options: HitStopOptions = {}) {
    this.timeScale = options.timeScale ?? 0;
  }

  /**
   * Triggers a hitstop micro-freeze.
   * If `duration` is > 1.0, it is automatically treated as milliseconds (e.g. `trigger(30)` -> 30ms).
   * If `duration` is <= 1.0, it is treated as seconds (e.g. `trigger(0.03)` -> 30ms).
   * @param duration Micro-freeze duration in seconds or milliseconds
   */
  public trigger(duration: number): void {
    if (!Number.isFinite(duration) || duration <= 0) return;
    const seconds = duration > 1.0 ? duration / 1000 : duration;
    this.timeRemaining = Math.max(this.timeRemaining, Math.max(0, seconds));
  }

  /**
   * Triggers a hitstop micro-freeze explicitly in milliseconds (e.g. `triggerMs(40)`).
   */
  public triggerMs(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    this.timeRemaining = Math.max(this.timeRemaining, Math.max(0, durationMs / 1000));
  }

  /**
   * Triggers a hitstop micro-freeze explicitly in seconds (e.g. `triggerSeconds(0.04)`).
   */
  public triggerSeconds(durationSec: number): void {
    if (!Number.isFinite(durationSec) || durationSec <= 0) return;
    this.timeRemaining = Math.max(this.timeRemaining, Math.max(0, durationSec));
  }

  /**
   * Updates hitstop countdown.
   * @param dt Frame delta time in seconds
   * @returns `{ frozen: boolean; effectiveDt: number }` where effectiveDt is 0 (or timeScaled) when frozen.
   */
  public update(dt: number): { frozen: boolean; effectiveDt: number } {
    if (!Number.isFinite(this.timeRemaining) || this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      return { frozen: false, effectiveDt: dt };
    }

    this.timeRemaining -= dt;

    if (!Number.isFinite(this.timeRemaining) || this.timeRemaining <= 0) {
      // Transitioning back out of freeze this frame
      const surplus = Math.max(0, -this.timeRemaining);
      this.timeRemaining = 0;
      return { frozen: false, effectiveDt: surplus };
    }

    return {
      frozen: true,
      effectiveDt: dt * this.timeScale,
    };
  }

  /**
   * Returns true if currently in micro-freeze state.
   */
  public isFrozen(): boolean {
    return this.timeRemaining > 0;
  }

  /**
   * Returns the remaining hitstop freeze duration in seconds.
   */
  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * Cancels any active hitstop freeze immediately.
   */
  public reset(): void {
    this.timeRemaining = 0;
  }
}

// ==========================================
// 3. Pooled Damage Numbers (Spring Pop & Floating)
// ==========================================

export type DamageNumberType = 'normal' | 'crit' | 'player' | 'heal' | 'custom';

export interface DamageNumberStyle {
  color: string;
  strokeColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  initialScale: number;
  targetScale: number;
  prefix?: string;
  suffix?: string;
}

export interface DamageNumberOptions {
  type?: DamageNumberType;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  initialScale?: number;
  lifespan?: number;
  vx?: number;
  vy?: number;
  prefix?: string;
  suffix?: string;
}

export interface PooledDamageNumber {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  type: DamageNumberType;
  age: number;
  lifespan: number;
  scale: number;
  scaleVelocity: number;
  alpha: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
}

const DEFAULT_STYLES: Record<DamageNumberType, DamageNumberStyle> = {
  normal: {
    color: '#ffffff',
    strokeColor: '#0f172a',
    strokeWidth: 3,
    fontSize: 14,
    fontFamily: 'sans-serif',
    initialScale: 1.35,
    targetScale: 1.0,
  },
  crit: {
    color: '#facc15', // Vivid gold/yellow
    strokeColor: '#78350f', // Dark amber/bronze
    strokeWidth: 4,
    fontSize: 18,
    fontFamily: 'sans-serif',
    initialScale: 1.65,
    targetScale: 1.0,
    suffix: '!',
  },
  player: {
    color: '#f87171', // Red
    strokeColor: '#450a0a',
    strokeWidth: 3,
    fontSize: 15,
    fontFamily: 'sans-serif',
    initialScale: 1.4,
    targetScale: 1.0,
    prefix: '-',
  },
  heal: {
    color: '#4ade80', // Vibrant green
    strokeColor: '#052e16',
    strokeWidth: 3,
    fontSize: 14,
    fontFamily: 'sans-serif',
    initialScale: 1.3,
    targetScale: 1.0,
    prefix: '+',
  },
  custom: {
    color: '#38bdf8', // Sky blue
    strokeColor: '#082f49',
    strokeWidth: 3,
    fontSize: 14,
    fontFamily: 'sans-serif',
    initialScale: 1.35,
    targetScale: 1.0,
  },
};

export class DamageNumberPool {
  private pool: PooledDamageNumber[] = [];
  private poolSize: number;
  private defaultLifespan: number;

  // Spring physical constants for the bouncy scale pop
  private springTension = 320;
  private springDamping = 22;

  constructor(poolSize = 128, defaultLifespan = 0.75) {
    this.poolSize = poolSize;
    this.defaultLifespan = defaultLifespan;

    // Pre-allocate full pool memory up-front (Zero GC allocations during gameplay)
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        text: '',
        type: 'normal',
        age: 0,
        lifespan: defaultLifespan,
        scale: 1,
        scaleVelocity: 0,
        alpha: 1,
        color: '#ffffff',
        strokeColor: '#0f172a',
        strokeWidth: 3,
        fontSize: 14,
        fontFamily: 'sans-serif',
      });
    }
  }

  /**
   * Spawns a floating damage number from the pre-allocated pool.
   * Recycles the oldest active item if pool capacity is reached.
   */
  public spawn(
    x: number,
    y: number,
    value: number | string,
    type: DamageNumberType = 'normal',
    options: Partial<DamageNumberOptions> = {}
  ): PooledDamageNumber {
    // 1. Find inactive slot
    let item: PooledDamageNumber | null = null;
    let oldestIndex = 0;
    let oldestAge = -1;

    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (!p.active) {
        item = p;
        break;
      }
      if (p.age > oldestAge) {
        oldestAge = p.age;
        oldestIndex = i;
      }
    }

    // If pool is completely saturated, recycle the oldest active particle
    if (!item) {
      item = this.pool[oldestIndex];
    }

    const style = DEFAULT_STYLES[type] ?? DEFAULT_STYLES.normal;
    const prefix = options.prefix ?? style.prefix ?? '';
    const suffix = options.suffix ?? style.suffix ?? '';
    const textStr = `${prefix}${typeof value === 'number' ? Math.round(value) : value}${suffix}`;

    // Upward velocity with subtle random horizontal drift
    const randomVx = (Math.random() - 0.5) * 28;
    const randomVy = -75 - Math.random() * 25;

    item.active = true;
    item.x = x;
    item.y = y;
    item.vx = options.vx ?? randomVx;
    item.vy = options.vy ?? randomVy;
    item.text = textStr;
    item.type = type;
    item.age = 0;
    item.lifespan = options.lifespan ?? this.defaultLifespan;

    // Initial scale pop (e.g. 1.4 or 1.65 for crit)
    item.scale = options.initialScale ?? style.initialScale;
    item.scaleVelocity = 0;
    item.alpha = 1;

    item.color = options.color ?? style.color;
    item.strokeColor = options.strokeColor ?? style.strokeColor;
    item.strokeWidth = options.strokeWidth ?? style.strokeWidth;
    item.fontSize = options.fontSize ?? style.fontSize;
    item.fontFamily = options.fontFamily ?? style.fontFamily;

    return item;
  }

  /**
   * Updates all active damage numbers: spring scale dynamics, upward translation, alpha fade.
   * @param dt Delta time in seconds
   */
  public update(dt: number): void {
    // Clamp dt to avoid huge jumps if tab was backgrounded or negative
    const safeDt = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, 0.1));
    if (safeDt <= 0) return;

    // Fixed sub-stepping for spring physics to prevent Euler divergence at large dt (>= 0.07s)
    const MAX_SUB_DT = 0.02;
    const subSteps = Math.min(5, Math.max(1, Math.ceil(safeDt / MAX_SUB_DT)));
    const subDt = safeDt / subSteps;

    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.age += safeDt;
      if (p.age >= p.lifespan) {
        p.active = false;
        continue;
      }

      // 1. Spring physics on scale (target scale = 1.0) with sub-stepping and clamping
      for (let s = 0; s < subSteps; s++) {
        const displacement = p.scale - 1.0;
        const springForce = -this.springTension * displacement;
        const dampingForce = -this.springDamping * p.scaleVelocity;
        const acceleration = springForce + dampingForce;

        p.scaleVelocity += acceleration * subDt;
        p.scaleVelocity = Math.max(-50, Math.min(50, p.scaleVelocity));

        p.scale += p.scaleVelocity * subDt;
        p.scale = Math.max(0.0, Math.min(3.0, p.scale));
      }

      // 2. Upward drift with slight friction
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;
      p.vy += 45 * safeDt; // Slight deceleration towards apex
      p.vx *= 0.98;

      // 3. Alpha fade out over the latter 40% of lifespan
      const progress = p.age / p.lifespan;
      if (progress < 0.6) {
        p.alpha = 1;
      } else {
        p.alpha = Math.max(0, 1 - (progress - 0.6) / 0.4);
      }
    }
  }

  /**
   * Renders all active damage numbers to a 2D canvas context with high-contrast text strokes.
   */
  public render(ctx: CanvasRenderingContext2D): void {
    let hasActive = false;
    for (let i = 0; i < this.poolSize; i++) {
      if (this.pool[i].active) {
        hasActive = true;
        break;
      }
    }
    if (!hasActive) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (!p.active || p.alpha <= 0.001) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);

      ctx.font = `900 ${p.fontSize}px ${p.fontFamily}`;

      // High-contrast outline stroke
      if (p.strokeWidth > 0) {
        ctx.lineWidth = p.strokeWidth;
        ctx.strokeStyle = p.strokeColor;
        ctx.lineJoin = 'round';
        ctx.strokeText(p.text, 0, 0);
      }

      // Crisp text fill
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Returns current count of active damage numbers.
   */
  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.poolSize; i++) {
      if (this.pool[i].active) count++;
    }
    return count;
  }

  /**
   * Returns maximum pool capacity.
   */
  public getPoolSize(): number {
    return this.poolSize;
  }

  /**
   * Resets/clears all active damage numbers.
   */
  public clear(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.pool[i].active = false;
    }
  }

  /**
   * Alias for clear().
   */
  public reset(): void {
    this.clear();
  }
}
