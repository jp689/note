import Link from "next/link";
import { LuminaIcon } from "./lumina-icon";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon = "inbox"
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: string;
}) {
  return (
    <div className="ui-empty">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LuminaIcon className="text-[22px]" name={icon} />
          </span>
          <div>
            <p className="font-semibold text-on-surface">{title}</p>
            <p className="mt-1 max-w-xl text-on-surface-variant">{description}</p>
          </div>
        </div>
        {actionHref && actionLabel ? (
          <Link className="ui-button-primary shrink-0" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function InlineAlert({
  message,
  tone = "error"
}: {
  message: string;
  tone?: "error" | "info";
}) {
  if (tone === "info") {
    return (
      <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
        {message}
      </div>
    );
  }

  return (
    <div className="ui-alert-error" role="alert">
      {message}
    </div>
  );
}

export function LoadingPanel({ label = "正在加载内容" }: { label?: string }) {
  return (
    <div className="panel mx-auto grid min-h-[320px] max-w-3xl place-items-center rounded-3xl p-8 shadow-panel">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
        <div>
          <p className="font-semibold text-ink">{label}</p>
          <p className="mt-1 text-sm text-ink/60">请稍候，学习空间正在同步最新数据。</p>
        </div>
      </div>
    </div>
  );
}
