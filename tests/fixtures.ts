import type { AnalysisResult, Issue } from "@/lib/schema";

/** An `Issue` with sensible defaults; override only what a test cares about. */
export function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    excerpt: "excerpt",
    start: 0,
    end: 7,
    category: "clarity",
    explanation: "Explanation.",
    rule: "Rule.",
    ...overrides,
  };
}

export function makeResult(
  overrides: Partial<AnalysisResult> = {},
): AnalysisResult {
  return {
    issues: [],
    correctedVersion: "Corrected version.",
    naturalVersion: "Natural version.",
    naturalNote: "What changed and why.",
    ...overrides,
  };
}
