"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_STORAGE_KEY,
  type ConsentValue,
  getStoredConsent,
  storeConsent,
} from '@/lib/consent';

type ConsentContextValue = {
  consent: ConsentValue;
  accept: () => void;
  reject: () => void;
  reset: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentValue>('unknown');

  useEffect(() => {
    setConsent(getStoredConsent());

    const handleChange = (event: Event) => {
      const value = (event as CustomEvent<ConsentValue>).detail;
      if (value === 'accepted' || value === 'rejected' || value === 'unknown') {
        setConsent(value);
      }
    };

    window.addEventListener(CONSENT_CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handleChange);
  }, []);

  const accept = useCallback(() => {
    storeConsent('accepted');
    setConsent('accepted');
  }, []);

  const reject = useCallback(() => {
    storeConsent('rejected');
    setConsent('rejected');
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
    setConsent('unknown');
  }, []);

  const value = useMemo(
    () => ({ consent, accept, reject, reset }),
    [accept, consent, reject, reset]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within ConsentProvider');
  }
  return context;
}
