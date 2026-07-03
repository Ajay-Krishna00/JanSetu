import type { Category } from "./types";

export const CATEGORY_META: Record<Category, { label: string; color: string; icon: string }> = {
  education: { label: "Education", color: "var(--series-1)", icon: "🎓" },
  water: { label: "Water", color: "var(--series-2)", icon: "💧" },
  roads: { label: "Roads", color: "var(--series-3)", icon: "🛣️" },
  health: { label: "Health", color: "var(--series-6)", icon: "🏥" },
  electricity: { label: "Electricity", color: "var(--series-5)", icon: "⚡" },
  sanitation: { label: "Sanitation", color: "var(--series-4)", icon: "🧹" },
  employment: { label: "Employment", color: "var(--series-8)", icon: "🧰" },
  agriculture: { label: "Agriculture", color: "var(--series-7)", icon: "🌾" },
  other: { label: "Other", color: "var(--ink-muted)", icon: "📌" },
};

export const LANGUAGE_LABEL: Record<string, string> = {
  te: "Telugu",
  hi: "Hindi",
  ta: "Tamil",
  kn: "Kannada",
  ml: "Malayalam",
  en: "English",
};

export const CHANNEL_LABEL: Record<string, string> = {
  text: "Web form",
  voice: "Voice",
  photo: "Photo",
  meeting: "Public meeting",
  letter: "Letter",
  social: "Social media",
};

export function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
