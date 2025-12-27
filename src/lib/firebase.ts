import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, Analytics } from 'firebase/analytics';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getFunctions, Functions } from 'firebase/functions';

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
let db: Firestore | undefined;
let auth: Auth | undefined;
let functions: Functions | undefined;

export function getFirebaseApp() {
  if (!app) {
     app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseFirestore() {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseFunctions() {
  if (!functions) {
    // Functionsのリージョンを必要に応じて設定 (例: asia-northeast1)
    functions = getFunctions(getFirebaseApp(), 'us-central1');
  }
  return functions;
}

export async function initFirebaseAnalytics() {
  // サーバーサイドでは実行しない
  if (typeof window === 'undefined') {
    return null;
  }

  // 既に初期化済みまたは初期化中の場合は重複実行を避ける
  if (isInitialized || isInitializing) {
    return analytics;
  }

  isInitializing = true;

  try {
    // Firebase Appの初期化 (確実に行う)
    getFirebaseApp();
    
    // Analytics がサポートされているかチェック
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(app);
      isInitialized = true;
    }
  } catch (error) {
    // Analytics初期化エラーは静かに処理
  } finally {
    isInitializing = false;
  }

  return analytics;
}

export function getFirebaseAnalytics() {
  return analytics;
}

export function isAnalyticsInitialized() {
  return isInitialized;
}

// ページビューをトラッキングする関数
export function trackPageView(page_title: string, page_location?: string) {
  if (analytics && isInitialized) {
    logEvent(analytics, 'page_view', {
      page_title,
      page_location: page_location || window.location.href,
    });
  } else if (!isInitialized) {
    // 2秒後にリトライ
    setTimeout(() => {
      if (analytics && isInitialized) {
        logEvent(analytics, 'page_view', {
          page_title,
          page_location: page_location || window.location.href,
        });
      }
    }, 2000);
  }
}

// カスタムイベントをトラッキングする関数
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (analytics && isInitialized) {
    logEvent(analytics, eventName, parameters);
  }
}
