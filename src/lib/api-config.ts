// API設定
export const API_CONFIG = {
  // 本番環境ではFirebase Functions、開発環境では直接APIアクセス
  GEMINI_ENDPOINT: process.env.NODE_ENV === 'production' 
    ? 'https://us-central1-zatsudan-gacha.cloudfunctions.net/gemini'
    : '/api/gemini',
  
  // 開発環境でのみ使用されるAPIキー
  USE_DIRECT_API: process.env.NODE_ENV === 'development',
};

export async function callGeminiAPI(theme: string): Promise<{text: string}> {
  const response = await fetch(API_CONFIG.GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ theme }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.statusText}`);
  }

  return response.json();
}
