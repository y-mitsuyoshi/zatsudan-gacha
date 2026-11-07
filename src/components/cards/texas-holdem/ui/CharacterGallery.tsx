'use client';

import React, { useState } from 'react';
import { CHARACTERS, CHAR_IDS, charImage, type CharId, type Expression, type VoiceEvent } from '../characters';
import { affectionLevel, type HoldemProfile } from '../profile';
import { CharAvatar } from './CharAvatar';
import {
  FOCUS_RING,
  GameButton,
  IconCrown,
  IconHeart,
  IconSpeaker,
  ModalShell,
  PORTRAIT_MASK,
  SUB_LABEL,
  randomLine,
  speakLine,
  stagger,
} from './OutGameKit';

export interface CharacterGalleryProps {
  open: boolean;
  profile: HoldemProfile;
  onClose(): void;
  onSelectPartner(id: CharId): void;
}

const EVENT_LABEL: Record<VoiceEvent, string> = {
  greet: 'あいさつ',
  select: '選択時',
  check: 'チェック',
  call: 'コール',
  raise: 'レイズ',
  allin: 'オールイン',
  fold: 'フォールド',
  win: '勝利',
  bigWin: '大勝利',
  lose: '敗北',
  think: '思考中',
};

const EVENT_ORDER: VoiceEvent[] = ['greet', 'select', 'check', 'call', 'raise', 'allin', 'fold', 'win', 'bigWin', 'lose', 'think'];

/** Heart meter for affection (親密度). */
export function AffectionMeter({ points, color }: { points: number; color: string }) {
  const { level, progress } = affectionLevel(points);
  return (
    <div aria-label={`親密度 レベル${level}`} role="img">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tracking-[0.2em] text-rose-200/80">親密度</span>
        <span className="text-sm font-black text-rose-300">Lv.{level}</span>
        <span className="flex gap-0.5" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <IconHeart
              key={i}
              filled={i < level}
              className={`h-3.5 w-3.5 ${i < level ? 'text-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.8)]' : 'text-slate-600'}`}
            />
          ))}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-black/60 ring-1 ring-rose-300/20">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: `linear-gradient(90deg, #fb7185, ${color})`,
            transformOrigin: 'left',
            animation: 'rfn-bar 700ms ease-out both',
          }}
        />
      </div>
    </div>
  );
}

/** Full-screen character list + detail pane with voice previews and partner selection. */
export function CharacterGallery({ open, profile, onClose, onSelectPartner }: CharacterGalleryProps) {
  const [selected, setSelected] = useState<CharId>(profile.partner);
  const [expr, setExpr] = useState<Expression>('normal');
  const [bubble, setBubble] = useState<{ text: string; key: number } | null>(null);

  const ch = CHARACTERS[selected];
  const isPartner = profile.partner === selected;
  const voiceOn = profile.settings.voiceOn;

  const say = (id: CharId, text: string) => {
    speakLine(id, text, voiceOn);
    setBubble({ text, key: Date.now() });
  };

  const pick = (id: CharId) => {
    if (id === selected) return;
    setSelected(id);
    setExpr('normal');
    setBubble(null);
  };

  const close = () => {
    setSelected(profile.partner);
    setBubble(null);
    onClose();
  };

  return (
    <ModalShell open={open} onClose={close} title="キャラクター" titleEn="CHARACTERS" maxWidth="max-w-5xl" tall>
      <div className="flex min-h-full flex-col lg:flex-row">
        {/* list */}
        <div className="max-h-[36dvh] shrink-0 overflow-y-auto border-b border-amber-300/10 p-3 lg:max-h-none lg:w-[320px] lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-6 gap-2 lg:grid-cols-2" role="listbox" aria-label="キャラクター一覧">
            {CHAR_IDS.map((id, i) => {
              const c = CHARACTERS[id];
              const active = id === selected;
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={`${c.name} ${c.title}`}
                  onClick={() => pick(id)}
                  className={`group relative overflow-hidden rounded-xl border transition duration-200 active:scale-[0.96] ${FOCUS_RING} ${
                    active ? 'border-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.45)]' : 'border-white/10 hover:border-amber-300/50'
                  }`}
                  style={{ ...stagger(i, 40), background: `linear-gradient(160deg, ${c.color}55, #070b14 75%)` }}
                >
                  <div className="aspect-square lg:aspect-[4/5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={charImage(id)}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      className={`h-full w-full object-cover object-top transition duration-300 group-hover:scale-105 ${active ? '' : 'brightness-75 group-hover:brightness-100'}`}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-1.5 pt-5 text-left lg:block">
                    <p className="text-[8px] tracking-[0.2em] text-white/60">{c.nameEn}</p>
                    <p className="truncate text-xs font-black" style={{ color: c.color }}>
                      {c.name}
                    </p>
                  </div>
                  {profile.partner === id && (
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-slate-950 shadow" aria-label="パートナー">
                      <IconCrown className="h-3 w-3" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: c.color }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* detail */}
        <div key={selected} className="relative min-w-0 flex-1 overflow-hidden" style={{ animation: 'rfn-fade-in 300ms ease-out both' }}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(circle at 30% 30%, ${ch.color}40, transparent 60%), radial-gradient(circle at 80% 90%, ${ch.color2}22, transparent 55%)` }}
          />
          <div className="relative grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {/* illustration */}
            <div className="relative mx-auto w-full max-w-[340px]">
              <div className="relative aspect-square" style={{ animation: 'rfn-slide-left 420ms cubic-bezier(.2,.8,.2,1) both' }}>
                <div className="absolute inset-[8%] rounded-full blur-3xl" style={{ background: `${ch.color}55` }} />
                <button
                  type="button"
                  onClick={() => say(selected, randomLine(selected, ['greet', 'select', 'win']))}
                  aria-label={`${ch.name}に話しかける`}
                  className={`relative block h-full w-full rounded-3xl ${FOCUS_RING}`}
                >
                  {(['normal', 'win'] as const).map((e) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={e}
                      src={charImage(selected, e)}
                      alt={e === expr ? `${ch.name}（${e === 'win' ? '勝利' : '通常'}）` : ''}
                      draggable={false}
                      className={`rfn-motion absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${e === expr ? 'opacity-100' : 'opacity-0'}`}
                      style={{ ...PORTRAIT_MASK, animation: 'rfn-float 5s ease-in-out infinite' }}
                    />
                  ))}
                </button>
                {bubble && (
                  <div
                    key={bubble.key}
                    className="pointer-events-none absolute inset-x-2 top-2 z-10 rounded-2xl border bg-slate-950/90 px-3 py-2 text-center text-sm font-bold text-white shadow-xl backdrop-blur"
                    style={{ borderColor: `${ch.color}aa`, animation: 'rfn-bubble 4.2s ease-out both' }}
                    role="status"
                  >
                    「{bubble.text}」
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-center">
                <div role="radiogroup" aria-label="表情切り替え" className="inline-flex rounded-full border border-amber-300/25 bg-black/50 p-0.5">
                  {(['normal', 'win'] as const).map((e) => (
                    <button
                      key={e}
                      type="button"
                      role="radio"
                      aria-checked={expr === e}
                      onClick={() => setExpr(e)}
                      className={`rounded-full px-4 py-1 text-xs font-bold transition ${FOCUS_RING} ${
                        expr === e ? 'bg-amber-400 text-slate-950' : 'text-amber-100/70 hover:text-amber-50'
                      }`}
                    >
                      {e === 'normal' ? '通常' : '勝利'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* profile text */}
            <div className="min-w-0 space-y-3" style={{ animation: 'rfn-slide-right 420ms cubic-bezier(.2,.8,.2,1) 60ms both' }}>
              <div>
                <p className="text-[10px] font-bold tracking-[0.35em]" style={{ color: ch.color }}>
                  {ch.nameEn}
                </p>
                <h3 className="text-2xl font-black tracking-wide text-white drop-shadow sm:text-3xl">{ch.name}</h3>
                <p className="mt-0.5 text-sm font-bold text-amber-200">{ch.title}</p>
                <p className="mt-1 text-sm italic text-slate-300">「{ch.catchphrase}」</p>
              </div>
              <AffectionMeter points={profile.affection[selected] ?? 0} color={ch.color} />
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  { k: 'プレイスタイル', v: ch.styleLabel },
                  { k: '好きなハンド', v: ch.favoriteHand },
                  { k: 'キャラクターボイス', v: `${ch.voiceStyle} (${ch.cvCredit.replace(/^(VOICEVOX:|CV:\s*)/, '')})` },
                ].map((r) => (
                  <div key={r.k} className="rounded-xl border border-white/10 bg-black/40 px-1.5 py-2">
                    <dt className="text-[9px] tracking-wider text-slate-400">{r.k}</dt>
                    <dd className="mt-0.5 text-[11px] font-black leading-tight sm:text-xs" style={{ color: ch.color }}>
                      {r.v}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-[13px] leading-relaxed text-slate-200">{ch.bio}</p>

              {/* Tactical Signature Card */}
              <div className="rounded-xl border border-amber-300/25 bg-black/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black tracking-[0.22em] text-amber-300">
                    TACTICAL SIGNATURE · 戦術シグネチャ
                  </span>
                  <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-200">
                    全キャラ同格プロ水準
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ch.tacticalBadges.map((b) => (
                    <span
                      key={b}
                      className="rounded-full border px-2 py-0.5 text-[10px] font-black"
                      style={{ borderColor: `${ch.color}66`, backgroundColor: `${ch.color}1f`, color: ch.color }}
                    >
                      #{b}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{ch.tacticalSummary}</p>
              </div>

              <div>
                <p className={`${SUB_LABEL} mb-1.5`}>VOICE LINES</p>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_ORDER.flatMap((ev) =>
                    ch.lines[ev].map((line, li) => (
                      <button
                        key={`${ev}-${li}`}
                        type="button"
                        title={line}
                        aria-label={`ボイス再生：${EVENT_LABEL[ev]} ${li + 1}`}
                        onClick={() => say(selected, line)}
                        className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-slate-200 transition hover:border-amber-300/50 hover:text-amber-100 active:scale-95 ${FOCUS_RING}`}
                      >
                        <IconSpeaker className="h-3 w-3" />
                        {EVENT_LABEL[ev]}
                        {ch.lines[ev].length > 1 ? li + 1 : ''}
                      </button>
                    )),
                  )}
                </div>
                {!voiceOn && <p className="mt-1.5 text-[10px] text-slate-500">※ボイスは設定でOFFになっています（セリフは表示されます）</p>}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <CharAvatar id={selected} size={44} active={isPartner} />
                <GameButton
                  variant={isPartner ? 'dark' : 'gold'}
                  disabled={isPartner}
                  className="flex-1 px-4 py-3 text-base"
                  aria-label={isPartner ? '現在のパートナー' : `${ch.name}をパートナーに設定`}
                  onClick={() => {
                    onSelectPartner(selected);
                    say(selected, randomLine(selected, ['select']));
                  }}
                >
                  <IconCrown />
                  {isPartner ? '現在のパートナー' : 'パートナーに設定'}
                </GameButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
