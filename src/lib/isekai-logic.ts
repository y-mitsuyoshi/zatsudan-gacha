import { IsekaiFormState, IsekaiStatus, QuestionAnswer, QuestionAnswerWithEmpty } from '@/types';

// --- Data Banks for Generation ---
const EPITHETS = [
  "絶望を知る者", "終焉の探求者", "星々の放浪者", "混沌の支配者", "伝説の昼寝マスター",
  "次元の旅人", "忘れられた英雄", "禁忌の学者", "聖剣の担い手", "影の王",
  "永遠の初心者", "無名の天才", "世界の理を盗んだ者", "最後の希望", "時空の迷子",
  "運命を纏いし者", "黄昏の守護者", "深淵の探究者", "雲海の航海士", "秘密の守人",
  "古の誓約者", "幻想の編み手", "静寂の支配者", "光陰の旅人", "夢境の案内人",
  "魂の錬金術師", "真理の探求者", "暁の使者", "風雲の戦士", "星辰の読み手",
];

const JOBS = [
  "聖剣の勇者", "闇の会計士", "伝説のデバッガー", "宮廷魔術師（見習い）", "ゴブリン専門の冒険者",
  "ドラゴンスレイヤー（自称）", "錬金術師（主にポーション作り）", "神託の巫女（ただし神は無口）", "王国騎士団・炊事班", "無職（天職）",
  "ニートの王", "伝説の家事代行", "終身名誉勇者", "魔王軍の相談役", "時給自足の農家",
  "次元図書館司書", "異界の案内人", "魔法道具職人", "王室料理人", "冒険者ギルド受付",
  "精霊契約者", "古代遺跡調査員", "魔獣調教師", "商隊護衛", "占星術師",
  "異世界通訳", "魔法陣研究者", "薬草栽培家", "竜騎士候補", "迷宮探索専門家",
];

const UNIQUE_SKILLS = [
  "\"絶対定時退社(ワールド・エンド・クロック)\"", "\"無限珈琲生成(エターナル・カフェイン)\"", "\"締切前夜の奇跡(デッドライン・ミラクル)\"",
  "\"神速のコピペ(ゴッド・スピード・デュプリケート)\"", "\"究極お布団召喚(アルティメット・フトン・サモン)\"", "\"忘却の彼方(デリート・マイ・ヒストリー)\"",
  "\"上司の説教無効化(ボス・サイレンサー)\"", "\"全自動言語翻訳(オートマティック・トランスレーター)\"", "\"危機的状況での冷静沈着(クール・ヘッド)\"", "\"究極話術(アルティメット・コミュニケーション)\"",
  "\"時空間移動(ディメンション・ワープ)\"", "\"元素操作(エレメンタル・マスタリー)\"", "\"記憶宮殿(メモリー・パレス)\"", "\"運命改変(フェイト・リライト)\"",
  "\"魂の共鳴(ソウル・レゾナンス)\"", "\"無限回復(エンドレス・ヒーリング)\"", "\"真実看破(トゥルース・サイト)\"", "\"瞬間理解(インスタント・ラーニング)\"",
  "\"意識分離(コンシャス・スプリット)\"", "\"確率操作(プロバビリティ・コントロール)\"",
];

const PARTY_SKILLS = [
  "場の空気を和ませる", "美味しいご飯が作れる", "金勘定が得意", "地図が読める", "動物に好かれる",
  "交渉上手", "危険察知能力", "宴会芸が得意", "聞き上手", "誰とでも仲良くなれる",
  "魔法道具の修理ができる", "野宿の準備が得意", "語学が堪能", "罠の発見が得意", "応急手当ができる",
  "天候を予測できる", "料理のレシピを覚えている", "楽器が演奏できる", "商談が上手", "暗算が得意",
];

const EQUIPMENT = [
  "魔法の鎧", "使い古したマウス", "光るキーボード", "無限に出てくるお菓子", "伝説のスマホ",
  "よく切れる包丁", "ふかふかの枕", "最高のノイズキャンセリングイヤホン", "エコバッグ", "充電100%のモバイルバッテリー",
  "古代の魔導書", "万能ポーション", "魔法のコンパス", "風の靴", "透明なマント",
  "幸運のお守り", "炎の剣", "氷の盾", "雷の杖", "治癒の指輪",
];

// --- Helper Functions ---

// Simple hash function to create a pseudo-random seed from string input
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Pseudo-random number generator from a seed
const createSeededRandom = (seed: number) => {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
};

// Function to pick a random item from an array using a seeded RNG
const pickRandom = <T>(arr: T[], rng: () => number): T => {
  const index = Math.floor(rng() * arr.length);
  return arr[index];
};


// --- Main Generation Logic ---

export const generateIsekaiStatus = (form: IsekaiFormState): IsekaiStatus => {
  // Validate that all questions are answered
  if (!form.q1 || !form.q2 || !form.q3 || !form.q4 || !form.q5) {
    throw new Error('All questions must be answered');
  }

  // 1. Create a deterministic seed from all inputs
  const nameHash = simpleHash(form.name);
  const dateHash = simpleHash(form.birthDate.replace(/-/g, ''));
  const answersHash = simpleHash(Object.values(form).join(''));
  const seed = nameHash + dateHash + answersHash;
  const rng = createSeededRandom(seed);

  // 2. Determine Level
  const level = Math.floor(rng() * 98) + 1; // 1-99

  // 3. Determine Base Parameters based on answers
  const baseParams = { strength: 20, magic: 20, agility: 20, dexterity: 20, luck: 20 };

  // Q1: Dragon
  if (form.q1 === 'A') baseParams.strength += 30; // Fight
  if (form.q1 === 'B') baseParams.magic += 30;    // Magic
  if (form.q1 === 'C') baseParams.agility += 30;   // Run

  // Q2: Reward
  if (form.q2 === 'A') baseParams.luck += 30;      // Honor
  if (form.q2 === 'B') baseParams.dexterity += 30; // Gold
  if (form.q2 === 'C') baseParams.magic += 30;     // Map

  // Q3: Friend in pinch
  if (form.q3 === 'A') baseParams.strength += 30; // Protect
  if (form.q3 === 'B') baseParams.dexterity += 30; // Instruct
  if (form.q3 === 'C') baseParams.agility += 30;   // Retreat

  // Q4: Power
  if (form.q4 === 'A') baseParams.dexterity += 30; // All-seeing
  if (form.q4 === 'B') baseParams.magic += 30;     // Time travel
  if (form.q4 === 'C') baseParams.luck += 30;      // Talk to animals

  // Q5: End of journey
  if (form.q5 === 'A') baseParams.strength += 30; // Train more
  if (form.q5 === 'B') baseParams.luck += 30;      // Peaceful life
  if (form.q5 === 'C') baseParams.dexterity += 30; // Make money

  // 4. Scale parameters based on Level
  const totalPoints = level * 5;
  const baseTotal = Object.values(baseParams).reduce((a, b) => a + b, 0);

  const scaledParams = {
    strength: Math.round((baseParams.strength / baseTotal) * totalPoints) + 5,
    magic: Math.round((baseParams.magic / baseTotal) * totalPoints) + 5,
    agility: Math.round((baseParams.agility / baseTotal) * totalPoints) + 5,
    dexterity: Math.round((baseParams.dexterity / baseTotal) * totalPoints) + 5,
    luck: Math.round((baseParams.luck / baseTotal) * totalPoints) + 5,
  };

  // 5. Pick text-based stats
  const epithet = pickRandom(EPITHETS, rng);
  const job = pickRandom(JOBS, rng);
  const uniqueSkill = pickRandom(UNIQUE_SKILLS, rng);
  const partySkill = pickRandom(PARTY_SKILLS, rng);

  // Pick 3 unique pieces of equipment
  const equipmentSet = new Set<string>();
  while (equipmentSet.size < 3) {
    equipmentSet.add(pickRandom(EQUIPMENT, rng));
  }
  const equipment = Array.from(equipmentSet);


  return {
    name: form.name,
    epithet,
    job,
    level,
    params: scaledParams,
    uniqueSkill,
    partySkill,
    equipment,
  };
};
