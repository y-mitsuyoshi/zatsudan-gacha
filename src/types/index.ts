export type Template = 'simple' | 'pop' | 'cool' | 'elegant' | 'kawaii' | 'vintage' | 'neon' | 'dreamy' | 'retro' | 'minimal';

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
