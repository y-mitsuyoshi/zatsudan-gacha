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

function poly(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>): void {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i]![0], pts[i]![1]);
  }
  ctx.closePath();
}

/**
 * Draw symmetrical polygon mirrored across `cx`.
 * Points are specified as offsets `(dx, y)` where `dx >= 0`.
 */
function symPoly(
  ctx: CanvasRenderingContext2D,
  cx: number,
  rightPts: Array<[number, number]>,
  fill?: string | CanvasGradient,
  stroke?: string,
  lineWidth = 1.5,
): void {
  if (rightPts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(cx + rightPts[0]![0], rightPts[0]![1]);
  for (let i = 1; i < rightPts.length; i++) {
    ctx.lineTo(cx + rightPts[i]![0], rightPts[i]![1]);
  }
  for (let i = rightPts.length - 1; i >= 0; i--) {
    if (rightPts[i]![0] !== 0) {
      ctx.lineTo(cx - rightPts[i]![0], rightPts[i]![1]);
    }
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function glowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  coreColor: string,
  glowColor: string,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, coreColor);
  g.addColorStop(0.4, glowColor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ascii(ctx: CanvasRenderingContext2D, s: number, text: string, px: number, color: string): void {
  ctx.font = `900 ${px}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, s / 2, s / 2 + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, s / 2, s / 2 + 1);
}

/**
 * Crisp arcade danmaku orb: pure white-hot inner core, high-contrast inner
 * ring, and soft outer neon halo so dense bullet patterns stay razor-sharp.
 */
export function orbTexture(): THREE.CanvasTexture {
  const S = 64;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;
  // Soft outer neon corona
  const outer = ctx.createRadialGradient(cx, cx, cx * 0.15, cx, cx, cx);
  outer.addColorStop(0, '#ffffff');
  outer.addColorStop(0.34, '#ffffff');
  outer.addColorStop(0.48, '#e6f4ff');
  outer.addColorStop(0.66, 'rgba(210,235,255,0.68)');
  outer.addColorStop(0.84, 'rgba(160,200,255,0.22)');
  outer.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(cx, cx, cx, 0, Math.PI * 2);
  ctx.fill();

  // Crisp inner ring
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cx, cx * 0.48, 0, Math.PI * 2);
  ctx.stroke();

  // Pure white-hot core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cx, cx * 0.34, 0, Math.PI * 2);
  ctx.fill();

  return tex(c);
}

/** High-energy plasma bolt base; tinted per-instance (gold / cyan / violet / emerald). */
export function boltTexture(): THREE.CanvasTexture {
  const W = 32;
  const H = 64;
  const [c, ctx] = cv(W, H);
  const cx = W / 2;

  // Outer energy sheath
  const sheath = ctx.createLinearGradient(0, 0, 0, H);
  sheath.addColorStop(0, 'rgba(255,255,255,0)');
  sheath.addColorStop(0.18, 'rgba(255,255,255,0.45)');
  sheath.addColorStop(0.65, 'rgba(255,255,255,0.92)');
  sheath.addColorStop(1, 'rgba(255,255,255,0.2)');
  symPoly(
    ctx,
    cx,
    [
      [0, 2],
      [11, 20],
      [8, H - 10],
      [12, H - 4],
      [0, H - 1],
    ],
    sheath,
  );

  // Hot inner spearhead
  const core = ctx.createLinearGradient(0, 4, 0, H - 6);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.8, '#ffffff');
  core.addColorStop(1, 'rgba(255,255,255,0.5)');
  symPoly(
    ctx,
    cx,
    [
      [0, 4],
      [5, 16],
      [3.5, H - 8],
      [0, H - 4],
    ],
    core,
  );

  return tex(c);
}

export function ringTexture(): THREE.CanvasTexture {
  const S = 128;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, cx, cx - 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cx, cx - 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(cx, cx, cx - 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  return tex(c);
}

export function dotTexture(): THREE.CanvasTexture {
  const S = 32;
  const [c, ctx] = cv(S, S);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.7, 'rgba(200,240,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return tex(c);
}

/** Neo-Arcade Strike Interceptor ("SHACHIKU-01 // VALKYRIE"). */
export function playerTexture(): THREE.CanvasTexture {
  const S = 96;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;

  // Thruster ambient glow
  glowCircle(ctx, cx, 78, 22, 'rgba(255,250,190,0.9)', 'rgba(56,220,255,0.45)');
  glowCircle(ctx, cx, 46, 40, 'rgba(84,224,255,0.28)', 'rgba(84,224,255,0)');

  // Twin afterburner plumes
  for (const dx of [-10, 10]) {
    const plume = ctx.createLinearGradient(0, 68, 0, 94);
    plume.addColorStop(0, '#ffffff');
    plume.addColorStop(0.4, '#38bdf8');
    plume.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = plume;
    ctx.beginPath();
    ctx.moveTo(cx + dx - 4, 70);
    ctx.lineTo(cx + dx + 4, 70);
    ctx.lineTo(cx + dx, 93);
    ctx.closePath();
    ctx.fill();
  }

  // Outer forward-swept variable geometry wings
  const wingGrad = ctx.createLinearGradient(0, 26, 0, 74);
  wingGrad.addColorStop(0, '#e2e8f0');
  wingGrad.addColorStop(0.45, '#475569');
  wingGrad.addColorStop(1, '#0f172a');
  symPoly(
    ctx,
    cx,
    [
      [8, 34],
      [42, 50],
      [44, 64],
      [34, 60],
      [22, 68],
      [10, 60],
    ],
    wingGrad,
    '#94a3b8',
    1.5,
  );

  // Golden corporate trim blades on wings
  symPoly(
    ctx,
    cx,
    [
      [14, 39],
      [39, 51],
      [37, 56],
      [14, 46],
    ],
    '#f59e0b',
    '#fef08a',
    1,
  );

  // Wingtip forward rail-cannons
  for (const dx of [-28, 28]) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx + dx - 2, 22, 4, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx + dx - 1, 20, 2, 12);
  }

  // Main fuselage hull
  const hullGrad = ctx.createLinearGradient(0, 6, 0, 76);
  hullGrad.addColorStop(0, '#f8fafc');
  hullGrad.addColorStop(0.35, '#64748b');
  hullGrad.addColorStop(0.75, '#1e293b');
  hullGrad.addColorStop(1, '#090d16');
  symPoly(
    ctx,
    cx,
    [
      [0, 5],
      [7, 22],
      [14, 40],
      [15, 66],
      [8, 75],
      [0, 71],
    ],
    hullGrad,
    '#e2e8f0',
    1.8,
  );

  // Centerline crimson tie-stripe reactor emblem
  symPoly(
    ctx,
    cx,
    [
      [0, 12],
      [3, 24],
      [2, 62],
      [0, 68],
    ],
    '#ef4444',
  );

  // Glowing crystal canopy
  const canopyGrad = ctx.createLinearGradient(0, 22, 0, 48);
  canopyGrad.addColorStop(0, '#e0f2fe');
  canopyGrad.addColorStop(0.5, '#0ea5e9');
  canopyGrad.addColorStop(1, '#0369a1');
  symPoly(
    ctx,
    cx,
    [
      [0, 21],
      [6, 30],
      [5, 44],
      [0, 49],
    ],
    canopyGrad,
    '#bae6fd',
    1.2,
  );

  // Canopy specular highlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, 31, 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  return tex(c);
}

export function optionTexture(): THREE.CanvasTexture {
  const S = 40;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;
  glowCircle(ctx, cx, cx, 19, '#ffffff', 'rgba(56,189,248,0.65)');

  // Hexagonal drone frame
  symPoly(
    ctx,
    cx,
    [
      [0, 4],
      [13, 12],
      [13, 28],
      [0, 36],
    ],
    '#0f172a',
    '#f59e0b',
    2,
  );

  // Glowing cyan core diamond
  symPoly(
    ctx,
    cx,
    [
      [0, 9],
      [7, 20],
      [0, 31],
    ],
    '#38bdf8',
    '#ffffff',
    1.2,
  );
  return tex(c);
}

export function hitboxTexture(): THREE.CanvasTexture {
  const S = 32;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;
  glowCircle(ctx, cx, cx, 15, '#ffffff', 'rgba(255,60,100,0.65)');
  ctx.strokeStyle = '#ff3b5c';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cx, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cx, 4.2, 0, Math.PI * 2);
  ctx.fill();
  return tex(c);
}

/** Cyber-Sigil / Spell Circle rendered behind active bosses. */
export function sigilTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;

  ctx.save();
  ctx.translate(cx, cx);

  // Outer aura ring
  const rg = ctx.createRadialGradient(0, 0, 70, 0, 0, 126);
  rg.addColorStop(0, 'rgba(255,255,255,0)');
  rg.addColorStop(0.65, 'rgba(255,215,110,0.18)');
  rg.addColorStop(0.9, 'rgba(255,120,90,0.42)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, 126, 0, Math.PI * 2);
  ctx.fill();

  // Concentric technical rings
  ctx.strokeStyle = 'rgba(255,230,160,0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 118, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,140,110,0.7)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([12, 6, 4, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, 106, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(255,245,210,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 84, 0, Math.PI * 2);
  ctx.stroke();

  // Dual rotated squares (octagram)
  for (let rot = 0; rot < 2; rot++) {
    ctx.save();
    ctx.rotate((rot * Math.PI) / 4);
    ctx.strokeStyle = rot === 0 ? 'rgba(255,220,130,0.8)' : 'rgba(120,230,255,0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-74, -74, 148, 148);
    ctx.restore();
  }

  // Radial degree ticks
  ctx.strokeStyle = 'rgba(255,235,180,0.75)';
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r0 = i % 3 === 0 ? 86 : 94;
    const r1 = 102;
    ctx.lineWidth = i % 3 === 0 ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.stroke();
  }

  // 8 orbital rune nodes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 105;
    const y = Math.sin(a) * 105;
    ctx.fillStyle = '#fff7d6';
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return tex(c);
}

/** Player Hyper Overdrive / Shield Aura sprite. */
export function hyperAuraTexture(): THREE.CanvasTexture {
  const S = 128;
  const [c, ctx] = cv(S, S);
  const cx = S / 2;

  const g = ctx.createRadialGradient(cx, cx, 12, cx, cx, 62);
  g.addColorStop(0, 'rgba(255,245,180,0.08)');
  g.addColorStop(0.55, 'rgba(255,210,70,0.35)');
  g.addColorStop(0.85, 'rgba(84,224,255,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cx, 62, 0, Math.PI * 2);
  ctx.fill();

  // Hexagonal energy barrier
  ctx.save();
  ctx.translate(cx, cx);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * 50;
    const y = Math.sin(a) * 50;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  return tex(c);
}

function enemyBase(draw: (ctx: CanvasRenderingContext2D, S: number) => void, S = 64): HTMLCanvasElement {
  const [c, ctx] = cv(S, S);
  draw(ctx, S);
  return c;
}

/**
 * High-Detail 64x64 Arcade Mecha / Cyber-Drone Enemy Sprites.
 * Transparent background, NO circle badge wrapper!
 * Nose points downward (+Y) toward the player ship.
 */
export function enemyTextures(): Record<string, THREE.CanvasTexture> {
  const out: Record<string, THREE.CanvasTexture> = {};

  // 1. commuter: Armored Maglev Gunship
  out.commuter = tex(enemyBase((ctx, S) => {
    const cx = S / 2;
    // Dual engine exhaust glow at top (rear)
    glowCircle(ctx, cx - 10, 9, 9, '#ffffff', 'rgba(56,189,248,0.85)');
    glowCircle(ctx, cx + 10, 9, 9, '#ffffff', 'rgba(56,189,248,0.85)');

    // Swept metallic wings
    const wingG = ctx.createLinearGradient(0, 14, 0, 48);
    wingG.addColorStop(0, '#334155');
    wingG.addColorStop(0.5, '#94a3b8');
    wingG.addColorStop(1, '#1e293b');
    symPoly(
      ctx,
      cx,
      [
        [8, 16],
        [29, 28],
        [30, 40],
        [18, 37],
        [13, 45],
      ],
      wingG,
      '#cbd5e1',
      1.5,
    );

    // Wing hazard stripes (JR/Shinkansen cyan-gold accent)
    symPoly(ctx, cx, [[12, 24], [27, 31], [27, 35], [12, 29]], '#38bdf8');

    // Twin nose cannon barrels
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 11, 44, 3, 14);
    ctx.fillRect(cx + 8, 44, 3, 14);
    glowCircle(ctx, cx - 9.5, 58, 4, '#ffffff', '#38bdf8');
    glowCircle(ctx, cx + 9.5, 58, 4, '#ffffff', '#38bdf8');

    // Bullet-train aerodynamic prow hull
    const hullG = ctx.createLinearGradient(0, 8, 0, 60);
    hullG.addColorStop(0, '#475569');
    hullG.addColorStop(0.4, '#f1f5f9');
    hullG.addColorStop(0.85, '#94a3b8');
    hullG.addColorStop(1, '#1e293b');
    symPoly(
      ctx,
      cx,
      [
        [0, 8],
        [12, 12],
        [14, 32],
        [10, 50],
        [0, 60],
      ],
      hullG,
      '#38bdf8',
      1.6,
    );

    // Crimson corporate stripe across hull
    symPoly(ctx, cx, [[0, 36], [12, 33], [11, 38], [0, 41]], '#ef4444');

    // Glowing cyan armored cockpit visor
    symPoly(
      ctx,
      cx,
      [
        [0, 26],
        [8, 24],
        [9, 31],
        [0, 34],
      ],
      '#0284c7',
      '#bae6fd',
      1.2,
    );

    // Twin headlights at nose
    glowCircle(ctx, cx - 5, 49, 4.5, '#ffffff', '#facc15');
    glowCircle(ctx, cx + 5, 49, 4.5, '#ffffff', '#facc15');
  }, 64));

  // 2. mail: Stealth Delta-Wing Courier Drone
  out.mail = tex(enemyBase((ctx, S) => {
    const cx = S / 2;
    // Wingtip plasma emitters
    glowCircle(ctx, 6, 42, 7, '#ffffff', '#f43f5e');
    glowCircle(ctx, S - 6, 42, 7, '#ffffff', '#f43f5e');
    glowCircle(ctx, cx, 8, 8, '#ffffff', '#fbbf24');

    // Sharp angular delta airframe
    const deltaG = ctx.createLinearGradient(0, 8, 0, 58);
    deltaG.addColorStop(0, '#94a3b8');
    deltaG.addColorStop(0.5, '#f8fafc');
    deltaG.addColorStop(1, '#334155');
    symPoly(
      ctx,
      cx,
      [
        [0, 12],
        [8, 8],
        [29, 40],
        [24, 46],
        [11, 41],
        [0, 59],
      ],
      deltaG,
      '#fbbf24',
      1.5,
    );

    // Envelope-chevron stealth panel seams
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 22, 38);
    ctx.lineTo(cx, 22);
    ctx.lineTo(cx + 22, 38);
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 14, 42);
    ctx.lineTo(cx, 54);
    ctx.lineTo(cx + 14, 42);
    ctx.stroke();

    // Glowing crimson seal reactor core
    glowCircle(ctx, cx, 32, 12, '#fecdd3', 'rgba(225,29,72,0.85)');
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(cx, 32, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1.5, 28, 3, 8);
  }, 64));

  // 3. phone: Twin-Rotor Sonic Interceptor
  out.phone = tex(enemyBase((ctx, S) => {
    const cx = S / 2;

    // Crossbar boom connecting twin rotors
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    rr(ctx, 8, 22, 48, 12, 4);
    ctx.fill();
    ctx.stroke();

    // Dual glowing turbine rings (left & right nacelles)
    for (const rx of [15, 49]) {
      glowCircle(ctx, rx, 28, 15, 'rgba(56,189,248,0.45)', 'rgba(56,189,248,0)');
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(rx, 28, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Turbine blades
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(rx - Math.cos(a) * 8, 28 - Math.sin(a) * 8);
        ctx.lineTo(rx + Math.cos(a) * 8, 28 + Math.sin(a) * 8);
        ctx.stroke();
      }
      glowCircle(ctx, rx, 28, 4.5, '#ffffff', '#38bdf8');
    }

    // Central armored acoustic fuselage
    const bodyG = ctx.createLinearGradient(0, 8, 0, 50);
    bodyG.addColorStop(0, '#475569');
    bodyG.addColorStop(0.5, '#1e293b');
    bodyG.addColorStop(1, '#0f172a');
    symPoly(
      ctx,
      cx,
      [
        [0, 6],
        [8, 12],
        [10, 36],
        [6, 48],
        [0, 51],
      ],
      bodyG,
      '#7dd3fc',
      1.6,
    );

    // Core sensor eye
    glowCircle(ctx, cx, 26, 6, '#ffffff', '#f43f5e');

    // Neon magenta sonic wave emitter array at nose
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.2;
    for (const r of [8, 13, 18]) {
      ctx.beginPath();
      ctx.arc(cx, 44, r, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
  }, 64));

  // 4. manager: Middle-Management Heavy Cruiser
  out.manager = tex(enemyBase((ctx, S) => {
    const cx = S / 2;

    // Quad turret barrels protruding forward
    ctx.fillStyle = '#fde047';
    for (const dx of [-20, -13, 13, 20]) {
      ctx.fillRect(cx + dx - 1.8, 42, 3.6, 15);
      glowCircle(ctx, cx + dx, 57, 3.5, '#ffffff', '#f97316');
    }

    // Gold shoulder pauldrons
    const pauldronG = ctx.createLinearGradient(0, 16, 0, 48);
    pauldronG.addColorStop(0, '#fef08a');
    pauldronG.addColorStop(0.5, '#eab308');
    pauldronG.addColorStop(1, '#713f12');
    symPoly(
      ctx,
      cx,
      [
        [10, 16],
        [29, 22],
        [30, 42],
        [22, 47],
        [12, 43],
      ],
      pauldronG,
      '#fef9c3',
      1.6,
    );

    // Armored command frigate central hull
    const hullG = ctx.createLinearGradient(0, 8, 0, 56);
    hullG.addColorStop(0, '#334155');
    hullG.addColorStop(0.5, '#1e293b');
    hullG.addColorStop(1, '#090d16');
    symPoly(
      ctx,
      cx,
      [
        [0, 7],
        [11, 12],
        [15, 34],
        [11, 52],
        [0, 58],
      ],
      hullG,
      '#f59e0b',
      1.8,
    );

    // Dual cyber-glasses optic visors
    for (const dx of [-6.5, 6.5]) {
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      rr(ctx, cx + dx - 5, 22, 10, 6, 1.5);
      ctx.fill();
      ctx.stroke();
    }

    // Crimson tie-emblem reactor core
    symPoly(
      ctx,
      cx,
      [
        [0, 31],
        [4.5, 36],
        [3, 49],
        [0, 55],
      ],
      '#ef4444',
      '#fecaca',
      1,
    );
  }, 64));

  // 5. bug: Bio-Cyber Glitch Weaver
  out.bug = tex(enemyBase((ctx, S) => {
    const cx = S / 2;

    // 6 articulated cyber-arthropod legs
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.4;
    const legs: Array<[[number, number], [number, number], [number, number]]> = [
      [[10, 20], [24, 14], [29, 20]],
      [[12, 28], [26, 28], [30, 35]],
      [[10, 36], [23, 42], [28, 50]],
    ];
    for (const [[x0, y0], [x1, y1], [x2, y2]] of legs) {
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sign * x0, y0);
        ctx.lineTo(cx + sign * x1, y1);
        ctx.lineTo(cx + sign * x2, y2);
        ctx.stroke();
      }
    }

    // Articulated plasma mandibles at nose
    symPoly(
      ctx,
      cx,
      [
        [4, 44],
        [13, 50],
        [9, 60],
        [3, 54],
      ],
      '#34d399',
      '#ecfdf5',
      1.2,
    );
    glowCircle(ctx, cx, 55, 8, '#ffffff', '#10b981');

    // Segmented carapace body
    const shellG = ctx.createLinearGradient(0, 8, 0, 50);
    shellG.addColorStop(0, '#064e3b');
    shellG.addColorStop(0.5, '#059669');
    shellG.addColorStop(1, '#022c22');
    symPoly(
      ctx,
      cx,
      [
        [0, 8],
        [11, 14],
        [14, 28],
        [11, 44],
        [0, 50],
      ],
      shellG,
      '#6ee7b7',
      1.6,
    );

    // Glowing circuit veins across shell
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1.5;
    for (const y of [18, 26, 34]) {
      ctx.beginPath();
      ctx.moveTo(cx - 10, y);
      ctx.lineTo(cx, y + 4);
      ctx.lineTo(cx + 10, y);
      ctx.stroke();
    }

    // Twin crimson compound eyes
    glowCircle(ctx, cx - 5, 42, 4.5, '#ffffff', '#ef4444');
    glowCircle(ctx, cx + 5, 42, 4.5, '#ffffff', '#ef4444');
  }, 64));

  // 6. black: Obsidian Fortress Dreadnought
  out.black = tex(enemyBase((ctx, S) => {
    const cx = S / 2;

    // Twin heavy outer hull bastions
    const hullG = ctx.createLinearGradient(0, 6, 0, 58);
    hullG.addColorStop(0, '#18181b');
    hullG.addColorStop(0.5, '#27272a');
    hullG.addColorStop(1, '#09090b');
    symPoly(
      ctx,
      cx,
      [
        [0, 10],
        [12, 6],
        [27, 16],
        [28, 46],
        [18, 58],
        [8, 50],
        [0, 56],
      ],
      hullG,
      '#ef4444',
      1.8,
    );

    // Golden corporate crown trim
    symPoly(
      ctx,
      cx,
      [
        [0, 10],
        [12, 6],
        [25, 15],
        [22, 19],
        [0, 15],
      ],
      '#eab308',
    );

    // Glowing golden overtime window-array reactors
    ctx.fillStyle = '#fef08a';
    for (let y = 21; y <= 41; y += 5) {
      for (const dx of [-19, -13, 13, 19]) {
        ctx.fillRect(cx + dx - 1.5, y, 3, 3);
      }
    }

    // Crimson eye core in central dreadnought spire
    glowCircle(ctx, cx, 34, 13, '#ffffff', 'rgba(239,68,68,0.9)');
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, 34, 7.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 1.5, 29, 3, 10);
  }, 64));

  // 7. dasher: High-Speed Assault Lancer
  out.dasher = tex(enemyBase((ctx, S) => {
    const cx = S / 2;

    // Blazing afterburner plume at top
    const plume = ctx.createLinearGradient(0, 2, 0, 24);
    plume.addColorStop(0, 'rgba(251,191,36,0)');
    plume.addColorStop(0.5, '#f59e0b');
    plume.addColorStop(1, '#ffffff');
    symPoly(ctx, cx, [[0, 2], [9, 18], [0, 22]], plume);

    // Forward-swept arrow interceptor wings
    const wingG = ctx.createLinearGradient(0, 16, 0, 58);
    wingG.addColorStop(0, '#78350f');
    wingG.addColorStop(0.45, '#f59e0b');
    wingG.addColorStop(1, '#fef08a');
    symPoly(
      ctx,
      cx,
      [
        [0, 14],
        [10, 20],
        [28, 14],
        [22, 44],
        [9, 42],
        [0, 61],
      ],
      wingG,
      '#ffffff',
      1.5,
    );

    // Crimson lance core
    symPoly(
      ctx,
      cx,
      [
        [0, 18],
        [5, 28],
        [3.5, 52],
        [0, 61],
      ],
      '#ef4444',
      '#fde047',
      1.2,
    );

    // Golden speed-streak chevrons
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 1.8;
    for (const y of [28, 36]) {
      ctx.beginPath();
      ctx.moveTo(cx - 14, y - 4);
      ctx.lineTo(cx, y + 5);
      ctx.lineTo(cx + 14, y - 4);
      ctx.stroke();
    }
  }, 64));

  // 8. printer: Heavy Broadside Carrier
  out.printer = tex(enemyBase((ctx, S) => {
    const cx = S / 2;

    // Wide industrial mech-carrier sponsons
    const hullG = ctx.createLinearGradient(0, 10, 0, 54);
    hullG.addColorStop(0, '#4c1d95');
    hullG.addColorStop(0.5, '#64748b');
    hullG.addColorStop(1, '#1e1b4b');
    symPoly(
      ctx,
      cx,
      [
        [0, 10],
        [24, 12],
        [29, 22],
        [29, 44],
        [22, 52],
        [0, 50],
      ],
      hullG,
      '#c4b5fd',
      1.6,
    );

    // Glowing violet energy conduits on left/right bays
    for (const dx of [-20, 20]) {
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(cx + dx - 3, 18, 6, 26);
      glowCircle(ctx, cx + dx, 46, 6, '#ffffff', '#c084fc');
    }

    // Central rapid-fire scroll launcher bay
    ctx.fillStyle = '#090d16';
    rr(ctx, cx - 12, 22, 24, 14, 2);
    ctx.fill();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Glowing plasma scroll/projectiles emerging from launcher bay
    const scrollG = ctx.createLinearGradient(0, 32, 0, 58);
    scrollG.addColorStop(0, '#e2e8f0');
    scrollG.addColorStop(0.7, '#f8fafc');
    scrollG.addColorStop(1, '#38bdf8');
    ctx.fillStyle = scrollG;
    rr(ctx, cx - 9, 32, 18, 24, 2);
    ctx.fill();

    // Neon data lines on scroll
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1.6;
    for (const y of [37, 42, 47, 52]) {
      ctx.beginPath();
      ctx.moveTo(cx - 6, y);
      ctx.lineTo(cx + 6, y);
      ctx.stroke();
    }

    // Twin emerald status reactors
    glowCircle(ctx, cx - 14, 17, 4.5, '#ffffff', '#34d399');
    glowCircle(ctx, cx + 14, 17, 4.5, '#ffffff', '#34d399');
  }, 64));

  return out;
}

/**
 * Massive 256x256 Multi-Winged Cyber-Boss Mechs for all 6 stages.
 * Transparent background, symmetrical arcade warship/mech design!
 */
export function bossTextures(): THREE.CanvasTexture[] {
  return STAGES.map((st, idx) => {
    const S = 256;
    const [c, ctx] = cv(S, S);
    const cx = S / 2;
    const cy = S / 2;

    // Ambient reactor aura behind the mech
    glowCircle(ctx, cx, cy, 118, 'rgba(255,255,255,0.22)', 'rgba(0,0,0,0)');

    if (idx === 0) {
      // STAGE 1 BOSS: Grand Maglev Dreadnought "SHINKANSEN-OMEGA" (駅長)
      // Sweeping cyan plasma wings
      const eWing = ctx.createLinearGradient(0, 40, 0, 210);
      eWing.addColorStop(0, 'rgba(56,189,248,0.85)');
      eWing.addColorStop(0.5, 'rgba(14,165,233,0.55)');
      eWing.addColorStop(1, 'rgba(2,132,199,0.1)');
      symPoly(
        ctx,
        cx,
        [
          [24, 52],
          [122, 86],
          [114, 134],
          [96, 128],
          [118, 172],
          [66, 158],
          [32, 130],
        ],
        eWing,
        '#7dd3fc',
        2.5,
      );

      // Twin outrigger bullet-train sponsons
      const sponsonG = ctx.createLinearGradient(0, 48, 0, 206);
      sponsonG.addColorStop(0, '#334155');
      sponsonG.addColorStop(0.5, '#f1f5f9');
      sponsonG.addColorStop(1, '#1e293b');
      for (const sign of [-1, 1]) {
        const sx = cx + sign * 58;
        symPoly(
          ctx,
          sx,
          [
            [0, 50],
            [18, 66],
            [20, 156],
            [12, 198],
            [0, 210],
          ],
          sponsonG,
          '#38bdf8',
          2,
        );
        // Sponson turret glow
        glowCircle(ctx, sx, 202, 10, '#ffffff', '#38bdf8');
        glowCircle(ctx, sx, 130, 8, '#fef08a', '#f59e0b');
      }

      // Heavy armored cross-bridge
      symPoly(
        ctx,
        cx,
        [
          [0, 74],
          [78, 86],
          [82, 124],
          [0, 132],
        ],
        '#1e293b',
        '#94a3b8',
        2.2,
      );

      // Central Flagship Locomotive Hull
      const mainHull = ctx.createLinearGradient(0, 24, 0, 236);
      mainHull.addColorStop(0, '#0f172a');
      mainHull.addColorStop(0.35, '#e2e8f0');
      mainHull.addColorStop(0.75, '#475569');
      mainHull.addColorStop(1, '#0f172a');
      symPoly(
        ctx,
        cx,
        [
          [0, 22],
          [28, 44],
          [36, 110],
          [30, 188],
          [16, 224],
          [0, 238],
        ],
        mainHull,
        '#f8fafc',
        2.5,
      );

      // Stationmaster Cap Visor & Golden Crest
      symPoly(
        ctx,
        cx,
        [
          [0, 72],
          [32, 82],
          [26, 108],
          [0, 114],
        ],
        '#1e3a8a',
        '#facc15',
        2.5,
      );
      glowCircle(ctx, cx, 94, 16, '#ffffff', '#facc15');

      // Central reactor core
      glowCircle(ctx, cx, 148, 24, '#ffffff', '#38bdf8');
    } else if (idx === 1) {
      // STAGE 2 BOSS: Autonomous Document Citadel "ARCHIVIST-REX" (紙の山)
      // Radiating origami data-scroll energy wings
      for (let w = 0; w < 3; w++) {
        const yOff = w * 24;
        symPoly(
          ctx,
          cx,
          [
            [20, 48 + yOff],
            [120 - w * 10, 66 + yOff],
            [112 - w * 10, 102 + yOff],
            [26, 94 + yOff],
          ],
          w % 2 === 0 ? '#f8fafc' : '#fde68a',
          '#d97706',
          2,
        );
      }

      // Main Citadel Bastion
      const hullG = ctx.createLinearGradient(0, 32, 0, 226);
      hullG.addColorStop(0, '#334155');
      hullG.addColorStop(0.5, '#f1f5f9');
      hullG.addColorStop(1, '#1e293b');
      symPoly(
        ctx,
        cx,
        [
          [0, 26],
          [44, 48],
          [56, 128],
          [42, 198],
          [18, 228],
          [0, 218],
        ],
        hullG,
        '#fbbf24',
        2.5,
      );

      // 6 Floating Stamp-Pod Cannons
      for (const [dx, y] of [
        [-88, 148],
        [88, 148],
        [-64, 184],
        [64, 184],
        [-32, 212],
        [32, 212],
      ] as const) {
        glowCircle(ctx, cx + dx, y, 14, '#ffffff', '#ef4444');
      }

      // Imperial Crimson Hanko Seal Reactor Core
      glowCircle(ctx, cx, 124, 42, '#fecaca', 'rgba(220,38,38,0.85)');
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(cx, 124, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Hanko geometric glyphs inside core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 14, 110, 28, 28);
      ctx.beginPath();
      ctx.moveTo(cx, 110);
      ctx.lineTo(cx, 138);
      ctx.moveTo(cx - 14, 124);
      ctx.lineTo(cx + 14, 124);
      ctx.stroke();
    } else if (idx === 2) {
      // STAGE 3 BOSS: Acoustic Siege Titan "VOX-NEMESIS" (激怒クレーマー)
      // Articulated speaker-wing pylons
      const wingG = ctx.createLinearGradient(0, 40, 0, 210);
      wingG.addColorStop(0, '#0f172a');
      wingG.addColorStop(0.5, '#334155');
      wingG.addColorStop(1, '#1e1b4b');
      symPoly(
        ctx,
        cx,
        [
          [26, 54],
          [116, 44],
          [124, 116],
          [104, 188],
          [54, 174],
          [32, 144],
        ],
        wingG,
        '#38bdf8',
        2.5,
      );

      // 4 Massive Sonic Resonance Turbines on wings
      for (const [dx, y, r] of [
        [-84, 88, 24],
        [84, 88, 24],
        [-78, 150, 20],
        [78, 150, 20],
      ] as const) {
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(cx + dx, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();
        glowCircle(ctx, cx + dx, y, r * 0.7, '#ffffff', '#f43f5e');
      }

      // Central Heavy Siege Chasis
      symPoly(
        ctx,
        cx,
        [
          [0, 24],
          [38, 42],
          [46, 120],
          [38, 198],
          [0, 232],
        ],
        '#1e293b',
        '#7dd3fc',
        2.8,
      );

      // Crimson Fury-Visor & Emerald Voice-Waveform Core
      ctx.fillStyle = '#052e16';
      rr(ctx, cx - 28, 78, 56, 54, 8);
      ctx.fill();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Angry V-optic laser visor
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 22, 92);
      ctx.lineTo(cx, 108);
      ctx.lineTo(cx + 22, 92);
      ctx.stroke();

      // Sonic jaw cannon
      glowCircle(ctx, cx, 178, 26, '#ffffff', '#f43f5e');
    } else if (idx === 3) {
      // STAGE 4 BOSS: Heavy Command Cruiser "OVERLORD-KACHO" (課長)
      // Massive Golden Shoulder Bastion Wings
      const goldWing = ctx.createLinearGradient(0, 44, 0, 210);
      goldWing.addColorStop(0, '#fef08a');
      goldWing.addColorStop(0.45, '#eab308');
      goldWing.addColorStop(1, '#78350f');
      symPoly(
        ctx,
        cx,
        [
          [24, 52],
          [118, 68],
          [124, 146],
          [94, 204],
          [56, 192],
          [36, 152],
        ],
        goldWing,
        '#fef9c3',
        2.5,
      );

      // Heavy Broadside Turret Batteries (6 barrels)
      ctx.fillStyle = '#e2e8f0';
      for (const dx of [-96, -76, -56, 56, 76, 96]) {
        ctx.fillRect(cx + dx - 4, 178, 8, 34);
        glowCircle(ctx, cx + dx, 212, 8, '#ffffff', '#f97316');
      }

      // Armored Command Hull
      symPoly(
        ctx,
        cx,
        [
          [0, 20],
          [38, 40],
          [48, 128],
          [32, 206],
          [0, 236],
        ],
        '#1e293b',
        '#fbbf24',
        2.6,
      );

      // Twin Cyber-Glasses Laser Array
      for (const dx of [-18, 18]) {
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        rr(ctx, cx + dx - 14, 84, 28, 18, 4);
        ctx.fill();
        ctx.stroke();
        glowCircle(ctx, cx + dx, 93, 8, '#ffffff', '#38bdf8');
      }

      // Crimson Necktie Plasma Lance down the centerline
      symPoly(
        ctx,
        cx,
        [
          [0, 114],
          [14, 128],
          [10, 198],
          [0, 232],
        ],
        '#dc2626',
        '#fecaca',
        2,
      );
      glowCircle(ctx, cx, 154, 20, '#ffffff', '#f59e0b');
    } else if (idx === 4) {
      // STAGE 5 BOSS: Quantum Mainframe Leviathan "KERNEL-PANIC" (サーバ室)
      // 8 Articulated Fiber-Optic Mech Claws / Server Wings
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) {
        const y0 = 64 + k * 28;
        symPoly(
          ctx,
          cx,
          [
            [36, y0],
            [118 - k * 8, y0 - 12 + k * 10],
            [124 - k * 8, y0 + 14 + k * 10],
            [38, y0 + 18],
          ],
          '#064e3b',
          '#34d399',
          2,
        );
        glowCircle(ctx, cx - (116 - k * 8), y0 + k * 10, 9, '#ffffff', '#10b981');
        glowCircle(ctx, cx + (116 - k * 8), y0 + k * 10, 9, '#ffffff', '#10b981');
      }

      // Octagonal Mainframe Fortress Core
      symPoly(
        ctx,
        cx,
        [
          [0, 26],
          [44, 42],
          [52, 118],
          [44, 194],
          [0, 228],
        ],
        '#090d16',
        '#34d399',
        2.8,
      );

      // Server Blade Matrix LEDs
      for (let y = 58; y <= 182; y += 16) {
        for (const dx of [-30, -18, 18, 30]) {
          ctx.fillStyle = (y + dx) % 3 === 0 ? '#ef4444' : '#10b981';
          ctx.fillRect(cx + dx - 4, y, 8, 6);
        }
      }

      // Blazing Crimson Fault-Core Reactor
      glowCircle(ctx, cx, 128, 36, '#ffffff', '#ef4444');
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, 128, 22, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // STAGE 6 FINAL BOSS: Final Executive Seraph "BLACK-ENTERPRISE" (CEO)
      // 6 Radiant Golden Seraph Halo Blades
      const seraphG = ctx.createLinearGradient(0, 16, 0, 236);
      seraphG.addColorStop(0, '#fef08a');
      seraphG.addColorStop(0.5, '#eab308');
      seraphG.addColorStop(1, '#dc2626');
      for (const [y0, xTip, yTip, w] of [
        [68, 124, 28, 26],
        [112, 126, 118, 28],
        [154, 114, 214, 24],
      ] as const) {
        symPoly(
          ctx,
          cx,
          [
            [28, y0],
            [xTip, yTip],
            [xTip - 12, yTip + w],
            [28, y0 + 24],
          ],
          seraphG,
          '#ffffff',
          2,
        );
      }

      // Obsidian Sovereign Arch-Mech Fuselage
      const archHull = ctx.createLinearGradient(0, 14, 0, 242);
      archHull.addColorStop(0, '#09090b');
      archHull.addColorStop(0.5, '#27272a');
      archHull.addColorStop(1, '#09090b');
      symPoly(
        ctx,
        cx,
        [
          [0, 12],
          [26, 38],
          [48, 96],
          [42, 178],
          [22, 224],
          [0, 244],
        ],
        archHull,
        '#facc15',
        3,
      );

      // Sovereign Crown Spire at top
      symPoly(
        ctx,
        cx,
        [
          [0, 8],
          [12, 28],
          [26, 18],
          [22, 46],
          [0, 42],
        ],
        '#facc15',
        '#ffffff',
        1.5,
      );

      // Twin Crimson Ocular Judgment Reactors
      glowCircle(ctx, cx - 20, 96, 16, '#ffffff', '#ef4444');
      glowCircle(ctx, cx + 20, 96, 16, '#ffffff', '#ef4444');

      // Central Omega Core
      glowCircle(ctx, cx, 148, 38, '#ffffff', '#f59e0b');
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, 148, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    return tex(c);
  });
}

export function itemTextures(): Record<string, THREE.CanvasTexture> {
  const defs: Array<[string, string, string, string]> = [
    ['score', 'PTS', '#14532d', '#facc15'],
    ['power', 'PWR', '#713f12', '#fef08a'],
    ['heal', '1UP', '#064e3b', '#34d399'],
    ['bomb', 'BMB', '#4c1d95', '#f472b6'],
    ['weapon', 'WPN', '#0c4a6e', '#38bdf8'],
  ];
  const out: Record<string, THREE.CanvasTexture> = {};
  for (const [key, label, bg, ring] of defs) {
    const S = 48;
    const [c, ctx] = cv(S, S);
    const cx = S / 2;

    glowCircle(ctx, cx, cx, 23, ring, 'rgba(0,0,0,0)');

    // Octagonal cyber chip
    symPoly(
      ctx,
      cx,
      [
        [8, 4],
        [20, 4],
        [20, 16],
        [20, 32],
        [20, 44],
        [8, 44],
      ],
      bg,
      ring,
      2.4,
    );

    ascii(ctx, S, label, 13, '#ffffff');
    out[key] = tex(c);
  }
  return out;
}

/**
 * Richly detailed 512x1024 top-down/perspective Cyber-Metropolis Corridor.
 * Seamless vertical tiling (`RepeatWrapping`).
 */
export function backgroundTexture(stageIdx: number, w = 512, h = 1024): THREE.CanvasTexture {
  const st = STAGES[stageIdx % STAGES.length] ?? STAGES[0]!;
  const W = Math.max(512, w);
  const H = Math.max(1024, h);
  const [c, ctx] = cv(W, H);
  const cx = W / 2;
  const accent = st.accent;

  // 1. Deep atmospheric base gradient (top/bottom match at seam via mirror gradient)
  const baseG = ctx.createLinearGradient(0, 0, 0, H);
  baseG.addColorStop(0, st.top);
  baseG.addColorStop(0.5, st.bottom);
  baseG.addColorStop(1, st.top);
  ctx.fillStyle = baseG;
  ctx.fillRect(0, 0, W, H);

  // 2. Central sunken expressway canyon
  const canyonG = ctx.createLinearGradient(cx - 120, 0, cx + 120, 0);
  canyonG.addColorStop(0, 'rgba(0,0,0,0.75)');
  canyonG.addColorStop(0.2, 'rgba(8,14,26,0.92)');
  canyonG.addColorStop(0.5, 'rgba(16,28,48,0.85)');
  canyonG.addColorStop(0.8, 'rgba(8,14,26,0.92)');
  canyonG.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = canyonG;
  ctx.fillRect(cx - 110, 0, 220, H);

  // Highway perspective lane lines & glowing maglev tracks
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 2;
  for (const dx of [-106, -68, -24, 24, 68, 106]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, 0);
    ctx.lineTo(cx + dx, H);
    ctx.stroke();
  }

  // Horizontal highway grid ribs
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.16;
  for (let y = 0; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(cx - 106, y);
    ctx.lineTo(cx + 106, y);
    ctx.stroke();
  }

  // Dashed traffic light streaks in central corridor
  ctx.globalAlpha = 0.55;
  let seed = 4321 + stageIdx * 997;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 48; i++) {
    const lane = [-86, -46, 0, 46, 86][Math.floor(rand() * 5)] ?? 0;
    const y = Math.floor(rand() * (H - 80));
    const len = 24 + rand() * 44;
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : accent;
    ctx.fillRect(cx + lane + (rand() - 0.5) * 8, y, 2.5, len);
  }
  ctx.globalAlpha = 1;

  // 3. Overpass skybridges spanning the highway canyon
  for (const by of [160, 480, 820]) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(cx - 120, by + 10, 240, 28);

    const bridgeG = ctx.createLinearGradient(0, by, 0, by + 26);
    bridgeG.addColorStop(0, '#334155');
    bridgeG.addColorStop(0.5, '#1e293b');
    bridgeG.addColorStop(1, '#0f172a');
    ctx.fillStyle = bridgeG;
    ctx.fillRect(cx - 120, by, 240, 24);

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 120, by, 240, 24);
    ctx.globalAlpha = 1;
  }

  // 4. Left & Right Corporate Megastructure Rooftops (perspective blocks)
  const drawRooftopColumn = (side: 'left' | 'right') => {
    let y = 8;
    let idx = 0;
    while (y < H - 20) {
      const bh = 88 + Math.floor(rand() * 64);
      if (y + bh > H - 4) break;
      const bw = 118 + Math.floor(rand() * 26);
      const bx = side === 'left' ? 6 : W - bw - 6;

      // Drop shadow toward central canyon
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(side === 'left' ? bx + 8 : bx - 8, y + 8, bw, bh);

      // Rooftop structural hull
      const roofG = ctx.createLinearGradient(bx, y, bx + bw, y + bh);
      roofG.addColorStop(0, '#1e293b');
      roofG.addColorStop(0.5, '#0f172a');
      roofG.addColorStop(1, '#090d16');
      ctx.fillStyle = roofG;
      rr(ctx, bx, y, bw, bh, 4);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Inner roof inset
      ctx.fillStyle = '#090d16';
      ctx.fillRect(bx + 8, y + 8, bw - 16, bh - 16);

      if (idx % 3 === 0) {
        // Rooftop Heliport Pad ('H')
        const hcx = bx + bw / 2;
        const hcy = y + bh / 2;
        const hr = Math.min(bw, bh) * 0.28;
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hcx, hcy, hr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '900 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', hcx, hcy + 1);
        ctx.globalAlpha = 1;
      } else if (idx % 3 === 1) {
        // Illuminated Corporate Window Grid
        for (let wy = y + 14; wy < y + bh - 16; wy += 8) {
          for (let wx = bx + 14; wx < bx + bw - 16; wx += 10) {
            if (rand() > 0.28) {
              ctx.fillStyle = rand() > 0.8 ? '#fef08a' : accent;
              ctx.globalAlpha = 0.35 + rand() * 0.45;
              ctx.fillRect(wx, wy, 6, 4);
            }
          }
        }
        ctx.globalAlpha = 1;
      } else {
        // Twin Industrial Cooling Turbines & Neon Conduit
        for (const dy of [-18, 18]) {
          const tcx = bx + bw / 2;
          const tcy = y + bh / 2 + dy;
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tcx, tcy, 12, 0, Math.PI * 2);
          ctx.stroke();
          glowCircle(ctx, tcx, tcy, 7, '#ffffff', accent);
        }
      }

      y += bh + 14;
      idx++;
    }
  };

  drawRooftopColumn('left');
  drawRooftopColumn('right');

  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Secondary Parallax Cyber-Grid / Cloud-Streak Layer (`512x1024`)
 * that scrolls faster than the ground corridor for true 3D depth.
 */
export function parallaxOverlayTexture(stageIdx: number): THREE.CanvasTexture {
  const st = STAGES[stageIdx % STAGES.length] ?? STAGES[0]!;
  const W = 512;
  const H = 1024;
  const [c, ctx] = cv(W, H);
  const cx = W / 2;
  const accent = st.accent;

  // Glowing upper-level skyway rails
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.24;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([28, 20]);
  for (const dx of [-144, 144]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, 0);
    ctx.lineTo(cx + dx, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Floating cyber-data nodes & speed streaks
  let seed = 9001 + stageIdx * 555;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < 28; i++) {
    const x = rand() * W;
    const y = rand() * (H - 120);
    const h = 40 + rand() * 80;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, accent);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.22 + rand() * 0.25;
    ctx.fillRect(x, y, 2, h);
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
