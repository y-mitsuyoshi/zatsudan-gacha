'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  getAudioSettings,
  getServerAudioSettings,
  setAudioSettings,
  subscribeAudioSettings,
  type AudioSettings,
} from '@/game/common/audioSettings';
import { bgm } from '@/game/common/bgm';
import type { BgmTrackId } from '@/game/common/bgmTracks';

/** 共有オーディオ設定 (BGM/SE ON/OFF) を購読する */
export function useAudioSettings(): [AudioSettings, (patch: Partial<AudioSettings>) => void] {
  const s = useSyncExternalStore(subscribeAudioSettings, getAudioSettings, getServerAudioSettings);
  return [s, setAudioSettings];
}

/**
 * 指定トラックをBGMとして流す。track が null なら停止。
 * paused=true の間は一時停止 (ゲームのポーズ画面など)。アンマウント時に停止する。
 */
export function useBgm(track: BgmTrackId | null, paused = false): void {
  useEffect(() => {
    if (track) bgm.play(track);
    else bgm.stop();
  }, [track]);

  useEffect(() => {
    if (paused) bgm.pause();
    else bgm.resume();
  }, [paused]);

  useEffect(() => () => bgm.stop(0.3), []);
}

interface AudioToggleProps {
  /** 'compact' はアイコンのみ (ゲームHUD向け) */
  variant?: 'compact' | 'full';
  className?: string;
  /** 効果音トグルも表示する (既定 true) */
  showSe?: boolean;
}

const MusicIcon = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
    {off && <line x1="3" y1="3" x2="21" y2="21" />}
  </svg>
);

const SpeakerIcon = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    {off ? (
      <>
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </>
    ) : (
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
    )}
  </svg>
);

/** BGM / 効果音 の ON/OFF トグル。全社畜ゲームで共通利用する。 */
export function AudioToggle({ variant = 'compact', className = '', showSe = true }: AudioToggleProps) {
  const [s, set] = useAudioSettings();
  const btn =
    'inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        className={`${btn} ${s.bgm ? '' : 'opacity-60'}`}
        aria-pressed={s.bgm}
        aria-label={s.bgm ? 'BGMをオフにする' : 'BGMをオンにする'}
        title={s.bgm ? 'BGM: ON' : 'BGM: OFF'}
        onClick={(e) => {
          e.stopPropagation();
          set({ bgm: !s.bgm });
        }}
      >
        <MusicIcon off={!s.bgm} />
        {variant === 'full' && <span>BGM {s.bgm ? 'ON' : 'OFF'}</span>}
      </button>
      {showSe && (
        <button
          type="button"
          className={`${btn} ${s.se ? '' : 'opacity-60'}`}
          aria-pressed={s.se}
          aria-label={s.se ? '効果音をオフにする' : '効果音をオンにする'}
          title={s.se ? '効果音: ON' : '効果音: OFF'}
          onClick={(e) => {
            e.stopPropagation();
            set({ se: !s.se });
          }}
        >
          <SpeakerIcon off={!s.se} />
          {variant === 'full' && <span>効果音 {s.se ? 'ON' : 'OFF'}</span>}
        </button>
      )}
    </div>
  );
}
