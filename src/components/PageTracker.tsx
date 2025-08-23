'use client'

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/firebase';

export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    // ページが変わったらページビューをトラッキング
    trackPageView(document.title, window.location.href);
  }, [pathname]);
}

export function PageTracker() {
  usePageTracking();
  return null;
}
