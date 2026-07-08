import type { AnalysisResult, Category } from "./types";

const CATEGORIES: Category[] = [
  "education",
  "roads",
  "water",
  "health",
  "electricity",
  "sanitation",
  "employment",
  "agriculture",
  "other",
];

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

interface AnalyzeInput {
  text: string;
  imageBase64?: string; // raw base64, no data: prefix
  imageMimeType?: string;
}

export async function analyzeSubmission(input: AnalyzeInput): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ...analyzeOffline(input), offlineReason: "no-key" };
  }
  try {
    return await analyzeWithGemini(input, apiKey);
  } catch (err) {
    // Key is configured but the call itself failed (bad key, wrong model,
    // quota, network) — check the server/function logs for the actual cause.
    console.error("Gemini analysis failed, using offline analyzer:", err);
    return { ...analyzeOffline(input), offlineReason: "error" };
  }
}

async function analyzeWithGemini(input: AnalyzeInput, apiKey: string): Promise<AnalysisResult> {
  const parts: Record<string, unknown>[] = [
    {
      text:
        `You are analyzing a citizen's development request submitted to their Member of Parliament in India. ` +
        `The text may be in any Indian language. Analyze it and respond with JSON.\n\n` +
        `Citizen submission: """${input.text}"""` +
        (input.imageBase64 ? `\n\nA photo is attached. Describe what civic issue it shows in photoNote.` : ""),
    },
  ];
  if (input.imageBase64) {
    parts.push({
      inline_data: {
        mime_type: input.imageMimeType || "image/jpeg",
        data: input.imageBase64,
      },
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              category: { type: "STRING", enum: CATEGORIES },
              severity: { type: "INTEGER", description: "Urgency 1-5, 5 = life/safety impact" },
              language: { type: "STRING", description: "ISO 639-1 code of the submission language" },
              translatedText: { type: "STRING", description: "Faithful English translation or restatement" },
              themes: { type: "ARRAY", items: { type: "STRING" }, description: "2-4 short lowercase theme tags" },
              photoNote: { type: "STRING", description: "One-line description of the attached photo, if any" },
            },
            required: ["category", "severity", "language", "translatedText", "themes"],
          },
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error("Gemini returned no content");
  const parsed = JSON.parse(jsonText);

  const category: Category = CATEGORIES.includes(parsed.category) ? parsed.category : "other";
  const severity = Math.min(5, Math.max(1, Math.round(parsed.severity || 3))) as AnalysisResult["severity"];
  return {
    category,
    severity,
    language: parsed.language || "en",
    translatedText: parsed.translatedText || input.text,
    themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 4) : [],
    photoNote: input.imageBase64 ? parsed.photoNote : undefined,
    engine: "gemini",
  };
}

// ---------- Offline fallback: keyword + script detection ----------
// Keeps the demo working with no API key and no network.

const KEYWORDS: Record<Exclude<Category, "other">, string[]> = {
  education: ["school", "teacher", "classroom", "student", "exam", "library", "dropout", "పాఠశాల", "స్కూల్", "తరగతి", "విద్యార్థ", "टीचर", "स्कूल", "विद्यालय", "प्रयोगशाला", "பள்ளி", "ஆசிரியர்"],
  roads: ["road", "pothole", "bridge", "culvert", "bus", "street", "రోడ్డు", "రహదారి", "బస్సు", "సడక", "सड़क", "गड्ढ", "पुल", "சாலை", "தெரு"],
  water: ["water", "tap", "borewell", "tank", "pipeline", "tanker", "fluoride", "నీళ్లు", "నీరు", "చెరువు", "ట్యాంక", "पानी", "नल", "टंकी", "நீர்", "குழாய்"],
  health: ["hospital", "doctor", "clinic", "phc", "ambulance", "medicine", "delivery", "pregnant", "డాక్టర్", "ఆసుపత్రి", "మందుల", "अस्पताल", "दवा", "इलाज", "மருத்துவ"],
  electricity: ["power", "electricity", "transformer", "street light", "current", "కరెంటు", "విద్యుత్", "ట్రాన్స్", "बिजली", "लाइट", "மின்சாரம்", "விளக்கு"],
  sanitation: ["drainage", "garbage", "sewage", "toilet", "mosquito", "డ్రైనేజీ", "మురుగు", "చెత్త", "मच्छर", "कचरा", "नाली", "शौचालय", "கழிவு", "கழிப்பறை"],
  employment: ["job", "employment", "skill", "training", "mgnrega", "wage", "unemploy", "ఉపాధి", "పని", "ట్రైనింగ్", "रोज़गार", "काम", "भुगतान", "வேலை"],
  agriculture: ["farmer", "crop", "canal", "irrigation", "cold storage", "soil", "రైతు", "పంట", "నహర", "కోల్డ్", "किसान", "फसल", "नहर", "விவசாய"],
};

const URGENT_WORDS = ["ambulance", "emergency", "accident", "dropout", "pregnant", "danger", "contaminated", "sparking", "ఎమర్జెన్సీ", "ప్రమాద", "दुर्घटना", "खतर"];

function detectLanguage(text: string): string {
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0c00 && c <= 0x0c7f) return "te";
    if (c >= 0x0900 && c <= 0x097f) return "hi";
    if (c >= 0x0b80 && c <= 0x0bff) return "ta";
    if (c >= 0x0c80 && c <= 0x0cff) return "kn";
    if (c >= 0x0d00 && c <= 0x0d7f) return "ml";
  }
  return "en";
}

export function analyzeOffline(input: AnalyzeInput): AnalysisResult {
  const text = input.text.toLowerCase();
  let best: Category = "other";
  let bestHits = 0;
  // Track the matched keywords per category so the reported themes describe the
  // *winning* category, not every category that happened to share a keyword.
  const matchedByCat: Partial<Record<Category, string[]>> = {};
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    let hits = 0;
    const matched: string[] = [];
    for (const w of words) {
      if (text.includes(w.toLowerCase())) {
        hits++;
        if (/^[a-z ]+$/.test(w)) matched.push(w);
      }
    }
    matchedByCat[cat as Category] = matched;
    if (hits > bestHits) {
      bestHits = hits;
      best = cat as Category;
    }
  }
  const themes = (matchedByCat[best] ?? []).slice(0, 4);
  const urgent = URGENT_WORDS.some((w) => text.includes(w.toLowerCase()));
  const language = detectLanguage(input.text);
  return {
    category: best,
    severity: (urgent ? 5 : bestHits >= 2 ? 3 : 2) as AnalysisResult["severity"],
    language,
    translatedText:
      language === "en"
        ? input.text
        : `${input.text} (offline mode — English translation available when AI key is configured)`,
    themes: themes.length ? themes : [best],
    photoNote: input.imageBase64 ? "Photo attached (offline mode — image analysis needs AI key)." : undefined,
    engine: "offline",
  };
}
