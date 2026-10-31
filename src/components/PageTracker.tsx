'use client'

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/firebase';

export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    // Query strings are intentionally excluded: they can contain user input.
    trackPageView(document.title, pathname);
  }, [pathname]);
}

export function PageTracker() {
  usePageTracking();
  return null;
}
