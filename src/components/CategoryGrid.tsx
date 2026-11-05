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
            className="group flex flex-col p-5 bg-[var(--paper-strong)] border border-[var(--line)] hover:border-[var(--accent)] transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="font-label text-[9px] text-[var(--accent)]">Category</span>
              <span className="shrink-0 font-label text-[9px] text-[var(--ink-soft)] bg-[var(--paper-muted)] px-2.5 py-1">
                {themes.length}問
              </span>
            </div>
            <h3 className="font-editorial text-lg text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
              {category.name}の雑談お題
            </h3>
            {showDescription && (
              <p className="text-sm text-[var(--ink-soft)] mt-2 leading-relaxed">
                {category.description}
              </p>
            )}
            {examples.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {examples.map((theme) => (
                  <li key={theme} className="text-xs text-[var(--ink-soft)] flex gap-1.5">
                    <span className="text-[var(--accent)]" aria-hidden="true">Q.</span>
                    <span className="line-clamp-2">{theme}</span>
                  </li>
                ))}
              </ul>
            )}
            <span className="mt-4 text-[10px] font-bold text-[var(--accent)] inline-flex items-center gap-1">
              お題一覧を見る
              <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
};
