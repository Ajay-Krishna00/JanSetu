interface Props {
  label: string;
  value: string;
  hint?: string;
}

export default function StatTile({ label, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
