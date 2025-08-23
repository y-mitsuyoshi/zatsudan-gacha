import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limiter';
import { get, set } from '../../../lib/gemini-cache';

export async function POST(request: Request) {
  if (isRateLimited()) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  try {
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse JSON body:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { theme } = body ?? {};

    if (!theme || typeof theme !== 'string') {
      return NextResponse.json({ error: 'Theme is required and must be a string' }, { status: 400 });
    }

    const cached = get(theme);
    if (cached) {
      return NextResponse.json(cached);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `「${theme}」という雑談テーマについて、会話がもっと面白く広がるような、ユニークで深掘りできる質問を3つ提案してください。形式は箇条書きで、質問のみを返してください。`;
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };

    // Try the user's requested model (gemini-2.5) first. If it's not available for
    // generateContent we will call ListModels and try to pick a supported model,
    // finally falling back to gemini-1.5.
  const preferredModel = 'gemini-2.5-flash-lite';
    let modelToUse = preferredModel;

    const callGenerateWithMethod = async (modelName: string, methodSuffix: string, bodyObj: any, useV1?: boolean) => {
      const base = useV1 ? 'v1' : 'v1beta';
      const url = `https://generativelanguage.googleapis.com/${base}/models/${modelName}:${methodSuffix}?key=${apiKey}`;
      console.info('Calling Gemini with', url, 'body shape:', Object.keys(bodyObj || {}));
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
      });
    };

    // Try several possible method suffixes because different models/endpoints
    // may support different RPC names.
    const methodCandidates = ['generateContent', 'generate', 'generateText'];

    // Try several payload shapes to accommodate differences between API versions:
    const payloadVariants = [
      // v1beta style used earlier
      { contents: chatHistory },
      // simple prompt wrapper
      { prompt: { text: prompt } },
      // direct input string
      { input: prompt },
      // messages style
      { messages: [{ role: 'user', content: prompt }] },
      // instances style (some APIs accept instances)
      { instances: [prompt] }
    ];

    const tryGenerateWithModel = async (modelName: string) : Promise<{ response: Response, usedMethod: string, usedPayload: any } | null> => {
      let lastResp: Response | null = null;

      // If modelName looks like a 2.5 variant, try the v1 generate endpoint first
      const is25 = /2\.5/.test(modelName);
      if (is25) {
        const v1Payloads = [
          { input: [{ text: prompt }] },
          { input: prompt },
          { prompt: prompt }
        ];
        for (const p of v1Payloads) {
          const resp = await callGenerateWithMethod(modelName, 'generate', p, true);
          lastResp = resp;
          if (resp.ok || resp.status !== 404) return { response: resp, usedMethod: 'generate', usedPayload: p };
        }
      }

      for (const m of methodCandidates) {
        for (const bodyVariant of payloadVariants) {
          const resp = await callGenerateWithMethod(modelName, m, bodyVariant, false);
          lastResp = resp;
          // If it's ok, or it's an error other than 404, return it for handling
          if (resp.ok || resp.status !== 404) {
            return { response: resp, usedMethod: m, usedPayload: bodyVariant };
          }
          // otherwise (404) try next payload/method
        }
      }
      return lastResp ? { response: lastResp, usedMethod: methodCandidates[methodCandidates.length - 1], usedPayload: payloadVariants[0] } : null;
    };

    let genResult = await tryGenerateWithModel(modelToUse);
    if (!genResult) {
      return NextResponse.json({ error: 'Failed to call generation endpoint' }, { status: 500 });
    }
    let { response: genResponse, usedMethod } = genResult;

    if (!genResponse.ok) {
      const errorText = await genResponse.text();
      console.error('Gemini API Error:', errorText);

      // If the preferred model wasn't found, try to discover a supported model.
      if (genResponse.status === 404) {
        try {
          const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
          const listRes = await fetch(listUrl);
          const listText = await listRes.text();
          console.info('ListModels response:', listText);
          if (listRes.ok) {
            const listJson = JSON.parse(listText);
            const models = Array.isArray(listJson.models) ? listJson.models : listJson;

            // Try to find a model that advertises generateContent support. We tolerate
            // several possible shapes because the exact API can vary.
            let found: string | null = null;
            if (Array.isArray(models)) {
              for (const m of models) {
                let name = m.name || m.model || (typeof m === 'string' ? m : undefined);
                // Normalize resource name like "models/gemini-2.5-flash" -> "gemini-2.5-flash"
                if (typeof name === 'string' && name.startsWith('models/')) {
                  name = name.split('/').pop();
                }
                const methods = m.supportedMethods || m.methods || m.supported_features || [];
                const methodsStr = JSON.stringify(methods || m);
                if (name && (methodsStr.includes('generateContent') || /generateContent|generateText|generate/.test(methodsStr) || /gemini-2.5/.test(name))) {
                  found = name;
                  break;
                }
              }
            }

            if (found) {
              console.info('Using discovered model:', found);
              modelToUse = found;
              const retry = await tryGenerateWithModel(modelToUse);
              if (!retry) return NextResponse.json({ error: 'Failed to call generation endpoint' }, { status: 500 });
              genResponse = retry.response;
              usedMethod = retry.usedMethod;
            } else {
              // Fallback to a known-working older model
              modelToUse = 'gemini-1.5-flash-latest';
              console.info('Falling back to model:', modelToUse);
              const retry = await tryGenerateWithModel(modelToUse);
              if (!retry) return NextResponse.json({ error: 'Failed to call generation endpoint' }, { status: 500 });
              genResponse = retry.response;
              usedMethod = retry.usedMethod;
            }
          } else {
            // unable to list models, fallback
            modelToUse = 'gemini-1.5-flash-latest';
            const retry = await tryGenerateWithModel(modelToUse);
            if (!retry) return NextResponse.json({ error: 'Failed to call generation endpoint' }, { status: 500 });
            genResponse = retry.response;
            usedMethod = retry.usedMethod;
          }
        } catch (e) {
          console.error('ListModels failed:', e);
          // try fallback
          modelToUse = 'gemini-1.5-flash-latest';
          const retry = await tryGenerateWithModel(modelToUse);
          if (!retry) return NextResponse.json({ error: 'Failed to call generation endpoint' }, { status: 500 });
          genResponse = retry.response;
          usedMethod = retry.usedMethod;
        }
      } else {
        // For other non-OK statuses just return the error as before.
        return NextResponse.json({ error: `API Error: ${genResponse.statusText}`, details: errorText }, { status: genResponse.status });
      }
    }

    if (!genResponse.ok) {
      const errorText = await genResponse.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ error: `API Error: ${genResponse.statusText}`, details: errorText }, { status: genResponse.status });
    }

    const result = await genResponse.json();

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {

        const text = result.candidates[0].content.parts[0].text;
        const response = { text };
        set(theme, response);
        return NextResponse.json(response);
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
