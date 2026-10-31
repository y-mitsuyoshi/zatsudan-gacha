import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getCategoryForTheme } from '@/lib/themeCategories';

type FavoritesListProps = {
  favorites: string[];
  onToggleFavorite: (theme: string) => void;
  onSelectTheme: (theme: string) => void;
  onClear?: () => void;
};

export const FavoritesList = ({ favorites, onToggleFavorite, onSelectTheme, onClear }: FavoritesListProps) => {
  if (favorites.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-6">
        お気に入りはまだありません。☆を押すと保存できます。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{favorites.length}件のお気に入り</p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline underline-offset-2"
          >
            お気に入りを消去
          </button>
        )}
      </div>
      {favorites.map((theme) => {
        const category = getCategoryForTheme(theme);
        return (
          <div key={theme} className="flex items-center justify-between gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              type="button"
              className="flex-grow min-w-0 text-left group"
              onClick={() => onSelectTheme(theme)}
            >
              <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {category ? `${category.emoji} ${category.name}` : 'お題'}
              </span>
              <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:underline">
                {theme}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(theme)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              aria-label="お気に入りから削除"
            >
              <StarIconSolid className="h-5 w-5 text-yellow-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
