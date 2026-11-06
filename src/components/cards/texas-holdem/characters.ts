import type { AiProfile } from './types';

export type CharId = 'karen' | 'rei' | 'koharu' | 'valentina' | 'jin' | 'luna';

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
  /** play-style label shown in UI */
  styleLabel: string;
  /** primary accent color (hex) */
  color: string;
  /** secondary accent color (hex) */
  color2: string;
  /** tailwind gradient classes for banners (from-* via-* to-*) */
  gradient: string;
  favoriteHand: string;
  /** SpeechSynthesis tuning */
  voicePitch: number;
  voiceRate: number;
  /** preferred voice gender hint for SpeechSynthesis voice selection */
  voiceGender: 'female' | 'male';
  ai: AiProfile;
  lines: Record<VoiceEvent, string[]>;
}

export const CHAR_IDS: CharId[] = ['karen', 'rei', 'koharu', 'valentina', 'jin', 'luna'];

/** Generated illustration paths (bust-up, square). */
export function charImage(id: CharId, expr: Expression = 'normal'): string {
  return expr === 'win'
    ? `/assets/holdem/chars/${id}_win.webp`
    : `/assets/holdem/chars/${id}.webp`;
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
    styleLabel: 'ルース・アグレッシブ',
    color: '#f43f5e',
    color2: '#fbbf24',
    gradient: 'from-rose-600 via-red-700 to-amber-500',
    favoriteHand: 'A♠ K♠',
    voicePitch: 1.3,
    voiceRate: 1.08,
    voiceGender: 'female',
    ai: { looseness: 0.62, aggression: 0.78, bluff: 0.32, stickiness: 0.35, shove: 0.5, drawLove: 0.45 },
    lines: {
      greet: ['あんたが今夜の相手？せいぜい楽しませなさいよね！', '一ノ瀬カレンよ。手加減なんてしないから！'],
      check: ['チェック。様子見よ、様子見。', 'ふん、ここは回してあげる。'],
      call: ['コール。逃げるわけないでしょ？', '受けて立つわ！'],
      raise: ['その程度？倍返しよ、レイズ！', 'レイズ！主導権は私のものよ！'],
      allin: ['オールインよ！私のすべてを賭けてねじ伏せてあげる！', '全部よ、全部！かかってきなさい！'],
      fold: ['…今回は見逃してあげるわ。', 'べ、別に怖くて降りたんじゃないんだから！'],
      win: ['ふふん、当然の結果ね！', 'チップは全部いただくわよ♪'],
      bigWin: ['見た？これが一ノ瀬の勝負強さよ！', '最高の気分！もっと私を讃えなさい！'],
      lose: ['ぐぬぬ…次は絶対負けないんだから！', 'う、運が悪かっただけよ！'],
      think: ['うーん…', 'ちょっと待ちなさい…'],
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
    styleLabel: 'タイト・アグレッシブ',
    color: '#38bdf8',
    color2: '#e2e8f0',
    gradient: 'from-sky-500 via-blue-700 to-slate-800',
    favoriteHand: 'Q♠ Q♥',
    voicePitch: 0.85,
    voiceRate: 1.02,
    voiceGender: 'male',
    ai: { looseness: 0.3, aggression: 0.66, bluff: 0.16, stickiness: 0.25, shove: 0.35, drawLove: 0.4 },
    lines: {
      greet: ['確率の収束を証明しよう。いいゲームを。', '九条だ。データは十分に揃っている。'],
      check: ['チェック。', 'ここはレンジを守る。'],
      call: ['ポットオッズは足りている。コール。', 'コールだ。'],
      raise: ['エクイティは十分だ。レイズ。', 'このサイズが最適解だ。'],
      allin: ['期待値は収束する…オールインだ。', '計算終了。全額投入する。'],
      fold: ['合理的判断だ。フォールド。', '期待値マイナスだ。降りる。'],
      win: ['計算通りだ。', '数学的優位は揺るがないよ。'],
      bigWin: ['完璧な収束だ。美しい。', 'これが最適戦略の帰結さ。'],
      lose: ['分散の範囲内だ…問題ない。', '…想定外のリバーか。'],
      think: ['計算中…', 'ふむ…'],
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
    styleLabel: 'ルース・パッシブ（豪運）',
    color: '#34d399',
    color2: '#fde68a',
    gradient: 'from-emerald-400 via-teal-500 to-amber-300',
    favoriteHand: '7♥ 7♦',
    voicePitch: 1.45,
    voiceRate: 1.12,
    voiceGender: 'female',
    ai: { looseness: 0.72, aggression: 0.35, bluff: 0.15, stickiness: 0.65, shove: 0.3, drawLove: 0.75 },
    lines: {
      greet: ['にゃっほー！今夜も楽しく勝負するにゃ！', 'コハルだよ！よろしくにゃ♪'],
      check: ['チェックにゃ～', 'とんとん、チェック！'],
      call: ['ついていくにゃ！コール！', 'コールにゃ！'],
      raise: ['いいカードの匂いがするにゃ！レイズ！', 'にゃふふ、上げちゃう！'],
      allin: ['ぜんぶ行くにゃーっ！幸運のオールイン！', 'にゃはっ！全部いっちゃえー！'],
      fold: ['今回はお昼寝するにゃ…', 'うにゃ～、降りる！'],
      win: ['やったにゃーっ！', 'ポット、いただきにゃ♪'],
      bigWin: ['特大ポットにゃ！今日はごちそうにゃ！', '奇跡のリバーにゃ！みんなありがとにゃ！'],
      lose: ['うにゃぁ…しょんぼり…', '次は勝つにゃ！'],
      think: ['うーんうーん…', 'にゃむむ…'],
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
    styleLabel: 'ブラフ・マスター',
    color: '#c084fc',
    color2: '#fbbf24',
    gradient: 'from-purple-600 via-fuchsia-700 to-amber-500',
    favoriteHand: 'A♥ A♦',
    voicePitch: 1.1,
    voiceRate: 0.96,
    voiceGender: 'female',
    ai: { looseness: 0.55, aggression: 0.72, bluff: 0.45, stickiness: 0.3, shove: 0.4, drawLove: 0.5 },
    lines: {
      greet: ['ふふっ、今夜はどんなスリルをくれるのかしら？', 'ヴァレンティナよ。退屈させないでね。'],
      check: ['チェック。焦らないの。', 'あなたの番よ、坊や。'],
      call: ['いいわ、付き合ってあげる。', 'コール。'],
      raise: ['可愛いベットね。もっと熱くしてあげる。', 'レイズよ。耐えられるかしら？'],
      allin: ['オールインよ。女王の輝きにひれ伏しなさい！', 'すべてを賭けましょう…美しく。'],
      fold: ['今回は譲ってあげる。', 'ふふ、気まぐれよ。'],
      win: ['あら、ごめんなさいね♪', 'すべて私のものよ。'],
      bigWin: ['素敵…最高のディナーだわ。', '女帝の夜に乾杯しましょう。'],
      lose: ['…やるじゃない。', '今夜は少し酔ったみたい。'],
      think: ['そうねぇ…', 'ふぅん…'],
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
    styleLabel: 'タイト・プッシュ',
    color: '#fbbf24',
    color2: '#71717a',
    gradient: 'from-amber-500 via-zinc-700 to-black',
    favoriteHand: 'K♠ K♣',
    voicePitch: 0.7,
    voiceRate: 0.94,
    voiceGender: 'male',
    ai: { looseness: 0.28, aggression: 0.58, bluff: 0.2, stickiness: 0.3, shove: 0.8, drawLove: 0.3 },
    lines: {
      greet: ['いい目をしてるな。ヒリつく勝負になりそうだ。', '黒崎だ。始めようか。'],
      check: ['チェックだ。', '…回す。'],
      call: ['乗ってやる。', 'コールだ。'],
      raise: ['ぬるいベットじゃ火がつかねえ。レイズだ。', '上げるぜ。'],
      allin: ['魂を燃やせ…オールインだ！', '全部くれてやる。受けてみな。'],
      fold: ['降りる。勝負所はここじゃねえ。', 'フォールドだ。'],
      win: ['悪く思うな。', 'いただいていく。'],
      bigWin: ['これだからやめられねえ。', '勝負ってのはこうでなくちゃな。'],
      lose: ['…やるじゃねえか。', 'ちっ、今日はツイてねえ。'],
      think: ['……', 'さて、どうするか。'],
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
    styleLabel: 'ドロー・チェイサー',
    color: '#a5b4fc',
    color2: '#fde047',
    gradient: 'from-indigo-500 via-violet-700 to-slate-900',
    favoriteHand: 'J♠ 10♠',
    voicePitch: 1.2,
    voiceRate: 0.98,
    voiceGender: 'female',
    ai: { looseness: 0.5, aggression: 0.45, bluff: 0.22, stickiness: 0.5, shove: 0.35, drawLove: 0.9 },
    lines: {
      greet: ['今夜の星回りは波乱の予感…よろしくお願いします。', 'ルナです。星の導きのままに。'],
      check: ['チェック…星はまだ沈黙しています。', 'チェックです。'],
      call: ['未来を見届けます。コール。', 'コールです。'],
      raise: ['未来のカードが見えました。レイズです。', '星が輝いています…レイズ。'],
      allin: ['星々が告げています…運命のオールインです。', 'すべてを星に委ねます。'],
      fold: ['今は流れが違うようです。', '星が陰りました…降ります。'],
      win: ['星導の通りですね。', 'このポット、星屑とともに頂きます。'],
      bigWin: ['流星群のような夜ですね…', '運命は、私に微笑みました。'],
      lose: ['星読みを誤りました…', '…こういう夜もあります。'],
      think: ['星に問いかけています…', '……'],
      select: ['あなたの星と、私の星が重なりました。', 'よろしくお願いします。星の導きを。'],
    },
  },
};

export function pickLine(id: CharId, ev: VoiceEvent, seed = Math.random()): string {
  const arr = CHARACTERS[id].lines[ev];
  return arr[Math.floor(seed * arr.length) % arr.length];
}
