import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

type FavoritesListProps = {
  favorites: string[];
  onToggleFavorite: (theme: string) => void;
  onSelectTheme: (theme: string) => void;
};

export const FavoritesList = ({ favorites, onToggleFavorite, onSelectTheme }: FavoritesListProps) => {
  if (favorites.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
        お気に入りはまだありません。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {favorites.map((theme) => (
        <div key={theme} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <span
            className="cursor-pointer hover:underline flex-grow"
            onClick={() => onSelectTheme(theme)}
          >
            {theme}
          </span>
          <button onClick={() => onToggleFavorite(theme)} className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <StarIconSolid className="h-5 w-5 text-yellow-400" />
          </button>
        </div>
      ))}
    </div>
  );
};
