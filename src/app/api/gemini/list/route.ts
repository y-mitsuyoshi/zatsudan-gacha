import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const text = await res.text();
    // Return the raw JSON/text so you can inspect available models locally
    return NextResponse.json({ status: res.status, body: JSON.parse(text) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
