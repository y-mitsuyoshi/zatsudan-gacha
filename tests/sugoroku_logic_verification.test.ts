import assert from 'node:assert/strict';
import {
  BOARD_SIZE,
  DECISIONS,
  ENDINGS,
  FLOORS,
  GAME_BOARD,
  JOBS,
  JOB_PROFILES,
  LIFE_ASSETS,
  PAYDAY_POSITIONS,
  RANKS,
  calculateNetWorthBreakdown,
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
  console.log('--- Running Shachiku Life Road Verification Tests ---');

  // 1. 盤面データ整合性・ジオラマ座標・絵文字ゼロ検証
  assert.equal(BOARD_SIZE, 35, 'BOARD_SIZE must be 35 (0..35 = 36 squares)');
  assert.equal(GAME_BOARD.length, BOARD_SIZE + 1, 'Board must have 36 squares (0..35)');
  const emojiRegex = /[\p{Extended_Pictographic}]/u;
  for (let i = 0; i <= BOARD_SIZE; i++) {
    const sq = GAME_BOARD[i];
    assert.equal(sq.position, i, `Square at index ${i} should have position ${i}`);
    assert.ok(sq.title.length > 0, `Square ${i} must have title`);
    assert.ok(sq.short.length > 0 && sq.short.length <= 8, `Square ${i} must have short label`);
    assert.ok(sq.districtId >= 1 && sq.districtId <= 5, `Square ${i} must belong to district 1..5`);
    assert.ok(sq.x >= 0 && sq.x <= 100, `Square ${i} x coordinate must be within 0..100`);
    assert.ok(sq.y >= 0 && sq.y <= 100, `Square ${i} y coordinate must be within 0..100`);
    assert.ok(!emojiRegex.test(sq.title), `Square ${i} title should not contain emoji`);
    assert.ok(!emojiRegex.test(sq.short), `Square ${i} short should not contain emoji`);
    assert.ok(!emojiRegex.test(sq.description), `Square ${i} description should not contain emoji`);
  }
  assert.equal(FLOORS.length, 5, 'Should have 5 scenic diorama districts');
  assert.equal(RANKS.length, 7, 'Should have 7 career ranks (新入社員〜社長)');
  assert.deepEqual(PAYDAY_POSITIONS, [5, 13, 21, 29], 'Payday gates at 5, 13, 21, 29');

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
    assert.equal(state.assets.length, 0);
    assert.equal(state.status, 'playing');
    assert.equal(state.isFinished, false);
  }

  // 3. 定時スタンス(1スピン) vs 全力残業スタンス(Wスピン) とアイテム消費の検証
  {
    let state = createNewGame({ name: '田中', job: '営業' });
    state = consumeItem(state, 'energy-drink');
    assert.equal(state.items.length, 0);
    assert.equal(state.diceBoost, 2);

    // 定時スタンスで出目1 → ブースト+2で計3マス移動 (0 -> 3: 備品発見)
    state = takeTurn(state, 'teiji', [1]);
    assert.equal(state.pendingMoves, 3);
    assert.equal(state.teijiCount, 1);
    assert.deepEqual(state.lastRoll, [1]);
    state = stepUntilIdle(state);
    assert.equal(state.position, 3);

    // 全力残業スタンスでWルーレット [3, 4] = 7マス
    const beforeCareer = state.career;
    const beforeMoney = state.money;
    state = takeTurn(state, 'zangyo', [3, 4]);
    assert.equal(state.zangyoCount, 1);
    assert.equal(state.career, beforeCareer + 1);
    assert.equal(state.money, beforeMoney + 10);
    assert.equal(state.pendingMoves, 7);
  }

  // 4. 昇進査定ゲート ＆ 給料日ゲート通過ボーナス（PAYDAY通過支給）の検証
  {
    let state = createNewGame({ name: '昇進太郎', job: '総合職' }); // startCareer = 3
    state.position = 4;
    const moneyBefore = state.money;
    // 4 -> 5 (第1給料日ゲート＆主任査定: 必要評価2) -> 6 へ通過させる
    state = takeTurn(state, 'teiji', [2]);
    // 1歩目: position 5 へ移動（昇進祝金 +40万 ＆ PAYDAY給料日支給 +40万）
    state = moveOneStep(state);
    assert.equal(state.position, 5);
    assert.ok(state.gatesPassed.includes(5), 'Gate 5 should be recorded');
    assert.equal(state.rank, 1, 'Should be promoted to rank 1 (主任)');
    assert.ok(state.paydaysPassed.includes(5), 'Payday 5 should be recorded on pass');
    assert.equal(state.lastPayday?.position, 5);
    assert.equal(state.lastPayday?.baseSalary, RANKS[1].salaryBonus);
    assert.equal(state.money, moneyBefore + RANKS[1].salaryBonus + RANKS[1].salaryBonus);
    state = stepUntilIdle(state);
    assert.equal(state.position, 6);
  }

  // 5. キャリア分岐ジャンクション決断 ＆ ライフ資産ポートフォリオ獲得・配当検証
  {
    let state = createNewGame({ name: '決断花子', job: '企画・マーケティング' });
    state.position = 7;
    state = takeTurn(state, 'teiji', [1]); // 8マス目: キャリア分岐ジャンクション
    state = moveOneStep(state);
    assert.equal(state.position, 8);
    assert.ok(state.pendingDecision, 'Should trigger career-talk decision at square 8');
    assert.equal(state.pendingDecision?.id, DECISIONS['career-talk'].id);

    // 定時クルーズ路線 (keep-pace) を選択 → インカム投資信託 (value 80, dividend 15) を獲得
    state = resolveDecision(state, 'keep-pace', () => 0.1);
    assert.equal(state.pendingDecision, null);
    assert.equal(state.selectedRoute, 'elite');
    assert.equal(state.assets.length, 1);
    assert.equal(state.assets[0].id, 'income-fund');
    assert.equal(state.assets[0].value, LIFE_ASSETS['income-fund'].value);
    state = stepUntilIdle(state);

    // 次に13マス目の第2給料日ゲートを通過すると、役職基本給＋インカム投資信託の配当(+15万)が加算される
    state.position = 12;
    state = takeTurn(state, 'teiji', [1]);
    state = moveOneStep(state);
    assert.equal(state.position, 13);
    assert.equal(state.lastPayday?.dividendBonus, 15);
    assert.equal(
      state.lastPayday?.totalPayout,
      (state.lastPayday?.baseSalary ?? 0) + 15,
    );
  }

  // 6. 有給休暇届と根回し資料の動作検証
  {
    let state = createNewGame({ name: '有給次郎', job: 'デザイナー' });
    state.isResting = 2;
    state.slowNextTurn = true;
    state.yaruki = 50;
    state = consumeItem(state, 'paid-leave');
    assert.equal(state.isResting, 0, 'Paid leave must clear all resting turns');
    assert.equal(state.slowNextTurn, false, 'Paid leave must clear hangover slow flag');
    assert.equal(state.yaruki, 65);

    let state2 = createNewGame({ name: '根回し三郎', job: '法務・コンプラ' });
    const c0 = state2.career;
    state2 = consumeItem(state2, 'nemawashi');
    assert.equal(state2.career, c0 + 3);
  }

  // 7. メンタル3回崩壊（産業医ストップ・強制休職）検証
  {
    let state = createNewGame({ name: '限界社畜', job: '営業' });
    state.position = 0;
    state.yaruki = 10;

    // 1回目のゼロ (1マス目: 月曜朝の通勤ラッシュ -15)
    state = takeTurn(state, 'teiji', [1]);
    state = stepUntilIdle(state);
    assert.equal(state.strikes, 1);
    assert.equal(state.yaruki, 25);
    assert.equal(state.isFinished, false);

    // 休み消化
    state = takeTurn(state, 'teiji');
    assert.equal(state.isResting, 0);

    // 2回目のゼロ (19マス目: 無茶振り -20 へ移動させる)
    state.position = 18;
    state.yaruki = 15;
    state = takeTurn(state, 'teiji', [1]); // 18 -> 19 (-20 yaruki)
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

  // 8. ゴール到達と最終生涯総資産・エンディング・スコア算出検証
  {
    let state = createNewGame({ name: '伝説社員', job: 'エンジニア' });
    state.position = 33;
    state.turn = 8;
    state.yaruki = 95;
    state.career = 16;
    state.rank = 5; // 執行役員
    state.money = 240;
    state.assets = [LIFE_ASSETS['city-condo'], LIFE_ASSETS['resort-villa']];
    state = takeTurn(state, 'teiji', [2]); // 33 -> 35 Goal
    state = stepUntilIdle(state);
    assert.equal(state.position, 35);
    assert.equal(state.isFinished, true);
    assert.equal(state.status, 'cleared');
    assert.equal(state.ending, 'legendary');
    assert.equal(state.grade, 'S');
    const nw = calculateNetWorthBreakdown(state);
    assert.ok(nw.totalNetWorth > 1000, `Expected high total net worth, got ${nw.totalNetWorth}`);
    assert.ok(state.score > 3000);
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
    audioManager.playSe('roll');

    setAudioSettings({ se: true });
    assert.equal(audioManager.muted, false, 'audioManager.muted must reflect audioSettings.se=true');
    setAudioSettings(orig);
  }

  // checkEndGame 単体呼び出し互換性
  {
    let state = createNewGame({ name: '単体確認', job: '広報・PR' });
    state.position = 35;
    state.turn = 16;
    state.yaruki = 72;
    state = checkEndGame(state);
    assert.equal(state.isFinished, true);
    assert.equal(state.ending, 'stable');
  }

  console.log('ALL SHACHIKU LIFE ROAD TESTS PASSED (100/100 simulation runs + unit assertions)!');
}

runTests();
