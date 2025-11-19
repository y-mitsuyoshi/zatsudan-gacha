import { Job, Item, BoardSquare, GameState, SetupFormState } from '@/types/sugoroku';
import { audioManager } from '@/utils/audio';

// --- Master Data ---

export const JOBS: Job[] = ['営業', 'エンジニア', 'デザイナー', '企画・マーケティング', '人事・総務', '経理・財務', '法務・コンプラ', '広報・PR', '品質保証', '総合職'];

export const ITEMS: { [id: string]: Item } = {
  'energy-drink': {
    id: 'energy-drink',
    name: '栄養ドリンク',
    description: '次のサイコロの目が+1~3ランダムで増える。',
  },
  'paid-leave': {
    id: 'paid-leave',
    name: '有給休暇申請書',
    description: '「1回休み」を1度だけ無効化できる。',
  },
};

const BOARD_SIZE = 60;
export const GAME_BOARD: BoardSquare[] = [
    { position: 0, type: 'start', title: 'スタート', description: '社畜すごろくの始まり。', effect: null, icon: '🏁' },
    { position: 1, type: 'event', title: '月曜朝からやる気でない', description: 'やる気が15下がる。', effect: { type: 'yaruki', value: -15 }, icon: '📉' },
    { position: 2, type: 'event', title: '電車遅延', description: 'ギリギリセーフ！しかしやる気が10下がる。', effect: { type: 'yaruki', value: -10 }, icon: '🚃' },
    { position: 3, type: 'item', title: '備品室で発見', description: '栄養ドリンクを手に入れた。', effect: { type: 'item', value: 'energy-drink' }, icon: '🥤' },
    { position: 4, type: 'event', title: '退勤直前の"ちょっといい？"', description: '2マス戻る。', effect: { type: 'move', value: -2 }, icon: '👹' },
    { position: 5, type: 'job-specific', title: '職業イベント', description: '職業によって運命が変わる…', effect: null, icon: '🎲' },
    { position: 6, type: 'salary', title: '給料日', description: 'やる気が20回復！', effect: { type: 'yaruki', value: 20 }, icon: '💰' },
    { position: 7, type: 'event', title: 'ランチで入った店が大当たり！', description: 'やる気が10回復！', effect: { type: 'yaruki', value: 10 }, icon: '🍱' },
    { position: 8, type: 'event', title: 'PCフリーズ', description: 'データは無事だったが、やる気が10下がり、1マス戻る。', effect: { type: 'move', value: -1 }, icon: '💻' },
    { position: 9, type: 'event', title: '理不尽な修正依頼', description: 'デザイナーは2回休み。他は1回休み。', effect: { type: 'job-specific', value: 'designer-hell' }, icon: '🤯' },
    { position: 10, type: 'event', title: '残業連続', description: '異常な残業でやる気が20下がり、1回休み。', effect: { type: 'yaruki', value: -20 }, icon: '🏢' },
    { position: 11, type: 'item', title: '先輩からの差し入れ', description: '有給休暇申請書を手に入れた。', effect: { type: 'item', value: 'paid-leave' }, icon: '🎁' },
    { position: 12, type: 'event', title: 'システム障害発生', description: 'エンジニアはやる気10UP。他はやる気10DOWN。', effect: { type: 'job-specific', value: 'system-error' }, icon: '⚠️' },
    { position: 13, type: 'event', title: '無意味な定例会議', description: '企画・マーケは1回休み。他はやる気5DOWN。', effect: { type: 'job-specific', value: 'useless-meeting' }, icon: '💤' },
    { position: 14, type: 'normal', title: '定時退社', description: '今日もお疲れ様でした。', effect: null, icon: '🏠' },
    { position: 15, type: 'salary', title: '給料日', description: 'やる気が20回復！', effect: { type: 'yaruki', value: 20 }, icon: '💰' },
    { position: 16, type: 'event', title: '競合にコンペで勝利！', description: '営業は5マス進む。他は1マス進む。', effect: { type: 'job-specific', value: 'sales-win' }, icon: '🏆' },
    { position: 17, type: 'event', title: 'SNSで企画がバズる！', description: '企画・マーケは5マス進む。他はやる気10UP。', effect: { type: 'job-specific', value: 'viral-hit' }, icon: '📱' },
    { position: 18, type: 'event', title: 'クリエイティブなひらめき', description: 'デザイナーは3マス進む。', effect: { type: 'job-specific', value: 'creative-spark' }, icon: '💡' },
    { position: 19, type: 'event', title: '動くはずのコードが動かない', description: 'エンジニアは1回休み。', effect: { type: 'job-specific', value: 'code-bug' }, icon: '🐛' },
    { position: 20, type: 'normal', title: '有給休暇', description: '心と体をリフレッシュ。', effect: null, icon: '🏖️' },
    { position: 21, type: 'event', title: '飲み会', description: 'やる気が5上がるが、次のターンは1マスしか進めない。', effect: { type: 'yaruki', value: 5 }, icon: '🍺' },
    { position: 22, type: 'event', title: '上司の無茶振り', description: 'やる気が25下がる。', effect: { type: 'yaruki', value: -25 }, icon: '💢' },
    { position: 23, type: 'normal', title: '穏やかな一日', description: '集中して業務ができた。', effect: null, icon: '🍵' },
    { position: 24, type: 'item', title: '謎のメモ', description: '「有給休暇申請書」を手に入れた', effect: { type: 'item', value: 'paid-leave' }, icon: '📝' },
    { position: 25, type: 'event', title: 'プロジェクト完了！', description: '大きな達成感！3マス進む。', effect: { type: 'move', value: 3 }, icon: '🎊' },
    { position: 26, type: 'event', title: '総合職の活躍', description: '総合職は2マス進む＋やる気5UP。他は1マス進む。', effect: { type: 'job-specific', value: 'multi-task' }, icon: '🦸' },
    { position: 27, type: 'event', title: 'サーバーダウン', description: 'エンジニア以外は2マス戻る。', effect: { type: 'job-specific', value: 'server-down' }, icon: '🔌' },
    { position: 28, type: 'event', title: '接待', description: '営業はやる気10UP。他はやる気10DOWN。', effect: { type: 'job-specific', value: 'settai' }, icon: '🍶' },
    { position: 29, type: 'event', title: '新人研修の講師', description: '人事・総務は3マス進む。他はやる気5UP。', effect: { type: 'job-specific', value: 'training-instructor' }, icon: '👨‍🏫' },
    { position: 30, type: 'normal', title: '中間地点', description: '折り返し地点！まだまだ先は長い…', effect: null, icon: '🚩' },
    { position: 31, type: 'event', title: '月末の売上締め', description: '経理・財務は2回休み。営業はやる気10UP。', effect: { type: 'job-specific', value: 'month-end' }, icon: '🗓️' },
    { position: 32, type: 'event', title: '健康診断で再検査', description: '心配になってやる気が10下がる。', effect: { type: 'yaruki', value: -10 }, icon: '🏥' },
    { position: 33, type: 'event', title: '採用面接の担当', description: '人事・総務はやる気15UP。他は1マス進む。', effect: { type: 'job-specific', value: 'interview-duty' }, icon: '👔' },
    { position: 34, type: 'event', title: '経費精算の山', description: '経理・財務は1回休み。他はやる気5DOWN。', effect: { type: 'job-specific', value: 'expense-hell' }, icon: '🧾' },
    { position: 35, type: 'salary', title: '給料日', description: 'やる気が20回復！', effect: { type: 'yaruki', value: 20 }, icon: '💰' },
    { position: 36, type: 'event', title: 'デザインコンペ入賞', description: 'デザイナーは4マス進む。他はやる気5UP。', effect: { type: 'job-specific', value: 'design-award' }, icon: '🎖️' },
    { position: 37, type: 'event', title: '社内システム障害', description: 'エンジニアは3回休み。他は2マス戻る。', effect: { type: 'job-specific', value: 'major-system-failure' }, icon: '💥' },
    { position: 38, type: 'event', title: '忘年会の幹事', description: '人事・総務以外は2マス戻る。', effect: { type: 'job-specific', value: 'party-organizer' }, icon: '🍻' },
    { position: 39, type: 'normal', title: '平和な午後', description: 'コーヒーブレイクでリフレッシュ。', effect: null, icon: '☕' },
    { position: 40, type: 'event', title: '予算会議', description: '経理・財務は2マス進む。企画・マーケは1回休み。', effect: { type: 'job-specific', value: 'budget-meeting' }, icon: '📊' },
    { position: 41, type: 'event', title: '大型案件受注', description: '営業は6マス進む！他は2マス進む。', effect: { type: 'job-specific', value: 'big-deal' }, icon: '🤝' },
    { position: 42, type: 'event', title: 'ウイルス感染', description: 'エンジニア以外は1回休み。', effect: { type: 'job-specific', value: 'virus-infection' }, icon: '🦠' },
    { position: 43, type: 'normal', title: '残業なしの日', description: '早く帰れてラッキー！', effect: null, icon: '🌇' },
    { position: 44, type: 'event', title: '人事評価面談', description: '人事・総務は1マス進む。他はやる気5DOWN。', effect: { type: 'job-specific', value: 'performance-review' }, icon: '📝' },
    { position: 45, type: 'salary', title: '給料日', description: 'やる気が30回復！', effect: { type: 'yaruki', value: 30 }, icon: '💰' },
    { position: 46, type: 'event', title: '決算処理', description: '経理・財務は3回休み。他は1マス戻る。', effect: { type: 'job-specific', value: 'financial-closing' }, icon: '💹' },
    { position: 47, type: 'event', title: 'コンプライアンス監査', description: '法務・コンプラは3マス進む。他はやる気5DOWN。', effect: { type: 'job-specific', value: 'legal-compliance' }, icon: '⚖️' },
    { position: 48, type: 'event', title: 'メディア対応', description: '広報・PRは4マス進む。他は緊張でやる気5DOWN。', effect: { type: 'job-specific', value: 'pr-campaign' }, icon: '📢' },
    { position: 49, type: 'event', title: '品質検査', description: '品質保証は2マス進む。他は1回休み。', effect: { type: 'job-specific', value: 'quality-issue' }, icon: '🔍' },
    { position: 50, type: 'event', title: '誤送信メール', description: 'ヒヤッとしてやる気が5下がる。', effect: { type: 'yaruki', value: -5 }, icon: '📧' },
    { position: 51, type: 'normal', title: 'お菓子休憩', description: '糖分補給でリフレッシュ。', effect: null, icon: '🍩' },
    { position: 52, type: 'event', title: '海外出張', description: '大変だが経験になる。2マス進む。', effect: { type: 'move', value: 2 }, icon: '✈️' },
    { position: 53, type: 'event', title: '仮眠', description: '少し寝てスッキリ。やる気が10回復！', effect: { type: 'yaruki', value: 10 }, icon: '🔋' },
    { position: 54, type: 'event', title: 'プリンター紙詰まり', description: 'イライラして1マス戻る。', effect: { type: 'move', value: -1 }, icon: '📠' },
    { position: 55, type: 'salary', title: 'ボーナス査定', description: '期待が高まる！やる気が20回復！', effect: { type: 'yaruki', value: 20 }, icon: '💴' },
    { position: 56, type: 'event', title: '社内の噂話', description: '聞いてはいけないことを聞いてしまった…やる気5DOWN。', effect: { type: 'yaruki', value: -5 }, icon: '🗣️' },
    { position: 57, type: 'event', title: '社長賞受賞', description: 'まさかの受賞！3マス進む！', effect: { type: 'move', value: 3 }, icon: '🌟' },
    { position: 58, type: 'event', title: '大掃除', description: '腰が痛い…1回休み。', effect: { type: 'rest', value: 1 }, icon: '🧹' },
    { position: 59, type: 'event', title: '最終プレゼン', description: 'ラストスパート！やる気が10UP！', effect: { type: 'yaruki', value: 10 }, icon: '🎤' },
    { position: 60, type: 'goal', title: 'ゴール！', description: 'ボーナス支給日！おめでとう！', effect: null, icon: '🎊' },
];


// --- Achievements & Endings ---

const ACHIEVEMENTS = {
  'super-fast': { name: '超高速PDCA', description: '5ターン以内にゴールする。' },
  'no-rest': { name: '皆勤賞', description: '一度も休まずにゴールする。' },
  'monday-hater': { name: '月曜撲滅委員会', description: '「月曜朝から…」マスに3回以上止まる。' },
  'yaruki-master': { name: 'やる気の支配者', description: 'やる気を100に保ったままゴールする。' },
  'yaruki-zero': { name: '燃え尽き症候群', description: 'やる気がゼロになって1回以上休む。' },
};

const ENDINGS = {
    'legendary': { title: '伝説の社員', description: '完璧なパフォーマンスと高いやる気で、会社の歴史に名を刻む伝説の社員となった。' },
    'promotion': { title: '昇進昇格', description: '優秀な成績が認められ、管理職への昇進が決定した。' },
    'mentor': { title: '頼れる先輩', description: '後輩からの信頼も厚く、社内の模範となる存在として活躍した。' },
    'specialist': { title: '専門職のエキスパート', description: '専門分野での深い知識と経験を積み、その道のプロフェッショナルとなった。' },
    'innovator': { title: 'イノベーター', description: '新しいアイデアと創造力で、会社に革新をもたらした。' },
    'ace': { title: '営業エース', description: '驚異的な営業成績を残し、社内で「エース」と呼ばれるようになった。' },
    'creator': { title: 'クリエイティブ・ディレクター', description: '独創性豊かな作品で業界に名を轟かせ、クリエイターとして成功した。' },
    'leader': { title: 'リーダーシップ賞', description: '優れたリーダーシップでチームを牽引し、多くの成果を生み出した。' },
    'stable': { title: '安定サラリーマン', description: '大きな波乱もなく、着実に仕事をこなす模範的な社員として過ごした。' },
    'balanced': { title: 'ワークライフバランス', description: '仕事とプライベートのバランスを保ち、充実した社会人生活を送った。' },
    'diligent': { title: '勤勉な働き者', description: '真面目にコツコツと仕事に取り組み、周囲から信頼される社員となった。' },
    'team-player': { title: 'チームプレイヤー', description: 'チームワークを大切にし、みんなで協力して目標を達成した。' },
    'steady': { title: '堅実な歩み', description: '派手さはないが、確実に成果を積み重ねる堅実な社員として評価された。' },
    'consistent': { title: '一貫性のある成果', description: '安定したパフォーマンスで、長期にわたって会社に貢献した。' },
    'reliable': { title: '信頼できる仲間', description: '困った時に頼りにされる、信頼性の高い社員として活躍した。' },
    'average': { title: '平凡な社畜', description: '特別なことはないが、普通の社畜として日々を過ごした。' },
    'survivor': { title: 'サバイバー', description: '様々な困難を乗り越え、なんとか生き残った社畜ライフだった。' },
    'mediocre': { title: '可もなく不可もなく', description: '特に目立つこともなく、平凡な社会人生活を送った。' },
    'routine': { title: 'ルーティンワーカー', description: '決められた業務を淡々とこなす、典型的な会社員として過ごした。' },
    'ordinary': { title: '普通のサラリーマン', description: 'ごく普通の会社員として、ごく普通の毎日を過ごした。' },
    'burnout': { title: '燃え尽き症候群', description: '過度なストレスと疲労により、完全に燃え尽きてしまった。' },
    'dropout': { title: '脱落者', description: '激しい競争についていけず、途中で脱落してしまった。' },
    'overwork': { title: '過労による退場', description: '過労が原因で体調を崩し、やむなく退職することになった。' },
    'mental-break': { title: 'メンタルブレイク', description: '精神的な負担に耐えきれず、心が折れてしまった。' },
    'stress-victim': { title: 'ストレス被害者', description: '職場のストレスに押し潰され、心身ともにボロボロになった。' },
    'exhausted': { title: '完全燃焼', description: '全てを出し切って完全に疲れ果て、もう何も残っていない状態になった。' },
    'breakdown': { title: '心身の限界', description: '心と体の限界を超えてしまい、回復に長い時間が必要になった。' },
    'resignation': { title: '無気力退職', description: 'やる気を完全に失い、無気力状態のまま退職に至った。' },
    'collapse': { title: '完全崩壊', description: '全てが崩れ去り、再起不能な状態まで追い込まれてしまった。' },
    'defeat': { title: '敗北者', description: '社畜レースに完全に敗北し、惨めな結末を迎えることになった。' },
    'freelance': { title: 'フリーランス転身', description: '会社を辞めて独立し、自由な働き方を手に入れた。' },
    'entrepreneur': { title: '起業家', description: '自らの会社を立ち上げ、社長として新たな道を歩み始めた。' },
    'global': { title: '海外移住', description: '日本を飛び出し、海外で新たなキャリアをスタートさせた。' },
    'investor': { title: '投資家', description: '蓄えた資産を元手に投資家となり、悠々自適な生活を送ることになった。' },
    'influencer': { title: 'インフルエンサー', description: 'SNSでの発信力が注目され、インフルエンサーとして生きていくことになった。' },
    'farmer': { title: '農業従事者', description: '都会の喧騒を離れ、自然と共に生きる道を選んだ。' },
    'writer': { title: '作家デビュー', description: '社畜生活の経験を綴った本が大ヒットし、作家としてデビューした。' }
};

const ACHIEVEMENT_STORAGE_KEY = 'shachiku-sugoroku-achievements';

// --- LocalStorage Utilities ---
const loadAchievementsFromStorage = (): string[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

const saveAchievementsToStorage = (achievements: string[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(achievements));
};


// --- Initial State ---

export const INITIAL_GAME_STATE: GameState = {
  playerName: '',
  job: '営業',
  position: 0,
  yaruki: 100,
  items: [],
  turn: 0,
  isFinished: false,
  gameMessage: 'ゲームを開始してください。',
  unlockedAchievements: [],
  newlyUnlockedAchievements: [],
  isResting: 0,
  path: [0],
  landedOnCounts: { 0: 1 },
  ending: null,
};

// --- Game Functions ---

export function createNewGame(formState: SetupFormState): GameState {
  const savedAchievements = loadAchievementsFromStorage();
  return {
    ...INITIAL_GAME_STATE,
    playerName: formState.name,
    job: formState.job,
    gameMessage: `${formState.name} (${formState.job}) の社畜ライフが今、始まる…！`,
    unlockedAchievements: savedAchievements,
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function applySquareEffect(state: GameState, square: BoardSquare): GameState {
  let newState = { ...state };
  const effect = square.effect;

  if (!effect) {
    newState.gameMessage = square.description;
    return newState;
  }

  let message = square.description;

  switch (effect.type) {
    case 'yaruki':
      if (typeof effect.value === 'number') {
        newState.yaruki = Math.max(0, Math.min(100, newState.yaruki + effect.value));
        // 残業連続イベント（position 10）の場合は追加で1回休み
        if (square.position === 10 && effect.value < 0) {
          newState.isResting += 1;
          message += ' 疲労で1回休み。';
        }
      }
      break;
    case 'move':
      if (typeof effect.value === 'number') {
        // Instead of setting position directly, add to pendingMoves
        newState.pendingMoves = (newState.pendingMoves || 0) + effect.value;
      }
      break;
    case 'rest':
      if (typeof effect.value === 'number') {
        newState.isResting += effect.value;
      }
      break;
    case 'item':
      const itemToAdd = ITEMS[effect.value as string];
      if (itemToAdd) {
        newState.items = [...newState.items, itemToAdd];
      }
      break;
    case 'job-specific':
        // Handle job-specific logic
        switch(effect.value) {
            case 'designer-hell':
                newState.isResting += newState.job === 'デザイナー' ? 2 : 1;
                message = newState.job === 'デザイナー' ? 'デザイナーは特に深い絶望に陥り、2回休み。' : '理不尽な修正依頼に1回休み。';
                break;
            case 'system-error':
                if (newState.job === 'エンジニア') {
                    newState.yaruki = Math.min(100, newState.yaruki + 10);
                    message = 'エンジニアは腕の見せ所！やる気が10UP！';
                } else {
                    newState.yaruki = Math.max(0, newState.yaruki - 10);
                    message = 'システム障害発生！よくわからないがやる気が10DOWN。';
                }
                break;
            case 'useless-meeting':
                if (newState.job === '企画・マーケティング') {
                    newState.isResting += 1;
                    message = '企画・マーケは会議で時間を溶かし1回休み。';
                } else {
                    newState.yaruki = Math.max(0, newState.yaruki - 5);
                    message = '無意味な会議に参加させられ、やる気が5DOWN。';
                }
                break;
            case 'sales-win':
                if (newState.job === '営業') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 5;
                    message = '営業の活躍でコンペに勝利！5マス進む！';
                } else {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 1;
                    message = 'コンペに勝利！1マス進む。';
                }
                break;
             case 'viral-hit':
                if (newState.job === '企画・マーケティング') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 5;
                    message = '企画したキャンペーンがSNSでバズった！5マス進む！';
                } else {
                    newState.yaruki = Math.min(100, newState.yaruki + 10);
                    message = '企画がバズって会社の知名度UP！やる気が10UP！';
                }
                break;
            case 'creative-spark':
                if (newState.job === 'デザイナー') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 3;
                    message = 'クリエイティブなひらめき！3マス進む！';
                } else {
                    message = '隣のデザイナーがすごいものを作っている。';
                }
                break;
            case 'code-bug':
                if (newState.job === 'エンジニア') {
                    newState.isResting += 1;
                    message = '動くはずのコードがなぜか動かない…1回休み。';
                } else {
                    message = '隣のエンジニアが頭を抱えている。';
                }
                break;
            case 'server-down':
                 if (newState.job !== 'エンジニア') {
                    newState.pendingMoves = (newState.pendingMoves || 0) - 2;
                    message = 'サーバーダウン！仕事にならないので2マス戻る。';
                } else {
                    message = 'サーバーダウン！エンジニアは復旧作業に追われる。';
                }
                break;
            case 'settai':
                if (newState.job === '営業') {
                    newState.yaruki = Math.min(100, newState.yaruki + 10);
                    message = '接待成功！やる気が10UP！';
                } else {
                    newState.yaruki = Math.max(0, newState.yaruki - 10);
                    message = '接待で気疲れ...やる気が10DOWN。';
                }
                break;
            // 新しい職業固有イベント
            case 'training-instructor':
                if (newState.job === '人事・総務') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 3;
                    message = '新人研修の講師を務めて評価UP！3マス進む！';
                } else {
                    newState.yaruki = Math.min(100, newState.yaruki + 5);
                    message = '新人研修を受けてスキルUP！やる気が5UP！';
                }
                break;
            case 'month-end':
                if (newState.job === '経理・財務') {
                    newState.isResting += 2;
                    message = '月末の売上締めで激務！2回休み。';
                } else if (newState.job === '営業') {
                    newState.yaruki = Math.min(100, newState.yaruki + 10);
                    message = '売上目標達成！やる気が10UP！';
                } else {
                    message = '経理部門が忙しそうだ。';
                }
                break;
            case 'interview-duty':
                if (newState.job === '人事・総務') {
                    newState.yaruki = Math.min(100, newState.yaruki + 15);
                    message = '優秀な人材を発見！やる気が15UP！';
                } else {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 1;
                    message = '面接で自分を見つめ直した。1マス進む。';
                }
                break;
            case 'expense-hell':
                if (newState.job === '経理・財務') {
                    newState.isResting += 1;
                    message = '領収書の山に埋もれて1回休み。';
                } else {
                    newState.yaruki = Math.max(0, newState.yaruki - 5);
                    message = '経費精算が面倒...やる気が5DOWN。';
                }
                break;
            case 'design-award':
                if (newState.job === 'デザイナー') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 4;
                    message = 'デザインコンペで入賞！4マス進む！';
                } else {
                    newState.yaruki = Math.min(100, newState.yaruki + 5);
                    message = '会社のデザインが評価されて嬉しい！やる気が5UP！';
                }
                break;
            case 'major-system-failure':
                if (newState.job === 'エンジニア') {
                    newState.isResting += 3;
                    message = '大規模システム障害で3日間不眠不休...3回休み。';
                } else {
                    newState.pendingMoves = (newState.pendingMoves || 0) - 2;
                    message = 'システム障害で仕事が進まない！2マス戻る。';
                }
                break;
            case 'party-organizer':
                if (newState.job === '人事・総務') {
                    message = '人事・総務は慣れたもの。忘年会を無事開催！';
                } else {
                    newState.pendingMoves = (newState.pendingMoves || 0) - 2;
                    message = '忘年会の幹事で大変...2マス戻る。';
                }
                break;
            case 'budget-meeting':
                if (newState.job === '経理・財務') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 2;
                    message = '予算会議で専門知識を発揮！2マス進む！';
                } else if (newState.job === '企画・マーケティング') {
                    newState.isResting += 1;
                    message = '予算削減で企画が通らない...1回休み。';
                } else {
                    message = '予算会議は他部署の話。';
                }
                break;
            case 'big-deal':
                if (newState.job === '営業') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 6;
                    message = '大型案件を受注！営業の大手柄で6マス進む！';
                } else {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 2;
                    message = '大型案件受注で会社全体が活気づく！2マス進む！';
                }
                break;
            case 'virus-infection':
                if (newState.job === 'エンジニア') {
                    message = 'エンジニアがウイルス対策ソフトで対処。';
                } else {
                    newState.isResting += 1;
                    message = 'コンピューターウイルス感染で1回休み。';
                }
                break;
            case 'performance-review':
                if (newState.job === '人事・総務') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 1;
                    message = '人事評価面談を実施。1マス進む。';
                } else {
                    newState.yaruki = Math.max(0, newState.yaruki - 5);
                    message = '人事評価面談で緊張...やる気が5DOWN。';
                }
                break;
            case 'financial-closing':
                if (newState.job === '経理・財務') {
                    newState.isResting += 3;
                    message = '決算処理で連日深夜残業...3回休み。';
                } else {
                    newState.pendingMoves = (newState.pendingMoves || 0) - 1;
                    message = '決算資料の提出で1マス戻る。';
                }
                break;
            case 'handover':
                if (newState.job === '人事・総務') {
                    newState.isResting += 2;
                    message = '退職者の引き継ぎ業務で2回休み。';
                } else {
                    newState.pendingMoves = (newState.pendingMoves || 0) - 1;
                    message = '退職者からの引き継ぎで1マス戻る。';
                }
                break;
            
            // 新職業用の追加イベント
            case 'legal-compliance':
                if (newState.job === '法務・コンプラ') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 3;
                    message = 'コンプライアンス研修で評価UP！3マス進む！';
                } else {
                    newState.yaruki = Math.max(0, newState.yaruki - 5);
                    message = 'コンプライアンス研修で疲労...やる気が5DOWN。';
                }
                break;
            case 'pr-campaign':
                if (newState.job === '広報・PR') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 4;
                    message = 'PR戦略が大成功！4マス進む！';
                } else {
                    newState.yaruki = Math.min(100, newState.yaruki + 10);
                    message = '会社のイメージがUP！やる気が10UP！';
                }
                break;
            case 'quality-issue':
                if (newState.job === '品質保証') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 2;
                    message = '品質問題を事前に発見！2マス進む！';
                } else {
                    newState.isResting += 1;
                    message = '品質問題で作業やり直し...1回休み。';
                }
                break;
            case 'multi-task':
                if (newState.job === '総合職') {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 2;
                    newState.yaruki = Math.min(100, newState.yaruki + 5);
                    message = '総合職の柔軟性を発揮！2マス進む＆やる気5UP！';
                } else {
                    newState.pendingMoves = (newState.pendingMoves || 0) + 1;
                    message = '他部署のお手伝い。1マス進む。';
                }
                break;
        }
        break;
  }

  newState.gameMessage = message;

  // Check for yaruki penalty
  if (newState.yaruki <= 0) {
    newState.isResting += 1;
    newState.gameMessage += '\nやる気がゼロになった...1回休み。';
    newState.yaruki = 10; // Recover a little yaruki
  }

  newState.position = Math.min(newState.position, BOARD_SIZE);

  return newState;
}

export function checkEndGame(state: GameState): GameState {
    let newState = { ...state };

    // Determine Ending based on multiple factors
    const yaruki = newState.yaruki;
    const turn = newState.turn;
    const hasRestCount = (newState.landedOnCounts[-1] || 0);
    const hasYarukiZeroCount = (newState.landedOnCounts[-2] || 0);
    
    // Legendary endings (very high performance)
    if (yaruki >= 95 && turn <= 5) {
        newState.ending = 'legendary';
    } else if (yaruki >= 90 && turn <= 8 && hasRestCount === 0) {
        newState.ending = 'promotion';
    } else if (yaruki >= 85 && turn <= 10) {
        newState.ending = 'mentor';
    } else if (yaruki >= 80 && turn <= 7) {
        newState.ending = 'specialist';
    } else if (yaruki >= 80 && turn <= 12) {
        newState.ending = 'innovator';
    } else if (yaruki >= 75 && newState.job === '営業') {
        newState.ending = 'ace';
    } else if (yaruki >= 75 && newState.job === 'デザイナー') {
        newState.ending = 'creator';
    } else if (yaruki >= 75 && turn <= 15) {
        newState.ending = 'leader';
    }
    // Good endings (stable performance)
    else if (yaruki >= 70 && yaruki < 85 && hasRestCount <= 2) {
        newState.ending = 'stable';
    } else if (yaruki >= 65 && yaruki < 80 && hasRestCount <= 1) {
        newState.ending = 'balanced';
    } else if (yaruki >= 60 && yaruki < 75 && turn <= 20) {
        newState.ending = 'diligent';
    } else if (yaruki >= 55 && yaruki < 70 && hasRestCount <= 3) {
        newState.ending = 'team-player';
    } else if (yaruki >= 50 && yaruki < 65 && turn <= 25) {
        newState.ending = 'steady';
    } else if (yaruki >= 45 && yaruki < 60) {
        newState.ending = 'consistent';
    } else if (yaruki >= 40 && yaruki < 55) {
        newState.ending = 'reliable';
    }
    // Average endings (mediocre performance)
    else if (yaruki >= 35 && yaruki < 50 && hasRestCount <= 5) {
        newState.ending = 'average';
    } else if (yaruki >= 30 && yaruki < 45 && hasRestCount <= 7) {
        newState.ending = 'survivor';
    } else if (yaruki >= 25 && yaruki < 40) {
        newState.ending = 'mediocre';
    } else if (yaruki >= 20 && yaruki < 35) {
        newState.ending = 'routine';
    } else if (yaruki >= 15 && yaruki < 30) {
        newState.ending = 'ordinary';
    }
    // Special "Escape" endings (low yaruki but specific conditions)
    else if (yaruki < 20 && newState.job === 'エンジニア') {
        newState.ending = 'freelance';
    } else if (yaruki < 20 && newState.job === '企画・マーケティング') {
        newState.ending = 'entrepreneur';
    } else if (yaruki < 20 && newState.job === '営業') {
        newState.ending = 'investor';
    } else if (yaruki < 20 && newState.job === '広報・PR') {
        newState.ending = 'influencer';
    } else if (yaruki < 20 && newState.job === '人事・総務') {
        newState.ending = 'writer';
    } else if (yaruki < 15 && turn >= 40) {
        newState.ending = 'farmer'; // Took too long, decided to farm
    } else if (yaruki < 15 && hasRestCount >= 5) {
        newState.ending = 'global'; // Rested a lot, decided to travel
    }
    // Bad endings (poor performance) - Reduced frequency
    else if (yaruki >= 10 && yaruki < 20 && hasYarukiZeroCount >= 3) {
        newState.ending = 'burnout';
    } else if (yaruki >= 5 && yaruki < 15 && turn >= 35) {
        newState.ending = 'dropout';
    } else if (yaruki >= 0 && yaruki < 10 && hasRestCount >= 8) {
        newState.ending = 'overwork';
    } else if (yaruki <= 0 && hasYarukiZeroCount >= 5) {
        newState.ending = 'breakdown';
        newState.ending = 'resignation';
    } else if (yaruki <= 3 && hasYarukiZeroCount >= 5) {
        newState.ending = 'collapse';
    } else {
        newState.ending = 'defeat';
    }

    // Check Achievements
    const newlyUnlocked: string[] = [];
    if (newState.turn <= 5) newlyUnlocked.push('super-fast');
    if (hasRestCount === 0) newlyUnlocked.push('no-rest');
    if ((newState.landedOnCounts[1] || 0) >= 3) newlyUnlocked.push('monday-hater');
    if (newState.yaruki === 100) newlyUnlocked.push('yaruki-master');
    if (hasYarukiZeroCount >= 1) newlyUnlocked.push('yaruki-zero');

    newState.newlyUnlockedAchievements = newlyUnlocked;

    const allAchievements = Array.from(new Set([...newState.unlockedAchievements, ...newlyUnlocked]));
    if(allAchievements.length > newState.unlockedAchievements.length) {
        newState.unlockedAchievements = allAchievements;
        saveAchievementsToStorage(allAchievements);
    }

    newState.isFinished = true;
    newState.gameMessage = `ゴール！ ${ENDINGS[newState.ending as keyof typeof ENDINGS].title}`;
    return newState;
}

export function takeTurn(currentState: GameState, diceValue?: number): GameState {
  let newState = { ...currentState, turn: currentState.turn + 1 };

  if (newState.isResting > 0) {
    newState.isResting -= 1;
    newState.gameMessage = `休み中... あと${newState.isResting}ターン休み。`;
    // Track rests for achievements, using a special key like -1
    newState.landedOnCounts[-1] = (newState.landedOnCounts[-1] || 0) + 1;
    return newState;
  }

  const diceResult = diceValue ?? rollDice();
  
  // 段階的移動のためのプロパティを追加
  newState.pendingMoves = diceResult;
  newState.gameMessage = `サイコロで${diceResult}が出ました！一マスずつ進みます。`;
  
  return newState;
}

// 一マスずつの移動を処理する新しい関数
export function moveOneStep(currentState: GameState): GameState {
  let newState = { ...currentState };
  
  // If waiting, do nothing
  if (newState.isEventWait) return newState;

  if (!newState.pendingMoves || newState.pendingMoves === 0) {
    return newState;
  }

  // Move
  if (newState.pendingMoves > 0) {
      newState.position += 1;
      newState.pendingMoves -= 1;
      
      // Check for goal during forward movement
      if (newState.position >= BOARD_SIZE) {
          newState.position = BOARD_SIZE;
          newState.pendingMoves = 0;
          audioManager.playSe('fanfare'); // Play fanfare sound
      } else {
          audioManager.playSe('move'); // Play move sound
      }
  } else {
      // Handle backward movement
      newState.position -= 1;
      newState.pendingMoves += 1;
      audioManager.playSe('move'); // Play move sound
  }

  // 中間マスの効果適用
  // Check if landed (pendingMoves is now 0)
  if (newState.pendingMoves === 0) {
      // Check if we should ignore this event (because it's a secondary move)
      if (newState.ignoreNextEvent) {
          const currentSquare = GAME_BOARD.find(s => s.position === newState.position);
          newState.gameMessage = `${currentSquare?.title || 'マス'}に止まりました。(イベント移動完了)`;
          newState.ignoreNextEvent = false; // Reset flag
          
          // If at goal, we still want to show the goal popup/finish
          if (newState.position === BOARD_SIZE) {
              newState.isEventWait = true;
          }
          return newState;
      }

      const currentSquare = GAME_BOARD.find(s => s.position === newState.position);
      if (currentSquare) {
          newState = applySquareEffect(newState, currentSquare);
          
          // Play event sound based on effect type
          if (currentSquare.type === 'goal') {
               // Sound already played in move loop or play here if needed
               // audioManager.playSe('fanfare'); 
          } else if (currentSquare.effect) {
             if (currentSquare.effect.value && typeof currentSquare.effect.value === 'number' && currentSquare.effect.value < 0) {
                 audioManager.playSe('bad');
             } else if (currentSquare.effect.type === 'rest' || currentSquare.effect.type === 'job-specific') {
                 // Heuristic for bad events
                 if (currentSquare.description.includes('休み') || currentSquare.description.includes('下がる') || currentSquare.description.includes('戻る')) {
                     audioManager.playSe('bad');
                 } else {
                     audioManager.playSe('good');
                 }
             } else {
                 audioManager.playSe('good');
             }
          }

          // If effect added moves, set wait flag to show popup/animation
          // AND set ignoreNextEvent to true so the NEXT landing doesn't trigger another event
          // ALSO set wait if it is the GOAL
          if ((newState.pendingMoves && newState.pendingMoves !== 0) || currentSquare.type === 'goal') {
              newState.isEventWait = true;
              if (newState.pendingMoves !== 0) {
                  newState.ignoreNextEvent = true;
              }
          }
      }
  } else {
      // Moving...
      const currentSquare = GAME_BOARD.find(s => s.position === newState.position);
      if (currentSquare) {
          newState.gameMessage = `${currentSquare.title}を通過...`;
      }
  }

  // Check for yaruki penalty achievement
  if (newState.yaruki <= 0) {
    newState.landedOnCounts[-2] = (newState.landedOnCounts[-2] || 0) + 1;
  }

  return newState;
}
