"use client";

import { useMemo, useState } from "react";
import type { Submission } from "@/lib/types";

interface Props {
  submissions: Submission[];
  weeks?: number;
  title: string;
}

export default function TrendSparkline({ submissions, weeks = 16, title }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const buckets = useMemo(() => {
    const now = Date.now();
    const WEEK = 7 * 86400000;
    const counts = new Array(weeks).fill(0);
    for (const s of submissions) {
      const age = now - new Date(s.createdAt).getTime();
      const idx = weeks - 1 - Math.floor(age / WEEK);
      if (idx >= 0 && idx < weeks) counts[idx]++;
    }
    return counts;
  }, [submissions, weeks]);

  const W = 560;
  const H = 96;
  const PAD = 6;
  const max = Math.max(1, ...buckets);
  const pts = buckets.map((c, i) => ({
    x: PAD + (i / (weeks - 1)) * (W - PAD * 2),
    y: H - PAD - (c / max) * (H - PAD * 2),
    c,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">Weekly submissions, last {weeks} weeks</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((x - PAD) / (W - PAD * 2)) * (weeks - 1));
          setHoverIdx(Math.max(0, Math.min(weeks - 1, idx)));
        }}
      >
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--baseline)" strokeWidth="1" />
        <path d={area} fill="var(--series-1)" opacity="0.12" />
        <path d={line} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />
        {hoverIdx !== null && (
          <g>
            <line
              x1={pts[hoverIdx].x}
              y1={PAD}
              x2={pts[hoverIdx].x}
              y2={H - PAD}
              stroke="var(--baseline)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={pts[hoverIdx].x} cy={pts[hoverIdx].y} r="4" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      <p className="mt-1 h-4 text-xs text-ink-secondary">
        {hoverIdx !== null
          ? `${buckets[hoverIdx]} submission${buckets[hoverIdx] === 1 ? "" : "s"} · ${weeks - hoverIdx - 1 === 0 ? "this week" : `${weeks - hoverIdx - 1} week(s) ago`}`
          : " "}
      </p>
    </div>
  );
}
