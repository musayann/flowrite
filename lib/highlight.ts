import type { Issue } from "./schema";

export type Segment = {
  text: string;
  /** Index into the original issues array, or null for un-flagged text. */
  issueIndex: number | null;
};

type Range = { start: number; end: number; issueIndex: number };

/**
 * Resolve issue spans to concrete, non-overlapping character ranges in the
 * original text, then split the text into renderable segments.
 *
 * LLM-reported offsets are unreliable, so each issue is located by:
 *   1. trusting `start`/`end` only if `original.slice(start, end) === excerpt`;
 *   2. otherwise searching for the exact `excerpt` substring, skipping
 *      occurrences already claimed by another issue (handles repeats);
 *   3. dropping the issue entirely if it can't be located (never mis-mark).
 *
 * Overlapping resolved ranges are de-conflicted by keeping the earlier one.
 */
export function resolveHighlights(original: string, issues: Issue[]): Segment[] {
  const claimed: Range[] = [];

  const overlaps = (a: number, b: number) =>
    claimed.some((r) => a < r.end && b > r.start);

  issues.forEach((issue, issueIndex) => {
    const { excerpt, start, end } = issue;
    if (!excerpt) return;

    // 1. Trust the model's offsets only if they exactly match the excerpt.
    if (
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      end <= original.length &&
      start < end &&
      original.slice(start, end) === excerpt &&
      !overlaps(start, end)
    ) {
      claimed.push({ start, end, issueIndex });
      return;
    }

    // 2. Fall back to substring search, skipping already-claimed occurrences.
    let from = 0;
    while (from <= original.length) {
      const idx = original.indexOf(excerpt, from);
      if (idx === -1) break;
      const e = idx + excerpt.length;
      if (!overlaps(idx, e)) {
        claimed.push({ start: idx, end: e, issueIndex });
        break;
      }
      from = idx + 1;
    }
    // 3. If nothing matched, the issue is silently left un-highlighted.
  });

  claimed.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of claimed) {
    if (r.start > cursor) {
      segments.push({ text: original.slice(cursor, r.start), issueIndex: null });
    }
    segments.push({
      text: original.slice(r.start, r.end),
      issueIndex: r.issueIndex,
    });
    cursor = r.end;
  }
  if (cursor < original.length) {
    segments.push({ text: original.slice(cursor), issueIndex: null });
  }
  return segments;
}
