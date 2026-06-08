import { ReactNode } from "react";

export function SectionCard({
  title,
  eyebrow,
  action,
  children
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel rounded-3xl p-5 shadow-panel sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-outline">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="display-face text-2xl font-semibold text-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
