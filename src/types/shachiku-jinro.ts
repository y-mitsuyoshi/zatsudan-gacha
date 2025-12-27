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
  | 'DAY_CONVERSATION'
  | 'DAY_VOTE'
  | 'NIGHT_ACTION'
  | 'GAME_OVER';

export type ActionType = 'VOTE' | 'DIVINE' | 'GUARD' | 'ATTACK';

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isHost: boolean;
  // For client-side masking
  roleRevealed?: boolean;
}

export interface GameLog {
  id: string;
  type: 'SYSTEM' | 'CHAT' | 'RESULT';
  message: string;
  timestamp: number;
  playerId?: string;
}

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
    case 'YESMAN': return 'スパイに憧れるイエスマン。スパイ側が勝つと勝利ですが、誰がスパイかはわかりません。';
    case 'ENGINEER': return 'エンジニア同士は誰が味方か知っています。';
    case 'CONSULTANT': return '会社にもスパイにも属さない第三勢力。スパイに襲撃されても死にませんが、人事に調査されると死にます。';
    default: return '';
  }
};
