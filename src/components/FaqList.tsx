export interface FaqListItem {
  question: string;
  answer: string;
}

export function FaqList({ items, className = '' }: { items: FaqListItem[]; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <details key={item.question} className="group rounded-sm border border-[var(--line)] bg-[var(--paper-strong)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-bold sm:p-5 sm:text-base">
            <span>{item.question}</span>
            <span className="shrink-0 text-xl text-[var(--accent)] transition-transform group-open:rotate-45" aria-hidden="true">
              ＋
            </span>
          </summary>
          <p className="border-t border-[var(--line)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)] sm:px-5 sm:py-4">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
