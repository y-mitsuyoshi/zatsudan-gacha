'use client'

import { useEffect } from 'react';
import { initFirebaseAnalytics } from '@/lib/firebase';
import { PageTracker } from './PageTracker';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // クライアントサイドでのみ実行
    initFirebaseAnalytics();
  }, []);

  return (
    <>
      <PageTracker />
      {children}
    </>
  );
}
