import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import seedData from "@/data/submissions.json";
import type { Submission } from "./types";

// File-backed store: submissions persist for as long as a server instance
// stays warm. Serverless hosts (e.g. Vercel) mount the project directory
// read-only and only allow writes under the OS temp dir, so we write there
// instead of process.cwd(). An in-process cache (kept on globalThis so it
// survives hot reloads) avoids re-reading the file each call and keeps the
// request working even if the disk write below fails for any reason.
const DATA_DIR = path.join(os.tmpdir(), "jansetu-data");
const DATA_FILE = path.join(DATA_DIR, "submissions.json");

const g = globalThis as unknown as { __jansetuCache?: Submission[] };

async function load(): Promise<Submission[]> {
  if (g.__jansetuCache) return g.__jansetuCache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    g.__jansetuCache = JSON.parse(raw) as Submission[];
  } catch {
    // No persisted file yet — seed it from the bundled demo dataset.
    g.__jansetuCache = [...(seedData as Submission[])];
    await persist();
  }
  return g.__jansetuCache;
}

async function persist(): Promise<void> {
  if (!g.__jansetuCache) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(g.__jansetuCache, null, 2), "utf8");
  } catch {
    // Best-effort only — the in-memory cache still serves this instance.
  }
}

export async function getSubmissions(): Promise<Submission[]> {
  return load();
}

export async function addSubmission(s: Submission): Promise<void> {
  const all = await load();
  all.unshift(s);
  await persist();
}
