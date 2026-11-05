import { useId, useState } from 'react';

type Tab = {
  label: string;
  content: React.ReactNode;
};

type TabsProps = {
  tabs: Tab[];
};

export const Tabs = ({ tabs }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabId = useId();

  return (
    <div>
      <div className="border-b border-[var(--line)]">
        <nav className="-mb-px flex space-x-4" role="tablist" aria-label="履歴とお気に入り">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              id={`${tabId}-tab-${index}`}
              aria-selected={activeTab === index}
              aria-controls={`${tabId}-panel-${index}`}
              onClick={() => setActiveTab(index)}
              className={`${
                activeTab === index
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-t`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div
        className="py-4"
        role="tabpanel"
        id={`${tabId}-panel-${activeTab}`}
        aria-labelledby={`${tabId}-tab-${activeTab}`}
      >
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};
