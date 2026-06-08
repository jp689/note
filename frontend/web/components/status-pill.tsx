import { DocumentStatus } from "@ai-study-notes/contracts";

const tones: Record<DocumentStatus, string> = {
  uploaded: "bg-surface-container text-on-surface-variant",
  parsing: "bg-secondary-container text-on-secondary-container",
  structured: "bg-mist text-teal",
  quiz_ready: "bg-primary-fixed text-primary",
  failed: "bg-error-container text-error"
};

const labels: Record<DocumentStatus, string> = {
  uploaded: "已上传",
  parsing: "处理中",
  structured: "已结构化",
  quiz_ready: "可测评",
  failed: "失败"
};

export function StatusPill({ status }: { status: DocumentStatus }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[status]}`}>
      {labels[status]}
    </span>
  );
}
