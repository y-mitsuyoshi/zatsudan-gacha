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
    name, group, color, image, likes, episode, favoriteVisual, favoriteQuote, customTags, title, fanHistory
  } = profile;

  // --- Template Styles ---
  const templates = {
    simple: {
      card: 'p-4 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg font-sans text-gray-800 dark:text-gray-200',
      header: 'border-b-2',
      name: 'text-5xl font-bold text-gray-900 dark:text-white',
      group: 'text-base text-gray-500 dark:text-gray-400',
      titleContainer: 'p-3 text-center rounded-lg shadow-sm bg-white/50 dark:bg-gray-700/50',
      titleText: 'font-bold text-xl text-gray-900 dark:text-white',
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
      titleContainer: 'p-4 text-center rounded-2xl border-3 border-black dark:border-white rotate-3 bg-white dark:bg-gray-800 shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]',
      titleText: 'font-black text-xl text-black dark:text-white',
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
      titleContainer: 'p-3 text-center border border-cyan-400 bg-gray-800/80',
      titleText: 'font-bold text-xl text-cyan-400',
      sectionTitle: 'text-cyan-400',
      tag: 'px-3 py-1 text-sm font-medium rounded-sm bg-cyan-400/10 text-cyan-300 border border-cyan-400/30',
      quote: 'text-lg italic text-gray-300',
      footer: 'border-t border-gray-700',
      hashtag: 'font-bold text-cyan-400',
    },
    elegant: {
      card: 'p-4 sm:p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl shadow-xl font-serif text-gray-800 dark:text-gray-200',
      header: 'border-b border-purple-200 dark:border-purple-700',
      name: 'text-5xl font-light text-purple-900 dark:text-purple-100 tracking-wide',
      group: 'text-base text-purple-600 dark:text-purple-400 font-medium',
      titleContainer: 'p-3 text-center rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800 border border-purple-200 dark:border-purple-600',
      titleText: 'font-medium text-lg text-purple-900 dark:text-purple-100',
      sectionTitle: 'text-purple-600 dark:text-purple-400',
      tag: 'px-3 py-1 text-sm font-medium rounded-full bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200',
      quote: 'text-lg italic text-purple-700 dark:text-purple-300',
      footer: 'border-t border-purple-200 dark:border-purple-700',
      hashtag: 'font-medium text-purple-600 dark:text-purple-400',
    },
    kawaii: {
      card: 'p-4 sm:p-8 bg-pink-50 dark:bg-pink-900/20 rounded-3xl shadow-lg font-sans text-pink-900 dark:text-pink-100 border-2 border-pink-200 dark:border-pink-700',
      header: 'border-b-2 border-pink-200 dark:border-pink-700',
      name: 'text-5xl font-bold text-pink-600 dark:text-pink-300',
      group: 'text-base text-pink-500 dark:text-pink-400',
      titleContainer: 'p-3 text-center rounded-full bg-pink-100 dark:bg-pink-800 border-2 border-pink-300 dark:border-pink-600',
      titleText: 'font-bold text-lg text-pink-700 dark:text-pink-200',
      sectionTitle: 'text-pink-600 dark:text-pink-400',
      tag: 'px-3 py-1.5 text-sm font-medium rounded-full bg-pink-200 dark:bg-pink-700 text-pink-800 dark:text-pink-200',
      quote: 'text-lg text-pink-700 dark:text-pink-300',
      footer: 'border-t-2 border-pink-200 dark:border-pink-700',
      hashtag: 'font-bold text-pink-600 dark:text-pink-400',
    },
    vintage: {
      card: 'p-4 sm:p-8 bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-lg font-serif text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700',
      header: 'border-b-2 border-amber-300 dark:border-amber-600',
      name: 'text-5xl font-bold text-amber-800 dark:text-amber-200',
      group: 'text-base text-amber-600 dark:text-amber-400',
      titleContainer: 'p-3 text-center bg-amber-100 dark:bg-amber-800 border border-amber-300 dark:border-amber-600',
      titleText: 'font-bold text-lg text-amber-800 dark:text-amber-200',
      sectionTitle: 'text-amber-700 dark:text-amber-300',
      tag: 'px-3 py-1 text-sm font-medium bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-600',
      quote: 'text-lg italic text-amber-700 dark:text-amber-300',
      footer: 'border-t-2 border-amber-300 dark:border-amber-600',
      hashtag: 'font-bold text-amber-700 dark:text-amber-300',
    },
    neon: {
      card: 'p-4 sm:p-8 bg-black rounded-xl shadow-2xl font-mono text-green-400 border border-green-500',
      header: 'border-b border-green-500',
      name: 'text-5xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]',
      group: 'text-base text-green-300',
      titleContainer: 'p-3 text-center border border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
      titleText: 'font-bold text-lg text-green-400',
      sectionTitle: 'text-green-300',
      tag: 'px-3 py-1 text-sm font-medium bg-green-500/20 text-green-300 border border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]',
      quote: 'text-lg text-green-300',
      footer: 'border-t border-green-500',
      hashtag: 'font-bold text-green-400',
    },
    dreamy: {
      card: 'p-4 sm:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl shadow-xl font-sans text-gray-700 dark:text-gray-200',
      header: 'border-b border-purple-200 dark:border-purple-700',
      name: 'text-5xl font-light text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text',
      group: 'text-base text-purple-500 dark:text-purple-400',
      titleContainer: 'p-3 text-center rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-purple-200 dark:border-purple-600',
      titleText: 'font-medium text-lg text-purple-700 dark:text-purple-300',
      sectionTitle: 'text-purple-600 dark:text-purple-400',
      tag: 'px-3 py-1 text-sm font-medium rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-800 dark:to-purple-800 text-purple-700 dark:text-purple-300',
      quote: 'text-lg text-purple-600 dark:text-purple-400',
      footer: 'border-t border-purple-200 dark:border-purple-700',
      hashtag: 'font-medium text-purple-600 dark:text-purple-400',
    },
    retro: {
      card: 'p-4 sm:p-8 bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow-lg font-mono text-orange-900 dark:text-orange-100 border-2 border-orange-300 dark:border-orange-700',
      header: 'border-b-4 border-orange-400 dark:border-orange-600',
      name: 'text-5xl font-bold text-orange-700 dark:text-orange-300 tracking-wide',
      group: 'text-base text-orange-600 dark:text-orange-400 uppercase',
      titleContainer: 'p-3 text-center bg-orange-200 dark:bg-orange-800 border-2 border-orange-400 dark:border-orange-600 transform -rotate-2',
      titleText: 'font-bold text-lg text-orange-800 dark:text-orange-200',
      sectionTitle: 'text-orange-700 dark:text-orange-300 uppercase tracking-wide',
      tag: 'px-3 py-1 text-sm font-bold bg-orange-200 dark:bg-orange-700 text-orange-800 dark:text-orange-200 border border-orange-400 dark:border-orange-500',
      quote: 'text-lg text-orange-700 dark:text-orange-300 font-bold',
      footer: 'border-t-4 border-orange-400 dark:border-orange-600',
      hashtag: 'font-bold text-orange-700 dark:text-orange-300 uppercase',
    },
    minimal: {
      card: 'p-4 sm:p-8 bg-white dark:bg-gray-900 rounded-none shadow-sm font-sans text-gray-900 dark:text-gray-100 border-l-4',
      header: 'border-b border-gray-200 dark:border-gray-700',
      name: 'text-5xl font-thin text-gray-900 dark:text-gray-100 tracking-wider',
      group: 'text-base text-gray-500 dark:text-gray-400 font-light',
      titleContainer: 'p-2 text-center bg-gray-100 dark:bg-gray-800',
      titleText: 'font-normal text-lg text-gray-700 dark:text-gray-300',
      sectionTitle: 'text-gray-500 dark:text-gray-400 font-light uppercase tracking-widest text-xs',
      tag: 'px-2 py-1 text-xs font-normal bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
      quote: 'text-lg text-gray-700 dark:text-gray-300 font-light italic',
      footer: 'border-t border-gray-200 dark:border-gray-700',
      hashtag: 'font-light text-gray-500 dark:text-gray-400',
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
        {image && (
          <div className="mr-4 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={name}
              className="w-20 h-20 object-cover rounded-lg shadow-md"
              style={{ aspectRatio: '1/1' }}
            />
          </div>
        )}
        <div className="flex-grow">
          <p className={`${s.group} text-sm sm:text-base`}>{group || ' '}</p>
          <h2 className={`${s.name} text-3xl sm:text-4xl md:text-5xl`}>{name || '推しの名前'}</h2>
        </div>
        {title && (
          <div className={`${s.titleContainer} ml-2 flex-shrink-0`} style={template === 'cool' ? accentStyle : {}}>
            <p className={`${s.titleText} text-base sm:text-lg`}>{title}</p>
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
          <CardSection title="好きなビジュアル・衣装" className={s.sectionTitle}>
            <p className="text-sm sm:text-base">{favoriteVisual || <span className="text-gray-400 text-sm">（未入力）</span>}</p>
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
