'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DanmakuEngine,
  type EngineBannerKind,
  type HudSnapshot,
} from '@/game/danmaku/engine';
import { BOSS_PHASE_THRESH, type RunResult } from '@/game/danmaku/sim';
import { copyToClipboard } from '@/lib/clipboard';
import {
  WEAPONS,
  DIFFICULTIES,
  STAGES,
  difficultyDef,
  titleForStage,
  type Difficulty,
  type WeaponId,
} from '@/game/danmaku/config';
import {
  loadSettings,
  saveSettings,
  loadScores,
  saveScore,
  loadContinue,
  clearContinue,
  type ScoreEntry,
} from '@/game/shmup/storage';
import { shmupSound } from '@/game/shmup/audio';
import { AudioToggle, useBgm } from './AudioToggle';
import type { BgmTrackId } from '@/game/common/bgmTracks';

type Screen = 'title' | 'playing' | 'paused' | 'result';

interface BannerState {
  title: string;
  sub?: string;
  kind: EngineBannerKind;
  spell?: boolean;
  captured?: boolean;
  bonus?: number;
}

const DEFAULT_HUD: HudSnapshot = {
  score: 0,
  chain: 0,
  chainT: 0,
  maxChain: 0,
  stage: 1,
  loop: 0,
  phase: 'fly',
  lives: 3,
  bombs: 3,
  power: 1,
  weapon: 'rensa',
  difficulty: 'normal',
  hyper: 0,
  hyperActive: false,
  hyperTimer: 0,
  bossActive: false,
  bossHp: 0,
  bossMax: 1,
  bossName: '',
  bossPhase: 0,
  bossPhasesLeft: 2,
  bossSpellName: null,
  bossSpellSub: null,
  bossSpellClean: true,
  bossSpellBonus: 0,
  collectLineActive: false,
  kills: 0,
  graze: 0,
  misses: 0,
  spellsCaptured: 0,
  fps: 60,
  pb: 0,
  eb: 0,
};

const WEAPON_META: Record<
  WeaponId,
  { code: string; shortCode: string; role: string; pwr: number; rng: number; spd: number; color: string }
> = {
  rensa: {
    code: 'WPN-01 // VULCAN',
    shortCode: 'WPN-01 VULCAN',
    role: '集中速射・対ボス特化',
    pwr: 4,
    rng: 2,
    spd: 5,
    color: '#f5b642',
  },
  kakusan: {
    code: 'WPN-02 // WIDE FAN',
    shortCode: 'WPN-02 WIDE FAN',
    role: '5方向広角・道中制圧',
    pwr: 3,
    rng: 5,
    spd: 4,
    color: '#38bdf8',
  },
  tsuibi: {
    code: 'WPN-03 // HOMING',
    shortCode: 'WPN-03 HOMING',
    role: '自動追尾・回避専念',
    pwr: 3,
    rng: 4,
    spd: 3,
    color: '#c084fc',
  },
  laser: {
    code: 'WPN-04 // RAIL LASER',
    shortCode: 'WPN-04 RAIL LASER',
    role: '高威力貫通・一列粉砕',
    pwr: 5,
    rng: 2,
    spd: 4,
    color: '#34d399',
  },
};

const DIFF_META: Record<
  Difficulty,
  { density: string; hyperRate: string; badgeColor: string }
> = {
  easy: {
    density: '弾幕密度: LOW (-18%)',
    hyperRate: '覚醒効率: HIGH',
    badgeColor: '#34d399',
  },
  normal: {
    density: '弾幕密度: STANDARD',
    hyperRate: '覚醒効率: NORMAL',
    badgeColor: '#38bdf8',
  },
  hard: {
    density: '弾幕密度: EXTREME (+16%)',
    hyperRate: '覚醒効率: OVERDRIVE',
    badgeColor: '#f43f5e',
  },
};

function WeaponDiagram({ id, active }: { id: WeaponId; active: boolean }) {
  const stroke = active ? '#fde047' : '#64748b';
  const accent = WEAPON_META[id].color;
  return (
    <svg
      viewBox="0 0 64 52"
      className="h-12 w-15 shrink-0 rounded border border-slate-700/80 bg-[#060911]"
      aria-hidden
    >
      <line x1="32" y1="0" x2="32" y2="52" stroke="#1e293b" strokeWidth="1" />
      <line x1="0" y1="38" x2="64" y2="38" stroke="#1e293b" strokeWidth="1" />
      {id === 'rensa' && (
        <g stroke={accent} strokeWidth="2.2" strokeLinecap="round">
          <line x1="27" y1="34" x2="27" y2="5" />
          <line x1="37" y1="34" x2="37" y2="5" />
          <line x1="20" y1="36" x2="18" y2="11" strokeOpacity="0.65" strokeWidth="1.5" />
          <line x1="44" y1="36" x2="46" y2="11" strokeOpacity="0.65" strokeWidth="1.5" />
        </g>
      )}
      {id === 'kakusan' && (
        <g stroke={accent} strokeWidth="2" strokeLinecap="round">
          <line x1="32" y1="35" x2="32" y2="5" />
          <line x1="32" y1="35" x2="19" y2="7" />
          <line x1="32" y1="35" x2="45" y2="7" />
          <line x1="32" y1="35" x2="7" y2="13" strokeOpacity="0.7" />
          <line x1="32" y1="35" x2="57" y2="13" strokeOpacity="0.7" />
        </g>
      )}
      {id === 'tsuibi' && (
        <g fill="none" stroke={accent} strokeWidth="1.9" strokeLinecap="round">
          <path d="M24 36 C12 26, 16 14, 30 9" />
          <path d="M40 36 C52 26, 48 14, 34 9" />
          <circle cx="32" cy="9" r="3.5" stroke="#fde047" strokeWidth="1.4" />
        </g>
      )}
      {id === 'laser' && (
        <g>
          <rect x="23" y="4" width="5" height="32" fill={accent} fillOpacity="0.85" />
          <rect x="36" y="4" width="5" height="32" fill={accent} fillOpacity="0.85" />
          <rect x="24.5" y="4" width="2" height="32" fill="#ffffff" />
          <rect x="37.5" y="4" width="2" height="32" fill="#ffffff" />
        </g>
      )}
      <polygon points="32,32 24,46 32,42 40,46" fill={stroke} />
      <circle cx="17" cy="42" r="2" fill={accent} />
      <circle cx="47" cy="42" r="2" fill={accent} />
    </svg>
  );
}

function ShipLifeIcons({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`残機${n}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const on = i < n;
        return (
          <svg
            key={i}
            viewBox="0 0 16 16"
            className={`h-3.5 w-3.5 ${on ? 'text-amber-300 drop-shadow-[0_0_4px_rgba(252,211,77,0.7)]' : 'text-white/15'}`}
            fill="currentColor"
            aria-hidden
          >
            <polygon points="8,1 2,14 8,11 14,14" />
          </svg>
        );
      })}
    </span>
  );
}

function BombIcons({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`ボム${n}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const on = i < n;
        return (
          <svg
            key={i}
            viewBox="0 0 16 16"
            className={`h-3.5 w-3.5 ${on ? 'text-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.7)]' : 'text-white/15'}`}
            fill="currentColor"
            aria-hidden
          >
            <polygon points="8,1 14,8 8,15 2,8" />
          </svg>
        );
      })}
    </span>
  );
}

function StatDots({ value, color = '#38bdf8' }: { value: number; color?: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-2.5"
          style={{
            backgroundColor: i <= value ? color : '#1e293b',
          }}
        />
      ))}
    </span>
  );
}

export default function DanmakuGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DanmakuEngine | null>(null);
  const runId = useRef(0);
  const bannerTimer = useRef<number | null>(null);

  const [screen, setScreenState] = useState<Screen>('title');
  const screenRef = useRef<Screen>('title');
  const setScreen = useCallback((s: Screen | ((prev: Screen) => Screen)) => {
    setScreenState((prev) => {
      const next = typeof s === 'function' ? (s as (prev: Screen) => Screen)(prev) : s;
      screenRef.current = next;
      return next;
    });
  }, []);

  const [hud, setHud] = useState<HudSnapshot>(DEFAULT_HUD);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [weapon, setWeapon] = useState<WeaponId>('rensa');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [shake, setShake] = useState(() => loadSettings().shake);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [continueSave, setContinueSave] = useState(() => loadContinue());
  const [showHelp, setShowHelp] = useState(false);
  const [shared, setShared] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  // BGM selection: title/result -> shachiku-menu, boss/warn -> danmaku-boss, stage -> danmaku-stage
  const bgmTrack: BgmTrackId | null =
    screen === 'title' || screen === 'result'
      ? 'shachiku-menu'
      : hud.bossActive || hud.phase === 'boss' || hud.phase === 'warn'
        ? 'danmaku-boss'
        : 'danmaku-stage';
  useBgm(bgmTrack, screen === 'paused');

  const destroyEngine = useCallback(() => {
    runId.current++;
    if (bannerTimer.current !== null) {
      window.clearTimeout(bannerTimer.current);
      bannerTimer.current = null;
    }
    engineRef.current?.destroy();
    engineRef.current = null;
  }, []);

  useEffect(() => destroyEngine, [destroyEngine]);

  const showBanner = useCallback(
    (b: BannerState) => {
      setBanner(b);
      if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
      const dur =
        b.kind === 'spellResult' ? 1900 : b.kind === 'spell' ? 2300 : b.kind === 'warn' ? 2300 : 2500;
      bannerTimer.current = window.setTimeout(() => setBanner(null), dur);
    },
    [],
  );

  const startRun = useCallback(
    (opts?: {
      stage?: number;
      score?: number;
      power?: number;
      lives?: number;
      weapon?: WeaponId;
      difficulty?: Difficulty;
    }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      shmupSound.unlock();
      destroyEngine();
      const id = ++runId.current;
      const runWeapon = opts?.weapon ?? weapon;
      const runDifficulty = opts?.difficulty ?? difficulty;
      const startSt = opts?.stage ?? selectedStage;
      const startPwr = opts?.power ?? (startSt > 1 ? Math.min(5, startSt) : 1);
      setResult(null);
      setShared(false);
      setFatal(null);
      setBanner(null);
      setHud({
        ...DEFAULT_HUD,
        weapon: runWeapon,
        difficulty: runDifficulty,
        score: opts?.score ?? 0,
        stage: startSt,
        power: startPwr,
        lives: opts?.lives ?? 3,
      });
      const engine = new DanmakuEngine({
        canvas,
        weapon: runWeapon,
        difficulty: runDifficulty,
        power: startPwr,
        stage: startSt,
        score: opts?.score ?? 0,
        lives: opts?.lives ?? 3,
        shake,
        onEvent: (e) => {
          if (id !== runId.current) return;
          if (e.type === 'hud') {
            setHud(e.hud);
          } else if (e.type === 'banner') {
            showBanner({
              title: e.title,
              sub: e.sub,
              kind: e.kind ?? (e.spell ? 'spell' : 'stage'),
              spell: e.spell,
              captured: e.captured,
              bonus: e.bonus,
            });
          } else if (e.type === 'gameover') {
            setScores(
              saveScore({
                score: e.result.score,
                stage: e.result.stage,
                rank: e.result.rank,
                date: Date.now(),
              }),
            );
            setContinueSave(loadContinue());
            setResult(e.result);
            setScreen('result');
          } else if (e.type === 'autopause') {
            setScreen((s) => (s === 'playing' ? 'paused' : s));
          } else if (e.type === 'error') {
            setFatal(e.message);
            setScreen('paused');
          }
        },
      });
      engineRef.current = engine;
      engine.start();
      setScreen('playing');
    },
    [destroyEngine, weapon, difficulty, selectedStage, shake, showBanner, setScreen],
  );

  const handlePauseKey = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    shmupSound.ui();
    if (eng.isPaused) {
      eng.setPaused(false);
      setScreen('playing');
    } else {
      eng.setPaused(true);
      setScreen('paused');
    }
  }, [setScreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        const s = screenRef.current;
        if (s === 'playing' || s === 'paused') handlePauseKey();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePauseKey]);

  const toggleShake = useCallback(() => {
    shmupSound.ui();
    setShake((v) => {
      const next = !v;
      saveSettings({ muted: false, shake: next });
      engineRef.current?.setShake(next);
      return next;
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!result) return;
    shmupSound.ui();
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://zatsudan-gacha.app/shachiku-shooting';
    const text = `社畜シューティングNEO [${difficultyDef(result.difficulty).name}]: Stage ${result.stage} / ${result.score.toLocaleString()} PTS / スペル取得${result.spells} / 称号「${result.rank}」 #社畜シューティング ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '社畜シューティングNEO', text });
      } else {
        await copyToClipboard(text);
        setShared(true);
      }
    } catch {
      /* user cancelled */
    }
  }, [result]);

  const canvasCursor = screen === 'playing' ? 'cursor-none' : '';
  const chainMult =
    (1 + Math.min(hud.chain, 150) * 0.01) *
    difficultyDef(hud.difficulty).score *
    (hud.hyperActive ? 2 : 1);
  const activeWeaponDef = WEAPONS.find((w) => w.id === hud.weapon) ?? WEAPONS[0]!;
  const highScore = Math.max(hud.score, scores[0]?.score ?? 0);
  const hyperReady = hud.hyper >= 100 && !hud.hyperActive;
  const curStageDef = STAGES[(hud.stage - 1) % STAGES.length] ?? STAGES[0]!;

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#050811] text-slate-100 select-none">
      {/* Cyber-Arcade Cabinet Ambient Backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, #0f1b33 0%, #070d1a 55%, #03050a 100%)',
        }}
      />
      {/* Subtle CRT scanline & vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)',
          boxShadow: 'inset 0 0 150px 32px rgba(0,0,0,0.9)',
        }}
      />

      <div className="relative h-full w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 block h-full w-full touch-none select-none ${canvasCursor}`}
        />

        {/* Fatal WebGL error fallback */}
        {fatal && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#050811]/95 p-6 text-center">
            <div className="border border-rose-500 bg-rose-950/80 px-4 py-1 font-mono text-xs tracking-widest text-rose-300">
              SYSTEM FAULT // RENDERER HALTED
            </div>
            <div className="text-2xl font-black text-rose-400">システム障害が発生しました</div>
            <div className="max-w-sm break-all border border-slate-700 bg-slate-900/90 p-3 font-mono text-xs text-slate-300">
              {fatal}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-12 border border-cyan-300 bg-rose-600 px-8 py-3 font-black tracking-wider text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] hover:bg-rose-500"
            >
              システム再起動
            </button>
          </div>
        )}

        {/* ==================== DESKTOP WIDESCREEN ARCADE CABINET BEZELS ==================== */}
        {(screen === 'playing' || screen === 'paused') && (
          <>
            {/* LEFT TELEMETRY BEZEL (Desktop) */}
            <aside className="pointer-events-none absolute inset-y-4 left-4 hidden w-64 flex-col justify-between xl:w-72 lg:flex">
              <div className="space-y-3">
                {/* Mission & Stage Header Card */}
                <div className="border border-cyan-500/35 bg-[#070d19]/90 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.75)] backdrop-blur-sm">
                  <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-cyan-400">
                    <span>SYS // TELEMETRY-L</span>
                    <span>[{difficultyDef(hud.difficulty).name}]</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="bg-amber-400 px-2 py-0.5 font-mono text-xs font-black text-slate-950">
                      STAGE {String(hud.stage).padStart(2, '0')}
                    </span>
                    {hud.loop > 0 && (
                      <span className="border border-rose-500 bg-rose-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                        LOOP {hud.loop + 1}
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-amber-300">
                      役職: {titleForStage(hud.stage)}
                    </span>
                  </div>
                  <div className="mt-1.5 truncate text-sm font-black text-white">
                    {curStageDef.name}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">{curStageDef.sub}</div>
                </div>

                {/* High Score & Current Score Readout */}
                <div className="border border-slate-700/80 bg-[#070d19]/90 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.75)] backdrop-blur-sm">
                  <div className="font-mono text-[10px] tracking-widest text-slate-400">
                    HIGH SCORE // 歴代最高査定
                  </div>
                  <div className="font-mono text-lg font-bold text-amber-300/90 tabular-nums">
                    {highScore.toLocaleString()} <span className="text-[10px] text-slate-500">PTS</span>
                  </div>

                  <div className="mt-2.5 border-t border-slate-800 pt-2.5">
                    <div className="font-mono text-[10px] tracking-widest text-cyan-400">
                      CURRENT SCORE // 現在査定
                    </div>
                    <div className="font-mono text-2xl font-black tracking-tight text-white tabular-nums">
                      {hud.score.toLocaleString()}
                    </div>
                  </div>

                  {/* Chain & Multiplier Decay Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between font-mono text-xs font-bold tabular-nums">
                      <span className={hud.chain > 0 ? 'text-amber-300' : 'text-slate-500'}>
                        CHAIN {String(hud.chain).padStart(3, '0')}
                      </span>
                      <span className={hud.hyperActive ? 'text-amber-300' : 'text-cyan-300'}>
                        x{chainMult.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden bg-slate-900">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-cyan-300 transition-[width] duration-75"
                        style={{
                          width: `${
                            hud.chain > 0 ? Math.max(0, Math.min(100, (hud.chainT / 4) * 100)) : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Graze / Kills / Spell Counters */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-slate-800 pt-2.5 text-center font-mono">
                    <div className="bg-slate-900/90 p-1.5">
                      <div className="text-[9px] text-slate-400">GRAZE</div>
                      <div className="text-xs font-bold text-cyan-300 tabular-nums">{hud.graze}</div>
                    </div>
                    <div className="bg-slate-900/90 p-1.5">
                      <div className="text-[9px] text-slate-400">KILLS</div>
                      <div className="text-xs font-bold text-slate-200 tabular-nums">{hud.kills}</div>
                    </div>
                    <div className="bg-slate-900/90 p-1.5">
                      <div className="text-[9px] text-slate-400">SPELL</div>
                      <div className="text-xs font-bold text-emerald-300 tabular-nums">
                        {hud.spellsCaptured}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Weapon System Telemetry */}
              <div className="border border-slate-700/80 bg-[#070d19]/90 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.75)] backdrop-blur-sm">
                <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-amber-300">
                  <span>ARMAMENT // 兵装システム</span>
                  <span>LV.{hud.power >= 5 ? 'MAX' : hud.power}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <WeaponDiagram id={hud.weapon} active />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] text-cyan-400">
                      {WEAPON_META[hud.weapon].shortCode}
                    </div>
                    <div className="text-sm font-black text-white">{activeWeaponDef.name}</div>
                    <div className="text-[11px] text-slate-400">{WEAPON_META[hud.weapon].role}</div>
                  </div>
                </div>
                <div className="mt-2.5 font-mono text-[9px] text-slate-500 tabular-nums">
                  {`${hud.fps} FPS // PB ${hud.pb} // EB ${hud.eb}`}
                </div>
              </div>
            </aside>

            {/* RIGHT TELEMETRY BEZEL (Desktop) */}
            <aside className="pointer-events-none absolute inset-y-4 right-4 hidden w-64 flex-col justify-between xl:w-72 lg:flex">
              <div className="space-y-3">
                {/* HYPER OVERDRIVE (残業覚醒) Module */}
                <div
                  className={`border p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.75)] backdrop-blur-sm transition ${
                    hud.hyperActive
                      ? 'border-amber-300 bg-amber-950/60 shadow-[0_0_30px_rgba(251,191,36,0.35)]'
                      : hyperReady
                        ? 'border-amber-400 bg-[#1c1607]/95 shadow-[0_0_24px_rgba(251,191,36,0.3)]'
                        : 'border-cyan-500/35 bg-[#070d19]/90'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] font-bold tracking-widest">
                    <span className={hud.hyperActive || hyperReady ? 'text-amber-300' : 'text-cyan-400'}>
                      HYPER OVERDRIVE // 残業覚醒
                    </span>
                    <span className="text-white tabular-nums">
                      {hud.hyperActive ? `${hud.hyperTimer.toFixed(1)}s` : `${Math.floor(hud.hyper)}%`}
                    </span>
                  </div>

                  {/* Hyper Bar */}
                  <div className="mt-2 h-3 w-full overflow-hidden border border-slate-700 bg-slate-950 p-0.5">
                    <div
                      className={`h-full transition-all duration-75 ${
                        hud.hyperActive
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-200 to-cyan-300'
                          : hyperReady
                            ? 'animate-pulse bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400'
                            : 'bg-gradient-to-r from-cyan-600 to-cyan-300'
                      }`}
                      style={{
                        width: `${
                          hud.hyperActive
                            ? Math.max(0, Math.min(100, (hud.hyperTimer / 7.0) * 100))
                            : Math.max(0, Math.min(100, hud.hyper))
                        }%`,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!hyperReady}
                    onClick={() => engineRef.current?.triggerHyper()}
                    className={`pointer-events-auto mt-2.5 flex min-h-10 w-full items-center justify-center border font-mono text-xs font-black tracking-wider transition ${
                      hud.hyperActive
                        ? 'border-amber-200 bg-amber-400 text-slate-950'
                        : hyperReady
                          ? 'animate-pulse border-amber-200 bg-amber-400 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.75)] hover:bg-amber-300'
                          : 'border-slate-700 bg-slate-900/80 text-slate-500'
                    }`}
                  >
                    {hud.hyperActive
                      ? `OVERDRIVE ACTIVE // x2.0`
                      : hyperReady
                        ? 'HYPER READY! [C / Z]'
                        : 'GRAZE & DESTROY TO CHARGE'}
                  </button>
                </div>

                {/* Ship Vitals (Lives, Bombs, Power, Auto-Collect) */}
                <div className="space-y-2.5 border border-slate-700/80 bg-[#070d19]/90 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.75)] backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-400">
                      LIFE // 残機
                    </span>
                    <ShipLifeIcons n={hud.lives} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-rose-400">
                      BOMB // 決算異議
                    </span>
                    <BombIcons n={hud.bombs} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                      <span className="text-amber-300">POWER LEVEL</span>
                      <span className="text-white">
                        {hud.power >= 5 ? 'Lv.5 MAX' : `Lv.${hud.power}`}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden bg-slate-900 p-0.5">
                      <div
                        className={`h-full transition-all ${
                          hud.power >= 5 ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${(hud.power / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                  {hud.collectLineActive && (
                    <div className="border border-emerald-400/60 bg-emerald-950/70 px-2 py-1 text-center font-mono text-[10px] font-bold tracking-wider text-emerald-300">
                      AUTO COLLECT LINE // 全吸引発動中
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Keybind Reference Card */}
              <div className="border border-slate-800 bg-[#070d19]/85 p-3 font-mono text-[10px] leading-relaxed text-slate-400">
                <div className="mb-1 font-bold tracking-wider text-cyan-400">
                  TACTICAL CONTROLS // 操作系
                </div>
                <div className="flex justify-between">
                  <span>MOVE / FOCUS</span>
                  <span className="text-slate-200">MOUSE / WASD + SHIFT</span>
                </div>
                <div className="flex justify-between">
                  <span>BOMB (決算異議)</span>
                  <span className="text-rose-300">[X] / [K]</span>
                </div>
                <div className="flex justify-between">
                  <span>HYPER (残業覚醒)</span>
                  <span className="text-amber-300">[C] / [Z] / [SPACE]</span>
                </div>
                <div className="flex justify-between">
                  <span>WEAPON (兵装切替)</span>
                  <span className="text-cyan-300">[C] / [V]</span>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* ==================== CENTER PLAYFIELD HUD & MOBILE CONTROLS ==================== */}
        {(screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 flex w-full max-w-[540px] -translate-x-1/2 flex-col justify-between p-2 sm:p-3">
            {/* Top HUD Cluster */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                {/* Compact Score & Hyper Strip (Always visible on mobile/tablet, streamlined on desktop) */}
                <div className="min-w-0 flex-1 border border-cyan-500/35 bg-[#060b16]/90 px-3 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.7)] lg:hidden">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold tracking-wider">
                    <span className="bg-amber-400 px-1.5 py-0.5 font-mono text-slate-950">
                      STAGE {String(hud.stage).padStart(2, '0')}
                    </span>
                    {hud.loop > 0 && (
                      <span className="border border-rose-500 bg-rose-950 px-1.5 py-0.5 font-mono text-rose-300">
                        LOOP {hud.loop + 1}
                      </span>
                    )}
                    <span className="truncate text-slate-200">{titleForStage(hud.stage)}</span>
                    <span className="font-mono text-cyan-300">
                      [{difficultyDef(hud.difficulty).name}]
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-baseline justify-between gap-2">
                    <div className="font-mono text-xl font-black tracking-tight text-white tabular-nums sm:text-2xl">
                      {hud.score.toLocaleString()}
                      <span className="ml-1 text-[10px] font-normal text-slate-400">PTS</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
                      <span className="text-slate-400">
                        GRZ <strong className="text-cyan-300">{hud.graze}</strong>
                      </span>
                      <span className="text-slate-400">
                        SPL <strong className="text-amber-300">{hud.spellsCaptured}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Chain & Hyper Dual Bars on Mobile */}
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-[10px] font-bold tabular-nums ${
                          hud.chain > 0 ? 'text-amber-300' : 'text-slate-500'
                        }`}
                      >
                        {`${String(hud.chain).padStart(2, '0')}ch x${chainMult.toFixed(1)}`}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden bg-slate-900">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-[width] duration-75"
                          style={{
                            width: `${
                              hud.chain > 0 ? Math.max(0, Math.min(100, (hud.chainT / 4) * 100)) : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-[10px] font-bold tabular-nums ${
                          hud.hyperActive || hyperReady ? 'text-amber-300' : 'text-cyan-300'
                        }`}
                      >
                        {hud.hyperActive
                          ? `HYP ${hud.hyperTimer.toFixed(1)}s`
                          : `HYP ${Math.floor(hud.hyper)}%`}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden bg-slate-900">
                        <div
                          className={`h-full transition-[width] duration-75 ${
                            hud.hyperActive || hyperReady ? 'bg-amber-400' : 'bg-cyan-400'
                          }`}
                          style={{
                            width: `${
                              hud.hyperActive
                                ? Math.max(0, Math.min(100, (hud.hyperTimer / 7.0) * 100))
                                : Math.max(0, Math.min(100, hud.hyper))
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio & Pause Controls (Always accessible at top right of playfield) */}
                <div className="pointer-events-auto ml-auto flex items-center gap-1.5">
                  <AudioToggle variant="compact" />
                  <button
                    type="button"
                    onClick={handlePauseKey}
                    aria-label="一時停止"
                    className="inline-flex min-h-10 min-w-11 items-center justify-center gap-1 border border-cyan-500/40 bg-[#060b16]/90 px-2.5 py-1.5 font-mono text-xs font-bold tracking-wider text-slate-100 transition hover:border-amber-300 hover:bg-slate-900"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                      <rect x="3" y="2" width="3.5" height="12" />
                      <rect x="9.5" y="2" width="3.5" height="12" />
                    </svg>
                    <span>休止</span>
                  </button>
                </div>
              </div>

              {/* Mobile Ship Vitals Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-700/80 bg-[#060b16]/90 px-3 py-1 text-[11px] lg:hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-slate-400">LIFE</span>
                  <ShipLifeIcons n={hud.lives} />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-rose-400">BOMB</span>
                  <BombIcons n={hud.bombs} />
                </div>

                <div className="flex min-w-[100px] flex-1 items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-amber-300">
                    PWR {hud.power >= 5 ? 'MAX' : `Lv.${hud.power}`}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden bg-slate-900 p-0.5">
                    <div
                      className={`h-full transition-all ${
                        hud.power >= 5 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${(hud.power / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {hud.collectLineActive && (
                  <span className="border border-emerald-400/60 bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-emerald-300">
                    AUTO COLLECT
                  </span>
                )}
              </div>

              {/* Boss Tactical Telemetry Bar (Multi-phase HP + Spell Card Cut-In Banner) */}
              {hud.bossActive && (
                <div className="border border-rose-500/80 bg-[#14070c]/95 px-3 py-2 shadow-[0_4px_28px_rgba(244,63,94,0.35)]">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-600 px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wider text-white">
                        BOSS TARGET
                      </span>
                      <span className="font-black tracking-wide text-white">{hud.bossName}</span>
                      <span
                        className="inline-flex items-center gap-1"
                        aria-label={`残りフェーズ${hud.bossPhasesLeft}`}
                      >
                        {[0, 1].map((i) => (
                          <span
                            key={i}
                            className={`inline-block h-2.5 w-2.5 rotate-45 border ${
                              i < hud.bossPhasesLeft
                                ? 'border-amber-200 bg-amber-400'
                                : 'border-rose-900 bg-transparent'
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-rose-300 tabular-nums">
                      {hud.bossPhase === 0
                        ? 'PHASE 1/3 // NORMAL'
                        : hud.bossPhase === 1
                          ? 'PHASE 2/3 // SPELL 01'
                          : 'PHASE 3/3 // FINAL SPELL'}
                    </span>
                  </div>

                  {/* Segmented HP bar with phase threshold markers at 33% and 66% */}
                  <div className="relative mt-1.5 h-3 w-full overflow-hidden border border-rose-900/80 bg-rose-950/90">
                    <div
                      className={`h-full transition-[width] duration-75 ${
                        hud.bossPhase >= 1
                          ? 'bg-gradient-to-r from-rose-600 via-amber-500 to-yellow-300'
                          : 'bg-gradient-to-r from-rose-700 to-rose-400'
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (hud.bossHp / Math.max(1, hud.bossMax)) * 100),
                        )}%`,
                      }}
                    />
                    {BOSS_PHASE_THRESH.map((th) => (
                      <span
                        key={th}
                        className="absolute inset-y-0 w-0.5 bg-white/90"
                        style={{ left: `${th * 100}%` }}
                      />
                    ))}
                  </div>

                  {/* Active Spell Card Cut-In Readout */}
                  {hud.bossSpellName && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-rose-900/70 pt-1 text-[11px]">
                      <div className="truncate font-bold text-rose-100">
                        <span className="mr-1.5 bg-amber-400/20 px-1 py-0.5 font-mono text-[9px] text-amber-300">
                          SPELL CARD
                        </span>
                        {hud.bossSpellName}
                      </div>
                      <div className="shrink-0 font-mono text-[11px] font-bold tabular-nums">
                        {hud.bossSpellClean ? (
                          <span className="text-amber-300">
                            CLEAN BONUS +{hud.bossSpellBonus.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-500">BONUS FAILED</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Tactical Action Bar (Weapon Switch + HYPER Overdrive + BOMB) */}
            {screen === 'playing' && (
              <div className="flex items-end justify-between gap-2 pb-1">
                {/* 1. Weapon Switch Button (兵装切替) */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    engineRef.current?.cycleWeapon();
                  }}
                  aria-label="兵装切替"
                  className="pointer-events-auto flex min-h-14 items-center gap-2 border border-cyan-500/50 bg-[#060b16]/92 px-3 py-2 text-left shadow-[2px_2px_0_#38bdf8] active:translate-x-0.5 active:translate-y-0.5"
                >
                  <span
                    className="inline-block h-3 w-3 rotate-45"
                    style={{ backgroundColor: WEAPON_META[hud.weapon].color }}
                  />
                  <div>
                    <div className="font-mono text-[9px] tracking-wider text-cyan-300">
                      兵装切替 [V]
                    </div>
                    <div className="text-xs font-black text-white">
                      {activeWeaponDef.name}
                      <span className="ml-1.5 font-mono text-[10px] font-bold text-amber-300">
                        Lv.{hud.power}
                      </span>
                    </div>
                  </div>
                </button>

                {/* 2. HYPER OVERDRIVE Button (残業覚醒) */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    engineRef.current?.triggerHyper();
                  }}
                  disabled={!hyperReady && !hud.hyperActive}
                  aria-label="残業覚醒発動"
                  className={`pointer-events-auto flex min-h-14 flex-1 max-w-[190px] flex-col items-center justify-center border-2 px-3 py-1.5 font-black tracking-wider transition ${
                    hud.hyperActive
                      ? 'border-amber-200 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.8)]'
                      : hyperReady
                        ? 'animate-pulse border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.85)] active:translate-y-0.5'
                        : 'border-slate-700 bg-[#060b16]/85 text-slate-400'
                  }`}
                >
                  <span className="font-mono text-[9px] leading-none">
                    {hud.hyperActive
                      ? `HYPER ACTIVE // ${hud.hyperTimer.toFixed(1)}s`
                      : hyperReady
                        ? 'HYPER READY! [C]'
                        : `HYPER CHARGE ${Math.floor(hud.hyper)}%`}
                  </span>
                  <span className="mt-1 text-xs leading-none">
                    {hud.hyperActive ? '残業覚醒中 x2.0' : '残業覚醒 // HYPER'}
                  </span>
                </button>

                {/* 3. BOMB Button (決算異議) */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    engineRef.current?.useBomb();
                  }}
                  disabled={hud.bombs <= 0}
                  aria-label="ボム発動"
                  className={`pointer-events-auto flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-2 font-black tracking-wider transition ${
                    hud.bombs > 0
                      ? 'border-amber-300 bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.65)] active:translate-y-0.5'
                      : 'border-slate-700 bg-slate-900/80 text-slate-600'
                  }`}
                >
                  <span className="font-mono text-[10px] leading-none">BOMB [X]</span>
                  <span className="mt-0.5 text-xs leading-none">決算異議</span>
                  <span className="mt-0.5 font-mono text-[9px] leading-none text-amber-200">
                    x{hud.bombs}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== CENTER CUT-IN BANNERS ==================== */}
        {banner && (screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-x-0 top-[26%] flex flex-col items-center px-4 text-center">
            <div
              className={`w-full max-w-md border-y-2 px-6 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-sm ${
                banner.kind === 'warn'
                  ? 'border-rose-500 bg-rose-950/95'
                  : banner.kind === 'spell'
                    ? 'border-amber-300 bg-[#1f1209]/95'
                    : banner.kind === 'spellResult'
                      ? banner.captured
                        ? 'border-emerald-400 bg-emerald-950/95'
                        : 'border-slate-600 bg-slate-900/95'
                      : banner.kind === 'clear' || banner.kind === 'extend'
                        ? 'border-amber-300 bg-[#1a1608]/95'
                        : 'border-cyan-400 bg-[#060d1d]/95'
              }`}
            >
              <div className="font-mono text-[10px] font-bold tracking-[0.28em] text-amber-300">
                {banner.kind === 'warn'
                  ? 'EMERGENCY BOSS ALERT'
                  : banner.kind === 'spell'
                    ? 'SPELL CARD DECLARATION'
                    : banner.kind === 'spellResult'
                      ? 'SPELL EVALUATION'
                      : banner.kind === 'clear'
                        ? 'OPERATION COMPLETE'
                        : banner.kind === 'extend'
                          ? 'PERSONNEL REINFORCEMENT'
                          : 'TACTICAL DIRECTIVE'}
              </div>
              <div
                className={`mt-1 text-2xl font-black tracking-wide ${
                  banner.kind === 'warn'
                    ? 'text-rose-400'
                    : banner.kind === 'spell'
                      ? 'text-amber-200'
                      : banner.kind === 'spellResult' && banner.captured
                        ? 'text-emerald-300'
                        : 'text-white'
                }`}
              >
                {banner.title}
              </div>
              {banner.sub && (
                <div className="mt-1 font-mono text-xs tracking-wider text-slate-300">
                  {banner.sub}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== NEO-ARCADE TITLE & TACTICAL HANGAR SCREEN ==================== */}
        {screen === 'title' && (
          <div className="absolute inset-0 overflow-y-auto bg-[#050811]/95 px-4 py-5 sm:px-6">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
              {/* Top System Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-cyan-400">
                  <span className="inline-block h-2 w-2 bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                  <span>NEO-ARCADE // SHACHIKU-STG VER 2.0</span>
                </div>
                <AudioToggle variant="full" />
              </div>

              {/* Hero Hangar Marquee */}
              <div className="relative overflow-hidden border border-cyan-500/40 bg-gradient-to-b from-[#0d182e] via-[#091020] to-[#060a14] p-5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
                <div className="font-mono text-[10px] font-bold tracking-[0.38em] text-cyan-300">
                  HYPER CORPORATE DANMAKU SHOOTER
                </div>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-5xl">
                  社畜<span className="text-amber-400">シューティング</span>
                  <span className="ml-1.5 bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                    NEO
                  </span>
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-300">
                  全6ステージ＋無限残業ループ。弾幕をかすめてハイパーゲージを溜め、
                  <strong className="text-amber-300">「残業覚醒（HYPER OVERDRIVE）」</strong>
                  で敵弾を得点チップへ一斉変換せよ！
                </p>

                {/* Stage Practice / Sortie Route Selector */}
                <div className="mt-4 border-t border-slate-800/90 pt-3 text-left">
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-bold tracking-wider text-cyan-300">
                    <span>STAGE SELECT // 出撃エリア選択（ステージ練習対応）</span>
                    <span className="text-amber-300">
                      {selectedStage === 1
                        ? 'FULL SORTIE (STAGE 1〜6)'
                        : `PRACTICE: STAGE ${selectedStage} (初期PWR Lv.${Math.min(5, selectedStage)})`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                    {STAGES.map((st, idx) => {
                      const stNum = idx + 1;
                      const active = selectedStage === stNum;
                      return (
                        <button
                          key={st.name}
                          type="button"
                          onClick={() => {
                            shmupSound.ui();
                            setSelectedStage(stNum);
                          }}
                          className={`border px-2 py-1.5 text-left font-mono transition ${
                            active
                              ? 'border-amber-300 bg-amber-400/20 text-white shadow-[inset_0_0_0_1px_#fcd34d]'
                              : 'border-slate-800 bg-[#060911] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span style={{ color: active ? '#fde047' : st.accent }}>
                              ST.0{stNum}
                            </span>
                            {stNum > 1 && (
                              <span className="text-[8px] text-slate-500">
                                Lv.{Math.min(5, stNum)}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[10px] font-bold text-slate-200">
                            {st.boss}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4-Weapon Tactical Hangar Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px] font-bold tracking-wider text-amber-300">
                  <span>ARMAMENT HANGAR // 4種兵装システム選択</span>
                  <span className="text-[10px] text-slate-400">出撃後も [V] または画面左下ボタンで即時切替可</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {WEAPONS.map((w) => {
                    const active = weapon === w.id;
                    const meta = WEAPON_META[w.id];
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          shmupSound.ui();
                          setWeapon(w.id);
                        }}
                        className={`flex items-center gap-3 border p-3 text-left transition ${
                          active
                            ? 'border-amber-300 bg-[#131d33] shadow-[inset_0_0_0_1px_#fcd34d,0_0_20px_rgba(251,191,36,0.15)]'
                            : 'border-slate-800 bg-[#090f1d] hover:border-slate-600 hover:bg-[#0d1629]'
                        }`}
                      >
                        <WeaponDiagram id={w.id} active={active} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-black text-white">{w.name}</span>
                            <span
                              className="font-mono text-[10px] font-bold"
                              style={{ color: meta.color }}
                            >
                              {meta.shortCode}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-300">{meta.role}</div>
                          <div className="mt-1.5 flex items-center gap-3 font-mono text-[9px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              威力 <StatDots value={meta.pwr} color={meta.color} />
                            </span>
                            <span className="inline-flex items-center gap-1">
                              制圧 <StatDots value={meta.rng} color={meta.color} />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workload (Difficulty) Selector with Density & Hyper Rate Badges */}
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] font-bold tracking-wider text-cyan-300">
                  WORKLOAD // 勤務形態（難易度・弾幕密度・スコア倍率）
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DIFFICULTIES.map((d) => {
                    const active = difficulty === d.id;
                    const dm = DIFF_META[d.id];
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          shmupSound.ui();
                          setDifficulty(d.id);
                        }}
                        className={`flex flex-col justify-between border p-3 text-left transition ${
                          active
                            ? 'border-cyan-300 bg-[#0c2136] shadow-[inset_0_0_0_1px_#67e8f9]'
                            : 'border-slate-800 bg-[#090f1d] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-black text-white">{d.name}</span>
                          <span className="bg-cyan-400/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                            SCORE x{d.score.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-300">{d.desc}</div>
                        <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-800 pt-1.5 font-mono text-[9px]">
                          <span style={{ color: dm.badgeColor }}>{dm.density}</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-amber-300">{dm.hyperRate}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sortie & Continue CTAs */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => startRun({ stage: selectedStage })}
                  className="flex min-h-14 w-full items-center justify-center gap-2 border-2 border-amber-200 bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 py-3.5 text-lg font-black tracking-wider text-white shadow-[0_0_28px_rgba(244,63,94,0.45)] transition hover:brightness-110 active:translate-y-0.5"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <polygon points="4,2 18,10 4,18" />
                  </svg>
                  <span>
                    {selectedStage === 1
                      ? '出撃する // FULL SORTIE (STAGE 1)'
                      : `STAGE ${selectedStage} から出撃 // PRACTICE SORTIE`}
                  </span>
                </button>

                {continueSave && (
                  <button
                    type="button"
                    onClick={() => {
                      setWeapon(continueSave.weapon);
                      setDifficulty(continueSave.difficulty);
                      startRun({
                        stage: continueSave.stage,
                        score: continueSave.score,
                        power: continueSave.weaponLevel,
                        lives: 3,
                        weapon: continueSave.weapon,
                        difficulty: continueSave.difficulty,
                      });
                    }}
                    className="flex min-h-11 w-full items-center justify-between border border-amber-300 bg-amber-400/95 px-4 py-2.5 font-bold text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.35)] transition hover:bg-amber-300"
                  >
                    <span className="text-sm font-black">
                      途中出社 // CONTINUE STAGE {continueSave.stage}
                    </span>
                    <span className="font-mono text-xs font-bold">
                      {continueSave.score.toLocaleString()} PTS / Lv.{continueSave.weaponLevel}
                    </span>
                  </button>
                )}
              </div>

              {/* High Score Leaderboard */}
              {scores.length > 0 && (
                <div className="border border-slate-800 bg-[#090f1d] p-3.5">
                  <div className="mb-2 flex items-center justify-between font-mono text-[11px] font-bold tracking-wider text-amber-300">
                    <span>HALL OF OVERWORK // 歴代社畜番付</span>
                    <span className="text-[10px] text-slate-400">TOP 5 RECORDS</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 text-xs">
                    {scores.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center font-mono text-[11px] font-bold ${
                              i === 0
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="font-bold text-white">{s.rank}</span>
                          <span className="font-mono text-[11px] text-cyan-400">
                            STAGE {s.stage}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-amber-300 tabular-nums">
                          {s.score.toLocaleString()} PTS
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Utility Bar & Tactical Manual */}
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    shmupSound.ui();
                    setShowHelp((v) => !v);
                  }}
                  className="min-h-11 flex-1 border border-slate-700 bg-[#090f1d] px-3 py-2 font-bold tracking-wider text-slate-200 hover:border-cyan-400"
                >
                  {showHelp ? 'マニュアルを閉じる' : '戦術マニュアル // HOW TO PLAY'}
                </button>
                <button
                  type="button"
                  onClick={toggleShake}
                  className="min-h-11 border border-slate-700 bg-[#090f1d] px-4 py-2 font-mono text-xs font-bold text-slate-200 hover:border-cyan-400"
                >
                  画面振動: {shake ? 'ON' : 'OFF'}
                </button>
              </div>

              {showHelp && (
                <div className="grid grid-cols-1 gap-2.5 border border-slate-700 bg-[#090f1d] p-4 text-left text-xs leading-relaxed text-slate-300 sm:grid-cols-2">
                  <div>
                    <div className="font-mono text-[10px] font-bold text-cyan-300">
                      NAVIGATION // 移動・精密フォーカス
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      マウスはカーソル追従（右クリックで低速＋精密コア表示）。タッチは相対ドラッグで指が自機を隠しません。キーボードはWASD/矢印＋Shift。
                    </p>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-bold text-amber-300">
                      HYPER OVERDRIVE // 残業覚醒システム
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      弾幕グレイズ・撃破・アイテム回収でHYPERゲージが上昇。100%で[C]/[Z]または中央ボタンで発動！周囲の敵弾を得点チップへ変換し、7秒間火力・スコア2倍！
                    </p>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-bold text-emerald-300">
                      COLLECT LINE // 上部自動回収ライン
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      画面上部（Y=250より上）へ前進すると全アイテムを高速吸引。ボス撃破・フェーズ突破・ボム発動時も全自動回収されます。
                    </p>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-bold text-rose-300">
                      SPELL CARD // スペルカード完全取得
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      各ステージの巨大メカボスは3段階フェーズ制。後半2段階のスペルカードをノーミス・ノーボムで突破すると高得点ボーナス獲得（HYPER覚醒は使用OK！）。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== PAUSE MODAL ==================== */}
        {screen === 'paused' && !fatal && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050811]/90 p-6 backdrop-blur-sm">
            <div className="flex w-full max-w-sm flex-col gap-4 border border-cyan-500/50 bg-[#090f1d] p-5 text-center shadow-[0_16px_48px_rgba(0,0,0,0.9)]">
              <div className="font-mono text-[10px] font-bold tracking-[0.3em] text-cyan-400">
                INTERMISSION // 業務一時停止
              </div>
              <div className="text-2xl font-black text-white">休憩中</div>

              <div className="grid grid-cols-3 gap-2 border border-slate-800 bg-[#050811] p-2.5 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">STAGE</div>
                  <div className="font-bold text-white">{hud.stage}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">SCORE</div>
                  <div className="font-bold text-amber-300">{hud.score.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">SPELL GET</div>
                  <div className="font-bold text-emerald-300">{hud.spellsCaptured}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <AudioToggle variant="full" />
                <button
                  type="button"
                  onClick={toggleShake}
                  className="min-h-10 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-xs font-bold text-white hover:bg-black/65"
                >
                  振動 {shake ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePauseKey}
                  className="min-h-12 w-full border border-amber-200 bg-rose-600 py-3 font-black tracking-wider text-white shadow-[0_0_20px_rgba(244,63,94,0.45)] hover:bg-rose-500"
                >
                  業務再開 // RESUME
                </button>
                <button
                  type="button"
                  onClick={() => startRun({ stage: selectedStage })}
                  className="min-h-11 w-full border border-slate-700 bg-slate-800/90 py-2.5 text-sm font-bold text-slate-100 hover:border-cyan-400"
                >
                  最初から再出撃
                </button>
                <button
                  type="button"
                  onClick={() => {
                    shmupSound.ui();
                    destroyEngine();
                    setContinueSave(loadContinue());
                    setScreen('title');
                  }}
                  className="min-h-11 w-full border border-slate-800 bg-[#050811] py-2.5 text-sm text-slate-400 hover:text-white"
                >
                  ハンガー（タイトル）へ戻る
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== RESULT SCREEN ==================== */}
        {screen === 'result' && result && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-[#050811]/95 p-5">
            <div className="flex w-full max-w-md flex-col gap-4 border border-cyan-500/50 bg-[#090f1d] p-5 text-center shadow-[0_16px_48px_rgba(0,0,0,0.9)]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 font-mono text-[10px] tracking-widest text-cyan-400">
                <span>PERFORMANCE EVALUATION // 業務査定書</span>
                <span>[{difficultyDef(result.difficulty).name}]</span>
              </div>

              <div>
                <div
                  className={`inline-block border px-3 py-0.5 font-mono text-xs font-black tracking-widest ${
                    result.cleared
                      ? 'border-emerald-400 bg-emerald-950 text-emerald-300'
                      : 'border-rose-500 bg-rose-950 text-rose-300'
                  }`}
                >
                  {result.cleared ? 'ALL 6 STAGES CLEARED' : 'MISSION TERMINATED'}
                </div>
                <div className="mt-1.5 text-3xl font-black tracking-wide text-white">
                  {result.cleared ? '定時退社達成' : '過労撃墜'}
                </div>
              </div>

              {/* Rank & Final Score Box */}
              <div className="border border-amber-400/40 bg-[#050811] p-4">
                <div className="font-mono text-[10px] tracking-widest text-slate-400">
                  認定社畜称号
                </div>
                <div className="mt-0.5 text-2xl font-black text-amber-300">{result.rank}</div>
                <div className="mt-2 font-mono text-2xl font-black text-white tabular-nums">
                  {result.score.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-400">PTS</span>
                </div>
              </div>

              {/* 6-cell Telemetry Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="border border-slate-800 bg-[#050811] p-2">
                  <div className="font-mono text-[10px] text-slate-400">到達STAGE</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-white">
                    STAGE {result.stage}
                  </div>
                </div>
                <div className="border border-slate-800 bg-[#050811] p-2">
                  <div className="font-mono text-[10px] text-slate-400">最大CHAIN</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-amber-300">
                    {result.maxChain}連
                  </div>
                </div>
                <div className="border border-slate-800 bg-[#050811] p-2">
                  <div className="font-mono text-[10px] text-slate-400">撃破数</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-white">
                    {result.kills}機
                  </div>
                </div>
                <div className="border border-slate-800 bg-[#050811] p-2">
                  <div className="font-mono text-[10px] text-slate-400">GRAZE</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-cyan-300">
                    {result.graze}
                  </div>
                </div>
                <div className="border border-slate-800 bg-[#050811] p-2">
                  <div className="font-mono text-[10px] text-slate-400">SPELL取得</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-emerald-300">
                    {result.spells}枚
                  </div>
                </div>
                <div className="border border-slate-800 bg-[#050811] p-2">
                  <div className="font-mono text-[10px] text-slate-400">勤務時間</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-white">
                    {Math.floor(result.timeMs / 60000)}m
                    {String(Math.floor((result.timeMs % 60000) / 1000)).padStart(2, '0')}s
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startRun({ stage: selectedStage })}
                  className="min-h-12 w-full border border-amber-200 bg-rose-600 py-3 font-black tracking-wider text-white shadow-[0_0_20px_rgba(244,63,94,0.45)] hover:bg-rose-500"
                >
                  再出撃する // RETRY
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="min-h-11 border border-cyan-400/60 bg-cyan-950/60 py-2.5 text-xs font-bold tracking-wider text-cyan-300 hover:bg-cyan-900/60"
                  >
                    {shared ? '戦績コピー完了' : '戦績をシェア'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      shmupSound.ui();
                      clearContinue();
                      destroyEngine();
                      setContinueSave(null);
                      setScreen('title');
                    }}
                    className="min-h-11 border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-300 hover:border-amber-300"
                  >
                    タイトルへ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
