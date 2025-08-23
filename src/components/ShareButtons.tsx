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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" {...props}>
        <rect fill="#06c755" width="320" height="320" rx="72.14"/>
        <path fill="#fff" d="M266.66,144.92c0-47.74-47.86-86.58-106.69-86.58S53.28,97.18,53.28,144.92c0,42.8,38,78.65,89.22,85.42,3.48.75,8.21,2.29,9.4,5.26,1.08,2.7.71,6.93.35,9.65,0,0-1.25,7.53-1.52,9.13-.47,2.7-2.15,10.55,9.24,5.76s61.44-36.18,83.82-61.95h0C259.25,181.24,266.66,164,266.66,144.92Z"/>
        <path fill="#06c755" d="M231.16,172.49h-30a2,2,0,0,1-2-2v0h0V123.94h0v0a2,2,0,0,1,2-2h30a2,2,0,0,1,2,2v7.57a2,2,0,0,1-2,2H210.79v7.85h20.37a2,2,0,0,1,2,2V151a2,2,0,0,1-2,2H210.79v7.86h20.37a2,2,0,0,1,2,2v7.56A2,2,0,0,1,231.16,172.49Z"/>
        <path fill="#06c755" d="M120.29,172.49a2,2,0,0,0,2-2v-7.56a2,2,0,0,0-2-2H99.92v-37a2,2,0,0,0-2-2H90.32a2,2,0,0,0-2,2v46.53h0v0a2,2,0,0,0,2,2h30Z"/>
        <rect fill="#06c755" x="128.73" y="121.85" width="11.64" height="50.64" rx="2.04"/>
        <path fill="#06c755" d="M189.84,121.85h-7.56a2,2,0,0,0-2,2v27.66l-21.3-28.77a1.2,1.2,0,0,0-.17-.21v0l-.12-.12,0,0-.11-.09-.06,0-.11-.08-.06,0-.11-.06-.07,0-.11,0-.07,0-.12,0-.08,0-.12,0h-.08l-.11,0h-7.71a2,2,0,0,0-2,2v46.56a2,2,0,0,0,2,2h7.57a2,2,0,0,0,2-2V142.81l21.33,28.8a2,2,0,0,0,.52.52h0l.12.08.06,0,.1.05.1,0,.07,0,.14,0h0a2.42,2.42,0,0,0,.54.07h7.52a2,2,0,0,0,2-2V123.89A2,2,0,0,0,189.84,121.85Z"/>
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
