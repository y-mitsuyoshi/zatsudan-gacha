"use client";

import Script from 'next/script';
import { useConsent } from '@/components/ConsentProvider';

export function AdSenseScript() {
  const { consent } = useConsent();

  if (consent !== 'accepted') {
    return null;
  }

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7296906013994885"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
