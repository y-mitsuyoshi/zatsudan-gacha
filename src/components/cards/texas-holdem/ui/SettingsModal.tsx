'use client';

import React from 'react';
import { holdemAudio } from '../audio';
import type { HoldemSettings } from '../profile';
import { FOCUS_RING, ModalShell, SUB_LABEL, IconSpeaker } from './OutGameKit';

export interface SettingsModalProps {
  open: boolean;
  settings: HoldemSettings;
  onChange(s: HoldemSettings): void;
  onClose(): void;
}

type VolumeKey = 'masterVolume' | 'bgmVolume' | 'seVolume' | 'voiceVolume';
type ToggleKey = 'voiceOn' | 'showHud' | 'squeeze' | 'reducedFx';

const VOLUMES: { key: VolumeKey; label: string; en: string }[] = [
  { key: 'masterVolume', label: 'マスター音量', en: 'MASTER' },
  { key: 'bgmVolume', label: 'BGM', en: 'MUSIC' },
  { key: 'seVolume', label: '効果音', en: 'SOUND FX' },
  { key: 'voiceVolume', label: 'ボイス', en: 'VOICE' },
];

const TOGGLES: { key: ToggleKey; label: string; desc: string }[] = [
  { key: 'voiceOn', label: 'キャラクターボイス', desc: 'セリフを音声で読み上げます' },
  { key: 'showHud', label: '勝率・アウツ表示', desc: '対局中に勝率やアウツのHUDを表示' },
  { key: 'squeeze', label: 'スクイーズ演出', desc: '配られたハンドをめくって確認' },
  { key: 'reducedFx', label: 'エフェクト軽減', desc: 'アニメーション・パーティクルを控えめに' },
];

const SPEEDS: { id: HoldemSettings['speed']; label: string }[] = [
  { id: 'slow', label: 'ゆっくり' },
  { id: 'normal', label: 'ふつう' },
  { id: 'fast', label: 'はやい' },
];

function applyVolumes(s: HoldemSettings) {
  holdemAudio.setVolumes({ master: s.masterVolume, bgm: s.bgmVolume, se: s.seVolume, voice: s.voiceVolume });
}

const SLIDER_CSS = `
.rfn-slider { -webkit-appearance: none; appearance: none; height: 22px; background: transparent; cursor: pointer; }
.rfn-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; background: linear-gradient(90deg, #f59e0b 0%, #fde68a var(--v), rgba(0,0,0,0.6) var(--v)); box-shadow: inset 0 0 0 1px rgba(252,211,77,0.3); }
.rfn-slider::-moz-range-track { height: 6px; border-radius: 999px; background: rgba(0,0,0,0.6); box-shadow: inset 0 0 0 1px rgba(252,211,77,0.3); }
.rfn-slider::-moz-range-progress { height: 6px; border-radius: 999px; background: linear-gradient(90deg, #f59e0b, #fde68a); }
.rfn-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; margin-top: -7px; border-radius: 999px; background: radial-gradient(circle at 35% 30%, #fffbeb, #fbbf24 55%, #b45309); border: 1px solid #fff7d6; box-shadow: 0 2px 6px rgba(0,0,0,0.6); }
.rfn-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 999px; background: radial-gradient(circle at 35% 30%, #fffbeb, #fbbf24 55%, #b45309); border: 1px solid #fff7d6; box-shadow: 0 2px 6px rgba(0,0,0,0.6); }
.rfn-slider:focus-visible { outline: 2px solid #fcd34d; outline-offset: 3px; border-radius: 999px; }
`;

/** Audio / gameplay settings. Live-applies every change. Renders nothing when closed. */
export function SettingsModal({ open, settings, onChange, onClose }: SettingsModalProps) {
  if (!open) return null;

  const update = (patch: Partial<HoldemSettings>, sound = true) => {
    const next = { ...settings, ...patch };
    applyVolumes(next);
    onChange(next);
    if (sound) holdemAudio.se('click');
  };

  return (
    <ModalShell open={open} onClose={onClose} title="設定" titleEn="SETTINGS" maxWidth="max-w-md">
      <style>{SLIDER_CSS}</style>
      <div className="space-y-6 px-5 py-5">
        <section aria-label="音量">
          <p className={`${SUB_LABEL} mb-3`}>SOUND</p>
          <div className="space-y-3.5">
            {VOLUMES.map((v) => {
              const pct = Math.round(settings[v.key] * 100);
              return (
                <div key={v.key} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3">
                  <label htmlFor={`rfn-vol-${v.key}`} className="leading-tight">
                    <span className="block text-sm font-bold text-amber-50">{v.label}</span>
                    <span className="block text-[9px] tracking-[0.25em] text-amber-200/50">{v.en}</span>
                  </label>
                  <input
                    id={`rfn-vol-${v.key}`}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={pct}
                    aria-label={`${v.label} ${pct}%`}
                    className="rfn-slider w-full"
                    style={{ ['--v' as string]: `${pct}%` } as React.CSSProperties}
                    onChange={(e) => update({ [v.key]: Number(e.target.value) / 100 } as Partial<HoldemSettings>, false)}
                    onPointerUp={() => holdemAudio.se('click')}
                    onKeyUp={() => holdemAudio.se('click')}
                  />
                  <span className="text-right text-xs font-bold tabular-nums text-amber-200">{pct}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-label="ゲーム設定">
          <p className={`${SUB_LABEL} mb-3`}>GAMEPLAY</p>
          <div className="divide-y divide-amber-300/10 overflow-hidden rounded-2xl border border-amber-300/20 bg-black/30">
            {TOGGLES.map((t) => {
              const on = settings[t.key];
              return (
                <button
                  key={t.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t.label}
                  onClick={() => update({ [t.key]: !on } as Partial<HoldemSettings>)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-amber-300/5 ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-amber-50">
                      {t.key === 'voiceOn' && <IconSpeaker className="h-3.5 w-3.5 text-amber-300" />}
                      {t.label}
                    </span>
                    <span className="block text-[11px] text-slate-400">{t.desc}</span>
                  </span>
                  <span
                    className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ${
                      on
                        ? 'border-amber-100/70 bg-gradient-to-b from-amber-300 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.45)]'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-gradient-to-b from-white to-slate-200 shadow-md transition-transform duration-200 ease-out ${
                        on ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="進行スピード">
          <p className={`${SUB_LABEL} mb-1`}>GAME SPEED</p>
          <p className="mb-2.5 text-sm font-bold text-amber-50">CPUの思考スピード</p>
          <div role="radiogroup" aria-label="進行スピード" className="grid grid-cols-3 gap-1 rounded-xl border border-amber-300/25 bg-black/40 p-1">
            {SPEEDS.map((sp) => {
              const active = settings.speed === sp.id;
              return (
                <button
                  key={sp.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`スピード ${sp.label}`}
                  onClick={() => !active && update({ speed: sp.id })}
                  className={`rounded-lg py-2 text-sm font-bold transition duration-200 active:scale-[0.96] ${FOCUS_RING} ${
                    active
                      ? 'bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.4)]'
                      : 'text-amber-100/70 hover:bg-white/5'
                  }`}
                >
                  {sp.label}
                </button>
              );
            })}
          </div>
        </section>

        <p className="text-center text-[10px] text-slate-500">設定は自動で保存されます</p>
      </div>
    </ModalShell>
  );
}
