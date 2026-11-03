import assert from 'node:assert/strict';
import {
  BOARD_SIZE,
  DECISIONS,
  ENDINGS,
  FLOORS,
  GAME_BOARD,
  JOBS,
  JOB_PROFILES,
  RANKS,
  checkEndGame,
  consumeItem,
  createNewGame,
  dismissCard,
  moveOneStep,
  resolveDecision,
  takeTurn,
} from '../src/lib/sugoroku-logic';
import { getAudioSettings, setAudioSettings } from '../src/game/common/audioSettings';
import { audioManager } from '../src/utils/audio';

function stepUntilIdle(state: ReturnType<typeof createNewGame>) {
  let curr = state;
  let safety = 0;
  while (safety < 200) {
    safety++;
    if (curr.cards.length > 0) {
      curr = dismissCard(curr);
      continue;
    }
    if (curr.pendingDecision) {
      curr = resolveDecision(curr, curr.pendingDecision.options[0].id, () => 0.1);
      continue;
    }
    if (curr.pendingMoves !== 0 && !curr.isFinished) {
      curr = moveOneStep(curr);
      continue;
    }
    break;
  }
  assert.ok(safety < 200, 'stepUntilIdle exceeded safety limit');
  return curr;
}

function runTests() {
  console.log('--- Running Shachiku Sugoroku NEO Verification Tests ---');

  // 1. 盤面データ整合性・絵文字ゼロ検証
  assert.equal(GAME_BOARD.length, BOARD_SIZE + 1, 'Board must have 61 squares (0..60)');
  const emojiRegex = /[\p{Extended_Pictographic}]/u;
  for (let i = 0; i <= BOARD_SIZE; i++) {
    const sq = GAME_BOARD[i];
    assert.equal(sq.position, i, `Square at index ${i} should have position ${i}`);
    assert.ok(sq.title.length > 0, `Square ${i} must have title`);
    assert.ok(sq.short.length > 0 && sq.short.length <= 8, `Square ${i} must have short label`);
    assert.ok(!emojiRegex.test(sq.title), `Square ${i} title should not contain emoji`);
    assert.ok(!emojiRegex.test(sq.short), `Square ${i} short should not contain emoji`);
  }
  assert.equal(FLOORS.length, 6, 'Should have 6 corporate floors');

  // 2. 全10職種の初期化検証
  for (const job of JOBS) {
    const state = createNewGame({ name: `テスト_${job}`, job });
    const profile = JOB_PROFILES[job];
    assert.equal(state.job, job);
    assert.equal(state.position, 0);
    assert.equal(state.yaruki, 100);
    assert.equal(state.career, profile.startCareer);
    assert.equal(state.money, profile.startMoney);
    assert.equal(state.items.length, 1);
    assert.equal(state.items[0].id, profile.startItem);
    assert.equal(state.status, 'playing');
    assert.equal(state.isFinished, false);
  }

  // 3. 定時スタンス(1D6) vs 全力残業スタンス(2D6) とアイテム消費の検証
  {
    let state = createNewGame({ name: '田中', job: '営業' });
    // 初期支給品のエナドリを使用
    state = consumeItem(state, 'energy-drink');
    assert.equal(state.items.length, 0);
    assert.equal(state.diceBoost, 2);

    // 定時スタンスで出目3 → ブースト+2で計5マス移動
    state = takeTurn(state, 'teiji', [3]);
    assert.equal(state.pendingMoves, 5);
    assert.equal(state.teijiCount, 1);
    assert.deepEqual(state.lastRoll, [3]);
    state = stepUntilIdle(state);
    // 5マス目は配属ガチャ（さらに2マス進む可能性あり）
    assert.ok(state.position === 5 || state.position === 7);

    // 全力残業スタンスで2ダイス [4, 5] = 9マス
    const beforeCareer = state.career;
    const beforeMoney = state.money;
    state = takeTurn(state, 'zangyo', [4, 5]);
    assert.equal(state.zangyoCount, 1);
    assert.equal(state.career, beforeCareer + 1);
    assert.equal(state.money, beforeMoney + 10);
    assert.equal(state.pendingMoves, 9);
  }

  // 4. 昇進査定ゲートの通過・昇進検証
  {
    let state = createNewGame({ name: '昇進太郎', job: '総合職' }); // startCareer = 3
    state.position = 11;
    state = takeTurn(state, 'teiji', [2]); // 11 -> 12 (Gate 1: 一般社員, 必要評価2) -> 13
    state = stepUntilIdle(state);
    assert.ok(state.gatesPassed.includes(12), 'Gate 12 should be recorded');
    assert.equal(state.rank, 1, 'Should be promoted to rank 1 (一般社員)');
    assert.equal(state.lastGate?.promoted, true);
    assert.equal(state.lastGate?.rankName, RANKS[1].name);
  }

  // 5. 決断イベント（リスク選択肢の成功/失敗含む）検証
  {
    let state = createNewGame({ name: '決断花子', job: '企画・マーケティング' });
    state.position = 19;
    state = takeTurn(state, 'teiji', [1]); // 20マス目: 上期キャリア面談
    state = moveOneStep(state);
    assert.equal(state.position, 20);
    assert.ok(state.pendingDecision, 'Should trigger career-talk decision at square 20');
    assert.equal(state.pendingDecision?.id, DECISIONS['career-talk'].id);

    // 勝負手オプション (pitch-new-biz) を成功乱数 (0.1 < 0.65) で解決
    const prevCareer = state.career;
    state = resolveDecision(state, 'pitch-new-biz', () => 0.1);
    assert.equal(state.pendingDecision, null);
    assert.equal(state.career, prevCareer + 5);
    assert.equal(state.pendingMoves, 3);
    assert.equal(state.decisionHistory.length, 1);
    assert.equal(state.decisionHistory[0].success, true);
    state = stepUntilIdle(state);
    assert.equal(state.position, 23);
  }

  // 6. 有給休暇届と根回し資料の動作検証
  {
    let state = createNewGame({ name: '有給次郎', job: 'デザイナー' }); // 初期: paid-leave
    state.isResting = 2;
    state.slowNextTurn = true;
    state.yaruki = 50;
    state = consumeItem(state, 'paid-leave');
    assert.equal(state.isResting, 0, 'Paid leave must clear all resting turns');
    assert.equal(state.slowNextTurn, false, 'Paid leave must clear hangover slow flag');
    assert.equal(state.yaruki, 65);

    let state2 = createNewGame({ name: '根回し三郎', job: '法務・コンプラ' }); // 初期: nemawashi
    const c0 = state2.career;
    state2 = consumeItem(state2, 'nemawashi');
    assert.equal(state2.career, c0 + 3);
  }

  // 7. メンタル3回崩壊（産業医ストップ・強制休職）検証
  {
    let state = createNewGame({ name: '限界社畜', job: '営業' });
    state.position = 0;
    state.yaruki = 10;

    // 1回目のゼロ (1マス目: 月曜朝の憂鬱 -15)
    state = takeTurn(state, 'teiji', [1]); // +2 yaruki = 12, then -15 = -3 -> 0
    state = stepUntilIdle(state);
    assert.equal(state.strikes, 1);
    assert.equal(state.yaruki, 25);
    assert.equal(state.isFinished, false);

    // 休み消化
    state = takeTurn(state, 'teiji');
    assert.equal(state.isResting, 0);

    // 2回目のゼロ (22マス目: 無茶振り -22 へ移動させる)
    state.position = 21;
    state.yaruki = 15;
    state = takeTurn(state, 'teiji', [1]); // 21 -> 22 (-22 yaruki)
    state = stepUntilIdle(state);
    assert.equal(state.strikes, 2);
    assert.equal(state.yaruki, 25);
    assert.equal(state.isFinished, false);

    // 休み消化
    state = takeTurn(state, 'teiji');

    // 3回目のゼロ -> ゲームオーバー
    state.position = 0;
    state.yaruki = 5;
    state = takeTurn(state, 'teiji', [1]); // 0 -> 1 (-15 yaruki)
    state = stepUntilIdle(state);
    assert.equal(state.strikes, 3);
    assert.equal(state.status, 'gameover');
    assert.equal(state.isFinished, true);
    assert.equal(state.grade, 'D');
  }

  // 8. ゴール到達とエンディング・スコア算出検証
  {
    let state = createNewGame({ name: '伝説社員', job: 'エンジニア' });
    state.position = 58;
    state.turn = 9;
    state.yaruki = 95;
    state.career = 16;
    state.money = 220;
    state = takeTurn(state, 'teiji', [2]); // 58 -> 60 Goal
    state = stepUntilIdle(state);
    assert.equal(state.position, 60);
    assert.equal(state.isFinished, true);
    assert.equal(state.status, 'cleared');
    assert.equal(state.ending, 'legendary');
    assert.equal(state.grade, 'S');
    assert.ok(state.score > 2000);
    assert.ok(state.ending! in ENDINGS);
    assert.ok(state.newlyUnlockedAchievements.includes('super-fast'));
    assert.ok(state.newlyUnlockedAchievements.includes('millionaire'));
  }

  // 9. 全10職種 × 10ラン = 100ゲームの完走ファズテスト（無限ループ・例外ゼロ保証）
  for (const job of JOBS) {
    for (let run = 0; run < 10; run++) {
      let state = createNewGame({ name: `Sim_${job}_${run}`, job });
      let guard = 0;
      while (!state.isFinished && guard < 120) {
        guard++;
        const stance = state.yaruki >= 55 && run % 2 === 0 ? 'zangyo' : 'teiji';
        state = takeTurn(state, stance);
        state = stepUntilIdle(state);
      }
      assert.ok(state.isFinished, `Simulation for ${job} run ${run} must finish within 120 turns`);
      assert.ok(state.ending && state.ending in ENDINGS, `Valid ending required: ${state.ending}`);
      assert.ok(state.grade !== null, 'Grade must be assigned');
    }
  }

  // 10. 共通オーディオ設定 (audioSettings.se) との連動検証
  {
    const orig = getAudioSettings();
    setAudioSettings({ se: false });
    assert.equal(audioManager.muted, true, 'audioManager.muted must reflect audioSettings.se=false');
    audioManager.playSe('roll'); // ミュート時に例外なく無視されること

    setAudioSettings({ se: true });
    assert.equal(audioManager.muted, false, 'audioManager.muted must reflect audioSettings.se=true');
    setAudioSettings(orig);
  }

  // checkEndGame 単体呼び出し互換性
  {
    let state = createNewGame({ name: '単体確認', job: '広報・PR' });
    state.position = 60;
    state.turn = 18;
    state.yaruki = 72;
    state = checkEndGame(state);
    assert.equal(state.isFinished, true);
    assert.equal(state.ending, 'stable');
  }

  console.log('ALL SHACHIKU SUGOROKU TESTS PASSED (100/100 simulation runs + unit assertions)!');
}

runTests();
