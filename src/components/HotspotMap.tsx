"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CATEGORY_META } from "@/lib/ui";
import type { Category, Submission, Ward } from "@/lib/types";

interface Props {
  wards: Ward[];
  submissions: Submission[];
}

export default function HotspotMap({ wards, submissions }: Props) {
  const byWard = new Map<string, Submission[]>();
  for (const s of submissions) {
    const list = byWard.get(s.wardId) ?? [];
    list.push(s);
    byWard.set(s.wardId, list);
  }
  const maxCount = Math.max(1, ...[...byWard.values()].map((l) => l.length));

  const center: [number, number] = [
    wards.reduce((s, w) => s + w.lat, 0) / wards.length,
    wards.reduce((s, w) => s + w.lng, 0) / wards.length,
  ];

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {wards.map((w) => {
        const list = byWard.get(w.id) ?? [];
        const counts = new Map<Category, number>();
        for (const s of list) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        const dominant = top[0]?.[0];
        const radius = 8 + (list.length / maxCount) * 22;
        return (
          <CircleMarker
            key={w.id}
            center={[w.lat, w.lng]}
            radius={radius}
            pathOptions={{
              color: "#fcfcfb",
              weight: 2,
              fillColor: dominant
                ? resolveColor(CATEGORY_META[dominant].color)
                : "#898781",
              fillOpacity: 0.75,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                <strong>{w.name}</strong> — {list.length} submissions
                {top.map(([cat, n]) => (
                  <div key={cat}>
                    {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}: {n}
                  </div>
                ))}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

// Leaflet paths can't use CSS variables — resolve to hex at render time.
const COLOR_FALLBACK: Record<string, string> = {
  "var(--series-1)": "#2a78d6",
  "var(--series-2)": "#1baf7a",
  "var(--series-3)": "#eda100",
  "var(--series-4)": "#008300",
  "var(--series-5)": "#4a3aa7",
  "var(--series-6)": "#e34948",
  "var(--series-7)": "#e87ba4",
  "var(--series-8)": "#eb6834",
  "var(--ink-muted)": "#898781",
};

function resolveColor(cssVar: string): string {
  return COLOR_FALLBACK[cssVar] ?? "#2a78d6";
}
