import { STAGES } from './config';

/** Pre-rendered sprite cache: emoji badges + bullets + backgrounds. */

function make(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  return [c, ctx];
}

function badge(
  emoji: string,
  size: number,
  bg: string,
  ring: string,
  fontPx: number,
): HTMLCanvasElement | null {
  const made = make(size, size);
  if (!made) return null;
  const [c, ctx] = made;
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r * 0.8, r * 0.2, r, r, r);
  g.addColorStop(0, bg);
  g.addColorStop(1, '#101018');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ring;
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `${fontPx}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, r, r + 1);
  return c;
}

function orb(color: string, glow: string, r: number): HTMLCanvasElement | null {
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
  ctx.fillStyle = glow;
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
  ctx.lineTo(10, 30 - 2);
  ctx.lineTo(16, 24);
  ctx.closePath();
  ctx.fill();
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
  const fallback = make(8, 8);
  const blank = fallback ? fallback[0] : document.createElement('canvas');
  const req = <T>(v: T | null): T => (v === null ? (blank as unknown as T) : v);

  return {
    player: req(badge('🧑‍💼', 44, '#2c3e50', '#ffd257', 26)),
    playerBullets: [
      req(orb('#ffe14d', '#ff9d00', 4)),
      req(orb('#7fe7ff', '#1e90ff', 5)),
      req(missile('#c77dff')),
    ],
    missiles: [req(missile('#ff6b9d'))],
    enemyBullets: [req(orb('#ff5d7a', '#c81e4a', 5)), req(orb('#ff9d5c', '#c81e00', 6))],
    enemies: {
      commuter: req(badge('🚃', 38, '#3b4a5a', '#5eb1ff', 22)),
      mail: req(badge('✉️', 36, '#4a4a5a', '#ffd257', 20)),
      phone: req(badge('📞', 38, '#3a3a4a', '#7fe7ff', 22)),
      manager: req(badge('👔', 40, '#4a3a2a', '#ffab4a', 23)),
      bug: req(badge('🐛', 38, '#1e3a2a', '#4dffa6', 22)),
      black: req(badge('🏢', 42, '#3a1a1a', '#ff5d5d', 24)),
    },
    bosses: STAGES.map((s, i) =>
      req(
        badge(
          s.bossEmoji,
          92,
          ['#1c2a4a', '#3a3a1c', '#1c3a4a', '#3a2a0a', '#0a2a1c', '#3a0a0a'][i] ?? '#222',
          s.accent,
          52,
        ),
      ),
    ),
    items: {
      score: req(badge('💴', 30, '#2a4a2a', '#ffe14d', 18)),
      power: req(badge('⭐', 30, '#3a3a1c', '#ffe14d', 18)),
      heal: req(badge('☕', 30, '#1c3a3a', '#4dffa6', 18)),
      bomb: req(badge('📄', 30, '#3a1c3a', '#ff8ad4', 18)),
      weapon: req(badge('🔫', 30, '#1c2a4a', '#7fe7ff', 18)),
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

  // far silhouettes
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
  // windows
  ctx.fillStyle = st.accent + '';
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 160; i++) {
    const x = rand() * w;
    const y = h * 0.35 + rand() * h * 0.6;
    ctx.fillRect(x, y, 2, 3);
  }
  ctx.globalAlpha = 1;
  // vignette
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  return c;
}
