'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShmupEngine, type HudSnapshot, type RunResult } from '@/game/shmup/engine';
import { WEAPONS, titleForStage, type WeaponId } from '@/game/shmup/config';
import {
  loadSettings,
  saveSettings,
  loadScores,
  saveScore,
  loadContinue,
  clearContinue,
  type ScoreEntry,
} from '@/game/shmup/storage';

type Screen = 'title' | 'playing' | 'paused' | 'result';

const DEFAULT_HUD: HudSnapshot = {
  score: 0, combo: 0, maxCombo: 0, stage: 1, hp: 100, maxHp: 100,
  bombs: 2, weapon: 'rensa', weaponLevel: 1, bossActive: false,
  bossHp: 0, bossMax: 1, bossName: '', kills: 0, graze: 0,
  fps: 60, pb: 0, eb: 0,
};

export default function ShachikuGameV2() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ShmupEngine | null>(null);
  const runId = useRef(0);
  const bannerTimer = useRef<number | null>(null);

  const [screen, setScreen] = useState<Screen>('title');
  const [hud, setHud] = useState<HudSnapshot>(DEFAULT_HUD);
  const [banner, setBanner] = useState<{ title: string; sub?: string } | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [weapon, setWeapon] = useState<WeaponId>('rensa');
  const [muted, setMuted] = useState(false);
  const [shake, setShake] = useState(true);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [hasContinue, setHasContinue] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [shared, setShared] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSettings();
    setMuted(s.muted);
    setShake(s.shake);
    setScores(loadScores());
    setHasContinue(loadContinue() !== null);
  }, []);

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

  const showBanner = useCallback((title: string, sub?: string) => {
    setBanner({ title, sub });
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 2600);
  }, []);

  const startRun = useCallback(
    (opts?: { stage?: number; score?: number; weaponLevel?: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      destroyEngine();
      const id = ++runId.current;
      setResult(null);
      setShared(false);
      setFatal(null);
      setBanner(null);
      setHud({ ...DEFAULT_HUD, weapon, score: opts?.score ?? 0, stage: opts?.stage ?? 1 });
      const engine = new ShmupEngine({
        canvas,
        weapon,
        weaponLevel: opts?.weaponLevel ?? 1,
        stage: opts?.stage ?? 1,
        score: opts?.score ?? 0,
        muted,
        shake,
        onEvent: (e) => {
          if (id !== runId.current) return;
          if (e.type === 'hud') setHud(e.hud);
          else if (e.type === 'banner') showBanner(e.title, e.sub);
          else if (e.type === 'gameover') {
            const entry: ScoreEntry = {
              score: e.result.score,
              stage: e.result.stage,
              rank: e.result.rank,
              date: Date.now(),
            };
            setScores(saveScore(entry));
            setHasContinue(loadContinue() !== null);
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
    [destroyEngine, weapon, muted, shake, showBanner],
  );

  const handlePauseKey = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    if (eng.isPaused) {
      eng.setPaused(false);
      setScreen('playing');
    } else {
      eng.setPaused(true);
      setScreen('paused');
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        setScreen((s) => {
          if (s === 'playing' || s === 'paused') {
            handlePauseKey();
            return s;
          }
          return s;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePauseKey]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      saveSettings({ muted: next, shake });
      engineRef.current?.setMuted(next);
      return next;
    });
  }, [shake]);

  const toggleShake = useCallback(() => {
    setShake((v) => {
      const next = !v;
      saveSettings({ muted, shake: next });
      engineRef.current?.setShake(next);
      return next;
    });
  }, [muted]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `社畜シューティング: Stage ${result.stage} 到達 / 残業代 ${result.score.toLocaleString()}円 / 称号「${result.rank}」 #社畜シューティング ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '社畜シューティング', text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShared(true);
      }
    } catch {
      /* user cancelled — ignore */
    }
  }, [result]);

  const hpRatio = Math.max(0, Math.min(1, hud.hp / hud.maxHp));

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center bg-black text-white">
      <div
        ref={wrapRef}
        className="relative h-full w-full overflow-hidden bg-[#05050c]"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none select-none" />

        {/* fatal error surfaced from the engine (never fail silently) */}
        {fatal && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
            <div className="text-2xl font-black text-red-400">エラーが発生しました</div>
            <div className="max-w-sm break-all font-mono text-xs text-gray-300">{fatal}</div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-green-500 px-6 py-3 font-black hover:bg-green-400"
            >
              ↻ 再読み込み
            </button>
          </div>
        )}

        {/* HUD */}
        {(screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[520px] -translate-x-1/2 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="rounded-lg bg-black/60 px-2.5 py-1.5 text-xs backdrop-blur-sm">
                <div className="font-bold text-yellow-300">Stage {hud.stage} ・ {titleForStage(hud.stage)}</div>
                <div className="font-mono text-base leading-tight">残業代 {hud.score.toLocaleString()}</div>
                <div className="text-[11px] text-gray-300">
                  {hud.weapon === 'rensa' ? '🔫連射' : hud.weapon === 'kakusan' ? '🎇拡散' : '🚀追尾'} Lv.{hud.weaponLevel}
                  {'　'}撃破 {hud.kills}・G {hud.graze}
                </div>
              </div>
              <div className="pointer-events-auto flex gap-1.5">
                <button
                  onClick={toggleMute}
                  aria-label={muted ? 'ミュート解除' : 'ミュート'}
                  className="rounded-lg bg-black/60 px-2.5 py-1.5 text-sm backdrop-blur-sm hover:bg-black/80"
                >
                  {muted ? '🔇' : '🔊'}
                </button>
                <button
                  onClick={handlePauseKey}
                  aria-label="一時停止"
                  className="rounded-lg bg-black/60 px-2.5 py-1.5 text-sm backdrop-blur-sm hover:bg-black/80"
                >
                  ⏸
                </button>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
              <span className="text-[11px] text-gray-300">💗</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className={`h-full rounded-full transition-all ${hpRatio < 0.3 ? 'bg-red-500' : hpRatio < 0.6 ? 'bg-yellow-400' : 'bg-green-400'}`}
                  style={{ width: `${hpRatio * 100}%` }}
                />
              </div>
              <span className="font-mono text-[11px]">{hud.hp}</span>
              <span className="text-[11px] text-pink-300">📄×{hud.bombs}</span>
            </div>
            {hud.bossActive && (
              <div className="mt-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
                <div className="mb-1 text-center text-[11px] font-bold text-red-400">👹 {hud.bossName}</div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMax)) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* banner toast */}
        {banner && (screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center px-6 text-center">
            <div className="rounded-xl bg-black/70 px-6 py-3 backdrop-blur-sm">
              <div className="text-2xl font-black tracking-wide text-yellow-300 drop-shadow">{banner.title}</div>
              {banner.sub && <div className="mt-1 text-sm text-gray-200">{banner.sub}</div>}
            </div>
          </div>
        )}

        {/* touch bomb button */}
        {screen === 'playing' && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[520px] -translate-x-1/2">
            <div className="absolute bottom-1.5 left-2 font-mono text-[10px] text-white/40">
              {hud.fps}fps 弾{hud.pb} 敵弾{hud.eb}
            </div>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                engineRef.current?.useBomb();
              }}
              aria-label="有給ボム"
              className="pointer-events-auto absolute bottom-6 right-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-pink-300/60 bg-pink-600/70 text-xs font-bold shadow-lg backdrop-blur-sm active:scale-95"
            >
              📄<br />有給
            </button>
          </div>
        )}

        {/* title */}
        {screen === 'title' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-gradient-to-b from-[#0b1026]/95 via-[#101a3a]/95 to-black/95 p-6 text-center">
            <div className="text-5xl">🧑‍💼</div>
            <h1 className="text-4xl font-black leading-tight tracking-wide">
              社畜<span className="text-yellow-300">シューティング</span>
            </h1>
            <p className="text-sm text-gray-300">迫りくる業務を撃破して定時退社を目指せ！<br />コンボとグレイズで残業代を稼げ💰</p>

            <div className="grid w-full grid-cols-3 gap-2">
              {WEAPONS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWeapon(w.id)}
                  className={`rounded-xl border p-2 text-left transition ${weapon === w.id ? 'border-yellow-300 bg-yellow-300/15' : 'border-white/15 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="text-xl">{w.icon}</div>
                  <div className="text-sm font-bold">{w.name}</div>
                  <div className="text-[10px] leading-tight text-gray-300">{w.desc}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => startRun()}
              className="w-full rounded-xl bg-green-500 py-3 text-lg font-black shadow-lg transition hover:bg-green-400 active:scale-95"
            >
              ▶ 出社する
            </button>
            {hasContinue && (
              <button
                onClick={() => {
                  const c = loadContinue();
                  if (c) {
                    setWeapon(c.weapon);
                    startRun({ stage: c.stage, score: c.score, weaponLevel: c.weaponLevel });
                  } else startRun();
                }}
                className="w-full rounded-xl bg-yellow-500 py-2.5 font-bold text-black transition hover:bg-yellow-400 active:scale-95"
              >
                📂 続きから（Stage {loadContinue()?.stage ?? '?'}）
              </button>
            )}

            {scores.length > 0 && (
              <div className="w-full rounded-xl bg-white/5 p-3 text-left text-xs">
                <div className="mb-1 font-bold text-yellow-300">🏆 ハイスコア</div>
                {scores.map((s, i) => (
                  <div key={i} className="flex justify-between border-b border-white/10 py-0.5 last:border-0">
                    <span>{i + 1}. {s.rank}・Stage {s.stage}</span>
                    <span className="font-mono">{s.score.toLocaleString()}円</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex w-full gap-2 text-xs">
              <button onClick={() => setShowHelp((v) => !v)} className="flex-1 rounded-lg bg-white/10 py-2 hover:bg-white/15">
                {showHelp ? '説明を閉じる' : '❓ 遊び方'}
              </button>
              <button onClick={toggleMute} className="flex-1 rounded-lg bg-white/10 py-2 hover:bg-white/15">
                {muted ? '🔇 音オフ中' : '🔊 音オン'}
              </button>
              <button onClick={toggleShake} className="flex-1 rounded-lg bg-white/10 py-2 hover:bg-white/15">
                {shake ? '📳 振動オン' : '📳 振動オフ'}
              </button>
            </div>
            {showHelp && (
              <div className="w-full rounded-xl bg-white/5 p-3 text-left text-[11px] leading-relaxed text-gray-200">
                <p>🖱️ <b>移動</b>: ドラッグ / WASD・矢印（Shiftで精密）</p>
                <p>🔫 <b>攻撃</b>: 自動連射（持ち替えはCキー・🔫取得）</p>
                <p>📄 <b>有給ボム</b>: Xキー / 右下ボタン。弾消し＋大ダメ＋無敵</p>
                <p>✨ <b>グレイズ</b>: 弾をギリギリでかわすとボーナス</p>
                <p>🔥 <b>コンボ</b>: 連続撃破で倍率UP、被弾でリセット</p>
                <p>⏸️ <b> pause</b>: Esc / P。タブ切替で自動停止</p>
              </div>
            )}
          </div>
        )}

        {/* pause */}
        {screen === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 p-6 text-center backdrop-blur-sm">
            <div className="text-3xl font-black">⏸ 休憩中…</div>
            <p className="text-sm text-gray-300">一息ついたら業務に戻ろう</p>
            <button onClick={handlePauseKey} className="w-full max-w-xs rounded-xl bg-green-500 py-3 font-black hover:bg-green-400">
              ▶ 業務再開
            </button>
            <button
              onClick={() => {
                destroyEngine();
                setScreen('title');
                setHasContinue(loadContinue() !== null);
              }}
              className="w-full max-w-xs rounded-xl bg-white/15 py-2.5 hover:bg-white/25"
            >
              タイトルへ
            </button>
          </div>
        )}

        {/* result */}
        {screen === 'result' && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-black/85 p-6 text-center backdrop-blur-sm">
            <div className="text-4xl font-black text-red-400">{result.cleared ? '🎉 定時退社！' : '過労死…'}</div>
            <div className="w-full max-w-xs rounded-xl border border-yellow-300/30 bg-white/5 p-4">
              <div className="text-xs text-gray-300">称号</div>
              <div className="text-2xl font-black text-yellow-300">{result.rank}</div>
              <div className="mt-2 font-mono text-xl">残業代 {result.score.toLocaleString()}円</div>
              <div className="mt-1 text-sm text-gray-300">到達 Stage {result.stage}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-black/40 p-2">🔥最大<br />{result.maxCombo}連</div>
                <div className="rounded-lg bg-black/40 p-2">💥撃破<br />{result.kills}</div>
                <div className="rounded-lg bg-black/40 p-2">✨G<br />{result.graze}</div>
              </div>
              <div className="mt-2 text-[11px] text-gray-400">
                勤務時間 {Math.floor(result.timeMs / 60000)}分{Math.floor((result.timeMs % 60000) / 1000)}秒
                {result.cleared && ' ・ 全6ステージ制覇！'}
              </div>
            </div>
            <button onClick={() => startRun()} className="w-full max-w-xs rounded-xl bg-green-500 py-3 font-black hover:bg-green-400 active:scale-95">
              ↻ 再出社
            </button>
            <button onClick={handleShare} className="w-full max-w-xs rounded-xl bg-blue-500 py-2.5 font-bold hover:bg-blue-400 active:scale-95">
              {shared ? 'コピー済み✓' : '戦績をシェア'}
            </button>
            <button
              onClick={() => {
                clearContinue();
                destroyEngine();
                setScreen('title');
                setHasContinue(false);
              }}
              className="w-full max-w-xs rounded-xl bg-white/15 py-2.5 hover:bg-white/25"
            >
              タイトルへ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
