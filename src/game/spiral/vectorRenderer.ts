/**
 * Dark & Pop Modern 2D Vector Renderer
 * Pure HTML5 Canvas 2D vector drawing for Shachiku Spiral Defense.
 * ZERO EMOJIS — all sprites, entities, drops, and orbitals are crisp, high-contrast procedural vector graphics.
 */

// ==========================================
// 1. Player Cyber-Office Core Reactor
// ==========================================

/**
 * Draws the player corporate reactor core.
 * Features:
 * - Sleek cyber-office corporate reactor core
 * - Glowing cyan/amber energy rings
 * - Multi-layer rotating turbine notches & thrusters
 * - Pulsating shield arcs and two-stage HP gauge ring
 */
export function drawVectorCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hpRatio: number,
  shieldRatio: number,
  angle: number
): void {
  ctx.save();
  ctx.translate(x, y);

  const clampedHp = Math.max(0, Math.min(1, Number.isFinite(hpRatio) ? hpRatio : 0));
  const clampedShield = Math.max(0, Number.isFinite(shieldRatio) ? shieldRatio : 0);

  // 1. Drop shadow / reactor ambient floor occlusion
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.75, r * 1.05, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer cybernetic armor chassis (dark slate with neon trim)
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // 3. Health arc (smooth green-to-cyan gauge)
  if (clampedHp > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clampedHp);
    ctx.strokeStyle = clampedHp > 0.4 ? '#06b6d4' : clampedHp > 0.2 ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // 4. Pulsating Shield Arc (if shield > 0)
  if (clampedShield > 0) {
    const shieldArc = Math.min(Math.PI * 2, Math.PI * 2 * Math.min(1, clampedShield));
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, -Math.PI / 2, -Math.PI / 2 + shieldArc);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // 5. Rotating Turbine Ring / Energy Vents
  ctx.save();
  ctx.rotate(angle);
  const ventCount = 6;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  for (let i = 0; i < ventCount; i++) {
    const vAngle = (i * Math.PI * 2) / ventCount;
    const cos = Math.cos(vAngle);
    const sin = Math.sin(vAngle);
    ctx.beginPath();
    ctx.moveTo(cos * (r * 0.4), sin * (r * 0.4));
    ctx.lineTo(cos * (r * 0.88), sin * (r * 0.88));
    ctx.stroke();
  }
  ctx.restore();

  // 6. Inner Reactor Power Cell (glowing radial gradient)
  const cellGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.65);
  cellGrad.addColorStop(0, '#ffffff');
  cellGrad.addColorStop(0.35, '#38bdf8');
  cellGrad.addColorStop(0.75, '#0284c7');
  cellGrad.addColorStop(1, '#0f172a');
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = cellGrad;
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 7. Aiming Turret / Thruster Node (points along angle)
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -3);
  ctx.lineTo(r * 1.18, 0);
  ctx.lineTo(r * 0.8, 3);
  ctx.closePath();
  ctx.fill();

  // Thruster energy dot
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(r * 0.85, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ==========================================
// 2. Enemy Chains & Vector Head Crests
// ==========================================

export interface VectorSegmentOptions {
  enraged?: boolean;
  stunned?: boolean;
  shielded?: boolean;
  time?: number;
}

/**
 * Draws a bioluminescent capsule segment or specialized head crest.
 * Replaces all enemy emojis with crisp, high-contrast vector motifs.
 */
export function drawVectorSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  kind: string,
  isHead: boolean,
  hpRatio: number,
  _icon?: string,
  options: VectorSegmentOptions = {}
): void {
  ctx.save();
  ctx.translate(x, y);

  const clampedHp = Math.max(0, Math.min(1, Number.isFinite(hpRatio) ? hpRatio : 1));
  const enraged = options.enraged ?? false;
  const stunned = options.stunned ?? false;
  const t = options.time ?? 0;

  // Stun vibration jitter
  if (stunned) {
    const jitterX = Math.sin(t * 40) * 1.8;
    const jitterY = Math.cos(t * 40) * 1.8;
    ctx.translate(jitterX, jitterY);
  }

  // 1. Ground contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.65, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!isHead) {
    // ----------------------------------------------------
    // Body Segment: Bioluminescent Capsule with Neon Joint
    // ----------------------------------------------------
    const baseColor = getKindColor(kind);

    // Outer bioluminescent shell
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();

    // Circuit glow ring
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Inner core tech fill
    const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7);
    innerGrad.addColorStop(0, hexWithAlpha(baseColor, 0.85));
    innerGrad.addColorStop(0.65, hexWithAlpha(baseColor, 0.25));
    innerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Joint connection pin
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, r * 0.22), 0, Math.PI * 2);
    ctx.fill();

    // Stun electricity arcs if active
    if (stunned) {
      drawElectricSparks(ctx, r);
    }
  } else {
    // ----------------------------------------------------
    // Head Segment: Vector Crests per Corporate Archetype
    // ----------------------------------------------------
    const primaryColor = enraged ? '#ff2222' : getKindColor(kind);

    // Boss warning aura / Threat ring
    if (kind === 'bossMid' || kind === 'exec' || kind === 'president') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r + 5 + Math.sin(t * 8) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = enraged ? 'rgba(239, 68, 68, 0.8)' : hexWithAlpha(primaryColor, 0.6);
      ctx.lineWidth = 2.5;
      if (ctx.setLineDash) ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }

    // Head base capsule body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Glowing core gradient
    const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.85);
    headGrad.addColorStop(0, hexWithAlpha(primaryColor, 0.4));
    headGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Draw unique vector head crest
    drawHeadCrest(ctx, kind, r, primaryColor, t, enraged);

    // Mini health arc on top of head
    if (clampedHp < 1.0) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 2.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clampedHp);
      ctx.strokeStyle = clampedHp > 0.4 ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Stun electricity arcs
    if (stunned) {
      drawElectricSparks(ctx, r);
    }
  }

  ctx.restore();
}

/**
 * Draws specific vector crests matching corporate archetypes without any text or emojis.
 */
function drawHeadCrest(
  ctx: CanvasRenderingContext2D,
  kind: string,
  r: number,
  color: string,
  time: number,
  enraged: boolean
): void {
  ctx.save();
  const s = r * 0.62;

  switch (kind) {
    case 'mail': {
      // Cyber Mail: Sleek envelope / digital data packet crest with chevron
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = color;
      ctx.lineWidth = 1.8;

      // Outer packet rectangle
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.65);
      ctx.lineTo(s, -s * 0.65);
      ctx.lineTo(s, s * 0.65);
      ctx.lineTo(-s, s * 0.65);
      ctx.closePath();
      ctx.stroke();

      // Fold lines
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.65);
      ctx.lineTo(0, s * 0.2);
      ctx.lineTo(s, -s * 0.65);
      ctx.stroke();

      // Central glowing data core
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'doc': {
      // Warning Dossier: Angled dossier folder with hazard diagonal line
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#f59e0b';
      ctx.lineWidth = 1.8;

      // Hexagonal / folder tab shape
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, -s * 0.9);
      ctx.lineTo(0, -s * 0.9);
      ctx.lineTo(s * 0.3, -s * 0.5);
      ctx.lineTo(s * 0.85, -s * 0.5);
      ctx.lineTo(s * 0.85, s * 0.85);
      ctx.lineTo(-s * 0.8, s * 0.85);
      ctx.closePath();
      ctx.stroke();

      // Hazard badge lines
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, 0);
      ctx.lineTo(s * 0.4, 0);
      ctx.moveTo(-s * 0.4, s * 0.4);
      ctx.lineTo(s * 0.2, s * 0.4);
      ctx.stroke();
      break;
    }

    case 'claim': {
      // Siren Megaphone: Stylized neon megaphone with radiating soundwave arc lines
      ctx.strokeStyle = '#f472b6';
      ctx.fillStyle = '#f472b6';
      ctx.lineWidth = 1.8;

      // Megaphone body
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s * 0.3);
      ctx.lineTo(-s * 0.2, -s * 0.3);
      ctx.lineTo(s * 0.4, -s * 0.7);
      ctx.lineTo(s * 0.4, s * 0.7);
      ctx.lineTo(-s * 0.2, s * 0.3);
      ctx.lineTo(-s * 0.7, s * 0.3);
      ctx.closePath();
      ctx.stroke();

      // Soundwave pulse arcs
      const pulse = (time * 6) % 1;
      ctx.beginPath();
      ctx.arc(s * 0.5, 0, s * 0.4 + pulse * s * 0.4, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      break;
    }

    case 'bossMid': {
      // Demon Tie (課長): Angular crimson necktie with glowing demonic chevron and optic sensor
      ctx.strokeStyle = enraged ? '#ff0000' : '#ef4444';
      ctx.fillStyle = enraged ? '#7f1d1d' : '#991b1b';
      ctx.lineWidth = 2;

      // Tie knot
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, -s * 0.8);
      ctx.lineTo(s * 0.45, -s * 0.8);
      ctx.lineTo(s * 0.3, -s * 0.4);
      ctx.lineTo(-s * 0.3, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tie blade tapering to sharp point
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.4);
      ctx.lineTo(s * 0.3, -s * 0.4);
      ctx.lineTo(s * 0.5, s * 0.4);
      ctx.lineTo(0, s * 0.95);
      ctx.lineTo(-s * 0.5, s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crimson cyclops eye in center
      ctx.fillStyle = enraged ? '#ffffff' : '#fca5a5';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'exec': {
      // Corporate Horns / Crown (役員): Menacing executive horns with conference laser eye
      ctx.strokeStyle = '#dc2626';
      ctx.fillStyle = '#450a0a';
      ctx.lineWidth = 2;

      // Dual angular cyber horns
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, -s * 0.9);
      ctx.lineTo(-s * 0.3, -s * 0.2);
      ctx.lineTo(0, -s * 0.5);
      ctx.lineTo(s * 0.3, -s * 0.2);
      ctx.lineTo(s * 0.8, -s * 0.9);
      ctx.lineTo(s * 0.5, s * 0.6);
      ctx.lineTo(0, s * 0.9);
      ctx.lineTo(-s * 0.5, s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing executive core lens
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, s * 0.1, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'president': {
      // Corporate Crown (社長): Ornate cyber-gold crown with rotating diamond jewels
      ctx.strokeStyle = '#fbbf24';
      ctx.fillStyle = '#78350f';
      ctx.lineWidth = 2.2;

      // Crown spikes (5-point royal crest)
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, s * 0.5);
      ctx.lineTo(-s * 0.9, -s * 0.4);
      ctx.lineTo(-s * 0.45, 0);
      ctx.lineTo(0, -s * 0.9);
      ctx.lineTo(s * 0.45, 0);
      ctx.lineTo(s * 0.9, -s * 0.4);
      ctx.lineTo(s * 0.9, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Diamond gems on spikes
      ctx.fillStyle = '#ffffff';
      [-s * 0.9, 0, s * 0.9].forEach((gx, i) => {
        const gy = i === 1 ? -s * 0.9 : -s * 0.4;
        ctx.beginPath();
        ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Golden imperial emblem in center
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, s * 0.2, 3.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      // Generic high-tech diamond
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawElectricSparks(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + Math.random() * 0.4;
    const d1 = r * 0.8;
    const d2 = r * 1.35;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * d1, Math.sin(a) * d1);
    ctx.lineTo(Math.cos(a + 0.2) * (d1 + d2) * 0.5, Math.sin(a + 0.2) * (d1 + d2) * 0.5);
    ctx.lineTo(Math.cos(a - 0.1) * d2, Math.sin(a - 0.1) * d2);
    ctx.stroke();
  }
  ctx.restore();
}

// ==========================================
// 3. Vector Bento Capsule / Energy Recovery Pack
// ==========================================

/**
 * Draws the vector Bento Capsule energy recovery drop.
 * Replaces legacy emoji drop with a high-tech medical/energy recovery pack.
 */
export function drawVectorBento(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number
): void {  ctx.save();
  ctx.translate(x, y);

  const bob = Math.sin(time * 5) * 2.5;
  ctx.translate(0, bob);

  // 1. Shadow beneath floating capsule
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 11 - bob * 0.5, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Translucent emerald energy field
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // 3. Rounded medical bento container
  const w = 18;
  const h = 13;
  ctx.beginPath();
  drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 3.5);
  ctx.fillStyle = '#064e3b';
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 4. Glowing Medical Recovery Cross
  ctx.fillStyle = '#34d399';
  const armW = 3.5;
  const armL = 9;
  // Horizontal arm
  ctx.fillRect(-armL / 2, -armW / 2, armL, armW);
  // Vertical arm
  ctx.fillRect(-armW / 2, -armL / 2, armW, armL);

  // 5. Rising Steam / Vapor Particles
  ctx.fillStyle = 'rgba(167, 243, 208, 0.7)';
  for (let i = 0; i < 2; i++) {
    const steamY = -8 - ((time * 18 + i * 9) % 14);
    const steamX = Math.sin(time * 6 + i * 2) * 4;
    const steamR = Math.max(0.8, 2.2 - (Math.abs(steamY) / 22) * 1.8);
    ctx.beginPath();
    ctx.arc(steamX, steamY, steamR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ==========================================
// 3.5 Treasure Chest (weapon evolution)
// ==========================================

/**
 * Ad-game style treasure chest sitting in a chain gap.
 * Golden holographic crate with a pulsing "?" core.
 */
export function drawVectorChest(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  openT: number
): void {
  ctx.save();
  ctx.translate(x, y);

  const pulse = 1 + Math.sin(time * 4) * 0.06;
  const open = openT > 0;
  const lift = open ? (0.45 - openT) * 60 : 0;

  // 1. Ground glow
  const glowR = 26 * pulse;
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, glowR);
  glow.addColorStop(0, 'rgba(253, 224, 71, 0.42)');
  glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Chest body
  ctx.translate(0, -lift);
  const w = 30;
  const h = 20;
  ctx.beginPath();
  drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 4);
  ctx.fillStyle = '#78350f';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Lid (tilts open)
  const lidAngle = open ? -0.9 : 0;
  ctx.save();
  ctx.translate(0, -h / 2);
  ctx.rotate(lidAngle);
  ctx.beginPath();
  drawRoundedRect(ctx, -w / 2, -7, w, 9, 3);
  ctx.fillStyle = '#92400e';
  ctx.fill();
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // 4. Keyhole / question spark
  if (!open) {
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 1);
  } else {
    // energy beam burst
    ctx.fillStyle = `rgba(253, 224, 71, ${Math.max(0, openT / 0.45)})`;
    ctx.beginPath();
    ctx.moveTo(-10, -h / 2 + 2);
    ctx.lineTo(0, -h / 2 - 36 * (openT / 0.45));
    ctx.lineTo(10, -h / 2 + 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ==========================================
// 4. Holographic Defense Drones (Orbitals)
// ==========================================

/**
 * Draws a stylized holographic defense drone / rotating energy card.
 * Replaces legacy orbital emojis with high-tech orbiting drones.
 */
export function drawVectorOrbital(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Drone diamond fuselage
  const s = 9.5;
  ctx.beginPath();
  ctx.moveTo(s * 1.2, 0);
  ctx.lineTo(0, -s * 0.7);
  ctx.lineTo(-s * 0.8, 0);
  ctx.lineTo(0, s * 0.7);
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 2. Wing energy card fins
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.7);
  ctx.lineTo(-s * 0.9, -s * 1.2);
  ctx.moveTo(-s * 0.2, s * 0.7);
  ctx.lineTo(-s * 0.9, s * 1.2);
  ctx.stroke();

  // 3. Glowing central energy core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 4. Rear thruster flame
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(-s * 0.8, -2);
  ctx.lineTo(-s * 1.5, 0);
  ctx.lineTo(-s * 0.8, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ==========================================
// 5. Lasers, Projectiles & Gimmicks
// ==========================================

/**
 * Draws high-contrast glowing laser bolts with additive blending.
 */
export function drawVectorLaser(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: string,
  alpha = 1.0
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.globalCompositeOperation = 'lighter';

  // Outer diffuse glow
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Inner blinding core
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, width * 0.65);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws player fired projectile bolts.
 */
export function drawVectorProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vx: number,
  vy: number,
  crit: boolean,
  _time = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  const angle = Math.atan2(vy, vx);
  ctx.rotate(angle);

  const len = crit ? 18 : 14;
  const h = crit ? 4 : 3;

  // Additive laser bolt
  ctx.globalCompositeOperation = 'lighter';

  // Outer glow
  ctx.fillStyle = crit ? '#f59e0b' : '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(len * 0.5, 0);
  ctx.lineTo(-len * 0.5, -h);
  ctx.lineTo(-len * 0.3, 0);
  ctx.lineTo(-len * 0.5, h);
  ctx.closePath();
  ctx.fill();

  // Hot inner core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(len * 0.45, 0);
  ctx.lineTo(-len * 0.3, -h * 0.5);
  ctx.lineTo(-len * 0.15, 0);
  ctx.lineTo(-len * 0.3, h * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws boss urgent memo spread projectiles (Wave 5 boss).
 */
export function drawVectorMemoProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vx: number,
  vy: number,
  time: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx));

  // Red glowing urgent dossier / document dart
  ctx.fillStyle = '#ef4444';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;

  // Diamond memo shape
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pulsing danger core
  const pulse = Math.sin(time * 20) * 0.5 + 0.5;
  ctx.fillStyle = pulse > 0.5 ? '#fef08a' : '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the Golden Executive Barrier for Wave 15 President.
 */
export function drawVectorExecutiveBarrier(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
  arcAngle: number,
  hpRatio: number,
  time: number
): void {
  ctx.save();
  ctx.translate(x, y);

  const startA = angle - arcAngle / 2;
  const endA = angle + arcAngle / 2;
  const shieldR = r + 16;

  // Honeycomb barrier arc
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.arc(0, 0, shieldR, startA, endA);
  ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 + Math.sin(time * 6) * 0.2})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Sharp outer edge
  ctx.beginPath();
  ctx.arc(0, 0, shieldR + 4, startA, endA);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Hex energy nodes along arc
  const nodeCount = 5;
  for (let i = 0; i <= nodeCount; i++) {
    const na = startA + (i / nodeCount) * arcAngle;
    const nx = Math.cos(na) * shieldR;
    const ny = Math.sin(na) * shieldR;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Barrier integrity arc
  if (hpRatio < 1.0) {
    ctx.beginPath();
    ctx.arc(0, 0, shieldR + 8, startA, startA + arcAngle * Math.max(0, hpRatio));
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a modern laser targeting reticle.
 */
export function drawVectorReticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  time: number
): void {
  ctx.save();
  ctx.translate(targetX, targetY);

  const rot = time * 2;
  ctx.rotate(rot);

  const r = 16;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
  ctx.lineWidth = 1.8;

  // Segmented corner brackets
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, a - 0.25, a + 0.25);
    ctx.stroke();
  }

  // Crosshair center dot
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Thin targeting guide laser from core to target
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1;
  if (ctx.setLineDash) ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(targetX, targetY);
  ctx.stroke();
  ctx.restore();
}

// ==========================================
// Helper Utilities
// ==========================================

function getKindColor(kind: string): string {
  switch (kind) {
    case 'mail': return '#38bdf8'; // neon cyan
    case 'doc': return '#f59e0b'; // amber
    case 'claim': return '#f472b6'; // hot pink
    case 'bossMid': return '#ef4444'; // red
    case 'exec': return '#dc2626'; // dark crimson
    case 'president': return '#fbbf24'; // auric gold
    default: return '#94a3b8';
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.arcTo === 'function') {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
  }
  ctx.closePath();
}
