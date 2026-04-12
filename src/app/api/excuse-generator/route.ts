import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  if (isRateLimited()) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { situation, tone, details } = body;

    if (!situation || !tone) {
      return NextResponse.json({ error: 'Situation and tone are required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `あなたは「究極の言い訳ジェネレーター」です。以下の条件に基づいて、メッセージアプリ等でそのまま送信できる言い訳のテキストを生成してください。

【条件】
・シチュエーション: ${situation}
・トーン: ${tone}
・詳細情報: ${details || '特になし'}

【指示】
・指定されたトーンに合わせた文体にすること（例：社畜風なら少し悲壮感を漂わせる、ビジネス用なら丁寧で論理的に、異世界転生風ならファンタジー用語を交える）。
・言い訳のテキストのみを出力し、挨拶以外の余計な解説や前置きは含めないでください。`;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

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
        return NextResponse.json({ excuse: text });
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
