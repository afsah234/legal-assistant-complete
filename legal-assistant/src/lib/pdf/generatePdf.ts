// Builds the PDF on the server with pdf-lib (pure JavaScript, no browser
// needed). It uses the built-in Times fonts, so no font files are required.
// Built-in fonts support English / Western European (Latin) text only.

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { parseDraft } from "./parseDraft";

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 72; // 1 inch on every side
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 11;
const LINE_HEIGHT = 15;
const TITLE_SIZE = 16;
const TITLE_LINE_HEIGHT = 22;
const FOOTER_SIZE = 8;
const FOOTER_NOTE =
  "AI-generated draft - not legal advice - review by a qualified lawyer";

export class PdfTextError extends Error {
  readonly unsupported: string[];
  constructor(unsupported: string[]) {
    super("Text contains characters the PDF fonts cannot print.");
    this.name = "PdfTextError";
    this.unsupported = unsupported;
  }
}

export interface PdfInput {
  text: string;
  documentTitle: string; // used for the PDF's metadata title
  titleFromFirstLine: boolean;
}

// Replace a few common look-alike characters with plain equivalents.
function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[\u2010\u2011\u2012\u2212]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function findUnsupported(text: string, font: PDFFont): string[] {
  const supported = new Set(font.getCharacterSet());
  const bad = new Set<string>();
  for (const ch of text) {
    if (ch === "\n") continue;
    const code = ch.codePointAt(0);
    if (code === undefined || !supported.has(code)) bad.add(ch);
  }
  return Array.from(bad);
}

interface WrappedLine {
  text: string;
  indent: number;
}

function splitLongWord(word: string, font: PDFFont, size: number, avail: number): string[] {
  if (font.widthOfTextAtSize(word, size) <= avail) return [word];
  const pieces: string[] = [];
  let chunk = "";
  for (const ch of word) {
    if (chunk && font.widthOfTextAtSize(chunk + ch, size) > avail) {
      pieces.push(chunk);
      chunk = ch;
    } else {
      chunk += ch;
    }
  }
  if (chunk) pieces.push(chunk);
  return pieces;
}

// Word-wrap one paragraph line, keeping its leading-space indentation.
function wrapLine(raw: string, font: PDFFont, size: number, maxWidth: number): WrappedLine[] {
  const match = /^( *)(.*)$/.exec(raw);
  const leading = match ? match[1].length : 0;
  const content = match ? match[2] : raw;
  const indent = Math.min(leading, 24) * font.widthOfTextAtSize(" ", size);
  const avail = maxWidth - indent;

  const words = content.split(/ +/).filter((w) => w.length > 0);
  if (words.length === 0) return [{ text: "", indent: 0 }];

  const lines: WrappedLine[] = [];
  let current = "";
  for (const word of words) {
    for (const piece of splitLongWord(word, font, size, avail)) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (font.widthOfTextAtSize(candidate, size) <= avail) {
        current = candidate;
      } else {
        if (current) lines.push({ text: current, indent });
        current = piece;
      }
    }
  }
  if (current) lines.push({ text: current, indent });
  return lines;
}

// "1. DEFINITIONS" or "DRAFTING NOTES" style lines are drawn in bold.
function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 90 || t.startsWith("[")) return false;
  if (t !== t.toUpperCase() || t === t.toLowerCase()) return false;
  return (t.match(/[A-Z]/g) ?? []).length >= 3;
}

export async function generatePdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const text = normalize(input.text);
  if (text.trim() === "") throw new Error("Empty document");

  const unsupported = findUnsupported(text, regular);
  if (unsupported.length > 0) throw new PdfTextError(unsupported);

  const { banner, title, bodyLines } = parseDraft(text, input.titleFromFirstLine);

  doc.setTitle(title ?? input.documentTitle);
  doc.setSubject("AI-generated draft - not legal advice");
  doc.setCreator("Legal Drafting Assistant");
  doc.setProducer("Legal Drafting Assistant");

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN; // top edge of the next line

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };
  const ensureSpace = (height: number) => {
    if (y - height < MARGIN) newPage();
  };

  // 1. Draft banner box (first page only)
  if (banner) {
    const size = 8.5;
    const pad = 8;
    const lines = wrapLine(banner, bold, size, CONTENT_WIDTH - pad * 2);
    const boxHeight = lines.length * 11 + pad * 2 - 2;
    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: rgb(1, 0.97, 0.88),
      borderColor: rgb(0.6, 0.45, 0.05),
      borderWidth: 0.75,
    });
    let ty = y - pad - size + 1;
    for (const l of lines) {
      const w = bold.widthOfTextAtSize(l.text, size);
      page.drawText(l.text, {
        x: MARGIN + (CONTENT_WIDTH - w) / 2,
        y: ty,
        size,
        font: bold,
        color: rgb(0.4, 0.28, 0),
      });
      ty -= 11;
    }
    y -= boxHeight + 22;
  }

  // 2. Title (agreements only)
  if (title) {
    for (const l of wrapLine(title, bold, TITLE_SIZE, CONTENT_WIDTH)) {
      ensureSpace(TITLE_LINE_HEIGHT);
      const w = bold.widthOfTextAtSize(l.text, TITLE_SIZE);
      page.drawText(l.text, {
        x: MARGIN + (CONTENT_WIDTH - w) / 2,
        y: y - TITLE_SIZE,
        size: TITLE_SIZE,
        font: bold,
        color: rgb(0, 0, 0),
      });
      y -= TITLE_LINE_HEIGHT;
    }
    y -= 12;
  }

  // 3. Body
  for (const raw of bodyLines) {
    if (raw.trim() === "") {
      y -= LINE_HEIGHT * 0.6; // paragraph gap
      continue;
    }

    const heading = isHeading(raw);
    const font = heading ? bold : regular;
    const lines = wrapLine(raw, font, BODY_SIZE, CONTENT_WIDTH);

    if (heading) {
      // Keep a heading together with at least two lines that follow it.
      ensureSpace(LINE_HEIGHT * 3);
      y -= 4;
    }

    for (const l of lines) {
      ensureSpace(LINE_HEIGHT);
      if (l.text) {
        page.drawText(l.text, {
          x: MARGIN + l.indent,
          y: y - BODY_SIZE,
          size: BODY_SIZE,
          font,
          color: rgb(0, 0, 0),
        });
      }
      y -= LINE_HEIGHT;
    }
  }

  // 4. Footer on every page: notice + page numbers
  const pages = doc.getPages();
  pages.forEach((p, index) => {
    p.drawLine({
      start: { x: MARGIN, y: 52 },
      end: { x: PAGE_WIDTH - MARGIN, y: 52 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });
    p.drawText(FOOTER_NOTE, {
      x: MARGIN,
      y: 38,
      size: FOOTER_SIZE,
      font: regular,
      color: rgb(0.4, 0.4, 0.4),
    });
    const label = `Page ${index + 1} of ${pages.length}`;
    const w = regular.widthOfTextAtSize(label, FOOTER_SIZE);
    p.drawText(label, {
      x: PAGE_WIDTH - MARGIN - w,
      y: 38,
      size: FOOTER_SIZE,
      font: regular,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  return doc.save();
}
