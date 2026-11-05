"use client";

import html2canvas from 'html2canvas-pro';
import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { trackEvent } from '@/lib/firebase';
import { copyToClipboard } from '@/lib/clipboard';

interface ActionButtonsProps {
  profileName: string;
  profileText?: string;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" {...props}>
        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
    </svg>
);

export const ActionButtons: React.FC<ActionButtonsProps> = ({ profileName, profileText = '' }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const copyTimerRef = useRef<number | null>(null);
  const safeName = profileName.trim() || '推し';

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleGenerateImage = async () => {
    const cardElement = document.getElementById('profile-card');
    if (!cardElement) {
      console.error("Card element not found!");
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    try {
      trackEvent('generate_card_start', { name_length: safeName.length });
      const canvas = await html2canvas(cardElement, {
        useCORS: true,
        scale: 2, // Higher resolution for better quality
        backgroundColor: null, // Use element's background
      });

      const link = document.createElement('a');
      const safeFilename = safeName.replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'oshi';
      link.download = `${safeFilename}_oshi_profile.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      trackEvent('generate_card_success');

    } catch (error) {
      console.error("Error generating image:", error);
      setErrorMessage('画像の生成に失敗しました。別のテンプレートで試すか、時間をおいて再度お試しください。');
      trackEvent('generate_card_error', { error: error instanceof Error ? error.name : 'UnknownError' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = async () => {
    if (!profileText) return;
    try {
      await copyToClipboard(profileText);
      setIsCopied(true);
      setErrorMessage('');
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setIsCopied(false), 2000);
      trackEvent('copy_profile_text');
    } catch (error) {
      console.error('Failed to copy profile text:', error);
      setCopiedError();
    }
  };

  const setCopiedError = () => {
    setErrorMessage('テキストをコピーできませんでした。時間をおいて再度お試しください。');
  };

  const handleShareToX = () => {
    const hashtagName = safeName.replace(/\s/g, '_').replace(/[^\w\u3040-\u30ff\u4e00-\u9faf_]/g, '');
    const shareText = `見てみて！私の推し「${safeName}」のプロフィールカード作ったよ！\nみんなも作ってみよう！\n\n#推し活プロフィールメーカー\n#${hashtagName}`;
    const appUrl = 'https://zatsudan-gacha.app/profile-maker';
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(appUrl)}`;

    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    trackEvent('share_to_x_click');
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
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isGenerating ? '生成中...' : '画像をダウンロード'}
      </button>
      <button
        type="button"
        onClick={handleCopyText}
        disabled={!profileText}
        className="w-full bg-white dark:bg-gray-700 border-2 border-fuchsia-500 text-fuchsia-700 dark:text-fuchsia-200 font-bold py-3 px-6 rounded-lg text-base transition-all duration-200 flex items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCopied ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardIcon className="h-5 w-5" />}
        <span>{isCopied ? 'プロフィールをコピーしました' : 'プロフィールをテキストコピー'}</span>
      </button>
      <button
        type="button"
        onClick={handleShareToX}
        className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 px-6 rounded-lg text-lg transition-all duration-200 flex items-center justify-center space-x-2 hover:bg-gray-800 dark:hover:bg-gray-200"
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
