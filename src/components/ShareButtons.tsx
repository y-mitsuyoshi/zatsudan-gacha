"use client";

import { useState, useEffect } from 'react';

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" {...props}>
        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
    </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" {...props}>
        <path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172h-23.8c-51.3 0-63.8 25.4-63.8 65.3V256h63.8l-10.7 78.2H287V510.1C413.8 494.8 512 386.9 512 256h0z" />
    </svg>
);

const LineIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" fill="currentColor" {...props}>
        <path d="M1024 0C458.5 0 0 411.3 0 918.7c0 244.3 108.2 471.4 301.2 638.1l-105.3 390.8c-6.8 25.2 19.3 46.1 43.6 34.3l374.3-178.9c97.3 22.2 199.9 34.2 306.2 34.2c565.5 0 1024-411.3 1024-918.7S1589.5 0 1024 0zM773.3 1032.7H622.5c-22.3 0-40.3-18-40.3-40.3V730.2c0-22.3 18-40.3 40.3-40.3h150.8c22.3 0 40.3 18 40.3 40.3v262.1c0 22.3-18 40.3-40.3 40.3zM1465.8 1032.7h-150.8c-22.3 0-40.3-18-40.3-40.3V730.2c0-22.3 18-40.3 40.3-40.3h150.8c22.3 0 40.3 18 40.3 40.3v262.1c0 22.3-18 40.3-40.3 40.3zM448.9 1032.7h-65.1V730.2h65.1c22.3 0 40.3 18 40.3 40.3v262.1c0 22.3-18 40.3-40.3 40.3zM1097.9 1032.7h-65.1V730.2h65.1c22.3 0 40.3 18 40.3 40.3v262.1c0 22.3-18 40.3-40.3 40.3z" />
    </svg>
);


export const ShareButtons = () => {
    const [appUrl, setAppUrl] = useState('');

    useEffect(() => {
        // Ensure window is defined (runs only on client)
        if (typeof window !== 'undefined') {
            setAppUrl(window.location.origin);
        }
    }, []);

    if (!appUrl) {
        return null; // Or a loading spinner
    }

    const shareTextX = "会議のアイスブレイクや雑談のきっかけに！ランダムにお題を出すアプリ「雑談テーマガチャ」";
    const shareHashtagsX = "雑談テーマガチャ";
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextX)}&url=${encodeURIComponent(appUrl)}&hashtags=${encodeURIComponent(shareHashtagsX)}`;

    const shareQuoteFacebook = "会議のアイスブレイクや雑談のきっかけに！ランダムにお題を出すアプリ。";
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(shareQuoteFacebook)}`;

    const shareTextLine = "会議のアイスブレイクや雑談のきっかけに！ランダムにお題を出すアプリ「雑談テーマガチャ」";
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareTextLine)}`;

    return (
        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-center text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                このアプリをシェア
            </h3>
            <div className="flex justify-center items-center space-x-4">
                <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="Xでシェア" className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                    <XIcon className="h-8 w-8" />
                </a>
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebookでシェア" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors">
                    <FacebookIcon className="h-8 w-8" />
                </a>
                <a href={lineUrl} target="_blank" rel="noopener noreferrer" aria-label="LINEでシェア" className="text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors">
                    <LineIcon className="h-8 w-8" />
                </a>
            </div>
        </div>
    );
};
