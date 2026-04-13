import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
const cors = require("cors");

// Gemini APIキーをシークレットとして定義
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// CORS設定
const corsHandler = cors({
  origin: [
    "https://zatsudan-gacha.app",
    "https://zatsudan-gacha.web.app",
    "https://zatsudan-gacha.firebaseapp.com",
    "http://localhost:3000", // 開発環境用
  ],
});

// シンプルなインメモリキャッシュ
const cache = new Map<string, {data: any; timestamp: number}>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1日

// レート制限
const requestCounts = new Map<string, {count: number; resetTime: number}>();
const RATE_LIMIT = 20; // 1日に20回
const RATE_WINDOW = 24 * 60 * 60 * 1000; // 1日

// 追加：攻撃対策の強化
const suspiciousPatterns = new Map<string, number>();
const blockedIPs = new Set<string>(); // 悪質IPのブロックリスト

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  
  // ブロックリストチェック
  if (blockedIPs.has(ip)) {
    logger.warn(`Blocked IP attempted access: ${ip}`);
    return true;
  }
  
  const userRequests = requestCounts.get(ip);

  // 不審なパターンのチェック（攻撃対策強化）
  const currentCount = suspiciousPatterns.get(ip) || 0;
  suspiciousPatterns.set(ip, currentCount + 1);
  setTimeout(() => suspiciousPatterns.delete(ip), 60 * 1000); // 1分でリセット

  // 攻撃パターンの検出と自動ブロック
  if (currentCount > 10) { // 1分間で10回以上は悪質
    logger.error(`Malicious activity detected from IP: ${ip}. Adding to blocklist.`);
    blockedIPs.add(ip);
    // 24時間後にブロック解除
    setTimeout(() => blockedIPs.delete(ip), 24 * 60 * 60 * 1000);
    return true;
  }

  if (!userRequests || now > userRequests.resetTime) {
    requestCounts.set(ip, {count: 1, resetTime: now + RATE_WINDOW});
    return false;
  }

  if (userRequests.count >= RATE_LIMIT) {
    return true;
  }

  userRequests.count++;
  return false;
}

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function setCache(key: string, data: any): void {
  cache.set(key, {data, timestamp: Date.now()});
}

// Export Shachiku Jinro Functions
import * as shachikuJinro from "./shachiku-jinro";
export const createRoom = shachikuJinro.createRoom;
export const joinRoom = shachikuJinro.joinRoom;
export const startGame = shachikuJinro.startGame;
export const submitAction = shachikuJinro.submitAction;
export const nextPhase = shachikuJinro.nextPhase;

export const gemini = onRequest(
  {
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 10,
    secrets: [geminiApiKey], // シークレットを明示的に指定
  },
  (request, response) => {
    return new Promise<void>((resolve) => {
      corsHandler(request, response, async () => {
        try {
          // POST メソッドのみ許可
          if (request.method !== "POST") {
            response.status(405).json({error: "Method not allowed"});
            resolve();
            return;
          }

          // クライアントIPを取得
          const clientIP = request.ip || "unknown";

          // レート制限チェック
          if (isRateLimited(clientIP)) {
            logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
            response.status(429).json({error: "Too Many Requests"});
            resolve();
            return;
          }

          // リクエストボディの検証
          const {theme} = request.body;
          if (!theme || typeof theme !== "string") {
            response.status(400).json({
              error: "Theme is required and must be a string",
            });
            resolve();
            return;
          }

          // キャッシュチェック
          const cached = getFromCache(theme);
          if (cached) {
            logger.info(`Cache HIT for theme: ${theme}`);
            response.json(cached);
            resolve();
            return;
          }

          logger.info(`Cache MISS for theme: ${theme}`);

          // シークレットからAPIキーを取得（Firebase Functions v2）
          const apiKey = geminiApiKey.value();
          if (!apiKey) {
            logger.error("GEMINI_API_KEY is not configured");
            response.status(500).json({error: "API key not configured"});
            resolve();
            return;
          }

          // Gemini APIへのリクエスト
          const prompt = `「${theme}」という雑談テーマについて、会話がもっと面白く広がるような、ユニークで深掘りできる質問を3つ提案してください。形式は箇条書きで、質問のみを返してください。`;

          const chatHistory = [{role: "user", parts: [{text: prompt}]}];
          const payload = {contents: chatHistory};

          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

          const apiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
          });

          if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            logger.error("Gemini API request failed:", errorBody);
            throw new Error(`API Error: ${apiResponse.statusText}`);
          }

          const result = await apiResponse.json();

          if (
            result.candidates &&
            result.candidates.length > 0 &&
            result.candidates[0].content &&
            result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0
          ) {
            const text = result.candidates[0].content.parts[0].text;
            const responseData = {text};

            // キャッシュに保存
            setCache(theme, responseData);

            logger.info(`Successfully generated response for theme: ${theme}`);
            response.json(responseData);
          } else {
            logger.error("Invalid response structure from Gemini API:", result);
            throw new Error("AIからの有効な回答がありませんでした。");
          }
        } catch (error) {
          logger.error("Gemini API call failed:", error);
          if (error instanceof Error) {
            response.status(500).json({error: error.message});
          } else {
            response.status(500).json({error: "An unknown error occurred"});
          }
        }
        resolve();
      });
    });
  }
);

export const excuseGenerator = onRequest(
  {
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 10,
    secrets: [geminiApiKey],
  },
  (request, response) => {
    return new Promise<void>((resolve) => {
      corsHandler(request, response, async () => {
        try {
          if (request.method !== "POST") {
            response.status(405).json({error: "Method not allowed"});
            resolve();
            return;
          }

          const clientIP = request.ip || "unknown";

          if (isRateLimited(clientIP)) {
            logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
            response.status(429).json({error: "Too Many Requests"});
            resolve();
            return;
          }

          const {situation, tone, details} = request.body;
          if (!situation || !tone) {
            response.status(400).json({
              error: "Situation and tone are required",
            });
            resolve();
            return;
          }

          const apiKey = geminiApiKey.value();
          if (!apiKey) {
            logger.error("GEMINI_API_KEY is not configured");
            response.status(500).json({error: "API key not configured"});
            resolve();
            return;
          }

          const prompt = `あなたは「究極の言い訳ジェネレーター」です。以下の条件に基づいて、メッセージアプリ等でそのまま送信できる最高に言い訳がましい、あるいは面白いテキストを生成してください。

【条件】
・シチュエーション: ${situation}
・トーン: ${tone}
・詳細情報: ${details || "特になし"}

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

          const chatHistory = [{role: "user", parts: [{text: prompt}]}];
          const payload = {contents: chatHistory};

          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

          const apiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
          });

          if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            logger.error("Gemini API request failed:", errorBody);
            throw new Error(`API Error: ${apiResponse.statusText}`);
          }

          const result = await apiResponse.json();

          if (
            result.candidates &&
            result.candidates.length > 0 &&
            result.candidates[0].content &&
            result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0
          ) {
            const text = result.candidates[0].content.parts[0].text;
            response.json({excuse: text});
          } else {
            logger.error("Invalid response structure from Gemini API:", result);
            throw new Error("AIからの有効な回答がありませんでした。");
          }
        } catch (error) {
          logger.error("Gemini API call failed:", error);
          if (error instanceof Error) {
            response.status(500).json({error: error.message});
          } else {
            response.status(500).json({error: "An unknown error occurred"});
          }
        }
        resolve();
      });
    });
  }
);
