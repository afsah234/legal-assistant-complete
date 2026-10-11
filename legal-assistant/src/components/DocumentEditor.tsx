"use client";

import { useState } from "react";
import { buildPdfFilename } from "@/lib/pdf/filename";
import { LIMITS } from "@/lib/validation/schemas";

interface Props {
  documentType: string;
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
  isEdited: boolean;
}

// Finds markers such as [EFFECTIVE DATE] that still need to be filled in.
const PLACEHOLDER_PATTERN = /\[[A-Z0-9][A-Z0-9 _\-/.,&()]{1,60}\]/g;

export default function DocumentEditor({
  documentType,
  value,
  onChange,
  onReset,
  isEdited,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  const placeholderCount = (value.match(PLACEHOLDER_PATTERN) ?? []).length;
  const isEmpty = value.trim() === "";

  async function handleExport() {
    if (exporting || isEmpty) return;
    setExporting(true);
    setExportError(null);
    setExported(false);

    try {
      // Sends the CURRENT edited text (not the original AI draft).
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, text: value }),
      });

      if (!res.ok) {
        let message = "The PDF could not be created. Please try again.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // keep the generic message
        }
        setExportError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildPdfFilename(documentType);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExported(true);
    } catch {
      setExportError(
        "Could not reach the server. Check your internet connection and try again."
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <section
      aria-label="Editable draft"
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Edit your draft</h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          AI draft - not legal advice
        </span>
        {isEdited && (
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
            Edited
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600">
        Read the whole draft, fill in every [PLACEHOLDER], and change anything
        that is wrong. The PDF will contain exactly the text shown below.
      </p>

      <textarea
        aria-label="Document text"
        value={value}
        maxLength={LIMITS.documentText}
        onChange={(e) => {
          onChange(e.target.value);
          setExported(false);
        }}
        spellCheck
        className="block min-h-[28rem] w-full resize-y rounded-lg border border-slate-300 bg-white p-4 font-serif text-[15px] leading-relaxed text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={placeholderCount > 0 ? "font-medium text-amber-700" : "text-emerald-700"}>
          {placeholderCount > 0
            ? `${placeholderCount} placeholder${placeholderCount === 1 ? "" : "s"} still to fill in`
            : "No placeholders left"}
        </span>
        <span className="text-slate-400">
          {value.length}/{LIMITS.documentText} characters
        </span>
      </div>

      {exportError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {exportError}
        </div>
      )}
      {exported && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          PDF downloaded. Please have a qualified lawyer review it before use.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || isEmpty}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {exporting && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          )}
          {exporting ? "Creating PDF..." : "Export PDF"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={!isEdited || exporting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset to AI draft
        </button>
      </div>
    </section>
  );
}
