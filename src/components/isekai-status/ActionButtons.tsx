"use client";

import html2canvas from 'html2canvas';
import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { copyToClipboard } from '@/lib/clipboard';

interface ActionButtonsProps {
  profileName: string;
  shareText?: string;
  copyText?: string;
  disabled?: boolean;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" {...props}>
        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
    </svg>
);

export const ActionButtons: React.FC<ActionButtonsProps> = ({ profileName, shareText, copyText, disabled = false }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const copyTimerRef = useRef<number | null>(null);
  const safeName = profileName.trim() || 'isekai';

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleGenerateImage = async () => {
    const cardElement = document.getElementById('isekai-status-card');
    if (!cardElement) {
      console.error("Card element with id 'isekai-status-card' not found!");
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    try {
      const canvas = await html2canvas(cardElement, {
        useCORS: true,
        scale: 2, // Higher resolution
        backgroundColor: '#111827', // Match the dark background of the card
      });

      const link = document.createElement('a');
      const safeFilename = safeName.replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'isekai_status';
      link.download = `${safeFilename}_isekai_status.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Error generating image:", error);
      setErrorMessage('画像の生成に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToX = () => {
    const text = shareText || "私が異世界転生した結果ww";
    const hashtags = "異世界転生ステータスカード,私を構成する5つのパラメータ";
    const appUrl = "https://zatsudan-gacha.app/isekai-status";

    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(appUrl)}&hashtags=${encodeURIComponent(hashtags)}`;

    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyText = async () => {
    if (!copyText) return;
    try {
      await copyToClipboard(copyText);
      setIsCopied(true);
      setErrorMessage('');
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy status:', error);
      setErrorMessage('診断結果をコピーできませんでした。時間をおいて再度お試しください。');
    }
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
        type="button"
        onClick={handleGenerateImage}
        disabled={isGenerating || disabled}
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isGenerating ? '画像生成中...' : '画像をダウンロード'}
      </button>
      <button
        type="button"
        onClick={handleCopyText}
        disabled={disabled || !copyText}
        className="w-full bg-white dark:bg-gray-700 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-200 font-bold py-3 px-6 rounded-lg text-base transition-all duration-200 flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCopied ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardIcon className="h-5 w-5" />}
        <span>{isCopied ? 'コピーしました' : '診断結果をテキストコピー'}</span>
      </button>
      <button
        type="button"
        onClick={handleShareToX}
        disabled={disabled}
        className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-6 rounded-lg text-lg transition-all duration-200 flex items-center justify-center space-x-2 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <XIcon className="h-5 w-5" />
        <span>Xでシェアする</span>
      </button>
      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
