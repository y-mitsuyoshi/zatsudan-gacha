'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { holdemAudio } from './audio';
import { CHARACTERS, pickLine, type CharId } from './characters';
import {
  handRankPoints,
  sessionRankPoints,
  type HandReport,
  type SessionSummary,
  type TableConfig,
} from './config';
import { syncProfileToCloud } from './onlineClient';
import {
  computeRank,
  defaultProfile,
  loadProfile,
  PROFILE_TITLES,
  saveProfile,
  type HoldemProfile,
  type HoldemSettings,
  type PositionId,
  type RecentHandRecord,
} from './profile';
import { TitleScreen } from './ui/TitleScreen';
import { LobbyScreen } from './ui/LobbyScreen';
import { TableScreen } from './ui/TableScreen';
import { SettingsModal } from './ui/SettingsModal';
import { RankBadge } from './ui/RankBadge';

type Screen = 'title' | 'lobby' | 'table';

interface RankUpInfo {
  from: string;
  to: string;
  points: number;
  delta: number;
  promoted: boolean;
  tierPromoted: boolean;
  shieldUsed: boolean;
  unlockedTitle?: string;
}

/**
 * ROYAL FLUSH NIGHT（ロイヤル・ナイト・ポーカー）
 * App shell: screen routing, zero-PII cloud-synced profile, rank progression, poker analytics and audio routing.
 */
export default function TexasHoldemGame() {
  const [screen, setScreen] = useState<Screen>('title');
  const [profile, setProfile] = useState<HoldemProfile>(defaultProfile);
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tableConfig, setTableConfig] = useState<TableConfig | null>(null);
  const [tableKey, setTableKey] = useState(0);
  const [rankUp, setRankUp] = useState<RankUpInfo | null>(null);
  const [pendingOnlineTab, setPendingOnlineTab] = useState<'quick' | 'friend' | null>(null);
  const profileRef = useRef(profile);

  // Load persisted profile after mount & check for ?room=XXXXXX invite URL
  useEffect(() => {
    const p = loadProfile();
    profileRef.current = p;
    setProfile(p);
    setLoaded(true);
    void syncProfileToCloud(p);

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room')?.trim();
        if (roomParam && /^[A-Za-z0-9]{6}$/.test(roomParam)) {
          setScreen('lobby');
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const commitProfile = useCallback((next: HoldemProfile, syncCloud = false) => {
    profileRef.current = next;
    setProfile(next);
    saveProfile(next);
    if (syncCloud) {
      void syncProfileToCloud(next);
    }
  }, []);

  // Apply volumes whenever settings change.
  const s = profile.settings;
  useEffect(() => {
    holdemAudio.setVolumes({
      master: s.masterVolume,
      bgm: s.bgmVolume,
      se: s.seVolume,
      voice: s.voiceVolume,
    });
  }, [s.masterVolume, s.bgmVolume, s.seVolume, s.voiceVolume]);

  // BGM routing for menu screens (the table manages its own tracks).
  useEffect(() => {
    if (screen === 'title') holdemAudio.playBgm('title');
    else if (screen === 'lobby') holdemAudio.playBgm('lobby');
  }, [screen]);

  useEffect(() => () => holdemAudio.dispose(), []);

  const handleSettingsChange = useCallback(
    (settings: HoldemSettings) => {
      commitProfile({ ...profileRef.current, settings });
    },
    [commitProfile],
  );

  const handleStart = useCallback((initialOnlineTab?: 'quick' | 'friend') => {
    holdemAudio.unlock();
    if (initialOnlineTab) {
      setPendingOnlineTab(initialOnlineTab);
    }
    setScreen('lobby');
    const p = profileRef.current;
    const ch = CHARACTERS[p.partner];
    holdemAudio.speak(pickLine(p.partner, 'greet'), {
      pitch: ch.voicePitch,
      rate: ch.voiceRate,
      gender: ch.voiceGender,
      enabled: p.settings.voiceOn,
      charId: p.partner,
      event: 'greet',
    });
  }, []);

  const handlePlay = useCallback((cfg: TableConfig) => {
    holdemAudio.se('open');
    setTableConfig(cfg);
    setTableKey((k) => k + 1);
    setScreen('table');
  }, []);

  const handleHandComplete = useCallback(
    (r: HandReport) => {
      const p = profileRef.current;
      const beforeRank = computeRank(p.rankPoints);
      const st = {
        ...p.stats,
        handCategoryCounts: { ...p.stats.handCategoryCounts },
        positionStats: { ...p.stats.positionStats },
      };

      st.handsPlayed += 1;
      if (r.heroWon) st.handsWon += 1;
      if (r.wentToShowdown) st.wentToShowdownHands += 1;
      if (r.heroWon && r.wentToShowdown) st.showdownsWon += 1;
      if (r.sawFlop) st.flopSeenHands += 1;
      if (r.vpip) st.vpipHands += 1;
      if (r.pfr) st.pfrHands += 1;
      if (r.threeBetOpportunity) st.threeBetOpportunities += 1;
      if (r.threeBet) st.threeBetHands += 1;
      st.totalBetsAndRaises += r.betsAndRaises ?? 0;
      st.totalCalls += r.calls ?? 0;

      if (r.heroAllIn) st.allInCount += 1;
      if (r.heroWon && r.heroAllIn) st.allInWins += 1;
      if (r.isOnline) {
        st.onlineHandsPlayed += 1;
        if (r.heroWon) st.onlineHandsWon += 1;
      }

      if (r.heroWon && r.potTotal > st.biggestPot) st.biggestPot = r.potTotal;
      if (r.heroHandCategory > st.bestHandCategory) {
        st.bestHandCategory = r.heroHandCategory;
        st.bestHandName = r.heroHandName;
      }
      if (r.heroWon && r.heroHandCategory >= 0) {
        const key = String(r.heroHandCategory);
        st.handCategoryCounts[key] = (st.handCategoryCounts[key] ?? 0) + 1;
      }

      const bbDelta = Math.round((r.heroNet / Math.max(1, r.bigBlind)) * 10) / 10;
      st.totalNetBb = Math.round((st.totalNetBb + bbDelta) * 10) / 10;
      st.bbHistory = [...st.bbHistory.slice(-29), st.totalNetBb];

      const pos: PositionId = r.position ?? 'BTN';
      const prevPos = st.positionStats[pos] ?? { played: 0, won: 0, netBb: 0 };
      st.positionStats[pos] = {
        played: prevPos.played + 1,
        won: prevPos.won + (r.heroWon ? 1 : 0),
        netBb: Math.round((prevPos.netBb + bbDelta) * 10) / 10,
      };

      const newHandRec: RecentHandRecord = {
        id: `${Date.now()}-${r.handNumber}`,
        handNumber: r.handNumber,
        mode: tableConfig?.mode ?? 'lounge',
        position: pos,
        holeCards: r.holeCards ?? [],
        board: r.board ?? [],
        handName: r.heroHandName,
        potTotal: r.potTotal,
        netChips: r.heroNet,
        bigBlind: r.bigBlind,
        won: r.heroWon,
        wentToShowdown: r.wentToShowdown,
        isOnline: r.isOnline,
        timestamp: Date.now(),
      };
      const recentHands = [newHandRec, ...p.recentHands].slice(0, 20);

      const winStreak = r.heroWon ? p.winStreak + 1 : 0;
      const maxWinStreak = Math.max(p.maxWinStreak, winStreak);
      const streakBonus = r.heroWon && winStreak >= 3 ? Math.min(6, winStreak) : 0;

      const affection = { ...p.affection };
      affection[p.partner] = (affection[p.partner] ?? 0) + (r.heroWon ? 4 : 2);
      for (const id of r.opponentsInHand) {
        affection[id as CharId] = (affection[id as CharId] ?? 0) + 1;
      }

      const coins = p.coins + (r.heroWon ? 5 + Math.floor(r.potTotal / Math.max(1, r.bigBlind)) : 1);
      const nextPoints = Math.max(0, p.rankPoints + handRankPoints(r) + streakBonus);
      const afterRank = computeRank(nextPoints);
      const tierPromoted = afterRank.tierIndex > beforeRank.tierIndex;
      const finalPoints = tierPromoted ? nextPoints + 25 : nextPoints;
      const highestRankPoints = Math.max(p.highestRankPoints, finalPoints);
      const demotionShield = tierPromoted ? p.demotionShield + 1 : p.demotionShield;

      commitProfile(
        {
          ...p,
          stats: st,
          recentHands,
          affection,
          coins,
          winStreak,
          maxWinStreak,
          rankPoints: finalPoints,
          highestRankPoints,
          demotionShield,
        },
        st.handsPlayed % 3 === 0 || tierPromoted,
      );
    },
    [commitProfile, tableConfig?.mode],
  );

  const applySessionResult = useCallback(
    (summary: SessionSummary) => {
      const p = profileRef.current;
      const before = computeRank(p.rankPoints);
      const rawDelta = summary.handsPlayed > 0 ? sessionRankPoints(summary) : 0;
      let points = Math.max(0, p.rankPoints + rawDelta);
      let shieldUsed = false;
      let nextShield = p.demotionShield;

      // Demotion shield protects against dropping below current tier floor
      if (rawDelta < 0 && points < before.tier.min && p.demotionShield > 0) {
        points = before.tier.min;
        nextShield = Math.max(0, p.demotionShield - 1);
        shieldUsed = true;
      }

      const after = computeRank(points);
      const tierPromoted = after.tierIndex > before.tierIndex;
      if (tierPromoted) {
        points += 30;
        nextShield += 1;
      }

      const finalAfter = computeRank(points);
      const highestRankPoints = Math.max(p.highestRankPoints, points);

      const st = {
        ...p.stats,
        sessions: p.stats.sessions + (summary.handsPlayed > 0 ? 1 : 0),
        onlineMatchesPlayed: p.stats.onlineMatchesPlayed + (summary.isOnline && summary.handsPlayed > 0 ? 1 : 0),
        onlineMatchesWon:
          p.stats.onlineMatchesWon +
          (summary.isOnline && (summary.placement === 1 || summary.netChips > 0) ? 1 : 0),
      };
      if (summary.completed && summary.placement === 1 && summary.mode !== 'lounge') {
        st.tournamentsWon += 1;
      }

      const bonusCoins =
        summary.completed && summary.placement === 1
          ? 300
          : summary.completed && summary.placement > 1
            ? 50
            : 0;

      const nextProfile: HoldemProfile = {
        ...p,
        rankPoints: points,
        highestRankPoints,
        demotionShield: nextShield,
        coins: p.coins + bonusCoins,
        stats: st,
      };

      // Check if a new tier title was unlocked
      let unlockedTitle: string | undefined;
      if (tierPromoted) {
        const newly = PROFILE_TITLES.find(
          (t) => t.id === finalAfter.tier.id && t.unlocked(nextProfile),
        );
        if (newly) {
          unlockedTitle = newly.title;
          nextProfile.equippedTitle = newly.title;
        }
      }

      commitProfile(nextProfile, true);
      return {
        before,
        after: finalAfter,
        points,
        delta: points - p.rankPoints,
        tierPromoted,
        shieldUsed,
        unlockedTitle,
      };
    },
    [commitProfile],
  );

  const handleExit = useCallback(
    (summary: SessionSummary) => {
      const { before, after, points, delta, tierPromoted, shieldUsed, unlockedTitle } =
        applySessionResult(summary);
      setScreen('lobby');
      setTableConfig(null);
      if (summary.handsPlayed > 0 && (delta !== 0 || shieldUsed)) {
        const promoted =
          tierPromoted || (after.tier.id === before.tier.id && after.stars > before.stars);
        setRankUp({
          from: before.label,
          to: after.label,
          points,
          delta,
          promoted,
          tierPromoted,
          shieldUsed,
          unlockedTitle,
        });
        holdemAudio.se(promoted ? 'rankUp' : delta >= 0 ? 'levelUp' : 'close');
      }
    },
    [applySessionResult],
  );

  const handleRetry = useCallback(
    (summary: SessionSummary) => {
      applySessionResult(summary);
      holdemAudio.se('open');
      setTableKey((k) => k + 1);
    },
    [applySessionResult],
  );

  const rankInfo = useMemo(() => (rankUp ? computeRank(rankUp.points) : null), [rankUp]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#070b14] text-slate-100 select-none">
      {screen === 'title' && (
        <TitleScreen
          profile={profile}
          onStart={handleStart}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {screen === 'lobby' && (
        <LobbyScreen
          profile={profile}
          onProfileChange={(next) => commitProfile(next, true)}
          onPlay={handlePlay}
          onBack={() => setScreen('title')}
          onOpenSettings={() => setSettingsOpen(true)}
          initialOnlineTab={pendingOnlineTab}
          onConsumeInitialOnlineTab={() => setPendingOnlineTab(null)}
        />
      )}

      {screen === 'table' && tableConfig && (
        <TableScreen
          key={tableKey}
          config={tableConfig}
          profile={profile}
          onProfileChange={(next) => commitProfile(next, true)}
          onHandComplete={handleHandComplete}
          onExit={handleExit}
          onRetry={handleRetry}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        settings={profile.settings}
        onChange={handleSettingsChange}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Session result: rank points change / promotion */}
      {rankUp && rankInfo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ランク変動"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setRankUp(null)}
        >
          <style>{`
            @keyframes rfnRankPop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.06); opacity: 1 } 100% { transform: scale(1) } }
            @keyframes rfnRays { to { transform: rotate(360deg) } }
          `}</style>
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-300/40 bg-slate-950/95 p-6 text-center shadow-[0_0_60px_rgba(251,191,36,0.28)]"
            style={{ animation: 'rfnRankPop .5s ease-out both' }}
            onClick={(e) => e.stopPropagation()}
          >
            {rankUp.promoted && (
              <div
                className="pointer-events-none absolute -inset-1/2 opacity-30"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0 10%, #fbbf24 12%, transparent 14% 30%, #fde68a 32%, transparent 34% 55%, #fbbf24 57%, transparent 59% 80%, #fde68a 82%, transparent 84%)',
                  animation: 'rfnRays 9s linear infinite',
                }}
              />
            )}
            <p className="relative text-[10px] font-bold tracking-[0.35em] text-amber-200/70 uppercase">
              {rankUp.tierPromoted ? 'TIER PROMOTION!!' : rankUp.promoted ? 'RANK UP!!' : 'SESSION RESULT'}
            </p>
            <h3 className="relative mt-1 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-2xl font-black text-transparent">
              {rankUp.tierPromoted
                ? `${rankInfo.tier.name}ティア昇格！！`
                : rankUp.promoted
                  ? 'ランク昇格おめでとう！'
                  : 'ランクポイント変動'}
            </h3>
            <div className="relative mt-5 flex justify-center">
              <RankBadge points={rankUp.points} size="lg" showProgress />
            </div>
            <p className="relative mt-4 text-sm text-slate-300">
              {rankUp.from} → <span className="font-black text-amber-200">{rankUp.to}</span>
            </p>
            <p
              className={`relative mt-1 font-mono text-lg font-black ${
                rankUp.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {rankUp.delta >= 0 ? '+' : ''}
              {rankUp.delta} pt
            </p>
            {rankUp.shieldUsed && (
              <p className="relative mt-2 rounded-xl border border-teal-300/40 bg-teal-950/60 px-3 py-1.5 text-xs font-bold text-teal-200">
                🛡 降格保護シールドが発動し、ティア降格を防ぎました！
              </p>
            )}
            {rankUp.unlockedTitle && (
              <p className="relative mt-2 rounded-xl border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-200">
                🎖 新称号「{rankUp.unlockedTitle}」を獲得しました！
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                holdemAudio.se('click');
                setRankUp(null);
              }}
              className="relative mt-6 w-full rounded-xl bg-gradient-to-b from-amber-300 to-amber-600 py-3 text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(0,0,0,0.45)] transition active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {!loaded && <div className="sr-only">読み込み中…</div>}
    </div>
  );
}
