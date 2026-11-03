'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SpiralEngine, type HudSnapshot, type BuildData, type RunResult } from '@/game/spiral/engine';
import { SpiralSound } from '@/game/spiral/audio';
import { VirtualJoystick } from '@/game/common/virtualJoystick';
import {
  loadSettings, saveSettings, loadRecords, saveRecord, loadProgress, saveProgress,
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
  STAGES, STAGE_ORDER,
  type Difficulty, type StageId,
} from '@/game/spiral/config';
import {
  SpiralLogoIcon, CreditIcon, HpIcon, WaveIcon, BurstIcon,
  BlasterIcon, DroneIcon, EnergyDrinkIcon, LaserBeamIcon,
  BriefcaseIcon, ChipIcon, DatabaseIcon, CalendarIcon, TrophyIcon,
  VolumeOnIcon, VolumeMuteIcon, PauseIcon, PlayIcon, RefreshIcon,
  CheckIcon, LockIcon, TechUpgradeIcon,
} from './SpiralIcons';

type Screen = 'title' | 'playing' | 'build' | 'paused' | 'result';
type TitleTab = 'play' | 'power' | 'dex' | 'daily' | 'ach';

const DEFAULT_HUD: HudSnapshot = {
  hp: 120, maxHp: 120, wave: 1, totalWaves: FINAL_WAVE,
  phase: 'build', timeSec: 0, score: 0, coins: 0, segs: 0, chainsLeft: 0, chests: 0, drops: 0,
  build: { dmg: 10, interval: 0.5, count: 1, pierce: 0, crit: 0.05, orbN: 0, blastLv: 0, beamLv: 0 },
  levels: [], bossName: '', bossHp: 0, bossMax: 0, endless: false,
};

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#1d1914]">
      <div
        className={`h-full rounded-full transition-all ${className}`}
        style={{ width: `${Math.max(0, Math.min(100, (value / (max || 1)) * 100))}%` }}
      />
    </div>
  );
}

export default function ShachikuSpiralGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SpiralEngine | null>(null);
  const soundRef = useRef<SpiralSound | null>(null);
  const joystickRef = useRef<VirtualJoystick | null>(null);
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
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<TitleTab>('play');

  const [records, setRecords] = useState<SpiralRecord[]>([]);
  const [bank, setBank] = useState(0);
  const [metaLv, setMetaLv] = useState<Record<string, number>>({ atk: 0, hp: 0, rate: 0 });
  const [stats, setStats] = useState<SpiralStats>({ runs: 0, wins: 0, bestWave: 0, totalSegs: 0, maxScore: 0 });
  const [ach, setAch] = useState<AchState>({ unlocked: {}, claimed: {} });
  const [daily, setDaily] = useState<DailyState>({ date: '', progress: {}, claimed: {} });
  const [runMeta, setRunMeta] = useState<{ difficulty: Difficulty; stage: StageId }>({ difficulty: 'normal', stage: 'hq' });

  useEffect(() => {
    const s = loadSettings();
    setMuted(s.muted);
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
    bannerTimer.current = window.setTimeout(() => setBanner(null), 2600);
  }, []);

  // Keyboard aims the fixed turret around the core
  const aimRef = useRef(0); // radians
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
  }, []);

  // Continuous loop for keyboard/joystick input, only while playing.
  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

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
    joystickRef.current?.detach();
    joystickRef.current = null;
  }, []);

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
    sound.setMuted(loadSettings().muted);
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
        changeScreen('build');
      },
      onGameOver: (r) => finishRun(r, d),
      onBanner: (title, sub) => showBanner(title, sub),
    });
    engineRef.current = engine;

    keysRef.current = new Set();
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
  }, [destroyEngine, finishRun, showBanner, changeScreen]);

  // Manage virtual joystick lifecycle strictly during gameplay
  useEffect(() => {
    if (screen !== 'playing') {
      joystickRef.current?.detach();
      joystickRef.current = null;
      return;
    }
    // Center-fixed turret: no joystick needed. Keep cleanup only.
    return;
  }, [screen]);

  useEffect(() => () => destroyEngine(), [destroyEngine]);

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

  // keyboard event listeners
  useEffect(() => {
    const map = (key: string): string | null => {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
      if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
      if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'up';
      if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down';
      return null;
    };
    const down = (e: KeyboardEvent) => {
      const m = map(e.key);
      if (m && screenRef.current === 'playing') {
        e.preventDefault();
        keysRef.current.add(m);
        pushMove();
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
        pushMove();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [pushMove, pauseGame, resumeGame]);

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

  const chooseUpgrade = useCallback((key: string) => {
    const c = build?.choices.find((x) => `${x.kind}:${x.id}` === key);
    if (!c) return;
    engineRef.current?.applyUpgrade(c);
    setBuild(null);
    changeScreen('playing');
  }, [build, changeScreen]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      soundRef.current?.setMuted(next);
      const s = loadSettings();
      saveSettings({ ...s, muted: next });
      return next;
    });
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
  }, []);

  const claimAchReward = useCallback((id: string) => {
    const reward = claimAchievement(id);
    if (reward > 0) {
      const p = loadProgress();
      p.coins += reward;
      saveProgress(p);
      setBank(p.coins);
      setAch(loadAch());
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
    }
  }, []);

  const title = bestTitle();
  const comp = encyCompletion();
  const missions = todayMissions();
  const nextBoss = hud.wave < 5 ? '上司' : hud.wave < 10 ? '役員' : hud.wave < 15 ? '社長' : '無限残業';
  const waveProgress = Math.min(100, (hud.wave / hud.totalWaves) * 100);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center bg-[#070a14] px-2 py-4 text-[#f2e9d8] selection:bg-[#dfb15b] selection:text-white">
      <div className="w-full max-w-[680px]">
        {/* Top Navbar */}
        <div className="mb-2 flex items-center justify-between border border-[#3b3328] bg-[#1d1914] px-3 py-2">
          <div className="flex items-center gap-2">
            <SpiralLogoIcon className="h-6 w-6 text-[#83b8ac]" />
            <p className="text-base font-black tracking-wider text-[#83b8ac]">社畜スパイラル</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-[#5a4b38] bg-[#2a231b]/40 px-2 py-1 text-xs font-bold text-[#e4c989]">
              <CreditIcon className="h-3.5 w-3.5" />
              <span>{bank.toLocaleString()}</span>
            </div>
            <div className="rounded-lg border border-[#3b3328] bg-[#1d1914] px-2 py-1 text-xs font-semibold text-[#b7a992]">
              <span className="text-[10px] text-[#83b8ac]">役職: </span>{title.name}
            </div>
            <button
              onClick={toggleMute}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#3b3328] bg-[#1d1914] hover:bg-[#3b3328]"
              aria-label="ミュート切替"
            >
              {muted ? <VolumeMuteIcon className="h-4 w-4" /> : <VolumeOnIcon className="h-4 w-4 text-[#83b8ac]" />}
            </button>
            {screen === 'playing' && (
              <button
                onClick={pauseGame}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#5a4b38] bg-[#172622] text-[#83b8ac] hover:bg-[#172622]"
                aria-label="一時停止"
              >
                <PauseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* In-Game Modern Cyber HUD */}
        {(screen === 'playing' || screen === 'paused' || screen === 'build') && (
          <div className="mb-2 border border-[#3b3328] bg-[#1d1914] p-2.5 text-xs shadow-lg">
            <div className="mb-1.5 flex items-center justify-between font-black tracking-wide">
              <div className="flex items-center gap-1.5 text-[#83b8ac]">
                <WaveIcon className="h-4 w-4" />
                <span>WAVE {hud.wave}{hud.endless ? '+' : `/${hud.totalWaves}`}</span>
              </div>
              <div className="text-[#dfb15b]">
                SCORE <span className="font-mono">{hud.score.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 text-[#e4c989]">
                <CreditIcon className="h-3.5 w-3.5" />
                <span className="font-mono">{hud.coins}</span>
              </div>
              <div className="flex items-center gap-1 text-[#e07054]">
                <BurstIcon className="h-3.5 w-3.5" />
                <span className="font-mono">{hud.segs}</span>
              </div>
            </div>

            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-label w-10 shrink-0 text-[8px] text-[#8a7d69]">WAVE</span>
              <div className="h-1 flex-1 bg-[#3b3328]">
                <div className="h-full bg-[#83b8ac] transition-all duration-500" style={{ width: `${waveProgress}%` }} />
              </div>
              <span className="font-mono text-[10px] text-[#b7a992]">{hud.wave}/{hud.totalWaves}</span>
            </div>

            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex w-16 shrink-0 items-center gap-1 font-bold text-[#83b8ac]">
                <HpIcon className="h-3.5 w-3.5" />
                <span>HP</span>
              </div>
              <Bar value={hud.hp} max={hud.maxHp} className="bg-[#83b8ac]" />
              <span className="w-16 shrink-0 text-right font-mono text-[11px] font-bold text-[#b7a992]">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>

            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[9px]">
              <span className="font-label border border-[#5a4b38] bg-[#2a231b] px-1.5 py-0.5 text-[#e07054]">
                NEXT {nextBoss}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="font-label border border-[#3b3328] bg-[#12100d] px-1.5 py-0.5 text-[#b7a992]">
                  ENEMY {hud.chainsLeft}
                </span>
                {hud.chests > 0 && (
                  <span className="font-label border border-[#5a4b38] bg-[#2a231b] px-1.5 py-0.5 text-[#dfb15b]">
                    CHEST {hud.chests}
                  </span>
                )}
                {hud.drops > 0 && (
                  <span className="font-label border border-[#355952] bg-[#172622] px-1.5 py-0.5 text-[#9dd4c7]">
                    DROP {hud.drops}
                  </span>
                )}
              </div>
            </div>

            {hud.chests > 0 && (
              <p className="font-label mb-1.5 text-[8px] text-[#dfb15b]">宝箱を撃つと武器進化 / ドロップは自動回収</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="flex items-center gap-1 rounded bg-[#1d1914] px-1.5 py-0.5 text-[#83b8ac]">
                <BlasterIcon className="h-3 w-3" />
                <span>ATK {hud.build.dmg}</span>
                <span className="text-[#8a7d69]">×{hud.build.count}</span>
                <span className="text-[#dfb15b]">貫{hud.build.pierce}</span>
              </span>
              {hud.build.orbN > 0 && (
                <span className="flex items-center gap-1 rounded bg-[#1d1914] px-1.5 py-0.5 text-[#83b8ac]">
                  <DroneIcon className="h-3 w-3" />
                  <span>×{hud.build.orbN}</span>
                </span>
              )}
              {hud.build.blastLv > 0 && (
                <span className="flex items-center gap-1 rounded bg-[#1d1914] px-1.5 py-0.5 text-[#e4c989]">
                  <EnergyDrinkIcon className="h-3 w-3" />
                  <span>Lv{hud.build.blastLv}</span>
                </span>
              )}
              {hud.build.beamLv > 0 && (
                <span className="flex items-center gap-1 rounded bg-[#1d1914] px-1.5 py-0.5 text-[#f2e9d8]">
                  <LaserBeamIcon className="h-3 w-3" />
                  <span>Lv{hud.build.beamLv}</span>
                </span>
              )}
              {hud.levels.length > 0 && <span className="text-[#756957]">|</span>}
              {hud.levels.map((l) => (
                <span key={l.id} className="flex items-center gap-0.5 rounded border border-[#3b3328] bg-[#1d1914] px-1.5 py-0.5 text-[10px]">
                  <TechUpgradeIcon id={l.id} className="h-3 w-3 text-[#83b8ac]" />
                  <span className="font-mono text-[#e4c989] font-bold">{l.lv}</span>
                </span>
              ))}
            </div>

            {hud.bossMax > 0 && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-1.5">
                <span className="w-28 shrink-0 truncate text-xs font-black text-[#e07054]">{hud.bossName}</span>
                <Bar value={hud.bossHp} max={hud.bossMax} className="bg-[#e07054]" />
                <span className="font-mono text-[10px] font-bold text-[#f0a08b]">{hud.bossHp}</span>
              </div>
            )}
          </div>
        )}

        {/* Game Canvas Container */}
        <div
          ref={stageRef}
          className="relative mx-auto w-full max-w-[560px] overflow-hidden border border-[#5a4b38] bg-[#12100d] shadow-[6px_6px_0_#0b0907]"
          style={{ aspectRatio: '1 / 1' }}
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair touch-none select-none"
            width={640}
            height={640}
            onPointerDown={(e) => {
              if (screenRef.current !== 'playing') return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 640;
              const y = ((e.clientY - rect.top) / rect.height) * 640;
              engineRef.current?.setAim(x, y);
              soundRef.current?.unlock();
            }}
            onPointerMove={(e) => {
              if (screenRef.current !== 'playing') return;
              if (e.pointerType === 'mouse' && e.buttons === 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 640;
              const y = ((e.clientY - rect.top) / rect.height) * 640;
              engineRef.current?.setAim(x, y);
            }}
          />

          {/* Banner notification */}
          {banner && (screen === 'playing' || screen === 'build') && (
            <div key={banner.key} className="pointer-events-none absolute inset-x-4 top-8 z-20 border border-[#5a4b38] bg-[#12100d]/95 p-3 text-center shadow-xl">
              <p className="text-sm font-black tracking-wide text-[#83b8ac]">{banner.title}</p>
              <p className="mt-0.5 text-xs text-[#b7a992]">{banner.sub}</p>
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

          {/* Build Tree Modal Overlay */}
          {screen === 'build' && build && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#12100d]/85 p-3">
              <div className="max-h-full w-full max-w-[520px] overflow-y-auto border border-[#5a4b38] bg-[#1d1914] p-4 shadow-[6px_6px_0_#0b0907]">
                <div className="flex items-center justify-center gap-2">
                  <WaveIcon className="h-6 w-6 text-[#83b8ac]" />
                  <h2 className="text-xl font-black tracking-wider text-[#83b8ac]">
                    {build.fromChest ? '宝箱 GET！ 武器進化' : `WAVE ${build.wave} 開始前 作戦強化`}
                  </h2>
                </div>
                <p className="mt-1 text-center text-xs text-[#8a7d69]">
                  {build.fromChest
                    ? '3つの選択肢から1つ選んでコアリアクターを強化せよ'
                    : '渦の進行に備え、コアリアクターの兵装を1つ強化してください'}
                </p>

                <div className="mx-auto mt-4 grid max-w-[480px] grid-cols-1 gap-2.5">
                  {build.choices.map((c) => (
                    <button
                      key={`${c.kind}:${c.id}`}
                      onClick={() => chooseUpgrade(`${c.kind}:${c.id}`)}
                      className="group flex items-center gap-3 rounded-xl border border-[#3b3328] bg-[#1d1914]/95 p-3 text-left transition hover:border-[#83b8ac] hover:bg-[#1d1914]"
                    >
                      <div className="pointer-events-none flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#3b3328] bg-[#1d1914] group-hover:border-[#83b8ac]">
                        <TechUpgradeIcon id={c.id} className="h-6 w-6 text-[#83b8ac]" />
                      </div>
                      <div className="pointer-events-none flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-[#f2e9d8] group-hover:text-[#83b8ac]">{c.name}</p>
                          {c.isNew ? (
                            <span className="rounded bg-[#2f5d57] px-1.5 py-0.2 text-[10px] font-bold text-white">NEW</span>
                          ) : c.toLv > 0 ? (
                            <span className="font-mono text-xs font-bold text-[#dfb15b]">Lv.{c.toLv}</span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-[#8a7d69]">{c.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {build.canReroll && (
                  <div className="mx-auto mt-4 w-full max-w-[480px]">
                    <button
                      onClick={() => engineRef.current?.rerollBuild()}
                      className="flex w-full items-center justify-center gap-2 border border-[#5a4b38] bg-[#2a231b] py-2.5 text-xs font-bold text-[#e4c989] hover:bg-[#342d22]"
                    >
                      <RefreshIcon className="h-4 w-4 text-[#dfb15b]" />
                      <span>選択肢リロール（残1回）</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paused Overlay */}
          {screen === 'paused' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#12100d]/85 p-4">
              <div className="w-full max-w-xs border border-[#5a4b38] bg-[#1d1914] p-5 text-center shadow-[6px_6px_0_#0b0907]">
                <p className="font-label text-[9px] text-[#8a7d69]">Paused</p>
                <PauseIcon className="mx-auto mt-2 h-8 w-8 text-[#dfb15b]" />
                <p className="mt-2 text-xl font-black tracking-wider text-[#f2e9d8]">作戦一時待機</p>
                <p className="mt-1 text-xs text-[#8a7d69]">画面ドラッグまたは仮想スティックで照準</p>
                <button
                  onClick={resumeGame}
                  className="mt-4 flex w-full items-center justify-center gap-2 border border-[#f2e9d8] bg-[#b23a2a] px-6 py-3 font-black text-white shadow-[3px_3px_0_#f2e9d8] hover:bg-[#c94b38]"
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>業務再開</span>
                </button>
                <button
                  onClick={quitToTitle}
                  className="mt-2 w-full border border-[#3b3328] bg-[#12100d] px-6 py-2.5 text-sm font-bold text-[#b7a992] hover:border-[#5a4b38]"
                >
                  タイトルに戻る
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

        <p className="mt-2.5 text-center text-[11px] text-[#8a7d69]">
          コアは中心固定。タップ／ドラッグで狙いを定めて撃て！列の隙間の宝箱を壊すと武器進化を3択で選択。ドロップは自動回収。
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
    { id: 'power', label: '強化', icon: <ChipIcon className="h-4 w-4" /> },
    { id: 'dex', label: '図鑑', icon: <DatabaseIcon className="h-4 w-4" /> },
    { id: 'daily', label: '日課', icon: <CalendarIcon className="h-4 w-4" /> },
    { id: 'ach', label: '実績', icon: <TrophyIcon className="h-4 w-4" /> },
  ];
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-[#12100d] p-4">
      <div className="my-auto">
        <div className="relative mb-3 overflow-hidden rounded-xl border border-[#5a4b38] ">
          <Image
            src="/assets/spiral_cover.jpg"
            alt="Cybernetic Syndicate Spiral"
            width={800}
            height={447}
            className="h-28 w-full object-cover grayscale-[0.2] saturate-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12100d] via-[#12100d]/60 to-transparent flex flex-col justify-end p-2.5">
            <p className="text-[10px] font-black tracking-widest text-[#dfb15b] font-mono">CYBERNETIC SPIRAL DEFENSE</p>
            <h2 className="text-lg font-black text-[#f2e9d8] drop-shadow-md">社畜スパイラル</h2>
          </div>
        </div>
        <p className="mt-1 text-center text-xs text-[#8a7d69]">
          中央コアを守れ！渦巻く業務の多節列を迎撃する全15ウェーブ・ベクター防衛戦
        </p>

        <div className="mx-auto mt-4 flex max-w-[480px] gap-1 overflow-x-auto rounded-xl border border-[#3b3328] bg-[#16130f] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                tab === t.id ? 'bg-[#dfb15b] text-[#12100d] shadow-md' : 'text-[#8a7d69] hover:text-[#e4d9c7]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-auto mt-3 max-w-[480px]">
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
      <p className="mb-1 text-xs font-bold text-[#b7a992]">■ 配属先（ステージ）</p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {STAGE_ORDER.map((s) => {
          const def = STAGES[s];
          const locked = stats.wins < def.unlockAtWins;
          const isSelected = stageSel === s;
          return (
            <button
              key={s}
              disabled={locked}
              onClick={() => setStageSel(s)}
              className={`rounded-xl border p-2 text-left transition ${
                isSelected ? 'border-[#83b8ac] bg-[#172622] text-[#83b8ac]' : 'border-[#3b3328] bg-[#1d1914] text-[#8a7d69] hover:border-[#3b3328]'
              } ${locked ? 'opacity-40' : ''}`}
            >
              <p className="text-xs font-bold">{locked ? '[施錠] ' : ''}{def.name}</p>
              <p className="mt-0.5 text-[10px] text-[#756957]">{def.desc}</p>
            </button>
          );
        })}
      </div>

      <p className="mb-1 text-xs font-bold text-[#b7a992]">■ 業務負荷難易度</p>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((d) => {
          const def = DIFFICULTIES[d];
          const isSelected = difficulty === d;
          return (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border p-2 text-center transition ${
                isSelected ? 'border-[#83b8ac] bg-[#172622] text-[#83b8ac]' : 'border-[#3b3328] bg-[#1d1914] text-[#8a7d69] hover:border-[#3b3328]'
              }`}
            >
              <p className="text-xs font-bold">{def.name}</p>
              <p className="mt-0.5 text-[10px] text-[#756957]">{def.desc}</p>
              <p className="mt-1 font-mono text-[10px] font-bold text-[#dfb15b]">×{def.scoreMul}</p>
            </button>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="mt-3 flex w-full items-center justify-center gap-2 border border-[#f2e9d8] bg-[#b23a2a] py-3 text-base font-black text-[#fffaf0] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38]"
      >
        <PlayIcon className="h-5 w-5" />
        <span>出勤迎撃開始（全{FINAL_WAVE}ウェーブ）</span>
      </button>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="rounded-lg border border-[#3b3328] bg-[#1d1914] p-2">
          <p className="text-[#8a7d69]">出勤</p>
          <p className="font-mono text-base font-black text-[#e4d9c7]">{stats.runs}</p>
        </div>
        <div className="rounded-lg border border-[#3b3328] bg-[#1d1914] p-2">
          <p className="text-[#8a7d69]">制圧</p>
          <p className="font-mono text-base font-black text-[#83b8ac]">{stats.wins}</p>
        </div>
        <div className="rounded-lg border border-[#3b3328] bg-[#1d1914] p-2">
          <p className="text-[#8a7d69]">最高W</p>
          <p className="font-mono text-base font-black text-[#83b8ac]">{stats.bestWave}</p>
        </div>
        <div className="rounded-lg border border-[#3b3328] bg-[#1d1914] p-2">
          <p className="text-[#8a7d69]">切断数</p>
          <p className="font-mono text-base font-black text-[#dfb15b]">{stats.totalSegs.toLocaleString()}</p>
        </div>
      </div>

      <p className="mt-2 text-center font-mono text-[11px] text-[#8a7d69]">
        図鑑解析: 業務列 {comp.chains}/{comp.chainsTotal} ・ 兵装 {comp.upgrades}/{comp.upgradesTotal}
      </p>

      {records.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-bold text-[#b7a992]">■ 迎撃スコア記録</p>
          {records.slice(0, 3).map((r, i) => (
            <div key={`${r.date}-${i}`} className="mb-1 flex justify-between rounded-lg border border-[#3b3328] bg-[#1d1914] px-2 py-1 text-[11px]">
              <span>{i + 1}位 {r.victory ? '[制圧] ' : ''}W{r.wave} ({DIFFICULTIES[r.difficulty]?.name})</span>
              <span className="font-mono font-bold text-[#dfb15b]">{r.score.toLocaleString()} pt</span>
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
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-[#b7a992]">所持残業代（恒久兵装強化）</p>
        <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#e4c989]">
          <CreditIcon className="h-3.5 w-3.5" />
          <span>{props.bank.toLocaleString()}</span>
        </div>
      </div>
      <div className="space-y-2">
        {META_UPGRADES.map((m) => {
          const lv = props.metaLv[m.id] ?? 0;
          const maxed = lv >= m.maxLv;
          const cost = m.cost(lv);
          return (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#3b3328] bg-[#1d1914] p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3b3328] bg-[#1d1914]">
                  <TechUpgradeIcon id={m.id} className="h-5 w-5 text-[#83b8ac]" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-[#e4d9c7]">{m.name} <span className="font-mono text-[#83b8ac]">Lv.{lv}/{m.maxLv}</span></p>
                  <p className="text-[11px] text-[#8a7d69]">{m.desc}</p>
                </div>
              </div>
              <button
                disabled={maxed || props.bank < cost}
                onClick={() => props.onBuyMeta(m.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition ${
                  !maxed && props.bank >= cost
                    ? 'bg-[#2f5d57] text-white hover:bg-[#3f756d]'
                    : 'bg-[#1d1914] text-[#756957]'
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
    <div className="space-y-1.5">
      {ACHIEVEMENTS.map((a) => {
        const un = props.ach.unlocked[a.id] === true;
        const cl = props.ach.claimed[a.id] === true;
        return (
          <div
            key={a.id}
            className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs ${
              un ? 'border-[#5a4b38] bg-[#1d1914]/95' : 'border-[#3b3328] bg-[#16130f] opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrophyIcon className={`h-5 w-5 shrink-0 ${un ? 'text-[#dfb15b]' : 'text-[#756957]'}`} />
              <div>
                <p className="font-bold text-[#e4d9c7]">{a.name}</p>
                <p className="text-[11px] text-[#8a7d69]">{a.desc}</p>
              </div>
            </div>
            {cl ? (
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#756957]">
                <CheckIcon className="h-3.5 w-3.5" /> 受取済
              </span>
            ) : un ? (
              <button
                onClick={() => props.onClaim(a.id)}
                className="shrink-0 rounded-lg bg-[#dfb15b] px-2.5 py-1 text-xs font-bold text-[#12100d] hover:brightness-110"
              >
                +{a.reward}
              </button>
            ) : (
              <LockIcon className="h-4 w-4 shrink-0 text-[#756957]" />
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
      <p className="mb-1 text-xs font-bold text-[#b7a992]">■ 業務列データベース</p>
      <div className="grid grid-cols-3 gap-2">
        {chains.map((e) => (
          <div
            key={e.kind}
            className={`rounded-xl border p-2 text-center text-[11px] ${
              e.found ? 'border-[#3b3328] bg-[#1d1914]/95' : 'border-[#3b3328] bg-[#16130f] opacity-50'
            }`}
          >
            <p className="font-bold text-[#e4d9c7]">{e.found ? e.name : '？？？'}</p>
            <p className="mt-0.5 text-[#8a7d69]">{e.kills} 列撃破</p>
          </div>
        ))}
      </div>
      <p className="mb-1 mt-3 text-xs font-bold text-[#b7a992]">■ 兵装アップグレード図鑑</p>
      <div className="grid grid-cols-2 gap-2">
        {upgrades.map((w) => (
          <div
            key={w.id}
            className={`flex items-center gap-2 rounded-xl border p-2 text-[11px] ${
              w.found ? 'border-[#3b3328] bg-[#1d1914]/95' : 'border-[#3b3328] bg-[#16130f] opacity-50'
            }`}
          >
            <TechUpgradeIcon id={w.id} className="h-6 w-6 text-[#83b8ac]" />
            <div>
              <p className="font-bold text-[#e4d9c7]">{w.found ? w.name : '？？？'}</p>
              <p className="text-[#8a7d69]">{w.found ? w.desc : '未入手'}</p>
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
      <p className="text-[11px] text-[#8a7d69]">毎日0時に更新。出勤して日課を完了してください。</p>
      {props.missions.map((m) => {
        const prog = Math.min(m.target, props.daily.progress[m.id] ?? 0);
        const done = prog >= m.target;
        const cl = props.daily.claimed[m.id] === true;
        return (
          <div key={m.id} className="rounded-xl border border-[#3b3328] bg-[#1d1914] p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-[#e4d9c7]">{m.name}</p>
              {cl ? (
                <span className="text-[11px] text-[#756957]">受取済</span>
              ) : done ? (
                <button
                  onClick={() => props.onClaim(m.id)}
                  className="rounded-lg bg-[#dfb15b] px-2.5 py-1 text-xs font-bold text-[#12100d] hover:brightness-110"
                >
                  +{m.reward}
                </button>
              ) : (
                <span className="font-mono text-[#8a7d69]">{prog}/{m.target}</span>
              )}
            </div>
            <p className="mt-0.5 text-[#8a7d69]">{m.desc}</p>
            <div className="mt-1.5">
              <Bar value={prog} max={m.target} className="bg-[#dfb15b]" />
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
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#12100d]/85 p-3">
      <div className="max-h-full w-full max-w-[440px] overflow-y-auto border border-[#5a4b38] bg-[#1d1914] p-5 text-center shadow-[6px_6px_0_#0b0907]">
        <p className="font-label text-[9px] text-[#8a7d69]">Shift Report</p>
        <h2 className={`mt-1 text-2xl font-black tracking-wider ${result.victory ? 'text-[#83b8ac]' : 'text-[#e07054]'}`}>
          {result.victory ? '全業務制圧完了' : `WAVE ${result.wave} で業務崩壊`}
        </h2>
        <p className="mt-1 font-mono text-[11px] text-[#8a7d69]">
          {DIFFICULTIES[result.difficulty]?.name} / {formatTime(result.timeSec)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <div className="border border-[#3b3328] bg-[#12100d] p-2.5">
            <p className="font-label text-[8px] text-[#8a7d69]">SCORE</p>
            <p className="font-mono text-lg font-black text-[#dfb15b]">{result.score.toLocaleString()}</p>
          </div>
          <div className="border border-[#3b3328] bg-[#12100d] p-2.5">
            <p className="font-label text-[8px] text-[#8a7d69]">WAVE</p>
            <p className="font-mono text-lg font-black text-[#83b8ac]">{result.wave}</p>
          </div>
          <div className="border border-[#3b3328] bg-[#12100d] p-2.5">
            <p className="font-label text-[8px] text-[#8a7d69]">SEGMENTS</p>
            <p className="font-mono text-lg font-black text-[#83b8ac]">{result.segs.toLocaleString()}</p>
          </div>
          <div className="border border-[#3b3328] bg-[#12100d] p-2.5">
            <p className="font-label text-[8px] text-[#8a7d69]">CHAINS</p>
            <p className="font-mono text-lg font-black text-[#e07054]">{result.chains}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-xs font-bold text-[#e4c989]">
          <CreditIcon className="h-4 w-4" />
          <span>+{result.coins} 残業手当加算</span>
        </div>

        {fresh.length > 0 && (
          <div className="mt-3 border border-[#5a4b38] bg-[#2a231b] p-2.5 text-left text-xs">
            <p className="font-bold text-[#e4c989]">実績解除</p>
            {fresh.map((a) => (
              <p key={a.id} className="mt-0.5 text-[#b7a992]">{a.name} <span className="text-[#dfb15b]">+{a.reward}</span></p>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {onEndless && (
            <button
              onClick={onEndless}
              className="w-full border border-[#f2e9d8] bg-[#b23a2a] py-3 font-black text-white shadow-[3px_3px_0_#f2e9d8] hover:bg-[#c94b38]"
            >
              残業突入（エンドレス）
            </button>
          )}
          <button
            onClick={onRetry}
            className="w-full border border-[#f2e9d8] bg-[#b23a2a] py-3 font-black text-white shadow-[3px_3px_0_#f2e9d8] hover:bg-[#c94b38]"
          >
            もう一度出勤する
          </button>
          <button
            onClick={onTitle}
            className="w-full border border-[#3b3328] bg-[#12100d] py-2.5 text-sm font-bold text-[#b7a992] hover:border-[#5a4b38]"
          >
            タイトルへ戻る
          </button>
        </div>

        {records.length > 0 && (
          <div className="mt-4 text-left">
            <p className="font-label text-[8px] text-[#8a7d69]">BEST RECORDS</p>
            {records.slice(0, 3).map((r, i) => (
              <div key={`${r.date}-${i}`} className="mt-1 flex justify-between border-b border-[#3b3328] px-1 py-1 text-[10px]">
                <span>{i + 1}. {r.victory ? '制圧 ' : ''}W{r.wave}</span>
                <span className="font-mono font-bold text-[#dfb15b]">{r.score.toLocaleString()} pt</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
