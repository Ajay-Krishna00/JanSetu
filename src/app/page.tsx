import Link from "next/link";
import Nav from "@/components/Nav";
import submissionsData from "@/data/submissions.json";
import wardsData from "@/data/wards.json";
import projectsData from "@/data/projects.json";
import type { Submission } from "@/lib/types";

const STEPS = [
  {
    title: "Citizens speak",
    body: "Submit a request in any language — type it, say it out loud, or attach a photo of the problem.",
    icon: "🗣️",
  },
  {
    title: "AI listens & organizes",
    body: "Every submission is translated, categorized and scored for urgency. Recurring themes surface automatically.",
    icon: "🤖",
  },
  {
    title: "The MP acts on evidence",
    body: "Citizen demand is combined with demographic data, infrastructure gaps and existing plans into a ranked list of works.",
    icon: "📊",
  },
];

// Real figures from the seeded demo dataset, computed at build time.
const submissions = submissionsData as Submission[];
const STATS = [
  { value: submissions.length.toLocaleString(), label: "citizen requests" },
  { value: String(new Set(submissions.map((s) => s.language)).size), label: "languages heard" },
  { value: String((wardsData as unknown[]).length), label: "wards mapped" },
  { value: String((projectsData as unknown[]).length), label: "planned projects weighed" },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60rem 30rem at 50% -8rem, var(--brand-soft), transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-6xl px-4 pb-14 pt-20 text-center">
            <p className="mx-auto w-fit rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-ink-secondary">
              Suryagiri Parliamentary Constituency · Demo
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              Every citizen&apos;s voice, turned into a{" "}
              <span className="text-brand">development priority</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-ink-secondary">
              MPs receive thousands of requests through meetings, letters and messages — with no
              objective way to weigh them. JanSetu consolidates citizen feedback in any language,
              maps demand hotspots, and ranks development works against real data.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/submit"
                className="rounded-xl bg-brand px-6 py-3 font-medium text-white hover:bg-brand-strong"
              >
                Submit a request
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-hairline bg-surface px-6 py-3 font-medium hover:bg-background"
              >
                Open MP Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4">
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-hairline bg-surface p-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="text-3xl font-bold tabular-nums text-brand">{s.value}</dt>
                <dd className="mt-1 text-xs text-ink-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 pt-14 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-xl border border-hairline bg-surface p-6">
              <div className="text-2xl">{s.icon}</div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-secondary">{s.body}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t border-hairline py-6 text-center text-xs text-ink-muted">
        JanSetu — hackathon prototype. Constituency, wards and submissions are fictional demo data.
      </footer>
    </>
  );
}
