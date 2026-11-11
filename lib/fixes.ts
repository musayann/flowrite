import { diffWords, markRange, type DiffPart, type MarkedPart } from "./diff";
import { resolveHighlights, resolveRanges, type Range } from "./highlight";
import type { Issue } from "./schema";

/**
 * The part of the corrected text that fixes one issue, with just enough of
 * the original around it to read.
 */
export type Fix = {
  /** The original snippet: `same` and `removed` parts, with the excerpt flagged. */
  before: MarkedPart[];
  /** The corrected snippet: `same` and `added` parts. */
  after: DiffPart[];
  /** Where `after` sits in the corrected text, as `[start, end)`. */
  afterStart: number;
  afterEnd: number;
};

/** A stretch of the diff, with its position in both texts. */
type Unit = {
  kind: "same" | "change";
  oStart: number;
  oEnd: number;
  cStart: number;
  cEnd: number;
  removed: string;
  added: string;
};

function toUnits(parts: DiffPart[]): Unit[] {
  const units: Unit[] = [];
  let o = 0;
  let c = 0;
  for (const part of parts) {
    const last = units[units.length - 1];
    const len = part.text.length;
    if (part.kind === "same") {
      units.push({ kind: "same", oStart: o, oEnd: o + len, cStart: c, cEnd: c + len, removed: "", added: "" });
      o += len;
      c += len;
    } else if (part.kind === "added" && last?.kind === "change") {
      // `diffWords` puts a run's removed text first, then its added text.
      last.added = part.text;
      last.cEnd = c + len;
      c += len;
    } else if (part.kind === "added") {
      units.push({ kind: "change", oStart: o, oEnd: o, cStart: c, cEnd: c + len, removed: "", added: part.text });
      c += len;
    } else {
      units.push({ kind: "change", oStart: o, oEnd: o + len, cStart: c, cEnd: c, removed: part.text, added: "" });
      o += len;
    }
  }
  return units;
}

/** A change belongs to an issue when it overlaps the excerpt or is inserted right at its edge. */
function touches(unit: Unit, r: Range): boolean {
  if (unit.kind !== "change") return false;
  return unit.oStart === unit.oEnd
    ? unit.oStart >= r.start && unit.oStart <= r.end
    : unit.oStart < r.end && unit.oEnd > r.start;
}

type Slice = { before: DiffPart[]; after: DiffPart[]; cStart: number; cEnd: number };

/** Cut `[s, e)` of the original out of the diff, keeping only the given changes. */
function slice(units: Unit[], changes: Set<Unit>, original: string, s: number, e: number): Slice {
  const before: DiffPart[] = [];
  const after: DiffPart[] = [];
  let cStart = -1;
  let cEnd = -1;
  for (const u of units) {
    if (u.kind === "same") {
      const a = Math.max(s, u.oStart);
      const b = Math.min(e, u.oEnd);
      if (a >= b) continue;
      const text = original.slice(a, b);
      before.push({ text, kind: "same" });
      after.push({ text, kind: "same" });
      const ca = u.cStart + (a - u.oStart);
      if (cStart === -1) cStart = ca;
      cEnd = ca + (b - a);
    } else if (changes.has(u)) {
      if (u.removed) before.push({ text: u.removed, kind: "removed" });
      if (u.added) after.push({ text: u.added, kind: "added" });
      if (cStart === -1) cStart = u.cStart;
      cEnd = u.cEnd;
    }
  }
  return { before, after, cStart, cEnd };
}

const isBlank = (parts: DiffPart[]) => parts.every((p) => !p.text.trim());

/**
 * Widen `[s, e)` by one word on each side, staying inside the unchanged text
 * next to it, so that a deleted or inserted word has something to sit beside.
 */
function widen(units: Unit[], original: string, s: number, e: number): [number, number] {
  const left = units.find((u) => u.kind === "same" && u.oStart < s && s <= u.oEnd);
  if (left) {
    while (s > left.oStart && /\s/.test(original[s - 1])) s--;
    while (s > left.oStart && !/\s/.test(original[s - 1])) s--;
  }
  const right = units.find((u) => u.kind === "same" && u.oStart <= e && e < u.oEnd);
  if (right) {
    while (e < right.oEnd && /\s/.test(original[e])) e++;
    while (e < right.oEnd && !/\s/.test(original[e])) e++;
  }
  return [s, e];
}

function fixFor(units: Unit[], original: string, r: Range): Fix | null {
  const changes = units.filter((u) => touches(u, r));
  if (changes.length === 0) return null;

  let s = Math.min(r.start, changes[0].oStart);
  let e = Math.max(r.end, changes[changes.length - 1].oEnd);
  const owned = new Set(changes);
  let cut = slice(units, owned, original, s, e);

  if (isBlank(cut.before) || isBlank(cut.after)) {
    [s, e] = widen(units, original, s, e);
    cut = slice(units, owned, original, s, e);
  }

  // Don't let the highlight in the corrected text run on into a space.
  const afterText = cut.after.map((p) => p.text).join("");
  const lead = afterText.length - afterText.trimStart().length;
  const trail = afterText.length - afterText.trimEnd().length;

  return {
    before: markRange(cut.before, r.start - s, r.end - s),
    after: cut.after,
    afterStart: Math.max(cut.cStart, 0) + lead,
    afterEnd: Math.max(cut.cEnd, 0) - trail,
  };
}

/**
 * For each issue, the change in `corrected` that fixes it, or `null` when the
 * excerpt can't be found in `original` or the correction didn't touch it.
 * The result lines up with `issues` by index.
 */
export function resolveFixes(
  original: string,
  corrected: string,
  issues: Issue[],
): (Fix | null)[] {
  const fixes: (Fix | null)[] = issues.map(() => null);
  if (!original || !corrected) return fixes;
  const units = toUnits(diffWords(original, corrected));
  for (const r of resolveRanges(original, issues)) {
    fixes[r.issueIndex] = fixFor(units, original, r);
  }
  return fixes;
}

/**
 * The corrected-text ranges to highlight, one per fix. Where two fixes
 * overlap, the earlier-listed issue keeps the range, matching `resolveRanges`.
 */
export function fixRanges(fixes: (Fix | null)[]): Range[] {
  const claimed: Range[] = [];
  fixes.forEach((fix, issueIndex) => {
    if (!fix || fix.afterStart >= fix.afterEnd) return;
    const { afterStart: start, afterEnd: end } = fix;
    if (claimed.some((r) => start < r.end && end > r.start)) return;
    claimed.push({ start, end, issueIndex });
  });
  return claimed.sort((a, b) => a.start - b.start);
}

/** A stretch of the original text: kept, or removed by the correction. */
export type OriginalPart = { text: string; removed: boolean };

/** An issue's excerpt in the original text, or a stretch no issue flagged. */
export type OriginalSegment = {
  issueIndex: number | null;
  parts: OriginalPart[];
};

/**
 * Split `original` into issue excerpts and unflagged stretches, as
 * `resolveHighlights` does, then split each of those into the text the
 * correction kept and the text it removed. Joining every part always rebuilds
 * `original`. With no `corrected` text to compare against, nothing is removed.
 */
export function originalSegments(
  original: string,
  corrected: string,
  issues: Issue[],
): OriginalSegment[] {
  const segments = resolveHighlights(original, issues);
  if (!corrected) {
    return segments.map(({ text, issueIndex }) => ({
      issueIndex,
      parts: [{ text, removed: false }],
    }));
  }

  // The before side of the diff rebuilds `original`, so walk it alongside the
  // segments and cut it wherever a segment starts or ends.
  const before = diffWords(original, corrected).filter((p) => p.kind !== "added");
  let k = 0;
  let partStart = 0;
  let pos = 0;
  return segments.map(({ text, issueIndex }) => {
    const end = pos + text.length;
    const parts: OriginalPart[] = [];
    while (pos < end) {
      const part = before[k];
      const partEnd = partStart + part.text.length;
      const to = Math.min(end, partEnd);
      parts.push({ text: original.slice(pos, to), removed: part.kind === "removed" });
      pos = to;
      if (to === partEnd) {
        k++;
        partStart = partEnd;
      }
    }
    return { issueIndex, parts };
  });
}

/** A stretch of the corrected text: unchanged, or added by the correction. */
export type CorrectedPart = {
  text: string;
  added: boolean;
  /** For added text, the issue whose fix it falls in; otherwise `null`. */
  issueIndex: number | null;
};

/**
 * Split `corrected` into unchanged and added stretches, tagging each added
 * stretch with the issue whose fix range (from `fixRanges`) it overlaps.
 * Removed text has no place in the corrected text, so it is left out; joining
 * every part always rebuilds `corrected`.
 */
export function correctedParts(
  original: string,
  corrected: string,
  ranges: Range[],
): CorrectedPart[] {
  if (!corrected) return [];
  if (!original) return [{ text: corrected, added: false, issueIndex: null }];

  const parts: CorrectedPart[] = [];
  let offset = 0;
  for (const part of diffWords(original, corrected)) {
    if (part.kind === "removed") continue;
    const start = offset;
    const end = offset + part.text.length;
    offset = end;
    const added = part.kind === "added";
    const owner = added
      ? ranges.find((r) => start < r.end && end > r.start)
      : undefined;
    parts.push({ text: part.text, added, issueIndex: owner?.issueIndex ?? null });
  }
  return parts;
}
