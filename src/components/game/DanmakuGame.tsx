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
  { code: string; role: string; pwr: number; rng: number; spd: number; color: string }
> = {
  rensa: {
    code: 'WPN-01 // VULCAN',
    role: '集中速射・対ボス特化',
    pwr: 4,
    rng: 2,
    spd: 5,
    color: '#f5b642',
  },
  kakusan: {
    code: 'WPN-02 // WIDE FAN',
    role: '5方向広角・道中制圧',
    pwr: 3,
    rng: 5,
    spd: 4,
    color: '#5ec8ff',
  },
  tsuibi: {
    code: 'WPN-03 // HOMING',
    role: '自動追尾・回避専念',
    pwr: 3,
    rng: 4,
    spd: 3,
    color: '#c084fc',
  },
  laser: {
    code: 'WPN-04 // RAIL LASER',
    role: '高威力貫通・一列粉砕',
    pwr: 5,
    rng: 2,
    spd: 4,
    color: '#6ee7b7',
  },
};

function WeaponDiagram({ id, active }: { id: WeaponId; active: boolean }) {
  const stroke = active ? '#f5cf76' : '#8a7d69';
  const accent = WEAPON_META[id].color;
  return (
    <svg
      viewBox="0 0 64 52"
      className="h-11 w-14 shrink-0 rounded border border-[#362e24] bg-[#0c0a08]"
      aria-hidden
    >
      {/* grid lines */}
      <line x1="32" y1="0" x2="32" y2="52" stroke="#221c15" strokeWidth="1" />
      <line x1="0" y1="38" x2="64" y2="38" stroke="#221c15" strokeWidth="1" />
      {id === 'rensa' && (
        <g stroke={accent} strokeWidth="2.2" strokeLinecap="round">
          <line x1="27" y1="34" x2="27" y2="6" />
          <line x1="37" y1="34" x2="37" y2="6" />
          <line x1="20" y1="36" x2="18" y2="12" strokeOpacity="0.65" strokeWidth="1.5" />
          <line x1="44" y1="36" x2="46" y2="12" strokeOpacity="0.65" strokeWidth="1.5" />
        </g>
      )}
      {id === 'kakusan' && (
        <g stroke={accent} strokeWidth="2" strokeLinecap="round">
          <line x1="32" y1="35" x2="32" y2="6" />
          <line x1="32" y1="35" x2="19" y2="8" />
          <line x1="32" y1="35" x2="45" y2="8" />
          <line x1="32" y1="35" x2="8" y2="14" strokeOpacity="0.7" />
          <line x1="32" y1="35" x2="56" y2="14" strokeOpacity="0.7" />
        </g>
      )}
      {id === 'tsuibi' && (
        <g fill="none" stroke={accent} strokeWidth="1.9" strokeLinecap="round">
          <path d="M24 36 C12 26, 16 14, 30 9" />
          <path d="M40 36 C52 26, 48 14, 34 9" />
          <circle cx="32" cy="9" r="3.5" stroke="#f5cf76" strokeWidth="1.4" />
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
      {/* ship silhouette */}
      <polygon points="32,33 25,46 32,43 39,46" fill={stroke} />
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
            className={`h-3.5 w-3.5 ${on ? 'text-[#f2c464]' : 'text-white/15'}`}
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
            className={`h-3.5 w-3.5 ${on ? 'text-[#f0715a]' : 'text-white/15'}`}
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

function StatDots({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-2.5 ${
            i <= value ? 'bg-[#dfb15b]' : 'bg-[#2c251d]'
          }`}
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
      setResult(null);
      setShared(false);
      setFatal(null);
      setBanner(null);
      setHud({
        ...DEFAULT_HUD,
        weapon: runWeapon,
        difficulty: runDifficulty,
        score: opts?.score ?? 0,
        stage: opts?.stage ?? 1,
        power: opts?.power ?? 1,
        lives: opts?.lives ?? 3,
      });
      const engine = new DanmakuEngine({
        canvas,
        weapon: runWeapon,
        difficulty: runDifficulty,
        power: opts?.power ?? 1,
        stage: opts?.stage ?? 1,
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
    [destroyEngine, weapon, difficulty, shake, showBanner, setScreen],
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
  const chainMult = (1 + Math.min(hud.chain, 150) * 0.01) * difficultyDef(hud.difficulty).score;
  const activeWeaponDef = WEAPONS.find((w) => w.id === hud.weapon) ?? WEAPONS[0]!;

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#0c0a08] text-[#f2e9d8] select-none">
      {/* Arcade cabinet ambient backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(110% 85% at 50% 0%, #241b13 0%, #120e0a 50%, #080705 100%)',
        }}
      />
      {/* Subtle CRT scanline & vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px)',
          boxShadow: 'inset 0 0 160px 36px rgba(0,0,0,0.92)',
        }}
      />

      <div className="relative h-full w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 block h-full w-full touch-none select-none ${canvasCursor}`}
        />

        {/* Fatal WebGL error fallback */}
        {fatal && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#0c0a08]/95 p-6 text-center">
            <div className="border border-[#e05844] bg-[#24110e] px-4 py-1 font-mono text-xs tracking-widest text-[#f08b78]">
              SYSTEM FAULT // RENDERER HALTED
            </div>
            <div className="text-2xl font-black text-[#e07054]">システム障害が発生しました</div>
            <div className="max-w-sm break-all border border-[#3b3328] bg-[#16130f] p-3 font-mono text-xs text-[#b7a992]">
              {fatal}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-12 border border-[#f2e9d8] bg-[#b23a2a] px-8 py-3 font-black tracking-wider shadow-[3px_3px_0_#f2e9d8] hover:bg-[#c94b38]"
            >
              システム再起動
            </button>
          </div>
        )}

        {/* ==================== PLAYING / PAUSED COCKPIT HUD ==================== */}
        {(screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 flex w-full max-w-[540px] -translate-x-1/2 flex-col justify-between p-2 sm:p-3">
            {/* Top HUD cluster */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                {/* Score & Stage Telemetry Module */}
                <div className="min-w-0 flex-1 border border-[#42382c] bg-[#100d0a]/92 px-3 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.65)]">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold tracking-wider">
                    <span className="bg-[#dfb15b] px-1.5 py-0.5 font-mono text-[#12100d]">
                      STAGE {String(hud.stage).padStart(2, '0')}
                    </span>
                    {hud.loop > 0 && (
                      <span className="border border-[#e07054] bg-[#2d1410] px-1.5 py-0.5 font-mono text-[#f0937e]">
                        LOOP {hud.loop + 1}
                      </span>
                    )}
                    <span className="truncate text-[#e6dac6]">{titleForStage(hud.stage)}</span>
                    <span className="font-mono text-[#7bc4b5]">
                      [{difficultyDef(hud.difficulty).name}]
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-baseline justify-between gap-2">
                    <div className="font-mono text-xl font-black tracking-tight text-[#fff6e5] tabular-nums sm:text-2xl">
                      {hud.score.toLocaleString()}
                      <span className="ml-1 text-[10px] font-normal text-[#968771]">PTS</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
                      <span className="text-[#b7a992]">
                        GRAZE <strong className="text-[#7bc4b5]">{hud.graze}</strong>
                      </span>
                      <span className="text-[#b7a992]">
                        SPELL <strong className="text-[#f2c464]">{hud.spellsCaptured}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Chain & Multiplier Gauge */}
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold tabular-nums ${
                        hud.chain > 0 ? 'text-[#f2c464]' : 'text-[#6e6252]'
                      }`}
                    >
                      {`CHAIN ${String(hud.chain).padStart(3, '0')} // x${chainMult.toFixed(2)}`}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden bg-[#262019]">
                      <div
                        className="h-full bg-gradient-to-r from-[#c88d32] to-[#f7d27a] transition-[width] duration-75"
                        style={{
                          width: `${
                            hud.chain > 0 ? Math.max(0, Math.min(100, (hud.chainT / 4) * 100)) : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Audio & Pause Controls */}
                <div className="pointer-events-auto flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <AudioToggle variant="compact" />
                    <button
                      type="button"
                      onClick={handlePauseKey}
                      aria-label="一時停止"
                      className="inline-flex min-h-10 min-w-11 items-center justify-center gap-1 border border-[#42382c] bg-[#100d0a]/92 px-2.5 py-1.5 font-mono text-xs font-bold tracking-wider text-[#f2e9d8] transition hover:border-[#dfb15b] hover:bg-[#1c1712]"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                        <rect x="3" y="2" width="3.5" height="12" />
                        <rect x="9.5" y="2" width="3.5" height="12" />
                      </svg>
                      <span>休止</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ship Vitals Strip: Lives, Bombs, Power, Collect Line status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border border-[#42382c] bg-[#100d0a]/90 px-3 py-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#9c8d77]">RES</span>
                  <ShipLifeIcons n={hud.lives} />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#e8836f]">BOMB</span>
                  <BombIcons n={hud.bombs} />
                </div>

                <div className="flex min-w-[110px] flex-1 items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#dfb15b]">
                    PWR {hud.power >= 5 ? 'MAX' : `Lv.${hud.power}`}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden bg-[#262019] p-0.5">
                    <div
                      className={`h-full transition-all ${
                        hud.power >= 5 ? 'bg-[#6ee7b7]' : 'bg-[#dfb15b]'
                      }`}
                      style={{ width: `${(hud.power / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {hud.collectLineActive && (
                  <span className="border border-[#6ee7b7]/60 bg-[#0f2922] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#6ee7b7]">
                    AUTO COLLECT // 全吸引
                  </span>
                )}
              </div>

              {/* Boss Tactical Gauge (Multi-phase HP + Spell Card telemetry) */}
              {hud.bossActive && (
                <div className="border border-[#c94b38] bg-[#170d0b]/95 px-3 py-2 shadow-[0_4px_24px_rgba(178,58,42,0.35)]">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#c94b38] px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wider text-white">
                        BOSS
                      </span>
                      <span className="font-black tracking-wide text-[#f7e7d4]">
                        {hud.bossName}
                      </span>
                      {/* Remaining spell phases diamonds */}
                      <span className="inline-flex items-center gap-1" aria-label={`残りフェーズ${hud.bossPhasesLeft}`}>
                        {[0, 1].map((i) => (
                          <span
                            key={i}
                            className={`inline-block h-2.5 w-2.5 rotate-45 border ${
                              i < hud.bossPhasesLeft
                                ? 'border-[#f5cf76] bg-[#dfb15b]'
                                : 'border-[#4a352f] bg-transparent'
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-[#f0937e] tabular-nums">
                      {hud.bossPhase === 0
                        ? 'PHASE 1/3 // NORMAL'
                        : hud.bossPhase === 1
                          ? 'PHASE 2/3 // SPELL 01'
                          : 'PHASE 3/3 // FINAL SPELL'}
                    </span>
                  </div>

                  {/* Segmented HP bar with phase threshold markers at 33% and 66% */}
                  <div className="relative mt-1.5 h-2.5 w-full overflow-hidden bg-[#2b1714]">
                    <div
                      className={`h-full transition-[width] duration-75 ${
                        hud.bossPhase >= 1
                          ? 'bg-gradient-to-r from-[#b23a2a] via-[#e07054] to-[#f5cf76]'
                          : 'bg-gradient-to-r from-[#b23a2a] to-[#e07054]'
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
                        className=" absolute inset-y-0 w-0.5 bg-[#0c0a08]"
                        style={{ left: `${th * 100}%` }}
                      />
                    ))}
                  </div>

                  {/* Active Spell Card readout */}
                  {hud.bossSpellName && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-[#4a2620] pt-1 text-[11px]">
                      <div className="truncate font-bold text-[#f7c8b6]">
                        <span className="mr-1.5 font-mono text-[10px] text-[#f5cf76]">
                          SPELL CARD //
                        </span>
                        {hud.bossSpellName}
                      </div>
                      <div className="shrink-0 font-mono text-[11px] font-bold tabular-nums">
                        {hud.bossSpellClean ? (
                          <span className="text-[#f5cf76]">
                            BONUS +{hud.bossSpellBonus.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#7d6861]">BONUS LOST</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Tactical Controls (Weapon Switch + Bomb Button) */}
            {screen === 'playing' && (
              <div className="flex items-end justify-between gap-2 pb-1">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      engineRef.current?.cycleWeapon();
                    }}
                    aria-label="武器切替"
                    className="pointer-events-auto flex min-h-12 items-center gap-2 border border-[#4a3e30] bg-[#120f0b]/92 px-3 py-2 text-left shadow-[2px_2px_0_#dfb15b] active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rotate-45"
                      style={{ backgroundColor: WEAPON_META[hud.weapon].color }}
                    />
                    <div>
                      <div className="font-mono text-[9px] tracking-wider text-[#9c8d77]">
                        WEAPON [C] // TAP SWITCH
                      </div>
                      <div className="text-xs font-black text-[#f2e9d8]">
                        {activeWeaponDef.name}
                        <span className="ml-1.5 font-mono text-[10px] font-normal text-[#dfb15b]">
                          Lv.{hud.power}
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="font-mono text-[9px] tracking-wider text-[#f2e9d8]/35 tabular-nums">
                    {`${hud.fps}FPS // SHOT ${hud.pb} // BULLET ${hud.eb}`}
                  </div>
                </div>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    engineRef.current?.useBomb();
                  }}
                  disabled={hud.bombs <= 0}
                  aria-label="ボム発動"
                  className={`pointer-events-auto flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 font-black tracking-wider transition ${
                    hud.bombs > 0
                      ? 'border-[#f5cf76] bg-[#b23a2a] text-[#fff6e5] shadow-[3px_3px_0_#f2e9d8] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#f2e9d8]'
                      : 'border-[#3b3328] bg-[#1c1814]/80 text-[#6e6252]'
                  }`}
                >
                  <span className="font-mono text-[10px] leading-none">BOMB</span>
                  <span className="mt-0.5 text-xs leading-none">決裁印</span>
                  <span className="mt-0.5 font-mono text-[9px] leading-none text-[#f5cf76]">
                    x{hud.bombs}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== CENTER BANNERS ==================== */}
        {banner && (screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-x-0 top-[28%] flex flex-col items-center px-4 text-center">
            <div
              className={`w-full max-w-md border-y-2 px-6 py-3 shadow-[0_10px_36px_rgba(0,0,0,0.85)] ${
                banner.kind === 'warn'
                  ? 'border-[#ff5d47] bg-[#290d0a]/95'
                  : banner.kind === 'spell'
                    ? 'border-[#f5cf76] bg-[#24130f]/95'
                    : banner.kind === 'spellResult'
                      ? banner.captured
                        ? 'border-[#6ee7b7] bg-[#0e261e]/95'
                        : 'border-[#6e6252] bg-[#171410]/95'
                      : banner.kind === 'clear' || banner.kind === 'extend'
                        ? 'border-[#f5cf76] bg-[#1f190e]/95'
                        : 'border-[#dfb15b] bg-[#120f0b]/92'
              }`}
            >
              <div className="font-mono text-[10px] font-bold tracking-[0.25em] text-[#dfb15b]">
                {banner.kind === 'warn'
                  ? 'EMERGENCY ALERT'
                  : banner.kind === 'spell'
                    ? 'SPELL CARD DECLARATION'
                    : banner.kind === 'spellResult'
                      ? 'SPELL EVALUATION'
                      : banner.kind === 'clear'
                        ? 'OPERATION COMPLETE'
                        : banner.kind === 'extend'
                          ? 'PERSONNEL REINFORCEMENT'
                          : 'MISSION BRIEFING'}
              </div>
              <div
                className={`mt-0.5 text-2xl font-black tracking-wide ${
                  banner.kind === 'warn'
                    ? 'text-[#ff7863]'
                    : banner.kind === 'spell'
                      ? 'text-[#f7d994]'
                      : banner.kind === 'spellResult' && banner.captured
                        ? 'text-[#6ee7b7]'
                        : 'text-[#fff6e5]'
                }`}
              >
                {banner.title}
              </div>
              {banner.sub && (
                <div className="mt-1 font-mono text-xs tracking-wider text-[#d8cbb8]">
                  {banner.sub}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TITLE SCREEN ==================== */}
        {screen === 'title' && (
          <div className="absolute inset-0 overflow-y-auto bg-[#0c0a08]/95 px-4 py-5 sm:px-6">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
              {/* Top system header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#332b21] pb-2.5">
                <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-[#dfb15b]">
                  <span className="inline-block h-2 w-2 bg-[#dfb15b]" />
                  <span>SYS // SHACHIKU-STG NEO</span>
                </div>
                <AudioToggle variant="full" />
              </div>

              {/* Title Emblem Banner */}
              <div className="relative overflow-hidden border border-[#463a2c] bg-gradient-to-b from-[#1f1912] to-[#120f0b] p-4 text-center shadow-[0_8px_30px_rgba(0,0,0,0.65)]">
                <div className="font-mono text-[10px] font-bold tracking-[0.35em] text-[#83b8ac]">
                  CORPORATE BARRAGE TACTICAL SHOOTER
                </div>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-[#fff6e5] sm:text-4xl">
                  社畜<span className="text-[#dfb15b]">シューティング</span>
                  <span className="ml-1 text-[#7bc4b5]">NEO</span>
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#b7a992]">
                  全6ステージ＋無限残業ループ。弾幕をかすめてグレイズを稼ぎ、
                  <br className="hidden sm:inline" />
                  上部回収ラインとスペルカード完全取得で歴代最高査定を叩き出せ。
                </p>
                {/* Stage route preview strip */}
                <div className="mt-3 grid grid-cols-6 gap-1 border-t border-[#2e261d] pt-2.5 text-center font-mono text-[9px]">
                  {STAGES.map((st, idx) => (
                    <div
                      key={st.name}
                      className="border border-[#2e261d] bg-[#0e0c09] px-1 py-1 text-[#b7a992]"
                    >
                      <div className="font-bold text-[#dfb15b]">ST.{idx + 1}</div>
                      <div className="truncate text-[8px]">{st.boss}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weapon Loadout Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px] font-bold tracking-wider text-[#dfb15b]">
                  <span>ARMAMENT SELECT // 兵装選択</span>
                  <span className="text-[10px] text-[#968771]">プレイ中 [C] または画面左下でも切替可</span>
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
                        className={`flex items-center gap-3 border p-2.5 text-left transition ${
                          active
                            ? 'border-[#dfb15b] bg-[#251e15] shadow-[inset_0_0_0_1px_#dfb15b]'
                            : 'border-[#332b21] bg-[#15120e] hover:border-[#544636] hover:bg-[#1c1813]'
                        }`}
                      >
                        <WeaponDiagram id={w.id} active={active} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-black text-[#fff6e5]">{w.name}</span>
                            <span className="font-mono text-[9px] text-[#dfb15b]">{meta.code}</span>
                          </div>
                          <div className="text-[11px] text-[#c7b9a3]">{meta.role}</div>
                          <div className="mt-1 flex items-center gap-3 font-mono text-[9px] text-[#968771]">
                            <span className="inline-flex items-center gap-1">
                              威力 <StatDots value={meta.pwr} />
                            </span>
                            <span className="inline-flex items-center gap-1">
                              範囲 <StatDots value={meta.rng} />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] font-bold tracking-wider text-[#7bc4b5]">
                  WORKLOAD // 勤務形態（難易度）
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((d) => {
                    const active = difficulty === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          shmupSound.ui();
                          setDifficulty(d.id);
                        }}
                        className={`flex min-h-16 flex-col justify-between border p-2.5 text-left transition ${
                          active
                            ? 'border-[#7bc4b5] bg-[#132420] shadow-[inset_0_0_0_1px_#7bc4b5]'
                            : 'border-[#332b21] bg-[#15120e] hover:border-[#4b4032]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-black text-[#fff6e5]">{d.name}</span>
                          <span className="font-mono text-[10px] font-bold text-[#7bc4b5]">
                            x{d.score.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] leading-snug text-[#b7a992]">{d.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sortie & Continue CTAs */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => startRun()}
                  className="flex min-h-13 w-full items-center justify-center gap-2 border-2 border-[#f2e9d8] bg-[#b23a2a] py-3 text-lg font-black tracking-wider text-[#fff6e5] shadow-[4px_4px_0_#f2e9d8] transition hover:bg-[#c94b38] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#f2e9d8]"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <polygon points="4,2 18,10 4,18" />
                  </svg>
                  <span>出社する // SORTIE</span>
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
                    className="flex min-h-11 w-full items-center justify-between border border-[#12100d] bg-[#dfb15b] px-4 py-2.5 font-bold text-[#12100d] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#e8c373]"
                  >
                    <span className="text-sm font-black">
                      途中出社 // CONTINUE STAGE {continueSave.stage}
                    </span>
                    <span className="font-mono text-xs">
                      {continueSave.score.toLocaleString()} PTS / Lv.{continueSave.weaponLevel}
                    </span>
                  </button>
                )}
              </div>

              {/* High Score Ranking */}
              {scores.length > 0 && (
                <div className="border border-[#332b21] bg-[#14110d] p-3">
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] font-bold tracking-wider text-[#dfb15b]">
                    <span>HALL OF OVERWORK // 歴代社畜番付</span>
                    <span className="text-[10px] text-[#8a7d69]">TOP 5</span>
                  </div>
                  <div className="divide-y divide-[#29221a] text-xs">
                    {scores.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={` inline-flex h-5 w-5 items-center justify-center font-mono text-[11px] font-bold ${
                              i === 0
                                ? 'bg-[#dfb15b] text-[#12100d]'
                                : 'bg-[#241e17] text-[#b7a992]'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="font-bold text-[#f2e9d8]">{s.rank}</span>
                          <span className="font-mono text-[11px] text-[#8a7d69]">
                            STAGE {s.stage}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[#f5cf76] tabular-nums">
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
                  className="min-h-11 flex-1 border border-[#3b3328] bg-[#16130f] px-3 py-2 font-bold tracking-wider hover:border-[#dfb15b]"
                >
                  {showHelp ? 'マニュアルを閉じる' : '業務マニュアル // HOW TO PLAY'}
                </button>
                <button
                  type="button"
                  onClick={toggleShake}
                  className="min-h-11 border border-[#3b3328] bg-[#16130f] px-4 py-2 font-mono text-xs font-bold hover:border-[#dfb15b]"
                >
                  画面振動: {shake ? 'ON' : 'OFF'}
                </button>
              </div>

              {showHelp && (
                <div className="grid grid-cols-1 gap-2 border border-[#3b3328] bg-[#15120e] p-3.5 text-left text-xs leading-relaxed text-[#dfd3c0] sm:grid-cols-2">
                  <div>
                    <div className="font-mono text-[10px] font-bold text-[#dfb15b]">
                      NAVIGATION // 移動・精密回避
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#b7a992]">
                      マウスはカーソル追従（右ボタンで低速＋コア判定表示）。タッチは指の相対移動で自機が隠れません。キーボードはWASD/矢印＋Shiftで低速移動。
                    </p>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-bold text-[#dfb15b]">
                      ARMAMENT & BOMB // 攻撃・決裁印ボム
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#b7a992]">
                      ショットは自動発射。Cキーまたは左下ボタンで4種の兵装を即時切替。Xキーまたは右下ボタンで敵弾一掃＋無敵の決裁印ボムを発動。
                    </p>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-bold text-[#7bc4b5]">
                      COLLECT LINE // 自動アイテム回収
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#b7a992]">
                      画面上部（Y=250より上）へ前進すると全アイテムを高速吸引。ボス撃破・フェーズ突破・ステージ終了・ボム発動時も全自動回収されます。
                    </p>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-bold text-[#f0937e]">
                      SPELL CARD // スペルカード取得
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#b7a992]">
                      ボスは3段階フェーズ制。後半2段階のスペルカードを被弾・ボムなしで突破すると高得点スペルボーナスを獲得します。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== PAUSE MODAL ==================== */}
        {screen === 'paused' && !fatal && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0c0a08]/90 p-6">
            <div className="flex w-full max-w-sm flex-col gap-4 border border-[#4a3e30] bg-[#15120e] p-5 text-center shadow-[0_16px_48px_rgba(0,0,0,0.85)]">
              <div className="font-mono text-[10px] font-bold tracking-[0.3em] text-[#dfb15b]">
                INTERMISSION // 業務一時停止
              </div>
              <div className="text-2xl font-black text-[#fff6e5]">休憩中</div>

              <div className="grid grid-cols-3 gap-2 border border-[#2e261d] bg-[#0e0c09] p-2.5 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-[#8a7d69]">STAGE</div>
                  <div className="font-bold text-[#f2e9d8]">{hud.stage}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8a7d69]">SCORE</div>
                  <div className="font-bold text-[#f5cf76]">{hud.score.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8a7d69]">SPELL GET</div>
                  <div className="font-bold text-[#7bc4b5]">{hud.spellsCaptured}</div>
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
                  className="min-h-12 w-full border border-[#f2e9d8] bg-[#b23a2a] py-3 font-black tracking-wider text-white shadow-[3px_3px_0_#f2e9d8] hover:bg-[#c94b38]"
                >
                  業務再開 // RESUME
                </button>
                <button
                  type="button"
                  onClick={() => startRun()}
                  className="min-h-11 w-full border border-[#4a3e30] bg-[#241e17] py-2.5 text-sm font-bold text-[#f2e9d8] hover:border-[#dfb15b]"
                >
                  STAGE 1から再出社
                </button>
                <button
                  type="button"
                  onClick={() => {
                    shmupSound.ui();
                    destroyEngine();
                    setContinueSave(loadContinue());
                    setScreen('title');
                  }}
                  className="min-h-11 w-full border border-[#332b21] bg-[#181410] py-2.5 text-sm text-[#b7a992] hover:text-white"
                >
                  タイトルへ戻る
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== RESULT SCREEN ==================== */}
        {screen === 'result' && result && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-[#0c0a08]/95 p-5">
            <div className="flex w-full max-w-md flex-col gap-4 border border-[#4a3e30] bg-[#15120e] p-5 text-center shadow-[0_16px_48px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between border-b border-[#2e261d] pb-2 font-mono text-[10px] tracking-widest text-[#9c8d77]">
                <span>PERFORMANCE EVALUATION // 業務査定書</span>
                <span>[{difficultyDef(result.difficulty).name}]</span>
              </div>

              <div>
                <div
                  className={`inline-block border px-3 py-0.5 font-mono text-xs font-black tracking-widest ${
                    result.cleared
                      ? 'border-[#6ee7b7] bg-[#0f2922] text-[#6ee7b7]'
                      : 'border-[#e07054] bg-[#2b1410] text-[#f0937e]'
                  }`}
                >
                  {result.cleared ? 'ALL 6 STAGES CLEARED' : 'MISSION TERMINATED'}
                </div>
                <div className="mt-1.5 text-3xl font-black tracking-wide text-[#fff6e5]">
                  {result.cleared ? '定時退社達成' : '過労撃墜'}
                </div>
              </div>

              {/* Rank & Final Score Box */}
              <div className="border border-[#dfb15b]/40 bg-[#0e0c09] p-3.5">
                <div className="font-mono text-[10px] tracking-widest text-[#b7a992]">
                  認定社畜称号
                </div>
                <div className="mt-0.5 text-2xl font-black text-[#dfb15b]">{result.rank}</div>
                <div className="mt-2 font-mono text-2xl font-black text-[#fff6e5] tabular-nums">
                  {result.score.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-[#8a7d69]">PTS</span>
                </div>
              </div>

              {/* 6-cell Telemetry Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="border border-[#2e261d] bg-[#0e0c09] p-2">
                  <div className="font-mono text-[10px] text-[#8a7d69]">到達STAGE</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-[#f2e9d8]">
                    STAGE {result.stage}
                  </div>
                </div>
                <div className="border border-[#2e261d] bg-[#0e0c09] p-2">
                  <div className="font-mono text-[10px] text-[#8a7d69]">最大CHAIN</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-[#f5cf76]">
                    {result.maxChain}連
                  </div>
                </div>
                <div className="border border-[#2e261d] bg-[#0e0c09] p-2">
                  <div className="font-mono text-[10px] text-[#8a7d69]">撃破数</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-[#f2e9d8]">
                    {result.kills}機
                  </div>
                </div>
                <div className="border border-[#2e261d] bg-[#0e0c09] p-2">
                  <div className="font-mono text-[10px] text-[#8a7d69]">GRAZE</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-[#7bc4b5]">
                    {result.graze}
                  </div>
                </div>
                <div className="border border-[#2e261d] bg-[#0e0c09] p-2">
                  <div className="font-mono text-[10px] text-[#8a7d69]">SPELL取得</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-[#6ee7b7]">
                    {result.spells}枚
                  </div>
                </div>
                <div className="border border-[#2e261d] bg-[#0e0c09] p-2">
                  <div className="font-mono text-[10px] text-[#8a7d69]">勤務時間</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-[#f2e9d8]">
                    {Math.floor(result.timeMs / 60000)}m
                    {String(Math.floor((result.timeMs % 60000) / 1000)).padStart(2, '0')}s
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startRun()}
                  className="min-h-12 w-full border border-[#f2e9d8] bg-[#b23a2a] py-3 font-black tracking-wider text-white shadow-[3px_3px_0_#f2e9d8] hover:bg-[#c94b38]"
                >
                  再出社する // RETRY
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="min-h-11 border border-[#7bc4b5] bg-[#132420] py-2.5 text-xs font-bold tracking-wider text-[#7bc4b5] hover:bg-[#1a332d]"
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
                    className="min-h-11 border border-[#3b3328] bg-[#1c1813] py-2.5 text-xs font-bold text-[#d8cbb8] hover:border-[#dfb15b]"
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
