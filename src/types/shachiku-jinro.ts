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

/** AI社員の口調。発言テンプレートの切り替えに使う */
export type Tone = 'boss' | 'polite' | 'casual' | 'timid' | 'cynic' | 'veteran';

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isHost: boolean;
  isAI: boolean;
  /** 立ち絵/口調を決めるペルソナ番号 (AI_PERSONAS の index。人間は -1) */
  personaIndex: number;
  /** 退場した日と理由 (振り返り用) */
  deathDay?: number;
  deathCause?: 'EXECUTED' | 'ATTACKED';
}

export interface DivinationResult {
  targetId: string;
  targetName: string;
  isSpy: boolean;
  /** 0 = 初日の事前調査 */
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
  /** 襲撃が防がれた/効かなかった (誰が狙われたかは公開しない) */
  peaceful: boolean;
}

export interface GameLog {
  id: string;
  type: 'SYSTEM' | 'CHAT' | 'RESULT' | 'PRIVATE';
  message: string;
  timestamp: number;
  playerId?: string;
  /** 発言の種類 (チャットの見た目を変える) */
  tag?: 'CLAIM' | 'ACCUSE' | 'DEFEND' | 'TRUST' | 'REPORT' | 'CHATTER';
  /** 発言が言及している相手 */
  targetId?: string;
  day?: number;
}

/** 公開された役職の名乗り (CO)。嘘の可能性がある */
export interface Claim {
  playerId: string;
  role: Role;
  day: number;
}

/** 名乗った役職の結果報告 (占い/霊媒)。嘘の可能性がある */
export interface ClaimedResult {
  claimerId: string;
  targetId: string;
  isSpy: boolean;
  day: number;
  kind: 'DIVINE' | 'MEDIUM';
}

/** 議論中の「疑い/信用」表明。AIの推理材料になる */
export interface Stance {
  fromId: string;
  toId: string;
  kind: 'ACCUSE' | 'TRUST';
  day: number;
}

export interface VoteRecord {
  day: number;
  votes: Record<string, string>;
  /** 決選投票が行われた場合の票 */
  runoffVotes: Record<string, string> | null;
  executedId: string | null;
}

export interface NightRecord {
  day: number;
  attackedId: string | null;
  /** 振り返り用 (ゲーム終了時のみ表示) */
  spyTargetId: string | null;
  guardTargetId: string | null;
  divineTargetId: string | null;
}

/** 議論で発言待ちのAIセリフ */
export interface PendingLine {
  playerId: string;
  message: string;
  tag: NonNullable<GameLog['tag']>;
  targetId?: string;
  /** 発言時に公開情報へ反映する副作用 */
  claim?: Role;
  result?: Omit<ClaimedResult, 'claimerId' | 'day'>;
  stance?: Stance['kind'];
}

export interface GameState {
  phase: Phase;
  /** フェーズ遷移ごとに加算。タイマーの多重発火/古い予約の誤爆を防ぐ */
  phaseSeq: number;
  players: Record<string, Player>;
  /** 表示順 (人間が先頭) */
  order: string[];
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
  lastNight: NightResult | null;
  lastVote: VoteRecord | null;
  divinationResults: DivinationResult[];
  gossipResults: GossipResult[];

  // 推理用の公開情報
  claims: Claim[];
  claimedResults: ClaimedResult[];
  stances: Stance[];
  voteHistory: VoteRecord[];
  nightHistory: NightRecord[];

  /** AIごとの直感 (observerId -> targetId -> -1..1) */
  gut: Record<string, Record<string, number>>;
  /** AIスパイ/イエスマンの偽CO計画 */
  bluffs: Record<string, { role: Role; day: number }>;

  /** 今日まだ発言されていないAIのセリフ */
  pendingLines: PendingLine[];
  /** 人間がこの日に使える発言回数の残り */
  speechesLeft: number;
}

// ===== 表示用ヘルパー =====

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

/** 人狼での通称 (ルール説明用) */
export const getRoleAlias = (role: Role): string => {
  switch (role) {
    case 'SPY': return '人狼';
    case 'DRONE': return '村人';
    case 'HR': return '占い師';
    case 'GA': return '騎士';
    case 'GOSSIP': return '霊媒師';
    case 'YESMAN': return '狂人';
    case 'ENGINEER': return '共有者';
    case 'CONSULTANT': return '妖狐';
    default: return '';
  }
};

export const getRoleDescription = (role: Role): string => {
  switch (role) {
    case 'SPY': return '会社の転覆を狙う産業スパイ。仲間のスパイが誰か知っています。夜に社員を一人「解雇(襲撃)」できます。';
    case 'DRONE': return '善良な一般社員。特殊能力はありませんが、議論と投票でスパイを追い出すのが仕事です。';
    case 'HR': return '社員の経歴を調べる人事部。初日に一人の白確定情報を持ち、毎晩一人がスパイかどうかを調査できます。';
    case 'GA': return '社員を守る総務部。毎晩一人を選び、スパイの襲撃から守ります。自分自身は守れません。';
    case 'GOSSIP': return '社内の噂に精通したお局様。会議で解雇された人がスパイだったかどうかがわかります。';
    case 'YESMAN': return 'スパイに憧れるイエスマン。スパイ側が勝つと勝利。スパイが誰かは知りません。人事の調査では「白」と出ます。';
    case 'ENGINEER': return 'エンジニアは二人一組。お互いが味方であることを知っています。';
    case 'CONSULTANT': return '会社にもスパイにも属さない第三勢力。夜の襲撃では解雇されません。ゲーム終了時に生き残っていれば勝ちを横取りします。';
    default: return '';
  }
};

/** 役職ごとの勝利条件 (一行) */
export const getRoleGoal = (role: Role): string => {
  switch (role) {
    case 'SPY': return 'スパイの数が社員と同数以上になれば勝ち';
    case 'YESMAN': return 'スパイ陣営の勝利があなたの勝利';
    case 'CONSULTANT': return '決着の瞬間に生き残っていれば勝ち';
    default: return 'スパイを全員解雇すれば勝ち';
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

export const getTeamName = (team: 'company' | 'spy' | 'third'): string =>
  team === 'company' ? '会社陣営' : team === 'spy' ? 'スパイ陣営' : '第三勢力';

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

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;

/** AI社員のペルソナ。立ち絵と口調を決める */
export interface Persona {
  name: string;
  title: string;
  tone: Tone;
  /** 立ち絵パラメータ */
  look: {
    skin: string;
    hair: string;
    hairStyle: 'side' | 'bald' | 'bob' | 'long' | 'spiky' | 'bun' | 'buzz' | 'wave';
    suit: string;
    accent: string;
    glasses: boolean;
    age: 'young' | 'mid' | 'old';
  };
}

export const AI_PERSONAS: Persona[] = [
  { name: '田中', title: '課長', tone: 'boss', look: { skin: '#e8c4a0', hair: '#2b2622', hairStyle: 'side', suit: '#3a3f4a', accent: '#8c2f2f', glasses: true, age: 'mid' } },
  { name: '佐藤', title: '部長', tone: 'boss', look: { skin: '#e2b994', hair: '#9b968e', hairStyle: 'bald', suit: '#2c2f36', accent: '#6b5a2a', glasses: false, age: 'old' } },
  { name: '鈴木', title: '主任', tone: 'polite', look: { skin: '#f0cfae', hair: '#3a2c24', hairStyle: 'bob', suit: '#4a4e58', accent: '#3f6b7a', glasses: true, age: 'mid' } },
  { name: '高橋', title: '係長', tone: 'cynic', look: { skin: '#d9ad86', hair: '#1f1c1a', hairStyle: 'buzz', suit: '#383a3f', accent: '#5a6b3a', glasses: false, age: 'mid' } },
  { name: '伊藤', title: '先輩', tone: 'casual', look: { skin: '#efc9a4', hair: '#5a3a26', hairStyle: 'spiky', suit: '#454a52', accent: '#a0612a', glasses: false, age: 'young' } },
  { name: '渡辺', title: '新人', tone: 'timid', look: { skin: '#f4d6b8', hair: '#2a2420', hairStyle: 'wave', suit: '#2f3540', accent: '#4a5f8c', glasses: false, age: 'young' } },
  { name: '山本', title: '派遣', tone: 'cynic', look: { skin: '#e6bf98', hair: '#6b4a34', hairStyle: 'long', suit: '#4c4842', accent: '#7a3f5a', glasses: false, age: 'young' } },
  { name: '中村', title: '契約', tone: 'polite', look: { skin: '#dcb08a', hair: '#26221f', hairStyle: 'side', suit: '#3f434a', accent: '#2f6b5a', glasses: true, age: 'young' } },
  { name: '小林', title: 'パート', tone: 'veteran', look: { skin: '#eac6a2', hair: '#4a3a30', hairStyle: 'bun', suit: '#5a4e48', accent: '#8c5a2f', glasses: true, age: 'old' } },
  { name: '加藤', title: 'インターン', tone: 'timid', look: { skin: '#f2d2b0', hair: '#3a2a20', hairStyle: 'spiky', suit: '#3a4250', accent: '#2f5a8c', glasses: true, age: 'young' } },
  { name: '吉田', title: '専務', tone: 'boss', look: { skin: '#dfb38e', hair: '#d6d2cc', hairStyle: 'side', suit: '#24262b', accent: '#7a2a2a', glasses: true, age: 'old' } },
  { name: '山田', title: '常務', tone: 'veteran', look: { skin: '#e4bc96', hair: '#5c5650', hairStyle: 'buzz', suit: '#2e3036', accent: '#5a4a7a', glasses: false, age: 'old' } },
];

export const personaDisplayName = (p: Persona): string => `${p.name} ${p.title}`;
