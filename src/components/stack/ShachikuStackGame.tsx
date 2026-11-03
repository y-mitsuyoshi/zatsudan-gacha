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
  '1F 総合受付ロビー',
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
    craneSpeed: 2.3,
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
    score: 0,
    combo: 0,
    maxCombo: 0,
    swayAngle: 0,
    torque: 0,
    stabilizedIndex: 0,
  });

  useBgm(phase === 'playing' ? 'defense-battle' : 'shachiku-menu');

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
    const activeMode = selectedMode ?? modeRef.current;
    if (selectedMode) setMode(selectedMode);

    simRef.current = {
      time: 0,
      floors: [
        {
          floorNum: 1,
          relX: 0,
          width: INITIAL_W,
          dept: DEPT_NAMES[0],
          isDamper: true,
          isPerfect: true,
          color: '#334155',
        },
      ],
      currentWidth: INITIAL_W,
      craneAngle: 0,
      craneSpeed: 2.3,
      dropping: null,
      debris: [],
      banners: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      swayAngle: 0,
      torque: 0,
      stabilizedIndex: 0,
    };

    setHud({
      floors: 1,
      score: 0,
      combo: 0,
      widthPx: INITIAL_W,
      tiltPct: 0,
      skyLabel: getSkyPalette(1).label,
      milestone: '目標: 30F 本社ビル完成',
    });
    setPhase('playing');
  }, []);

  const endGame = useCallback(() => {
    const sim = simRef.current;
    const curSave = saveRef.current;
    const activeMode = modeRef.current;
    const built = sim.floors.length;

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
    setPhase('gameover');
  }, [persistSave]);

  const dropCurrentFloor = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const sim = simRef.current;
    if (sim.dropping) return;

    const nextNum = sim.floors.length + 1;
    const isDamper = nextNum % 10 === 0;
    const swingAmplitude = Math.min(185, 115 + nextNum * 1.2);
    const craneX = Math.sin(sim.craneAngle) * swingAmplitude;
    const colors = ['#1e293b', '#0f172a', '#1e3a8a', '#312e81', '#115e59'];

    sim.dropping = {
      x: craneX,
      y: 95,
      vy: 420,
      width: modeRef.current === 'balance' ? INITIAL_W : sim.currentWidth,
      dept: isDamper ? `${nextNum}F 免震ダンパー基礎` : `${nextNum}F ${DEPT_NAMES[nextNum % DEPT_NAMES.length]}`,
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
          if (phaseRef.current === 'title') {
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
        const speedMult = 1 + Math.min(1.6, nextNum * 0.022);
        sim.craneAngle += sim.craneSpeed * speedMult * dt;

        // Tower sway in balance mode
        if (activeMode === 'balance') {
          let unstabilizedTorque = 0;
          for (let i = sim.stabilizedIndex + 1; i < sim.floors.length; i++) {
            unstabilizedTorque += sim.floors[i].relX * 0.012;
          }
          sim.torque = unstabilizedTorque;
          sim.swayAngle = Math.sin(sim.time * 2.6) * (0.04 + Math.abs(unstabilizedTorque) * 0.14) + unstabilizedTorque * 0.22;

          if (Math.abs(unstabilizedTorque) > 1.85) {
            endGame();
          }
        } else {
          sim.torque = 0;
          sim.swayAngle = 0;
        }

        // Update dropping floor
        if (sim.dropping) {
          sim.dropping.vy += 980 * dt;
          sim.dropping.y += sim.dropping.vy * dt;

          const targetLandingY = 365;
          if (sim.dropping.y >= targetLandingY) {
            const topFloor = sim.floors[sim.floors.length - 1];
            const swayOffsetPx = activeMode === 'balance' ? Math.sin(sim.swayAngle) * 55 : 0;
            const topCenterX = topFloor.relX + swayOffsetPx;
            const dropCenterX = sim.dropping.x;
            const deltaX = dropCenterX - topCenterX;
            const absDelta = Math.abs(deltaX);

            const overlap = (topFloor.width + sim.dropping.width) / 2 - absDelta;

            if (overlap <= 12) {
              // Missed completely!
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
              endGame();
            } else {
              const isPerfect = absDelta <= 6;
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
                  newWidth = Math.max(24, overlap);
                  newRelX = topFloor.relX + deltaX * 0.5;
                  const slicedW = sim.dropping.width - newWidth;
                  if (slicedW > 2) {
                    sim.debris.push({
                      x: CANVAS_W / 2 + (deltaX > 0 ? newRelX + newWidth / 2 + slicedW / 2 : newRelX - newWidth / 2 - slicedW / 2),
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
                }
                sim.currentWidth = newWidth;
              } else {
                // Pendulum Balance Mode
                if (isPerfect) {
                  sim.combo += 1;
                  sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
                  newRelX = topFloor.relX;
                  sfx.playStamp(true, sim.combo);
                  addBanner(`PERFECT BALANCE! (${sim.combo}x)`, '重心ブレゼロ着地！', '#facc15');
                } else {
                  sim.combo = 0;
                  sfx.playStamp(false, 0);
                }
              }

              const newFloorNum = sim.floors.length + 1;
              const isDamper = sim.dropping.isDamper;
              if (isDamper) {
                sim.stabilizedIndex = sim.floors.length;
                if (activeMode === 'slice') {
                  newWidth = Math.min(INITIAL_W, newWidth + 24);
                  sim.currentWidth = newWidth;
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

              const pts = (isPerfect ? 350 * Math.max(1, sim.combo) : 120) + (isDamper ? 500 : 0);
              sim.score += pts;
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
                tiltPct: Math.min(100, Math.round((Math.abs(sim.torque) / 1.85) * 100)),
                skyLabel: getSkyPalette(newFloorNum).label,
                milestone,
              });
            }
          }
        }

        // Update debris & banners
        for (const d of sim.debris) {
          d.vy += 820 * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.rot += d.vrot * dt;
        }
        sim.debris = sim.debris.filter((d) => d.y < CANVAS_H + 100);

        for (const b of sim.banners) b.life -= dt;
        sim.banners = sim.banners.filter((b) => b.life > 0);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderStackScene(ctx, sim, activeMode);
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [addBanner, endGame]);

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-100 select-none">
      {/* Header */}
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
              <p className="text-[10px] font-bold tracking-widest text-amber-400">SHACHIKU TOWER STACK / 100F HQ</p>
              <h2 className="text-sm font-black sm:text-base">社畜グラグラ決済タワー：限界ビル建設</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1 text-xs">
              <span className="text-stone-400">最高到達階数: </span>
              <span className="font-black text-amber-300">
                {Math.max(save.bestFloor.slice, save.bestFloor.balance)} F
              </span>
            </div>
            <AudioToggle variant="compact" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left: Game Viewport */}
          <div className="flex flex-col gap-3">
            <div
              className="relative overflow-hidden rounded-xl border-2 border-stone-800 bg-stone-950 shadow-2xl"
              onMouseDown={() => {
                if (phase === 'playing') dropCurrentFloor();
              }}
              onTouchStart={(e) => {
                if (phase === 'playing') {
                  e.preventDefault();
                  dropCurrentFloor();
                }
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
                      <p className="text-[10px] font-bold text-stone-400">FLOOR</p>
                      <p className="font-mono text-2xl font-black text-amber-300">{hud.floors}F</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400">SCORE</p>
                      <p className="font-mono text-lg font-bold text-white">{hud.score.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400">PERFECT COMBO</p>
                      <p className="font-mono text-lg font-black text-emerald-300">{hud.combo}x</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="rounded border border-amber-500/30 bg-stone-900/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                      {hud.skyLabel}
                    </span>
                    <span className="mt-1 text-[11px] font-bold text-sky-300">
                      {mode === 'slice' ? `現在フロア幅: ${hud.widthPx}px` : `ビル傾斜危険度: ${hud.tiltPct}%`} ・ {hud.milestone}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Instruction */}
              {phase === 'playing' && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
                  <div className="rounded-lg border border-stone-700 bg-black/75 px-4 py-1.5 text-xs text-stone-200">
                    画面クリック / タップ / Spaceキー: <span className="font-bold text-amber-300">オフィスフロア投下</span>（誤差±6px以内で{' '}
                    <span className="font-bold text-emerald-300">PERFECT STAMP!</span>）
                  </div>
                </div>
              )}

              {/* Title Overlay */}
              {phase === 'title' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center backdrop-blur-sm">
                  <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                    ワンボタン高層ビル建設＆物理バランスアクション
                  </span>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
                    社畜グラグラ決済タワー：限界ビル建設
                  </h2>
                  <p className="mt-2 max-w-lg text-xs leading-relaxed text-stone-300 sm:text-sm">
                    揺れるタワークレーンからオフィスフロアをタイミングよく投下！ズレた部分が切断される「精密スライスモード」と、重心の傾きを制御する「物理バランスモード」の2モードで100階の宇宙本社を目指そう。
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startGame('slice')}
                      className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-black text-stone-950 shadow-xl transition hover:scale-105"
                    >
                      精密スライスモードで着工 [SPACE]
                    </button>
                    <button
                      type="button"
                      onClick={() => startGame('balance')}
                      className="rounded-xl border-2 border-sky-400 bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl transition hover:scale-105"
                    >
                      物理バランスモードで着工
                    </button>
                  </div>
                </div>
              )}

              {/* Gameover Overlay */}
              {phase === 'gameover' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center backdrop-blur-md">
                  <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-stone-950">
                    竣工検査完了 / TOWER REPORT
                  </span>
                  <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                    最終到達階数: {hud.floors}階 / スコア: {hud.score.toLocaleString()}
                  </h3>
                  <p className="mt-1 text-xs text-stone-300">
                    最大PERFECTコンボ: {simRef.current.maxCombo} COMBO ・ モード:{' '}
                    {mode === 'slice' ? '精密スライスモード' : '物理バランスモード'}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startGame()}
                      className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-orange-600 px-7 py-2.5 text-sm font-black text-stone-950 shadow-lg transition hover:scale-105"
                    >
                      もう一度建設する [SPACE]
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Mode Switch & Records */}
          <aside className="flex flex-col gap-4 rounded-xl border border-stone-800 bg-stone-900/80 p-4">
            <div>
              <h3 className="border-b border-stone-800 pb-2 text-sm font-black text-amber-300">建設モード選択</h3>
              <div className="mt-3 space-y-2.5">
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
    swayAngle: number;
  },
  mode: StackMode
) {
  const count = sim.floors.length;
  const pal = getSkyPalette(count);

  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, pal.top);
  grad.addColorStop(1, pal.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Stars in high altitude
  if (count >= 25) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 36; i++) {
      const sx = (i * 173) % CANVAS_W;
      const sy = (i * 97) % 340;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  // Visible top 7 floors
  const visibleFloors = sim.floors.slice(-7);
  const topIndex = visibleFloors.length - 1;

  for (let i = 0; i < visibleFloors.length; i++) {
    const fl = visibleFloors[i];
    const depthFromTop = topIndex - i;
    const y = 365 + depthFromTop * FLOOR_H;
    const swayPx = mode === 'balance' ? Math.sin(sim.swayAngle) * (7 - depthFromTop) * 8 : 0;
    const cx = CANVAS_W / 2 + fl.relX + swayPx;
    const left = cx - fl.width / 2;

    ctx.fillStyle = fl.isDamper ? '#b45309' : fl.color;
    ctx.fillRect(left, y, fl.width, FLOOR_H - 2);

    ctx.strokeStyle = fl.isPerfect ? '#facc15' : '#94a3b8';
    ctx.lineWidth = fl.isPerfect ? 2.5 : 1.5;
    ctx.strokeRect(left, y, fl.width, FLOOR_H - 2);

    // Windows
    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
    for (let wx = left + 10; wx < left + fl.width - 18; wx += 22) {
      ctx.fillRect(wx, y + 6, 10, 8);
    }

    // Department label
    if (fl.width >= 95) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fl.dept, cx, y + 25);
    }
  }

  // Overhead Crane & Swinging / Dropping Block
  const nextNum = sim.floors.length + 1;
  const isNextDamper = nextNum % 10 === 0;
  const swingAmplitude = Math.min(185, 115 + nextNum * 1.2);
  const craneOffsetX = sim.dropping ? sim.dropping.x : Math.sin(sim.craneAngle) * swingAmplitude;
  const blockW = sim.dropping ? sim.dropping.width : mode === 'balance' ? INITIAL_W : sim.currentWidth;
  const blockY = sim.dropping ? sim.dropping.y : 95;
  const blockCenterX = CANVAS_W / 2 + craneOffsetX;

  // Crane cable
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2 + craneOffsetX * 0.65, 0);
  ctx.lineTo(blockCenterX, blockY);
  ctx.stroke();

  // Active Floor Block
  ctx.fillStyle = isNextDamper ? '#d97706' : '#0284c7';
  ctx.fillRect(blockCenterX - blockW / 2, blockY, blockW, FLOOR_H - 2);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.strokeRect(blockCenterX - blockW / 2, blockY, blockW, FLOOR_H - 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${nextNum}F`, blockCenterX, blockY + 21);

  // Sliced Debris
  for (const d of sim.debris) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = d.color;
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
  }

  // Banners
  let by = 165;
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
