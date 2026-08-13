import { z } from "zod";

/**
 * The single source of truth for the shape of an analysis.
 *
 * Reused for (a) OpenAI Structured Outputs via `zodResponseFormat`, which
 * guarantees the model returns schema-valid JSON, and (b) typing the client.
 */

export const CATEGORIES = [
  "coherence",
  "information-flow",
  "structure",
  "word-choice",
  "connector",
  "article",
  "preposition",
  "clarity",
] as const;

export const Category = z.enum(CATEGORIES);
export type Category = z.infer<typeof Category>;

export const Issue = z.object({
  /** The exact problematic substring, copied verbatim from the input. */
  excerpt: z.string(),
  /** Best-effort character offsets in the original (verified client-side). */
  start: z.number().int(),
  end: z.number().int(),
  category: Category,
  /** What is wrong with this specific span. */
  explanation: z.string(),
  /** The portable, reusable rule or pattern the learner should remember. */
  rule: z.string(),
});
export type Issue = z.infer<typeof Issue>;

export const AnalysisResult = z.object({
  issues: z.array(Issue),
  /** Minimal corrections applied to the original. */
  correctedVersion: z.string(),
  /** A more idiomatic, naturally-flowing rewrite. */
  naturalVersion: z.string(),
  /** One line explaining what the natural rewrite changed and why. */
  naturalNote: z.string(),
});
export type AnalysisResult = z.infer<typeof AnalysisResult>;
