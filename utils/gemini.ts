import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const openAIKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) throw new Error("GEMINI_API_KEY not set");

const genAI = new GoogleGenerativeAI(apiKey);

// Using Gemini 2.0 Flash for speed and multimodal support
const MODEL_NAME = "gemini-2.0-flash";
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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
  console.error("Gemini API Error:", error.status, error.message);

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

async function callOpenRouter(prompt: string, buffer?: Buffer, mimeType?: string): Promise<string> {
  if (!openAIKey) throw new Error("OPENROUTER_API_KEY not configured");

  console.log("Attempting OpenRouter fallback...");

  const messages: any[] = [{ role: "user", content: prompt }];

  // OpenRouter supports multimodal but only for images in gpt-4o-mini
  if (buffer && mimeType && mimeType.startsWith("image/")) {
    messages[0].content = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } }
    ];
  } else if (buffer && mimeType) {
    console.warn(`OpenRouter fallback: Skipping multimodal for unsupported type: ${mimeType}`);
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAIKey}`,
      "HTTP-Referer": "https://github.com/devTejasMokarkar/LazyMe",
      "X-Title": "LazyMe",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: messages,
      max_tokens: 2048,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error("Fallback AI service also failed: " + (error.error?.message || response.statusText));
  }

  const data = await response.json();
  console.log("OpenRouter fallback successful");
  return data.choices[0].message.content;
}

export async function generateText(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    // If it's a quota error, try OpenAI fallback
    if (error.status === 429) {
      try {
        return await callOpenRouter(prompt);
      } catch (fallbackError: any) {
        console.error("OpenRouter fallback failed:", fallbackError.message);
        const finalError = new GeminiServiceError(
          "All AI services are currently at capacity. Please try again in a few minutes.",
          429,
          { type: "DAILY", message: "All AI services exhausted" }
        );
        throw finalError;
      }
    }
    return handleGeminiError(error);
  }
}

export async function generateTextFromMultiModal(
  prompt: string, 
  buffer: Buffer, 
  mimeType: string
): Promise<string> {
  try {
    const result = await model.generateContent([
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
    // If it's a quota error, try OpenAI fallback
    if (error.status === 429) {
      try {
        return await callOpenRouter(prompt, buffer, mimeType);
      } catch (fallbackError: any) {
        console.error("OpenRouter fallback failed:", fallbackError.message);
        const finalError = new GeminiServiceError(
          "All AI services are currently at capacity. Please try again in a few minutes.",
          429,
          { type: "DAILY", message: "All AI services exhausted" }
        );
        throw finalError;
      }
    }
    return handleGeminiError(error);
  }
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
