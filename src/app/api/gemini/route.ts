import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limiter';
import { get, set } from '../../../lib/gemini-cache';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `「${theme}」という雑談テーマについて、会話がもっと面白く広がるような、ユニークで深掘りできる質問を3つ提案してください。形式は箇条書きで、質問のみを返してください。`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cacheData = { text };
    set(theme, cacheData);

    return NextResponse.json(cacheData);

  } catch (error) {
    console.error("Gemini API call failed:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
