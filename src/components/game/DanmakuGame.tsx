'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DanmakuEngine, type HudSnapshot } from '@/game/danmaku/engine';
import type { RunResult } from '@/game/danmaku/sim';
import { WEAPONS, DIFFICULTIES, difficultyDef, titleForStage, type Difficulty, type WeaponId } from '@/game/danmaku/config';
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
  score: 0, chain: 0, chainT: 0, maxChain: 0, stage: 1, lives: 3, bombs: 3,
  power: 1, weapon: 'rensa', difficulty: 'normal', bossActive: false,
  bossHp: 0, bossMax: 1, bossName: '', kills: 0, graze: 0,
  fps: 60, pb: 0, eb: 0,
};

function Lives({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`残機${n}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`inline-block h-2.5 w-2.5 rounded-full ${i < n ? 'bg-cyan-300 shadow-[0_0_6px_#67e8f9]' : 'bg-white/15'}`}
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
  const [banner, setBanner] = useState<{ title: string; sub?: string; spell?: boolean } | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [weapon, setWeapon] = useState<WeaponId>('rensa');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
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

  const showBanner = useCallback((title: string, sub?: string, spell?: boolean) => {
    setBanner({ title, sub, spell });
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), spell ? 2200 : 2600);
  }, []);

  const startRun = useCallback(
    (opts?: { stage?: number; score?: number; power?: number; lives?: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      destroyEngine();
      const id = ++runId.current;
      setResult(null);
      setShared(false);
      setFatal(null);
      setBanner(null);
      setHud({ ...DEFAULT_HUD, weapon, difficulty, score: opts?.score ?? 0, stage: opts?.stage ?? 1 });
      const engine = new DanmakuEngine({
        canvas,
        weapon,
        difficulty,
        power: opts?.power ?? 1,
        stage: opts?.stage ?? 1,
        score: opts?.score ?? 0,
        lives: opts?.lives ?? 3,
        muted,
        shake,
        onEvent: (e) => {
          if (id !== runId.current) return;
          if (e.type === 'hud') setHud(e.hud);
          else if (e.type === 'banner') showBanner(e.title, e.sub, e.spell);
          else if (e.type === 'gameover') {
            setScores(saveScore({ score: e.result.score, stage: e.result.stage, rank: e.result.rank, date: Date.now() }));
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
    [destroyEngine, weapon, difficulty, muted, shake, showBanner],
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
        const s = screenRef.current;
        if (s === 'playing' || s === 'paused') handlePauseKey();
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
    const text = `社畜シューティングNEO[${difficultyDef(result.difficulty).name}]: Stage ${result.stage} / ${result.score.toLocaleString()}点 / 称号「${result.rank}」 #社畜シューティング ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '社畜シューティングNEO', text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShared(true);
      }
    } catch {
      /* user cancelled — ignore */
    }
  }, [result]);

  const canvasCursor = screen === 'playing' ? 'cursor-none' : '';

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* full-bleed backdrop behind the transparent WebGL canvas */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, #141b3d 0%, #0a0d22 45%, #030308 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ boxShadow: 'inset 0 0 180px 40px rgba(0,0,0,0.9)' }} />
      <div className="relative h-full w-full overflow-hidden">
        <canvas ref={canvasRef} className={`absolute inset-0 block h-full w-full touch-none select-none ${canvasCursor}`} />

        {fatal && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
            <div className="text-2xl font-black text-red-400">エラーが発生しました</div>
            <div className="max-w-sm break-all font-mono text-xs text-gray-300">{fatal}</div>
            <button onClick={() => window.location.reload()} className="rounded-xl bg-green-500 px-6 py-3 font-black hover:bg-green-400">
              ↻ 再読み込み
            </button>
          </div>
        )}

        {(screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[520px] -translate-x-1/2 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="rounded-lg bg-black/60 px-2.5 py-1.5 text-xs backdrop-blur-sm">
                <div className="font-bold text-yellow-300">Stage {hud.stage} ・ {titleForStage(hud.stage)} <span className="ml-1 font-normal text-cyan-300">[{difficultyDef(hud.difficulty).name}]</span></div>
                <div className="font-mono text-base leading-tight">{hud.score.toLocaleString()}<span className="text-[10px] text-gray-400"> pts</span></div>
                <div className="text-[11px] text-gray-300">
                  CHAIN {hud.chain} ・ G {hud.graze}
                </div>
                {hud.chain > 0 && (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-300"
                      style={{ width: `${Math.max(0, Math.min(100, (hud.chainT / 4) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="pointer-events-auto flex gap-1.5">
                <button onClick={toggleMute} aria-label={muted ? 'ミュート解除' : 'ミュート'} className="rounded-lg bg-black/60 px-2.5 py-1.5 text-sm backdrop-blur-sm hover:bg-black/80">
                  {muted ? '🔇' : '🔊'}
                </button>
                <button onClick={handlePauseKey} aria-label="一時停止" className="rounded-lg bg-black/60 px-2.5 py-1.5 text-sm backdrop-blur-sm hover:bg-black/80">
                  ⏸
                </button>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] backdrop-blur-sm">
              <Lives n={hud.lives} />
              <span className="text-pink-300">💣×{hud.bombs}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-yellow-300" style={{ width: `${(hud.power / 5) * 100}%` }} />
              </div>
              <span className="font-mono">P{hud.power}</span>
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

        {banner && (screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center px-6 text-center">
            <div className={`rounded-xl px-6 py-3 backdrop-blur-sm ${banner.spell ? 'border border-fuchsia-400/50 bg-fuchsia-950/70' : 'bg-black/70'}`}>
              {banner.spell && <div className="text-[11px] font-bold tracking-widest text-fuchsia-300">✦ SPELL CARD ✦</div>}
              <div className={`text-2xl font-black tracking-wide drop-shadow ${banner.spell ? 'text-fuchsia-200' : 'text-yellow-300'}`}>{banner.title}</div>
              {banner.sub && <div className="mt-1 text-sm text-gray-200">{banner.sub}</div>}
            </div>
          </div>
        )}

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
              aria-label="ボム"
              className="pointer-events-auto absolute bottom-6 right-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-pink-300/60 bg-pink-600/70 text-xs font-bold shadow-lg backdrop-blur-sm active:scale-95"
            >
              💣<br />ボム
            </button>
          </div>
        )}

        {screen === 'title' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-gradient-to-b from-[#0b1026]/95 via-[#101a3a]/95 to-black/95 p-6 text-center">
            <div className="text-[11px] font-bold tracking-[0.3em] text-cyan-300">NEO DANMAKU STG</div>
            <h1 className="text-4xl font-black leading-tight tracking-wide">
              社畜<span className="bg-gradient-to-r from-yellow-200 to-orange-400 bg-clip-text text-transparent">シューティング</span>
              <span className="text-cyan-300">NEO</span>
            </h1>
            <p className="text-sm text-gray-300">WebGL弾幕STG — 残機制・チェイン・グレイズ・<br />スペルカード取得でハイスコアを狙え！</p>

            <div className="grid w-full max-w-sm grid-cols-2 gap-2">
              {WEAPONS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWeapon(w.id)}
                  className={`rounded-xl border p-2 text-left transition ${weapon === w.id ? 'border-yellow-300 bg-yellow-300/15' : 'border-white/15 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="text-sm font-bold">{w.name}</div>
                  <div className="text-[10px] leading-tight text-gray-300">{w.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid w-full max-w-sm grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-xl border p-2 text-left transition ${difficulty === d.id ? 'border-cyan-300 bg-cyan-300/15' : 'border-white/15 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="text-sm font-bold">{d.name}</div>
                  <div className="text-[10px] leading-tight text-gray-300">{d.desc}</div>
                </button>
              ))}
            </div>

            <button onClick={() => startRun()} className="w-full max-w-sm rounded-xl bg-green-500 py-3 text-lg font-black shadow-lg transition hover:bg-green-400 active:scale-95">
              ▶ 出社する
            </button>
            {hasContinue && (
              <button
                onClick={() => {
                  const c = loadContinue();
                  if (c) {
                    setWeapon(c.weapon);
                    startRun({ stage: c.stage, score: c.score, power: c.weaponLevel, lives: 3 });
                  } else startRun();
                }}
                className="w-full max-w-sm rounded-xl bg-yellow-500 py-2.5 font-bold text-black transition hover:bg-yellow-400 active:scale-95"
              >
                📂 続きから（Stage {loadContinue()?.stage ?? '?'}）
              </button>
            )}

            {scores.length > 0 && (
              <div className="w-full max-w-sm rounded-xl bg-white/5 p-3 text-left text-xs">
                <div className="mb-1 font-bold text-yellow-300">🏆 ハイスコア</div>
                {scores.map((s, i) => (
                  <div key={i} className="flex justify-between border-b border-white/10 py-0.5 last:border-0">
                    <span>{i + 1}. {s.rank}・Stage {s.stage}</span>
                    <span className="font-mono">{s.score.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex w-full max-w-sm gap-2 text-xs">
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
              <div className="w-full max-w-sm rounded-xl bg-white/5 p-3 text-left text-[11px] leading-relaxed text-gray-200">
                <p>🖱️ <b>移動(マウス)</b>: カーソルに自機が追従（クリック不要）。右ボタン押下で低速精密＋当たり判定表示</p>
                <p>👆 <b>移動(タッチ)</b>: ドラッグで相対移動。指の下に自機が隠れません</p>
                <p>⌨️ <b>移動(キー)</b>: WASD・矢印（Shiftで低速精密＋当たり判定表示）</p>
                <p>🔫 <b>攻撃</b>: 自動連射。Cキーで武器切替（連射・拡散・追尾・レーザー）、オプション機が援護</p>
                <p>💣 <b>ボム</b>: Xキー / 右下ボタン。弾消し＋大ダメージ＋無敵</p>
                <p>✨ <b>グレイズ</b>: 弾をギリギリでかわして加算</p>
                <p>🔥 <b>チェイン</b>: 連続撃破で倍率UP。ゲージが切れる前に撃破を続けよう。被弾でリセット</p>
                <p>🃏 <b>スペル</b>: ボム・被弾なしで突破すると大ボーナス</p>
                <p>⏸️ Esc / Pで休憩。タブ切替で自動停止</p>
              </div>
            )}
          </div>
        )}

        {screen === 'paused' && !fatal && (
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

        {screen === 'result' && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-black/85 p-6 text-center backdrop-blur-sm">
            <div className="text-4xl font-black text-red-400">{result.cleared ? '🎉 定時退社！' : '過労死…'}</div>
            <div className="w-full max-w-xs rounded-xl border border-yellow-300/30 bg-white/5 p-4">
              <div className="text-xs text-gray-300">称号 [{difficultyDef(result.difficulty).name}]</div>
              <div className="text-2xl font-black text-yellow-300">{result.rank}</div>
              <div className="mt-2 font-mono text-xl">{result.score.toLocaleString()} pts</div>
              <div className="mt-1 text-sm text-gray-300">到達 Stage {result.stage}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-black/40 p-2">🔥最大<br />{result.maxChain}連</div>
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
