'use client';

import { useEffect } from 'react';

export const DomainRedirect = () => {
  useEffect(() => {
    // 本番環境でのみリダイレクト処理を実行
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // Firebase の標準ドメインからの場合のみリダイレクト
      if (hostname === 'zatsudan-gacha.web.app' || hostname === 'zatsudan-gacha.firebaseapp.com') {
        const newUrl = `https://zatsudan-gacha.app${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(newUrl);
      }
    }
  }, []);

  return null;
};
