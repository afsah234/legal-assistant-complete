// The ONLY file that talks to Gemini. It runs on the server only (it is
// imported by an API route), so the API key never reaches the browser.

import { GoogleGenAI } from "@google/genai";
import { DraftError } from "@/lib/errors";

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_TOKENS = 8192;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new DraftError("The AI took too long to respond. Please try again.", 504)
        ),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// Turn any Gemini/network failure into a friendly DraftError.
function toDraftError(err: unknown): DraftError {
  if (err instanceof DraftError) return err;

  const e = err as { status?: unknown; message?: unknown } | null;
  const status = typeof e?.status === "number" ? e.status : undefined;
  const message =
    typeof e?.message === "string" ? e.message : "Unknown error";

  // Log technical details on the server only. Never log the document content.
  console.error("[gemini] request failed:", status ?? "no-status", message.slice(0, 300));

  if (status === 429 || message.includes("RESOURCE_EXHAUSTED")) {
    return new DraftError(
      "The free AI usage limit has been reached for now. Please wait a minute or two and try again.",
      429
    );
  }
  if (
    status === 401 ||
    status === 403 ||
    message.includes("API key not valid") ||
    message.includes("API_KEY_INVALID")
  ) {
    return new DraftError(
      "The AI service is not set up correctly on the server. Please contact the site owner.",
      502
    );
  }
  if (status === 404) {
    return new DraftError(
      "The configured AI model could not be found. Please contact the site owner.",
      502
    );
  }
  if (status === 500 || status === 503 || status === 504) {
    return new DraftError(
      "The AI service is busy right now. Please try again in a moment.",
      503
    );
  }
  if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ECONNRESET")) {
    return new DraftError(
      "The server could not reach the AI service. Please try again shortly.",
      502
    );
  }
  return new DraftError(
    "The AI service could not complete this request. Please try again.",
    502
  );
}

export async function generateDraftText(
  systemInstruction: string,
  prompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey || !model) {
    console.error("[gemini] GEMINI_API_KEY or GEMINI_MODEL is missing in .env.local");
    throw new DraftError(
      "AI drafting is not configured on the server yet. Please contact the site owner.",
      500
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  let response;
  try {
    response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction, maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
      REQUEST_TIMEOUT_MS
    );
  } catch (err) {
    throw toDraftError(err);
  }

  if (response.promptFeedback?.blockReason) {
    throw new DraftError(
      "The AI could not draft this request. Please change the details and try again.",
      422
    );
  }

  const finishReason = response.candidates?.[0]?.finishReason
    ? String(response.candidates[0].finishReason)
    : undefined;
  const text = response.text?.trim();

  if (finishReason === "MAX_TOKENS") {
    throw new DraftError(
      "The draft was too long and got cut off. Try shorter details and generate again.",
      422
    );
  }
  if (!text) {
    if (finishReason && finishReason !== "STOP") {
      throw new DraftError(
        "The AI could not draft this request. Please change the details and try again.",
        422
      );
    }
    throw new DraftError(
      "The AI returned an empty draft. Please try again.",
      502
    );
  }

  return text;
}
