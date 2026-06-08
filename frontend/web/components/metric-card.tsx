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
    <div className="ui-card">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink/65">{caption}</p>
    </div>
  );
}
