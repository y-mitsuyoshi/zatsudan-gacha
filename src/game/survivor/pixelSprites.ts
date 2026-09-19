/**
 * 16-bit Retro Pixel Art Generator & Offscreen Canvas Cache
 * Procedural rasterizer producing crisp, multi-shade 16-bit golden age pixel art.
 * - Multi-shade color ramps (Outline, Dark Shade, Base, Highlight)
 * - 4-frame walk cycle for salaryman hero + horizontal flipping
 * - 11 animated enemy sprite sets (walk/idle cycle + hit-flash)
 * - 16-bit faceted diamond XP gems (Green=Small, Blue=Med, Red=Large, Gold=Giant)
 * - Pixel chests, items, 8 base weapons, 8 evolved weapons, 6 passives, and UI icons
 * - Offscreen canvas caching with nearest-neighbor crisp rendering
 * - Zero emojis in game rendering and UI
 */

export interface ColorRamp {
  outline: string;
  dark: string;
  base: string;
  light: string;
  extra?: string;
}

// 16-bit multi-shade color ramps
export const RAMPS = {
  skin: { outline: '#3b1d11', dark: '#b46d45', base: '#f4aa7c', light: '#fedbc4' },
  suitBlue: { outline: '#09132e', dark: '#15295c', base: '#2b4d99', light: '#5479d2' },
  suitGray: { outline: '#111827', dark: '#283548', base: '#4b5563', light: '#9ca3af' },
  suitDark: { outline: '#08080c', dark: '#181824', base: '#2d2d42', light: '#50506e' },
  crimson: { outline: '#3b0a0a', dark: '#7f1d1d', base: '#dc2626', light: '#f87171' },
  gold: { outline: '#451a03', dark: '#92400e', base: '#d97706', light: '#fde047', extra: '#ffffff' },
  emerald: { outline: '#052e16', dark: '#15803d', base: '#22c55e', light: '#86efac', extra: '#ffffff' },
  sapphire: { outline: '#082f49', dark: '#0369a1', base: '#0284c7', light: '#7dd3fc', extra: '#ffffff' },
  ruby: { outline: '#450a0a', dark: '#991b1b', base: '#e11d48', light: '#fda4af', extra: '#ffffff' },
  purple: { outline: '#2e1065', dark: '#581c87', base: '#9333ea', light: '#c084fc' },
  teal: { outline: '#042f2e', dark: '#0f766e', base: '#0d9488', light: '#5eead4' },
  amber: { outline: '#451a03', dark: '#b45309', base: '#f59e0b', light: '#fde68a' },
  whitePaper: { outline: '#1e293b', dark: '#94a3b8', base: '#e2e8f0', light: '#ffffff' },
  coffeeBrown: { outline: '#261208', dark: '#542610', base: '#8b4513', light: '#d27d46' },
  postItYellow: { outline: '#423204', dark: '#ca8a04', base: '#facc15', light: '#fef08a' },
  toxicGreen: { outline: '#143306', dark: '#3f7c0c', base: '#84cc16', light: '#d9f99d' },
};

// Global cache for rendered offscreen canvases
const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Creates an offscreen canvas with nearest-neighbor crisp image rendering.
 */
function createCrispCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const safeW = Math.max(1, Math.round(w));
  const safeH = Math.max(1, Math.round(h));
  if (typeof document === 'undefined') {
    // In test / non-DOM environments, handle gracefully
    const mockCtx: any = {
      canvas: { width: safeW, height: safeH },
      imageSmoothingEnabled: false,
      fillStyle: '#000000',
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      drawImage: () => {},
    };
    return { canvas: { width: safeW, height: safeH, getContext: () => mockCtx } as any, ctx: mockCtx };
  }
  const canvas = document.createElement('canvas');
  canvas.width = safeW;
  canvas.height = safeH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Utility to draw a single pixel on canvas.
 */
function p(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
}

/**
 * Utility to draw a filled rectangle of pixels.
 */
function pRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

// =========================================================================
// 1. Player: Salaryman (24x24, 4-frame walk cycle)
// =========================================================================

function renderSalarymanFrame(frame: number, white: boolean): HTMLCanvasElement {
  const { canvas, ctx } = createCrispCanvas(24, 24);
  const skin = white ? { outline: '#fff', dark: '#fff', base: '#fff', light: '#fff' } : RAMPS.skin;
  const suit = white ? { outline: '#fff', dark: '#fff', base: '#fff', light: '#fff' } : RAMPS.suitBlue;
  const tie = white ? { outline: '#fff', dark: '#fff', base: '#fff', light: '#fff' } : RAMPS.crimson;
  const hair = white ? '#ffffff' : '#1e1b2e';
  const shirt = white ? '#ffffff' : '#f8fafc';
  const shoes = white ? '#ffffff' : '#0f172a';

  // Head bobbing based on walk frame
  // Frame 0: Neutral stand (y-offset: 0)
  // Frame 1: Left leg forward, bob down (y-offset: 1)
  // Frame 2: Mid-pass stand (y-offset: 0)
  // Frame 3: Right leg forward, bob down (y-offset: 1)
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const cy = 2 + bob;

  // 1. Hair & Head Outline
  pRect(ctx, 8, cy, 8, 2, hair);
  pRect(ctx, 7, cy + 1, 10, 4, hair);
  p(ctx, 6, cy + 3, hair);
  p(ctx, 17, cy + 3, hair);

  // 2. Face
  pRect(ctx, 7, cy + 4, 10, 5, skin.base);
  pRect(ctx, 7, cy + 4, 10, 1, skin.light);
  // Glasses & Eyes
  if (!white) {
    pRect(ctx, 8, cy + 5, 3, 2, '#0f172a');
    pRect(ctx, 13, cy + 5, 3, 2, '#0f172a');
    p(ctx, 9, cy + 5, '#38bdf8'); // Glasses reflection
    p(ctx, 14, cy + 5, '#38bdf8');
    p(ctx, 11, cy + 5, '#0f172a'); // Bridge
    p(ctx, 10, cy + 7, skin.dark); // Mouth/tired line
  }

  // 3. Torso (Suit Jacket, Shirt, Red Tie)
  const ty = cy + 9;
  pRect(ctx, 6, ty, 12, 6, suit.base);
  pRect(ctx, 6, ty, 2, 6, suit.dark); // Left shoulder shadow
  pRect(ctx, 16, ty, 2, 6, suit.dark); // Right shoulder shadow
  pRect(ctx, 10, ty, 4, 4, shirt); // White shirt V-neck
  pRect(ctx, 11, ty + 1, 2, 4, tie.base); // Red tie
  p(ctx, 11, ty + 1, tie.light);

  // 4. Arms (Swinging during walk)
  if (frame === 1) {
    // Left arm forward, right arm back
    pRect(ctx, 4, ty + 1, 2, 4, suit.light); // Left arm forward
    pRect(ctx, 4, ty + 5, 2, 2, skin.base); // Hand
    pRect(ctx, 17, ty + 2, 2, 3, suit.dark); // Right arm back
    pRect(ctx, 17, ty + 5, 2, 2, skin.base);
  } else if (frame === 3) {
    // Left arm back, right arm forward
    pRect(ctx, 5, ty + 2, 2, 3, suit.dark);
    pRect(ctx, 5, ty + 5, 2, 2, skin.base);
    pRect(ctx, 18, ty + 1, 2, 4, suit.light);
    pRect(ctx, 18, ty + 5, 2, 2, skin.base);
  } else {
    // Neutral arms at sides
    pRect(ctx, 5, ty + 1, 2, 5, suit.base);
    pRect(ctx, 5, ty + 6, 2, 2, skin.base);
    pRect(ctx, 17, ty + 1, 2, 5, suit.base);
    pRect(ctx, 17, ty + 6, 2, 2, skin.base);
  }

  // 5. Briefcase in one hand
  if (!white) {
    const by = ty + (frame === 3 ? 3 : 5);
    pRect(ctx, 19, by, 3, 4, '#78350f');
    pRect(ctx, 19, by, 3, 1, '#f59e0b'); // Gold brass buckle
  }

  // 6. Legs & Feet
  const ly = ty + 6;
  if (frame === 0 || frame === 2) {
    // Standing neutral
    pRect(ctx, 8, ly, 3, 4, suit.dark);
    pRect(ctx, 13, ly, 3, 4, suit.dark);
    pRect(ctx, 7, ly + 4, 4, 2, shoes);
    pRect(ctx, 13, ly + 4, 4, 2, shoes);
  } else if (frame === 1) {
    // Left stride forward, right back
    pRect(ctx, 6, ly, 3, 3, suit.dark);
    pRect(ctx, 5, ly + 3, 4, 2, shoes);
    pRect(ctx, 14, ly, 3, 4, suit.dark);
    pRect(ctx, 15, ly + 3, 4, 2, shoes);
  } else if (frame === 3) {
    // Right stride forward, left back
    pRect(ctx, 8, ly, 3, 4, suit.dark);
    pRect(ctx, 7, ly + 3, 4, 2, shoes);
    pRect(ctx, 15, ly, 3, 3, suit.dark);
    pRect(ctx, 15, ly + 3, 4, 2, shoes);
  }

  return canvas;
}

// =========================================================================
// 2. 11 Animated Enemy Sprites (24x24 and 32x32, 2 frames + flash)
// =========================================================================

function renderEnemyFrame(kind: string, frame: number, white: boolean): HTMLCanvasElement {
  const size = (kind === 'exec' || kind === 'senmu' || kind === 'president' || kind === 'audit') ? 32 : 24;
  const { canvas, ctx } = createCrispCanvas(size, size);
  const mid = size / 2;

  if (white) {
    ctx.fillStyle = '#ffffff';
    // Draw solid silhouette
    ctx.beginPath();
    ctx.arc(mid, mid, mid - 2, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  const f = frame % 2;
  const bob = f === 1 ? 1 : 0;

  switch (kind) {
    case 'mail': {
      // Unread Mail Envelope with red urgency stamp and fluttering wing corners
      const y = 5 + bob;
      pRect(ctx, 3, y, 18, 12, RAMPS.whitePaper.outline);
      pRect(ctx, 4, y + 1, 16, 10, RAMPS.whitePaper.base);
      pRect(ctx, 4, y + 1, 16, 2, RAMPS.whitePaper.light);
      // Envelope flap fold lines
      for (let i = 0; i < 8; i++) {
        p(ctx, 4 + i, y + 2 + Math.floor(i * 0.8), RAMPS.whitePaper.dark);
        p(ctx, 19 - i, y + 2 + Math.floor(i * 0.8), RAMPS.whitePaper.dark);
      }
      // Urgent Red Seal / Exclamation
      pRect(ctx, 10, y + 4, 4, 4, RAMPS.crimson.base);
      pRect(ctx, 11, y + 5, 2, 2, RAMPS.crimson.light);
      // Flutter speed wings
      if (f === 1) {
        p(ctx, 2, y + 1, RAMPS.sapphire.light);
        p(ctx, 21, y + 1, RAMPS.sapphire.light);
      }
      break;
    }

    case 'doc': {
      // Cascading Stack of Document Folders / Manila binders
      const y = 3 + bob;
      // Manila back folder
      pRect(ctx, 4, y + 4, 16, 13, RAMPS.amber.outline);
      pRect(ctx, 5, y + 5, 14, 11, RAMPS.amber.base);
      pRect(ctx, 5, y + 3, 6, 3, RAMPS.amber.light); // Tab
      // White document sheets sticking out
      pRect(ctx, 6, y + 2, 12, 4, RAMPS.whitePaper.base);
      pRect(ctx, 7, y + 3, 8, 1, RAMPS.crimson.base); // Red confidential stamp
      // Binding rings
      p(ctx, 4, y + 6, '#1e293b');
      p(ctx, 4, y + 9, '#1e293b');
      p(ctx, 4, y + 12, '#1e293b');
      break;
    }

    case 'claim': {
      // Screaming Complaint Megaphone with spiky shockwave teeth
      const y = 4 + bob;
      // Megaphone body (Pink / Crimson warning)
      pRect(ctx, 5, y + 3, 5, 8, RAMPS.crimson.dark);
      pRect(ctx, 10, y + 1, 8, 12, RAMPS.crimson.base);
      pRect(ctx, 11, y + 2, 6, 2, RAMPS.crimson.light);
      // Sound cone mouth
      pRect(ctx, 18, y, 2, 14, '#0f172a');
      pRect(ctx, 19, y + 1, 1, 12, RAMPS.gold.light);
      // Handle
      pRect(ctx, 7, y + 11, 2, 5, '#1e293b');
      // Shockwave sparks when shouting
      if (f === 1) {
        p(ctx, 21, y + 2, RAMPS.gold.light);
        p(ctx, 22, y + 7, RAMPS.crimson.light);
        p(ctx, 21, y + 12, RAMPS.gold.light);
      }
      break;
    }

    case 'overtime': {
      // Ominous Midnight Overtime Moon with office window silhouettes
      const y = 3 + bob;
      // Glowing purple/indigo crescent moon
      pRect(ctx, 5, y + 2, 14, 14, RAMPS.purple.outline);
      pRect(ctx, 6, y + 3, 12, 12, RAMPS.purple.base);
      pRect(ctx, 7, y + 4, 10, 4, RAMPS.purple.light);
      // Crescent cutout inside
      pRect(ctx, 11, y + 4, 8, 10, '#0a0e1f');
      // Glowing clock hands
      p(ctx, 9, y + 9, RAMPS.gold.light);
      p(ctx, 9, y + 8, RAMPS.gold.light);
      p(ctx, 10, y + 9, RAMPS.gold.light);
      break;
    }

    case 'nomikai': {
      // Forced Drinking Party Draft Beer Stein with foaming head
      const y = 3 + bob;
      // Glass mug
      pRect(ctx, 6, y + 4, 11, 13, RAMPS.amber.outline);
      pRect(ctx, 7, y + 5, 9, 11, RAMPS.amber.base);
      pRect(ctx, 8, y + 5, 2, 11, RAMPS.amber.light); // Glass highlight
      // Frothy beer foam
      pRect(ctx, 5, y + 1, 13, 5, RAMPS.whitePaper.light);
      pRect(ctx, 6, y, 11, 2, '#ffffff');
      if (f === 1) {
        p(ctx, 4, y + 4, '#ffffff'); // Overflow bubble
        p(ctx, 17, y + 6, '#ffffff');
      }
      // Glass handle
      pRect(ctx, 17, y + 6, 3, 7, RAMPS.amber.outline);
      pRect(ctx, 18, y + 8, 1, 3, '#0a0e1f');
      break;
    }

    case 'bossMid': {
      // Section Chief / Kacho with stern face, graying hair, pointing finger
      const y = 2 + bob;
      // Hair
      pRect(ctx, 7, y, 10, 4, '#475569');
      // Head / Face
      pRect(ctx, 6, y + 3, 12, 8, RAMPS.skin.base);
      // Scowling eyebrows & glasses
      pRect(ctx, 7, y + 5, 4, 2, '#0f172a');
      pRect(ctx, 13, y + 5, 4, 2, '#0f172a');
      p(ctx, 11, y + 5, '#0f172a');
      // Angry mouth
      pRect(ctx, 9, y + 9, 6, 1, RAMPS.crimson.dark);
      // Gray suit jacket & blue tie
      pRect(ctx, 5, y + 11, 14, 9, RAMPS.suitGray.base);
      pRect(ctx, 11, y + 11, 2, 6, RAMPS.suitBlue.base);
      // Pointing arm
      pRect(ctx, 19, y + 10, 4, 3, RAMPS.skin.base);
      break;
    }

    case 'hr': {
      // Personnel / HR specialist with clipboard, strict teal suit
      const y = 3 + bob;
      // Neat bun hair
      pRect(ctx, 8, y, 8, 4, '#332211');
      pRect(ctx, 10, y - 1, 4, 2, '#332211');
      // Face with cat-eye glasses
      pRect(ctx, 7, y + 3, 10, 7, RAMPS.skin.base);
      pRect(ctx, 8, y + 5, 3, 2, '#0f766e');
      pRect(ctx, 13, y + 5, 3, 2, '#0f766e');
      // Teal office blazer
      pRect(ctx, 6, y + 10, 12, 10, RAMPS.teal.base);
      pRect(ctx, 10, y + 10, 4, 4, '#ffffff'); // White inner shirt
      // Clipboard with checklist
      pRect(ctx, 3, y + 9, 4, 7, '#92400e');
      pRect(ctx, 4, y + 10, 2, 5, '#ffffff');
      break;
    }

    case 'audit': {
      // 32x32 Panoptic Internal Audit Eye with scanning golden pupil
      const y = 4 + bob;
      // Eye sclera outer diamond/oval
      pRect(ctx, 4, y + 6, 24, 12, RAMPS.purple.outline);
      pRect(ctx, 6, y + 4, 20, 16, RAMPS.purple.dark);
      pRect(ctx, 8, y + 6, 16, 12, RAMPS.whitePaper.light);
      // Iris & scanning pupil
      const pupilX = f === 1 ? 14 : 16;
      pRect(ctx, pupilX - 3, y + 8, 8, 8, RAMPS.crimson.dark);
      pRect(ctx, pupilX - 1, y + 10, 4, 4, RAMPS.gold.light);
      p(ctx, pupilX, y + 11, '#ffffff');
      // Mechanical audit antennas
      pRect(ctx, 15, y, 2, 4, RAMPS.purple.light);
      pRect(ctx, 15, y + 20, 2, 4, RAMPS.purple.light);
      break;
    }

    case 'exec': {
      // 32x32 Executive / Demon Director in sharp black suit with red demon horns
      const y = 3 + bob;
      // Demon horns
      pRect(ctx, 7, y, 3, 5, RAMPS.crimson.base);
      pRect(ctx, 22, y, 3, 5, RAMPS.crimson.base);
      // Slicked dark hair
      pRect(ctx, 10, y + 2, 12, 6, '#0f172a');
      // Face
      pRect(ctx, 9, y + 6, 14, 9, RAMPS.skin.dark);
      // Glowing evil red eyes
      pRect(ctx, 11, y + 9, 3, 2, RAMPS.crimson.light);
      pRect(ctx, 18, y + 9, 3, 2, RAMPS.crimson.light);
      // Sharp fanged grin
      pRect(ctx, 13, y + 13, 6, 1, '#ffffff');
      // Black double-breasted executive suit
      pRect(ctx, 7, y + 15, 18, 13, RAMPS.suitDark.base);
      pRect(ctx, 14, y + 15, 4, 8, RAMPS.crimson.base); // Red power tie
      pRect(ctx, 11, y + 19, 2, 2, RAMPS.gold.light); // Gold executive cufflinks
      pRect(ctx, 19, y + 19, 2, 2, RAMPS.gold.light);
      break;
    }

    case 'senmu': {
      // 32x32 Senior Managing Director (専務) with fierce crimson Ogre Mask
      const y = 3 + bob;
      // Wild flame mane hair
      pRect(ctx, 6, y, 20, 6, '#991b1b');
      pRect(ctx, 4, y + 4, 24, 6, '#b91c1c');
      // Ogre face mask
      pRect(ctx, 8, y + 6, 16, 12, RAMPS.crimson.base);
      // Gold horns
      pRect(ctx, 10, y + 1, 3, 5, RAMPS.gold.base);
      pRect(ctx, 19, y + 1, 3, 5, RAMPS.gold.base);
      // Fierce golden glare eyes
      pRect(ctx, 10, y + 10, 4, 3, RAMPS.gold.light);
      pRect(ctx, 18, y + 10, 4, 3, RAMPS.gold.light);
      p(ctx, 11, y + 11, '#000000');
      p(ctx, 19, y + 11, '#000000');
      // Sharp tusks
      pRect(ctx, 10, y + 15, 2, 3, '#ffffff');
      pRect(ctx, 20, y + 15, 2, 3, '#ffffff');
      // Imposing dark robe / haori
      pRect(ctx, 6, y + 18, 20, 10, '#1c1917');
      pRect(ctx, 14, y + 18, 4, 10, RAMPS.gold.base);
      break;
    }

    case 'president': {
      // 32x32 CEO / President with Golden Imperial Crown & Royal Corporate Robe
      const y = 2 + bob;
      // Grand Golden Crown with 3 spires and embedded jewels
      pRect(ctx, 8, y, 16, 6, RAMPS.gold.base);
      p(ctx, 9, y - 1, RAMPS.gold.light);
      p(ctx, 15, y - 2, RAMPS.gold.light);
      p(ctx, 16, y - 2, RAMPS.gold.light);
      p(ctx, 22, y - 1, RAMPS.gold.light);
      p(ctx, 12, y + 2, RAMPS.ruby.base); // Red jewel
      p(ctx, 19, y + 2, RAMPS.sapphire.base); // Blue jewel
      // Dignified face with groomed silver beard
      pRect(ctx, 9, y + 6, 14, 9, RAMPS.skin.base);
      pRect(ctx, 11, y + 8, 3, 2, '#0f172a');
      pRect(ctx, 18, y + 8, 3, 2, '#0f172a');
      pRect(ctx, 9, y + 12, 14, 4, '#e2e8f0'); // Silver beard
      // Royal Crimson & Gold Corporate Robe
      pRect(ctx, 5, y + 15, 22, 14, RAMPS.crimson.base);
      pRect(ctx, 5, y + 15, 4, 14, RAMPS.gold.base); // Gold left trim
      pRect(ctx, 23, y + 15, 4, 14, RAMPS.gold.base); // Gold right trim
      pRect(ctx, 14, y + 15, 4, 14, '#ffffff'); // White silk cravat
      // Aura glimmer in frame 1
      if (f === 1) {
        p(ctx, 3, y + 5, RAMPS.gold.light);
        p(ctx, 28, y + 5, RAMPS.gold.light);
        p(ctx, 2, y + 16, RAMPS.gold.light);
        p(ctx, 29, y + 16, RAMPS.gold.light);
      }
      break;
    }

    default: {
      // Safe fallback box
      pRect(ctx, 4, 4, 16, 16, '#64748b');
      pRect(ctx, 6, 6, 12, 12, '#94a3b8');
      break;
    }
  }

  return canvas;
}

// =========================================================================
// 3. Faceted Diamond XP Gems (16x16)
// =========================================================================

function renderFacetedGem(tier: 'green' | 'blue' | 'red' | 'gold'): HTMLCanvasElement {
  const { canvas, ctx } = createCrispCanvas(16, 16);
  const ramp = tier === 'green' ? RAMPS.emerald :
               tier === 'blue' ? RAMPS.sapphire :
               tier === 'red' ? RAMPS.ruby : RAMPS.gold;

  // Diamond octagon shape
  // Top flat surface / table
  pRect(ctx, 5, 2, 6, 2, ramp.extra ?? ramp.light);
  // Upper crown facets
  pRect(ctx, 3, 4, 10, 3, ramp.light);
  p(ctx, 2, 5, ramp.light);
  p(ctx, 13, 5, ramp.light);
  // Girdle (widest edge)
  pRect(ctx, 2, 7, 12, 2, ramp.base);
  // Lower pavilion facets
  pRect(ctx, 3, 9, 10, 2, ramp.dark);
  pRect(ctx, 4, 11, 8, 2, ramp.dark);
  pRect(ctx, 6, 13, 4, 1, ramp.outline);
  p(ctx, 7, 14, ramp.outline);
  p(ctx, 8, 14, ramp.outline);

  // Sparkle highlight glint
  p(ctx, 6, 3, '#ffffff');
  p(ctx, 7, 3, '#ffffff');
  p(ctx, 5, 5, '#ffffff');

  return canvas;
}

// =========================================================================
// 4. Pixel Chests & Pickups (24x24)
// =========================================================================

function renderPickupSprite(kind: string): HTMLCanvasElement {
  const { canvas, ctx } = createCrispCanvas(24, 24);

  switch (kind) {
    case 'chest': {
      // 16-bit corporate wooden chest with gold bands & brass lock
      pRect(ctx, 3, 5, 18, 14, '#451a03'); // Dark outline
      pRect(ctx, 4, 6, 16, 5, '#92400e'); // Lid base
      pRect(ctx, 4, 6, 16, 1, '#d97706'); // Lid top rim
      pRect(ctx, 4, 11, 16, 7, '#78350f'); // Chest body
      // Golden reinforcement bands
      pRect(ctx, 6, 6, 2, 12, RAMPS.gold.light);
      pRect(ctx, 16, 6, 2, 12, RAMPS.gold.light);
      // Golden keyhole / clasp
      pRect(ctx, 10, 10, 4, 4, RAMPS.gold.light);
      pRect(ctx, 11, 12, 2, 2, '#000000');
      break;
    }

    case 'heal': {
      // Deluxe corporate bento box / first aid
      pRect(ctx, 4, 5, 16, 14, '#1e293b');
      pRect(ctx, 5, 6, 14, 12, '#ffffff');
      // Green healing cross
      pRect(ctx, 10, 8, 4, 8, RAMPS.emerald.base);
      pRect(ctx, 8, 10, 8, 4, RAMPS.emerald.base);
      pRect(ctx, 11, 9, 2, 6, RAMPS.emerald.light);
      pRect(ctx, 9, 11, 6, 2, RAMPS.emerald.light);
      break;
    }

    case 'magnet': {
      // Red and silver horseshoe magnet with magnetic sparks
      pRect(ctx, 4, 4, 16, 16, '#0f172a');
      pRect(ctx, 5, 5, 5, 12, RAMPS.crimson.base); // Left prong
      pRect(ctx, 14, 5, 5, 12, RAMPS.crimson.base); // Right prong
      pRect(ctx, 7, 13, 10, 5, RAMPS.crimson.base); // Bottom arch
      pRect(ctx, 9, 5, 6, 8, '#00000000'); // Transparent center
      // Silver poles
      pRect(ctx, 5, 5, 5, 4, RAMPS.whitePaper.light);
      pRect(ctx, 14, 5, 5, 4, RAMPS.whitePaper.light);
      // Spark lines
      p(ctx, 7, 2, '#38bdf8');
      p(ctx, 16, 2, '#38bdf8');
      break;
    }

    case 'bomb': {
      // High-voltage energy drink canister with sparking fuse
      pRect(ctx, 7, 7, 10, 14, RAMPS.toxicGreen.outline);
      pRect(ctx, 8, 8, 8, 12, RAMPS.toxicGreen.base);
      pRect(ctx, 9, 8, 2, 12, RAMPS.toxicGreen.light);
      // Black thunderbolt logo
      p(ctx, 12, 10, '#000000');
      p(ctx, 11, 11, '#000000');
      p(ctx, 12, 12, '#000000');
      p(ctx, 13, 13, '#000000');
      p(ctx, 12, 14, '#000000');
      // Silver pull tab & sparking fuse
      pRect(ctx, 10, 5, 4, 3, RAMPS.whitePaper.light);
      p(ctx, 13, 3, '#f59e0b');
      p(ctx, 14, 2, '#ef4444');
      break;
    }

    case 'coin': {
      // Gleaming gold corporate coin
      pRect(ctx, 4, 4, 16, 16, RAMPS.gold.outline);
      pRect(ctx, 5, 5, 14, 14, RAMPS.gold.base);
      pRect(ctx, 6, 6, 12, 12, RAMPS.gold.light);
      pRect(ctx, 9, 8, 6, 8, RAMPS.gold.dark);
      // Yen symbol '¥'
      p(ctx, 10, 9, RAMPS.gold.light);
      p(ctx, 13, 9, RAMPS.gold.light);
      pRect(ctx, 11, 10, 2, 5, RAMPS.gold.light);
      pRect(ctx, 10, 12, 4, 1, RAMPS.gold.light);
      break;
    }
  }

  return canvas;
}

// =========================================================================
// 5. Weapon & Passive Icons (24x24)
// =========================================================================

function renderWeaponOrPassiveIcon(id: string): HTMLCanvasElement {
  const { canvas, ctx } = createCrispCanvas(24, 24);

  switch (id) {
    // Base Weapons
    case 'shuriken': {
      // 4-Point Origami Paper Shuriken
      pRect(ctx, 10, 2, 4, 20, RAMPS.whitePaper.base);
      pRect(ctx, 2, 10, 20, 4, RAMPS.whitePaper.base);
      pRect(ctx, 8, 8, 8, 8, RAMPS.whitePaper.light);
      p(ctx, 11, 3, '#38bdf8');
      p(ctx, 20, 11, '#38bdf8');
      p(ctx, 11, 20, '#38bdf8');
      p(ctx, 3, 11, '#38bdf8');
      break;
    }

    case 'coffee': {
      // Steaming Hot Ceramic Coffee Mug with espresso swirl
      pRect(ctx, 5, 7, 12, 13, RAMPS.whitePaper.outline);
      pRect(ctx, 6, 8, 10, 11, '#f8fafc');
      pRect(ctx, 7, 9, 8, 3, RAMPS.coffeeBrown.base);
      pRect(ctx, 16, 10, 4, 7, RAMPS.whitePaper.outline);
      pRect(ctx, 17, 11, 2, 5, '#0a0e1f');
      // Steam
      p(ctx, 8, 4, '#94a3b8');
      p(ctx, 9, 3, '#94a3b8');
      p(ctx, 12, 4, '#94a3b8');
      p(ctx, 13, 3, '#94a3b8');
      break;
    }

    case 'barrier': {
      // Neon Sticky Note Post-It Pad with ToDo checks
      pRect(ctx, 4, 4, 16, 16, RAMPS.postItYellow.outline);
      pRect(ctx, 5, 5, 14, 14, RAMPS.postItYellow.base);
      pRect(ctx, 5, 5, 14, 3, RAMPS.postItYellow.light);
      pRect(ctx, 7, 9, 3, 1, '#1e293b');
      pRect(ctx, 7, 12, 3, 1, '#1e293b');
      pRect(ctx, 7, 15, 3, 1, '#1e293b');
      pRect(ctx, 11, 9, 6, 1, '#64748b');
      pRect(ctx, 11, 12, 6, 1, '#64748b');
      pRect(ctx, 11, 15, 6, 1, '#64748b');
      break;
    }

    case 'boomerang': {
      // Gilded Executive Business Card
      pRect(ctx, 3, 6, 18, 12, RAMPS.gold.outline);
      pRect(ctx, 4, 7, 16, 10, '#ffffff');
      pRect(ctx, 4, 7, 16, 1, RAMPS.gold.light); // Gold foil border
      pRect(ctx, 6, 9, 4, 4, RAMPS.suitBlue.base); // Company logo
      pRect(ctx, 11, 10, 7, 1, '#0f172a'); // Name
      pRect(ctx, 11, 13, 5, 1, '#64748b'); // Title
      break;
    }

    case 'bomb': {
      // Energy Drink Bomb Canister
      pRect(ctx, 7, 6, 10, 15, RAMPS.toxicGreen.outline);
      pRect(ctx, 8, 7, 8, 13, RAMPS.toxicGreen.base);
      pRect(ctx, 9, 7, 2, 13, RAMPS.toxicGreen.light);
      pRect(ctx, 10, 4, 4, 3, RAMPS.whitePaper.light);
      p(ctx, 14, 3, '#ef4444');
      break;
    }

    case 'hanko': {
      // Red Vermilion Hanko Seal Stamp
      pRect(ctx, 8, 3, 8, 12, '#92400e'); // Wooden body
      pRect(ctx, 9, 4, 6, 10, '#b45309');
      pRect(ctx, 10, 4, 2, 10, '#fde68a'); // Highlight
      pRect(ctx, 7, 15, 10, 6, RAMPS.crimson.outline); // Stamp face
      pRect(ctx, 8, 16, 8, 4, RAMPS.crimson.base);
      pRect(ctx, 10, 17, 4, 2, RAMPS.crimson.light); // Carved kanji
      break;
    }

    case 'phone': {
      // Retro Red Office Telephone Handset
      pRect(ctx, 4, 8, 16, 9, RAMPS.crimson.outline);
      pRect(ctx, 5, 9, 14, 7, RAMPS.crimson.base);
      pRect(ctx, 6, 9, 12, 2, RAMPS.crimson.light);
      pRect(ctx, 4, 7, 4, 4, RAMPS.crimson.dark); // Earpiece
      pRect(ctx, 16, 7, 4, 4, RAMPS.crimson.dark); // Mouthpiece
      // Coiled wire
      p(ctx, 12, 17, '#000000');
      p(ctx, 13, 18, '#000000');
      p(ctx, 11, 19, '#000000');
      break;
    }

    case 'bell': {
      // Golden 18:00 Service Bell
      pRect(ctx, 5, 10, 14, 8, RAMPS.gold.outline);
      pRect(ctx, 6, 11, 12, 6, RAMPS.gold.base);
      pRect(ctx, 7, 11, 10, 2, RAMPS.gold.light);
      pRect(ctx, 11, 6, 2, 5, RAMPS.gold.light); // Plunger
      pRect(ctx, 10, 5, 4, 2, RAMPS.gold.light); // Top button
      pRect(ctx, 3, 18, 18, 3, '#1e293b'); // Dark stand
      break;
    }

    // 8 Evolved Weapons
    case 'contract_storm': {
      // Contract Storm: Glowing dark & gold spiraling razor contract
      pRect(ctx, 3, 3, 18, 18, RAMPS.purple.outline);
      pRect(ctx, 4, 4, 16, 16, '#0f172a');
      pRect(ctx, 5, 5, 14, 14, RAMPS.crimson.base);
      pRect(ctx, 7, 7, 10, 10, RAMPS.gold.light);
      // Razor cross blades
      pRect(ctx, 11, 1, 2, 22, '#ffffff');
      pRect(ctx, 1, 11, 22, 2, '#ffffff');
      break;
    }

    case 'caffeine_geyser': {
      // Caffeine Geyser: Twin roaring espresso flame jets
      pRect(ctx, 6, 8, 12, 13, RAMPS.coffeeBrown.outline);
      pRect(ctx, 7, 9, 10, 11, RAMPS.coffeeBrown.base);
      // Searing fire spout
      pRect(ctx, 8, 2, 8, 7, RAMPS.gold.light);
      pRect(ctx, 9, 3, 6, 5, RAMPS.crimson.light);
      pRect(ctx, 11, 4, 2, 3, '#ffffff');
      break;
    }

    case 'kanban_barrier': {
      // Kanban Barrier: Grand glowing task matrix shield
      pRect(ctx, 2, 2, 20, 20, RAMPS.teal.outline);
      pRect(ctx, 3, 3, 18, 18, RAMPS.teal.dark);
      pRect(ctx, 4, 4, 16, 16, RAMPS.teal.base);
      pRect(ctx, 6, 6, 4, 4, RAMPS.postItYellow.base);
      pRect(ctx, 14, 6, 4, 4, RAMPS.emerald.base);
      pRect(ctx, 6, 14, 4, 4, RAMPS.sapphire.base);
      pRect(ctx, 14, 14, 4, 4, RAMPS.crimson.base);
      break;
    }

    case 'gold_exchange': {
      // Gold VIP Exchange: Solid gold executive card radiating light
      pRect(ctx, 2, 4, 20, 16, RAMPS.gold.outline);
      pRect(ctx, 3, 5, 18, 14, RAMPS.gold.base);
      pRect(ctx, 4, 6, 16, 12, RAMPS.gold.light);
      pRect(ctx, 6, 8, 6, 5, '#ffffff');
      pRect(ctx, 14, 9, 4, 4, RAMPS.ruby.base);
      break;
    }

    case 'taurine_supernova': {
      // Taurine Supernova: Glowing neon energy flask / supernova vortex
      pRect(ctx, 5, 5, 14, 15, RAMPS.toxicGreen.outline);
      pRect(ctx, 6, 6, 12, 13, RAMPS.toxicGreen.base);
      pRect(ctx, 8, 8, 8, 9, RAMPS.toxicGreen.light);
      pRect(ctx, 10, 2, 4, 4, RAMPS.sapphire.light);
      // Radioactivity / biohazard center
      pRect(ctx, 10, 11, 4, 4, '#000000');
      p(ctx, 11, 12, RAMPS.gold.light);
      break;
    }

    case 'emergency_hotline': {
      // Emergency Hotline: Red hotline phone enveloped in lightning
      pRect(ctx, 4, 7, 16, 11, RAMPS.crimson.base);
      pRect(ctx, 5, 8, 14, 9, RAMPS.crimson.light);
      // Yellow lightning bolt crossing phone
      p(ctx, 13, 2, RAMPS.gold.light);
      p(ctx, 12, 5, RAMPS.gold.light);
      p(ctx, 11, 8, '#ffffff');
      p(ctx, 13, 11, '#ffffff');
      p(ctx, 10, 14, RAMPS.gold.light);
      p(ctx, 9, 18, RAMPS.gold.light);
      break;
    }

    case 'imperial_seal': {
      // Imperial CEO Seal: Massive royal gold and crimson seal
      pRect(ctx, 3, 2, 18, 14, RAMPS.gold.outline);
      pRect(ctx, 4, 3, 16, 12, RAMPS.gold.base);
      pRect(ctx, 5, 4, 14, 10, RAMPS.gold.light);
      pRect(ctx, 2, 16, 20, 6, RAMPS.crimson.outline);
      pRect(ctx, 3, 17, 18, 4, RAMPS.crimson.base);
      pRect(ctx, 7, 18, 10, 2, '#ffffff'); // Imperial crest
      break;
    }

    case 'grand_chime': {
      // Grand 18:00 Chime: Tower bell with cyan time freeze resonance rings
      pRect(ctx, 5, 7, 14, 12, RAMPS.gold.outline);
      pRect(ctx, 6, 8, 12, 10, RAMPS.gold.light);
      pRect(ctx, 11, 3, 2, 5, RAMPS.gold.light);
      // Resonance wave arcs
      pRect(ctx, 2, 4, 2, 8, RAMPS.sapphire.light);
      pRect(ctx, 20, 4, 2, 8, RAMPS.sapphire.light);
      p(ctx, 11, 13, '#000000'); // Clapper
      break;
    }

    // 6 Passives
    case 'power': {
      // Bundle of Japanese Yen banknotes (残業代)
      pRect(ctx, 3, 6, 18, 12, '#14532d');
      pRect(ctx, 4, 7, 16, 10, '#86efac');
      pRect(ctx, 9, 9, 6, 6, '#15803d');
      p(ctx, 11, 11, '#ffffff');
      p(ctx, 12, 11, '#ffffff');
      break;
    }

    case 'shoes': {
      // Winged office dress shoe (走れる革靴)
      pRect(ctx, 3, 10, 18, 8, '#0f172a');
      pRect(ctx, 4, 11, 16, 6, '#334155');
      pRect(ctx, 5, 11, 8, 2, '#64748b');
      // Wing feather
      p(ctx, 6, 6, '#38bdf8');
      p(ctx, 7, 7, '#38bdf8');
      p(ctx, 8, 8, '#38bdf8');
      break;
    }

    case 'magnet': {
      // Commuter Train Pass (定期券)
      pRect(ctx, 4, 5, 16, 14, '#065f46');
      pRect(ctx, 5, 6, 14, 12, '#34d399');
      pRect(ctx, 5, 9, 14, 3, '#10b981');
      pRect(ctx, 7, 14, 4, 2, '#047857'); // IC Chip
      break;
    }

    case 'care': {
      // Medical Health Checkup Report with red 'A' (健康診断A判定)
      pRect(ctx, 4, 3, 16, 18, RAMPS.whitePaper.outline);
      pRect(ctx, 5, 4, 14, 16, RAMPS.whitePaper.base);
      pRect(ctx, 11, 8, 6, 8, RAMPS.crimson.base);
      pRect(ctx, 12, 9, 4, 6, RAMPS.whitePaper.base);
      pRect(ctx, 12, 12, 4, 1, RAMPS.crimson.base);
      break;
    }

    case 'lunch': {
      // Deluxe Cafeteria Bento Lunch Box (社食大盛り)
      pRect(ctx, 3, 5, 18, 14, '#1e293b');
      pRect(ctx, 4, 6, 16, 12, '#ffffff');
      pRect(ctx, 5, 7, 6, 4, RAMPS.crimson.base); // Pickled plum onigiri
      pRect(ctx, 13, 7, 6, 4, '#b45309'); // Fried chicken
      pRect(ctx, 5, 13, 14, 4, '#15803d'); // Greens
      break;
    }

    case 'watch': {
      // Smartwatch with digital screen (スマウォ)
      pRect(ctx, 9, 2, 6, 20, '#1e293b'); // Black strap
      pRect(ctx, 6, 6, 12, 12, '#0f172a'); // Watch face outline
      pRect(ctx, 7, 7, 10, 10, '#0284c7'); // Glowing digital screen
      pRect(ctx, 9, 11, 6, 2, '#ffffff'); // Time digits
      break;
    }

    // UI Icons
    case 'icon_clock': {
      pRect(ctx, 4, 4, 16, 16, '#0f172a');
      pRect(ctx, 5, 5, 14, 14, '#f8fafc');
      pRect(ctx, 11, 8, 2, 5, '#0f172a');
      pRect(ctx, 11, 11, 4, 2, '#ef4444');
      break;
    }

    case 'icon_heart': {
      pRect(ctx, 4, 6, 7, 6, RAMPS.crimson.base);
      pRect(ctx, 13, 6, 7, 6, RAMPS.crimson.base);
      pRect(ctx, 5, 4, 5, 3, RAMPS.crimson.base);
      pRect(ctx, 14, 4, 5, 3, RAMPS.crimson.base);
      pRect(ctx, 5, 12, 14, 4, RAMPS.crimson.base);
      pRect(ctx, 8, 16, 8, 3, RAMPS.crimson.base);
      pRect(ctx, 10, 19, 4, 2, RAMPS.crimson.base);
      p(ctx, 6, 6, RAMPS.crimson.light);
      p(ctx, 7, 6, '#ffffff');
      break;
    }

    case 'icon_sword': {
      pRect(ctx, 18, 3, 3, 3, RAMPS.whitePaper.light);
      for (let i = 0; i < 10; i++) {
        pRect(ctx, 17 - i, 4 + i, 2, 2, RAMPS.whitePaper.base);
      }
      pRect(ctx, 6, 14, 4, 4, RAMPS.gold.base);
      pRect(ctx, 3, 17, 4, 4, '#78350f');
      break;
    }

    case 'icon_dash': {
      pRect(ctx, 3, 8, 14, 8, RAMPS.sapphire.light);
      pRect(ctx, 7, 5, 14, 8, RAMPS.sapphire.base);
      pRect(ctx, 1, 10, 5, 2, '#ffffff');
      pRect(ctx, 2, 13, 4, 2, '#ffffff');
      break;
    }

    case 'icon_skull': {
      pRect(ctx, 6, 4, 12, 10, RAMPS.whitePaper.light);
      pRect(ctx, 8, 14, 8, 4, RAMPS.whitePaper.base);
      pRect(ctx, 8, 8, 3, 3, '#0f172a');
      pRect(ctx, 13, 8, 3, 3, '#0f172a');
      p(ctx, 10, 15, '#0f172a');
      p(ctx, 13, 15, '#0f172a');
      break;
    }

    case 'icon_trophy': {
      pRect(ctx, 6, 4, 12, 8, RAMPS.gold.light);
      pRect(ctx, 8, 12, 8, 3, RAMPS.gold.base);
      pRect(ctx, 10, 15, 4, 4, RAMPS.gold.base);
      pRect(ctx, 7, 19, 10, 3, RAMPS.gold.dark);
      pRect(ctx, 3, 5, 3, 5, RAMPS.gold.light);
      pRect(ctx, 18, 5, 3, 5, RAMPS.gold.light);
      break;
    }

    case 'icon_book': {
      pRect(ctx, 4, 4, 16, 16, '#0f172a');
      pRect(ctx, 5, 5, 14, 14, '#3b82f6');
      pRect(ctx, 11, 5, 2, 14, '#1e3a8a');
      pRect(ctx, 6, 7, 4, 2, '#ffffff');
      pRect(ctx, 14, 7, 4, 2, '#ffffff');
      break;
    }

    case 'icon_calendar': {
      pRect(ctx, 4, 4, 16, 16, '#0f172a');
      pRect(ctx, 5, 5, 14, 4, '#ef4444');
      pRect(ctx, 5, 9, 14, 10, '#ffffff');
      pRect(ctx, 7, 2, 2, 4, '#475569');
      pRect(ctx, 15, 2, 2, 4, '#475569');
      pRect(ctx, 8, 12, 8, 4, '#0f172a');
      break;
    }

    case 'icon_power': {
      pRect(ctx, 4, 6, 16, 12, '#065f46');
      pRect(ctx, 6, 8, 12, 8, '#34d399');
      p(ctx, 11, 10, '#ffffff');
      p(ctx, 12, 11, '#ffffff');
      break;
    }

    case 'icon_building': {
      pRect(ctx, 6, 3, 12, 18, '#1e293b');
      pRect(ctx, 7, 4, 10, 16, '#334155');
      for (let r = 0; r < 4; r++) {
        pRect(ctx, 8, 6 + r * 3, 2, 2, '#fde047');
        pRect(ctx, 14, 6 + r * 3, 2, 2, '#fde047');
      }
      break;
    }

    case 'icon_plant': {
      pRect(ctx, 8, 14, 8, 6, '#78350f');
      pRect(ctx, 7, 13, 10, 2, '#92400e');
      pRect(ctx, 11, 8, 2, 6, '#15803d');
      pRect(ctx, 7, 6, 4, 3, '#22c55e');
      pRect(ctx, 13, 5, 4, 3, '#4ade80');
      pRect(ctx, 10, 3, 4, 3, '#86efac');
      break;
    }

    case 'icon_level_up': {
      pRect(ctx, 10, 3, 4, 18, '#06b6d4');
      pRect(ctx, 7, 7, 10, 2, '#06b6d4');
      pRect(ctx, 8, 5, 8, 2, '#22d3ee');
      pRect(ctx, 10, 3, 4, 2, '#ffffff');
      break;
    }

    default: {
      pRect(ctx, 4, 4, 16, 16, '#475569');
      pRect(ctx, 6, 6, 12, 12, '#94a3b8');
      break;
    }
  }

  return canvas;
}

// =========================================================================
// Public API
// =========================================================================

/**
 * Returns a cached HTMLCanvasElement sprite.
 * Handles player, enemies, gems, pickups, weapons, and UI icons.
 * Non-existent names return a safe placeholder sprite (F-SURV-01.B1).
 */
export function getPixelSprite(name: string, frame = 0, flip = false): HTMLCanvasElement {
  const safeFrame = Number.isFinite(frame) ? Math.max(0, Math.floor(frame)) : 0;
  const key = `${name}#f${safeFrame}#flip${flip ? '1' : '0'}`;

  let cached = spriteCache.get(key);
  if (cached) {
    return cached;
  }

  let sourceCanvas: HTMLCanvasElement;

  if (name.startsWith('player')) {
    // 4-frame walk cycle [0, 1, 2, 3]
    const walkFrame = safeFrame % 4;
    sourceCanvas = renderSalarymanFrame(walkFrame, false);
  } else if (name === 'player_white') {
    const walkFrame = safeFrame % 4;
    sourceCanvas = renderSalarymanFrame(walkFrame, true);
  } else if (name.startsWith('gem_')) {
    const tier = name.replace('gem_', '') as 'green' | 'blue' | 'red' | 'gold';
    sourceCanvas = renderFacetedGem(tier);
  } else if (['chest', 'heal', 'magnet', 'bomb', 'coin'].includes(name)) {
    sourceCanvas = renderPickupSprite(name);
  } else if (
    ['mail', 'doc', 'claim', 'overtime', 'nomikai', 'bossMid', 'hr', 'audit', 'exec', 'senmu', 'president'].includes(name)
  ) {
    sourceCanvas = renderEnemyFrame(name, safeFrame, false);
  } else if (name.endsWith('_white')) {
    const enemyKind = name.replace('_white', '');
    sourceCanvas = renderEnemyFrame(enemyKind, safeFrame, true);
  } else {
    // Weapon, passive, or UI icon
    sourceCanvas = renderWeaponOrPassiveIcon(name);
  }

  // Handle horizontal flipping if requested
  if (flip) {
    const { canvas: flippedCanvas, ctx } = createCrispCanvas(sourceCanvas.width, sourceCanvas.height);
    ctx.translate(sourceCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sourceCanvas, 0, 0);
    spriteCache.set(key, flippedCanvas);
    return flippedCanvas;
  }

  spriteCache.set(key, sourceCanvas);
  return sourceCanvas;
}

/**
 * Directly blits a pixel sprite/icon to a 2D canvas context centered at (x, y) with target size.
 */
export function renderPixelIcon(
  ctx: CanvasRenderingContext2D,
  iconName: string,
  x: number,
  y: number,
  size: number
): void {
  const sprite = getPixelSprite(iconName, 0, false);
  const targetSize = Math.max(1, Math.round(size));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sprite,
    Math.round(x - targetSize / 2),
    Math.round(y - targetSize / 2),
    targetSize,
    targetSize
  );
  ctx.restore();
}

/**
 * Returns a crisp base64 Data URL for use in React <img> tags, zero network latency.
 */
const dataUrlCache = new Map<string, string>();
export function getPixelIconDataUrl(name: string, size = 24): string {
  const key = `${name}@${size}`;
  const existing = dataUrlCache.get(key);
  if (existing) return existing;

  const sprite = getPixelSprite(name, 0, false);
  let url = '';
  if (typeof sprite.toDataURL === 'function') {
    if (sprite.width === size && sprite.height === size) {
      url = sprite.toDataURL();
    } else {
      const { canvas, ctx } = createCrispCanvas(size, size);
      ctx.drawImage(sprite, 0, 0, size, size);
      url = canvas.toDataURL();
    }
  }
  dataUrlCache.set(key, url);
  return url;
}

/**
 * Clears offscreen sprite buffers.
 */
export function clearPixelSpriteCache(): void {
  spriteCache.clear();
  dataUrlCache.clear();
}
