"use client";

import { useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import wards from "@/data/wards.json";
import { CATEGORY_META, LANGUAGE_LABEL } from "@/lib/ui";
import type { AnalysisResult, Submission } from "@/lib/types";

const PHOTO_MAX_DIMENSION = 1280;
const PHOTO_JPEG_QUALITY = 0.75;

const VOICE_LANGS = [
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "en-IN", label: "English" },
];

// Minimal typing for the Web Speech API (not in TS lib.dom yet).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

export default function SubmitPage() {
  const [text, setText] = useState("");
  const [wardId, setWardId] = useState("");
  const [voiceLang, setVoiceLang] = useState("te-IN");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [photo, setPhoto] = useState<{ base64: string; mime: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ submission: Submission; analysis: AnalysisResult } | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const usedVoice = useRef(false);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = voiceLang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setText((prev) => (prev ? prev + " " : "") + transcript.trim());
      usedVoice.current = true;
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") setError("Microphone access was blocked by the browser.");
    };
    recRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }

  function onPhotoChange(file: File | null) {
    if (!file) {
      setPhoto(null);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Downscale to keep the upload well under the server's request size limit —
        // raw phone photos (often 5-15 MB) would otherwise blow past it as base64.
        const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Couldn't process that photo. Please try a different image.");
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY);
        setPhoto({ base64: dataUrl.split(",")[1], mime: "image/jpeg", preview: dataUrl });
      };
      img.onerror = () => setError("Couldn't read that photo. Please try a different image.");
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError(null);
    if (!wardId) {
      setError("Please select your village / ward.");
      return;
    }
    if (!text.trim() && !photo) {
      setError("Please describe your request (or attach a photo).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          wardId,
          channel: photo ? "photo" : usedVoice.current ? "voice" : "text",
          imageBase64: photo?.base64,
          imageMimeType: photo?.mime,
        }),
      });

      // The server always replies with JSON, but the hosting platform can reject an
      // oversized request before it ever reaches our code and send back a plain-text
      // body (e.g. "Request Entity Too Large") — guard against that failing res.json().
      let data: { submission?: Submission; analysis?: AnalysisResult; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("That photo is too large to submit. Please try a smaller image.");
        }
        throw new Error(data?.error || `Submission failed (error ${res.status}). Please try again.`);
      }
      if (!data?.submission || !data?.analysis) {
        throw new Error("Unexpected response from the server. Please try again.");
      }
      setResult({ submission: data.submission, analysis: data.analysis });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setText("");
    setPhoto(null);
    setResult(null);
    usedVoice.current = false;
  }

  if (result) {
    const meta = CATEGORY_META[result.analysis.category];
    return (
      <>
        <Nav />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
          <div className="rounded-xl border border-hairline bg-surface p-6">
            <p className="text-3xl">✅</p>
            <h1 className="mt-2 text-xl font-semibold">Request received — thank you!</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Here is how the AI understood your request. It now counts toward your area&apos;s
              development priorities.
            </p>
            <dl className="mt-5 space-y-3 text-sm">
              <Row label="Category">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-white"
                  style={{ background: meta.color }}
                >
                  {meta.icon} {meta.label}
                </span>
              </Row>
              <Row label="Language">{LANGUAGE_LABEL[result.analysis.language] ?? result.analysis.language}</Row>
              <Row label="Urgency">
                {"●".repeat(result.analysis.severity)}
                {"○".repeat(5 - result.analysis.severity)} ({result.analysis.severity}/5)
              </Row>
              <Row label="Understood as">{result.analysis.translatedText}</Row>
              {result.analysis.photoNote && <Row label="Photo">{result.analysis.photoNote}</Row>}
              <Row label="Themes">{result.analysis.themes.join(", ")}</Row>
              <Row label="Analyzed by">
                {result.analysis.engine === "gemini"
                  ? "AI (Gemini)"
                  : result.analysis.offlineReason === "error"
                    ? "Offline analyzer (AI request failed — check server logs)"
                    : "Offline analyzer (no API key configured)"}
              </Row>
            </dl>
            <div className="mt-6 flex gap-3">
              <button
                onClick={reset}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
              >
                Submit another
              </button>
              <a
                href="/dashboard"
                className="rounded-xl border border-hairline px-5 py-2.5 text-sm font-medium hover:bg-background"
              >
                See the dashboard
              </a>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
        <h1 className="text-2xl font-bold">Submit a development request</h1>
        <p className="mt-1.5 text-sm text-ink-secondary">
          Tell your MP what your area needs — in your own language. Type, speak, or attach a photo.
        </p>

        <div className="mt-6 space-y-5 rounded-xl border border-hairline bg-surface p-6">
          <div>
            <label className="text-sm font-medium">Your village / ward</label>
            <select
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select…</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Your request</label>
              <div className="flex items-center gap-2">
                <select
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value)}
                  className="rounded-lg border border-hairline bg-background px-2 py-1 text-xs"
                  title="Voice input language"
                >
                  {VOICE_LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={!voiceSupported}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                    listening
                      ? "bg-[var(--status-critical)] text-white"
                      : "border border-hairline hover:bg-background"
                  } disabled:opacity-40`}
                  title={voiceSupported ? "Speak your request" : "Voice input needs Chrome/Edge"}
                >
                  {listening ? "■ Stop" : "🎤 Speak"}
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="ఉదా: మా ఊరిలో హైస్కూల్ లేదు… / हमारी सड़क खराब है… / Our village needs…"
              className="mt-1.5 w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-sm"
            />
            {listening && (
              <p className="mt-1 text-xs text-[var(--status-critical)]">
                Listening ({VOICE_LANGS.find((l) => l.code === voiceLang)?.label})… speak now, then press Stop.
              </p>
            )}
            {!voiceSupported && (
              <p className="mt-1 text-xs text-ink-muted">
                Voice input requires Chrome or Edge. You can still type in any language.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Photo of the issue (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full text-xs text-ink-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-strong"
            />
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.preview} alt="Preview" className="mt-3 max-h-48 rounded-lg border border-hairline" />
            )}
          </div>

          {error && <p className="text-sm text-[var(--status-critical)]">{error}</p>}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full rounded-xl bg-brand px-5 py-3 font-medium text-white hover:bg-brand-strong disabled:opacity-60"
          >
            {busy ? "Analyzing your request…" : "Submit to your MP"}
          </button>
        </div>
      </main>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
