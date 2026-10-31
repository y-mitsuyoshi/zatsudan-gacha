import type { ProfileState, Template } from '@/types';

export const PROFILE_DRAFT_KEY = 'oshi-profile-draft-v1';

export const DEFAULT_PROFILE: ProfileState = {
  name: 'すごい推し',
  group: '次元を超えた存在',
  color: '#a855f7',
  image: '',
  likes: ['顔', '声', '全部'],
  episode: '伝説のライブでのパフォーマンスに感動した',
  favoriteVisual: 'デビュー当時の初々しいビジュアル',
  favoriteQuote: '「諦めたらそこで試合終了ですよ」',
  customTags: ['#存在が尊い', '#歩く芸術'],
  fanHistory: 'デビュー当時から',
  title: '顔面国宝',
};

export const SAMPLE_PROFILE: ProfileState = {
  name: '星野ひかり',
  group: 'スターライト',
  color: '#0ea5e9',
  image: '',
  likes: ['笑顔', '歌声', '努力家'],
  episode: '何気なく観た音楽番組で、ステージ上の笑顔に惹かれた',
  favoriteVisual: '夜空のような青い衣装',
  favoriteQuote: '「今日の一歩が、明日の景色を変える」',
  customTags: ['#笑顔の宝石箱', '#推し活初心者'],
  fanHistory: '2023年から',
  title: '笑顔の伝道師',
};

const TEMPLATES: Template[] = ['simple', 'pop', 'cool', 'elegant', 'kawaii', 'vintage', 'neon', 'dreamy', 'retro', 'minimal'];

function safeString(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

function safeTags(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim().slice(0, 30))
    .filter(Boolean)
    .slice(0, 3);
}

export function normalizeProfile(value: unknown): ProfileState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const profile = value as Partial<ProfileState>;
  const color = typeof profile.color === 'string' && /^#[0-9a-f]{6}$/i.test(profile.color)
    ? profile.color
    : DEFAULT_PROFILE.color;
  const image = typeof profile.image === 'string' && profile.image.length < 2_500_000 && (profile.image === '' || profile.image.startsWith('data:image/'))
    ? profile.image
    : '';

  return {
    name: safeString(profile.name, DEFAULT_PROFILE.name, 30),
    group: safeString(profile.group, DEFAULT_PROFILE.group, 40),
    color,
    image,
    likes: safeTags(profile.likes, DEFAULT_PROFILE.likes),
    episode: safeString(profile.episode, DEFAULT_PROFILE.episode, 160),
    favoriteVisual: safeString(profile.favoriteVisual, DEFAULT_PROFILE.favoriteVisual, 120),
    favoriteQuote: safeString(profile.favoriteQuote, DEFAULT_PROFILE.favoriteQuote, 160),
    customTags: safeTags(profile.customTags, DEFAULT_PROFILE.customTags),
    fanHistory: safeString(profile.fanHistory, DEFAULT_PROFILE.fanHistory, 40),
    title: safeString(profile.title, DEFAULT_PROFILE.title, 30),
  };
}

export function normalizeTemplate(value: unknown): Template {
  return typeof value === 'string' && TEMPLATES.includes(value as Template) ? value as Template : 'simple';
}

export function loadProfileDraft(): { profile: ProfileState; template: Template } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const draft = parsed as { profile?: unknown; template?: unknown };
    const profile = normalizeProfile(draft.profile);
    if (!profile) return null;
    return { profile, template: normalizeTemplate(draft.template) };
  } catch {
    return null;
  }
}

export function saveProfileDraft(profile: ProfileState, template: Template): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify({ profile, template }));
  } catch {
    // Ignore quota/privacy-mode errors; the editor still works in memory.
  }
}

export function clearProfileDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROFILE_DRAFT_KEY);
  } catch {
    // Ignore storage failures.
  }
}
