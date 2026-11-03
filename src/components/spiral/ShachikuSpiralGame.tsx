'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SpiralEngine,
  type HudSnapshot,
  type BuildData,
  type RunResult,
  type UpgradeRarity,
} from '@/game/spiral/engine';
import { SpiralSound } from '@/game/spiral/audio';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import type { BgmTrackId } from '@/game/common/bgmTracks';
import {
  loadRecords, saveRecord, loadProgress, saveProgress,
  loadStats, applyRunToStats, applyRunDeltaToStats,
  loadAch, checkAchievements, claimAchievement, ACHIEVEMENTS,
  applyRunToEncy, applyRunDeltaToEncy,
  encyChains, encyUpgrades, encyCompletion,
  bestTitle,
  todayMissions, loadDaily, applyRunToDaily, applyRunDeltaToDaily, claimMission,
  type SpiralRecord, type SpiralStats, type AchState, type DailyState,
} from '@/game/spiral/storage';
import {
  DIFFICULTIES, DIFFICULTY_ORDER, META_UPGRADES, FINAL_WAVE, formatTime, CENTER,
  STAGES, STAGE_ORDER, UPGRADES, UPGRADE_ORDER,
  type Difficulty, type StageId,
} from '@/game/spiral/config';
import {
  SpiralLogoIcon, CreditIcon, HpIcon, WaveIcon, BurstIcon,
  BlasterIcon, DroneIcon, EnergyDrinkIcon, LaserBeamIcon,
  BriefcaseIcon, ChipIcon, DatabaseIcon, CalendarIcon, TrophyIcon,
  PauseIcon, PlayIcon, RefreshIcon,
  CheckIcon, LockIcon, TechUpgradeIcon,
  StarIcon, FastForwardIcon, CrosshairIcon, SkullBossIcon, DpsBoltIcon,
} from './SpiralIcons';

type Screen = 'title' | 'playing' | 'build' | 'paused' | 'result';
type TitleTab = 'play' | 'power' | 'dex' | 'daily' | 'ach';

const DEFAULT_HUD: HudSnapshot = {
  hp: 120, maxHp: 120, wave: 1, totalWaves: FINAL_WAVE,
  phase: 'build', timeSec: 0, score: 0, coins: 0, segs: 0, chainsLeft: 0, chests: 0, drops: 0,
  build: { dmg: 12, interval: 0.45, count: 1, pierce: 0, crit: 0.05, orbN: 0, blastLv: 0, beamLv: 0 },
  levels: [], bossName: '', bossHp: 0, bossMax: 0, endless: false,
  shield: 20, maxShield: 60, bossWave: false, waveSpawnTotal: 1, clearing: false,
  dps: 0, peakDps: 0, speedScale: 1, segsRemaining: 0,
};

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden bg-[#090d16] ring-1 ring-[#1e293b]">
      <div
        className={`h-full transition-all duration-150 ${className}`}
        style={{ width: `${Math.max(0, Math.min(100, (value / (max || 1)) * 100))}%` }}
      />
    </div>
  );
}

const RARITY_STYLES: Record<UpgradeRarity, {
  border: string;
  headerBg: string;
  badge: string;
  badgeText: string;
  glow: string;
  emblemRing: string;
  starColor: string;
}> = {
  common: {
    border: 'border-[#0284c7] hover:border-[#38bdf8]',
    headerBg: 'bg-gradient-to-r from-[#0369a1] to-[#0c4a6e] text-[#e0f2fe]',
    badge: 'bg-[#0c4a6e] text-[#38bdf8]',
    badgeText: 'NORMAL',
    glow: 'bg-[#0b1526]',
    emblemRing: 'border-[#38bdf8]/60 bg-[#082f49]/60 text-[#38bdf8]',
    starColor: '#38bdf8',
  },
  rare: {
    border: 'border-[#9333ea] hover:border-[#c084fc]',
    headerBg: 'bg-gradient-to-r from-[#7e22ce] to-[#4c1d95] text-[#f3e8ff]',
    badge: 'bg-[#581c87] text-[#e9d5ff]',
    badgeText: 'RARE',
    glow: 'bg-[#150d2a]',
    emblemRing: 'border-[#c084fc]/70 bg-[#3b0764]/60 text-[#e879f9]',
    starColor: '#c084fc',
  },
  epic: {
    border: 'border-[#f59e0b] hover:border-[#fde047]',
    headerBg: 'bg-gradient-to-r from-[#d97706] via-[#b45309] to-[#78350f] text-[#fef3c7]',
    badge: 'bg-[#78350f] text-[#fde047]',
    badgeText: 'EPIC',
    glow: 'bg-[#1c1408]',
    emblemRing: 'border-[#fbbf24]/80 bg-[#451a03]/70 text-[#fde047]',
    starColor: '#fbbf24',
  },
};

export default function ShachikuSpiralGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SpiralEngine | null>(null);
  const soundRef = useRef<SpiralSound | null>(null);
  const screenRef = useRef<Screen>('title');
  const keysRef = useRef<Set<string>>(new Set());
  const bannerTimer = useRef<number | null>(null);
  const lastSettledRunRef = useRef<RunResult | null>(null);

  const [screen, setScreen] = useState<Screen>('title');
  const changeScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreen(s);
  }, []);

  const [hud, setHud] = useState<HudSnapshot>(DEFAULT_HUD);
  const [build, setBuild] = useState<BuildData | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [freshAch, setFreshAch] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ title: string; sub: string; key: number } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [stageSel, setStageSel] = useState<StageId>('hq');
  const [tab, setTab] = useState<TitleTab>('play');
  const [manualAimActive, setManualAimActive] = useState(false);
  const [manualAimLocked, setManualAimLocked] = useState(false);
  const [speedScale, setSpeedScale] = useState<1 | 2>(1);

  const [records, setRecords] = useState<SpiralRecord[]>([]);
  const [bank, setBank] = useState(0);
  const [metaLv, setMetaLv] = useState<Record<string, number>>({ atk: 0, hp: 0, rate: 0 });
  const [stats, setStats] = useState<SpiralStats>({ runs: 0, wins: 0, bestWave: 0, totalSegs: 0, maxScore: 0 });
  const [ach, setAch] = useState<AchState>({ unlocked: {}, claimed: {} });
  const [daily, setDaily] = useState<DailyState>({ date: '', progress: {}, claimed: {} });
  const [runMeta, setRunMeta] = useState<{ difficulty: Difficulty; stage: StageId }>({ difficulty: 'normal', stage: 'hq' });

  const toggleSpeed = useCallback(() => {
    const next: 1 | 2 = speedScale === 1 ? 2 : 1;
    setSpeedScale(next);
    engineRef.current?.setSpeed(next);
  }, [speedScale]);

  const toggleAimMode = useCallback(() => {
    if (manualAimLocked || manualAimActive) {
      setManualAimLocked(false);
      setManualAimActive(false);
      engineRef.current?.clearAim();
    } else {
      setManualAimLocked(true);
      setManualAimActive(true);
      engineRef.current?.setAim(CENTER, CENTER - 200);
    }
  }, [manualAimLocked, manualAimActive]);

  // Shared BGM integration
  const bgmTrack: BgmTrackId | null =
    screen === 'title'
      ? 'shachiku-menu'
      : screen === 'result'
        ? null
        : hud.bossWave || hud.bossMax > 0
          ? 'spiral-boss'
          : 'spiral-battle';
  useBgm(bgmTrack, screen === 'paused');

  useEffect(() => {
    setRecords(loadRecords());
    const p = loadProgress();
    setBank(p.coins);
    setMetaLv({ ...p.meta });
    setStats(loadStats());
    setAch(loadAch());
    setDaily(loadDaily());
  }, []);

  const showBanner = useCallback((title: string, sub: string) => {
    setBanner({ title, sub, key: Date.now() });
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 2500);
  }, []);

  // Keyboard aims the fixed turret around the core
  const aimRef = useRef(0);
  const pushMove = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    let x = 0; let y = 0;
    const k = keysRef.current;
    if (k.has('left')) x -= 1;
    if (k.has('right')) x += 1;
    if (k.has('up')) y -= 1;
    if (k.has('down')) y += 1;
    if (x === 0 && y === 0) return;
    aimRef.current = Math.atan2(y, x);
    const R = 240;
    eng.setAim(CENTER + Math.cos(aimRef.current) * R, CENTER + Math.sin(aimRef.current) * R);
    setManualAimActive(true);
  }, []);

  useEffect(() => {
    if (screen !== 'playing') return;
    let animId = 0;
    const pollInput = () => {
      pushMove();
      animId = requestAnimationFrame(pollInput);
    };
    animId = requestAnimationFrame(pollInput);
    return () => cancelAnimationFrame(animId);
  }, [pushMove, screen]);

  const destroyEngine = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      destroyEngine();
      soundRef.current?.destroy();
      soundRef.current = null;
    };
  }, [destroyEngine]);

  const finishRun = useCallback((r: RunResult, d: Difficulty) => {
    const previousSettlement = lastSettledRunRef.current;
    const isFirstSettlement = previousSettlement === null;

    if (isFirstSettlement) {
      setRecords(saveRecord({ score: r.score, wave: r.wave, victory: r.victory, difficulty: d, date: Date.now() }));
    }

    const p = loadProgress();
    p.coins += isFirstSettlement ? r.coins : Math.max(0, r.coins - previousSettlement.coins);
    if (isFirstSettlement) {
      p.runs += 1;
      if (r.victory) p.wins += 1;
    }
    saveProgress(p);
    setBank(p.coins);
    setMetaLv({ ...p.meta });

    const s = isFirstSettlement
      ? applyRunToStats(r)
      : applyRunDeltaToStats(previousSettlement, r);
    setStats(s);

    if (isFirstSettlement) {
      applyRunToEncy(r);
      applyRunToDaily(r);
    } else {
      applyRunDeltaToEncy(previousSettlement, r);
      applyRunDeltaToDaily(previousSettlement, r);
    }
    setDaily(loadDaily());

    const fresh = checkAchievements(s, r);
    setAch(loadAch());
    setFreshAch(fresh.map((a) => a.id));
    lastSettledRunRef.current = r;
    setResult(r);
    changeScreen('result');
  }, [changeScreen]);

  const startRun = useCallback((d: Difficulty, st: StageId = 'hq') => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    destroyEngine();

    if (!soundRef.current) soundRef.current = new SpiralSound();
    const sound = soundRef.current;
    sound.unlock();

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 640 * dpr;
    canvas.height = 640 * dpr;

    const p = loadProgress();
    const m = p.meta;
    const engine = new SpiralEngine(canvas, sound, {
      onHud: (h) => setHud(h),
      onBuild: (b) => {
        setBuild(b);
        setManualAimActive(false);
        changeScreen('build');
      },
      onGameOver: (r) => finishRun(r, d),
      onBanner: (title, sub) => showBanner(title, sub),
    });
    engineRef.current = engine;
    engine.setSpeed(speedScale);

    keysRef.current = new Set();
    setManualAimActive(false);
    setManualAimLocked(false);
    setRunMeta({ difficulty: d, stage: st });
    lastSettledRunRef.current = null;
    setResult(null);
    setBuild(null);
    setFreshAch([]);

    engine.start({
      difficulty: d,
      stage: st,
      dmgMul: 1 + 0.04 * (m.atk ?? 0),
      maxHpBonus: 10 * (m.hp ?? 0),
      rateMul: 1 + 0.02 * (m.rate ?? 0),
    });
  }, [destroyEngine, finishRun, showBanner, changeScreen, speedScale]);

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

  const chooseUpgrade = useCallback((key: string) => {
    const c = build?.choices.find((x) => `${x.kind}:${x.id}` === key);
    if (!c) return;
    engineRef.current?.applyUpgrade(c);
    setBuild(null);
    changeScreen('playing');
  }, [build, changeScreen]);

  // Keyboard navigation + build shortcuts
  useEffect(() => {
    const map = (key: string): string | null => {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
      if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
      if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'up';
      if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down';
      return null;
    };
    const down = (e: KeyboardEvent) => {
      if (screenRef.current === 'build' && build) {
        if (e.key === '1' && build.choices[0]) {
          chooseUpgrade(`${build.choices[0].kind}:${build.choices[0].id}`);
          return;
        }
        if (e.key === '2' && build.choices[1]) {
          chooseUpgrade(`${build.choices[1].kind}:${build.choices[1].id}`);
          return;
        }
        if (e.key === '3' && build.choices[2]) {
          chooseUpgrade(`${build.choices[2].kind}:${build.choices[2].id}`);
          return;
        }
        if ((e.key === 'r' || e.key === 'R') && build.canReroll) {
          engineRef.current?.rerollBuild();
          return;
        }
      }
      const m = map(e.key);
      if (m && screenRef.current === 'playing') {
        e.preventDefault();
        keysRef.current.add(m);
        pushMove();
      }
      if ((e.key === 'f' || e.key === 'F') && screenRef.current === 'playing') {
        toggleSpeed();
      }
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (screenRef.current === 'playing') pauseGame();
        else if (screenRef.current === 'paused') resumeGame();
      }
    };
    const up = (e: KeyboardEvent) => {
      const m = map(e.key);
      if (m) {
        keysRef.current.delete(m);
        if (keysRef.current.size === 0 && !manualAimLocked) {
          engineRef.current?.clearAim();
          setManualAimActive(false);
        } else {
          pushMove();
        }
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [pushMove, pauseGame, resumeGame, build, chooseUpgrade, toggleSpeed, manualAimLocked]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && screenRef.current === 'playing') pauseGame();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pauseGame]);

  const quitToTitle = useCallback(() => {
    destroyEngine();
    setBuild(null);
    setResult(null);
    setManualAimActive(false);
    setManualAimLocked(false);
    setStats(loadStats());
    setAch(loadAch());
    setDaily(loadDaily());
    const p = loadProgress();
    setBank(p.coins);
    setMetaLv({ ...p.meta });
    changeScreen('title');
  }, [destroyEngine, changeScreen]);

  const goEndless = useCallback(() => {
    setResult(null);
    engineRef.current?.continueEndless();
  }, []);

  const buyMeta = useCallback((id: string) => {
    const p = loadProgress();
    const m = p.meta;
    const def = META_UPGRADES.find((x) => x.id === id);
    if (!def) return;
    const lv = m[id as keyof typeof m] ?? 0;
    if (lv >= def.maxLv) return;
    const cost = def.cost(lv);
    if (p.coins < cost) return;
    p.coins -= cost;
    (m[id as keyof typeof m] as number) = lv + 1;
    saveProgress(p);
    setBank(p.coins);
    setMetaLv({ ...m });
    soundRef.current?.unlock();
    soundRef.current?.upgrade();
  }, []);

  const claimAchReward = useCallback((id: string) => {
    const reward = claimAchievement(id);
    if (reward > 0) {
      const p = loadProgress();
      p.coins += reward;
      saveProgress(p);
      setBank(p.coins);
      setAch(loadAch());
      soundRef.current?.coin();
    }
  }, []);

  const claimDailyReward = useCallback((id: string) => {
    const reward = claimMission(id);
    if (reward > 0) {
      const p = loadProgress();
      p.coins += reward;
      saveProgress(p);
      setBank(p.coins);
      setDaily(loadDaily());
      soundRef.current?.coin();
    }
  }, []);

  const title = bestTitle();
  const comp = encyCompletion();
  const missions = todayMissions();
  const nextBoss = hud.wave <= 5 ? 'W5 課長' : hud.wave <= 10 ? 'W10 役員' : hud.wave <= 15 ? 'W15 社長' : '無限残業';
  const waveClearRatio = hud.waveSpawnTotal > 0
    ? Math.max(0, Math.min(100, ((hud.waveSpawnTotal - hud.chainsLeft) / hud.waveSpawnTotal) * 100))
    : 0;
  const hpPercent = hud.maxHp > 0 ? hud.hp / hud.maxHp : 0;
  const hpBarColor = hpPercent > 0.45 ? 'bg-[#06b6d4]' : hpPercent > 0.22 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]';
  const levelMap = new Map(hud.levels.map((l) => [l.id, l.lv]));

  return (
    <div className="flex min-h-dvh w-full flex-col items-center bg-[#050811] px-2 py-2.5 text-[#e2e8f0] selection:bg-[#f59e0b] selection:text-[#070a12]">
      <div className="w-full max-w-[680px]">
        {/* Top Threat & Telemetry Bar (Cell Survivor Arcade Style) */}
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2 border border-[#1e293b] bg-[#0c1322] px-3 py-2 shadow-[0_4px_0_#020617]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center border border-[#38bdf8]/50 bg-[#070b14] shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <SpiralLogoIcon className="h-5 w-5 text-[#38bdf8]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-mono text-[9px] font-black tracking-[0.18em] text-[#38bdf8]">
                  CELL-SURVIVOR // CORE DEFENSE
                </p>
                <span className="border border-[#06b6d4]/40 bg-[#083344]/60 px-1.5 py-0.2 font-mono text-[8px] font-bold text-[#67e8f9]">
                  NO ENEMY BULLETS
                </span>
              </div>
              <p className="text-sm font-black tracking-wider text-[#f8fafc]">社畜スパイラル // 増殖細胞迎撃</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex h-9 items-center gap-1.5 border border-[#78350f] bg-[#1c1409] px-2.5 text-xs font-bold text-[#fbbf24]">
              <CreditIcon className="h-4 w-4 shrink-0" />
              <span className="font-mono">{bank.toLocaleString()}</span>
            </div>
            <div className="hidden h-9 items-center border border-[#1e293b] bg-[#090d16] px-2.5 text-xs font-semibold text-[#94a3b8] sm:flex">
              <span className="mr-1 font-mono text-[10px] text-[#38bdf8]">RANK:</span>
              <span className="text-[#f1f5f9]">{title.name}</span>
            </div>
            {(screen === 'playing' || screen === 'paused' || screen === 'build') && (
              <>
                <button
                  type="button"
                  onClick={toggleSpeed}
                  className={`flex h-9 items-center gap-1 border px-2.5 font-mono text-xs font-black transition ${
                    speedScale === 2
                      ? 'border-[#fbbf24] bg-[#451a03] text-[#fde047] shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                      : 'border-[#334155] bg-[#090d16] text-[#94a3b8] hover:border-[#38bdf8] hover:text-[#f8fafc]'
                  }`}
                  aria-label="倍速切替"
                  title="ゲーム速度 1x / 2x 切替 (Fキー)"
                >
                  <FastForwardIcon className="h-3.5 w-3.5" />
                  <span>{speedScale}x SPEED</span>
                </button>
                <button
                  type="button"
                  onClick={toggleAimMode}
                  className={`flex h-9 items-center gap-1 border px-2.5 font-mono text-xs font-black transition ${
                    manualAimActive || manualAimLocked
                      ? 'border-[#38bdf8] bg-[#0c192c] text-[#38bdf8]'
                      : 'border-[#10b981]/60 bg-[#064e3b]/50 text-[#6ee7b7]'
                  }`}
                  aria-label="照準モード切替"
                  title="自動追尾 / 手動照準 切替"
                >
                  <CrosshairIcon className="h-3.5 w-3.5" />
                  <span>{manualAimActive || manualAimLocked ? 'MANUAL' : 'AUTO'}</span>
                </button>
              </>
            )}
            <AudioToggle variant="compact" />
            {screen === 'playing' && (
              <button
                type="button"
                onClick={pauseGame}
                className="flex h-9 w-9 items-center justify-center border border-[#38bdf8]/50 bg-[#0c192c] text-[#38bdf8] transition hover:bg-[#152c4a]"
                aria-label="一時停止"
                title="一時停止 (P / Esc)"
              >
                <PauseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {/* Cell Survivor Threat & DPS Telemetry HUD */}
        {(screen === 'playing' || screen === 'paused' || screen === 'build') && (
          <section className="mb-2 border border-[#1e293b] bg-[#0c1322] p-2.5 text-xs shadow-[0_4px_0_#020617]">
            {/* Row 1: Wave Gauge + Boss Indicator + Live DPS Meter + Score/Coins */}
            <div className="mb-2 grid grid-cols-2 gap-1.5 border-b border-[#1e293b] pb-2 font-mono sm:grid-cols-5">
              <div className="border-l-2 border-[#38bdf8] bg-[#070b14] px-2 py-1">
                <p className="text-[9px] text-[#64748b]">WAVE PROGRESS</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#38bdf8]">
                    W{hud.wave}{hud.endless ? ' [OT]' : `/${hud.totalWaves}`}
                  </p>
                  {hud.bossWave && <SkullBossIcon className="h-3.5 w-3.5 text-[#f87171]" />}
                </div>
              </div>

              <div className="border-l-2 border-[#f59e0b] bg-[#070b14] px-2 py-1">
                <p className="text-[9px] text-[#64748b]">LIVE DPS // 瞬間火力</p>
                <p className="flex items-center gap-1 text-xs font-black text-[#fde047]">
                  <DpsBoltIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{(hud.dps ?? 0).toLocaleString()} DMG/s</span>
                </p>
              </div>

              <div className="border-l-2 border-[#ec4899] bg-[#070b14] px-2 py-1">
                <p className="text-[9px] text-[#64748b]">CELLS LEFT // 残細胞</p>
                <p className="flex items-center justify-between text-xs font-black text-[#f472b6]">
                  <span>{hud.segsRemaining} 節</span>
                  <span className="text-[10px] text-[#94a3b8]">({hud.chainsLeft}列)</span>
                </p>
              </div>

              <div className="border-l-2 border-[#fbbf24] bg-[#070b14] px-2 py-1">
                <p className="text-[9px] text-[#64748b]">SCORE</p>
                <p className="text-xs font-black text-[#fbbf24]">{hud.score.toLocaleString()}</p>
              </div>

              <div className="col-span-2 border-l-2 border-[#10b981] bg-[#070b14] px-2 py-1 sm:col-span-1">
                <p className="text-[9px] text-[#64748b]">COINS / SLICED</p>
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-1 text-[#fde047]">
                    <CreditIcon className="h-3.5 w-3.5" />
                    {hud.coins}
                  </span>
                  <span className="flex items-center gap-0.5 text-[#34d399]">
                    <BurstIcon className="h-3 w-3" />
                    {hud.segs}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Wave Sweep Progress Gauge with Boss Checkpoint Indicator */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-2">
                <span className="flex items-center gap-1 font-mono text-[10px] font-black text-[#38bdf8]">
                  <SkullBossIcon className="h-3.5 w-3.5" />
                  <span>{hud.bossWave ? 'BOSS WAVE' : `NEXT: ${nextBoss}`}</span>
                </span>
                <div className="relative h-2.5 flex-1 overflow-hidden bg-[#070b14] ring-1 ring-[#1e293b]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      hud.bossWave
                        ? 'bg-gradient-to-r from-[#dc2626] via-[#f59e0b] to-[#fde047]'
                        : 'bg-gradient-to-r from-[#0284c7] via-[#06b6d4] to-[#22c55e]'
                    }`}
                    style={{ width: `${hud.clearing ? 100 : waveClearRatio}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] font-bold text-[#cbd5e1]">
                  {Math.round(hud.clearing ? 100 : waveClearRatio)}%
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                {hud.clearing && (
                  <span className="border border-[#fbbf24] bg-[#451a03] px-2 py-0.5 font-bold text-[#fde047]">
                    VACUUM // 全報酬吸引中
                  </span>
                )}
                {hud.chests > 0 && (
                  <span className="border border-[#f59e0b] bg-[#451a03] px-2 py-0.5 font-bold text-[#fde047]">
                    宝箱×{hud.chests}
                  </span>
                )}
                {hud.drops > 0 && (
                  <span className="border border-[#10b981] bg-[#064e3b] px-2 py-0.5 font-bold text-[#6ee7b7]">
                    回収×{hud.drops}
                  </span>
                )}
              </div>
            </div>

            {/* Row 3: Core HP & Shield Dual Gauges */}
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <div className="flex items-center gap-2 bg-[#070b14] px-2 py-1 ring-1 ring-[#1e293b]">
                <div className="flex w-16 shrink-0 items-center gap-1 font-mono text-[10px] font-bold text-[#38bdf8]">
                  <HpIcon className="h-3.5 w-3.5" />
                  <span>CORE HP</span>
                </div>
                <Bar value={hud.hp} max={hud.maxHp} className={hpBarColor} />
                <span className="w-16 shrink-0 text-right font-mono text-[11px] font-bold text-[#e2e8f0]">
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-[#070b14] px-2 py-1 ring-1 ring-[#1e293b]">
                <span className="w-16 shrink-0 font-mono text-[10px] font-bold text-[#7dd3fc]">
                  BARRIER
                </span>
                <Bar value={hud.shield} max={hud.maxShield} className="bg-[#38bdf8]" />
                <span className="w-14 shrink-0 text-right font-mono text-[11px] font-bold text-[#7dd3fc]">
                  {hud.shield}/{hud.maxShield}
                </span>
              </div>
            </div>

            {/* Active Boss Health Gauge */}
            {hud.bossMax > 0 && (
              <div className="mt-2 flex items-center gap-2 border border-[#dc2626] bg-[#2a0808] px-2.5 py-1.5">
                <SkullBossIcon className="h-4 w-4 shrink-0 text-[#f87171]" />
                <span className="w-28 shrink-0 truncate font-mono text-xs font-black text-[#fca5a5]">
                  {hud.bossName}
                </span>
                <Bar value={hud.bossHp} max={hud.bossMax} className="bg-gradient-to-r from-[#dc2626] to-[#f59e0b]" />
                <span className="w-24 shrink-0 text-right font-mono text-[11px] font-bold text-[#fecaca]">
                  {hud.bossHp}/{hud.bossMax}
                </span>
              </div>
            )}
          </section>
        )}

        {/* Game Canvas Container */}
        <div
          ref={stageRef}
          className="relative mx-auto w-full max-w-[560px] overflow-hidden border-2 border-[#1e293b] bg-[#070b18] shadow-[0_8px_0_#020617]"
          style={{ aspectRatio: '1 / 1' }}
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair touch-none select-none"
            width={640}
            height={640}
            onPointerDown={(e) => {
              if (screenRef.current !== 'playing') return;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 640;
              const y = ((e.clientY - rect.top) / rect.height) * 640;
              engineRef.current?.setAim(x, y);
              setManualAimActive(true);
              soundRef.current?.unlock();
            }}
            onPointerMove={(e) => {
              if (screenRef.current !== 'playing') return;
              if (e.pointerType === 'mouse' && e.buttons === 0 && !manualAimLocked) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 640;
              const y = ((e.clientY - rect.top) / rect.height) * 640;
              engineRef.current?.setAim(x, y);
              setManualAimActive(true);
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              if (keysRef.current.size === 0 && !manualAimLocked) {
                engineRef.current?.clearAim();
                setManualAimActive(false);
              }
            }}
            onPointerCancel={() => {
              if (keysRef.current.size === 0 && !manualAimLocked) {
                engineRef.current?.clearAim();
                setManualAimActive(false);
              }
            }}
          />

          {/* Banner notification */}
          {banner && (screen === 'playing' || screen === 'build') && (
            <div
              key={banner.key}
              className="pointer-events-none absolute inset-x-4 top-4 z-20 border-l-4 border-[#38bdf8] bg-[#090d16]/95 px-4 py-2.5 shadow-[0_4px_0_#020617] ring-1 ring-[#1e293b]"
            >
              <p className="font-mono text-xs font-black tracking-wider text-[#38bdf8]">{banner.title}</p>
              <p className="mt-0.5 text-xs text-[#cbd5e1]">{banner.sub}</p>
            </div>
          )}

          {/* Title Screen Overlay */}
          {screen === 'title' && (
            <TitleOverlay
              tab={tab} setTab={setTab}
              difficulty={difficulty} setDifficulty={setDifficulty}
              stageSel={stageSel} setStageSel={setStageSel}
              records={records} stats={stats}
              ach={ach} daily={daily} missions={missions}
              bank={bank} metaLv={metaLv} comp={comp}
              onStart={() => startRun(difficulty, stageSel)}
              onBuyMeta={buyMeta}
              onClaimAch={claimAchReward}
              onClaimDaily={claimDailyReward}
            />
          )}

          {/* 3-Card Roguelite Skill Selection Modal (Cell Survivor Style) */}
          {screen === 'build' && build && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050811]/92 p-2.5 sm:p-4">
              <div className="max-h-full w-full max-w-[540px] overflow-y-auto border-2 border-[#38bdf8]/60 bg-[#0b1323] p-3.5 shadow-[0_0_32px_rgba(14,165,233,0.28)] sm:p-4">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center border border-[#38bdf8] bg-[#082f49]">
                      <WaveIcon className="h-4 w-4 text-[#38bdf8]" />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-black tracking-[0.2em] text-[#38bdf8]">
                        {build.fromChest ? 'CHEST BONUS // CELLULAR EVOLUTION' : `WAVE ${build.wave} CLEAR // SELECT SKILL`}
                      </p>
                      <h2 className="text-base font-black tracking-wide text-[#f8fafc] sm:text-lg">
                        {build.fromChest ? '宝箱モジュール解放 — 強化スキル選択' : `第${build.wave}波突破 — 迎撃モジュール進化`}
                      </h2>
                    </div>
                  </div>
                  <span className="border border-[#1e293b] bg-[#070b14] px-2 py-1 font-mono text-[10px] text-[#94a3b8]">
                    [1][2][3] キー対応
                  </span>
                </div>

                {/* 3 Tall Roguelite Upgrade Cards */}
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {build.choices.map((c, idx) => {
                    const style = RARITY_STYLES[c.rarity ?? 'common'];
                    const upgDef = UPGRADES[c.id as keyof typeof UPGRADES];
                    const statDelta = upgDef?.statLabel
                      ? upgDef.statLabel(c.toLv)
                      : c.kind === 'bonus'
                        ? '即時リカバリー発動'
                        : '出力パラメータ強化';
                    const totalStars = c.maxLv > 0 ? Math.min(6, c.maxLv) : 1;
                    const filledStars = c.maxLv > 0 ? Math.min(totalStars, c.toLv) : 1;

                    return (
                      <button
                        type="button"
                        key={`${c.kind}:${c.id}`}
                        onClick={() => chooseUpgrade(`${c.kind}:${c.id}`)}
                        className={`group flex flex-col justify-between overflow-hidden border-2 ${style.border} ${style.glow} text-left transition hover:-translate-y-0.5 active:translate-y-0`}
                      >
                        {/* Rarity Header Banner */}
                        <div className={`flex w-full items-center justify-between px-2.5 py-1 font-mono text-[10px] font-black tracking-widest ${style.headerBg}`}>
                          <span>{style.badgeText}</span>
                          <span>#{idx + 1}</span>
                        </div>

                        {/* Card Body: Emblem + Title + Star Rank Bar + Stat Delta */}
                        <div className="flex flex-1 flex-col items-center p-3 text-center">
                          <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${style.emblemRing} shadow-[0_0_16px_rgba(56,189,248,0.2)] transition group-hover:scale-105`}>
                            <TechUpgradeIcon id={c.id} className="h-7 w-7" />
                          </div>

                          <div className="mt-2 flex items-center gap-1.5">
                            <p className="text-sm font-black text-[#f8fafc] group-hover:text-[#38bdf8]">
                              {c.name}
                            </p>
                            {c.isNew && (
                              <span className="bg-[#10b981] px-1.5 py-0.2 font-mono text-[9px] font-black text-[#052e16]">
                                NEW
                              </span>
                            )}
                          </div>

                          {/* SVG Star Rank Bar */}
                          <div className="mt-1.5 flex items-center justify-center gap-0.5">
                            {Array.from({ length: totalStars }).map((_, sIdx) => (
                              <StarIcon
                                key={sIdx}
                                className="h-3.5 w-3.5"
                                filled={sIdx < filledStars}
                                color={style.starColor}
                              />
                            ))}
                          </div>

                          <p className="mt-1 font-mono text-[10px] font-bold text-[#fbbf24]">
                            {c.maxLv > 0 ? `RANK Lv.${c.toLv} / ${c.maxLv}` : 'INSTANT SUPPLY'}
                          </p>

                          <p className="mt-1.5 text-[11px] leading-snug text-[#cbd5e1]">
                            {c.desc}
                          </p>

                          {/* Clear Stat Delta Preview */}
                          <div className="mt-2.5 w-full border border-[#1e293b] bg-[#070b14] px-2 py-1 font-mono text-[10px] font-bold text-[#38bdf8]">
                            {statDelta}
                          </div>
                        </div>

                        {/* Select Action Footer */}
                        <div className="w-full border-t border-[#1e293b] bg-[#070b14]/90 py-1.5 text-center font-mono text-[10px] font-black tracking-wider text-[#94a3b8] group-hover:bg-[#0284c7] group-hover:text-white">
                          SELECT MODULE
                        </div>
                      </button>
                    );
                  })}
                </div>

                {build.canReroll && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => engineRef.current?.rerollBuild()}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 border border-[#f59e0b] bg-[#1c1409] py-2.5 text-xs font-black text-[#fbbf24] transition hover:bg-[#291d0c]"
                    >
                      <RefreshIcon className="h-4 w-4 text-[#fbbf24]" />
                      <span>REROLL MODULES // 選択肢リロール（残り1回・[R]キー）</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paused Overlay */}
          {screen === 'paused' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070a12]/88 p-4">
              <div className="w-full max-w-xs border-2 border-[#334155] bg-[#0f172a] p-5 text-center shadow-[0_8px_0_#020617]">
                <p className="font-mono text-[10px] font-bold tracking-widest text-[#38bdf8]">
                  SYSTEM PAUSED // 業務一時保留
                </p>
                <PauseIcon className="mx-auto mt-2 h-8 w-8 text-[#fbbf24]" />
                <p className="mt-2 text-xl font-black tracking-wider text-[#f8fafc]">作戦一時待機</p>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  ドラッグ中は手動照準・指を離すと最寄り細胞ヘッドへ自動照準
                </p>

                <div className="mt-4 flex justify-center">
                  <AudioToggle variant="full" />
                </div>

                <button
                  type="button"
                  onClick={resumeGame}
                  className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 border border-[#38bdf8] bg-[#0284c7] px-6 py-3 font-black text-white shadow-[0_4px_0_#0369a1] transition hover:bg-[#0369a1]"
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>業務再開 (P / Esc)</span>
                </button>
                <button
                  type="button"
                  onClick={quitToTitle}
                  className="mt-2.5 min-h-[44px] w-full border border-[#334155] bg-[#090d16] px-6 py-2.5 text-sm font-bold text-[#94a3b8] transition hover:border-[#64748b] hover:text-white"
                >
                  タイトルへ撤退
                </button>
              </div>
            </div>
          )}

          {/* Result Overlay */}
          {screen === 'result' && result && (
            <ResultOverlay
              result={result} freshAch={freshAch} records={records}
              onRetry={() => startRun(runMeta.difficulty, runMeta.stage)}
              onEndless={result.victory ? goEndless : undefined}
              onTitle={quitToTitle}
            />
          )}
        </div>

        {/* Bottom Active Weapon & Module Dock (10 Modules with SVG Icons, Level Badge & Star Pips) */}
        {(screen === 'playing' || screen === 'paused' || screen === 'build') && (
          <section
            aria-label="アクティブ兵装ドック"
            className="mt-2 border border-[#1e293b] bg-[#0c1322] p-2 shadow-[0_4px_0_#020617]"
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <span className="font-black tracking-wider text-[#38bdf8]">
                ACTIVE WEAPON & MODULE DOCK // 迎撃モジュールスロット
              </span>
              <span className="text-[#94a3b8]">
                ATK {hud.build.dmg} / 連射 {(1 / hud.build.interval).toFixed(1)}発/s / 弾数×{hud.build.count} / 貫通 {hud.build.pierce} / 会心 {Math.round(hud.build.crit * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {UPGRADE_ORDER.map((id) => {
                const def = UPGRADES[id];
                const lv = levelMap.get(id) ?? 0;
                const unlocked = lv > 0;
                const maxStars = Math.min(5, def.maxLv);
                const filledStars = Math.min(maxStars, lv);
                return (
                  <div
                    key={id}
                    title={`${def.name}: ${def.desc}`}
                    className={`flex flex-col items-center justify-between border p-1.5 text-center transition ${
                      unlocked
                        ? 'border-[#38bdf8]/80 bg-[#082f49]/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                        : 'border-[#1e293b] bg-[#070b14] opacity-50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between font-mono text-[8px]">
                      <span className={unlocked ? 'font-black text-[#38bdf8]' : 'text-[#475569]'}>
                        {unlocked ? `Lv.${lv}` : 'LOCK'}
                      </span>
                      {lv >= def.maxLv && (
                        <span className="bg-[#f59e0b] px-1 font-black text-[#090d16]">MAX</span>
                      )}
                    </div>
                    <div className="my-1">
                      <TechUpgradeIcon
                        id={id}
                        className={`h-5 w-5 ${unlocked ? 'text-[#38bdf8]' : 'text-[#475569]'}`}
                      />
                    </div>
                    <p className="w-full truncate text-[9px] font-bold text-[#e2e8f0]">
                      {def.name}
                    </p>
                    <div className="mt-0.5 flex items-center justify-center gap-0.5">
                      {Array.from({ length: maxStars }).map((_, pipIdx) => (
                        <StarIcon
                          key={pipIdx}
                          className="h-2 w-2"
                          filled={pipIdx < filledStars}
                          color={lv >= def.maxLv ? '#fbbf24' : '#38bdf8'}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <p className="mt-2 text-center font-mono text-[11px] text-[#64748b]">
          [操作] ドラッグ: 手動照準 / 指を離す: 先頭細胞を自動追尾 / [F] または上部ボタン: 1x・2x倍速切替 / 敵弾なし・中心コア接触前に数値細胞を撃ち抜け
        </p>
      </div>
    </div>
  );
}

/* ---------------- Title Overlay ---------------- */

function TitleOverlay(props: {
  tab: TitleTab; setTab: (t: TitleTab) => void;
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  stageSel: StageId; setStageSel: (s: StageId) => void;
  records: SpiralRecord[]; stats: SpiralStats;
  ach: AchState; daily: DailyState;
  missions: { id: string; name: string; icon: string; desc: string; target: number; reward: number }[];
  bank: number; metaLv: Record<string, number>;
  comp: { chains: number; chainsTotal: number; upgrades: number; upgradesTotal: number };
  onStart: () => void;
  onBuyMeta: (id: string) => void;
  onClaimAch: (id: string) => void;
  onClaimDaily: (id: string) => void;
}) {
  const { tab, setTab } = props;
  const tabs: { id: TitleTab; label: string; icon: React.ReactNode }[] = [
    { id: 'play', label: '出勤', icon: <BriefcaseIcon className="h-4 w-4" /> },
    { id: 'power', label: '設備投資', icon: <ChipIcon className="h-4 w-4" /> },
    { id: 'dex', label: '機密図鑑', icon: <DatabaseIcon className="h-4 w-4" /> },
    { id: 'daily', label: '日課ノルマ', icon: <CalendarIcon className="h-4 w-4" /> },
    { id: 'ach', label: '人事考課', icon: <TrophyIcon className="h-4 w-4" /> },
  ];
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-[#090d16] p-3 sm:p-4">
      <div className="my-auto">
        <div className="relative mb-3 overflow-hidden border border-[#1e293b] bg-[#0f172a]">
          <Image
            src="/assets/spiral_cover.jpg"
            alt="Cybernetic Syndicate Spiral"
            width={800}
            height={447}
            className="h-24 w-full object-cover opacity-65 saturate-75 sm:h-28"
          />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#090d16] via-[#090d16]/70 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] font-black tracking-[0.2em] text-[#38bdf8]">
                  TACTICAL VECTOR INTERCEPTION
                </p>
                <h2 className="text-lg font-black tracking-wide text-[#f8fafc] sm:text-xl">
                  社畜スパイラル // 渦状業務迎撃戦
                </h2>
              </div>
              <span className="border border-[#fbbf24]/50 bg-[#1c1409]/90 px-2 py-0.5 font-mono text-[10px] font-bold text-[#fbbf24]">
                全15波 + 残業
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (44px+ touch targets) */}
        <div className="mx-auto grid max-w-[500px] grid-cols-5 gap-1 border border-[#1e293b] bg-[#0f172a] p-1">
          {tabs.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-bold transition sm:flex-row sm:gap-1.5 sm:text-xs ${
                tab === t.id
                  ? 'border border-[#38bdf8] bg-[#0c192c] text-[#38bdf8]'
                  : 'text-[#94a3b8] hover:bg-[#1e293b]/50 hover:text-[#f8fafc]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-auto mt-3 max-w-[500px]">
          {tab === 'play' && <PlayTab {...props} />}
          {tab === 'power' && <PowerTab bank={props.bank} metaLv={props.metaLv} onBuyMeta={props.onBuyMeta} />}
          {tab === 'dex' && <DexTab />}
          {tab === 'daily' && <DailyTab daily={props.daily} missions={props.missions} onClaim={props.onClaimDaily} />}
          {tab === 'ach' && <AchTab ach={props.ach} onClaim={props.onClaimAch} />}
        </div>
      </div>
    </div>
  );
}

function PlayTab(props: {
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  stageSel: StageId; setStageSel: (s: StageId) => void;
  stats: SpiralStats; records: SpiralRecord[];
  comp: { chains: number; chainsTotal: number; upgrades: number; upgradesTotal: number };
  onStart: () => void;
}) {
  const { difficulty, setDifficulty, stageSel, setStageSel, stats, records, comp, onStart } = props;

  return (
    <div>
      {/* Tactical Briefing Strip */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 border border-[#1e293b] bg-[#0f172a] p-2 text-[10px]">
        <div className="border-l-2 border-[#38bdf8] pl-2">
          <p className="font-mono font-bold text-[#38bdf8]">01 // 照準制御</p>
          <p className="text-[#94a3b8]">ドラッグで狙撃・離すと頭部を自動追尾</p>
        </div>
        <div className="border-l-2 border-[#f59e0b] pl-2">
          <p className="font-mono font-bold text-[#fbbf24]">02 // 頭部撃破</p>
          <p className="text-[#94a3b8]">先頭撃破で列一掃・胴体撃破で列分断</p>
        </div>
        <div className="border-l-2 border-[#10b981] pl-2">
          <p className="font-mono font-bold text-[#34d399]">03 // 自動吸引</p>
          <p className="text-[#94a3b8]">手当・回復・解放宝箱はコアが自動回収</p>
        </div>
      </div>

      <p className="mb-1.5 font-mono text-[11px] font-bold text-[#94a3b8]">■ 配属先（防衛セクター選択）</p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {STAGE_ORDER.map((s) => {
          const def = STAGES[s];
          const locked = stats.wins < def.unlockAtWins;
          const isSelected = stageSel === s;
          return (
            <button
              type="button"
              key={s}
              disabled={locked}
              onClick={() => setStageSel(s)}
              className={`min-h-[54px] border p-2.5 text-left transition ${
                isSelected
                  ? 'border-[#38bdf8] bg-[#0c192c] text-[#f8fafc]'
                  : 'border-[#1e293b] bg-[#0f172a] text-[#94a3b8] hover:border-[#334155]'
              } ${locked ? 'opacity-45' : ''}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-black">{locked ? `[制圧${def.unlockAtWins}回で解禁] ` : ''}{def.name}</p>
                <span className="font-mono text-[10px] font-bold text-[#fbbf24]">報酬×{def.coinMul}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-[#64748b]">{def.desc}</p>
            </button>
          );
        })}
      </div>

      <p className="mb-1.5 font-mono text-[11px] font-bold text-[#94a3b8]">■ 労働契約（難易度選択）</p>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((d) => {
          const def = DIFFICULTIES[d];
          const isSelected = difficulty === d;
          return (
            <button
              type="button"
              key={d}
              onClick={() => setDifficulty(d)}
              className={`min-h-[58px] border p-2 text-center transition ${
                isSelected
                  ? 'border-[#38bdf8] bg-[#0c192c] text-[#f8fafc]'
                  : 'border-[#1e293b] bg-[#0f172a] text-[#94a3b8] hover:border-[#334155]'
              }`}
            >
              <p className="text-xs font-black">{def.name}</p>
              <p className="mt-0.5 text-[10px] text-[#64748b]">{def.desc}</p>
              <p className="mt-1 font-mono text-[10px] font-bold text-[#fbbf24]">SCORE ×{def.scoreMul}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-3 flex min-h-[50px] w-full items-center justify-center gap-2 border border-[#38bdf8] bg-[#0284c7] py-3 text-base font-black tracking-wider text-white shadow-[0_4px_0_#0369a1] transition hover:bg-[#0369a1] active:translate-y-0.5"
      >
        <PlayIcon className="h-5 w-5" />
        <span>出勤迎撃開始（全{FINAL_WAVE}波）</span>
      </button>

      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center font-mono text-[11px]">
        <div className="border border-[#1e293b] bg-[#0f172a] p-2">
          <p className="text-[10px] text-[#64748b]">出勤数</p>
          <p className="text-sm font-black text-[#e2e8f0]">{stats.runs}</p>
        </div>
        <div className="border border-[#1e293b] bg-[#0f172a] p-2">
          <p className="text-[10px] text-[#64748b]">完全制圧</p>
          <p className="text-sm font-black text-[#38bdf8]">{stats.wins}</p>
        </div>
        <div className="border border-[#1e293b] bg-[#0f172a] p-2">
          <p className="text-[10px] text-[#64748b]">最高到達</p>
          <p className="text-sm font-black text-[#38bdf8]">W{stats.bestWave}</p>
        </div>
        <div className="border border-[#1e293b] bg-[#0f172a] p-2">
          <p className="text-[10px] text-[#64748b]">総撃破節</p>
          <p className="text-sm font-black text-[#fbbf24]">{stats.totalSegs.toLocaleString()}</p>
        </div>
      </div>

      <p className="mt-2 text-center font-mono text-[11px] text-[#64748b]">
        DATABASE: 業務列 {comp.chains}/{comp.chainsTotal} ・ 兵装 {comp.upgrades}/{comp.upgradesTotal}
      </p>

      {records.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 font-mono text-[11px] font-bold text-[#94a3b8]">■ 防衛スコア記録</p>
          {records.slice(0, 3).map((r, i) => (
            <div
              key={`${r.date}-${i}`}
              className="mb-1 flex justify-between border border-[#1e293b] bg-[#0f172a] px-2.5 py-1.5 font-mono text-[11px]"
            >
              <span>#{i + 1} {r.victory ? '[制圧] ' : ''}W{r.wave} ({DIFFICULTIES[r.difficulty]?.name})</span>
              <span className="font-bold text-[#fbbf24]">{r.score.toLocaleString()} pt</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PowerTab(props: { bank: number; metaLv: Record<string, number>; onBuyMeta: (id: string) => void }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between border border-[#1e293b] bg-[#0f172a] px-3 py-2">
        <p className="text-xs font-bold text-[#94a3b8]">利用可能な残業手当（恒久コア改修）</p>
        <div className="flex items-center gap-1 font-mono text-sm font-black text-[#fbbf24]">
          <CreditIcon className="h-4 w-4" />
          <span>{props.bank.toLocaleString()}</span>
        </div>
      </div>
      <div className="space-y-2">
        {META_UPGRADES.map((m) => {
          const lv = props.metaLv[m.id] ?? 0;
          const maxed = lv >= m.maxLv;
          const cost = m.cost(lv);
          const canAfford = !maxed && props.bank >= cost;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 border border-[#1e293b] bg-[#0f172a] p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#334155] bg-[#090d16]">
                  <TechUpgradeIcon id={m.id} className="h-5 w-5 text-[#38bdf8]" />
                </div>
                <div className="text-xs">
                  <p className="font-black text-[#f8fafc]">
                    {m.name} <span className="font-mono text-[#38bdf8]">Lv.{lv}/{m.maxLv}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#94a3b8]">{m.desc}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => props.onBuyMeta(m.id)}
                className={`min-h-[44px] min-w-[84px] shrink-0 border px-3 py-2 font-mono text-xs font-bold transition ${
                  canAfford
                    ? 'border-[#38bdf8] bg-[#0284c7] text-white hover:bg-[#0369a1]'
                    : 'border-[#1e293b] bg-[#090d16] text-[#475569]'
                }`}
              >
                {maxed ? 'MAX' : `${cost}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AchTab(props: { ach: AchState; onClaim: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {ACHIEVEMENTS.map((a) => {
        const un = props.ach.unlocked[a.id] === true;
        const cl = props.ach.claimed[a.id] === true;
        return (
          <div
            key={a.id}
            className={`flex items-center justify-between gap-2 border p-2.5 text-xs ${
              un ? 'border-[#334155] bg-[#0f172a]' : 'border-[#1e293b] bg-[#090d16] opacity-60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <TrophyIcon className={`h-5 w-5 shrink-0 ${un ? 'text-[#fbbf24]' : 'text-[#475569]'}`} />
              <div>
                <p className="font-bold text-[#f8fafc]">{a.name}</p>
                <p className="text-[11px] text-[#94a3b8]">{a.desc}</p>
              </div>
            </div>
            {cl ? (
              <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-[#64748b]">
                <CheckIcon className="h-3.5 w-3.5" /> 受取済
              </span>
            ) : un ? (
              <button
                type="button"
                onClick={() => props.onClaim(a.id)}
                className="min-h-[44px] shrink-0 border border-[#fbbf24] bg-[#d97706] px-3 py-1.5 font-mono text-xs font-black text-[#090d16] hover:bg-[#f59e0b]"
              >
                +{a.reward}
              </button>
            ) : (
              <LockIcon className="h-4 w-4 shrink-0 text-[#475569]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DexTab() {
  const chains = encyChains();
  const upgrades = encyUpgrades();
  return (
    <div>
      <p className="mb-1.5 font-mono text-xs font-bold text-[#94a3b8]">■ 業務列データベース</p>
      <div className="grid grid-cols-3 gap-2">
        {chains.map((e) => (
          <div
            key={e.kind}
            className={`border p-2.5 text-center text-[11px] ${
              e.found ? 'border-[#334155] bg-[#0f172a]' : 'border-[#1e293b] bg-[#090d16] opacity-50'
            }`}
          >
            <p className="font-bold text-[#f8fafc]">{e.found ? e.name : '？？？'}</p>
            <p className="mt-0.5 font-mono text-[#38bdf8]">{e.kills} 列撃破</p>
          </div>
        ))}
      </div>
      <p className="mb-1.5 mt-3 font-mono text-xs font-bold text-[#94a3b8]">■ 兵装モジュール図鑑</p>
      <div className="grid grid-cols-2 gap-2">
        {upgrades.map((w) => (
          <div
            key={w.id}
            className={`flex items-center gap-2.5 border p-2.5 text-[11px] ${
              w.found ? 'border-[#334155] bg-[#0f172a]' : 'border-[#1e293b] bg-[#090d16] opacity-50'
            }`}
          >
            <TechUpgradeIcon id={w.id} className="h-6 w-6 shrink-0 text-[#38bdf8]" />
            <div>
              <p className="font-bold text-[#f8fafc]">{w.found ? w.name : '？？？'}</p>
              <p className="text-[#94a3b8]">{w.found ? w.desc : '未承認'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyTab(props: {
  daily: DailyState;
  missions: { id: string; name: string; icon: string; desc: string; target: number; reward: number }[];
  onClaim: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] text-[#94a3b8]">毎日0時更新。現場ノルマを達成して特別手当を請求せよ。</p>
      {props.missions.map((m) => {
        const prog = Math.min(m.target, props.daily.progress[m.id] ?? 0);
        const done = prog >= m.target;
        const cl = props.daily.claimed[m.id] === true;
        return (
          <div key={m.id} className="border border-[#1e293b] bg-[#0f172a] p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-[#f8fafc]">{m.name}</p>
                <p className="mt-0.5 text-[11px] text-[#94a3b8]">{m.desc}</p>
              </div>
              {cl ? (
                <span className="font-mono text-[11px] text-[#64748b]">受取済</span>
              ) : done ? (
                <button
                  type="button"
                  onClick={() => props.onClaim(m.id)}
                  className="min-h-[44px] shrink-0 border border-[#fbbf24] bg-[#d97706] px-3 py-1.5 font-mono text-xs font-black text-[#090d16] hover:bg-[#f59e0b]"
                >
                  +{m.reward}
                </button>
              ) : (
                <span className="font-mono text-[#94a3b8]">{prog}/{m.target}</span>
              )}
            </div>
            <div className="mt-2">
              <Bar value={prog} max={m.target} className="bg-[#fbbf24]" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultOverlay(props: {
  result: RunResult; freshAch: string[]; records: SpiralRecord[];
  onRetry: () => void; onEndless?: () => void; onTitle: () => void;
}) {
  const { result, freshAch, records, onRetry, onEndless, onTitle } = props;
  const fresh = ACHIEVEMENTS.filter((a) => freshAch.includes(a.id));

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070a12]/90 p-3">
      <div className="max-h-full w-full max-w-[440px] overflow-y-auto border-2 border-[#334155] bg-[#0f172a] p-5 text-center shadow-[0_8px_0_#020617]">
        <p className="font-mono text-[10px] font-bold tracking-widest text-[#38bdf8]">
          SHIFT REPORT // 業務終了報告書
        </p>
        <h2 className={`mt-1 text-2xl font-black tracking-wider ${result.victory ? 'text-[#38bdf8]' : 'text-[#ef4444]'}`}>
          {result.victory ? '全業務列 制圧完了' : `第${result.wave}波 防衛ライン突破`}
        </h2>
        <p className="mt-1 font-mono text-xs text-[#94a3b8]">
          契約: {DIFFICULTIES[result.difficulty]?.name} ｜ 稼働時間: {formatTime(result.timeSec)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-left font-mono">
          <div className="border-l-2 border-[#fbbf24] bg-[#090d16] p-2.5">
            <p className="text-[9px] text-[#64748b]">TOTAL SCORE</p>
            <p className="text-lg font-black text-[#fbbf24]">{result.score.toLocaleString()}</p>
          </div>
          <div className="border-l-2 border-[#38bdf8] bg-[#090d16] p-2.5">
            <p className="text-[9px] text-[#64748b]">REACHED WAVE</p>
            <p className="text-lg font-black text-[#38bdf8]">WAVE {result.wave}</p>
          </div>
          <div className="border-l-2 border-[#22c55e] bg-[#090d16] p-2.5">
            <p className="text-[9px] text-[#64748b]">SLICED SEGMENTS</p>
            <p className="text-lg font-black text-[#22c55e]">{result.segs.toLocaleString()}</p>
          </div>
          <div className="border-l-2 border-[#f472b6] bg-[#090d16] p-2.5">
            <p className="text-[9px] text-[#64748b]">CHAINS WIPED</p>
            <p className="text-lg font-black text-[#f472b6]">{result.chains}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 border border-[#78350f] bg-[#1c1409] py-2 font-mono text-xs font-bold text-[#fbbf24]">
          <CreditIcon className="h-4 w-4" />
          <span>支給残業手当 +{result.coins}（全ドロップ回収済）</span>
        </div>

        {fresh.length > 0 && (
          <div className="mt-3 border border-[#fbbf24] bg-[#1c1409] p-2.5 text-left text-xs">
            <p className="font-mono font-bold text-[#fbbf24]">NEW ACHIEVEMENT // 考課達成</p>
            {fresh.map((a) => (
              <p key={a.id} className="mt-0.5 text-[#fde68a]">
                {a.name} <span className="font-mono font-bold text-[#fbbf24]">+{a.reward}</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {onEndless && (
            <button
              type="button"
              onClick={onEndless}
              className="min-h-[48px] w-full border border-[#fbbf24] bg-[#d97706] py-3 font-black text-[#090d16] shadow-[0_4px_0_#92400e] transition hover:bg-[#f59e0b]"
            >
              サービス残業突入（エンドレスモード）
            </button>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[48px] w-full border border-[#38bdf8] bg-[#0284c7] py-3 font-black text-white shadow-[0_4px_0_#0369a1] transition hover:bg-[#0369a1]"
          >
            再出勤する（リトライ）
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="min-h-[44px] w-full border border-[#334155] bg-[#090d16] py-2.5 text-sm font-bold text-[#94a3b8] transition hover:border-[#64748b] hover:text-white"
          >
            タイトルへ戻る
          </button>
        </div>

        {records.length > 0 && (
          <div className="mt-4 text-left font-mono">
            <p className="text-[9px] text-[#64748b]">TOP RECORDS</p>
            {records.slice(0, 3).map((r, i) => (
              <div key={`${r.date}-${i}`} className="mt-1 flex justify-between border-b border-[#1e293b] px-1 py-1 text-[10px]">
                <span>#{i + 1} {r.victory ? '[制圧] ' : ''}W{r.wave}</span>
                <span className="font-bold text-[#fbbf24]">{r.score.toLocaleString()} pt</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
