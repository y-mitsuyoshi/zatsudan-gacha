'use client';

import { useEffect } from 'react';

export function MetaDedupe() {
  useEffect(() => {
    const dedupe = () => {
      const seen = new Set<string>();
      const metas = Array.from(document.head.querySelectorAll('meta[property], meta[name]'));
      for (const meta of metas) {
        const key = meta.getAttribute('property') || meta.getAttribute('name');
        if (!key || (!key.startsWith('og:') && !key.startsWith('twitter:'))) continue;
        if (seen.has(key)) {
          meta.remove();
        } else {
          seen.add(key);
        }
      }
    };
    dedupe();
    const observer = new MutationObserver(dedupe);
    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
