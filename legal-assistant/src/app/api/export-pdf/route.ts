import { getDocumentType } from "@/lib/documents/registry";
import { fail, getClientIp } from "@/lib/http";
import { buildPdfFilename } from "@/lib/pdf/filename";
import { PdfTextError, generatePdf } from "@/lib/pdf/generatePdf";
import { checkRateLimit } from "@/lib/rateLimit";
import { LIMITS, pdfRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

// Text can be up to 50,000 characters; allow extra room for JSON escaping.
const MAX_BODY_CHARS = LIMITS.documentText * 3;

export async function POST(request: Request) {
  const rate = checkRateLimit(`pdf:${getClientIp(request)}`, 20);
  if (!rate.ok) {
    return fail(
      `Too many exports. Please wait ${rate.retryAfterSeconds} seconds and try again.`,
      429,
      { retryAfter: rate.retryAfterSeconds }
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_CHARS * 4) {
    return fail("The document is too large to export.", 413);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return fail("The document is too large to export.", 413);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail("The request was not valid. Please refresh the page and try again.", 400);
  }

  const parsed = pdfRequestSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "The document could not be exported.", 400);
  }

  const { documentType, text } = parsed.data;
  const config = getDocumentType(documentType);
  if (!config) return fail("Unknown document type.", 400);

  try {
    const bytes = await generatePdf({
      text,
      documentTitle: config.title,
      titleFromFirstLine: config.pdfTitleFromFirstLine,
    });
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildPdfFilename(documentType)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof PdfTextError) {
      const shown = err.unsupported.slice(0, 8).join(" ");
      return fail(
        `PDF export currently supports English (Latin) text only. These characters cannot be printed: ${shown}. Please edit or replace them and try again.`,
        422
      );
    }
    console.error("[export-pdf] failed:", err instanceof Error ? err.name : "unknown");
    return fail("The PDF could not be created. Please try again.", 500);
  }
}
