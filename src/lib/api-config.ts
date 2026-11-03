const CLIENT_TIMEOUT_MS = 30_000;
const FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL
  || 'https://us-central1-zatsudan-gacha.cloudfunctions.net';

// API設定
export const API_CONFIG = {
  // 本番環境ではFirebase Functions、開発環境ではNext.js API Routes
  THEME_QUESTIONS_ENDPOINT: process.env.NODE_ENV === 'production'
    ? `${FUNCTIONS_BASE_URL}/gemini`
    : '/api/gemini',

  EXCUSE_GENERATOR_ENDPOINT: process.env.NODE_ENV === 'production'
    ? `${FUNCTIONS_BASE_URL}/excuseGenerator`
    : '/api/excuse-generator',
};

async function requestJson<T>(url: string, body: unknown): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('リクエストがタイムアウトしました。時間をおいてもう一度お試しください。');
    }
    throw error;
  }
}

export async function callThemeQuestionsAPI(theme: string): Promise<{ text: string }> {
  return requestJson<{ text: string }>(API_CONFIG.THEME_QUESTIONS_ENDPOINT, { theme });
}

export async function callExcuseGeneratorAPI(situation: string, tone: string, details?: string): Promise<{ excuse: string }> {
  return requestJson<{ excuse: string }>(API_CONFIG.EXCUSE_GENERATOR_ENDPOINT, { situation, tone, details });
}
