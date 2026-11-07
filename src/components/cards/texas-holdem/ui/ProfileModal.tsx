'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { holdemAudio } from '../audio';
import { CHARACTERS } from '../characters';
import {
  fetchLeaderboard,
  restoreProfileFromCloud,
  syncProfileToCloud,
  type LeaderboardEntry,
} from '../onlineClient';
import {
  computePokerMetrics,
  computeRank,
  HAND_CATEGORY_NAMES_JA,
  normalizeProfile,
  POSITIONS,
  PROFILE_TITLES,
  RANK_TIERS,
  type HoldemProfile,
} from '../profile';
import { CharAvatar } from './CharAvatar';
import { RankBadge, RankEmblem } from './RankBadge';
import { FOCUS_RING, GameButton, IconPencil, ModalShell, SUB_LABEL, fmt, stagger } from './OutGameKit';

export interface ProfileModalProps {
  open: boolean;
  profile: HoldemProfile;
  onClose(): void;
  onRename(name: string): void;
  onProfileChange?(next: HoldemProfile): void;
}

const NAME_MAX = 12;
type ProfileTab = 'overview' | 'analytics' | 'account';

/** Hexagonal SVG radar chart for 6 poker playstyle dimensions. */
function PlaystyleRadarSvg({
  axes,
  color,
}: {
  axes: { label: string; short: string; value: number }[];
  color: string;
}) {
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 68;
  const levels = [0.33, 0.66, 1];

  const pointAt = (idx: number, rRatio: number) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / 6;
    return {
      x: cx + Math.cos(angle) * radius * rRatio,
      y: cy + Math.sin(angle) * radius * rRatio,
    };
  };

  const dataPoints = axes
    .map((a, idx) => {
      const p = pointAt(idx, Math.max(0.12, Math.min(1, a.value / 100)));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto shrink-0 select-none">
      {/* Grid rings */}
      {levels.map((lv) => {
        const ringPts = Array.from({ length: 6 }, (_, i) => {
          const p = pointAt(i, lv);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        }).join(' ');
        return (
          <polygon
            key={lv}
            points={ringPts}
            fill="none"
            stroke="rgba(253,230,138,0.18)"
            strokeWidth="1"
          />
        );
      })}
      {/* Spokes */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = pointAt(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(253,230,138,0.16)"
            strokeWidth="1"
          />
        );
      })}
      {/* Player polygon */}
      <polygon
        points={dataPoints}
        fill={`${color}44`}
        stroke={color}
        strokeWidth="2.2"
      />
      {axes.map((a, i) => {
        const p = pointAt(i, Math.max(0.12, Math.min(1, a.value / 100)));
        const lbl = pointAt(i, 1.27);
        return (
          <g key={a.label}>
            <circle cx={p.x} cy={p.y} r="3.2" fill="#fef3c7" stroke={color} strokeWidth="1.5" />
            <text
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9.5"
              fontWeight="800"
              fill="#fde68a"
            >
              {a.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** SVG sparkline for recent cumulative BB trend. */
function ProfitSparklineSvg({ history }: { history: number[] }) {
  const pts = history.length >= 2 ? history : [0, ...history];
  const w = 320;
  const h = 76;
  const padX = 10;
  const padY = 10;
  const minVal = Math.min(0, ...pts);
  const maxVal = Math.max(10, ...pts);
  const span = Math.max(1, maxVal - minVal);

  const toX = (i: number) => padX + (i / Math.max(1, pts.length - 1)) * (w - padX * 2);
  const toY = (v: number) => h - padY - ((v - minVal) / span) * (h - padY * 2);
  const zeroY = toY(0);
  const poly = pts.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1] ?? 0;
  const strokeColor = last >= 0 ? '#34d399' : '#fb7185';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full overflow-visible">
      <line
        x1={padX}
        y1={zeroY}
        x2={w - padX}
        y2={zeroY}
        stroke="rgba(255,255,255,0.18)"
        strokeDasharray="3 3"
        strokeWidth="1"
      />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={poly}
      />
      {pts.map((v, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(v)}
          r={i === pts.length - 1 ? 3.5 : 1.8}
          fill={i === pts.length - 1 ? '#fef08a' : strokeColor}
        />
      ))}
    </svg>
  );
}

/** Player card, rank progression, pro poker analytics, and zero-PII account management. */
export function ProfileModal({ open, profile, onClose, onRename, onProfileChange }: ProfileModalProps) {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [restoreId, setRestoreId] = useState('');
  const [restoreCode, setRestoreCode] = useState('');
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [customPasscode, setCustomPasscode] = useState('');
  const [importJson, setImportJson] = useState('');

  const rank = computeRank(profile.rankPoints);
  const highestRank = computeRank(profile.highestRankPoints);
  const partner = CHARACTERS[profile.partner];
  const st = profile.stats;
  const metrics = useMemo(() => computePokerMetrics(st), [st]);
  const unlockedTitles = useMemo(
    () => PROFILE_TITLES.filter((t) => t.unlocked(profile)),
    [profile],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchLeaderboard(profile).then((list) => {
      if (!cancelled) setLeaderboard(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, profile]);

  const startEdit = () => {
    setDraft(profile.playerName);
    setEditing(true);
  };
  const commitName = () => {
    const name = Array.from(draft.trim()).slice(0, NAME_MAX).join('');
    if (name && name !== profile.playerName) onRename(name);
    setEditing(false);
  };
  const close = () => {
    setEditing(false);
    setRestoreMsg(null);
    onClose();
  };

  const copyText = (text: string, label: string) => {
    holdemAudio.se('click');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setSyncStatus(`${label}をコピーしました`);
    window.setTimeout(() => setSyncStatus(null), 2500);
  };

  const handleCloudSync = async () => {
    if (syncBusy) return;
    holdemAudio.se('click');
    setSyncBusy(true);
    setSyncStatus('クラウドへ同期中…');
    const res = await syncProfileToCloud(profile);
    setSyncBusy(false);
    if (res.ok) {
      const next = { ...profile, lastSyncedAt: res.syncedAt };
      onProfileChange?.(next);
      setSyncStatus('クラウドへアカウント＆戦績データを保存しました');
    } else {
      setSyncStatus('端末ストレージへ保存しました（オフライン同期）');
    }
  };

  const handleRestoreAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (syncBusy) return;
    holdemAudio.se('click');
    setSyncBusy(true);
    setRestoreMsg(null);
    const res = await restoreProfileFromCloud(restoreId, restoreCode);
    setSyncBusy(false);
    if (res.ok && res.profile) {
      holdemAudio.se('rankUp');
      onProfileChange?.(res.profile);
      setRestoreMsg({
        ok: true,
        text: `アカウント「${res.profile.playerName} (${res.profile.accountId})」を復元しました！`,
      });
      setRestoreId('');
      setRestoreCode('');
    } else {
      setRestoreMsg({
        ok: false,
        text: res.error || '復元に失敗しました。IDと引き継ぎコードを確認してください。',
      });
    }
  };

  const handleUpdatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customPasscode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (cleaned.length < 6 || cleaned.length > 16) {
      setSyncStatus('引き継ぎコードは6〜16文字の英数字で指定してください');
      return;
    }
    holdemAudio.se('click');
    const next = { ...profile, transferCode: cleaned };
    onProfileChange?.(next);
    void syncProfileToCloud(next);
    setCustomPasscode('');
    setSyncStatus('新しい引き継ぎコードを設定し、クラウドへ同期しました');
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJson) as Partial<HoldemProfile>;
      const normalized = normalizeProfile(parsed);
      holdemAudio.se('rankUp');
      onProfileChange?.(normalized);
      void syncProfileToCloud(normalized);
      setImportJson('');
      setRestoreMsg({ ok: true, text: `バックアップから「${normalized.playerName}」を復元しました！` });
    } catch {
      setRestoreMsg({ ok: false, text: 'バックアップJSONの形式が正しくありません。' });
    }
  };

  const currentTierIndex = RANK_TIERS.findIndex((t) => t.id === rank.tier.id);

  return (
    <ModalShell
      open={open}
      onClose={close}
      title="アカウント＆ポーカー戦績"
      titleEn="ACCOUNT · RANK · ANALYTICS"
      maxWidth="max-w-3xl"
      tall
    >
      <div className="space-y-4 px-4 py-4 sm:px-6">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-amber-300/25 bg-black/50 p-1">
          {(
            [
              { id: 'overview', label: '🏆 ランク・概要', sub: 'RANK & LADDER' },
              { id: 'analytics', label: '📊 ポーカー統計', sub: 'PRO ANALYTICS' },
              { id: 'account', label: '🔐 アカウント管理', sub: 'CLOUD & ID' },
            ] as const
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  holdemAudio.se('click');
                  setTab(t.id);
                }}
                className={`rounded-xl px-2 py-2 text-center transition ${
                  active
                    ? 'border border-amber-300/60 bg-gradient-to-b from-amber-400/25 to-amber-600/15 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                } ${FOCUS_RING}`}
              >
                <div className="text-xs font-black sm:text-sm">{t.label}</div>
                <div className="hidden text-[9px] tracking-[0.2em] text-amber-200/60 sm:block">{t.sub}</div>
              </button>
            );
          })}
        </div>

        {/* ──────────────────── TAB 1: OVERVIEW & RANK ──────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Player Card */}
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
                  <RankEmblem tier={rank.tier} size={108} stars={rank.stars} />
                  <span className="mt-1 rounded-full border border-amber-300/40 bg-black/60 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                    ID: {profile.accountId}
                  </span>
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                    <span className="rounded-md border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-200">
                      🎖 {profile.equippedTitle}
                    </span>
                    {profile.demotionShield > 0 && (
                      <span
                        className="rounded-md border border-teal-300/40 bg-teal-400/15 px-2 py-0.5 text-[10px] font-bold text-teal-200"
                        title="ティア降格を自動的に防ぐ保護シールド"
                      >
                        🛡 降格保護 ×{profile.demotionShield}
                      </span>
                    )}
                  </div>

                  {editing ? (
                    <form
                      className="mt-1.5 flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        commitName();
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
                        className="min-w-0 flex-1 rounded-lg border border-amber-300/50 bg-black/60 px-3 py-1.5 text-lg font-black text-amber-50 outline-none focus:border-amber-200"
                      />
                      <GameButton type="submit" variant="gold" className="px-3 py-1.5 text-xs" aria-label="名前を保存">
                        保存
                      </GameButton>
                    </form>
                  ) : (
                    <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
                      <h3 className="truncate text-2xl font-black tracking-wide text-amber-50 drop-shadow">
                        {profile.playerName}
                      </h3>
                      <button
                        type="button"
                        onClick={startEdit}
                        aria-label="名前を変更"
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-black/40 text-amber-200 transition hover:bg-amber-300/10 active:scale-95 ${FOCUS_RING}`}
                      >
                        <IconPencil />
                      </button>
                    </div>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <RankBadge points={profile.rankPoints} size="md" showProgress />
                    <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-left text-[11px]">
                      <div className="text-slate-400">
                        ランクPT:{' '}
                        <span className="font-mono font-black text-amber-200">{fmt(profile.rankPoints)} pt</span>
                      </div>
                      <div className="text-slate-400">
                        最高到達:{' '}
                        <span className="font-bold" style={{ color: highestRank.tier.color }}>
                          {highestRank.label} ({fmt(profile.highestRankPoints)} pt)
                        </span>
                      </div>
                      {rank.nextTierName && (
                        <div className="text-teal-300">
                          {rank.nextTierName}昇格まであと{' '}
                          <span className="font-mono font-black">{fmt(rank.pointsToNextTier)} pt</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title selector */}
                  {onProfileChange && (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <label className="text-[10px] font-bold text-amber-200/75" htmlFor="rfn-title-select">
                        称号変更:
                      </label>
                      <select
                        id="rfn-title-select"
                        value={profile.equippedTitle}
                        onChange={(e) => {
                          holdemAudio.se('click');
                          onProfileChange({ ...profile, equippedTitle: e.target.value });
                        }}
                        className="rounded-lg border border-amber-300/35 bg-slate-950/90 px-2.5 py-1 text-xs font-bold text-amber-100 outline-none focus:border-amber-300"
                      >
                        {unlockedTitles.map((t) => (
                          <option key={t.id} value={t.title}>
                            {t.title}（{t.condition}）
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <CharAvatar id={profile.partner} size={74} active />
                  <p className="text-[9px] tracking-[0.25em] text-amber-200/60">PARTNER</p>
                  <p className="text-xs font-bold" style={{ color: partner.color }}>
                    {partner.name}
                  </p>
                  <p className="text-[9px] text-slate-400">{partner.cvCredit}</p>
                </div>
              </div>
            </section>

            {/* Rank Ladder & Promotion System */}
            <section className="rounded-2xl border border-amber-300/20 bg-slate-950/75 p-4" aria-label="ランク一覧">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className={SUB_LABEL}>RANK LADDER · 昇格システム</p>
                <span className="text-[11px] font-bold text-amber-200/80">
                  各ティア ★1 → ★2 → ★3 を突破で上位ティアへ昇格（昇格時 🛡シールド＋ボーナス付与）
                </span>
              </div>
              <div className="relative overflow-x-auto pb-1">
                <ol className="flex min-w-full items-end justify-between gap-1.5">
                  {RANK_TIERS.map((t, i) => {
                    const reached = i <= currentTierIndex;
                    const current = i === currentTierIndex;
                    return (
                      <li
                        key={t.id}
                        className={`flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-xl px-1.5 py-2 transition ${
                          current
                            ? 'bg-amber-300/15 ring-1 ring-amber-300/60 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                            : 'bg-black/30'
                        }`}
                        aria-current={current ? 'step' : undefined}
                      >
                        <div className={reached ? '' : 'opacity-35 grayscale'}>
                          <RankEmblem tier={t} size={current ? 46 : 36} stars={current ? rank.stars : reached ? 3 : 0} />
                        </div>
                        <span
                          className={`text-center text-[10px] font-black leading-tight ${reached ? '' : 'text-slate-500'}`}
                          style={reached ? { color: t.color } : undefined}
                        >
                          {t.name}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400">{t.min}pt〜</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-300">
                現在のティア特典: <span className="font-bold text-amber-200">{rank.tier.perk}</span>
              </p>
            </section>

            {/* Leaderboard */}
            <section className="rounded-2xl border border-amber-300/20 bg-slate-950/75 p-4" aria-label="ランキング">
              <div className="mb-2.5 flex items-center justify-between">
                <p className={SUB_LABEL}>ROYAL LOUNGE LEADERBOARD · ランキング</p>
                <span className="text-[10px] text-slate-400">ランクポイント順</span>
              </div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {leaderboard.map((entry, idx) => {
                  const r = computeRank(entry.rankPoints);
                  return (
                    <div
                      key={entry.accountId}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs ${
                        entry.isSelf
                          ? 'border-amber-300/60 bg-amber-400/15 shadow-[0_0_16px_rgba(251,191,36,0.18)]'
                          : 'border-white/10 bg-black/40'
                      }`}
                    >
                      <span
                        className={`w-6 text-center font-mono text-sm font-black ${
                          idx === 0
                            ? 'text-amber-300'
                            : idx === 1
                              ? 'text-slate-200'
                              : idx === 2
                                ? 'text-amber-600'
                                : 'text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <CharAvatar id={entry.partner} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-black text-white">{entry.playerName}</span>
                          {entry.isSelf && (
                            <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
                              YOU
                            </span>
                          )}
                          <span className="hidden truncate text-[10px] text-amber-200/75 sm:inline">
                            · {entry.equippedTitle}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          勝率 {entry.winRate}% · {fmt(entry.handsPlayed)} ハンド
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black" style={{ color: r.tier.color }}>
                          {r.label}
                        </div>
                        <div className="font-mono text-[11px] font-bold text-amber-200">
                          {fmt(entry.rankPoints)} pt
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ──────────────────── TAB 2: POKER ANALYTICS ──────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            {/* Playstyle Radar + Partner Diagnosis */}
            <section className="grid grid-cols-1 gap-4 rounded-2xl border border-amber-300/25 bg-slate-950/80 p-4 sm:grid-cols-[220px_1fr] sm:items-center">
              <PlaystyleRadarSvg axes={metrics.radar} color={partner.color} />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-amber-200/70">
                    PLAYSTYLE DIAGNOSIS
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-black text-slate-950"
                    style={{ backgroundColor: metrics.styleBadgeColor }}
                  >
                    {metrics.styleName}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">{metrics.styleSummary}</p>
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/45 p-2.5">
                  <CharAvatar id={profile.partner} size={38} />
                  <div className="min-w-0 text-[11px]">
                    <div className="font-bold text-amber-200">{partner.name} のアナリスト評価</div>
                    <div className="text-slate-300">
                      「VPIP {metrics.vpip}% / PFR {metrics.pfr}% / AF {metrics.af} ね。
                      {metrics.bbPer100 >= 0
                        ? `100ハンド平均 +${metrics.bbPer100} BB の黒字ペース、見事な打ち筋よ！」`
                        : 'ポジション優位を活かしてプリフロップの主導権を握れば、さらに収支が伸びるわ！」'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 12 Pro HUD KPIs */}
            <section aria-label="詳細ポーカー指標">
              <p className={`${SUB_LABEL} mb-2`}>PRO HUD METRICS · ユーザー統計指標</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: '総ハンド数', en: 'HANDS PLAYED', value: fmt(st.handsPlayed), sub: `${fmt(st.sessions)} セッション` },
                  { label: 'ハンド勝率', en: 'WIN RATE', value: `${metrics.winRate}%`, sub: `${fmt(st.handsWon)} 勝`, accent: true },
                  { label: '収支レート', en: 'BB / 100 HANDS', value: `${metrics.bbPer100 >= 0 ? '+' : ''}${metrics.bbPer100} BB`, sub: `累計 ${st.totalNetBb >= 0 ? '+' : ''}${Math.round(st.totalNetBb)} BB`, accent: true },
                  { label: '参加率 (VPIP)', en: 'VOLUNTARY PUT $', value: `${metrics.vpip}%`, sub: '理想目安: 20〜30%' },
                  { label: '先制率 (PFR)', en: 'PREFLOP RAISE', value: `${metrics.pfr}%`, sub: '理想目安: 15〜24%' },
                  { label: '3ベット率', en: '3-BET FREQ', value: `${metrics.threeBet}%`, sub: 'リレイズ頻度' },
                  { label: '攻撃指数 (AF)', en: 'AGGRESSION', value: `${metrics.af}`, sub: '(Bet+Raise)/Call' },
                  { label: 'SD到達率 (WTSD)', en: 'WENT TO SD', value: `${metrics.wtsd}%`, sub: 'フロップ後の粘り' },
                  { label: 'SD勝率 (W$SD)', en: 'WON AT SD', value: `${metrics.wsd}%`, sub: `SD勝利 ${fmt(st.showdownsWon)}回`, accent: true },
                  { label: 'オールイン勝率', en: 'ALL-IN WIN %', value: `${metrics.allInWinRate}%`, sub: `${fmt(st.allInWins)} 勝 / ${fmt(Math.max(st.allInCount, st.allInWins))} 回` },
                  { label: '最大獲得ポット', en: 'BIGGEST POT', value: fmt(st.biggestPot), sub: `最高役: ${st.bestHandName || '—'}` },
                  { label: 'オンライン戦績', en: 'ONLINE RECORD', value: `${fmt(st.onlineHandsWon)}勝`, sub: `${fmt(st.onlineHandsPlayed)} オンラインハンド` },
                ].map((item) => (
                  <div
                    key={item.en}
                    className="rounded-xl border border-amber-300/15 bg-gradient-to-b from-slate-900/85 to-black/65 px-3 py-2.5"
                  >
                    <p className="text-[8px] tracking-[0.18em] text-amber-200/55">{item.en}</p>
                    <p className="text-[11px] font-bold text-slate-300">{item.label}</p>
                    <p className={`mt-0.5 font-mono font-black ${item.accent ? 'text-lg text-amber-300' : 'text-base text-white'}`}>
                      {item.value}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Profit Sparkline & Position Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border border-amber-300/20 bg-slate-950/75 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className={SUB_LABEL}>PROFIT TREND (BB)</p>
                  <span className="font-mono text-xs font-bold text-emerald-300">
                    直近 {st.bbHistory.length} ハンド推移
                  </span>
                </div>
                <ProfitSparklineSvg history={st.bbHistory} />
              </section>

              <section className="rounded-2xl border border-amber-300/20 bg-slate-950/75 p-4">
                <p className={`${SUB_LABEL} mb-2`}>POSITION STATS · ポジション別勝率</p>
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  {POSITIONS.map((pos) => {
                    const ps = st.positionStats[pos] ?? { played: 0, won: 0, netBb: 0 };
                    const wr = ps.played > 0 ? Math.round((ps.won / ps.played) * 100) : 0;
                    return (
                      <div key={pos} className="rounded-lg border border-white/10 bg-black/45 px-2 py-1.5">
                        <div className="font-mono text-[11px] font-black text-amber-200">{pos}</div>
                        <div className="font-mono text-xs font-bold text-white">{wr}%</div>
                        <div className="text-[9px] text-slate-400">
                          {ps.played}回 ({ps.netBb >= 0 ? '+' : ''}
                          {Math.round(ps.netBb)}BB)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Winning Hand Distribution & Recent Hands */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border border-amber-300/20 bg-slate-950/75 p-4">
                <p className={`${SUB_LABEL} mb-2`}>WINNING HANDS · 成立役分布</p>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(HAND_CATEGORY_NAMES_JA)
                    .reverse()
                    .map(([catStr, name]) => {
                      const count = st.handCategoryCounts[catStr] ?? 0;
                      const maxCount = Math.max(1, ...Object.values(st.handCategoryCounts));
                      const barW = count > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 0;
                      return (
                        <div key={catStr} className="flex items-center gap-2">
                          <span className="w-28 truncate text-[11px] text-slate-300">{name}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200"
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-mono text-[11px] font-bold text-amber-200">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </section>

              <section className="rounded-2xl border border-amber-300/20 bg-slate-950/75 p-4">
                <p className={`${SUB_LABEL} mb-2`}>RECENT HANDS · 直近のハンド履歴</p>
                {profile.recentHands.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    まだハンド履歴がありません。テーブルで対局すると自動記録されます。
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1 text-xs">
                    {profile.recentHands.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/45 px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-amber-400/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-amber-200">
                              {h.position}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-white">
                              [{h.holeCards.join(' ')}]
                            </span>
                            <span className="truncate text-[11px] text-amber-100">
                              {h.handName || (h.won ? 'フォールド勝ち' : 'フォールド')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            POT {fmt(h.potTotal)} {h.board.length > 0 ? `· Board: ${h.board.join(' ')}` : ''}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 font-mono text-xs font-black ${
                            h.netChips >= 0 ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {h.netChips >= 0 ? '+' : ''}
                          {fmt(h.netChips)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ──────────────────── TAB 3: ACCOUNT & CLOUD SYNC ──────────────────── */}
        {tab === 'account' && (
          <div className="space-y-4">
            {/* Zero-PII Privacy Guarantee */}
            <section className="rounded-2xl border border-emerald-400/35 bg-emerald-950/30 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  🔒
                </span>
                <div>
                  <h4 className="text-sm font-black text-emerald-200">
                    個人情報ゼロ設計（プライバシー保護アカウント管理）
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">
                    本ゲームではメールアドレス・電話番号・氏名・SNS連携などの個人情報は一切収集・保存しません。
                    自動発行される匿名「プレイヤーID」と「引き継ぎコード」のみで、ランク・称号・詳細なポーカー統計をクラウドおよび端末へ安全に永続化できます。
                  </p>
                </div>
              </div>
            </section>

            {/* Current Account ID & Transfer Code */}
            <section className="rounded-2xl border border-amber-300/25 bg-slate-950/80 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={SUB_LABEL}>YOUR ACCOUNT CREDENTIALS · 引き継ぎ情報</p>
                {profile.lastSyncedAt && (
                  <span className="text-[10px] text-emerald-300">
                    ☁️ 最終同期: {new Date(profile.lastSyncedAt).toLocaleTimeString('ja-JP')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <div className="text-[10px] font-bold text-slate-400">プレイヤーID（公開・フレンド共有可）</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-black tracking-wider text-amber-200">
                      {profile.accountId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(profile.accountId, 'プレイヤーID')}
                      className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-100 hover:bg-amber-400/25"
                    >
                      コピー
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <div className="text-[10px] font-bold text-slate-400">引き継ぎコード（他人に教えないでください）</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-black tracking-wider text-rose-200">
                      {showPasscode ? profile.transferCode : '••••-••••'}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowPasscode((v) => !v)}
                        className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-white/10"
                      >
                        {showPasscode ? '隠す' : '表示'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(profile.transferCode, '引き継ぎコード')}
                        className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-100 hover:bg-amber-400/25"
                      >
                        コピー
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCloudSync}
                  disabled={syncBusy}
                  className="rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  ☁️ 今すぐクラウドへ同期・保存
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      `プレイヤーID: ${profile.accountId}\n引き継ぎコード: ${profile.transferCode}`,
                      'IDと引き継ぎコードのセット',
                    )
                  }
                  className="rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-amber-300/40"
                >
                  📋 ID＋コードをまとめてコピー
                </button>
                {syncStatus && <span className="text-xs font-bold text-amber-200">{syncStatus}</span>}
              </div>

              {/* Optional custom passcode */}
              <form onSubmit={handleUpdatePasscode} className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                <input
                  value={customPasscode}
                  onChange={(e) => setCustomPasscode(e.target.value)}
                  placeholder="任意の引き継ぎコードに変更（6〜16文字）"
                  maxLength={16}
                  className="min-w-[220px] flex-1 rounded-lg border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-xs text-white outline-none focus:border-amber-300"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-400/25"
                >
                  コード変更
                </button>
              </form>
            </section>

            {/* Cross-device Account Restore */}
            <section className="rounded-2xl border border-amber-300/25 bg-slate-950/80 p-4 space-y-3">
              <p className={SUB_LABEL}>ACCOUNT RESTORE · 別端末からのアカウント引き継ぎ</p>
              <form onSubmit={handleRestoreAccount} className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={restoreId}
                  onChange={(e) => setRestoreId(e.target.value.toUpperCase())}
                  placeholder="プレイヤーID (例: RFN-1234-ABCD)"
                  maxLength={15}
                  className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-amber-300"
                />
                <input
                  value={restoreCode}
                  onChange={(e) => setRestoreCode(e.target.value.toUpperCase())}
                  placeholder="引き継ぎコード (例: K7M9-P2Q4)"
                  maxLength={16}
                  className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-amber-300"
                />
                <button
                  type="submit"
                  disabled={syncBusy}
                  className="rounded-xl border border-teal-300/50 bg-gradient-to-b from-teal-400 to-teal-600 px-4 py-2 text-xs font-black text-slate-950 shadow transition hover:brightness-110 active:scale-95"
                >
                  📲 アカウント復元
                </button>
              </form>
              {restoreMsg && (
                <p className={`text-xs font-bold ${restoreMsg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {restoreMsg.text}
                </p>
              )}
            </section>

            {/* Offline JSON Backup */}
            <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={SUB_LABEL}>OFFLINE BACKUP · JSONバックアップ</p>
                <button
                  type="button"
                  onClick={() => copyText(JSON.stringify(profile), 'バックアップデータ(JSON)')}
                  className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                >
                  💾 バックアップJSONをコピー
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder="コピーしたバックアップJSONを貼り付けて復元…"
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-300"
                />
                <button
                  type="button"
                  onClick={handleImportJson}
                  className="rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-400/25"
                >
                  JSON読み込み
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
