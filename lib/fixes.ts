import {
  diffWords,
  markRange,
  type DiffKind,
  type DiffPart,
  type MarkedPart,
} from "./diff";
import { resolveRanges, type Range } from "./highlight";
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
 * A fix as one line, `before → after`: the words it replaced and the words
 * that replaced them. Words both sides share at either end are left out
 * ("looking forward for → looking forward to" reads "for → to"), as long as
 * each side keeps at least one word, so an insertion or deletion still shows
 * the word it sits against.
 */
export function fixSummary(fix: Fix): { before: string; after: string } {
  const words = (parts: DiffPart[]) =>
    parts
      .map((p) => p.text)
      .join("")
      .split(/\s+/)
      .filter(Boolean);
  const before = words(fix.before);
  const after = words(fix.after);

  let head = 0;
  while (
    head < before.length - 1 &&
    head < after.length - 1 &&
    before[head] === after[head]
  ) {
    head++;
  }
  let tail = 0;
  while (
    tail < before.length - 1 - head &&
    tail < after.length - 1 - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail++;
  }
  return {
    before: before.slice(head, before.length - tail).join(" "),
    after: after.slice(head, after.length - tail).join(" "),
  };
}

/** A stretch of the inline diff that turns the original into the correction. */
export type ChangePart = {
  text: string;
  kind: DiffKind;
  /** For removed or added text, the issue whose fix it belongs to; otherwise `null`. */
  issueIndex: number | null;
  /** True on the last part of an issue's fix: where its number goes. */
  markerAfter: boolean;
};

/**
 * The whole text as one inline diff: unchanged stretches, then each change as
 * its removed text followed by its added text. Joining every part except
 * `added` rebuilds `original`; every part except `removed` rebuilds
 * `corrected`. A change belongs to the first issue (in reading order) whose
 * excerpt it touches, the same changes `resolveFixes` gives that issue.
 */
export function changeParts(
  original: string,
  corrected: string,
  issues: Issue[],
): ChangePart[] {
  const plain = (text: string): ChangePart[] =>
    text ? [{ text, kind: "same", issueIndex: null, markerAfter: false }] : [];
  if (!original || !corrected) return plain(corrected || original);

  const units = toUnits(diffWords(original, corrected));
  const owner = new Map<Unit, number>();
  for (const r of resolveRanges(original, issues)) {
    for (const u of units) {
      if (!owner.has(u) && touches(u, r)) owner.set(u, r.issueIndex);
    }
  }

  const parts: ChangePart[] = [];
  for (const u of units) {
    if (u.kind === "same") {
      parts.push(...plain(original.slice(u.oStart, u.oEnd)));
      continue;
    }
    const issueIndex = owner.get(u) ?? null;
    if (u.removed) parts.push({ text: u.removed, kind: "removed", issueIndex, markerAfter: false });
    if (u.added) parts.push({ text: u.added, kind: "added", issueIndex, markerAfter: false });
  }

  const marked = new Set<number>();
  for (let k = parts.length - 1; k >= 0; k--) {
    const { issueIndex } = parts[k];
    if (issueIndex === null || marked.has(issueIndex)) continue;
    marked.add(issueIndex);
    parts[k].markerAfter = true;
  }
  return parts;
}
