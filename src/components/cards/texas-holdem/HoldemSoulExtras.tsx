'use client';

import React from 'react';

export type SoulAvatarId = 'karen' | 'rei' | 'koharu' | 'valentina' | 'jin' | 'luna';

export type SoulExpression =
  | 'normal'
  | 'thinking'
  | 'confident'
  | 'bluffing'
  | 'shocked'
  | 'winner'
  | 'folded';

export interface SoulCharacterDef {
  id: SoulAvatarId;
  name: string;
  title: string;
  cvStyle: string;
  hairColor: string;
  eyeColor: string;
  outfitColor: string;
  accentHex: string;
  voicePitch: number;
  voiceRate: number;
  favoriteHand: string;
  bio: string;
  cutInAllIn: string;
  cutInWin: string;
  sampleVoices: { label: string; text: string }[];
}

export const SOUL_CHARACTERS: Record<SoulAvatarId, SoulCharacterDef> = {
  karen: {
    id: 'karen',
    name: '一ノ瀬 カレン',
    title: '紅蓮の令嬢ギャンブラー',
    cvStyle: '強気ツンデレ令嬢ボイス',
    hairColor: '#f43f5e',
    eyeColor: '#e11d48',
    outfitColor: '#881337',
    accentHex: '#fb7185',
    voicePitch: 1.26,
    voiceRate: 1.08,
    favoriteHand: 'A♠ K♠ (Big Slick)',
    bio: '名門一ノ瀬家の跡取り娘。プライドが高く強気なアグレッシブスタイルでテーブルを支配する。',
    cutInAllIn: 'オールインよ！私のすべてを賭けてねじ伏せてあげるわ！',
    cutInWin: 'ふふん、当然の結果ね！チップは全部いただくわよ♪',
    sampleVoices: [
      { label: '対局開始', text: 'あんたが今日の対戦相手？せいぜい私を楽しませなさいよね！' },
      { label: 'レイズ', text: 'その程度のベットで降りると思った？倍返しよ、レイズ！' },
      { label: 'オールイン', text: 'オールインよ！私のすべてを賭けてねじ伏せてあげるわ！' },
      { label: '勝利', text: 'ふふん、当然の結果ね！チップは全部いただくわよ！' },
    ],
  },
  rei: {
    id: 'rei',
    name: '九条 レイ',
    title: '氷の天才数理クオンツ',
    cvStyle: 'クール知性派イケメンボイス',
    hairColor: '#cbd5e1',
    eyeColor: '#38bdf8',
    outfitColor: '#0f172a',
    accentHex: '#60a5fa',
    voicePitch: 0.84,
    voiceRate: 1.03,
    favoriteHand: 'Q♠ Q♥ (Pocket Queens)',
    bio: 'GTO（ゲーム理論最適戦略）と確率計算を極めた数理アナリスト。感情を排した精密ベットが武器。',
    cutInAllIn: '期待値は収束する…全額投入、オールインだ。チェックメイトさ。',
    cutInWin: '計算通りのポット獲得だ。数学的優位は揺るがないよ。',
    sampleVoices: [
      { label: '対局開始', text: '確率の収束を証明しよう。いいゲームにしようか。' },
      { label: 'レイズ', text: 'エクイティは十分だ。ここでレイズさせてもらう。' },
      { label: 'オールイン', text: '期待値は収束する…全額投入、オールインだ。' },
      { label: '勝利', text: '計算通りのポット獲得だ。悪くないハンドだったね。' },
    ],
  },
  koharu: {
    id: 'koharu',
    name: '天宮 コハル',
    title: '幸運を呼ぶ白猫ディーラー娘',
    cvStyle: '元気系ネコミミ看板娘ボイス',
    hairColor: '#fde68a',
    eyeColor: '#10b981',
    outfitColor: '#065f46',
    accentHex: '#34d399',
    voicePitch: 1.38,
    voiceRate: 1.12,
    favoriteHand: '7♥ 7♦ (Lucky Sevens)',
    bio: 'VIPカジノで人気No.1の白猫ディーラー少女。直感と豪運で奇跡のリバーを引き寄せる。',
    cutInAllIn: 'にゃはっ！ぜんぶ行くにゃーっ！！幸運のオールイン！！',
    cutInWin: 'やったにゃーっ！特大ポット、まるごといただきにゃ♪',
    sampleVoices: [
      { label: '対局開始', text: 'にゃっほー！今日も楽しくポーカー勝負するにゃ！' },
      { label: 'レイズ', text: 'くんくん…いいカードの匂いがするにゃ！レイズ！' },
      { label: 'オールイン', text: 'にゃはっ！ぜんぶ行くにゃーっ！！幸運のオールイン！！' },
      { label: '勝利', text: 'やったにゃーっ！特大ポット、まるごといただきにゃ！' },
    ],
  },
  valentina: {
    id: 'valentina',
    name: 'ヴァレンティナ・ロゼ',
    title: 'モンテカルロの黄金女帝',
    cvStyle: '妖艶お姉様・女帝ボイス',
    hairColor: '#fbbf24',
    eyeColor: '#a855f7',
    outfitColor: '#4c1d95',
    accentHex: '#c084fc',
    voicePitch: 1.12,
    voiceRate: 0.98,
    favoriteHand: 'A♥ A♦ (Pocket Aces)',
    bio: '欧州社交界の頂点に君臨する女帝。華麗なブラフと圧倒的なプレッシャーで相手を翻弄する。',
    cutInAllIn: 'オールインよ。さあ…女王の輝きにひれ伏しなさい！',
    cutInWin: 'あら、ごめんなさいね♪ あなたのチップ、とても美味しいわ。',
    sampleVoices: [
      { label: '対局開始', text: 'ふふっ、今夜はどんなスリルを味わわせてくれるのかしら？' },
      { label: 'レイズ', text: '可愛いベットね。もっと熱くしてあげるわ、レイズよ。' },
      { label: 'オールイン', text: 'オールインよ。さあ…女王の輝きにひれ伏しなさい！' },
      { label: '勝利', text: 'あら、ごめんなさいね。すべて私のものよ。' },
    ],
  },
  jin: {
    id: 'jin',
    name: '黒崎 ジン',
    title: '裏カジノ伝説の勝負師',
    cvStyle: '重厚ハードボイルドボイス',
    hairColor: '#1e293b',
    eyeColor: '#f59e0b',
    outfitColor: '#18181b',
    accentHex: '#fbbf24',
    voicePitch: 0.72,
    voiceRate: 0.95,
    favoriteHand: 'K♠ K♣ (Cowboys)',
    bio: '世界中のハイステークスを渡り歩いてきた伝説のギャンブラー。土壇場のオールイン勝負で無類の強さを誇る。',
    cutInAllIn: '魂を燃やせ…俺の全チップを叩き込む、オールインだ！！',
    cutInWin: '悪く思うな。勝負の世界じゃ、最後に立っていた奴が勝者だ。',
    sampleVoices: [
      { label: '対局開始', text: 'いい目をしてるな。ヒリつく勝負になりそうだぜ。' },
      { label: 'レイズ', text: 'ぬるいベットじゃ火がつかねえ。レイズだ。' },
      { label: 'オールイン', text: '魂を燃やせ…俺の全チップを叩き込む、オールインだ！' },
      { label: '勝利', text: '悪く思うな。これがポーカーの厳しさってやつさ。' },
    ],
  },
  luna: {
    id: 'luna',
    name: '星野 ルナ',
    title: '星詠みのクール占星少女',
    cvStyle: '神秘系ウィスパーボイス',
    hairColor: '#818cf8',
    eyeColor: '#fde047',
    outfitColor: '#1e1b4b',
    accentHex: '#a5b4fc',
    voicePitch: 1.22,
    voiceRate: 1.0,
    favoriteHand: 'J♠ 10♠ (Suited Connectors)',
    bio: '星々の巡りからボードの未来を読み解く占星術師。ドローハンドから劇的な逆転役を完成させる。',
    cutInAllIn: '星々が告げています…運命のオールイン、受け止められますか？',
    cutInWin: '星導の通りですね…このポットは星屑とともに頂きます☆',
    sampleVoices: [
      { label: '対局開始', text: '今夜の星回りは波乱の予感…よろしくお願いしますね。' },
      { label: 'レイズ', text: '未来のカードが見えました。ここはレイズです。' },
      { label: 'オールイン', text: '星々が告げています…運命のオールイン、受け止められますか？' },
      { label: '勝利', text: '星導の通りですね…このポットは頂きます。' },
    ],
  },
};

export interface SoulStampItem {
  id: string;
  emoji: string;
  label: string;
  voiceText: string;
  bgClass: string;
}

export const SOUL_STAMPS: SoulStampItem[] = [
  {
    id: 'hello',
    emoji: '✨',
    label: 'よろしく！',
    voiceText: 'よろしくね！いい勝負にしましょう！',
    bgClass: 'border-cyan-400 bg-cyan-500/20 text-cyan-100',
  },
  {
    id: 'think',
    emoji: '🤔',
    label: '長考中…',
    voiceText: 'うーん、ここは迷うわね…',
    bgClass: 'border-amber-400 bg-amber-500/20 text-amber-100',
  },
  {
    id: 'allin',
    emoji: '🔥',
    label: '全ツッパ！',
    voiceText: 'ぜんぶ突っ込むわよ！覚悟しなさい！',
    bgClass: 'border-rose-400 bg-rose-500/25 text-rose-100',
  },
  {
    id: 'bluff',
    emoji: '😼',
    label: 'ブラフでしょ？',
    voiceText: 'ふふっ、それハッタリじゃないの？',
    bgClass: 'border-purple-400 bg-purple-500/20 text-purple-100',
  },
  {
    id: 'nice',
    emoji: '👏',
    label: 'ナイスハンド！',
    voiceText: 'お見事！ナイスハンドね！',
    bgClass: 'border-emerald-400 bg-emerald-500/20 text-emerald-100',
  },
  {
    id: 'gununu',
    emoji: '😣',
    label: 'ぐぬぬ…',
    voiceText: 'ぐぬぬ…次は絶対負けないんだから！',
    bgClass: 'border-orange-400 bg-orange-500/20 text-orange-100',
  },
  {
    id: 'shock',
    emoji: '⚡',
    label: 'まさか！？',
    voiceText: 'ええっ！？そのカードが来るなんて！？',
    bgClass: 'border-yellow-400 bg-yellow-500/20 text-yellow-100',
  },
  {
    id: 'thanks',
    emoji: '💖',
    label: 'ありがと♪',
    voiceText: 'チップごちそうさま！ありがとう♪',
    bgClass: 'border-pink-400 bg-pink-500/20 text-pink-100',
  },
];

export interface DanRankInfo {
  title: string;
  tierBadge: string;
  level: number;
  currentXp: number;
  nextXp: number;
}

export function computeDanRank(totalXp: number): DanRankInfo {
  const ranks = [
    { title: '魂天（ポーカー天）', min: 1200, badge: '👑 魂天' },
    { title: '聖人 ★3', min: 900, badge: '💎 聖人' },
    { title: '豪傑 ★3', min: 650, badge: '🔥 豪傑' },
    { title: '豪傑 ★1', min: 450, badge: '🔥 豪傑' },
    { title: '雀士 ★3', min: 280, badge: '⚔️ 雀士' },
    { title: '雀士 ★1', min: 150, badge: '⚔️ 雀士' },
    { title: '初心 ★2', min: 60, badge: '🔰 初心' },
    { title: '初心 ★1', min: 0, badge: '🔰 初心' },
  ];
  for (let i = 0; i < ranks.length; i += 1) {
    if (totalXp >= ranks[i].min) {
      const nextMin = i > 0 ? ranks[i - 1].min : ranks[i].min + 500;
      return {
        title: ranks[i].title,
        tierBadge: ranks[i].badge,
        level: ranks.length - i,
        currentXp: totalXp - ranks[i].min,
        nextXp: Math.max(100, nextMin - ranks[i].min),
      };
    }
  }
  return {
    title: '初心 ★1',
    tierBadge: '🔰 初心',
    level: 1,
    currentXp: totalXp,
    nextXp: 60,
  };
}

export function AnimeSoulPortraitSvg({
  avatarId,
  expression = 'normal',
  className = 'w-14 h-14',
}: {
  avatarId: SoulAvatarId;
  expression?: SoulExpression;
  className?: string;
}) {
  const ch = SOUL_CHARACTERS[avatarId] ?? SOUL_CHARACTERS.karen;
  const isWinner = expression === 'winner';
  const isConfident = expression === 'confident' || expression === 'bluffing';
  const isShocked = expression === 'shocked';
  const isFolded = expression === 'folded';

  return (
    <svg
      viewBox="0 0 96 96"
      className={`${className} rounded-full border-2 transition-transform ${
        isWinner
          ? 'scale-105 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.85)]'
          : isFolded
            ? 'border-slate-600 grayscale opacity-60'
            : 'border-amber-300/80 shadow-lg'
      }`}
      aria-label={ch.name}
    >
      <defs>
        <radialGradient id={`soulBg-${avatarId}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={ch.outfitColor} />
          <stop offset="100%" stopColor="#090d16" />
        </radialGradient>
      </defs>

      {/* Halo Background */}
      <circle cx="48" cy="48" r="46" fill={`url(#soulBg-${avatarId})`} />
      <circle
        cx="48"
        cy="48"
        r="43"
        fill="none"
        stroke={ch.accentHex}
        strokeWidth="1"
        strokeDasharray="4 2"
        opacity="0.55"
      />

      {/* Back Hair Silhouette */}
      <path
        d="M18 42 C14 62 18 78 24 90 L72 90 C78 78 82 62 78 42 C76 20 64 13 48 13 C32 13 20 20 18 42 Z"
        fill={ch.hairColor}
      />

      {/* Twin-tails for Karen / Cat ears for Koharu / Tiara for Valentina / Star hat for Luna */}
      {avatarId === 'karen' && (
        <>
          <path d="M18 32 C6 40 6 66 14 82 C18 70 20 52 22 38 Z" fill={ch.hairColor} />
          <path d="M78 32 C90 40 90 66 82 82 C78 70 76 52 74 38 Z" fill={ch.hairColor} />
          <polygon points="20,28 28,24 25,34" fill="#be123c" />
          <polygon points="76,28 68,24 71,34" fill="#be123c" />
        </>
      )}
      {avatarId === 'koharu' && (
        <>
          <polygon points="24,24 30,8 38,20" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
          <polygon points="27,22 30,12 35,20" fill="#fda4af" />
          <polygon points="72,24 66,8 58,20" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
          <polygon points="69,22 66,12 61,20" fill="#fda4af" />
        </>
      )}
      {avatarId === 'valentina' && (
        <polygon
          points="35,17 41,8 48,15 55,8 61,17"
          fill="#facc15"
          stroke="#fef08a"
          strokeWidth="1.2"
        />
      )}
      {avatarId === 'luna' && (
        <circle cx="64" cy="21" r="4.5" fill="#fde047" stroke="#fff" strokeWidth="1" />
      )}

      {/* Outfit & Ribbon / Collar */}
      <path
        d="M18 92 C22 70 34 65 48 65 C62 65 74 70 78 92 Z"
        fill={ch.outfitColor}
        stroke={ch.accentHex}
        strokeWidth="1.5"
      />
      <polygon points="40,65 48,77 56,65" fill="#fff1f2" />
      <polygon points="44,68 48,82 52,68" fill={ch.accentHex} />

      {/* Anime Face */}
      <path
        d="M31 36 C31 24 65 24 65 36 C65 51 56 60 48 61 C40 60 31 51 31 36 Z"
        fill="#ffe4d6"
      />

      {/* Blush Cheeks */}
      <ellipse cx="36" cy="48" rx="4" ry="2" fill="#fb7185" opacity="0.45" />
      <ellipse cx="60" cy="48" rx="4" ry="2" fill="#fb7185" opacity="0.45" />

      {/* Large Expressive Anime Eyes with Dual Catchlights */}
      {isConfident ? (
        <>
          {/* Wink + Sparkling Open Eye */}
          <path
            d="M34 42 Q39 38 44 42"
            stroke="#1e293b"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="57" cy="42" rx="4.5" ry="5" fill="#1e293b" />
          <ellipse cx="57" cy="43" rx="3.4" ry="3.8" fill={ch.eyeColor} />
          <circle cx="55.5" cy="40.5" r="1.5" fill="#ffffff" />
          <circle cx="58.5" cy="44.5" r="0.8" fill="#ffffff" />
        </>
      ) : isShocked ? (
        <>
          <circle cx="39" cy="42" r="4.5" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <circle cx="39" cy="42" r="2" fill={ch.eyeColor} />
          <circle cx="57" cy="42" r="4.5" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <circle cx="57" cy="42" r="2" fill={ch.eyeColor} />
        </>
      ) : (
        <>
          <ellipse cx="39" cy="42" rx="4.5" ry="5" fill="#1e293b" />
          <ellipse cx="39" cy="43" rx="3.4" ry="3.8" fill={ch.eyeColor} />
          <circle cx="37.5" cy="40.5" r="1.5" fill="#ffffff" />
          <circle cx="40.5" cy="44.5" r="0.8" fill="#ffffff" />

          <ellipse cx="57" cy="42" rx="4.5" ry="5" fill="#1e293b" />
          <ellipse cx="57" cy="43" rx="3.4" ry="3.8" fill={ch.eyeColor} />
          <circle cx="55.5" cy="40.5" r="1.5" fill="#ffffff" />
          <circle cx="58.5" cy="44.5" r="0.8" fill="#ffffff" />
        </>
      )}

      {/* Glasses for Rei */}
      {avatarId === 'rei' && (
        <>
          <rect
            x="33"
            y="38"
            width="12"
            height="8"
            rx="2"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
          <rect
            x="51"
            y="38"
            width="12"
            height="8"
            rx="2"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
          <line x1="45" y1="41" x2="51" y2="41" stroke="#38bdf8" strokeWidth="1.5" />
        </>
      )}

      {/* Front Hair Bangs & Highlight Arc */}
      <path
        d="M28 36 C30 20 40 17 48 17 C56 17 66 20 68 36 C63 27 56 26 52 33 C49 25 45 25 42 33 C37 26 32 28 28 36 Z"
        fill={ch.hairColor}
      />
      <path
        d="M35 25 Q48 21 61 25"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />

      {/* Mouth */}
      {isShocked ? (
        <ellipse cx="48" cy="53" rx="3" ry="3.8" fill="#be123c" />
      ) : isWinner || isConfident ? (
        <path
          d="M43 51 Q48 57 53 51 Z"
          fill="#e11d48"
          stroke="#9f1239"
          strokeWidth="1"
        />
      ) : (
        <path
          d="M44 52 Q48 55 52 52"
          stroke="#be123c"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Sparkle / Sweat Effect Overlays */}
      {(isWinner || isConfident) && (
        <polygon
          points="78,18 80,23 85,25 80,27 78,32 76,27 71,25 76,23"
          fill="#fde047"
        />
      )}
      {isShocked && (
        <path d="M68 32 C66 37 70 39 68 32 Z" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1" />
      )}
    </svg>
  );
}

export interface SoulCutInData {
  id: number;
  avatarId: SoulAvatarId;
  characterName: string;
  headline: string;
  subline: string;
  quote: string;
  theme: 'allin' | 'win' | 'raise';
}

export function SoulCutInOverlay({
  cutIn,
  onDismiss,
}: {
  cutIn: SoulCutInData | null;
  onDismiss: () => void;
}) {
  if (!cutIn) return null;

  const gradientClass =
    cutIn.theme === 'allin'
      ? 'from-rose-950/95 via-purple-900/95 to-amber-900/95 border-amber-300'
      : cutIn.theme === 'win'
        ? 'from-amber-950/95 via-yellow-900/95 to-emerald-950/95 border-yellow-300'
        : 'from-cyan-950/95 via-blue-900/95 to-indigo-950/95 border-cyan-300';

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-fadeIn"
    >
      <div
        className={`relative w-full max-w-3xl -skew-y-2 overflow-hidden rounded-3xl border-4 bg-gradient-to-r p-5 shadow-[0_0_80px_rgba(251,191,36,0.65)] sm:p-7 ${gradientClass}`}
      >
        {/* Speedline Stripes */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-25deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 2px, transparent 2px, transparent 14px)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <div className="shrink-0">
            <AnimeSoulPortraitSvg
              avatarId={cutIn.avatarId}
              expression={cutIn.theme === 'win' ? 'winner' : 'confident'}
              className="h-28 w-28 sm:h-36 sm:w-36"
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="inline-block rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-black tracking-widest text-slate-950 uppercase shadow">
              ⚡ SPECIAL CUT-IN ・ {cutIn.characterName}
            </div>
            <h3 className="mt-1.5 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(251,191,36,0.8)] sm:text-4xl">
              {cutIn.headline}
            </h3>
            <p className="mt-0.5 text-xs font-black text-amber-300 sm:text-sm">
              {cutIn.subline}
            </p>
            <p className="mt-2.5 rounded-2xl border border-white/20 bg-black/55 px-4 py-2 text-xs font-bold text-white italic sm:text-sm">
              「{cutIn.quote}」
            </p>
          </div>
        </div>

        <p className="relative z-10 mt-2 text-right text-[10px] font-bold text-amber-200/80">
          タップで閉じる
        </p>
      </div>
    </div>
  );
}

export function SoulCharacterModal({
  open,
  selectedAvatar,
  bondPoints,
  danInfo,
  onSelectAvatar,
  onTestVoice,
  onClose,
}: {
  open: boolean;
  selectedAvatar: SoulAvatarId;
  bondPoints: number;
  danInfo: DanRankInfo;
  onSelectAvatar: (id: SoulAvatarId) => void;
  onTestVoice: (avatarId: SoulAvatarId, text: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const bondLevel = Math.min(5, 1 + Math.floor(bondPoints / 50));
  const currentChar = SOUL_CHARACTERS[selectedAvatar];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border-2 border-amber-400/50 bg-slate-950 p-4 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
              VIP CHARACTER &amp; VOICE GALLERY
            </p>
            <h3 className="text-base font-black text-white sm:text-xl">
              ✨ 雀魂風・使用キャラクター選択＆CVボイス図鑑
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-black text-white hover:bg-white/20"
          >
            ✕ 閉じる
          </button>
        </div>

        {/* Player Dan Rank & Bond Status */}
        <div className="mt-4 grid gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 p-3.5 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">現在の段位認定</span>
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 font-black text-slate-950">
                {danInfo.tierBadge} ({danInfo.title})
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200"
                style={{
                  width: `${Math.min(100, Math.round((danInfo.currentXp / danInfo.nextXp) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              段位EXP: {danInfo.currentXp} / {danInfo.nextXp}（ハンド勝利で段位Pt上昇）
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                パートナー絆レベル ({currentChar.name})
              </span>
              <span className="rounded-full bg-rose-500/30 px-2.5 py-0.5 font-black text-rose-200">
                {'♥️'.repeat(bondLevel)} 絆 Lv.{bondLevel}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-300">
              得意ハンド: <strong className="text-amber-300">{currentChar.favoriteHand}</strong> ・{' '}
              {currentChar.cvStyle}
            </p>
          </div>
        </div>

        {/* 6 Character Cards Grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(SOUL_CHARACTERS) as SoulAvatarId[]).map((id) => {
            const ch = SOUL_CHARACTERS[id];
            const isSelected = selectedAvatar === id;
            return (
              <div
                key={id}
                className={`flex flex-col justify-between rounded-2xl border p-3.5 transition ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/15 ring-2 ring-amber-400'
                    : 'border-white/10 bg-slate-900/80 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <AnimeSoulPortraitSvg
                      avatarId={id}
                      expression={isSelected ? 'winner' : 'normal'}
                      className="h-16 w-16 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="inline-block rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                        {ch.title}
                      </span>
                      <h4 className="mt-0.5 truncate text-sm font-black text-white">
                        {ch.name}
                      </h4>
                      <p className="text-[10px] text-rose-200">{ch.cvStyle}</p>
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
                    {ch.bio}
                  </p>

                  {/* Sample Voice Buttons */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {ch.sampleVoices.map((sv) => (
                      <button
                        key={sv.label}
                        type="button"
                        onClick={() => onTestVoice(id, sv.text)}
                        className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-[10px] font-bold text-cyan-200 hover:border-cyan-400 hover:bg-cyan-500/20"
                      >
                        🔊 {sv.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectAvatar(id)}
                  className={`mt-3 w-full rounded-xl py-2 text-xs font-black transition ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'border border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-400 hover:text-slate-950'
                  }`}
                >
                  {isSelected ? '✓ 使用中アバター' : 'このキャラを使用する'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
