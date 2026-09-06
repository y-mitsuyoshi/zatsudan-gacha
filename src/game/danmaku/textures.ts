import * as THREE from 'three';
import { STAGES } from './config';

/** Procedural CanvasTextures: zero external assets, identical on every device. */

function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return [c, ctx];
}

function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function disc(ctx: CanvasRenderingContext2D, s: number, bg: string, ring: string): void {
  const r = s / 2;
  const g = ctx.createRadialGradient(r, r * 0.75, r * 0.15, r, r, r);
  g.addColorStop(0, bg);
  g.addColorStop(1, '#0b0b13');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = ring;
  ctx.beginPath();
  ctx.arc(r, r, r - 2.5, 0, Math.PI * 2);
  ctx.stroke();
}

function ascii(ctx: CanvasRenderingContext2D, s: number, text: string, px: number, color: string): void {
  ctx.font = `900 ${px}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(text, s / 2, s / 2 + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, s / 2, s / 2 + 1);
}

/** White-hot orb base; tinted per-instance via instanceColor. */
export function orbTexture(): THREE.CanvasTexture {
  const S = 48;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.28, '#ffffff');
  g.addColorStop(0.55, '#c0c0c0');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cx, cx, 0, Math.PI * 2);
  ctx.fill();
  return tex(c);
}

/** White bolt base; tinted per-instance (gold / cyan / violet). */
export function boltTexture(): THREE.CanvasTexture {
  const W = 24;
  const H = 48;
  const [c, ctx] = cv(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.7, '#ffffff');
  g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(W / 2, 1);
  ctx.lineTo(W / 2 + 7, 18);
  ctx.lineTo(W / 2 + 7, H - 5);
  ctx.lineTo(W / 2 - 7, H - 5);
  ctx.lineTo(W / 2 - 7, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W / 2 - 2, 6, 4, H - 14);
  return tex(c);
}

export function ringTexture(): THREE.CanvasTexture {
  const S = 128;
  const [c, ctx] = cv(S, S);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  return tex(c);
}

export function dotTexture(): THREE.CanvasTexture {
  const S = 32;
  const [c, ctx] = cv(S, S);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return tex(c);
}

export function playerTexture(): THREE.CanvasTexture {
  const S = 64;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;
  // aura
  const aura = ctx.createRadialGradient(cx, 34, 4, cx, 34, 30);
  aura.addColorStop(0, 'rgba(84,224,255,0.5)');
  aura.addColorStop(1, 'rgba(84,224,255,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, S, S);
  // wings
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(cx, 38);
  ctx.lineTo(cx - 26, 54);
  ctx.lineTo(cx - 16, 38);
  ctx.lineTo(cx - 6, 32);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, 38);
  ctx.lineTo(cx + 26, 54);
  ctx.lineTo(cx + 16, 38);
  ctx.lineTo(cx + 6, 32);
  ctx.closePath();
  ctx.fill();
  // hull
  const g = ctx.createLinearGradient(0, 6, 0, 56);
  g.addColorStop(0, '#7fa8c9');
  g.addColorStop(0.5, '#2c3e50');
  g.addColorStop(1, '#141c26');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx, 4);
  ctx.lineTo(cx + 9, 28);
  ctx.lineTo(cx + 7, 52);
  ctx.lineTo(cx - 7, 52);
  ctx.lineTo(cx - 9, 28);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#eaf6ff';
  ctx.stroke();
  // cockpit
  ctx.fillStyle = '#54e0ff';
  ctx.beginPath();
  ctx.ellipse(cx, 26, 5.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, 22, 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // engine
  ctx.fillStyle = '#54e0ff';
  ctx.fillRect(cx - 5, 52, 10, 6);
  ctx.fillStyle = '#fff7ae';
  ctx.fillRect(cx - 2.5, 52, 5, 5);
  return tex(c);
}

export function optionTexture(): THREE.CanvasTexture {
  const S = 28;
  const [c, ctx] = cv(S, S);
  const g = ctx.createRadialGradient(14, 14, 1, 14, 14, 14);
  g.addColorStop(0, '#fff7ae');
  g.addColorStop(0.5, '#54e0ff');
  g.addColorStop(1, 'rgba(20,60,90,0.1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(14, 14, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b2233';
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(18, 16);
  ctx.lineTo(14, 22);
  ctx.lineTo(10, 16);
  ctx.closePath();
  ctx.fill();
  return tex(c);
}

export function hitboxTexture(): THREE.CanvasTexture {
  const S = 24;
  const [c, ctx] = cv(S, S);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(12, 12, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff4d6a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(12, 12, 7.5, 0, Math.PI * 2);
  ctx.stroke();
  return tex(c);
}

function enemyBase(draw: (ctx: CanvasRenderingContext2D, S: number) => void, S: number): HTMLCanvasElement {
  const [c, ctx] = cv(S, S);
  draw(ctx, S);
  return c;
}

export function enemyTextures(): Record<string, THREE.CanvasTexture> {
  const out: Record<string, THREE.CanvasTexture> = {};
  out.commuter = tex(enemyBase((ctx, S) => {
    disc(ctx, S, '#31435a', '#5eb1ff');
    ctx.fillStyle = '#7f97ad';
    rr(ctx, 12, 10, 22, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#16222e';
    rr(ctx, 14, 13, 18, 9, 2);
    ctx.fill();
    ctx.fillStyle = '#ffd257';
    ctx.beginPath();
    ctx.arc(18, 30, 2.6, 0, Math.PI * 2);
    ctx.arc(28, 30, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d23b3b';
    ctx.fillRect(12, 26, 22, 2.4);
  }, 46));
  out.mail = tex(enemyBase((ctx, S) => {
    disc(ctx, S, '#4a4a58', '#ffd257');
    ctx.fillStyle = '#f2f2f2';
    rr(ctx, 9, 14, 26, 16, 2);
    ctx.fill();
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(9, 14);
    ctx.lineTo(22, 24);
    ctx.lineTo(35, 14);
    ctx.stroke();
    ctx.fillStyle = '#d23b3b';
    ctx.beginPath();
    ctx.arc(31, 12, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(30, 9, 2, 5);
  }, 44));
  out.phone = tex(enemyBase((ctx, S) => {
    disc(ctx, S, '#3a3a48', '#7fe7ff');
    ctx.fillStyle = '#22222c';
    rr(ctx, 17, 8, 12, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#101016';
    ctx.beginPath();
    ctx.arc(23, 13, 6.5, 0, Math.PI * 2);
    ctx.arc(23, 33, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff4d6a';
    ctx.lineWidth = 2.2;
    for (const r of [10, 14]) {
      ctx.beginPath();
      ctx.arc(23, 33, r, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }, 46));
  out.manager = tex(enemyBase((ctx, S) => {
    disc(ctx, S, '#4a3826', '#ffab4a');
    ctx.fillStyle = '#ffcf9e';
    ctx.beginPath();
    ctx.arc(24, 23, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(24, 21, 13, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(18.5, 23, 5, 0, Math.PI * 2);
    ctx.arc(29.5, 23, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d23b3b';
    ctx.beginPath();
    ctx.moveTo(24, 33);
    ctx.lineTo(20.5, 41);
    ctx.lineTo(27.5, 41);
    ctx.closePath();
    ctx.fill();
  }, 48));
  out.bug = tex(enemyBase((ctx, S) => {
    disc(ctx, S, '#1e3a2a', '#4dffa6');
    ctx.strokeStyle = '#0d3a22';
    ctx.lineWidth = 2.2;
    for (const [x1, y1, x2, y2] of [[15, 20, 8, 15], [15, 26, 8, 31], [31, 20, 38, 15], [31, 26, 38, 31]]) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.fillStyle = '#37b268';
    ctx.beginPath();
    ctx.ellipse(23, 24, 8.5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d3a22';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(23, 13);
    ctx.lineTo(23, 35);
    ctx.stroke();
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath();
    ctx.arc(19.5, 15, 2.2, 0, Math.PI * 2);
    ctx.arc(26.5, 15, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }, 46));
  out.black = tex(enemyBase((ctx, S) => {
    disc(ctx, S, '#331414', '#ff5d5d');
    ctx.fillStyle = '#1c1c22';
    rr(ctx, 14, 9, 20, 28, 2);
    ctx.fill();
    ctx.fillStyle = '#ffd257';
    for (let y = 13; y <= 31; y += 5) {
      for (let x = 17; x <= 29; x += 5) {
        if ((x + y) % 2 === 0) ctx.fillRect(x, y, 2.6, 2.6);
      }
    }
    ctx.fillStyle = '#3d0606';
    ctx.fillRect(14, 9, 20, 8);
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.ellipse(24, 13, 5.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe14d';
    ctx.fillRect(23, 11, 2, 4);
  }, 48));
  out.dasher = tex(enemyBase((ctx, S) => {
    disc(ctx, S, '#3a2a1a', '#ffcf4d');
    // briefcase body
    ctx.fillStyle = '#6b4a1f';
    rr(ctx, 11, 18, 24, 18, 3);
    ctx.fill();
    ctx.strokeStyle = '#2a1c08';
    ctx.lineWidth = 2;
    ctx.strokeRect(11, 18, 24, 18);
    // handle
    ctx.strokeStyle = '#2a1c08';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(18, 13);
    ctx.lineTo(28, 13);
    ctx.lineTo(28, 18);
    ctx.stroke();
    // tie (rushing salaryman)
    ctx.fillStyle = '#d23b3b';
    ctx.beginPath();
    ctx.moveTo(23, 22);
    ctx.lineTo(20, 30);
    ctx.lineTo(23, 35);
    ctx.lineTo(26, 30);
    ctx.closePath();
    ctx.fill();
    // speed lines
    ctx.strokeStyle = '#ffcf4d';
    ctx.lineWidth = 2;
    for (const x of [8, 38]) {
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, 34);
      ctx.stroke();
    }
  }, 46));
  out.printer = tex(enemyBase((ctx, S) => {
    disc(ctx, S, '#2a2a33', '#b39dff');
    // printer body
    ctx.fillStyle = '#3f3f4d';
    rr(ctx, 10, 16, 28, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#23232c';
    ctx.fillRect(10, 24, 28, 5);
    // paper coming out
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(17, 29, 14, 12);
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = 1.2;
    for (let y = 32; y <= 38; y += 3) {
      ctx.beginPath();
      ctx.moveTo(19, y);
      ctx.lineTo(29, y);
      ctx.stroke();
    }
    // glowing button
    ctx.fillStyle = '#4dffa6';
    ctx.beginPath();
    ctx.arc(33, 20, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }, 48));
  return out;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export function bossTextures(): THREE.CanvasTexture[] {
  return STAGES.map((st, idx) => {
    const S = 128;
    const [c, ctx] = cv(S, S);
    disc(ctx, S, '#14141f', st.accent);
    ctx.lineWidth = 4;
    ctx.strokeStyle = st.accent;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 9, 0, Math.PI * 2);
    ctx.stroke();
    ascii(ctx, S, NUMERALS[idx % NUMERALS.length] ?? 'I', 17, st.accent);
    ctx.lineWidth = 4;
    if (idx === 0) {
      ctx.fillStyle = '#1a237e';
      rr(ctx, 34, 40, 60, 24, 5);
      ctx.fill();
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(26, 61, 76, 8);
      ctx.fillStyle = '#ffd257';
      ctx.beginPath();
      ctx.arc(64, 52, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffdbac';
      ctx.fillRect(46, 72, 36, 15);
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(56, 77, 3, 0, Math.PI * 2);
      ctx.arc(70, 77, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (idx === 1) {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#dfe6ee';
        ctx.fillRect(38 + (i % 2) * 4, 80 - i * 10, 52, 9);
        ctx.strokeStyle = '#9aa5b1';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(38 + (i % 2) * 4, 80 - i * 10, 52, 9);
      }
      ctx.fillStyle = 'rgba(210,30,30,0.9)';
      ctx.beginPath();
      ctx.arc(78, 44, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(73, 39, 10, 10);
    } else if (idx === 2) {
      ctx.fillStyle = '#26262e';
      rr(ctx, 40, 28, 48, 66, 13);
      ctx.fill();
      ctx.fillStyle = '#39d353';
      ctx.fillRect(48, 38, 32, 26);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(54, 46);
      ctx.lineTo(64, 54);
      ctx.moveTo(74, 46);
      ctx.lineTo(64, 54);
      ctx.stroke();
      ctx.strokeStyle = '#ff3b3b';
      ctx.lineWidth = 4;
      for (const [x1, y1, x2, y2] of [[32, 40, 24, 30], [96, 40, 104, 30], [32, 86, 24, 96], [96, 86, 104, 96]]) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else if (idx === 3) {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(30, 76, 68, 20);
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(48, 58, 32, 20);
      ctx.fillStyle = '#ffdbac';
      ctx.beginPath();
      ctx.arc(64, 42, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eaf6ff';
      ctx.fillRect(50, 36, 28, 10);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(50, 36, 28, 10);
      ctx.fillStyle = '#54e0ff';
      ctx.fillRect(53, 39, 7, 4);
    } else if (idx === 4) {
      ctx.fillStyle = '#1b1b22';
      rr(ctx, 40, 28, 48, 66, 4);
      ctx.fill();
      for (let y = 36; y < 88; y += 10) {
        for (let x = 48; x < 82; x += 10) {
          ctx.fillStyle = (x + y) % 3 === 0 ? '#ff4d4d' : '#39d353';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(42, 94);
      ctx.quadraticCurveTo(64, 110, 86, 94);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#0a0a10';
      ctx.beginPath();
      ctx.moveTo(64, 26);
      ctx.lineTo(34, 94);
      ctx.lineTo(94, 94);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.arc(53, 58, 5.5, 0, Math.PI * 2);
      ctx.arc(75, 58, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd9d9';
      ctx.beginPath();
      ctx.arc(53, 58, 2, 0, Math.PI * 2);
      ctx.arc(75, 58, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.moveTo(64, 70);
      ctx.lineTo(59, 86);
      ctx.lineTo(69, 86);
      ctx.closePath();
      ctx.fill();
    }
    return tex(c);
  });
}

export function itemTextures(): Record<string, THREE.CanvasTexture> {
  const defs: Array<[string, string, string, string]> = [
    ['score', 'Y', '#2a4a2a', '#ffe14d'],
    ['power', 'P', '#3a3a1c', '#ffe14d'],
    ['heal', 'H', '#1c3a3a', '#4dffa6'],
    ['bomb', 'B', '#3a1c3a', '#ff8ad4'],
    ['weapon', 'W', '#1c2a4a', '#7fe7ff'],
  ];
  const out: Record<string, THREE.CanvasTexture> = {};
  for (const [key, letter, bg, ring] of defs) {
    const S = 40;
    const [c, ctx] = cv(S, S);
    disc(ctx, S, bg, ring);
    ascii(ctx, S, letter, 21, '#ffffff');
    out[key] = tex(c);
  }
  return out;
}

export function backgroundTexture(stageIdx: number, w: number, h: number): THREE.CanvasTexture {
  const st = STAGES[stageIdx % STAGES.length] ?? STAGES[0];
  const [c, ctx] = cv(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, st?.top ?? '#111');
  g.addColorStop(1, st?.bottom ?? '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  let seed = 1234 + stageIdx * 777;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 30; i++) {
    const bw = 30 + rand() * 80;
    const bh = 90 + rand() * h * 0.35;
    ctx.fillRect(rand() * w, h - bh, bw, bh);
  }
  ctx.fillStyle = st?.accent ?? '#fff';
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 170; i++) {
    ctx.fillRect(rand() * w, h * 0.35 + rand() * h * 0.6, 2, 3);
  }
  ctx.globalAlpha = 1;
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Pooled floating-text label: own canvas redrawn only when assigned. */
export class TextLabel {
  readonly texture: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  constructor() {
    const [c, ctx] = cv(256, 48);
    this.canvas = c;
    this.ctx = ctx;
    this.texture = tex(c);
    this.clear();
  }
  set(text: string, color: string): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '900 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(text, 128, 25);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 25);
    this.texture.needsUpdate = true;
  }
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture.needsUpdate = true;
  }
  dispose(): void {
    this.texture.dispose();
  }
}
