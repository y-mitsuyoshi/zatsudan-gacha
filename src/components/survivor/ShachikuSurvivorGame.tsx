'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SurvivorEngine, type HudSnapshot, type LevelUpData, type RunResult } from '@/game/survivor/engine';
import { SurvivorSound } from '@/game/survivor/audio';
import {
  loadSettings, saveSettings, loadRecords, saveRecord, loadProgress, saveProgress,
  type RecordEntry,
} from '@/game/survivor/storage';
import {
  DIFFICULTIES, DIFFICULTY_ORDER, META_UPGRADES, formatClock, formatTime,
  STAGES, STAGE_ORDER,
  type Difficulty, type StageId,
} from '@/game/survivor/config';
import {
  loadStats, applyRunToStats, encyEnemies, encyWeapons, encyCompletion,
  loadAch, checkAchievements, claimAchievement, ACHIEVEMENTS,
  earnedTitles, bestTitle,
  todayMissions, loadDaily, applyRunToDaily, claimMission,
  type SurvivorStats, type AchState, type DailyState,
} from '@/game/survivor/collection';
import { getPixelIconDataUrl } from '@/game/survivor/pixelSprites';
import { VirtualJoystick } from '@/game/common/virtualJoystick';

type Screen = 'title' | 'playing' | 'levelup' | 'paused' | 'result';
type TitleTab = 'play' | 'power' | 'dex' | 'ach' | 'daily';

const DEFAULT_HUD: HudSnapshot = {
  hp: 120, maxHp: 120, level: 1, xp: 0, xpNext: 8,
  time: 0, kills: 0, score: 0, coins: 0,
  weapons: [], passives: [],
  bossName: '', bossHp: 0, bossMax: 0, endless: false,
  dashCd: 0, dashMax: 2.5, xpBoostT: 0, coinBoostT: 0,
};

function rankOf(r: { victory: boolean; difficulty: string; time: number; level: number; kills: number }): string {
  if (r.victory && r.difficulty === 'hard') return 'S';
  if (r.victory) return 'A';
  if (r.time >= 420) return 'B';
  if (r.time >= 240) return 'C';
  return 'D';
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
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

  const currentPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const trailingPct = Math.max(0, Math.min(100, (trailingHp / maxHp) * 100));

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-amber-400/80 transition-all duration-75"
        style={{ width: `${trailingPct}%` }}
      />
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-100 ${
          currentPct > 35 ? 'bg-green-500' : 'bg-red-500'
        }`}
        style={{ width: `${currentPct}%` }}
      />
    </div>
  );
}

function DashSweepButton({ cd, max, onDash }: { cd: number; max: number; onDash: () => void }) {
  const ready = cd <= 0;
  const ratio = ready ? 0 : Math.min(1, cd / max);
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - ratio);

  return (
    <button
      type="button"
      onClick={onDash}
      disabled={!ready}
      aria-label="ダッシュ"
      className={`relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/70 shadow-lg backdrop-blur transition-transform active:scale-95 ${
        ready ? 'hover:border-cyan-400 cursor-pointer' : 'cursor-not-allowed opacity-75'
      }`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" />
        {ratio > 0 && (
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3.5"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="flex flex-col items-center justify-center z-10">
        <PixelIcon name="icon_dash" size={18} />
        <span className="text-[9px] font-black leading-none text-white mt-0.5">
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
  const bannerTimer = useRef<number | null>(null);

  const [screen, setScreen] = useState<Screen>('title');
  const changeScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreen(s);
  }, []);

  const [hud, setHud] = useState<HudSnapshot>(DEFAULT_HUD);
  const [levelData, setLevelData] = useState<LevelUpData | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [freshAch, setFreshAch] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ title: string; sub: string; key: number } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [stage, setStage] = useState<StageId>('honsha');
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<TitleTab>('play');

  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [bank, setBank] = useState(0);
  const [metaLv, setMetaLv] = useState<Record<string, number>>({ atk: 0, hp: 0, speed: 0, magnet: 0 });
  const [stats, setStats] = useState<SurvivorStats>({ runs: 0, wins: 0, totalKills: 0, totalTime: 0, totalGems: 0, totalChests: 0, totalCoins: 0, maxLevel: 1, maxScore: 0, bestTime: 0 });
  const [ach, setAch] = useState<AchState>({ unlocked: {}, claimed: {} });
  const [daily, setDaily] = useState<DailyState>({ date: '', progress: {}, claimed: {} });
  const [runMeta, setRunMeta] = useState<{ difficulty: Difficulty; stage: StageId }>({ difficulty: 'normal', stage: 'honsha' });

  useEffect(() => {
    const s = loadSettings();
    setMuted(s.muted);
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
    bannerTimer.current = window.setTimeout(() => setBanner(null), 2600);
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
    setRecords(saveRecord({ score: r.score, difficulty: d, time: r.time, level: r.level, kills: r.kills, victory: r.victory, date: Date.now() }));
    const p = loadProgress();
    p.coins += r.coins;
    p.runs += 1;
    if (r.victory) p.wins += 1;
    saveProgress(p);
    setBank(p.coins);
    setMetaLv({ ...(p.meta as unknown as Record<string, number>) });
    const s = applyRunToStats(r);
    setStats(s);
    applyRunToDaily(r);
    setDaily(loadDaily());
    const fresh = checkAchievements(s, r);
    setAch(loadAch());
    setFreshAch(fresh.map((a) => a.id));
    setResult(r);
    changeScreen('result');
  }, [changeScreen]);

  const startRun = useCallback((d: Difficulty, st: StageId = 'honsha') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    destroyEngine();
    if (!soundRef.current) soundRef.current = new SurvivorSound();
    const sound = soundRef.current;
    sound.setMuted(loadSettings().muted);
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

  useEffect(() => () => destroyEngine(), [destroyEngine]);

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
      if ((e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushMove]);

  // virtual joystick on touch
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const joystick = new VirtualJoystick({
      maxRadius: 46,
      deadzone: 0.08,
      floating: true,
      touchOnly: true,
    });
    joystick.attach(stage);
    joystick.attachDomOverlay(stage);
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
      joystickRef.current = null;
    };
  }, []);

  // auto-pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && screenRef.current === 'playing') pauseGame();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const chooseUpgrade = useCallback((id: string) => {
    const c = levelData?.choices.find((x) => `${x.kind}:${x.id}` === id);
    if (!c) return;
    // Engine re-emits onLevelUp when levels are chained, or fires onLevelClosed when done.
    engineRef.current?.applyUpgrade(c);
  }, [levelData]);

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

  return (
    <div className="flex min-h-dvh w-full flex-col items-center bg-[#0a0e1f] px-2 py-4 text-white">
      <div className="w-full max-w-[1000px]">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-black tracking-wide">
            <PixelIcon name="icon_building" size={20} />
            <span>社畜サバイバー</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs">
              <PixelIcon name="coin" size={14} />
              <span>{bank.toLocaleString()}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs">
              <PixelIcon name={title.icon} size={14} />
              <span>{title.name}</span>
            </span>
            <button onClick={toggleMute} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold" aria-label="ミュート切替">
              {muted ? '消音中' : '音声ON'}
            </button>
            {screen === 'playing' && (
              <button onClick={pauseGame} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold" aria-label="一時停止">
                PAUSE
              </button>
            )}
          </div>
        </div>

        {/* HUD */}
        {(screen === 'playing' || screen === 'paused' || screen === 'levelup') && (
          <div className="mb-2 rounded-xl bg-white/5 p-2 text-xs">
            <div className="mb-1 flex items-center justify-between font-bold">
              <span className="inline-flex items-center gap-1.5">
                <PixelIcon name="icon_clock" size={14} />
                <span>{formatClock(hud.time)} {hud.endless ? '[残業中]' : `/ 18:00`}</span>
              </span>
              <span className="text-yellow-300">SCORE {hud.score.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1 text-amber-300">
                <PixelIcon name="coin" size={14} />
                <span>{hud.coins}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <PixelIcon name="icon_sword" size={14} />
                <span>{hud.kills}</span>
              </span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 w-16 shrink-0 font-bold">
                <PixelIcon name="icon_heart" size={14} />
                <span>HP</span>
              </span>
              <TwoStageHpBar hp={hud.hp} maxHp={hud.maxHp} />
              <span className="w-16 shrink-0 text-right">{hud.hp}/{hud.maxHp}</span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 w-16 shrink-0 font-bold">
                <PixelIcon name="icon_power" size={14} />
                <span>Lv{hud.level}</span>
              </span>
              <Bar value={hud.xp} max={hud.xpNext} className="bg-cyan-400" />
            </div>
            {(hud.xpBoostT > 0 || hud.coinBoostT > 0) && (
              <div className="mb-1 flex gap-1 text-[11px] font-bold">
                {hud.xpBoostT > 0 && <span className="rounded bg-green-600/60 px-1.5 py-0.5">[査定中] {Math.ceil(hud.xpBoostT)}s</span>}
                {hud.coinBoostT > 0 && <span className="rounded bg-yellow-600/60 px-1.5 py-0.5">[割増中] {Math.ceil(hud.coinBoostT)}s</span>}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1">
              {hud.weapons.map((w) => (
                <span key={w.id} title={`Lv${w.lv}`} className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5">
                  <PixelIcon name={w.icon} size={15} />
                  <span className="text-[10px] font-bold">Lv{w.lv}</span>
                </span>
              ))}
              <span className="mx-1 text-gray-500">|</span>
              {hud.passives.map((p) => (
                <span key={p.id} title={`Lv${p.lv}`} className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5">
                  <PixelIcon name={p.icon} size={15} />
                  <span className="text-[10px] font-bold">Lv{p.lv}</span>
                </span>
              ))}
            </div>
            {hud.bossMax > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <span className="w-24 shrink-0 truncate font-bold text-red-300 flex items-center gap-1">
                  <PixelIcon name="icon_skull" size={14} />
                  <span>{hud.bossName}</span>
                </span>
                <Bar value={hud.bossHp} max={hud.bossMax} className="bg-red-500" />
              </div>
            )}
          </div>
        )}

        {/* stage */}
        <div
          ref={stageRef}
          className="relative overflow-hidden rounded-xl border border-white/15"
          style={{ aspectRatio: '8 / 5' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="h-full w-full touch-none select-none" width={960} height={600} />

          {banner && screen === 'playing' && (
            <div key={banner.key} className="pointer-events-none absolute inset-x-4 top-14 rounded-xl bg-black/70 p-3 text-center">
              <p className="text-base font-black text-yellow-300">{banner.title}</p>
              <p className="text-xs text-gray-200">{banner.sub}</p>
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
              onChoose={chooseUpgrade}
              onReroll={() => engineRef.current?.rerollChoices()}
              onBanish={(i) => engineRef.current?.banishChoice(i)}
            />
          )}

          {screen === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4">
              <p className="text-2xl font-black">一時休憩中</p>
              <p className="text-xs text-gray-300">WASD/矢印キー or ドラッグ/仮想パッドで移動（自動攻撃）・Shift/スペース/ボタンでダッシュ</p>
              <div className="flex max-w-[420px] flex-wrap items-center justify-center gap-1">
                {hud.weapons.map((w) => (
                  <span key={w.id} className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs font-bold">
                    <PixelIcon name={w.icon} size={16} />
                    <span>Lv{w.lv}</span>
                  </span>
                ))}
                <span className="mx-1 text-gray-500">|</span>
                {hud.passives.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs font-bold">
                    <PixelIcon name={p.icon} size={16} />
                    <span>Lv{p.lv}</span>
                  </span>
                ))}
              </div>
              <button onClick={resumeGame} className="rounded-xl bg-green-600 px-8 py-3 font-bold">業務再開</button>
              <button onClick={quitToTitle} className="rounded-xl bg-white/15 px-8 py-3 font-bold">タイトルに戻る</button>
            </div>
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
              freshAch={freshAch}
              records={records}
              onRetry={() => startRun(runMeta.difficulty, runMeta.stage)}
              onEndless={result.victory ? goEndless : undefined}
              onTitle={quitToTitle}
            />
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          WASD/矢印キー or ドラッグ/仮想パッドで移動・攻撃は全自動・やる気を集めてレベルアップ・18時まで生き残れ！
        </p>
      </div>
    </div>
  );
}

/* ---------------- title ---------------- */

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
  const { tab, setTab } = props;
  const tabs: { id: TitleTab; label: string; icon: string }[] = [
    { id: 'play', label: '出社', icon: 'icon_building' },
    { id: 'power', label: '強化', icon: 'icon_power' },
    { id: 'dex', label: '図鑑', icon: 'icon_book' },
    { id: 'ach', label: '実績', icon: 'icon_trophy' },
    { id: 'daily', label: '日課', icon: 'icon_calendar' },
  ];
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-black/90 via-black/85 to-black/95 p-4">
      <div className="relative mb-3 overflow-hidden rounded-xl border border-yellow-500/40 shadow-lg shadow-yellow-950/50">
        <img
          src="/assets/survivor_cover.jpg"
          alt="Salaryman Survivors"
          className="h-32 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-2.5">
          <p className="text-[10px] font-black tracking-widest text-amber-400 font-mono">16-BIT RETRO SURVIVORS</p>
          <h2 className="text-lg font-black text-yellow-300 drop-shadow-md">社畜サバイバー</h2>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-gray-300">
        迫りくる業務から逃げ切れ！9:00→18:00の10分サバイバル・武器8種・パッシブ6種・ボス4体
      </p>

      <div className="mx-auto mt-3 flex max-w-[560px] gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-bold ${tab === t.id ? 'bg-yellow-500 text-black' : 'bg-white/10'}`}
          >
            <PixelIcon name={t.icon} size={14} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mx-auto mt-3 max-w-[560px]">
        {tab === 'play' && <PlayTab {...props} />}
        {tab === 'power' && <PowerTab bank={props.bank} metaLv={props.metaLv} onBuyMeta={props.onBuyMeta} />}
        {tab === 'dex' && <DexTab />}
        {tab === 'ach' && <AchTab ach={props.ach} onClaim={props.onClaimAch} />}
        {tab === 'daily' && <DailyTab daily={props.daily} missions={props.missions} onClaim={props.onClaimDaily} />}
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
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-gray-300">■ 勤務フロア（ステージ）</p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {STAGE_ORDER.map((s) => {
          const def = STAGES[s];
          const locked = stats.wins < def.unlockAtWins;
          return (
            <button
              key={s}
              disabled={locked}
              onClick={() => setStage(s)}
              className={`rounded-xl border p-2 text-left ${stage === s ? 'border-cyan-300 bg-cyan-300/15' : 'border-white/15 bg-white/5'} ${locked ? 'opacity-40' : ''}`}
            >
              <p className="text-xs font-bold">{locked ? '[施錠] ' : ''}{def.name}</p>
              <p className="text-[10px] text-gray-400">{def.desc}</p>
            </button>
          );
        })}
      </div>
      <p className="mb-1 text-xs font-bold text-gray-300">■ 本日のブラック度</p>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((d) => {
          const def = DIFFICULTIES[d];
          return (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border p-2 text-center ${difficulty === d ? 'border-yellow-300 bg-yellow-300/15' : 'border-white/15 bg-white/5'}`}
            >
              <p className="flex items-center justify-center gap-1.5 text-sm font-bold">
                <PixelIcon name={def.icon} size={16} />
                <span>{def.name}</span>
              </p>
              <p className="text-[10px] text-gray-400">{def.desc}</p>
              <p className="text-[10px] text-gray-400">×{def.scoreMul}</p>
            </button>
          );
        })}
      </div>
      <button onClick={onStart} className="mt-3 w-full rounded-xl bg-red-600 py-3 text-lg font-black shadow-lg">
        出社する（10分勤務）
      </button>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-white/5 p-2"><p className="text-gray-400">出社</p><p className="text-base font-black">{stats.runs}</p></div>
        <div className="rounded-lg bg-white/5 p-2"><p className="text-gray-400">定時退社</p><p className="text-base font-black">{stats.wins}</p></div>
        <div className="rounded-lg bg-white/5 p-2"><p className="text-gray-400">撃破</p><p className="text-base font-black">{stats.totalKills.toLocaleString()}</p></div>
        <div className="rounded-lg bg-white/5 p-2"><p className="text-gray-400">最高Lv</p><p className="text-base font-black">{stats.maxLevel}</p></div>
      </div>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-300">
        <PixelIcon name={titles[titles.length - 1]?.icon ?? 'player'} size={14} />
        <span>{titles[titles.length - 1]?.name} ／ 業務図鑑 {comp.enemies}/{comp.enemiesTotal}・武器図鑑 {comp.weapons}/{comp.weaponsTotal}</span>
      </p>
      {records.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-bold text-gray-300">■ 最高記録</p>
          {records.slice(0, 3).map((r, i) => (
            <div key={`${r.date}-${i}`} className="mb-1 flex justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
              <span>{i + 1}位 {r.victory ? '[退社] ' : ''}{DIFFICULTIES[r.difficulty as Difficulty]?.name} {formatTime(r.time)} Lv{r.level}</span>
              <span className="font-bold text-yellow-300">{r.score.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 rounded-xl bg-white/10 p-3 text-[11px] leading-relaxed">
        <p><b>操作</b>: WASD/矢印 or ドラッグ/仮想パッドで移動。攻撃は全自動。Shift/スペース/ボタンでダッシュ！</p>
        <p>やる気を集めてレベルアップ！3択から武器・パッシブを選べ。</p>
        <p>課長→役員→専務→社長が襲来。宝箱・差し入れも活用！</p>
        <p className="mt-1 text-gray-400">※登場する会社・人物はすべてフィクションのオリジナル作品です</p>
      </div>
    </div>
  );
}

function PowerTab(props: { bank: number; metaLv: Record<string, number>; onBuyMeta: (id: string) => void }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs text-gray-300">
        <span>所持</span>
        <PixelIcon name="coin" size={13} />
        <span>{props.bank}（出社で稼いだ残業代で恒久強化！）</span>
      </p>
      <div className="space-y-2">
        {META_UPGRADES.map((m) => {
          const lv = props.metaLv[m.id] ?? 0;
          const maxed = lv >= m.maxLv;
          const cost = m.cost(lv);
          return (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 p-2">
              <div className="text-xs">
                <p className="flex items-center gap-1.5 font-bold">
                  <PixelIcon name={m.icon} size={16} />
                  <span>{m.name} Lv{lv}/{m.maxLv}</span>
                </p>
                <p className="text-gray-300">{m.desc}</p>
              </div>
              <button
                disabled={maxed || props.bank < cost}
                onClick={() => props.onBuyMeta(m.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${!maxed && props.bank >= cost ? 'bg-green-600' : 'bg-white/10 opacity-50'}`}
              >
                {maxed ? 'MAX' : (
                  <span className="inline-flex items-center gap-1">
                    <PixelIcon name="coin" size={12} />
                    <span>{cost}</span>
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
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-gray-300">■ 業務図鑑（倒した敵が登録される）</p>
      <div className="grid grid-cols-3 gap-1.5">
        {enemies.map((e) => (
          <div key={e.kind} className={`rounded-lg p-2 text-center text-[11px] ${e.found ? 'bg-white/10' : 'bg-white/5 opacity-50'}`}>
            <div className="flex justify-center my-1">
              {e.found ? <PixelIcon name={e.kind} size={32} /> : <span className="text-xl font-bold">?</span>}
            </div>
            <p className="font-bold">{e.found ? e.name : '？？？'}</p>
            <p className="text-gray-400">{e.kills}体</p>
          </div>
        ))}
      </div>
      <p className="mb-1 mt-3 text-xs font-bold text-gray-300">■ 武器図鑑（使った武器が登録される）</p>
      <div className="grid grid-cols-2 gap-1.5">
        {weapons.map((w) => (
          <div key={w.id} className={`rounded-lg p-2 text-[11px] ${w.found ? 'bg-white/10' : 'bg-white/5 opacity-50'}`}>
            <p className="flex items-center gap-1.5 font-bold">
              {w.found ? <><PixelIcon name={w.id} size={18} /> <span>{w.name}</span></> : '? ？？？'}
            </p>
            <p className="text-gray-400">{w.found ? w.desc : '未入手'}</p>
            <p className="text-gray-400">最高Lv: {w.maxLv}</p>
          </div>
        ))}
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
          <div key={a.id} className={`flex items-center justify-between gap-2 rounded-lg p-2 text-xs ${un ? 'bg-white/10' : 'bg-white/5 opacity-60'}`}>
            <div>
              <p className="flex items-center gap-1.5 font-bold">
                <PixelIcon name={a.icon} size={18} />
                <span>{a.name}</span>
              </p>
              <p className="text-gray-400">{a.desc}</p>
            </div>
            {cl ? (
              <span className="shrink-0 text-gray-400">受取済</span>
            ) : un ? (
              <button
                onClick={() => props.onClaim(a.id)}
                className="shrink-0 flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-1.5 font-bold text-black"
              >
                <PixelIcon name="coin" size={12} />
                <span>{a.reward}受取</span>
              </button>
            ) : (
              <span className="shrink-0 text-gray-500">[未達成]</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DailyTab(props: {
  daily: DailyState;
  missions: { id: string; name: string; icon: string; desc: string; target: number; reward: number }[];
  onClaim: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-gray-300">毎日0時に更新！出社して達成しよう。</p>
      {props.missions.map((m) => {
        const prog = Math.min(m.target, props.daily.progress[m.id] ?? 0);
        const done = prog >= m.target;
        const cl = props.daily.claimed[m.id] === true;
        return (
          <div key={m.id} className="rounded-lg bg-white/10 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-bold">
                <PixelIcon name={m.icon} size={18} />
                <span>{m.name}</span>
              </p>
              {cl ? (
                <span className="text-gray-400">受取済</span>
              ) : done ? (
                <button
                  onClick={() => props.onClaim(m.id)}
                  className="rounded-lg bg-yellow-500 px-3 py-1.5 font-bold text-black flex items-center gap-1"
                >
                  <PixelIcon name="coin" size={12} />
                  <span>{m.reward}受取</span>
                </button>
              ) : (
                <span className="text-gray-300">{prog}/{m.target}</span>
              )}
            </div>
            <p className="text-gray-400">{m.desc}</p>
            <Bar value={prog} max={m.target} className="bg-amber-400" />
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- level up ---------------- */

function LevelUpOverlay(props: {
  data: LevelUpData;
  onChoose: (key: string) => void;
  onReroll: () => void;
  onBanish: (index: number) => void;
}) {
  const { data } = props;
  const [banishMode, setBanishMode] = useState(false);
  return (
    <div className="absolute inset-0 overflow-y-auto bg-black/85 p-4">
      <h2 className="flex items-center justify-center gap-2 text-center text-xl font-black text-cyan-300">
        <PixelIcon name="icon_level_up" size={24} />
        <span>LEVEL {data.level} UP！</span>
      </h2>
      <p className="mt-1 text-center text-xs text-gray-300">1つ選べ{banishMode ? '（封印したい項目をタップ）' : ''}</p>
      <div className="mx-auto mt-3 grid max-w-[560px] grid-cols-1 gap-2 sm:grid-cols-3">
        {data.choices.map((c, i) => (
          <button
            key={`${c.kind}:${c.id}`}
            onClick={() => {
              if (banishMode) {
                props.onBanish(i);
                setBanishMode(false);
              } else {
                props.onChoose(`${c.kind}:${c.id}`);
              }
            }}
            className={`rounded-xl border p-3 text-left ${banishMode ? 'border-red-400 bg-red-400/10' : 'border-cyan-300/50 bg-white/10 hover:bg-white/20'}`}
          >
            <div className="flex justify-center my-1">
              <PixelIcon name={c.icon} size={36} />
            </div>
            <p className="mt-1 text-sm font-black">
              {c.name}
              {c.isNew ? <span className="ml-1 rounded bg-green-600 px-1 text-[10px]">NEW</span> : c.toLv > 0 ? <span className="ml-1 text-xs text-cyan-300">Lv{c.toLv}</span> : null}
            </p>
            <p className="mt-1 text-[11px] text-gray-300">{c.desc}</p>
          </button>
        ))}
      </div>
      <div className="mx-auto mt-3 flex max-w-[560px] gap-2">
        {data.canReroll && !banishMode && (
          <button onClick={props.onReroll} className="flex-1 rounded-xl bg-white/15 py-2 text-xs font-bold">引き直す（残1）</button>
        )}
        {data.canBanish && (
          <button onClick={() => setBanishMode(!banishMode)} className={`flex-1 rounded-xl py-2 text-xs font-bold ${banishMode ? 'bg-red-600' : 'bg-white/15'}`}>
            {banishMode ? 'キャンセル' : '封印する（残1）'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- result ---------------- */

function ResultOverlay(props: {
  result: RunResult; freshAch: string[]; records: RecordEntry[];
  onRetry: () => void; onEndless?: () => void; onTitle: () => void;
}) {
  const { result, freshAch, records, onRetry, onEndless, onTitle } = props;
  const fresh = ACHIEVEMENTS.filter((a) => freshAch.includes(a.id));
  return (
    <div className="absolute inset-0 overflow-y-auto bg-black/85 p-4 text-center">
      <div className="flex justify-center my-2">
        <PixelIcon name={result.victory ? 'icon_trophy' : 'icon_skull'} size={48} />
      </div>
      <h2 className={`mt-1 text-2xl font-black ${result.victory ? 'text-yellow-300' : 'text-red-400'}`}>
        {result.victory ? '定時退社！！' : '過労死…'}
      </h2>
      <p className="mx-auto mt-2 inline-block rounded-xl border-2 border-yellow-300 px-4 py-1 text-3xl font-black text-yellow-300">
        {rankOf(result)}ランク
      </p>
      <p className="text-xs text-gray-300">{DIFFICULTIES[result.difficulty]?.name} × {formatTime(result.time)}勤務</p>
      <div className="mx-auto mt-3 grid max-w-[340px] grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">スコア</p><p className="text-lg font-black text-yellow-300">{result.score.toLocaleString()}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">レベル</p><p className="text-lg font-black">{result.level}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">撃破数</p><p className="text-lg font-black">{result.kills.toLocaleString()}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">宝箱</p><p className="text-lg font-black">{result.chests}</p></div>
      </div>
      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-300">
        <PixelIcon name="coin" size={14} />
        <span>{result.coins} を残業代に加算</span>
      </p>
      {fresh.length > 0 && (
        <div className="mx-auto mt-2 max-w-[340px] rounded-xl bg-yellow-500/15 p-2 text-left text-xs">
          <p className="flex items-center gap-1.5 font-bold text-yellow-300">
            <PixelIcon name="icon_trophy" size={16} />
            <span>実績解除！（実績タブで受取）</span>
          </p>
          {fresh.map((a) => (
            <p key={a.id} className="flex items-center gap-1 mt-0.5">
              <PixelIcon name={a.icon} size={14} />
              <span>{a.name}</span>
              <span className="text-gray-300 flex items-center gap-0.5 ml-1">
                <PixelIcon name="coin" size={12} />
                <span>{a.reward}</span>
              </span>
            </p>
          ))}
        </div>
      )}
      <div className="mx-auto mt-3 max-w-[340px] space-y-2">
        {onEndless && (
          <button onClick={onEndless} className="w-full rounded-xl bg-purple-600 py-3 font-black">残業する（エンドレス）</button>
        )}
        <button onClick={onRetry} className="w-full rounded-xl bg-red-600 py-3 font-black">もう一度出社</button>
        <button onClick={onTitle} className="w-full rounded-xl bg-white/15 py-3 font-black">タイトルに戻る</button>
      </div>
      {records.length > 0 && (
        <div className="mx-auto mt-3 max-w-[340px] text-left">
          <p className="mb-1 text-xs font-bold text-gray-300">■ 最高記録</p>
          {records.slice(0, 3).map((r, i) => (
            <div key={`${r.date}-${i}`} className="mb-1 flex justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
              <span>{i + 1}位 {r.victory ? '[退社] ' : ''}{formatTime(r.time)} Lv{r.level}</span>
              <span className="font-bold text-yellow-300">{r.score.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
