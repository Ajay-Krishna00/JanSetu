export type Category =
  | "education"
  | "roads"
  | "water"
  | "health"
  | "electricity"
  | "sanitation"
  | "employment"
  | "agriculture"
  | "other";

export type Channel = "text" | "voice" | "photo" | "meeting" | "letter" | "social";

export interface Submission {
  id: string;
  text: string;
  translatedText: string; // English summary/translation of the submission
  language: string; // e.g. "te", "hi", "ta", "en"
  category: Category;
  wardId: string;
  channel: Channel;
  severity: 1 | 2 | 3 | 4 | 5; // 5 = most urgent
  themes: string[];
  hasPhoto?: boolean;
  photoNote?: string;
  createdAt: string; // ISO date
}

export interface Ward {
  id: string;
  name: string;
  population: number;
  lat: number;
  lng: number;
  // demographic / infrastructure indicators (0-100 where noted)
  schoolEnrollment: number; // students enrolled in govt schools
  avgSchoolDistanceKm: number;
  literacyRate: number; // %
  pipedWaterCoverage: number; // % households
  roadConditionIndex: number; // 0-100, higher = better
  healthFacilityDistanceKm: number;
  powerReliability: number; // 0-100, higher = better
  unemploymentRate: number; // %
}

export interface ProposedProject {
  id: string;
  name: string;
  category: Category;
  wardId: string | null; // null = constituency-wide
  estimatedCostLakh: number;
  source: string; // which plan it came from
  description: string;
}

export interface AnalysisResult {
  category: Category;
  severity: 1 | 2 | 3 | 4 | 5;
  language: string;
  translatedText: string;
  themes: string[];
  photoNote?: string;
  engine: "gemini" | "offline";
  offlineReason?: "no-key" | "error";
}

export interface Recommendation {
  id: string;
  title: string;
  category: Category;
  wardId: string | null;
  score: number; // 0-100
  demandScore: number;
  severityScore: number;
  needScore: number;
  alignmentScore: number;
  submissionCount: number;
  matchedProjectId: string | null;
  rationale: string;
}
