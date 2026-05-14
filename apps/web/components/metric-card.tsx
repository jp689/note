export function MetricCard({
  label,
  value,
  caption
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="panel rounded-[24px] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-ink/45">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink/65">{caption}</p>
    </div>
  );
}

