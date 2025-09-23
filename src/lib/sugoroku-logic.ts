import { Job, Item, BoardSquare, GameState, SetupFormState } from '@/types/sugoroku';

// --- Master Data ---

export const JOBS: Job[] = ['営業', 'エンジニア', 'デザイナー', '企画・マーケティング'];

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

const BOARD_SIZE = 30;
export const GAME_BOARD: BoardSquare[] = [
    { position: 0, type: 'start', title: 'スタート', description: '社畜すごろくの始まり。', effect: null },
    { position: 1, type: 'event', title: '月曜朝からやる気でない', description: 'やる気が10下がる。', effect: { type: 'yaruki', value: -10 } },
    { position: 2, type: 'event', title: '電車遅延', description: 'ギリギリセーフ！しかしやる気が5下がる。', effect: { type: 'yaruki', value: -5 } },
    { position: 3, type: 'item', title: '備品室で発見', description: '栄養ドリンクを手に入れた。', effect: { type: 'item', value: 'energy-drink' } },
    { position: 4, type: 'event', title: '退勤直前の"ちょっといい？"', description: '2マス戻る。', effect: { type: 'move', value: -2 } },
    { position: 5, type: 'job-specific', title: '職業イベント', description: '職業によって運命が変わる…', effect: null }, // Job specific event
    { position: 6, type: 'salary', title: '給料日', description: 'やる気が30回復！', effect: { type: 'yaruki', value: 30 } },
    { position: 7, type: 'event', title: 'ランチで入った店が大当たり！', description: 'やる気が15回復！', effect: { type: 'yaruki', value: 15 } },
    { position: 8, type: 'event', title: 'PCフリーズ', description: 'データは無事だったが、1マス戻る。', effect: { type: 'move', value: -1 } },
    { position: 9, type: 'event', title: '理不尽な修正依頼', description: 'デザイナーは2回休み。他は1回休み。', effect: { type: 'job-specific', value: 'designer-hell' } },
    { position: 10, type: 'normal', title: '平穏な一日', description: 'なにごともなく業務終了。', effect: null },
    { position: 11, type: 'item', title: '先輩からの差し入れ', description: '有給休暇申請書を手に入れた。', effect: { type: 'item', value: 'paid-leave' } },
    { position: 12, type: 'event', title: 'システム障害発生', description: 'エンジニアはやる気10UP。他はやる気10DOWN。', effect: { type: 'job-specific', value: 'system-error' } },
    { position: 13, type: 'event', title: '無意味な定例会議', description: '企画・マーケは1回休み。他はやる気5DOWN。', effect: { type: 'job-specific', value: 'useless-meeting' } },
    { position: 14, type: 'normal', title: '定時退社', description: '今日もお疲れ様でした。', effect: null },
    { position: 15, type: 'salary', title: '給料日', description: 'やる気が30回復！', effect: { type: 'yaruki', value: 30 } },
    { position: 16, type: 'event', title: '競合にコンペで勝利！', description: '営業は5マス進む。他は1マス進む。', effect: { type: 'job-specific', value: 'sales-win' } },
    { position: 17, type: 'event', title: 'SNSで企画がバズる！', description: '企画・マーケは5マス進む。他はやる気10UP。', effect: { type: 'job-specific', value: 'viral-hit' } },
    { position: 18, type: 'event', title: 'クリエイティブなひらめき', description: 'デザイナーは3マス進む。', effect: { type: 'job-specific', value: 'creative-spark' } },
    { position: 19, type: 'event', title: '動くはずのコードが動かない', description: 'エンジニアは1回休み。', effect: { type: 'job-specific', value: 'code-bug' } },
    { position: 20, type: 'normal', title: '有給休暇', description: '心と体をリフレッシュ。', effect: null },
    { position: 21, type: 'event', title: '飲み会', description: 'やる気が10上がるが、次のターンは1マスしか進めない。', effect: { type: 'yaruki', value: 10 } }, // Special effect to be handled
    { position: 22, type: 'event', title: '上司の無茶振り', description: 'やる気が20下がる。', effect: { type: 'yaruki', value: -20 } },
    { position: 23, type: 'normal', title: '穏やかな一日', description: '集中して業務ができた。', effect: null },
    { position: 24, type: 'item', title: '謎のメモ', description: '「有給休暇申請書」を手に入れた', effect: { type: 'item', value: 'paid-leave' } },
    { position: 25, type: 'event', title: 'プロジェクト完了！', description: '大きな達成感！3マス進む。', effect: { type: 'move', value: 3 } },
    { position: 26, type: 'event', title: 'インフルエンサーが紹介', description: 'やる気が15上がる。', effect: { type: 'yaruki', value: 15 } },
    { position: 27, type: 'event', title: 'サーバーダウン', description: 'エンジニア以外は2マス戻る。', effect: { type: 'job-specific', value: 'server-down' } },
    { position: 28, type: 'event', title: '接待', description: '営業はやる気10UP。他はやる気10DOWN。', effect: { type: 'job-specific', value: 'settai' } },
    { position: 29, type: 'normal', title: 'あと少し…', description: 'ゴールの光が見えてきた。', effect: null },
    { position: 30, type: 'goal', title: 'ゴール！', description: 'ボーナス支給日！おめでとう！', effect: null },
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
    'true': { title: '円満退職', description: '最高のパフォーマンスを発揮し、伝説の社員として名を残した。' },
    'good': { title: '平穏なサラリーマン人生', description: '大きな波乱もなく、安定した社畜ライフを全うした。' },
    'bad': { title: '強制リタイア', description: '心身ともに疲れ果て、ドクターストップにより退場となった…。' }
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
      newState.yaruki = Math.max(0, Math.min(100, newState.yaruki + effect.value));
      break;
    case 'move':
      newState.position = Math.max(0, newState.position + effect.value);
      break;
    case 'rest':
      newState.isResting += effect.value;
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
                    newState.position += 5;
                    message = '営業の活躍でコンペに勝利！5マス進む！';
                } else {
                    newState.position += 1;
                    message = 'コンペに勝利！1マス進む。';
                }
                break;
             case 'viral-hit':
                if (newState.job === '企画・マーケティング') {
                    newState.position += 5;
                    message = '企画したキャンペーンがSNSでバズった！5マス進む！';
                } else {
                    newState.yaruki = Math.min(100, newState.yaruki + 10);
                    message = '企画がバズって会社の知名度UP！やる気が10UP！';
                }
                break;
            case 'creative-spark':
                if (newState.job === 'デザイナー') {
                    newState.position += 3;
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
                    newState.position = Math.max(0, newState.position - 2);
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

function checkEndGame(state: GameState): GameState {
    let newState = { ...state };

    // Determine Ending
    if (newState.yaruki >= 80 && newState.turn <= 10) {
        newState.ending = 'true';
    } else if (newState.yaruki <= 20) {
        newState.ending = 'bad';
    } else {
        newState.ending = 'good';
    }

    // Check Achievements
    const newlyUnlocked: string[] = [];
    if (newState.turn <= 5) newlyUnlocked.push('super-fast');
    if (newState.landedOnCounts[-1] === undefined) newlyUnlocked.push('no-rest'); // Assuming isResting updates a special count
    if ((newState.landedOnCounts[1] || 0) >= 3) newlyUnlocked.push('monday-hater');
    if (newState.yaruki === 100) newlyUnlocked.push('yaruki-master');
    if ((newState.landedOnCounts[-2] || 0) >= 1) newlyUnlocked.push('yaruki-zero'); // Assuming yaruki penalty updates a special count

    newState.newlyUnlockedAchievements = newlyUnlocked;

    const allAchievements = [...new Set([...newState.unlockedAchievements, ...newlyUnlocked])];
    if(allAchievements.length > newState.unlockedAchievements.length) {
        newState.unlockedAchievements = allAchievements;
        saveAchievementsToStorage(allAchievements);
    }

    newState.isFinished = true;
    newState.gameMessage = `ゴール！ ${ENDINGS[newState.ending as keyof typeof ENDINGS].title}`;
    return newState;
}

export function takeTurn(currentState: GameState): GameState {
  let newState = { ...currentState, turn: currentState.turn + 1 };

  if (newState.isResting > 0) {
    newState.isResting -= 1;
    newState.gameMessage = `休み中... あと${newState.isResting}ターン休み。`;
    // Track rests for achievements, using a special key like -1
    newState.landedOnCounts[-1] = (newState.landedOnCounts[-1] || 0) + 1;
    return newState;
  }

  const diceResult = rollDice();
  let newPosition = newState.position + diceResult;

  if (newPosition >= BOARD_SIZE) {
    newPosition = BOARD_SIZE;
    newState.position = newPosition;
    newState.path = [...newState.path, newPosition];
    return checkEndGame(newState);
  }

  newState.position = newPosition;
  newState.path = [...newState.path, newPosition];
  newState.landedOnCounts[newPosition] = (newState.landedOnCounts[newPosition] || 0) + 1;

  const currentSquare = GAME_BOARD.find(s => s.position === newState.position);
  if (currentSquare) {
    newState = applySquareEffect(newState, currentSquare);
  }

  // Check for yaruki penalty achievement
  if (newState.yaruki <= 0) {
      newState.landedOnCounts[-2] = (newState.landedOnCounts[-2] || 0) + 1;
  }

  return newState;
}
