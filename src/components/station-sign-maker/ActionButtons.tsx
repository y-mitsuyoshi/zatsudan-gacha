"use client";

import html2canvas from 'html2canvas';
import { trackEvent } from '@/lib/firebase';
import { useState } from 'react';

interface ActionButtonsProps {
  stationName: string;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" {...props}>
        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
    </svg>
);

export const ActionButtons: React.FC<ActionButtonsProps> = ({ stationName }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateImage = async () => {
    const cardElement = document.getElementById('station-sign-card');
    if (!cardElement) {
      console.error("Card element not found!");
      return;
    }

    setIsGenerating(true);
    try {
      trackEvent('generate_sign_start', { name: stationName });
      const canvas = await html2canvas(cardElement, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });

      const link = document.createElement('a');
      const safeFilename = stationName.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
      link.download = `${safeFilename}_station_sign.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      trackEvent('generate_sign_success', { name: stationName });

    } catch (error) {
      console.error("Error generating image:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      trackEvent('generate_sign_error', { name: stationName, error: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToX = () => {
    const shareText = `私だけの駅、できました。\n\n#駅名看板メーカー\n#${stationName.replace(/\s/g, '_')}駅`;
    const appUrl = 'https://zatsudan-gacha.web.app/station-sign-maker'; // TODO: Make this dynamic
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(appUrl)}`;

    window.open(twitterIntentUrl, '_blank');
    trackEvent('share_to_x_click', { name: stationName });
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
        className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isGenerating ? '生成中...' : '画像をダウンロード'}
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
