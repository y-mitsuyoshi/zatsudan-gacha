import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: '無料ブラウザゲーム一覧｜社畜・ボード・トランプ・カジノ・物理シミュレーション全49作品',
  description:
    '社畜ゲーム10作品、現代＆定番ボードゲーム18作品、トランプゲーム5作品、カジノゲーム5作品、パーティーゲーム6作品、物理シミュレーションラボ5作品を完全無料で公開中。硝子工房のモザイク師、王宮の密使、天空の植物園、仮面の円卓、蒸気機関の鉄路王、星屑のアトリエ、リバーシ3D、ソリティア、大富豪、テキサスホールデムなどスマホ・PC対応、登録不要。',
  keywords: [
    '無料ブラウザゲーム',
    'ボードゲーム 無料',
    'トランプゲーム 無料',
    '物理シミュレーション',
    '社畜ゲーム',
    'パーティーゲーム',
    'リバーシ 無料',
    'ソリティア 無料',
    '大富豪 無料',
    'スマホ ゲーム',
    '登録不要 ゲーム',
  ],
  alternates: {
    canonical: '/games',
  },
  openGraph: {
    title: '無料ブラウザゲーム一覧｜社畜・ボード・トランプ・カジノ・物理シミュレーション全49作品',
    description:
      '社畜アクション、現代＆古典ボードゲーム18作品、トランプ5作品、ルーレット・バカラ・ビデオポーカーなどカジノ5作品、パーティー6作品、物理シミュレーション5作品まで全49作品を無料公開。',
    url: `${APP_URL}/games`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: '無料ブラウザゲーム一覧' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料ブラウザゲーム一覧｜社畜・ボード・トランプ・カジノ・物理シミュレーション全49作品',
    description:
      '社畜アクション、現代＆古典ボードゲーム18作品、トランプ5作品、ルーレット・バカラ・ビデオポーカーなどカジノ5作品、パーティー6作品、物理シミュレーション5作品まで全49作品を無料公開。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const games = [
  {
    name: '社畜通勤サバイバー',
    href: '/barricade-defense',
    image: '/assets/defense_cover.jpg',
    genre: '3Dゲートシューティング',
    tagline: '満員ラッシュを突破して会社へ',
    description:
      '自動前進＆自動一斉射撃の3D通勤ゲートシューティング。撃って数値を育てる倍率ゲートや段ボール武器チェンジ、同期救出ケージで分隊を強化し、満員電車ボスを突破しよう。全5路線×3難易度＋エンドレス。',
  },
  {
    name: '社畜サバイバー',
    href: '/shachiku-survivor',
    image: '/assets/survivor_cover.jpg',
    genre: '10分ホードサバイバル',
    tagline: '18時まで生き残れ',
    description:
      '迫りくる業務の大群をかわしながら9:00から18:00までの10分間を生き残るホードサバイバル。8武器＋6パッシブ、進化グリモワールによる8種の伝説進化、4ステージ、図鑑・実績・日課を搭載。',
  },
  {
    name: '社畜スパイラル',
    href: '/shachiku-spiral',
    image: '/assets/spiral_cover.jpg',
    genre: 'ナンバー撃破スパイラル防衛',
    tagline: '渦巻く業務列を分断せよ',
    description:
      '中央のコアを守りながら、渦巻き状に迫るHPナンバー付き業務セグメントの列を迎撃・分断する防衛シューティング。弱点節コンボ、属性シナジー強化、全15ウェーブ＋エンドレス。',
  },
  {
    name: '社畜シューティングNEO',
    href: '/shachiku-shooting',
    image: '/assets/shooting_cover.jpg',
    genre: '弾幕シューティング',
    tagline: '定時退社を目指す弾幕STG',
    description:
      '4種のメイン武器＋オプション編隊とハイパーオーバードライブ、コンボ・グレイズで高スコアを狙う本格弾幕シューティング。全6ステージのボス戦＋無限残業ループを収録。',
  },
  {
    name: '社畜すごろくNEO',
    href: '/shachiku-sugoroku',
    image: '/shachiku-sugoroku-ogp.png',
    genre: 'ジオラマ人生ボードゲーム',
    tagline: '選択で変わるキャリアボード',
    description:
      'ルーレットを回して立体ジオラマ風の60マスを進み、10種の職業と選択イベントで自分だけのキャリアを描くボードゲーム。評価ポイントとやる気のバランスが結末を変えます。',
  },
  {
    name: '社畜人狼',
    href: '/shachiku-jinro',
    image: '/assets/jinro_cover.jpg',
    genre: 'AI会社員人狼',
    tagline: 'AI社員と遊べるソロ人狼',
    description:
      '産業スパイ・人事・総務・イエスマンなど会社ならではの役職が入り乱れる、ひとりでもすぐ遊べるAI対戦ソロ人狼ゲーム。会議ログと投票からスパイを見抜こう。',
  },
  {
    name: '社畜ぶっとばし！定時退社カタパルト',
    href: '/shachiku-catapult',
    image: '/assets/defense_cover.jpg',
    genre: 'ぶっとばし飛距離アクション',
    tagline: '18時ジャストの屋上から大空へ',
    description:
      '角度とパワーを決めて本社屋上から定時退社発射！有給ジェットパックと急降下スタンプ、地上のボーナス支給車やエナドリ砲台で加速し、5系統の恒久強化で10,000m先の南国リゾートを目指そう。',
  },
  {
    name: '社畜ワイヤー疾走：終電スイングアクション',
    href: '/shachiku-wire',
    image: '/assets/shooting_cover.jpg',
    genre: 'ワイヤースイング疾走',
    tagline: '振り子スイングで終電に飛び乗れ',
    description:
      '光回線グラップルワイヤーを頭上のアンカーに撃ち込み、振り子物理の遠心力で深夜のビル群を疾走するワンボタンアクション。上昇角で離すPERFECT RELEASEと空中ダッシュで終電を掴め。',
  },
  {
    name: '社畜グラグラ決済タワー：限界ビル建設',
    href: '/shachiku-stack',
    image: '/assets/spiral_cover.jpg',
    genre: 'タイミング高層ビル建設',
    tagline: '揺れるクレーンから100階を目指せ',
    description:
      'クレーンからオフィスフロアをタイミングよく落として超高層ビルを建設！はみ出し部分が切断される「精密スライスモード」と、重心の揺れに挑む「物理バランスモード」の2モードを収録。',
  },
  {
    name: 'マイホーム完済記：35年・50年ローンの家計と暮らし',
    href: '/mortgage-life',
    image: '/assets/mortgage_cover_v2.png',
    genre: '住宅ローン完済ドキュメンタリー',
    tagline: '35年・50年ローンを破産せず返せるか',
    description:
      'SUUMO実勢相場・最新金利対応！タワマン・マンション・一戸建て、単独・ペアローン、変動（5年/125%ルール・未払利息）・固定金利、固定資産税・火災保険・地震保険、定期リフォーム・修繕積立金、昇給カーブ・退職金・定年後バイト、教育費・学資保険まで網羅したリアル人生シミュレーション。',
  },
];

const partyGames = [
  {
    name: '少数派ワード',
    href: '/minority-word',
    mark: 'MINOR',
    cover: 'bg-[#2f5d57]',
    genre: '少数派ワード / 会話ゲーム',
    tagline: '少数派の言葉を見抜け',
    description:
      '全員に似た言葉が配られ、ひとりだけ違う言葉を持つ少数派ワード。1台の端末を回して秘密の言葉を確認し、会話と投票で少数派を見抜く、オンサイト・オフサイト向けの会話ゲームです。',
    party: true,
  },
  {
    name: '以心伝心ゲーム',
    href: '/ishin-denshin',
    mark: 'SYNC',
    cover: 'bg-[#b23a2a]',
    genre: '以心伝心 / チームビルディング',
    tagline: '同じ答えを狙って息を合わせろ',
    description:
      'お題に対して全員が秘密裏に回答し、同じ答えを選んだ人数がそのまま得点になるチームビルディングゲーム。3〜8人で遊べ、チームの共通言語と阿吽の呼吸を可視化します。',
    party: true,
  },
  {
    name: 'NGワード会議',
    href: '/ng-word',
    mark: 'NG',
    cover: 'bg-[#7a5a3a]',
    genre: 'NGワード / 会話ゲーム',
    tagline: '禁句を言わずに会議を乗り切れ',
    description:
      'それぞれに秘密のNGワードが配られた状態で、制限時間内の会議を進行。自分の禁句を言わずに乗り切れるか、それともうっかり口にしてしまうのか。会話の緊張感を楽しむパーティーゲームです。',
    party: true,
  },
  {
    name: '禁句トーク',
    href: '/kinku-talk',
    mark: 'KINKU',
    cover: 'bg-[#4b5d73]',
    genre: '禁句 / チーム対戦',
    tagline: '禁句なしで伝えきれ',
    description:
      'お題の言葉を、3つの禁句を使わずにチームメイトへ説明する禁句トーク。60秒の制限時間内に何枚正解できるかを競う、オンサイトでも盛り上がるチーム対戦ゲームです。',
    party: true,
  },
  {
    name: '社長の頭の中（ランキング予想）',
    href: '/rank-guess',
    mark: 'RANK',
    cover: 'bg-[#2a2a2a]',
    genre: 'ランキング予想 / チームゲーム',
    tagline: '社長の頭の中を読み切れ',
    description:
      'ラウンドごとに1人が「社長」となり、4つの選択肢を秘密裏にランキング。残りのメンバーがその順位を予想し、的中数を競うチームゲーム。社長の価値観とチームの総意を読み解きます。',
    party: true,
  },
  {
    name: '連想リレー',
    href: '/word-chain',
    mark: 'CHAIN',
    cover: 'bg-[#7f2d2d]',
    genre: '連想ゲーム / チームビルディング',
    tagline: '言葉をつないで高得点を狙え',
    description:
      'お題から連想する言葉を全員が秘密裏に回答し、ユニークな答えほど高得点になる連想リレー。みんなの発想の違いと共通点が可視化され、チームの会話が自然に広がります。',
    party: true,
  },
];

const simulationGames = [
  {
    name: '増殖ボール・シミュレーター',
    href: '/ball-multiply',
    tagline: '1個から何秒で10個・50個・100個に増えるかを実測',
    description: 'ピン衝突分裂・×2/×3倍率ゲート・周期スポナーを組み合わせ、倍増時間（Doubling Time）と指数成長〜環境収容力飽和までの推移曲線・ゴルトンボード分布をリアルタイム計測する物理ラボ。',
    cover: 'bg-[#072a2c]',
    genre: '指数増殖・物理シミュレーション',
  },
  {
    name: 'ドミノ・カスケード',
    href: '/domino-cascade',
    tagline: '連鎖伝播速度（個/秒）と角度・エネルギー波形を計測',
    description: '間隔と高さの比率（d/h比）・摩擦・質量を調整し、S字・渦巻き・分岐コースでの連鎖伝播速度と角運動量の伝達推移グラフを観察。ワンクリック即再起立＆自動周回実験に対応。',
    cover: 'bg-[#2b2415]',
    genre: '連鎖波動・物理シミュレーション',
  },
  {
    name: 'サンド・フロー・サンドボックス',
    href: '/sand-flow',
    tagline: '安息角の自動計測・砂時計流量・比重別粒子ラボ',
    description: '砂・微細砂・水流・重金属粒子の4素材と自動ノズル、砂時計くびれ・水車・漏斗プリセットを搭載。堆積山の左右傾斜から安息角（Angle of Repose）をリアルタイム算出します。',
    cover: 'bg-[#0d2017]',
    genre: '粉体力学・粒子シミュレーション',
  },
  {
    name: 'バブル・マージ・ラボ',
    href: '/bubble-merge',
    tagline: '表面張力・オストワルド熟成・粒径ヒストグラム観察',
    description: 'ラプラス圧による気泡合体、大気泡が小気泡を吸収するオストワルド熟成、対流ヒーター、面積保存則モニター、粒径分布ヒストグラムをリアルタイムに観察できる流体・界面物理ラボ。',
    cover: 'bg-[#0a1a2e]',
    genre: '界面物理・流体シミュレーション',
  },
  {
    name: '重力オービット・サンドボックス',
    href: '/gravity-orbit',
    tagline: 'スイングバイ背面命中軌道＆多体万有引力シミュレーター',
    description: '恒星・惑星のドラッグ配置、未来軌道予測ライン、星の背後へ回り込むスイングバイ命中プリセット、扇状11機同時スプレッド発射、速度・距離の時系列テレメトリを搭載した天体力学ラボ。',
    cover: 'bg-[#0a1224]',
    genre: '天体力学・軌道シミュレーション',
  },
];

const boardGames = [
  {
    name: '硝子工房のモザイク師（Stained Glass Mosaic）',
    href: '/stained-glass-mosaic',
    mark: 'GLASS',
    cover: 'bg-[#311042]',
    genre: '色硝子ドラフト＆5×5ステンドグラス窓パズル',
    tagline: '硝子窯から同色タイルを獲得し大聖堂窓を彩れ',
    description:
      '中央の硝子窯と中庭ストックから5色のステンドグラスピースをドラフトし、1〜5段の準備作業台へ配置。完成した作業台から5×5の大聖堂モザイク窓へ嵌め込み、縦横の連鎖点と列完成ボーナスを競う現代ドラフトパズル盤ゲーム。',
  },
  {
    name: '王宮の密使（Royal Courier）',
    href: '/royal-courier',
    mark: 'COURT',
    cover: 'bg-[#4c0519]',
    genre: '16枚デッキ・手札1枚の宮廷心理推理',
    tagline: '1枚引いて1枚出す！相手の役職を読み切れ',
    description:
      '全16枚・8役職（衛兵・占星術師・決闘騎士・修道女・魔導師・枢機卿・女公爵・王女）のマイクロデッキで行う宮廷心理推理カードゲーム。山札・捨て札カウンティング表を駆使してライバルを脱落させ、王宮の封蝋トークンを集めよう。',
  },
  {
    name: '天空の植物園（Sky Botanist）',
    href: '/sky-botanist',
    mark: 'FLORA',
    cover: 'bg-[#064e3b]',
    genre: '3層ビオトープ＆右から左への連鎖エンジン構築',
    tagline: '森林・水辺・天空に幻想植物を植え連鎖を起動せよ',
    description:
      '3つの生息域（森林・水辺・天空）に幻想植物カードを植栽し、列を稼働させるたびに右から左へ「連鎖開花スキル」が次々と発動！霊水・生命の種子・標本カードを増やして四季の生態系評価を競う本格タブロービルド盤ゲーム。',
  },
  {
    name: '仮面の円卓（Totem Bluff）',
    href: '/totem-bluff',
    mark: 'MASK',
    cover: 'bg-[#3f2305]',
    genre: '太陽盤と災厄の仮面の心理ブラフ＆発掘競り',
    tagline: '太陽盤か、それとも災厄の仮面か？度胸試し入札戦',
    description:
      '手元の「太陽の黄金盤3枚」と「災厄の仮面1枚」から1枚ずつ伏せて重ねるか、場から何枚めくれるかを宣言して競り合うブラフゲーム！自分の山をすべてめくってから相手の山へ挑み、2つの太陽冠を先取せよ。',
  },
  {
    name: '蒸気機関の鉄路王（Clockwork Railways）',
    href: '/clockwork-railways',
    mark: 'STEAM',
    cover: 'bg-[#27272a]',
    genre: '機関士ワーカー配置＆蒸気大陸ネットワーク開拓',
    tagline: 'ワーカーを配置し石炭と鋼鉄で大陸に鉄路を敷け',
    description:
      '7大産業施設へ機関士ワーカーを配置して石炭・鋼鉄・金貨を獲得し、蒸気大陸の12都市を結ぶ鉄路リンクを敷設！機関車出力を強化して特急輸送指令書を達成する本格ワーカープレイスメント＆ネットワーク盤ゲーム。',
  },
  {
    name: '星屑のアトリエ（Stellar Atelier）',
    href: '/stellar-atelier',
    mark: 'GEM',
    cover: 'bg-[#1e1b4b]',
    genre: '拡大再生産・宝石錬成エンジンビルド',
    tagline: '星片を集めて恒久割引エンジンを築け',
    description:
      '5色の星片トークンと虹結晶を集めて錬成レシピを開発！開発したレシピが生み出す恒久属性ボーナスで高ランク天球儀を次々とタダ同然で錬成し、星座パトロンを招いて15名声星を競う現代エンジンビルド盤ゲーム。',
  },
  {
    name: '群島開拓記（Archipelago Cartographer）',
    href: '/archipelago-cartographer',
    mark: 'TILE',
    cover: 'bg-[#0f4c5c]',
    genre: '海域タイル配置＆航路ネットワーク開拓',
    tagline: 'タイルを回して航路と群島を繋ぎブイを置け',
    description:
      '毎ターン引いた海域タイルを回転させて9×9の海図へ配置し、珊瑚航路・群島陸地・古代灯台へ測量ブイを派遣。航路や島を完成させて高得点＆ブイ回収を狙う本格タイル配置ボードゲーム。',
  },
  {
    name: '深海サルベージ：酸素限界の遺跡探査',
    href: '/abyssal-salvage',
    mark: 'DIVE',
    cover: 'bg-[#082f49]',
    genre: '深海チキンレース＆リスク確率管理',
    tagline: 'さらに潜るか、母艦へ帰還するか',
    description:
      '5種類の深海ハザードの2枚目がめくれる前に母艦へ引き返すチキンレース！残り山札からの強制浮上（バースト）確率と単独帰還ボーナス期待値をリアルタイム計算しながら3回の潜水で最高スコアを目指そう。',
  },
  {
    name: 'からくりバザール：歯車都市の競売人',
    href: '/automatons-bazaar',
    mark: 'BID',
    cover: 'bg-[#451a03]',
    genre: '同時入札オークション＆バッティング心理戦',
    tagline: '同額入札は無効！1〜10の金貨を使い切れ',
    description:
      '1〜10の使い切り金貨カードで行う同時公開オークション。他プレイヤーと同じ金額を出すと「バッティング無効」になるルールのもと、相手の手札カウンティング表を見ながら名作からくりとセットボーナスを競り落とせ。',
  },
  {
    name: 'サイコロ港町（ダイス・ハーバー）',
    href: '/dice-harbor',
    mark: 'DICE',
    cover: 'bg-[#1d4ed8]',
    genre: 'ダイス連動・街づくり拡大再生産',
    tagline: '誰のターンでも出目で施設が連鎖発動！',
    description:
      'サイコロの出目に応じて全員の一次産業（青）・自分の商業（緑）・通行料徴収（赤）・ギルド（紫）が連鎖発動！1ダイスと2ダイスの期待収益シミュレーターを活用し、4大港湾モニュメントの完成を競う街づくりボードゲーム。',
  },
  {
    name: 'リバーシ（3D / 2D 戦略盤）',
    href: '/reversi',
    mark: '8×8',
    cover: 'bg-[#113826]',
    genre: '3D/2D 挟み反転ボードゲーム',
    tagline: '角と確定石を巡る伝統8×8頭脳戦',
    description:
      'Three.jsによる立体ディスク反転アニメーションと2D盤面をワンクリック切替。合法手・反転枚数プレビュー、形勢評価グラフ、AI 3段階（初級・中級・上級ミニマックス）＆2人対戦に対応。',
  },
  {
    name: '立体四目並べ 3D（4×4×4 空間盤）',
    href: '/qubic-four',
    mark: '4³',
    cover: 'bg-[#1e293b]',
    genre: 'Three.js 立体空間四目並べ',
    tagline: '全76ラインの3次元リーチを読み切れ',
    description:
      '4×4のピンに玉を積み重ねる4×4×4の3次元空間ボードゲーム。ドラッグで立体盤を360度回転でき、平面・垂直・立体対角線の全76ラインのリーチ警告ハイライトとAI 3段階対戦を搭載。',
  },
  {
    name: '五目並べ（15×15 連珠・五目盤）',
    href: '/gomoku',
    mark: '15×15',
    cover: 'bg-[#5c3a1e]',
    genre: '15×15 伝統五目・連珠戦略盤',
    tagline: '活三・四々・禁手を見極める伝統盤',
    description:
      '木目15×15碁盤で遊ぶ本格五目並べ。黒番の三々・四々・長連を判定する「連珠禁手ルール」と「フリースタイル」の切替、脅威ライン検知、AI 3段階対戦＆待った機能に対応。',
  },
  {
    name: 'マンカラ（カラハ・種まき戦略盤）',
    href: '/mancala',
    mark: 'SOW',
    cover: 'bg-[#4a2c18]',
    genre: '古代種まき頭脳ボードゲーム',
    tagline: 'ぴったりゴールで連続手番を掴め',
    description:
      'ポケットから石を取り出して反時計回りに1つずつ種まきする世界最古級の完全情報ボードゲーム。最終石がどのポケットに落ちるかの軌道プレビュー、横取り（キャプチャ）演出、AI対戦を搭載。',
  },
  {
    name: 'チェッカー（ドラフツ 3D / 2D）',
    href: '/checkers',
    mark: 'JUMP',
    cover: 'bg-[#3b1d1d]',
    genre: '3D/2D 斜めジャンプ捕獲盤',
    tagline: '連続ジャンプとキング昇格の連鎖戦術',
    description:
      '8×8盤の黒マスを斜めに進み、相手の駒を飛び越えて捕獲する古典チェッカー。Three.js 3D/2D切替、強制ジャンプ・多段連続ジャンプ経路ハイライト、キング昇格、AI 3段階対戦に対応。',
  },
  {
    name: 'ナイン・メンズ・モリス（古代ローマ三目盤）',
    href: '/nine-mens-morris',
    mark: 'MILL',
    cover: 'bg-[#2c3539]',
    genre: '古代ローマ三目（ミル）戦略盤',
    tagline: '3つの同心四角形と24交点の頭脳戦',
    description:
      '配置・移動・フライング（残り3駒で任意の空き交点へ跳躍）の3フェーズで展開する古代ローマ起源のボードゲーム。縦横3連（ミル）を作るたびに相手駒を1つ除去できる深い戦略性が魅力です。',
  },
  {
    name: 'ヘックス（11×11 六角形接続盤）',
    href: '/hex-board',
    mark: 'HEX',
    cover: 'bg-[#172554]',
    genre: '11×11 トポロジー接続戦略盤',
    tagline: '数学的に引き分けが存在しない接続ゲーム',
    description:
      '数学者ジョン・ナッシュらが考案した11×11六角形グリッド接続ゲーム。2間ブリッジの急所や最短接続コスト（仮想抵抗ネットワーク）を可視化し、初手スワップルール（パイ・ルール）にも対応。',
  },
  {
    name: 'ドット＆ボックス（陣取り線引き盤）',
    href: '/dots-and-boxes',
    mark: 'BOX',
    cover: 'bg-[#144336]',
    genre: '格子線引き・連鎖陣取り盤',
    tagline: '3辺目の罠と長鎖（チェーン）の駆け引き',
    description:
      '格子点の間に線を1本ずつ引き、正方形の4辺目を閉じたプレイヤーが陣地を獲得して連続手番を得る古典頭脳ゲーム。盤面サイズ切替（4×4〜6×6）、3辺リーチ警告表示、ハード手筋AIを搭載。',
  },
];

const cardGames = [
  {
    name: 'ソリティア（クロンダイク）',
    href: '/klondike',
    mark: 'A♠',
    cover: 'bg-[#0f3d28]',
    genre: '定番1人用トランプパズル',
    tagline: '1枚/3枚めくり・オートコンプリート対応',
    description:
      '赤黒交互・降順で場札を並べ替え、AからKまでスート別に組札へ揃える王道クロンダイク。1枚/3枚ドロー切替、無制限アンドゥ、ダブルクリック自動移動、詰みなしディール、ヒント機能を搭載。',
  },
  {
    name: 'ブラックジャック（期待値ナビ付）',
    href: '/blackjack',
    mark: '21',
    cover: 'bg-[#1a162b]',
    genre: 'カジノトランプ＆確率戦略ラボ',
    tagline: 'ベーシックストラテジー最適手をリアルタイム表示',
    description:
      'ヒット・スタンド・ダブルダウン・スプリット・インシュランス完備の本格6デッキ・ブラックジャック。現在の手札とディーラー表カードに対する数学的最適手とバースト確率を常時確認できます。',
  },
  {
    name: 'フリーセル（完全情報トランプ）',
    href: '/freecell',
    mark: 'FREE',
    cover: 'bg-[#163042]',
    genre: '完全情報・思考型ソリティア',
    tagline: '運要素ゼロ！52枚すべてが見える論理パズル',
    description:
      '最初から全52枚が表向きで配られ、4つのフリーセル（一時保管枠）を活用して全てを組札へ収める思考型トランプゲーム。スーパー・ムーブ（複数枚一括移動）自動計算、シード番号選択に対応。',
  },
  {
    name: '大富豪（大貧民・AI 4人対戦）',
    href: '/daifugo',
    mark: '8切',
    cover: 'bg-[#4a1525]',
    genre: 'AI 4人対戦・定番トランプ',
    tagline: '革命・8切り・階段・スペ3返し対応',
    description:
      '個性豊かなAIプレイヤー3人とすぐ遊べる4人対戦大富豪。革命、8切り、ペア・3枚・4枚出し、階段（シークエンス）、スペードの3返し、縛り・都落ちルールのON/OFF設定と階級推移を搭載。',
  },
  {
    name: 'ロイヤル・ナイト・ポーカー（テキサスホールデム）',
    href: '/texas-holdem',
    mark: 'HOLD',
    cover: 'bg-[#2d1b0e]',
    image: '/assets/holdem/key_visual.webp',
    genre: 'アニメキャラ対戦・本格ポーカー',
    tagline: 'カットイン演出・ボイス・ランク戦搭載',
    description:
      '描き下ろしのアニメキャラクター6人と卓を囲むノーリミット・テキサスホールデム。オールイン時のカットイン演出、キャラクターボイス、ジャズBGM、ナイト・トーナメント／1on1デュエル、ランク戦、勝率HUDを搭載。',
  },
];

const casinoGames = [
  {
    name: 'グランド・ルーレット',
    href: '/roulette-casino',
    mark: 'ROULETTE',
    cover: 'bg-[#0d2b22]',
    genre: 'ヨーロピアン・ルーレット',
    tagline: '緑のフェルトと真鍮のホイールで、0〜36に賭ける',
    description:
      'シングルゼロのヨーロピアンルーレット。赤黒・奇数偶数・ハイロー・ダズン・数字へ仮想チップを置き、回転するホイールとボールの着地を楽しめます。配当計算・履歴・ルール・責任ある遊びの注意付き。',
  },
  {
    name: 'バカラ・ロイヤル',
    href: '/baccarat',
    mark: 'BACCARAT',
    cover: 'bg-[#2a1014]',
    genre: 'Punto Banco / カードカジノ',
    tagline: 'プレイヤーか、バンカーか。第三カードの緊張感',
    description:
      'プレイヤー／バンカー／タイに賭ける定番バカラ。標準の第三カードルール、5%コミッション、カード演出、配当、履歴を搭載。仮想チップのみで遊べる無料カジノゲームです。',
  },
  {
    name: 'ビデオポーカー・ラウンジ',
    href: '/video-poker',
    mark: 'VIDEO POKER',
    cover: 'bg-[#16132a]',
    genre: 'Jacks or Better / ビデオポーカー',
    tagline: '5枚を交換して、役を完成させろ',
    description:
      'ジャックス・オア・ベターの5カードドロー。ベット1〜5、ホールド／ドロー、配当表、履歴、ルールを搭載したラウンジ風ビデオポーカー。仮想クレジットのみで遊べます。',
  },
  {
    name: 'ダイス・カジノ',
    href: '/dice-casino',
    mark: 'SIC BO',
    cover: 'bg-[#26180d]',
    genre: '三ダイス・カジノ',
    tagline: '3つのダイスの目に、ビッグ／スモールから一点賭けまで',
    description:
      '3個のダイスで遊ぶシックボー風カジノ。ビッグ／スモール、奇数／偶数、合計値、ゾロ目などに仮想チップを賭け、配当と履歴を確認できます。',
  },
  {
    name: 'ケノ・ラウンジ',
    href: '/keno-lounge',
    mark: 'KENO',
    cover: 'bg-[#131d2c]',
    genre: 'ナンバーズ・カジノ',
    tagline: '1〜80から数字を選び、20球の抽選を待つ',
    description:
      '1〜80から最大10個の数字を選び、20個の当選番号を抽選するケノ。ヒット数に応じた配当表、ベット、履歴、ルールを備えたラウンジ風カジノゲームです。',
  },
];

const creativeTools = [
  { name: '推し活プロフィールメーカー', href: '/profile-maker', description: '推し紹介カードを無料作成' },
  { name: '異世界転生ステータスカード', href: '/isekai-status', description: '5つの質問で異世界キャラ診断' },
  { name: '究極の言い訳ジェネレーター', href: '/excuse-generator', description: 'AIが面白い言い訳を生成' },
  { name: '駅名標メーカー', href: '/station-sign-maker', description: 'オリジナル駅名看板を作成' },
];

const faqs = [
  { q: '紹介している49のゲーム・シミュレーターはすべて無料ですか？', a: 'はい。社畜ゲーム10作品、現代＆定番ボードゲーム18作品、トランプゲーム5作品、カジノゲーム5作品、パーティーゲーム6作品、物理シミュレーション5作品の全49作品をブラウザで開くだけで完全無料で遊べます。インストールや会員登録、課金は一切不要です。' },
  { q: 'スマートフォンでもPCでも遊べますか？', a: 'はい。各ゲームはスマートフォンのタッチ操作と、PCのマウス・キーボード操作の両方に最適化されています。' },
  { q: 'ボードゲームやトランプゲームは1人でも遊べますか？', a: 'はい。現代ボードゲーム10作品（硝子工房のモザイク師・王宮の密使・天空の植物園・仮面の円卓・蒸気機関の鉄路王・星屑のアトリエ・群島開拓記・深海サルベージ・からくりバザール・サイコロ港町）および定番ボードゲーム8作品はすべてAI対戦とローカル対戦に対応しています。トランプ5作品もすべて1人で今すぐ遊べます。' },
  { q: '会社のオンサイト・オフサイトで使えるゲームはどれですか？', a: '「少数派ワード」「以心伝心ゲーム」「NGワード会議」「禁句トーク」「ランキング予想」「連想リレー」がおすすめです。1台の端末を回して遊べるため、懇親会や研修のアイスブレイクにも使えます。' },
  { q: '物理シミュレーション5作品はゲームですか？', a: 'スコアを競うゲームではなく、倍増時間や重力スイングバイ軌道、連鎖伝播速度、安息角、気泡合体などを定量グラフとプリセットで観察・実験できる物理シミュレーションラボです。' },
];

const allGames = [...games, ...boardGames, ...cardGames, ...casinoGames, ...partyGames, ...simulationGames];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '無料ブラウザゲーム一覧｜社畜・ボード・トランプ・カジノ・物理シミュレーション全49作品',
    description: '社畜ゲーム10作品、現代＆定番ボードゲーム18作品、トランプゲーム5作品、カジノゲーム5作品、パーティーゲーム6作品、物理シミュレーション5作品をまとめた無料ブラウザゲーム一覧。',
    url: `${APP_URL}/games`,
    inLanguage: 'ja-JP',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allGames.length,
      itemListElement: allGames.map((game, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: game.name,
        url: `${APP_URL}${game.href}`,
      })),
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '雑談テーマガチャ', item: `${APP_URL}/` },
      { '@type': 'ListItem', position: 2, name: '無料ゲーム一覧', item: `${APP_URL}/games` },
    ],
  },
];

export default function GamesPage() {
  return (
    <main className="paper-page min-h-screen">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <Link href="/" className="font-label text-[10px] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
            ← 雑談テーマガチャ
          </Link>
          <ThemeToggleButton />
        </header>

        <nav aria-label="パンくずリスト" className="mt-4 font-label text-[9px] text-[var(--ink-soft)]">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:text-[var(--accent)]">雑談テーマガチャ</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">無料ゲーム一覧</li>
          </ol>
        </nav>

        <section className="grid gap-8 py-10 lg:grid-cols-[1fr_0.45fr] lg:items-end">
          <div>
            <p className="paper-kicker">Game Archive / 49 Titles</p>
            <h1 className="font-editorial mt-3 text-4xl leading-tight sm:text-5xl">
              無料で遊べる<br className="sm:hidden" />ゲーム一覧
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              社畜アクション＆人生シミュレーション10作品、現代＆古典ボードゲーム18作品、定番トランプ5作品、カジノ5作品、パーティー6作品、物理シミュレーションラボ5作品の全49作品を収録。
              すべて完全オリジナル実装・インストール不要で、PCでもスマートフォンでも今すぐ遊べます。
            </p>
          </div>
          <div className="border-l border-[var(--line)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-label text-[9px] text-[var(--accent)]">Category Jump</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <a href="#game-list-heading" className="underline hover:text-[var(--accent)]">社畜ゲーム(10)</a>
              <span>・</span>
              <a href="#board-games" className="underline hover:text-[var(--accent)]">ボードゲーム(18)</a>
              <span>・</span>
              <a href="#card-games" className="underline hover:text-[var(--accent)]">トランプ(5)</a>
              <span>・</span>
              <a href="#party-games" className="underline hover:text-[var(--accent)]">パーティー(6)</a>
              <span>・</span>
              <a href="#simulation-games" className="underline hover:text-[var(--accent)]">物理ラボ(5)</a>
            </div>
          </div>
        </section>

        <section aria-labelledby="game-list-heading">
          <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
            <h2 id="game-list-heading" className="font-editorial text-2xl">社畜ゲーム（10作品）</h2>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 10</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex flex-col border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b border-[var(--line)] bg-[#1d1914]">
                  <Image
                    src={game.image}
                    alt={`${game.name}のカバー画像`}
                    width={800}
                    height={447}
                    className="h-full w-full object-cover grayscale-[0.15] saturate-75 transition duration-500 group-hover:scale-[1.03] group-hover:saturate-100"
                  />
                  <span className="font-label absolute left-3 top-3 bg-[#12100d]/85 px-2 py-1 text-[9px] text-[#f2e9d8]">
                    {String(index + 1).padStart(2, '0')} / {game.genre}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-label text-[9px] text-[var(--accent)]">{game.tagline}</p>
                  <h3 className="font-editorial mt-2 text-xl leading-snug">{game.name}</h3>
                  <p className="mt-2 flex-1 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex items-center gap-2 text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
                    Play <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="board-games" className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="board-games-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">MODERN EURO &amp; CLASSIC BOARD GAMES</p>
              <h2 id="board-games-heading" className="font-editorial mt-2 text-2xl">現代ボードゲーム＆定番頭脳盤（18作品）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 18</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            色硝子ドラフトパズル、16枚宮廷心理推理、3層ビオトープ連鎖エンジン、太陽盤ブラフ競り、蒸気鉄路ワーカー配置、星片錬成エンジン、海域タイル配置、深海チキンレース、同時入札オークション、ダイス街づくりの現代ボードゲーム10作品と、Three.js 3D/2D対応の古典・数学ボードゲーム8作品を収録。すべてAI対戦＆ローカル対戦・BGM＆効果音に対応しています。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {boardGames.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex flex-col border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-[var(--line)] ${game.cover}`}>
                  <span className="font-editorial text-3xl tracking-tight text-[#fffaf0] sm:text-4xl">{game.mark}</span>
                  <span className="font-label absolute left-3 top-3 bg-[#12100d]/70 px-2 py-1 text-[9px] text-[#f2e9d8]">
                    {String(index + 1).padStart(2, '0')} / BOARD
                  </span>
                  <span className="font-label absolute bottom-3 right-3 text-[8px] text-[#fffaf0]/70">AI &amp; 2P</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-label text-[9px] text-[var(--accent)]">{game.genre}</p>
                  <h3 className="font-editorial mt-2 text-lg leading-snug">{game.name}</h3>
                  <p className="mt-1 text-xs font-bold text-[var(--ink)]">{game.tagline}</p>
                  <p className="mt-2 flex-1 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex items-center gap-2 text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
                    Play board game <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="card-games" className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="card-games-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">CLASSIC PLAYING CARDS</p>
              <h2 id="card-games-heading" className="font-editorial mt-2 text-2xl">定番トランプゲーム（5作品）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 05</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            1人でじっくり思考するソリティア・フリーセルから、ベーシックストラテジー期待値ナビ付きブラックジャック、AI 4人対戦の大富豪・テキサスホールデムまで収録。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cardGames.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex flex-col border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-[var(--line)] ${game.cover}`}>
                  {'image' in game && game.image ? (
                    <>
                      <Image
                        src={game.image}
                        alt={`${game.name}のキービジュアル`}
                        width={800}
                        height={450}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-[#090604]/75 via-transparent to-transparent" />
                      <span className="font-editorial absolute bottom-3 left-3 text-xl tracking-tight text-[#fffaf0] drop-shadow">{game.mark}</span>
                    </>
                  ) : (
                    <span className="font-editorial text-4xl tracking-tight text-[#fffaf0] sm:text-5xl">{game.mark}</span>
                  )}
                  <span className="font-label absolute left-3 top-3 bg-[#12100d]/70 px-2 py-1 text-[9px] text-[#f2e9d8]">
                    {String(index + 1).padStart(2, '0')} / CARDS
                  </span>
                  <span className="font-label absolute bottom-3 right-3 text-[8px] text-[#fffaf0]/70">52 DECK</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-label text-[9px] text-[var(--accent)]">{game.genre}</p>
                  <h3 className="font-editorial mt-2 text-xl leading-snug">{game.name}</h3>
                  <p className="mt-1 text-xs font-bold text-[var(--ink)]">{game.tagline}</p>
                  <p className="mt-2 flex-1 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex items-center gap-2 text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
                    Play card game <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="party-games" className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="party-games-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">Play Together</p>
              <h2 id="party-games-heading" className="font-editorial mt-2 text-2xl">みんなで遊ぶパーティーゲーム（6作品）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 06</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            1台の端末を回して遊ぶ、オンサイト・オフサイト向けの会話ゲーム。懇親会、研修、チームビルディングのアイスブレイクに使えます。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partyGames.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex flex-col border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-[var(--line)] ${game.cover}`}>
                  <span className="font-editorial text-4xl tracking-tight text-[#fffaf0] sm:text-5xl">{game.mark}</span>
                  <span className="font-label absolute left-3 top-3 bg-[#12100d]/70 px-2 py-1 text-[9px] text-[#f2e9d8]">
                    {String(index + 1).padStart(2, '0')} / PARTY
                  </span>
                  <span className="font-label absolute bottom-3 right-3 text-[8px] text-[#fffaf0]/70">1 DEVICE</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-label text-[9px] text-[var(--accent)]">{game.genre}</p>
                  <h3 className="font-editorial mt-2 text-xl leading-snug">{game.name}</h3>
                  <p className="mt-1 text-xs font-bold text-[var(--ink)]">{game.tagline}</p>
                  <p className="mt-2 flex-1 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex items-center gap-2 text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
                    Play together <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="casino-games" className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="casino-games-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="paper-kicker">CASINO LOUNGE</p>
              <h2 id="casino-games-heading" className="font-editorial mt-2 text-2xl">カジノラウンジ（5作品）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 05</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            ルーレット、バカラ、ビデオポーカー、ダイス、ケノ。すべて仮想チップで遊べる無料カジノゲームです。実際のお金は使いません。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {casinoGames.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group flex flex-col border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-[var(--line)] ${game.cover}`}>
                  <span className="font-editorial text-2xl tracking-tight text-[#fffaf0] sm:text-3xl">{game.mark}</span>
                  <span className="font-label absolute left-3 top-3 bg-[#12100d]/75 px-2 py-1 text-[9px] text-[#f2e9d8]">
                    {String(index + 1).padStart(2, '0')} / CASINO
                  </span>
                  <span className="font-label absolute bottom-3 right-3 text-[8px] text-[#fffaf0]/70">CHIP ONLY</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-label text-[9px] text-[var(--accent)]">{game.genre}</p>
                  <h3 className="font-editorial mt-2 text-xl leading-snug">{game.name}</h3>
                  <p className="mt-1 text-xs font-bold text-[var(--ink)]">{game.tagline}</p>
                  <p className="mt-2 flex-1 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex items-center gap-2 text-[9px] text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]">
                    Play casino <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="simulation-games" className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="simulation-games-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="paper-kicker">PHYSICS &amp; SIMULATION</p>
              <h2 id="simulation-games-heading" className="font-editorial mt-2 text-2xl">眺めて気持ちいいシミュレーションラボ（5作品）</h2>
            </div>
            <span className="font-label text-[9px] text-[var(--ink-soft)]">01 — 05</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            ボールの増殖、ドミノの連鎖、落下する砂、泡の合体、重力軌道まで。パラメータを調整して挙動を観察できる物理シミュレーションを集めました。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {simulationGames.map((game, index) => (
              <Link
                key={game.href}
                href={game.href}
                className="group overflow-hidden border border-[var(--line)] bg-[var(--paper-strong)] transition-colors hover:border-[var(--accent)]"
              >
                <div className={`relative h-28 ${game.cover} p-4 text-white`}>
                  <span className="font-label text-[9px] text-white/60">{String(index + 1).padStart(2, '0')} / SIM</span>
                  <p className="font-editorial absolute bottom-3 left-4 text-xl leading-tight">{game.name}</p>
                </div>
                <div className="p-4">
                  <p className="font-label text-[9px] text-[var(--ink-soft)]">{game.genre}</p>
                  <p className="mt-1 text-sm font-bold">{game.tagline}</p>
                  <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{game.description}</p>
                  <span className="font-label mt-4 inline-flex text-[9px] text-[var(--accent)]">Play simulation →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--line)] pt-6" aria-labelledby="tools-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="paper-kicker">Creative Tools</p>
              <h2 id="tools-heading" className="font-editorial mt-2 text-2xl">作って遊べるクリエイティブツール</h2>
            </div>
            <Link href="/tools" className="font-label text-[9px] text-[var(--accent)] hover:underline">
              全49ツールを見る →
            </Link>
          </div>
          <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
            {creativeTools.map((tool, index) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex items-baseline gap-3 border-b border-dashed border-[var(--line)] py-3"
              >
                <span className="font-label w-5 text-[9px] text-[var(--ink-soft)]">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold transition-colors group-hover:text-[var(--accent)]">{tool.name}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--ink-soft)]">{tool.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <SeoContentSection
          eyebrow="GAME GUIDE"
          title="49の無料ブラウザゲーム・カジノ・物理シミュレーション"
          intro="1分で遊べる社畜アクションから、現代＆古典ボードゲーム18作品、定番トランプ5作品、ルーレット・バカラ・ビデオポーカーなどのカジノ5作品、パーティーゲーム、物理シミュレーションラボまで。気になるタイトルを選んでください。"
          faqs={faqs}
          related={[
            { href: '/tools', label: '無料ツール一覧', description: '実用・統計・地図・クリエイティブの全49ツール' },
            { href: '/guides', label: 'シーン別・雑談ガイド', description: '会議や1on1の話題を探す' },
          ]}
        />
      </div>
    </main>
  );
}
