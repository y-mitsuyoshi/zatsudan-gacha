export type Template = 'simple' | 'pop' | 'cool' | 'elegant' | 'kawaii' | 'vintage' | 'neon' | 'dreamy' | 'retro' | 'minimal';

// --- Isekai Status Types ---

export type Gender = 'male' | 'female' | 'other' | 'none';

export type QuestionAnswer = 'A' | 'B' | 'C';

export type QuestionAnswerWithEmpty = QuestionAnswer | '';

export interface IsekaiFormState {
  name: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  q1: QuestionAnswerWithEmpty;
  q2: QuestionAnswerWithEmpty;
  q3: QuestionAnswerWithEmpty;
  q4: QuestionAnswerWithEmpty;
  q5: QuestionAnswerWithEmpty;
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
