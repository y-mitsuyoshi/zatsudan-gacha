'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DanmakuEngine, type HudSnapshot } from '@/game/danmaku/engine';
import type { RunResult } from '@/game/danmaku/sim';
import { copyToClipboard } from '@/lib/clipboard';
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
          className={`inline-block h-2.5 w-2.5 rounded-full ${i < n ? 'bg-[#dfb15b]' : 'bg-white/15'}`}
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
    (opts?: { stage?: number; score?: number; power?: number; lives?: number; weapon?: WeaponId; difficulty?: Difficulty }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      destroyEngine();
      const id = ++runId.current;
      const runWeapon = opts?.weapon ?? weapon;
      const runDifficulty = opts?.difficulty ?? difficulty;
      setResult(null);
      setShared(false);
      setFatal(null);
      setBanner(null);
      setHud({ ...DEFAULT_HUD, weapon: runWeapon, difficulty: runDifficulty, score: opts?.score ?? 0, stage: opts?.stage ?? 1 });
      const engine = new DanmakuEngine({
        canvas,
        weapon: runWeapon,
        difficulty: runDifficulty,
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
    [destroyEngine, weapon, difficulty, muted, shake, showBanner, setScreen],
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
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://zatsudan-gacha.app/shachiku-shooting';
    const text = `社畜シューティングNEO[${difficultyDef(result.difficulty).name}]: Stage ${result.stage} / ${result.score.toLocaleString()}点 / 称号「${result.rank}」 #社畜シューティング ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: '社畜シューティングNEO', text });
      } else {
        await copyToClipboard(text);
        setShared(true);
      }
    } catch {
      /* user cancelled — ignore */
    }
  }, [result]);

  const canvasCursor = screen === 'playing' ? 'cursor-none' : '';

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#12100d] text-[#f2e9d8]">
      {/* full-bleed backdrop behind the transparent WebGL canvas */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, #241c14 0%, #15110d 45%, #0b0907 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ boxShadow: 'inset 0 0 180px 40px rgba(0,0,0,0.9)' }} />
      <div className="relative h-full w-full overflow-hidden">
        <canvas ref={canvasRef} className={`absolute inset-0 block h-full w-full touch-none select-none ${canvasCursor}`} />

        {fatal && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#12100d]/95 p-6 text-center">
            <div className="text-2xl font-black text-[#e07054]">エラーが発生しました</div>
            <div className="max-w-sm break-all font-mono text-xs text-[#b7a992]">{fatal}</div>
            <button onClick={() => window.location.reload()} className="rounded-xl bg-[#b23a2a] px-6 py-3 font-black hover:bg-[#c94b38]">
              ↻ 再読み込み
            </button>
          </div>
        )}

        {(screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[520px] -translate-x-1/2 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="rounded-lg border border-[#3b3328] bg-[#12100d]/90 px-2.5 py-1.5 text-xs">
                <div className="font-bold text-[#f2e9d8]">Stage {hud.stage} ・ {titleForStage(hud.stage)} <span className="ml-1 font-normal text-[#83b8ac]">[{difficultyDef(hud.difficulty).name}]</span></div>
                <div className="font-mono text-base leading-tight">{hud.score.toLocaleString()}<span className="text-[10px] text-[#8a7d69]"> pts</span></div>
                <div className="text-[11px] text-[#b7a992]">
                  CHAIN {hud.chain} ・ G {hud.graze}
                </div>
                {hud.chain > 0 && (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#dfb15b]"
                      style={{ width: `${Math.max(0, Math.min(100, (hud.chainT / 4) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="pointer-events-auto flex gap-1.5">
                <button onClick={toggleMute} aria-label={muted ? 'ミュート解除' : 'ミュート'} className="rounded-lg border border-[#3b3328] bg-[#12100d]/90 px-2.5 py-1.5 text-sm hover:border-[#5a4b38]">
                  {muted ? 'OFF' : 'ON'}
                </button>
                <button onClick={handlePauseKey} aria-label="一時停止" className="rounded-lg border border-[#3b3328] bg-[#12100d]/90 px-2.5 py-1.5 text-sm hover:border-[#5a4b38]">
                  停止
                </button>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[#3b3328] bg-[#12100d]/90 px-2.5 py-1.5 text-[11px]">
              <Lives n={hud.lives} />
              <span className="font-label text-[9px] text-[#f0a08b]">BOMB {hud.bombs}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-[#dfb15b]" style={{ width: `${(hud.power / 5) * 100}%` }} />
              </div>
              <span className="font-mono">P{hud.power}</span>
            </div>
            {hud.bossActive && (
              <div className="mt-1.5 rounded-lg border border-[#3b3328] bg-[#12100d]/90 px-2.5 py-1.5">
                <div className="mb-1 text-center text-[11px] font-bold text-[#e07054]">{hud.bossName}</div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#e07054] transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMax)) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {banner && (screen === 'playing' || screen === 'paused') && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center px-6 text-center">
            <div className={`rounded-xl border border-[#3b3328] px-6 py-3 ${banner.spell ? 'border border-[#e07054] bg-[#2b1a17]' : 'bg-[#12100d]/85'}`}>
              {banner.spell && <div className="text-[11px] font-bold tracking-widest text-[#e07054]">✦ SPELL CARD ✦</div>}
              <div className={`text-2xl font-black tracking-wide drop-shadow ${banner.spell ? 'text-[#f0a08b]' : 'text-[#f2e9d8]'}`}>{banner.title}</div>
              {banner.sub && <div className="mt-1 text-sm text-[#e4d9c7]">{banner.sub}</div>}
            </div>
          </div>
        )}

        {screen === 'playing' && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[520px] -translate-x-1/2">
            <div className="absolute bottom-1.5 left-2 font-mono text-[10px] text-[#f2e9d8]/40">
              {hud.fps}fps 弾{hud.pb} 敵弾{hud.eb}
            </div>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                engineRef.current?.useBomb();
              }}
              aria-label="ボム"
              className="pointer-events-auto absolute bottom-6 right-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#f0a08b]/60 bg-[#b23a2a] text-[10px] font-bold tracking-wider shadow-[3px_3px_0_#f2e9d8] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#f2e9d8]"
            >
              BOMB<br />ボム
            </button>
          </div>
        )}

        {screen === 'title' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-[#12100d]/95 p-6 text-center">
            <div className="text-[11px] font-bold tracking-[0.3em] text-[#dfb15b]">NEO DANMAKU STG</div>
            <p className="text-4xl font-black leading-tight tracking-wide">
              社畜<span className="text-[#dfb15b]">シューティング</span>
              <span className="text-[#83b8ac]">NEO</span>
            </p>
            <p className="text-sm text-[#b7a992]">WebGL弾幕STG — 残機制・チェイン・グレイズ・<br />スペルカード取得でハイスコアを狙え！</p>

            <div className="grid w-full max-w-sm grid-cols-2 gap-2">
              {WEAPONS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWeapon(w.id)}
                  className={`rounded-xl border p-2 text-left transition ${weapon === w.id ? 'border-[#dfb15b] bg-[#2a231b]' : 'border-[#3b3328] bg-[#1d1914] hover:bg-[#26211a]'}`}
                >
                  <div className="text-sm font-bold">{w.name}</div>
                  <div className="text-[10px] leading-tight text-[#b7a992]">{w.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid w-full max-w-sm grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-xl border p-2 text-left transition ${difficulty === d.id ? 'border-[#83b8ac] bg-[#172622]' : 'border-[#3b3328] bg-[#1d1914] hover:bg-[#26211a]'}`}
                >
                  <div className="text-sm font-bold">{d.name}</div>
                  <div className="text-[10px] leading-tight text-[#b7a992]">{d.desc}</div>
                </button>
              ))}
            </div>

            <button onClick={() => startRun()} className="w-full max-w-sm border border-[#f2e9d8] bg-[#b23a2a] py-3 text-lg font-black shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#c94b38]">
              出社する
            </button>
            {hasContinue && (
              <button
                onClick={() => {
                  const c = loadContinue();
                  if (c) {
                    setWeapon(c.weapon);
                    setDifficulty(c.difficulty);
                    startRun({
                      stage: c.stage,
                      score: c.score,
                      power: c.weaponLevel,
                      lives: 3,
                      weapon: c.weapon,
                      difficulty: c.difficulty,
                    });
                  } else startRun();
                }}
                className="w-full max-w-sm border border-[#12100d] bg-[#dfb15b] py-2.5 font-bold text-[#12100d] shadow-[3px_3px_0_#f2e9d8] transition hover:bg-[#e8c373]"
              >
                続きから（Stage {loadContinue()?.stage ?? '?'}）
              </button>
            )}

            {scores.length > 0 && (
              <div className="w-full max-w-sm border border-[#3b3328] bg-[#1d1914] p-3 text-left text-xs">
                <div className="mb-1 font-bold text-[#f2e9d8]">ハイスコア</div>
                {scores.map((s, i) => (
                  <div key={i} className="flex justify-between border-b border-[#3b3328] py-0.5 last:border-0">
                    <span>{i + 1}. {s.rank}・Stage {s.stage}</span>
                    <span className="font-mono">{s.score.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex w-full max-w-sm gap-2 text-xs">
              <button onClick={() => setShowHelp((v) => !v)} className="flex-1 border border-[#3b3328] bg-[#1d1914] py-2 hover:border-[#5a4b38]">
                {showHelp ? '説明を閉じる' : '遊び方'}
              </button>
              <button onClick={toggleMute} className="flex-1 border border-[#3b3328] bg-[#1d1914] py-2 hover:border-[#5a4b38]">
                {muted ? '音オフ中' : '音オン'}
              </button>
              <button onClick={toggleShake} className="flex-1 border border-[#3b3328] bg-[#1d1914] py-2 hover:border-[#5a4b38]">
                {shake ? '振動オン' : '振動オフ'}
              </button>
            </div>
            {showHelp && (
              <div className="w-full max-w-sm rounded-xl bg-[#1d1914] p-3 text-left text-[11px] leading-relaxed text-[#e4d9c7]">
                <p><b>移動(マウス)</b>: カーソルに自機が追従（クリック不要）。右ボタン押下で低速精密＋当たり判定表示</p>
                <p><b>移動(タッチ)</b>: ドラッグで相対移動。指の下に自機が隠れません</p>
                <p><b>移動(キー)</b>: WASD・矢印（Shiftで低速精密＋当たり判定表示）</p>
                <p><b>攻撃</b>: 自動連射。Cキーで武器切替（連射・拡散・追尾・レーザー）、オプション機が援護</p>
                <p><b>ボム</b>: Xキー / 右下ボタン。弾消し＋大ダメージ＋無敵</p>
                <p><b>グレイズ</b>: 弾をギリギリでかわして加算</p>
                <p><b>チェイン</b>: 連続撃破で倍率UP。ゲージが切れる前に撃破を続けよう。被弾でリセット</p>
                <p><b>スペル</b>: ボム・被弾なしで突破すると大ボーナス</p>
                <p>停止: Esc / Pで休憩。タブ切替で自動停止</p>
              </div>
            )}
          </div>
        )}

        {screen === 'paused' && !fatal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#12100d]/90 p-6 text-center">
            <div className="text-3xl font-black">停止 休憩中…</div>
            <p className="text-sm text-[#b7a992]">一息ついたら業務に戻ろう</p>
            <button onClick={handlePauseKey} className="w-full max-w-xs rounded-xl bg-[#b23a2a] py-3 font-black hover:bg-[#c94b38]">
              業務再開
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-[#12100d]/95 p-6 text-center">
            <div className="text-4xl font-black text-[#e07054]">{result.cleared ? '定時退社！' : '過労死…'}</div>
            <div className="w-full max-w-xs rounded-xl border border-[#dfb15b]/30 bg-[#1d1914] p-4">
              <div className="text-xs text-[#b7a992]">称号 [{difficultyDef(result.difficulty).name}]</div>
              <div className="text-2xl font-black text-[#f2e9d8]">{result.rank}</div>
              <div className="mt-2 font-mono text-xl">{result.score.toLocaleString()} pts</div>
              <div className="mt-1 text-sm text-[#b7a992]">到達 Stage {result.stage}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-[#12100d]/40 p-2">最大<br />{result.maxChain}連</div>
                <div className="rounded-lg bg-[#12100d]/40 p-2">撃破<br />{result.kills}</div>
                <div className="rounded-lg bg-[#12100d]/40 p-2">G<br />{result.graze}</div>
              </div>
              <div className="mt-2 text-[11px] text-[#8a7d69]">
                勤務時間 {Math.floor(result.timeMs / 60000)}分{Math.floor((result.timeMs % 60000) / 1000)}秒
                {result.cleared && ' ・ 全6ステージ制覇！'}
              </div>
            </div>
            <button onClick={() => startRun()} className="w-full max-w-xs rounded-xl bg-[#b23a2a] py-3 font-black hover:bg-[#c94b38] active:scale-95">
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
