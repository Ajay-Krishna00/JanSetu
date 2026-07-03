# JanSetu — citizen voices, prioritized development

A multilingual AI platform where citizens submit development requests by **text, voice, or photo** — in Telugu, Hindi, Tamil, English and more — and their MP sees demand hotspots, recurring themes, and a **ranked, evidence-backed list of development works**.

Built for the "MP constituency development prioritization" hackathon challenge.

## The problem

MPs receive development requests through public meetings, letters, social media and grievance portals, while local development plans contain dozens of competing proposals. There is no objective way to consolidate citizen feedback, spot recurring needs, and weigh proposals against real demand — for example, comparing requests for a school upgrade against enrollment and travel-distance data versus a proposed vocational centre.

## What JanSetu does

1. **Citizens speak** (`/submit`) — type in any language, dictate by voice (Web Speech API: Telugu, Hindi, Tamil, Kannada, English), or attach a photo of the issue.
2. **AI listens & organizes** — each submission is language-detected, translated, categorized (education / roads / water / health / …), urgency-scored and theme-tagged. Uses the **Gemini API free tier** when `GEMINI_API_KEY` is set; otherwise a built-in offline analyzer keeps the demo fully working.
3. **The MP acts on evidence** (`/dashboard`) —
   - **Demand hotspot map** (Leaflet) — circle size = volume, color = dominant category per ward, with a category legend
   - **Category demand chart** and weekly **trend line**
   - **Ranked priority works** — transparent score: demand 35% + urgency 25% + data-backed need 30% + recent momentum 10%, with per-factor meters and a plain-language rationale
   - **Proposed projects vs. real demand** — every project in the development plan weighed against actual citizen requests, average urgency, and ward-level need indicators (enrollment, school distance, piped-water coverage, road condition, health-facility distance…)
   - **Gap detection** — high-demand needs with *no* matching planned project are flagged
   - **Live filters** — slice the whole dashboard by ward, category and channel; every view re-derives instantly
   - **CSV export** — download the ranked priority works (scores, ward, in-plan status, rationale) for offline review

The seeded demo tells the challenge's own story: Chintalapadu ward shows a rising cluster of school-upgrade requests (7 submissions, 5.6 km average school distance, 3,350 enrolled students) — which the dashboard ranks above the vocational centre proposed for the same ward in the district plan.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional — real AI analysis (free tier):

```bash
cp .env.example .env.local
# put your key from https://aistudio.google.com/apikey into GEMINI_API_KEY
```

Regenerate the demo data: `node scripts/seed.mjs`

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Gemini API** (free tier) with structured JSON output + image understanding, with an offline keyword/script-detection fallback
- **Leaflet / react-leaflet** for the hotspot map, hand-rolled SVG charts
- CSS-variable design tokens with automatic **light/dark mode** (follows the OS setting)
- Seeded, deterministic demo dataset: 12 wards with demographic indicators, 10 planned projects, 132 multilingual citizen submissions
- File-backed store (`.data/submissions.json`, seeded from `src/data` on first run) so new submissions survive server restarts

## Roadmap

- WhatsApp/Telegram bot intake
- Real database (the demo persists to a local JSON file; swap in Postgres/SQLite for multi-user scale)
- MP-side actions: mark as taken up, publish responses back to citizens
- Duplicate/spam detection and constituent verification
- Manual dark-mode toggle (currently follows the OS setting only)
