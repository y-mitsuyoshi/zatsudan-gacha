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
    },
    {
      title: '社畜すごろく',
      description: '目指せ！定時退社＆ボーナス支給',
      href: '/shachiku-sugoroku',
      emoji: '🏢'
    },
    {
      title: '社畜シューティング',
      description: 'ストレス社会で戦うあなたへ',
      href: '/shachiku-shooting',
      emoji: '🔫'
    },
    {
      title: '社畜人狼',
      description: '会社という名の戦場',
      href: '/shachiku-jinro',
      emoji: '🐺'
    }
  ];

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* サービス一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
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
                雑談テーマガチャ
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                コミュニケーションをもっと楽しく、もっと豊かに
              </p>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                © 2025 雑談テーマガチャ. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};