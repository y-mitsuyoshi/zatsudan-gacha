'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DefenseEngine, type HudSnapshot, type ShopSnapshot, type RunResult } from '@/game/defense/engine';
import { DefenseSound } from '@/game/defense/audio';
import {
  WEAPONS, COURSES, COURSE_ORDER, DIFFICULTIES, DIFFICULTY_ORDER, SHOP, MAX_ALLIES,
  type CourseId, type Difficulty,
} from '@/game/defense/config';
import {
  loadSettings, saveSettings, loadRecords, saveRecord, loadProgress, saveProgress,
  type RecordEntry,
} from '@/game/defense/storage';

type Screen = 'title' | 'playing' | 'shop' | 'paused' | 'result';

const DEFAULT_HUD: HudSnapshot = {
  score: 0, coins: 0, wave: 1, totalWaves: 5, endless: 0, combo: 0,
  weapon: 'pistol', weaponT: 0, baseHp: 100, baseMax: 100,
  wallHp: 140, wallMax: 140, allies: 0, kills: 0,
  bossHp: 0, bossMax: 0, fps: 60, waveActive: false,
};

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export default function BarricadeDefenseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [muted, setMuted] = useState(false);
  const [shake, setShake] = useState(true);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [bank, setBank] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [runMeta, setRunMeta] = useState<{ course: CourseId; difficulty: Difficulty }>({ course: 'city', difficulty: 'normal' });

  useEffect(() => {
    const s = loadSettings();
    setMuted(s.muted);
    setShake(s.shake);
    setRecords(loadRecords());
    const p = loadProgress();
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
    setRecords(saveRecord(entry));
    const p = loadProgress();
    p.coins += r.coins;
    if (r.victory) {
      const idx = COURSE_ORDER.indexOf(c);
      const next = COURSE_ORDER[idx + 1];
      if (next && !p.unlocked.includes(next)) p.unlocked.push(next);
    }
    saveProgress(p);
    setBank(p.coins);
    setResult(r);
    changeScreen('result');
  }, [changeScreen]);

  const startRun = useCallback((c: CourseId, d: Difficulty) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    destroyEngine();
    if (!soundRef.current) soundRef.current = new DefenseSound();
    const sound = soundRef.current;
    sound.setMuted(loadSettings().muted);
    sound.unlock();
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
    changeScreen('playing');
    engine.start(COURSES[c], DIFFICULTIES[d], { shake: loadSettings().shake });
  }, [destroyEngine, finishRun, showBanner, changeScreen]);

  useEffect(() => () => destroyEngine(), [destroyEngine]);

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
    changeScreen('title');
  }, [destroyEngine, changeScreen]);

  const progress = loadProgressSafe();
  const w = WEAPONS[hud.weapon];

  return (
    <div className="flex min-h-dvh w-full flex-col items-center bg-[#05070f] px-2 py-4 text-white">
      <div className="w-full max-w-[520px]">
        {/* header */}
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-black tracking-wide">🧱 バリケードディフェンス</h1>
          <div className="flex gap-2">
            <button onClick={toggleMute} className="rounded-lg bg-white/10 px-2 py-1 text-sm" aria-label="ミュート切替">
              {muted ? '🔇' : '🔊'}
            </button>
            <button onClick={toggleShake} className="rounded-lg bg-white/10 px-2 py-1 text-sm" aria-label="振動切替">
              {shake ? '📳' : '🚫'}
            </button>
            {(screen === 'playing') && (
              <button onClick={pauseGame} className="rounded-lg bg-white/10 px-2 py-1 text-sm" aria-label="一時停止">⏸</button>
            )}
          </div>
        </div>

        {/* HUD */}
        {(screen === 'playing' || screen === 'paused' || screen === 'shop') && (
          <div className="mb-2 rounded-xl bg-white/5 p-2 text-xs">
            <div className="mb-1 flex items-center justify-between font-bold">
              <span>WAVE {hud.wave}/{hud.totalWaves}{hud.endless > 0 ? ` ∞${hud.endless}` : ''}</span>
              <span className="text-yellow-300">SCORE {hud.score.toLocaleString()}</span>
              <span className="text-amber-300">🪙 {hud.coins}</span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="w-14 shrink-0">🧱 壁</span>
              <Bar value={hud.wallHp} max={hud.wallMax} className="bg-orange-500" />
              <span className="w-12 shrink-0 text-right">{hud.wallHp}</span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="w-14 shrink-0">🏠 拠点</span>
              <Bar value={hud.baseHp} max={hud.baseMax} className="bg-blue-500" />
              <span className="w-12 shrink-0 text-right">{hud.baseHp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{w.icon} {w.name}{hud.weaponT > 0 ? ` (${Math.ceil(hud.weaponT)}s)` : ''}</span>
              <span>🤝×{hud.allies}　🔥{hud.combo}連撃　⚔️{hud.kills}</span>
            </div>
            {hud.bossMax > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <span className="w-14 shrink-0">👿 ボス</span>
                <Bar value={hud.bossHp} max={hud.bossMax} className="bg-red-500" />
              </div>
            )}
          </div>
        )}

        {/* stage */}
        <div
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

          {screen === 'title' && <TitleOverlay
            course={course} setCourse={setCourse} difficulty={difficulty} setDifficulty={setDifficulty}
            bank={bank} records={records} progressUnlocked={progress.unlocked}
            showHelp={showHelp} setShowHelp={setShowHelp}
            onStart={() => startRun(course, difficulty)}
          />}

          {screen === 'shop' && shop && (
            <ShopOverlay shop={shop} onBuy={buy} onNext={resumeFromShop} onEndless={goEndless} onFinish={finishVictory} />
          )}

          {screen === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <p className="text-2xl font-black">⏸ 一時停止中</p>
              <button onClick={resumeGame} className="rounded-xl bg-green-600 px-8 py-3 font-bold">▶ 再開する</button>
              <button onClick={quitToTitle} className="rounded-xl bg-white/15 px-8 py-3 font-bold">タイトルに戻る</button>
            </div>
          )}

          {screen === 'result' && result && (
            <ResultOverlay
              result={result} meta={runMeta} records={records}
              onRetry={() => startRun(runMeta.course, runMeta.difficulty)}
              onTitle={quitToTitle}
            />
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          照準をドラッグ／タップで操作（自動射撃）・ドラム缶を撃つと武器変化や爆発・HELPカプセルを撃つと仲間が増加
        </p>
      </div>
    </div>
  );
}

function loadProgressSafe(): { unlocked: CourseId[] } {
  try {
    return loadProgress();
  } catch {
    return { unlocked: ['city'] };
  }
}

/* ---------------- title ---------------- */

function TitleOverlay(props: {
  course: CourseId; setCourse: (c: CourseId) => void;
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  bank: number; records: RecordEntry[]; progressUnlocked: CourseId[];
  showHelp: boolean; setShowHelp: (v: boolean) => void;
  onStart: () => void;
}) {
  const { course, setCourse, difficulty, setDifficulty, bank, records, progressUnlocked, showHelp, setShowHelp, onStart } = props;
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-black/85 via-black/75 to-black/90 p-4">
      <p className="text-center text-4xl">🧱🔫</p>
      <h2 className="mt-1 text-center text-2xl font-black text-yellow-300">バリケードディフェンス</h2>
      <p className="mt-1 text-center text-xs text-gray-300">前方から迫る大群を撃て！ドラム缶で武器チェンジ、仲間を救出、壁を守り抜け！</p>

      <p className="mb-1 mt-4 text-xs font-bold text-gray-300">■ コース選択</p>
      <div className="grid grid-cols-3 gap-2">
        {COURSE_ORDER.map((c) => {
          const def = COURSES[c];
          const locked = !progressUnlocked.includes(c);
          return (
            <button
              key={c}
              disabled={locked}
              onClick={() => setCourse(c)}
              className={`rounded-xl border p-2 text-center ${course === c ? 'border-yellow-300 bg-yellow-300/15' : 'border-white/15 bg-white/5'} ${locked ? 'opacity-40' : ''}`}
            >
              <span className="text-2xl">{locked ? '🔒' : def.icon}</span>
              <p className="text-xs font-bold">{def.name}</p>
              <p className="text-[10px] text-gray-400">{def.waves}WAVE</p>
            </button>
          );
        })}
      </div>

      <p className="mb-1 mt-3 text-xs font-bold text-gray-300">■ 難易度</p>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_ORDER.map((d) => {
          const def = DIFFICULTIES[d];
          return (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border p-2 text-center ${difficulty === d ? 'border-green-300 bg-green-300/15' : 'border-white/15 bg-white/5'}`}
            >
              <p className="text-xs font-bold">{def.icon} {def.name}</p>
              <p className="text-[10px] text-gray-400">×{def.scoreMul}</p>
            </button>
          );
        })}
      </div>

      <button onClick={onStart} className="mt-4 w-full rounded-xl bg-red-600 py-3 text-lg font-black shadow-lg">
        🚀 出撃する
      </button>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
        <span>🏦 貯金: 🪙{bank}</span>
        <button onClick={() => setShowHelp(!showHelp)} className="rounded-lg bg-white/10 px-3 py-1">❓ 遊び方</button>
      </div>

      {showHelp && (
        <div className="mt-2 rounded-xl bg-white/10 p-3 text-[11px] leading-relaxed">
          <p>🔫 <b>操作</b>: 指やマウスで照準を移動。銃は自動で発射。</p>
          <p>🛢️ <b>ドラム缶</b>を撃つと… 武器GET(SMG/散弾/ライフル/ランチャー/冷凍)・💥誘爆・🪙コイン・🧱壁修理のいずれかが発動！</p>
          <p>🙋 <b>HELPカプセル</b>を撃つと仲間が参戦(最大{MAX_ALLIES}人)。仲間は自動射撃してくれる。</p>
          <p>🧱 敵が<b>バリケード</b>に到達すると壁を攻撃。壁が壊れると<b>拠点</b>に直行！拠点HPが0で敗北。</p>
          <p>🛒 WAVEクリア毎にショップで強化。最終WAVE踏破でコースクリア→次のコース解放＆エンドレス突入可。</p>
          <p>💾 スコア・解放状況・貯金は自動セーブ。</p>
        </div>
      )}

      {records.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold text-gray-300">■ 最高記録</p>
          <div className="space-y-1">
            {records.slice(0, 5).map((r, i) => (
              <div key={`${r.date}-${i}`} className="flex justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
                <span>{i + 1}位 {r.victory ? '🏆' : ''}{COURSES[r.course].name} {DIFFICULTIES[r.difficulty].name}</span>
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
        {shop.victory ? '🏆 コースクリア！' : `✅ WAVE ${shop.wave} クリア！`}
      </h2>
      <p className="mt-1 text-center text-sm text-amber-300">所持 🪙{shop.coins} ／ 壁 {shop.wallHp}/{shop.wallMax} ／ 拠点 {shop.baseHp}/{shop.baseMax} ／ 仲間 {shop.allies}/{MAX_ALLIES}</p>
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
                <p className="font-bold">{item.icon} {item.name}{extra}</p>
                <p className="text-gray-300">{item.desc}</p>
              </div>
              <button
                disabled={!afford || maxed}
                onClick={() => onBuy(item.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${afford && !maxed ? 'bg-green-600' : 'bg-white/10 opacity-50'}`}
              >
                {maxed ? 'MAX' : `🪙${cost}`}
              </button>
            </div>
          );
        })}
      </div>
      {shop.victory ? (
        <div className="mt-3 space-y-2">
          <button onClick={onEndless} className="w-full rounded-xl bg-purple-600 py-3 font-black">♾️ エンドレスに突入する</button>
          <button onClick={onFinish} className="w-full rounded-xl bg-yellow-500 py-3 font-black text-black">📝 結果を見て終了</button>
        </div>
      ) : (
        <button onClick={onNext} className="mt-3 w-full rounded-xl bg-red-600 py-3 font-black">
          ⚔️ WAVE {shop.endless > 0 ? `${shop.wave} +∞${shop.endless + 1}` : shop.wave + 1} へ出撃
        </button>
      )}
    </div>
  );
}

/* ---------------- result ---------------- */

function ResultOverlay(props: { result: RunResult; meta: { course: CourseId; difficulty: Difficulty }; records: RecordEntry[]; onRetry: () => void; onTitle: () => void }) {
  const { result, meta, records, onRetry, onTitle } = props;
  return (
    <div className="absolute inset-0 overflow-y-auto bg-black/85 p-4 text-center">
      <p className="text-5xl">{result.victory ? '🏆' : '💀'}</p>
      <h2 className={`mt-1 text-2xl font-black ${result.victory ? 'text-yellow-300' : 'text-red-400'}`}>
        {result.victory ? '作戦成功！' : '拠点陥落…'}
      </h2>
      <p className="text-xs text-gray-300">{COURSES[meta.course].name} × {DIFFICULTIES[meta.difficulty].name}</p>
      <div className="mx-auto mt-3 grid max-w-[300px] grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">スコア</p><p className="text-lg font-black text-yellow-300">{result.score.toLocaleString()}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">到達WAVE</p><p className="text-lg font-black">{result.wave}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">撃破数</p><p className="text-lg font-black">{result.kills}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">最大連撃</p><p className="text-lg font-black">{result.maxCombo}</p></div>
      </div>
      <p className="mt-2 text-xs text-amber-300">🪙{result.coins} を貯金に加算しました</p>
      <div className="mt-3 space-y-2">
        <button onClick={onRetry} className="w-full rounded-xl bg-red-600 py-3 font-black">🔁 もう一度出撃</button>
        <button onClick={onTitle} className="w-full rounded-xl bg-white/15 py-3 font-black">タイトルに戻る</button>
      </div>
      {records.length > 0 && (
        <div className="mt-3 text-left">
          <p className="mb-1 text-xs font-bold text-gray-300">■ 最高記録</p>
          {records.slice(0, 5).map((r, i) => (
            <div key={`${r.date}-${i}`} className="mb-1 flex justify-between rounded-lg bg-white/5 px-2 py-1 text-[11px]">
              <span>{i + 1}位 {r.victory ? '🏆' : ''}{COURSES[r.course].name} {DIFFICULTIES[r.difficulty].name}</span>
              <span className="font-bold text-yellow-300">{r.score.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
