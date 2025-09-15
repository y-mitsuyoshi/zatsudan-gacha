"use client";

import { ProfileState, Template } from "@/types";

interface ProfileCardPreviewProps {
  profile: ProfileState;
  template: Template;
}

// Helper component for card sections
const CardSection = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string; }) => (
  <div className={className}>
    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 sm:mb-2">{title}</h3>
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
      card: 'p-3 sm:p-6 lg:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg font-sans text-gray-800 dark:text-gray-200',
      header: 'border-b-2',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight',
      group: 'text-sm sm:text-base text-gray-500 dark:text-gray-400',
      titleContainer: 'p-2 sm:p-3 text-center rounded-lg shadow-sm bg-white/50 dark:bg-gray-700/50',
      titleText: 'font-bold text-sm sm:text-base lg:text-xl text-gray-900 dark:text-white',
      sectionTitle: 'text-gray-500 dark:text-gray-400',
      tag: 'px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full',
      quote: 'text-sm sm:text-base lg:text-lg italic leading-relaxed',
      footer: 'border-t border-gray-200 dark:border-gray-700',
      hashtag: 'font-bold',
    },
    pop: {
      card: 'p-3 sm:p-6 lg:p-8 bg-yellow-50 dark:bg-yellow-900/30 rounded-3xl shadow-xl font-bold font-sans border-2 sm:border-4 border-black text-black dark:text-white',
      header: 'border-b-2 sm:border-b-4 border-black dark:border-white',
      name: 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-black dark:text-white leading-tight',
      group: 'text-sm sm:text-base lg:text-lg font-bold text-gray-700 dark:text-gray-300',
      titleContainer: 'p-2 sm:p-3 lg:p-4 text-center rounded-xl sm:rounded-2xl border-2 sm:border-3 border-black dark:border-white rotate-2 sm:rotate-3 bg-white dark:bg-gray-800 shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] sm:dark:shadow-[4px_4px_0_0_#fff]',
      titleText: 'font-black text-sm sm:text-lg lg:text-xl text-black dark:text-white',
      sectionTitle: 'text-black dark:text-white',
      tag: 'px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 text-xs sm:text-sm lg:text-base font-bold rounded-full border-1 sm:border-2 border-black dark:border-white shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000]',
      quote: 'text-sm sm:text-lg lg:text-xl font-bold italic bg-white/50 dark:bg-black/20 p-2 sm:p-3 rounded-lg leading-relaxed',
      footer: 'border-t-2 sm:border-t-4 border-black dark:border-white',
      hashtag: 'font-black text-sm sm:text-base lg:text-lg p-1 sm:p-2 rounded-lg',
    },
    cool: {
      card: 'p-3 sm:p-6 lg:p-8 bg-gray-900 rounded-lg shadow-2xl font-mono text-gray-100 border border-gray-700',
      header: 'border-b border-gray-700',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-wide sm:tracking-widest leading-tight',
      group: 'text-sm sm:text-base text-cyan-400',
      titleContainer: 'p-2 sm:p-3 text-center border border-cyan-400 bg-gray-800/80',
      titleText: 'font-bold text-sm sm:text-lg lg:text-xl text-cyan-400',
      sectionTitle: 'text-cyan-400',
      tag: 'px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-sm bg-cyan-400/10 text-cyan-300 border border-cyan-400/30',
      quote: 'text-sm sm:text-base lg:text-lg italic text-gray-300 leading-relaxed',
      footer: 'border-t border-gray-700',
      hashtag: 'font-bold text-cyan-400',
    },
    elegant: {
      card: 'p-3 sm:p-6 lg:p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl shadow-xl font-serif text-gray-800 dark:text-gray-200',
      header: 'border-b border-purple-200 dark:border-purple-700',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-purple-900 dark:text-purple-100 tracking-wide leading-tight',
      group: 'text-sm sm:text-base text-purple-600 dark:text-purple-400 font-medium',
      titleContainer: 'p-2 sm:p-3 text-center rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800 border border-purple-200 dark:border-purple-600',
      titleText: 'font-medium text-sm sm:text-base lg:text-lg text-purple-900 dark:text-purple-100',
      sectionTitle: 'text-purple-600 dark:text-purple-400',
      tag: 'px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200',
      quote: 'text-sm sm:text-base lg:text-lg italic text-purple-700 dark:text-purple-300 leading-relaxed',
      footer: 'border-t border-purple-200 dark:border-purple-700',
      hashtag: 'font-medium text-purple-600 dark:text-purple-400',
    },
    kawaii: {
      card: 'p-3 sm:p-6 lg:p-8 bg-pink-50 dark:bg-pink-900/20 rounded-3xl shadow-lg font-sans text-pink-900 dark:text-pink-100 border-2 border-pink-200 dark:border-pink-700',
      header: 'border-b-2 border-pink-200 dark:border-pink-700',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-pink-600 dark:text-pink-300 leading-tight',
      group: 'text-sm sm:text-base text-pink-500 dark:text-pink-400',
      titleContainer: 'p-2 sm:p-3 text-center rounded-full bg-pink-100 dark:bg-pink-800 border-2 border-pink-300 dark:border-pink-600',
      titleText: 'font-bold text-sm sm:text-base lg:text-lg text-pink-700 dark:text-pink-200',
      sectionTitle: 'text-pink-600 dark:text-pink-400',
      tag: 'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full bg-pink-200 dark:bg-pink-700 text-pink-800 dark:text-pink-200',
      quote: 'text-sm sm:text-base lg:text-lg text-pink-700 dark:text-pink-300 leading-relaxed',
      footer: 'border-t-2 border-pink-200 dark:border-pink-700',
      hashtag: 'font-bold text-pink-600 dark:text-pink-400',
    },
    vintage: {
      card: 'p-3 sm:p-6 lg:p-8 bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-lg font-serif text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700',
      header: 'border-b-2 border-amber-300 dark:border-amber-600',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-amber-800 dark:text-amber-200 leading-tight',
      group: 'text-sm sm:text-base text-amber-600 dark:text-amber-400',
      titleContainer: 'p-2 sm:p-3 text-center bg-amber-100 dark:bg-amber-800 border border-amber-300 dark:border-amber-600',
      titleText: 'font-bold text-sm sm:text-base lg:text-lg text-amber-800 dark:text-amber-200',
      sectionTitle: 'text-amber-700 dark:text-amber-300',
      tag: 'px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-600',
      quote: 'text-sm sm:text-base lg:text-lg italic text-amber-700 dark:text-amber-300 leading-relaxed',
      footer: 'border-t-2 border-amber-300 dark:border-amber-600',
      hashtag: 'font-bold text-amber-700 dark:text-amber-300',
    },
    neon: {
      card: 'p-3 sm:p-6 lg:p-8 bg-black rounded-xl shadow-2xl font-mono text-green-400 border border-green-500',
      header: 'border-b border-green-500',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.7)] sm:drop-shadow-[0_0_10px_rgba(34,197,94,0.7)] leading-tight',
      group: 'text-sm sm:text-base text-green-300',
      titleContainer: 'p-2 sm:p-3 text-center border border-green-500 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.3)] sm:shadow-[0_0_15px_rgba(34,197,94,0.3)]',
      titleText: 'font-bold text-sm sm:text-base lg:text-lg text-green-400',
      sectionTitle: 'text-green-300',
      tag: 'px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-green-500/20 text-green-300 border border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)] sm:shadow-[0_0_10px_rgba(34,197,94,0.3)]',
      quote: 'text-sm sm:text-base lg:text-lg text-green-300 leading-relaxed',
      footer: 'border-t border-green-500',
      hashtag: 'font-bold text-green-400',
    },
    dreamy: {
      card: 'p-3 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl shadow-xl font-sans text-gray-700 dark:text-gray-200',
      header: 'border-b border-purple-200 dark:border-purple-700',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text leading-tight',
      group: 'text-sm sm:text-base text-purple-500 dark:text-purple-400',
      titleContainer: 'p-2 sm:p-3 text-center rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-purple-200 dark:border-purple-600',
      titleText: 'font-medium text-sm sm:text-base lg:text-lg text-purple-700 dark:text-purple-300',
      sectionTitle: 'text-purple-600 dark:text-purple-400',
      tag: 'px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-800 dark:to-purple-800 text-purple-700 dark:text-purple-300',
      quote: 'text-sm sm:text-base lg:text-lg text-purple-600 dark:text-purple-400 leading-relaxed',
      footer: 'border-t border-purple-200 dark:border-purple-700',
      hashtag: 'font-medium text-purple-600 dark:text-purple-400',
    },
    retro: {
      card: 'p-3 sm:p-6 lg:p-8 bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow-lg font-mono text-orange-900 dark:text-orange-100 border-2 border-orange-300 dark:border-orange-700',
      header: 'border-b-2 sm:border-b-4 border-orange-400 dark:border-orange-600',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-orange-700 dark:text-orange-300 tracking-wide leading-tight',
      group: 'text-sm sm:text-base text-orange-600 dark:text-orange-400 uppercase',
      titleContainer: 'p-2 sm:p-3 text-center bg-orange-200 dark:bg-orange-800 border-2 border-orange-400 dark:border-orange-600 transform -rotate-1 sm:-rotate-2',
      titleText: 'font-bold text-sm sm:text-base lg:text-lg text-orange-800 dark:text-orange-200',
      sectionTitle: 'text-orange-700 dark:text-orange-300 uppercase tracking-wide',
      tag: 'px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold bg-orange-200 dark:bg-orange-700 text-orange-800 dark:text-orange-200 border border-orange-400 dark:border-orange-500',
      quote: 'text-sm sm:text-base lg:text-lg text-orange-700 dark:text-orange-300 font-bold leading-relaxed',
      footer: 'border-t-2 sm:border-t-4 border-orange-400 dark:border-orange-600',
      hashtag: 'font-bold text-orange-700 dark:text-orange-300 uppercase',
    },
    minimal: {
      card: 'p-3 sm:p-6 lg:p-8 bg-white dark:bg-gray-900 rounded-none shadow-sm font-sans text-gray-900 dark:text-gray-100 border-l-4',
      header: 'border-b border-gray-200 dark:border-gray-700',
      name: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-thin text-gray-900 dark:text-gray-100 tracking-wide sm:tracking-wider leading-tight',
      group: 'text-sm sm:text-base text-gray-500 dark:text-gray-400 font-light',
      titleContainer: 'p-2 text-center bg-gray-100 dark:bg-gray-800',
      titleText: 'font-normal text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300',
      sectionTitle: 'text-gray-500 dark:text-gray-400 font-light uppercase tracking-widest text-xs',
      tag: 'px-2 py-1 text-xs font-normal bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
      quote: 'text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300 font-light italic leading-relaxed',
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
    <div id="profile-card" className={`${s.card} w-full min-w-[280px] max-w-2xl mx-auto aspect-[1.91/1] flex flex-col transition-all duration-300 leading-normal`} style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
      {/* Header */}
      <header className={`flex items-start pb-2 sm:pb-4 ${s.header}`} style={accentStyle}>
        {image && (
          <div className="mr-2 sm:mr-4 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={name}
              className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-lg shadow-md"
              style={{ aspectRatio: '1/1' }}
            />
          </div>
        )}
        <div className="flex-grow">
          <p className={`${s.group} text-xs sm:text-sm md:text-base`}>{group || ' '}</p>
          <h2 className={`${s.name} text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl break-words`}>{name || '推しの名前'}</h2>
        </div>
        {title && (
          <div className={`${s.titleContainer} ml-2 flex-shrink-0`} style={template === 'cool' ? accentStyle : {}}>
            <p className={`${s.titleText} text-xs sm:text-sm md:text-base lg:text-lg break-words text-center`}>{title}</p>
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
