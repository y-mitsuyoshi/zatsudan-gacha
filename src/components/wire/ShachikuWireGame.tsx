'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import { getAudioSettings } from '@/game/common/audioSettings';

const STORAGE_KEY = 'shachiku-wire-v1';
const CANVAS_W = 960;
const CANVAS_H = 540;
const DANGER_Y = 495;

type CourseId = 'stage1' | 'stage2' | 'endless';

interface CourseConfig {
  id: CourseId;
  name: string;
  subtitle: string;
  targetDist: number; // meters (Infinity for endless)
  skyTop: string;
  skyBottom: string;
  accent: string;
}

const COURSES: CourseConfig[] = [
  {
    id: 'stage1',
    name: 'Stage 1: 都心オフィス街 (1,200m)',
    subtitle: '23:55発 山手最終ライナーへ飛び乗れ',
    targetDist: 1200,
    skyTop: '#090d1a',
    skyBottom: '#1e1b4b',
    accent: '#22d3ee',
  },
  {
    id: 'stage2',
    name: 'Stage 2: 湾岸ハイウェイ＆高架橋 (2,500m)',
    subtitle: '00:10発 湾岸深夜エクスプレスを追跡せよ',
    targetDist: 2500,
    skyTop: '#0c0a1d',
    skyBottom: '#3b0764',
    accent: '#e879f9',
  },
  {
    id: 'endless',
    name: 'Endless: 無限終電チェイス (距離アタック)',
    subtitle: 'どこまでも続く摩天楼をスイングし続けろ',
    targetDist: Number.POSITIVE_INFINITY,
    skyTop: '#04121c',
    skyBottom: '#0f172a',
    accent: '#38bdf8',
  },
];

interface WireSaveData {
  bestDistance: Record<CourseId, number>;
  bestScore: Record<CourseId, number>;
  bestCombo: number;
  clearedCourses: CourseId[];
  totalPerfects: number;
}

const DEFAULT_WIRE_SAVE: WireSaveData = {
  bestDistance: { stage1: 0, stage2: 0, endless: 0 },
  bestScore: { stage1: 0, stage2: 0, endless: 0 },
  bestCombo: 0,
  clearedCourses: [],
  totalPerfects: 0,
};

interface AnchorPoint {
  id: number;
  x: number; // world px (6px = 1m)
  y: number; // screen y (80..220)
  kind: 'neon' | 'crane' | 'drone';
}

interface WifiRing {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

interface SonicRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  life: number;
}

interface RibbonPoint {
  x: number;
  y: number;
  life: number;
}

interface WireBanner {
  id: number;
  text: string;
  sub?: string;
  color: string;
  life: number;
}

class WireSoundEngine {
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

  playTone(freq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', gainScale = 0.25) {
    const settings = getAudioSettings();
    if (!settings.se) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), now + duration);

    const vol = Math.max(0.001, gainScale * settings.seVolume);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playGrappleAttach() {
    this.playTone(340, 920, 0.12, 'triangle', 0.24);
  }

  playRelease(perfect: boolean) {
    if (perfect) {
      this.playTone(540, 1280, 0.2, 'square', 0.28);
      setTimeout(() => this.playTone(810, 1620, 0.22, 'triangle', 0.25), 55);
    } else {
      this.playTone(420, 620, 0.11, 'sine', 0.18);
    }
  }

  playWifiRing() {
    this.playTone(660, 1320, 0.16, 'sine', 0.28);
    setTimeout(() => this.playTone(990, 1760, 0.18, 'triangle', 0.25), 60);
  }

  playAirDash() {
    this.playTone(220, 880, 0.22, 'sawtooth', 0.3);
  }

  playSafetyTrampoline() {
    this.playTone(160, 740, 0.28, 'sine', 0.32);
  }

  playClear() {
    this.playTone(523, 1046, 0.22, 'triangle', 0.3);
    setTimeout(() => this.playTone(659, 1318, 0.25, 'triangle', 0.3), 100);
    setTimeout(() => this.playTone(784, 1568, 0.35, 'square', 0.3), 210);
  }
}

const sfx = new WireSoundEngine();

export default function ShachikuWireGame() {
  const [save, setSave] = useState<WireSaveData>(DEFAULT_WIRE_SAVE);
  const [courseId, setCourseId] = useState<CourseId>('stage1');
  const [phase, setPhase] = useState<'title' | 'playing' | 'cleared' | 'gameover'>('title');
  const [hud, setHud] = useState({
    distanceM: 0,
    targetM: 1200,
    score: 0,
    combo: 0,
    dashCharges: 1,
    swingProgress: 0,
    safetyNets: 1,
    speedKmh: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const courseRef = useRef<CourseConfig>(COURSES[0]);
  courseRef.current = COURSES.find((c) => c.id === courseId) ?? COURSES[0];
  const saveRef = useRef(save);
  saveRef.current = save;

  const simRef = useRef({
    x: 120, // world px (6px = 1m)
    y: 230, // screen y
    vx: 360, // px/s
    vy: -40, // px/s
    tetheredTo: null as AnchorPoint | null,
    ropeLen: 150,
    combo: 0,
    maxCombo: 0,
    score: 0,
    swingsCount: 0,
    dashCharges: 1,
    safetyNets: 2,
    perfectCount: 0,
    nextAnchorX: 280,
    anchors: [] as AnchorPoint[],
    rings: [] as WifiRing[],
    sonicRings: [] as SonicRing[],
    ribbon: [] as RibbonPoint[],
    banners: [] as WireBanner[],
  });

  useBgm(phase === 'playing' ? 'danmaku-stage' : 'shachiku-menu');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<WireSaveData>;
        setSave({
          bestDistance: {
            stage1: p.bestDistance?.stage1 ?? 0,
            stage2: p.bestDistance?.stage2 ?? 0,
            endless: p.bestDistance?.endless ?? 0,
          },
          bestScore: {
            stage1: p.bestScore?.stage1 ?? 0,
            stage2: p.bestScore?.stage2 ?? 0,
            endless: p.bestScore?.endless ?? 0,
          },
          bestCombo: p.bestCombo ?? 0,
          clearedCourses: Array.isArray(p.clearedCourses) ? p.clearedCourses : [],
          totalPerfects: p.totalPerfects ?? 0,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistSave = useCallback((next: WireSaveData) => {
    setSave(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addBanner = useCallback((text: string, sub: string | undefined, color: string) => {
    simRef.current.banners.push({
      id: Date.now() + Math.random(),
      text,
      sub,
      color,
      life: 1.35,
    });
  }, []);

  const spawnWorldAhead = useCallback((upToPx: number) => {
    const sim = simRef.current;
    const kinds: AnchorPoint['kind'][] = ['neon', 'crane', 'drone'];
    while (sim.nextAnchorX < upToPx) {
      const ax = sim.nextAnchorX + (Math.random() * 44 - 22);
      const ay = 78 + Math.random() * 115;
      sim.anchors.push({
        id: Math.round(ax) + sim.anchors.length,
        x: ax,
        y: ay,
        kind: kinds[sim.anchors.length % kinds.length],
      });

      if (Math.random() < 0.58) {
        sim.rings.push({
          id: Math.round(ax) + sim.rings.length + 10000,
          x: ax + 115,
          y: 165 + Math.random() * 155,
          radius: 26,
          collected: false,
        });
      }

      sim.nextAnchorX += 235 + Math.random() * 45;
    }

    sim.anchors = sim.anchors.filter((a) => a.x > sim.x - 500);
    sim.rings = sim.rings.filter((r) => r.x > sim.x - 500);
  }, []);

  const startCourse = useCallback(
    (targetCourseId?: CourseId) => {
      const activeId = targetCourseId ?? courseId;
      if (targetCourseId) setCourseId(targetCourseId);
      const c = COURSES.find((item) => item.id === activeId) ?? COURSES[0];

      simRef.current = {
        x: 90,
        y: 220,
        vx: 390,
        vy: -60,
        tetheredTo: null,
        ropeLen: 150,
        combo: 0,
        maxCombo: 0,
        score: 0,
        swingsCount: 0,
        dashCharges: 1,
        safetyNets: 2,
        perfectCount: 0,
        nextAnchorX: 250,
        anchors: [],
        rings: [],
        sonicRings: [],
        ribbon: [],
        banners: [],
      };
      spawnWorldAhead(2800);
      setHud({
        distanceM: 0,
        targetM: c.targetDist,
        score: 0,
        combo: 0,
        dashCharges: 1,
        swingProgress: 0,
        safetyNets: 2,
        speedKmh: 65,
      });
      setPhase('playing');
    },
    [courseId, spawnWorldAhead]
  );

  const attachWire = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const sim = simRef.current;
    if (sim.tetheredTo) return;

    // Pick best overhead anchor slightly ahead of or above player
    let best: AnchorPoint | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const a of sim.anchors) {
      const dx = a.x - sim.x;
      const dy = a.y - sim.y;
      if (dx > -60 && dx < 420 && dy < 40) {
        const dist = Math.hypot(dx, dy);
        const score = Math.abs(dx - 135) + dist * 0.35;
        if (score < bestScore) {
          bestScore = score;
          best = a;
        }
      }
    }

    if (best) {
      sim.tetheredTo = best;
      sim.ropeLen = Math.max(85, Math.min(245, Math.hypot(sim.x - best.x, sim.y - best.y)));
      sim.swingsCount += 1;
      if (sim.swingsCount % 3 === 0 && sim.dashCharges < 3) {
        sim.dashCharges += 1;
        addBanner('緊急エアダッシュ +1 チャージ！', 'Shift / 右下ボタンで発動可能', '#38bdf8');
      }
      sfx.playGrappleAttach();
    }
  }, [addBanner]);

  const releaseWire = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const sim = simRef.current;
    if (!sim.tetheredTo) return;

    sim.tetheredTo = null;
    // Check upward velocity angle: in screen coords, upward means vy < 0
    const upwardDeg = (Math.atan2(-sim.vy, Math.max(10, sim.vx)) * 180) / Math.PI;
    const isPerfect = upwardDeg >= 15 && upwardDeg <= 55 && sim.vx > 180;

    if (isPerfect) {
      sim.combo += 1;
      sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
      sim.perfectCount += 1;
      sim.vx = Math.min(780, sim.vx * 1.24 + 95);
      sim.vy = Math.min(-260, sim.vy * 1.18 - 75);
      const pts = 250 * sim.combo;
      sim.score += pts;

      sim.sonicRings.push({
        x: sim.x,
        y: sim.y,
        r: 10,
        maxR: 78,
        color: '#22d3ee',
        life: 0.45,
      });
      sfx.playRelease(true);
      addBanner(`PERFECT RELEASE! (${Math.round(upwardDeg)}°)`, `${sim.combo} COMBO / +${pts} PTS`, '#22d3ee');
    } else {
      if (upwardDeg < 5) {
        sim.combo = 0;
      }
      sim.vx = Math.max(240, sim.vx * 1.05);
      sfx.playRelease(false);
    }
  }, [addBanner]);

  const triggerAirDash = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const sim = simRef.current;
    if (sim.dashCharges <= 0) return;

    sim.dashCharges -= 1;
    sim.tetheredTo = null;
    sim.vx = Math.max(620, sim.vx + 240);
    sim.vy = -210;
    sim.score += 180;
    sim.sonicRings.push({
      x: sim.x,
      y: sim.y,
      r: 12,
      maxR: 90,
      color: '#facc15',
      life: 0.5,
    });
    sfx.playAirDash();
    addBanner('緊急エアダッシュ発動！', '水平超加速ブースト', '#facc15');
  }, [addBanner]);

  const finalizeRun = useCallback(
    (cleared: boolean) => {
      const sim = simRef.current;
      const curCourse = courseRef.current;
      const curSave = saveRef.current;
      const distM = Math.min(
        Number.isFinite(curCourse.targetDist) && cleared ? curCourse.targetDist : Math.floor(sim.x / 6),
        Math.floor(sim.x / 6)
      );
      const finalDist = cleared && Number.isFinite(curCourse.targetDist) ? curCourse.targetDist : distM;
      const finalScore = Math.round(sim.score + finalDist * 10 + (cleared ? 3000 : 0));

      const nextCleared = new Set(curSave.clearedCourses);
      if (cleared) nextCleared.add(curCourse.id);

      const nextSave: WireSaveData = {
        bestDistance: {
          ...curSave.bestDistance,
          [curCourse.id]: Math.max(curSave.bestDistance[curCourse.id] ?? 0, finalDist),
        },
        bestScore: {
          ...curSave.bestScore,
          [curCourse.id]: Math.max(curSave.bestScore[curCourse.id] ?? 0, finalScore),
        },
        bestCombo: Math.max(curSave.bestCombo, sim.maxCombo),
        clearedCourses: Array.from(nextCleared),
        totalPerfects: curSave.totalPerfects + sim.perfectCount,
      };
      persistSave(nextSave);

      if (cleared) sfx.playClear();
      setPhase(cleared ? 'cleared' : 'gameover');
    },
    [persistSave]
  );

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!e.repeat) {
          if (phaseRef.current === 'title') {
            startCourse();
          } else if (phaseRef.current === 'playing') {
            attachWire();
          }
        }
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyD') {
        if (phaseRef.current === 'playing') {
          e.preventDefault();
          triggerAirDash();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (phaseRef.current === 'playing') {
          releaseWire();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [attachWire, releaseWire, startCourse, triggerAirDash]);

  // 60fps simulation loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudTimer = 0;

    const step = (now: number) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;

      const sim = simRef.current;
      const curCourse = courseRef.current;

      if (phaseRef.current === 'playing') {
        const gravity = 690; // px/s^2 downward

        if (sim.tetheredTo) {
          const anchor = sim.tetheredTo;
          sim.vy += gravity * dt;
          // Active swing pump boost so swinging feels fast and commercial
          sim.vx += 260 * dt;

          sim.x += sim.vx * dt;
          sim.y += sim.vy * dt;

          const dx = sim.x - anchor.x;
          const dy = sim.y - anchor.y;
          const dist = Math.max(1, Math.hypot(dx, dy));

          if (dist > sim.ropeLen) {
            const nx = dx / dist;
            const ny = dy / dist;
            sim.x = anchor.x + nx * sim.ropeLen;
            sim.y = anchor.y + ny * sim.ropeLen;

            // Remove radial outward velocity component (pendulum constraint)
            const radialVel = sim.vx * nx + sim.vy * ny;
            if (radialVel > 0) {
              sim.vx -= radialVel * nx;
              sim.vy -= radialVel * ny;
            }
            // Add tangential swing momentum
            const tx = ny;
            const ty = -nx;
            const tangVel = sim.vx * tx + sim.vy * ty;
            if (tangVel > 0) {
              sim.vx += tx * 85 * dt;
              sim.vy += ty * 85 * dt;
            }
          }

          // Auto-release if player swings far past the anchor
          if (sim.x - anchor.x > sim.ropeLen * 0.92 && sim.y < anchor.y + 25) {
            releaseWire();
          }
        } else {
          sim.vy += gravity * dt;
          sim.vx *= Math.pow(0.996, dt * 60);
          sim.x += sim.vx * dt;
          sim.y += sim.vy * dt;
        }

        // Ceiling clamp
        if (sim.y < 36) {
          sim.y = 36;
          sim.vy = Math.max(0, sim.vy);
        }

        // Spawn ahead
        spawnWorldAhead(sim.x + 2200);

        // Golden Wi-Fi Ring collisions
        for (const r of sim.rings) {
          if (r.collected) continue;
          if (Math.hypot(sim.x - r.x, sim.y - r.y) < r.radius + 22) {
            r.collected = true;
            sim.combo += 1;
            sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
            sim.vx = Math.max(580, sim.vx * 1.2 + 110);
            sim.vy = Math.min(-140, sim.vy - 95);
            const ringPts = 300 * Math.max(1, sim.combo);
            sim.score += ringPts;
            sim.sonicRings.push({
              x: r.x,
              y: r.y,
              r: 12,
              maxR: 72,
              color: '#facc15',
              life: 0.45,
            });
            sfx.playWifiRing();
            addBanner('GOLDEN Wi-Fi BOOST!', `+${ringPts} PTS / 高速通信ターボ`, '#facc15');
          }
        }

        // Safety Net or Danger Line
        if (sim.y >= DANGER_Y) {
          if (sim.safetyNets > 0) {
            sim.safetyNets -= 1;
            sim.tetheredTo = null;
            sim.y = DANGER_Y - 12;
            sim.vy = -520;
            sim.vx = Math.max(410, sim.vx);
            sfx.playSafetyTrampoline();
            addBanner('始末書トランポリン発動！', `緊急復帰成功（残り保険 ${sim.safetyNets}回）`, '#34d399');
          } else {
            finalizeRun(false);
          }
        }

        // Check Course Goal (Last Train Reached!)
        const distM = Math.floor(sim.x / 6);
        if (Number.isFinite(curCourse.targetDist) && distM >= curCourse.targetDist) {
          finalizeRun(true);
        }

        // Ribbon trail
        sim.ribbon.push({ x: sim.x, y: sim.y, life: 0.35 });
        for (const pt of sim.ribbon) pt.life -= dt;
        sim.ribbon = sim.ribbon.filter((pt) => pt.life > 0);

        // Sonic rings & banners
        for (const sr of sim.sonicRings) {
          sr.r += (sr.maxR - sr.r) * 8 * dt;
          sr.life -= dt;
        }
        sim.sonicRings = sim.sonicRings.filter((sr) => sr.life > 0);

        for (const b of sim.banners) b.life -= dt;
        sim.banners = sim.banners.filter((b) => b.life > 0);

        hudTimer += dt;
        if (hudTimer >= 0.06) {
          hudTimer = 0;
          setHud({
            distanceM: distM,
            targetM: curCourse.targetDist,
            score: Math.round(sim.score + distM * 10),
            combo: sim.combo,
            dashCharges: sim.dashCharges,
            swingProgress: sim.swingsCount % 3,
            safetyNets: sim.safetyNets,
            speedKmh: Math.round(Math.hypot(sim.vx, sim.vy) * 0.18),
          });
        }
      }

      // Render Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderWireScene(ctx, sim, curCourse);
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [addBanner, finalizeRun, releaseWire, spawnWorldAhead]);

  const activeCourse = COURSES.find((c) => c.id === courseId) ?? COURSES[0];

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 select-none">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/games"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              ← 無料ゲーム一覧
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-cyan-400">SHACHIKU WIRE / LAST TRAIN SWING</p>
              <h2 className="text-sm font-black sm:text-base">社畜ワイヤー疾走：終電スイングアクション</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-xs">
              <span className="text-slate-400">最大コンボ: </span>
              <span className="font-black text-cyan-300">{save.bestCombo} COMBO</span>
            </div>
            <AudioToggle variant="compact" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Game Canvas Area */}
          <div className="flex flex-col gap-3">
            <div
              className="relative overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-950 shadow-2xl"
              onMouseDown={(e) => {
                if (e.button === 2) {
                  e.preventDefault();
                  triggerAirDash();
                } else if (phase === 'playing') {
                  attachWire();
                }
              }}
              onMouseUp={() => {
                if (phase === 'playing') releaseWire();
              }}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={(e) => {
                if (phase === 'playing') {
                  e.preventDefault();
                  attachWire();
                }
              }}
              onTouchEnd={() => {
                if (phase === 'playing') releaseWire();
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="block aspect-[16/9] w-full cursor-pointer"
              />

              {/* HUD */}
              {phase === 'playing' && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent p-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">DISTANCE</p>
                      <p className="font-mono text-xl font-black text-cyan-300 sm:text-2xl">
                        {hud.distanceM.toLocaleString()}
                        {Number.isFinite(hud.targetM) ? (
                          <span className="text-xs text-slate-400"> / {hud.targetM}m</span>
                        ) : (
                          <span className="text-xs"> m</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">SCORE</p>
                      <p className="font-mono text-lg font-bold text-amber-300">{hud.score.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">COMBO</p>
                      <p className="font-mono text-lg font-black text-fuchsia-300">{hud.combo}x</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 text-xs font-bold text-emerald-300">
                      始末書トランポリン: {hud.safetyNets}回
                    </div>
                    <div className="rounded border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-1 font-mono text-xs font-bold text-cyan-200">
                      {hud.speedKmh} km/h
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Controls during Gameplay */}
              {phase === 'playing' && (
                <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-4">
                  <div className="pointer-events-none rounded-lg border border-slate-700 bg-black/75 px-3 py-1.5 text-xs text-slate-200">
                    長押し / Space: <span className="font-bold text-cyan-300">光回線ワイヤー射出</span> ・ 上昇角(15°〜55°)で離すと{' '}
                    <span className="font-bold text-amber-300">PERFECT RELEASE!</span>
                  </div>
                  <button
                    type="button"
                    disabled={hud.dashCharges <= 0}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      triggerAirDash();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      triggerAirDash();
                    }}
                    className={`rounded-xl border-2 px-4 py-2 text-xs font-black shadow-lg transition sm:text-sm ${
                      hud.dashCharges <= 0
                        ? 'cursor-not-allowed border-slate-700 bg-slate-900/80 text-slate-500'
                        : 'border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:scale-105 active:scale-95'
                    }`}
                  >
                    緊急エアダッシュ [Shift] (残 {hud.dashCharges}回)
                  </button>
                </div>
              )}

              {/* Title Overlay */}
              {phase === 'title' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center backdrop-blur-sm">
                  <span className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                    振り子物理×高速ワイヤースイングアクション
                  </span>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
                    社畜ワイヤー疾走：終電スイングアクション
                  </h2>
                  <p className="mt-2 max-w-lg text-xs leading-relaxed text-slate-300 sm:text-sm">
                    ホールドで頭上のネオン看板やタワークレーンへ光回線ワイヤーを接続！振り子の遠心力で加速し、斜め上（15°〜55°）へ振り上がる瞬間に離してPERFECT RELEASEを決め、終電エクスプレスに飛び乗ろう。
                  </p>
                  <button
                    type="button"
                    onClick={() => startCourse()}
                    className="mt-6 rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-400 to-sky-500 px-8 py-3.5 text-base font-black text-slate-950 shadow-xl transition hover:scale-105 active:scale-95"
                  >
                    {activeCourse.name} をスタート [SPACE / CLICK]
                  </button>
                </div>
              )}

              {/* Cleared / Gameover Overlay */}
              {(phase === 'cleared' || phase === 'gameover') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center backdrop-blur-md">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      phase === 'cleared' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {phase === 'cleared' ? 'LAST TRAIN BOARDED! 終電乗車成功' : 'MISSED THE TRAIN... 落下リタイア'}
                  </span>
                  <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                    到達距離: {hud.distanceM.toLocaleString()} m / スコア: {hud.score.toLocaleString()}
                  </h3>
                  <p className="mt-1 text-xs text-slate-300">
                    最大コンボ: {simRef.current.maxCombo} COMBO ・ PERFECT RELEASE: {simRef.current.perfectCount}回
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startCourse()}
                      className="rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-400 to-sky-500 px-7 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:scale-105"
                    >
                      もう一度スイングする [SPACE]
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Course Select & Techniques */}
          <aside className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div>
              <h3 className="border-b border-slate-800 pb-2 text-sm font-black text-cyan-300">コース選択（全3コース）</h3>
              <div className="mt-3 space-y-2.5">
                {COURSES.map((c) => {
                  const selected = c.id === courseId;
                  const cleared = save.clearedCourses.includes(c.id);
                  const bestD = save.bestDistance[c.id] ?? 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => startCourse(c.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-cyan-400 bg-cyan-950/40'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{c.name}</span>
                        {cleared && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            CLEARED
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{c.subtitle}</p>
                      <p className="mt-1.5 font-mono text-[11px] text-cyan-300">
                        自己ベスト: {bestD.toLocaleString()} m / {(save.bestScore[c.id] ?? 0).toLocaleString()} pts
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-300">
              <h4 className="font-black text-amber-300">ハイスピード攻略ガイド</h4>
              <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                <li>・振り子の最下点を通過し、斜め上（15°〜55°）へ上がる瞬間に離すとPERFECT RELEASEで超加速します。</li>
                <li>・黄金のWi-Fiリングを通過するとスピードとコンボ倍率が即座にアップします。</li>
                <li>・3回スイングするごとに「緊急エアダッシュ」が1回チャージされます。</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function renderWireScene(
  ctx: CanvasRenderingContext2D,
  sim: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    tetheredTo: AnchorPoint | null;
    anchors: AnchorPoint[];
    rings: WifiRing[];
    sonicRings: SonicRing[];
    ribbon: RibbonPoint[];
    banners: WireBanner[];
  },
  course: CourseConfig
) {
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  sky.addColorStop(0, course.skyTop);
  sky.addColorStop(1, course.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const camX = sim.x - 210;

  // Parallax Cyberpunk Neon Skyline
  for (let i = -1; i < 12; i++) {
    const idx = Math.floor((camX * 0.35) / 95) + i;
    const bx = idx * 95 - camX * 0.35;
    const bh = 140 + Math.abs(Math.sin(idx * 2.3)) * 180;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(bx, CANVAS_H - bh, 82, bh);

    // Neon windows
    ctx.fillStyle = idx % 2 === 0 ? 'rgba(34, 211, 238, 0.22)' : 'rgba(232, 121, 249, 0.2)';
    for (let wy = CANVAS_H - bh + 14; wy < CANVAS_H - 25; wy += 22) {
      ctx.fillRect(bx + 12, wy, 18, 8);
      ctx.fillRect(bx + 44, wy, 18, 8);
    }
  }

  // Danger laser line at bottom
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, DANGER_Y);
  ctx.lineTo(CANVAS_W, DANGER_Y);
  ctx.stroke();

  // Goal Last Train Express if near targetDist
  if (Number.isFinite(course.targetDist)) {
    const goalPx = course.targetDist * 6 - camX;
    if (goalPx > -200 && goalPx < CANVAS_W + 300) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(goalPx, 120, 220, 62);
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('終電エクスプレス GOAL', goalPx + 110, 156);
    }
  }

  // Overhead Anchors
  for (const a of sim.anchors) {
    const sx = a.x - camX;
    if (sx < -80 || sx > CANVAS_W + 80) continue;
    const isActive = sim.tetheredTo?.id === a.id;

    ctx.save();
    ctx.translate(sx, a.y);
    ctx.strokeStyle = isActive ? '#facc15' : course.accent;
    ctx.lineWidth = isActive ? 3.5 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, isActive ? 16 : 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isActive ? '#facc15' : '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Golden Wi-Fi Rings
  for (const r of sim.rings) {
    if (r.collected) continue;
    const rx = r.x - camX;
    if (rx < -80 || rx > CANVAS_W + 80) continue;
    ctx.save();
    ctx.translate(rx, r.y);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Wi-Fi BOOST', 0, 4);
    ctx.restore();
  }

  // Trailing Neon Ribbon
  if (sim.ribbon.length > 1) {
    ctx.strokeStyle = course.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    sim.ribbon.forEach((pt, idx) => {
      const rx = pt.x - camX;
      if (idx === 0) ctx.moveTo(rx, pt.y);
      else ctx.lineTo(rx, pt.y);
    });
    ctx.stroke();
  }

  // Active Grapple Tether Line
  const px = sim.x - camX;
  const py = sim.y;
  if (sim.tetheredTo) {
    const ax = sim.tetheredTo.x - camX;
    const ay = sim.tetheredTo.y;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ax, ay);
    ctx.stroke();
  }

  // Sonic Rings
  for (const sr of sim.sonicRings) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, sr.life * 2);
    ctx.strokeStyle = sr.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sr.x - camX, sr.y, sr.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Player Salaryman Character
  ctx.save();
  ctx.translate(px, py);
  const angle = Math.atan2(sim.vy, Math.max(100, sim.vx));
  ctx.rotate(angle * 0.45);

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.fillRect(-10, -14, 20, 24);
  ctx.strokeRect(-10, -14, 20, 24);

  // Head
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(2, -20, 7, 0, Math.PI * 2);
  ctx.fill();

  // Flowing cyan cyber-tie
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-22, -14);
  ctx.stroke();
  ctx.restore();

  // Floating Banners
  let by = 92;
  for (const b of sim.banners) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life);
    ctx.font = '900 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, CANVAS_W / 2, by);
    if (b.sub) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(b.sub, CANVAS_W / 2, by + 18);
    }
    ctx.restore();
    by += 42;
  }
}
