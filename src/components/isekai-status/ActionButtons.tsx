"use client";

import html2canvas from 'html2canvas';
// import { trackEvent } from '@/lib/firebase'; // Tracking is commented out for now
import { useState } from 'react';

interface ActionButtonsProps {
  profileName: string;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" {...props}>
        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
    </svg>
);

export const ActionButtons: React.FC<ActionButtonsProps> = ({ profileName }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateImage = async () => {
    const cardElement = document.getElementById('isekai-status-card');
    if (!cardElement) {
      console.error("Card element with id 'isekai-status-card' not found!");
      return;
    }

    setIsGenerating(true);
    try {
      // trackEvent('generate_isekai_card_start', { name: profileName });
      const canvas = await html2canvas(cardElement, {
        useCORS: true,
        scale: 2, // Higher resolution
        backgroundColor: '#111827', // Match the dark background of the card
      });

      const link = document.createElement('a');
      const safeFilename = profileName.replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'isekai_status';
      link.download = `${safeFilename}_isekai_status.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      // trackEvent('generate_isekai_card_success', { name: profileName });

    } catch (error) {
      console.error("Error generating image:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // trackEvent('generate_isekai_card_error', { name: profileName, error: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToX = () => {
    const shareText = "私が異世界転生した結果ww";
    const hashtags = "異世界転生ステータスカード,私を構成する5つのパラメータ";
    const appUrl = "https://zatsudan-gacha.web.app/isekai-status"; // Assuming this is the correct URL

    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(appUrl)}&hashtags=${encodeURIComponent(hashtags)}`;

    window.open(twitterIntentUrl, '_blank');
    // trackEvent('share_isekai_to_x_click', { name: profileName });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-center border border-indigo-200 dark:border-indigo-700">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          <span className="font-bold">①</span> 下のボタンから画像をダウンロード<br/>
          <span className="font-bold">②</span> X（旧Twitter）で画像を添付して投稿！
        </p>
      </div>
      <button
        onClick={handleGenerateImage}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isGenerating ? '画像生成中...' : '画像をダウンロード'}
      </button>
      <button
        onClick={handleShareToX}
        className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-6 rounded-lg text-lg transition-all duration-200 flex items-center justify-center space-x-2 hover:bg-gray-800 dark:hover:bg-gray-200"
      >
        <XIcon className="h-5 w-5" />
        <span>Xでシェアする</span>
      </button>
    </div>
  );
};
