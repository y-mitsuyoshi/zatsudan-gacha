"use client";

import { useEffect } from 'react';

interface AdSenseProps {
  adSlot: string;
  adFormat?: string;
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const AdSense: React.FC<AdSenseProps> = ({ 
  adSlot, 
  adFormat = "auto", 
  style = { display: "block" },
  className = ""
}) => {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client="ca-pub-7296906013994885"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
};

// プリセットされた広告コンポーネント
export const DisplayAd: React.FC<{ adSlot: string; className?: string }> = ({ adSlot, className }) => (
  <AdSense 
    adSlot={adSlot} 
    adFormat="auto"
    style={{ display: "block" }}
    className={className}
  />
);

export const HorizontalAd: React.FC<{ adSlot: string; className?: string }> = ({ adSlot, className }) => (
  <AdSense 
    adSlot={adSlot} 
    adFormat="horizontal"
    style={{ display: "block" }}
    className={className}
  />
);

export const VerticalAd: React.FC<{ adSlot: string; className?: string }> = ({ adSlot, className }) => (
  <AdSense 
    adSlot={adSlot} 
    adFormat="vertical"
    style={{ display: "block" }}
    className={className}
  />
);
