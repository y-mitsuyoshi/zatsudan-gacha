export type Role =
  | 'SPY' // 産業スパイ (人狼)
  | 'DRONE' // 社畜 (市民)
  | 'HR' // 人事部 (占い師)
  | 'GA' // 総務部 (騎士)
  | 'GOSSIP' // お局様 (霊媒師)
  | 'YESMAN' // イエスマン (狂人)
  | 'ENGINEER' // エンジニア (共有者)
  | 'CONSULTANT'; // コンサル (妖狐)

export type Phase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'DAY_CONVERSATION'
  | 'DAY_VOTE'
  | 'VOTE_RESULT'
  | 'NIGHT_ACTION'
  | 'NIGHT_RESULT'
  | 'GAME_OVER';

export type ActionType = 'VOTE' | 'DIVINE' | 'GUARD' | 'ATTACK';

export type WinnerType = 'COMPANY' | 'SPIES' | 'CONSULTANT' | null;

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isHost: boolean;
  isAI: boolean;
  // For client-side masking
  roleRevealed?: boolean;
}

export interface DivinationResult {
  targetId: string;
  targetName: string;
  isSpy: boolean; // true if SPY or (CONSULTANT shows as non-spy to HR)
  dayNumber: number;
}

export interface GossipResult {
  targetId: string;
  targetName: string;
  wasSpy: boolean;
  dayNumber: number;
}

export interface NightResult {
  attackedId: string | null;
  attackedName: string | null;
  wasProtected: boolean;
  wasConsultant: boolean;
}

export interface GameLog {
  id: string;
  type: 'SYSTEM' | 'CHAT' | 'RESULT' | 'PRIVATE';
  message: string;
  timestamp: number;
  playerId?: string;
}

export interface GameState {
  phase: Phase;
  players: Record<string, Player>;
  dayCount: number;
  timeRemaining: number; // seconds
  logs: GameLog[];

  // Action tracking
  votes: Record<string, string>;
  actions: Record<string, string>;

  // Results
  winner: WinnerType;
  lastExecutedId: string | null;
  lastAttackedId: string | null;
  divinationResults: DivinationResult[];
  gossipResults: GossipResult[];

  // AI conversation lines
  currentConversations: { playerId: string; message: string }[];
}

// Legacy Room type (preserved for potential future multiplayer)
export interface Room {
  id: string;
  hostId: string;
  players: Record<string, Player>;
  phase: Phase;
  dayCount: number;
  timeLimit: number; // seconds
  logs: GameLog[];

  // Action tracking for the current phase
  votes: Record<string, string>; // voterId -> targetId
  actions: Record<string, string>; // actorId -> targetId (for night actions)

  // Game results
  winner?: 'COMPANY' | 'SPIES' | 'CONSULTANT'; // COMPANY=Villagers, SPIES=Wolves

  createdAt: number;
  updatedAt: number;
}

// Helper to get Japanese name for role
export const getRoleName = (role: Role): string => {
  switch (role) {
    case 'SPY': return '産業スパイ';
    case 'DRONE': return '社畜';
    case 'HR': return '人事部';
    case 'GA': return '総務部';
    case 'GOSSIP': return 'お局様';
    case 'YESMAN': return 'イエスマン';
    case 'ENGINEER': return 'エンジニア';
    case 'CONSULTANT': return 'コンサル';
    default: return '不明';
  }
};

export const getRoleDescription = (role: Role): string => {
  switch (role) {
    case 'SPY': return '会社を破滅させようとするスパイ。夜に社員を一人解雇(襲撃)できます。';
    case 'DRONE': return '善良な一般社員。特殊な能力はありませんが、会議(投票)でスパイを追い出せます。';
    case 'HR': return '社員の経歴を調査できる人事。夜に一人を選んでスパイかそうでないかを知ることができます。';
    case 'GA': return '社員を守る総務。夜に一人を選んでスパイの襲撃から守ることができます。自分は守れません。';
    case 'GOSSIP': return '噂好きなお局様。昼に解雇(追放)された人がスパイだったかどうかがわかります。';
    case 'YESMAN': return 'スパイに憧れるイエスマン。スパイ側が勝つと勝利ですが、誰がスパイかはわかりません。人事に占われるとスパイではないと出ます。';
    case 'ENGINEER': return 'エンジニア同士は誰が味方か知っています。';
    case 'CONSULTANT': return '会社にもスパイにも属さない第三勢力。スパイに襲撃されても死にませんが、人事に調査されると「スパイではない」と出ます(呪殺はしない簡易版)。';
    default: return '';
  }
};

export const getRoleEmoji = (role: Role): string => {
  switch (role) {
    case 'SPY': return '🕵️';
    case 'DRONE': return '👔';
    case 'HR': return '🔍';
    case 'GA': return '🛡️';
    case 'GOSSIP': return '👄';
    case 'YESMAN': return '🤡';
    case 'ENGINEER': return '💻';
    case 'CONSULTANT': return '🦊';
    default: return '❓';
  }
};

export const getRoleTeam = (role: Role): 'company' | 'spy' | 'third' => {
  switch (role) {
    case 'SPY': return 'spy';
    case 'YESMAN': return 'spy';
    case 'CONSULTANT': return 'third';
    default: return 'company';
  }
};

/** 単一の配役定義。Lobbyプレビューとゲーム本体で共有し、乖離を防ぐ。 */
export function getRoleComposition(count: number): Role[] {
  if (count === 4) return ['SPY', 'HR', 'GA', 'DRONE'];
  if (count === 5) return ['SPY', 'HR', 'GA', 'DRONE', 'YESMAN'];
  if (count === 6) return ['SPY', 'HR', 'GA', 'GOSSIP', 'YESMAN', 'DRONE'];
  if (count === 7) return ['SPY', 'SPY', 'HR', 'GA', 'GOSSIP', 'YESMAN', 'DRONE'];
  // 8人: ENGINEERは必ずペアで入れる(単独では意味をなさないためGOSSIPと入れ替え)
  if (count >= 8) {
    const base: Role[] = ['SPY', 'SPY', 'HR', 'GA', 'ENGINEER', 'ENGINEER', 'CONSULTANT', 'YESMAN'];
    while (base.length < count) base.push('DRONE');
    return base.slice(0, count);
  }
  return ['SPY', 'HR', 'GA', 'DRONE'];
}

// AI name pool
export const AI_NAMES = [
  '田中 課長', '佐藤 部長', '鈴木 主任', '高橋 係長',
  '伊藤 先輩', '渡辺 新人', '山本 派遣', '中村 契約',
  '小林 パート', '加藤 インターン', '吉田 専務', '山田 常務',
];

// AI conversation templates per phase
export const AI_CONVERSATIONS = {
  suspicious: [
    'なんか怪しい人がいる気がするんですよね...',
    'この中にスパイがいるはず。直感的に怪しいのは...',
    '昨日の報告書、おかしくなかったですか？',
    '最近、情報漏洩が多すぎませんか？',
    'あの人、定時退社してるの怪しくない？',
    'コピー機の前で怪しい動きしてた人いませんでした？',
  ],
  defense: [
    '自分は真面目に働いてますよ！信じてください！',
    '私がスパイだったら、こんなに残業しませんよ',
    '疑うなら証拠を出してください',
    'え、私？冗談でしょ？毎日サビ残してるのに？',
    '自分を信じてくれる人に投票します',
  ],
  accusation: [
    'はっきり言います。あの人が怪しい。',
    '発言が少ない人ほど怪しいと思います',
    '反論しない人、スパイなんじゃないですか？',
    'あの人の目が泳いでたの見ました',
  ],
  general: [
    '今日の会議、長くなりそうですね...',
    '早く帰りたい...',
    'とりあえずコーヒー飲みたい',
    'この会社、大丈夫かな...',
    '給料日まであと何日だろう...',
    '転職サイト見てたの内緒ね',
    '誰か自販機行く人いない？',
  ],
};
