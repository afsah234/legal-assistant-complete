# Legal Drafting Assistant (MVP)

Next.js (App Router) + TypeScript + Tailwind CSS + Gemini (server-side) + pdf-lib.

## Run it (Windows PowerShell)

1. Install packages:
   npm install
2. Create your secrets file:
   Copy-Item .env.example .env.local
   notepad .env.local
   Fill in GEMINI_API_KEY (from Google AI Studio) and GEMINI_MODEL (a model ID from Google's model list).
3. Confirm the secrets file is ignored by git (should print a line):
   git check-ignore -v .env.local
4. Start:
   npm run dev
   Open http://localhost:3000
5. Checks:
   npm run lint
   npm run build

Restart `npm run dev` after any change to .env.local.

## How it works

Browser form -> POST /api/generate (server, holds the key) -> Gemini -> draft text
Editable text area (state in the browser) -> POST /api/export-pdf (server, pdf-lib) -> PDF download

## Folder map

- src/app/dashboard, src/app/draft/[type]  pages
- src/app/api/generate                      Gemini drafting endpoint
- src/app/api/export-pdf                    PDF endpoint
- src/components                            form, editor, workspace, disclaimer
- src/lib/ai                                Gemini wrapper + prompts
- src/lib/pdf                               PDF layout, filename, text parsing
- src/lib/documents/registry.ts             the 3 document types
- src/lib/validation/schemas.ts             zod rules + size limits (shared by browser and server)

## Limits (MVP)

- Drafts are AI-generated and NOT legal advice. A qualified lawyer must review them.
- PDF export supports English / Latin-script text only (built-in fonts). Urdu/Hindi needs an embedded font (future).
- Free Gemini tier: limits are per project and can change; content may be used by Google to improve its products. Use dummy data for testing.
- Rate limiting is in-memory (resets on restart). Nothing is stored; no accounts, database, or payments yet.
