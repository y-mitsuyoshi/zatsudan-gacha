import type { AiProfile } from './types';

export type CharId =
  | 'karen'
  | 'rei'
  | 'koharu'
  | 'valentina'
  | 'jin'
  | 'luna'
  | 'sakura'
  | 'alice'
  | 'leon'
  | 'chloe'
  | 'hibiki'
  | 'suou';

export type VoiceEvent =
  | 'greet'
  | 'check'
  | 'call'
  | 'raise'
  | 'allin'
  | 'fold'
  | 'win'
  | 'bigWin'
  | 'lose'
  | 'think'
  | 'select';

export type Expression = 'normal' | 'win';

export interface CharacterDef {
  id: CharId;
  name: string;
  nameEn: string;
  title: string;
  /** Short catchphrase shown on select screens */
  catchphrase: string;
  bio: string;
  voiceStyle: string;
  /** Voice actor / library credit */
  cvCredit: string;
  /** play-style label shown in UI */
  styleLabel: string;
  /** detailed strategic & tactical description (all characters have equal pro-level EV) */
  tacticalSummary: string;
  /** concise tactical tags shown on character cards */
  tacticalBadges: string[];
  /** primary accent color (hex) */
  color: string;
  /** secondary accent color (hex) */
  color2: string;
  /** tailwind gradient classes for banners (from-* via-* to-*) */
  gradient: string;
  favoriteHand: string;
  /** SpeechSynthesis fallback tuning */
  voicePitch: number;
  voiceRate: number;
  /** preferred voice gender hint */
  voiceGender: 'female' | 'male';
  ai: AiProfile;
  lines: Record<VoiceEvent, string[]>;
}

export const CHAR_IDS: CharId[] = [
  'karen',
  'rei',
  'koharu',
  'valentina',
  'jin',
  'luna',
  'sakura',
  'alice',
  'leon',
  'chloe',
  'hibiki',
  'suou',
];

/** Generated illustration paths (bust-up, square). */
export function charImage(id: CharId, expr: Expression = 'normal'): string {
  return expr === 'win'
    ? `/assets/holdem/chars/${id}_win.webp`
    : `/assets/holdem/chars/${id}.webp`;
}

/** Pre-rendered studio anime voice clip path. */
export function charVoiceUrl(id: CharId, ev: VoiceEvent, index = 0): string {
  const safeIdx = Math.max(0, Math.min(1, index));
  return `/assets/holdem/voices/${id}/${ev}_${safeIdx}.mp3`;
}

export const HOLDEM_ASSETS = {
  bgLounge: '/assets/holdem/bg_lounge.webp',
  keyVisual: '/assets/holdem/key_visual.webp',
  logo: '/assets/holdem/logo.webp',
  cardBack: '/assets/holdem/card_back.webp',
  felt: {
    emerald: '/assets/holdem/felt_emerald.webp',
    crimson: '/assets/holdem/felt_crimson.webp',
    midnight: '/assets/holdem/felt_midnight.webp',
  },
} as const;

export type FeltId = keyof typeof HOLDEM_ASSETS.felt;

export const FELTS: { id: FeltId; name: string; accent: string }[] = [
  { id: 'emerald', name: 'エメラルド・ロイヤル', accent: '#34d399' },
  { id: 'crimson', name: 'クリムゾン・ベルベット', accent: '#fb7185' },
  { id: 'midnight', name: 'ミッドナイト・スター', accent: '#7dd3fc' },
];

export const GAME_TITLE = 'ROYAL FLUSH NIGHT';
export const GAME_TITLE_JA = 'ロイヤル・ナイト・ポーカー';

export const CHARACTERS: Record<CharId, CharacterDef> = {
  karen: {
    id: 'karen',
    name: '一ノ瀬 カレン',
    nameEn: 'KAREN ICHINOSE',
    title: '紅蓮の令嬢ギャンブラー',
    catchphrase: '勝つのは当然、私だもの。',
    bio: '名門一ノ瀬家の跡取り娘。負けず嫌いで強気なアグレッシブスタイル。レイズで主導権を握り、相手をねじ伏せるのが快感。',
    voiceStyle: '強気ツンデレ令嬢',
    cvCredit: 'CV: 金苗',
    styleLabel: 'ハイプレッシャー・3ベッター',
    tacticalSummary: 'プリフロップの3ベットと高頻度Cベット（継続ベット）で主導権を握り、ポットサイズ前後の力強いベットで相手に難しい判断を迫る王道アグレッシブ戦術。',
    tacticalBadges: ['3-Bet主導', '高頻度C-Bet', 'ポット圧迫'],
    color: '#f43f5e',
    color2: '#fbbf24',
    gradient: 'from-rose-600 via-red-700 to-amber-500',
    favoriteHand: 'A♠ K♠',
    voicePitch: 1.3,
    voiceRate: 1.08,
    voiceGender: 'female',
    ai: {
      looseness: 0.48,
      aggression: 0.78,
      bluff: 0.30,
      stickiness: 0.38,
      shove: 0.52,
      drawLove: 0.48,
      archetype: 'pressure_3bet',
      sizingBias: 'pot',
      cbetFreq: 0.82,
      checkRaiseFreq: 0.22,
      probeBetFreq: 0.45,
      stealFreq: 0.72,
    },
    lines: {
      greet: ['あんたが今夜の相手？せいぜい楽しませなさいよね！', '一ノ瀬カレンよ。手加減なんてしないから！'],
      check: ['チェック。様子見よ、様子見。', 'ふん、ここは回してあげる。'],
      call: ['コール。逃げるわけないでしょ？', '受けて立つわ！'],
      raise: ['その程度？倍返しよ、レイズ！', 'レイズ！主導権は私のものよ！'],
      allin: ['オールインよ！私のすべてを賭けてねじ伏せてあげる！', '全部よ、全部！かかってきなさい！'],
      fold: ['…今回は見逃してあげるわ。', 'べ、別に怖くて降りたんじゃないんだから！'],
      win: ['ふふん、当然の結果ね！', 'チップは全部いただくわよ♪'],
      bigWin: ['見た？これが一ノ瀬の勝負強さよ！', '最高の気分！もっと私を讃えなさい！'],
      lose: ['くぅっ…次は絶対負けないんだから！', 'う、運が悪かっただけよ！'],
      think: ['うーん…どう攻めようかしら。', 'ちょっと待ちなさい…'],
      select: ['私を選ぶなんて、見る目あるじゃない。', '一緒に頂点を目指すわよ！'],
    },
  },
  rei: {
    id: 'rei',
    name: '九条 レイ',
    nameEn: 'REI KUJO',
    title: '氷の天才数理アナリスト',
    catchphrase: '期待値は、裏切らない。',
    bio: 'ゲーム理論と確率計算を極めた若き天才。感情を排した精密なベットサイズで、相手のミスを確実に刈り取る。',
    voiceStyle: 'クール知性派',
    cvCredit: 'CV: オレンジ',
    styleLabel: 'GTO・ジオメトリック均衡',
    tacticalSummary: 'ポットオッズとSPR（スタック対ポット比）から逆算したジオメトリック66%ベットと、バリュー・ブラフ比率を厳密に保つゲーム理論最適（GTO）戦術。',
    tacticalBadges: ['GTO均衡', 'ジオメトリック66%', 'オッズ厳密'],
    color: '#38bdf8',
    color2: '#e2e8f0',
    gradient: 'from-sky-500 via-blue-700 to-slate-800',
    favoriteHand: 'Q♠ Q♥',
    voicePitch: 0.85,
    voiceRate: 1.02,
    voiceGender: 'male',
    ai: {
      looseness: 0.36,
      aggression: 0.70,
      bluff: 0.24,
      stickiness: 0.36,
      shove: 0.45,
      drawLove: 0.50,
      archetype: 'gto_solver',
      sizingBias: 'geometric',
      cbetFreq: 0.68,
      checkRaiseFreq: 0.28,
      probeBetFreq: 0.50,
      stealFreq: 0.62,
    },
    lines: {
      greet: ['確率の収束を証明しよう。いいゲームを。', '九条だ。データは十分に揃っている。'],
      check: ['チェックだ。', 'ここはレンジを守る。'],
      call: ['ポットオッズは足りている。コール。', 'コールだ。'],
      raise: ['エクイティは十分だ。レイズ。', 'このサイズが最適解だ。'],
      allin: ['期待値は収束する…オールインだ。', '計算終了。全額投入する。'],
      fold: ['合理的判断だ。フォールド。', '期待値マイナスだ。降りる。'],
      win: ['計算通りだ。', '数学的優位は揺るがないよ。'],
      bigWin: ['完璧な収束だ。美しい。', 'これが最適戦略の帰結さ。'],
      lose: ['分散の範囲内だ…問題ない。', '想定外のリバーか。'],
      think: ['計算中だ…', 'ふむ、悪くない。'],
      select: ['合理的な選択だ。勝率を最大化しよう。', 'よろしく。君の判断を信じよう。'],
    },
  },
  koharu: {
    id: 'koharu',
    name: '天宮 コハル',
    nameEn: 'KOHARU AMAMIYA',
    title: '幸運を招く白猫ディーラー',
    catchphrase: '幸運はね、楽しむ人に来るにゃ！',
    bio: 'ラウンジで大人気の看板ディーラー。理屈より直感派で、なぜかリバーで奇跡を引き寄せる豪運の持ち主。',
    voiceStyle: '元気いっぱい看板娘',
    cvCredit: 'CV: 猫音コハク (ねゆたろ)',
    styleLabel: 'セットマイン＆インプライド戦術',
    tacticalSummary: 'ポケットペアや連番カードでインプライドオッズ（潜在回収期待値）を計算して参加し、セットや強役をヒットさせた瞬間にチェックレイズで特大ポットを奪う急襲戦術。',
    tacticalBadges: ['セットマイニング', 'インプライド重視', 'フロップ急襲'],
    color: '#34d399',
    color2: '#fde68a',
    gradient: 'from-emerald-400 via-teal-500 to-amber-300',
    favoriteHand: '7♥ 7♦',
    voicePitch: 1.45,
    voiceRate: 1.12,
    voiceGender: 'female',
    ai: {
      looseness: 0.48,
      aggression: 0.66,
      bluff: 0.22,
      stickiness: 0.44,
      shove: 0.48,
      drawLove: 0.68,
      archetype: 'set_mine_implied',
      sizingBias: 'pot',
      cbetFreq: 0.56,
      checkRaiseFreq: 0.48,
      probeBetFreq: 0.42,
      stealFreq: 0.55,
    },
    lines: {
      greet: ['にゃっほー！今夜も楽しく勝負するにゃ！', 'コハルだよ！よろしくにゃ♪'],
      check: ['チェックにゃ～！', 'とんとん、チェック！'],
      call: ['ついていくにゃ！コール！', 'コールにゃ！'],
      raise: ['いいカードの匂いがするにゃ！レイズ！', 'にゃふふ、上げちゃうにゃ！'],
      allin: ['ぜんぶ行くにゃーっ！幸運のオールイン！', 'にゃはっ！全部いっちゃえー！'],
      fold: ['今回はお昼寝するにゃ…', 'うにゃ～、降りるにゃ！'],
      win: ['やったにゃーっ！', 'ポット、いただきにゃ♪'],
      bigWin: ['特大ポットにゃ！今日はごちそうにゃ！', '奇跡のリバーにゃ！みんなありがとにゃ！'],
      lose: ['うにゃぁ…しょんぼり…', '次は絶対勝つにゃ！'],
      think: ['うーん、どうするかにゃ…', 'うにゃぁ…迷っちゃうにゃ。'],
      select: ['コハルを選んでくれてありがとにゃ！', '一緒に幸運をつかむにゃ！'],
    },
  },
  valentina: {
    id: 'valentina',
    name: 'ヴァレンティナ・ロゼ',
    nameEn: 'VALENTINA ROSE',
    title: '黄金の女帝',
    catchphrase: 'さあ、私に跪きなさい。',
    bio: '欧州社交界の頂点に君臨する女帝。華麗なブラフと圧倒的なプレッシャーで、相手に自ら手札を捨てさせる。',
    voiceStyle: '妖艶な女帝',
    cvCredit: 'CV: 七日 週',
    styleLabel: 'ポラライズ・オーバーベッター',
    tacticalSummary: 'ナッツ級の最強バリューとブロッカー付きブラフへレンジを二極化（ポラライズ）し、ターン・リバーで100%〜125%ポットのオーバーベットを突きつける女帝戦術。',
    tacticalBadges: ['ポラライズ', 'リバーOverbet', 'ブロッカー活用'],
    color: '#c084fc',
    color2: '#fbbf24',
    gradient: 'from-purple-600 via-fuchsia-700 to-amber-500',
    favoriteHand: 'A♥ A♦',
    voicePitch: 1.1,
    voiceRate: 0.96,
    voiceGender: 'female',
    ai: {
      looseness: 0.44,
      aggression: 0.74,
      bluff: 0.38,
      stickiness: 0.34,
      shove: 0.56,
      drawLove: 0.50,
      archetype: 'polarized_overbet',
      sizingBias: 'polarized',
      cbetFreq: 0.64,
      checkRaiseFreq: 0.26,
      probeBetFreq: 0.54,
      stealFreq: 0.66,
    },
    lines: {
      greet: ['ふふっ、今夜はどんなスリルをくれるのかしら？', 'ヴァレンティナよ。退屈させないでね。'],
      check: ['チェック。焦らないの。', 'あなたの番よ、坊や。'],
      call: ['いいわ、付き合ってあげる。', 'コールよ。'],
      raise: ['可愛いベットね。もっと熱くしてあげる。', 'レイズよ。耐えられるかしら？'],
      allin: ['オールインよ。女王の輝きにひれ伏しなさい！', 'すべてを賭けましょう…美しく。'],
      fold: ['今回は譲ってあげるわ。', 'ふふ、気まぐれよ。'],
      win: ['あら、ごめんなさいね♪', 'すべて私のものよ。'],
      bigWin: ['素敵…最高のディナーだわ。', '女帝の夜に乾杯しましょう。'],
      lose: ['あら…やるじゃない。', '今夜は少し酔ったみたいね。'],
      think: ['そうねぇ…どう料理しようかしら。', 'ふぅん、面白い手ね。'],
      select: ['私を選ぶなんて、いいセンスね。', '一緒に夜を支配しましょう。'],
    },
  },
  jin: {
    id: 'jin',
    name: '黒崎 ジン',
    nameEn: 'JIN KUROSAKI',
    title: '裏カジノの伝説',
    catchphrase: '最後に立っていた奴が、勝者だ。',
    bio: '世界中のハイステークスを渡り歩いた伝説の勝負師。普段は静かだが、ここぞという場面のオールインは誰にも止められない。',
    voiceStyle: 'ハードボイルド',
    cvCredit: 'CV: 銀芽',
    styleLabel: 'SPRコミット＆プッシュ戦術',
    tacticalSummary: 'スタック対ポット比（SPR）の計算に長け、厳選した強レンジから中盤以降の勝負所で容赦ないオールイン・プレッシャーを叩き込むハイステークス戦術。',
    tacticalBadges: ['SPR制圧', '勝負所オールイン', '鉄壁レンジ'],
    color: '#fbbf24',
    color2: '#71717a',
    gradient: 'from-amber-500 via-zinc-700 to-black',
    favoriteHand: 'K♠ K♣',
    voicePitch: 0.7,
    voiceRate: 0.94,
    voiceGender: 'male',
    ai: {
      looseness: 0.34,
      aggression: 0.72,
      bluff: 0.22,
      stickiness: 0.35,
      shove: 0.82,
      drawLove: 0.38,
      archetype: 'icm_push_specialist',
      sizingBias: 'pot',
      cbetFreq: 0.70,
      checkRaiseFreq: 0.24,
      probeBetFreq: 0.40,
      stealFreq: 0.58,
    },
    lines: {
      greet: ['いい目をしてるな。ヒリつく勝負になりそうだ。', '黒崎だ。始めようか。'],
      check: ['チェックだ。', '様子を見るか。'],
      call: ['乗ってやるよ。', 'コールだ。'],
      raise: ['ぬるいベットじゃ火がつかねえ。レイズだ。', 'ここからが本番だ、上げるぜ。'],
      allin: ['魂を燃やせ…オールインだ！', '全部くれてやる。受けてみな。'],
      fold: ['降りる。勝負所はここじゃねえ。', 'フォールドだ。'],
      win: ['悪く思うなよ。', 'いただいていくぜ。'],
      bigWin: ['これだからやめられねえ。', '勝負ってのはこうでなくちゃな。'],
      lose: ['ふん、やるじゃねえか。', 'ちっ、今日はツイてねえな。'],
      think: ['さて、どう出るか…', '焦る場面じゃねえな。'],
      select: ['俺を選ぶとはな。後悔はさせねえ。', 'いいだろう、付き合ってやる。'],
    },
  },
  luna: {
    id: 'luna',
    name: '星野 ルナ',
    nameEn: 'LUNA HOSHINO',
    title: '星詠みの占星術師',
    catchphrase: '星はもう、答えを知っています。',
    bio: '星の巡りからボードの未来を読む神秘的な占星術師。ドローハンドから劇的な逆転役を完成させるのが得意。',
    voiceStyle: '神秘系ウィスパー',
    cvCredit: 'CV: みちのくあいり (上戸恵里)',
    styleLabel: 'セミブラフ・ドローマエストロ',
    tacticalSummary: 'フラッシュドローやストレートドローを単なるコールで終わらせず、積極的なセミブラフ・ベット＆レイズで「降ろして良し・引いて良し」の二段構えを作る戦術。',
    tacticalBadges: ['セミブラフ二段構え', 'スーテッド重視', 'アウツ逆算'],
    color: '#a5b4fc',
    color2: '#fde047',
    gradient: 'from-indigo-500 via-violet-700 to-slate-900',
    favoriteHand: 'J♠ 10♠',
    voicePitch: 1.2,
    voiceRate: 0.98,
    voiceGender: 'female',
    ai: {
      looseness: 0.46,
      aggression: 0.68,
      bluff: 0.28,
      stickiness: 0.42,
      shove: 0.46,
      drawLove: 0.88,
      archetype: 'suited_draw_semi_bluff',
      sizingBias: 'geometric',
      cbetFreq: 0.64,
      checkRaiseFreq: 0.38,
      probeBetFreq: 0.46,
      stealFreq: 0.58,
    },
    lines: {
      greet: ['今夜の星回りは波乱の予感…よろしくお願いします。', 'ルナです。星の導きのままに。'],
      check: ['チェック…星はまだ沈黙しています。', 'チェックです。'],
      call: ['未来を見届けます。コール。', 'コールです。'],
      raise: ['未来のカードが見えました。レイズです。', '星が輝いています…レイズ。'],
      allin: ['星々が告げています…運命のオールインです。', 'すべてを星に委ねます。'],
      fold: ['今は流れが違うようです。', '星が陰りました…降ります。'],
      win: ['星の導きの通りですね。', 'このポット、星屑とともに頂きます。'],
      bigWin: ['流星群のような夜ですね…', '運命は、私に微笑みました。'],
      lose: ['星読みを誤りました…', 'こういう夜もありますね。'],
      think: ['星に問いかけています…', '静かに未来を視ています…'],
      select: ['あなたの星と、私の星が重なりました。', 'よろしくお願いします。星の導きを。'],
    },
  },
  sakura: {
    id: 'sakura',
    name: '不知火 桜',
    nameEn: 'SAKURA SHIRANUI',
    title: '艶華の花魁ギャンブラー',
    catchphrase: '宵の桜に、酔いしれてみなさいな。',
    bio: '古都の老舗遊郭からスカイラウンジへ舞い降りた妖艶な勝負師。柔らかな微笑みの裏で、相手の心の揺らぎを完璧に見透かす。',
    voiceStyle: '妖艶お姉さん',
    cvCredit: 'CV: 木角 空',
    styleLabel: 'スロープレイ＆チェックレイズ',
    tacticalSummary: '強い役や好ボードであえてチェックを選択して相手のブラフや薄いベットを誘い出し、鋭いチェックレイズで主導権とポットを一気に刈り取るカウンター戦術。',
    tacticalBadges: ['チェックレイズ罠', 'スロープレイ', 'ブラフキャッチ'],
    color: '#f472b6',
    color2: '#fbbf24',
    gradient: 'from-pink-500 via-rose-700 to-amber-500',
    favoriteHand: 'A♥ Q♥',
    voicePitch: 1.15,
    voiceRate: 0.95,
    voiceGender: 'female',
    ai: {
      looseness: 0.44,
      aggression: 0.68,
      bluff: 0.30,
      stickiness: 0.44,
      shove: 0.46,
      drawLove: 0.54,
      archetype: 'slowplay_check_raise',
      sizingBias: 'pot',
      cbetFreq: 0.54,
      checkRaiseFreq: 0.58,
      probeBetFreq: 0.48,
      stealFreq: 0.60,
    },
    lines: {
      greet: ['今宵は桜が満開よ。素敵な夜会にしましょうね。', '不知火桜と申します。お手柔らかにね♪'],
      check: ['チェックよ。まずはお手並み拝見ね。', 'ふふ、ここは静かに見守るわ。'],
      call: ['コールよ。最後までお付き合いするわ。', 'ええ、受けて立つわよ。'],
      raise: ['もう少し華やかにいきましょう？レイズよ。', '桜吹雪のように舞い上げるわ、レイズ！'],
      allin: ['宵の華、すべて咲かせてみせるわ…オールイン！', '私のすべてを賭けるわ。受け止められる？'],
      fold: ['散り際も肝心ね…フォールドよ。', 'ふふ、ここは一歩引いておくわ。'],
      win: ['あらあら、満開の勝利ね♪', '今宵の運気は私の味方みたいね。'],
      bigWin: ['これぞ百花繚乱！見事な大輪が咲いたわね！', 'うふふ、最高の宴になったわ♪'],
      lose: ['まあ…見事な手際だこと。', '花も嵐も踏み越えてこそ、ね。'],
      think: ['さて、どう舞いましょうか…', 'あなたの瞳、少し揺れているわよ…'],
      select: ['私をご指名？ふふ、極上の夢を見せてあげるわ。', '今宵はあなたと二人で、天下を獲りましょうね。'],
    },
  },
  alice: {
    id: 'alice',
    name: 'アリス・リデル',
    nameEn: 'ALICE LIDDELL',
    title: '不思議の国の天才少女',
    catchphrase: 'トランプの兵隊さん、全員整列よ！',
    bio: '英国の名門貴族出身の早熟なカード天才少女。可愛らしい見た目とは裏腹に、変幻自在のトリッキーな戦略で大人たちを翻弄する。',
    voiceStyle: '小悪魔ゴシック少女',
    cvCredit: 'CV: 卯畑まお (ねゆたろ)',
    styleLabel: 'フロート＆プローブトリックスター',
    tacticalSummary: 'フロップのCベットをポジション優位からコール（フロート）して相手の出方を窺い、相手がターンでチェックした瞬間に素早いプローブベットでポットを奪う変幻自在戦術。',
    tacticalBadges: ['IPフロート', 'ターンプローブ', '変則サイズ'],
    color: '#60a5fa',
    color2: '#f472b6',
    gradient: 'from-blue-400 via-indigo-600 to-pink-500',
    favoriteHand: 'A♠ A♣',
    voicePitch: 1.4,
    voiceRate: 1.06,
    voiceGender: 'female',
    ai: {
      looseness: 0.50,
      aggression: 0.72,
      bluff: 0.36,
      stickiness: 0.42,
      shove: 0.48,
      drawLove: 0.58,
      archetype: 'float_probe_tricky',
      sizingBias: 'small',
      cbetFreq: 0.68,
      checkRaiseFreq: 0.32,
      probeBetFreq: 0.72,
      stealFreq: 0.68,
    },
    lines: {
      greet: ['不思議の国のお茶会へようこそ！退屈させたら許さないわよ♪', 'アリスよ！トランプ遊びなら誰にも負けないんだから！'],
      check: ['チェック！まだ仕掛けないわよ♪', 'パスしてあげる。次はどう出るのかしら？'],
      call: ['コール！どこまででも追いかけちゃうわ！', 'ふふん、お見通しよ！コール！'],
      raise: ['もっと面白くしましょ！レイズよ！', 'ティーパーティーの始まりよ、レイズ！'],
      allin: ['トランプの兵隊さん、全員突撃ーっ！オールイン！', 'ワンダーランドの切り札よ！全部賭けるわ！'],
      fold: ['むぅ、つまらないカードね。フォールド！', 'ここはウサギ穴に隠れておくわ。'],
      win: ['えへへ、アリスの大勝利ね♪', 'やっぱりトランプは私のお友達だわ！'],
      bigWin: ['チェックメイトよ！不思議の国の女王は私ね！', 'すごいチップの山！お菓子が食べ放題だわ♪'],
      lose: ['もうっ！次は絶対ぎゃふんと言わせるわ！', 'うぅ、こんなはずじゃなかったのに…'],
      think: ['うーん、どっちの扉を開けようかしら…', 'むむむ…怪しい匂いがするわね。'],
      select: ['アリスを選んでくれるの？最高のお茶会にしましょ♪', '任せて！不思議な魔法でぜんぶ勝たせてあげる！'],
    },
  },
  leon: {
    id: 'leon',
    name: 'レオン・ヴァルハート',
    nameEn: 'LEON VALHART',
    title: '黄金獅子の騎士王',
    catchphrase: '退くことを知らぬ獅子に、敗北はない！',
    bio: '欧州の王立騎士団を率いる若き団長にして、正々堂々の真っ向勝負を愛する熱血ハイローラー。圧倒的なベットで正面から勝負を挑む。',
    voiceStyle: '熱血ヒーロー騎士',
    cvCredit: 'CV: にせ',
    styleLabel: 'トリプルバレル・バリュー重撃',
    tacticalSummary: 'フロップ・ターン・リバーと3ストリート連続で力強いバレル（連続ベット）を撃ち込み、ミドルペアや中途半端なドローを完全に振り落とす正面突破の王道戦術。',
    tacticalBadges: ['トリプルバレル', '重厚バリュー', '正面突破'],
    color: '#f59e0b',
    color2: '#fef08a',
    gradient: 'from-amber-400 via-orange-600 to-red-800',
    favoriteHand: 'K♥ K♦',
    voicePitch: 0.85,
    voiceRate: 1.05,
    voiceGender: 'male',
    ai: {
      looseness: 0.46,
      aggression: 0.80,
      bluff: 0.26,
      stickiness: 0.40,
      shove: 0.68,
      drawLove: 0.45,
      archetype: 'heavy_value_barrel',
      sizingBias: 'pot',
      cbetFreq: 0.80,
      checkRaiseFreq: 0.24,
      probeBetFreq: 0.58,
      stealFreq: 0.64,
    },
    lines: {
      greet: ['我が名はレオン！今夜は騎士の誇りに懸けて正々堂々勝負だ！', 'いい闘気だ！全力でぶつかり合おうじゃないか！'],
      check: ['チェックだ！間合いを測らせてもらうぞ。', 'ここは剣を収めておこう。'],
      call: ['コールだ！一歩たりとも退くものか！', '望むところだ！受けて立つ！'],
      raise: ['さらに熱くいこうぜ！レイズだ！', '獅子の咆哮を聞け！レイズ！'],
      allin: ['我が誇りのすべてを賭ける！黄金獅子のオールインだ！', '退路は断った！全軍突撃、オールイン！'],
      fold: ['くっ…ここは戦略的撤退だ。フォールド！', '見事な圧力だ。今は剣を引こう。'],
      win: ['よしっ！会心の勝利だな！', '正々堂々の勝負、気持ちがいいぜ！'],
      bigWin: ['見たか！これぞ黄金獅子の覇道だ！', '最高の勝利だ！今夜は全員に俺が奢るぞ！'],
      lose: ['ぐっ…見事な一撃だ、完敗だよ！', 'まだだ！獅子は何度でも立ち上がる！'],
      think: ['むぅ…どこに勝機がある…', '焦るな、敵の呼吸を見極めるんだ…'],
      select: ['俺の剣と誇り、すべて君に預けよう！', '共に行こう！勝利の栄光を掴み取るぞ！'],
    },
  },
  chloe: {
    id: 'chloe',
    name: 'クロエ・ノワール',
    nameEn: 'CHLOE NOIR',
    title: '月影の怪盗ディーラー',
    catchphrase: '予告通り、あなたのハートとポットを頂くわ。',
    bio: '月夜にだけ現れる神出鬼没の怪盗ディーラー。華麗なカードさばきと大胆不敵なブラフで、誰も気づかないうちにポットをさらっていく。',
    voiceStyle: 'クール怪盗美女',
    cvCredit: 'CV: 水巻 咲',
    styleLabel: 'レイトスチール＆スクイーズ',
    tacticalSummary: 'カットオフやボタンからのブラインドスチールと、オープン＋コーラーが溜まった死に金（デッドマネー）を狙い撃つ3ベット・スクイーズに長けた怪盗戦術。',
    tacticalBadges: ['BTNスチール', '3-Betスクイーズ', 'デッドマネー狩り'],
    color: '#818cf8',
    color2: '#e2e8f0',
    gradient: 'from-slate-700 via-indigo-800 to-violet-950',
    favoriteHand: 'A♠ J♠',
    voicePitch: 0.98,
    voiceRate: 1.02,
    voiceGender: 'female',
    ai: {
      looseness: 0.46,
      aggression: 0.72,
      bluff: 0.36,
      stickiness: 0.34,
      shove: 0.46,
      drawLove: 0.58,
      archetype: 'late_steal_squeeze',
      sizingBias: 'geometric',
      cbetFreq: 0.72,
      checkRaiseFreq: 0.30,
      probeBetFreq: 0.62,
      stealFreq: 0.84,
    },
    lines: {
      greet: ['今宵のターゲットはこのテーブルよ。ショーを始めましょうか。', '怪盗クロエ、参上よ。瞬きする暇も与えないわ。'],
      check: ['チェックよ。月影に潜んでおくわ。', 'まだタネ明かしの時間じゃないわね。'],
      call: ['コール。あなたのトリック、見破ってみせるわ。', '逃がさないわよ、コール。'],
      raise: ['予告状よ。このポットは高くつくわ、レイズ！', 'レイズよ。私のイリュージョンについてこれる？'],
      allin: ['フィナーレの時間よ！すべて頂戴するわ、オールイン！', '月夜の大泥棒に不可能はないわ…オールイン！'],
      fold: ['ふふ、煙幕で消えるとしましょう。フォールド。', '深追いは禁物ね。ここは華麗に退散よ。'],
      win: ['予告通り、ポットは頂いたわ♪', 'メルシー。華麗なショーだったでしょう？'],
      bigWin: ['今世紀最大のイリュージョン成功ね！アデュー♪', 'これだから怪盗稼業はやめられないわ！'],
      lose: ['あら、一本取られたわね。お見事よ。', '今夜のところはお預けにしておくわ。'],
      think: ['さて、どのルートから盗み出そうかしら…', 'ふむ…面白い罠を張るじゃない。'],
      select: ['私を相棒にするなんて粋ね。最高のショーにしましょう。', '了解よ。世界中のチップを二人でさらってしまいましょう♪'],
    },
  },
  hibiki: {
    id: 'hibiki',
    name: '天音 響',
    nameEn: 'HIBIKI AMANE',
    title: '超新星ギャンブルアイドル',
    catchphrase: 'みんなの声援で、ロイヤルフラッシュ引いちゃうよ☆',
    bio: 'ドーム公演を満員にする超人気現役アイドルにして、カジノ配信でもミリオン再生を連発するスター。勢いに乗った時の爆発力は随一。',
    voiceStyle: 'キラキラ現役アイドル',
    cvCredit: 'CV: るな',
    styleLabel: 'スモールボール・テンポ戦術',
    tacticalSummary: '33%〜45%ポットの小刻みなスモールベットを高頻度で繰り出し、ローリスクでポットをコントロールしながら幅広いボードで主導権を維持する現代的スモールボール戦術。',
    tacticalBadges: ['スモールボール33%', 'テンポ主導', '低リスク高回転'],
    color: '#fb7185',
    color2: '#38bdf8',
    gradient: 'from-rose-400 via-pink-500 to-sky-400',
    favoriteHand: '10♥ 10♠',
    voicePitch: 1.38,
    voiceRate: 1.1,
    voiceGender: 'female',
    ai: {
      looseness: 0.52,
      aggression: 0.68,
      bluff: 0.28,
      stickiness: 0.42,
      shove: 0.46,
      drawLove: 0.62,
      archetype: 'small_ball_momentum',
      sizingBias: 'small',
      cbetFreq: 0.78,
      checkRaiseFreq: 0.26,
      probeBetFreq: 0.66,
      stealFreq: 0.70,
    },
    lines: {
      greet: ['みんなー！ひびきのライブステージ、開幕だよーっ☆', '天音響だよっ！今夜もキラッキラに盛り上がっていこー！'],
      check: ['チェックだよ☆ まだまだ様子見っ！', 'ここはリズムを整えるね、チェック！'],
      call: ['コールっ！ひびき、ぜったい諦めないよ！', 'ついていくよーっ！コール☆'],
      raise: ['ボルテージ上げていくよーっ！レイズ☆', 'アンコールに応えて、もっとベットしちゃうよ！'],
      allin: ['クライマックスだよーっ！ひびきの全力オールイン☆', 'みんなの声援、全部パワーに変えてオールインっ！'],
      fold: ['あちゃー、ここは一旦ステージ裏に下がるね…', 'フォールド！次の曲で巻き返すもん！'],
      win: ['やったぁー！センター獲得だよっ☆', 'えへへ、応援ありがとうーっ♪'],
      bigWin: ['ミリオンヒット達成ーっ！最高のライブになったよー☆', 'キラッキラの大勝利！みんな大好きーっ！'],
      lose: ['うわーん、悔しいよぉ…でも次は絶対勝つからね！', 'ハプニングもライブのうちだよね…っ！'],
      think: ['うーん、どのカードが光ってるかなぁ…', 'ドキドキするね…どうしよっか…'],
      select: ['プロデューサーさん！ひびきを一番輝かせてね☆', 'やったー！二人で伝説のステージにしよっか♪'],
    },
  },
  suou: {
    id: 'suou',
    name: '蘇芳 司',
    nameEn: 'TSUKASA SUOU',
    title: '微笑みの執事ディーラー',
    catchphrase: 'お任せください。勝利の紅茶が冷めぬうちに。',
    bio: 'スカイラウンジの最上階を取り仕切る気品溢れる執事長。常に穏やかな糸目の微笑みを浮かべているが、開眼した時は誰も勝てないという噂。',
    voiceStyle: '知的イケボ執事',
    cvCredit: 'CV: 亜空マオ',
    styleLabel: 'ディレイドC-Bet＆リバー精密誘導',
    tacticalSummary: 'フロップでレンジ全体を守りつつディレイドCベット（ターンからの遅延攻撃）とリバーのシンバリュー（薄い価値ベット）を精密に使い分ける隙のないオールラウンド戦術。',
    tacticalBadges: ['ディレイドC-Bet', 'リバー薄バリュー', '全方位対応'],
    color: '#a78bfa',
    color2: '#f43f5e',
    gradient: 'from-violet-600 via-purple-900 to-rose-900',
    favoriteHand: 'A♣ K♣',
    voicePitch: 0.78,
    voiceRate: 0.98,
    voiceGender: 'male',
    ai: {
      looseness: 0.38,
      aggression: 0.70,
      bluff: 0.25,
      stickiness: 0.38,
      shove: 0.46,
      drawLove: 0.50,
      archetype: 'delayed_turn_counter',
      sizingBias: 'geometric',
      cbetFreq: 0.52,
      checkRaiseFreq: 0.36,
      probeBetFreq: 0.68,
      stealFreq: 0.62,
    },
    lines: {
      greet: ['ようこそお越しくださいました。今宵は私がお相手いたします。', '執事の蘇芳でございます。極上の勝負をお届けしましょう。'],
      check: ['チェックでございます。どうぞお先に。', 'まずは皆様の出方を拝見いたしましょう。'],
      call: ['コールいたします。お付き合いさせていただきますよ。', 'かしこまりました、コールでございます。'],
      raise: ['少しスパイスを加えましょうか。レイズでございます。', 'これより先はVIPの領域ですよ…レイズ。'],
      allin: ['これより先は手加減いたしません…オールインです。', '主人の命により、すべてを賭けさせていただきます。'],
      fold: ['失礼、ここは控えさせていただきます。フォールド。', 'スマートに退くのも執事の嗜みでございます。'],
      win: ['お粗末様でございました。', 'ふふ、予定通りの仕上がりですね。'],
      bigWin: ['完璧なテーブルメイクでございました。紅茶をお持ちしましょう。', 'これぞ至高の勝利…お見事でございます。'],
      lose: ['ほう…私としたことが、お見それいたしました。', '素晴らしい一手ですね。感服いたしました。'],
      think: ['さて、いかにおもてなしいたしましょうか…', 'ふむ…実に興味深い盤面ですね。'],
      select: ['私をご指名とは光栄です。完璧にお仕えいたしますよ。', 'かしこまりました。勝利の栄冠をあなた様へ捧げましょう。'],
    },
  },
};

export function pickLine(id: CharId, ev: VoiceEvent, seed = Math.random()): string {
  const arr = CHARACTERS[id].lines[ev];
  return arr[Math.floor(seed * arr.length) % arr.length];
}

const LINE_MAP = new Map<string, string>();
for (const id of CHAR_IDS) {
  const ch = CHARACTERS[id];
  (Object.keys(ch.lines) as VoiceEvent[]).forEach((ev) => {
    ch.lines[ev].forEach((text, idx) => {
      LINE_MAP.set(`${id}:${text}`, charVoiceUrl(id, ev, idx));
      if (!LINE_MAP.has(text)) {
        LINE_MAP.set(text, charVoiceUrl(id, ev, idx));
      }
    });
  });
}

/**
 * Resolves any character speech line or event to its pre-rendered studio anime seiyuu MP3 URL.
 */
export function resolveVoiceClipUrl(
  text: string,
  opts?: { charId?: CharId; event?: VoiceEvent; gender?: 'female' | 'male' },
): string {
  if (opts?.charId && LINE_MAP.has(`${opts.charId}:${text}`)) {
    return LINE_MAP.get(`${opts.charId}:${text}`)!;
  }
  if (LINE_MAP.has(text)) {
    return LINE_MAP.get(text)!;
  }
  const id: CharId =
    opts?.charId && CHARACTERS[opts.charId]
      ? opts.charId
      : opts?.gender === 'male'
        ? 'rei'
        : 'koharu';
  if (opts?.event) {
    const idx = text.length % 2;
    return charVoiceUrl(id, opts.event, idx);
  }
  // Heuristic event inference for custom lines in Blackjack / Daifugo / Solitaire
  const t = text;
  let ev: VoiceEvent = 'greet';
  if (/オールイン|ALL-IN|ぜんぶ|すべて|革命|REVOLUTION|ブラックジャック|BLACKJACK/i.test(t)) ev = 'allin';
  else if (/大勝利|特大|最高|クリア|完全制覇|大富豪|1位|優勝|BIG/i.test(t)) ev = 'bigWin';
  else if (/勝|やった|いただき|お見事|ナイス|素敵|通り/i.test(t)) ev = 'win';
  else if (/負|悔しい|バースト|BUST|ぐぬぬ|しょんぼり|誤り|大貧民/i.test(t)) ev = 'lose';
  else if (/レイズ|ダブル|スプリット|8切り|スペ3|強気|熱く/i.test(t)) ev = 'raise';
  else if (/コール|ヒット|カードを引|ついていく|乗って/i.test(t)) ev = 'call';
  else if (/チェック|スタンド|パス|様子見|守る/i.test(t)) ev = 'check';
  else if (/フォールド|サレンダー|降り|引いて|控え/i.test(t)) ev = 'fold';
  else if (/うーん|計算|迷う|どう|ヒント|思考/i.test(t)) ev = 'think';
  else if (/選んで|指名|よろしく|一緒に/i.test(t)) ev = 'select';
  const idx = text.length % 2;
  return charVoiceUrl(id, ev, idx);
}
