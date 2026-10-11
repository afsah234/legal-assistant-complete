// Builds a safe, readable download name such as "nda-draft-2026-10-10.pdf".
// It uses the document TYPE only, so no personal names end up in filenames.
export function buildPdfFilename(documentType: string, date = new Date()): string {
  const slug = documentType.toLowerCase().replace(/[^a-z0-9-]/g, "") || "document";
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${slug}-draft-${stamp}.pdf`;
}
