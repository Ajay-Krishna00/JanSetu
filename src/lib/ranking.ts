import type { Category, ProposedProject, Recommendation, Submission, Ward } from "./types";

// How much each ward-level indicator signals unmet need for a category (0-100).
export function needScore(category: Category, ward: Ward): number {
  switch (category) {
    case "education":
      return clamp(ward.avgSchoolDistanceKm * 12 + (100 - ward.literacyRate) * 0.6);
    case "water":
      return clamp(100 - ward.pipedWaterCoverage);
    case "roads":
      return clamp(100 - ward.roadConditionIndex);
    case "health":
      return clamp(ward.healthFacilityDistanceKm * 7);
    case "electricity":
      return clamp(100 - ward.powerReliability);
    case "sanitation":
      return clamp((100 - ward.pipedWaterCoverage) * 0.5 + (100 - ward.roadConditionIndex) * 0.3 + 20);
    case "employment":
      return clamp(ward.unemploymentRate * 5);
    case "agriculture":
      return clamp(ward.unemploymentRate * 3 + (100 - ward.pipedWaterCoverage) * 0.3);
    default:
      return 50;
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

const TITLE_TEMPLATES: Record<Category, (ward: string) => string> = {
  education: (w) => `Improve school access and infrastructure in ${w}`,
  roads: (w) => `Road repair and connectivity works in ${w}`,
  water: (w) => `Drinking water supply scheme for ${w}`,
  health: (w) => `Strengthen primary healthcare in ${w}`,
  electricity: (w) => `Power reliability and street lighting in ${w}`,
  sanitation: (w) => `Drainage and sanitation works in ${w}`,
  employment: (w) => `Skill development and livelihoods in ${w}`,
  agriculture: (w) => `Farm infrastructure support in ${w}`,
  other: (w) => `Mixed civic issues reported in ${w}`,
};

export interface RankingOptions {
  now?: Date;
}

export function rankRecommendations(
  submissions: Submission[],
  wards: Ward[],
  projects: ProposedProject[],
  opts: RankingOptions = {}
): Recommendation[] {
  const now = (opts.now ?? new Date()).getTime();
  const wardById = new Map(wards.map((w) => [w.id, w]));

  // Cluster submissions by (category, ward)
  const clusters = new Map<string, Submission[]>();
  for (const s of submissions) {
    if (s.category === "other") continue;
    const key = `${s.category}|${s.wardId}`;
    const list = clusters.get(key) ?? [];
    list.push(s);
    clusters.set(key, list);
  }

  const maxCount = Math.max(1, ...[...clusters.values()].map((l) => l.length));

  const recs: Recommendation[] = [];
  for (const [key, list] of clusters) {
    const [category, wardId] = key.split("|") as [Category, string];
    const ward = wardById.get(wardId);
    if (!ward) continue;

    const demandScore = clamp((list.length / maxCount) * 100);
    const severityScore = clamp((list.reduce((s, x) => s + x.severity, 0) / list.length / 5) * 100);
    const need = needScore(category, ward);
    const recentCount = list.filter((s) => now - new Date(s.createdAt).getTime() < 30 * 86400000).length;
    const recencyScore = clamp((recentCount / list.length) * 100);

    const matched =
      projects.find((p) => p.category === category && p.wardId === wardId) ??
      projects.find((p) => p.category === category && p.wardId === null) ??
      null;

    const score = clamp(0.35 * demandScore + 0.25 * severityScore + 0.3 * need + 0.1 * recencyScore);

    const rationale = buildRationale(category, ward, list.length, recentCount, need, matched);

    recs.push({
      id: key,
      title: TITLE_TEMPLATES[category](ward.name),
      category,
      wardId,
      score,
      demandScore,
      severityScore,
      needScore: need,
      alignmentScore: matched ? 100 : 0,
      submissionCount: list.length,
      matchedProjectId: matched?.id ?? null,
      rationale,
    });
  }

  return recs.sort((a, b) => b.score - a.score);
}

function buildRationale(
  category: Category,
  ward: Ward,
  count: number,
  recentCount: number,
  need: number,
  matched: ProposedProject | null
): string {
  const bits: string[] = [`${count} citizen request${count === 1 ? "" : "s"}`];
  if (recentCount > count / 2 && count >= 3) bits.push(`${recentCount} in the last 30 days — demand is rising`);
  const indicator = indicatorText(category, ward);
  if (indicator) bits.push(indicator);
  bits.push(
    matched
      ? `matches planned project "${matched.name}" (${matched.source})`
      : `no matching project in current plans — this is an unaddressed gap`
  );
  return bits.join("; ") + ".";
}

function indicatorText(category: Category, ward: Ward): string | null {
  switch (category) {
    case "education":
      return `avg. school distance ${ward.avgSchoolDistanceKm} km with ${ward.schoolEnrollment.toLocaleString()} enrolled students`;
    case "water":
      return `only ${ward.pipedWaterCoverage}% households have piped water`;
    case "roads":
      return `road condition index ${ward.roadConditionIndex}/100`;
    case "health":
      return `nearest health facility ${ward.healthFacilityDistanceKm} km away`;
    case "electricity":
      return `power reliability ${ward.powerReliability}/100`;
    case "employment":
      return `unemployment rate ${ward.unemploymentRate}%`;
    default:
      return null;
  }
}

// Evidence view: how much citizen demand backs each proposed project.
export interface ProjectEvidence {
  project: ProposedProject;
  supportingSubmissions: number;
  avgSeverity: number;
  need: number;
  verdict: "strong" | "moderate" | "weak";
}

export function projectEvidence(
  submissions: Submission[],
  wards: Ward[],
  projects: ProposedProject[]
): ProjectEvidence[] {
  const wardById = new Map(wards.map((w) => [w.id, w]));
  return projects
    .map((project) => {
      const matching = submissions.filter(
        (s) => s.category === project.category && (project.wardId === null || s.wardId === project.wardId)
      );
      const ward = project.wardId ? wardById.get(project.wardId) : undefined;
      const need = ward
        ? needScore(project.category, ward)
        : Math.round(
            wards.reduce((sum, w) => sum + needScore(project.category, w), 0) / wards.length
          );
      const avgSeverity = matching.length
        ? matching.reduce((s, x) => s + x.severity, 0) / matching.length
        : 0;
      const strength = matching.length * 10 + need * 0.5 + avgSeverity * 5;
      return {
        project,
        supportingSubmissions: matching.length,
        avgSeverity: Math.round(avgSeverity * 10) / 10,
        need,
        verdict: (strength >= 90 ? "strong" : strength >= 50 ? "moderate" : "weak") as ProjectEvidence["verdict"],
      };
    })
    .sort((a, b) => b.supportingSubmissions - a.supportingSubmissions);
}
