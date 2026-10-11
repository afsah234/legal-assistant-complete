"use client";

import { useState, type FormEvent } from "react";
import type { DocumentTypeConfig } from "@/lib/documents/registry";
import {
  LIMITS,
  draftFormSchema,
  type DraftFormField,
  type DraftFormValues,
} from "@/lib/validation/schemas";

type FieldErrors = Partial<Record<DraftFormField, string>>;

interface GenerateResponse {
  draft?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const EMPTY: DraftFormValues = {
  partyA: "",
  partyB: "",
  jurisdiction: "",
  purpose: "",
  extraDetails: "",
};

const REQUEST_TIMEOUT_MS = 75_000;

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 aria-[invalid=true]:border-red-500 disabled:bg-slate-100";

interface Props {
  config: DocumentTypeConfig;
  hasDraft: boolean;
  // Return false to cancel (used to protect the user's edits).
  onBeforeGenerate: () => boolean;
  onGenerated: (draft: string) => void;
}

export default function DocumentForm({
  config,
  hasDraft,
  onBeforeGenerate,
  onGenerated,
}: Props) {
  const [values, setValues] = useState<DraftFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function update(field: DraftFormField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setApiError(null);

    // Layer 1: quick validation in the browser.
    const result = draftFormSchema.safeParse(values);
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as DraftFormField;
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    if (!onBeforeGenerate()) return;

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      // The browser only talks to OUR server. The Gemini key never leaves it.
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: config.id, ...result.data }),
        signal: controller.signal,
      });

      let data: GenerateResponse = {};
      try {
        data = (await res.json()) as GenerateResponse;
      } catch {
        // Not JSON; fall through to the generic message below.
      }

      if (!res.ok || !data.draft) {
        if (data.fieldErrors) setErrors(data.fieldErrors as FieldErrors);
        setApiError(
          data.error ?? "Something went wrong. Please try again in a moment."
        );
        return;
      }

      onGenerated(data.draft);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setApiError(
        aborted
          ? "This is taking too long. Please try again."
          : "Could not reach the server. Check your internet connection and try again."
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  function field(
    name: DraftFormField,
    label: string,
    opts: { placeholder?: string; multiline?: boolean; optional?: boolean; max: number }
  ) {
    const id = `field-${name}`;
    const error = errors[name];
    const common = {
      id,
      name,
      value: values[name],
      placeholder: opts.placeholder,
      className: inputClass,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${id}-error` : undefined,
    };
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
          {opts.optional && (
            <span className="ml-1 font-normal text-slate-400">(optional)</span>
          )}
        </label>
        {opts.multiline ? (
          <textarea
            {...common}
            rows={4}
            onChange={(e) => update(name, e.target.value)}
          />
        ) : (
          <input
            {...common}
            type="text"
            onChange={(e) => update(name, e.target.value)}
          />
        )}
        <div className="mt-1 flex justify-between text-xs">
          <span id={`${id}-error`} role={error ? "alert" : undefined} className="text-red-600">
            {error}
          </span>
          <span className="text-slate-400">
            {values[name].length}/{opts.max}
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset disabled={loading} className="m-0 min-w-0 space-y-5 border-0 p-0">
        <div className="grid gap-5 sm:grid-cols-2">
          {field("partyA", `${config.partyALabel} (name)`, {
            placeholder: "Full legal name",
            max: LIMITS.name,
          })}
          {field("partyB", `${config.partyBLabel} (name)`, {
            placeholder: "Full legal name",
            max: LIMITS.name,
          })}
        </div>

        {field("jurisdiction", "Jurisdiction", {
          placeholder: "e.g. Sindh, Pakistan",
          max: LIMITS.jurisdiction,
        })}

        {field("purpose", config.purposeLabel, {
          placeholder: config.purposePlaceholder,
          multiline: true,
          max: LIMITS.purpose,
        })}

        {field("extraDetails", "Extra details", {
          placeholder:
            "Dates, amounts, duration, special terms. Anything you leave out will become a [PLACEHOLDER] in the draft.",
          multiline: true,
          optional: true,
          max: LIMITS.extraDetails,
        })}

        {apiError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {apiError}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-400 sm:w-auto"
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          )}
          {loading
            ? "Drafting... this can take up to a minute"
            : hasDraft
              ? "Regenerate Draft"
              : "Generate Draft"}
        </button>
      </fieldset>
    </form>
  );
}
