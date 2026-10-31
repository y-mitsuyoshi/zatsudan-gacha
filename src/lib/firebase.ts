import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAnalytics,
  isSupported,
  logEvent,
  setAnalyticsCollectionEnabled,
  Analytics,
} from 'firebase/analytics';
import { hasAnalyticsConsent } from './consent';

// Firebase config は環境変数で提供する
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let analytics: Analytics | null = null;
let isInitializing = false;
let isInitialized = false;
let app: FirebaseApp | undefined;
let analyticsInitPromise: Promise<Analytics | null> | null = null;
let pendingPageView: { page_title: string; page_location: string } | null = null;

export function getFirebaseApp() {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) {
    return null;
  }

  if (isInitialized) {
    if (analytics) {
      setAnalyticsCollectionEnabled(analytics, true);
    }
    return analytics;
  }

  if (isInitializing) {
    return analyticsInitPromise;
  }

  isInitializing = true;
  analyticsInitPromise = (async () => {
    try {
      const firebaseApp = getFirebaseApp();
      const supported = await isSupported();
      if (!supported) {
        return null;
      }

      analytics = initializeAnalytics(firebaseApp, {
        config: {
          // Page views are tracked manually so client-side navigation is not double-counted.
          send_page_view: false,
        },
      });
      isInitialized = true;
      setAnalyticsCollectionEnabled(analytics, true);

      if (pendingPageView) {
        logEvent(analytics, 'page_view', pendingPageView);
        pendingPageView = null;
      }

      return analytics;
    } catch {
      return null;
    } finally {
      isInitializing = false;
    }
  })();

  return analyticsInitPromise;
}

export function disableFirebaseAnalytics(): void {
  if (analytics) {
    setAnalyticsCollectionEnabled(analytics, false);
  }
}

export function trackPageView(page_title: string, page_location?: string) {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) {
    return;
  }

  const payload = {
    page_title,
    page_location: page_location || window.location.pathname,
  };

  if (analytics && isInitialized) {
    logEvent(analytics, 'page_view', payload);
    return;
  }

  pendingPageView = payload;
  void initFirebaseAnalytics();
}

export function trackEvent(eventName: string, parameters?: Record<string, unknown>) {
  if (!hasAnalyticsConsent()) {
    return;
  }

  if (analytics && isInitialized) {
    logEvent(analytics, eventName, parameters);
  }
}
