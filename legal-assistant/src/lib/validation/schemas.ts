import { z } from "zod";
import { getDocumentType } from "@/lib/documents/registry";

// Size limits live here so the browser form AND the server API route use
// exactly the same numbers.
export const LIMITS = {
  name: 120,
  jurisdiction: 120,
  purpose: 1000,
  extraDetails: 2000,
  documentText: 50_000,
} as const;

export const draftFormSchema = z.object({
  partyA: z
    .string()
    .trim()
    .min(1, "This name is required.")
    .max(LIMITS.name, `Keep this under ${LIMITS.name} characters.`),
  partyB: z
    .string()
    .trim()
    .min(1, "This name is required.")
    .max(LIMITS.name, `Keep this under ${LIMITS.name} characters.`),
  jurisdiction: z
    .string()
    .trim()
    .min(2, "Please enter a country, state or province.")
    .max(LIMITS.jurisdiction, `Keep this under ${LIMITS.jurisdiction} characters.`),
  purpose: z
    .string()
    .trim()
    .min(10, "Please describe the purpose in at least a short sentence.")
    .max(LIMITS.purpose, `Keep this under ${LIMITS.purpose} characters.`),
  extraDetails: z
    .string()
    .trim()
    .max(LIMITS.extraDetails, `Keep this under ${LIMITS.extraDetails} characters.`),
});

// What the browser sends to /api/generate: the form values + which document.
export const draftRequestSchema = draftFormSchema.extend({
  documentType: z
    .string()
    .refine((v) => getDocumentType(v) !== undefined, "Unknown document type."),
});

// What the browser sends to /api/export-pdf: the CURRENT edited text.
export const pdfRequestSchema = z.object({
  documentType: z
    .string()
    .refine((v) => getDocumentType(v) !== undefined, "Unknown document type."),
  text: z
    .string()
    .max(LIMITS.documentText, `The document is too long (max ${LIMITS.documentText} characters).`)
    .refine((t) => t.trim().length > 0, "The document is empty."),
});

export type DraftFormValues = z.infer<typeof draftFormSchema>;
export type DraftFormField = keyof DraftFormValues;
