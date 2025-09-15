export type Template = 'simple' | 'pop' | 'cool' | 'elegant' | 'kawaii' | 'vintage' | 'neon' | 'dreamy' | 'retro' | 'minimal';

// --- Isekai Status Types ---

export type Gender = 'male' | 'female' | 'other' | 'none';

export type QuestionAnswer = 'A' | 'B' | 'C';

export interface IsekaiFormState {
  name: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  q1: QuestionAnswer;
  q2: QuestionAnswer;
  q3: QuestionAnswer;
  q4: QuestionAnswer;
  q5: QuestionAnswer;
}

export interface IsekaiStatus {
  name: string;
  epithet: string; // 二つ名
  job: string;
  level: number;
  params: {
    strength: number;
    magic: number;
    agility: number;
    dexterity: number;
    luck: number;
  };
  uniqueSkill: string;
  partySkill: string;
  equipment: string[];
}

export type ProfileState = {
  name: string;
  group: string;
  color: string;
  image: string;
  likes: string[];
  episode: string;
  favoriteVisual: string;
  favoriteQuote: string;
  customTags: string[];
  fanHistory: string;
  title: string;
};
