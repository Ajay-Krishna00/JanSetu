interface Props {
  label: string;
  value: number; // 0-100
  color?: string;
}

export default function ScoreMeter({ label, value, color = "var(--series-1)" }: Props) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr_2.2rem] items-center gap-2">
      <span className="text-[11px] text-ink-muted">{label}</span>
      <div className="h-2 rounded-full bg-[var(--hairline)] overflow-hidden">
        <div
          className="h-full"
          style={{ width: `${value}%`, background: color, borderRadius: "0 4px 4px 0" }}
        />
      </div>
      <span className="text-right text-[11px] font-medium tabular-nums text-ink-secondary">
        {value}
      </span>
    </div>
  );
}
