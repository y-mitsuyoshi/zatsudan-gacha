'use client'

import { useEffect } from 'react';
import { disableFirebaseAnalytics, initFirebaseAnalytics } from '@/lib/firebase';
import { useConsent } from '@/components/ConsentProvider';
import { PageTracker } from './PageTracker';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();

  useEffect(() => {
    if (consent === 'accepted') {
      void initFirebaseAnalytics();
    } else {
      disableFirebaseAnalytics();
    }
  }, [consent]);

  return (
    <>
      {consent === 'accepted' && <PageTracker />}
      {children}
    </>
  );
}
