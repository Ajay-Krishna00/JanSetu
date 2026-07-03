"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/ui";
import type { Category } from "@/lib/types";

interface Props {
  data: { category: Category; count: number }[];
  title: string;
  subtitle?: string;
}

export default function CategoryBarChart({ data, title, subtitle }: Props) {
  const [hover, setHover] = useState<Category | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      <div className="mt-4 space-y-2.5">
        {sorted.map((d) => {
          const meta = CATEGORY_META[d.category];
          const pct = (d.count / max) * 100;
          const dim = hover !== null && hover !== d.category;
          return (
            <div
              key={d.category}
              className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 cursor-default"
              onMouseEnter={() => setHover(d.category)}
              onMouseLeave={() => setHover(null)}
              style={{ opacity: dim ? 0.45 : 1, transition: "opacity 120ms" }}
            >
              <span className="truncate text-xs text-ink-secondary">
                {meta.icon} {meta.label}
              </span>
              <div className="h-4 relative">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${pct}%`,
                    minWidth: 3,
                    background: meta.color,
                    borderRadius: "0 4px 4px 0",
                  }}
                  title={`${meta.label}: ${d.count} submissions`}
                />
              </div>
              <span className="text-right text-xs font-medium tabular-nums text-ink-secondary">
                {d.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
