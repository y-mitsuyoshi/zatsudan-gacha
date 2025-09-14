"use client";

import { ProfileState, Template } from "@/types";

interface ProfileCardPreviewProps {
  profile: ProfileState;
  template: Template;
}

// Helper component for card sections
const CardSection = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string; }) => (
  <div className={className}>
    <h3 className="text-sm font-bold uppercase tracking-wider mb-2">{title}</h3>
    <div>
      {children}
    </div>
  </div>
);

export const ProfileCardPreview: React.FC<ProfileCardPreviewProps> = ({ profile, template }) => {
  const {
    name, group, color, likes, episode, favoriteQuote, customTags, title, fanHistory
  } = profile;

  // --- Template Styles ---
  const templates = {
    simple: {
      card: 'p-4 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg font-sans text-gray-800 dark:text-gray-200',
      header: 'border-b-2',
      name: 'text-5xl font-bold text-gray-900 dark:text-white',
      group: 'text-base text-gray-500 dark:text-gray-400',
      titleContainer: 'p-3 text-center rounded-lg',
      titleText: 'font-bold text-xl',
      sectionTitle: 'text-gray-500 dark:text-gray-400',
      tag: 'px-3 py-1 text-sm font-medium rounded-full',
      quote: 'text-lg italic',
      footer: 'border-t border-gray-200 dark:border-gray-700',
      hashtag: 'font-bold',
    },
    pop: {
      card: 'p-4 sm:p-8 bg-yellow-50 dark:bg-yellow-900/30 rounded-3xl shadow-xl font-bold font-sans border-4 border-black text-black dark:text-white',
      header: 'border-b-4 border-black dark:border-white',
      name: 'text-6xl font-black tracking-tighter text-black dark:text-white',
      group: 'text-lg font-bold text-gray-700 dark:text-gray-300',
      titleContainer: 'p-3 text-center rounded-2xl border-2 border-black dark:border-white rotate-6',
      titleText: 'font-black text-2xl',
      sectionTitle: 'text-black dark:text-white',
      tag: 'px-4 py-1.5 text-base font-bold rounded-full border-2 border-black dark:border-white shadow-[4px_4px_0_0_#000]',
      quote: 'text-xl font-bold italic bg-white/50 dark:bg-black/20 p-3 rounded-lg',
      footer: 'border-t-4 border-black dark:border-white',
      hashtag: 'font-black text-lg p-2 rounded-lg',
    },
    cool: {
      card: 'p-4 sm:p-8 bg-gray-900 rounded-lg shadow-2xl font-mono text-gray-100 border border-gray-700',
      header: 'border-b border-gray-700',
      name: 'text-5xl font-bold text-white tracking-widest',
      group: 'text-base text-cyan-400',
      titleContainer: 'p-2 text-center border border-cyan-400',
      titleText: 'font-bold text-xl text-cyan-400',
      sectionTitle: 'text-cyan-400',
      tag: 'px-3 py-1 text-sm font-medium rounded-sm bg-cyan-400/10 text-cyan-300 border border-cyan-400/30',
      quote: 'text-lg italic text-gray-300',
      footer: 'border-t border-gray-700',
      hashtag: 'font-bold text-cyan-400',
    }
  };

  const s = templates[template];

  // --- Dynamic Styles ---
  const accentStyle = template === 'cool' ? { borderColor: color, color: color } : { borderColor: color };
  const accentTextStyle = { color: color };
  const accentBgStyle = template === 'pop' ? { backgroundColor: color, color: 'white' } : { backgroundColor: `${color}20` };
  const accentTagStyle = template === 'pop'
    ? { backgroundColor: color, color: 'white', boxShadow: `2px 2px 0 0 #000` }
    : { backgroundColor: `${color}30`, color: color };

  return (
    <div id="profile-card" className={`${s.card} aspect-[1.91/1] flex flex-col transition-all duration-300`}>
      {/* Header */}
      <header className={`flex items-start pb-2 sm:pb-4 ${s.header}`} style={accentStyle}>
        <div className="flex-grow">
          <p className={`${s.group} text-sm sm:text-base`}>{group || ' '}</p>
          <h2 className={`${s.name} text-3xl sm:text-4xl md:text-5xl`}>{name || '推しの名前'}</h2>
        </div>
        {title && (
          <div className={`${s.titleContainer} ml-2`}>
            <p className={`${s.titleText} text-base sm:text-xl`} style={template === 'pop' ? {textShadow: '2px 2px 0 #000'} : {}}>{title}</p>
            {template !== 'pop' && <p className="text-xs uppercase tracking-wider" style={accentTextStyle}>- Title -</p>}
          </div>
        )}
      </header>

      {/* Body */}
      <main className="flex-grow mt-3 sm:mt-6 grid grid-cols-1 md:grid-cols-5 gap-x-4 md:gap-x-8">
        <div className="md:col-span-3 space-y-2 sm:space-y-4">
          <CardSection title="好きなところ" className={s.sectionTitle}>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {likes.length > 0 ? likes.map(like => (
                <span key={like} className={`${s.tag} text-xs sm:text-sm`} style={accentTagStyle}>
                  {like}
                </span>
              )) : <p className="text-gray-400 text-sm">（未入力）</p>}
            </div>
          </CardSection>

          <CardSection title="心に残る言葉・歌詞" className={`${s.sectionTitle} mt-2 sm:mt-4`}>
            <p className={`${s.quote} text-sm sm:text-lg`}>
              {favoriteQuote ? `“${favoriteQuote}”` : <span className="text-gray-400 text-sm">（未入力）</span>}
            </p>
          </CardSection>
        </div>
        <div className="md:col-span-2 space-y-2 sm:space-y-4 md:border-l border-gray-200 dark:border-gray-700 md:pl-4 lg:pl-8 mt-2 md:mt-0">
           <CardSection title="出会いのきっかけ" className={s.sectionTitle}>
            <p className="text-sm sm:text-base">{episode || <span className="text-gray-400 text-sm">（未入力）</span>}</p>
          </CardSection>
          <CardSection title="ファン歴" className={s.sectionTitle}>
            <p className="text-sm sm:text-base">{fanHistory || <span className="text-gray-400 text-sm">（未入力）</span>}</p>
          </CardSection>
        </div>
      </main>

      {/* Footer */}
      <footer className={`mt-auto pt-2 sm:pt-4 ${s.footer}`}>
        <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {customTags.length > 0 ? customTags.map(tag => (
                  <span key={tag} className="text-sm text-gray-500 dark:text-gray-400">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                )) : <div/>}
            </div>
            <p className={s.hashtag} style={accentTextStyle}>
              #推し活プロフィールメーカー
            </p>
        </div>
      </footer>
    </div>
  );
};
