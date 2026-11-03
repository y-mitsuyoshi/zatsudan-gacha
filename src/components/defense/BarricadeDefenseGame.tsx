'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DefenseEngine, type HudSnapshot, type ShopSnapshot, type RunResult } from '@/game/defense/engine';
import { DefenseSound } from '@/game/defense/audio';
import {
  WEAPONS, ENEMIES, COURSES, COURSE_ORDER, DIFFICULTIES, DIFFICULTY_ORDER, SHOP, MAX_ALLIES,
  ACHIEVEMENTS, PERKS,
  type CourseId, type Difficulty, type EnemyKind, type WeaponId,
} from '@/game/defense/config';
import {
  loadSettings, saveSettings, loadRecords, saveRecord, loadProgress, saveProgress,
  type RecordEntry, type Progress,
} from '@/game/defense/storage';
import { AudioToggle, useBgm } from '@/components/game/AudioToggle';

type Screen = 'title' | 'playing' | 'shop' | 'paused' | 'result';

const DEFAULT_HUD: HudSnapshot = {
  score: 0, coins: 0, wave: 1, totalWaves: 5, endless: 0, combo: 0,
  weapon: 'pistol', weaponT: 0, baseHp: 100, baseMax: 100,
  wallHp: 140, wallMax: 140, allies: 0, kills: 0,
  bossHp: 0, bossMax: 0, fps: 60, waveActive: false, distLeft: 0, distTotal: 1,
  runDmgMul: 1, lastGate: '', gaugeName: '',
};

const ENEMY_ORDER: EnemyKind[] = ['runner', 'walker', 'brute', 'shield', 'kamikaze', 'boss'];

interface CourseSignTheme {
  code: string;
  num: string;
  mark: string;
  lineHex: string;
  ringClass: string;
  badgeClass: string;
  barClass: string;
}

const COURSE_THEME: Record<CourseId, CourseSignTheme> = {
  city: {
    code: 'JY',
    num: '01',
    mark: '山手',
    lineHex: '#22c55e',
    ringClass: 'border-emerald-500 text-emerald-300 bg-emerald-950/80',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    barClass: 'bg-emerald-500',
  },
  desert: {
    code: 'JC',
    num: '02',
    mark: '中央',
    lineHex: '#f97316',
    ringClass: 'border-orange-500 text-orange-300 bg-orange-950/80',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    barClass: 'bg-orange-500',
  },
  snow: {
    code: 'M',
    num: '03',
    mark: '地下',
    lineHex: '#06b6d4',
    ringClass: 'border-cyan-400 text-cyan-200 bg-cyan-950/80',
    badgeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    barClass: 'bg-cyan-400',
  },
  rain: {
    code: 'JB',
    num: '04',
    mark: '豪雨',
    lineHex: '#3b82f6',
    ringClass: 'border-blue-400 text-blue-200 bg-blue-950/80',
    badgeClass: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
    barClass: 'bg-blue-400',
  },
  tunnel: {
    code: 'TY',
    num: '05',
    mark: '終電',
    lineHex: '#ef4444',
    ringClass: 'border-red-500 text-red-200 bg-red-950/80',
    badgeClass: 'bg-red-500/20 text-red-200 border-red-500/40',
    barClass: 'bg-red-500',
  },
};

function resultRank(result: RunResult, difficulty: Difficulty): { rank: string; label: string; color: string } {
  const cleared = result.victory || result.courseCleared;
  if (cleared && difficulty === 'hard') return { rank: 'S', label: '模範社畜・特待出社', color: 'border-amber-300 bg-amber-400 text-slate-950' };
  if (cleared && result.endless > 0) return { rank: 'S', label: '深夜残業の覇者', color: 'border-rose-300 bg-rose-500 text-white' };
  if (cleared) return { rank: 'A', label: '定時出社達成', color: 'border-emerald-300 bg-emerald-500 text-slate-950' };
  if (result.score >= 8000) return { rank: 'B', label: '改札前まで到達', color: 'border-cyan-300 bg-cyan-500 text-slate-950' };
  return { rank: 'C', label: '要・再出社申請', color: 'border-slate-500 bg-slate-700 text-slate-100' };
}

/* ---------------- custom SVG icons (zero emojis) ---------------- */

function WeaponSvgIcon({ weaponId }: { weaponId: WeaponId }) {
  switch (weaponId) {
    case 'pistol':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 2v15a2.5 2.5 0 0 1-5 0" />
          <path d="M12 4l4 10H8L12 4z" />
        </svg>
      );
    case 'smg':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="6" width="14" height="9" rx="1.5" />
          <path d="M7 10h6M7 12.5h4" />
          <path d="M17 9h4v9H9v-3" />
        </svg>
      );
    case 'shotgun':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M3 12h18" />
        </svg>
      );
    case 'rifle':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M6 12h12M14 9l4 3-4 3" />
        </svg>
      );
    case 'launcher':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 15h11l5-3-5-3H4v6z" />
          <path d="M4 18h16M7 12v3" />
        </svg>
      );
    case 'freeze':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1M2 12h20" />
        </svg>
      );
  }
}

function ShopSvgIcon({ id }: { id: string }) {
  switch (id) {
    case 'repair':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" />
        </svg>
      );
    case 'wall':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="1.5" />
          <path d="M3 10h18M3 15h18M9 5v5M15 5v5M12 10v5M7 15v4M17 15v4" />
        </svg>
      );
    case 'power':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" />
        </svg>
      );
    case 'ally':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="9" cy="7" r="3" />
          <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20" />
          <circle cx="17" cy="8" r="2.5" />
          <path d="M17.5 14.5A4 4 0 0 1 21 18.5V20" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4 3 19h18L12 4z" />
          <rect x="9" y="13" width="6" height="6" />
        </svg>
      );
  }
}

/* ---------------- HUD subcomponents ---------------- */

function BarricadeIntegrityBar({ wallHp, wallMax }: { wallHp: number; wallMax: number }) {
  const ratio = wallMax > 0 ? wallHp / wallMax : 0;
  let statusText = '堅牢';
  let barColor = 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]';
  let badgeColor = 'text-cyan-200 bg-cyan-950/80 border-cyan-500/40';

  if (ratio <= 0) {
    statusText = '崩壊！';
    barColor = 'bg-slate-600';
    badgeColor = 'text-slate-300 bg-slate-900 border-slate-600';
  } else if (ratio < 0.3) {
    statusText = '警報！';
    barColor = 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.85)]';
    badgeColor = 'text-red-200 bg-red-950/90 border-red-500/60 animate-pulse';
  } else if (ratio < 0.7) {
    statusText = '亀裂';
    barColor = 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.65)]';
    badgeColor = 'text-amber-200 bg-amber-950/80 border-amber-500/50';
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <span>バリケード耐久</span>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black border ${badgeColor}`}>
            {statusText}
          </span>
        </div>
        <span className="font-mono font-bold text-xs text-slate-100">{wallHp} / {wallMax}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-sm bg-slate-950 border border-slate-700/80 p-0.5">
        <div
          className={`h-full rounded-xs transition-all duration-150 ${barColor}`}
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
    <div className="flex flex-1 min-w-[168px] items-center gap-2 rounded-lg bg-slate-900/95 px-2.5 py-1.5 border border-cyan-500/40 shadow-sm">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center text-amber-300">
        <svg className="absolute inset-0 -rotate-90" width="32" height="32">
          <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="2.5" />
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke={isTimed ? '#f59e0b' : '#22c55e'}
            strokeWidth="2.5"
            strokeDasharray={2 * Math.PI * 13}
            strokeDashoffset={2 * Math.PI * 13 * (1 - frac)}
            strokeLinecap="round"
          />
        </svg>
        <WeaponSvgIcon weaponId={weaponId} />
      </div>
      <div className="flex flex-1 flex-col leading-tight">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-black text-white">{w.name}</span>
          <span className="text-[10px] font-mono font-bold text-amber-300">
            {isTimed ? `${Math.ceil(durationLeft)}s` : '常時'}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-700">
          <div
            className={`h-full transition-all duration-100 ${isTimed ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{ width: `${frac * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function RouteTransitMonitor({ hud, courseId }: { hud: HudSnapshot; courseId: CourseId }) {
  const theme = COURSE_THEME[courseId];
  const progressPct = Math.max(0, Math.min(100, ((hud.distTotal - hud.distLeft) / (hud.distTotal || 1)) * 100));
  const isPositiveGate =
    hud.lastGate.includes('+') ||
    hud.lastGate.includes('×') ||
    hud.lastGate.includes('回復') ||
    hud.lastGate.includes('反転');

  return (
    <div className="mb-2.5 rounded-xl border-2 border-slate-700/90 bg-[#0f1520] p-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
      {/* Top Station Signboard Strip */}
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-6 items-center gap-1 rounded border-2 px-1.5 font-mono text-[11px] font-black ${theme.ringClass}`}>
            <span>{theme.code}</span>
            <span className="opacity-80">{theme.num}</span>
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide text-slate-100">{COURSES[courseId].name}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300 border border-slate-700">
                WAVE {hud.wave}/{hud.totalWaves}
              </span>
              {hud.endless > 0 && (
                <span className="rounded bg-rose-950/90 px-1.5 py-0.5 font-mono text-[10px] font-black text-rose-300 border border-rose-500/40">
                  深夜残業+{hud.endless}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="text-right">
            <span className="block text-[9px] text-slate-400 leading-none">SCORE</span>
            <span className="font-black text-slate-100">{hud.score.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] text-amber-400/80 leading-none">残業代</span>
            <span className="font-black text-amber-300">{hud.coins}</span>
          </div>
        </div>
      </div>

      {/* Top Highway Progress Tracker: START (自宅駅) to GOAL (本社ビル) */}
      <div className="mb-2.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5">
        <div className="mb-1 flex items-center justify-between text-[10px] font-black">
          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">START (自宅駅)</span>
          <span className="font-mono text-xs font-black text-emerald-300">
            残り {hud.distLeft}m
          </span>
          <span className="rounded bg-amber-950/90 border border-amber-500/40 px-1.5 py-0.5 font-mono text-amber-300">
            GOAL (本社ビル)
          </span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-slate-900 border border-slate-700/90 overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ${theme.barClass}`}
            style={{ width: `${progressPct}%` }}
          />
          {/* Gate & Boss highway markers */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5">
            {Array.from({ length: hud.totalWaves + 1 }).map((_, idx) => {
              const isBossNode = idx === hud.totalWaves;
              const nodePct = (idx / Math.max(1, hud.totalWaves)) * 100;
              const passed = progressPct >= nodePct - 1;
              return (
                <span
                  key={idx}
                  className={`flex items-center justify-center rounded-full border font-mono text-[7px] font-black ${
                    isBossNode
                      ? 'h-3 w-3 bg-red-600 border-amber-300 text-white'
                      : passed
                        ? 'h-2 w-2 bg-cyan-300 border-slate-950'
                        : 'h-2 w-2 bg-slate-800 border-slate-500'
                  }`}
                >
                  {isBossNode ? 'B' : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center-Top Squad & Firepower Callouts */}
      <div className="mb-2.5 grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded-lg border-2 border-cyan-400/70 bg-cyan-950/75 px-3 py-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[9px] font-black tracking-wider text-cyan-300">SQUAD SIZE</span>
            <span className="text-xs font-black text-white">部隊規模: {1 + hud.allies}人</span>
          </div>
          <span className="rounded-md bg-cyan-400/20 border border-cyan-300/50 px-2 py-0.5 font-mono text-sm font-black text-cyan-200">
            {1 + hud.allies}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border-2 border-amber-400/70 bg-amber-950/75 px-3 py-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[9px] font-black tracking-wider text-amber-300">FIREPOWER</span>
            <span className="text-xs font-black text-white">火力倍率: ×{hud.runDmgMul.toFixed(1)}</span>
          </div>
          <span className="rounded-md bg-amber-400/20 border border-amber-300/50 px-2 py-0.5 font-mono text-sm font-black text-amber-200">
            ×{hud.runDmgMul.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Dual Vital Bars: Barricade & Squad HP */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-2.5">
        <BarricadeIntegrityBar wallHp={hud.wallHp} wallMax={hud.wallMax} />

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-rose-300">社畜メンタル（体力）</span>
            <span className="font-mono font-bold text-xs text-slate-100">{hud.baseHp} / {hud.baseMax}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-sm bg-slate-950 border border-slate-700/80 p-0.5">
            <div
              className="h-full rounded-xs bg-rose-500 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (hud.baseHp / (hud.baseMax || 1)) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Tactical Strip: Active Weapon + Timer Bar & Combo */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
        <WeaponRing weaponId={hud.weapon} durationLeft={hud.weaponT} />

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end rounded-md bg-slate-900 px-2.5 py-1 border border-slate-800 font-mono text-[10px] font-bold leading-tight">
            <span className="text-amber-300">{hud.combo} 連撃</span>
            <span className="text-slate-400">{hud.kills} 撃破</span>
          </div>
        </div>
      </div>

      {/* Animated Last Gate Feedback Banner */}
      {hud.lastGate && (
        <div
          key={hud.lastGate}
          className={`mt-2 flex items-center justify-center gap-2 rounded-md border px-3 py-1 text-xs font-black shadow-sm transition-all ${
            isPositiveGate
              ? 'border-cyan-400/70 bg-cyan-950/85 text-cyan-200'
              : 'border-rose-500/70 bg-rose-950/85 text-rose-200'
          }`}
        >
          <span className="rounded bg-slate-950/80 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
            増員マルチプライヤーゲート
          </span>
          <span>{hud.lastGate}</span>
        </div>
      )}

      {/* Boss Express Train Approaching Alert Bar */}
      {hud.bossMax > 0 && (
        <div className="mt-2 rounded-md border border-red-500/60 bg-red-950/70 p-2 text-xs">
          <div className="mb-1 flex items-center justify-between font-black text-red-200">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400 animate-ping" />
              <span>臨時急行：満員電車 (BOSS)</span>
            </span>
            <span className="font-mono">{Math.ceil(hud.bossHp)} / {Math.ceil(hud.bossMax)}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-sm bg-slate-950 border border-red-500/40">
            <div
              className="h-full bg-red-500 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / hud.bossMax) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 実績アンロック判定。新規解除のID一覧を返す。 */
function evalAchievements(r: RunResult, p: Progress, records: RecordEntry[]): string[] {
  const has = new Set(p.achievements);
  const give: string[] = [];
  const cleared = r.victory || r.courseCleared;
  const grant = (id: string, cond: boolean) => {
    if (cond && !has.has(id)) {
      give.push(id);
      has.add(id);
    }
  };
  grant('first_run', true);
  grant('first_win', cleared);
  grant('boss', r.bossKills > 0);
  grant('nakama', r.maxAllies >= 3);
  grant('combo50', r.maxCombo >= 50);
  grant('combo100', r.maxCombo >= 100);
  grant('scorer', r.score >= 10000);
  grant('endless', r.endless > 0);
  grant('veteran', p.totalRuns >= 10);
  grant('slayer', p.totalKills >= 1000);
  grant('rich', p.coins >= 1000);
  const won = new Set([
    ...(p.clearedCourses ?? []),
    ...records.filter((x) => x.victory).map((x) => x.course),
  ]);
  grant('all_course', won.size >= COURSE_ORDER.length);
  if (give.length > 0) p.achievements = Array.from(has);
  return give;
}

export default function BarricadeDefenseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DefenseEngine | null>(null);
  const soundRef = useRef<DefenseSound | null>(null);
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
  const [shake, setShake] = useState(true);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [bank, setBank] = useState(0);
  const [prog, setProg] = useState<Progress | null>(null);
  const [newAch, setNewAch] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [runMeta, setRunMeta] = useState<{ course: CourseId; difficulty: Difficulty }>({ course: 'city', difficulty: 'normal' });

  // Shared BGM integration: menu track on title/result, boss track when boss active, battle track otherwise
  const bgmTrack =
    screen === 'title' || screen === 'result'
      ? 'shachiku-menu'
      : hud.bossMax > 0 && hud.bossHp > 0
        ? 'defense-boss'
        : 'defense-battle';
  useBgm(bgmTrack, screen === 'paused');

  useEffect(() => {
    const s = loadSettings();
    setShake(s.shake);
    setRecords(loadRecords());
    const p = loadProgress();
    setProg(p);
    setBank(p.coins);
    setShowHelp(p.totalRuns === 0);
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

  useEffect(() => {
    return () => {
      destroyEngine();
      soundRef.current?.dispose();
    };
  }, [destroyEngine]);

  const finishRun = useCallback((r: RunResult, c: CourseId, d: Difficulty) => {
    const cleared = r.victory || r.courseCleared;
    const entry: RecordEntry = {
      score: r.score, course: c, difficulty: d, wave: r.wave, victory: cleared, date: Date.now(),
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
    if (cleared) {
      p.clearedCourses = p.clearedCourses ?? [];
      if (!p.clearedCourses.includes(c)) p.clearedCourses.push(c);
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
    sound.unlock();
    const p = loadProgress();
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
    const latest = loadProgress();
    setProg(latest);
    setBank(latest.coins);
    changeScreen('title');
  }, [destroyEngine, changeScreen]);

  const isLowVital =
    screen === 'playing' &&
    (hud.baseHp / (hud.baseMax || 1) < 0.3 || hud.wallHp / (hud.wallMax || 1) < 0.2);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center bg-[#0b0e14] px-2 py-3 text-slate-100">
      <div className="w-full max-w-[520px]">
        {/* Station Departure Board Header */}
        <header className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#11161f] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-emerald-500/60 bg-emerald-950 font-mono text-[11px] font-black text-emerald-300">
              駅
            </span>
            <div>
              <p className="text-sm font-black tracking-wide text-slate-100 leading-tight">社畜通勤サバイバー</p>
              <p className="font-mono text-[9px] font-bold tracking-widest text-amber-400/90">社畜スクワッド・ハイウェイ防衛戦</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <AudioToggle variant="compact" />
            <button
              type="button"
              onClick={toggleShake}
              aria-pressed={shake}
              className={`min-h-[36px] rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                shake
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:bg-slate-800'
              }`}
              aria-label="画面揺れ切替"
            >
              {shake ? '揺れON' : '揺れOFF'}
            </button>
            {screen === 'playing' && (
              <button
                type="button"
                onClick={pauseGame}
                className="min-h-[36px] rounded-full border border-amber-500/50 bg-amber-950/70 px-3 py-1 text-[11px] font-black text-amber-200 transition hover:bg-amber-900/80"
                aria-label="一時停止"
              >
                一時停止
              </button>
            )}
          </div>
        </header>

        {/* Transit LCD Monitor HUD */}
        {(screen === 'playing' || screen === 'paused' || screen === 'shop') && (
          <RouteTransitMonitor hud={hud} courseId={runMeta.course} />
        )}

        {/* 3D Viewport Stage */}
        <div
          ref={stageRef}
          className={`relative overflow-hidden rounded-xl border bg-[#0b0e14] transition-shadow ${
            isLowVital
              ? 'border-red-500/80 ring-2 ring-red-500/40 shadow-[0_0_24px_rgba(239,68,68,0.35)]'
              : 'border-slate-700/90 shadow-2xl'
          } cursor-crosshair`}
          style={{ aspectRatio: '3 / 5' }}
          onPointerDown={onPointer}
          onPointerMove={onPointer}
        >
          <canvas ref={canvasRef} className="h-full w-full touch-none select-none" width={480} height={800} />

          {/* LED Station Announcement Banner */}
          {banner && screen === 'playing' && (
            <div
              key={banner.key}
              className="pointer-events-none absolute inset-x-4 top-5 rounded-lg border-2 border-amber-400/70 bg-slate-950/92 px-4 py-2.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.75)]"
            >
              <div className="mb-0.5 flex items-center justify-center gap-1.5 font-mono text-[9px] font-black tracking-widest text-amber-400">
                <span>STATION ANNOUNCEMENT</span>
              </div>
              <p className="text-base font-black text-white">{banner.title}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-300">{banner.sub}</p>
            </div>
          )}

          {/* Bottom Touch Steering Guide Rail during active play */}
          {screen === 'playing' && (
            <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-center justify-between rounded-full border border-white/15 bg-slate-950/65 px-3 py-1 text-[10px] font-mono font-bold text-slate-300 backdrop-blur-xs">
              <span>&lt;&lt; LEFT</span>
              <span className="text-emerald-300">ドラッグ／タップで車線変更・自動射撃・接触回収</span>
              <span>RIGHT &gt;&gt;</span>
            </div>
          )}

          {screen === 'title' && prog && (
            <TitleOverlay
              course={course}
              setCourse={setCourse}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              bank={bank}
              records={records}
              prog={prog}
              showHelp={showHelp}
              setShowHelp={setShowHelp}
              onStart={() => startRun(course, difficulty)}
              onBuyPerk={buyPerk}
            />
          )}

          {screen === 'shop' && shop && (
            <ShopOverlay
              shop={shop}
              courseId={runMeta.course}
              onBuy={buy}
              onNext={resumeFromShop}
              onEndless={goEndless}
              onFinish={finishVictory}
            />
          )}

          {screen === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-slate-950/92 p-5 text-center backdrop-blur-xs">
              <span className="rounded border border-amber-500/40 bg-amber-950/60 px-2.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-amber-300">
                TEMPORARY HALT
              </span>
              <p className="text-2xl font-black text-white">一時停止（休憩中）</p>
              <div className="w-full max-w-[300px] rounded-lg border border-slate-700 bg-slate-900/90 p-3 text-xs">
                <p className="font-mono font-bold text-emerald-300">
                  {COURSES[runMeta.course].name} ・ WAVE {hud.wave}/{hud.totalWaves}
                </p>
                <p className="mt-1 font-mono text-slate-200">
                  SCORE {hud.score.toLocaleString()} ／ 残業代 {hud.coins}
                </p>
                <p className="mt-0.5 font-mono text-slate-400">
                  同期編成 {1 + hud.allies}名 ／ 撃破 {hud.kills}
                </p>
              </div>

              <AudioToggle variant="full" className="my-1" />

              <p className="max-w-[280px] text-[11px] leading-relaxed text-slate-400">
                画面を左右にドラッグ／タップで移動（PCは ←→ / A D）。段ボールやSOSケージは射撃破壊だけでなく直接触れても回収できます。
              </p>

              <div className="mt-1 flex w-full max-w-[280px] flex-col gap-2">
                <button
                  type="button"
                  onClick={resumeGame}
                  className="min-h-[46px] w-full rounded-lg border border-emerald-400 bg-emerald-600 py-2.5 text-sm font-black text-white shadow-lg transition hover:bg-emerald-500"
                >
                  通勤を再開する
                </button>
                <button
                  type="button"
                  onClick={quitToTitle}
                  className="min-h-[46px] w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
                >
                  タイトルに戻る
                </button>
              </div>
            </div>
          )}

          {screen === 'result' && result && (
            <ResultOverlay
              result={result}
              meta={runMeta}
              records={records}
              newAch={newAch}
              onRetry={() => startRun(runMeta.course, runMeta.difficulty)}
              onTitle={quitToTitle}
            />
          )}
        </div>

        <p className="mt-2 text-center text-[11px] font-medium text-slate-400">
          左右ドラッグ／タップで移動（PC: ←→ / A D）・増員マルチプライヤーゲートを射撃強化・撃ち抜きナンバーバレルで武装補給
        </p>
      </div>
    </div>
  );
}

/* ---------------- Title Screen (Station Ticket Machine & Route Map UI) ---------------- */

type HandbookTab = 'none' | 'perk' | 'ach' | 'codex';

function TitleOverlay(props: {
  course: CourseId;
  setCourse: (c: CourseId) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  bank: number;
  records: RecordEntry[];
  prog: Progress;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
  onStart: () => void;
  onBuyPerk: (id: 'power' | 'wall' | 'base') => void;
}) {
  const {
    course, setCourse, difficulty, setDifficulty,
    bank, records, prog, showHelp, setShowHelp, onStart, onBuyPerk,
  } = props;
  const [tab, setTab] = useState<HandbookTab>('none');
  const toggle = (t: HandbookTab) => setTab((prev) => (prev === t ? 'none' : t));
  const achCount = prog.achievements.length;
  const activeTheme = COURSE_THEME[course];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#0b0e14]/96 p-3.5 text-slate-100">
      {/* Station Signboard Hero Banner */}
      <div className="relative mb-3 overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-900">
        <Image
          src="/assets/defense_cover.jpg"
          alt="Commuter Defense 3D"
          width={800}
          height={447}
          className="h-28 w-full object-cover brightness-90 contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/65 to-transparent flex flex-col justify-end p-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-300">
              社畜スクワッド・ハイウェイ防衛戦
            </span>
            <span className="font-mono text-[10px] font-bold text-amber-300">
              残業代貯金: {bank.toLocaleString()}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-black tracking-wide text-white drop-shadow">
            社畜通勤サバイバー 〜満員電車を突破せよ〜
          </h2>
        </div>
        {/* Station Color Bottom Bar */}
        <div className={`h-1.5 w-full ${activeTheme.barClass}`} />
      </div>

      {/* 1. Route Line Selection (路線選択案内板) */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-black tracking-wide text-slate-200">1. 通勤路線を選択</span>
        <span className="font-mono text-[10px] text-slate-400">クリアで次の路線が開通</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {COURSE_ORDER.map((c) => {
          const def = COURSES[c];
          const t = COURSE_THEME[c];
          const locked = !prog.unlocked.includes(c);
          const cleared = (prog.clearedCourses?.includes(c) ?? false) || records.some((r) => r.course === c && r.victory);
          const selected = course === c;
          return (
            <button
              key={c}
              type="button"
              disabled={locked}
              aria-pressed={selected}
              onClick={() => setCourse(c)}
              title={def.desc}
              className={`min-h-[84px] flex flex-col items-center justify-between rounded-lg border p-1.5 text-center transition ${
                selected
                  ? 'border-white bg-slate-800 shadow-[0_0_14px_rgba(255,255,255,0.18)]'
                  : 'border-slate-800 bg-slate-900/90 hover:border-slate-600'
              } ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className={`inline-flex h-6 w-full items-center justify-center gap-0.5 rounded border font-mono text-[10px] font-black ${t.ringClass}`}>
                <span>{locked ? 'LOCK' : `${t.code}-${t.num}`}</span>
              </span>
              <p className="mt-1 text-[11px] font-black leading-tight text-slate-100">{def.name}</p>
              <p className="font-mono text-[9px] text-slate-400">{def.waves * 100}m</p>
              <span
                className={`mt-0.5 inline-block w-full rounded px-1 py-0.5 text-[9px] font-black border ${
                  cleared
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : locked
                      ? 'bg-slate-900 text-slate-500 border-slate-800'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {cleared ? '制覇' : locked ? '運休中' : '運行中'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Line Detail Strip */}
      <div className="mt-2 flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-black ${activeTheme.ringClass}`}>
            {activeTheme.code}-{activeTheme.num}
          </span>
          <span className="font-bold text-slate-200">{COURSES[course].desc}</span>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-bold text-slate-400">全{COURSES[course].waves}区間</span>
      </div>

      {/* 2. Difficulty Selection (勤務形態) */}
      <div className="mb-1.5 mt-3 flex items-center justify-between">
        <span className="text-xs font-black tracking-wide text-slate-200">2. 働き方（難易度）</span>
        <span className="font-mono text-[10px] text-slate-400">高難度ほどスコア倍率UP</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((d) => {
          const def = DIFFICULTIES[d];
          const selected = difficulty === d;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={selected}
              onClick={() => setDifficulty(d)}
              className={`min-h-[68px] flex flex-col items-center justify-center rounded-lg border p-2 text-center transition ${
                selected
                  ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'border-slate-800 bg-slate-900/90 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-white">{def.name}</span>
                <span className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                  ×{def.scoreMul}
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-tight text-slate-400">{def.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Commuter Pass Ticket Summary & Start CTA */}
      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-2.5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300">定期券</span>
            <span className="font-black text-white">{COURSES[course].name}</span>
            <span className="font-mono text-slate-400">&gt;&gt;</span>
            <span className="font-black text-emerald-300">本社ビル ({COURSES[course].waves * 100}m)</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-amber-300">{DIFFICULTIES[difficulty].name}勤務</span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="min-h-[50px] w-full rounded-lg border-2 border-emerald-300 bg-emerald-600 py-2.5 text-base font-black tracking-wider text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] transition hover:bg-emerald-500 active:translate-y-0.5"
        >
          改札を通って出社する（START）
        </button>
      </div>

      {/* 3. Shachiku Handbook (社畜手帳) */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-black tracking-wide text-slate-200">3. 社畜手帳・ターミナル</span>
        <span className="font-mono text-[10px] text-slate-400">
          累計 {prog.totalKills}撃破 ／ {prog.totalRuns}出社
        </span>
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className={`min-h-[44px] rounded-lg border font-bold transition ${
            showHelp ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
          }`}
        >
          遊び方
        </button>
        <button
          type="button"
          onClick={() => toggle('perk')}
          className={`min-h-[44px] rounded-lg border font-bold transition ${
            tab === 'perk' ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
          }`}
        >
          恒久強化
        </button>
        <button
          type="button"
          onClick={() => toggle('ach')}
          className={`min-h-[44px] rounded-lg border font-bold transition ${
            tab === 'ach' ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
          }`}
        >
          実績 {achCount}/{ACHIEVEMENTS.length}
        </button>
        <button
          type="button"
          onClick={() => toggle('codex')}
          className={`min-h-[44px] rounded-lg border font-bold transition ${
            tab === 'codex' ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
          }`}
        >
          遭遇図鑑
        </button>
      </div>

      {showHelp && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-[11px] leading-relaxed text-slate-200">
          <p className="font-black text-amber-300">■ 社畜スクワッド・ハイウェイ防衛戦 手引書</p>
          <p><b>1. 車線移動＆一斉射撃</b>: 画面を左右にドラッグ／タップ（PCは ←→ / A D）。分隊全員で弾幕を張りながら前方の群衆やゲートを撃ち抜きます。</p>
          <p><b>2. 増員マルチプライヤーゲート</b>: ゲートは射撃するたびに数値がカウントアップ！赤色（マイナス）のゲートも連射で撃ち抜けば青色（プラス増員）のゲートへ大逆転します。</p>
          <p><b>3. 撃ち抜きナンバーバレル＆SOSケージ</b>: 数字付きバレルやSOSケージは残りカウントを0にするか直接接触で即回収！強力な特殊武装や同期隊員が合流します。</p>
          <p><b>4. 満員電車(BOSS)</b>: 終盤に出現する満員電車の突進攻撃は、予告リングから横に避けて回避。大部隊の集中砲火で突破して本社ビルを目指しましょう。</p>
        </div>
      )}

      {tab === 'perk' && (
        <div className="mt-2 space-y-2 rounded-lg border border-slate-700 bg-slate-900/95 p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-300">恒久スキル強化（全路線で常時発動）</span>
            <span className="font-mono font-bold text-slate-300">所持へそくり: {bank} コイン</span>
          </div>
          {PERKS.map((perk) => {
            const lv = perk.id === 'power' ? prog.powerBonus : perk.id === 'wall' ? prog.wallBonus : prog.baseBonus;
            const maxed = lv >= perk.max;
            const cost = perk.cost(lv);
            const afford = bank >= cost;
            return (
              <div key={perk.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950 p-2 text-xs">
                <div>
                  <p className="font-black text-white">
                    {perk.name} <span className="font-mono text-emerald-300">Lv.{lv}/{perk.max}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">{perk.desc}</p>
                </div>
                <button
                  type="button"
                  disabled={maxed || !afford}
                  onClick={() => onBuyPerk(perk.id)}
                  className={`min-h-[44px] shrink-0 rounded-md border px-3 py-1.5 font-mono text-xs font-black transition ${
                    !maxed && afford
                      ? 'border-amber-400 bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'border-slate-800 bg-slate-900 text-slate-500 opacity-60'
                  }`}
                >
                  {maxed ? 'MAX' : `${cost} コイン`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'ach' && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {ACHIEVEMENTS.map((a) => {
            const got = prog.achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`rounded-md border p-2 text-xs ${
                  got ? 'border-amber-500/50 bg-amber-950/30 text-slate-100' : 'border-slate-800 bg-slate-900/60 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-black">{got ? a.name : '？？？'}</p>
                  <span className={`rounded px-1 py-0.5 font-mono text-[9px] font-bold ${got ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                    {got ? '達成' : '未達成'}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">{got ? a.desc : '条件を満たすと記録されます'}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'codex' && (
        <div className="mt-2 space-y-1 rounded-lg border border-slate-700 bg-slate-900/95 p-2.5">
          {ENEMY_ORDER.map((k) => {
            const def = ENEMIES[k];
            const n = prog.codex[k] ?? 0;
            return (
              <div key={k} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: def.color }} />
                  <span className="font-bold text-slate-200">{n > 0 ? def.name : '？？？'}</span>
                </div>
                <span className="font-mono font-bold text-amber-300">{n > 0 ? `${n.toLocaleString()} 撃破` : '未遭遇'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Top Records Departure Board */}
      {records.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-2.5">
          <p className="mb-1.5 font-mono text-[10px] font-black tracking-wider text-amber-400">
            ■ 歴代出社スコアランキング (TOP 5)
          </p>
          <div className="space-y-1">
            {records.slice(0, 5).map((r, i) => {
              const t = COURSE_THEME[r.course];
              return (
                <div key={`${r.date}-${i}`} className="flex items-center justify-between rounded bg-slate-900 px-2.5 py-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-400">{i + 1}.</span>
                    <span className={`rounded border px-1 py-0.2 font-mono text-[9px] font-black ${t.ringClass}`}>
                      {t.code}
                    </span>
                    <span className="font-bold text-slate-200">
                      {COURSES[r.course].name} ({DIFFICULTIES[r.difficulty].name})
                    </span>
                    {r.victory && (
                      <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-black text-emerald-300">
                        出社済
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-amber-300">{r.score.toLocaleString()} pt</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Shop Screen (Station Kiosk / Intermission UI) ---------------- */

function ShopOverlay(props: {
  shop: ShopSnapshot;
  courseId: CourseId;
  onBuy: (id: string) => void;
  onNext: () => void;
  onEndless: () => void;
  onFinish: () => void;
}) {
  const { shop, courseId, onBuy, onNext, onEndless, onFinish } = props;
  const theme = COURSE_THEME[courseId];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#0b0e14]/96 p-4 text-slate-100">
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-center">
        <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-black ${theme.ringClass}`}>
          {theme.code}-{theme.num} {COURSES[courseId].name}
        </span>
        <h2 className="mt-1 text-xl font-black text-white">
          {shop.victory ? '本社ビル改札 到達（定時出社）！' : '駅ナカ購買部（区間補給）'}
        </h2>
        <div className="mt-2 grid grid-cols-4 gap-1.5 rounded bg-slate-950 p-2 font-mono text-[11px]">
          <div>
            <span className="block text-[9px] text-slate-400">残業代</span>
            <span className="font-black text-amber-300">{shop.coins}</span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400">ガード</span>
            <span className="font-black text-cyan-300">{shop.wallHp}/{shop.wallMax}</span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400">体力</span>
            <span className="font-black text-rose-300">{shop.baseHp}/{shop.baseMax}</span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-400">同期</span>
            <span className="font-black text-emerald-300">{shop.allies}/{MAX_ALLIES}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {SHOP.map((item) => {
          const cost = shop.costs[item.id] ?? 0;
          const afford = shop.coins >= cost;
          const maxed =
            (item.id === 'ally' && shop.allies >= MAX_ALLIES) ||
            (item.id === 'repair' && shop.wallHp >= shop.wallMax) ||
            (item.id === 'heal' && shop.baseHp >= shop.baseMax);
          const extra = item.id === 'power' ? ` (Lv.${shop.powerLv})` : item.id === 'wall' ? ` (Lv.${shop.wallLv})` : '';
          const buttonLabel = maxed ? '充足済' : !afford ? `${cost} (不足)` : `${cost} コイン`;
          return (
            <div key={item.id} className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-amber-300" aria-hidden="true">
                <ShopSvgIcon id={item.id} />
              </span>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-black text-white">{item.name}{extra}</p>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </div>
              <button
                type="button"
                disabled={!afford || maxed}
                onClick={() => onBuy(item.id)}
                className={`min-h-[44px] shrink-0 rounded-lg border px-3.5 py-2 font-mono text-xs font-black transition ${
                  afford && !maxed
                    ? 'border-amber-400 bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'border-slate-800 bg-slate-950 text-slate-500 opacity-60'
                }`}
              >
                {buttonLabel}
              </button>
            </div>
          );
        })}
      </div>

      {shop.victory ? (
        <div className="mt-4 space-y-2">
          <p className="text-center text-[11px] text-slate-400">
            補給を済ませてから「深夜残業（エンドレス）」へ突入するか、定時退社を選んで精算できます。
          </p>
          <button
            type="button"
            onClick={onEndless}
            className="min-h-[48px] w-full rounded-lg border border-rose-400 bg-rose-600 py-3 text-sm font-black text-white shadow-lg transition hover:bg-rose-500"
          >
            終わらぬ残業（エンドレス）に突入する
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="min-h-[48px] w-full rounded-lg border border-amber-300 bg-amber-400 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-300"
          >
            勤怠を打刻して退社（クリア精算）
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="mt-4 min-h-[48px] w-full rounded-lg border border-emerald-400 bg-emerald-600 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-500"
        >
          WAVE {shop.endless > 0 ? `${shop.wave} +残業${shop.endless + 1}` : shop.wave + 1} へ出発進行
        </button>
      )}
    </div>
  );
}

/* ---------------- Result Screen (Timecard Stamp & Commute Settlement Receipt) ---------------- */

function ResultOverlay(props: {
  result: RunResult;
  meta: { course: CourseId; difficulty: Difficulty };
  records: RecordEntry[];
  newAch: string[];
  onRetry: () => void;
  onTitle: () => void;
}) {
  const { result, meta, records, newAch, onRetry, onTitle } = props;
  const cleared = result.victory || result.courseCleared;
  const rank = resultRank(result, meta.difficulty);
  const endedInEndless = !result.victory && result.courseCleared;
  const theme = COURSE_THEME[meta.course];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#0b0e14]/96 p-4 text-center text-slate-100">
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-black ${theme.ringClass}`}>
            {theme.code}-{theme.num} {COURSES[meta.course].name}
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-400">
            {DIFFICULTIES[meta.difficulty].name}勤務{result.endless > 0 ? ` ・ 残業+${result.endless}` : ''}
          </span>
        </div>

        <p className="mt-3 font-mono text-[10px] font-black tracking-widest text-amber-400">
          {cleared ? 'COMMUTE COMPLETED' : 'COMMUTE INTERRUPTED'}
        </p>
        <h2 className={`mt-0.5 text-2xl font-black ${cleared ? 'text-emerald-300' : 'text-rose-400'}`}>
          {endedInEndless ? '本編制覇＋残業完走！' : result.victory ? '定時出社達成！' : '過労ダウン…'}
        </h2>

        {/* Rank Stamp Badge */}
        <div className={`mx-auto mt-3 inline-flex items-center gap-2.5 rounded-full border-2 px-5 py-1.5 font-black shadow-lg ${rank.color}`}>
          <span className="font-mono text-xs uppercase tracking-wider opacity-80">評価</span>
          <span className="font-mono text-2xl leading-none">{rank.rank}</span>
          <span className="text-xs">{rank.label}</span>
        </div>

        {/* Metrics Grid */}
        <div className="mx-auto mt-3.5 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <p className="text-[10px] font-bold text-slate-400">最終スコア</p>
            <p className="mt-0.5 font-mono text-lg font-black text-white">{result.score.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <p className="text-[10px] font-bold text-slate-400">走破距離</p>
            <p className="mt-0.5 font-mono text-lg font-black text-emerald-300">{result.dist}m</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <p className="text-[10px] font-bold text-slate-400">ラッシュ撃破数</p>
            <p className="mt-0.5 font-mono text-lg font-black text-slate-100">{result.kills}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <p className="text-[10px] font-bold text-slate-400">最大連撃コンボ</p>
            <p className="mt-0.5 font-mono text-lg font-black text-amber-300">{result.maxCombo}連撃</p>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-950/30 px-3 py-1.5 text-xs font-bold text-amber-300">
          残業手当 +{result.coins} コイン をへそくり口座へ支給しました
        </div>

        {newAch.length > 0 && (
          <div className="mt-2.5 rounded-lg border border-amber-400/60 bg-amber-500/10 p-2.5 text-xs text-left">
            <p className="font-black text-amber-300">■ 新規実績アンロック！</p>
            {newAch.map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id);
              return (
                <p key={id} className="mt-0.5 text-[11px] text-slate-200">
                  ・<b>{a?.name ?? id}</b>：{a?.desc ?? ''}
                </p>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[48px] w-full rounded-lg border border-emerald-400 bg-emerald-600 py-2.5 text-sm font-black text-white shadow-lg transition hover:bg-emerald-500"
          >
            同じ路線でもう一度出社する
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="min-h-[48px] w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
          >
            路線選択（タイトル）へ戻る
          </button>
        </div>
      </div>

      {records.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-left">
          <p className="mb-1.5 font-mono text-[10px] font-black text-amber-400">■ 最高出社記録 TOP 5</p>
          {records.slice(0, 5).map((r, i) => (
            <div key={`${r.date}-${i}`} className="mb-1 flex items-center justify-between rounded bg-slate-950 px-2.5 py-1 text-[11px]">
              <span className="font-bold text-slate-300">
                {i + 1}位 {r.victory ? '[出社済] ' : ''}{COURSES[r.course].name} ({DIFFICULTIES[r.difficulty].name})
              </span>
              <span className="font-mono font-black text-amber-300">{r.score.toLocaleString()} pt</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
