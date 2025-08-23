import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { theme } = await request.json();

    if (!theme) {
      return NextResponse.json({ error: 'Theme is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `「${theme}」という雑談テーマについて、会話がもっと面白く広がるような、ユニークで深掘りできる質問を3つ提案してください。形式は箇条書きで、質問のみを返してください。`;
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ error: `API Error: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {

        const text = result.candidates[0].content.parts[0].text;
        return NextResponse.json({ text });
    } else {
        return NextResponse.json({ error: "AIからの有効な回答がありませんでした。" }, { status: 500 });
    }

  } catch (error) {
    console.error("Gemini API call failed:", error);
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
