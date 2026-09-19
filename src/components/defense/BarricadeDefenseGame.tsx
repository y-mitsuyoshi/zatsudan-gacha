'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DefenseEngine, type HudSnapshot, type ShopSnapshot, type RunResult } from '@/game/defense/engine';
import { DefenseSound } from '@/game/defense/audio';
import {
  WEAPONS, ENEMIES, COURSES, COURSE_ORDER, DIFFICULTIES, DIFFICULTY_ORDER, SHOP, MAX_ALLIES,
  ACHIEVEMENTS, PERKS,
  type CourseId, type Difficulty, type EnemyKind,
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
  bossHp: 0, bossMax: 0, fps: 60, waveActive: false,
};

const ENEMY_ORDER: EnemyKind[] = ['runner', 'walker', 'brute', 'shield', 'kamikaze', 'boss'];

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
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
  grant('nakama', r.maxAllies >= MAX_ALLIES);
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
      showBanner('🏅 実績解除！', names);
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
          <h1 className="text-lg font-black tracking-wide">💼 社畜ディフェンス</h1>
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
              <span className="text-amber-300">💴 {hud.coins}</span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="w-14 shrink-0">🧱 定時</span>
              <Bar value={hud.wallHp} max={hud.wallMax} className="bg-orange-500" />
              <span className="w-12 shrink-0 text-right">{hud.wallHp}</span>
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="w-14 shrink-0">🏠 自宅</span>
              <Bar value={hud.baseHp} max={hud.baseMax} className="bg-blue-500" />
              <span className="w-12 shrink-0 text-right">{hud.baseHp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{w.icon} {w.name}{hud.weaponT > 0 ? ` (${Math.ceil(hud.weaponT)}s)` : ''}</span>
              <span>🤝×{hud.allies}　🔥{hud.combo}連撃　⚔️{hud.kills}</span>
            </div>
            {hud.bossMax > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <span className="w-14 shrink-0">👔 社長</span>
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
              <p className="text-2xl font-black">⏸ 休憩中（サボり中）</p>
              <button onClick={resumeGame} className="rounded-xl bg-green-600 px-8 py-3 font-bold">▶ 業務に戻る</button>
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
          照準をドラッグ／タップで操作（自動射撃）・差し入れ段ボールを撃つと武器変化や残業代・SOSカプセルを撃つと同期が増加
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
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-black/85 via-black/75 to-black/90 p-4">
      <p className="text-center text-4xl">💼🧱</p>
      <h2 className="mt-1 text-center text-2xl font-black text-yellow-300">社畜ディフェンス</h2>
      <p className="mt-1 text-center text-xs text-gray-300">定時退社を阻む残業の大群を撃退せよ！差し入れで武器チェンジ、同期を救出、定時の壁を守り抜け！</p>

      <p className="mb-1 mt-4 text-xs font-bold text-gray-300">■ 勤務地選択</p>
      <div className="grid grid-cols-3 gap-2">
        {COURSE_ORDER.map((c) => {
          const def = COURSES[c];
          const locked = !prog.unlocked.includes(c);
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
              <p className="text-xs font-bold">{def.icon} {def.name}</p>
              <p className="text-[10px] text-gray-400">×{def.scoreMul}</p>
            </button>
          );
        })}
      </div>

      <button onClick={onStart} className="mt-4 w-full rounded-xl bg-red-600 py-3 text-lg font-black shadow-lg">
        🚀 出社する
      </button>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
        <span>🏦 へそくり: 💴{bank}</span>
        <span>⚔️{prog.totalKills}撃破・{prog.totalRuns}出社</span>
      </div>

      <p className="mb-1 mt-3 text-xs font-bold text-gray-300">■ 社畜手帳（やりこみ）</p>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <button onClick={() => setShowHelp(!showHelp)} className={`rounded-lg px-2 py-2 font-bold ${showHelp ? 'bg-indigo-600' : 'bg-white/10'}`}>❓<br />遊び方</button>
        <button onClick={() => toggle('perk')} className={`rounded-lg px-2 py-2 font-bold ${tab === 'perk' ? 'bg-indigo-600' : 'bg-white/10'}`}>💪<br />強化</button>
        <button onClick={() => toggle('ach')} className={`rounded-lg px-2 py-2 font-bold ${tab === 'ach' ? 'bg-indigo-600' : 'bg-white/10'}`}>🏅<br />実績{achCount}/{ACHIEVEMENTS.length}</button>
        <button onClick={() => toggle('codex')} className={`rounded-lg px-2 py-2 font-bold ${tab === 'codex' ? 'bg-indigo-600' : 'bg-white/10'}`}>📖<br />図鑑</button>
      </div>

      {showHelp && (
        <div className="mt-2 rounded-xl bg-white/10 p-3 text-[11px] leading-relaxed">
          <p>✏️ <b>操作</b>: 指やマウスで照準を移動。シャーペンは自動で発射。</p>
          <p>📦 <b>差し入れ段ボール</b>を撃つと… 武器GET(スタンプ連打/書類/正論/退職届/冷たい視線)・⚡お局の雷・💴残業代・🧱壁補修のいずれかが発動！</p>
          <p>🆘 <b>SOSカプセル</b>を撃つと同期が参戦(最大{MAX_ALLIES}人)。同期は自動援護してくれる。</p>
          <p>🧱 残業が<b>定時の壁</b>に到達すると壁を攻撃。壁が壊れると<b>自宅</b>に直行！自宅HPが0で過労ダウン。</p>
          <p>🛒 WAVEクリア毎にショップで強化。最終WAVE踏破で定時退社→次の勤務地解放＆エンドレス残業へ。</p>
          <p>💾 スコア・解放・へそくり・図鑑・実績は自動セーブ。</p>
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
                  <p className="font-bold">{perk.icon} {perk.name} Lv{lv}/{perk.max}</p>
                  <p className="text-gray-300">{perk.desc}</p>
                </div>
                <button
                  disabled={maxed || !afford}
                  onClick={() => onBuyPerk(perk.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 font-bold ${!maxed && afford ? 'bg-green-600' : 'bg-white/10 opacity-50'}`}
                >
                  {maxed ? 'MAX' : `💴${cost}`}
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
                <p className="font-bold">{a.icon} {got ? a.name : '？？？'}</p>
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
                <span>{def.emoji} {n > 0 ? def.name : '？？？'}</span>
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
        {shop.victory ? '🏆 定時退社達成！' : `✅ WAVE ${shop.wave} 耐えた！`}
      </h2>
      <p className="mt-1 text-center text-sm text-amber-300">所持 💴{shop.coins} ／ 定時 {shop.wallHp}/{shop.wallMax} ／ 自宅 {shop.baseHp}/{shop.baseMax} ／ 同期 {shop.allies}/{MAX_ALLIES}</p>
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
                {maxed ? 'MAX' : `💴${cost}`}
              </button>
            </div>
          );
        })}
      </div>
      {shop.victory ? (
        <div className="mt-3 space-y-2">
          <button onClick={onEndless} className="w-full rounded-xl bg-purple-600 py-3 font-black">♾️ 終わらぬ残業に突入する</button>
          <button onClick={onFinish} className="w-full rounded-xl bg-yellow-500 py-3 font-black text-black">📝 勤怠を付けて帰宅</button>
        </div>
      ) : (
        <button onClick={onNext} className="mt-3 w-full rounded-xl bg-red-600 py-3 font-black">
          ⚔️ WAVE {shop.endless > 0 ? `${shop.wave} +∞${shop.endless + 1}` : shop.wave + 1} へ出社
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
      <p className="text-5xl">{result.victory ? '🏆' : '💀'}</p>
      <h2 className={`mt-1 text-2xl font-black ${result.victory ? 'text-yellow-300' : 'text-red-400'}`}>
        {result.victory ? '定時退社成功！' : '過労でダウン…'}
      </h2>
      <p className="text-xs text-gray-300">{COURSES[meta.course].name} × {DIFFICULTIES[meta.difficulty].name}</p>
      <div className="mx-auto mt-3 grid max-w-[300px] grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">スコア</p><p className="text-lg font-black text-yellow-300">{result.score.toLocaleString()}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">耐えたWAVE</p><p className="text-lg font-black">{result.wave}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">撃破数</p><p className="text-lg font-black">{result.kills}</p></div>
        <div className="rounded-xl bg-white/10 p-2"><p className="text-[10px] text-gray-400">最大連撃</p><p className="text-lg font-black">{result.maxCombo}</p></div>
      </div>
      <p className="mt-2 text-xs text-amber-300">💴{result.coins} をへそくりに加算しました</p>
      {newAch.length > 0 && (
        <div className="mx-auto mt-2 max-w-[300px] rounded-xl border border-yellow-300/50 bg-yellow-300/10 p-2 text-xs">
          <p className="font-bold text-yellow-300">🏅 実績解除！</p>
          {newAch.map((id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            return <p key={id}>{a ? `${a.icon} ${a.name} — ${a.desc}` : id}</p>;
          })}
        </div>
      )}
      <div className="mt-3 space-y-2">
        <button onClick={onRetry} className="w-full rounded-xl bg-red-600 py-3 font-black">🔁 もう一度出社</button>
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
