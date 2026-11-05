'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import { getAudioSettings } from '@/game/common/audioSettings';

const STORAGE_KEY = 'shachiku-catapult-v1';
const CANVAS_W = 960;
const CANVAS_H = 540;
const GROUND_Y = 460;

type UpgradeId = 'tension' | 'bounce' | 'fuel' | 'aero' | 'sponsor';

interface UpgradeLevels {
  tension: number;
  bounce: number;
  fuel: number;
  aero: number;
  sponsor: number;
}

interface SaveData {
  coins: number;
  bestDistance: number;
  bestAltitude: number;
  totalRuns: number;
  totalShattered: number;
  upgrades: UpgradeLevels;
  achievements: string[];
}

const DEFAULT_SAVE: SaveData = {
  coins: 0,
  bestDistance: 0,
  bestAltitude: 0,
  totalRuns: 0,
  totalShattered: 0,
  upgrades: {
    tension: 1,
    bounce: 1,
    fuel: 1,
    aero: 1,
    sponsor: 1,
  },
  achievements: [],
};

interface UpgradeMeta {
  id: UpgradeId;
  name: string;
  desc: string;
  baseCost: number;
  unit: string;
}

const UPGRADE_LIST: UpgradeMeta[] = [
  {
    id: 'tension',
    name: 'カタパルト張力',
    desc: '初期発射速度アップ',
    baseCost: 80,
    unit: '初速 +12%',
  },
  {
    id: 'bounce',
    name: '高反発スーツ',
    desc: 'バウンド維持率アップ',
    baseCost: 90,
    unit: '反発力 +6%',
  },
  {
    id: 'fuel',
    name: 'ジェット燃料タンク',
    desc: '空中噴射時間アップ',
    baseCost: 100,
    unit: '燃料 +22%',
  },
  {
    id: 'aero',
    name: '空力ネクタイ',
    desc: '空気抵抗軽減・滑空性能アップ',
    baseCost: 110,
    unit: '揚力・減衰改善',
  },
  {
    id: 'sponsor',
    name: 'スポンサー契約',
    desc: '獲得資金＆配置オブジェクト増加',
    baseCost: 120,
    unit: '報酬 +20%',
  },
];

interface AchievementMeta {
  id: string;
  title: string;
  cond: string;
}

const ACHIEVEMENTS: AchievementMeta[] = [
  { id: 'dist_1000', title: '定時ダッシュ成功', cond: '飛距離 1,000m 到達' },
  { id: 'dist_3000', title: '新幹線と並走する男', cond: '飛距離 3,000m 到達' },
  { id: 'dist_5000', title: '湾岸リゾート上陸', cond: '飛距離 5,000m 到達' },
  { id: 'dist_10000', title: '南国バカンス完全制覇', cond: '飛距離 10,000m 到達' },
  { id: 'shatter_10', title: '残業ブロック粉砕王', cond: '累計10個の残業ブロックを粉砕' },
  { id: 'max_upgrade', title: '極限カスタム装備', cond: 'いずれかの強化をLv.10にする' },
];

type FieldObjectType = 'van' | 'cannon' | 'updraft' | 'barrier';

interface FieldObject {
  id: number;
  type: FieldObjectType;
  x: number; // world meters
  y: number; // altitude meters (0 = ground)
  w: number;
  h: number;
  used: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingBanner {
  id: number;
  text: string;
  subText?: string;
  color: string;
  life: number;
}

interface RunSummary {
  distance: number;
  maxAltitude: number;
  bounces: number;
  shattered: number;
  perfectLaunch: boolean;
  earnedCoins: number;
  newRecord: boolean;
  zoneReached: string;
}

function getUpgradeCost(baseCost: number, level: number): number {
  return Math.round(baseCost * Math.pow(1.48, level - 1));
}

function getZoneInfo(dist: number): { name: string; skyTop: string; skyBottom: string; accent: string } {
  if (dist < 1200) {
    return { name: 'AREA 1: 夕暮れオフィス街', skyTop: '#1e1b4b', skyBottom: '#ea580c', accent: '#fb923c' };
  }
  if (dist < 3000) {
    return { name: 'AREA 2: ネオン高速道路', skyTop: '#090d16', skyBottom: '#3b0764', accent: '#c084fc' };
  }
  if (dist < 5000) {
    return { name: 'AREA 3: 新幹線高架橋エリア', skyTop: '#0c192c', skyBottom: '#0369a1', accent: '#38bdf8' };
  }
  if (dist < 10000) {
    return { name: 'AREA 4: 湾岸ベイブリッジ＆第一リゾート', skyTop: '#064e3b', skyBottom: '#0ea5e9', accent: '#34d399' };
  }
  return { name: 'AREA 5: 南国バカンス島（特等席）', skyTop: '#0284c7', skyBottom: '#fde047', accent: '#facc15' };
}

class CatapultSoundEngine {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(freq: number, endFreq: number, duration: number, type: OscillatorType = 'triangle', gainScale = 0.25) {
    const settings = getAudioSettings();
    if (!settings.se) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    const vol = Math.max(0.001, gainScale * settings.seVolume);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playLock(perfect = false) {
    if (perfect) {
      this.playTone(520, 1040, 0.18, 'square', 0.28);
      setTimeout(() => this.playTone(780, 1560, 0.22, 'triangle', 0.28), 60);
    } else {
      this.playTone(440, 660, 0.12, 'triangle', 0.22);
    }
  }

  playLaunch(perfect = false) {
    this.playTone(110, 680, 0.35, 'sawtooth', perfect ? 0.35 : 0.25);
    if (perfect) {
      setTimeout(() => this.playTone(660, 1320, 0.28, 'square', 0.25), 90);
    }
  }

  playBounce(strong = false) {
    this.playTone(strong ? 260 : 180, strong ? 720 : 420, strong ? 0.22 : 0.15, 'sine', strong ? 0.3 : 0.2);
  }

  playCannon() {
    this.playTone(140, 980, 0.4, 'sawtooth', 0.36);
    setTimeout(() => this.playTone(500, 1200, 0.25, 'square', 0.25), 80);
  }

  playDiveStamp() {
    this.playTone(620, 95, 0.24, 'sawtooth', 0.32);
  }

  playShatter() {
    this.playTone(320, 880, 0.16, 'square', 0.28);
    setTimeout(() => this.playTone(480, 1120, 0.18, 'triangle', 0.24), 50);
  }

  playSlowHit() {
    this.playTone(190, 70, 0.22, 'sawtooth', 0.28);
  }

  playJetStep() {
    this.playTone(120 + Math.random() * 60, 85, 0.06, 'sawtooth', 0.08);
  }

  playUpgrade() {
    this.playTone(440, 880, 0.14, 'triangle', 0.24);
    setTimeout(() => this.playTone(660, 1320, 0.18, 'sine', 0.24), 70);
  }
}

const sfx = new CatapultSoundEngine();

export default function ShachikuCatapultGame() {
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [phase, setPhase] = useState<'title' | 'aim_angle' | 'aim_power' | 'flying' | 'result'>('title');
  const [angleDeg, setAngleDeg] = useState<number>(45);
  const [powerPct, setPowerPct] = useState<number>(50);
  const [hudState, setHudState] = useState({
    distance: 0,
    altitude: 0,
    speed: 0,
    fuel: 100,
    maxFuel: 100,
    diveCooldown: 0,
    bounces: 0,
    shattered: 0,
    zoneName: 'AREA 1: 夕暮れオフィス街',
    jetting: false,
  });
  const [summary, setSummary] = useState<RunSummary | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const saveRef = useRef(save);
  saveRef.current = save;

  // Physics & simulation mutable state
  const simRef = useRef({
    angleDeg: 45,
    angleDir: 1,
    powerPct: 0,
    powerDir: 1,
    perfectLaunch: false,
    // Player world coordinates (in meters; 1m = 6px on screen)
    x: 0,
    y: 18, // starts on rooftop catapult
    vx: 0,
    vy: 0,
    rotation: 0,
    fuel: 100,
    maxFuel: 100,
    jetActive: false,
    diving: false,
    diveCooldown: 0,
    cannonLockTimer: 0,
    maxAltitude: 18,
    bounces: 0,
    shattered: 0,
    bonusCoins: 0,
    stoppedFrames: 0,
    nextSpawnX: 70,
    objects: [] as FieldObject[],
    particles: [] as Particle[],
    banners: [] as FloatingBanner[],
    jetSoundTick: 0,
  });

  useBgm(phase === 'flying' || phase === 'aim_angle' || phase === 'aim_power' ? 'survivor-battle' : 'shachiku-menu');

  // Load save data
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        setSave({
          coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
          bestDistance: typeof parsed.bestDistance === 'number' ? parsed.bestDistance : 0,
          bestAltitude: typeof parsed.bestAltitude === 'number' ? parsed.bestAltitude : 0,
          totalRuns: typeof parsed.totalRuns === 'number' ? parsed.totalRuns : 0,
          totalShattered: typeof parsed.totalShattered === 'number' ? parsed.totalShattered : 0,
          upgrades: {
            tension: parsed.upgrades?.tension ?? 1,
            bounce: parsed.upgrades?.bounce ?? 1,
            fuel: parsed.upgrades?.fuel ?? 1,
            aero: parsed.upgrades?.aero ?? 1,
            sponsor: parsed.upgrades?.sponsor ?? 1,
          },
          achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistSave = useCallback((next: SaveData) => {
    setSave(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addBanner = useCallback((text: string, subText: string | undefined, color: string) => {
    simRef.current.banners.push({
      id: Date.now() + Math.random(),
      text,
      subText,
      color,
      life: 1.5,
    });
  }, []);

  const spawnObjectsUpTo = useCallback((targetX: number, sponsorLv: number) => {
    const sim = simRef.current;
    const spacing = Math.max(42, 72 - sponsorLv * 2.8);
    while (sim.nextSpawnX < targetX) {
      const x = sim.nextSpawnX + (Math.random() * 18 - 9);
      const roll = Math.random();
      let type: FieldObjectType = 'van';
      let y = 0;
      let w = 14;
      let h = 7;

      if (roll < 0.34) {
        type = 'van';
        y = 0;
        w = 15;
        h = 7.5;
      } else if (roll < 0.56) {
        type = 'cannon';
        y = Math.random() < 0.45 ? 0 : 12 + Math.random() * 28;
        w = 12;
        h = 9;
      } else if (roll < 0.80) {
        type = 'updraft';
        y = 6 + Math.random() * 48;
        w = 14;
        h = 28;
      } else {
        type = 'barrier';
        y = 0;
        w = 10;
        h = 11;
      }

      sim.objects.push({
        id: Math.round(x * 100) + sim.objects.length,
        type,
        x,
        y,
        w,
        h,
        used: false,
      });

      sim.nextSpawnX += spacing;
    }
    // Prune far-behind objects
    sim.objects = sim.objects.filter((o) => o.x > sim.x - 120);
  }, []);

  const startLaunchSequence = useCallback(() => {
    const up = saveRef.current.upgrades;
    const maxFuel = 100 + (up.fuel - 1) * 22;
    simRef.current = {
      angleDeg: 35,
      angleDir: 1,
      powerPct: 10,
      powerDir: 1,
      perfectLaunch: false,
      x: 0,
      y: 18,
      vx: 0,
      vy: 0,
      rotation: 0,
      fuel: maxFuel,
      maxFuel,
      jetActive: false,
      diving: false,
      diveCooldown: 0,
      cannonLockTimer: 0,
      maxAltitude: 18,
      bounces: 0,
      shattered: 0,
      bonusCoins: 0,
      stoppedFrames: 0,
      nextSpawnX: 65,
      objects: [],
      particles: [],
      banners: [],
      jetSoundTick: 0,
    };
    spawnObjectsUpTo(800, up.sponsor);
    setSummary(null);
    setAngleDeg(35);
    setPowerPct(10);
    setPhase('aim_angle');
  }, [spawnObjectsUpTo]);

  const executeLaunch = useCallback(
    (lockedAngle: number, lockedPower: number) => {
      const up = saveRef.current.upgrades;
      const sim = simRef.current;
      const isPerfect = lockedPower >= 88;
      sim.perfectLaunch = isPerfect;

      const tensionMult = 1 + (up.tension - 1) * 0.12;
      const powerRatio = Math.max(0.25, lockedPower / 100);
      const baseSpeed = 88 * tensionMult * powerRatio * (isPerfect ? 1.16 : 1.0);
      const rad = (lockedAngle * Math.PI) / 180;

      sim.vx = Math.cos(rad) * baseSpeed;
      sim.vy = Math.sin(rad) * baseSpeed;

      sfx.playLaunch(isPerfect);
      if (isPerfect) {
        addBanner('PERFECT LAUNCH!', '定時ジャスト発射ボーナス +16%初速', '#facc15');
      } else {
        addBanner('LAUNCH!', `発射角度 ${Math.round(lockedAngle)}° / 出力 ${Math.round(lockedPower)}%`, '#38bdf8');
      }

      for (let i = 0; i < 28; i++) {
        sim.particles.push({
          x: sim.x,
          y: sim.y,
          vx: -Math.cos(rad) * (15 + Math.random() * 35) + (Math.random() - 0.5) * 20,
          vy: -Math.sin(rad) * (15 + Math.random() * 35) + (Math.random() - 0.5) * 20,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          color: isPerfect ? '#facc15' : '#fb923c',
          size: 4 + Math.random() * 5,
        });
      }

      setPhase('flying');
    },
    [addBanner]
  );

  const triggerDiveStamp = useCallback(() => {
    const sim = simRef.current;
    if (phaseRef.current !== 'flying') return;
    if (sim.diveCooldown > 0 || sim.y <= 3) return;

    sim.diving = true;
    sim.diveCooldown = 2.5;
    sim.vy = -Math.max(72, Math.abs(sim.vy) + 55);
    sim.vx *= 1.08;
    sfx.playDiveStamp();
    addBanner('急降下スタンプ！', '着地バウンド 1.35x 強化', '#f43f5e');
  }, [addBanner]);

  const finishRun = useCallback(() => {
    const sim = simRef.current;
    const curSave = saveRef.current;
    const dist = Math.round(sim.x);
    const maxAlt = Math.round(sim.maxAltitude);
    const sponsorMult = 1 + (curSave.upgrades.sponsor - 1) * 0.2;

    const baseCoins = Math.floor(dist * 0.14 + maxAlt * 0.25 + sim.bounces * 12 + sim.shattered * 35 + sim.bonusCoins);
    const earnedCoins = Math.max(15, Math.round(baseCoins * sponsorMult));
    const newRecord = dist > curSave.bestDistance;
    const totalShattered = curSave.totalShattered + sim.shattered;

    const nextAchievements = new Set(curSave.achievements);
    if (dist >= 1000) nextAchievements.add('dist_1000');
    if (dist >= 3000) nextAchievements.add('dist_3000');
    if (dist >= 5000) nextAchievements.add('dist_5000');
    if (dist >= 10000) nextAchievements.add('dist_10000');
    if (totalShattered >= 10) nextAchievements.add('shatter_10');
    if (Object.values(curSave.upgrades).some((lv) => lv >= 10)) nextAchievements.add('max_upgrade');

    const nextSave: SaveData = {
      ...curSave,
      coins: curSave.coins + earnedCoins,
      bestDistance: Math.max(curSave.bestDistance, dist),
      bestAltitude: Math.max(curSave.bestAltitude, maxAlt),
      totalRuns: curSave.totalRuns + 1,
      totalShattered,
      achievements: Array.from(nextAchievements),
    };

    persistSave(nextSave);
    setSummary({
      distance: dist,
      maxAltitude: maxAlt,
      bounces: sim.bounces,
      shattered: sim.shattered,
      perfectLaunch: sim.perfectLaunch,
      earnedCoins,
      newRecord,
      zoneReached: getZoneInfo(dist).name,
    });
    setPhase('result');
  }, [persistSave]);

  const handlePrimaryActionDown = useCallback(() => {
    const p = phaseRef.current;
    const sim = simRef.current;
    if (p === 'aim_angle') {
      const locked = Math.round(sim.angleDeg);
      sim.angleDeg = locked;
      setAngleDeg(locked);
      sfx.playLock(locked >= 40 && locked <= 50);
      setPhase('aim_power');
    } else if (p === 'aim_power') {
      const lockedP = Math.round(sim.powerPct);
      sim.powerPct = lockedP;
      setPowerPct(lockedP);
      executeLaunch(sim.angleDeg, lockedP);
    } else if (p === 'flying') {
      sim.jetActive = true;
    }
  }, [executeLaunch]);

  const handlePrimaryActionUp = useCallback(() => {
    simRef.current.jetActive = false;
  }, []);

  // Keyboard bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!e.repeat) {
          if (phaseRef.current === 'title') {
            startLaunchSequence();
          } else {
            handlePrimaryActionDown();
          }
        }
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        if (phaseRef.current === 'flying') {
          e.preventDefault();
          triggerDiveStamp();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        handlePrimaryActionUp();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handlePrimaryActionDown, handlePrimaryActionUp, startLaunchSequence, triggerDiveStamp]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudTimer = 0;

    const step = (now: number) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      const sim = simRef.current;
      const up = saveRef.current.upgrades;
      const curPhase = phaseRef.current;

      // 1. Update gauges or physics
      if (curPhase === 'aim_angle') {
        sim.angleDeg += sim.angleDir * 62 * dt;
        if (sim.angleDeg >= 75) {
          sim.angleDeg = 75;
          sim.angleDir = -1;
        } else if (sim.angleDeg <= 15) {
          sim.angleDeg = 15;
          sim.angleDir = 1;
        }
        setAngleDeg(Math.round(sim.angleDeg));
      } else if (curPhase === 'aim_power') {
        sim.powerPct += sim.powerDir * 118 * dt;
        if (sim.powerPct >= 100) {
          sim.powerPct = 100;
          sim.powerDir = -1;
        } else if (sim.powerPct <= 5) {
          sim.powerPct = 5;
          sim.powerDir = 1;
        }
        setPowerPct(Math.round(sim.powerPct));
      } else if (curPhase === 'flying') {
        if (sim.diveCooldown > 0) {
          sim.diveCooldown = Math.max(0, sim.diveCooldown - dt);
        }

        // Jetpack thrust
        const isJetting = sim.jetActive && sim.fuel > 0 && sim.cannonLockTimer <= 0;
        if (isJetting) {
          sim.fuel = Math.max(0, sim.fuel - 36 * dt);
          sim.vx += (42 + up.aero * 2.5) * dt;
          sim.vy += (56 + up.fuel * 1.8) * dt;
          sim.jetSoundTick += dt;
          if (sim.jetSoundTick > 0.07) {
            sim.jetSoundTick = 0;
            sfx.playJetStep();
          }
          for (let i = 0; i < 2; i++) {
            sim.particles.push({
              x: sim.x - 1.5,
              y: sim.y - 0.5,
              vx: -sim.vx * 0.25 - 12 + (Math.random() - 0.5) * 8,
              vy: -14 + (Math.random() - 0.5) * 8,
              life: 0.32,
              maxLife: 0.32,
              color: Math.random() < 0.5 ? '#f97316' : '#facc15',
              size: 4 + Math.random() * 4,
            });
          }
        }

        // Gravity & aerodynamics
        const aeroFactor = 1 - (up.aero - 1) * 0.042;
        const gravity = 38 * Math.max(0.62, aeroFactor);
        sim.vy -= gravity * dt;

        // Air drag
        const drag = Math.pow(0.992 + (up.aero - 1) * 0.0006, dt * 60);
        sim.vx *= drag;

        // Integrate position
        sim.x += sim.vx * dt;
        sim.y += sim.vy * dt;
        sim.maxAltitude = Math.max(sim.maxAltitude, sim.y);
        sim.rotation += (sim.vx * 0.08 + (sim.diving ? 12 : 0)) * dt;

        spawnObjectsUpTo(sim.x + 650, up.sponsor);

        // Check collisions with field objects
        for (const obj of sim.objects) {
          if (obj.used) continue;
          const dx = Math.abs(sim.x - obj.x);
          const dy = sim.y - (obj.y + obj.h * 0.5);
          if (dx < obj.w * 0.65 && Math.abs(dy) < obj.h * 0.75 + 2.5) {
            obj.used = true;
            const diveMult = sim.diving ? 1.35 : 1.0;

            if (obj.type === 'van') {
              sim.y = Math.max(sim.y, 2);
              sim.vy = Math.max(58, Math.abs(sim.vy) * 0.95 + 42) * diveMult;
              sim.vx = (sim.vx * 1.12 + 24) * diveMult;
              sim.fuel = Math.min(sim.maxFuel, sim.fuel + sim.maxFuel * 0.38);
              sim.bounces += 1;
              sim.bonusCoins += 28;
              sim.diving = false;
              sfx.playBounce(true);
              addBanner(
                diveMult > 1 ? 'STAMP BOUNCE! x1.35' : 'ボーナス支給車バウンド！',
                '燃料回復 +38% / 臨時賞与獲得',
                '#facc15'
              );
            } else if (obj.type === 'cannon') {
              sim.cannonLockTimer = 0.18;
              sim.vx = Math.max(125, sim.vx * 1.35 + 48) * diveMult;
              sim.vy = Math.max(68, Math.abs(sim.vy) * 0.6 + 58);
              sim.diving = false;
              sim.bounces += 1;
              sim.bonusCoins += 35;
              sfx.playCannon();
              addBanner('エナドリ砲台HYPER発射！', '超音速ブースト発動', '#38bdf8');
            } else if (obj.type === 'updraft') {
              sim.vy = Math.max(52, sim.vy + 54);
              sim.vx += 16;
              sim.fuel = Math.min(sim.maxFuel, sim.fuel + 18);
              sfx.playBounce(false);
              addBanner('有給上昇気流！', '高度＆燃料リフトアップ', '#34d399');
            } else if (obj.type === 'barrier') {
              if (isJetting || sim.diving || sim.vx > 115) {
                // Shatter barrier!
                sim.shattered += 1;
                sim.bonusCoins += 45;
                sim.vx *= 1.06;
                sim.vy = Math.max(32, Math.abs(sim.vy) * 0.85);
                sim.diving = false;
                sfx.playShatter();
                addBanner('残業ブロック粉砕！', '定時突破ボーナス +45G', '#fb7185');
              } else {
                // Slowed by barrier
                sim.vx *= 0.55;
                sim.vy = Math.max(18, Math.abs(sim.vy) * 0.5);
                sfx.playSlowHit();
                addBanner('残業ブロック接触...', 'ジェットまたは急降下で粉砕可能', '#f87171');
              }
            }

            // Burst particles
            for (let i = 0; i < 18; i++) {
              sim.particles.push({
                x: obj.x,
                y: obj.y + 3,
                vx: (Math.random() - 0.5) * 40,
                vy: Math.random() * 35,
                life: 0.55,
                maxLife: 0.55,
                color: obj.type === 'barrier' ? '#fb7185' : '#facc15',
                size: 4 + Math.random() * 4,
              });
            }
          }
        }

        if (sim.cannonLockTimer > 0) {
          sim.cannonLockTimer = Math.max(0, sim.cannonLockTimer - dt);
        }

        // Ground bounce
        if (sim.y <= 0) {
          sim.y = 0;
          const bounceRestitution = Math.min(0.86, 0.52 + (up.bounce - 1) * 0.036);
          const diveBoost = sim.diving ? 1.35 : 1.0;
          sim.diving = false;

          if (Math.abs(sim.vy) > 9) {
            sim.vy = Math.abs(sim.vy) * bounceRestitution * diveBoost;
            sim.vx = sim.vx * (0.86 + (up.bounce - 1) * 0.012) * (diveBoost > 1 ? 1.18 : 1.0);
            sim.bounces += 1;
            sfx.playBounce(diveBoost > 1);
            if (diveBoost > 1) {
              addBanner('急降下スタンプ着地！', '1.35x ハイパーバウンド', '#f43f5e');
            }
            for (let i = 0; i < 10; i++) {
              sim.particles.push({
                x: sim.x,
                y: 0.5,
                vx: (Math.random() - 0.5) * 24,
                vy: Math.random() * 18,
                life: 0.4,
                maxLife: 0.4,
                color: '#e2e8f0',
                size: 3 + Math.random() * 3,
              });
            }
          } else {
            sim.vy = 0;
            sim.vx *= Math.pow(0.88, dt * 60);
          }

          if (sim.vx < 3.2 && sim.vy < 2.0 && (!sim.jetActive || sim.fuel <= 0)) {
            sim.stoppedFrames += 1;
            if (sim.stoppedFrames > 28) {
              finishRun();
            }
          } else {
            sim.stoppedFrames = 0;
          }
        }

        // Update particles & banners
        for (const p of sim.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        }
        sim.particles = sim.particles.filter((p) => p.life > 0);

        for (const b of sim.banners) {
          b.life -= dt;
        }
        sim.banners = sim.banners.filter((b) => b.life > 0);

        hudTimer += dt;
        if (hudTimer >= 0.06) {
          hudTimer = 0;
          setHudState({
            distance: Math.round(sim.x),
            altitude: Math.max(0, Math.round(sim.y)),
            speed: Math.round(Math.hypot(sim.vx, sim.vy) * 3.6),
            fuel: Math.round(sim.fuel),
            maxFuel: sim.maxFuel,
            diveCooldown: Number(sim.diveCooldown.toFixed(1)),
            bounces: sim.bounces,
            shattered: sim.shattered,
            zoneName: getZoneInfo(sim.x).name,
            jetting: isJetting,
          });
        }
      }

      // 2. Render Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderScene(ctx, sim, curPhase, 1 + (up.tension - 1) * 0.12);
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [addBanner, finishRun, spawnObjectsUpTo]);

  const handleBuyUpgrade = (id: UpgradeId) => {
    const meta = UPGRADE_LIST.find((u) => u.id === id);
    if (!meta) return;
    const curLv = save.upgrades[id];
    if (curLv >= 10) return;
    const cost = getUpgradeCost(meta.baseCost, curLv);
    if (save.coins < cost) return;

    const nextUpgrades = { ...save.upgrades, [id]: curLv + 1 };
    const nextAchievements = new Set(save.achievements);
    if (curLv + 1 >= 10) nextAchievements.add('max_upgrade');

    sfx.playUpgrade();
    persistSave({
      ...save,
      coins: save.coins - cost,
      upgrades: nextUpgrades,
      achievements: Array.from(nextAchievements),
    });
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100 select-none">
      {/* Top Bar */}
      <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/games"
              className="rounded border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-bold text-stone-300 transition hover:border-amber-400 hover:text-amber-300"
            >
              ← 無料ゲーム一覧
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-amber-400">SHACHIKU CATAPULT / 18:00 SHARP</p>
              <h2 className="text-sm font-black sm:text-base">社畜ぶっとばし！定時退社カタパルト</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1 text-xs">
              <span className="text-stone-400">退職積立金: </span>
              <span className="font-black text-amber-300">{save.coins.toLocaleString()} G</span>
            </div>
            <div className="hidden rounded-lg border border-sky-500/30 bg-sky-950/30 px-3 py-1 text-xs sm:block">
              <span className="text-stone-400">最高飛距離: </span>
              <span className="font-black text-sky-300">{save.bestDistance.toLocaleString()} m</span>
            </div>
            <AudioToggle variant="compact" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left: Game Viewport */}
          <div className="flex flex-col gap-3">
            {phase === 'title' && (
              <div className="border border-stone-700 bg-stone-900 p-5 text-center sm:hidden">
                <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-300">
                  18:00 定時退社エクストリーム物理ミニゲーム
                </span>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                  社畜ぶっとばし！定時退社カタパルト
                </h2>
                <p className="mt-2 text-xs leading-6 text-stone-300">
                  角度とパワーを決めて大空へ。有給ジェットと急降下スタンプで10,000m先の南国リゾートを目指そう。
                </p>
                <button
                  type="button"
                  onClick={startLaunchSequence}
                  className="mt-4 w-full rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3.5 text-sm font-black text-stone-950 shadow-xl active:scale-[0.98]"
                >
                  発射準備をはじめる
                </button>
              </div>
            )}
            <div
              className="relative overflow-hidden rounded-xl border-2 border-stone-800 bg-stone-950 shadow-2xl"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                if (phase === 'aim_angle' || phase === 'aim_power' || phase === 'flying') {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  handlePrimaryActionDown();
                }
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handlePrimaryActionUp();
              }}
              onPointerCancel={handlePrimaryActionUp}
              onPointerLeave={() => handlePrimaryActionUp()}
              style={{ touchAction: 'none' }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="block aspect-[16/9] w-full cursor-pointer"
              />

              {/* HUD Overlay during Launch / Flight */}
              {(phase === 'aim_angle' || phase === 'aim_power' || phase === 'flying') && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-stone-400">DISTANCE</p>
                      <p className="font-mono text-xl font-black text-amber-300 sm:text-2xl">
                        {hudState.distance.toLocaleString()} <span className="text-xs">m</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400">ALTITUDE</p>
                      <p className="font-mono text-lg font-bold text-sky-300">
                        {hudState.altitude.toLocaleString()} <span className="text-xs">m</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400">SPEED</p>
                      <p className="font-mono text-lg font-bold text-emerald-300">
                        {hudState.speed} <span className="text-xs">km/h</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="rounded bg-stone-900/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30">
                      {hudState.zoneName}
                    </span>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-orange-300">有給ジェット燃料</span>
                      <div className="h-3 w-32 overflow-hidden rounded-full border border-stone-600 bg-stone-900">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-75"
                          style={{ width: `${Math.min(100, (hudState.fuel / Math.max(1, hudState.maxFuel)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aiming Gauge Instructions */}
              {(phase === 'aim_angle' || phase === 'aim_power') && (
                <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
                  <div className="rounded-xl border border-amber-400/60 bg-black/85 px-6 py-3 text-center shadow-xl">
                    <p className="text-xs font-bold tracking-wider text-amber-300">
                      {phase === 'aim_angle' ? 'STEP 1: 発射アングル決定 (15°〜75°)' : 'STEP 2: カタパルト出力決定 (88%以上でPERFECT!)'}
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {phase === 'aim_angle'
                        ? `現在角度: ${angleDeg}° — 画面クリック / タップ / Spaceでロック！`
                        : `現在パワー: ${powerPct}% — 画面クリック / タップ / Spaceで発射！`}
                    </p>
                  </div>
                </div>
              )}

              {/* Active Flight Controls */}
              {phase === 'flying' && (
                <div className="absolute inset-x-0 bottom-3 hidden items-center justify-between px-4 sm:flex">
                  <div className="pointer-events-none rounded-lg border border-stone-700/80 bg-black/70 px-3 py-1.5 text-xs text-stone-200">
                    長押し / Spaceホールド: <span className="font-bold text-amber-300">有給ジェット噴射</span>
                  </div>
                  <button
                    type="button"
                    disabled={hudState.diveCooldown > 0 || hudState.altitude <= 3}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      triggerDiveStamp();
                    }}
                    className={`rounded-xl border-2 px-4 py-2 text-xs font-black shadow-lg transition sm:text-sm ${
                      hudState.diveCooldown > 0 || hudState.altitude <= 3
                        ? 'cursor-not-allowed border-stone-700 bg-stone-900/80 text-stone-500'
                        : 'border-rose-400 bg-gradient-to-r from-rose-600 to-orange-600 text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    {hudState.diveCooldown > 0
                      ? `急降下スタンプ (${hudState.diveCooldown}s)`
                      : '急降下スタンプ [S / ↓] (1.35x バウンド)'}
                  </button>
                </div>
              )}

              {/* Title Overlay */}
              {phase === 'title' && (
                <div className="absolute inset-0 hidden flex-col items-center justify-center bg-black/75 p-6 text-center backdrop-blur-sm sm:flex">
                  <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                    18:00 定時退社エクストリーム物理ミニゲーム
                  </span>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
                    社畜ぶっとばし！定時退社カタパルト
                  </h2>
                  <p className="mt-2 max-w-lg text-xs leading-relaxed text-stone-300 sm:text-sm">
                    ブラック企業本社50階の屋上カタパルトから定時退社！角度とパワーを決めて大空へ飛び出し、有給ジェットパックと急降下スタンプを駆使して10,000m先の南国リゾート島を目指そう。
                  </p>
                  <button
                    type="button"
                    onClick={startLaunchSequence}
                    className="mt-6 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3.5 text-base font-black text-stone-950 shadow-xl transition hover:scale-105 active:scale-95"
                  >
                    定時退社カタパルト発射準備 [SPACE / CLICK]
                  </button>
                </div>
              )}

              {/* Result Overlay */}
              {phase === 'result' && summary && (
                <div className="absolute inset-0 hidden flex-col items-center justify-center bg-black/85 p-5 text-center backdrop-blur-md sm:flex">
                  <p className="text-xs font-bold tracking-widest text-amber-400">{summary.zoneReached}</p>
                  <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    退社フライト完了：飛距離 {summary.distance.toLocaleString()} m
                  </h3>
                  {summary.newRecord && (
                    <span className="mt-1 inline-block rounded bg-rose-600 px-2.5 py-0.5 text-xs font-black text-white">
                      NEW RECORD! 自己ベスト更新
                    </span>
                  )}

                  <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-2 rounded-xl border border-stone-700 bg-stone-900/90 p-3 text-xs sm:grid-cols-4">
                    <div>
                      <p className="text-stone-400">最大高度</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-sky-300">{summary.maxAltitude} m</p>
                    </div>
                    <div>
                      <p className="text-stone-400">バウンド数</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-emerald-300">{summary.bounces} 回</p>
                    </div>
                    <div>
                      <p className="text-stone-400">残業粉砕</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-rose-300">{summary.shattered} 個</p>
                    </div>
                    <div>
                      <p className="text-stone-400">獲得積立金</p>
                      <p className="mt-0.5 font-mono text-sm font-black text-amber-300">+{summary.earnedCoins} G</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-stone-400">
                    右側の「定時退社格納庫」で装備をアップグレードして、さらなる飛距離を目指そう！
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={startLaunchSequence}
                      className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-7 py-2.5 text-sm font-black text-stone-950 shadow-lg transition hover:scale-105"
                    >
                      もう一度ぶっとばす [SPACE]
                    </button>
                  </div>
                </div>
              )}
            </div>

            {phase === 'flying' && (
              <div className="grid grid-cols-2 gap-2 sm:hidden">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    handlePrimaryActionDown();
                  }}
                  onPointerUp={handlePrimaryActionUp}
                  onPointerCancel={handlePrimaryActionUp}
                  className="rounded-xl border-2 border-amber-300 bg-amber-500 px-3 py-3 text-xs font-black text-stone-950 shadow-lg active:scale-95"
                  style={{ touchAction: 'none' }}
                >
                  有給ジェット（長押し）
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    triggerDiveStamp();
                  }}
                  disabled={hudState.diveCooldown > 0 || hudState.altitude <= 3}
                  className={`rounded-xl border-2 px-3 py-3 text-xs font-black shadow-lg ${
                    hudState.diveCooldown > 0 || hudState.altitude <= 3
                      ? 'border-stone-700 bg-stone-900 text-stone-500'
                      : 'border-rose-300 bg-rose-600 text-white active:scale-95'
                  }`}
                >
                  {hudState.diveCooldown > 0 ? `急降下 ${hudState.diveCooldown}s` : '急降下スタンプ'}
                </button>
              </div>
            )}

            {phase === 'result' && summary && (
              <div className="border border-stone-700 bg-stone-900 p-4 text-center sm:hidden">
                <p className="text-[10px] font-bold tracking-widest text-amber-400">{summary.zoneReached}</p>
                <h3 className="mt-1 text-xl font-black text-white">
                  飛距離 {summary.distance.toLocaleString()} m
                </h3>
                {summary.newRecord && <p className="mt-1 text-xs font-black text-rose-300">NEW RECORD!</p>}
                <div className="mt-3 grid grid-cols-2 gap-2 text-left text-[11px]">
                  <div className="border border-stone-700 bg-stone-950 p-2"><p className="text-stone-400">最大高度</p><p className="font-mono font-black text-sky-300">{summary.maxAltitude} m</p></div>
                  <div className="border border-stone-700 bg-stone-950 p-2"><p className="text-stone-400">バウンド</p><p className="font-mono font-black text-emerald-300">{summary.bounces} 回</p></div>
                  <div className="border border-stone-700 bg-stone-950 p-2"><p className="text-stone-400">残業粉砕</p><p className="font-mono font-black text-rose-300">{summary.shattered} 個</p></div>
                  <div className="border border-stone-700 bg-stone-950 p-2"><p className="text-stone-400">獲得積立金</p><p className="font-mono font-black text-amber-300">+{summary.earnedCoins} G</p></div>
                </div>
                <button
                  type="button"
                  onClick={startLaunchSequence}
                  className="mt-3 w-full rounded-xl border-2 border-amber-300 bg-amber-500 px-4 py-3 text-sm font-black text-stone-950 active:scale-[0.98]"
                >
                  もう一度ぶっとばす
                </button>
              </div>
            )}

            {/* Field Guide Legend */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-amber-500/20 bg-stone-950/70 p-2.5">
                <p className="font-black text-amber-300">ボーナス支給車</p>
                <p className="mt-0.5 text-[11px] text-stone-400">特大トランポリン跳躍＋ジェット燃料38%回復</p>
              </div>
              <div className="rounded-lg border border-sky-500/20 bg-stone-950/70 p-2.5">
                <p className="font-black text-sky-300">エナドリ砲台</p>
                <p className="mt-0.5 text-[11px] text-stone-400">社員を装填して斜め上空へ超音速ブラスト発射</p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-stone-950/70 p-2.5">
                <p className="font-black text-emerald-300">有給上昇気流</p>
                <p className="mt-0.5 text-[11px] text-stone-400">上空の気流に乗って高度と燃料を同時回復</p>
              </div>
              <div className="rounded-lg border border-rose-500/20 bg-stone-950/70 p-2.5">
                <p className="font-black text-rose-300">残業ブロック</p>
                <p className="mt-0.5 text-[11px] text-stone-400">通常接触で減速。ジェット噴射or急降下で粉砕ボーナス！</p>
              </div>
            </div>
          </div>

          {/* Right: Upgrade Hangar & Achievements */}
          <aside className="flex flex-col gap-4 rounded-xl border border-stone-800 bg-stone-900/80 p-4">
            <div>
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <h3 className="text-sm font-black tracking-wide text-amber-300">定時退社格納庫（恒久強化）</h3>
                <span className="font-mono text-xs font-bold text-stone-400">所持: {save.coins.toLocaleString()} G</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {UPGRADE_LIST.map((u) => {
                  const lv = save.upgrades[u.id];
                  const isMax = lv >= 10;
                  const cost = getUpgradeCost(u.baseCost, lv);
                  const canAfford = !isMax && save.coins >= cost;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 bg-stone-950/90 p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-stone-100">{u.name}</span>
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                            Lv.{lv}/10
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-stone-400">
                          {u.desc} ({u.unit})
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => handleBuyUpgrade(u.id)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                          isMax
                            ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                            : canAfford
                            ? 'bg-amber-400 text-stone-950 hover:bg-amber-300'
                            : 'border border-stone-800 bg-stone-900 text-stone-500'
                        }`}
                      >
                        {isMax ? 'MAX' : `${cost.toLocaleString()} G`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Achievements */}
            <div className="border-t border-stone-800 pt-3">
              <h3 className="text-xs font-black tracking-wide text-stone-300">
                退社マイルストーン実績 ({save.achievements.length}/{ACHIEVEMENTS.length})
              </h3>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {ACHIEVEMENTS.map((ach) => {
                  const unlocked = save.achievements.includes(ach.id);
                  return (
                    <div
                      key={ach.id}
                      className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-[11px] ${
                        unlocked
                          ? 'border-amber-500/40 bg-amber-950/25 text-amber-200'
                          : 'border-stone-800/80 bg-stone-950/50 text-stone-500'
                      }`}
                    >
                      <span className="font-bold">{ach.title}</span>
                      <span>{unlocked ? '達成済' : ach.cond}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function renderScene(
  ctx: CanvasRenderingContext2D,
  sim: {
    angleDeg: number;
    powerPct: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    jetActive: boolean;
    fuel: number;
    diving: boolean;
    objects: FieldObject[];
    particles: Particle[];
    banners: FloatingBanner[];
  },
  phase: string,
  tensionMult: number
) {
  const zone = getZoneInfo(sim.x);

  // Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  skyGrad.addColorStop(0, zone.skyTop);
  skyGrad.addColorStop(1, zone.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Camera tracking (6px per meter, scales down slightly at very high altitude)
  const scale = sim.y > 65 ? Math.max(2.6, 6 - (sim.y - 65) * 0.025) : 6;
  const camX = sim.x;
  const camY = Math.max(0, sim.y - 32);

  const worldToScreenX = (wx: number) => 170 + (wx - camX) * scale;
  const worldToScreenY = (wy: number) => GROUND_Y - (wy - camY) * scale;

  // Parallax Distant Skyline / Viaduct / Resort
  ctx.fillStyle = 'rgba(10, 12, 22, 0.45)';
  for (let i = -2; i < 14; i++) {
    const bIndex = Math.floor((camX * 0.25) / 45) + i;
    const bx = ((bIndex * 45 - camX * 0.25) * 3.5) % (CANVAS_W + 240);
    const drawX = bx < -120 ? bx + CANVAS_W + 240 : bx;
    const bh = 70 + Math.abs(Math.sin(bIndex * 1.7)) * 130;
    const by = worldToScreenY(0) - bh;
    ctx.fillRect(drawX, by, 78, bh + 200);
  }

  // Milestone markers every 500m
  const firstMarker = Math.max(500, Math.floor((camX - 40) / 500) * 500);
  for (let mx = firstMarker; mx < camX + 260; mx += 500) {
    const sx = worldToScreenX(mx);
    const sy = worldToScreenY(0);
    ctx.strokeStyle = mx === 5000 || mx === 10000 ? '#facc15' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = mx === 5000 || mx === 10000 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy - 75);
    ctx.stroke();

    ctx.fillStyle = mx === 5000 || mx === 10000 ? '#facc15' : '#e2e8f0';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(mx === 5000 ? '5,000m RESORT' : mx === 10000 ? '10,000m PARADISE' : `${mx}m`, sx, sy - 82);
  }

  // Ground surface
  const groundScreenY = worldToScreenY(0);
  if (groundScreenY < CANVAS_H) {
    ctx.fillStyle = sim.x >= 5000 ? '#065f46' : '#18181b';
    ctx.fillRect(0, groundScreenY, CANVAS_W, CANVAS_H - groundScreenY);
    ctx.fillStyle = zone.accent;
    ctx.fillRect(0, groundScreenY, CANVAS_W, 4);
  }

  // HQ Rooftop & Catapult at x = 0
  const hqX = worldToScreenX(0);
  const hqY = worldToScreenY(18);
  if (hqX > -200 && hqX < CANVAS_W + 100) {
    ctx.fillStyle = '#27272a';
    ctx.fillRect(hqX - 65, hqY, 95, groundScreenY - hqY + 80);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(hqX - 65, hqY, 95, groundScreenY - hqY);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BLACK CORP 50F', hqX - 18, hqY + 22);

    // Catapult Arm
    const rad = (sim.angleDeg * Math.PI) / 180;
    ctx.save();
    ctx.translate(hqX, hqY);
    ctx.rotate(-rad);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-6, -5, 48, 10);
    ctx.restore();

    // Angle & Power HUD Arc when aiming
    if (phase === 'aim_angle' || phase === 'aim_power') {
      ctx.save();
      ctx.translate(hqX, hqY);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 72, (-75 * Math.PI) / 180, (-15 * Math.PI) / 180);
      ctx.stroke();

      // Pointer ray
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(-rad) * 86, Math.sin(-rad) * 86);
      ctx.stroke();

      // Power bar
      if (phase === 'aim_power') {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(-50, -115, 120, 16);
        ctx.fillStyle = sim.powerPct >= 88 ? '#f43f5e' : '#facc15';
        ctx.fillRect(-48, -113, (116 * sim.powerPct) / 100, 12);
      }
      ctx.restore();

      // Approximate trajectory preview
      const previewPower = phase === 'aim_power' ? sim.powerPct : 55;
      const previewSpeed = 88 * tensionMult * Math.max(0.25, previewPower / 100);
      let tx = 0;
      let ty = 18;
      let tvx = Math.cos(rad) * previewSpeed;
      let tvy = Math.sin(rad) * previewSpeed;
      for (let i = 0; i < 30; i++) {
        const t = 0.09;
        tvy -= 38 * t;
        tx += tvx * t;
        ty += tvy * t;
        if (ty < 0) break;
        const txScreen = worldToScreenX(tx);
        const tyScreen = worldToScreenY(ty);
        if (txScreen < -10 || txScreen > CANVAS_W + 10) break;
        ctx.fillStyle = `rgba(250, 204, 21, ${Math.max(0.08, 0.52 - i * 0.015)})`;
        ctx.beginPath();
        ctx.arc(txScreen, tyScreen, Math.max(1.4, 3.6 - i * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Render Field Objects
  for (const obj of sim.objects) {
    if (obj.used) continue;
    const ox = worldToScreenX(obj.x);
    const oy = worldToScreenY(obj.y);
    if (ox < -120 || ox > CANVAS_W + 120) continue;

    ctx.save();
    ctx.translate(ox, oy);
    if (obj.type === 'van') {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-34, -26, 68, 22);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-28, -32, 56, 6);
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BONUS VAN', 0, -12);
    } else if (obj.type === 'cannon') {
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, -18, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(0, -18);
      ctx.rotate(-0.6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, -9, 32, 18);
      ctx.restore();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CANNON', 0, 8);
    } else if (obj.type === 'updraft') {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
      ctx.lineWidth = 2.5;
      for (let w = -12; w <= 12; w += 12) {
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(w, -80);
        ctx.stroke();
      }
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('UPDRAFT', 0, -86);
    } else if (obj.type === 'barrier') {
      ctx.fillStyle = '#be123c';
      ctx.fillRect(-22, -46, 44, 46);
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -46, 44, 46);
      ctx.fillStyle = '#fff1f2';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('残業壁', 0, -20);
    }
    ctx.restore();
  }

  // Particles
  for (const p of sim.particles) {
    const px = worldToScreenX(p.x);
    const py = worldToScreenY(p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Player Salaryman
  const px = worldToScreenX(sim.x);
  const py = worldToScreenY(sim.y);
  ctx.save();
  ctx.translate(px, py - 12);
  ctx.rotate(phase === 'flying' ? sim.rotation : (-sim.angleDeg * Math.PI) / 180);

  // Dive aura
  if (sim.diving) {
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Jetpack cylinder
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-14, -10, 10, 18);

  // Suit torso
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-8, -12, 18, 22);

  // Head
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(2, -18, 8, 0, Math.PI * 2);
  ctx.fill();

  // Red aerodynamic tie fluttering
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, -10);
  ctx.lineTo(-18, -14);
  ctx.stroke();

  // Briefcase
  ctx.fillStyle = '#b45309';
  ctx.fillRect(8, -2, 12, 9);
  ctx.restore();

  // Floating Banners
  let bannerY = 92;
  for (const b of sim.banners) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life);
    ctx.font = '900 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, CANVAS_W / 2, bannerY);
    if (b.subText) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(b.subText, CANVAS_W / 2, bannerY + 18);
    }
    ctx.restore();
    bannerY += 42;
  }
}
