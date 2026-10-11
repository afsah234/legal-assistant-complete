"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentTypeConfig } from "@/lib/documents/registry";
import DocumentEditor from "./DocumentEditor";
import DocumentForm from "./DocumentForm";

export default function DraftWorkspace({ config }: { config: DocumentTypeConfig }) {
  // originalDraft = what the AI returned. draftText = what the user is editing.
  const [originalDraft, setOriginalDraft] = useState("");
  const [draftText, setDraftText] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const hasDraft = originalDraft !== "";
  const isEdited = draftText !== originalDraft;

  // Scroll to the editor whenever a new draft arrives (helpful on phones).
  useEffect(() => {
    if (originalDraft) {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [originalDraft]);

  function confirmReplace(): boolean {
    if (hasDraft && isEdited) {
      return window.confirm(
        "Generating a new draft will replace the edits you made. Continue?"
      );
    }
    return true;
  }

  function handleGenerated(draft: string) {
    setOriginalDraft(draft);
    setDraftText(draft);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <DocumentForm
          config={config}
          hasDraft={hasDraft}
          onBeforeGenerate={confirmReplace}
          onGenerated={handleGenerated}
        />
      </section>

      {hasDraft && (
        <div ref={editorRef}>
          <DocumentEditor
            documentType={config.id}
            value={draftText}
            onChange={setDraftText}
            onReset={() => setDraftText(originalDraft)}
            isEdited={isEdited}
          />
        </div>
      )}
    </div>
  );
}
