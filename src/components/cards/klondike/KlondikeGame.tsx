'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  CardItem,
  createStandardDeck,
  formatRank,
  isAlternatingColor,
  isRedSuit,
  playCardSound,
  shuffleWithRng,
  STANDARD_SUITS,
  StandardSuit,
  SUIT_LABEL_JA,
  SUIT_SYMBOL,
  SuitVectorIcon,
  useCardTableBgm,
} from '@/components/cards/shared/cardUtils';
import {
  CHARACTERS,
  CHAR_IDS,
  FELTS,
  HOLDEM_ASSETS,
  charImage,
  type CharId,
  type FeltId,
} from '@/components/cards/texas-holdem/characters';
import { holdemAudio } from '@/components/cards/texas-holdem/audio';

type DrawCount = 1 | 3;

interface KlondikeState {
  stock: CardItem[];
  waste: CardItem[];
  foundations: Record<StandardSuit, CardItem[]>;
  tableau: CardItem[][];
  moves: number;
  score: number;
  recycles: number;
}

interface SelectionSource {
  zone: 'waste' | 'tableau' | 'foundation';
  colIndex?: number;
  cardIndex?: number;
  suit?: StandardSuit;
}

interface HintSuggestion {
  cardId: string;
  description: string;
}

type SolitaireCommentEvent = 'deal' | 'foundation' | 'hint' | 'clear' | 'win';

const KLONDIKE_LINES: Record<CharId, Record<SolitaireCommentEvent, string[]>> = {
  rei: {
    deal: [
      'クロンダイクの基本戦略は裏向きカードの早期開示だ。確率を味方につけよう。',
      '新しいディールを開始する。まずは裏向きカードの多い列から優先的に崩そう。',
    ],
    foundation: [
      '組札への格納を確認。盤面のエントロピーが下がってきたな。',
      '堅実な一手だ。組札のバランスを保ちつつ進めよう。',
    ],
    hint: [
      '現局面で最も情報価値の高い一手を算出した。参考にしてくれ。',
      '計算上、このカードを動かすことで展開が打開できるはずだ。',
    ],
    clear: [
      '空き列の確保、あるいは全開示に成功したな。ここからは収束フェーズだ。',
      'キングの配置ルートが開けた。一気に盤面を整理しよう。',
    ],
    win: [
      'VICTORY!! 完璧な収束だ。すべての不確定要素を論理で制したね。',
      '計算通りの完全クリアだ。次のディールでも最高効率を目指そう。',
    ],
  },
  karen: {
    deal: [
      'クロンダイクね！裏向きのカードなんて全部暴いてやるわよ！',
      'さあ配り終えたわ！華麗に組札まで駆け上がるわよ！',
    ],
    foundation: [
      'ふふん、いい調子じゃない！どんどん組札に積んでいきなさい！',
      'ナイスムーブ！この勢いで全部片付けるわよ！',
    ],
    hint: [
      'どこを動かすか迷ってるの？ほら、ここが狙い目よ！',
      '特別にヒントを出してあげる！感謝しなさいよね！',
    ],
    clear: [
      '列が空いたわ！キングを置いて一気に攻め込むチャンスよ！',
      'すべてのカードが表向きになったわね！フィニッシュよ！',
    ],
    win: [
      'VICTORY!! 見た？これが私たちの実力よ！パーフェクトクリア♪',
      '最高の気分ね！さあ、もう1ゲーム連勝を伸ばすわよ！',
    ],
  },
  koharu: {
    deal: [
      'にゃっほー！ソリティア始めるにゃ！裏向きのカード、何が出るかワクワクするにゃ♪',
      'カードをトントン並べて、目指せ完全クリアにゃ～！',
    ],
    foundation: [
      'わぁい！組札にピタッと収まったにゃ♪',
      '順調にゃ～！どんどん集めるにゃ！',
    ],
    hint: [
      'にゃむむ…コハルの鼻がヒクヒクするにゃ！このカードが怪しいにゃ！',
      'ここを動かすとイイコトがありそうにゃ♪',
    ],
    clear: [
      'やったにゃ！空き列ができたから王様（K）のお引っ越しができるにゃ！',
      'キラキラ全回収モードにゃーっ！一気にいくにゃ！',
    ],
    win: [
      'VICTORY!! 52枚ぜんぶお家に帰れたにゃ！大勝利にゃーっ♪',
      'すごいにゃ！コハルも鼻が高いにゃ！次も楽しく遊ぶにゃ！',
    ],
  },
  valentina: {
    deal: [
      'ふふっ、ロイヤル・ナイト・サロンへようこそ。優雅にソリティアを嗜みましょう。',
      '伏せられたカードを1枚ずつ暴くスリル…楽しませてちょうだい。',
    ],
    foundation: [
      '美しいわ…組札が少しずつ完成へと近づいているわね。',
      'いい判断よ。焦らず品格のある手順で進めましょう。',
    ],
    hint: [
      '女帝の囁きを聞きたいのかしら？ふふ、このカードを試してごらんなさい。',
      '視点を変えれば道は開けるわ。ここよ。',
    ],
    clear: [
      '見事よ、キングのための玉座（空き列）が整ったわね。',
      'すべての秘密が暴かれたわ…華麗に締めくくりましょう。',
    ],
    win: [
      'VICTORY!! 完璧なフィナーレね。あなたの鮮やかな手並みに乾杯♪',
      'すべてのカードがひれ伏したわね。次のディールも期待しているわ。',
    ],
  },
  jin: {
    deal: [
      'クロンダイクか。山札の巡りと裏札の読み…シブい勝負になりそうだ。',
      '焦って組札に上げすぎるなよ。場札の足場を固めるのが先決だ。',
    ],
    foundation: [
      'よし、着実に組札へ入ったな。',
      '悪くねえリズムだ。そのまま押し切れ。',
    ],
    hint: [
      '迷った時はここを見な。まだ打てる手が残ってるぜ。',
      'このカードを動かせば、膠着状態が動くはずだ。',
    ],
    clear: [
      '空き列を作ったか！そこにキングを据えれば盤面が動くぜ。',
      '勝負ありだな。残りを一気に回収しな。',
    ],
    win: [
      'VICTORY!! お見事。最後まで冷静なプレイングだったぜ。',
      '気持ちのいい完勝だな。もう1ディール付き合うぜ。',
    ],
  },
  luna: {
    deal: [
      '伏せられたカードは夜空に隠れた星々…1枚ずつ光を取り戻していきましょう。',
      '星の巡りが新しいディールを告げています。穏やかに始めましょう。',
    ],
    foundation: [
      '組札に新たな輝きが宿りましたね。',
      '星の導きの通り…美しい流れです。',
    ],
    hint: [
      '星があのカードを照らしています…きっと運命が動きますよ。',
      '静かに盤面を見つめれば、この一手が見えてきます。',
    ],
    clear: [
      '新たな空間が開かれました…大きな流れがやってきます。',
      'すべてのカードが光に照らされましたね。フィナーレです。',
    ],
    win: [
      'VICTORY!! 52枚の星座が完成しました…祝福の夜ですね♪',
      '運命の糸を見事に紡ぎきりました。素晴らしい勝利です。',
    ],
  },
  sakura: {
    deal: [
      'クロンダイクの一局、伏せ札を一枚ずつ切り拓いて参りましょう。',
      '山札と場札の調和が肝要ですわ。いざ始めましょう。',
    ],
    foundation: [
      '組札へ美しく収まりましたわね。',
      '着実な歩みですわ。このまま花を咲かせましょう。',
    ],
    hint: [
      'あの札を動かせば、新たな道が開けますわ。',
      'お迷いですか？こちらの一手をお試しくださいませ。',
    ],
    clear: [
      '空き列が整いましたわ！キングを据える好機です！',
      'すべての伏せ札が開かれましたわね。見事な采配です！',
    ],
    win: [
      'VICTORY!! 52枚すべてが絢爛に揃いました…お見事ですわ！',
      '天晴れな完全クリアですわね。次の一局も楽しみですわ♪',
    ],
  },
  alice: {
    deal: [
      'うしろ向きのカードがいっぱい！何が出てくるかワクワクするわね♪',
      'ソリティアのティーパーティー、はじまりはじまり〜♪',
    ],
    foundation: [
      'やったぁ♪ 組札にカードがぴょんと乗ったわ！',
      'いいリズムね！どんどん並べていきましょ♪',
    ],
    hint: [
      'ふふっ、ここを動かすと隠れたカードが目を覚ますかも♪',
      'アリスの秘密のヒントよ！このカードを試してみて♪',
    ],
    clear: [
      '列が空いたわ！キング様の特等席ができたわよ♪',
      'ぜんぶ表向きになったわね！あとはゴールまで一直線よ♪',
    ],
    win: [
      'VICTORY!! パーフェクトクリアよ〜っ！不思議の国の大喝采ね♪',
      'すごーい！52枚ぜんぶお片付けできちゃったわ♪',
    ],
  },
  leon: {
    deal: [
      '未知の伏せ札を切り拓くクロンダイク…王者の進軍を始めよう！',
      '場札の伏せカードを暴くのが最優先だ！堂々と攻めろ！',
    ],
    foundation: [
      'よし、組札が着実に積み上がっているな！',
      'いい判断だ！王道のプレイングで押し切れ！',
    ],
    hint: [
      '突破口はそこだ！迷わずその札を動かしてみろ！',
      '膠着を打ち破る王者のヒントだ、活かすといい！',
    ],
    clear: [
      '空き列を確保したな！キングを配置して陣形を立て直せ！',
      '全カード開示だ！あとは勝利の凱旋あるのみ！',
    ],
    win: [
      'VICTORY!! 52枚完全制覇！見事な采配、まさに王者の風格だ！',
      'ハッハッハ！痛快なクリアだな！もう1ゲームいくぞ！',
    ],
  },
  chloe: {
    deal: [
      '不完全情報下のソリティアね。未開示カードの開放期待値を最大化しましょう。',
      'ドローモードに応じた山札サイクル管理が勝率を左右するわ。',
    ],
    foundation: [
      '組札への移動を確認。場札の可動性を損なわない範囲で進めなさい。',
      '順調な進行ね。データの推移も良好よ。',
    ],
    hint: [
      '現在最も裏札開放確率が高いムーブをハイライトしたわ。',
      'ここを動かせば連鎖的に手数が伸びるはずよ。',
    ],
    clear: [
      '空き列の生成完了。キングを移動してロックを解除しましょう。',
      '未開示カードがゼロになったわね。収束確定よ。',
    ],
    win: [
      'VICTORY!! 不確定要素を完全にコントロールしたわね。完璧なクリアよ。',
      '全52枚の格納完了。文句なしのスコアね。',
    ],
  },
  hibiki: {
    deal: [
      'クロンダイクいくわよ！裏向きのカードなんて全部めくり倒しちゃいましょ！',
      'テンポよく山札を回して、熱いビートで攻略するわよ！',
    ],
    foundation: [
      'ナイスムーブ！組札がガンガン積み上がってるわね！',
      'いいノリよ！その調子で突き進みなさい！',
    ],
    hint: [
      'ほら、そこ！そのカードを動かせば一気に道が開けるわよ！',
      '迷ったらこのビートに乗りなさい！ここが狙い目よ！',
    ],
    clear: [
      '列が空いたわよ！キングをドカンと置いて攻め込みなさい！',
      '全部めくり切ったわね！アンコールまで一気に駆け抜けるわよ！',
    ],
    win: [
      'VICTORY!! 最高にクールな完全クリアじゃない！！シビれたわ♪',
      'あんたのプレイ、最高にロックよ！もう1曲いくわよ！',
    ],
  },
  suou: {
    deal: [
      '伏せられた札を一枚ずつ紐解く…静かな夜の愉しみですね。',
      '山札の巡り合わせを味わいながら、ゆっくり参りましょう。',
    ],
    foundation: [
      '組札へと綺麗に収まりましたね。',
      '淀みのない美しい手筋です。',
    ],
    hint: [
      'あの札を動かしてみてはいかがでしょう。風が通るはずです。',
      '焦ることはありません。ここに糸口がございますよ。',
    ],
    clear: [
      '空き列が生まれましたね。王の居場所が整いました。',
      'すべての伏せ札が明かされましたね。静かな終幕へと向かいましょう。',
    ],
    win: [
      'VICTORY!! 52枚すべてが美しく整いました…見事な腕前です。',
      '心洗われるような見事な一局でした。またいつでもお相手いたしますよ。',
    ],
  },
};

function speakPartnerLine(
  charId: CharId,
  voicePitch: number,
  voiceRate: number,
  voiceGender: 'female' | 'male',
  text: string,
  enabled: boolean
): void {
  if (!enabled || typeof window === 'undefined') return;
  holdemAudio.speak(text, {
    charId,
    pitch: voicePitch,
    rate: voiceRate,
    gender: voiceGender,
    enabled,
  });
}

function cloneState(s: KlondikeState): KlondikeState {
  return {
    stock: s.stock.map((c) => ({ ...c })),
    waste: s.waste.map((c) => ({ ...c })),
    foundations: {
      spades: s.foundations.spades.map((c) => ({ ...c })),
      hearts: s.foundations.hearts.map((c) => ({ ...c })),
      diamonds: s.foundations.diamonds.map((c) => ({ ...c })),
      clubs: s.foundations.clubs.map((c) => ({ ...c })),
    },
    tableau: s.tableau.map((col) => col.map((c) => ({ ...c }))),
    moves: s.moves,
    score: s.score,
    recycles: s.recycles,
  };
}

function createInitialKlondikeState(): KlondikeState {
  const deck = shuffleWithRng(createStandardDeck(false, 1));
  const tableau: CardItem[][] = Array.from({ length: 7 }, () => []);
  let cursor = 0;
  for (let col = 0; col < 7; col += 1) {
    for (let row = 0; row <= col; row += 1) {
      const card = { ...deck[cursor], faceUp: row === col };
      tableau[col].push(card);
      cursor += 1;
    }
  }
  const stock = deck.slice(cursor).map((c) => ({ ...c, faceUp: false }));
  return {
    stock,
    waste: [],
    foundations: {
      spades: [],
      hearts: [],
      diamonds: [],
      clubs: [],
    },
    tableau,
    moves: 0,
    score: 0,
    recycles: 0,
  };
}

function canMoveToFoundation(card: CardItem, foundations: Record<StandardSuit, CardItem[]>): boolean {
  if (card.suit === 'joker') return false;
  const pile = foundations[card.suit];
  const expectedRank = pile.length + 1;
  return card.rank === expectedRank;
}

function canMoveToTableauColumn(card: CardItem, targetCol: CardItem[]): boolean {
  if (card.suit === 'joker') return false;
  if (targetCol.length === 0) {
    return card.rank === 13;
  }
  const topTarget = targetCol[targetCol.length - 1];
  if (!topTarget.faceUp || topTarget.suit === 'joker') return false;
  return (
    isAlternatingColor(card.suit, topTarget.suit) &&
    card.rank === topTarget.rank - 1
  );
}

export default function KlondikeGame() {
  const [drawMode, setDrawMode] = useState<DrawCount>(1);
  const [gameState, setGameState] = useState<KlondikeState>(() => createInitialKlondikeState());
  const [history, setHistory] = useState<KlondikeState[]>([]);
  const [selected, setSelected] = useState<SelectionSource | null>(null);
  const [oneTapAuto, setOneTapAuto] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(true);
  const [felt, setFelt] = useState<FeltId>('emerald');
  const [partnerId, setPartnerId] = useState<CharId>('rei');
  const [partnerLine, setPartnerLine] = useState<string>(
    KLONDIKE_LINES.rei.deal[0]
  );
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  useCardTableBgm(bgmOn, 'salon');
  const [hint, setHint] = useState<HintSuggestion | null>(null);
  const [gamesWon, setGamesWon] = useState<number>(0);
  const [bestTimeSec, setBestTimeSec] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'カードをタップすると最適な移動先へ自動移動します（2タップ手動移動も対応）'
  );

  const partner = CHARACTERS[partnerId];
  const feltMeta = FELTS.find((f) => f.id === felt) ?? FELTS[0];

  const triggerPartnerComment = useCallback(
    (event: SolitaireCommentEvent, overrideCharId?: CharId) => {
      const cid = overrideCharId ?? partnerId;
      const ch = CHARACTERS[cid];
      const pool = KLONDIKE_LINES[cid][event];
      const line = pool[Math.floor(Math.random() * pool.length)] ?? ch.catchphrase;
      setPartnerLine(line);
      speakPartnerLine(cid, ch.voicePitch, ch.voiceRate, ch.voiceGender, line, voiceOn);
    },
    [partnerId, voiceOn]
  );

  const handleSelectPartner = useCallback(
    (nextId: CharId) => {
      setPartnerId(nextId);
      const ch = CHARACTERS[nextId];
      const line = ch.lines.select[0] ?? ch.catchphrase;
      setPartnerLine(line);
      speakPartnerLine(nextId, ch.voicePitch, ch.voiceRate, ch.voiceGender, line, voiceOn);
    },
    [voiceOn]
  );

  const foundationCount =
    gameState.foundations.spades.length +
    gameState.foundations.hearts.length +
    gameState.foundations.diamonds.length +
    gameState.foundations.clubs.length;

  const isWon = foundationCount === 52;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('zatsudan_klondike_stats_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as { gamesWon?: number; bestTimeSec?: number | null };
        if (typeof parsed.gamesWon === 'number') setGamesWon(parsed.gamesWon);
        if (typeof parsed.bestTimeSec === 'number') setBestTimeSec(parsed.bestTimeSec);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (isWon || gameState.moves === 0) return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isWon, gameState.moves]);

  const recordWinStats = useCallback(
    (finalTime: number) => {
      const nextWins = gamesWon + 1;
      const nextBest = bestTimeSec === null ? finalTime : Math.min(bestTimeSec, finalTime);
      setGamesWon(nextWins);
      setBestTimeSec(nextBest);
      try {
        localStorage.setItem(
          'zatsudan_klondike_stats_v1',
          JSON.stringify({ gamesWon: nextWins, bestTimeSec: nextBest })
        );
      } catch {
        // ignore
      }
    },
    [gamesWon, bestTimeSec]
  );

  const canAutoComplete = useMemo(() => {
    if (isWon) return false;
    if (gameState.stock.length > 0 || gameState.waste.length > 0) return false;
    return gameState.tableau.every((col) => col.every((c) => c.faceUp));
  }, [gameState, isWon]);

  const startNewGame = useCallback(
    (nextDrawMode?: DrawCount) => {
      const mode = nextDrawMode ?? drawMode;
      if (nextDrawMode) setDrawMode(nextDrawMode);
      setGameState(createInitialKlondikeState());
      setHistory([]);
      setSelected(null);
      setHint(null);
      setElapsedSec(0);
      setStatusMessage(
        `${mode === 1 ? '1枚めくり（標準）' : '3枚めくり（上級）'}で新しいゲームを開始しました。`
      );
      playCardSound('flip', soundOn);
      triggerPartnerComment('deal');
    },
    [drawMode, soundOn, triggerPartnerComment]
  );

  const pushHistoryAndApply = useCallback(
    (
      next: KlondikeState,
      msg: string,
      sound: 'card' | 'flip' | 'win' = 'card',
      commentHint?: SolitaireCommentEvent
    ) => {
      const prevEmptyCols = gameState.tableau.filter((c) => c.length === 0).length;
      const nextEmptyCols = next.tableau.filter((c) => c.length === 0).length;
      setHistory((prev) => [...prev.slice(-80), cloneState(gameState)]);
      setGameState(next);
      setSelected(null);
      setHint(null);
      setStatusMessage(msg);
      const nextTotal =
        next.foundations.spades.length +
        next.foundations.hearts.length +
        next.foundations.diamonds.length +
        next.foundations.clubs.length;
      if (nextTotal === 52) {
        playCardSound('win', soundOn);
        recordWinStats(elapsedSec);
        triggerPartnerComment('win');
      } else {
        playCardSound(sound, soundOn);
        if (commentHint) {
          triggerPartnerComment(commentHint);
        } else if (nextEmptyCols > prevEmptyCols) {
          triggerPartnerComment('clear');
        }
      }
    },
    [gameState, soundOn, recordWinStats, elapsedSec, triggerPartnerComment]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGameState(prev);
    setSelected(null);
    setHint(null);
    setStatusMessage('一手戻しました。');
    playCardSound('flip', soundOn);
  }, [history, soundOn]);

  const handleStockClick = useCallback(() => {
    if (isWon) return;
    const next = cloneState(gameState);
    if (next.stock.length > 0) {
      const count = Math.min(drawMode, next.stock.length);
      const drawn = next.stock.splice(0, count).map((c) => ({ ...c, faceUp: true }));
      next.waste.push(...drawn);
      next.moves += 1;
      pushHistoryAndApply(next, `山札から${count}枚めくりました。`, 'flip');
    } else if (next.waste.length > 0) {
      next.stock = next.waste.map((c) => ({ ...c, faceUp: false }));
      next.waste = [];
      next.moves += 1;
      next.recycles += 1;
      next.score = Math.max(0, next.score - (drawMode === 1 ? 50 : 20));
      pushHistoryAndApply(next, '捨て札を山札へ戻しました。', 'flip');
    }
  }, [isWon, gameState, drawMode, pushHistoryAndApply]);

  const executeMoveToFoundation = useCallback(
    (source: SelectionSource): boolean => {
      const next = cloneState(gameState);
      let movingCard: CardItem | null = null;

      if (source.zone === 'waste') {
        if (next.waste.length === 0) return false;
        const candidate = next.waste[next.waste.length - 1];
        if (!canMoveToFoundation(candidate, next.foundations)) return false;
        movingCard = next.waste.pop()!;
      } else if (source.zone === 'tableau' && source.colIndex !== undefined) {
        const col = next.tableau[source.colIndex];
        if (col.length === 0) return false;
        const idx = source.cardIndex ?? col.length - 1;
        if (idx !== col.length - 1) return false; // only top card to foundation
        const candidate = col[col.length - 1];
        if (!canMoveToFoundation(candidate, next.foundations)) return false;
        movingCard = col.pop()!;
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1].faceUp = true;
          next.score += 5;
        }
      }

      if (!movingCard || movingCard.suit === 'joker') return false;
      next.foundations[movingCard.suit].push(movingCard);
      next.moves += 1;
      next.score += 10;
      pushHistoryAndApply(
        next,
        `${SUIT_LABEL_JA[movingCard.suit]}の${formatRank(movingCard.rank)}を組札へ移動しました。`,
        'card',
        'foundation'
      );
      return true;
    },
    [gameState, pushHistoryAndApply]
  );

  const executeMoveToTableau = useCallback(
    (source: SelectionSource, targetColIdx: number): boolean => {
      const next = cloneState(gameState);
      const targetCol = next.tableau[targetColIdx];

      if (source.zone === 'waste') {
        if (next.waste.length === 0) return false;
        const candidate = next.waste[next.waste.length - 1];
        if (!canMoveToTableauColumn(candidate, targetCol)) return false;
        const card = next.waste.pop()!;
        targetCol.push(card);
        next.moves += 1;
        next.score += 5;
        pushHistoryAndApply(
          next,
          `${SUIT_LABEL_JA[card.suit]}の${formatRank(card.rank)}を第${targetColIdx + 1}列へ移動しました。`
        );
        return true;
      }

      if (source.zone === 'foundation' && source.suit) {
        const fPile = next.foundations[source.suit];
        if (fPile.length === 0) return false;
        const candidate = fPile[fPile.length - 1];
        if (!canMoveToTableauColumn(candidate, targetCol)) return false;
        const card = fPile.pop()!;
        targetCol.push(card);
        next.moves += 1;
        next.score = Math.max(0, next.score - 10);
        pushHistoryAndApply(
          next,
          `組札から${SUIT_LABEL_JA[card.suit]}の${formatRank(card.rank)}を第${targetColIdx + 1}列へ戻しました。`
        );
        return true;
      }

      if (source.zone === 'tableau' && source.colIndex !== undefined && source.cardIndex !== undefined) {
        if (source.colIndex === targetColIdx) return false;
        const srcCol = next.tableau[source.colIndex];
        if (source.cardIndex < 0 || source.cardIndex >= srcCol.length) return false;
        const headCard = srcCol[source.cardIndex];
        if (!headCard.faceUp || !canMoveToTableauColumn(headCard, targetCol)) return false;

        // Validate that the entire face-up moving slice is a legal alternating descending stack
        const candidateSlice = srcCol.slice(source.cardIndex);
        for (let i = 0; i < candidateSlice.length - 1; i += 1) {
          const upper = candidateSlice[i];
          const lower = candidateSlice[i + 1];
          if (
            !upper.faceUp ||
            !lower.faceUp ||
            upper.suit === 'joker' ||
            lower.suit === 'joker' ||
            !isAlternatingColor(upper.suit, lower.suit) ||
            upper.rank !== lower.rank + 1
          ) {
            return false;
          }
        }

        const movingSlice = srcCol.splice(source.cardIndex);
        targetCol.push(...movingSlice);
        if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
          srcCol[srcCol.length - 1].faceUp = true;
          next.score += 5;
        }
        next.moves += 1;
        pushHistoryAndApply(
          next,
          `${SUIT_LABEL_JA[headCard.suit]}の${formatRank(headCard.rank)}${
            movingSlice.length > 1 ? `（計${movingSlice.length}枚）` : ''
          }を第${targetColIdx + 1}列へ移動しました。`
        );
        return true;
      }

      return false;
    },
    [gameState, pushHistoryAndApply]
  );

  const trySmartAutoMove = useCallback(
    (source: SelectionSource): boolean => {
      // 1. Try foundation first if single card
      if (executeMoveToFoundation(source)) {
        return true;
      }
      // 2. Try non-empty tableau columns first, then empty tableau columns for Kings
      // (Avoid moving a King that is already at index 0 of a tableau column into another empty column)
      const isAlreadyAtTableauBottom =
        source.zone === 'tableau' && source.cardIndex === 0;
      const candidateCols: number[] = [];
      for (let c = 0; c < 7; c += 1) {
        if (gameState.tableau[c].length > 0) candidateCols.push(c);
      }
      if (!isAlreadyAtTableauBottom) {
        for (let c = 0; c < 7; c += 1) {
          if (gameState.tableau[c].length === 0) candidateCols.push(c);
        }
      }
      for (const colIdx of candidateCols) {
        if (executeMoveToTableau(source, colIdx)) {
          return true;
        }
      }
      return false;
    },
    [executeMoveToFoundation, executeMoveToTableau, gameState.tableau]
  );

  const handleCardTap = useCallback(
    (source: SelectionSource) => {
      if (isWon) return;

      // If another source is already selected, try moving selected to this target first
      if (selected) {
        const isSame =
          selected.zone === source.zone &&
          selected.colIndex === source.colIndex &&
          selected.cardIndex === source.cardIndex &&
          selected.suit === source.suit;

        if (isSame) {
          // Double tap on same card -> smart auto move
          if (!trySmartAutoMove(source)) {
            setSelected(null);
          }
          return;
        }

        if (source.zone === 'tableau' && source.colIndex !== undefined) {
          if (executeMoveToTableau(selected, source.colIndex)) {
            return;
          }
        }
        if (source.zone === 'foundation') {
          if (executeMoveToFoundation(selected)) {
            return;
          }
        }
      }

      if (oneTapAuto) {
        if (trySmartAutoMove(source)) {
          return;
        }
      }

      setSelected(source);
      playCardSound('card', soundOn);
      setStatusMessage('移動先の列または組札をタップしてください（もう一度タップで選択解除）。');
    },
    [
      isWon,
      selected,
      oneTapAuto,
      trySmartAutoMove,
      executeMoveToTableau,
      executeMoveToFoundation,
      soundOn,
    ]
  );

  const handleAutoComplete = useCallback(() => {
    if (!canAutoComplete) return;
    const next = cloneState(gameState);
    let safety = 0;
    while (safety < 60) {
      safety += 1;
      let progressed = false;
      for (let c = 0; c < 7; c += 1) {
        const col = next.tableau[c];
        if (col.length === 0) continue;
        const top = col[col.length - 1];
        if (canMoveToFoundation(top, next.foundations) && top.suit !== 'joker') {
          col.pop();
          next.foundations[top.suit].push(top);
          next.moves += 1;
          next.score += 10;
          progressed = true;
        }
      }
      if (!progressed) break;
    }
    pushHistoryAndApply(next, 'オートコンプリートで全てのカードを組札へ回収しました！', 'win', 'clear');
  }, [canAutoComplete, gameState, pushHistoryAndApply]);

  const computeHint = useCallback(() => {
    triggerPartnerComment('hint');
    // 1. Check waste -> foundation
    if (gameState.waste.length > 0) {
      const topW = gameState.waste[gameState.waste.length - 1];
      if (canMoveToFoundation(topW, gameState.foundations)) {
        setHint({
          cardId: topW.id,
          description: `捨て札の「${SUIT_LABEL_JA[topW.suit]}${formatRank(topW.rank)}」を組札へ出せます`,
        });
        playCardSound('card', soundOn);
        return;
      }
    }
    // 2. Check tableau top -> foundation
    for (let c = 0; c < 7; c += 1) {
      const col = gameState.tableau[c];
      if (col.length === 0) continue;
      const top = col[col.length - 1];
      if (canMoveToFoundation(top, gameState.foundations)) {
        setHint({
          cardId: top.id,
          description: `第${c + 1}列の「${SUIT_LABEL_JA[top.suit]}${formatRank(top.rank)}」を組札へ移動できます`,
        });
        playCardSound('card', soundOn);
        return;
      }
    }
    // 3. Check tableau sequence that exposes face-down card or frees column for a King
    for (let c = 0; c < 7; c += 1) {
      const col = gameState.tableau[c];
      const firstFaceUpIdx = col.findIndex((card) => card.faceUp);
      if (firstFaceUpIdx === -1) continue;
      const head = col[firstFaceUpIdx];
      // Avoid pointless K move from already empty bottom to another empty column
      const isAlreadyAtBottom = firstFaceUpIdx === 0;
      for (let dst = 0; dst < 7; dst += 1) {
        if (dst === c) continue;
        if (isAlreadyAtBottom && head.rank === 13 && gameState.tableau[dst].length === 0) {
          continue;
        }
        if (canMoveToTableauColumn(head, gameState.tableau[dst])) {
          setHint({
            cardId: head.id,
            description: `第${c + 1}列の「${SUIT_LABEL_JA[head.suit]}${formatRank(head.rank)}」を第${dst + 1}列へ移動できます`,
          });
          playCardSound('card', soundOn);
          return;
        }
      }
    }
    // 4. Check waste -> tableau
    if (gameState.waste.length > 0) {
      const topW = gameState.waste[gameState.waste.length - 1];
      for (let dst = 0; dst < 7; dst += 1) {
        if (canMoveToTableauColumn(topW, gameState.tableau[dst])) {
          setHint({
            cardId: topW.id,
            description: `捨て札の「${SUIT_LABEL_JA[topW.suit]}${formatRank(topW.rank)}」を第${dst + 1}列へ移動できます`,
          });
          playCardSound('card', soundOn);
          return;
        }
      }
    }
    // 5. Stock draw suggestion
    if (gameState.stock.length > 0 || gameState.waste.length > 0) {
      setHint({
        cardId: 'STOCK_PILE',
        description: '左上の山札をタップして新しいカードをめくりましょう',
      });
      playCardSound('flip', soundOn);
      return;
    }

    setHint({
      cardId: 'NONE',
      description: '有効な手が見つかりません。「一手戻す」か「新規ゲーム」をお試しください。',
    });
    playCardSound('error', soundOn);
  }, [gameState, soundOn, triggerPartnerComment]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const visibleWaste =
    drawMode === 3 ? gameState.waste.slice(-3) : gameState.waste.slice(-1);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060a14] text-slate-100 select-none">
      {/* Sky Lounge Atmospheric Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
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
              'radial-gradient(ellipse at 50% 35%, rgba(7,11,20,0.35) 0%, rgba(5,8,16,0.88) 75%, #04070e 100%)',
          }}
        />
      </div>

      {/* Header Navigation */}
      <header className="relative z-20 border-b border-amber-300/25 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="rounded-lg border border-amber-300/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition hover:border-amber-300 hover:bg-amber-500/20"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">
                ROYAL FLUSH NIGHT · SOLITAIRE SALON
              </p>
              <h2 className="text-sm font-black sm:text-lg">
                ソリティア（クロンダイク）
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="flex rounded-lg border border-white/15 bg-black/40 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => startNewGame(1)}
                className={`rounded-md px-2.5 py-1 transition ${
                  drawMode === 1
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1枚めくり
              </button>
              <button
                type="button"
                onClick={() => startNewGame(3)}
                className={`rounded-md px-2.5 py-1 transition ${
                  drawMode === 3
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                3枚めくり
              </button>
            </div>

            {/* Felt Selector */}
            <div className="hidden items-center gap-1 rounded-lg border border-white/15 bg-black/40 p-0.5 text-[11px] sm:flex">
              {FELTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFelt(f.id)}
                  className={`rounded-md px-2 py-1 font-bold transition ${
                    felt === f.id
                      ? 'bg-amber-400/25 text-amber-200 ring-1 ring-amber-300/60'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {f.name.split('・')[0]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setVoiceOn((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                voiceOn
                  ? 'border-amber-300/60 bg-amber-500/20 text-amber-200'
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

      {/* Main Salon Container */}
      <div className="relative z-10 mx-auto max-w-6xl px-2 py-3 sm:px-4 sm:py-5">
        {/* Partner Character Navigator Widget */}
        <div className="mb-3 flex flex-col justify-between gap-3 rounded-2xl border border-amber-300/30 bg-gradient-to-r from-slate-950/90 via-slate-900/85 to-slate-950/90 p-3 shadow-xl backdrop-blur-md lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 shadow-lg sm:h-16 sm:w-16"
              style={{ borderColor: partner.color }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={charImage(partnerId, isWon ? 'win' : 'normal')}
                alt={partner.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-amber-300">
                  SALON PARTNER
                </span>
                <span className="text-xs font-black text-white sm:text-sm">{partner.name}</span>
                <span className="text-[11px] font-bold text-slate-400">（{partner.title}）</span>
              </div>
              <div className="mt-1 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-xs font-bold text-amber-100 shadow-inner">
                「{partnerLine}」
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              ナビゲーター切替:
            </span>
            {CHAR_IDS.map((cid) => {
              const c = CHARACTERS[cid];
              const active = cid === partnerId;
              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => handleSelectPartner(cid)}
                  title={`${c.name}（${c.title}）`}
                  className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 text-xs font-bold transition ${
                    active
                      ? 'border-amber-300 bg-amber-400/20 text-amber-100 shadow'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={charImage(cid, 'normal')}
                    alt={c.name}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span className="hidden sm:inline">{c.name.split(' ')[1] ?? c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Metrics & Action Controls */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/20 bg-slate-950/75 p-2.5 backdrop-blur sm:px-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm">
            <div>
              <span className="text-slate-400">手数</span>{' '}
              <span className="font-mono font-black text-emerald-300">{gameState.moves}</span>
            </div>
            <div>
              <span className="text-slate-400">タイム</span>{' '}
              <span className="font-mono font-black text-amber-300">{formatTime(elapsedSec)}</span>
            </div>
            <div>
              <span className="text-slate-400">スコア</span>{' '}
              <span className="font-mono font-black text-cyan-300">{gameState.score}</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400">組札進捗</span>{' '}
              <span className="font-mono font-black text-white">{foundationCount}/52</span>
            </div>
            {bestTimeSec !== null && (
              <div className="hidden md:block">
                <span className="text-slate-400">最速記録</span>{' '}
                <span className="font-mono font-bold text-emerald-200">
                  {formatTime(bestTimeSec)} ({gamesWon}勝)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOneTapAuto((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                oneTapAuto
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              ⚡ ワンタップ自動移動: {oneTapAuto ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-40"
            >
              ↩ 一手戻す ({history.length})
            </button>
            <button
              type="button"
              onClick={computeHint}
              className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1.5 text-xs font-black text-amber-200 transition hover:bg-amber-400/25"
            >
              💡 ヒント
            </button>
            <button
              type="button"
              onClick={() => startNewGame()}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-black text-cyan-200 transition hover:bg-cyan-500/25"
            >
              🔄 新規配り直し
            </button>
          </div>
        </div>

        {/* Auto-Complete Banner */}
        {canAutoComplete && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-400/20 px-4 py-2.5 shadow-lg">
            <p className="text-xs font-black text-amber-100 sm:text-sm">
              ✨ 場のすべてのカードが表向きになりました！ワンタップで自動回収できます。
            </p>
            <button
              type="button"
              onClick={handleAutoComplete}
              className="rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow transition hover:bg-amber-300 sm:text-sm"
            >
              オートコンプリート実行
            </button>
          </div>
        )}

        {/* Hint / Status Bar */}
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs backdrop-blur">
          <p className="font-bold text-amber-100">
            {hint ? `💡 ヒント: ${hint.description}` : statusMessage}
          </p>
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:bg-white/20"
            >
              選択解除
            </button>
          )}
        </div>

        {/* Salon Felt Table Surface */}
        <div
          className="relative overflow-hidden rounded-3xl border-2 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.75)] sm:p-5"
          style={{
            borderColor: `${feltMeta.accent}55`,
            backgroundImage: `linear-gradient(180deg, rgba(6,10,20,0.35) 0%, rgba(6,10,20,0.65) 100%), url(${HOLDEM_ASSETS.felt[felt]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Top Row: Stock + Waste (Left) and 4 Foundations (Right) */}
          <div className="mb-4 grid grid-cols-7 gap-1.5 sm:gap-3">
            {/* Stock Pile */}
            <div className="col-span-1 flex flex-col items-center">
              <span className="mb-1 text-[10px] font-bold text-amber-200/85">
                山札 ({gameState.stock.length})
              </span>
              <button
                type="button"
                onClick={handleStockClick}
                aria-label="山札をめくる"
                style={
                  gameState.stock.length > 0
                    ? {
                        backgroundImage: `url(${HOLDEM_ASSETS.cardBack})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
                className={`relative flex aspect-[5/7] w-full max-w-[78px] flex-col items-center justify-center overflow-hidden rounded-lg border-2 transition sm:rounded-xl ${
                  hint?.cardId === 'STOCK_PILE'
                    ? 'border-amber-400 ring-2 ring-amber-400'
                    : 'border-amber-300/45 hover:border-amber-300'
                } ${
                  gameState.stock.length > 0
                    ? 'bg-slate-900 shadow-md'
                    : 'bg-slate-950/60'
                }`}
              >
                {gameState.stock.length > 0 ? (
                  <div className="flex flex-col items-center rounded-md bg-slate-950/75 px-1.5 py-0.5 backdrop-blur-xs">
                    <span className="text-xs font-black text-amber-300 sm:text-sm">♠♥</span>
                    <span className="font-mono text-[10px] font-bold text-white">
                      {gameState.stock.length}枚
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-amber-200/85">
                    <span className="text-lg font-black">↻</span>
                    <span className="text-[9px] font-bold">戻す</span>
                  </div>
                )}
              </button>
            </div>

            {/* Waste Pile */}
            <div className="col-span-2 flex flex-col items-start">
              <span className="mb-1 text-[10px] font-bold text-amber-200/85">
                めくり札 ({gameState.waste.length})
              </span>
              <div className="relative flex aspect-[10/7] w-full items-center">
                {visibleWaste.length === 0 ? (
                  <div className="aspect-[5/7] w-1/2 max-w-[78px] rounded-lg border border-dashed border-amber-300/30 bg-black/30 sm:rounded-xl" />
                ) : (
                  visibleWaste.map((card, idx) => {
                    const isTop = idx === visibleWaste.length - 1;
                    const isSelected = selected?.zone === 'waste' && isTop;
                    const isHinted = hint?.cardId === card.id;
                    const red = isRedSuit(card.suit, card.rank);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        disabled={!isTop}
                        onClick={() => isTop && handleCardTap({ zone: 'waste' })}
                        style={{ left: `${idx * 18}px`, zIndex: idx + 1 }}
                        className={`absolute top-0 flex aspect-[5/7] w-1/2 max-w-[78px] flex-col justify-between rounded-lg border bg-gradient-to-b from-white to-slate-100 p-1 text-left shadow-md transition sm:rounded-xl sm:p-1.5 ${
                          isSelected
                            ? '-translate-y-1.5 border-amber-400 ring-2 ring-amber-400'
                            : isHinted
                              ? 'border-emerald-400 ring-2 ring-emerald-400'
                              : 'border-slate-300'
                        } ${red ? 'text-rose-600' : 'text-slate-900'} ${
                          isTop ? 'cursor-pointer hover:border-amber-300' : 'opacity-85'
                        }`}
                      >
                        <div className="flex items-center justify-between leading-none">
                          <span className="font-mono text-[11px] font-black sm:text-sm">
                            {formatRank(card.rank)}
                          </span>
                          <span className="text-[10px] sm:text-xs">{SUIT_SYMBOL[card.suit]}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <SuitVectorIcon suit={card.suit} className="h-4 w-4 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex rotate-180 items-center justify-between leading-none">
                          <span className="font-mono text-[10px] font-black sm:text-xs">
                            {formatRank(card.rank)}
                          </span>
                          <span className="text-[9px] sm:text-xs">{SUIT_SYMBOL[card.suit]}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 4 Foundation Piles */}
            {STANDARD_SUITS.map((suit) => {
              const pile = gameState.foundations[suit];
              const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
              const red = isRedSuit(suit);
              const isSelected = selected?.zone === 'foundation' && selected.suit === suit;

              return (
                <div key={suit} className="col-span-1 flex flex-col items-center">
                  <span className="mb-1 text-[10px] font-bold text-amber-300/90">
                    {SUIT_SYMBOL[suit]} 組札
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selected && selected.zone !== 'foundation') {
                        if (executeMoveToFoundation(selected)) return;
                      }
                      if (topCard) {
                        handleCardTap({ zone: 'foundation', suit });
                      }
                    }}
                    aria-label={`${SUIT_LABEL_JA[suit]}の組札`}
                    className={`relative flex aspect-[5/7] w-full max-w-[78px] flex-col justify-between rounded-lg border transition sm:rounded-xl ${
                      topCard
                        ? `bg-gradient-to-b from-white to-slate-100 p-1 shadow-md sm:p-1.5 ${
                            red ? 'text-rose-600' : 'text-slate-900'
                          }`
                        : 'items-center justify-center border-2 border-dashed border-amber-300/40 bg-slate-950/50'
                    } ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400'
                        : 'border-slate-300/80 hover:border-amber-300'
                    }`}
                  >
                    {topCard ? (
                      <>
                        <div className="flex items-center justify-between leading-none">
                          <span className="font-mono text-[11px] font-black sm:text-sm">
                            {formatRank(topCard.rank)}
                          </span>
                          <span className="text-[10px] sm:text-xs">{SUIT_SYMBOL[suit]}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <SuitVectorIcon suit={suit} className="h-4 w-4 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex rotate-180 items-center justify-between leading-none">
                          <span className="font-mono text-[10px] font-black sm:text-xs">
                            {formatRank(topCard.rank)}
                          </span>
                          <span className="text-[9px] sm:text-xs">{SUIT_SYMBOL[suit]}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center opacity-55">
                        <SuitVectorIcon
                          suit={suit}
                          className={`h-5 w-5 sm:h-6 sm:w-6 ${
                            red ? 'text-rose-400' : 'text-emerald-200'
                          }`}
                        />
                        <span className="mt-0.5 font-mono text-[9px] font-bold">A→K</span>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 7 Tableau Columns */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
            {gameState.tableau.map((col, colIdx) => {
              const colHeight = Math.max(280, 95 + col.length * 26);
              return (
                <div key={colIdx} className="flex flex-col items-center">
                  <span className="mb-1 font-mono text-[10px] font-bold text-amber-200/80">
                    {colIdx + 1}列
                  </span>
                  <div
                    className="relative w-full max-w-[82px]"
                    style={{ minHeight: `${colHeight}px` }}
                  >
                    {/* Empty Column Drop Target */}
                    {col.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selected) {
                            executeMoveToTableau(selected, colIdx);
                          }
                        }}
                        aria-label={`空の第${colIdx + 1}列（Kを配置可能）`}
                        className="flex aspect-[5/7] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-300/35 bg-slate-950/45 text-amber-200/60 transition hover:border-amber-300/80 sm:rounded-xl"
                      >
                        <span className="font-mono text-xs font-black">K</span>
                        <span className="text-[8px]">配置可</span>
                      </button>
                    )}

                    {col.map((card, cardIdx) => {
                      const topOffset = col
                        .slice(0, cardIdx)
                        .reduce((acc, c) => acc + (c.faceUp ? 23 : 11), 0);
                      const isSelected =
                        selected?.zone === 'tableau' &&
                        selected.colIndex === colIdx &&
                        selected.cardIndex !== undefined &&
                        cardIdx >= selected.cardIndex;
                      const isHinted = hint?.cardId === card.id;
                      const red = isRedSuit(card.suit, card.rank);

                      if (!card.faceUp) {
                        return (
                          <div
                            key={card.id}
                            style={{
                              top: `${topOffset}px`,
                              zIndex: cardIdx + 1,
                              backgroundImage: `url(${HOLDEM_ASSETS.cardBack})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                            className="absolute inset-x-0 aspect-[5/7] w-full rounded-lg border border-amber-200/40 bg-slate-900 shadow-sm sm:rounded-xl"
                          />
                        );
                      }

                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() =>
                            handleCardTap({
                              zone: 'tableau',
                              colIndex: colIdx,
                              cardIndex: cardIdx,
                            })
                          }
                          style={{ top: `${topOffset}px`, zIndex: cardIdx + 1 }}
                          className={`absolute inset-x-0 flex aspect-[5/7] w-full flex-col justify-between rounded-lg border bg-gradient-to-b from-white via-slate-50 to-slate-100 p-1 text-left shadow-md transition-transform sm:rounded-xl sm:p-1.5 ${
                            isSelected
                              ? '-translate-y-1 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                              : isHinted
                                ? 'border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.55)]'
                                : 'border-slate-300 hover:border-amber-300'
                          } ${red ? 'text-rose-600' : 'text-slate-900'}`}
                        >
                          <div className="flex items-center justify-between leading-none">
                            <span className="font-mono text-[11px] font-black tracking-tighter sm:text-sm">
                              {formatRank(card.rank)}
                            </span>
                            <span className="text-[10px] leading-none sm:text-xs">
                              {SUIT_SYMBOL[card.suit]}
                            </span>
                          </div>
                          <div className="flex items-center justify-center">
                            <SuitVectorIcon suit={card.suit} className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                          </div>
                          <div className="flex rotate-180 items-center justify-between leading-none">
                            <span className="font-mono text-[10px] font-black tracking-tighter sm:text-xs">
                              {formatRank(card.rank)}
                            </span>
                            <span className="text-[9px] leading-none sm:text-xs">
                              {SUIT_SYMBOL[card.suit]}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Royal Flush Night Victory Cut-In Banner */}
        {isWon && (
          <div className="mt-6 overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-slate-950/95 via-emerald-950/95 to-slate-950/95 p-5 shadow-[0_0_50px_rgba(251,191,36,0.35)] sm:p-6">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-300 shadow-xl sm:h-28 sm:w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={charImage(partnerId, 'win')}
                    alt={partner.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black tracking-widest text-amber-300 uppercase">
                    ROYAL FLUSH NIGHT · PERFECT SOLITAIRE CLEAR
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    🎉 VICTORY!! ソリティア完全クリア！
                  </h3>
                  <p className="mt-1.5 text-xs font-bold text-amber-200 sm:text-sm">
                    {partner.name}「{partnerLine}」
                  </p>
                  <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                    クリア手数: <span className="font-mono font-bold text-white">{gameState.moves}手</span> ／ タイム:{' '}
                    <span className="font-mono font-bold text-amber-300">{formatTime(elapsedSec)}</span> ／ 最終スコア:{' '}
                    <span className="font-mono font-bold text-emerald-300">{gameState.score}点</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startNewGame()}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-300"
                >
                  次のディールへ
                </button>
                <button
                  type="button"
                  onClick={() => startNewGame(1)}
                  className="rounded-xl border border-amber-300/60 bg-white/10 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/20 sm:text-sm"
                >
                  1枚めくりで再挑戦
                </button>
                <button
                  type="button"
                  onClick={() => startNewGame(3)}
                  className="rounded-xl border border-amber-300 bg-amber-400/20 px-4 py-2.5 text-xs font-black text-amber-100 transition hover:bg-amber-400/30 sm:text-sm"
                >
                  3枚めくり（上級）に挑戦
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
