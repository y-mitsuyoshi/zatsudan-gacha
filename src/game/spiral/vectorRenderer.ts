/**
 * Dark & Pop Modern 2D Vector Renderer — Cell Survivor Hyper-Turret Overhaul
 * Pure HTML5 Canvas 2D vector drawing for Shachiku Spiral Defense.
 * ZERO EMOJIS — all sprites, entities, drops, and orbitals are crisp, high-contrast procedural vector graphics.
 */

// ==========================================
// 0. Spiral Track Rail & Cellular Synapse Links
// ==========================================

/**
 * Draws the Cell Survivor-style glowing Archimedean spiral guide rail on the arena floor
 * (`r = 28` out to `arenaR - 14`) with distance nodes (`100m`, `75m`, `50m`, `25m DANGER`)
 * and animated chevron pulses flowing inward toward the core, plus a pulsing danger perimeter ring (`r = 46`).
 */
export function drawSpiralTrackRail(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  arenaR: number,
  time: number
): void {
  ctx.save();
  ctx.translate(centerX, centerY);

  const minR = 28;
  const maxR = arenaR - 14;
  const turns = 3.25;
  const totalTheta = turns * Math.PI * 2;
  const steps = 140;

  // 1. Outer recessed rail track bed
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const theta = u * totalTheta - time * 0.18;
    const r = minR + u * (maxR - minR);
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.11)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 2. Inner crisp neon guide rail
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 3. Animated inward-flowing chevron pulses along the spiral rail
  const pulseCount = 14;
  const flowPhase = (time * 0.55) % 1;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.48)';
  ctx.lineWidth = 1.8;
  for (let p = 0; p < pulseCount; p++) {
    // Flow inward: u decreases as time increases
    const u = (1 - ((p / pulseCount + flowPhase) % 1));
    const theta = u * totalTheta - time * 0.18;
    const r = minR + u * (maxR - minR);
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    // Tangent pointing inward along spiral
    const tangentAngle = theta - Math.PI / 2 - 0.16;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tangentAngle);
    ctx.beginPath();
    ctx.moveTo(-4, -3.5);
    ctx.lineTo(3, 0);
    ctx.lineTo(-4, 3.5);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Distance Milestone Nodes along the Spiral Track (100m, 75m, 50m, 25m DANGER)
  const milestones: Array<{ u: number; label: string; color: string }> = [
    { u: 0.92, label: '100m', color: '#38bdf8' },
    { u: 0.68, label: '75m', color: '#38bdf8' },
    { u: 0.44, label: '50m', color: '#f59e0b' },
    { u: 0.20, label: '25m DANGER', color: '#ef4444' },
  ];
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of milestones) {
    const theta = m.u * totalTheta;
    const r = minR + m.u * (maxR - minR);
    const mx = Math.cos(theta) * r;
    const my = Math.sin(theta) * r;

    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = m.color;
    ctx.fillText(m.label, mx, my - 10);
  }

  // 5. Pulsing Danger Perimeter Ring around Center Core (r = 46)
  const dangerPulse = 0.35 + 0.25 * Math.sin(time * 5.5);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(239, 68, 68, ${dangerPulse})`;
  ctx.lineWidth = 2.2;
  if (ctx.setLineDash) ctx.setLineDash([6, 4]);
  ctx.stroke();
  if (ctx.setLineDash) ctx.setLineDash([]);

  // Subtle danger zone inner tint
  const dzGrad = ctx.createRadialGradient(0, 0, 16, 0, 0, 46);
  dzGrad.addColorStop(0, 'rgba(239, 68, 68, 0.02)');
  dzGrad.addColorStop(0.8, `rgba(239, 68, 68, ${dangerPulse * 0.16})`);
  dzGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = dzGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Draws glowing cellular synapse connectors between consecutive segments (`segs[i-1]` to `segs[i]`)
 * so each chain looks like a living, slithering segmented organism.
 */
export function drawCellularSynapseLinks(
  ctx: CanvasRenderingContext2D,
  segs: ReadonlyArray<{ x: number; y: number; radius: number }>,
  kind: string,
  time: number,
  enraged = false
): void {
  if (segs.length < 2) return;
  const color = enraged ? '#ff2222' : getKindColor(kind);

  ctx.save();
  // Outer translucent cellular membrane bridge
  ctx.strokeStyle = hexWithAlpha(color, 0.28);
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();

  // Inner bright neural axon filament
  ctx.strokeStyle = hexWithAlpha('#ffffff', 0.55);
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Animated synapse pulse nodes traveling from tail to head
  const pulsePos = 1 - ((time * 2.2) % 1);
  for (let i = 1; i < segs.length; i++) {
    const a = segs[i - 1];
    const b = segs[i];
    const px = b.x + (a.x - b.x) * pulsePos;
    const py = b.y + (a.y - b.y) * pulsePos;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ==========================================
// 1. Player Cyber-Office Core Reactor & Hyper-Turret
// ==========================================

/**
 * Draws the player corporate reactor core with a Cell Survivor directional hyper-turret barrel.
 * Features:
 * - Sleek cyber-office corporate reactor core
 * - Glowing cyan/amber energy rings
 * - Multi-layer rotating turbine notches & directional dual-rail turret barrel
 * - Muzzle flash burst on every shot
 * - Pulsating shield arcs and two-stage HP gauge ring
 */
export function drawVectorCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hpRatio: number,
  shieldRatio: number,
  angle: number,
  muzzleFlash = 0
): void {
  ctx.save();
  ctx.translate(x, y);

  const clampedHp = Math.max(0, Math.min(1, Number.isFinite(hpRatio) ? hpRatio : 0));
  const clampedShield = Math.max(0, Number.isFinite(shieldRatio) ? shieldRatio : 0);

  // 1. Drop shadow / reactor ambient floor occlusion
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.75, r * 1.15, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer cybernetic armor chassis (octagonal-accented dark slate with neon trim)
  ctx.beginPath();
  ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // 3. Health arc (smooth green-to-cyan gauge)
  if (clampedHp > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clampedHp);
    ctx.strokeStyle = clampedHp > 0.4 ? '#06b6d4' : clampedHp > 0.2 ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // 4. Pulsating Shield Arc (if shield > 0)
  if (clampedShield > 0) {
    const shieldArc = Math.min(Math.PI * 2, Math.PI * 2 * Math.min(1, clampedShield));
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r + 9, -Math.PI / 2, -Math.PI / 2 + shieldArc);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.4;
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

  // 6. Directional Hyper-Turret Barrel Assembly (tracks aimAngle / target)
  ctx.save();
  ctx.rotate(angle);
  const recoilOffset = muzzleFlash > 0 ? -Math.min(3.5, muzzleFlash * 28) : 0;
  ctx.translate(recoilOffset, 0);

  // Turret dual rail housing
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.6;
  drawRoundedRect(ctx, r * 0.25, -5.5, r * 1.05, 11, 2.5);
  ctx.fill();
  ctx.stroke();

  // Inner plasma accelerator channel
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(r * 0.45, -2, r * 0.8, 4);

  // Muzzle brake tip
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(r * 1.25, -4.5);
  ctx.lineTo(r * 1.48, -2.5);
  ctx.lineTo(r * 1.48, 2.5);
  ctx.lineTo(r * 1.25, 4.5);
  ctx.closePath();
  ctx.fill();

  // Vibrant Muzzle Flash Burst when firing
  if (muzzleFlash > 0) {
    const flashScale = Math.min(1.4, 0.6 + muzzleFlash * 8);
    ctx.save();
    ctx.translate(r * 1.52, 0);
    ctx.scale(flashScale, flashScale);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(4, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 7. Inner Reactor Power Cell (glowing radial gradient)
  const cellGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.68);
  cellGrad.addColorStop(0, '#ffffff');
  cellGrad.addColorStop(0.35, '#38bdf8');
  cellGrad.addColorStop(0.75, '#0284c7');
  cellGrad.addColorStop(1, '#0f172a');
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = cellGrad;
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.restore();
}

// ==========================================
// 2. Cell Survivor Numbered Capsule Segments & Head Crests
// ==========================================

export interface VectorSegmentOptions {
  enraged?: boolean;
  stunned?: boolean;
  shielded?: boolean;
  time?: number;
  /** Exact remaining HP to display inside the cellular orb */
  hpValue?: number;
  /** >0 when recently hit: triggers white flash + squash-and-stretch pulse */
  hitFlash?: number;
  /** >0 when slowed by EMP/Cryo blast */
  slowed?: boolean;
}

/**
 * Formats segment HP for crisp inside-orb display ("85", "940", "1.2K").
 */
export function formatCellHp(hp: number): string {
  const clean = Math.max(1, Math.ceil(hp));
  if (clean >= 10000) return `${(clean / 1000).toFixed(0)}K`;
  if (clean >= 1000) return `${(clean / 1000).toFixed(1)}K`;
  return String(clean);
}

/**
 * Draws a Cell Survivor-style numbered glossy cellular capsule segment or specialized head crest.
 * Every segment renders as a vibrant cellular orb with its current HP boldly displayed in the center.
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
  const slowed = options.slowed ?? false;
  const hitFlash = options.hitFlash ?? 0;
  const t = options.time ?? 0;

  // Stun vibration jitter
  if (stunned) {
    const jitterX = Math.sin(t * 40) * 1.8;
    const jitterY = Math.cos(t * 40) * 1.8;
    ctx.translate(jitterX, jitterY);
  }

  // Hit squash-and-stretch pulse
  if (hitFlash > 0) {
    const k = Math.min(1, hitFlash / 0.14);
    const sx = 1 + k * 0.18;
    const sy = 1 - k * 0.12;
    ctx.scale(sx, sy);
  }

  // 1. Ground contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.68, r * 0.88, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  const baseColor = enraged ? '#ff2222' : slowed ? '#38bdf8' : getKindColor(kind);

  if (!isHead) {
    // ----------------------------------------------------
    // Body Segment: Glossy Numbered Cell Survivor Capsule
    // ----------------------------------------------------
    // Outer cellular membrane glow
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : '#090d16';
    ctx.fill();

    // Rich cellular cytoplasm radial fill
    if (hitFlash <= 0) {
      const innerGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      innerGrad.addColorStop(0, hexWithAlpha(baseColor, 0.92));
      innerGrad.addColorStop(0.65, hexWithAlpha(baseColor, 0.48));
      innerGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp outer cell wall ring + HP progress rim
    ctx.strokeStyle = hitFlash > 0 ? '#ffffff' : baseColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Glossy specular crescent highlight (top-left)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.42, r * 0.2, -0.45, 0, Math.PI * 2);
    ctx.fill();

    // Render HP number boldly inside the center of the cell
    if (options.hpValue !== undefined && options.hpValue > 0) {
      const hpText = formatCellHp(options.hpValue);
      const fontSize = Math.max(8, Math.min(12, Math.round(r * (hpText.length >= 4 ? 0.68 : 0.78))));
      ctx.font = `900 ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(2, 6, 23, 0.92)';
      ctx.lineWidth = 2.8;
      ctx.strokeText(hpText, 0, 0.5);
      ctx.fillStyle = hitFlash > 0 ? '#0f172a' : '#ffffff';
      ctx.fillText(hpText, 0, 0.5);
    } else {
      // Fallback nucleus dot when hpValue is not provided
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, r * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }

    // Stun electricity arcs if active
    if (stunned) {
      drawElectricSparks(ctx, r);
    }
  } else {
    // ----------------------------------------------------
    // Head Segment: Vector Crests + Numbered Core Badge
    // ----------------------------------------------------
    const primaryColor = baseColor;

    // Boss warning aura / Threat ring
    if (kind === 'bossMid' || kind === 'exec' || kind === 'president') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r + 5 + Math.sin(t * 8) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = enraged ? 'rgba(239, 68, 68, 0.85)' : hexWithAlpha(primaryColor, 0.65);
      ctx.lineWidth = 2.5;
      if (ctx.setLineDash) ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }

    // Head base cellular body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : '#0f172a';
    ctx.fill();
    ctx.strokeStyle = hitFlash > 0 ? '#ffffff' : primaryColor;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Glowing core gradient
    if (hitFlash <= 0) {
      const headGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 1, 0, 0, r * 0.92);
      headGrad.addColorStop(0, hexWithAlpha(primaryColor, 0.72));
      headGrad.addColorStop(0.7, hexWithAlpha(primaryColor, 0.28));
      headGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw unique vector head crest
    drawHeadCrest(ctx, kind, r, primaryColor, t, enraged);

    // Mini health arc on top of head
    if (clampedHp < 1.0) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 2.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clampedHp);
      ctx.strokeStyle = clampedHp > 0.4 ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Bold HP number inside the head cell
    if (options.hpValue !== undefined && options.hpValue > 0) {
      const hpText = formatCellHp(options.hpValue);
      const fontSize = Math.max(9, Math.min(13, Math.round(r * (hpText.length >= 4 ? 0.66 : 0.76))));
      ctx.font = `900 ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(2, 6, 23, 0.95)';
      ctx.lineWidth = 3.2;
      ctx.strokeText(hpText, 0, 1);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(hpText, 0, 1);
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
// 4. Rotating Plasma Saws (Orbitals)
// ==========================================

/**
 * Draws a Cell Survivor-style rotating plasma saw / holographic cutter drone.
 */
export function drawVectorOrbital(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * 2.2);

  const outerR = 11.5;
  const innerR = 7.2;
  const teeth = 6;

  // 1. Saw blade outer plasma teeth
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a1 = (i * Math.PI * 2) / teeth;
    const aMid = a1 + Math.PI / teeth;
    const a2 = ((i + 1) * Math.PI * 2) / teeth;
    if (i === 0) ctx.moveTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
    ctx.lineTo(Math.cos(aMid - 0.14) * outerR, Math.sin(aMid - 0.14) * outerR);
    ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
  }
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 2. Inner golden energy ring
  ctx.beginPath();
  ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 3. Glowing central plasma core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
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
 * Draws Cell Survivor-style glowing energy capsule projectiles with plasma tail.
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

  const len = crit ? 22 : 16;
  const h = crit ? 4.8 : 3.6;

  // Additive plasma capsule bolt
  ctx.globalCompositeOperation = 'lighter';

  // Trailing wake
  ctx.strokeStyle = crit ? 'rgba(245, 158, 11, 0.45)' : 'rgba(56, 189, 248, 0.42)';
  ctx.lineWidth = h * 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-len * 0.85, 0);
  ctx.lineTo(len * 0.35, 0);
  ctx.stroke();

  // Outer energy capsule
  ctx.fillStyle = crit ? '#f59e0b' : '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(len * 0.55, 0);
  ctx.lineTo(len * 0.15, -h);
  ctx.lineTo(-len * 0.5, -h * 0.75);
  ctx.lineTo(-len * 0.32, 0);
  ctx.lineTo(-len * 0.5, h * 0.75);
  ctx.lineTo(len * 0.15, h);
  ctx.closePath();
  ctx.fill();

  // Hot white inner core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(len * 0.48, 0);
  ctx.lineTo(len * 0.1, -h * 0.48);
  ctx.lineTo(-len * 0.25, 0);
  ctx.lineTo(len * 0.1, h * 0.48);
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
