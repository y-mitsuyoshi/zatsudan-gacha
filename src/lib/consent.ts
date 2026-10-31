export type ConsentValue = 'accepted' | 'rejected' | 'unknown';

export const CONSENT_STORAGE_KEY = 'cookie-consent-v1';
export const CONSENT_CHANGE_EVENT = 'cookie-consent-change';

export function getStoredConsent(): ConsentValue {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'accepted' || value === 'rejected' ? value : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function hasAnalyticsConsent(): boolean {
  return getStoredConsent() === 'accepted';
}

export function storeConsent(value: Exclude<ConsentValue, 'unknown'>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // If storage is unavailable, the in-memory context still reflects the choice.
  }

  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_CHANGE_EVENT, { detail: value }));
}
