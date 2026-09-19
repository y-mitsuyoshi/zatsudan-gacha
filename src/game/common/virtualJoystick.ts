/**
 * Floating Virtual Joystick Controller
 * Provides smooth mobile touch/pointer virtual joystick controls with:
 * - Floating origin at initial pointerdown position
 * - Clamped thumb radius & deadzone filtering
 * - Normalized directional vector (-1 to 1) & magnitude (0 to 1)
 * - Canvas and DOM rendering visualization helpers
 * - Proper multi-touch handling via active pointer ID tracking
 */

export interface JoystickVector {
  x: number;
  y: number;
  active: boolean;
  magnitude: number;
}

export interface JoystickState {
  active: boolean;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  vectorX: number;
  vectorY: number;
  magnitude: number;
  pointerId: number | null;
}

export interface VirtualJoystickOptions {
  /** Maximum travel distance of the joystick stick knob in pixels (default: 50) */
  maxRadius?: number;
  /** Deadzone threshold ratio 0..1 below which output vector is (0, 0) (default: 0.08) */
  deadzone?: number;
  /** Whether the origin dynamically spawns at pointerdown location (default: true) */
  floating?: boolean;
  /** Fixed origin coordinates if floating is false */
  fixedOrigin?: { x: number; y: number };
  /** Only react to touch/pen pointers, ignoring mouse (default: false) */
  touchOnly?: boolean;
  /** Base visual color (default: '#38bdf8') */
  primaryColor?: string;
  /** Accent visual color (default: '#ffffff') */
  accentColor?: string;
}

export interface JoystickRenderOptions {
  baseColor?: string;
  baseFill?: string;
  thumbColor?: string;
  thumbBorder?: string;
  accentColor?: string;
  lineWidth?: number;
  showDirectionLine?: boolean;
}

export class VirtualJoystick {
  private container: HTMLElement | null = null;
  private maxRadius: number;
  private deadzone: number;
  private floating: boolean;
  private fixedOrigin: { x: number; y: number } | null;
  private touchOnly: boolean;
  private primaryColor: string;
  private accentColor: string;

  private active = false;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private currentX = 0;
  private currentY = 0;
  private vectorX = 0;
  private vectorY = 0;
  private magnitude = 0;

  // DOM overlay element references (if DOM rendering helper is used)
  private domBaseEl: HTMLElement | null = null;
  private domThumbEl: HTMLElement | null = null;
  private domContainerEl: HTMLElement | null = null;

  constructor(options: VirtualJoystickOptions = {}) {
    this.maxRadius = options.maxRadius ?? 50;
    this.deadzone = options.deadzone ?? 0.08;
    this.floating = options.floating ?? true;
    this.fixedOrigin = options.fixedOrigin ? { ...options.fixedOrigin } : null;
    this.touchOnly = options.touchOnly ?? false;
    this.primaryColor = options.primaryColor ?? '#38bdf8';
    this.accentColor = options.accentColor ?? '#ffffff';
  }

  /**
   * Attaches pointer event listeners to the given container element.
   */
  public attach(container: HTMLElement): void {
    if (!container) return;
    if (this.container === container) return;
    if (this.container) {
      this.detach();
    }
    this.container = container;

    // Prevent default touch behaviors like scrolling/zooming on the joystick container
    this.container.style.touchAction = 'none';

    this.container.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: false });
    window.addEventListener('pointercancel', this.onPointerCancel, { passive: false });
    window.addEventListener('blur', this.onWindowBlur);
  }

  /**
   * Detaches event listeners and cleans up resources.
   */
  public detach(): void {
    if (!this.container) return;

    this.container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('blur', this.onWindowBlur);

    this.destroyDomOverlay();
    this.reset();
    this.container = null;
  }

  /**
   * Returns current joystick state: normalized vector (x, y), active status, and magnitude.
   */
  public getVector(): { x: number; y: number; active: boolean; magnitude: number } {
    return {
      x: this.vectorX,
      y: this.vectorY,
      active: this.active,
      magnitude: this.magnitude,
    };
  }

  /**
   * Returns full internal state of the joystick.
   */
  public getState(): JoystickState {
    return {
      active: this.active,
      originX: this.originX,
      originY: this.originY,
      currentX: this.currentX,
      currentY: this.currentY,
      deltaX: this.currentX - this.originX,
      deltaY: this.currentY - this.originY,
      vectorX: this.vectorX,
      vectorY: this.vectorY,
      magnitude: this.magnitude,
      pointerId: this.pointerId,
    };
  }

  /**
   * Resets joystick state back to neutral zero vector and inactive.
   */
  public reset(): void {
    this.active = false;
    this.pointerId = null;
    this.vectorX = 0;
    this.vectorY = 0;
    this.magnitude = 0;
    this.originX = 0;
    this.originY = 0;
    this.currentX = 0;
    this.currentY = 0;

    this.updateDomOverlay();
  }

  /**
   * Renders the virtual joystick visualization onto a 2D canvas context.
   */
  public renderCanvas(ctx: CanvasRenderingContext2D, options: JoystickRenderOptions = {}): void {
    if (!this.active) return;

    const baseColor = options.baseColor ?? this.primaryColor;
    const baseFill = options.baseFill ?? 'rgba(15, 23, 42, 0.45)';
    const thumbColor = options.thumbColor ?? this.accentColor;
    const thumbBorder = options.thumbBorder ?? this.primaryColor;
    const lineWidth = options.lineWidth ?? 2;
    const showDirectionLine = options.showDirectionLine ?? true;

    ctx.save();

    // 1. Draw outer base ring & backdrop
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, this.maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = baseFill;
    ctx.fill();

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = baseColor;
    ctx.globalAlpha = 0.55;
    ctx.stroke();

    // Deadzone guide circle
    const deadzoneRadius = this.maxRadius * this.deadzone;
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, deadzoneRadius, 0, Math.PI * 2);
    ctx.strokeStyle = baseColor;
    ctx.globalAlpha = 0.25;
    ctx.stroke();

    // 2. Draw connector line
    if (showDirectionLine && this.magnitude > 0) {
      ctx.beginPath();
      ctx.moveTo(this.originX, this.originY);
      ctx.lineTo(this.currentX, this.currentY);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = lineWidth * 1.5;
      ctx.globalAlpha = 0.4 + this.magnitude * 0.4;
      ctx.stroke();
    }

    // 3. Draw thumb stick knob
    const thumbRadius = Math.max(14, this.maxRadius * 0.4);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(this.currentX, this.currentY, thumbRadius, 0, Math.PI * 2);
    ctx.fillStyle = thumbColor;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = thumbBorder;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Knob center dot
    ctx.beginPath();
    ctx.arc(this.currentX, this.currentY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Creates or attaches a high-DPI HTML DOM visualization overlay.
   * Useful when rendering over Three.js canvas or HTML layers.
   */
  public attachDomOverlay(parent?: HTMLElement): HTMLElement {
    const host = parent ?? this.container;
    if (!host) {
      throw new Error('VirtualJoystick: Cannot attach DOM overlay without a host container.');
    }

    if (this.domContainerEl) {
      return this.domContainerEl;
    }

    const domContainer = document.createElement('div');
    domContainer.style.position = 'absolute';
    domContainer.style.top = '0';
    domContainer.style.left = '0';
    domContainer.style.width = '100%';
    domContainer.style.height = '100%';
    domContainer.style.pointerEvents = 'none';
    domContainer.style.overflow = 'hidden';
    domContainer.style.zIndex = '50';

    const base = document.createElement('div');
    const baseSize = this.maxRadius * 2;
    base.style.position = 'absolute';
    base.style.width = `${baseSize}px`;
    base.style.height = `${baseSize}px`;
    base.style.borderRadius = '50%';
    base.style.border = `2px solid ${this.primaryColor}88`;
    base.style.background = 'radial-gradient(circle, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.3) 100%)';
    base.style.boxShadow = `0 0 16px ${this.primaryColor}33`;
    base.style.backdropFilter = 'blur(4px)';
    base.style.display = 'none';
    base.style.transform = 'translate(-50%, -50%)';

    const thumb = document.createElement('div');
    const thumbSize = Math.max(28, this.maxRadius * 0.8);
    thumb.style.position = 'absolute';
    thumb.style.width = `${thumbSize}px`;
    thumb.style.height = `${thumbSize}px`;
    thumb.style.borderRadius = '50%';
    thumb.style.border = `2px solid ${this.accentColor}`;
    thumb.style.background = `radial-gradient(circle, ${this.primaryColor} 0%, rgba(2,132,199,0.85) 100%)`;
    thumb.style.boxShadow = `0 0 12px ${this.primaryColor}aa`;
    thumb.style.display = 'none';
    thumb.style.transform = 'translate(-50%, -50%)';

    domContainer.appendChild(base);
    domContainer.appendChild(thumb);
    host.appendChild(domContainer);

    this.domContainerEl = domContainer;
    this.domBaseEl = base;
    this.domThumbEl = thumb;

    this.updateDomOverlay();
    return domContainer;
  }

  /**
   * Removes DOM visualization overlay elements if created.
   */
  public destroyDomOverlay(): void {
    if (this.domContainerEl && this.domContainerEl.parentElement) {
      this.domContainerEl.parentElement.removeChild(this.domContainerEl);
    }
    this.domContainerEl = null;
    this.domBaseEl = null;
    this.domThumbEl = null;
  }

  // --- Private Event Handlers ---

  private onPointerDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement)?.closest?.('button, a, input, select')) return;
    if (this.touchOnly && e.pointerType === 'mouse') return;
    if (this.active) return; // Ignore second finger if already active

    const coords = this.getContainerRelativeCoords(e.clientX, e.clientY);
    if (!coords) return;

    this.pointerId = e.pointerId;
    this.active = true;

    if (this.floating) {
      this.originX = coords.x;
      this.originY = coords.y;
    } else if (this.fixedOrigin) {
      this.originX = this.fixedOrigin.x;
      this.originY = this.fixedOrigin.y;
    } else {
      this.originX = coords.x;
      this.originY = coords.y;
    }

    this.currentX = coords.x;
    this.currentY = coords.y;

    this.updateVector();
    this.updateDomOverlay();

    if (this.container && 'setPointerCapture' in this.container) {
      try {
        this.container.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture may fail on unsupported devices/browsers, safe to ignore
      }
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.active || e.pointerId !== this.pointerId) return;

    const coords = this.getContainerRelativeCoords(e.clientX, e.clientY);
    if (!coords) return;

    this.currentX = coords.x;
    this.currentY = coords.y;

    this.updateVector();
    this.updateDomOverlay();
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.active || e.pointerId !== this.pointerId) return;

    if (this.container && 'releasePointerCapture' in this.container) {
      try {
        this.container.releasePointerCapture(e.pointerId);
      } catch {
        // Safe to ignore
      }
    }

    this.reset();
  };

  private onPointerCancel = (e: PointerEvent): void => {
    if (!this.active || e.pointerId !== this.pointerId) return;
    this.reset();
  };

  private onWindowBlur = (): void => {
    if (this.active) {
      this.reset();
    }
  };

  /**
   * Calculates vector and applies deadzone + radius clamping.
   */
  private updateVector(): void {
    const dx = this.currentX - this.originX;
    const dy = this.currentY - this.originY;
    const dist = Math.hypot(dx, dy);

    if (dist <= 0.0001) {
      this.vectorX = 0;
      this.vectorY = 0;
      this.magnitude = 0;
      return;
    }

    // Clamp current thumb position to maxRadius visually
    if (dist > this.maxRadius) {
      this.currentX = this.originX + (dx / dist) * this.maxRadius;
      this.currentY = this.originY + (dy / dist) * this.maxRadius;
    }

    const normalizedDist = Math.min(1, dist / this.maxRadius);

    if (normalizedDist <= this.deadzone) {
      this.vectorX = 0;
      this.vectorY = 0;
      this.magnitude = 0;
    } else {
      // Linearly rescale magnitude from deadzone..1 to 0..1 for smooth control
      const scaledMag = (normalizedDist - this.deadzone) / (1 - this.deadzone);
      const angle = Math.atan2(dy, dx);
      this.vectorX = Math.cos(angle) * scaledMag;
      this.vectorY = Math.sin(angle) * scaledMag;
      this.magnitude = scaledMag;
    }
  }

  private getContainerRelativeCoords(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.container) return null;
    const rect = this.container.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private updateDomOverlay(): void {
    if (!this.domBaseEl || !this.domThumbEl) return;

    if (!this.active) {
      this.domBaseEl.style.display = 'none';
      this.domThumbEl.style.display = 'none';
      return;
    }

    this.domBaseEl.style.display = 'block';
    this.domBaseEl.style.left = `${this.originX}px`;
    this.domBaseEl.style.top = `${this.originY}px`;

    this.domThumbEl.style.display = 'block';
    this.domThumbEl.style.left = `${this.currentX}px`;
    this.domThumbEl.style.top = `${this.currentY}px`;
  }
}
