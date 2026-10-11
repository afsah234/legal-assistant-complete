import Link from "next/link";
import { notFound } from "next/navigation";
import Disclaimer from "@/components/Disclaimer";
import DraftWorkspace from "@/components/DraftWorkspace";
import { getDocumentType } from "@/lib/documents/registry";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const config = getDocumentType(type);
  if (!config) notFound();

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{config.title}</h1>
        <p className="mt-2 text-slate-600">{config.description}</p>
      </div>

      <Disclaimer />

      <DraftWorkspace config={config} />
    </div>
  );
}
