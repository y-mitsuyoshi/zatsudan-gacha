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

    const prompt = `あなたは「究極の言い訳ジェネレーター」です。以下の条件に基づいて、メッセージアプリ等でそのまま送信できる最高に言い訳がましい、あるいは面白いテキストを生成してください。

【条件】
・シチュエーション: ${situation}
・トーン: ${tone}
・詳細情報: ${details || '特になし'}

【指示】
・指定されたトーン（文体）を完璧に再現してください。
    - 「真面目・ビジネス用」: 丁寧で誠実そうに見えるが、巧みに責任を回避または軽減する論理的な文章。
    - 「ユーモア・社畜風」: 自虐的で悲壮感漂う、つい同情したくなるような社畜特有の言い回し。
    - 「異世界転生風」: 現代の出来事を無理やりファンタジー世界（魔法、ギルド、魔王など）のせいにした大掛かりな嘘。
    - 「マッチョ風」: 筋肉、プロテイン、トレーニングを軸にした強気で暑苦しい文体。語尾は「ッス」「マッスル」など。
    - 「ツンデレ風」: 「べ、別にお前のためにやったわけじゃないんだからね！」的な、素直になれない高飛車かつ照れ隠しな文体。
    - 「文豪風」: 夏目漱石や太宰治を彷彿とさせる、無駄に詩的で憂鬱、かつ重々しい表現。
    - 「猫風」: 語尾に「にゃ」「にゃん」をつけ、猫の視点や習性を交えた言い訳。
    - 「ラップ風」: リズム感（韻）を重視し、Yo! Check it out! 的なノリで謝罪や言い訳をぶちかます。
    - 「ギャル風」: 「まじ卍」「ぴえん」「てか」など、過剰なギャル語と絵文字を多用した軽いノリ。
・言い訳のテキストのみを出力してください。
・「トーン：〇〇」といったラベルや解説、前置きは一切不要です。`;

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
