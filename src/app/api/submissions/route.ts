import { NextResponse } from "next/server";
import { analyzeSubmission } from "@/lib/analyze";
import { addSubmission, getSubmissions } from "@/lib/store";
import wardsData from "@/data/wards.json";
import type { Channel, Submission, Ward } from "@/lib/types";

const WARD_IDS = new Set((wardsData as Ward[]).map((w) => w.id));
const CHANNELS: Channel[] = ["text", "voice", "photo", "meeting", "letter", "social"];
// Base64 inflates bytes by ~4/3; ~7M chars ≈ a 5 MB image.
const MAX_IMAGE_CHARS = 7_000_000;

export async function GET() {
  return NextResponse.json({ submissions: await getSubmissions() });
}

export async function POST(req: Request) {
  let body: {
    text?: string;
    wardId?: string;
    channel?: Channel;
    imageBase64?: string;
    imageMimeType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text && !body.imageBase64) {
    return NextResponse.json({ error: "Provide text or a photo" }, { status: 400 });
  }
  if (!body.wardId || !WARD_IDS.has(body.wardId)) {
    return NextResponse.json({ error: "Select a valid village/ward" }, { status: 400 });
  }
  if (body.imageBase64 && body.imageBase64.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "Photo is too large — please use one under 5 MB" }, { status: 413 });
  }

  const channel: Channel = CHANNELS.includes(body.channel as Channel)
    ? (body.channel as Channel)
    : "text";

  const analysis = await analyzeSubmission({
    text: text || "Citizen submitted a photo of a local issue.",
    imageBase64: body.imageBase64,
    imageMimeType: body.imageMimeType,
  });

  const submission: Submission = {
    id: "s" + Date.now().toString(36),
    text: text || "(photo submission)",
    translatedText: analysis.translatedText,
    language: analysis.language,
    category: analysis.category,
    wardId: body.wardId,
    channel,
    severity: analysis.severity,
    themes: analysis.themes,
    hasPhoto: Boolean(body.imageBase64),
    photoNote: analysis.photoNote,
    createdAt: new Date().toISOString(),
  };
  await addSubmission(submission);

  return NextResponse.json({ submission, analysis });
}
