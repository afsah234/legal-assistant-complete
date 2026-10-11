import { NextResponse } from "next/server";
import { generateDraftText } from "@/lib/ai/gemini";
import {
  DRAFT_LABEL,
  buildSystemInstruction,
  buildUserPrompt,
  cleanDraft,
} from "@/lib/ai/prompts";
import { getDocumentType } from "@/lib/documents/registry";
import { DraftError } from "@/lib/errors";
import { fail, getClientIp } from "@/lib/http";
import { checkRateLimit } from "@/lib/rateLimit";
import { draftRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

// Legit requests are ~4 KB at most. Anything bigger is rejected up front.
const MAX_BODY_CHARS = 10_000;

export async function POST(request: Request) {
  // 1. Basic abuse protection (per visitor IP).
  const configuredLimit = Number(process.env.MAX_REQUESTS_PER_MINUTE);
  const limit =
    Number.isFinite(configuredLimit) && configuredLimit >= 1 ? configuredLimit : 5;
  const rate = checkRateLimit(`gen:${getClientIp(request)}`, limit);
  if (!rate.ok) {
    return fail(
      `Too many requests. Please wait ${rate.retryAfterSeconds} seconds and try again.`,
      429,
      { retryAfter: rate.retryAfterSeconds }
    );
  }

  // 2. Limit request size BEFORE parsing anything.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_CHARS * 4) {
    return fail("Your request is too large.", 413);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return fail("Your request is too large.", 413);
  }

  // 3. Parse and validate (same rules as the browser form).
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail("The request was not valid. Please refresh the page and try again.", 400);
  }

  const parsed = draftRequestSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail("Please fix the highlighted fields.", 400, { fieldErrors });
  }

  const { documentType, ...values } = parsed.data;
  const config = getDocumentType(documentType);
  if (!config) return fail("Unknown document type.", 400);

  // 4. Ask Gemini (server-side only).
  try {
    const text = await generateDraftText(
      buildSystemInstruction(),
      buildUserPrompt(config, values)
    );
    const draft = `${DRAFT_LABEL}\n\n${cleanDraft(text)}`;
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof DraftError) return fail(err.message, err.status);
    console.error("[generate] unexpected error:", err instanceof Error ? err.name : "unknown");
    return fail("Something went wrong on the server. Please try again.", 500);
  }
}
