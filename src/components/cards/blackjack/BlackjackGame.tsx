'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  CardItem,
  createStandardDeck,
  playCardSound,
  PlayingCardView,
  shuffleWithRng,
  useCardTableBgm,
} from '@/components/cards/shared/cardUtils';
import {
  CHARACTERS,
  CHAR_IDS,
  FELTS,
  HOLDEM_ASSETS,
  charImage,
  type CharId,
  type Expression,
  type FeltId,
} from '@/components/cards/texas-holdem/characters';
import { holdemAudio } from '@/components/cards/texas-holdem/audio';

const SHOE_DECKS = 6;
const RESHUFFLE_THRESHOLD = 65;

interface PlayerHand {
  id: string;
  cards: CardItem[];
  bet: number;
  status: 'playing' | 'stood' | 'busted' | 'blackjack' | 'surrendered' | 'doubled';
  outcome?: 'win' | 'lose' | 'push' | 'blackjack' | 'surrender';
  payout?: number;
}

interface HistoryEntry {
  id: number;
  dealerTotal: string;
  handSummaries: string[];
  netChange: number;
}

type BjVoiceEvent =
  | 'greet'
  | 'deal'
  | 'hit'
  | 'stand'
  | 'double'
  | 'split'
  | 'surrender'
  | 'insurance'
  | 'dealerBust'
  | 'dealerBj'
  | 'playerBj'
  | 'win'
  | 'bigWin'
  | 'push'
  | 'lose'
  | 'refill';

const DEALER_BJ_LINES: Record<CharId, Record<BjVoiceEvent, string[]>> = {
  koharu: {
    greet: [
      'ロイヤル・ナイト・カジノへようこそにゃ！今夜はブラックジャックで勝負にゃ♪',
      'コハルがディーラーを務めるにゃ！幸運の21を一緒に狙うにゃ！',
    ],
    deal: ['カードを配るにゃ！いい手が入りますように♪', 'さあ勝負開始にゃ！オープン！'],
    hit: ['ヒットにゃ！もう1枚どうぞ♪', '攻めるにゃ！はい、カードにゃ！'],
    stand: ['スタンドにゃ！それじゃあコハルの番にゃ！', '勝負に出たにゃ！めくるにゃよ〜！'],
    double: ['ダブルダウンにゃ！？倍賭け1枚勝負、しびれるにゃーっ！', '強気のダブルにゃ！運命の1枚いくにゃ！'],
    split: ['スプリットにゃ！2つのハンドでダブルチャンスにゃ♪', 'ペアを分けるにゃ！どっちも勝つにゃよ！'],
    surrender: ['サレンダーにゃね。半分戻して次に備えるのも賢いにゃ！', 'ナイス判断にゃ！次のハンドで取り返すにゃ！'],
    insurance: ['アップカードがAにゃ！インシュランスはどうするにゃ？', 'ブラックジャック保険、掛けておくにゃ？'],
    dealerBust: ['うにゃああっ！コハル、バーストしちゃったにゃ〜！', '21を超えちゃったにゃ…あなたの勝ちにゃ♪'],
    dealerBj: ['にゃふふ♪ コハルの21が決まったにゃ！', 'ディーラー21にゃ！今回はコハルの勝ちにゃ♪'],
    playerBj: ['にゃんとっ！ナチュラル・ブラックジャック21にゃーっ！凄すぎるにゃ！', '完璧な21にゃ！1.5倍配当おめでとうにゃ♪'],
    win: ['おめでとうにゃ！ナイスハンドにゃ♪', 'やったにゃ！チップが増えていくにゃ〜！'],
    bigWin: ['特大勝利にゃーっ！今夜はロイヤルスイートでごちそうにゃ！', 'ダブル勝利すごいにゃ！コハルも大興奮にゃ♪'],
    push: ['プッシュで引き分けにゃ！チップはそのままお返しするにゃ♪', '同点にゃね！もう1回勝負にゃ！'],
    lose: ['うにゃ…今回はコハルの勝ちにゃ。次で逆転するにゃ！', 'しょんぼりしないで、流れはすぐ変わるにゃよ！'],
    refill: ['無料チップを1,000枚補給したにゃ！ここから大逆転するにゃーっ！', 'チップ満タンにゃ！何度でも楽しめるにゃ♪'],
  },
  karen: {
    greet: [
      '一ノ瀬カレンがディーラーをしてあげるわ。感謝しなさいよね！',
      'ブラックジャックで私からチップを奪えるかしら？かかってきなさい！',
    ],
    deal: ['配るわよ！瞬き厳禁なんだから！', 'さあ、今夜の勝負を始めるわよ！'],
    hit: ['ヒットね。バーストしても知らないわよ！', 'もう1枚？度胸あるじゃない！'],
    stand: ['スタンドね！私のハンドを見せてあげるわ！', 'そこで止めるのね。勝負よ！'],
    double: ['ダブルダウン！？面白いじゃない、受けて立つわ！', '倍賭け1枚勝負…！あんた、いい目をしてるわね！'],
    split: ['スプリット！二刀流で攻める気ね！', 'ペアを割ったわね。両方とも相手してあげる！'],
    surrender: ['サレンダー？まあ、撤退も一流の戦術よ。', '半額回収ね。次は逃げないで勝負しなさいよ！'],
    insurance: ['私の表カードはAよ。保険を掛けておく？', 'インシュランスはどうするの？よく考えなさい！'],
    dealerBust: ['くっ…！私がバーストするなんて…次は負けないんだから！', 'ぐぬぬ…21オーバーよ。チップを持っていきなさい！'],
    dealerBj: ['ふふん！私の21よ、完璧でしょ！', 'これが一ノ瀬の引きよ！参ったかしら？'],
    playerBj: ['なっ…ナチュラル・ブラックジャック21ですって！？やるじゃない！', 'いきなり21！？べ、別に悔しくなんかないんだから！'],
    win: ['あんたの勝ちよ。ほら、配当を受け取りなさい！', 'いい判断だったわね。素直に褒めてあげる！'],
    bigWin: ['完敗よ…！見事なビッグウィン、認めてあげるわ！', 'これだけ稼ぐなんて…今夜の主役はあんたね！'],
    push: ['引き分けね！決着は次のハンドよ！', 'プッシュ！互角の勝負じゃない！'],
    lose: ['ふふん、私の勝ちね！もう一度挑んでくる？', '残念だったわね♪ 次は期待値ナビもよく見なさい！'],
    refill: ['特別に1,000チップ補充してあげるわ！これで私にリベンジしなさい！', 'ほら、補給チップよ！諦めるなんて許さないんだから！'],
  },
  rei: {
    greet: [
      '九条レイだ。6デッキシューの確率収束、共に検証しよう。',
      'ブラックジャックは数学で攻略できる唯一のテーブルゲームだ。始めよう。',
    ],
    deal: ['ディールする。アップカードと自分の合計値を確認しろ。', 'カードを配った。最適解を選択するんだ。'],
    hit: ['ヒットだ。バースト確率を計算に入れた上での判断だな。', '1枚ドローする。'],
    stand: ['スタンドを確認。ディーラーのドローに移行する。', '合理的なストップだ。オープンしよう。'],
    double: ['ダブルダウン。期待値がプラスの局面で最大のレバレッジだな。', '倍プッシュか。理論的にも美しい判断だ。'],
    split: ['スプリット。ペア分割で期待値を引き上げる定石だな。', '2ハンドに分割する。順番に処理しよう。'],
    surrender: ['サレンダー。損失をマイナス0.5単位に抑える冷静な判断だ。', '期待値マイナスの局面では撤退こそが正解になる。'],
    insurance: ['ディーラーのAだ。インシュランスを選択するか？', '保険ベットの確認だ。True Countも参考にしろ。'],
    dealerBust: ['ディーラーバーストだ。君の読み通り、確率が味方したな。', '21を超えたか。君の勝利だ。'],
    dealerBj: ['ディーラー21。この収束は避けられない。', '21が成立した。次のハンドに切り替えよう。'],
    playerBj: ['ナチュラル・ブラックジャック21。3対2配当、完璧な立ち上がりだ。', '美しい21だ。ハイカード比率の偏りを活かしたな。'],
    win: ['君の勝ちだ。ベーシックストラテジーに忠実な結果だな。', 'ナイスプレイ。着実にチップを積み上げている。'],
    bigWin: ['見事なビッグウィンだ。期待値最大化のお手本のような勝負だった。', '圧倒的な収支プラスだな。素晴らしい。'],
    push: ['プッシュだ。ベットは全額返却される。', '同点か。悪くない結果だ。'],
    lose: ['今回はディーラーの勝ちだ。だが正しい判断を続ければ収束する。', '短期の分散に惑わされるな。次の一手に集中しろ。'],
    refill: ['1,000チップを再装填した。バンクロール管理を再開しよう。', 'チップを補充したぞ。検証を続けよう。'],
  },
  valentina: {
    greet: [
      'ようこそ、ロイヤル・ナイトのVIPテーブルへ。ヴァレンティナが相手よ。',
      'ふふっ、21の魅惑に溺れないよう気をつけてね、坊や。',
    ],
    deal: ['さあ、運命のカードを配るわよ。', 'どんなドラマが待っているかしらね♪'],
    hit: ['ヒットね。欲張りな子は嫌いじゃないわ。', 'もう1枚…ギリギリのスリルを楽しみましょう。'],
    stand: ['スタンドね。では、女帝のヴェールを剥がしましょうか。', 'いい度胸ね。私のカードを開くわよ。'],
    double: ['まあ、ダブルダウン？その情熱、ゾクゾクするわ…！', 'すべてを倍にして1枚に懸けるのね…素敵よ！'],
    split: ['スプリット。華麗に2つの手札を操ってみせなさい。', '欲望を2つに分けるのね。いいわ、付き合ってあげる。'],
    surrender: ['サレンダーね。賢い引き際も大人の嗜みよ。', 'ふふ、深追いしないのね。いい判断だわ。'],
    insurance: ['私の表カードはAよ。保険で身を守るかしら？', 'インシュランスの時間よ。あなたの直感はなんて言ってる？'],
    dealerBust: ['あら…私も熱くなりすぎたみたい。バーストよ♪', '21を超えてしまったわ。あなたの勝ちね、お見事。'],
    dealerBj: ['ふふっ、ごめんなさいね。女帝の21よ♪', '完璧な21だわ。今夜は私がリードするわね。'],
    playerBj: ['ブラボー！ナチュラル・ブラックジャック21…惚れ惚れするわ！', 'なんて美しい21かしら！黄金の配当を受け取りなさい♪'],
    win: ['あなたの勝ちよ。グラスを掲げましょう♪', '素敵なプレイね。チップがあなたに微笑んでいるわ。'],
    bigWin: ['ファンタスティック！今夜のテーブルはあなたが支配しているわね！', '特大の勝利よ！女帝から祝福を贈るわ♪'],
    push: ['引き分けね。焦らすじゃない♪', 'プッシュよ。次のハンドでもっと熱くなりましょう。'],
    lose: ['あら、私の勝ちね。まだ夜はこれからよ？', 'ふふ、そう簡単には攻略させないわよ。'],
    refill: ['1,000チップを用意させたわ。さあ、もっと私を楽しませなさい♪', 'VIPからのプレゼントよ。たっぷり遊んでちょうだい。'],
  },
  jin: {
    greet: [
      '黒崎ジンだ。ブラックジャックは度胸と計算の勝負…楽しませてくれよ。',
      '1枚引くか止まるか、その一瞬に魂が宿る。始めようぜ。',
    ],
    deal: ['配るぜ。まずは2枚、じっくり見極めな。', 'ディールだ。勝負の火蓋を切るぞ。'],
    hit: ['ヒットだな。攻めの姿勢、嫌いじゃねえ。', 'もう1枚いくか。ほらよ！'],
    stand: ['スタンドだな。じゃあ、俺の伏せカードを開けるぜ。', 'そこで勝負か。いい判断だ。'],
    double: ['ダブルダウン…！ここ一番で踏み込める奴が最後に勝つんだ。', '倍賭けの1枚ドロー！痺れる勝負だな！'],
    split: ['スプリットか。両手で獲りに行くとは豪気だな。', 'ペアを割ったな。2連勝を狙ってみな。'],
    surrender: ['サレンダーか。無駄死にしないのもプロの流儀だ。', '半額残して次へ繋ぐ…渋い選択だな。'],
    insurance: ['俺の表カードはAだ。インシュランスはどうする？', '保険を掛けるか、そのまま突っ込むか…選びな。'],
    dealerBust: ['ちっ、引きすぎたか…ディーラーバーストだ。持っていきな。', '21オーバーだ。お前のプレッシャーに押されたかな。'],
    dealerBj: ['悪く思うな、21だ。', 'ディーラー21成立だ。次でやり返しな。'],
    playerBj: ['ブラックジャック21！文句なしの一撃だ、見事だぜ！', '初手21かよ…！お前、本物のツキを持ってるな！'],
    win: ['お前の勝ちだ。いい勝負勘してるじゃねえか。', 'ナイスハンドだ。チップを持っていきな。'],
    bigWin: ['デカいヤマを獲ったな！これだからカジノはやめられねえ！', '圧巻のダブル勝利だ！今夜は誰も止められねえな！'],
    push: ['プッシュだ。五分と五分、次で決着をつけようぜ。', '引き分けか。悪くねえ緊張感だ。'],
    lose: ['今回は俺の勝ちだ。だが目は死んでねえな、次いくぞ。', '勝負には波がある。焦らずチャンスを待て。'],
    refill: ['1,000チップ補充したぜ。何度倒れても立ち上がる奴が勝者だ。', '新しいチップだ。ここから伝説を作りな。'],
  },
  luna: {
    greet: [
      '星野ルナです。今夜のシューには、きらめく21の星が眠っていますよ。',
      'カードの巡りは星の巡り…あなたに幸運の導きがありますように。',
    ],
    deal: ['カードを配ります…星々が静かに囁いています。', 'ディールです。運命の2枚をご覧ください。'],
    hit: ['ヒットですね。新しい星を1枚引き寄せます。', 'もう1枚…光が重なりますように。'],
    stand: ['スタンドですね。それではディーラーの星を開きましょう。', '静かな決断ですね。オープンします。'],
    double: ['ダブルダウン…！強い輝きを感じます、運命の1枚です！', '星が告げる好機ですね。倍の輝きを込めましょう！'],
    split: ['スプリット。双子座のように2つの道が拓かれました。', 'ペアを分けます。どちらの手にも祝福を。'],
    surrender: ['サレンダーですね。今は月影に身を潜める時です。', '賢明な星読みです。次の巡りを待ちましょう。'],
    insurance: ['Aのカードが現れました。インシュランスの護りを掛けますか？', '波乱の星回りです。保険ベットはどうなさいますか？'],
    dealerBust: ['あっ…星が溢れてしまいました。ディーラーバーストです。', '21を超えてしまいましたね…あなたの勝利です♪'],
    dealerBj: ['星導の21が揃いました。ふふ、少し眩しかったでしょうか。', 'ディーラーの21です。次の星座を紡ぎましょう。'],
    playerBj: ['素晴らしい…！ナチュラル・ブラックジャック21、一等星の輝きです！', '奇跡の21が完成しました！星々も祝福していますよ♪'],
    win: ['あなたの勝利です。美しいカードの調和でしたね。', 'おめでとうございます。幸運の軌道に乗っていますよ。'],
    bigWin: ['流星群のようなビッグウィンです…！忘れられない夜になりますね♪', '圧巻の勝利…あなたの星がひときわ強く輝いています！'],
    push: ['プッシュ、引き分けです。2つの星が同じ高さで並びましたね。', '均衡のハンドです。チップはそのままお返しします。'],
    lose: ['今回は影が差しましたね…でも、夜明けはすぐそこです。', '星読みが少しずれましたね。次のハンドで整えましょう。'],
    refill: ['星屑のチップを1,000枚お贈りします。物語を続けましょう。', '無料チップを補給しました。新しい運気が満ちていきますよ。'],
  },
  sakura: {
    greet: ['天宮サクラがディーラーを務めさせていただきますわ。良き一局にいたしましょう。', '桜花のように凛と、21の頂きを競いましょう。'],
    deal: ['カードを配りますわ。お覚悟はよろしくて？', 'ディールいたします。いざ尋常に勝負ですわ。'],
    hit: ['ヒットですわね。もう一太刀、参ります！', '攻めの姿勢、天晴れですわ。カードを引きます。'],
    stand: ['スタンドですわね。では私の手札をお見せいたしましょう。', '静かなる構え…お見事ですわ。オープンいたします。'],
    double: ['ダブルダウン！？乾坤一擲の勝負、お受けいたしますわ！', '倍賭けの一閃…その気迫、見事ですわ！'],
    split: ['スプリットですわね。二刀流の舞、拝見いたしますわ！', '手札を二つに分けますわ。どちらも正々堂々参りましょう。'],
    surrender: ['サレンダーですわね。退くもまた武士の嗜みですわ。', '半額を温存して次へ繋ぐ…賢明なご判断ですわ。'],
    insurance: ['私の表カードはAですわ。インシュランスはいかがなさいますか？', '備えあれば憂いなし…保険ベットをお掛けになりますか？'],
    dealerBust: ['ああっ…！踏み込みすぎましたわ、バーストです…！', '21を超えてしまいましたわ。お見事、あなたの勝ちです。'],
    dealerBj: ['桜花一閃、21の完成ですわ。', 'ディーラー21、この一局は私が頂きますわね。'],
    playerBj: ['お見事！ナチュラル・ブラックジャック21、桜吹雪の祝砲ですわ！', '初太刀で21とは…！天晴れな強運ですわ♪'],
    win: ['あなたの勝利ですわ。清々しい打ち筋でした。', 'おめでとうございます。配当をお受け取りくださいませ。'],
    bigWin: ['百花繚乱の大勝利ですわ！今夜の主役は間違いなくあなたです！', 'これほどの勝利…桜の花も満開に咲き誇っておりますわ♪'],
    push: ['引き分けですわね。互角の勝負、次で決着をつけましょう。', 'プッシュですわ。チップはお返しいたします。'],
    lose: ['今回は私の勝ちですわね。次の一局でお待ちしております。', '勝負は時の運でもありますわ。気を落とさず参りましょう。'],
    refill: ['1,000チップをご用意いたしましたわ。再び花を咲かせましょう！', '軍資金を補給いたしました。いざ再戦ですわ！'],
  },
  alice: {
    greet: ['ふふっ、アリスのお茶会兼ブラックジャックテーブルへようこそ♪', '21のワンダーランドで、とびきり甘い勝負をしましょ！'],
    deal: ['カードを配るわよ〜！ウサギさんより速くね♪', 'ディール開始！どんな不思議が飛び出すかしら？'],
    hit: ['ヒットね！もう1枚、お菓子みたいにどうぞ♪', '欲張りさんね〜！はい、もう1枚よ！'],
    stand: ['スタンドね！じゃあアリスの秘密を開けちゃうわよ♪', 'そこでストップ？ふふ、勝負の時間ね！'],
    double: ['ダブルダウン！？倍賭けでワンダーランドへ飛び込むのね！', 'ドキドキの1枚勝負！アリスもワクワクしちゃう♪'],
    split: ['スプリット！鏡の国みたいにハンドが2つになったわ♪', 'ペアを半分こね！どっちも勝てるかしら？'],
    surrender: ['サレンダーね。お茶を飲んで一休みしましょ♪', '半分残して次へ行くのね、賢いウサギさんだわ！'],
    insurance: ['あら、Aが出ちゃった！インシュランスの魔法をかけておく？', 'ブラックジャック保険、どうする？'],
    dealerBust: ['きゃあっ！21を超えちゃった〜！アリスのバーストよ！', 'うっかり引きすぎちゃった♪ あなたの勝ちよ！'],
    dealerBj: ['えへへ♪ アリスの21、決まっちゃった！', 'ワンダーランドの魔法で21よ♪'],
    playerBj: ['すごーいっ！ナチュラル・ブラックジャック21よ！拍手〜♪', 'いきなり21なんて魔法みたい！おめでとう♪'],
    win: ['あなたの勝ちよ♪ ティーパーティーでお祝いしましょ！', 'ナイスプレイ！チップがキラキラ増えていくわね♪'],
    bigWin: ['とびきりのビッグウィンよ〜っ！不思議の国の王様ね♪', 'すごすぎるわ！テーブル中のチップがあなたに夢中よ♪'],
    push: ['引き分けでプッシュよ♪ 仲良くおあいこね！', '同じ数字ね！もう1回あそびましょ♪'],
    lose: ['ふふ、今回はアリスの勝ち♪ 次はどう攻めてくるのかしら？', 'ざんねん！でも次の一手できっと魔法が起きるわよ♪'],
    refill: ['1,000チップをプレゼントよ♪ お茶会はまだまだ終わらないわ！', 'チップを満タンにしたわよ！さあ次の冒険へいきましょ♪'],
  },
  leon: {
    greet: ['獅子堂レオンだ。黄金の王座にふさわしい21の勝負をしようじゃないか！', 'ブラックジャックでも王者の誇りは揺るがない。かかってこい！'],
    deal: ['ディールする！王者のテーブルに臆するなよ！', 'カードを配ったぞ。堂々と勝負しろ！'],
    hit: ['ヒットだな！恐れず前に出る姿勢、気に入った！', 'もう1枚だ！運命を切り拓け！'],
    stand: ['スタンドか！ならば王者のハンドを開示しよう！', 'よし、真っ向勝負だな！オープンだ！'],
    double: ['ダブルダウン！倍の輝きを懸けた渾身の一撃だな！', '王道を行く倍賭け勝負…受けて立つぞ！'],
    split: ['スプリット！双頭の獅子の如く攻め立てるか！', 'ペア分割だな！両方のハンドで勝利を掴んでみせろ！'],
    surrender: ['サレンダーか。戦力を温存するのも名将の器だ。', '退く時は潔く退く…次のハンドで借りを返せ！'],
    insurance: ['俺のアップカードはAだ。インシュランスを張るか？', '王者のAに対して保険を掛けるか？選ぶがいい！'],
    dealerBust: ['ぐっ…！王としたことが踏み込みすぎたか！バーストだ！', '21を超えたか…見事だ、お前の勝ちだ！'],
    dealerBj: ['ハッハッハ！黄金の21、これぞ王者の貫禄だ！', 'ディーラー21成立！正面からねじ伏せてもらったぞ！'],
    playerBj: ['見事だ！！ナチュラル・ブラックジャック21、王者の俺も脱帽の一撃だ！', '最高の21だな！誇り高く配当を受け取れ！'],
    win: ['お前の勝ちだ！堂々たるプレイングだったぞ！', '素晴らしい勝利だ！チップを胸を張って受け取れ！'],
    bigWin: ['圧倒的なビッグウィンだ！今夜の王冠はお前にこそふさわしい！', '凄まじい大勝だな！俺の心まで熱くさせてくれる！'],
    push: ['引き分けだ！互角の激突、実に心地いいぞ！', 'プッシュだな！決着は次のハンドへ持ち越しだ！'],
    lose: ['俺の勝ちだな！だがお前の闘志はまだ消えていないはずだ！', '王者の壁は高いぞ！何度でも挑んでこい！'],
    refill: ['1,000チップを授けよう！再び王座を目指して立ち上がれ！', '王からの軍資金だ！ここから大逆転劇を見せてみろ！'],
  },
  chloe: {
    greet: ['クロエ・ヴァルモンよ。このシューの残りカード、すべて記憶しているわ。', '21への最短経路、私のアルゴリズムで検証してあげる。'],
    deal: ['ディール完了。初期ハンドの期待値を算出するわ。', 'カードを配ったわ。冷静に最適解を選びなさい。'],
    hit: ['ヒットね。残りシューのローカード比率なら妥当よ。', '1枚追加するわ。数値は嘘をつかないわよ。'],
    stand: ['スタンドを確認。ディーラーのドローシミュレーションを開始するわ。', 'そこで止めるのね。悪くない判断よ。'],
    double: ['ダブルダウン。期待値最大の好機を逃さなかったわね。', '倍賭けの1枚ドロー…計算通りの攻めね。'],
    split: ['スプリットね。独立した2ハンドで分散を抑える定石よ。', 'ペアを分割するわ。順々に最適処理しましょう。'],
    surrender: ['サレンダーね。期待値がマイナス0.5を下回るならそれが正解よ。', '無駄な失点を防いだわね。スマートよ。'],
    insurance: ['アップカードAを確認。インシュランスはどうする？', '保険ベットの選択よ。カウント状況から判断しなさい。'],
    dealerBust: ['ちっ…低確率のバーストを引いたわね。あなたの勝ちよ。', 'ディーラーバーストを確認。計算外のノイズね。'],
    dealerBj: ['ディーラー21。確率通り、私が回収するわ。', '21成立よ。これが統計の帰結ね。'],
    playerBj: ['ナチュラル・ブラックジャック21を確認…完璧なタイミングね。', '3対2配当の成立よ。見事な抽出力ね。'],
    win: ['あなたの勝ちよ。セオリーに忠実な美しいハンドだったわ。', 'プラス収支ね。この調子でデータを積み上げましょう。'],
    bigWin: ['特大のプラス収支ね…私の予測モデルを超えるビッグウィンよ。', '完璧なダブル勝利。あなたの判断力を高く評価するわ。'],
    push: ['プッシュよ。収支変動なし、次のサンプルへ進みましょう。', '同点ね。均衡状態だわ。'],
    lose: ['今回はディーラーの勝ちよ。感情的にならず次を見なさい。', '短期の下振れよ。ベーシックストラテジーを維持することね。'],
    refill: ['1,000チップを再チャージしたわ。セッションを継続しましょう。', 'チップを補給したわよ。データの再収集を始めましょう。'],
  },
  hibiki: {
    greet: ['紅蓮ヒビキよ！ブラックジャックもテンポよくガンガン攻めていくわよ！', '21ギリギリのビート、あんたも乗ってきなさい！'],
    deal: ['配るわよ！リズムに乗っていきなさい！', 'ディール開始！熱いハンドを叩き込むわよ！'],
    hit: ['ヒットね！ガンガン攻めるじゃない！', 'もう1枚いくわよ！ほら、キャッチしな！'],
    stand: ['スタンドね！じゃあ私のターン、一気にめくるわよ！', 'そこで止めたわね！勝負のビートを刻むわよ！'],
    double: ['ダブルダウン！？最高にロックな倍賭けじゃない！！', '1枚に全部乗せるそのノリ、大好きよ！いくわよ！'],
    split: ['スプリット！ツインギターみたいに2ハンドで攻めるわね！', 'ペアを割ったわね！両方でぶち抜きなさい！'],
    surrender: ['サレンダーね！次のサビに向けて体力を温存しましょ！', '半分戻して次へ行くわよ！切り替えが大事ね！'],
    insurance: ['Aが出たわよ！インシュランスはどうする？', '保険を掛けておく？直感で決めなさい！'],
    dealerBust: ['うわっ、飛ばしすぎてバーストしちゃった！あんたの勝ちよ！', '21オーバー！あんたの熱気に当てられたわね♪'],
    dealerBj: ['イェーイ！私の21が決まったわ！最高のグルーヴでしょ！', 'ディーラー21！このビートは止められないわよ！'],
    playerBj: ['サイコーッ！！ナチュラル・ブラックジャック21、痺れる一撃よ！', 'いきなり21なんてテンション爆上がりね！おめでとう！'],
    win: ['あんたの勝ちよ！いいノリしてるじゃない！', 'ナイスウィン！このまま連勝記録を塗り替えなさい！'],
    bigWin: ['ド派手なビッグウィンきたわねーっ！！会場中が大歓声よ！', '文句なしの大勝利！今夜のヘッドライナーはあんたよ！'],
    push: ['プッシュで引き分け！いいセッションだったわね！', '同点よ！次のハンドでもっと熱くぶつかりましょ！'],
    lose: ['今回は私の勝ちね！でもまだアンコールが残ってるわよ！', 'ドンマイ！次のハンドで倍にして返しなさい！'],
    refill: ['1,000チップを緊急チャージしたわ！まだまだライブは続くわよ！', 'チップ満タンよ！ここから大逆転のシャウトを聴かせなさい！'],
  },
  suou: {
    greet: ['蘇芳だ。ブラックジャックという静かな心理戦…お相手いたそう。', '21という均衡点、どちらが美しく辿り着けるか楽しみですね。'],
    deal: ['カードを配りましょう。静かに呼吸を整えて。', 'ディールいたしました。局面を見極めてください。'],
    hit: ['ヒットですね。1枚、静かに添えましょう。', 'さらに踏み込まれますか。どうぞ。'],
    stand: ['スタンドですね。では私の伏せ札を開きましょう。', '良い間合いです。勝負と参りましょう。'],
    double: ['ダブルダウン…静寂の中に鋭い闘志を感じますね。', '倍賭けの一手、見届けさせていただきます。'],
    split: ['スプリットですね。二つの流れを同時に操るとは風流です。', 'ペアを分けましたね。それぞれの行く末を見守りましょう。'],
    surrender: ['サレンダーですか。無理をせず退くのも達人の眼力です。', '半額を戻しましょう。次の一局が楽しみですね。'],
    insurance: ['私の表札はAです。インシュランスはいかがなさいますか？', '備えを置くか、そのまま受けるか…お選びください。'],
    dealerBust: ['おや…少し欲が出ましたか。ディーラーバーストです。', '21を超えてしまいました。あなたの静かな圧に負けましたね。'],
    dealerBj: ['ふふ、21が整いました。悪しからず。', 'ディーラー21です。今回は私の勝ちとさせていただきます。'],
    playerBj: ['見事なナチュラル・ブラックジャック21…一点の曇りもない美しさです。', '初手で21とは恐れ入りました。祝杯を挙げましょう。'],
    win: ['あなたの勝利です。実に洗練された判断でした。', 'お見事です。チップをお受け取りください。'],
    bigWin: ['圧巻のビッグウィンですね…テーブルの空気が一変しましたよ。', 'これほどの大勝、なかなか拝めるものではありません。天晴れです。'],
    push: ['プッシュ、引き分けですね。心地よい緊張感でした。', '同点ですか。決着は次の一局へ預けましょう。'],
    lose: ['今回は私が頂きました。ですが、あなたの目はまだ揺らいでいませんね。', '勝負の潮目は常に移ろいます。焦らず次を待ちましょう。'],
    refill: ['1,000チップをご用意いたしました。どうぞ心ゆくまでお楽しみください。', '新しいチップをお納めください。ここからまた紡ぎ直しましょう。'],
  },
};

function pickDealerLine(id: CharId, ev: BjVoiceEvent): string {
  const list = DEALER_BJ_LINES[id][ev];
  return list[Math.floor(Math.random() * list.length)];
}

function speakDealerLine(text: string, chId: CharId, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  const ch = CHARACTERS[chId];
  holdemAudio.speak(text, {
    charId: chId,
    gender: ch.voiceGender,
    pitch: ch.voicePitch,
    rate: ch.voiceRate,
    enabled,
  });
}

interface CutInBannerState {
  key: number;
  title: string;
  subtitle: string;
  line: string;
  charId: CharId;
}

export function evaluateBlackjackHand(cards: CardItem[]): {
  total: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
  isPair: boolean;
} {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    if (!c.faceUp) continue;
    if (c.rank === 1) {
      aces += 1;
      sum += 11;
    } else if (c.rank >= 10) {
      sum += 10;
    } else {
      sum += c.rank;
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces -= 1;
  }
  const faceUpCards = cards.filter((c) => c.faceUp);
  const isBlackjack = faceUpCards.length === 2 && sum === 21;
  const bjVal = (r: number) => (r >= 10 ? 10 : r);
  const isPair =
    faceUpCards.length === 2 && bjVal(faceUpCards[0].rank) === bjVal(faceUpCards[1].rank);

  return {
    total: sum,
    isSoft: aces > 0 && sum <= 21,
    isBlackjack,
    isBust: sum > 21,
    isPair,
  };
}

function createSixDeckShoe(): CardItem[] {
  const all: CardItem[] = [];
  for (let d = 0; d < SHOE_DECKS; d += 1) {
    all.push(...createStandardDeck(true, d + 1));
  }
  return shuffleWithRng(all);
}

function getHiLoValue(rank: number): number {
  if (rank >= 2 && rank <= 6) return 1;
  if (rank >= 7 && rank <= 9) return 0;
  return -1; // 10, J, Q, K, A
}

function getBasicStrategyRecommendation(
  hand: PlayerHand,
  dealerUpCard: CardItem | undefined,
  canSplit: boolean,
  canDouble: boolean,
  canSurrender: boolean
): {
  action: string;
  reason: string;
  badgeColor: string;
} {
  if (!dealerUpCard) {
    return {
      action: 'ベットしてディール',
      reason: 'チップを賭けて「DEAL（配る）」を押してください。',
      badgeColor: 'bg-emerald-500 text-slate-950',
    };
  }

  const evalRes = evaluateBlackjackHand(hand.cards);
  const dVal = dealerUpCard.rank === 1 ? 11 : Math.min(10, dealerUpCard.rank);

  if (evalRes.isBlackjack) {
    return {
      action: 'ブラックジャック！',
      reason: 'ナチュラル21達成！ディーラーがBJでなければ1.5倍配当が確定します。',
      badgeColor: 'bg-amber-400 text-slate-950',
    };
  }

  // Surrender check on hard 16 vs 9,10,A or hard 15 vs 10
  if (canSurrender && !evalRes.isSoft && !evalRes.isPair) {
    if (evalRes.total === 16 && (dVal === 9 || dVal === 10 || dVal === 11)) {
      return {
        action: 'サレンダー (Surrender)',
        reason: `ハード16 対 ディーラーの強いアップカード(${dVal === 11 ? 'A' : dVal})は期待値マイナスが大きく、半額返却のサレンダーが最善です。`,
        badgeColor: 'bg-rose-400 text-slate-950',
      };
    }
    if (evalRes.total === 15 && dVal === 10) {
      return {
        action: 'サレンダー (Surrender)',
        reason: 'ハード15 対 ディーラー10はサレンダーで損失を-0.5unitに抑えるのが数学的最適解です。',
        badgeColor: 'bg-rose-400 text-slate-950',
      };
    }
  }

  // Pair splitting strategy
  if (canSplit && evalRes.isPair) {
    const pairRank = hand.cards[0].rank === 1 ? 11 : Math.min(10, hand.cards[0].rank);
    if (pairRank === 11 || pairRank === 8) {
      return {
        action: 'スプリット (Split)',
        reason: 'Aのペアと8のペアはディーラーのカードに関わらず常にスプリットが鉄則です。',
        badgeColor: 'bg-purple-400 text-slate-950',
      };
    }
    if (pairRank === 9 && dVal !== 7 && dVal !== 10 && dVal !== 11) {
      return {
        action: 'スプリット (Split)',
        reason: '9のペアはディーラーが7・10・A以外のときはスプリットして有利を広げます。',
        badgeColor: 'bg-purple-400 text-slate-950',
      };
    }
    if ((pairRank === 2 || pairRank === 3 || pairRank === 7) && dVal >= 2 && dVal <= 7) {
      return {
        action: 'スプリット (Split)',
        reason: `ディーラーのアップカード(${dVal})が弱いため、スプリットして攻めるのが期待値最大です。`,
        badgeColor: 'bg-purple-400 text-slate-950',
      };
    }
    if (pairRank === 6 && dVal >= 2 && dVal <= 6) {
      return {
        action: 'スプリット (Split)',
        reason: '6のペアはディーラーが2〜6のバーストしやすいカードのときスプリットします。',
        badgeColor: 'bg-purple-400 text-slate-950',
      };
    }
  }

  // Soft Totals
  if (evalRes.isSoft) {
    if (evalRes.total >= 19) {
      return {
        action: 'スタンド (Stand)',
        reason: `ソフト${evalRes.total}は十分に強い完成手のためスタンドが最善です。`,
        badgeColor: 'bg-amber-400 text-slate-950',
      };
    }
    if (evalRes.total === 18) {
      if (canDouble && dVal >= 3 && dVal <= 6) {
        return {
          action: 'ダブルダウン (Double)',
          reason: 'ソフト18 対 ディーラー3〜6はバーストの危険がなくダブルダウンで利益を最大化できます。',
          badgeColor: 'bg-cyan-400 text-slate-950',
        };
      }
      if (dVal >= 9 || dVal === 11) {
        return {
          action: 'ヒット (Hit)',
          reason: 'ディーラーが9・10・Aのとき、18では負け越しやすいためヒットして19以上を狙います。',
          badgeColor: 'bg-emerald-400 text-slate-950',
        };
      }
      return {
        action: 'スタンド (Stand)',
        reason: 'ソフト18 対 ディーラー2・7・8はスタンドで手堅く勝ち越せます。',
        badgeColor: 'bg-amber-400 text-slate-950',
      };
    }
    if (canDouble && dVal >= 4 && dVal <= 6) {
      return {
        action: 'ダブルダウン (Double)',
        reason: `ソフト${evalRes.total} 対 ディーラーのローカード(${dVal})は1枚引いてもバーストしないためダブルが有利です。`,
        badgeColor: 'bg-cyan-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: `ソフト${evalRes.total}は1枚引いても絶対にバーストしないためヒットして手を伸ばします。`,
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }

  // Hard Totals
  if (evalRes.total >= 17) {
    return {
      action: 'スタンド (Stand)',
      reason: `ハード${evalRes.total}以上でのヒットはバースト確率が極めて高いため必ずスタンドします。`,
      badgeColor: 'bg-amber-400 text-slate-950',
    };
  }
  if (evalRes.total >= 13 && evalRes.total <= 16) {
    if (dVal >= 2 && dVal <= 6) {
      return {
        action: 'スタンド (Stand)',
        reason: `ディーラーのアップカード(${dVal})はバースト率が高いため、無理に引かずスタンドが定石です。`,
        badgeColor: 'bg-amber-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: `ディーラーのアップカード(${dVal === 11 ? 'A' : dVal})が強く、このままでは勝率が低いためヒットします。`,
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }
  if (evalRes.total === 12) {
    if (dVal >= 4 && dVal <= 6) {
      return {
        action: 'スタンド (Stand)',
        reason: 'ハード12 対 ディーラー4〜6はディーラーのバースト待ちスタンドが期待値プラスです。',
        badgeColor: 'bg-amber-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: 'ハード12 対 2・3または7〜Aは10系以外ならバーストしないためヒットが最善です。',
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }
  if (evalRes.total === 11) {
    if (canDouble && dVal !== 11) {
      return {
        action: 'ダブルダウン (Double)',
        reason: '合計11は10点札を引けば21になる最強のチャンス手！ダブルダウンが圧倒的に有利です。',
        badgeColor: 'bg-cyan-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: '合計11はバースト率0%で21を狙えるため積極的にヒットします。',
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }
  if (evalRes.total === 10) {
    if (canDouble && dVal >= 2 && dVal <= 9) {
      return {
        action: 'ダブルダウン (Double)',
        reason: '合計10 対 ディーラー2〜9は20を作れる確率が高くダブルダウンが定石です。',
        badgeColor: 'bg-cyan-400 text-slate-950',
      };
    }
    return {
      action: 'ヒット (Hit)',
      reason: 'バーストの危険がないためヒットして強い役を作ります。',
      badgeColor: 'bg-emerald-400 text-slate-950',
    };
  }
  if (evalRes.total === 9 && canDouble && dVal >= 3 && dVal <= 6) {
    return {
      action: 'ダブルダウン (Double)',
      reason: '合計9 対 ディーラー3〜6はダブルダウンで期待値を伸ばせます。',
      badgeColor: 'bg-cyan-400 text-slate-950',
    };
  }

  return {
    action: 'ヒット (Hit)',
    reason: `合計${evalRes.total}はバースト率0%のためヒットして17以上を目指します。`,
    badgeColor: 'bg-emerald-400 text-slate-950',
  };
}

export default function BlackjackGame() {
  const [shoe, setShoe] = useState<CardItem[]>(() => createSixDeckShoe());
  const [runningCount, setRunningCount] = useState<number>(0);
  const [chips, setChips] = useState<number>(1000);
  const [betInput, setBetInput] = useState<number>(100);
  const [phase, setPhase] = useState<'betting' | 'insurance' | 'player' | 'settled'>('betting');
  const [dealerCards, setDealerCards] = useState<CardItem[]>([]);
  const [playerHands, setPlayerHands] = useState<PlayerHand[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState<number>(0);
  const [insuranceBet, setInsuranceBet] = useState<number>(0);
  const [showStrategyNav, setShowStrategyNav] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(true);
  useCardTableBgm(bgmOn, 'jazz');

  // Royal Flush Night Lounge World State
  const [dealerId, setDealerId] = useState<CharId>('koharu');
  const [dealerExpr, setDealerExpr] = useState<Expression>('normal');
  const [dealerBubble, setDealerBubble] = useState<string>(
    DEALER_BJ_LINES.koharu.greet[0]
  );
  const [felt, setFelt] = useState<FeltId>('emerald');
  const [cutIn, setCutIn] = useState<CutInBannerState | null>(null);
  const cutInTimerRef = useRef<number | null>(null);

  const [bannerText, setBannerText] = useState<string>(
    'ベット額を決めて「DEAL（カードを配る）」をタップしてください'
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, pushes: 0, blackjacks: 0 });

  const dealerChar = CHARACTERS[dealerId];
  const currentFeltObj = FELTS.find((f) => f.id === felt) ?? FELTS[0];

  const triggerDealerReaction = useCallback(
    (ev: BjVoiceEvent, expr: Expression = 'normal', overrideId?: CharId) => {
      const targetId = overrideId ?? dealerId;
      const line = pickDealerLine(targetId, ev);
      setDealerExpr(expr);
      setDealerBubble(line);
      speakDealerLine(line, targetId, voiceOn);
      return line;
    },
    [dealerId, voiceOn]
  );

  const triggerCutIn = useCallback(
    (title: string, subtitle: string, line: string, charId: CharId) => {
      if (cutInTimerRef.current) {
        window.clearTimeout(cutInTimerRef.current);
      }
      const key = Date.now();
      setCutIn({ key, title, subtitle, line, charId });
      cutInTimerRef.current = window.setTimeout(() => {
        setCutIn((prev) => (prev?.key === key ? null : prev));
      }, 1850);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (cutInTimerRef.current) {
        window.clearTimeout(cutInTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('zatsudan_blackjack_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as {
          chips?: number;
          stats?: { wins: number; losses: number; pushes: number; blackjacks: number };
          dealerId?: CharId;
          felt?: FeltId;
          voiceOn?: boolean;
        };
        if (typeof parsed.chips === 'number' && parsed.chips > 0) setChips(parsed.chips);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.dealerId && CHAR_IDS.includes(parsed.dealerId)) {
          setDealerId(parsed.dealerId);
          setDealerBubble(DEALER_BJ_LINES[parsed.dealerId].greet[0]);
        }
        if (parsed.felt && (parsed.felt === 'emerald' || parsed.felt === 'crimson' || parsed.felt === 'midnight')) {
          setFelt(parsed.felt);
        }
        if (typeof parsed.voiceOn === 'boolean') {
          setVoiceOn(parsed.voiceOn);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveProgress = useCallback(
    (
      nextChips: number,
      nextStats: typeof stats,
      nextDealerId: CharId = dealerId,
      nextFelt: FeltId = felt,
      nextVoiceOn: boolean = voiceOn
    ) => {
      try {
        localStorage.setItem(
          'zatsudan_blackjack_v1',
          JSON.stringify({
            chips: nextChips,
            stats: nextStats,
            dealerId: nextDealerId,
            felt: nextFelt,
            voiceOn: nextVoiceOn,
          })
        );
      } catch {
        // ignore
      }
    },
    [dealerId, felt, voiceOn]
  );

  const handleSelectDealer = useCallback(
    (nextId: CharId) => {
      setDealerId(nextId);
      setDealerExpr('normal');
      const greetLine = pickDealerLine(nextId, 'greet');
      setDealerBubble(greetLine);
      speakDealerLine(greetLine, nextId, voiceOn);
      saveProgress(chips, stats, nextId, felt, voiceOn);
    },
    [chips, stats, felt, voiceOn, saveProgress]
  );

  const handleSelectFelt = useCallback(
    (nextFelt: FeltId) => {
      setFelt(nextFelt);
      saveProgress(chips, stats, dealerId, nextFelt, voiceOn);
    },
    [chips, stats, dealerId, voiceOn, saveProgress]
  );

  const handleRefillChips = useCallback(() => {
    const refilled = Math.max(1000, chips + 1000);
    const targetChips = chips < 10 ? 1000 : refilled;
    setChips(targetChips);
    setBetInput(100);
    saveProgress(targetChips, stats);
    playCardSound('chip', soundOn);
    triggerDealerReaction('refill', 'win');
    setBannerText('🪙 無料チップ +1,000 を補給しました！続けて勝負をお楽しみください！');
  }, [chips, stats, saveProgress, soundOn, triggerDealerReaction]);

  const activeHand = playerHands[activeHandIndex] as PlayerHand | undefined;

  // Live Bust Probability & Shoe True Count calculation
  const liveAnalytics = useMemo(() => {
    const decksRemaining = Math.max(0.5, shoe.length / 52);
    const trueCount = Number((runningCount / decksRemaining).toFixed(1));
    const highCardsLeft = shoe.filter((c) => c.rank === 1 || c.rank >= 10).length;
    const highCardRatio = shoe.length > 0 ? Math.round((highCardsLeft / shoe.length) * 100) : 38;

    let bustProb = 0;
    if (activeHand && phase === 'player') {
      const evalRes = evaluateBlackjackHand(activeHand.cards);
      if (!evalRes.isSoft && evalRes.total >= 12 && shoe.length > 0) {
        const maxSafeRank = 21 - evalRes.total;
        const bustingCards = shoe.filter((c) => {
          const val = c.rank === 1 ? 1 : Math.min(10, c.rank);
          return val > maxSafeRank;
        }).length;
        bustProb = Math.round((bustingCards / shoe.length) * 100);
      }
    }
    return {
      trueCount,
      highCardRatio,
      bustProb,
      cardsRemaining: shoe.length,
    };
  }, [shoe, runningCount, activeHand, phase]);

  const settleAllHands = useCallback(
    (
      currentShoe: CardItem[],
      currentDealer: CardItem[],
      handsToSettle: PlayerHand[],
      insBet: number,
      currentChips: number,
      currentCount: number
    ) => {
      const workingShoe = [...currentShoe];
      let nextCount = currentCount;

      // Reveal dealer hole card
      const revealedDealer = currentDealer.map((c) => {
        if (!c.faceUp) {
          nextCount += getHiLoValue(c.rank);
        }
        return { ...c, faceUp: true };
      });

      const anyLiveHand = handsToSettle.some(
        (h) => h.status !== 'busted' && h.status !== 'surrendered' && h.status !== 'blackjack'
      );

      // Dealer draws until 17+ (stands on all 17s)
      while (anyLiveHand) {
        const dEval = evaluateBlackjackHand(revealedDealer);
        if (dEval.total >= 17) break;
        const nextCard = workingShoe.shift();
        if (!nextCard) break;
        const faceUpCard = { ...nextCard, faceUp: true };
        nextCount += getHiLoValue(faceUpCard.rank);
        revealedDealer.push(faceUpCard);
      }

      const dFinal = evaluateBlackjackHand(revealedDealer);
      let chipDelta = 0;

      // Insurance payout if dealer has Blackjack
      if (insBet > 0 && dFinal.isBlackjack) {
        chipDelta += insBet * 3; // returns insBet + 2:1 profit
      }

      let winInc = 0;
      let lossInc = 0;
      let pushInc = 0;
      let bjInc = 0;
      let hasDoubleWin = false;

      const settledHands: PlayerHand[] = handsToSettle.map((h) => {
        const pEval = evaluateBlackjackHand(h.cards);
        if (h.status === 'surrendered') {
          const returned = Math.floor(h.bet / 2);
          chipDelta += returned;
          lossInc += 1;
          return { ...h, outcome: 'surrender', payout: returned };
        }
        if (pEval.isBust) {
          lossInc += 1;
          return { ...h, outcome: 'lose', payout: 0 };
        }
        if (pEval.isBlackjack && handsToSettle.length === 1) {
          if (dFinal.isBlackjack) {
            chipDelta += h.bet;
            pushInc += 1;
            return { ...h, outcome: 'push', payout: h.bet };
          }
          const bjReturn = Math.floor(h.bet * 2.5);
          chipDelta += bjReturn;
          winInc += 1;
          bjInc += 1;
          return { ...h, outcome: 'blackjack', payout: bjReturn };
        }
        if (dFinal.isBlackjack) {
          lossInc += 1;
          return { ...h, outcome: 'lose', payout: 0 };
        }
        if (dFinal.isBust || pEval.total > dFinal.total) {
          const winReturn = h.bet * 2;
          chipDelta += winReturn;
          winInc += 1;
          if (h.status === 'doubled') {
            hasDoubleWin = true;
          }
          return { ...h, outcome: 'win', payout: winReturn };
        }
        if (pEval.total === dFinal.total) {
          chipDelta += h.bet;
          pushInc += 1;
          return { ...h, outcome: 'push', payout: h.bet };
        }
        lossInc += 1;
        return { ...h, outcome: 'lose', payout: 0 };
      });

      const totalStaked =
        handsToSettle.reduce((acc, h) => acc + h.bet, 0) + insBet;
      const netProfit = chipDelta - totalStaked;
      const updatedChips = currentChips + chipDelta;

      const nextStats = {
        wins: stats.wins + winInc,
        losses: stats.losses + lossInc,
        pushes: stats.pushes + pushInc,
        blackjacks: stats.blackjacks + bjInc,
      };

      setShoe(workingShoe);
      setRunningCount(nextCount);
      setDealerCards(revealedDealer);
      setPlayerHands(settledHands);
      setChips(updatedChips);
      if (updatedChips >= 10) {
        setBetInput((prev) => Math.min(prev, updatedChips));
      }
      setStats(nextStats);
      setPhase('settled');
      saveProgress(updatedChips, nextStats);

      const summaryLabels = settledHands.map((h) => {
        const ev = evaluateBlackjackHand(h.cards);
        const tag =
          h.outcome === 'blackjack'
            ? 'BJ勝'
            : h.outcome === 'win'
              ? '勝ち'
              : h.outcome === 'push'
                ? '引分'
                : h.outcome === 'surrender'
                  ? '降参'
                  : '負け';
        return `${ev.total}(${tag})`;
      });

      setHistory((prev) => [
        {
          id: Date.now(),
          dealerTotal: dFinal.isBlackjack
            ? 'BJ(21)'
            : dFinal.isBust
              ? `BUST(${dFinal.total})`
              : String(dFinal.total),
          handSummaries: summaryLabels,
          netChange: netProfit,
        },
        ...prev.slice(0, 7),
      ]);

      if (bjInc > 0) {
        playCardSound('win', soundOn);
        const line = triggerDealerReaction('playerBj', 'win');
        triggerCutIn(
          'BLACKJACK 21!!',
          `NATURAL 21 — +${netProfit.toLocaleString()} CHIPS (3:2 PAYOUT)`,
          line,
          dealerId
        );
        setBannerText(`🎉 BLACKJACK 21達成！ +${netProfit.toLocaleString()} チップ獲得しました！`);
      } else if (netProfit > 0) {
        playCardSound('win', soundOn);
        if (hasDoubleWin || netProfit >= 400) {
          const line = triggerDealerReaction('bigWin', 'win');
          triggerCutIn(
            hasDoubleWin ? 'DOUBLE DOWN WIN!!' : 'ROYAL BIG WIN!!',
            `VICTORY — +${netProfit.toLocaleString()} CHIPS`,
            line,
            dealerId
          );
        } else if (dFinal.isBust) {
          triggerDealerReaction('dealerBust', 'win');
        } else {
          triggerDealerReaction('win', 'win');
        }
        setBannerText(`🎉 勝利！ +${netProfit.toLocaleString()} チップ獲得しました！`);
      } else if (netProfit === 0) {
        playCardSound('card', soundOn);
        triggerDealerReaction('push', 'normal');
        setBannerText('🤝 プッシュ（引き分け）！ ベット額がそのまま返却されました。');
      } else {
        playCardSound('error', soundOn);
        if (dFinal.isBlackjack || dFinal.total === 21) {
          triggerDealerReaction('dealerBj', 'win');
        } else {
          triggerDealerReaction('lose', 'normal');
        }
        setBannerText(
          `ディーラー ${dFinal.isBust ? 'バースト' : dFinal.total} / 収支 ${netProfit.toLocaleString()} チップ`
        );
      }
    },
    [stats, saveProgress, soundOn, triggerDealerReaction, triggerCutIn, dealerId]
  );

  const handleDeal = useCallback(() => {
    const validBet = Math.min(chips, Math.max(10, betInput));
    if (validBet <= 0 || chips < 10) return;

    let workingShoe = [...shoe];
    let nextCount = runningCount;
    if (workingShoe.length < RESHUFFLE_THRESHOLD) {
      workingShoe = createSixDeckShoe();
      nextCount = 0;
    }

    const p1 = { ...workingShoe.shift()!, faceUp: true };
    const d1 = { ...workingShoe.shift()!, faceUp: true };
    const p2 = { ...workingShoe.shift()!, faceUp: true };
    const d2 = { ...workingShoe.shift()!, faceUp: false }; // Hole card face down

    nextCount += getHiLoValue(p1.rank) + getHiLoValue(d1.rank) + getHiLoValue(p2.rank);

    const initialHand: PlayerHand = {
      id: 'hand-0',
      cards: [p1, p2],
      bet: validBet,
      status: 'playing',
    };
    const pEval = evaluateBlackjackHand(initialHand.cards);
    if (pEval.isBlackjack) {
      initialHand.status = 'blackjack';
    }

    const remainingChips = chips - validBet;
    setChips(remainingChips);
    setShoe(workingShoe);
    setRunningCount(nextCount);
    setDealerCards([d1, d2]);
    setPlayerHands([initialHand]);
    setActiveHandIndex(0);
    setInsuranceBet(0);
    playCardSound('card', soundOn);

    // If dealer upcard is Ace, offer Insurance
    if (d1.rank === 1 && !pEval.isBlackjack) {
      setPhase('insurance');
      triggerDealerReaction('insurance', 'normal');
      setBannerText('ディーラーの表カードがAです！インシュランス（保険ベット）をかけますか？');
      return;
    }

    // Dealer 10-value upcard peek for natural Blackjack
    const dealerHasTenUp = d1.rank >= 10;
    const dealerNaturalBj = dealerHasTenUp && d2.rank === 1;

    if (pEval.isBlackjack || dealerNaturalBj) {
      settleAllHands(workingShoe, [d1, d2], [initialHand], 0, remainingChips, nextCount);
      return;
    }

    setPhase('player');
    triggerDealerReaction('deal', 'normal');
    setBannerText('アクションを選択してください（ナビ推奨手を参考にできます）');
  }, [chips, betInput, shoe, runningCount, soundOn, settleAllHands, triggerDealerReaction]);

  const handleInsuranceDecision = useCallback(
    (buyInsurance: boolean) => {
      if (phase !== 'insurance' || playerHands.length === 0) return;
      const hand = playerHands[0];
      const insAmount = buyInsurance ? Math.floor(hand.bet / 2) : 0;
      const nextChips = chips - insAmount;
      setInsuranceBet(insAmount);
      setChips(nextChips);

      // Peek dealer blackjack
      const dPeekEval = evaluateBlackjackHand(
        dealerCards.map((c) => ({ ...c, faceUp: true }))
      );
      if (dPeekEval.isBlackjack) {
        settleAllHands(shoe, dealerCards, playerHands, insAmount, nextChips, runningCount);
        return;
      }

      setPhase('player');
      triggerDealerReaction('deal', 'normal');
      setBannerText(
        buyInsurance
          ? 'インシュランスを掛けました。ディーラーはBJではありません。手番を続行します。'
          : 'ディーラーはブラックジャックではありません。アクションを選択してください。'
      );
      playCardSound('chip', soundOn);
    },
    [phase, playerHands, chips, dealerCards, settleAllHands, shoe, runningCount, soundOn, triggerDealerReaction]
  );

  const advanceOrSettle = useCallback(
    (
      nextShoe: CardItem[],
      nextHands: PlayerHand[],
      currentIdx: number,
      currentChips: number,
      nextCount: number
    ) => {
      if (currentIdx + 1 < nextHands.length) {
        setActiveHandIndex(currentIdx + 1);
        setPlayerHands(nextHands);
        setShoe(nextShoe);
        setRunningCount(nextCount);
        setChips(currentChips);
        setBannerText(`スプリット ハンド #${currentIdx + 2} のアクションを選択してください`);
        return;
      }
      settleAllHands(nextShoe, dealerCards, nextHands, insuranceBet, currentChips, nextCount);
    },
    [dealerCards, insuranceBet, settleAllHands]
  );

  const handleHit = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    const workingShoe = [...shoe];
    const drawn = workingShoe.shift();
    if (!drawn) return;
    const card = { ...drawn, faceUp: true };
    const nextCount = runningCount + getHiLoValue(card.rank);

    const updatedCards = [...activeHand.cards, card];
    const evalRes = evaluateBlackjackHand(updatedCards);

    const updatedHand: PlayerHand = {
      ...activeHand,
      cards: updatedCards,
      status: evalRes.isBust ? 'busted' : evalRes.total === 21 ? 'stood' : 'playing',
    };

    const nextHands = playerHands.map((h, i) => (i === activeHandIndex ? updatedHand : h));
    playCardSound('card', soundOn);

    if (updatedHand.status !== 'playing') {
      advanceOrSettle(workingShoe, nextHands, activeHandIndex, chips, nextCount);
    } else {
      triggerDealerReaction('hit', 'normal');
      setShoe(workingShoe);
      setRunningCount(nextCount);
      setPlayerHands(nextHands);
    }
  }, [
    phase,
    activeHand,
    shoe,
    runningCount,
    playerHands,
    activeHandIndex,
    soundOn,
    advanceOrSettle,
    chips,
    triggerDealerReaction,
  ]);

  const handleStand = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    const updatedHand: PlayerHand = { ...activeHand, status: 'stood' };
    const nextHands = playerHands.map((h, i) => (i === activeHandIndex ? updatedHand : h));
    playCardSound('card', soundOn);
    triggerDealerReaction('stand', 'normal');
    advanceOrSettle(shoe, nextHands, activeHandIndex, chips, runningCount);
  }, [
    phase,
    activeHand,
    playerHands,
    activeHandIndex,
    soundOn,
    advanceOrSettle,
    shoe,
    chips,
    runningCount,
    triggerDealerReaction,
  ]);

  const handleDoubleDown = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    if (activeHand.cards.length !== 2 || chips < activeHand.bet) return;

    const workingShoe = [...shoe];
    const drawn = workingShoe.shift();
    if (!drawn) return;
    const card = { ...drawn, faceUp: true };
    const nextCount = runningCount + getHiLoValue(card.rank);

    const nextChips = chips - activeHand.bet;
    const updatedCards = [...activeHand.cards, card];
    const evalRes = evaluateBlackjackHand(updatedCards);

    const updatedHand: PlayerHand = {
      ...activeHand,
      cards: updatedCards,
      bet: activeHand.bet * 2,
      status: evalRes.isBust ? 'busted' : 'doubled',
    };

    const nextHands = playerHands.map((h, i) => (i === activeHandIndex ? updatedHand : h));
    playCardSound('chip', soundOn);
    triggerDealerReaction('double', 'normal');
    advanceOrSettle(workingShoe, nextHands, activeHandIndex, nextChips, nextCount);
  }, [
    phase,
    activeHand,
    chips,
    shoe,
    runningCount,
    playerHands,
    activeHandIndex,
    soundOn,
    advanceOrSettle,
    triggerDealerReaction,
  ]);

  const handleSplit = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    const evalRes = evaluateBlackjackHand(activeHand.cards);
    if (!evalRes.isPair || playerHands.length >= 2 || chips < activeHand.bet) return;

    const workingShoe = [...shoe];
    const c1 = { ...workingShoe.shift()!, faceUp: true };
    const c2 = { ...workingShoe.shift()!, faceUp: true };
    const nextCount = runningCount + getHiLoValue(c1.rank) + getHiLoValue(c2.rank);
    const nextChips = chips - activeHand.bet;

    const handA: PlayerHand = {
      id: 'hand-0',
      cards: [activeHand.cards[0], c1],
      bet: activeHand.bet,
      status: 'playing',
    };
    const handB: PlayerHand = {
      id: 'hand-1',
      cards: [activeHand.cards[1], c2],
      bet: activeHand.bet,
      status: 'playing',
    };

    setShoe(workingShoe);
    setRunningCount(nextCount);
    setChips(nextChips);
    setPlayerHands([handA, handB]);
    setActiveHandIndex(0);
    triggerDealerReaction('split', 'normal');
    setBannerText('スプリットしました！まずハンド #1 をプレイしてください。');
    playCardSound('chip', soundOn);
  }, [phase, activeHand, playerHands.length, chips, shoe, runningCount, soundOn, triggerDealerReaction]);

  const handleSurrender = useCallback(() => {
    if (phase !== 'player' || !activeHand) return;
    if (activeHand.cards.length !== 2 || playerHands.length > 1) return;

    const updatedHand: PlayerHand = {
      ...activeHand,
      status: 'surrendered',
    };
    const nextHands = [updatedHand];
    playCardSound('pass', soundOn);
    triggerDealerReaction('surrender', 'normal');
    advanceOrSettle(shoe, nextHands, activeHandIndex, chips, runningCount);
  }, [
    phase,
    activeHand,
    playerHands.length,
    soundOn,
    advanceOrSettle,
    shoe,
    activeHandIndex,
    chips,
    runningCount,
    triggerDealerReaction,
  ]);

  const canDouble =
    phase === 'player' &&
    Boolean(activeHand && activeHand.cards.length === 2 && chips >= activeHand.bet);
  const canSplit =
    phase === 'player' &&
    Boolean(
      activeHand &&
        evaluateBlackjackHand(activeHand.cards).isPair &&
        playerHands.length === 1 &&
        chips >= activeHand.bet
    );
  const canSurrender =
    phase === 'player' &&
    Boolean(activeHand && activeHand.cards.length === 2 && playerHands.length === 1);

  const strategyAdvice = useMemo(() => {
    if (!activeHand) return null;
    return getBasicStrategyRecommendation(
      activeHand,
      dealerCards[0],
      canSplit,
      canDouble,
      canSurrender
    );
  }, [activeHand, dealerCards, canSplit, canDouble, canSurrender]);

  const dealerEval = evaluateBlackjackHand(dealerCards);
  const totalGames = stats.wins + stats.losses + stats.pushes;
  const winRate =
    stats.wins + stats.losses > 0
      ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
      : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060a14] text-slate-100 select-none">
      {/* Atmospheric Sky Lounge Background (Shared Royal Flush Night World) */}
      <div className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HOLDEM_ASSETS.bgLounge}
          alt=""
          className="h-full w-full scale-105 object-cover opacity-35 blur-[2px]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 35%, rgba(9,14,28,0.35) 0%, rgba(5,8,16,0.88) 72%, #04070e 100%)',
          }}
        />
      </div>

      {/* Diagonal Cut-In Overlay (BLACKJACK 21!! / DOUBLE DOWN WIN!!) */}
      {cutIn && (
        <div
          key={cutIn.key}
          role="dialog"
          aria-label={`${cutIn.title} カットイン`}
          onClick={() => setCutIn(null)}
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-black/65 backdrop-blur-[2px]"
        >
          <div
            className="relative flex w-[110vw] -rotate-6 items-center justify-between border-y-4 px-6 py-6 shadow-[0_0_80px_rgba(251,191,36,0.55)] sm:px-16"
            style={{
              borderColor: CHARACTERS[cutIn.charId].color2,
              background: `linear-gradient(100deg, ${CHARACTERS[cutIn.charId].color}ee 0%, #090d1a 55%, ${CHARACTERS[cutIn.charId].color2}dd 100%)`,
            }}
          >
            <div className="z-10 max-w-xl">
              <p className="text-[11px] font-black tracking-[0.35em] text-amber-200 uppercase">
                ROYAL FLUSH NIGHT — {CHARACTERS[cutIn.charId].nameEn}
              </p>
              <p className="mt-1 bg-gradient-to-b from-white via-amber-200 to-amber-500 bg-clip-text text-3xl font-black italic tracking-tight text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:text-6xl">
                {cutIn.title}
              </p>
              <p className="mt-1 inline-block rounded bg-black/60 px-3 py-0.5 font-mono text-xs font-black text-amber-300 sm:text-sm">
                {cutIn.subtitle}
              </p>
              <p className="mt-2 rounded-xl border border-white/25 bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-900 shadow-lg sm:text-sm">
                「{cutIn.line}」
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={charImage(cutIn.charId, 'win')}
              alt={CHARACTERS[cutIn.charId].name}
              className="pointer-events-none h-40 w-40 rounded-2xl object-cover object-top shadow-2xl ring-2 ring-amber-300 sm:h-52 sm:w-52"
            />
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="relative z-20 border-b border-amber-400/25 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/games"
              className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:border-amber-300 hover:bg-amber-500/20"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-black tracking-[0.22em] text-amber-400 uppercase">
                ROYAL FLUSH NIGHT / ロイヤル・ナイト・カジノ
              </p>
              <h2 className="text-sm font-black text-white sm:text-lg">
                ブラックジャック 21（期待値ナビ＆VIPディーラー）
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowStrategyNav((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${
                showStrategyNav
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                  : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              📊 期待値ナビ: {showStrategyNav ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => {
                setVoiceOn((prev) => {
                  const next = !prev;
                  saveProgress(chips, stats, dealerId, felt, next);
                  return next;
                });
              }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                voiceOn
                  ? 'border-pink-400/60 bg-pink-500/20 text-pink-200'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {voiceOn ? '🗣 ボイス ON' : '🗣 ボイス OFF'}
            </button>
            <button
              type="button"
              onClick={() => setBgmOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                bgmOn
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {bgmOn ? '🎵 BGM ON' : '🎵 BGM OFF'}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((prev) => !prev)}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              {soundOn ? '🔊 音ON' : '🔇 音OFF'}
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_340px]">
        {/* Left Casino Table with Felt Texture */}
        <div
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.85)] sm:p-5"
          style={{
            borderColor: `${currentFeltObj.accent}55`,
          }}
        >
          {/* Felt Texture Surface */}
          <div className="pointer-events-none absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HOLDEM_ASSETS.felt[felt]}
              alt=""
              className="h-full w-full object-cover opacity-80"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 45%, rgba(6,16,24,0.25) 0%, rgba(4,9,18,0.78) 85%, rgba(2,6,14,0.92) 100%)',
              }}
            />
            {/* Inner Gold Casino Table Rim */}
            <div className="absolute inset-2 rounded-2xl border border-amber-300/20" />
          </div>

          {/* Bankroll, Relief Button & Felt Selector Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-xl border border-amber-400/50 bg-slate-950/75 px-3 py-1.5 shadow-inner backdrop-blur">
                <span className="text-[10px] font-bold tracking-wider text-amber-200/80 uppercase">
                  ROYAL BANKROLL / 所持チップ
                </span>
                <p className="font-mono text-base font-black text-amber-300 sm:text-lg">
                  🪙 {chips.toLocaleString()}
                </p>
              </div>

              {chips < 100 && phase !== 'player' && phase !== 'insurance' && (
                <button
                  type="button"
                  onClick={handleRefillChips}
                  className="animate-pulse rounded-xl border border-amber-200 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-3.5 py-2 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.5)] transition hover:brightness-105"
                >
                  🪙 無料チップ補給 (+1,000)
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
              {/* Felt Selector */}
              <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-950/70 p-1 backdrop-blur">
                {(['emerald', 'crimson', 'midnight'] as FeltId[]).map((fId) => {
                  const label =
                    fId === 'emerald'
                      ? 'エメラルド'
                      : fId === 'crimson'
                        ? 'クリムゾン'
                        : 'ミッドナイト';
                  const active = felt === fId;
                  return (
                    <button
                      key={fId}
                      type="button"
                      onClick={() => handleSelectFelt(fId)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-black transition ${
                        active
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <span className="rounded-lg bg-slate-950/60 px-2.5 py-1">
                シュー残:{' '}
                <strong className="font-mono text-emerald-300">
                  {liveAnalytics.cardsRemaining}/312枚
                </strong>
              </span>
              <span className="rounded-lg bg-slate-950/60 px-2.5 py-1">
                勝率:{' '}
                <strong className="font-mono text-cyan-300">
                  {winRate}% ({stats.wins}勝{stats.losses}敗)
                </strong>
              </span>
            </div>
          </div>

          {/* VIP Anime Dealer Zone */}
          <div className="relative z-10 my-3 flex flex-col items-center">
            <div className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/70 p-3 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              {/* Dealer Portrait & Title */}
              <div className="flex items-center gap-3">
                <div
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 shadow-lg sm:h-20 sm:w-20"
                  style={{
                    borderColor: dealerChar.color,
                    boxShadow: `0 0 24px ${dealerChar.color}66`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={charImage(dealerId, dealerExpr)}
                    alt={dealerChar.name}
                    className="h-full w-full object-cover object-top"
                  />
                  <span
                    className="absolute bottom-0 inset-x-0 bg-black/75 py-0.5 text-center text-[9px] font-black tracking-wider text-amber-300 uppercase"
                  >
                    VIP DEALER
                  </span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-black text-slate-950"
                      style={{ backgroundColor: dealerChar.color }}
                    >
                      {dealerChar.title}
                    </span>
                    <span className="text-sm font-black text-white sm:text-base">
                      {dealerChar.name}
                    </span>
                  </div>
                  {/* Speech Bubble */}
                  <div className="mt-1.5 rounded-xl border border-white/15 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow">
                    「{dealerBubble}」
                  </div>
                </div>
              </div>
            </div>

            {/* Dealer Cards & Total */}
            <div className="mt-3 mb-2 flex items-center gap-2">
              <span className="rounded-full border border-amber-300/30 bg-slate-950/75 px-3 py-0.5 text-xs font-bold text-amber-200">
                DEALER HAND（17以上スタンド / BJ配当1.5倍）
              </span>
              {dealerCards.length > 0 && (
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 font-mono text-xs font-black text-emerald-200">
                  合計: {dealerEval.total}
                  {dealerEval.isSoft ? ' (ソフト)' : ''}
                </span>
              )}
            </div>

            <div className="flex min-h-[96px] flex-wrap items-center justify-center gap-2 sm:min-h-[112px]">
              {dealerCards.length === 0 ? (
                <div className="flex h-22 w-15 items-center justify-center rounded-xl border border-dashed border-amber-300/35 bg-slate-950/40 text-xs font-bold text-amber-200/60 sm:h-26 sm:w-18">
                  DEALER
                </div>
              ) : (
                dealerCards.map((c) => <PlayingCardView key={c.id} card={c} size="md" />)
              )}
            </div>
          </div>

          {/* Center Status Banner */}
          <div className="relative z-10 my-2 rounded-xl border border-amber-300/30 bg-slate-950/75 px-3.5 py-2.5 text-center text-xs font-bold text-amber-100 shadow-inner backdrop-blur sm:text-sm">
            {bannerText}
          </div>

          {/* Busted Relief Card when chips < 10 */}
          {chips < 10 && phase !== 'player' && phase !== 'insurance' && (
            <div className="relative z-10 my-2 flex flex-col items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-slate-950/90 p-4 text-center shadow-[0_0_30px_rgba(251,191,36,0.3)] sm:flex-row sm:text-left">
              <div>
                <p className="text-xs font-black tracking-widest text-amber-400 uppercase">
                  ROYAL RELIEF SUPPORT / 無料チップ救済
                </p>
                <p className="mt-0.5 text-sm font-black text-white">
                  チップが底をつきました！{dealerChar.name}から無料チップを受け取ってすぐ再開できます。
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefillChips}
                className="shrink-0 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:brightness-105 sm:text-sm"
              >
                🪙 +1,000 無料補充して続行
              </button>
            </div>
          )}

          {/* Player Hands Zone */}
          <div className="relative z-10 my-3 flex flex-wrap items-start justify-center gap-4">
            {playerHands.length === 0 ? (
              <div className="flex flex-col items-center">
                <div className="flex h-22 w-15 items-center justify-center rounded-xl border border-dashed border-amber-300/35 bg-slate-950/40 text-xs font-bold text-amber-200/60 sm:h-26 sm:w-18">
                  YOU
                </div>
                <span className="mt-2 text-xs text-slate-300">
                  カジノチップでベット額を設定してディールを開始してください
                </span>
              </div>
            ) : (
              playerHands.map((hand, idx) => {
                const ev = evaluateBlackjackHand(hand.cards);
                const isCurrent = phase === 'player' && idx === activeHandIndex;
                return (
                  <div
                    key={hand.id}
                    className={`flex flex-col items-center rounded-2xl border p-3 backdrop-blur-sm transition ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-400/15 shadow-[0_0_24px_rgba(251,191,36,0.25)]'
                        : 'border-white/15 bg-slate-950/60'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      <span className="font-black text-white">
                        あなたの手札 {playerHands.length > 1 ? `#${idx + 1}` : ''}
                      </span>
                      <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono font-bold text-amber-300">
                        BET: {hand.bet}
                      </span>
                      <span className="rounded bg-cyan-400/20 px-2 py-0.5 font-mono font-black text-cyan-200">
                        {ev.isBlackjack
                          ? 'BLACKJACK 21!'
                          : `${ev.isSoft ? 'ソフト ' : ''}${ev.total}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                      {hand.cards.map((card) => (
                        <PlayingCardView
                          key={card.id}
                          card={card}
                          size="md"
                          highlighted={isCurrent}
                        />
                      ))}
                    </div>

                    {hand.outcome && (
                      <div className="mt-2.5 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-black">
                        {hand.outcome === 'blackjack' && (
                          <span className="text-amber-300">
                            ★ BLACKJACK! (+{hand.payout} 払戻)
                          </span>
                        )}
                        {hand.outcome === 'win' && (
                          <span className="text-emerald-300">
                            WIN! 勝利 (+{hand.payout} 払戻)
                          </span>
                        )}
                        {hand.outcome === 'push' && (
                          <span className="text-slate-200">PUSH 引き分け (返却)</span>
                        )}
                        {hand.outcome === 'surrender' && (
                          <span className="text-rose-300">
                            SURRENDER 半額返却 (+{hand.payout})
                          </span>
                        )}
                        {hand.outcome === 'lose' && (
                          <span className="text-rose-400">LOSE 敗北</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Controls Area */}
          <div className="relative z-10 mt-2 border-t border-white/15 pt-3">
            {phase === 'betting' || phase === 'settled' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/35 bg-slate-950/75 px-3 py-1.5">
                    <span className="text-xs font-bold text-slate-300">ベット額:</span>
                    <span className="font-mono text-lg font-black text-amber-300">
                      🪙 {betInput.toLocaleString()}
                    </span>
                  </div>

                  {/* Casino Chip Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { amt: 10, ring: 'border-sky-300 bg-sky-600/30 text-sky-100' },
                      { amt: 50, ring: 'border-emerald-300 bg-emerald-600/30 text-emerald-100' },
                      { amt: 100, ring: 'border-amber-300 bg-amber-500/30 text-amber-100' },
                      { amt: 500, ring: 'border-purple-300 bg-purple-600/30 text-purple-100' },
                    ].map(({ amt, ring }) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setBetInput((prev) => Math.min(chips, prev + amt));
                          playCardSound('chip', soundOn);
                        }}
                        className={`flex h-9 items-center justify-center rounded-full border-2 border-dashed px-3 font-mono text-xs font-black shadow transition hover:scale-105 ${ring}`}
                      >
                        +{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setBetInput((prev) => Math.min(chips, prev * 2));
                        playCardSound('chip', soundOn);
                      }}
                      className="h-9 rounded-full border border-cyan-400/50 bg-cyan-500/20 px-3 text-xs font-black text-cyan-200 transition hover:bg-cyan-500/30"
                    >
                      2x倍
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBetInput(Math.max(10, chips));
                        playCardSound('chip', soundOn);
                      }}
                      className="h-9 rounded-full border border-rose-400/50 bg-rose-500/25 px-3 text-xs font-black text-rose-200 transition hover:bg-rose-500/35"
                    >
                      MAX
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBetInput(Math.min(chips, 10));
                        playCardSound('chip', soundOn);
                      }}
                      className="h-9 rounded-full border border-white/20 bg-slate-900/80 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/15"
                    >
                      CLEAR
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDeal}
                  disabled={chips < 10}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 py-3 text-base font-black text-slate-950 shadow-[0_8px_25px_rgba(251,191,36,0.4)] transition hover:brightness-105 disabled:opacity-40"
                >
                  🃏 DEAL（カードを配る）
                </button>
              </div>
            ) : phase === 'insurance' ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleInsuranceDecision(true)}
                  disabled={chips < Math.floor((playerHands[0]?.bet ?? 0) / 2)}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow hover:bg-amber-300 disabled:opacity-40"
                >
                  インシュランスを掛ける ({Math.floor((playerHands[0]?.bet ?? 0) / 2)} チップ)
                </button>
                <button
                  type="button"
                  onClick={() => handleInsuranceDecision(false)}
                  className="rounded-xl border border-white/20 bg-slate-900/80 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20"
                >
                  掛けずに続行（推奨）
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <button
                  type="button"
                  onClick={handleHit}
                  className="rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-emerald-400 sm:text-sm"
                >
                  ヒット (Hit)
                </button>
                <button
                  type="button"
                  onClick={handleStand}
                  className="rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-amber-300 sm:text-sm"
                >
                  スタンド (Stand)
                </button>
                <button
                  type="button"
                  onClick={handleDoubleDown}
                  disabled={!canDouble}
                  className="rounded-xl bg-cyan-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-cyan-300 disabled:opacity-35 sm:text-sm"
                >
                  ダブル (2x)
                </button>
                <button
                  type="button"
                  onClick={handleSplit}
                  disabled={!canSplit}
                  className="rounded-xl bg-purple-400 py-2.5 text-xs font-black text-slate-950 shadow transition hover:bg-purple-300 disabled:opacity-35 sm:text-sm"
                >
                  スプリット
                </button>
                <button
                  type="button"
                  onClick={handleSurrender}
                  disabled={!canSurrender}
                  className="col-span-2 rounded-xl border border-rose-400/50 bg-rose-500/25 py-2.5 text-xs font-black text-rose-200 transition hover:bg-rose-500/35 disabled:opacity-35 sm:col-span-1 sm:text-sm"
                >
                  サレンダー
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: VIP Dealer Selector + Basic Strategy & Probability Nav + History */}
        <aside className="flex flex-col gap-3">
          {/* Selectable Anime Dealer / Partner Character */}
          <div className="rounded-2xl border border-amber-400/30 bg-slate-900/90 p-3.5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-black tracking-wider text-amber-300">
                👑 VIPディーラー指名 (ROYAL CAST)
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                フルボイス演出対応
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {CHAR_IDS.map((cid) => {
                const ch = CHARACTERS[cid];
                const selected = cid === dealerId;
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => handleSelectDealer(cid)}
                    className={`flex items-center gap-1.5 rounded-xl border p-1.5 text-left transition ${
                      selected
                        ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'border-white/10 bg-black/35 hover:border-white/25 hover:bg-white/5'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={charImage(cid, 'normal')}
                      alt={ch.name}
                      className="h-8 w-8 shrink-0 rounded-lg object-cover object-top"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black text-white">
                        {ch.name.split(' ').pop()}
                      </p>
                      <p className="truncate text-[9px] text-amber-200/80">
                        {ch.voiceStyle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {showStrategyNav && (
            <div className="rounded-2xl border border-amber-400/30 bg-slate-900/90 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-black tracking-wider text-amber-300">
                  📊 ベーシックストラテジー＆確率ナビ
                </span>
                <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200">
                  数学的最適解
                </span>
              </div>

              {phase === 'player' && strategyAdvice ? (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-400">現在の局面の推奨アクション:</p>
                  <div
                    className={`mt-1.5 inline-block rounded-lg px-3 py-1 text-sm font-black shadow ${strategyAdvice.badgeColor}`}
                  >
                    推奨: {strategyAdvice.action}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-200">
                    {strategyAdvice.reason}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">
                  カードを配ると、あなたの手札（ハード・ソフト・ペア）とディーラーの表カードから最も期待値の高いアクションをリアルタイム表示します。
                </p>
              )}

              {/* Live Probability Gauges */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <span className="text-[10px] text-slate-400">次ヒット時のバースト率</span>
                  <p
                    className={`mt-0.5 font-mono text-lg font-black ${
                      liveAnalytics.bustProb >= 50
                        ? 'text-rose-400'
                        : liveAnalytics.bustProb > 0
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                    }`}
                  >
                    {phase === 'player' ? `${liveAnalytics.bustProb}%` : '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
                  <span className="text-[10px] text-slate-400">10・A比率 (True Count)</span>
                  <p className="mt-0.5 font-mono text-lg font-black text-cyan-300">
                    {liveAnalytics.highCardRatio}%{' '}
                    <span className="text-xs text-slate-400">
                      ({liveAnalytics.trueCount >= 0 ? `+${liveAnalytics.trueCount}` : liveAnalytics.trueCount})
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Session Stats & Recent Hands */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/85 p-4 backdrop-blur">
            <h3 className="text-xs font-black tracking-wider text-emerald-300 uppercase">
              戦績＆ハンド履歴 (全{totalGames}戦)
            </h3>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-xs">
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] text-slate-400">勝利</p>
                <p className="font-mono font-black text-emerald-300">{stats.wins}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] text-slate-400">BJ達成</p>
                <p className="font-mono font-black text-amber-300">{stats.blackjacks}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] text-slate-400">引分</p>
                <p className="font-mono font-black text-slate-200">{stats.pushes}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-[10px] text-slate-400">敗北</p>
                <p className="font-mono font-black text-rose-400">{stats.losses}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {history.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-500">
                  まだハンド履歴がありません
                </p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-xs"
                  >
                    <div className="truncate">
                      <span className="text-slate-400">D:{h.dealerTotal}</span>{' '}
                      <span className="font-bold text-slate-200">
                        / P:{h.handSummaries.join(', ')}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-black ${
                        h.netChange > 0
                          ? 'text-emerald-300'
                          : h.netChange < 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                      }`}
                    >
                      {h.netChange > 0 ? `+${h.netChange}` : h.netChange}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
