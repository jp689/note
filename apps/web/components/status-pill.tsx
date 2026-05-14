import { DocumentStatus } from "@ai-study-notes/contracts";

const tones: Record<DocumentStatus, string> = {
  uploaded: "bg-slate-200 text-slate-700",
  parsing: "bg-amber-100 text-amber-800",
  structured: "bg-teal-100 text-teal-800",
  quiz_ready: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800"
};

export function StatusPill({ status }: { status: DocumentStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tones[status]}`}>
      {status}
    </span>
  );
}
