'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import {
  CardItem,
  createSeededRng,
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

interface FreecellState {
  freeCells: (CardItem | null)[];
  foundations: Record<StandardSuit, CardItem[]>;
  tableau: CardItem[][];
  moves: number;
}

interface FreecellSelection {
  zone: 'freecell' | 'tableau';
  index: number; // freecell slot 0..3 or tableau col 0..7
  cardIndex?: number;
}

type SolitaireCommentEvent = 'deal' | 'foundation' | 'hint' | 'clear' | 'win';

const FREECELL_LINES: Record<CharId, Record<SolitaireCommentEvent, string[]>> = {
  luna: {
    deal: [
      '星々の配置が整いました…すべてのカードが見通せる完全情報の世界へようこそ。',
      'ディール開始です。フリーセルの空きを星図のように使いこなしましょう。',
    ],
    foundation: [
      '美しい軌跡…組札へカードが収まりましたね。',
      '星の導きのままに。順調に組札が満ちています。',
    ],
    hint: [
      '星の輝きがあのカードを示しています…いかがでしょうか？',
      '焦らずとも大丈夫。次の一手はここに眠っていますよ。',
    ],
    clear: [
      '空き列が生まれました！スーパー・ムーブの可動域が大きく広がります。',
      '流れが一気に加速しています…星々が連なっていきますね。',
    ],
    win: [
      'VICTORY!! 52枚の星すべてが組札の星座へと還りました…見事な完全勝利です！',
      '素晴らしい論理と直感の調和…今夜のロイヤル・サロンはあなたのものです。',
    ],
  },
  karen: {
    deal: [
      '運のせいにはできない完全情報戦よ！あんたの頭脳、見せてみなさい！',
      'さあ始めましょう！フリーセル4枠をどう使うかが勝負の分かれ目よ！',
    ],
    foundation: [
      'いい調子じゃない！どんどん組札へ送り込みなさい！',
      'ふふん、鮮やかな一手ね！その調子よ！',
    ],
    hint: [
      'もう、しょうがないわね！特別に狙い目のカードを教えてあげる！',
      'ここよ、ここ！しっかり盤面を見渡しなさいよね！',
    ],
    clear: [
      '列が空いたわよ！これでまとめて大移動できるじゃない！',
      '一気に畳み掛けるわよ！主導権は私たちのものね！',
    ],
    win: [
      'VICTORY!! 当然の結果ね！私たちにかかればフリーセルなんて楽勝よ♪',
      '完全制覇よ！さあ、次のディールも華麗にねじ伏せてあげるわ！',
    ],
  },
  rei: {
    deal: [
      '全52枚が開示された初期盤面だ。最適手順を逆算して攻略しよう。',
      'フリーセルと空き列の数を管理すれば、最大移動枚数は指数関数的に増える。',
    ],
    foundation: [
      '合理的な回収だ。盤面の自由度が1段階向上した。',
      '組札への格納完了。計算通りの進行だ。',
    ],
    hint: [
      '現局面における期待値の高い候補をハイライトした。確認してくれ。',
      'ボトルネックを解消する一手はここだ。',
    ],
    clear: [
      '空き列の確保に成功した。これでスーパー・ムーブの上限が倍増する。',
      '収束に入ったな。残りの組札回収まで最短ルートだ。',
    ],
    win: [
      'VICTORY!! 完璧な論理展開だ。1枚の無駄もない見事なソルブだったよ。',
      'Q.E.D. 証明終了だ。次のシードでも最適解を導き出そう。',
    ],
  },
  koharu: {
    deal: [
      'にゃっほー！ぜんぶ表向きのキラキラ盤面にゃ！楽しくパズルするにゃ♪',
      'フリーセルは4つのお昼寝スペースにゃ！上手に使うにゃ～！',
    ],
    foundation: [
      'やったにゃ！組札がひとつ進んだにゃ♪',
      'いいリズムにゃ～！ピカピカ集めるにゃ！',
    ],
    hint: [
      'くんくん…こっちのカードが動きたそうにしているにゃ！',
      'コハルの直感レーダーがピピッと光ったにゃ！ここはどうかにゃ？',
    ],
    clear: [
      'わぁい！列がまるごと空いたにゃ！いっぱいまとめて動かせるにゃ！',
      'シュシュシュッと大回収にゃーっ！気持ちいいにゃ♪',
    ],
    win: [
      'VICTORY!! ぜんぶ揃ったにゃーっ！天才パズルマスター誕生にゃ♪',
      '大勝利にゃ！ご褒美にロイヤル・サロンのパフェでお祝いするにゃ！',
    ],
  },
  valentina: {
    deal: [
      'ふふっ、隠されたカードのない真剣勝負…あなたの知性を見せてちょうだい。',
      'ロイヤル・ナイト・サロンの特等席よ。優雅に解き明かしましょう。',
    ],
    foundation: [
      '美しいわ…宝石を並べるように組札を整えていくのね。',
      'ええ、その調子よ。焦らず華麗に進めましょう。',
    ],
    hint: [
      '迷っているのかしら？ふふ、女帝が少しだけ導いてあげるわ。',
      'このカードに視線を向けてごらんなさい。道が開けるはずよ。',
    ],
    clear: [
      '見事なスペースメイクね。盤面があなたの支配下に入ったわ。',
      'さあ、フィナーレよ。華やかにすべてを回収してしまいなさい。',
    ],
    win: [
      'VICTORY!! 惚れ惚れするほど優雅なクリアね。今夜のグラスをあなたに捧げるわ。',
      '完全なる勝利…私の目に狂いはなかったようね♪',
    ],
  },
  jin: {
    deal: [
      '言い訳のきかねえ完全情報パズルだ。じっくり筋を読んでいきな。',
      'フリーセルを埋めすぎないのが鉄則だ。退路を常に残しておけよ。',
    ],
    foundation: [
      '悪くねえ一手だ。着実に組札へ積んでいけ。',
      'よし、盤面が軽くなってきたな。',
    ],
    hint: [
      '詰まった時は視点を変えるんだ。このカードから崩してみな。',
      '焦るな。突破口はそこにあるぜ。',
    ],
    clear: [
      '列を空けたか！いい判断だ、これで一気に勝負がつくぜ。',
      '見事なラッシュだ。最後まで気を抜くんじゃねえぞ。',
    ],
    win: [
      'VICTORY!! 鮮やかな手並みだったぜ。まさにプロの思考だな。',
      '完勝だ。次のディールでもその冴えた読みを見せてくれ。',
    ],
  },
  sakura: {
    deal: [
      'すべての札が表向き…一点の曇りなき真剣勝負ですわね。',
      'フリーセル4枠をいかに活かすか、お手並み拝見いたしますわ。',
    ],
    foundation: [
      'お見事ですわ。組札へ美しく収まりました。',
      '凛とした手順ですわね。そのまま参りましょう。',
    ],
    hint: [
      'お迷いですか？あの札に活路がございますわ。',
      '桜の風が示す一手はこちらですわ。',
    ],
    clear: [
      '空き列が整いましたわ！一気に連ねて参りましょう！',
      '盤面が開けましたわね。勝負を決める好機です！',
    ],
    win: [
      'VICTORY!! 52枚すべてが咲き誇りました…天晴れな完全勝利ですわ！',
      '一点の乱れもなき見事な采配でしたわ♪',
    ],
  },
  alice: {
    deal: [
      'わぁ♪ ぜんぶのカードが見えてる不思議の国パズルね！',
      'フリーセルのお部屋を上手に使ってあそびましょ♪',
    ],
    foundation: [
      'えへへ、組札にぴょんと入ったわ♪',
      'キラキラ集まっていくわね！いい感じよ♪',
    ],
    hint: [
      'ふふっ、あのカードが「こっちだよ」って手を振ってるわ♪',
      'アリスの魔法のルーペだと、ここが怪しいわよ♪',
    ],
    clear: [
      'やったぁ！列がまるごと空いたから大行進できるわよ♪',
      'ワンダーランドの特急列車みたいに一気に片付けちゃお！',
    ],
    win: [
      'VICTORY!! ぜんぶのカードが揃ったわ〜っ！拍手喝采よ♪',
      'すごーい！アリスもびっくりな名探偵さんね♪',
    ],
  },
  leon: {
    deal: [
      '全カードが開示された真っ向勝負だな！王者の知略を見せてやろう！',
      'フリーセルを制する者が盤面を制す。堂々と挑め！',
    ],
    foundation: [
      'いいぞ、着実に組札の城が築かれているな！',
      '力強く美しい一手だ！そのまま突き進め！',
    ],
    hint: [
      '突破口はここだ！迷わずこのカードを動かせ！',
      '王者の眼には次の一手が見えているぞ。ここだ！',
    ],
    clear: [
      'よし、空き列を確保したな！大軍勢を一気に進軍させろ！',
      '盤面は完全に我々の支配下だ！一気に決着をつけよう！',
    ],
    win: [
      'VICTORY!! 52枚完全制覇！王座にふさわしい圧倒的な頭脳だ！',
      'ハッハッハ！見事な完勝だ、次のディールも制覇するぞ！',
    ],
  },
  chloe: {
    deal: [
      '完全情報ゲームね。初期配置のグラフ構造から最短解を導き出すわよ。',
      'フリーセルの占有率を最小限に抑えるのがアルゴリズムの鉄則よ。',
    ],
    foundation: [
      '組札への格納を確認。探索空間が順調に縮小しているわ。',
      '無駄のないムーブね。評価値が上がっているわよ。',
    ],
    hint: [
      '盤面解析の結果、最も優先度の高いムーブはここよ。',
      'デッドロックを回避する最適手を示したわ。確認しなさい。',
    ],
    clear: [
      '空き列の生成に成功ね。最大移動枚数が倍増したわ。',
      '収束ルートが確定したわね。残りを高速回収しましょう。',
    ],
    win: [
      'VICTORY!! 計算通りの完全解ね。あなたの論理思考、認めてあげるわ。',
      '全52枚の格納完了。美しいソルブデータだわ。',
    ],
  },
  hibiki: {
    deal: [
      'ぜんぶ表向きのガチンコ勝負ね！ノリとひらめきで一気に解くわよ！',
      'フリーセルの4枠、リズムよく回していきなさい！',
    ],
    foundation: [
      'ナイス！いいテンポで組札に決まってるわよ！',
      'ガンガン積んでいきましょ！ノッてきたわね！',
    ],
    hint: [
      'ほら、あのカードがウズウズしてるわよ！動かしてみな！',
      '私の直感ビートがここを指してるわ！いっちゃいなさい！',
    ],
    clear: [
      '列が空いたわよ！スーパー・ムーブでド派手にぶち抜きなさい！',
      '最高潮のラッシュ突入よ！一気にフィニッシュまで駆け抜けるわよ！',
    ],
    win: [
      'VICTORY!! パーフェクトクリアきたわねーっ！！最高のライブだったわ♪',
      'あんたの頭脳、マジでロックだわ！次もぶちかましましょ！',
    ],
  },
  suou: {
    deal: [
      'すべてが見通せる盤面…まるで枯山水の庭園を眺めているかのようですね。',
      '一手の重みを感じながら、静かに紐解いていきましょう。',
    ],
    foundation: [
      '組札へと綺麗に収まりましたね。心地よい流れです。',
      '焦らずとも、自ずと道は整っていきますよ。',
    ],
    hint: [
      'ふふ、あの札に少し触れてみてはいかがでしょう。',
      '静かに目を凝らせば、次の一手が浮かび上がってきますよ。',
    ],
    clear: [
      '余白が生まれましたね。これで大きく盤面を動かせます。',
      '澱みが消え、清らかな流れになりました。さあ仕上げです。',
    ],
    win: [
      'VICTORY!! 52枚すべてが在るべき場所へ還りました…お見事です。',
      '洗練された美しい手順でした。もう一局、お付き合いいたしましょう。',
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

function cloneFreecell(state: FreecellState): FreecellState {
  return {
    freeCells: state.freeCells.map((c) => (c ? { ...c } : null)),
    foundations: {
      spades: state.foundations.spades.map((c) => ({ ...c })),
      hearts: state.foundations.hearts.map((c) => ({ ...c })),
      diamonds: state.foundations.diamonds.map((c) => ({ ...c })),
      clubs: state.foundations.clubs.map((c) => ({ ...c })),
    },
    tableau: state.tableau.map((col) => col.map((c) => ({ ...c }))),
    moves: state.moves,
  };
}

function createDealForSeed(seed: number): FreecellState {
  const rng = createSeededRng(seed);
  const deck = shuffleWithRng(createStandardDeck(true, seed), rng);
  const tableau: CardItem[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((card, idx) => {
    tableau[idx % 8].push({ ...card, faceUp: true });
  });
  return {
    freeCells: [null, null, null, null],
    foundations: {
      spades: [],
      hearts: [],
      diamonds: [],
      clubs: [],
    },
    tableau,
    moves: 0,
  };
}

function isValidDescendingAlternatingSequence(cards: CardItem[]): boolean {
  for (let i = 0; i < cards.length - 1; i += 1) {
    const upper = cards[i];
    const lower = cards[i + 1];
    if (upper.suit === 'joker' || lower.suit === 'joker') return false;
    if (!isAlternatingColor(upper.suit, lower.suit)) return false;
    if (upper.rank !== lower.rank + 1) return false;
  }
  return true;
}

function computeMaxSupermove(
  freeCells: (CardItem | null)[],
  tableau: CardItem[][],
  targetIsEmptyCol = false
): number {
  const emptyFreeCells = freeCells.filter((c) => c === null).length;
  const totalEmptyCols = tableau.filter((col) => col.length === 0).length;
  const usableEmptyCols = Math.max(0, targetIsEmptyCol ? totalEmptyCols - 1 : totalEmptyCols);
  return (1 + emptyFreeCells) * Math.pow(2, usableEmptyCols);
}

function canMoveCardToFoundation(
  card: CardItem,
  foundations: Record<StandardSuit, CardItem[]>
): boolean {
  if (card.suit === 'joker') return false;
  return foundations[card.suit].length + 1 === card.rank;
}

function isSafeToAutoFoundation(
  card: CardItem,
  foundations: Record<StandardSuit, CardItem[]>
): boolean {
  if (!canMoveCardToFoundation(card, foundations)) return false;
  if (card.rank <= 2) return true;
  const red = isRedSuit(card.suit);
  const oppositeSuits: StandardSuit[] = red ? ['spades', 'clubs'] : ['hearts', 'diamonds'];
  const minOppositeRank = Math.min(...oppositeSuits.map((s) => foundations[s].length));
  return minOppositeRank >= card.rank - 1;
}

function applySafeAutoFoundations(state: FreecellState): FreecellState {
  const next = cloneFreecell(state);
  let changed = true;
  let guard = 0;
  while (changed && guard < 52) {
    changed = false;
    guard += 1;
    // Check freeCells
    for (let i = 0; i < 4; i += 1) {
      const c = next.freeCells[i];
      if (c && isSafeToAutoFoundation(c, next.foundations) && c.suit !== 'joker') {
        next.foundations[c.suit].push(c);
        next.freeCells[i] = null;
        changed = true;
      }
    }
    // Check tableau tops
    for (let col = 0; col < 8; col += 1) {
      const pile = next.tableau[col];
      if (pile.length === 0) continue;
      const top = pile[pile.length - 1];
      if (isSafeToAutoFoundation(top, next.foundations) && top.suit !== 'joker') {
        pile.pop();
        next.foundations[top.suit].push(top);
        changed = true;
      }
    }
  }
  return next;
}

export default function FreecellGame() {
  const [dealNumber, setDealNumber] = useState<number>(1);
  const [seedInput, setSeedInput] = useState<string>('1');
  const [gameState, setGameState] = useState<FreecellState>(() =>
    applySafeAutoFoundations(createDealForSeed(1))
  );
  const [history, setHistory] = useState<FreecellState[]>([]);
  const [selected, setSelected] = useState<FreecellSelection | null>(null);
  const [oneTapAuto, setOneTapAuto] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [bgmOn, setBgmOn] = useState<boolean>(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(true);
  const [felt, setFelt] = useState<FeltId>('midnight');
  const [partnerId, setPartnerId] = useState<CharId>('luna');
  const [partnerLine, setPartnerLine] = useState<string>(
    FREECELL_LINES.luna.deal[0]
  );
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  useCardTableBgm(bgmOn, 'lounge');
  const [hintCardId, setHintCardId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'ゲーム番号 #1：すべてのカードが最初から表向きの完全情報パズルです'
  );
  const [clearedDeals, setClearedDeals] = useState<number>(0);

  const partner = CHARACTERS[partnerId];
  const feltMeta = FELTS.find((f) => f.id === felt) ?? FELTS[2];

  const triggerPartnerComment = useCallback(
    (event: SolitaireCommentEvent, overrideCharId?: CharId) => {
      const cid = overrideCharId ?? partnerId;
      const ch = CHARACTERS[cid];
      const pool = FREECELL_LINES[cid][event];
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

  const foundationTotal =
    gameState.foundations.spades.length +
    gameState.foundations.hearts.length +
    gameState.foundations.diamonds.length +
    gameState.foundations.clubs.length;
  const remainingCards = 52 - foundationTotal;
  const isWon = remainingCards === 0;

  const currentSupermoveMax = useMemo(
    () => computeMaxSupermove(gameState.freeCells, gameState.tableau, false),
    [gameState.freeCells, gameState.tableau]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem('zatsudan_freecell_wins_v1');
      if (saved) setClearedDeals(Number(saved) || 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isWon || gameState.moves === 0) return;
    const t = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [isWon, gameState.moves]);

  const startDeal = useCallback(
    (seed: number) => {
      const normalized = Math.max(1, Math.min(99999, Math.floor(seed) || 1));
      setDealNumber(normalized);
      setSeedInput(String(normalized));
      setGameState(applySafeAutoFoundations(createDealForSeed(normalized)));
      setHistory([]);
      setSelected(null);
      setHintCardId(null);
      setElapsedSec(0);
      setStatusMessage(`ディール #${normalized} を開始しました。`);
      playCardSound('flip', soundOn);
      triggerPartnerComment('deal');
    },
    [soundOn, triggerPartnerComment]
  );

  const commitState = useCallback(
    (nextRaw: FreecellState, message: string, commentHint?: SolitaireCommentEvent) => {
      const prevEmptyCols = gameState.tableau.filter((c) => c.length === 0).length;
      const next = applySafeAutoFoundations(nextRaw);
      const nextEmptyCols = next.tableau.filter((c) => c.length === 0).length;
      setHistory((prev) => [...prev.slice(-90), cloneFreecell(gameState)]);
      setGameState(next);
      setSelected(null);
      setHintCardId(null);
      setStatusMessage(message);

      const nextFound =
        next.foundations.spades.length +
        next.foundations.hearts.length +
        next.foundations.diamonds.length +
        next.foundations.clubs.length;
      if (nextFound === 52) {
        playCardSound('win', soundOn);
        const nextWins = clearedDeals + 1;
        setClearedDeals(nextWins);
        try {
          localStorage.setItem('zatsudan_freecell_wins_v1', String(nextWins));
        } catch {
          // ignore
        }
        triggerPartnerComment('win');
      } else {
        playCardSound('card', soundOn);
        if (commentHint) {
          triggerPartnerComment(commentHint);
        } else if (nextEmptyCols > prevEmptyCols) {
          triggerPartnerComment('clear');
        }
      }
    },
    [gameState, soundOn, clearedDeals, triggerPartnerComment]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setGameState(last);
    setSelected(null);
    setHintCardId(null);
    setStatusMessage('一手戻しました。');
    playCardSound('flip', soundOn);
  }, [history, soundOn]);

  const tryMoveToFoundation = useCallback(
    (src: FreecellSelection): boolean => {
      const next = cloneFreecell(gameState);
      if (src.zone === 'freecell') {
        const card = next.freeCells[src.index];
        if (!card || !canMoveCardToFoundation(card, next.foundations) || card.suit === 'joker') {
          return false;
        }
        next.freeCells[src.index] = null;
        next.foundations[card.suit].push(card);
        next.moves += 1;
        commitState(
          next,
          `${SUIT_LABEL_JA[card.suit]}${formatRank(card.rank)}を組札へ移動しました。`,
          'foundation'
        );
        return true;
      }
      const col = next.tableau[src.index];
      if (col.length === 0) return false;
      const cardIndex = src.cardIndex ?? col.length - 1;
      if (cardIndex !== col.length - 1) return false;
      const card = col[col.length - 1];
      if (!canMoveCardToFoundation(card, next.foundations) || card.suit === 'joker') return false;
      col.pop();
      next.foundations[card.suit].push(card);
      next.moves += 1;
      commitState(
        next,
        `${SUIT_LABEL_JA[card.suit]}${formatRank(card.rank)}を組札へ移動しました。`,
        'foundation'
      );
      return true;
    },
    [gameState, commitState]
  );

  const tryMoveToFreeCell = useCallback(
    (src: FreecellSelection, targetSlot?: number): boolean => {
      const next = cloneFreecell(gameState);
      const slot =
        targetSlot !== undefined
          ? targetSlot
          : next.freeCells.findIndex((c) => c === null);
      if (slot < 0 || slot > 3 || next.freeCells[slot] !== null) return false;

      if (src.zone === 'freecell') return false;
      const col = next.tableau[src.index];
      if (col.length === 0) return false;
      const cardIndex = src.cardIndex ?? col.length - 1;
      if (cardIndex !== col.length - 1) return false;
      const card = col.pop()!;
      next.freeCells[slot] = card;
      next.moves += 1;
      commitState(
        next,
        `${SUIT_LABEL_JA[card.suit]}${formatRank(card.rank)}をフリーセル#${slot + 1}へ移動しました。`
      );
      return true;
    },
    [gameState, commitState]
  );

  const tryMoveToTableauCol = useCallback(
    (src: FreecellSelection, targetColIdx: number): boolean => {
      const next = cloneFreecell(gameState);
      const dstCol = next.tableau[targetColIdx];
      const dstIsEmpty = dstCol.length === 0;

      if (src.zone === 'freecell') {
        const card = next.freeCells[src.index];
        if (!card || card.suit === 'joker') return false;
        if (!dstIsEmpty) {
          const topDst = dstCol[dstCol.length - 1];
          if (
            topDst.suit === 'joker' ||
            !isAlternatingColor(card.suit, topDst.suit) ||
            card.rank !== topDst.rank - 1
          ) {
            return false;
          }
        }
        next.freeCells[src.index] = null;
        dstCol.push(card);
        next.moves += 1;
        commitState(
          next,
          `${SUIT_LABEL_JA[card.suit]}${formatRank(card.rank)}を第${targetColIdx + 1}列へ移動しました。`
        );
        return true;
      }

      if (src.index === targetColIdx) return false;
      const srcCol = next.tableau[src.index];
      const startIdx = src.cardIndex ?? srcCol.length - 1;
      if (startIdx < 0 || startIdx >= srcCol.length) return false;

      const movingSlice = srcCol.slice(startIdx);
      if (!isValidDescendingAlternatingSequence(movingSlice)) return false;

      const maxAllowed = computeMaxSupermove(next.freeCells, next.tableau, dstIsEmpty);
      if (movingSlice.length > maxAllowed) return false;

      const head = movingSlice[0];
      if (head.suit === 'joker') return false;
      if (!dstIsEmpty) {
        const topDst = dstCol[dstCol.length - 1];
        if (
          topDst.suit === 'joker' ||
          !isAlternatingColor(head.suit, topDst.suit) ||
          head.rank !== topDst.rank - 1
        ) {
          return false;
        }
      }

      srcCol.splice(startIdx);
      dstCol.push(...movingSlice);
      next.moves += 1;
      commitState(
        next,
        `${SUIT_LABEL_JA[head.suit]}${formatRank(head.rank)}${
          movingSlice.length > 1 ? `（スーパー・ムーブ${movingSlice.length}枚）` : ''
        }を第${targetColIdx + 1}列へ移動しました。`
      );
      return true;
    },
    [gameState, commitState]
  );

  const trySmartOneTap = useCallback(
    (src: FreecellSelection): boolean => {
      if (tryMoveToFoundation(src)) return true;

      // Prefer non-empty valid tableau columns first
      for (let c = 0; c < 8; c += 1) {
        if (gameState.tableau[c].length > 0 && tryMoveToTableauCol(src, c)) {
          return true;
        }
      }
      // Then empty tableau columns (unless moving a whole tableau column from index 0 to another empty column)
      const isWholeTableauCol =
        src.zone === 'tableau' &&
        (src.cardIndex ?? gameState.tableau[src.index].length - 1) === 0;
      if (!isWholeTableauCol) {
        for (let c = 0; c < 8; c += 1) {
          if (gameState.tableau[c].length === 0 && tryMoveToTableauCol(src, c)) {
            return true;
          }
        }
      }
      // Finally freeCell if top card from tableau
      if (src.zone === 'tableau' && tryMoveToFreeCell(src)) {
        return true;
      }
      return false;
    },
    [tryMoveToFoundation, tryMoveToTableauCol, tryMoveToFreeCell, gameState.tableau]
  );

  const handleCardSelectOrMove = useCallback(
    (src: FreecellSelection) => {
      if (isWon) return;

      if (selected) {
        const isSame =
          selected.zone === src.zone &&
          selected.index === src.index &&
          selected.cardIndex === src.cardIndex;
        if (isSame) {
          if (!trySmartOneTap(src)) {
            setSelected(null);
          }
          return;
        }
        if (src.zone === 'tableau' && tryMoveToTableauCol(selected, src.index)) {
          return;
        }
      }

      if (oneTapAuto && trySmartOneTap(src)) {
        return;
      }

      // Check if sequence is valid before selecting
      if (src.zone === 'tableau' && src.cardIndex !== undefined) {
        const slice = gameState.tableau[src.index].slice(src.cardIndex);
        if (!isValidDescendingAlternatingSequence(slice)) {
          playCardSound('error', soundOn);
          setStatusMessage('赤黒交互かつ連番になっているカードの束のみまとめて動かせます。');
          return;
        }
      }

      setSelected(src);
      playCardSound('card', soundOn);
      setStatusMessage('移動先の列・フリーセル・組札をタップしてください。');
    },
    [isWon, selected, oneTapAuto, trySmartOneTap, tryMoveToTableauCol, gameState.tableau, soundOn]
  );

  const handleHint = useCallback(() => {
    triggerPartnerComment('hint');
    // 1. Check foundation moves
    for (let i = 0; i < 4; i += 1) {
      const c = gameState.freeCells[i];
      if (c && canMoveCardToFoundation(c, gameState.foundations)) {
        setHintCardId(c.id);
        setStatusMessage(`💡 ヒント: フリーセル#${i + 1}の「${SUIT_LABEL_JA[c.suit]}${formatRank(c.rank)}」を組札へ出せます`);
        playCardSound('card', soundOn);
        return;
      }
    }
    for (let col = 0; col < 8; col += 1) {
      const pile = gameState.tableau[col];
      if (pile.length === 0) continue;
      const top = pile[pile.length - 1];
      if (canMoveCardToFoundation(top, gameState.foundations)) {
        setHintCardId(top.id);
        setStatusMessage(`💡 ヒント: 第${col + 1}列の「${SUIT_LABEL_JA[top.suit]}${formatRank(top.rank)}」を組札へ出せます`);
        playCardSound('card', soundOn);
        return;
      }
    }
    // 2. Check tableau to non-empty tableau
    for (let col = 0; col < 8; col += 1) {
      const pile = gameState.tableau[col];
      if (pile.length === 0) continue;
      const top = pile[pile.length - 1];
      if (top.suit === 'joker') continue;
      for (let dst = 0; dst < 8; dst += 1) {
        if (dst === col || gameState.tableau[dst].length === 0) continue;
        const dstTop = gameState.tableau[dst][gameState.tableau[dst].length - 1];
        if (
          dstTop.suit !== 'joker' &&
          isAlternatingColor(top.suit, dstTop.suit) &&
          top.rank === dstTop.rank - 1
        ) {
          setHintCardId(top.id);
          setStatusMessage(`💡 ヒント: 第${col + 1}列の「${SUIT_LABEL_JA[top.suit]}${formatRank(top.rank)}」を第${dst + 1}列へ重ねられます`);
          playCardSound('card', soundOn);
          return;
        }
      }
    }
    // 3. FreeCell available
    if (gameState.freeCells.some((c) => c === null)) {
      for (let col = 0; col < 8; col += 1) {
        const pile = gameState.tableau[col];
        if (pile.length > 0) {
          const top = pile[pile.length - 1];
          setHintCardId(top.id);
          setStatusMessage(`💡 ヒント: 空いているフリーセルを使って第${col + 1}列のカードを一時退避できます`);
          playCardSound('card', soundOn);
          return;
        }
      }
    }

    setStatusMessage('💡 ヒント: 「一手戻す」で別ルートを試すか、フリーセルを空けましょう');
    playCardSound('error', soundOn);
  }, [gameState, soundOn, triggerPartnerComment]);

  const handleAutoFinishAll = useCallback(() => {
    const next = cloneFreecell(gameState);
    let loops = 0;
    while (loops < 60) {
      loops += 1;
      let moved = false;
      for (let i = 0; i < 4; i += 1) {
        const c = next.freeCells[i];
        if (c && canMoveCardToFoundation(c, next.foundations) && c.suit !== 'joker') {
          next.foundations[c.suit].push(c);
          next.freeCells[i] = null;
          next.moves += 1;
          moved = true;
        }
      }
      for (let col = 0; col < 8; col += 1) {
        const pile = next.tableau[col];
        if (pile.length === 0) continue;
        const top = pile[pile.length - 1];
        if (canMoveCardToFoundation(top, next.foundations) && top.suit !== 'joker') {
          pile.pop();
          next.foundations[top.suit].push(top);
          next.moves += 1;
          moved = true;
        }
      }
      if (!moved) break;
    }
    commitState(next, '組札へ出せるカードをまとめて回収しました。', 'clear');
  }, [gameState, commitState]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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

      {/* Header */}
      <header className="relative z-20 border-b border-amber-300/25 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2.5">
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
                フリーセル（FreeCell）
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Game Seed Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-amber-300/25 bg-black/50 px-2 py-1 text-xs">
              <span className="font-bold text-amber-300">#</span>
              <input
                type="number"
                min={1}
                max={99999}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                aria-label="ゲーム番号"
                className="w-14 bg-transparent font-mono font-bold text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => startDeal(Number(seedInput))}
                className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-black text-slate-950 hover:bg-amber-300"
              >
                開始
              </button>
              <button
                type="button"
                onClick={() => startDeal(Math.floor(Math.random() * 99999) + 1)}
                className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:bg-white/20"
              >
                ランダム
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
                  ? 'border-teal-400/60 bg-teal-500/20 text-teal-200'
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

        {/* Metrics & Controls */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/20 bg-slate-950/75 p-2.5 backdrop-blur sm:px-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm">
            <div>
              <span className="text-slate-400">ディール</span>{' '}
              <span className="font-mono font-black text-amber-300">#{dealNumber}</span>
            </div>
            <div>
              <span className="text-slate-400">残りカード</span>{' '}
              <span className="font-mono font-black text-amber-300">{remainingCards}枚</span>
            </div>
            <div>
              <span className="text-slate-400">手数</span>{' '}
              <span className="font-mono font-black text-white">{gameState.moves}</span>
            </div>
            <div>
              <span className="text-slate-400">最大同時移動</span>{' '}
              <span className="font-mono font-black text-cyan-300">{currentSupermoveMax}枚</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400">タイム</span>{' '}
              <span className="font-mono font-bold text-slate-200">{formatTime(elapsedSec)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOneTapAuto((prev) => !prev)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                oneTapAuto
                  ? 'border-teal-400/60 bg-teal-500/20 text-teal-200'
                  : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              ⚡ ワンタップ移動: {oneTapAuto ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-40"
            >
              ↩ 一手戻す ({history.length})
            </button>
            <button
              type="button"
              onClick={handleHint}
              className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1.5 text-xs font-black text-amber-200 hover:bg-amber-400/25"
            >
              💡 ヒント
            </button>
            <button
              type="button"
              onClick={handleAutoFinishAll}
              className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/25"
            >
              ✨ 組札回収
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs font-bold text-amber-100 backdrop-blur">
          <span>{statusMessage}</span>
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-white/20"
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
          {/* Top Row: 4 FreeCells (Left) + 4 Foundations (Right) */}
          <div className="mb-4 grid grid-cols-8 gap-1 sm:gap-2.5">
            {/* 4 Free Cells */}
            {gameState.freeCells.map((card, slotIdx) => {
              const isSelected = selected?.zone === 'freecell' && selected.index === slotIdx;
              const isHinted = card && hintCardId === card.id;
              const red = card ? isRedSuit(card.suit, card.rank) : false;

              return (
                <div key={`fc-${slotIdx}`} className="flex flex-col items-center">
                  <span className="mb-1 text-[9px] font-bold text-teal-200/90 sm:text-[10px]">
                    FREE #{slotIdx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!card) {
                        if (selected) tryMoveToFreeCell(selected, slotIdx);
                        return;
                      }
                      handleCardSelectOrMove({ zone: 'freecell', index: slotIdx });
                    }}
                    aria-label={`フリーセル ${slotIdx + 1}`}
                    className={`flex aspect-[5/7] w-full max-w-[76px] flex-col justify-between rounded-lg border transition sm:rounded-xl ${
                      card
                        ? `bg-gradient-to-b from-white to-slate-100 p-1 shadow-md sm:p-1.5 ${
                            red ? 'text-rose-600' : 'text-slate-900'
                          }`
                        : 'items-center justify-center border-2 border-dashed border-teal-300/40 bg-slate-950/50 text-teal-200/60'
                    } ${
                      isSelected
                        ? '-translate-y-1 border-amber-400 ring-2 ring-amber-400'
                        : isHinted
                          ? 'border-emerald-400 ring-2 ring-emerald-400'
                          : 'border-slate-300 hover:border-amber-300'
                    }`}
                  >
                    {card ? (
                      <>
                        <div className="flex items-center justify-between leading-none">
                          <span className="font-mono text-[11px] font-black sm:text-sm">
                            {formatRank(card.rank)}
                          </span>
                          <span className="text-[10px] sm:text-xs">{SUIT_SYMBOL[card.suit]}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <SuitVectorIcon suit={card.suit} className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                        </div>
                        <div className="flex rotate-180 items-center justify-between leading-none">
                          <span className="font-mono text-[10px] font-black sm:text-xs">
                            {formatRank(card.rank)}
                          </span>
                          <span className="text-[9px] sm:text-xs">{SUIT_SYMBOL[card.suit]}</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[9px] font-bold">空き</span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* 4 Foundations */}
            {STANDARD_SUITS.map((suit) => {
              const pile = gameState.foundations[suit];
              const top = pile.length > 0 ? pile[pile.length - 1] : null;
              const red = isRedSuit(suit);

              return (
                <div key={`fd-${suit}`} className="flex flex-col items-center">
                  <span className="mb-1 text-[9px] font-bold text-amber-300/90 sm:text-[10px]">
                    {SUIT_SYMBOL[suit]} 組札
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selected) {
                        tryMoveToFoundation(selected);
                      }
                    }}
                    aria-label={`${SUIT_LABEL_JA[suit]}の組札`}
                    className={`flex aspect-[5/7] w-full max-w-[76px] flex-col justify-between rounded-lg border transition sm:rounded-xl ${
                      top
                        ? `border-slate-300 bg-gradient-to-b from-white to-slate-100 p-1 shadow-md sm:p-1.5 ${
                            red ? 'text-rose-600' : 'text-slate-900'
                          }`
                        : 'items-center justify-center border-2 border-dashed border-amber-300/45 bg-slate-950/55'
                    }`}
                  >
                    {top ? (
                      <>
                        <div className="flex items-center justify-between leading-none">
                          <span className="font-mono text-[11px] font-black sm:text-sm">
                            {formatRank(top.rank)}
                          </span>
                          <span className="text-[10px] sm:text-xs">{SUIT_SYMBOL[suit]}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          <SuitVectorIcon suit={suit} className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                        </div>
                        <div className="flex rotate-180 items-center justify-between leading-none">
                          <span className="font-mono text-[10px] font-black sm:text-xs">
                            {formatRank(top.rank)}
                          </span>
                          <span className="text-[9px] sm:text-xs">{SUIT_SYMBOL[suit]}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center opacity-60">
                        <SuitVectorIcon
                          suit={suit}
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            red ? 'text-rose-400' : 'text-teal-200'
                          }`}
                        />
                        <span className="mt-0.5 font-mono text-[8px] font-bold">A→K</span>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 8 Tableau Columns */}
          <div className="grid grid-cols-8 gap-1 sm:gap-2">
            {gameState.tableau.map((col, colIdx) => {
              const colMinHeight = Math.max(290, 90 + col.length * 25);
              return (
                <div key={`col-${colIdx}`} className="flex flex-col items-center">
                  <span className="mb-1 font-mono text-[9px] font-bold text-amber-200/80 sm:text-[10px]">
                    {colIdx + 1}列
                  </span>
                  <div
                    className="relative w-full max-w-[76px]"
                    style={{ minHeight: `${colMinHeight}px` }}
                  >
                    {col.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selected) tryMoveToTableauCol(selected, colIdx);
                        }}
                        className="flex aspect-[5/7] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-300/35 bg-slate-950/45 text-[9px] font-bold text-amber-200/60 hover:border-amber-300 sm:rounded-xl"
                      >
                        空き列
                      </button>
                    )}

                    {col.map((card, cardIdx) => {
                      const topOffset = cardIdx * 23;
                      const isSelected =
                        selected?.zone === 'tableau' &&
                        selected.index === colIdx &&
                        selected.cardIndex !== undefined &&
                        cardIdx >= selected.cardIndex;
                      const isHinted = hintCardId === card.id;
                      const red = isRedSuit(card.suit, card.rank);

                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() =>
                            handleCardSelectOrMove({
                              zone: 'tableau',
                              index: colIdx,
                              cardIndex: cardIdx,
                            })
                          }
                          style={{ top: `${topOffset}px`, zIndex: cardIdx + 1 }}
                          className={`absolute inset-x-0 flex aspect-[5/7] w-full flex-col justify-between rounded-lg border bg-gradient-to-b from-white via-slate-50 to-slate-100 p-1 text-left shadow-md transition-transform sm:rounded-xl sm:p-1.5 ${
                            isSelected
                              ? '-translate-y-1 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                              : isHinted
                                ? 'border-emerald-400 ring-2 ring-emerald-400'
                                : 'border-slate-300 hover:border-amber-300'
                          } ${red ? 'text-rose-600' : 'text-slate-900'}`}
                        >
                          <div className="flex items-center justify-between leading-none">
                            <span className="font-mono text-[10px] font-black tracking-tighter sm:text-xs">
                              {formatRank(card.rank)}
                            </span>
                            <span className="text-[9px] leading-none sm:text-xs">
                              {SUIT_SYMBOL[card.suit]}
                            </span>
                          </div>
                          <div className="flex items-center justify-center">
                            <SuitVectorIcon suit={card.suit} className="h-3 w-3 sm:h-4.5 sm:w-4.5" />
                          </div>
                          <div className="flex rotate-180 items-center justify-between leading-none">
                            <span className="font-mono text-[9px] font-black tracking-tighter sm:text-xs">
                              {formatRank(card.rank)}
                            </span>
                            <span className="text-[8px] leading-none sm:text-[10px]">
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
          <div className="mt-6 overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-slate-950/95 via-indigo-950/95 to-slate-950/95 p-5 shadow-[0_0_50px_rgba(251,191,36,0.35)] sm:p-6">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-300 shadow-xl sm:h-28 sm:w-28"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={charImage(partnerId, 'win')}
                    alt={partner.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black tracking-widest text-amber-300 uppercase">
                    ROYAL FLUSH NIGHT · FREECELL DEAL #{dealNumber} SOLVED!
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    🎉 VICTORY!! フリーセル #{dealNumber} 完全クリア！
                  </h3>
                  <p className="mt-1.5 text-xs font-bold text-amber-200 sm:text-sm">
                    {partner.name}「{partnerLine}」
                  </p>
                  <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                    クリア手数: <span className="font-mono font-bold text-white">{gameState.moves}手</span> ／ タイム:{' '}
                    <span className="font-mono font-bold text-amber-300">{formatTime(elapsedSec)}</span> ／ 累計クリア:{' '}
                    <span className="font-mono font-bold text-emerald-300">{clearedDeals}回</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startDeal(dealNumber + 1)}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg hover:bg-amber-300"
                >
                  次のディールへ (#{dealNumber + 1})
                </button>
                <button
                  type="button"
                  onClick={() => startDeal(Math.floor(Math.random() * 99999) + 1)}
                  className="rounded-xl border border-amber-300 bg-amber-400/20 px-5 py-2.5 text-sm font-black text-amber-100 hover:bg-amber-400/30"
                >
                  ランダムな番号で遊ぶ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
