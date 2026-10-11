// The single source of truth for which document types the app supports.
// To add a new document type later, add one entry here — the dashboard and
// the form both read from this list.

export type DocumentTypeId = "nda" | "service-agreement" | "business-letter";

export interface DocumentTypeConfig {
  id: DocumentTypeId;
  title: string;
  description: string;
  partyALabel: string;
  partyBLabel: string;
  purposeLabel: string;
  purposePlaceholder: string;
  // Agreements start with a title line (e.g. NON-DISCLOSURE AGREEMENT).
  // Letters start with the sender's details, so they have no title line.
  pdfTitleFromFirstLine: boolean;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    id: "nda",
    title: "Non-Disclosure Agreement (NDA)",
    description:
      "Protect confidential information shared between two parties.",
    partyALabel: "Disclosing party",
    partyBLabel: "Receiving party",
    purposeLabel: "Purpose of sharing information",
    purposePlaceholder:
      "e.g. Evaluating a possible software partnership between the two companies",
    pdfTitleFromFirstLine: true,
  },
  {
    id: "service-agreement",
    title: "Service Agreement",
    description:
      "Set out the work, payment and responsibilities between a client and a provider.",
    partyALabel: "Client",
    partyBLabel: "Service provider",
    purposeLabel: "Services to be provided",
    purposePlaceholder:
      "e.g. Design and delivery of a 5-page marketing website within 6 weeks",
    pdfTitleFromFirstLine: true,
  },
  {
    id: "business-letter",
    title: "Formal Business Letter",
    description:
      "A professional letter such as a notice, request or formal complaint.",
    partyALabel: "Sender",
    partyBLabel: "Recipient",
    purposeLabel: "Purpose of the letter",
    purposePlaceholder:
      "e.g. Request for payment of an overdue invoice dated 1 March",
    pdfTitleFromFirstLine: false,
  },
];

export function getDocumentType(id: string): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPES.find((d) => d.id === id);
}
