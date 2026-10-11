export default function Disclaimer() {
  return (
    <div
      role="note"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p className="font-semibold">Not legal advice</p>
      <p className="mt-1">
        This tool produces AI-generated draft text for convenience only. It is
        not a lawyer and may contain mistakes or missing clauses. Laws differ
        by location, so have a qualified lawyer review any document before you
        sign or rely on it.
      </p>
    </div>
  );
}
