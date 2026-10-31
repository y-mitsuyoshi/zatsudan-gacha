'use client';

import { useEffect } from 'react';

export const DomainRedirect = () => {
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isProduction = process.env.NODE_ENV === 'production';
      
      // 開発環境の場合はリダイレクトしない
      if (!isProduction) {
        return;
      }
      
      // Firebase の標準ドメインからの場合のみリダイレクト
      if (hostname === 'zatsudan-gacha.web.app' || hostname === 'zatsudan-gacha.firebaseapp.com') {
        const newUrl = `https://zatsudan-gacha.app${window.location.pathname}${window.location.search}${window.location.hash}`;
        
        // replace() avoids leaving the old Firebase domain in the browser history.
        window.location.replace(newUrl);
      }
    }
  }, []);

  return null;
};
