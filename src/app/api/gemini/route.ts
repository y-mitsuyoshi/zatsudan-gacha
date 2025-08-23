import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limiter';
import { get, set } from '../../../lib/gemini-cache';

export async function POST(request: Request) {
  if (isRateLimited()) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { theme } = body;

    if (!theme || typeof theme !== 'string') {
      return NextResponse.json({ error: 'Theme is required and must be a string' }, { status: 400 });
    }

    const cached = get(theme);
    if (cached) {
      console.log(`[Cache] HIT for ${theme}`);
      return NextResponse.json(cached);
    }
    console.log(`[Cache] MISS for ${theme}`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `「${theme}」という雑談テーマについて、会話がもっと面白く広がるような、ユニークで深掘りできる質問を3つ提案してください。形式は箇条書きで、質問のみを返してください。`;
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error("Gemini API request failed:", errorBody);
        throw new Error(`API Error: ${apiResponse.statusText}`);
    }

    const result = await apiResponse.json();

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {

        const text = result.candidates[0].content.parts[0].text;
        const cacheData = { text };
        set(theme, cacheData);
        return NextResponse.json(cacheData);
    } else {
        console.error("Invalid response structure from Gemini API:", result);
        throw new Error("AIからの有効な回答がありませんでした。");
    }

  } catch (error) {
    console.error("Gemini API call failed:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
