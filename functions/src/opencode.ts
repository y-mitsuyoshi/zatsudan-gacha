import {randomUUID} from "crypto";

const API_URL = "https://opencode.ai/inference/go/openai/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-v4.1-flash";
const TIMEOUT_MS = 25_000;
const USER_AGENT = "zatsudan-gacha/0.1.0";

export class OpenCodeGoError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("OpenCode Go request failed");
    this.name = "OpenCodeGoError";
    this.status = status;
  }
}

function extractText(content: unknown): string | null {
  if (typeof content === "string") {
    const text = content.trim();
    return text.length > 0 ? text : null;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && typeof (part as {text?: unknown}).text === "string") {
          return (part as {text: string}).text;
        }
        return "";
      })
      .join("")
      .trim();
    return text.length > 0 ? text : null;
  }

  return null;
}

function getMessageContent(result: unknown): unknown {
  if (!result || typeof result !== "object") {
    return null;
  }
  const choices = (result as {choices?: unknown}).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return null;
  }
  const message = (firstChoice as {message?: unknown}).message;
  if (!message || typeof message !== "object") {
    return null;
  }
  return (message as {content?: unknown}).content;
}

export async function generateOpenCodeGoText(options: {
  apiKey: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": USER_AGENT,
      "x-opencode-session": randomUUID()
    },
    body: JSON.stringify({
      model: process.env.OPENCODE_GO_MODEL || DEFAULT_MODEL,
      messages: [
        {role: "system", content: options.system},
        {role: "user", content: options.user}
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: false
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new OpenCodeGoError(response.status);
  }

  const text = extractText(getMessageContent(await response.json()));
  if (!text) {
    throw new Error("Invalid AI response");
  }

  return text;
}
