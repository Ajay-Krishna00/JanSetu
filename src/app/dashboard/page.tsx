"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import StatTile from "@/components/StatTile";
import CategoryBarChart from "@/components/CategoryBarChart";
import TrendSparkline from "@/components/TrendSparkline";
import ScoreMeter from "@/components/ScoreMeter";
import wardsData from "@/data/wards.json";
import projectsData from "@/data/projects.json";
import { rankRecommendations, projectEvidence } from "@/lib/ranking";
import { CATEGORY_META, CHANNEL_LABEL, LANGUAGE_LABEL, timeAgo } from "@/lib/ui";
import type {
  Category,
  Channel,
  ProposedProject,
  Recommendation,
  Submission,
  Ward,
} from "@/lib/types";

const HotspotMap = dynamic(() => import("@/components/HotspotMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-ink-muted">Loading map…</div>
  ),
});

const wards = wardsData as Ward[];
const projects = projectsData as ProposedProject[];
const CATEGORY_ORDER = Object.keys(CATEGORY_META) as Category[];

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState(false);

  // Filters
  const [wardId, setWardId] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [channel, setChannel] = useState<Channel | "">("");

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => setSubmissions(d.submissions))
      .catch(() => setError(true));
  }, []);

  const filtered = useMemo(() => {
    if (!submissions) return [];
    return submissions.filter(
      (s) =>
        (!wardId || s.wardId === wardId) &&
        (!category || s.category === category) &&
        (!channel || s.channel === channel)
    );
  }, [submissions, wardId, category, channel]);

  const derived = useMemo(() => {
    const byCategory = new Map<Category, number>();
    const languages = new Set<string>();
    const wardsCovered = new Set<string>();
    for (const s of filtered) {
      byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1);
      languages.add(s.language);
      wardsCovered.add(s.wardId);
    }
    return {
      byCategory: [...byCategory.entries()].map(([c, count]) => ({ category: c, count })),
      languages,
      wardsCovered,
      recs: rankRecommendations(filtered, wards, projects),
      evidence: projectEvidence(filtered, wards, projects),
    };
  }, [filtered]);

  const wardById = useMemo(() => new Map(wards.map((w) => [w.id, w])), []);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), []);

  if (error) {
    return (
      <>
        <Nav />
        <main className="grid flex-1 place-items-center px-4 py-20 text-center">
          <div>
            <p className="text-3xl">📡</p>
            <h1 className="mt-2 text-lg font-semibold">Couldn&apos;t load constituency data</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              The submissions service didn&apos;t respond. Check that the app is running and try again.
            </p>
            <button
              onClick={() => location.reload()}
              className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
            >
              Retry
            </button>
          </div>
        </main>
      </>
    );
  }

  if (!submissions) {
    return (
      <>
        <Nav />
        <DashboardSkeleton />
      </>
    );
  }

  const activeFilters = Boolean(wardId || category || channel);
  const topRec = derived.recs[0];
  const gapCount = derived.recs.filter((r) => !r.matchedProjectId && r.score >= 50).length;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Constituency Dashboard</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Citizen demand, mapped and ranked against demographic data and existing plans.
            </p>
          </div>
          <p className="text-xs text-ink-muted">
            {filtered.length} of {submissions.length} submissions · {derived.languages.size}{" "}
            languages · {derived.wardsCovered.size}/{wards.length} wards reporting
          </p>
        </div>

        {/* Filter bar */}
        <section className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface p-3">
          <span className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Filter
          </span>
          <FilterSelect
            label="Ward"
            value={wardId}
            onChange={setWardId}
            options={[
              { value: "", label: "All wards" },
              ...wards.map((w) => ({ value: w.id, label: w.name })),
            ]}
          />
          <FilterSelect
            label="Category"
            value={category}
            onChange={(v) => setCategory(v as Category | "")}
            options={[
              { value: "", label: "All categories" },
              ...CATEGORY_ORDER.map((c) => ({
                value: c,
                label: `${CATEGORY_META[c].icon} ${CATEGORY_META[c].label}`,
              })),
            ]}
          />
          <FilterSelect
            label="Channel"
            value={channel}
            onChange={(v) => setChannel(v as Channel | "")}
            options={[
              { value: "", label: "All channels" },
              ...Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label })),
            ]}
          />
          {activeFilters && (
            <button
              onClick={() => {
                setWardId("");
                setCategory("");
                setChannel("");
              }}
              className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-background"
            >
              ✕ Clear
            </button>
          )}
          <button
            onClick={() => exportRecsCsv(derived.recs, wardById)}
            disabled={!derived.recs.length}
            className="ml-auto rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium hover:bg-background disabled:opacity-40"
          >
            ⬇ Export priorities (CSV)
          </button>
        </section>

        {filtered.length === 0 ? (
          <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-hairline bg-surface px-4 py-16 text-center">
            <p className="text-3xl">🔍</p>
            <p className="mt-2 font-medium">No submissions match these filters</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Try widening the ward, category or channel.
            </p>
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Total submissions"
                value={String(filtered.length)}
                hint="Across web, voice, photo, meetings & letters"
              />
              <StatTile
                label="Languages heard"
                value={String(derived.languages.size)}
                hint={[...derived.languages].map((l) => LANGUAGE_LABEL[l] ?? l).join(", ")}
              />
              <StatTile
                label="Top priority"
                value={topRec ? CATEGORY_META[topRec.category].label : "—"}
                hint={topRec ? wardById.get(topRec.wardId ?? "")?.name : undefined}
              />
              <StatTile
                label="Unaddressed gaps"
                value={String(gapCount)}
                hint="High-demand needs with no planned project"
              />
            </section>

            {/* Map + category chart */}
            <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-hairline bg-surface p-5">
                <h3 className="text-sm font-semibold">Demand hotspots</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Circle size = number of submissions; color = dominant category. Hover a ward.
                </p>
                <div className="mt-3 h-80 overflow-hidden rounded-xl">
                  <HotspotMap wards={wards} submissions={filtered} />
                </div>
                <MapLegend categories={derived.byCategory.map((d) => d.category)} />
              </div>
              <div className="flex flex-col gap-4">
                <CategoryBarChart
                  title="What citizens are asking for"
                  subtitle="Submissions by category"
                  data={derived.byCategory}
                />
              </div>
            </section>

            <section className="mt-4">
              <TrendSparkline submissions={filtered} title="Submission volume" />
            </section>

            {/* Ranked recommendations */}
            <section className="mt-10">
              <h2 className="text-lg font-bold">Recommended priority works</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Ranked by citizen demand (35%), urgency (25%), data-backed need (30%) and recent
                momentum (10%). Every score is explainable.
              </p>
              <div className="mt-4 space-y-3">
                {derived.recs.slice(0, 8).map((rec, i) => {
                  const meta = CATEGORY_META[rec.category];
                  const matched = rec.matchedProjectId
                    ? projectById.get(rec.matchedProjectId)
                    : null;
                  return (
                    <div key={rec.id} className="rounded-xl border border-hairline bg-surface p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background text-sm font-bold text-ink-secondary">
                            {i + 1}
                          </span>
                          <div>
                            <h3 className="font-semibold">{rec.title}</h3>
                            <p className="mt-0.5 text-xs text-ink-secondary">{rec.rationale}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white"
                                style={{ background: meta.color }}
                              >
                                {meta.icon} {meta.label}
                              </span>
                              {matched ? (
                                <span className="rounded-full border border-hairline px-2 py-0.5 text-ink-secondary">
                                  ✓ In plan: {matched.name} (₹{matched.estimatedCostLakh}L)
                                </span>
                              ) : (
                                <span className="rounded-full bg-[var(--status-warning)]/20 px-2 py-0.5 font-medium text-[var(--status-serious)]">
                                  ⚠ Gap — not in any current plan
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-full max-w-[15rem] shrink-0 sm:w-56">
                          <p className="text-right text-2xl font-bold tabular-nums">
                            {rec.score}
                            <span className="text-sm font-normal text-ink-muted">/100</span>
                          </p>
                          <div className="mt-1.5 space-y-1">
                            <ScoreMeter label="Demand" value={rec.demandScore} />
                            <ScoreMeter
                              label="Urgency"
                              value={rec.severityScore}
                              color="var(--series-6)"
                            />
                            <ScoreMeter
                              label="Data need"
                              value={rec.needScore}
                              color="var(--series-5)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Project evidence comparison */}
            <section className="mt-10">
              <h2 className="text-lg font-bold">Proposed projects vs. real demand</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Every project in the current development plans, weighed against what citizens are
                actually asking for.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-hairline bg-surface">
                <table className="w-full min-w-[42rem] text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                      <th className="px-4 py-3 font-medium">Proposed project</th>
                      <th className="px-4 py-3 font-medium">Ward</th>
                      <th className="px-4 py-3 font-medium">Cost</th>
                      <th className="px-4 py-3 text-right font-medium">Citizen requests</th>
                      <th className="px-4 py-3 text-right font-medium">Avg urgency</th>
                      <th className="px-4 py-3 text-right font-medium">Need index</th>
                      <th className="px-4 py-3 font-medium">Demand evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derived.evidence.map((e) => (
                      <tr key={e.project.id} className="border-b border-hairline last:border-0">
                        <td className="px-4 py-3">
                          <span className="font-medium">{e.project.name}</span>
                          <span className="block text-xs text-ink-muted">{e.project.source}</span>
                        </td>
                        <td className="px-4 py-3 text-ink-secondary">
                          {e.project.wardId ? wardById.get(e.project.wardId)?.name : "All wards"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-secondary">
                          ₹{e.project.estimatedCostLakh}L
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {e.supportingSubmissions}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {e.avgSeverity ? `${e.avgSeverity}/5` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{e.need}</td>
                        <td className="px-4 py-3">
                          <VerdictBadge verdict={e.verdict} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent submissions */}
            <section className="mt-10 mb-12">
              <h2 className="text-lg font-bold">Latest citizen voices</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {filtered.slice(0, 8).map((s) => {
                  const meta = CATEGORY_META[s.category];
                  return (
                    <div key={s.id} className="rounded-xl border border-hairline bg-surface p-4">
                      <p className="text-sm">{s.text}</p>
                      {s.language !== "en" && (
                        <p className="mt-1.5 border-l-2 border-hairline pl-2 text-xs italic text-ink-secondary">
                          {s.translatedText}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white"
                          style={{ background: meta.color }}
                        >
                          {meta.icon} {meta.label}
                        </span>
                        <span>{wardById.get(s.wardId)?.name}</span>
                        <span>· {LANGUAGE_LABEL[s.language] ?? s.language}</span>
                        <span>· {CHANNEL_LABEL[s.channel] ?? s.channel}</span>
                        <span>· {timeAgo(s.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-hairline bg-background px-2.5 py-1.5 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MapLegend({ categories }: { categories: Category[] }) {
  const seen = [...new Set(categories)];
  if (!seen.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-hairline pt-3 text-[11px] text-ink-secondary">
      {seen.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: CATEGORY_META[c].color }}
          />
          {CATEGORY_META[c].label}
        </span>
      ))}
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: "strong" | "moderate" | "weak" }) {
  const map = {
    strong: { bg: "var(--status-good)", label: "✓ Strong" },
    moderate: { bg: "var(--status-warning)", label: "~ Moderate" },
    weak: { bg: "var(--status-critical)", label: "! Weak" },
  } as const;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ background: map[verdict].bg }}
    >
      {map[verdict].label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8" aria-busy="true">
      <span className="sr-only">Loading constituency data…</span>
      <div className="h-7 w-64 animate-pulse rounded bg-hairline" />
      <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-hairline" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-hairline bg-surface" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-96 animate-pulse rounded-xl border border-hairline bg-surface" />
        <div className="h-96 animate-pulse rounded-xl border border-hairline bg-surface" />
      </div>
    </main>
  );
}

// ---- CSV export of the ranked priority works ----
function exportRecsCsv(recs: Recommendation[], wardById: Map<string, Ward>) {
  const header = [
    "Rank",
    "Title",
    "Category",
    "Ward",
    "Score",
    "Demand",
    "Urgency",
    "DataNeed",
    "Submissions",
    "InPlan",
    "Rationale",
  ];
  const rows = recs.map((r, i) => [
    i + 1,
    r.title,
    r.category,
    wardById.get(r.wardId ?? "")?.name ?? "",
    r.score,
    r.demandScore,
    r.severityScore,
    r.needScore,
    r.submissionCount,
    r.matchedProjectId ? "yes" : "no",
    r.rationale,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvCell(String(cell))).join(","))
    .join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jansetu-priority-works.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
