import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, Analytics } from 'firebase/analytics';

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

export async function initFirebaseAnalytics() {
  // サーバーサイドでは実行しない
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Firebase Appの初期化
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    // Analytics がサポートされているかチェック
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized successfully');
    } else {
      console.log('Firebase Analytics is not supported in this environment');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Analytics:', error);
  }

  return analytics;
}

export function getFirebaseAnalytics() {
  return analytics;
}

// ページビューをトラッキングする関数
export function trackPageView(page_title: string, page_location?: string) {
  if (analytics) {
    logEvent(analytics, 'page_view', {
      page_title,
      page_location: page_location || window.location.href,
    });
  }
}

// カスタムイベントをトラッキングする関数
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (analytics) {
    logEvent(analytics, eventName, parameters);
  }
}
