import { StarIcon as StarIconOutline, ClockIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getCategoryForTheme } from '@/lib/themeCategories';

type HistoryListProps = {
  history: string[];
  favorites: string[];
  onToggleFavorite: (theme: string) => void;
  onSelectTheme: (theme: string) => void;
  onClear?: () => void;
};

export const HistoryList = ({ history, favorites, onToggleFavorite, onSelectTheme, onClear }: HistoryListProps) => {
  if (history.length === 0) {
    return (
      <div className="text-center text-[var(--ink-soft)] py-6 flex items-center justify-center">
        <ClockIcon className="h-5 w-5 mr-2" />
        <span>まだ履歴はありません。ガチャを回すとここに残ります。</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-[var(--ink-soft)]">最新10件まで保存されます</p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-[var(--ink-soft)] hover:text-[var(--accent)] underline underline-offset-2"
          >
            履歴を消去
          </button>
        )}
      </div>
      {history.map((theme) => {
        const category = getCategoryForTheme(theme);
        return (
          <div key={theme} className="flex items-center justify-between gap-2 p-3 bg-[var(--paper-muted)] rounded-sm">
            <button
              type="button"
              className="flex-grow min-w-0 text-left group"
              onClick={() => onSelectTheme(theme)}
            >
              <span className="block text-xs text-[var(--ink-soft)] mb-1">
                {category ? `${category.emoji} ${category.name}` : 'お題'}
              </span>
              <span className="block text-sm font-medium text-[var(--ink)] group-hover:underline">
                {theme}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(theme)}
              className="p-2 rounded-full hover:bg-[var(--paper-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              aria-label={favorites.includes(theme) ? 'お気に入りから削除' : 'お気に入りに追加'}
            >
              {favorites.includes(theme) ? (
                <StarIconSolid className="h-5 w-5 text-yellow-400" />
              ) : (
                <StarIconOutline className="h-5 w-5 text-[var(--ink-soft)]" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
