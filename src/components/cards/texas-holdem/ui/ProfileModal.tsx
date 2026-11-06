'use client';

import React, { useState } from 'react';
import { CHARACTERS } from '../characters';
import { computeRank, RANK_TIERS, type HoldemProfile } from '../profile';
import { CharAvatar } from './CharAvatar';
import { RankBadge, RankEmblem } from './RankBadge';
import { FOCUS_RING, GameButton, IconPencil, ModalShell, SUB_LABEL, fmt, stagger } from './OutGameKit';

export interface ProfileModalProps {
  open: boolean;
  profile: HoldemProfile;
  onClose(): void;
  onRename(name: string): void;
}

const NAME_MAX = 12;

/** Player card: name, rank, ladder and lifetime stats. */
export function ProfileModal({ open, profile, onClose, onRename }: ProfileModalProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const rank = computeRank(profile.rankPoints);
  const partner = CHARACTERS[profile.partner];
  const st = profile.stats;
  const winRate = st.handsPlayed > 0 ? Math.round((st.handsWon / st.handsPlayed) * 1000) / 10 : 0;

  const startEdit = () => {
    setDraft(profile.playerName);
    setEditing(true);
  };
  const commit = () => {
    const name = Array.from(draft.trim()).slice(0, NAME_MAX).join('');
    if (name && name !== profile.playerName) onRename(name);
    setEditing(false);
  };
  const close = () => {
    setEditing(false);
    onClose();
  };

  const stats: { label: string; en: string; value: string; accent?: boolean }[] = [
    { label: 'プレイハンド', en: 'HANDS', value: fmt(st.handsPlayed) },
    { label: '勝率', en: 'WIN RATE', value: `${winRate}%`, accent: true },
    { label: 'ショーダウン勝利', en: 'SHOWDOWNS WON', value: fmt(st.showdownsWon) },
    { label: '最大獲得ポット', en: 'BIGGEST POT', value: fmt(st.biggestPot), accent: true },
    { label: '最高役', en: 'BEST HAND', value: st.bestHandCategory >= 0 && st.bestHandName ? st.bestHandName : '—' },
    { label: 'トーナメント優勝', en: 'TOURNAMENT WINS', value: fmt(st.tournamentsWon) },
    { label: 'オールイン勝利', en: 'ALL-IN WINS', value: fmt(st.allInWins) },
    { label: 'セッション数', en: 'SESSIONS', value: fmt(st.sessions) },
  ];

  const currentTierIndex = RANK_TIERS.findIndex((t) => t.id === rank.tier.id);

  return (
    <ModalShell open={open} onClose={close} title="プロフィール" titleEn="PLAYER PROFILE" maxWidth="max-w-2xl" tall>
      <div className="space-y-5 px-4 py-5 sm:px-6">
        {/* Player card */}
        <section
          className="relative overflow-hidden rounded-2xl border border-amber-300/30 p-4 sm:p-5"
          style={{
            ...stagger(0),
            background: `linear-gradient(135deg, ${partner.color}33, rgba(7,11,20,0.92) 55%), radial-gradient(circle at 90% 10%, ${partner.color2}33, transparent 60%)`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.025)_0_2px,transparent_2px_10px)]" />
          <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center">
              <RankEmblem tier={rank.tier} size={112} stars={rank.stars} />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className={SUB_LABEL}>PLAYER NAME</p>
              {editing ? (
                <form
                  className="mt-1 flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    commit();
                  }}
                >
                  <input
                    autoFocus
                    value={draft}
                    maxLength={NAME_MAX}
                    onChange={(e) => setDraft(Array.from(e.target.value).slice(0, NAME_MAX).join(''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setEditing(false);
                      }
                    }}
                    aria-label="プレイヤー名（12文字まで）"
                    className="min-w-0 flex-1 rounded-lg border border-amber-300/50 bg-black/60 px-3 py-2 text-lg font-black text-amber-50 outline-none focus:border-amber-200 focus:ring-2 focus:ring-amber-300/40"
                  />
                  <GameButton type="submit" variant="gold" className="px-3 py-2 text-sm" aria-label="名前を保存">
                    保存
                  </GameButton>
                </form>
              ) : (
                <div className="mt-0.5 flex items-center justify-center gap-2 sm:justify-start">
                  <h3 className="truncate text-2xl font-black tracking-wide text-amber-50 drop-shadow">{profile.playerName}</h3>
                  <button
                    type="button"
                    onClick={startEdit}
                    aria-label="名前を変更"
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-black/40 text-amber-200 transition hover:bg-amber-300/10 active:scale-95 ${FOCUS_RING}`}
                  >
                    <IconPencil />
                  </button>
                </div>
              )}
              {editing && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {Array.from(draft).length}/{NAME_MAX} 文字
                </p>
              )}
              <div className="mt-3 flex justify-center sm:justify-start">
                <RankBadge points={profile.rankPoints} size="md" showProgress />
              </div>
              <p className="mt-2 text-xs text-amber-100/70">
                ランクポイント <span className="font-black tabular-nums text-amber-200">{fmt(profile.rankPoints)}</span> pt
                <span className="mx-2 text-amber-300/30">|</span>
                コイン <span className="font-black tabular-nums text-amber-200">{fmt(profile.coins)}</span>
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CharAvatar id={profile.partner} size={76} active />
              <p className="text-[9px] tracking-[0.25em] text-amber-200/60">PARTNER</p>
              <p className="text-xs font-bold" style={{ color: partner.color }}>
                {partner.name}
              </p>
            </div>
          </div>
        </section>

        {/* Rank ladder */}
        <section style={stagger(1)} aria-label="ランク一覧">
          <p className={`${SUB_LABEL} mb-2`}>RANK LADDER</p>
          <div className="relative overflow-x-auto pb-1">
            <ol className="flex min-w-full items-end justify-between gap-1">
              {RANK_TIERS.map((t, i) => {
                const reached = i <= currentTierIndex;
                const current = i === currentTierIndex;
                return (
                  <li
                    key={t.id}
                    className={`flex min-w-[44px] flex-1 flex-col items-center gap-1 rounded-xl px-0.5 py-2 transition ${
                      current ? 'bg-amber-300/10 ring-1 ring-amber-300/50' : ''
                    }`}
                    aria-current={current ? 'step' : undefined}
                  >
                    <div className={reached ? '' : 'opacity-35 grayscale'}>
                      <RankEmblem tier={t} size={current ? 46 : 36} stars={current ? rank.stars : reached ? 3 : 0} />
                    </div>
                    <span
                      className={`text-center text-[9px] font-bold leading-tight sm:text-[10px] ${reached ? '' : 'text-slate-500'}`}
                      style={reached ? { color: t.color } : undefined}
                    >
                      {t.name}
                    </span>
                    <span className="text-[8px] tabular-nums text-slate-500">{t.min}pt</span>
                  </li>
                );
              })}
            </ol>
            <div className="mx-4 mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-amber-100"
                style={{
                  width: `${Math.min(100, ((currentTierIndex + (rank.tier.id === 'legend' ? 0 : ((rank.stars - 1 + rank.progress) / 3))) / (RANK_TIERS.length - 1)) * 100)}%`,
                  transformOrigin: 'left',
                  animation: 'rfn-bar 900ms ease-out both',
                }}
              />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="戦績">
          <p className={`${SUB_LABEL} mb-2`} style={stagger(2)}>
            STATISTICS
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.en}
                className="rounded-xl border border-amber-300/15 bg-gradient-to-b from-slate-900/80 to-black/60 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(253,230,138,0.12)]"
                style={stagger(i, 180)}
              >
                <p className="text-[8px] tracking-[0.2em] text-amber-200/50">{s.en}</p>
                <p className="text-[11px] font-bold text-slate-300">{s.label}</p>
                <p
                  className={`mt-0.5 truncate font-black tabular-nums ${s.accent ? 'text-xl text-amber-300' : 'text-lg text-amber-50'}`}
                  title={s.value}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}
