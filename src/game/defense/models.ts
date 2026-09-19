/**
 * Procedural 3D Meshes & Materials for Barricade Defense (Zero Emojis!)
 * All assets generated procedurally via Three.js geometries and procedural canvas textures.
 */

import * as THREE from 'three';
import type { WeaponId, BarrelKind } from './config';

/* =========================================================================
   Cache & Shared Geometries/Materials
   ========================================================================= */

const geoBox = new THREE.BoxGeometry(1, 1, 1);
const geoSphere = new THREE.SphereGeometry(0.5, 12, 10);
const geoCylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const geoShadow = new THREE.CircleGeometry(0.55, 16);
const matShadow = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.32,
  depthWrite: false,
});

/** Procedural blob shadow under meshes */
export function buildBlobShadow(scale = 1): THREE.Mesh {
  const s = new THREE.Mesh(geoShadow, matShadow);
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.03;
  s.scale.setScalar(scale);
  return s;
}

/* =========================================================================
   1. Procedural 3D Salaryman Model (Hero & Squad Allies)
   ========================================================================= */

export interface SalarymanOptions {
  weapon?: string;
  isHero?: boolean;
  scale?: number;
  suitColor?: number;
}

/**
 * Builds a stylish low-poly procedural salaryman character with articulated limbs.
 * Limbs are stored in userData for procedural running animations.
 */
export function buildSalarymanMesh(options?: SalarymanOptions): THREE.Group {
  const isHero = options?.isHero ?? false;
  const s = options?.scale ?? (isHero ? 1.0 : 0.88);
  const suitHex = options?.suitColor ?? (isHero ? 0x1e3a8a : 0x15803d);
  const weaponId = options?.weapon ?? (isHero ? 'pistol' : undefined);

  const root = new THREE.Group();
  root.name = isHero ? 'hero_salaryman' : 'ally_salaryman';

  // Materials
  const suitMat = new THREE.MeshLambertMaterial({ color: suitHex });
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xf6d3b4 });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 });
  const tieMat = new THREE.MeshLambertMaterial({ color: isHero ? 0xdc2626 : 0x059669 });
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

  // 1. Pelvis / Hips
  const hips = new THREE.Group();
  hips.position.y = 0.75 * s;
  root.add(hips);

  // 2. Torso (Suit Jacket)
  const torso = new THREE.Mesh(geoBox, suitMat);
  torso.scale.set(0.68 * s, 0.72 * s, 0.38 * s);
  torso.position.y = 0.36 * s;
  hips.add(torso);

  // Shirt V-neck insert
  const shirt = new THREE.Mesh(geoBox, shirtMat);
  shirt.scale.set(0.22 * s, 0.38 * s, 0.08 * s);
  shirt.position.set(0, 0.44 * s, 0.17 * s);
  hips.add(shirt);

  // Tie
  const tie = new THREE.Mesh(geoBox, tieMat);
  tie.scale.set(0.1 * s, 0.38 * s, 0.06 * s);
  tie.position.set(0, 0.38 * s, 0.2 * s);
  hips.add(tie);

  // 3. Head & Hair
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.85 * s, 0);
  hips.add(headGroup);

  const head = new THREE.Mesh(geoSphere, skinMat);
  head.scale.set(0.44 * s, 0.46 * s, 0.42 * s);
  head.position.y = 0.22 * s;
  headGroup.add(head);

  // Hair
  const hair = new THREE.Mesh(geoBox, hairMat);
  hair.scale.set(0.48 * s, 0.24 * s, 0.46 * s);
  hair.position.set(0, 0.38 * s, -0.02 * s);
  headGroup.add(hair);

  // Hero glasses
  if (isHero) {
    const glassesMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const glasses = new THREE.Mesh(geoBox, glassesMat);
    glasses.scale.set(0.36 * s, 0.08 * s, 0.06 * s);
    glasses.position.set(0, 0.22 * s, 0.22 * s);
    headGroup.add(glasses);
  }

  // 4. Limbs (Pivots for animation)
  // Left Arm
  const leftArm = new THREE.Group();
  leftArm.position.set(0.42 * s, 0.65 * s, 0);
  const leftSleeve = new THREE.Mesh(geoBox, suitMat);
  leftSleeve.scale.set(0.18 * s, 0.58 * s, 0.18 * s);
  leftSleeve.position.y = -0.26 * s;
  leftArm.add(leftSleeve);
  const leftHand = new THREE.Mesh(geoSphere, skinMat);
  leftHand.scale.setScalar(0.14 * s);
  leftHand.position.y = -0.56 * s;
  leftArm.add(leftHand);
  hips.add(leftArm);

  // If hero, carry briefcase in left hand
  if (isHero) {
    const caseMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const bcase = new THREE.Mesh(geoBox, caseMat);
    bcase.scale.set(0.14 * s, 0.32 * s, 0.44 * s);
    bcase.position.set(0.06 * s, -0.6 * s, 0);
    leftArm.add(bcase);
  }

  // Right Arm (Weapon arm)
  const rightArm = new THREE.Group();
  rightArm.position.set(-0.42 * s, 0.65 * s, 0);
  const rightSleeve = new THREE.Mesh(geoBox, suitMat);
  rightSleeve.scale.set(0.18 * s, 0.58 * s, 0.18 * s);
  rightSleeve.position.y = -0.26 * s;
  rightArm.add(rightSleeve);
  const rightHand = new THREE.Mesh(geoSphere, skinMat);
  rightHand.scale.setScalar(0.14 * s);
  rightHand.position.y = -0.56 * s;
  rightArm.add(rightHand);
  hips.add(rightArm);

  // Weapon in right hand
  if (weaponId) {
    const weaponMesh = buildWeaponMesh(weaponId as WeaponId, s);
    weaponMesh.position.set(0, -0.56 * s, 0.25 * s);
    rightArm.add(weaponMesh);
    root.userData.weaponMesh = weaponMesh;
  }

  // Left Leg
  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.2 * s, 0, 0);
  const leftPants = new THREE.Mesh(geoBox, suitMat);
  leftPants.scale.set(0.22 * s, 0.62 * s, 0.22 * s);
  leftPants.position.y = -0.32 * s;
  leftLeg.add(leftPants);
  const leftShoe = new THREE.Mesh(geoBox, shoeMat);
  leftShoe.scale.set(0.24 * s, 0.14 * s, 0.34 * s);
  leftShoe.position.set(0, -0.66 * s, 0.06 * s);
  leftLeg.add(leftShoe);
  hips.add(leftLeg);

  // Right Leg
  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.2 * s, 0, 0);
  const rightPants = new THREE.Mesh(geoBox, suitMat);
  rightPants.scale.set(0.22 * s, 0.62 * s, 0.22 * s);
  rightPants.position.y = -0.32 * s;
  rightLeg.add(rightPants);
  const rightShoe = new THREE.Mesh(geoBox, shoeMat);
  rightShoe.scale.set(0.24 * s, 0.14 * s, 0.34 * s);
  rightShoe.position.set(0, -0.66 * s, 0.06 * s);
  rightLeg.add(rightShoe);
  hips.add(rightLeg);

  // Blob shadow
  root.add(buildBlobShadow(0.9 * s));

  // Store references for limb animations
  root.userData = {
    ...root.userData,
    isHero,
    scale: s,
    hips,
    torso,
    suitMat,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };

  return root;
}

/**
 * Builds 3D procedural weapon held by salaryman.
 */
export function buildWeaponMesh(id: WeaponId, scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.name = `weapon_${id}`;
  const s = scale;

  switch (id) {
    case 'pistol': {
      // Folded umbrella: navy/black cylinder canopy + wooden curved j-handle + brass ferrule
      const canopy = new THREE.Mesh(
        geoCylinder,
        new THREE.MeshLambertMaterial({ color: 0x1e293b })
      );
      canopy.scale.set(0.08 * s, 0.75 * s, 0.08 * s);
      canopy.rotation.x = Math.PI / 2;
      g.add(canopy);

      const tip = new THREE.Mesh(
        geoConeOrCylinder(),
        new THREE.MeshLambertMaterial({ color: 0xfacc15 })
      );
      tip.scale.set(0.06 * s, 0.18 * s, 0.06 * s);
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = 0.42 * s;
      g.add(tip);

      const handle = new THREE.Mesh(
        geoCylinder,
        new THREE.MeshLambertMaterial({ color: 0x78350f })
      );
      handle.scale.set(0.05 * s, 0.22 * s, 0.05 * s);
      handle.position.set(0, -0.08 * s, -0.42 * s);
      g.add(handle);
      break;
    }
    case 'smg': {
      // Business card rapid blaster: card dispenser box with gold/white corporate cards
      const dispenser = new THREE.Mesh(
        geoBox,
        new THREE.MeshLambertMaterial({ color: 0x0284c7 })
      );
      dispenser.scale.set(0.24 * s, 0.2 * s, 0.45 * s);
      g.add(dispenser);

      const card = new THREE.Mesh(
        geoBox,
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      card.scale.set(0.22 * s, 0.04 * s, 0.32 * s);
      card.position.set(0, 0.12 * s, 0.18 * s);
      g.add(card);
      break;
    }
    case 'shotgun': {
      // Briefcase shotgun: heavy leather briefcase with twin short steel barrels
      const caseBox = new THREE.Mesh(
        geoBox,
        new THREE.MeshLambertMaterial({ color: 0x451a03 })
      );
      caseBox.scale.set(0.26 * s, 0.42 * s, 0.52 * s);
      g.add(caseBox);

      for (const ox of [-0.07 * s, 0.07 * s]) {
        const barrel = new THREE.Mesh(
          geoCylinder,
          new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
        );
        barrel.scale.set(0.05 * s, 0.24 * s, 0.05 * s);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(ox, 0, 0.32 * s);
        g.add(barrel);
      }
      break;
    }
    case 'rifle': {
      // IC Card rail pass laser rifle: slender receiver with glowing cyan IC card magazine
      const stock = new THREE.Mesh(
        geoBox,
        new THREE.MeshLambertMaterial({ color: 0x334155 })
      );
      stock.scale.set(0.12 * s, 0.16 * s, 0.72 * s);
      g.add(stock);

      const icCard = new THREE.Mesh(
        geoBox,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      icCard.scale.set(0.16 * s, 0.18 * s, 0.08 * s);
      icCard.position.set(0, 0.14 * s, 0);
      g.add(icCard);

      const barrel = new THREE.Mesh(
        geoCylinder,
        new THREE.MeshLambertMaterial({ color: 0x64748b })
      );
      barrel.scale.set(0.04 * s, 0.45 * s, 0.04 * s);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.04 * s, 0.52 * s);
      g.add(barrel);
      break;
    }
    case 'launcher': {
      // Shinkansen missile bazooka: miniature aerodynamic bullet train nose on shoulder
      const tube = new THREE.Mesh(
        geoCylinder,
        new THREE.MeshLambertMaterial({ color: 0xf8fafc })
      );
      tube.scale.set(0.18 * s, 0.85 * s, 0.18 * s);
      tube.rotation.x = Math.PI / 2;
      g.add(tube);

      const stripe = new THREE.Mesh(
        geoBox,
        new THREE.MeshBasicMaterial({ color: 0x2563eb })
      );
      stripe.scale.set(0.19 * s, 0.86 * s, 0.04 * s);
      stripe.rotation.x = Math.PI / 2;
      g.add(stripe);

      const cone = new THREE.Mesh(
        geoConeOrCylinder(),
        new THREE.MeshLambertMaterial({ color: 0x1d4ed8 })
      );
      cone.scale.set(0.18 * s, 0.28 * s, 0.18 * s);
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(0, 0, 0.5 * s);
      g.add(cone);
      break;
    }
    case 'freeze': {
      // Air conditioner chiller: white cylindrical vent with glowing frost-cyan emitter
      const cooler = new THREE.Mesh(
        geoBox,
        new THREE.MeshLambertMaterial({ color: 0xe2e8f0 })
      );
      cooler.scale.set(0.28 * s, 0.24 * s, 0.48 * s);
      g.add(cooler);

      const frostRing = new THREE.Mesh(
        geoCylinder,
        new THREE.MeshBasicMaterial({ color: 0xa5f3fc })
      );
      frostRing.scale.set(0.12 * s, 0.08 * s, 0.12 * s);
      frostRing.rotation.x = Math.PI / 2;
      frostRing.position.set(0, 0, 0.26 * s);
      g.add(frostRing);
      break;
    }
  }

  return g;
}

function geoConeOrCylinder(): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(0.01, 0.5, 1, 10);
}

/** Updates salaryman running limb cycle */
export function updateSalarymanAnimation(group: THREE.Group, time: number, strideSpeed = 12): void {
  const ud = group.userData;
  if (!ud || !ud.leftLeg) return;

  const swing = Math.sin(time * strideSpeed) * 0.55;
  ud.leftLeg.rotation.x = swing;
  ud.rightLeg.rotation.x = -swing;
  ud.leftArm.rotation.x = -swing * 0.8;
  // Right arm holds weapon forward with subtle recoil/sway
  ud.rightArm.rotation.x = swing * 0.25 - 0.25;
}

/* =========================================================================
   2. Physical 3D Deployable Barricade (4 Durability States)
   ========================================================================= */

/**
 * Builds a physical 3D modular barricade wall deployed across the track.
 * Has 4 visual degradation states:
 *  - 100%–70%: Pristine Cyan (#06b6d4)
 *  - 69%–30%: Orange flicker (#f59e0b) with fracture lines
 *  - 29%–1%: Pulsing Red alarm (#ef4444) with spark particles
 *  - 0%: Broken/shattered barrier debris
 */
export function buildBarricadeMesh(level = 1, durabilityRatio = 1.0): THREE.Group {
  const g = new THREE.Group();
  g.name = 'modular_barricade';

  const width = 9.6;
  const height = 2.3;
  const depth = 0.45;

  // 1. Reinforced Steel Pylons (End Posts) with Yellow/Black Hazard Stripes
  const pylonMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const pylonGeo = new THREE.BoxGeometry(0.55, height + 0.5, 0.65);

  const pylonL = new THREE.Mesh(pylonGeo, pylonMat);
  pylonL.position.set(-width / 2, (height + 0.5) / 2, 0);
  g.add(pylonL);

  const pylonR = new THREE.Mesh(pylonGeo, pylonMat);
  pylonR.position.set(width / 2, (height + 0.5) / 2, 0);
  g.add(pylonR);

  // Warning hazard bands on pylons
  const stripeTex = createHazardStripeTexture();
  const stripeMat = new THREE.MeshBasicMaterial({ map: stripeTex });
  const stripeGeo = new THREE.BoxGeometry(0.58, 0.6, 0.68);
  const stripeL = new THREE.Mesh(stripeGeo, stripeMat);
  stripeL.position.set(-width / 2, height * 0.65, 0);
  g.add(stripeL);
  const stripeR = stripeL.clone();
  stripeR.position.x = width / 2;
  g.add(stripeR);

  // Pylon Strobe Beacon Lamps
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const beaconGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const beaconL = new THREE.Mesh(beaconGeo, beaconMat);
  beaconL.position.set(-width / 2, height + 0.35, 0);
  g.add(beaconL);
  const beaconR = beaconL.clone();
  beaconR.position.x = width / 2;
  g.add(beaconR);

  // 2. Base Steel Floor Rail across track
  const baseRail = new THREE.Mesh(
    geoBox,
    new THREE.MeshLambertMaterial({ color: 0x1e293b })
  );
  baseRail.scale.set(width, 0.3, 0.5);
  baseRail.position.set(0, 0.15, 0);
  g.add(baseRail);

  // Top Steel Header Rail
  const topRail = new THREE.Mesh(
    geoBox,
    new THREE.MeshLambertMaterial({ color: 0x475569 })
  );
  topRail.scale.set(width, 0.22, 0.5);
  topRail.position.set(0, height, 0);
  g.add(topRail);

  // 3. Central Energy Barrier Curtain Mesh
  const energyMat = new THREE.MeshLambertMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.72,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.45,
    depthWrite: false,
  });
  const energyMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.8, height - 0.45, 8, 4),
    energyMat
  );
  energyMesh.position.set(0, height / 2 + 0.05, 0.02);
  g.add(energyMesh);

  // 4. Fracture / Cracks Overlay Mesh (hidden when pristine)
  const crackMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    wireframe: true,
    transparent: true,
    opacity: 0.0,
  });
  const crackMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.8, height - 0.45, 12, 6),
    crackMat
  );
  crackMesh.position.set(0, height / 2 + 0.05, 0.04);
  g.add(crackMesh);

  // 5. Debris Group (Shown when 0% broken)
  const debrisGroup = new THREE.Group();
  debrisGroup.visible = false;
  for (let i = 0; i < 8; i++) {
    const chunk = new THREE.Mesh(
      geoBox,
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    chunk.scale.set(0.6 + (i % 3) * 0.2, 0.25, 0.4);
    chunk.position.set((i - 3.5) * 1.1, 0.12, (Math.random() - 0.5) * 0.8);
    chunk.rotation.set(0, Math.random() * 0.8, (Math.random() - 0.5) * 0.5);
    debrisGroup.add(chunk);
  }
  g.add(debrisGroup);

  g.userData = {
    level,
    durabilityRatio,
    energyMesh,
    energyMat,
    crackMesh,
    crackMat,
    beaconL,
    beaconR,
    beaconMat,
    debrisGroup,
    baseRail,
    topRail,
    stripeL,
    stripeR,
  };

  updateBarricadeDurability(g, durabilityRatio, 0);
  return g;
}

function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#18181b';
  for (let x = -64; x < 128; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 16, 0);
    ctx.lineTo(x - 8, 64);
    ctx.lineTo(x - 24, 64);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Updates physical barricade appearance across the 4 durability states */
export function updateBarricadeDurability(group: THREE.Group, ratio: number, time = 0): void {
  const ud = group.userData;
  if (!ud || !ud.energyMat) return;
  ud.durabilityRatio = ratio;

  const clampRatio = Math.max(0, Math.min(1, ratio));

  if (clampRatio <= 0.001) {
    // 4. Broken (0%): Shattered debris on road
    ud.energyMesh.visible = false;
    ud.crackMesh.visible = false;
    ud.topRail.position.y = 0.6;
    ud.topRail.rotation.z = 0.08;
    ud.debrisGroup.visible = true;
    ud.beaconMat.color.setHex(0x334155);
  } else if (clampRatio < 0.3) {
    // 3. Critical Alarm (29%–1%): Pulsing Red (#ef4444)
    ud.energyMesh.visible = true;
    ud.debrisGroup.visible = false;
    ud.topRail.position.y = 2.3;
    ud.topRail.rotation.z = 0;

    const pulse = 0.45 + Math.sin(time * 16) * 0.35;
    ud.energyMat.color.setHex(0xef4444);
    ud.energyMat.emissive.setHex(0xef4444);
    ud.energyMat.emissiveIntensity = 0.5 + pulse * 0.4;
    ud.energyMat.opacity = Math.max(0.3, Math.min(0.85, pulse));

    ud.crackMesh.visible = true;
    ud.crackMat.color.setHex(0xef4444);
    ud.crackMat.opacity = 0.85;
    ud.beaconMat.color.setHex(pulse > 0.5 ? 0xef4444 : 0x450a0a);
  } else if (clampRatio < 0.7) {
    // 2. Damaged (69%–30%): Orange flicker (#f59e0b) with fracture lines
    ud.energyMesh.visible = true;
    ud.debrisGroup.visible = false;
    ud.topRail.position.y = 2.3;
    ud.topRail.rotation.z = 0;

    const flicker = 0.55 + Math.sin(time * 8) * 0.15;
    ud.energyMat.color.setHex(0xf59e0b);
    ud.energyMat.emissive.setHex(0xf59e0b);
    ud.energyMat.emissiveIntensity = 0.4;
    ud.energyMat.opacity = flicker;

    ud.crackMesh.visible = true;
    ud.crackMat.color.setHex(0xf59e0b);
    ud.crackMat.opacity = 0.65;
    ud.beaconMat.color.setHex(0xf59e0b);
  } else {
    // 1. Pristine (100%–70%): Pristine Cyan (#06b6d4)
    ud.energyMesh.visible = true;
    ud.debrisGroup.visible = false;
    ud.topRail.position.y = 2.3;
    ud.topRail.rotation.z = 0;

    ud.energyMat.color.setHex(0x06b6d4);
    ud.energyMat.emissive.setHex(0x06b6d4);
    ud.energyMat.emissiveIntensity = 0.35;
    ud.energyMat.opacity = 0.72;

    ud.crackMesh.visible = false;
    ud.beaconMat.color.setHex(0x06b6d4);
  }
}

/* =========================================================================
   3. 3D Archway Multiplier Gates (Zero Emojis!)
   ========================================================================= */

export type GateOp = 'add' | 'mult' | 'sub' | 'div';

/**
 * Builds a 3D archway multiplier gate with embossed typography and glowing energy curtain.
 */
export function buildGateMesh(op: GateOp, val: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `gate_${op}_${val}`;

  const isGood = op === 'add' || op === 'mult';
  const mainHex = isGood ? 0x10b981 : 0xef4444;
  const beamHex = isGood ? 0x059669 : 0xb91c1c;

  const colWidth = 4.2;
  const colHeight = 3.2;

  // 1. Support Pillars (Left & Right)
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const pillarGeo = new THREE.BoxGeometry(0.32, colHeight, 0.32);

  const pilL = new THREE.Mesh(pillarGeo, pillarMat);
  pilL.position.set(-colWidth / 2, colHeight / 2, 0);
  g.add(pilL);

  const pilR = new THREE.Mesh(pillarGeo, pillarMat);
  pilR.position.set(colWidth / 2, colHeight / 2, 0);
  g.add(pilR);

  // 2. Overhead Lintel Beam
  const lintelMat = new THREE.MeshLambertMaterial({
    color: beamHex,
    emissive: mainHex,
    emissiveIntensity: 0.3,
  });
  const lintel = new THREE.Mesh(geoBox, lintelMat);
  lintel.scale.set(colWidth + 0.4, 0.45, 0.36);
  lintel.position.set(0, colHeight, 0);
  g.add(lintel);

  // 3. Central Glowing Energy Curtain with Embossed Typography Texture
  const signText = formatGateLabel(op, val);
  const curtainTex = createGateCurtainTexture(signText, isGood);
  const curtainMat = new THREE.MeshLambertMaterial({
    map: curtainTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    emissive: mainHex,
    emissiveIntensity: 0.35,
    depthWrite: false,
  });

  const curtainMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(colWidth - 0.2, colHeight - 0.55),
    curtainMat
  );
  curtainMesh.position.set(0, (colHeight - 0.55) / 2 + 0.2, 0);
  g.add(curtainMesh);

  g.userData = {
    op,
    val,
    isGood,
    curtainMesh,
    curtainMat,
  };

  return g;
}

function formatGateLabel(op: GateOp, val: number): string {
  switch (op) {
    case 'add': return `+${val}`;
    case 'mult': return `×${val}`;
    case 'sub': return `-${val}`;
    case 'div': return `÷${val}`;
  }
}

function createGateCurtainTexture(label: string, isGood: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 180);
  if (isGood) {
    bgGrad.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
    bgGrad.addColorStop(0.5, 'rgba(5, 150, 105, 0.65)');
    bgGrad.addColorStop(1, 'rgba(4, 120, 87, 0.9)');
  } else {
    bgGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
    bgGrad.addColorStop(0.5, 'rgba(185, 28, 28, 0.65)');
    bgGrad.addColorStop(1, 'rgba(153, 27, 27, 0.9)');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 256, 180);

  // Border frame
  ctx.strokeStyle = isGood ? '#a7f3d0' : '#fecaca';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 168);

  // Subtle grid/hex curtain lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  for (let y = 20; y < 180; y += 20) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(246, y);
    ctx.stroke();
  }

  // Large Bold Embossed Typography (Zero Emojis)
  ctx.font = '900 68px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillText(label, 131, 94);

  // Glow
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, 128, 90);

  // Subtitle (e.g. SQUAD MULTIPLIER / HAZARD)
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = isGood ? '#d1fae5' : '#fee2e2';
  ctx.fillText(isGood ? 'SQUAD BOOSTER' : 'COMMUTE HAZARD', 128, 148);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/** Animated wave ripple on gate energy curtain */
export function updateGateCurtain(group: THREE.Group, time: number): void {
  const ud = group.userData;
  if (!ud || !ud.curtainMat) return;
  ud.curtainMat.opacity = 0.74 + Math.sin(time * 4) * 0.08;
}

/* =========================================================================
   4. 6 Unique Low-Poly Enemy Models (Zero Emojis!)
   ========================================================================= */

/**
 * Builds one of 6 distinct low-poly enemy models:
 *  - runner: lean green sprinter, forward posture, tie back
 *  - walker: weary commuter in trenchcoat, hunched zombie march
 *  - brute: muscular titan with broad chest & heavy steel suitcase
 *  - shield: armored salaryman with curved transparent riot shield
 *  - kamikaze: motorized kick-scooter commuter with headlamp
 *  - boss: Commuter Express locomotive titan
 */
export function buildEnemyMesh(kind: string, elite = false): THREE.Group {
  const g = new THREE.Group();
  g.name = `enemy_${kind}${elite ? '_elite' : ''}`;
  const s = elite ? 1.35 : 1.0;

  switch (kind) {
    case 'runner': {
      // Lean athletic commuter, sprinting forward
      const runner = buildSalarymanMesh({
        suitColor: 0x16a34a,
        scale: 0.95 * s,
      });
      // Leaned forward posture
      runner.rotation.x = 0.35;
      g.add(runner);

      // Flapping tie streaming backwards
      const tieMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
      const tieTrail = new THREE.Mesh(geoBox, tieMat);
      tieTrail.scale.set(0.08 * s, 0.06 * s, 0.42 * s);
      tieTrail.position.set(0, 0.95 * s, -0.22 * s);
      g.add(tieTrail);
      break;
    }

    case 'walker': {
      // Weary commuter in trenchcoat, hunched march
      const walker = buildSalarymanMesh({
        suitColor: 0xd97706,
        scale: 1.0 * s,
      });
      walker.rotation.x = 0.15; // slightly hunched
      g.add(walker);

      // Overcoat collar
      const coatCollar = new THREE.Mesh(
        geoBox,
        new THREE.MeshLambertMaterial({ color: 0xb45309 })
      );
      coatCollar.scale.set(0.76 * s, 0.18 * s, 0.44 * s);
      coatCollar.position.set(0, 1.25 * s, 0);
      g.add(coatCollar);
      break;
    }

    case 'brute': {
      // Muscular titan: broad chest, heavy steel suitcase club
      const bruteRoot = new THREE.Group();
      const bruteSuit = new THREE.MeshLambertMaterial({ color: 0xea580c });
      const skinMat = new THREE.MeshLambertMaterial({ color: 0xf6d3b4 });

      // Torso (Trapezoid Chest)
      const torso = new THREE.Mesh(geoBox, bruteSuit);
      torso.scale.set(1.25 * s, 0.95 * s, 0.65 * s);
      torso.position.y = 1.2 * s;
      bruteRoot.add(torso);

      // Head
      const head = new THREE.Mesh(geoSphere, skinMat);
      head.scale.setScalar(0.52 * s);
      head.position.y = 1.85 * s;
      bruteRoot.add(head);

      // Heavy Arms with rolled sleeves
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(geoBox, skinMat);
        arm.scale.set(0.32 * s, 0.85 * s, 0.32 * s);
        arm.position.set(side * 0.78 * s, 1.05 * s, 0);
        bruteRoot.add(arm);
      }

      // Heavy steel suitcase battering ram in right hand
      const steelCase = new THREE.Mesh(
        geoBox,
        new THREE.MeshLambertMaterial({ color: 0x475569 })
      );
      steelCase.scale.set(0.35 * s, 0.75 * s, 0.95 * s);
      steelCase.position.set(-0.82 * s, 0.75 * s, 0.25 * s);
      bruteRoot.add(steelCase);

      // Thick Legs
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(
          geoBox,
          new THREE.MeshLambertMaterial({ color: 0x334155 })
        );
        leg.scale.set(0.38 * s, 0.75 * s, 0.38 * s);
        leg.position.set(side * 0.32 * s, 0.38 * s, 0);
        bruteRoot.add(leg);
      }

      bruteRoot.add(buildBlobShadow(1.3 * s));
      g.add(bruteRoot);
      break;
    }

    case 'shield': {
      // Commuter with large curved transparent riot shield
      const salaryman = buildSalarymanMesh({
        suitColor: 0x0284c7,
        scale: 1.0 * s,
      });
      g.add(salaryman);

      // Curved riot shield
      const shieldGroup = new THREE.Group();
      shieldGroup.position.set(0, 0.95 * s, 0.45 * s);

      // Shield frame
      const frameMat = new THREE.MeshLambertMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
      });
      const shieldGlass = new THREE.Mesh(
        new THREE.BoxGeometry(1.4 * s, 1.8 * s, 0.08 * s),
        new THREE.MeshLambertMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        })
      );
      shieldGroup.add(shieldGlass);

      // Top and bottom steel brackets
      for (const oy of [-0.85 * s, 0.85 * s]) {
        const bracket = new THREE.Mesh(geoBox, frameMat);
        bracket.scale.set(1.44 * s, 0.12 * s, 0.14 * s);
        bracket.position.y = oy;
        shieldGroup.add(bracket);
      }

      // Reinforced center emblem
      const emblem = new THREE.Mesh(geoBox, frameMat);
      emblem.scale.set(0.4 * s, 0.4 * s, 0.12 * s);
      shieldGroup.add(emblem);

      g.add(shieldGroup);
      break;
    }

    case 'kamikaze': {
      // Commuter on motorized kick-scooter / commuter bicycle
      const commuter = buildSalarymanMesh({
        suitColor: 0xdb2777,
        scale: 0.85 * s,
      });
      commuter.rotation.x = 0.45; // forward leaning crouch
      commuter.position.set(0, 0.4 * s, -0.15 * s);
      g.add(commuter);

      // Electric Scooter chassis
      const scooter = new THREE.Group();
      scooter.position.y = 0.2 * s;

      const deck = new THREE.Mesh(
        geoBox,
        new THREE.MeshLambertMaterial({ color: 0x1e293b })
      );
      deck.scale.set(0.35 * s, 0.1 * s, 1.6 * s);
      scooter.add(deck);

      // Two wheels
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
      for (const oz of [-0.7 * s, 0.7 * s]) {
        const wheel = new THREE.Mesh(geoCylinder, wheelMat);
        wheel.scale.set(0.24 * s, 0.12 * s, 0.24 * s);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0, oz);
        scooter.add(wheel);
      }

      // Steering column & handlebars
      const column = new THREE.Mesh(
        geoCylinder,
        new THREE.MeshLambertMaterial({ color: 0x64748b })
      );
      column.scale.set(0.05 * s, 1.1 * s, 0.05 * s);
      column.position.set(0, 0.55 * s, 0.65 * s);
      scooter.add(column);

      const handlebar = new THREE.Mesh(
        geoCylinder,
        new THREE.MeshLambertMaterial({ color: 0xf43f5e })
      );
      handlebar.scale.set(0.04 * s, 0.65 * s, 0.04 * s);
      handlebar.rotation.z = Math.PI / 2;
      handlebar.position.set(0, 1.1 * s, 0.65 * s);
      scooter.add(handlebar);

      // Headlight
      const lamp = new THREE.Mesh(
        geoSphere,
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      lamp.scale.setScalar(0.12 * s);
      lamp.position.set(0, 1.05 * s, 0.72 * s);
      scooter.add(lamp);

      g.add(scooter);
      break;
    }

    case 'boss': {
      return buildTrainBossMesh('city');
    }
  }

  // Elite aura ornament
  if (elite && kind !== 'boss') {
    const crownMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const crown = new THREE.Mesh(geoCylinder, crownMat);
    crown.scale.set(0.4 * s, 0.08 * s, 0.4 * s);
    crown.position.y = 2.15 * s;
    g.add(crown);
  }

  return g;
}

/* =========================================================================
   5. Commuter Express Train Boss (Zero Emojis!)
   ========================================================================= */

/**
 * Builds the massive Commuter Express locomotive boss titan.
 * Aerodynamic cab, dual glowing xenon headlights, illuminated passenger windows,
 * heavy steel cowcatcher on track.
 */
export function buildTrainBossMesh(courseId = 'city'): THREE.Group {
  const g = new THREE.Group();
  g.name = `train_boss_${courseId}`;

  const width = 3.6;
  const height = 2.6;
  const length = 7.8;

  // Course liveries
  let stripeHex = 0x16a34a; // Yamanote green
  if (courseId === 'desert') stripeHex = 0xea580c; // Chuo orange
  if (courseId === 'snow') stripeHex = 0xa855f7; // Midnight Subway neon purple

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }); // Stainless steel
  const darkCabMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Dark cab trim
  const stripeMat = new THREE.MeshLambertMaterial({
    color: stripeHex,
    emissive: stripeHex,
    emissiveIntensity: 0.35,
  });

  // 1. Train Body (Main Carriage Box)
  const body = new THREE.Mesh(geoBox, bodyMat);
  body.scale.set(width, height, length);
  body.position.y = height / 2 + 0.35;
  g.add(body);

  // 2. Line Color Stripe along carriage
  const stripe = new THREE.Mesh(geoBox, stripeMat);
  stripe.scale.set(width + 0.06, 0.42, length + 0.06);
  stripe.position.y = 1.15;
  g.add(stripe);

  // 3. Aerodynamic Sloped Cab Front
  const cabFront = new THREE.Mesh(geoBox, darkCabMat);
  cabFront.scale.set(width - 0.2, height * 0.55, 1.2);
  cabFront.position.set(0, 1.7, length / 2 + 0.5);
  cabFront.rotation.x = -0.32;
  g.add(cabFront);

  // Cockpit Windshield (Tinted glass)
  const windshield = new THREE.Mesh(
    geoBox,
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  windshield.scale.set(width - 0.6, 0.65, 0.1);
  windshield.position.set(0, 1.85, length / 2 + 0.95);
  windshield.rotation.x = -0.32;
  g.add(windshield);

  // 4. Heavy Steel Cowcatcher / Wedge Plow on Track Bumper
  const cowcatcherMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const plowL = new THREE.Mesh(geoBox, cowcatcherMat);
  plowL.scale.set(width * 0.52, 0.45, 0.85);
  plowL.rotation.y = 0.45;
  plowL.position.set(-0.8, 0.35, length / 2 + 0.85);
  g.add(plowL);

  const plowR = new THREE.Mesh(geoBox, cowcatcherMat);
  plowR.scale.set(width * 0.52, 0.45, 0.85);
  plowR.rotation.y = -0.45;
  plowR.position.set(0.8, 0.35, length / 2 + 0.85);
  g.add(plowR);

  // 5. Dual Xenon High-Beam Headlights
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  for (const lx of [-width * 0.32, width * 0.32]) {
    const lamp = new THREE.Mesh(geoSphere, lightMat);
    lamp.scale.set(0.38, 0.38, 0.25);
    lamp.position.set(lx, 0.75, length / 2 + 0.8);
    g.add(lamp);
  }

  // 6. Flank Passenger Windows with Illuminated Silhouettes
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  for (let z = -length * 0.35; z <= length * 0.35; z += 1.6) {
    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(geoBox, windowMat);
      win.scale.set(0.08, 0.75, 1.1);
      win.position.set(side * (width / 2 + 0.04), 1.75, z);
      g.add(win);
    }
  }

  // 7. Roof AC Units & Diamond Pantograph
  for (const z of [-1.8, 1.2]) {
    const ac = new THREE.Mesh(
      geoBox,
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    ac.scale.set(1.4, 0.35, 1.8);
    ac.position.set(0, height + 0.5, z);
    g.add(ac);
  }

  // Diamond linkage pantograph on roof
  const pantoMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
  const pantoFrame = new THREE.Mesh(geoBox, pantoMat);
  pantoFrame.scale.set(1.2, 0.7, 0.8);
  pantoFrame.position.set(0, height + 0.75, -2.2);
  g.add(pantoFrame);

  // 8. Bogies / Wheels underneath
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
  for (const bz of [-2.4, 2.4]) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(geoCylinder, wheelMat);
      wheel.scale.set(0.38, 0.18, 0.38);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * (width / 2 - 0.2), 0.25, bz);
      g.add(wheel);
    }
  }

  // 9. Massive Blob Shadow
  g.add(buildBlobShadow(3.8));

  return g;
}

/* =========================================================================
   6. Procedural 3D Item Crates & SOS Cages (Zero Emojis!)
   ========================================================================= */

/**
 * Builds 3D reinforced cargo crate with 3D rotating holographic weapon/item symbol.
 */
export function buildCrateMesh(kind: BarrelKind): THREE.Group {
  const g = new THREE.Group();
  g.name = `crate_${kind}`;

  // 1. Reinforced Wooden Cargo Box
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
  const box = new THREE.Mesh(geoBox, crateMat);
  box.scale.set(1.1, 1.1, 1.1);
  box.position.y = 0.55;
  g.add(box);

  // Steel Corner Brackets
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const strap = new THREE.Mesh(geoBox, steelMat);
  strap.scale.set(1.14, 0.2, 1.14);
  strap.position.y = 0.55;
  g.add(strap);

  // 2. Floating 3D Holographic Item Icon on Top (Zero Emojis!)
  const holoIcon = buildHolographicIcon(kind);
  holoIcon.position.y = 1.6;
  g.add(holoIcon);

  g.add(buildBlobShadow(1.1));
  return g;
}

function buildHolographicIcon(kind: BarrelKind): THREE.Group {
  const g = new THREE.Group();
  g.name = `holo_${kind}`;

  switch (kind) {
    case 'weapon': {
      // Golden 3D blaster
      const icon = new THREE.Mesh(
        geoBox,
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      );
      icon.scale.set(0.18, 0.35, 0.65);
      g.add(icon);
      break;
    }
    case 'bomb': {
      // Orange 3D explosive dynamo with lightning wedges
      const icon = new THREE.Mesh(
        geoSphere,
        new THREE.MeshBasicMaterial({ color: 0xfb923c })
      );
      icon.scale.setScalar(0.38);
      g.add(icon);
      break;
    }
    case 'coin': {
      // Gold 3D coin disc
      const icon = new THREE.Mesh(
        geoCylinder,
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      icon.scale.set(0.42, 0.08, 0.42);
      icon.rotation.x = Math.PI / 2;
      g.add(icon);
      break;
    }
    case 'repair': {
      // Cyan 3D armor plate / wrench cross
      const icon = new THREE.Mesh(
        geoBox,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      icon.scale.set(0.52, 0.52, 0.12);
      g.add(icon);
      break;
    }
  }

  return g;
}

/**
 * Builds 3D laser energy cage holding a waving trapped coworker.
 */
export function buildCageMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'cage_sos';

  const width = 1.5;
  const height = 2.1;

  // Steel top and bottom plates
  const plateMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const botPlate = new THREE.Mesh(geoBox, plateMat);
  botPlate.scale.set(width, 0.2, width);
  botPlate.position.y = 0.1;
  g.add(botPlate);

  const topPlate = new THREE.Mesh(geoBox, plateMat);
  topPlate.scale.set(width, 0.2, width);
  topPlate.position.y = height;
  g.add(topPlate);

  // 6 Glowing Laser Prison Bars
  const laserMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const offsets = [
    [-width / 2 + 0.1, -width / 2 + 0.1],
    [width / 2 - 0.1, -width / 2 + 0.1],
    [-width / 2 + 0.1, width / 2 - 0.1],
    [width / 2 - 0.1, width / 2 - 0.1],
    [0, -width / 2 + 0.1],
    [0, width / 2 - 0.1],
  ];
  for (const [ox, oz] of offsets) {
    const bar = new THREE.Mesh(geoCylinder, laserMat);
    bar.scale.set(0.04, height - 0.2, 0.04);
    bar.position.set(ox, height / 2, oz);
    g.add(bar);
  }

  // Trapped Coworker waving inside
  const coworker = buildSalarymanMesh({
    suitColor: 0x15803d,
    scale: 0.82,
  });
  coworker.position.y = 0.2;
  g.add(coworker);

  // 3D Embossed "RESCUE" Top Beacon Sign (Zero Emojis!)
  const beacon = createRescueBadgeMesh();
  beacon.position.y = height + 0.55;
  g.add(beacon);

  g.add(buildBlobShadow(1.2));
  return g;
}

function createRescueBadgeMesh(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, 128, 48);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 44);
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('RESCUE', 64, 25);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), mat);
  return m;
}

/** Updates trapped coworker distress wave inside cage */
export function updateCageAnimation(group: THREE.Group, time: number): void {
  const coworker = group.getObjectByName('ally_salaryman');
  if (!coworker || !coworker.userData.leftArm) return;
  const wave = Math.sin(time * 10) * 0.6;
  coworker.userData.leftArm.rotation.z = 1.2 + wave;
  coworker.userData.rightArm.rotation.z = -1.2 - wave;
}
