// Splits the edited text into: an optional DRAFT banner line, an optional
// title line, and the remaining body lines.

export interface ParsedDraft {
  banner: string | null;
  title: string | null;
  bodyLines: string[];
}

export function parseDraft(text: string, titleFromFirstLine: boolean): ParsedDraft {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  const skipBlank = () => {
    while (i < lines.length && lines[i].trim() === "") i++;
  };

  skipBlank();
  let banner: string | null = null;
  if (
    i < lines.length &&
    /^DRAFT\b/.test(lines[i].trim()) &&
    /LEGAL ADVICE/i.test(lines[i])
  ) {
    banner = lines[i].trim();
    i++;
  }

  skipBlank();
  let title: string | null = null;
  if (titleFromFirstLine && i < lines.length && lines[i].trim().length <= 100) {
    title = lines[i].trim();
    i++;
  }

  skipBlank();
  return { banner, title, bodyLines: lines.slice(i) };
}
