/**
/**
 * Headless Test Environment Shim for Browser Games
 * Provides mock DOM, Canvas 2D, and WebGL interfaces allowing Three.js and HTML5 Canvas engines
 * to execute headlessly in Node.js with high performance.
 */

export interface MockContext2D {
  canvas: any;
  save: () => void;
  restore: () => void;
  translate: (x: number, y: number) => void;
  rotate: (a: number) => void;
  scale: (x: number, y: number) => void;
  beginPath: () => void;
  closePath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  arc: (x: number, y: number, r: number, sa: number, ea: number) => void;
  ellipse: (...args: any[]) => void;
  fill: () => void;
  stroke: () => void;
  fillRect: (x: number, y: number, w: number, h: number) => void;
  strokeRect: (x: number, y: number, w: number, h: number) => void;
  clearRect: (x: number, y: number, w: number, h: number) => void;
  fillText: (text: string, x: number, y: number) => void;
  strokeText: (text: string, x: number, y: number) => void;
  measureText: (text: string) => { width: number };
  drawImage: (...args: any[]) => void;
  createRadialGradient: (...args: any[]) => { addColorStop: (offset: number, color: string) => void };
  createLinearGradient: (...args: any[]) => { addColorStop: (offset: number, color: string) => void };
  getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray };
  putImageData: (...args: any[]) => void;
  setTransform: (...args: any[]) => void;
  resetTransform: () => void;
  [key: string]: any;
}

export function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const gradient = { addColorStop: () => {} };

  const ctx2d: MockContext2D = {
    canvas: null,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    font: '10px sans-serif',
    lineJoin: 'miter',
    shadowColor: 'transparent',
    shadowBlur: 0,
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: (text: string) => ({ width: text.length * 8 }),
    drawImage: () => {},
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    getImageData: (_x, _y, w = 1, h = 1) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {},
    setTransform: () => {},
    resetTransform: () => {},
  };

  const baseGl: any = {
    VERSION: 7938,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    POINTS: 0,
    FLOAT: 5126,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    STENCIL_BUFFER_BIT: 1024,
    getParameter: (p: number) => {
      if (p === 7938) return 'WebGL 1.0';
      if (p === 35724) return 'WebGL GLSL ES 1.00';
      if (p === 7936) return 'Mock Vendor';
      if (p === 7937) return 'Mock Renderer';
      if (p === 34921) return 16;
      if (p === 34930) return 16;
      if (p === 3379) return 4096;
      return 16;
    },
    getExtension: () => null,
    getShaderPrecisionFormat: () => ({ rangeMin: 1, rangeMax: 1, precision: 1 }),
    getContextAttributes: () => ({ alpha: true, antialias: true }),
  };

  const glProxy = new Proxy(baseGl, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string') {
        if (prop.startsWith('is') || prop.startsWith('get')) return () => null;
        return () => 0;
      }
      return undefined;
    },
  });

  const listeners = new Map<string, Set<Function>>();

  const canvas: any = {
    width,
    height,
    style: {
      touchAction: 'none',
      width: `${width}px`,
      height: `${height}px`,
    },
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
    }),
    getContext: (type: string) => {
      if (type === '2d') {
        return ctx2d;
      }
      return glProxy;
    },
    addEventListener: (type: string, fn: Function) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent: (event: any) => {
      const handlers = listeners.get(event.type);
      if (handlers) {
        handlers.forEach((h) => h(event));
      }
      return true;
    },
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    appendChild: () => {},
    removeChild: () => {},
  };

  ctx2d.canvas = canvas;
  glProxy.canvas = canvas;

  return canvas as HTMLCanvasElement;
}

export function setupTestEnvironment(): void {
  const windowListeners = new Map<string, Set<Function>>();

  const mockWindow: any = {
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener: (type: string, fn: Function) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      windowListeners.get(type)?.delete(fn);
    },
    dispatchEvent: (event: any) => {
      const handlers = windowListeners.get(event.type);
      if (handlers) {
        handlers.forEach((h) => h(event));
      }
      return true;
    },
  };

  const mockDoc: any = {
    createElement: (tag: string) => {
      if (tag.toLowerCase() === 'canvas') {
        return createMockCanvas(480, 800);
      }
      const el: any = {
        style: {},
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      return el;
    },
    createElementNS: (_ns: string, tag: string) => {
      if (tag.toLowerCase() === 'canvas') {
        return createMockCanvas(480, 800);
      }
      const el: any = {
        style: {},
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      return el;
    },
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
  };

  globalThis.window = mockWindow;
  globalThis.document = mockDoc;

  const pendingRafs = new Map<number, (time: number) => void>();
  let rafSeq = 0;
  let simulatedTime = 1000;

  globalThis.requestAnimationFrame = (cb: (time: number) => void) => {
    const id = ++rafSeq;
    pendingRafs.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id: number) => {
    pendingRafs.delete(id);
  };

  (globalThis as any).__stepAnimationFrame = (deltaMs = 150) => {
    simulatedTime += deltaMs;
    const cbs = Array.from(pendingRafs.values());
    pendingRafs.clear();
    for (const cb of cbs) {
      cb(simulatedTime);
    }
  };
}

export function stepAnimationFrame(deltaMs = 150): void {
  if (typeof (globalThis as any).__stepAnimationFrame === 'function') {
    (globalThis as any).__stepAnimationFrame(deltaMs);
  }
}

export function createMockAudio(): any {
  return new Proxy({}, {
    get: () => () => {},
  });
}
