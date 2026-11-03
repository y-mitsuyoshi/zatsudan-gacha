'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SurvivorEngine, type HudSnapshot, type LevelChoice, type LevelUpData, type RunResult } from '@/game/survivor/engine';
import { SurvivorSound } from '@/game/survivor/audio';
import {
  loadRecords, saveRecord, loadProgress, saveProgress,
  type RecordEntry,
} from '@/game/survivor/storage';
import {
  DIFFICULTIES, DIFFICULTY_ORDER, META_UPGRADES, formatClock, formatTime,
  STAGES, STAGE_ORDER, WEAPONS, PASSIVES, ENEMIES, BOSS_SCHEDULE, RUN_SECONDS,
  MAX_WEAPON_SLOTS, MAX_PASSIVE_SLOTS,
  type Difficulty, type StageId, type WeaponId, type PassiveId,
} from '@/game/survivor/config';
import {
  EVOLUTION_RECIPES, isEvolvedWeapon, getRecipeByEvolvedId,
} from '@/game/survivor/evolutions';
import {
  loadStats, applyRunToStats, applyRunDeltaToStats,
  loadEncy, applyRunToEncy, applyRunDeltaToEncy,
  encyEnemies, encyWeapons, encyCompletion,
  loadAch, checkAchievements, claimAchievement, ACHIEVEMENTS,
  earnedTitles, bestTitle,
  todayMissions, loadDaily, applyRunToDaily, applyRunDeltaToDaily, claimMission,
  type SurvivorStats, type AchState, type DailyState,
} from '@/game/survivor/collection';
import { getPixelIconDataUrl } from '@/game/survivor/pixelSprites';
import { VirtualJoystick } from '@/game/common/virtualJoystick';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';
import type { BgmTrackId } from '@/game/common/bgmTracks';
import Image from 'next/image';

type Screen = 'title' | 'playing' | 'levelup' | 'paused' | 'result';
type TitleTab = 'play' | 'power' | 'dex' | 'ach' | 'daily';

const DEFAULT_HUD: HudSnapshot = {
  hp: 120, maxHp: 120, level: 1, xp: 0, xpNext: 8,
  time: 0, kills: 0, score: 0, coins: 0,
  weapons: [], passives: [],
  bossName: '', bossHp: 0, bossMax: 0, endless: false,
  dashCd: 0, dashMax: 2.5, xpBoostT: 0, coinBoostT: 0,
  dps: 0,
};

function rankOf(r: { victory: boolean; difficulty: string; time: number; level: number; kills: number }): string {
  if (r.victory && r.difficulty === 'hard') return 'S';
  if (r.victory) return 'A';
  if (r.time >= 420) return 'B';
  if (r.time >= 240) return 'C';
  return 'D';
}

function rankLabelOf(rank: string): string {
  switch (rank) {
    case 'S': return '特級社畜・伝説';
    case 'A': return '定時退社・優秀';
    case 'B': return '午後耐久・健闘';
    case 'C': return '午前突破・見習';
    default: return '要研修・再出社';
  }
}

function Bar({ value, max, className, heightClass = 'h-2' }: { value: number; max: number; className: string; heightClass?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-sm bg-[#0c0a08] ring-1 ring-[#3b3328]`}>
      <div className={`h-full transition-all duration-150 ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function PixelIcon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  const url = getPixelIconDataUrl(name, size);
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className={`inline-block select-none [image-rendering:pixelated] align-middle ${className}`}
    />
  );
}

function LevelPips({ current, next, max, gold = false }: { current: number; next?: number; max: number; gold?: boolean }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: max }).map((_, idx) => {
        const lv = idx + 1;
        const isCurrent = lv <= current;
        const isNext = next !== undefined && lv > current && lv <= next;
        return (
          <span
            key={lv}
            className={`h-2 w-2 rounded-[1px] border ${
              isNext
                ? 'border-[#f2e9d8] bg-[#83b8ac] shadow-[0_0_6px_rgba(131,184,172,0.8)]'
                : isCurrent
                  ? gold
                    ? 'border-[#f2e9d8]/60 bg-[#dfb15b]'
                    : 'border-[#dfb15b]/60 bg-[#b23a2a]'
                  : 'border-[#3b3328] bg-[#12100d]'
            }`}
          />
        );
      })}
    </div>
  );
}

function LockSvg({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function PauseSvg() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden>
      <rect x="3" y="2.5" width="3.5" height="11" rx="0.8" />
      <rect x="9.5" y="2.5" width="3.5" height="11" rx="0.8" />
    </svg>
  );
}

function TwoStageHpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const [trailingHp, setTrailingHp] = useState(hp);
  const hpRef = useRef(hp);
  hpRef.current = hp;

  useEffect(() => {
    let animId: number;
    const updateTrail = () => {
      setTrailingHp((prev) => {
        if (prev <= hpRef.current) return hpRef.current;
        const diff = prev - hpRef.current;
        const step = Math.max(0.4, diff * 0.08);
        const next = prev - step;
        return next <= hpRef.current ? hpRef.current : next;
      });
      animId = requestAnimationFrame(updateTrail);
    };
    animId = requestAnimationFrame(updateTrail);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    setTrailingHp((prev) => Math.max(prev, hp));
  }, [hp]);

  const currentPct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const trailingPct = Math.max(0, Math.min(100, (trailingHp / Math.max(1, maxHp)) * 100));
  const lowHp = currentPct <= 30;

  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-sm bg-[#0c0a08] ring-1 ${lowHp ? 'ring-red-500/80' : 'ring-[#3b3328]'}`}>
      <div
        className="absolute inset-y-0 left-0 bg-[#dfb15b]/80 transition-all duration-75"
        style={{ width: `${trailingPct}%` }}
      />
      <div
        className={`absolute inset-y-0 left-0 transition-all duration-100 ${
          currentPct > 35 ? 'bg-[#b23a2a]' : 'bg-red-500 animate-pulse'
        }`}
        style={{ width: `${currentPct}%` }}
      />
    </div>
  );
}

function DashSweepButton({ cd, max, onDash }: { cd: number; max: number; onDash: () => void }) {
  const ready = cd <= 0;
  const ratio = ready ? 0 : Math.min(1, cd / max);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - ratio);

  return (
    <button
      type="button"
      onClick={onDash}
      disabled={!ready}
      aria-label="緊急回避ダッシュ"
      className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 bg-[#12100d]/90 shadow-[0_4px_14px_rgba(0,0,0,0.65)] transition-transform active:scale-95 ${
        ready
          ? 'border-[#83b8ac] hover:border-[#f2e9d8] cursor-pointer'
          : 'border-[#3b3328] cursor-not-allowed opacity-75'
      }`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
        {ratio > 0 && (
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke="#83b8ac"
            strokeWidth="3.5"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="z-10 flex flex-col items-center justify-center">
        <PixelIcon name="icon_dash" size={20} />
        <span className="mt-0.5 font-mono text-[9px] font-black leading-none tracking-tighter text-[#f2e9d8]">
          {ready ? 'DASH' : `${cd.toFixed(1)}s`}
        </span>
      </div>
    </button>
  );
}

export default function ShachikuSurvivorGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SurvivorEngine | null>(null);
  const soundRef = useRef<SurvivorSound | null>(null);
  const screenRef = useRef<Screen>('title');
  const keysRef = useRef<Set<string>>(new Set());
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const joystickRef = useRef<VirtualJoystick | null>(null);
  const lastSettledRunRef = useRef<RunResult | null>(null);
  const bannerTimer = useRef<number | null>(null);

  const [screen, setScreen] = useState<Screen>('title');
  const changeScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    if (s !== 'playing') {
      dragRef.current = null;
      keysRef.current.clear();
      engineRef.current?.setMove(0, 0);
    }
    setScreen(s);
  }, []);

  const [hud, setHud] = useState<HudSnapshot>(DEFAULT_HUD);
  const [levelData, setLevelData] = useState<LevelUpData | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [freshAch, setFreshAch] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ title: string; sub: string; key: number } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [stage, setStage] = useState<StageId>('honsha');
  const [tab, setTab] = useState<TitleTab>('play');
  const [showGrimoire, setShowGrimoire] = useState(false);

  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [bank, setBank] = useState(0);
  const [metaLv, setMetaLv] = useState<Record<string, number>>({ atk: 0, hp: 0, speed: 0, magnet: 0 });
  const [stats, setStats] = useState<SurvivorStats>({
    runs: 0, wins: 0, totalKills: 0, totalTime: 0, totalGems: 0,
    totalChests: 0, totalCoins: 0, maxLevel: 1, maxScore: 0, bestTime: 0,
  });
  const [ach, setAch] = useState<AchState>({ unlocked: {}, claimed: {} });
  const [daily, setDaily] = useState<DailyState>({ date: '', progress: {}, claimed: {} });
  const [runMeta, setRunMeta] = useState<{ difficulty: Difficulty; stage: StageId }>({ difficulty: 'normal', stage: 'honsha' });

  // Shared BGM integration
  const bgmTrack: BgmTrackId =
    screen === 'title' || screen === 'result'
      ? 'shachiku-menu'
      : hud.bossMax > 0
        ? 'survivor-boss'
        : 'survivor-battle';
  useBgm(bgmTrack, screen === 'paused');

  useEffect(() => {
    setRecords(loadRecords());
    const p = loadProgress();
    setBank(p.coins);
    setMetaLv({ ...(p.meta as unknown as Record<string, number>) });
    setStats(loadStats());
    setAch(loadAch());
    setDaily(loadDaily());
  }, []);

  const showBanner = useCallback((title: string, sub: string) => {
    setBanner({ title, sub, key: Date.now() });
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 2800);
  }, []);

  const pushMove = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    let x = 0; let y = 0;
    const k = keysRef.current;
    if (k.has('left')) x -= 1;
    if (k.has('right')) x += 1;
    if (k.has('up')) y -= 1;
    if (k.has('down')) y += 1;
    const d = dragRef.current;
    if (d) { x += d.x; y += d.y; }
    const j = joystickRef.current?.getVector();
    if (j?.active) { x += j.x; y += j.y; }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    eng.setMove(x, y);
  }, []);

  const destroyEngine = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
  }, []);

  const finishRun = useCallback((r: RunResult, d: Difficulty) => {
    const previousSettlement = lastSettledRunRef.current;
    const isFirstSettlement = previousSettlement === null;

    if (isFirstSettlement) {
      setRecords(saveRecord({
        score: r.score, difficulty: d, time: r.time, level: r.level,
        kills: r.kills, victory: r.victory, date: Date.now(),
      }));
    }

    const p = loadProgress();
    p.coins += isFirstSettlement ? r.coins : Math.max(0, r.coins - previousSettlement.coins);
    if (isFirstSettlement) {
      p.runs += 1;
      if (r.victory) p.wins += 1;
    }
    saveProgress(p);
    setBank(p.coins);
    setMetaLv({ ...(p.meta as unknown as Record<string, number>) });

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

  const startRun = useCallback((d: Difficulty, st: StageId = 'honsha') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    destroyEngine();
    if (!soundRef.current) soundRef.current = new SurvivorSound();
    const sound = soundRef.current;
    sound.cancelScheduled();
    sound.unlock();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 960 * dpr;
    canvas.height = 600 * dpr;
    const p = loadProgress();
    const m = p.meta as unknown as Record<string, number>;
    const engine = new SurvivorEngine(canvas, sound, {
      onHud: (h) => setHud(h),
      onLevelUp: (lv) => {
        setLevelData(lv);
        changeScreen('levelup');
      },
      onLevelClosed: () => {
        setLevelData(null);
        changeScreen('playing');
      },
      onGameOver: (r) => finishRun(r, d),
      onBanner: (title, sub) => showBanner(title, sub),
    });
    engineRef.current = engine;
    keysRef.current = new Set();
    dragRef.current = null;
    setRunMeta({ difficulty: d, stage: st });
    lastSettledRunRef.current = null;
    setResult(null);
    setLevelData(null);
    setFreshAch([]);
    changeScreen('playing');
    engine.start({
      difficulty: d,
      stage: st,
      dmgMul: 1 + 0.03 * (m.atk ?? 0),
      maxHpBonus: 8 * (m.hp ?? 0),
      speedMul: 1 + 0.02 * (m.speed ?? 0),
      magnetMul: 1 + 0.1 * (m.magnet ?? 0),
    });
  }, [destroyEngine, finishRun, showBanner, changeScreen]);

  useEffect(() => () => {
    destroyEngine();
    soundRef.current?.dispose();
  }, [destroyEngine]);

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

  const forfeitGame = useCallback(() => {
    soundRef.current?.resume();
    engineRef.current?.forfeit();
  }, []);

  const chooseUpgrade = useCallback((id: string) => {
    if (!levelData) return;
    const c = levelData.choices.find((x) => `${x.kind}:${x.id}` === id);
    if (!c) return;
    engineRef.current?.applyUpgrade(c, levelData.seq);
  }, [levelData]);

  // keyboard input
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
      if ((e.key === 'Shift' || e.key === ' ') && screenRef.current === 'playing') {
        e.preventDefault();
        engineRef.current?.setDash();
      }
      if (screenRef.current === 'levelup' && levelData) {
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          const idx = Number(e.key) - 1;
          const choice = levelData.choices[idx];
          if (choice) {
            e.preventDefault();
            engineRef.current?.applyUpgrade(choice, levelData.seq);
          }
        } else if ((e.key === 'r' || e.key === 'R') && levelData.canReroll) {
          e.preventDefault();
          engineRef.current?.rerollChoices();
        }
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
    const onBlur = () => {
      keysRef.current.clear();
      dragRef.current = null;
      engineRef.current?.setMove(0, 0);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', onBlur);
    };
  }, [pushMove, pauseGame, resumeGame, levelData]);

  // virtual joystick on touch, only while actually playing
  useEffect(() => {
    if (screen !== 'playing') {
      return;
    }

    const stageEl = stageRef.current;
    if (!stageEl) return;
    const joystick = new VirtualJoystick({
      maxRadius: 46,
      deadzone: 0.08,
      floating: true,
      touchOnly: true,
    });
    joystick.attach(stageEl);
    joystick.attachDomOverlay(stageEl);
    joystickRef.current = joystick;

    let animId: number;
    const poll = () => {
      if (screenRef.current === 'playing') {
        const v = joystick.getVector();
        if (v.active) {
          engineRef.current?.setMove(v.x, v.y);
        }
      }
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(animId);
      joystick.detach();
      if (joystickRef.current === joystick) {
        joystickRef.current = null;
      }
    };
  }, [screen]);

  // auto-pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && screenRef.current === 'playing') pauseGame();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pauseGame]);

  // drag-to-move (player is camera-centered, so vector from stage center)
  const updateDrag = useCallback((clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len < 12) {
      dragRef.current = null;
    } else {
      const mag = Math.min(1, len / 90);
      dragRef.current = { x: (dx / len) * mag, y: (dy / len) * mag };
    }
    pushMove();
  }, [pushMove]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (screenRef.current !== 'playing') return;
    soundRef.current?.unlock();
    if (e.pointerType === 'touch') return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateDrag(e.clientX, e.clientY);
  }, [updateDrag]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (screenRef.current !== 'playing') return;
    if (e.pointerType === 'touch') return;
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    updateDrag(e.clientX, e.clientY);
  }, [updateDrag]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    pushMove();
  }, [pushMove]);

  const quitToTitle = useCallback(() => {
    destroyEngine();
    soundRef.current?.cancelScheduled();
    setLevelData(null);
    setResult(null);
    setStats(loadStats());
    setAch(loadAch());
    setDaily(loadDaily());
    const p = loadProgress();
    setBank(p.coins);
    setMetaLv({ ...(p.meta as unknown as Record<string, number>) });
    changeScreen('title');
  }, [destroyEngine, changeScreen]);

  const goEndless = useCallback(() => {
    setResult(null);
    changeScreen('playing');
    engineRef.current?.continueEndless();
  }, [changeScreen]);

  const buyMeta = useCallback((id: string) => {
    const p = loadProgress();
    const m = p.meta as unknown as Record<string, number>;
    const def = META_UPGRADES.find((x) => x.id === id);
    if (!def) return;
    const lv = m[id] ?? 0;
    if (lv >= def.maxLv) return;
    const cost = def.cost(lv);
    if (p.coins < cost) return;
    p.coins -= cost;
    m[id] = lv + 1;
    saveProgress(p);
    setBank(p.coins);
    setMetaLv({ ...m });
    if (!soundRef.current) soundRef.current = new SurvivorSound();
    soundRef.current.unlock();
    soundRef.current.select();
  }, []);

  const claimAchReward = useCallback((id: string) => {
    const reward = claimAchievement(id);
    if (reward > 0) {
      const p = loadProgress();
      p.coins += reward;
      saveProgress(p);
      setBank(p.coins);
      setAch(loadAch());
      if (!soundRef.current) soundRef.current = new SurvivorSound();
      soundRef.current.unlock();
      soundRef.current.coin();
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
      if (!soundRef.current) soundRef.current = new SurvivorSound();
      soundRef.current.unlock();
      soundRef.current.coin();
    }
  }, []);

  const title = bestTitle();
  const comp = encyCompletion();
  const missions = todayMissions();
  const inRun = screen === 'playing' || screen === 'paused' || screen === 'levelup';

  return (
    <div className="flex min-h-dvh w-full flex-col items-center bg-[#0f0d0a] px-2 py-3 text-[#f2e9d8] sm:px-4">
      <div className="w-full max-w-[1000px]">
        {/* Corporate Terminal Top Bar */}
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#4a3e2e] bg-gradient-to-r from-[#18130f] via-[#211a14] to-[#18130f] px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.65)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#dfb15b]/60 bg-[#261f17] shadow-[inset_0_0_8px_rgba(223,177,91,0.2)]">
              <PixelIcon name="icon_building" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-wider text-[#f2e9d8] sm:text-lg">社畜サバイバー</span>
                <span className="hidden rounded border border-[#dfb15b]/50 bg-[#2a2115] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#fde047] sm:inline-block">
                  DARK-OFFICE HORDE SURVIVAL
                </span>
              </div>
              <p className="text-[10px] text-[#b7a992]">
                {inRun
                  ? `${STAGES[runMeta.stage].name} ／ ${DIFFICULTIES[runMeta.difficulty].name}勤務 （09:00 → 18:00 定時退社）`
                  : 'ダークオフィス・ホードサバイバル // 社畜覚醒ウェポン進化'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className="inline-flex h-9 items-center gap-1.5 rounded border border-[#5a4b38] bg-[#211b15] px-2.5 text-xs font-bold text-[#e4c989]"
              title="所持残業代（恒久強化に使用）"
            >
              <PixelIcon name="coin" size={15} />
              <span className="font-mono">{bank.toLocaleString()}</span>
            </span>
            <span
              className="hidden h-9 items-center gap-1.5 rounded border border-[#3b3328] bg-[#211b15] px-2.5 text-xs font-bold text-[#d8ccb8] sm:inline-flex"
              title={title.desc}
            >
              <PixelIcon name={title.icon} size={15} />
              <span>{title.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowGrimoire((v) => !v)}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-black transition ${
                showGrimoire
                  ? 'border-[#fde047] bg-[#362812] text-[#fde047]'
                  : 'border-[#5a4b38] bg-[#241e17] text-[#dfb15b] hover:border-[#dfb15b]'
              }`}
              title="社畜覚醒（ウェポン進化グリモア）早見表を開く"
            >
              <PixelIcon name="icon_grimoire" size={15} />
              <span>進化表</span>
            </button>
            <AudioToggle variant="compact" />
            {screen === 'playing' && (
              <button
                type="button"
                onClick={pauseGame}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded border border-[#5a4b38] bg-[#2a231b] px-3 py-1.5 text-xs font-black text-[#f2e9d8] transition hover:border-[#dfb15b] hover:bg-[#382e23] active:scale-95"
                aria-label="一時停止"
              >
                <PauseSvg />
                <span>PAUSE</span>
              </button>
            )}
          </div>
        </header>

        {/* Collapsible Evolution Grimoire Drawer (accessible anytime) */}
        {showGrimoire && (
          <div className="mb-2 rounded-lg border-2 border-[#dfb15b]/70 bg-[#181410] p-3 shadow-[0_6px_24px_rgba(0,0,0,0.8)]">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PixelIcon name="icon_grimoire" size={18} />
                <span className="text-xs font-black tracking-wide text-[#fde047]">
                  社畜覚醒（ウェポン進化グリモア）— Lv.8武装 ＋ 対応スキルLv.1 ＋ 宝箱で進化
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGrimoire(false)}
                className="rounded border border-[#5a4b38] bg-[#241e17] px-2 py-0.5 text-[10px] font-bold text-[#d8ccb8] hover:border-[#dfb15b]"
              >
                閉じる
              </button>
            </div>
            <EvolutionGrimoirePanel hud={hud} />
          </div>
        )}

        {/* In-Run Dark-Arcade Horde-Survivor HUD */}
        {inRun && (
          <section className="mb-2 overflow-hidden rounded-lg border-2 border-[#4a3e2e] bg-[#16120e] text-xs shadow-[0_4px_18px_rgba(0,0,0,0.65)]">
            {/* Full-Width Top Crystalline XP Bar */}
            <div className="relative flex h-6 w-full items-center overflow-hidden border-b border-[#4a3e2e] bg-[#0a0907] px-2.5">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#059669] via-[#0284c7] to-[#eab308] opacity-85 transition-all duration-150"
                style={{ width: `${hud.xpNext > 0 ? Math.min(100, (hud.xp / hud.xpNext) * 100) : 0}%` }}
              />
              <div className="relative z-10 flex w-full items-center justify-between font-mono text-[11px] font-black">
                <span className="inline-flex items-center gap-1.5 text-[#fde047] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  <PixelIcon name="gem_gold" size={14} />
                  <span>LV. {hud.level}</span>
                </span>
                <span className=" tracking-wider text-[#f2e9d8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                  EXP {hud.xp.toLocaleString()} / {hud.xpNext.toLocaleString()} ({Math.min(100, Math.floor((hud.xp / Math.max(1, hud.xpNext)) * 100))}%)
                </span>
              </div>
            </div>

            <div className="p-2.5">
              {/* Main HUD Grid: Top-Left 6+6 Inventory Slot Grid & Top-Right Telemetry */}
              <div className="flex flex-col justify-between gap-2.5 lg:flex-row lg:items-center">
                {/* Left: 6 Weapon Slots (Row 1) + 6 Passive Slots (Row 2) */}
                <div className="space-y-1.5">
                  {/* Row 1: 6 Weapon Slots */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="w-8 font-mono text-[10px] font-black text-[#dfb15b]">[武装]</span>
                    {Array.from({ length: MAX_WEAPON_SLOTS }).map((_, idx) => {
                      const w = hud.weapons[idx];
                      if (!w) {
                        return (
                          <div
                            key={`w-empty-${idx}`}
                            className="flex h-9 w-16 flex-col items-center justify-center rounded border border-dashed border-[#3b3328] bg-[#0e0c0a]/80 font-mono text-[9px] text-[#5a4b38]"
                          >
                            W{idx + 1}
                          </div>
                        );
                      }
                      const evolved = isEvolvedWeapon(w.id);
                      const recipe = EVOLUTION_RECIPES.find((r) => r.baseWeaponId === w.id);
                      const hasMatchingPassive = recipe
                        ? hud.passives.some((p) => p.id === recipe.requiredPassiveId && p.lv >= 1)
                        : false;
                      const evoReady = !evolved && w.lv >= 8 && hasMatchingPassive;
                      return (
                        <div
                          key={w.id}
                          title={`${WEAPONS[w.id]?.name ?? w.id} ${evolved ? '【極・覚醒兵器】' : `Lv.${w.lv}/8`}`}
                          className={`relative flex h-9 min-w-[68px] flex-col justify-between rounded border px-1.5 py-0.5 ${
                            evolved
                              ? 'border-[#fde047] bg-gradient-to-b from-[#422d0b] to-[#261905] text-[#fde047] shadow-[0_0_10px_rgba(250,204,21,0.35)]'
                              : evoReady
                                ? 'border-[#22d3ee] bg-[#0f2930] text-[#e0f2fe] shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                                : w.lv >= 8
                                  ? 'border-[#83b8ac] bg-[#172622] text-[#f2e9d8]'
                                  : 'border-[#5a4b38] bg-[#211b15] text-[#f2e9d8]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <PixelIcon name={w.icon} size={15} />
                            <span className="font-mono text-[10px] font-black leading-none">
                              {evolved ? '極' : `Lv${w.lv}`}
                            </span>
                          </div>
                          {evolved ? (
                            <span className="text-center font-mono text-[8px] font-black tracking-widest text-[#fde047]">
                              AWAKENED
                            </span>
                          ) : (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 8 }).map((__, pipIdx) => (
                                <span
                                  key={pipIdx}
                                  className={`h-1 flex-1 rounded-[1px] ${
                                    pipIdx < w.lv
                                      ? evoReady
                                        ? 'bg-[#22d3ee]'
                                        : 'bg-[#dfb15b]'
                                      : 'bg-[#12100d]'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Row 2: 6 Passive Slots with Synergy Indicator Dots */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="w-8 font-mono text-[10px] font-black text-[#83b8ac]">[技能]</span>
                    {Array.from({ length: MAX_PASSIVE_SLOTS }).map((_, idx) => {
                      const p = hud.passives[idx];
                      if (!p) {
                        return (
                          <div
                            key={`p-empty-${idx}`}
                            className="flex h-8 w-16 items-center justify-center rounded border border-dashed border-[#3b3328] bg-[#0e0c0a]/80 font-mono text-[9px] text-[#5a4b38]"
                          >
                            P{idx + 1}
                          </div>
                        );
                      }
                      const pairedWithEquipped = EVOLUTION_RECIPES.some(
                        (r) =>
                          r.requiredPassiveId === p.id &&
                          hud.weapons.some((w) => w.id === r.baseWeaponId || w.id === r.evolvedId)
                      );
                      return (
                        <div
                          key={p.id}
                          title={`${PASSIVES[p.id]?.name ?? p.id} Lv.${p.lv}/5 ${pairedWithEquipped ? '（装備中の武装と進化シナジー成立！）' : ''}`}
                          className={`relative flex h-8 min-w-[68px] flex-col justify-between rounded border px-1.5 py-0.5 ${
                            pairedWithEquipped
                              ? 'border-[#dfb15b]/80 bg-[#282015] text-[#f2e9d8]'
                              : 'border-[#3b3328] bg-[#1d1813] text-[#d8ccb8]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <PixelIcon name={p.icon} size={14} />
                            <span className="font-mono text-[10px] font-bold leading-none">Lv{p.lv}</span>
                            {pairedWithEquipped && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[#fde047] shadow-[0_0_4px_#fde047]"
                                title="進化シナジー対象"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((__, pipIdx) => (
                              <span
                                key={pipIdx}
                                className={`h-1 flex-1 rounded-[1px] ${
                                  pipIdx < p.lv ? 'bg-[#83b8ac]' : 'bg-[#12100d]'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Work Clock, HP Bar, DPS Meter, Kills, Coins & Score */}
                <div className="flex flex-1 flex-col justify-between gap-2 lg:max-w-[440px]">
                  {/* Top Telemetry Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded border border-[#5a4b38] bg-[#241e17] px-2 py-1 font-mono text-xs font-black text-[#f2e9d8]">
                      <PixelIcon name="icon_clock" size={14} />
                      <span>{formatClock(hud.time)}</span>
                      <span className="text-[10px] font-bold text-[#9c8e78]">
                        {hud.endless ? '[無限残業]' : '/ 18:00'}
                      </span>
                    </span>

                    <span
                      className="inline-flex items-center gap-1 rounded border border-[#b23a2a]/70 bg-[#281512] px-2 py-1 font-mono text-xs font-black text-[#fde047]"
                      title="直近1.5秒間の秒間ダメージ (DPS)"
                    >
                      <PixelIcon name="icon_dps" size={14} />
                      <span>DPS {(hud.dps ?? 0).toLocaleString()}</span>
                    </span>

                    <span
                      className="inline-flex items-center gap-1 rounded border border-[#3b3328] bg-[#241e17] px-2 py-1 font-mono text-xs font-bold text-[#f2e9d8]"
                      title="討伐・処理した業務数"
                    >
                      <PixelIcon name="icon_briefcase" size={14} />
                      <span>{hud.kills.toLocaleString()}</span>
                    </span>

                    <span
                      className="inline-flex items-center gap-1 rounded border border-[#3b3328] bg-[#241e17] px-2 py-1 font-mono text-xs font-bold text-[#e4c989]"
                      title="獲得した残業代コイン"
                    >
                      <PixelIcon name="coin" size={14} />
                      <span>{hud.coins.toLocaleString()}</span>
                    </span>
                  </div>

                  {/* HP Bar & Workday Timeline */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-1.5">
                      <PixelIcon name="icon_heart" size={14} />
                      <TwoStageHpBar hp={hud.hp} maxHp={hud.maxHp} />
                      <span className="shrink-0 font-mono text-[11px] font-black text-[#f2e9d8]">
                        {hud.hp}/{hud.maxHp}
                      </span>
                    </div>

                    {!hud.endless ? (
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 text-[10px] font-bold text-[#9c8e78]">定時</span>
                        <div className="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-[#0c0a08] ring-1 ring-[#3b3328]">
                          <div
                            className="h-full bg-[#83b8ac] transition-all duration-150"
                            style={{ width: `${Math.min(100, (hud.time / RUN_SECONDS) * 100)}%` }}
                          />
                          {BOSS_SCHEDULE.map((b) => (
                            <span
                              key={b.atSec}
                              title={b.title}
                              className="absolute inset-y-0 w-0.5 bg-[#e0533c]"
                              style={{ left: `${(b.atSec / RUN_SECONDS) * 100}%` }}
                            />
                          ))}
                        </div>
                        <span className="shrink-0 font-mono text-[10px] font-bold text-[#dfb15b]">
                          {hud.score.toLocaleString()}pt
                        </span>
                      </div>
                    ) : (
                      <div className="text-right font-mono text-xs font-black text-[#dfb15b]">
                        SCORE {hud.score.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Buffs */}
              {(hud.xpBoostT > 0 || hud.coinBoostT > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  {hud.xpBoostT > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[#e0533c]/60 bg-[#b23a2a]/40 px-2 py-0.5 text-[#f2e9d8]">
                      <PixelIcon name="icon_level_up" size={12} />
                      <span>人事査定タイム（経験値2倍）残り {Math.ceil(hud.xpBoostT)}s</span>
                    </span>
                  )}
                  {hud.coinBoostT > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[#dfb15b]/60 bg-[#78571a]/50 px-2 py-0.5 text-[#f2e9d8]">
                      <PixelIcon name="coin" size={12} />
                      <span>深夜残業割増（残業代2倍）残り {Math.ceil(hud.coinBoostT)}s</span>
                    </span>
                  )}
                </div>
              )}

              {/* Row 4: Boss Health Bar */}
              {hud.bossMax > 0 && (
                <div className="mt-2 rounded border border-[#b23a2a] bg-[#24110e] px-2.5 py-1.5">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-black text-[#f8b4a6]">
                    <span className="inline-flex items-center gap-1.5">
                      <PixelIcon name="icon_skull" size={14} />
                      <span>【役職強襲】{hud.bossName}</span>
                    </span>
                    <span className="font-mono text-[#f2e9d8]">
                      HP {hud.bossHp.toLocaleString()} / {hud.bossMax.toLocaleString()}
                    </span>
                  </div>
                  <Bar value={hud.bossHp} max={hud.bossMax} className="bg-[#e0533c]" heightClass="h-2.5" />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Stage Viewport */}
        <div
          ref={stageRef}
          className="relative overflow-hidden rounded-lg border-2 border-[#4a3e2e] bg-[#12100d] shadow-[0_8px_30px_rgba(0,0,0,0.7)]"
          style={{ aspectRatio: '8 / 5' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="h-full w-full touch-none select-none" width={960} height={600} />

          {/* In-Game Event & Chest Treasure / Evolution Ceremony Banner */}
          {banner && screen === 'playing' && (
            <div
              key={banner.key}
              className={`pointer-events-none absolute inset-x-4 top-4 z-20 mx-auto max-w-[500px] rounded-lg border-2 px-4 py-2.5 text-center shadow-[0_8px_28px_rgba(0,0,0,0.85)] ${
                banner.title.includes('【進化】')
                  ? 'border-[#fde047] bg-gradient-to-r from-[#261805]/95 via-[#422c09]/95 to-[#261805]/95'
                  : banner.title.includes('【宝箱】')
                    ? 'border-[#dfb15b] bg-[#1e170d]/95'
                    : 'border-[#dfb15b] bg-[#12100d]/95'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <PixelIcon
                  name={
                    banner.title.includes('【進化】')
                      ? 'icon_grimoire'
                      : banner.title.includes('【宝箱】')
                        ? 'chest'
                        : 'icon_trophy'
                  }
                  size={20}
                />
                <p className="text-sm font-black tracking-wide text-[#fde047] sm:text-base">{banner.title}</p>
              </div>
              <p className="mt-0.5 text-xs text-[#f2e9d8]">{banner.sub}</p>
            </div>
          )}

          {screen === 'title' && (
            <TitleOverlay
              tab={tab} setTab={setTab}
              difficulty={difficulty} setDifficulty={setDifficulty}
              stage={stage} setStage={setStage}
              bank={bank} records={records} stats={stats}
              ach={ach} daily={daily} missions={missions}
              comp={comp} metaLv={metaLv}
              onStart={() => startRun(difficulty, stage)}
              onBuyMeta={buyMeta}
              onClaimAch={claimAchReward}
              onClaimDaily={claimDailyReward}
            />
          )}

          {screen === 'levelup' && levelData && (
            <LevelUpOverlay
              data={levelData}
              hud={hud}
              onChoose={chooseUpgrade}
              onReroll={() => engineRef.current?.rerollChoices()}
              onBanish={(i) => engineRef.current?.banishChoice(i)}
            />
          )}

          {screen === 'paused' && (
            <PauseOverlay
              hud={hud}
              runMeta={runMeta}
              onResume={resumeGame}
              onForfeit={forfeitGame}
              onQuit={quitToTitle}
            />
          )}

          {screen === 'playing' && (
            <div className="absolute bottom-3 right-3 z-20">
              <DashSweepButton
                cd={hud.dashCd}
                max={hud.dashMax}
                onDash={() => engineRef.current?.setDash()}
              />
            </div>
          )}

          {screen === 'result' && result && (
            <ResultOverlay
              result={result}
              stageId={runMeta.stage}
              freshAch={freshAch}
              records={records}
              onRetry={() => startRun(runMeta.difficulty, runMeta.stage)}
              onEndless={result.victory ? goEndless : undefined}
              onTitle={quitToTitle}
            />
          )}
        </div>

        <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[#8a7d69]">
          <span>移動: WASD / 矢印キー / ドラッグ / 仮想パッド（攻撃は全自動）</span>
          <span>緊急回避ダッシュ: Shift / Space / 右下ボタン（無敵フレーム付）</span>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Title & Lobby ---------------- */

function TitleOverlay(props: {
  tab: TitleTab; setTab: (t: TitleTab) => void;
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  stage: StageId; setStage: (s: StageId) => void;
  bank: number; records: RecordEntry[]; stats: SurvivorStats;
  ach: AchState; daily: DailyState;
  missions: { id: string; name: string; icon: string; desc: string; target: number; reward: number }[];
  comp: { enemies: number; enemiesTotal: number; weapons: number; weaponsTotal: number };
  metaLv: Record<string, number>;
  onStart: () => void;
  onBuyMeta: (id: string) => void;
  onClaimAch: (id: string) => void;
  onClaimDaily: (id: string) => void;
}) {
  const { tab, setTab, ach, daily, missions, bank, metaLv } = props;

  const claimableAchCount = ACHIEVEMENTS.filter((a) => ach.unlocked[a.id] && !ach.claimed[a.id]).length;
  const claimableDailyCount = missions.filter((m) => (daily.progress[m.id] ?? 0) >= m.target && !daily.claimed[m.id]).length;
  const affordablePowerCount = META_UPGRADES.filter((m) => {
    const lv = metaLv[m.id] ?? 0;
    return lv < m.maxLv && bank >= m.cost(lv);
  }).length;

  const tabs: { id: TitleTab; label: string; icon: string; badge?: number }[] = [
    { id: 'play', label: '出社準備', icon: 'icon_building' },
    { id: 'power', label: '人事強化', icon: 'icon_power', badge: affordablePowerCount },
    { id: 'dex', label: '業務図鑑', icon: 'icon_book' },
    { id: 'ach', label: '社内実績', icon: 'icon_trophy', badge: claimableAchCount },
    { id: 'daily', label: '本日日課', icon: 'icon_calendar', badge: claimableDailyCount },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#12100d]/95 p-3 sm:p-4">
      <div className="mx-auto max-w-[680px]">
        {/* Hero Cover Banner */}
        <div className="relative mb-3 overflow-hidden rounded-lg border border-[#5a4b38] shadow-lg">
          <Image
            src="/assets/survivor_cover.jpg"
            alt="Salaryman Survivors"
            width={800}
            height={447}
            className="h-28 w-full object-cover grayscale-[0.15] saturate-75 sm:h-36"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12100d] via-[#12100d]/65 to-transparent flex flex-col justify-end p-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] font-black tracking-widest text-[#dfb15b]">
                  TIMECARD ROGUELITE ACTION // 09:00 TO 18:00
                </p>
                <h2 className="text-xl font-black tracking-wide text-[#f2e9d8] drop-shadow sm:text-2xl">
                  社畜サバイバー
                </h2>
                <p className="text-[11px] text-[#d8ccb8]">
                  全方位から迫る業務・上司・監査をなぎ払い、18時の定時退社を勝ち取れ！
                </p>
              </div>
              <div className="flex gap-1.5 text-[10px] font-bold">
                <span className="rounded border border-[#5a4b38] bg-[#181410]/90 px-2 py-1 text-[#dfb15b]">
                  武装8種＋進化8種
                </span>
                <span className="rounded border border-[#5a4b38] bg-[#181410]/90 px-2 py-1 text-[#83b8ac]">
                  全4フロア
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (44px+ touch targets) */}
        <nav className="mb-3 grid grid-cols-5 gap-1.5" aria-label="メニュー切替">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-[11px] font-black transition sm:flex-row sm:gap-1.5 sm:text-xs ${
                  active
                    ? 'border-[#f2e9d8] bg-[#dfb15b] text-[#12100d] shadow-[0_2px_8px_rgba(223,177,91,0.3)]'
                    : 'border-[#3b3328] bg-[#1d1914] text-[#b7a992] hover:border-[#5a4b38] hover:text-[#f2e9d8]'
                }`}
              >
                <PixelIcon name={t.icon} size={15} />
                <span className=" truncate">{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b23a2a] px-1 font-mono text-[9px] font-black text-white ring-1 ring-[#f2e9d8]">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div>
          {tab === 'play' && <PlayTab {...props} />}
          {tab === 'power' && <PowerTab bank={props.bank} metaLv={props.metaLv} onBuyMeta={props.onBuyMeta} />}
          {tab === 'dex' && <DexTab />}
          {tab === 'ach' && <AchTab ach={props.ach} onClaim={props.onClaimAch} />}
          {tab === 'daily' && <DailyTab daily={props.daily} missions={props.missions} onClaim={props.onClaimDaily} />}
        </div>
      </div>
    </div>
  );
}

function PlayTab(props: {
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  stage: StageId; setStage: (s: StageId) => void;
  stats: SurvivorStats; records: RecordEntry[];
  comp: { enemies: number; enemiesTotal: number; weapons: number; weaponsTotal: number };
  onStart: () => void;
}) {
  const { difficulty, setDifficulty, stage, setStage, stats, records, comp, onStart } = props;
  const titles = earnedTitles();
  const currentTitle = titles[titles.length - 1] ?? titles[0];

  return (
    <div className="space-y-3">
      {/* Stage / Office Floor Selection */}
      <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-black tracking-wide text-[#dfb15b]">
            <PixelIcon name="icon_building" size={14} />
            <span>STEP 1: 勤務フロア（ステージ）を選択</span>
          </h3>
          <span className="font-mono text-[10px] text-[#9c8e78]">定時退社数: {stats.wins}回</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STAGE_ORDER.map((s) => {
            const def = STAGES[s];
            const locked = stats.wins < def.unlockAtWins;
            const selected = stage === s;
            return (
              <button
                key={s}
                type="button"
                disabled={locked}
                onClick={() => setStage(s)}
                className={`group relative flex min-h-[76px] flex-col justify-between rounded-lg border p-2.5 text-left transition ${
                  locked
                    ? 'cursor-not-allowed border-[#2c251d] bg-[#14110e] opacity-55'
                    : selected
                      ? 'border-[#83b8ac] bg-[#172622] shadow-[inset_0_0_0_1px_#83b8ac]'
                      : 'border-[#3b3328] bg-[#211c16] hover:border-[#5a4b38]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 shrink-0 rounded-sm border border-white/25"
                      style={{ backgroundColor: def.floor }}
                    />
                    <span className="text-xs font-black text-[#f2e9d8]">{def.name}</span>
                  </div>
                  {locked ? (
                    <span className="inline-flex items-center gap-1 rounded bg-[#2a2119] px-1.5 py-0.5 text-[10px] font-bold text-[#b7a992]">
                      <LockSvg />
                      <span>定時退社{def.unlockAtWins}回で解禁</span>
                    </span>
                  ) : selected ? (
                    <span className="rounded bg-[#83b8ac] px-1.5 py-0.5 text-[10px] font-black text-[#12100d]">
                      配属中
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-[#b7a992]">{def.desc}</p>
                <div className="mt-1.5 flex flex-wrap gap-1 font-mono text-[10px]">
                  <span className="rounded bg-black/35 px-1.5 py-0.5 text-[#83b8ac]">XP ×{def.xpMul}</span>
                  <span className="rounded bg-black/35 px-1.5 py-0.5 text-[#e4c989]">残業代 ×{def.coinMul}</span>
                  <span className="rounded bg-black/35 px-1.5 py-0.5 text-[#f2e9d8]">SCORE ×{def.scoreMul}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-black tracking-wide text-[#dfb15b]">
          <PixelIcon name="icon_skull" size={14} />
          <span>STEP 2: 本日のブラック度（難易度）を選択</span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTY_ORDER.map((d) => {
            const def = DIFFICULTIES[d];
            const selected = difficulty === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex min-h-[78px] flex-col items-center justify-between rounded-lg border p-2 text-center transition ${
                  selected
                    ? 'border-[#dfb15b] bg-[#2c2318] shadow-[inset_0_0_0_1px_#dfb15b]'
                    : 'border-[#3b3328] bg-[#211c16] hover:border-[#5a4b38]'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-[#f2e9d8] sm:text-sm">
                  <PixelIcon name={def.icon} size={16} />
                  <span>{def.name}</span>
                </div>
                <p className="my-1 text-[10px] leading-tight text-[#b7a992]">{def.desc}</p>
                <div className="flex flex-wrap justify-center gap-1 font-mono text-[10px]">
                  <span className="rounded bg-black/35 px-1.5 py-0.5 text-[#dfb15b]">SCORE ×{def.scoreMul}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Punch-In CTA */}
        <button
          type="button"
          onClick={onStart}
          className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg border-2 border-[#f2e9d8] bg-[#b23a2a] px-4 py-3 text-base font-black tracking-wider text-[#f2e9d8] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94331] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#f2e9d8] sm:text-lg"
        >
          <PixelIcon name="icon_clock" size={20} />
          <span>タイムカード打刻・出社する（10分サバイバル）</span>
        </button>
      </div>

      {/* Career Dossier & High Scores */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black text-[#dfb15b]">人事考課サマリー</span>
            <span className="inline-flex items-center gap-1 rounded bg-[#241e17] px-2 py-0.5 text-[11px] font-bold text-[#f2e9d8]">
              <PixelIcon name={currentTitle?.icon ?? 'player'} size={13} />
              <span>{currentTitle?.name}</span>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
            <div className="rounded bg-[#211c16] p-2">
              <p className="text-[10px] text-[#9c8e78]">出社回数</p>
              <p className="font-mono text-sm font-black text-[#f2e9d8]">{stats.runs}</p>
            </div>
            <div className="rounded bg-[#211c16] p-2">
              <p className="text-[10px] text-[#9c8e78]">定時退社</p>
              <p className="font-mono text-sm font-black text-[#83b8ac]">{stats.wins}</p>
            </div>
            <div className="rounded bg-[#211c16] p-2">
              <p className="text-[10px] text-[#9c8e78]">総撃破数</p>
              <p className="font-mono text-sm font-black text-[#f2e9d8]">{stats.totalKills.toLocaleString()}</p>
            </div>
            <div className="rounded bg-[#211c16] p-2">
              <p className="text-[10px] text-[#9c8e78]">最高Lv</p>
              <p className="font-mono text-sm font-black text-[#dfb15b]">{stats.maxLevel}</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-[#9c8e78]">
            業務図鑑 {comp.enemies}/{comp.enemiesTotal} ・ 武器図鑑 {comp.weapons}/{comp.weaponsTotal}
          </p>
        </div>

        <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
          <p className="mb-2 text-xs font-black text-[#dfb15b]">歴代ベストスコア記録</p>
          {records.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#8a7d69]">まだ出社記録がありません。初出社して記録を刻もう！</p>
          ) : (
            <div className="space-y-1.5">
              {records.slice(0, 3).map((r, i) => {
                const rk = rankOf(r);
                return (
                  <div key={`${r.date}-${i}`} className="flex items-center justify-between rounded bg-[#211c16] px-2.5 py-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#362b1e] font-mono text-[10px] font-black text-[#dfb15b]">
                        {rk}
                      </span>
                      <span className="font-bold text-[#d8ccb8]">
                        {i + 1}位 {r.victory ? '[定時退社] ' : ''}
                        {DIFFICULTIES[r.difficulty as Difficulty]?.name ?? r.difficulty} ({formatTime(r.time)} / Lv{r.level})
                      </span>
                    </div>
                    <span className="font-mono font-black text-[#f2e9d8]">{r.score.toLocaleString()}pt</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding / Evolution Guide */}
      <div className="rounded-lg border border-[#3b3328] bg-[#211c16] p-3 text-[11px] leading-relaxed text-[#d8ccb8]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <p className="font-black text-[#dfb15b]">■ 業務サバイバルの心得</p>
            <p>・敵を倒して「やる気ジェム」を回収し、3択から武装・スキルを強化。</p>
            <p>・2:30課長、5:00役員、7:30専務、9:20社長が襲来！18:00生還で定時退社。</p>
          </div>
          <div>
            <p className="font-black text-[#83b8ac]">■ 伝説の「進化武装」システム</p>
            <p>・基本武装を <b>Lv8 (MAX)</b> に育て、対応する <b>パッシブ技能 (Lv1以上)</b> を所持した状態で <b>エリート/ボスの宝箱</b> を開けると超強力な進化武装へ覚醒！</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PowerTab(props: { bank: number; metaLv: Record<string, number>; onBuyMeta: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#2c251d] pb-2">
        <div>
          <h3 className="text-sm font-black text-[#f2e9d8]">人事研修・恒久ステータス強化</h3>
          <p className="text-[11px] text-[#9c8e78]">出社で稼いだ残業代を使って、全出社に適用される基礎能力を底上げします。</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded border border-[#5a4b38] bg-[#241e17] px-3 py-1.5 font-mono text-xs font-black text-[#e4c989]">
          <PixelIcon name="coin" size={14} />
          <span>所持 {props.bank.toLocaleString()}</span>
        </span>
      </div>

      <div className="space-y-2.5">
        {META_UPGRADES.map((m) => {
          const lv = props.metaLv[m.id] ?? 0;
          const maxed = lv >= m.maxLv;
          const cost = m.cost(lv);
          const canBuy = !maxed && props.bank >= cost;
          return (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#3b3328] bg-[#211c16] p-3"
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-[#4a3e2e] bg-[#181410]">
                    <PixelIcon name={m.icon} size={18} />
                  </div>
                  <div>
                    <p className="font-black text-[#f2e9d8]">
                      {m.name}{' '}
                      <span className="ml-1 font-mono text-xs text-[#dfb15b]">
                        Lv.{lv}/{m.maxLv}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#b7a992]">{m.desc}</p>
                  </div>
                </div>
                <LevelPips current={lv} max={m.maxLv} gold />
              </div>

              <button
                type="button"
                disabled={!canBuy}
                onClick={() => props.onBuyMeta(m.id)}
                className={`min-h-[44px] min-w-[110px] shrink-0 rounded-lg border px-4 py-2 text-xs font-black transition ${
                  maxed
                    ? 'border-[#3b3328] bg-[#181410] text-[#83b8ac]'
                    : canBuy
                      ? 'border-[#f2e9d8] bg-[#b23a2a] text-[#f2e9d8] hover:bg-[#c94331] active:scale-95'
                      : 'cursor-not-allowed border-[#3b3328] bg-[#181410] text-[#756957] opacity-60'
                }`}
              >
                {maxed ? (
                  'MAX 達成'
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5 font-mono">
                    <PixelIcon name="coin" size={13} />
                    <span>{cost.toLocaleString()} 強化</span>
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DexTab() {
  const enemies = encyEnemies();
  const weapons = encyWeapons();
  const rawEncy = loadEncy();
  const bossEntries = (['exec', 'senmu', 'president'] as const).map((k) => {
    const def = ENEMIES[k];
    const kills = rawEncy.enemies[k] ?? 0;
    return { kind: k, name: def.name, kills, found: kills > 0 };
  });

  return (
    <div className="space-y-3">
      {/* Evolution Recipe Matrix */}
      <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
        <h3 className="mb-1 text-xs font-black text-[#dfb15b]">■ 武装進化レシピ一覧（Lv8武装 ＋ 対応スキル ＋ 宝箱）</h3>
        <p className="mb-2 text-[11px] text-[#9c8e78]">
          基本武装をLv8まで鍛え、ペアとなる社内スキルを1つでも所持して宝箱を開けると伝説の決裁兵器に進化します。
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {EVOLUTION_RECIPES.map((r) => {
            const baseDef = WEAPONS[r.baseWeaponId as WeaponId];
            const pasDef = PASSIVES[r.requiredPassiveId as PassiveId];
            const unlocked = (rawEncy.weapons[r.evolvedId] ?? 0) > 0;
            return (
              <div
                key={r.evolvedId}
                className={`flex items-center justify-between gap-2 rounded border px-2.5 py-2 text-[11px] ${
                  unlocked ? 'border-[#dfb15b]/60 bg-[#2a2115]' : 'border-[#3b3328] bg-[#211c16]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <PixelIcon name={baseDef.icon} size={18} />
                  <span className="font-bold text-[#d8ccb8]">{baseDef.name}</span>
                  <span className="text-[#8a7d69]">+</span>
                  <PixelIcon name={pasDef.icon} size={16} />
                  <span className="text-[#b7a992]">{pasDef.name}</span>
                </div>
                <div className="flex items-center gap-1 font-black text-[#dfb15b]">
                  <span>→</span>
                  <PixelIcon name={r.icon} size={18} />
                  <span>{r.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enemies & Bosses */}
      <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
        <h3 className="mb-2 text-xs font-black text-[#dfb15b]">■ 業務・役職図鑑（撃破記録）</h3>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {[...enemies, ...bossEntries].map((e) => (
            <div
              key={e.kind}
              className={`rounded border p-2 text-center text-[11px] ${
                e.found ? 'border-[#3b3328] bg-[#211c16]' : 'border-[#2c251d] bg-[#14110e] opacity-55'
              }`}
            >
              <div className="my-1 flex h-8 items-center justify-center">
                {e.found ? <PixelIcon name={e.kind} size={30} /> : <span className="font-mono text-lg font-black text-[#756957]">?</span>}
              </div>
              <p className="truncate font-black text-[#f2e9d8]">{e.found ? e.name : '未遭遇'}</p>
              <p className="font-mono text-[10px] text-[#9c8e78]">{e.kills.toLocaleString()}体撃破</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weapons */}
      <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
        <h3 className="mb-2 text-xs font-black text-[#dfb15b]">■ 武装図鑑（基本8種・進化8種）</h3>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {weapons.map((w) => {
            const evolved = isEvolvedWeapon(w.id);
            return (
              <div
                key={w.id}
                className={`rounded border p-2.5 text-[11px] ${
                  w.found
                    ? evolved
                      ? 'border-[#dfb15b]/60 bg-[#2a2115]'
                      : 'border-[#3b3328] bg-[#211c16]'
                    : 'border-[#2c251d] bg-[#14110e] opacity-55'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-black text-[#f2e9d8]">
                    {w.found ? (
                      <>
                        <PixelIcon name={w.id} size={18} />
                        <span>{w.name}</span>
                      </>
                    ) : (
                      <span className="text-[#8a7d69]">? 未登録武装</span>
                    )}
                  </p>
                  {evolved ? (
                    <span className="rounded bg-[#dfb15b] px-1.5 py-0.5 text-[9px] font-black text-[#12100d]">進化兵器</span>
                  ) : (
                    <span className="font-mono text-[10px] text-[#9c8e78]">最高Lv.{w.maxLv}</span>
                  )}
                </div>
                <p className="mt-1 text-[#b7a992]">{w.found ? w.desc : '出社して入手すると詳細が記録されます'}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AchTab(props: { ach: AchState; onClaim: (id: string) => void }) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => props.ach.unlocked[a.id]).length;
  return (
    <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-black text-[#dfb15b]">■ 社内表彰・実績一覧</h3>
        <span className="font-mono text-xs font-bold text-[#d8ccb8]">
          達成 {unlockedCount} / {ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="space-y-2">
        {ACHIEVEMENTS.map((a) => {
          const un = props.ach.unlocked[a.id] === true;
          const cl = props.ach.claimed[a.id] === true;
          return (
            <div
              key={a.id}
              className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs ${
                un ? 'border-[#4a3e2e] bg-[#211c16]' : 'border-[#2c251d] bg-[#14110e] opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#3b3328] bg-[#181410]">
                  <PixelIcon name={a.icon} size={18} />
                </div>
                <div>
                  <p className="font-black text-[#f2e9d8]">{a.name}</p>
                  <p className="text-[11px] text-[#9c8e78]">{a.desc}</p>
                </div>
              </div>
              {cl ? (
                <span className="shrink-0 rounded bg-[#181410] px-2.5 py-1 text-[11px] font-bold text-[#83b8ac]">
                  受領済
                </span>
              ) : un ? (
                <button
                  type="button"
                  onClick={() => props.onClaim(a.id)}
                  className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-lg border border-[#f2e9d8] bg-[#dfb15b] px-3 py-1.5 font-mono text-xs font-black text-[#12100d] transition hover:bg-[#f0c775] active:scale-95"
                >
                  <PixelIcon name="coin" size={13} />
                  <span>+{a.reward} 受取</span>
                </button>
              ) : (
                <span className="shrink-0 font-mono text-[11px] text-[#756957]">
                  報酬 {a.reward}
                </span>
              )}
            </div>
          );
        })}
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
    <div className="rounded-lg border border-[#3b3328] bg-[#181410] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-black text-[#dfb15b]">■ 本日の業務ノルマ（デイリー日課）</h3>
        <span className="text-[11px] text-[#9c8e78]">毎日0:00更新</span>
      </div>
      <div className="space-y-2">
        {props.missions.map((m) => {
          const prog = Math.min(m.target, props.daily.progress[m.id] ?? 0);
          const done = prog >= m.target;
          const cl = props.daily.claimed[m.id] === true;
          return (
            <div key={m.id} className="rounded-lg border border-[#3b3328] bg-[#211c16] p-3 text-xs">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PixelIcon name={m.icon} size={18} />
                  <div>
                    <p className="font-black text-[#f2e9d8]">{m.name}</p>
                    <p className="text-[11px] text-[#9c8e78]">{m.desc}</p>
                  </div>
                </div>
                {cl ? (
                  <span className="rounded bg-[#181410] px-2.5 py-1 text-[11px] font-bold text-[#83b8ac]">受領済</span>
                ) : done ? (
                  <button
                    type="button"
                    onClick={() => props.onClaim(m.id)}
                    className="flex min-h-[40px] items-center gap-1 rounded-lg border border-[#f2e9d8] bg-[#dfb15b] px-3 py-1.5 font-mono text-xs font-black text-[#12100d] transition hover:bg-[#f0c775] active:scale-95"
                  >
                    <PixelIcon name="coin" size={13} />
                    <span>+{m.reward} 受取</span>
                  </button>
                ) : (
                  <span className="font-mono text-xs font-bold text-[#dfb15b]">
                    {prog} / {m.target}
                  </span>
                )}
              </div>
              <Bar value={prog} max={m.target} className="bg-[#dfb15b]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Level-Up & Evolution Synergy Overlay ---------------- */

function EvolutionGrimoirePanel({ hud }: { hud: HudSnapshot }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {EVOLUTION_RECIPES.map((r) => {
        const baseDef = WEAPONS[r.baseWeaponId as WeaponId];
        const pasDef = PASSIVES[r.requiredPassiveId as PassiveId];
        const ownedBase = hud.weapons.find((w) => w.id === r.baseWeaponId);
        const ownedEvolved = hud.weapons.some((w) => w.id === r.evolvedId);
        const ownedPas = hud.passives.some((p) => p.id === r.requiredPassiveId && p.lv >= 1);
        const readyToEvolve = !ownedEvolved && (ownedBase?.lv ?? 0) >= 8 && ownedPas;

        return (
          <div
            key={r.evolvedId}
            className={`flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-[11px] ${
              ownedEvolved
                ? 'border-[#fde047] bg-[#362812] text-[#fde047]'
                : readyToEvolve
                  ? 'border-[#22d3ee] bg-[#0f2930] text-[#e0f2fe]'
                  : ownedBase || ownedPas
                    ? 'border-[#5a4b38] bg-[#241e17] text-[#f2e9d8]'
                    : 'border-[#2c251d] bg-[#16130f] text-[#9c8e78]'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`inline-flex items-center gap-1 rounded px-1 py-0.5 ${
                  ownedBase ? 'bg-[#3b2e1e] text-[#fde047] font-bold' : ''
                }`}
              >
                <PixelIcon name={baseDef.icon} size={15} />
                <span className="truncate">{baseDef.name}</span>
                {ownedBase && <span className="font-mono text-[9px]">Lv{ownedBase.lv}</span>}
              </span>
              <span className="text-[#8a7d69]">+</span>
              <span
                className={`inline-flex items-center gap-1 rounded px-1 py-0.5 ${
                  ownedPas ? 'bg-[#1c2e2a] text-[#83b8ac] font-bold' : ''
                }`}
              >
                <PixelIcon name={pasDef.icon} size={14} />
                <span className="truncate">{pasDef.name}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1 font-black text-[#dfb15b]">
              <span>→</span>
              <PixelIcon name={r.icon} size={16} />
              <span className="text-[10px]">
                {ownedEvolved ? '【覚醒済】' : readyToEvolve ? '【宝箱で進化！】' : r.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getChoiceSynergyInfo(c: LevelChoice, hud: HudSnapshot): {
  label: string;
  badge: string;
  icon: string;
  ready: boolean;
} | null {
  if (c.kind === 'weapon') {
    const recipe = EVOLUTION_RECIPES.find((r) => r.baseWeaponId === c.id);
    if (!recipe) return null;
    const pasDef = PASSIVES[recipe.requiredPassiveId as PassiveId];
    const hasPassive = hud.passives.some((p) => p.id === recipe.requiredPassiveId && p.lv >= 1);
    return {
      label: hasPassive
        ? `進化条件達成済 → ${recipe.name}（Lv8＋宝箱で覚醒）`
        : `進化先: ${recipe.name}（要スキル: ${pasDef.name}）`,
      badge: hasPassive && c.toLv === 8 ? 'EVOLUTION READY!' : hasPassive ? 'SYNERGY PAIR!' : 'EVO RECIPE',
      icon: recipe.icon,
      ready: hasPassive,
    };
  }
  if (c.kind === 'passive') {
    const matchingRecipes = EVOLUTION_RECIPES.filter((r) => r.requiredPassiveId === c.id);
    if (matchingRecipes.length === 0) return null;
    const ownedMatches = matchingRecipes.filter((r) => hud.weapons.some((w) => w.id === r.baseWeaponId));
    if (ownedMatches.length > 0) {
      const names = ownedMatches.map((r) => WEAPONS[r.baseWeaponId as WeaponId].name).join('・');
      const anyMax = ownedMatches.some((r) => hud.weapons.some((w) => w.id === r.baseWeaponId && w.lv >= 8));
      return {
        label: `所持武装「${names}」の進化条件スキル！`,
        badge: anyMax ? 'EVOLUTION READY!' : 'SYNERGY PAIR!',
        icon: ownedMatches[0].icon,
        ready: true,
      };
    }
    const allNames = matchingRecipes.map((r) => WEAPONS[r.baseWeaponId as WeaponId].name).join(' / ');
    return {
      label: `進化対応: ${allNames}`,
      badge: 'EVO RECIPE',
      icon: matchingRecipes[0].icon,
      ready: false,
    };
  }
  return null;
}

function LevelUpOverlay(props: {
  data: LevelUpData;
  hud: HudSnapshot;
  onChoose: (key: string) => void;
  onReroll: () => void;
  onBanish: (index: number) => void;
}) {
  const { data, hud } = props;
  const [banishMode, setBanishMode] = useState(false);
  const [showGrimoire, setShowGrimoire] = useState(false);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between overflow-y-auto bg-[#12100d]/95 p-3 sm:p-5">
      <div className="mx-auto w-full max-w-[680px]">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dfb15b]/60 bg-[#2a2115] px-3.5 py-1 text-xs font-black text-[#dfb15b]">
            <PixelIcon name="icon_level_up" size={16} />
            <span>PROMOTION ASSESSMENT // 社畜昇進査定</span>
            {data.pending > 1 && (
              <span className="ml-1 rounded bg-[#b23a2a] px-1.5 py-0.5 font-mono text-[10px] text-white">
                残り +{data.pending - 1}
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-xl font-black tracking-wide text-[#f2e9d8] sm:text-2xl">
            LEVEL {data.level} 到達 — 強化稟議を1つ承認せよ
          </h2>
          <p className="mt-0.5 text-xs text-[#b7a992]">
            {banishMode
              ? '【封印モード】今出社中に二度と出現させない項目をタップしてください'
              : 'カードをタップ（またはキーボード 1 / 2 / 3 キー）で即時承認'}
          </p>
        </div>

        {/* 3 Choice Cards */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {data.choices.map((c, i) => {
            const isMaxStep = c.kind === 'weapon' && c.toLv === 8;
            const maxLv = c.kind === 'weapon' ? 8 : c.kind === 'passive' ? 5 : 0;
            const currentLv = c.isNew ? 0 : Math.max(0, c.toLv - 1);
            const synergy = getChoiceSynergyInfo(c, hud);
            const kindBadge =
              c.kind === 'weapon' ? '業務武装' : c.kind === 'passive' ? '社内スキル' : '福利厚生';

            return (
              <button
                key={`${c.kind}:${c.id}`}
                type="button"
                onClick={() => {
                  if (banishMode) {
                    props.onBanish(i);
                    setBanishMode(false);
                  } else {
                    props.onChoose(`${c.kind}:${c.id}`);
                  }
                }}
                className={`group relative flex flex-col justify-between rounded-lg border-2 p-3 text-left transition active:scale-[0.98] ${
                  banishMode
                    ? 'border-red-400 bg-red-950/40 hover:bg-red-900/50'
                    : isMaxStep
                      ? 'border-[#fde047] bg-[#2c2212] hover:bg-[#382b17] shadow-[0_0_16px_rgba(250,204,21,0.28)]'
                      : synergy?.ready
                        ? 'border-[#83b8ac] bg-[#192622] hover:bg-[#21332e]'
                        : 'border-[#4a3e2e] bg-[#211c16] hover:border-[#dfb15b] hover:bg-[#2a231b]'
                }`}
              >
                <div>
                  {/* Top Row: Category Badge, Synergy Badge & Key Shortcut */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                          c.kind === 'weapon'
                            ? 'bg-[#3b231e] text-[#f8b4a6]'
                            : c.kind === 'passive'
                              ? 'bg-[#1c2e2a] text-[#83b8ac]'
                              : 'bg-[#2c251d] text-[#dfb15b]'
                        }`}
                      >
                        {kindBadge}
                      </span>
                      {synergy?.ready && (
                        <span className="rounded bg-[#dfb15b] px-1.5 py-0.5 font-mono text-[9px] font-black text-[#12100d]">
                          {synergy.badge}
                        </span>
                      )}
                    </div>
                    <span className="hidden rounded border border-[#4a3e2e] bg-[#12100d] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#9c8e78] sm:inline-block">
                      [{i + 1}]
                    </span>
                  </div>

                  {/* Icon & Name */}
                  <div className="my-2 flex items-center gap-2.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#5a4b38] bg-[#14110e]">
                      <PixelIcon name={c.icon} size={34} />
                    </div>
                    <div>
                      <p className="text-sm font-black leading-tight text-[#f2e9d8]">{c.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {c.isNew ? (
                          <span className="rounded bg-[#b23a2a] px-1.5 py-0.5 font-mono text-[10px] font-black text-white">
                            NEW! 習得
                          </span>
                        ) : c.toLv > 0 ? (
                          <span className="font-mono text-xs font-black text-[#83b8ac]">
                            Lv.{currentLv} → {c.toLv === 8 ? 'Lv.8 MAX!' : `Lv.${c.toLv}`}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#dfb15b]">即時効果</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {maxLv > 0 && (
                    <div className="mb-2">
                      <LevelPips current={currentLv} next={c.toLv} max={maxLv} gold={isMaxStep} />
                    </div>
                  )}

                  <p className="text-xs leading-relaxed text-[#d8ccb8]">{c.desc}</p>
                </div>

                {/* Evolution Synergy Footer */}
                {synergy && (
                  <div
                    className={`mt-2.5 flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-bold ${
                      synergy.ready
                        ? 'border-[#dfb15b]/70 bg-[#362812] text-[#fde047]'
                        : 'border-[#3b3328] bg-[#16130f] text-[#9c8e78]'
                    }`}
                  >
                    <PixelIcon name={synergy.icon} size={14} />
                    <span className="leading-tight">{synergy.label}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Reroll, Banish & Grimoire Controls */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {data.canReroll && !banishMode && (
            <button
              type="button"
              onClick={props.onReroll}
              className="min-h-[42px] flex-1 rounded-lg border border-[#5a4b38] bg-[#241e17] px-3 py-2 text-xs font-black text-[#f2e9d8] transition hover:border-[#dfb15b] hover:bg-[#2f271d]"
            >
              稟議を引き直す（残1回 / [R]キー）
            </button>
          )}
          {data.canBanish && (
            <button
              type="button"
              onClick={() => setBanishMode(!banishMode)}
              className={`min-h-[42px] flex-1 rounded-lg border px-3 py-2 text-xs font-black transition ${
                banishMode
                  ? 'border-[#f2e9d8] bg-[#b23a2a] text-white'
                  : 'border-[#5a4b38] bg-[#241e17] text-[#d8ccb8] hover:border-red-400'
              }`}
            >
              {banishMode ? '封印モードをキャンセル' : '不要な項目を封印する（残1回）'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowGrimoire((v) => !v)}
            className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-[#dfb15b]/60 bg-[#2a2115] px-3 py-2 text-xs font-black text-[#fde047] transition hover:border-[#fde047]"
          >
            <PixelIcon name="icon_grimoire" size={15} />
            <span>{showGrimoire ? '進化レシピを隠す' : '武器進化レシピ早見表'}</span>
          </button>
        </div>

        {showGrimoire && (
          <div className="mt-2.5 rounded-lg border border-[#5a4b38] bg-[#181410] p-2.5">
            <EvolutionGrimoirePanel hud={hud} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Pause Overlay ---------------- */

function PauseOverlay(props: {
  hud: HudSnapshot;
  runMeta: { difficulty: Difficulty; stage: StageId };
  onResume: () => void;
  onForfeit: () => void;
  onQuit: () => void;
}) {
  const { hud, runMeta, onResume, onForfeit, onQuit } = props;
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto bg-[#12100d]/92 p-4">
      <div className="w-full max-w-[540px] rounded-xl border-2 border-[#5a4b38] bg-[#181410] p-4 shadow-2xl">
        <div className="border-b border-[#2c251d] pb-3 text-center">
          <p className="font-mono text-[10px] font-black tracking-widest text-[#dfb15b]">BREAK TIME // 業務一時休止</p>
          <h2 className="mt-0.5 text-xl font-black text-[#f2e9d8]">一時休憩中</h2>
          <p className="mt-0.5 text-xs text-[#9c8e78]">
            {STAGES[runMeta.stage].name} ／ {DIFFICULTIES[runMeta.difficulty].name} ／ 経過 {formatTime(hud.time)} ／ DPS {(hud.dps ?? 0).toLocaleString()}
          </p>
        </div>

        {/* Audio Settings in Pause Menu */}
        <div className="my-2.5 flex items-center justify-between rounded-lg border border-[#3b3328] bg-[#211c16] px-3 py-2">
          <span className="text-xs font-bold text-[#d8ccb8]">サウンド設定</span>
          <AudioToggle variant="full" />
        </div>

        {/* Current Build Summary */}
        <div className="mb-2.5 rounded-lg border border-[#3b3328] bg-[#211c16] p-2.5">
          <p className="mb-1.5 text-[11px] font-bold text-[#9c8e78]">現在の装備・スキル構成</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {hud.weapons.map((w) => (
              <span key={w.id} className="inline-flex items-center gap-1 rounded border border-[#4a3e2e] bg-[#181410] px-2 py-1 text-xs font-bold">
                <PixelIcon name={w.icon} size={16} />
                <span>{WEAPONS[w.id]?.name}</span>
                <span className="font-mono text-[#dfb15b]">{isEvolvedWeapon(w.id) ? '極' : `Lv${w.lv}`}</span>
              </span>
            ))}
            {hud.passives.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded border border-[#3b3328] bg-[#181410] px-2 py-1 text-xs font-bold text-[#83b8ac]">
                <PixelIcon name={p.icon} size={16} />
                <span>{PASSIVES[p.id]?.name}</span>
                <span className="font-mono">Lv{p.lv}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Evolution Grimoire in Pause Menu */}
        <div className="mb-3 rounded-lg border border-[#3b3328] bg-[#1c1712] p-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black text-[#dfb15b]">
            <PixelIcon name="icon_grimoire" size={14} />
            <span>社畜覚醒（ウェポン進化グリモア）早見表</span>
          </p>
          <EvolutionGrimoirePanel hud={hud} />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onResume}
            className="min-h-[46px] w-full rounded-lg border border-[#f2e9d8] bg-[#b23a2a] py-2.5 text-sm font-black text-[#f2e9d8] transition hover:bg-[#c94331]"
          >
            業務を再開する (RESUME)
          </button>
          <button
            type="button"
            onClick={onForfeit}
            className="min-h-[44px] w-full rounded-lg border border-[#5a4b38] bg-[#2a231b] py-2.5 text-xs font-black text-[#e4c989] transition hover:border-[#dfb15b]"
          >
            早退して残業代を精算する（+{hud.coins}コイン獲得して終了）
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="min-h-[44px] w-full rounded-lg border border-[#3b3328] bg-[#14110e] py-2.5 text-xs font-bold text-[#9c8e78] transition hover:text-[#f2e9d8]"
          >
            精算せずタイトルへ戻る
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Result Overlay ---------------- */

function ResultOverlay(props: {
  result: RunResult;
  stageId: StageId;
  freshAch: string[];
  records: RecordEntry[];
  onRetry: () => void;
  onEndless?: () => void;
  onTitle: () => void;
}) {
  const { result, stageId, freshAch, records, onRetry, onEndless, onTitle } = props;
  const fresh = ACHIEVEMENTS.filter((a) => freshAch.includes(a.id));
  const rank = rankOf(result);
  const weaponEntries = Object.entries(result.weaponLevels);

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-[#12100d]/95 p-3 sm:p-5">
      <div className="mx-auto max-w-[520px] rounded-xl border-2 border-[#5a4b38] bg-[#181410] p-4 text-center shadow-2xl">
        {/* Status Header & Hanko Rank Stamp */}
        <div className="flex flex-col items-center justify-between gap-3 border-b border-[#2c251d] pb-3 sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#5a4b38] bg-[#241e17]">
              <PixelIcon name={result.victory ? 'icon_trophy' : 'icon_skull'} size={42} />
            </div>
            <div>
              <p className="font-mono text-[10px] font-black tracking-widest text-[#dfb15b]">
                {result.victory ? 'TIMECARD PUNCHED // 18:00' : 'WORKLOAD OVERFLOW // DOWN'}
              </p>
              <h2 className={`text-2xl font-black ${result.victory ? 'text-[#f2e9d8]' : 'text-[#e07054]'}`}>
                {result.victory ? '定時退社達成！！' : '過労により倒れた…'}
              </h2>
              <p className="text-xs text-[#9c8e78]">
                {STAGES[stageId]?.name} × {DIFFICULTIES[result.difficulty]?.name} （{formatTime(result.time)}勤務）
              </p>
            </div>
          </div>

          {/* Hanko Stamp Rank Badge */}
          <div className="flex flex-col items-center rounded-lg border-2 border-[#dfb15b] bg-[#2a2115] px-4 py-1.5">
            <span className="text-[10px] font-bold text-[#dfb15b]">人事査定</span>
            <span className="font-mono text-3xl font-black leading-none text-[#f2e9d8]">{rank}</span>
            <span className="mt-0.5 text-[9px] font-bold text-[#d8ccb8]">{rankLabelOf(rank)}</span>
          </div>
        </div>

        {/* 4 Key Metrics */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg border border-[#3b3328] bg-[#211c16] p-2">
            <p className="text-[10px] text-[#9c8e78]">最終スコア</p>
            <p className="font-mono text-base font-black text-[#dfb15b]">{result.score.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-[#3b3328] bg-[#211c16] p-2">
            <p className="text-[10px] text-[#9c8e78]">到達Lv</p>
            <p className="font-mono text-base font-black text-[#f2e9d8]">{result.level}</p>
          </div>
          <div className="rounded-lg border border-[#3b3328] bg-[#211c16] p-2">
            <p className="text-[10px] text-[#9c8e78]">処理業務数</p>
            <p className="font-mono text-base font-black text-[#f2e9d8]">{result.kills.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-[#3b3328] bg-[#211c16] p-2">
            <p className="text-[10px] text-[#9c8e78]">回収宝箱</p>
            <p className="font-mono text-base font-black text-[#f2e9d8]">{result.chests}</p>
          </div>
        </div>

        {/* Overtime Coins Deposited */}
        <div className="mt-2.5 flex items-center justify-center gap-2 rounded-lg border border-[#5a4b38] bg-[#241e17] py-2 text-xs font-black text-[#e4c989]">
          <PixelIcon name="coin" size={16} />
          <span>本日の残業代 +{result.coins.toLocaleString()} コインを給与口座へ振込完了</span>
        </div>

        {/* Final Loadout */}
        {weaponEntries.length > 0 && (
          <div className="mt-2.5 rounded-lg border border-[#3b3328] bg-[#211c16] p-2.5 text-left">
            <p className="mb-1.5 text-[10px] font-bold text-[#9c8e78]">最終武装構成</p>
            <div className="flex flex-wrap gap-1.5">
              {weaponEntries.map(([wId, lv]) => {
                const def = WEAPONS[wId as WeaponId];
                const evolved = isEvolvedWeapon(wId);
                const recipe = getRecipeByEvolvedId(wId);
                return (
                  <span
                    key={wId}
                    className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-bold ${
                      evolved
                        ? 'border-[#dfb15b] bg-[#362812] text-[#fde047]'
                        : 'border-[#3b3328] bg-[#181410] text-[#f2e9d8]'
                    }`}
                  >
                    <PixelIcon name={def?.icon ?? wId} size={15} />
                    <span>{def?.name ?? recipe?.name ?? wId}</span>
                    <span className="font-mono text-[10px]">{evolved ? '【極】' : `Lv.${lv}`}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Newly Unlocked Achievements */}
        {fresh.length > 0 && (
          <div className="mt-2.5 rounded-lg border border-[#dfb15b] bg-[#2a2115] p-2.5 text-left text-xs">
            <p className="flex items-center gap-1.5 font-black text-[#dfb15b]">
              <PixelIcon name="icon_trophy" size={16} />
              <span>新規社内実績を解除！（タイトルの「社内実績」タブで報酬受取）</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {fresh.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1 rounded bg-[#181410] px-2 py-1 text-[11px] font-bold text-[#f2e9d8]">
                  <PixelIcon name={a.icon} size={14} />
                  <span>{a.name}</span>
                  <span className="ml-1 inline-flex items-center gap-0.5 font-mono text-[#e4c989]">
                    <PixelIcon name="coin" size={11} />
                    <span>+{a.reward}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {onEndless && (
            <button
              type="button"
              onClick={onEndless}
              className="sm:col-span-2 min-h-[48px] w-full rounded-lg border-2 border-[#f2e9d8] bg-[#b23a2a] py-2.5 text-sm font-black text-[#f2e9d8] shadow-[2px_2px_0_#f2e9d8] transition hover:bg-[#c94331]"
            >
              サービス残業に突入する（エンドレスモード）
            </button>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[46px] w-full rounded-lg border border-[#f2e9d8] bg-[#b23a2a] py-2.5 text-sm font-black text-[#f2e9d8] transition hover:bg-[#c94331]"
          >
            同条件でもう一度出社
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="min-h-[46px] w-full rounded-lg border border-[#5a4b38] bg-[#241e17] py-2.5 text-sm font-black text-[#d8ccb8] transition hover:border-[#dfb15b] hover:text-[#f2e9d8]"
          >
            ロビー（タイトル）へ戻る
          </button>
        </div>

        {/* Mini Leaderboard */}
        {records.length > 0 && (
          <div className="mt-3 border-t border-[#2c251d] pt-2.5 text-left">
            <p className="mb-1 text-[11px] font-bold text-[#9c8e78]">■ 歴代ベスト3記録</p>
            <div className="space-y-1">
              {records.slice(0, 3).map((r, i) => (
                <div key={`${r.date}-${i}`} className="flex justify-between rounded bg-[#211c16] px-2.5 py-1 text-[11px]">
                  <span>
                    {i + 1}位 {r.victory ? '[定時退社] ' : ''}
                    {DIFFICULTIES[r.difficulty as Difficulty]?.name} ({formatTime(r.time)} / Lv{r.level})
                  </span>
                  <span className="font-mono font-bold text-[#f2e9d8]">{r.score.toLocaleString()}pt</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
