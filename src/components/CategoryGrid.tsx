import Link from 'next/link';
import { themeData } from '@/lib/themeData';
import { themeCategories } from '@/lib/themeCategories';

type CategoryGridProps = {
  exampleCount?: number;
  showDescription?: boolean;
};

export const CategoryGrid = ({
  exampleCount = 2,
  showDescription = true,
}: CategoryGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {themeCategories.map((category) => {
        const themes = themeData[category.name] ?? [];
        const examples = themes.slice(0, exampleCount);

        return (
          <Link
            key={category.slug}
            href={`/themes/${category.slug}`}
            className="group flex flex-col p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-3xl" aria-hidden="true">{category.emoji}</span>
              <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-2.5 py-1">
                {themes.length}問
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {category.name}の雑談お題
            </h3>
            {showDescription && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                {category.description}
              </p>
            )}
            {examples.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {examples.map((theme) => (
                  <li key={theme} className="text-xs text-gray-500 dark:text-gray-400 flex gap-1.5">
                    <span className="text-indigo-400" aria-hidden="true">Q.</span>
                    <span className="line-clamp-2">{theme}</span>
                  </li>
                ))}
              </ul>
            )}
            <span className="mt-4 text-sm font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
              お題一覧を見る
              <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
};
