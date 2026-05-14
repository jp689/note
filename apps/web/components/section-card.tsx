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
    <section className="panel rounded-[28px] p-6 shadow-panel">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-xs uppercase tracking-[0.28em] text-ink/45">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="display-face text-2xl text-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

