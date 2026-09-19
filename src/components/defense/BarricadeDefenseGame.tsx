'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DefenseEngine, type HudSnapshot, type ShopSnapshot, type RunResult } from '@/game/defense/engine';
import { DefenseSound } from '@/game/defense/audio';
import { VirtualJoystick } from '@/game/common/virtualJoystick';
import {
  WEAPONS, ENEMIES, COURSES, COURSE_ORDER, DIFFICULTIES, DIFFICULTY_ORDER, SHOP, MAX_ALLIES,
  ACHIEVEMENTS, PERKS,
  type CourseId, type Difficulty, type EnemyKind, type WeaponId,
} from '@/game/defense/config';
import {
  loadSettings, saveSettings, loadRecords, saveRecord, loadProgress, saveProgress,
  type RecordEntry, type Progress,
} from '@/game/defense/storage';

type Screen = 'title' | 'playing' | 'shop' | 'paused' | 'result';

const DEFAULT_HUD: HudSnapshot = {
  score: 0, coins: 0, wave: 1, totalWaves: 5, endless: 0, combo: 0,
  weapon: 'pistol', weaponT: 0, baseHp: 100, baseMax: 100,
  wallHp: 140, wallMax: 140, allies: 0, kills: 0,
  bossHp: 0, bossMax: 0, fps: 60, waveActive: false, distLeft: 0, distTotal: 1,
  runDmgMul: 1, lastGate: '', gaugeName: '',
};

const ENEMY_ORDER: EnemyKind[] = ['runner', 'walker', 'brute', 'shield', 'kamikaze', 'boss'];

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

function BarricadeIntegrityBar({ wallHp, wallMax }: { wallHp: number; wallMax: number }) {
  const ratio = wallMax > 0 ? wallHp / wallMax : 0;
  let statusText = '堅牢';
  let barColor = 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]';
  let badgeColor = 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30';

  if (ratio <= 0) {
    statusText = '崩壊！';
    barColor = 'bg-gray-600';
    badgeColor = 'text-gray-400 bg-gray-900/60 border-gray-600/30';
  } else if (ratio < 0.3) {
    statusText = '警報！';
    barColor = 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]';
    badgeColor = 'text-red-400 bg-red-950/60 border-red-500/30 animate-pulse';
  } else if (ratio < 0.7) {
    statusText = '亀裂';
    barColor = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
    badgeColor = 'text-amber-400 bg-amber-950/60 border-amber-500/30';
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-bold">
          <span>バリケード耐久</span>
          <span className={`rounded px-1.5 py-0.2 text-[9px] font-black border ${badgeColor}`}>
            {statusText}
          </span>
        </div>
        <span className="font-mono font-bold text-xs">{wallHp} / {wallMax}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/10 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-150 ${barColor}`}
          style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}
        />
      </div>
    </div>
  );
}

function WeaponRing({ weaponId, durationLeft }: { weaponId: WeaponId; durationLeft: number }) {
  const w = WEAPONS[weaponId];
  const durationMax = w.duration;
  const isTimed = durationLeft > 0 && durationMax < Infinity;
  const frac = isTimed ? Math.max(0, Math.min(1, durationLeft / durationMax)) : 1;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-1 border border-white/10 backdrop-blur-sm">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="32" height="32">
          <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke={isTimed ? '#f59e0b' : '#38bdf8'}
            strokeWidth="2.5"
            strokeDasharray={2 * Math.PI * 13}
            strokeDashoffset={2 * Math.PI * 13 * (1 - frac)}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs font-bold font-mono">
          {w.icon === 'briefcase' || (w.id as string) === 'briefcase'
            ? '鞄'
            : w.icon === 'umbrella' || (w.id as string) === 'umbrella'
            ? '傘'
            : w.icon === 'card' || (w.id as string) === 'card'
            ? '名刺'
            : w.icon === 'pass' || (w.id as string) === 'pass'
            ? '定期'
            : w.icon === 'express' || (w.id as string) === 'express'
            ? '特急'
            : '冷房'}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-black">{w.name}</span>
        <span className="text-[10px] text-gray-300">
          {isTimed ? `残り ${Math.ceil(durationLeft)}秒` : '標準装備'}
        </span>
      </div>
    </div>
  );
}

/** 実績アンロック判定。新規解除のID一覧を返す。 */
function evalAchievements(r: RunResult, p: Progress, records: RecordEntry[]): string[] {
  const has = new Set(p.achievements);
  const give: string[] = [];
  const grant = (id: string, cond: boolean) => {
    if (cond && !has.has(id)) {
      give.push(id);
      has.add(id);
    }
  };
  grant('first_run', true);
  grant('first_win', r.victory);
  grant('boss', r.bossKills > 0);
  grant('nakama', r.maxAllies >= 3);
  grant('combo50', r.maxCombo >= 50);
  grant('combo100', r.maxCombo >= 100);
  grant('scorer', r.score >= 10000);
  grant('endless', r.endless > 0);
  grant('veteran', p.totalRuns >= 10);
  grant('slayer', p.totalKills >= 1000);
  grant('rich', p.coins >= 1000);
  const won = new Set(records.filter((x) => x.victory).map((x) => x.course));
  grant('all_course', won.size >= 3);
  if (give.length > 0) p.achievements = Array.from(has);
  return give;
}

export default function BarricadeDefenseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DefenseEngine | null>(null);
  const soundRef = useRef<DefenseSound | null>(null);
  const joystickRef = useRef<VirtualJoystick | null>(null);
  const aimRef = useRef({ x: 240, y: 200 });
  const bannerTimer = useRef<number | null>(null);

  const [screen, setScreen] = useState<Screen>('title');
  const screenRef = useRef<Screen>('title');
  const changeScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreen(s);
  }, []);

  const [hud, setHud] = useState<HudSnapshot>(DEFAULT_HUD);
  const [shop, setShop] = useState<ShopSnapshot | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [banner, setBanner] = useState<{ title: string; sub: string; key: number } | null>(null);
  const [course, setCourse] = useState<CourseId>('city');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [muted, setMuted] = useState(false);
  const [shake, setShake] = useState(true);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [bank, setBank] = useState(0);
  const [prog, setProg] = useState<Progress | null>(null);
  const [newAch, setNewAch] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [runMeta, setRunMeta] = useState<{ course: CourseId; difficulty: Difficulty }>({ course: 'city', difficulty: 'normal' });

  useEffect(() => {
    const s = loadSettings();
    setMuted(s.muted);
    setShake(s.shake);
    setRecords(loadRecords());
    const p = loadProgress();
    setProg(p);
    setBank(p.coins);
    if (!p.unlocked.includes(course)) setCourse('city');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showBanner = useCallback((title: string, sub: string) => {
    setBanner({ title, sub, key: Date.now() });
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 2400);
  }, []);

  const destroyEngine = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
  }, []);

  const finishRun = useCallback((r: RunResult, c: CourseId, d: Difficulty) => {
    const entry: RecordEntry = {
      score: r.score, course: c, difficulty: d, wave: r.wave, victory: r.victory, date: Date.now(),
    };
    const updated = saveRecord(entry);
    setRecords(updated);
    const p = loadProgress();
    p.coins += r.coins;
    p.totalKills += r.kills;
    p.totalRuns += 1;
    p.endlessBest = Math.max(p.endlessBest, r.endless);
    for (const k of ENEMY_ORDER) {
      const n = r.killsByKind[k] ?? 0;
      if (n > 0) p.codex[k] = (p.codex[k] ?? 0) + n;
    }
    if (r.victory) {
      const idx = COURSE_ORDER.indexOf(c);
      const next = COURSE_ORDER[idx + 1];
      if (next && !p.unlocked.includes(next)) p.unlocked.push(next);
    }
    const unlocked = evalAchievements(r, p, updated);
    saveProgress(p);
    setProg(p);
    setBank(p.coins);
    setNewAch(unlocked);
    if (unlocked.length > 0) {
      const names = unlocked.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id).join('・');
      showBanner('実績解除！', names);
    }
    setResult(r);
    changeScreen('result');
  }, [changeScreen, showBanner]);

  const startRun = useCallback((c: CourseId, d: Difficulty) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    destroyEngine();
    if (!soundRef.current) soundRef.current = new DefenseSound();
    const sound = soundRef.current;
    const st = loadSettings();
    sound.setMuted(st.muted);
    sound.unlock();
    const p = loadProgress();
    // backing store
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 480 * dpr;
    canvas.height = 800 * dpr;
    const engine = new DefenseEngine(canvas, sound, {
      onHud: (h) => setHud(h),
      onShop: (s) => {
        setShop(s);
        changeScreen('shop');
      },
      onGameOver: (r) => finishRun(r, c, d),
      onBanner: (title, sub) => showBanner(title, sub),
    });
    engineRef.current = engine;
    aimRef.current = { x: 240, y: 200 };
    setRunMeta({ course: c, difficulty: d });
    setResult(null);
    setShop(null);
    setNewAch([]);
    changeScreen('playing');
    engine.start(COURSES[c], DIFFICULTIES[d], {
      shake: st.shake,
      perksDmg: 1 + p.powerBonus * 0.04,
      wallMax: 140 + p.wallBonus * 10,
      baseMax: 100 + p.baseBonus * 5,
    });
  }, [destroyEngine, finishRun, showBanner, changeScreen]);

  useEffect(() => () => destroyEngine(), [destroyEngine]);

  // タブ切り替え・最小化で自動一時停止
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && screenRef.current === 'playing') {
        engineRef.current?.setPaused(true);
        soundRef.current?.suspend();
        changeScreen('paused');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [changeScreen]);

  // Floating virtual joystick integration
  useEffect(() => {
    if (screen !== 'playing') return;
    const stage = stageRef.current;
    if (!stage) return;
    const joystick = new VirtualJoystick({ maxRadius: 52, deadzone: 0.08, touchOnly: false });
    joystick.attach(stage);
    joystickRef.current = joystick;

    let rafId = 0;
    const poll = () => {
      if (screenRef.current === 'playing') {
        const vec = joystick.getVector();
        if (vec.active && Math.abs(vec.x) > 0.02) {
          const targetX = Math.max(10, Math.min(470, 240 + vec.x * 200));
          aimRef.current.x = targetX;
          engineRef.current?.setAim(targetX, 200);
        }
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      joystick.detach();
      joystickRef.current = null;
    };
  }, [screen]);

  // ---- input ----
  const toLogical = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 240, y: 200 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 480,
      y: ((clientY - rect.top) / rect.height) * 800,
    };
  }, []);

  const onPointer = useCallback((e: React.PointerEvent) => {
    if (screenRef.current !== 'playing') return;
    const p = toLogical(e.clientX, e.clientY);
    aimRef.current = p;
    engineRef.current?.setAim(p.x, p.y);
    soundRef.current?.unlock();
  }, [toLogical]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      const s = screenRef.current;
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (s === 'playing') {
          eng.setPaused(true);
          soundRef.current?.suspend();
          changeScreen('paused');
        } else if (s === 'paused') {
          soundRef.current?.resume();
          eng.setPaused(false);
          changeScreen('playing');
        }
        return;
      }
      if (s !== 'playing') return;
      const step = 26;
      const a = aimRef.current;
      let nx = a.x;
      let ny = a.y;
      if (e.key === 'ArrowLeft' || e.key === 'a') nx -= step;
      else if (e.key === 'ArrowRight' || e.key === 'd') nx += step;
      else if (e.key === 'ArrowUp' || e.key === 'w') ny -= step;
      else if (e.key === 'ArrowDown' || e.key === 's') ny += step;
      else return;
      e.preventDefault();
      nx = Math.max(0, Math.min(480, nx));
      ny = Math.max(0, Math.min(800, ny));
      aimRef.current = { x: nx, y: ny };
      eng.setAim(nx, ny);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeScreen]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      soundRef.current?.setMuted(next);
      const s = loadSettings();
      saveSettings({ ...s, muted: next });
      return next;
    });
  }, []);

  const toggleShake = useCallback(() => {
    setShake((v) => {
      const next = !v;
      const s = loadSettings();
      saveSettings({ ...s, shake: next });
      return next;
    });
  }, []);

  const buy = useCallback((id: string) => {
    const eng = engineRef.current;
    if (!eng) return;
    if (eng.buy(id)) {
      // refresh shop snapshot (victory flag preserved)
      setShop((prev) => (prev ? eng.snapshotShop(prev.victory) : prev));
    }
  }, []);

  const buyPerk = useCallback((id: 'power' | 'wall' | 'base') => {
    const p = loadProgress();
    const perk = PERKS.find((x) => x.id === id);
    if (!perk) return;
    const lv = id === 'power' ? p.powerBonus : id === 'wall' ? p.wallBonus : p.baseBonus;
    if (lv >= perk.max || p.coins < perk.cost(lv)) return;
    p.coins -= perk.cost(lv);
    if (id === 'power') p.powerBonus++;
    else if (id === 'wall') p.wallBonus++;
    else p.baseBonus++;
    saveProgress(p);
    setProg(p);
    setBank(p.coins);
    soundRef.current?.unlock();
    soundRef.current?.pickup();
  }, []);

  const resumeFromShop = useCallback(() => {
    setShop(null);
    changeScreen('playing');
    engineRef.current?.nextWave();
  }, [changeScreen]);

  const goEndless = useCallback(() => {
    setShop(null);
    changeScreen('playing');
    engineRef.current?.continueEndless();
  }, [changeScreen]);

  const finishVictory = useCallback(() => {
    engineRef.current?.completeRun();
  }, []);

  const pauseGame = useCallback(() => {
    engineRef.current?.setPaused(true);
    soundRef.current?.suspend();
    changeScreen('paused');
  }, [changeScreen]);

  const resumeGame = useCallback(() => {
    soundRef.current?.resume();
    engineRef.current?.setPaused(false);
    changeScreen('playing');
  }, [changeScreen]);

  const quitToTitle = useCallback(() => {
    destroyEngine();
    setShop(null);
    setResult(null);
    setProg(loadProgress());
    setBank(loadProgress().coins);
    changeScreen('title');
  }, [destroyEngine, changeScreen]);

  const w = WEAPONS[hud.weapon];

  return (
    <div className="flex min-h-dvh w-full flex-col items-center bg-[#05070f] px-2 py-4 text-white">
      <div className="w-full max-w-[520px]">
        {/* header */}
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-black tracking-wide">社畜通勤サバイバー</h1>
          <div className="flex gap-2">
            <button onClick={toggleMute} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold" aria-label="ミュート切替">
              {muted ? '消音' : '音量'}
            </button>
            <button onClick={toggleShake} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold" aria-label="振動切替">
              {shake ? '振動ON' : '振動OFF'}
            </button>
            {(screen === 'playing') && (
              <button onClick={pauseGame} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold" aria-label="一時停止">一時停止</button>
            )}
          </div>
        </div>

        {/* Modern Glassmorphic HUD */}
        {(screen === 'playing' || screen === 'paused' || screen === 'shop') && (
          <div className="mb-2.5 rounded-2xl border border-white/15 bg-slate-950/60 p-3 text-xs shadow-2xl backdrop-blur-md">
            {/* Top Row: Station Distance, Score, Coins */}
            <div className="mb-2 flex items-center justify-between font-bold">
              <div className="flex items-center gap-1.5">
                <span className="rounded-lg bg-blue-950/60 px-2 py-0.5 text-blue-300 border border-blue-500/30">
                  会社まで あと{hud.distLeft}m
                </span>
                {hud.endless > 0 && (
                  <span className="rounded-lg bg-purple-950/60 px-1.5 py-0.5 text-[10px] text-purple-300 border border-purple-500/30 font-mono">
                    ∞ {hud.endless}日目
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-yellow-300 font-black">SCORE {hud.score.toLocaleString()}</span>
                <span className="text-amber-300 font-black">{hud.coins} コイン</span>
              </div>
            </div>

            {/* Distance Progress Track */}
            <div className="mb-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-amber-300 transition-all duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, ((hud.distTotal - hud.distLeft) / (hud.distTotal || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Barricade Durability Bar (4 Status States) */}
            <div className="mb-2">
              <BarricadeIntegrityBar wallHp={hud.wallHp} wallMax={hud.wallMax} />
            </div>

            {/* Squad HP Bar */}
            <div className="mb-2.5 flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-red-300">部隊体力</span>
                <span className="font-mono font-bold text-xs">{hud.baseHp} / {hud.baseMax}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/40 border border-white/10 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, (hud.baseHp / (hud.baseMax || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Bottom Row: Active Weapon Ring, Squad Count Badge, Combo Streak */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
              <WeaponRing weaponId={hud.weapon} durationLeft={hud.weaponT} />

              <div className="flex items-center gap-2">
                {/* Gate Buff Badge */}
                {hud.runDmgMul > 1.01 && (
                  <div className="flex items-center gap-1 rounded-full bg-fuchsia-950/70 px-2.5 py-1 text-xs font-black text-fuchsia-300 border border-fuchsia-500/40 shadow-[0_0_10px_rgba(217,70,239,0.35)]">
                    <span>火力</span>
                    <span className="rounded-full bg-fuchsia-500/30 px-1.5 py-0.5 text-xs text-white font-mono">
                      ×{hud.runDmgMul.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Squad Count Badge */}
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/70 px-2.5 py-1 text-xs font-black text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <span>同期</span>
                  <span className="rounded-full bg-emerald-500/30 px-1.5 py-0.5 text-xs text-white font-mono">
                    {1 + hud.allies}人
                  </span>
                </div>

                {/* Combo & Kills Badges */}
                <div className="flex flex-col items-end text-[10px] text-gray-300 font-bold">
                  <span className="text-orange-400 font-mono">{hud.combo}連撃</span>
                  <span className="text-gray-400 font-mono">{hud.kills}撃破</span>
                </div>
              </div>
            </div>

            {/* Last Gate Effect Banner */}
            {hud.lastGate && (
              <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-[10px] font-bold text-gray-300">
                直近の改札: <span className="text-amber-300">{hud.lastGate}</span>
              </div>
            )}

            {/* Boss Locomotive Bar */}
            {hud.bossMax > 0 && (
              <div className="mt-2.5 rounded-xl border border-red-500/40 bg-red-950/40 p-2 text-xs animate-pulse">
                <div className="mb-1 flex items-center justify-between font-black text-red-300">
                  <span>満員電車 (BOSS)</span>
                  <span className="font-mono">{hud.bossHp} / {hud.bossMax}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/50 border border-red-500/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-150"
                    style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / hud.bossMax) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* stage */}
        <div
          ref={stageRef}
          className="relative overflow-hidden rounded-xl border border-white/15"
          style={{ aspectRatio: '3 / 5' }}
          onPointerDown={onPointer}
          onPointerMove={onPointer}
        >
          <canvas ref={canvasRef} className="h-full w-full touch-none select-none" width={480} height={800} />

          {banner && (screen === 'playing') && (
            <div key={banner.key} className="pointer-events-none absolute inset-x-4 top-16 rounded-xl bg-black/70 p-3 text-center">
              <p className="text-base font-black text-yellow-300">{banner.title}</p>
              <p className="text-xs text-gray-200">{banner.sub}</p>
            </div>
          )}

          {screen === 'title' && prog && <TitleOverlay
            course={course} setCourse={setCourse} difficulty={difficulty} setDifficulty={setDifficulty}
            bank={bank} records={records} prog={prog}
            showHelp={showHelp} setShowHelp={setShowHelp}
            onStart={() => startRun(course, difficulty)}
            onBuyPerk={buyPerk}
          />}

          {screen === 'shop' && shop && (
            <ShopOverlay shop={shop} onBuy={buy} onNext={resumeFromShop} onEndless={goEndless} onFinish={finishVictory} />
          )}

          {screen === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <p className="text-2xl font-black">一時停止（サボり中）</p>
              <button onClick={resumeGame} className="rounded-xl bg-green-600 px-8 py-3 font-bold">業務に戻る</button>
              <button onClick={quitToTitle} className="rounded-xl bg-white/15 px-8 py-3 font-bold">タイトルに戻る</button>
            </div>
          )}

          {screen === 'result' && result && (
            <ResultOverlay
              result={result} meta={runMeta} records={records} newAch={newAch}
              onRetry={() => startRun(runMeta.course, runMeta.difficulty)}
              onTitle={quitToTitle}
            />
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          左右ドラッグで移動（自動前進・自動射撃）・緑ゲートを選んで強化・段ボールを撃つと武器変化・SOSを撃つと同期が増加
        </p>
      </div>
    </div>
  );
}

/* ---------------- title ---------------- */

type HandbookTab = 'none' | 'perk' | 'ach' | 'codex';

function TitleOverlay(props: {
  course: CourseId; setCourse: (c: CourseId) => void;
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  bank: number; records: RecordEntry[]; prog: Progress;
  showHelp: boolean; setShowHelp: (v: boolean) => void;
  onStart: () => void;
  onBuyPerk: (id: 'power' | 'wall' | 'base') => void;
}) {
  const { course, setCourse, difficulty, setDifficulty, bank, records, prog, showHelp, setShowHelp, onStart, onBuyPerk } = props;
  const [tab, setTab] = useState<HandbookTab>('none');
  const toggle = (t: HandbookTab) => setTab((prev) => (prev === t ? 'none' : t));
  const achCount = prog.achievements.length;
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-black/90 via-black/85 to-black/95 p-4">
      <div className="relative mb-3 overflow-hidden rounded-xl border border-cyan-500/40 shadow-lg shadow-cyan-950/50">
        <img
          src="/assets/defense_cover.jpg"
          alt="Commuter Defense 3D"
          className="h-32 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-2.5">
          <p className="text-[10px] font-black tracking-widest text-cyan-400 font-mono">COMMUTER DEFENSE: 3D</p>
          <h2 className="text-lg font-black text-white drop-shadow-md">社畜通勤サバイバー</h2>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-gray-300">満員ラッシュを突破して会社へ！緑ゲートで強化、段ボールで武器GET、同期を救出せよ！</p>

      <p className="mb-1 mt-4 text-xs font-bold text-gray-300">■ 路線選択</p>
      <div className="grid grid-cols-3 gap-2">
        {COURSE_ORDER.map((c) => {
          const def = COURSES[c];
          const locked = !prog.unlocked.includes(c);
          return (
            <button
              key={c}
              disabled={locked}
              onClick={() => setCourse(c)}
              title={def.desc}
              className={`rounded-xl border p-2 text-center ${course === c ? 'border-yellow-300 bg-yellow-300/15' : 'border-white/15 bg-white/5'} ${locked ? 'opacity-40' : ''}`}
            >
              <span className="text-xs font-mono font-bold text-amber-300">{locked ? '[施錠]' : '[開放]'}</span>
              <p className="text-xs font-bold">{def.name}</p>
              <p className="text-[10px] text-gray-400">{def.waves * 100}m</p>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-center text-[10px] text-gray-400">{COURSES[course].desc}</p>

      <p className="mb-1 mt-3 text-xs font-bold text-gray-300">■ 働き方</p>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((d) => {
          const def = DIFFICULTIES[d];
          return (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border p-2 text-center ${difficulty === d ? 'border-green-300 bg-green-300/15' : 'border-white/15 bg-white/5'}`}
            >
              <p className="text-xs font-bold">{def.name}</p>
              <p className="text-[10px] text-gray-400">×{def.scoreMul}</p>
            </button>
          );
        })}
      </div>

      <button onClick={onStart} className="mt-4 w-full rounded-xl bg-red-600 py-3 text-lg font-black shadow-lg">
        出社する
      </button>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
        <span>へそくり: {bank} コイン</span>
        <span>{prog.totalKills}撃破・{prog.totalRuns}出社</span>
      </div>

      <p className="mb-1 mt-3 text-xs font-bold text-gray-300">■ 社畜手帳（やりこみ）</p>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <button onClick={() => setShowHelp(!showHelp)} className={`rounded-lg px-2 py-2 font-bold ${showHelp ? 'bg-indigo-600' : 'bg-white/10'}`}>遊び方</button>
        <button onClick={() => toggle('perk')} className={`rounded-lg px-2 py-2 font-bold ${tab === 'perk' ? 'bg-indigo-600' : 'bg-white/10'}`}>強化</button>
        <button onClick={() => toggle('ach')} className={`rounded-lg px-2 py-2 font-bold ${tab === 'ach' ? 'bg-indigo-600' : 'bg-white/10'}`}>実績 {achCount}/{ACHIEVEMENTS.length}</button>
        <button onClick={() => toggle('codex')} className={`rounded-lg px-2 py-2 font-bold ${tab === 'codex' ? 'bg-indigo-600' : 'bg-white/10'}`}>図鑑</button>
      </div>

      {showHelp && (
        <div className="mt-2 rounded-xl bg-white/10 p-3 text-[11px] leading-relaxed">
          <p><b>操作</b>: 左右にドラッグで移動。自動で前進＆自動射撃（3D）。</p>
          <p><b>ゲート選択</b>: 緑は強化（火力×2・連射UP・同期+1等）、赤は弱体化。体当たりする側を選べ！</p>
          <p><b>差し入れ段ボール</b>を撃つと… 武器GET(名刺/カバン/定期/特急/冷房)・お局の雷・残業代・ガード回復！</p>
          <p><b>SOSケージ</b>を撃つと同期が参戦(最大{MAX_ALLIES}人)。同期は自動援護。</p>
          <p><b>満員電車（ボス）</b>は倒すと大量ボーナス。倒せなくても逃げ切りOK！</p>
          <p>群衆にぶつかるとガード→体力の順に減少。体力0で過労ダウン。</p>
          <p>会社に到着で出社成功→次の路線解放＆エンドレス残業へ。</p>
          <p>スコア・解放・へそくり・図鑑・実績は自動セーブ。</p>
        </div>
      )}

      {tab === 'perk' && (
        <div className="mt-2 space-y-2">
          {PERKS.map((perk) => {
            const lv = perk.id === 'power' ? prog.powerBonus : perk.id === 'wall' ? prog.wallBonus : prog.baseBonus;
            const maxed = lv >= perk.max;
            const cost = perk.cost(lv);
            const afford = bank >= cost;
            return (
              <div key={perk.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 p-2 text-xs">
                <div>
                  <p className="font-bold">{perk.name} Lv{lv}/{perk.max}</p>
                  <p className="text-gray-300">{perk.desc}</p>
                </div>
                <button
                  disabled={maxed || !afford}
                  onClick={() => onBuyPerk(perk.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 font-bold ${!maxed && afford ? 'bg-green-600' : 'bg-white/10 opacity-50'}`}
                >
                  {maxed ? 'MAX' : `${cost} コイン`}
                </button>
              </div>
            );
          })}
          <p className="text-[10px] text-gray-400">※ へそくり（残業代）で恒久強化。出社ごとに効果発動。</p>
        </div>
      )}

      {tab === 'ach' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const got = prog.achievements.includes(a.id);
            return (
              <div key={a.id} className={`rounded-xl p-2 text-xs ${got ? 'bg-yellow-300/15 border border-yellow-300/50' : 'bg-white/5 opacity-50'}`}>
                <p className="font-bold">{got ? a.name : '？？？'}</p>
                <p className="text-[10px] text-gray-300">{got ? a.desc : 'まだ解除されていない'}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'codex' && (
        <div className="mt-2 space-y-1">
          {ENEMY_ORDER.map((k) => {
            const def = ENEMIES[k];
            const n = prog.codex[k] ?? 0;
            return (
              <div key={k} className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
                <span>{n > 0 ? def.name : '？？？'}</span>
                <span className="font-bold text-yellow-300">{n > 0 ? `${n}撃破` : '未確認'}</span>
              </div>
            );
          })}
        </div>
      )}

      {records.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold text-gray-300">■ 最高記録</p>
          <div className="space-y-1">
            {records.slice(0, 5).map((r, i) => (
              <div key={`${r.date}-${i}`} className="flex justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
                <span>{i + 1}位 {r.victory ? '[制覇] ' : ''}{COURSES[r.course].name} {DIFFICULTIES[r.difficulty].name}</span>
                <span className="font-bold text-yellow-300">{r.score.toLocaleString()}pt</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- shop ---------------- */

function ShopOverlay(props: { shop: ShopSnapshot; onBuy: (id: string) => void; onNext: () => void; onEndless: () => void; onFinish: () => void }) {
  const { shop, onBuy, onNext, onEndless, onFinish } = props;
  return (
    <div className="absolute inset-0 overflow-y-auto bg-black/85 p-4">
      <h2 className="text-center text-xl font-black text-yellow-300">
        {shop.victory ? '定時出社達成！' : '中間報告！'}
      </h2>
      <p className="mt-1 text-center text-sm text-amber-300">所持 {shop.coins} コイン ／ ガード {shop.wallHp}/{shop.wallMax} ／ 体力 {shop.baseHp}/{shop.baseMax} ／ 同期 {shop.allies}/{MAX_ALLIES}</p>
      <div className="mt-3 space-y-2">
        {SHOP.map((item) => {
          const cost = shop.costs[item.id] ?? 0;
          const afford = shop.coins >= cost;
          const maxed =
            (item.id === 'ally' && shop.allies >= MAX_ALLIES) ||
            (item.id === 'repair' && shop.wallHp >= shop.wallMax) ||
            (item.id === 'heal' && shop.baseHp >= shop.baseMax);
          const extra = item.id === 'power' ? ` (Lv${shop.powerLv})` : item.id === 'wall' ? ` (Lv${shop.wallLv})` : '';
          return (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 p-2">
              <div className="text-xs">
                <p className="font-bold">{item.name}{extra}</p>
                <p className="text-gray-300">{item.desc}</p>
              </div>
              <button
                disabled={!afford || maxed}
                onClick={() => onBuy(item.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${afford && !maxed ? 'bg-green-600' : 'bg-white/10 opacity-50'}`}
              >
                {maxed ? 'MAX' : `${cost} コイン`}
              </button>
            </div>
          );
        })}
      </div>
      {shop.victory ? (
        <div className="mt-3 space-y-2">
          <button onClick={onEndless} className="w-full rounded-xl bg-purple-600 py-3 font-black">終わらぬ残業に突入する</button>
          <button onClick={onFinish} className="w-full rounded-xl bg-yellow-500 py-3 font-black text-black">勤怠を付けて帰宅</button>
        </div>
      ) : (
        <button onClick={onNext} className="mt-3 w-full rounded-xl bg-red-600 py-3 font-black">
          WAVE {shop.endless > 0 ? `${shop.wave} +∞${shop.endless + 1}` : shop.wave + 1} へ出社
        </button>
      )}
    </div>
  );
}

/* ---------------- result ---------------- */

function ResultOverlay(props: { result: RunResult; meta: { course: CourseId; difficulty: Difficulty }; records: RecordEntry[]; newAch: string[]; onRetry: () => void; onTitle: () => void }) {
  const { result, meta, records, newAch, onRetry, onTitle } = props;
  return (
    <div className="absolute inset-0 overflow-y-auto bg-black/85 p-4 text-center">
      <p className="text-2xl font-black text-amber-300">{result.victory ? '出社達成' : '過労ダウン'}</p>
      <h2 className={`mt-1 text-2xl font-black ${result.victory ? 'text-yellow-300' : 'text-red-400'}`}>
        {result.victory ? '定時出社成功！' : '過労でダウン…'}
      </h2>
      <p className="text-xs text-gray-300">{COURSES[meta.course].name} × {DIFFICULTIES[meta.difficulty].name}{result.endless > 0 ? ` ＋ 無限${result.endless}` : ''}</p>
      <div className="mx-auto mt-3 grid max-w-[300px] grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">スコア</p><p className="text-lg font-black text-yellow-300">{result.score.toLocaleString()}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">走破距離</p><p className="text-lg font-black">{result.dist}m</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">撃破数</p><p className="text-lg font-black">{result.kills}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">最大連撃</p><p className="text-lg font-black">{result.maxCombo}</p></div>
      </div>
      <p className="mt-2 text-xs text-amber-300">{result.coins} コイン をへそくりに加算しました</p>
      {newAch.length > 0 && (
        <div className="mx-auto mt-2 max-w-[300px] rounded-xl border border-yellow-300/50 bg-yellow-300/10 p-2 text-xs">
          <p className="font-bold text-yellow-300">実績解除！</p>
          {newAch.map((id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            return <p key={id}>{a ? `${a.name} — ${a.desc}` : id}</p>;
          })}
        </div>
      )}
      <div className="mt-3 space-y-2">
        <button onClick={onRetry} className="w-full rounded-xl bg-red-600 py-3 font-black">もう一度出社</button>
        <button onClick={onTitle} className="w-full rounded-xl bg-white/15 py-3 font-black">タイトルに戻る</button>
      </div>
      {records.length > 0 && (
        <div className="mt-3 text-left">
          <p className="mb-1 text-xs font-bold text-gray-300">■ 最高記録</p>
          {records.slice(0, 5).map((r, i) => (
            <div key={`${r.date}-${i}`} className="mb-1 flex justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
              <span>{i + 1}位 {r.victory ? '[制覇] ' : ''}{COURSES[r.course].name} {DIFFICULTIES[r.difficulty].name}</span>
              <span className="font-bold text-yellow-300">{r.score.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
