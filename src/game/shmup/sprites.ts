import { STAGES } from './config';

/**
 * Fully procedural vector sprites, pre-rendered once to offscreen canvases.
 * No emoji / CJK glyphs: renders identically on any device (no tofu boxes).
 */

function make(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  return [c, ctx];
}

function disc(ctx: CanvasRenderingContext2D, size: number, bg: string, ring: string): void {
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r * 0.75, r * 0.15, r, r, r);
  g.addColorStop(0, bg);
  g.addColorStop(1, '#0c0c14');
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

function glyph(
  ctx: CanvasRenderingContext2D, size: number, text: string, px: number, color: string,
): void {
  ctx.font = `900 ${px}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(text, size / 2, size / 2 + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, size / 2, size / 2 + 1);
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

/** Player ship: sleek navy arrow with gold wings, cyan cockpit. Faces up. */
function playerShip(): HTMLCanvasElement | null {
  const S = 48;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  // wings
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(24, 30);
  ctx.lineTo(4, 42);
  ctx.lineTo(10, 30);
  ctx.lineTo(20, 26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, 30);
  ctx.lineTo(44, 42);
  ctx.lineTo(38, 30);
  ctx.lineTo(28, 26);
  ctx.closePath();
  ctx.fill();
  // hull
  const g = ctx.createLinearGradient(0, 4, 0, 44);
  g.addColorStop(0, '#5d7a99');
  g.addColorStop(0.5, '#2c3e50');
  g.addColorStop(1, '#1a2530');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(24, 3);
  ctx.lineTo(32, 22);
  ctx.lineTo(30, 40);
  ctx.lineTo(18, 40);
  ctx.lineTo(16, 22);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#eaf6ff';
  ctx.stroke();
  // cockpit
  ctx.fillStyle = '#54e0ff';
  ctx.beginPath();
  ctx.ellipse(24, 20, 4.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(24, 17, 1.8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // engine glow
  ctx.fillStyle = '#54e0ff';
  ctx.fillRect(20, 40, 8, 5);
  ctx.fillStyle = '#fff7ae';
  ctx.fillRect(22, 40, 4, 4);
  return c;
}

/** Player bolt: elongated neon slug. */
function bolt(core: string, edge: string): HTMLCanvasElement | null {
  const W = 18;
  const H = 34;
  const made = make(W, H);
  if (!made) return null;
  const [c, ctx] = made;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.35, edge);
  g.addColorStop(0.75, core);
  g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(W / 2, 1);
  ctx.lineTo(W / 2 + 5, 14);
  ctx.lineTo(W / 2 + 5, H - 4);
  ctx.lineTo(W / 2 - 5, H - 4);
  ctx.lineTo(W / 2 - 5, 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W / 2 - 1.5, 4, 3, H - 10);
  return c;
}

function enemyOrb(color: string, core: string, r: number): HTMLCanvasElement | null {
  const s = r * 4;
  const made = make(s, s);
  if (!made) return null;
  const [c, ctx] = made;
  const cx = s / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, s / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cx, s / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cx - r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function missile(color: string): HTMLCanvasElement | null {
  const made = make(20, 28);
  if (!made) return null;
  const [c, ctx] = made;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(10, 1);
  ctx.lineTo(16, 10);
  ctx.lineTo(16, 24);
  ctx.lineTo(4, 24);
  ctx.lineTo(4, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(8, 12, 4, 8);
  ctx.fillStyle = '#ffcf3f';
  ctx.beginPath();
  ctx.moveTo(4, 24);
  ctx.lineTo(10, 28);
  ctx.lineTo(16, 24);
  ctx.closePath();
  ctx.fill();
  return c;
}

/* ---------- enemies (face down = toward player) ---------- */

function commuter(): HTMLCanvasElement | null {
  const S = 42;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  disc(ctx, S, '#31435a', '#5eb1ff');
  // train front
  ctx.fillStyle = '#7f97ad';
  rr(ctx, 11, 9, 20, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#16222e';
  rr(ctx, 13, 12, 16, 8, 2);
  ctx.fill();
  ctx.fillStyle = '#ffd257';
  ctx.beginPath();
  ctx.arc(16, 28, 2.4, 0, Math.PI * 2);
  ctx.arc(26, 28, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d23b3b';
  ctx.fillRect(11, 24, 20, 2);
  return c;
}

function mailEnemy(): HTMLCanvasElement | null {
  const S = 40;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  disc(ctx, S, '#4a4a58', '#ffd257');
  ctx.fillStyle = '#f2f2f2';
  rr(ctx, 8, 13, 24, 15, 2);
  ctx.fill();
  ctx.strokeStyle = '#9a9a9a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 13);
  ctx.lineTo(20, 22);
  ctx.lineTo(32, 13);
  ctx.stroke();
  ctx.fillStyle = '#d23b3b';
  ctx.beginPath();
  ctx.arc(28, 11, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(27, 8, 2, 5);
  return c;
}

function phoneEnemy(): HTMLCanvasElement | null {
  const S = 42;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  disc(ctx, S, '#3a3a48', '#7fe7ff');
  ctx.fillStyle = '#22222c';
  rr(ctx, 15, 7, 12, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#101016';
  ctx.beginPath();
  ctx.arc(21, 12, 6, 0, Math.PI * 2);
  ctx.arc(21, 30, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff4d6a';
  ctx.lineWidth = 2;
  for (const r of [9, 13]) {
    ctx.beginPath();
    ctx.arc(21, 30, r, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  return c;
}

function managerEnemy(): HTMLCanvasElement | null {
  const S = 44;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  disc(ctx, S, '#4a3826', '#ffab4a');
  // face
  ctx.fillStyle = '#ffcf9e';
  ctx.beginPath();
  ctx.arc(22, 21, 12, 0, Math.PI * 2);
  ctx.fill();
  // hair
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.arc(22, 19, 12, Math.PI, 0);
  ctx.fill();
  // glasses
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(17, 21, 4.5, 0, Math.PI * 2);
  ctx.arc(27, 21, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(21.5, 21);
  ctx.lineTo(22.5, 21);
  ctx.stroke();
  // tie
  ctx.fillStyle = '#d23b3b';
  ctx.beginPath();
  ctx.moveTo(22, 30);
  ctx.lineTo(19, 37);
  ctx.lineTo(25, 37);
  ctx.closePath();
  ctx.fill();
  return c;
}

function bugEnemy(): HTMLCanvasElement | null {
  const S = 42;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  disc(ctx, S, '#1e3a2a', '#4dffa6');
  // legs
  ctx.strokeStyle = '#0d3a22';
  ctx.lineWidth = 2;
  for (const [x1, y1, x2, y2] of [
    [14, 18, 8, 14],
    [14, 24, 8, 28],
    [28, 18, 34, 14],
    [28, 24, 34, 28],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // body
  ctx.fillStyle = '#37b268';
  ctx.beginPath();
  ctx.ellipse(21, 22, 8, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d3a22';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(21, 12);
  ctx.lineTo(21, 32);
  ctx.stroke();
  // eyes
  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath();
  ctx.arc(18, 14, 2, 0, Math.PI * 2);
  ctx.arc(24, 14, 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function blackEnemy(): HTMLCanvasElement | null {
  const S = 44;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  disc(ctx, S, '#331414', '#ff5d5d');
  // tower
  ctx.fillStyle = '#1c1c22';
  rr(ctx, 13, 8, 18, 26, 2);
  ctx.fill();
  ctx.fillStyle = '#ffd257';
  for (let y = 12; y <= 28; y += 5) {
    for (let x = 16; x <= 26; x += 5) {
      if ((x + y) % 2 === 0) ctx.fillRect(x, y, 2.4, 2.4);
    }
  }
  // evil eye band
  ctx.fillStyle = '#3d0606';
  ctx.fillRect(13, 8, 18, 7);
  ctx.fillStyle = '#ff2222';
  ctx.beginPath();
  ctx.ellipse(22, 11.5, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(21, 9.5, 2, 4);
  return c;
}

/* ---------- bosses (96px, distinct vector emblems + roman numeral) ---------- */

function bossBase(accent: string, numeral: string): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  const S = 96;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  disc(ctx, S, '#14141f', accent);
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2);
  ctx.stroke();
  glyph(ctx, S, numeral, 13, accent);
  return [c, ctx];
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function bossSprite(idx: number): HTMLCanvasElement | null {
  const st = STAGES[idx % STAGES.length];
  const accent = st?.accent ?? '#fff';
  const base = bossBase(accent, NUMERALS[idx % NUMERALS.length] ?? 'I');
  if (!base) return null;
  const [c, ctx] = base;
  ctx.lineWidth = 3;
  if (idx === 0) {
    // station master cap
    ctx.fillStyle = '#1a237e';
    rr(ctx, 26, 30, 44, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(20, 46, 56, 6);
    ctx.fillStyle = '#ffd257';
    ctx.beginPath();
    ctx.arc(48, 39, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(34, 54, 28, 12);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(42, 58, 2.2, 0, Math.PI * 2);
    ctx.arc(54, 58, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (idx === 1) {
    // paper stack + hanko
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#dfe6ee';
      ctx.fillRect(28 + (i % 2) * 3, 60 - i * 8, 40, 7);
      ctx.strokeStyle = '#9aa5b1';
      ctx.lineWidth = 1;
      ctx.strokeRect(28 + (i % 2) * 3, 60 - i * 8, 40, 7);
    }
    ctx.fillStyle = 'rgba(210,30,30,0.85)';
    ctx.beginPath();
    ctx.arc(60, 34, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(56, 30, 8, 8);
  } else if (idx === 2) {
    // giant handset + anger veins
    ctx.fillStyle = '#26262e';
    rr(ctx, 30, 22, 36, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#39d353';
    ctx.fillRect(36, 30, 24, 20);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 36);
    ctx.lineTo(48, 42);
    ctx.moveTo(56, 36);
    ctx.lineTo(48, 42);
    ctx.moveTo(42, 60);
    ctx.lineTo(54, 60);
    ctx.lineTo(48, 66);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 3;
    for (const [x1, y1, x2, y2] of [[24, 30, 18, 22], [72, 30, 78, 22], [24, 66, 18, 74], [72, 66, 78, 74]]) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  } else if (idx === 3) {
    // desk fortress + shining glasses
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(22, 58, 52, 16);
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(36, 44, 24, 16);
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(48, 32, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eaf6ff';
    ctx.fillRect(38, 28, 20, 7);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 28, 20, 7);
    ctx.fillStyle = '#54e0ff';
    ctx.fillRect(40, 30, 5, 3);
  } else if (idx === 4) {
    // server rack
    ctx.fillStyle = '#1b1b22';
    rr(ctx, 30, 22, 36, 50, 3);
    ctx.fill();
    for (let y = 28; y < 66; y += 8) {
      for (let x = 36; x < 62; x += 8) {
        ctx.fillStyle = (x + y) % 3 === 0 ? '#ff4d4d' : '#39d353';
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(32, 72);
    ctx.quadraticCurveTo(48, 84, 64, 72);
    ctx.stroke();
  } else {
    // CEO: dark mantle + red eyes + gold tie
    ctx.fillStyle = '#0a0a10';
    ctx.beginPath();
    ctx.moveTo(48, 20);
    ctx.lineTo(26, 72);
    ctx.lineTo(70, 72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(40, 44, 4, 0, Math.PI * 2);
    ctx.arc(56, 44, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd9d9';
    ctx.beginPath();
    ctx.arc(40, 44, 1.5, 0, Math.PI * 2);
    ctx.arc(56, 44, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.moveTo(48, 54);
    ctx.lineTo(44, 66);
    ctx.lineTo(52, 66);
    ctx.closePath();
    ctx.fill();
  }
  return c;
}

function itemChip(letter: string, bg: string, ring: string): HTMLCanvasElement | null {
  const S = 32;
  const made = make(S, S);
  if (!made) return null;
  const [c, ctx] = made;
  disc(ctx, S, bg, ring);
  glyph(ctx, S, letter, 17, '#ffffff');
  return c;
}

export interface SpriteSet {
  player: HTMLCanvasElement;
  playerBullets: HTMLCanvasElement[];
  missiles: HTMLCanvasElement[];
  enemyBullets: HTMLCanvasElement[];
  enemies: Record<string, HTMLCanvasElement>;
  bosses: HTMLCanvasElement[];
  items: Record<string, HTMLCanvasElement>;
}

export function buildSprites(): SpriteSet | null {
  if (typeof document === 'undefined') return null;
  const fallback = make(8, 8);
  const blank = fallback ? fallback[0] : document.createElement('canvas');
  const req = <T>(v: T | null): T => (v === null ? (blank as unknown as T) : v);

  return {
    player: req(playerShip()),
    playerBullets: [req(bolt('#ffe14d', '#ff9d00')), req(bolt('#7fe7ff', '#1e90ff')), req(missile('#c77dff'))],
    missiles: [req(missile('#ff6b9d'))],
    enemyBullets: [req(enemyOrb('#ff5d7a', '#c81e4a', 5)), req(enemyOrb('#ff9d5c', '#c81e00', 6))],
    enemies: {
      commuter: req(commuter()),
      mail: req(mailEnemy()),
      phone: req(phoneEnemy()),
      manager: req(managerEnemy()),
      bug: req(bugEnemy()),
      black: req(blackEnemy()),
    },
    bosses: STAGES.map((_, i) => req(bossSprite(i))),
    items: {
      score: req(itemChip('Y', '#2a4a2a', '#ffe14d')),
      power: req(itemChip('P', '#3a3a1c', '#ffe14d')),
      heal: req(itemChip('H', '#1c3a3a', '#4dffa6')),
      bomb: req(itemChip('B', '#3a1c3a', '#ff8ad4')),
      weapon: req(itemChip('W', '#1c2a4a', '#7fe7ff')),
    },
  };
}

export function buildBackground(stageIdx: number, w: number, h: number): HTMLCanvasElement | null {
  const made = make(w, h);
  if (!made) return null;
  const [c, ctx] = made;
  const st = STAGES[stageIdx % STAGES.length] ?? STAGES[0];
  if (!st) return c;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, st.top);
  g.addColorStop(1, st.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  let seed = 1234 + stageIdx * 777;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 26; i++) {
    const bw = 30 + rand() * 70;
    const bh = 80 + rand() * (h * 0.35);
    const bx = rand() * w;
    ctx.fillRect(bx, h - bh, bw, bh);
  }
  ctx.fillStyle = st.accent;
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 160; i++) {
    const x = rand() * w;
    const y = h * 0.35 + rand() * h * 0.6;
    ctx.fillRect(x, y, 2, 3);
  }
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  return c;
}
