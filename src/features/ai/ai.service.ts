import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

const apiKey = process.env.GEMINI_API_KEY;
const openAIKey = process.env.OPENROUTER_API_KEY;

// Using Gemini 2.5 Flash for speed and multimodal support
const MODEL_NAME = "gemini-2.5-flash";

function getModel() {
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

export type AIQuotaError = {
  type: "RPM" | "TPM" | "DAILY" | "UNKNOWN";
  retryAfterSeconds?: number;
  message: string;
};

export class GeminiServiceError extends Error {
  quota?: AIQuotaError;
  status?: number;

  constructor(message: string, status?: number, quota?: AIQuotaError) {
    super(message);
    this.name = "GeminiServiceError";
    this.status = status;
    this.quota = quota;
  }
}

function handleGeminiError(error: any): never {
  logger.error({ status: error.status, message: error.message }, "Gemini API Error");

  if (error.status === 429) {
    let quotaInfo: AIQuotaError = {
      type: "UNKNOWN",
      message: "API rate limit reached. Please try again in a moment."
    };

    const retryInfo = error.errorDetails?.find((d: any) => d["@type"]?.includes("RetryInfo"));
    if (retryInfo?.retryDelay) {
      quotaInfo.retryAfterSeconds = parseInt(retryInfo.retryDelay);
    }

    const quotaFailure = error.errorDetails?.find((d: any) => d["@type"]?.includes("QuotaFailure"));
    if (quotaFailure?.violations) {
      const violation = quotaFailure.violations[0];
      const quotaId = violation.quotaId || "";

      if (quotaId.includes("PerMinute")) {
        quotaInfo.type = "RPM";
        quotaInfo.message = `AI Rate limit reached. Please wait ${quotaInfo.retryAfterSeconds || 30} seconds before retrying.`;
      } else if (quotaId.includes("PerDay")) {
        quotaInfo.type = "DAILY";
        quotaInfo.message = "Gemini daily free limit reached. Attempting fallback to secondary AI...";
      } else if (quotaId.includes("InputTokens") || quotaId.includes("OutputTokens")) {
        quotaInfo.type = "TPM";
        quotaInfo.message = "AI Token limit reached. Attempting fallback to secondary AI...";
      }
    }

    throw new GeminiServiceError(quotaInfo.message, 429, quotaInfo);
  }

  throw new GeminiServiceError(error.message || "An unexpected AI service error occurred.", error.status || 500);
}

function isGeminiNetworkError(error: any) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("fetch failed") || message.includes("generativelanguage.googleapis.com");
}



export async function callOpenRouter(prompt: string, buffer?: Buffer, mimeType?: string): Promise<string> {

  if (!openAIKey) throw new Error("OPENROUTER_API_KEY not configured");

  logger.info({ message: "Attempting OpenRouter fallback..." });

  // Helper to POST to OpenRouter with a timeout
  async function orPost(model: string, msgs: any[]): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000); // 20s timeout per model
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${openAIKey}`,
          "HTTP-Referer": "https://github.com//LazyMe",
          "X-Title": "LazyMe",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model, messages: msgs, max_tokens: 2000, temperature: 0.1 })
      });
      clearTimeout(timer);
      if (!r.ok) {
        const err = await r.json();
        logger.warn({
          message: `OpenRouter ${model} failed`,
          error: err?.error?.message?.slice(0, 80),
          status: r.status
        });
        return null;
      }
      const d = await r.json();
      return d.choices[0].message.content;
    } catch (e: any) {
      logger.warn({
        message: `OpenRouter ${model} error`,
        messageDetails: e.message?.slice(0, 60)
      });
      return null;
    }
  }

  // Build content based on input type
  let content: any[];
  if (buffer && mimeType && mimeType.startsWith("image/")) {
    content = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } }
    ];
  } else if (buffer && mimeType === "application/pdf") {
    content = [
      { type: "file", file: { filename: "resume.pdf", file_data: `data:application/pdf;base64,${buffer.toString("base64")}` } },
      { type: "text", text: prompt }
    ];
  } else {
    content = [{ type: "text", text: prompt }];
  }

  const isTextOnly = !buffer || content.every((c: any) => c.type === "text");
  const textPrompt = content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");

  // 1. Try paid model (gpt-4o-mini) — works if account has credits
  const paid = await orPost("openai/gpt-4o-mini", [{ role: "user", content }]);
  if (paid) {
    logger.info({ message: "OpenRouter gpt-4o-mini successful" });
    return paid;
  }

  // 2. Try free vision models if we have image content
  if (!isTextOnly) {
    const visionModels = [
      "google/gemma-4-26b-a4b-it:free",
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-nano-12b-v2-vl:free",
    ];
    for (const vm of visionModels) {
      const result = await orPost(vm, [{ role: "user", content }]);
      if (result) {
        logger.info({ message: `OpenRouter ${vm} successful` });
        return result;
      }
    }
  }

  // 3. Fall back to free text-only models using just the text portion of the prompt
  const freeTextModels = [
    "deepseek/deepseek-v4-flash:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
  ];
  for (const fm of freeTextModels) {
    const result = await orPost(fm, [{ role: "user", content: textPrompt }]);
    if (result) {
      logger.info({ message: `OpenRouter ${fm} successful` });
      return result;
    }
  }

  throw new Error("All OpenRouter models failed or are rate-limited.");
}

export async function generateText(prompt: string): Promise<string> {
  if (process.env.COHERE_API_KEY) {
    const cohereResult = await callCohere(prompt);
    if (cohereResult) return cohereResult;
  }

  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info({
        message: "Calling Gemini text model",
        promptLength: prompt.length,
        attempt
      });
      const result = await getModel().generateContent(prompt);
      logger.info({ message: "Gemini result received, checking response" });
      const response = await result.response;
      logger.info({
        message: "Gemini response text length",
        length: response.text().length
      });
      return response.text();
    } catch (error: any) {
      const isRetryable = error.status === 429 || error.status === 503 || isGeminiNetworkError(error);
      logger.warn({
        message: "Gemini text generation failed",
        status: error.status || "network",
        attempt,
        messageDetails: String(error.message || "").slice(0, 180)
      });

      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 2000;
        logger.info({ message: `Retrying Gemini in ${delay}ms`, attempt });
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (isRetryable) {
        try {
          logger.info({ message: "Trying OpenRouter fallback" });
          return await callOpenRouter(prompt);
        } catch (fallbackError: any) {
          logger.error({
            message: "OpenRouter fallback failed",
            error: fallbackError.message
          });
          const finalError = new GeminiServiceError(
            isGeminiNetworkError(error)
              ? "AI service is temporarily unreachable. Please try again in a moment."
              : "All AI services are currently at capacity. Please try again in a few minutes.",
            error.status || 503,
            { type: "UNKNOWN", message: "All AI services exhausted or unreachable" }
          );
          throw finalError;
        }
      }
      return handleGeminiError(error);
    }
  }
  throw new GeminiServiceError("AI service failed after all retries", 503);
}

export async function generateTextFromMultiModal(
  prompt: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    const result = await getModel().generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mimeType
        }
      }
    ]);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    // Try Ollama/OpenRouter fallback on quota, rate-limit, or Gemini network errors.
    if (error.status === 429 || error instanceof GeminiServiceError || isGeminiNetworkError(error)) {
      try {
        return await callOpenRouter(prompt, buffer, mimeType);
      } catch (fallbackError: any) {
        logger.error({
          message: "Ollama/OpenRouter fallback failed",
          error: fallbackError.message
        });
        throw new GeminiServiceError(
          "All AI services are currently unavailable. Please try again in a few minutes.",
          error.status || 503,
          { type: "UNKNOWN", message: "All AI services exhausted or unreachable" }
        );
      }
    }
    return handleGeminiError(error);
  }
}

// ── User-key-aware generation ────────────────────────────────

/**
 * Calls Gemini using a user-provided API key.
 */
async function callGeminiWithUserKey(prompt: string, userApiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(userApiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * Calls OpenAI API (or compatible) using a user-provided API key.
 */
async function callOpenAIWithUserKey(prompt: string, userApiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Authorization": `Bearer ${userApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.1,
    }),
  });
  clearTimeout(timer);

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${err?.error?.message || r.statusText}`);
  }

  const data = await r.json();
  return data.choices[0].message.content;
}

/**
 * Calls OpenRouter using a user-provided API key.
 */
async function callOpenRouterWithUserKey(prompt: string, userApiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Authorization": `Bearer ${userApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.1,
    }),
  });
  clearTimeout(timer);

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`OpenRouter error: ${err?.error?.message || r.statusText}`);
  }

  const data = await r.json();
  return data.choices[0].message.content;
}

export async function callCohere(prompt: string): Promise<string | null> {
  const currentCohereKey = process.env.COHERE_API_KEY;
  if (!currentCohereKey) return null;
  logger.info({ message: "Attempting Cohere API..." });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const r = await fetch("https://api.cohere.com/v1/chat", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${currentCohereKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "command-r-plus-08-2024",
        message: prompt,
        temperature: 0.1
      })
    });
    clearTimeout(timer);
    if (!r.ok) {
      const err = await r.json();
      logger.warn({ message: "Cohere failed", error: err?.message, status: r.status });
      return null;
    }
    const d = await r.json();
    return d.text;
  } catch (e: any) {
    logger.warn({ message: "Cohere error", messageDetails: e.message });
    return null;
  }
}

async function callCohereWithUserKey(prompt: string, userApiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  const r = await fetch("https://api.cohere.com/v1/chat", {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Authorization": `Bearer ${userApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "command-r-plus-08-2024",
      message: prompt,
      temperature: 0.1,
    }),
  });
  clearTimeout(timer);

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`Cohere error: ${err?.message || r.statusText}`);
  }

  const data = await r.json();
  return data.text;
}

/**
 * Generate text using a user's own API key.
 * Tries the specified provider. Returns null if the key is invalid or fails.
 */
export async function generateWithUserKey(
  prompt: string,
  provider: string,
  apiKey: string
): Promise<string | null> {
  try {
    switch (provider) {
      case "gemini":
        return await callGeminiWithUserKey(prompt, apiKey);
      case "openai":
        return await callOpenAIWithUserKey(prompt, apiKey);
      case "openrouter":
        return await callOpenRouterWithUserKey(prompt, apiKey);
      case "cohere":
        return await callCohereWithUserKey(prompt, apiKey);
      default:
        logger.warn({ provider }, "Unknown provider for user key");
        return null;
    }
  } catch (error: any) {
    logger.warn({
      message: `User key (${provider}) failed`,
      error: error.message?.slice(0, 100),
    });
    return null;
  }
}

/**
 * User-aware AI text generation.
 * Priority: User's own API keys (free) → Platform keys (costs credits) → Ollama (free)
 * 
 * @param userId - The user's ID
 * @param prompt - The prompt to generate from
 * @param operation - The operation type (for credit costing)
 * @param userKeys - Optional array of user's decrypted API keys [{ provider, key }]
 */
export async function generateTextForUser(
  prompt: string,
  userKeys?: Array<{ provider: string; key: string }>
): Promise<string> {
  // 1. Try user's own API keys first (free, no credit cost)
  if (userKeys && userKeys.length > 0) {
    for (const { provider, key } of userKeys) {
      const result = await generateWithUserKey(prompt, provider, key);
      if (result) {
        logger.info({ provider }, "Generated using user's own API key");
        return result;
      }
    }
    logger.warn("All user keys failed, falling back to platform");
  }

  // 2. Fall back to platform keys (credits will be handled by the API route)
  return generateText(prompt);
}

/**
 * Legacy support for image extraction
 * @deprecated Use generateTextFromMultiModal instead
 */
export async function extractTextFromImage(imageBuffer: Buffer, mimeType: string = "image/png"): Promise<string> {
  return generateTextFromMultiModal(
    "Extract all the text content from this image. Return only the extracted text, preserving line breaks and formatting as much as possible.",
    imageBuffer,
    mimeType
  );
}
