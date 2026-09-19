'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SpiralEngine, type HudSnapshot, type BuildData, type RunResult } from '@/game/spiral/engine';
import { SpiralSound } from '@/game/spiral/audio';
import {
  loadSettings, saveSettings, loadRecords, saveRecord, loadProgress, saveProgress,
  loadStats, applyRunToStats, loadAch, checkAchievements, claimAchievement, ACHIEVEMENTS,
  type SpiralRecord, type SpiralStats, type AchState,
} from '@/game/spiral/storage';
import {
  DIFFICULTIES, DIFFICULTY_ORDER, META_UPGRADES, FINAL_WAVE, formatTime,
  type Difficulty,
} from '@/game/spiral/config';

type Screen = 'title' | 'playing' | 'build' | 'paused' | 'result';
type TitleTab = 'play' | 'power' | 'ach';

const DEFAULT_HUD: HudSnapshot = {
  hp: 120, maxHp: 120, wave: 1, totalWaves: FINAL_WAVE,
  phase: 'build', timeSec: 0, score: 0, coins: 0, segs: 0, chainsLeft: 0,
  build: { dmg: 10, interval: 0.5, count: 1, pierce: 0, crit: 0.05, orbN: 0, blastLv: 0, beamLv: 0 },
  levels: [], bossName: '', bossHp: 0, bossMax: 0, endless: false,
};

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export default function ShachikuSpiralGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SpiralEngine | null>(null);
  const soundRef = useRef<SpiralSound | null>(null);
  const screenRef = useRef<Screen>('title');
  const keysRef = useRef<Set<string>>(new Set());
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const bannerTimer = useRef<number | null>(null);

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
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<TitleTab>('play');

  const [records, setRecords] = useState<SpiralRecord[]>([]);
  const [bank, setBank] = useState(0);
  const [metaLv, setMetaLv] = useState<Record<string, number>>({ atk: 0, hp: 0, rate: 0 });
  const [stats, setStats] = useState<SpiralStats>({ runs: 0, wins: 0, bestWave: 0, totalSegs: 0, maxScore: 0 });
  const [ach, setAch] = useState<AchState>({ unlocked: {}, claimed: {} });
  const [runMeta, setRunMeta] = useState<{ difficulty: Difficulty }>({ difficulty: 'normal' });

  useEffect(() => {
    const s = loadSettings();
    setMuted(s.muted);
    setRecords(loadRecords());
    const p = loadProgress();
    setBank(p.coins);
    setMetaLv({ ...p.meta });
    setStats(loadStats());
    setAch(loadAch());
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
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    eng.setMove(x, y);
  }, []);

  const destroyEngine = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
  }, []);

  const finishRun = useCallback((r: RunResult, d: Difficulty) => {
    setRecords(saveRecord({ score: r.score, wave: r.wave, victory: r.victory, difficulty: d, date: Date.now() }));
    const p = loadProgress();
    p.coins += r.coins;
    p.runs += 1;
    if (r.victory) p.wins += 1;
    saveProgress(p);
    setBank(p.coins);
    setMetaLv({ ...p.meta });
    const s = applyRunToStats(r);
    setStats(s);
    const fresh = checkAchievements(s, r);
    setAch(loadAch());
    setFreshAch(fresh.map((a) => a.id));
    setResult(r);
    changeScreen('result');
  }, [changeScreen]);

  const startRun = useCallback((d: Difficulty) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    dragRef.current = null;
    setRunMeta({ difficulty: d });
    setResult(null);
    setBuild(null);
    setFreshAch([]);
    engine.start({
      difficulty: d,
      dmgMul: 1 + 0.04 * (m.atk ?? 0),
      maxHpBonus: 10 * (m.hp ?? 0),
      rateMul: 1 + 0.02 * (m.rate ?? 0),
    });
  }, [destroyEngine, finishRun, showBanner, changeScreen]);

  useEffect(() => () => destroyEngine(), [destroyEngine]);

  // keyboard
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushMove]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && screenRef.current === 'playing') pauseGame();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // drag-to-move around center
  const updateDrag = useCallback((clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    const dead = rect.width * 0.03;
    if (len < dead) {
      dragRef.current = null;
    } else {
      const mag = Math.min(1, len / (rect.width * 0.2));
      dragRef.current = { x: (dx / len) * mag, y: (dy / len) * mag };
    }
    pushMove();
  }, [pushMove]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (screenRef.current !== 'playing') return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    soundRef.current?.unlock();
    updateDrag(e.clientX, e.clientY);
  }, [updateDrag]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (screenRef.current !== 'playing') return;
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
    setBuild(null);
    setResult(null);
    setStats(loadStats());
    setAch(loadAch());
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

  return (
    <div className="flex min-h-dvh w-full flex-col items-center bg-[#0a0e1f] px-2 py-4 text-white">
      <div className="w-full max-w-[680px]">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-black tracking-wide">🌀 社畜スパイラル</h1>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-white/10 px-2 py-1 text-xs">🪙 {bank.toLocaleString()}</span>
            <button onClick={toggleMute} className="rounded-lg bg-white/10 px-2 py-1 text-sm" aria-label="ミュート切替">
              {muted ? '🔇' : '🔊'}
            </button>
            {screen === 'playing' && (
              <button onClick={pauseGame} className="rounded-lg bg-white/10 px-2 py-1 text-sm" aria-label="一時停止">⏸</button>
            )}
          </div>
        </div>

        {(screen === 'playing' || screen === 'paused' || screen === 'build') && (
          <div className="mb-2 rounded-xl bg-white/5 p-2 text-xs">
            <div className="mb-1 flex items-center justify-between font-bold">
              <span>🌊 WAVE {hud.wave}{hud.endless ? '+' : `/${hud.totalWaves}`}</span>
              <span className="text-yellow-300">SCORE {hud.score.toLocaleString()}</span>
              <span className="text-amber-300">🪙 {hud.coins}</span>
              <span>✂️ {hud.segs}</span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="w-16 shrink-0">❤️ HP</span>
              <Bar value={hud.hp} max={hud.maxHp} className="bg-green-500" />
              <span className="w-16 shrink-0 text-right">{hud.hp}/{hud.maxHp}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-gray-300">🔫{hud.build.dmg} ×{hud.build.count} {Math.round(hud.build.interval * 1000)}ms 貫{hud.build.pierce}</span>
              {hud.build.orbN > 0 && <span>🗒️×{hud.build.orbN}</span>}
              {hud.build.blastLv > 0 && <span>🥤Lv{hud.build.blastLv}</span>}
              {hud.build.beamLv > 0 && <span>🔔Lv{hud.build.beamLv}</span>}
              <span className="mx-1 text-gray-500">|</span>
              {hud.levels.map((l) => (
                <span key={l.id} className="rounded bg-white/10 px-1 py-0.5">{l.icon}<span className="text-[10px]">{l.lv}</span></span>
              ))}
            </div>
            {hud.bossMax > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <span className="w-28 shrink-0 truncate font-bold text-red-300">{hud.bossName}</span>
                <Bar value={hud.bossHp} max={hud.bossMax} className="bg-red-500" />
              </div>
            )}
          </div>
        )}

        <div
          ref={stageRef}
          className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-xl border border-white/15"
          style={{ aspectRatio: '1 / 1' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="h-full w-full touch-none select-none" width={640} height={640} />

          {banner && (screen === 'playing' || screen === 'build') && (
            <div key={banner.key} className="pointer-events-none absolute inset-x-4 top-10 rounded-xl bg-black/70 p-3 text-center">
              <p className="text-base font-black text-yellow-300">{banner.title}</p>
              <p className="text-xs text-gray-200">{banner.sub}</p>
            </div>
          )}

          {screen === 'title' && (
            <TitleOverlay
              tab={tab} setTab={setTab}
              difficulty={difficulty} setDifficulty={setDifficulty}
              records={records} stats={stats}
              ach={ach} bank={bank} metaLv={metaLv}
              onStart={() => startRun(difficulty)}
              onBuyMeta={buyMeta}
              onClaimAch={claimAchReward}
            />
          )}

          {screen === 'build' && build && (
            <div className="absolute inset-0 overflow-y-auto bg-black/85 p-4">
              <h2 className="text-center text-xl font-black text-yellow-300">🌊 WAVE {build.wave} 準備</h2>
              <p className="mt-1 text-center text-xs text-gray-300">強化を1つ選べ！渦は待ってくれない</p>
              <div className="mx-auto mt-3 grid max-w-[480px] grid-cols-1 gap-2">
                {build.choices.map((c) => (
                  <button
                    key={`${c.kind}:${c.id}`}
                    onClick={() => chooseUpgrade(`${c.kind}:${c.id}`)}
                    className="rounded-xl border border-yellow-300/50 bg-white/10 p-3 text-left hover:bg-white/20"
                  >
                    <p className="text-sm font-black">
                      <span className="mr-2 text-2xl">{c.icon}</span>{c.name}
                      {c.isNew ? <span className="ml-1 rounded bg-green-600 px-1 text-[10px]">NEW</span> : c.toLv > 0 ? <span className="ml-1 text-xs text-yellow-300">Lv{c.toLv}</span> : null}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-300">{c.desc}</p>
                  </button>
                ))}
              </div>
              {build.canReroll && (
                <div className="mx-auto mt-2 max-w-[480px]">
                  <button onClick={() => engineRef.current?.rerollBuild()} className="w-full rounded-xl bg-white/15 py-2 text-xs font-bold">
                    🎲 引き直す（残1）
                  </button>
                </div>
              )}
            </div>
          )}

          {screen === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <p className="text-2xl font-black">⏸ 休憩中…</p>
              <p className="text-xs text-gray-300">ドラッグ／矢印キーで中心付近を移動</p>
              <button onClick={resumeGame} className="rounded-xl bg-green-600 px-8 py-3 font-bold">▶ 業務再開</button>
              <button onClick={quitToTitle} className="rounded-xl bg-white/15 px-8 py-3 font-bold">タイトルに戻る</button>
            </div>
          )}

          {screen === 'result' && result && (
            <ResultOverlay
              result={result} freshAch={freshAch} records={records}
              onRetry={() => startRun(runMeta.difficulty)}
              onEndless={result.victory ? goEndless : undefined}
              onTitle={quitToTitle}
            />
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          ドラッグでコアを移動（黄色破線内）・攻撃は自動・列の先頭を狙え・数字は体節HP！
        </p>
      </div>
    </div>
  );
}

/* ---------------- title ---------------- */

function TitleOverlay(props: {
  tab: TitleTab; setTab: (t: TitleTab) => void;
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  records: SpiralRecord[]; stats: SpiralStats;
  ach: AchState; bank: number; metaLv: Record<string, number>;
  onStart: () => void;
  onBuyMeta: (id: string) => void;
  onClaimAch: (id: string) => void;
}) {
  const { tab, setTab } = props;
  const tabs: { id: TitleTab; label: string }[] = [
    { id: 'play', label: '🏢 出勤' },
    { id: 'power', label: '💪 強化' },
    { id: 'ach', label: '🏆 実績' },
  ];
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-black/85 via-black/75 to-black/90 p-4">
      <p className="text-center text-4xl">🧑‍💼🌀📧</p>
      <h2 className="mt-1 text-center text-2xl font-black text-yellow-300">社畜スパイラル</h2>
      <p className="mt-1 text-center text-xs text-gray-300">
        中央のコアを守れ！渦巻く業務の列が迫る全15ウェーブ・タワーディフェンス
      </p>
      <div className="mx-auto mt-3 flex max-w-[480px] gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-bold ${tab === t.id ? 'bg-yellow-500 text-black' : 'bg-white/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mx-auto mt-3 max-w-[480px]">
        {tab === 'play' && <PlayTab {...props} />}
        {tab === 'power' && <PowerTab bank={props.bank} metaLv={props.metaLv} onBuyMeta={props.onBuyMeta} />}
        {tab === 'ach' && <AchTab ach={props.ach} onClaim={props.onClaimAch} />}
      </div>
    </div>
  );
}

function PlayTab(props: {
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  stats: SpiralStats; records: SpiralRecord[];
  onStart: () => void;
}) {
  const { difficulty, setDifficulty, stats, records, onStart } = props;
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-gray-300">■ 本日の渦の激しさ</p>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((d) => {
          const def = DIFFICULTIES[d];
          return (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border p-2 text-center ${difficulty === d ? 'border-yellow-300 bg-yellow-300/15' : 'border-white/15 bg-white/5'}`}
            >
              <p className="text-sm font-bold">{def.icon} {def.name}</p>
              <p className="text-[10px] text-gray-400">{def.desc}</p>
              <p className="text-[10px] text-gray-400">×{def.scoreMul}</p>
            </button>
          );
        })}
      </div>
      <button onClick={onStart} className="mt-3 w-full rounded-xl bg-red-600 py-3 text-lg font-black shadow-lg">
        🌀 出勤する（全{FINAL_WAVE}ウェーブ）
      </button>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-white/5 p-2"><p className="text-gray-400">出勤</p><p className="text-base font-black">{stats.runs}</p></div>
        <div className="rounded-lg bg-white/5 p-2"><p className="text-gray-400">制圧</p><p className="text-base font-black">{stats.wins}</p></div>
        <div className="rounded-lg bg-white/5 p-2"><p className="text-gray-400">最高W</p><p className="text-base font-black">{stats.bestWave}</p></div>
        <div className="rounded-lg bg-white/5 p-2"><p className="text-gray-400">切断</p><p className="text-base font-black">{stats.totalSegs.toLocaleString()}</p></div>
      </div>
      {records.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-bold text-gray-300">■ 最高記録</p>
          {records.slice(0, 3).map((r, i) => (
            <div key={`${r.date}-${i}`} className="mb-1 flex justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
              <span>{i + 1}位 {r.victory ? '🎉' : ''}W{r.wave} {DIFFICULTIES[r.difficulty]?.name}</span>
              <span className="font-bold text-yellow-300">{r.score.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 rounded-xl bg-white/10 p-3 text-[11px] leading-relaxed">
        <p>🕹️ <b>操作</b>: ドラッグ／矢印キーでコアを移動（黄色破線内）。攻撃は全自動。</p>
        <p>⛓️ 列は<b>先頭📧から崩れる</b>。体の数字はHP。先頭を集中攻撃！</p>
        <p>🌊 WAVE制圧ごとに3択強化。W5上司・W10役員・W15社長に注意！</p>
      </div>
    </div>
  );
}

function PowerTab(props: { bank: number; metaLv: Record<string, number>; onBuyMeta: (id: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs text-gray-300">所持 🪙{props.bank}（恒久強化！）</p>
      <div className="space-y-2">
        {META_UPGRADES.map((m) => {
          const lv = props.metaLv[m.id] ?? 0;
          const maxed = lv >= m.maxLv;
          const cost = m.cost(lv);
          return (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 p-2">
              <div className="text-xs">
                <p className="font-bold">{m.icon} {m.name} Lv{lv}/{m.maxLv}</p>
                <p className="text-gray-300">{m.desc}</p>
              </div>
              <button
                disabled={maxed || props.bank < cost}
                onClick={() => props.onBuyMeta(m.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${!maxed && props.bank >= cost ? 'bg-green-600' : 'bg-white/10 opacity-50'}`}
              >
                {maxed ? 'MAX' : `🪙${cost}`}
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
          <div key={a.id} className={`flex items-center justify-between gap-2 rounded-lg p-2 text-xs ${un ? 'bg-white/10' : 'bg-white/5 opacity-60'}`}>
            <div>
              <p className="font-bold">{a.icon} {a.name}</p>
              <p className="text-gray-400">{a.desc}</p>
            </div>
            {cl ? (
              <span className="shrink-0 text-gray-400">受取済</span>
            ) : un ? (
              <button onClick={() => props.onClaim(a.id)} className="shrink-0 rounded-lg bg-yellow-500 px-3 py-1.5 font-bold text-black">
                🪙{a.reward}受取
              </button>
            ) : (
              <span className="shrink-0 text-gray-500">🔒</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- result ---------------- */

function ResultOverlay(props: {
  result: RunResult; freshAch: string[]; records: SpiralRecord[];
  onRetry: () => void; onEndless?: () => void; onTitle: () => void;
}) {
  const { result, freshAch, records, onRetry, onEndless, onTitle } = props;
  const fresh = ACHIEVEMENTS.filter((a) => freshAch.includes(a.id));
  return (
    <div className="absolute inset-0 overflow-y-auto bg-black/85 p-4 text-center">
      <p className="text-5xl">{result.victory ? '🎉' : '💀'}</p>
      <h2 className={`mt-1 text-2xl font-black ${result.victory ? 'text-yellow-300' : 'text-red-400'}`}>
        {result.victory ? '渦を制圧！！' : `WAVE ${result.wave}で力尽きた…`}
      </h2>
      <p className="text-xs text-gray-300">{DIFFICULTIES[result.difficulty]?.name} × {formatTime(result.timeSec)}勤務</p>
      <div className="mx-auto mt-3 grid max-w-[340px] grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">スコア</p><p className="text-lg font-black text-yellow-300">{result.score.toLocaleString()}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">到達WAVE</p><p className="text-lg font-black">{result.wave}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">切断数</p><p className="text-lg font-black">{result.segs.toLocaleString()}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">列撃破</p><p className="text-lg font-black">{result.chains}</p></div>
      </div>
      <p className="mt-2 text-xs text-amber-300">🪙{result.coins} を残業代に加算</p>
      {fresh.length > 0 && (
        <div className="mx-auto mt-2 max-w-[340px] rounded-xl bg-yellow-500/15 p-2 text-left text-xs">
          <p className="font-bold text-yellow-300">🏆 実績解除！（実績タブで受取）</p>
          {fresh.map((a) => (
            <p key={a.id}>{a.icon} {a.name} <span className="text-gray-300">🪙{a.reward}</span></p>
          ))}
        </div>
      )}
      <div className="mx-auto mt-3 max-w-[340px] space-y-2">
        {onEndless && (
          <button onClick={onEndless} className="w-full rounded-xl bg-purple-600 py-3 font-black">♾️ 残業する（エンドレス）</button>
        )}
        <button onClick={onRetry} className="w-full rounded-xl bg-red-600 py-3 font-black">🔁 もう一度出勤</button>
        <button onClick={onTitle} className="w-full rounded-xl bg-white/15 py-3 font-black">タイトルに戻る</button>
      </div>
      {records.length > 0 && (
        <div className="mx-auto mt-3 max-w-[340px] text-left">
          <p className="mb-1 text-xs font-bold text-gray-300">■ 最高記録</p>
          {records.slice(0, 3).map((r, i) => (
            <div key={`${r.date}-${i}`} className="mb-1 flex justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
              <span>{i + 1}位 {r.victory ? '🎉' : ''}W{r.wave}</span>
              <span className="font-bold text-yellow-300">{r.score.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
