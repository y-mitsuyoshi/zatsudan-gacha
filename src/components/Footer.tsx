"use client";

import Link from 'next/link';

export const Footer: React.FC = () => {
  const services = [
    {
      title: '雑談テーマガチャ',
      description: 'アイスブレイクや会話のきっかけに',
      href: '/',
      emoji: '🎲'
    },
    {
      title: '異世界転生ステータスカード',
      description: 'あなたの異世界での姿を診断',
      href: '/isekai-status',
      emoji: '⚔️'
    },
    {
      title: '推し活プロフィールメーカー',
      description: 'あなたの「好き」をカードに',
      href: '/profile-maker',
      emoji: '💖'
    }
  ];

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* サービス一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group p-6 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-start space-x-4">
                <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
                  {service.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {service.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* サイト情報 */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                ざつだんガチャ
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                コミュニケーションをもっと楽しく、もっと豊かに
              </p>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                © 2024 ざつだんガチャ. All rights reserved.
              </p>
              <div className="mt-2 flex justify-center md:justify-end space-x-4">
                <a
                  href="https://twitter.com/zatsudan_gacha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                  aria-label="Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};