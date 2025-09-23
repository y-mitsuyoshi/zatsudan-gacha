// Defines the available jobs for the player
export type Job = '営業' | 'エンジニア' | 'デザイナー' | '企画・マーケティング' | '人事・総務' | '経理・財務';

// Defines the structure for an item the player can use
export interface Item {
  id: string;
  name: string;
  description: string;
  // Effect function or identifier will be added later
}

// Defines the type of a square on the board
export type SquareType = 'start' | 'goal' | 'normal' | 'event' | 'item' | 'salary' | 'job-specific';

// Defines a single square on the game board
export interface BoardSquare {
  position: number;
  type: SquareType;
  title: string;
  description: string;
  effect: {
    type: 'move' | 'rest' | 'yaruki' | 'item' | 'job-specific';
    value: number | string;
  } | null;
}

// Defines the overall state of the game
export interface GameState {
  playerName: string;
  job: Job;
  position: number;
  yaruki: number; // Motivation gauge
  items: Item[];
  turn: number;
  isFinished: boolean;
  gameMessage: string;
  unlockedAchievements: string[]; // All achievements ever unlocked
  newlyUnlockedAchievements: string[]; // Achievements unlocked in this run
  isResting: number; // Number of turns to rest
  path: number[]; // History of squares landed on
  landedOnCounts: { [key: number]: number }; // Count of times landed on each square
  ending: string | null; // The ending of the game
  pendingMoves?: number; // Number of moves left to complete step by step
}

// Defines the initial form state before the game starts
export interface SetupFormState {
    name: string;
    job: Job;
}
