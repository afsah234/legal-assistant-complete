import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import { DOCUMENT_TYPES } from "@/lib/documents/registry";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Choose a document</h1>
        <p className="mt-2 text-slate-600">
          Pick a document type, fill in a few details, and get an editable first
          draft.
        </p>
      </div>

      <Disclaimer />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_TYPES.map((doc) => (
          <Link
            key={doc.id}
            href={`/draft/${doc.id}`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <h2 className="font-semibold text-slate-900 group-hover:text-indigo-700">
              {doc.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{doc.description}</p>
            <span className="mt-4 inline-block text-sm font-medium text-indigo-600">
              Start drafting →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
