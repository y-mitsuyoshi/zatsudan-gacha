'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import { getAudioSettings } from '@/game/common/audioSettings';

const STORAGE_KEY = 'shachiku-stack-v1';
const CANVAS_W = 960;
const CANVAS_H = 540;
const FLOOR_H = 34;
const INITIAL_W = 240;
const MIN_SUPPORT_W = 18;
const TORQUE_LIMIT = 1.85;
const SWAY_PX_PER_FLOOR = 8;
const CRANE_Y = 145;

type StackMode = 'slice' | 'balance';

interface StackSaveData {
  bestFloor: Record<StackMode, number>;
  bestScore: Record<StackMode, number>;
  bestCombo: number;
  totalFloorsBuilt: number;
}

const DEFAULT_STACK_SAVE: StackSaveData = {
  bestFloor: { slice: 0, balance: 0 },
  bestScore: { slice: 0, balance: 0 },
  bestCombo: 0,
  totalFloorsBuilt: 0,
};

const DEPT_NAMES = [
  '総合受付ロビー',
  '総務・庶務課',
  '第一営業部',
  '第二営業部',
  '経理・財務部',
  '法務コンプライアンス室',
  '人事採用部',
  'システム開発部',
  'クラウド基盤サーバールーム',
  '免震ダンパー強化基礎',
  'グローバル戦略室',
  '広報・IR推進室',
  'AI研究開発ラボ',
  '常務取締役フロア',
  '社長ペントハウス',
];

function getDeptLabel(floorNum: number): string {
  const index = (floorNum - 1) % DEPT_NAMES.length;
  const cycle = Math.floor((floorNum - 1) / DEPT_NAMES.length);
  return cycle === 0 ? DEPT_NAMES[index] : `${DEPT_NAMES[index]} 第${cycle + 1}分館`;
}

interface StackedFloor {
  floorNum: number;
  relX: number; // offset relative to base center
  width: number;
  dept: string;
  isDamper: boolean;
  isPerfect: boolean;
  color: string;
}

interface SlicedDebris {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  color: string;
}

interface StackBanner {
  id: number;
  text: string;
  sub?: string;
  color: string;
  life: number;
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

class StackSoundEngine {
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
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), now + duration);

    const vol = Math.max(0.001, gainScale * settings.seVolume);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playDrop() {
    this.playTone(320, 140, 0.12, 'sine', 0.22);
  }

  playStamp(perfect: boolean, combo: number) {
    if (perfect) {
      const base = Math.min(880, 440 + combo * 35);
      this.playTone(base, base * 1.5, 0.18, 'square', 0.28);
      setTimeout(() => this.playTone(base * 1.5, base * 2, 0.22, 'triangle', 0.26), 55);
    } else {
      this.playTone(180, 110, 0.14, 'triangle', 0.25);
    }
  }

  playDamperLock() {
    this.playTone(220, 660, 0.25, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(550, 1100, 0.25, 'square', 0.26), 80);
  }

  playCollapse() {
    this.playTone(190, 45, 0.45, 'sawtooth', 0.34);
  }
}

const sfx = new StackSoundEngine();

function getSkyPalette(floors: number): { label: string; top: string; bottom: string } {
  if (floors < 10) {
    return { label: '地上街路エリア (1F〜9F)', top: '#1e3a8a', bottom: '#f97316' };
  }
  if (floors < 25) {
    return { label: '黄金の夕暮れ摩天楼 (10F〜24F)', top: '#311042', bottom: '#ea580c' };
  }
  if (floors < 45) {
    return { label: '深夜のネオン本社街 (25F〜44F)', top: '#090d16', bottom: '#1e1b4b' };
  }
  if (floors < 70) {
    return { label: '成層圏オーロラ支社 (45F〜69F)', top: '#022c22', bottom: '#0f172a' };
  }
  return { label: '宇宙軌道本社エリア (70F〜100F+)', top: '#000000', bottom: '#090d16' };
}

export default function ShachikuStackGame() {
  const [save, setSave] = useState<StackSaveData>(DEFAULT_STACK_SAVE);
  const [mode, setMode] = useState<StackMode>('slice');
  const [phase, setPhase] = useState<'title' | 'playing' | 'gameover'>('title');
  const [hud, setHud] = useState({
    floors: 1,
    score: 0,
    combo: 0,
    widthPx: INITIAL_W,
    tiltPct: 0,
    skyLabel: '地上街路エリア (1F〜9F)',
    milestone: '目標: 30F 本社ビル完成',
    assistReady: true,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const saveRef = useRef(save);
  saveRef.current = save;

  const simRef = useRef({
    time: 0,
    floors: [] as StackedFloor[],
    currentWidth: INITIAL_W,
    craneAngle: 0,
    craneSpeed: 1.75,
    dropping: null as {
      x: number;
      y: number;
      vy: number;
      width: number;
      dept: string;
      isDamper: boolean;
      color: string;
    } | null,
    debris: [] as SlicedDebris[],
    banners: [] as StackBanner[],
    scorePops: [] as ScorePopup[],
    score: 0,
    combo: 0,
    maxCombo: 0,
    swayAngle: 0,
    torque: 0,
    stabilizedIndex: 0,
    assistUsed: false,
    settled: false,
    endReason: '',
  });

  useBgm(phase === 'playing' ? 'defense-battle' : 'shachiku-menu');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    window.addEventListener('resize', resizeCanvas);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<StackSaveData>;
        setSave({
          bestFloor: {
            slice: p.bestFloor?.slice ?? 0,
            balance: p.bestFloor?.balance ?? 0,
          },
          bestScore: {
            slice: p.bestScore?.slice ?? 0,
            balance: p.bestScore?.balance ?? 0,
          },
          bestCombo: p.bestCombo ?? 0,
          totalFloorsBuilt: p.totalFloorsBuilt ?? 0,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistSave = useCallback((next: StackSaveData) => {
    saveRef.current = next;
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

  const startGame = useCallback((selectedMode?: StackMode) => {
    if (selectedMode) {
      setMode(selectedMode);
      modeRef.current = selectedMode;
    }

    simRef.current = {
      time: 0,
      floors: [
        {
          floorNum: 1,
          relX: 0,
          width: INITIAL_W,
          dept: `1F ${DEPT_NAMES[0]}`,
          isDamper: true,
          isPerfect: true,
          color: '#334155',
        },
      ],
      currentWidth: INITIAL_W,
      craneAngle: 0,
      craneSpeed: 1.75,
      dropping: null,
      debris: [],
      banners: [],
      scorePops: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      swayAngle: 0,
      torque: 0,
      stabilizedIndex: 0,
      assistUsed: false,
      settled: false,
      endReason: '',
    };

    phaseRef.current = 'playing';
    setHud({
      floors: 1,
      score: 0,
      combo: 0,
      widthPx: INITIAL_W,
      tiltPct: 0,
      skyLabel: getSkyPalette(1).label,
      milestone: '目標: 30F 本社ビル完成',
      assistReady: true,
    });
    setPhase('playing');
  }, []);

  const endGame = useCallback((reason = 'タワー崩壊') => {
    const sim = simRef.current;
    if (phaseRef.current !== 'playing' || sim.settled) return;

    const curSave = saveRef.current;
    const activeMode = modeRef.current;
    const built = sim.floors.length;

    sim.settled = true;
    sim.endReason = reason;
    sim.dropping = null;
    phaseRef.current = 'gameover';

    sfx.playCollapse();
    const nextSave: StackSaveData = {
      bestFloor: {
        ...curSave.bestFloor,
        [activeMode]: Math.max(curSave.bestFloor[activeMode] ?? 0, built),
      },
      bestScore: {
        ...curSave.bestScore,
        [activeMode]: Math.max(curSave.bestScore[activeMode] ?? 0, sim.score),
      },
      bestCombo: Math.max(curSave.bestCombo, sim.maxCombo),
      totalFloorsBuilt: curSave.totalFloorsBuilt + Math.max(0, built - 1),
    };
    persistSave(nextSave);
    setHud((prev) => ({
      ...prev,
      floors: built,
      score: sim.score,
      combo: sim.combo,
      tiltPct: Math.min(100, Math.round((Math.abs(sim.torque) / TORQUE_LIMIT) * 100)),
    }));
    setPhase('gameover');
  }, [persistSave]);

  const dropCurrentFloor = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const sim = simRef.current;
    if (sim.dropping) return;

    const nextNum = sim.floors.length + 1;
    const isDamper = nextNum % 10 === 0;
    const swingAmplitude = Math.min(180, 105 + nextNum * 1.1);
    const craneX = Math.sin(sim.craneAngle) * swingAmplitude;
    const colors = ['#1e293b', '#0f172a', '#1e3a8a', '#312e81', '#115e59'];

    sim.dropping = {
      x: craneX,
      y: CRANE_Y,
      vy: 340,
      width: modeRef.current === 'balance' ? INITIAL_W : sim.currentWidth,
      dept: isDamper ? `${nextNum}F 免震ダンパー基礎` : `${nextNum}F ${getDeptLabel(nextNum)}`,
      isDamper,
      color: isDamper ? '#b45309' : colors[nextNum % colors.length],
    };
    sfx.playDrop();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!e.repeat) {
          if (phaseRef.current === 'title' || phaseRef.current === 'gameover') {
            startGame();
          } else if (phaseRef.current === 'playing') {
            dropCurrentFloor();
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dropCurrentFloor, startGame]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (phaseRef.current === 'playing') dropCurrentFloor();
    },
    [dropCurrentFloor]
  );

  const releasePointerCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  // 60fps simulation loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;

      const sim = simRef.current;
      const activeMode = modeRef.current;

      if (phaseRef.current === 'playing') {
        sim.time += dt;
        const nextNum = sim.floors.length + 1;
        const targetCraneSpeed = 1.75 + Math.min(1.15, nextNum * 0.014);
        sim.craneSpeed += (targetCraneSpeed - sim.craneSpeed) * Math.min(1, dt * 1.8);
        sim.craneAngle = (sim.craneAngle + sim.craneSpeed * dt) % (Math.PI * 2);

        if (activeMode === 'balance') {
          const anchorRelX = sim.floors[sim.stabilizedIndex]?.relX ?? 0;
          let unstabilizedTorque = 0;
          for (let i = sim.stabilizedIndex + 1; i < sim.floors.length; i++) {
            unstabilizedTorque += (sim.floors[i].relX - anchorRelX) * 0.0045;
          }
          sim.torque = unstabilizedTorque;
          sim.swayAngle =
            Math.sin(sim.time * 2.6) * (0.02 + Math.abs(unstabilizedTorque) * 0.11) +
            unstabilizedTorque * 0.18;

          if (Math.abs(unstabilizedTorque) > TORQUE_LIMIT) {
            if (!sim.assistUsed) {
              sim.assistUsed = true;
              sim.stabilizedIndex = Math.max(0, sim.floors.length - 1);
              sim.torque = 0;
              sim.swayAngle = 0;
              sim.combo = 0;
              sfx.playDamperLock();
              addBanner('緊急免震アシスト発動！', '最上階を新基準に傾斜をリセット', '#38bdf8');
              setHud((prev) => ({ ...prev, combo: 0, tiltPct: 0, assistReady: false }));
            } else {
              endGame('重心バランス崩壊');
            }
          }
        } else {
          sim.torque = 0;
          sim.swayAngle = 0;
        }

        // Update dropping floor
        if (phaseRef.current === 'playing' && sim.dropping) {
          sim.dropping.vy += 980 * dt;
          sim.dropping.y += sim.dropping.vy * dt;

          const targetLandingY = 365;
          if (sim.dropping.y >= targetLandingY) {
            const topFloor = sim.floors[sim.floors.length - 1];
            const topIndex = sim.floors.length - 1;
            const swayOffsetPx =
              activeMode === 'balance' && topIndex > sim.stabilizedIndex
                ? Math.sin(sim.swayAngle) * (topIndex - sim.stabilizedIndex) * SWAY_PX_PER_FLOOR
                : 0;
            const topCenterX = topFloor.relX + swayOffsetPx;
            const dropCenterX = sim.dropping.x;
            const deltaX = dropCenterX - topCenterX;
            const absDelta = Math.abs(deltaX);
            const overlap = (topFloor.width + sim.dropping.width) / 2 - absDelta;

            if (overlap < MIN_SUPPORT_W) {
              sim.debris.push({
                x: CANVAS_W / 2 + dropCenterX,
                y: targetLandingY,
                w: sim.dropping.width,
                h: FLOOR_H,
                vx: deltaX > 0 ? 90 : -90,
                vy: 120,
                rot: 0,
                vrot: deltaX > 0 ? 3 : -3,
                color: sim.dropping.color,
              });
              sim.dropping = null;

              if (!sim.assistUsed) {
                sim.assistUsed = true;
                sim.combo = 0;
                const oldWidth = topFloor.width;
                const boostedWidth = Math.min(INITIAL_W, oldWidth + 72);
                const repairPx = Math.round(boostedWidth - oldWidth);
                topFloor.width = boostedWidth;
                topFloor.isPerfect = false;
                sim.currentWidth = boostedWidth;
                sfx.playDamperLock();
                addBanner(
                  '緊急補修アシスト発動！',
                  repairPx > 0 ? `最上階を鉄骨補強 +${repairPx}px` : '崩壊を食い止めました',
                  '#38bdf8'
                );
                setHud((prev) => ({
                  ...prev,
                  widthPx: Math.round(boostedWidth),
                  combo: 0,
                  assistReady: false,
                }));
              } else {
                endGame(overlap <= 0 ? 'フロア投下ミス' : '支持幅不足で崩壊');
              }
            } else {
              const isPerfect = absDelta <= 6;
              const previousCombo = sim.combo;
              let newWidth = sim.dropping.width;
              let newRelX = topFloor.relX + deltaX;

              if (activeMode === 'slice') {
                if (isPerfect) {
                  sim.combo += 1;
                  sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
                  newWidth = Math.min(INITIAL_W, topFloor.width + 8);
                  newRelX = topFloor.relX;
                  sfx.playStamp(true, sim.combo);
                  addBanner(
                    `PERFECT STAMP! (${sim.combo} COMBO)`,
                    '決済承認印！フロア幅 +8px 拡張',
                    '#facc15'
                  );
                } else {
                  sim.combo = 0;
                  newWidth = overlap;
                  const overlapLeft = Math.max(topFloor.relX - topFloor.width / 2, dropCenterX - sim.dropping.width / 2);
                  newRelX = overlapLeft + newWidth / 2;
                  const slicedW = sim.dropping.width - newWidth;
                  if (slicedW > 2) {
                    sim.debris.push({
                      x:
                        CANVAS_W / 2 +
                        (deltaX > 0
                          ? newRelX + newWidth / 2 + slicedW / 2
                          : newRelX - newWidth / 2 - slicedW / 2),
                      y: targetLandingY,
                      w: slicedW,
                      h: FLOOR_H,
                      vx: deltaX > 0 ? 110 : -110,
                      vy: -60,
                      rot: 0,
                      vrot: deltaX > 0 ? 4.2 : -4.2,
                      color: '#ef4444',
                    });
                  }
                  sfx.playStamp(false, 0);
                  if (previousCombo >= 3) {
                    addBanner('COMBO BREAK', `${previousCombo} COMBO 途切れ`, '#f97316');
                  }
                }
                sim.currentWidth = newWidth;
              } else {
                if (isPerfect) {
                  sim.combo += 1;
                  sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
                  newRelX = topFloor.relX;
                  sfx.playStamp(true, sim.combo);
                  addBanner(`PERFECT BALANCE! (${sim.combo}x)`, '重心ブレゼロ着地！', '#facc15');
                } else {
                  sim.combo = 0;
                  sfx.playStamp(false, 0);
                  if (previousCombo >= 3) {
                    addBanner('COMBO BREAK', `${previousCombo} COMBO 途切れ`, '#f97316');
                  }
                }
              }

              const newFloorNum = sim.floors.length + 1;
              const isDamper = sim.dropping.isDamper;
              if (isDamper) {
                sim.stabilizedIndex = sim.floors.length;
                if (activeMode === 'slice') {
                  newWidth = Math.min(INITIAL_W, newWidth + 24);
                  sim.currentWidth = newWidth;
                } else {
                  sim.torque = 0;
                  sim.swayAngle = 0;
                }
                sfx.playDamperLock();
                addBanner(
                  `${newFloorNum}F 免震ダンパー基礎完成！`,
                  activeMode === 'balance' ? '下層階の揺れを完全ロック！' : '特別ボーナス：床幅 +24px 補強！',
                  '#38bdf8'
                );
              }

              sim.floors.push({
                floorNum: newFloorNum,
                relX: newRelX,
                width: newWidth,
                dept: sim.dropping.dept,
                isDamper,
                isPerfect,
                color: sim.dropping.color,
              });

              let pts = (isPerfect ? 300 * Math.max(1, sim.combo) : 100) + (isDamper ? 500 : 0);
              if (isPerfect && sim.combo > 0 && sim.combo % 5 === 0) {
                const comboBonus = 150 * sim.combo;
                pts += comboBonus;
                addBanner(`${sim.combo} COMBO BONUS!`, `+${comboBonus}点`, '#f472b6');
              }
              sim.score += pts;
              sim.scorePops.push({
                id: Date.now() + Math.random(),
                x: CANVAS_W / 2 + newRelX,
                y: targetLandingY - 8,
                text: `+${pts}`,
                color: isPerfect ? '#facc15' : isDamper ? '#38bdf8' : '#e2e8f0',
                life: 0.9,
              });
              sim.dropping = null;

              const milestone =
                newFloorNum < 30
                  ? `目標: 30F 本社完成まであと ${30 - newFloorNum}F`
                  : newFloorNum < 60
                  ? `目標: 60F 成層圏支社まであと ${60 - newFloorNum}F`
                  : newFloorNum < 100
                  ? `目標: 100F 宇宙本社まであと ${100 - newFloorNum}F`
                  : '100F 宇宙本社達成！無限増築中';

              setHud({
                floors: newFloorNum,
                score: sim.score,
                combo: sim.combo,
                widthPx: Math.round(newWidth),
                tiltPct: Math.min(100, Math.round((Math.abs(sim.torque) / TORQUE_LIMIT) * 100)),
                skyLabel: getSkyPalette(newFloorNum).label,
                milestone,
                assistReady: !sim.assistUsed,
              });
            }
          }
        }

        for (const d of sim.debris) {
          d.vy += 820 * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.rot += d.vrot * dt;
        }
        sim.debris = sim.debris.filter((d) => d.y < CANVAS_H + 100);

        for (const p of sim.scorePops) {
          p.y -= 34 * dt;
          p.life -= dt;
        }
        sim.scorePops = sim.scorePops.filter((p) => p.life > 0);

        for (const b of sim.banners) b.life -= dt;
        sim.banners = sim.banners.filter((b) => b.life > 0);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const scaleX = canvas.width / CANVAS_W;
          const scaleY = canvas.height / CANVAS_H;
          ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
          renderStackScene(ctx, sim, activeMode);
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [addBanner, endGame]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0c0a09] text-stone-100 select-none">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="shrink-0 whitespace-nowrap rounded border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-[11px] font-bold text-stone-300 transition hover:border-amber-400 hover:text-amber-300 sm:px-3 sm:text-xs"
            >
              ← 無料ゲーム一覧
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-widest text-amber-400 sm:text-[10px]">
                SHACHIKU TOWER STACK / 100F HQ
              </p>
              <h2 className="break-words text-xs font-black sm:text-base">社畜グラグラ決済タワー：限界ビル建設</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-2 py-1 text-[10px] sm:px-3 sm:text-xs">
              <span className="text-stone-400">最高到達階数: </span>
              <span className="font-black text-amber-300">
                {Math.max(save.bestFloor.slice, save.bestFloor.balance)} F
              </span>
            </div>
            <AudioToggle variant="compact" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:gap-6">
          {/* Left: Game Viewport */}
          <div className="flex min-w-0 flex-col gap-3">
            <div
              className="relative touch-none overflow-hidden rounded-xl border-2 border-stone-800 bg-stone-950 shadow-2xl"
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerUp={releasePointerCapture}
              onPointerCancel={releasePointerCapture}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="block aspect-[16/9] w-full cursor-pointer"
              />

              {/* HUD */}
              {phase === 'playing' && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-1.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent p-2 sm:gap-2 sm:p-3">
                  <div className="flex items-center gap-2.5 sm:gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-stone-400 sm:text-[10px]">FLOOR</p>
                      <p className="font-mono text-lg font-black leading-tight text-amber-300 sm:text-2xl">{hud.floors}F</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-stone-400 sm:text-[10px]">SCORE</p>
                      <p className="font-mono text-sm font-bold leading-tight text-white sm:text-lg">
                        {hud.score.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-stone-400 sm:text-[10px]">COMBO</p>
                      <p className="font-mono text-sm font-black leading-tight text-emerald-300 sm:text-lg">{hud.combo}x</p>
                    </div>
                  </div>

                  <div className="flex min-w-0 max-w-[48%] flex-col items-end sm:max-w-none">
                    <span className="hidden max-w-full truncate rounded border border-amber-500/30 bg-stone-900/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 sm:inline-block">
                      {hud.skyLabel}
                    </span>
                    <span className="max-w-full truncate text-[9px] font-bold text-sky-300 sm:mt-1 sm:text-[11px]">
                      {mode === 'slice' ? `幅: ${hud.widthPx}px` : `傾斜: ${hud.tiltPct}%`} ・ {hud.milestone}
                    </span>
                    <span
                      className={`max-w-full truncate text-[9px] font-bold sm:text-[10px] ${
                        hud.assistReady ? 'text-emerald-300' : 'text-stone-500'
                      }`}
                    >
                      緊急アシスト: {hud.assistReady ? '待機' : '使用済み'}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Instruction */}
              {phase === 'playing' && (
                <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-2 sm:bottom-3 sm:px-4">
                  <div className="hidden rounded-lg border border-stone-700 bg-black/75 px-4 py-1.5 text-xs text-stone-200 sm:block">
                    画面クリック / タップ / Spaceキー: <span className="font-bold text-amber-300">オフィスフロア投下</span>
                    （誤差±6px以内で <span className="font-bold text-emerald-300">PERFECT STAMP!</span>）
                  </div>
                  <div className="rounded-md border border-stone-700 bg-black/75 px-2.5 py-1 text-[10px] text-stone-200 sm:hidden">
                    タップで投下 ・ 誤差±6pxでPERFECT
                  </div>
                </div>
              )}

              {/* Title Overlay */}
              {phase === 'title' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-black/80 px-3 py-2 text-center backdrop-blur-sm sm:p-6">
                  <span className="hidden rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 sm:inline-block">
                    ワンボタン高層ビル建設＆物理バランスアクション
                  </span>
                  <h2 className="mt-1 text-lg font-black leading-tight tracking-tight text-white sm:mt-3 sm:text-4xl">
                    社畜グラグラ決済タワー：限界ビル建設
                  </h2>
                  <p className="mt-1 hidden max-w-lg text-xs leading-relaxed text-stone-300 sm:mt-2 sm:block sm:text-sm">
                    揺れるタワークレーンからオフィスフロアをタイミングよく投下！ズレた部分が切断される「精密スライスモード」と、重心の傾きを制御する「物理バランスモード」の2モードで100階の宇宙本社を目指そう。一度だけ緊急アシストも発動します。
                  </p>
                  <div className="mt-2 flex w-full max-w-md flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                    <button
                      type="button"
                      onClick={() => startGame('slice')}
                      className="w-full rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2 text-xs font-black text-stone-950 shadow-xl transition hover:scale-105 sm:w-auto sm:px-6 sm:py-3 sm:text-sm"
                    >
                      精密スライスモードで着工 [SPACE]
                    </button>
                    <button
                      type="button"
                      onClick={() => startGame('balance')}
                      className="w-full rounded-xl border-2 border-sky-400 bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-2 text-xs font-black text-white shadow-xl transition hover:scale-105 sm:w-auto sm:px-6 sm:py-3 sm:text-sm"
                    >
                      物理バランスモードで着工
                    </button>
                  </div>
                </div>
              )}

              {/* Gameover Overlay */}
              {phase === 'gameover' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-black/85 px-3 py-2 text-center backdrop-blur-md sm:p-6">
                  <span className="hidden rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-stone-950 sm:inline-block">
                    竣工検査完了 / TOWER REPORT
                  </span>
                  <h3 className="mt-1 text-base font-black leading-tight text-white sm:mt-2 sm:text-3xl">
                    <span className="block sm:inline">最終到達階数: {hud.floors}階</span>
                    <span className="mt-0.5 block text-amber-300 sm:mt-0 sm:inline sm:text-white">
                      スコア: {hud.score.toLocaleString()}
                    </span>
                  </h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-stone-300 sm:text-xs">
                    最大PERFECTコンボ: {simRef.current.maxCombo} COMBO ・ モード:{' '}
                    {mode === 'slice' ? '精密スライスモード' : '物理バランスモード'}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-orange-300 sm:text-xs">
                    崩壊原因: {simRef.current.endReason}
                  </p>
                  <div className="mt-3 flex w-full max-w-xs flex-wrap justify-center gap-3 sm:mt-5 sm:max-w-none">
                    <button
                      type="button"
                      onClick={() => startGame()}
                      className="w-full rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-black text-stone-950 shadow-lg transition hover:scale-105 sm:w-auto sm:px-7 sm:py-2.5 sm:text-sm"
                    >
                      もう一度建設する [SPACE]
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Mode Switch & Records */}
          <aside className="flex min-w-0 flex-col gap-3 rounded-xl border border-stone-800 bg-stone-900/80 p-3 sm:gap-4 sm:p-4">
            <div>
              <h3 className="border-b border-stone-800 pb-2 text-xs font-black text-amber-300 sm:text-sm">建設モード選択</h3>
              <div className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5">
                <button
                  type="button"
                  onClick={() => startGame('slice')}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    mode === 'slice'
                      ? 'border-amber-400 bg-amber-950/35'
                      : 'border-stone-800 bg-stone-950/80 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">精密スライスモード</span>
                    <span className="font-mono text-[11px] font-bold text-amber-300">最高 {save.bestFloor.slice}F</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400">
                    下の階からはみ出た部分がスライス切断！PERFECT着地（±6px）で床幅が+8px拡張されます。
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => startGame('balance')}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    mode === 'balance'
                      ? 'border-sky-400 bg-sky-950/35'
                      : 'border-stone-800 bg-stone-950/80 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">物理バランスモード</span>
                    <span className="font-mono text-[11px] font-bold text-sky-300">最高 {save.bestFloor.balance}F</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400">
                    床幅そのままに重心のズレと揺れが蓄積！10階ごとの免震ダンパー基礎で揺れを固定できます。
                  </p>
                </button>
              </div>
            </div>

            <div className="border-t border-stone-800 pt-3 text-xs">
              <h4 className="font-black text-stone-200">建設キャリア統計</h4>
              <div className="mt-2 space-y-1.5 text-[11px] text-stone-400">
                <div className="flex justify-between">
                  <span>累計建設フロア数</span>
                  <span className="font-mono font-bold text-stone-200">{save.totalFloorsBuilt} 階</span>
                </div>
                <div className="flex justify-between">
                  <span>最大PERFECTコンボ</span>
                  <span className="font-mono font-bold text-emerald-300">{save.bestCombo} COMBO</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function renderStackScene(
  ctx: CanvasRenderingContext2D,
  sim: {
    floors: StackedFloor[];
    currentWidth: number;
    craneAngle: number;
    dropping: {
      x: number;
      y: number;
      width: number;
      dept: string;
      isDamper: boolean;
      color: string;
    } | null;
    debris: SlicedDebris[];
    banners: StackBanner[];
    scorePops: ScorePopup[];
    swayAngle: number;
    stabilizedIndex: number;
  },
  mode: StackMode
) {
  const count = sim.floors.length;
  const pal = getSkyPalette(count);
  const cssWidth = ctx.canvas.clientWidth || CANVAS_W;
  const viewScale = Math.min(2.4, Math.max(1, CANVAS_W / Math.max(1, cssWidth)));

  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, pal.top);
  grad.addColorStop(1, pal.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (count >= 25) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 36; i++) {
      const sx = (i * 173) % CANVAS_W;
      const sy = (i * 97) % 340;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  const visibleFloors = sim.floors.slice(-7);
  const topIndex = visibleFloors.length - 1;
  const floorOffset = sim.floors.length - visibleFloors.length;

  for (let i = 0; i < visibleFloors.length; i++) {
    const fl = visibleFloors[i];
    const globalIndex = floorOffset + i;
    const depthFromTop = topIndex - i;
    const y = 365 + depthFromTop * FLOOR_H;
    const swayPx =
      mode === 'balance' && globalIndex > sim.stabilizedIndex
        ? Math.sin(sim.swayAngle) * (globalIndex - sim.stabilizedIndex) * SWAY_PX_PER_FLOOR
        : 0;
    const cx = CANVAS_W / 2 + fl.relX + swayPx;
    const left = cx - fl.width / 2;

    ctx.fillStyle = fl.isDamper ? '#b45309' : fl.color;
    ctx.fillRect(left, y, fl.width, FLOOR_H - 2);

    ctx.strokeStyle = fl.isPerfect ? '#facc15' : '#94a3b8';
    ctx.lineWidth = fl.isPerfect ? 2.5 : 1.5;
    ctx.strokeRect(left, y, fl.width, FLOOR_H - 2);

    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
    for (let wx = left + 10; wx < left + fl.width - 18; wx += 22) {
      ctx.fillRect(wx, y + 6, 10, 8);
    }

    if (fl.width >= 95) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold ${Math.round(10 * Math.min(1.5, viewScale))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fl.dept, cx, y + 25, Math.max(12, fl.width - 8));
    }
  }

  const nextNum = sim.floors.length + 1;
  const isNextDamper = nextNum % 10 === 0;
  const swingAmplitude = Math.min(180, 105 + nextNum * 1.1);
  const craneOffsetX = sim.dropping ? sim.dropping.x : Math.sin(sim.craneAngle) * swingAmplitude;
  const blockW = sim.dropping ? sim.dropping.width : mode === 'balance' ? INITIAL_W : sim.currentWidth;
  const blockY = sim.dropping ? sim.dropping.y : CRANE_Y;
  const blockCenterX = CANVAS_W / 2 + craneOffsetX;

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2 + craneOffsetX * 0.65, 0);
  ctx.lineTo(blockCenterX, blockY);
  ctx.stroke();

  ctx.fillStyle = isNextDamper ? '#d97706' : '#0284c7';
  ctx.fillRect(blockCenterX - blockW / 2, blockY, blockW, FLOOR_H - 2);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.strokeRect(blockCenterX - blockW / 2, blockY, blockW, FLOOR_H - 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(11 * Math.min(2, viewScale))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${nextNum}F`, blockCenterX, blockY + 21, Math.max(12, blockW - 8));

  for (const d of sim.debris) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = d.color;
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
  }

  for (const p of sim.scorePops) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 1.4);
    ctx.font = `900 ${Math.round(14 * viewScale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }

  let by = 185;
  for (const b of sim.banners) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life);
    ctx.font = `900 ${Math.round(22 * viewScale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, CANVAS_W / 2, by, CANVAS_W - 40);
    if (b.sub) {
      ctx.font = `bold ${Math.round(12 * viewScale)}px sans-serif`;
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(b.sub, CANVAS_W / 2, by + Math.round(18 * viewScale), CANVAS_W - 40);
    }
    ctx.restore();
    by += Math.round(42 * viewScale);
  }
}
